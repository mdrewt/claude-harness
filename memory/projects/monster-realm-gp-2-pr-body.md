## gp-2 — a connected pad plays the game: the operator's menu flow, pad only

gp-1's `GamepadSource` is now wired into live play (`M-gamepad.spec.md` §gp-2). The change is client-only: no schema, no server, no game-core.

- **`client/src/shell/inputState.ts`** (the live input devices):
  - Builds `pad = new GamepadSource(() => navigator.getGamepads?.() ?? [], PAD_DEFAULT_BINDINGS, { onError })`. The API is looked up at each poll, never at import: a browser without it reads as no pads, and one that throws reads as no pads.
  - A Gamepad API fault goes through a fault-sink port, `installPadFaultSink`. It logs to the console until `main.ts` installs the error ring's reporter. This module imports no shell module.
  - `releaseAllInput` reads the pad once and then latches it (`pad.poll()`, then `pad.releaseAll()`). A pad button pressed since the last frame's poll is latched too.
- **`client/src/main.ts`** (wiring only):
  - **Fault sink:** installed at module scope as `pushError('uncaught', 'gamepad: <message>')`, the `frame: ` / `interact: ` tag idiom.
  - **`pressEdges(edges)`:** the one press path that `pointerPress` now calls too. It checks the session gate, syncs the stack on both sides, and routes each edge in its own try. The first error is rethrown after the last edge, so a throwing press never swallows a release in the same batch.
  - **`pollPad()`:** runs in every frame right after the frame's first `syncStack()`, before the session-gate early return and `inputRouter.tick`.
    - **Gate up:** `releaseAllInput()`, and nothing routes.
    - **A press that must be ignored:** focus outside `#game-screen`, or Controls waiting for a key. `releaseAllInput()`, and nothing routes, so the ignored press owes no release that could end another source's hold.
    - **Releases only:** they route whatever the focus, as a keyup does.
    - **Otherwise:** the pointer's hover mark clears, stale focus heals to the canvas, the edges route, and then each accelerator goes to `runAccel`. LT opens Monsters on Party, RT opens the Bag, or the accelerator acts as Start on its own screen.
    - Inside the game screen a pad press is a button press even with a text field focused (`decision-defaulted:pad-focus=same-guards-as-keys`).
- **e2e:**
  - `client/e2e/pad.ts`: the mocked Gamepad API, with `installFakePad`, `padPress` and `padHold`. It is one standard pad object, mutated in place.
  - `client/e2e/controls.ts`: `setPressSource(page, 'pad')` makes `pressButton`, `pressAccel` and `closeAll` press the default pad table's button.
  - `client/e2e/pad-menu-flow.spec.ts`: `menu-flow.spec.ts` played press by press on the pad.

Acceptance: 8/8 met, 0 deferred, 0 unmet — gp-2 seed:3964449ed54f64f9

Items: none (the controller items op-2026-10-01-controls-007 and -019 belong to the whole M-gamepad milestone; gp-2 delivers part of them)

### Verification
- **Tests:** a `tester` subagent (opus) wrote them from the EARS criteria. There are 38 unit tests (31 in a new `main.ts gamepad (runtime)` describe in `main.input.test.ts`, 7 in `inputState.test.ts`) and 1 Playwright flow. Each title ends with its `[gp-2.N]` tag.
  - Per tag: gp-2.1 6, gp-2.2 3, gp-2.3 3+2, gp-2.4 3, gp-2.5 4, gp-2.6 5+5, gp-2.7 7, gp-2.8 1.
  - The unit tests drive a fake standard pad through the real booted shell. It is installed on `navigator.getGamepads` and mutated in place between `frame(t)` calls.
- **RED, on the unwired base `ee884bda`:**
  - All 36 first-round tagged unit tests fail for the right reason: the pad does nothing, or the export is missing. The 110 existing tests stay green.
  - The pad e2e fails at its first pad press ("Start opens the menu").
  - Of the 2 gp-2.7 tests added after review, both fail on the intermediate design they target, which routed a dropped press's release. They pass on the base by construction: they assert that the pad does not disturb a keyboard walk.
  - On the first run, 8 tests were wrong. They acked the server while a hold was committed, so `reconcile` re-issued a Step. They went back to the tester and were fixed test-side. The implementation did not edit any gating test.
