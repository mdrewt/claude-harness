# ctl-8b plan — Monsters I: Party / Storage tabs, the monster sheet, Move and Nickname

Spec: `specs/monster-realm-v2/M-postgate-console-controls.spec.md#ctl-8b`. Base: origin/master 87314462.
Worktree `.claude/worktrees/ctl-8b`, branch `ctl-8b`. Pattern: ctl-8a (`shopScreen` / `shopView.paint`).

## Seam dry-run (the spec has no ctl-8b seam map; this is it)

- The Monsters frame IS the `boxView` frame id. KeyB (main.ts ≈2021) and the menu's Monsters leaf
  (`openMenuTarget('boxView')`) both run `boxView.show(); refreshBox()`. `syncStack` pushes
  `screen(boxView)` and `screenHost.opened` resets the adapter state. Swapping
  `SCREEN_ADAPTERS.boxView` to `monstersScreen` (nav: true) gives it the D-pad, A, B, Y, LB/RB
  (PageUp/PageDown until ctl-11a), Start, Select. No main.ts change.
- Commands needed: `setPartySlot { monsterId, slot }` (slot = `partySlotNone` → storage; `-1` →
  dispatch picks the next free party slot and reports `chrome.status.partyFull`), `setNickname`,
  `pop`, `popToBase`, `toggleHelp`. All exist. No new Command arm.
- Party size / box sentinel: game-core constants via the wasm exports `party_size()` /
  `party_slot_none()` ("Rules are written once": wasm exports, never TS literals). `monstersScreen.ts`
  imports them from `client-wasm/pkg/client_wasm.js` (probed: the real pkg loads under vitest);
  the pure `monstersModel.ts` takes them as parameters.
