# movement-investigation — progress memo

**TERMINAL STATE REACHED 2026-07-27.** PR https://github.com/mdrewt/monster-realm/pull/259 open ·
branch `feat/movement-investigation` (HEAD 57e269a) · local full `just ci` EXIT=0 · remote CI running
at hand-off · merge is SUPERVISOR-owned (squash — 8 wip commits).

## DONE (everything)
Diagnosis (client-side, sim-proven, server innocent) → plan + 3 lenses → RED gating tests
(tester@opus) + test-review hardenings → implementation (heldKeys committedActive,
HOLD_COMMIT_MS=150, 3 main.ts lines) → 4 impl lenses (14/14 mutants killed) → SSOT budget eval →
verifier PASS (6/6) → ADR-0158 + 0148 amendment + ARCHITECTURE + DIGEST → full `just ci` green →
PR#259 open.

## REMAINING
Nothing for this run. Supervisor: merge #259, clean worktree/branch, tick harness spec status,
adr_next_free=159. Recommended follow-up slices: `M-postgate-dualkey-dedup` (ADR-0158 residual 3),
`mvi-e2e` keyboard tooth (residual 4).

## BLOCKERS
None.

## Exact next step (if resumed before merge)
Verify PR#259 CI state (`gh pr checks 259 --repo mdrewt/monster-realm`); do NOT merge; if remote CI
red on something local ci also runs, investigate in the worktree and push a fix commit.

Full detail: handoff entry in monster-realm-handoff.md (2026-07-27 movement-investigation section).