- **Mutants:** I hand-wrote 20 against the final head; the suite kills 18. Killed:
  - The poll skipped or moved after the gate return; no read-before-latch; no `pad.releaseAll`.
  - Gated frames not releasing, or routing their edges.
  - Releases dropped outside; no focus guard; no Controls-capture drop; accelerators run outside; a dropped press's release routed.
  - No per-edge isolation; no focus heal; no hover clear.
  - The API captured at import; the sink not installed; the `gamepad: ` tag missing; no poll at all.
  - The 2 survivors are listed under Risks.
  - Separately, the verifier planted 20 of its own and caught 18. That includes `pressEdges` without its gate check, which the existing `CTL7A-4-CHIPS-SESSION-GATED` test kills.
- **`just ci`:** green locally at `dac15620`. It exited 0 in 3 m 37 s, with 6658/6658 client tests across 256 files, 885 account tests, nextest 3651/3651, and 15 of 15 evals PASS. It ran with the pinned spacetime 2.12.0 through a PATH shim, because the machine's current CLI is 2.11.0.
- **e2e, against a private 2.12.0 server:** `pad-menu-flow.spec.ts`, `menu-flow.spec.ts` and `controls.spec.ts` all pass, 9/9. The verifier also ran `--repeat-each=10` on the pad flow: 10/10, 0 flaky.
- **`mr-gates check --slice gp-2`:** 8/8.
  - gp-2.1 to gp-2.7 run both unit files with `--reporter=json`. Each requires overall success with no failed, pending or todo tests, and an exact count of passing tagged titles per file.
  - gp-2.8 runs the three e2e specs. It requires 9 expected with 0 unexpected, flaky or skipped: the pad flow by title, `menu-flow.spec.ts`'s flow, and all 7 `controls.spec.ts` tests. It needs a live SpacetimeDB at `STDB_SERVER` / `VITE_STDB_URI` (the default `local`, or exported).
