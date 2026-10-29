"use client";

import { useSyncExternalStore } from "react";

// Purpose-specific consent (V11 §12.5), kept on this device in the prototype. The build semester
// stores each change server-side with who, what, when and purpose, as FR-AGT-004 requires.
// Only purposes the prototype can act on are listed; marketing and financial/readiness sharing
// join when a feature needs them.

export const CONSENT_PURPOSES = ["analytics", "concierge_memory", "agent_sharing"] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export interface ConsentChoice {
  granted: boolean;
  /** ISO time of the buyer's last change; null means the default applies. */
  updatedAt: string | null;
}

export type ConsentState = Record<ConsentPurpose, ConsentChoice>;

// Analytics stays on by default to match today's prototype; consent-first vs opt-out is an open PO decision.
export const CONSENT_DEFAULTS: Record<ConsentPurpose, boolean> = { analytics: true, concierge_memory: false, agent_sharing: false };

export const CONSENT_KEY = "landora.consent.v1";

export function parseConsent(raw: string | null): ConsentState {
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const source = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const out = {} as ConsentState;
  for (const purpose of CONSENT_PURPOSES) {
    const v = source[purpose] as Partial<ConsentChoice> | undefined;
    out[purpose] =
      v && typeof v.granted === "boolean"
        ? { granted: v.granted, updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : null }
        : { granted: CONSENT_DEFAULTS[purpose], updatedAt: null };
  }
  return out;
}

const listeners = new Set<() => void>();
let cacheRaw: string | null | undefined;
let cache: ConsentState = parseConsent(null);

function read(): ConsentState {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (raw !== cacheRaw) {
      cacheRaw = raw;
      cache = parseConsent(raw);
    }
  } catch {
    // Storage blocked: defaults apply.
  }
  return cache;
}

export function hasConsent(purpose: ConsentPurpose): boolean {
  return read()[purpose].granted;
}

export function setConsent(purpose: ConsentPurpose, granted: boolean): boolean {
  const next: ConsentState = { ...read(), [purpose]: { granted, updatedAt: new Date().toISOString() } };
  cache = next;
  try {
    cacheRaw = JSON.stringify(next);
    window.localStorage.setItem(CONSENT_KEY, cacheRaw);
    return true;
  } catch {
    return false;
  } finally {
    listeners.forEach((l) => l());
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => (e.key === CONSENT_KEY || e.key === null) && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Null during server rendering, so the page can show a loading state. */
export function useConsent(): ConsentState | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Every key the prototype keeps on this device about the buyer. */
export const DEVICE_DATA_KEYS = ["landora.buyer.v1", CONSENT_KEY, "landora.anon.v1"] as const;

/** "Delete my data" for the prototype: clears this device. Returns false if storage refused. */
export function deleteDeviceData(): boolean {
  try {
    for (const key of DEVICE_DATA_KEYS) window.localStorage.removeItem(key);
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    return true;
  } catch {
    return false;
  }
}
