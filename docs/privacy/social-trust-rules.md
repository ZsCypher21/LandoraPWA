# Social hub: trust and privacy rules

Draft 0.1, 2026-10-29, for project lead and Product Owner review. Applies to the social preview now ([ADR 0012](../adr/0012-social-hub-preview-with-mock-data.md)) and to the MVP-2 build (FR-SOC-001, FR-HUB-001, FR-QA-001, FR-AGT-004, FR-LEAD-001). V11 references: §4, §5.2, §12.5, §12.6, §12.7.

Each rule has an ID so tests, stories and the launch gate can refer to it. "Preview" says how the prototype shows it.

## Profiles

| ID | Rule | Preview |
| --- | --- | --- |
| SOC-P1 | A buyer profile is **private by default**. Nobody else sees it until the buyer chooses otherwise. | Profile screen starts on "Private". |
| SOC-P2 | Visibility choices are "Private" or "Public profile". Public shows a display name (first name and last initial), suburbs followed only if the buyer also turns that on, and nothing else. | Two choices plus a separate "show suburbs I follow" switch, off by default, with a live "what others see" card. |
| SOC-P3 | Follows, saves, inspection plans, notes, FHB answers, readiness and contact details are **never** shown on a profile. | Not shown, and stated on the screen. |
| SOC-P4 | Questions a buyer asks are shown as "A buyer" whatever the profile setting. Identity reaches the agent only through a lead the buyer consents to (FR-AGT-004, FR-LEAD-001). | Q&A always shows "A buyer"; the agent sees "identity not shared". |
| SOC-P5 | Professional profiles (agents now; industry in phase two) are public because they advertise. They show the verified licence badge only when verification is current (FR-AGT-001). | Agent profile shows the dataset's verification status. |

## Consent and follows

| ID | Rule | Preview |
| --- | --- | --- |
| SOC-C1 | Following is always a deliberate tap. Nothing is followed automatically (for example on save or view). | Follow buttons only. |
| SOC-C2 | Notifications are per topic and per channel. In-app updates for things you follow default **on**; email and push default **off** and are opt-in; marketing defaults **off** on every channel (backlog FR-SOC-001). | Preference grid with those defaults. |
| SOC-C3 | Follow and notification data is used to send updates the buyer asked for and for trending counts. It is not shared with agents and not used for ads (§12.5). Intent scoring may use it internally, but disclosure needs consent (FR-LEAD-001). | Stated on the follows screen. |
| SOC-C4 | A buyer can unfollow anything and delete all follows and their profile at once. | Unfollow per item; "Delete my data" on the account page already covers device data. |

## Content and moderation

| ID | Rule | Preview |
| --- | --- | --- |
| SOC-M1 | Suburb Hub v1 shows only approved seeded content: Landora editorial, Landora data and founding-creator posts. **No comments** (FR-HUB-001). | Hub has no comment box and says why. |
| SOC-M2 | Every post shows its author type and provenance, and data posts say where the numbers came from (§12.7: label contributed content). | Author and source line on each card. |
| SOC-M3 | Buyer questions are listing-specific, 10 to 300 characters, and must not contain phone numbers, email addresses or links. They are held for moderation before anyone else sees them (FR-QA-001). | Validation on the ask form; new questions show "Waiting for moderation". |
| SOC-M4 | Answers come only from an agent who manages the listing, and are labelled "Answer from the agent". | Server checks agent scope. |
| SOC-M5 | Anyone signed in can report a question, answer or post. **Reports go to the Moderator queue**, and reported Q&A is hidden pending review (backlog FR-QA-001). Seeded posts stay visible until a Moderator decides, because they were already approved. | Report button; Moderator approves, rejects, restores or removes. |
| SOC-M6 | Moderation decisions need a reason and are written to the audit log (FR-ADM-002). | Uses the existing audit log. |
| SOC-M7 | Open commenting, the industry catalogue, specialist streams and pinboards are out of MVP-2 v1 (§4, FR-PIN-001 is P2). | Not built. |

## AI and the concierge

| ID | Rule | Preview |
| --- | --- | --- |
| SOC-A1 | **The concierge never posts, asks, answers, follows or reports as a user, an agent or Landora staff.** It has no social permissions. | No AI author type exists; tests check it. |
| SOC-A2 | Any AI-assisted drafting of seeded content (for example a weekly wrap) is reviewed and approved by a person, and the post names that person's role as the author. Numbers come from the data source, not from the model (§12.6). | Not built; seeded posts are written by hand. |
| SOC-A3 | The concierge may cite approved hub content and answered Q&A as sources, with the label "community content, not verified property fact" (§12.7). | Not built. |

## Open questions for the Product Owner

1. Moderation service level for reports (proposal: 1 business day in the pilot) and who staffs it.
2. Whether hiding Q&A on the first report is right, or whether a threshold is needed once volume grows (abuse risk: one person hiding any question).
3. Whether a public buyer profile is needed at all in MVP-2, or whether "Private only" is enough until phase two. Dropping it would cut scope.
