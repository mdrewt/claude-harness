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

### rb-139 — a recruit on the last allowed own turn is counted once: the e2e recruit loop has one home
type: feature · tier: routine
touches: client/e2e/controls.ts, client/e2e/controls.spec.ts, client/e2e/recruit.spec.ts, client/e2e/tactics-wild.spec.ts, docs/e2e-flakes.md
after: []
`category: loop-ops · severity: MED` · residual: R-th-1-RECRUIT-LASTTURN (planned as th-7)
Test code only, no product change. `docs/e2e-flakes.md` entry 2 holds the cause, the forcing recipes and the follow-up design: `recruit.spec.ts` R2 answers `'stalled'` before a Recruit pressed on its last own turn resolves, so a success is recruited twice. `tactics-wild.spec.ts` holds a second copy of the loop that already waits.
- **rb-139.1:** WHEN a Recruit pressed on the loop's last allowed own turn succeeds, THE E2E RECRUIT LOOP SHALL answer `'recruited'`, and its caller SHALL hunt no second wild.
- **rb-139.2:** WHEN the last allowed own turn has resolved and the battle is still active, THE LOOP SHALL answer `'stalled'`; WHEN it finished with no recruit, `'ended'`.
- **rb-139.3:** THE E2E SUITE SHALL hold one `fightToRecruit`, in `controls.ts`, taking its own-turn bound as an argument; both specs call it with R2's press and HP bookkeeping and BT12-5-WILD-RECRUIT's forecast-attack count kept and no assertion edited or loosened.
- **rb-139.4:** WHEN the slice merges, THE SYSTEM SHALL hold no entry 2 in `docs/e2e-flakes.md` (the register's rule: the fix deletes its entry).
Tests: one case in `controls.spec.ts` for rb-139.1, shown red against a copy of R2's present loop and green against the moved one (both runs in the PR). After the move, the entry's "R2, Recruit held" and "early answer, Recruit held" recipes run on their own spec, 12 runs each, with no run ending with an extra monster; the counts go in the PR. A probe edit never reaches the branch.

### R-np-b-SLOWLINK — a player on a slow link walks at full speed
category: netcode-determinism · severity: MED · status: promoted by operator ruling monster-realm#786 (2026-11-16) · schedule into PLAN §9 by hand
EARS: WHEN a player holds a direction over a link that adds 100 ms or 150 ms each way, THE SYSTEM SHALL move that player at five tiles a second with no stop of their own avatar between tiles, WHILE the share of presses that teleport the own avatar stays at depth 1's (0 of 450 at 60 Hz, 6 of 450 at 30 Hz), a turn pressed mid-walk is accepted, and a held walk on a local link travels no further than it does today.
touches: client/src/main.ts, docs/send-pipeline-depth.md

np-b measured it (`docs/send-pipeline-depth.md`): with one step in flight every step misses a server tick from about 92 ms of delay each way, so the walker moves at 2.5 tiles a second and stops on every tile; both measured forms of a second step in flight failed (teleports, or a full server queue that refuses a turn). The operator's direction: movement as smooth as possible, the predictor assuming a moving player keeps their direction until an event or a block interrupts, and where rubber-banding cannot be avoided, the cases named and worked around. The slice measures first and widens `touches:` to the send pipeline's files by `mr-touches`; a `type: design` slice precedes it if the measured remedy changes the server's queue.
