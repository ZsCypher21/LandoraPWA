import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ReaxmlAdapter } from "@landora/ingest";
import { summariseRun, type FeedRunSummary } from "./feed-summary";

// Feed runs for the consoles: each agency's synthetic nightly feed plus the hand-written sample
// files that exercise rejections and a malformed file. Parsed with the real REAXML adapter (ADR 0008).

const REPO_ROOT = join(/*turbopackIgnore: true*/ process.cwd(), "..", "..");
const DIRS = [join("data", "synthetic", "reaxml"), join("samples", "reaxml")];

let cache: FeedRunSummary[] | null = null;

function load(): FeedRunSummary[] {
  const adapter = new ReaxmlAdapter();
  return DIRS.flatMap((dir) => {
    let files: string[];
    try {
      files = readdirSync(join(REPO_ROOT, dir)).filter((f) => f.endsWith(".xml"));
    } catch {
      return [];
    }
    return files.sort().map((f) => {
      const xml = readFileSync(join(REPO_ROOT, dir, f), "utf8");
      return summariseRun(`${dir.replaceAll("\\", "/")}/${f}`, xml, adapter.parse(xml));
    });
  });
}

/** All runs, newest first. */
export function feedRuns(): readonly FeedRunSummary[] {
  cache ??= load().sort((a, b) => (b.runAt ?? "").localeCompare(a.runAt ?? "") || a.file.localeCompare(b.file));
  return cache;
}

export function feedRunsFor(externalAgentId: string): readonly FeedRunSummary[] {
  return feedRuns().filter((r) => r.externalAgentId === externalAgentId);
}
