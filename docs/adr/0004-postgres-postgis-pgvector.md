# 0004. PostgreSQL + PostGIS + pgvector as the single datastore

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Prasana (interim approver)
- **V11 references:** §6 "Lock now", §12.7, NFR-SCL-001

## Context

Landora needs relational listing data, geospatial queries (suburb polygons, catchments, distances for inspection routing), semantic search over listing text, and an event store for trending and KPIs. V11 says: "no separate vector database until scale demands it".

## Decision

- **One PostgreSQL 16 database** with the `postgis`, `vector` (pgvector), `pg_trgm` and `pgcrypto` extensions.
- **Migrations:** plain, versioned SQL files in `db/migrations/NNNN_name.sql`, applied in order and recorded in a `schema_migrations` table. SQL is the source of truth for the schema so that PostGIS and pgvector features are not limited by an ORM.
- **Query layer:** Kysely (type-safe SQL builder) with generated types, added when the API is built. No ORM that hides SQL.
- **Embeddings** live in a separate table keyed by `(listing_id, model)`, so the embedding model can change without a schema migration on `listing`.
- **Analytics events** are stored in Postgres at pilot scale, with a migration path to a warehouse later.
- Enumerations use `text` with `CHECK` constraints instead of Postgres `ENUM` types, which are awkward to change.

## Consequences

- One system to back up, secure, monitor and restore (NFR-RES-001).
- Managed Postgres with both PostGIS and pgvector is available from all major clouds in Australia.
- At pilot scale (thousands of listings, not millions) pgvector with HNSW indexes is well within limits. Revisit if listings exceed roughly 1 million or vector queries dominate load.
- The team needs basic SQL skills; this is a reasonable expectation.

## Alternatives considered

- **Separate vector DB (Pinecone, Weaviate):** extra cost, extra data-sync path, and vendor lock-in that V11 rules out for now.
- **Prisma:** good developer experience but weak PostGIS and pgvector support, which would push the core queries into raw SQL anyway.
- **Drizzle:** a viable alternative. Not chosen because it makes TypeScript the schema source, which hides PostGIS details from reviewers.

## Conflict with brief

None.
