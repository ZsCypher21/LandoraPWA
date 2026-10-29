# Landora MVP backlog

Version 0.1.0 (Draft for Product Owner review), as of 2026-10-28. Source: V11 §12.3 requirements, §12.13 sequencing, §12.15 acceptance examples.

Generated from [backlog.json](backlog.json) by `node scripts/build-backlog.mjs`. Edit the JSON, not this file. [backlog.csv](backlog.csv) imports into Jira, Linear or GitHub Projects.

**37 stories** covering every V11 §12.3 requirement: 22 P0, 14 P1, 1 P2. Each meets the §12.11 Definition of Done before acceptance.

**Conflict to confirm with the PO:** V11 §12.3 marks FR-AI-001/002/003 as P0, but §12.13 places the AI concierge in MVP-1. This backlog keeps them P0 (the guardrails must hold wherever AI is used, including AI search in MVP-0) and schedules the concierge itself in MVP-1.

| Epic | Release | Workstream | Stories |
| --- | --- | --- | --- |
| E01 Identity and roles | MVP-0 | WS4 Core Platform/API | FR-ACC-001 (P0), FR-ACC-002 (P0) |
| E02 Search | MVP-0 | WS2 Consumer PWA / WS6 AI Concierge | FR-SRCH-001 (P0), FR-SRCH-002 (P0), FR-SRCH-003 (P0) |
| E03 Listing detail | MVP-0 | WS2 Consumer PWA / WS5 Data | FR-LST-001 (P0), FR-LST-002 (P0), FR-LST-003 (P0) |
| E04 Save, share and collections | MVP-1 | WS2 Consumer PWA | FR-SAVE-001 (P1), FR-SHARE-001 (P1) |
| E05 Inspection timeline | MVP-1 | WS2 Consumer PWA | FR-INSP-001 (P1), FR-INSP-002 (P1), FR-INSP-003 (P1) |
| E06 AI concierge and orchestration | MVP-1 | WS6 AI Concierge | FR-AI-001 (P0), FR-AI-002 (P0), FR-AI-003 (P0), FR-AI-004 (P1) |
| E07 First home buyer guidance | MVP-1 | WS7 Rules & Compliance | FR-FHB-001 (P1), FR-FHB-002 (P1) |
| E08 Agent onboarding and console | MVP-0 | WS3 Agent Portal | FR-AGT-001 (P0), FR-AGT-002 (P0), FR-AGT-003 (P0), FR-AGT-004 (P1) |
| E09 Listing feed ingestion | MVP-0 | WS5 Property & Listing Data | FR-FEED-001 (P0), FR-FEED-002 (P0) |
| E10 Publication compliance | MVP-0 | WS7 Rules & Compliance | FR-CMP-001 (P0), FR-CMP-002 (P0), FR-CMP-003 (P0) |
| E11 Admin and moderation | MVP-0 | WS9 Admin & Moderation | FR-ADM-001 (P0), FR-ADM-002 (P0) |
| E12 Analytics | MVP-0 | WS10 Analytics | FR-ANL-001 (P0) |
| E13 Network foundations | MVP-2 | WS8 Social Foundations | FR-QA-001 (P1), FR-SOC-001 (P1), FR-HUB-001 (P1), FR-TRND-001 (P1), FR-LEAD-001 (P1), FR-PIN-001 (P2) |

## E01 Identity and roles

MVP-0 · WS4 Core Platform/API

### FR-ACC-001 · P0

As a buyer or agent, I can create an account, sign in and out, and recover access so my data persists across devices.

Acceptance criteria:

- [ ] Given a new email, when I register and enter the emailed code within 15 minutes, then my account is created and I am signed in.
- [ ] Given I forgot my password or lost my device, when I request recovery, then I receive a single-use link that expires in 30 minutes and does not reveal whether the email exists.
- [ ] Given 5 failed sign-ins in 15 minutes, then further attempts are throttled and the event is logged.
- [ ] Given I saved homes on this device before signing in, when I sign in, then they merge into my account without duplicates.

Design-semester status: Prototype stand-in only: a "Viewing as" role switcher (ADR 0011). Guests are asked to sign in before saving, sharing or planning inspections. No real accounts, recovery or throttling yet.

### FR-ACC-002 · P0

