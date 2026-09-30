# Spec: M-postgate-client-coverage — extract the client shell's inline decision logic into tested pure cores

**Status:** specced 2026-09-30 · build-ready · **Project:** monster-realm (client only) ·
**Surveyed against:** monster-realm master `efd3f3a0` (symbols cited below; line numbers are
`@efd3f3a0` and will drift, so treat the symbol as the anchor) · **Depends on:** nothing open ·
**Doctrine:** `standards/testing-tdd.md` (verification SSOT), PLAN §9 item 2.

## Problem / intent

`client/src/main.ts` is about 3.3k lines and has **no exports**. It still holds branching
decisions about what to do given the current game state, for example:
- which overlay a key opens or closes, and which overlay Escape dismisses first;
- when a battle start or end is emitted to the event ring;
- what feedback a reducer call produces;
- when a deferred shop-open fires.

Because main.ts exports nothing, the only way to test these decisions is to boot the whole app.
That is what the 11 `main.*.test.ts` suites do: they `vi.mock` the wasm package and
`net/connection`, `await import('./main')`, and drive keydown and rAF. Most of the branches have
no test at all.

`battleView.ts` and `boxView.ts` hold a small residue of the same kind. `client/vite.config.ts`
names that residue in its coverage-exclude comment as a "KNOWN FOLLOW-UP":
- main.ts's Escape terminal-dismiss latch;
- main.ts's party-slot sentinel routing;
- battleView's bait-id parse;
- boxView's nickname-changed guard.

`battleModel.ts` and `boxModel.ts` already exist, so this milestone covers only what is still
inline.

**Intent:** move the decisions that carry real bug risk into pure, colocated-tested cores,
following the house pattern (`privacyStep`, `claimStep`, `menuStep`: state + event → state +
effect, no DOM, no SDK). The shell keeps the effects and executes the core's verdict.
- **Done means reviewable, testable cores, not a coverage number.** `vite.config.ts`'s exclude
  list stays as it is, and no threshold is added.
- A one-line guard is not worth a slice (`testing-tdd.md`: "when genuinely unsure, don't add
  it"). The small items are listed as Boy Scout backlog, not dropped.

**Behaviour is preserved except where a slice names a defect.** The survey and review found five
real defects. Each slice that fixes one has a red test that fails **on the defect** in today's
code.

| # | Defect | Slice |
|---|---|---|
| 1 | Uncatalogued care string | pgcc-a |
| 2 | False-success feedback shape | pgcc-a |
| 3 | Divergent item-selection parse | pgcc-d |
| 4 | Stuck dialogue-dismiss lock | pgcc-c |
| 5 | claimView ignores Escape | pgcc-b |

1. **Uncatalogued care string.** `performCare`'s success line `'Cared!'` (`ui/careAction.ts`
   `CARED_MESSAGE`) reaches players (via `raisingView.showFeedback`) as raw English. This is the
   uncatalogued-string class 21r-b fixed, and it violates DECISIONS.md "no hard-coded UI strings".
2. **False-success feedback shape.** Eight inline feedback sites do
   `await conn.live()?.reducers.X(…)`: shop buy/sell, trade accept/reject/confirm/cancel, rename,
   and trade-propose. If `live()` is `undefined` while `linkFrozen()` is false, `await undefined`
   falls through to the **success** line for a call that never happened. `performCare` documents
   exactly this hazard and closes it by construction.
   - It is plausibly reachable. `connection.ts` `attemptBuild` sets `current = undefined` on
     session-expired / auth-unreachable without touching the link state, and `linkFrozen` checks
     only the link.
   - End-to-end reachability is unproven. The fix therefore removes the shape instead of trusting
     the invariant.
3. **Divergent item-selection parse.** battleView parses its two item selectors differently.
   - Bait uses `Number(raw)`, so a non-empty non-numeric value dispatches `onRecruit(NaN)`.
   - Cure uses `parseInt`, so `'12abc'` dispatches `12`.
   - Both violate reject-don't-clamp. The option values are generated, so this is hygiene, not an
     exploit.
