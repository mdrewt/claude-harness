# Sketch: M18 — Co-op raids

**Status:** design sketch (provisional) · **Phase C** · **Decision:** ADR-0027 · **Mirrors:** v1 M11.4.

> Provisional sketch — EARS criteria + tasks deferred to build time.

## Problem / intent
Two allies vs an AI boss — like PvP, pure orchestration over the existing battle: a new **additive**
`resolve_coop_turn` (two allies act, then the boss), reusing the M16 challenge + both-submit machinery,
without touching `resolve_turn`. Must **degrade gracefully** if an ally drops.

## Scope (condensed)
- Raid invite = `battle_challenge` with `is_raid`; accept builds a shared raid `battle` where
  `opponent_identity` is the **ally** and `is_raid` is set (additive on M7/M17).
- **`game-core` `resolve_coop_turn`** (NEW, additive) — boss AI acts after both allies; deterministic;
  **degrades to one ally** (a missing lead is treated as fainted — safe by construction).
- Both allies submit secretly via the M16 `battle_action`; resolve when both chosen; a deadline reaper +
  the degrade path handle a drop. Shared XP on a win.
- **Out of scope:** >2 allies (2-ally by construction); raid matchmaking/loot (content, later).

## Key design + boundary
**Additive, not a `resolve_turn` change** — PvE/PvP tests are the regression guardrail. **→ M19** guilds can
organize raids.

## Risks / decisions
Ally drop hangs/crashes → degrade path + reaper + one-ally proof-of-teeth. `resolve_turn` regressed → separate
rule + regression fixture. Raid abandon → fails the team, no rating (raids unranked).
