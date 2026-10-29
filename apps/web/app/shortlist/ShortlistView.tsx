"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ListingSpecs } from "@/components/ListingCard";
import { ListingImage } from "@/components/ListingImage";
import { SaveButton } from "@/components/SaveButton";
import { track } from "@/lib/analytics-client";
import { day, priceLabel, time } from "@/lib/format";
import { updateBuyerState, useBuyerState } from "@/lib/storage";
import type { ListingSummary } from "@/lib/types";
import { useListings } from "@/lib/use-listings";

const ID = /^[0-9a-f-]{36}$/;

function Row({ l, children }: { l: ListingSummary; children?: ReactNode }) {
  return (
    <li className="card flex gap-3 p-3 sm:gap-4">
      <Link href={`/listing/${l.id}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <ListingImage small seed={l.id} label={l.displayAddress} propertyType={l.propertyType} sizes="160px" className="h-24 w-28 rounded-xl sm:h-28 sm:w-40" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-display text-base font-bold tracking-tight">{priceLabel(l)}</p>
        <Link href={`/listing/${l.id}`} className="truncate text-sm text-muted hover:text-ink">
          {l.displayAddress}
        </Link>
        <div className="flex flex-wrap gap-x-3 text-sm font-medium">
          <ListingSpecs listing={l} />
        </div>
        <p className="text-xs text-muted">
          {l.inspections.length ? `Open ${l.inspections.map((i) => `${day(i.startsAt)} ${time(i.startsAt)}`).join(", ")}` : "No open homes scheduled"}
        </p>
        {children}
      </div>
    </li>
  );
}

export function ShortlistView() {
  const params = useSearchParams();
  const state = useBuyerState();
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  const sharedIds = useMemo(() => (params.get("ids") ?? "").split(",").filter((s) => ID.test(s)).slice(0, 50), [params]);
  const isShared = sharedIds.length > 0;
  const ids = isShared ? sharedIds : state?.shortlist ?? null;
  const listings = useListings(ids);

  async function copyLink() {
    if (!state?.shortlist.length) return;
    const url = `${window.location.origin}/shortlist?ids=${state.shortlist.join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("copied");
      track("listing_shared", { surface: "collection", listingId: state.shortlist[0] ?? null, outcome: "success", properties: { channel: "link" } });
    } catch {
      setCopied("failed");
    }
  }

  function toggleTimeline(l: ListingSummary) {
    const adding = !state?.timeline.includes(l.id);
    const timelineId = state?.timelineId ?? crypto.randomUUID();
    updateBuyerState((s) => ({ ...s, timelineId, timeline: adding ? [...s.timeline, l.id] : s.timeline.filter((x) => x !== l.id), timelineOrder: [] }));
    if (adding) {
      track("inspection_added", { surface: "collection", listingId: l.id, suburbId: l.suburbId, outcome: "success", properties: { inspectionId: crypto.randomUUID(), timelineId } });
    }
  }

  function importShared() {
    updateBuyerState((s) => ({ ...s, shortlist: [...new Set([...s.shortlist, ...sharedIds])] }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Your shortlist</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{isShared ? "Shared homes" : "Saved homes"}</h1>
          <p className="mt-1 text-sm text-muted">
            {isShared ? "Someone shared these homes with you." : "Saved on this device. Accounts and invited collaborators arrive in the build."}
          </p>
        </div>
        {isShared ? (
          <button type="button" onClick={importShared} disabled={!state} className="btn btn-primary">
            Add all to my saved homes
          </button>
        ) : (
          state &&
          state.shortlist.length > 0 && (
            <div className="flex flex-col items-end">
              <button type="button" onClick={copyLink} className="btn btn-secondary">
                Copy share link
              </button>
              <span role="status" className="text-xs text-muted">
                {copied === "copied" ? "Link copied. Anyone with it can view these homes." : copied === "failed" ? "Couldn't copy the link." : ""}
              </span>
            </div>
          )
        )}
      </div>

      {listings.status === "loading" && <p className="text-muted">Loading your saved homes…</p>}
      {listings.status === "error" && (
        <p role="alert" className="rounded-md bg-bad-50 p-3 text-sm text-bad-700">
          We couldn't load these homes. Check your connection and try again.
        </p>
      )}
      {listings.status === "ready" && listings.listings.length === 0 && (
        <div className="card flex flex-col items-center p-10 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M12 20.3 10.6 19C5.4 14.4 2 11.3 2 7.5 2 4.4 4.4 2 7.5 2c1.7 0 3.4.8 4.5 2.1A6 6 0 0 1 16.5 2C19.6 2 22 4.4 22 7.5c0 3.8-3.4 6.9-8.6 11.5z" />
            </svg>
          </span>
          <p className="font-display text-lg font-bold">No saved homes yet</p>
          <p className="mt-1 text-sm text-muted">Tap Save on any listing to keep it here and plan inspections.</p>
          <Link href="/search" className="btn btn-primary mt-5">
            Start searching
          </Link>
        </div>
      )}
      {listings.status === "ready" && listings.listings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {listings.listings.map((l) => (
            <Row key={l.id} l={l}>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                {!isShared && l.inspections.length > 0 && (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                    <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={state?.timeline.includes(l.id) ?? false} onChange={() => toggleTimeline(l)} />
                    Add to inspections
                  </label>
                )}
                <SaveButton listingId={l.id} suburbId={l.suburbId} surface="collection" variant="overlay" />
              </div>
            </Row>
          ))}
        </ul>
      )}
      {listings.status === "ready" && listings.missing.length > 0 && (
        <p className="text-sm text-muted">
          {listings.missing.length} saved home{listings.missing.length === 1 ? " is" : "s are"} no longer available (sold, withdrawn or no longer published).
        </p>
      )}
      {!isShared && state && state.timeline.length > 0 && (
        <Link href="/inspections" className="btn btn-primary sticky bottom-20 self-stretch shadow-lift sm:static sm:self-start">
          Plan inspections ({state.timeline.length})
        </Link>
      )}
    </div>
  );
}
