-- Landora canonical property/listing schema v0.1.0
-- See docs/data/canonical-schema.md and ADRs 0004, 0005, 0007, 0008.
-- Conventions: uuid primary keys, timestamptz in UTC, text + CHECK instead of ENUM types,
-- every externally sourced row carries source_type / source_ref / source_observed_at.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Source types, in V11 §12.7 authority order. 'synthetic' marks §14.4 fallback data.
CREATE DOMAIN source_type AS text CHECK (VALUE IN (
  'rules', 'government', 'licensed', 'reaxml', 'agent_manual', 'user', 'ai', 'synthetic'
));

CREATE DOMAIN au_state AS text CHECK (VALUE IN ('QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'));

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- identity and RBAC (FR-ACC-001/002)

CREATE TABLE app_user (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  email_verified_at timestamptz,
  display_name   text,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX app_user_email_uq ON app_user (lower(email));

-- ---------------------------------------------------------------- geography

CREATE TABLE suburb (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  state       au_state NOT NULL,
  postcode    text NOT NULL CHECK (postcode ~ '^[0-9]{4}$'),
  boundary    geometry(MultiPolygon, 4326),
  is_pilot    boolean NOT NULL DEFAULT false,
  source_type source_type NOT NULL,
  source_ref  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, state, postcode)
);
CREATE INDEX suburb_boundary_gix ON suburb USING gist (boundary);

-- ---------------------------------------------------------------- agencies and agents (FR-AGT-001)

CREATE TABLE agency (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  abn                 text CHECK (abn ~ '^[0-9]{11}$'),
  licence_number      text,
  licence_state       au_state,
  verification_status text NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN ('pending', 'verified', 'exception_approved', 'rejected', 'lapsed')),
  verified_at         timestamptz,
  next_recheck_at     timestamptz,
  plan                text NOT NULL DEFAULT 'founding_free',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid UNIQUE REFERENCES app_user (id),
  agency_id           uuid NOT NULL REFERENCES agency (id),
  full_name           text NOT NULL,
  email               text,
  phone               text,
  licence_number      text,
  licence_state       au_state,
  -- 'exception_approved' requires an authorised approver, recorded in audit_log (FR-AGT-001).
  verification_status text NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN ('pending', 'verified', 'exception_approved', 'rejected', 'lapsed')),
  verification_source text,
  verified_at         timestamptz,
  next_recheck_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (verification_status NOT IN ('verified', 'exception_approved') OR verified_at IS NOT NULL)
);
CREATE INDEX agent_agency_idx ON agent (agency_id);

-- Roles are scoped: agent / agency_admin roles are scoped to an agency.
CREATE TABLE user_role (
  user_id    uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('buyer', 'agent', 'agency_admin', 'moderator', 'platform_admin')),
  agency_id  uuid REFERENCES agency (id),
  granted_by uuid REFERENCES app_user (id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((role IN ('agent', 'agency_admin')) = (agency_id IS NOT NULL))
);
CREATE UNIQUE INDEX user_role_uq ON user_role (user_id, role, coalesce(agency_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------- property (the physical place)

CREATE TABLE property (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gnaf_pid           text UNIQUE,                -- G-NAF address identifier when matched
  unit_number        text,
  street_number      text NOT NULL,
  street_name        text NOT NULL,
  suburb_id          uuid NOT NULL REFERENCES suburb (id),
  state              au_state NOT NULL,
  postcode           text NOT NULL CHECK (postcode ~ '^[0-9]{4}$'),
  location           geography(Point, 4326),
  lot_plan           text,
  land_area_m2       numeric(12, 2) CHECK (land_area_m2 > 0),
  property_type      text NOT NULL CHECK (property_type IN (
                       'house', 'townhouse', 'unit', 'apartment', 'villa', 'land', 'acreage', 'duplex', 'other')),
  source_type        source_type NOT NULL,
  source_ref         text,
  source_observed_at timestamptz NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_location_gix ON property USING gist (location);
CREATE INDEX property_suburb_idx ON property (suburb_id);

-- ---------------------------------------------------------------- feeds (FR-FEED-001/002)

CREATE TABLE feed_source (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        uuid NOT NULL REFERENCES agency (id),
  kind             text NOT NULL CHECK (kind IN ('reaxml', 'agent_manual', 'synthetic')),
  -- REAXML agentID used by the agency's CRM; part of listing identity.
  external_agent_id text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'degraded', 'failing', 'disabled')),
  last_received_at timestamptz,
  last_success_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, external_agent_id)
);

