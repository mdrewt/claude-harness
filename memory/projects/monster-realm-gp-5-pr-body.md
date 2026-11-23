## gp-5 — remap the pad in Controls, saved with the keyboard table

The Controls screen gains a **Pad** column on the Buttons and Shortcuts tabs (`M-gamepad.spec.md` §gp-5). A pad remap is saved in the same `mr.controls` record as the keyboard table and applies at once. The change is client-only: no schema, no server, no game-core.

- **`client/src/input/bindingStore.ts`**:
  - `parsePadBindings(raw)` is total. A pad value that is not an object gives `PAD_DEFAULT_BINDINGS`. Its entries sit under `pad.buttons` and `pad.accels`, and only own keys of the ten menu accelerators are read (F8/F9 are ignored).
  - An entry is invalid if it is not a list, holds more than one index, holds a reserved, negative, fractional or out-of-range index, or holds an index an earlier entry already claimed. An invalid entry falls back to its default minus every claimed index.
  - If a protected button ends with no index, the whole table falls back to the defaults.
  - `loadPadBindings(storage)` reads the same record, and only a `v: 1` one. `saveBindings(storage, keys, pad)` now takes the pad table as a required argument and writes `{v:1, buttons, accels, pad:{buttons, accels}}`, so neither remap can drop the other.
- **`client/src/ui/controlsModel.ts`**:
  - `capturePad(pad, target, index)` applies `captureKey`'s rule in the pad namespace, with one pad button per row. The index the cell already shows cancels. An index held by another row swaps, unless a protected button would be left with no pad button. `16` and any index that cannot be bound are refused.
  - It returns `PadCaptureOutcome`, the generic `CaptureOutcome<PadBindings, PadIndex, PadTarget>`; the keyboard keeps the defaults.
  - Also added: `padOutcomeText`, `padCapturePrompt`, `padRow` (undefined for F8/F9) and `padSlot`. A capture target names its device: `CaptureTarget = SlotTarget | PadTarget` (`{row, slot: 'pad'}`).
- **`client/src/ui/screens/optionsScreen.ts`**:
  - The cell keys are `${id}_0, ${id}_1, ${id}_pad` (plus `_clear` on Shortcuts). Buttons is a 3-column grid, Shortcuts a 4-column one.
  - `F8_pad` and `F9_pad` are disabled `noPad` placeholders, so every row keeps the same columns.
  - `padCaptureStep` decodes through the same `resultOf` that `captureStep` now uses.
- **`client/src/ui/controlsView.ts`**: paints Pad cells from the live `handlers.padBindings` with pad glyphs. The placeholder shows `—` and is `aria-disabled`. A waiting Pad cell shows and announces the pad prompt.
- **`client/src/shell/inputState.ts`**:
  - `export let padBindings` is loaded from storage and is the one table the pad source and the keycaps read.
  - One private `applyTables(keys, pad)` saves both tables, releases everything and rebinds both sources; the held pad buttons latch (gp-1.11).
  - `applyBindings`, `applyPadBindings` and `resetAllBindings` are each one call to it.
