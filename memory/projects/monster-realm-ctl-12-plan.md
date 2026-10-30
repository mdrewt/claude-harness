# ctl-12 plan — remapping core: binding store, glyphs, controls model, live table at boot

Worktree `.claude/worktrees/ctl-12` (branch `ctl-12`, from origin/master 2bb14ddc).

## Sizing / hidden dependency (decided in PLAN)

A new `controlsView` OverlayId (spec-mandated) REQUIRES files outside `touches:`:
- `client/src/ui/contextStack.ts` — `SCREEN_POLICY: Record<FrameId, ScreenPolicy>` is total; a new
  OverlayId fails client-typecheck without a row.
- `client/src/ui/menuModel.ts` — `MenuTarget` union + the Options group's `controls` leaf (the only
  way "Options › Controls opens").
- Likely also `client/src/ui/overlayA11yWiring.test.ts` (total shell roster),
  `client/src/indexShell.smoke.test.ts`, `client/src/main.menu.test.ts` (menu-tree pins).

So this slice ships the functional core + boot wiring, all inside `touches:`, and DEFERs the view
gates (CTL12.1, CTL12.6) to a follow-up (`ctl-12b`, to be serialized by the supervisor with the
files above added to its touches). 5 of 7 gates met; 2 deferred (< half).

## Increment (in scope)

1. `client/src/input/bindingStore.ts` (new, pure + injected storage)
   - `CONTROLS_STORAGE_KEY = 'mr.controls'`.
   - `parseBindings(raw: unknown): Bindings` — TOTAL. Not a plain object, or `v !== 1` → `DEFAULT_BINDINGS`.
     Per entry (each VButton in `buttons`, each Accel in `accels`): valid = array of ≤ 2 distinct,
     non-empty strings (length ≤ 32), none in `RESERVED_CODES`; an accel entry may be `[]` (cleared),
     a button entry may be `[]` only if not protected. Invalid/missing entry → that entry's default.
     Then the shared-namespace invariant: walking VBUTTONS then ACCELS, a code already claimed by an
     earlier entry is dropped from the later one. If a protected button (Up, Down, Left, Right, A, B,
     Start) ends with no code → `DEFAULT_BINDINGS` whole. Returned objects frozen.
     Own-property reads only (`Object.hasOwn`) — no prototype keys (`__proto__`, `constructor`).
   - `loadBindings(storage: StorageLike | null): Bindings` — try { getItem → null ⇒ defaults; JSON.parse;
     parseBindings } catch ⇒ defaults.
   - `saveBindings(storage: StorageLike | null, b: Bindings): boolean` — try setItem(key,
     JSON.stringify({v:1, buttons, accels})) ⇒ true; catch / null storage ⇒ false.
   - `browserStorage(): StorageLike | null` — `try { return window.localStorage } catch { return null }`
     (the property read itself can throw SecurityError).
   - `StorageLike = Pick<Storage, 'getItem' | 'setItem'>`.
   - `PROTECTED_BUTTONS` lives in `bindings.ts` (shared by store + model).
2. `client/src/input/glyphs.ts` (new)
   - Module map of learned keys. `learnKey(code, key, mods?)`: records `key.toUpperCase()` only when it is
     one printable char (length 1, not ' '), no Ctrl/Alt/Meta/Shift held. `glyph(code)`: learned key,
     else catalog name: a `KEY_NAMES: Readonly<Partial<Record<KeyCode, () => string>>>` of thunks over
     literal ids for named keys (Enter, NumpadEnter, Backspace, Space, Escape, arrows, PageUp/PageDown,
     Slash at least), else derived `KeyX`→`X`, `DigitN`→`N`, `F<n>`→`F<n>`, else the code itself.
     `recordCapture(code, key)` = learnKey (a capture records its e.key). `resetLearnedKeys()` for tests.
   - AZERTY: `learnKey('KeyW','z')` then `glyph('KeyW') === 'Z'`.
