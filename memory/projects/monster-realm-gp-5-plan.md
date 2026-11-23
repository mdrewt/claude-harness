# gp-5 plan — remap the pad in Controls, saved with the keyboard table

Spec: specs/monster-realm-v2/M-gamepad.spec.md §gp-5 · tier: hard · worktree `.claude/worktrees/gp-5`
from `origin/master` 8a2bf9e4 (gp-4 merged). Client-only, no schema, no server change.

## Functional core / imperative shell

Pure cores (no DOM, storage or module state): `input/bindingStore.ts` parsers, `ui/controlsModel.ts`
(capture rules, labels, outcome lines), `ui/screens/optionsScreen.ts` (layout, cursor, capture
target, step decode). Shell: `shell/inputState.ts` (the live tables, save + apply), `ui/controlsView.ts`
(paint), `main.ts` (wiring only: the capture hand-off in `pollPad` / `onKeyDown`, one shared
capture-settle path, the Controls handlers).

## Contracts (the tester's `## Contracts`)

### `client/src/input/bindingStore.ts`
- `parsePadBindings(raw: unknown): PadBindings` — TOTAL. `raw` is the record's `pad` value.
  Not a plain object (missing, null, array, number, string) → `PAD_DEFAULT_BINDINGS` (the same
  object). Otherwise the entries sit under `raw.buttons[VButton]` and `raw.accels[MenuAccel]` (the
  shape `saveBindings` writes; a flat `raw.A` is NOT read); per entry, buttons in `VBUTTONS` order then accels in `PAD_DEFAULT_BINDINGS.accels`
  key order (the ten `MenuAccel`s; a stored `F8`/`F9` or unknown key is ignored), own properties only:
  an entry is VALID when it is an array of length 0 or 1 (length 0 only for a non-protected row)
  whose element passes `isBindablePadIndex` and is not already claimed by an earlier VALID stored
  entry (one namespace across buttons and accels). Pass 1: valid stored entries claim their index.
  Pass 2: every invalid or missing entry becomes its default minus every index already claimed.
  If any `PROTECTED_BUTTONS` row ends empty → `PAD_DEFAULT_BINDINGS` (whole table, per gp-5.3 — even
  when a valid stored entry is what claimed the protected row's default). Result deep-frozen, every
  list a fresh copy (never the parsed JSON array). `MENU_ACCELS` is exported from `padBindings.ts`.
- `loadPadBindings(storage: StorageLike | null): PadBindings` — reads `mr.controls`; null storage,
  missing key, unparsable JSON, a throwing `getItem`, or `v !== 1` → `PAD_DEFAULT_BINDINGS`; else
  `parsePadBindings(own(record, 'pad'))`. `loadBindings` unchanged.
- `saveBindings(storage, b: Bindings, pad: PadBindings): boolean` — `pad` REQUIRED; writes
  `JSON.stringify({ v: 1, buttons: b.buttons, accels: b.accels, pad: { buttons: pad.buttons, accels: pad.accels } })`.

### `client/src/ui/controlsModel.ts`
- `export type PadRow = { readonly kind: 'button'; readonly id: VButton } | { readonly kind: 'accel'; readonly id: MenuAccel }`
- `export interface PadTarget { readonly row: PadRow; readonly slot: 'pad' }`
- `export type CaptureTarget = SlotTarget | PadTarget` (a target names its device: `slot === 'pad'`).
  `SlotTarget` and `Slot` unchanged.
- `export function padRow(row: ControlsRow): PadRow | undefined` — undefined for the F8 / F9 rows.
- `export function padSlot(pad: PadBindings, row: PadRow): PadIndex | undefined` — the row's pad index.
- `CaptureOutcome` becomes generic with defaults: `CaptureOutcome<T = Bindings, K = KeyCode, O = SlotTarget>`
  — `bound { bindings: T }`, `swapped { bindings: T; other: O; code: K; displaced: K | undefined }`;
  `refused` / `cancelled` unchanged. `export type PadCaptureOutcome = CaptureOutcome<PadBindings, PadIndex, PadTarget>`.
  `CaptureOutcome` with no arguments is exactly today's type.
- `capturePad(pad: PadBindings, target: PadTarget, index: PadIndex): PadCaptureOutcome` — mirrors
  `captureKey` with one slot: `!isBindablePadIndex(index)` → refused reserved; `index` is the row's own
  pad index → cancelled; free → bound; held by another row → that row gets the target's old index
  (or none), refused protected if any protected button ends with no pad index; else swapped
  `{ other: { row: holderRow, slot: 'pad' }, code: index, displaced: oldIndex }`. Never mutates.
- `padCapturePrompt(row: ControlsRow): string` → `controls.capture.padPrompt`.
- `padOutcomeText(o: PadCaptureOutcome): string` — the target row is found by looking `code` up in
  `o.bindings` (as `outcomeText`'s `holderOf` does); refused reserved → `controls.refused.padReserved`;
  protected → `controls.refused.padProtected`; cancelled → `controls.cancelled`; bound →
  `controls.bound`; swapped with `displaced` → `controls.swapped { key: padGlyph(code), label: target
  row, otherKey: padGlyph(displaced), otherLabel }`; without → `controls.swappedPadUnbound { key, label, otherLabel }`.
- `captureKey`, `outcomeText`, `capturePrompt`, `clearAccel` unchanged (Clear stays keyboard-only).

### `client/src/ui/screens/optionsScreen.ts`
- Cell keys: each button row `${id}_0`, `${id}_1`, `${id}_pad`; each accel row `${id}_0`, `${id}_1`,
  `${id}_pad`, `${id}_clear`; then `reset`. Buttons grid `cols: 3`, Shortcuts `cols: 4`. Every item
  `enabled: true` except `F8_pad` and `F9_pad` (`enabled: false`).
- `ControlsItem` gains `{ kind: 'noPad'; readonly row: ControlsRow }` (the F8 / F9 placeholder); a
  Pad cell is `{ kind: 'slot'; target: PadTarget }`. `ControlsState.capturing: CaptureTarget | null`.
- A on a Pad cell → `capturing: { row, slot: 'pad' }`; A on a placeholder → nothing (nav reports
  `disabled`; state unchanged); `onButton` also has an explicit `noPad` arm (consumed, nothing).
- `export interface CaptureResult<T> { done: boolean; bindings: T | undefined; text: string }`;
  `CaptureStep extends CaptureResult<Bindings> { prevent }` (shape unchanged).
- `padCaptureStep(pad: PadBindings, target: PadTarget, read: PadIndex | 'refused'): CaptureResult<PadBindings>`
  — `'refused'` → decoded as the outcome `{ kind: 'refused', reason: 'reserved' }` (one text mapping,
  `padOutcomeText`); else `capturePad` decoded as `captureStep` does (bound/swapped → done + table; cancelled → done,
  no table; refused → not done) with `padOutcomeText`.

### `client/src/ui/controlsView.ts`
- `ControlsViewHandlers.padBindings?: () => PadBindings` (optional like `textStep`; absent →
  `PAD_DEFAULT_BINDINGS`). `capturing` getter returns `CaptureTarget | null`.
- Pad cell text `tf('controls.slot.pad', { label, key })`, `key` = `padGlyph(index)` or
  `t('controls.slot.none')`; `data-slot="pad"`. Placeholder: the same text with `—`, `data-slot="pad"`,
  `aria-disabled="true"` (navRender, from `enabled: false`).
- While a Pad cell waits: `#controls-capture` and the announcement read `padCapturePrompt(row)`.
- Reset all's request calls `handlers.onReset()` (main.ts passes `resetAllBindings`).

### `client/src/shell/inputState.ts`
- `export let padBindings: PadBindings = loadPadBindings(browserStorage())` — the ONE pad table:
  the pad source is built over it and `keycap` reads it live.
- One private `applyTables(keys, padTable)`: `saveBindings(storage, keys, padTable)`, then
  `releaseAllInput()`, `bindings = keys`, `keyboard = new KeyboardSource(keys)`, `padBindings =
  padTable`, `pad.rebind(padTable)`; returns the save result (applies even when the save fails).
- `applyBindings(next)` = `applyTables(next, padBindings)` (every keyboard save carries the live pad table).
- `applyPadBindings(next: PadBindings): boolean` = `applyTables(bindings, next)` (saves both, releases
  everything, `pad.rebind(next)`: the held buttons latch, gp-1.11).
- `resetAllBindings(): boolean` = `applyTables(DEFAULT_BINDINGS, PAD_DEFAULT_BINDINGS)` (one save).
- Header comment updated: only this module assigns `bindings`, `keyboard`, `padBindings`, `lastSource`.

### `client/src/main.ts` (wiring only; no new `i18nT` key — main.ts's key roster is pinned)
- `controlsCapture(): CaptureTarget | null`.
- `settleControlsCapture<T>(step: CaptureResult<T>, apply: (next: T) => boolean): boolean` — the ONE
  outcome path, extracted from `captureControlsKey`: not done → `route('controls-refused', …showHint)`;
  no table → toast `controls-cancelled`; `apply` true → `controls-saved`; false →
  `controls-save-failed`; then `endControlsCapture()`. `captureControlsKey` = `captureStep` + prevent +
  settle(…, applyBindings) + `noteNavHeld(e.code)` when done.
- `pollPad`: after the session-gate check, a Pad target → `pad.capture()` instead of `pad.poll()`;
  `undefined` → nothing; else `noteInputSource('pad')`; focus outside the game screen → ignored (the
  read already latched it); else `pointerSource?.keyPressed()` and
  `settleControlsCapture(padCaptureStep(padBindings, target, read), applyPadBindings)`. A Key target
  keeps gp-2's rule (a press → `releaseAllInput()`, nothing routes).
- `pollPad` (no capture at the poll's start): `pressEdges(edges, stop)` stops routing after the
  edge that leaves `controlsCapture() !== null`; when a capture began during the poll, nothing more
  routes (no later edge, no accelerator) and `releaseAllInput()` lets go of everything held (so a
  button pressed in the same frame must be released and pressed again to be captured). Closes the
  same-poll hole for Key and Pad captures alike (gp-2 note; gp-5.6's "or to an accelerator").
- `onKeyDown` with a Pad target: the Cancel chip's own activation passes to the chip; `Escape` →
  `preventDefault` + `cancelControlsCapture()`; every other key is ignored: nothing bound, nothing
  routed, and `preventDefault` unless `isBindableCode(e.code)` is false (Tab, F5, F11, F12, a bare
  modifier stay the browser's, as the key capture's `prevent` does).
- Controls handlers: `padBindings: () => padBindings`, `onReset: resetAllBindings`.

### i18n (5 new ids, this slice's alone; catalog 565 → 570)
| id | params | en | fr |
|---|---|---|---|
| `controls.slot.pad` | `{label, key}` | `${label} (pad): ${key}` | `${label} (manette) : ${key}` |
| `controls.capture.padPrompt` | `{label}` | `Press a pad button for ${label}…` | `Appuyez sur un bouton de la manette pour : ${label}…` |
| `controls.refused.padReserved` | — | `That button cannot be bound.` | `Ce bouton ne peut pas être attribué.` |
| `controls.refused.padProtected` | — | `Movement, Confirm, Back and Menu must always keep a pad button.` | `Les déplacements, Valider, Retour et Menu doivent toujours garder un bouton de manette.` |
| `controls.swappedPadUnbound` | `{key, label, otherLabel}` | `Swapped: ${key} is now ${label}, ${otherLabel} has no pad button` | `Échangé : ${key} est maintenant ${label}, ${otherLabel} n’a plus de bouton de manette` |
(… is U+2026, ’ is U+2019, as the shipped neighbours.)

### `client/e2e/controls.ts`
- `livePadBindings(page): Promise<PadBindings>` — the same raw read as `liveBindings`, through
  `loadPadBindings` over a one-value storage; any failure → `PAD_DEFAULT_BINDINGS`. Pad-mode
  `pressButton` / `pressAccel` / `closeAll` press the LIVE pad table's first index.

## Test map (gate → suites; test titles end with `[gp-5.N]`)
- 5.1, 5.2, 5.3 — `bindingStore.test.ts` (fast-check totality + examples); 5.1 also `main.remap.test.ts`
  boot (a record without `pad` → pad defaults drive the pad, the keyboard remap kept).
- 5.4 — `bindingStore.test.ts` round trip + `main.remap.test.ts` (pad remap then key remap, re-boot
  `keepStorage`, both live; and the other order).
- 5.5 — `controlsModel.test.ts` (capturePad swap/refuse/outcome text) + `main.remap.test.ts` (toast).
- Cancel paths (`main.remap.test.ts`): Escape, the Cancel chip, a pointer click, the same pad button —
  each ends the Pad capture unchanged, and afterwards the next pad A acts exactly once and a direction
  held through the capture is not left stuck; an Escape keyup emits nothing further.
- 5.6 also: one poll holding A (on a Pad cell) and RT → the Bag does not open, the capture waits.
- 5.6, 5.7, 5.8, 5.9 — `main.remap.test.ts` over a fake pad (gp-2's `main.input.test.ts` helper, copied);
  5.9 also `inputState.test.ts` (applyPadBindings latches a held index; the new table drives at once).
- 5.10 — `client/e2e/pad-controls.spec.ts`.
- 5.11 — `inputState.test.ts` (`resetAllBindings`) + `main.remap.test.ts` (Reset all confirmed).
- Layout / view: `optionsScreen.test.ts`, `controlsView.test.ts`; catalog roster `catalog.test.ts`.

## Intentional changes to existing tests (named in the PR body)
- `optionsScreen.test.ts` layout pins (cols 2→3, 3→4; `_pad` cells; F8/F9 placeholders disabled).
- `controlsView.test.ts` shortcut row cells `[_0,_1,_clear]` → `[_0,_1,_pad,_clear]`.
- `main.remap.test.ts` `BUTTON_CELLS` / `SHORTCUT_CELLS`.
- `bindingStore.test.ts` / `inputState.test.ts`: `saveBindings` takes the pad table; a saved record
  also holds `pad`.
- `catalog.test.ts` roster 565 → 570.

## plan-delta
- `parsePadBindings` / `loadPadBindings` live in `bindingStore.ts` beside `parseBindings` (the store's parsers).
- A stored pad entry whose index an earlier entry claimed is INVALID (default minus claimed), per gp-5.2's
  list ("duplicate index"); the keyboard parser instead filters the code out of the later entry.
- `capturePad` returns `PadCaptureOutcome` = the generic `CaptureOutcome<PadBindings, PadIndex, PadTarget>`.
- `livePadBindings` beside `liveBindings` (its return type stays `Bindings`: remap.spec.ts reads it).
- gp-5.8's "the refusal line a refused key shows": the same strip path (`controls-refused` → `showHint`),
  worded for a pad (`controls.refused.padReserved`), since "belongs to the browser" is false for Guide.
- Reset all → `inputState.resetAllBindings()` (one save of both defaults).
- Clear stays keyboard-only (spec silent; "must not change" existing behaviour). Spec note filed.
- The same-poll hole (gp-2 note) is closed by the poll stop above (built, not per-edge capture of the
  same frame's press: that press is latched instead).
- Not built (spec-mandated; notes filed): a pad-only player in a KEY capture has no pad exit (gp-5.7);
  an EMPTY Pad cell has no unchanged exit for a pad-only player (every protected index is refused
  there); cross-tab saves overwrite the other tab's half (the whole-record write predates gp-5).
- Decisions: none minted. `pad-storage` stays `decision-defaulted` in the spec; its why goes in
  `bindingStore.ts`'s header comment. The DECISIONS.md "Client UI" entry's storage sentence stays true.

## Risks
- main.ts growth (wiring only, ~40 lines). gp-3 (parallel) adds only `pad-battle.spec.ts`; its pad-mode
  helpers keep working (default table).
- `ui-whole.spec.ts` (outside touches) measures the Controls/Shortcuts stop: a 4-column grid may
  overflow; run it locally.
- Layout change may break e2e specs outside touches that walk Controls with Right (ui-feedback X_1 is
  Right from X_0 — unaffected); the full e2e run in CI decides.
