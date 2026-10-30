# ctl-8a build plan — Dialogue, Shop and Heal on the D-pad

Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-postgate-console-controls.spec.md`
(§ "ctl-8a", its "Seam map" block, and "Milestone-wide acceptance rules"). Worktree:
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ctl-8a`
(branch `ctl-8a`, on master 729d488a). Client-only. `main.ts` is NOT touched.

## Verified facts (probed, not assumed)

- Swapping the three `SCREEN_ADAPTERS` entries to a nav-capable adapter reds only the two sibling
  tests the spec names (`CTL6B-1-ADAPTERS-TOTAL`, `CTL7C-1-NAV-CAPABLE` in `screens/index.test.ts`).
- Adding a catalog id reds `ui/i18n/catalog.test.ts` (exact roster, `EXPECTED_PLAIN`,
  `SAMPLE_PARAMS`, `EXPECTED_PARAM_OUTPUTS`). It is the sibling test of `catalog.en.ts`, so it is
  edited as a named intentional change (touches-delta). `catalogParity.test.ts` stays green.
- `catalogParity.test.ts` PARITY-02 pins the exact 25-file roster of files that import the i18n
  resolver, and it is outside `touches:`. So the three new `screens/*Screen.ts` files must NOT
  import `ui/i18n/resolver`. All text is resolved in the views (already on the roster).
- `index.html` is outside `touches:`: every new element is created by its view (locate-or-create,
  as `#shop-balance` is today).
- How frames open: dialogue and shop open inside a store batch (the final batch listener then runs
  `syncStack()` → `screenHost.opened` → `screenHost.observe`). Heal opens from the T keydown with
  no batch, so its first adapter call may be a button step.
- `main.ts` keeps calling the legacy `view.render(legacyVm)` on every batch, before `observe`.

## Shape (functional core / imperative shell)

Pure adapters (`screens/*Screen.ts`): no DOM, no i18n, no module state, no clock but `vm.now` and
`observe`'s `now`. They import their view class as a type only. Views stay thin: `render(vm)` keeps
its legacy signature and DOM (ids, `data-choice-idx`, `data-shop-id`, `data-item-id`), and gains
`paint(p)`. A view keeps the last `p` it was painted and re-applies it after each legacy
`render(vm)`, so a batch render never drops the cursor. Each view resets that kept paint to its
opening value on its hidden→visible edge.

Shared button rules for all three adapters:
- Start → `{kind:'popToBase'}`, Select → `{kind:'toggleHelp'}` (as the legacy adapter).
- The router synthesizes `repeat: true` only for the D-pad. A list cursor moves on a repeat (the
  nav core clamps it at the ends; a fresh press wraps); a quantity changes on a repeat; a Yes/No
  cursor NEVER moves on a repeat (a held D-pad must not flip a confirm default). Any other button
  with `repeat` is `'consumed'`.
- Start, Select (and B where it only closes) are answered before any layout is built.
- Buttons an adapter has no use for answer `'unhandled'`.
- States are never mutated; `observe` returns the SAME object when nothing changed.

### 1. `client/src/ui/screens/dialogueScreen.ts` (CTL8A.1)

```ts
export const DIALOGUE_REVEAL_MS = 600; // the length of styles.css's `mr-reveal` animation
export interface DialogueScreenVm {
  readonly dialogue: DialogueViewModel | null;   // buildDialogueViewModel(...)
  readonly nodeKey: string | null;               // `${conv.npcEntityId}:${conv.currentNodeId}`, null with no dialogue
  readonly now: number;                          // ctx.now()
  readonly reduceMotion: boolean;                // ctx.reduceMotion
  readonly inBattle: boolean;                    // ctx.store.ongoingBattle(ctx.identity) !== undefined
}
export interface DialogueScreenState {
  readonly nodeKey: string | null;      // the node this state belongs to; null until first synced
  readonly revealStart: number | null;  // clock value when the reveal began; null = shown in full
  readonly nav: NavState;               // cursor over the choices, then the shop action
  readonly sentAt: number | null;       // when A last issued a command for this node; null: none
}
export const DIALOGUE_RESEND_MS = 1000; // A is swallowed this long after it issued a command
export const dialogueScreen: ScreenAdapter<DialogueScreenVm, DialogueScreenState, DialogueView>; // nav: true
```

