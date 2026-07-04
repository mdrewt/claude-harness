---
name: monster-realm-M12.5d-review-verdict
description: Review verdict for PR #90 M12.5d netcode smoothness residuals (ADR-0075)
metadata:
  type: project
---

# PR #90 (M12.5d) Review Verdict

**Verdict: FIXED**  
**PR:** feat/m12.5d-netcode-smoothness, tip **ae0fcaa** (pre-fixes) → **ddd1d0c** (post-fixes)  
**Date:** 2026-07-03  
**Lenses:** reviewer + red-team + /simplify + desync-guard (expert) + verifier (5 independent lenses)  
**Supervisor may merge: YES**

---

## Verifier Results

**BASELINE CI:** PASS (571 JS tests, 756 Rust tests)

**RED CHECK A — INTERP_DELAY_STEPS 1.5 revert: BITES**
- `interpolation D1 > BITES (M12.5d-1): monotone positions` — FAILED (non-monotone at 1.5×)
- `interpolation D1 > BITES (M12.5d-1): interpDelayMs(200) equals 200` — FAILED (returned 300)
- `interpDelayMs: renders remotes 1.0 STEP_MS in the past` — FAILED (returned 300, not 200)
- `RenderResolver remote fractional interpolation` — FAILED (returned 0, not 0.5)

**RED CHECK B — snap-on-teleport removed: BITES**
- `store M12.5d-2 > zone change drops prev` — FAILED (prev was set, not undefined)
- `store M12.5d-2 > tile delta > 1 drops prev` — FAILED (prev was set, not undefined)
- `store properties > history never exceeds two snapshots…` — FAILED (property counterexample found)

**RED CHECK C — reconcile calls drain() instead of #stepForward: BITES**
- `predictor M12.5d-3 > reconcile drain does NOT reset snap gap timer` — FAILED
- `predictor M12.5d-3 > multiple reconcile drains still detect large gap` — FAILED
- `predictor M12.5d-3 > first frame drain never snaps` — FAILED (snapped=true, bug re-introduced)
- `predictor NET-1 ADR-0052 §B first-drain regression guard` — FAILED

**Pre-existing test modifications:**
- `renderResolver.test.ts` now 400→300: **LEGITIMATE** — maintains renderTime=100, assertion unchanged
- `store.test.ts` property test (prev=undefined on large delta): **LEGITIMATE** — actually tightens (adds new `expect(prev).toBeUndefined()` assertion in the large-delta case)
- `camera.test.ts` rewrites (corner→center formula values): **LEGITIMATE** — all arithmetic verifiable

**Mechanical checks:** CLEAN — no `.skip`/`.only`/`.todo`/`xit`/`xdescribe` in client/src/

**ADR-0075 accuracy:** ACCURATE for 12.5d-1 math, 12.5d-3 `#stepForward` description, 12.5d-4 `lastCamX/Y` lifecycle

**FULL CI (post-fix):** PASS — 571 vitest, 756 nextest, 36 evals, typecheck, wasm-pack, semgrep, check-secrets

---

## Reviewer Findings (no blockers)

