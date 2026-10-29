import type { Benefit, Condition, FactDefinition, Rule, RulePack, Source } from "./schema";
import { RulePack as RulePackSchema } from "./schema";

// Pure, deterministic evaluator (ADR 0007). No clock reads, no I/O.
// Missing facts are "unknown", never assumed: unknown propagates with three-valued logic so the
// result can say what information is missing instead of guessing (V11 §12.6).

export type FactValue = string | number | boolean;
export type Facts = Readonly<Record<string, FactValue | null | undefined>>;

type Tri = "true" | "false" | "unknown";

export type RuleStatus = "pass" | "fail" | "unknown" | "not_applicable";

export interface RuleResult {
  ruleId: string;
  title: string;
  status: RuleStatus;
  severity: Rule["severity"];
  /** Present when status is fail. */
  reason: string | null;
  /** Facts that were needed but missing; present when status is unknown. */
  missingFacts: string[];
  benefit: { amountAud: number | null; description: string } | null;
  sources: Source[];
  assumptions: string[];
  platformPolicy: boolean;
}

export type PackOutcome = "pass" | "pass_with_advisories" | "fail_blocking" | "incomplete";

export interface EvaluationResult {
  packId: string;
  packVersion: string;
  packStatus: RulePack["status"];
  asOf: string;
  outcome: PackOutcome;
  rules: RuleResult[];
  disclaimer: string;
}

export class RulePackError extends Error {
  constructor(
    message: string,
    readonly issues: string[],
  ) {
    super(`${message}: ${issues.join("; ")}`);
    this.name = "RulePackError";
  }
}

function collectFacts(c: Condition, into: Set<string>): Set<string> {
  if ("all" in c) c.all.forEach((x) => collectFacts(x, into));
  else if ("any" in c) c.any.forEach((x) => collectFacts(x, into));
  else if ("not" in c) collectFacts(c.not, into);
  else into.add(c.fact);
  return into;
}

/** Parses a pack and checks references that the schema alone cannot (declared facts, unique ids, typing). */
export function loadRulePack(input: unknown): RulePack {
  const parsed = RulePackSchema.safeParse(input);
  if (!parsed.success) {
    throw new RulePackError(
      "Rule pack failed schema validation",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  }
  const pack = parsed.data;
  const issues: string[] = [];
  const facts = new Map(pack.facts.map((f) => [f.key, f]));
  if (facts.size !== pack.facts.length) issues.push("facts: duplicate fact key");

  const ruleIds = new Set<string>();
  for (const rule of pack.rules) {
    if (ruleIds.has(rule.id)) issues.push(`rules.${rule.id}: duplicate rule id`);
    ruleIds.add(rule.id);

    const conditions = [rule.test, ...(rule.appliesWhen ? [rule.appliesWhen] : [])];
    for (const condition of conditions) {
      checkCondition(condition, facts, rule.id, issues);
    }
    if (rule.benefit?.type === "banded_aud") {
      const fact = facts.get(rule.benefit.fact);
      if (!fact || fact.type !== "number") issues.push(`rules.${rule.id}.benefit: band fact must be a declared number`);
      const belows = rule.benefit.bands.map((b) => b.below);
      if (belows.some((b, i) => i > 0 && b <= (belows[i - 1] as number))) {
        issues.push(`rules.${rule.id}.benefit: bands must be strictly ascending`);
      }
    }
  }
  if (pack.status !== "draft" && pack.approval === null) {
    issues.push("approval: non-draft packs must record who approved them");
  }
  if (issues.length > 0) throw new RulePackError("Rule pack has invalid references", issues);
  return pack;
}

function checkCondition(c: Condition, facts: Map<string, FactDefinition>, ruleId: string, issues: string[]): void {
  if ("all" in c) return c.all.forEach((x) => checkCondition(x, facts, ruleId, issues));
  if ("any" in c) return c.any.forEach((x) => checkCondition(x, facts, ruleId, issues));
  if ("not" in c) return checkCondition(c.not, facts, ruleId, issues);

  const def = facts.get(c.fact);
  if (!def) {
    issues.push(`rules.${ruleId}: undeclared fact "${c.fact}"`);
    return;
  }
  if ((c.op === "is_true" || c.op === "is_false") && def.type !== "boolean") {
    issues.push(`rules.${ruleId}: ${c.op} used on non-boolean fact "${c.fact}"`);
  }
  if ("value" in c) {
    const values = Array.isArray(c.value) ? c.value : [c.value];
    if (["lt", "lte", "gt", "gte"].includes(c.op) && def.type !== "number" && def.type !== "date") {
      issues.push(`rules.${ruleId}: ${c.op} used on ${def.type} fact "${c.fact}"`);
    }
    if (def.type === "string" && def.values) {
      for (const v of values) {
        if (typeof v !== "string" || !def.values.includes(v)) {
          issues.push(`rules.${ruleId}: value ${JSON.stringify(v)} is not allowed for "${c.fact}"`);
        }
      }
    }
  }
}

function compare(op: string, actual: FactValue, expected: FactValue | Array<string | number>): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual as string | number);
    case "not_in":
      return Array.isArray(expected) && !expected.includes(actual as string | number);
    case "lt":
      return actual < (expected as FactValue);
    case "lte":
      return actual <= (expected as FactValue);
    case "gt":
      return actual > (expected as FactValue);
    case "gte":
      return actual >= (expected as FactValue);
    default:
      throw new RulePackError(`Unsupported operator ${op}`, [op]);
  }
}

