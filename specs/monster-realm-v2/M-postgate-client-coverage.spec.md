# Spec: M-postgate-client-coverage — extract the client shell's inline decision logic into tested pure cores

**Status:** specced 2026-09-30 · build-ready · **Project:** monster-realm (client only) ·
**Surveyed against:** monster-realm master `efd3f3a0` (symbols cited below, line numbers are
`@efd3f3a0` and will drift — the symbol is the anchor) · **Depends on:** nothing open ·
**Doctrine:** `standards/testing-tdd.md` (verification SSOT), PLAN §9 item 2.

## Problem / intent

`client/src/main.ts` (≈3.3k lines, **no exports**) still holds branching decisions about what to
do given the current game state. Examples: which overlay a key opens or closes, which overlay
Escape dismisses first, when a battle start or end is emitted to the event ring, what feedback a
reducer call produces, and when a deferred shop-open fires. Because main.ts exports nothing, its
decisions can only be tested by booting the whole app. The 11 `main.*.test.ts` suites do exactly
that: they `vi.mock` the wasm package and `net/connection`, `await import('./main')`, and drive
keydown/rAF. So each rule is reachable only through a full boot, and most branches have no test
at all.

`battleView.ts` and `boxView.ts` hold a small residue of the same kind, and `client/vite.config.ts`
names it in its coverage-exclude comment as a "KNOWN FOLLOW-UP": main.ts's Escape terminal-dismiss
latch and party-slot sentinel routing, battleView's bait-id parse, and boxView's nickname-changed
guard. `battleModel.ts` and `boxModel.ts` already exist, so this milestone covers only what is
still inline.

**Intent:** move each decision into a pure, colocated-tested `*Model.ts` core, following the house
pattern (`privacyStep`, `claimStep`, `menuStep`: state + event → state + effect, no DOM, no SDK).
The shell (main.ts / the views) keeps the effects and just executes the model's verdict. **Done
means reviewable, testable cores, not a coverage number.** `vite.config.ts`'s exclude list stays
as it is, and no threshold is added.

**Behaviour is preserved except where a slice names a defect.** The survey found three real
defects, and those slices fix them with a red test that fails on the defect:
1. `performCare`'s success line `'Cared!'` (`ui/careAction.ts` `CARED_MESSAGE`) is raw English
   that reaches players. It is the same uncatalogued-string class 21r-b fixed, and violates
   DECISIONS.md "no hard-coded UI strings" (fixed in pgcc-f).
2. The eight inline feedback sites (shop buy/sell, trade accept/reject/confirm/cancel, rename,
   trade-propose) do `await conn.live()?.reducers.X(…)`. If `live()` is `undefined` while the link
   is not frozen, `await undefined` falls through to the **success** line for a call that never
   happened, which is the exact hazard `performCare` documents and closes by construction. Its
   reachability is unproven: `connection.ts` `live: () => current`. The fix therefore removes the
   shape instead of trusting the invariant (pgcc-f).
3. battleView parses the two item selectors differently. Bait uses `Number(raw)`, so a non-empty
   non-numeric value dispatches `onRecruit(NaN)`. Cure uses `parseInt`, so `'12abc'` dispatches
   `12`. Both violate reject-don't-clamp (pgcc-a). Each option's value is generated, so this is
   hygiene, not an exploit.

## Scope

**In:** the eight slices below.

**Named deferrals (declared, not dropped):**
- **Leave inline, by design (wontfix for this milestone):** `reconcileFromStore`, `sendIntent`,
  `switchZone` (its guard already lives in `zoneSyncGuard`), the frame loop's camera hold and
  fractional-motion latch, and the keydown **movement** preamble: `KEY_DIR`, `targetOwnsKey`,
  `suppressNativeMovementDefault`, and the held-key re-issue gate
  `outstandingSteps === 0 && !anyOverlayVisible()` (main.ts ≈1114, ≈3211). These are on the
  netcode smoothness surface and have few branches. They are already behaviour-tested through
  boot (`main.boot` BOOT-MOVE / 14R-E and `main.a11yFocus` SPACE-*). Moving them buys little and
  risks the smoothness contract ("Bounded client prediction", "Held keys").
