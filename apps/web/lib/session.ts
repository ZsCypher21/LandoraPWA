import "server-only";
import { cookies } from "next/headers";
import { agents } from "./data";
import { PERSONAS, type Persona } from "./personas";
import { isRole, type Role } from "./roles";
import type { Actor } from "./publication";

// PROTOTYPE ONLY (ADR 0011). The "Viewing as" menu stores the chosen role in a cookie with no secret,
// so anyone can pick any role. This stands in for real sign-in (FR-ACC-001) so the five roles can be
// reviewed. Pages and actions still check permissions on the server, exactly where real sessions will.

export const ROLE_COOKIE = "landora_prototype_role";

export async function currentRole(): Promise<Role> {
  const value = (await cookies()).get(ROLE_COOKIE)?.value;
  return isRole(value) ? value : "guest";
}

export interface Viewer extends Actor {
  persona: Persona | null;
}

export function viewerFor(role: Role): Viewer {
  const persona = role === "guest" ? null : PERSONAS[role];
  const agencyId = persona?.agentId ? (agents().find((a) => a.id === persona.agentId)?.agencyId ?? null) : null;
  return { role, persona, agentId: persona?.agentId ?? null, agencyId };
}

export async function currentViewer(): Promise<Viewer> {
  return viewerFor(await currentRole());
}
