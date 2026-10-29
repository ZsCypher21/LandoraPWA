import { describe, expect, it } from "vitest";
import { CONSENT_DEFAULTS, parseConsent } from "./consent";
import { appendAudit, auditLog, createMockStore, validateExpiry, validateReason } from "./mock-store";
import { PERSONAS } from "./personas";
import { ROLES, accessTo, assignableRoles, can, homeFor, navFor, routePermission, type Role } from "./roles";

describe("RBAC (FR-ACC-002)", () => {
  it("gives each permission only to the roles that need it", () => {
    expect(ROLES.filter((r) => can(r, "buyer.save"))).toEqual(["buyer"]);
    expect(ROLES.filter((r) => can(r, "listing.share"))).toEqual(["guest", "buyer"]);
    expect(ROLES.filter((r) => can(r, "listing.publish"))).toEqual(["agent", "agency_admin"]);
    expect(ROLES.filter((r) => can(r, "agency.view"))).toEqual(["agency_admin"]);
    expect(ROLES.filter((r) => can(r, "admin.console"))).toEqual(["moderator", "platform_admin"]);
    expect(ROLES.filter((r) => can(r, "admin.roles.change"))).toEqual(["platform_admin"]);
    expect(ROLES.filter((r) => can(r, "admin.verification.decide"))).toEqual(["platform_admin"]);
  });

  it("lets a guest do nothing privileged", () => {
    expect(ROLES.length).toBe(6);
    for (const p of ["buyer.save", "buyer.share", "buyer.inspections", "agent.console", "admin.console", "audit.view"] as const) {
      expect(can("guest", p)).toBe(false);
    }
  });

  it("keeps consumer roles out of agent and admin pages", () => {
    for (const role of ["buyer", "guest"] satisfies Role[]) {
      expect(accessTo(role, "/agent").allowed).toBe(false);
      expect(accessTo(role, "/admin").allowed).toBe(false);
      expect(accessTo(role, "/agent/preview/abc").allowed).toBe(false);
    }
  });

  it("asks guests to sign in but refuses signed-in roles", () => {
    expect(accessTo("guest", "/shortlist")).toEqual({ allowed: false, reason: "sign_in", allowedRoles: ["buyer"] });
    expect(accessTo("agent", "/shortlist")).toEqual({ allowed: false, reason: "forbidden", allowedRoles: ["buyer"] });
    expect(accessTo("moderator", "/agent")).toMatchObject({ allowed: false, reason: "forbidden" });
    expect(accessTo("agency_admin", "/agent").allowed).toBe(true);
    expect(accessTo("moderator", "/admin").allowed).toBe(true);
  });

  it("leaves browsing public and does not match look-alike paths", () => {
    for (const role of ROLES) {
      expect(accessTo(role, "/search").allowed).toBe(true);
      expect(accessTo(role, "/listing/123").allowed).toBe(true);
      expect(accessTo(role, "/first-home").allowed).toBe(true);
    }
    expect(routePermission("/agents-directory")).toBeNull();
    expect(routePermission("/administer")).toBeNull();
  });

  it("only shows nav items the role can open", () => {
    for (const role of ROLES) {
      for (const item of navFor(role)) {
        const access = accessTo(role, item.href);
        // Guests see buyer tools so they can discover them; those pages ask them to sign in.
        expect(access.allowed || (role === "guest" && access.reason === "sign_in")).toBe(true);
      }
    }
    expect(navFor("agent").map((n) => n.href)).toEqual(["/search", "/hub", "/agent"]);
    expect(navFor("platform_admin").map((n) => n.href)).toEqual(["/search", "/hub", "/admin"]);
    expect(navFor("buyer").map((n) => n.href)).toContain("/account");
  });

  it("sends each role somewhere it is allowed", () => {
    for (const role of ROLES) expect(accessTo(role, homeFor(role).href).allowed).toBe(true);
  });

  it("only assigns agency-scoped roles to agency staff", () => {
    expect(assignableRoles(true)).toEqual(["agent", "agency_admin"]);
    expect(assignableRoles(false)).not.toContain("agent");
  });

  it("has a persona for every account role, agents drawn from the dataset", () => {
    for (const [role, p] of Object.entries(PERSONAS)) expect(p.role).toBe(role);
    expect(PERSONAS.agent.source).toBe("dataset");
    expect(PERSONAS.agency_admin.source).toBe("dataset");
    expect(PERSONAS.buyer.source).toBe("prototype_persona");
  });
});

describe("audit log (FR-ADM-002)", () => {
  const entry = {
    actorUserId: "u1",
    actorName: "Sample Platform Admin",
    actorRole: "platform_admin" as const,
    action: "user.role_change",
    entity: "user" as const,
    entityId: "u2",
    entityLabel: "Someone",
    before: "agent",
    after: "agency_admin",
    reason: "Promoted by the agency principal",
    outcome: "success" as const,
  };

  it("appends entries with ids and times and returns them newest first", () => {
    const store = createMockStore();
    appendAudit(store, entry, new Date("2026-10-28T00:00:00Z"));
    appendAudit(store, { ...entry, action: "listing.publish" }, new Date("2026-10-28T01:00:00Z"));
    const log = auditLog(store);
    expect(log.map((e) => e.id)).toEqual([2, 1]);
    expect(log[0]).toMatchObject({ action: "listing.publish", occurredAt: "2026-10-28T01:00:00.000Z" });
  });

  it("cannot be edited through what it returns", () => {
    const store = createMockStore();
    appendAudit(store, entry);
    const log = auditLog(store) as unknown as { reason: string }[];
    expect(() => {
      log[0]!.reason = "changed";
    }).toThrow();
    (log as unknown[]).length = 0;
    expect(auditLog(store)).toHaveLength(1);
  });

  it("requires a real reason", () => {
    expect(validateReason("   ").ok).toBe(false);
    expect(validateReason("too short").ok).toBe(false);
    expect(validateReason("  Licence confirmed by phone  ")).toEqual({ ok: true, value: "Licence confirmed by phone" });
    expect(validateReason("x".repeat(501)).ok).toBe(false);
  });

  it("requires an exception expiry after today and within a year", () => {
    expect(validateExpiry("2026-11-30", "2026-10-28").ok).toBe(true);
    expect(validateExpiry("2026-10-28", "2026-10-28").ok).toBe(false);
    expect(validateExpiry("2027-10-29", "2026-10-28").ok).toBe(false);
    expect(validateExpiry("30/11/2026", "2026-10-28").ok).toBe(false);
  });
});

describe("consent (V11 §12.5)", () => {
  it("falls back to defaults for missing, unknown or corrupt values", () => {
    expect(parseConsent(null).analytics).toEqual({ granted: CONSENT_DEFAULTS.analytics, updatedAt: null });
    expect(parseConsent("{not json").agent_sharing.granted).toBe(false);
    expect(parseConsent(JSON.stringify({ agent_sharing: { granted: "yes" } })).agent_sharing.granted).toBe(false);
  });

  it("keeps each purpose separate and defaults sharing and memory to off", () => {
    const state = parseConsent(JSON.stringify({ analytics: { granted: false, updatedAt: "2026-10-28T00:00:00Z" } }));
    expect(state.analytics).toEqual({ granted: false, updatedAt: "2026-10-28T00:00:00Z" });
    expect(state.concierge_memory.granted).toBe(false);
    expect(state.agent_sharing.granted).toBe(false);
  });
});
