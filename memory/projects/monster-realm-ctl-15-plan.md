# ctl-15 plan — pointer and touch: one dispatcher on #game-screen

Spec: specs/monster-realm-v2/M-postgate-console-controls.spec.md §ctl-15. Base 83aabd4e.
Worktree: projects/monster-realm/.claude/worktrees/ctl-15 (branch ctl-15).

## Shape (functional core / imperative shell)

The pointer is a SOURCE like the keyboard: it emits virtual-button presses only, never coordinates
and never commands of its own (except the two dialogue buttons the old document delegate owned).
Everything it does goes through the same router edge path a key takes.

### `client/src/input/longPress.ts` (pure, no DOM)
- `LONG_PRESS_MS = 500`, `LONG_PRESS_SLOP_PX = 10`.
- `PressTrack { id, x, y, t0, fired }`.
- `startPress(id, x, y, t): PressTrack`
- `movePress(track | null, id, x, y): PressTrack | null` — a different pointer id leaves the track
  as is; Euclidean distance from the start > 10 → null (cancelled); exactly 10 keeps it.
- `firePress(track | null, t): { track, fire }` — `fire` true exactly once, when
  `t - t0 >= 500` and not yet fired (the returned track has `fired: true`); null → no fire.
- `endPress(track | null, id): { track: PressTrack | null, swallowClick: boolean }` —
  same id ends the track (`null`), `swallowClick = track.fired`; another id changes nothing.

### `client/src/input/pointerSource.ts`
Pure helpers (exported, unit-tested on plain data):
- `navPath(count, cols | null, from, to): VButton[]` — the D-pad presses that move a nav cursor
  from index `from` to `to` (nav.ts semantics: list = Up/Down only, never wrapping is needed;
  grid = row-major with `cols`, short last row: when `from` is in a full row go horizontal first
  then vertical, else vertical first then horizontal). `from === to` → `[]`.
- `tabPath(from, to): VButton[]` — LB × (from−to) or RB × (to−from).

`PointerSource` class (thin DOM shell; happy-dom-testable with fake deps):
```ts
export type PointerTop = 'world' | 'frame' | 'other';
export interface PointerDeps {
  top(): PointerTop;            // world base with no frame | a screen/prompt frame on top | else
  press(button: VButton): void; // one press (down then up) through the router
  capturing(): boolean;         // Options › Controls waits for a key
  cancelCapture(): void;
  choice(idx: number): void;    // dialogue [data-choice-idx]
  shop(shopId: number): void;   // dialogue greet-then-shop [data-shop-id]
}
export interface PointerClock { now(): number; setTimeout(fn, ms): number; clearTimeout(h): void }
new PointerSource(gameScreen: HTMLElement, canvas: () => HTMLElement | null, deps, clock?)
pointer.keyPressed(): void      // a key was pressed: hide the hover state
```
Listeners, all on `gameScreen` (one dispatcher): `click`, `contextmenu`, `pointerdown`,
`pointermove`, `pointerup`, `pointercancel`. No `mouseover`, no document listener.

Click decision (in order; a click handled by one branch never reaches another):
1. A click swallowed by a completed long-press → nothing.
2. `capturing()` → nothing (the Cancel chip has its own listener inside controlsView).
3. `[data-shop-id]` → `shop(id)`; `[data-choice-idx]` → `choice(idx)` (absorbed document delegate;
   dialogue buttons, unchanged behaviour).
4. A `#hint-bar [data-button]` chip whose `data-button` is a `VButton` → `press(button)`
   (Start, Select, A, B, Y …). Moves the Start/Select chips off `[data-menu-launcher]` delegates.
5. `top() === 'world'`: target is (inside) the canvas → `press('A')`; else nothing.
6. `top() === 'frame'`: a `[data-nav-key]` item or a `[role="tab"][data-nav-tab]` tab in the
   TOP frame → seek, then (item only) `press('A')`. Anything else → nothing.
7. Otherwise nothing.

Top frame (DOM rule): the target's `closest('[aria-modal="true"]')` exists, and neither it nor any
ancestor of the target is `[inert]` (overlayA11y marks covered frames `inert`), and no ancestor has
inline `visibility: hidden` (a covered menu).