-- One raw inbound record. Raw payload kept so any record can be reprocessed.
CREATE TABLE feed_record (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_source_id    uuid NOT NULL REFERENCES feed_source (id),
  received_at       timestamptz NOT NULL DEFAULT now(),
  source_listing_id text,                        -- REAXML uniqueID
  source_mod_time   timestamptz,                 -- REAXML modTime
  payload           text NOT NULL,
  payload_sha256    text NOT NULL,
  stage             text NOT NULL DEFAULT 'received'
                    CHECK (stage IN ('received', 'parsed', 'validated', 'mapped', 'applied', 'skipped_stale', 'rejected')),
  issues            jsonb NOT NULL DEFAULT '[]'::jsonb,
  attempts          integer NOT NULL DEFAULT 0,
  processed_at      timestamptz,
  UNIQUE (feed_source_id, payload_sha256)
);
CREATE INDEX feed_record_stage_idx ON feed_record (stage, received_at);
CREATE INDEX feed_record_listing_idx ON feed_record (feed_source_id, source_listing_id);

-- ---------------------------------------------------------------- listing (one marketing campaign)

CREATE TABLE listing (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id        uuid NOT NULL REFERENCES property (id),
  agency_id          uuid NOT NULL REFERENCES agency (id),
  feed_source_id     uuid REFERENCES feed_source (id),
  source_listing_id  text NOT NULL,
  listing_type       text NOT NULL CHECK (listing_type IN ('sale', 'rent', 'off_the_plan')),
  -- Canonical lifecycle; mapped from REAXML status (docs/data/reaxml-mapping.md).
  status             text NOT NULL CHECK (status IN ('draft', 'current', 'under_offer', 'sold', 'leased', 'withdrawn', 'off_market')),
  -- Publication is separate from status: a current listing is published only when the agent is verified
  -- and the compliance evaluation has no blocking failures (FR-CMP-002).
  publication_state  text NOT NULL DEFAULT 'unpublished'
                     CHECK (publication_state IN ('unpublished', 'blocked', 'published')),
  published_at       timestamptz,
  headline           text,
  description        text,
  price_display      text,                       -- exactly as the agent advertises it
  price_min_aud      integer CHECK (price_min_aud >= 0),
  price_max_aud      integer CHECK (price_max_aud >= 0),
  price_hidden       boolean NOT NULL DEFAULT false,
  rent_per_week_aud  integer CHECK (rent_per_week_aud >= 0),
  bond_aud           integer CHECK (bond_aud >= 0),
  available_from     date,
  bedrooms           smallint CHECK (bedrooms >= 0),
  bathrooms          smallint CHECK (bathrooms >= 0),
  car_spaces         smallint CHECK (car_spaces >= 0),
  building_area_m2   numeric(10, 2) CHECK (building_area_m2 > 0),
  features           text[] NOT NULL DEFAULT '{}',
  auction_at         timestamptz,
  sold_at            date,
  sold_price_aud     integer CHECK (sold_price_aud >= 0),
  sold_price_disclosed boolean,
  off_the_plan       jsonb,                      -- stage, estimated completion, developer
  compliance_status  text NOT NULL DEFAULT 'not_evaluated'
                     CHECK (compliance_status IN ('not_evaluated', 'ready', 'blocked', 'advisory')),
  source_type        source_type NOT NULL,
  source_mod_time    timestamptz NOT NULL,       -- last applied REAXML modTime (idempotency)
  source_observed_at timestamptz NOT NULL,
  search_tsv         tsvector GENERATED ALWAYS AS (
                       to_tsvector('english', coalesce(headline, '') || ' ' || coalesce(description, ''))) STORED,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, source_listing_id),
  CHECK (price_min_aud IS NULL OR price_max_aud IS NULL OR price_min_aud <= price_max_aud),
  CHECK (listing_type <> 'rent' OR price_min_aud IS NULL),
  CHECK (publication_state <> 'published' OR (published_at IS NOT NULL AND status IN ('current', 'under_offer')))
);
CREATE INDEX listing_search_idx ON listing (publication_state, listing_type, status);
CREATE INDEX listing_property_idx ON listing (property_id);
CREATE INDEX listing_tsv_gin ON listing USING gin (search_tsv);
CREATE INDEX listing_price_idx ON listing (price_min_aud, price_max_aud);

CREATE TABLE listing_agent (
  listing_id uuid NOT NULL REFERENCES listing (id) ON DELETE CASCADE,
  agent_id   uuid NOT NULL REFERENCES agent (id),
  position   smallint NOT NULL DEFAULT 1,
  PRIMARY KEY (listing_id, agent_id)
);

CREATE TABLE listing_media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES listing (id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('photo', 'floorplan', 'video', 'virtual_tour', 'document')),
  position      smallint NOT NULL DEFAULT 0,
  url           text NOT NULL,
  source_url    text,
  caption       text,
  width_px      integer,
  height_px     integer,
  ai_generated  boolean NOT NULL DEFAULT false, -- AI media must be labelled (V11 §5.3)
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listing_media_listing_idx ON listing_media (listing_id, position);

-- Published open-home times (FR-INSP-001).
CREATE TABLE inspection (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listing (id) ON DELETE CASCADE,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  kind        text NOT NULL DEFAULT 'open_home' CHECK (kind IN ('open_home', 'by_appointment')),
  source_type source_type NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (listing_id, starts_at)
);
CREATE INDEX inspection_time_idx ON inspection (starts_at);

