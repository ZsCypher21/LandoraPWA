import type { ListingStatus, ListingType, MediaKind, PropertyType } from "@landora/schema";

// Output of a listing source adapter (ADR 0008): canonical-shaped records before database ids are assigned.

export type IssueSeverity = "reject" | "hold" | "advisory";

export interface Issue {
  code: IssueCode;
  severity: IssueSeverity;
  path: string;
  message: string;
}

export type IssueCode =
  | "malformed_xml"
  | "missing_unique_id"
  | "missing_agent_id"
  | "missing_mod_time"
  | "missing_address"
  | "unsupported_listing_kind"
  | "unknown_status"
  | "unmapped_category"
  | "unparsed_inspection"
  | "unparsed_price"
  | "rent_period_converted"
  | "unknown_listing_agent";

export interface MappedAddress {
  unitNumber: string | null;
  streetNumber: string;
  streetName: string;
  suburb: string;
  state: string;
  postcode: string;
  displayStreet: boolean;
}

export interface MappedAgent {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface MappedMedia {
  kind: MediaKind;
  position: number;
  sourceUrl: string;
}

export interface MappedInspection {
  startsAt: string;
  endsAt: string;
}

export interface MappedListing {
  externalAgentId: string;
  sourceListingId: string;
  sourceModTime: string;
  listingType: ListingType;
  status: ListingStatus;
  propertyType: PropertyType;
  address: MappedAddress;
  headline: string | null;
  description: string | null;
  priceDisplay: string | null;
  priceMinAud: number | null;
  priceMaxAud: number | null;
  priceHidden: boolean;
  rentPerWeekAud: number | null;
  bondAud: number | null;
  availableFrom: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  landAreaM2: number | null;
  buildingAreaM2: number | null;
  features: string[];
  auctionAt: string | null;
  soldAt: string | null;
  soldPriceAud: number | null;
  soldPriceDisclosed: boolean | null;
  newConstruction: boolean;
  inspections: MappedInspection[];
  media: MappedMedia[];
  agents: MappedAgent[];
}

/** One listing element from a feed file: either mapped, or rejected with reasons. */
export type RecordResult =
  | { ok: true; listing: MappedListing; issues: Issue[] }
  | { ok: false; sourceListingId: string | null; issues: Issue[] };

export interface FeedParseResult {
  records: RecordResult[];
  /** Problems with the file as a whole (for example malformed XML). */
  fileIssues: Issue[];
}

export interface ListingSourceAdapter {
  readonly kind: "reaxml" | "synthetic" | "agent_manual";
  parse(payload: string): FeedParseResult;
}
