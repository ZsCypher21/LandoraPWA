import type { FeedRunSummary } from "@/lib/feed-summary";
import { feedStamp } from "@/lib/format";
import { Empty, FEED, Pill } from "./Pill";

/** Feed runs with counts and the adapter's reason for every rejected record (FR-AGT-002, FR-FEED-002). */
export function FeedRuns({ runs, showAgency }: { runs: readonly FeedRunSummary[]; showAgency?: (id: string | null) => string }) {
  if (runs.length === 0) return <Empty title="No feed runs yet" body="Connect your REAXML feed. Each run will show what arrived and anything rejected." />;
  return (
    <ul className="flex flex-col gap-3">
      {runs.map((r) => (
        <li key={r.file} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{r.runAt ? feedStamp(r.runAt) : "Run time unreadable"}</p>
              <p className="truncate text-xs text-muted">
                {showAgency ? `${showAgency(r.externalAgentId)} · ` : ""}
                {r.file}
              </p>
            </div>
            <Pill tone={FEED[r.status]!.tone}>{FEED[r.status]!.label}</Pill>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-canvas p-3 text-center text-sm">
            <div>
              <dt className="text-xs text-muted">Received</dt>
              <dd className="font-display text-lg font-bold">{r.received}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Accepted</dt>
              <dd className="font-display text-lg font-bold">{r.accepted}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Rejected</dt>
              <dd className={`font-display text-lg font-bold ${r.rejected ? "text-bad-700" : ""}`}>{r.rejected}</dd>
            </div>
          </dl>
          {r.fileError && (
            <p className="mt-3 rounded-lg bg-bad-50 p-3 text-sm text-bad-700">
              <span className="font-semibold">The file could not be read: </span>
              {r.fileError}
            </p>
          )}
          {r.rejections.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-brand-700">Why {r.rejected === 1 ? "1 record was" : `${r.rejected} records were`} rejected</summary>
              <ul className="mt-2 flex flex-col gap-2">
                {r.rejections.map((x, i) => (
                  <li key={`${x.sourceListingId ?? "none"}-${i}`} className="rounded-lg bg-canvas p-3">
                    <p className="font-semibold">{x.sourceListingId ?? "Record with no listing id"}</p>
                    <ul className="mt-1 list-disc pl-5 text-muted">
                      {x.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {r.warnings > 0 && <p className="mt-2 text-xs text-muted">{r.warnings === 1 ? "1 accepted record carries" : `${r.warnings} accepted records carry`} warnings for review.</p>}
        </li>
      ))}
    </ul>
  );
}
