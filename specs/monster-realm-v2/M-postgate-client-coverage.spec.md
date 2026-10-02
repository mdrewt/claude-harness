# Spec: M-postgate-client-coverage — extract the client shell's inline decision logic into tested pure cores

**Status:** specced 2026-09-30 · **re-scoped 2026-10-01** by the operator's controls redesign
(`M-postgate-console-controls.spec.md`, PLAN §9 item 1) · build-ready: pgcc-a runs FIRST, before the
controls milestone's ctl-1; pgcc-c and pgcc-d run after its ctl-15, re-verifying every Evidence
bullet at build time · **Project:** monster-realm (client only) ·
**Surveyed against:** monster-realm master `efd3f3a0` (symbols cited below; line numbers are
`@efd3f3a0` and will drift, so treat the symbol as the anchor) · **Depends on:** pgcc-a nothing;
pgcc-c and pgcc-d on `M-postgate-console-controls` ctl-15 ·
**Doctrine:** `standards/testing-tdd.md` (verification SSOT).

## Problem / intent

`client/src/main.ts` is about 3.3k lines and has **no exports**. It still holds branching
decisions about what to do given the current game state, for example:
- when a battle start or end is emitted to the event ring;
- what feedback a reducer call produces;

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

**Re-scope (2026-10-01).** The operator redirected the client's input model to console-style
virtual buttons (`operator-feedback-2026-10-01-controls.md`; design `console-controls-design.md`).
That milestone replaces the keydown ladder, the Escape stack, the overlay registry's open/close
routing, the dialogue/shop-open flow and the battle screen's `<select>`s. So this milestone keeps
only the extractions the redesign does not touch:
- **pgcc-b (hotkey table + Escape order) is SUPERSEDED** — it would have pinned the hotkey-primary
  model as tested behaviour. Its claimView-Escape defect is fixed by the controls milestone (B pops
  every frame).
- **pgcc-c's dialogue-dismiss / deferred shop-open step (old C3/C4)** and **pgcc-d's Escape
  terminal-dismiss latch (old D3) and `<select>` parse (old D5)** are absorbed by the controls
  milestone (server frames reconciled from the store; battle outcome Continue; selects become nav
  lists). See that spec's coverage table.
- **Order:** pgcc-a runs first, before the controls milestone; pgcc-c and pgcc-d run after its
  ctl-15.

**Behaviour is preserved except where a slice names a defect.** Validated at `efd3f3a0`:
1. **Uncatalogued care string (CONFIRMED, LOW).** `performCare`'s success line `'Cared!'`
   (`ui/careAction.ts` `CARED_MESSAGE`) reaches players (via `raisingView.showFeedback`) as raw
   English — the uncatalogued-string class 21r-b fixed; it violates DECISIONS.md "no hard-coded UI
   strings". Red: resolving it under `fr` returns English today.
2. **False-success feedback shape (latent; reachability REFUTED).** Eight inline feedback sites do
   `await conn.live()?.reducers.X(…)`; `await undefined` would fall through to the success line.
   Validation traced every path: `current` is cleared only inside `attemptBuild`
   (`net/connection.ts`), which runs only while the link is already non-connected, so
   `live() === undefined` implies `linkFrozen()` and the frozen gate fires first. This is a code
   shape, not a reachable bug: routing the sites through the one core removes it by construction,
   with no dedicated red test (`testing-tdd.md`: no theoretical edge cases).

## Scope

**In:** the three slices below (pgcc-a, pgcc-c, pgcc-d; pgcc-b superseded).

**Named deferrals (declared, not dropped):**
- **Leave inline, by design (wontfix for this milestone).** These are on the netcode smoothness
  surface and have few branches. They are already behaviour-tested through boot (`main.boot`
  BOOT-MOVE / 14R-E, `main.a11yFocus` SPACE-*). Moving them buys little and risks "Bounded client
  prediction" and "Held keys".
  - `reconcileFromStore`, `sendIntent`, and `switchZone` (its guard already lives in
    `zoneSyncGuard`).
  - The frame loop's camera hold and fractional-motion latch.
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
    - the pvp opponent-name lookup (≈1809-1813).
  - **UI helpers:**
    - the a11y close-edge announce (frame ≈3144-3151);
    - `projectKeyStore` (≈2390-2406);
    - the `MOVE_REJECT_PREFIX` error-overlay filter (≈931);
    - the five copies of `hasLiveConnection`;
    - the `onError`-`link` / `onClaimResult` mappings.
- **Moved to the controls milestone:** the keydown preamble, hotkeys and Escape stack (ctl-1,
  ctl-6b, ctl-11b); the held-key re-issue gate (`movementEnabled`, ctl-2); the KeyT gate question
  (T is retired, ctl-10a); the dialogue/shop-open step (ctl-3); the battle Escape latch (ctl-6b);
  the item `<select>` parse (ctl-8j); the pvp `forceVisible` auto-show (ctl-13); `menuAvailability`
  (ctl-5); the interact-prompt memo key (ctl-10a); the reconnect hide list (ctl-3 `reconcile`);
  the bound heal/shop VM selection (ctl-8a); the heal-party target (deleted in ctl-10a).

