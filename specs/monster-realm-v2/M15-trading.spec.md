# Sketch: M15 — Trading (escrowed dual-consent)

**Status:** design sketch (provisional) · **Phase C** · **Decision:** ADR-0024 · **Mirrors:** v1 M11.1.

> Provisional sketch — design + decision only. The granular EARS criteria + task breakdown are deliberately
> **deferred to build time** (the loop drafts them when M15 is next-up; the Phase-A playtest may reshape
> Phase C first). Durable content lives here + in the ADR.

## Problem / intent
The first cross-player transaction: two players safely swap monsters (and items/currency) with **no dupes, no
theft, no trading an in-use asset**. The dual-consent + escrow + atomic-swap pattern is the **backbone** the
rest of the social economy reuses.

## Scope (condensed)
- **`trade_offer`** table, scoped to the two parties (ADR-0015 stakes: display-only `MonsterCard` snapshot so
  a counterparty sees the offer without leaking the underlying `monster` row).
- **Escrow** via a `reject_if_in_trade` guard wired into **every** monster/item/currency-mutating reducer
  (mirrors `reject_if_in_battle`): an offered asset can't be sold/fused/trained/re-offered mid-trade.
- **Flow:** `offer → respond → confirm` → an **atomic swap** that re-reads both **live** rows, re-checks
  ownership/escrow, swaps `owner_identity` (+ clears party_slot, re-derives), deletes the offer — one
  transaction (no dupe/orphan). `cancel`/`client_disconnected` release the escrow (the lock lives in the row).
- **Out of scope:** auction house / open market (later, on this backbone); trade-evolution (additive on M10).

## Key design + boundary
- **Display data is a snapshot; the authoritative swap re-reads live state + re-checks ownership** — the card
  is UI, the swap trusts only current rows. Reuse the M9/M13 item/currency helpers for those legs.
- **→ M16/M18:** the directed two-party handshake shape is the template for the PvP/raid **challenge**; the
  `reject_if_in_*` guard family generalizes.

## Risks / decisions
Dupe/theft via a stale snapshot or non-atomic swap → re-read live + one transaction. Escrow on **every**
mutation path (mechanical guard + proof-of-teeth), not discipline. See-without-leaking → display-only
snapshot. Stuck escrow on disconnect → release on disconnect.