- `viewModel(ctx)`: `buildDialogueViewModel(conv, <npcs by entityId from ctx.store.allNpcs()>, DIALOGUE_TREES)`
  (the npc map is built only when a conversation exists, as `main.ts` does).
- Nav layout: `list` of `c<idx>` per choice, then `shop` when `dialogue.shopAction` is set.
- `init(vm)`: the unkeyed state `{ nodeKey: null, revealStart: null, nav: <empty list cursor> }`.
- `sync(vm, state, now)` (private; used by `observe` and first thing in `onButton` with `vm.now`):
  same object when `state.nodeKey === vm.nodeKey`; else a fresh state for the node:
  `revealStart = vm.reduceMotion || vm.nodeKey === null ? null : now`, cursor on the first item,
  `sentAt: null`.
  So the open, a node replaced by a batch, and a re-pushed frame all start a new reveal, and the
  observe that follows paints it.
- revealing ⇔ `revealStart !== null && vm.now - revealStart < DIALOGUE_REVEAL_MS`.
- `onButton`:
  - B → `dismissDialogue`, always (in battle too: it is battle-safe, and it is what the legacy
    `pop` did), and the state's reveal is finished (`revealStart: null`). `main.controls.test.ts`
    (outside touches) pins B dismissing 100 ms after the batch, so B is never reveal-gated.
  - `vm.inBattle`: Start / Select / B as above; every other button `'unhandled'` (A raises no
    battle refusal per press).
  - A, in order: (1) the `sync` at the top of this call had to re-key the state (a re-pushed
    frame's first press) → `'consumed'` (the paint shows the fresh cursor first); (2) revealing →
    finish (`revealStart: null`, `'consumed'`); (3) `sentAt !== null && vm.now - sentAt <
    DIALOGUE_RESEND_MS` → `'consumed'` (a second A inside the round trip would hit the next,
    unseen node); (4) no items (leaf) → `dismissDialogue`; cursor on `c<idx>` →
    `advanceDialogue { choiceIdx: idx }`; on `shop` → `pickShop { shopId }` — each stamping
    `sentAt: vm.now`.
  - Up / Down: `navStep` over the list, `'consumed'`. Left / Right: `'consumed'`.
  - No dialogue (`vm.dialogue === null`): A, B and the D-pad are `'consumed'`.
- `observe(vm, state, now)` = `sync`.
- `paint(view, vm, state)`: nothing when `vm.dialogue === null`; else
  `view.paint({ active, revealStart })`.

`dialogueView.ts`:
```ts
export interface DialoguePaint {
  readonly active: number | 'shop' | null;  // a choice idx, the shop action, or none
  readonly revealStart: number | null;      // non-null: the reveal class is on; a NEW value restarts it
}
paint(p: DialoguePaint): void
```
- Constructor (idempotent): the root gains class `mr-shell--dock`; `#dialogue-npc-name`,
  `#dialogue-node-text`, `#dialogue-choices` are moved into ONE inner element
  `div.mr-frame.mr-frame--bottom` (`data-size="bottom"`) that is a child of the root.
- `render(vm)`: as today, with inline `display: flex` instead of `block` when shown (the dock is a
  flex alignment; `visible` is unchanged). Every button in `#dialogue-choices` carries class
  `mr-nav-item`. The kept paint is re-applied: the cursor button has class `is-active` and
  `aria-current="true"`, no other button has either; `#dialogue-node-text` has class
  `is-revealing` iff the kept paint's `revealStart !== null` (after the animation has run out the
  class is inert). Opening value (reset on the hidden→visible edge):
  `{ active: null, revealStart: null }`.
- `paint(p)`: keeps `p` and applies it. When `p.revealStart` is non-null and differs from the
  last painted one, the animation restarts (class off, reflow, class on).
- No new text: `dialogueView.i18n.test.ts` DV-01/02/03 should pass unmodified.

### 2. `client/src/ui/screens/healScreen.ts` (CTL8A.3, B13)