## Acceptance criteria (EARS)

These criteria apply to every slice, and the tester encodes them per slice:
- **Pure core.** The extracted core has no DOM, no SDK, no module state, and no clock. Its inputs
  and outputs are plain data, and it is tested by ordinary colocated vitest (`xModel.test.ts`).
  Use table cases; use fast-check only where the input space is genuinely combinatorial.
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
  assertion against the core that does not exist yet. For defect 1, red is a test that fails
  **on the defect** in today's code.

## Slices

Each criterion is an id-led bullet (`**A1:**` …), and `mr-gates init` seeds one gate per id.
Sub-bullets and the paragraphs that follow belong to
the criterion above them. Evidence bullets carry no criteria.

### pgcc-a — one feedback-action core for reducer calls with visible feedback (defect 1; latent shape 2)
category: i18n defect + latent false-success shape · severity: LOW · size: LIGHT-MODERATE
touches: client/src/main.ts, client/src/ui/careAction.ts, client/src/ui/careAction.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: []
- Order: runs FIRST, before the controls milestone's ctl-1 (which is `after: [pgcc-a]`). The core it
  generalises is what that milestone's screen adapters later call for feedback.
- Evidence @efd3f3a0 (re-verify at build time): `ui/careAction.ts` `performCare` is already the right core (call →
  frozen-`undefined` → disconnected; sync throw → error arm; settle → exactly one message), but its
  success line is uncatalogued (defect 1). main.ts has eight near-identical inline copies without
  its `undefined` guard (latent shape 2): shop `onBuy`/`onSell` ≈2634-2662, trade
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
  because views hold in-flight locks on it. Named intentional test change: `careAction.test.ts`
  call sites may be updated to pass care's message and `where` (`'care'`); no assertion is removed
  or weakened, and its `'Cared!'` assertions keep holding under `en`.
  - *Build-time amendment (pgcc-a, 2026-10-01):* the i18n census forces two more named test
    changes. Every `t()` key must be a literal at its call site (`catalogParity` PARITY-02), so the
    core takes the already-resolved success **string**, and main.ts keeps the `i18nT('<key>')`
    literals. Two consequences follow. First, PARITY-02's exact main.ts literal-key set loses
    `chrome.feedback.disconnected`, because only the core resolves it now. Second, that set gains
    the care key, because main.ts's care adapter resolves it. A3's new key also adds one row to
    `catalog.test.ts`'s exact `EXPECTED_PLAIN` roster. Both edits are corrections that keep the
    exact-set shape; neither loosens a set. The slice also added the booted wiring suite
    `client/src/main.feedbackCore.test.ts`. It pins each of the nine sites' `where` tag, frozen
    line, held in-flight lock and hidden-overlay no-paint, plus the care line under `fr`, because
    red-team found those wiring mutants survived the core-only tests.

- **A3:** THE SYSTEM SHALL resolve the care success line through the i18n catalog under a new key,
  with English bytes `Cared!` unchanged plus a French entry. The existing `catalogParity`,
  `catalogShape` and `hardcodedStrings` suites stay green. Red: resolving care success under the
  `fr` locale fails today, because it returns the English literal.

- **A4:** WHEN a call site is routed through the core, THE SYSTEM SHALL keep three things from
  today: its "paint only while the overlay is visible" behaviour (the `showFeedback` closure may own
  that check), its `where` tag, and its existing success key. `main.feedbackI18n` passes unmodified.

### pgcc-b — SUPERSEDED (2026-10-01)
Not launchable. Superseded by `M-postgate-console-controls.spec.md`: the hotkey-primary model it
would have pinned is replaced by virtual buttons, one context stack and a generated hint bar.

### pgcc-c — battle-start/end + ranked-delta event-emit latches → battleEmitModel
category: testability (latches repeatedly re-fixed: 16r-f, 17r-b) · severity: MED · size: LIGHT-MODERATE
touches: client/src/main.ts, client/src/ui/battleEmitModel.ts, client/src/ui/battleEmitModel.test.ts
after: [pgcc-a, ctl-15]
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

- **C5:** WHEN the latches are extracted, THE SYSTEM SHALL keep `main.battle-reseed.test.ts`
  passing unmodified.

