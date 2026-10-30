# ctl-8f plan — Bag pockets and Journal (CTL8F.1-.4)

Worktree `projects/monster-realm/.claude/worktrees/ctl-8f`, branch `ctl-8f` from origin/master b142412b.
tier=routine. No main.ts, no new Command arm (`train` exists), no server/game-core change.

## Ground truth found in scope verification
- `StoreItemRow` has NO pocket/category field (game-core `ItemDef`: "no category enum until later").
  Pockets are therefore DERIVED from the def's data fields, never from ids.
- ctl-8c did NOT strip raisingView's monster cards. `main.controls.test.ts` CTL6C-3 and
  `main.feedbackCore.test.ts` (PGCCA-A4, `raising-feedback`) click the raising Care button — both outside
  touches. So the monster section STAYS untouched; the Bag is additive. Residual R-ctl-8f-RAISINGCARDS.
- Only `openSocial` seats a frame (main.ts:1007). KeyI / the menu open the raising root through
  `show()+refresh()`; the Bag adapter first paints at the first batch (`ScreenHost.observe`, last batch
  listener) or the first button. Until then the legacy inventory grid shows. Residual R-ctl-8f-SEAT
  (a seat at open needs main.ts → ctl-11a/11b). The Journal needs no seat: its view renders the rows
  and an OPENING cursor itself.

## Functional core

### `client/src/ui/bagModel.ts` (NEW, pure)
- `export type Pocket = 'bait' | 'food' | 'medicine' | 'other'`.
- `pocketOf(def: StoreItemRow | undefined): Pocket` — precedence `trainStat != null` → food;
  `cureStatus != null` → medicine; `recruitBonus > 0` → bait; else (incl. undefined) → other.
- `bagPockets(itemDefs, inventory)`: the distinct pockets over every item def plus each owned row's
  pocket (an unknown def → other), ORDERED by the lowest item id that falls in that pocket. Shipped
  content (1 Lure Berry bait, 2 Power Root food, 3 Antidote medicine, 4/5 shards other) gives
  Bait | Food | Medicine | Other, so RB from the opening pocket lands on Food (design §5 flow).
- `buildBagVm(inventory, itemDefs, pickerMonsters)` →
  `{ pockets: { pocket, items: BagItemVm[] }[], monsters: { monsterId: bigint, name: string }[] }`.
  `BagItemVm = { key, itemId, name, description, count, canFeed, battleUse }`; only rows with
  `count > 0`, in inventory (store) order within each pocket; name/description from
  `buildInventoryItems` (raisingModel, the ONE "what is food" source: canFeed = canTrain);
  `battleUse = cureStatus != null || recruitBonus > 0`.
- `bagItemKey(itemId) = String(itemId)`; picker key = `monsterKey(id)` (monstersModel).
- `bagLayout(vm)` = `tabs(pockets.map(p => ({ key: p.pocket, layout: list(items→{key,enabled:true}) })))`.
- `BagAction = 'feed' | 'use' | 'info'`; `bagActions(item)`: `feed` (enabled) iff canFeed; `use`
  (DISABLED, reason 'battleOnly') iff battleUse; `info` always (last). `actionLayout(item)` = list.
- `pickerLayout(vm)` = list of monsters.

### `client/src/ui/screens/bagScreen.ts` (NEW) — `ScreenAdapter<BagVm, BagScreenState, RaisingView>`, nav, observe, paint
- `viewModel(ctx)`: `buildBagVm(ctx.store.ownInventory(id), ctx.store.itemDefs(), picker)` where the
  picker is `[...party, ...storage]` from `buildMonstersVm(ctx.store.ownMonsters(id),
  ctx.store.allSpecies?(), party_size(), party_slot_none())` named with `cardName` (reuse; read the
  real store accessor names from monstersScreen.viewModel).
- Phases: `list` | `sheet {itemId, action}` | `info {itemId}` | `picker {itemId, monster: key|null}`.
- State: `{ nav, phase, notice: 'battleOnly' | null, pendingFeed, feedback: {kind:'fed',name} | null, shown }`.
- init: first pocket, its first item (nav kit `navInit(bagLayout(vm))`), phase list.
- list: D-pad/LB/RB → nav kit (wrap fresh, clamp repeat, per-pocket memory). A (not repeat) on an item
  → sheet on its first action. B → `pop`. Start → `popToBase` (every phase). Select → `toggleHelp`.