- Typing mode (CTL6B.5) is main.ts's: a focused text INPUT owns every key but Escape/Enter;
  Escape → `stopTyping` (focus to the frame's first non-text control, text kept); Enter → the
  router as **A** to the top frame's adapter (`ownership` releases Enter). So the in-frame row is a
  plain `<input type="text">` the view owns, and **A in the nickname phase commits**: the adapter
  returns a one-shot `commit` token in its state; `BoxView.paint` turns a NEW token (object
  identity, never reset) into `onSetNickname(monsterId, input.value)` (skipped when unchanged, as the
  legacy prompt did), hides the row and focuses the frame title anchor. B (Backspace after Escape)
  cancels. The text never enters adapter state (it lives in the DOM field).

## Hidden dependencies found (NOT built — residuals)

- **X quick Move** (CTL8B.2 sub-bullet): `router.ts` swallows X unless the world is active (≈194);
  X never reaches an adapter. → residual R-ctl-8b-QUICKMOVE → ctl-11a (router.ts in its touches).
- **Menu path tab**: KeyB and the menu leaf open through the same `boxView.show()`; the adapter
  cannot tell them apart, so Monsters always opens on Storage (CTL8B.4's tab). → residual
  R-ctl-8b-MENUTAB → ctl-11a (main.ts in touches), LOW.
- **Pointer nickname**: the card's Rename button (window.prompt) is deleted with the prompt; the
  nickname is reachable by D-pad only until ctl-15 absorbs pointer input. → residual
  R-ctl-8b-POINTERRENAME → ctl-15, LOW.
- Escape-then-Enter in the typing row focuses the first non-text control = the Heal Party button
  (R-ctl-6b-CTL6B.5 → ctl-8h already owns that focus target). Known limit, no new residual.

## Functional core / imperative shell

### `ui/monstersModel.ts` (NEW, pure)
- `type MonstersTab = 'party' | 'storage'`; `type SheetAction = 'summary' | 'nickname' | 'move'`;
  `SHEET_ACTIONS = ['summary','nickname','move']` (display order); `STORAGE_COLS = 3` (the grid
  boxView already draws).
- `interface MonstersVm { party: readonly MonsterCardViewModel[]; storage: readonly MonsterCardViewModel[]; partySlotNone: number }`
  — `buildMonstersVm(monsters, speciesMap, partySize, partySlotNone, paths)`: party = occupied
  party slots in slot order (reuses `buildPartyViewModel`, nulls dropped; ≤ partySize); storage =
  `buildBoxViewModel` (store order).
- `monsterKey(id: bigint): string` (decimal string); `monstersLayout(vm): NavLayout` =
  `tabs([{party: list}, {storage: grid(STORAGE_COLS)}])`, items keyed by `monsterKey`.
- `findMonster(vm, monsterId): { tab: MonstersTab; card } | undefined`.

### `ui/screens/monstersScreen.ts` (NEW, pure adapter, `nav: true`)
- `viewModel(ctx)`: `buildMonstersVm(ctx.store.ownMonsters(ctx.identity), ctx.store.speciesMap(), party_size(), party_slot_none(), [...ctx.store.evolutionPaths()])`.
- State `{ nav: NavState; phase; commit: { monsterId } | null; pendingMove: { monsterId; toParty } | null; feedback: 'movedToParty' | 'movedToBox' | null; edit: number }`
  - phase `list` | `sheet { monsterId, action }` | `summary { monsterId }` | `nickname { monsterId, edit }`.
- `init`: nav on the **storage** tab (CTL8B.4), first item.
- `list`: D-pad/LB/RB → `navStep` (wraps; repeats clamp; per-tab memory from the nav kit);
  A on a monster → `sheet` (action `summary`); B → `pop`; Start → `popToBase`; Select →
  `toggleHelp`; other → `unhandled`. Every step clears `feedback`.
- `sheet`: Up/Down over SHEET_ACTIONS (wrap); A: summary → `summary`; nickname → `nickname`
  (fresh `edit`); move → `setPartySlot` (party → `partySlotNone`, storage → `-1`), phase `list`,
  `pendingMove` set; B → `list` with the cursor on that monster (unchanged nav).
- `summary`: B or A → back to `sheet` (action summary).
- `nickname`: A → commit token, phase `sheet` (action nickname); B → `sheet`, no commit; other
  buttons `consumed` (Start still `popToBase`).
- `observe`: re-seat nav against the new layout (`navReconcile` on the previous layout stored in
  state); a phase whose monster vanished → `list`; `pendingMove` resolves to `feedback` when the
  monster shows in the target tab. Same object when nothing changed.
- `paint(view, vm, state)` → `BoxView.paint(MonstersPaint)`.

### `ui/boxView.ts` (shell; DOM kept for e2e)
- Keeps: root/header/h2 chain (`h2.parentElement.parentElement` = root, recruit/evolution/encounter
  e2e), `data-testid` box-title / box-party-hint, Heal Party in the header, card text
  (`box.card.stats`, `HP cur/max`), To Party / To Box buttons, `refresh(party, box)`.
- Adds: a tab strip (`renderTabs`, frame `monsters`), the inactive panel + its heading `hidden`
  (textContent stays for e2e), `data-nav-key` + `mr-nav-item` on each card wrapper, cursor card
  `is-active` + `aria-current="true"` + an inline outline (non-colour mark; cards keep their inline
  colours), a sheet (`renderNav` list of Summary / Nickname / Move under the monster's name), a
  summary pane, the nickname row (`label` box.rename.prompt + `input type=text`), a
  `.mr-frame-feedback[data-feedback="ok"]` line.
- `paint(p)` kept and re-applied after each `refresh`; reset to the opening paint on the
  hidden→visible edge (Storage tab, first card) so a KeyB open shows Storage before any step.
- Removes `#promptNickname` / `window.prompt` and the per-card Rename button.

### i18n (+7 −1)
`box.tab.party`, `box.tab.storage`, `box.sheet.summary`, `box.sheet.nickname`, `box.sheet.move`,
`box.feedback.movedToParty`, `box.feedback.movedToBox` (en + fr); `box.card.rename` removed;
`box.rename.prompt` re-used as the typing row's label.

## touches-delta (expected)
`client/src/ui/screens/monstersScreen.test.ts` (sibling of monstersScreen.ts),
`client/src/ui/screens/index.test.ts` (sibling of index.ts: CTL6B-1-ADAPTERS-TOTAL,
CTL7C-1-NAV-CAPABLE, CTL7D-6-OBSERVE-SKIPS roster), `client/src/ui/i18n/catalog.test.ts` (sibling of
the catalogs, roster), possibly other i18n roster tests. Anything else that breaks = hidden
dependency → stop.

## Anti-patterns to avoid
TS literal for party size / sentinel; a screen importing the i18n resolver (PARITY-02); hiding a
panel by removing its nodes (e2e textContent scans); state mutated in place (host compares
identity); refocusing the input on every paint (undoes Escape); a commit replayed by a repaint.

## Plan review amendments (red-team, 2026-10-02) — adopted

1. **The ladder eats typed letters.** main.ts's bubble-phase window keydown has no target guard:
   "b" in the field toggles the box closed, I/E/Q/… are preventDefault'd. The typing row's input
   gets its own `keydown` listener that calls `stopPropagation()` for every code except `Escape`,
   `Enter`, `NumpadEnter` (Escape is handled on window in the CAPTURE phase, so it still stops
   typing; Enter must bubble to reach the router as A). Same shield renameView uses.
2. **Escape → Enter must not heal.** `stopTyping` focuses the first enabled non-text control. While
   the nickname row is painted the header Heal Party button is `disabled`, and the sheet's nav
   container (renderNav: `tabindex=0`, a DIV, so Enter is a router A) sits in DOM order BEFORE the
   two panels (whose To Party / To Box buttons would otherwise win). Restored when the row closes.
3. **Hide with `style.display = 'none'`**, never the `hidden` attribute (the panels carry inline
   `display:grid`, which beats `[hidden]`; `focusInsideHiddenSubtree` reads only inline display).
   Applies to the inactive panel + its heading, the sheet, summary, row and feedback.
4. **Cursor card**: NOT `.mr-nav-item` (its `.is-active` rule paints dark-on-dark / light-behind-#ccc).
   Card wrapper carries `data-nav-key`; the active one gets class `is-active` (no CSS rule matches a
   bare `.is-active`), `aria-current="true"` and an inline `outline` (non-colour mark); others clear
   all three. `scrollIntoView({block:'nearest'})` when the cursor key changes.
5. **Focus never strands**: when a paint hides the row, the sheet or a panel that contains
   `document.activeElement`, focus moves to the title anchor (`[data-testid=box-title]`) first.
6. **Commit/prefill/observe hygiene**: the view records a commit token as handled BEFORE calling
   `onSetNickname`; the field is prefilled and focused only on a NEW `edit` value (batch repaints keep
   the typed text and never refocus); state keeps the per-tab key lists (compared by value), so
   `observe` returns the same object when nothing changed; `pendingMove` expires on the next button
   step (a refused move never shows a later "Moved").
7. Known limit (as ctl-8a): no `aria-activedescendant`; focus stays on the static manifest anchor.
