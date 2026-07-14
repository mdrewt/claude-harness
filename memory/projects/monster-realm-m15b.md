---
name: monster-realm-m15b
description: m15b trade client UI (ADR-0107, PR #168): TradeCallbacks → Promise<void> for lock correctness; KeyB/KeyI/KeyE mutual exclusivity guard; sort comparator three-way; ownTradeOffer iteration-order caveat
metadata:
  type: project
---

## m15b — Trade Client UI (ADR-0107)

Trade overlay display and interaction layer built atop m15a's trade_offer table spine.

### Critical traps (reviewer findings)

- **B-1 (dispatch must return Promise, not void):** `TradeCallbacks` typed `(tradeId: bigint) => Promise<void>` — async lock pattern. Returning `void` breaks the `await` in `main.ts`, so the `#pending` flag stays set forever and buttons stay disabled on ghost-disconnects. Dispatch callables verified in `tradeView.ts:31-38`.
- **B-2 (KeyB/KeyI/KeyE need mutual-exclusion guard):** `main.ts` toggle handlers for box/inventory/evolution check `!tradeView?.visible` before opening. If the guard is missing, two overlays can be visible at once, confusing the renderer and DOM event handling. Cross-checked against M13.5b pattern (`shopView.hide()`).
- **M-1 (sort comparator must be three-way):** JS `Array.sort()` with comparator returning 0 (tie) is stable only in modern engines. Comparator in `tradeModel.ts:buildTradeViewModel` explicitly breaks ties by `tradeId` numeric order (`a.tradeId < b.tradeId ? -1 : 1`) to guarantee deterministic output across runs.

### Pattern — async lock discipline

`TradeCallbacks → Promise<void>` pattern mirrors M13d shop double-spend lock (ADR-0084). The `#pending` flag in `main.ts` is set before calling the reducer, cleared only after the Promise settles (success or error). A disconnect that drops the Promise without settling leaves the flag set; reconnect calls `tradeView.reset()` to clear it (and all in-flight state).

### Key design notes

- **`ownTradeOffer()` iteration order:** returns the first match from the `trade_offers` Map in insertion order, NOT sorted by tradeId. Document this for future callers — if they expect lowest tradeId, they will get the wrong row.
- **Pure model + DOM shell:** `buildTradeViewModel` is pure and fully tested (`tradeModel.test.ts`, 44 tests including identity-filtering and fast-check bigint edge cases). `TradeView` class is thin DOM imperative shell, coverage-excluded per `dom-shell-coverage-exclusion.eval.mjs`.
- **Mutual exclusion:** KeyU toggle checks current state; box (B) / raising (I) / evolution (E) overlays guard their opens with `!tradeView?.visible` check.

### Coverage

- `tradeView.ts` DOM shell is excluded from vitest coverage per established pattern (ADR-0050 amended, `dom-shell-coverage-exclusion.eval.mjs` includes `ui/tradeView.ts` in exclude list).
- `tradeModel.ts` pure logic: 44 Vitest tests covering all 4 action states (propose/respond/confirm/cancel), bigint boundary cases, identity dedup, and fast-check property-based tests.

### ADR reservation

**ADR-0108 next-free** — m15b did not introduce a new design decision (all patterns are reuses of m13d/m14/m15a). Future work (m15c evals, m16 PvP, etc.) will reserve 0108+.

### Deferred

**m15c (trade evals tail — NOT STARTED):** SpacetimeType schema snapshot eval for `MonsterCard` / `TradeItem` / `TradeStatus` / `trade_offer` table. Parallels m15b after m15a merges to main.
