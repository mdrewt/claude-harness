# Residuals — open follow-ups only

Open residuals only — a closed item's section is deleted; git history is the record;
categories/severity per standards/testing-tdd.md protected categories. When this file and the
append-only registry (mr-residuals.jsonl) disagree on category/severity, THIS file is the triage
record and wins.

New sections are written by `mr-gates residuals promote` from a DEFER that carried a
`[category/SEVERITY]` tag, and removed by `mr-gates residuals close` (or `residuals sweep
--apply`). Sections whose status says "carried by triage" descend from rb-* slices, so `promote`
refuses them by design (no follow-up chains): schedule them by HAND — fold into a milestone spec
or add a roadmap slice — and delete the section in that same doc-only PR. Every section carries
`EARS:` and `touches:` lines so a scheduled slice seeds a real acceptance ledger. Findings about
the checking apparatus are never tracked here.

<!-- PROMOTED SECTIONS APPEND BELOW THIS LINE -->

### rb-92 — R-rb-52-GRACEANNOUNCE
category: ux-a11y · severity: MED · status: promoted · **absorbed by M-trade-sessions `ts-6b-9` — do not build separately**
EARS: WHEN an account moves from active to deletion-grace (including via another session's sync) THE CLIENT SHALL announce the grace deadline exactly once through the live region.
touches: client/src/main.ts, client/src/ui/liveRegion.ts, client/src/ui/announcements.ts, client/src/ui/announcements.test.ts

When an account moves from active to deletion-grace (including via another session's sync), screen-reader users hear nothing. The countdown banner (client/src/main.ts:2901) is silent by design, and no one-shot announcement fires through client/src/ui/liveRegion.ts. Add a one-shot, edge-triggered announcement of the grace deadline.

### rb-94 — R-rb-53-E1
category: ux-a11y · severity: LOW · status: promoted · **absorbed by M-trade-sessions `ts-6b-9` — do not build separately**
EARS: WHEN a data export transitions from incomplete to complete THE CLIENT SHALL announce it once through the live region.
touches: client/src/ui/privacyBanner.ts, client/src/ui/liveRegion.ts, client/src/ui/privacyBanner.test.ts

When a data export finishes assembling (incomplete to complete), screen-reader users get no announcement. The status label in client/src/ui/privacyBanner.ts just updates in place. Add a one-shot announcement on that edge through the single live region in client/src/ui/liveRegion.ts.

### rb-101 — R-rb-65-RUNBOOK-LOGCAVEAT
category: security-privacy · severity: LOW · status: promoted · **absorbed by M-trade-sessions `ts-6b-1` — do not build separately**
EARS: WHEN observability-dr.md §8 lists where an erased identity survives THE RUNBOOK SHALL include the account_deletion_cascade log line and its 30-day Loki retention.
touches: docs/runbooks/observability-dr.md

docs/runbooks/observability-dr.md §8 lists where an erased account's Identity survives (shared historical rows, backups) but leaves out the operational log. The deletion cascade logs one account_deletion_cascade line containing the subject's Identity (server-module/src/accounts.rs:787-788,1054), and Loki keeps it 30 days. Add that caveat to §8.

### R-rb-128-X2 — R-rb-128-X2
category: ux-a11y · severity: LOW · status: carried by triage · **absorbed by M-trade-sessions `ts-6b-1` — do not build separately**
EARS: WHEN require_not_deleting rejects THE SERVER SHALL return a generic, accurate reason covering every gated action class.
touches: server-module/src/guards.rs, server-module/src/guards_tests.rs

The deletion-gated reject reason (guards.rs:75-76) names only trades, battles and challenges, yet it now fires on join, move, raise, evolve, rename, party edits, recruit and dismiss. Players see a misleading message. Reword it generically and update the tests that pin the exact string.

### R-np-b-SLOWLINK — a player on a slow link walks at full speed
category: netcode-determinism · severity: MED · status: promoted by operator ruling monster-realm#786 (2026-11-16) · schedule into PLAN §9 by hand
EARS: WHEN a player holds a direction over a link that adds 100 ms or 150 ms each way, THE SYSTEM SHALL move that player at five tiles a second with no stop of their own avatar between tiles, WHILE the share of presses that teleport the own avatar stays at depth 1's (0 of 450 at 60 Hz, 6 of 450 at 30 Hz), a turn pressed mid-walk is accepted, and a held walk on a local link travels no further than it does today.
touches: client/src/main.ts, docs/send-pipeline-depth.md

np-b measured it (`docs/send-pipeline-depth.md`): with one step in flight every step misses a server tick from about 92 ms of delay each way, so the walker moves at 2.5 tiles a second and stops on every tile; both measured forms of a second step in flight failed (teleports, or a full server queue that refuses a turn). The operator's direction: movement as smooth as possible, the predictor assuming a moving player keeps their direction until an event or a block interrupts, and where rubber-banding cannot be avoided, the cases named and worked around. The slice measures first and widens `touches:` to the send pipeline's files by `mr-touches`; a `type: design` slice precedes it if the measured remedy changes the server's queue.
