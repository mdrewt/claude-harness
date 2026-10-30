# ctl-8s plan — the Social seam (CTL8S.1-3)

Spec: `specs/monster-realm-v2/M-postgate-console-controls.spec.md` §ctl-8s. Worktree
`projects/monster-realm/.claude/worktrees/ctl-8s`, branch `ctl-8s`, base `b95fc62f`.
Seam only: no Social UI, no catalog ids, no CSS, no `index.html`, no `overlayRegistry.ts`.

## What is true on master (verified)

- `ScreenHost.opened(frame)` deletes the frame's state on every push edge; `init(vm)` sees only the
  view model. No adapter can remember anything between opens.
- U / P / L and `menu.social.trades|challenges|rankings` call `openTrade` / `openPvp` /
  `openLeaderboard`; `mirrorEdges` pushes one frame per visible overlay, so the stack shows
  `tradeView`, `pvpView` or `leaderboardView`.
- The pvp batch listener computes `forceVisible = !anyVisible(probes, 'pvpView') && (incoming || visible)`.
  `anyVisible` counts the main menu, so a Challenges overlay opened FROM the menu is hidden by the
  next store batch (the menu is still open beneath it).
- Rankings cannot be opened over a battle today (`HIDDEN_UNDER_BATTLE` in `mainMenuScreen.ts`,
  and `canOpen` denies L over `battleView`), so giving the Social frame the non-battle-safe policy
  loses nothing.
