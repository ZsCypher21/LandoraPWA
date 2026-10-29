import type { AccountRole } from "./roles";

// Who you are when "Viewing as" a role. Agent and agency admin are agents from the synthetic dataset,
// so their console shows real dataset listings and rule-pack results. The synthetic dataset has no
// buyers or Landora staff, so those three are prototype personas: fictional, and labelled as such.

export interface Persona {
  /** Stable id used as the audit-log actor. Agents use their dataset id. */
  userId: string;
  role: AccountRole;
  name: string;
  email: string;
  /** Dataset agent this persona signs in as, for agent roles. */
  agentId: string | null;
  source: "dataset" | "prototype_persona";
}

export const PERSONAS: Record<AccountRole, Persona> = {
  buyer: {
    userId: "persona-buyer",
    role: "buyer",
    name: "Sample Buyer",
    email: "sample.buyer@example.test",
    agentId: null,
    source: "prototype_persona",
  },
  // Casey Mockley, Synthetic Coast Realty: verified, with listings that pass and listings blocked on Form 2.
  agent: {
    userId: "b6f9f069-0244-4e7e-a531-aa7c46098d90",
    role: "agent",
    name: "Casey Mockley",
    email: "casey.mockley@synthetic-coast-realty.example",
    agentId: "b6f9f069-0244-4e7e-a531-aa7c46098d90",
    source: "dataset",
  },
  // Riley Placeholder, same agency, which also has an agent awaiting licence verification.
  agency_admin: {
    userId: "55b611a5-0f1f-4711-ba51-4053eb70e4a3",
    role: "agency_admin",
    name: "Riley Placeholder",
    email: "riley.placeholder@synthetic-coast-realty.example",
    agentId: "55b611a5-0f1f-4711-ba51-4053eb70e4a3",
    source: "dataset",
  },
  moderator: {
    userId: "persona-moderator",
    role: "moderator",
    name: "Sample Moderator",
    email: "sample.moderator@example.test",
    agentId: null,
    source: "prototype_persona",
  },
  platform_admin: {
    userId: "persona-platform-admin",
    role: "platform_admin",
    name: "Sample Platform Admin",
    email: "sample.admin@example.test",
    agentId: null,
    source: "prototype_persona",
  },
};
