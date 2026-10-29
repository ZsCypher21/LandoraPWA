# Rule packs

Deterministic rules as configuration (ADR 0007). Each pack is a JSON file validated by `packages/rules`; each has a `*.fixtures.json` regression suite that CI runs (FR-CMP-003).

| Pack | Status | What it does |
|---|---|---|
| [`qld/publication_compliance.json`](qld/publication_compliance.json) | Draft 0.1.0 | Blocks publication unless the agent is licence-verified and the Queensland seller disclosure documents are confirmed ready (Form 2, title search, and body corporate, pool and environmental documents when they apply). Drives the "disclosure-ready" badge. |
| [`qld/fhb_entitlement.json`](qld/fhb_entitlement.json) | Draft 0.1.0 | First home buyer entitlements for a Queensland purchase: QLD First Home Owner Grant, transfer duty concessions (new home, vacant land, established home), and the federal First Home Guarantee. |
| [`nsw/publication_compliance.json`](nsw/publication_compliance.json) | Stub 0.0.1 | Keeps the NSW option open until the market is locked. Not researched. |

## How the engine behaves

- Missing information is **unknown**, never assumed. A compliance check with a missing blocking answer is `incomplete`, not passed. An entitlement with missing answers lists exactly which questions are still needed.
- Every result carries the pack version, sources with retrieval dates, and stated assumptions, so the concierge can explain it and cite it (FR-FHB-002).
- Rules marked `platformPolicy: true` are Landora's own policy rather than the law, and the UI must say so.

## Before any pack can be activated

1. An authorised compliance or legal owner reviews the rules, sources and open questions (V11 §12.10). Engineers encode; they do not interpret.
2. The approval is recorded in the pack (`approval`) and its status set to `approved`.
3. An admin activates it; activation is audit-logged and only one version can be active.

## Open items found while drafting (October 2026)

- **Publication gate vs the law: decided 2026-10-28 by Prasana (project lead), pending client confirmation.** Keep V11 §4 as written: listings without confirmed Form 2 readiness stay unpublished. Queensland law only requires disclosure before contract, so this is deliberately stricter (marked `platformPolicy`). Revisit with founding agents at the first demo day.
- **Home Guarantee income caps.** Housing Australia's 1 October 2025 announcement says there are no income caps, but its First Home Guarantee page still listed $125,000 / $200,000 when checked. The pack follows the announcement and flags the conflict.
- **Duty concession bands.** Top and bottom bands are from QRO; the steps in between are inferred and need checking against the QRO table.
- **Income is not needed.** None of the encoded programs currently depend on income, so the FHB questionnaire should not ask for it (V11 §12.5 data minimisation), even though V11 §5.8 mentions an income band.
