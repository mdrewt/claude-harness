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
input source, not a redesign. This milestone also settles the two hold gestures the tactical
battle deferred to it: it builds Hold Y cancel-and-clear, and Hold B skip playback keeps the shipped
press-time skip (Decisions). Two surfaces stay keyboard- or pointer-only and are named deferrals:
typing (renames) and the session terminal's buttons.

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
  screen adapter only presses (`NavInput { button, repeat }`): no release reaches a screen (X's is
  swallowed, every other non-D-pad release is unconsumed). `releaseAll()` clears every holder.
- **Sources** — `KeyboardSource` (records codes down, one press per physical key, a lost keyup
  released before the next press) and `PointerSource` (a click is a down edge and an up edge in the
  same call, `main.ts` `pointerPress`). `KeyboardSource` and the router are built in
  `client/src/shell/inputState.ts`, which owns `bindings`, `keyboard`, `inputRouter`, `held` and
  `releaseAllInput`; `PointerSource` is built at boot in `main.ts` (window blur and a hidden
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
  `catalog.en.ts` and `catalog.fr.ts` together (the compile-total `Catalog`), and the roster pin
  `catalog.test.ts` (`EXPECTED_KEYS`) changes with it. A `tactics.*` string goes through
  `tactics/strings.ts`, the one resolver importer, whose roster `strings.test.ts` pins.

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
| Steam Input | M21b-3 (PLAN §9 item 7): it maps onto the same virtual buttons in the desktop shell |
| A distinct tap-vs-hold B in the tactical battle (tap undoes during playback, only a hold skips; §9.3's pre-queue during playback) | M-battle-tactics depth (PLAN §9 item 5, after the Playtest-4 read) — see Decisions; gp-6's router already delivers a listed button's tap at its release, so it is listing B, not a router change |
| A fill ring on a held Y | backlog [ux-a11y/LOW]; the confirmed Clear plan row stays the non-hold path |
| Right-stick input and analog walk speed | wontfix for this milestone (the world is tile-based; no camera); walk speed stays residual R-ctl-RUN |
| Typing with a pad (the rename `textEntry` frames) | M21b-3 (Steam Input's on-screen keyboard in the shell); in the browser a keyboard is needed to type |
| Pad control of the session terminal (its Retry and links: "Tab moves, Enter chooses") | backlog [ux-a11y/MED]: the gate drops pad input while it blocks (gp-2.5) |
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
- `decision-defaulted:pad-all-pads=one-virtual-pad` — every connected pad feeds the one router.
  A pad with `mapping !== 'standard'` gets the same button table (remap fixes it) but its axes are
  ignored: wheels, pedals and touchpads reported as pads often rest at -1 on axis 0 or 1 and would
  otherwise walk the character forever.
- `decision-defaulted:hold-b=press-time-skip` — the shipped B press already skips a playing beat
  at the press, from every source (pointer right-click and long-press included); holding B
  therefore skips. A distinct tap-vs-hold B would make the shipped tap undo instead of skip, which
  is a feel change for keyboard and pointer players: deferred to M-battle-tactics depth, and
  flagged to the operator as a feel decision.
- `decision-defaulted:hold-y=router-hold-edge` — the router reports a hold to the top frame's
  adapter only for buttons that frame names as hold-capable at the press. A hold-capable button's
  tap is delivered at its release (before `HOLD_MS`), so a hold never also acts as a tap. No other
  adapter, and no adapter's tests, see a change.
- `decision-defaulted:pad-focus=same-guards-as-keys` — a pad press is ignored while focus is outside
  the game screen and runs the same focus heal a keydown runs; inside the game screen a pad press is
  a button press even with a text field focused (a pad cannot type; A commits, B backs out).

## Notes

- **Structure.** New logic lands in new modules under `client/src/input/` (`stick.ts`,
  `padBindings.ts`, `gamepadSource.ts`, `padGlyphs.ts`) and the hold edge in `input/router.ts`.
  `shell/inputState.ts` (the live input devices) receives the pad source, the pad table and the
  last-used source. `client/src/main.ts` receives wiring only — a frame-loop poll call, one pad-press
  function beside `pointerPress`, a keycap function, the capture hand-off and the `routeCtx` hold
  field. No seam exists yet for the input-dispatch glue (`routeEdge`, `applyRouterEffect`,
  `routeCtx`, `runAccel`), which closes over main.ts's session, menu and battle state whose owner is
  unrecorded; its design and extraction are the follow-up R-gp-spec-NOTE956108
  (`structure.spec.md`), not done here. Slices that
  share `inputState.ts`, `main.ts` or the i18n catalogs are ordered by `after:`.
- **Must not change:** contexts, nav reconcile and the screen adapters' existing behaviour. The one
  additive type change is `NavInput.hold` (gp-6), read only by the battle adapter.
- **Verification** per `standards/testing-tdd.md`: colocated vitest over the pure cores (fast-check
  for the stick and the source's diff), happy-dom for the views, one Playwright e2e per flow on a
  mocked Gamepad API. No source-text scans, no checks of checks.
- **Mocked Gamepad API (e2e).** `client/e2e/pad.ts` installs, by `page.addInitScript`, a
  `navigator.getGamepads` that returns one fake standard-mapping pad whose buttons and axes the test
  sets through `window.__mrFakePad`; `padPress(page, index)` sets a button down, waits two animation
  frames, sets it up and waits two more; `padHold(page, index, ms)` holds it for `ms` first. The
  mock mutates one object in place, as real browsers may reuse snapshots, so the source must copy
  what it reads (gp-1.5). `client/e2e/controls.ts` gains `setPressSource(page,
  'pad')`, after which `pressButton` and every helper built on it press the pad button bound to the
  virtual button, so the existing flow helpers drive a pad unchanged.

## Post-integration verification

After gp-6 merges: full `just ci` green; `bindings-drift` clean (no binding change is expected);
the three pad e2e specs (`pad-menu-flow`, `pad-battle` with its Hold-Y case, `pad-controls`) green
together with the keyboard ones they mirror (`menu-flow.spec.ts`, `battle-dpad.spec.ts`,
`remap.spec.ts`), so the pad adds a source without moving the keyboard path;
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
  (the W3C axis convention). The rule, in order: a non-finite axis reads 0; `prev` is kept while its
  own axis, in its own sign, is at least `STICK_EXIT` and the other axis's magnitude is not larger;
  otherwise the larger-magnitude axis gives the direction when it is at least `STICK_ENTER` (an
  exact tie goes to the horizontal axis); otherwise null.
- Contract (`gamepadSource.ts`): `interface PadLike { index: number; id: string; connected: boolean;
  mapping: string; buttons: readonly { pressed: boolean }[]; axes: readonly number[] }`;
  `class GamepadSource { constructor(getPads: () => readonly (PadLike | null)[], bindings?:
  PadBindings); poll(): { edges: readonly ButtonEdge[]; accels: readonly MenuAccel[] };
  releaseAll(): void; rebind(next: PadBindings): void; capture(): PadIndex | 'refused' | undefined }`.
  The source keeps its own copy of each pad's pressed set and stick direction, keyed by `index` and
  `id` (a different pad in a reused slot is a disconnect plus a connect). Axes 0 and 1 are the left
  stick, read only on a `standard` pad. A stick direction and the D-pad button of the same direction
  are separate holders, released separately (the router's holder count merges them). `releaseAll`
  and `rebind` latch every index held at that moment: it emits nothing until released. `capture()`
  (gp-5) returns the next newly pressed index without emitting it: the index, or `'refused'` for a
  reserved or unbindable one. `getPads` throwing reads as no pads; `poll` reports the failure once
  through an injected `onError` (constructor option), not per poll.

- **gp-1.1:** WHEN `stickToDpad` is given a stick whose larger axis magnitude is below `STICK_ENTER` and `prev` is null, THE SYSTEM SHALL return null.

- **gp-1.2:** WHEN `stickToDpad` is given a stick whose larger axis magnitude is at or above `STICK_ENTER`, THE SYSTEM SHALL return the direction of that axis's sign (x > 0 Right, x < 0 Left, y > 0 Down, y < 0 Up), and on an exact tie the horizontal one.

- **gp-1.3:** WHILE `prev` is a direction whose own axis stays at or above `STICK_EXIT` in its sign and the other axis's magnitude is not larger, THE SYSTEM SHALL return `prev` (no flicker at the deadzone edge or on a diagonal).

- **gp-1.4:** WHEN `prev` is a direction and both axes' magnitudes fall below `STICK_EXIT`, or an axis is not a finite number and the other is below `STICK_EXIT`, THE SYSTEM SHALL return null.

- **gp-1.5:** WHEN a polled pad's bound button goes from not pressed to pressed, THE SYSTEM SHALL emit exactly one `{button, down: true}` edge for its virtual button, and exactly one `{button, down: false}` edge when it goes back, also when `getPads` returns the same object mutated in place between polls.

- **gp-1.6:** WHILE a bound button stays pressed across polls, THE SYSTEM SHALL emit no further edge for it.

- **gp-1.7:** WHEN a standard pad's left stick goes from centre to a direction, from one direction to another, or back to centre, THE SYSTEM SHALL emit that direction's down edge, the old direction's up edge before the new one's down edge, or the last direction's up edge, in that poll; and any sequence of stick readings that ends at centre SHALL leave no direction held (a fast-check property).

- **gp-1.8:** WHEN a pad's D-pad Up button and its stick pushed Up are both held and only one is released, THE SYSTEM SHALL emit one Up up edge for that one, and a second when the other is released.

- **gp-1.9:** WHEN a pad whose `mapping` is not `standard` reports axes 0 and 1 resting at -1, THE SYSTEM SHALL emit no edge for them.

- **gp-1.10:** WHEN a pad that held buttons or a stick direction disappears from `getPads()`, reports `connected: false`, or is replaced in its slot by a pad with another `id`, THE SYSTEM SHALL emit an up edge for every virtual button that pad held, in that poll.

- **gp-1.11:** WHEN `releaseAll()` or `rebind()` runs while pad buttons or the stick are held, THE SYSTEM SHALL emit no edge for them until each is released and pressed again.

- **gp-1.12:** WHEN a pad button bound to an accelerator goes down, THE SYSTEM SHALL report that accelerator once in `accels` and emit no button edge for it.

- **gp-1.13:** WHEN a pressed button index is unbound or reserved (16), THE SYSTEM SHALL emit nothing for it.

- **gp-1.14:** WHEN two pads both hold the same virtual button, THE SYSTEM SHALL emit one down edge per pad and one up edge per pad as each releases.

- **gp-1.15:** WHEN `getPads` throws on every poll, THE SYSTEM SHALL return no edges each time and call `onError` exactly once.
- DoD: gp-1.1 to gp-1.15 green (fast-check properties for the stick's hysteresis and the source's balanced edges); `just ci` green.

Build note (gp-1): GamepadSource.capture() semantics as built: a press seen during capture owes
nothing (it emits no edge on release, so the captured button acts only after release and re-press,
gp-5.9); an up edge owed by a button or stick direction held from before the capture is queued and
emitted first by the next poll(), so gp-5 needs no extra router release at capture entry;
releaseAll()/rebind() drop that queue. A stick direction first reached during capture stays latched
until the stick reads centre. With several indices newly pressed in one capture read, the lowest
bindable index wins over a reserved/unbindable one (which alone gives 'refused').

Build note (gp-1): GamepadSource details gp-2 relies on: constructor is (getPads, bindings =
PAD_DEFAULT_BINDINGS, { onError }); onError fires once per source lifetime; getPads may return any
array-like (Array.from), and a throw or a malformed pad reads as no pads, releasing every owed edge.
An accelerator binding is resolved before a button binding on the same index, as the keyboard path
does. Within one poll: queued capture ups, then ups of vanished/disconnected/replaced pads, then
each present pad's buttons in index order, then its stick (old direction's up before the new one's
down).

### gp-2 — a connected pad plays the game: the operator's menu flow, pad only

type: feature · tier: hard
touches: client/src/shell/inputState.ts, client/src/shell/inputState.test.ts, client/src/main.ts, client/src/main.input.test.ts, client/e2e/pad.ts, client/e2e/controls.ts, client/e2e/pad-menu-flow.spec.ts
after: [gp-1]
- Wiring: `inputState.ts` builds `pad = new GamepadSource(() => navigator.getGamepads?.() ?? [],
  PAD_DEFAULT_BINDINGS, { onError })` (a missing API reads as no pads; a throwing one is reported
  once through `reportError`) and `releaseAllInput` also calls `pad.releaseAll()`. `main.ts` polls
  once per animation frame, FIRST in the frame (before the session-gate early return and before
  `inputRouter.tick`), and routes the poll's edges through one `pressEdges(edges)` that `pointerPress` is rewritten to
  call too (the session-gate check, the stack synced on both sides, `routeEdge` per edge), so the
  two sources share one press path; each reported accelerator goes to `runAccel`. While
  the session gate blocks, the frame discards the poll's edges and calls `releaseAllInput()`, so a
  button held through the gate stays latched until released. The pad path applies the keydown's
  guards (`decision-defaulted:pad-focus=same-guards-as-keys`): nothing while focus is outside the
  game screen, then the same focus heal, and it clears the pointer's hover mark as a key press does.
- The e2e mirrors `menu-flow.spec.ts` press by press, with `setPressSource(page, 'pad')`; the
  mocked API is `client/e2e/pad.ts` (Notes). `closeAll` presses Start through `pressButton` too, so
  pad mode covers it.

- **gp-2.1:** WHEN a pad's D-pad button or left stick is pushed at the world with no frame open, THE SYSTEM SHALL face or step the character exactly as the bound key does, and keep walking while it is held (the held-keys seam).

- **gp-2.2:** WHILE the main menu or a nav-capable screen is the top frame, WHEN a pad direction is held past 350 ms, THE SYSTEM SHALL move the cursor with the router's auto-repeat as a held key does.

- **gp-2.3:** WHEN the window loses focus or the tab is hidden while a pad direction is held, THE SYSTEM SHALL stop walking, and SHALL NOT walk again until that direction is released and pushed again.

- **gp-2.4:** WHEN a pad accelerator button goes down (LT by default), THE SYSTEM SHALL open that accelerator's menu path, or act as Start on its own screen, exactly as its key does.

- **gp-2.5:** WHILE the session gate blocks input, THE SYSTEM SHALL act on no pad edge, and WHEN the gate lifts with a pad direction still held from before it, THE SYSTEM SHALL NOT walk until that direction is released and pushed again.

- **gp-2.6:** WHEN `navigator.getGamepads` is absent, returns no pads, or throws, THE SYSTEM SHALL play on keyboard and pointer, and a throwing API SHALL be reported once, not once per frame.

- **gp-2.7:** WHILE focus is on an element outside the game screen, THE SYSTEM SHALL act on no pad press.

- **gp-2.8:** WHEN the operator's required flow is played on the mocked pad only (Start, Down, A to Bag, RB, A A A to feed, B back to the menu with the menu still open, Up A to Monsters, move a monster to storage and back, Start to the world, then Up), THE SYSTEM SHALL reach the same states the keyboard flow reaches, ending with the character one tile North (`pad-menu-flow.spec.ts`).
- DoD: gp-2.1 to gp-2.8 green; `menu-flow.spec.ts` still green; `just ci` green.

Build note (gp-2): gp-2 reports a throwing navigator.getGamepads through the error ring, not
reportError: shell/inputState holds a fault-sink port (installPadFaultSink; console.error until
installed, because GamepadSource swallows a throwing reporter) and main.ts installs, at module
scope, pushError('uncaught', 'gamepad: <message>'). reportError needs a MessageKind and a
player-facing catalog string (feedbackPolicy, messageIds, both catalogs, the catalog.test roster),
none in gp-2's touches, and records the fault as 'reducer'. What the player sees: the error overlay
once (pushError), no toast or hint line. inputState imports no shell module (the layering rule in
docs/DECISIONS.md).

Build note (gp-2): Measured at gp-2 (Playwright's Chromium, 2026-11-22): navigator.getGamepads is a
function and returns [null,null,null,null] on an insecure http origin (a LAN IP) as on localhost;
isSecureContext was false there. The Risks line 'Chromium exposes the Gamepad API only to secure
contexts' is not what this build does; whether a real pad is reported on an insecure origin is
unverified (no physical pad). The wiring handles both an absent API and empty slots.

Build note (gp-2): gp-2 pad wiring as built (main.ts pollPad, for gp-4/gp-5/gp-6): the frame reads
the pad right after its first syncStack (so the guards read a synced stack), before the session-gate
early return and inputRouter.tick. Gate blocks: releaseAllInput() (which reads the pad, then latches
it) and nothing routes. A poll that holds a press (a down edge or an accelerator) while focus is
outside #game-screen or while Controls waits for a key: releaseAllInput() and nothing routes, so the
ignored press owes no release (a stray release would end another source's hold, and under gp-6's
tap-at-release it would act). A poll of releases only routes whatever the focus. The press decision
is made once per poll: A and B in one frame on a Controls slot start the capture and then end it
through the screen's B; gp-5's capture hand-off should decide per edge. pressEdges (shared with
pointerPress) routes every edge in its own try and rethrows the first error after the last edge; a
throw there loses that poll's accelerators and the rest of that frame (accepted LOW).

Build note (gp-2): For gp-5: while a KEY slot capture waits, gp-2 drops every pad press (the adopted
gp-5 rule), so a pad-only player who pressed A on a keyboard slot cannot cancel that capture from
the pad; only a key, the Cancel chip or the pointer ends it. gp-5.6 lets Escape cancel a pad
capture, but no pad button cancels a key capture.

Build note (gp-2): ARCHITECTURE.md's shell/inputState paragraph does not name the pad source,
installPadFaultSink, or that releaseAllInput also runs on every gated frame and on a pad press
ignored outside the game screen (gp-2 could not edit it: outside touches).

Build note (gp-2): client/e2e/pad-menu-flow.spec.ts copies about 180 lines of
client/e2e/menu-flow.spec.ts (helpers, types, the sheet walk, every assertion) because
menu-flow.spec.ts was outside gp-2 touches; a change to the flow now lands twice. controls.ts
setPressSource exists so one flow body can serve both sources.

### gp-3 — one tactical battle turn, pad only

type: feature · tier: routine
touches: client/e2e/pad-battle.spec.ts
after: [gp-2]
- An e2e only: it reuses `controls.ts`'s tactical helpers (`awaitTacticalActive`, `openMenu`,
  `draftMoveToward`, `moveThenAttackByButtons`, `waitExecuted`) under `setPressSource(page, 'pad')`.
  A defect it finds in the battle's button handling is fixed in this slice only through
  `mr-touches widen` with the red e2e as the proof.

- **gp-3.1:** WHEN a wild tactical battle starts and the player, using only the mocked pad, selects a unit with LB/RB, opens the command menu with A, drafts a move with the D-pad and A, attacks through Skills, a skill and a target with the D-pad and A, and ends the turn with Start if it is still live, THE SYSTEM SHALL execute that turn on the server and show its events, with no key pressed during the battle (`pad-battle.spec.ts`).
- DoD: gp-3.1 green alongside `battle-dpad.spec.ts`; `just ci` green.

Build note (gp-3): gp-3 as built: with a one-monster party (one own unit, a pack of one) LB/RB
'select a unit' is observable only as the cycle's return to idle. pad-battle.spec.ts presses each
bumper with the Move aim open; the aim closes with no menu, the cursor is on the unit, and the next
A opens the unit's command menu (an unrouted bumper leaves the aim, so A opens nothing; a bumper
wired to back re-opens the root menu). Neither a swapped LB/RB direction nor cycling between two own
units is covered by any e2e. A selected unit's reach band is painted at idle too (tacticsBattle.ts
overlays), so the band is not a mode signal.

Build note (gp-3): gp-3 reading of 'ends the turn with Start if it is still live':
moveThenAttackByButtons' [Move, Skill] usually spends the whole budget, so the server ends that turn
itself. pad-battle.spec.ts then presses pad Start on the NEXT own live turn (no draft, so End Turn)
and asserts a TurnEnded for the unit, so the pad Start is proven on every run. The starter is seeded
attack 1 (and HP 999, defense 250) so the wild survives and the battle never finishes before Start
runs. With one wild, the skill aim opens on its only target, so the target step is A on the default
aim; the D-pad walks only the menu rows. Retargeting a multi-target skill aim on the pad has no e2e.

### gp-4 — pad glyphs, chosen by the last-used source

type: feature · tier: routine
touches: client/src/input/padGlyphs.ts, client/src/input/padGlyphs.test.ts, client/src/shell/inputState.ts, client/src/shell/inputState.test.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/main.hintBar.test.ts, client/src/main.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/pad-menu-flow.spec.ts
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
touches: client/src/input/padBindings.ts, client/src/input/padBindings.test.ts, client/src/input/bindingStore.ts, client/src/input/bindingStore.test.ts, client/src/shell/inputState.ts, client/src/shell/inputState.test.ts, client/src/ui/controlsModel.ts, client/src/ui/controlsModel.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/src/ui/screens/optionsScreen.ts, client/src/ui/screens/optionsScreen.test.ts, client/src/main.ts, client/src/main.remap.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/controls.ts, client/e2e/pad-controls.spec.ts
after: [gp-4]
- Contract: `parsePadBindings(raw: unknown): PadBindings` (total; `raw` is the record's `pad`
  value); `loadBindings` is unchanged and `loadPadBindings(storage)` reads the same key;
  `saveBindings(storage, b, pad)` takes the pad table as a REQUIRED argument and writes
  `{v: 1, buttons, accels, pad: {buttons, accels}}`, so every keyboard save carries the live pad
  table. `controlsModel.ts` `capturePad(pad, target, index): CaptureOutcome` mirrors `captureKey`
  in the pad namespace (swap on conflict; the protected buttons keep a pad button). `inputState.ts`
  `applyPadBindings(next)` saves both tables, releases everything and calls `pad.rebind(next)` (the
  held buttons latch, gp-1.11).
- Capture targets name their device. While a Pad cell waits, the frame loop takes `pad.capture()`
  instead of routing pad edges; the keyboard reaches only Escape (cancel) and the Cancel chip's
  activation, every other key is ignored. While a Key cell waits, pad presses are ignored. A pad-only
  player leaves a Pad capture by pressing the button the cell already shows (unchanged), and a
  reserved or unbindable press shows the refusal line a refused key shows. The pad capture's outcome
  goes through the same outcome handling `captureControlsKey` uses (toast, save, apply), not a copy.
- `controlsModel.ts` `controlsRows` has no production caller (census orphan): the Pad column goes
  into the row list `optionsScreen.ts` and `controlsView.ts` paint.
- Controls shows a third column, **Pad**, on the Buttons and Shortcuts tabs (`CONTROLS_LAYOUT`'s
  grids gain a column); the F8 and F9 rows hold a disabled placeholder Pad cell, so every row keeps
  the same columns. Reset all resets both tables. `client/e2e/controls.ts` `liveBindings` also
  parses the live `pad` table, so pad-mode `pressButton` presses the remapped index.

- **gp-5.1:** WHEN the stored `mr.controls` record has no `pad` key, or a `pad` value that is not an object, THE SYSTEM SHALL use `PAD_DEFAULT_BINDINGS` and keep the keyboard table it parses today.

- **gp-5.2:** WHEN one stored pad entry is invalid (not a list, longer than one, a reserved, negative, fractional or duplicate index), THE SYSTEM SHALL replace only that entry with its default minus every index another entry already claims.

- **gp-5.3:** WHEN parsing would leave a protected button with no pad index, THE SYSTEM SHALL use `PAD_DEFAULT_BINDINGS`.

- **gp-5.4:** WHEN a pad remap is saved and then a keyboard remap is saved, or the other way round, and the page reloads, THE SYSTEM SHALL load both remaps.

- **gp-5.5:** WHEN a capture on a Pad cell receives a pad index another row holds, THE SYSTEM SHALL swap the two rows' pad buttons and name both in the outcome line, and SHALL refuse a swap that would leave a protected button with no pad button.

- **gp-5.6:** WHILE a Pad cell waits for a press, THE SYSTEM SHALL route no pad press to the router or to an accelerator, and SHALL ignore every key except Escape and the Cancel chip's activation.

- **gp-5.7:** WHILE a Key cell waits for a press, THE SYSTEM SHALL ignore every pad press.

- **gp-5.8:** WHEN a Pad cell's capture receives the reserved index 16, THE SYSTEM SHALL keep waiting and show the refusal line.

- **gp-5.9:** WHEN a pad remap is applied while the captured button is still held, THE SYSTEM SHALL drive the game with the new table at once and act on that button only after it is released and pressed again.

- **gp-5.10:** WHEN a player opens Controls with the mocked pad only, moves to the Pad cell of Confirm (A), presses A to capture and then presses pad button 3 and holds it for 300 ms, THE SYSTEM SHALL show Y's glyph on that cell with no second capture started, swap Info (Y) onto button 0, and confirm the next menu choice with button 3 (`pad-controls.spec.ts`).
- **gp-5.11:** WHEN Reset all is confirmed, THE SYSTEM SHALL restore both the keyboard table and `PAD_DEFAULT_BINDINGS`, and save both.
- DoD: gp-5.1 to gp-5.11 green; `remap.spec.ts` still green; `just ci` green.

### gp-6 — hold edges: Hold Y clears a READY plan

type: feature · tier: hard
touches: client/src/input/router.ts, client/src/input/router.test.ts, client/src/ui/nav.ts, client/src/ui/screens/battleScreen.ts, client/src/ui/screens/battleScreen.test.ts, client/src/ui/screens/index.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/tactics/deployPanel.ts, client/src/tactics/strings.ts, client/src/tactics/strings.test.ts, client/src/main.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/pad-battle.spec.ts
after: [gp-3, gp-5]
- Source-agnostic: a held F key and a held pad Y are the same edge pair. Ordered after gp-3 (it adds
  a case to `pad-battle.spec.ts`) and gp-5 (`main.ts` and the catalogs).
- Contract: `HOLD_MS = 500` (router.ts); `NavInput` gains `hold?: true`; `RouteContext` gains
  `hold?: ReadonlySet<VButton>` — the top frame's hold-capable buttons, timed on `nav.now` (the
  battle base is nav-capable, so `nav` is present whenever a hold can arm). A press of a listed button is consumed and delivered to no screen yet; `tick` asks the
  screen once with `{ button, repeat: false, hold: true }` when it has been held `HOLD_MS`; a release
  before that delivers the tap `{ button, repeat: false }` at the release; a release after the hold
  is swallowed. Arming is per button, not per source: a second down edge while armed is ignored, and
  the first release ends it. `resetRepeat`, `releaseAll`, or a tick whose `hold` no longer
  lists the button disarms it with nothing delivered.
- main.ts sets `hold = {'Y'}` only while the tactical battle base is the top frame, the
  shell's input mode is idle or its root menu, and it offers Clear plan (`offers(ctx).cancel`); else
  it omits `hold`. `BattleOp` gains `{kind: 'holdHint'}` (a Y tap) and `{kind: 'clearPlan'}` (a Y
  hold). `TacticsBattle` answers `holdHint` with the ticker line `tactics.ticker.holdToClear` (through
  `tactics/strings.ts`) only while it offers Clear plan, and
  `clearPlan` through one `#clearPlan(unitId)` that the confirmed Clear plan row also calls (the
  `onCancelQueue` call, the in-flight entry dropped, the mode back to idle). The deploy panel, the
  other `BattleOpsView`, ignores both ops (its exhaustive `op.kind` switches gain the two arms).
- Intentional test changes: the host and adapter rows that pin "a bare battle base leaves Y
  unhandled" (`index.test.ts`, `battleScreen.test.ts` CTL8I-1) change to the Y ops; no other
  adapter's tests change.
- Hold B: `decision-defaulted:hold-b=press-time-skip` — B is never listed, so the shipped skip at
  the press is unchanged.

- **gp-6.1:** WHEN a button the context lists as hold-capable has been held for `HOLD_MS` under the same top frame, THE SYSTEM SHALL ask that frame's adapter exactly once with a hold input, deliver nothing at its release, and deliver nothing more until it is released and pressed again.

- **gp-6.2:** WHEN a hold-capable button is released before `HOLD_MS`, THE SYSTEM SHALL deliver one tap input at the release and no hold input.

- **gp-6.3:** WHEN a button the context does not list as hold-capable is held for any time, THE SYSTEM SHALL deliver its press at the press as today and no hold input.

- **gp-6.4:** WHEN the frame changes, or the context stops listing the button, before `HOLD_MS`, THE SYSTEM SHALL deliver neither a hold nor a tap for that press.

- **gp-6.5:** WHEN two sources both press a hold-capable button while it is armed, THE SYSTEM SHALL keep the first press's timer, and the first release SHALL end the press.

- **gp-6.6:** WHILE the tactical shell offers Clear plan, WHEN Y is pressed and released before `HOLD_MS`, THE SYSTEM SHALL show the "Hold Y to clear the plan" ticker line and leave the plan untouched.

- **gp-6.7:** WHILE the tactical shell offers Clear plan, WHEN Y is held for `HOLD_MS`, THE SYSTEM SHALL send `cancel_queue` once for the selected unit without the confirm row, and a plan submitted for that unit afterwards SHALL reach the server.

- **gp-6.8:** WHILE an aim, a sub-list or the main menu is open over the tactical battle, WHEN Y is held for `HOLD_MS`, THE SYSTEM SHALL NOT clear any plan.

- **gp-6.9:** WHEN, in a wild tactical battle on the mocked pad only, the player pre-queues a plan for a unit during the wild's turn, submits it with Start, and holds pad Y for 600 ms, THE SYSTEM SHALL clear that unit's plan on the server (`pad-battle.spec.ts`).
- **gp-6.10:** WHILE the tactical shell does not offer Clear plan, WHEN Y is pressed or held, THE SYSTEM SHALL show no hint and change nothing.
- DoD: gp-6.1 to gp-6.10 green; the named bare-battle Y rows changed, every other adapter's tests unchanged and green; `just ci` green.

## Risks

- **Browser gamepad quirks.** Chromium and Firefox expose a pad only after its first button press
  on the page (a fingerprinting guard), and a hidden tab reads no pad data: the first press after a
  reload may do nothing but make the pad visible. Accepted; the playtest pass records it.
- **Secure contexts.** Chromium exposes the Gamepad API only to secure contexts (verify at gp-2's
  plan step). A browser reaching a friends server over plain-http LAN would see no pads (gp-2.6
  keeps it playable on keys); M-local-play's friends transport (`lpw-18`, TLS at the gate) is the
  path that keeps pads working there.
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
  orphan to its follow-up R-gp-spec-NOTED8195D; `glyphs.ts` `resetLearnedKeys` is a test-reset
  hook kept on purpose. `signals` rows (churn) on `main.input.test.ts`, `main.hintBar.test.ts`,
  `main.remap.test.ts`, `router.test.ts` and `hintBarModel.test.ts`, and a source-text signal on
  `controlsView.test.ts`: each is in the touching slice's `touches:`; a source-text assertion that
  gp-5's change breaks is replaced by a behaviour test, per `standards/testing-tdd.md`.
