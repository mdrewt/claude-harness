# EG3 — essence-graph content authoring — **DONE (PR #282 open)** — 2026-08-05

**Branch:** `feat/eg3-essence-graph-content` (pushed, 6 commits) ·
**Worktree:** `.claude/worktrees/EG3` (kept in place) ·
**PR:** https://github.com/mdrewt/monster-realm/pull/282 ·
**ADR:** 0176 consumed (`adr_next_free` stays 177) ·
**Plan memo:** `monster-realm-EG3-plan.md`

## Status: TERMINAL — PR open, local full `just ci` EXIT=0, remote CI running

Supervisor owns the merge. The blocker documented in the earlier revision of this
memo (5 files outside the declared `touches:`) was **resolved inside the slice**,
not parked — see BLOCKERS below, which now records what was done and why.

## DONE

- `game-core/content/evolution_paths/000-core.ron` — the ten-edge graph replacing
  EG1's `[]` placeholder. All of EG3-1..EG3-8 authored; R1–R12 pass.
  edge_id band 1–99 declared as owned by this part file.
- `game-core/content/items/000-core.ron` — items 4/5 gain
  `essence_affinity: Some(Water)/Some(Fire)` + `essence_amount: 100`; stale
  ADR-0149 "deliberately unstocked" comment rewritten. Comment hygiene verified
  against both `pt_d3_tuning.rs` t6 and `append-only-ids.eval.mjs`.
- `game-core/content/shops/000-core.ron` — shop 1 stocks items 4/5 at
  `buy_price: 500` (40% convention: `sell*5 == buy*2`).
- `game-core/tests/eg3_evolution_graph.rs` — NEW, 11 gating tests T1–T11
  (EG3-9). Written RED by the `tester` agent, revised twice by the same agent
  (never by the implementer). **11/11 green.** Verifier independently perturbed
  T2/T5/T7/T11 and confirmed each bites.
- `docs/adr/0176-essence-graph-content-authoring.md` — D1 edge_id band ·
  D2 the `1→4` level-16→20 retune + its residual-risk note · D3 species 7/8
  passive-essence capture risk · D4 tier-0 dead ends legal · D5 R10 goes live ·
  D6 items/shop · **D7 spec gap** (below). `docs/adr/DIGEST.md` regenerated.
- The five forced companion files (see BLOCKERS) — all landed and declared under
  `touches-delta:` in the PR body.
- Lenses run: `planner`, `researcher` (gate enumeration), `tester`, `reviewer`,
  `red-team`, `verifier` ×2 (the second scoped to the gate-eval retirement).
  Every finding closed or recorded in the ADR.
- Gates: local full **`just ci` EXIT=0** — fmt · `clippy --workspace
  --all-targets --all-features -D warnings` · 1529 Rust tests (`game-core`
  982/982, `monster-realm-module` 423/423) · 76/76 evals · secret-scan · wasm
  build · client typecheck · 1852 client tests.

## BLOCKERS — RESOLVED: 5 files outside the declared `touches:`, now touched

A content edit under `game-core/content/**` mechanically forces all five, so the
slice could not reach local green inside its declared scope. All five were landed
and are declared under `touches-delta:` in the PR body for a mechanical audit.
`cargo mutants` now generates and CATCHES the previously-excluded mutant (1
tested / 1 caught), and four tamper experiments (over-growth, `.*` wildcard,
duplicate, trailing-`.*` widening) each still fail on their own specific check —
the gate was retired, not weakened (verifier-confirmed).