- sheet: Up/Down over the action list (nav kit). A: feed → picker (first monster); use (disabled) →
  `notice='battleOnly'`, no command, phase unchanged; info → info. B → list, cursor on the item.
- info: B or A → sheet (on info).
- picker: Up/Down. A on a monster → result `{ kind: 'train', monsterId, foodItemId: itemId }`, phase
  `list`, nav cursor ON THE ITEM (picker closed — no confirm); `pendingFeed {monsterId,itemId,count,name}`.
  B → sheet (on feed). No monsters → A does nothing.
- Every button clears notice/feedback (the monstersScreen rule). A repeat never acts.
- observe: settle against the new vm — re-seat nav via `navReconcile(prevLayout, nextLayout)`
  (prev layout rebuilt from kept per-pocket keys, monstersScreen `keys` shape); a phase whose item
  vanished (count 0 / gone) → list; a picker whose cursor monster vanished re-seats; a pendingFeed
  whose item's live count dropped below `count` → `feedback {kind:'fed', name}`; `shown` = value
  signature of everything paint shows (pocket rows' names+counts, monster names, the phase's
  description) so a count change repaints. SAME object when nothing changed.
- paint(view, vm, state): `view.paint(BagPaint)`; `BagPaint` is self-contained:
  `{ pockets: {pocket, items:{key,name,count}[]}[], tab, item, phase: 'list'|'sheet'|'info'|'picker',
    actions: {action, enabled}[] (sheet), action (cursor), description (info), monsters:{key,name}[],
    monster (cursor), notice, feedback }`.

### `client/src/ui/screens/journalScreen.ts` (NEW) — `ScreenAdapter<QuestLogViewModel, JournalState, QuestLogView>`, nav, observe, paint
- `viewModel(ctx)` = `buildQuestLogViewModel(ctx.store.ownQuests(ctx.identity))`.
- key = `encodeURIComponent(questId)` (nav keys reject whitespace).
- State `{ nav, detail: string | null (quest key), keys }`. init: first quest.
- list: Up/Down nav; A or Y (not repeat) on a quest → `detail = key`; B → pop; Start → popToBase; Select → toggleHelp.
- detail: B (or A) → list, cursor on that quest. A quest that vanished closes the detail.
- observe: re-seat; SAME object when nothing changed. paint: `view.paint({ item, detail })`.

## Imperative shell (views)

### `raisingView.ts` — additive Bag panel
- New parts created in the constructor, after the inventory heading: `#bag-tabs` (one element per pocket,
  `data-pocket`, active: `is-active` + `aria-selected="true"`), `#bag-list` (`<ul>`, one `<li data-item-id>`
  per item in the ACTIVE pocket, text `tf('raising.inventory.item',{name,count})`, cursor row `is-active`
  + `aria-current="true"`; an empty pocket shows `t('raising.inventory.empty')`), `#bag-sheet`
  (rows `data-action`, labels `bag.action.feed/use/info`, disabled row `aria-disabled="true"`, cursor
  `is-active`), `#bag-info` (the description; `shop.description.none` "—" when empty? → use it), `#bag-picker`
  (heading `bag.picker.title`, rows `data-monster-id`, cursor `is-active`), `#bag-status`
  (`.mr-frame-feedback`; notice → `t('menu.disabled.battleBag')`; fed → `tf('box.feedback.fed',{name})`
  with `data-feedback="ok"`; else empty).
- `paint(p)`: keep `p`; render the bag panel; hide the legacy inventory grid (`#inventoryEl`) while a
  paint is kept. `hide()` drops the kept paint (legacy grid back for the next open, until the adapter paints).
- Pocket label table: `Record<Pocket, () => string>` thunks over literal ids. No glyph literals.
- Monster section, Care/Train buttons, `#raising-feedback`, `refresh()` unchanged.

