# ctl-7d plan — the screen-context seam

Spec: `specs/monster-realm-v2/M-postgate-console-controls.spec.md` §ctl-7d (CTL7D.1–.6).
Base: `origin/master` @ 04a07833. Worktree `projects/monster-realm/.claude/worktrees/ctl-7d`, branch `ctl-7d`.
Client-only. No screen is converted; every `SCREEN_ADAPTERS` entry stays the legacy adapter.

## Functional core / imperative shell

| Decision | Pure home | Shell (main.ts) |
|---|---|---|
| Is a quantity sendable (integer 1..=4294967295)? | `ui/shopModel.ts` `validShopQty(qty)` | `dispatch` `buy`/`sell`: refuse + `console.error` before `performCare` |
| What a success line says (qty, item, gold moved) | `ui/shopModel.ts` `buyFeedback(...)` / `sellFeedback(...)` return DATA | `dispatch` resolves it with literal `tf` ids before the send |
| Which frames a batch observes, state keep, paint-on-change, error isolation | `ui/screens/index.ts` `ScreenHost.observe(stack, ctx)` | final batch listener: `syncStack(); screenHost.observe(contextStack, screenCtx);` |
| Is `pickShop` allowed at a battle base | `ui/contextStack.ts` `COMMAND_BATTLE_POLICY.pickShop = 'refuse'` | `dispatch` `pickShop` → `stepShopOpen({ kind: 'shopPicked', shopId })`; the click delegate dispatches the same command |
| Bound ids / reduced motion | none (live reads of shell state) | three `screenCtx` getters |

## Boundary contracts

### `ui/screens/types.ts`
```ts
// Command union
| { readonly kind: 'buy'; readonly shopId: number; readonly itemId: number; readonly qty: number }
| { readonly kind: 'sell'; readonly itemId: number; readonly qty: number }
| { readonly kind: 'pickShop'; readonly shopId: number }   // Dialogue group

// ScreenContext (all read-only, read live at each access)
readonly shopId: number | null;          // the shop the greet-then-shop open bound
readonly healLocationId: number | null;  // the heal location T bound
readonly reduceMotion: boolean;          // main.ts's one motionPreference

// ScreenAdapter
observe?(vm: VM, state: S, now: number): S;
```
`observe` contract: called after a store batch for every open screen/prompt frame (covered ones
too). Return the SAME object for "nothing changed" (kept, no paint) or a new object (kept, painted once).

### `ui/screens/index.ts` — `ScreenHost.observe(stack, ctx): void`
For each frame of `stack`, bottom up, with `kind === 'screen' | 'prompt'` whose adapter defines `observe`:
1. `vm = adapter.viewModel(ctx)`; `kept = states.has(id) ? states.get(id) : adapter.init(vm)`;
   `next = adapter.observe(vm, kept, ctx.now())`.
2. If `next !== kept` and the adapter has `paint` and a view is lent: `paint(view, vm, next)` once.
3. `states.set(id, next)` (so a first observe keeps what `init` produced even when unchanged).
4. Steps 1–3 sit in one `try`; a throw from `viewModel`, `init`, `observe` or `paint` goes to
   `#onPaintError`, the frame's entry in `states` is left exactly as it was (set happens last), and
   the loop continues with the next frame.
Base frames and text-entry frames are skipped (a text entry's owner is observed through its own
frame). Adapters without `observe` run no code and their state is untouched.