- **backlog [ux-a11y/LOW], Boy Scout only:** a slice that is already editing the surrounding code
  extracts these opportunistically. They never become slices of their own:
  - `menuAvailability` (≈763-786) → `menuModel`
  - the a11y close-edge announce/refocus (frame ≈3144-3151) → `announcements`
  - the interact-prompt memo key (≈3286-3300) → `interactModel`
  - `projectKeyStore` (≈2390-2406) → `bugBundle`
  - the `MOVE_REJECT_PREFIX` error-overlay filter (≈931) → `errorOverlayModel`
  - the reconnect hide list (≈3002-3080) → an `overlayRegistry` constant
  - the five copies of the `hasLiveConnection` expression
  - the `onError`-`link` / `onClaimResult` mappings
  - the bound heal/shop VM selection (≈1911-1946)
  - the heal-party target (≈2520-2525)
- **Operator flags (behaviour questions, not extraction; pgcc-b preserves current behaviour):**
  - (i) **claimView has no Escape close.** It is the only visible-capable overlay missing from the
    Escape stack. It closes via `C` or its own controls. Is this intended?
  - (ii) **`KeyT` is gated differently.** It uses `!anyOverlayVisible() && identity !== ''`,
    while every other hotkey uses the registry verdict (`canOpen`).
  - Both are candidates for `residuals.spec.md` if the operator deems them defects.

## Acceptance criteria (EARS)

These criteria apply to every slice, and the tester encodes them per slice:
- The extracted core is pure: no DOM, no SDK, no module state, no clock. Its inputs and outputs
  are plain data, and it is tested by ordinary colocated vitest (`xModel.test.ts`). Property tests
  (fast-check) are used where the input space is combinatorial (hotkeys, the Escape order).
- **No eval, no source-text scan, no coverage threshold, and no check that asserts a call site
  exists** (`testing-tdd.md`). Review verifies that the shell calls the core. The boot suites
  verify that the combined behaviour is unchanged.
- WHEN a slice lands, every pre-existing test SHALL pass **unmodified**. That covers the
  `main.*.test.ts` suites, the view suites, and every e2e spec. The only exceptions are tests the
  slice's own criteria name as intentionally changed. A pre-existing boot test that exercised the
  moved decision SHALL stay in place: it now guards the wiring. A boot test is deleted only under
  `testing-tdd.md`'s deletion rule, and the surviving unit test must be named.
- "Red" for a behaviour-preserving extraction means a failing import or assertion against the not
  yet existing core. For the three defects above, red means the test fails **on the defect** in the
  current code.

## Slices

### pgcc-a — battleView presentation + item-selection parse → battleModel
category: testability + input hygiene · severity: LOW · size: LIGHT
touches: client/src/ui/battleModel.ts, client/src/ui/battleModel.test.ts, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts
after: []
- Evidence @efd3f3a0 (`ui/battleView.ts`). The following branches sit in the view:
  - `refresh`: the opponent label is `vm.isPvp && vm.pvpOpponentName ? name : t('battle.card.opponent')`.
  - `#renderPvpStatus`: the "waiting" line shows only when `isPvp && outcome==='Ongoing' && pvpPendingSubmit`.
  - `#renderSkills`: skills are hidden when `!ongoing || skills.length===0 || pvpPendingSubmit`.
  - `#renderSwapButtons`: swaps are hidden when `isPvp && pvpPendingSubmit`.
  - `#renderActions`: the swap hint shows when `outcome==='Ongoing' && !canSwap`.
  - `#renderMonsterCard`: the HP band is `pct > 50 / > 20` (the M23 colour-blind-safe palette).
  - `#renderOutcome`: the outcome maps to a message key.
  - `#renderRecruit` / `#renderCureItems` click handlers: the two divergent selection parses
    (defect 3).