- **`client/src/main.ts`** (wiring only, no new i18n key):
  - **One outcome path:** `settleControlsCapture(step, apply)` was extracted from `captureControlsKey`. Key and pad captures both go through it (hint, toast, save, apply).
  - **Pad capture:** in `pollPad`, a waiting Pad cell makes the frame call `pad.capture()` instead of `pad.poll()`. No pad press routes or opens an accelerator, and the press it reads goes to the capture.
  - **Keyboard during a Pad capture:** only Escape (cancel) and the Cancel chip's activation do anything. Every other key is ignored and prevented, except keys the browser owns.
  - **Key capture:** pad presses are still dropped there (gp-2's rule).
  - **Same-poll stop:** an edge that starts a capture, Key or Pad, ends that poll. No later edge or accelerator routes, and `releaseAllInput()` runs in a `finally`. This closes gp-2's same-poll note: an A plus RT in one frame no longer opens the Bag over Controls.
  - **Handlers:** the Controls handlers pass `padBindings`, and Reset all calls `resetAllBindings`.
- **i18n:** 5 new ids in en and fr, with `@desc`: `controls.slot.pad`, `controls.capture.padPrompt`, `controls.refused.padReserved`, `controls.refused.padProtected` and `controls.swappedPadUnbound`. The catalog goes from 565 to 570 keys. The `@desc` of the shared outcome lines now name pad buttons too.
- **e2e:**
  - `client/e2e/controls.ts`: adds `livePadBindings`, so pad-mode `pressButton`, `pressAccel` and `closeAll` press the live pad table's index.
  - `client/e2e/pad-controls.spec.ts`: the gp-5.10 flow.

Acceptance: 11/11 met, 0 deferred, 0 unmet — gp-5 seed:cf772b6872f4e761

Items: none. The controller items op-2026-10-01-controls-007 and -019 belong to the whole M-gamepad milestone. gp-5 delivers the pad-remap part of them, including -019's pad buttons bindable to accelerators.

### Verification
- **Tests:** a `tester` subagent (opus) wrote them from the EARS criteria: 63 tagged unit tests across 7 suites, plus 1 Playwright flow. Each title ends with its `[gp-5.N]` tag(s).
  - Per tag (passing): gp-5.1 6, gp-5.2 6, gp-5.3 2, gp-5.4 8, gp-5.5 17, gp-5.6 17, gp-5.7 2, gp-5.8 7, gp-5.9 3, gp-5.10 1 (e2e), gp-5.11 4.
  - The main.remap cases drive a fake standard pad through the booted shell: gp-2's `navigator.getGamepads` harness, copied.
- **Red proof:** at `c077fb38` all 63 tagged tests failed for the expected reasons: missing exports, no Pad column, the record lacking `pad`, and RT opening the Bag in the same poll.
- **Tester fixture fixes:** three fixture defects went back to the tester and are fixed. `keysWithK` carried the record's `v`, and two `toBe` defaults pins compared across a `vi.resetModules` graph.
- **`just ci`:** rc=0 at the head `4cf6fbfe`: 6757 client tests, 885 account tests, 15/15 evals.
  - The run needs a PATH shim to the pinned spacetime 2.12.0 CLI, because `~/.local/share/spacetime/bin/current` is 2.11.0 and reds `bindings-drift` and `account-e2e`.
  - Two earlier runs failed only on the known `account-service` `deployment.test.ts` Docker port-forward flake (discovery ECONNREFUSED).
- **e2e (local, isolated in-memory server):**
  - `pad-controls.spec.ts` green, and 3/3 with `--repeat-each=3`.
  - `remap.spec.ts` (the DoD), `ui-controls`, `ui-feedback`, `ui-whole`, `pad-menu-flow` and `pad-controls`: 19/19 together.
- **`mr-gates check`:** 11/11 met.

### Review lenses
- **Plan:**
  - `reviewer` and `red-team`.
  - Adopted:
    - the explicit `pad.buttons`/`pad.accels` shape;
    - one `applyTables`;
    - the same-poll stop;
    - keydown `preventDefault` during a Pad capture;
    - refusal wording that is true for indices above 31;
    - `MENU_ACCELS` exported.
  - Spec-mandated limits went to notes.
- **Implementation:**
  - `reviewer`: no blockers. Fixed:
    - a throw during the same-poll stop skipped `releaseAllInput` (now a `finally`);
    - stale comments and `@desc`;
    - held ignored keys scrolling on OS repeat (now `noteNavHeld`);
    - a sparse `[,]` passing `padIndexList` (now read by index);
    - the duplicated page read in `e2e/controls.ts`.
  - `red-team`: nothing exploitable.
    - fast-check fuzz (5000 stored records, 3000 capture sequences, 20000 `GamepadSource` op sequences) found no invalid table and no stuck or double edge.
    - Its partial-record finding is gp-5.3 as specced: a valid entry claiming a protected default resets the whole table.
  - `/simplify`: one `resultOf` decode is shared by `captureStep` and `padCaptureStep`, and the one-caller `captureControlsPad` is inlined.
  - `verifier`: **PASS**.
    - No gating test weakened, skipped or deleted.
    - All 10 vitest CHECKs print their EXPECT at HEAD.
    - 4/4 mutants killed: pad capture falling through to `poll()`, the claim check dropped, a keyboard save writing the default pad table, and accelerators after the stop.
  - `reducer-security-auditor` / `desync-guard`: not run. No reducer, schema, game-core or wasm export changed; this is client input wiring and Controls UI.

Intentional changes to existing tests:
- `optionsScreen.test.ts`: the layout pins.
  - Buttons cols 2→3 with `_pad`; Shortcuts cols 3→4 with `_pad` before `_clear`.
  - Only `F8_pad`/`F9_pad` are disabled.
  - Walked and decoded cells 62→86; the QF14 row slices 3→4 on Shortcuts and 2→3 on Buttons.
- `controlsView.test.ts`: row nav-keys and slots gain `_pad`/`'pad'`.
- `main.remap.test.ts`: `BUTTON_CELLS`/`SHORTCUT_CELLS` gain `_pad`, and `controlsMoveTo` cols 2/3→3/4.
- `inputState.test.ts`: `BUTTON_CELLS` gains `_pad`.
- `bindingStore.test.ts`, `inputState.test.ts`: `saveBindings` takes the pad table, and the pinned saved record holds `pad`. `CTL12-4-SAVE-SHAPE` keeps its body under a title naming `pad`.
- `catalog.test.ts`: roster 565→570.

plan-delta:
- `parsePadBindings` and `loadPadBindings` live in `bindingStore.ts`, beside `parseBindings`.
- A stored pad entry naming an index an earlier entry claimed is INVALID: it becomes its default minus the claimed indices. This is gp-5.2's "duplicate index". The keyboard parser filters the code out instead.
- `capturePad` returns `PadCaptureOutcome`, the generic `CaptureOutcome`, rather than the keyboard's `CaptureOutcome`.
- `livePadBindings` sits beside `liveBindings`. `liveBindings`' return type stays `Bindings` because `remap.spec.ts` reads it.
- gp-5.8's "the refusal line a refused key shows" is read as the same strip path (`controls-refused` → `showHint`), worded for a pad as `controls.refused.padReserved`, "That button cannot be bound.". "Belongs to the browser" is false for Guide.
- Reset all is `inputState.resetAllBindings()`: one save of both defaults.
- Clear stays keyboard-only. The spec is silent on it, and existing behaviour must not change.
- The same-poll stop was built, closing gp-2's note. A press in the same frame as the capture-starting edge is latched, not captured.

touches-delta: none
boyscout-delta: none
comment-scan:
- `client/src/ui/i18n/catalog.test.ts:5380` (`ctl-12b`) is the one flag left. It is the tester's comment in a gating test, citing the shipped `ctl-12b` French-colon precedent its assertion follows; I did not edit the gating test.
- The two flags on lines I wrote are fixed in `4cf6fbfe`.

Decisions: no new `docs/DECISIONS.md` entry. `pad-storage=additive-pad-entry-in-v1` and `pad-slots=one-per-row` are the spec's defaulted decisions, implemented as written. The storage "why" is stated in `bindingStore.ts`'s header, and the DECISIONS "Client UI" entry's storage sentence stays true.

Spec notes (`mr-gates notes`, gp-5):
- **n1 → residual R-gp-5-NOTE389633** [ux-a11y/MED]: gp-5.7 as specced traps a pad-only player in a KEY capture, with no pad exit.
- **n2:** an empty Pad cell has no pad exit that leaves the table unchanged. Option: B's index cancels there.
- **n3:** Clear is keyboard-only.
- **n4:** with two tabs open, each tab's whole-record save overwrites the other's.
- **n5:** the contract as built: `PadCaptureOutcome`, `CaptureTarget`, `noPad`, `resetAllBindings`, `livePadBindings`.
- **n6:** the same-poll stop and the Pad-capture key rule, as built.
- **n7:** comment drift outside touches, in `shell/views.ts` and `pointerSource.ts`, plus the keyboard `codeList` sparse-array gap.

Risks (accepted):
- **Whole-table fallback:** a hand-edited partial pad record whose valid entry claims a protected default resets the whole pad table (gp-5.3; same shape as the keyboard).
- **Same-frame press:** a press made in the same frame as the A that opened a Pad capture is latched, so it must be pressed again.
- **`main.ts` growth:** about 70 lines of wiring.

not-verified:
- The remote-only CI jobs: gitleaks, cargo-audit, and the full e2e suite. Locally, the six Controls/pad e2e specs above ran.
- No physical pad, in Chromium or Firefox: the operator's manual pass after gp-6. The red-team raised one unproven case: a Firefox keyup-click on a focused Pad cell. The cells are `aria-activedescendant` items of a focused `div`, so no native click is expected.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
