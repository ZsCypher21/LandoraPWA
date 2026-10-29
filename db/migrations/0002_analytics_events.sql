-- Analytics event store and launch KPI views (V11 §12.8, FR-ANL-001, commitment 6).
-- Event names and properties are defined in packages/analytics and docs/analytics/events.md.

CREATE TABLE analytics_event (
  id              uuid PRIMARY KEY,               -- generated client- or server-side; dedupes retries
  name            text NOT NULL,
  schema_version  smallint NOT NULL DEFAULT 1,
  occurred_at     timestamptz NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  user_id         uuid REFERENCES app_user (id) ON DELETE SET NULL,
  anonymous_id    text,                          -- random per-device id; never an email or fingerprint
  session_id      text,
  user_role       text CHECK (user_role IN ('anonymous', 'buyer', 'agent', 'agency_admin', 'moderator', 'platform_admin', 'system')),
  surface         text NOT NULL,                 -- e.g. 'search', 'listing_page', 'timeline', 'agent_console'
  listing_id      uuid,
  property_id     uuid,
  suburb_id       uuid,
  outcome         text CHECK (outcome IN ('success', 'failure', 'zero_results', 'blocked', 'cancelled')),
  properties      jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Trending v1 (FR-TRND-001) must exclude invalid or abusive activity.
  is_excluded     boolean NOT NULL DEFAULT false,
  exclusion_reason text,
  CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL OR user_role = 'system')
);
CREATE INDEX analytics_event_name_time_idx ON analytics_event (name, occurred_at);
CREATE INDEX analytics_event_user_time_idx ON analytics_event (user_id, occurred_at);
CREATE INDEX analytics_event_suburb_time_idx ON analytics_event (suburb_id, occurred_at);

-- Events that count a buyer as "active" in a week. Definition pending Product Owner approval
-- (docs/analytics/events.md, "KPI definitions").
CREATE VIEW kpi_buyer_activity AS
SELECT
  e.user_id,
  date_trunc('week', e.occurred_at AT TIME ZONE 'Australia/Brisbane')::date AS week_start,
  coalesce(e.suburb_id, p.suburb_id) AS suburb_id
FROM analytics_event e
LEFT JOIN listing l ON l.id = e.listing_id
LEFT JOIN property p ON p.id = l.property_id
WHERE e.user_role = 'buyer'
  AND e.user_id IS NOT NULL
  AND NOT e.is_excluded
  AND e.name IN (
    'search_completed', 'listing_viewed', 'listing_saved', 'listing_shared',
    'collection_created', 'property_followed', 'suburb_followed',
    'inspection_added', 'inspection_route_created', 'inspection_note_added',
    'concierge_question', 'agent_question_submitted'
  );

-- KPI 1: weekly active buyers per pilot suburb.
CREATE VIEW kpi_weekly_active_buyers AS
SELECT a.week_start, s.id AS suburb_id, s.name AS suburb_name, count(DISTINCT a.user_id) AS weekly_active_buyers
FROM kpi_buyer_activity a
JOIN suburb s ON s.id = a.suburb_id AND s.is_pilot
GROUP BY a.week_start, s.id, s.name;

-- KPI 2: inspection-timeline depth = share of saved listings that become timeline entries.
-- Cohorted by the week the listing was first saved; a listing counts once per buyer.
CREATE VIEW kpi_inspection_timeline_depth AS
WITH saved AS (
  SELECT e.user_id, e.listing_id, min(e.occurred_at) AS saved_at
  FROM analytics_event e
  WHERE e.name = 'listing_saved' AND e.user_id IS NOT NULL AND e.listing_id IS NOT NULL AND NOT e.is_excluded
  GROUP BY e.user_id, e.listing_id
),
timelined AS (
  SELECT DISTINCT e.user_id, e.listing_id
  FROM analytics_event e
  WHERE e.name = 'inspection_added' AND e.user_id IS NOT NULL AND e.listing_id IS NOT NULL AND NOT e.is_excluded
)
SELECT
  date_trunc('week', sv.saved_at AT TIME ZONE 'Australia/Brisbane')::date AS saved_week_start,
  p.suburb_id,
  count(*) AS saved_listings,
  count(t.listing_id) AS timeline_listings,
  round(count(t.listing_id)::numeric / nullif(count(*), 0), 4) AS timeline_depth
FROM saved sv
LEFT JOIN timelined t ON t.user_id = sv.user_id AND t.listing_id = sv.listing_id
JOIN listing l ON l.id = sv.listing_id
JOIN property p ON p.id = l.property_id
GROUP BY 1, 2;