```ts
export interface HealScreenVm {
  readonly location: HealLocationViewModel | null; // the bound location's row; null: none bound, or unknown id
}
export interface HealScreenState {
  readonly nav: NavState;        // list: 'yes', 'no'
  readonly cost: string | null;  // the painted cost line (formatHealCostLine); null: Heal disabled
}
export const healScreen: ScreenAdapter<HealScreenVm, HealScreenState, HealView>; // nav: true
```
- `viewModel(ctx)`: `ctx.healLocationId === null ? { location: null }` : the first (only) row of
  `buildHealViewModelForLocation(ctx.healLocationId, ctx.store.healLocations(), ctx.store.itemDefs())`, else null.
- Layout: `list([{ key:'yes', enabled: location !== null }, { key:'no', enabled:true }])`.
- `init(vm)`: cursor on `yes`, `cost = vm.location ? formatHealCostLine(vm.location) : null`.
- `onButton`: a fresh Up / Down → `navStep`; a repeat, Left / Right → `'consumed'`.
  A on `yes` with a location → `healParty { locationId: vm.location.locationId }`, and the cursor
  moves to `no` (a second A closes; never a double heal). A on a disabled `yes` → `'consumed'`.
  A on `no` → `pop`. B → `pop`.
- `observe`: same object unless the cost line changed; then `{ ...state, cost }` (a reconnect
  clears the bound id while the frame can stay open; item names can load late).
- `paint(view, vm, state)` → `view.paint({ active, cost: state.cost })`. A reads `vm.location`
  live, never the state's `cost`.

`healView.ts`:
```ts
export interface HealPaint { readonly active: 'yes' | 'no'; readonly cost: string | null } // cost null: disabled
paint(p: HealPaint): void
```
- Constructor (locate-or-create, idempotent), all inside `#heal-overlay`, after and OUTSIDE
  `#heal-list`: `#heal-question` (p), `#heal-reason` (p), `#heal-options` (the nav container).
- `render(vm)`: `#heal-list` rows exactly as today (HL-01/HL-02 pins). On the hidden→visible edge
  the kept paint resets to the opening value
  `{ active: 'yes', cost: vm.locations[0] ? formatHealCostLine(vm.locations[0]) : null }`
  (at the open the legacy vm is always the bound-location vm). Then the kept paint is applied.
- Applying a paint:
  - `#heal-question` text = `tf('heal.prompt.question', { cost })`; empty and `hidden` when `cost === null`.
  - `#heal-reason` text = `t('heal.prompt.unavailable')` when `cost === null`; else empty and `hidden`.
  - `#heal-options` is rendered through `renderNav` (frame id `heal`; `labelledBy` is
    `heal-question`, or `heal-reason` when `cost === null`): two `role="option"` items
    `#heal-root-yes` / `#heal-root-no` with texts `t('prompt.yes')` / `t('prompt.no')`; the cursor item has `is-active` + `aria-selected="true"`; `yes` has
    `aria-disabled="true"` when `cost === null`.

### 3. `client/src/ui/screens/shopScreen.ts` (CTL8A.2)

```ts
export const SHOP_BUY_MAX = 99;
export type ShopTab = 'buy' | 'sell';
export interface ShopScreenVm {
  readonly shop: ShopScreenViewModel;                 // the legacy vm, for the bound shop
  readonly descriptions: ReadonlyMap<number, string>; // itemId → its non-blank description
}
export type ShopPhase =
  | { readonly kind: 'browse' }
  | { readonly kind: 'qty'; readonly tab: ShopTab; readonly itemId: number; readonly qty: number }
  | { readonly kind: 'confirm'; readonly tab: ShopTab; readonly itemId: number; readonly qty: number; readonly yes: boolean };
export interface ShopScreenState {
  readonly nav: NavState;   // tabs 'buy' | 'sell'; item keys below
  readonly phase: ShopPhase;
  readonly info: boolean;   // Y: the cursor item's description is shown
}
export const shopScreen: ScreenAdapter<ShopScreenVm, ShopScreenState, ShopView>; // nav: true
```
- `viewModel(ctx)`: `ctx.shopId === null` → the no-shop vm (`buildShopViewModel([], [], itemDefs, [], wallet)`),
  else `buildShopViewModelForShop(ctx.shopId, allShops, allShopItems, itemDefs, ownInventory, ownWallet)`.
  `descriptions` comes from a new pure helper in `shopModel.ts`:
  `export function itemDescription(itemId: number, itemDefs): string | null` (null when the row is
  missing or its description is blank after trim). The legacy vm shapes do not change.
