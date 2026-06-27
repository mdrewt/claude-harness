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

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
