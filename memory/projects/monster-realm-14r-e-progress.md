# 14r-e progress memo — RESUME COMPLETE, terminal state reached 2026-08-14T15:58Z

PR#318 (`feat/14r-e-dualkey-dedup-mvi-e2e`, ADR-0187) — **PR open + local `just ci` green +
remote CI running on final tree (head 5eeae88)**. Supervisor owns the merge. This memo
supersedes the 14:35Z park memo; both park blockers are CLOSED.

## DONE (this resume run)

1. Conflict: resolved by MERGING master 9b924f3 into the branch (merge commit f523cf2 —
   no force-push needed; guard-bash blocks all force forms). Both sides' wiring-test
   additions combined and lens-verified; DIGEST regenerated (hand-merge count staleness
   was the wip-push ci-job red). PR now MERGEABLE.
2. Regression triage: NEITHER CI red was a movement regression. movement-input:404 =
   harness-timing loud-fail (no rep scored). zoneSync:375 = pre-existing ~20%/run
   grass-encounter flake (12.5c-3's 'South' from (3,1) → grass (3,2) → wild battle →
   enqueue_move rejected). Repro'd locally + module-log smoking gun. Dualkey diff
   provably not on zoneSync's path.
3. Deflakes (declared client/e2e/* scope): movement-input 40/40ms + MAX_ATTEMPTS 5 +
   per-attempt recenter + test.slow(); zoneSync East/West triggers + grass-aware
   fail-loud pick + beforeAll live-map corridor guard.
4. Gates: 2399/2399 unit · 12 local pair runs + full 66-test e2e green · `just ci`
   green (eval re-run 86/86 after the account-e2e global-spacetime-lock collision) ·
   tester(opus)/reviewer/red-team/verifier all PASS, findings applied · ADR-0187
   amended with the diagnosis · PR body updated (Resume-pass section).

## REMAINING

- Supervisor: watch remote CI on 5eeae88 (e2e already passed once post-deflake on
  31814396831), then squash-merge PR#318.
- Backlog (named in ADR-0187 final section): zoneSync 12.5c-2 `characters.length` vs
  cross-file disconnect GC; MOVE_QUEUE_CAP≥2 contingency for scenario B; scenario A
  probabilistic mutant kill (add reps, never shorten the 90ms press); README next-free
  counter stale at 0184 (supervisor-owned).

## BLOCKERS

None.

## Exact next step

Supervisor merge on CI green (mr-ci-watch). If remote e2e reds AGAIN on a test inside
this slice's touches, that would be the first post-diagnosis counter-evidence — re-open
with the module log of that run (the wild_encounter/reject signature distinguishes the
flake class in one read).
