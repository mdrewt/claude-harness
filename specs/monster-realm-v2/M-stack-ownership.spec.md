# Spec: M-stack-ownership — the context stack owns player-opened frames

**Status:** specced 2026-10-15 · build-ready · **Project:** monster-realm. Client-only.
Corrective C2b of the 2026-10 corrective wave, and the **named design input of M-gamepad**
(PLAN §9): a second input source must map onto a stack with ONE owner, not onto a mirror of
eighteen views' self-managed visibility. Two slices, BOTH touching `client/src/main.ts` —
**no fan-out**; `after:` serializes them (ttd-1 → so-1 → so-2). **Doctrine:**
`standards/testing-tdd.md`; anchors below give line numbers as of 2026-10-15 for orientation —
**anchors are symbols, not lines**.

## Problem / intent

Since ctl-2, the context stack (`ui/contextStack.ts`) sits BEHIND the legacy show/hide paths:
nothing pushes onto it directly. `syncStack()` (main.ts ≈607–638) mirrors the visible overlays
into it through `mirrorEdges`, and server truth is reconciled in on every batch
(`reconcileStack`, ≈671–689). Ownership is therefore inverted — the views own visibility, the
stack follows — with measured costs:

- The reconnect block (`onReconnect`, main.ts ≈3626–3711) hides TEN views directly
  (`renameView` ≈3648, `tradeProposeView` ≈3652, `menuView` ≈3660, `shopView` ≈3672,
  `tradeView` ≈3690, `pvpView` ≈3692, `battleView` ≈3695, `raisingView` ≈3696,
  `evolutionView` ≈3697, `leaderboardView` ≈3700), each deciding independently, instead of the
  stack closing its frames once.
- Three 18-row total-record tables in main.ts exist only to let the mirror see and close the
  views: `overlayProbes` (≈453–472), `overlayHandles` (≈486–505), `screenViews` (≈513–532).
- `worldBaseLive()`/`movementGate()` (≈694–705) MUTATE on read: every gate read runs
  `syncStack()` (and may close a sheet), because the stack cannot be trusted between mirrors.
- A gamepad (or any second source) routing "open X" through views-then-mirror would re-derive
  all of this per source; push-then-show gives it one entry point.

## Scope

IN: so-1 routes the reconnect block's frame closes through the stack (stack-owns-close), keeping
the unconditional view-state resets. so-2 inverts ownership for player-opened frames — one
`openFrame(frame)` push-then-show entry point with frame-level dedup and Social-panel routing
designed in; the visibility mirror shrinks to the server-owned trio; the three tables shrink to
the still-mirrored ids; the roster pins are rewritten once against the final shape.

OUT of scope — stated so the loop cannot scope-creep:

- the self-showing server-driven views keep their self-show paths (6 surfaces: `battleView` and
  `dialogueView` — whose frames stay mirror-owned — plus `claimView`'s auth/claim lifecycle and
  the registry-external `sessionView`, `errorOverlayView` and the `evolutionNotice` banner);
  converting them to `openFrame` is NOT this milestone (see Risks for the claimView fork);
- a single-registry collapse of the three main.ts tables: explicitly NOT wanted — three small
  total records with byte-identical thunks are the defense against copy-paste sibling bugs
  (their own header comments say why); they shrink, they do not merge;
- `ScreenHost` rework (`ui/screens/index.ts` keeps its adapter-state/paint contract; so-2 touches
  its wiring only where the open path moves);
- `main.ts` line count as a goal — no de-bloat tourism;
- M-gamepad itself (consumes this design; specced separately).

## Design sketch (what so-2 builds; the slice owns the final shape)

- `openFrame(id, …)` maps an overlay open to its frame (`frameOf`: the Social triple →
  the ONE `social` frame, contextStack.ts:42–44), pushes FIRST (`contextStep` push dedup,
  contextStack.ts:131, stays load-bearing), then shows the view. A push-less show becomes
  impossible for the player set; `blocksPlayerOpen`/`canOpen` verdicts read the STACK, not the
  probe table.