- EARS: WHEN given a `BattleViewModel`, a pure `battleControls(vm)` (name is the implementer's
  choice) SHALL return every presentation decision above as data. That covers the opponent label
  (a model-supplied name or the default key), the pvp status (`hidden`|`waiting`), whether skills,
  swaps and the swap hint are shown, and the outcome message key (`null` while `Ongoing`). The
  return value SHALL equal the branch outcomes the view renders today for every `outcome` ×
  `isPvp` × `pvpPendingSubmit` × `canSwap` × empty/non-empty skills combination.
- EARS: WHEN given an HP percentage, a pure HP-band function SHALL return `healthy` above 50,
  `wounded` above 20, and `critical` otherwise, at exactly the view's current boundaries (50→wounded,
  51→healthy, 20→critical, 21→wounded). The view SHALL keep the colour literals and map band →
  colour. The existing palette-contrast cases in `battleView.test.ts` SHALL pass unmodified.
- EARS: WHEN given a raw `<select>` value, ONE pure selection parser SHALL return `none` for `''`,
  `item(id)` for a canonical non-negative decimal integer string within the item-id range, and
  `invalid` for anything else (`'12abc'`, `'-1'`, `' 3'`, `'1e2'`, `'NaN'`). IF the parse is
  `invalid`, THEN the view SHALL dispatch nothing for either the Recruit or the Use-Item action.
  IF the parse is `none`, THEN Recruit SHALL dispatch a bare attempt (`baitItemId` undefined, as
  today), and Use-Item SHALL dispatch nothing (as today). Red: a `battleView.test.ts` case that
  sets a non-numeric bait value and clicks Recruit SHALL fail today, because `onRecruit` receives
  `NaN`.

### pgcc-b — hotkey routing table + Escape priority → hotkeyModel
category: testability (input routing) · severity: MED · size: MODERATE
touches: client/src/main.ts, client/src/ui/hotkeyModel.ts, client/src/ui/hotkeyModel.test.ts
after: []
- Evidence @efd3f3a0: the `window` keydown listener (main.ts ≈1306-1708) holds two things:
  - **13 hand-copied hotkey branches** (≈1348-1566). B/I/E are the hide-switch trio, applying
    `verdict.forceHide` and `toggle()`. Q/U/P/L are toggles. N/O/?/M call `held.clear()` before
    opening, and O and M also require `identity !== ''`. C opens claim with `held.clear()` and has
    no identity guard. T (interact) uses `!anyOverlayVisible() && identity !== ''`. Every overlay
    key repeats `verdict.kind==='allow' && (self.visible || worldHasFocus())`.
  - **A 15-branch Escape stack** (≈1571-1684), in this order: rename, tradePropose, help, battle,
    box, raising, evolution, dialogue, questLog, heal, shop, trade, pvp, leaderboard, privacy.
    Its "Escape priority" comment (≈1591) no longer matches that order.
- EARS: WHEN given `{code, key, visibleIds, worldFocused, joined}`, a pure `routeHotkey` SHALL
  return exactly one of:
  - `none` (swallow): the key is a hotkey but is gated;
  - `close(id)`: toggle-close;
  - `open(id, forceHide, clearHeld)`;
  - `interact`: `KeyT`;
  - `unhandled`: the key is not a hotkey, so the listener continues to the Escape, overlay and
    movement stages.

  The verdict SHALL reproduce, for every hotkey, the current guard exactly:
  - the `canOpen` verdict from `overlayRegistry`;
  - the self-visible-or-world-focused clause;
  - the per-key `joined` requirement (O, M, T), and **no** such requirement for C;
  - the per-key `clearHeld` (N, O, ?, M, C);
  - T's `anyOverlayVisible` gate (preserved; operator flag ii);
  - the hide-switch `forceHide` list, taken verbatim from `canOpen`.

  A fast-check property SHALL show that `open`/`close` is never returned for an id whose
  `canOpen` verdict denies (self exempt), and that `forceHide` ⊆ the HIDE_SWITCH trio.