### `ui/shopModel.ts`
```ts
/** Whether `qty` fits the buy/sell reducers' u32 quantity: an integer from 1 to 4294967295. */
export function validShopQty(qty: number): boolean

/** What a successful buy or sell moved: the item and the gold when both rows are loaded, else the quantity alone. */
export type ShopFeedback =
  | { readonly kind: 'item'; readonly qty: number; readonly name: string; readonly gold: bigint }
  | { readonly kind: 'count'; readonly qty: number };

export function buyFeedback(shopId: number, itemId: number, qty: number,
  shopItems: readonly StoreShopItemRow[], itemDefs: ReadonlyMap<number, StoreItemRow>): ShopFeedback
export function sellFeedback(itemId: number, qty: number,
  itemDefs: ReadonlyMap<number, StoreItemRow>): ShopFeedback
```
- buy: `name` from `itemDefs.get(itemId)`, unit price from the FIRST `shopItems` row with
  `shopId === shopId && itemId === itemId` (the server's `filter(shop_id).find(item_id)`); `gold = buyPrice * BigInt(qty)`.
- sell: `name` and `sellPrice` from `itemDefs.get(itemId)`; `gold = sellPrice * BigInt(qty)`.
- Any needed row missing → `{ kind: 'count', qty }` (never a partial line, never `Unknown (#N)`).
- Total: a `qty` that is not `validShopQty` (BigInt would throw) → `{ kind: 'count', qty }`; malformed
  row fields (`buyPrice`/`sellPrice` not a bigint, `name` not a string) degrade to `count`, never throw.
- Deviation from the spec note's sketch `{ qty, name?, gold? }`: a two-arm union, so "name without
  gold" is unrepresentable and main.ts picks the id by `kind`. Recorded in the spec build note.
- No i18n import (catalogParity's resolver-import roster unchanged).

### i18n (both catalogs + `messageIds.ts`)
Delete plain ids `shop.feedback.purchased`, `shop.feedback.sold`. Add four param ids (prefix-free):

| id | params | en | fr |
|---|---|---|---|
| `shop.feedback.buy.item` | `{ qty: number; name: string; gold: bigint }` | `✓ Bought ${qty} ${name} (−${gold}g)` | `✓ Acheté ${qty} ${name} (−${gold} or)` |
| `shop.feedback.buy.count` | `{ qty: number }` | `✓ Bought ×${qty}` | `✓ Acheté ×${qty}` |
| `shop.feedback.sell.item` | `{ qty: number; name: string; gold: bigint }` | `✓ Sold ${qty} ${name} (+${gold}g)` | `✓ Vendu ${qty} ${name} (+${gold} or)` |
| `shop.feedback.sell.count` | `{ qty: number }` | `✓ Sold ×${qty}` | `✓ Vendu ×${qty}` |

Glyphs: `✓` U+2713 (the success mark CTL8A.2's example shows; catalog precedent `evolution.gate.metRow`),
`−` U+2212 (never the ASCII hyphen), `×` U+00D7 (as in `shop.sell.row`). No French punctuation that
needs a U+00A0 (the fr lines carry no `:` `;` `!` `?`). Every glyph lives in the catalog only (glyph
rule). Tests pin the literal bytes by code point, never by reading the catalog under test.


### `main.ts`
- `screenCtx`: `get shopId() { return boundShopId; }`, `get healLocationId() { return boundHealLocationId; }`,
  `get reduceMotion() { return motionPreference.reduceMotion; }` (no second `matchMedia` read, A11Y-28).
- `dispatch`:
  - `buy`/`sell`: `if (!validShopQty(qty)) { console.error(naming the command); return DONE; }` then
    `performCare({ call: () => liveReducers()?.buy({ shopId, itemId, qty }), successMessage: <resolved now from the store>, ... })`.
    The line is resolved BEFORE the send (as today), so a sell-all's removed inventory row cannot blank it.
  - `pickShop`: `stepShopOpen({ kind: 'shopPicked', shopId: command.shopId }); return DONE;`
- Delete `SHOP_QTY`; `ShopView` wiring sends `qty: 1`.
- Click delegate `[data-shop-id]` branch: `void dispatch({ kind: 'pickShop', shopId })` (so a click at a
  battle base is refused with the battle reason — the spec's named intentional change).
- Final batch listener: `syncStack(); screenHost.observe(contextStack, screenCtx);`.
- `ui/contextStack.ts`: `pickShop: 'refuse'` row.

## Data model
No server, schema, bindings or content change. Additive `Command` arms/fields; two catalog ids removed
(unused after this slice), four added.

## Tests (tester-authored; tags are the ledger's roster — each tag in exactly one test title)

| Gate | Tag | File |
|---|---|---|
| CTL7D.1 | `CTL7D-1-BOOT-SHOP-ID`, `CTL7D-1-BOOT-HEAL-ID`, `CTL7D-1-BOOT-RECONNECT-NULL` | `main.dispatch.test.ts` |
| CTL7D.2 | `CTL7D-2-BOOT-REDUCED-MOTION` | `main.dispatch.test.ts` |
| CTL7D.3 | `CTL7D-3-QTY-RULE` | `ui/shopModel.test.ts` |
| CTL7D.3 | `CTL7D-3-BOOT-QTY-SENT`, `CTL7D-3-BOOT-QTY-REJECTED` | `main.dispatch.test.ts` |
| CTL7D.4 | `CTL7D-4-FORMATTER` | `ui/shopModel.test.ts` |
| CTL7D.4 | `CTL7D-4-BOOT-LINE-EN`, `CTL7D-4-BOOT-LINE-FR` | `main.feedbackI18n.test.ts` |
| CTL7D.4 | `CTL7D-4-BOOT-QTY-LINE`, `CTL7D-4-BOOT-SEND-TIME` | `main.dispatch.test.ts` |
| CTL7D.5 | `CTL7D-5-POLICY-REFUSE` | `ui/contextStack.test.ts` |
| CTL7D.5 | `CTL7D-5-BOOT-PICKSHOP`, `CTL7D-5-BOOT-BATTLE-REFUSED` | `main.dispatch.test.ts` |
| CTL7D.6 | `CTL7D-6-OBSERVE-THREADS`, `CTL7D-6-OBSERVE-INIT`, `CTL7D-6-OBSERVE-PAINT`, `CTL7D-6-OBSERVE-THROWS`, `CTL7D-6-OBSERVE-SKIPS` | `ui/screens/index.test.ts` |
| CTL7D.6 | `CTL7D-6-BOOT-OBSERVE` | `main.dispatch.test.ts` |

Named intentional changes to existing tests (spec Tasks): `main.feedbackI18n.test.ts` pinned feedback
ids; `main.dispatch.test.ts` ShopView `onBuy`/`onSell` feedback-id pins and the battle case's literal
refuse list (`pickShop` joins `noViewCallback` or is driven); `contextStack.test.ts` `buy`/`sell`
literals and the 12/24/36 → 12/25/37 counts; `catalog.test.ts` `EXPECTED_PLAIN`/`SAMPLE_PARAMS`/
param-output rosters; `catalogParity.test.ts` main.ts literal-key list. Also forced by the id deletion
(same file, not in the spec's list): `catalogParity.test.ts` 21r-b FR-04 names the two deleted ids
(15 → 13 keys). No forbidden check shapes (no source scans, no count thresholds); booted tests feed
events and read outcomes.

## Anti-patterns to avoid
- Clamping or defaulting a bad quantity (`Math.max(1, qty)`, `qty | 0`, `>>> 0`): reject, don't clamp.
- A truthiness guard on ids (`shopId || null`, `if (locationId)`): 0 is a real id.
- Snapshotting `reduceMotion`/bound ids into the `screenCtx` literal: they must be getters.
- A second `matchMedia` read.
- Resolving the success line at settle time (the sold-out inventory row is gone by then).
- Painting on every observe (a 60 Hz-ish batch stream would repaint every open frame) or keeping a
  state whose paint/observe threw.
- Running `viewModel`/`init` for adapters that define no `observe` (legacy adapters must see no new calls).
- An i18n import in `shopModel.ts`; a dynamic key at `tf`.
- A new module, class or abstraction: every change lands in an existing file.

## Out of scope / residuals
- No in-flight lock for an A-driven buy (spec CTL8A.2 accepts it).
- R-ctl-7c-HEALGUARDTEST stays backlog.
- ARCHITECTURE.md is outside `touches:`; no DECISIONS entry (no decision meets the bar: the seam
  follows ctl-7c's recorded shape).

## Plan review (reviewer + red-team, 2026-10-02) — adjudication

Accepted into the plan / tester brief:
- **Booted tests live in `main.dispatch.test.ts`** (it has `swapAdapter`, `putBattle`, the mutable adapter
  table); `main.dialogueDismiss.test.ts` has neither and needs no change. `pickShop` is driven by a
  stand-in `dialogueView` adapter with ids 0 and 4 (a hardcoded id or a truthiness guard dies), one
  dismiss, no shop before the conversation ends, last pick wins; the non-numeric `data-shop-id` click
  still sends nothing (the delegate keeps its `Number.isNaN` guard).
- **Quantity rule** is tested against the wrap/coercion table the SDK would silently accept
  (`DataView.setUint32`: −1 → 4294967295, 2^32+3 → 3, 1.5 → 1, `'3'` → 3): accept 1, 2^31, 4294967295;
  reject 0, −0, 0.9999999999999999, 1.5, −1, 2^32, 2^32+1, 2^53, MAX_SAFE_INTEGER, 1e21, ±Infinity, NaN,
  `'3'`, `''`, `true`, null, undefined, `[3]`, `{valueOf}`, `new Number(3)`, `3n`, `Symbol()`; never throws.
  `console.error` passes `qty` as its own argument (a template literal throws on a Symbol).
- **Money wiring**: the real ShopView only sends 1, so the booted quantity line uses a stand-in adapter:
  qty 3, total ≠ unit price, a price above 2^53 (bigint arithmetic), two shops stocking the same item at
  different prices with `command.shopId` ≠ the bound shop, each row missing in turn, the count line,
  both locales, literal expected strings. A separate send-time test holds the reducer, mutates the
  rows, releases, and expects the at-send line.
- **`observe` placement** is pinned by a frame the SAME batch pushed (observed once, from `init`, after the
  batch's view renders), one observe per batch per frame, and state from batch N arriving in N+1.
  Unit cases: falsy/nullish states (`states.has`, not `??`), `observe: undefined` as an own key, no view
  lent still keeps the state, throw at each of viewModel/init/observe/paint at bottom/middle/top with
  and without prior state, the next `button` seeing the prior state.
- **Reduced motion**: the `matchMedia` stub is installed before `import('./main')`, flips by EVENT only
  (its `.matches` stays put), and is called exactly once however often the getter is read.
- **Docs to refresh in-file**: `types.ts` (`init` is asked at the first step OR observe; `observe`
  states are immutable; bound ids keep their last value after a close and may be null while the heal
  frame is open after a reconnect), `index.ts` header (the host also runs on a batch), `main.ts` final
  listener comment (observe depends on being last), `shopModel.ts` header (the dispatch call site is
  not try/catch-wrapped: totality is load-bearing there).

Decided, not built:
- **No `shopId`/`itemId` u32 validation** in `buy`/`sell`/`pickShop`: the spec asks for the quantity only,
  ids come from store rows, and an unknown shop id already opens the no-shop view. Residual (LOW).
- **`healView` is not hidden on reconnect** (pre-existing): after a reconnect the heal frame can be open
  with `healLocationId === null`. CTL8A.3 already disables Heal with a reason on a null id. Documented
  in `types.ts`, pinned by `CTL7D-1-BOOT-RECONNECT-NULL`, residual → ctl-10a (the next heal slice on `main.ts`).
- **Text-entry frames are not observed** (spec letter: "screen or prompt frame"). A text-entry frame
  replaces its owner's frame on the real stack (`contextStep` dedupes on the owner id), so an owner is
  not observed while typing. No text-entry frame is pushed today; ctl-8h extends the walk if it needs it.
- **A persistently throwing observe/paint logs once per batch** (the error ring dedupes consecutive
  identical messages only). Accepted per spec; a forward risk once ctl-8 adapters define `observe`.
- **Duplicate shop-item rows**: unreachable (`validate_shops` rejects them); `find` is used, no test.
- **`!==` identity compare** (not `Object.is`): states are objects by contract.
- Server: `sell` answers `qty > available` with "item is in an active trade" even with nothing in escrow
  (`server-module/src/economy.rs`); visible once ctl-8a sends quantities. Residual (LOW, backlog).
- Spec Tasks amendments (build note): `catalog.test.ts` edit sites are `EXPECTED_PLAIN` /
  `SAMPLE_PARAMS` / `EXPECTED_PARAM_OUTPUTS` (`EXPECTED_KEYS` is derived); `contextStack.test.ts` also
  changes the `sell` literal; `catalogParity.test.ts` FR-04 drops the two deleted ids (15 → 13).
