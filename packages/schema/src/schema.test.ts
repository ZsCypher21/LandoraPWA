import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_STATUSES,
  ENRICHMENT_KINDS,
  LISTING_STATUSES,
  LISTING_TYPES,
  Listing,
  MEDIA_KINDS,
  PROPERTY_TYPES,
  PUBLICATION_STATES,
  PropertyEnrichment,
  ROLES,
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
} from "./index";

const migration = readFileSync(new URL("../../../db/migrations/0001_canonical_schema.sql", import.meta.url), "utf8");

/** Extracts the quoted values of the CHECK ... IN (...) list that follows `marker`. */
function checkValues(marker: string): string[] {
  const start = migration.indexOf(marker);
  if (start === -1) throw new Error(`Marker not found in migration: ${marker}`);
  const open = migration.indexOf("IN (", start);
  const close = migration.indexOf(")", open);
  return [...migration.slice(open, close).matchAll(/'([a-z_]+)'/g)].map((m) => m[1] as string);
}

describe("enums match the SQL CHECK constraints", () => {
  it.each([
    ["CREATE DOMAIN source_type", SOURCE_TYPES],
    ["role       text NOT NULL", ROLES],
    ["verification_status text NOT NULL DEFAULT 'pending'\n                      CHECK", VERIFICATION_STATUSES],
    ["property_type      text NOT NULL", PROPERTY_TYPES],
    ["listing_type       text NOT NULL", LISTING_TYPES],
    ["status             text NOT NULL CHECK (status IN ('draft'", LISTING_STATUSES],
    ["publication_state  text NOT NULL", PUBLICATION_STATES],
    ["compliance_status  text NOT NULL", COMPLIANCE_STATUSES],
    ["kind          text NOT NULL CHECK (kind IN ('photo'", MEDIA_KINDS],
    ["kind           text NOT NULL CHECK (kind IN (\n                   'sales_history'", ENRICHMENT_KINDS],
  ])("%s", (marker, values) => {
    expect(checkValues(marker)).toEqual([...values]);
  });
});

const validListing = {
  id: "8f2d1c1e-3b4a-4c5d-9e6f-7a8b9c0d1e2f",
  propertyId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  agencyId: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
  sourceListingId: "SYN-1",
  listingType: "sale",
  status: "current",
  publicationState: "unpublished",
  publishedAt: null,
  headline: "Renovator with a big backyard",
  description: null,
  priceDisplay: "Offers over $650,000",
  priceMinAud: 650000,
  priceMaxAud: 700000,
  priceHidden: false,
  rentPerWeekAud: null,
  bondAud: null,
  availableFrom: null,
  bedrooms: 3,
  bathrooms: 1,
  carSpaces: 2,
  buildingAreaM2: null,
  features: ["backyard"],
  auctionAt: null,
  soldAt: null,
  soldPriceAud: null,
  soldPriceDisclosed: null,
  offThePlan: null,
  complianceStatus: "not_evaluated",
  sourceModTime: "2026-10-01T09:00:00+10:00",
  agentIds: ["3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f"],
  media: [],
  sourceType: "synthetic",
  sourceRef: "synthetic/v1",
  sourceObservedAt: "2026-10-01T09:00:00+10:00",
} as const;

describe("Listing", () => {
  it("accepts a valid listing", () => {
    expect(Listing.safeParse(validListing).success).toBe(true);
  });

  it("rejects an inverted price range", () => {
    const result = Listing.safeParse({ ...validListing, priceMinAud: 800000 });
    expect(result.success).toBe(false);
  });

  it("rejects publishing without a publish time", () => {
    const result = Listing.safeParse({ ...validListing, publicationState: "published" });
    expect(result.success).toBe(false);
  });

  it("rejects publishing a sold listing", () => {
    const result = Listing.safeParse({
      ...validListing,
      status: "sold",
      publicationState: "published",
      publishedAt: "2026-10-02T09:00:00+10:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("PropertyEnrichment", () => {
  it("requires synthetic enrichment to be a placeholder", () => {
    const result = PropertyEnrichment.safeParse({
      id: "4d5e6f7a-8b9c-4d0e-9f2a-3b4c5d6e7f8a",
      propertyId: validListing.propertyId,
      suburbId: null,
      kind: "avm",
      provider: "synthetic",
      licenceRef: null,
      sourceType: "synthetic",
      isPlaceholder: false,
      effectiveDate: "2026-10-01",
      retrievedAt: "2026-10-01T09:00:00+10:00",
      payload: { estimateAud: 680000 },
    });
    expect(result.success).toBe(false);
  });
});
