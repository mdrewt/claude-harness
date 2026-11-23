# ci-fix-20261109T0400 — plan (master red on 289baec4: e2e ui-help.spec.ts XL fixture "overlay is scrolled")

## Diagnosis (measured, this session)

- CI run 42555008331 (push, 289baec4 = uif-15b #693): `ci` job green; `e2e` job 205 passed / 1 failed —
  `ui-help.spec.ts:300` "UIF14.5 at the Extra large text step …", `FIXTURE: the overlay is scrolled (else this test
  is vacuous)`: `expect.poll(scrollTop) > 0` received 0 for the full 5 s, AFTER the `cursorKey === 'ranked'` poll
  passed. No Playwright artifact uploaded (gitleaks SARIF only).
- NOT a uif-15b regression — no revert:
  - PR #693's head tree (853c9bb4) == the merge commit's tree (9cf3a25f…); that identical tree was e2e-GREEN on the
    PR run 42553398359. Same test green on uif-14 PR + push and uif-15a PR + push (5 greens, 1 red, same code path).
  - `git diff 0f741a8b 289baec4` is EMPTY for every file on the causal path: ui/helpView.ts, ui/overlayA11y.ts,
    ui/navRender.ts, ui/screens/helpScreen.ts, ui/screens/index.ts, ui/tabBar.ts, ui/contextSheet.ts, styles.css,
    index.html, e2e/ui-help.spec.ts, e2e/controls.ts.
  - The race reproduces on uif-15a's client source (client/src checked out at 0f741a8b): 13 of 60 probe rounds.
- MECHANISM (instrumented probe: scroll events + patched focus/scrollIntoView + key log, unthrottled Chromium):
  `openOverlayA11y` moves focus to the overlay's `initialFocusSelector` (`#help-title`, the frame's first child) one
  macrotask AFTER the open (`setTimeout(…, 0)`, ui/overlayA11y.ts:177-182), and `HTMLElement.focus()` scrolls its
  target into view. The fixture sends Select → RB → Up with no settle in between (open → Up measured at 31–75 ms;
  the "0 ms" timer measured landing 15–40 ms after the open). When the timer task loses the race:
      969.0 keydown KeyW                      (Up)
      969.7 scrollIntoView …-ranked  top 0->386     (navRender.ts:143, synchronous in the keydown)
      977.2 focus help-title         top 386->0     (overlayA11y deferred focus, LATE)
  → cursor still `ranked`, scrollTop 0 forever = the CI signature. Natural rate in the probe at HEAD: 7/40, 1/4, …;
  the real spec was 150/150 green locally unloaded (the window is the few ms between the Up keydown and the first
  scrollTop read) — a fixture-timing flake, CI-load dependent.
  - Silent twin of the same race: the late focus landing AFTER the vacuity guard passed but BEFORE `A` resets the
    scroll and the geometry assertions then pass vacuously at scrollTop 0.
- Candidate fix measured in the probe: waiting for `#help-title` to be focused before the next key → 0/80 rounds
  failed (vs ~1 in 6 without).

## Fix (touches: client/e2e/ui-help.spec.ts ONLY; purely additive diff)

1. FIXTURE `openHelp` (every test opens Help through it, directly or via `openEncyclopedia`): after
   `#help-overlay` is visible, wait for the open to SETTLE — `await expect(p.locator('#help-title'), …).toBeFocused()`.
   Bounded (expect timeout, 5 s), event-based (auto-retrying DOM predicate), no sleep. Sound because the deferred
   timer is inert once focus is inside the overlay (`connectedInside(root, document.activeElement)` returns early),
   so after the wait no pending focus can scroll the frame. In this spec focus is always outside the overlay at an
   open (every open follows `closeAll`), so the heading is what receives it.