- Row keys (shared with the view through two new `shopModel.ts` helpers so they cannot drift):
  `shopBuyKey(item) = String(item.shopItemId)`, `shopSellKey(item) = String(item.itemId)`.
- Layout: `tabs([{ key:'buy', list(forSale → enabled) }, { key:'sell', list(forSaleByPlayer → enabled: canSell && count >= 1) }])`;
  both lists empty for no-shop.
- `init(vm)`: tab `buy`, its first row, `browse`, `info: false`.
- `settle(vm, state)` (private; `observe`, and first in `onButton`): re-seats the cursor with
  `navReconcile(layout, layout, state.nav)` (a gone row or a null cursor over a now non-empty list
  lands on the first row; the same `NavState` object comes back when nothing changed); a `qty` /
  `confirm` whose row is gone or no longer enabled falls back to `browse`; a sell `qty` above the
  owned count drops to the count (>= 1 by the enabled rule). Same state object when nothing changed.
- `onButton` by phase:
  - browse: Up / Down move (clears `info`); LB / RB switch tab (wrap fresh, clamp on repeat;
    clears `info`); Left / Right `'consumed'`; A on an enabled row → `qty` at 1; A on a disabled
    row or an empty list → `'consumed'`; Y → `info: true` (needs a cursor row); B → `pop`.
  - qty: Left −1, Right +1, clamped to `[1, max]` (`max` = `SHOP_BUY_MAX` for buy, the owned count
    for sell; repeats change it too); A → `confirm` with `yes = (tab === 'buy')`; B → `browse`;
    Up / Down / LB / RB / Y `'consumed'`.
  - confirm: a fresh Up / Down toggles `yes`; a repeat is `'consumed'` and never changes it;
    A with `yes` → `buy { shopId: vm.shop.shopId, itemId, qty }` or `sell { itemId, qty }`, and
    back to `browse`; A with No, and B → `browse`, no command; Left / Right / LB / RB / Y `'consumed'`.
- `paint(view, vm, state)` → `view.paint(p)`:

`shopView.ts`:
```ts
export interface ShopPaint {
  readonly tab: ShopTab;
  readonly activeKey: string | null;            // the cursor row's key in that tab
  readonly description: string | null | undefined; // undefined: slot empty; null: the "none" mark
  readonly prompt:
    | null
    | { readonly kind: 'qty'; readonly tab: ShopTab; readonly name: string; readonly qty: number }
    | { readonly kind: 'confirm'; readonly tab: ShopTab; readonly name: string; readonly qty: number;
        readonly gold: bigint; readonly yes: boolean };
}
paint(p: ShopPaint): void
```
- Constructor (locate-or-create, idempotent, no strings):
  - one `div.mr-frame-titlebar` holding `#shop-title` then `#shop-balance` (balance in the title);
    `#shop-balance` keeps its id, `hidden` / `data-balance-state` / text semantics.
  - `#shop-tabs` (the tab strip) after the title bar; `#shop-description` and `#shop-prompt`
    (with `#shop-prompt-text` and `#shop-confirm`) after `#shop-inventory`, before `#shop-feedback`.
- `render(vm)`: both lists are always built as today (`#shop-for-sale li` + `button[data-item-id]`,
  `#shop-inventory li` + button), each keyed row `li` carrying `data-nav-key` and class
  `mr-nav-item`. Then the kept paint is applied, on EVERY path (the no-shop early return too).
  Opening value: `{ tab:'buy', activeKey: <first keyed buy row, else null>, description: undefined, prompt: null }`
  — while the kept paint is the opening one, the cursor is the first keyed row of `#shop-for-sale`.
  The kept paint is reset to the opening value by a `render(vm)` while hidden (`openPendingShop`
  renders BEFORE `show()`) and by `show()` on the hidden→visible edge, which also re-applies it;
  `openOverlayA11y` stays the last statement of `show()`.
- When the cursor row changes, it is scrolled into view (`scrollIntoView({ block: 'nearest' })`,
  guarded for happy-dom).
