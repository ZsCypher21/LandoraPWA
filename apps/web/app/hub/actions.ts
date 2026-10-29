"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions";
import { agents, listingById, suburbs } from "@/lib/data";
import { appendAudit, mockStore, validateReason, type AuditEntry } from "@/lib/mock-store";
import { mayActOn } from "@/lib/publication";
import { ROLE_LABELS, can, type Permission } from "@/lib/roles";
import { currentViewer, type Viewer } from "@/lib/session";
import {
  answerQuestion,
  askQuestion,
  decideQuestion,
  decideReport,
  defaultPrefs,
  fileReport,
  isChannel,
  isFollowKind,
  isReportReason,
  isTopic,
  profileOf,
  setFollow,
  validateAnswer,
  validateQuestion,
  type ReportTarget,
} from "@/lib/social";
import { publishedScopes, socialStore } from "@/lib/social-store";

// Server actions for the social preview (ADR 0012). Each checks the permission on the server, as the
// ADR 0011 actions do; refusals and moderation decisions go to the shared audit log (FR-ADM-002).

export type SocialResult = { ok: true; message: string; id?: string } | { ok: false; error: string };

function actor(viewer: Viewer): Pick<AuditEntry, "actorUserId" | "actorName" | "actorRole"> {
  return { actorUserId: viewer.persona?.userId ?? "guest", actorName: viewer.persona?.name ?? "Guest", actorRole: viewer.role };
}

function refuse(viewer: Viewer, permission: Permission, entity: AuditEntry["entity"], entityId: string): string | null {
  if (can(viewer.role, permission) && viewer.persona) return null;
  appendAudit(mockStore(), { ...actor(viewer), action: `access.denied:${permission}`, entity, entityId, entityLabel: entityId, before: null, after: null, reason: null, outcome: "denied" });
  return viewer.role === "guest" ? "Sign in first." : `Your role (${ROLE_LABELS[viewer.role]}) can't do this. The attempt was logged.`;
}

function targetExists(kind: string, id: string): boolean {
  if (kind === "suburb") return suburbs().some((s) => s.id === id);
  if (kind === "listing") return listingById(id) !== null;
  return agents().some((a) => a.id === id);
}

export async function setFollowAction(kind: string, targetId: string, follow: boolean): Promise<SocialResult> {
  const viewer = await currentViewer();
  const refusal = refuse(viewer, "social.follow", kind === "listing" ? "listing" : kind === "agent" ? "agent" : "route", targetId);
  if (refusal) return { ok: false, error: refusal };
  if (!isFollowKind(kind) || !targetExists(kind, targetId)) return { ok: false, error: "That no longer exists." };
  setFollow(socialStore(), viewer.persona!.userId, kind, targetId, follow);
  revalidatePath("/", "layout");
  return { ok: true, message: follow ? "Following. Updates appear in your hub feed." : "Unfollowed." };
}

export async function setProfileAction(field: "visibility" | "showFollowedSuburbs", value: string | boolean): Promise<SocialResult> {
  const viewer = await currentViewer();
  const refusal = refuse(viewer, "social.profile", "user", viewer.persona?.userId ?? "guest");
  if (refusal) return { ok: false, error: refusal };
  const store = socialStore();
  const { userId, name } = viewer.persona!;
  const profile = { ...profileOf(store, userId, name) };
  if (field === "visibility") {
    if (value !== "private" && value !== "public") return { ok: false, error: "Choose private or public." };
    profile.visibility = value;
  } else {
    if (typeof value !== "boolean") return { ok: false, error: "Invalid choice." };
    profile.showFollowedSuburbs = value;
  }
  store.profiles.set(userId, profile);
  revalidatePath("/hub", "layout");
  return { ok: true, message: "Saved." };
}

export async function setPrefAction(topic: string, channel: string, on: boolean): Promise<SocialResult> {
  const viewer = await currentViewer();
  const refusal = refuse(viewer, "social.follow", "user", viewer.persona?.userId ?? "guest");
  if (refusal) return { ok: false, error: refusal };
  if (!isTopic(topic) || !isChannel(channel)) return { ok: false, error: "Unknown setting." };
  const store = socialStore();
  const userId = viewer.persona!.userId;
  const prefs = structuredClone(store.prefs.get(userId) ?? defaultPrefs());
  prefs[topic][channel] = on;
  store.prefs.set(userId, prefs);
  revalidatePath("/hub/following");
  return { ok: true, message: "Saved." };
}

