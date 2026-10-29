-- Smoke test for the canonical schema and KPI views. Runs in a transaction and rolls back.
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/schema_smoke.sql
BEGIN;

INSERT INTO suburb (id, name, state, postcode, is_pilot, source_type)
VALUES ('00000000-0000-0000-0000-0000000000a1', 'Testville', 'QLD', '4551', true, 'synthetic');

INSERT INTO agency (id, name, verification_status, verified_at)
VALUES ('00000000-0000-0000-0000-0000000000b1', 'Synthetic Realty', 'verified', now());

INSERT INTO app_user (id, email) VALUES ('00000000-0000-0000-0000-0000000000c1', 'buyer@example.test');

INSERT INTO property (id, street_number, street_name, suburb_id, state, postcode, location, property_type, source_type, source_observed_at)
VALUES ('00000000-0000-0000-0000-0000000000d1', '1', 'Example St', '00000000-0000-0000-0000-0000000000a1', 'QLD', '4551',
        ST_GeogFromText('POINT(153.1 -26.8)'), 'house', 'synthetic', now());

INSERT INTO listing (id, property_id, agency_id, source_listing_id, listing_type, status, headline, price_min_aud, price_max_aud,
                     bedrooms, source_type, source_mod_time, source_observed_at)
VALUES ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1',
        'SYN-1', 'sale', 'current', 'Renovator with a big backyard', 650000, 700000, 3, 'synthetic', now(), now());

-- Full-text search vector is generated.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM listing WHERE search_tsv @@ plainto_tsquery('english', 'backyard')) THEN
    RAISE EXCEPTION 'search_tsv not generated';
  END IF;
END $$;

-- A listing cannot be published without published_at.
DO $$ BEGIN
  BEGIN
    UPDATE listing SET publication_state = 'published' WHERE id = '00000000-0000-0000-0000-0000000000e1';
    RAISE EXCEPTION 'expected check violation for publish without published_at';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- Synthetic enrichment must be flagged as placeholder.
DO $$ BEGIN
  BEGIN
    INSERT INTO property_enrichment (property_id, kind, provider, source_type, is_placeholder, effective_date, retrieved_at, payload)
    VALUES ('00000000-0000-0000-0000-0000000000d1', 'avm', 'synthetic', 'synthetic', false, current_date, now(), '{}');
    RAISE EXCEPTION 'expected check violation for unflagged synthetic enrichment';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- Audit log is append-only.
INSERT INTO audit_log (actor_kind, action, entity, entity_id) VALUES ('system', 'test.write', 'listing', 'x');
DO $$ BEGIN
  BEGIN
    DELETE FROM audit_log;
    RAISE EXCEPTION 'expected audit_log delete to fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'audit_log is append-only' THEN RAISE; END IF;
  END;
END $$;

-- KPI views compute from events.
INSERT INTO analytics_event (id, name, occurred_at, user_id, user_role, surface, listing_id) VALUES
  (gen_random_uuid(), 'listing_saved', now(), '00000000-0000-0000-0000-0000000000c1', 'buyer', 'listing_page', '00000000-0000-0000-0000-0000000000e1'),
  (gen_random_uuid(), 'inspection_added', now(), '00000000-0000-0000-0000-0000000000c1', 'buyer', 'timeline', '00000000-0000-0000-0000-0000000000e1');

DO $$ BEGIN
  IF (SELECT sum(weekly_active_buyers) FROM kpi_weekly_active_buyers) <> 1 THEN
    RAISE EXCEPTION 'kpi_weekly_active_buyers expected 1';
  END IF;
  IF (SELECT timeline_depth FROM kpi_inspection_timeline_depth) <> 1 THEN
    RAISE EXCEPTION 'kpi_inspection_timeline_depth expected 1';
  END IF;
END $$;

ROLLBACK;
\echo schema smoke test passed
