# 13r-f plan — Held-key warp continuation (nh5) — ADR-0192

Status: ADJUDICATED (planner output + plan-review round; AM1–AM10 below are BINDING and
win over conflicting text in the body).

## Adjudicated amendments (from reviewer a3b0ce1 + red-team acae3ee, 2026-08-14)

- **AM1 (red-team K1, KILL — dead-branch bypass):** W-NH5-WARP-PRESERVES additionally
  asserts the three seam statements (`const heldSnapshot = held.snapshot();`,
  `resetPredictionState();`, `held.restore(heldSnapshot);`) sit at the SAME brace-nesting
  depth as the unconditionally-reachable `zoneSyncFailureCount = 0;` statement in the
  switchZone region (compute depth in the stripped region; a tautological
  `if (rawMap.zone_id !== newZoneId) {...}` wrap was PoC'd to beat all four naive teeth
  while making resetPredictionState dead — worse than the defect). T6 gains mutant (h):
  the tautological dead-branch wrap, killed live by the depth check.
- **AM2 (red-team K2, KILL — self-fulfilling sim):** `ClientModel.rebuildPrediction('preserve')`
  MUST literally call `this.held.snapshot()` / `this.held.restore(...)`; the S12 block pins
  this with a source self-check (read the test file's own text, assert
  `this.held.snapshot(` and `this.held.restore(` appear in the method body; fail loud if
  absent). S12b/c/d therefore runtime-TypeError until T4 lands = the honest RED.
- **AM3 (reviewer MAJOR-1):** `rebuildPrediction(mode, at)` synchronously calls the sim's
  reconcile at its end (mirrors the state-based switchZone path main.ts:848-855, same call
  stack — stronger than microtask modeling). S12b/c/d carry a reconcile-count precondition
  assertion so an omitted chain reds loudly.
- **AM4 (reviewer MAJOR-2):** drop `readonly` on `ClientModel.predictor` (compile blocker
  for rebuildPrediction).
- **AM5 (red-team W1):** TWO wiring teeth start RED at T3: W-NH5-WARP-PRESERVES AND
  W-NH5-SEAM-COUNT (measured: `held.snapshot(`=0, `held.restore(`=0 today). Plan text
  "exactly one RED" is corrected; do NOT loosen SEAM-COUNT when it reds pre-impl.
- **AM6 (red-team W3):** unit-tooth discipline: U-W2 presses strictly BEFORE snapshot
  (nonzero press→warp gap, else re-stamp mutant invisible); U-W7 restores an EMPTY snapshot
  onto a NON-EMPTY held (proves replace-not-merge; empty-onto-empty is the known fixture
  blind spot); U-W5 alias probe perturbs via press()/release() AFTER snapshot(), never via
  clear() (clear reassigns, leaving an aliased array untouched — false negative).
- **AM7 (reviewer MINOR-1):** W-NH5-WARP-PRESERVES also asserts idx(`TileMap.fromRaw(`) <
  idx(snapshot stmt) — capture strictly after the throwing validation (AC-5 direct coverage).
- **AM8 (reviewer MINOR-2):** S12 scripts warps only after all prior sends are fully acked
  (sidesteps lastSentSeq/seedSeq fidelity in the sim); state this in the block comment.
- **AM9 (red-team W2):** ADR-0192 names the accepted EXTERNAL dependency: `onOwnWarp` fires
  synchronously inside character.onUpdate BEFORE ingestChar's batcher.schedule
  (connection.ts:249-268) — unpinned by any test, connection.ts outside touches → follow-up
  flag in PR + handoff (a connection.test.ts ordering pin).
- **AM10 (red-team W4):** the pre-existing exception-safety crack (`held.clear()` is 4th
  statement in resetPredictionState; a throw in the first three skips it on the reconnect
  arm) is NAMED in ADR-0192 residuals, NOT fixed (slice directive: do not touch the
  reconnect arm / shared body). Follow-up flag.
