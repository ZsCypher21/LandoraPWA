import { z } from "zod";

// Analytics event baseline (V11 §12.8). Each event has the common envelope plus typed properties.
// Properties must never contain free text a user typed (search text, notes, questions) or any
// FHB income/deposit data; see docs/analytics/events.md "Privacy rules".

export const EVENT_SCHEMA_VERSION = 1;

const Uuid = z.uuid();
const Count = z.number().int().nonnegative();
const Ms = z.number().int().nonnegative();

export const Surface = z.enum([
  "home",
  "search",
  "listing_page",
  "suburb_page",
  "collection",
  "timeline",
  "concierge",
  "fhb",
  "agent_console",
  "admin_console",
  "ingestion",
  "rules_engine",
]);
export type Surface = z.infer<typeof Surface>;

export const UserRole = z.enum(["anonymous", "buyer", "agent", "agency_admin", "moderator", "platform_admin", "system"]);
export type UserRole = z.infer<typeof UserRole>;

export const Outcome = z.enum(["success", "failure", "zero_results", "blocked", "cancelled"]);
export type Outcome = z.infer<typeof Outcome>;

/** Fields every event carries (§12.8: time, user reference, property/listing/suburb reference, surface, outcome). */
export const EventEnvelope = z
  .object({
    id: Uuid,
    occurredAt: z.iso.datetime({ offset: true }),
    userId: Uuid.nullable(),
    anonymousId: z.string().min(16).max(64).nullable(),
    sessionId: z.string().max(64).nullable(),
    userRole: UserRole,
    surface: Surface,
    listingId: Uuid.nullable(),
    propertyId: Uuid.nullable(),
    suburbId: Uuid.nullable(),
    outcome: Outcome.nullable(),
  })
  .strict();
export type EventEnvelope = z.infer<typeof EventEnvelope>;

const SearchMode = z.enum(["filters", "natural_language"]);
const ShareChannel = z.enum(["link", "native_share", "collaborator_invite"]);
const ConciergeLane = z.enum(["search", "concierge", "fhb"]);

/** Typed properties for each event name. `.strict()` rejects any undeclared property. */
export const EVENT_PROPERTIES = {
  search_started: z.object({ mode: SearchMode }).strict(),
  search_completed: z
    .object({ mode: SearchMode, resultCount: Count, criteriaCount: Count, latencyMs: Ms, aiUsed: z.boolean() })
    .strict(),
  search_zero_results: z.object({ mode: SearchMode, criteriaCount: Count }).strict(),

  listing_viewed: z.object({ referrer: z.enum(["search", "share_link", "collection", "suburb_hub", "external", "other"]) }).strict(),
  listing_saved: z.object({ collectionId: Uuid.nullable() }).strict(),
  listing_unsaved: z.object({ collectionId: Uuid.nullable() }).strict(),
  listing_shared: z.object({ channel: ShareChannel }).strict(),

  collection_created: z.object({ collectionId: Uuid }).strict(),
  collaborator_invited: z.object({ collectionId: Uuid, role: z.enum(["viewer", "editor"]) }).strict(),

  property_followed: z.object({}).strict(),
  suburb_followed: z.object({}).strict(),

  inspection_added: z.object({ inspectionId: Uuid, timelineId: Uuid }).strict(),
  inspection_route_created: z
    .object({ timelineId: Uuid, stopCount: Count, conflictCount: Count, totalTravelMinutes: Count })
    .strict(),
  inspection_conflict_detected: z
    .object({ timelineId: Uuid, reason: z.enum(["overlap", "insufficient_travel_time", "window_closed"]) })
    .strict(),
  inspection_note_added: z.object({ timelineId: Uuid, hasRating: z.boolean() }).strict(),

  concierge_question: z.object({ conversationId: Uuid, lane: ConciergeLane }).strict(),
  concierge_answer: z
    .object({
      conversationId: Uuid,
      lane: ConciergeLane,
      citationCount: Count,
      latencyMs: Ms,
      model: z.string().max(100),
      promptVersion: z.string().max(50),
      fellBack: z.boolean(),
    })
    .strict(),
  concierge_source_clicked: z.object({ conversationId: Uuid, sourceType: z.string().max(50) }).strict(),
  concierge_failure: z
    .object({ conversationId: Uuid, reason: z.enum(["timeout", "provider_error", "budget_exceeded", "guardrail_block", "ungrounded"]) })
    .strict(),

  agent_question_submitted: z.object({ questionId: Uuid }).strict(),
  agent_question_answered: z.object({ questionId: Uuid, responseMinutes: Count }).strict(),

  lead_consent_requested: z.object({ consentRequestId: Uuid }).strict(),
  lead_consent_granted: z.object({ consentRequestId: Uuid }).strict(),
  lead_sent: z.object({ leadId: Uuid, consentRequestId: Uuid }).strict(),

  agent_verification_started: z.object({ agentId: Uuid }).strict(),
  agent_verified: z.object({ agentId: Uuid, method: z.enum(["register_check", "exception_approved"]) }).strict(),
  agent_verification_exception: z.object({ agentId: Uuid, reason: z.string().max(100) }).strict(),

  feed_record_received: z.object({ feedSourceId: Uuid, feedRecordId: Uuid }).strict(),
  feed_record_rejected: z.object({ feedSourceId: Uuid, feedRecordId: Uuid, issueCodes: z.array(z.string().max(50)).max(50) }).strict(),
  listing_published: z.object({ rulePackId: z.string().max(100), rulePackVersion: z.string().max(20) }).strict(),
  listing_unpublished: z.object({ reason: z.enum(["status_change", "compliance_fail", "agent_action", "admin_action", "verification_lapsed"]) }).strict(),

  compliance_check_passed: z.object({ rulePackId: z.string().max(100), rulePackVersion: z.string().max(20), advisoryCount: Count }).strict(),
  compliance_check_failed: z
    .object({ rulePackId: z.string().max(100), rulePackVersion: z.string().max(20), failedRuleIds: z.array(z.string().max(100)).min(1) })
    .strict(),
} as const;

