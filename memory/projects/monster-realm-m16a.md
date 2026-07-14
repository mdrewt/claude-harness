---
name: monster-realm-m16a
description: m16a PvP spine (ADR-0109, PR #172) — schema, reducers, guards, tests; client deferred to m16b, evals to m16c
metadata:
  type: project
---

M16a PvP battle spine — REVIEW-PASS DONE, PR #172 on `feat/m16a-pvp-spine`, local `just ci` EXIT=0. Supervisor owns squash-merge.

**Why:** M16 adds synchronous PvP (two human players, shared `resolve_full_turn`). m16a is the functional core; client UI (m16b) and eval suite (m16c) are deferred per the spec's serial-spine note.

**How to apply:** Next m16b launch should pick up from master (post-merge) and build the client overlay for `battle_challenge` subscription + `submit_pvp_action` call.

**Key decisions (ADR-0109):**
- `battle_action` PRIVATE (no `public`) — must-never-leak; clients see turn resolution via `battle.state.turn_number` increment
- `start_pvp_battle` bypasses `start_battle` ADR-0048 guard (same pattern as `begin_encounter`)
- Forfeit → `SideAWins`/`SideBWins` — no new BattleOutcome variants
- Both-submitted resolution inline in same transaction as `submit_pvp_action`
- Challenger-first tie-break at deadline
- `pvp_deadline_reaper` scheduler-only: `ctx.sender != ctx.identity()` guard
- Side-B HP write-back via `write_back_party_hp_pvp_side_b` (separate from side-A path in `write_back_battle_results`)
- `require_pvp_participant` in guards.rs returns `SideId`
- `Battle` struct now `#[derive(Clone)]` (needed for update-before-writeback pattern, RT-M16-05)
- `write_back_battle_results` now GCs by `opponent_identity` for PvP side-B terminal rows (RT-M16-03)

**Review-pass fixes (b25a73e):**
- RT-M16-02 CRITICAL: `is_practice` was `opponent_identity != WILD_IDENTITY` — fixed to `player_identity == opponent_identity`
- RT-M16-05 HIGH: update battle row before write-backs (stuck-in-Ongoing risk eliminated); log-and-continue (ADR-0077)
- RT-M16-01 HIGH: added `is_in_ongoing_battle(ctx, target)` guard (Guard 5a) to `challenge_pvp`
- H-2: added `has_active_incoming_challenge(ctx, me)` guard (Guard 5b) to `challenge_pvp`
- RT-M16-06 MEDIUM: `pvp_deadline_forfeit_side` now reads `b_submitted`; test inverted to `assert_ne!`
- M-1: `debug_assert!(actions.len() == 2)` in `resolve_pvp_turn_if_ready`
- RT-M16-03 MEDIUM: side-B GC sweep in `write_back_battle_results`

**ADR next-free:** 0110

See [[monster-realm-handoff]] for full terminal state.
