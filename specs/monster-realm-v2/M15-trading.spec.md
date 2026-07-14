# M15 — Trading (escrowed dual-consent)

**Status:** design sketch → **elaborated at build time** (m15a, 2026-07-13) · **Phase C** · **Decision:** ADR-0024 + ADR-0106

> Provisional sketch promoted to build-ready spec. The granular EARS criteria + task breakdown
> were drafted during m15a per `PLAN.md §9`. The Phase-A playtest confirmed this shape is correct.

## Problem / intent
The first cross-player transaction: two players safely swap monsters (and items/currency) with **no dupes, no
theft, no trading an in-use asset**. The dual-consent + escrow + atomic-swap pattern is the **backbone** the
rest of the social economy reuses.

## Scope (condensed)
- **`trade_offer`** table, public (both parties subscribe), carrying a display-only `MonsterCard` snapshot so
  the counterparty sees the offer without leaking the underlying `monster` row (ADR-0015 stakes).
- **Escrow** via a `reject_if_in_trade` guard family wired into **every** monster/item/currency-mutating
  reducer (mirrors `reject_if_in_battle`): an offered asset can't be sold/fused/trained/re-offered mid-trade.
- **Flow:** `propose_trade → respond_trade → confirm_trade` → an **atomic swap** that re-reads both **live**
  rows, re-checks ownership/escrow, swaps ownership (+ clears party_slot, re-derives evolves_to for new
  owner), transfers items/currency, deletes the offer row — one transaction (no dupe/orphan). `cancel_trade`
  and `client_disconnected` release the escrow (the lock lives in the row).
- **Out of scope:** auction house / open market (later, on this backbone); trade-evolution (additive on M10).

## Key design decisions (ADR-0106)

- **D1 — Guard shape:** Three pure helper functions (`reject_if_monster_in_trade`, `escrowed_item_qty`,
  `escrowed_currency_amount`) mirror `reject_if_in_battle`'s iterator+Borrow shape. The fungible helpers
  return reserved amounts; call sites compare against available balance. Keeps each function focused.
- **D2 — `MonsterCard` snapshot has NO genes** (IVs/EVs/nature — ADR-0015). The `trade_offer` row stores
  only the public-projection field set. The authoritative swap re-reads live rows.
- **D3 — No physical escrow:** assets stay in place during the offer; the guard makes them immutable.
  `atomic_swap` re-reads live rows at finalization — prevents dupe/orphan and avoids double-write surface.
- **D4 — One active offer per player** (as initiator OR counterparty). A second `propose_trade` is rejected.
- **D5 — Terminal rows deleted:** `Cancelled` and completed swaps delete the `trade_offer` row entirely
  (releases the guard). Mirrors battle terminal GC (M12.5e).
- **D6 — Status + bools are co-maintained:** `initiator_confirmed`/`counterparty_confirmed` bools drive
  transitions, but `atomic_swap` fires ONLY from `TradeStatus::ConfirmedByCounterparty` + both bools true.
- **D7 — No CONTENT_VERSION bump:** `trade_offer` is a runtime table (not seeded content). Stays 12.

## EARS acceptance criteria (m15a spine — §4 task checkboxes)

- **TR-1** — WHEN a joined player calls `propose_trade(counterparty, monsters, items, currency)` with
  owned, non-duplicated, non-empty offer assets THE SYSTEM SHALL insert one `trade_offer` row with
  `status = Pending`, a `MonsterCard` snapshot per offered monster (public fields only), and
  `initiator_confirmed = counterparty_confirmed = false`.
- **TR-2** — WHILE a monster is in a Pending or ConfirmedByCounterparty offer THE SYSTEM SHALL reject
  `evolve(monster_id)` with `"monster is in an active trade"`.
- **TR-3** — WHILE either parent is in an active offer THE SYSTEM SHALL reject `fuse(a_id, b_id)` (checked
  for BOTH parents; mirrors the double-call pattern of `reject_if_in_battle` in `fuse`).
- **TR-4** — WHILE a monster is in an active offer THE SYSTEM SHALL reject `set_nickname(monster_id, ...)`.
- **TR-5** — WHILE a monster is in an active offer THE SYSTEM SHALL reject `set_party_slot(monster_id, ...)`.
- **TR-6** — WHILE a monster is in an active offer THE SYSTEM SHALL reject `care(monster_id)`.
- **TR-7** — WHILE a monster is in an active offer THE SYSTEM SHALL reject `train(monster_id, ...)`.
- **TR-8** — WHILE an item is escrowed in an active offer THE SYSTEM SHALL reject `sell(item_id, qty)` when
  `qty > available_count` (available = total inventory count minus escrowed qty for that item_id).
- **TR-9** — WHILE currency is escrowed for the caller in an active offer THE SYSTEM SHALL reject `buy`
  when `cost > available_balance` (available = wallet balance minus escrowed currency amount).
- **TR-10** — WHILE currency is escrowed for the caller THE SYSTEM SHALL reject `heal_party` when
  `heal_cost > available_balance`.
- **TR-11** — WHILE a monster is in an active offer THE SYSTEM SHALL reject `start_battle` if that monster
  is in the submitted `party_monster_ids`.
- **TR-12** — WHILE an item is escrowed in an active offer THE SYSTEM SHALL reject `use_battle_item(item_id)`
  when consuming would breach the escrowed reserve (available count < 1 after escrow deduction).
- **TR-13** — WHEN the counterparty calls `respond_trade(trade_id, accepted=false)` THE SYSTEM SHALL delete
  the `trade_offer` row (guard released; no assets moved).
