import "server-only";
import type { PackOutcome } from "@landora/rules";
import { AS_OF, agencies, agents, evaluatedListings, type RawAgency, type RawAgent, type RawListing } from "./data";
import type { FeedRunSummary } from "./feed-summary";
import { feedRuns, feedRunsFor } from "./feeds";
import { auditLog, mockStore, type AuditEntry, type VerificationDecision } from "./mock-store";
import { PERSONAS } from "./personas";
import { blockersOf, controlsFor, mayActOn, publicationStatus, type Blocker, type Controls, type PublicationStatus } from "./publication";
import type { AccountRole } from "./roles";
import type { Viewer } from "./session";

// View models for the agent and admin consoles, built only from the synthetic dataset, the QLD
// publication rule pack, the sample REAXML runs and prototype decisions in the mock store.

export type VerificationStatus = "verified" | "pending" | "exception_approved" | "rejected";

export interface AgentRow {
  id: string;
  name: string;
  email: string;
  agencyId: string;
  agencyName: string;
  verification: VerificationStatus;
  /** Set when a prototype decision changed the dataset's status. */
  decision: VerificationDecision | null;
  listingCount: number;
}

export interface ConsoleListing {
  id: string;
  sourceListingId: string;
  address: string;
  suburb: string;
  listingType: RawListing["listingType"];
  priceDisplay: string | null;
  agentNames: string[];
  outcome: PackOutcome;
  status: PublicationStatus;
  blocking: Blocker[];
  advisories: Blocker[];
  controls: Controls;
}

function toVerification(status: string | undefined): VerificationStatus {
  return status === "verified" || status === "pending" || status === "exception_approved" || status === "rejected" ? status : "pending";
}

/** Dataset status unless a prototype decision replaced it. */
export function verificationOf(agentId: string): VerificationStatus {
  const decision = mockStore().verification.get(agentId);
  return decision ? decision.status : toVerification(agents().find((a) => a.id === agentId)?.verificationStatus);
}

function address(raw: RawListing): string {
  const a = raw.address;
  return `${a.unitNumber ? `${a.unitNumber}/` : ""}${a.streetNumber} ${a.streetName}, ${a.suburb}`;
}

function agentRow(agent: RawAgent, listingCounts: Map<string, number>): AgentRow {
  return {
    id: agent.id,
    name: agent.fullName,
    email: agent.email,
    agencyId: agent.agencyId,
    agencyName: agencies().find((x) => x.id === agent.agencyId)?.name ?? "Unknown agency",
    verification: verificationOf(agent.id),
    decision: mockStore().verification.get(agent.id) ?? null,
    listingCount: listingCounts.get(agent.id) ?? 0,
  };
}

