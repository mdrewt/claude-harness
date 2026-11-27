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

### R-np-b-SLOWLINK — a player on a slow link walks at full speed
category: netcode-determinism · severity: MED · status: promoted by operator ruling monster-realm#786 (2026-11-16) · schedule into PLAN §9 by hand
EARS: WHEN a player holds a direction over a link that adds 100 ms or 150 ms each way, THE SYSTEM SHALL move that player at five tiles a second with no stop of their own avatar between tiles, WHILE the share of presses that teleport the own avatar stays at depth 1's (0 of 450 at 60 Hz, 6 of 450 at 30 Hz), a turn pressed mid-walk is accepted, and a held walk on a local link travels no further than it does today.
touches: client/src/main.ts, docs/send-pipeline-depth.md

np-b measured it (`docs/send-pipeline-depth.md`): with one step in flight every step misses a server tick from about 92 ms of delay each way, so the walker moves at 2.5 tiles a second and stops on every tile; both measured forms of a second step in flight failed (teleports, or a full server queue that refuses a turn). The operator's direction: movement as smooth as possible, the predictor assuming a moving player keeps their direction until an event or a block interrupts, and where rubber-banding cannot be avoided, the cases named and worked around. The slice measures first and widens `touches:` to the send pipeline's files by `mr-touches`; a `type: design` slice precedes it if the measured remedy changes the server's queue.
