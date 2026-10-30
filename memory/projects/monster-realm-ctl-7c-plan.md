# ctl-7c plan — the screen-nav seam (D-pad delivery, shell-hosted adapter state, `healParty { locationId? }`)

Worktree `projects/monster-realm/.claude/worktrees/ctl-7c` (branch `ctl-7c`, from origin/master e32bb771).
Gates: CTL7C.1, CTL7C.2, CTL7C.3 (three seeded). Client-only; no schema, reducer, wasm or netcode change.
No screen is converted. The main menu stays on its hand-hosted path (`menuState` / `applyMenuStep`).

## Facts measured before planning

- `router.ts:151-165,186,196-204`: a D-pad edge is a `nav` effect only while `ctx.nav` is present and
  uncovered; `main.ts:1728-1741` sets `ctx.nav` from `menuPlace()` alone. `covered` is functionally the
  same as absent inside the router.
- `screens/index.ts:57-60`: `ask` always passes `nav = undefined`; `onButton` returns a bare
  `ScreenResult` (`types.ts:83-86`). No adapter state exists anywhere.
- `main.ts:1080-1090`: the `healParty` arm resolves `healTargetLocationId(store.healLocations())`.
- The legacy letter ladder (`main.ts:1916-2094`) owns none of the D-pad / A / B / Y codes, so the tail
  route (`main.ts:2097-2100`) already reaches the router for a non-menu frame. `navHeldCodes`
  (`main.ts:1857,1911`) is fed only by the menu intercept (`main.ts:1907`).
- Frames are pushed in exactly one place: the mirror loop in `syncStack` (`main.ts:515-518`).
  `reconcileStack` and `applyStack` only drop frames.
- Only `screen` frames are ever pushed (`contextStack.ts:134`); `prompt` and `textEntry` have rules but
  no producer, so a booted test cannot exercise them (pure tests do).
- `mainMenuScreen.ts:39` imports `ScreenStep` from `types.ts` — it stays.

## Design

### types.ts
- `Command`: `| { readonly kind: 'healParty'; readonly locationId?: number }`.
- `ButtonStep<S> = { readonly state: S; readonly result: ScreenResult }`.
- `ScreenAdapter<VM, S, V = unknown>`:
  - `readonly nav?: true` — nav-capable: the router delivers D-pad edges to this frame.
  - `viewModel(ctx): VM` (unchanged).
  - `init(vm): S` — the state a frame starts from each time it opens.
  - `onButton(vm, state, btn): ButtonStep<S>` (replaces the `NavState | undefined` parameter).
  - `paint?(view: V, vm, state): void` — the shell lends the frame's view instance; the adapter module
    imports the view class as a TYPE only, so pure adapter tests stay node-env.
- The table type becomes `ScreenAdapter<unknown, unknown>` (method syntax keeps it bivariant).

### legacyAdapter.ts
`ScreenAdapter<undefined, undefined>`: `init: () => undefined`; `onButton` returns
`{ state, result }` with the state it was given. No `nav`, no `paint`.

### screens/index.ts — `ScreenHost` (a class held by main.ts, like `InputRouter`; no module state)
```
new ScreenHost(adapters, viewOf: (id: FrameId) => unknown, onPaintError: (err: unknown) => void)
host.opened(frame: UpperFrame): void       // screen/prompt: forget that frame's state (reset on open).
                                           // textEntry: nothing (it types over its owner).
host.takesNav(stack): boolean              // top frame is screen|prompt AND its adapter has nav
host.button(stack, btn, ctx): ScreenResult // base -> baseButton; textEntry rules as today; else the
                                           // top frame's adapter with its stored state (init(vm) if
                                           // none), store the next state, paint once, return the result
```
- State is keyed by `FrameId`. `opened` only deletes: the next step starts from `init(vm)` (lazy), so
  nothing of an adapter runs inside `syncStack` (plan review: an eager open would read the store and
  could throw mid-batch, and its paint is overwritten by the same batch's legacy `render(vm)`).
- Paint happens once per step, with the lent view, the vm `onButton` saw and the NEXT state, even when
  the state is unchanged. Skipped when the adapter has no `paint` or `viewOf(id)` is `undefined`
  (views do not exist before `main()`). A `paint` that throws is handed to `onPaintError`; the state
  is already stored and the button's result is still returned (a broken view must not make B/Start
  unable to close its frame).
- `adapters` is a required constructor argument: no default-parameter binding a test cannot reach.
  `screenButton` (the free function) is replaced by `host.button`; `baseButton` and
  `SCREEN_ADAPTERS` stay exported.

