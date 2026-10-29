import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluate, loadRulePack, referencedFacts, type Facts, type RuleStatus } from "./index";

// Regression suite for every rule pack (FR-CMP-003): each pack must load, and each fixture must match.

interface Fixture {
  name: string;
  asOf: string;
  facts: Facts;
  expectOutcome?: string;
  expectRules?: Record<string, RuleStatus>;
  expectBenefits?: Record<string, number>;
  expectMissing?: Record<string, string[]>;
}

const packsDir = fileURLToPath(new URL("../../../rule-packs", import.meta.url));
const packFiles = readdirSync(packsDir, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".json") && !f.endsWith(".fixtures.json"))
  .sort();

describe.each(packFiles)("rule pack %s", (file) => {
  const pack = loadRulePack(JSON.parse(readFileSync(join(packsDir, file), "utf8")));
  const fixturesPath = join(packsDir, file.replace(/\.json$/, ".fixtures.json"));

  it("declares every fact it references, and nothing unused", () => {
    expect(referencedFacts(pack)).toEqual(pack.facts.map((f) => f.key).sort());
  });

  it("explains every personal fact it collects", () => {
    for (const fact of pack.facts.filter((f) => f.personal)) {
      expect(fact.purpose, fact.key).toBeTruthy();
    }
  });

  const fixtures: Fixture[] = existsSync(fixturesPath) ? JSON.parse(readFileSync(fixturesPath, "utf8")) : [];
  if (pack.status !== "draft" || fixtures.length > 0) {
    it("has fixtures", () => expect(fixtures.length).toBeGreaterThan(0));
  }

  it.each(fixtures.map((f) => [f.name, f] as const))("%s", (_name, fixture) => {
    const result = evaluate(pack, fixture.facts, fixture.asOf);
    if (fixture.expectOutcome) expect(result.outcome).toBe(fixture.expectOutcome);
    const byId = new Map(result.rules.map((r) => [r.ruleId, r]));
    for (const [id, status] of Object.entries(fixture.expectRules ?? {})) {
      expect(byId.get(id)?.status, id).toBe(status);
      if (status === "fail") expect(byId.get(id)?.reason, id).toBeTruthy();
    }
    for (const [id, amount] of Object.entries(fixture.expectBenefits ?? {})) {
      expect(byId.get(id)?.benefit?.amountAud, id).toBe(amount);
    }
    for (const [id, missing] of Object.entries(fixture.expectMissing ?? {})) {
      expect(byId.get(id)?.missingFacts, id).toEqual(missing);
    }
  });
});
