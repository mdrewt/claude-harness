# A0 progress memo — fuse() field-carry fix + fusion_eligible (ADR-0147)

**Session:** 2026-07-25, fable@xhigh HARD tier. **Branch:** `feat/A0-fuse-field-carry` (worktree `.claude/worktrees/A0`, base master `3d02b38`). **Sibling:** nh1 concurrent (client/src/main.ts + ADR-0146 — disjoint; both slices will regen docs/adr/DIGEST.md → supervisor reconciles at serial merge).

## ⚠ INCIDENT (resolved, must reach the handoff at terminal state)
Early in the run, one Bash call ran `git add -A && git commit` with cwd still at the MAIN checkout (`projects/monster-realm`) instead of the A0 worktree — it committed 4 pre-existing `.claire/worktrees/*` stray files to LOCAL master as `89987cd` (forbidden main-checkout mutation; origin never received it — the accompanying push only pushed the still-clean feature branch ref). **Repaired exactly:** `git reset --mixed 3d02b38` on the main checkout → master back at origin's commit, strays back to untracked, byte-identical pre-incident state (verified: status shows only `?? .claire/`). Root cause: relative-path git after an earlier `cd` into the main checkout; the existing memory card "Shell cwd resets on process restart — always `git -C <abs-worktree>`" warned exactly about this. All subsequent git mutations use explicit `git -C <A0-worktree>`.

## DONE
- Plan (`docs/specs/A0-plan.md` in worktree) — planner + reviewer + red-team (both opus, parallel); rev-2 adjudication section is BINDING. Key calls: fusion_eligible gains (a_id, b_id) params (MonsterInstance has no id — recorded spec deviation); `reject_if_not_fusable` server helper in evolution.rs owns variant→msg mapping; marshal-early + eligibility-after-ownership-before-battle reducer order; eval E3 rewrite is a FORCED touches-delta (it pins the inline `a_id==b_id` A0-7 deletes) — must be body-scoped + `_tests.rs`-blind + string-literal-stripped (red-team proved current form vacuous); mutation-hardening fixtures strictly-above-minimum (`<`→`!=` mutant); dead same-owner branch deleted (unreachable, ratchet survivor); constants 75/50/10/120 ship AS SPEC'D with the 54h-per-parent reachability math + max-vs-both tension recorded in ADR-0147 Consequences + PR flag for Drew.
- ADR-0147 drafted (`docs/adr/0147-fuse-field-carry-and-fusion-eligibility.md`), Decision ≤240 chars, subsystems evolution-fusion + ci-gates.
- game-core RED (tester agent, opus) → GREEN (orchestrator implemented; tester≠implementer): taxed formulas in transform.rs (FUSION_EFFICIENCY=75, LEVEL_RETENTION_FLOOR=50, scale_u32/avg_u32 private, bounds-proof .expects), fusion_eligible + FusionError + MIN_FUSION_LEVEL/BOND in eligibility.rs, narrow mod.rs/lib.rs re-exports. `cargo clippy -p game-core -D warnings` clean; nextest **1032/1032**. Commits: plan+ADR `11777b6`, RED tests, green impl — all pushed.

## DONE (continued)
- Server RED (tester: fuse_seam delegation rewire + make_fusable_monster_row + 14-row eligibility-parity matrix + A0-8 e2e) → GREEN (orchestrator: reject_if_not_fusable helper, reducer reorder, inline-check + dead-branch deleted). nextest **365/365**, clippy clean.
- Eval E3 rewrite v1 (tester): delegation checks, prod-only reader, string stripper, 17 teeth + reader probe. `just eval` **71/71 PASS**.
- Scoped mutation: game-core changed files **40 mutants, 0 missed**; server evolution.rs 12 missed ALL pre-existing line classes (verified vs 3d02b38: old lines 287/303 etc.), slice REMOVES 2 previously-missed guard mutants → net nightly-299-cap headroom.
- `just knowledge` + `just adr-digest` regens done; ARCHITECTURE 3 sites updated.
- Review battery DONE (reviewer + red-team + reducer-security lens, all opus, parallel). Arithmetic/guards/privacy/atomicity/panic-surface all PASS (red-team brute-forced the full input domain — no .expect reachable). CONVERGED MAJOR: E3 eval was presence-only — `let _ =` discard, duplicated `&a_inst` arg, second-ownership-after-gate, and pub-fn-fuse decoy shadowing all passed every gate (proven end-to-end). Reviewer M1/M2 doc-truth fixes applied (ARCHITECTURE:811 fresh-L1, ADR-0147 seam-asymmetry clause, evolution.rs module doc).

## IN FLIGHT
- Tester hardening the eval per converged findings: result-propagation pin, 4-arg arg-identity needle, lastIndexOf ownership ordering, uniqueness count pin, sub-check attribution prefixes, r#-string blanking + honesty note; test nits (T32 parent-B level 12→10 branch discrimination; b-not-owner load-bearing comment + !contains("120 bond"); T6 doc; stale RED headers).

## TERMINAL STATE REACHED (2026-07-25)
- Tester hardening landed; evals 71/71; verifier ran: REJECT on 3 rustfmt sites ONLY (all other items PASS incl. 5/5 neuter probes, gating-test integrity, EARS map, touch-set, no-drift) → `cargo fmt --all` applied (verified token-identical) → **full `just ci` EXIT=0**.
- **PR #248 opened** (https://github.com/mdrewt/monster-realm/pull/248). nh1 (#247) merged mid-build → PR briefly CONFLICTING on DIGEST.md → merged origin/master into branch (`c1a487f`), `just adr-digest` regen (113 ADRs), ARCHITECTURE auto-merged, **full `just ci` EXIT=0 again** → pushed → PR **OPEN / MERGEABLE / CLEAN, remote ci+e2e pending**.
- Handoff entry appended; spec §A0 DELIVERED note added; memory card `monster-realm-A0.md` + MEMORY.md pointer written. ADR next-free = 0148.

## BLOCKERS
None. Supervisor owns the merge (`gh pr merge` forbidden for the session).

## Exact next step (for the supervisor)
Watch remote CI on #248 → squash-merge → post-merge chores per the handoff entry (harness-file commits, adr/README → 0148, graph reindex, worktree/branch cleanup, surface the Drew 54h-fusion-reachability balance flag before the next playtest).
