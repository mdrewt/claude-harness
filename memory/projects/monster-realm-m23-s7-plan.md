# m23-s7 — reduced motion — build plan (planner output, 2026-08-24)

Slice: M23-accessibility.spec.md §2.5 / §4 S7. Worktree .claude/worktrees/m23-s7, branch slice/m23-s7 from origin/master 0953db7.
touches: client/src/render/motionPreference.ts (new), client/src/render/renderResolver.ts, client/src/render/interpolation.ts (+ sibling tests).
EARS: A11Y-27 [UNIT], A11Y-28 [SCAN, partial in-slice + DEFER eval to S10], A11Y-36 [SCAN].

## Blast radius (union codegraph + cbm + grep)
- ResolveInput consumers: renderResolver.ts + renderResolver.test.ts (~30 inline literals NOT via makeInput) + main.ts:2719. => reduceMotion MUST be `readonly reduceMotion?: boolean` (optional, default false). Required field would force edits outside touches and weaken pins.
- Zero matchMedia in client/src today (indexShell.test.ts:2017 is a CSS fixture string in a test; styles.css:25 a comment).
- styles.css:21-31 header FORBIDS adding the @media reduced-motion HP-bar guard outside a battleView-touching slice. S7 must not touch CSS.
- motionPreference.ts is NOT coverage-excluded and CANNOT be added to vite.config.ts excludes (dom-shell-coverage-exclusion eval pins SANCTIONED_EXCLUDES) => module must be 100% unit-coverable without a real window.
- Sibling worktree m23-s3 live; S7‖S3 is spec-sanctioned disjoint. Keep any revert path-scoped.

