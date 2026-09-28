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

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
