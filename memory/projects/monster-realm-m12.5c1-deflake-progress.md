---
name: monster-realm-m12.5c1-deflake-progress
description: m12.5c1-deflake slice state — zoneSync e2e deflake (fix-red-master)
metadata:
  type: project
---

# m12.5c1-deflake — Progress memo

**Status:** TERMINAL STATE — PR #100 OPEN, local `just ci` EXIT=0, remote e2e CI running.

## DONE

### Root cause analysis
Identified two distinct race conditions in `client/e2e/zoneSync.spec.ts`:

**Race 1 (test 1 — `:158` failure):**
- `setRawMapZoneForTest(1)` and `snap(page)` were two separate `page.evaluate()` calls.
- Between them, the JS task queue could deliver a WebSocket message (server batch).
- The reconcile listener detected `own.row.zoneId (0) !== rawMap.zone_id (1)` and called `switchZone(0)`, resetting `rawMap` to zone 0.
- `snap()` then read `zone_id = 0`, not 1 → assertion `expect(afterForce.map.zone_id).toBe(1)` failed.

**Race 2 (test 4 — `:367` timeout):**
- Passive `waitForFunction(sawFractionalOwnMotion, 15s)` waited for a flag that might never re-latch.
- After each of tests 1–3, `switchZone→resetPredictionState` reset `sawFractionalOwnMotion = false`.
- When `drain()` immediately applied the queued move (character was idle, old `move_started_at`), the slide clock initialised at the destination tile with same origin = target → no slide animation → no fractional output → `sawFractionalOwnMotion` never set.

### Fix implemented
File changed: `client/e2e/zoneSync.spec.ts` (40 ins, 11 del)

1. **Fix 1**: Collapse `setRawMapZoneForTest(1)` + zone_id read into one `page.evaluate()`. JS single-threaded: no task can interrupt a synchronous evaluate.
2. **Fix 2**: Add explicit `step('South')` + `waitForFunction(sawFractionalOwnMotion, 10s)` before the gate. Guarantees a new target-tile change and fresh slide within STEP_MS.

### Validation
- `tsc --noEmit` (client): clean
- `vitest run` (571 client tests): 571 passed
- `just ci` (full local gate): EXIT=0 — 777 Rust / 571 client / 45 evals

### PR
- Branch: `feat/m12.5c1-deflake`, tip `880fbd8`
- PR: https://github.com/mdrewt/monster-realm/pull/100
- Worktree: `.claude/worktrees/m12.5c1-deflake`

### Review agents
Dispatched `reviewer` + `red-team` in parallel (background). Results pending at time of PR open.

## REMAINING

None — this is the complete fix. Only one file changed, no product code, no ADR needed.

## BLOCKERS

None.

## EXACT NEXT STEP

Supervisor: squash-merge PR #100 → master once the remote e2e CI job is green. Then continue with `m12.5g-1` (doc reconciliation) or the next queued slice.

ADR 0080 NOT consumed by this slice (test-only fix, no new pattern). Remains available for the next ADR-worthy slice.

**Why:** The races are test-side (product code is correct). JS single-threaded atomicity eliminates race 1. Explicit step guarantees fractional motion regardless of `drain()` timing for race 2.
