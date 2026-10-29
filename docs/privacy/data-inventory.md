# Personal data inventory

Draft 0.1, 2026-10-28. V11 §12.5 requires a data inventory covering purpose, source, retention, access and disclosure. Retention periods are proposals for the privacy adviser and the Product Owner. Tables refer to [0001_canonical_schema.sql](../../db/migrations/0001_canonical_schema.sql) and [0002_analytics_events.sql](../../db/migrations/0002_analytics_events.sql).

| Data | Where | Purpose | Source | Retention (proposed) | Access | Disclosed to |
| --- | --- | --- | --- | --- | --- | --- |
| Email, display name | `app_user` | Account, sign-in, recovery | Buyer/agent | Until deletion + 30 days (backup expiry) | User; platform admin | Email provider (sending codes) |
| Roles | `user_role` | Permissions (FR-ACC-002) | Platform | Life of account | Platform admin | None |
| Saved homes, collections | Device storage (prototype); collections tables (MVP) | Shortlist (FR-SAVE-001) | Buyer | Until removed or account deleted | User; invited collaborators | Collaborators the buyer invites |
| Inspection plan, notes, ratings | Device storage (prototype); timeline tables (MVP) | Plan inspections (FR-INSP-001..003) | Buyer | Until removed or account deleted | User only | None |
| Search text | Request only; not stored with account | Interpret search (FR-SRCH-002) | Buyer | Not stored. Provider retention per contract (target ≤ 30 days, no training) | System | LLM provider (cross-border, to confirm) |
| First home check answers | Request only | Eligibility check (FR-FHB-001) | Buyer | **Not stored** | System | None |
| Concierge memory | Planned table | Continuity (FR-AI-004), with consent only | Buyer | Until revoked; 12 months of inactivity | User | LLM provider at use time |
| Consent records | Planned table | Proof of consent (APP 6, FR-LEAD-001) | Buyer | Life of account + 7 years | Platform admin, auditors | None |
| Lead details (name, contact, message) | Planned table | Agent follow-up, with consent | Buyer | 2 years after sending | Named agent and agency; platform admin | The agent the buyer chose |
| Listing Q&A | Planned table | Buyer questions (FR-QA-001) | Buyer, agent | Life of listing + 2 years | Public after moderation (buyer identity hidden by default) | Public |
| Buyer profile (display name, visibility, show-follows choice) | Planned table (MVP-2) | Optional public profile (FR-SOC-001); private by default | Buyer | Until changed or account deleted | User; public only if the buyer chooses | Public only if chosen ([social rules](social-trust-rules.md) SOC-P1..P3) |
| Follows (suburbs, homes, professionals) and notification preferences | Planned tables (MVP-2) | Send updates the buyer asked for; trending counts (FR-SOC-001, FR-TRND-001) | Buyer | Until unfollowed or account deleted | User; system | None. Not shown to agents (SOC-C3) |
| Reports on questions, answers and posts | Planned table (MVP-2) | Moderation (FR-QA-001) | Buyer | 2 years after decision | Moderator, platform admin | None |
| Agent name, email, phone | `agent` | Listing contact; verification | REAXML feed, agent | Account closure + 2 years | Public (on listings); agency admin; platform admin | Public on listings |
| Licence number and state, verification status | `agent` | Listing rights (FR-AGT-001) | Agent; state licence register | Account closure + 2 years | Platform admin | None |
| Analytics events (anonymous ID, user ID, session, surface, listing) | `analytics_event` | Launch KPIs (FR-ANL-001) | System | 25 months, then aggregated; `user_id` nulled on deletion | Product/data lead | None |
| Audit log (actor ID, action, IDs) | `audit_log` | Accountability (FR-ADM-002) | System | 7 years (append-only; IDs only, no names) | Platform admin, auditors | Regulators on lawful request |
| Feed records (raw XML incl. agent contacts) | `feed_record` | Reprocessing, troubleshooting (FR-FEED-002) | Agent CRM | 90 days raw, then mapped fields only | Platform admin | None |
| Listing text and media | `listing`, `listing_media` | Show listings | Agent | Life of listing + 2 years (sold/withdrawn kept for history, removed from search) | Public | Public |
| Server logs (IP, user agent) | Hosting | Security, diagnosis (NFR-OBS-001) | System | 30 days | Engineering | Hosting provider |

Rules that apply to every row:

- Personal data is never monetised and never used for advertising profiles (V11 §12.5).
- Deletion requests are completed within 30 days. Backups expire within 30 days.
- A new data item, or a new disclosure, needs a row here before release (Definition of Done, V11 §12.11).