### router.ts
`RouteContext.nav` gains `readonly screen?: boolean`: the uncovered nav frame is a nav-capable screen.
- D-pad down under it: arm the same repeat (`REPEAT_DELAY_MS` / `REPEAT_PERIOD_MS`, latest press
  repeats, release hands back), then ask `ctx.screen({ button, repeat: false })`. A `Command` becomes a
  `command` effect; `consumed` and `unhandled` are swallowed. Always consumed (page scroll).
- `tick`: the due repeat goes to `ctx.screen({ button, repeat: true })`, same translation.
- A / B / Y are NOT `nav` effects under it (`router.ts:186` guarded by `!nav.screen`): they reach
  `ctx.screen` by the existing tail path, so `battleButton` stays in front of every adapter call and an
  adapter's `unhandled` still leaves the key to the page.
- The menu path (`nav` effect) is untouched: no existing router test changes.
- `resetRepeat()` also forgets the held-press order (`#pressOrder`), not the holder counts: a key held
  since BEFORE a push or pop can no longer be handed the repeat when a newer key is released
  (plan red-team: hold Down at the world, a frame opens, tap Up -> Down repeated into the new frame;
  the same defect exists on the menu path today). CTL5-5-REPEAT-RESET keeps passing unmodified.

### main.ts (wiring only)
- `screenViews: Record<OverlayId, () => unknown>` — the view-lending table, one identical thunk per
  id (the `overlayProbes` pattern).
- `const screenHost = new ScreenHost(SCREEN_ADAPTERS, (id) => screenViews[id](), (err) => console.error(...))`.
- `syncStack` mirror loop: after `apply(edge)`, `if (edge.kind === 'push') screenHost.opened(edge.frame)`.
- `reconcileStack`: when the reconcile dropped a frame, `inputRouter.resetRepeat()` (a drop assigns the
  stack directly, so no mirror edge fires; a repeat armed under a dropped nav screen must not run into
  the frame it uncovers).
- `routeCtx`: `worldActive = movementGate()` first (it syncs). Then: menu on TOP -> the menu's `nav`
  (as today); else `screenHost.takesNav(contextStack)` -> `nav = { covered: false, now, screen: true }`
  (a nav screen normally sits OVER the covered menu, so this must come before the covered arm);
  else the menu's covered / absent value as today. `screen` closure:
  `battleButton(...) ?? screenHost.button(contextStack, btn, screenCtx)`.
- `onKeyDown` pre-ladder intercept: `menuPlace() === 'top' || screenHost.takesNav(contextStack)`, so
  `navHeldCodes` also cancels the OS repeats of a key a nav screen consumed.
- `healParty` arm: `command.locationId ?? healTargetLocationId(store.healLocations())`; the
  no-location report stays for the absent arm only.
- The seam comment (`main.ts:968-973`) is rewritten to the new contract.

### contextStack.ts
No change expected (`COMMAND_BATTLE_POLICY` is keyed by kind; `healParty` stays `refuse`).

## Explicitly NOT in this slice (found by the ctl-8a dry-run; surfaced, not built)
The seeded criteria are the scope. These are ctl-8a producer-side needs that live in `main.ts` /
`types.ts`; they go to the supervisor as residuals + a spec build note, for a re-serialization decision
before ctl-8a relaunches:
1. `boundShopId` / `boundHealLocationId` are `main.ts`-private (`main.ts:396-397`); a shop adapter
   cannot know its `shopId`, a heal adapter its bound location. Needs two `ScreenContext` getters.
2. `buy` / `sell` carry no quantity; `dispatch` hard-codes `SHOP_QTY = 1` (`main.ts:993,1094`).
3. The greet-then-shop choice opens the shop only through the click delegate
   (`main.ts:2544-2547`); A on that choice needs a `Command` arm.
4. Reduced-motion preference is `main.ts`-private (`main.ts:315`).
5. No paint when a frame opens and none after a store batch: a converted view draws its opening
   state from its screen's own `init(vm)` and keeps its last painted state for `main.ts`'s legacy
   `view.render(vm)` batch calls (solvable inside ctl-8 touches).
6. State is keyed by `FrameId` and reset only on a push edge: a conversation replaced inside one batch
   keeps its frame, so the dialogue adapter must key its own state on the node it was built for.
7. A synthesized repeat can carry a `Command` (the router translates every result the same way):
   an adapter must not act on `btn.repeat`, as `legacyAdapter` already does not.

## Tests (tester writes; orchestrator proves red)

