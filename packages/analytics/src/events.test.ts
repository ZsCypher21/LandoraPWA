import { describe, expect, it } from "vitest";
import { EVENT_NAMES, parseEvent } from "./events";

// The full §12.8 baseline; this list must not shrink without a brief change.
const BRIEF_EVENTS = [
  "search_started",
  "search_completed",
  "search_zero_results",
  "listing_viewed",
  "listing_saved",
  "listing_unsaved",
  "listing_shared",
  "collection_created",
  "collaborator_invited",
  "property_followed",
  "suburb_followed",
  "inspection_added",
  "inspection_route_created",
  "inspection_conflict_detected",
  "inspection_note_added",
  "concierge_question",
  "concierge_answer",
  "concierge_source_clicked",
  "concierge_failure",
  "agent_question_submitted",
  "agent_question_answered",
  "lead_consent_requested",
  "lead_consent_granted",
  "lead_sent",
  "agent_verification_started",
  "agent_verified",
  "agent_verification_exception",
  "feed_record_received",
  "feed_record_rejected",
  "listing_published",
  "listing_unpublished",
  "compliance_check_passed",
  "compliance_check_failed",
];

const base = {
  id: "8f2d1c1e-3b4a-4c5d-9e6f-7a8b9c0d1e2f",
  occurredAt: "2026-10-28T10:00:00+10:00",
  userId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  anonymousId: null,
  sessionId: "s-1",
  userRole: "buyer",
  surface: "listing_page",
  listingId: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
  propertyId: null,
  suburbId: null,
  outcome: "success",
} as const;

describe("event catalogue", () => {
  it("covers every event in the V11 §12.8 baseline", () => {
    expect([...EVENT_NAMES].sort()).toEqual([...BRIEF_EVENTS].sort());
  });
});

describe("parseEvent", () => {
  it("accepts a valid listing_saved event", () => {
    const result = parseEvent({ ...base, name: "listing_saved", properties: { collectionId: null } });
    expect(result.ok).toBe(true);
  });

  it("rejects unknown event names", () => {
    const result = parseEvent({ ...base, name: "listing_liked", properties: {} });
    expect(result).toEqual({ ok: false, errors: ['name: unknown event "listing_liked"'] });
  });

  it("rejects undeclared properties such as free-text search terms", () => {
    const result = parseEvent({
      ...base,
      surface: "search",
      listingId: null,
      name: "search_started",
      properties: { mode: "natural_language", query: "3 bed house near school" },
    });
    expect(result.ok).toBe(false);
  });

  it("requires a listing reference for listing events", () => {
    const result = parseEvent({ ...base, listingId: null, name: "listing_saved", properties: { collectionId: null } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("listingId is required for listing_saved");
  });

  it("requires a user or anonymous id for non-system events", () => {
    const result = parseEvent({ ...base, userId: null, name: "listing_saved", properties: { collectionId: null } });
    expect(result.ok).toBe(false);
  });
});
