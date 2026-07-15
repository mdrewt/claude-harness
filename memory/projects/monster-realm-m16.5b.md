---
name: monster-realm-m16.5b
description: M16.5b receiver-cap headroom check — reject-not-clamp in confirm_trade (ADR-0113, PR #183)
metadata:
  type: project
---

**M16.5b DONE** — PR #183 open, `just ci` green (1192 Rust tests, 62 evals, 938/938 client tests).

**Why:** `confirm_trade` debited fallibly (`consume_one`/`spend_currency`) but credited infallibly (`grant_item`/`grant_currency` silently clamp at MAX_ITEM_STACK=9999 / MAX_BALANCE=999_999_999). Trading 50 potions to a receiver holding 9,980 destroyed 31 silently. Ninth-review residual §16.5b.

**Key decisions (ADR-0113):**
- New pure fn `check_headroom` in `game-core/src/trading/rules.rs` — pre-flight before any mutation in `confirm_trade`
- `MAX_ITEM_STACK` moved from `server-module/src/inventory.rs` to game-core (SSOT)
- `ItemStack { item_id, current_count }` struct in game-core with `#[derive(Clone, Debug, PartialEq)]`
- Two new `TradeError` variants: `ItemStackCapExceeded { item_id }` + `CurrencyCapExceeded`
- Call site subtracts sent qty before building stacks (net-quantity fix for symmetric same-item trades)

**Critical trap (reviewer MAJOR-1 / red-team FINDING-1):** If initiator sends AND receives the same `item_id`, the pre-debit raw count overstates headroom. Fix: `raw_count.saturating_sub(sending_qty)` in both `i_stacks` and `c_stacks` construction in `confirm_trade`.

**Proof-of-teeth:**
- 11 unit tests in `rules.rs` (9 original + 2 same-item pair: pre-debit rejects, effective-count accepts)
- EA-HEADROOM-01: presence of `check_headroom` call in `confirm_trade`
- EA-HEADROOM-02: ordering assertion — `check_headroom` byte offset < `build_swap_plan` byte offset
- `trade-conservation` eval: 7th criterion HEADROOM_CHECK with bad/good fixtures
- ADR-0113 next-free = 0114

**How to apply:** M16.5c (if any) continues from PR #183 base. Next ADR = 0114.
