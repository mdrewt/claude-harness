# Spec: M-ui-foundation — the shared menu design language

**Status:** elaborated 2026-11-07 from the 2026-10-24 sketch · **build-ready: 18 slices** — `wf-1`
(wireframes, docs-only, harness repo) then `uif-1`…`uif-17` (client) · **Project:** monster-realm
(client-only; no game-core, server or binding change) · **Measured against** monster-realm `master`
`d90c32c9` (bt-17 increment B, #672) with so-2, M-pt3-quickfix and M-battle-tactics bt-1…bt-17 merged.
**Anchors are symbols, not lines.** · **Doctrine:** `standards/testing-tdd.md` — every criterion is an
ordinary colocated test or one Chromium e2e per flow; no new source or stylesheet scans ·
**Decisions ANSWERED 2026-10-24** — monster-realm #586 (`pt3-ui-policy`); the verbatim answers at
`memory/projects/decisions/issue-586.answer.md` are the SSOT. They are folded below and are not
reopened.

**Feedback items:** pt3-2026-10-030, -031, -038, -039, -040, -045, -046, -047, -049, -053, -055,
-058, -060, -079, -086, -089, -094, -097, -109, -110, -111, -113, -114, -164, -169, -170, -171,
-172, -173, -175; standing rules -025, -102, -104, -131, -153; the wireframes-first process
directive -013, -014, -015. Each slice names the items it closes.

**Absorbed residuals (each named in exactly one slice's criteria — see Residual map):**
R-ctl-14-CTL14.2, R-ctl-14-HELPA11Y, R-ctl-14-STALECMT → `uif-14` · R-ctl-11a-MONSTERSTAB,
R-qf-10-QF10.2, R-qf-11-GEOMETRY → `uif-6` · R-ctl-SETRATIO → `uif-2` · R-qf-12-QF12.3 → `uif-3` ·
R-qf-2-SHEETLINEPARITY → `uif-4` · R-ctl-13-SHEETCHIPS → `uif-12` · R-qf-10-QF10.1 → `uif-15` ·
R-ctl-8h-CTL8H.1 → `uif-16`. R-weekly-review-2026-10-02-F3 is dispositioned fixed (GAME #579) and
is a PRESERVED behavior: `uif-4`'s rework must keep the liveRegion wiring that fix added.

## Problem / intent

The operator's meta-finding: "the layout of each menu is subtly different from all the others
instead of sharing and re-using the same set of components" (094), resolved by the directive "the
menus need to take advantage of shared, re-usable, and modular code" (175). The measurement
confirms it is structural. The shared layer (ctl-4's `frame.ts` + `navRender.ts`) exists, but only
`menuView` builds on `createFrame`; every other screen hand-assembles its shell, and the quickfix
wave stopped the worst defects without unifying anything.

**What the code looks like today (`d90c32c9`):**

- **Tabs:** six views hand-mount `.mr-frame-tabstrip` — `boxView`, `helpView`, `raisingView`,
  `controlsView`, `shopView` and `tradeView` (the Social chrome). None of them has LB/RB glyph chips;
  only `createFrame` does, and the one `createFrame` consumer has no tabs. qf-11 fixed the vertical
  stretch; the selected-tab mark is still the same inverted fill as the focused row (060, 169).
- **Mini-menus:** `boxView`'s sheet, food list, Evolve list and confirm are unbordered divs with
  `PART_STYLE`, wedged between the tabs and the panels (047). The Inventory item sheet and picker,
  the Social sheet, and the world picker / action / request sheets each paint differently. None has
  a Back or Close row (049), and a click outside any of them does nothing (046).
- **Feedback:** ten sinks. Six per-view `showFeedback` lines (`shopView`, `tradeView`, `pvpView`,
  `renameView`, `tradeProposeView`, `controlsView`), the Monsters and Inventory `.mr-frame-feedback`
  lines, the `.mr-status` world line and the `.mr-notice-banner`. Each in-flow line shifts its
  neighbors (058). qf-12 hides an empty frame line (#586 D5) but its appearance still reflows the body.
- **Literals:** only three `--mr-frame-*` tokens exist (plus the evolution overlay's measured
  `--mr-evo-*`). `styles.css` holds 166 lines with `px` and 12 `font-size` declarations (all in
  `.tactics-*`), and `.mr-shell` fixes `font: 14px / 1.6 monospace`. `boxView` and `raisingView` carry
  about 30 inline `cssText` literals.
- **Scale:** `render/viewport.ts` derives an integer `deviceScale` (crisp art) while the DOM reflows
  continuously with fixed fonts — the two-method incoherence the operator measured (164), and the
  reason nothing grows with the window (131).
- **IA:** `MENU_ENTRIES` still has the Social, Profile and Options sub-lists. Labels still read
  "Bag", "Options" and "Controls & Goals" (qf-10's follow-up R-qf-10-QF10.1 never landed).
- **Tactical UI (bt-10…bt-17):** built before this kit, so `.tactics-*` has its own colors, px fonts
  and menu rows. PLAN §9 used to say it would "land on the final component system"; the order
  inverted, so it migrates here (`uif-11`), and wireframes-first covers it too.

This milestone hardens the kit into THE single visual system: tokens, TabBar, ContextSheet, Toast,
EmptyState, RowCard and one scale, "a very small kit of primitives, not per-screen craftsmanship"
(`docs/research/retro-rpg-menu-ui-design.md`, implication 1). It extends shipped ctl-4 work; it is
not a rebuild. The controls doctrine (one binding table, one context stack, virtual buttons primary)
stands.

## What already shipped (do not rebuild; these are floors)

| Sketch item | Shipped by | Remaining here |
|---|---|---|
| Tab strip no longer stretches or stacks | qf-11 | The component, chips, cues (`uif-3`); the geometry test (`uif-6`) |
| Focus ring designed; anchors kept | qf-1 | One token-driven style (`uif-1`) |
| `list-style` sweep; Journal title + empty state | qf-4 | Journal moves onto EmptyState (`uif-10`) |
| Empty frame line collapses (#586 D5) | qf-12 | Non-shifting presentation (`uif-4`); dead `hintSlot` (`uif-3`) |
| Close at bottom on Privacy; Account column | qf-13 | Profile combine (`uif-16`) |
| Rankings read-only rows + scroll shadow | qf-16 | Shadow cue generalized (`uif-3`) |
| Battle "Bag" → "Items" (legacy UI) | qf-10 | Tactical label still reads "Item" (`uif-11`, #586 D4) |
| `openFrame` push-then-show; mirror shrunk | so-2 | Sheets and frames open through it, unchanged |

## Decisions — ANSWERED (#586; answer file is SSOT)

1. **D1 — Scaling: hybrid single-scale authority.** One computed scale drives the world and the UI.
   The world stays integer-scaled; the UI scales continuously from the same number and gains the
   text-size setting. → `uif-2`, `uif-13`.
2. **D2 — Mini-menu: DELEGATED.** "Use your best Judgment… Use (good) generated wireframes in your
   process and compare them to the UI of other games… keep the code modular, shareable, and
   reusable." No second operator gate. → `wf-1` decides placement; `uif-3`, `uif-7` build it. The
   issue's recommendation (bordered sheet, Close row, close-then-route, full Summary page) is the
   starting point.
3. **D3 — Menu IA: all three at once.** Social opens the 4-tab screen directly; Profile becomes ONE
   combined screen; How to Play and Controls move up. Main menu: Monsters, Inventory, Journal, Social,
   Profile, How to Play, Controls, Close. → `uif-15`, `uif-16`.
4. **D4 — Battle command: "Items".** Shipped for the 1v1 UI; the tactical command still reads
   "Item". → `uif-11`.
5. **D5 — Empty footer: collapse when empty, never delete.** → `uif-4` keeps the collapse and removes
   the layout shift that collapse alone leaves.

**Elaboration calls inside those decisions (flagged, see Risks):** remainder absorbed by visible
tiles rather than a fixed-ratio letterbox (D1); text-size steps ×1 / ×1.5 / ×2 on a Display tab of
Controls, because Options dies (D1, D3); the encyclopedia detail and all sheets are adapter phases in
the existing frame with no new `OverlayId` (D2 presentation); Report a problem lives in How to Play,
because D3's ruled main menu has no slot for it (D3); Profile is one dialog with three stacked
sections, not three tabs (D3).

## Scope

**In:** the kit (tokens, TabBar, ContextSheet, Toast + channel policy, scroll + wheel, EmptyState,
RowCard, single scale, text size); its adoption by every reachable menu screen and the tactical
battle screens; the menu IA flatten; the Help rework; the Profile combine.

**Named deferrals (declared, not dropped):**

- **Trades-tab row cards (086):** RowCard ships in `uif-3` with Challenges as the first consumer
  (`uif-9`); the Trades tab migrates inside **M-trade-sessions** `ts-3`, which rebuilds that tab
  (its spec already requires one row per trade).
- **Evolution notice prompt (CTL13.5) and the evolution overlay:** `evolutionView` has no open path
  and keeps its measured `--mr-evo-*` tokens → backlog with its existing residual.
- **Hold gestures, gamepad glyph sets, Steam Input:** → **M-gamepad** (consumes `input/router.ts`
  unchanged).
- **Fill-scale option for the world (research "Integer + Fill"):** out; the operator re-affirmed
  integer world scaling (#586 D1). → backlog only if a later playtest asks.
- **A pixel font:** none ships today; if one ever lands, the pixel-grid rule below applies to it.
- **Sign-In visibility and account copy:** → M-identity-handles and the auth decision batch.

## Non-goals

- **No doctrine reopen:** binding table, context stack, virtual-buttons-primary, `SCREEN_POLICY`,
  hint-bar generation all stand. Tab stays the browser focus key.
- **Not the defect wave:** quickfix shipped those. This milestone supplies components, not fixes for
  shipped criteria.
- **Not a tactical redesign:** `uif-11` moves `.tactics-*` onto tokens and the scale and applies D4.
  Layout, command flow, board and HUD model stand (`M-battle-tactics-design.md` binds).
- **Not in-canvas UI:** the DOM overlay architecture stays. Per
  `docs/research/pixijs-ecosystem-ui-and-assets.md`: `@pixi/ui` AVOID, `@pixi/react` AVOID,
  `@pixi/layout` DEFER. No new UI dependency.
- **No server or schema work.** Text-size persists per browser, like `mr.controls`.

## Constraints (house rules and prior rulings that bind every slice)

- **Controls model:** every new surface is D-pad + buttons on the context stack. No mandatory
  single-purpose hotkey. Pointer only presses virtual buttons (`input/pointerSource.ts` header).
- **`input/router.ts` and `input/bindings.ts` semantics do not change** (M-gamepad consumes them).
  The one permitted edit is `ACCEL_PATHS` data in `uif-15`/`uif-16`. Anything else is a
  hidden-dependency STOP.
- **All new strings** land in the typed catalog, en AND fr; `t()` throws on a missing key.
- **M23 a11y is preserved:** focus traps, initial-focus anchors, liveRegion announcements (F3 fix
  included), axe gates. Anchors are styled, never deleted.
- **Requests stay non-modal** banners and world sheets, never frames (DECISIONS.md "server-owned
  frames"). The toast does not become a frame; dialogue stays store-reconciled.
- **Pixel-grid rule applies to pixel art and pixel fonts:** the world and any future pixel font stay
  on integer multiples. DOM chrome in vector monospace scales continuously (#586 D1); the sketch's
  "integer multiples" wording for chrome sizes is superseded by D1.
- **Stylesheet pins:** `styles.css` is class and `:root` selectors only (no `#id`, no element
  selectors, no `!important`); `@media (prefers-contrast: more)` stays the LAST block; a new
  `.mr-frame*` / `.mr-shell*` selector must join `CTL7B-1-FRAME-CSS-ROSTER`, so new kit classes are
  named outside that family (`.mr-sheet`, `.mr-toast`, `.mr-empty`, `.mr-card`, `.mr-scroll`; the
  `.mr-dock` precedent).
- **New file naming:** `ui/*View.ts` forces an `OverlayId` (`OR-MANIFEST-COMPLETE`), so kit modules
  are `ui/tabBar.ts`, `ui/contextSheet.ts`, `ui/toast.ts` and so on. The sole exception is `uif-16`.
  Kit modules write only caller text (the `frame.ts` rule) and do not import the resolver, so
  `PARITY-02`'s exact resolver roster does not grow from the kit.
- **Roster pins** (`CTL2-1-POLICY`, `CTL3-2-DROP-EXACT`, `EXPECTED_PATHS`, `OR-MANIFEST-COMPLETE`,
  the catalog key roster, reachability) stay literal manifests: each pinned row changes at most once
  in the milestone, and every count change is named in a test comment.

## Shape of the kit

**Scale (`uif-2`).** Today `viewportScale` computes `s = shorterCss/TILE_PX × dpr`, then rounds
`s/TARGET_VISIBLE_TILES` to the integer `deviceScale`. The unrounded quotient is the one number:

```
continuous = shorterCssPx × dpr / (TILE_PX × TARGET_VISIBLE_TILES)     // TILE_PX 32, TARGET 11
deviceScale = clamp(round(continuous))                                  // unchanged, world
uiScale     = clamp((continuous / dpr) × (TILE_PX × TARGET_VISIBLE_TILES) / UI_REFERENCE_CSS_PX)
            = clamp(shorterCssPx / 720)                                 // continuous, UI
```

| Window (css, dpr) | continuous | deviceScale (world) | uiScale | Body text at ×1 |
|---|---|---|---|---|
| 960×540, 1 | 1.53 | 2 | 0.875 (floor) | 12.25 px |
| 1280×720, 1 | 2.05 | 2 | 1.00 | 14 px |
| 1536×864, 1.25 | 3.07 | 3 | 1.20 | 16.8 px |
| 1920×1080, 1 | 3.07 | 3 | 1.50 | 21 px |
| 2560×1440, 1 | 4.09 | 4 | 2.00 | 28 px |
| 3840×2160, 1 | 6.14 | 6 | 3.00 (ceiling) | 42 px |

`uiScale` reaches the page as `--mr-ui-scale` on `documentElement`. The `:root` rule is
`font-size: calc(100% × ui-scale × text-step)`, so every rem token scales and the browser's default
font-size preference still counts. `world.ts` stays untouched: it already derives from the same pure
function at the same event, so the movement and render smoothness surface does not move.

**Tokens (`uif-1`).** `--mr-space-{1..4}`, `--mr-font-{title,header,body,small}` + weights,
`--mr-content-max`, `--mr-panel-bg` (the darker tab/section value, 173), `--mr-separator`,
`--mr-text-muted`, `--mr-text-disabled`, `--mr-state-{ok,warn,error}`, `--mr-focus`. wf-1's token table
sets the values; contrast is measured (body ≥ 4.5:1, state indicators and disabled text ≥ 3:1).

**Frame anatomy (`uif-1` declares, screens adopt).** Top to bottom: title bar → TabBar → body (grows,
scrolls) → feedback strip (overlay, non-shifting) → the world's hint bar below. Every tab, row, cue and
message is a kit part in one of those slots.

**Channels (`uif-4`, research §5).**

| Channel | Form | Carries | Announced |
|---|---|---|---|
| Hint line | Frame's feedback strip, overlaid, collapses when empty | Y-descriptions, disabled reasons, capture prompts, the walk-up line | Once per change (existing `feedbackAnnouncement`) |
| Toast | One `.mr-toast` region, anchored, timed, no pointer events | Outcomes: Fed, Moved, Saved, purchase done, rejected action, reward lines | Always, via the live region |
| Modal | ContextSheet confirm variant, cursor seated per the screen's rule | Decisions: evolve, decline, final trade confirm, buy/sell, Reset all, deletion phases | Question on open |
| Blocking text box | The existing dialogue bottom box | NPC dialogue | Existing |

A toast is never the sole carrier of something the player must act on; those go to Modal or stay on
the screen's state (e.g. a waiting request's banner).

**Sheets (`uif-3`).** `createContextSheet` builds one `[data-context-sheet]` per frame: bordered with
the standard frame family, sized by option count, optional title, rows from `renderNav`, and a last
Back/Close row supplied by the caller. A sub-list (Feed…, Evolve…) replaces its rows rather than
stacking. Sheets are adapter phases, not stack frames (measured: `monstersScreen`, `bagScreen`,
`socialScreen` and `ScreenHost` already hold them that way), so "closes through the stack" means B
through the adapter. Placement is wf-1's verdict; the default is corner-anchored on the side away from
the selected slot, with the anchor computed by a small pure function.

## Acceptance — integrated whole (proven end-to-end at `uif-17`)

- **UIF.1:** WHEN any screen presents tabs, THE CLIENT SHALL render them through the one TabBar —
  uniform fixed height independent of panel contents, horizontal, top-anchored, LB/RB glyph chips at
  both ends, ≥2 selection cues, selected-vs-focused visually distinct.
- **UIF.2:** WHEN a per-item mini-menu opens, THE CLIENT SHALL present it as the bordered ContextSheet,
  sized by option count, with a Back/Close row as its last entry, and B SHALL still close it.
- **UIF.3:** WHEN a pointer event lands outside an open sheet, THE CLIENT SHALL close the sheet and then
  route the event to its target, except on the world canvas, where it closes only.
- **UIF.4:** THE CLIENT SHALL route every player-facing message through exactly one of the four channels
  per the written table; no channel SHALL shift surrounding layout; a toast SHALL be announced via the
  live region and SHALL NOT be the sole carrier of information the player must act on.
- **UIF.5:** WHILE list or grid content exceeds its panel's maximum, THE CLIENT SHALL keep the D-pad
  cursor visible via scroll-into-view, SHALL scroll on mouse wheel, and SHALL show a position cue.
- **UIF.6:** THE menu chrome SHALL take spacing, borders, type sizes and state colors from the token set,
  with disabled and non-selectable items rendered at reduced contrast.
- **UIF.7:** WHEN the window resizes, ONE pure function SHALL drive both the world (integer) and the
  overlay chrome (continuous via a CSS custom property), and the text-size setting SHALL multiply the
  latter only.
- **UIF.8:** Regression floor: hint-bar generation, reachability sets, axe/liveRegion/focus-trap gates,
  B17 battle-never-hidden and the so-1/so-2 reconnect and `openFrame` suites SHALL stay green; each
  pinned roster row SHALL change at most once, with a named count.

## Sequencing & fan-out

`styles.css`, `main.ts` and the i18n catalogs are shared by construction, so literal all-pairs
disjointness is impossible: the design answer is to order every slice that touches them. **The kit
spine is serial; the screen slices own their view files.** A view is edited by exactly one slice once
the kit exists, which is also what keeps pin churn to one edit per row. (Monsters and Profile are the
exceptions by size; each is split or serial on purpose.)

```
wf-1 → uif-1 → uif-2 → uif-3 → uif-4 → uif-5 → uif-6 → uif-7 ─┬→ uif-8 → uif-11 ─┬→ uif-12 → uif-13 → uif-14 → uif-15 → uif-16 → uif-17
                                                             ├→ uif-9 ──────────┤
                                                             └→ uif-10 ─────────┘
```

- **Kit spine** `uif-1`…`uif-5`: tokens, scale, primitives, channels, pointer. Later slices add no kit CSS.
- **Fan-out window:** `uif-9` (Social) and `uif-10` (small screens) use the kit only: no `styles.css`,
  `main.ts` or catalog edits. They run beside `uif-8` → `uif-11` and each other, with pairwise-disjoint
  code, test and e2e touches (verified with `mr-disjoint` over every concurrency-eligible pair).
- **Roster spine** `uif-12`…`uif-16`: `main.ts`, catalogs and roster pins, strictly serial.
- **Build notes:** a file outside a slice's `touches:` is a STOP + build note, never a silent widen. Each
  slice's "Measured:" paragraph is the first hidden-dependency checklist.

## Residual map

| Residual | Slice | Disposition at merge |
|---|---|---|
| R-ctl-SETRATIO | uif-2 | Superseded by D1; closed, no fixed-ratio box |
| R-qf-12-QF12.3 | uif-3 | Fixed (`hintSlot` removed; the `menuView` re-find updated) |
| R-qf-2-SHEETLINEPARITY | uif-4 | Fixed by the toast channel |
| R-ctl-11a-MONSTERSTAB | uif-6 | Fixed (bound tab replaces the synthesized LB) |
| R-qf-10-QF10.2 | uif-6 | Fixed (in-panel headings dropped) |
| R-qf-11-GEOMETRY | uif-6 | Fixed by the Chromium geometry test on real Monsters |
| R-ctl-13-SHEETCHIPS | uif-12 | Fixed (hint chips match the open sheet) |
| R-ctl-14-CTL14.2 | uif-14 | Fixed, re-homed to How to Play |
| R-ctl-14-HELPA11Y | uif-14 | Fixed; the keyless-row half goes with the tab |
| R-ctl-14-STALECMT | uif-14 | Fixed |
| R-qf-10-QF10.1 | uif-15 | Fixed (labels and the help title) |
| R-ctl-8h-CTL8H.1 | uif-16 | Moot; closed by the Profile combine |
| R-weekly-review-2026-10-02-F3 | uif-4 | Preserved, not reopened |

## Slices

### wf-1 — wireframes: current vs proposed, every screen, sized and compared
category: ux-a11y (design instrument) · severity: MED · size: MODERATE
touches: specs/monster-realm-v2/M-ui-foundation-wireframes.md, specs/monster-realm-v2/wireframes/, specs/monster-realm-v2/M-ui-foundation.spec.md
after: []
Feedback items: pt3-2026-10-013, -014, -015, -053, -094
Repo: harness, docs-only. Per #586 D2 this is a design instrument with no operator gate; the
wireframe-vs-shipped comparison attaches to the closing PR so the operator can audit the result. The
diagrams are original schematics: boxes and labels, no art or assets copied from any game.
Measured: `docs/research/retro-rpg-menu-ui-design.md` §1–§9 supply the genre facts and sources.
`client/e2e/` already drives every screen by accelerator, so CURRENT geometry can be read from the real
client at master (1280×720) rather than from memory.

- **WF1.1:** THE wireframe set SHALL show CURRENT and PROPOSED side by side for each of: main menu,
  Monsters (Party, Storage, sheet, Summary), Inventory, Journal, Social (four tabs), Profile, How to Play
  (Introduction, Encyclopedia, detail), Controls (Buttons, Shortcuts, Display), Shop, Heal, the dialogue
  box, the trade-propose wizard, the world sheets, and the tactical screens (deploy, board + HUD + command
  menu + forecast, results), as committed vector or text diagrams under
  `specs/monster-realm-v2/wireframes/`, with CURRENT read from the running client at master.

- **WF1.2:** WHEN a PROPOSED wireframe is drawn, EACH element SHALL carry exactly one sizing annotation —
  grows-vertically, grows-horizontally, scales-with-resolution or fixed — and the set SHALL be drawn at
  three window sizes including one fractional devicePixelRatio for at least the main menu, Monsters and
  the tactical board.

- **WF1.3:** THE document SHALL contrast each screen with named genre conventions from the research doc
  (tab-bar contract, list and grid contract, context-menu contract, message channels, empty states) and
  SHALL state, per screen, what is adopted, what is rejected and why.

- **WF1.4:** THE document SHALL record a best-judgment verdict (#586 D2, no operator gate) on sheet
  placement across corner-anchored, beside-the-slot and the operator's in-slot-buttons + detail-page
  alternative (053), on the Summary page, and on the Profile section order, each with its reason.

- **WF1.5:** THE document SHALL publish the concrete token table (spacing unit, type scale, panel, separator,
  muted, disabled, state and focus values with measured contrast ratios), the `UI_SCALE_MIN`/`MAX`
  values checked against the scale table above, the content maximum, and the channel table assigning
  every measured message kind.

- **WF1.6:** WHEN a verdict differs from this spec's default, THE wf-1 PR SHALL amend the affected
  slice's criteria in `M-ui-foundation.spec.md` in the same diff, and no `uif-*` slice SHALL launch before
  wf-1 merges.

### uif-1 — tokens and token-driven chrome
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/styles.css, client/src/styles.test.ts, client/src/indexShell.smoke.test.ts, client/e2e/uiKit.ts, client/e2e/ui-chrome.spec.ts, docs/DECISIONS.md
after: [wf-1]
Feedback items: pt3-2026-10-030, -055, -089, -094, -170, -171, -173, -175
Measured: `indexShell.smoke.test.ts` recomputes contrast from the `:root` tokens, and `styles.test.ts`
`CTL7B-1-FRAME-CSS-ROSTER` pins selectors (declarations on existing selectors are free). The evolution
overlay's test bans `!important`, element and `#id` selectors sheet-wide. `.mr-frame--prompt`,
`.mr-status`, `.mr-chip`, `.mr-notice-banner` and `.mr-shell` hold the `font:` px shorthands; `.tactics-*`
is `uif-11`'s. `a11y.spec.ts` checks frames at 640×240, so the short-window behavior must hold. The e2e
helper `uiKit.ts` (computed-style and geometry assertions) is created here and imported, never edited,
by later slices. Decision entry: the token set and frame anatomy as the kit's visual contract.

- **UIF1.1:** THE stylesheet SHALL declare the token set of wf-1's table on `:root`, and the
  `prefers-contrast: more` block SHALL remain the last rule and override the new color tokens to its
  higher tier.

- **UIF1.2:** WHILE a menu screen is open in Chromium, THE computed padding, gap, border, font size and
  text color of its title bar, nav rows, hint chips and status line SHALL equal the resolved token values,
  sampled through `uiKit.ts` on the main menu and one tabbed screen.

- **UIF1.3:** WHEN a nav row is disabled, THE row SHALL render in `--mr-text-disabled` at a measured
  contrast of at least 3:1, and a read-only or non-selectable row SHALL be visually distinct from an
  actionable one.

- **UIF1.4:** THE chrome type SHALL render a distinct hierarchy of title, section header, body and small
  text, with each level differing from the next in size or weight, measured in Chromium.

- **UIF1.5:** WHEN the chrome moves to rem tokens at the default root size, THE menu frame, hint bar and
  shell insets SHALL keep their shipped geometry within 1 CSS px at 1280×720, so this slice alone is
  visually neutral apart from the color and type values wf-1 changes on purpose.

- **UIF1.6:** THE existing frame and shell suites (`CTL7B-1-FRAME-CSS-ROSTER`, the qf-1 focus policy, the
  a11y short-window check) SHALL stay green, with any roster change named in a test comment.

### uif-2 — single scale authority
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/render/viewport.ts, client/src/render/viewport.test.ts, client/src/render/config.ts, client/src/render/resizeWiring.ts, client/src/render/resizeWiring.test.ts, client/src/main.ts, client/src/main.boot.test.ts, client/src/styles.css, client/e2e/ui-scale.spec.ts, docs/DECISIONS.md
after: [uif-1]
Feedback items: pt3-2026-10-014, -131, -164
Measured: `installResizeHandler(renderer, win)` is the one resize seam (`main.ts`), called right after
renderer init; `render/world.ts` `resize(cssW, cssH, dpr)` already calls `viewportScale`, and stays
untouched (smoothness contract). `resizeWiring.test.ts` pins the 3-arg renderer call, which stays. The
`viewportScale` fields are all derived and `viewport.test.ts` pins them; `deviceScale` values must not
move. Decision entry: hybrid scale authority (#586 D1).

- **UIF2.1:** THE pure `viewportScale` SHALL additionally return `continuous` and `uiScale` per the formula
  above, and for every (cssW, cssH, dpr) the returned `deviceScale`, `stageScale` and `effective*` SHALL
  equal the values the shipped function returns (property test over the normalized input ranges).

- **UIF2.2:** THE `uiScale` SHALL be continuous and monotonic in the shorter CSS axis between `UI_SCALE_MIN`
  and `UI_SCALE_MAX`, independent of devicePixelRatio, with no integer snapping.

- **UIF2.3:** WHEN the window resizes or its devicePixelRatio changes, THE resize seam SHALL call the renderer
  as today and SHALL write `--mr-ui-scale` on `documentElement` from the same `viewportScale` result, read
  once per event at fire time, with no second scale formula anywhere in the client (#586 D1).

- **UIF2.4:** WHEN the window grows in Chromium, THE main menu's title font size SHALL grow in proportion to
  `--mr-ui-scale` between sizes while the world stage scale stays an integer `deviceScale` over dpr, at
  three window sizes including devicePixelRatio 1.25.

- **UIF2.5:** THE world SHALL keep integer scaling with the visible tile count and the map margin absorbing
  the remainder, and R-ctl-SETRATIO SHALL close as superseded, with no fixed-ratio letterbox box added.

- **UIF2.6:** WHILE no preference is stored and no resize has fired, THE `:root` font size SHALL resolve from a
  scale of 1, so a boot before the first resize paints readable chrome with no flash of unscaled layout
  beyond the first frame.

### uif-3 — kit primitives: TabBar, ContextSheet, scroll cue, EmptyState, RowCard
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/tabBar.ts, client/src/ui/tabBar.test.ts, client/src/ui/contextSheet.ts, client/src/ui/contextSheet.test.ts, client/src/ui/emptyState.ts, client/src/ui/emptyState.test.ts, client/src/ui/rowCard.ts, client/src/ui/rowCard.test.ts, client/src/ui/frame.ts, client/src/ui/frame.test.ts, client/src/ui/menuView.ts, client/src/ui/menuView.test.ts, client/src/styles.css, client/src/styles.test.ts
after: [uif-2]
Feedback items: pt3-2026-10-047, -060, -169, -172, -175
Measured: `FrameChrome.hintSlot` is dead, but `menuView.ts`'s `menuFrame` re-find rebuilds a `FrameChrome`
literal including it, and `frame.test.ts` pins it (the residual's hidden dependency), so both join here.
`createFrame` mounts tabs inside the titlebar row; the anatomy moves them below it, and `menuView` has no
tabs so nothing visible moves. `renderTabs` and `navRender.ts` stay as they are. Pointer tab clicks key on
`[role="tab"][data-nav-tab]`, and e2e keys on strip ids (`#social-tabs`, `#monsters-tab-party`), so the
TabBar keeps caller-supplied strip ids. Consumers arrive in `uif-6`…`uif-16`, so this slice is unit-tested
over happy-dom and has no fixture page in product code; its CSS gets its first Chromium proof in `uif-6`.

- **UIF3.1:** THE `createTabBar` primitive SHALL render an LB chip, a `role="tablist"` strip with a
  caller-supplied id and an RB chip in one horizontal row, the chips hidden from assistive technology
  and holding no text the kit wrote, and `createFrame` SHALL build its tabs through it below the title bar.

- **UIF3.2:** WHEN `renderFrameTabs` or a screen's render runs, THE TabBar SHALL mark the selected tab with
  `aria-selected` and its selected class distinct from the row's `.is-active`, and it SHALL hide itself entirely
  for a layout with no tabs.

- **UIF3.3:** THE `createContextSheet` primitive SHALL render one bordered `[data-context-sheet]` in the standard
  frame family, sized by its row count, with an optional title, and SHALL offer a confirm variant holding a
  question and its choices, using `renderNav` for rows and writing only caller text.

- **UIF3.4:** THE pure anchor function SHALL choose the sheet corner on the side away from a given slot rectangle
  within a frame rectangle per wf-1's verdict, and the sheet SHALL never cover that slot for any slot position
  (property test).

- **UIF3.5:** THE stylesheet SHALL provide `.mr-scroll` with a hidden scrollbar and a position cue only at an edge
  with more content, generalizing the Rankings shadows of qf-16, plus the tab, sheet, card and empty-state
  classes, using tokens only, and Rankings SHALL keep its shipped behavior on the shared rule.

- **UIF3.6:** THE `createEmptyState` primitive SHALL take a reason, a cue and a next step, and THE `createRowCard`
  primitive SHALL render one visually separated row per entry, both writing only caller text.

- **UIF3.7:** WHEN the kit lands, THE dead frame hint slot SHALL be gone from `FrameChrome`, `createFrame` and the
  `menuView` re-find, closing R-qf-12-QF12.3, with the main menu's visible frame unchanged.

### uif-4 — four channels: policy, toast, non-shifting hint line
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/feedbackPolicy.ts, client/src/ui/feedbackPolicy.test.ts, client/src/ui/toast.ts, client/src/ui/toast.test.ts, client/src/ui/frame.ts, client/src/ui/frame.test.ts, client/src/main.ts, client/src/main.feedbackCore.test.ts, client/src/main.feedbackI18n.test.ts, client/src/main.dispatch.test.ts, client/src/main.partyFull.test.ts, client/src/styles.css, client/src/styles.test.ts, client/e2e/dialogue.spec.ts, client/e2e/wallet-balance.spec.ts, client/e2e/ui-chrome.spec.ts, docs/DECISIONS.md
after: [uif-3]
Feedback items: pt3-2026-10-058, -153
Measured: `main.ts` sinks are the `statusEl` writes, the `shopFeedback` and
`tradeFeedback` closures, and `OutcomeLine` for Monsters (qf-2). `.mr-frame-feedback` is an in-flow strip and
`hidden` when empty (qf-12), so showing it reflows the body. `frame.ts`'s `feedbackAnnouncement` is
the announcement seam; `announceNow` wraps the live region. `#status` is pinned by `dialogue.spec.ts` (3)
and `wallet-balance.spec.ts` (1). This slice owns the seam and the world-level and `main.ts` sinks; each
view's own line moves in its screen slice. Decision entry: the four-channel table.

- **UIF4.1:** THE `feedbackPolicy` table SHALL be total over a `MessageKind` union naming every measured message
  kind and SHALL assign each to exactly one of hint line, toast, modal and blocking text box, with the
  exhaustive record failing typecheck on an unassigned kind.

- **UIF4.2:** WHEN a toast is shown, IT SHALL paint in one anchored `.mr-toast` region above frames and battle
  roots without moving any other element, SHALL expire through an injected clock, and SHALL be announced via the
  live region exactly once, with the F3 announcement path (R-weekly-review-2026-10-02-F3) still green.

- **UIF4.3:** WHEN the hint line goes from empty to showing text in Chromium, THE frame body's bounding box SHALL
  not change by any amount and the last list row SHALL stay reachable above the strip via scroll padding,
  while an empty line stays collapsed (#586 D5).

- **UIF4.4:** WHEN a Monsters sheet evolve, nickname or party-slot action is rejected or the party is full, THE
  message SHALL reach the player through the toast channel while a frame is open, closing
  R-qf-2-SHEETLINEPARITY, and SHALL be announced.

- **UIF4.5:** WHEN a world-level rejection or disconnect message fires, THE message SHALL use its policy channel, and
  a late settle after its frame closed SHALL paint nothing stale (the existing per-sink guard, kept).

- **UIF4.6:** THE policy table SHALL mark each kind `mustAct` or not, and no `mustAct` kind SHALL map to toast unless
  it is backed by persistent on-screen state named in its row, so a toast is never the sole carrier of an action
  the player must take (typecheck plus a table unit test).

### uif-5 — pointer: close-then-route and the wheel
category: ux-a11y · severity: MED · size: LIGHT
touches: client/src/input/pointerSource.ts, client/src/input/pointerSource.test.ts
after: [uif-4]
Feedback items: pt3-2026-10-040, -046
Measured: `PointerSource.#onClick` routes chips, then native and `[data-pointer-own]`, then by `deps.top()`. It only
presses virtual buttons, and `press` is synchronous through the router, so the DOM after B is fresh. World sheets
report `top() === 'other'`. There is no wheel listener. The grid and list seek logic stands. `CTL15.2` lives in
`pointerSource.test.ts`. A click on the canvas routed after a world-sheet close would press A and reopen the same
sheet, which is why that case closes only. This slice is unit-tested over happy-dom; the real-browser proof lands
with the first consumer (`uif-7`).

- **UIF5.1:** WHEN a click or tap lands outside an open `[data-context-sheet]` while a frame is on top, THE source
  SHALL press B until no sheet shows (bounded by a small depth) and SHALL then route the same event as if no sheet
  had been open, and the `CTL15.2` pin SHALL be rewritten to encode this rule with the change named (046).

- **UIF5.2:** WHEN a click lands inside an open sheet, THE source SHALL route it to the sheet's row exactly as a
  top-frame row today; a hint chip SHALL press its own button with no extra close; a native control outside the
  sheet SHALL close the sheet and keep its native click.

- **UIF5.3:** WHEN a click lands on the world canvas while a world sheet shows, THE source SHALL close the sheet and
  SHALL NOT press A, so the same sheet cannot immediately reopen.

- **UIF5.4:** WHEN a wheel event lands on the game screen while a frame is on top, THE source SHALL prevent the
  native scroll and SHALL press Up or Down once per notch through a pure accumulator handling line and pixel delta
  modes, and SHALL press nothing at the bare world or while capture or typing owns input (040).

- **UIF5.5:** THE source SHALL keep game logic free of coordinates: the wheel and close paths SHALL press only virtual
  buttons, and right-click, long-press and the seek probe SHALL behave as pinned by the existing suite.

### uif-6 — Monsters: layout, growth, pseudo-scroll, bound tab
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/screens/monstersScreen.ts, client/src/ui/screens/monstersScreen.test.ts, client/src/ui/screens/types.ts, client/src/main.ts, client/src/main.accel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/ui-monsters.spec.ts
after: [uif-5]
Feedback items: pt3-2026-10-038, -039, -045, -060, -169
Measured: `openMenuTarget` synthesizes an LB after opening because `boxView`'s `OPENING` paint is on Storage;
`CTL11A-1-BOOT-MONSTERS-TAB` and `CTL11A-MENU-MONSTERS-PARTY` (`main.accel.test.ts`) pin the visible result.
`ScreenContext.socialTab` is required and 7 fixtures build it, so the new field is optional like `proposeTarget`.
`boxView`'s root is `align-items:center` with `PART_STYLE`'s `max-width:600px`; grids set inline columns. The
`box.section.*` h3s have one test consumer, `main.accel.test.ts` `panels()`, and retire through `PARITY-04` DEAD-KEY
and the catalog roster.

- **UIF6.1:** WHEN Monsters opens in Chromium, THE screen SHALL show its tabs through the TabBar under the title bar with
  LB/RB chips, in one row, the strip height equal to one tab's height and uniform across both tabs and any
  contents, closing R-qf-11-GEOMETRY, with the `#monsters-tab-*` ids unchanged.

- **UIF6.2:** WHEN Monsters opens by menu or accelerator, THE screen SHALL read a bound tab on `ScreenContext` and open
  on it with no synthesized button press, closing R-ctl-11a-MONSTERSTAB, with its existing visible-result pins green.

- **UIF6.3:** WHILE the window is larger than the content, THE tab content area SHALL grow to the available space up to
  `--mr-content-max` even when empty, with no vertical gap between frame and interior (038, 045).

- **UIF6.4:** WHEN the Storage grid exceeds its panel in Chromium, THE overflow SHALL be hidden, D-pad moves SHALL keep
  the cursor in view, the wheel SHALL move the cursor, and the position cue SHALL show (039, 040).

- **UIF6.5:** WHEN this slice lands, THE in-panel Party and Storage headings SHALL be gone, closing R-qf-10-QF10.2, with
  panel spacing from tokens and no inline `cssText` left on the non-sheet parts.

- **UIF6.6:** WHEN Storage holds no monsters, THE panel SHALL show EmptyState with reason, cue and next step, in en and
  fr, with the frame and tabs kept.

- **UIF6.7:** WHEN a tab is selected and a row is focused in Chromium, THE selected tab SHALL differ from unselected tabs in at
  least two computed properties and from the focused row in fill, so tabs no longer read as menu items (060, 169).

### uif-7 — Monsters: sheet, Back/Close, Summary page, outcomes
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/monstersModel.ts, client/src/ui/monstersModel.test.ts, client/src/ui/screens/monstersScreen.ts, client/src/ui/screens/monstersScreen.test.ts, client/src/main.controls.test.ts, client/src/main.feedbackCore.test.ts, client/src/main.partyFull.test.ts, client/src/ui/reachability.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/ui-monsters.spec.ts, client/e2e/menu-flow.spec.ts, client/e2e/pointer.spec.ts, client/e2e/evolution.spec.ts, docs/DECISIONS.md
after: [uif-6]
Feedback items: pt3-2026-10-046, -047, -049, -053, -058, -104
Measured: `SHEET_ACTIONS`/`sheetLayout` are in `monstersModel.ts`; `sheetOf` keeps the sheet painted under sub-lists, so
it changes to one sheet at a time. `#monsters-sheet-name` is pinned by `main.partyFull.test.ts`, `reachability.test.ts`,
`pointer.spec.ts` and `menu-flow.spec.ts`, and stays. A Close row changes the Up wrap target from Move, so
`menu-flow.spec.ts` Up steps and any wrap test are the known churn. Summary today is a pane under the sheet. `kit.sheet.close`
and `kit.sheet.back` land here and are reused by later slices with no further catalog edit. Decision entry: the sheet verdict.

- **UIF7.1:** WHEN A opens a monster's sheet, THE sheet SHALL render as the ContextSheet per wf-1's placement verdict
  (#586 D2), not cover the selected slot, and keep the tabs and grid visible behind it with nothing dimmed unless wf-1 says so.

- **UIF7.2:** THE sheet SHALL end with a Close row whose A acts exactly like B, and the Feed… and Evolve… lists SHALL end with
  a Back row returning to the sheet, each row last in order (049, 104), with B unchanged.

- **UIF7.3:** WHEN Feed… or Evolve… opens, ITS rows SHALL replace the sheet's rows in the same ContextSheet, and the evolve
  confirm SHALL use the confirm variant with the same default as shipped.

- **UIF7.4:** WHEN Summary is chosen, THE Monsters frame SHALL show a full detail page with all stats (#586 D2 recommendation)
  in place of the grid, with B returning to the sheet on the same monster and the tabs kept.

- **UIF7.5:** WHEN a click lands outside the open sheet in Chromium, THE sheet SHALL close and the click SHALL land on its
  target, proven for another slot and for a tab (046).

- **UIF7.6:** WHEN care, feed or move resolves, THE outcome SHALL appear through the toast channel with no layout shift (058),
  never claiming success before the batch shows it, as pgcc-a B7 pins.

### uif-8 — Inventory
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/raisingView.feedbackGate.test.ts, client/src/ui/bagModel.ts, client/src/ui/bagModel.test.ts, client/src/ui/screens/bagScreen.ts, client/src/ui/screens/bagScreen.test.ts, client/src/ui/screens/bagScreen.boot.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/ui-inventory.spec.ts, client/e2e/menu-flow.spec.ts, client/e2e/pointer.spec.ts
after: [uif-7]
Feedback items: pt3-2026-10-038, -049, -055, -060, -104, -172
Measured: `#bag-tabs` strip, `#bag-status` line, `bag-picker`, `actionLayout` and `pickerLayout` in `bagModel.ts`, root
`align-items:center`, about 10 inline literals. `pointer.spec.ts` right-clicks `[data-testid="raising-title"]` and expects
the menu cursor on `bag`; the nav key stays.

- **UIF8.1:** WHEN Inventory opens, ITS pockets SHALL render through the TabBar at the top with chips, and its list SHALL grow
  and pseudo-scroll per the kit (`.mr-scroll`, D-pad, wheel, cue).

- **UIF8.2:** WHEN A opens an item's sheet or the Feed picker, IT SHALL render as the ContextSheet with a last Close or Back row
  whose A acts like B.

- **UIF8.3:** WHEN a feed resolves or a battle-only item is refused, THE message SHALL use its policy channel with no layout
  shift, and the raising feedback gate SHALL stay green.

- **UIF8.4:** WHEN a pocket is empty, THE panel SHALL show EmptyState with reason, cue and next step, in en and fr.

- **UIF8.5:** WHEN this slice lands, `raisingView` SHALL carry no inline spacing, border or color literal, and its computed
  spacing SHALL match Monsters' at the same window size, measured in Chromium through `uiKit.ts`.

### uif-9 — Social: tabs, sheets, row cards, spacing
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/leaderboardView.ts, client/src/ui/leaderboardView.test.ts, client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/ui/screens/socialScreen.ts, client/src/ui/screens/socialScreen.test.ts, client/src/ui/screens/socialScreen.boot.test.ts, client/e2e/ui-social.spec.ts, client/e2e/trade.spec.ts, client/e2e/pvp.spec.ts
after: [uif-7]
Feedback items: pt3-2026-10-086, -089, -169, -172
Measured: `socialPart(chrome, 'social-tabs', 'div')` is the shared chrome hosted by whichever panel shows; e2e pins
`#social-tabs` and `#pvp-challenge-overlay #social-tabs`, which stay. The sheet's `confirm` phase holds Yes/No on No.
`trade-feedback` and `pvp-challenge-feedback` are the view lines. `ranked-forfeit.spec.ts` and `pvp-side-b.spec.ts` drive the
sheet through `controls.ts`, unchanged by an appended row. No catalog, `main.ts` or `styles.css` edit: `kit.sheet.back` exists.

- **UIF9.1:** WHEN Social shows, ITS tabs SHALL render through the one TabBar held by the shared chrome, top-anchored on all four
  panels with the same geometry, the Players-to-Rankings panel switch moving nothing above the body.

- **UIF9.2:** WHEN A opens a row's sheet, IT SHALL render as the ContextSheet with a last Back row, its Decline and final Confirm
  prompts in the confirm variant with the shipped No default.

- **UIF9.3:** THE four Social panels SHALL have identical computed body padding and row spacing, measured in Chromium (089).

- **UIF9.4:** THE Challenges tab SHALL list each challenge as a RowCard with visible separation, and the Trades tab's migration
  SHALL remain deferred to M-trade-sessions `ts-3`, which rebuilds that tab (086).

- **UIF9.5:** WHEN a trade or challenge action settles, THE message SHALL use its policy channel with no layout shift, and a
  trade or challenge request SHALL stay a banner and world sheet, never a frame.

### uif-10 — Shop, Heal, Journal, Trade propose
category: ux-a11y · severity: LOW · size: MODERATE
touches: client/src/ui/shopView.ts, client/src/ui/shopView.test.ts, client/src/ui/screens/shopScreen.ts, client/src/ui/screens/shopScreen.test.ts, client/src/ui/healView.ts, client/src/ui/healView.test.ts, client/src/ui/questLogView.ts, client/src/ui/questLogView.test.ts, client/src/ui/questLogView.i18n.test.ts, client/src/ui/tradeProposeView.ts, client/src/ui/tradeProposeView.test.ts, client/src/ui/tradeProposeView.i18n.test.ts, client/e2e/ui-screens.spec.ts, client/e2e/trade-propose.spec.ts
after: [uif-7]
Feedback items: pt3-2026-10-030, -055, -094
Measured: `shop-tabs` strip plus `qty` and `confirm` phases in `shopScreen.ts`; `shop-feedback`, `tradepropose-feedback`; Journal's
`#quest-log-empty` and `#quest-log-title` from qf-4, with `indexShell`'s static roster kept. The dialogue box is the blocking
text-box channel and is left as shipped (`dialogueView` is not touched). Reuses existing catalog keys and `kit.sheet.*`.

- **UIF10.1:** WHEN Shop shows, ITS tabs SHALL render through the TabBar, its Buy/Sell confirm SHALL use the ContextSheet confirm
  variant with the shipped default, and its outcomes SHALL use their policy channel with no layout shift.

- **UIF10.2:** WHEN the Journal has no quests, THE screen SHALL render through EmptyState using the existing copy, with the title kept
  (the first EmptyState consumer the sketch names).

- **UIF10.3:** THE Shop, Heal, Journal and Trade-propose screens SHALL match the frame anatomy and token spacing through `uiKit.ts`, with
  their lists growing and scrolling per the kit.

- **UIF10.4:** WHEN the trade-propose wizard reports a refusal, THE message SHALL use its policy channel, with no change to what the
  wizard sends.

### uif-11 — Tactical screens on the kit; "Items"
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/styles.css, client/src/styles.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/tactics/strings.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/ui-tactics.spec.ts
after: [uif-8]
Feedback items: pt3-2026-10-131, -170, -173
Measured: `.tactics-*` has 12 `font-size` px literals and its own menu-row, chip and forecast colors. `boardRender.ts` uses fractional
grid tracks with `aspect-ratio`, so the board already fits its box. Roots carry `.mr-frame .mr-shell .mr-shell--top .mr-shell--battle`,
and `styles.test.ts` pins that layer. `tactics.menu.item` reads "Item" (the key is unchanged; only values move). `R-bt-17-HPFILLINLINE`
stays open. Tactical flow and copy otherwise stand.

- **UIF11.1:** WHEN the window grows in Chromium, THE tactical board, HUD, menu, ticker and forecast SHALL grow with `--mr-ui-scale`
  from the one scale, with no battle-only scale path (131; M-battle-tactics "no battle-only fork").

- **UIF11.2:** THE tactical chrome SHALL take type, spacing and state colors from the token set, sampled through `uiKit.ts` on the deploy
  panel, the board with its command menu, and the results panel, keeping the clock-band and HP-band meanings.

- **UIF11.3:** WHILE the command menu shows, THE tactical cursor row and disabled row SHALL use the same treatment tokens as `.mr-nav-item`,
  with the disabled reason preserved.

- **UIF11.4:** THE tactical item command SHALL read "Items" in en and its fr equivalent (#586 D4), with no "Bag" word left in the battle
  screen.

- **UIF11.5:** WHEN this slice lands, B17 battle-never-hidden, the tactical `aria` wiring and `tactics-wild.spec.ts` SHALL stay green
  with no edit to their assertions.

### uif-12 — World sheets
category: ux-a11y · severity: LOW · size: MODERATE
touches: client/src/ui/actionSheetModel.ts, client/src/ui/actionSheetModel.test.ts, client/src/ui/noticeModel.ts, client/src/ui/noticeModel.test.ts, client/src/ui/screens/worldScreen.ts, client/src/ui/screens/worldScreen.test.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/main.ts, client/src/main.hintBar.test.ts, client/src/main.notices.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/styles.css, client/e2e/controls.ts, client/e2e/ui-world-sheets.spec.ts
after: [uif-9, uif-10, uif-11]
Feedback items: pt3-2026-10-025, -049, -104
Measured: `main.ts`'s frame tick renders `#interact-sheet` via `renderNav` under `.mr-frame--prompt`, which has
`pointer-events: none` and follows the anchor tile; the request sheet sits low and centred. `sheetLayout`, `challengeLayout`,
`requestSheetLayout` hold the rows; the challenge confirm already ends in `no`. `readPickRows` (`e2e/controls.ts`) is used by
`tactics-pvp`, `trade-propose`, `pvp-side-b`, `ranked-forfeit`, so the helper filters the Close row and those specs stay.
`CTL13-1-MODEL-WORLD` pins the hint chips. These are not frames (DECISIONS "server-owned frames"): they stay world sheets.

- **UIF12.1:** WHEN a world picker, action sheet or request sheet shows, IT SHALL paint in the ContextSheet family with
  `[data-context-sheet]`, and its rows SHALL accept pointer clicks, staying anchored as shipped.

- **UIF12.2:** THE world picker, action sheet and request sheet SHALL end with a Close row whose A acts exactly like B, and the
  Challenge confirm SHALL keep its `no` row last.

- **UIF12.3:** WHILE a world sheet is open, THE hint bar SHALL show what Start and Select actually do there and a Choose verb
  beside a multi-row picker, closing R-ctl-13-SHEETCHIPS, in en and fr.

- **UIF12.4:** WHEN a click lands on the world canvas with a world sheet open in Chromium, THE sheet SHALL close with no
  interaction fired, and movement resumes per the `held` rules (B14) on the next press.

- **UIF12.5:** THE movement gate SHALL be unchanged: a sheet open still blocks walking, and `sheetOpen` still resets auto-repeat
  and held input on its edges (smoothness contract).

### uif-13 — Controls on the kit; the text-size setting
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/displayPrefs.ts, client/src/ui/displayPrefs.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/src/ui/screens/optionsScreen.ts, client/src/ui/screens/optionsScreen.test.ts, client/src/main.ts, client/src/main.remap.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/styles.css, client/e2e/remap.spec.ts, client/e2e/ui-controls.spec.ts
after: [uif-12]
Feedback items: pt3-2026-10-031, -094, -169
Measured: `CONTROLS_LAYOUT` is `tabs([...])` in `optionsScreen.ts`, and `controlsModel.CONTROLS_TABS` drives only binding rows, so
Display is added at the screen layer and `controlsModel` stays. `bindingStore.ts` is the persistence precedent: a total
parse-don't-validate read and a throw-safe `localStorage` accessor. `controls-feedback` is pinned by `remap.spec.ts`. The Reset-all
confirm uses `confirmLayout`. Controls is disabled over a battle (`SCREEN_POLICY`), so text size is not changed mid-battle. Options
dies in `uif-15` per #586 D3, so Display lives here.

- **UIF13.1:** WHEN Controls shows, ITS tabs SHALL render through the TabBar, the Reset-all prompt SHALL use the ContextSheet confirm
  variant with its shipped default of No, and a capture or Clear outcome SHALL use its policy channel.

- **UIF13.2:** WHEN the player opens Controls, THE screen SHALL offer a Display tab with text-size steps Normal, Large and Extra large
  (×1, ×1.5, ×2) navigable by D-pad and A (#586 D1), each label in en and fr.

- **UIF13.3:** WHEN a step is chosen, THE client SHALL write `--mr-text-step` on `documentElement` at once and SHALL persist it to
  `localStorage['mr.display']`, leaving `--mr-ui-scale` and the world's `deviceScale` unchanged.

- **UIF13.4:** WHEN the client boots, THE stored step SHALL apply before the first frame shows, and any missing, unreadable or
  out-of-set stored value SHALL read as ×1 with no throw.

- **UIF13.5:** WHEN Extra large is on at 1280×720 in Chromium, EVERY main-menu entry and the Monsters tabs SHALL stay reachable and
  visible through the kit's scroll, and a screen SHALL NOT clip a focused row.

### uif-14 — How to Play: Introduction, Encyclopedia, Report a problem
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/helpModel.ts, client/src/ui/helpModel.test.ts, client/src/ui/helpView.ts, client/src/ui/helpView.test.ts, client/src/ui/helpView.i18n.test.ts, client/src/ui/screens/helpScreen.ts, client/src/ui/screens/helpScreen.test.ts, client/src/ui/screens/types.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/ui/a11yCopy.ts, client/src/ui/a11yCopy.test.ts, client/src/ui/questLogView.test.ts, client/src/ui/reachability.test.ts, client/src/ui/menuModel.test.ts, client/src/ui/claimView.ts, client/src/main.ts, client/src/main.help.test.ts, client/src/main.chips.test.ts, client/src/main.dispatch.test.ts, client/src/main.input.test.ts, client/src/indexShell.smoke.test.ts, client/index.html, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/a11y.spec.ts, client/e2e/ui-help.spec.ts, ARCHITECTURE.md
after: [uif-13]
Feedback items: pt3-2026-10-110, -113, -114
Measured: `HELP_TABS` are `screen`, `controls` and `goals`; the All controls rows and `help.note.keysVsButtons` retire with the tab
(DEAD-KEY). `#help-controls` and `#help-goals` are static, pinned by `indexShell.smoke.test.ts`'s inner-id roster. `helpScreen` has one
item per tab and acts on nothing today; a phase state is new. A new `Command` arm reaches `dispatch`'s exhaustive switch, and F9's
bundle path in `main.ts` is the action. `R-ctl-14-STALECMT`'s named comment sites have drifted but are grep-findable: `claimView.ts`,
`a11yCopy.ts`, `menuModel.test.ts`, `main.chips.test.ts`, `index.html`, `reachability.test.ts`, `ARCHITECTURE.md`. Encyclopedia entries are
thunks over literal catalog ids (PARITY-02's DYNAMIC-KEY scan). The detail is a phase of the help frame: no new `OverlayId` (departure from
the sketch; each new id costs about 25 pins, and an in-frame modal gives the same behavior).

- **UIF14.1:** WHEN How to Play opens, THE screen SHALL show exactly two tabs through the TabBar, Introduction and Encyclopedia, with
  the All controls tab gone (110).

- **UIF14.2:** THE Introduction tab SHALL show a couple of paragraphs introducing the game, written like a book-jacket blurb with no
  spoilers (113), in en and fr, then a Report a problem row.

- **UIF14.3:** WHEN Report a problem is chosen by A or pointer, THE client SHALL assemble and save the bug bundle exactly as F9 does,
  closing R-ctl-14-CTL14.2 re-homed here because #586 D3's main menu has no slot for it.

- **UIF14.4:** THE Encyclopedia tab SHALL list every special in-game term and mechanic, covering at least party and Storage, recruit
  and bait, evolution and essence, affinity, status effects, tactical AP, initiative, the action queue, the idle clock, stances, Guard,
  deploy and ranked, as a D-pad list with its cursor remembered per tab, in en and fr.

- **UIF14.5:** WHEN A opens an entry, THE detail SHALL appear as a modal panel above the list in the same frame with its definition and
  related mechanics, B SHALL close it back to the same entry (114), and a click outside SHALL close it through the kit's pointer rule.

- **UIF14.6:** WHEN a tab changes or a detail opens, THE change SHALL be announced via the live region, closing R-ctl-14-HELPA11Y, with
  keyless-row rendering moot now its tab is gone.

- **UIF14.7:** WHEN this slice lands, R-ctl-14-STALECMT SHALL be closed by comment corrections at its named sites, with the generated-from-
  bindings hint machinery untouched and axe on How to Play still clean.

### uif-15 — Menu IA: Social opens directly, Options dies, labels land
category: ux-a11y · severity: MED · size: HEAVY
touches: client/src/ui/menuModel.ts, client/src/ui/menuModel.test.ts, client/src/ui/screens/mainMenuScreen.ts, client/src/ui/screens/mainMenuScreen.test.ts, client/src/ui/menuView.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/main.ts, client/src/main.menu.test.ts, client/src/main.accel.test.ts, client/src/main.notices.test.ts, client/src/main.controls.test.ts, client/src/main.hintBar.test.ts, client/src/main.help.test.ts, client/src/main.dispatch.test.ts, client/src/main.reconnectStack.test.ts, client/src/main.remap.test.ts, client/src/ui/contextStack.test.ts, client/src/ui/reachability.test.ts, client/src/ui/screens/socialScreen.boot.test.ts, client/src/ui/raisingView.ts, client/src/ui/controlsModel.ts, client/src/ui/a11yCopy.ts, client/src/ui/a11yCopy.test.ts, client/src/ui/frame.test.ts, client/src/ui/helpView.i18n.test.ts, client/src/ui/evolutionNotice.i18n.test.ts, client/src/ui/dialogueView.i18n.test.ts, client/src/ui/boxView.test.ts, client/src/ui/leaderboardView.i18n.test.ts, client/src/ui/privacyView.i18n.test.ts, client/src/ui/tradeView.test.ts, client/src/ui/errorOverlayView.i18n.test.ts, client/src/ui/evolutionView.test.ts, client/src/ui/shopView.test.ts, client/src/ui/tradeProposeView.i18n.test.ts, client/src/ui/claimView.i18n.test.ts, client/src/ui/raisingView.test.ts, client/src/ui/pvpView.test.ts, client/src/ui/renameView.i18n.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/resolver.test.ts, client/e2e/a11y.spec.ts, client/e2e/menu-flow.spec.ts, client/e2e/remap.spec.ts, client/e2e/battle-dpad.spec.ts, client/e2e/encounter-battle.spec.ts, client/e2e/ui-menu.spec.ts, docs/PLAYTEST.md
after: [uif-14]
Feedback items: pt3-2026-10-025, -079, -102, -104, -109, -111
Measured: `MenuTarget` is `Extract<OverlayId, …>` and must admit `social`; `battleReason` reads `SCREEN_POLICY[row.target]`, and
`social` is not battleSafe, so Social stays disabled over a battle. `socialScreen.init` already opens on requested, oldest-waiting,
remembered or Players, and `boundSocialTab` already carries a requested tab. `ACCEL_PATHS` U, P, L and Y are data rows; `AccelPath.tab`
widens to include the Social tabs (data only, semantics untouched). `EXPECTED_PATHS` (`router.test.ts`) rewrites those four rows once.
`e2e` uses `menu-root-social`, `menuSocial-root-` and `menuTo(page, 'options')`. The label half is R-qf-10-QF10.1's measured pin set
("Controls & Goals" in the listed `*View` tests + `resolver.test.ts`; "Bag" in `menuView`, `menuModel`, `mainMenuScreen`, `frame`, `helpView.i18n`,
`main.accel`, `main.controls`, `main.notices`). Catalog keys (`menu.bag.*`) keep their ids, so nav keys and e2e `bag` stay; values change. This
slice leaves the Profile group for `uif-16`, which removes the last sub-list. Size is mechanical, not logical; a builder may land the labels as
increment A and the IA as increment B.

- **UIF15.1:** WHEN Social is chosen from the main menu, THE client SHALL open the 4-tab Social frame directly on its default or
  remembered tab with no sub-list (#586 D3, 079), and over a battle the entry SHALL stay disabled with its reason.

- **UIF15.2:** THE main menu SHALL list How to Play and Controls at the root, the Options sub-list and its frame id SHALL be gone
  (#586 D3, 109, 111), and Close SHALL stay the last entry (025, 104).

- **UIF15.3:** WHEN an accelerator U, P, L or Y fires, THE same frame and tab SHALL open as before through the new path, with
  `EXPECTED_PATHS` rewritten once and its row changes named in a comment.

- **UIF15.4:** WHEN the labels land, THE entries SHALL read Monsters, Inventory, Journal, Social, Profile, How to Play, Controls, Close in
  en with their fr equivalents, the help title and a11y label SHALL read How to Play, and the disabled reason SHALL name "Items",
  closing R-qf-10-QF10.1.

- **UIF15.5:** WHEN reachability is computed, EVERY accelerator target SHALL be within the existing 7-press bound over the REAL
  `mainMenuStep`, with the design-table counts updated once and named.

- **UIF15.6:** WHEN the player backs out of any screen opened from the root, THE menu SHALL show again with its cursor on that entry,
  and the required flow (menu → screen → back → another screen → world) SHALL pass in Chromium in `ui-menu.spec.ts`.

### uif-16 — Profile: one combined screen
category: ux-a11y · severity: MED · size: HEAVY
touches: client/src/ui/profileView.ts, client/src/ui/profileView.test.ts, client/src/ui/renameView.ts, client/src/ui/renameView.test.ts, client/src/ui/renameView.i18n.test.ts, client/src/ui/renameModel.ts, client/src/ui/claimView.ts, client/src/ui/claimView.test.ts, client/src/ui/claimView.i18n.test.ts, client/src/ui/privacyView.ts, client/src/ui/privacyView.test.ts, client/src/ui/privacyView.i18n.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/ui/overlayA11y.test.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/a11yCopy.ts, client/src/ui/a11yCopy.test.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/hintBarModel.test.ts, client/src/ui/screens/profileScreen.ts, client/src/ui/screens/profileScreen.test.ts, client/src/ui/screens/profileScreen.boot.test.ts, client/src/ui/screens/index.ts, client/src/ui/screens/index.test.ts, client/src/ui/screens/legacyAdapter.test.ts, client/src/ui/menuModel.ts, client/src/ui/menuModel.test.ts, client/src/ui/screens/mainMenuScreen.ts, client/src/ui/screens/mainMenuScreen.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/main.ts, client/src/main.controls.test.ts, client/src/main.menu.test.ts, client/src/main.input.test.ts, client/src/main.a11yFocus.test.ts, client/src/main.reconnectStack.test.ts, client/src/main.dispatch.test.ts, client/src/main.remap.test.ts, client/src/main.accel.test.ts, client/src/main.notices.test.ts, client/src/indexShell.smoke.test.ts, client/index.html, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/e2e/controls.spec.ts, client/e2e/rename.spec.ts, client/e2e/accounts.spec.ts, client/e2e/a11y.spec.ts, client/e2e/ui-profile.spec.ts, docs/DECISIONS.md
after: [uif-15]
Feedback items: pt3-2026-10-097, -102
Measured: `renameView`, `claimView` and `privacyView` are three `OverlayId`s; 33 files name them. Each view calls `openOverlayA11y` on its own
root, and two open traps cannot coexist, so the Social frame's one-panel-at-a-time trick does not make visible sections. The one honest shape:
a new single `profileView` overlay owns the dialog, focus trap, title and `initialFocusSelector`; the three classes keep their files, reducers,
phases and element ids (`#claim-overlay`, `rename-*`, `privacy-*`, so e2e selectors hold) but become sections with no a11y of their own.
`OR-MANIFEST-COMPLETE` gets the three names as a named exclusion rather than renames (`SCAN_TARGETS` and the resolver roster keep their rows).
`OVERLAY_IDS` 18 → 16; `SCREEN_POLICY`, `RECONNECT_CLOSES`, `OVERLAY_TIERS`, `OVERLAY_A11Y`, `SCREEN_ADAPTERS`, `PLAYER_FRAMES`, `CTL3-2-DROP-EXACT` and
`CONSTRUCTED` all rewrite once with named counts. Claim auto-opens at boot and on sign-in failure (`openClaim` paths in `main.ts`), so those paths
open Profile on the Account section. `rowsScreen`'s row-is-DOM-focus model extends to one list across sections. `ACCEL_PATHS` N and C become Profile rows.
Decision entry: Profile's one-dialog shape.

- **UIF16.1:** WHEN Profile is chosen from the main menu, THE client SHALL open ONE full screen showing Name, Account and Privacy sections
  together (#586 D3, 097), with section headers and separators from tokens and no sub-list; the last menu sub-list and `MenuLevel`'s groups SHALL be gone.

- **UIF16.2:** WHILE Profile shows, THE D-pad SHALL walk one column of rows across all three sections in visual order, the axis matching the
  layout (102), with Close at the bottom (104) and B popping the frame.

- **UIF16.3:** THE combined screen SHALL be one dialog with one focus trap, one title and one valid initial-focus anchor in every claim and privacy
  phase, axe-clean in Chromium.

- **UIF16.4:** WHEN a name is saved, a claim action is taken, or a privacy two-step confirm runs, THE same commands SHALL fire with the same
  guards as today: Yes/No defaults kept, privacy disarmed on close, the rename input typing rule unchanged, the account-e2e eval green.

- **UIF16.5:** WHEN the claim prompt auto-opens or sign-in fails, THE client SHALL open Profile focused on the Account section, and an accelerator N
  or C SHALL open Profile on its section, with `EXPECTED_PATHS` rewritten once.

- **UIF16.6:** WHEN a reconnect or a battle arrives with Profile open, THE frame SHALL close or stay per one `SCREEN_POLICY` row chosen from today's
  strictest of the three, with `RECONNECT_CLOSES` matching (rename's `true` wins, so a reconnect closes it).

- **UIF16.7:** WHEN this slice lands, R-ctl-8h-CTL8H.1 SHALL close as moot, every overlay roster SHALL carry `profileView` with 16 ids, and each count
  change SHALL be named in a test comment.

### uif-17 — The integrated whole
category: ux-a11y · severity: MED · size: LIGHT
touches: client/e2e/ui-whole.spec.ts, ARCHITECTURE.md, docs/PLAYTEST.md, docs/DECISIONS.md
after: [uif-16]
Feedback items: pt3-2026-10-094, -153, -175
Measured: an e2e of the combined flow only, reusing `uiKit.ts`; there is no product code in this slice. The wireframe-vs-shipped comparison goes in the
PR body with screenshots from this run (harness-side `M-ui-foundation-wireframes.md` gets its As-shipped section as the supervisor's doc chore, since a
slice routes to one repo). A discrepancy found here is fixed in a follow-up slice, not widened into this one.

- **UIF17.1:** WHEN the player walks menu → every screen → back → world by D-pad, then by pointer, in Chromium at three window sizes including
  devicePixelRatio 1.25, EVERY screen SHALL satisfy the frame anatomy, TabBar and token assertions of UIF.1 and UIF.6, with a focused row always visible.

- **UIF17.2:** WHEN that walk opens each mini-menu, THE sheet SHALL satisfy UIF.2 and UIF.3, and each screen's message SHALL satisfy UIF.4 with no
  measured layout shift.

- **UIF17.3:** WHEN the window resizes during the walk, THE world SHALL hold an integer `deviceScale` and the chrome SHALL track `--mr-ui-scale`
  continuously, for both a menu and a tactical battle (UIF.5, UIF.7).

- **UIF17.4:** THE control hints SHALL remain at the bottom of the screen on every screen, generated as shipped (153), with reachability, axe, liveRegion,
  focus-trap, B17 and the so-1/so-2 suites green (UIF.8).

- **UIF17.5:** THE closing PR SHALL attach the wireframe-vs-shipped comparison for each wf-1 screen and SHALL update `ARCHITECTURE.md`'s Client section and
  `docs/PLAYTEST.md` to the delivered menus.

## Post-integration verification

The milestone is done when the merged whole, not each slice, satisfies UIF.1–UIF.8:

1. Full `just ci` green on `uif-17`'s merge (lint, typecheck, Rust, evals including `account-e2e` and `bindings-drift` clean, client tests).
   No binding or schema diff across the milestone; `bindings-drift` and `battle-schema-snapshot` stay untouched because this is client-only.
2. Full `just e2e` green, including `ui-whole.spec.ts`, `menu-flow.spec.ts`, `pointer.spec.ts`, `a11y.spec.ts`, `tactics-wild.spec.ts`, `tactics-pvp.spec.ts`.
3. One manual pass over every migrated screen at three window sizes including a fractional devicePixelRatio, confirming UIF.1–UIF.7 by eye, recorded in the
   closing PR.
4. The wireframe-vs-shipped comparison attached to the closing PR so the operator can audit the delivered layout (#586 D2).
5. Absorbed residuals closed per the Residual map with `mr-gates residuals close`; the feedback items in this spec dispositioned from their slices.
6. Smoothness contract untouched: `render/world.ts`, the slide clock, interpolation and reconcile are not in any slice's touches, and `viewport.test.ts` still
   pins every shipped `deviceScale`.

## What the next milestones consume

- **M-trade-sessions `ts-3`:** RowCard (`ui/rowCard.ts`), TabBar via the Social chrome, toast channel. Its spec already requires per-trade rows; it adopts the
  component instead of building one.
- **M-gamepad:** `input/router.ts` and `bindings.ts` semantics unchanged; TabBar chips and hint chips read `data-button`, so a glyph set is one seam.
- **M-identity-handles, M19:** the Players tab stays on the Social chrome; new rows use RowCard and EmptyState.
- **M-world-art-pass:** the integer world scale is unchanged; a future pixel font obeys the pixel-grid rule.

## Risks / decisions

**Departures from the sketch, flagged for the operator (each is a best-judgment call inside #586; object before the named slice):**

- **Remainder absorption (`uif-2`, D1):** "margins/letterbox" is read as the visible tile count plus map margin, which is how the canvas absorbs the remainder today.
  No fixed-ratio box is added and R-ctl-SETRATIO closes as superseded. A fixed-ratio box would change how much world each window shows and belongs to a later ask.
- **Text-size steps (`uif-13`, D1):** ×1, ×1.5, ×2 on vector monospace. ×1.5 breaks the sketch's "integer multiples" wording, which only ever matters for a pixel font, and none ships.
  Home is Controls › Display, because D3 kills Options and rules the main-menu list.
- **Report a problem (`uif-14`, D3):** in How to Play's Introduction. D3's ruled main menu has no slot, and the sketch's "same `MENU_ENTRIES` edit" no longer fits.
- **Encyclopedia detail (`uif-14`, sketch said new `OverlayId`):** an in-frame modal phase. Same player behavior, about 25 fewer pin edits, and it matches how sheets work.
- **Sheet phases, not stack frames (`uif-3`, `uif-5`):** the sketch said "pops the sheet through the stack"; sheets are adapter phases, so close is B through the adapter. It stays inside the
  one-context-stack model because the only thing pointer does is press B.
- **World-canvas click (`uif-5`):** closes only. Routing it would press A and reopen the same sheet; the operator's expectation allows this ("assuming it is appropriate to do so").
- **Profile as one dialog, not tabs (`uif-16`, D3):** tabs would be far cheaper (the Social precedent) but keep three sparse pages, the operator's actual complaint. HEAVY, and the milestone's largest risk.
- **Terminology (`uif-15`):** the sketch's non-goal assumed qf-10 landed the labels. It did not (R-qf-10-QF10.1), and D3's ruled menu names them, so the labels land here. Further renames stay out.
- **Order inverted against the old PLAN line:** the tactical UI shipped first, so `uif-11` migrates it.

**Risks:**

- **Pin churn in `uif-15` and `uif-16`.** Both are HEAVY by file count. Mitigation: mechanical edits, named counts, increments allowed. If `uif-16` runs past its budget, the disciplined retreat is to park with its model
  and section components green; do not ship tabs as a substitute without an operator ruling.
- **Kit CSS proven late.** `uif-3`'s CSS has no real consumer until `uif-6`, by design (no fixture page in product code). Happy-dom cannot lay out; `uif-6` carries the first Chromium geometry proof.
- **Hidden dependencies.** Earlier waves parked on unmeasured ones. Every "Measured:" paragraph is grep-derived at `d90c32c9`; expect a few more, and handle each as STOP + build note.
- **Serial spine cost.** Most of the milestone is serial because `styles.css`, `main.ts` and the catalogs are shared. Fan-out is limited to `uif-9` and `uif-10` beside `uif-8`/`uif-11`.
- **Text size at ×2 on small windows** relies on pseudo-scroll; `UIF13.5` is the guard.

**Forks a build slice records in `docs/DECISIONS.md` (the spec names them; it mints no records):** token set and frame anatomy (`uif-1`), hybrid scale authority (`uif-2`), four-channel policy (`uif-4`),
sheet placement (`uif-7`), Profile's one-dialog shape (`uif-16`).

## Notes

- **Consumes:** `ui/frame.ts`, `ui/navRender.ts`, `styles.css`, `ui/overlayRegistry.ts` / `overlayA11y`, `input/pointerSource.ts`, the screen adapters under `ui/screens/`, so-2's `openFrame` shape.
- **Must not change:** `input/router.ts` and `bindings.ts` semantics, game-core, server module, generated bindings, `render/world.ts`.
- **Research:** `docs/research/retro-rpg-menu-ui-design.md` (implications 1–12), `docs/research/pixijs-ecosystem-ui-and-assets.md`.
