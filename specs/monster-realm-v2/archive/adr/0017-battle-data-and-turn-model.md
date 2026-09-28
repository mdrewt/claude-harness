# 0017. Battle data model & server-resolved turn model (PvP-ready)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M7 design; load-bearing for M7 and the additive M16 (PvP) / M18 (raids).

## Context and problem statement
Battles are turn-based. They must be server-authoritative and cheat-proof, simple to net (no rollback),
private to participants, and — critically — **shaped now so multiplayer is additive later**. v1 keyed the
battle row per-player and had to **re-key it for PvP** (a breaking schema change); v2's additive-schema
discipline (ADR-0006) means we pay that cost up front, for free.

## Considered alternatives
- **Synthetic `battle_id` pk + indexed `player_identity` + `opponent_identity`, the whole `BattleState` as
  one RLS-scoped column, server-resolved with no client prediction (chosen).** For PvE, `opponent_identity`
  equals `player_identity` (a self-sentinel); for PvP/raid it differs — so the participant model and a
  shared row are **additive** (M16/M18 are orchestration over the same `resolve_turn`). RLS scopes the row
  to both participants.
- **Per-player battle keying (v1).** Simple for PvE, but two humans can't share a row → a breaking re-key
  for PvP. Rejected (the lesson v2 front-loads).
- **Client-predicted battles.** Pointless for turn-based play and adds rollback complexity; animation hides
  the round-trip. Rejected (ADR-0011 — battles are server-resolved).
- **Fully normalized battle tables** (rows per side/monster/turn) vs one `BattleState` column. The single
  column keeps a turn's mutation atomic and the resolver simple; normalize only if a query needs it.
  Rejected for now.

## Decision outcome
- Chosen: **`battle_id`-keyed, `opponent_identity`-indexed, `BattleState`-as-column, RLS-to-participants,
  server-resolved (no prediction)**, with a **symmetric `resolve_turn`** so PvP/raids reuse it.
- Consequences: M16/M18 are additive (a schema-snapshot eval forbids a non-additive re-key); battles need
  no `client-wasm` export or reconcile; HP persists to the `monster` row (written back with re-verified
  ownership); deeper battle systems (M14) must extend `resolve_turn` **additively**, never rewrite it.
