# ci-fix-20261113T2045 — plan (master red on 2170be97: e2e ui-feedback.spec.ts UIF4B.2 Controls, "#controls-tabs did not move when the hint showed")

## Diagnosis (measured, this session)

- CI run 43502080006 (push, 2170be97 = ts-6b-5 #763): shard 4, `ui-feedback.spec.ts:214` UIF4B.2 Controls, at
  640x240: `#controls-tabs` y expected 13.390625, received -18.609375 (`#controls-overlay` equal; x, width, height
  equal). The shard's timing JSON (artifact e2e-timings-4-1): the test ran 1168 ms to the failure (local full
  pass: ~1.7 s); ui-feedback was the first spec file of the shard. No trace artifact.
- NOT REPRODUCIBLE on the unmodified spec: 31/31 runs green locally at master (1 + `--repeat-each 30`), plus
  6/6 at CPU throttle x1, x4, x8 and 8/8 with a 14/30/60 ms busy loop in every animation frame.
- NOT a ts-6b-5 regression, no revert:
  - PR #763 head 6f1e4dd6 and master 2170be97 have an identical `client/` tree (`git diff --stat` empty); the 17
    differing files are ts-6b-3's (server-module 15, game-core/src/tactics 1, docs 1). That client tree was
    e2e-green on the PR.
  - ts-6b-5 changed no file on the causal path (`git diff 55592758 2170be97` empty for ui/overlayA11y.ts,
    ui/controlsView.ts, ui/controlsModel.ts, ui/navRender.ts, ui/tabBar.ts, ui/focusTrap.ts,
    ui/screens/optionsScreen.ts, ui/hintBar.ts, ui/liveRegion.ts, styles.css, index.html,
    e2e/ui-feedback.spec.ts, e2e/controls.ts).
  - The failure reproduces with the CI numbers on the PRE-ts-6b-5 client source (client/src at 55592758) under
    the late-focus harness below: 5 of 6 rounds.
- MECHANISM (instrumented probe: patched focus / scrollIntoView, scroll listener, per-step scrollTop + rects):
  - `openOverlayA11y` moves focus to the frame's `initialFocusSelector` (`#controls-rows`) one macrotask after
    the open (`setTimeout(…, 0)`, ui/overlayA11y.ts), and `HTMLElement.focus()` scrolls its target into view.
    At 640x240 the Controls shell scrolls (clientHeight 194, scrollHeight 427) and `#controls-rows` is taller
    than the scrollport, so that focus scrolls the shell 0 -> 98: `#controls-tabs` sits at y -18.609375.
  - `renderNav` scrolls the active cell into view (`block: 'nearest'`) synchronously in the keydown. With the
    shell still at 0, the walk Up_0 … X_0 scrolls 0 -> 20 -> 43 -> 66: `#controls-tabs` sits at y 13.390625.
  - So CI's `before` (13.390625) is the scrollTop-66 state = the deferred focus had NOT landed when the test
    walked the grid and read `before`; CI's `withHint` (-18.609375) is the scrollTop-98 state = the focus landed
    between the two reads. The hint moved nothing: with focus already on the rows, forcing scrollTop 0 after
    the open and replaying the flow keeps 66 through hint and toast (probe2).
  - Forced: delaying the page's zero-delay timers 80 ms reproduces the CI failure byte for byte (same assertion
    message, expected y 13.390625, received -18.609375; `before={"top":66,"active":"BODY"}
    hint={"top":98,"active":"controls-rows"}`), 4/4; 40 ms -> focus lands before `before` (pass at 98/98);
    120/160/250 ms -> lands after the reads (pass at 66/66).
  - The zero-delay timer is not prompt even locally: it landed 12-31 ms after the open, once after two later
    key presses (queued input outranks a timer task). The unsettled open -> `before` latency is ~80-100 ms
    locally; CI ran the whole test faster than local, right after a page reload.
- Same race class as ci-fix-20261109T0400 (ui-help.spec.ts, PR #694); the product residual
  R-ci-fix-20261109T0400-LATEFOCUS-SCROLL already exists. This is its second master red.

## Fix (touches: client/e2e/ui-feedback.spec.ts ONLY; no product code)

1. FIXTURE `openControls` (a describe-scoped closure, `const openControls = async (label: string):
   Promise<void>`): the main test's open sequence (Start -> menu -> Down to Controls -> A -> stack is
   world/menuView/controlsView -> `#controls-overlay` visible) MOVED into it verbatim, plus the SETTLE:
   `await expect(page.locator('#controls-rows'), …).toBeFocused()`. Bounded by the expect timeout, a retried
   DOM predicate, no sleep. Sound because the deferred timer is inert once focus is inside the overlay
   (`connectedInside(root, document.activeElement)` returns early) and the rows are the frame's
   `initialFocusSelector`, so after the wait no pending focus can scroll the frame. The rename test already
   waits for its field's focus before its first read; the Controls test lacked the equivalent.