| Sev | Finding | Fixed? |
|-----|---------|--------|
| MEDIUM | Stale tile-corner arithmetic comments in camera.test.ts C1a/C1c tests | **YES** — updated to tile-center math |
| MEDIUM | connection.ts comment implied entityId is plain number (it's bigint) | **YES** — clarified both types |
| MEDIUM | NPC multi-tile-jump snap assumption undocumented (store.ts + ADR) | **YES** — added assumption note to ADR-0075 12.5d-2 |
| LOW | ADR-0075 missing "Considered alternatives" section (MADR process) | **YES** — added 4-alternative section |
| LOW | `lastCamX/Y = 0` origin flash on first frame (pre-existing, not a regression) | recorded, no fix needed |
| LOW | `isOwnZoneChange` inline duplication (mild SSOT dilution, justified by perf) | recorded, acceptable |
| INFO | `child.destroy()` correct Pixi v7/v8 API, no double-destroy risk | N/A |
| INFO | `#stepForward` return value unused at reconcile callsite | N/A |

---

## Red-Team Findings (no blockers)

| Sev | Attack | Verdict |
|-----|--------|---------|
| LOW/COSMETIC | Camera snaps to 0,0 for 1-2 frames on reconnect (`resetPredictionState` zeroes before char row arrives) | PRE-EXISTING — old `?? 0` had same behavior; hold improves warp case |
| LOW/STALE TEST | proof-of-teeth jitter suite used hardcoded `300` (old 1.5×) | **FIXED** — changed to `interpDelayMs(200)` |
| EDGE-CASE | NPC multi-tile-jump snap (latent, current model is safe) | Documented in ADR-0075 |
| FALSE ALARM | Attack 3: `#stepForward` reconcile isolation | SAFE (verified by verifier RED check C) |
| FALSE ALARM | Attack 5: Graphics double-destroy | SAFE (JS single-threaded, `removeChildren` is atomic) |
| FALSE ALARM | Attack 6: `zoneId` strict `!==` on `SdkCharacterRow` | SAFE (`zoneId` is plain `number` u32) |

---

## Expert Desync-Guard Findings

All 5 fixes rated **SAFE**:
- **12.5d-1 (1.0× delay):** Correct for 2-snapshot buffer. Jitter tradeoff: 1.0× is minimum viable; late packets (1ms) produce 1-frame hold (graceful degradation, not snap). ADR-0013 should note this tradeoff. Not blocking.
- **12.5d-2 (snap on delta>1):** Cardinal-only game → `> 1` threshold never false-triggers on normal walks. Snap is atomic (same upsertCharacter call as ingest, seen by next rAF). SAFE.
- **12.5d-3 (#stepForward):** Follows two-clocks principle (simulation/reconcile vs render must be independent). Logic is sound. SAFE.
- **12.5d-4 (tile-center + hold):** +0.5 shift meaningful (16px at TILE_PX=32). Hold lifecycle correct. SAFE.
- **12.5d-5 (destroy + inline scalar):** `destroy()` is correct Pixi v8 call. `isOwnZoneChange` still exported + tested in warpDetect.ts. SAFE.

**Expert follow-up recommendations (not blocking):**
1. Add `renderResolver` unit test: `upsertCharacter` with `|Δtile|=2` → `prev=undefined` → `renderResolver` returns `latest` position (ensures no entity-disappearance on snap). Currently implicit.
2. Note 1.0× jitter tradeoff in ADR-0013 (cross-reference from ADR-0075). 

---

## Fixes Committed

**Commit `2a9aefc`** on `feat/m12.5d-netcode-smoothness` — 4 files, 44 insertions(+), 15 deletions(−):
```
docs(review): fix stale comments and expand ADR-0075 (M12.5d review pass)
- camera.test.ts: update all tile-corner arithmetic to tile-center formula (C1a, C1c)
- interpolation.test.ts: INTERP_DELAY=300 → interpDelayMs(200) in proof-of-teeth
- connection.ts: clarify zoneId=number (u32) vs entityId=bigint (u64) in comment
- ADR-0075: add Considered alternatives + NPC snap assumption note
```

**Commit `ddd1d0c`** on `feat/m12.5d-netcode-smoothness` (simplify lens) — 1 file, 2 insertions(+), 2 deletions(−):
```
docs(simplify): fix stale isOwnZoneChange reference in connection.ts comment
- Subscription comment still named isOwnZoneChange after M12.5d-5 inlined it
```

No behavioral changes in either commit.

---

## Open Follow-ups (non-blocking, queue for future slice)

1. **`renderResolver` prev=undefined snap test** (expert recommendation): add a unit test asserting that when `prev=undefined`, the resolver returns `latest` position for the entity on that frame — not a ghost/disappearance.
2. **ADR-0013 jitter footnote**: cross-reference from ADR-0013 that 1.0× was chosen to pair with 2-snapshot depth; a deeper buffer would restore 1.5× headroom at the cost of latency.
3. **`flushBatch` per-listener isolation** (existing debt from M8.8e memory): a throwing batch listener starves siblings — unchanged by this PR, pending follow-up.

---

## /simplify Findings

**`#stepForward` extraction:** JUSTIFIED — alternative (boolean flag `drain(now, updateTimer)`) is a code smell; private method gives each caller a clear contract. Not over-engineered.

**`lastCamX/Y` module-scope vars:** CLEAN — follows existing pattern of module-scope session state in main.ts (`sawFractionalOwnMotion`, `battleSynced`, `dismissedBattleId`). Two vars match the x/y args to `render()`.

**Dead code/stale refs:** ONE stale comment found — connection.ts line 83 said "Warp detection uses character.onUpdate (isOwnZoneChange)" after M12.5d-5 inlined the check. Fixed in `ddd1d0c`.

## Local `just ci` (post-fix, in review worktree)

```
lint:    PASS  (cargo fmt + clippy + biome)
typecheck: PASS (cargo check)
test:    PASS  (756 Rust nextest, doc tests)
eval:    PASS  (36 evals)
security: PASS (check-secrets: clean)
wasm:    PASS  (wasm-pack build)
client-typecheck: PASS (tsc --noEmit)
client-test: PASS (571 vitest, 24 test files)
```

**Supervisor may merge: YES.** Squash-merge PR #90 → master. Index ADR-0075 via doc-only chore PR. ADR next-free = 0076.
