# EG3 — essence-graph content authoring — PLAN (2026-08-05)

Branch `feat/eg3-essence-graph-content`, worktree `.claude/worktrees/EG3`, ADR **0176**
(supervisor-assigned; `adr_next_free` = 177, so 176 is free/reserved).

## Deliverable

Author the real evolution graph into `game-core/content/evolution_paths/000-core.ron`
(EG1 left it a deliberately-empty `[]`; `evolutions.ron`/`fusion.ron` were already
deleted by EG1/PR#279), plus the items 4/5 essence fields and shop-1 stocking.

## The edge table (10 edges, edge_id band 1–99 owned by `000-core.ron`)

| edge_id | from | to | min_level | essence | min_trust_tier | source |
|---|---|---|---|---|---|---|
| 1 | 1 | 4 | **20** | [] | None | legacy `Level(16)` branch, **retuned to 20 — see D2** |
| 2 | 1 | 5 | 1 | [(Fire,150)] | Friendly | EG3-3 |
| 3 | 1 | 6 | 20 | [(Water,120)] | None | EG3-2 |
| 4 | 2 | 6 | 20 | [(Fire,120)] | None | EG3-2 |
| 5 | 7 | 9 | 18 | [] | None | EG3-7 |
| 6 | 7 | 30 | 15 | [(Water,100)] | None | EG3-8 |
| 7 | 8 | 10 | 20 | [] | None | EG3-7 |
| 8 | 8 | 31 | 17 | [(Fire,100)] | None | EG3-8 |
| 9 | 20 | 22 | 22 | [] | None | EG3-5 |
| 10 | 21 | 23 | 1 | [] | Friendly | EG3-4 |

All `min_quality_time_tier: None`, `min_nutrition_pct: None`. `min_level` is the
`Level` newtype but deserializes from a bare `u8` (`monster/types.rs:547`), so author
`min_level: 20`, never `Level(20)`.

Items 4/5 gain `essence_affinity: Some(Water)/Some(Fire)` + `essence_amount: 100`;
shop 1 stocks both at `buy_price: 500` (sell 200 = the 40% convention).

## Decisions for ADR-0176

- **D1** edge_id band: `000-core.ron` owns 1–99; append-only per R12 (no edge_id has
  ever shipped — the registry has only ever held `[]`).
- **D2 (defect fix)** legacy `1→4` was `Level(16)`. Under EG2-11 auto-evolution
  (exactly-one-eligible auto-applies with no player action), a `min_level:16`
  unconditional edge *temporally dominates* `1→6` at level 20 — a Flameling
  auto-evolves to species 4 at L16 and the Steamveil fan-in edge (EG3-2, the ONE
  content fix the whole converged design reached) is dead on arrival. Spec line 138
  claims this bug class "cannot occur"; that reasoning predates EG2-11 and is wrong
  for the *auto* path. Fix: retune `1→4` to `min_level: 20` so L20 yields 2+ eligible
  → player choice (exactly EG2-2/EG4-2's designed UX). `1→4`'s 16 is not spec-pinned;
  `1→6`'s 20 is (EG3-2), so 1→4 is the one that moves. Spec §6 already declares all
  numeric constants playtest-tunable.
- **D3 (risk accepted)** `7→30`@15 / `8→31`@17 sit below `7→9`@18 / `8→10`@20 and are
  gated only on essence that also accrues *passively* from wild wins (EG2-7). ~10 wild
  wins vs. a Water common can silently capture a Cragling into Tidecrag before L18.
  Ship per spec (the numbers are explicit spec text) + record the risk; a tuning pass
  or the deferred pre-evolve warning (spec §6) owns it.
- **D4** species 3 (Sproutlet) is a tier-0 dead end with no out-edge — explicitly legal
  (spec §4) and must not be "fixed".
- **D5** R10's empty-set carve-out (`content.rs:1086`) switches OFF with the first
  authored edge; R1/R5/R6/R10 execute against real content for the first time.

## Tests (EG3-9) — new file `game-core/tests/eg3_evolution_graph.rs`

Slice-owned file (fan-out doctrine (c)); must live in package `game-core` so it is
what kills the `load_evolution_paths -> Ok(vec![])` mutant once the blessed exclusion
retires. Biting halves clone the loaded Vec — never mutate shipped RON.

T1 live registry passes R1–R12 · T2 exact 10-edge pin (kills `Ok(vec![])`) ·
T3 R8 fan-in positive (species 6) + negative control · T4 fan-out positive
(species 7) + negative control · T5 R10 bites (drop the single in-edge of species 22 —
species 6 has two, so it would be vacuous) · T6 R11 bites (clone a species to tier 6) ·
T7 R12 bites (duplicate an edge_id) · T8 R9 items single-role + bites ·
T9 item `essence_amount` ≥ its edge's requirement (EG3-8 "one feed clears the bar") ·
T10 shop stocking + 40% convention · T11 no temporally-dominated out-edge (the D2
regression guard; proposed as a candidate R13 for EG5-1, NOT added to the frozen
EG1 validator).

## BLOCKER — hidden dependencies outside the declared `touches:`

A content edit under `game-core/content/**` mechanically forces these; `just ci`
CANNOT be green without them:

1. `server-module/src/lib.rs` — `CONTENT_VERSION` bump (`evals/content-version.eval.mjs:85-120`).
   **FORBIDDEN by the slice prompt AND declared by the live concurrent sibling EG2.**
2. `evals/baselines/content-hash.json` — regen (evals/** forbidden).
3. `game-core/src/content.rs:3143` — delete the EG1 canary
   `eg1_load_evolution_paths_is_empty_pending_eg3` (asserts the registry is empty).
4. `.cargo/mutants.toml` — retire blessed exclusion #4.
5. `evals/mutate-core-recipe-integrity.eval.mjs` — four-entry pin → three, drop both
   self-expiry tripwires (evals/** forbidden).

(3)(4)(5) are a *designed* self-expiring handoff: `.cargo/mutants.toml:35-48` names EG3
as the retiring slice and requires all three retire together. (1) breaks the
`mr-disjoint` SAFE verdict outright — ADR-0073's content↔CONTENT_VERSION coupling means
**no content slice can ever be disjoint from `server-module/src/lib.rs`**.

Not forced by EG3: `ItemRow` has no `essence_affinity`/`essence_amount` columns
(`server-module/src/schema.rs:126-150`), so the RON fields are core-side only until
EG2-4 wires them. That is EG2's call, not EG3's.
