---
name: monster-realm-m16.5d
description: m16.5d trade runtime coverage — __mrTrade hook + full-flow e2e + TR-13 + RT-SEC-02b (ADR-0115, PR #187)
metadata:
  type: project
---

**ADR-0115** (PR #187, branch `feat/m16.5d-trade-runtime-coverage`, tip `a412b27`). ADR next-free = 0116.

## What shipped

**D1 — `window.__mrTrade` test hook (`client/src/main.ts` ~line 988)**
Four trade reducer wrappers (`proposeTrade/respondTrade/confirmTrade/cancelTrade`) + two subscription queries (`allTradeOffers()/allPlayers()`). All BigInt fields serialized as strings for Playwright's structured-clone boundary. Mirrors `window.__game` pattern (no DEV gate — consistent with `__game`; comment documents the tradeoff). `MrTrade` interface re-declared in `trade-full.spec.ts` (manual sync required — page.evaluate() boundary is opaque to tsc).

**D2 — Two-context Playwright e2e (`client/e2e/trade-full.spec.ts`)**
Two `chromium.launch()` instances (not two contexts of one browser) — each gets a distinct SpacetimeDB identity. Tests: hook-existence (m16.5d-1) + full propose→respond→confirm flow (m16.5d-2/3/4). Trade scenario: A offers starter Flameling to B (non-zero asset required — `validate_proposal` rejects zero-asset trades with `EmptyOffer`). Conservation: 1+1=2 monsters before = 0+2=2 after. Throw guards on all reducer evaluate calls (diagnostic vs silent timeout on undefined return).

**D3 — Eval fix (`evals/trade-escrow-guards.eval.mjs`)**
- TR-13: `['attempt_recruit', 'escrowed_item_qty', 1, 'TR-13']` added to GUARD_SITES (resolves TR-12 tag collision with `use_battle_item`). The guard already existed in `taming.rs` at line 99 since M16.5a — eval-only fix.
- RT-SEC-02b: `bodyHasGuard` now strips Rust string literal contents before counting: `body.replace(/"(?:[^"\\]|\\.)*"/g, '""')`. Prevents false positives from `log::info!("guard_name(x)")` matching the needle. Red-team found this; fix turns the RED tooth GREEN.
- Guard-site count: 11 → 12 (TR-2..TR-13).

## Key traps

**Zero-asset trade rejection**: `validate_proposal` in `game-core/src/trading/rules.rs` returns `Err(TradeError::EmptyOffer)` when `total_assets == 0`. The e2e must trade at least one asset.

**Two browser instances, not two contexts**: A single `browser.newContext()` would share the SpacetimeDB identity (SDK caches connection in module scope). `chromium.launch()` twice ensures distinct identities.

**RT-SEC-02b false-positive**: `bodyHasGuard` without string stripping would count `log::info!("reject_if_monster_in_trade(x)")` as a real guard call. Fix: strip `"..."` contents before `indexOf`.

**TR-13 collision**: `attempt_recruit` had `escrowed_item_qty` guard since M16.5a but was tagged TR-12 in the eval (colliding with `use_battle_item`). No taming.rs change — eval-only.

**Why:** M16.5 ninth-review-residuals closed; full trade lifecycle now gated by e2e; eval static analysis hardened against string-literal false positives.
**How to apply:** When extending the trade system or the `bodyHasGuard` pattern, remember string-literal stripping is now in place; any future guard checker should apply the same pattern.