4. **Stuck dialogue-dismiss lock.** Both dialogue-dismiss send paths (the Escape branch and the
   shop-button click) set `dismissPending = true` inside the send lambda, then return
   `conn?.live()?.reducers.dismissDialogue(…)`.
   - When `live()` is `undefined` (defect 2's condition), no promise comes back, no `.catch`
     runs, and `dismissPending` stays true while the conversation is still open.
   - Escape is then a dead button until the next reconnect.
5. **claimView ignores Escape.** The a11y SSOT `OVERLAY_A11Y` (`ui/overlayRegistry.ts`) marks
   `claimView` `dismissible: true`, where `dismissible` means "Escape closes it" (M23 §2.1).
   - No Escape branch closes it: main.ts's 15-branch stack omits it, and neither
     `overlayA11y.ts`, `focusTrap.ts` nor `claimView.ts` handles Escape.
   - It is the only dismissible overlay with no Escape path. `menuView` is closed by the
     `menuKeyInput` intercept.

## Scope

**In:** the four slices below.

**Named deferrals (declared, not dropped):**
- **Leave inline, by design (wontfix for this milestone).** These are on the netcode smoothness
  surface and have few branches. They are already behaviour-tested through boot (`main.boot`
  BOOT-MOVE / 14R-E, `main.a11yFocus` SPACE-*). Moving them buys little and risks "Bounded client
  prediction" and "Held keys".
  - `reconcileFromStore`, `sendIntent`, and `switchZone` (its guard already lives in
    `zoneSyncGuard`).
  - The frame loop's camera hold and fractional-motion latch.
  - The keydown **preamble**: the session gate, `e.repeat`, the hidden-subtree focus heal, F8/F9,
    the `menuKeyInput` intercept, `KEY_DIR` / `targetOwnsKey` / `suppressNativeMovementDefault`
    movement, and the held-key re-issue gate `outstandingSteps === 0 && !anyOverlayVisible()`
    (main.ts ≈1114, ≈3211).
- **backlog [ux-a11y/LOW], Boy Scout only.** A slice that is already editing the surrounding code
  may extract these opportunistically. They never become slices of their own.
  - **Privacy and claim:**
    - the privacy countdown gate compare (frame ≈3184-3195, already boot-guarded by
      `main.privacyWiring` RB52T-FRAME-DOES-NOT-CLEAR-INFLIGHT; the compare must treat an
      `undefined` previous as changed);
    - `openPrivacy`'s claim exception (≈648-652, RB52T-OPEN-ORDER);
    - the claim render deferral (≈482-487).
  - **Box:** boxView's nickname-changed guard.
  - **PvP:**
    - the own-party-ids filter, copied twice (≈2723, ≈2734);
    - the pvp `forceVisible` rule (≈1978-1981);
    - the pvp opponent-name lookup (≈1809-1813);
    - `menuAvailability` (≈763-786).
  - **UI helpers:**
    - the a11y close-edge announce (frame ≈3144-3151);
    - the interact-prompt memo key (≈3286-3300);
    - `projectKeyStore` (≈2390-2406);
    - the `MOVE_REJECT_PREFIX` error-overlay filter (≈931);
    - the reconnect hide list (≈3002-3080);
    - the five copies of `hasLiveConnection`;
    - the `onError`-`link` / `onClaimResult` mappings;
    - the bound heal/shop VM selection (≈1911-1946);
    - the heal-party target (≈2520-2525).
  - **battleView presentation predicates:** opponent label, pvp status, skill/swap visibility, and
    the HP colour band. `battleView.test.ts` already covers these through the DOM (≈5.9k lines,
    including the palette-contrast cases), so a `battleControls` aggregate would be a
    single-caller abstraction.
  - **Shop click id parse:** the shop-button `Number(dataset.shopId)` parse (≈2107), where `''`
    becomes `0`. It is defect 3's class, but is guarded today by the rendered `data-shop-id`.
- **Operator flag (behaviour question; pgcc-b preserves current behaviour).** `KeyT` (interact)
  is gated on `!anyOverlayVisible() && identity !== ''`, while every other hotkey uses the
  registry verdict (`canOpen`). It is a residual candidate if the operator deems it a defect.

## Acceptance criteria (EARS)

These criteria apply to every slice, and the tester encodes them per slice:
- **Pure core.** The extracted core has no DOM, no SDK, no module state, and no clock. Its inputs
  and outputs are plain data, and it is tested by ordinary colocated vitest (`xModel.test.ts`).
  Use table cases; use fast-check only where the input space is genuinely combinatorial (the
  hotkey deny-precedence).
- **No forbidden check shapes.** No eval, no source-text scan, no coverage threshold, and no
  check asserting that a call site exists (`testing-tdd.md`). Review verifies that the shell calls
  the core. Booted-app tests (the existing `main.*.test.ts` harness) verify the combined
  behaviour.
- **Existing tests pass unmodified.** WHEN a slice lands, every pre-existing test SHALL pass
  **unmodified**. That covers the `main.*.test.ts` suites, the view suites, and every e2e spec.
  The only exceptions are tests the slice's own criteria name as intentionally changed. A
  pre-existing boot test that exercised a moved decision SHALL stay, because it now guards the
  wiring. Deletion follows only `testing-tdd.md`'s rule, and must name the surviving test.
- **What "red" means.** For a behaviour-preserving extraction, red is a failing import or
  assertion against the core that does not exist yet. For defects 1–5, red is a test that fails
  **on the defect** in today's code.

## Slices

Each criterion is an id-led bullet (`**A1:**` …), and `mr-gates init` seeds one gate per id
(verified: 19 gates, 0 uncaptured SHALLs). Sub-bullets and the paragraphs that follow belong to
the criterion above them. Evidence bullets carry no criteria.

### pgcc-a — one feedback-action core for reducer calls with visible feedback (defects 1 + 2)
category: i18n defect + false-success hazard · severity: HIGH (i18n class, per 21r-b) · size: LIGHT-MODERATE
touches: client/src/main.ts, client/src/main.feedbackAction.test.ts, client/src/ui/careAction.ts, client/src/ui/careAction.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: []
- Evidence @efd3f3a0: `ui/careAction.ts` `performCare` is already the right core (call →
  frozen-`undefined` → disconnected; sync throw → error arm; settle → exactly one message), but its
  success line is uncatalogued (defect 1). main.ts has eight near-identical inline copies without
  its `undefined` guard (defect 2): shop `onBuy`/`onSell` ≈2634-2662, trade
  `onAccept`/`onReject`/`onConfirm`/`onCancel` ≈2668-2715, rename `onSubmit` ≈2822-2835, and
  tradePropose `onSubmit` ≈2845-2868.

- **A1:** WHEN care or any of the eight actions runs, THE SYSTEM SHALL route it through
  `careAction.ts`'s core (`performCare` generalised in place, taking the success message and `where`
  tag as inputs; no second module, no wrapper layer). The core calls `showFeedback` exactly once per
  invocation, choosing one of three lines. It shows the disconnected line when no call was made
  (the link is frozen, or the call returns `undefined`). It shows the action's catalogued success
  line only after the reducer promise resolves. It shows `reduceErrorMessage(err, where)` on a
  rejection or a synchronous throw, including a throw while building the call's arguments (e.g.
  `new Identity(args.targetIdentity)` for trade-propose). The returned promise always settles,
  because views hold in-flight locks on it.