- Applying a paint:
  - `#shop-tabs` via `renderTabs` (frame id `shop`): `#shop-tab-buy` / `#shop-tab-sell`,
    `role="tab"`, texts `t('shop.tab.buy')` / `t('shop.tab.sell')`, the active one `is-active` +
    `aria-selected="true"`.
  - the active tab's list is shown and the other has the `hidden` attribute (never removed from
    the DOM: `main.feedback*.test.ts` click both lists' buttons after a bare batch).
  - the cursor row `li` has `is-active` + `aria-current="true"`; no other row has either.
  - `#shop-description`: text `''` when `undefined`, `t('shop.description.none')` when `null`, else the string.
  - `#shop-prompt`: `hidden` when `prompt === null`. `qty` → `#shop-prompt-text` =
    `tf('shop.qty.buy' | 'shop.qty.sell', { name, qty })`, `#shop-confirm` hidden. `confirm` →
    text `tf('shop.confirm.buy' | 'shop.confirm.sell', { qty, name, gold })` and `#shop-confirm`
    rendered through `renderNav` (frame id `shopConfirm`): `#shopConfirm-root-yes` /
    `#shopConfirm-root-no` with `t('prompt.yes')` / `t('prompt.no')`.
- `#shop-feedback` stays dispatch's (ctl-7d); this slice adds no feedback ids.

### 4. `screens/index.ts` (CTL8A.4)

`dialogueView: dialogueScreen`, `healView: healScreen`, `shopView: shopScreen`; the other 14 stay
`legacyAdapter`. T keeps its legacy open paths in `main.ts`.

### 5. `styles.css` (class rules only)

- `.mr-shell--dock { justify-content: flex-end; padding: 0; border-color: transparent; background: transparent; pointer-events: none; }`
  (no inset, no overflow: `indexShell.smoke.test.ts` CTL7A-2 forbids them in a `.mr-shell--*`).
  It is written AFTER the base `.mr-shell` rule (equal specificity: source order decides).
- `.mr-frame--bottom` gains `padding`, `overflow: auto`, `pointer-events: auto`.
- `.is-revealing { animation: mr-reveal 600ms linear; }` + `@keyframes mr-reveal` (a left-to-right
  `clip-path` wipe), followed by `@media (prefers-reduced-motion: reduce) { .is-revealing { animation: none; } }`
  (the guard comes after the base rule; same specificity). The 600 ms is `DIALOGUE_REVEAL_MS`:
  both sites carry a comment naming the other.

### 6. Catalog ids (en / fr; `messageIds.ts` + both catalogs + `catalog.test.ts` pins) — 11 new

| id | params | en | fr |
|---|---|---|---|
| `shop.tab.buy` | — | `Buy` | `Acheter` |
| `shop.tab.sell` | — | `Sell` | `Vendre` |
| `shop.description.none` | — | `—` | `—` |
| `shop.qty.buy` | name: string, qty: number | `Buy how many ${name}? ×${qty}` | `Combien de ${name} acheter ? ×${qty}` |
| `shop.qty.sell` | name, qty | `Sell how many ${name}? ×${qty}` | `Combien de ${name} vendre ? ×${qty}` |
| `shop.confirm.buy` | qty: number, name: string, gold: bigint | `Buy ${qty} ${name} for ${gold} gold?` | `Acheter ${qty} ${name} pour ${gold} or ?` |
| `shop.confirm.sell` | qty, name, gold | `Sell ${qty} ${name} for ${gold} gold?` | `Vendre ${qty} ${name} pour ${gold} or ?` |
| `prompt.yes` | — | `Yes` | `Oui` |
| `prompt.no` | — | `No` | `Non` |
| `heal.prompt.question` | cost: string | `Heal party for ${cost}?` | `Soigner l’équipe pour ${cost} ?` |
| `heal.prompt.unavailable` | — | `No healer in reach. Healing is unavailable.` | `Aucun soigneur à portée. Soin indisponible.` |

Ids reach `t()` / `tf()` only as string literals at the call site (a ternary of two literal calls,
never a computed id).

## Decisions taken (spec is silent; flagged in the PR)

- The reveal is a fixed 600 ms CSS wipe, not a per-character typewriter.
- In battle the dialogue adapter answers Start, Select and B (dismiss, battle-safe) as out of
  battle and everything else `unhandled`. B always ends the talk at once (it also finishes the
  reveal); only A is reveal-gated.
