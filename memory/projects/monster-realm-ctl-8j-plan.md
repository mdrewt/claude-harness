# ctl-8j plan — Battle II: recruit, swap and bag lists; the D-pad battle e2e

Worktree `.claude/worktrees/ctl-8j` from origin/master 0a773d54 (ctl-8i). Client-only.

## Scope check (verified against 0a773d54)
- The bait and cure controls are `<select>`s parsed two different ways on click (B10):
  `battleView.ts` `#renderRecruit` (`raw === '' ? undefined : Number(raw)`) and `#renderCureItems`
  (`parseInt(raw, 10)`, NaN → no-op). Their values are saved/restored across re-renders.
- ctl-8i already built: the command list, the cursor (`#cursor {list,index}`, `data-battle-list`
  rows, `applyBattleOp` move/activate/back), `SUBLIST` (fight→skills, recruit→recruit, swap→swap,
  bag→bag), and the swap bench as `data-battle-list="swap"` buttons whose click captures
  `member.teamIndex` (already a nav list with no parse; kept).
- `use_battle_item(battle_id, item_id)` has NO target parameter: the server cures the ACTIVE
  monster. So the Bag "target" step is a one-row list naming the active monster (honest; no new
  server capability). Called out in the PR.
- Consumers of the selects outside battleView: `e2e/recruit.spec.ts` R1 (bait-selector visible,
  zero `[data-recruit-bonus]`, recruit-action visible) and R2 (clicks `recruit-action` relying on the
  select's implicit "No bait" default). `encounter-battle.spec.ts` uses no select → left unchanged.
  The legacy Flee button is clicked by out-of-touches e2e (trade-interlock, recruit) → kept.
- Residuals targeted at ctl-8j: PVPTIMER (menuView.ts — outside touches), SELECTINERT (main.ts
  toggleHelp arm requires worldHasFocus — outside touches; battleScreen already returns toggleHelp),
  MENUCOPY (1: menu Close desc "return to the world" — the English is pinned by menuModel.test.ts,
  menuView.test.ts, mainMenuScreen.test.ts, all outside touches; 2: `menu.disabled.battleBag` "Use
  items from the battle Bag command" is TRUE since ctl-8i shipped the Bag command — no change).
  → re-target via `mr-gates residuals add`: SELECTINERT → ctl-11a, PVPTIMER → ctl-13,
  MENUCOPY-CLOSE → ctl-13. Hidden dependencies, not done.

## Design (functional core / imperative shell)
### Core — battleModel.ts (pure)
```ts
/** The second step a battle sub-list waits on (CTL8J.1). Ids are numbers held by the closure that
 *  made the pick — never read back from DOM text or attributes (B10). */
export type BattlePick =
  | { readonly kind: 'recruitConfirm'; readonly baitItemId: number | undefined }
  | { readonly kind: 'cureTarget'; readonly itemId: number };
/** Keep a pick only while the model still offers it: an ongoing, unlocked PvE battle that can
 *  recruit and still lists that bait (undefined = No bait, always offered while canRecruit); a cure
 *  item still in vm.cureItems. Anything else → null (reject, never clamp to another item). */
export function resolveBattlePick(vm: BattleViewModel, pick: BattlePick | null): BattlePick | null;
```
### Shell — battleView.ts
- Recruit list: `<div data-testid="bait-selector" role="group" aria-label=t('battle.recruit.listLabel')>`
  with button rows `data-battle-list="recruit"`: "No bait" first (`data-testid="bait-option-none"`),
  then one per `vm.baitOptions` (`data-recruit-bonus`, text `${name} (+${n}‰) ×${count}` as today).
  Each row's click closure captures `bait.itemId` (number) / `undefined`.
- Pressing a bait row sets `#pick = recruitConfirm` and renders `<div data-testid="recruit-confirm">`:
  prompt (`battle.recruit.confirm` {bait} / `battle.recruit.confirmNoBait`), then Yes
  (`data-testid="recruit-action"`, `data-battle-list="recruitConfirm"`) and No
  (`data-testid="recruit-cancel"`, same list). Cursor → Yes (default Yes, design §5 "harmless").
  Yes → `#dispatch(onRecruit(battleId, pick.baitItemId))`, pick cleared. No / B → pick cleared,
  cursor back to the bait row that was picked.
- Bag list: `<div data-testid="cure-item-selector" role="group" aria-label=t('battle.cure.listLabel')>`
  with rows `data-battle-list="bag"` (`data-cure-status`, text `battle.cure.option`). Pressing one
  sets `#pick = cureTarget` and renders `<div data-testid="cure-target">` with ONE row: the active
  monster, `battle.cure.target` {species} (`data-testid="use-item-action"`,
  `data-battle-list="bagTarget"`). A → `#dispatch(onUseItem(battleId, pick.itemId))`. B → back to the
  cure row.
- Swap: unchanged rows (already a list).
- `applyBattleOp` back: recruitConfirm → recruit (on the picked row), bagTarget → bag (on the picked
  row); the existing sub-list → command rule otherwise. A parent map `PARENT` replaces the find over
  SUBLIST.
- `#pick` is resolved through `resolveBattlePick` on every refresh, and cleared on a new
  (battle, turn), on a PvP wait and on hide(). The `<select>` save/restore (`#baitSelectEl`,
  `#cureSelectEl`, savedBait/savedCure) is deleted — no `<select>` remains in the battle root.
- The PvE lock (`#setActionButtonsDisabled`) covers the new rows (all in `#actionsEl`).
### i18n (en + fr + messageIds, `@desc` convention)
Add `battle.recruit.listLabel` "Bait", `battle.recruit.confirm` (p:{bait}) "Recruit with {bait}?",
`battle.recruit.confirmNoBait` "Recruit with no bait?", `battle.recruit.yes` "Yes", `battle.recruit.no`
"No", `battle.cure.listLabel` "Cure items", `battle.cure.target` (p:{species}) "Use on {species}".
Retire ids that lose every reader (`battle.cure.placeholder`, `battle.cure.submit`,
`battle.recruit.submit`) only if catalog tests require it (dead-id check) — otherwise retire anyway
(no dead keys).

## Tests (tester; tags end with ':' in the it() title)
battleModel.test.ts: `CTL8J-1-PICK-RESOLVE:` (keeps a still-offered bait/No-bait/cure; drops a
consumed bait, a gone cure, a finished battle, PvP, canRecruit=false, a locked/pending PvP).
battleView.test.ts:
- `CTL8J-1-NO-SELECT:` no `<select>` in the battle root for a wild battle with bait + cure items;
  `[data-testid=bait-selector]` is a non-select element; its first row is No bait; one row per bait
  with `data-recruit-bonus`; bag rows carry `data-cure-status`; every row is `data-battle-list`.
- `CTL8J-1-RECRUIT-YES-DEFAULT:` D-pad (applyBattleOp) Recruit → bait row → A: confirm shown, Yes
  is the cursor (aria-current + focus); A → onRecruit(battleId, <number id>) exactly once; No-bait
  path → `undefined`.
- `CTL8J-1-RECRUIT-NO-BACK:` No and B both return to the picked bait row, no call; B again → Recruit
  command row.
- `CTL8J-1-BAG-TARGET:` Bag → cure row → A: target row names the active monster; A →
  onUseItem(battleId, id) once; B → back on the cure row; B → Bag command.
- `CTL8J-1-SWAP-LIST:` Swap → bench row → A → onSwap(battleId, teamIndex) (PvE) / onPvpSwap (PvP).
- `CTL8J-1-ID-NOT-PARSED:` after render, overwrite every row's text and every data-/value attribute
  with misleading strings (e.g. "12", "1e3", ""), then press: the callback still receives the
  model id (a string-parse impl fails).
- `CTL8J-1-PICK-ACROSS-RENDERS:` a same-turn re-render keeps the confirm/target and the cursor; a
  new turn, or a re-render whose bait is consumed, closes it (no call made by the refresh).
- Migrate existing select-shaped tests (e-1 save/restore, m14.5d cure selector/option/value, i18n
  option text, c8i focus-row lists, stray-focus) to the list shape — named intentional changes,
  each preserving its original defect class (selection survives batches → pick survives
  same-turn renders; option value = itemId → row press passes itemId).
e2e `client/e2e/battle-dpad.spec.ts` (new, one browser/identity, no SQL seeding):
- `CTL8J-3-START-MONSTERS-START:` (runs first, mid-turn) Down → cursor on Recruit; Start → menu over
  battle; A → Monsters opens (stack length 3); Start → stack `[battle]` exactly, command list visible,
  aria-current on `battle-command-recruit`, focus inside the battle, turnNumber unchanged.
- `CTL8J-2-DPAD-BATTLE:` same battle, only pressButton(Up/Down/Left/Right/A/B): Recruit → A → No
  bait row focused → A → Yes is the cursor → B → bait list → B → Recruit row; Up → Fight; then loop
  A (Fight → grid) + A (skill) waiting for the turn to advance, until the outcome ≠ Ongoing (bounded
  attacks); then (after the 400 ms grace) A continues → stack is the world base, battle UI hidden.
recruit.spec.ts (named intentional changes, the old select default): R1 asserts the bait list,
its No-bait row, zero `[data-recruit-bonus]`, then clicks No bait and asserts `recruit-action` (Yes)
visible; R2 clicks the No-bait row before `recruit-action`.

## Gates
CTL8J.1: vitest JSON over battleModel.test.ts + battleView.test.ts, the seven CTL8J-1-* tags each
passed exactly once, 0 failed/pending/todo, no `.fails(`.
CTL8J.2 / CTL8J.3: Playwright JSON over e2e/battle-dpad.spec.ts (project default) — each tag passed
exactly once, 0 unexpected/flaky/skipped. Needs a live SpacetimeDB on 127.0.0.1:3000 (sibling-safe
`--data-dir $(mktemp -d)` server, stopped by pid).

## Anti-patterns to avoid
- Reading an id back from DOM text/value/data-* (B10). Ids live in closures.
- Restoring a pick onto a different item when the old one vanished (clamp) — drop it.
- A pick surviving into the next turn (a stale confirm pressed after the turn changed).
- Leaving the <select> keyboard trap (arrows owned by the select) anywhere in the battle root.

## Amendments after plan review (reviewer + red-team, 2026-10-03) — these OVERRIDE the items above
- A1 catalog: retiring `battle.cure.placeholder`, `battle.cure.submit`, `battle.recruit.submit` is
  MANDATORY (catalogParity DEAD-KEY live-tree check). `i18n/catalog.test.ts` (sibling of
  catalog.en.ts; exact roster + English/French pins) is updated by the TESTER; touches-delta.
  No new unkeyed literal (hardcodedStrings/catalogShape stay green). Per-screen Yes/No ids
  (`battle.recruit.yes/no`) follow the tradePropose.review precedent.
- A2 pick identity: `BattlePick` carries `battleId` and `turnNumber`; `resolveBattlePick` drops a
  pick from another battle or turn. Yes/target press reads `#pick` AT PRESS TIME, re-resolves it
  against `#vm`, CLEARS it, then `#dispatch`es — no render-captured id on the confirm rows.
  `hide()` clears it. Id 0 is a real id (`=== undefined` only). One `#pick` for the whole view: a
  later bait/cure row press replaces it; pressing a command row clears it.
- A3 back-to-row by identity: rows are remembered in a per-render Map keyed by the model id (bait
  `number | undefined`, cure `number`), so B from the confirm lands on the picked item even when an
  earlier row vanished; a dropped pick sends the cursor to Fight.
- A4 rows are `<button>`s inside `#actionsEl` so the PvE lock disables them; `#dispatch` blocks too.
- A5 view tests add: id 0, ids ≥ 2^31, two baits with the same name, reorder between renders,
  strip-every-attribute-but-data-battle-list + all text before pressing; double press (applyBattleOp
  + node.click()) with a pending promise → 1 call; recruit in flight blocks use-item; mouse click on a
  bait row also seats Yes (one aria-current, focus on recruit-action); bait B clicked while A's
  confirm is open → prompt names B and Yes sends B; new turn / new battle / hide → no confirm and A
  makes no recruit call; PvP: no recruit/bag rows, swap → onPvpSwap.
- A6 e2e: seed only the starter's defenses by owner SQL (encounter-battle precedent, copied helper)
  so the starter cannot lose; fight TWO battles: the first continues with A, the second with B
  (CTL8J.2 "A or B"). Every press goes through a state-driven helper: if focus is not on a
  `[data-battle-list]` row, the first press only seats the cursor, so presses are verified by polling
  the focused row's testid / aria-current, never counted blind. Turn advance = turnNumber up or
  outcome visible; continue = press while `stack.length > 1` (grace-aware loop, never press at the
  world base). Attacks bounded (30, fail with a message). CTL8J.3 also pins battleId unchanged.
  The D-pad test bodies use only `pressButton` for input (reviewer-checked, no source scan).
- A7 recruit.spec R2: the No-bait click goes INSIDE the per-attempt loop (a failed attempt advances
  the turn and clears the pick). Bait rows stay after the skill grid in DOM order
  (`button:has-text("(")` picks the first skill).
