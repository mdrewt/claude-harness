# Spec: M-ui-foundation — the shared menu design language (SKETCH)

**Status:** sketch, 2026-10-24 (Playtest-3 feedback processing). Elaborate with
`milestone-loop-prompt.md` when PLAN §9 reaches it, against the CURRENT game repo ·
**Project:** monster-realm (client-only) · **Sequencing / blocked:** build slices are
`blocked: so-2` (M-stack-ownership) — this milestone rewrites the same roster-pin files
(`mainMenuScreen.ts`/`menuModel.ts` pins, router `EXPECTED_PATHS`), and SO2.7 requires those
pins rewritten "exactly ONCE" against so-2's final shape, so M-ui-foundation runs strictly
AFTER so-2 merges (wf-1, docs-only, may start earlier) · **Decision gate:**
`pt3-ui-policy` (mr-ask-drew batch; see Open decisions).

**Feedback items:** pt3-2026-10-030, -031, -038, -039, -040, -045, -046, -047, -049, -053,
-055, -058, -060, -079, -086, -089, -094, -097, -109, -110, -111, -113, -114, -164, -169,
-170, -171, -172, -173, -175. The wireframes-first process directive it executes is
pt3-2026-10-013 / -014 / -015.

**Absorbs residuals:** R-ctl-14-CTL14.2 (Report-a-problem leaf — same `MENU_ENTRIES` edit),
R-ctl-14-HELPA11Y, R-ctl-14-STALECMT, R-ctl-11a-MONSTERSTAB (bound-tab seam),
R-ctl-SETRATIO (superseded into the scaling decision — the parked set-ratio/letterbox
direction and the new continuous-responsive ask point opposite ways; `pt3-ui-policy`
resolves it before anything is built). R-weekly-review-2026-10-02-F3 is already
dispositioned fixed (GAME #579); it is named here as a PRESERVED behavior, not open work —
the feedback-channel rework must keep the liveRegion announcement wiring that fix added.

## Problem / intent

The operator's meta-finding: "the layout of each menu is subtly different from all the
others instead of sharing and re-using the same set of components" (094), resolved by the
directive "the menus need to take advantage of shared, re-usable, and modular code" (175).
The fact-check confirms this is structurally true, not an impression: the shared layer
(ctl-4's `frame.ts` + `navRender`) exists, but screens diverge in how they consume it —

- Only `menuView` uses `createFrame`'s titlebar tab row correctly. `boxView` and `helpView`
  re-mount `.mr-frame-tabstrip` (whose `flex:1` was designed for the horizontal titlebar
  row) as a direct child of the column-flex `.mr-frame`, where it grows VERTICALLY with
  leftover frame height — tab labels change height with tab contents. `raisingView`
  (`#bag-tabs`) and `controlsView` (`#controls-tabs`) use plain divs with no tabstrip class
  at all, so their tabs stack vertically (060, 116-family, 169/172).
- The monster-slot mini-menu is an unbordered styled div (`PART_STYLE` in `boxView`)
  wedged between the tab strip and the panels, with no Back/Close row, and its phase
  handler swallows all input outside Up/Down/A/B (046/047/049).
- Feedback is a layout-shifting flash line (058), an always-painted bordered strip that
  reads as an "empty footer" when blank, and a per-view `showFeedback` that no-ops while
  its view is hidden.
- Two uncoordinated scale systems: `render/viewport.ts` computes an integer `deviceScale`
  (deliberate pixel-art crispness) while the DOM overlays reflow continuously
  (`.mr-shell` inset box, `.mr-frame--side` width:33%) with fixed 14px/12px fonts — the
  exact "snapped world + smooth-scaled UI" failure the research doc names as the one
  damaging combination (164; agent7 finding 13; retro-rpg-menu-ui-design.md finding 14).

This milestone hardens `frame.ts`/`navRender` into THE single visual system every screen
consumes: a small kit of primitives (tab bar, context sheet, feedback channels, scroll,
tokens, empty state) instantiated everywhere, per retro-rpg-menu-ui-design.md implication 1
("consistency comes from a very small kit of primitives, not per-screen craftsmanship").
It is an extension of shipped ctl-4 work, not a rebuild. The controls doctrine (one binding
table, one context stack, virtual buttons primary) stands and is reinforced by the
feedback; everything here is content/styling/layout INSIDE that system.

## Scope (sketch)

1. **Wireframes first** (wf-1, the milestone's first slice — operator directive 013/014/015):
   wireframe diagrams comparing CURRENT vs PROPOSED layout per screen (main menu, Monsters,
   Inventory, Journal, Social, Profile, Options/Controls, Help), annotated with per-element
   sizing behavior (grows-vertically / grows-horizontally / scales-with-resolution / fixed —
   directive 014) and contrasted with genre conventions from
   `docs/research/retro-rpg-menu-ui-design.md` (015). Delivered through the `pt3-ui-policy`
   decision issue so the operator rules on them BEFORE build slices start.
2. **One TabBar component** consumed by box/help/bag/controls (menuView already conforms):
   uniform fixed height (sized from the tallest label, never from tab contents — 038),
   horizontal labels, top-anchored above the panel body, LB/RB glyph chips at both ends
   (060/169/172), selected-tab state visually DISTINCT from D-pad focus (≥2 selection cues;
   research doc findings 3/4). Includes the real bound-tab seam on `ScreenContext`
   (absorbs R-ctl-11a-MONSTERSTAB's synthesized-LB hack).
3. **A bordered ContextSheet component** for per-item mini-menus: standard frame family,
   corner-anchored, grows with option count — the genre convention
   (retro-rpg-menu-ui-design.md §4: Gen 3 action menus are corner-anchored, same frame,
   size derived from option count, never frameless) — with an explicit Back/Close row as
   the LAST entry (049; close-at-bottom rule), B unchanged. Final placement (corner sheet
   vs the operator's in-slot-buttons + detail-page alternative, 053) pends `pt3-ui-policy`.
4. **A four-channel feedback policy** — blocking text box / persistent hint line /
   anchored toast / modal dialog (research doc §5 decision rule) — replacing the
   layout-shifting care-flash presentation (058). Each message kind is classified to
   exactly one channel in a written policy table; no channel shifts surrounding layout;
   the feedback strip collapses/hides when empty (kills the "empty footer" reading while
   keeping the load-bearing Y-description slot); toasts are liveRegion-announced and never
   the sole carrier of required information. This restyles the ONE pgcc-a A1 feedback
   pipeline seam; it does NOT fix the care-sink routing bug (see Non-goals).
5. **Close-then-route outside-click for sheets** (046): a pointer event outside an open
   sheet pops the sheet through the stack, THEN routes the event. This deliberately
   reshapes ctl-15 CTL15.2's "clicks act only on `[data-nav-key]` in the TOP frame" rule
   for sheet frames; the operator stated the expectation outright, and it stays inside the
   one-context-stack model (the sheet is a frame; outside-click = pop + route).
6. **Wheel + D-pad pseudo-scroll for grids/lists** (038/039/040): the tab-content area
   grows to the available space up to a maximum (even when empty — 038/045); overflow is
   hidden and reached by D-pad scroll-into-view as the cursor moves (039); `pointerSource`
   gains wheel support (040 — it has none today); a position cue (end arrows or thin
   scrollbar) shows when content overflows.
7. **A text-size setting** (031): user-preference step(s) honoring the pixel-grid rule
   (integer multiples only — research doc §6); mechanism pends `pt3-ui-policy`.
8. **Single-scale-authority scaling policy** (164; absorbs R-ctl-SETRATIO): ONE computed
   scale, derived in device pixels, drives the world canvas AND a CSS custom property the
   overlay chrome consumes — ending the snapped-canvas/fluid-DOM split. The exact policy
   (continuous vs integer+letterbox vs hybrid) pends `pt3-ui-policy`; see Open decisions.
9. **Menu IA restructure** (pends `pt3-ui-policy` AND the recorded so-2/SO2.0 answer, same
   decision surface): Social opens the 4-tab screen directly on a default tab instead of a
   3-item picker aliasing one screen (079); Profile's three sparse screens collapse to one
   combined screen (097); Options' two leaves (How to play, Controls) promote to main-menu
   entries (109/111). Folds R-ctl-14-CTL14.2 (the owed Report-a-problem leaf) since it
   edits the same `MENU_ENTRIES`/`mainMenuScreen` pins.
10. **Help rework** (110/113/114): drop the All Controls tab (generated from the same
    `controlsModel` rows the Controls screen renders — pure duplication); rename
    'This Screen' → 'Introduction' with real game-blurb catalog content (113); 'Goals' →
    an encyclopedia of in-game terms/mechanics whose entries open a pseudo-modal detail
    view, B closes (114). The pseudo-modal is a prompt frame: per ctl-13's CTL13.5 DEFER
    note this costs a new `OverlayId` + a11y roster edits — known, budgeted. Keep the
    generated-from-bindings helpModel machinery; only the IA changes. Folds
    R-ctl-14-HELPA11Y (silent tab switches, keyless-row rendering) and R-ctl-14-STALECMT.
11. **Spacing/padding/typography tokens** (089, 030, 055, 170/171/173): one named token
    set (spacing unit, section borders/separators, type hierarchy, state colors including
    greyed disabled/non-selectable) consumed by every screen; value-based section
    separation so "which areas belong to which UI elements" is legible (055). Includes one
    designed focus/cursor style (styled `:focus-visible` on the M23 anchors — today the
    unstyled UA ring paints the "mis-sized rectangular box"; style it, never delete the
    anchors) and `list-style` normalization for nav-ified `<ul>`s (clears the Rankings
    bullet artifact and its siblings kit-wide).
12. **Row-card and empty-state patterns**: a challenges-style row-card component with
    visual separation per entry — the Trades tab is a named consumer (086), its migration
    coordinated with the trade-redesign milestone that rebuilds that tab's content; an
    empty-state component taking (reason, cue, next-step) with the frame/header/tabs kept
    (research doc §8) — Journal is the first consumer.

## Non-goals

- **No doctrine reopen:** binding table, context stack, virtual-buttons-primary, SCREEN_POLICY,
  hint-bar generation — all stand (operator reinforced them). Tab stays the browser focus key.
- **Not the defect wave:** the care feedback-sink mis-routing (feedback swallowed while
  raisingView is hidden), mouse-only duplicate buttons, battle legacy Run/Flee/Swap button
  retirement, and the Journal's missing content wiring are defect slices against shipped
  ctl/pgcc criteria, scheduled in the bug-fix wave. This milestone supplies the components
  those fixes render into.
- **Not the battle screen redesign:** the tactical-combat overhaul owns battle presentation;
  it consumes this kit when it rebuilds the battle UI. No battle layout work here beyond
  keeping B17/battle-policy pins green.
- **Not in-canvas UI:** the DOM overlay architecture stays. Per
  `docs/research/pixijs-ecosystem-ui-and-assets.md` (verdict table + DOM-vs-canvas
  guidance): `@pixi/ui` AVOID as menu foundation, `@pixi/react` AVOID, `@pixi/layout`
  DEFER — adopting them would reverse the shipped DOM-frame architecture and its M23 a11y
  stack. No new UI dependency in this milestone.
- **Not terminology renames** ("Monsters"/"Storage"/"Inventory"/"How to Play"): the naming
  decision batch + catalog-only slice own those; this milestone must not collide with the
  same catalog keys in flight.
- **No server/schema work.** Client-only. The text-size/scale settings persist like
  `mr.controls` (per-browser), not server state.

## Constraints (house rules + prior rulings that bind)

- All new strings (Introduction blurb, encyclopedia entries, empty-state copy, channel
  messages) land in the typed i18n catalog, en AND fr; `t()` throws on missing keys.
- M23 a11y is preserved, not traded away: focus traps, initial-focus anchors, liveRegion
  announcements (incl. the F3 fix from GAME #579), axe gates. The focus-ring fix is a
  styling change on the anchors; deleting the anchors breaks the dialog a11y contract.
- Trade/challenge requests stay non-modal banners and world sheets, never frames
  (DECISIONS.md "server-owned frames") — the toast channel must not quietly become a frame,
  and dialogue stays store-reconciled.
- The four-channel policy builds on pgcc-a A1's single feedback pipeline (one
  `showFeedback` seam) — restyle once at the seam, no per-view channel forks.
- Roster pins (`CTL2-1-POLICY`, `CTL3-2-DROP-EXACT`, `EXPECTED_PATHS`, reachability sets)
  are rewritten against so-2's final shape and then touched by THIS milestone with the
  same discipline SO2.7 names: literal manifests, every intentional count change named in
  a test comment.
- Pixel-grid rules from the research doc govern all sizing: panel sizes and type sizes as
  integer multiples of one source unit; no fractional pixel-font scales.

## Slice sketch (order; EARS detail at elaboration)

Slices share `frame.ts`/`styles.css`/screen adapters, so the spine is SERIAL; only wf-1 is
parallel-safe (docs-only). Realistic shape:

- **wf-1 — wireframes + comparison** (docs-only; may precede so-2). Deliverable: the
  current-vs-proposed wireframe set with sizing annotations, attached to the
  `pt3-ui-policy` mr-ask-drew issue. Exit: the operator's recorded answer
  (`memory/projects/decisions/issue-<n>.answer.md`). MANUAL gate — no build slice merges
  before the answer, mirroring so-2's SO2.0 model.
- **uif-1 — tokens + TabBar** (frame.ts, styles.css, navRender; migrate box/help/bag/
  controls; bound-tab seam; focus style; list-style normalization).
- **uif-2 — ContextSheet + Back/Close row + close-then-route pointer rule**
  (boxView/monstersScreen sheet, pointerSource dispatch policy; CTL15.2 pin update).
- **uif-3 — feedback channels** (channel policy table, toast + modal/prompt-frame
  components — the prompt frame is shared with uif-5's encyclopedia detail; collapse-empty
  feedback strip).
- **uif-4 — growth + pseudo-scroll + wheel** (content-area growth rule, D-pad
  scroll-into-view, pointerSource wheel, position cue).
- **uif-5 — Help rework** (tab roster change, Introduction content, encyclopedia + prompt
  frame OverlayId; folds HELPA11Y/STALECMT).
- **uif-6 — menu IA restructure** (`blocked: pt3-ui-policy`; also requires the so-2 SO2.0
  answer on Social routing): Social direct-open, Profile combined screen, Options leaves
  promoted, Report-a-problem leaf (CTL14.2).
- **uif-7 — scale authority + text-size setting** (`blocked: pt3-ui-policy`):
  viewport.ts-derived scale exported as the single authority + CSS custom property;
  settings surface.
- **uif-8 — row-card + empty-state components** (Journal empty state as first consumer;
  Trades-tab migration deferred to the trade-redesign milestone).

## Acceptance sketch (milestone-level; per-slice EARS written at elaboration)

- **UIF.1:** WHEN any screen presents tabs, THE CLIENT SHALL render them through the one
  TabBar component — uniform fixed height independent of panel contents, horizontal,
  top-anchored, LB/RB glyph chips at both ends, ≥2 selection cues, selected-vs-focused
  visually distinct — and no screen SHALL hand-mount its own tab DOM.
- **UIF.2:** WHEN a per-item mini-menu opens, THE CLIENT SHALL present it as the bordered
  ContextSheet frame, sized by option count, with a Back/Close row as its last entry, and
  B SHALL still close it.
- **UIF.3:** WHEN a pointer event lands outside an open sheet, THE CLIENT SHALL close the
  sheet through the stack and then route the event to its target (close-then-route),
  and the CTL15.2 pointer pin SHALL be updated to encode the new rule.
- **UIF.4:** THE CLIENT SHALL route every player-facing message through exactly one of the
  four channels per the written policy table; no channel SHALL shift surrounding layout;
  a toast SHALL be announced via the live region and SHALL NOT be the sole carrier of
  information the player must act on.
- **UIF.5:** WHILE list/grid content exceeds its panel's maximum, THE CLIENT SHALL hide
  the overflow and keep the D-pad cursor visible via scroll-into-view, SHALL scroll on
  mouse wheel, and SHALL show a position cue.
- **UIF.6:** THE menu chrome SHALL take spacing, borders, type sizes and state colors
  from the named token set only (no per-screen literals), with disabled/non-selectable
  items rendered at reduced contrast.
- **UIF.7:** WHEN the window resizes, ONE computed scale (policy per the `pt3-ui-policy`
  answer) SHALL drive both the world canvas and the overlay chrome via a CSS custom
  property — no second scale derivation.
- **UIF.8:** Regression floor: hint-bar generation, reachability sets, axe/liveRegion/
  focus-trap gates, B17 battle-never-hidden and the so-1/so-2 reconnect+openFrame suites
  stay green; roster pins change at most once, with named counts.

## Open decisions (pending `pt3-ui-policy`)

1. **Scaling policy** (164; R-ctl-SETRATIO): (a) continuous responsive scaling (smooth,
   blurs/shimmers pixel art — conflicts with the operator's own Octopath/Sea-of-Stars
   crispness bar), (b) integer world scale + letterbox with UI absorbing the remainder
   (the parked r2 set-ratio direction), (c) integer world scale + UI scale derived from it
   (equal, or an integer multiple/divisor — research doc §9's coherent designs). The July
   r2 "scaling factor applied to everything" ruling and the new "smoothly growing" ask
   must be reconciled by the operator, not silently.
2. **ContextSheet placement** (047/053): corner-anchored sheet (genre default) vs in-slot
   buttons + a dedicated monster-detail page (operator's alternative; he notes the
   grid-vs-list D-pad tension in Storage himself). Wireframes present both.
3. **Menu IA batch** (079/097/109/111): confirm the Social direct-open default tab, the
   combined Profile screen, and the Options promotion — raised in the same batch as (or
   explicitly alongside) so-2's SO2.0 answer, since Social routing is designed there.
4. **Text-size mechanism** (031): user-preference integer steps (x1/x2 per the 200%
   accessibility floor) vs screen-size-driven auto-scaling, and where it surfaces
   (Options screen placement interacts with decision 3).

## Notes

- **Consumes:** `ui/frame.ts`, `ui/navRender.ts`, `styles.css`, `ui/overlayRegistry.ts` /
  `overlayA11y`, `input/pointerSource.ts`, the screen adapters under `ui/screens/`, and
  so-2's `openFrame`/shrunk-mirror shape (sheets are frames; close goes through the stack).
- **Must not change:** `input/router.ts`/`bindings.ts` semantics (M-gamepad consumes
  them), game-core, server module, generated bindings. If an elaboration finds it needs
  to, that is a hidden-dependency STOP, not a silent widen.
- **Post-integration verification** (definition-of-done at elaboration): full `just ci`
  green; one manual pass over every migrated screen at three window sizes (including a
  fractional devicePixelRatio) confirming UIF.1–UIF.7 end-to-end; wireframe-vs-shipped
  comparison attached to the closing PR so the operator can see the delivered layout
  matches what he approved.