- **A2:** IF `live()` yields no connection while `linkFrozen()` is false, THEN THE SYSTEM SHALL
  report disconnected and never success. Red: a booted-app test in `main.feedbackAction.test.ts`
  fails today, because it reports "purchased" for a call that was never made. The test uses the
  existing `main.*` mock harness, mocks `linkFrozen() === false` and `live() === undefined`, and
  clicks Buy in an open shop.

- **A3:** THE SYSTEM SHALL resolve the care success line through the i18n catalog under a new key,
  with English bytes `Cared!` unchanged plus a French entry. The existing `catalogParity`,
  `catalogShape` and `hardcodedStrings` suites stay green. Red: resolving care success under the
  `fr` locale fails today, because it returns the English literal.

- **A4:** WHEN a call site is routed through the core, THE SYSTEM SHALL keep three things from
  today: its "paint only while the overlay is visible" behaviour (the `showFeedback` closure may own
  that check), its `where` tag, and its existing success key. `main.feedbackI18n` passes unmodified.

### pgcc-b — hotkey routing table + Escape priority → hotkeyModel (defect 5)
category: testability (input routing) + a11y contract defect · severity: MED · size: MODERATE
touches: client/src/main.ts, client/src/main.keydown.test.ts, client/src/ui/hotkeyModel.ts, client/src/ui/hotkeyModel.test.ts
after: [pgcc-a]
- Evidence @efd3f3a0, hotkeys: the `window` keydown listener (main.ts ≈1306-1708) holds 13
  hand-copied hotkey branches (≈1348-1566).
  - B/I/E (the hide-switch trio) apply `verdict.forceHide` through `overlayHandles`, then
    `toggle()`, then call `refreshBox/Raising/Evolution()` only if the view is visible after.
  - Q/U/P/L close with `hide()` or open through `openQuestLog/Trade/Pvp/Leaderboard`.
  - N/O/?/M/C call `held.clear()` on open only. O and M also require `identity !== ''`. C has no
    identity guard.
  - T (interact) is gated on `!anyOverlayVisible() && identity !== ''`.
  - Every overlay key repeats `verdict.kind==='allow' && (self.visible || worldHasFocus())`.
  - Every hotkey calls `preventDefault()`, gated or not.
  - `e.code` branches are tested before `e.key === '?'`.
  - The menu click front door (≈2139-2143) repeats M's guard, minus the world-focus clause.
