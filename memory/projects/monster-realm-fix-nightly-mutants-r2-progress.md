---
name: fix-nightly-mutants-r2
description: fix-nightly-mutants-r2 DONE — PR #175 open, reviewer PASS (no blockers), local just ci EXIT=0, 0 missed mutants
metadata:
  type: project
---

# fix-nightly-mutants-r2 slice — TERMINAL STATE

**Branch:** `fix/fix-nightly-mutants-r2`  
**PR:** #175 — https://github.com/mdrewt/monster-realm/pull/175  
**Status:** PR open, local `just ci` EXIT=0, remote CI running  
**ADR:** None (test-only slice, no new architectural decisions)  
**ADR next-free:** 0110 (unchanged)

---

## Key Finding

All 5 mutants the supervisor expected to survive (ability.rs lines 54, 56, 58, 158 and resolve.rs line 462) are **already caught** by existing tests. The targeted cargo-mutants run showed **0 missed** before any new tests were added.

This means the supervisor's prediction was wrong — fix-nightly-mutants (PR #174) actually fixed all 10 original nightly mutants, not just 5.

---

## Investigation

### ability.rs mutations

cargo-mutants 27.1.0 generates these mutations for ability.rs:
- `56:9: replace StatusKind::matches -> bool with true` → CAUGHT by EARS-2, EARS-21
- `56:9: replace StatusKind::matches -> bool with false` → CAUGHT by EARS-1, EARS-21
- `142:5: replace apply_entry_ability with ()` → CAUGHT by EARS-4
- `208:5: replace apply_ability_modifiers with ()` → CAUGHT by EARS-11

Lines 54, 58, 158 do not generate separate mutations in cargo-mutants 27.1.0; they correspond to function bodies covered at the signature level.

### resolve.rs mutation

- `467:5: replace resolve_enemy_turn -> Vec<BattleEvent> with vec![]` → CAUGHT indirectly via `resolve_recruit_failure_skilled_wild_advances_and_strikes`

The existing direct test `resolve_enemy_turn_only_enemy_acts` did NOT catch this mutation (only checks which side is damaged, not that events are non-empty).

---

## Change Made

### `game-core/src/combat/resolve.rs` — 1 new test

Added `resolve_enemy_turn_returns_events_for_skilled_enemy` to the inline `#[cfg(test)]` module. This test:
- Calls `resolve_enemy_turn` directly (not via resolve_recruit_failure)  
- Asserts `!events.is_empty()`
- Makes the `vec![]` mutation a DIRECT kill rather than indirect

---

## Targeted Evidence

```
$ cargo mutants -p game-core \
    --file game-core/src/combat/ability.rs \
    --file game-core/src/combat/resolve.rs

Found 60 mutants to test
ok       Unmutated baseline in 8s build + 0s test
60 mutants tested in 2m: 54 caught, 6 unviable

$ wc -l mutants.out/missed.txt
0 mutants.out/missed.txt
```

---

## No mutants.toml Changes

The `.cargo/mutants.toml` already has exactly 3 blessed exclusions (guarded by the eval). No new equivalent mutants needed; all are caught behaviorally.

---

## Gates

- **Local `just ci`:** EXIT=0 (1169 Rust tests, 912 JS tests, 48 evals PASS)
- **Targeted cargo mutants:** 60 mutants, 54 caught, 6 unviable, **0 missed** ✓
- **Reviewer:** PASS — no blockers; m-1 (over-long assertion message) applied in commit f8e94af
- **Verifier:** PASS — all 5 checks confirmed
- **ADR next-free:** 0110 (unchanged)
- **Supervisor owns squash-merge**

---

## Next Step

After supervisor merges PR #175, proceed to M16b (PvP client UI) or M16.5 residuals per PLAN.md.
