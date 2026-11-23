# Tester brief — monster-realm slice ts-6b-11 (red phase)

You write the gating tests for slice `ts-6b-11`. You do NOT implement the feature. The orchestrator
runs your tests to prove each fails on the current code (you have no shell); write them so they
fail for the RIGHT reason (an assertion about the defect, not an import error, where possible).

**Worktree (edit ONLY here):** `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ts-6b-11`
All paths below are relative to its `client/` directory. Never edit the main checkout.

Read first: the slice spec at
`/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-trade-sessions.spec.md`,
section `### ts-6b-11 — frame chrome and Profile …` (lines ~1664-1706), and the project's
`AGENTS.md`. Test style: follow each file's existing conventions (vitest + happy-dom, the file's
own helpers, `WRONG IMPL KILLED:` comments naming the mutant each assertion kills). Comments state
current behaviour, never history ("was", "used to", slice narration of what changed are not allowed
in new comments).

## The three criteria

- **ts-6b-11.1** WHEN the Monsters, Inventory or Controls frame shows, THE CLIENT SHALL render its
  title in the one kit title bar, with no repeated in-panel heading.
- **ts-6b-11.2** WHEN Profile shows the Account section, THE CLIENT SHALL offer no separate Privacy
  door, Privacy staying reachable as its own section.
- **ts-6b-11.3** WHILE the locale is fr, THE CLIENT SHALL show the pseudonymization disclosure in
  French, and the English text SHALL stay byte-identical to the pinned wording.

## Contracts (what the implementation will provide — test against these)

### 11.1 — kit title bar (boxView.ts, raisingView.ts, controlsView.ts)
The kit title bar is `ui/frame.ts`'s anatomy: an element with class `mr-frame-titlebar` holding
the title element, which carries class `mr-frame-title`. After the change, for each frame:
- **Monsters** (`new BoxView(parent, callbacks)`, `client/src/ui/boxView.ts`): the frame root is
  the `.mr-frame` element appended to `parent`. Its FIRST element child is a `div.mr-frame-titlebar`;
  the title `h2[data-testid="box-title"]` (kept: same element type, same testid, `tabindex="-1"`)
  is inside that bar and has class `mr-frame-title`. It carries no inline `color` (the kit paints
  it) — `title.style.color === ''`. After `show()`, its text is `t('box.title')`.
- **Inventory** (`new RaisingView(parent)`, `client/src/ui/raisingView.ts`): same shape with
  `h2[data-testid="raising-title"]`; and the in-panel `h3` (`raising.inventory.heading`) is GONE:
  no `h3` anywhere in the frame root, and after `show()` the title text `t('raising.title')`
  appears exactly once in the frame outside any `[data-context-sheet]`. The catalog key
  `raising.inventory.heading` is RETIRED (removed from `messageIds.ts`, `catalog.en.ts`,
  `catalog.fr.ts`) because it has no requester left.
- **Controls** (`new ControlsView(handlers)`, `client/src/ui/controlsView.ts`): the title stays
  `#controls-title` (an `h2`), now inside a `div.mr-frame-titlebar` that is the FIRST element child
  of `#controls-overlay`, with class `mr-frame-title`. The titlebar must be located-before-created
  like every other part of that view (a second `new ControlsView` duplicates nothing: exactly one
  `.mr-frame-titlebar` in `#controls-overlay`).
- In every one of the three: exactly ONE `.mr-frame-titlebar` in the frame root, and NO other
  heading (`h1`–`h6`) in the frame root outside the title bar and outside the context sheet
  (`[data-context-sheet]`, whose own heading is fine).
- The title's `margin` is 0 (inline `style.margin === '0'` or `'0px'`; the bar owns the spacing).