- Evidence @efd3f3a0, Escape: a 15-branch Escape stack (≈1571-1684) runs, in order: rename,
  tradePropose, help, battle, box, raising, evolution, dialogue, questLog, heal, shop, trade, pvp,
  leaderboard, privacy. It calls `preventDefault()` only when a branch closes something; otherwise
  it falls through to overlay suppression and movement. Its "Escape priority" comment (≈1591) no
  longer matches that order.

- **B1:** Before the extraction, THE SYSTEM SHALL have a booted-app characterization suite,
  `main.keydown.test.ts`. It pins today's observable keydown behaviour, is green on today's code,
  and stays unmodified through the extraction. It pins seven behaviours:
  - (i) each hotkey's open, close or swallow outcome and its `defaultPrevented`, over at least four
    states: nothing visible, self visible, a denying overlay visible, and world-unfocused;
  - (ii) B/I/E switching, which force-hides a visible sibling and refreshes the opened view;
  - (iii) `held.clear()` on open, and not on close, for N/O/?/M/C;
  - (iv) the identity requirement for O/M/T, and its absence for C;
  - (v) code-before-key precedence: `code: 'KeyM', key: '?'` routes to M, not help;
  - (vi) Escape order: for each adjacent pair in the stack, with both visible, Escape closes the
    higher-priority one first;
  - (vii) Escape with nothing closable is not `defaultPrevented` by the Escape stage.

- **B2:** WHEN given `{code, key, visibleIds, worldFocused, joined}`, a pure `routeHotkey` SHALL
  return exactly one decision as data. The decision is either `unhandled` (not a hotkey) or a
  verdict carrying `preventDefault` plus one action: `none` (gated), `close(id)`,
  `toggle(id, forceHide)` (hide-switch trio), `open(id, clearHeld)`, or `interact`. The shell maps
  the id to its existing opener or refresher. The routing table is data (one row per key), not
  per-key branches.

- **B3:** WHEN `routeHotkey` decides a key, THE SYSTEM SHALL reproduce that key's current guard
  exactly. That guard is made of six parts:
  - the `canOpen` verdict;
  - the self-visible-or-world-focused clause;
  - the per-key `joined` requirement;
  - the per-key `clearHeld`;
  - T's `anyOverlayVisible` gate (preserved; see the operator flag);
  - `forceHide`, taken verbatim from `canOpen`.

  Table cases pin three situations: with battle visible, every overlay key is denied; with box
  visible, Q is denied; with box visible, I is allowed with `forceHide = [boxView]`. A fast-check
  property shows that no `open`/`toggle` is returned for an id whose `canOpen` verdict denies
  (self exempt). The menu click front door uses the same core with its current guard (verdict and
  joined, no world-focus clause).

- **B4:** WHEN Escape is pressed, a pure `escapeTarget(visibleIds)` SHALL return the first visible
  id in ONE exported ordered list, or `null`. The list is today's 15 entries in today's order,
  followed by `claimView`. A test shows that the list equals exactly the ids whose
  `OVERLAY_A11Y[id].dismissible` is true, minus `menuView` (closed by the `menuKeyInput`
  intercept); these are domain data, not source text. Per-id side effects stay in the shell, keyed
  by the returned id:
  - battle's terminal-dismiss latch and the `lastBattleVM` reset;
  - the heal and shop unbind;
  - dialogue's pending-shop cancel and dismiss send.

