# Monster Realm: console-style controls and menus. Design (final, round-2 synthesis)

Grounded at monster-realm master `efd3f3a0` (client paths relative to `client/src/`). Base: design-v1, plus the binding operator answers of 2026-10-01 (trade/challenge face-to-face in the UI only; A targets the tile in front, then the own tile), every c3 MUST-FIX/SHOULD/NIT and every c4 BLOCKER/WARNING/NIT. Code claims were re-checked at `efd3f3a0`. Changes are listed at the end.

Genre research behind the conventions (keyboard defaults, button roles, menu UX, rebinding, pointer/a11y guidance in comparable games): shared library doc `docs/research/console-style-game-controls.md`.

## 1. Intent and principles

The primary interface is a virtual D-pad plus a few contextual buttons, as on a GBA or DS. Letter hotkeys are optional accelerators. The required flow must feel natural: menu → submenu → pick → back out → another submenu → world.

A player learns five sentences:
- **A does it. B undoes it. Start gets me out.**
- **Y tells me more.**
- **X jumps.**
- **LB and RB flip pages.**
- **Select shows help for this screen.**

Principles:
1. **One grammar everywhere:** every screen is a frame on one stack; B pops one, Start pops all.
2. **A game-style highlight**, never a mouse-like cursor, marks the active item.
3. **A live hint bar** always shows current bindings; prompts are never hand-written; glyphs show the bound keycap.
4. **No dead ends:** keyboard, mouse or touch leave every screen without a hold.
5. **The server may interrupt, but never steals a press or the focus.**
6. **Rules once, in game-core; server authority;** pure cores, thin shells; the movement smoothness contract is preserved.
7. **The D-pad path is never the clumsy path:** common tasks are within 4 presses of their accelerator (§5).

## 2. Virtual buttons and per-context control grammar

The button set is closed: `Up Down Left Right A B X Y LB RB Start Select`.

| Context | D-pad | A | B | X | Y | LB/RB | Start | Select |
|---|---|---|---|---|---|---|---|---|
| **World** | Walk (held-key seam) | Interact with the target (§7) | *Alt:* dismiss the top notice (toast, request banner, error); else nothing | Jump | **More**: the target's action sheet; with no target, **open the top notice** | — | Open main menu | Help |
| **Main menu** | Move (wraps) | Open | Close menu | — | Description | — | Close all | Help |
| **List / grid / tabbed screen** | Move (grid is 2-D) | Act, or open the item's action sheet | Back one level | A secondary action, only where the hint bar lists one (Monsters: quick Move) | Info | Previous/next tab | Close all → base | Help |
| **Action sheet / picker** | Move | Do it | Back; the cursor stays on the source item | — | Info | — | Close all | Help |
| **Yes/No** | Move | Choose | *Alt:* No | — | — | — | Close all (= No) | Help |
| **Quantity / number row** | ±1 | Confirm, or start typing | Back | — | — | — | Close all | Help |
| **Dialogue** | Choices | Finish the typewriter / advance / choose | *Alt:* finish the typewriter; on a choice or leaf node, end the talk (`dismissDialogue`) | — | — | — | End the talk + close all | Help |
| **Battle (base)** | Cursor | Choose | Sub-list → commands; nothing at the root | — | Skill/foe info | Tabs where present | **Main menu** over the battle (§4) | Help |
| **Battle outcome** | — | Continue | *Alt:* Continue | — | — | — | Continue | Help |
| **Typing mode** | The field owns every key except Escape and Enter (§4) | | | | | | | |

**B as "alternate interaction"** has only the *Alt* meanings above (plus cancel in move-mode); elsewhere B means back. In the world the operator's "alternate interaction" is split: B dismisses, Y looks closer (§15). No button is reserved; a future hold-to-run can use a *hold*, which does not conflict with a tap.

**Y always means "more":** Info in menus; in the world, the target's full action list (Talk / Shop / Heal / Trade / Challenge; A runs the obvious default); with no target, the top notice — for an incoming trade or challenge, the request screen (banner hint `[F] View [⌫] Dismiss`).

## 3. Default keymap, aliases and accelerators

Matching rules:
- Keys match on `e.code`. They are positional and case-insensitive, and Shift is ignored.
- Ctrl/Alt/Meta chords pass to the browser untouched. This is **new** behaviour (r2-035); today's ladder consumes some of them.
- `preventDefault` is called only on consumed edges.

| Virtual | Primary | Alias | Why |
|---|---|---|---|
| D-pad | W A S D | Arrows | Operator's choice; arrows are the standard alternate |
| A | Enter | NumpadEnter | Operator |
| B | Backspace | none (§14 default 2) | Operator |
| X | Space | — | Operator (Jump) |
| Y | **F** | — | On the home row beside D, so it can be pressed while walking. Cassette Beasts uses F for a UI action |
| LB / RB | Q / E | PageUp / PageDown | Operator; PageUp/PageDown is the RPG Maker tab alias |
| Start | Escape | **M** | Operator. M is tester muscle memory and the fallback when fullscreen swallows Escape |
| Select | **R** | `Slash` (code) | Tab stays for focus (operator). R sits next to E and F |

`Slash` is the *physical* key (W4): on AZERTY it reads `!`/`:`, so Help never prints "?" and shows the learned keycap (§9). The r2-016 fix survives because Shift is ignored.

**Accelerators** are optional and remappable; an accelerator can be unbound with its row's Clear action (Options › Controls). Each one opens its canonical menu path (§4), so B lands in the parent screen.

| Key | Opens | vs today |
|---|---|---|
| B | Monsters › Storage | same |
| I | Bag | same |
| V | Monsters › **Party**, always (canonical path beats tab memory); evolve is on the monster sheet | was E (now RB) |
| J | Journal | was Q (now LB) |
| U / P / L | Social › Trades / Challenges / Rankings (respond and track) | same |
| N / C | Profile › Name / Account | same |
| F9 / F8 | Bug bundle / dismiss error | same |
| Retired | T (= A); O (remote trade offer, r2-025); `?` matched via `e.key` (= Select) | |