2. The main UIF4B.2 Controls test calls `openControls(label)` in place of the moved lines. Every assertion,
   message, timeout, selector and the tolerance-0 `toEqual` stay byte-identical.
3. REGRESSION TEST (tester-authored, red first), last in the serial describe, title carries the literal
   `late deferred focus`: hold the page's zero-delay timers back 1500 ms (patch `window.setTimeout` for the
   test only, restored in `finally`) so the deferred focus is deterministically late; at 640x240 open through
   `openControls`, walk the cursor to X_0 as the measured flow does, read the three boxes; wait until
   `#controls-rows` IS focused; read again; every box equals its first read (tolerance 0).
   Oracle message: `late focus: <selector> did not move when the deferred focus landed`.
   Guards (`FIXTURE:`): (G1) the shell is scrolled at the first read (else no focus could move a box: vacuous);
   (G2) the rows got their focus inside a held-back callback (the hold carried the overlay's own timer).
   RED on the unsettled fixture with the CI signature (`#controls-tabs` 13.390625 -> -18.609375); GREEN once
   `openControls` settles.
4. Header comment: the ORACLE RULE states the settle precondition.

## Not done (scope)

- Product side (`ui/overlayA11y.ts`, shared by every overlay, outside `touches:`): the deferred focus scrolling
  a frame after the player's first keys. Tracked by R-ci-fix-20261109T0400-LATEFOCUS-SCROLL; a build note
  records this second master red against it.
- Other e2e specs that read geometry right after an open are not audited (outside `touches:`).
- Observed, not fixed (note): at scrollTop 66 the sticky hint strip (y 175-203) covers the active cell
  (y 180-203), i.e. a cursor row at the scrollport's bottom edge sits under the strip.

## Gates (ledger X1-X5)

X1 spec green x3 consecutive (9 passed) · X2 runnable teeth: the settle swapped for visibility in a throwaway
copy -> the regression test RED by its oracle message, the real file GREEN · X3 nothing weakened: the only
deleted code is the open sequence, which re-appears whole inside the added lines; no bypass construct added;
only this file changed · X4 `just ci` · X5 MANUAL diagnosis/proofs record.

## Lenses

Plan: reviewer + red-team. Artifact: reviewer, red-team, verifier. reducer-security-auditor / desync-guard: N/A,
the diff is one Playwright spec (no reducer, table, game-core, wasm or client-runtime surface). `/simplify` is
not run on tests.

## Plan review outcomes (reviewer: sound, 3 SHOULD; red-team: holds with two changes on X3) — adopted

- No other late mover found by either lens (ResizeObserver places only a shown sheet; `renderNav` scrolls only on
  an active-cell change; the render-path focus calls need the Cancel chip or the Reset confirm; no web fonts; no
  animated scroll). Red-team ran the settled flow with zero-delay timers delayed 80 ms and 1500 ms: both PASS,
  640x240 reads 98/98, so the hint, the refusal and the toast are also measured at scrollTop 98 and move nothing.
- Settle reachability: `initialFocusSelector` is `#controls-rows` (ui/overlayRegistry.ts), tabindex set at
  construction, the menu is blurred by `suspend` before the timer runs, `show()` opens only on the hidden-to-shown
  edge. No path found where the wait hangs.
- G2 is keyed to the rows specifically: the flag is set only when, inside a held-back callback, focus moved ONTO
  `#controls-rows` (the hold also delays the menu's own deferred focus).
- G1 is not "scrollTop > 0 at the first read" (true in both orders). It is read once the rows hold focus: the
  shell is scrolled AND the cursor cell is clear of the scrollport's bottom edge, i.e. the focus put the shell
  further down than the cursor's own nearest-scroll would. That is the condition under which a late focus moves
  a box; if a layout change makes the two scrolls coincide the guard reds instead of the test going vacuous.
  It runs after the oracle, so an unsettled fixture still reds by the oracle message.
- The test sets 640x240 itself; `finally` restores `setTimeout` first, then closes and restores 1280x720. The
  patch treats `undefined` and `0` as zero-delay and returns the real timer id.
- X3 is structural, not line membership (forgeable: generic lines re-appear in the new test; a never-called
  closure "re-contains" them): comments and whitespace stripped, HEAD's spec minus the fixture definition and
  minus the regression test, with the fixture's body (less its one settle statement) inlined at its single call
  site, must EQUAL the base commit's spec. Plus exactly one `openControls(label)` call site, one `.toBeFocused()`
  in the fixture, a bypass-construct scan of the added lines, and only this file changed.
- NIT adopted in the X5 record: the 640x240 pass always follows a `page.reload()`, the 1280 pass does not.
