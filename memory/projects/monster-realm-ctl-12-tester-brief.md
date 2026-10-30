# ctl-12 tester brief (red phase)

Worktree (write ONLY here): /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ctl-12
Plan (the contract): /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-ctl-12-plan.md
Spec: /home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-postgate-console-controls.spec.md `### ctl-12`
Gate ledger (tags you MUST use): /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/gates/ctl-12.gates.md

Write exactly these four test files (no implementation files; do not create the modules):
- client/src/input/bindingStore.test.ts
- client/src/input/glyphs.test.ts
- client/src/ui/controlsModel.test.ts
- client/src/main.remap.test.ts

## Tag rule (gates parse the vitest JSON)
Each required tag appears in EXACTLY ONE passing test's full name, as the title PREFIX followed by a
colon, e.g. `it('CTL12-4-SAVE-SHAPE: saves {v:1, buttons, accels} under mr.controls', …)`. A tag must
not be a prefix of another tag's text (they are already prefix-free; keep it that way). Untagged extra
tests are welcome. No `.skip`, `.todo`, `.only`, `.fails`.

Tags per file:
- bindingStore.test.ts: CTL12-4-SAVE-SHAPE, CTL12-4-ROUND-TRIP, CTL12-4-STORAGE-THROWS, CTL12-4-PARSE-TOTAL, CTL12-4-PARSE-PER-ENTRY, CTL12-4-UNKNOWN-V, CTL12-4-PARSE-HOSTILE
- glyphs.test.ts: CTL12-5-CATALOG-NAME, CTL12-5-LEARNED-AZERTY, CTL12-5-CAPTURE-RECORDS, CTL12-5-NO-JUNK-GLYPH
- controlsModel.test.ts: CTL12-2-ACCEPT-ESC-ENTER-BKSP, CTL12-2-REFUSE-RESERVED, CTL12-2-REFUSE-CHORD, CTL12-2-CANCEL-SAME-KEY, CTL12-2-CANCEL-EMPTY-OTHER-SLOT, CTL12-2-REFUSE-UNBINDABLE, CTL12-3-SWAP-BUTTONS, CTL12-3-SWAP-ACROSS-NAMESPACE, CTL12-3-SWAP-MESSAGE, CTL12-3-REFUSE-PROTECTED, CTL12-3-INVARIANT-PROPERTY, CTL12-7-CLEAR-BOTH-SLOTS, CTL12-7-CLEARED-KEY-UNBOUND
- main.remap.test.ts: CTL12-4-BOOT-LOADS, CTL12-4-BOOT-CORRUPT-DEFAULTS, CTL12-7-BOOT-CLEARED-ACCEL-INERT, CTL12-5-BOOT-LEARNS-KEYCAP

## Module contracts (import exactly these names)

### `client/src/input/bindings.ts` (exists; ADDS one export)
- existing: `Bindings`, `KeyCode`, `DEFAULT_BINDINGS`, `RESERVED_CODES`, `buttonForCode`, `accelForCode`.
- NEW `PROTECTED_BUTTONS: readonly VButton[]` = Up, Down, Left, Right, A, B, Start.

### `client/src/input/bindingStore.ts` (new)
- `CONTROLS_STORAGE_KEY = 'mr.controls'`
- `type StorageLike = Pick<Storage, 'getItem' | 'setItem'>`
- `parseBindings(raw: unknown): Bindings` — total, never throws. Non-object / array / null, or `raw.v !== 1` (own property) → equals DEFAULT_BINDINGS. Per entry of `raw.buttons[VButton]` / `raw.accels[Accel]` (own properties only): valid = array of ≤ 2 DISTINCT non-empty strings each ≤ 32 chars, none in RESERVED_CODES. A valid accel entry may be `[]`; a protected button's `[]` is invalid. Invalid or missing entry → that entry's DEFAULT list. Then shared namespace: walking VBUTTONS order then ACCELS order, a code already claimed by an earlier entry is dropped from the later entry. If a protected button then has no code → the whole result equals DEFAULT_BINDINGS. Missing `buttons`/`accels` objects → all-default for that side.
- `loadBindings(storage: StorageLike | null): Bindings` — getItem(CONTROLS_STORAGE_KEY); null/absent → defaults; JSON.parse + parseBindings; ANY throw (getItem throws, bad JSON) → defaults. null storage → defaults.
- `saveBindings(storage: StorageLike | null, b: Bindings): boolean` — setItem(CONTROLS_STORAGE_KEY, JSON.stringify({ v: 1, buttons, accels })) → true; setItem throws (quota) or null storage → false, never throws.
- `browserStorage(): StorageLike | null` — window.localStorage, or null when reading it throws.
- Round trip: `loadBindings(s)` after `saveBindings(s, b)` deep-equals `b` for any b a valid capture sequence can produce (fast-check over sequences of `captureKey`/`clearAccel` from controlsModel is ideal; at minimum several hand-built tables).
- PARSE-TOTAL: fast-check `fc.anything()` / `fc.jsonValue()` never throws and always yields a table where every protected button has ≥1 code, no code repeats across buttons+accels, no reserved code, no list longer than 2.