- EARS: WHEN Escape is pressed, a pure `escapeTarget(visibleIds)` SHALL return the first visible
  id in ONE exported ordered list (the order above), or `null`. The list SHALL contain every
  `OverlayId` exactly once except `menuView` (its Escape is handled earlier by `menuKeyInput`)
  and `claimView` (no Escape close today; operator flag i). A test SHALL check this against
  `OVERLAY_IDS`, the domain enumeration, which is not source text. The per-id side effects SHALL
  stay in the shell, keyed by the returned id: battle's terminal-dismiss latch, the heal/shop
  unbind, and dialogue's dismiss send.
- EARS: WHEN the listener runs after this slice, the booted-app suites that drive keys SHALL pass
  unmodified: `main.a11yFocus` (world-focus gate, deny precedence, stale focus, SPACE-*) and
  `main.boot`. So SHALL every e2e spec that presses hotkeys.
- Boy Scout (in scope, main.ts): correct the stale `main.wiring.test.ts` citations in comments
  (≈199, ≈1310, ≈2528; that suite no longer exists) and the ≈1591 order comment.

### pgcc-f — one feedback-action core for reducer calls with visible feedback (fixes defects 1 + 2)
category: i18n defect + false-success hazard · severity: HIGH (i18n class per 21r-b) · size: LIGHT-MODERATE
touches: client/src/main.ts, client/src/ui/careAction.ts, client/src/ui/careAction.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [pgcc-b]
- Evidence @efd3f3a0:
  - `ui/careAction.ts` `performCare` is already the right core: call → frozen-`undefined` →
    disconnected, sync throw → error arm, settle → exactly one message. But its success line
    `CARED_MESSAGE = 'Cared!'` is uncatalogued (defect 1).
  - Main.ts has eight near-identical inline copies that lack its `undefined` guard (defect 2):
    shop `onBuy`/`onSell` ≈2634-2662, trade `onAccept`/`onReject`/`onConfirm`/`onCancel`
    ≈2668-2715, rename `onSubmit` ≈2822-2835, and tradePropose `onSubmit` ≈2845-2868.
- EARS: WHEN any of the eight actions or care runs, ONE pure-async core (generalising
  `performCare`; `performCare` MAY remain as a thin wrapper) SHALL call `showFeedback` exactly once:
  - with the disconnected line when no call was made (the gate is frozen, or the call returns
    `undefined`);
  - with the action's catalogued success line only after the reducer promise **resolves**;
  - with `reduceErrorMessage(err, where)` on a rejection or a synchronous throw.
- EARS: IF `live()` yields no connection while the link is not frozen, THEN the action SHALL
  report disconnected and SHALL NOT report success. Red: a unit test over the core, with a call
  that returns `undefined`, SHALL fail against the inline shape.
- EARS: The care success line SHALL resolve through the i18n catalog under a new key, with the
  English bytes `Cared!` unchanged and a French entry. The existing `catalogParity` /
  `catalogShape` / `hardcodedStrings` suites SHALL pass. Red: a test resolving care success under
  the `fr` locale SHALL fail today, because it returns the English literal.
- EARS: Each call site SHALL keep its current "paint only while the overlay is visible" behaviour
  (the `showFeedback` closure MAY own that check), its `where` tag, and its existing success key.
  `main.feedbackI18n` SHALL pass unmodified.