### `questLogView.ts`
- Rows gain `data-quest-key`. `paint({item, detail})` keeps the paint and applies it: cursor row
  `is-active` + `aria-current`; `#quest-log-detail` (created by the view, inside the overlay) shows the
  quest name and `tf('journal.detail.step',{step})` when `detail` names a listed quest, else hidden.
- `render(vm)` re-applies the kept paint after rebuilding rows; on the null/hidden→visible edge the kept
  paint resets to OPENING (cursor on the first row, no detail).

### `screens/index.ts`: `raisingView: bagScreen`, `questLogView: journalScreen`.

## Catalog (+9 ids, en + fr + messageIds; catalog.test.ts roster 259 → 268, touches-delta)
`bag.pocket.{bait,food,medicine,other}`, `bag.action.{feed,use,info}`, `bag.picker.title`, `journal.detail.step` ({step}).
Reused: `raising.inventory.item`, `raising.inventory.empty`, `menu.disabled.battleBag`, `box.feedback.fed`, `shop.description.none`, `questLog.entry`.

## Tests (tester; tags unique per file; `TAG:` prefix in titles)
- `bagModel.test.ts`: CTL8F-1-POCKET-OF, CTL8F-1-POCKETS-FROM-DATA (novel fixture ids 900+, e.g. only a
  food + a cure def → exactly Food | Medicine; reorder ids → order follows the lowest id), CTL8F-1-OWNED-QTY,
  CTL8F-2-ACTIONS.
- `screens/bagScreen.test.ts`: CTL8F-1-OPEN-FIRST-POCKET, CTL8F-1-LBRB, CTL8F-2-SHEET, CTL8F-2-FEED-PICKER,
  CTL8F-2-USE-DISABLED, CTL8F-2-INFO, CTL8F-2-B-BACK, CTL8F-2-FED-FEEDBACK, CTL8F-2-OBSERVE.
- `raisingView.test.ts` (append): CTL8F-1-VIEW-PAINT, CTL8F-2-VIEW-SHEET.
- `screens/journalScreen.test.ts`: CTL8F-3-LIST, CTL8F-3-A-DETAIL, CTL8F-3-Y-DETAIL, CTL8F-3-B-BACK, CTL8F-3-OBSERVE.
- `questLogView.test.ts` (append): CTL8F-3-VIEW-PAINT, CTL8F-3-VIEW-RENDER-KEEPS.
- `screens/index.test.ts`: CTL8F-4-ADAPTERS (+ named intentional edits of CTL6B-1-ADAPTERS-TOTAL,
  CTL7C-1-NAV-CAPABLE, CTL7D-6-OBSERVE-SKIPS rosters).
- `screens/bagScreen.boot.test.ts`: CTL8F-4-BOOT-KEYI (real main.ts boot: KeyI shows raising root; a
  batch or RB paints the pocket tabs; RB moves to Food). `screens/journalScreen.boot.test.ts`:
  CTL8F-4-BOOT-KEYQ (KeyQ shows the journal; Enter/A opens the detail; B closes it).

## Anti-patterns to avoid
- Hard-coded item ids or a hard-coded pocket list in the TAB derivation; text in screens (no resolver
  import in screens: PARITY-02 roster); glyph literals; editing gating tests; touching main.ts.

## touches-delta (expected)
`client/src/ui/screens/bagScreen.test.ts`, `journalScreen.test.ts`, `bagScreen.boot.test.ts`,
`journalScreen.boot.test.ts`, `screens/index.test.ts`, `i18n/catalog.test.ts` — all sibling tests.

## Residuals (register after lenses)
R-ctl-8f-SEAT (→ ctl-11a), R-ctl-8f-RAISINGCARDS (→ ctl-11b).

## Plan-review dispositions (reviewer, 2026-10-03) — these OVERRIDE the sections above
1. ACCEPT. `init` sets `shown: null` (sentinel), so the FIRST `observe` after an open always answers a new
   state and the host paints; a batch alone paints the Bag. CTL8F-2-OBSERVE pins it; the boot test proves
   batch-alone and RB-alone painting separately.
