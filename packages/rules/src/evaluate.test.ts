import { describe, expect, it } from "vitest";
import { evaluate, loadRulePack, RulePackError } from "./index";

const basePack = {
  id: "qld.publication_compliance",
  version: "1.0.0",
  jurisdiction: "QLD",
  domain: "publication_compliance",
  title: "Test pack",
  status: "draft",
  effectiveFrom: "2025-01-01",
  effectiveTo: "2026-12-31",
  disclaimer: "Test",
  approval: null,
  facts: [
    { key: "a", type: "boolean", description: "A" },
    { key: "n", type: "number", description: "N" },
  ],
  rules: [
    {
      id: "R-1",
      title: "A must be true",
      test: { fact: "a", op: "is_true" },
      severity: "blocking",
      failureReason: "Set A",
      sources: [{ title: "Test", document: "Test doc", retrievedOn: "2026-10-28" }],
    },
  ],
};

describe("loadRulePack", () => {
  it("rejects references to undeclared facts", () => {
    const bad = { ...basePack, rules: [{ ...basePack.rules[0], test: { fact: "missing", op: "is_true" } }] };
    expect(() => loadRulePack(bad)).toThrow(RulePackError);
  });

  it("rejects is_true on a number fact", () => {
    const bad = { ...basePack, rules: [{ ...basePack.rules[0], test: { fact: "n", op: "is_true" } }] };
    expect(() => loadRulePack(bad)).toThrow(/non-boolean/);
  });

  it("rejects an active pack without an approval record", () => {
    expect(() => loadRulePack({ ...basePack, status: "active" })).toThrow(RulePackError);
  });

  it("rejects a source with neither url nor document", () => {
    const bad = { ...basePack, rules: [{ ...basePack.rules[0], sources: [{ title: "x", retrievedOn: "2026-10-28" }] }] };
    expect(() => loadRulePack(bad)).toThrow(RulePackError);
  });
});

describe("evaluate", () => {
  const pack = loadRulePack(basePack);

  it("is deterministic and reports the pack version", () => {
    const a = evaluate(pack, { a: true }, "2026-10-28");
    const b = evaluate(pack, { a: true }, "2026-10-28");
    expect(a).toEqual(b);
    expect(a.packVersion).toBe("1.0.0");
    expect(a.outcome).toBe("pass");
  });

  it("treats a missing fact as unknown and the pack as incomplete", () => {
    const result = evaluate(pack, {}, "2026-10-28");
    expect(result.outcome).toBe("incomplete");
    expect(result.rules[0]?.missingFacts).toEqual(["a"]);
  });

  it("refuses to evaluate outside the effective window", () => {
    expect(() => evaluate(pack, { a: true }, "2027-01-01")).toThrow(/not in effect/);
  });
});