Accelerator rules: pressed on its own top screen, an accelerator acts as Start (today's toggle feel). **Reachability invariant:** every accelerator path exists in the menu tree with a bounded D-pad press count (§5), tested over the pure models. Digit keys are not bound by default. Help notes "key names vs button names": the *key* B opens Storage; the *button* B is Backspace.

**Reserved, never bindable:** Tab and Shift+Tab, F5, F11, F12, bare modifiers, and Ctrl/Alt/Meta chords.

**Native-key ownership**, a pure `ownership(target, event)`: IME composing (`isComposing`/229) → the field, every key; typing mode → the field except **Escape** (stop typing) and **Enter** (commit); a native `<button>` reached by Tab (chips; legacy DOM-button screens) → native activation owns Enter/Space and the router emits nothing (test: Space on a focused chip is not consumed; today `main.ts:1699-1707`); focus outside `#game-screen` and not `<body>` → the browser (replaces `worldHasFocus`); otherwise → the router, with Backspace `preventDefault`ed.

## 4. Contexts, the focus stack, Start/B semantics and interrupts

**The stack** (`ui/contextStack.ts`, pure): `Frame = world | battle(id) | screen(id, nav) | prompt(id, nav) | textEntry(owner)`; `world` and `battle` are **bases**. The session gate sits outside the stack and outranks it. A total `SCREEN_POLICY: Record<FrameId, {owner: player|server, onBattle: drop|suspend, battleSafe}>` replaces `OVERLAY_TIERS`, `BATTLE_FORCE_HIDE` and `NEVER_FORCE_HIDE`; an omission is a compile error.

**Transitions** (`contextStep(stack, edge) → {stack, commands}`):
- **Start above a base** pops to it (battle if in battle, else world). Popping a server-owned dialogue emits `dismissDialogue`; the client never closes it.
- **Start at a base** pushes `mainMenu`. In battle the menu opens over the battle, read-only: Care/Feed/Move/Evolve, Bag Use ("Use items from the battle Bag command") and Accept challenge are disabled with a reason; reducer guards stay the authority (`is_in_ongoing_battle`, `reject_if_in_battle`). In PvP the header shows the turn timer. Start inside a battle sub-list (skill grid, bait list) pushes the menu above it, and closing returns to **that sub-list** with its cursor; the reset to Fight happens only at a new turn (c3 N1).
- **B** goes to the top model first (sub-list → list, typing → nav), else pops one frame; at a base it takes its §2 alternate meaning.
- **A on a menu entry** pushes the child *above* the menu. The hide-first `activateMenuLeaf` (`main.ts:802`) is deleted, so B returns to the menu.
- **Accelerators** pop to the base and push the canonical path with the cursor on the leaf. Denied over server-owned frames, `textEntry`, prompts and the session gate; over a battle, only battle-safe paths.

**Server truth is reconciled, never pushed.** `reconcile(stack, serverView)` runs on every `store.onBatchApplied` and is idempotent:
- battle appears → pop `drop` frames, keep `suspend` frames (dialogue) under it; an ongoing battle can never be hidden (dissolves B17); a terminal outcome pops once on Continue (`dismissedBattleId`);
- conversation appears → pop player frames, push dialogue; it goes → pop; `dismissPending` resets on rejection (B8); **a conversation ended server-side while suspended under a battle drops silently** — no toast, no focus change (named test, W2);
- incoming trade/challenge → non-modal banner + badges on Social and the Start chip, never focus;
- reconnect keeps `resetPredictionState`; claim-on-failure, privacy and session are enumerated policy rows.

**Responding to a request** needs no hotkey (c3 M3): world Y with no target opens the top notice (the request screen: Accept / Decline / View); and while a badge is pending, Social opens on the tab of the **oldest waiting request** with the cursor on it.

**Movement contract:**
- `heldKeys.ts`, `HOLD_COMMIT_MS` and the frame-loop gate keep their mechanism. **Every non-base push calls `held.clear()`** (B14 uniform).
- A D-pad press under a non-world frame never reaches `HeldDirections`. A direction held through a menu does **not** walk on close — deliberately reversing `main.ts:3204`, recorded in the Held-keys amendment.
- `held.press` is keyed on virtual-button edges; the `held.isHeld` dedupe (`main.ts:1694`) stays; `e.repeat` stays ignored (`main.ts:1312`). Virtual buttons are refcounted across keys (fixes `main.ts:1711`, where releasing ArrowUp stops a held W). `keyup`/`blur` stay ungated; `blur` and `visibilitychange:hidden` call `releaseAll`.
- `movementEnabled(stack, sessionGate)` replaces **every** `anyOverlayVisible()` use — `main.ts:1114` (divergence snap), `:3211` (frame loop), `:3270` (`overlayUp`) — and folds in the session gate (`main.ts:455-461`).

**Interrupts.** Priority: session > battle > dialogue > notice > menus. A server-caused frame announces its title on `#a11y-live`. There is no arm delay and no global mash-guard; destructive actions default to No.

**Typing mode** (rename, nickname, trade amounts): forms are lists of rows; A on a text row starts typing ("Typing — [Enter] Done [Esc] Stop typing"). The field owns every key except Escape (stop typing, keep text; a second Escape is Start) and Enter (commit). Rename opens already typing. The nickname edit leaves `window.prompt()` (`ui/boxView.ts:278`). Views drop `stopPropagation` (B5). The shape suits M19 chat.

**After a battle** the player lands in the world.

## 5. Main menu information architecture and navigation shapes

The **main menu** is a framed vertical list in a right-hand side panel, about ⅓ of the width, with the world visible behind it. It wraps, and the cursor remembers its entry.

| # | Entry | Shape | Absorbs |
|---|---|---|---|
| 1 | **Monsters** | Tabs **Party** (a list of up to 6) and **Storage** (a grid). A on a monster opens a sheet: Summary, Care, Feed… (food list), Evolve… (paths; disabled with a reason when there are none), Nickname, Move. X = quick Move | box, raising, evolution |
| 2 | **Bag** | Content-driven pocket tabs × list. A → Feed → monster picker, or Info. Use is disabled with a reason when it does not apply | raising inventory |
| 3 | **Journal** | A list; A or Y opens the detail | questLog |
| 4 | **Social** | Tabs **Players**, **Trades** (Accept / Decline / Confirm / Cancel), **Challenges** (Accept / Decline / Cancel), **Rankings** (read-only). A badge shows when something is waiting | trade, pvp (respond), leaderboard |
| 5 | **Profile** | A list: Name (typing), Account & sign-in, Privacy & data (deletion keeps its two-step confirm) | rename, claim, privacy |
| 6 | **Options** | A list: Controls (§9), How to play, Report a problem (F9's twin) | help |
| 7 | **Close** | For mouse and touch | — |

Monsters merges three screens: players think in nouns, not in which screen holds a verb.

**Social › Players** is a plain list (decided; c3 S4; kept as the only in-game way to find someone to walk up to): name, zone name, and a **Nearby** badge (same zone, ≤ `NEARBY_TILES` = 12 Manhattan — a `socialModel` presentation constant, not a game rule; nothing is gated on it). A on a row shows "Walk up to {name} and press A"; there is no remote action. Data comes from the already-public `character` subscription (`net/connection.ts:793`), so nothing new is disclosed, and Help's "nearby player" claim (B15) becomes true. There is no "In battle" badge: the `character` row carries no battle state and battles are private. The 8-way compass and distance text are deferred (§17): zone + Nearby is enough to find a friend, and the compass adds eight strings and a direction rule nobody asked for.

**Screens outside the menu:**
- **Dialogue:** bottom box, name plate, typewriter text, ▼; choices form a wrapping list. Picking Shop ends the talk and opens **Shop**.
- **Shop:** tabs Buy | Sell (opens on Buy) → quantity row → Yes/No (Buy Yes, Sell No). Y shows the description (new slot, "—" when empty). Balance in the title; feedback "✓ Bought 2 Bait (−40g)".
- **Heal:** A on the healer → "Heal party for N?" (Yes) at the *bound* location (fixes B13). Box's Heal Party button goes.
- **Trade-propose wizard**, from the face-to-face picker with the target pre-filled: Offer (A toggles ✓) → Coins → Ask → Review. LB/RB page, B steps back. Start abandons the draft.
- **Battle:** Fight / Recruit / Swap / Bag / Run, reset to Fight each turn. Fight is a 2-column skill grid with affinity, power, accuracy (R-rb-56). Recruit → bait list ("No bait" first) → Yes; Swap → bench; Bag → cures → target. Run disabled in PvP with a reason; "Waiting for {name}…" greys the list. `<select>`s become lists (B10). Outcome "▼": A or B continues.
- **Help** (Select): tabs This screen | All controls | Goals, generated from the hint-bar table.
- **Session:** system modal; Retry default; Continue as guest → confirm (No). B/Start inert, and the hint says so. Rendered inside the frame (B1/B3).
- **Error panel → toast** (world B or F8). The **evolution notice** becomes a prompt, A = OK.

**Confirm defaults:** **No** for irreversible actions (evolve, sell, declining or final-confirming a trade, deleting the account, declining a claim); **Yes** for harmless ones (heal, buy, recruit, sending a proposal). **Feed has no confirm** — picking the monster is the confirmation. B is always No.

**The required flow, press by press:**

| Press | Result |
|---|---|
| `Esc` (Start) | The main menu opens on Monsters (or the last entry). Hint: `[Enter] Open [⌫] Back [Esc] Close [R] Help` |
| `S` | The cursor moves to Bag. The screen reader says "Bag, 2 of 7" |
| `Enter` (A) | Bag opens full-frame with the breadcrumb "Menu › Bag". The menu stays underneath |
| `E` (RB) | The Food pocket. The cursor goes to the remembered item, else the first |
| `Enter`, `Enter` (Feed), `S`, `Enter` (monster) | "✓ Fed Emberkit". The picker closes and the cursor is on the berry |
| `⌫` (B) | Back to the menu, cursor on Bag. **The menu stays open** |
| `W`, `Enter` | Monsters opens on Party |
| `E`, `Enter`, `Enter` (Move to Party) | "✓ Moved to party" |
| `Esc` (Start) | **Everything closes**, back to the world (or to the battle screen if in battle). The next `W` walks |

`⌫ ⌫ ⌫` also exits level by level. B at the menu root closes the menu.

**Battle variant:** mid-turn, `Esc` opens the menu over the battle; `Enter` opens Monsters (read-only actions disabled); `Esc` returns to the battle screen with the command list intact and the stack equal to `[battle]` (e2e in `battle-dpad.spec.ts`, ctl-8j).

**Press counts for common tasks** (c3 S2). These assume a fresh nav memory, with the menu cursor on Monsters and Social on Players.

| Task | D-pad path | Presses | Accelerator | Presses |
|---|---|---|---|---|
| Open party | Esc, Enter | 2 | V | 1 |
| Open storage | Esc, Enter, E | 3 | B | 1 |
| Open bag | Esc, S, Enter | 3 | I | 1 |
| Check quests | Esc, S, S, Enter | 4 | J | 1 |
| Feed a monster | Esc, S, Enter, E, Enter, Enter, S, Enter | 8 | I, E, Enter, Enter, S, Enter | 6 |
| Talk / shop / heal | (face it) Enter | 1 | — | — |
| Respond to a trade or challenge | Y, Enter | 2 | U (or P), Enter, Enter | 3 |
| Offer a trade | (face the player) Enter, Enter | 2 | — | — |
| A battle turn | Enter, Enter (Fight is reset, the skill remembered) | 2 | — | — |
| Rename | Esc, W, W, W, Enter, Enter | 6 | N | 1 |

**Tests on the pure models:** every accelerator target (and Options › Report a problem, the F9 twin) is reachable from the world in **≤ 7** D-pad/A presses. This is a property over the menu tree and nav, and the worst case today is Social › Challenges at 7. The common-task table above is design guidance (principle 7), not a tested bound.

## 6. Navigation core rules (`ui/nav.ts`, pure)

- **Layouts:** `list(items) | grid(items, cols) | tabs([{key, layout}])`, `NavItem = {key, enabled, reason?}`. State stores the active **key**, never an index; on content change `navReconcile` keeps the key, else the nearest index (property test).
- **Wrap:** a fresh D-pad or LB/RB press **wraps** (lists top↔bottom, grids within row/column, tabs: RB on the last tab goes to the first, LB on the first to the last). Held auto-repeat is synthesized in the router `tick` on an injected clock (350 ms, then 100 ms) and **clamps** at the ends.
- **Disabled items** stay greyed but reachable; A prints the reason on the feedback line.
- **Memory** (session-scoped `NavMemory`): menu and screens remember entry, tab and item per tab; Social opens on the oldest waiting request's tab while a badge is pending (§4); Shop opens on Buy; battle root = Fight each turn; skills = last per monster per battle; Yes/No = declared default; pickers = last choice.
- **Active indicator:** exact styling is guidance; a non-colour visible mark is tested (CTL7A.3): ▶ in the gutter (a CSS pseudo-element), inverted band, 2 px frame (thick on grid cells); never colour alone (B18). The tested contract is the `is-active` class plus `aria-selected`.
- **ARIA** follows `menuView` (`ui/menuView.ts:150-205`): the nav container is the **single tab stop** with `aria-activedescendant`, so DOM focus never roves and re-renders cannot drop it (R-rb-121 class). Roles `listbox/option`, `grid/gridcell`, `tablist/tab`; stable ids `{frame}-{tab}-{key}`; `aria-selected`/`aria-disabled`; the container persists and rows diff. Active-descendant changes are **not** mirrored into `#a11y-live` (no double speech, W1).

## 7. World interaction

**Verified at `efd3f3a0`:** characters do not collide (`apply_move` checks terrain only); facing is server-authoritative and changes even on a bump; `talk` (`server-module/src/npc.rs:261-295`) requires the same zone and Manhattan ≤ `TALK_RANGE` (= 2) to the NPC's *current* character row; `heal_party` (`raising.rs:284`) checks the zone only; `propose_trade`/`challenge_pvp` have no proximity check; today's `nearestInteractable` (`ui/interactModel.ts:75`) picks the nearest NPC or healer within 2 tiles ignoring facing — the r2-024 defect.

**The target rule: in front, then own tile (operator answer, binding).** A new rule and a rewrite, not a port (c4). `game-core::interact_candidates(own: {x, y, facing, zone}, entities) -> Vec<usize>` (indices into the input; entities = NPCs at their character-row position, heal locations, other players). First non-empty tier wins:
1. **the faced tile**, `pos.step(facing)` (`TilePos::step`, `game-core/src/types.rs:44`);
2. **the own tile** (characters overlap).

**Nothing else is a candidate** — no nearest-within-range, no facing ray. Same zone only. Within the tile: kind (NPC < heal < player), then id. The rule reads the **authoritative** pose, as today.

**Export.** client-wasm adds `interact_candidates_coded(own_x: i32, own_y: i32, facing: u8, zone: u32, entities: JsValue) -> Result<JsValue, JsValue>` beside `talk_range()` (`client-wasm/src/lib.rs:235`): entities `[{kind, x, y, zone, id}]` deserialized with `serde_wasm_bindgen` (as `evolution_eligibility` does; client-wasm has no `serde_json`), `id` a decimal string compared numerically; out an array of input indices; no BigInt crosses (`M-postgate-console-controls.spec.md` CTL9.3). `nearestInteractable` shrinks to a marshalling adapter (no TS rule); its literal `keyGlyph: 'T'` (`interactModel.ts:135,166`) becomes a live-binding lookup in the T-retirement slice.

**Server acceptance.** Every target the rule offers is accepted: for `talk` the faced tile is distance 1 and the own tile 0, both ≤ `TALK_RANGE`, same zone by construction — and an NPC wandering one tile before the reducer runs is still ≤ 2; `heal_party` checks zone only; players have no server check. Tests: game-core — an NPC directly behind you, or two tiles ahead, is **not** a candidate; "characters overlap" pins the own-tile tier; a content test asserts every heal location and NPC home has a walkable 4-neighbour, so nothing becomes unreachable when the range tier goes.

**What A does:**

| Result | A |
|---|---|
| One candidate with a default (NPC → Talk; healer → Heal) | Runs it |
| Several candidates, or a player (no default) | Opens a **picker** of entity × action ("Rival — Trade") |
| None | Nothing, and no toast |

Y opens the same sheet for the primary candidate. A chip floats above it (`[Enter] Talk — Mira` / `[Enter] Choose…`), which teaches facing. Signs and objects (r2-026) can plug in later as a new entity kind (§17).

**Trade and challenge are face-to-face in the UI only (operator answer, binding).** The UI offers Trade/Challenge **only** via A or Y on a player you face (the picker); O is retired and no menu leaf initiates. Answering stays in Social (or Y on its notice). The server stays permissive: `propose_trade`/`challenge_pvp` untouched, no schema change, no bindings regen. `challenge_pvp` covers ranked; the existing TTL reaper cleans stale challenges. A server proximity guard is a **named deferral** (§17), not a decision.

## 8. Pointer and touch

**One dispatcher**, `input/pointerSource.ts`, is attached to `#game-screen`. It absorbs the `document` click delegate (`main.ts:2098`), so `[data-choice-idx]`, `[data-shop-id]` and `[data-menu-launcher]` become nav items or chips. There is no double dispatch. The `#help-hint` launcher moves *into* `#game-screen` (§10, §16), so nothing clickable is left outside the dispatcher.

| Input | World base | Frames open |
|---|---|---|
| Left-click / tap | **A**, only when `e.target` is the canvas. No coordinates are passed, so click-to-move and distant targets are impossible. Hint: "Click acts on what you face" | `click` on a `[data-nav-key]` in the **top** frame makes it active, then A. **Tab-strip tabs are nav items**, so a click switches the tab. A click anywhere else, including the canvas or a lower frame, is **ignored**: it is neither A nor B |
| Right-click | B (`contextmenu` suppressed on `#game-screen` only) | B |
| Touch long-press (≥ 500 ms, ≤ 10 px, fill ring) | B | B |
| Hover | — | Sets the active item only when the `pointermove` coordinates change. A key press hides the hover |
| Hint-bar chips | Buttons that press A/B/Start/Select or a context verb. This is the non-hold alternative (XAG 107) and fixes B12 | same |

Implementation:
- Use Pointer Events. Set `touch-action: none` on the canvas and `pan-y` on scroll bodies.
- `preventDefault` on touch `pointerdown`. This blocks synthesized mouse events and Android's `contextmenu`.
- B fires once (button 2, or a completed long-press).

**Out of scope:** gestures, touch walking, and pointer input outside the game screen (§17).

## 9. Remapping, help and hint bar

**Options › Controls:** tabs Buttons (12 rows) | Shortcuts (clickable), each row with Primary and Alt slots.
- **A captures** ("Press a key for Confirm (A)…"). Any key is accepted, Escape/Enter/Backspace included; reserved keys are refused with a reason.
- **Cancel by keyboard:** press the key the slot already holds (for an empty slot, the key in the row's other slot) — capture ends unchanged. Otherwise the Cancel chip or right-click. No idle timeout.
- "Reset all" asks Yes/No (default No), reachable by mouse. **Clear** exists on accelerator rows only (it unbinds the accelerator); button rows have no clear, and there is no per-row reset.
- **Conflicts swap** ("Swapped: F is now Info, K is now Confirm") across one namespace shared by buttons and accelerators. **Protected buttons** (D-pad, A, B, Start) always keep a key; a change that would empty one, swaps included, is refused. Capture uses real presses, so lock-out is impossible.

**Storage:** `input/bindingStore.ts` with plain `loadBindings(storage)` / `saveBindings(storage, b)` over an injected `Storage`; `localStorage['mr.controls'] = {v:1, buttons, accels}`, try/catch on every access; total `parseBindings(raw: unknown)` falls back per entry, an unknown `v` gives defaults; saves are immediate. M-gamepad decides how a `pad` entry joins; account sync is deferred (§17).

**Glyphs:** a **synchronous** `glyph(code)` (N5) reads the `e.key` learned per code or recorded at capture, else the catalog key name (AZERTY `KeyW` reads "Z" once pressed). `getLayoutMap()` is deferred (§17). The key-name table is a typed `Record<KeyCode, () => string>` of thunks over literal ids, so `t()`'s pinned signature (SHAPE-05) and the catalog-parity gates hold.

**Hint bar:** pure `hintBar(stack, bindings)` drives the bottom of `#game-screen` in every context. World: `[Esc] Menu [R] Help`, plus `[Enter] Talk` with a target, plus `[F] View [⌫] Dismiss` with a notice and no target. Chips are button-colour badge + live keycap + verb. The **Start chip replaces the `#help-hint` launcher** and carries the Social badge. Notices are exactly two kinds: a pending incoming request and the pending error.

**Help** is generated from the context table, bindings and catalog; `CONTROLS` and the English literals in `MENU_TREE` are deleted with their importers (B11). Options also carries **Report a problem**, the menu twin of F9. A first-run welcome card is deferred (§17).

## 10. Overlay frame and presentation

**`#game-screen`** wraps the canvas mount, the frame layer and the hint bar. Today `render/world.ts:72` appends the canvas to `#app` (`:66-67` only read `cssW`/`cssH`), and `#app` also parents the JS-built **battleView, boxView, raisingView, evolutionView**, self-styled `position:fixed; inset:0` at z 100/110. The page never scrolls (`overflow: hidden; 100dvh`).

**Every overlay becomes a class-styled `.mr-frame` inside `#game-screen`** (`styles.css` bans `#id` selectors, A11Y-12), closing S-overlay-anchor (HIGH, orphaned), B3 and r2-006/008/013/060/091. Inventory = the 17 `OverlayId` members (`ui/overlayRegistry.ts:34-57`) plus non-members: `battleView` → battle base; `boxView`/`raisingView`/`evolutionView` → Monsters; `dialogueView` → dialogue (server-owned); `questLogView` → Journal; `healView` → heal prompt; `shopView` → Shop; `tradeView`/`pvpView`/`leaderboardView` → Social tabs; `renameView` → Profile › Name; `tradeProposeView` → wizard; `helpView` → Help; `menuView` → `mainMenu`; `claimView` → Profile › Account (+ claim-on-failure); `privacyView` → Profile › Privacy; non-members `sessionView` → session gate, error panel → toast; new: Controls (`controlsView`, a new `OverlayId`). Bag reuses the `raisingView` root.

**Legacy root ids are a frozen seam:** each keeps its id and testids as the root of its frame or tab panel, `display:none` exactly when not shown (§16).

**`ui/frame.ts`, one chrome:** title bar (title, breadcrumb, tab strip with LB/RB glyphs); internally scrolling body; one feedback line (✓, !, spinner; never claims undelivered success, pgcc-a B7); the hint bar. Styling guidance, not a criterion: an original 9-slice pixel border in the storybook palette. Sizes: side panel, full, bottom box, small (prompt or sheet, anchored by its source). uxd1's FILL viewport is unchanged; a set-ratio box is deferred (§17).

## 11. Accessibility and i18n

- **M23 is adapted, not discarded.** Frames keep `role="dialog"`, labels and `aria-modal` via `OVERLAY_A11Y` (`dismissible` now means "B pops it"); `focusTrap` owns Tab.
- **Stacked modal frames (W1):** on push, the frame below becomes `inert` + `aria-hidden` and its trap is suspended; the pop restores both. A single pop returns focus to the parent frame's nav container; a multi-level pop to a base restores focus once, to the canvas.
- **`#a11y-live`** stays a `<body>` child in `index.html` (A11Y-10). `adoptLiveRegion` (`ui/liveRegion.ts:121-138`, via `overlayA11y.ts:131`) re-adopts it into the **top** frame on every push and pop and returns it to `<body>` at a base. It announces titles ("Enter to choose, Backspace to go back" for the first three), feedback, interrupts, remaps and banners.
- **Motor:** no required holds; two slots per button; WCAG 2.1.4 met (every accelerator rebindable, or unbindable via Clear); auto-repeat clamps. **Reduced motion** disables slides and the typewriter. The canvas stays `role="application"`; a manual NVDA pass runs before Playtest-3.
- **i18n:** every new string is an en/fr catalog id and `t()` throws on a missing one — verbs, titles, tabs, reasons, help rows, "Nearby", key names ("Entrée", "Espace", "Échap"). Ids reach `t()` only as literals; table-driven text is stored as thunks (`() => t('lit.id')`), so the DYNAMIC-KEY and DEAD-KEY gates hold. Glyph marks and button letters come from CSS on `data-` attributes or catalog glyph ids, never TS literals in a DOM sink (`hardcodedStrings` ceiling 0).
- **File names:** a new `ui/*View.ts` file must be a new `OverlayId` with an `OVERLAY_A11Y` entry (OR-MANIFEST-COMPLETE); helpers are `navRender.ts`, `frame.ts`, `hintBar.ts`.

## 12. Architecture, modules and controller readiness

**Pipeline:** sources map physical input through ONE binding table into source-agnostic `{button, down}` edges (`VButton`/`Accel`) → the pure **router** → the pure **contextStack** routes each edge to the top `ScreenAdapter.onButton(vm, nav, btn) → Command | consumed | unhandled` → `main.ts` runs an exhaustive `dispatch(command)` plus `applyStack(prev, next)` (`show`/`hide`, `open`/`closeOverlayA11y`).

**New modules:** `input/` (`buttons`, `bindings`, `bindingStore`, `router`, `keyboardSource`, `pointerSource`, `longPress`, `glyphs`); `ui/` (`nav`, `navRender`, `contextStack` + `SCREEN_POLICY` + `reconcile`, `frame`, `hintBarModel`/`hintBar`, `noticeModel`, `controlsModel`/`controlsView`, `socialModel`, `monstersModel`, `bagModel`, `screens/*` with one `legacyAdapter` and a total `SCREEN_ADAPTERS` record); game-core `interact_candidates`; client-wasm `interact_candidates_coded`. **The server module is unchanged.** Unchanged: `heldKeys`, `predictor`, `focusTrap`, `overlayA11y`. Shrinks: `overlayRegistry` keeps only `OverlayId` and `OVERLAY_A11Y`; `main.ts` loses the key ladder (`:1306-1708`), `KEY_DIR`, `targetOwnsKey`, `worldHasFocus`, the probe/handle tables, `activateMenuLeaf` and the Escape stack.

**Tests** (testing-tdd.md: colocated, one e2e per flow, no source-text scans). Vitest + fast-check over the pure cores: bindings invariants; router refcount/repeat/ownership (Jump fires once; Space on a focused chip is not consumed); nav reconcile; the required flow; dialogue suspend and silent drop; reconcile idempotence; press-count bounds (§5); interact-rule cases (§7). Ownership and key-name tests feed events and assert outcomes, never grep keymaps. New e2e: `menu-flow`, `remap`, `pointer`, D-pad-only battle, `respond-request` (Y, Enter), movement (hold W → Start → close gives no step; Ctrl+P not prevented). A `pressButton`/`pressAccel` helper reads `DEFAULT_BINDINGS`.

**Controller readiness.** `M-gamepad.spec.md` owns the pad design (W3C map, `stickToDpad`, pad glyphs). Because the router consumes only `{button, down}` edges (tested with a fake non-keyboard source, CTL1.5), a pad is one more source; nothing else changes. Steam Input (M21b-3) maps onto the same buttons.

**Migration constraints for the slice plan:**
1. **Strangler:** every slice merges green and playable.
2. **One owner per key at every boundary.** The first router slice owns only the D-pad and Space. Until the accelerator slice, LB/RB come only from PageUp/PageDown. Q/E→LB/RB, Q→J and E→V land in **one** slice (ctl-11a). Each legacy letter retires with its replacement (T with the live-glyph chip).
3. **Stack before screens:** `contextStack` + `reconcile` land behind the existing show/hide before the Escape-ladder swap; order stack → nav/menu → Start/B routing.
4. **Frame anchoring before per-screen D-pad.** Anchoring (ctl-7a) and re-parenting the `#app` children under `#game-screen` (ctl-7b) keep render-loop and e2e-hook continuity (W5). Adapters start in legacy DOM-button mode, then convert in a serial chain ordered by consumers (they all append to the catalogs). Never combine the stack swap with screen work.
5. **Replace first, delete second** (testing-tdd.md:90-109); survivors are named in §16.
6. **Sequencing:** pgcc-a runs FIRST (`after: []`), before ctl-1; its feedback core is what the screen adapters later call. `main.ts` then serializes the router, stack-swap and interact slices. pgcc-c runs `after: [pgcc-a, ctl-15]` and pgcc-d `after: [pgcc-c]`; pgcc-d owns the `vite.config.ts` "KNOWN FOLLOW-UP" comment rewrite. **pgcc-b is superseded**; pgcc-c C3/C4 and pgcc-d D3/D5 are re-keyed here; M25 S1 is sequenced against the wizard and face-to-face slices only (no `trading.rs` collision without a guard).

## 13. Decisions overturned or amended (`docs/DECISIONS.md` titles)

Only entries that meet the bar are recorded (c4 N1).

| Entry | Action | Why |
|---|---|---|
| **"Client UI: one overlay registry, keyboard first"** | **Superseded in place** by **"Client UI: virtual buttons, one context stack, one overlay frame"**. **Drops:** hotkeys as primary, a hotkey-only discovery menu (`M` stays a Start alias), the `CONTROLS` SSOT, `T`, overlay tiers. **Carries forward** the old Why (dialogue desync, testable pure models, total catalog) and Rules-out (colour alone, WAAPI, hard-coded strings, key/`en` fallback). **Keeps:** pure models/thin views, guard-never-dismiss (server frames reconciled; dialogue never closed client-side), `OVERLAY_A11Y`, `A11Y_TOKENS`, no WAAPI, the total catalog. **Folds in the bindings:** per-browser localStorage v1, protected buttons; a pad source (M-gamepad) and account sync addable later. This reverses M23's remap cut (`specs/monster-realm-v2/archive/M23-accessibility.spec.md:335`) | The operator inverts primacy; r2-023 was mis-dispositioned |
| **"Held keys: commit threshold and warp continuity"** | **Rewritten in place** (no chained "Amended" block): virtual D-pad refcount; `held.clear()` on every frame push (replaces "text-input overlays clear…"); a held direction does **not** resume after a frame closes (reverses the `main.ts:3204` behaviour); router-synthesized menu repeat; OS repeat still drives nothing | No ghost walks or stale hold stamps |
| **New: "Interaction target: the tile in front, then your own tile"** | One game-core rule. No range tier, even though `talk` accepts up to `TALK_RANGE` = 2. The server range is a latency margin, not a reach | Not code-evident: the narrower client rule looks like a mismatch someone would "fix". The reason is operator intent (r2-024) |
| **"Integer pixel scaling"** | **Corrected in place (substantive):** integer *device* scale; the CSS stage scale is fractional (`render/viewport.ts`); Rules-out becomes "Fractional device scales" | The entry misstates the shipped renderer (C7) |

"Bounded client prediction" is unchanged. No entry for face-to-face trading (UI routing, code-evident); the server guard is a deferral.

**Specs and process:**
- uxd3's hide-on-pick / one-press-to-world is reversed, and so are uxd1's window-anchored overlays.
- pgcc-b is superseded.
- Re-dispose r2-006–009/016/023–026/035/060/091. r2-088/090 are deferred (§17).
- Put the milestone ahead of Playtest-3 in PLAN §9, and add a Gamepad placeholder.
- File B1–B18 as cleanup.

## 14. Defaults adopted (operator may override)

1. **Start in battle opens the main menu**, read-only, with the PvP timer running. This follows the brief's "returning … to the battle screen". *Adopted: yes.* The alternative is that Start does nothing in battle, as in Pokémon. *Last safe override point:* before ctl-6c (ctl-6b already leaves Start inert on an ongoing battle).
2. **A second default key for B?** Backspace is unconventional on PC. *Adopted: none*; the hint bar always shows `⌫`. Never Escape (it is Start) and never keyboard X. *Last safe override point:* before ctl-12.
3. **Merge Box/Raising/Evolution into Monsters with one action sheet.** *Adopted: merge.* The alternative is Party | Storage | Evolve tabs. *Last safe override point:* before ctl-5 (the menu IA).

(The v1 server-guard question is answered.)

## 15. Changes from the operator's sketch (each justified)

| Sketch | This design | Reason |
|---|---|---|
| Tab = Select | Select = **R**, alias the `Slash` key | Operator: Tab stays for focus. R sits next to the bumpers |
| Y unassigned | Y = **F**, "More/Info"; in the world with no target, it opens the top notice | One meaning everywhere. It gives a 2-press D-pad path for answering requests |
| Base keymap | Plus aliases: arrows, M, PageUp/PageDown, NumpadEnter | Additive. M is the fullscreen-Esc fallback |
| Esc / Enter / Backspace = Start / A / B | In typing mode the field owns them (Escape stops typing, Enter commits) | Text entry is otherwise impossible; fixes B5 |
| B = back or alternate | Alternate only where §2 lists it. In the world, "alternate" is B-dismiss + Y-More | Predictable. A target has one obvious action (A), and the rest live under Y |
| Wrap at the ends | Wrap on a fresh press, clamp on auto-repeat | No overshoot while held |
| Click in world = A | A on the in-front/own-tile target, never on the clicked spot | "What's in front" |
| Right-click / long-press = B | Plus tappable chips for A, B, Start and Select | A non-hold alternative; fixes B12 |
| Hotkeys stay | Kept, except Q→J and E→V; T and O are retired | Bumper collision; face-to-face initiation |
| (not specified) | Press again to walk after closing a menu | Prevents ghost walks |
| (not specified) | Disabled items stay reachable, with reasons | Accessibility and teaching |
| (d1 proposal, rejected) | Space never doubles as A | The operator mapped Space to X |

## 16. Migration & test impact

Enumerated so the slice plan names a replacement before deleting anything. Sites are `client/e2e/*.spec.ts` lines at `efd3f3a0`.

**Retired or moved keys pressed by e2e:**

| Press | Sites | Replacement |
|---|---|---|
| `KeyT` (interact) | dialogue:188, shop-npc:293, shop-npc:370, wallet-balance:350 | `pressButton('A')` while facing the NPC; check that each fixture *faces* its NPC, because the range tier is gone |
| `KeyO` (remote offer) | trade-propose:210 | Walk A beside B and face B (dev positioning via `__game`, or scripted steps), then A → picker → Trade |
| `KeyQ` (journal) | dialogue:397, wallet-balance:657, wallet-balance:925, trade.spec:200 | `pressAccel('J')` |
| `KeyE` (evolve) | evolution:170 | `pressAccel('V')`, then monster sheet → Evolve |
| `Shift+Slash` (help) | a11y:264 | `pressButton('Select')` (Shift+Slash still resolves; the assertion on help contents changes) |
| `KeyM` (menu) | a11y:272, a11y:301 | Still opens the menu (Start alias). Assertions on the uxd3 menu tree change to the main-menu entries |

**Escape now means Start**, so at the world base it **opens** the menu (and in battle, the menu over the battle). Prophylactic "dismiss any stale overlay" presses would leave a menu open — rename:220, pvp-side-b:202, trade-propose:208, and those in pvp, ranked-forfeit, monster-privacy, recruit, encounter-battle, evolution, dialogue, a11y, trade, wallet-balance; each is audited and replaced by a shared `closeAll()` helper that presses Start only when `__game().stack` (new, additive) is above the base. In-battle Escape presses (encounter-battle:305/311, recruit:296 on) are checked against §14 default 1.

**UI-driven sites that do change** (corrected 2026-10-01): pvp-side-b:313, ranked-forfeit:287 and monster-privacy:467 click `pvp-challenge-player-btn` (removed with remote initiation, ctl-10b) and their B side waits for `pvp-accept-btn` through the auto-show (pvp-side-b:334, ranked-forfeit:313, monster-privacy:484; removed by the banner rule, ctl-13); they move to face-to-face positioning or the `__mrPvp` hook, and Y→Enter. recruit's `healViaBox` (≈270-415, 781-787, 861-862) clicks Box "Heal Party" and moves to the bound healer when that button goes (ctl-10a). shop-npc:350 asserts the prompt glyph "T". `elder_oak` wanders (`wander_radius: 2`), so A-facing e2e helpers re-face and retry. evolution:193 (KeyI → raising Care) moves to the Monsters sheet (ctl-8c). The mutual-exclusivity cases (pvp.spec:108/136/161, trade.spec:119, 190-205) are rewritten when accelerators replace the open screen (ctl-11a).

**Unaffected:** genuinely hook-driven `proposeTrade`/`challengePvp` calls in trade-full, trade-propose, trade-interlock, trade-zz-negative, trade.spec, pvp-full, pvp.spec, wallet-balance and `evals/account-e2e.eval.mjs:1761,1805,1807` — no server guard, so no positioning; `pvp_tests.rs`/`trading_tests.rs` fixtures untouched (c4 B-1 moot). `KeyB` presses (movement-input:503,568; recruit; evolution; encounter-battle) — the accelerator is kept.

**Frozen seams:**
- **Overlay root ids, `data-testid`s and the `display:none` visibility contract** (c4 counts 161 `#id` selector refs across 10 e2e files). Legacy roots survive as frame or tab-panel roots (§10).
- **Dev hooks** `__game`, `__mrTrade`, `__mrPvp` (`main.ts:2377-2379`); the `__game` snapshot grows additively only (`stack`, `navActive`).
- **`index.html`/`styles.css`:** A11Y-12 (class-styled frames); A11Y-10 (`#a11y-live` a body child, adoption restated in §11). **`#help-hint`** (`index.html:135-142`; fixed; `data-menu-launcher`; "Press ? for help · click or M for menu") is **deleted** — the hint-bar Start chip replaces it and its `held.clear()` at `main.ts:2139/2141` (a push clears). **W-ONE-CORNER-AFFORDANCE** (`ui/menuView.test.ts`, allows only `{build-stamp, help-hint}`) is rewritten by name to `{build-stamp}` + the in-frame hint bar, replace-first. The `buildAppShellFromRealIndexHtml` fixtures (`main.feedbackI18n`, `main.privacyWiring`, `main.a11yFocus`, `main.exportTransport`, `main.partyFull` tests) update in the slice that changes `index.html`.

**Named survivors:** dialogue desync → reconcile test + dialogue e2e; S5T focus no-steal/return → stack focus test; force-hide tiers → `SCREEN_POLICY` reconcile tests; privacy → Profile › Privacy e2e; `movement-input` test C → hold-through-menu test. The vacuous `trade.spec.ts:195,205` g/h presses are deleted by name. **Unit tests rewritten:** `interactModel` → adapter + game-core rule tests; `overlayRegistry` tiers → `SCREEN_POLICY`; `helpView`/`MENU_TREE` → generated help; SHAPE-05 stays green.

**Build:** client-wasm build and any wasm `.d.ts` baseline are refreshed; no SpacetimeDB bindings regeneration (no schema or reducer change).

## 17. Named deferrals

Each `R-ctl-*` is a row in the residual registry (`memory/projects/mr-residuals.jsonl`, unpromoted, target backlog), not a `residuals.spec.md` section.

| Deferred | Target |
|---|---|
| Gamepad support; Steam Input | **M-gamepad** (`M-gamepad.spec.md`, PLAN §9); Steam Input in M21b-3 |
| Server proximity guard on `propose_trade`/`challenge_pvp` | → residual R-ctl-PROXGUARD (backlog [security-privacy/LOW]). Carries c4 B-1's requirements: pure game-core `within_interact_range`; character via `p.entity_id` as in `talk`; placed after joined/`require_not_deleting`/counterparty-joined checks; fixtures seed co-located characters; one uniform error (no zone oracle); lands after the client face-to-face UI |
| Players compass and distance text | → residual R-ctl-COMPASS (backlog [ux-a11y/LOW]) |
| Touch walking, swipes and gestures | → residual R-ctl-TOUCHWALK (backlog [ux-a11y/LOW]) |
| Account sync of bindings | → residual R-ctl-BINDSYNC (backlog [ux-a11y/LOW]), target the M21b account/platform follow-on |
| Set-ratio game box (r2-010/047-050) | → residual R-ctl-SETRATIO (backlog [ux-a11y/LOW]) |
| Signs and objects as interactables (r2-026) | → residual R-ctl-OBJINTERACT (backlog [content/LOW]). The plug point is a new `interact_candidates` entity kind |
| Walk speed / hold-to-run (r2-088/090) | → residual R-ctl-RUN (backlog [gameplay/LOW]). A hold is free for it |
| First-run welcome card | → residual R-ctl-WELCOME (backlog [ux-a11y/LOW]) |
| `getLayoutMap()` keycap glyphs | → residual R-ctl-LAYOUTMAP (backlog [ux-a11y/LOW]) |
| Counter-style reach (a facing ray beyond one tile) | Backlog, only if content needs it. The §7 content test guards today's maps |
| PixiJS `AccessibilitySystem` | Stays dormant per M23 until a canvas-interactive feature exists |

## Changelog from v1

- **Operator answers:** front→own-tile rule, no third tier (§7; c3 M1); face-to-face UI only, server guard removed, now a deferral (§7, §13, §17; c3 M2, c4 B-1 moot); v1 Q2 closed, questions renumbered (§14); Players = zone + Nearby list, compass deferred (§5; c3 S4).
- **c3:** world Y opens the top notice + Social opens on the oldest waiting tab (§2, §4; M3); world-B lock dropped (§2, §15; S1); press-count table + bounds, adapted to +4 for common tasks and ≤7 for every accelerator (§5; S2); Feed confirm removed (§5; S3); pointer edge cases + capture keyboard cancel (§8, §9; S5); Start in a battle sub-list (§4; N1); V → Party (§3; N2); key-vs-button names (§3; N3); principle 7.
- **c4:** §16 migration list (B-2); `#help-hint` → Start chip, live-region re-adoption, index.html/test contracts (§8–§11, §16; B-3); stacked-frame inert/focus/no double speech (§11; W1); silent suspended-dialogue drop (§4; W2); `movementEnabled` at all sites + gate, Ctrl/Alt/Meta marked new (§3, §4; W3); Slash alias/AZERTY (§3; W4); `#app` re-parenting slice (§10, §12; W5); dev hooks frozen (§16; W6); behavioural tests, typed key-name Record (§9, §12; W7); decisions minimized (§13; N1); no bindings regen (§16; N2); JSON wasm export (§7; N3); ranked/TTL (§7; N4); sync glyph cache (§9; N5); citations fixed (`world.ts:72`, `boxView.ts:278`, overlay inventory by `OverlayId`, M23:335 verified); c4 risks 2–6 folded in.
- **New:** §16, §17.
- **Spec review (2026-10-01):** §14 defaults adopted with override points; Players keeps a minimal list, no "In battle" badge; cuts: `armMs`, wizard draft persistence, shop ±10, the ▶ bob, `BindingSource`, `getLayoutMap`, remap idle timeout and X-clear/Y-reset, the dead-key pulse, and the welcome card (now a §17 residual, as is `getLayoutMap`); notices narrowed to a pending request and the pending error; storage `{v:1, buttons, accels}`; router takes `{button, down}` edges and the pad map lives only in M-gamepad; i18n thunk and file-naming rules (§11); battle variant of the flow (§5); F9 twin in Options; §16 corrected for the UI-driven pvp sites; pgcc-a first, pgcc-c/d after ctl-15 (§12).
