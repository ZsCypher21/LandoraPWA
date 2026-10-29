# Landora

Buyer-first, AI-assisted property discovery PWA. The product brief is the *Landora Concept, Product & Delivery Document V11*; it is the source of truth for scope and priorities.

## Status

Design stage. This repository currently holds the architecture foundations required for the design-stage exit (V11 §14.3):

- [Architecture Decision Records](docs/adr/README.md)
- [Canonical property/listing schema v0.1.0](docs/data/canonical-schema.md) and its [SQL migration](db/migrations/0001_canonical_schema.sql)
- [REAXML mapping contract](docs/data/reaxml-mapping.md)
- [Analytics events and launch KPIs](docs/analytics/events.md)
- [Rule packs](rule-packs/README.md): QLD publication compliance, QLD first home buyer entitlements, NSW stub
- [REAXML adapter](packages/ingest) with [sample feed files](samples/reaxml)
- [Synthetic pilot dataset](data/synthetic) (430 fictional listings) and its [generator](packages/synthetic)
- [Pilot sizing assumptions](docs/data/pilot-sizing.md)
- [Clickable PWA prototype](apps/web) on the synthetic data: search, listing detail, shortlist and share, inspection plan, first home entitlement check, and mock screens for the five roles (buyer account, agent and agency console, admin console) behind a prototype-only "Viewing as" menu (ADR 0011)
- [UX flows for journeys J1–J4](docs/ux/journeys.md) with [screenshots](docs/ux/screens)
- [MVP backlog](docs/backlog/backlog.md): 37 stories with acceptance criteria ([CSV for import](docs/backlog/backlog.csv))
- [AI benchmark](docs/ai/benchmark.md): 53 cases, with the parser slice run in CI
- [Privacy impact assessment draft](docs/privacy/pia-draft.md) and [data inventory](docs/privacy/data-inventory.md)
- [Launch-gate evidence checklist](docs/launch/launch-gate-checklist.md)
- [LLM cost model](docs/ai/llm-cost-model.md) with an [editable workbook](docs/ai/llm-cost-model.xlsx)

All of these are **Proposed / Draft** until approved by the project lead and the client Product Owner.

## Layout

```
apps/web         Next.js PWA prototype
packages/schema  canonical domain types and validators (zod)
packages/analytics  typed analytics event catalogue
packages/rules   deterministic rules engine (compliance, FHB entitlements)
packages/ingest  listing source adapters (REAXML)
packages/synthetic  synthetic dataset generator
rule-packs/      rule packs as JSON, with regression fixtures
samples/reaxml/  hand-built sample feed files
data/synthetic/  generated synthetic dataset (JSON + REAXML per agency)
db/              PostGIS + pgvector image, SQL migrations, SQL tests
docs/            ADRs, data contracts, analytics, UX, backlog, AI, privacy, launch gates
infra/           infrastructure as code (build semester)
scripts/         developer scripts (migrations)
```

## Getting started

Requirements: Node 22+, pnpm 10 (`corepack enable`), Docker Desktop, and `psql` on your PATH.

```bash
pnpm install
pnpm typecheck
pnpm test

# run the prototype at http://localhost:3000
pnpm --filter @landora/web dev

# regenerate the synthetic dataset (deterministic)
pnpm --filter @landora/synthetic generate

# local database with PostGIS and pgvector
cp .env.example .env
docker compose up -d db
DATABASE_URL=postgres://landora:landora@localhost:5432/landora pnpm db:migrate
psql postgres://landora:landora@localhost:5432/landora -f db/tests/schema_smoke.sql
```

On Windows PowerShell, set the variable with `$env:DATABASE_URL="postgres://landora:landora@localhost:5432/landora"` before `pnpm db:migrate`.

## Data

There are no real listings or licensed data yet. Development uses clearly labelled synthetic data (V11 §14.4); `source_type = 'synthetic'` marks it everywhere.
