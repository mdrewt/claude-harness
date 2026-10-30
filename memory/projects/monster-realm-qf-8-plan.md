# qf-8 plan — mouse-only duplicate removal (resume 2026-10-26, follow-up content "qf-8b")

Spec: `specs/monster-realm-v2/M-pt3-quickfix.spec.md` §qf-8 (QF8.1–QF8.3), touches widened 487b715.
Worktree `.claude/worktrees/qf-8`, branch `qf-8` rebuilt on `origin/master` b8cf3387 (#603 merged the sweep
scaffold; the parked history is kept at `qf-8-park-20261026`, its evo-choice deletion is a4918e7e).
Ledger: `memory/projects/gates/qf-8.gates.md` (QF8.3 met by #603; QF8.1/QF8.2 DEFERred there — this slice
meets QF8.1 and re-DEFERs QF8.2 for the Flee row only).

## 0. What is deleted and where the action lives now

| # | duplicate (production site) | nav path (already shipped, already tested by D-pad) |
|---|---|---|
| 1 | `To Box` / `To Party` buttons — `boxView.ts #renderCard` (≈738–757) | Monsters sheet → Move (`monstersScreen.ts` 'move' arm → `setPartySlot(id, -1 \| partySlotNone)`; main.ts resolves -1 to the next free slot or reports `chrome.status.partyFull`). D-pad: monstersScreen.test.ts CTL8B-2-MOVE-COMMAND. |
| 5 | trade-row buttons — `tradeView.ts #renderActions/#actionLabel/#dispatch/#pending` (≈350–400) | Social sheet (Trades tab): rows accept / decline / confirm / cancel (`socialScreen.ts` command map; `trade.reject` ≡ social `decline`). D-pad: socialScreen.test.ts CTL8D-2-SHEET-TRADE / CTL8D-2-COMMANDS (socialScreen.test.ts:831), socialScreen.boot.test.ts "U, A, A accepts". |
| 6 | PvP Accept/Decline/Cancel — `pvpView.ts #renderIncoming/#renderOutgoing` buttons + `#dispatch/#pending/#setLifecycleDisabled/#reanchorStrandedFocus` (≈206–297) | Social sheet (Challenges tab): accept / decline on the incoming row, cancel on the outgoing row. D-pad: socialScreen.test.ts CTL8D-2-SHEET-CHALLENGE, socialScreen.boot.test.ts (decline), e2e pvp.spec.ts ctl-8d. |
| 7 | evo-choice buttons + "pick one:" prompt + per-monster lock — `evolutionView.ts` (≈237–346) | Monsters sheet → Evolve… list → choice → Yes. D-pad: monstersScreen.test.ts CTL8C-1-EVOLVE-COMMAND; pointer: reachability.test.ts QF8-1-EVOLVE-POINTER (#603). |

Rows 2–3 (raising Care/Train) were deleted by qf-9 and are pinned by reachability QF8-2-RAISING-*. Row 4
(legacy battle Flee) still renders: QF7.1 is DEFERred (residual R-qf-7-QF7.1), so QF8.2 stays DEFERred
for that row alone.

Pointer clause of QF8.1 ("clicks on `[data-nav-key]` rows; CTL15.2 unchanged"): the pointer source turns a
click on a `[data-nav-key]` row into a seek + A. The Monsters cards (`data-nav-key` = monsterId), the sheet
rows (`#monstersSheet-root-<action>`), the Evolve rows, the Social sheet rows (`#social-sheet [data-nav-key]`)
and the Yes/No rows are all nav rows. PRE-EXISTING, OUT OF SCOPE (flag in the PR, do not fix): the trade row
(`#trade-status`) and the challenge rows (`#pvp-challenge-incoming/-outgoing`) carry the cursor by class, not
`data-nav-key`, so a pointer player opens the Social sheet by clicking the hint bar's A chip
(`#hint-bar [data-button="A"]` → `deps.press('A')`, pointerSource.ts:204-207), then clicks the sheet rows.
The pointer tests use that real chip — never a D-pad A — so the pointer claim is honest. EvolutionView is
DEAD in production (main.ts only constructs and hides it; no key opens it): its deletion is still made (the
code and catalog ids are live for the sweep) but no copy of it is reworded.

## 1. Production edits (implementer = orchestrator; never touches the gating tests)

1. `client/src/ui/evolutionView.ts` — re-apply a4918e7e's diff (verifier PASS in the parked run): drop the
   choice prompt + picker, `#renderChoice`, `#pending`, `#choiceButtons`, `#reanchorStrandedFocus`,
   `#callbacks` (ctor param `_callbacks`; `EvolutionViewCallbacks` stays — main.ts constructs it); header
   rule rewritten; `evo-ready-note` STAYS (live). Check `EvolutionPathViewModel`/`tf` imports after.
2. `client/src/ui/tradeView.ts` — delete `#renderActions`, `#actionLabel`, `#dispatch`, `#pending` (and its
   reset in `hide()`), the `#cbs` field (ctor param `_cbs`), the `TradeAction` type import, the
   `this.#renderActions(...)` call; KEEP `#actionsEl` located (shell contract: ctor throws when missing;
   `#applySocial` hides it on Players; tradeView.test.ts PLAYERS_HIDDEN pins it), keep `render()`'s no-trade
   `replaceChildren()` loop minimal; `TradeCallbacks` export stays (main.ts + main.dispatch.test.ts).
   Header + `#applySocial` comment ("a Tab-focused legacy button") reworded.
3. `client/src/ui/pvpView.ts` — delete the three buttons and `btnRow`, `#dispatch`, `#pending` (+ hide()
   reset), `#setLifecycleDisabled`, `#reanchorStrandedFocus`, `#callbacks` (ctor param `_callbacks`);
   KEEP `#renderIncoming`/`#renderOutgoing` labels (`pvp-incoming-label`, `pvp-outgoing-label` — the e2e and
   the Social cursor target them); DELETE the `#rendered` / `#renderIfChanged` keyed render too (its only
   purpose was keeping button nodes and their focus across batches — cifix0901; labels are plain text and
   `paintCursor` marks the containers, which are never replaced). `PvpViewCallbacks` stays with "Unread since qf-8" docs (main.ts constructs it;
   main.dispatch.test.ts drives the captured callbacks through a stubbed class — unaffected).
4. `client/src/ui/boxView.ts` — delete the `actions` div (both arms) in `#renderCard`, its `inParty`
   parameter (callers at #buildParty/#buildBox), the `NEXT_FREE_PARTY_SLOT` import (line 61; the export in
   boxModel.ts stays — boxModel is out of touches and still uses it); `BoxViewCallbacks.onSetPartySlot` /
   `partySlotNone` docs → "Unread since qf-8 (Move is the Monsters sheet's; main.ts still passes them)";
   comments at ≈255–258 ("never a card's To Party / To Box button") and ≈312–318 (hint "DESCRIBES the To
   Party button") reworded.
5. `client/src/ui/i18n/catalog.en.ts` + `catalog.fr.ts` — DELETE 11 ids with their `@desc` blocks:
   `box.card.toBox`, `box.card.toParty`, `trade.action.accept`, `trade.action.reject`,
   `trade.action.confirm`, `trade.action.cancel`, `pvp.incoming.accept`, `pvp.incoming.decline`,
   `pvp.outgoing.cancel`, `evolution.card.choosePrompt`, `evolution.choice.evolve` (the only requesters are
   the deleted buttons → catalogParity PARITY-04 DEAD-KEY otherwise). ONE values-only copy edit (the id keeps
   its name, milestone rule) — `box.hint`, EXACT new values the tester pins:
   - en: `Only monsters in your Party can battle or be swapped in. New recruits arrive in your Box — select one there and choose "Move" to bring it into an open party slot.`
   - fr: `Seuls les monstres de votre équipe peuvent combattre ou être échangés en cours de combat. Les nouvelles recrues arrivent dans votre Boîte — sélectionnez-en une et choisissez « Déplacer » pour la placer dans un emplacement libre de l’équipe.`
   (the quoted label is `box.sheet.move` = Move / Déplacer, quoted verbatim; FR-03 retargets to it). Its
   `@desc` says the quoted "Move" must match `box.sheet.move` exactly. `evolution.hint` is NOT reworded (the
   view is never shown). `@desc`-only accuracy fixes: `pvp.incoming.label` ("above the Accept/Decline
   buttons"), `pvp.outgoing.label` ("above the Cancel button"), `box.card.evolveBadge` ("on the evolution
   screen" → on the Monsters sheet's Evolve list). Every entry keeps an adjacent `// @desc:` (SHAPE-01).
6. `client/src/ui/i18n/messageIds.ts` — delete the 11 ids from `MessageId` and `MessageParams['evolution.choice.evolve']`.
7. `client/src/styles.css` — delete `--mr-evo-button` from `:root` and the `prefers-contrast: more` block; reword
   the palette comment at ≈509-510 ("fg 5.8:1 on the button").

Not touched: `main.ts` (keeps passing the now-unread callbacks → follow-up flag), `index.html` (the
`#trade-actions`, `#pvp-challenge-incoming/-outgoing` containers stay as the shell contract), `boxModel.ts`,
`tradeModel.ts` (`TradeScreenViewModel.actions` stays; the view just stops reading it).

## 2. Tests (tester, from the EARS criteria; the orchestrator runs them red first)

### QF8.1 — deleted, and reachable by D-pad AND pointer
reachability.test.ts, new cases mirroring QF8-1-EVOLVE-POINTER (real adapter + real view + PointerSource):
- `QF8-1-MOVE-POINTER`: a click on a Storage card (data-nav-key = id) opens its sheet; a click on the Move row
  sends `setPartySlot(id, -1)`; the same for a Party card → `partySlotNone`; nothing else sent.
- `[QF8-1-SOCIAL-TRADE-POINTER]`: socialScreen + TradeView over a shell, the view SHOWN (aria-modal root —
  `#provenDriven` needs it for a single-row sheet) and a `#hint-bar` with a `[data-button="A"]` chip inside
  the game screen; a click on THE CHIP opens the sheet (the trade row is not a nav row — see §0), a click on
  the decline row opens the prompt with No active and sends nothing, a click on Yes sends `respondTrade
  accepted:false`; a click on accept sends `respondTrade accepted:true` once; confirm and cancel likewise.
- `[QF8-1-SOCIAL-CHALLENGE-POINTER]`: same for the incoming challenge (accept → `acceptChallenge`, decline →
  prompt → Yes → `declineChallenge`) and cancel on an outgoing one → `cancelChallenge`.
- EVERY pointer test (the Evolve one included, in place) builds its view with RECORDING callbacks
  (`onSetPartySlot`, `TradeCallbacks`, `PvpViewCallbacks`, `onEvolve`) and asserts they were never called:
  the nav path's command is the ONLY send (a re-wired card `onclick` would otherwise double-send).
The D-pad halves are already pinned (named in §0) — do not duplicate them.

### QF8.2 — the sweep (rows added to `QF8_RETIRED`; the gate itself stays DEFERred for the Flee row)
Oracle changes the lenses forced (apply to the NEW rows; the raising row may stay as it is):
- NATIVE-CONTROL DELTA, not an exact-once allow-list: snapshot `document.body.querySelectorAll(QF8_NATIVE_CONTROLS)`
  BEFORE the view is constructed, render, snapshot again; `after − before` must equal the row's allowed set
  exactly (so the real index.html shell's static buttons and BoxView's permanent
  `input#monsters-nickname-input` + its four id-less `[role=listbox][tabindex=0]` containers are declared,
  never silently tolerated). Scan stays document-wide (siblings, portals).
- SPY MATRIX (the park memo's red-team finding, measured again: five wrong BoxView impls — `el.onclick=` on a
  card, a `pointerdown` handler, a button created on `mouseenter`, one inside a shadow root, one after a
  50 ms `setTimeout` — all passed shape-only assertions): every row builds its view with RECORDING callbacks,
  uses fake timers (`vi.useFakeTimers` + `runAllTimers`), dispatches click / dblclick / pointerdown /
  mouseenter / keydown Enter + Space on every element of the root (shadow roots included), then asserts the
  recorded call list is EMPTY. Shape assertions (selectors, exact labels, native scan) stay as well.
- ANCHORS NON-EMPTY: `qf8ExpectAnchors` must fail on an empty anchor list (add that guard); every row
  anchors on copy only the live view shows.
Rows:
- boxView: shown + `paint`ed (so the nav containers carry tabindex) + refreshed with ONE party card and ONE
  box card (the state that painted To Box AND To Party); retiredLabels exact `To Box` / `To Party`; anchors
  both cards' `box.card.stats` text; allowed delta = the nickname input + the nav containers (pin the exact
  selectors measured).
- tradeView: over the tradeView.test.ts shell (or the real index.html via `buildAppShellFromRealIndexHtml`),
  rendered with ONE vm carrying ALL FOUR actions `['accept','reject','confirm','cancel']` (a one-vm row with
  two actions would miss a Confirm/Cancel survivor); retired selectors `#trade-actions button`,
  `[data-action]`; retiredLabels exact `Accept` / `Reject` / `Confirm Trade` / `Cancel`; anchors the status +
  the two side headings; allowed delta = none.
- pvpView: refresh(vm with incoming AND outgoing Pending, true); retired `[data-testid="pvp-accept-btn"]`,
  `[data-testid="pvp-decline-btn"]`, `[data-testid="pvp-cancel-btn"]`; retiredLabels exact `Accept` /
  `Decline` / `Cancel Challenge`; anchors both labels; allowed delta = none.
- evolutionView: refresh(vm with a 2-choice monster AND a second monster with one met path); retired
  `[data-testid="evo-choice"]`; retiredText the former prompt "pick one:" and "Evolve into"; anchors the
  path headings and the second monster's `evo-ready-note` text (LIVE — an anchor, never a needle); allowed
  delta = none.
- INTEGRATED Social row (the labels Accept / Decline / Cancel are LIVE sheet labels — `pvp.spec.ts:315`):
  TradeView or PvpView with the Social chrome hosted and the sheet painted open; every element whose own
  label is exactly Accept, Decline, Cancel or Confirm must be a `[role="option"][data-nav-key]` inside
  `#social-sheet`, and the native-control delta is still none.
Titles: BEHAVIOUR FIRST, the tag TRAILING in brackets — e.g. `… renders no To Box or To Party control
[QF8-2-BOX-RETIRED]` / `[QF8-2-BOX-NATIVE]`; tags distinct and bracketed (the ledger CHECK matches
`endsWith('[TAG]')`, which is prefix-free by construction). Same convention for the QF8-1 pointer tests
(the existing #603 titles are left alone).
### QF8.3 — e2e migration (never deleted)
- `client/e2e/monster-privacy.spec.ts` (≈469–470), `pvp-side-b.spec.ts` (≈323–324),
  `ranked-forfeit.spec.ts` (≈349–440): B answers through the nav path — P (Social on Challenges, cursor on
  the request: `#pvp-challenge-incoming[aria-current="true"]`), `pressButton(pageB,'A')` → sheet
  `#social-sheet [aria-selected="true"]` = Accept, then accept — by `pressButton('A')` in two specs and by a
  REAL POINTER CLICK on `#social-sheet [data-nav-key="accept"]` in ranked-forfeit (its step 5c was the
  pointer click; this is the e2e half of QF8.1's pointer clause). ranked-forfeit step 5b's focus witness
  moves from the Accept button to the sheet container `#social-sheet` (renderNav's single tab stop,
  `tabindex="0"`): focus placed there holds across ≥5 store batches and the Accept row stays selected.
- `client/e2e/evolution.spec.ts` comments (≈37, ≈176, ≈201) name `evo-choice` — reword (the QF8-3 scan
  counts comments). `trade.spec.ts` ≈173–177: the "no action buttons" clause is now unconditional — reword.
- `QF8_RETIRED_E2E_REFERENCES` grows by DOM ids only (catalog ids in e2e are already caught by tsc — `e2e` is in
  tsconfig `include` and `t()` takes `MessageId`): `pvp-accept-btn`, `pvp-decline-btn`, `pvp-cancel-btn`,
  `data-action=`, `#trade-actions button`, and `evo-choice` matched as a whole token (a regex-free char
  check that the next char is not `-` or a word char, so `evo-choice-badge` stays legal while
  `getByTestId('evo-choice')`, `data-testid="evo-choice"` and a bare comment mention are all caught).
- The focus witness polls "sheet not hidden AND the Accept row selected AND focus held" on EVERY tick, not
  only at the end.
- No e2e file is deleted (the gate CHECK keeps #603's `--diff-filter=D` clause); no `test(` case is removed
  (the verifier adjudicates; not a CHECK clause — counting process artifacts is a forbidden shape).

### Migrations of unit tests that drove the deleted buttons (tester; values from the spec, not the code)
- `boxView.test.ts`: cases at ≈575 (X2 sentinels), ≈668 (injected sentinel), ≈685 + ≈945 (hint quotes "To
  Party"), ≈785/≈878 (hint parent chain — keep), ≈1356 (badged card "slot-swap button"), ≈4053/≈4138/≈4389/
  ≈4600 (POLISH1-P2 KEEP-NODES: focused To Box/To Party survives; handlers rebuilt; locale re-render of
  To Box/To Party copy), m24s4 BX-01/BX-02 id rosters (`box.card.toBox/toParty` leave M24S4_BX_PLAIN_KEYS).
  The sentinel teeth (-1 / partySlotNone) move to the Move path (monstersScreen CTL8B-2-MOVE-COMMAND already
  pins them — name it as the survivor); KEEP-NODES re-targets a surviving node (the card / nickname span).
- `tradeView.test.ts`: TV-1, TV-4 (in-flight lock over the buttons), parts of X6d (actions container
  emptied — now trivially), TV-01/TV-02 key rosters (`trade.action.*` leave), CTL8D-1-VIEW-PLACEHOLDER's
  "a Tab-focused legacy button" strand check at ≈1409/≈1637 (`#trade-actions button`).
- `pvpView.test.ts`: ≈418 (buttons dispatch), 20r-a PV-1…PV-6 (the lock — superseded: no control, no
  double-send; the reducers are the authority and socialScreen has no lock by design), rb121-PVP-* (settle
  re-anchor — superseded with the lock), cifix0901-PVP-* (node identity across equal refreshes — keep for the
  LABELS, drop the button clauses), PV-01/PV-02 rosters (`pvp.incoming.accept/decline`, `pvp.outgoing.cancel`
  leave), CTL10B-2-PVP-NO-INITIATE ("the idle root holds no button" — now holds no button in ANY state).
- `evolutionView.test.ts`: the 19 cases a4918e7e retired (choice controls, 20r-a EV-*, rb121-EVOLUTION-*)
  plus the roster/sentinel cases naming `evolution.card.choosePrompt`/`evolution.choice.evolve` and the
  `evolution.hint` byte pin (≈2742, "you choose which one to take") → the new copy. Reuse
  `git diff d78be366 a4918e7e -- client/src/ui/evolutionView.test.ts` as the starting point; re-check the
  reviewer nits (≈2432 vacuous i18nT ready check, ≈1604–1605).
- `main.partyFull.test.ts`: `openBoxAndFindToParty` → the nav path: KeyB opens the Monsters frame DIRECTLY ON
  STORAGE (`ACCEL_PATHS.B = {tab:'storage'}`, router.ts:127 — NO RB: a fresh RB wraps to Party), Enter → the
  boxed monster's sheet (precondition: `#monsters-sheet-name` names monster 3n / 4n), ArrowDown ×5 → Move
  (Summary, Care, Feed…, Evolve…, Nickname, Move), Enter → `setPartySlot`; both cases keep their oracles
  (free slot → `{monsterId:3n, slot:2}`; full party → nothing sent + `chrome.status.partyFull`).
- `main.controls.test.ts`: CTL6B-1-MAIN-DISPATCH (≈507–520) → U, Enter (sheet, Accept active), Enter →
  `respondTrade accepted:true`; Enter, ArrowDown (Decline), Enter (prompt, No), ArrowUp (Yes), Enter →
  `accepted:false`. CTL6C-3-REFUSE-VIEW-CALLBACK (≈2268–2301): the captured-Accept-at-a-battle-base arm has
  no button to capture any more; its policy is protected by main.dispatch.test.ts (`respondTrade`, `atBattle:
  'refuse'`) and CTL6C-3-MAIN-REFUSED-COMMAND — remove the arm NAMING those survivors in the test comment
  and title (protected-category deletion: the verifier adjudicates).
- `main.feedbackCore.test.ts` (`openTrade` ≈397–406) and `main.feedbackI18n.test.ts` (`findTradeActionButton`
  ≈360–370): the Activate becomes the key sequence over the Social sheet for each action (accept; reject ≡
  decline + Yes; confirm + Yes; cancel), oracles unchanged (`#trade-feedback` copy).
- `socialScreen.boot.test.ts` (≈687–697): "the legacy Accept button stays directly clickable" → Enter (sheet),
  Enter (Accept) sends `acceptChallenge` with `partyIds: [PARTY_MONSTER_ID]` (keeps the partyIds tooth).
- `client/src/ui/i18n/catalog.test.ts` (sibling test of the declared catalogs → `touches-delta:`): the 373-key
  roster → 362 (`EXPECTED_KEYS`, the two `toHaveLength(373)` / `toBe(373)` pins and their comments),
  `EXPECTED_PLAIN` loses 10 plain ids, `SAMPLE_PARAMS` + `EXPECTED_PARAM_OUTPUTS` lose
  `evolution.choice.evolve`, the `box.hint` and `evolution.hint` byte pins → the new copy, line ≈2173's
  "other pvp keys untouched" control switches to a surviving key (`pvp.incoming.label`), and a
  `QF8-1-CATALOG-RETIRED` case in the qf-9 shape (ids gone from en, fr and the roster; kept ids stay; 362).

## 3. Ledger CHECK/EXPECT (filled in the PLAN phase; `mr-gates check --slice qf-8` after each green)
- QF8.1: vitest JSON over reachability + the migrated boot/unit suites; EXPECT pins EVERY new tag — the
  `[QF8-1-*]` pointer titles AND BOTH titles of every `[QF8-2-*]` row (the pointer tests pass on the UNDELETED
  tree; only the sweep rows detect a reverted deletion) — each passed exactly once, `numFailedTests === 0`,
  and the pass COUNT (vitest `-t` with zero matches exits 0).
- QF8.2: DEFER → backlog (Flee row; R-qf-8-QF8.2 already exists — append-only, its row is not re-emitted).
- QF8.3: the existing CHECK with the new reachability pass count, plus "no e2e `test(` line removed".

## 4. Order of work
plan → lenses on the plan (reviewer ‖ red-team) → checkpoint → tester (opus) writes §2 → orchestrator runs
them RED (each fails on the real defect: the buttons still render / the e2e scan finds the old ids / the
catalog still holds the ids) → §1 edits → green per file via `vitest run <file>` → `/simplify` → lens batch
(reviewer, red-team, verifier; desync-guard/reducer-security-auditor are N/A: no game-core/server code) →
the three migrated PvP e2e specs run LOCALLY against `just playtest-up` (`just e2e` is the remote job's
runner; never concurrently with `just ci` — account-e2e's spacetime lock) → full `just ci` (spacetime 2.8.1
shim if bindings-drift reds) → `mr-gates check` → PR → STOP.

## 5. Risks / open items for the PR body
- `touches-delta:` catalog.test.ts (sibling test of catalog.en/fr.ts). The ledger header's `Touches:` line
  is the pre-widening 14-file list (reseed is supervisor-only).
- main.ts still constructs the four views with callbacks nobody reads (`onSetPartySlot`, `partySlotNone`,
  `TradeCallbacks`, `PvpViewCallbacks`, `onEvolve`) — follow-up, main.ts is out of touches.
- Pointer players cannot OPEN the Social sheet by clicking the trade/challenge row (not a `[data-nav-key]`);
  pre-existing, CTL15.2 unchanged — surfaced, not fixed here.
- The e2e job (remote) is the only CI runner of the three migrated PvP specs; they are run locally before the PR.
- Follow-ups (out of touches, ungated, named in the PR): `docs/PLAYTEST.md:59,121` ("To Party" / checklist A5)
  are now false; `socialScreen.ts:25-26` ("the views' locks guard their own buttons"), `boxModel.ts:103`,
  `boxModel.test.ts:618`, `e2e/pointer.spec.ts:175`, `battleView.test.ts:1551` still narrate the deleted
  buttons; `TradeScreenViewModel.actions` becomes unread by any view; `EvolutionView` is dead in production
  and should be deleted wholesale with its main.ts wiring and catalog ids.
- `touches-delta:` also carries `catalogParity.test.ts` and the `hardcodedStrings.{ts,test.ts}` pair (test
  apparatus) — stated plainly for the supervisor's audit.
