# ctl-8h plan — Profile (Name typing, Account, Privacy) + claim/privacy anchoring

Worktree: projects/monster-realm/.claude/worktrees/ctl-8h (branch ctl-8h from origin/master 80420b6b).
Spec: M-postgate-console-controls.spec.md ### ctl-8h (CTL8H.1-5; B2/B3/B5). main.ts NOT in touches.

## Ground truth (verified at 80420b6b)
- The Profile list already exists: the main menu's `profile` group (menuModel.ts:109-133) is a nav
  sub-list Name / Account / Privacy whose leaves open renameView / claimView / privacyView through
  main.ts openRename/openClaim/openPrivacy. KeyN -> openRename, KeyC -> openClaim (main.ts:2232, 2287).
- Every one of the three frames is `legacyAdapter` in SCREEN_ADAPTERS; viewOf already lends
  renameView/claimView/privacyView (main.ts:494-499).
- A = Enter (bindings.ts:23); router `ownership`: Enter/Space on a BUTTON is the button's (native
  click), arrows/WASD/Backspace on a button are the router's; a text INPUT keeps all but Escape/Enter.
- Typing mode (CTL6B.5) is main.ts's capture-phase Escape -> `stopTyping` (first enabled non-text
  control in the aria-modal root, else <body>). Residual R-ctl-6b-CTL6B.5 (targeted here): an empty
  draft disables #rename-submit, so focus falls to <body>.
- B5: `#rename-submit`'s keydown calls stopPropagation (renameView.ts:89-91) so the bubble-phase
  router never sees D-pad/B/Start-M on it.
- B2: claimView's title/body are created display:none by ensureElement and render() never un-hides them.
- B3: claimView/privacyView ensureElement append the overlay to <body>.
- The claim phase and privacy model live in main.ts (claimModelState / privacy vm) — NOT reachable
  from ScreenContext. So a screen adapter cannot know which actions are shown.

## Design (functional core / imperative shell)
1. `ui/screens/profileScreen.ts` (new, pure): ONE row-adapter factory used three times
   (`nameScreen`, `accountScreen`, `privacyScreen`), `nav: true`, viewModel null, state
   `{ op: RowOp | null }` where `RowOp = {kind:'move', delta:-1|1} | {kind:'activate'}` is a fresh
   object per press (one-shot token, the tradeProposeScreen/monstersScreen precedent).
   onButton: Start -> popToBase; Select -> toggleHelp; B -> pop (repeat: consumed); Up/Down ->
   op move (repeat allowed: moves, never acts); A -> op activate (repeat: consumed);
   Left/Right -> consumed; else unhandled. EVERY onButton returns a state whose op is the new token
   or null, so a later paint never re-applies an old token. paint(view, _, s) -> s.op && view.applyRowOp(s.op).
   Also exports the pure `rowTarget(keys, current, op)` the views use: move clamps (no wrap) from the
   current key (unknown/null current -> first row for +1, last for -1? -> no: null current -> the
   default/first row); activate -> current ?? first.
   `RowsView` interface { applyRowOp(op): void }.