- **TR-14** — WHEN the counterparty calls `respond_trade(trade_id, accepted=true)` on a Pending offer THE
  SYSTEM SHALL set `status = ConfirmedByCounterparty` and `counterparty_confirmed = true`.
- **TR-15** — WHEN the initiator calls `confirm_trade(trade_id)` on a ConfirmedByCounterparty offer THE
  SYSTEM SHALL re-read the live `monster`/`inventory`/`player_wallet` rows and execute `atomic_swap` in one
  transaction, failing loud (rollback + `Err`) if any recorded asset no longer belongs to its recorded owner.
- **TR-16** — WHEN `atomic_swap` executes THE SYSTEM SHALL transfer each offered monster's `owner_identity`
  (dual-write `monster` + `monster_pub`, clear `party_slot` to `PARTY_SLOT_NONE`), move item counts, and
  debit/credit both wallets so total assets are conserved (no dupe, no orphan), then delete the trade_offer
  row.
- **TR-17** — WHEN the initiator calls `cancel_trade(trade_id)` before finalization THE SYSTEM SHALL delete
  the offer row and release the guard (no assets moved). Counterparty may also cancel on a
  ConfirmedByCounterparty offer (they already accepted but initiator hasn't confirmed).
- **TR-18** — WHEN a client disconnects THE SYSTEM SHALL delete any `trade_offer` row where it is initiator
  OR counterparty (guard released, no assets moved).
- **TR-19** — The `MonsterCard` type SHALL contain NO `iv_*`, `ev_*`, or `nature_kind` field. This is
  verified by a proof-of-teeth structural test/eval.
- **TR-20** — WHEN a player already has a non-terminal offer (Pending or ConfirmedByCounterparty) as
  initiator OR counterparty THE SYSTEM SHALL reject a second `propose_trade` with `"already has an active
  trade"`.
- **TR-21** — WHEN a player tries to propose a trade to themselves THE SYSTEM SHALL reject it.
- **TR-22** — WHEN `propose_trade` lists a monster_id not owned by the initiator THE SYSTEM SHALL reject it.

**Escrow-semantics note (TR-8/9/10/12):** Fungible-asset guards are QUANTITATIVE, not boolean. Because no
assets are physically moved at propose time, the guard computes `available = current - escrowed_reserve`
and rejects only if the requested spend exceeds the available amount. This is distinct from the monster guard
(boolean: is this monster_id in any active offer?).

## §4 Task checkboxes (m15a)

- [ ] Elaborate spec + write ADR-0106 (PR #TBD)
- [ ] `MonsterCard`, `TradeStatus`, `TradeError` types in `game-core/src/trading/`
- [ ] `game_core::trading` pure rule module (propose/respond/confirm/atomic_swap/cancel)
- [ ] `trade_offer` table in `server-module/src/schema.rs`
- [ ] `reject_if_monster_in_trade`, `escrowed_item_qty`, `escrowed_currency_amount` in `guards.rs`
- [ ] Wire guard into 12 reducers: evolve, fuse×2, set_nickname, set_party_slot, care, train, sell, buy,
  heal_party, use_battle_item, attempt_recruit, start_battle
- [ ] `server-module/src/trading.rs` (4 reducers: propose_trade, respond_trade, confirm_trade, cancel_trade)
- [ ] Extend `on_disconnect` in `lib.rs` (TR-18)
- [ ] Regen client bindings (`just gen-bindings`)
- [ ] Tests: proof-of-teeth for each guard site, TR-15 atomic-swap re-read, TR-16 conservation,
  TR-18 disconnect, TR-19 structural, TR-20/21/22

## §5 Slice decomposition (m15a / m15b / m15c)

| Slice | Touches | Notes |
|-------|---------|-------|
| **m15a (MERGED)** | `game-core/src/trading/**`, `game-core/src/lib.rs`, `server-module/src/trading.rs`, `server-module/src/schema.rs`, `server-module/src/guards.rs`, `server-module/src/lib.rs`, `server-module/src/evolution.rs`, `server-module/src/monster_mgmt.rs`, `server-module/src/raising.rs`, `server-module/src/economy.rs`, `server-module/src/taming.rs`, `server-module/src/battle.rs`, `client/src/module_bindings/**`, spec file | Structural schema + shared guards → SERIAL (no sibling) |
| **m15b (PR #168)** | `client/src/ui/trade*.ts`, `client/src/net/store.ts`, `client/src/main.ts` | Trade overlay UI; depends on m15a bindings |
| **m15c** (PARKED) | `evals/trade-*.eval.mjs`, integration/e2e | Evals tail; parallels m15b after m15a merges |

**Post-integration verification** (after m15b + m15c merge): full `just ci` green, bindings-drift = 0,
schema-snapshot updated to include `trade_offer`, e2e `propose → respond → confirm` flow passes end-to-end.

## Risks / decisions
- Dupe/theft via stale snapshot or non-atomic swap → re-read live rows at `confirm_trade` in one transaction.
- Escrow on every mutation path (mechanical guard + proof-of-teeth), not discipline.
- See-without-leaking → `MonsterCard` display-only snapshot (no genes — ADR-0015).
- Stuck escrow on disconnect → delete offer `on_disconnect` (both roles).
- Fungible-asset escrow math: `available = balance - escrowed` must be computed correctly to avoid phantom
  reserve or over-reject (ADR-0106 D7 documents the exact formula).

## → M16/M18
The directed two-party handshake shape is the template for the PvP/raid **challenge** flow; the
`reject_if_in_*` guard family generalizes. Trade-evolution (fuse-on-trade) is additive on M10 fusion.
