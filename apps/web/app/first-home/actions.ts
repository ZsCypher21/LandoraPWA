"use server";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluate, loadRulePack, type RulePack } from "@landora/rules";
import { z } from "zod";
import { AS_OF } from "@/lib/data";
import { FACT_LABELS, HOME_KINDS, REGIONS, YES_NO_QUESTIONS } from "./questions";

// Deterministic FHB entitlement check (FR-FHB-001/002). Answers are evaluated and discarded:
// nothing is stored or logged (V11 §5.8 "data care", §12.5 minimisation).

export interface ProgramResult {
  id: string;
  title: string;
  status: "eligible" | "not_eligible" | "needs_info";
  amountAud: number | null;
  benefit: string | null;
  reason: string | null;
  needs: string[];
  sources: { title: string; url?: string | undefined; document?: string | undefined; retrievedOn: string }[];
  assumptions: string[];
}

export type CheckState =
  | { kind: "idle" }
  | { kind: "invalid"; errors: string[] }
  | { kind: "error" }
  | {
      kind: "result";
      programs: ProgramResult[];
      packVersion: string;
      packStatus: string;
      effectiveFrom: string;
      asOf: string;
      disclaimer: string;
      budgetAud: number | null;
    };

let pack: RulePack | null = null;
function getPack(): RulePack {
  pack ??= loadRulePack(JSON.parse(readFileSync(join(/*turbopackIgnore: true*/ process.cwd(), "..", "..", "rule-packs", "qld", "fhb_entitlement.json"), "utf8")));
  return pack;
}

const yesNo = z.enum(["yes", "no", "unsure"]).optional();
const Form = z.object({
  homeKind: z.enum(HOME_KINDS.map((k) => k.value) as [string, ...string[]]).optional(),
  region: z.enum(REGIONS.map((r) => r.value) as [string, ...string[]]).optional(),
  value: z.coerce.number().int().min(10_000).max(20_000_000).optional(),
  deposit: z.coerce.number().min(0).max(100).optional(),
});

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function checkEntitlements(_prev: CheckState, formData: FormData): Promise<CheckState> {
  const parsed = Form.safeParse({
    homeKind: emptyToUndefined(formData.get("homeKind")),
    region: emptyToUndefined(formData.get("region")),
    value: emptyToUndefined(formData.get("value")),
    deposit: emptyToUndefined(formData.get("deposit")),
  });
  if (!parsed.success) {
    return { kind: "invalid", errors: parsed.error.issues.map((i) => (i.path[0] === "value" ? "Enter a price between $10,000 and $20 million." : i.path[0] === "deposit" ? "Enter a deposit between 0 and 100%." : "Check your answers.")) };
  }

  const facts: Record<string, string | number | boolean | null> = {
    "purchase.home_kind": parsed.data.homeKind ?? null,
    "purchase.hgs_price_cap_region": parsed.data.region ?? null,
    "purchase.value_aud": parsed.data.value ?? null,
    "finance.deposit_percent": parsed.data.deposit ?? null,
  };
  for (const q of YES_NO_QUESTIONS) {
    const a = yesNo.safeParse(emptyToUndefined(formData.get(q.fact)));
    facts[q.fact] = a.success && a.data === "yes" ? true : a.success && a.data === "no" ? false : null;
  }
  // If everyone is a citizen or PR, then at least one is.
  if (facts["applicants.all_citizen_or_pr"] === true) facts["applicants.any_citizen_or_pr"] = true;

  try {
    const p = getPack();
    const result = evaluate(p, facts, AS_OF);
    return {
      kind: "result",
      programs: result.rules.map((r) => ({
        id: r.ruleId,
        title: r.title,
        status: r.status === "pass" ? "eligible" : r.status === "fail" ? "not_eligible" : "needs_info",
        amountAud: r.benefit?.amountAud ?? null,
        benefit: r.benefit?.description ?? null,
        reason: r.reason,
        needs: r.missingFacts.map((f) => FACT_LABELS[f] ?? f),
        sources: r.sources,
        assumptions: r.assumptions,
      })),
      packVersion: result.packVersion,
      packStatus: result.packStatus,
      effectiveFrom: p.effectiveFrom,
      asOf: result.asOf,
      disclaimer: result.disclaimer,
      budgetAud: parsed.data.value ?? null,
    };
  } catch (error) {
    console.error("FHB entitlement check failed", error instanceof Error ? error.message : error);
    return { kind: "error" };
  }
}
