# so-2 plan — openFrame push-then-show; the mirror shrinks to the server trio

Worktree `.claude/worktrees/so-2` (branch so-2 from origin/master 0660aada). Baseline full client
vitest 196 files / 4418 tests green (the handoff's 11-red BLOCKER does not reproduce).

## Design (final shape)

### Pure core — ui/contextStack.ts
- `MIRRORED_IDS: readonly MirroredId[] = ['battleView', 'dialogueView']` (+ `type MirroredId`,
  `isMirrored`) — the server trio's overlays: `battleView` presents the battle base AND the
  terminal-outcome frame; `dialogueView` the conversation. A literal, hand-spelled.
- `mirrorEdges(stack, visible, prevBase)` considers ONLY mirrored ids: a player id in `visible`
  raises no push, a player frame on the stack raises no pop. Battle/outcome/dialogue semantics
  unchanged (overBattle stamp rule, battleView-is-the-base over a battle).
- `frameOf` exported (Social triple → `social`).
- `openEdge(stack, id: FrameId): Edge` — the push edge of a player open: `{kind:'screen', id}`,
  stamped `overBattle` with the base's battle when the base is a battle (the player opened it over
  that battle). `contextStep`'s same-id push no-op stays the dedup enforcement point.
- `hiddenPops(stack, shown: readonly FrameId[]): readonly Edge[]` — pop edges for player-owned
  upper frames (not mirrored) whose view is no longer shown (a view that closed itself: privacy's
  close button, rename's Escape, the menu's own close, claim's lifecycle end, openPrivacy hiding
  claim). Pop-only — never a push — so a player frame still reaches the stack only through
  `openFrame`. Without it a self-closed view would strand its frame (movement dead).

### Shell — main.ts
- `openFrame(id: OverlayId, reg: FrameOpen, show: () => void): UpperFrame | undefined` — the ONE
  player open: sync (base + trio mirror + hiddenPops), register `reg` for `frameOf(id)`, apply
  `openEdge` through `contextStep` (a real push → clearHeld, resetRepeat, `screenHost.opened`),
  THEN run `show()`, then sync again (a show that did not take pops its frame; the menu's covered
  flag follows). Returns the frame when it is the top frame (callers seat adapters / LB the box).
- `FrameOpen = { probe, hide, view }` built by ONE helper `frameOpenOf(() => xView)` so each call
  site names its view once; social's registration is hand-built (probe = any panel shown, hide =
  hide the shown panels, view = `socialFrameView`). Registrations live in a `Map<FrameId,
  FrameOpen>` filled by `openFrame` — not a static table.
- Converted open paths (each frame's ONE open path calls openFrame): openMenu, openMenuTarget box
  and raising, openQuestLog, runInteract heal, openPendingShop, openSocial, openRename,
  openPropose, openHelp, openClaim, openPrivacy, openControls; claimView's lifecycle shows
  (`onSignInFailed`, and `renderClaim` whenever the claim vm is visible: onClaimPending etc.)
  route through openFrame too (spec Risks default; it is a call-site conversion, not a mirror id).
  `seatOpened`/`mirrorOpened` are replaced by openFrame's return.
- Tables shrink to the mirrored ids: `overlayProbes`, `overlayHandles` (dialogue still the sole
  `undefined`), `screenViews` are `Record<MirroredId, …>` — three small tables, NOT merged.
  `hideFrame`, `topOverlay`, `overlayVerdict` read the trio tables for mirrored ids and the
  registration for player frames; `overlayVerdict` feeds `canOpen` the overlays that are shown AND
  on the stack (the stack, not a probe table).
- `RECONNECT_RESETS` becomes the list of the nine reset thunks (`() => renameView?.hide()`, …): it
  can no longer index the shrunk handle table. Same nine views, same order.
- `worldBaseLive()`/`movementGate()` no longer call `syncStack()`: they read the stack as it
  stands (every input path already syncs at its top; the batch path syncs in `reconcileStack`
  and the last listener). The world sheet close stays (the sheet is not a frame).

### Not changed
SCREEN_POLICY / RECONNECT_CLOSES / reconcile / reconnectSweep / battlePolicy / ACCEL_PATHS key
sets and semantics. ScreenHost contract. Social panel switch (`socialFrameView.show` →
`showSocialPanel`) raises no edge.

## Spec conflict found (flagged, disciplined default)
SO2.8 says `main.reconnectStack.test.ts` stays "green unmodified", but two of its PRECONDITIONS
pin the very lag so-2 removes: SO1-1-BOOT-CLICK-OPENED-RENAME asserts the click-opened form is
NOT yet on the stack, SO1-1-BOOT-SURVIVE-CLAIM-PENDING asserts the claim prompt is NOT yet listed.
Push-then-show (SO2.1) and visible⇒on-stack (SO2.4) make both false by design. Default: the tester
flips exactly those two precondition lines as named intentional changes; every SO1 assertion after
`reconnect()` stays byte-identical. Recorded in the PR and the mr-ask-drew brief.

## Roster pins (SO2.7) — rewritten once
- CTL2-1-POLICY: + the server-owned rows are exactly the hand-spelled `MIRRORED_IDS`
  (battleView, dialogueView) — count 2; the totality literal unchanged.
- CTL3-2-DROP-EXACT: the 16 player ids = OVERLAY_IDS minus the 2 mirrored ids, named as the
  openFrame-owned set (count 16 unchanged — named in the comment).
- router EXPECTED_PATHS: the accelerator paths do not change shape (an accelerator still pops to
  the base, opens the menu and picks the path; the leaf now opens via openFrame). Pin unchanged —
  stated in the PR (rewriting it with no shape change would be churn).

## Gate CHECK plan
Test ids `SO2-<n>-…` in contextStack.test.ts (pure) and main.*.test.ts (boot, the
mainBootHarness pattern). CHECK = `npm --prefix client run test -- <files> -t "SO2-<n>-"` with a
pinned passed COUNT in EXPECT (a zero-match -t exits 0). SO2.0 MANUAL (answer file). SO2.8 = the
named protected suites in full.
