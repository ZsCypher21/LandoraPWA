import { z } from "zod";
import {
  AuState,
  ComplianceStatus,
  EnrichmentKind,
  ListingStatus,
  ListingType,
  MediaKind,
  PropertyType,
  PublicationState,
  SourceType,
} from "./enums";

/** Canonical schema version; bump with every migration that changes these shapes. */
export const CANONICAL_SCHEMA_VERSION = "0.1.0";

const Uuid = z.uuid();
const IsoDateTime = z.iso.datetime({ offset: true });
const IsoDate = z.iso.date();
const Postcode = z.string().regex(/^[0-9]{4}$/, "Postcode must be four digits");
const Aud = z.number().int().nonnegative();

/** Where a fact came from (ADR 0005). Required on every externally sourced record. */
export const Provenance = z.object({
  sourceType: SourceType,
  sourceRef: z.string().min(1).nullable(),
  sourceObservedAt: IsoDateTime,
});
export type Provenance = z.infer<typeof Provenance>;

export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPoint>;

export const Property = z
  .object({
    id: Uuid,
    gnafPid: z.string().nullable(),
    unitNumber: z.string().nullable(),
    streetNumber: z.string().min(1),
    streetName: z.string().min(1),
    suburbId: Uuid,
    state: AuState,
    postcode: Postcode,
    location: GeoPoint.nullable(),
    lotPlan: z.string().nullable(),
    landAreaM2: z.number().positive().nullable(),
    propertyType: PropertyType,
  })
  .extend(Provenance.shape);
export type Property = z.infer<typeof Property>;

export const ListingMedia = z.object({
  id: Uuid,
  kind: MediaKind,
  position: z.number().int().nonnegative(),
  url: z.url(),
  caption: z.string().nullable(),
  aiGenerated: z.boolean(),
});
export type ListingMedia = z.infer<typeof ListingMedia>;

export const Inspection = z
  .object({
    id: Uuid,
    listingId: Uuid,
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
    kind: z.enum(["open_home", "by_appointment"]),
    sourceType: SourceType,
  })
  .refine((i) => Date.parse(i.endsAt) > Date.parse(i.startsAt), {
    message: "Inspection must end after it starts",
    path: ["endsAt"],
  });
export type Inspection = z.infer<typeof Inspection>;

export const OffThePlanDetails = z.object({
  stage: z.string().nullable(),
  estimatedCompletion: IsoDate.nullable(),
  developerName: z.string().nullable(),
});
export type OffThePlanDetails = z.infer<typeof OffThePlanDetails>;

export const Listing = z
  .object({
    id: Uuid,
    propertyId: Uuid,
    agencyId: Uuid,
    sourceListingId: z.string().min(1),
    listingType: ListingType,
    status: ListingStatus,
    publicationState: PublicationState,
    publishedAt: IsoDateTime.nullable(),
    headline: z.string().nullable(),
    description: z.string().nullable(),
    /** Price text exactly as the agent advertises it. Never generated. */
    priceDisplay: z.string().nullable(),
    priceMinAud: Aud.nullable(),
    priceMaxAud: Aud.nullable(),
    priceHidden: z.boolean(),
    rentPerWeekAud: Aud.nullable(),
    bondAud: Aud.nullable(),
    availableFrom: IsoDate.nullable(),
    bedrooms: z.number().int().nonnegative().nullable(),
    bathrooms: z.number().int().nonnegative().nullable(),
    carSpaces: z.number().int().nonnegative().nullable(),
    buildingAreaM2: z.number().positive().nullable(),
    features: z.array(z.string()),
    auctionAt: IsoDateTime.nullable(),
    soldAt: IsoDate.nullable(),
    soldPriceAud: Aud.nullable(),
    soldPriceDisclosed: z.boolean().nullable(),
    offThePlan: OffThePlanDetails.nullable(),
    complianceStatus: ComplianceStatus,
    sourceModTime: IsoDateTime,
    agentIds: z.array(Uuid).min(1),
    media: z.array(ListingMedia),
  })
  .extend(Provenance.shape)
  .superRefine((l, ctx) => {
    if (l.priceMinAud !== null && l.priceMaxAud !== null && l.priceMinAud > l.priceMaxAud) {
      ctx.addIssue({ code: "custom", message: "priceMinAud must not exceed priceMaxAud", path: ["priceMinAud"] });
    }
    if (l.listingType === "rent" && l.priceMinAud !== null) {
      ctx.addIssue({ code: "custom", message: "Rental listings use rentPerWeekAud, not sale prices", path: ["priceMinAud"] });
    }
    if (l.publicationState === "published" && (l.publishedAt === null || !["current", "under_offer"].includes(l.status))) {
      ctx.addIssue({
        code: "custom",
        message: "Only current or under-offer listings with a publish time can be published",
        path: ["publicationState"],
      });
    }
  });
export type Listing = z.infer<typeof Listing>;

export const PropertyEnrichment = z
  .object({
    id: Uuid,
    propertyId: Uuid.nullable(),
    suburbId: Uuid.nullable(),
    kind: EnrichmentKind,
    provider: z.string().min(1),
    licenceRef: z.string().nullable(),
    sourceType: SourceType,
    /** Placeholder figures must never be shown to users as real data (§14.4). */
    isPlaceholder: z.boolean(),
    effectiveDate: IsoDate,
    retrievedAt: IsoDateTime,
    payload: z.record(z.string(), z.unknown()),
  })
  .refine((e) => e.propertyId !== null || e.suburbId !== null, {
    message: "Enrichment must reference a property or a suburb",
    path: ["propertyId"],
  })
  .refine((e) => e.sourceType !== "synthetic" || e.isPlaceholder, {
    message: "Synthetic enrichment must be flagged as placeholder",
    path: ["isPlaceholder"],
  });
export type PropertyEnrichment = z.infer<typeof PropertyEnrichment>;