Required test names (exact — the acceptance ledger runs them with `-t "frame has one title bar
and no in-panel heading"` across the three files and expects exactly 3 passes):
- `client/src/ui/raisingView.test.ts`: `it('the Inventory frame has one title bar and no in-panel heading', …)`
- `client/src/ui/boxView.test.ts`: `it('the Monsters frame has one title bar and no in-panel heading', …)`
- `client/src/ui/controlsView.test.ts`: `it('the Controls frame has one title bar and no in-panel heading', …)`
No other test in those three files may contain the substring `frame has one title bar and no in-panel heading`.

### 11.2 — no Privacy door (claimView.ts)
- `#claim-privacy-btn` no longer exists: `new ClaimView(handlers)` creates no element with that id.
- `ClaimViewHandlers` loses `onPrivacy` (it becomes `{ onSignIn, onJoin, onDeclineRequested,
  onDeclineConfirmed, onDeclineCancelled, onDismissed }`). Test files that build handlers must
  stop passing `onPrivacy` (with it present, TS reports an excess property — that is expected
  in the red phase only for the files you leave untouched; update the ones listed below).
- `claimView.sectionRows()` returns exactly the SHOWN claim action buttons, in DOM order, and
  nothing else — e.g. prompt phase `['claim-signin-btn', 'claim-decline-btn']`, armed decline
  `['claim-decline-confirm-btn', 'claim-decline-cancel-btn']`, a phase with only Join
  `['claim-join-btn']`. Use the existing phase table in claimView.test.ts (~line 326-440) — its
  expected rows simply lose the trailing `'claim-privacy-btn'`.
- The catalog key `claim.privacyButton` is RETIRED (removed from messageIds.ts, catalog.en.ts,
  catalog.fr.ts; `t('claim.privacyButton')` is no longer requested by any view).
- Privacy stays reachable as its own section of the one Profile frame: `profileView` walks rows
  across sections, so Down from the last Account row reaches the first Privacy row (look at
  `client/src/ui/profileView.ts` / `client/src/ui/screens/profileScreen.ts` and the existing
  tests in `profileView.test.ts` / `screens/profileScreen.boot.test.ts` to express this with the
  existing helpers).

Required test name (exact, once): `client/src/ui/claimView.test.ts`:
`it("the Account section's rows are its claim actions only, with no privacy door", …)` — it must
assert, over every phase of the existing phase table, that sectionRows() ids equal the shown
action buttons only, that `document.getElementById('claim-privacy-btn')` is null, and that
`t` is never requested with `'claim.privacyButton'` (the resolver mock pattern already used in
claimView.i18n.test.ts shows how to spy on `t`).

### 11.3 — the disclosure in the player's language (privacyView.ts)
- New catalog key `privacy.disclosure` (added to `MessageId` in `ui/i18n/messageIds.ts`, plain,
  no params). Its en value is byte-identical to `PRIVACY_PSEUDONYMIZATION_DISCLOSURE` (exported
  from `ui/privacyBanner.ts`, unchanged); its fr value is a French translation of it (different
  from the English, non-empty, keeps the literal token `` `Identity` `` with its backticks).
- `PrivacyView` writes NOTHING into `#privacy-disclosure` in its constructor (textContent stays
  `''` until show); `show()` writes `t('privacy.disclosure')` into it on every call,
  unconditionally (the same "resolve at the open door, never in the constructor" rule
  `privacy.title` already follows in that file), and keeps it displayed.