- **Chromium probe** (Playwright's build): `navigator.getGamepads` exists and returns four empty slots on an insecure http origin, as on localhost (spec note n2).

### Review lenses
- **Plan reviewer and plan red-team** (parallel). Both found real gaps, and each was fixed before the tests were written:
  - The upward `shell/feedback` import broke the shell layering rule. It became the fault-sink port.
  - A pad press made after the last poll but before a blur was never latched. Fixed with the read-before-latch.
  - A throw while routing one edge lost the poll's later releases. Fixed with the per-edge try.
  - Pad presses during a Controls capture reached the screen: pad B cancelled the capture silently, and Start or LT closed Controls. They are now dropped (gp-5's rule, adopted early).
  - The e2e gate also runs `menu-flow.spec.ts` and `controls.spec.ts`.
- **Code reviewer:** no BLOCKER or MAJOR.
  - Fixed: the comment accuracy items (the fault-sink doc, the frame-loop comment, `pressEdges`' gate wording).
  - Fixed by the tester: slice ids leading test names, a leaked `mr.controls` after the Controls test, a vacuous `field.value` assert, the red-phase history comments, and a double `liveBindings` read in `closeAll`.
  - Fixed: the `docs/DECISIONS.md` port clause (below).
  - The other MINORs are accepted under Risks: the throw that skips one frame, and the copied flow body, now a follow-up.
- **Code red-team** proved three defects in a sandbox:
  - **MED, fixed:** a pad press dropped while focus was outside still owed its release, and that release later ended a keyboard walk. The ignored press now lets go of everything, so it owes nothing. A gating test was added, RED on the old design.
  - **LOW, accepted (spec note n3, for gp-5):** the press decision is made once per poll. A and B in one frame on a Controls slot start the capture, and B then ends it.
  - **LOW, accepted:** an edge that throws loses that poll's accelerators.
- **`/simplify`:** dropped the accelerators' redundant gate re-check and leading sync (no observable effect; the mutant survived).
- **verifier:** PASS. No pre-existing test changed (additions only), no skip/only/todo, and the gate CHECKs re-run verbatim match EXPECT.
  - `controls.ts`'s unbound-Start message is replaced by `pressButton`'s own `UnboundKeyError`. The verifier adjudicated this as legitimate: nothing pins the old text, and the spec asks `closeAll` to press through `pressButton`.
  - Its findings F1 and F3 are listed under Risks.
- **`reducer-security-auditor` and `desync-guard`:** not applicable. No server-module, game-core or wasm change. The pad drives movement only through the existing held-keys seam (`dirDown` → `Face`, then the frame-loop continuation `Step`).

plan-delta:
- **The fault goes to `pushError`, not `reportError`.** A throwing Gamepad API is reported through an installed sink as `pushError('uncaught', 'gamepad: …')` instead of the spec's `reportError`.
  - `reportError` needs a `MessageKind` and a player-facing catalog string, in files outside `touches:`, and it records the fault as `'reducer'`.
  - The player sees the error overlay once, and no toast. gp-2.6's "reported once" is met. Spec note n1.
- **`inputState` imports no shell module:** it holds `installPadFaultSink` instead, per the layering rule in `docs/DECISIONS.md`.
- **The pad is read right after the frame's first `syncStack()`,** not literally first, so its focus and capture guards read a synced stack. It is still before the gate's early return and `inputRouter.tick`.
- **Pad presses are ignored while Controls waits for a key.** This is gp-5's rule, adopted now, and it goes beyond gp-2.7's text.
- **An ignored pad press calls `releaseAllInput()`.** The spec says "nothing", but a dropped press would otherwise owe a release that ends another source's hold. A poll of releases only still routes them, as a keyup does.
- **`releaseAllInput` reads the pad before latching it**, so a press made after the last poll but held at a blur is latched too.
- **The plan was drafted by the orchestrator, not a `planner` subagent.** Every source file was already read, and the plan's two review lenses ran on it.

touches-delta: `docs/DECISIONS.md` — one sentence of the shell-layering entry ("A shell module imports only the shell modules below it") now names the second kind of port. A port whose caller swallows a throw logs to the console until installed instead of throwing: `GamepadSource` swallows a throwing reporter, so a throwing default would lose the fault silently. This was within the brief's DECISIONS allowance; no new entry.
boyscout-delta: none
comment-scan: CLEAN (an earlier flag on `client/e2e/controls.ts`'s existing `ctl-12b` line went away once the appended sentence moved to its own line)

Decisions: no new `docs/DECISIONS.md` entry. `pad-focus=same-guards-as-keys` is the spec's defaulted decision, implemented as written plus the plan-deltas above. It is reversible and stated in the `pollPad` comment.

Spec notes (`mr-gates notes`, gp-2):
- **n1:** the `reportError` → error-ring deviation, and what the player sees.
- **n2:** the Chromium secure-context measurement.
- **n3:** `pollPad` as built, for gp-4, gp-5 and gp-6: guard order, the ignored press, the per-poll decision gp-5 should make per edge, and the per-edge try.
- **n4:** for gp-5, a pad-only player cannot cancel a KEY capture from the pad.
- **n5 → residual R-gp-2-NOTE025DE2** [loop-ops/LOW]: ARCHITECTURE.md's `inputState` paragraph doesn't name the pad source or every `releaseAllInput` caller. It is outside `touches:`.
- **n6 → residual R-gp-2-NOTEF47B2B** [loop-ops/LOW]: `pad-menu-flow.spec.ts` copies about 180 lines of `menu-flow.spec.ts`. The follow-up is one shared flow body for both sources.

Risks (accepted):
- **Keyboard behaviour change** from `releaseAllInput()` on every gated frame:
  - A keyup under the gate is now a no-op.
  - A held key's OS repeats after the gate are not prevented.
  - Not visible in play: the gate lifts only in `onApplied`, whose `onReconnect` already clears `held`. A unit test pins that a key held through the gate does not walk again until it is pressed again.
- **One routing throw costs a frame:** a throw from routing one pad edge skips that poll's accelerators and the rest of that frame. The frame catch reports it, and no held direction sticks.
- **gp-1 disconnect semantics:** a transient `getGamepads` throw, or a pad that vanishes for one read, releases what it held, and the next read is a fresh press (gp-1.10, gp-1 note n2).
- **Mutant survivors:**
  - Accelerators before edges in the same poll: the order is untested (verifier F3).
  - The accelerators' trailing `syncStack()`: no observable difference in the harness.
  - Pre-existing: nothing pins `pointerPress` skipping the world-prompt paint under the session terminal. The refactor keeps that guard through `pressEdges`' return value.
- **Verifier F1:** the pad e2e would also pass on the keyboard if `setPressSource(page, 'pad')` were deleted from it. Without pad wiring it fails, as proven on the base. A keydown counter is a possible hardening.
- **For the operator's real-pad pass:**
  - Trigger chatter near the browser's pressed threshold.
  - A pad still read while the window is visible but unfocused.
  - The press that wakes a pad, which may act.

not-verified:
- The remote-only CI jobs: gitleaks, cargo-audit, and the full e2e suite. Locally only the three e2e specs above ran.
- No physical pad, in Chromium or Firefox. That is the operator's manual pass after gp-6 (spec §Post-integration verification).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