- The mirror (`mirrorEdges` call inside `syncStack`) shrinks to the server-owned trio: the battle
  base, the terminal-outcome frame (both presented by `battleView`) and `dialogueView` — the ids
  `reconcile` treats as server-owned today (SCREEN_POLICY owner 'server', contextStack.ts:85, 89).
- The three tables keep rows ONLY for still-mirrored ids; a player frame's probe/handle/view
  registers with `openFrame` instead of living in an 18-row record.
- `worldBaseLive()`/`movementGate()` become side-effect-free for the player set: a gate read
  derives from the stack as it stands (server-trio sync may remain on the batch path, where it
  already runs via `reconcileStack`).

## Risks / decisions

- **Operator gate (hard requirement):** so-2 is an ownership inversion across every player open
  path. The build loop MUST open an `mr-ask-drew` decision (slug `so-2`) presenting the final
  `openFrame` design (dedup, Social routing, the shrunk mirror, the table split) and have Drew's
  ANSWER recorded before so-2 merges — SO2.0 seeds this as a MANUAL gate whose evidence cites
  `memory/projects/decisions/issue-<n>.answer.md`. Not a formality: this is the M-gamepad
  foundation.
- **Atomic-or-reverted:** so-2 lands whole or is reverted whole (one PR; no partial landing of
  "mirror shrunk but opens not yet converted" — that intermediate strands frames). Recovery is
  reverting the whole so-2 range, never file-level checkout.
- **claimView fork (disciplined default, flagged):** `claimView` is player-openable (menu →
  account) AND self-shows on auth lifecycle edges (`onSignInFailed`, main.ts ≈3734). Default:
  its lifecycle call sites route through `openFrame` like any other call site (it is a call-site
  conversion, not a new mirror id), keeping SO2.4's no-stranded-overlay invariant total. If the
  slice finds that wrong, the alternative (keeping claimView mirror-owned) goes into the
  mr-ask-drew brief rather than being decided silently.
- The social triple mirrors as ONE `social` frame today (`mirrorEdges` dedups via `frameOf`,
  CTL8S.3) — a naive per-call-site push would duplicate frames the mirror never created; SO2.2
  pins this.
- so-1 before so-2: the reconnect sweep is the one place that closes MANY frames at once; moving
  it onto the stack first means so-2's inversion has a single close consumer to preserve, and
  `main.reconnectStack.test.ts` (new in so-1) becomes the regression harness so-2 runs against.

### so-1 — reconnect closes through the stack; the unconditional resets survive
category: ui-architecture (stack ownership) · severity: MED · size: MODERATE
touches: client/src/main.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/main.reconnectStack.test.ts, client/src/main.battle-reseed.test.ts, client/src/main.feedbackI18n.test.ts, client/src/main.dialogueDismiss.test.ts, client/src/main.controls.test.ts, client/src/main.dispatch.test.ts, client/src/main.boot.test.ts, client/src/main.exportTransport.test.ts, client/src/main.notices.test.ts, client/src/main.pvpPending.test.ts
after: [ttd-1]

- New file: `main.reconnectStack.test.ts` (the booted mock harness the other `main.*` suites use).
- Evidence: the ten direct hides are listed in Problem/intent; each rides `hide()` for TWO jobs —
  closing the surface AND clearing view-held locks/state (e.g. `tradeProposeView.hide()` clears
  the `#pending` lock that a never-settling in-flight `proposeTrade` promise would otherwise hold
  forever, main.ts ≈3649–3652; shop/trade double-spend locks; battle/raising/evolution
  settle-released locks). Stack-owns-close must not quietly turn those resets conditional.
- If a fix needs a file outside `touches:` (a view needs a new public reset seam), that is a
  hidden-dependency STOP — do not widen silently.

