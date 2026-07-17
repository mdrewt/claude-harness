---
name: monster-realm-m17a
description: m17a ranked-ladder spine (ADR-0119) — profile table, integer Elo, settle funnel, PvE-path PvP guards; traps and residuals
metadata:
  type: project
---

# Monster Realm m17a — ranked-ladder spine (ADR-0119, PR pending at write time)

Delivered: public `profile` table (PK identity, rating i32, W/L u32, never deleted);
`game-core/src/ranking.rs` pure integer Elo (`apply_elo` i64-internal + `div_euclid`, Δ∈[1,31],
equal→16, ±375 exact bounds; `compute_rating_update` = zero-sum ± SSOT, saturating);
`server-module/src/ranking.rs` new domain module (`get_or_init_profile` total,
`apply_pvp_rating` infallible pub(crate), NO reducers); `settle_pvp_battle` funnel in pvp.rs =
sole rating call site; `if is_ranked_pvp(&battle)` rejects in submit_attack/swap_active/flee/
use_battle_item + eval criterion w/ fixtures A–D. M17 slice decomposition (RL-1..18, m17a/b/c)
committed to harness spec. mutate-server cap ratcheted 309→308.

**Traps (why):**
- Legacy source-scan tests with POSITIONAL fn-order assumptions (RT-M16-05/-08 sliced
  "from fn X to fn Y") break silently on fn reorders — they scanned the wrong body and still
  passed. Always bound slices with `extract_fn_body`; pin delegation-absence in callers +
  positive ordering in the callee.
- `prop_assert_eq!`/`prop_assert!` do NOT support inline format captures (`{winner}`) —
  the macro routes through `concat!`; use positional args.
- Practice self-battles (player==opponent) route through `apply_pvp_forfeit` on disconnect
  (match BOTH side id lists) — rating must gate on `is_ranked_pvp` classification, never
  call-path.
- Needle-driven shapes are load-bearing: path-qualified `ranking::apply_pvp_rating(` (bare-id
  count == 1 across 16 files), bound-handle ongoing persist in resolve (chained needle must
  match only the funnel), row-value `battle_action().delete(row)`. Comment before
  "simplifying" — tests forbid the obvious rewrites.
- doc-keeper subagent (haiku) wrote to the MAIN CHECKOUT and fabricated ADR content —
  stopped, restored via `git show HEAD:file > file` (no mutating git on main checkout).
  Lesson: doc-keeper needs worktree-absolute paths AND post-hoc verification; prefer doing
  small doc edits orchestrator-side.

**Residuals (parked):** [[monster-realm-m16a]] side-B guard gap — start_battle/
begin_encounter/movement_tick/heal_party check only player_identity role; PvP side-B can open
a concurrent battle / heal-mid-PvP (HP last-write-wins; NOT a rating-dodge). Candidate slice
`m17-fix-sideb-guards` (battle.rs/movement.rs/raising.rs). Pre-existing `.expect` in
use_battle_item (~battle.rs:944). m17b (leaderboard UI) ‖ m17c (evals tail) per spec §5;
m17b `set_profile_name` will need the RL-7 tooth amendment pre-staged in ADR-0119 D6.

ADR next-free = 0120.
