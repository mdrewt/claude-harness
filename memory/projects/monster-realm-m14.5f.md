---
name: monster-realm-m14.5f
description: M14.5f gates — BSATN compat proof (static analysis) + convergence net (128-seed randomized, warp-under-link, battle-lock); ADR-0103, PR #156
metadata:
  type: project
---

BSATN-compat smoke eval + convergence net widening (ADR-0103, PR #156).

**Why:** Two residuals from M14 Phase B close (ADR-0097): (1) serde(default) on BattleMonster.status / BattleState.weather covers only the serde/RON codec path — BSATN (SpacetimeType derive, position-based) is handled at the SpacetimeDB ENGINE level on publish without --delete-data, NOT by serde(default); (2) convergence gate was only 16 fixed seeds × one east-walk script, no warp/battle-lock coverage.

**How to apply:** ADR next-free is 0104. PR targets `mdrewt/monster-realm`.

## Key findings

**BSATN gap (14.5f-1):** `#[serde(default)]` does NOT provide BSATN missing-field defaults. SpacetimeDB engine handles additive schema at publish time (--delete-data omitted). Both `BattleMonster` and `BattleState` have `SpacetimeType` derives (confirmed in `game-core/src/combat/types.rs`). Option (a) — live pre-M14b smoke — was infeasible: `spacetime 2.6.0 CLI` `spacetime build` has no `--features` passthrough, so `dev_reducers` cannot be enabled to create battle rows. Chose option (b): JS static analysis eval.

**14.5f-1 eval:** `evals/bsatn-compat-smoke.eval.mjs` — 4 pure predicates, 9 teeth.
- `hasSerdeDefaultOnField`: extracts struct body (`{` to first `\n}`), checks exact 2-line co-location pattern `#[serde(default)]\n    pub ${fieldName}:` (tooth A'' rejects attribute on different field)
- `hasSpacetimeTypeDerive`: finds boundary as `max(lastBlank, lastBlockEnd)` before struct marker
- `hasRonDefaultTests`: requires both `m14b_serde_default_allows_missing_status_field` AND `m14b_battle_monster_status_field_defaults_to_none`
- `documentsBsatnGap`: combined name+detail must contain 'BSATN', 'serde', 'engine'
- No `new RegExp()` — detect-non-literal-regexp Semgrep rule. Only `.includes()` / literals.

**14.5f-2 sim-harness changes:**
- `ServerWorld.SimChar` gains `battle_locked: bool` (init false); `lock_battle`/`unlock_battle` methods; `tick_zone` battle-guard: drain skipped + `ActionState::Idle` when locked, queue INTACT (mirrors `movement.rs:207-220`)
- `random_scenario(seed, n_intents)`: tick_seed only, all 5 MoveInput variants (`r % 5`: N/S/E/W/Jump), burst when `r.is_multiple_of(11)`, both-clients fallback guarantee
- `warp_scenario_under_link(link, seed)`: SeqCanonical forward vs reversed; returns (converges, had_reorder)
- `apply_stream_with_battle_lock(ordered, lock_client, lock_after_ticks)`: lock fires at `tick == lock_after_ticks` before enqueue+tick_zone
- `battle_lock_scenario()`: 8 East × 2 clients; locked client = TilePos{x:5,y:1} (4 steps from spawn (1,1)); unlocked hits wall at (7,1)

**netcode_converge.rs JSON (9 fields):**
`seeds_tested:16, seq_canonical_converges, reorder_occurred, loss_occurred, naive_diverges_on_teeth, randomized_seeds_tested:128, randomized_converges, warp_convergence, battle_lock_convergence`

Warp non-vacuity: `warp_convergence=false` if no seed produces a reorder (guards jitter=0 regressions).

**Clippy traps hit in this slice:**
- `r % 11 == 0` → `r.is_multiple_of(11)` (clippy::manual_is_multiple_of, Rust 1.96)
- `for (&k, _) in &map` → `for &k in map.keys()` (clippy::for_kv_map)
- `0x14_5F_0000_CAFEu64` → `0x145F_0000_CAFE_u64` (clippy::unusual_byte_groupings)
- `//! last line of list\n//! bare paragraph` → add blank `//!` line between (clippy::doc_lazy_continuation)
- Worktree needs `npm install` in `client/` before `just ci` (node_modules not shared)
