# 0011. Mock role switcher in the prototype, real authentication later

- **Status:** Accepted by the project lead on 2026-10-28; awaiting Product Owner approval
- **Date:** 2026-10-28
- **Deciders:** Prasana (project lead, interim approver); then Product Owner (Andrew / Atif)
- **V11 references:** FR-ACC-001 (P0), FR-ACC-002 (P0), FR-AGT-001..003 (P0), FR-ADM-001/002 (P0), §12.5

## Context

V11 needs five roles with explicit role-based access control: buyer, agent, agency admin, moderator and platform admin (FR-ACC-002, §12.5). The design-semester exit (§14.3) needs a clickable prototype that the Product Owner can walk through for every role, including the agent console (J3) and the admin console (J4).

Real sign-in (FR-ACC-001: registration with an emailed code, recovery, throttling, merging device saves) depends on an identity provider, which is still an open ADR candidate. Choosing one now would pull build-semester work, cost and vendor decisions into the design semester only to demonstrate screens.

## Decision

1. **Prototype only:** a "Viewing as" menu in the header picks Guest, Buyer, Agent, Agency admin, Moderator or Platform admin. The choice is stored in an HttpOnly, SameSite=Lax cookie (`landora_prototype_role`) on the device. It is labelled "Prototype" in the UI and carries no secret: anyone can choose any role.
2. **The permission model is real.** One table in `apps/web/lib/roles.ts` maps each permission to the roles that hold it (least privilege; unlisted means denied). Pages check it on the server before rendering, and every server action checks it again, logs refused attempts, and checks scope (an agent acts only on their own listings, an agency admin only on their agency's). Buttons that are disabled in the UI are not relied on as controls.
3. Each role signs in as a fixed persona. Agent and agency admin are agents from the synthetic dataset. Buyer, moderator and platform admin are fictional prototype personas, because the dataset has no buyers or staff.
4. Privileged prototype actions (publish, unpublish, role change, verification decision) and the audit log live in server memory (`apps/web/lib/mock-store.ts`). They reset when the server restarts.
5. In the build semester, only the session source changes: `currentRole()` and `currentViewer()` in `apps/web/lib/session.ts` read an authenticated session instead of the cookie, the mock store is replaced by the `user_role`, listing and `audit_log` tables from migration 0001, and the role table, page guards and action checks stay as they are.

## Consequences

- The PO can review all five roles today, and FR-ACC-002's permission rules are built and unit-tested now rather than retrofitted.
- **Security:** the switcher is an open door by design. It must never reach a public or production deployment. This is added to the launch-gate security checklist. Until then the prototype must hold only synthetic data, which it already does (V11 §14.4).
- FR-ACC-001 is not met by the prototype; it stays a P0 build item, together with MFA for admin roles (NFR-SEC-003) and audit export and retention (FR-ADM-002).
- Prototype decisions are shared by everyone using the same server and are lost on restart, which is acceptable for walkthroughs only.
- Guests are asked to sign in before saving or planning inspections. This follows FR-SAVE-001 ("authenticated buyers") and supersedes the softer "device saves without an account" reading recorded in journeys.md gap 2. Sharing a public listing link stays open to guests (decided with acceptance, 2026-10-28), because it costs nothing and brings in new buyers; sharing a collection still needs an account (FR-SHARE-001).

## Alternatives considered

- **Real authentication now (managed identity provider or Auth.js with email codes).** It is the end state, but it needs the identity-provider ADR, email delivery, account storage and recovery flows. That is build-semester scope for a design-semester demo, so it is rejected for now.
- **Role in localStorage, checked only in the browser.** Simpler, but the server could not enforce anything, and the prototype would teach the wrong pattern. Rejected.
- **Separate demo builds per role.** No switching cost during a walkthrough is worth five builds. Rejected.

## Conflict with brief

None in substance: V11 does not prescribe how the design-semester prototype simulates sign-in. The prototype deliberately does not satisfy FR-ACC-001, and says so in the UI and the backlog.
