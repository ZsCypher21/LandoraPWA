# Analytics events and launch KPIs (v1)

- **Status:** Draft for approval (V11 §12.8, FR-ANL-001, commitment 6)
- **Code:** `packages/analytics/src/events.ts` (typed catalogue and validator)
- **Storage and KPI views:** `db/migrations/0002_analytics_events.sql`

## Envelope (every event)

| Field | Meaning |
|---|---|
| `id` | UUID generated when the event happens, so retries don't double count |
| `occurredAt` | when it happened (with offset) |
| `userId` / `anonymousId` | signed-in user, or a random per-device id. Never an email or browser fingerprint |
| `sessionId` | optional session grouping |
| `userRole` | `anonymous`, `buyer`, `agent`, `agency_admin`, `moderator`, `platform_admin`, `system` |
| `surface` | where it happened (`search`, `listing_page`, `timeline`, `agent_console`, ...) |
| `listingId` / `propertyId` / `suburbId` | the subject; listing events must set `listingId` |
| `outcome` | `success`, `failure`, `zero_results`, `blocked`, `cancelled` |
| `properties` | event-specific, typed, and closed. Undeclared properties are rejected |

All 33 events in §12.8 are defined; a unit test fails if one goes missing.

## Privacy rules

- No free text the user typed (search queries, notes, Q&A text, concierge messages) in event properties. Search events record mode, counts and latency only.
- No FHB income, deposit or readiness values in any event (§12.5).
- Events tied to a signed-in user are deleted or anonymised when the account is deleted (`user_id` is `ON DELETE SET NULL`).
- Whether product analytics needs opt-in consent or can run under a notice is a decision for the Privacy Impact Assessment (step 4). The two launch KPIs only need first-party, pseudonymous events.

## KPI definitions (need Product Owner approval)

**KPI 1: Weekly active buyers per pilot suburb** (`kpi_weekly_active_buyers`)

- A *weekly active buyer* is a signed-in user with the buyer role who performs at least one *engaged action* in the ISO week (Monday start, Australia/Brisbane time).
- Engaged actions: `search_completed`, `listing_viewed`, `listing_saved`, `listing_shared`, `collection_created`, `property_followed`, `suburb_followed`, `inspection_added`, `inspection_route_created`, `inspection_note_added`, `concierge_question`, `agent_question_submitted`.
- The suburb is the event's `suburbId`, or the suburb of the listing it refers to. A buyer active in three suburbs counts once in each.
- Excluded: events flagged `is_excluded` (bots, abuse, internal test accounts).

**KPI 2: Inspection-timeline depth** (`kpi_inspection_timeline_depth`)

- Share of saved listings that become inspection-timeline entries: distinct (buyer, listing) pairs with `inspection_added` ÷ distinct (buyer, listing) pairs with `listing_saved`.
- Cohorted by the week the listing was first saved, per suburb.

**Decisions for the Product Owner**

1. Should anonymous visitors count as "active buyers"? The proposal counts signed-in buyers only, because anonymous ids are per device and inflate the number. Anonymous activity can be reported as a separate secondary metric.
2. Is a bare `listing_viewed` engaged enough to count? The proposal says yes, to match "active". A stricter "engaged buyer" version could exclude views.
3. Time zone: Australia/Brisbane is used (no daylight saving). Switch to Australia/Sydney if the pilot is in NSW.
