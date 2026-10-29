# 0012. Social hub as a clickable preview on sample data, built in MVP-2

- **Status:** Proposed
- **Date:** 2026-10-29
- **Deciders:** Prasana (project lead, interim approver); then Product Owner (Andrew / Atif)
- **V11 references:** §4 (social foundations), §5.2, §12.1, §12.3 FR-SOC-001, FR-HUB-001, FR-QA-001, FR-AGT-004, FR-TRND-001, FR-LEAD-001, FR-PIN-001, §12.5, §12.7, §12.13 (MVP-2)

## Context

The client asked to see the social hub, front end only, so they can react to it before the build semester. V11 describes it in two places that disagree on priority:

- §4 puts "social foundations" in the MVP: profiles, the follow graph (suburbs, properties, professionals), activity feed and push notifications, Suburb Hub v1 seeded with platform-controlled content, and listing Q&A scoped to questions an agent can answer. Open commenting, the industry catalogue and specialist streams stay in phase two. §4 also lists pinboards among the MVP utilities.
- §12 is the delivery plan, and says it governs where it conflicts with §4. It makes FR-SOC-001, FR-HUB-001 and FR-QA-001 **P1** and sequences them in **MVP-2 (network foundations)**, after the P0 core and MVP-1 buyer utility. Pinboards (FR-PIN-001) are **P2** "where capacity permits" and are the first thing to defer.

The prototype already has the five V11 roles behind a mock "Viewing as" switcher and a real permission table (ADR 0011). It has no user content: the admin moderation queue says so.

## Decision

1. **Build a clickable preview now, on sample data only.** Screens: hub home with the buyer's activity feed, a Suburb Hub per pilot suburb, listing Q&A (ask on the listing page, answer and moderate on one questions screen), a buyer profile, a professional profile, and follows with notification preferences. Every screen carries a "Preview: planned for MVP-2 (P1)" banner and every seeded item says it is sample content.
2. **Priority stays as §12 sets it.** The preview does not move social work into P0 or MVP-1, and the backlog keeps E13 in MVP-2. Building screens early is design work, so stakeholders can test the idea cheaply, not a commitment to ship it sooner.
3. **No pinboards.** FR-PIN-001 is P2; the preview has no pin buttons or boards.
4. **Scope inside the hub follows §4's "carefully scoped" line:**
   - Suburb Hub v1 shows only approved, seeded platform content (market wraps, trending data, founding-creator posts), each with author and provenance. **No comments** (FR-HUB-001).
   - Q&A is **listing-specific** and agent-answerable (FR-QA-001, FR-AGT-004). The hub shows answered questions for listings in that suburb and links to the listing; there is no free-form suburb discussion.
   - Trending in the preview is a fixed sample, labelled as such. FR-TRND-001 (derived from events, abuse filtered) is not built.
5. **The trust and privacy rules in [docs/privacy/social-trust-rules.md](../privacy/social-trust-rules.md) apply now**, so the screens show the intended behaviour: private-by-default profiles, opt-in follows and notifications, reports to the Moderator, and the concierge never posting or answering as a person.
6. **Same permission model as ADR 0011.** New permissions (`social.follow`, `social.profile`, `qa.ask`, `qa.answer`, `content.report`) are added to `apps/web/lib/roles.ts` with unit tests. Server actions check them, check scope (an agent answers only on listings they manage), and write moderation decisions to the existing audit log.
7. **Prototype state lives in server memory** (`apps/web/lib/social-store.ts`), like the existing mock store, and resets on restart. The build semester replaces it with tables (profile, follow, question, answer, report, hub_post, notification_preference) and keeps the rules, checks and screens.

## Consequences

- The client can walk the whole social loop for buyer, agent and moderator before any MVP-2 build effort is spent, and can reject or reshape it cheaply.
- Risk: a polished preview can read as a promise and pull social work forward. Mitigation: the banner on every screen, this ADR, and the backlog staying unchanged. Any move of E13 out of MVP-2 needs a Product Owner decision (V11 §12.1).
- Risk: the preview implies features that need real moderation staffing (report handling within a service level). That cost belongs in the MVP-2 plan and the launch gate, not in the preview.
- The schema in migration 0001 has no social tables yet. They are designed with the MVP-2 build, guided by the rules doc, and need data-inventory rows before release (added as planned rows now).
- Push notifications are shown as a preference only; no service worker push is built.

## Alternatives considered

- **Static images or a slide walkthrough.** Cheaper, but the client asked for a clickable view, and static screens cannot show role differences (a buyer asks, the agent answers, the Moderator approves). Rejected.
- **Build the real social layer now (database, notifications).** Moves P1 MVP-2 work ahead of P0 and MVP-1, against §12.1 "defer P2 before P1 and P1 before P0". Rejected.
- **Include open suburb comments or a suburb Q&A thread, as a "suburb Q&A" screen might suggest.** §4 and FR-HUB-001 exclude open commenting in v1 because an empty or unmoderated comment section is worse than none. Rejected; suburb-level questions are answered by listing Q&A and seeded content.
- **Include pinboards because §4 lists them.** §12 overrides §4 and makes them P2. Rejected.

## Conflict with brief

None with §12, which governs. The preview follows §12's priority (P1, MVP-2) over §4, which lists pinboards and social foundations among MVP features. The request for a "suburb Q&A" screen is interpreted as listing Q&A shown on the Suburb Hub, because FR-HUB-001 rules out open commenting in v1.
