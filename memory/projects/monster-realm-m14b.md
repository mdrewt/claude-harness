---
name: monster-realm-m14b
description: M14b server-side status persistence — BattleMonster.status field, resolve_full_turn wiring, RT-S14-01 fix, ADR-0093
metadata:
  type: project
---

## M14b — Server schema + persistence for status effects (PR #135, ADR-0093)

**Status:** PR open, `just ci` EXIT=0, remote CI running. Supervisor owns merge.

**Why:** M14a (ADR-0092) shipped pure game-core status rules with no schema changes. M14b persists status between turns by adding `BattleMonster.status: Option<StatusEffect>` and wiring `submit_attack` to use `resolve_full_turn`.

## Key design decisions

### StatusEffect in `types.rs` (not `status.rs`)
`BattleMonster` (in `types.rs`) needs `Option<StatusEffect>`. If `StatusEffect` stayed in `status.rs` (which already imports from `types.rs`), a circular import results. Fix: move `StatusEffect` to `types.rs`, have `status.rs` re-export via `pub use super::types::StatusEffect`.

### Additive schema — `#[serde(default)]` + last-field position
`BattleMonster.status` appended as the LAST field with `#[serde(default)]`. Old rows (no `status` field) deserialise to `None` per ADR-0006. The `m14b_serde_default_allows_missing_status_field` test verifies this by deserialising a hand-crafted RON string that omits `status` entirely.

### RT-S14-01 fix — `StatusCured` gains `slot: u32`
Previously `StatusCured { side: SideId }` was ambiguous when a bench-slot monster's status expired. Adding `slot: u32` (zero-indexed team position) identifies which slot was cured. All match arms updated to use `{ side, slot }` or `{ side, .. }`.

### Two `ctx.random()` calls per turn
`TurnVariance::from_ctx_random(ctx.random())` + `StatusVariance::from_ctx_random(ctx.random())` — two independent server-side RNG pulls, deterministic and not client-influenceable.

### Status write-back gated on `Ongoing`
Status store is written back ONLY when `battle.state.outcome == BattleOutcome::Ongoing`. Terminal rows are immediately GC'd by `write_back_battle_results`; writing status to fainted monsters is semantically meaningless (reducer-security-audit finding).

### `swap_active` NOT wired to `resolve_full_turn`
A swap is not a numbered turn — no status tick needed.

## Deferred residuals

- **`attempt_recruit` DoT gap** — wild's counter-attack on a failed recruit does not tick status effects. `resolve_recruit_failure` calls `resolve_enemy_turn`, not `resolve_full_turn`. Pre-M14b inherited scope; deferred to M14c.
- **`Sleep` payload not in spacetime-types baseline** — eval parser captures variant names only (not struct-variant payloads); `Sleep { turns_remaining: u8 }` appears as bare `"Sleep"`. Pre-existing eval limitation.
- **RT-PS-01 / RT-PS-DIALOGUE** — carried from m13.5f.

## Files changed

- `game-core/src/combat/types.rs` — `StatusEffect` moved here + `SpacetimeType` cfg-attr; `BattleMonster.status` field; `StatusCured.slot` field; `status: None` in make_battle_monster
- `game-core/src/combat/status.rs` — `StatusEffect` removed (re-exported); `StatusVariance::from_ctx_random`; `tick_status` with `enumerate()` slot indices; `tick_one_slot` emits `StatusCured { side, slot: slot_idx }`
- `game-core/src/combat/m14b_tests.rs` — NEW: 19 tests including serde-default missing-field test
- `game-core/src/combat/mod.rs` — `StatusEffect` moved to types re-export
- `server-module/src/battle.rs` — `submit_attack` uses `resolve_full_turn` + status store build/persist
- `client/src/module_bindings/types.ts` — `StatusEffect` enum + `BattleMonster.status`
- `evals/baselines/spacetime-types.json` — 14 → 15 types
- `docs/adr/0093-m14b-server-status-persistence.md` — NEW
- `docs/knowledge/reducers/` — 5 files regenerated (flee/start_battle/start_wild_battle/submit_attack/swap_active)

## Next per M14 plan

m14c (passive abilities) ‖ m14d (weather/field state) — parallel-eligible (disjoint files).
ADR next-free: **0094**.
