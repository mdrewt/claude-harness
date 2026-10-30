# ctl-10b plan — face-to-face trade and challenge; O retired (CTL10B.1-2)

Worktree `projects/monster-realm/.claude/worktrees/ctl-10b`, branch `ctl-10b`, base 5b16acd5.
History: parked at verify-scope 2026-10-03 (hidden-dependency STOP); the auto-resume wrapper
re-invoked, so per the rb-73 precedent (no sibling in flight) it proceeds under a DISCLOSED
widening listed in the PR body `touches-delta:` with the gate that forced each file.

## Disclosed widening (outside the seeded touches; each REQUIRED)
- `client/src/ui/interactModel.ts` + `interactModel.test.ts`: `InteractAction` is a closed
  talk|shop|heal union; player candidates have `actions: []`. `WorldPort.run` and `interactChip` are
  typed on it, so widening the union here keeps `screens/index.ts` untouched. (CTL10B.1)
- `client/src/ui/screens/tradeProposeScreen.ts` + `tradeProposeScreen.test.ts`: `viewModel` hard-
  codes `targetSupplied: false`. (CTL10B.1 "no Target step")
- `client/src/ui/screens/types.ts`: `ScreenContext` gains OPTIONAL `proposeTarget?: string | null`
  (optional, so the ScreenContext literals in 5 test files stay valid). The CTL8S.2 `socialTab` precedent.
- `client/e2e/pvp.spec.ts:262`: clicks `pvp-challenge-player-btn`, which CTL10B.2 removes.
Sibling tests (allowed): main.controls/feedbackI18n/feedbackCore/input/dispatch .test.ts,
catalog.test.ts, catalogParity.test.ts, screens/worldScreen.test.ts.

## Design
Core (pure):
1. interactModel: `InteractAction += {kind:'trade'; playerIdentity: string} | {kind:'challenge';
   playerIdentity: string}`. In `marshalInteract` a player candidate's actions are
   `[trade, challenge]` (identity = `StorePlayer.identity`, the hex key). Comments "until ctl-10b" fixed.
2. actionSheetModel: `SheetState` gains `confirm: { key: string; nav: NavState } | null` (a 2-row
   nav list `yes`,`no`, cursor on yes). In `sheetStep`:
   - Start closes from either phase. On rows, B closes (as today).
   - A (fresh) on a row whose action is `challenge` enters confirm (no run). Other rows run as today.
   - In confirm: Up/Down move between Yes and No (the nav list rule). B returns to the rows with
     the row cursor kept. A on No returns to the rows. A on Yes runs the challenge ONLY if the key is
     still among `pickerEntries(current)` (revalidate, as today), then closes. Otherwise it closes
     and runs nothing. A repeated A does nothing.
   - `confirmLayout` is exported for the shell's render.
3. worldScreen: the one-row fast path never runs a `challenge` row. If the only row is a challenge,
   A opens the sheet directly in confirm. (A real player always offers both, so this is defensive.)
4. tradeProposeScreen: `viewModel` reads `ctx.proposeTarget ?? null`. `targetSupplied` = that
   identity is one of `lists.targets` (else the Target step stays: never a pre-fill for a player
   who has gone offline). vm also carries `target`.
Shell (main.ts):
5. `boundProposeTarget: string | null`. The `screenCtx.proposeTarget` getter reads it.
   `openPropose(target: string)` binds it, then `tradeProposeView.render(lists, target)` (the view
   pre-selects it and paints the header from `proposeSteps(true)`), then shows.
   `runInteract`: `trade` calls `openPropose` (only when `overlayVerdict('tradeProposeView')` allows
   it, with `held.clear()` first). `challenge` calls `dispatch({kind:'challenge', targetIdentity})`,
   the existing arm.
   `interactVerb` gets literal `interact.verb.trade` / `interact.verb.challenge`. The sheet render
   shows the confirm phase: a prompt (`interact.confirm.challenge` with `{name}`) plus a Yes/No
   listbox via `renderNav` (`prompt.yes` / `prompt.no`).
   The KeyO block is DELETED. O then falls through to whatever an unbound key does (nothing).
6. pvpView: `#renderPlayerList`, the `onChallenge` callback and the per-player buttons are deleted.
   pvpView becomes respond-only (incoming/outgoing). `#pvp-player-list` stays in index.html (outside
   touches) and stays empty. pvpModel still computes `players`, now unread (residual
   R-ctl-10b-PVPPLAYERS → ctl-8g). main.ts drops `onChallenge`.
7. tradeProposeView: `render(lists, target?)` pre-selects the target and paints the header with
   `proposeSteps(target present)`.
8. menuModel: no leaf targets tradeProposeView (already true; pin it). Fix the header comment
   ("Offer a Trade reachable by hotkeys only until ctl-10"). `menu.social.challenges.desc` becomes
   "See and answer challenges." (EN+FR).
9. helpModel CONTROLS: drop O. P = "Answer a PvP challenge". Enter = "Interact with what you face
   — talk, shop, heal, trade or challenge". No "nearby" anywhere (B15).
10. Catalog: +`interact.verb.trade`, `interact.verb.challenge`, `interact.confirm.challenge`.
    −`pvp.players.none`, `pvp.players.heading` (dead after 6: catalogParity DEAD-KEY). FR parity.
    catalog.test count updated.
11. DECISIONS.md: land "Interaction target: the tile in front, then your own tile" verbatim (spec
    ≈1232).