### pgcc-c — battle-start/end + ranked-delta event-emit latches → battleEmitModel
category: testability (observability latch; repeatedly re-fixed: 16r-f, 17r-b) · severity: MED · size: LIGHT-MODERATE
touches: client/src/main.ts, client/src/ui/battleEmitModel.ts, client/src/ui/battleEmitModel.test.ts
after: [pgcc-f]
- Evidence @efd3f3a0: the battle-emit batch listener (main.ts ≈2004-2040) is a state machine over
  module state `activeBattleId`, `battleReseedPending`, `reseedPrevBattleId` and
  `hydratedSinceReconnect`. It is armed on reconnect (≈3012, ≈3037-3038) and reset in
  `resetPredictionState` (≈1001-1002). The ranked-delta listener (≈2046-2068) baselines
  `lastOwnRating` on first sight. It is tested only through boot (`main.battle-reseed.test.ts`,
  about 20 cases).
- EARS: WHEN given the latch state and `{hydrated, latest}`, where `latest` is the latest player
  battle summary or `undefined`, a pure step SHALL return the next latch state and at most one
  emit (`battleStart(id, isPvp)` | `battleEnd(id, outcome, turn)` | none). The step SHALL follow
  these rules:
  - (a) Pre-hydration flushes never consume a pending reseed.
  - (b) The first post-hydration flush consumes it. If the surviving battle is still `Ongoing`
    under the same id, that flush re-baselines it without emitting.
  - (c) `battleStart` fires once per newly seen `Ongoing` id.
  - (d) `battleEnd` fires only for the id the latch saw start. A battle first seen already
    terminal emits nothing (stale-terminal login).
  - (e) The outcome is the server tag, deliberately not perspective-mapped.
  - (f) Wild battles are classified by `isPvpBattle`, never by identity inequality.
  Arm and reset SHALL be pure transitions of the same state.
- EARS: WHEN given `{lastRating, rating, latest}`, a pure ranked step SHALL baseline without
  emitting on first sight (`lastRating === null`) and emit nothing when unchanged. Otherwise it
  SHALL emit `rankedMatch(battleId, rating − lastRating)`, where `battleId` is the latest battle's
  id only if `isPvpBattle`, else `''`.
- EARS: `main.battle-reseed.test.ts` SHALL pass unmodified.

### pgcc-d — battle/pvp derivations in main.ts → battleModel / pvpModel
category: testability · severity: MED · size: MODERATE
touches: client/src/main.ts, client/src/ui/battleModel.ts, client/src/ui/battleModel.test.ts, client/src/ui/pvpModel.ts, client/src/ui/pvpModel.test.ts
after: [pgcc-a, pgcc-c]
- Evidence @efd3f3a0 (main.ts):
  - `refreshBattle` (≈1783-1813) derives several things:
    - the bait-item list: inventory × defs, dropping missing defs;
    - the cure-item list: `cureStatus !== null`;
    - when to clear `pvpPendingTurnNumber`: `turn > pending || outcome !== 'Ongoing'`, the
      forfeit edge;
    - the opponent-name lookup.
  - `onPvpAttack` / `onPvpSwap` (≈2558-2589) are near-duplicates. They record the pending turn
    from the latest battle and roll it back on rejection.
  - The own-party-ids filter `partySlot !== PARTY_SLOT_NONE` is copied at ≈2723 and ≈2734.
  - The pvp auto-show `forceVisible` rule is at ≈1978-1981.
  - The Escape terminal-dismiss latch (≈1593-1598) is
    `latest && outcome !== 'Ongoing' ? dismissedBattleId = id : keep` (the vite.config
    "KNOWN FOLLOW-UP" item).
- EARS: WHEN given store rows, pure builders SHALL return:
  - the bait-item and cure-item lists, with a missing item def dropping that entry rather than
    throwing;
  - the opponent name, or `null`;
  - the caller's own party ids, in party-slot order, excluding `PARTY_SLOT_NONE`;
  - the pvp overlay's force-visible verdict.