Pure:
- `router.test.ts`
  - CTL7C-1-SCREEN-NAV-DPAD: D-pad down under `nav.screen` asks `ctx.screen` exactly once with
    `repeat:false`; a Command -> a consumed `command` effect; `consumed` / `unhandled` -> consumed, no
    effect; never a `dirDown` or a `nav` effect; the UP edge asks nothing; A / B / Y still go to
    `ctx.screen` and keep `unhandled` unconsumed; with `nav.screen` and no `ctx.screen` it is swallowed.
  - CTL7C-1-SCREEN-REPEAT: 350 ms then every 100 ms through `ctx.screen` with `repeat:true`; a Command
    answer is a `command` effect; a `consumed` answer does not stop the schedule; latest press repeats;
    release hands back; a stalled clock yields one ask; nothing repeats once `nav` is covered / absent.
  - CTL7C-1-RESET-NO-HANDBACK: press Down, `resetRepeat()`, press and release Up, tick at +350: nothing
    (menu flavour and screen flavour); the reset key's release is still reported.
  - CTL7C-1-LEGACY-UNCHANGED: without `nav.screen` a D-pad edge never asks `ctx.screen` (world ->
    `dirDown`, frame up -> swallowed). (The existing CTL6B-1 case stays unmodified.)
- `screens/index.test.ts`
  - CTL7C-1-NAV-CAPABLE: `takesNav` true for a screen and a prompt top whose adapter has `nav`; false
    for a legacy top, a nav frame that is covered, a text-entry top over a nav owner, a bare base.
  - CTL7C-2-STATE-THREADS: a never-opened frame stepped twice inits ONCE; each step receives the
    previous step's state; frames interleaved A, B, A with distinct states stay isolated; text-entry A
    threads the OWNER's state; the vm is built fresh per step (the stub returns a new object per call).
  - CTL7C-2-RESET-ON-OPEN: `opened(frame)` makes the next step start from `init` for that frame only;
    `opened` of a text-entry frame leaves its owner's state.
  - CTL7C-2-ONE-PAINT: exactly one paint per step with the lent view of THAT id, the same vm object
    `onButton` saw and the NEXT state (use a changing state), also when the state is unchanged; no
    paint when the view is undefined, on the base, or for an adapter without `paint`; a throwing
    `paint` reaches `onPaintError` once, the result is still returned and the state stored.
  - The seven CTL6B tests move to the new call shape (ADAPTERS-TOTAL re-homed onto
    `new ScreenHost(SCREEN_ADAPTERS, ...)`).
- `screens/legacyAdapter.test.ts` (sibling) — the four existing tests through the new return shape,
  plus pass-through: a non-undefined state (cast) comes back identical, and `init` is `undefined`.

Booted (`vi.mock('./ui/screens/index')` re-exporting the real module with a mutable copy of
`SCREEN_ADAPTERS`; main.ts hands the imported table to the host, so swapping an entry is live):
- `main.input.test.ts` — CTL7C-1-BOOT-DPAD: a nav-capable stub on one frame, opened (a) at the world
  and (b) OVER the open main menu: ArrowDown / KeyS reach its `onButton`, the menu cursor does not
  move, no move is sent, the key is prevented, repeats arrive at +350 / +450 on the frame loop; with
  the legacy table the same press reaches nothing and is still prevented; with the menu on top the
  menu still takes the D-pad; Down held under the stub, B pops it -> no menu cursor move at +350.
- `main.controls.test.ts` — CTL7C-2-BOOT-STATE: the stub's `paint` receives the REAL view instance of
  its frame (and, over the stubbed-view harness or a loop, each id's own instance for as many ids as
  the harness can show — name the ids left uncovered); states thread across presses; frames and
  batches do not reset; closing and reopening re-inits; one paint per press, none at open; an
  OS-repeat Enter after a consumed A is prevented.
- `main.dispatch.test.ts` — CTL7C-3-PRESENT (a stub adapter issues `healParty { locationId: 9 }` with
  pad 7 loaded first: the reducer gets 9; `locationId: 0` sends 0; present with no pad loaded still
  sends; at a battle base the present arm is refused), CTL7C-3-ABSENT (the existing Box row and the
  no-pad report stay), and the row table stays total.

Existing tests forced to change by the contract (named in the PR): `screens/index.test.ts` (all seven
CTL6B tests: stub shape + call form), `screens/legacyAdapter.test.ts` (all four, via its `ask` helper).
No router test changes.

## Traps
- Check the menu first in `routeCtx`; keep `resetRepeat` on every mirror edge.
- `??`, not `||`, in the `healParty` arm (`0` is a present id).
- `opened` must only delete: no adapter code inside `syncStack`.
- No `docs/DECISIONS.md` entry: the seam is explained by its types and tests (decisions.md bar).
- The `screenViews` thunks must each name their own view (a copy-pasted sibling type-checks).
