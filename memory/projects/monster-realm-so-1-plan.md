# so-1 plan — reconnect closes through the context stack

Spec: specs/monster-realm-v2/M-stack-ownership.spec.md#so-1 · worktree `.claude/worktrees/so-1` · base 87827a54

## Shape (functional core / imperative shell)

**Core (ui/contextStack.ts, pure):**
- `RECONNECT_CLOSES: Readonly<Record<FrameId, boolean>>` — TOTAL over FrameId (a new frame id is a
  compile error, the SCREEN_POLICY idiom; a separate table because `SCREEN_POLICY.dialogueView` is
  exact-pinned by CTL2-1-POLICY). `true` for exactly the frames the ten legacy hides closed:
  `menuView, renameView, tradeProposeView, shopView, social (tradeView/pvpView/leaderboardView),
  battleView (the outcome frame over the world), raisingView, evolutionView`. `false` for the rest,
  `dialogueView` always false.
- `reconnectSweep(stack): { stack, commands }` — keeps the base untouched; drops every upper frame
  that is `RECONNECT_CLOSES[idOf(f)]` OR a `screen` stamped `overBattle` — except dialogueView, never
  dropped (SO1.3); one `close` command per dropped frame, TOP FIRST (stackDiff/Escape-ladder order).
  Idempotent. No `clearHeld` (resetPredictionState already clears the hold).

**Shell (main.ts onReconnect):** at the old `renameView?.hide()` position (after
`resetPredictionState`):
1. `syncStack()` — every visible overlay is mirrored, so a view shown since the last sync is a frame
   the sweep can close (today's unconditional `menuView.hide()` covered that case).
2. `const swept = reconnectSweep(contextStack); contextStack = swept.stack;
   runStackCommands(swept.commands)` — pop + `close` → `hideFrame` → the view's own hide path.
   Replaces `menuView?.hide()` and the stamped-frame `for` loop.
3. Unconditional reset pass (SO1.2): `for (const id of RECONNECT_RESETS) overlayHandles[id]?.()`
   where `RECONNECT_RESETS` is a hand-spelled main.ts literal of the 9 lock/state-holding views
   (tradeProposeView, renameView, shopView, tradeView, pvpView, battleView, raisingView,
   evolutionView, leaderboardView). `hide()` is each view's ONLY reset seam (no new seam: that'd be
   a hidden-dependency STOP); all nine `hide()`s are unguarded + idempotent (measured), and
   `closeOverlayA11y` with no open record is a no-op, so a second hide after the sweep is safe.
   Runs regardless of stack/visibility — covers battleView over a battle base (never a frame).
   menuView is NOT in it (holds no state; closed by the sweep only).
4. Every other statement stays in place and in order: identity, exportAssembly, armReseed →
   hydratedSinceReconnect=false → resetPredictionState, stepShopOpen, lastPrivacyCountdown, bound*
   ids, screenHost.forget, three request sets, clearStatus, connect event, applySession, banner reset
   at the tail.

**Disciplined default (flag in PR):** "every closeable upper frame" = the frames the reconnect
closed before (ten views + stamped frames) — NOT help/box/questLog/heal/claim/privacy/controls opened
at the world. CTL6C-1's world arm pins "help opened at the world survives a drop" as a killed
over-reach and CTL7D-1 pins the heal frame surviving; a wider close is a behavior change not asked
for. Encoded as the total `RECONNECT_CLOSES` table so so-2/M-gamepad can flip a row deliberately.

## Tests (tester; never the implementer)
- `ui/contextStack.test.ts`: SO1-1-SWEEP (closes, top-first commands, base kept, idempotent,
  textEntry owner), SO1-1-ROSTER (hand-spelled literal of the closing ids), SO1-3-SWEEP-DIALOGUE
  (dialogue kept stamped or not, never a close for it).
- `main.reconnectStack.test.ts` (new, booted harness): SO1-1-BOOT (menu + a Social panel + shop open
  → onReconnect → each hide ran, stack `[world]` IMMEDIATELY, before any frame/sync — red today),
  SO1-2-BOOT (nothing visible/on stack → every protected view's hide runs on reconnect; + a battle
  base with battleView visible → hidden), SO1-3-BOOT (conversation row + dialogue shown → still shown
  and on the stack after reconnect), SO1-4-BOOT (stamped frame closes, status cleared, session overlay
  cleared).
- Existing guards unmodified: battle-reseed (18), feedbackI18n (7), CTL6C-1, CTL7D-1, CTL8S-1-BOOT-
  MEMORY, CTL13-3-BOOT-B, CTL3-5-BOOT-RECONNECT, RB53T, PGCCD-BOOT-RECONNECT-RESET, NH5-RECONNECT.

## Gates: vitest `-t <tag>` + exact passed count (polish-1 precedent).

## Plan review (reviewer + red-team, 2026-10-24) — folded in
- Sweep stays BEFORE the reset pass (reset-first would hide views so the mirror pops them edge-only,
  defeating SO1.1). syncStack's throw surface is the same one every frame already runs.
- RECONNECT_CLOSES: the three Social panel rows are never frames; set true to agree with `social`,
  commented. ROSTER pin spells EVERY FrameId's boolean literally (true and false rows).
- Test gaps adopted: stamped NON-closing frame (help/questLog over a battle) must drop (kills the
  "no overBattle clause" mutant); help/box/heal at the world survive; stack read IMMEDIATELY after
  onReconnect (kills "commands run, stack not assigned"); a menu shown with no sync since (kills
  "syncStack omitted"); every Social panel; per-view reset for all nine with the view forced hidden
  and off the stack (kills a probe-guarded reset loop and a short roster); ≥3-frame exact top-first
  command array; dialogue stamped / textEntry-owned / buried kept.
