# LLM cost model

Draft 0.1, dated 2026-10-28. This covers the V11 §14.2 pre-condition "LLM cost-per-active-user model" and the §12.14 commercial-readiness gate. The editable workbook is [llm-cost-model.xlsx](llm-cost-model.xlsx): change the blue cells and everything recalculates.

## Result

| Pilot volume (weekly active buyers) | Low (3,000) | Base (6,000) | High (10,000) |
| --- | --- | --- | --- |
| LLM cost per month (AUD) | $1,099 | $3,273 | $9,037 |
| Cost per active buyer per month (AUD) | $0.37 | $0.55 | $0.90 |
| 18 months at that volume (AUD) | $19,786 | $58,914 | $162,668 |

The concierge lane is about 98% of the cost. Search parsing costs about $27 USD a month even at Base volume, because a small model only turns words into filters. First home eligibility costs nothing because it runs on the rules engine.

Cost per concierge turn, by model, at Base volume:

| Concierge model | Per turn (USD) | Per active buyer per month (AUD) |
| --- | --- | --- |
| Haiku 5.5 | $0.0011 | $0.03 |
| Sonnet 5.5 (modelled) | $0.023 | $0.54 |
| Opus 5.5 | $0.045 | $1.06 |

## Recommendation for the capital plan

- **Recommendation:** Budget **AUD $1 per weekly active buyer per month** for LLM use. That is the High scenario plus headroom. Enforce it with per-user allowances and daily circuit-breakers (FR-AI-003). The plan line for 18 months at High volume is about **AUD $165k**.
- **Why:** The token assumptions are unmeasured, so planning at the cautious end protects the plan. The router's cost logging (ADR 0006) gives real numbers from the first UAT week.
- **Risks:**
  - Longer conversations raise uncached input tokens. Each extra 6,000 tokens per turn adds roughly AUD $0.28 per buyer per month on Sonnet.
  - Heavy users could dominate costs; tier allowances cap this.
  - List prices and the exchange rate change.
- **Alternatives:**
  - Run the concierge on Haiku 5.5, which costs about 95% less, if it meets the benchmark thresholds.
  - Route only hard questions to Sonnet.
  - Defer the concierge (it is MVP-1) and launch with the search lane only, at under AUD $0.01 per buyer per month.
- **MVP impact:** None on scope. The model choice is a configuration change behind the router.
- **Complexity:** Low. The router (ADR 0006, not built yet) is designed to log tokens and cost for every call.
- **Cost:** As shown in the table.

## What to do next

1. In the build semester, run the 53-case benchmark ([benchmark.md](benchmark.md)) on Haiku 5.5 and Sonnet 5.5. Pick the cheapest model that meets the approved thresholds.
2. Replace the yellow token assumptions in the workbook with measured averages from UAT.
3. Re-check list prices on Anthropic's pricing page and choose the hosting route. Bedrock and Vertex price Claude separately, and Australian data residency may decide it (ADR 0010, PIA §4 APP 8).

## What's not included

- Hosting and database (ADR 0010).
- Cotality licensed data, which is the other big line in §10.
- Email and push notifications.
- The embedding provider, which hasn't been chosen. Embeddings are modelled at a placeholder price and cost cents per month.
