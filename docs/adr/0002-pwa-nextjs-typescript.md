# 0002. PWA on Next.js, React and TypeScript

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Prasana (interim approver)
- **V11 references:** §3, §6 "Lock now", NFR-SEO-001, NFR-BRW-001

## Context

Landora ships as one installable, offline-capable, push-enabled progressive web app. Public listing and suburb pages must be indexable (organic search is a core acquisition channel). V11 asks for "deliberately boring tech students know".

## Decision

- **Framework:** Next.js (App Router) with React and TypeScript in `strict` mode.
- **Rendering:** server-side rendering or static regeneration for public listing, suburb and hub pages; client components only where interaction needs them.
- **UI:** Tailwind CSS with shadcn/ui components (copied into the repo, so no runtime UI vendor dependency). WCAG 2.2 AA is the accessibility target.
- **PWA:** web app manifest, a service worker for the app shell and offline access to saved shortlists and inspection timelines, and Web Push (VAPID) for notifications. Offline writes (such as inspection notes) are queued and synced.
- **Validation:** zod schemas shared from `packages/schema` at every API boundary.
- **Single deployable:** the consumer PWA, agent console and admin console are route groups in one Next.js app (`apps/web`), separated by RBAC and route-level guards, not by separate apps.

## Consequences

- One codebase and one deploy for all surfaces, which suits a small team.
- SEO needs are met without a separate rendering service.
- iOS web push only works for installed PWAs (iOS 16.4+), so push cannot be the only notification channel; email stays as a fallback.
- Agent and admin surfaces share a deploy with the consumer app, so route guards and server-side permission checks are mandatory (see FR-ACC-002).

## Alternatives considered

- **Separate apps per surface:** cleaner isolation, but triples the deployment and auth work for a one-semester MVP. Revisit if the admin console needs separate network controls.
- **React Native / native apps:** app-store gatekeeping and no URL-shareability, which V11 explicitly rejects.
- **Remix / SvelteKit / Nuxt:** capable, but Next.js is what V11 names and what students most likely know.

## Conflict with brief

None.
