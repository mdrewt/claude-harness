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

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