Seek (item): container = the item's closest `[role="listbox"],[role="grid"]`; its items are the
`[data-nav-key]` whose closest container is that container, in DOM order; cols = the number of
`[data-nav-key]` cells in the first `[role="row"]` (grid) else null; from = index of the item with
`aria-selected="true"`. `from < 0` → abort. Press each button of `navPath`; after EACH press
re-read the active index — unchanged or moved somewhere unplanned → abort (no further presses, no
A). After the path the container's active key must equal the item's key, else no A. Tabs: same
over the `[role="tab"]` of the strip with `tabPath` (LB/RB), no A.

Hover (CTL15.4): `pointermove` with `pointerType === 'mouse'` and coordinates different from the
last seen move → add class `mr-pointer-hover` to gameScreen, and when over a top-frame nav item that
is not active, seek it (no A). Same coordinates → nothing (a re-render under a stationary pointer).
`keyPressed()` removes `mr-pointer-hover`. CSS shows the hover mark only under that class.

Right-click: `contextmenu` on gameScreen → `preventDefault()`; `capturing()` → `cancelCapture()`,
else `press('B')`. Outside gameScreen the browser menu is untouched (no document listener).

Long-press (touch only): `pointerdown` with `pointerType === 'touch'` → `preventDefault()`,
`startPress`, show the ring (`.mr-longpress-ring` child of gameScreen at the touch point, CSS
animation fills over 500 ms), schedule `clock.setTimeout(500)`. On the timer: `firePress`; when it
fires: remove the ring, `capturing() ? cancelCapture() : press('B')`. `pointermove` → `movePress`;
cancelled → remove ring, clear timer. `pointerup`/`pointercancel` → `endPress`, remove ring, clear
timer; `swallowClick` → the next click is swallowed (rule 1). A tap (up before 500 ms) leaves the
browser's click to do its normal work (rules 2–7).

### `client/src/main.ts`
- Build `PointerSource` once the canvas is mounted: `gameScreen`, `() => worldCanvasEl`, deps:
  `top` from `contextStack` (`length === 1 && kind === 'world'` → world; top `screen`/`prompt` →
  frame; else other), `press(btn)` = `if (sessionGateBlocks()) return; syncStack();` then
  `routeEdge({btn, down:true}); routeEdge({btn, down:false})` in try/finally `syncStack()`;
  `capturing: () => controlsCapture() !== null`, `cancelCapture: cancelControlsCapture`,
  `choice`/`shop` = the old delegate's dispatches.
- `handleKeyDown` calls `pointer?.keyPressed()` first.
- Delete the document click delegate (all four branches move to the dispatcher).
- MenuView loses its click callback (absorbed): no `onInput` handed to it.

### `client/src/ui/menuView.ts`
Delete the `#rows` click listener and `MenuPointerInput`/`MenuViewCallbacks.onInput` (the
dispatcher makes a row click a seek + A; keeping it would dispatch twice). The `mouseover`
selection the spec mentions is already gone (verified: no such listener at 83aabd4e).

### `client/src/ui/hintBar.ts`
A/B/Y span chips become clickable: no inline `pointer-events: none`. `aria-disabled` STAYS (see
residual R-ctl-13-AXEDISABLED below). Header comment updated.