| # | File | Why forced | Sibling risk |
|---|---|---|---|
| 1 | `server-module/src/lib.rs` | bump `CONTENT_VERSION` 18→19 (`evals/content-version.eval.mjs:85-120`, ADR-0073) | **EG2 declares this file** (reducer registration). One-line constant, different hunk — git-mergeable, but it breaks the `mr-disjoint` SAFE verdict |
| 2 | `evals/baselines/content-hash.json` | regen version + hash alongside (1) | none |
| 3 | `game-core/src/content.rs:3143` | delete the EG1 canary `eg1_load_evolution_paths_is_empty_pending_eg3` (asserts the registry is empty) and replace it with a plain non-emptiness assertion | none — EG2 does not declare it |
| 4 | `.cargo/mutants.toml` | retire blessed exclusion #4 (`content.rs:624:5 load_evolution_paths -> Ok(vec![])`) — no longer equivalent | none |
| 5 | `evals/mutate-core-recipe-integrity.eval.mjs` | four-entry pin → three; drop the `canaryTestPresent` + `evolutionPathsRegistryEmpty` self-expiry tripwires | none — EG2 touches `no-idle-accrual.eval.mjs`, a different file |

(3)(4)(5) are a **designed** self-expiring handoff: `.cargo/mutants.toml:35-48`
names EG3 as the retiring slice and requires all three retire together. They are
firing correctly; this is the mechanism working, not a surprise.

**Structural finding worth escalating:** because `CONTENT_VERSION` lives in
`server-module/src/lib.rs`, **no content-only slice can ever be file-set disjoint
from `server-module/`.** Any future fan-out that pairs a content slice with a
server-module slice will hit this. Recorded as the last bullet of ADR-0176's
Consequences.

## SPEC GAP (ADR-0176 D7) — needs the milestone owner, not a content slice

EG3-3 and EG3-4 specify `min_level: 1` branches gated only on essence/Trust.
EG2-11 auto-evolves a monster the instant exactly one path is eligible.
Together: **any level-free branch fires as soon as its non-level gates clear and
forecloses every sibling still waiting on a level.** Worked numbers (red-team,
verified against live constants):

- Edge 2 (`1→5`): Trust `Friendly` at `fav=5, unfav=0` (`(5+10)*100/25 = 60`, the
  band floor) — five `care()` calls at the 6h cooldown, about a day, at any
  level. Fire 150 ≈ 15 wild wins at `max(1, loser_bst/30)` = 10/win off
  Flameling's BST 318, and Flameling is a weighted common in both zones. So a
  cared-for starter auto-evolves to Embersworn well before level 20, killing
  **both** `1→4` and `1→6` — including the Steamveil fan-in that EG3-2 exists to
  fix.
- Edge 10 (`21→23`): same shape — a cared-for Gustwyrm evolves inside its first
  day of ownership.

Shipped as specced anyway: both shapes are explicit EARS text, and deviating from
written criteria is a spec change, not a content call. EG3 spends its one
justified deviation on `1→4` (which the spec does not pin at all). Spec §5's
closing note claims this bug class "cannot occur"; that is true of the
player-invoked `evolve()` path and **false of the auto path**.

Resolutions, all outside a content slice's authority: raise EG3-3/EG3-4's
`min_level`s so the branches tie their siblings · land the deferred pre-evolve
warning (spec §6) · add a difficulty-aware **R13** to the EG5-1 gate rewrite
(`t11` in the new test file is the syntactic half of it and documents that it
catches unconditional, not difficulty, dominance).

## EXACT NEXT STEP

**Supervisor:** watch remote CI on PR #282 and squash-merge. Consider merging EG3
**before** EG2 — `server-module/src/lib.rs` is in EG2's declared set, and EG3's
one-line `CONTENT_VERSION` bump is the smaller rebase.

After merge: refresh the code-knowledge graphs against the main checkout (cbm
`detect_changes` + `index_repository`, `codegraph sync`) — deliberately not done
here, since nothing had landed on `master`.

Follow-ups this slice deliberately did NOT take:
- The ADR-0176 D7 spec gap (above) — needs the milestone owner.
- A difficulty-aware **R13** for the EG5-1 gate rewrite; `t11` is its syntactic
  half and documents that it catches unconditional, not difficulty, dominance.
- `ItemRow` still has no `essence_affinity`/`essence_amount` columns
  (`server-module/src/schema.rs`), so items 4/5's fields are core-side only until
  EG2-4 wires the reducer. EG2's call, not EG3's.