- EARS: WHEN given `(pendingTurn, latest)`, a pure rule SHALL return whether the PvP pending
  submit clears. It clears on a turn advance (`turnNumber > pending`) or any non-`Ongoing`
  outcome, which covers the forfeit edge. It keeps pending on the same turn. With no pending
  turn it is a no-op. The pending-turn capture for attack and swap SHALL be one rule, and a
  rejected submit SHALL restore the prior pending value.
- EARS: WHEN Escape closes the battle overlay, a pure rule SHALL return the battle id to dismiss
  permanently if and only if the latest battle is terminal. Otherwise it SHALL keep the current
  dismissed id, so that an `Ongoing` battle re-shows on the next batch.

### pgcc-e — box party-slot target + nickname-edit intent → boxModel
category: testability (vite.config "KNOWN FOLLOW-UP" items) · severity: LOW · size: LIGHT
touches: client/src/main.ts, client/src/ui/boxModel.ts, client/src/ui/boxModel.test.ts, client/src/ui/boxView.ts, client/vite.config.ts
after: [pgcc-d]
- Evidence @efd3f3a0:
  - `boxView.ts` `#renderCard` emits the magic literal `-1` for "To Party", and its
    `#promptNickname` guard is `name !== null && name !== currentName`.
  - main.ts `boxView.onSetPartySlot` (≈2498-2513) routes `-1` → `nextFreePartySlot`. With a full
    party it shows `chrome.status.partyFull` instead of sending.
- EARS: WHEN given `(requestedSlot, ownMonsters, partySize)`, a pure resolver SHALL return
  `send(slot)` for an explicit slot or the box sentinel. For the next-free sentinel, it SHALL
  return `send(firstFreeSlot)` when a slot is free and `partyFull` when none is. The next-free
  sentinel SHALL be one exported named constant used by both boxView and the resolver; the bare
  `-1` literal is retired. `main.partyFull` SHALL pass unmodified.
- EARS: WHEN given `(promptResult, currentNickname)`, a pure intent SHALL return `none` for a
  cancelled prompt (`null`) or an unchanged name, and `set(name)` otherwise, exactly as today (no
  trimming or validation added; the server validates).
- `vite.config.ts`: rewrite the coverage-exclude "KNOWN FOLLOW-UP" comment to state that those
  four items now live in `battleModel`/`boxModel`. The exclude list itself is unchanged (a comment
  edit only).

### pgcc-g — dialogue-dismiss in-flight lock + deferred shop-open → shopOpenModel
category: testability (history of dead-button bugs) · severity: MED · size: LIGHT-MODERATE
touches: client/src/main.ts, client/src/ui/shopOpenModel.ts, client/src/ui/shopOpenModel.test.ts
after: [pgcc-e]
- Evidence @efd3f3a0 (main.ts):
  - Escape-in-dialogue (≈1617-1645) clears `pendingShopId` and sends `dismissDialogue` only when
    `!dismissPending`. The flag is set inside the send lambda and reset on rejection.
  - The shop-button click (≈2105-2125) is a second send path with a slightly different rollback,
    which also nulls `pendingShopId`.
  - The batch consume step (≈1861-1886) opens the shop only once the conversation is gone and no
    overlay is visible.
  - Reconnect clears both flags (≈3031, ≈3055-3057).
- EARS: WHEN given `(state, event)` over events {escape-in-dialogue, shop-clicked(id),
  dismiss-sent, dismiss-rejected, batch(conversationPresent, anyOverlayVisible), reconnect}, a
  pure step SHALL return the next `{dismissPending, pendingShopId}` and its effects
  (`sendDismiss` | `openShop(id)` | none). It SHALL satisfy:
  - A dismiss is never sent while one is pending.
  - A rejection clears `dismissPending`, so Escape is never a dead button after one rejection.
  - A frozen-link short-circuit never sets `dismissPending`.
  - Escape cancels a pending shop-open (last intent wins).
  - The shop opens exactly once, on the first batch with no conversation and no visible overlay.
  - Reconnect clears both.
  The two send paths SHALL share this one rule.