- Under `setLocale('fr')` (or the file's existing resolver-mock / «key» sentinel technique),
  `show()` paints the fr catalog value; under en it paints exactly
  `PRIVACY_PSEUDONYMIZATION_DISCLOSURE`.
- `PRIVACY_PSEUDONYMIZATION_DISCLOSURE` itself stays exported, unchanged, from privacyBanner.ts.
  Do NOT edit `client/src/ui/privacyBanner.test.ts` at all — its byte-identity case
  (`★ RB52C-DISCLOSURE-PIN BITES …`) must pass unedited.

Required test name (exact, once): `client/src/ui/privacyView.i18n.test.ts`:
`it('the privacy disclosure follows the locale', …)` — this REPLACES that file's current
"disclosure stays raw" assertions (the PV-01 case ~line 176-290 asserts the disclosure stays raw
and that `claim.privacyButton` is not cross-aliased: rewrite those parts to the new contract;
keep the rest of PV-01's assertions). The new case must: (a) assert the constructor writes no
disclosure text and does not request `privacy.disclosure`; (b) assert `show()` requests
`t('privacy.disclosure')` on every call (repeat show re-requests); (c) under fr assert the painted
text equals the fr catalog's `privacy.disclosure` and differs from the English constant; (d) under
en assert it equals `PRIVACY_PSEUDONYMIZATION_DISCLOSURE` byte for byte; (e) assert the en catalog
value of `privacy.disclosure` === `PRIVACY_PSEUDONYMIZATION_DISCLOSURE`.

## Existing tests you must update (they pin the old behaviour)
Update these so they describe the new behaviour (drop the privacy-door rows / clicks, the h3
heading, the raw-disclosure-at-construction pins, the retired keys). Where an existing test reached
the Privacy section by clicking `#claim-privacy-btn`, reach it the way a player now does (move the
cursor down from the Account section through the Profile row walk, or call
`profileView.focusSection('privacy')` where the test is about something else and only needs
focus to be in Privacy — prefer the row walk where the test is about reachability):
- `client/src/ui/claimView.test.ts`, `client/src/ui/claimView.i18n.test.ts`
- `client/src/ui/privacyView.i18n.test.ts`, `client/src/ui/privacyView.test.ts` (~line 750 checks
  the disclosure text — under en after show() it is still the constant)
- `client/src/main.input.test.ts` (~line 2180), `client/src/main.accel.test.ts` (~line 1524),
  `client/src/main.privacyWiring.test.ts` (~line 1348)
- `client/src/ui/profileView.test.ts` (~lines 101, 532-605, 776, 992, 1195-1201)
- `client/src/ui/screens/profileScreen.boot.test.ts` (~lines 466, 585, 662, 888)
- `client/src/ui/overlayA11yWiring.test.ts` (~line 400: drop `onPrivacy`)
- `client/src/ui/raisingView.test.ts` (~lines 459, 505, 1173, 1303-1312, 1402, 1423 pin the h3
  heading key), `client/src/ui/reachability.test.ts` (~line 1455 anchors on
  `raising.inventory.heading`: drop that anchor), `client/src/ui/boxView.test.ts`,
  `client/src/ui/controlsView.test.ts` (any pin of the old header row / inline `#fff`)
- `client/src/ui/i18n/catalog.test.ts` (the pinned en roster `EXPECTED_KEYS`/the kept list at
  ~3494 lists `raising.inventory.heading`; ~734 lists `claim.privacyButton`; add
  `privacy.disclosure` to whatever roster pins the key set; if there is a RETIRED-keys case with an
  anti-vacuity count, add the two retired keys and bump the count) and
  `client/src/ui/i18n/catalogParity.test.ts` (any roster that names these keys).
- e2e (Playwright; not run in your phase, but keep them consistent):
  `client/e2e/ui-whole.spec.ts` — the three stops (`monsters/*`, `bag/*`, `controls/*`) move from
  `h2Title(...)` to `kitTitle(sel, '<root> .mr-frame-titlebar')` (20px, 700, FG, bar measured);
  delete the bag stop's `titleGap: 50.19` (the bar now hugs the title) and rewrite the
  AS-SHIPPED comments (~lines 38-41, 299-300, 469-470) to the current state; `h2Title` is
  deleted if nothing else uses it. `client/e2e/accounts.spec.ts` (~157, 240) and
  `client/e2e/a11y.spec.ts` (~1077) — stop asserting/clicking `#claim-privacy-btn`; reach Privacy
  via the D-pad row walk (ArrowDown from the Account rows) or by its own section.
Do NOT edit any production (non-test) file. Do not touch files outside this list.

## Deliverable
Report: each file edited, each new/rewritten test name, and for each gating test the exact
assertion you expect to fail on the current code and why.
