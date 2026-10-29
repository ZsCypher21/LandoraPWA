# 0006. LLM router abstraction and two-lane search

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Prasana (interim approver)
- **V11 references:** §6 "LLM cost control", FR-AI-001..004, FR-SRCH-001..003, §12.6

## Context

LLM inference is one of the two largest cost lines (§9). V11 requires hosted LLM APIs behind a router so models can be swapped as costs change, model routing by task, caching, usage caps by tier, circuit-breakers, traceable prompt and model versions, and graceful degradation to structured search.

## Decision

- **A `packages/ai` router** is the only code allowed to call an LLM provider. Callers request a **task** (`parse_search_intent`, `concierge_turn`, `summarise_sources`, `embed`), never a model name.
- **Routing config** maps each task to a provider, model, token limits and a fallback chain. Config is versioned; every call logs task, provider, model, prompt version, tokens, cost estimate, latency and outcome.
- **Provider adapters** implement one interface (`complete`, `embed`). Start with one hosted provider; adding a second is a new adapter, not a refactor.
- **Two lanes:**
  - *Search lane (default, near-free):* structured filters plus semantic search over cached embeddings. A small model only parses natural language into structured criteria, which are shown to the user and editable (FR-SRCH-002). Parsed queries are cached.
  - *Concierge lane (metered):* conversational turns using retrieval over approved sources. Every material claim must reference a retrieved source id. Answers whose claims cannot be grounded are rejected or downgraded to "I don't know".
- **Cost controls:** per-user monthly allowances by tier, per-user and platform-wide daily spend circuit-breakers, and a live cost-per-active-user metric. The FHB stream is exempt from metering because answers come from the deterministic rules engine (ADR 0007).
- **Failure behaviour:** on timeout, error or a tripped breaker, the UI falls back to structured search with a visible notice. It never fabricates.
- **Prompts** are files in the repo with version identifiers, and each change goes through the AI benchmark (§12.6) before release.

## Consequences

- Model and provider changes are configuration, not code.
- Cost is observable from day one, which feeds the LLM cost model the venture needs (§10.7).
- More upfront design than calling an SDK directly. This is intentional, because cost control is "designed in, not bolted on".

## Alternatives considered

- **Direct SDK calls in features:** fastest start, but makes cost control and model swaps a rewrite.
- **Third-party gateway product:** adds a vendor and a data-processing party to the privacy assessment. Can sit behind the same interface later if needed.
- **Self-hosted models:** infrastructure and ops cost not justified at pilot scale.

## Conflict with brief

None.