3. `client/src/ui/controlsModel.ts` (new, pure)
   - `CONTROLS_TABS = ['buttons','shortcuts']`; `controlsRows(tab)` = VBUTTONS (12) | ACCELS.
   - `slots(b, row)` → `[primary | undefined, alt | undefined]`.
   - `capturePrompt(row)` → "Press a key for {button}…" (catalog, per-row label thunk).
   - `captureKey(b, target, key: {code, key, ctrlKey?, altKey?, metaKey?, shiftKey?})` → outcome:
     `refused{reason:'reserved'}` for RESERVED_CODES (Tab incl. Shift+Tab, F5, F11, F12, bare modifiers)
     and any Ctrl/Alt/Meta chord; `cancelled` when the code equals the slot's current code (or, for an
     empty slot, the row's other slot code); `bound{bindings}` when free; `swapped{bindings, other}` when
     bound elsewhere (any row, either namespace, incl. same row other slot): target slot takes the code,
     the other location takes the target's old code (or loses it when the target slot was empty);
     `refused{reason:'protected'}` if the result empties a protected button. Escape/Enter/Backspace are
     ordinary keys here. Never mutates its input.
   - `clearAccel(b, accel)` → `accels[accel] = []` (button rows: no clear — not exported for buttons).
   - `resetAll()` → `DEFAULT_BINDINGS`; `RESET_CONFIRM_DEFAULT = 'no'`.
   - `outcomeText(outcome)` → catalog text: reserved reason, protected reason, "Swapped: {a} is now
     {x}, {b} is now {y}" with glyph keycaps, bound/cleared lines.
4. `client/src/main.ts` — boot: `const bindings = loadBindings(browserStorage())`; it replaces
   `DEFAULT_BINDINGS` in `new KeyboardSource`, `accelForCode`, `screenCtx.bindings`, and the A keycap
   (`interactKeycap` → `glyph(bindings.buttons.A[0])`). keydown calls `learnKey(e.code, e.key, mods)`. F9/F8 are decided through the live table
   (`accelForCode(bindings, e.code) === 'F9'`), so a cleared or remapped F8/F9 tells the truth.
5. Catalogs (`catalog.en.ts`, `catalog.fr.ts`, `messageIds.ts`): `key.*` names, `controls.button.*`,
   `controls.accel.*`, `controls.capture.prompt`, `controls.refused.*`, `controls.swapped`, … with @desc.

## Functional core / shell

Core: bindingStore.parseBindings, controlsModel (all pure), glyph name table. Shell: main.ts boot read,
learnKey on keydown, `browserStorage`. No DOM in core.

## Anti-patterns avoided

No source-text scans (behaviour tests only); no second binding table; reject-don't-clamp in capture
(refused outcomes, never silent correction); storage access never throws out.

## Out of scope (DEFER)

- CTL12.1 (the Options › Controls frame: tabs, rows, A starts capture) → needs contextStack.ts + menuModel.ts.
- CTL12.6 (remap A→K via UI, reload, hints) + `remap.spec.ts` + `controls.ts` live-table `pressButton`.
- `controlsView.ts`, `optionsScreen.ts`, `screens/index.ts`, `overlayRegistry.ts` entries.
- live rebinding without reload (KeyboardSource keeps a constructor table; the view slice adds a setter).

## Tests (tester-authored, red first)

- `input/bindingStore.test.ts` — parse totality (fast-check over arbitrary JSON), per-entry fallback,
  unknown v, prototype keys, duplicate dropping, protected-empty ⇒ defaults, load/save round trip
  `{v:1,buttons,accels}` under key `mr.controls`, throwing storage ⇒ defaults/false, null storage.
- `input/glyphs.test.ts` — catalog names, derived letters/digits/F-keys, learned override (AZERTY),
  modifier/Dead/space not learned, unknown code falls back to the code, fr locale names.
- `ui/controlsModel.test.ts` — 12 button rows / shortcut rows, prompt text, reserved refusal + reason,
  chord refusal, Escape/Enter/Backspace accepted, cancel rules, swap across namespaces + message,
  protected refusal (incl. via swap), clearAccel unbinds both slots, accelForCode(result, code) undefined.
- `main.remap.test.ts` (sibling of main.ts, touches-delta) — seeded `localStorage['mr.controls']`
  with A=[KeyK] (Enter freed) boots: K acts as A, Enter does not; a cleared accel (I=[]) opens nothing;
  corrupt storage boots with defaults; the A keycap chip shows the learned/bound key.
