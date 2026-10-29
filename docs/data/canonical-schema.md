# Canonical property/listing schema (v0.1.0)

- **Status:** Draft for approval (V11 §12.7, §14.3)
- **Source of truth:** `db/migrations/0001_canonical_schema.sql`. TypeScript and zod mirrors live in `packages/schema`; a test keeps their enumerations in sync with the SQL.
- **Decisions:** ADR 0004 (database), ADR 0005 (model and provenance), ADR 0007 (rules), ADR 0008 (ingestion)

## Coverage against §12.7

| §12.7 domain | Where it lives |
|---|---|
| Identity / address / geospatial | `property` (address, G-NAF PID, PostGIS point, lot/plan, land area), `suburb` (boundary polygon, pilot flag) |
| Listing status | `listing.status` (lifecycle from the feed) and `listing.publication_state` (whether Landora shows it) |
| Attributes | `listing` bedrooms, bathrooms, car spaces, building area, features; `property` land area and type |
| Pricing | `listing.price_display` (verbatim), `price_min_aud`/`price_max_aud`, `price_hidden`, rent, bond, sold price |
| Inspections | `inspection` |
| Auction | `listing.auction_at` |
| Agent / agency | `agency`, `agent`, `listing_agent`, with verification status and recheck dates |
| Media | `listing_media`, with `ai_generated` flag |
| Compliance | `listing.compliance_status`, `rule_pack`, `compliance_evaluation` |
| Provenance | `source_type`, `source_ref`, `source_observed_at` on every sourced row; `feed_record` raw payloads; `data_conflict` |
| Timestamps | `created_at`, `updated_at` (trigger-maintained), `source_mod_time` |

## Entity overview

```
suburb 1─* property 1─* listing *─1 agency 1─* agent
                         │  ├─* listing_media
                         │  ├─* inspection
                         │  ├─* listing_agent *─1 agent
                         │  ├─* listing_embedding (per model)
                         │  └─* compliance_evaluation *─1 rule_pack
property / suburb 1─* property_enrichment
agency 1─* feed_source 1─* feed_record
app_user 1─* user_role ; app_user 0..1─1 agent
audit_log (append-only), data_conflict, analytics_event
```

## Key rules encoded in the database

- A listing is **published** only with a publish time and a `current` or `under_offer` status (CHECK). The application additionally requires a verified agent and a passing compliance evaluation before setting it.
- **Synthetic enrichment must be flagged** `is_placeholder` (CHECK), so placeholder AVMs and comparables cannot be mistaken for licensed data (§14.4).
- **Only one active version** of a rule pack at a time (partial unique index); approved or active packs must record who approved them.
- **Audit log is append-only** (trigger blocks UPDATE and DELETE).
- Verified agents must have a `verified_at` timestamp.
- Agent and agency-admin roles must be scoped to an agency.

## Not in v0.1 (added with the features that need them)

Buyer collections and collaborators, inspection timelines and notes, follows, notifications, listing Q&A, suburb hub content, consent records, leads. These are P1 features and get their own migrations so that v0.1 can be approved now without waiting on their design.

## Open questions for approval

1. Should `price_hidden` listings be included in price-filtered search at all? Including them is more useful to buyers, but reveals a price range the agent chose not to show. Recommendation: include only when the agent opts in.
2. Is G-NAF (free, government) acceptable as the geocoding and address-matching source? Recommendation: yes; it is authoritative and has no licence cost.
3. Embedding model and dimension are not fixed yet (decided in the AI work). The schema stores one row per model, so this does not block approval.
