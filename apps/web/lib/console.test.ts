import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ReaxmlAdapter } from "@landora/ingest";
import { evaluate, loadRulePack } from "@landora/rules";
import { describe, expect, it } from "vitest";
import { feedAgentId, feedDate, summariseRun } from "./feed-summary";
import { blockersOf, controlsFor, gatePasses, mayActOn, publicationStatus } from "./publication";

const ROOT = join(__dirname, "..", "..", "..");
const pack = loadRulePack(JSON.parse(readFileSync(join(ROOT, "rule-packs", "qld", "publication_compliance.json"), "utf8")));
const run = (file: string) => {
  const xml = readFileSync(join(ROOT, file), "utf8");
  return summariseRun(file, xml, new ReaxmlAdapter().parse(xml));
};

describe("publication controls (FR-AGT-003, FR-CMP-002)", () => {
  it("never lets an override publish a listing that fails the gate", () => {
    expect(publicationStatus("fail_blocking", true)).toBe("blocked");
    expect(publicationStatus("incomplete", true)).toBe("incomplete");
    expect(publicationStatus("pass", undefined)).toBe("published");
    expect(publicationStatus("pass_with_advisories", false)).toBe("unpublished");
    expect(gatePasses("fail_blocking")).toBe(false);
  });

  it("enables only the action that makes sense, and only for an authorised actor", () => {
    expect(controlsFor("published", true)).toMatchObject({ canPublish: false, canUnpublish: true });
    expect(controlsFor("unpublished", true)).toMatchObject({ canPublish: true, canUnpublish: false });
    expect(controlsFor("blocked", true)).toMatchObject({ canPublish: false, canUnpublish: false });
    expect(controlsFor("blocked", true).publishDisabledReason).toMatch(/blocking checks/);
    expect(controlsFor("unpublished", false)).toMatchObject({ canPublish: false, canUnpublish: false });
  });

  it("scopes agents to their own listings and agency admins to their agency", () => {
    const listing = { agencyId: "A", agentIds: ["x"] };
    expect(mayActOn({ role: "agent", agentId: "x", agencyId: "A" }, listing)).toBe(true);
    expect(mayActOn({ role: "agent", agentId: "y", agencyId: "A" }, listing)).toBe(false);
    expect(mayActOn({ role: "agency_admin", agentId: "y", agencyId: "A" }, listing)).toBe(true);
    expect(mayActOn({ role: "agency_admin", agentId: "y", agencyId: "B" }, listing)).toBe(false);
    expect(mayActOn({ role: "platform_admin", agentId: null, agencyId: null }, listing)).toBe(false);
  });

  it("explains a Form 2 block in the rule pack's own words", () => {
    // A real synthetic listing whose agent confirmed everything except Form 2.
    const dataset = JSON.parse(readFileSync(join(ROOT, "data", "synthetic", "dataset.json"), "utf8")) as {
      listings: { listingType: string; inspections: unknown[]; complianceFacts: Record<string, string | boolean> | null }[];
    };
    const blocked = dataset.listings
      .map((l) =>
        evaluate(
          pack,
          { "listing.type": l.listingType, "property.state": "QLD", "agent.listing_rights": true, "listing.has_inspection_or_appointment": l.inspections.length > 0, ...(l.complianceFacts ?? {}) },
          "2026-10-28",
        ),
      )
      .find((r) => r.rules.some((x) => x.ruleId === "QLD-SD-001" && x.status === "fail"));
    expect(blocked?.outcome).toBe("fail_blocking");
    const form2 = blockersOf(blocked!.rules).blocking.find((b) => b.ruleId === "QLD-SD-001");
    expect(form2?.reason).toBe(pack.rules.find((r) => r.id === "QLD-SD-001")?.failureReason);
    expect(form2?.reason).toMatch(/Form 2/);
  });

  it("names missing feed facts when the gate is incomplete", () => {
    const result = evaluate(pack, { "listing.type": "sale", "property.state": "QLD", "agent.listing_rights": true }, "2026-10-28");
    const { blocking } = blockersOf(result.rules);
    expect(blocking.some((b) => b.ruleId === "QLD-SD-001" && b.reason === "Not in the feed yet: disclosure.exemption, disclosure.form2_ready.")).toBe(true);
  });
});

describe("feed run summary (FR-AGT-002, FR-FEED-002)", () => {
  it("reads the run time and agency from the REAXML header", () => {
    expect(feedDate('<propertyList date="2026-10-27-09:00:00">')).toBe("2026-10-27T09:00:00");
    expect(feedDate("<propertyList>")).toBeNull();
    expect(feedAgentId("<x><agentID> SYN-AG-001 </agentID></x>")).toBe("SYN-AG-001");
  });

  it("counts received, accepted and rejected records with reasons", () => {
    const r = run("samples/reaxml/02_sold_and_invalid.xml");
    expect(r.externalAgentId).toBe("SYN-AG-001");
    expect(r.received).toBe(r.accepted + r.rejected);
    expect(r.rejected).toBeGreaterThan(0);
    expect(r.status).toBe("partial");
    expect(r.rejections.every((x) => x.reasons.length > 0)).toBe(true);
  });

  it("reports a malformed file as a failed run with the parser's message", () => {
    const r = run("samples/reaxml/03_malformed.xml");
    expect(r.status).toBe("failed");
    expect(r.received).toBe(0);
    expect(r.fileError).toMatch(/line/);
    expect(r.externalAgentId).toBe("SYN-AG-001");
  });

  it("marks a clean synthetic feed as healthy", () => {
    const r = run("data/synthetic/reaxml/SYN-AG-001.xml");
    expect(r.status).toBe("ok");
    expect(r.received).toBeGreaterThan(0);
    expect(r.runAt).toBe("2026-10-28T06:00:00");
  });
});
