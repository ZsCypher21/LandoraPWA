import { readFileSync } from "node:fs";
import { ReaxmlAdapter } from "@landora/ingest";
import { evaluate, loadRulePack } from "@landora/rules";
import { describe, expect, it } from "vitest";
import { generate } from "./generate";
import { toReaxml } from "./reaxml";

const dataset = generate();

describe("synthetic dataset", () => {
  it("is deterministic for a seed", () => {
    expect(generate()).toEqual(dataset);
    expect(generate({ seed: 1 }).listings[0]?.id).not.toBe(dataset.listings[0]?.id);
  });

  it("has the expected mix", () => {
    const by = (t: string) => dataset.listings.filter((l) => l.listingType === t).length;
    expect(by("sale") + by("off_the_plan")).toBe(320);
    expect(by("off_the_plan")).toBeGreaterThan(0);
    expect(by("rent")).toBe(110);
    expect(dataset.listings.some((l) => l.propertyType === "land")).toBe(true);
  });

  it("gives most sale listings Saturday open homes", () => {
    const sales = dataset.listings.filter((l) => l.listingType === "sale");
    const withInspections = sales.filter((l) => l.inspections.length > 0).length;
    expect(withInspections / sales.length).toBeGreaterThan(0.75);
    // Day of week of the local (QLD) calendar date.
    for (const l of sales) for (const i of l.inspections) expect(new Date(`${i.startsAt.slice(0, 10)}T00:00:00Z`).getUTCDay()).toBe(6);
  });

  it("labels every enrichment as a synthetic placeholder", () => {
    expect(dataset.enrichments.every((e) => e.isPlaceholder && e.sourceType === "synthetic")).toBe(true);
  });

  it("uses unique addresses and listing ids", () => {
    const ids = new Set(dataset.listings.map((l) => l.sourceListingId));
    expect(ids.size).toBe(dataset.listings.length);
  });

  it("includes listings the QLD compliance gate blocks, and ones it passes", () => {
    const pack = loadRulePack(JSON.parse(readFileSync(new URL("../../../rule-packs/qld/publication_compliance.json", import.meta.url), "utf8")));
    const outcomes = new Set<string>();
    for (const l of dataset.listings) {
      const allVerified = l.agentIds.every((id) => dataset.agents.find((a) => a.id === id)?.verificationStatus !== "pending");
      const result = evaluate(
        pack,
        {
          "listing.type": l.listingType,
          "property.state": "QLD",
          "agent.listing_rights": allVerified,
          "listing.has_inspection_or_appointment": l.inspections.length > 0,
          ...(l.complianceFacts ?? {}),
        },
        dataset.meta.asOf,
      );
      outcomes.add(result.outcome);
    }
    expect(outcomes).toContain("pass");
    expect(outcomes).toContain("fail_blocking");
  });
});

describe("synthetic REAXML", () => {
  it("round-trips through the REAXML adapter without rejections", () => {
    const adapter = new ReaxmlAdapter("Australia/Brisbane");
    let mapped = 0;
    for (const agency of dataset.agencies) {
      const { records, fileIssues } = adapter.parse(toReaxml(dataset, agency));
      expect(fileIssues).toEqual([]);
      for (const r of records) {
        expect(r.ok, JSON.stringify(r.issues)).toBe(true);
        if (!r.ok) continue;
        mapped++;
        const source = dataset.listings.find((l) => l.sourceListingId === r.listing.sourceListingId);
        expect(r.listing.inspections).toEqual(source?.inspections);
        expect(r.listing.bedrooms ?? 0).toBe(source?.bedrooms);
        expect(r.listing.priceMinAud).toBe(source?.priceMinAud ?? null);
        expect(r.listing.address.suburb).toBe(source?.address.suburb);
        expect(r.issues.filter((i) => i.severity !== "advisory")).toEqual([]);
      }
    }
    expect(mapped).toBe(dataset.listings.length);
  });
});
