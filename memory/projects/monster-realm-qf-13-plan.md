# qf-13 plan — profile polish (QF13.1, QF13.2 shipped; QF13.3, QF13.4 DEFERred)

Worktree `projects/monster-realm/.claude/worktrees/qf-13`, branch `slice/qf-13`, base fd94171e.

## Scope verdict (measured, see the ledger DEFER lines)
- QF13.3 (Close last + heading anchor): reds overlayA11yWiring.test.ts QF1-1-HEADING-ROSTER /
  SCOPE-NATIVE-ANCHORS / PARTITION-TOTAL (outside touches). DEFER, no half-change.
- QF13.4 (drop the Account-screen Privacy door): main.ts TS2353 `onPrivacy`, main.input.test.ts
  CTL3-3, catalogParity PARITY-04 DEAD-KEY -> catalog.test.ts roster, e2e/accounts.spec.ts:150.
  DEFER.
- Tool note: mr-gates DEFER_LINE's category group is `[A-Za-z-]*`, so the legal `ux-a11y`
  category cannot be written; both DEFERs carry `[content/LOW]` (flag to the supervisor).

## QF13.1 — visible frame titles, no new catalog keys
New keys would break client/src/ui/i18n/catalog.test.ts's exact roster (outside touches), so the
titles reuse the existing, already en+fr catalogued Profile leaf titles:
- Name: `t('menu.profile.name.title')` ("Name" / fr), Account: `t('menu.profile.account.title')`.
Frame-chrome convention (ui/frame.ts createFrame): a `div.mr-frame-titlebar` holding a
`div.mr-frame-title` with id `<frame>-title`, the titlebar the overlay's FIRST element child.
- renameView: constructor locate-or-creates `div.mr-frame-titlebar > div#rename-title.mr-frame-title`
  prepended to #rename-overlay (static shell in index.html, which is outside touches — create in TS,
  the questLogView qf-4 precedent). Text resolved in show() on every show (the label rule).
- claimView: constructor locate-or-creates `div.mr-frame-titlebar > div#claim-frame-title.mr-frame-title`
  as #claim-overlay's first child (`#claim-title` is the phase heading h2 — it stays). Text
  resolved in BOTH open doors (render + show) with the button labels (#writeLabels).
- Neither is created via ensureElement (it creates display:none). Not focusable, no role.
- Sibling i18n tests' sentinel PLAIN_KEYS sets gain the reused key (renameView.i18n.test.ts is a
  sibling of renameView.ts -> touches-delta).

## QF13.2 — column layout (CSS only)
claimView sets the overlay's inline display to `block` (the visible getter depends on it), so the
`.mr-frame` flex column never applies and the native buttons flow inline. styles.css:
`#claim-overlay > button { display: block; }` (+ small vertical margin). Shown buttons carry inline
`display: ''`, hidden ones inline `none` (wins). Adapter stays Up/Down; Left/Right stay consumed
no-ops (pinned by a test).

## Tags (CHECKs in $MEM/gates/qf-13.gates.md)
QF13-1-NAME-TITLE, QF13-1-NAME-TITLE-COMPUTED, QF13-1-NAME-TITLE-I18N (renameView*.test.ts);
QF13-1-ACCOUNT-TITLE, QF13-1-ACCOUNT-TITLE-COMPUTED, QF13-1-ACCOUNT-TITLE-I18N (claimView*.test.ts);
QF13-2-COLUMN-COMPUTED (claimView.test.ts), QF13-2-AXIS-UPDOWN (screens/profileScreen.test.ts).

## Not doing
No DECISIONS.md entry (no new decision: reuses CTL4.6 frame chrome). Privacy screen buttons also
flow inline under Up/Down — same class as pt3-102, not a QF13 criterion; flagged as a follow-up.
