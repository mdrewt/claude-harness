# ctl-12b plan — Options › Controls view (RESUMED 2026-10-04; touches widened in claude-harness#157)

Worktree `.claude/worktrees/ctl-12b` (branch `ctl-12b`, base origin/master 6d7d0a8c + one empty wip
commit 4e78dfe6; client/node_modules and client-wasm/pkg ready). Draft PR #570 is the park
placeholder: close it when the real PR opens.

Spec: `M-postgate-console-controls.spec.md` § ctl-12b (CTL12B.1, CTL12B.2). Design §9.
No new pure rules: rows, labels, prompts, outcomes come from the shipped `ui/controlsModel.ts`
(NOT in touches: read-only). `ui/screens/types.ts` is NOT in touches: no new `Command` arm, no
`ScreenContext` field. `styles.css` and `index.html` are NOT in touches: constructed shell, existing
classes only.

## Split (functional core / imperative shell)

### 1. `ui/screens/optionsScreen.ts` (NEW, pure, no i18n import) — `controlsScreen`
`ScreenAdapter<null, ControlsState, ControlsScreenView>`, `nav: true`, `viewModel: () => null`.

- Layout (static, exported `CONTROLS_LAYOUT`): `tabs([buttons, shortcuts])`.
  - `buttons`: `grid(cols 2)`, per `VBUTTONS` row the items `${id}_0` (Primary), `${id}_1` (Alt);
    then one last item `reset`. 12 rows x 2 + 1 = 25 items.
  - `shortcuts`: `grid(cols 3)`, per `ACCELS` row `${id}_0`, `${id}_1`, `${id}_clear`; then `reset`.
    Button rows have NO clear item (CTL12.7).
  - `controlsItem(tab, key)` decodes an item key to `{kind:'slot', target: SlotTarget} |
    {kind:'clear', accel} | {kind:'reset'} | undefined` (exported, used by the view's fill).
- State: `{ nav: NavState, capturing: SlotTarget | null, confirm: NavState | null,
  request: ControlsRequest | null }`; `ControlsRequest = {kind:'clear', accel} | {kind:'reset'}` is a
  one-shot token (a new object per press, compared by identity: the profileScreen RowOp precedent);
  every other step sets `request: null`.
- `onButton`:
  - capturing: `B` (not repeat) ends the capture unchanged (the shell's end-of-capture signal, and
    a pointer B later); `Start` pops to base; everything else `consumed`, state unchanged. Real
    keydowns never get here while capturing (the shell takes them first).
  - confirm (Reset all, Yes/No over `confirmLayout`, the cursor put on `no` by an explicit
    `navFocus`: `navInit` alone lands on `yes`): Up/Down move; A on
    `yes` emits `request {kind:'reset'}` and closes the confirm; A on `no` or B closes it; Start
    pops to base; rest `consumed`.
  - browse: Start `popToBase`; Select `toggleHelp`; B `pop`; D-pad / LB / RB via `navStep`
    (wrap fresh, clamp on repeat); A via `navStep` activate: slot -> `capturing = target`;
    clear -> `request {clear}`; reset -> `confirm`. A repeat never activates. X/Y `unhandled`.
- `paint(view, _vm, state)` -> `view.paint({ layout, nav, capturing, confirm, request })`.
- `captureStep(b, target, key: CapturedKey): { done, bindings | undefined, text, prevent }` — glue
  over `captureKey` + `outcomeText`: `done` for bound / swapped / cancelled; a refusal keeps
  waiting (`done:false`); `bindings` only for bound / swapped; `prevent` false only for a
  `reserved` refusal (Tab, F5, chords stay the browser's).

### 2. `ui/controlsView.ts` (NEW, DOM shell, happy-dom covered; NOT coverage-excluded)
Constructed (`ensureElement` + `frameAnchor()`, privacyView precedent). New OverlayId
`controlsView`. Handlers: `{ bindings: () => Bindings, onClear(accel), onReset(),
onCancelCapture(), announce(text) }`.

DOM contract (tests and e2e key on these):
- `#controls-overlay` root (`.mr-frame.mr-shell`), `display:none` hidden / `block` shown.
- `#controls-title` (h2) = `t('controls.title')`.
- `#controls-tabs` tablist via `renderTabs` (frame id `controls`): `#controls-tab-buttons`,
  `#controls-tab-shortcuts` (`role=tab`, `aria-selected`).
- `#controls-rows` nav container (`tabindex=0`, the a11y anchor = `initialFocusSelector`), via
  `renderNav`: `role=grid`, rows `[role=row]`, cells `[role=gridcell][data-nav-key]`, each slot cell
  also `data-slot="primary"|"alt"`; clear cells `data-slot="clear"`. Cell text (each cell names its
  row: the grid is read through `aria-activedescendant`, one cell at a time): Primary
  `tf('controls.slot.primary', {label: rowLabel(row), key})`, Alt
  `tf('controls.slot.alt', {label, key})`, `key` = `glyph(code)` or `t('controls.slot.none')`;
  Clear `tf('controls.clear', {label})`; reset `t('controls.resetAll')`. While the confirm is up the SAME container renders the Yes/No listbox
  (items `yes`, `no`; `aria-labelledby` the question).
- `#controls-capture` (prompt line = `capturePrompt(row)`, shown only while capturing) and
  `#controls-cancel-btn` (native button `t('controls.cancel')`, shown only while capturing, click ->
  `onCancelCapture`).
- `#controls-question` = `t('controls.reset.question')`, shown only while the confirm is up.
- `#controls-feedback` — outcome line, written only through `showFeedback(text)`.

API: `visible`, `capturing` (the last painted capture target; null when hidden), `show()`, `hide()`
(resets capture/confirm/feedback and the applied-token memory, `closeOverlayA11y`), `paint(p)`,
`showFeedback(text, saved = true)` (writes the line, appending `t('controls.saveFailed')` when
`saved` is false, and `announce`s it). No `refresh()`: the host repaints after every step.

`paint(p)` order (plan review): (1) `#capturing = p.capturing` FIRST, so a later throw cannot
leave the shell remapping keys for a capture the adapter left; (2) apply `p.request` ONCE (identity
compare): clear -> `saved = onClear(accel)` + `showFeedback(tf('controls.cleared', {label}), saved)`;
reset -> `saved = onReset()` + `showFeedback(t('controls.reset.done'), saved)`; (3) render from the
live table (so a Clear / Reset paints the new keycaps in the same paint, nothing re-enters).
Edges: capture start clears the feedback line and announces the prompt; confirm open announces the
question; capture end moves focus back to `#controls-rows` when the Cancel chip (about to hide)
held it. `tabindex=0` is set on `#controls-rows` in the constructor, not at the first paint.

### 3. Total tables (compile-forced)
`overlayRegistry.ts` (`OverlayId`, `OVERLAY_TIERS` GUARD_ONLY, `OVERLAY_A11Y` `{dialog,
'a11y.overlay.controlsView.title', '#controls-rows', true}`), `a11yCopy.ts` (title `Controls`),
`contextStack.ts` `SCREEN_POLICY.controlsView = PLAYER_DROP` (not battle-safe: the entry is
disabled over a battle; keeps "exactly five battle-safe ids"), `screens/index.ts`
(`controlsView: controlsScreen`), `menuModel.ts` (`MenuTarget` + Options children
`[help, controls]`, ids `menu.options.controls.title/desc`), main.ts probe / handle / screenViews
rows + `openMenuTarget` case. Controls goes AFTER How to play (design §5 lists it first):
`e2e/battle-dpad.spec.ts:414-417` and `encounter-battle.spec.ts` E0 (outside `touches:`) press A
on Options and expect the cursor on `help`. Flag the order in the PR.

### 4. `main.ts` (shell)
- `let bindings` / `let keyboard`; `screenCtx.bindings` becomes a getter.
- `applyBindings(next): boolean` (the save result): `saveBindings(browserStorage(), next)`;
  `releaseAllInput()`; swap `bindings` and `keyboard = new KeyboardSource(next)`. The interact
  chip already re-reads `glyph(bindings.buttons.A[0])` every frame.
- `openControls()`: `controlsView?.show(); seatOpened('controlsView')`.
- Capture intercept in `onKeyDown`, after the outside-game-screen, session-gate, chord and
  OS-repeat branches (so chords stay the browser's and a held key keeps today's repeat handling)
  and BEFORE the stale-focus heal, the accelerators, the Escape / typing branches and the router:
  when the top frame is `controlsView` and `controlsView.capturing !== null`: a key the focused
  element owns (`ownership(...) === 'target'`: Enter / Space on the focused Cancel chip) is left
  to it, so the chip is keyboard-operable (Tab is refused but still moves focus there); else
  `captureStep(bindings, target, e)` -> `preventDefault` when `prevent`; `saved = applyBindings`
  when it changed the table; `showFeedback(text, saved)`; when `done`, `navHeldCodes.add(e.code)`
  and end the capture through the adapter (`screenHost.button(stack, {button:'B', repeat:false},
  ctx)`, result discarded). Both the capture-
  phase Escape listener and the bubble listener funnel into `onKeyDown`, so Escape is captured like
  any key. `learnKey` already runs first for every keydown.
- Handlers: `onClear` -> `applyBindings(clearAccel(bindings, accel))`; `onReset` ->
  `applyBindings(DEFAULT_BINDINGS)` (both return the save result); `onCancelCapture` -> only while
  `controlsView.capturing !== null` and the frame is on top: feedback `outcomeText({kind:
  'cancelled'})` + the same end-of-capture B (in browse the adapter would answer B with a pop);
  `announce` -> `liveRegion.announce`.
- Typing mode is literal (design §3; red-team HIGH): `typingKey` (input/router.ts) also answers
  `'commit'` for Enter / NumpadEnter in a focused field (`INPUT` / `TEXTAREA` / `SELECT` /
  contenteditable, not composing). `onKeyDown` routes a `commit` as an A edge directly, never
  through the table, and a typing key is never an accelerator: after A := K, Enter still commits a
  nickname (K is typed by the field) and can never be Start or an accelerator there.
- The IME-Escape guard moves above the F8 / F9 accelerator branch (an Escape bound to F9 must not
  download a bundle on an IME cancel, nor let the field's own Escape close the frame).
- `RenameView` gets `bindings: () => bindings`.

### 5. `ui/renameView.ts`
`RenameCallbacks.bindings?: () => Bindings` (default `DEFAULT_BINDINGS`); the submit button's
routed set (D-pad + B codes) is read from it per keydown.

### 6. `e2e/controls.ts`
`pressButton` / `pressAccel` / `closeAll` read `localStorage['mr.controls']` through
`parseBindings` (page.evaluate for the raw string), else `DEFAULT_BINDINGS`. The read is wrapped:
a page whose storage throws (`about:blank` after `setContent`, as `e2e/controls.spec.ts` runs)
gives the defaults. `closeAll` re-reads Start on every press. An empty slot list throws a named
error instead of pressing `undefined`. `interactChip` takes an optional keycap.

### 7. i18n (en + fr + messageIds)
`controls.title`, `controls.tab.buttons`, `controls.tab.shortcuts`, `controls.slot.primary`
`{label,key}`, `controls.slot.alt` `{label,key}`, `controls.slot.none`, `controls.clear` `{label}`,
`controls.cleared` `{label}`, `controls.resetAll`, `controls.reset.question`,
`controls.reset.done`, `controls.cancel`, `controls.saveFailed`, `menu.options.controls.title`,
`menu.options.controls.desc` (15 ids: roster 336 -> 351). All literal at the call site; only `controlsView.ts` and
`menuModel.ts` gain call sites (main.ts gains none).

## Tests (tester-authored; tags are title prefixes `TAG: …`)
- NEW `ui/screens/optionsScreen.test.ts`: CTL12B-1-SCREEN-LAYOUT, -SCREEN-CAPTURE, -SCREEN-RESET,
  -SCREEN-CLEAR (+ `captureStep` cases).
- NEW `ui/controlsView.test.ts`: CTL12B-1-VIEW-ROWS, CTL12B-1-VIEW-PROMPT (+ token-once, hide
  resets, live-table refresh, a11y open/close).
- `main.remap.test.ts` (extend): CTL12B-1-BOOT-OPENS, CTL12B-2-LIVE-REMAP, CTL12B-2-RELOAD,
  CTL12B-2-KEYCAP, CTL12B-2-CAPTURE-ESCAPE.
- NEW `e2e/remap.spec.ts`: CTL12B-2-REMAP-FLOW.
- Roster / count pins (17 -> 18 overlays, 18 -> 19 frames, Options children, boot views, catalog
  roster): overlayRegistry / contextStack / overlayA11yWiring / overlayA11y / a11yCopy /
  announcements / screens/index / menuModel / mainMenuScreen / main.dispatch / indexShell.smoke /
  renameView tests.
- touches-delta (sibling tests, the ctl-10b / ctl-12 precedent): `ui/screens/optionsScreen.test.ts`,
  `ui/i18n/catalog.test.ts`, `ui/i18n/catalogParity.test.ts` (key roster 336 -> 351; resolver roster
  27 -> 28 with `ui/controlsView.ts`).

## Known shape, pinned by a test, not changed
- `reset` sits alone in the last grid row, so the D-pad reaches it through column 0 only (Up from
  the first cell wraps onto it; from another column, Left first). A test walks `navStep` from every
  cell to `reset`.
- "every hint SHALL show the new keycap" (CTL12B.2): the hints drawn from the table are the world
  interaction chip and its picker label. Two battle prose lines name literal keys
  (`battle.continueHint`, the swap hint) and live in `battleView.ts`, outside `touches:` ->
  residual, backlog [ux-a11y/LOW].
- A fully cleared accelerator row has no "press the same key" cancel (`captureKey`, shipped); the
  keyboard cancel there is Tab to the Cancel chip, then Enter.

## Residuals to flag in the PR (not built)
- Row / tab clicks (pointer) are ctl-15's dispatcher; this slice ships only the Cancel chip click.
- A Start key remapped off Escape is not capture-phase routed: on the rename Save button (which
  stops unrouted keys) it is inert there; B still pops. Parity with today's `KeyM`.
- Controls is not battle-safe (disabled in the menu over a battle).
