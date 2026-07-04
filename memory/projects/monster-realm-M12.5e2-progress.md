---
name: monster-realm-M12.5e2-progress
description: M12.5e2 practice-battle XP multiplier — COMPLETE (PR #96 open, just ci green)
metadata:
  type: project
---

## DONE

- `game_core::practice_xp_reward(base: Xp, is_practice: bool) -> Xp` — SSOT in game-core
- `write_back_battle_results`: `is_practice = battle.opponent_identity != WILD_IDENTITY` hoisted loop-invariant; delegates to `practice_xp_reward`
- 8 game-core unit/property tests + 2 server source-guard tests (two-needle) + `evals/practice-xp.eval.mjs` with TEETH A+B
- Reviewer MAJORs fixed: loop-invariant hoist, mod.rs doc
- Red-team: RT-PX-01/02 composition tests + two-needle source guard hardening
- ADR-0078 at `docs/adr/0078-practice-xp-multiplier.md` (next-free 0079)
- ARCHITECTURE.md updated
- PR #96 open, `feat/m12.5e2-practice-xp` tip 058f57b
- `just ci` EXIT=0: 777 Rust tests, 41 evals, 571 client tests, clippy clean

## REMAINING

- Supervisor to squash-merge PR #96 → master
- Index ADR-0078 via doc-only chore PR (next-free 0079)

## BLOCKERS

None.

## NEXT STEP

Supervisor: squash-merge PR #96 → master. Then queue next slice per plan.
