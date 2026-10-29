import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluate, loadRulePack, type EvaluationResult, type RulePack } from "@landora/rules";
import { mockStore } from "./mock-store";
import type { ListingDetail, ListingSummary } from "./types";

// Read-only repository over the synthetic dataset (V11 §14.4). In the build semester this module is
// replaced by queries against the canonical database; pages and components do not change.

const REPO_ROOT = join(/*turbopackIgnore: true*/ process.cwd(), "..", "..");
export const AS_OF = "2026-10-28";

export interface RawListing {
  id: string;
  propertyId: string;
  agencyId: string;
  agentIds: string[];
  sourceListingId: string;
  sourceModTime: string;
  listingType: ListingDetail["listingType"];
  status: ListingDetail["status"];
  propertyType: ListingDetail["propertyType"];
  address: { unitNumber: string | null; streetNumber: string; streetName: string; suburbId: string; suburb: string; postcode: string };
  location: { lat: number; lng: number };
  headline: string;
  description: string;
  priceDisplay: string | null;
  priceMinAud: number | null;
  priceMaxAud: number | null;
  priceHidden: boolean;
  rentPerWeekAud: number | null;
  bondAud: number | null;
  availableFrom: string | null;
  bedrooms: number;
  bathrooms: number;
  carSpaces: number;
  landAreaM2: number | null;
  buildingAreaM2: number | null;
  features: string[];
  offThePlan: ListingDetail["offThePlan"];
  auctionAt: string | null;
  inspections: { startsAt: string; endsAt: string }[];
  imageCount: number;
  complianceFacts: Record<string, string | boolean> | null;
}

export interface RawAgency {
  id: string;
  name: string;
  externalAgentId: string;
  verificationStatus: string;
}

export interface RawAgent {
  id: string;
  agencyId: string;
  fullName: string;
  email: string;
  phone: string;
  verificationStatus: string;
}

/** Looks up an agent's licence verification status; lets consoles apply prototype decisions. */
export type AgentStatusLookup = (agentId: string) => string | undefined;

interface RawDataset {
  meta: { disclaimer: string; asOf: string };
  suburbs: { id: string; name: string; postcode: string; centre: { lat: number; lng: number } }[];
  agencies: RawAgency[];
  agents: RawAgent[];
  listings: RawListing[];
  enrichments: { propertyId: string | null; suburbId: string | null; kind: string; effectiveDate: string; payload: Record<string, unknown> }[];
}

interface Store {
  dataset: RawDataset;
  pack: RulePack;
  published: ListingDetail[];
  byId: Map<string, ListingDetail>;
  blockedCount: number;
}

let store: Store | null = null;

function loadJson<T>(...parts: string[]): T {
  const path = join(REPO_ROOT, ...parts);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    throw new Error(`Could not load ${path}. Run "pnpm --filter @landora/synthetic generate" first. (${error instanceof Error ? error.message : String(error)})`);
  }
}

function complianceFor(raw: RawListing, dataset: RawDataset, pack: RulePack, statusOf?: AgentStatusLookup): EvaluationResult {
  const agentsOk = raw.agentIds.every((id) => {
    const status = statusOf?.(id) ?? dataset.agents.find((a) => a.id === id)?.verificationStatus;
    return status === "verified" || status === "exception_approved";
  });
  return evaluate(
    pack,
    {
      "listing.type": raw.listingType,
      "property.state": "QLD",
      "agent.listing_rights": agentsOk,
      "listing.has_inspection_or_appointment": raw.inspections.length > 0,
      ...(raw.complianceFacts ?? {}),
    },
    AS_OF,
  );
}