- **SO1.1:** WHEN the connection reconnects, THE CLIENT SHALL close every closeable upper frame
  through the stack's close path (pop + `close` command → `hideFrame` → the view's own hide
  path), replacing the ten independent per-view hide calls with one stack-driven sweep.
  - Red: `main.reconnectStack.test.ts` — open frames (menu, a Social panel, shop), fire
    `onReconnect`, assert each view's hide path ran and the stack is at its base.
- **SO1.2:** WHEN the connection reconnects, THE CLIENT SHALL run every view-state reset
  UNCONDITIONALLY, regardless of stack contents or visibility — named protected set: the
  trade-propose `#pending` lock clear, shopView's and tradeView's double-spend locks, renameView's
  stale draft, battleView/raisingView/evolutionView's settle-released locks (+ Care's),
  pvpView's stale challenge state, leaderboardView's stale board, `exportAssembly`,
  `lastPrivacyCountdown`, `boundShopId`/`boundHealLocationId`/`boundSocialTab`/
  `boundProposeTarget`, `screenHost.forget()`, the three request sets,
  `stepShopOpen({kind:'reconnect'})`, and `evolutionNoticeBanner.reset()`.
  - Red: hold a view lock while that view's frame is NOT on the stack (and not visible), fire
    `onReconnect`, assert the lock cleared — a naive "close only what the stack holds" fails this.
- **SO1.3:** WHILE a server conversation row exists, THE CLIENT SHALL NOT hide `dialogueView` on
  reconnect: `overlayHandles.dialogueView` stays the sole no-hide (undefined) handle, and every
  reconnect close routes through `hideFrame`, whose dialogue arm is a no-op.
- **SO1.4:** WHEN reconnect completes, THE CLIENT SHALL preserve the block's ordering guarantees
  unchanged: `armReseed` BEFORE `resetPredictionState`, `hydratedSinceReconnect` cleared
  unconditionally, a frame stamped `overBattle` goes with the reset, the stale status line
  cleared, and `applySession({ kind: 'connected' })` still fires — the existing guards
  (`main.battle-reseed.test.ts`, `main.feedbackI18n.test.ts`) stay green unmodified.

### so-2 — openFrame: push-then-show for player-opened frames; the mirror shrinks to the server trio
category: ui-architecture (stack ownership; M-gamepad design input) · severity: MED · size: HEAVY
touches: client/src/main.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/ui/screens/types.ts, client/src/ui/screens/index.ts, client/src/ui/screens/index.test.ts, client/src/ui/screens/mainMenuScreen.ts, client/src/ui/screens/mainMenuScreen.test.ts, client/src/main.input.test.ts, client/src/main.controls.test.ts, client/src/main.dispatch.test.ts, client/src/main.menu.test.ts, client/src/main.social.test.ts, client/src/main.accel.test.ts, client/src/main.a11yFocus.test.ts, client/src/main.reconnectStack.test.ts, docs/DECISIONS.md
after: [so-1]

- ATOMIC-OR-REVERTED (see Risks): one PR, whole or not at all.
- Evidence: the three 18-row tables and their anti-copy-paste comments are at main.ts ≈453–532;
  the mirror and its per-read sync are `syncStack` ≈607–638 and `worldBaseLive` ≈700–705; the
  roster pins this slice rewrites are `CTL2-1-POLICY` (SCREEN_POLICY totality,
  contextStack.test.ts ≈443), `CTL3-2-DROP-EXACT` (the hand-spelled 16-player-id manifest,
  ≈721–734) and `EXPECTED_PATHS` (router.test.ts ≈1505).
- If a fix needs a file outside `touches:`, that is a hidden-dependency STOP — do not widen.

