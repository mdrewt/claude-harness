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

### rb-141 — Controls Clear empties a shortcut's pad button too, and the Hold-Y line names the player's own key
type: feature · tier: routine
touches: client/src/main.ts, client/src/main.remap.test.ts, client/src/shell/inputState.ts, client/src/shell/inputState.test.ts, client/src/ui/controlsModel.ts, client/src/ui/controlsModel.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/tactics/strings.ts, client/src/tactics/strings.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/screens/battleScreen.test.ts, ARCHITECTURE.md, docs/DECISIONS.md
after: []
`category: ux-a11y · severity: MED` · residual: R-close-M-gamepad-PADCLEAR (also folds R-close-M-gamepad-HOLDHINT)
Two lines the client shows are untrue. Clear on a Shortcuts row calls `clearAccel` (`client/src/ui/controlsModel.ts`), which empties the keyboard row only, then says the row has no key while its pad button still opens the screen; no other control unbinds a pad accelerator. `tactics.ticker.holdToClear` says "Hold Y" to every player, but a keyboard player's Y is another key by default. `keycap` (`client/src/shell/inputState.ts`) already answers the live keycap. decision-defaulted:clear-scope=Clear empties the whole row, keys and pad button together (reversible; not taken: a separate pad Clear cell).
- **rb-141.1:** WHEN Clear is chosen on a Shortcuts row, THE CLIENT SHALL unbind that shortcut's keys and its pad button, apply both at once and save both tables in one write, and change no other row of either table.
- **rb-141.2:** WHEN a cleared shortcut's former key or pad button is pressed, THE CLIENT SHALL open nothing until it is bound again; Reset all SHALL restore both.
- **rb-141.3:** WHEN Clear has run, THE CLIENT SHALL show the row's Primary, Alt and Pad cells empty and SHALL say, in English and French, that the row has no key and no pad button; on a shortcut no pad can bind it SHALL say that it has no key.
- **rb-141.4:** WHEN the storage refuses the save, THE CLIENT SHALL still apply the Clear to both tables and SHALL report the failed save as it does today.
- **rb-141.5:** WHEN a Y tap shows the hold-to-clear line, THE CLIENT SHALL name in it, in English and French, the live keycap of the Y button for the last-used source (a remapped one too), and SHALL name Y when that source's table binds nothing to Y; the line SHALL be spoken and written as often as it is today.
Tests: ordinary vitest tests at the model, view and boot levels (a mocked pad), each red before the fix.

### R-np-b-SLOWLINK — a player on a slow link walks at full speed
category: netcode-determinism · severity: MED · status: promoted by operator ruling monster-realm#786 (2026-11-16) · schedule into PLAN §9 by hand
EARS: WHEN a player holds a direction over a link that adds 100 ms or 150 ms each way, THE SYSTEM SHALL move that player at five tiles a second with no stop of their own avatar between tiles, WHILE the share of presses that teleport the own avatar stays at depth 1's (0 of 450 at 60 Hz, 6 of 450 at 30 Hz), a turn pressed mid-walk is accepted, and a held walk on a local link travels no further than it does today.
touches: client/src/main.ts, docs/send-pipeline-depth.md

np-b measured it (`docs/send-pipeline-depth.md`): with one step in flight every step misses a server tick from about 92 ms of delay each way, so the walker moves at 2.5 tiles a second and stops on every tile; both measured forms of a second step in flight failed (teleports, or a full server queue that refuses a turn). The operator's direction: movement as smooth as possible, the predictor assuming a moving player keeps their direction until an event or a block interrupts, and where rubber-banding cannot be avoided, the cases named and worked around. The slice measures first and widens `touches:` to the send pipeline's files by `mr-touches`; a `type: design` slice precedes it if the measured remedy changes the server's queue.
