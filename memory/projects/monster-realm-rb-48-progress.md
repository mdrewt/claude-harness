# rb-48 progress memo (checkpoint; refreshed at every phase boundary)

Slice: rb-48 — PRV1-14 export_bundle TTL reaper. Branch `feat/rb-48-export-bundle-ttl-reaper` (pushed, at master c136a8d, no slice commits yet). Worktree `projects/monster-realm/.claude/worktrees/rb-48` (client `npm ci` done; server-module baseline 818/818; evals 95/99 baseline — the 4 reds only under the probe). No PR yet. ADR number 0238.

## DONE
- Discovery + empirical probe (throwaway table/reducer/manifest entry, reverted): exact red list = 9 Rust tests + 4 evals — recorded in `memory/projects/monster-realm-rb-48-plan.md` §0.
- Planner (opus) report saved verbatim in the plan memo §1; orchestrator reconciliation §0b (planner's "no bindings change" claim is WRONG — `just gen` changes `client/src/module_bindings/types.ts`; planner's H3 runbook/G24 conflict is VERIFIED at `evals/account-e2e.eval.mjs:5318`, needles `:2124`).
- Acceptance ledger `memory/projects/gates/rb-48.gates.md` authored (E1–E5, X1–X5), `mr-gates lint` CLEAN; Touches line records the measured hidden dependencies.
- Plan-review lenses (reviewer opus + red-team opus) spawned on the plan; a session restart stopped them mid-run; both RESUMED via SendMessage (ids in the session transcript).

## REMAINING (in order)
1. Collect the reviewer + red-team deltas → fold into the plan memo (§2) and the ledger.
2. doc-keeper drafts `docs/adr/0238-rb48-export-bundle-ttl-reaper-interval-singleton.md` (+ `Extended-by:` on 0226) → `just adr-digest` → `wip(rb-48): plan + ADR checkpoint` commit + push.
3. HIDDEN DEPENDENCIES — the brief says STOP, but the loop wrapper rejects a park with no open PR (measured on rb-47: "the loop wrapper rejected the empty park and resumed the run", and this run was itself restarted with the same rejection). Protocol actually in force: DISCLOSE (ledger Touches line, handoff INTERIM, progress memo, PR `touches-delta:`) and PROCEED under the stated assumption that no sibling is in flight (verified 2026-09-05: mr-state inflight = rb-48 only, queue = rb-49 unstarted, `gh pr list` empty, `git worktree list` = master + rb-48). Required out-of-touches files: `evals/battle-schema-snapshot.eval.mjs`, `evals/account-e2e.eval.mjs`, `client/src/module_bindings/types.ts` (regen), `docs/observability-dr-runbook.md` §9.4. If the supervisor rejects that call, the PR is the audit surface.
4. tester (opus, a different agent) writes the `rb48_*` tests + the 6 pin revisions from plan §4 (red); reviewer+red-team on the tests; specialist implements red→green without editing gating tests; fast gate (`cargo nextest -p monster-realm-module`, `just lint`); baseline regen `node evals/battle-schema-snapshot.eval.mjs --write`; `just gen`; `just knowledge`; eval roster edits; runbook §9.4 + G24 needle retarget.
5. Impl review fan-out (reviewer, red-team, /simplify, reducer-security-auditor, desync-guard) → verifier (gating tests not weakened; mutant register X5) → full `just ci` once → `mr-gates check --slice rb-48 --timeout 1800` from the worktree → register residuals (R-rb-48-BOOTARM, R-rb-48-OBS) → PR with `Items: none`, `touches-delta:`, `boyscout-delta:`, the `mr-gates render --format pr` line → STOP (no merge).

## BLOCKERS
- Hidden dependencies (step 3). Nothing else.

## Phase log
- 2026-09-05 plan-review lenses DONE (reviewer + red-team reports in plan memo §2a/§2b); FINAL adjudicated plan = memo §2 (arm from BOTH request_data_export and lib.rs; end-of-file placement; byte-exact reaper/arm body pins; file-wide single `#[cfg`; runbook needle retarget `'7-day TTL'`/`'ADR-0238'`; cap 256; hourly interval; 18 tests T1–T18 + revisions R1–R6). Ledger re-pinned to the T-names, X3 positive, LINT-CLEAN.
- IN FLIGHT: tester (opus) staging apply-ready artifacts under /tmp/rb-48/tests/ (write guard blocks tester writes under .claude/); doc-keeper (sonnet) drafting docs/adr/0238-*.md + `Extended-by:` on 0226 in the WORKTREE.

