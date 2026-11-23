# Gates: ts-6b-5
Spec: M-trade-sessions.spec.md#ts-6b-5
Seed: 5bfe68117d211c68
Seeded: 2026-11-13T18:06:01Z
Repo: project
Scope: M-trade-sessions slice ts-6b-5 (type: feature, tier: routine, game repo) per specs/monster-realm-v2/M-trade-sessions.spec.md §ts-6b-5 and its Fix-batch contract: pointer and controller reach — dialogue clicks, the evolution notice, sheet rows, quick Move. Builds after ts-6b-4 (merged #760). Fan-out siblings launched this tick: ts-6b-3 (server economy/inventory/npc), ts-6b-5 (client pointer/controller reach, main.ts), ts-6b-6 (tactical settle/AI tests, marshal, content_cache), tp-5 (harness repo) — all file-disjoint (mr-disjoint SAFE). None of the game-repo siblings adds i18n message ids or tables/columns/reducer signatures unless its spec says so. PR lists the residual ids it closes.
Criteria: 5 seeded, 0 shall-uncaptured
Touches: client/src/ui/dialogueView.ts, client/src/ui/dialogueView.test.ts, client/src/input/pointerSource.ts, client/src/input/pointerSource.test.ts, client/src/main.ts, client/src/main.controls.test.ts, client/src/ui/noticeModel.ts, client/src/ui/noticeModel.test.ts, client/src/ui/screens/index.ts, client/src/main.notices.test.ts, client/src/ui/screens/monstersScreen.ts, client/src/ui/screens/monstersScreen.test.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-5.1: WHEN the player clicks a dialogue choice, THE CLIENT SHALL apply the same reveal and resend guards as pressing A on it, so a double click sends `advanceDialogue` once — closes `R-weekly-review-2026-10-09-F2` (`a double click on a dialogue choice sends advanceDialogue once, and a click during the text reveal only finishes the reveal` in `client/src/main.controls.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH npx --prefix client vitest run --root client src/main.controls.test.ts -t "a double click on a dialogue choice sends advanceDialogue once, and a click during the text reveal only finishes the reveal"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-5.2: WHILE an evolution notice is shown at the bare world, WHEN the player presses B, THE CLIENT SHALL acknowledge that notice once and show the next — closes `R-ctl-13-CTL13.5` (`B at the bare world acknowledges the shown evolution notice once and the next queued notice shows` in `client/src/main.notices.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH npx --prefix client vitest run --root client src/main.notices.test.ts -t "B at the bare world acknowledges the shown evolution notice once and the next queued notice shows"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-5.3: WHEN the player clicks the only row of a list inside an open context sheet, THE CLIENT SHALL press A for that row whatever single-row lists lie under the sheet — closes `R-ctl-15-DRIVEN` (`a click on the only row of an open frame sheet presses A even when the base list under it has one row` in `client/src/input/pointerSource.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH npx --prefix client vitest run --root client src/input/pointerSource.test.ts -t "a click on the only row of an open frame sheet presses A even when the base list under it has one row"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-5.4: WHEN the player presses X on a monster in the Monsters list, THE CLIENT SHALL move it between Party and Storage as the sheet's Move row does, and the hint bar SHALL list X as Move there — closes `R-ctl-11a-XQUICKMOVE` (`X on a Party monster sends the same setPartySlot as the sheet Move; X on an empty slot does nothing` in `client/src/ui/screens/monstersScreen.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH npx --prefix client vitest run --root client src/ui/screens/monstersScreen.test.ts src/ui/hintBarModel.test.ts -t "X on a Party monster sends the same setPartySlot as the sheet Move; X on an empty slot does nothing|the Monsters frame lists X as Move between B and Start"
  EXPECT: /Tests +2 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-5.5: WHEN the Monsters screen sends a monster to the party, THE CLIENT SHALL send the one exported next-free-slot sentinel, `NEXT_FREE_PARTY_SLOT` — closes `R-pgcc-d-monstersScreen-sentinel` (no new test, the two values being equal today: `npm --prefix client run typecheck` and the existing Move cases in `client/src/ui/screens/monstersScreen.test.ts` pass).
  CHECK: npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH npx --prefix client vitest run --root client src/ui/screens/monstersScreen.test.ts -t "CTL8B-2-MOVE-COMMAND|CTL8B-2-MOVE-FEEDBACK"
  EXPECT: /Tests +2 passed \| \d+ skipped \(/
  EVIDENCE: pending
