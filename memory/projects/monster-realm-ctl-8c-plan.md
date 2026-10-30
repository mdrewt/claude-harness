# ctl-8c plan — Monsters II: Care, Feed…, Evolve… on the monster sheet (rev 2, after plan lenses)

Spec: `specs/monster-realm-v2/M-postgate-console-controls.spec.md#ctl-8c` (re-serialized in harness
PR #153: boxView.ts/boxView.test.ts in touches; CTL8C.2 moved to ctl-13 as CTL13.5). Base:
origin/master 547a087a (ctl-8b). Worktree `.claude/worktrees/ctl-8c`, branch `ctl-8c`, PR #555.
Pattern: ctl-8b (`monstersScreen` / `BoxView.paint`), ctl-8a's shop confirm (Yes/No, No default).
Plan lenses (reviewer + red-team, 2026-10-03) folded in below; their findings are marked [L].

## Scope (right-sized)

- BUILD: **CTL8C.1** (Care, Feed…, Evolve… on the sheet; Feed… = food list, no confirm; Evolve… =
  path list, disabled with a reason when there are none, confirm defaults to No; "✓ Fed {name}"
  catalogued) + **CTL8C.3** (non-regression: KeyI/KeyE still open the raising/evolution roots) +
  the named e2e change (`evolution.spec.ts` V2).
- DEFER: **CTL8C.2** → ctl-13 / CTL13.5 (spec line ~979; needs `main.ts` probe/handle wiring).
- NOT BUILT (found, residuals):
  - R-ctl-8c-CTL8C.1-RAISINGSTRIP: stripping raising's per-monster Care/Train cards ("leaves the raising
    root holding only its inventory list"). `RaisingViewCallbacks.onCare/onTrain` and
    `buildRaisingViewModel(monsters, …)` are consumed by `main.ts` (ctor ≈3051, refreshRaising
    ≈2267), and `main.feedbackCore.test.ts:384`, `main.controls.test.ts:2168`,
    `main.dispatch.test.ts:1241` (outside touches) click the raising Care button. [L] ctl-8f has
    the same blocker → target **ctl-11b** (owns main.ts). The sheet duplicates those actions
    until then; spec lines 706 / 1214 ("inventory only since ctl-8c") need the supervisor's amend.
  - R-ctl-8c-CTL8C.1 (Care feedback): Care from the sheet shows no outcome line (most presses are 6 h
    cooldown refusals): `dispatch('care')` reports through `performCare({ showFeedback:
    raisingView.showFeedback })`, a no-op while raising is hidden (main.ts ≈1108). Needs main.ts →
    **ctl-13** (error toast). `train`/`evolve` refusals already reach `reportError` (sendGuarded).
  - [L] The Evolve… list is a BoxView part, not the evolution root (spec line 658 says "the
    evolution root hosts the Evolve… list"): `monstersScreen` paints only the BoxView and there is
    no open-frame Command. The evolution root is untouched; the KeyE e2e case survives. Build note.

## Hidden dependency, flagged (proceeding, not parking) [L]
`client/src/ui/screens/index.test.ts` (NOT a sibling of a declared file: `screens/index.ts` is
outside ctl-8c's touches) must change in its ctl-8b host-flow case `CTL8B-4-HOST-FLOW`
(≈2163-2310): (1) `monstersFlowCtx`'s partial store fake lacks `ownInventory` / `itemDefs`, which
the new `viewModel` reads (a TypeError otherwise; production code will NOT be made tolerant of a
partial fake); (2) its "Down twice and A on Move" route lands on Feed… under the design-§5 order
(becomes one Up: the list wraps to Move). Fixture-only, named intentional changes; listed under
`touches-delta:` with a HIDDEN-DEPENDENCY flag and in the handoff for the supervisor to
re-serialize (add `screens/index.test.ts` to ctl-8c's touches) or bounce.

## Seam dry-run (verified against master 547a087a)

- Commands exist: `care {monsterId}`, `train {monsterId, foodItemId}`, `evolve {monsterId,
  toSpecies}` (screens/types.ts:26-28); `dispatch` arms at main.ts:1108/1117/1121. No new arm,
  no main.ts.
- The sheet is painted only by `boxView.ts`; `monstersScreen` is `ScreenAdapter<MonstersVm,
  MonstersScreenState, BoxView>`, so the food list, the Evolve list and its confirm are BoxView
  parts.
- Store reads for the view model: `ownInventory(identity)` + `itemDefs()` (food = the data-driven
  `canTrain && count > 0` from `raisingModel`), and `buildEvolutionViewModel(monsters,
  speciesMap, paths).monsters` (the SAME eligibility port; `choices` non-empty only at 2+
  eligible — never re-derived).
- [L] Router bindings: `KeyboardSource` runs on `routedBindings(DEFAULT_BINDINGS)` (main.ts:1037,
  router.ts:84): LB/RB are PageUp/PageDown ONLY; KeyE/KeyQ stay the legacy ladder's. The e2e
  must press `routedBindings(DEFAULT_BINDINGS).buttons.RB[0]` (= PageDown; `router.ts` has only
  type imports + `./buttons`, so it loads under Playwright), never `pressButton(page, 'RB')`.
- Design §5 row 1 fixes the sheet order: **Summary, Care, Feed…, Evolve…, Nickname, Move**.
- Inventory: at most ONE row per (owner, item_id) (schema.rs:457); foods key by `itemId`;
  `buildMonstersVm` dedupes defensively (first wins) because `list()` throws on a duplicate key
  and a throw in `viewModel` starves the host. Paths dedupe by edgeId the same way.
- The starter sits in party slot 0 (movement.rs:108); Storage is empty for a fresh identity.
- `BoxView.refresh` receives cards only (main.ts:2245) and ctl-8b's `settle` compares KEYS only:
  everything the new parts paint that can change without a key change (counts, met/choice flags,
  canFeed/canEvolve, the confirm text) must make `observe` return a NEW state. [L]

## Functional core

### `ui/raisingModel.ts` (pure, in touches)
- Export `buildInventoryItems(inventory, itemDefs): InventoryItemViewModel[]` (the existing
  `toItem` map; `buildRaisingViewModel` calls it). SSOT for "what is food".

### `ui/monstersModel.ts` (pure)
- `SheetAction = 'summary' | 'care' | 'feed' | 'evolve' | 'nickname' | 'move'`;
  `SHEET_ACTIONS` in design order; `SHEET_LAYOUT` const REPLACED by
  `sheetLayout(canFeed: boolean, canEvolve: boolean): ItemLayout` (feed/evolve `enabled`).
- `interface FoodVm { itemId: number; name: string; count: number }`.
- `MonstersVm` += `foods: readonly FoodVm[]` (`canTrain && count > 0`, sorted by itemId [L],
  deduped) and `evolution: readonly EvolutionMonsterViewModel[]` (one per own monster).
- `buildMonstersVm(monsters, speciesMap, partySize, partySlotNone, paths = [], items = [])`.
- `findEvolution(vm, monsterId)`; `canEvolve(mon) = mon.paths.length > 0` [L] (NOT
  `choices.length`); `isChoice(mon, pathKey)`; `foodKey(itemId)` / `pathKey(edgeId)` = decimal;
  `foodLayout(vm)` (all enabled); `pathLayout(mon)` (enabled iff a choice);
  `firstPathKey(mon)` = the first choice, else the first path, else null.

### `ui/screens/monstersScreen.ts` (pure adapter)
- `MonstersPhase` += `{ kind: 'feed'; monsterId; item: string | null }`,
  `{ kind: 'evolve'; monsterId; path: string | null }`,
  `{ kind: 'evolveConfirm'; monsterId; path: string; yes: boolean }` (no `toSpecies` copy [L]:
  resolved LIVE from the chosen edge at Yes).
- `MonstersFeedback` = `{ kind: 'movedToParty' } | { kind: 'movedToBox' } | { kind: 'fed'; name }`.
- State += `pendingFeed: { monsterId; itemId: number; count: number; name: string } | null`
  (name captured at the A press [L]; cleared by every button like pendingMove) and
  `shown: string` — a value signature of the painted sheet-derived data for the phase's monster
  (`''` in the list phase): canFeed, canEvolve, each food's (itemId, count), each path's (edgeId,
  met, choice, unmetReason, toSpeciesName) [L]. `settle` returns a new state when it changes.
- `viewModel(ctx)`: + `buildInventoryItems(ctx.store.ownInventory(ctx.identity), ctx.store.itemDefs())`.
- `sheet`: Up/Down over `sheetLayout(canFeed, canEvolve)` (disabled rows reachable); A (fresh):
  care → `{kind:'care'}`, phase unchanged; feed → phase `feed`, cursor on the first food
  (`!canFeed` → consumed); evolve → phase `evolve`, cursor `firstPathKey` (`!canEvolve` → consumed).
- `feed`: Up/Down `navStep(foodLayout)`; A (fresh) on a food → `{ kind: 'train', monsterId,
  foodItemId }`, phase → sheet(feed), `pendingFeed`; B → sheet(feed); Select → toggleHelp; else
  consumed (Start → popToBase at the top as today).
- `evolve`: Up/Down `navStep(pathLayout)`; A (fresh) on a choice → `evolveConfirm { yes: false }`;
  A on a non-choice → consumed; B → sheet(evolve).
- `evolveConfirm`: Up/Down (fresh only) toggle `yes`; A (fresh): `phase !== settled.phase` → paint
  only (shop rule) [L]; yes and the path still a choice → `{ kind: 'evolve', monsterId,
  toSpecies: path.toSpecies }` + phase sheet(evolve); otherwise → `evolve` list on that path;
  B → `evolve`.
- `settle()`: + a `feed` cursor whose key is gone → first food, an emptied list → sheet(feed) [L];
  an `evolve` cursor gone → `firstPathKey`, no paths → sheet(evolve); an `evolveConfirm` whose
  path is gone or no longer a choice → the `evolve` list; `pendingFeed` resolves to
  `{ kind: 'fed', name }` ONLY when the monster is still listed AND the item's live count
  (0 when the row is gone) is below `count` [L]; `shown` recomputed → new state when changed.
- `paint`: `sheet: { card, action, canFeed, canEvolve }`, `feed: { foods, activeKey } | null`,
  `evolve: { mon, activeKey } | null`, `confirm: { name, species, yes } | null`, `feedback`.
  `sheetOf` maps `evolveConfirm` → action `evolve` [L].

## Imperative shell — `ui/boxView.ts`
- Sheet rows: `renderNav(this.#sheetList, sheetLayout(canFeed, canEvolve), …)`; `fill` writes a
  label span (`t('box.sheet.{summary,care,feed,evolve,nickname,move}')`, literal keys) and, for a
  disabled row, a reason span (`t('box.sheet.feedNone')`, `t('evolution.card.noPaths')`).
- NEW parts in DOM order sheet → feed list → evolve list → confirm → summary → row → feedback (all
  before the hint and panels: typing-mode Escape rule): `#feedList` (frame `monstersFeed`, rows
  `tf('box.feed.item', { name, count })`), `#evolveList` (frame `monstersEvolve`, rows: heading
  `tf('evolution.path.heading', { species })` + status: `path.unmetReason` raw when unmet,
  `tf('evolution.card.ready', { species })` when met but not a choice, `t('evolution.path.allMet')`
  for a choice), `#confirmEl` (`#monsters-evolve-question` = `tf('box.evolve.confirm', { name,
  species })` + a Yes/No nav list, frame `monstersConfirm`, labelled by the question;
  `prompt.yes` / `prompt.no`). No `evo-ready-note` / `evo-choice` testids here [L] (the box root
  stays in the DOM; V1's locators would hit a duplicate).
- Hidden parts are EMPTIED (replaceChildren / '') as well as display:none [L]: `overlayText` and
  the recruit.spec helpers read the root's textContent including hidden descendants; no "HP "
  token in the new parts.
- `FEEDBACK_TEXT` → a switch over `feedback.kind`; fed → `tf('box.feedback.fed', { name })`.
- Hide-not-remove (`setShown`), the `#hiddenInFrame` focus rescue, the kept paint and the
  hidden→visible reset unchanged.

## Catalog (+7 ids, en + fr; `catalog.test.ts` roster 230 → 237) [L]
`box.sheet.care` 'Care' · `box.sheet.feed` 'Feed…' · `box.sheet.evolve` 'Evolve…' ·
`box.sheet.feedNone` 'No food' · `box.feed.item` (name, count) `${name} (x${count})` ·
`box.evolve.confirm` (name, species) `Evolve ${name} into ${species}?` · `box.feedback.fed`
(name) `Fed ${name}`. Reused: `evolution.card.noPaths`, `evolution.path.heading`,
`evolution.path.allMet`, `evolution.card.ready`, `prompt.yes/no` (the boxView censuses
`M24S4_BX_PLAIN_KEYS` / `M24S4_BX_PARAM_KEYS` / `M24S4_BX_ROSTER` gain them — in touches).

## e2e `evolution.spec.ts` V2 (named intentional change)
focusWorld → KeyB → press `routedBindings(DEFAULT_BINDINGS).buttons.RB[0]` (Party) →
`pressButton('A')` (sheet on Summary for the slot-0 starter) → `pressButton('Down')` (Care) →
`pressButton('A')` (care → check_and_evolve). Wait for speciesId 4; the frame is STILL open and
its cards are live, so poll `overlayText(box.title)` for the Pyroleo prefix, then Escape (Start →
popToBase) and poll '' [L]. Header comment (line ~28) updated. V3 unchanged.

## Named intentional test changes (tester-owned) [L]
- `monstersScreen.test.ts`: CTL8B-2-A-OPENS-SHEET roster/order; `SHEET_STEPS` (:255-259); the
  exact opening-paint `toEqual` (:279) and the sheet `toEqual` (:960) gain the new fields (kept
  EXACT, not loosened); `feedback: 'moved…'` fixtures → `{ kind }`; `ctxOf` gains `ownInventory`
  / `itemDefs`.
- `boxView.test.ts`: CTL8B-2-VIEW-SHEET roster/order; `C8B_OPENING` / `c8bPaint` (:2078-2087);
  the «key» sentinel census + `M24S4_BX_*` rosters; feedback fixtures.
- `catalog.test.ts` roster + `EXPECTED_PLAIN` / `SAMPLE_PARAMS`; `screens/index.test.ts`
  CTL8B-4-HOST-FLOW (fixture + one Up instead of two Downs) — flagged above.
- `e2e/evolution.spec.ts` V2 as above.

## Anti-patterns to avoid
- Never re-derive eligibility or `choices`; never let `canEvolve` read `choices`.
- Never key the fed line on the sheet's card; never resolve a feed on "any batch" or `count !==`.
- Never act on `btn.repeat`; a Yes/No cursor never moves on a repeat.
- No `innerHTML`; nicknames/species names are player/content data → `textContent` only.
- No i18n resolver import in the screen or model (PARITY-02); `t(` keys literal (PARITY-04).
- No TS literal for the party size/sentinel; no `main.ts`, `boxModel.ts`, `evolutionModel.ts`,
  `nav.ts`, `navRender.ts`, `overlayRegistry.ts`, `e2e/controls.ts` edits (outside touches).

## Gate tags (test names start with `TAG:`) — rev 2 adds the four settle/negative tags [L]
CTL8C.1 (monstersModel.test.ts, screens/monstersScreen.test.ts, boxView.test.ts, catalog.test.ts):
CTL8C-1-SHEET-ORDER (assert the LAYOUT order, not the constant), CTL8C-1-MODEL-FOODS-EVO (a
zero-count row, a non-food row, a duplicate itemId, an unusual id, store order ≠ id order),
CTL8C-1-CARE-COMMAND, CTL8C-1-FEED-LIST, CTL8C-1-FEED-NO-CONFIRM (itemId ≠ index),
CTL8C-1-FEED-FEEDBACK, CTL8C-1-FEED-NEGATIVE (a refused feed / another item's drop / a count rise
/ a button in between → no line; the monster gone → no line), CTL8C-1-FEED-DISABLED,
CTL8C-1-EVOLVE-LIST (fixtures: no paths, paths-none-met, exactly one met, two met),
CTL8C-1-EVOLVE-DISABLED (paths-but-none-met is ENABLED; no paths disabled),
CTL8C-1-EVOLVE-CONFIRM-NO, CTL8C-1-EVOLVE-COMMAND (two choices, cursor on the SECOND, edgeId ≠
toSpecies), CTL8C-1-CONFIRM-FALLBACK, CTL8C-1-OBSERVE-REPAINT (a count / met flag change → a
new state; nothing changed → the same object), CTL8C-1-REPEAT-NEVER-ACTS, CTL8C-1-VIEW-SHEET-ROWS,
CTL8C-1-VIEW-FEED, CTL8C-1-VIEW-EVOLVE, CTL8C-1-VIEW-FED-LINE.
CTL8C.3 (main.input.test.ts, existing): CTL2-4-BOOT-CLEAR (KeyI → raising-title, KeyE →
evolution-title shown); EVIDENCE adds the e2e `evolution.spec.ts` V1 (KeyE) and `a11y.spec.ts`
runs against a local server when one is up.