export async function askQuestionAction(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await currentViewer();
  const listingId = String(form.get("listingId") ?? "");
  const refusal = refuse(viewer, "qa.ask", "listing", listingId);
  if (refusal) return { status: "error", error: refusal };
  if (!listingById(listingId)) return { status: "error", error: "This listing is no longer available." };
  const text = validateQuestion(form.get("question"));
  if (!text.ok) return { status: "error", error: text.error };
  askQuestion(socialStore(), { id: randomUUID(), listingId, askerUserId: viewer.persona!.userId, text: text.value });
  revalidatePath(`/listing/${listingId}`);
  revalidatePath("/hub", "layout");
  revalidatePath("/admin");
  return { status: "ok", message: "Sent. A moderator checks it first, then the agent can answer. You'll see it under Questions in the hub." };
}

export async function answerQuestionAction(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await currentViewer();
  const questionId = String(form.get("questionId") ?? "");
  const refusal = refuse(viewer, "qa.answer", "question", questionId);
  if (refusal) return { status: "error", error: refusal };
  const store = socialStore();
  const q = store.questions.find((x) => x.id === questionId);
  const scope = q ? publishedScopes().find((r) => r.id === q.listingId) : undefined;
  if (!q || !scope) return { status: "error", error: "That question is no longer open." };
  // SOC-M4: only an agent who manages the listing (or their agency admin) answers.
  if (!mayActOn(viewer, scope)) {
    appendAudit(mockStore(), { ...actor(viewer), action: "access.denied:qa.answer.scope", entity: "question", entityId: q.id, entityLabel: scope.sourceListingId, before: null, after: null, reason: null, outcome: "denied" });
    return { status: "error", error: "You can only answer questions on listings you manage. The attempt was logged." };
  }
  const text = validateAnswer(form.get("answer"));
  if (!text.ok) return { status: "error", error: text.error };
  const updated = answerQuestion(store, q.id, { agentId: viewer.agentId!, agentName: viewer.persona!.name }, text.value);
  if (!updated) return { status: "error", error: "That question is no longer open." };
  revalidatePath("/", "layout");
  return { status: "ok", message: "Answer published, labelled as from you." };
}

export async function reportAction(target: string, targetId: string, reason: string): Promise<SocialResult> {
  const viewer = await currentViewer();
  const refusal = refuse(viewer, "content.report", target === "post" ? "post" : "question", targetId);
  if (refusal) return { ok: false, error: refusal };
  if ((target !== "question" && target !== "answer" && target !== "post") || !isReportReason(reason)) return { ok: false, error: "Choose a reason." };
  const report = fileReport(socialStore(), { id: randomUUID(), target: target as ReportTarget, targetId, reason, reporterUserId: viewer.persona!.userId });
  if (!report) return { ok: false, error: "That content is already under review or has been removed." };
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: target === "post" ? "Reported. A moderator will review it." : "Reported and hidden while a moderator reviews it.",
  };
}

export async function moderateQuestionAction(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await currentViewer();
  const questionId = String(form.get("questionId") ?? "");
  const refusal = refuse(viewer, "moderation.decide", "question", questionId);
  if (refusal) return { status: "error", error: refusal };
  const approve = form.get("decision") === "approve";
  const reason = approve ? { ok: true as const, value: "Meets the Q&A guidelines." } : validateReason(form.get("reason"));
  if (!reason.ok) return { status: "error", error: reason.error };
  const q = decideQuestion(socialStore(), questionId, approve);
  if (!q) return { status: "error", error: "Someone already decided this question." };
  appendAudit(mockStore(), { ...actor(viewer), action: approve ? "qa.question.approve" : "qa.question.reject", entity: "question", entityId: q.id, entityLabel: `Question on ${listingById(q.listingId)?.sourceListingId ?? q.listingId}`, before: "pending", after: q.status, reason: reason.value, outcome: "success" });
  revalidatePath("/", "layout");
  return { status: "ok", message: approve ? "Approved. The agent can now answer it." : "Rejected. It stays hidden." };
}

export async function decideReportAction(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await currentViewer();
  const reportId = String(form.get("reportId") ?? "");
  const refusal = refuse(viewer, "moderation.decide", "question", reportId);
  if (refusal) return { status: "error", error: refusal };
  const uphold = form.get("decision") === "remove";
  const reason = validateReason(form.get("reason"));
  if (!reason.ok) return { status: "error", error: reason.error };
  const report = decideReport(socialStore(), reportId, uphold);
  if (!report) return { status: "error", error: "Someone already decided this report." };
  appendAudit(mockStore(), { ...actor(viewer), action: uphold ? `moderation.${report.target}.remove` : `moderation.${report.target}.restore`, entity: report.target, entityId: report.targetId, entityLabel: `Reported ${report.target}`, before: "reported", after: uphold ? "removed" : "restored", reason: reason.value, outcome: "success" });
  revalidatePath("/", "layout");
  return { status: "ok", message: uphold ? "Removed. The report is closed." : "Restored. The report is closed." };
}
