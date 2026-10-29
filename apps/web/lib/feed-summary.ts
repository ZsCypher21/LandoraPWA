import type { FeedParseResult, Issue } from "@landora/ingest";

// Feed health for the agent and admin consoles (FR-AGT-002, FR-FEED-002): last run, records received
// and rejected, and the adapter's reason for each rejection.

export interface FeedRejection {
  sourceListingId: string | null;
  reasons: string[];
}

export interface FeedRunSummary {
  file: string;
  externalAgentId: string | null;
  /** From the feed's propertyList date, as written (agency local time). Null when the file is unreadable. */
  runAt: string | null;
  received: number;
  accepted: number;
  rejected: number;
  /** Accepted records the adapter flagged for a human (held or advisory issues). */
  warnings: number;
  fileError: string | null;
  rejections: FeedRejection[];
  status: "ok" | "partial" | "failed";
}

function describe(issue: Issue): string {
  return `${issue.message} (${issue.path})`;
}

/** REAXML writes dates as 2026-10-27-09:00:00; return 2026-10-27T09:00:00. */
export function feedDate(xml: string): string | null {
  const m = /<propertyList\b[^>]*\bdate="(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2}:\d{2})"/.exec(xml);
  return m ? `${m[1]}T${m[2]}` : null;
}

/** The agency's feed id, read from the first agentID even when the XML is malformed. */
export function feedAgentId(xml: string): string | null {
  return /<agentID>\s*([^<\s]+)\s*<\/agentID>/.exec(xml)?.[1] ?? null;
}

export function summariseRun(file: string, xml: string, result: FeedParseResult): FeedRunSummary {
  const fileError = result.fileIssues.length ? result.fileIssues.map(describe).join("; ") : null;
  const rejections = result.records.flatMap((r) =>
    r.ok ? [] : [{ sourceListingId: r.sourceListingId, reasons: r.issues.filter((i) => i.severity === "reject").map(describe) }],
  );
  const accepted = result.records.filter((r) => r.ok);
  const received = result.records.length;
  return {
    file,
    externalAgentId: feedAgentId(xml),
    runAt: feedDate(xml),
    received,
    accepted: accepted.length,
    rejected: rejections.length,
    warnings: accepted.filter((r) => r.issues.length > 0).length,
    fileError,
    rejections,
    status: fileError !== null || (received > 0 && accepted.length === 0) ? "failed" : rejections.length > 0 ? "partial" : "ok",
  };
}