## 1. motionPreference.ts design
```ts
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export interface MotionQuery { readonly matches: boolean; addEventListener(t:'change', l:(e:{readonly matches:boolean})=>void):void; removeEventListener(...):void }
export interface MatchMediaHost { matchMedia(query: string): MotionQuery }
export interface MotionPreference { readonly reduceMotion: boolean; dispose(): void }
export function createMotionPreference(mm: (q: string) => MotionQuery): MotionPreference   // fully injected; tests drive this
export function motionPreferenceFromWindow(host: MatchMediaHost = window): MotionPreference // THE one matchMedia line; S5 calls THIS
```
- Two functions, not one: purely-injected-only would satisfy A11Y-28 VACUOUSLY (zero occurrences) and force S5 to write window.matchMedia in main.ts (violating A11Y-28). motionPreferenceFromWindow is the S7→S5 cross-slice contract — state in module header.
- Impl ≈25 lines: closure, `let current = mql.matches`, one named onChange, dispose() idempotent via `disposed` flag. FromWindow body: `return createMotionPreference((q) => host.matchMedia(q));` (arrow, not .bind — Illegal-invocation footgun; test asserts receiver).
- dispose(): page-lifetime listener is not a leak; S5 NOT required to call it (say so in header).
- Refused: settings store, localStorage, injected-storage-host (ADR-0150 doesn't transfer), event emitter, legacy addListener fallback, framework.
- S5 consumption (documented, not written): `const motion = motionPreferenceFromWindow();` beside main.ts:236; `reduceMotion: motion.reduceMotion,` in the resolve literal at main.ts:2719.

## 2. Exact edits
interpolation.ts (purely additive, after line 60 before ADR-0090 banner at 62):
- `export interface AuthoritativeTile { readonly tileX: number; readonly tileY: number }` (NOT InterpSample — receivedAt would not typecheck; NOT a net/store import — purity).
- `export function interpolateReducedMotion(row: AuthoritativeTile): RenderPos { return { x: row.tileX, y: row.tileY }; }` — no rounding/clamping/floor.

renderResolver.ts — 4 hunks:
- H1 import: add `interpolateReducedMotion,` to existing named import (biome sort order).
- H2 ResolveInput: append optional field after line 55 with m23-s7 doc comment (injected exactly like `now`; optional+default false so main.ts:2719 and test literals stay byte-unchanged).
- H3 destructure line 68: `..., reduceMotion = false } = input;`
- H4a own path line 91: `if (reduceMotion || snapped || targetGapTiles > SNAP_DIVERGENCE_TILES) this.#ownClock.snapTo(tile, now);` — keep targetGapTiles computed unconditionally (AP13). Comment WHY per-frame snapTo is safe: snapTo sets origin=target=tile so positionAt is exactly tile for any startedAt (observationally inert); #target keeps tracking predicted so a later reduceMotion:false resumes a normal slide from the integer tile, no teleport.
- H4b remote path: RM arm FIRST, BEFORE the snapshots.length split:
  `if (reduceMotion) { pos = interpolateReducedMotion(c.row); } else if (c.snapshots.length > 0) {...unchanged} else {...unchanged}`
  Rationale: bypasses BOTH interp paths; `now` not referenced => "regardless of now" true by construction; sibling call sites stay byte-identical (clean desync-guard diff); no unused delay computed. Update comment at 102-106 to name the new arm (required doc, not boyscout).
- NO other edits: slideClock.ts, camera.ts, world.ts, net/store.ts, main.ts, vite.config.ts untouched.

## 3. Test list (cheats each kills)
renderResolver.test.ts — new section appended (never renumber existing; makeInput/makeChar UNTOUCHED — AP4; decoupled fixtures describe-local):
- T-a/b same scenario twice at mid-slide now: true→exact integer tile, false→toBeCloseTo(0.5), assert differ. Kills flag-ignored + inverted.
- T-c1 decoupled remote (row=(9,9), latest=(5,5), prev=(4,5), snapshots present), RM:true → (9,9) at now∈{0,500,100000}. Kills returning latest/prev/interp; proves now-independence.
- T-c2 same fixture, snapshots:[] (legacy arm) → (9,9). Kills one-arm-only fix.
- T-d own: predicted=(3,7), row=(9,9), RM:true → (3,7). Kills own-path-reads-row (THE desync-critical cheat).
- T-g1 makeInput({}) mid-slide → exactly 0.5 (byte-identical pre-S7 behavior). T-g2 explicit undefined ≡ absent.
- T-h1 true→false resumes sliding from integer tile (now=200 snap@tile1, predicted 2 → now=300 gives 1.5). T-h2 false→true jumps immediately (intended).
- T-i zone filter still applies under RM (own + remote absent when zone mismatches).
- T-j RM keeps own action/facing from predicted, remote from c.row.
interpolation.test.ts:
- T-k1 identity incl. negative tiles (kills clamp/round). T-k2 accepts full StoreCharacter-shaped object (structural proof). T-k3 frozen input, deep-equal on repeat, unmutated.
motionPreference.test.ts:
- T-e1 REDUCED_MOTION_QUERY === literal AND recorded query === it (AP2/AP3: gate the RECORDED argument, not source text).
- T-e2 fromWindow: recorded `this` === fakeHost (kills unbound extraction).
- T-f1 exactly one addEventListener('change'). T-f2 fire {matches:true} flips getter; init mirrors matches for both polarities. T-f3 dispose removes the IDENTICAL fn ref; double-dispose calls removeEventListener exactly once.
- T-scan (readFileSync; precedent predictor.test.ts:1998): (1) RAW-text: set of non-test client/src files containing `matchMedia` == exactly {render/motionPreference.ts}; (2) motionPreference.ts contains matchMedia AFTER comment-strip; (3) renderResolver.ts comment-stripped has no window/matchMedia/globalThis/document and no ./motionPreference import; (4) motionPreference.ts imports nothing from renderResolver/net/store/prediction; (5) interpolation.ts import list still exactly './config'.

A11Y-28 ruling: in-slice T-scan + ledger DEFER of the repo-wide eval to S10 (S5 lands before S10 and is the likeliest second matchMedia site; T-scan guards that window; no overlap with S10 touches; the -partial naming stops over-claim).

## 4. Ledger gates X1-X10 (drafts — see gates file for final CHECK/EXPECT)
X1 own-path A11Y-27 (T-d) · X2 remote-path A11Y-27 (T-c1) · X3 back-compat + numTotalTests >= baseline (T-g1) · X4 interpolateReducedMotion pure identity (T-k1) · X5 motionPreference seam (T-f3) · X6 A11Y-28-partial T-scan + DEFER→S10 · X7 A11Y-36a four evals GREEN via import-and-call (main-guard vacuity!) · X8 A11Y-36b byte-unmodified vs origin/master + non-empty-diff CONTROL · X9 client-typecheck + client-test both 0 · X10 touch-set containment via git diff --name-only ⊆ permitted set.
Vitest gates: --reporter=json --outputFile, assert exact fullName passed EXACTLY once + numFailedTests===0 + numPendingTests===0; never -t; measure fullName separator empirically first. All gates seeded with `EVIDENCE: pending`. No `||` in CHECKs.

## 5. Anti-patterns (named)
AP1 fixture monoculture (row≡latest in makeChar) · AP2 self-source needle · AP3 forgeable declaration pin · AP4 don't touch makeInput/makeChar · AP5 commit gates before bite-proofs; path-scoped reverts only · AP6 scan bare token matchMedia (closed form), not spellings · AP7 vacuous vitest gate (missing file = 0 tests, exit 0; -t marks pending) · AP8 don't pin "imported by nobody" (S5 must import it); pin "not imported by render/*" · AP9 no camera/CSS scope creep · AP10 no coverage-exclude · AP11 don't create S10's eval · AP12 optional field · AP13 don't restructure the pinned line-91 condition · AP14 no slideClock "cleanup" (same-tile early return in snapTo would alter predictor snap path).
Boyscout: ZERO hunks (netcode spine under mandatory desync-guard; JitterEstimator deletion is queued D-B out of scope; legacy interpolate arm is exactly what T-c2 exercises).

## 6. Risks + desync-guard focus
R1 own path reads c.row under RM (HIGH; T-d) · R2 required field (HIGH; X9) · R3 RM branch above zone continue/isOwn (T-i) · R4 reduceMotion stashed on store/predictor (T-scan c3 + guard) · R5 interpolation.ts impurity (T-scan c5 + T-k2) · R6 nightly coverage denominator (design fully injected) · R7 S5 writes window.matchMedia inline (contract header + fromWindow export) · R8 per-frame startedAt write noise (tile-invariance comment; T-h1) · R9 implementer "fixes" a red parity eval (X8) · R10 sibling worktree revert hazard.
desync-guard verbatim list: (1) own path reads only predicted for every RM value; (2) reduceMotion enters ONLY as ResolveInput field, no store/predictor/window imports; (3) three interp call sites byte-identical; (4) slideClock.ts absent from diff = else automatic block; (5) SNAP_DIVERGENCE_TILES/chebyshev/targetGapTiles unchanged, RM is added disjunct; (6) RenderEntity/reset/constructor unchanged; (7) interpolation.ts purely additive; (8) X7 green + X8 byte-unmodified; (9) nothing writes store/predictor, no performance.now; (10) main.ts + vite.config.ts absent from diff.

## 7. Task order
T1 interpolation (‖ T2 motionPreference) → T3 own-path (same file, serial) → T4 remote-path → T5 ledger + CHANGELOG-via-commit-messages + S5 contract header note. ADR: none (spec pre-decides; ADR trigger = interpolateReducedMotion un-pure-able → STOP + escalate, spec §9 falsifiable verdict iii).

## 8. Plan-review adjudication (3 lenses, 2026-08-24)

**Reviewer (5 findings, all accepted):**
- R-MAJ-1 T-h1's arithmetic was impossible (resolve() always calls positionAt with the SAME now as setTarget → the transition frame renders the origin). Corrected T-h1: f1 now=200 RM:true predicted=tile1 (seed+snap) → f2 now=300 RM:false predicted=tile2 (setTarget fires; same-frame output = 1, integer) → f3 now=400 → exactly 1.5.
- R-MIN-2 Optional-field PRIMARY justification is main.ts:2719 + spec §4 "S7 stays main.ts-free" (a required field is UNFIXABLE by S7, not merely churn-y). DECLARED SPEC DEVIATION for the PR body: §2.5 says "injected exactly the way `now` is" and `now` is required; `reduceMotion?` is optional-with-default-false; S5 may tighten to required once it sets the field at the sole call site.
- R-MIN-3 plan citation wording fixed (indexShell/styles.css hits are `prefers-reduced-motion` text, not matchMedia; matchMedia = 0 hits repo-wide).
- R-MIN-4 S10 handoff note: when evals/reduced-motion-purity.eval.mjs lands, it and the S7 T-scan intentionally enforce the same invariant — S10 may keep or thin the T-scan; divergence between them is a defect in one of them, not a conflict. (Goes in motionPreference.test.ts header + PR body.)
- R-MIN-5 desync-guard added as explicit gating step T6 (mandatory, blocks merge).

**Red-team (10 attacks; adjudication):**
- RT-1 CRITICAL ACCEPTED WITH CORRECTED FIXTURE. The clock-freeze cheat (own path `pos = tile` while RM, clock never updated) survives the planned list. Red-team's own 4-frame fix does NOT bite (a 2-tile lag triggers the >1 snap path → exact tile anyway — I re-derived it). The biting shape needs a lag of EXACTLY 1 tile: T-h3 = f1 RM:false predicted=(0,0) now=0 (seed) → f2 RM:true predicted=(1,0) now=200, expect exactly (1,0) → f3 RM:false predicted=(1,0) now=400, expect EXACTLY (1,0) — the cheat's stale clock does setTarget((1,0)) from frozen origin (0,0) and renders (0,0); the real design's tracked clock is a no-op at (1,0). f4 now=500 expect (1,0) steady (cheat gives 0.5). This is the slice's sharpest tooth; goes in the tester brief verbatim.
- RT-2 HIGH ACCEPTED: T-scan clause 3 token-ban grows {self, top, parent, frames} (comment-stripped); NEW clause: renderResolver.ts RAW-text `from '<spec>'` specifier SET === exactly {'../convert/convert','../net/store','./interpolation','./slideClock','./world'} (exact-set equality, fail-loud on decoys — the import-allowlist closes the class the token blacklist can't). motionPreference.ts import set === [] (leaf, zero imports). String-concat token-splitting (`'match'+'Media'`) inside an allowed file: DECLARED RESIDUAL in ledger with PoC (unclosable-blacklist precedent), compensated by desync-guard human review + S10's repo-wide eval.
- RT-3 ACCEPTED: T-c1/T-c2 fixtures self-assert decoupling (expect(row tile).not.toEqual(latest tile) etc.) before the resolve() assertion.
- RT-4 ACCEPTED: X8 uses three-dot `origin/master...HEAD` (merge-base) semantics.
- RT-5 ACCEPTED: X3 becomes a CONTENT ratchet — baseline of 63 passing fullNames captured pre-S7 to memory/projects/gates/m23-s7.baseline-fullnames.json; X3 asserts every baseline name still passing.
- RT-6 ACCEPTED: T-d gets a second decoupled data point with negative tiles.
- RT-7 ACCEPTED: CHANGELOG.md NOT in X10's allow-set (git-cliff owns it). ARCHITECTURE.md IS allowed (standard doc output).
- RT-8 PARTIAL: no cross-tree import of the evals stripper from a client test (module-resolution risk); tester writes a minimal local stripper + a fixture test proving it strips both comment kinds; renderResolver.ts has no string literals so the known stripper edge cases are inert; primary tooth is the exact-import-set clause (RT-2), token-ban is belt.
- RT-9 noted (git toplevel verify before mutations). RT-10 ACCEPTED (.test.ts exemption via endsWith, not substring).

**Simplify (adjudication):**
- CUT dispose() + T-f3: no consumer, no codebase precedent, page-lifetime listener by design; header documents "add teardown only when a teardown seam exists". X5 re-anchors to the query/change tests.
- SHRINK AuthoritativeTile → non-exported local interface (function stays the only new interpolation.ts export).
- CUT T-g2 (explicit-undefined indistinguishable from absent given pinned destructuring). MERGE T-k1+T-k2 (one fixture: full StoreCharacter-row-shaped, negative tiles, identity). KEEP T-k3 (frozen/unmutated).
- SHRINK X9 to client-typecheck only (client-test half duplicated by X1-X6 probes; full `just ci` still the pre-PR gate).
- Everything else KEEP as planned.

**Final test-tag contract (tester MUST embed these exact tokens in test titles, one test each):**
S7T-OWN-PRED (T-d + negative-tile point) · S7T-OWN-FREEZE (T-h3) · S7T-OWN-MIDSLIDE (T-a/b pair) · S7T-OWN-RESUME (T-h1 corrected) · S7T-OWN-JUMP (T-h2) · S7T-REM-ROW-HIST (T-c1) · S7T-REM-ROW-LEGACY (T-c2) · S7T-ZONE (T-i) · S7T-FACING (T-j) · S7T-BACKCOMPAT (T-g1) · S7T-IRM-IDENT (T-k merged) · S7T-IRM-PURE (T-k3) · S7T-MP-QUERY (T-e1+T-e2) · S7T-MP-CHANGE (T-f1+T-f2) · S7T-SCAN (five+ clauses incl. exact-import-sets).
