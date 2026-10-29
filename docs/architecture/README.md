# Architecture overview

Diagrams for the design-stage client review (2026-10-29). They follow V11 §6 and ADRs 0001–0012. All content is draft for Product Owner review.

| File | Shows |
| --- | --- |
| [system-architecture.svg](system-architecture.svg) | One Next.js PWA and app server made of modular packages, one PostgreSQL (PostGIS, pgvector) database, and every external system behind an adapter. |
| [data-flow.svg](data-flow.svg) | Property data from six sources ranked by authority into the canonical store, and buyer personal data with the consent and privacy rules on each path. |
| `*.png` | The same two diagrams as images, for slides. |
| [documentation-register.md](documentation-register.md) | Every document V11 asks for, with status and location. |

## Legend

- **Solid box:** built in the prototype (real, tested code).
- **Dashed box:** mocked in the prototype (labelled stand-in, for example the role switcher, synthetic JSON data, placeholder enrichment).
- **Dotted box:** planned for the build semester (for example the AI router and LLM provider, real sign-in, cloud, billing).
- **Pink arrow and pill (data flow):** the buyer must give purpose-specific consent (V11 §12.5). Outlined pill: a privacy rule built into the design.

## Source-of-truth order (V11 §12.6, §12.7, ADR 0005)

1. Deterministic rules (rule packs)
2. Government sources
3. Licensed datasets (Cotality, placeholders until licensed)
4. REAXML agent feeds
5. User-generated content
6. AI interpretation (never a source of truth)

