# Architecture Decision Records

Short records of architecture decisions that the Landora team inherits across semesters (V11 §6, "Who decides").

## Process

- One decision per file, numbered `NNNN-kebab-title.md`, using [`0000-template.md`](0000-template.md).
- Status moves `Proposed` → `Accepted` → (later) `Superseded by NNNN` or `Deprecated`. Accepted ADRs are never edited in substance; a change is a new ADR that supersedes the old one.
- **Approver (interim):** the project lead (Prasana) accepts ADRs, then presents them to the client (Product Owner: Andrew / Atif) for approval. When a Senior Engineering Lead is appointed (V11 §14.2), they take over accountability for architecture ADRs and re-confirm these.
- V11 is the source of truth. An ADR that departs from V11 must say so in a "Conflict with brief" section.

## Index

| # | Decision | Status | V11 ref |
|---|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Proposed | §6, §14.3 |
| [0002](0002-pwa-nextjs-typescript.md) | PWA on Next.js, React and TypeScript | Proposed | §6 lock now |
| [0003](0003-monorepo-and-ci.md) | pnpm monorepo with CI from day one | Proposed | §6 lock now |
| [0004](0004-postgres-postgis-pgvector.md) | PostgreSQL + PostGIS + pgvector as the single datastore | Proposed | §6 lock now |
| [0005](0005-canonical-property-model.md) | Canonical property model with field-level provenance | Proposed | §12.7, §14.3 |
| [0006](0006-llm-router-abstraction.md) | LLM router abstraction and two-lane search | Proposed | §6, FR-AI-003 |
| [0007](0007-rules-engine-as-configuration.md) | Rules engine as versioned configuration | Proposed | §6, FR-CMP-001..003, FR-FHB-001..002 |
| [0008](0008-listing-source-adapter-reaxml.md) | Listing ingestion through a source adapter, REAXML first | Proposed | §6, FR-FEED-001..002 |
| [0009](0009-billing-boundary-cs-cart.md) | Billing behind a clean API boundary (CS-Cart optional) | Proposed | §6, §10.5 |
| [0010](0010-cloud-and-infrastructure-as-code.md) | One cloud provider in Australia, infrastructure as code | Proposed | §6, §12.12 |
| [0011](0011-mock-role-switcher-before-real-auth.md) | Mock role switcher in the prototype, real authentication later | Accepted (project lead), PO pending | FR-ACC-001/002, §12.5 |
| [0012](0012-social-hub-preview-with-mock-data.md) | Social hub as a clickable preview on sample data, built in MVP-2 | Proposed | FR-SOC-001, FR-HUB-001, FR-QA-001, §12.13 |
| [0013](0013-client-preview-hosting.md) | Host the design-stage prototype on Vercel behind a password for client review | Proposed | ADR 0002, ADR 0010, ADR 0011 |

## Candidates for the next ADRs

Identity and authentication provider; feature-flag mechanism; analytics pipeline (in-database vs external); media storage and image processing; geocoding/address source (G-NAF); travel-time provider for inspection routing.
