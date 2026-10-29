import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EMPTY_CRITERIA, type Criteria } from "./criteria";
import { parseIntent, type IntentResult } from "./intent";

// Runs the intent-parser slice of the AI benchmark (docs/ai/benchmark-cases.json, V11 §12.6).
// No-invention checks are a hard gate (FR-AI-002); the rest is reported as a baseline score.

interface Case {
  id: string;
  category: string;
  input: string;
  appliesTo: string[];
  expect: {
    criteria?: Partial<Record<keyof Criteria, unknown>>;
    mustClarify?: boolean;
    mustStateAssumption?: boolean;
    unsupportedIncludes?: string[];
    mustNotSetCriteria?: (keyof Criteria)[];
  };
}

const ROOT = join(__dirname, "..", "..", "..");
const cases = (JSON.parse(readFileSync(join(ROOT, "docs", "ai", "benchmark-cases.json"), "utf8")) as { cases: Case[] }).cases.filter((c) =>
  c.appliesTo.includes("intent_parser"),
);
const suburbs = (JSON.parse(readFileSync(join(ROOT, "data", "synthetic", "dataset.json"), "utf8")) as { suburbs: { name: string }[] }).suburbs.map((s) => s.name);

function sameSet(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** Returns the failed checks for one case; empty means pass. */
function check(c: Case, r: IntentResult): { inventions: string[]; misses: string[] } {
  const inventions: string[] = [];
  const misses: string[] = [];
  for (const [k, want] of Object.entries(c.expect.criteria ?? {})) {
    const got = r.criteria[k as keyof Criteria];
    if (want === null ? got !== null : !sameSet(got, want)) misses.push(`${k}: want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  }
  for (const k of c.expect.mustNotSetCriteria ?? []) {
    if (!sameSet(r.criteria[k], EMPTY_CRITERIA[k])) inventions.push(`${k} invented as ${JSON.stringify(r.criteria[k])}`);
  }
  if (c.expect.mustClarify && r.clarifications.length === 0) misses.push("no clarifying question");
  if (c.expect.mustStateAssumption && r.assumptions.length === 0) misses.push("no stated assumption");
  for (const term of c.expect.unsupportedIncludes ?? []) {
    if (!r.unsupported.some((u) => u.toLowerCase().includes(term.toLowerCase()))) misses.push(`'${term}' not flagged unsupported`);
  }
  return { inventions, misses };
}

describe("AI benchmark: intent parser slice", () => {
  const results = cases.map((c) => ({ c, ...check(c, parseIntent(c.input, suburbs)) }));

  it("never invents criteria (FR-AI-002 hard gate)", () => {
    expect(results.filter((r) => r.inventions.length > 0).map((r) => `${r.c.id}: ${r.inventions.join("; ")}`)).toEqual([]);
  });

  it("reports the baseline interpretation score", () => {
    const passed = results.filter((r) => r.inventions.length === 0 && r.misses.length === 0);
    const failed = results.filter((r) => r.misses.length > 0);
    console.info(
      `Intent benchmark: ${passed.length}/${results.length} passed (${Math.round((passed.length / results.length) * 100)}%)\n` +
        failed.map((r) => `  ${r.c.id} [${r.c.category}] ${r.misses.join("; ")}`).join("\n"),
    );
    expect(results.length).toBeGreaterThan(25);
  });
});
