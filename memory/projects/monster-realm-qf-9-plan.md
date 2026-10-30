# qf-9 plan — raising screen becomes Inventory; full stats move to the Monsters Summary

Spec: specs/monster-realm-v2/M-pt3-quickfix.spec.md §qf-9 (QF9.1–QF9.3). Base: origin/master 6431dc33.
Worktree: projects/monster-realm/.claude/worktrees/qf-9 (branch qf-9).

## Functional core / imperative shell

QF9.1 (stats FIRST, same PR):
- `boxModel.ts` (pure): `MonsterStatsViewModel { trustTier, statAttack, statDefense, statSpeed,
  statSpAttack, statSpDefense }` + `buildMonsterStats(monsters: readonly StoreMonsterPub[]):
  ReadonlyMap<string, MonsterStatsViewModel>` keyed `String(monsterId)` (boxView's #cards key).
  Values copied VERBATIM from my_monster_pub (server-derived; no recompute). Total.
  WHY a separate map, not new MonsterCardViewModel fields: monstersModel.test.ts:183 `toEqual`s a
  whole card and is outside touches (hidden-dependency STOP if the card grows).
- `boxView.ts` (shell): `refresh(partySlots, boxMonsters, stats = EMPTY)` keeps `#stats`; the
  Summary part gains one line `#summaryDetail` (id `monsters-summary-stats`) =
  `tf('box.summary.stats', {trust, attack, defense, speed, spAttack, spDefense})` for the
  summary monster, read LIVE from the last refresh (a batch changing stats repaints it); empty and
  hidden when the monster has no stats row.
- `main.ts refreshBox`: passes `buildMonsterStats(monsters)` (store.ownMonsters = my_monster_pub).
- Catalog: + `box.summary.stats` en `Trust {trust} · ATK … · SP.DEF …`, fr `Confiance {trust} ·
  ATQ … · DÉF SPÉ …` (abbreviations from the retired raising.card.stats); messageIds param type.

QF9.2:
- `raisingView.ts`: delete the Monsters section (heading, card grid, Care/Train buttons, both
  in-flight lock maps, #careButtons/#trainButtons, #reanchorStrandedFocus, the `#raising-feedback`
  line + `showFeedback`, `RaisingViewCallbacks`). `refresh(vm)` renders the inventory grid only.
  Root = title + inventory heading + Bag parts (tabs bait/food/medicine/other) + legacy grid.
  Constructor: `(parent: HTMLElement, _retired?: unknown)` — the 2nd param is accepted-and-ignored
  ONLY because overlayA11yWiring.test.ts:272 (outside touches) still passes `{onTrain, onCare}`
  (TS2554 otherwise). Residual R-qf-9-RAISINGVESTIGES records it with raisingModel's now-unread
  `monsters` half (monstersModel.test.ts:571 calls the 3-arg builder; outside touches).
- `main.ts`: `new RaisingViewClass(mount)`; care arm's `line === undefined` fallback goes to the
  status line (never the deleted raising sink; unreachable in prod — care is only emitted by the
  Monsters screen under boxView — but never a silent swallow).
- Catalog retire (PARITY-04 DEAD-KEY forces it): raising.monsters.heading, raising.monsters.empty,
  raising.card.status, raising.card.stats, raising.card.care, raising.card.train (en, fr,
  messageIds). Roster 378 → 373.

QF9.3:
- Rewrite, intent preserved, against the Monsters sheet (V → A → Down to Care → A) and qf-2's sink
  (the Monsters frame's `.mr-frame-feedback` line):
  main.feedbackCore.test.ts SITES 'care' (openCare + feedback reader) driving PGCCA-A4-WHERE-PER-SITE,
  PGCCA-A1-FROZEN-PER-SITE, PGCCA-A1-LOCK-HELD; PGCCA-A4-CARE-BOOT-FR.
- PGCCA-A1-LOCK-HELD's intent (no double care while one is pending) is expected to RED on the
  sheet path (the raising card held the only lock). Fix in main.ts: per-monster in-flight care
  guard (Map<bigint, token>, generation-token release in performCare's finally; cleared in the
  reconnect reset block — the SDK never settles a reducer promise after a link drop).
- main.controls.test.ts qf-2 rows that read `#raising-feedback` / drive the raising card
  (QF2-3-BOOT-RAISING-OWN-LINE etc.) rewritten: the raising root has no care surface; no element.
- main.dispatch.test.ts: RaisingView onCare/onTrain handler rows removed (handlers gone).

## Tests (tester; tags QF9-1-*, QF9-2-*, QF9-3-*)
boxModel.test.ts (buildMonsterStats verbatim/total), boxView.test.ts (summary renders all six,
live update, fr), raisingView.test.ts (no care/train/monsters/feedback; inventory-only; delete
card-only suites), raisingView.feedbackGate.test.ts repurposed (no feedback line / no button),
main.controls.test.ts (boot: Summary shows stats from store; raising has no Care), main.feedbackCore
+ main.dispatch rows, catalog.test.ts roster + new-key fr pin.

## touches-delta (sibling tests of declared code files)
client/src/main.feedbackCore.test.ts, client/src/main.dispatch.test.ts (main.ts siblings),
client/src/ui/i18n/catalog.test.ts (catalog.en.ts sibling; qf-3/qf-6 precedent).

## Lenses
desync-guard / reducer-security-auditor: N/A (no game-core, wasm export or server change).
reviewer + red-team on the artifact; verifier last.