function consoleListings(viewer: Viewer, filter: (raw: RawListing) => boolean): ConsoleListing[] {
  const store = mockStore();
  const names = new Map(agents().map((a) => [a.id, a.fullName]));
  return evaluatedListings(verificationOf)
    .filter(({ raw }) => filter(raw))
    .map(({ raw, result }) => {
      const status = publicationStatus(result.outcome, store.publication.get(raw.id));
      const { blocking, advisories } = blockersOf(result.rules);
      return {
        id: raw.id,
        sourceListingId: raw.sourceListingId,
        address: address(raw),
        suburb: raw.address.suburb,
        listingType: raw.listingType,
        priceDisplay: raw.priceDisplay,
        agentNames: raw.agentIds.map((id) => names.get(id) ?? "Unknown agent"),
        outcome: result.outcome,
        status,
        blocking,
        advisories,
        controls: controlsFor(status, mayActOn(viewer, raw)),
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.address.localeCompare(b.address));
}

// Listings that need the agent first.
const STATUS_ORDER: Record<PublicationStatus, number> = { blocked: 0, incomplete: 1, unpublished: 2, published: 3 };

export interface AgentConsoleData {
  agency: RawAgency;
  self: AgentRow;
  feedRuns: readonly FeedRunSummary[];
  listings: ConsoleListing[];
  /** Agency admins only. */
  agencyAgents: AgentRow[] | null;
  asOf: string;
}

export function agentConsoleData(viewer: Viewer): AgentConsoleData | null {
  if (!viewer.agentId || !viewer.agencyId) return null;
  const agency = agencies().find((a) => a.id === viewer.agencyId);
  const me = agents().find((a) => a.id === viewer.agentId);
  if (!agency || !me) return null;

  const isAdmin = viewer.role === "agency_admin";
  const agencyListings = evaluatedListings(verificationOf).filter(({ raw }) => raw.agencyId === agency.id);
  const counts = new Map<string, number>();
  for (const { raw } of agencyListings) for (const id of raw.agentIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  return {
    agency,
    self: agentRow(me, counts),
    feedRuns: feedRunsFor(agency.externalAgentId),
    listings: consoleListings(viewer, (raw) => raw.agencyId === agency.id && (isAdmin || raw.agentIds.includes(me.id))),
    agencyAgents: isAdmin ? agents().filter((a) => a.agencyId === agency.id).map((a) => agentRow(a, counts)) : null,
    asOf: AS_OF,
  };
}

export interface UserRow {
  userId: string;
  name: string;
  email: string;
  role: AccountRole;
  agencyName: string | null;
  source: "dataset" | "prototype_persona";
}

export interface AgencyRow {
  id: string;
  name: string;
  externalAgentId: string;
  verification: string;
  agentCount: number;
  listingCount: number;
  blockedCount: number;
  lastFeedRunAt: string | null;
}

export interface AdminData {
  users: UserRow[];
  agencies: AgencyRow[];
  agents: AgentRow[];
  verificationQueue: AgentRow[];
  feedFailures: FeedRunSummary[];
  complianceBlocked: number;
  audit: readonly AuditEntry[];
  asOf: string;
}

export function adminData(): AdminData {
  const store = mockStore();
  const evaluated = evaluatedListings(verificationOf);
  const counts = new Map<string, number>();
  for (const { raw } of evaluated) for (const id of raw.agentIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const agentRows = agents().map((a) => agentRow(a, counts));
  const runs = feedRuns();

  const staff = (["buyer", "moderator", "platform_admin"] as const).map((r) => PERSONAS[r]);
  const users: UserRow[] = [
    ...staff.map((p) => ({ userId: p.userId, name: p.name, email: p.email, role: store.roles.get(p.userId) ?? p.role, agencyName: null, source: p.source })),
    ...agentRows.map((a) => ({
      userId: a.id,
      name: a.name,
      email: a.email,
      role: store.roles.get(a.id) ?? (a.id === PERSONAS.agency_admin.agentId ? "agency_admin" : "agent"),
      agencyName: a.agencyName,
      source: "dataset" as const,
    })),
  ];

  return {
    users,
    agencies: agencies().map((ag) => {
      const listings = evaluated.filter(({ raw }) => raw.agencyId === ag.id);
      return {
        id: ag.id,
        name: ag.name,
        externalAgentId: ag.externalAgentId,
        verification: ag.verificationStatus,
        agentCount: agentRows.filter((a) => a.agencyId === ag.id).length,
        listingCount: listings.length,
        blockedCount: listings.filter(({ result }) => result.outcome === "fail_blocking" || result.outcome === "incomplete").length,
        lastFeedRunAt: runs.find((r) => r.externalAgentId === ag.externalAgentId)?.runAt ?? null,
      };
    }),
    agents: agentRows,
    // Pending checks and live exceptions both need an admin's eye (FR-AGT-001).
    verificationQueue: agentRows.filter((a) => a.verification === "pending" || a.verification === "exception_approved"),
    feedFailures: runs.filter((r) => r.status !== "ok"),
    complianceBlocked: evaluated.filter(({ result }) => result.outcome === "fail_blocking" || result.outcome === "incomplete").length,
    audit: auditLog(store),
    asOf: AS_OF,
  };
}
