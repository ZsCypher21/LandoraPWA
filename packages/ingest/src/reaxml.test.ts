import { readFileSync } from "node:fs";
import { Listing } from "@landora/schema";
import { describe, expect, it } from "vitest";
import { ReaxmlAdapter } from "./reaxml";
import { parseFeedDateTime, parseInspection } from "./time";
import type { MappedListing, RecordResult } from "./types";

const sample = (name: string) => readFileSync(new URL(`../../../samples/reaxml/${name}`, import.meta.url), "utf8");
const adapter = new ReaxmlAdapter("Australia/Brisbane");

function mapped(records: RecordResult[], id: string): { listing: MappedListing; codes: string[] } {
  const r = records.find((x) => x.ok && x.listing.sourceListingId === id);
  if (!r || !r.ok) throw new Error(`No mapped listing ${id}`);
  return { listing: r.listing, codes: r.issues.map((i) => i.code) };
}

describe("ReaxmlAdapter: 01_mixed_current.xml", () => {
  const { records, fileIssues } = adapter.parse(sample("01_mixed_current.xml"));

  it("parses the file and rejects only the unsupported commercial listing", () => {
    expect(fileIssues).toEqual([]);
    expect(records).toHaveLength(4);
    const rejected = records.filter((r) => !r.ok);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.issues[0]?.code).toBe("unsupported_listing_kind");
  });

  it("maps a residential sale per the contract", () => {
    const { listing, codes } = mapped(records, "SYN-R-1001");
    expect(listing).toMatchObject({
      externalAgentId: "SYN-AG-001",
      listingType: "sale",
      status: "current",
      propertyType: "house",
      sourceModTime: "2026-10-20T08:30:00+10:00",
      priceDisplay: "Offers over $650,000",
      priceMinAud: 650000,
      priceMaxAud: 650000,
      priceHidden: false,
      bedrooms: 3,
      bathrooms: 1,
      carSpaces: 2,
      landAreaM2: 702,
      buildingAreaM2: 140,
      description: "Solid 1980s brick home on a flat block.\nReady for your ideas.",
    });
    expect(listing.features).toEqual(["air_conditioning", "fully_fenced", "shed", "side_access"]);
    expect(listing.agents[0]?.email).toBe("alex.example@synthetic-realty.example");
    // Main image first, then by id; floorplan after photos.
    expect(listing.media.map((m) => m.sourceUrl.split("/").pop())).toEqual(["m.jpg", "a.jpg", "b.jpg", "fp1.png"]);
  });

  it("parses inspections and flags the unreadable one instead of dropping it silently", () => {
    const { listing, codes } = mapped(records, "SYN-R-1001");
    expect(listing.inspections).toEqual([
      { startsAt: "2026-10-25T10:00:00+10:00", endsAt: "2026-10-25T10:30:00+10:00" },
      { startsAt: "2026-11-01T09:30:00+10:00", endsAt: "2026-11-01T10:00:00+10:00" },
    ]);
    expect(codes).toContain("unparsed_inspection");
  });

  it("handles under offer, hidden price, price range from display text and hidden street", () => {
    const { listing } = mapped(records, "SYN-R-1002");
    expect(listing.status).toBe("under_offer");
    expect(listing.priceHidden).toBe(true);
    expect([listing.priceMinAud, listing.priceMaxAud]).toEqual([700000, 740000]);
    expect(listing.address).toMatchObject({ unitNumber: "4", state: "QLD", displayStreet: false });
    expect(listing.propertyType).toBe("unit");
    expect(listing.features).toContain("pool_in_ground");
    expect(listing.auctionAt).toBe("2026-11-14T11:00:00+10:00");
  });

  it("converts monthly rent to weekly and says so", () => {
    const { listing, codes } = mapped(records, "SYN-L-2001");
    expect(listing.listingType).toBe("rent");
    expect(listing.rentPerWeekAud).toBe(600);
    expect(listing.priceMinAud).toBeNull();
    expect(listing.availableFrom).toBe("2026-11-10");
    expect(codes).toContain("rent_period_converted");
  });
});