### `client/src/input/glyphs.ts` (new)
- `glyph(code: KeyCode): string` — synchronous. The key learned for the code, else a catalog name for named keys (`Enter`, `NumpadEnter`, `Backspace`, `Space`, `Escape`, `ArrowUp/Down/Left/Right`, `PageUp`, `PageDown`, `Slash` at minimum; read through `t()` so the active locale applies — en `Enter` is the existing `'key.enter'` = "Enter"), else derived: `KeyQ` → "Q", `Digit7` → "7", `F9` → "F9"; else the code string itself.
- `learnKey(code: KeyCode, key: string, mods?: { shiftKey?, ctrlKey?, altKey?, metaKey? }): void` — records `key.toUpperCase()` for `code` ONLY when `key` is exactly one printable character (string length 1 after no normalisation, not a space or control char) and no modifier in `mods` is true. Otherwise no change (e.g. 'Dead', 'Enter', 'Shift', '', 'ab', ' ' are ignored; a Shift-held '!' is ignored).
- `recordCapture(code: KeyCode, key: string): void` — the capture path; same filter as learnKey without modifiers.
- `resetLearnedKeys(): void` — test isolation.
- AZERTY: `learnKey('KeyW', 'z')` then `glyph('KeyW') === 'Z'`; before learning `glyph('KeyW') === 'W'`.
- Learned value never overrides a named-key name for codes whose key is not a single char (Enter etc. are never learned because e.key 'Enter' is multi-char).

### `client/src/ui/controlsModel.ts` (new, pure)
- `CONTROLS_TABS = ['buttons', 'shortcuts'] as const`; `type ControlsTab`.
- `type ControlsRow = { kind: 'button'; id: VButton } | { kind: 'accel'; id: Accel }`
- `controlsRows(tab): readonly ControlsRow[]` — buttons: the 12 VBUTTONS in order; shortcuts: every ACCELS entry in order.
- `type Slot = 0 | 1` (0 = Primary, 1 = Alt); `type SlotTarget = { row: ControlsRow; slot: Slot }`.
- `slots(b, row): readonly [KeyCode | undefined, KeyCode | undefined]`.
- `rowLabel(row): string` (catalog), `capturePrompt(row): string` — contains the row label, e.g. en "Press a key for Confirm (A)…".
- `interface CapturedKey { code; key; ctrlKey?; altKey?; metaKey?; shiftKey? }`
- `captureKey(b, target, k): CaptureOutcome` where
  `CaptureOutcome = { kind: 'refused'; reason: 'reserved' | 'protected' } | { kind: 'cancelled' } | { kind: 'bound'; bindings } | { kind: 'swapped'; bindings; other: SlotTarget; code: KeyCode; displaced: KeyCode | undefined }`.
  Rules: reserved code (RESERVED_CODES, so Tab = Shift+Tab, F5, F11, F12, bare modifiers) or any Ctrl/Alt/Meta held → refused 'reserved' (Shift alone is fine). Code equal to the slot's current code, or (empty slot) equal to the row's other slot code → cancelled. Code free → bound (target slot set; the slot's old code becomes unbound). Code held elsewhere (another row in either namespace, or the same row's other slot) → swapped: target slot takes the code, `other` takes the target's old code (`displaced`), or loses its code if the target slot was empty; if that leaves any protected button with no code → refused 'protected'. Escape, Enter, Backspace are ordinary keys (bindable). Never mutates `b` (deep-freeze input in tests). Writing to slot 1 of an empty-slot-0 row is allowed.
- `clearAccel(b, accel): Bindings` — both slots empty; `accelForCode(result, oldCode) === undefined`.
- `resetAll(): Bindings` — deep-equals DEFAULT_BINDINGS. `RESET_CONFIRM_DEFAULT === 'no'`.
- `outcomeText(outcome): string` — refused reserved / protected → a non-empty reason (distinct strings); swapped → en starts "Swapped:" and names both keycaps via `glyph()` and both row labels; bound → non-empty.

### main.ts wiring (main.remap.test.ts — copy main.accel.test.ts's harness: vi.resetModules + fresh import, the stubbed wasm pkg + connection, the real index.html shell, keydown then keyup 5 ms later)
- Seed `localStorage.setItem('mr.controls', JSON.stringify({v:1, buttons:{...defaults, A:['KeyK']}, accels:{...defaults}}))` BEFORE importing main.ts.
- BOOT-LOADS: with the menu open (Escape), K picks the entry under the cursor (observable: what the menu opens / the menu view paint), and Enter does NOT (nothing opens, not preventDefault-ed as an A press).
- BOOT-CORRUPT-DEFAULTS: `localStorage['mr.controls'] = '{not json'` (and separately a `getItem` that throws, via vi.spyOn(Storage.prototype,'getItem')) → main boots, Enter acts as A.
- BOOT-CLEARED-ACCEL-INERT: seeded `accels.I = []` → pressing KeyI opens nothing (no Bag) and is not prevented; another accel (KeyJ) still opens Journal. Also F9 cleared (`accels.F9 = []`) → F9 does not download the bug bundle (main.ts must route F8/F9 through the table too).
- BOOT-LEARNS-KEYCAP: with A bound to KeyK, a keydown whose `code:'KeyK', key:'k'` at the world makes the A keycap shown in the interaction chip (`interactKeycap`; see main.chips.test.ts for how the chip is observed) read "K"; if observing the chip needs a faced candidate the harness cannot provide, assert instead via glyph() from a fresh `import('./input/glyphs')` in the same module graph after the keydown (i.e. main.ts calls learnKey on keydown) — say which you chose.

