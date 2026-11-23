# Spec: M-gamepad — controller support on the virtual-button layer

**Status:** elaborated 2026-11-22 into 6 `gp-` slices, against the game repo's `origin/master`
(M-postgate-console-controls, M-ui-foundation and M-battle-tactics merged) · **Project:**
monster-realm (client only) · **Target:** before early access (operator, 2026-10-01 and
2026-11-13) · **Design SSOT for the button model:** `console-controls-design.md`; the tactical
battle's controller map: `M-battle-tactics-design.md` §9.2.

## Problem / intent

Players who prefer a controller can play the whole game with one: the D-pad (or the left stick),
A, B, X, Y, LB, RB, Start and Select are the primary interface, accelerators stay optional, and
every button is remappable (operator, `operator-feedback-2026-10-01-controls.md`). The
console-controls milestone routes every input through one binding table into twelve virtual
buttons, and its router consumes only source-agnostic `{button, down}` edges, so a pad is one more
input source, not a redesign. This milestone also builds the two hold gestures the tactical
battle deferred to it (Hold Y cancel-and-clear, Hold B skip playback).

The design works the same in all three ways to play (single-player world, friends server,
official server): it is client-only, reads no server state, sends nothing the keyboard does not
already send, and touches no schema. It assumes no browser API beyond `navigator.getGamepads()`
(polled, never the `gamepadconnected` events), so the desktop shell (M-local-play `lpw-11`) hosts
it unchanged.

## What the current code gives this milestone (measured on `origin/master`, 2026-11-22)

- **Virtual buttons** — `client/src/input/buttons.ts`: `VBUTTONS` (Up, Down, Left, Right, A, B,
  X, Y, LB, RB, Start, Select), `ACCELS` (B, I, V, J, U, P, L, N, C, Y, F9, F8), and
  `ButtonEdge { button, down }`.
- **Binding table** — `client/src/input/bindings.ts`: `Bindings { buttons, accels }` keyed by
  `KeyboardEvent.code`, `DEFAULT_BINDINGS`, `PROTECTED_BUTTONS` (D-pad, A, B, Start),
  `buttonForCode` / `accelForCode`. Keyboard only; it has no device dimension.
- **Storage** — `client/src/input/bindingStore.ts`: `localStorage['mr.controls'] =
  {v:1, buttons, accels}`; `parseBindings` is total per entry and reads only `v`, `buttons` and
  `accels` (an extra top-level key is ignored); `saveBindings(storage, b)` rewrites the whole record.
- **Router** — `client/src/input/router.ts` `InputRouter`: `route(edge, ctx)` counts holders per
  D-pad button across every source (two sources holding one direction release it only when both
  let go), synthesizes the menu auto-repeat in `tick(ctx)` (350 ms, then 100 ms), and hands a
  screen adapter only presses (`NavInput { button, repeat }`): the release of any button other than
  the D-pad is unconsumed and reaches no screen. `releaseAll()` clears every holder.
- **Sources** — `KeyboardSource` (records codes down, one press per physical key, a lost keyup
  released before the next press) and `PointerSource` (a click is a down edge and an up edge in the
  same call, `main.ts` `pointerPress`). Both are built in `client/src/shell/inputState.ts`, which
  owns `bindings`, `keyboard`, `inputRouter`, `held` and `releaseAllInput` (window blur and a hidden
  tab call it).
- **Held-keys seam** — the router's `dirDown` / `dirUp` effects drive `HeldDirections`
  (`client/src/prediction/heldKeys.ts`) in `main.ts` `applyRouterEffect`; the frame loop re-issues
  the held direction as a `Step` once it is hold-committed. A pad direction takes this same path.
- **Context stack** — `client/src/ui/contextStack.ts`; one push-first open path
  (DECISIONS.md "Client UI: virtual buttons, one context stack, one overlay frame" names the gamepad
  as its second consumer). A pad press syncs the stack on both sides, as `pointerPress` does.
- **Glyph surfaces** — exactly three read a keycap: the hint bar (`ui/hintBarModel.ts` `hintBar`,
  the only reader of `bindings.buttons[button][0]` for display), the world interaction chip
  (`main.ts` `interactKeycap`, the A key) and the Controls screen (`ui/controlsModel.ts`,
  `ui/controlsView.ts`). The help overlay (Select / `?`) shows no keycap: its Introduction is prose
  and its Encyclopedia names mechanics. The Select chip in the hint bar is the help glyph.
