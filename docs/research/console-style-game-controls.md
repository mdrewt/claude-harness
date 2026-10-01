---
title: Console-style controls and menu navigation in retro 2D RPGs and monster-tamers
slug: console-style-game-controls
domain: gameplay
tags: [controls, input-mapping, virtual-buttons, keyboard-defaults, menu-navigation, cursor-memory, rebinding, gamepad, pointer-input, game-accessibility, handheld-conventions]
status: active
updated: 2026-10-01
confidence: medium
sources: 19
supersedes:
abstract: "Keyboard/pad defaults, contextual button roles, D-pad menu UX and rebinding conventions in retro 2D RPGs."
---
## Scope

How retro-styled 2D RPGs and monster-taming games (GBA/DS lineage and their modern PC/indie successors) map a small set of console-style buttons onto the keyboard, what each button conventionally means in each context (world, menus, battle, dialogue), how D-pad menus behave (active-item indication, wrap, cursor memory, tabs), how rebinding screens work, and how mouse/touch coexist with D-pad menus. Assumes a keyboard-first web or PC game that may later add controllers. Confidence markers: [S] = verified from a cited source; [K] = general knowledge, not re-verified.

## Key findings

- Confirm is conventionally Z / Space / Enter (Enter is always an alias); cancel is X / Esc. Backspace as cancel is nearly unprecedented (emulators use it for Select).
- In PC RPG engines Esc opens the menu in the world and backs out one level inside menus; the handheld idiom is Start = open/close-all. Both can coexist.
- Q/E, A/S, Q/W or PageUp/PageDown are the standard bumper (L/R) keys; bumpers switch tabs, pages or party members.
- Select is a meta action on the focused item (sort, reorder, registered item); Y/X in menus are secondary actions (info, favourite, sort).
- Menus: a ▶ marker plus highlight, cursor memory on reopen (players notice its absence), B backs out one level, Yes/No prompts with B = No, a 2×2 battle command grid, hover sets the active item and click activates, right-click cancels.
- Rebinding: one row per action, "press a key" capture, swap-or-warn on conflict, reset to defaults, prompts that read live bindings. Accessibility guidelines require remapping and no hold-only inputs.

## Concrete examples & references

### Keyboard default maps