- **SO2.0:** BEFORE so-2 merges, THE BUILD SHALL have the operator's answer recorded through
  `mr-ask-drew` (slug `so-2`) on the final openFrame design — dedup, Social routing, the shrunk
  mirror, the table split — with the gate's evidence citing the decision answer file
  (`memory/projects/decisions/issue-<n>.answer.md`). MANUAL gate; merging without the answer is
  a BLOCK, not a flag.
- **SO2.1:** WHEN a player opens any frame (menu entry, accelerator, world interaction, deferred
  shop open), THE CLIENT SHALL route the open through ONE `openFrame(frame)` that pushes the
  frame onto the stack FIRST and then shows its view, and a second open of a frame already on
  the stack SHALL NOT push a duplicate (frame-level dedup; `contextStep`'s same-id push no-op
  stays the enforcement point).
- **SO2.2:** WHEN any of the Social triple (tradeView, pvpView, leaderboardView) opens, THE
  CLIENT SHALL push the ONE `social` frame (`frameOf`/`socialPanel` routing), and switching the
  shown panel SHALL raise no push or pop.
  - Red: open Social, switch all three panels, assert the stack holds exactly one `social` frame
    throughout — a naive per-call-site push holds two.
- **SO2.3:** THE visibility mirror SHALL shrink to the three server-owned frames — the battle
  base and the terminal-outcome frame (both presented by `battleView`) plus `dialogueView` —
  so that every other frame reaches the stack only through `openFrame`, and battle, dialogue and
  outcome KEEP their mirror (their views still self-show on server edges and the mirror still
  pushes/pops their frames).
- **SO2.4:** WHEN any overlay is visible — after a player open, a server edge, a batch or a
  reconnect — ITS frame SHALL be on the stack (no shown-but-stranded overlay), covering
  `claimView`'s lifecycle shows under the default in Risks.
  - Red: an invariant test sweeping every open path and asserting visible ⇒ on-stack.
- **SO2.5:** WHEN `movementGate()`/`worldBaseLive()` is read, THE CLIENT SHALL perform no
  push/pop/show/hide of player-owned frames (side-effect-free for the player set), and the gate
  SHALL still be false under any upper frame, on a battle base even with the battle overlay
  hidden (B17), while the session gate blocks, and while a world/action/request sheet is open.
- **SO2.6:** THE three main.ts total-record tables (`overlayProbes`, `overlayHandles`,
  `screenViews`) SHALL shrink to exactly the still-mirrored ids — a player frame's probe,
  handle and view travel with its `openFrame` registration — and the tables SHALL NOT merge
  into a single registry.
- **SO2.7:** THE roster pins SHALL be rewritten exactly ONCE against the final shape —
  `CTL2-1-POLICY`'s totality pin, `CTL3-2-DROP-EXACT`'s player-id manifest and the router's
  `EXPECTED_PATHS` — retaining explicit hand-spelled counts and exclusions (a literal manifest,
  never derived from the table under test), with every intentional count change named in the
  test comment as prior intentional changes are (`15 -> 16 with controlsView` is the model).
- **SO2.8:** WHEN so-2 lands, THE protected behaviors SHALL remain pinned and green: polish-1
  P3's covered-but-stacked rule (a covered menu frame still counts as shown;
  `menuView.setCovered` hides paint only — main.ts ≈637, ui/menuView.ts ≈108–111), B17
  battle-never-hidden, the 400 ms outcome-continue grace (`OUTCOME_CONTINUE_GRACE_MS`,
  contextStack.ts ≈301, and `outcomeShownAtMs` tracking), `overBattle` stamping and its
  drop-on-a-different-battle rule, and so-1's reconnect clearing
  (`main.reconnectStack.test.ts` green unmodified).

- Post-integration verification: full `just ci` green (orchestrator-run); one manual pass of the
  operator flow Menu → Social → panel switches → battle start → outcome → reconnect confirming
  the EARS hold end-to-end, recorded in the PR; `docs/DECISIONS.md` entry
  ("Context stack ownership", title-keyed, supersede-in-place) written by this slice.
