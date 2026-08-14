# 14r-e plan — dualkey-dedup + mvi-e2e runtime proof (ADR-0187)

Branch `feat/14r-e-dualkey-dedup-mvi-e2e`, worktree `.claude/worktrees/14r-e` (from be8a612).
Reviewed by reviewer (approve-with-changes) + red-team (5 findings, all dispositioned below).
ADR number supervisor-assigned: **0187** (do not renumber to 0186 — sibling may own it).

## The fix (implementer: orchestrator; NEVER edits test files)
1. `client/src/prediction/heldKeys.ts`: new method `isHeld(dir): boolean` = `#stack.some(e => e.dir === dir)` (membership, NOT stack-top); `press()` refactored to use it (shared predicate).
2. `client/src/main.ts` keydown (~:1402): brace-less `if (!held.isHeld(dir)) step(dir);` then unchanged `held.press(dir, performance.now());` — keeps W-MVI-KEYDOWN-UNGATED needle `step(dir); held.press(dir, performance.now());` contiguous. Comments ≤2 lines/hunk (comment-mass collapse guard).
3. `client/src/main.ts` observability for e2e: module-scope `let moveSendCount = 0` and `let moveRejectCount = 0` declared beside `moveRejectLimit` (~:929, BEFORE noteMoveRejection so the W-11RH region is unchanged); `moveSendCount += 1;` beside `lastSentSeq = seq;` in sendIntent; `moveRejectCount += 1;` FIRST statement inside noteMoveRejection's try; both fields added to DEV `snapshot()` (~:1846).

## Gating tests (tester, opus; already-written = never edited by implementer)
- heldKeys.test.ts: U-DK1 (press/release/clear lifecycle), U-DK2 (membership not stack-top), U-DK3 (isHeld true while committedActive still undefined). RED (method absent).
- main.wiring.test.ts: W-DK-KEYDOWN-DEDUPED (guarded contiguous form, explicit ordering via index comparisons, whole-file `held.isHeld(` === 1, region still lacks committedActive/outstandingSteps); W-DK-COUNTERS (moveSendCount beside lastSentSeq; moveRejectCount first in try; both in snapshot). Prose-only retitle of W-MVI-KEYDOWN-UNGATED ("ungated by hold-duration; deduped by held-state"). RED.
- movementSim.test.ts: ClientModel.keydown gains dedup behind ctor flag `dedupFirstStep=true`; S10 dual-code tap ⇒ exactly 1 (green-on-arrival model pin); S10-twin (flag false) MUST observe 2 (anti-vacuity); S11 two-direction interleave (hold E, hold N on top, press 2nd E code ⇒ no extra step — kills active()===dir shape).
- client/e2e/movement-input.spec.ts (NEW): scenarios A/B/C/D below. B RED today (2 tiles), D RED today (counters absent). A/C labeled GREEN GUARD.
- Droppable last: predictor.test.ts ADR-0152 residual-1 tripwire (fresh Predictor outstandingSteps===0; failure message = "under-count was fixed, update ADR-0152/0187"). Does NOT touch runLoop.

## e2e design (workers:1; golden.spec runs first alphabetically; no presence assumptions)
Helpers in-file (duplicate ready() per 8-file convention; no cross-spec imports): converged() poll auth===pred then stable re-check; recenter() via __game().step() SETUP-ONLY to x=4 (A/B), x=2 (C), x=1 (D), row y=1 (verified grass-free corridor x=1..8, spawn (1,1)); corridor() loud precondition walkable+!grass; in-page key recorder used ONLY to gate retries.
- A (3 taps E,W,E @90ms): each rep exactly ±1 tile at rest. RETRY (≤3) ONLY on measured duration >140ms; within-budget wrong count fails immediately (red-team CRITICAL). Kills committedActive→active, HOLD_COMMIT_MS→0.
- B (2 reps: ArrowRight+KeyD; ArrowLeft+KeyA): down c1, +55ms down c2, +55ms up both (total ≤140ms measured); converged-precondition per rep; assert exactly ±1 at rest + 600ms stability. THE RED PROOF (2 today).
- C: converged at x=2; hold ArrowRight; +250ms press KeyB; assert box overlay DOM visible (selector from ui/boxView.ts); T1; +400ms T2 (|T2−T1|≤1 in-flight); +700ms T3===T2 (frozen under overlay); KeyB close (assert hidden); +600ms T4.x>T3.x (resume = held survived; anti-vacuity); release. Assert x≤6 at T2 (clearance). Kills whole-gate `|| true`.
- D: converged at x=1; S0/R0 counters; hold ArrowRight 1000ms; release; settle; assert ≥3 tiles (anti-vacuity), ΔmoveSendCount ≤ 12 (primary kill: narrow `&& true ||` ⇒ ~60+), ΔmoveRejectCount === 0 (health contract). typeof checks on both fields (RED pre-impl).

## Orchestrator-run proofs
RED proof: vitest (units+wiring) + `just e2e` pre-fix (B red 2≠1, D red missing hooks). GREEN: full vitest + `just e2e` post-fix. Bite-proofs (hand-mutants, single-file manual revert — NEVER `git checkout` on shared paths): (i) `|| true` whole-gate ⇒ C red; (ii) `&& true ||` narrow ⇒ D red (EMPIRICALLY REQUIRED — sim-only numbers not trusted); (iii) second ungated emitter below scanned region ⇒ D red (partial; record); (vi) dedup revert ⇒ B red; (vii) active()=== shape ⇒ U-DK2/S11/W-DK red.

## Docs (doc-keeper finalizes)
ADR-0187 (draft committed at planning checkpoint) Amends 0158; reciprocal `**Amended-by:** ADR-0187` line in 0158 (backlink eval, era ≥0151) + `just adr-digest` (DIGEST.md regen — touches-delta). ARCHITECTURE.md: 2 sentences in the netcode-hardening input section. NO docs/knowledge (server-driven regen; client-only slice). CHANGELOG via commit messages only.

## Honest-scope notes for ADR residuals
Reconcile-listener emitter (:895) runtime kill NOT achieved (diverged-gated; source-scan-pinned only) — scoped claim. keyup-by-dir asymmetry (release one code evicts dir while other code held) pre-existing, unchanged, recorded. movementSim model-drift risk increased; W-DK tooth is the binding.
