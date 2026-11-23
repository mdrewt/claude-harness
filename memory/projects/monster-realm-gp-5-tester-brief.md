# gp-5 tester brief — pad remap in Controls (TDD red phase)

You write the GATING tests for slice gp-5 of monster-realm (browser client, TypeScript, vitest +
happy-dom, Playwright e2e). You do NOT implement the feature and you have no shell: the orchestrator
runs every test and proves each fails for the right reason. Write directly in the slice worktree:

  WT = /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/gp-5

## Sources of truth (read first)
- EARS criteria gp-5.1 … gp-5.11: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-gamepad.spec.md`,
  section `### gp-5` (and the gp-1 GamepadSource contract above it: `capture()`, `rebind()`, latching).
- `## Contracts` = the plan, `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-gp-5-plan.md`
  (sections "Contracts", "Test map", "Intentional changes to existing tests", "plan-delta"). Every name,
  signature, cell key, message id and exact en/fr string you call or pin is there. If the plan and the
  spec disagree, follow the plan and report it as a QUESTION.
- Current code under `WT/client/src/` (read it; do not edit any non-test file): input/bindingStore.ts,
  input/padBindings.ts, input/gamepadSource.ts, input/padGlyphs.ts, shell/inputState.ts,
  ui/controlsModel.ts, ui/screens/optionsScreen.ts, ui/controlsView.ts, main.ts (controlsCapture,
  captureControlsKey, cancelControlsCapture, onKeyDown's capture branch, pollPad, the Controls handlers).

## Files you may write (tests only)
- `client/src/input/bindingStore.test.ts` — gp-5.1, 5.2, 5.3 (fast-check totality: any `unknown` pad
  value parses to a table where every protected button has one bindable index, no index appears twice,
  every list has length ≤ 1; plus examples for each invalid kind: not a list, length 2, 16, -1, 1.5, 32,
  '0', NaN, a duplicate across button↔button, button↔accel and accel↔accel; a flat `{A:[3]}` pad value
  is NOT read; a stored F8/F9 pad accel is ignored; prototype keys ignored), `loadPadBindings` (null
  storage, throwing getItem, bad JSON, `v: 2`, no `pad` key), `saveBindings` 3-arg shape, and gp-5.4's
  round trip (save keys+pad, load both; then the other order).
- `client/src/input/padBindings.test.ts` — only if you pin the newly exported `MENU_ACCELS`.
- `client/src/ui/controlsModel.test.ts` — `capturePad` (bound, cancelled on the row's own index,
  swapped both ways incl. button↔accel, swap leaving a non-protected row empty, refused protected when
  the target row is empty and the holder is protected, refused reserved for 16 / 32 / -1 / 1.5),
  never mutates its input; `padOutcomeText` lines (names BOTH rows, pad glyphs from `padGlyph`);
  `padRow` (undefined for F8/F9), `padSlot`, `padCapturePrompt`. Tags gp-5.5 / gp-5.8.
- `client/src/ui/screens/optionsScreen.test.ts` — the layout (Buttons 3 cols `_0,_1,_pad`; Shortcuts
  4 cols `_0,_1,_pad,_clear`; `reset` last; only `F8_pad`/`F9_pad` disabled), A on a Pad cell starts
  `{row, slot:'pad'}`, A on a placeholder changes nothing, `padCaptureStep` decode (`'refused'` →
  not done + the padReserved line; bound/swapped → done + table; cancelled → done, no table).
- `client/src/ui/controlsView.test.ts` — Pad cell text/`data-slot="pad"` from the live
  `handlers.padBindings` (and `PAD_DEFAULT_BINDINGS` when the handler is absent), placeholder
  `aria-disabled="true"` with `—`, the Pad capture prompt in `#controls-capture` and the announcement,
  Reset all still calls `onReset`.
- `client/src/shell/inputState.test.ts` — `padBindings` loaded from storage at import; `applyPadBindings`
  saves both halves (raw JSON has `pad.buttons`/`pad.accels` and the live keyboard table), applies when
  the save fails (returns false), `pad.rebind` latches a held index (gp-5.9: no edge for it until
  released and pressed again; the next press uses the new table); `applyBindings` carries the live pad
  table; `resetAllBindings` (gp-5.11) restores and saves both; `keycap` after `noteInputSource('pad')`
  reads the live pad table. Use this file's existing import/boot pattern.
- `client/src/main.remap.test.ts` — over the booted shell, with a fake pad behind
  `navigator.getGamepads` (copy the pattern of `client/src/main.input.test.ts` ~lines 5042-5130:
  install as an own property of `navigator`, remove in teardown; mutate one object in place; drive
  frames with the harness `frame()`): gp-5.1 boot (record without `pad` → pad defaults drive the pad,
  keyboard remap kept), gp-5.4 (pad remap then key remap through the UI, re-boot `keepStorage`, both
  live; and the other order), gp-5.5 toast names both rows, gp-5.6 (while a Pad cell waits: pad LT /
  Start / Select / a D-pad press route nothing and open nothing — each is CAPTURED as the binding, so
  assert on routing and the stack, not on "table unchanged"; Enter, K and arrows bind nothing and
  route nothing; Escape cancels; the Cancel chip's activation cancels; ONE poll holding A on a Pad cell
  plus RT opens no Bag and leaves the capture waiting), gp-5.7 (while a Key cell waits, pad presses do
  nothing and the capture still waits), gp-5.8 (pad 16 → still waiting + the refusal line on
  `#controls-feedback`), gp-5.9 (bind while the captured button is held: frames with it held start no
  capture and route nothing; release + press acts with the new table; the old index now drives its new
  button at once), gp-5.11 (Reset all confirmed → both tables default and saved), and the cancel paths
  (Escape / chip / pointer click / same pad button: unchanged, then the next pad A acts exactly once,
  a direction held through the capture is not stuck).
- `client/src/ui/i18n/catalog.test.ts` — the 5 new ids in the roster (565 → 570) with their exact en
  and fr strings and param fixtures, in the file's existing tables (SAMPLE_PARAMS, EXPECTED_PLAIN and the
  French rows), `@desc` presence if the file pins it.