-- Embeddings keyed by model so models can change without migrating listing (ADR 0004).
-- Dimension is fixed per model; store one row per (listing, model). Index per model in later migrations.
CREATE TABLE listing_embedding (
  listing_id   uuid NOT NULL REFERENCES listing (id) ON DELETE CASCADE,
  model        text NOT NULL,
  content_sha256 text NOT NULL,                -- re-embed only when content changes
  embedding    vector NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, model)
);

-- ---------------------------------------------------------------- enrichment and conflicts (FR-LST-002, §12.7)

CREATE TABLE property_enrichment (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    uuid REFERENCES property (id) ON DELETE CASCADE,
  suburb_id      uuid REFERENCES suburb (id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN (
                   'sales_history', 'avm', 'comparables', 'suburb_stats', 'school_catchment', 'planning_overlay', 'zoning')),
  provider       text NOT NULL,                -- e.g. 'cotality', 'qld_gov_open_data', 'synthetic'
  licence_ref    text,
  source_type    source_type NOT NULL,
  -- Placeholder figures (§14.4) must never be presented to users as real data.
  is_placeholder boolean NOT NULL DEFAULT false,
  effective_date date NOT NULL,
  retrieved_at   timestamptz NOT NULL,
  expires_at     timestamptz,
  payload        jsonb NOT NULL,
  CHECK (property_id IS NOT NULL OR suburb_id IS NOT NULL),
  CHECK (source_type <> 'synthetic' OR is_placeholder)
);
CREATE INDEX property_enrichment_property_idx ON property_enrichment (property_id, kind);
CREATE INDEX property_enrichment_suburb_idx ON property_enrichment (suburb_id, kind);

-- A material disagreement between sources, surfaced as "conflicting" rather than resolved by invention.
CREATE TABLE data_conflict (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity       text NOT NULL CHECK (entity IN ('property', 'listing')),
  entity_id    uuid NOT NULL,
  field        text NOT NULL,
  observed_values jsonb NOT NULL,                 -- [{source_type, source_ref, value, observed_at}]
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'accepted')),
  resolved_by  uuid REFERENCES app_user (id),
  resolution   text,
  detected_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);
CREATE INDEX data_conflict_entity_idx ON data_conflict (entity, entity_id) WHERE status = 'open';

-- ---------------------------------------------------------------- rules and compliance (FR-CMP-001..003, ADR 0007)

CREATE TABLE rule_pack (
  id             text NOT NULL,                -- e.g. 'qld.publication'
  version        text NOT NULL CHECK (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  jurisdiction   au_state NOT NULL,
  domain         text NOT NULL CHECK (domain IN ('publication_compliance', 'fhb_entitlement')),
  definition     jsonb NOT NULL,
  definition_sha256 text NOT NULL,
  effective_from date NOT NULL,
  effective_to   date,
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'retired')),
  approved_by    uuid REFERENCES app_user (id),
  approved_at    timestamptz,
  activated_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version),
  CHECK (status NOT IN ('approved', 'active') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
-- At most one active version per pack.
CREATE UNIQUE INDEX rule_pack_one_active ON rule_pack (id) WHERE status = 'active';

CREATE TABLE compliance_evaluation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES listing (id) ON DELETE CASCADE,
  rule_pack_id      text NOT NULL,
  rule_pack_version text NOT NULL,
  outcome           text NOT NULL CHECK (outcome IN ('pass', 'fail_blocking', 'pass_with_advisories')),
  results           jsonb NOT NULL,            -- per-rule result, reason, citations
  input_snapshot    jsonb NOT NULL,            -- facts evaluated, for explainability
  evaluated_at      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (rule_pack_id, rule_pack_version) REFERENCES rule_pack (id, version)
);
CREATE INDEX compliance_evaluation_listing_idx ON compliance_evaluation (listing_id, evaluated_at DESC);

-- ---------------------------------------------------------------- audit (FR-ADM-002)

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid REFERENCES app_user (id),
  actor_kind  text NOT NULL CHECK (actor_kind IN ('user', 'system', 'ingestion')),
  action      text NOT NULL,                   -- e.g. 'listing.publish', 'agent.exception_approve'
  entity      text NOT NULL,
  entity_id   text NOT NULL,
  before      jsonb,
  after       jsonb,
  reason      text,
  request_id  text
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity, entity_id, occurred_at DESC);

-- Audit rows are append-only.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- ---------------------------------------------------------------- updated_at triggers

CREATE TRIGGER app_user_updated BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER agency_updated BEFORE UPDATE ON agency FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER agent_updated BEFORE UPDATE ON agent FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER property_updated BEFORE UPDATE ON property FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER feed_source_updated BEFORE UPDATE ON feed_source FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER listing_updated BEFORE UPDATE ON listing FOR EACH ROW EXECUTE FUNCTION set_updated_at();
