"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verificationOf } from "@/lib/console";
import { AS_OF, agents, evaluatedListings } from "@/lib/data";
import { appendAudit, mockStore, validateExpiry, validateReason } from "@/lib/mock-store";
import { PERSONAS } from "@/lib/personas";
import { gatePasses, mayActOn } from "@/lib/publication";
import { ROLE_LABELS, assignableRoles, can, isRole, type AccountRole, type Permission } from "@/lib/roles";
import { ROLE_COOKIE, currentViewer, type Viewer } from "@/lib/session";

// Server actions for the prototype. Every privileged action checks the permission on the server,
// logs refusals, and writes an audit entry with actor, target, before/after and reason (FR-ADM-002).

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

/** PROTOTYPE ONLY: stands in for sign-in. See ADR 0011. */
export async function setPrototypeRole(role: string): Promise<ActionResult> {
  if (!isRole(role)) return { ok: false, error: "Unknown role." };
  (await cookies()).set(ROLE_COOKIE, role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
  return { ok: true, message: `Viewing as ${ROLE_LABELS[role]}.` };
}

function actorFields(viewer: Viewer) {
  return { actorUserId: viewer.persona?.userId ?? "guest", actorName: viewer.persona?.name ?? "Guest", actorRole: viewer.role };
}

/** Refuses and logs when the viewer lacks the permission (FR-ACC-002: 403 plus a logged attempt). */
function denied(viewer: Viewer, permission: Permission, entity: "listing" | "user" | "agent", entityId: string, entityLabel: string): ActionResult | null {
  if (can(viewer.role, permission)) return null;
  appendAudit(mockStore(), {
    ...actorFields(viewer),
    action: `access.denied:${permission}`,
    entity,
    entityId,
    entityLabel,
    before: null,
    after: null,
    reason: null,
    outcome: "denied",
  });
  return { ok: false, error: `Your role (${ROLE_LABELS[viewer.role]}) can't do this. The attempt was logged.` };
}

export async function setListingPublication(listingId: string, publish: boolean): Promise<ActionResult> {
  const viewer = await currentViewer();
  const found = evaluatedListings(verificationOf).find(({ raw }) => raw.id === listingId);
  const label = found ? `${found.raw.sourceListingId}` : listingId;
  const refusal = denied(viewer, "listing.publish", "listing", listingId, label);
  if (refusal) return refusal;
  if (!found) return { ok: false, error: "That listing no longer exists." };
  if (!mayActOn(viewer, found.raw)) {
    appendAudit(mockStore(), { ...actorFields(viewer), action: "access.denied:listing.scope", entity: "listing", entityId: listingId, entityLabel: label, before: null, after: null, reason: null, outcome: "denied" });
    return { ok: false, error: "You can only change listings you manage. The attempt was logged." };
  }
  // The gate is re-checked on the server: a disabled button is not a control (FR-CMP-002).
  if (publish && !gatePasses(found.result.outcome)) return { ok: false, error: "This listing fails a mandatory check, so it can't be published." };

  const store = mockStore();
  const before = store.publication.get(listingId) === false || !gatePasses(found.result.outcome) ? "unpublished" : "published";
  const after = publish ? "published" : "unpublished";
  if (before === after) return { ok: true, message: `Already ${after}.` };
  store.publication.set(listingId, publish);
  appendAudit(store, { ...actorFields(viewer), action: publish ? "listing.publish" : "listing.unpublish", entity: "listing", entityId: listingId, entityLabel: label, before, after, reason: null, outcome: "success" });
  revalidatePath("/", "layout");
  return { ok: true, message: publish ? "Published. Buyers can now find it." : "Unpublished. It no longer appears in search." };
}

export type FormState = { status: "idle" } | { status: "ok"; message: string } | { status: "error"; error: string };

export async function changeUserRole(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await currentViewer();
  const userId = String(form.get("userId") ?? "");
  const target = resolveUser(userId);
  const refusal = denied(viewer, "admin.roles.change", "user", userId, target?.name ?? userId);
  if (refusal && !refusal.ok) return { status: "error", error: refusal.error };
  if (!target) return { status: "error", error: "That user no longer exists." };

  const role = form.get("role");
  if (!isRole(role) || role === "guest" || !assignableRoles(target.hasAgency).includes(role)) {
    return { status: "error", error: target.hasAgency ? "Agency staff can only be an agent or an agency admin." : "Choose buyer, moderator or platform admin." };
  }
  const reason = validateReason(form.get("reason"));
  if (!reason.ok) return { status: "error", error: reason.error };
  if (userId === viewer.persona?.userId && role !== "platform_admin") {
    return { status: "error", error: "You can't remove your own platform admin role. Ask another platform admin." };
  }

  const store = mockStore();
  const before = store.roles.get(userId) ?? target.defaultRole;
  if (before === role) return { status: "error", error: `${target.name} is already ${ROLE_LABELS[role]}.` };
  store.roles.set(userId, role);
  appendAudit(store, { ...actorFields(viewer), action: "user.role_change", entity: "user", entityId: userId, entityLabel: target.name, before, after: role, reason: reason.value, outcome: "success" });
  revalidatePath("/admin");
  return { status: "ok", message: `${target.name} is now ${ROLE_LABELS[role]}.` };
}

function resolveUser(userId: string): { name: string; defaultRole: AccountRole; hasAgency: boolean } | null {
  const persona = Object.values(PERSONAS).find((p) => p.userId === userId && p.agentId === null);
  if (persona) return { name: persona.name, defaultRole: persona.role, hasAgency: false };
  const agent = agents().find((a) => a.id === userId);
  if (!agent) return null;
  return { name: agent.fullName, defaultRole: agent.id === PERSONAS.agency_admin.agentId ? "agency_admin" : "agent", hasAgency: true };
}

export async function decideVerification(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await currentViewer();
  const agentId = String(form.get("agentId") ?? "");
  const agent = agents().find((a) => a.id === agentId);
  const refusal = denied(viewer, "admin.verification.decide", "agent", agentId, agent?.fullName ?? agentId);
  if (refusal && !refusal.ok) return { status: "error", error: refusal.error };
  if (!agent) return { status: "error", error: "That agent no longer exists." };

  const decision = form.get("decision");
  if (decision !== "exception_approved" && decision !== "rejected") return { status: "error", error: "Choose approve or reject." };
  const reason = validateReason(form.get("reason"));
  if (!reason.ok) return { status: "error", error: reason.error };
  let expiresOn: string | null = null;
  if (decision === "exception_approved") {
    const expiry = validateExpiry(form.get("expiresOn"), AS_OF);
    if (!expiry.ok) return { status: "error", error: expiry.error };
    expiresOn = expiry.value;
  }

  const store = mockStore();
  const before = verificationOf(agentId);
  store.verification.set(agentId, { status: decision, reason: reason.value, expiresOn });
  appendAudit(store, {
    ...actorFields(viewer),
    action: decision === "exception_approved" ? "agent.exception_approve" : "agent.verification_reject",
    entity: "agent",
    entityId: agentId,
    entityLabel: agent.fullName,
    before,
    after: expiresOn ? `${decision} until ${expiresOn}` : decision,
    reason: reason.value,
    outcome: "success",
  });
  revalidatePath("/", "layout");
  return { status: "ok", message: decision === "exception_approved" ? `Exception approved for ${agent.fullName} until ${expiresOn}.` : `Verification rejected for ${agent.fullName}.` };
}