function evalCondition(c: Condition, facts: Facts, missing: Set<string>): Tri {
  if ("all" in c) {
    const results = c.all.map((x) => evalCondition(x, facts, missing));
    if (results.includes("false")) return "false";
    return results.includes("unknown") ? "unknown" : "true";
  }
  if ("any" in c) {
    const results = c.any.map((x) => evalCondition(x, facts, missing));
    if (results.includes("true")) return "true";
    return results.includes("unknown") ? "unknown" : "false";
  }
  if ("not" in c) {
    const r = evalCondition(c.not, facts, missing);
    return r === "unknown" ? "unknown" : r === "true" ? "false" : "true";
  }
  const actual = facts[c.fact];
  if (c.op === "is_known") return actual === null || actual === undefined ? "false" : "true";
  if (actual === null || actual === undefined) {
    missing.add(c.fact);
    return "unknown";
  }
  if (!("value" in c)) {
    if (c.op === "is_true") return actual === true ? "true" : "false";
    return actual === false ? "true" : "false";
  }
  return compare(c.op, actual, c.value) ? "true" : "false";
}

function benefitFor(benefit: Benefit | undefined, facts: Facts): RuleResult["benefit"] {
  if (!benefit) return null;
  switch (benefit.type) {
    case "fixed_aud":
      return { amountAud: benefit.amount, description: benefit.description };
    case "described":
      return { amountAud: null, description: benefit.description };
    case "banded_aud": {
      const value = facts[benefit.fact];
      if (typeof value !== "number") return { amountAud: null, description: benefit.description };
      const band = benefit.bands.find((b) => value < b.below);
      return { amountAud: band ? band.amount : benefit.otherwise, description: benefit.description };
    }
  }
}

function evaluateRule(rule: Rule, facts: Facts): RuleResult {
  const missing = new Set<string>();
  const base = {
    ruleId: rule.id,
    title: rule.title,
    severity: rule.severity,
    sources: rule.sources,
    assumptions: rule.assumptions,
    platformPolicy: rule.platformPolicy,
  };
  const applies = rule.appliesWhen ? evalCondition(rule.appliesWhen, facts, missing) : "true";
  if (applies === "false") {
    return { ...base, status: "not_applicable", reason: null, missingFacts: [], benefit: null };
  }
  const passed = evalCondition(rule.test, facts, missing);
  if (applies === "unknown" || passed === "unknown") {
    // If applicability is unknown we cannot say the rule failed; report what is missing instead.
    return { ...base, status: "unknown", reason: null, missingFacts: [...missing].sort(), benefit: null };
  }
  if (passed === "false") {
    return { ...base, status: "fail", reason: rule.failureReason, missingFacts: [], benefit: null };
  }
  return { ...base, status: "pass", reason: null, missingFacts: [], benefit: benefitFor(rule.benefit, facts) };
}

/**
 * Evaluates every rule in the pack.
 * Outcome: any blocking fail → fail_blocking; else any blocking unknown → incomplete;
 * else any advisory fail/unknown → pass_with_advisories; else pass.
 * For entitlement packs, read per-rule status: pass = eligible, fail = not eligible, unknown = needs information.
 */
export function evaluate(pack: RulePack, facts: Facts, asOf: string): EvaluationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new RulePackError("asOf must be an ISO date", [asOf]);
  if (asOf < pack.effectiveFrom || (pack.effectiveTo !== null && asOf > pack.effectiveTo)) {
    throw new RulePackError(`Pack ${pack.id}@${pack.version} is not in effect on ${asOf}`, [asOf]);
  }
  const rules = pack.rules.map((r) => evaluateRule(r, facts));
  const blocking = rules.filter((r) => r.severity === "blocking");
  const advisory = rules.filter((r) => r.severity === "advisory");

  let outcome: PackOutcome = "pass";
  if (blocking.some((r) => r.status === "fail")) outcome = "fail_blocking";
  else if (blocking.some((r) => r.status === "unknown")) outcome = "incomplete";
  else if (advisory.some((r) => r.status === "fail" || r.status === "unknown")) outcome = "pass_with_advisories";

  return {
    packId: pack.id,
    packVersion: pack.version,
    packStatus: pack.status,
    asOf,
    outcome,
    rules,
    disclaimer: pack.disclaimer,
  };
}

/** Facts referenced anywhere in the pack; used to build the minimal questionnaire. */
export function referencedFacts(pack: RulePack): string[] {
  const all = new Set<string>();
  for (const rule of pack.rules) {
    collectFacts(rule.test, all);
    if (rule.appliesWhen) collectFacts(rule.appliesWhen, all);
    if (rule.benefit?.type === "banded_aud") all.add(rule.benefit.fact);
  }
  return [...all].sort();
}
