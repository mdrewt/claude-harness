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

### rb-140 — a pad-only player can work the session terminal
type: feature · tier: routine
touches: client/src/main.ts, client/src/main.remap.test.ts, client/src/main.input.test.ts, client/src/ui/sessionView.ts, client/src/ui/sessionView.test.ts, client/src/ui/sessionModel.ts, client/src/ui/sessionModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, ARCHITECTURE.md, docs/DECISIONS.md
after: []
`category: ux-a11y · severity: MED` · residual: R-close-M-gamepad-TERMPAD
While the session terminal blocks (`sessionGateBlocks`), `pollPad` (`client/src/main.ts`) lets everything go and routes nothing, so a player with only a pad cannot press Retry, Continue as guest, or the confirm step's Yes and No. The terminal stays outside the router and the overlay registry; B and Start stay inert there (CTL8K.1). decision-defaulted:terminal-pad=D-pad moves and A presses (reversible; not taken: B answering No).
- **rb-140.1:** WHILE the session terminal blocks, WHEN the pad's Down or Up edge arrives from the D-pad or the stick, THE CLIENT SHALL move focus to the next or previous shown terminal button, clamped at the ends, one button per press; from no focused terminal button it seats the default (Retry, or No while armed).
- **rb-140.2:** WHILE the session terminal blocks, WHEN a pad button bound to A goes down with a shown terminal button focused, THE CLIENT SHALL activate that button exactly once for that press, as a click would.
- **rb-140.3:** WHEN the session terminal opens, closes, arms or disarms its confirm step while a pad button is held, THE CLIENT SHALL activate nothing and route nothing from that press until the button is released and pressed again.
- **rb-140.4:** WHILE the session terminal blocks, THE CLIENT SHALL route no pad press to the game, its frames or an accelerator, SHALL do nothing for B, Start and every other button, and SHALL ignore the pad while focus is outside the game screen.
- **rb-140.5:** WHILE the session terminal blocks, THE CLIENT SHALL keep Tab, Enter and Space working as today and SHALL say in its hint, in English and French, that the D-pad also moves and A also chooses.
Tests: ordinary vitest tests at the `sessionView` and boot levels (a mocked pad), each red before the fix.

### R-np-b-SLOWLINK — a player on a slow link walks at full speed
category: netcode-determinism · severity: MED · status: promoted by operator ruling monster-realm#786 (2026-11-16) · schedule into PLAN §9 by hand
EARS: WHEN a player holds a direction over a link that adds 100 ms or 150 ms each way, THE SYSTEM SHALL move that player at five tiles a second with no stop of their own avatar between tiles, WHILE the share of presses that teleport the own avatar stays at depth 1's (0 of 450 at 60 Hz, 6 of 450 at 30 Hz), a turn pressed mid-walk is accepted, and a held walk on a local link travels no further than it does today.
touches: client/src/main.ts, docs/send-pipeline-depth.md

np-b measured it (`docs/send-pipeline-depth.md`): with one step in flight every step misses a server tick from about 92 ms of delay each way, so the walker moves at 2.5 tiles a second and stops on every tile; both measured forms of a second step in flight failed (teleports, or a full server queue that refuses a turn). The operator's direction: movement as smooth as possible, the predictor assuming a moving player keeps their direction until an event or a block interrupts, and where rubber-banding cannot be avoided, the cases named and worked around. The slice measures first and widens `touches:` to the send pipeline's files by `mr-touches`; a `type: design` slice precedes it if the measured remedy changes the server's queue.
