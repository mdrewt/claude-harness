# Sketch: M17 — Ranked ladder (persistent Elo)

**Status:** design sketch (provisional) · **Phase C** · **Decision:** ADR-0026 · **Mirrors:** v1 M11.3.

> Provisional sketch — EARS criteria + tasks deferred to build time.

## Problem / intent
Make PvP matter over time with a **persistent** ranked rating + a leaderboard. The key point is
**persistence**: the rating must survive disconnects, so it lives on a `profile` keyed by identity that —
unlike the ephemeral `player` presence row — is **never deleted**.

## Scope (condensed)
- **`profile`** table (world-readable for the leaderboard): identity-keyed `name`/`rating: i32`/`wins`/
  `losses`, never deleted. `get_or_init_profile` makes the rating path total.
- **`game-core` `apply_elo`** — a pure, **integer linear approximation** of Elo (floats break determinism):
  zero-sum, an upset swings more, a win is always ≥ 1, everyone starts at 1000. Isolated so the system is
  swappable.
- Ranked outcomes call `apply_pvp_rating` **exactly once** per decisive result (structurally guarded;
  friendly battles don't count).
- **Out of scope:** seasons/decay/rating-based matchmaking (additive later).

## Key design + boundary
Presence (ephemeral `player`) vs progression (persistent `profile`) are separate tables — the whole point.
**→ M18/M19** may surface leaderboards/guild rankings from the world-readable `profile`.

## Risks / decisions
Rating lost on disconnect → persistent never-deleted profile. Double-count → once-only structural guard +
proof-of-teeth. Client writing its own rating → module-write-only.
