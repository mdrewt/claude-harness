---
name: monster-realm-m14.5a
description: M14.5a swap/recruit full post-turn pipeline (ADR-0098, PR #147) — closes R1, R3, RT-W14-DESYNC-01
metadata:
  type: project
---

M14.5a SHIPPED (PR #147, ADR-0098). **Why:** swap/recruit paths bypassed entire post-turn status/weather pipeline; status/weather clocks froze during recruit spam/swaps; skill_defs_from_rows hardcoded sets_weather: None causing Rain Dance / Sandstorm to fail in recruit retaliation. **How to apply:** ADR-0098 D1/D2/D3/D4 are the canonical decisions for future resolve.rs changes.

## Key decisions (ADR-0098)

- **D1:** `run_post_turn_phases` private helper in resolve.rs runs phases 3–5 (DoT, weather chip, status/weather tick, StatusApplied write-back) — called by both `resolve_player_swap` and `resolve_recruit_failure`.
- **D2:** All battle-resolution paths use `load_skills()` (content cache) NOT `skill_defs_from_rows`. `skill_defs_from_rows` is now `#[cfg(test)]` only for marshal boundary tests.
- **D3 (ADR-0092 §D3 AMENDED):** Swap is always permitted regardless of active monster's status (Sleep/Paralysis/Freeze). The original D3 swap-to-Pass conversion was never implemented and is now formally de-scoped. Pinned by three tests.
- **D4:** Status store built from `BattleMonster.status` fields before call; persisted back after call if `outcome == Ongoing`. Same pattern as `submit_attack`.

## Traps to avoid

- `resolve_player_swap` has 8 args → requires `#[allow(clippy::too_many_arguments)]`
- RT-W14-DESYNC-01 fix-pin asserts `turns_remaining = WEATHER_DEFAULT_TURNS - 1` (not 5): Rain Dance sets weather to 5, then phase-5 tick decrements to 4 in the same `resolve_recruit_failure` call.
- Knowledge bundle (`docs/knowledge/`) drifts whenever reducers/tables change → run `just knowledge` and commit before final CI.
- `require_owner(ctx, &battle)` is NOT accepted by `recruit-reducer-security` eval or `gate-teeth` Tooth 12 — both pattern-match the raw `player_identity != me` form. Use raw form; see PARK comment in taming.rs. Unify when evals are updated.
- Phase-4.5 StatusApplied write-back: **capture `active_slot_a/b` BEFORE phases 3/3.5 run.** Weather-chip KO in phase 3.5 can trigger auto-switch; if slot is read after, StatusApplied lands on the new active monster (wrong slot). `run_post_turn_phases` captures slots on entry. Pinned by RT-M14.5A-01/02.

## Gating tests (resolve.rs mod tests)

- `sandstorm_ticks_during_resolve_recruit_failure` — EARS 14.5a-2a
- `poison_dot_fires_during_resolve_player_swap` — EARS 14.5a-2b (asserts `current_hp <= 350`, i.e. `max_hp - DoT_amount`)
- `swap_allowed_when_player_active_has_{sleep,freeze,paralysis}` — EARS 14.5a-4

## Red-team tests (redteam_m14_5a_tests.rs — review pass)

- **RT-M14.5A-01:** Weather-chip KO triggers auto-switch mid-turn; verify StatusApplied writes to original slot (side_a), not switched-in slot. Was RED before slot-capture fix in `run_post_turn_phases`.
- **RT-M14.5A-02:** Same scenario on `resolve_recruit_failure` path. Was RED before fix.
- **RT-M14.5A-03:** Pins BattleStatusStore rebuilt after use_battle_item → side_a[0] = None invariant.

## Review-pass parked items (ADR-0098 / taming.rs comment)

- **M-3:** resolve_recruit_failure missing from game_core lib.rs re-exports (lib.rs outside touches)
- **M-4:** too_many_arguments (8-arg signatures) — BattleContext struct refactor deferred
- **M-5:** BattleStatusStore::from_state constructor — status.rs outside touches
- **MEDIUM-1:** attempt_recruit require_owner — eval pattern-match blocks; PARK comment in taming.rs
- **LOW-4:** bait/load_skills() argument ordering — safe in production (load_skills() infallible)

## ADR pointers

- ADR-0098: `docs/adr/0098-m14.5a-swap-recruit-full-pipeline.md`
- ADR-0092 §D3 AMENDED (bless always-swappable)
- ADR next-free: **0099**