describe("ReaxmlAdapter: 02_sold_and_invalid.xml", () => {
  const { records } = adapter.parse(sample("02_sold_and_invalid.xml"));

  it("maps a sold update with an undisclosed sale price", () => {
    const { listing } = mapped(records, "SYN-R-1001");
    expect(listing).toMatchObject({ status: "sold", soldAt: "2026-10-26", soldPriceAud: 668000, soldPriceDisclosed: false });
  });

  it("rejects a record with no uniqueID and a bad address, listing every reason", () => {
    const bad = records.find((r) => !r.ok);
    expect(bad?.issues.map((i) => i.code).sort()).toEqual(["missing_address", "missing_unique_id"]);
  });

  it("maps land with hectares converted and holds it for a missing agent", () => {
    const { listing, codes } = mapped(records, "SYN-V-4001");
    expect(listing.propertyType).toBe("land");
    expect(listing.landAreaM2).toBe(450);
    expect(listing.newConstruction).toBe(true);
    expect(codes).toContain("unknown_listing_agent");
  });
});

describe("ReaxmlAdapter: 03_malformed.xml", () => {
  it("rejects the whole file with a line number", () => {
    const { records, fileIssues } = adapter.parse(sample("03_malformed.xml"));
    expect(records).toEqual([]);
    expect(fileIssues[0]?.code).toBe("malformed_xml");
  });
});

describe("time parsing", () => {
  it("applies daylight saving for NSW feeds", () => {
    expect(parseFeedDateTime("2026-12-01-10:00:00", "Australia/Sydney")).toBe("2026-12-01T10:00:00+11:00");
    expect(parseFeedDateTime("2026-06-01-10:00:00", "Australia/Sydney")).toBe("2026-06-01T10:00:00+10:00");
  });

  it("rejects impossible dates and backwards inspection windows", () => {
    expect(parseFeedDateTime("2026-02-30-10:00:00", "Australia/Brisbane")).toBeNull();
    expect(parseInspection("25-Oct-2026 11:00am to 10:30am", "Australia/Brisbane")).toBeNull();
    expect(parseInspection("25-Oct-2026 12:00pm to 12:30pm", "Australia/Brisbane")?.startsAt).toBe("2026-10-25T12:00:00+10:00");
  });
});

describe("contract with the canonical schema", () => {
  it("mapped values satisfy the canonical Listing validator once ids are assigned", () => {
    const { records } = adapter.parse(sample("01_mixed_current.xml"));
    for (const r of records) {
      if (!r.ok) continue;
      const l = r.listing;
      const candidate = {
        id: "8f2d1c1e-3b4a-4c5d-9e6f-7a8b9c0d1e2f",
        propertyId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
        agencyId: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
        sourceListingId: l.sourceListingId,
        listingType: l.listingType,
        status: l.status,
        publicationState: "unpublished",
        publishedAt: null,
        headline: l.headline,
        description: l.description,
        priceDisplay: l.priceDisplay,
        priceMinAud: l.priceMinAud,
        priceMaxAud: l.priceMaxAud,
        priceHidden: l.priceHidden,
        rentPerWeekAud: l.rentPerWeekAud,
        bondAud: l.bondAud,
        availableFrom: l.availableFrom,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        carSpaces: l.carSpaces,
        buildingAreaM2: l.buildingAreaM2,
        features: l.features,
        auctionAt: l.auctionAt,
        soldAt: l.soldAt,
        soldPriceAud: l.soldPriceAud,
        soldPriceDisclosed: l.soldPriceDisclosed,
        offThePlan: null,
        complianceStatus: "not_evaluated",
        sourceModTime: l.sourceModTime,
        agentIds: ["3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f"],
        media: [],
        sourceType: "reaxml",
        sourceRef: "feed_record/test",
        sourceObservedAt: "2026-10-20T09:00:00+10:00",
      };
      const result = Listing.safeParse(candidate);
      expect(result.success, `${l.sourceListingId}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });
});