As the platform, I enforce role-based permissions for buyer, agent, agency admin, moderator and platform admin.

Acceptance criteria:

- [ ] Every API route declares the roles allowed; a route without a declaration fails CI.
- [ ] A buyer token calling any agent or admin endpoint receives 403 and the attempt is logged.
- [ ] An agent can only act on listings belonging to their verified agency.
- [ ] Role changes are made only by a platform admin, require a reason and are audit-logged (FR-ADM-002).

Design-semester status: Prototype: role table in apps/web/lib/roles.ts enforced on pages and server actions; agent scope checks; refused actions logged; role change needs platform admin and reason. Tests in lib/roles.test.ts.

## E02 Search

MVP-0 · WS2 Consumer PWA / WS6 AI Concierge

### FR-SRCH-001 · P0

As a buyer, I can search pilot listings with natural language or structured filters.

Acceptance criteria:

- [ ] Given any combination of suburb, type, price, bedrooms, bathrooms, parking, land size, features and open-home day, results satisfy every mandatory constraint (verified by property-based tests).
- [ ] Results are paginated, sortable by relevance, price and newest, and the URL captures the full query so it can be shared and reloaded.
- [ ] p95 search response under the target set in NFR-PERF-001 at the pilot load in docs/data/pilot-sizing.md.

Design-semester status: Prototype: rule-based NL parser and filters on synthetic data.

### FR-SRCH-002 · P0

As a buyer, I see how my words were interpreted as editable criteria before I trust the results.

Acceptance criteria:

- [ ] Every criterion applied appears as a chip and in the editable Criteria panel.
- [ ] Every assumption (e.g. '3 bed' read as 'at least 3') is listed in plain words.
- [ ] Requests the platform cannot judge (investment quality, school quality, safety) are named as unsupported and never converted into hidden filters.
- [ ] Editing any criterion re-runs the search without re-interpreting the original text.

Design-semester status: Prototype.

### FR-SRCH-003 · P0

As a buyer, I get honest help when there are zero results, ambiguity, missing data or a service failure.

Acceptance criteria:

- [ ] Zero results shows a clear empty state with up to 3 single-change refinements, each showing how many homes it would return.
- [ ] Ambiguous input (e.g. 'under 900') asks one clarifying question and shows the assumption used meanwhile.
- [ ] Listings with hidden prices are excluded from price-filtered results and the count excluded is stated.
- [ ] If the AI provider fails or times out (threshold in ADR 0006), search falls back to structured filters with a visible notice and a concierge_failure event.

Design-semester status: Prototype covers zero results, ambiguity and hidden prices; AI fallback not yet applicable.

## E03 Listing detail

MVP-0 · WS2 Consumer PWA / WS5 Data

### FR-LST-001 · P0

As a buyer, I see current listing data, media, agent/agency, inspections and status from the canonical model.

Acceptance criteria:

- [ ] Every field shown maps to a canonical schema field and shows its source and last-updated time.
- [ ] Withdrawn, sold or unpublished listings return a clear 'no longer available' page (HTTP 404/410), never stale data.
- [ ] Listing pages are server-rendered with canonical URL, metadata and structured data (NFR-SEO-001).

Design-semester status: Prototype (synthetic).

### FR-LST-002 · P0

As a buyer, I see licensed enrichment (sales history, estimates, suburb stats) with attribution.

Acceptance criteria:

- [ ] Enrichment is visually separated from agent-supplied data and names its provider and effective date.
- [ ] Until a data licence exists, placeholder figures carry a 'Placeholder, not an estimate' label and cannot be shown in production (feature flag).
- [ ] Enrichment never overwrites current listing fields; conflicts are flagged (V11 §12.7).

Design-semester status: Prototype with labelled placeholders.

### FR-LST-003 · P0

As a buyer, I see the listing's compliance-readiness status.

Acceptance criteria:

- [ ] The disclosure panel lists each rule outcome from the active pack with its version.
- [ ] Wording confirms readiness of documents, never their content, and states it is not legal advice.

Design-semester status: Prototype.

## E04 Save, share and collections

MVP-1 · WS2 Consumer PWA

### FR-SAVE-001 · P1

As a signed-in buyer, I can save listings and organise them into collections.

Acceptance criteria:

- [ ] Save/unsave is one tap from results and detail, optimistic, and rolls back with a message on failure.
- [ ] I can create, rename and delete collections and move listings between them.
- [ ] A saved listing that is withdrawn stays in the collection marked 'no longer available'.

Design-semester status: Prototype: single shortlist on device.

### FR-SHARE-001 · P1

As a buyer, I can share a stable link and invite collaborators to a collection.

Acceptance criteria:

- [ ] Sharing a listing uses the native share sheet, falling back to copy-link.
- [ ] Collection invites grant view or edit access, can be revoked, and expire after 14 days if unaccepted.
- [ ] A revoked or unauthorised user opening a collection link sees an access message, not the contents.

Design-semester status: Prototype: listing share only.

## E05 Inspection timeline

MVP-1 · WS2 Consumer PWA

### FR-INSP-001 · P1

As a buyer, I can add published open-home times to my inspection timeline.

Acceptance criteria:

- [ ] Only inspection windows from the listing feed can be added; changes in the feed update the timeline and notify me.
- [ ] Listings with no upcoming opens show an 'arrange a private inspection' prompt.

Design-semester status: Prototype.

### FR-INSP-002 · P1

As a buyer, I get a feasible sequence with travel buffers and clear conflict warnings.

Acceptance criteria:

- [ ] Given saved listings with valid windows, the plan orders visits to fit the most homes with the least driving, including parking and visit time.
- [ ] Homes that cannot fit are listed separately with the reason (window closes before arrival, overlap).
- [ ] Drive times state how they were estimated.

Design-semester status: Prototype (straight-line estimate).

### FR-INSP-003 · P1

As a buyer, I can reorder visits and record notes and ratings after each inspection.

Acceptance criteria:

- [ ] Manual reordering recalculates times and conflicts immediately; I can return to the suggested order.
- [ ] Notes (up to 2,000 characters) and a 1–5 rating save per listing and are private to me unless shared.

Design-semester status: Prototype.

## E06 AI concierge and orchestration

MVP-1 · WS6 AI Concierge

### FR-AI-001 · P0

As a buyer, concierge answers use approved sources and cite material facts.

Acceptance criteria:

- [ ] Every material factual claim in an answer links to a canonical field, rule result or approved document.
- [ ] Benchmark citation correctness meets the threshold approved by PO and AI Lead (docs/ai/benchmark.md).

Design-semester status: None.

### FR-AI-002 · P0

As a buyer, the concierge never invents attributes, prices, zoning, eligibility or guaranteed outcomes.

Acceptance criteria:

- [ ] When data is missing the answer says so and offers to ask the agent.
- [ ] Adversarial benchmark cases (docs/ai/benchmark-cases.json, category 'adversarial') pass at 100%.
- [ ] Answers never contain personalised financial advice, return predictions or legal conclusions.

Design-semester status: Prototype parser names unsupported asks.

### FR-AI-003 · P0

As the platform, AI calls go through a router with model routing, limits, caching and cost circuit-breakers.

Acceptance criteria:

- [ ] Model, prompt version and cost are logged per call.
- [ ] Per-user and global daily spend limits are configurable; when hit, the concierge degrades to structured search.
- [ ] Swapping the primary model is a configuration change validated by re-running the benchmark.

Design-semester status: ADR 0006 only.

### FR-AI-004 · P1

With consent, the concierge remembers approved preferences across sessions.

Acceptance criteria:

- [ ] Memory is off until I opt in, and I can view and delete what is remembered.
- [ ] Remembered items are limited to the approved list in the data inventory.

Design-semester status: None.

## E07 First home buyer guidance

MVP-1 · WS7 Rules & Compliance

### FR-FHB-001 · P1

As a first home buyer, eligibility is decided by deterministic rules before any AI explanation.

Acceptance criteria:

- [ ] Results come only from the active versioned rule pack; the LLM may rephrase but not change an outcome.
- [ ] Unknown answers produce 'need more information', never a guess.
- [ ] Answers are not stored unless I opt in to saving them (V11 §12.5).

Design-semester status: Prototype.

### FR-FHB-002 · P1

As a first home buyer, each result shows its source, version, effective date and assumptions.

Acceptance criteria:

- [ ] Each scheme result names the official source and the date it was checked.
- [ ] The rules version, status (draft/active) and effective date appear with the results.

Design-semester status: Prototype.

## E08 Agent onboarding and console

