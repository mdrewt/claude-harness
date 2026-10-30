# ci-fix-20261002T0901Z plan — master e2e red at 009fe7b0 (ranked-forfeit RL-18, 120 s test timeout)

Worktree: `projects/monster-realm/.claude/worktrees/ci-fix-20261002T0901Z` (branch `ci-fix-20261002T0901Z`, base `009fe7b0`).
No revert of #545. Product fix in `client/src/ui/pvpView.ts`; tests by the tester.

## Diagnosis (measured — ctl-6c is not the cause)

1. **Flake, by rerun.** `gh run rerun 36981685927 --failed` → attempt 2 of the same SHA is green.
   ctl-6c's own PR head ran the e2e job green 4 times. Local unmodified master: the spec alone 3/3,
   the full suite `100 passed, 1 skipped`.
2. **Where it hung.** The failure is a bare `Test timeout of 120000ms exceeded` with no call log.
   Every `waitForFunction`/`waitForSelector` in the test has its own 15–20 s timeout and would have
   thrown a `TimeoutError`; the `spacetime sql` stderr warning never printed, so step 9 was never
   reached. Log timestamps put the whole 120 s inside this test with the earlier steps at normal
   speed. What can wait that long: an un-timed action on a manually launched browser — the pointer
   click `pageB.click('[data-testid="pvp-accept-btn"]')` (no timeout; `actionTimeout` is 0) or
   `browserB.close()`.
3. **Mechanism, measured.** `PvpView.refresh()` runs on every store batch while the overlay is up
   (main.ts PvP batch listener) and replaces every lifecycle button each time: 8–10 Accept rebuilds
   per second with both players idle (NPC wander batches). Playwright's pointer click needs one
   node attached through its stable check, scroll, hit-test and mouse events; its call log under CDP
   CPU throttle reads `element was detached from the DOM, retrying`. On unmodified master with a
   10 s bound: 12× → 5 of 10 trials time out, 16× → 1 of 3, 24× → 1 of 2; un-timed, the click took
   5.6–46 s at 16–32×.
4. **ctl-6c exonerated.** With `client/src` + `index.html` checked out at c03b2ff6 (pre-ctl-6c):
   the same rebuild rate (34–40 per 4 s) and the same starvation (16× → 2/2 time out at 10 s).
5. **A real product defect, not only a test problem.** A rebuilt button drops keyboard focus (to
   `<body>`) 9 times a second, and a mouse click whose down and up straddle a rebuild is lost (the
   `click` event goes to the common ancestor). pvp-side-b.spec.ts:333 and
   monster-privacy.spec.ts:483 click the same button the same un-timed way (pvp-full accepts through
   the `__mrPvp` hook, not the button).
6. **PoC of the fix.** Skipping the rebuild when the view-model is unchanged: 0 rebuilds per 4 s;
   the pointer click succeeds at every rate (74 ms at 1×, ~0.65 s at 16×, ~1.6 s at 32×, ~4.8 s at
   64×) with no retry. PoC patch: `/tmp/ci-fix-0901-sb/poc-pvpview.patch` (reverted before tests).

Not proven: that the click (rather than `browserB.close()`) is what hung on the runner — the e2e
job uploads no Playwright artifacts (existing residual E2EARTIFACTS) and an un-timed call on a
manually launched browser leaves no call log. The spec change below makes the next red name itself.

**Revert-first:** not applicable — the pre-ctl-6c client has the identical defect; a revert only
re-rolls the dice and would undo a merged feature.

## Change