### pgcc-d — battle/pvp/box decisions → battleModel, boxModel
category: testability · severity: MED · size: LIGHT-MODERATE
touches: client/src/main.ts, client/src/ui/battleModel.ts, client/src/ui/battleModel.test.ts, client/src/ui/boxModel.ts, client/src/ui/boxModel.test.ts, client/src/ui/boxView.ts, client/vite.config.ts
after: [pgcc-c]
- Evidence @efd3f3a0 (main.ts; re-verify after the controls milestone, whose battle and Monsters
  adapters may already host these — extract only what is still inline):
  - `refreshBattle` (≈1783-1807) builds the bait-item list (inventory × defs, dropping missing defs)
    and the cure-item list (`cureStatus !== null`). It clears `pvpPendingTurnNumber` when
    `turn > pending || outcome !== 'Ongoing'` (the forfeit edge).
  - `onPvpAttack` / `onPvpSwap` (≈2558-2589) are near-duplicates. Each records the pending turn from
    the latest battle and restores it on rejection.
  - `boxView.onSetPartySlot` (≈2498-2513) routes the `-1` "To Party" literal (from `boxView.ts`
    `#renderCard`) to `nextFreePartySlot`, or shows `chrome.status.partyFull` when the party is
    full.
- Task: rewrite the `client/vite.config.ts` "KNOWN FOLLOW-UP" coverage-exclude comment to name only
  what is still inline after this slice (the Escape latch and the bait-id parse are gone with the
  controls milestone). This slice owns that rewrite because it runs last.

- **D1:** WHEN given store rows, pure builders SHALL return the bait-item and cure-item lists. A
  missing item def drops that entry and never throws.

- **D2:** WHEN given `(pendingTurn, latest)`, a pure rule SHALL decide whether the PvP pending
  submit clears. It clears when `turnNumber > pending`, or on any non-`Ongoing` outcome (the
  forfeit edge). It keeps the pending turn when the turn is unchanged, and it is a no-op when no
  turn is pending. The attack and swap pending-turn capture is one rule, and a rejected submit
  restores the prior pending value.

- **D4:** WHEN given `(requestedSlot, ownMonsters, partySize)`, a pure resolver SHALL return
  `send(slot)` for an explicit slot or the box sentinel. For the next-free sentinel it returns
  `send(firstFreeSlot)`, or `partyFull` when no slot is free. The next-free sentinel is one exported
  named constant, used by both the box/Monsters view and the resolver. Its value stays `-1`, because
  `boxView.test.ts` asserts the `-1` emission. `main.partyFull` passes unmodified.

## Build order and fan-out

- **pgcc-a runs first** (`after: []`), before `M-postgate-console-controls` ctl-1. It is small,
  touches `main.ts` and `careAction.ts`, and its feedback core is what the controls milestone's
  screen adapters call later.
- **pgcc-c and pgcc-d run after the controls milestone's ctl-15** (`pgcc-c after: [pgcc-a, ctl-15]`,
  `pgcc-d after: [pgcc-c]`): that milestone rewrites the input and overlay plumbing they sit next to,
  so they re-ground against the new code instead of making it rebase over two extractions mid-flight.
- All three slices touch `client/src/main.ts`, so they serialize: **a → (controls milestone) → c → d**.
- No slice touches `game-core`, `server-module`, `client/src/module_bindings/`, or any schema.

## Post-integration verification

After pgcc-d merges, on master:
1. The full `just ci` is green, including `client-typecheck`, `client-test` and
   `client-verify-build`.
2. `just e2e` is green. These specs drive the refactored battle, shop, trade, rename and feedback
   paths through the real UI: `golden`, `recruit`, `encounter-battle`, `pvp*`, `shop-npc`,
   `trade*`, `rename` and `ranked-forfeit`. No new e2e is needed,
   because every touched flow already has one and unit and booted tests carry the criteria.
3. `git diff <milestone-base>..master -- client/src/module_bindings server-module game-core` is
   empty, so the milestone stayed client-only.
4. Every pre-existing `main.*.test.ts` passes, with no edits beyond those a slice's criteria named.

## Notes

- **What the next milestone consumes:** nothing new. This milestone only lowers the cost of
  changing the client. The Boy Scout backlog above rides along with whichever later slice next
  edits that code.
- **Decisions:** none expected (refactors plus one i18n fix under "no hard-coded UI strings").
- **vite.config.ts "KNOWN FOLLOW-UP" comment:** rewritten by pgcc-d, which runs last.
- **Spec review (2026-09-30):** reviewer, red-team and `/simplify` lenses ran on the draft.
  - Simplify cut 8 slices to 4: the presentation predicates, the nickname guard and the privacy
    gates moved to the Boy Scout backlog, and the two reconnect-region state machines merged.
  - Red-team added the pgcc-b characterization suite, corrected the shop-open rule to
    consume-and-drop, and added the per-path rollback, the latch arm/reset rules, and defect 4.
  - Reviewer added the menu click front door and the `u32` parse bounds.
  - Defect 5 was found while checking a red-team note against `OVERLAY_A11Y`.
- **Re-scope (2026-10-01):** after the operator's controls directive, pgcc-b was superseded and the
  Escape/dialogue/shop-open/select-parse criteria (old C3, C4, D3, D5) moved to
  `M-postgate-console-controls`. Bug validation refuted the reachability of old defects 2 and 4
  (`live() === undefined` implies `linkFrozen()`), so they are recorded as latent shapes without
  red tests; old defect 5 (claimView Escape) is fixed by that milestone's B/Start semantics.