- **B5:** WHEN Escape is pressed with `claimView` the top closable visible overlay, THE SYSTEM
  SHALL close it and `preventDefault` (defect 5). Red: this `main.keydown.test.ts` case fails today,
  because claim stays open. It is the one characterization case that is red by design, and it
  lands with the fix.

- Boy Scout (in scope, main.ts): correct the stale `main.wiring.test.ts` citations (≈199, ≈1310;
  that suite no longer exists) and the ≈1591 order comment.

### pgcc-c — event-emit latches + dialogue-dismiss/shop-open step → battleEmitModel, shopOpenModel (defect 4)
category: testability (latches repeatedly re-fixed: 16r-f, 17r-b; dead-button history) · severity: MED · size: MODERATE
touches: client/src/main.ts, client/src/main.dialogueDismiss.test.ts, client/src/ui/battleEmitModel.ts, client/src/ui/battleEmitModel.test.ts, client/src/ui/shopOpenModel.ts, client/src/ui/shopOpenModel.test.ts
after: [pgcc-b]
- Why one slice: both are arm/reset/reconnect state machines, and both edit the same
  `resetPredictionState` and reconnect region (≈1001, ≈3002-3060).
- Evidence @efd3f3a0, battle and ranked listeners (main.ts):
  - The battle-emit listener (≈2004-2040) is a state machine over `activeBattleId`,
    `battleReseedPending`, `reseedPrevBattleId` and `hydratedSinceReconnect`. It returns early on
    `identity === ''`.
  - Reconnect captures `reseedPrevBattleId = activeBattleId` only if a reseed is not already
    pending (≈3010-3012). It then re-arms `battleReseedPending` and clears `hydratedSinceReconnect`
    unconditionally (≈3037-3038).
  - `resetPredictionState` nulls `activeBattleId` and `lastOwnRating` (≈1001-1002). It also runs
    from `switchZone`, which does not arm a reseed.
  - The ranked listener (≈2046-2068) returns early when there is no profile.
  - Both are tested only through boot (`main.battle-reseed.test.ts`, about 20 cases).
- Evidence @efd3f3a0, dialogue and shop (main.ts):
  - Escape-in-dialogue (≈1617-1645) nulls `pendingShopId` up front, then sends `dismissDialogue`
    only if `!dismissPending`. Its rejection resets `dismissPending`.
  - The shop-button click (≈2105-2125) records `pendingShopId` (last intent wins) and sends under
    the same guard. Its rejection resets `dismissPending` and also nulls `pendingShopId`.
  - The dialogue batch listener (≈1861-1886) acts on a no-conversation batch. It clears
    `dismissPending` and consumes-and-clears `pendingShopId`, opening the shop only if no overlay is
    visible at that moment. Otherwise the open is dropped.
  - Reconnect clears both (≈3031, ≈3055-3057).

- **C1:** WHEN given the latch state and `{hydrated, latest}` (the latest player-battle summary or
  `undefined`), a pure battle-emit step SHALL return the next state and at most one emit. The emit
  is `battleStart(id, isPvp)`, `battleEnd(id, outcome, turn)`, or none. The step obeys seven rules:
  - (a) A pre-hydration flush never consumes a pending reseed.
  - (b) The first post-hydration flush consumes the reseed. If the surviving battle is still
    `Ongoing` under the same id, the step re-baselines without emitting; otherwise the same flush
    falls through to (c) and (d).
  - (c) `battleStart` fires once per newly seen `Ongoing` id.
  - (d) `battleEnd` fires only for the id the latch saw start. A battle first seen already terminal
    emits nothing.
  - (e) The outcome is the server tag, never perspective-mapped.
  - (f) PvP is classified by `isPvpBattle`, never by identity inequality.
  - (g) `armReseed` (reconnect) captures the previous id only when a reseed is not already pending
    (the first drop wins), and always re-arms. `reset` (zone switch) clears the active id without
    arming.

- **C2:** WHEN given `{lastRating, rating, latest}`, a pure ranked step SHALL decide the emit by
  three rules. With `lastRating === null` it baselines without emitting. With the rating unchanged
  it emits nothing. Otherwise it emits `rankedMatch(battleId, rating − lastRating)`, where
  `battleId` is the latest battle's id only if `isPvpBattle`, and `''` otherwise. The shell keeps
  the no-profile and `identity === ''` early returns.

