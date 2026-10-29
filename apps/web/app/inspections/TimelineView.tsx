"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics-client";
import { day, time } from "@/lib/format";
import { planBest, planInOrder, type Plan, type Stop } from "@/lib/route";
import { updateBuyerState, useBuyerState, type BuyerState } from "@/lib/storage";
import type { ListingSummary } from "@/lib/types";
import { useListings } from "@/lib/use-listings";

function localDate(iso: string): string {
  return iso.slice(0, 10);
}

function NoteEditor({ listingId, state }: { listingId: string; state: BuyerState }) {
  const existing = state.notes[listingId];
  const [note, setNote] = useState(existing?.note ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const timelineId = state.timelineId;

  function save(rating: number | null) {
    const ok = updateBuyerState((s) => ({ ...s, notes: { ...s.notes, [listingId]: { note: note.slice(0, 2000), rating, updatedAt: new Date().toISOString() } } }));
    setStatus(ok ? "saved" : "failed");
    if (ok && timelineId) track("inspection_note_added", { surface: "timeline", listingId, outcome: "success", properties: { timelineId, hasRating: rating !== null } });
  }

  const rating = existing?.rating ?? null;
  return (
    <details className="group mt-3 rounded-xl bg-canvas" open={Boolean(existing)}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-semibold [&::-webkit-details-marker]:hidden">
        <span>{existing ? `Your notes${rating !== null ? ` · ${rating}/5` : ""}` : "Add notes after the inspection"}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted transition group-open:rotate-180" fill="currentColor" aria-hidden="true">
          <path d="m7 10 5 5 5-5z" />
        </svg>
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3">
      <label htmlFor={`note-${listingId}`} className="sr-only">
        Your notes
      </label>
      <textarea
        id={`note-${listingId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
        rows={2}
        className="field min-h-20 py-2 text-sm"
        placeholder="Light, noise, condition, questions for the agent…"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs" id={`rating-${listingId}`}>
          Rating
        </span>
        <div role="radiogroup" aria-labelledby={`rating-${listingId}`} className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} out of 5`}
              onClick={() => save(n)}
              className={`h-9 w-9 rounded-full border text-sm font-semibold transition ${rating !== null && n <= rating ? "border-amber-400 bg-amber-400 text-white" : "border-line bg-surface text-muted"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => save(rating)} className="btn btn-secondary ml-auto min-h-9 px-4">
          Save note
        </button>
      </div>
      <span role="status" className="text-xs text-muted">
        {status === "saved" ? "Saved on this device" : status === "failed" ? "Couldn't save on this device" : ""}
      </span>
      </div>
    </details>
  );
}

export function TimelineView() {
  const state = useBuyerState();
  const listings = useListings(state ? state.timeline : null);
  const [date, setDate] = useState<string | null>(null);

  const ready = listings.status === "ready" ? listings.listings : [];
  const dates = useMemo(() => [...new Set(ready.flatMap((l) => l.inspections.map((i) => localDate(i.startsAt))))].sort(), [ready]);
  const activeDate = date && dates.includes(date) ? date : dates[0] ?? null;

  const stops: Stop[] = useMemo(
    () =>
      ready
        .map((l: ListingSummary) => ({
          listingId: l.id,
          label: l.displayAddress.split(",")[0] ?? l.displayAddress,
          location: l.location,
          windows: l.inspections.filter((i) => activeDate !== null && localDate(i.startsAt) === activeDate),
        }))
        .filter((s) => s.windows.length > 0),
    [ready, activeDate],
  );

  const manualOrder = state?.timelineOrder ?? [];
  const isManual = manualOrder.length > 0 && stops.every((s) => manualOrder.includes(s.listingId));
  const plan: Plan = useMemo(() => {
    if (stops.length === 0) return { visits: [], conflicts: [], totalTravelMinutes: 0 };
    if (isManual) {
      const ordered = manualOrder.map((id) => stops.find((s) => s.listingId === id)).filter((s): s is Stop => s !== undefined);
      return planInOrder(ordered);
    }
    return planBest(stops);
  }, [stops, isManual, manualOrder]);

  // Track each distinct plan once.
  const lastPlanKey = useRef<string>("");
  useEffect(() => {
    const timelineId = state?.timelineId;
    if (!timelineId || plan.visits.length === 0) return;
    const key = `${activeDate}:${plan.visits.map((v) => v.listingId).join(",")}:${plan.conflicts.length}`;
    if (key === lastPlanKey.current) return;
    lastPlanKey.current = key;
    track("inspection_route_created", {
      surface: "timeline",
      outcome: "success",
      properties: { timelineId, stopCount: plan.visits.length, conflictCount: plan.conflicts.length, totalTravelMinutes: plan.totalTravelMinutes },
    });
    for (const c of plan.conflicts) track("inspection_conflict_detected", { surface: "timeline", listingId: c.listingId, outcome: "blocked", properties: { timelineId, reason: c.reason } });
  }, [plan, activeDate, state?.timelineId]);

  function move(index: number, delta: -1 | 1) {
    const order = [...plan.visits.map((v) => v.listingId), ...plan.conflicts.map((c) => c.listingId)];
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target] as string, order[index] as string];
    updateBuyerState((s) => ({ ...s, timelineOrder: order }));
  }

  if (state === null || listings.status === "loading") return <p className="text-muted">Loading your inspections…</p>;
  if (listings.status === "error") {
    return (
      <p role="alert" className="rounded-md bg-bad-50 p-3 text-sm text-bad-700">
        We couldn't load your homes. Check your connection and try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">Open-home planner</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Inspections</h1>
        <p className="mt-1 text-sm text-muted">A route through your chosen open homes, with time to drive and park between them.</p>
      </div>

      {state.timeline.length === 0 ? (
        <div className="card flex flex-col items-center p-10 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm-2 8h14v10H5z" />
            </svg>
          </span>
          <p className="font-display text-lg font-bold">No homes in your plan yet</p>
          <p className="mt-1 text-sm text-muted">In your saved homes, tick "Add to inspections" for the homes you want to see.</p>
          <Link href="/shortlist" className="btn btn-primary mt-5">
            Go to saved homes
          </Link>
        </div>
      ) : dates.length === 0 ? (
        <p className="card p-5 text-sm">None of the homes in your plan have upcoming open homes. Contact the agents to arrange private inspections.</p>
      ) : (
        <>
          {dates.length > 1 && (
            <div role="tablist" aria-label="Inspection day" className="flex gap-2 overflow-x-auto">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={d === activeDate}
                  onClick={() => setDate(d)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${d === activeDate ? "bg-ink text-white" : "bg-surface text-muted ring-1 ring-line hover:text-ink"}`}
                >
                  {day(`${d}T12:00:00+10:00`)}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 font-semibold text-brand-800">
              {plan.visits.length} of {stops.length} open homes fit
            </span>
            <span className="text-muted">about {plan.totalTravelMinutes} min driving</span>
            {isManual && (
              <button type="button" onClick={() => updateBuyerState((s) => ({ ...s, timelineOrder: [] }))} className="btn btn-secondary min-h-8 px-3 text-xs">
                Let Landora choose the order
              </button>
            )}
          </div>

          <ol className="relative flex flex-col gap-4 pl-10 before:absolute before:bottom-6 before:left-[15px] before:top-6 before:w-0.5 before:bg-brand-200">
            {plan.visits.map((v, i) => (
              <li key={v.listingId} className="relative">
                <span className="absolute -left-10 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white ring-4 ring-canvas" aria-hidden="true">
                  {i + 1}
                </span>
                {v.travelMinutesFromPrevious > 0 && (
                  <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                      <path d="M6.3 5 4 11v8h2v-2h12v2h2v-8l-2.3-6zm1.4 2h8.6l1.5 4H6.2z" />
                    </svg>
                    {v.travelMinutesFromPrevious} min drive{v.waitMinutes > 0 ? `, then ${v.waitMinutes} min until it opens` : ""}
                  </p>
                )}
                <div className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-brand-700">
                      {time(v.startAt)} <span className="text-sm font-medium text-muted">to {time(v.leaveAt)}</span>
                    </p>
                    <Link href={`/listing/${v.listingId}`} className="font-semibold hover:underline">
                      {v.label}
                    </Link>
                    <p className="text-xs text-muted">
                      Open {time(v.window.startsAt)} to {time(v.window.endsAt)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${v.label} earlier`} className="h-9 w-9 rounded-full border border-line bg-surface hover:border-brand-600 disabled:opacity-40">
                      ↑
                    </button>
                    <button type="button" onClick={() => move(i, 1)} aria-label={`Move ${v.label} later`} className="h-9 w-9 rounded-full border border-line bg-surface hover:border-brand-600">
                      ↓
                    </button>
                  </div>
                </div>
                <NoteEditor listingId={v.listingId} state={state} />
                </div>
              </li>
            ))}
          </ol>

          {plan.conflicts.length > 0 && (
            <section aria-labelledby="conflicts" className="rounded-2xl border border-amber-200 bg-warn-50 p-4">
              <h2 id="conflicts" className="text-sm font-semibold text-warn-700">
                Can't fit {plan.conflicts.length === 1 ? "this home" : "these homes"}
              </h2>
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {plan.conflicts.map((c, i) => (
                  <li key={c.listingId} className="flex items-center justify-between gap-2">
                    <span>{c.message}</span>
                    <button type="button" onClick={() => move(plan.visits.length + i, -1)} className="btn btn-secondary min-h-8 shrink-0 px-3 text-xs">
                      Try earlier
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-muted">
            Drive times are estimates from straight-line distance (×1.3 at 40 km/h, plus 5 min to park). Allow extra time on busy roads.
          </p>
        </>
      )}
    </div>
  );
}
