---
name: monster-realm-nightly-mut-triage
description: "nightly-mut-triage red mutation gates triage (ADR-0118, amends ADR-0050)"
metadata: 
  node_type: memory
  type: project
  originSessionId: c48d6fe0-9c4f-4d99-a282-e9cc9f7f6c6c
---

nightly-mut-triage (ADR-0118, amends ADR-0050 A2/A3, PR #194) fixed 6-night-red nightly mutation jobs (Jul 10–15: runs 29086209572→29403450612). Changes: 5 killing tests in game-core/src/trading/rules.rs (check_headroom mirror-side accept boundaries, the easy-to-forget test class when M16.5b wrote initiator-only accept-boundary tests); justfile mutate-server cap 180→309; nightly-smoke-wiring eval ceiling 200→340 + TEETH-L-recap positive control; ADR-0050 amendment bullets; ARCHITECTURE note; DIGEST regen (84 ADRs). Zero production-code changes, zero mutants.toml changes.

**Triage taxonomy for red mutation gates:**
- **(a) Surviving mutants = missing tests.** Game-core episode: 5 check_headroom mutants survived because accept-boundary tests for the counterparty mirrors never existed (only initiator-side tests in M16.5b).
- **(b) Infra drift.** Unrelated, not triggered here.
- **(c) Threshold/baseline drift.** Mutation-server episode: cap 180 was the exact Jul-4 baseline (253 mutants) but M15 trading + M16 pvp.rs + M16.5 doubled the crate to 499 mutants / 309 missed; miss RATIO improved 71%→62%; all survivors sit behind &ReducerContext (no in-crate killable set: signature audit confirms).

**Re-baseline procedure (ADR-0118 §4):**
1. `just mutate-server` locally (≈11 min serial, 3 min -j8, 32-core).
2. Verify missed-delta maps to NEW files/functions (git log -L on old-code survivors — confirm pvp.rs/trading.rs are post-baseline).
3. Set cap = exact local measurement in the SAME PR as a dated ADR-0050 A2 amendment + wiring-eval ceiling.
4. Survivor growth inside OLD code = test regression; investigate instead of raising baseline.

**Two evals resist casual gate edits:**
- `mutate-core-recipe-integrity.eval.mjs` pins .cargo/mutants.toml to EXACTLY three line-pinned exclusions (adding one = rewriting teeth).
- `nightly-smoke-wiring.eval.mjs` ceiling-checks mutate-server cap default (was ≤200, now ≤340).

For borderline "equivalent-on-invariant" mutants: a killing test with documented out-of-invariant input BEATS an exclusion (ADR-0088's bar is "no test can distinguish"; pure fns are always distinguishable; assert the skip-guard contract: check_headroom polices trade delta, not pre-existing wallet state).

**Residuals:**
- FINDING-1: test doc-comment in rules.rs (~line 690) claims validate_proposal lacks a dup-item check it actually has (lines 75–89); out of scope.
- FINDING-3: tests (~1293–1347) document call-site arithmetic with no kills; annotation only.
- Mutation-server recipe: exit-3 (timeout) fails loud with misleading "build/config error"; no [ ! -f missed.txt ] guard; wc -l vs grep -c '' idiom inconsistency; deliberately not fixed.
- Codebase-memory symbol graph returned stale MAX_ITEM_STACK duplicate-definition hit (refuted by grep: server-module inventory.rs line 16 uses game_core::MAX_ITEM_STACK).
- cargo-mutants --jobs 8 classified identically to serial/CI run (same missed/caught/timeout sets, 5 min vs 2 h CI) — use -j for triage loop, serial recipe for citable evidence.

Related: [[monster-realm-m16.5b]], [[monster-realm-m16.5g]], [[monster-realm-m13.5a]]. ADR next-free = 0119.
