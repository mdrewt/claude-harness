---
name: monster-realm-m14a
description: M14a status-effect core — StatusEffect enum, BattleStatusStore pure game-core, resolve_full_turn wrapper, 4 red-team tests; PR #134, ADR-0092
metadata:
  type: project
---

M14a game-core status-effect rules (PR #134, ADR-0092). Tip `2889bfa` on branch `feat/m14a-status-effect-core`.

**Why:** First slice of M14 Deeper Battle Systems — lays the pure rule layer before m14b wires server persistence. Additive-only on resolve_turn (ADR-0017/0023 signature contract).

**Key types shipped:**
- `StatusEffect` enum: `Poison | Burn | Paralysis | Sleep { turns_remaining: u8 } | Freeze` — exhaustive match enforced at every site (ADR-0010 OCP gate)
- `BattleStatusStore { side_a/b: Vec<Option<StatusEffect>> }` — pure game-core, NOT SpacetimeType; persistence deferred to m14b
- `StatusVariance` — 6 rolls; `action_skip_roll_a/b` (Paralysis blocks < 25), `freeze_thaw_roll_a/b` (Freeze thaws >= 80), `sleep_wake_roll_a/b` (RESERVED — m14b must add `from_ctx_random`)
- `TurnChoice::Pass` — blocked sides' choices convert to Pass in `resolve_full_turn`; `Pass => unreachable!()` in `skill_id_from` is a compile guard only
- New `BattleEvent` variants: `StatusDamage { side, amount }`, `ActionBlocked { side }`, `StatusCured { side }`

**resolve_full_turn pipeline:** pre-turn block check → Pass substitution → `resolve_turn` (unchanged) → post-turn DoT (if Ongoing) → tick_status (if Ongoing)

**DoT formulas:** Poison = max_hp/8 min 1; Burn = max_hp/16 min 1

**Faint cascade in apply_post_turn_effects:** mirrors resolve_one_attack logic (duplication avoids circular status.rs→resolve.rs import); SideA processed first — on simultaneous DoT KO, SideB wins (RT-S14-04)

**Named residuals carried into m14b:**
- RT-S14-01: `StatusCured` lacks slot index — bench vs active cure indistinguishable; event schema fix in m14b
- RT-S14-03: undersized BattleStatusStore silently drops DoT after slot change — caller contract (construct with same size as team)
- M14b contract: `StatusVariance::from_ctx_random` (parallel to `TurnVariance::from_ctx_random`) must derive all 6 fields from a single seed

**Test counts:** 949 Rust tests (949 passed, 1 skipped) + 778 client (32 files); 22 EARS + 4 red-team gating tests in game-core

**ADR-0092 consumed; next-free → 0093.**

**How to apply:** m14b scope is: add `#[spacetimedb::Type]` to StatusEffect + additive column `status: Option<StatusEffect>` on BattleMonster, regen bindings, update submit_turn → resolve_full_turn, construct BattleStatusStore from BattleMonster.status fields. Depends on m14a types being stable (they are, on merge).