- **C3:** WHEN given `(state, event)`, a pure shop-open step SHALL return the next
  `{dismissPending, pendingShopId}` plus effects (`sendDismiss`, `openShop(id)`, or none). It
  handles five events: escape-in-dialogue, shop-clicked(id), dismiss-rejected(path),
  batch(conversationPresent, anyOverlayVisible), and reconnect. Its rules:
  - It never sends a dismiss while one is pending.
  - Escape cancels a pending shop-open.
  - Rollback is per-path, exactly as today. A shop-click rejection nulls `pendingShopId`; an
    Escape-path rejection leaves it. So if an Escape dismiss is pending, Shop is then clicked, and
    the Escape dismiss is rejected, the click's intent survives.
  - The first no-conversation batch clears `dismissPending` and consumes `pendingShopId`. It emits
    `openShop` only if no overlay is visible; otherwise the open is dropped, never retained.
  - Reconnect clears both.

- **C4:** IF a dismiss send produces no reducer call (a frozen link, or `live()` yields no
  connection), THEN THE SYSTEM SHALL leave `dismissPending` unset (defect 4). Red:
  `main.dialogueDismiss.test.ts` fails today, because the second Escape sends nothing. The test
  uses the booted mock harness in three steps: press Escape in an open dialogue with
  `live() === undefined` and the link not frozen; let `live()` recover; press Escape again and
  expect a `dismissDialogue` send.

- **C5:** WHEN the latches and the shop-open step are extracted, THE SYSTEM SHALL keep
  `main.battle-reseed.test.ts` and `main.feedbackI18n` (the greet-then-shop round trip) passing
  unmodified.

### pgcc-d — battle/pvp/box decisions → battleModel, boxModel (defect 3; vite.config follow-ups)
category: testability + input hygiene · severity: MED · size: MODERATE
touches: client/src/main.ts, client/src/ui/battleModel.ts, client/src/ui/battleModel.test.ts, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/boxModel.ts, client/src/ui/boxModel.test.ts, client/src/ui/boxView.ts, client/vite.config.ts
after: [pgcc-c]
- Evidence @efd3f3a0 (main.ts):
  - `refreshBattle` (≈1783-1807) builds the bait-item list (inventory × defs, dropping missing defs)
    and the cure-item list (`cureStatus !== null`). It clears `pvpPendingTurnNumber` when
    `turn > pending || outcome !== 'Ongoing'` (the forfeit edge).
  - `onPvpAttack` / `onPvpSwap` (≈2558-2589) are near-duplicates. Each records the pending turn from
    the latest battle and restores it on rejection.
  - The Escape terminal-dismiss latch (≈1593-1598) is
    `latest && outcome !== 'Ongoing' ? dismissedBattleId = id : keep`.
  - `boxView.onSetPartySlot` (≈2498-2513) routes the `-1` "To Party" literal (from `boxView.ts`
    `#renderCard`) to `nextFreePartySlot`, or shows `chrome.status.partyFull` when the party is
    full.
  - In `battleView.ts`, the `#renderRecruit` and `#renderCureItems` click handlers use the two
    divergent selection parses (defect 3).

- **D1:** WHEN given store rows, pure builders SHALL return the bait-item and cure-item lists. A
  missing item def drops that entry and never throws.

- **D2:** WHEN given `(pendingTurn, latest)`, a pure rule SHALL decide whether the PvP pending
  submit clears. It clears when `turnNumber > pending`, or on any non-`Ongoing` outcome (the
  forfeit edge). It keeps the pending turn when the turn is unchanged, and it is a no-op when no
  turn is pending. The attack and swap pending-turn capture is one rule, and a rejected submit
  restores the prior pending value.

- **D3:** WHEN Escape closes the battle overlay, a pure rule SHALL return the battle id to dismiss
  permanently if and only if the latest battle is terminal. Otherwise it keeps the current dismissed
  id, so an `Ongoing` battle re-shows on the next batch.

