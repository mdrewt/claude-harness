# 11r-g progress memo (server hardening basket) — updated 2026-08-01, pre-PR

**TERMINAL STATE REACHED 2026-08-01:** PR https://github.com/mdrewt/monster-realm/pull/275 open · local full `just ci` exit 0 · remote ci+e2e pending at handoff · supervisor owns the merge (`gh pr merge` never run). Handoff entry written. Nothing left for a resume pass — this memo is historical.

**Branch:** `feat/11r-g-server-hardening` · **Worktree:** `.claude/worktrees/11r-g` (base origin/master 9c1f75e) · **ADR:** 0170 (written, digest regen'd) · **Tier:** HARD

## DONE (all phases through verifier PASS)
- Plan (planner) → plan review (reviewer + red-team + simplify) → ADR-0170 refined.
- Tests RED (tester opus ×2, Rust + vitest), verified RED by orchestrator; red-team pass on
  the tests found 3 reward-hacking holes (let_-discard idiom ×2, dead-string decoys) — tester
  fixed; RED re-verified. Commits: ac20fab, e8ebcec.
- Implementation green (specialist, 12252f1): json_escape (single-pass, '\u{0022}' spelling),
  RateLimiter (Mutex<(Option<i64>,u32)>, saturating, clock-backwards re-anchor) + gated grass
  logs, cached_abilities/cached_heal_locations LazyLocks, content_version-keyed type-chart
  cache (Arc, Err-never-cached, poison-recover, lock held across rebuild), battle.rs 6 swaps +
  PARK comment removal, raising.rs cached cost lookup, healModel costCurrency seam (?? 0).
- Impl review (reviewer + red-team + simplify + reducer-security-auditor + desync-guard, all
  PASS): fixes applied (3372660): routine-reason filter via shared const NO_CONSCIOUS_MONSTER_REASON
  (closes hostile-client limiter saturation), json_escape import style, check(now) param rename,
  knowledge bundle regen (was the one CI-red), ADR residual updates.
- Verifier PASS: 424 module + 1078 game-core + 1805 client vitest + tsc + clippy + fmt + 74/74
  evals; test-integrity clean (pure strengthening, fmt-reflow token-identical); 5/5 teeth bite;
  cargo-mutants 31 caught / 1 missed → missed mutant (!=→== on the filter) got its own tooth
  (97a8d2e), bite re-verified by orchestrator.
- ARCHITECTURE.md updated (table row, cache section, 11r-g narrative; ADR next-free = 0171).
- Residuals spec annotated with DELIVERED/PARKED block (harness repo, uncommitted stray).
- /tmp/mr_warn_11r-g appeared after 97a8d2e — honored: no new fan-outs since; converging.

## REMAINING
1. Full `just ci` (in flight, background task b8wtuggce) → expect green (verifier already ran
   all components incl. evals separately).
2. Final commit + push; write handoff entry; open PR (body: touches-delta, boyscout-delta: none,
   Items: none, residuals) → STOP at terminal state. Supervisor owns merge.

## KEY RESIDUALS for the supervisor (full list in ADR-0170)
1. cost_currency COLUMN parked (hidden dep: content.rs:702 seed; amends ADR-0083 §A; needs
   schema.rs+content.rs+bindings+store/rowConvert+healView — healView currency arm NON-OPTIONAL).
2. pvp.rs/taming.rs cache swaps (load_abilities/type_chart_from_rows still uncached there).
3. Unescaped JSON log sites: battle.rs:1087/:1124/:1310 (touched file, deliberately not ridden),
   pvp.rs:501/:518/:607, content.rs:266/:696, npc.rs:147.
4. Client-steerable begin_encounter reasons (trade-escrow) can still consume the shared limiter
   window; movement_tick_error sites un-rate-limited (5/sec/zone on persistent content fault).
5. C-7 pin inversion idea (scan for type_relation_row WRITES repo-wide).
6. Graph refresh (cbm index_repository + codegraph sync on MAIN checkout) deferred to post-merge
   (11r-c precedent — change not on master yet).

## BLOCKERS
None.

## EXACT NEXT STEP (if resumed here)
Check task b8wtuggce output for JUST_CI_EXIT:0; commit/push any stray; write handoff terminal
entry; `gh pr create` on mdrewt/monster-realm from feat/11r-g-server-hardening; STOP. Do NOT
merge (supervisor-only).
