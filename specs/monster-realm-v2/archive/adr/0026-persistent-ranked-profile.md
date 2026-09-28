# 0026. Persistent ranked profile (Elo)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M17 design. Builds on ADR-0025 (PvP outcome).

## Context and problem statement
A ranked ladder needs a rating that **survives disconnects and sessions** and a public leaderboard. The
existing `player` row is **ephemeral** (deleted on disconnect, M2) — storing a rating there would lose it the
moment a player drops. A persistent, identity-keyed record is required, with the rating updated exactly once
per decisive ranked outcome.

## Considered alternatives
- **A persistent `profile` table keyed by identity (rating/wins/losses), never deleted, world-readable +
  a pure Elo rule applied once per decisive ranked outcome (chosen).** Clean separation of *presence*
  (ephemeral `player`) from *identity/progression* (persistent `profile`).
- **Store the rating on the ephemeral `player` row.** Lost on disconnect. Rejected.
- **A non-Elo ladder (ladder points / pure W-L).** Simpler but a worse competitive signal; Elo is the
  standard, a small pure rule. Rejected for now (the model is swappable — the rating rule is isolated).
- **Client-reported results.** A client could report a win. Rejected — the server applies the rating from the
  authoritative battle outcome, module-write-only.

## Decision outcome
- Chosen: **a persistent, identity-keyed, world-readable `profile` with an integer Elo rating updated once
  per decisive ranked PvP outcome.**
- Consequences: presence vs progression are separate tables (ephemeral vs persistent); `get_or_init_profile`
  makes the rating path total; the once-only update is structurally guarded + proof-of-teeth; seasons/decay/
  rating-based matchmaking are additive later; the rating rule is isolated so the system (Elo vs Glicko) is
  swappable.
