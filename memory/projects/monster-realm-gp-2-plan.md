# gp-2 plan — a connected pad plays the game (the operator's menu flow, pad only)

Slice: `specs/monster-realm-v2/M-gamepad.spec.md` §gp-2 (feature, hard, client-only, no schema).
Branch `slice/gp-2`, worktree `.claude/worktrees/gp-2`, base origin/master ee884bda (gp-1 #864).
Builds on gp-1's `client/src/input/{gamepadSource,padBindings,stick}.ts` (pure, unwired). gp-1 notes
n1 (capture semantics) and n2 (constructor `(getPads, bindings, { onError })`, onError once per
source lifetime, a throw or malformed pad reads as no pads and releases every owed edge; within one
poll: queued capture ups, vanished-pad ups, each present pad's buttons index-ascending, then its
stick, old direction's up before the new one's down) read.

## What changes (functional core / imperative shell)

No new logic module: gp-1 built the core (`GamepadSource`); this slice is shell wiring only.

### `client/src/shell/inputState.ts` (the live input devices)

1. `export const pad = new GamepadSource(() => navigator.getGamepads?.() ?? [], PAD_DEFAULT_BINDINGS,
   { onError: (err) => pushError('uncaught', err) })`. `getPads` is read lazily at each poll, so
   importing the module still touches no browser API (the inputState-alone suite's "import registers
   nothing, writes nothing" stays true). A browser without the API (or an insecure context, where
   Chromium hides it) reads as no pads; one that throws reads as no pads and lands in the error ring
   once (the source's own once-per-lifetime latch).
2. `releaseAllInput` also calls `pad.releaseAll()` (keyboard, pad, router, navHeld, held).
3. Module header comment names the pad among the devices.

### `client/src/main.ts` (wiring only)

4. `pressEdges(edges: readonly ButtonEdge[]): boolean` beside `pointerPress`: false (and nothing
   routed) while `sessionGateBlocks()`; else `syncStack()`, `routeEdge` per edge in order,
   `syncStack()` in `finally`; true. `pointerPress(button)` becomes
   `if (!pressEdges([{button, down:true},{button, down:false}])) return; paintWorldPrompt?.();`
   (same behaviour: gate check, sync both sides, down then up, the paint after and never under the
   terminal).
5. `pollPad()` at module scope, called as the FIRST statement of `frame()`'s `try` (before the
   frame's `syncStack()`, the session-gate early return and `inputRouter.tick`):
   - `const { edges, accels } = pad.poll();`
   - gate blocks → `releaseAllInput()`; return (the poll's edges and accels are discarded; the pad
     latches everything held, so a button held through the terminal acts only after release and a
     fresh press — gp-2.5).
   - nothing polled → return.
   - focus outside the game screen (`outsideGameScreen(document.activeElement, gameScreenEl())`,
     the keydown's own guard) → route only the poll's UP edges (`pressEdges(edges.filter(e => !e.down))`
     when non-empty), drop every down edge and every accel; return. A release still routes, as a
     keyup does (keyup has no focus guard), so a walk started inside never sticks when focus leaves.
     Known edge: a down dropped here owes the source an up that later reaches the router unmatched;
     the router swallows an unmatched up at count 0, and at count > 0 (another source holds the
     same direction) it ends that holder's walk early — never starts or prolongs one. Accepted (LOW).
   - any press (a down edge or an accel) → `pointerSource?.keyPressed()` (the hover mark goes, as a
     keydown's does) and the keydown's focus heal (`if (focusInsideHiddenSubtree()) worldCanvasEl?.focus();`).
   - `pressEdges(edges)` when non-empty; then each accel: `syncStack(); try { runAccel(a) } finally { syncStack() }`.
   - No typing/ownership branch: inside the game screen a pad press is a button press even with a
     text field focused (`decision-defaulted:pad-focus=same-guards-as-keys`; a pad cannot type).
6. Nothing else in main.ts moves. `blur` / hidden `visibilitychange` already call `releaseAllInput`,
   which now latches the pad too (gp-2.3).

### Behaviour change to call out (keyboard)

`releaseAllInput()` on every gated frame also lets go of a KEY held through the session terminal:
after the terminal lifts, a key held from before it no longer resumes walking until re-pressed (its
OS repeats are `e.repeat` and ignored). The spec mandates `releaseAllInput()` here; this is the same
rule gp-2.5 states for the pad. Recorded in the PR body; any existing test asserting a held key
resumes after the gate would surface in the first client run.

## Error report: `pushError`, not `reportError` (plan-delta)

The spec's wiring bullet says "reported once through `reportError`". `reportError(kind: SinkKind,
text)` needs a `MessageKind` and a player-facing catalog string: a new kind in
`ui/feedbackPolicy.ts` plus `messageIds.ts`, `catalog.en.ts`, `catalog.fr.ts` and the
`catalog.test.ts` roster, none in `touches:`, and `main.ts`'s i18n roster is pinned. A throwing
`getGamepads` is an unexpected platform fault, not a player outcome: it goes to the error ring
(`pushError('uncaught', err)`), the path the frame loop's own catch and `reportError` itself end in
(F9 bundle + the error overlay). gp-2.6's EARS ("reported once, not once per frame") is met. Spec
note filed for the supervisor.

## Tests (tester writes ALL test-side files; implementer never edits them)

Tags: each gating test title ends with `[gp-2.N]`.

- `client/src/main.input.test.ts` — a new `describe('main.ts gamepad (runtime, gp-2)')` block at the
  end, on the file's own boot harness; a fake standard pad installed per test as
  `navigator.getGamepads` (Object.defineProperty, configurable, removed in afterEach), mutated in
  place between `frame(t)` calls (as browsers may reuse snapshots). gp-2.1–2.7.
- `client/src/shell/inputState.test.ts` — `releaseAllInput` releases the pad source once
  (spy/behaviour), the module builds `pad` without calling `navigator.getGamepads` at import, and a
  `pad.poll()` over an absent/throwing API yields no edges with one error-ring record. gp-2.3 / 2.6.
- `client/e2e/pad.ts` (new) — `installFakePad(target: Page | BrowserContext)` (addInitScript: one
  standard-mapping pad, 17 buttons, 4 axes, in `window.__mrFakePad`, mutated in place; defines
  `navigator.getGamepads`), `padPress(page, index)` (down, 2 rAF, up, 2 rAF), `padHold(page, index,
  ms)`; imports only pure modules (loads under Playwright without Vite).
- `client/e2e/controls.ts` — `setPressSource(page, 'keys' | 'pad')` (per-page, default keys);
  `pressButton` / `pressAccel` in pad mode press `PAD_DEFAULT_BINDINGS`'s first index for the
  button/accel (UnboundKeyError when none); `closeAll` presses Start through `pressButton`.
- `client/e2e/pad-menu-flow.spec.ts` (new) — mirror of `menu-flow.spec.ts` press by press under
  `setPressSource(page, 'pad')`, pad installed before `goto`. gp-2.8.

## Gates

gp-2.1–2.7: vitest JSON over `main.input.test.ts` + `inputState.test.ts`, count of passed tests whose
title ends with the tag, exact count fixed after the tester returns (gp-1's CHECK shape).
gp-2.8: Playwright JSON over `e2e/pad-menu-flow.spec.ts --project=default` against a live spacetime
(the lpw-6 shape); run after `just ci`, against a sibling-safe server started with the pinned CLI.

## Out / follow-ups (notes, not this slice)

- Controls capture with a pad press (a pad B while a slot waits ends the capture through the
  screen's B): gp-5's capture hand-off.
- ARCHITECTURE.md's `shell/inputState.ts` paragraph does not yet name the pad source: outside
  `touches:`; spec note for the supervisor.
- Last-used source / glyphs: gp-4. Hold edge: gp-6.

## Order

1. Plan review (reviewer + red-team, parallel). 2. Tester (opus) writes every test-side file;
orchestrator red-runs each gate against the unwired tree. 3. Implement inputState.ts + main.ts.
4. Targeted vitest; full client suite. 5. Lens batch (reviewer, red-team, verifier; desync-guard
and reducer-security-auditor are N/A: no game-core, no reducer). 6. `just ci`; e2e gate;
`mr-gates check`. 7. PR.

## Plan review outcome (reviewer + red-team, 2026-11-22) — overrides the body above

Adopted:
- R1 (reviewer M1, shell layering `docs/DECISIONS.md` "A shell module imports only the shell modules
  below it"; `docs/refactors/client-shell.md` puts inputState below feedback): inputState does NOT
  import shell/feedback. It holds a fault-sink port: `let padFault: (err: unknown) => void =
  (err) => console.error('[pad]', err)`; `export function installPadFaultSink(sink)`; the pad's
  `onError` calls `padFault(err)` (read at call time). `main.ts` installs, at module scope beside
  `installHintHost`: `(err) => pushError('uncaught', \`gamepad: ${normalizeError('uncaught', err).message}\`)`
  (the `frame: ` / `interact: ` tag idiom).
- R2 (red-team #1): `releaseAllInput` reads the pad once (`pad.poll()`, discarded) before
  `pad.releaseAll()`, so a press made after the last frame's poll but held at a blur/hide is latched.
- R3 (both, m3/#2): `pressEdges` routes every edge in its own try; the first error is rethrown after
  the loop, inside the trailing `syncStack()`'s `finally`. pointerPress gains the same (its up routes
  after a throwing down).
- R4 (reviewer m5): `pollPad()` runs right after the frame's first `syncStack()` (still before
  `tickToast`'s neighbours that matter: the session-gate early return and `inputRouter.tick`), so its
  guards read a synced stack as a keydown's do. plan-delta vs the spec's "FIRST in the frame".
- R5 (reviewer m4; gp-5's target rule): while Controls waits for a key (`controlsCapture() !== null`),
  pad presses are dropped like focus-outside (releases still route). plan-delta.
- R6 (red-team #8, reviewer simplify): accelerators run after the edges, once, in ONE sync pair,
  after re-checking the gate.
- R7 (reviewer M2): the gp-2.8 Playwright CHECK runs `pad-menu-flow.spec.ts`, `menu-flow.spec.ts`
  and `controls.spec.ts` together (the spec's "menu-flow.spec.ts still green"; controls.ts changes).
- R8 (reviewer m1): the keyboard "behaviour change" is not visible in play (the gate lifts only on
  `onApplied`, whose `onReconnect` already clears `held`); what changes is that a keyup under the
  gate is a no-op and a held key's repeats after it are not prevented. PR wording fixed.

pollPad, final:
```
const { edges, accels } = pad.poll();
if (sessionGateBlocks()) { releaseAllInput(); return; }
if (edges.length === 0 && accels.length === 0) return;
const presses = !outsideGameScreen(document.activeElement, gameScreenEl()) && controlsCapture() === null;
const routed = presses ? edges : edges.filter((e) => !e.down);
if (presses && (accels.length > 0 || edges.some((e) => e.down))) {
  pointerSource?.keyPressed();
  if (focusInsideHiddenSubtree()) worldCanvasEl?.focus();
}
if (routed.length > 0) pressEdges(routed);
if (presses && accels.length > 0 && !sessionGateBlocks()) { syncStack(); try { for (a of accels) runAccel(a); } finally { syncStack(); } }
```

Rejected / accepted risks:
- A per-button "dropped press" ledger (red-team #6): rejected (reviewer m2): it must be reset on every
  path that makes the source owe nothing (releaseAll, rebind in gp-5), or it swallows a real release
  and the walk never stops (fails unsafe). The unmatched release it would prevent can only END
  another holder's walk early (router swallows at count 0, decrements above), never start or
  prolong one. Accepted LOW; plan-delta.
- Transient getGamepads throw / pad vanishing one frame → release + fresh press (red-team #3/#4):
  gp-1's specified semantics (gp-1.10, n2); accepted, PR risks.
- Text field focused inside the game screen: the pad still acts (spec decision pad-focus).
- Trigger chatter near the browser's pressed threshold (red-team #10), a pad still read while the
  window is visible but unfocused (reviewer n2), the waking press acting (red-team #11): flagged for
  the operator's real-pad pass.
- ARCHITECTURE.md's inputState paragraph (no pad; releaseAllInput also on every gated frame):
  follow-up residual at close (reviewer n3).
