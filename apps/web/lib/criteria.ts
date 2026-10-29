import { z } from "zod";

// Structured search criteria. Natural-language input is converted into these (FR-SRCH-002), shown to
// the buyer, and editable. Search only ever runs on criteria, never on free text alone.

export const SEARCH_FEATURES = ["pool", "air_conditioning", "solar_panels", "shed", "study", "fully_fenced", "deck", "secure_parking"] as const;
export type SearchFeature = (typeof SEARCH_FEATURES)[number];

export const PROPERTY_TYPE_OPTIONS = ["house", "townhouse", "unit", "apartment", "land"] as const;

export const SORTS = ["newest", "price_asc", "price_desc"] as const;

export const Criteria = z.object({
  listingType: z.enum(["buy", "rent"]).default("buy"),
  suburbs: z.array(z.string().min(1).max(60)).max(10).default([]),
  propertyTypes: z.array(z.enum(PROPERTY_TYPE_OPTIONS)).max(5).default([]),
  minBeds: z.number().int().min(0).max(10).nullable().default(null),
  minBaths: z.number().int().min(0).max(10).nullable().default(null),
  minCars: z.number().int().min(0).max(10).nullable().default(null),
  minPrice: z.number().int().min(0).max(100_000_000).nullable().default(null),
  maxPrice: z.number().int().min(0).max(100_000_000).nullable().default(null),
  minLandM2: z.number().int().min(0).max(1_000_000).nullable().default(null),
  features: z.array(z.enum(SEARCH_FEATURES)).max(SEARCH_FEATURES.length).default([]),
  inspectionSaturday: z.boolean().default(false),
  includeOffThePlan: z.boolean().default(true),
  sort: z.enum(SORTS).default("newest"),
});
export type Criteria = z.infer<typeof Criteria>;

export const EMPTY_CRITERIA: Criteria = Criteria.parse({});

type Params = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean);
}

function num(v: string | string[] | undefined): number | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === undefined || s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Parses URL search params into criteria; invalid values are dropped rather than failing the page. */
export function criteriaFromParams(params: Params): Criteria {
  const raw = {
    listingType: params.type === "rent" ? "rent" : "buy",
    suburbs: list(params.suburb),
    propertyTypes: list(params.ptype).filter((t): t is (typeof PROPERTY_TYPE_OPTIONS)[number] => (PROPERTY_TYPE_OPTIONS as readonly string[]).includes(t)),
    minBeds: num(params.beds),
    minBaths: num(params.baths),
    minCars: num(params.cars),
    minPrice: num(params.min),
    maxPrice: num(params.max),
    minLandM2: num(params.land),
    features: list(params.feature).filter((f): f is SearchFeature => (SEARCH_FEATURES as readonly string[]).includes(f)),
    inspectionSaturday: params.sat === "1",
    includeOffThePlan: params.otp !== "0",
    sort: (SORTS as readonly string[]).includes(String(params.sort)) ? params.sort : "newest",
  };
  const parsed = Criteria.safeParse(raw);
  return parsed.success ? parsed.data : EMPTY_CRITERIA;
}

/** id of the search filter form, so controls outside it (the sort menu) can submit with it. */
export const CRITERIA_FORM_ID = "search-criteria";

export function criteriaToParams(c: Criteria): URLSearchParams {
  const p = new URLSearchParams();
  if (c.listingType === "rent") p.set("type", "rent");
  if (c.suburbs.length) p.set("suburb", c.suburbs.join(","));
  if (c.propertyTypes.length) p.set("ptype", c.propertyTypes.join(","));
  if (c.minBeds !== null) p.set("beds", String(c.minBeds));
  if (c.minBaths !== null) p.set("baths", String(c.minBaths));
  if (c.minCars !== null) p.set("cars", String(c.minCars));
  if (c.minPrice !== null) p.set("min", String(c.minPrice));
  if (c.maxPrice !== null) p.set("max", String(c.maxPrice));
  if (c.minLandM2 !== null) p.set("land", String(c.minLandM2));
  if (c.features.length) p.set("feature", c.features.join(","));
  if (c.inspectionSaturday) p.set("sat", "1");
  if (!c.includeOffThePlan) p.set("otp", "0");
  if (c.sort !== "newest") p.set("sort", c.sort);
  return p;
}
