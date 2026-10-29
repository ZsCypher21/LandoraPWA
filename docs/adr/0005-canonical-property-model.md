# 0005. Canonical property model with field-level provenance

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Prasana (interim approver)
- **V11 references:** §12.7, FR-LST-001, FR-LST-002, FR-AI-001, §14.4

## Context

V11 requires a versioned canonical schema approved before integration build, a strict source-of-truth hierarchy, conflicts preserved rather than overwritten, and placeholder enrichment that is never shown as real data. The AI concierge must cite sources for material claims, so every fact it reads needs a traceable origin.

## Decision

- **Separate the physical property from the marketing listing.** `property` is the place (address, geometry, land). `listing` is one marketing campaign of it (sale, rent or off-the-plan) from one agency source. A property can have many listings over time.
- **Listing fields come only from the authorised agent feed** (REAXML, or manual agent entry through the console). Nothing else overwrites them.
- **Enrichment is stored separately** (`property_enrichment`) with provider, licence reference, effective date and an `is_placeholder` flag. It is presented as sourced enrichment and never silently copied into listing fields.
- **Provenance per fact.** Every listing and enrichment row carries `source_type`, `source_ref` and `source_observed_at`. Material conflicts between sources are recorded in `data_conflict` and surfaced as "conflicting" to users and the AI.
- **Source hierarchy** (highest wins for its own domain): deterministic rules → government sources → licensed datasets → REAXML feeds → user content → AI interpretation. AI-generated text has no source-of-truth status.
- **Synthetic data is first-class but labelled.** Rows created from synthetic data carry `source_type = 'synthetic'`, and the UI must label them. This supports the §14.4 fallback and its cut-over without schema change.
- **The schema is versioned** in `db/migrations` and described in `docs/data/canonical-schema.md`. The current version is `0.1.0`.

## Consequences

- The concierge can cite a source for every material claim because each row has one.
- Price history and comparables never contaminate current listing data.
- Slightly more joins than a single flat listing table. Acceptable for correctness.

## Alternatives considered

- **One flat listing table:** simple, but loses provenance and makes the source hierarchy impossible to enforce.
- **Full event-sourced property history:** powerful but over-engineered for the MVP. The raw `feed_record` table already gives a replayable history of feed input.

## Conflict with brief

None.
