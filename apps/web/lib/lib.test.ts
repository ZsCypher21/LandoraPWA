import { describe, expect, it } from "vitest";
import { EMPTY_CRITERIA, criteriaFromParams, criteriaToParams } from "./criteria";
import { parseIntent } from "./intent";
import { planBest, planInOrder, type Stop } from "./route";
import { refinements, search } from "./search";
import type { ListingSummary } from "./types";

const SUBURBS = ["Buderim", "Maroochydore", "Mooloolaba", "Coolum Beach", "Caloundra"];

describe("parseIntent", () => {
  it("maps a typical buyer request to structured criteria", () => {
    const r = parseIntent("3 bed house in Buderim under $900k with a pool", SUBURBS);
    expect(r.criteria).toMatchObject({ listingType: "buy", suburbs: ["Buderim"], propertyTypes: ["house"], minBeds: 3, maxPrice: 900000, features: ["pool"] });
    expect(r.assumptions[0]).toMatch(/at least 3 bedrooms/);
  });

  it("handles rent, ranges with a shared suffix, and multi-word suburbs", () => {
    const r = parseIntent("2 bedroom unit to rent in Coolum Beach $500-700 per week", SUBURBS);
    expect(r.criteria).toMatchObject({ listingType: "rent", suburbs: ["Coolum Beach"], propertyTypes: ["unit"], minBeds: 2, minPrice: 500, maxPrice: 700 });
    expect(parseIntent("house between 600 and 800k", SUBURBS).criteria).toMatchObject({ minPrice: 600000, maxPrice: 800000 });
  });

  it("reports wishes it cannot filter on instead of inventing criteria", () => {
    const r = parseIntent("quiet house near good schools that will be a good investment", SUBURBS);
    expect(r.unsupported).toEqual(expect.arrayContaining(["school quality or catchments", "how quiet a street is"]));
    expect(r.unsupported.some((u) => u.includes("not financial advice"))).toBe(true);
    expect(r.criteria.propertyTypes).toEqual(["house"]);
  });

  it("asks rather than guesses when the budget is ambiguous", () => {
    expect(parseIntent("something affordable in Caloundra", SUBURBS).clarifications).toHaveLength(1);
    const r = parseIntent("house under 900", SUBURBS);
    expect(r.criteria.maxPrice).toBeNull();
    expect(r.clarifications[0]).toMatch(/\$900,000/);
  });

  it("states its reading of vague size words", () => {
    const r = parseIntent("townhouse with a big backyard", SUBURBS);
    expect(r.criteria.propertyTypes).toEqual(["townhouse"]);
    expect(r.criteria.minLandM2).toBe(600);
    expect(r.assumptions.some((a) => a.includes("600"))).toBe(true);
  });

  it("understands open this Saturday in several phrasings", () => {
    for (const q of ["house in Buderim, open this Saturday", "open homes on Saturday", "saturday open house", "inspections this weekend"]) {
      expect(parseIntent(q, SUBURBS).criteria.inspectionSaturday).toBe(true);
    }
    expect(parseIntent("open plan living in Buderim", SUBURBS).criteria.inspectionSaturday).not.toBe(true);
  });

  it("returns empty criteria for empty input", () => {
    expect(parseIntent("   ", SUBURBS).criteria).toEqual(EMPTY_CRITERIA);
  });
});

describe("criteria URL round trip", () => {
  it("survives params serialisation", () => {
    const c = { ...EMPTY_CRITERIA, suburbs: ["Buderim"], minBeds: 3, maxPrice: 900000, features: ["pool" as const], inspectionSaturday: true };
    expect(criteriaFromParams(Object.fromEntries(criteriaToParams(c)))).toEqual(c);
  });

  it("drops invalid values instead of failing", () => {
    expect(criteriaFromParams({ beds: "lots", feature: "helipad", ptype: "castle" })).toMatchObject({ minBeds: null, features: [], propertyTypes: [] });
  });
});