2. REGRESSION TEST (tester-authored, red first), in the same serial describe: reproduce the CI ordering
   DETERMINISTICALLY by holding the page's zero-delay timers back (patch `window.setTimeout` for the test only,
   restored in `finally`) so the deferred focus lands long after the keys an unsettled fixture would have sent;
   then at Extra large: openEncyclopedia → Up → cursor `ranked` → wait until the heading IS focused → assert the
   overlay is STILL scrolled and the cursor is still `ranked`. Non-vacuity guards: the hold-back really carried the
   overlay's focus (the focus landed inside a held-back callback), and the overlay really was scrollable.
   - RED at the unfixed fixture with the CI signature (scrollTop 0 after the late focus); GREEN once `openHelp`
     settles. Title carries the literal `late deferred focus`; the oracle's message is
     `the frame is still scrolled to the cursor after the late focus landed` (the X2 gate keys on both).
3. No existing assertion, message, timeout or test is edited or removed (X3: zero deleted lines vs the merge base).

## Not done (scope)

- Product side: `overlayA11y`'s deferred focus can undo a scroll made by a key that beats the macrotask (human-
  unreachable except under main-thread jank; self-heals on the next cursor move). `focus({preventScroll})` would
  change all 17+ overlays' open behaviour and is outside `touches:` → residual candidate (ux-a11y/LOW), not fixed.
- Other e2e specs with the same open-then-immediately-navigate shape are not audited here (outside `touches:`).

## Gates (ledger X1–X5)

X1 spec green ×3 consecutive (18 passed) · X2 runnable teeth: the settle removed from a throwaway copy → the
regression test RED by its oracle message, the real file GREEN · X3 additive-only diff (0 deleted lines) ·
X4 `just ci` · X5 MANUAL diagnosis/proofs record.

## Lenses

Plan: reviewer + red-team. Artifact: reviewer, red-team, verifier. reducer-security-auditor / desync-guard: N/A —
the diff is one Playwright spec (no reducer, table, game-core, wasm or client-runtime surface).

## Plan review outcomes (reviewer: SOUND-WITH-CHANGES; red-team: plan held, 3 findings) — adopted

- HOLD is time-based by necessity (an until-released hold deadlocks the settled fixture) → hold 1500 ms, ≥ 20× the
  measured open→Up latency (31–75 ms), so the unsettled fixture / X2 mutant stays red under load. The wrapper
  delegates to the REAL `setTimeout` and returns its real id (`clearTimeout` in overlayA11y keeps working), delays
  only zero-delay calls, and is restored in `finally`.
- Non-vacuity guards in the regression test: (G1) scrollTop > 0 right after Up, before the late focus;
  (G2) the heading received its focus inside a held-back callback (the hold carried the overlay's timer).
- Settle reachability (reviewer Q2: could the heading never get focus?) — REFUTED by code and measurement:
  main.ts:3092 heals focus stranded in a hidden subtree at the keydown, before any open; close + re-open back to
  back with focus on the list (same task, and CDP back-to-back): the heading focused 16/16 rounds. Red-team: 21
  settled rounds incl. CPU throttle ×8, min scrollTop 386; no open where the wait would time out.
- X2 keys the mutant's red on Playwright's own `Error: <oracle message>` line (a code frame can quote the message
  from a neighbouring failure). `openHelp` keeps exactly ONE `.toBeFocused()` token (comments included).
- X3 additionally scans the added lines for bypass constructs (skip/fixme/only/fail/slow, catch, waitForTimeout,
  numeric test.setTimeout, retries, toPass).
- The product residual is reachable under main-thread jank (input outranks a zero-delay timer task) — "human-
  unreachable" withdrawn; it is registered as a real residual after the last lens, not left as prose.
- Not adopted: the timer-queue fence (`await new Promise(r => setTimeout(r, 0))` in the page) instead of
  `toBeFocused` — sound, but it reads as a sleep in a spec whose hygiene rule is "every wait polls a bounded
  predicate", and the heading's focus is the product-visible end of an open. Dropping G2 / X5 (kept: G2 is the
  proof the hold bit the mechanism; X5 is the diagnosis record).
