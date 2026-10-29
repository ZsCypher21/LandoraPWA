# 0007. Rules engine as versioned configuration

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Prasana (interim approver)
- **V11 references:** §4 "Compliance gate", §5.3, §5.8, §6, FR-CMP-001..003, FR-FHB-001..002, §12.11

## Context

Publication compliance (QLD Form 2 disclosure readiness, or NSW contract-before-marketing) and FHB entitlements are both deterministic rules that change by jurisdiction and over time. V11 says "QLD vs NSW is a rule pack you load", rules must be versioned, audited and regression-tested, and eligibility output must state its source, effective date and assumptions.

## Decision

- **A `packages/rules` evaluator** runs **rule packs** written as declarative JSON (validated by a zod schema). The evaluator is pure: given a pack and an input fact set, it returns a deterministic result. No network calls, no clock reads except an explicit `as_of` date.
- **A rule pack** has `id`, `jurisdiction`, `domain` (`publication_compliance` or `fhb_entitlement`), semantic `version`, `effective_from`/`effective_to`, an `approved_by` record, and a list of rules. Each rule has an id, a condition tree (`all`/`any`/`not` over a small set of typed operators), a severity (`blocking` or `advisory`), a plain-language actionable reason, and source citations (legislation or official program page, with retrieval date).
- **Results** include pass/fail per rule, reasons, the pack id and version, and any assumptions used, which is what FR-FHB-002 and FR-CMP-002 require.
- **Every evaluation is stored** (`compliance_evaluation`) with the pack version, so any past decision can be explained.
- **Each pack ships with fixture tests** (input → expected result). CI runs them, and a pack cannot be activated without passing (FR-CMP-003).
- **Activation is controlled:** a pack is loaded into the database as inactive, approved by an authorised compliance owner, then activated by an admin. Activation is audit-logged.
- **The LLM never decides.** It may only explain a result the engine already produced.

## Consequences

- The pilot market decision (QLD or NSW) becomes a configuration choice, so architecture work is not blocked by the agent-LOI gate.
- Legal interpretation stays with an authorised owner; engineers encode, they do not interpret.
- A home-grown condition language must be kept small. If rules outgrow it, consider an established format such as JSON Logic behind the same evaluator interface.

## Alternatives considered

- **Hard-coded rules in TypeScript:** fastest to write, but every rule change becomes a code release and auditing is harder.
- **Full business rules engine (Drools-style):** far more power than needed, and a JVM dependency.
- **JSON Logic as-is:** viable, but its untyped operators make actionable reasons and citations awkward.

## Conflict with brief

None. Note: the content of any rule pack is a draft until signed off by the authorised compliance or legal owner (§12.10).
