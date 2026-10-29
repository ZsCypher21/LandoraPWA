"use client";

import { useSyncExternalStore } from "react";

// Prototype persistence in the buyer's own browser. The build semester replaces this with
// authenticated shortlists (FR-SAVE-001) and inspection timelines stored server-side.
// Every read and write is guarded: storage can be unavailable (private mode, blocked site data).

export interface InspectionNote {
  note: string;
  rating: number | null;
  updatedAt: string;
}

export interface BuyerState {
  shortlist: string[];
  notes: Record<string, InspectionNote>;
  /** Listing ids in the order the buyer arranged their timeline; empty means "let Landora order it". */
  timelineOrder: string[];
  /** Listings the buyer explicitly added to the timeline. */
  timeline: string[];
  /** Random id for this device's timeline, used to group analytics events. */
  timelineId: string | null;
}

const KEY = "landora.buyer.v1";
const EMPTY: BuyerState = { shortlist: [], notes: {}, timelineOrder: [], timeline: [], timelineId: null };
const listeners = new Set<() => void>();
let cache: BuyerState | null = null;
let cacheRaw: string | null = null;

function read(): BuyerState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cacheRaw && cache) return cache;
    cacheRaw = raw;
    const parsed = raw ? (JSON.parse(raw) as Partial<BuyerState>) : {};
    cache = {
      shortlist: Array.isArray(parsed.shortlist) ? parsed.shortlist.filter((x) => typeof x === "string") : [],
      notes: parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {},
      timelineOrder: Array.isArray(parsed.timelineOrder) ? parsed.timelineOrder : [],
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
      timelineId: typeof parsed.timelineId === "string" ? parsed.timelineId : null,
    };
    return cache;
  } catch {
    cache = cache ?? EMPTY;
    return cache;
  }
}

export function updateBuyerState(update: (s: BuyerState) => BuyerState): boolean {
  const next = update(read());
  cache = next;
  try {
    cacheRaw = JSON.stringify(next);
    window.localStorage.setItem(KEY, cacheRaw);
    return true;
  } catch {
    return false;
  } finally {
    listeners.forEach((l) => l());
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => (e.key === KEY || e.key === null) && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns null during server rendering and the first client render, so UIs can show a loading state. */
export function useBuyerState(): BuyerState | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
