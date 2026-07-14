---
name: monster-realm-m15a
description: M15a trading spine — post-hoc review pass findings, fixes, and verdict (PR #165, ADR-0106)
metadata:
  type: project
---

M15a trading spine review pass completed (2026-07-13). PR #165 = MERGE-OK after 7 findings fixed.

**Why:** Orchestration audit found no tester/review lenses ran during the build phase. Supervisor required a full post-hoc review before merge.

**How to apply:** Use as reference for future trading/escrow features (M15b client, M15c evals). The findings below are the known residuals that must be addressed in M15b/M15c.

## Findings fixed in commit 289879d

| # | Severity | Fixed |
|---|----------|-------|
| F1 (item-id dedup) | HIGH | `validate_proposal` now rejects duplicate item_id per side; `DuplicateItem` error variant added |
| F2 (counterparty existence) | SIGNIFICANT | `propose_trade` rejects unjoined counterparty identity |
| F3 (balance at propose time) | SIGNIFICANT | Currency + item inventory checks added at propose time |
| F4 (heal_party saturating_sub) | SIGNIFICANT | Changed to `saturating_sub_u64()` for eval consistency |
| F5 (TR-22 label) | CRITICAL | Fixed wrong TEETH kill annotation |
| F6 (counterparty build_swap_plan path) | CRITICAL | TEETH test added for counterparty ownership change |
| F7 (escrowed_item_qty counterparty branch) | SIGNIFICANT | TEETH test added |

## Waived findings / follow-up

- `evolves_to` not recomputed (W1): **FALSE POSITIVE** — bond/level unchanged by trade
- `respond_trade`/`cancel_trade` state machine unit tests (W2): M15c e2e scope
- Repeated `active_trades_for` chain (W4): extract helper in M15b
- `TradeSide` enum → `from_initiator: bool` (W5): M15b clean-up
- `trade_offer` public table leaks offer terms (W3 INFO): M16 per-row RLS

## Key traps for M15b/M15c

- `validate_proposal` is pure — no DB access. Balance checks belong in the server shell (`propose_trade`), not here.
- Knowledge bundle drifts on any reducer signature change — run `just knowledge` before commit.
- The `active_trades_for` iterator chain pattern appears at 11 call sites — an `active_trades_for(ctx, owner) -> Vec<TradeOffer>` helper would de-dup them but needs iterator boxing or Vec allocation.
- ADR-0106 D8: SpacetimeDB WASM is single-threaded — no TOCTOU possible within one reducer.

## ADR / memory

ADR-0106 = trading spine design decisions. next-free ADR = 0107.