2. ACCEPT. The Bag uses the nav kit: `BagPaint` carries the layouts + NavStates; `raisingView` renders the
   pocket strip with `renderTabs` (frame id `bag`) and the item list, the sheet and the picker with
   `renderNav` (frame ids `bag`, `bagsheet`, `bagpick`; no `-` in frame ids), `fill` writing the row text.
   Journal: the e2e pins `#quest-log-list li` with exact text "quest_001 (step 0)" (dialogue.spec.ts:412),
   and renderNav creates `div`s, so the journal paint marks the existing `<li>` rows itself with the kit's
   contract: `mr-nav-item`, `is-active` + `aria-selected` on the cursor row, `aria-selected="false"` elsewhere,
   `role="option"`, the list `role="listbox"` + `aria-activedescendant` (row ids `journal-root-{key}`).
   Row text stays exactly `tf('questLog.entry', …)`; `#quest-log-detail` is a sibling AFTER the list, never an li.
3. ACCEPT (as deviation note). The shipped content uses all four derivable pockets, so "a pocket no shipped
   item uses" is read as: tabs exist only for pockets the data holds, keyed and ordered by data. Teeth: a
   fixture of ids 900+ holding only a food and a cure def yields exactly Food | Medicine; SWAPPING the
   effect fields between two fixture ids swaps the tab order (order follows the lowest id in each pocket, not
   a fixed list). Spec as-built note at close. No DECISIONS.md entry (presentation-only, below the bar).
4. ACCEPT. A def defines a pocket whether or not owned (tabs stable as counts change); an OWNED row with an
   unknown def adds `other`. Rows with count <= 0 never list. Test title notes the content-id dependency.
5. ACCEPT. `buildBagVm` merges rows per itemId (sum counts). Journal key = `q${encodeURIComponent(questId)}`
   (never empty, never whitespace); questIds unique per player.
6. ACCEPT. pendingFeed reads a vanished item as count 0 → "Fed". Feed is DISABLED with reason `noMonsters`
   when the picker would be empty; new catalog id `bag.feed.noMonsters` "No monsters to feed".
7. ACCEPT. Button table: list phase — D-pad/LB/RB nav, A act, B pop, Start popToBase, Select toggleHelp,
   anything else `unhandled`. sheet/info/picker — Up/Down nav (Left/Right also nav-kit, harmless in a list),
   A act, B back, Start popToBase, Select toggleHelp, anything else (X, Y, LB, RB) `consumed`. Journal list
   — Up/Down nav, A or Y open detail, B pop, Start popToBase, Select toggleHelp, else `unhandled`; detail —
   A or B back, Start popToBase, Select toggleHelp, else `consumed`.
8. ACCEPT. Named intentional changes recorded in the spec at close: `screens/index.test.ts`
   CTL6B-1-ADAPTERS-TOTAL / CTL7C-1-NAV-CAPABLE / CTL7D-6-OBSERVE-SKIPS rosters; `catalog.test.ts` roster.
9. ACCEPT. Full client vitest before the full gate.
11/12. ACCEPT. Use row only on battle-usable items (cure or bait); a shard shows Info only (tested).
13. ACCEPT. Picker names: party (slot order) then storage, `cardName` over boxModel's
   `buildPartyViewModel`/`buildBoxViewModel` (or `buildMonstersVm` if simpler) with `ctx.store.speciesMap()`.
14. ACCEPT. One status channel: `status: { kind: 'battleOnly' } | { kind: 'noMonsters' } | { kind: 'fed'; name } | null`.
   (A on the disabled Feed shows `noMonsters`.) View: `#bag-status` `.mr-frame-feedback`, `data-feedback="ok"`
   only for fed (the boxView line's shape); reasons resolved via `t('menu.disabled.battleBag')` / `t('bag.feed.noMonsters')`.
17. PARTIAL. Keep the two boot tests (CTL8F.4 is about the real keys); reuse the cheapest existing harness.
18. ACCEPT. Wiring teeth in the jsdom view suites: CTL8F-1-VIEW-WIRED (raisingView.test.ts: real vm →
   bagScreen.init/onButton/paint → real RaisingView DOM) and CTL8F-3-VIEW-WIRED (questLogView.test.ts).
19-23. ACCEPT into the tester brief.
25. ACCEPT: `shown` covers only what paint shows.
Catalog is now +10 ids (adds `bag.feed.noMonsters`); roster 259 → 269.