- A second A within 1 s of an A-issued dialogue command is swallowed (no double advance).
- The retained per-row Buy / Sell buttons and the dialogue buttons still act at once on a click or
  on Enter while focused (no quantity row, no confirm) until ctl-15 absorbs the click delegate.
- A price that changes while a confirm is open is not repainted (display only; dispatch's line and
  the server price from live rows).
- Buy quantity is capped at 99; sell at the owned count; both clamp (no wrap).
- After Heal › Yes the frame stays open with the cursor on No.
- No / B at the shop confirm return to the list (the purchase is cancelled), B at the quantity row too.
- No new e2e test (the milestone's e2e table assigns none to ctl-8a); `dialogue.spec.ts`,
  `shop-npc.spec.ts` and `wallet-balance.spec.ts` must pass unmodified and are run locally.

## Tests (the tester writes them; tags are part of the acceptance-ledger CHECKs, each used by exactly ONE test title)

- `screens/dialogueScreen.test.ts` (NEW): `CTL8A-1-REVEAL-A`, `CTL8A-1-REVEAL-B`, `CTL8A-1-NAV-WRAP`,
  `CTL8A-1-REDUCED-MOTION`, `CTL8A-1-OBSERVE-REKEY`, `CTL8A-1-BATTLE-UNHANDLED`, `CTL8A-1-NO-DOUBLE-SEND`,
  `CTL8A-1-REPUSH-FIRST-A`, `CTL8A-1-SHOP-ZERO` (`pickShop { shopId: 0 }`).
- `dialogueView.test.ts`: `CTL8A-1-VIEW-BOTTOM-BOX`, `CTL8A-1-VIEW-PAINT`.
- `screens/shopScreen.test.ts` (NEW): `CTL8A-2-OPENS-ON-BUY`, `CTL8A-2-QTY-ROW`, `CTL8A-2-CONFIRM-DEFAULTS`,
  `CTL8A-2-CONFIRM-COMMAND` (incl. shop id 0), `CTL8A-2-CONFIRM-NO-REPEAT-FLIP`, `CTL8A-2-DESCRIPTION`,
  `CTL8A-2-UNSELLABLE`, `CTL8A-2-SETTLE`, `CTL8A-2-NO-SHOP`.
- `shopView.test.ts`: `CTL8A-2-VIEW-TABS`, `CTL8A-2-VIEW-TITLE-BALANCE`, `CTL8A-2-VIEW-BOTH-LISTS-STAY`,
  `CTL8A-2-VIEW-DESCRIPTION-SLOT`, `CTL8A-2-VIEW-PROMPT`, `CTL8A-2-VIEW-REOPEN-RESET` (closed mid-confirm on
  Sell, reopened: Buy tab, first row, no prompt). `shopModel.test.ts`: `CTL8A-2-MODEL-DESCRIPTION`.
  Named intentional change: the `kids.indexOf(balance) > kids.indexOf(title)` tooth (`shopView.test.ts`
  ≈241) is rewritten with `compareDocumentPosition` (both now sit in the title bar), not deleted.
- `screens/healScreen.test.ts` (NEW): `CTL8A-3-B13-BOUND-HEAL` (location 7 AND location 0),
  `CTL8A-3-UNBOUND-DISABLED`, `CTL8A-3-NO-AND-B-CLOSE`, `CTL8A-3-AFTER-YES-CURSOR-NO`, `CTL8A-3-OBSERVE-COST`.
- `healView.test.ts`: `CTL8A-3-VIEW-QUESTION`, `CTL8A-3-VIEW-DISABLED-REASON`.
- `screens/index.test.ts`: `CTL8A-4-ADAPTERS-SWAPPED`, `CTL8A-4-HOST-FLOW` (a `ScreenHost` over the
  shipped `SCREEN_ADAPTERS` with a fake store: D-pad + A on each of the three frames yields the
  command). Named intentional changes: `CTL6B-1-ADAPTERS-TOTAL` and `CTL7C-1-NAV-CAPABLE` (the
  three entries are no longer legacy), `catalog.test.ts` (roster + the 11 ids' pins).
- Forbidden shapes (milestone rule): no source-text scans, no greps of keymaps, no thresholds.
