# Documentation register

What V11 asks the team to document, and where each item stands. Status as of 2026-10-29.

Status key: **Done draft** (exists, no PO sign-off needed yet) · **Awaiting PO** (drafted, needs Product Owner approval) · **Missing** (not written).

## Design-semester exit (V11 §14.3)

The PO and Senior Engineering Lead approve these before build allocation begins.

| Document | V11 ref | Status | Where it lives | Next step |
| --- | --- | --- | --- | --- |
| UX flows for journeys J1–J4 | §14.3, §12.2 | Awaiting PO | `docs/ux/journeys.md`, `docs/ux/screens/` | PO approval of the flows and 36 screens |
| ADRs for every “lock now” item | §14.3, §6 | Awaiting PO | `docs/adr/0001–0010`, `docs/adr/README.md` | All Proposed. Needs PO approval and a Senior Engineering Lead to confirm (role not appointed) |
| Canonical property/listing schema, versioned | §14.3, §12.7 | Awaiting PO | `docs/data/canonical-schema.md`, `db/migrations/0001_canonical_schema.sql` | Approve v0.1.0 |
| Jurisdiction rule pack as configuration | §14.3, §6 | Awaiting PO | `rule-packs/qld/`, `rule-packs/README.md` | QLD drafted, NSW stub. Compliance owner review; market lock still open |
| Clickable prototype (AI search, listing, save/share, inspections, FHB) | §14.3 | Awaiting PO | `apps/web/` | PO walkthrough |
| Draft functional requirements reviewed | §14.3, §12.3 | Awaiting PO | `docs/backlog/backlog.md`, `docs/backlog/backlog.csv` | 37 stories, 90 acceptance criteria. PO review and agreed scope changes |
| AI benchmark case set | §14.3, §12.6 | Awaiting PO | `docs/ai/benchmark.md`, `docs/ai/benchmark-cases.json` | 53 cases. PO and AI Lead set numeric thresholds |
| Design-semester exit sign-off record | §14.3 | Missing | none yet | Write once the PO accepts the items above (suggested: docs/launch/design-exit-signoff.md) |

## Other design-semester documents (V11 §13, §14.4, §10)

Named as immediate actions or interim fallbacks. Most are drafted.

| Document | V11 ref | Status | Where it lives | Next step |
| --- | --- | --- | --- | --- |
| REAXML mapping contract | §13 item 3 | Awaiting PO | `docs/data/reaxml-mapping.md` | Approve; check against real CRM exports once agents sign |
| Agent console and admin console screens, queues, roles | §13 items 5–6 | Awaiting PO | `docs/ux/journeys.md`, `docs/ux/screens/ 13–18`, `docs/adr/0011-…md` | ADR 0011 accepted by Prasana; PO approval pending |
| Privacy and consent design: PIA draft, data inventory | §13 item 7, §12.5 | Awaiting PO | `docs/privacy/pia-draft.md`, `docs/privacy/data-inventory.md` | PO decision on analytics consent default; privacy adviser review before pilot |
| Social trust and privacy rules | §12.5, FR-HUB-001, FR-QA-001 | Awaiting PO | `docs/privacy/social-trust-rules.md`, `docs/adr/0012-…md` | Report SLA and hide-on-first-report decisions |
| Pilot sizing and performance targets | §13 item 9, NFR-SCL-001, NFR-PERF-001 | Awaiting PO | `docs/data/pilot-sizing.md` | Approve targets; re-check after LOIs |
| Analytics event schema and launch KPIs | §12.8, FR-ANL-001 | Awaiting PO | `docs/analytics/events.md`, `db/migrations/0002_analytics_events.sql` | Approve; consent-first vs opt-out |
| LLM cost-per-active-user model | §14.2, §10 commitment 7 | Awaiting PO | `docs/ai/llm-cost-model.md`, `docs/ai/llm-cost-model.xlsx` | Accept the AUD $1 per buyer per month budget line |
| Launch-gate evidence checklist | §13 item 10, §12.14 | Done draft | `docs/launch/launch-gate-checklist.md` | Living document, reviewed at each founding-agent demo |
| Synthetic dataset and sample REAXML files | §14.4 | Done draft | `data/synthetic/`, `samples/reaxml/` | None for now |
| System architecture and data flow diagrams | §6 (supporting) | Done draft | `docs/architecture/` | Added for this presentation |
| Synthetic-to-real data cut-over plan | §14.4 | Missing | none yet | Only noted in ADR 0005 and 0008. Write before the build semester |

## Required before pilot (V11 §12, build semester)

Not due yet. Listed so the clients see the full documentation load.

| Document | V11 ref | Status | Where it lives | Next step |
| --- | --- | --- | --- | --- |
| Supported browser and device matrix | NFR-BRW-001 | Missing | none yet | ADR 0002 states the intent only |
| Availability and service targets, monitoring | NFR-AVL-001, NFR-OBS-001 | Missing | none yet | Before pilot |
| Backup, restore and recovery procedure | NFR-RES-001 | Missing | none yet | Write and test before pilot |
| Security incident, privacy incident and data-correction workflows | §12.5 | Missing | none yet | Before production |
| Migration, rollback and hotfix procedures | §12.12 | Missing | none yet | Early in the build semester |
| Test strategy and plan | §12.11 | Missing | none yet | CI and unit tests exist; strategy not written |
| Infrastructure as code | §12.12, ADR 0010 | Missing | `infra/README.md` | Placeholder only; start of build semester |
| Operational runbooks | §12.11 Definition of Done | Missing | none yet | Grow with each P0/P1 feature |
| Completed PIA and security/penetration test report | §12.14 Privacy and Security gates | Missing | none yet | PIA draft exists; final needs privacy adviser. Pen test before pilot |

## Business inputs owned by the founders and PO

Engineering cannot produce these, but several design documents wait on them.

| Document | V11 ref | Status | Where it lives | Next step |
| --- | --- | --- | --- | --- |
| Market selection scorecard (QLD vs NSW) | §10 commitment 2, §14.2 | Missing | none yet | Roadshow evidence; unlocks market lock |
| Founding-agent letters of intent (target 20) | §10 commitment 1, §14.2 | Missing | none yet | Gates market lock and supply |
| Cotality indicative pricing | §14.2 | Missing | none yet | Needed for the capital plan |
| 18-month capital plan | §10 commitment 7, §12.14 | Missing | none yet | LLM part drafted; waits on Cotality pricing |
| Senior Engineering Lead appointment | §14.1, §13 item 1 | Missing | none yet | Needed to formally approve ADRs and exit |
