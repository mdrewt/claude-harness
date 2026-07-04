---
name: monster-realm-M12.5c-review-verdict
description: Review verdict for PR #88 (M12.5c zone-sync robustness) — post-fix audit of 8c18860
metadata:
  type: project
---

# Review Verdict: PR #88 — M12.5c zone-sync robustness

**VERDICT: FIXED**

PR #88 (`feat/m12.5c-zone-sync-robustness`) is **APPROVED after doc fixes**.  
One doc-fix commit pushed: `253df4d` (2026-07-03).

---

## Scope

Full diff: `origin/master...HEAD` (6 commits, +987/-127 lines across 7 files).  
Special focus: commit `8c18860` which removed the early `return` after `switchZone()` in the batch reconcile listener in `client/src/main.ts`.

No server-side (Rust/reducer) changes in this PR — no reducer-security-auditor lens needed.

---

## Lens-by-Lens Findings

### reviewer lens

**PASSED.** No correctness bugs in the implementation.

- `switchZone()` is correctly idempotent (`if (newZoneId === rawMap.zone_id) return`).
- Mutation order is correct: `zone_map → TileMap.fromRaw (validate) → renderer.setMap → set_active_zone → rawMap = newRawMap → resetPredictionState()`.
- The batch listener's try/catch properly contains all reconcile code (12.5c-4: no listener starvation).
- `resetPredictionState()` correctly resets predictor, slide clock, held keys, and sticky latches without touching the store.

### /simplify lens

**PASSED.** No over-engineering. The `switchZone` extraction is necessary (module-scope renderer access). The `setRawMapZoneForTest` test hook is properly isolated (never in production paths). No unnecessary abstractions added.

### red-team lens (commit 8c18860 focus)

**3 findings, all addressed:**

**FINDING 1 (CRITICAL — FIXED)**: ADR-0074 code snippet showed `return; // skip prediction reconcile in zone-switch batch` — the exact line removed by 8c18860. The ADR was documenting stale behavior as if it were current. Fixed in `253df4d`.

**FINDING 2 (MEDIUM — FIXED)**: `world.ts` setMap JSDoc said "Called by switchZone() in main.ts **after** rawMap reassignment" — wrong direction since c9298b9 moved `renderer.setMap` BEFORE `rawMap = newRawMap` (RT-SZ-01). Fixed in `253df4d`.

**FINDING 3 (LOW — FIXED)**: `switchZoneAtomicity.test.ts` RT-SZ-02 block described behavior that no longer exists: "reconcile listener returns before prediction step on zone-mismatch batch". After 8c18860 the listener falls through to run the seeding reconcile on the same batch. The `expect(true).toBe(true)` meant it always passed regardless, but the docstring was actively misleading. Updated to document current behavior in `253df4d`.

**NO CONCERN — double-reconcile**: The reconcile listener is registered once; `onBatchApplied` fires once per batch. No double-reconcile path exists.

**NO CONCERN — spurious held-key re-issue**: After `switchZone()` resets the predictor (`#predicted = undefined`), `predictor.reconcile()` returns `false` per contract (`predictor.ts:200`: `if (before === undefined) return false`). So `diverged = false` → held-key re-issue never fires on a zone-switch batch.

**NO CONCERN — ordering hazard**: `switchZone()` is idempotent. If both `onOwnWarp` and the reconcile listener fire on the same batch (live-warp path), `onOwnWarp` runs first (SDK row event before `onBatchApplied`), updates rawMap; the reconcile listener sees `own.row.zoneId === rawMap.zone_id` and skips `switchZone`. No double-switch.

**EDGE CASE (not blocking)**: If `switchZone()` fails (renderer.setMap throws), rawMap is NOT updated and the predictor is NOT reset. The fall-through then runs reconcile against a mismatched zone state with the stale predictor — could produce `diverged = true` and a spurious held-key re-issue. This is pre-existing behavior made slightly more visible by removing the `return`, but only occurs on catastrophic renderer failure (GPU OOM). Non-blocking.

### desync-guard lens

**PASSED.** The zone-switch path correctly resets the predictor (a fresh `Predictor` from `resetPredictionState()`), then seeds it via `predictor.seedSeq(ackedSeq)` + `predictor.reconcile(baseline, ...)` against the authoritative character row. The server-authoritative position is always used as the reconcile baseline (ADR-0012). No desync path introduced.

### verifier lens — gating test assertion

**E2E tests (`client/e2e/zoneSync.spec.ts`):**
- Identical from RED checkpoint `55b8dd4` to tip — zero changes to this file across all commits.
- 4 Playwright tests covering 12.5c-1/2/3/5 — all present, no `.skip`/`.only`/`todo`.
- Test 12.5c-1/5 explicitly asserts `ownPredictedTile !== null` after zone correction (the exact invariant that the 8c18860 fix enables).

**Unit tests (`client/src/net/switchZoneAtomicity.test.ts`):**
- Added in `c9298b9` (not in RED checkpoint — it's a new gate for RT-SZ-01).
- 5 tests: BITES(buggy) + FIXED(throw) + FIXED(success) + FIXED(idempotent) + RT-SZ-02.
- RT-SZ-02 comment was updated in `253df4d`; `expect(true).toBe(true)` still present (documentation test).
- No `.skip`/`.only`/`todo` in either file.

**Assertion count — no weakening**: predictor.reconcile contract (`before === undefined → false`) is tested via predictor.test.ts (53 tests all pass). The RT-SZ-02 description update removes stale text and replaces it with accurate description of current behavior; the `expect(true).toBe(true)` marker is retained.

---

## ADR-0074 Accuracy (post-fix)

ADR-0074 now accurately reflects the final implementation:
- State-based zone sync: `if (own.row.zoneId !== rawMap.zone_id) switchZone(...)` — falls through (no `return`) ✓
- Fall-through seeding reconcile explained: `before === undefined → returns false → no spurious re-issue` ✓
- Idempotent switchZone with renderer-first ordering (RT-SZ-01) ✓
- rAF containment (try/catch/finally) ✓
- `setRawMapZoneForTest` proof-of-teeth hook ✓

---

## Local `just ci` Result

Run in isolated worktree (`/tmp/mr-m12.5c-review`) with symlinked `node_modules` and `client-wasm/pkg`:

| Gate | Result |
|------|--------|
| cargo fmt --all --check | PASS |
| cargo clippy (D warnings) | PASS |
| biome check | PASS (warnings only, all pre-existing) |
| cargo check (typecheck) | PASS |
| cargo nextest (756 tests) | PASS (1 skipped, pre-existing) |
| cargo test --doc | PASS |
| node evals/run.mjs (42 evals) | ALL PASS |
| check-secrets.mjs | clean |
| tsc --noEmit (client) | PASS |
| vitest run (558 tests) | ALL PASS |

Full `just ci` = **GREEN** (wasm build requires wasm-pack/live env; symlinked from main project for test purposes).

---

## Fixes Pushed

| SHA | Description |
|-----|-------------|
| `253df4d` | docs(M12.5c): fix stale docs left by 8c18860 early-return removal |

3 files changed: `docs/adr/0074-zone-sync-robustness.md`, `client/src/render/world.ts`, `client/src/net/switchZoneAtomicity.test.ts`.

---

**Why:** ADR had stale `return;` in code snippet; world.ts JSDoc said "after" rawMap reassignment when the code does "before"; RT-SZ-02 test described old "skips prediction" behavior which no longer exists. All three were pure doc divergence from the final code, not behavioral bugs.
