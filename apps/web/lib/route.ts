// Inspection timeline planner (FR-INSP-002/003). Builds a feasible Saturday route through open homes
// using time windows and travel buffers, and explains every stop it cannot fit.
// Travel time is a straight-line estimate (distance × road factor ÷ average speed + parking buffer);
// a routing provider replaces it in the build semester behind the same function.

export interface Stop {
  listingId: string;
  label: string;
  location: { lat: number; lng: number };
  windows: { startsAt: string; endsAt: string }[];
}

export interface PlanOptions {
  /** Minutes spent at each open home. */
  visitMinutes: number;
  /** Minutes added to every drive for parking and walking. */
  bufferMinutes: number;
  averageKmh: number;
  roadFactor: number;
}

export const DEFAULT_PLAN_OPTIONS: PlanOptions = { visitMinutes: 12, bufferMinutes: 5, averageKmh: 40, roadFactor: 1.3 };

export interface PlannedVisit {
  listingId: string;
  label: string;
  arriveAt: string;
  startAt: string;
  leaveAt: string;
  window: { startsAt: string; endsAt: string };
  travelMinutesFromPrevious: number;
  /** Minutes waiting outside before the open home starts. */
  waitMinutes: number;
}

export type ConflictReason = "overlap" | "insufficient_travel_time" | "window_closed";

export interface Conflict {
  listingId: string;
  label: string;
  reason: ConflictReason;
  message: string;
}

export interface Plan {
  visits: PlannedVisit[];
  conflicts: Conflict[];
  totalTravelMinutes: number;
}

const MS = 60_000;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function travelMinutes(a: { lat: number; lng: number }, b: { lat: number; lng: number }, o: PlanOptions): number {
  return Math.ceil((haversineKm(a, b) * o.roadFactor * 60) / o.averageKmh + o.bufferMinutes);
}

/** Keeps the local wall-clock offset of the window when formatting computed times. */
function withOffset(ms: number, reference: string): string {
  const offset = reference.slice(19); // e.g. "+10:00"
  const sign = offset.startsWith("-") ? -1 : 1;
  const [h, m] = offset.slice(1).split(":").map(Number);
  const local = new Date(ms + sign * ((h ?? 0) * 60 + (m ?? 0)) * MS);
  return `${local.toISOString().slice(0, 19)}${offset}`;
}

interface Simulation {
  visits: PlannedVisit[];
  failedAt: number | null;
  failure: ConflictReason | null;
  travel: number;
}

/** Visits stops in the given order, choosing for each the earliest window that can still be reached. */
function simulate(order: readonly Stop[], o: PlanOptions): Simulation {
  const visits: PlannedVisit[] = [];
  let clock: number | null = null;
  let here: Stop["location"] | null = null;
  let travel = 0;

  for (const [i, stop] of order.entries()) {
    const drive = here ? travelMinutes(here, stop.location, o) : 0;
    const arrive: number | null = clock === null ? null : clock + drive * MS;
    const windows = [...stop.windows].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    let placed = false;
    let reason: ConflictReason = "window_closed";

    for (const w of windows) {
      const ws = Date.parse(w.startsAt);
      const we = Date.parse(w.endsAt);
      const start = arrive === null ? ws : Math.max(arrive, ws);
      const latestStart = we - Math.min(o.visitMinutes, (we - ws) / MS) * MS;
      if (start <= latestStart) {
        const leave = Math.min(start + o.visitMinutes * MS, we);
        visits.push({
          listingId: stop.listingId,
          label: stop.label,
          arriveAt: withOffset(arrive ?? ws, w.startsAt),
          startAt: withOffset(start, w.startsAt),
          leaveAt: withOffset(leave, w.startsAt),
          window: w,
          travelMinutesFromPrevious: drive,
          waitMinutes: arrive === null ? 0 : Math.max(0, Math.round((ws - arrive) / MS)),
        });
        travel += drive;
        clock = leave;
        here = stop.location;
        placed = true;
        break;
      }
      // Could we have made it if we had left the previous stop at its window start? Then it's travel time.
      const previous = visits[visits.length - 1];
      if (previous && Date.parse(previous.startAt) < we && Date.parse(previous.leaveAt) > ws) reason = "overlap";
      else if (arrive !== null && arrive > latestStart && (clock as number) <= latestStart) reason = "insufficient_travel_time";
    }
    if (!placed) return { visits, failedAt: i, failure: reason, travel };
  }
  return { visits, failedAt: null, failure: null, travel };
}

function messageFor(reason: ConflictReason, label: string, previous: string | undefined): string {
  switch (reason) {
    case "overlap":
      return `${label} is open at the same time as ${previous ?? "another stop"}.`;
    case "insufficient_travel_time":
      return `There isn't enough time to drive to ${label} after ${previous ?? "the previous stop"} before it closes.`;
    case "window_closed":
      return `${label}'s open home ends before you could get there.`;
  }
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

/** Plans the given stops in exactly this order (manual reordering). Stops that cannot be reached are flagged and skipped. */
export function planInOrder(order: readonly Stop[], o: PlanOptions = DEFAULT_PLAN_OPTIONS): Plan {
  const conflicts: Conflict[] = [];
  let remaining = [...order];
  let result: Simulation = { visits: [], failedAt: null, failure: null, travel: 0 };
  // Re-simulate, removing each stop that fails, so later stops still get a fair chance.
  for (let guard = 0; guard <= order.length; guard++) {
    result = simulate(remaining, o);
    if (result.failedAt === null) break;
    const failed = remaining[result.failedAt] as Stop;
    const prev = result.visits[result.visits.length - 1]?.label;
    conflicts.push({ listingId: failed.listingId, label: failed.label, reason: result.failure ?? "window_closed", message: messageFor(result.failure ?? "window_closed", failed.label, prev) });
    remaining = remaining.filter((s) => s.listingId !== failed.listingId);
  }
  return { visits: result.visits, conflicts, totalTravelMinutes: result.travel };
}

/**
 * Finds the order that fits the most open homes, then the least driving.
 * Exhaustive for up to 8 stops (40,320 orders); beyond that, orders by earliest window then plans.
 */
export function planBest(stops: readonly Stop[], o: PlanOptions = DEFAULT_PLAN_OPTIONS): Plan {
  const usable = stops.filter((s) => s.windows.length > 0);
  if (usable.length === 0) return { visits: [], conflicts: [], totalTravelMinutes: 0 };
  const byEarliest = [...usable].sort((a, b) => (a.windows[0]?.startsAt ?? "").localeCompare(b.windows[0]?.startsAt ?? ""));
  if (usable.length > 8) return planInOrder(byEarliest, o);

  let best: Plan | null = null;
  for (const order of permutations(usable)) {
    const plan = planInOrder(order, o);
    if (
      !best ||
      plan.visits.length > best.visits.length ||
      (plan.visits.length === best.visits.length && plan.totalTravelMinutes < best.totalTravelMinutes) ||
      (plan.visits.length === best.visits.length &&
        plan.totalTravelMinutes === best.totalTravelMinutes &&
        (plan.visits[plan.visits.length - 1]?.leaveAt ?? "") < (best.visits[best.visits.length - 1]?.leaveAt ?? ""))
    ) {
      best = plan;
    }
  }
  return best as Plan;
}