| File | Change | Author |
|---|---|---|
| `client/src/ui/pvpView.ts` | `refresh(vm, true)` re-renders each of the three dynamic containers only when what THAT container shows changed: one render key per container (incoming: id + challenger name; outgoing: id + target name + status; player list: the heading flag + each player's identity + name), each `JSON.stringify` of a projected tuple with bigint ids as strings (names are user-chosen, so no delimiter joins). Per container, so a roster change does not replace Accept. The keys are reset to `null` (never a real key) by `hide()` and by the `vm === null` shell path, so a re-show rebuilds (the lock-release contract in `hide()` relies on that). `show()` stays before the key check; the lock re-derivation after the render stays unconditional. The `hide()` and `refresh` comments that say every refresh rebuilds are corrected. ~25 lines. | implementer |
| `client/src/ui/pvpView.test.ts` (sibling test) | New tests for X1/X2. Two existing tests pin the defect in their preconditions (`20r-a PV-3`, `rb121-PVP-DETACH`: "a refresh with the same view-model replaces the node"); their mid-flight refresh must carry a CHANGED view-model so the rebuild path they protect is still exercised, and their kill claims stay. | tester |
| `client/e2e/ranked-forfeit.spec.ts` | Before B's click: keyboard focus placed on B's Accept button is still on it after ≥ 5 observed store batches (witness: `__game().characters` changes — NPC wander — polled on an interval with its own bounded, self-naming timeout). Focus is what the player loses; a replaced node cannot keep it. The pointer click stays a pointer click, with an explicit bounded timeout so a starved click fails with Playwright's call log instead of a bare 120 s test timeout. `browserB.close()` gets a bounded wait that names itself (timer cleared on success; B is not killed on a timeout — a `Browser` has no public process handle — but with one worker a failed test restarts the worker, which ends B). No assertion removed or loosened. | tester |

Not touched: `client/src/main.ts` (the batch listener keeps calling `refresh` every batch — the
view owns idempotence), `index.html`, server, other specs (`pvp-side-b`, `monster-privacy` are
outside `touches:`; the product fix covers their click on the same button).

Rejected: `dispatchEvent('click')` in the spec (the 0501Z precedent) — it would hide a defect real
players hit and leave pvp-side-b/pvp-full exposed; a keyed in-place DOM patch — more code than the
defect needs; change detection in main.ts — the view would still rebuild for any other caller.

Audit for piggybacked renders (memory: change-detection-breaks-piggybacked-renders): what
`refresh` did besides rebuilding — (a) re-derive the lock on live nodes: kept, unconditional;
(b) `hide()` releases the lock without re-enabling nodes because the next show rebuilds: kept via
the key reset; (c) `showFeedback` writes its own element, outside the three containers; (d) locale
is set once at boot (`setLocale`), no runtime switch; (e) the title text is still written each
refresh.

## Acceptance (ledger X1–X4)

- X1 (unit, `pvpView.test.ts`) an equal-by-value view-model keeps the nodes (focus kept, the
  in-flight lock re-applied); any changed rendered field, a re-show after `hide()` or the null
  shell re-renders that section and its controls dispatch the new ids.
- X2 the master-red e2e passes with its pointer click and the focus-survives-batches step.
- X3 (MANUAL) red-before record: the new unit tests + the e2e step RED on 009fe7b0's pvpView.ts;
  throttle probe before/after.
- X4 the other PvP e2e specs on this overlay (pvp, pvp-side-b, pvp-full, monster-privacy) pass.

Wrong implementations the unit tests must kill (plan review): a key on object identity (main.ts
builds a fresh view-model every batch — the test must pass two separately built equal ones);
never re-rendering after the first render; a key on the incoming id alone (same id + new challenger
name; same incoming + changed roster; outgoing appearing/disappearing); a player key on names only
(same name, new identity → the click must dispatch the new identity) or on identity only (a rename
must show); a key without `status` (Pending → non-Pending removes Cancel); the same challenger with
a NEW challengeId must dispatch the new id; a reset only in the `refresh(vm,false)` branch (lock
taken → `view.hide()` called directly → `refresh(sameVm,true)` gives enabled controls that
dispatch); no reset on the null path (vm → null → same vm: Accept present); an early return before
the lock re-derivation (hand re-enable a control mid-flight → same-vm refresh disables it again);
one shared key (a roster change must NOT replace Accept; the heading must follow active/idle with
the same roster).

Slice gate: full `just ci` (no server on the default data dir), then the browser gates against the
private in-memory server on :3000.

## Follow-ups to register after the lenses

- Other views render on every batch the same way (DialogueView is already residual
  DIALOGUEREBUILD; shop/trade/raising/evolution views are unaudited — evolution.spec.ts's Care
  click timed out twice on 2026-10-01 runs).
- `pvp-side-b.spec.ts:333` and `monster-privacy.spec.ts:483` are un-timed pointer clicks on the
  same button (outside `touches:`); stable after this fix, but a hang there would again be a bare
  test timeout.
- Red-team, by reading only (unverified): PvP opened from the main menu may be hidden by the next
  batch — a covered menu still reports visible, and the PvP batch listener treats that as another
  overlay being up (main.ts PvP batch listener). Pre-existing, unrelated to this red.
