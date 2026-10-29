# 0001. Record architecture decisions

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Prasana (project lead, interim approver); client Product Owner (Andrew / Atif) for approval
- **V11 references:** §6 "Who decides", §14.3

## Context

V11 names cohort handover decay as a known failure mode of multi-semester university builds. It requires that architecture calls are recorded as short ADRs the students inherit, and the design-semester exit (§14.3) requires approved ADRs for every "lock now" item. The Senior Engineering Lead role is still unfilled (§14.2).

## Decision

We keep ADRs in `docs/adr/` in the repository, in the format of `0000-template.md`. The project lead approves them in the interim and presents them to the client. When a Senior Engineering Lead is appointed, they re-confirm or supersede each ADR.

## Consequences

- Decisions live next to the code and are reviewed in the same pull requests.
- Superseding instead of editing keeps the history readable for the next cohort.
- Until a Senior Engineering Lead is appointed, there is a single-person approval risk. Mitigation: the client sees every ADR before the design-semester exit.

## Alternatives considered

- **Wiki or shared document:** drifts away from the code and is lost between cohorts.
- **No formal records:** fails §14.3.

## Conflict with brief

The brief assigns ADR authority to a Senior Engineering Lead. Interim approval by the project lead is a stopgap, not a replacement, and should be confirmed with the client.