- **Tactical battle today** — `ui/screens/battleScreen.ts` leaves Y unhandled ("the design's Hold-Y
  gesture is the confirmed Clear plan row"); a B press while a beat plays drains the playback
  (`tactics/tacticsBattle.ts` `#back`); the menu's confirmed "Clear plan" row calls
  `onCancelQueue`, offered when `commandModel.ts` `offers(ctx).cancel` is true (a pre-queue with a
  READY plan and no draft).
- **i18n** — every new player-visible string lands in `client/src/ui/i18n/messageIds.ts`,
  `catalog.en.ts` and `catalog.fr.ts` together (the compile-total `Catalog`).

## Scope

**In:** a polled `GamepadSource` over the W3C standard mapping; a pure `stickToDpad` with deadzone
and hysteresis; pad default bindings and pad accelerators; pad remapping in Controls, stored
additively in the same `mr.controls` record; a pad glyph family (Xbox letters) chosen by the
last-used source on the hint bar and the interaction chip; the source-agnostic hold edge in the
router and the tactical battle's Hold Y; one e2e per flow on a mocked Gamepad API (the operator's
menu flow, one tactical battle turn, the pad remap flow, the Hold-Y clear).

**Out (named deferrals):**

| Item | Target |
|---|---|
| Per-vendor glyphs (PlayStation shapes, Nintendo letters and its swapped A/B) | backlog [ux-a11y/LOW] — `decision-defaulted:pad-glyphs=xbox-letters`; the glyph table is one module, so a vendor family is one more table keyed by `Gamepad.id` |
| Rumble and haptics | wontfix (not requested; revisit only on operator request) |
| Steam Input | M21b-3 (PLAN §9 item 9): it maps onto the same virtual buttons in the desktop shell |
| A distinct tap-vs-hold B in the tactical battle (tap undoes during playback, only a hold skips) | M-battle-tactics depth (PLAN §9 item 7, after the Playtest-4 read) — see Decisions |
| A fill ring on a held Y | backlog [ux-a11y/LOW]; the confirmed Clear plan row stays the non-hold path |
| Right-stick input and analog walk speed | wontfix for this milestone (the world is tile-based; no camera); walk speed stays residual R-ctl-RUN |
| Pad input for the F8 / F9 debug accelerators | wontfix (developer keys; a pad accelerator covers the menu accelerators only) |
| Touch walking | residual R-ctl-TOUCHWALK (`console-controls-design.md` §17), unchanged |
| Account-synced bindings | backlog (operator, 2026-10-01: "local per browser; account sync may come later") |

## Decisions (each reversible; the build slice that lands it records it in the game's `docs/DECISIONS.md` only at `standards/decisions.md`'s bar)

- `decision-defaulted:pad-storage=additive-pad-entry-in-v1` — the pad table is a `pad` key in the
  existing `{v:1, …}` record, not a `v:2` with a migration. Today's `parseBindings` already ignores
  an extra key, so a record with `pad` loads on every shipped client and a record without one gives
  the pad defaults. Cost: a client older than gp-5 that saves its keyboard table drops the `pad`
  key (there is no downgrade path outside development). Reversal: a `v:2` reader that accepts `v:1`.
- `decision-defaulted:pad-glyphs=xbox-letters` — one glyph family for every pad, named for the
  Xbox layout the virtual buttons are already named after.
- `decision-defaulted:pad-slots=one-per-row` — a Controls row holds one pad button (the keyboard
  keeps Primary and Alt). The left stick always drives the D-pad and is not a binding.
- `decision-defaulted:pad-accels=lt-party-rt-bag` — LT (6) opens Party (`V`), RT (7) opens the Bag
  (`I`); the stick clicks (10, 11) are unbound by default (a click while steering is a common
  accident) and bindable. Button 16 (Home / Guide) belongs to the OS and is never bindable.
- `decision-defaulted:pad-all-pads=one-virtual-pad` — every connected pad feeds the one router;
  pads with `mapping !== 'standard'` use the same index table and remap fixes them.
- `decision-defaulted:hold-b=press-time-skip` — the shipped B press already skips a playing beat
  at the press, from every source (pointer right-click and long-press included); holding B
  therefore skips. A distinct tap-vs-hold B would make the shipped tap undo instead of skip, which
  is a feel change for keyboard and pointer players: deferred to M-battle-tactics depth.
