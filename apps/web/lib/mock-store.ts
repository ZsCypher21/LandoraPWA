import type { AccountRole, Role } from "./roles";

// Prototype state for privileged actions: publication changes, role changes, verification decisions
// and the audit log (FR-ADM-002). It lives in server memory, shared by everyone using this server, and
// resets when the server restarts. The build semester replaces it with tables from migration 0001
// (listing status, user_role, agent verification, audit_log); the action code above it stays.

export interface AuditEntry {
  id: number;
  occurredAt: string;
  actorUserId: string;
  actorName: string;
  actorRole: Role;
  /** Dotted verb, matching audit_log.action, for example "listing.publish". */
  action: string;
  entity: "listing" | "user" | "agent" | "route" | "question" | "answer" | "post";
  entityId: string;
  entityLabel: string;
  before: string | null;
  after: string | null;
  reason: string | null;
  outcome: "success" | "denied";
}

export interface VerificationDecision {
  status: "exception_approved" | "rejected";
  reason: string;
  /** Exceptions expire (FR-AGT-001); rejections do not. */
  expiresOn: string | null;
}

export interface MockStore {
  /** Listing id to published flag, only for listings someone changed. */
  readonly publication: Map<string, boolean>;
  readonly roles: Map<string, AccountRole>;
  readonly verification: Map<string, VerificationDecision>;
  /** Append-only. Read through auditLog(), which returns a copy. */
  readonly audit: AuditEntry[];
}

export function createMockStore(): MockStore {
  return { publication: new Map(), roles: new Map(), verification: new Map(), audit: [] };
}

export function appendAudit(store: MockStore, entry: Omit<AuditEntry, "id" | "occurredAt">, now: Date = new Date()): AuditEntry {
  const full: AuditEntry = { ...entry, id: store.audit.length + 1, occurredAt: now.toISOString() };
  store.audit.push(Object.freeze(full));
  return full;
}

/** Newest first, as a copy: callers cannot edit or remove entries. */
export function auditLog(store: MockStore): readonly AuditEntry[] {
  return [...store.audit].reverse();
}

export const MIN_REASON_LENGTH = 10;

export type Validation = { ok: true; value: string } | { ok: false; error: string };

export function validateReason(input: unknown): Validation {
  const value = typeof input === "string" ? input.trim() : "";
  if (value.length < MIN_REASON_LENGTH) return { ok: false, error: `Give a reason of at least ${MIN_REASON_LENGTH} characters. It is kept in the audit log.` };
  if (value.length > 500) return { ok: false, error: "Keep the reason under 500 characters." };
  return { ok: true, value };
}

/** An exception expiry must be a real date after today and no more than a year out. */
export function validateExpiry(input: unknown, today: string): Validation {
  const value = typeof input === "string" ? input.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return { ok: false, error: "Choose an expiry date." };
  if (value <= today) return { ok: false, error: "The expiry date must be after today." };
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCFullYear(limit.getUTCFullYear() + 1);
  if (value > limit.toISOString().slice(0, 10)) return { ok: false, error: "Exceptions can last at most 12 months." };
  return { ok: true, value };
}

const KEY = Symbol.for("landora.prototype.mockStore");

/** One store per server process; survives dev-server module reloads. */
export function mockStore(): MockStore {
  const holder = globalThis as typeof globalThis & { [KEY]?: MockStore };
  holder[KEY] ??= createMockStore();
  return holder[KEY];
}