2. Views = the rows are their REAL controls; the cursor IS DOM focus (focus-follows-cursor), so the
   mouse, Tab, native Enter/Space and the D-pad agree and no control is duplicated. Ids/testids kept.
   - renameView: rows [#rename-input (field), #rename-submit (save)]. move focuses; activate on the
     field focuses it (start typing), on save clicks it (#submit gates empty/pending). B5: drop the
     submit's stopPropagation. R-ctl-6b-CTL6B.5: submit's not-submittable state becomes
     `aria-disabled="true"` (still focusable; #submit already no-ops) instead of `disabled`, so
     stop-typing lands on Save inside the modal, never <body>.
   - claimView: rows = the shown action buttons + privacy, DOM order. B2: render() un-hides title and
     body every phase. B3: overlay gets `mr-frame mr-shell` and is appended to #frame-layer ??
     #game-screen ?? body. Default No: on the render edge where `confirmPrompt` becomes defined while
     visible, focus #claim-decline-cancel-btn; when the focused control was hidden by a render, focus
     the first row. Pure rule in claimModel.ts: `claimRows(vm)` (ordered keys of shown actions,
     privacy last) and `claimDefaultRow(vm)` (declineCancel when confirmPrompt, else first).
   - privacyView: rows = shown, enabled buttons in DOM order (close, delete, confirm, keep, cancel,
     export, download). Default No: on the arm edge focus #privacy-confirm-cancel-btn ("Keep").
     B3: same anchoring + classes (drop the inline position/inset/zIndex/background block in favour of
     .mr-shell, if no out-of-touches pin needs it — else keep and note).
3. screens/index.ts: renameView -> nameScreen, claimView -> accountScreen, privacyView -> privacyScreen.
4. No catalog/messageIds change (see CTL8H.1 DEFER). e2e: accounts.spec.ts gains the B2
   `toBeVisible` on the claim title/body; rename.spec.ts typing (Escape keeps text, focus on Save).

## Anti-patterns avoided
- No main.ts edit; no new Command arm (types.ts out of touches) — the view's own button handlers
  (already wired to dispatch/applyClaim/applyPrivacy) run on activate.
- No second cursor model (the DOM focus is the only cursor), no duplicate rows.
- Never steal focus from outside the overlay: re-seat only while visible and focus is in the
  overlay or on <body>.

## Gates
- CTL8H.1 DEFER -> backlog [ux-a11y/LOW]: list + anchoring ship; the relabel to "Account & sign-in" /
  "Privacy & data" breaks literal pins in menuModel.test.ts:124-125 and mainMenuScreen.test.ts:444
  (outside touches — hidden dependency).
- CTL8H.2: profileScreen.test.ts CTL8H-2-* + renameView.test.ts CTL8H-2-* + profileScreen.boot.test.ts CTL8H-2-BOOT-*.
- CTL8H.3: claimView.test.ts / claimModel.test.ts CTL8H-3-* + profileScreen.test.ts.
- CTL8H.4: privacyView.test.ts CTL8H-4-* + profileScreen.test.ts.
- CTL8H.5: profileScreen.boot.test.ts CTL8H-5-* (KeyN/KeyC through booted main.ts).

## Amendments after plan review (reviewer + red-team, 2026-10-03)
- B5: `#rename-submit` keeps its keydown shield EXCEPT the D-pad and B codes (ArrowUp/Down/Left/Right,
  KeyW/A/S/D, Backspace — DEFAULT_BINDINGS) which now bubble to the router. main.controls.test.ts:1135
  pins N/B/I/M/R/Slash/Q/P on a focused submit staying shielded.
- R-ctl-6b-CTL6B.5 NOT closed: `disabled` stays (main.controls.test.ts:1489-1521, outside touches, pins
  focus-on-page for an empty draft). Recovery instead: on <body>, the D-pad seats focus in the frame.
  Hidden dependency recorded for the supervisor.
- Rows are discovered from the DOM in both claim and privacy (shown + enabled buttons, DOM order).
- A with NO focused row only seats the default row and fires nothing (armed reopen must not confirm).
- Default row: armed -> No (claim decline-cancel / privacy keep); else first row.
- Re-seat focus ONLY when the overlay was already visible (never on the open edge — overlayA11y owns
  that) AND (the arm edge -> No; the disarm edge -> the arming button (decline / delete); or the focused
  control inside the root became hidden/disabled -> default row). Never on a plain re-render.
- Each view memoizes the last op by identity (`#lastOp`), like tradeProposeView `#lastToggle`.
- monster-privacy.spec.ts has no account-privacy flow (it is monster_pub privacy; it only renames via
  KeyN, which still works). The Profile › Privacy e2e lives in accounts.spec.ts; spec gap noted.