| Game / tool | Confirm (A) | Cancel (B) | Menu / Start | Other | Source |
|---|---|---|---|---|---|
| Pokemon Essentials (PC fan engine) | Z, C, Space (Enter too) | X, Esc | Esc/X opens pause menu from world | A/S = L/R page up/down; D = Z (extra); Shift = run; F1 = in-game key remap screen; arrows = d-pad | [Essentials wiki](https://essentialsdocs.fandom.com/wiki/Controls) [S] |
| RPG Maker MV/MZ | Space, Enter, Z | Esc, X, Ins (Esc = open menu in world) | Esc / X | Shift = dash (A); Q/PageUp = L; W/PageDown = R; (A key = X btn; S = Y btn; D = Z btn per one source); F1 config; arrows | [RPGM forum](https://forums.rpgmakerweb.com/threads/rpg-maker-pc-game-controls-mv-vx-ace-vx-xp-2003-2000.140758/) [S] |
| mGBA | X = A | Z = B | Enter = Start | Backspace = Select; A = L; S = R; arrows = d-pad | [mGBA README](https://github.com/mgba-emu/mgba/blob/master/README.md), [guide](https://www.pokemoncoders.com/changing-controls-in-mgba/) [S] |
| Undertale | Z (Enter alt) | X (Shift alt) | C (Ctrl alt) = pause/stat menu; Esc is hold-to-quit | arrows only | [Dot Esports](https://dotesports.com/indies/news/all-undertale-controls-and-how-to-change-them), [StrategyWiki](https://strategywiki.org/wiki/UNDERTALE/Controls) [S] |
| Stardew Valley | X = check/action; C = use tool | Esc closes menus | E or Esc = menu | Y = emote; Tab = cycle toolbar row; all rebindable | [Wiki](https://stardewvalleywiki.com/Controls) [S] |
| Cassette Beasts | E, Space, Enter | Tab, Esc | Tab / Enter / Esc | World: E interact, Space jump, Shift dash, M map, P party, I inventory; menu "UI Action 1/2" = R/F; PageUp/PageDown = tabs | [Magic Game World](https://www.magicgameworld.com/cassette-beasts-pc-keyboard-controls-guide/) [S] |
| Sea of Stars | Space | Left Ctrl | Tab | | [Magic Game World](https://www.magicgameworld.com/sea-of-stars-pc-controls-keyboard-and-gamepad/) [S] |
| Eastward | Space (interact) | (not found) | Esc | | [GamePretty](https://gamepretty.com/eastward-basic-controls-keyboard-controller/) [S] |
| Chained Echoes | Space | Esc | I (menu), P (pause); widely complained about, no rebinding at launch | | [Steam thread](https://steamcommunity.com/app/1229240/discussions/0/3710434052108286264/) [S] |
| Pokemon GBA (hardware) | A | B | Start | Select, L, R (below) | [StrategyWiki FRLG](https://strategywiki.org/wiki/Pok%C3%A9mon_FireRed_and_LeafGreen/Controls) [S] |

Strongest conventions (observed across the table):
- Confirm: Z or Space or Enter. Nearly every PC game accepts at least two of them. Enter = confirm is nearly universal as an alias; Enter = "Start/menu" appears only on emulators (mGBA).
- Cancel: X or Esc. Backspace is NOT used as cancel by any game above except as emulator Select (mGBA). Backspace as B is unconventional; it is also the browser "back" key in old browsers and a text-edit key, so consider also binding X/Esc-in-menu as cancel aliases.
- Esc in PC RPGs is a toggle/back key: in world it opens the menu; in a menu it backs out one level (Essentials, RPGM, Stardew, Cassette Beasts). In Undertale it is deliberately not the menu key (hold-to-quit). Esc = "close everything" (the brief's Start semantics) is the conventional PC meaning of "pause toggle", but Esc as one-level back is more common in menus. A game giving Esc "close all" and a separate B "back one" matches Start/B on handhelds.
- Left hand WASD with right-hand letter buttons is rare in this genre; Z/X/C with arrows (right-hand cluster of left hand) is the RPG/fan-engine tradition. WASD + E/Space is the modern indie tradition (Cassette Beasts, Stardew-like).
- Q/E, A/S, or PageUp/PageDown as L/R: Essentials uses A/S, RPGM Q/W, Cassette Beasts PageUp/Down. Q/E for bumpers is a modern, sensible choice (matches WASD).
- Rebinding screen/in-game remap is expected; Chained Echoes' lack of it drew sustained complaints.

### What Y / X / Select / LB / RB do

| Button | World | Menu / battle | Source |
|---|---|---|---|
| Select (Pokemon GBA) | use registered item | sort items in Bag; reorder moves in move menu/party swap | [StrategyWiki](https://strategywiki.org/wiki/Pok%C3%A9mon_FireRed_and_LeafGreen/Controls) [S] |
| L / R (Pokemon FRLG) | help; L can be set to "L=A" option | Bag pocket switching and box page/switch use left/right (gen 3: d-pad left/right; gen 4+: L/R in Box and Pokedex pages) [K] | [StrategyWiki](https://strategywiki.org/wiki/Pok%C3%A9mon_FireRed_and_LeafGreen/Controls) [S partial] |
| X (Pokemon DS gen 4-5) | opens menu / X-menu in gen 6; Y = registered item (gen 5-6 [K]) | Y registers item in Bag [K] | [K] |
| Y (RPGM/Essentials) | rarely used | "Y" = extra action | [S] |
| Y (Stardew) | emote menu | | [S] |
| UI Action 1/2 (Cassette Beasts) | | R / F in menus (context actions such as sort/inspect) | [S] |
| Page Up / Down (RPGM L/R) | | switch actor in status/equip menu, page lists | [S/K] |
| X (Stardew) | check/action | | [S] |

Pattern: Select = "meta action on the focused thing" (sort, reorder, quick item). Y/X in menus = secondary action on focused item (info, register favourite, sort, drop). Bumpers = lateral navigation (tabs, pages, party members); in-world they are usually unused or camera/run toggles. Golden Sun (L/R = Psynergy shortcuts, Select = unused/ party shortcut) and Mother 3 (Y/Select = look/check) are [K] unverified.

### Menu UX conventions (largely [K] from Pokemon/GBA-DS RPG practice; cursor memory [S])

- Main menu (Pokemon): vertical list on the right edge, order Pokedex / Pokemon / Bag / Trainer card / Save / Option / Exit; Start or B closes; cursor remembered between openings within a session [S: [Bulbapedia Bag](https://bulbapedia.bulbagarden.net/wiki/Bag), cursor memory gen I-III and VII; Scarlet/Violet dropped it and players complained].
- Active-item indication: black filled triangle (▶) beside the text, or a highlighted frame; selected item may bob/blink. Combined indicators (arrow plus highlight) beat colour alone (see accessibility).
- Wrap-around: lists wrap top/bottom in Pokemon main menu; Bag item lists do NOT wrap (stop at ends, with scroll cursor) [K]. Pick one rule per widget type and document it; wrap in short menus (under ~8 items), clamp in long scrolling lists.
- Tabs/pockets: left/right (or L/R bumpers) change pocket, up/down choose item; Bag opens at last pocket and last item.
- B backs one level; Start (and in Pokemon world menus, sometimes B on the root) closes the whole menu. Start "close all" is common on GBA ("Start toggles menu").
- Confirm prompts: Yes/No box; default cursor on Yes in Pokemon for harmless actions (Save), No for destructive ones (release, overwrite) [K]. B on a Yes/No = No.
- Battle command menu: 2x2 grid Fight/Bag (top row), Pokemon/Run (bottom); d-pad in 4 directions; B returns to the first-level menu; cursor returns to Fight on a new turn in gen 3+ but gen 1-3 remember last move per move menu [S partial: PokeRogue issue shows players expect reset-to-Fight].
- Text/dialogue: A advances and completes the typewriter line; B also advances in Pokemon and holding B speeds. On-screen keyboard grid for names on handhelds; PC indie games type directly with the physical keyboard (Essentials supports typing). Use real typing on PC.
- Grids (Box): d-pad moves in 2D with edge wrapping horizontally, L/R switch box, Select/Y toggles move mode.

### Rebinding UI conventions (PC indies)

Practical pattern across Stardew, Essentials ([F1 remap screen](https://github.com/FL-/Essentials-SetControls)), Cassette Beasts, RPGM:
- One row per action: label, current key glyph(s), optionally two slots (primary/secondary). Select row with d-pad/click, press A/click, a "Press a key..." modal captures the next key; Esc cancels capture (which means Esc itself must be bindable via an explicit path, XAG 107 asks that Esc be remappable too).
- Conflict handling: either swap (the colliding action gets the old key) or warn and require confirmation; silent duplicates are bad. Swap is the friendlier default, with the conflicting row highlighted.
- "Reset to defaults" button (per row and global); "Apply"/auto-save; settings persisted (localStorage for web).
- Prompts adapt: glyphs/labels in help and hint bars should read the current binding. Keep action names semantic (confirm/cancel/interact), not "PressX", and separate action, presentation (glyph), and platform layers ([Gamineai](https://gamineai.com/blog/how-to-add-steam-input-correctly-in-unity-6-controller-glyphs-rebinding-qa), [Kenney prompts](https://kenney.nl/knowledge-base/game-assets-2d/using-input-prompts)).
- Glyph look: keyboard prompts are a rounded keycap with the key name; short names (Esc, Ent, Sp) when width-limited; gamepad prompts are coloured round face-button letters (A green, B red, X blue, Y yellow on Xbox). For a virtual-button game, show the virtual button name (A/B) as a coloured chip plus the bound key in smaller caps.

### Mouse/touch and accessibility

- Mouse over d-pad menus: genre-standard (RPGM MV/MZ, Cassette Beasts, Stardew) is hover sets the active item, click activates it; right-click cancels (RPGM: right-click = cancel, left-click = confirm; touch tap = ok, two-finger tap = cancel) [S/K: [RPGM touch controls](https://synrecrpgmaker.itch.io/rpg-maker-mvmz-touch-controls)]. Last-input-device wins: moving the mouse shows hover, any key press hides it to avoid fighting over the active item.
- [Game Accessibility Guidelines (Basic)](https://gameaccessibilityguidelines.com/basic/): allow controls to be remapped; do not rely on colour alone; do not convey essential information by one channel; remapping is one of the four most-cited accessibility complaints.
- [XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107): all inputs remappable in-game (including Esc on PC); no required holds, or a toggle alternative; digital alternatives to analog input. Notable for the Undertale-style hold-to-quit pattern and long-press = B (touch long-press is a hold; provide an alternative cancel).
- Keep Tab as browser focus-navigation (consistent with the brief); keep visible focus indicators.

## Design implications & transferable principles

Five QoL ideas that go beyond the genre baseline:

1. Context hint bar: a one-line footer on every screen showing the live bindings for A/B/X/Y/LB/RB for the focused context ("A Select  B Back  Y Info  LB/RB Tab"), pulled from the rebinding table so it is always right. Pokemon relies on memory; most fan engines show nothing.
2. Start = "close everything" plus a "where was I" cursor memory per menu, persistent across sessions and cleared only on content invalidation; plus Start again while the main menu is empty reopens the last submenu (breadcrumb return).
3. Conflict-aware rebinding with live conflict preview and an "A/B/Start cannot be unbound" guard; export/import the layout as a short code (local first, sync-ready).
4. Unified input-source handling: hover sets active only while the mouse moves; any d-pad press instantly takes over; right-click/long-press = B with a visible long-press ring and a non-hold alternative (XAG 107). Click targets and active item share the same visual style so mouse and keyboard users see one UI.
5. Disambiguation menu for contextual A: when several interactions apply in front of the character, A opens a tiny radial/list popover of the options (talk/trade/challenge/shop), with the previous choice pre-selected, and the same B/Start rules apply. Most genre games pick one silently.

## Open questions
- Coromon, Monster Sanctuary, Temtem, Nexomon, Mother 3, Golden Sun, DeSmuME defaults not verified. Pokemon gen 4+ Y/X register-item semantics and "no wrap in Bag lists" are from memory.


## Sources

- https://bulbapedia.bulbagarden.net/wiki/Bag
- https://dotesports.com/indies/news/all-undertale-controls-and-how-to-change-them
- https://essentialsdocs.fandom.com/wiki/Controls
- https://forums.rpgmakerweb.com/threads/rpg-maker-pc-game-controls-mv-vx-ace-vx-xp-2003-2000.140758/
- https://gameaccessibilityguidelines.com/basic/
- https://gamepretty.com/eastward-basic-controls-keyboard-controller/
- https://gamineai.com/blog/how-to-add-steam-input-correctly-in-unity-6-controller-glyphs-rebinding-qa
- https://github.com/FL-/Essentials-SetControls
- https://github.com/mgba-emu/mgba/blob/master/README.md
- https://kenney.nl/knowledge-base/game-assets-2d/using-input-prompts
- https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107
- https://stardewvalleywiki.com/Controls
- https://steamcommunity.com/app/1229240/discussions/0/3710434052108286264/
- https://strategywiki.org/wiki/Pok%C3%A9mon_FireRed_and_LeafGreen/Controls
- https://strategywiki.org/wiki/UNDERTALE/Controls
- https://synrecrpgmaker.itch.io/rpg-maker-mvmz-touch-controls
- https://www.magicgameworld.com/cassette-beasts-pc-keyboard-controls-guide/
- https://www.magicgameworld.com/sea-of-stars-pc-controls-keyboard-and-gamepad/
- https://www.pokemoncoders.com/changing-controls-in-mgba/
