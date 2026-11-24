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

### rb-138 — a pad-only player can leave any waiting Controls cell without a change

type: feature · tier: routine
touches: client/src/main.ts, client/src/main.remap.test.ts, client/src/ui/controlsModel.ts, client/src/ui/controlsModel.test.ts, client/src/ui/screens/optionsScreen.ts, client/src/ui/screens/optionsScreen.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/e2e/pad-controls.spec.ts, ARCHITECTURE.md, docs/DECISIONS.md
after: []
`category: ux-a11y · severity: MED` · residuals: R-gp-5-NOTE389633 (promoted) and R-close-M-gamepad-PADCELLEXIT (dispositioned fixed at this slice's merge)

While a Key cell waits, `pollPad` (`client/src/main.ts`) ignores every pad press, so a player with only a pad who presses A on a keyboard cell cannot get out. An empty Pad cell (8 of the 10 Shortcuts rows by default) has the same trap: there is no shown button to press again, and B is refused as protected. decision-defaulted:pad-capture-exit=B cancels (reversible, the live B binding; alternatives not taken: disabling Key cells after pad input, a timeout).

- **rb-138.1:** WHILE a Key cell of Controls waits for a key, WHEN a pad button bound to B is pressed, THE CLIENT SHALL end the capture with the tables unchanged, say the cancelled line, and route that press nowhere else (it acts again only once released and pressed again).
- **rb-138.2:** WHILE a Key cell waits, WHEN any other pad button is pressed, THE CLIENT SHALL keep waiting and route nothing, as today.
- **rb-138.3:** WHILE a Pad cell whose row has no pad button waits, WHEN a pad button bound to B is pressed, THE CLIENT SHALL end the capture with the pad table unchanged and say the cancelled line.
- **rb-138.4:** WHILE a Pad cell whose row has a pad button waits, THE CLIENT SHALL treat a press as today: the shown button cancels, a free or unprotected one binds or swaps, and a swap that would leave a protected button without a pad button is refused.
- **rb-138.5:** WHILE either kind of cell waits and the player's last input is the pad, THE CLIENT SHALL name the pad button that leaves the cell unchanged in the waiting line.

Tests: ordinary vitest tests at `controlsModel`, `optionsScreen` and the `main.remap` boot level, each red before the fix; extend `pad-controls.spec.ts` (mocked pad only) with one Key-cell exit and one empty-Pad-cell exit. Out of scope: the session terminal's pad control (R-close-M-gamepad-TERMPAD).

### R-np-b-SLOWLINK — a player on a slow link walks at full speed
category: netcode-determinism · severity: MED · status: promoted by operator ruling monster-realm#786 (2026-11-16) · schedule into PLAN §9 by hand
EARS: WHEN a player holds a direction over a link that adds 100 ms or 150 ms each way, THE SYSTEM SHALL move that player at five tiles a second with no stop of their own avatar between tiles, WHILE the share of presses that teleport the own avatar stays at depth 1's (0 of 450 at 60 Hz, 6 of 450 at 30 Hz), a turn pressed mid-walk is accepted, and a held walk on a local link travels no further than it does today.
touches: client/src/main.ts, docs/send-pipeline-depth.md

np-b measured it (`docs/send-pipeline-depth.md`): with one step in flight every step misses a server tick from about 92 ms of delay each way, so the walker moves at 2.5 tiles a second and stops on every tile; both measured forms of a second step in flight failed (teleports, or a full server queue that refuses a turn). The operator's direction: movement as smooth as possible, the predictor assuming a moving player keeps their direction until an event or a block interrupts, and where rubber-banding cannot be avoided, the cases named and worked around. The slice measures first and widens `touches:` to the send pipeline's files by `mr-touches`; a `type: design` slice precedes it if the measured remedy changes the server's queue.
