# 0009. Billing behind a clean API boundary (CS-Cart optional)

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Prasana (interim approver)
- **V11 references:** §6 "CS-Cart — final position", §10 commitment 5, §8 launch mechanics

## Context

V11 restricts CS-Cart to subscription billing and vendor back office, behind an API contract defined before any CS-Cart work, with no core read-path traffic touching it. Founding agents are free in year one and revenue reviews are deferred to phase two.

## Decision

- **A `BillingProvider` interface** (create account, subscription status, record listing charge, webhooks in) is defined in the platform. CS-Cart, Stripe or a no-op provider can sit behind it.
- **The MVP uses the no-op provider.** Founding agents are on a free plan, so no billing integration is built in the build semester unless the Product Owner asks for it.
- **No product read path calls the billing provider.** Entitlements (for example "agency is active") are stored in the platform database and updated by billing webhooks.

## Consequences

- Zero billing work in the MVP critical path.
- The CS-Cart decision can be reviewed honestly at pilot end (commitment 5) without touching core code.

## Alternatives considered

- **Integrate CS-Cart now:** effort on revenue that the MVP explicitly does not measure.
- **Stripe now:** same objection; Stripe stays a candidate adapter.

## Conflict with brief

None. V11 says either CS-Cart use "is fine; so is not using it at all".
