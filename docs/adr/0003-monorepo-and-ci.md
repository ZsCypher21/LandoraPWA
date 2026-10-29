# 0003. pnpm monorepo with CI from day one

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Prasana (interim approver)
- **V11 references:** §6 "monorepo and CI from day one", §12.12, NFR-SEC-002, NFR-SEC-004

## Context

V11 requires a monorepo, CI from day one, dependency and vulnerability scanning, and secrets never in source code.

## Decision

- **Tooling:** pnpm workspaces. No Turborepo or Nx until build times justify it.
- **Layout:**
  - `apps/web`: the Next.js PWA (consumer, agent console, admin console).
  - `packages/schema`: canonical domain types and zod validators.
  - `packages/analytics`: typed analytics event definitions.
  - `packages/*` (later): `rules` (rules engine), `ingest` (listing source adapters), `ai` (LLM router), `db` (query layer).
  - `db/migrations`: versioned SQL migrations (see ADR 0004).
  - `docs/`: ADRs, data contracts, analytics specs.
  - `infra/`: infrastructure as code (see ADR 0010).
- **CI (GitHub Actions)** on every pull request: install with a frozen lockfile, typecheck, lint, unit tests, migration test against a PostGIS container, `pnpm audit` with a fail threshold of "high", and secret scanning. The main branch is protected and requires CI to pass plus one review.
- **Secrets:** `.env` files are git-ignored; only `.env.example` is committed. Deployed secrets live in the cloud provider's secrets manager.

## Consequences

- Shared types between UI, API, rules and ingestion stop contract drift.
- One pull request can change the schema and its consumers together.
- CI runs all packages on every change. Acceptable at this size; add affected-only runs later if needed.

## Alternatives considered

- **Polyrepo:** cross-repo contract changes are slow and error-prone for a student team.
- **Turborepo/Nx now:** extra configuration with no benefit at a handful of packages.

## Conflict with brief

None.
