import type { PackOutcome, RuleResult } from "@landora/rules";
import type { Role } from "./roles";

// Publication controls for the agent console (FR-AGT-003, FR-CMP-002). The rule pack decides whether a
// listing may be public; the agent only chooses whether an eligible listing is public right now.

export type PublicationStatus = "published" | "unpublished" | "blocked" | "incomplete";

export function gatePasses(outcome: PackOutcome): boolean {
  return outcome === "pass" || outcome === "pass_with_advisories";
}

/** A listing is public when the gate passes and nobody unpublished it. A failing gate always wins. */
export function publicationStatus(outcome: PackOutcome, override: boolean | undefined): PublicationStatus {
  if (outcome === "fail_blocking") return "blocked";
  if (outcome === "incomplete") return "incomplete";
  return override === false ? "unpublished" : "published";
}

export interface Blocker {
  ruleId: string;
  title: string;
  /** What is wrong and how to fix it, from the rule pack. */
  reason: string;
  severity: RuleResult["severity"];
}

/** Rules stopping publication, plus advisories, in the pack's own words. Never paraphrased. */
export function blockersOf(rules: readonly RuleResult[]): { blocking: Blocker[]; advisories: Blocker[] } {
  const toBlocker = (r: RuleResult): Blocker => ({
    ruleId: r.ruleId,
    title: r.title,
    severity: r.severity,
    reason: r.status === "unknown" ? `Not in the feed yet: ${r.missingFacts.join(", ")}.` : (r.reason ?? "This check did not pass."),
  });
  const failing = rules.filter((r) => r.status === "fail" || r.status === "unknown");
  return {
    blocking: failing.filter((r) => r.severity === "blocking").map(toBlocker),
    advisories: failing.filter((r) => r.severity !== "blocking").map(toBlocker),
  };
}

export interface ListingScope {
  agencyId: string;
  agentIds: readonly string[];
}

export interface Actor {
  role: Role;
  agentId: string | null;
  agencyId: string | null;
}

/** Agents act on their own listings; agency admins on any listing of their agency (FR-ACC-002). */
export function mayActOn(actor: Actor, listing: ListingScope): boolean {
  if (actor.agencyId === null || listing.agencyId !== actor.agencyId) return false;
  if (actor.role === "agency_admin") return true;
  if (actor.role === "agent") return actor.agentId !== null && listing.agentIds.includes(actor.agentId);
  return false;
}

export interface Controls {
  canPublish: boolean;
  canUnpublish: boolean;
  /** Why Publish is unavailable, when it is. */
  publishDisabledReason: string | null;
}

export function controlsFor(status: PublicationStatus, allowed: boolean): Controls {
  if (!allowed) {
    return { canPublish: false, canUnpublish: false, publishDisabledReason: "Only the listing's agent or an agency admin can change this listing." };
  }
  switch (status) {
    case "published":
      return { canPublish: false, canUnpublish: true, publishDisabledReason: "Already published." };
    case "unpublished":
      return { canPublish: true, canUnpublish: false, publishDisabledReason: null };
    case "blocked":
      return { canPublish: false, canUnpublish: false, publishDisabledReason: "Fix the blocking checks above. The gate re-runs when the feed updates." };
    case "incomplete":
      return { canPublish: false, canUnpublish: false, publishDisabledReason: "Some required facts are missing from the feed." };
  }
}
