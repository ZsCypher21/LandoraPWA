# REAXML → canonical mapping contract (v0.1.0)

- **Status:** Draft for approval (V11 §13 item 3)
- **Canonical schema:** v0.1.0 (`db/migrations/0001_canonical_schema.sql`)
- **Adapter:** `packages/ingest` (built in step 2), per ADR 0008

This contract is based on the published REAXML structure. It must be checked against real exports from the founding agents' CRMs before the build semester. CRMs differ in which optional elements they send and how they format them.

## Record identity and idempotency

| REAXML | Canonical | Rule |
|---|---|---|
| `<agentID>` | `feed_source.external_agent_id` | Must match a known, active feed source, otherwise the record is rejected (`unknown_agent_id`). |
| `<uniqueID>` | `listing.source_listing_id` | Listing identity is `(agency_id, uniqueID)`. |
| `@modTime` on the listing element | `listing.source_mod_time` | Apply only if newer than the stored value. Equal or older → `skipped_stale`. Formats seen in the wild: `YYYY-MM-DD-HH:MM:SS` and ISO 8601; both are interpreted as Australia/Brisbane (QLD) or Australia/Sydney (NSW) local time per the feed source's state. |
| whole payload | `feed_record.payload_sha256` | Byte-identical resend is a no-op. |

## Listing type

| REAXML element | `listing.listing_type` | `property.property_type` |
|---|---|---|
| `<residential>` | `sale` | from `<category name>` |
| `<rental>` | `rent` | from `<category name>` |
| `<land>` | `sale` | `land` |
| `<rural>` | `sale` | `acreage` |
| `<holidayRental>`, `<commercial>`, `<commercialLand>`, `<business>` | not ingested in MVP | record `skipped`, issue `unsupported_listing_kind` |

Off-the-plan: REAXML has no dedicated element. Treat `<residential>` with `<newConstruction>yes</newConstruction>` **and** an agent-console flag as `off_the_plan`. Confirm with founding agents how they mark project stock.

`<category name>` → `property_type`: `House`→`house`, `Townhouse`→`townhouse`, `Unit`→`unit`, `Apartment`/`Studio`/`Flat`→`apartment`, `Villa`→`villa`, `DuplexSemi-detached`→`duplex`, `Acreage`/`AcreageSemi-rural`→`acreage`, anything else→`other` with advisory issue `unmapped_category`.

## Status

| REAXML `@status` | `listing.status` | Publication effect |
|---|---|---|
| `current` (+ `<underOffer value="yes">`) | `under_offer` | stays published if already eligible |
| `current` | `current` | eligible for publication |
| `sold` | `sold` | unpublished automatically |
| `leased` | `leased` | unpublished automatically |
| `withdrawn` | `withdrawn` | unpublished automatically |
| `offmarket` | `off_market` | unpublished automatically |
| `deleted` | `withdrawn` | unpublished; audit reason `feed_deleted` |

## Address and location

| REAXML | Canonical | Rule |
|---|---|---|
| `address/subNumber` | `property.unit_number` | optional |
| `address/streetNumber` | `property.street_number` | required, else reject `missing_address` |
| `address/street` | `property.street_name` | required |
| `address/suburb` | `property.suburb_id` | matched to `suburb` by name + state + postcode; no match → reject `unknown_suburb` (pilot area only) |
| `address/state` | `property.state` | normalised to `QLD`/`NSW` etc. |
| `address/postcode` | `property.postcode` | 4 digits |
| `address/@display="no"` | display flag in listing payload | street address hidden on public pages; suburb still shown |
| (none) | `property.location` | geocoded via G-NAF match, never from the feed alone. Unmatched → advisory `not_geocoded`, and the listing is excluded from inspection routing |

Property matching: an existing `property` is reused when the G-NAF PID matches; otherwise when normalised unit + street number + street + suburb match exactly. A fuzzy match is never applied automatically; it raises a `data_conflict` for admin review.

## Price and rent

| REAXML | Canonical | Rule |
|---|---|---|
| `price` | `price_min_aud` | integer AUD |
| `price/@display="no"` | `price_hidden = true` | The numeric price is stored for search filtering only and **never** shown or used by the concierge in answers. |
| `priceView` | `price_display` | shown verbatim |
| `price` + `priceView` range like "$650,000 - $700,000" | `price_min_aud`/`price_max_aud` | parse the range from `priceView` only when it is an unambiguous numeric range, else max = min |
| `rent` (`@period="week"`) | `rent_per_week_aud` | `month` periods converted ×12/52 and flagged advisory `rent_period_converted` |
| `bond` | `bond_aud` | |
| `dateAvailable` | `available_from` | |
| `soldDetails/price`, `soldDetails/date` | `sold_price_aud`, `sold_at` | `soldDetails/price/@display="no"` → `sold_price_disclosed = false` |

## Attributes

| REAXML | Canonical |
|---|---|
| `headline` | `listing.headline` |
| `description` | `listing.description` (stored as text; HTML stripped) |
| `features/bedrooms`, `bathrooms` | `bedrooms`, `bathrooms` |
| `features/garages` + `carports` + `openSpaces` | `car_spaces` (sum) |
| `features/*` boolean elements (`pool`, `airConditioning`, `alarmSystem`, ...) with value `1`/`yes` | `features[]` as snake_case tags |
| `features/otherFeatures` | split on commas into `features[]` |
| `landDetails/area` (`@unit`) | `property.land_area_m2` (converted from `hectare`, `acre`, `squareFeet`) |
| `buildingDetails/area` | `listing.building_area_m2` |
| `auction/@date` | `listing.auction_at` |

## Inspections and media

| REAXML | Canonical | Rule |
|---|---|---|
| `inspectionTimes/inspection` text, e.g. `21-Dec-2026 11:00am to 11:30am` | `inspection.starts_at/ends_at` | Parsed in the feed's local time zone. Unparseable → advisory `unparsed_inspection` (not silently dropped). Feed replaces the full set of future inspections for that listing. |
| `objects/img` (`@url`, `@id` order) | `listing_media` kind `photo` | `@id="m"` is the main image → `position 0`. Images are copied to object storage; `source_url` keeps the origin. |
| `objects/floorplan` | `listing_media` kind `floorplan` | |
| `videoLink/@href` | `listing_media` kind `video` | |
| `listingAgent` (`name`, `email`, `telephone`) | `listing_agent` → `agent` | Matched by email within the agency. Unknown agent → listing held `unpublished` with issue `unknown_listing_agent` until the agent is onboarded and verified. |

## Validation issues

Every issue is stored on `feed_record.issues` as `{ code, severity, path, message }`.

- **reject** (record not applied): `malformed_xml`, `unknown_agent_id`, `missing_unique_id`, `missing_address`, `unknown_suburb`, `unsupported_listing_kind`.
- **hold** (applied but kept unpublished): `unknown_listing_agent`, `agent_unverified`, `compliance_blocking`.
- **advisory** (applied, shown to the agent in the console): `unmapped_category`, `not_geocoded`, `unparsed_inspection`, `rent_period_converted`, `unknown_element`.

## Provenance

All fields set from a feed record get `source_type = 'reaxml'`, `source_ref = feed_record.id` and `source_observed_at = feed_record.received_at`. Synthetic feeds use the same mapping with `source_type = 'synthetic'`.
