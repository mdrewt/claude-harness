## PHASED RUN — <SLICE>, phase `<PHASE>`

This launch is part of the phase-split experiment (`memory/projects/mr-phase-ab`): the build runs
as three sessions, so no one session carries the whole slice's context. **This session runs phase
`<PHASE>` only**; when it ends, the launcher starts a fresh session for the next phase. This
block adds that phase's end to the brief's valid stopping points. The phase
end below is a valid stopping point and overrides the brief's list for it; everything else in the
brief still binds (scope, stop flags, checkpoints, the acceptance ledger, the budget, never merge).

Phases, by the build-loop per-slice procedure:
- `plan` — steps 1–4: verify scope, plan, plan review, red tests (the tester writes them, you prove
  each fails for the right reason). Ends with the gating tests committed and proven red.
- `build` — steps 5–6: implement and the targeted fix loop, until the slice's own tests pass.
- `finish` — steps 7–10: the full lens batch, the full gate, close, open the PR. Its end is the
  brief's normal terminal state.

When the slice is a `type: design`, `docs` or `refactor` slice, or what is left is too small for a
fresh session to pay (roughly under 20 tool calls), say so in one line of the handoff and do the
remaining phases in this session.

### Ending `plan` or `build`
1. Commit and push a `wip(<SLICE>): <PHASE> phase done` checkpoint.
2. Keep the running PR body draft `$MEM/monster-realm-<SLICE>-pr-body.md` current (plan-delta,
   touches-delta, boyscout-delta, decisions, not-verified so far).
3. Replace the handoff `$MEM/monster-realm-<SLICE>-phase.md` whole, at most 150 lines. Line 1 is
   exactly `NEXT-PHASE: build` after `plan`, or `NEXT-PHASE: finish` after `build`. Then:
   - **State:** worktree path, branch, HEAD sha, what is installed (npm ci, just wasm), the exact
     commands that run the slice's tests.
   - **Plan:** the plan file's path and the `## Contracts` the tests call.
   - **Tester findings, verbatim,** each with its disposition (fixed in the slice / answered in the
     plan-delta / ignored, with the reason), and the red-run result per test.
   - **Decisions** and plan-delta lines so far; any `mr-touches widen` grants.
   - **Open items** for the next phase, in order; for `finish`, the implementer's reasons for any
     choice a reviewer is likely to question.
   - **Files to read first,** with line ranges.
4. End your turn with the one line `PHASE <PHASE> DONE — handoff written`. Do not summarize the slice.

### Starting `build` or `finish` (you are a fresh session)
- Read `$MEM/monster-realm-<SLICE>-phase.md` first, then only what the next step needs. Do not
  repeat an earlier phase's reviews or re-derive its contracts.
- `finish`: read the full diff (`git diff origin/master...HEAD`), the plan, the plan-delta and the
  decisions before the lens batch: fixing a lens finding needs the implementer's reasons, which
  live in those files. On a hard-tier slice a lens-fix commit over about 100 lines of non-test
  code still gets one re-review.
