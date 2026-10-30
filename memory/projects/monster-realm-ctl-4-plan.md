# ctl-4 plan — nav core, nav render and frame chrome (presentation kit, unwired)

Spec: specs/monster-realm-v2/M-postgate-console-controls.spec.md#ctl-4 · design §6, §10 · base be8e4704 · worktree .claude/worktrees/ctl-4
touches: client/src/ui/nav.ts, nav.test.ts, navRender.ts, navRender.test.ts, frame.ts, frame.test.ts (all NEW), client/src/styles.css
Unwired: nothing imports these modules yet (ctl-5 is the first consumer). No main.ts, no catalogs, no index.html.

## Hard constraints discovered in verify-scope
- No new player-visible strings: catalogs are NOT in touches. Every text the kit shows (title, breadcrumb crumbs,
  tab labels, item content, feedback text, reasons) is CALLER-SUPPLIED. The kit writes no TS string literal to a DOM
  sink (`hardcodedStrings` ceiling 0: `.textContent =`, `.title =`, `replaceChildren(`, `setAttribute(<allowlisted>,`).
  Glyphs (▶ ✓ ! › LB/RB) come from CSS pseudo-elements keyed on classes / `data-` attributes.
- File names avoid `*View.ts` (OR-MANIFEST-COMPLETE). No `innerHTML`-family sinks (i18n-no-html-sink).
- styles.css: class and `:root` selectors only — NO `#id`, NO element/type selectors, NO `!important`, NO new
  `--mr-evo-*` tokens and no new custom properties at all; new rules are inserted BEFORE the `:root` token block so the
  `@media (prefers-contrast: more)` block stays LAST. No transition/animation (no reduced-motion guard needed).
- Frames get no `role="dialog"`/`aria-modal` (OVERLAY_A11Y owns that on the legacy roots; static-shell counts).
- Tests: colocated vitest; DOM tests use `// @vitest-environment happy-dom` (repo convention). No source-text scans.

## Functional core — `client/src/ui/nav.ts` (pure: no DOM, module state, clock)

```ts
import type { VButton } from '../input/buttons';
export interface NavItem { readonly key: string; readonly enabled: boolean; readonly reason?: string }
export type ItemLayout =
  | { readonly kind: 'list'; readonly items: readonly NavItem[] }
  | { readonly kind: 'grid'; readonly items: readonly NavItem[]; readonly cols: number };
export interface NavTab { readonly key: string; readonly layout: ItemLayout }
export type NavLayout = ItemLayout | { readonly kind: 'tabs'; readonly tabs: readonly NavTab[] };
export function list(items: readonly NavItem[]): ItemLayout;            // throws on duplicate keys
export function grid(items: readonly NavItem[], cols: number): ItemLayout; // throws on dup keys / cols not an integer >= 1
export function tabs(tabs: readonly NavTab[]): NavLayout;               // throws on dup tab keys / zero tabs

export interface NavState {
  readonly tab: string | null;   // active tab key (tabs layouts); null for list/grid
  readonly item: string | null;  // active item key in the active list/grid; null when it is empty
  readonly perTab: Readonly<Record<string, string>>; // remembered item key per tab (tabs layouts)
}
export function navInit(layout: NavLayout, remembered?: NavState): NavState;
export interface NavInput { readonly button: VButton; readonly repeat: boolean }
export type NavOutcome =
  | { readonly kind: 'moved' }      // state changed (item or tab)
  | { readonly kind: 'none' }       // a nav button that changed nothing (clamped, empty, single item…)
  | { readonly kind: 'ignored' }    // not a nav button (B, X, Y, Start, Select)
  | { readonly kind: 'activate'; readonly tab: string | null; readonly key: string }
  | { readonly kind: 'disabled'; readonly tab: string | null; readonly key: string; readonly reason: string | undefined };
export function navStep(layout: NavLayout, state: NavState, input: NavInput): { state: NavState; outcome: NavOutcome };
export function navReconcile(prev: NavLayout, next: NavLayout, state: NavState): NavState;
export type NavMemory = ReadonlyMap<string, NavState>;   // session-scoped; keyed by frame id
export const EMPTY_NAV_MEMORY: NavMemory;
export function rememberNav(mem: NavMemory, frame: string, state: NavState): NavMemory; // new map, input untouched
export function recallNav(mem: NavMemory, frame: string): NavState | undefined;
```

Semantics:
- **Key, never index** (CTL4.1): state holds keys only. `navInit(layout, remembered)` keeps each remembered key that still
  exists (tab, item, perTab entries), else the first tab / first item; an empty list → item null.
- **List** (CTL4.2): Down/Up move ±1. Fresh (`repeat:false`) wraps last↔first; repeat clamps (outcome `none`).
  Left/Right in a list → `none`.
