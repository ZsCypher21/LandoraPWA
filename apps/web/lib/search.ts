import type { Criteria } from "./criteria";
import type { ListingSummary } from "./types";

// Structured search: every mandatory criterion is applied strictly (V11 §12.15 "results satisfying
// mandatory structured constraints"). Pure function so it can be unit-tested and later swapped for SQL.

export interface SearchOutcome {
  results: ListingSummary[];
  total: number;
  /** Listings left out only because their price is undisclosed and a price filter was set. */
  hiddenPriceExcluded: number;
}

export function nextSaturdayIso(asOf: string): string {
  const d = new Date(`${asOf}T00:00:00Z`);
  const add = (6 - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

function priceOf(l: ListingSummary): number | null {
  return l.listingType === "rent" ? l.rentPerWeekAud : l.priceAud;
}

export function search(listings: readonly ListingSummary[], c: Criteria, asOf: string): SearchOutcome {
  const saturday = nextSaturdayIso(asOf);
  const priceFiltered = c.minPrice !== null || c.maxPrice !== null;
  let hiddenPriceExcluded = 0;

  const matches = listings.filter((l) => {
    if (c.listingType === "rent" ? l.listingType !== "rent" : l.listingType === "rent") return false;
    if (!c.includeOffThePlan && l.listingType === "off_the_plan") return false;
    if (c.suburbs.length && !c.suburbs.some((s) => s.toLowerCase() === l.suburb.toLowerCase())) return false;
    if (c.propertyTypes.length && !c.propertyTypes.includes(l.propertyType as Criteria["propertyTypes"][number])) return false;
    if (c.minBeds !== null && l.bedrooms < c.minBeds) return false;
    if (c.minBaths !== null && l.bathrooms < c.minBaths) return false;
    if (c.minCars !== null && l.carSpaces < c.minCars) return false;
    if (c.minLandM2 !== null && (l.landAreaM2 === null || l.landAreaM2 < c.minLandM2)) return false;
    if (c.features.length && !c.features.every((f) => l.features.includes(f))) return false;
    if (c.inspectionSaturday && !l.inspections.some((i) => i.startsAt.startsWith(saturday))) return false;
    if (priceFiltered) {
      const price = priceOf(l);
      if (price === null) {
        hiddenPriceExcluded++;
        return false;
      }
      if (c.minPrice !== null && price < c.minPrice) return false;
      if (c.maxPrice !== null && price > c.maxPrice) return false;
    }
    return true;
  });

  const sorted = [...matches].sort((a, b) => {
    if (c.sort === "newest") return b.sourceModTime.localeCompare(a.sourceModTime);
    // Undisclosed prices sort last in price order.
    const pa = priceOf(a) ?? (c.sort === "price_asc" ? Number.MAX_SAFE_INTEGER : -1);
    const pb = priceOf(b) ?? (c.sort === "price_asc" ? Number.MAX_SAFE_INTEGER : -1);
    return c.sort === "price_asc" ? pa - pb : pb - pa;
  });

  return { results: sorted, total: sorted.length, hiddenPriceExcluded };
}

/** Suggestions for a zero-result search: which single criterion, if relaxed, would return homes. */
export function refinements(listings: readonly ListingSummary[], c: Criteria, asOf: string): { label: string; criteria: Criteria; count: number }[] {
  const options: { label: string; criteria: Criteria }[] = [];
  if (c.maxPrice !== null) options.push({ label: `Raise the budget by 10%`, criteria: { ...c, maxPrice: Math.round(c.maxPrice * 1.1) } });
  if (c.minBeds !== null && c.minBeds > 1) options.push({ label: `${c.minBeds - 1}+ bedrooms`, criteria: { ...c, minBeds: c.minBeds - 1 } });
  if (c.suburbs.length) options.push({ label: "Any pilot suburb", criteria: { ...c, suburbs: [] } });
  if (c.propertyTypes.length) options.push({ label: "Any property type", criteria: { ...c, propertyTypes: [] } });
  for (const f of c.features) options.push({ label: `Without "${f.replace(/_/g, " ")}"`, criteria: { ...c, features: c.features.filter((x) => x !== f) } });
  if (c.inspectionSaturday) options.push({ label: "Any inspection day", criteria: { ...c, inspectionSaturday: false } });
  if (c.minLandM2 !== null) options.push({ label: "Any land size", criteria: { ...c, minLandM2: null } });
  if (c.minCars !== null) options.push({ label: "Any parking", criteria: { ...c, minCars: null } });

  return options
    .map((o) => ({ ...o, count: search(listings, o.criteria, asOf).total }))
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}
