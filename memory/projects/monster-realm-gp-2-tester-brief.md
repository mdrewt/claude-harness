# gp-2 tester brief — the pad wired into live play

You write the gating tests (TDD red phase) for slice gp-2. You do NOT implement the feature and you
have no shell: the orchestrator runs every test and proves each fails on the unwired tree.

Worktree (write ONLY here): `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/gp-2/`

## Read first

- Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-gamepad.spec.md` —
  `## Decisions` (esp. `pad-focus=same-guards-as-keys`), `## Notes` ("Mocked Gamepad API (e2e)"),
  `### gp-1` (the source's contract) and `### gp-2` (the EARS criteria gp-2.1–gp-2.8 you encode).
- Plan: `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-gp-2-plan.md`
  (the "Plan review outcome" section at its end overrides the body where they differ).
- As-built pad source: `client/src/input/gamepadSource.ts`, `client/src/input/padBindings.ts`.
- The suites you extend and their harness: `client/src/main.input.test.ts` (its header, `H`, the mocks,
  `bootReady`, `seedWorld`, `fire`, `settle`, `dirs`, `committedHold`, and the CTL2-3-BOOT-SESSION
  case near line 1680), `client/src/shell/inputState.test.ts`, `client/test-util/mainBootHarness.ts`
  (`frame(t)`, `clock`, `raf`).
- e2e: `client/e2e/controls.ts` (lines 1–115), `client/e2e/menu-flow.spec.ts` (whole).
- Standards: `~/.claude/harness/standards/testing-tdd.md` (behaviour tests; no source-text scans; no
  checks of checks).

## Files you write (and only these)

1. `client/src/main.input.test.ts` — append ONE new `describe('main.ts gamepad (runtime, gp-2)', { sequential: true }, …)`
   block at the end, on the file's own harness and mocks. Do not edit existing tests.
2. `client/src/shell/inputState.test.ts` — add cases (new `it`s in the existing describes or one new
   describe). Do not edit existing tests.
3. `client/e2e/pad.ts` (new) — the mocked Gamepad API helpers (contract below).
4. `client/e2e/controls.ts` — add `setPressSource`; pad mode in `pressButton` / `pressAccel`;
   `closeAll` presses Start through `pressButton` (contract below). Keyboard mode must behave exactly
   as today (`controls.spec.ts` must stay green, including its closeAll error-message assertions).
5. `client/e2e/pad-menu-flow.spec.ts` (new) — the mirror of `menu-flow.spec.ts`.

## Contracts (production names the implementer will provide)

### `client/src/shell/inputState.ts`
- `export const pad: GamepadSource` — `new GamepadSource(() => navigator.getGamepads?.() ?? [],
  PAD_DEFAULT_BINDINGS, { onError })`. `navigator.getGamepads` is looked up at EACH poll (never at
  import, never captured): a stub installed after the module is imported is the one read.
- `export function installPadFaultSink(sink: (err: unknown) => void): void` — where a Gamepad API
  fault goes. inputState imports NO shell module (the shell layering rule), so until a sink is
  installed the fault goes to `console.error('[pad]', err)`. The pad's `onError` calls the sink
  current at the moment of the fault. The source calls `onError` at most once per lifetime.
- Booted (main.ts installs the sink at module scope): the fault lands in the error ring as
  `pushError('uncaught', \`gamepad: ${message}\`)`, so after any number of throwing polls
  `errorRing.snapshot()` (import `errorRing` from `./shell/feedback` in the same registry) holds
  exactly ONE record with `source === 'uncaught'` whose `message` starts `gamepad: ` and contains the
  thrown Error's message.
- `releaseAllInput()` — `keyboard.releaseAll()`, then reads the pad once (`pad.poll()`, result
  discarded) and `pad.releaseAll()`, then `inputRouter.releaseAll()`, `navHeld.clear()`,
  `held.clear()`. The read-before-latch means a pad button pressed after the last frame's poll but
  held at the release is latched too.
- No dropped-press ledger (rejected at plan review: an unmatched pad release can only end another
  holder's walk early, never start or prolong one — do not test for a ledger).

### `client/src/main.ts` (wiring only; it exports nothing new)
- Each animation frame reads the pad right after its first stack sync, before the session-gate
  early return and before `inputRouter.tick`.
- Session gate blocks → the poll's edges and accelerators are discarded and `releaseAllInput()`
  runs (every gated frame). So a pad button held from before the gate, or pressed during it, acts
  only after release and a fresh press once the gate lifts.
- Focus on an element outside `#game-screen` (not `<body>`/`<html>`; the keydown's
  `outsideGameScreen(document.activeElement, …)`) → no pad press acts: its down edges and its
  accelerators are dropped; its releases (up edges) still route, as a keyup does. The SAME drop
  applies while Options > Controls waits for a key (a slot capture is armed): pad presses are
  ignored there (gp-5's rule, adopted now), releases still route.
- A pad press (a down edge or an accelerator) that is not dropped: clears the pointer's hover mark
  (`PointerSource.keyPressed()`: the `#game-screen` element loses its hover class) and heals stale
  focus (focus inside a `display:none` subtree → the world canvas), then routes.
- Edges route through one `pressEdges(edges)` shared with `pointerPress` (gate check; stack synced
  before and after; `routeEdge` per edge in poll order; an edge whose routing throws does not stop
  the poll's later edges from routing, and the first error is rethrown after them).
- Then the poll's accelerators go to `runAccel` (the keyboard accelerator path: open its menu path,
  or Start on its own screen), the gate re-checked, the stack synced on both sides: edges first,
  accelerators after, within one poll (an order test is optional, not required).
- Inside the game screen a pad press is a button press even with a text field focused (no typing /
  ownership branch).
- `pointerPress` behaves exactly as today (dead while gated, down then up, the world prompt painted
  after the press, never under the terminal).

### Pad default table (gp-1, `PAD_DEFAULT_BINDINGS`)
A 0, B 1, X 2, Y 3, LB 4, RB 5, LT 6 → accel `V` (Monsters on Party), RT 7 → accel `I` (Bag),
Select 8, Start 9, Up 12, Down 13, Left 14, Right 15; 16 reserved. Left stick axes 0/1 (`y < 0` is Up),
enter 0.5, exit 0.35; only a `mapping: 'standard'` pad's stick is read.

## Unit fake pad (happy-dom)

Install per test: `Object.defineProperty(navigator, 'getGamepads', { value: () => [fakePad, null, null, null], configurable: true, writable: true })`;
remove it in `afterEach` (`delete (navigator as any).getGamepads` — confirm happy-dom has no own
native one to restore; if it does, restore it). `fakePad = { index: 0, id: 'fake standard pad',
connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
axes: [0, 0, 0, 0] }`, MUTATED IN PLACE between `frame(t)` calls (`fakePad.buttons[12].pressed = true`),
as browsers may reuse one snapshot object. Drive frames with the harness `frame(t)` (each call runs
one rAF callback at clock t). Absent API: no property. Throwing API: `value: () => { throw new Error('gp2-pad-boom') }`.

## Gates and tags

Every gating test title ENDS with its tag, exactly `[gp-2.N]` (one tag per test). The orchestrator's
CHECK counts passed tests by tag, so tell me the final count per tag in your report.

- **gp-2.1** (main.input.test.ts, ≥ 4 tests): at the bare world, no frame open — a D-pad press sends
  exactly what the bound key sends (a `Face`, then the held-keys continuation `Step`s once
  hold-committed, for as many frames as it is held, stopping at the release); the left stick pushed
  past enter does the same; D-pad + stick of one direction (and key + pad of one direction) are one
  walk that ends only when the LAST holder lets go; a pad press of a direction the character already
  faces steps (Face of the faced direction). Assert exact intent lists via `dirs()` / `H.sends`,
  never only "held".
- **gp-2.2** (≥ 2): with the main menu on top (and, separately, a nav-capable screen on top), a pad
  Down held past 350 ms moves the cursor by the router's auto-repeat as a held key does — exact
  cursor positions/counts at chosen clock times (first repeat at 350 ms, then every 100 ms), and no
  further repeat after the release.
- **gp-2.3** (≥ 3): a pad direction walking at the world, then window `blur` (and separately a
  `visibilitychange` to hidden) → no further `Step`, the held set empty; frames with the direction
  STILL held send nothing; release then press again → exactly one new `Face` and the walk resumes.
  Include the race: the pad press lands AFTER the last frame's poll and BEFORE the blur (no frame
  between) → still latched (no walk on the next frames). inputState.test.ts: `releaseAllInput`
  latches a held pad button (a following poll emits nothing for it; its release emits nothing; a
  re-press emits one down).
- **gp-2.4** (≥ 3): LT (6) down at the world opens Monsters on its Party tab with the main menu
  beneath it, exactly as the `V` key does (same stack); LT on that screen acts as Start (as `V`
  does there); RT (7) opens the Bag as `I` does. Compare the pad's resulting stack to the key's in
  the same test where feasible.
- **gp-2.5** (≥ 3): while `H.sessionState` blocks (e.g. `'expired'`): a pad press sends nothing and
  opens nothing, an LT press opens nothing; a direction held from BEFORE the gate, still held when
  the gate lifts → no `Face`/`Step` on any later frame until released and pressed again (then one
  `Face`); a direction first pressed during the 2nd or later gated frame and held through the lift
  → same (kills "release once at gate onset" and "skip the poll while gated"). A KEY held through
  the gate also does not resume walking after the lift (the plan's called-out behaviour change).
- **gp-2.6** (≥ 3, main.input + inputState): `navigator.getGamepads` absent → frames run, a key
  walks, a pointer press still acts; returns `[]` / `[null, null, null, null]` → same; throws on
  every call → the keyboard still walks over ≥ 5 frames, the frame re-arms each time, and the error
  ring holds exactly one `uncaught` record whose message starts `gamepad: ` and carries the thrown
  message; throw, recover (a working pad press acts), throw again → still exactly one record.
  inputState.test.ts: importing the module does not call `navigator.getGamepads` (a counting stub
  installed before import reads 0 calls — fold it into the existing import-inertness test as one
  more spy if that is cleaner, but then tag a separate small test for the gate count);
  `pad.poll()` with the API absent returns `{ edges: [], accels: [] }`; a throwing API with a sink
  installed via `installPadFaultSink(spy)` calls the spy exactly once over several polls, with the
  thrown error; with no sink installed the fault goes to `console.error` once (spy it).
- **gp-2.7** (≥ 3): focus on a focusable element appended OUTSIDE `#game-screen` → a pad D-pad
  press sends nothing, a pad A opens nothing, an LT opens nothing; a walk started inside, then focus
  moves outside, then the pad releases → the walk stops (the release routed); focus on `<body>` →
  the pad acts (control); a text field focused INSIDE the game screen → a pad press still acts
  (the decision); a pad press with focus stranded in a hidden subtree → focus moves to the world
  canvas, and the hover class is removed from `#game-screen`. Plus (same tag, the adopted gp-5
  rule): with Options > Controls waiting for a key (main.remap.test.ts / main.controls.test.ts show
  how a capture is armed), a pad B, Start and LT change nothing (the capture still waits, the stack
  unchanged, no toast).
- **gp-2.8** (pad-menu-flow.spec.ts): ONE Playwright test whose title starts
  `GP2-8-PAD-MENU-FLOW:` and ends `[gp-2.8]`, mirroring `menu-flow.spec.ts`'s single test press by
  press and assertion by assertion, with `setPressSource(page, 'pad')` and the fake pad installed on
  the context before the first `goto`. Keep its seeding, setup walk (`faceTile` uses the DEV
  `__game().step`, not a press), and every assertion; change only the press source and the
  identifiers/titles (`describe.serial('gp-2.8 — the operator`s menu flow, pad only', …)`). The final
  Up must walk one tile North. The gate runs this spec together with `menu-flow.spec.ts` and
  `controls.spec.ts` (both import controls.ts), so keyboard mode must stay byte-for-byte the same.

Also keep (not tagged; regression): `pointerPress` still works (a click still acts) — the existing
pointer suites cover it; do not duplicate.

## Wrong implementations your tests must kill (from the plan red-team)

Poll skipped while gated; `releaseAllInput` once at gate onset instead of every gated frame;
`releaseAllInput` before the poll in the gated branch; blur without `pad.releaseAll()`; blur
without the read-before-latch (press after the last poll, before blur); ups dropped when focus is
outside (walk sticks); `<body>` treated as outside; downs routed when outside; accels not dropped
outside; no heal / no hover clear; `navigator.getGamepads` captured at import (`.bind` at module
scope); the error reported once per frame, or also through the frame's catch; an edge whose routing
throws dropping the poll's later up (walk sticks) — e.g. a screen adapter swapped through
`H.adapters` that throws on the first edge, with a following release that must still end the walk
or the hold; key + pad holder merge broken (release of one ends the other's walk); vacuous asserts
(assert exact `Face`/`Step` counts over many frames, and 0 after a latch).

## e2e helper contracts

### `client/e2e/pad.ts` (new; imports only `@playwright/test` types and pure modules)
- `installFakePad(target: Page | BrowserContext): Promise<void>` — `addInitScript` that creates
  `window.__mrFakePad = { index: 0, id: 'mr-fake-pad (STANDARD GAMEPAD)', connected: true,
  mapping: 'standard', timestamp: 0, buttons: 17 × { pressed: false, touched: false, value: 0 },
  axes: [0, 0, 0, 0] }` and defines `navigator.getGamepads` (own property, configurable) returning
  `[window.__mrFakePad, null, null, null]` — the SAME object every call, mutated in place.
- `padPress(page, index)`: set `buttons[index]` pressed (value 1), wait two animation frames in the
  page, set it released (value 0), wait two more.
- `padHold(page, index, ms)`: pressed, two frames, wait `ms`, released, two frames.
- Waits use `page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))))`.
  Document: foreground pages only (a background page's rAF is throttled).

### `client/e2e/controls.ts`
- `export type PressSource = 'keys' | 'pad'`; `export function setPressSource(page: Page, source: PressSource): void`
  (per-page, a module `WeakMap<Page, PressSource>`; default `'keys'`).
- `pressButton(page, button)`: keys mode unchanged; pad mode presses `padPress(page, i)` for
  `i = PAD_DEFAULT_BINDINGS.buttons[button][0]` (the pad table has no saved form until gp-5), throwing
  `UnboundKeyError` when there is none.
- `pressAccel(page, accel)`: pad mode presses `PAD_DEFAULT_BINDINGS.accels[accel][0]`, else
  `UnboundKeyError` (e.g. `B` has no pad button by default).
- `closeAll`: presses Start through `pressButton(page, 'Start')`; its keys-mode error messages stay
  byte-identical (controls.spec.ts asserts them).
- Header comment updated to name the pad source. Imports stay Vite-free (`../src/input/padBindings`
  is pure).

## Repo scanner rules (both scan test files)

- `scripts/check-secrets.mjs` flags `(password|secret|api_?key)\s*[:=]\s*["'][^"']{8,}["']` on any
  line: no such fixture literals.
- `mr-comment-scan` flags criterion ids (`gp-2.N`) in comments — an id is allowed ONLY as the
  trailing `[gp-2.N]` token of a test title — and history words in comments ("no longer", "the old",
  "used to", "was", "now"): comments state current behaviour.
- Biome formats/lints `client/` (`just lint`); keep imports used, no `any` without need (prefer
  `as unknown as`), no non-null assertions where the file avoids them.
- `client/e2e/*.ts` is typechecked (`client-typecheck`): `pad.ts`/`controls.ts` must compile under
  the e2e tsconfig and import only Vite-free modules.

## Report back

Per tag: the test titles and the count. Any **defect** you found in the plan/contract (must-fix) and
any **question** (answer-or-ignore), apart from the tests. No production file edits.
