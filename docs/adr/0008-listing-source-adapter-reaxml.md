# 0008. Listing ingestion through a source adapter, REAXML first

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Prasana (interim approver)
- **V11 references:** §5.5, §6, FR-FEED-001, FR-FEED-002, §12.7, §14.4

## Context

Listings arrive from agents' CRMs as REAXML, either directly or via feed processors. No scraping. Until founding-agent LOIs land, the team must develop against sample or synthetic feeds and cut over later without architecture change.

## Decision

- **A `ListingSourceAdapter` interface** in `packages/ingest` turns a raw payload into zero or more canonical listing records plus validation issues. REAXML is the first adapter; manual agent entry and synthetic data are others.
- **Pipeline:** receive → store raw (`feed_record`, with payload hash) → parse → validate → map to canonical model → run compliance evaluation → upsert. Each stage records its status, so failed records can be reprocessed from the stored raw payload (FR-FEED-002).
- **Delivery:** agents or their feed processor push files to a per-agency inbox (SFTP or HTTPS upload, decided in a later ADR once founding agents' CRMs are known). Ingestion runs as a background job, not inside a web request.
- **Idempotency:** a listing is identified by `(agency source, REAXML uniqueID)`. A record is applied only if its `modTime` is newer than the last applied one. Re-sending the same file is a no-op.
- **Status handling:** REAXML `status` values (`current`, `withdrawn`, `offmarket`, `sold`, `leased`, `deleted`) map onto the canonical listing status. Non-current listings are unpublished automatically.
- **The mapping contract** is documented in `docs/data/reaxml-mapping.md` and versioned with the schema.
- Ingestion **never** publishes a listing whose agent is unverified or whose compliance evaluation has blocking failures.

## Consequences

- Synthetic and real feeds go through the same code path, so the §14.4 cut-over is a data change.
- Storing raw payloads costs some storage but makes debugging and reprocessing straightforward.
- REAXML variants differ between CRMs; the adapter must tolerate unknown elements and log them, not fail.

## Alternatives considered

- **Third-party feed processor only (FeedSync-class):** speeds up the pilot and can be added as a source, but the canonical model and validation must still be ours.
- **Agent-entered listings only:** ignores how agents already work and kills the "near-zero listing effort" pitch.

## Conflict with brief

None.