MVP-0 · WS3 Agent Portal

### FR-AGT-001 · P0

As the platform, listing rights require licence verification or an approved exception.

Acceptance criteria:

- [ ] An unverified agent cannot publish; the Publish control is disabled with the reason.
- [ ] An exception requires a platform admin, a reason and an expiry date, and is audit-logged.
- [ ] A licence that lapses unpublishes affected listings within 24 hours.

Design-semester status: Rule QLD-AGT-001 in pack. Prototype: Publish disabled with reason; platform admin approves an exception with reason and expiry (audit-logged).

### FR-AGT-002 · P0

As an agent, my console shows onboarding, feed status, listings, exceptions and publication status.

Acceptance criteria:

- [ ] Feed status shows last run, records received/rejected and the reason per rejection.
- [ ] Exceptions are grouped blocking, incomplete and warning, each with a fix action.

Design-semester status: Prototype /agent: licence status, feed runs with rejection reasons, listings grouped by gate result with the rule pack's fix text.

### FR-AGT-003 · P0

As an authorised agent, I can preview, resolve exceptions, publish, unpublish and update supported states.

Acceptance criteria:

- [ ] Preview renders exactly the buyer view.
- [ ] Corrected data re-runs the publication gate and publishes automatically when all mandatory checks pass.
- [ ] Unpublish takes effect in search within 60 seconds.

Design-semester status: Prototype: buyer-view preview, publish/unpublish (gate re-checked on the server; unpublish removes it from search). Auto-republish on corrected data not built.

### FR-AGT-004 · P1

As an agent, I can answer listing Q&A and receive buyer details only after consent.

Acceptance criteria:

- [ ] Buyer identity is hidden in Q&A unless the buyer chose to share it.
- [ ] A lead appears only with a recorded consent (who, what, when, purpose).

Design-semester status: None.

## E09 Listing feed ingestion

MVP-0 · WS5 Property & Listing Data

### FR-FEED-001 · P0

As the platform, I ingest REAXML and map it to the canonical model.

Acceptance criteria:

- [ ] All fields in docs/data/reaxml-mapping.md map with tests; unmapped elements are logged, not dropped silently.
- [ ] Times are converted with the listing's state time zone.

Design-semester status: Adapter with 12 tests on sample feeds.

### FR-FEED-002 · P0

As an operator, ingestion validates, updates idempotently, logs errors and can reprocess.

Acceptance criteria:

- [ ] Replaying the same (agency, uniqueID, modTime) changes nothing.
- [ ] Invalid records are rejected with a line-level reason and do not block valid records in the same file.
- [ ] An admin can reprocess a failed file; the result is audit-logged.

Design-semester status: Adapter idempotency and rejection reasons tested.

## E10 Publication compliance

MVP-0 · WS7 Rules & Compliance

### FR-CMP-001 · P0

As the platform, a configurable jurisdiction rules engine evaluates mandatory publication requirements.

Acceptance criteria:

- [ ] Rules live in versioned JSON packs, not code; a new pack version needs no deployment.
- [ ] Missing facts evaluate to unknown, never pass.

Design-semester status: Engine + QLD pack v0.1.0 (draft).

### FR-CMP-002 · P0

As the platform, I block publication when mandatory rules fail and give an actionable reason.

Acceptance criteria:

- [ ] A listing failing any blocking rule is never visible to buyers.
- [ ] Each failure names the rule, what is missing and how to fix it.

Design-semester status: Prototype gate (QLD Form 2 decision 2026-10-28).

### FR-CMP-003 · P0

As a compliance owner, rule-pack changes are versioned, audited and regression-tested.

Acceptance criteria:

- [ ] Every pack has fixtures; CI fails if any fixture outcome changes without a version bump.
- [ ] Activating a pack requires a second approver and records who, when and why.

Design-semester status: Fixtures + tests; activation workflow not built.

## E11 Admin and moderation

MVP-0 · WS9 Admin & Moderation

### FR-ADM-001 · P0

As a platform admin, I manage users, agents, agencies, listings, verification exceptions, feed failures and moderation.

Acceptance criteria:

- [ ] Each queue shows count, oldest item age and SLA breach.
- [ ] Admin access requires MFA (NFR-SEC-003).

