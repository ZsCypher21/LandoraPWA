# Pilot sizing assumptions (v0.1)

- **Status:** Draft. These are planning assumptions, not measurements (V11 NFR-SCL-001, §13 item 9).
- **Use:** they set the performance and load-test targets (NFR-PERF-001) and the cloud sizing for the build semester. Re-check them when founding-agent LOIs land and again after the first month of pilot telemetry.

## Supply

| Item | Assumption | Reasoning |
|---|---|---|
| Pilot suburbs | 5 to 10 | V11 §8 density model |
| Founding agents | ~20, across 6 to 10 agencies | Commitment 1 |
| Active sale listings | 300 to 600 | ~20 agents × 15 to 30 active listings each |
| Active rental listings | 100 to 250 | Not all founding agencies manage rentals |
| Listings with open homes on a given Saturday | 60 to 80% of sale stock | Matches the synthetic dataset (85% have at least one) |
| Feed updates | 1,000 to 3,000 records per day | Agency CRMs push every 15 to 60 minutes, often resending unchanged stock |
| Media | ~10 photos per listing, 3 renditions each | ≈ 5 GB in year one including history |

The synthetic dataset (430 listings, 10 suburbs) sits inside this range.

## Demand

| Item | Assumption | Reasoning |
|---|---|---|
| Weekly active buyers (whole pilot) | 3,000 to 10,000 | 300 to 1,000 per suburb is the level at which V11's "proves out" signal would be credible |
| Peak concurrent users | 200 typical; design for 500 | Saturday 7 to 10 am, about 2 to 5% of weekly actives at once |
| Searches | ~15 per weekly active per week → up to 150,000 per week | Peak 20 per second; design for 50 |
| Concierge turns (metered lane) | ~3 per weekly active per week → up to 30,000 per week | Peak 5 per second; caps per tier keep this bounded (ADR 0006) |
| FHB eligibility checks | Up to 2,000 per week | Rules engine only; negligible cost |
| Listing page views | ~40 per weekly active per week | Mostly server-rendered and cacheable |

## Proposed targets (for Product Owner and Engineering approval)

| Area | Target |
|---|---|
| Structured search API | p95 under 500 ms at 50 requests per second |
| Natural-language search (intent parse + search) | p95 under 1.5 s; falls back to structured search after 4 s |
| Listing page | Largest Contentful Paint under 2.5 s on a mid-range phone on 4G |
| Concierge | First streamed text under 2.5 s p95; graceful fallback on timeout at 10 s |
| Inspection route for 8 stops | Under 1 s |
| Feed processing | A pushed file is reflected in search within 5 minutes |
| Availability | 99.5% monthly during the pilot, excluding announced maintenance |

## What would change these numbers

- **More founding agents or a larger sub-market:** supply scales roughly linearly; nothing in the architecture changes below ~50,000 listings.
- **Concierge heavier than assumed:** cost, not capacity, is the constraint. Watch cost per active user (ADR 0006) before raising caps.
- **A media-heavy feed (video, many large photos):** storage and image processing grow first; still small at pilot scale.