- Comment-mass margin is thin (whole-file anti-collapse guard passes by 1.25% today) —
  seam comments ≤2 lines, reasoning goes in the ADR (reaffirms anti-pattern #10). Branch `feat/13r-f-held-key-warp-continuation`,
worktree `.claude/worktrees/13r-f`, base master 1d68c33. ADR number 192 (supervisor-assigned).
Slice source: M-postgate-thirteenth-review-residuals.spec.md §13r-f. Quality tier HARD.

## Defect (verified against code)

`held.clear()` at `client/src/main.ts:766` inside the shared `resetPredictionState()`
(main.ts:757-783), called from BOTH `switchZone` (warp arm, main.ts:808) and `onReconnect`
(main.ts:2584). Keydown ignores `e.repeat` (main.ts:1053) and `held.press` only runs on
non-repeat keydown (main.ts:1412) → movement halts dead at every zone boundary crossed while
holding a key, until release+re-press.

ADR-0152 "Per-path invariant" section (0152:87-93): warp path — rebuild is followed in the
SAME microtask flush by a reconcile (residual #1 closed by flush ordering); reconnect path —
reconcile DEFERRED, `held.clear()` ALONE guards the gap → reconnect arm MUST NOT change.

## Design (accepted candidate + planner tightenings)

**heldKeys.ts:** add pure seam
- `interface HeldEntry { readonly dir; readonly pressedAtMs }` (NOT exported)
- `export type HeldSnapshot = readonly HeldEntry[]` (signature only)
- `snapshot(): HeldSnapshot` → entry-copying (`this.#stack.map(e => ({...e}))`) — aliasing
  unwriteable by construction
- `restore(snap): void` → REPLACE not merge, copy-in (`snap.map(e => ({...e}))`), never
  re-stamps. Replace is safe: capture+restore in one synchronous block, no await → no
  keyup can interleave (synchrony argument goes in ADR-0192).
- Amend heldKeys.ts:78 comment ("timestamp never leaves the class" → now leaves only as an
  opaque capture handed back verbatim) — doc-SSOT repair.
- REJECTED: branded snapshot type (YAGNI; mutant double-killed by wiring teeth; sealed-import
  tooth W-MVI-HELDKEYS-IMPORT-SEALED at main.wiring.test.ts:2942 blocks a second import
  anyway). Record rejection in ADR.

**main.ts (switchZone ONLY, bracketing line 808):**
```
const heldSnapshot = held.snapshot();
resetPredictionState();
held.restore(heldSnapshot);
```
- After the throwing calls → catch path unchanged by construction (failed switch never
  captures/restores).
- `resetPredictionState()` body + `onReconnect` stay byte-identical.
- main.ts must NEVER name the snapshot type (sealed-import tooth) — use inference.
- REJECTED: flag param on resetPredictionState; a resetPredictionStatePreservingHold()
  helper (both manufacture the reconnect-misuse path).
- Comments ≤2 lines at the seam (comment-mass guards).

## Ordered tasks

T1 RED unit (heldKeys.test.ts `[13r-f]` block U-W1…U-W8) → run, capture RED.
T2 RED behavioral (movementSim.test.ts S12 block + ClientModel.rebuildPrediction('clear'|'preserve')
   modeling BOTH policies) → S12a GREEN (defect reproduced), S12b/c/d RED = honest RED proof.
T3 RED wiring (main.wiring.test.ts W-NH5-* teeth) → exactly W-NH5-WARP-PRESERVES RED.
T4 implement heldKeys snapshot/restore + :78 doc repair → unit green.
T5 implement switchZone wiring → all green; typecheck.
T6 mutation bite-proofs (orchestrator runs ≥6 mutants live): (a) delete restore; (b) swap
   capture/restore order; (c) restore w/ fresh stamps; (d) move pair into resetPredictionState;
   (e) add pair to onReconnect; (f) snapshot returns alias; (g) restore merges. Each killed by
   a NAMED tooth → table into ADR.
T7 ADR-0192 (see below). T8 0152 back-link `Amended-by: ADR-0192` + `just adr-digest`
   (CI reciprocity gate, scripts/adr-digest.mjs:509-565 — REQUIRED, list in touches-delta).
T9 full `just ci` (PATH export per toolchain memory).

## Test matrix (tester authors from EARS; all in declared touches)

heldKeys.test.ts: U-W1 round-trip survives; U-W2 original stamp preserved (boundary ±1ms at
HOLD_COMMIT_MS — kills re-stamp AND pressedAtMs:0); U-W3 mid-tap stays uncommitted across
warp; U-W4 stack order + buried-key stamp; U-W5 snapshot-alias + merge kills; U-W6 stale-stamp
resurrection (release-after-restore then re-press); U-W7 empty/idempotent restore; U-W8
fast-check property (restore∘snapshot observationally identical for active/isHeld/committedActive).

movementSim.test.ts: S12a defect repro under 'clear' (GREEN today); S12b survival under
'preserve' ≥2 tiles, no keydown post-rebuild (RED today); S12c first continuation within one
frame of rebuild+reconcile, NOT HOLD_COMMIT_MS later; S12d 50ms-held key stays uncommitted
until ORIGINAL press ages 150ms; S12e (optional) 'clear' + deferred reconcile → zero intents
in gap (behavioral statement of reconnect load-bearing clear).

main.wiring.test.ts (reuse readMainTs/expectUniqueAnchor/bodyRegion/countOccurrences; comment-
stripped regions; NO dynamic RegExp — Semgrep):
- W-NH5-WARP-PRESERVES (RED today): switchZone region; anti-vacuity needles
  (`resetPredictionState();` + `set_active_zone(`); whole-statement needles
  `const heldSnapshot = held.snapshot();` and contiguous `held.restore(heldSnapshot);`
  (pins arg to captured const = fresh-stamp kill); ordering idx checks;
  `countOccurrences(region,'held.') === 2`.
- W-NH5-RECONNECT-CLEARS: onReconnect region (anchors `onReconnect: () => {` →
  `onOwnWarp: (newZoneId) => {`); anti-vacuity (`resetPredictionState();` + `renameView?.hide();`);
  stripped-region `countOccurrences('held.') === 0`; failure msg cites ADR-0152 per-path invariant.
- W-NH5-RESET-BODY-UNCHANGED: resetPredictionState region — exactly one `held.clear();`, zero
  snapshot/restore; unique anchor `function resetPredictionState(): void {` (param add reds);
  `resetPredictionState();` ×2 AND `resetPredictionState(` ×3 stripped (no argful call site).
- W-NH5-SEAM-COUNT: whole stripped main.ts — `held.snapshot(` ×1, `held.restore(` ×1.
Existing teeth that must stay green untouched: W-NH3-FLOOR-SEED/SEND, W-M20C-SETZONE,
W-MVI-HELD-ARGLESS, W-MVI-HELDKEYS-IMPORT-SEALED, W-MVI-COMMITTED-WIRED,
evals/hold-commit-step-budget.eval.mjs (never write literal `export const HOLD_COMMIT_MS = `
in a comment — duplicate needle → eval null-fail).

## EARS

AC-1 WHEN switchZone completes a zone change, held directions survive with same stack order
and ORIGINAL press timestamps.
AC-2 WHILE a dir has been held ≥ HOLD_COMMIT_MS at warp, first post-warp frame with
outstandingSteps===0 and no overlay SHALL emit its continuation Step, no keydown needed.
AC-3 WHILE held < HOLD_COMMIT_MS at warp, no continuation until ORIGINAL press ages
HOLD_COMMIT_MS.
AC-4 WHEN onReconnect runs, held SHALL be cleared; reconnect arm contains no capture/restore.
AC-5 WHERE nothing held OR map validation throws, held state after switchZone identical to before.

## Anti-patterns (named)

(1) re-press with fresh stamps → 150ms halt survives; (2) flag param / module-let on
resetPredictionState; (3) preserving helper fn (attractive reconnect misuse); (4) snapshot by
reference; (5) merge restore; (6) ADR-0158 weakening (stamp reader export / threshold drop);
(7) touching onReconnect "for symmetry"; (8) naming snapshot type in main.ts; (9) literal
`export const HOLD_COMMIT_MS = ` in a new comment (eval duplicate-needle null); (10) comment-
heavy hunks (stripped>raw/2 collapse guards); (11) silently adding e2e (outside touches — PARK).

## Hidden deps / decisions

1. ADR-0152:8 `**Amended-by:** ADR-0192` + DIGEST.md regen — CI-mandated by the declared
   `Amends: ADR-0152` deliverable; 13r-a precedent (0190→0180 same shape). DO + touches-delta.
2. ADR filename: 4-digit `0192-held-key-warp-continuation.md` (repo convention + digest parser).
3. predictor.ts:377-393 residual note becomes a stale pointer ("must revisit" → revisited by
   ADR-0192). OUTSIDE touches → leave; follow-up flag in PR + handoff.
4. Hold-through-warp e2e now non-vacuous but e2e/* outside touches → PARK; script sketch into
   ADR-0192 §Parked. S12b + movement-input.spec.ts cover behavior.

## Risks → desync-guard review questions

R1 residual #1 re-open: confirm no rAF frame can interleave between switchZone and same-flush
reconcile on BOTH warp entry points (onOwnWarp main.ts:2629; state-based main.ts:848).
R2 pre-reconcile continuation is a legal monotonic intent (seedSeq floor) — not desync.
R3 smoothness: one tile per STEP_MS in S12b trace, no double-advance (ADR-0013/0141).
R4 warp ping-pong: server clears move queue across boundary; held dir can't insta-re-warp.
R5 ADR-0158 regression (free re-commit or 150ms halt) — U-W2/3, S12c/d.
R6 reconnect drift by copy-paste — W-NH5-RECONNECT-CLEARS + failure msg citing 0152.
R7 source-scan vacuity — unique anchors, stripped regions, anti-vacuity bails, live T6 run.

## ADR-0192 must contain

Revised warp-path per-path-invariant argument (continuation may emit first post-warp frame;
same-flush reconcile still lands first; dependency: every zone change accompanied by a
character-row batch in the same turn) · why reconnect untouched (0152:93 verbatim + tooth) ·
considered alternatives (flag param, helper, brand, merge) · synchrony/replace argument ·
proof-of-teeth table (T6) · §Parked e2e sketch.
