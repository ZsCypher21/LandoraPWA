import { z } from "zod";

// Mirrors the CHECK constraints in db/migrations/0001_canonical_schema.sql.
// Keep both in sync; schema.test.ts guards the lists against the migration file.

/** Source types in V11 §12.7 authority order. `synthetic` marks §14.4 fallback data. */
export const SOURCE_TYPES = ["rules", "government", "licensed", "reaxml", "agent_manual", "user", "ai", "synthetic"] as const;
export const SourceType = z.enum(SOURCE_TYPES);
export type SourceType = z.infer<typeof SourceType>;

export const AU_STATES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"] as const;
export const AuState = z.enum(AU_STATES);
export type AuState = z.infer<typeof AuState>;

export const ROLES = ["buyer", "agent", "agency_admin", "moderator", "platform_admin"] as const;
export const Role = z.enum(ROLES);
export type Role = z.infer<typeof Role>;

export const VERIFICATION_STATUSES = ["pending", "verified", "exception_approved", "rejected", "lapsed"] as const;
export const VerificationStatus = z.enum(VERIFICATION_STATUSES);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const PROPERTY_TYPES = ["house", "townhouse", "unit", "apartment", "villa", "land", "acreage", "duplex", "other"] as const;
export const PropertyType = z.enum(PROPERTY_TYPES);
export type PropertyType = z.infer<typeof PropertyType>;

export const LISTING_TYPES = ["sale", "rent", "off_the_plan"] as const;
export const ListingType = z.enum(LISTING_TYPES);
export type ListingType = z.infer<typeof ListingType>;

export const LISTING_STATUSES = ["draft", "current", "under_offer", "sold", "leased", "withdrawn", "off_market"] as const;
export const ListingStatus = z.enum(LISTING_STATUSES);
export type ListingStatus = z.infer<typeof ListingStatus>;

export const PUBLICATION_STATES = ["unpublished", "blocked", "published"] as const;
export const PublicationState = z.enum(PUBLICATION_STATES);
export type PublicationState = z.infer<typeof PublicationState>;

export const COMPLIANCE_STATUSES = ["not_evaluated", "ready", "blocked", "advisory"] as const;
export const ComplianceStatus = z.enum(COMPLIANCE_STATUSES);
export type ComplianceStatus = z.infer<typeof ComplianceStatus>;

export const MEDIA_KINDS = ["photo", "floorplan", "video", "virtual_tour", "document"] as const;
export const MediaKind = z.enum(MEDIA_KINDS);
export type MediaKind = z.infer<typeof MediaKind>;

export const ENRICHMENT_KINDS = [
  "sales_history",
  "avm",
  "comparables",
  "suburb_stats",
  "school_catchment",
  "planning_overlay",
  "zoning",
] as const;
export const EnrichmentKind = z.enum(ENRICHMENT_KINDS);
export type EnrichmentKind = z.infer<typeof EnrichmentKind>;
