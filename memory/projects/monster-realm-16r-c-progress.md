# 16r-c progress memo

**Slice:** 16r-c — ADR-0196 follow-ups: close the changelog-freshness gate blind spot.
**Branch:** `feat/16r-c-changelog-freshness-gate` @ `98686e6` (pushed) ·
**Worktree:** `projects/monster-realm/.claude/worktrees/16r-c` (from `origin/master` @ `2290f47`).
**Master CI at fork:** GREEN (run 32559462988).

## DONE
- Plan (planner/opus) → reviewed by `reviewer` + `red-team` + `/simplify`.
- Tests: `tester` authored TEETH V0-V28 + W1-W15 and real Checks 24-29. RED proven
  (`eval THREW: CHANGELOG_FRESHNESS_GATES is not defined`), committed at `1c75a84`.
- Impl (general-purpose/opus, separate agent): predicates green at `38cf46c`.
- Round-2 review battery (`reviewer` + `red-team` + `tester`, parallel) found and I fixed:
  * **REGRESSION this slice introduced** — widening `{kind:'just'}` to read block-scalar bodies
    LOOSENED the pre-existing mutation/coverage/mutation-server gate (a `run: |` gate step was
    fail-closed before). Fixed with a single-line rule; tooth V29 pins it.
  * job-level `defaults: run: shell:` no-ops every run step with every pin intact (V30/V31)
  * `strictJobBlock` scanned from line 0 → a decoy job block in a top-level `run-name:` block
    scalar beat the real `if: false` definition (V34); now anchored at `findJobsAnchor`
  * `justRecipeBody` first-wins → a just `'''` string could hold the pinned body (W16)
  * `working-directory:` on a gate step (V32); folded `run: >` scalars (V33)
  * recipe hardening: scrub `GIT_CLIFF_*`, `--config cliff.toml`, temp-file + `mv`
  * `changelog-check:` body now pinned (`changelogCheckRecipeIntact`, Check 30, W17)
- 7/7 round-2 mutation bite-proofs confirmed (revert each fix → the named tooth fires).
- All 3 EARS neuter modes proven RED end-to-end vs a copy of the real nightly.yml, each with a
  mode-specific reason (i→Check 27, ii→pre-existing Check 21, iii→new Check 26).
- Docs: ADR-0196 appended (delivered #2/#3, dated deferral of #1/#4, still-open residuals);
  ARCHITECTURE.md one-sentence correction. `doc-keeper` edits verified in the WORKTREE only.

## STATUS: TERMINAL — PR #351 OPEN, local `just ci` GREEN, remote CI running.
https://github.com/mdrewt/monster-realm/pull/351 · `gh pr merge` NOT run (supervisor owns it).
Branch merged up to `origin/master` @ `a857214` (the fork point was locally red on `just security`;
sibling 16r-a had already fixed it). Verifier verdict PASS.

## REMAINING
Nothing for this slice. Supervisor: watch CI, squash-merge.
Recommended NEXT slice (from this slice's own residuals): promote the `mutation`/`mutation-server`/
`coverage` gates from the prefix-matching `{kind:'just'}` to `{kind:'script'}` verbatim pins, and
flip the guarded-job `env:` scan from a PATH denylist to an allowlist (needs a deliberate decision
on FROZEN tooth U2c, which pins that ordinary non-PATH env keys are accepted).
Note 16r-h (`after: 16r-c`) shares `evals/nightly-smoke-wiring.eval.mjs` — serialize after merge.

## BLOCKERS
None.

## ENVIRONMENT NOTES (cost real time this run)
- The `tester` subagent is hook-blocked (`.claude/hooks/guard-tester-write.mjs`) from writing
  ANYWHERE under `.claude/` — and slice worktrees live at `.claude/worktrees/<slice>`, so the
  tester cannot write its own slice. It staged artifacts in /tmp and the orchestrator applied
  them. Same for `guard-tester-bash.mjs`: the tester lens could not execute anything.
- A fresh worktree has no `client/node_modules`; `just ci` dies at 127 on biome until
  `cd client && npm ci --include=dev`.
- `cd`-ing into a scratch tree reset the shell cwd to the MAIN CHECKOUT on the next call.

## EXACT NEXT STEP
Confirm `JUST_CI_EXIT=0` in /tmp/16rc-ci.log, run the verifier, open the PR.