12. e2e (controls.ts helper `openFaceToFace(page, action: 'Trade'|'Challenge')`): both players
    join at the zone spawn. A's own tile is B's tile when neither moved. Otherwise walk A onto B's
    tile. Assert the chip reads Choose…, press A, pick the row `<Verb> — <B name>`, then press A
    (and A on Yes for Challenge). trade-propose ≈182/196/282, pvp-side-b ≈306-322,
    ranked-forfeit ≈287, monster-privacy ≈467 and pvp.spec ≈262 migrate. Where a test is not about
    initiation (pvp.spec's decline case), use `__mrPvp.challengePvp` instead. The CTL8E-1-BOOT-ESCAPE
    e2e opens the wizard face-to-face, so it lands on Offer: Escape still closes it.
13. main.*.test.ts KeyO sites (controls ×5, feedbackI18n 717, feedbackCore 477, input 1891) open
    the wizard face-to-face: the wasm mock's `interact_candidates_coded` returns the other
    player's index, then A, then A on Trade (first row). Tests that need the Target select (Escape
    on the select) still find it in the DOM. Named intentional changes.

## Gates (tags; CHECK shape = ctl-10a's vitest JSON, tags count == 1)
CTL10B.1: CTL10B-1-PLAYER-ACTIONS (interactModel), CTL10B-1-PICKER-PLAYER + CTL10B-1-CHALLENGE-CONFIRM
+ CTL10B-1-CONFIRM-STALE (actionSheetModel), CTL10B-1-WORLD-LONE-CHALLENGE (worldScreen),
CTL10B-1-PREFILL (tradeProposeScreen), CTL10B-1-VIEW-PREFILL (tradeProposeView), CTL10B-1-BOOT-TRADE,
CTL10B-1-BOOT-CHALLENGE-YES, CTL10B-1-BOOT-CHALLENGE-NO (main.input).
CTL10B.2: CTL10B-2-BOOT-O-NOOP (main.input), CTL10B-2-PVP-NO-INITIATE (pvpView),
CTL10B-2-MENU-NO-INITIATE (menuModel), CTL10B-2-HELP-NO-O (helpModel), CTL10B-2-CATALOG (catalog.test).
Plus the e2e migration (trade-propose / pvp-side-b / ranked-forfeit / monster-privacy / pvp) run by
`just ci`'s e2e tier.

## Shed rule
Two increments: (1) CTL10B.1 green + checkpoint; (2) CTL10B.2 + migrations. If /tmp/mr_warn_ctl-10b
appears after (1), DEFER CTL10B.2 -> ctl-10c [gameplay/MED] and drop the DECISIONS entry with it.

## REV 2 — plan-lens amendments (reviewer + red-team, 2026-10-03)
- SELECT LOCK (red-team #1): with a bound target the wizard's `#tradepropose-target` select is
  pre-selected AND `disabled` (no mouse/Tab retarget; the Target step is absent). `openPropose(t)`
  REFUSES to open (nothing shown, nothing sent) when `t` is not in `lists.targets`, so no fallback
  Target step. `viewModel.targetSupplied = ctx.proposeTarget != null` (decided at open; openPropose is
  the only open path after O is retired; boundProposeTarget is rebound on every open).
- FOCUS (reviewer #1): after `show()`, `syncStack()` + `screenHost.seat(frame, screenCtx)` for the
  tradeProposeView frame (the openSocial pattern), so the seating paint focuses the Offer list before
  overlayA11y's deferred initial-focus timer (which then skips: focus already inside the root).
  OVERLAY_A11Y is untouched.
- ELIGIBILITY (red-team #2): a player candidate offers actions only when `online`; Challenge is
  omitted when the player (or you) is in a Pending challenge. `marshalInteract` gains an optional
  trailing `busy: ReadonlySet<string>` (identities in a Pending challenge, own included); main.ts
  builds it from the store's challenges (pvpModel's busy rule, same predicate).
- RENDER (reviewer #2, red-team #3): the sheet `promptSig` includes the phase and `confirm.nav.item`;
  in confirm the listbox is Yes/No (`prompt.yes`/`prompt.no`), preceded by the prompt text
  (`interact.confirm.challenge` {name}); the listbox aria-label is the prompt in that phase.
- pvpView keeps `readonly onChallenge?: …` OPTIONAL and UNREAD (overlayA11yWiring.test.ts:369, outside
  touches, passes it) → residual R-ctl-10b-PVPCB; main.ts stops passing it.
- More named test changes: screens/tradeProposeScreen.boot.test.ts (10 KeyO sites; CTL8E-2-BOOT-O-OPENS
  retired → face-to-face open; boot Target-step cases retired — Target is unit-tested only),
  main.dispatch.test.ts:696/:938 (onChallenge), tradeProposeView.i18n.test.ts if it breaks,
  pvpView.test.ts (~30 player-list pins removed/retargeted to Accept/Decline/Cancel).
- messageIds.ts: +3 ids (params for interact.confirm.challenge), −2 (pvp.players.*).
- Stale prose fixed in touched files (tradeProposeView.ts:5-13, tradeProposeScreen.ts:5/:29,
  main.ts:384/:2346, tradeProposeModel.ts KeyO comments, interactModel "until ctl-10b").
- sheetStep: B/Start with `repeat: true` are ignored (a held B must not back out twice).
- Test teeth (red-team table): CONFIRM-STALE swaps the live candidate's identity between presses and
  asserts the LIVE identity runs; CHALLENGE-CONFIRM asserts no run on the first A, exactly one over
  A,A,A,A, repeat-A on Yes runs nothing; BOOT tests seed ≥2 other players and face the SECOND,
  asserting the reducer arg is the faced identity, once; BOOT-O-NOOP asserts defaultPrevented false,
  no overlay, no reducer; PVP-NO-INITIATE feeds players and asserts zero controls in the root.