- **Grid**: index = row*cols+col; the last row may be ragged. Left/Right move within the row (wrap within the row's
  actual length when fresh, clamp on repeat). Up/Down move within the column (the column's length counts only rows
  that have an item at that column; wrap fresh, clamp on repeat).
- **Tabs**: LB/RB move the tab (RB on the last → first, LB on the first → last when fresh; clamp on repeat). A tab
  switch saves `perTab[oldTab] = item` and restores `perTab[newTab]` if that key exists in the new tab, else its first
  item. D-pad acts on the active tab's inner layout. LB/RB on a non-tabs layout → `none`.
- **A** (CTL4.3): on an enabled item → `activate {tab,key}`, state unchanged; on a disabled item → `disabled
  {tab,key,reason}`, state unchanged, NO activate; empty → `none`. Disabled items are reachable by every move
  (never skipped).
- `navStep` returns the SAME state object when nothing changed (cheap equality for callers).
- **navReconcile** (CTL4.1): for each level (tab keys; the active tab's items): keep the key if present in `next`, else
  the item at `min(prevIndexOfKey, next.length-1)`; empty → null. A null/absent prev key → first. perTab entries are
  kept as keys and resolved lazily on tab switch. Property (fast-check): key kept iff present; else nearest index;
  result key always ∈ next (or null iff empty); idempotent: `navReconcile(next, next, r) === r` (deep-equal).
- **NavMemory** (CTL4.4): an immutable map value — the module holds no state, never touches storage; persistence is
  the caller's session (ctl-5 holds one). Storing a NavState stores entry (item), tab and per-tab item together.

## Imperative shell 1 — `client/src/ui/navRender.ts` (DOM, thin)

```ts
export const NAV_ROOT_TAB = 'root';   // the id's {tab} segment for non-tab layouts
export interface NavRenderOptions {
  readonly frame: string;                                        // id prefix
  readonly fill: (el: HTMLElement, item: NavItem) => void;       // caller writes the row content
}
export function navItemId(frame: string, tab: string | null, key: string): string; // `${frame}-${tab ?? NAV_ROOT_TAB}-${key}`
export function renderNav(container: HTMLElement, layout: NavLayout, state: NavState, opts: NavRenderOptions): void;
export function renderTabs(strip: HTMLElement, layout: NavLayout, state: NavState, opts: { readonly frame: string;
  readonly label: (tab: NavTab) => string }): void;
```
- `renderNav` renders the ACTIVE list/grid (for tabs: the active tab's inner layout) INTO the caller's persistent
  container: sets `tabindex="0"` and `role` (`listbox` / `grid`) on the container, never replaces it, never gives an item a
  tabindex. List items: `role="option"`. Grid: `role="row"` wrappers holding `role="gridcell"` items.
- Every item: class `mr-nav-item`, id `navItemId(...)`, explicit `aria-selected` ("true" only on the active item),
  `aria-disabled="true"` only when disabled (+ class `is-disabled`), active item class `is-active`. Container
  `aria-activedescendant` = the active item id, removed when there is none.
- **Diffed**: item elements are reused by key across renders (same node identity for a surviving key), stale ones
  removed, order fixed with insertBefore only where needed — the container (and DOM focus on it) survives every render,
  including content changes and tab switches.
- `renderTabs` writes one `role="tab"` element per tab into a `role="tablist"` strip (ids `${frame}-tab-${tabKey}`,
  `aria-selected`, `is-active`); tabs carry no tabindex (LB/RB switch them; the container stays the only tab stop).
  On a non-tabs layout the strip is emptied. The container gets `aria-labelledby` = the active tab id when tabbed.

## Imperative shell 2 — `client/src/ui/frame.ts` (DOM chrome, thin)

```ts
export type FrameSize = 'side' | 'full' | 'bottom' | 'small';
export const FRAME_SIZES: readonly FrameSize[];
export interface FrameChrome {
  readonly root: HTMLElement;       // class `mr-frame mr-frame--${size}`, data-size
  readonly title: HTMLElement;      // id `${id}-title` (callers aria-labelledby it)
  readonly breadcrumb: HTMLElement; // ol; one li per crumb; separators are CSS
  readonly tabStrip: HTMLElement;   // role=tablist, flanked by LB/RB slots (`data-button="LB"`/`"RB"`, aria-hidden)
  readonly body: HTMLElement;       // class `mr-frame-body` — the internally scrolling region
  readonly feedback: HTMLElement;   // class `mr-frame-feedback`, data-feedback state
  readonly hintSlot: HTMLElement;   // class `mr-frame-hints`, empty (ctl-13 fills it)
}
export function createFrame(doc: Document, opts: { readonly id: string; readonly size: FrameSize }): FrameChrome;
export function setFrameTitle(f: FrameChrome, title: string, crumbs: readonly string[]): void;
// Feedback: a pure token-guarded machine + a thin render.
export type FeedbackState =
  | { readonly kind: 'none' }
  | { readonly kind: 'pending'; readonly token: number; readonly text: string }
  | { readonly kind: 'ok' | 'error' | 'info'; readonly text: string };
export type FeedbackEvent =
  | { readonly kind: 'begin'; readonly token: number; readonly text: string }
  | { readonly kind: 'resolved'; readonly token: number; readonly text: string }
  | { readonly kind: 'failed'; readonly token: number; readonly text: string }
  | { readonly kind: 'info'; readonly text: string } | { readonly kind: 'clear' };
export function feedbackStep(s: FeedbackState, e: FeedbackEvent): FeedbackState;
export function renderFeedback(f: FrameChrome, s: FeedbackState): void; // data-feedback=kind, textContent=text
```
- `ok` is reachable ONLY via `resolved` whose token equals the current `pending` token (CTL4.6 "success only after the
  caller reports resolution"; pgcc-a B7). A stale/foreign token, or `resolved` with no pending, leaves the state
  unchanged. `failed` with the current token → `error`. `info` (disabled reasons, descriptions) replaces anything,
  including a pending (the pending's later resolution is then stale and ignored). One feedback line per frame.
- `aria-live` is NOT set on the feedback line (`#a11y-live` is the sole live region — A11Y-05b).
- Sizes are exactly the four: side panel, full, bottom box, small. An unknown size throws (reject, don't clamp).

## styles.css (inserted before the `:root` token block)
`.mr-frame` flex column with border; `.mr-frame--side|--full|--bottom|--small` geometry; `.mr-frame-titlebar`;
`.mr-frame-breadcrumb .mr-frame-crumb + .mr-frame-crumb::before { content: "›" }`; `.mr-frame-tabslot::before
{ content: attr(data-button) }`; `.mr-frame-body { overflow-y: auto; min-height: 0; flex: 1 1 auto }`;
`.mr-frame-feedback[data-feedback="ok"]::before { content: "✓" }`, `[data-feedback="error"]::before { content: "!" }`;
`.mr-nav-item.is-active` inverted band + `::before { content: "▶" }` gutter mark; `.mr-nav-item.is-disabled` dim.
Guidance-only styling; nothing gates pixels.

## Acceptance gates → tests (tags appear in exactly one test fullName each)
- CTL4.1 → nav.test.ts: CTL4-1-LAYOUTS, CTL4-1-KEY-NOT-INDEX, CTL4-1-RECONCILE-PROP, CTL4-1-RECONCILE-TABS
- CTL4.2 → nav.test.ts: CTL4-2-LIST-WRAP, CTL4-2-LIST-CLAMP, CTL4-2-GRID-ROW, CTL4-2-GRID-COL, CTL4-2-TABS-WRAP, CTL4-2-TABS-CLAMP
- CTL4.3 → nav.test.ts: CTL4-3-DISABLED-REASON, CTL4-3-DISABLED-REACHABLE, CTL4-3-ENABLED-ACTIVATES
- CTL4.4 → nav.test.ts: CTL4-4-MEMORY-PER-FRAME, CTL4-4-MEMORY-TAB-ITEMS, CTL4-4-MEMORY-IMMUTABLE
- CTL4.5 → navRender.test.ts: CTL4-5-SINGLE-TABSTOP, CTL4-5-ROLES, CTL4-5-IDS, CTL4-5-DIFF-FOCUS, CTL4-5-ACTIVE-MARK, CTL4-5-TABS
- CTL4.6 → frame.test.ts: CTL4-6-CHROME-PARTS, CTL4-6-SIZES, CTL4-6-TABSTRIP-SLOTS, CTL4-6-FEEDBACK-RESOLUTION, CTL4-6-FEEDBACK-RENDER
CHECK template = ctl-3's (vitest JSON reporter; each tag passed exactly once; no `.fails(`; files seen; no pending/todo).

## Anti-patterns to avoid
Index-stored selection; recreating the container; per-item tabindex; TS glyph literals in DOM sinks; a module-level
NavMemory singleton; aria-live on the feedback line; skipping disabled items; clamping an invalid `cols`.

## Amendments after plan review (reviewer + red-team, 2026-10-01) — these OVERRIDE the sections above
Nav core:
- `tabs([])` is legal (content-driven Bag pockets). Zero tabs → `{tab:null,item:null,perTab:{}}`; every input → `none`.
  An empty tab is legal too. Throws remain for: duplicate keys within a list/grid, duplicate tab keys, a key or tab key
  that is empty or contains whitespace, a tab key `tab` or `root` (reserved: id segments), cols not an integer >= 1
  (0, -1, 1.5, NaN, Infinity all throw), and in `tabs()` any `${tab}-${key}` duplicated across tabs.
- NEW `navFocus(layout, state, {tab?, item?}): NavState` — opens on a declared default (Shop→Buy, Fight, Yes/No).
  Unknown keys are ignored; returns the SAME object when nothing changes. (Untagged extra tests.)
- A with `repeat:true` → `none` (a held A never multi-fires). Non-nav buttons → `ignored`, SAME state object.
- A activates only when `state.item` is FOUND in the active layout and enabled; a stale/phantom/null key → `none`.
- perTab is read with `Object.hasOwn` only (tab keys `constructor`, `__proto__` must work). perTab never holds null
  or a key absent at write time; a tab switch writes `perTab[oldTab]` only when `item !== null`, and the restored tab's
  stale entry is overwritten by the fallback (first item) when the old key vanished.
- In a tabs layout, D-pad Left/Right/Up/Down never change the tab (grid edges included); only LB/RB do.
- navReconcile: active tab gone → tab at `min(prevTabIndex, next.tabs.length-1)`, item from perTab if present there,
  else first. state.item not in prev → first. Kind change list↔tabs: tabs→list sets `tab:null, perTab:{}`;
  list→tabs takes the first tab + its first item. Returns the SAME object when the result equals the input
  (`Object.is(navReconcile(l,l,s), s)` for a valid s). Grids use exactly the list rule.
- Grid semantics (pinned): `col = i % cols`, `row = floor(i / cols)`. Left/Right: within the row's actual items
  (wrap fresh / clamp repeat). Up/Down: within the column's actual items (rows having an item at `col`); the column
  NEVER changes on Up/Down; a column of length 1 → `none`. cols > n is one ragged row.
- NavMemory stores the state value; a caller mutating nothing can alias it (states are readonly, frozen in tests).
Nav render:
- `NavRenderOptions` gains optional `labelledBy?: string` → `aria-labelledby` on the container for non-tab layouts;
  tabbed layouts label it with the active tab id. Removed when neither applies.
- Items carry `data-nav-key` (and `data-nav-tab` when tabbed); tabs carry `data-nav-tab`.
- Before calling `fill(el,item)` on a reused node the kit clears its children (`replaceChildren()`), so fill never
  accumulates. Stale attributes are re-written every render: explicit `aria-selected="false"` on inactive items,
  `aria-disabled` REMOVED when re-enabled, `is-active`/`is-disabled` toggled both ways, container `role` re-set on a
  layout-kind change, `aria-activedescendant` names a CONNECTED node or is absent.
- Grid: row wrappers (`role="row"`) reused by row index, surplus rows removed; item nodes move between rows when
  cols/content change; each row gets inline `style.gridTemplateColumns = repeat(cols, …)`. List↔grid switches leave no
  stale row wrappers.
- When the active key changes between renders, call `scrollIntoView({block:'nearest'})` on it if that method exists.
Frame:
- `FrameChrome.title` → `titleEl` (`.title =` is a hardcodedStrings sink shape). Adds `tabBar` (wrapper `.mr-frame-tabs`,
  `hidden` by default) holding the LB slot, the `role="tablist"` strip, the RB slot as SIBLINGS (the tablist holds only
  tabs). NEW `renderFrameTabs(f, layout, state, label)` in frame.ts calls `renderTabs` and sets `tabBar.hidden` unless
  the layout is tabs with >= 1 tab.
- Size validation uses an own-membership check (`'__proto__'`, `'toString'` throw). Two createFrame calls share no nodes.
- `renderFeedback` on `none` clears both `data-feedback` and the text. Feedback machine obligations: resolved twice →
  second is a no-op (same ref); begin(1),begin(2),resolved(1) → still pending(2); token 0 works; stale `failed` is a
  no-op; clear then resolved(1) → none; info then resolved/failed(1) → stays info; `begin` from ok/error replaces.
- CSS: alt-text form for decorative glyphs (`content: "▶" / ""`), static `…` for pending, plain colours (no
  `--mr-evo-*` reads), `list-style: none` on the breadcrumb.
- Accepted residual: no gate checks that each size has CSS geometry (no source scans allowed) — guidance styling.
- Accepted residual (gate apparatus): the tag-count CHECK is satisfiable by stub tests; mitigated by the orchestrator's
  red-before proof and a hand-written wrong-impl sweep after green (reported in the PR), not by the CHECK.
