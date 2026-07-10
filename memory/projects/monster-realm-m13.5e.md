---
name: monster-realm-m13.5e
description: M13.5e client UX correctness — bait preserve, zone guard, battle scope, render O(n log n), adaptive interp delay ADR-0090
metadata:
  type: project
---

M13.5e DONE (PR #129, ADR-0090, tip efcbab4). 5 EARS criteria, 778 client tests, `just ci` EXIT=0.

**Why:** M13.5 seventh-review residuals — client UX bugs accumulated from prior slices.

**How to apply:** ADR next-free=0091. These files are now stable for future slices.

## Per-criterion record

**e-1 (bait preserve, `client/src/ui/battleView.ts`):** Save `#baitSelectEl?.value` before `replaceChildren()`, restore after `#renderRecruit(vm)`. Cast needed: `this.#baitSelectEl as HTMLSelectElement | null` because TS narrows the private field to `null` after the `= null` assignment even through a method call. Remove duplicate `select.dataset.testid` write (keep only `setAttribute`). Tests: `client/src/ui/battleView.test.ts` (5 tests, happy-dom).

**e-2 (zone guard, `client/src/main.ts` + `client/src/net/zoneSyncGuard.ts`):** After a failed `switchZone` in `reconcileFromStore`, re-check `own.row.zoneId !== rawMap.zone_id` and `return` early. Track `zoneSyncFailureCount`; call `shouldReportZoneSyncFailure(count)` (threshold=3) to surface `'content out of date — reload'`. Pure helper lives in `net/zoneSyncGuard.ts` (NOT `ui/` — moved during review).

**e-3 (battle subscription, `client/src/net/connection.ts`):** `'SELECT * FROM battle'` carries a rationale comment: transport-unfiltered by design (no owner view yet → M16); ADR-0015 V1 defence-in-depth at `store.ongoingBattle(identity)`.

**e-4 (render perf, `client/src/render/world.ts`):** `this.#actors.sortableChildren = true` in `init()`. Replace per-frame `setChildIndex` loop with `view.sprite.zIndex = zIndexForEntity(e.y)` in the update loop. `zIndexForEntity(y) = y` (identity, pure, in `zorder.ts`). Guard `npcsMap` build: `const allNpcs = conv !== undefined ? store.allNpcs() : []`.

**e-5 (adaptive interp, ADR-0090):**
- `client/src/shared/interpConfig.ts` — SSOT for `INTERP_JITTER_ALPHA=0.125`, `INTERP_MAX_DEPTH=4`, `BURST_EPSILON_MS=20` (avoids net→render import cycle; B-1 finding).
- `JitterEstimator` class in `interpolation.ts` — EWMA of `|interval − stepMs|`, α=0.125.
- `adaptiveInterpDelayMs(jitter, step)` — `clamp(step + 2.0×jitter, 0.5×step, 2.5×step)`.
- `interpolateHistory(snapshots, renderTime)` — linear scan for bracket, HOLD past newest, clamp to oldest.
- `AuthoritativeStore(stepMs)` — ring buffer (oldest-first, max 4), burst detection, EWMA update.
- **B-2 guard constraint (KNOWN LIMITATION):** `synthetic <= now + BURST_EPSILON_MS` prevents synthetic timestamps for typical `stepMs` (≥100ms). Burst snapshots get real wall-clock `receivedAt` (close-but-distinct). Depth-4 ring + `span≤0` HOLD guard are the fallback. Guard prevents ring ordering violations (synthetic in future > next genuine arrival). Documented in ADR-0090 §B-2.
- `RenderResolver` uses `adaptiveInterpDelayMs(c.jitterEwma, stepMs)` per character.

## ADR lineage

ADR-0090 (`docs/adr/0090-adaptive-interp-delay.md`) supersedes ADR-0075 §12.5d-1 (fixed 1.0× delay + 2-snapshot depth → adaptive EWMA). ADR next-free=0091.