Design-semester status: Prototype /admin: queues with counts, users and roles, agencies, verification exceptions, feed failures, moderation queue (empty: Q&A is P1). No MFA or SLA targets yet.

### FR-ADM-002 · P0

As an auditor, privileged actions affecting publication, compliance, identity or moderation are auditable.

Acceptance criteria:

- [ ] Audit records are append-only with actor, action, target, before/after, reason and time.
- [ ] Audit records are retained for 7 years (to confirm in PIA) and exportable.

Design-semester status: audit_log table in migration 0001. Prototype: read-only in-memory audit log of publish, role and verification actions and refused attempts. No export or retention yet.

## E12 Analytics

MVP-0 · WS10 Analytics

### FR-ANL-001 · P0

As the PO, I can see weekly active buyers per pilot suburb and inspection-timeline depth from day one.

Acceptance criteria:

- [ ] All 33 §12.8 events validate against the catalogue; invalid events are rejected and counted.
- [ ] Both launch KPIs compute from SQL views with no manual steps.

Design-semester status: Catalogue, validator and KPI views (migration 0002).

## E13 Network foundations

MVP-2 · WS8 Social Foundations

### FR-QA-001 · P1

As a buyer, I can ask listing-specific questions, subject to moderation.

Acceptance criteria:

- [ ] Questions are moderated before public display; the agent's answer is labelled as from the agent.
- [ ] Reported content is hidden pending review.

Design-semester status: None.

### FR-SOC-001 · P1

As a buyer, I have a profile and can follow properties and suburbs and get notifications.

Acceptance criteria:

- [ ] Following a property notifies me of price, status and inspection changes.
- [ ] Notification preferences are per channel and default to off for marketing.

Design-semester status: None.

### FR-HUB-001 · P1

As a buyer, Suburb Hub v1 shows approved seeded content without open commenting.

Acceptance criteria:

- [ ] Content carries author and provenance; no user comments in v1.

Design-semester status: None.

### FR-TRND-001 · P1

As a buyer, Trending v1 is derived from defined events and excludes invalid or abusive activity.

Acceptance criteria:

- [ ] Trending uses listing_viewed/saved/shared with per-user caps and bot filtering.

Design-semester status: None.

### FR-LEAD-001 · P1

As the platform, intent signals may be computed internally but buyer details go to agents only with consent.

Acceptance criteria:

- [ ] No intent threshold triggers disclosure; lead_sent requires a prior lead_consent_granted.

Design-semester status: Events defined.

### FR-PIN-001 · P2

As a buyer, I can pin approved listing images and features to boards with attribution.

Acceptance criteria:

- [ ] Pins keep listing attribution and disappear if the listing media is withdrawn.

Design-semester status: None. First to defer (V11 §12.13).

## Non-functional enablers (V11 §12.4)

These gate release rather than ship as features. Each needs the evidence listed before the launch gate in [launch-gate checklist](../launch/launch-gate-checklist.md).

| ID | Requirement | Evidence |
| --- | --- | --- |
| NFR-PERF-001 | Set search/listing performance targets and validate at pilot load | Load test report against docs/data/pilot-sizing.md |
| NFR-PERF-002 | Monitor AI latency, first token and fallback separately | Dashboard panel per AI route |
| NFR-AVL-001 | Define availability, maintenance windows and service targets | Signed-off SLO doc + alerts |
| NFR-SCL-001 | Document pilot sizing assumptions | docs/data/pilot-sizing.md (done, draft) |
| NFR-SEO-001 | SSR, canonical URLs, metadata, structured data, sitemaps, robots | Lighthouse SEO + sitemap check in CI |
| NFR-SEC-001 | Encrypt traffic and sensitive data at rest | TLS config + KMS evidence |
| NFR-SEC-002 | Secrets only in approved secrets manager | Secret scanning in CI, no findings |
| NFR-SEC-003 | Strong auth and least privilege for admin | MFA enforced; IAM review |
| NFR-SEC-004 | Dependency/vulnerability scanning with thresholds | pnpm audit in CI (high = fail) |
| NFR-RES-001 | Backup, restore and recovery tested before pilot | Restore drill record |
| NFR-OBS-001 | Logs, metrics, traces for user, feed, rules, AI, integrations | Runbook links per alert |
| NFR-BRW-001 | Supported browser/device matrix tested | Playwright matrix run |