### `client/src/styles.css`
- `#game-screen canvas { touch-action: none; }`, `.mr-frame-body { touch-action: pan-y; }`.
- `.mr-chip` gets `cursor: pointer`; chip parts spaced (`.mr-chip-key`, `.mr-chip-verb`,
  `.mr-chip-badge` gap), `#notice-banner` background + wrap (closes R-ctl-13-CHIPCSS's CSS part).
- `.mr-longpress-ring` + `@keyframes` fill over 500 ms; reduced-motion: no animation (a static ring).
- `#game-screen.mr-pointer-hover .mr-nav-item:hover` hover mark.

### `client/src/ui/navRender.ts`, `controlsView.ts`
No behaviour change expected: navRender already writes `data-nav-key`/`data-nav-tab`, roles and
`aria-selected` that the dispatcher reads; controls rows and tabs are navRender output, so
R-ctl-12b-ROWCLICK closes through the generic seek. Touch only if a test shows a gap.

### `ARCHITECTURE.md` § Client › UI
Rewrite to the shipped pipeline; no `M` as the menu, no `CONTROLS`, no `T`.

### `client/e2e/pointer.spec.ts` (CTL15.6)
Mirror of `menu-flow.spec.ts` with the mouse only (same seed, same one-monster deviation):
Start chip → Bag row → Food tab → item → Feed → monster ("Fed …") → right-click (menu, cursor on
Bag) → Monsters row → the monster → Move (to storage, since one monster) → Storage tab → monster →
Move ("Moved to party") → Start chip (world) → canvas click with nothing faced does nothing → W walks.

## Gates → tests (tags are `CTL15-<n>-<NAME>:` in the test title)
- CTL15.1 — pointerSource.test.ts: CTL15-1-CANVAS-A, CTL15-1-ELSEWHERE-NOTHING.
- CTL15.2 — pointerSource.test.ts: CTL15-2-LIST-SEEK, CTL15-2-GRID-SEEK, CTL15-2-TAB,
  CTL15-2-LOWER-IGNORED, CTL15-2-VERIFY-ABORT, CTL15-2-DIALOGUE; menuView.test.ts: CTL15-2-MENU-NO-OWN-CLICK.
- CTL15.3 — pointerSource.test.ts: CTL15-3-RIGHTCLICK-B, CTL15-3-CAPTURE-CANCEL,
  CTL15-3-LONGPRESS-B, CTL15-3-LONGPRESS-SWALLOW; longPress.test.ts: CTL15-3-LP-FIRE-ONCE,
  CTL15-3-LP-SLOP, CTL15-3-LP-CSS.
- CTL15.4 — pointerSource.test.ts: CTL15-4-HOVER-SEEK, CTL15-4-STATIONARY, CTL15-4-KEY-HIDES.
- CTL15.5 — pointerSource.test.ts: CTL15-5-CHIP-PRESS; hintBar.test.ts: CTL15-5-CHIP-CLICKABLE.
- CTL15.6 — e2e/pointer.spec.ts: CTL15-6-POINTER-FLOW.

## Residuals
- R-ctl-13-AXEDISABLED stays open: dropping `aria-disabled` moves a11y.spec's incomplete ceiling
  (outside touches). Re-home to backlog.
- R-ctl-11a-SELECTCHIP, R-ctl-12b-ROWCLICK, R-ctl-8b-CTL8B.3, R-ctl-13-CHIPCSS (CSS part) close here.

## Anti-patterns avoided
- No coordinates into game logic; no hit-testing the canvas; no second dispatch path.
- No per-row listeners (navRender diffs rows). No document-level listener.
- No new ScreenHost API: activation goes through D-pad presses so every frame's own adapter decides.

## REVISION 1 (after the plan review; supersedes the sections above where they differ)

Review blockers: B2 Monsters (boxView) and Shop rows carry no role / aria-selected / rows; B3 a
frame's base list stays visible and stale under its sheet/picker, and the D-pad drives only the
adapter's current phase, so DOM alone cannot say which container is driven; M1 a canvas click with
the world's request sheet open would press A = Accept.

### Containers and the active mark (any view, not only navRender output)
- A nav container = the nearest ancestor holding the item's `[data-nav-key]` siblings: the
  closest `[role="grid"],[role="listbox"]`, else the item's parent (a `[role="row"]` parent →
  its grid). Its items = the `[data-nav-key]` whose container is it, DOM order.
- Active = the item with class `is-active` (navRender, boxView, shopView, leaderboard all set it;
  `aria-selected="true"` is the fallback).
- cols = `[role="row"]` cell count; else the token count of `getComputedStyle(c).gridTemplateColumns`
  when `display` is `grid`/the inline style says so; else (a list) null. Unknown grid cols → only a
  click on the already-active item can proceed.