- **D4:** WHEN given `(requestedSlot, ownMonsters, partySize)`, a pure resolver SHALL return
  `send(slot)` for an explicit slot or the box sentinel. For the next-free sentinel it returns
  `send(firstFreeSlot)`, or `partyFull` when no slot is free. The next-free sentinel is one exported
  named constant, used by both boxView and the resolver. Its value stays `-1`, because
  `boxView.test.ts` asserts the `-1` emission. `main.partyFull` passes unmodified.

- **D5:** WHEN given a raw `<select>` value, ONE pure selection parser SHALL classify it (defect 3).
  - It returns `none` for `''`.
  - It returns `item(id)` for a canonical decimal `u32` string: `0` or `[1-9][0-9]*`, with value
    ≤ 4294967295 (the item-id wire type, per the bindings' `__t.u32()`).
  - It returns `invalid` for anything else, e.g. `'12abc'`, `'007'`, `'-1'`, `' 3'`, `'1e2'`,
    `'NaN'`, `'4294967296'`.

  On `invalid`, neither Recruit nor Use-Item dispatches. On `none`, Recruit dispatches a bare
  attempt (`baitItemId` undefined) and Use-Item dispatches nothing, both as today.

  Red: two `battleView.test.ts` cases fail today:
  - Recruit with `'abc'`, which passes `NaN` today;
  - Use-Item with `'12abc'`, which dispatches `12` today.

  Each case appends an `<option>` carrying the bad value to the rendered selector and selects it.
  This is required because a real `<select>` ignores `.value` for a non-existent option.

- `vite.config.ts` (a comment edit only; the exclude list is unchanged): rewrite the
  coverage-exclude "KNOWN FOLLOW-UP" comment. Three of its four items now live in `battleModel` /
  `boxModel`; boxView's nickname guard stays inline (Boy Scout backlog).

## Build order and fan-out

- Every slice touches `client/src/main.ts`, the hot shared shell, so the milestone is **one
  serialized chain: a → b → c → d**.
- The order follows value. `a` goes first because it carries the HIGH i18n defect and the
  false-success shape. `b` is the riskiest rewire and lands on a quiet shell. `c` and `d` follow.
- No slice touches `game-core`, `server-module`, `client/src/module_bindings/`, or any schema.
  The milestone is client-only, with no `just gen`.

## Post-integration verification

After pgcc-d merges, on master:
1. The full `just ci` is green, including `client-typecheck`, `client-test` and
   `client-verify-build`.
2. `just e2e` is green. These specs drive the refactored hotkey, Escape, battle, shop, trade and
   feedback paths through the real UI: `golden`, `recruit`, `encounter-battle`, `pvp*`,
   `shop-npc`, `trade*`, `rename`, `dialogue`, `a11y` and `movement-input`. No new e2e is needed,
   because every touched flow already has one and unit and booted tests carry the criteria.
3. `git diff <milestone-base>..master -- client/src/module_bindings server-module game-core` is
   empty, so the milestone stayed client-only.
4. Every pre-existing `main.*.test.ts` passes, with no edits beyond those a slice's criteria named.

## Notes

- **What the next milestone consumes:** nothing new. This milestone only lowers the cost of
  changing the client. The Boy Scout backlog above rides along with whichever later slice next
  edits that code.
- **Decisions:** none expected. The work is refactors plus five defect fixes under existing
  decisions: "no hard-coded UI strings", reject-don't-clamp, and the M23 a11y contract's
  `dismissible`. A hotkey behaviour change beyond defect 5 is out of scope and goes to the
  operator (the `KeyT` flag).
- **Risk:** pgcc-b rewires every hotkey. The characterization suite lands first and stays
  unmodified, and it is the guard. Existing boot tests alone cover the Escape order and gated
  `preventDefault` too thinly (red-team finding at spec review).
- **Spec review (2026-09-30):** reviewer, red-team and `/simplify` lenses ran on the draft.
  - Simplify cut 8 slices to 4: the presentation predicates, the nickname guard and the privacy
    gates moved to the Boy Scout backlog, and the two reconnect-region state machines merged.
  - Red-team added the pgcc-b characterization suite, corrected the shop-open rule to
    consume-and-drop, and added the per-path rollback, the latch arm/reset rules, and defect 4.
  - Reviewer added the menu click front door and the `u32` parse bounds.
  - Defect 5 was found while checking a red-team note against `OVERLAY_A11Y`.