### pgcc-h — privacy countdown gate change + openPrivacy exception + claim render deferral
category: testability (double-submit guard) · severity: MED · size: LIGHT
touches: client/src/main.ts, client/src/ui/privacyModel.ts, client/src/ui/privacyModel.test.ts, client/src/ui/claimModel.ts, client/src/ui/claimModel.test.ts
after: [pgcc-g]
- Evidence @efd3f3a0 (main.ts):
  - The frame loop (≈3184-3195) compares five countdown fields, ignoring `remainingMs`, to decide
    whether to pump `account-changed`. This guards against double submits, and is boot-tested by
    `main.privacyWiring` RB52T-FRAME-DOES-NOT-CLEAR-INFLIGHT.
  - `openPrivacy` (≈648-652) denies unless the blocker is `claimView` (RB52T-OPEN-ORDER).
  - `renderClaim` (≈482-487, ≈2795) defers while privacy is visible.
- EARS: WHEN given `(prevCountdown, nextCountdown)`, a pure predicate SHALL report a
  gate-relevant change if and only if a field other than `remainingMs` differs. A countdown that
  differs only in `remainingMs` SHALL NOT pump `account-changed`.
- EARS: WHEN given the privacy `canOpen` verdict, a pure rule SHALL allow opening over a lone
  `claimView` blocker and deny over any other blocker.
- EARS: WHEN a claim render is requested while privacy is visible, a pure rule SHALL return
  `defer`. Otherwise it SHALL return `render`.
- EARS: `main.privacyWiring` and `main.privacyCountdown` SHALL pass unmodified.

## Build order and fan-out

- `pgcc-a` and `pgcc-b` are file-disjoint (`mr-disjoint`: SAFE) and MAY run in parallel.
- Every other slice touches `client/src/main.ts`, the hot shared shell, so they **serialize**:
  b → f → c → d → e → g → h (the `after:` chains above).
- The order follows value. `f` comes first after `b` because it carries the two real defects.
  `d` must also follow `a`, since both touch `battleModel.ts`. `e` follows `d` because its
  vite.config comment names items that `a` and `d` extract.
- No slice touches `game-core`, `server-module`, `client/src/module_bindings/`, or any schema.
  This is a client-only milestone with no `just gen`.

## Post-integration verification

After the last slice merges, on master:
1. The full `just ci` is green, including `client-typecheck`, `client-test` and
   `client-verify-build`.
2. `just e2e` is green. `golden`, `recruit`, `encounter-battle`, `pvp*`, `shop-npc`, `trade*`,
   `rename`, `dialogue`, `a11y` and `movement-input` drive the refactored hotkey, Escape, battle,
   shop, trade and feedback paths through the real UI. No new e2e is needed: every touched flow
   already has one, and the unit tests carry the criteria.
3. `git diff <milestone-base>..master -- client/src/module_bindings server-module game-core` is
   empty. That confirms the bindings are untouched and the milestone stayed client-only.
4. Every pre-existing `main.*.test.ts` passes with no edits other than those a slice's criteria
   named.
5. A review pass over the final `main.ts` confirms that each moved decision is now a call into its
   core, with no second inline copy left behind. This is judged by review, per PLAN, not by a
   scan.

## Notes

- **What the next milestone consumes:** nothing new. This milestone only lowers the cost of
  changing the client. It is also the natural home for the Boy Scout backlog above whenever a
  later slice edits that code.
- **Decisions:** none expected. These are refactors plus three defect fixes under existing
  decisions ("no hard-coded UI strings", reject-don't-clamp). If pgcc-b's table changes a
  hotkey's user-visible behaviour, that is out of scope and goes back to the operator (flags i/ii).
- **Risk:** pgcc-b rewires every hotkey. Its guard is the pair of booted suites plus the e2e
  suite, which is why "pass unmodified" is a criterion and not a nicety.