function toDetail(raw: RawListing, dataset: RawDataset, result: EvaluationResult): ListingDetail {
  const a = raw.address;
  const street = `${a.unitNumber ? `${a.unitNumber}/` : ""}${a.streetNumber} ${a.streetName}`;
  const enrich = dataset.enrichments.filter((e) => e.propertyId === raw.propertyId);
  const avm = enrich.find((e) => e.kind === "avm");
  const history = enrich.find((e) => e.kind === "sales_history");
  const stats = dataset.enrichments.find((e) => e.suburbId === a.suburbId && e.kind === "suburb_stats");
  const isSale = raw.listingType !== "rent";

  return {
    id: raw.id,
    sourceListingId: raw.sourceListingId,
    listingType: raw.listingType,
    status: raw.status,
    propertyType: raw.propertyType,
    suburb: a.suburb,
    suburbId: a.suburbId,
    postcode: a.postcode,
    displayAddress: `${street}, ${a.suburb} QLD ${a.postcode}`,
    location: raw.location,
    headline: raw.headline,
    description: raw.description,
    priceDisplay: raw.priceDisplay,
    priceAud: raw.priceHidden ? null : raw.priceMinAud,
    rentPerWeekAud: raw.rentPerWeekAud,
    bondAud: raw.bondAud,
    availableFrom: raw.availableFrom,
    bedrooms: raw.bedrooms,
    bathrooms: raw.bathrooms,
    carSpaces: raw.carSpaces,
    landAreaM2: raw.landAreaM2,
    buildingAreaM2: raw.buildingAreaM2,
    features: raw.features,
    inspections: raw.inspections,
    auctionAt: raw.auctionAt,
    offThePlan: raw.offThePlan,
    // Badge only when disclosure is confirmed; a claimed exemption awaiting review does not earn it.
    disclosureReady: isSale && result.rules.some((r) => r.ruleId === "QLD-SD-001" && r.status === "pass"),
    agencyName: dataset.agencies.find((x) => x.id === raw.agencyId)?.name ?? "Unknown agency",
    agents: raw.agentIds.flatMap((id) => {
      const agent = dataset.agents.find((x) => x.id === id);
      return agent ? [{ name: agent.fullName, email: agent.email, phone: agent.phone }] : [];
    }),
    imageCount: raw.imageCount,
    sourceModTime: raw.sourceModTime,
    compliance: isSale
      ? {
          packId: result.packId,
          packVersion: result.packVersion,
          packStatus: result.packStatus,
          outcome: result.outcome,
          checks: result.rules
            .filter((r) => r.status !== "not_applicable")
            .map((r) => ({ title: r.title, status: r.status, platformPolicy: r.platformPolicy })),
        }
      : null,
    placeholderEstimate: avm
      ? {
          estimateAud: Number(avm.payload.estimateAud),
          lowAud: Number(avm.payload.lowAud),
          highAud: Number(avm.payload.highAud),
          confidence: String(avm.payload.confidence),
          effectiveDate: avm.effectiveDate,
        }
      : null,
    placeholderSalesHistory: history ? ((history.payload.sales as { date: string; priceAud: number }[]) ?? []) : [],
    suburbStats: stats
      ? {
          medianHouseAud: Number(stats.payload.medianHouseAud),
          annualGrowthPct: Number(stats.payload.annualGrowthPct),
          daysOnMarket: Number(stats.payload.daysOnMarket),
          effectiveDate: stats.effectiveDate,
        }
      : null,
    isSynthetic: true,
  };
}

function getStore(): Store {
  if (store) return store;
  const dataset = loadJson<RawDataset>("data", "synthetic", "dataset.json");
  const pack = loadRulePack(loadJson<unknown>("rule-packs", "qld", "publication_compliance.json"));
  const published: ListingDetail[] = [];
  let blockedCount = 0;
  for (const raw of dataset.listings) {
    const result = complianceFor(raw, dataset, pack);
    // Publication gate (FR-CMP-002): blocked or incomplete listings never reach buyers.
    if (result.outcome === "fail_blocking" || result.outcome === "incomplete") {
      blockedCount++;
      continue;
    }
    published.push(toDetail(raw, dataset, result));
  }
  store = { dataset, pack, published, byId: new Map(published.map((l) => [l.id, l])), blockedCount };
  return store;
}

export function toSummary(d: ListingDetail): ListingSummary {
  const {
    description: _description,
    buildingAreaM2: _b,
    bondAud: _bond,
    availableFrom: _a,
    offThePlan: _o,
    agents: _agents,
    imageCount: _i,
    compliance: _c,
    placeholderEstimate: _p,
    placeholderSalesHistory: _h,
    suburbStats: _s,
    ...summary
  } = d;
  return summary;
}

// An agent's unpublish in the prototype console (lib/mock-store) takes buyers' view down too (FR-AGT-003).
function isUnpublished(id: string): boolean {
  return mockStore().publication.get(id) === false;
}

export function publishedListings(): readonly ListingDetail[] {
  const all = getStore().published;
  return mockStore().publication.size ? all.filter((l) => !isUnpublished(l.id)) : all;
}

export function listingById(id: string): ListingDetail | null {
  const listing = getStore().byId.get(id) ?? null;
  return listing && !isUnpublished(listing.id) ? listing : null;
}

export function suburbs(): { id: string; name: string; postcode: string }[] {
  return getStore()
    .dataset.suburbs.map(({ id, name, postcode }) => ({ id, name, postcode }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Every listing in the dataset with its gate result, including blocked ones. For agent and admin consoles only. */
export function evaluatedListings(statusOf?: AgentStatusLookup): { raw: RawListing; result: EvaluationResult }[] {
  const s = getStore();
  return s.dataset.listings.map((raw) => ({ raw, result: complianceFor(raw, s.dataset, s.pack, statusOf) }));
}

/** The buyer view of any listing, published or not, for the agent's preview (FR-AGT-003). */
export function listingPreview(id: string, statusOf?: AgentStatusLookup): ListingDetail | null {
  const s = getStore();
  const raw = s.dataset.listings.find((l) => l.id === id);
  return raw ? toDetail(raw, s.dataset, complianceFor(raw, s.dataset, s.pack, statusOf)) : null;
}

export function agencies(): readonly RawAgency[] {
  return getStore().dataset.agencies;
}

export function agents(): readonly RawAgent[] {
  return getStore().dataset.agents;
}

export function datasetStats(): { published: number; blocked: number; disclaimer: string } {
  const s = getStore();
  return { published: s.published.length, blocked: s.blockedCount, disclaimer: s.dataset.meta.disclaimer };
}
