"use client";

import type { EventName, UserRole } from "@landora/analytics";
import { hasConsent } from "./consent";
import type { Role } from "./roles";

// Sends §12.8 events to /api/events, which validates them against the typed catalogue.
// Fire-and-forget: analytics must never break a buyer action.

const ANON_KEY = "landora.anon.v1";

let userRole: UserRole = "anonymous";

/** Called by the role provider so events carry the viewer's role (guest is "anonymous" in §12.8). */
export function setAnalyticsRole(role: Role): void {
  userRole = role === "guest" ? "anonymous" : role;
}

function anonymousId(): string {
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon-storage-unavailable";
  }
}

export function track(
  name: EventName,
  fields: { surface: string; listingId?: string | null; suburbId?: string | null; outcome?: string | null; properties: Record<string, unknown> },
): void {
  try {
    // Respect the buyer's analytics choice on the account page (V11 §12.5).
    if (!hasConsent("analytics")) return;
    const body = JSON.stringify({
      id: crypto.randomUUID(),
      name,
      occurredAt: new Date().toISOString().replace("Z", "+00:00"),
      userId: null,
      anonymousId: anonymousId(),
      sessionId: null,
      userRole,
      surface: fields.surface,
      listingId: fields.listingId ?? null,
      propertyId: null,
      suburbId: fields.suburbId ?? null,
      outcome: fields.outcome ?? null,
      properties: fields.properties,
    });
    void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  } catch {
    // Never surface analytics failures to the buyer.
  }
}