Prove nothing by source-text scans. Assert outcomes. Keep each file self-contained. Run `npx tsc --noEmit -p client` is NOT available to you (static-only Bash); just make imports match the contracts above. When done, list each file, its test count, and per-tag one line on what the test asserts. Create /tmp/ctl-12-tester.done last.

## Amendments after plan review (these OVERRIDE anything above)

- bindings.ts also ADDS `isBindableCode(code: string): boolean` — true iff `/^[A-Za-z0-9]{1,32}$/` matches, the code is
  not `'Unidentified'`, and it is not in RESERVED_CODES. parseBindings uses it for every entry string; captureKey refuses
  (reason 'reserved') any code failing it. So `''`, `'Unidentified'`, `'__proto__'`, a 40-char code, a bidi/space-bearing
  code are never bound. CapsLock/ContextMenu/F1 ARE bindable ("any key").
- CapturedKey also has `isComposing?: boolean; keyCode?: number` — composing or keyCode 229 → refused 'reserved'.
- CTL12-2-REFUSE-UNBINDABLE: captureKey refuses '', 'Unidentified', '__proto__', a 33-char code, and a composing event.
- CTL12-4-PARSE-HOSTILE: nested nulls (`buttons:null`, `accels:[]`, `A:null`, `A:[null]`, `A:"Enter"`, `A:["KeyK","KeyK"]`),
  a JSON text with an own `"__proto__"` key (parse via JSON.parse; assert Object.prototype stays clean and the result
  equals the per-entry fallback), `A:["__proto__"]`, `A:["Tab"]`, `A:["Unidentified"]` → each falls back as specified; and
  the round-trip property `parseBindings(JSON.parse(JSON.stringify(b)))` deep-equals `b` for every table reachable by
  captureKey/clearAccel sequences from DEFAULT_BINDINGS (fast-check).
- Duplicate dropping during parse leaves the later entry with its remaining codes (possibly `[]` for a non-protected
  entry; not re-defaulted). Assert one such case (e.g. `A:["KeyF"]`, Y missing → Y is `[]`).
- Slot compaction: a row is a list; removing slot 0's code while slot 1 holds one shifts it to slot 0. Writing slot 1 of
  a row whose slot 0 is empty stores it as the row's only (primary) code. A displaced code lands in the SAME slot index
  the captured code came from (positions asserted, not just membership).
- Only D-pad, A, B, Start are protected (spec). A swap that empties Select or X is allowed — assert it once.
- DROPPED (YAGNI): `resetAll`, `RESET_CONFIRM_DEFAULT`, `recordCapture`. CTL12-3-RESET-ALL-DEFAULT-NO is replaced by
  CTL12-3-INVARIANT-PROPERTY: fast-check over random captureKey/clearAccel sequences (codes drawn from a pool incl. all
  default codes, reserved codes and fresh ones) — every resulting table has every protected button non-empty, no code
  twice across buttons+accels, no unbindable code, no list > 2.
- CTL12-5-CAPTURE-RECORDS: the capture path records through `learnKey(code, key)` (no mods); a later learn for the same
  code overwrites the earlier one.
- CTL12-5-NO-JUNK-GLYPH: learnKey ignores (glyph keeps its fallback): 'Dead', 'Enter', '', 'ab', ' ', NBSP '\u00a0',
  ZWSP '\u200b', '\u202e', '\u0301' (combining), a lone surrogate '\ud800', and 'ß' (uppercases to 'SS' → rejected; the
  rule is "exactly one char after uppercasing, matching /^[\p{L}\p{N}\p{P}\p{S}]$/u"). Numpad codes are never learned
  (learnKey('Numpad1','1') → glyph stays the numpad name, distinct from glyph('Digit1') === '1'). glyph('__proto__'),
  glyph('constructor'), glyph('toString') return the code string itself and never throw.
- Numpad names: `NumpadN` (digit) → a catalog name containing the digit and distinct from the bare digit (en "Num 1").
- main.ts: F9 / F8 are decided through the live table (a cleared F9 does nothing; assert in CTL12-7-BOOT-CLEARED-ACCEL-INERT).
  Scope the "Enter does not act as A" assertion to the main menu (other legacy views hard-code native activation; that is
  a recorded residual, not this slice's).
