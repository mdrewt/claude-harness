# ctl-14 plan — generated Help (CTL14.1); CTL14.2 deferred (hidden dependency)

Base: origin/master 5418a2a2. Worktree `.claude/worktrees/ctl-14`, branch `ctl-14`.

## Scope decision
- CTL14.2 (Options › Report a problem) is a HIDDEN DEPENDENCY: the Options sub-list is
  `MENU_ENTRIES` in `client/src/ui/menuModel.ts` (leaves are `kind:'open'` over a `MenuTarget`
  OverlayId); a non-overlay action leaf needs `menuModel.ts`, `screens/mainMenuScreen.ts` (pick ->
  effect) and their tests — all outside `touches:`. DEFER -> backlog; handoff records it.
  `reachability.test.ts` is therefore untouched.

## Functional core
`ui/helpModel.ts` (pure; CONTROLS/GOALS and every English literal deleted):
```ts
export const HELP_TABS = ['screen', 'controls', 'goals'] as const;
export type HelpTab = (typeof HELP_TABS)[number];
export interface HelpRow { readonly keys: readonly string[]; readonly action: string }
export interface HelpViewModel {
  readonly tabs: readonly { readonly tab: HelpTab; readonly title: string; readonly rows: readonly HelpRow[] }[];
  readonly note: string; // "key names vs button names", shown on the All controls tab
}
export function buildHelpViewModel(screen: readonly HintChip[], bindings: Bindings): HelpViewModel
```
- This screen: one row per hint chip of the context BENEATH Help — keys `[chip.keycap]` (`[]`
  when ''), action `chip.verb`. (Generated from the context table = `hintBar`.)
- All controls: `controlsRows('buttons')` then `controlsRows('shortcuts')` (includes F9, F8):
  keys = the row's bound slots through `glyph()`, action = `rowLabel(row)` (catalog). Live
  bindings, so a remap shows.
- Goals: catalog ids `help.goal.*` (3).
- Tab titles + note: catalog ids `help.tab.screen|controls|goals`, `help.note.keysVsButtons`
  (en + fr + messageIds). No TS literal reaches a DOM sink.

`ui/screens/helpScreen.ts` (pure adapter, `nav: true`): fixed layout
`HELP_LAYOUT = tabs(HELP_TABS -> list([{key:'rows', enabled:true}]))` (rows are display-only;
the tab's single panel item carries aria-activedescendant). LB/RB switch tabs (nav kit), B -> pop,
Start -> popToBase, Select -> toggleHelp (closes), A/D-pad consumed, X/Y unhandled; repeats never
act (controlsScreen precedent). `paint(view, _vm, state)` -> `view.paint({layout, state})`.
`screens/index.ts`: `helpView: helpScreen`.

## Imperative shell
- `ui/helpView.ts`: builds a tab strip (`renderTabs`) and a nav container at runtime inside
  `#help-overlay` (index.html untouched: `#help-title`, `#help-controls`, `#help-goals` keep their
  ids — `indexShell.smoke.test.ts` pins them). `render(vm)` fills the three panels (This screen
  panel created at runtime; All controls into `#help-controls`; Goals into `#help-goals`) with
  textContent only; `paint({layout,state})` shows only the active tab's panel (`hidden`) + the
  note on the controls tab.
- `main.ts`: `openHelp()` = `helpView.render(buildHelpViewModel(hintBar(beneath, bindings,
  notices, world), bindings)); helpView.show(); seatOpened('helpView')`, where `beneath` is the
  stack without the help frame. The `[data-help-launcher]` path shares it. Remove the zero-arg
  import.
- Docs: PLAYTEST.md §2 points to in-game Help (Select: R or /) and lists the default virtual
  buttons; DECISIONS.md "Client UI: one overlay registry, keyboard first" replaced in place by
  draft 1 (doc-keeper fact-checks every path/claim against the shipped code; Escape capture-phase
  routing R-ctl-6b-CTL6B.1 recorded there if still true).
- `e2e/a11y.spec.ts`: Shift+Slash case asserts the three tabs + an F9 row; re-baseline
  PASSES_FLOOR_HELP / INCOMPLETE_CEILING_HELP by name from a local measurement.

## Gating tests (tester; tags exactly-once)
- helpModel.test.ts: CTL14-1-MODEL-TABS, CTL14-1-MODEL-LIVE-BINDINGS, CTL14-1-MODEL-F8-F9-NOTE
- helpView.i18n.test.ts: CTL14-1-FR (under fr every rendered string is fr catalog; no English row)
- screens/helpScreen.test.ts (sibling of new helpScreen.ts): CTL14-1-SCREEN-TABS
- helpView.test.ts: CTL14-1-VIEW-TABS
- main.help.test.ts (sibling of main.ts; main.hintBar.test.ts harness): CTL14-1-BOOT-SELECT
- screens/index.test.ts roster: helpView no longer legacy (6 legacy ids).

## Anti-patterns avoided
No second controls list; no English literal; no index.html edit; no ScreenContext field
(types.ts out of touches); the help VM is bound at open (no live re-read needed: nothing remaps
while Help is the top frame).

## Residuals closed by this slice
R-ctl-6b-CTL6B.4, R-ctl-11a-HELPCOPY (generated help names no Q/E/?), R-ctl-6b-CTL6B.1
(DECISIONS records the Escape capture-phase listener).
