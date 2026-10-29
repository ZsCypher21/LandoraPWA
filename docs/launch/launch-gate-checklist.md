# Launch-gate evidence checklist

V11 §13 item 10: "Create launch-gate evidence checklist and review it at each founding-agent demo." This is version 0.1, dated 2026-10-28.

The checklist has three parts:

1. Design-semester exit (§14.3), which is what we're working towards now.
2. The pre-conditions tracker (§14.2).
3. The eleven MVP launch gates (§12.14) and the evidence each one needs.

Status key: ✅ evidence exists (draft until approved) · 🟡 in progress · ⬜ not started · ⛔ blocked on a business decision.

## Part 1: Design-semester exit (V11 §14.3)

The Product Owner and the Senior Engineering Lead approve each item.

| Exit item | Evidence | Status | Needs |
| --- | --- | --- | --- |
| Wireframes/UX flows for J1–J4 | [docs/ux/journeys.md](../ux/journeys.md), [screens](../ux/screens) | ✅ | PO approval |
| ADRs for every "lock now" item (PWA stack, canonical model, LLM router, rules as config, REAXML adapter) | [ADR 0002](../adr/0002-pwa-nextjs-typescript.md), [0005](../adr/0005-canonical-property-model.md), [0006](../adr/0006-llm-router-abstraction.md), [0007](../adr/0007-rules-engine-as-configuration.md), [0008](../adr/0008-listing-source-adapter-reaxml.md), plus 0001, 0003, 0004, 0009 and 0010 | ✅ | Senior Engineering Lead approval (role not yet appointed) |
| Versioned canonical schema | [canonical-schema.md](../data/canonical-schema.md) v0.1.0, [migration 0001](../../db/migrations/0001_canonical_schema.sql) | ✅ | Approval |
| Jurisdiction rule pack as configuration | [rule-packs/qld](../../rule-packs/qld) (publication compliance, FHB entitlements), NSW stub | ✅ | Compliance owner review; market lock |
| Clickable prototype: AI search, listing, save/share, inspection timeline, FHB flow, and mock screens for the five roles | [apps/web](../../apps/web), [ADR 0011](../adr/0011-mock-role-switcher-before-real-auth.md) | ✅ | PO walkthrough |
| Draft functional requirements reviewed | [backlog.md](../backlog/backlog.md) (37 stories, 90 acceptance criteria) | ✅ | PO review; scope changes agreed |
| AI benchmark case set | [benchmark.md](../ai/benchmark.md), 53 cases | ✅ | PO and AI Lead approve thresholds |
| Design-semester exit formally accepted | PO sign-off record | ⬜ | Everything above |

## Part 2: Pre-conditions (V11 §14.2)

| Pre-condition | Status | Effect if still open |
| --- | --- | --- |
| Product Owner appointed | ✅ Andrew / Atif | None |
| Senior Engineering Lead appointed | ⛔ | ADR approval and design exit can't be signed off |
| Founding-agent letters of intent (target 20) | ⛔ | Market lock and the supply gate |
| Cotality data licence pricing | ⛔ | Real enrichment; capital plan. The prototype uses labelled placeholders. |
| LLM cost per active user | ✅ draft: [llm-cost-model.md](../ai/llm-cost-model.md), about AUD $0.55 per weekly active buyer per month at Base volume | Capital plan needs the PO to accept the AUD $1 budget line |
| Pilot jurisdiction (QLD/NSW) | ⛔ QLD drafted first | NSW pack remains a stub |
| Meeting cadence agreed | ✅ | None |

## Part 3: MVP launch gates (V11 §12.14)

All gates are required for pilot go/no-go. The steering group decides on this evidence (§12.10).

### Supply ⛔
- [ ] Founding-agent target met (signed agreements, not letters of intent)
- [ ] Minimum listing-density threshold agreed (proposal for the PO: at least 30% of active listings in each pilot suburb) and met in production data

### Product ⬜
- [ ] Every P0 story in [backlog.md](../backlog/backlog.md) accepted by the PO in UAT
- [ ] Every P1 not delivered has a PO-approved exception
- [ ] Zero open Severity 1 defects; Severity 2 defects triaged with dates
- [ ] End-to-end tests for J1–J4 pass on the supported browser matrix (NFR-BRW-001)

### Agent operations ⬜
- [ ] Licence verification works end to end, including exception approval and lapse handling
- [ ] Feed health dashboard live; reprocessing tested
- [ ] Exception queue and publication controls used by at least 3 founding agents in UAT

### Data 🟡
- [x] REAXML adapter handles sample and synthetic feeds (12 tests)
- [ ] Two weeks of live feeds from founding agents with less than 1% rejected records
- [ ] Cotality enrichment live, **or** a PO-approved reduced-data launch (no estimates shown)
- [ ] Cut-over from synthetic data completed and synthetic data removed from production (V11 §14.4)

### AI 🟡
- [x] Benchmark case set drafted (53 cases)
- [ ] Thresholds approved by the PO and AI Lead
- [ ] Benchmark run on the production model and prompt meets thresholds; results stored with versions
- [ ] Citation controls verified; AI outage drill shows fallback to structured search
- [ ] Cost circuit-breaker tested (FR-AI-003)

### Compliance 🟡
- [x] QLD rule packs with regression fixtures in CI
- [ ] Packs reviewed and approved by an authorised compliance/legal owner (§12.10)
- [ ] Publication gate regression-tested against production-like listings
- [ ] Pack activation workflow (two-person) in place

### Privacy 🟡
- [x] [PIA draft](../privacy/pia-draft.md) and [data inventory](../privacy/data-inventory.md)
- [ ] PIA completed and reviewed by a privacy adviser
- [ ] Privacy policy published, including automated-decision disclosures (APP 1.7–1.9, in force 10 Dec 2026)
- [ ] Consent, retention and lead-sharing controls implemented and tested

### Security ⬜
- [ ] Penetration test complete; critical and high findings fixed or formally risk-accepted
- [x] Dependency audit in CI (pnpm audit; Next.js was upgraded on 2026-10-28 after a flagged advisory)
- [ ] Secrets scanning, MFA for admins, least-privilege review
- [ ] Prototype "Viewing as" role switcher and in-memory mock store removed; real sign-in (FR-ACC-001) live ([ADR 0011](../adr/0011-mock-role-switcher-before-real-auth.md))

### Operations ⬜
- [ ] Admin console live with queues and SLAs
- [ ] Monitoring and alerting with runbooks (NFR-OBS-001)
- [ ] Incident process documented and rehearsed
- [ ] Backup restore drill completed (NFR-RES-001)

### Analytics 🟡
- [x] 33 events catalogued with a validator; KPI views in SQL (migration 0002)
- [ ] Both KPIs computed from production telemetry, with no manual steps, for 2 consecutive weeks

### Commercial readiness ⛔
- [ ] Cotality pricing in the 18-month capital plan
- [ ] LLM cost model updated with measured token usage from the benchmark and UAT

## Review log

Review this checklist at each founding-agent demo and record the outcome here.

| Date | Occasion | Reviewed by | Changes |
| --- | --- | --- | --- |
| 2026-10-28 | Initial draft | Prasana (project lead), pending | Created |
