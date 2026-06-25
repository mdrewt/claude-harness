# Sketch: M16 — PvP battles

**Status:** design sketch (provisional) · **Phase C** · **Decision:** ADR-0025 (builds on 0017, 0023, 0024) ·
**Mirrors:** v1 M11.2.

> Provisional sketch — EARS criteria + tasks deferred to build time (the loop drafts them when M16 is
> next-up). Durable content here + in the ADR.

## Problem / intent
Two humans battle — and because M7 built the `battle` table **PvP-ready** (`battle_id` pk + `opponent_identity`)
and M14 kept `resolve_turn` **symmetric**, PvP is **pure orchestration**, not a re-key or a rule rewrite. The
new work is fairness + liveness.

## Scope (condensed)
- **`battle_challenge`** (two-party, reuses the M15 handshake shape; `is_raid` distinguishes a raid invite).
- **Shared PvP battle** (additive on M7): on accept, one `battle` row with `opponent_identity ≠ player_identity`.
- **`battle_action`** secret picks — a leaked pending pick is a **competitively-decisive** exploit, so per
  ADR-0015 this is **must-never-leak**: confirm RLS filters on the pinned version **or use a private table**.
  The server reads both and resolves via the **unchanged** `resolve_turn` once both have chosen.
- **Liveness:** a **turn-deadline scheduled reaper** + **forfeit-on-disconnect** (opponent wins, takes the
  ranked win, battle marked terminal — never deleted: that would void the loss). Documented challenger-first
  tie-break.
- **Out of scope:** ranked stakes/Elo (M17); in-battle switch/items in PvP (additive later).

## Key design + boundary
Still **server-resolved, no prediction**. Double-submit is safe via SpacetimeDB serializable re-execution (an
in-code guard suffices — verify the semantics, don't trust instinct). **→ M17** consumes the decisive
outcome; **→ M18** reuses the challenge + both-submit machinery.

## Risks / decisions
Rage-quit voids loss → forfeit-not-delete + reaper. Opponent reads your pick → private/verified-RLS
`battle_action`. Non-additive battle re-key → schema-snapshot eval forbids it. Per-kind disconnect: PvP
forfeit; PvE vanishes; raid fails the team (M18).
