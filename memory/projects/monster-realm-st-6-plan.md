# st-6 plan — client shell: the boot-built view handles get an owner

Spec: `specs/monster-realm-v2/structure.spec.md` §st-6 (type: refactor · tier: hard).
Plan file: `docs/refactors/client-shell.md` (rules 1, 3, 4, 5, 7, 8; extraction 2).
Worktree: `projects/monster-realm/.claude/worktrees/st-6`, branch `slice/st-6`, base `ad877f4d`.
Baseline at base: `tsc --noEmit` clean; `vitest run src/main. src/shell/` = 32 files, 732 tests.

## Measured facts

- `client/src/main.ts` (5609 lines) declares the handles as module-level `let … | undefined`
  at lines 423, 506–544, 2425–2426. Every assignment is inside `main()` (4820–4937, 4974,
  5033, 5052); nothing else assigns them, and none is ever set back to `undefined`.
- **`tradeProposeView` does not exist at this base.** ts-3 (#730, merged after the plan st-2
  #722) replaced the propose wizard with the session editor: the binding in that slot is
  `tradeSessionView: TradeSessionView | undefined` (declared line 525, built at 4937). It is a
  boot-built view handle by the plan's rule 8 and module 2's stated responsibility.
- `tsconfig`: `strict`, `noUnusedLocals`; no `exactOptionalPropertyTypes`, no
  `verbatimModuleSyntax`.
- The view classes for 19 handles are loaded by `await Promise.all([import('./ui/…')])` inside
  `main()` (code-split). `EvolutionNoticeBanner`, `ErrorOverlayView`, `HintBarView` are static
  value imports of `main.ts`.
- Source-text pins on `main.ts`: `main.dispatch.test.ts` (bodies of `movementGate` /
  `worldBaseLive`; the `overlayProbes` / `overlayHandles` / `screenViews` literals),
  `net/connection.test.ts` (`applyClaim`, `joinGame`, `reducers[`),
  `ui/screens/mainMenuScreen.test.ts` (`menuState`). None reads a handle declaration or a
  boot assignment; the table rows keep their identifiers. No eval or script names a handle.
- The `main.*.test.ts` suites boot the real `main()` with the real view classes (they mock the
  wasm pkg, `net/connection`, telemetry and `render/world` only).

## What is built

### `client/src/shell/views.ts` (new)

- `import type` only — no runtime import, so no view module is pulled out of its lazy chunk
  and no shell module is imported (rule 7: module 2 imports none).
- 23 `export let <handle>: <Type> | undefined;` — the 22 listed handles that exist plus
  `tradeSessionView` (plan-delta below), each with the comment that describes it today,
  reworded where it named `main.ts`-local positions.
- `export interface ViewHandles` — one required member per handle, the mounted type
  (`controlsSavedLine: (text: string, saved: boolean) => string`).
- `export function mountViews(handles: Partial<ViewHandles>): void` — for each handle, in the
  declaration order: `if (handles.x !== undefined) x = handles.x;`. A handle the argument
  omits keeps its value; nothing ever unmounts.
- Module scope is inert (rule 5): declarations only.

### `client/src/main.ts`

- The 23 declarations and their comments leave. One import from `./shell/views` brings the 23
  handles and `mountViews`. Type imports that only the declarations used are dropped
  (`noUnusedLocals` names them).
- `main()` keeps every construction and handler closure where it is. Each former assignment
  statement becomes one `mountViews({ <handle>: <same expression> })` call in the same
  position, so a handle becomes readable at the same point of boot as today.
- Rule 3: the three Profile sections are built into locals (`nameSection`, `accountSection`,
  `privacySection`), each mounted right after its construction, and the Profile frame takes
  the locals. No other handle is used un-narrowed after its own assignment in `main()`
  (`hintBarView?.render(…)` is already optional).
- Every other reader (`RECONNECT_RESETS`, the tables, the openers, the frame loop, the DEV
  hooks) keeps its identifier and reads the live import.

### Docs

- `docs/refactors/client-shell.md`: extraction line 2 is deleted. The Owners row
  `tradeProposeView` is renamed to `tradeSessionView` (the binding `views.ts` owns) with its
  real readers.
- `ARCHITECTURE.md` §Client: one sentence for `shell/views.ts` beside the `shell/config.ts`
  one.

## plan-delta

- Spec lists `tradeProposeView`; built: `tradeSessionView` moves in its place. Evidence: no
  `tradeProposeView` binding exists in `main.ts` since ts-3 (#730); `tradeSessionView` occupies
  its declaration slot and its boot-mount slot, and rule 8 puts every boot-built view in
  `views.ts`. Leaving it would keep a boot-built view handle in `main.ts` that extraction 12
  (`screens.ts`) must read.

## Not in this slice (notes for the supervisor)

- `main.ts` bindings with no Owners row (added after st-2): `evolutionNoticeOk`,
  `boundTradeSessionId`, `pendingTradeOpen`, `knownSessionIds`, `resultsAwaitDrain`,
  `lastRendered`, `worldRevealed` (and the set `openedTradeSessions`). Their owner is an
  unrecorded design choice; they stay in `main.ts`. Owners rows with no binding:
  `boundProposeTarget`.

## Tests (tester; the implementer never edits them)

One new file, `client/src/shell/views.test.ts` (sibling test of a declared code file;
`touches-delta:`). No existing test file is edited; `client/test-util/mainBootHarness.ts` is
not edited (`views.ts` imports no wasm export). `moved-tests: none`.

1. **Boot seam (the red run).** A real boot of `../main` (the harness pattern of
   `main.help.test.ts`, the real `index.html` shell): afterwards every one of the 23 handles
   read from `./views` in the same module registry is an instance of its real view class
   (`controlsSavedLine` is the `ui/controlsView` module's `savedLine`); the Profile frame holds
   the three mounted sections; Select opens Help and `views.helpView.visible` turns true; the
   hint bar is painted before the first frame (the one handle `main()` reads right after its
   mount). A boot with no `#app` leaves the 20 `#app`-gated handles `undefined`; one with no
   `#hint-bar` leaves `hintBarView` `undefined`; `evolutionNoticeBanner` and `errorOverlayView`
   mount either way.
2. **`mountViews` takes the handles present (unit, one test).** Fresh import: every handle is
   `undefined`; mount one, then another: the first survives and the rest stay `undefined`.

Dropped at plan review: an inert-import test (nothing at runtime in a type-only module could
register a listener) and a 23-row mount-exactness table (each production call passes one key,
so test 1's per-handle class check already kills a mis-keyed or unguarded row).

Red run: at the base the file fails at import (`./views` does not exist). Green: after the
move, with every existing assertion unedited.

## Gates

- ST6.1 CHECK: `npm --prefix client run typecheck && client/node_modules/.bin/biome check . && git diff --exit-code $(git merge-base HEAD origin/master) -- 'client/src/main.*.test.ts' client/test-util && npm --prefix client run test -- src/main. src/shell/`
- ST6.2 CHECK: `npm --prefix client run test`.
- EXPECT (both): every file and every test passed, none skipped.
- Full `just ci` once, after the lens batch, and one `just e2e-shards` run (the plan file's
  rule for an extraction that moves boot wiring; `just ci` has no e2e target).

## Review adjustments (reviewer + red-team, plan phase)

- Owners row: `tradeSessionView | views.ts | main | main() boot: mount` — its three readers
  outside `main()` (`openTradeEditor`, `closeTradeEditor`, the trade-session batch listener)
  have no module in the map yet, so they count as `main`.
- `views.ts` states each handle type once: `ViewHandles` holds the types, each binding is
  `export let x: ViewHandles['x'] | undefined`.
- Spec gaps go to `mr-gates notes add --slice st-6` (structural findings are not residuals).
- `main.ts` type imports: ten lines leave (`DialogueView`, `EvolutionView`, `HealView`,
  `HelpView`, `ProfileView`, `QuestLogView`, `RaisingView`, `RenameView`, `ShopView`,
  `TradeSessionView`); six lose the view name and keep their second name (`BoxView`/`OutcomeLine`,
  `ClaimView`/`ClaimViewHandlers`, `ControlsView`/`ControlsViewHandlers`, `MenuView`/`MenuPointerInput`,
  `PrivacyView`/`PrivacyViewHandlers`, `SessionView`/`SessionViewHandlers`); `TradeView`, `PvpView`,
  `LeaderboardView` stay (the `socialPanelView` return type), as do the three value imports.

## Risks the lenses should attack

- A handle read at a point of boot where it used to be assigned but is now not yet mounted.
- A local shadowing an imported handle inside `main()`, so a closure reads the local.
- A value import in `views.ts` that drags a lazily loaded view module into the entry chunk.
- A mis-keyed row in `mountViews`.
- A type import left unused, or one dropped that is still used.
- Bundle: `scripts/verify-build-hooks.mjs` and the perf budget read the built bundle.
