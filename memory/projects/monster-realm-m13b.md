---
name: monster-realm-m13b
description: m13b shop content + buy/sell reducers — PR #113, ADR-0082, CONTENT_VERSION 6
metadata:
  type: project
---

PR #113 (`feat/m13b-shop-content-reducers`, tip `db5f1ce`) — shop content + buy/sell reducers.

**Why:** M13 economy milestone task 2: first player-facing economy feature (ADR-0082).

**How to apply:** ADR-0082 is the shop design reference; next-free ADR = 0083.

## What landed

- `game-core/content/shops/000-core.ron` — 1 shop (Pebble Town), 2 items (buy prices 200/300)
- `sell_price: u64` on `ItemDef`/`ItemRow` (`#[serde(default)]` for backward compat); Lure Berry 80, Power Root 120
- `ShopDef`/`ShopStockEntry` types + `load_shops`/`parse_shops`/`validate_shops` in game-core
- `validate_shops`: rejects dangling item refs, duplicate shop ids, duplicate item_id per shop, buy_price == 0 (free-item exploit guard)
- `shop_row` (public, PK `shop_id`) + `shop_item_row` (public, auto_inc PK, btree on `shop_id`) in schema.rs
- `buy(shop_id, item_id, qty)` + `sell(item_id, qty)` reducers in `economy.rs`
  - server-priced, atomic, reject-not-clamp
  - `require_owner` before spend/consume (ADR-0081 forward obligation satisfied)
  - `checked_mul` overflow guard on both
  - `sell` validates total before consume loop (correctness-first)
- `#[allow(dead_code)]` removed from currency helpers (first callers landed)
- CONTENT_VERSION 5 → 6; sync_content seeds shop tables (upsert shop_row, clear+reinsert shop_item_row)
- `evals/shop-reducer-security.eval.mjs` — 5 teeth; `spec-gap-revival` sell→ambiguous (false-positive fix)
- Baselines updated: `table-schemas.json`, `content-hash.json` (version 6)

## Red-team findings resolved

- RT-SHOP-BUY-FREE (HIGH): `buy_price == 0` silently free — fixed in `validate_shops`
- `require_owner(p.identity)` tautology: LOW/informational (structural formality fulfilling ADR-0081 letter)

## ADR-0082 design decisions

- D1: server-computed price (no client param)
- D2: sell_price global per-item (not per-shop); 0 = not sellable; sell(item_id, qty) no shop_id
- D3: infinite shop stock (no depletion) for MVP
- D4: require_owner before every spend/consume
- D5: checked_mul overflow safety
- D6: clear-and-reinsert shop_item_row (auto_inc PK); upsert shop_row (stable shop_id PK)
- D7: buy_price == 0 rejected by validate_shops (not silently purchasable)