- Visible = no ancestor (up to the frame root) with `hidden`, inline `display:none` or inline
  `visibility:hidden`. Only VISIBLE containers in the top frame count.

### Seek = probe first, undo on a miss (never activate an undriven container)
Let T be the target's container, t its index, a T's active index (none → abort).
1. t ≠ a: press the FIRST button of `navPath`. If T's active moved to the planned index, T is
   driven: press the rest, verifying after each press (a miss → stop, no A); at the end T's active
   key must equal the target's, then A (click) / nothing more (hover). If T did not move as planned,
   press the INVERSE button once (undo whatever container did move; nav wraps, so a fresh step is
   invertible) and abort.
2. t === a (the click is on the active item): T must be proven driven before A.
   - T has ≥2 items on some axis: press a probe (Down for a list, Right/Down for a grid as one
     exists), check T moved, press the inverse; moved → A, else abort (the undo already ran).
   - T has exactly one item: driven by ELIMINATION only when T is the only visible container in
     the top frame, or every other visible container is a list of ≥2 items and a Down probe moved
     none of them (then undo is not needed: nothing moved). Otherwise (a tie of single-item
     containers) abort — a click does nothing, never the wrong A. Residual R-ctl-15-DRIVEN: views
     should mark a base list under a sub-phase (`inert`/`aria-disabled`); outside touches.
- Tabs (`[role="tab"][data-nav-tab]` in a `[role="tablist"]` in the top frame): `tabPath` with the
  same first-press probe + undo (inverse of LB is RB).

### Click rules (final order)
1. swallowed by a completed long-press → nothing (the swallow flag clears on the next
   `pointerdown` and after 1 s).
2. `capturing()` → nothing (left clicks); the Cancel chip keeps its own listener.
3. `[data-shop-id]` → `shop`; `[data-choice-idx]` → `choice` (absorbed document delegate; the
   dialogue overlay is inside `#game-screen`).
4. `#hint-bar [data-button]` chip with a VButton → `press(button)`.
5. A target inside `button, input, select, textarea, a, label, [contenteditable]` → nothing (a native
   control answers its own click: Shop Buy/Sell, Monsters To Box/Party, the Cancel chip, fields).
6. `[data-pointer-own]` ancestor → nothing: the MENU keeps its own row click (`{kind:'pick'}` →
   `mainMenuPick`, already move + activate, already tested), so `menuView` marks `#menu-rows` with
   `data-pointer-own` and nothing is dispatched twice. (Keeps `new MenuView({onInput})` callers —
   e.g. ui/overlayA11yWiring.test.ts — compiling.)
7. `top() === 'world'` and the target is (in) the canvas → `press('A')`.
8. `top() === 'frame'` → item seek + A, or tab seek; else nothing.
`top()` in main.ts: `'world'` only for the bare world base with NO open world sheet
(`!screenHost.sheetOpen`, M1); a screen/prompt top → `'frame'`; anything else `'other'`.

### Touch (M3)
- Only `isPrimary` touch pointers; `setPointerCapture` (guarded) on the touch `pointerdown`; a new
  `pointerdown` clears any previous track and timer. Editable targets (input/textarea/select/
  contenteditable) get neither `preventDefault` nor a long-press.
- A `contextmenu` while a touch track exists or within 1 s of the last touch `pointerdown`/long-press
  → `preventDefault` only, never a second B. Editable targets: `contextmenu` left to the browser.

### Hover
- Seek (no A) only when the hovered nav item CHANGED since the last move and is not active; never
  the single-item/elimination path (a hover never probes a click on the active item).

### Named intentional changes to existing tests (main.ts siblings → touches-delta)
- `main.dispatch.test.ts`, `main.dialogueDismiss.test.ts`, `main.controls.test.ts`: the dialogue
  `[data-choice-idx]`/`[data-shop-id]` buttons they append must sit inside `#game-screen` (the
  delegate moved off `document`).
- The Start chip is now a Start PRESS (keyboard parity, CTL15.5): with a frame open it closes to the
  world instead of doing nothing; the Select chip opens Help at a bare battle base (closes
  R-ctl-11a-SELECTCHIP).
