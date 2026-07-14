---
name: monster-realm-m16a
description: m16a PvP spine (ADR-0109, PR #172) — schema, reducers, guards, tests; client deferred to m16b, evals to m16c
metadata:
  type: project
---

M16a PvP battle spine — OPEN PR #172 on `feat/m16a-pvp-spine`, local `just ci` EXIT=0.

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

**ADR next-free:** 0110

See [[monster-realm-handoff]] for full terminal state.