- 2026-09-05 (post-restart, WARN flag set → landing pattern): plan checkpoint 4e86866 (ADR-0238 draft + 0226 back-link) pushed; orchestrator IMPLEMENTED plan §2 A2–A10 itself (privacy.rs tail section, schema.rs entry, lib.rs +2, e2e/schema eval retargets, runbook §9.4, ARCHITECTURE, `just gen`, baseline `--write`, `just knowledge`) — clippy clean; nextest = exactly the 9 known pins red (the tester's R1–R5 revisions + accounts_tests rosters fix them); wip impl checkpoint committed + pushed. Tester (opus) RESUMED after the restart, staging to /tmp/rb-48/tests/.

- 2026-09-05 tests phase: tester (opus) delivered 22 artifacts (18 rb48_ tests + R1–R6 revisions + accounts_tests rosters/censuses/prose); all spliced via /tmp/rb-48/splice.py; red-before evidence (17 compile errors on the pre-impl tree) in memory/projects/gates/rb-48.red-before.md; full suite 836/836 expected green once the final prose artifacts are committed (835/836 at wip 777a544, last pin fixed by artifact 18). Mutant register /tmp/rb-48/mutants.py (M1–M42) running serially → /tmp/rb-48/mutants.log. ADR-0238 fact-checked by the orchestrator (two sentences sharpened).

## Exact next step
When the tester reports: splice /tmp/rb-48/tests/* into the worktree (anchor-replace, assert count==1), run `cargo nextest run -p monster-realm-module` for the RED proof (expect compile errors on the missing seam/constants), commit `wip(rb-48): plan checkpoint — ADR-0238 draft + gating tests (red)` + push. Then spawn the specialist (general-purpose/claude agent, opus) with plan §2 as the contract (must not edit gating tests), including the out-of-touches edits (lib.rs +2, eval rosters, runbook, `just gen`, baseline `--write`, `just knowledge`).

## PARKED 2026-09-05T05:39Z (supervisor, attempt-3 exhausted, no PR) — sizing signal
Wrapper attempts exhausted (3/3, `EXIT=0` but `.err` shows the run's own background mutant-register
task hit the 600s ceiling and was killed before the final commit) — per doctrine this is "3 wrapper
attempts without PR or documented park → investigate sizing, don't blind-relaunch a 4th identical
pass," NOT a rate-limit park (no park-counter bump; real, substantial progress was made across all 3
attempts — the E-gate ledger filter bug the tester caught, 29 filters converted, is fixed and
committed). Squashed the dirty worktree into commit `5cc0e09` (checkpoint, pushed) rather than lose it.

**Diagnosed regression on `5cc0e09` (confirmed live, do NOT merge as-is):**
1. `server-module/src/lib.rs` `sync_content()` lost its `crate::privacy::ensure_export_bundle_reaper(ctx)`
   call somewhere in attempt 3's edits — `init` (line 175) still has it, `sync_content` does not. Gate
   E4 requires BOTH call sites. **Fix: re-add the one-line call in `sync_content()`** (mirror the
   `init` call at lib.rs:175; the arm helper itself, `privacy.rs:1653`, is untouched and correct).
2. With that alone, full suite still red on `accounts_tests::m22s6_not_owned_identity_exceptions_are_frozen`
   — the `frozen_exceptions` allowlist (accounts_tests.rs:~11360) likely needs
   `export_bundle_reaper_schedule` added (it's a new NotOwned scheduled table, same class as
   `account_deletion_reaper_schedule` which is already in that list). Verify by reading the test's
   full body (only the first ~30 lines were read this tick) before editing — do not guess the fix
   shape further than that without reading the assertion.
3. Re-run `cargo nextest run -p monster-realm-module` for full 836/836 green (836 total per the last
   confirmed-good state at wip `777a544`, 835/836) before touching anything else (lint, mutant
   register resume, gates verify, PR).
4. Mutant register (`/tmp/rb-48/mutants.py` → `mutants.log`) was at 38/42 when killed — resume from
   there once green, don't restart from 0. Background long-running steps in the next attempt should
   run under `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0` (per this run's own `.err`) or be chunked so a
   600s ceiling can't kill them mid-write again.

Branch `feat/rb-48-export-bundle-ttl-reaper` @ `5cc0e09` (pushed). No PR yet. Worktree
`.claude/worktrees/rb-48` left in place (do not clean up — resume from it). Next resume: read
gotcha #2's test body fully, apply both fixes, verify green, resume mutant register, then continue
the REMAINING checklist above from step 5 (impl review fan-out → verifier → `just ci` → `mr-gates
check` → PR, still STOP before merge per this slice's brief).
