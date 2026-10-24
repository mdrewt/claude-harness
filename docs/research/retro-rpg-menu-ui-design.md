---
title: Visual and structural design of menu systems in retro-style 2D RPGs
slug: retro-rpg-menu-ui-design
domain: ui
tags: [menu-design, ui-layout, nine-slice, tab-bar, list-navigation, context-menu, modal-dialog, toast, empty-state, pixel-typography, focus-indication, integer-scaling, safe-area, input-parity]
status: active
updated: 2026-10-24
confidence: medium
sources: 69
supersedes:
abstract: "Layout, tabs, lists, modals, type, scaling and focus conventions for pixel-art RPG menus, with verified precedents."
---
## Scope

The VISUAL and STRUCTURAL side of menus in pixel-art 2D RPGs and monster-tamers: screen anatomy, panels and headers, tab bars, list/grid layout and cursor behaviour, context menus and modals, feedback channels (toast vs dialog vs text box), pixel typography, state colour, empty states, layout/scaling on arbitrary windows, and focus indication. Button mapping and rebinding live in the sibling doc `console-style-game-controls`; internationalization and general WCAG canon live in `internationalization-localization` and `accessibility-interactive-apps`.

Assumptions (state them, the reader's stack is unknown): keyboard/gamepad-first with optional mouse; a low-resolution pixel-art base; the menu layer may be engine-native widgets or an HTML/DOM overlay on a canvas; the window is an arbitrary desktop-browser size.

Evidence legend: [S] verified in a source opened for this doc; [S-search] seen only in a search-result summary, page not opened; [K] general knowledge, not re-verified; [I] my inference or arithmetic. Evidence quality is uneven. Strongest: decompiled source of a handheld title (hard geometry), vendor accessibility guidelines, engine and browser docs. Weakest: game-specific design rationale. For Octopath Traveler, Sea of Stars, Final Fantasy Tactics Advance and Triangle Strategy no primary UI design write-up was found; only reception and patch-note evidence. Bulbapedia and a UI-screenshot database refused automated fetches (HTTP 403), so handheld-era claims rest on decomp source rather than wiki prose.

## Key findings

1. Retro menus are fixed slots, not free layouts. A Gen 3 Bag is: pocket label (top-left) + item list (right, 8 visible rows) + description (bottom-left) + message bar (bottom); the summary is title window + body + prompt bar. Every screen reuses the same frame, text colours and 16 px row pitch. [S]
2. Context menus are anchored to a screen corner, share the standard frame, and grow away from the anchor as options are added (Gen 3: bottom-right, content rect ends at tile 29 of 30 and tile 19 of 20, grows upward). They are never frameless and never free-floating. [S]
3. Tabs come in three genre idioms: single label with arrows (Gen 3 Bag pockets), titled page-stepper (Gen 3 summary), and a top tab strip (Coromon, Sea of Stars options, MMO windows). Left/right or LB/RB steps tabs; up/down stays inside the page. [S]
4. Tab-strip rules with evidence: 1-2 word labels, one capitalisation style, at least two selection cues, tab list above the panel, every tab styled identically. No standards body bans rotated tab text, but placement research and reading research make horizontal-above the safe default. [S]
5. List scrolling has two models. Gen 3 lists move the cursor to a mid-window row and then scroll the list under it (centre-pinned), never wrap, hide the end arrows at the limits, and page by the visible row count on L/R. The common alternative is edge-triggered scroll. Pick one per product. [S]
6. Wrap policy is per widget class: vendor guidance says loop linear menus (with an off switch) and never loop multi-directional grids; Gen 3 itself mixes clamp (long lists, summary pages) and wrap (short menus, Bag pockets). [S]
7. Confirm dialogs should name the consequence, default to the safe answer, and map cancel to "No". A shipped RPG demo let players overwrite saves because the save-menu default cursor sat on the wrong slot and had to be moved. [S]
8. A dimmed-background "fake modal" must also block interaction underneath and move focus into the dialog; otherwise the cursor escapes behind the dim layer. [S]
9. Feedback has four channels with distinct jobs: blocking bottom text box, persistent help/prompt line, non-blocking toast near the source control, and modal dialog. Auto-dismissing toasts are an accessibility risk and must never be the only carrier of information. [S]
10. Empty states should do three jobs: say why it is empty, teach what fills it, offer the next step. A quest journal exists to orient the player, so empty is the most important state for it to stay useful. [S] + [I]
11. Pixel fonts are crisp only at integer multiples of their design grid; fractional sizes or scales produce partial-coverage pixels. Text shadow is a first-class colour slot in the handheld text engine. [S]
12. State must be carried by shape, value and motion, not hue: vendor guidance cites outline + fill + weight + colour combinations, and warns that a subtle glow fails low-vision and far-from-screen players. [S]
13. For pixel art the default scaling answer is integer scale of a low base resolution with letterboxing; engines document fractional scaling as producing uneven pixels. Base resolutions are chosen by divisibility into 1080p/1440p/4K. [S]
14. UI vs world scaling has three coherent designs (same integer scale for both; native-res world plus a separate display-resolution UI layer; user-adjustable UI scale). The damaging case is mixing a snapped world with a smooth-scaled UI. [S] + [I]
15. On the web, CSS pixel scale and device pixel scale differ under fractional device pixel ratios and zoom, so compute the integer scale in device pixels; `devicePixelContentBoxSize` is exact but not universal. [S]
16. Title-safe (inner 90 percent) and action-safe (inner 95 percent) margins matter for TV/console output, rarely for a windowed browser game. [S]
17. Games draw an in-UI cursor; the web focus ring serves keyboard users of DOM controls. A stray box on a title is the script-focus plus `:focus-visible` inheritance rule acting on a non-interactive heading. [S]
18. Pointer-only affordances are a documented failure: vendor guidance treats a mouse-only "Close" as a barrier, and a classic RPG's PC port needed several patches to add a keyboard/controller interface. The mirror failure (no mouse at all) also draws complaints. [S]
19. Consistency comes from a very small kit of primitives (window template, list template, cursor, scroll indicator, prompt bar) instantiated everywhere, not from per-screen craftsmanship. [S]

## Concrete examples & references

### 1. Screen anatomy, frames and visual hierarchy

Handheld baseline (Gen 3 Pokemon, from the open decompilation): the screen is 30x20 tiles of 8 px (240x160). Windows are rectangles of tiles with a template (tile origin, size, palette). Two frame families exist: the standard menu frame and the dialogue frame, with separate base tile and palette slots [S menu.c]. The dialogue frame is user-selectable: Bulbapedia's frames gallery lists 20 frames for the RSE games and 10 for the FRLG games [S-search]. The dialogue box is 30x6 tiles (240x48 px) with a 27x4-tile text window holding two 16 px lines; the frame is a 56x16 px strip with the bottom edge mirrored, not a nine-slice [S Crosley].

| Slot (Gen 3 Bag) | Tile rect (x, y, w, h) | Role |
|---|---|---|
| Pocket name | 4,1,8,2 | tab label, flanked by switch arrows |
| Item list | 14,2,15,16 | right column, max 8 rows visible |
| Description | 0,13,14,6 | bottom-left detail for the focused row |
| Message | 2,15,27,4 | bottom bar for feedback and prompts |

[S item_menu.c]. Other fixed anchors: party message window at 1,15,28,4; the summary screen has per-page title windows and a bottom prompt window that shows an A or B button icon plus a label (Cancel on the info page, Info on move pages, Switch during move selection) [S party_menu data, pokemon_summary_screen.c]. A modern vendor guideline makes the same point as a rule: a page title should sit in the same place on every screen, repeated components keep their order, and prompts stay in the same corner (bottom-left in the cited example), including inside dialogs [S XAG 112].

Nine-slice (scalable panel) in modern engines and the DOM:
- Godot `NinePatchRect`: 3x3 grid, corners fixed; edge/centre axis modes Stretch (distorts), Tile (no distortion, texture must be seamless), Tile Fit (tiles but stretches to fit) [S].
- CSS `border-image-slice` makes four corners, four edges and a middle; the middle is dropped unless `fill`; unitless numbers are source pixels. `border-image-repeat`: `stretch` distorts, `repeat` tiles and may clip the last tile, `round` rescales tiles to fit a whole number, `space` keeps tile size and spreads the gap [S MDN].
- [I] For pixel art, `stretch` and `round` break the integer pixel grid (non-integer tile scale); prefer `repeat`/Tile with panel dimensions that are multiples of the tile edge so nothing clips, or `space`. Author every panel size as an integer multiple of one tile unit.

Header and hierarchy treatments seen: a bordered title window per page (summary); a single small bordered label plus arrows (Bag); a top tab strip (Coromon pause screen; its reviewer calls it a single main screen with clearly marked tabs) [S heypoorplayer]. Section separation is by nested frames and value steps (panel body vs inset well vs header band) rather than rule lines [I].

### 2. Tab bars and pagers

| Idiom | Example | Notes |
|---|---|---|
| Single label + arrows | Gen 3 Bag pocket name; arrows at fixed sprite positions; Left/Right or L/R switch pockets; `ChangeBagPocketId` wraps at the ends | Cheapest, no tab strip; the label is the title |
| Titled page-stepper | Gen 3 summary: Info, Skills, Battle Moves, Contest Moves; Left/Right or L/R change page and clamp at the first and last page; Up/Down change the party member; pages slide with a scroll animation | Lateral = pages, vertical = entity |
| Top tab strip | Coromon pause screen and settings (tabs added in v1.3.0); Sea of Stars options (controls, audio, visuals, general) plus a How to Play tab; MMO chat (six tabs), social menu (four tabs), bag (two tabs) | Strip + body in one frame |
| Bumper-stepped | Sea of Thieves-style menus: LB/RB tabs, LT/RT pages; Coromon v1.5.0 shoulder buttons cycle creature details | Vendor guidance wants these roles identical on every screen |

[S item_menu.c, pokemon_summary_screen.c, Coromon wiki, caniplaythat, Soulbound wiki, XAG 112].

Tab design rules with evidence (NN/g): labels 1-2 words with strong information scent; plain language; one capitalisation style, avoid all caps; at least two selection indicators (common region, line, bold or darker text, larger size, icon) and avoid thin single-pixel strokes; unselected tabs stay visible; one row only (stacked rows break spatial memory); tab list above the panel (vertical or bottom placement gets overlooked); a visible common region ties tab to panel; tabs "should all look and work the same"; do not mix in-page and navigation tabs [S]. DOM semantics (ARIA authoring practices): `tablist`/`tab`/`tabpanel`, Left/Right arrows move between tabs, Tab moves into the panel, automatic activation only if the panel appears without noticeable latency [S].

Vertical or rotated labels: no design system or standards body found that forbids them; reading research shows a legibility penalty for text in less-preferred orientations that grows with label length, and NN/g's placement finding says non-top tab lists get overlooked [S-search]. Conclusion [I]: horizontal labels at the top; if space forces vertical, use short labels or icons plus a tooltip.

Uniform heights and widths: not covered by a cited source beyond "tabs look the same" [S]; practical rule [I]: fix one tab height from the tallest label, give selected and unselected tabs the same outer box so the strip never reflows, and keep paging glyph chips (LB/RB) at both ends of the strip at constant size.

### 3. Lists, grids and D-pad navigation

Gen 3 list engine (`list_menu.c`, `list_menu.h`) [S]:
- Two state variables: cursor row within the window, and scroll offset. Moving down, the cursor walks to a midpoint row, after which the cursor stays and the list scrolls; at the end of the data the cursor walks to the last row and stops. Moving up mirrors it. Result: centre-pinned scrolling with no wrap.
- Header rows are skipped by the cursor; L/R (or Left/Right, per template flag) move a whole page of `maxShowed` rows; the cursor glyph is one of four kinds (black arrow, invisible, red outline, red arrow); row padding and font are template fields.
- End-of-list arrows are separate sprites that bob on a sine table and hide when the offset is at either limit.
- The Bag shows at most 8 rows at a time.

Wrap rules inside one game [S menu.c, party_menu.c, item_menu.c, pokemon_summary_screen.c]: the generic menu cursor wraps; a no-wrap variant exists and is used for party action lists with three or fewer entries; Bag pockets wrap; summary pages clamp; the move-selector wraps. Vendor guidance: after the last item go back to the first and vice versa for linear menus, but do not loop multi-directional tile menus, and offer a toggle [S XAG 112]. [I] Define the rule per widget class (short menu = wrap, long list = clamp, tab/pager = wrap or clamp but consistently, grid = clamp) and encode it in the component, not the screen.

Edge-scroll vs centre-pinned vs page-jump [I]: edge-scroll (cursor reaches the visible edge, list shifts one row) is easiest to reason about and matches desktop lists; centre-pinned keeps context above and below the cursor and is the handheld norm; page-jump on bumpers is additive. Whichever is chosen, show a position cue (end arrows, or a thin scrollbar for pointer users) and keep the cursor visible after resize.

Grids vs lists [I, with S anchors]: use a list when rows need text, comparison or a detail pane (the review of a tactics RPG faults a shop that gave no way to judge an item before buying [S RPGFan]); use a grid when entries are recognisable by icon or sprite and numerous (Coromon's storage grid, and v1.5.0 changed the skins screen from a list to a grid [S Coromon wiki]). In grids the focus moves to the tile directly in that direction, and focus order must follow the visual layout and be recomputed when scaling re-flows it [S XAG 112]. Provide a second route to content in large inventories and logs (tabs, search, filters) [S XAG 112].

Cursor memory and default cursor: the older console series offers a Reset vs Memory cursor option in Config [S-search]; an RPG demo moved the save menu's default cursor after players overwrote saves [S Siliconera]. Default the cursor to the safe or most-likely target.

### 4. Context menus, modals and dialogs

Where per-item action menus go (Gen 3, from the decomp) [S]:
- Party action menu (Summary/Switch/Item/Cancel plus field moves): geometry is computed from the option count: left tile 19, width 10, top = 19 minus 2 per option, height 2 per option, 16 px per row, drawn with the standard frame. The content rect therefore ends at tile 29 of 30 and tile 19 of 20: bottom-right anchored, growing upward (the frame is drawn around the rect, so it sits against the screen edges [K]). A persistent bottom message window asks what to do with the creature.
- Bag context menus use fixed templates in the same corner: 1x1 at 22,17,7,2; 1x2 at 22,15,7,4; 2x2 at 15,15,14,4; 2x3 at 15,13,14,6. Quantity box at 24,17,5,2; money box top-left at 1,1,10,2.
- Yes/No box: two presets, "low" at 24,15,5,4 and "high" at 21,9,5,4, chosen by whether the bottom message bar is occupied; the initial cursor is a parameter (default Yes is a separate helper).
- Pattern: corner-anchored, same frame, bottom edge aligned to the message bar, never clipped by list scrolling, size derived from option count.

Alternative anchors [I]: next to the selected row (desktop and MMO style; Coromon has a Squad dropdown menu and a Storage action menu [S Coromon wiki]) needs viewport clamping and flip logic; corner anchoring avoids both and is trivially consistent. MMO window UIs open floating windows from hotkeys and a HUD launcher (Soulbound Online: B, C, M open bag, profile, map; a clickable HUD tab menu for Traits, Inventory and Quest List was added later; quest tracker docked left, hideable in Settings, right-click to untrack) [S Soulbound wiki, devlog]; that paradigm is pointer-first and needs a D-pad route bolted on if the product also targets pads.

Modals:
- NN/g: modals for critical or irreversible decisions only; they cost context; non-modal for non-critical information [S]. Confirmation dialogs: reserve for serious actions, name the consequence, use action-based buttons instead of Yes/No, do not pre-focus the destructive answer, prefer undo, allow muting routine confirmations [S].
- Retro idiom: Yes/No box with cancel = No [K, see sibling doc].
- Fake modal (dim overlay): vendor guidance: when a dialog overlays other UI the focus indicator must move to its first interactable control and focus must not reach anything outside it [S XAG 113]. In HTML, `<dialog>` opened with `showModal()` makes the rest of the page inert, sets initial focus on the first focusable element (use `autofocus` to choose), styles the dim layer via `::backdrop`, closes on Esc after a `cancel` event, and should always include an explicit close control [S MDN].
- B-to-close: a persistent way back on every submenu; the same input that entered a control must be able to leave it, or a prompt must say how [S XAG 112].

### 5. Feedback messages: bottom box vs toast vs dialog

| Channel | Blocks input | Use for | Precedent |
|---|---|---|---|
| Bottom text box | yes (A advances) | narration, "cannot do that" explanations, results the player must read | Handheld message bar at 1,15,28,4 (party) and the 30x6-tile dialogue frame; per-character speeds 8/4/1 frames, hold A/B speeds up [S] |
| Help/prompt line | no | what the focused thing does, what buttons do now | Party "what to do with this creature" message; summary prompt bar with button icons; a tactics RPG added the option to hide its bottom button guide [S] |
| Toast near the control | no | passive no-op/success notices | Coromon Remastered v1.5.0: "already at max energy" and "no usable items" appear as compact toast popups near the relevant button [S] |
| Modal dialog | yes | irreversible actions, required choices, errors needing action | NN/g [S] |

NN/g: toasts suit passive notifications and are a poor choice for errors since users miss them; modals suit urgent events but a modal for a low-stakes confirmation is a nuisance [S]. Accessibility: auto-dismissing toasts conflict with WCAG 2.2.1 unless the user can adjust or extend timing; they are hard to reach by keyboard and disappear before a screen reader or magnifier user finds them; a design-system guide recommends against them and prefers static banners or doing nothing for self-evident results [S Roselli, Primer]. Vendor text guidance applies text-size and contrast settings to toasts and error dialogs as much as to menus [S XAG 101].

[I] Decision rule: self-evident result visible in the UI = no message; passive notice or blocked action with a short reason = toast anchored to the triggering control, adjustable duration, also written to a message log; anything the player must act on or read to continue = bottom text box or modal; never route the only copy of important information through a toast.

### 6. Typography in pixel UIs

- Pixel fonts are bitmaps on a grid; they render crisp only when each font pixel maps to a whole number of device pixels. Measured on one OS with smoothing off: 0.0 percent partial pixels at whole multiples of the grid for three pixel fonts and 19.4 to 82.2 percent between them [S Crosley]. Godot: the font size must be an integer multiple of the font's design size, the control should be scaled by an integer, bilinear filtering off (Nearest), subpixel positioning disabled for pixel fonts; antialiasing can blur at small sizes [S].
- Gen 3 text: four font ids (small, normal, narrow, small-narrow), presumably so over-wide strings can drop to a narrow face [I]; a text printer takes foreground, background and shadow colour indices; row pitch 16 px; average Latin glyph 5.25 px wide; writers hand-broke every line (widest 208 px in a 216 px window); another classic RPG word-wraps in code at a 220 px line [S text.h, menu.c, Crosley]. Shadow is therefore part of the text, not decoration; a 1 px offset mid-tone shadow lifts text off busy panels [I].
- Size floors: console text should be at least 26 px at 1080p and PC text at least 18 px at 1080p, measured as ascender + x-height + descender; players must be able to scale to 200 percent; include a sans option and a non-stylised fallback; fonts need full glyph coverage for supported languages; 80-character line cap and 1.5 line spacing for multi-line blocks [S XAG 101].
- [I] Translating the floor to a source grid: minimum source-pixel body height = ceil(floor / integer scale).

| Integer scale at 1080p | PC floor (18 px) | Console floor (26 px) |
|---|---|---|
| 6x | 3 px | 5 px |
| 5x | 4 px | 6 px |
| 4x | 5 px | 7 px |
| 3x | 6 px | 9 px |
| 2x | 9 px | 13 px |

So an 8 px bitmap font passes at 3x and above, and a 200 percent text option implies the UI layer must support a second integer step, not a fractional one.
- A demo of a major HD-2D RPG drew complaints that the help text was too small; the publisher listed it among adjustments in the works for release [S Siliconera]. A review of a GBA tactics game's TV mode: "Blown up on a TV screen it can look messy with everything blending together" [S Nintendo Life]; legibility suffers when UI layers sit on busy art without a value separation.
- Weights and case: pixel faces rarely have true bold; carry emphasis with colour, shadow or a small glyph [I]. Avoid all-caps for tab labels (NN/g) and for blocks of text (vendor guidance); one- or two-word labels are exempt from the vendor case rule [S].
- CJK: glyphs are about twice Latin width in bitmap fonts (8 vs 4 px in common 8x8-grid fonts) so containers need width slack [S Crosley]; see the i18n sibling doc.

### 7. Colour, contrast and value for state

- WCAG non-text contrast asks 3:1 for visual information needed to identify a control and its state, names focused and selected states, and exempts inactive controls; a W3C list thread argues disabled controls should stay discernible [S-search]. Do not rely on colour alone [S GAG basic]. Vendor focus guidance: borders, size or weight change, or combinations; examples cited are an outline + contrasting fill + weight/colour change, and a high-contrast yellow backdrop with an animated marker [S XAG 113].
- Handheld cursor kinds: black arrow, red arrow, red outline, invisible [S list_menu.h]; scroll arrows bob [S].
- State vocabulary [I]: Default = base value. Focused = cursor glyph + highlight band + motion (blink or bob). Selected/active (a tab, a checked row) = persistent and visually distinct from focus, so "which tab am I on" and "where is my cursor" can both be true. Disabled = lowered value, still legible, optionally with a reason in the help line. Pressed = one-step darker plus 1 px shift on the same pixel grid. Never use hue as the only differentiator; separate sections by value steps.
- Window value treatment is noticed by players: the PC re-release of one classic RPG changed its text-window gradient to be darker towards the bottom, and fans asked for the original gradients and colour themes back [S-search Steam note]. Blue gradient windows with a pointing-hand cursor are the SNES-era icon [K]; one ROM-hacking document records that most cursors in Final Fantasy VI are hands, with an arrow for dialogue choices [S-search].

### 8. Empty-state design

- NN/g: empty states should (1) communicate system status (loading vs error vs truly empty; avoid a "No records" flash while loading), (2) provide learning cues (what fills this area), (3) provide a direct pathway (button or link to the first step) [S].
- Game anchors: Coromon's Logbook "keeps you focused on how to progress the plot" [S heypoorplayer]; an RPG demo's publisher planned a menu tracking main-story and sub-story progress [S Siliconera]; vendor guidance asks for more than one way to find content in quest logs and bestiaries [S XAG 112].
- [I] An empty journal keeps its frame, header and tab strip, and fills the body with: a one-line reason ("No active quests"), a cue where quests come from, and the next step (point at a landmark or contact). Keep a focusable element (the tab strip or a Back control) so a visible focus indicator always exists [S XAG 113 requires one].
- Separate "empty" from "locked/undiscovered": entries not yet discovered can show silhouettes or "???" rows, which are not an empty state [I].

### 9. Layout, anchoring, scaling and safe areas

Base resolutions chosen by divisibility [S Godot 4.4 guide, Coromon wiki; arithmetic I]:

| Base | 720p | 1080p | 1440p | 4K |
|---|---|---|---|---|
| 320x180 | 4x | 6x | 8x | 12x |
| 384x216 | 3.33 | 5x | 6.67 | 10x |
| 480x270 | 2.67 | 4x | 5.33 | 8x |
| 640x360 | 2x | 3x | 4x | 6x |

Non-integer cells imply bars or uneven pixels. A 1280x720 base gives 1.5x at 1080p. Coromon's PC build moved its content area from 286x160 to 384x216 in v0.5.0 and in v1.5.0 raised the render resolution and let menu elements "scale much larger" [S Coromon wiki]. Celeste is reported to render at 320x180 (unofficial) [S-search].

Integer scaling and letterboxing:
- Godot docs: for pixel art use stretch mode `viewport`, aspect `keep` (single ratio, bars) or `expand` (multiple ratios, anchor controls to corners), and scale mode `integer`; fractional scaling "will lead to uneven pixel scaling"; fullscreen can leave a 1 px line that lowers the integer factor, so use exclusive fullscreen; `canvas_items` mode renders at target resolution and "may result in scaling artifacts" but allows sub-pixel motion [S]. A community 4.4 guide instead recommends `canvas_items` + integer scale + Nearest filter with 320x180 or 640x360 bases; the practical difference is that `canvas_items` lets text and UI render at window resolution (design b below) while `viewport` keeps everything on the base grid (design a) [S, difference I].
- Unity: a pixel-perfect camera with a reference resolution, optional upscale render texture, pixel snapping, crop frame and stretch fill [S]. Canvas Scaler modes: Constant Pixel Size, Scale With Screen Size (reference resolution; match width/height, expand, shrink), Constant Physical Size [S].
- Integer rule [S MonoGame thread]: choose the largest whole multiple that fits both axes, centre it, use point sampling; offer a second mode that fills the window with some blur. Shipping precedent: CrossCode offers Original, Double, Fit and Stretch plus a pixel-size setting, and players ask for a true integer option [S].
- Fractional scale options: sharp-bilinear (integer prescale with nearest, then bilinear for the remainder) [S-search]; the CSS spec text for `image-rendering: pixelated` says nearest-neighbour to the nearest integer multiple then smooth interpolation, but actual browser behaviour was not verified here, so test `pixelated` and `crisp-edges` per target browser [S MDN, flagged].
- Letterbox bars: filling them with extra world gives some players a visibility advantage and exposes tile edges [S MonoGame]; fill with a themed backdrop instead [I].

UI vs world scaling, three coherent designs:
- (a) One base resolution, one integer scale for world and UI (handheld model; simplest, text and frames share the pixel grid) [I].
- (b) World at native resolution upscaled by integer; UI drawn in a separate layer at display resolution so text is crisp: MonoGame advice is to render low-res to a target, scale it up, then draw text at screen resolution with point sampling; Defold's pixel-art HUD recipe authors the HUD at native resolution and scales it 4x in a display-space GUI, lets elements that need full resolution live outside the wrapper, and warns against centre or edge anchors that land off the pixel grid (use corners and whole-number maths) [S].
- (c) User UI scale: Godot recommends the runtime content-scale factor for a user-facing scaling option; Coromon Remastered scales menu elements larger; vendor text-size guidance demands up to 200 percent without loss of function or two-axis scrolling [S].
- The failure pattern [I]: snapped integer scaling for the world canvas, but CSS or fractional scaling for the menu layer, so panel edges, text and sprites sit on different pixel grids and one looks sharp while the other shimmers. Rule: one scale function, expressed in device pixels, feeds both layers; UI scale is either equal to the world scale or an integer multiple or divisor of it.

Web specifics [S unless marked]:
- `window.devicePixelRatio` is the CSS-to-device ratio and is fractional under zoom or OS scaling; `getBoundingClientRect()` times DPR can be off by a pixel, Safari fails at zoom other than 100 percent, and iframes break the approach. `ResizeObserver` with `devicePixelContentBoxSize` reports the exact device-pixel box after layout and before paint; sources cited here list Chrome and Edge 84, Firefox 93 (one article's table says 108, conflicting), Safari not supported as of a 2023 WebKit bug report; MDN marks it not Baseline. Use feature detection with the rounded-DPR fallback [S web.dev, MDN, webglfundamentals].
- [I] Worked example: a 1920x1080 display at 125 percent OS scaling gives a 1536x864 CSS viewport. A 320x180 base at 6x device pixels = 4.8 CSS px per source pixel; an integer CSS scale of 4 would underfill and 5 would overflow. Compute in device pixels, then set CSS size = base x (device scale / DPR).
- Render at lower resolution and upscale for performance on high-DPR screens [S webglfundamentals].

Anchoring and margins:
- Godot `keep_width` is "usually the best" for GUIs that scale; `expand` supports multiple aspect ratios; anchor to corners [S]. Defold: avoid off-grid centre anchoring [S]. [I] Odd-sized boxes centred in even containers land on half pixels; make panel sizes share parity with the base or round the offset.
- Safe areas [S]: Xbox defines action-safe as the inner 95 percent and title-safe as the inner 90 percent (1720x1000 at 1080p; the page's quoted 96 px horizontal margin does not match its own width, so treat as roughly 5 percent per side). UI belongs in title-safe; left/right 32 px and top/bottom 8 px of action-safe may carry system overlays. Unreal's default title ratio is 0.9. [K] Windowed browsers rarely need this; TV fullscreen and notched mobile screens do (CSS `env(safe-area-inset-*)` exists but was not verified here).

### 10. Accessibility: focus indication in games vs the web

- Vendor game guidance: every UI element shows a highly visible focus indicator; it must be visible on all backgrounds, never move off-screen, and in dialogs focus lands on the first control; ask whether it works for colour-blind players [S XAG 113]. Navigation order is logical and consistent, fully operable by keyboard and controller digital input alone, and by every supported input [S XAG 112].
- Web standards: WCAG 2.4.7 Focus Visible (AA): any keyboard-operable UI has a mode where focus is visible and it must not be time-limited. 2.4.13 Focus Appearance (AAA): indicator at least a 2 CSS px perimeter with 3:1 change between focused and unfocused pixels. `outline: none` is acceptable only with a replacement; avoid `box-shadow` as the replacement because it disappears in Windows High Contrast Mode [S WCAG, MDN, web.dev].
- Why a stray box appears around a title: pages often move focus to a heading (`tabindex="-1"`) when a panel opens so assistive tech announces it. The Selectors spec heuristics say that when a script moves focus, the new element should match `:focus-visible` if the previously focused element did. After any keyboard use, the heading therefore gets the ring [S Selectors-4, gomakethings].
- Mitigations: (1) a common recipe hides the ring on mouse-initiated programmatic focus (`[tabindex="-1"]:focus {outline:none}`) but restores it under `:focus-visible`, so it does NOT remove the ring after keyboard use [S gomakethings]; (2) to remove it for keyboard users too, null the outline under `:focus-visible` for non-interactive script-focus targets only, a judgment call (WCAG 2.4.7 scopes to keyboard-operable UI and the cited pages do not address non-interactive targets) [I]; (3) better, do not focus headings: focus the first control or the dialog/panel container; and in every case keep a game-style cursor visible somewhere, since vendor guidance requires an indicator to always be present [S XAG 113].
- [I] DOM game UIs: define one focus/cursor style from design tokens (glyph + highlight band + 2+ px contrast) used by every focusable component and by pointer hover, so mouse and keyboard users see one UI.
- Input parity precedents [S]: a mouse-only "Close" in a window corner is described as a barrier; Grounded keeps a keyboard-reachable Quit [XAG 112]. A classic RPG's 2018 PC port shipped the phone UI [S-search]; later patches added a choice between gamepad/keyboard and touch/mouse interfaces and changed the menu and title layouts for controller or keyboard [S Nova Crystallis], plus an Original graphics option and a font update [S-search TechRadar, Siliconera]. Sea of Stars has remappable keys but no mouse support on PC [S caniplaythat]. Coromon Remastered added hover, many hotkeys, button tooltips, shoulder-button cycling and multiple keyboard layouts; the original's prompts mentioned secondary buttons without saying what they were [S Coromon wiki, GameGrin, heypoorplayer].
- Overlap/discovery lessons: a tactics RPG's menu is called cluttered and hard to find things in, with the Select button as a contextual help route [S RPGFan, Nintendo Life]; Sea of Stars forum players were confused by the Equip vs Items split [S-search]; a strategy RPG's demo survey produced easier-to-distinguish icons, adjusted panel colours, a faster world-map cursor, conversation logs and a hideable bottom button guide [S Nova Crystallis], yet one launch review still called its UI annoying [S-search Tom's Guide].

## Design implications & transferable principles

1. Build a kit of menu primitives and forbid one-off layouts: Frame (nine-slice), Header, TabBar, List, Grid, Cursor, ScrollIndicator, ContextMenu, Dialog, MessageBar, PromptBar, Toast, EmptyState. Every screen is an assembly of these in fixed slots (title, tab strip, body, detail pane, message bar, prompt bar).
2. One tile unit. Define a single source-pixel grid unit; every size, margin, font size and offset is an integer multiple; panel widths follow the nine-slice tile edge.
3. Tab-bar contract: horizontal labels at the top, 1-2 words from the string catalogue, one case style, uniform box size, two or more selection cues, bumper glyph chips at the ends, LB/RB or Left/Right to step, Down to enter the body, wrap policy documented. Labels must come from one catalogue so two screens cannot name the same section differently.
4. List/grid contract: choose centre-pinned or edge scroll once; clamp long lists, wrap short menus, never loop multi-directional grids; end arrows plus scrollbar for pointer; remember the cursor; default to the safe target.
5. Context-menu contract: same frame as every other window, anchored to a fixed corner with a fixed inset (or beside the row with viewport clamping), grows away from the anchor, closes on cancel, returns the cursor to its origin row.
6. Message-channel contract: map each message to blocking box, help line, toast or dialog by the decision rule in section 5; toasts adjustable and logged; never the sole carrier.
7. Empty-state contract: component takes (reason, cue, next-step); the surrounding frame and tabs remain; focus always has a target.
8. Focus contract: one cursor style; no UA rings on non-interactive titles; programmatic focus only to controls or containers with the outline intentionally suppressed; test with keyboard-only and pointer-only runs.
9. Input-parity contract: every pointer affordance (close X, tab click, drag) has a D-pad/keyboard route, and every D-pad action has a pointer route; hover sets focus, last device wins (see sibling doc); prompt bar reads live bindings.
10. Scale contract: one scale function in device pixels; world and UI layers derive from it; provide an Integer (default) and a Fill option; expose a UI-scale step (x1, x2) for the 200 percent text requirement; fill letterbox bars with a themed backdrop.
11. Typography contract: pixel font at integer multiples only, nearest filtering, no subpixel positioning, shadow slot, minimum source body height by the table, hand-checked line breaks for core strings, glyph coverage for supported locales.
12. Verification: golden-screenshot tests at 3 window sizes including a fractional DPR; lint for rotated text, `outline: none` without replacement, hard-coded pixel sizes that are not multiples of the unit, and interactive elements lacking a keyboard route.

## Open questions

- No primary UI design write-ups located for Octopath Traveler (typography, windows), Sea of Stars (tab/bumper layout), Final Fantasy Tactics Advance and Triangle Strategy visuals beyond reception and patch notes; screenshot-level review (a UI screenshot database refused automated fetch) is still needed for layout claims about them.
- Bulbapedia was unreachable (403); Gen 4 and Gen 5 party and summary layouts are not verified here (only Gen 3 via decomp). Whether the Gen 3 frame is drawn outside the window rect (flush to screen edge) is [K].
- Soulbound Online: window chrome, tab orientation and resize behaviour are not documented in text sources found; only its hotkeys, tab inventory and HUD launcher are.
- Actual browser behaviour of `image-rendering: pixelated` at non-integer scale; current Safari status of `devicePixelContentBoxSize`; Firefox first-supported version (93 vs 108 conflict).
- No data on whether players prefer centre-pinned vs edge-triggered list scrolling; both are defensible.
- Coromon's pre-remaster squad-screen layout and the sprite resolution of its UI were not found.
- Safe-area handling for notched mobile browsers is [K] only.

## Sources

- https://github-wiki-see.page/m/pret/pokeemerald/wiki/Overview:-The-Party-Menu
- https://raw.githubusercontent.com/pret/pokeemerald/master/include/list_menu.h
- https://raw.githubusercontent.com/pret/pokeemerald/master/include/text.h
- https://raw.githubusercontent.com/pret/pokeemerald/master/src/data/party_menu.h
- https://raw.githubusercontent.com/pret/pokeemerald/master/src/party_menu.c
- https://raw.githubusercontent.com/pret/pokeemerald/master/src/list_menu.c
- https://raw.githubusercontent.com/pret/pokeemerald/master/src/pokemon_summary_screen.c
- https://raw.githubusercontent.com/pret/pokeemerald/master/src/menu.c
- https://raw.githubusercontent.com/pret/pokeemerald/master/src/item_menu.c
- https://bulbapedia.bulbagarden.net/wiki/Options/Frames
- https://blakecrosley.com/blog/pixel-art-interfaces-on-iphone
- https://www.heypoorplayer.com/2022/08/01/coromon-review-switch/
- https://www.gamegrin.com/news/coromon-gets-surprise-remaster-update-plus-celebratory-discount/
- https://coromon.wiki.gg/wiki/Build_Notes
- https://caniplaythat.com/2023/11/01/sea-of-stars-accessibility-review/
- https://steamcommunity.com/app/1244090/discussions/0/3805028278539162084
- https://www.rpgfan.com/review/final-fantasy-tactics-advance/
- https://www.nintendolife.com/reviews/wiiu-eshop/final_fantasy_tactics_advance_gba
- https://novacrystallis.com/2021/09/triangle-strategy-shares-changes-built-on-demo-versions-survey/
- https://www.tomsguide.com/reviews/triangle-strategy
- https://www.siliconera.com/square-enix-project-octopath-travelers-fixes-adjustments-made-fan-feedback/
- https://novacrystallis.com/2018/06/chrono-trigger-pcs-fourth-update-includes-revamped-menus/
- https://www.techradar.com/news/bungled-chrono-trigger-pc-port-will-finally-be-fixed-by-series-of-patches
- https://www.siliconera.com/chrono-triggers-first-pc-patch-released/
- https://steamcommunity.com/app/613830/discussions/0/1697169163397121749
- https://otakon273.duckdns.org/Consoles/RomHacking.net/rhdn_20240801/documents/[752]handcursor_hack.txt
- https://wiki.soulbound.game/Controls_and_Mechanics
- https://wiki.soulbound.game/Bag
- https://wiki.soulbound.game/Getting_Started
- https://wulfsagastudio.itch.io/soulbound/devlog
- https://www.nngroup.com/articles/tabs-used-right/
- https://www.nngroup.com/articles/empty-state-interface-design/
- https://www.nngroup.com/articles/modal-nonmodal-dialog/
- https://www.nngroup.com/articles/indicators-validations-notifications/
- https://www.nngroup.com/articles/confirmation-dialog/
- https://adrianroselli.com/2020/01/defining-toast-messages.html
- https://primer.style/accessibility/toasts/
- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101
- https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112
- https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/113
- https://gameaccessibilityguidelines.com/basic/
- https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast
- https://www.w3.org/TR/selectors-4/#the-focus-visible-pseudo
- https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
- https://web.dev/learn/css/focus
- https://gomakethings.com/tabindex-programmatic-focus-and-outline-styles/
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- https://developer.mozilla.org/en-US/docs/Web/CSS/border-image-slice
- https://developer.mozilla.org/en-US/docs/Web/CSS/border-image-repeat
- https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering
- https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry/devicePixelContentBoxSize
- https://web.dev/articles/device-pixel-content-box
- https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
- https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html
- https://docs.godotengine.org/en/stable/classes/class_ninepatchrect.html
- https://docs.godotengine.org/en/stable/tutorials/ui/gui_using_fonts.html
- https://itch.io/blog/806788/godot-44-settings-for-pixel-art.amp
- https://docs.unity3d.com/Packages/com.unity.2d.pixel-perfect@5.0/manual/index.html
- https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-CanvasScaler.html
- https://forum.defold.com/t/gui-for-pixel-art-games-heres-how/77704
- https://community.monogame.net/t/high-text-panel-resolution-in-a-low-resolution-game-pixel-art/14738
- https://community.monogame.net/t/fitting-pixel-art-game-to-screen/17043
- https://steamcommunity.com/app/368340/discussions/1/1729837292642203950
- https://retropie.org.uk/forum/post/101641
- https://devdocs.xbox.com/build/core-features/graphics/overviews/screen-areas
- https://steamcommunity.com/app/504230/discussions/0/3832043350345268297