- `decision-defaulted:hold-y=router-hold-edge` — the router reports a hold to the top frame's
  adapter only for buttons that frame names as hold-capable at the press; no other adapter, and
  no adapter's tests, see a change.

## Notes

- **Structure.** New logic lands in new modules under `client/src/input/` (`stick.ts`,
  `padBindings.ts`, `gamepadSource.ts`, `padGlyphs.ts`) and the hold edge in `input/router.ts`.
  `shell/inputState.ts` (the live input devices) receives the pad source, the pad table and the
  last-used source. `client/src/main.ts` receives wiring only — a frame-loop poll call, one pad-press
  function beside `pointerPress`, a keycap function, the capture hand-off and the `routeCtx` hold
  field. No seam exists yet for the input-dispatch glue (`routeEdge`, `applyRouterEffect`,
  `routeCtx`, `runAccel`), which closes over main.ts's session, menu and battle state whose owner is
  unrecorded; its extraction is filed as a `structure.spec.md` follow-up, not done here. Slices that
  share `inputState.ts`, `main.ts` or the i18n catalogs are ordered by `after:`.
- **Must not change:** contexts, nav reconcile and the screen adapters' existing behaviour. The one
  additive type change is `NavInput.hold` (gp-6), read only by the battle adapter.
- **Verification** per `standards/testing-tdd.md`: colocated vitest over the pure cores (fast-check
  for the stick and the source's diff), happy-dom for the views, one Playwright e2e per flow on a
  mocked Gamepad API. No source-text scans, no checks of checks.
- **Mocked Gamepad API (e2e).** `client/e2e/pad.ts` installs, by `page.addInitScript`, a
  `navigator.getGamepads` that returns one fake standard-mapping pad whose buttons and axes the test
  sets through `window.__mrFakePad`; `padPress(page, index)` sets a button down, waits two animation
  frames, sets it up and waits two more. `client/e2e/controls.ts` gains `setPressSource(page,
  'pad')`, after which `pressButton` and every helper built on it press the pad button bound to the
  virtual button, so the existing flow helpers drive a pad unchanged.

## Post-integration verification

After gp-6 merges: full `just ci` green; `bindings-drift` clean (no binding change is expected);
the four pad e2e specs green together with the keyboard ones they mirror (`menu-flow.spec.ts`,
`battle-dpad.spec.ts`, `remap.spec.ts`), so the pad adds a source without moving the keyboard path;
and a manual pass on one real pad in Chromium and Firefox (the operator's playtest), recorded in
the closing PR.

## Slices

### gp-1 — the pad source: standard-mapping buttons and the left stick as edges

type: feature · tier: routine
touches: client/src/input/stick.ts, client/src/input/stick.test.ts, client/src/input/padBindings.ts, client/src/input/padBindings.test.ts, client/src/input/gamepadSource.ts, client/src/input/gamepadSource.test.ts
after: []
- Pure modules, no wiring: nothing in the running game changes until gp-2.
- Contract (`padBindings.ts`): `type PadIndex = number` (a `Gamepad.buttons` index);
  `interface PadBindings { buttons: Readonly<Record<VButton, readonly PadIndex[]>>; accels:
  Readonly<Record<MenuAccel, readonly PadIndex[]>> }` (`MenuAccel` from `input/router.ts`);
  `PAD_DEFAULT_BINDINGS` = A 0, B 1, X 2, Y 3, LB 4, RB 5, Select 8, Start 9, Up 12, Down 13,
  Left 14, Right 15; accels V [6], I [7], every other accel []; `RESERVED_PAD_INDICES = [16]`;
  `isBindablePadIndex(i: unknown): i is PadIndex` (an integer 0–31 not reserved);
  `padButtonFor(b, i)` and `padAccelFor(b, i)` (undefined when unbound).
- Contract (`stick.ts`): `STICK_ENTER = 0.5`, `STICK_EXIT = 0.35`; `stickToDpad(x: number, y: number,
  prev: DpadDir | null): DpadDir | null`, `DpadDir = 'Up' | 'Down' | 'Left' | 'Right'`; `y < 0` is Up
  (the W3C axis convention).
- Contract (`gamepadSource.ts`): `interface PadLike { index: number; connected: boolean; buttons:
  readonly { pressed: boolean }[]; axes: readonly number[] }`; `class GamepadSource { constructor(
  getPads: () => readonly (PadLike | null)[], bindings?: PadBindings); poll(): { edges: readonly
  ButtonEdge[]; accels: readonly MenuAccel[] }; releaseAll(): void }`. Axes 0 and 1 are the left
  stick. A stick direction and a D-pad button of one pad are separate holders, so the router's
  holder count releases a direction only when both let go.

- **gp-1.1:** WHEN `stickToDpad` is given a stick whose larger axis magnitude is below `STICK_ENTER` and `prev` is null, THE SYSTEM SHALL return null.

- **gp-1.2:** WHEN `stickToDpad` is given a stick whose larger axis magnitude is at or above `STICK_ENTER`, THE SYSTEM SHALL return the direction of that axis's sign (x > 0 Right, x < 0 Left, y > 0 Down, y < 0 Up).

- **gp-1.3:** WHILE `prev` is a direction whose axis magnitude stays at or above `STICK_EXIT` and the other axis's magnitude is below `STICK_ENTER`, THE SYSTEM SHALL return `prev` (hysteresis: no flicker at the deadzone edge or on a diagonal).

- **gp-1.4:** WHEN a polled pad's bound button goes from not pressed to pressed, THE SYSTEM SHALL emit exactly one `{button, down: true}` edge for its virtual button, and exactly one `{button, down: false}` edge when it goes back.

- **gp-1.5:** WHILE a bound button stays pressed across polls, THE SYSTEM SHALL emit no further edge for it.

- **gp-1.6:** WHEN the left stick's `stickToDpad` direction changes from one direction to another, THE SYSTEM SHALL emit the old direction's up edge before the new direction's down edge in the same poll.

- **gp-1.7:** WHEN a pad that held buttons or a stick direction disappears from `getPads()` or reports `connected: false`, THE SYSTEM SHALL emit an up edge for every virtual button that pad held, in that poll.

- **gp-1.8:** WHEN `releaseAll()` runs while pad buttons are held, THE SYSTEM SHALL emit no edge for those buttons until each is released and pressed again.

- **gp-1.9:** WHEN a pad button bound to an accelerator goes down, THE SYSTEM SHALL report that accelerator once in `accels` and emit no button edge for it.

- **gp-1.10:** WHEN a pressed button index is unbound or reserved (16), THE SYSTEM SHALL emit nothing for it.

- **gp-1.11:** WHEN two pads both hold the same virtual button, THE SYSTEM SHALL emit one down edge per pad and one up edge per pad as each releases.
- DoD: gp-1.1 to gp-1.11 green (fast-check properties for the stick's hysteresis and the source's balanced edges); `just ci` green.

### gp-2 — a connected pad plays the game: the operator's menu flow, pad only

type: feature · tier: hard
touches: client/src/shell/inputState.ts, client/src/main.ts, client/src/main.input.test.ts, client/e2e/pad.ts, client/e2e/controls.ts, client/e2e/pad-menu-flow.spec.ts
after: [gp-1]
- Wiring: `inputState.ts` builds `pad = new GamepadSource(() => navigator.getGamepads?.() ?? [],
  PAD_DEFAULT_BINDINGS)` (a missing API reads as no pads) and `releaseAllInput` also calls
  `pad.releaseAll()`. `main.ts` polls once per animation frame before `inputRouter.tick`, and routes
  each edge through one `padEdge(edge)` beside `pointerPress`: dead while the session gate blocks,
  the stack synced on both sides, then `routeEdge`; each reported accelerator goes to `runAccel`. A
  pad press is never owned by a focused DOM element (a pad cannot type), and it clears the pointer's
  hover mark as a key press does.
- The e2e mirrors `menu-flow.spec.ts` press by press, with `setPressSource(page, 'pad')`; the
  mocked API is `client/e2e/pad.ts` (Notes).

- **gp-2.1:** WHEN a pad's D-pad button or left stick is pushed at the world with no frame open, THE SYSTEM SHALL face or step the character exactly as the bound key does, and keep walking while it is held (the held-keys seam).

- **gp-2.2:** WHILE the main menu or a nav-capable screen is the top frame, WHEN a pad direction is held past 350 ms, THE SYSTEM SHALL move the cursor with the router's auto-repeat as a held key does.

- **gp-2.3:** WHEN the window loses focus or the tab is hidden while a pad direction is held, THE SYSTEM SHALL stop walking, and SHALL NOT walk again until that direction is released and pushed again.

- **gp-2.4:** WHEN a pad accelerator button goes down (LT by default), THE SYSTEM SHALL open that accelerator's menu path, or act as Start on its own screen, exactly as its key does.

- **gp-2.5:** WHILE the session gate blocks input, THE SYSTEM SHALL ignore every pad edge.

- **gp-2.6:** WHEN `navigator.getGamepads` is absent or returns no pads, THE SYSTEM SHALL play on keyboard and pointer with no error reported.

- **gp-2.7:** WHEN the operator's required flow is played on the mocked pad only (Start, Down, A to Bag, RB, A A A to feed, B back to the menu with the menu still open, Up A to Monsters, move a monster to storage and back, Start to the world, then Up), THE SYSTEM SHALL reach the same states the keyboard flow reaches, ending with the character one tile North (`pad-menu-flow.spec.ts`).
- DoD: gp-2.1 to gp-2.7 green; `menu-flow.spec.ts` still green; `just ci` green.

### gp-3 — one tactical battle turn, pad only

type: feature · tier: routine
touches: client/e2e/pad-battle.spec.ts
after: [gp-2]
- An e2e only: it reuses `controls.ts`'s tactical helpers (`awaitTacticalActive`, `openMenu`,
  `draftMoveToward`, `moveThenAttackByButtons`, `waitExecuted`) under `setPressSource(page, 'pad')`.
  A defect it finds in the battle's button handling is fixed in this slice only through
  `mr-touches widen` with the red e2e as the proof.

- **gp-3.1:** WHEN a wild tactical battle starts and the player, using only the mocked pad, opens the command menu with A, drafts a move with the D-pad and A, attacks a target with the D-pad, LB/RB and A, and ends the turn with Start, THE SYSTEM SHALL execute that turn on the server and show its events, with no key pressed during the battle (`pad-battle.spec.ts`).
- DoD: gp-3.1 green alongside `battle-dpad.spec.ts`; `just ci` green.

### gp-4 — pad glyphs, chosen by the last-used source

type: feature · tier: routine
touches: client/src/input/padGlyphs.ts, client/src/input/padGlyphs.test.ts, client/src/shell/inputState.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/main.hintBar.test.ts, client/src/main.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/e2e/pad-menu-flow.spec.ts
after: [gp-2]
- Contract: `padGlyph(i: PadIndex): string` — 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 10 LS,
  11 RS (the labels printed on the hardware, literal in every locale); 8 View, 9 Menu and 12–15 the
  D-pad directions through catalog ids `pad.view`, `pad.menu`, `pad.dpadUp`, `pad.dpadDown`,
  `pad.dpadLeft`, `pad.dpadRight` (en + fr); any other index through `pad.button` with `{n}`.
  `inputState.ts` gains `lastSource: 'keys' | 'pad'` (starts `'keys'`), set to `'pad'` by a pad edge
  and to `'keys'` by a keydown; a pointer press leaves it. `hintBar`'s `bindings: Bindings`
  parameter becomes `keycap: (button: VButton) => string`; main.ts passes the live one, and
  `interactKeycap` reads it for A.

- **gp-4.1:** WHEN `padGlyph` is asked for a standard index, THE SYSTEM SHALL return its Xbox label, and for an index outside the table SHALL return the localized generic button name, never an empty string.

- **gp-4.2:** WHEN the last input came from a pad, THE SYSTEM SHALL show every hint bar chip's keycap and the world interaction chip's key as the pad glyph of that button's bound pad index.

- **gp-4.3:** WHEN a key is pressed after pad input, THE SYSTEM SHALL show keyboard keycaps again at the next frame.

- **gp-4.4:** WHEN a virtual button has no pad index bound and the last input came from a pad, THE SYSTEM SHALL show that chip with an empty keycap, as an unbound key does.

- **gp-4.5:** WHILE the locale is French, THE SYSTEM SHALL show the View, Menu and D-pad glyphs in French.

- **gp-4.6:** WHEN `pad-menu-flow.spec.ts` presses its first pad button, THE SYSTEM SHALL show the Start chip's keycap as the pad's Menu glyph.
- DoD: gp-4.1 to gp-4.6 green; `just ci` green (the i18n completeness suite included).

### gp-5 — remap the pad in Controls, saved with the keyboard table

type: feature · tier: hard
touches: client/src/input/padBindings.ts, client/src/input/padBindings.test.ts, client/src/input/bindingStore.ts, client/src/input/bindingStore.test.ts, client/src/input/gamepadSource.ts, client/src/shell/inputState.ts, client/src/ui/controlsModel.ts, client/src/ui/controlsModel.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/src/ui/screens/optionsScreen.ts, client/src/ui/screens/optionsScreen.test.ts, client/src/main.ts, client/src/main.remap.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/e2e/pad-controls.spec.ts
after: [gp-4]
- Contract: `parsePadBindings(raw: unknown): PadBindings` (total; `raw` is the record's `pad`
  value); `loadBindings` is unchanged and `loadPadBindings(storage)` reads the same key;
  `saveBindings(storage, b, pad)` writes `{v: 1, buttons, accels, pad: {buttons, accels}}`.
  `GamepadSource.capture(): PadIndex | undefined` hands the next newly pressed bindable index to a
  waiting capture instead of emitting it. `controlsModel.ts` `capturePad(pad, target, index):
  CaptureOutcome` mirrors `captureKey` in the pad namespace (swap on conflict; the protected
  buttons keep a pad button). `inputState.ts` `applyPadBindings(next)` saves both tables, releases
  everything and rebuilds the pad source.
- `controlsModel.ts` `controlsRows` has no production caller (census orphan): the Pad column goes
  into the row list `optionsScreen.ts` and `controlsView.ts` paint.
- Controls shows a third column, **Pad**, on the Buttons and Shortcuts tabs (F8 and F9 rows show
  none). A capture on a Pad cell takes the next pad press; the keyboard's Escape and the Cancel chip
  leave it, and pressing the button the cell already shows ends it unchanged.

- **gp-5.1:** WHEN the stored `mr.controls` record has no `pad` key, or a `pad` value that is not an object, THE SYSTEM SHALL use `PAD_DEFAULT_BINDINGS` and keep the keyboard table it parses today.

- **gp-5.2:** WHEN one stored pad entry is invalid (not a list, longer than one, a reserved, negative, fractional or duplicate index), THE SYSTEM SHALL replace only that entry with its default minus every index another entry already claims.

- **gp-5.3:** WHEN parsing would leave a protected button with no pad index, THE SYSTEM SHALL use `PAD_DEFAULT_BINDINGS`.

- **gp-5.4:** WHEN a pad table is saved and the page reloads, THE SYSTEM SHALL load the same pad table and the same keyboard table.

- **gp-5.5:** WHEN a capture on a Pad cell receives a pad index another row holds, THE SYSTEM SHALL swap the two rows' pad buttons and name both in the outcome line, and SHALL refuse a swap that would leave a protected button with no pad button.

- **gp-5.6:** WHILE a Pad cell waits for a press, THE SYSTEM SHALL route no pad press to the router or to an accelerator.

- **gp-5.7:** WHEN a pad remap is applied, THE SYSTEM SHALL drive the game with the new table at once, with no button left held from before it.

- **gp-5.8:** WHEN a player opens Controls with the mocked pad only, moves to the Pad cell of Confirm (A), presses A to capture and then presses pad button 3, THE SYSTEM SHALL show Y's glyph on that cell, swap Info (Y) onto button 0, and confirm the next menu choice with button 3 (`pad-controls.spec.ts`).
- DoD: gp-5.1 to gp-5.8 green; `remap.spec.ts` still green; `just ci` green.

### gp-6 — hold edges: Hold Y clears a READY plan

type: feature · tier: hard
touches: client/src/input/router.ts, client/src/input/router.test.ts, client/src/ui/nav.ts, client/src/ui/screens/battleScreen.ts, client/src/ui/screens/battleScreen.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/main.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/e2e/ui-tactics.spec.ts
after: [gp-5]
- Source-agnostic: a held F key and a held pad Y are the same edge pair, so this slice needs no pad
  code and is ordered after gp-5 only because both edit `main.ts` and the catalogs.
- Contract: `HOLD_MS = 500` (router.ts); `NavInput` gains `hold?: true`; `RouteContext` gains
  `hold?: { buttons: ReadonlySet<VButton>; now: number }` — the top frame's hold-capable buttons and
  the clock. A press of a listed button is delivered as today and arms the hold; `tick` asks the
  screen once with `{ button, repeat: false, hold: true }` when it has been held `HOLD_MS`; a
  release, `resetRepeat`, `releaseAll`, or a tick whose `hold.buttons` no longer lists it disarms it.
  main.ts sets `hold.buttons = {'Y'}` while the tactical shell offers Clear plan
  (`offers(ctx).cancel`), else omits `hold`. `BattleOp` gains `{kind: 'holdHint'}` (a Y tap) and
  `{kind: 'clearPlan'}` (a Y hold); `TacticsBattle` answers `holdHint` with the ticker line
  `tactics.ticker.holdToClear` and `clearPlan` with `onCancelQueue(battleId, selected unit)`, the
  sink the confirmed Clear plan row uses. Hold B: `decision-defaulted:hold-b=press-time-skip`.

- **gp-6.1:** WHEN a button the context lists as hold-capable has been held for `HOLD_MS` under the same top frame, THE SYSTEM SHALL ask that frame's adapter exactly once with a hold input, and never again until the button is released and pressed again.

- **gp-6.2:** WHEN a button the context does not list as hold-capable is held for any time, THE SYSTEM SHALL deliver no hold input for it.

- **gp-6.3:** WHEN a hold-capable button is released, or the frame changes, before `HOLD_MS`, THE SYSTEM SHALL deliver no hold input for that press.

- **gp-6.4:** WHILE the tactical shell offers Clear plan, WHEN Y is pressed and released before `HOLD_MS`, THE SYSTEM SHALL show the "Hold Y to clear the plan" ticker line and leave the plan untouched.

- **gp-6.5:** WHILE the tactical shell offers Clear plan, WHEN Y is held for `HOLD_MS`, THE SYSTEM SHALL send `cancel_queue` once for the selected unit, without the confirm row.

- **gp-6.6:** WHILE a beat plays, WHEN B goes down from any source, THE SYSTEM SHALL drain the playback at that press, and SHALL step back no menu level for the same press however long B is held.

- **gp-6.7:** WHEN the mounted tactical shell shows a READY plan and the F key (Y) is held for 600 ms in `ui-tactics.spec.ts`, THE SYSTEM SHALL call `onCancelQueue` once for that unit, and a 100 ms press SHALL only show the hint.
- DoD: gp-6.1 to gp-6.7 green; every screen adapter's existing tests unchanged and green; `just ci` green.

## Risks

- **Browser gamepad quirks.** Chromium and Firefox expose a pad only after its first button press
  on the page (a fingerprinting guard), and a hidden tab reads no pad data: the first press after a
  reload may do nothing but make the pad visible. Accepted; the playtest pass records it.
- **Non-standard mappings** (Firefox on Linux reports some pads with `mapping: ''`): the default
  table may be wrong for them; Controls' Pad column is the fix. Flagged for the playtest.
- **main.ts growth.** Four slices add wiring to a 5,348-line file. Each adds wiring only; the
  dispatch-glue extraction is a `structure.spec.md` follow-up (Notes).
- **Downgrade drops the pad table** (`decision-defaulted:pad-storage`): development only.
- **Hold B** keeps the shipped press-time skip; the design table's tap-undo-during-playback is
  deferred, so §9.2's "B: back" does not hold while a beat plays until M-battle-tactics depth.
- **`mr-prune census`** (recorded as `M-gamepad` at game `d515d75f`): no `duplicates` rows. Two
  `orphans` rows in gp-5's area: `controlsModel.ts` `controlsRows` has no production caller, so
  gp-5 adds the Pad column through the row list the Controls screen actually paints and leaves the
  orphan to its `structure.spec.md` follow-up; `glyphs.ts` `resetLearnedKeys` is a test-reset
  hook kept on purpose. `signals` rows (churn) on `main.input.test.ts`, `main.hintBar.test.ts`,
  `main.remap.test.ts`, `router.test.ts` and `hintBarModel.test.ts`, and a source-text signal on
  `controlsView.test.ts`: each is in the touching slice's `touches:`; a source-text assertion that
  gp-5's change breaks is replaced by a behaviour test, per `standards/testing-tdd.md`.