- e2e that must pass UNMODIFIED (outside touches): `pvp.spec.ts` ("KeyP does not open PvP overlay
  when trade overlay is visible"), `trade.spec.ts`, `pvp-side-b.spec.ts`, `ranked-forfeit.spec.ts`
  (auto-show + KeyP). So the legacy hotkeys keep today's per-overlay `canOpen` verdict and their
  same-key toggle-close.

## Design

### A. Cross-open memory (CTL8S.1) — `screens/types.ts`, `screens/index.ts`, `main.ts`

- `ScreenAdapter.remember?: true` (opt-in) and `init(vm: VM, remembered?: S): S`.
- `ScreenHost` keeps a second map `#remembered`. `opened(frame)`: for an opt-in adapter that has a
  kept state, that state moves to `#remembered`; the kept state is deleted as today. Every
  `init` call site (`#step`, `observe`, `seat`) passes `#remembered.get(id)` (undefined for every
  adapter that did not opt in, so existing adapters keep reset-on-open exactly).
- `ScreenHost.forget()`: clears `#remembered`, and drops the kept state of opt-in adapters (so a
  pre-reconnect state cannot be remembered by the next open). Non-opt-in frames keep their state.
  `main.ts` calls it in `onReconnect` (the only place identity changes after the first connect).
- `ScreenHost.seat(stack, ctx)`: the top screen/prompt frame, if it has no kept state, starts from
  `init(vm, remembered)` NOW and is painted once (throws go to `onPaintError`). Called only by
  `openSocial`. Why: a screen that chooses what it opens on (remembered tab, oldest waiting
  request) must show it at open, not at its first button or batch. `opened()` still runs no
  adapter code.

### B. The requested tab (CTL8S.2) — `screens/types.ts`, `main.ts`

- `export type SocialTab = 'players' | 'trades' | 'challenges' | 'rankings'`.
- `ScreenContext.socialTab: SocialTab | null`, a live getter over `boundSocialTab` in `main.ts`,
  set by `openSocial(tab)` before anything is shown, kept after close, `null` after a reconnect and
  for a plain open (`openSocial(null)`; no caller yet: the menu's Social entry is still a group).

### C. One Social frame (CTL8S.3) — `contextStack.ts`, `screens/index.ts`, `main.ts`, the three views

- `contextStack.ts`:
  - `SOCIAL_FRAME = 'social'`; `FrameId = OverlayId | typeof SOCIAL_FRAME` — the first frame id that
    is not an overlay id, so every `overlayProbes[frame.id]` / `overlayHandles[frame.id]` /
    `screenViews[id]` site in `main.ts` stops compiling until it handles the Social frame.
  - `SocialPanelId = 'tradeView' | 'pvpView' | 'leaderboardView'` (declared in `types.ts` beside
    `SocialTab`), `SOCIAL_PANELS`, `socialPanel(tab | null): SocialPanelId` (challenges → pvp,
    rankings → leaderboard, trades / players / null → trade: Players has no root until ctl-8g and
    the adapter's first paint picks the real panel).
  - `mirrorEdges(stack, visible: readonly OverlayId[], prevBase)` folds the three panel overlays
    into ONE `social` frame (position of the first visible panel). Switching the shown panel
    raises no edge, so the frame's adapter state survives a tab switch.
  - `SCREEN_POLICY.social = PLAYER_DROP`. The three panel ids keep their entries
    (`mainMenuScreen.ts` reads them) but are never pushed.
- `screens/index.ts`: `SCREEN_ADAPTERS.social = legacyAdapter` (ctl-8d swaps it).
- `main.ts`:
  - `showSocialPanel(panel)`: hides the other visible panels through their own hide paths, renders
    and shows `panel` (the three former `openX` bodies), then moves the shared chrome into it.
  - `closeSocial()`: hides every visible panel through its own hide path.
  - `openSocial(tab)`: bind tab → `showSocialPanel(socialPanel(tab))` → `syncStack()` →
    `screenHost.seat(...)` when the Social frame is the top frame.
  - U / P / L: one branch; gate unchanged per panel overlay
    (`overlayVerdict(panel).kind === 'allow' && (panelVisible || worldHasFocus())`); own panel
    visible → `closeSocial()`, else `openSocial(tab)`.
  - `openMenuTarget`: the three leaves → `openSocial('trades' | 'challenges' | 'rankings')`.
  - pvp batch listener: `pvpView.visible` → `refresh(vm, true)` (a shown panel only re-renders);
    else `vm.incoming !== null && !anyVisible(overlayProbes) && base is world` →
    `openSocial('challenges')`. Battle / conversation drops stay `reconcile`'s (as for trade).
  - every frame-id → overlay site (`closeFrame`, `runStackCommands` close, the reconnect
    over-battle loop, the a11y top overlay, the host's `viewOf`) handles `social`.
  - The Social frame's lent view is `SocialFrameView` (declared in `types.ts`):
    `{ trades, challenges, rankings (the three views, undefined until built), chrome: HTMLElement,
    show(panel) }`. `show` is `showSocialPanel` — the panel switch ctl-8d's `paint` uses.
  - `onReconnect`: `boundSocialTab = null; screenHost.forget()`.
- Views (`tradeView.ts`, `pvpView.ts`, `leaderboardView.ts`): one method each,
  `hostChrome(el: HTMLElement): void` — `el` becomes the root's first child. `showSocialPanel`
  moves the ONE chrome element (an empty `div` made by `main.ts`) into the shown panel, so a tab
  strip ctl-8d paints there shows on every panel, including the leaderboard root ctl-8d may not
  touch. Roots, ids, testids, probes, handles: unchanged. Empty div: no visual change.

## ctl-8d dry-run against this seam (nothing below touches `main.ts`)

- `SCREEN_ADAPTERS.social = socialScreen` (`nav`, `remember`).
- CTL8D.1: `viewModel(ctx)` reads `ctx.socialTab` + trades/challenges from `ctx.store`.
  `init(vm, remembered)` picks requested → oldest waiting request's tab → `remembered.tab` → default.
  `seat` paints at open: `paint(view: SocialFrameView, vm, state)` calls `view.show(panelOf(tab))`,
  paints the tab strip into `view.chrome` via a `TradeView` method, and the rows/sheet via
  `view.trades` / `view.challenges` (both in ctl-8d touches). Players placeholder: in the trade root.
- CTL8D.2: existing `Command` arms.
- CTL8D.3: U / P / L already bind `trades` / `challenges` / `rankings`.
- ctl-8g paints Players and Rankings through `view.rankings` (`leaderboardView.ts`).

## Out of scope / not built

- No `Command` arm for opening Social (no consumer; ctl-11a owns accelerators).
- No DOM re-parenting of the three roots; each stays its own `role=dialog` shell.
- Level-triggered auto-show (re-opens after Escape while the challenge is pending) is today's
  behaviour and stays until ctl-13's banner.

## Tests (tester-owned; tags are the ledger's)

| Gate | File | Tag |
|---|---|---|
| CTL8S.1 | `ui/screens/index.test.ts` | `CTL8S-1-REMEMBER`, `CTL8S-1-FORGET`, `CTL8S-1-SEAT` |
| CTL8S.1 | `main.dispatch.test.ts` | `CTL8S-1-BOOT-MEMORY` |
| CTL8S.2 | `main.dispatch.test.ts` | `CTL8S-2-BOOT-SOCIAL-TAB` |
| CTL8S.3 | `ui/contextStack.test.ts` | `CTL8S-3-MIRROR-ONE-FRAME`, `CTL8S-3-SOCIAL-PANEL` |
| CTL8S.3 | `main.dispatch.test.ts` | `CTL8S-3-BOOT-ONE-FRAME`, `CTL8S-3-BOOT-PANELS`, `CTL8S-3-BOOT-AUTO-SHOW`, `CTL8S-3-BOOT-NESTED-RENDERS` |
| CTL8S.3 | `ui/tradeView.test.ts`, `ui/pvpView.test.ts`, `ui/leaderboardView.test.ts` | `CTL8S-3-HOST-CHROME-TRADE`, `CTL8S-3-HOST-CHROME-PVP`, `CTL8S-3-HOST-CHROME-BOARD` |

Named intentional changes expected in existing tests: `CTL6B-1-ADAPTERS-TOTAL` and the
`SCREEN_POLICY` totals (one more id, `social`); `mirrorEdges` oracles (panel fold);
`CTL7C-2-BOOT-VIEWS` (trade / pvp / leaderboard are no longer frames; the Social frame lends the
composite). Sibling `main.*.test.ts` that pin a `tradeView` / `pvpView` / `leaderboardView` frame
on the stack are touches-delta.

## Plan review (reviewer + red-team, 2026-10-03) — changes adopted

1. **`showSocialPanel` is idempotent and show-before-hide.** A panel that is already shown is not
   re-rendered; the requested panel is rendered and shown FIRST, then the others are hidden (a
   render that throws leaves the old panel up, and the a11y layer takes its covered-close path:
   no focus bounce through the menu beneath). `hostChrome(el)` is a no-op when `el` is already
   the root's first child (a re-prepend would drop focus inside the chrome).
2. **`SocialFrameView.show(panel)` is a no-op unless the Social frame is the TOP frame.**
   `ScreenHost.observe` paints covered frames too; a panel switch under a covering frame (the
   claim overlay opens unguarded) would open a dialog beneath it and invert the a11y stack.
3. **`seat(frame, ctx)` takes the frame** (like `opened`), keeps the state before painting (as
   `#step` does); a throw from `viewModel` / `init` / `paint` is reported, never thrown.
4. **`forget()` also runs in `onReady`** (identity changes from `''`: a pre-join U / P / L may
   have seeded the memory).
5. **One `hideFrame(id: FrameId)`** in `main.ts` replaces the three
   `overlayProbes[id]() → overlayHandles[id]?.()` sites (`closeFrame`, the stack's `close`
   command, the reconnect over-battle loop); `upperIds()` returns `FrameId[]`, and the a11y
   top-overlay read maps the Social frame to its shown panel (`announcementsFor` takes an
   `OverlayId`; `overlayRegistry.ts` is out of touches).
6. **Policy coupling, recorded not changed.** The menu's battle rule reads the panel rows
   (`leaderboardView` is battle-safe per ctl-6c) while `reconcile` reads `social` (drop). Today
   Rankings is disabled over a battle by `HIDDEN_UNDER_BATTLE`, so they cannot disagree; the slice
   that removes it from that set must revisit the Social row. A comment on the row says so.
7. **Named sibling tests (touches-delta):** `main.controls.test.ts` (~634) and `main.menu.test.ts`
   (~589) pin `['world','menuView','leaderboardView']`; `contextStack.test.ts` helper tables and
   `screens/index.test.ts` tables are built from `OVERLAY_IDS` and must carry `social`.
8. **Not adopted:** a `FRAME_IDS` export (no production consumer; tests build
   `[...OVERLAY_IDS, SOCIAL_FRAME]`), refocusing a chrome descendant after a move (no chrome content
   exists yet; the nav kit keeps focus on one container), and changing the `leaderboardView` row.
9. **Known, unchanged:** hiding a panel resets its in-flight lock (as P-P does today); the server
   rejects a duplicate.