const listing = (over: Partial<ListingSummary>): ListingSummary => ({
  id: "x",
  sourceListingId: "x",
  listingType: "sale",
  status: "current",
  propertyType: "house",
  suburb: "Buderim",
  suburbId: "s",
  postcode: "4556",
  displayAddress: "1 Test St",
  location: { lat: -26.68, lng: 153.05 },
  headline: "h",
  priceDisplay: "$800,000",
  priceAud: 800000,
  rentPerWeekAud: null,
  bedrooms: 3,
  bathrooms: 2,
  carSpaces: 1,
  landAreaM2: 600,
  features: [],
  inspections: [],
  auctionAt: null,
  disclosureReady: true,
  agencyName: "a",
  sourceModTime: "2026-10-01T00:00:00+10:00",
  isSynthetic: true,
  ...over,
});

describe("search", () => {
  const data = [
    listing({ id: "a", priceAud: 800000 }),
    listing({ id: "b", priceAud: null, priceDisplay: "Contact agent" }),
    listing({ id: "c", priceAud: 1200000, features: ["pool"] }),
    listing({ id: "r", listingType: "rent", priceAud: null, rentPerWeekAud: 650 }),
  ];

  it("applies price filters strictly and never leaks hidden prices", () => {
    const out = search(data, { ...EMPTY_CRITERIA, maxPrice: 900000 }, "2026-10-28");
    expect(out.results.map((l) => l.id)).toEqual(["a"]);
    expect(out.hiddenPriceExcluded).toBe(1);
  });

  it("separates rent from buy", () => {
    expect(search(data, { ...EMPTY_CRITERIA, listingType: "rent" }, "2026-10-28").results.map((l) => l.id)).toEqual(["r"]);
  });

  it("suggests refinements that actually return results", () => {
    const c = { ...EMPTY_CRITERIA, maxPrice: 700000, features: ["pool" as const] };
    expect(search(data, c, "2026-10-28").total).toBe(0);
    for (const r of refinements(data, c, "2026-10-28")) expect(r.count).toBeGreaterThan(0);
  });
});

describe("inspection planner", () => {
  const at = (hhmm: string) => `2026-10-31T${hhmm}:00+10:00`;
  const near = { lat: -26.68, lng: 153.05 };
  const far = { lat: -26.53, lng: 153.09 }; // ~17 km away

  it("orders stops to fit every open home", () => {
    const stops: Stop[] = [
      { listingId: "late", label: "Late", location: near, windows: [{ startsAt: at("11:00"), endsAt: at("11:30") }] },
      { listingId: "early", label: "Early", location: near, windows: [{ startsAt: at("09:00"), endsAt: at("09:30") }] },
    ];
    const plan = planBest(stops);
    expect(plan.visits.map((v) => v.listingId)).toEqual(["early", "late"]);
    expect(plan.conflicts).toEqual([]);
    expect(plan.visits[0]?.startAt).toBe(at("09:00"));
  });

  it("flags homes that are open at the same time", () => {
    const stops: Stop[] = [
      { listingId: "a", label: "A", location: near, windows: [{ startsAt: at("10:00"), endsAt: at("10:15") }] },
      { listingId: "b", label: "B", location: near, windows: [{ startsAt: at("10:00"), endsAt: at("10:15") }] },
    ];
    const plan = planBest(stops);
    expect(plan.visits).toHaveLength(1);
    expect(plan.conflicts[0]?.reason).toBe("overlap");
  });

  it("flags insufficient travel time between distant homes", () => {
    const stops: Stop[] = [
      { listingId: "a", label: "A", location: near, windows: [{ startsAt: at("10:00"), endsAt: at("10:30") }] },
      { listingId: "b", label: "B", location: far, windows: [{ startsAt: at("10:30"), endsAt: at("10:45") }] },
    ];
    const plan = planInOrder(stops);
    expect(plan.visits.map((v) => v.listingId)).toEqual(["a"]);
    expect(plan.conflicts[0]?.reason).toBe("insufficient_travel_time");
  });

  it("uses a later window when the first cannot be reached", () => {
    const stops: Stop[] = [
      { listingId: "a", label: "A", location: near, windows: [{ startsAt: at("10:00"), endsAt: at("10:30") }] },
      { listingId: "b", label: "B", location: far, windows: [{ startsAt: at("10:30"), endsAt: at("10:45") }, { startsAt: at("12:00"), endsAt: at("12:30") }] },
    ];
    const plan = planInOrder(stops);
    expect(plan.conflicts).toEqual([]);
    expect(plan.visits[1]?.startAt).toBe(at("12:00"));
    expect(plan.visits[1]?.waitMinutes).toBeGreaterThan(0);
  });
});
