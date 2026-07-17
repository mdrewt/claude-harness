# Sketch: M18 — Co-op raids

**Status:** design sketch (provisional; **post-gate** — demoted by `playtest-replan-2026-07.md`, do not build before the playtest gate) · **Phase C** · **Decision:** ADR-0027 · **Mirrors:** v1 M11.4.

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

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
