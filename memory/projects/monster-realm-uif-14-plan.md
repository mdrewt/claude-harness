# uif-14 plan — How to Play: Introduction + Encyclopedia (orchestrator-authored)

Spec: specs/monster-realm-v2/M-ui-foundation.spec.md §uif-14. Worktree .claude/worktrees/uif-14, branch uif-14 off 00d6fb28.

## Hidden dependency (scope finding, measured 2026-11-08)

UIF14.3 needs a new `Command` arm (`reportProblem`). `client/src/ui/battlePolicy.ts`
`COMMAND_BATTLE_POLICY: Readonly<Record<ScreenCommand['kind'], ...>>` is TOTAL over Command kinds
(a new arm fails client-typecheck until classified), and `client/src/ui/battlePolicy.test.ts:177-185`
pins a transcribed 34-kind `COMMAND_KINDS` roster. Neither is in `touches:`. Per the slice rules this
is a hidden dependency → the Report a problem row (UIF14.2's last clause) and UIF14.3 are DEFERRED to
a follow-up whose touches add battlePolicy.ts + battlePolicy.test.ts (+ types.ts, main.ts dispatch
arm, helpModel/helpScreen/helpView, catalog id `help.intro.report`, ui-help.spec.ts). The ctl-14
precedent (CTL14.2 deferred on the same class of dependency) shipped the rest.

Second constraint: `ui/overlayA11yWiring.test.ts:405` (outside touches) constructs `new HelpView()`
with ZERO args → the HelpView constructor keeps a zero-arg-compatible signature (optional handlers).

## Shipped shape

- **helpModel.ts** (pure; keeps importing the resolver — catalogParity's resolver roster lists it and
  NOT helpScreen.ts): `HELP_TABS = ['intro','encyclopedia']`; `ENTRY_KEYS` (16, in this order):
  party, storage, recruit, bait, evolution, essence, affinity, status, ap, initiative, queue, idle,
  stance, guard, deploy, ranked; `buildHelpViewModel(): HelpViewModel` (NO args) =
  `{ tabs:[{tab,title}], intro: { paragraphs: string[2] }, entries: [{ key, term, definition, related: EntryKey[] }] }`.
  Every string is a thunk over a LITERAL catalog id (PARITY-02 DYNAMIC-KEY). `related` is a static
  table, never self, always valid keys, ≥1 per entry.
- **helpScreen.ts** (pure, no resolver): state `{ nav: NavState; detail: EntryKey | null }`;
  `HELP_LAYOUT` = tabs(intro: list([{key:'rows'}]), encyclopedia: list(ENTRY_KEYS)); `DETAIL_LAYOUT`
  = list([{key:'back'}]). Buttons: LB/RB switch tabs (no detail); Up/Down move on Encyclopedia (nav
  kit perTab keeps each tab's cursor); A on an entry → detail=that key (consumed); detail open: B or
  A → detail=null with nav unchanged; LB/RB/D-pad consumed and inert; repeat A/B never act; B with no
  detail → pop; Start → popToBase; Select → toggleHelp; X/Y unhandled. `HelpPaint` = `{ layout, nav, detail }`.
- **helpView.ts**: optional `{ announce?(text) }` handlers. Builds a kit TabBar (strip id `help-tabs`)
  after `#help-title`; `#help-intro` (static) gets two `<p>`; `#help-encyclopedia` (static
  `ul.mr-nav-list`) is a `renderNav` list of entry terms; one ContextSheet (frame `help`) mounted in
  the overlay renders the detail variant (title = term, prose = definition + "Related: …", one Back
  row `kit.sheet.back`). Focus moves into the sheet rows on open and back to the list on close.
  Announces the tab title on a tab-change edge and the entry term on a detail-open edge (never on the
  first paint after an open, never on an identical repaint). textContent only.
- **index.html**: `#help-controls`/`#help-goals` → `#help-intro` (div) + `#help-encyclopedia`
  (ul.mr-nav-list); the stale "HelpView writes only style.display" comment corrected.
- **main.ts**: `openHelp` renders `buildHelpViewModel()` (no hint chips); `new HelpViewClass({ announce: announceNow })`.
- **i18n**: retire help.tab.{screen,controls,goals}, help.goal.{recruit,battle,trade},
  help.note.keysVsButtons; add help.tab.{intro,encyclopedia}, help.intro.{p1,p2},
  help.entry.<key>.{term,def} ×16, help.detail.related ({terms}). en + fr.
- **hint bar**: chips unchanged (UIF14.7) — pinned by a test, no hintBarModel change beyond comments.
- **STALECMT** comment corrections at claimView.ts, a11yCopy.ts, menuModel.test.ts, main.chips.test.ts,
  index.html, reachability.test.ts, ARCHITECTURE.md.

## Anti-patterns
No new OverlayId; no `innerHTML`; no computed catalog ids; no paint-time side effects beyond announce;
no adapter DOM; the help-frame hint chips must not change.