- `client/e2e/pad-controls.spec.ts` (new) — gp-5.10 exactly as worded: `installFakePad` before `goto`,
  `setPressSource(page, 'pad')`, open Controls on the pad only (Start, Down to `controls`, A — see
  `client/e2e/ui-controls.spec.ts` `openControls`), move to `A_pad`, A, `padHold(page, 3, 300)`; then
  `A_pad` shows Y's glyph, no capture is waiting (`#controls-capture` hidden), `Y_pad` shows A's glyph
  (index 0), and after leaving Controls the next menu choice is confirmed by pad button 3 (assert the
  stack). Also prove `pressButton(page, 'A')` in pad mode presses the LIVE pad table's index (3) —
  `client/e2e/controls.ts` gains `livePadBindings` (the implementer writes it; call only
  `pressButton`/`pressAccel`/`closeAll` and the plan's `livePadBindings`). Read `client/e2e/pad.ts`,
  `remap.spec.ts`, `pad-menu-flow.spec.ts` for patterns; remove `mr.controls` in a `finally` and close
  the browser in `afterAll` as remap.spec.ts does. One test, title ending `[gp-5.10]`.

## Intentional changes to existing tests
Only those the plan lists (layout pins in optionsScreen/controlsView/main.remap; `saveBindings` 3-arg
calls and saved-record shape; catalog roster count). Do not weaken any other assertion. In your report,
list every existing assertion you changed with its file:line, old → new, and why.

## Doctrine (repo scanners and conventions)
- Every new test title ends with its gate tag(s) as the LAST token(s): `… [gp-5.6]`, or several
  `… [gp-5.6] [gp-5.9]`. The supervisor counts passing tests per tag per file.
- Comments state current behaviour. Never put a criterion id (`gp-5.6`, `CTL12…`) in a COMMENT (ids
  only in test titles), and never history words in comments: "no longer", "the old", "used to", "was",
  "Was:". Describe a changed pin as what it pins now.
- `scripts/check-secrets.mjs` flags `(password|secret|api_?key)\s*[:=]\s*["'][^"']{8,}["']` on any line.
- Test files ARE typechecked (`tsc` over client specs): every call must match the plan's signatures.
- Each test must fail on the real defect, not on a typo: say in a `// WRONG IMPL KILLED:` comment which
  wrong implementation it kills (the repo's convention; see existing tests).
- No source-text scans, no fixed sleeps in e2e (poll observable state), no `.only`/`.skip`/`.todo`.
- A main.remap case that acks movement while a hold is committed re-issues a Step: do not ack while a
  direction is held past commit, or count the extra step.

## Report (your final message)
1. Files written / edited, and per file the test titles added with their tags.
2. Intentional changes to existing tests (file:line, old → new, why).
3. DEFECTS you found in the plan/spec contract (would make a correct impl impossible) and QUESTIONS
   (ambiguities you resolved, and how), apart from the tests.
4. For each test, the expected red reason before implementation (missing export, wrong layout, …).
