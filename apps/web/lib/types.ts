// View models shared by server and client code. They come from the synthetic dataset today and
// from the database API in the build semester; components depend only on these shapes.

export type ListingType = "sale" | "rent" | "off_the_plan";
export type PropertyType = "house" | "townhouse" | "unit" | "apartment" | "villa" | "land" | "acreage" | "duplex" | "other";

export interface InspectionWindow {
  startsAt: string;
  endsAt: string;
}

export interface Citation {
  label: string;
  /** "listing" = the agent's feed; "rules" = a rule pack; "placeholder" = synthetic enrichment. */
  kind: "listing" | "rules" | "placeholder" | "government";
  detail: string;
  url?: string;
}

export interface ListingSummary {
  id: string;
  sourceListingId: string;
  listingType: ListingType;
  status: "current" | "under_offer";
  propertyType: PropertyType;
  suburb: string;
  suburbId: string;
  postcode: string;
  displayAddress: string;
  location: { lat: number; lng: number };
  headline: string;
  priceDisplay: string | null;
  /** Numeric price only when the agent displays it; hidden prices never leave the server. */
  priceAud: number | null;
  rentPerWeekAud: number | null;
  bedrooms: number;
  bathrooms: number;
  carSpaces: number;
  landAreaM2: number | null;
  features: string[];
  inspections: InspectionWindow[];
  auctionAt: string | null;
  disclosureReady: boolean;
  agencyName: string;
  sourceModTime: string;
  isSynthetic: true;
}

export interface ListingDetail extends ListingSummary {
  description: string;
  buildingAreaM2: number | null;
  bondAud: number | null;
  availableFrom: string | null;
  offThePlan: { stage: string; estimatedCompletion: string; developerName: string } | null;
  agents: { name: string; email: string; phone: string }[];
  imageCount: number;
  compliance: {
    packId: string;
    packVersion: string;
    packStatus: string;
    outcome: string;
    checks: { title: string; status: string; platformPolicy: boolean }[];
  } | null;
  placeholderEstimate: { estimateAud: number; lowAud: number; highAud: number; confidence: string; effectiveDate: string } | null;
  placeholderSalesHistory: { date: string; priceAud: number }[];
  suburbStats: { medianHouseAud: number; annualGrowthPct: number; daysOnMarket: number; effectiveDate: string } | null;
}
