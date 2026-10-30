# ctl-11b plan — legacy ladder (worldHasFocus) deleted; reachability; keyboard menu-flow e2e

Branch `ctl-11b` @ worktree `.claude/worktrees/ctl-11b`, from origin/master 8341d648.

## Verify-scope findings (spec premise partly false)
- `KEY_DIR`, `targetOwnsKey` are already gone (only comment mentions remain in tests outside touches).
- The probe and handle tables do NOT survive only for legacy hotkeys: `syncStack` mirrors overlays
  into the stack via `visibleIds(overlayProbes)` (main.ts ~601), `hideFrame` (stack `close`
  commands) via `overlayHandles`, `topOverlay`, Social panel switching, the pvp auto-open
  (`anyVisible`). Deleting them means making the stack the overlay truth — a large main.ts
  refactor, not a deletion.
- `canOpen`/`OVERLAY_TIERS`/`overlayVerdict` still gate privacy open (blockedBy), face-to-face
  trade, openMenu, toggleHelp and the two hint-bar chips; `overlayRegistry.test.ts` (1371 lines,
  86 refs) is mostly canOpen. Replacing every verdict with a stack predicate is its own slice.
- Removing the `evolutionView` OverlayId (EVODEAD's full closure) ripples into contextStack.ts,
  screens/index.ts, helpView, a11yCopy, i18n catalogs — all outside touches.
- Stripping the raising monster cards (CTL8F.2's end state) needs raisingView.ts — outside touches.

## Right-sized increment (ships)
1. **CTL11B.1** — pure `outsideGameScreen(target, screen)` in `input/router.ts`: true when
   `target` is an element (string `tagName`), not BODY/HTML, `screen !== null` and
   `!screen.contains(target)`; `screen === null` (shell-less boot) → false. `ownership(target, e,
   screen = null)` returns `'target'` first when `outsideGameScreen`. main.ts `onKeyDown` FIRST
   statement: `if (outsideGameScreen(e.target, document.getElementById('game-screen'))) return;`
   (looked up per keydown so boot tests can add the shell any time). `worldHasFocus` deleted: the
   openMenu / toggleHelp conjuncts drop it (the stack top + the early return now decide), the
   frame-loop focus return reads `a === null || a === document.body || focusInsideHiddenSubtree()`.
   Unbound key at world base: already no handler / unprevented — pinned as characterization.
   S5T-GATE world-focus cases in main.a11yFocus.test.ts rewritten as router.test.ts ownership
   cases (named survivors listed in the PR).
2. **CTL11B.2** — `ui/reachability.test.ts`: BFS over the pure menu model (`mainMenuPick`/menu
   entries), nav and tab models; every ACCEL_PATHS target + Options › Report a problem ≤ 7
   presses (Start, D-pad, A, LB/RB as the design table counts them); table test of the expected
   counts + a fast-check property. Bite-proof: a mutated model (extra entries) reds.
3. **CTL11B.3** — `e2e/menu-flow.spec.ts`: design §5 required flow, keyboard only, SQL-seeded
   (a berry in the bag, a second monster, one in storage), every step asserted on
   `__game().stack` / visible text / snapshot; final W walks (position changes).
4. **B16** — focusTrap.ts line-1 comment count → the real `OverlayId` count.
5. **R-ctl-11a-POPGUARD** — boot test (main.accel.test.ts, main.ts sibling) staging privacy +
   pending claim render so `popToBase` leaves a frame; an accelerator then must not open the menu
   over it. Removing the guard reds it.
6. **R-ctl-8f-CTL8F.2** — main.controls.test.ts CTL6C-3 and main.feedbackCore.test.ts PGCCA-A4
   migrated from the raising card Care button to the Monsters sheet Care (named survivors).
   Card strip itself re-deferred (raisingView.ts outside touches; R-ctl-8c-CTL8C.1-RAISINGSTRIP).
7. **R-ctl-11a-EVODEAD** — dead `refreshEvolution` + its batch listener deleted from main.ts;
   the OverlayId/view module remain until the registry narrows (remainder -> ctl-13, which
   touches overlayRegistry/contextStack/screens/index/main.ts).

## Deferred (new residual, not a gate)
- canOpen / OVERLAY_TIERS / overlayVerdict / probe+handle tables deletion and `overlayRegistry`
  narrowed to `OverlayId` + `OVERLAY_A11Y` -> ctl-13 (touches overlayRegistry, contextStack,
  screens/index, main.ts). Reason: the stack mirror reads the probes; a stack-as-truth refactor.

## Gate tags (tester writes exactly these, each once)
- CTL11B.1: router.test.ts `CTL11B-1-OWN-OUTSIDE`, `CTL11B-1-OWN-BODY`, `CTL11B-1-OWN-INSIDE`,
  `CTL11B-1-OWN-NO-SCREEN`; main.a11yFocus.test.ts `CTL11B-1-BOOT-UNBOUND`,
  `CTL11B-1-BOOT-OUTSIDE`, `CTL11B-1-BOOT-INSIDE-ROUTES`.
- CTL11B.2: reachability.test.ts `CTL11B-2-REACH-TABLE`, `CTL11B-2-REACH-PROPERTY`.
- CTL11B.3: menu-flow.spec.ts `CTL11B-3-MENU-FLOW`.
- Residuals: main.accel.test.ts `POPGUARD-CLOSE-SURFACES-FRAME`.

## Lenses
Plan: self-reviewed against code (budget $60). Artifact: reviewer + red-team (one batch), verifier.
desync-guard / reducer-security-auditor skipped: client-only, no game-core/wasm/server change.