export type EventName = keyof typeof EVENT_PROPERTIES;
export const EVENT_NAMES = Object.keys(EVENT_PROPERTIES) as EventName[];

export type AnalyticsEvent<N extends EventName = EventName> = {
  [K in N]: EventEnvelope & { name: K; properties: z.infer<(typeof EVENT_PROPERTIES)[K]> };
}[N];

/** Events that must reference a listing; enforced so the KPI views can join to suburbs. */
const REQUIRES_LISTING: ReadonlySet<EventName> = new Set<EventName>([
  "listing_viewed",
  "listing_saved",
  "listing_unsaved",
  "listing_shared",
  "property_followed",
  "inspection_added",
  "agent_question_submitted",
  "agent_question_answered",
  "listing_published",
  "listing_unpublished",
  "compliance_check_passed",
  "compliance_check_failed",
]);

export type ParseResult = { ok: true; event: AnalyticsEvent } | { ok: false; errors: string[] };

/** Validates an inbound event. Unknown names and undeclared properties are rejected, not stored. */
export function parseEvent(input: unknown): ParseResult {
  const shape = z.object({ name: z.string(), properties: z.unknown() }).loose().safeParse(input);
  if (!shape.success) {
    return { ok: false, errors: shape.error.issues.map((i) => `${i.path.join(".") || "event"}: ${i.message}`) };
  }
  const { name, properties, ...envelopeInput } = shape.data;
  if (!(name in EVENT_PROPERTIES)) {
    return { ok: false, errors: [`name: unknown event "${name}"`] };
  }
  const eventName = name as EventName;

  const errors: string[] = [];
  const envelope = EventEnvelope.safeParse(envelopeInput);
  if (!envelope.success) {
    errors.push(...envelope.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  }
  const props = EVENT_PROPERTIES[eventName].safeParse(properties ?? {});
  if (!props.success) {
    errors.push(...props.error.issues.map((i) => `properties.${i.path.join(".")}: ${i.message}`));
  }
  if (envelope.success) {
    const e = envelope.data;
    if (e.userId === null && e.anonymousId === null && e.userRole !== "system") {
      errors.push("userId or anonymousId is required unless userRole is system");
    }
    if (REQUIRES_LISTING.has(eventName) && e.listingId === null) {
      errors.push(`listingId is required for ${eventName}`);
    }
  }
  if (errors.length > 0 || !envelope.success || !props.success) {
    return { ok: false, errors };
  }
  return { ok: true, event: { ...envelope.data, name: eventName, properties: props.data } as AnalyticsEvent };
}
