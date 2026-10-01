# Spec: M-postgate-console-controls — virtual buttons, one context stack, D-pad menus

**Status:** specced 2026-10-01 · build-ready once the operator accepts the three §14 defaults listed under Risks · **Project:** monster-realm. Mostly client work, plus one game-core rule with its client-wasm export (ctl-9) and one behaviour-only server slice (ctl-16) · **Surveyed against:** monster-realm master `efd3f3a0`. Line numbers are `@efd3f3a0` and will drift, so treat the cited symbol as the anchor · **Depends on:** nothing open. pgcc-a is ordered first (see "Interaction with other roadmap work") · **Design SSOT:** `specs/monster-realm-v2/console-controls-design.md` (round-2 synthesis). Section references like "design §N" point there · **Operator intent:** `specs/monster-realm-v2/operator-feedback-2026-10-01-controls.md` · **Doctrine:** `standards/testing-tdd.md` (verification SSOT), `standards/spec-driven.md`.

## Problem / intent

The operator's directive of 2026-10-01 (the operator-feedback artifact above) asks for a primary interface modelled on a handheld console. Its main points:
- A virtual D-pad plus a small closed set of contextual buttons is the primary interface: A, B, X, Y, LB, RB, Start and Select. Letter hotkeys become optional, remappable accelerators.
- The same physical keys change meaning with context. They walk in the world and navigate in menus.
- A game-style highlight marks the active item. There is no mouse-like cursor.
- Start opens the main menu and also exits *all* menus, back to the world or to the battle screen. B goes back one level, or performs the "alternate" interaction.
- Players can remap the controls, and the layout is saved per browser.
- Left-click or tap acts as A: in the world it acts on what the character faces, and in a menu it acts on the clicked element. Right-click or long-press acts as B.
- The design must make a later controller milestone a small additive change.

The operator gave a concrete acceptance flow: open the main menu → enter a submenu and pick something → back out → enter a different submenu and act → exit to the world.

Today's client cannot run that flow:
- `client/src/main.ts` holds a 13-branch letter-hotkey ladder (≈1306-1708) and a 15-branch Escape stack (≈1571-1684).
- The uxd3 menu hides itself before routing a leaf (`activateMenuLeaf`, ≈802), so the player cannot back out into it.
- Nine overlay shells render in-flow below the canvas, with black text on a near-black background (S-overlay-anchor, HIGH, orphaned; NEW-1).
- Interaction ignores facing: `nearestInteractable` picks the nearest target within 2 tiles.
- Trade and challenge can be started from anywhere on the map.

**This is a mis-disposition, not a new idea.** Playtest item `r2-2026-07-26-023` asked for "a few standard contextual buttons (GBA: A, B, LB, RB, Start, Select, D-pad)". It was DISPOSED → uxd2 with the ledger note "extend enum to close the full ask". Only the single `T` key was ever built, and the extension never happened. Related items were also closed without their criteria:
- r2-016 and r2-035 went to uxd3, which has no criteria for them.
- r2-024, r2-025 and r2-026 went to uxd2, which only partially covered them.
- r2-006–009, 013, 014, 060 and 091 went to uxd3, but the overlays were never anchored.

The recorded decision "Client UI: one overlay registry, keyboard first" (game `docs/DECISIONS.md`) wrote down the opposite of the operator's intent. This milestone supersedes that decision in place (ctl-14).

**Intent:** build design §1–§16 as a strangler sequence. Every slice merges green and leaves the game playable. The milestone ends with:
- the operator's flow working by keyboard alone and by mouse alone;
- every overlay rendered as a frame inside one game screen;
- help and hints generated from the live bindings;
- the cleanup bugs below fixed.

## Scope

**In:**
- **Input pipeline:** virtual buttons, one binding table, the pure router, the keyboard source and the pointer source.
- **Navigation model:** the context stack with `SCREEN_POLICY` and `reconcile`, the nav core, the frame chrome, and the main-menu IA.
- **Screens:** every per-screen D-pad adapter (design §5, §10).
- **World interaction:** the "in front, then own tile" interaction rule in game-core plus its wasm export; world A and Y; face-to-face trade and challenge in the UI.
- **Controls UI:** Options › Controls remapping with localStorage persistence; the generated hint bar and Help; notices and banners; the welcome card.
- **Docs:** the three DECISIONS.md entries (§"Decision drafts") and the ARCHITECTURE.md UI rewrite.
- **Cleanup:** every CONFIRMED bug in the coverage table, including the NEW-2 server guards.

**Named deferrals** (declared, not dropped; from design §17):

| Deferred | Target |
|---|---|
| Gamepad support (the readiness list under "What M-gamepad consumes") | **M-gamepad**, a pre-release placeholder added to PLAN §9 by this spec's PR |
| Steam Input | M21b-3 |
| Server proximity guard on `propose_trade`/`challenge_pvp` | `residuals.spec.md`; revisit after Playtest-3 or with M25. Carries the c4 B-1 requirements: a pure game-core `within_interact_range`; the character looked up via `p.entity_id` as `talk` does; the guard placed after the joined, `require_not_deleting` and counterparty-joined checks; fixtures that seed co-located characters; one uniform error with no zone oracle; it lands after the face-to-face UI (ctl-10) |
| Players compass and distance text | `residuals.spec.md`, with the guard above or if Playtest-3 shows friends are hard to find |
| Touch walking, swipes, gestures | `residuals.spec.md`, for a future mobile/touch milestone |
| Account sync of bindings | The M21b account/platform follow-on (an additive `BindingSource`) |
| Set-ratio game box (r2-010/047-050) | `residuals.spec.md` presentation backlog |
| Signs and objects as interactables (r2-026) | A content milestone; the plug point is a new `interact_candidates` entity kind |
| Walk speed / hold-to-run (r2-088/090) | Backlog. A hold, or a free binding, is reserved for it |
| Counter-style reach (a facing ray beyond one tile) | Backlog, only if content needs it. The ctl-9 content test guards today's maps |
| PixiJS `AccessibilitySystem` | Stays dormant per M23 until a canvas-interactive feature exists |

**Non-goals** (untestable fences):
- No schema change, no reducer signature change, and no SpacetimeDB bindings regeneration.
- No change to the predictor, interpolation, slide clock or reconcile snapshot.
- No new `evals/` files.
- No visual redesign beyond the frame chrome and nav indicator in design §6/§10.
- No server-side change to trade or challenge reachability (the UI is face-to-face only).
- No remote action from Social › Players.

## Milestone-wide acceptance rules

These rules apply to every slice. The tester encodes them per slice.

- **Pure cores, thin shells.** Every new decision lives in a pure module with no DOM, SDK, module state or wall clock; time is an injected clock. Each module is tested by colocated vitest (`x.test.ts`). Use table cases, and use fast-check only where the input space is genuinely combinatorial: binding invariants, router refcount and ownership, `navReconcile`, `reconcile` idempotence, and press-count bounds. Views stay thin, and their DOM tests run in jsdom.
- **One e2e per user flow** (never one per criterion). The new or rewritten flows and their homes:

  | Flow | Home | Slice |
  |---|---|---|
  | Movement hold-through-menu (hold W, open a menu, close it: no step; Ctrl+P is not prevented) | `client/e2e/movement-input.spec.ts` | ctl-1, ctl-2 |
  | D-pad-only battle | NEW `client/e2e/battle-dpad.spec.ts` | ctl-8f |
  | Typing (rename opens already typing; Escape stops typing; Enter commits) | `client/e2e/rename.spec.ts` | ctl-8d |
  | The operator's menu flow, keyboard only | NEW `client/e2e/menu-flow.spec.ts` | ctl-11 |
  | Remap | NEW `client/e2e/remap.spec.ts` | ctl-12 |
  | Respond to a request (Y, Enter) | NEW `client/e2e/respond-request.spec.ts` | ctl-13 |
  | The operator's menu flow, mouse only, plus right-click = B | NEW `client/e2e/pointer.spec.ts` | ctl-15 |

  - E2e presses go through the shared helper `client/e2e/controls.ts`, created in ctl-6: `pressButton`, `pressAccel` and `closeAll`. The helper reads `DEFAULT_BINDINGS`.
- **No forbidden check shapes.** No source-text scans, no greps of keymaps, no coverage or mutation thresholds, no checks of checks, and no eval files. Key-name and ownership tests feed events and assert outcomes.
- **Existing tests pass unmodified**, except tests a slice's criteria name as intentionally changed. A test may be deleted only under `testing-tdd.md` "Deleting a check": the slice names the reason and the surviving check by path and test name, the replacement lands first, and it is watched failing on the real defect.
- **Named survivors** (design §16):

  | Retired check | Survivor |
  |---|---|
  | Dialogue desync | ctl-3 reconcile tests + `dialogue.spec.ts` |
  | S5T focus no-steal/return | The ctl-5/ctl-11 stack focus tests |
  | Force-hide tiers | `SCREEN_POLICY` reconcile tests (ctl-3) |
  | Privacy flow | The Profile › Privacy flow in `monster-privacy.spec.ts` |
  | `movement-input` test C | The hold-through-menu test (ctl-2) |
  | The vacuous `trade.spec.ts:195,205` g/h presses | Deleted by name (ctl-11) |
  | `interactModel` rule tests | The game-core rule tests (ctl-9) + adapter tests (ctl-10) |
  | `overlayRegistry` tier tests | `SCREEN_POLICY` tests |
  | `helpView`/`MENU_TREE` tests | Generated-help tests (ctl-14) |

  SHAPE-05 (`t()`'s pinned signature) stays green throughout.
- **Frozen seams:**
  - Legacy overlay root ids, `data-testid`s and the `display:none` visibility contract survive. Each legacy root becomes the root of a frame, tab panel or sheet.
  - Dev hooks `__game`, `__mrTrade` and `__mrPvp` (`main.ts` ≈2377-2379) stay unchanged. `__game()` grows only additively, gaining `stack` (ctl-2) and `navActive` (ctl-5).
  - `styles.css` stays class and `:root` only (A11Y-12). `#a11y-live` stays a `<body>` child in `index.html` (A11Y-10); its adoption into the top frame is restated in ctl-5.
  - `data-choice-idx`, `data-shop-id` and `data-menu-launcher` stay on their elements until ctl-15 absorbs the document click delegate.
- **Strangler.** Master is green, and the game is playable end-to-end by keyboard, after every slice. Each legacy key retires in the same slice as its replacement, so every key has exactly one owner at every slice boundary.
- **i18n.** Every new player-visible string is a catalog id in both `catalog.en.ts` and `catalog.fr.ts` (plus `messageIds.ts`). `t()` throws on a missing id, and `catalogParity` and `catalogShape` stay green. Button letters stay symbols. Key names are a typed `Record<KeyCode, PlainMessageId>` with no template-literal keys.
- **Smoothness contract preserved.**
  - The D-pad feeds the existing `step()` and `held` seam. `HOLD_COMMIT_MS` and the frame-loop re-issue rule are unchanged.
  - `main.boot` BOOT-MOVE / 14R-E and `movement-input.spec.ts` pass unmodified, except the named test-C replacement.
- **`main.ts` is a serialization point.** Slices that touch it are chained with `after:`. This applies to ctl-1, 2, 3, 5, 6, 7, 10, 11, 12, 13, 14 and 15. ctl-4, ctl-8a–8h, ctl-9 and ctl-16 never touch it.
- **Fan-out shared files.** `client/src/ui/i18n/catalog.en.ts`, `catalog.fr.ts`, `messageIds.ts` and `client/src/styles.css` are append-only shared touches for the ctl-8 siblings. Each sibling appends under its own namespace, and the second to merge rebases. If the supervisor's fan-out eligibility treats any shared path as overlap, run the siblings serially in letter order.
- **Do not edit `main.ts` from a fan-out slice.** Per-screen slices change only their own `client/src/ui/screens/<name>Screen.ts`, their model/view files and their e2e. If a per-screen slice discovers it needs a new `Command` arm or other `main.ts` wiring, that is a hidden dependency: stop and surface it, as the build loop requires.

## Slices

Each criterion is an id-led bullet (`**CTL1.1:**` …) with the SHALL in its lead sentence, so `mr-gates init` seeds one gate per id. Sub-bullets carry detail only. Evidence bullets carry no criteria.

### ctl-1 — input foundation: virtual buttons, one binding table, router owns the D-pad and Space
category: input architecture + gameplay defect · severity: MED · size: MODERATE
touches: client/src/input/buttons.ts, client/src/input/bindings.ts, client/src/input/bindings.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/input/keyboardSource.ts, client/src/input/keyboardSource.test.ts, client/src/main.ts, client/src/main.input.test.ts, client/e2e/movement-input.spec.ts
after: []
- Evidence @efd3f3a0: `KEY_DIR` (main.ts ≈1230) maps W and ArrowUp to North. `HeldDirections.press` is a no-op for an already-held direction, and `release(dir)` filters by direction (`prediction/heldKeys.ts:57-70`). The keyup at main.ts ≈1711 therefore stops a held W when ArrowUp is released.
- Evidence: `main.ts` checks no `ctrlKey`/`altKey`/`metaKey`, and every hotkey calls `preventDefault`. Ctrl+P opens the PvP overlay and swallows the browser's print (r2-035).
- Intent (design §3, §12; migration rule 2): the router replaces the ladder's movement and Space steps (≈1686-1708) **at the same position in the ladder**. The session gate, `e.repeat`, the focus heal, F8/F9, the menu intercept and the letter hotkeys still run first, unchanged. Every other key falls through to the legacy ladder.
- Boy Scout: correct the stale `main.wiring.test.ts` citations at main.ts ≈199 and ≈1309 (part of B16).

- **CTL1.1:** WHEN a key event arrives, THE SYSTEM SHALL resolve it to virtual-button edges by `e.code` through one binding table (`DEFAULT_BINDINGS`).
  - The table holds the full design §3 default keymap and aliases.
  - Shift and letter case are ignored.
  - In this slice the router consumes only D-pad edges (W/A/S/D, arrows) and X (Space).

- **CTL1.2:** WHEN two physical keys bound to the same direction are held and one is released, THE SYSTEM SHALL keep that direction held until the last bound key is released.
  - Red: hold W, press and release ArrowUp. Today the character stops (main.ts ≈1711).

- **CTL1.3:** WHEN Space is pressed with the world focused and no overlay open, THE SYSTEM SHALL send exactly one Jump intent.
  - When a native `<button>` reached by Tab has focus, Space is neither consumed nor turned into a jump.
  - `main.a11yFocus` S5T-SPACE-BUTTON and S5T-SPACE-WORLD pass unmodified.

- **CTL1.4:** WHEN Ctrl, Alt or Meta is held with any key, THE SYSTEM SHALL leave the event to the browser untouched.
  - No `preventDefault`, no hotkey, no movement.
  - Red: a booted test in `main.input.test.ts` presses Ctrl+P. Today it opens the PvP overlay and is `defaultPrevented`.

- **CTL1.5:** WHILE an IME composition is active (`isComposing`, or keyCode 229), THE SYSTEM SHALL route no edge.

- **CTL1.6:** WHEN the router consumes an edge, THE SYSTEM SHALL call `preventDefault` for that event and for no unconsumed event.

- **CTL1.7:** WHEN a D-pad edge reaches the world, THE SYSTEM SHALL keep today's movement semantics.
  - `e.repeat` is ignored.
  - The `held.isHeld` dedupe stays.
  - One immediate `step()` is followed by `held.press(dir, now)`.
  - `blur` and `visibilitychange: hidden` release every virtual button. `visibilitychange` is new.
  - `movement-input.spec.ts` gains the W/ArrowUp refcount case and a Ctrl+P not-prevented case. Its existing cases pass unmodified.

### ctl-2 — context stack behind the existing show/hide; one movement gate; push clears held keys
category: input architecture + gameplay defect · severity: MED · size: MODERATE
touches: client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/main.input.test.ts, client/e2e/movement-input.spec.ts
after: [ctl-1]
- Evidence: `anyOverlayVisible()` gates movement at main.ts ≈1114 (divergence snap), ≈3211 (frame-loop re-issue), ≈3270 (`overlayUp`) and in the ladder (≈1686). The session gate is a separate check (≈455-461).
- Evidence: B17. Escape on an `Ongoing` battle hides `battleView` (≈1592-1600). Until the next batch, movement is live mid-battle, the server rejects the steps, and the character rubber-bands back.
- Evidence: B14. Of the hotkey open paths, only N/O/?/M/C call `held.clear()`.
- Intent (design §4, migration rule 3): the stack lands *behind* the legacy show/hide paths and mirrors them. No key routing changes in this slice.

- **CTL2.1:** THE SYSTEM SHALL represent UI state as a pure stack of frames over a `world` or `battle` base, with a pure `contextStep(stack, edge) → {stack, commands}`.
  - The frame union is `world | battle(id) | screen(id, nav) | prompt(id, nav) | textEntry(owner)`.
  - `SCREEN_POLICY` is a total `Record<FrameId, {owner, onBattle, battleSafe, armMs}>`, so an omitted frame id fails `client-typecheck`.

- **CTL2.2:** WHEN any legacy overlay opens or closes through its existing path, THE SYSTEM SHALL push or pop the matching frame, so that `__game().stack` reports the live frames.
  - The `stack` field is additive.
  - Every existing overlay behaviour is unchanged.

- **CTL2.3:** THE SYSTEM SHALL gate movement through one pure `movementEnabled(stack, sessionGate)`, which replaces every `anyOverlayVisible()` movement use: the ≈1114 snap, the ≈3211 re-issue, the ≈3270 `overlayUp`, and the ladder suppression.
  - The gate is false whenever the stack holds a `battle` base, even while `battleView` is hidden.
  - A D-pad press under a non-world frame never reaches `HeldDirections`.
  - Red: B17. Start a wild battle, press Escape, press W. Today the character predicts a step.

- **CTL2.4:** WHEN any non-base frame is pushed, THE SYSTEM SHALL call `held.clear()`.
  - Red: B14. Hold W and press B. Today `held` stays latched.

- **CTL2.5:** WHEN a direction is held while a frame opens and that frame then closes, THE SYSTEM SHALL NOT walk until the direction is pressed again.
  - Named intentional test change: `movement-input.spec.ts` test C, which asserts that walking resumes on close, is replaced by the hold-through-menu test. That test holds W, opens the menu (M), closes it, and expects no step until W is pressed again. Test C is deleted by name, and this test is its survivor.
  - This deliberately reverses the behaviour documented at main.ts ≈3204.

### ctl-3 — reconcile server truth into the stack (battle, dialogue, shop-open, reconnect)
category: correctness (server-owned frames) · severity: MED · size: MODERATE
touches: client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/shopOpenModel.ts, client/src/ui/shopOpenModel.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/main.ts, client/src/main.dialogueDismiss.test.ts
after: [ctl-2]
- Evidence: `BATTLE_FORCE_HIDE` does not cover dialogue, shop, trade, pvp, questLog, heal or claim. Those overlays stay standing on top of a battle (r2 inventory §1.6, B17).
- Evidence: B8. `dismissPending` is set inside the send lambda (main.ts ≈1632-1640 and ≈2109-2120). When `live()` is undefined, no promise comes back and the flag sticks.
- Evidence: the dialogue batch listener (≈1861-1886) consumes `pendingShopId`.
- Absorbs pgcc-c C3/C4 (the shop-open step and defect 4) from `M-postgate-client-coverage`.

- **CTL3.1:** THE SYSTEM SHALL reconcile server state into the stack on every `store.onBatchApplied` through a pure, idempotent `reconcile(stack, serverView) → {stack, commands}`.
  - Property: `reconcile(reconcile(s, v), v)` equals `reconcile(s, v)`.

- **CTL3.2:** WHEN a battle appears, THE SYSTEM SHALL pop every frame whose policy is `drop`, keep `suspend` frames (dialogue) beneath the battle, and keep a terminal outcome shown until it is continued (`dismissedBattleId`).
  - This replaces the `BATTLE_FORCE_HIDE` / `NEVER_FORCE_HIDE` / `hideAllExceptPlan` path. Those constants are deleted.
  - Named survivor: the `overlayRegistry.test.ts` force-hide exactness cases become `SCREEN_POLICY` reconcile cases.
  - Red: open the shop, then start a battle. Today the shop overlay stays over the battle.

- **CTL3.3:** WHEN a conversation appears, THE SYSTEM SHALL pop player-owned frames and push the dialogue frame, and WHEN the conversation goes, THE SYSTEM SHALL pop it.
  - A conversation that ends server-side while suspended under a battle is dropped silently: no toast, no focus change. This is a named test row.
  - The client never closes dialogue itself. Popping a dialogue frame emits `dismissDialogue`.

- **CTL3.4:** WHEN given `(state, event)`, a pure shop-open step SHALL return the next `{dismissPending, pendingShopId}` plus at most one effect (`sendDismiss`, `openShop(id)`).
  - The events are dismiss-requested, shop-picked(id), dismiss-rejected(path), dismiss-not-sent(path), batch(conversationPresent) and reconnect.
  - It never sends a dismiss while one is pending.
  - A dismiss request cancels a pending shop-open.
  - Rollback is per path, exactly as pgcc-c C3 states.
  - The first no-conversation batch clears `dismissPending` and consumes `pendingShopId`. `openShop` then pushes the shop frame, unless the stack holds another player frame, in which case the open is dropped.
  - Reconnect clears both.

- **CTL3.5:** IF a dismiss send produces no reducer call (a frozen link, or `live()` yields no connection), THEN THE SYSTEM SHALL leave `dismissPending` unset (B8).
  - Red: `main.dialogueDismiss.test.ts`, using the booted mock harness. Dismiss with `live() === undefined` and the link not frozen, let `live()` recover, then dismiss again. Today the second dismiss sends nothing.

- **CTL3.6:** WHEN the connection is rebuilt, THE SYSTEM SHALL keep `resetPredictionState`, and `main.battle-reseed.test.ts` and `main.feedbackI18n.test.ts` SHALL pass unmodified.

### ctl-4 — nav core, nav view and frame chrome (presentation kit, unwired)
category: ux-a11y (navigation model) · severity: MED · size: MODERATE
touches: client/src/ui/nav.ts, client/src/ui/nav.test.ts, client/src/ui/navView.ts, client/src/ui/navView.test.ts, client/src/ui/frameView.ts, client/src/ui/frameView.test.ts, client/src/styles.css
after: []
- Intent (design §6, §10): this is the shared kit every screen adapter uses. It touches no `main.ts` and runs parallel to ctl-1..3.
- Evidence: B18. The uxd3 menu marks the selected row with bold weight only (`ui/menuView.ts` ≈183).

- **CTL4.1:** THE SYSTEM SHALL model navigation as pure layouts `list(items) | grid(items, cols) | tabs([{key, layout}])` over `NavItem = {key, enabled, reason?}`, storing the active item by **key**.
  - When content changes, `navReconcile` keeps the key, or else moves to the nearest index.
  - This is a fast-check property.

- **CTL4.2:** WHEN a fresh D-pad edge arrives, THE SYSTEM SHALL wrap at the ends.
  - Lists wrap top↔bottom, grids wrap within the row or column, and tabs wrap.
  - A repeat-flagged edge clamps at the ends instead.

- **CTL4.3:** WHEN A is pressed on a disabled item, THE SYSTEM SHALL return that item's reason and perform no action.
  - Disabled items stay reachable.

- **CTL4.4:** THE SYSTEM SHALL remember the active entry, tab and per-tab item in a session-scoped `NavMemory` keyed by frame.

- **CTL4.5:** WHEN a nav layout renders, THE SYSTEM SHALL expose one persistent container as the single tab stop, with `aria-activedescendant`.
  - Roles are `listbox`/`option`, `grid`/`gridcell` and `tablist`/`tab`.
  - Ids are stable, in the form `{frame}-{tab}-{key}`, with `aria-selected` and `aria-disabled`.
  - Rows are diffed, so DOM focus survives a re-render.
  - The active item shows a ▶ gutter mark, an inverted band and a 2 px frame (thick on grid cells), never colour alone.
  - The ▶ bob is a CSS class that is off under `prefers-reduced-motion`. No WAAPI.

- **CTL4.6:** THE SYSTEM SHALL render frame chrome through one `frameView`.
  - The chrome has a title bar (title, breadcrumb, tab strip with LB/RB glyph slots), an internally scrolling body, one feedback line, a hint-bar slot and a 9-slice border.
  - Sizes are side panel, full, bottom box and small.
  - The feedback line shows ✓, ! or a spinner, and shows success only after the caller reports resolution.
  - `.mr-frame` sets `color` and `background` from `:root` tokens with contrast ≥ 4.5:1. The tokens have `prefers-contrast: more` variants.

### ctl-5 — the main menu on the nav core: A pushes the child above the menu, B returns to it
category: ux-a11y (the operator's flow) · severity: HIGH · size: HEAVY
touches: client/src/ui/menuModel.ts, client/src/ui/menuModel.test.ts, client/src/ui/menuView.ts, client/src/ui/menuView.test.ts, client/src/ui/screens/types.ts, client/src/ui/screens/mainMenuScreen.ts, client/src/ui/screens/mainMenuScreen.test.ts, client/src/ui/overlayA11y.ts, client/src/ui/overlayA11y.test.ts, client/src/ui/liveRegion.ts, client/src/ui/liveRegion.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/a11y.spec.ts, docs/DECISIONS.md
after: [ctl-3, ctl-4]
- Evidence: `activateMenuLeaf` (main.ts ≈802) hides the menu before routing, so B-style back-out is impossible.
- Evidence: `menuKeyInput` maps ArrowRight/KeyD to "enter" (B18).
- Evidence: the `MENU_TREE` titles, `'Menu'` and the back hints are English literals (B11, menu part).
- Intent (design §5): entries are Monsters, Bag, Journal, Social, Profile, Options and Close. Until the ctl-8 slices land, each entry's child is the legacy overlay or a small sub-list:
  - Monsters → box
  - Bag → raising
  - Journal → quest log
  - Social → Trades / Challenges / Rankings
  - Profile → Name / Account / Privacy
  - Options → How to play (legacy help)
- M and the `#help-hint` click still open the menu. Escape at the menu root still closes it (the legacy intercept) until ctl-6.
- Lands the "Held keys" amendment (draft below).
- Boy Scout C7: correct the "Integer pixel scaling" wording to "integer device scale; the CSS stage scale may be fractional" (`render/viewport.ts` ≈13-26).

- **CTL5.1:** WHEN the main menu opens, THE SYSTEM SHALL show the design §5 entries as a wrapping nav list in a right-hand side panel, with every title and description from the catalog in `en` and `fr`.
  - Red: under `fr`, today's menu titles render in English.

- **CTL5.2:** WHEN A is pressed on a menu entry, THE SYSTEM SHALL push that entry's child frame above the menu, leaving the menu open beneath it. WHEN B is pressed in the child, THE SYSTEM SHALL return to the menu with the cursor on that entry.
  - `activateMenuLeaf`'s hide-first path is deleted.
  - B at the menu root closes the menu.
  - Right/D no longer activates an entry.
  - Red: open a leaf and press Backspace. Today the menu is already closed.

- **CTL5.3:** WHEN the menu reopens within a session, THE SYSTEM SHALL place the cursor on the last-used entry, and `__game()` SHALL report it as `navActive`.
  - `navActive` is an additive field.

- **CTL5.4:** WHEN Y (F) is pressed on a menu entry, THE SYSTEM SHALL show that entry's description on the frame's feedback line.

- **CTL5.5:** WHILE a D-pad button stays held under a nav frame, THE SYSTEM SHALL synthesize repeat edges from `router.tick(now)` on the injected clock: the first after 350 ms, then every 100 ms.
  - Repeat edges clamp at the list ends.
  - OS key-repeat still drives nothing.

- **CTL5.6:** WHEN a frame is pushed above another, THE SYSTEM SHALL make the lower frame `inert` and `aria-hidden` and suspend its focus trap, and WHEN it is popped, THE SYSTEM SHALL restore both.
  - A single pop returns focus to the parent's nav container.
  - A multi-level pop to a base restores focus once, to the canvas.
  - `#a11y-live` is re-adopted into the top frame on every push and pop, and returned to `<body>` at a base.
  - Active-descendant changes are not mirrored into `#a11y-live`.

- **CTL5.7:** WHEN this slice merges, `docs/DECISIONS.md` SHALL carry the "Held keys" amendment text from §"Decision drafts" and the C7 wording correction.
  - Named intentional test changes:
    - `menuModel.test.ts` is rewritten for the new tree.
    - MM-KEYGLYPH-FROM-HELP-SSOT is deleted by name. Leaves no longer carry hotkey glyphs, and accelerators are listed by the generated help (survivor: the ctl-14 generated-help tests).
    - The `a11y.spec.ts` KeyM assertions (≈272, ≈301) target the new entries.

### ctl-6 — Start / B / Select routing, the screen-adapter seam, and retirement of the Escape stack
category: ux-a11y + gameplay defect · severity: HIGH · size: HEAVY
touches: client/src/ui/screens/types.ts, client/src/ui/screens/registry.ts, client/src/ui/screens/registry.test.ts, client/src/ui/screens/worldScreen.ts, client/src/ui/screens/monstersScreen.ts, client/src/ui/screens/bagScreen.ts, client/src/ui/screens/journalScreen.ts, client/src/ui/screens/socialScreen.ts, client/src/ui/screens/profileScreen.ts, client/src/ui/screens/dialogueScreen.ts, client/src/ui/screens/shopScreen.ts, client/src/ui/screens/healScreen.ts, client/src/ui/screens/battleScreen.ts, client/src/ui/screens/tradeProposeScreen.ts, client/src/ui/screens/helpScreen.ts, client/src/ui/screens/optionsScreen.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/main.ts, client/src/main.a11yFocus.test.ts, client/src/main.privacyWiring.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/controls.ts, client/e2e/a11y.spec.ts, client/e2e/accounts.spec.ts, client/e2e/dialogue.spec.ts, client/e2e/encounter-battle.spec.ts, client/e2e/evolution.spec.ts, client/e2e/monster-privacy.spec.ts, client/e2e/pvp.spec.ts, client/e2e/pvp-side-b.spec.ts, client/e2e/ranked-forfeit.spec.ts, client/e2e/recruit.spec.ts, client/e2e/rename.spec.ts, client/e2e/trade.spec.ts, client/e2e/trade-propose.spec.ts, client/e2e/wallet-balance.spec.ts
after: [ctl-5]
- Evidence: the 15-branch Escape stack (main.ts ≈1571-1684) has no claimView branch (B4 / pgcc defect 5).
- Evidence: battle Escape hides an `Ongoing` battle (B17).
- Evidence: help matches `e.key === '?'` (≈1517), so a bare `/` does nothing (r2-016).
- Absorbs pgcc-d D3 (the terminal-dismiss latch). Supersedes pgcc-b's routing and Escape-priority work.
- Intent (design §4, §12): this slice adds one adapter stub per screen, in legacy DOM-button mode:
  - A on a legacy screen → `unhandled`, so native activation owns Enter.
  - B → pop.
  - Start → pop to base.
- The ctl-8 slices then convert the stubs one file at a time without touching `main.ts`.

- **CTL6.1:** THE SYSTEM SHALL route each virtual-button edge to the top frame's `ScreenAdapter.onButton(vm, nav, btn) → Command | consumed | unhandled`, and `main.ts` SHALL run an exhaustive `dispatch(command)` plus `applyStack(prev, next)`.
  - The `Command` union covers every reducer action a screen issues today, among them care, train, evolve, set nickname, set party slot, buy, sell, trade respond/confirm/cancel, challenge accept/decline/cancel, propose trade, challenge, set profile name, the battle actions, heal party, advance dialogue and dismiss dialogue, plus the claim and privacy actions.
  - A missing arm fails `client-typecheck` (`never` check).
  - Adapters get a read-only `ScreenContext` (store reads, identity, bindings, clock), so screens build their own view models.

- **CTL6.2:** WHEN Start (Escape or M) is pressed above a base, THE SYSTEM SHALL pop to that base. WHEN Start is pressed at a base, THE SYSTEM SHALL push the main menu.
  - Popping a dialogue frame emits `dismissDialogue`.
  - The 15-branch Escape stack is deleted.

- **CTL6.3:** WHEN B (Backspace) is pressed with a non-base frame on top, THE SYSTEM SHALL pop exactly one frame, and claimView SHALL close on B and on Start.
  - Red: B4. Press C, then Escape. Today claim stays open.

- **CTL6.4:** WHEN Start is pressed on an `Ongoing` battle base, THE SYSTEM SHALL keep the battle shown and open the main menu over it, read-only.
  - Entries whose path is not `battleSafe` are disabled, with a catalogued reason.
  - Closing the menu returns to the battle.
  - Red: B17. Today Escape hides the battle view.

- **CTL6.5:** WHEN A, B or Start is pressed on a terminal battle outcome, THE SYSTEM SHALL continue (set `dismissedBattleId` to that battle) and return to the world.
  - A pure rule sets the dismissed id if and only if the latest battle is terminal (pgcc-d D3).

- **CTL6.6:** WHILE a frame with a non-zero `armMs` is within that delay of its push, THE SYSTEM SHALL ignore A and X, honour B and Start, and announce the frame title on `#a11y-live`.
  - Battle start has `armMs` = 250.
  - The delay is measured on the injected clock.

- **CTL6.7:** WHEN Select (R, or the `Slash` code with or without Shift) is pressed, THE SYSTEM SHALL toggle Help.
  - The `e.key === '?'` branch is retired.
  - Red: r2-016. Today a bare `/` does nothing.

- **CTL6.8:** WHEN an e2e test needs a clean slate, THE SYSTEM SHALL provide a shared `closeAll()` in `client/e2e/controls.ts` that presses Start only while `__game().stack` is above the base.
  - Every prophylactic Escape press in the specs listed in `touches:` uses it.
  - Each in-battle Escape press (encounter-battle ≈305/311, recruit ≈296 onward) is audited against CTL6.4/CTL6.5.
  - `main.a11yFocus.test.ts` and `main.privacyWiring.test.ts` change only where they press Escape (named intentional test change).

### ctl-7 — frame anchoring: `#game-screen`, `.mr-frame`, re-parenting, and the Start chip replacing `#help-hint`
category: ux-a11y (S-overlay-anchor HIGH, NEW-1 HIGH) · severity: HIGH · size: HEAVY
touches: client/index.html, client/src/styles.css, client/src/render/world.ts, client/src/main.ts, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/evolutionView.ts, client/src/ui/evolutionView.test.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/ui/hintBarView.ts, client/src/ui/hintBarView.test.ts, client/src/ui/menuView.test.ts, client/src/main.feedbackI18n.test.ts, client/src/main.privacyWiring.test.ts, client/src/main.a11yFocus.test.ts, client/src/main.exportTransport.test.ts, client/src/main.partyFull.test.ts, client/src/indexShell.smoke.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/a11y.spec.ts
after: [ctl-6]
- Evidence: `render/world.ts:72` appends a canvas the height of `innerHeight` to `#app`. The nine `index.html` shells (dialogue, quest-log, heal, shop, trade, pvp-challenge, leaderboard, rename, tradepropose) carry only `display:none`, so they paint below the fold and the page scrolls (B3, r2-006/008/013, S-overlay-anchor).
- Evidence: none of those shells or their views sets a text colour, so text is UA black on `#0b0d12`, about 1.1:1 (NEW-1).
- Evidence: battle, box, raising and evolution self-style `position:fixed; inset:0` inside `#app`.
- Evidence: the `#help-hint` launcher (`index.html` ≈135-142) is a fixed `<body>` child with English text (B11), and W-ONE-CORNER-AFFORDANCE (`menuView.test.ts`) allows only `{build-stamp, help-hint}`.
- Intent (design §10, migration rule 4): anchoring only, with no D-pad conversion of screens. Claim, privacy and session anchor in ctl-8d and ctl-8h.

- **CTL7.1:** THE SYSTEM SHALL wrap the canvas mount, a frame layer and a hint-bar slot in `#game-screen`, and the page SHALL never scroll.
  - With any frame open, `document.scrollingElement.scrollHeight` ≤ `innerHeight`.
  - Red (e2e): open the dialogue or shop. Today the page scrolls and the overlay starts below the fold.

- **CTL7.2:** WHEN any of the nine `index.html` shells, help, menu, battle, box, raising, evolution, the interact prompt or the privacy countdown is shown, THE SYSTEM SHALL render it as a class-styled `.mr-frame` inside `#game-screen` whose bounding box lies within the viewport.
  - Ids, `data-testid`s and the `display:none` contract are unchanged.
  - The render loop, resize wiring, the canvas `role="application"` and the dev hooks keep working.
  - `reduced-motion.spec.ts` and `movement-input.spec.ts` pass unmodified.

- **CTL7.3:** WHEN any frame shows text, THE SYSTEM SHALL render it in the frame colour token at a contrast ratio of at least 4.5:1 against the frame background.
  - An e2e reads computed styles in `a11y.spec.ts`, because `toBeVisible` cannot catch this.
  - Red: NEW-1. Today dialogue text measures about 1.1:1.

- **CTL7.4:** WHEN the world base is shown, THE SYSTEM SHALL render a hint bar inside `#game-screen` with a clickable Start chip (opens the main menu) and a Select chip (Help), labelled from the catalog with the bound keycap, and `#help-hint` SHALL no longer exist.
  - The chips' click presses the button, and opening the menu clears held keys (CTL2.4).
  - Named intentional test changes:
    - W-ONE-CORNER-AFFORDANCE is rewritten by name to `{build-stamp}` plus the in-frame hint bar. The replacement lands first.
    - The `buildAppShellFromRealIndexHtml` fixtures in the five `main.*.test.ts` files and `indexShell.smoke.test.ts` update to the new `index.html`.

### ctl-8a — Monsters screen: Party / Storage tabs and the monster action sheet
category: ux-a11y (screen conversion) · severity: MED · size: HEAVY
touches: client/src/ui/screens/monstersScreen.ts, client/src/ui/monstersModel.ts, client/src/ui/monstersModel.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/boxModel.ts, client/src/ui/boxModel.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/raisingModel.ts, client/src/ui/raisingModel.test.ts, client/src/ui/evolutionView.ts, client/src/ui/evolutionView.test.ts, client/src/ui/evolutionNotice.ts, client/src/ui/evolutionNotice.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/evolution.spec.ts
after: [ctl-7]
- Evidence:
  - box, raising and evolution are three hide-switch overlays operated only by Tab and the mouse;
  - the nickname edit uses `window.prompt()` (`ui/boxView.ts:278`);
  - Box "Heal Party" sends `locations[0]` and ignores the bound healer (B13);
  - the evolution reveal banner has only an OK button.
- Intent (design §5): Monsters merges the three. The legacy roots survive as Monsters panels or the sheet, and the legacy B/I/E keys keep opening the panel that holds their root until ctl-11 retargets them. LB/RB are PageUp/PageDown until ctl-11 adds Q/E.

- **CTL8A.1:** WHEN Monsters opens, THE SYSTEM SHALL show tabs Party (a list of up to 6) and Storage (a grid), switched by LB/RB, with per-tab cursor memory.

- **CTL8A.2:** WHEN A is pressed on a monster, THE SYSTEM SHALL open its action sheet: Summary, Care, Feed…, Evolve…, Nickname, Move.
  - Feed… opens a food list and needs no confirm.
  - Evolve… lists the evolution paths, is disabled with a reason when there are none, and its confirm defaults to No.
  - X on a monster is a quick Move.
  - B returns with the cursor on the source monster.
  - Feedback is catalogued (for example "✓ Fed {name}").

- **CTL8A.3:** WHEN Nickname is chosen, THE SYSTEM SHALL open an in-frame typing row in which the field owns every key except Escape (stop typing, keep the text) and Enter (commit).
  - `window.prompt()` is removed.
  - The view calls no `stopPropagation`.
  - Red: today the nickname edit calls `window.prompt`.

- **CTL8A.4:** WHILE the stack holds a battle base, THE SYSTEM SHALL disable Care, Feed, Move and Evolve with a catalogued reason.

- **CTL8A.5:** WHEN Monsters renders, THE SYSTEM SHALL offer no Heal Party control.
  - This is part of B13. Healing happens at a healer.

- **CTL8A.6:** WHEN an evolution notice arrives, THE SYSTEM SHALL show it as a prompt that A dismisses (OK).
  - `evolution.spec.ts` passes. Its KeyB/KeyI/KeyE presses keep reaching the panels that hold the box, raising and evolution roots.

### ctl-8b — Bag screen: content-driven pockets
category: ux-a11y (screen conversion) · severity: MED · size: MODERATE
touches: client/src/ui/screens/bagScreen.ts, client/src/ui/bagModel.ts, client/src/ui/bagModel.test.ts, client/src/ui/bagView.ts, client/src/ui/bagView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-7]
- Intent (design §5 row 2): Bag replaces raising's display-only inventory list as the inventory screen. Until this slice, the legacy Bag adapter shows the raising root.

- **CTL8B.1:** WHEN Bag opens, THE SYSTEM SHALL show pocket tabs derived from item-definition data, with no hard-coded item ids, each holding a nav list of owned items with quantities. LB/RB switch pockets.

- **CTL8B.2:** WHEN A is pressed on an item, THE SYSTEM SHALL offer Feed (→ a monster picker, no confirm) or Info as the item allows.
  - Use is disabled with the catalogued reason "Use items from the battle Bag command" where it does not apply.
  - After a Feed, the picker closes and the cursor returns to the item.

- **CTL8B.3:** WHILE the stack holds a battle base, THE SYSTEM SHALL disable Feed with a catalogued reason.

### ctl-8c — Social screen: Players / Trades / Challenges / Rankings
category: ux-a11y (screen conversion) · severity: MED · size: HEAVY
touches: client/src/ui/screens/socialScreen.ts, client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/tradeModel.ts, client/src/ui/tradeModel.test.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/pvpModel.ts, client/src/ui/pvpModel.test.ts, client/src/ui/leaderboardView.ts, client/src/ui/leaderboardView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/trade.spec.ts, client/e2e/pvp.spec.ts
after: [ctl-7]
- Evidence: trade, pvp and leaderboard are three separate overlays. Help claims "nearby player", which is false (B15).
- Intent (design §5): Social is the place to *respond* to requests. Initiation stays on the existing pvpView per-player Challenge buttons and O until ctl-10 replaces them with the face-to-face picker.

- **CTL8C.1:** WHEN Social opens, THE SYSTEM SHALL show tabs Players, Trades, Challenges and Rankings.
  - While a request is waiting, Social opens on the tab of the oldest waiting request, with the cursor on it.
  - Otherwise it opens on the remembered tab.

- **CTL8C.2:** WHEN the Players tab renders, THE SYSTEM SHALL list online players from the already-public `character` subscription, each with name, zone name, an "In battle" badge, and a "Nearby" badge when the player is in the same zone within `NEARBY_TILES` = 12 Manhattan tiles.
  - `NEARBY_TILES` is a `socialModel` presentation constant that gates nothing.
  - A on a row shows "Walk up to {name} and press A", and no remote action exists.

- **CTL8C.3:** WHEN A is pressed on a trade or challenge row, THE SYSTEM SHALL offer that row's legal actions as a sheet.
  - Trades offer Accept, Decline, Confirm and Cancel. Challenges offer Accept, Decline and Cancel.
  - Confirm defaults to No for Decline and for the final trade Confirm.
  - Rankings are read-only.

- **CTL8C.4:** WHILE the stack holds a battle base, THE SYSTEM SHALL disable Accept on challenges with a catalogued reason.

### ctl-8d — Profile screen (Name typing, Account, Privacy) and claim/privacy anchoring
category: ux-a11y + defects B2/B5 · severity: MED · size: HEAVY
touches: client/src/ui/screens/profileScreen.ts, client/src/ui/renameView.ts, client/src/ui/renameView.test.ts, client/src/ui/renameModel.ts, client/src/ui/renameModel.test.ts, client/src/ui/claimView.ts, client/src/ui/claimView.test.ts, client/src/ui/claimModel.ts, client/src/ui/claimModel.test.ts, client/src/ui/privacyView.ts, client/src/ui/privacyView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/rename.spec.ts, client/e2e/accounts.spec.ts, client/e2e/monster-privacy.spec.ts
after: [ctl-7]
- Evidence:
  - B2: `claimView` creates its title and body hidden, and `render()` never shows them (`ui/claimView.ts` ≈69-77, ≈135-149). `accounts.spec.ts` uses `toHaveText`, which ignores visibility.
  - B3: claim and privacy append themselves to `<body>`.
  - B5: the `#rename-submit` keydown only calls `stopPropagation`, so Escape is dead there (`ui/renameView.ts` ≈89-91).

- **CTL8D.1:** WHEN Profile opens, THE SYSTEM SHALL show a nav list Name, Account & sign-in, Privacy & data, rendered as `.mr-frame`s inside `#game-screen`.
  - The roots `rename-overlay`, the claim root and the privacy root keep their ids and testids.

- **CTL8D.2:** WHEN Name opens (from Profile, or later from N), THE SYSTEM SHALL start in typing mode.
  - The field owns every key except Escape and Enter.
  - The first Escape stops typing and keeps the text. The next Escape acts as Start.
  - Enter commits through the existing set-profile-name command.
  - The view calls no `stopPropagation`.
  - Red: B5. Focus `#rename-submit` and press Escape; today nothing happens.
  - `rename.spec.ts` is the typing e2e.

- **CTL8D.3:** WHEN the claim frame renders in any phase, THE SYSTEM SHALL show its title and body, and offer its actions as nav rows.
  - The decline confirm defaults to No.
  - Red: B2. An `accounts.spec.ts` `toBeVisible` assertion on the claim title fails today.

- **CTL8D.4:** WHEN Privacy & data opens, THE SYSTEM SHALL offer its actions as nav rows, and account deletion SHALL keep its two-step confirm with No as the default.
  - `monster-privacy.spec.ts` drives the privacy flow through Profile › Privacy. This is the named survivor for the privacy flow.

### ctl-8e — Dialogue, Shop and Heal on the D-pad
category: ux-a11y + gameplay defect B13 · severity: MED · size: HEAVY
touches: client/src/ui/screens/dialogueScreen.ts, client/src/ui/screens/shopScreen.ts, client/src/ui/screens/healScreen.ts, client/src/ui/dialogueView.ts, client/src/ui/dialogueView.test.ts, client/src/ui/dialogueModel.ts, client/src/ui/dialogueModel.test.ts, client/src/ui/shopView.ts, client/src/ui/shopView.test.ts, client/src/ui/shopModel.ts, client/src/ui/shopModel.test.ts, client/src/ui/healView.ts, client/src/ui/healView.test.ts, client/src/ui/healModel.ts, client/src/ui/healModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/dialogue.spec.ts, client/e2e/shop-npc.spec.ts
after: [ctl-7]
- Evidence:
  - The dialogue has no continue or close control, and leaf nodes have 0 choices (r2-008/009/060/061).
  - Shop items have no descriptions (r1 PlaytestReport :85).
  - `healView` is a display-only cost list (`ui/healView.ts` ≈40-55), and the real heal is Box → Heal Party with `locations[0]` (B13).
  - The bound heal view model carries the bound `locationId` (`buildHealViewModelForLocation`).
- The views keep `data-choice-idx` and `data-shop-id` on their elements, because the main.ts document click delegate stays until ctl-15.

- **CTL8E.1:** WHEN a conversation is shown, THE SYSTEM SHALL render a bottom-box frame with a name plate, typewriter text (instant under reduced motion), a ▼ marker, and the choices as a wrapping nav list.
  - A finishes the typewriter, then advances, then chooses.
  - B finishes the typewriter. On a choice node or a leaf node, B ends the talk through `dismissDialogue`.

- **CTL8E.2:** WHEN Shop opens, THE SYSTEM SHALL show tabs Buy | Sell, opening on Buy, with the balance in the title and a Y description slot that reads "—" when an item has no description.
  - A on an item opens a quantity row. D-pad left/right changes the quantity by ±1 and LB/RB by ±10.
  - Next comes a Yes/No confirm: Buy defaults to Yes, Sell to No.
  - Feedback is catalogued (for example "✓ Bought 2 Bait (−40g)").

- **CTL8E.3:** WHEN the heal frame opens for a bound healer, THE SYSTEM SHALL ask "Heal party for N?" with Yes as the default, and on Yes dispatch heal-party with that bound location's id.
  - With no bound location, Heal is disabled with a reason.
  - Red: B13. A view-model test binds location 7 and expects `healParty(7)`. Today the heal view has no action at all.

### ctl-8f — Battle on the D-pad: commands, skill grid, lists instead of selects
category: ux-a11y + input hygiene (B10) · severity: MED · size: HEAVY
touches: client/src/ui/screens/battleScreen.ts, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/battleModel.ts, client/src/ui/battleModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/battle-dpad.spec.ts, client/e2e/encounter-battle.spec.ts, client/e2e/recruit.spec.ts
after: [ctl-7]
- Evidence:
  - Battle is operable only by Tab and the mouse.
  - The bait and cure `<select>`s parse divergently (B10 / pgcc defect 3, `ui/battleView.ts` ≈580-629).
  - The skill buttons omit accuracy (R-rb-56-FOLLOWUP-ACC).
- Obsoletes pgcc-d D5: no string parse remains.

- **CTL8F.1:** WHEN a battle turn begins, THE SYSTEM SHALL show the command list Fight, Recruit, Swap, Bag, Run with the cursor reset to Fight.
  - Run is disabled in PvP, with a reason.
  - While waiting on the opponent, the list greys out under "Waiting for {name}…".

- **CTL8F.2:** WHEN Fight is chosen, THE SYSTEM SHALL show a two-column skill grid in which each cell gives affinity, power and accuracy, with the cursor on the last skill used by that monster in this battle.

- **CTL8F.3:** WHEN Recruit, Swap or Bag is chosen, THE SYSTEM SHALL show a nav list in which each entry's key maps directly to its id, so no string is parsed (B10).
  - Recruit lists bait items with "No bait" first, then a Yes/No that defaults to Yes.
  - Swap lists the bench.
  - Bag lists cure items, then the target.
  - `data-testid="bait-selector"` survives on the bait list root.

- **CTL8F.4:** WHEN Start is pressed inside a battle sub-list, THE SYSTEM SHALL open the main menu above it, and WHEN that menu closes, THE SYSTEM SHALL return to the same sub-list with its cursor.

- **CTL8F.5:** WHEN a battle is played with the D-pad, A and B only, THE SYSTEM SHALL complete it to an outcome, and A or B SHALL continue from the outcome (the ▼ marker).
  - `battle-dpad.spec.ts` is the D-pad-only battle e2e.
  - `recruit.spec.ts` and `encounter-battle.spec.ts` change only where they select from the old `<select>`s.

### ctl-8g — trade-propose wizard
category: ux-a11y + defect B5 · severity: MED · size: MODERATE
touches: client/src/ui/screens/tradeProposeScreen.ts, client/src/ui/tradeProposeView.ts, client/src/ui/tradeProposeView.test.ts, client/src/ui/tradeProposeModel.ts, client/src/ui/tradeProposeModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/trade-propose.spec.ts
after: [ctl-7]
- Evidence: every control calls `stopPropagation`, and initial focus is the target `<select>`, so Escape is dead when the overlay opens (B5, `ui/tradeProposeView.ts` ≈100-124, ≈201-203).
- Overlap: M25 S1 may edit `tradeProposeModel.ts` copy. Do not run the two concurrently.

- **CTL8G.1:** WHEN the wizard opens, THE SYSTEM SHALL step through Offer (A toggles ✓ on own monsters), Coins (a typing row), Ask and Review.
  - LB/RB page between the steps, and B steps back.
  - Review confirms with Yes as the default.
  - A Target step appears first only when no target was supplied. ctl-10 always supplies one.

- **CTL8G.2:** WHEN Start closes the wizard mid-way, THE SYSTEM SHALL keep the draft in its model, and reopening it for the same target SHALL restore that draft.

- **CTL8G.3:** WHILE a Coins row is typing, THE SYSTEM SHALL let the field own every key except Escape (stop typing) and Enter (commit), and the view SHALL call no `stopPropagation`.
  - Red: B5. Open the wizard and press Escape; today nothing happens.

### ctl-8h — session gate as an in-frame system modal (B1) and Journal
category: ux-a11y defect (B1 HIGH, latent) · severity: HIGH · size: MODERATE
touches: client/src/ui/sessionView.ts, client/src/ui/sessionView.test.ts, client/src/ui/sessionModel.ts, client/src/ui/sessionModel.test.ts, client/src/ui/screens/journalScreen.ts, client/src/ui/questLogView.ts, client/src/ui/questLogView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-7]
- Evidence: B1.
  - `sessionView`'s `ensureElement` creates the title, body and all four buttons with `display:none`, and `render()` never shows the title or body (`ui/sessionView.ts` ≈15-23, ≈53-61).
  - `primaryActionLabel` (`ui/sessionModel.ts` ≈118, ≈132) has no reader, so no button gets a label.
  - The gate swallows every key, so an expired session is a dead end.
  - The bug is latent until a real issuer ships (`net/connection.ts` ≈996).
- Evidence: questLog is a display-only list.

- **CTL8H.1:** WHEN the session gate is shown in any state, THE SYSTEM SHALL render, inside `#game-screen`, a visible title, a visible body and labelled action buttons from the catalog, with Retry as the default action.
  - "Continue as guest" asks for confirmation, defaulting to No.
  - B and Start are inert, and the hint bar says so.
  - Red: a `sessionView.test.ts` case renders the expired state. Today the title and body are hidden and the buttons have no label.

- **CTL8H.2:** WHEN Journal opens, THE SYSTEM SHALL show the quests as a nav list, with A or Y opening the selected quest's detail.

### ctl-9 — game-core interaction rule (front tile, then own tile) and its wasm export
category: gameplay rule (r2-024) · severity: MED · size: MODERATE
touches: game-core/src/interact.rs, game-core/src/interact_tests.rs, game-core/src/lib.rs, client-wasm/src/lib.rs, game-core/tests/interact_reachability.rs
after: []
- Evidence: `nearestInteractable` (`ui/interactModel.ts` ≈75) picks the nearest NPC or healer within `TALK_RANGE` = 2 (`game-core/src/npc/mod.rs:14`) and ignores facing. `TilePos::step` (`game-core/src/types.rs:44`) already defines the tile in front.
- Evidence: `talk` re-checks the same zone and Manhattan distance ≤ `TALK_RANGE` against the NPC's current character row (`server-module/src/npc.rs` ≈284-294). `heal_party` checks the zone only.
- Intent (design §7; operator answer, binding): this is a new rule, not a port. The `apply_move_coded` flat-primitive convention (`game-core/src/world.rs:409`) governs the export.
- Note: game-core runs the nightly zero-miss mutation job, so tests target every branch.

- **CTL9.1:** WHEN given the character's position, facing and zone plus a list of entities (NPC at its character-row position, heal location, other player), `game_core::interact_candidates` SHALL return the indices of the first non-empty tier: entities on the faced tile (`pos.step(facing)`), else entities on the character's own tile.
  - Only same-zone entities count.
  - Within a tile, order is by kind (NPC < heal < player), then by id.
  - Nothing else is a candidate. Tests show that an NPC directly behind, two tiles ahead, or diagonal is not a candidate; that the faced tile wins over the own tile; and that another zone is excluded.

- **CTL9.2:** WHEN `interact_candidates` returns an NPC, THE SYSTEM SHALL guarantee that its Manhattan distance from the character is at most `TALK_RANGE`.
  - This is a property test, so every offered target is one the server accepts.

- **CTL9.3:** THE SYSTEM SHALL export `interact_candidates_coded(own_x: i32, own_y: i32, facing: u8, zone: u32, entities_json: &str) -> Result<String, String>` from client-wasm.
  - Entities arrive as JSON `[{kind, x, y, zone, id}]`, with `id` as a decimal string. The result is a JSON array of input indices.
  - It returns `Err` for an invalid facing code, malformed JSON or an unknown kind (reject, never clamp).
  - Golden tests sit beside `talk_range()`.

- **CTL9.4:** WHEN content loads, every heal location and every NPC home SHALL have at least one walkable 4-neighbour in its zone map.
  - `game-core/tests/interact_reachability.rs` asserts this through the product's own content loader, so no interactable becomes unreachable once the range tier is gone.

### ctl-10 — world A and Y act on what you face; retire T and O; face-to-face trade and challenge
category: gameplay/UX (r2-024, r2-025) + defects B6/B13/B15 · severity: HIGH · size: HEAVY
touches: client/src/ui/interactModel.ts, client/src/ui/interactModel.test.ts, client/src/ui/actionSheetModel.ts, client/src/ui/actionSheetModel.test.ts, client/src/ui/screens/worldScreen.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/tradeProposeModel.ts, client/src/ui/tradeProposeModel.test.ts, client/src/ui/tradeProposeView.ts, client/src/ui/tradeProposeView.test.ts, client/src/ui/menuModel.ts, client/src/ui/menuModel.test.ts, client/src/ui/helpModel.ts, client/src/ui/helpModel.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, docs/DECISIONS.md, client/e2e/controls.ts, client/e2e/dialogue.spec.ts, client/e2e/shop-npc.spec.ts, client/e2e/wallet-balance.spec.ts, client/e2e/trade-propose.spec.ts
after: [ctl-8a, ctl-8c, ctl-8e, ctl-8g, ctl-9]
- Evidence: T is gated on `!anyOverlayVisible()` with no world-focus gate (B6, main.ts ≈1492-1515).
- Evidence: `interactModel.ts` ≈135 and ≈166 hard-code `keyGlyph: 'T'`.
- Evidence: O, the pvpView per-player Challenge buttons, and menu leaves start trades and challenges remotely (r2-025).
- Evidence: CONTROLS says "nearby player" (B15).
- Evidence: Box Heal Party's main.ts callback (≈2514-2525, `healTargetLocationId`) is dead once ctl-8a has removed its button.
- Landing the "Interaction target" DECISIONS entry (draft below) is part of this slice.

- **CTL10.1:** WHEN A is pressed at the world base, THE SYSTEM SHALL act on the candidates returned by the wasm `interact_candidates_coded`.
  - With one candidate that has a default action, A runs it: NPC → talk; healer → the bound heal frame.
  - With several candidates, or a player, A opens a picker of entity × action (for example "Rival — Trade").
  - With none, A does nothing and shows no toast.
  - `nearestInteractable` shrinks to a marshalling adapter with no TypeScript rule.
  - Red: r2-024. With an NPC directly behind the character, pressing T today starts a talk.

- **CTL10.2:** WHEN Y is pressed at the world base with a candidate, THE SYSTEM SHALL open the primary candidate's full action sheet (Talk, Shop, Heal, Trade, Challenge, as applicable).

- **CTL10.3:** WHEN Trade or Challenge is chosen for a faced player, THE SYSTEM SHALL open the trade wizard with that target pre-filled (no Target step), or send the challenge after a Yes-default confirm.
  - No menu, Social or pvpView control initiates a trade or challenge any more.
  - O is unbound.
  - The server reducers are untouched.

- **CTL10.4:** WHEN T is pressed, THE SYSTEM SHALL do nothing, and the world interaction chip SHALL read `[{A glyph}] {verb} — {name}` or `[{A glyph}] Choose…` from the live binding and the catalog.
  - No literal `'T'` remains (B6).

- **CTL10.5:** WHEN this slice merges, `main.ts` SHALL hold no Box Heal Party path and no use of `healTargetLocationId`, and the CONTROLS rows SHALL describe A interaction and face-to-face trading, with no T, no O and no false "nearby".
  - This closes B13's remaining half and B15 until ctl-14 deletes CONTROLS.
  - Named intentional test change: `helpModel.test.ts`'s pinned key set drops T and O.

- **CTL10.6:** WHEN an e2e test needs to interact, THE SYSTEM SHALL support it through `pressButton('A')` while the fixture faces the target.
  - The KeyT sites (dialogue ≈188, shop-npc ≈293 and ≈370, wallet-balance ≈350) use `pressButton('A')`, and each fixture is checked to *face* its NPC.
  - trade-propose ≈210 positions A beside B facing B, then runs A → picker → Trade.
  - Hook-driven `proposeTrade`/`challengePvp` specs are unaffected.

- **CTL10.7:** WHEN this slice merges, `docs/DECISIONS.md` SHALL carry the new "Interaction target: the tile in front, then your own tile" entry from §"Decision drafts".

### ctl-11 — accelerators move to the router; Q/E become LB/RB; J and V; the legacy ladder is deleted
category: input architecture · severity: MED · size: HEAVY
touches: client/src/input/router.ts, client/src/input/router.test.ts, client/src/input/bindings.ts, client/src/input/bindings.test.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/ui/reachability.test.ts, client/src/ui/focusTrap.ts, client/src/main.ts, client/src/main.a11yFocus.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/controls.ts, client/e2e/menu-flow.spec.ts, client/e2e/dialogue.spec.ts, client/e2e/wallet-balance.spec.ts, client/e2e/trade.spec.ts, client/e2e/evolution.spec.ts
after: [ctl-10, ctl-8b, ctl-8d, ctl-8f, ctl-8h]
- Evidence: Q opens Journal and E opens Evolution today, colliding with the operator's bumpers (migration rule 2: all of this lands in **one** slice).
- Evidence: `KEY_DIR`, `targetOwnsKey`, `worldHasFocus`, the probe and handle tables, `canOpen` and `OVERLAY_TIERS` survive only for the legacy hotkeys.
- Boy Scout B16: the `focusTrap.ts` line-1 comment says "16"; correct it to the `OverlayId` count. The vacuous `trade.spec.ts` ≈195 and ≈205 `g`/`h` presses are deleted by name.

- **CTL11.1:** WHEN an accelerator key is pressed, THE SYSTEM SHALL pop to the base and push that accelerator's canonical menu path with the cursor on the leaf.
  - The accelerators: B → Monsters › Storage; I → Bag; V → Monsters › Party; J → Journal; U, P, L → Social › Trades, Challenges, Rankings; N → Profile › Name; C → Profile › Account. F8 and F9 are unchanged.
  - Pressed while its own screen is on top, an accelerator acts as Start.
  - Red: today Q opens the Journal and E opens Evolution.

- **CTL11.2:** WHILE the top frame is server-owned, a `textEntry`, a prompt, or the session gate, THE SYSTEM SHALL deny accelerators. WHILE in battle, THE SYSTEM SHALL allow only `battleSafe` paths.

- **CTL11.3:** WHEN Q or E (or PageUp or PageDown) is pressed on a tabbed screen, THE SYSTEM SHALL switch to the previous or next tab (LB/RB), and WHEN pressed in the world, THE SYSTEM SHALL do nothing.

- **CTL11.4:** WHEN this slice merges, the keydown ladder SHALL be gone, with every key resolved by the router.
  - Deleted: `KEY_DIR`, `targetOwnsKey`, `worldHasFocus`, the probe and handle tables, `canOpen`, `OVERLAY_TIERS`.
  - `overlayRegistry` keeps only `OverlayId` and `OVERLAY_A11Y`.
  - Named survivors: the S5T-GATE world-focus cases in `main.a11yFocus.test.ts` are rewritten as router ownership cases. Focus outside `#game-screen` and not `<body>` goes to the browser.

- **CTL11.5:** WHEN press counts are computed over the pure menu, nav and stack models, every accelerator target SHALL be reachable from the world in at most 7 D-pad/A presses, and every design §5 common-task row SHALL need no more D-pad presses than its accelerator count plus 4.
  - Rename is held only to the 7-press bound.
  - These are fast-check and table tests in `reachability.test.ts`.

- **CTL11.6:** WHEN the operator's required flow (design §5, press by press) is played with the keyboard only, THE SYSTEM SHALL produce the documented result at every step, and the final W SHALL walk.
  - `menu-flow.spec.ts` is the flow's e2e.
  - Migrations:
    - KeyQ (dialogue ≈397, wallet-balance ≈657 and ≈925, trade ≈200) → `pressAccel('J')`;
    - KeyE (evolution ≈170) → `pressAccel('V')`, then the monster sheet → Evolve;
    - KeyI (evolution ≈193) → the Monsters sheet's Care/Feed path.

### ctl-12 — remapping: Options › Controls, binding store, glyphs
category: accessibility (WCAG 2.1.4) + operator intent · severity: MED · size: HEAVY
touches: client/src/input/bindingStore.ts, client/src/input/bindingStore.test.ts, client/src/input/glyphs.ts, client/src/input/glyphs.test.ts, client/src/input/bindings.ts, client/src/input/bindings.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/ui/controlsModel.ts, client/src/ui/controlsModel.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/src/ui/screens/optionsScreen.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/remap.spec.ts, client/e2e/controls.ts
after: [ctl-11]
- Evidence: M23 cut remapping because `main.ts` was a literal `e.code` ladder (`specs/monster-realm-v2/archive/M23-accessibility.spec.md:335`). The ladder is gone after ctl-11.
- Intent: design §9.

- **CTL12.1:** WHEN Options › Controls opens, THE SYSTEM SHALL show tabs Buttons (12 rows) and Shortcuts, each row with a Primary and an Alt slot.
  - A on a slot starts capture ("Press a key for {button}…").

- **CTL12.2:** WHILE capturing, THE SYSTEM SHALL accept any key, including Escape, Enter and Backspace.
  - Reserved keys are refused with a reason: Tab, Shift+Tab, F5, F11, F12, bare modifiers, Ctrl/Alt/Meta chords.
  - Pressing the key the slot already holds (or, for an empty slot, the key in the row's other slot) ends capture unchanged. So do the Cancel chip and 10 s of idle.

- **CTL12.3:** WHEN a captured key is bound elsewhere, THE SYSTEM SHALL swap the two bindings and say so ("Swapped: …"). IF a change would leave a protected button (D-pad, A, B, Start) with no key, THEN THE SYSTEM SHALL refuse it.
  - X clears a slot, and Y resets a row.
  - "Reset all" asks Yes/No, defaulting to No.

- **CTL12.4:** WHEN bindings change, THE SYSTEM SHALL save them immediately to `localStorage['mr.controls']` as `{v:1, updatedAt, devices:{keyboard:{buttons, accels}}}` behind a `BindingSource {load, save}`.
  - Every storage access is wrapped in try/catch.
  - A total `parseBindings(raw: unknown)` falls back entry by entry.
  - An unknown `v` gives the defaults plus a notice.

- **CTL12.5:** WHEN a keycap is displayed, THE SYSTEM SHALL resolve it synchronously through `glyph(code)`, in this order:
  - a cache filled from `navigator.keyboard.getLayoutMap()` (at boot and on focus, where available);
  - else the `e.key` learned per code or recorded at capture;
  - else a catalogued key name. AZERTY `KeyW` reads "Z".
  - Key names are a typed `Record<KeyCode, PlainMessageId>`.

- **CTL12.6:** WHEN a player remaps A to K and reloads the page, THE SYSTEM SHALL confirm with K and no longer with Enter, and every hint SHALL show the new keycap.
  - `remap.spec.ts` is the flow's e2e.
  - `pressButton` reads the live table.

### ctl-13 — the live hint bar, notices and banners, world B/Y on notices, the welcome card
category: ux-a11y (discoverability, B12) · severity: MED · size: HEAVY
touches: client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/ui/hintBarView.ts, client/src/ui/hintBarView.test.ts, client/src/ui/noticeModel.ts, client/src/ui/noticeModel.test.ts, client/src/ui/welcomeView.ts, client/src/ui/welcomeView.test.ts, client/src/ui/errorOverlayModel.ts, client/src/ui/errorOverlayModel.test.ts, client/src/ui/errorOverlayView.ts, client/src/ui/errorOverlayView.test.ts, client/src/ui/screens/worldScreen.ts, client/src/ui/menuModel.ts, client/src/ui/menuModel.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/respond-request.spec.ts, client/e2e/pvp.spec.ts, client/e2e/pvp-side-b.spec.ts
after: [ctl-12]
- Evidence: pvpView auto-shows on an incoming challenge when nothing else is open (main.ts ≈1971-1981).
- Evidence: the error overlay closes only with F8 (B12).

- **CTL13.1:** WHEN any context is on top, THE SYSTEM SHALL drive the hint bar from a pure `hintBar(stack, bindings)` as chips (button badge + live keycap + verb).
  - In the world the bar shows `[Start] Menu [Select] Help`.
  - It adds `[A] {verb}` when there is a target.
  - It adds `[Y] View [B] Dismiss` when a notice is pending and there is no target.
  - A remap shows on the next render.

- **CTL13.2:** WHEN an incoming trade or challenge arrives, THE SYSTEM SHALL show a non-modal banner and badges on the Social entry and the Start chip, and SHALL NOT move focus or open a frame.
  - Red: today an incoming challenge auto-opens the PvP overlay.

- **CTL13.3:** WHEN Y is pressed at the world base with no target, THE SYSTEM SHALL open the top notice, and for a request this is the request screen (Accept / Decline / View). WHEN B is pressed at the world base, THE SYSTEM SHALL dismiss the top notice.
  - Notices include toasts, banners and errors.
  - The error overlay becomes a toast, dismissed by world B or F8.

- **CTL13.4:** WHEN a key with no meaning in the current context is pressed (for example the retired T, or Space in a menu), THE SYSTEM SHALL pulse the hint bar and name the right key on `#a11y-live`.

- **CTL13.5:** WHEN the game first starts in a browser, THE SYSTEM SHALL show a welcome card once that teaches the five sentences of design §1.
  - The card closes with A, B, Start or a click.
  - Its "seen" flag uses the `bindingStore` storage seam.

- **CTL13.6:** WHEN player B proposes a trade to player A, THE SYSTEM SHALL let A respond with Y then Enter from the world, with no letter hotkey.
  - `respond-request.spec.ts` is the flow's e2e.
  - `pvp.spec.ts` and `pvp-side-b.spec.ts` change only where they expected the auto-show.

### ctl-14 — generated Help; CONTROLS deleted; the "Client UI" decision superseded
category: content/i18n (B11 help) + docs · severity: MED · size: MODERATE
touches: client/src/ui/helpModel.ts, client/src/ui/helpModel.test.ts, client/src/ui/helpView.ts, client/src/ui/helpView.test.ts, client/src/ui/helpView.i18n.test.ts, client/src/ui/screens/helpScreen.ts, client/src/ui/screens/optionsScreen.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, docs/PLAYTEST.md, docs/DECISIONS.md, client/e2e/a11y.spec.ts
after: [ctl-13]
- Evidence: B11. The `CONTROLS` and `GOALS` literals in `ui/helpModel.ts` ≈26-43 are rendered raw.
- Evidence: B16. CONTROLS lacks F8, and `docs/PLAYTEST.md` ≈32-51 is an unpinned, drifting copy.
- With this slice, every item in the old decision's "Drops" list is gone. The supersession lands here.

- **CTL14.1:** WHEN Select is pressed (or Options › How to play is chosen), THE SYSTEM SHALL open Help with tabs This screen | All controls | Goals, generated from the context table, the live bindings and the catalog.
  - The tabs include F8 and F9, and a "key names vs button names" note.
  - Red: under `fr`, Help today renders English CONTROLS rows.

- **CTL14.2:** WHEN this slice merges, `CONTROLS`, `GOALS` and every English help literal SHALL be deleted together with their importers.
  - The help root keeps its id.
  - Named survivors: the generated-help tests replace `helpModel.test.ts`'s CONTROLS pins.

- **CTL14.3:** WHEN this slice merges, `docs/PLAYTEST.md`'s controls section SHALL point to in-game Help and list the default virtual buttons. `docs/DECISIONS.md` SHALL replace "Client UI: one overlay registry, keyboard first", in place, with the "Client UI: virtual buttons, one context stack, one overlay frame" entry from §"Decision drafts".
  - `a11y.spec.ts`'s Shift+Slash case asserts the generated Help contents.

### ctl-15 — pointer and touch: one dispatcher on `#game-screen`; ARCHITECTURE.md
category: ux-a11y (B12; operator pointer intent) · severity: MED · size: HEAVY
touches: client/src/input/pointerSource.ts, client/src/input/pointerSource.test.ts, client/src/input/longPress.ts, client/src/input/longPress.test.ts, client/src/ui/navView.ts, client/src/ui/navView.test.ts, client/src/ui/menuView.ts, client/src/ui/menuView.test.ts, client/src/ui/hintBarView.ts, client/src/ui/hintBarView.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/src/styles.css, client/src/main.ts, ARCHITECTURE.md, client/e2e/pointer.spec.ts
after: [ctl-14]
- Evidence: there are no `pointer*`, `contextmenu` or touch listeners. The canvas has no click handler. A document click delegate (main.ts ≈2098) handles `[data-choice-idx]`, `[data-shop-id]` and `[data-menu-launcher]`, and `menuView` moves the selection on `mouseover`.

- **CTL15.1:** WHEN the canvas is left-clicked or tapped at the world base, THE SYSTEM SHALL press A, passing no coordinates.
  - A click elsewhere at the world base does nothing.
  - Red: today a canvas click does nothing.

- **CTL15.2:** WHILE frames are open, a click or tap on a `[data-nav-key]` in the **top** frame SHALL make that item active and then press A.
  - A click on a tab-strip tab switches the tab.
  - Any other click, including on the canvas or a lower frame, is ignored.
  - The document click delegate is absorbed, so nothing is dispatched twice.

- **CTL15.3:** WHEN `#game-screen` is right-clicked, or a touch long-press completes (at least 500 ms, at most 10 px of movement, with a fill ring), THE SYSTEM SHALL press B exactly once.
  - `contextmenu` is suppressed only on `#game-screen`.
  - A right-click also cancels remap capture.

- **CTL15.4:** WHEN the pointer moves to new coordinates over a nav item, THE SYSTEM SHALL make that item active, and WHEN a key is next pressed, THE SYSTEM SHALL hide the hover state.
  - A re-render under a stationary pointer changes nothing.
  - `menuView`'s `mouseover` selection is removed.

- **CTL15.5:** WHEN a hint-bar chip is clicked or tapped, THE SYSTEM SHALL press its button or verb, so every frame can be left without a hold (B12).
  - Pointer Events throughout.
  - `touch-action: none` on the canvas and `pan-y` on scroll bodies.
  - `preventDefault` on touch `pointerdown`.

- **CTL15.6:** WHEN the operator's required flow is played with the mouse only, THE SYSTEM SHALL produce the same results as the keyboard flow, and a right-click SHALL go back one level.
  - `pointer.spec.ts` is the flow's e2e.

- **CTL15.7:** WHEN this slice merges, `ARCHITECTURE.md` § Client › UI SHALL describe the shipped pipeline.
  - The pipeline: keyboard and pointer sources → the router and binding table → the context stack with `SCREEN_POLICY` and `reconcile` → screen adapters → `dispatch`/`applyStack`; frames inside `#game-screen`; the generated hint bar and Help; `interact_candidates`.
  - The section no longer mentions `M`, `CONTROLS` or `T`.

### ctl-16 — server: no talking or shopping during an ongoing battle (NEW-2)
category: gameplay integrity (server authority) · severity: MED · size: LIGHT
touches: server-module/src/npc.rs, server-module/src/npc_tests.rs, server-module/src/economy.rs, server-module/src/economy_tests.rs
after: []
- Evidence: `talk` (`server-module/src/npc.rs` ≈261-300) has no in-battle check. Neither do `buy` (`economy.rs` ≈100) or `sell` (≈194). So a client, hostile or via B17, can mid-battle:
  - open a dialogue that applies `auto_effects` (`GrantXp`/`GrantItem`) and fires the quest Talk trigger;
  - buy cures or bait and then use them.
- Evidence: every sibling reducer that touches monsters, items or currency guards on the SSOT `guards::is_in_ongoing_battle(ctx, identity)`, including `care`, `train`, `heal_party`, `essence_train` and `consume_crystalized_essence` (raising.rs), with the error shape `"cannot X during an ongoing battle"`.
- Behaviour only: no schema change, no reducer signature change, no bindings regeneration. Runs in parallel with everything.
- `dismiss_dialogue` stays allowed, so Start can pop a dialogue suspended under a battle. `advance_dialogue` is unchanged (a named non-change, because the client never advances a suspended conversation).

- **CTL16.1:** IF `talk` is called by a player in an `Ongoing` battle in either role, THEN THE SYSTEM SHALL return `Err("cannot talk during an ongoing battle")`.
  - The guard sits after the joined and `require_not_deleting` checks.
  - No conversation row is created or replaced, no `auto_effects` apply, and no quest trigger fires.
  - Red: a native-host test in `npc_tests.rs`. Today `talk` succeeds mid-battle.

- **CTL16.2:** IF `buy` or `sell` is called by a player in an `Ongoing` battle in either role, THEN THE SYSTEM SHALL return `Err` with the same message shape, and no wallet, inventory or escrow change.
  - Red: native-host tests in `economy_tests.rs`. Today both succeed mid-battle.

- **CTL16.3:** WHEN `dismiss_dialogue` is called during an `Ongoing` battle, THE SYSTEM SHALL still succeed.
  - A native-host test pins this.

## Build order and fan-out

```
pgcc-a (other spec; first) ─┐
ctl-4 ─────────────────┐    │
ctl-1 → ctl-2 → ctl-3 ─┴→ ctl-5 → ctl-6 → ctl-7 ─┬→ ctl-8a ┐
                                                 ├→ ctl-8b │
                                                 ├→ ctl-8c │
                                                 ├→ ctl-8d ├→ ctl-10 → ctl-11 → ctl-12 → ctl-13 → ctl-14 → ctl-15
                                                 ├→ ctl-8e │      ↑
                                                 ├→ ctl-8f │    ctl-9 (any time)
                                                 ├→ ctl-8g │
                                                 └→ ctl-8h ┘
ctl-16 (any time; server-only)
```

- **`main.ts` chain (serialized):** ctl-1 → 2 → 3 → 5 → 6 → 7 → 10 → 11 → 12 → 13 → 14 → 15.
- **Parallel lanes:**
  - ctl-4 alongside ctl-1..3;
  - ctl-9 and ctl-16 at any time;
  - ctl-8a..8h fan out after ctl-7, sharing only the append-only catalog and `styles.css`.
- ctl-10 needs the converted Monsters (Box Heal button gone), Social, Dialogue/Shop and wizard screens, plus the rule (ctl-9).
- ctl-11 needs every screen converted, because accelerators push canonical paths into them.

## Bug coverage (every CONFIRMED item → its fixing slice)

| Bug | Sev | Fixed by |
|---|---|---|
| B1 blank session overlay | HIGH (latent) | ctl-8h (CTL8H.1) |
| B2 claim title/body invisible | MED | ctl-8d (CTL8D.3) |
| B3 overlays unanchored (11 shells) | HIGH | ctl-7 (9 shells + JS views), ctl-8d (claim, privacy), ctl-8h (session) |
| B4 claim ignores Escape (pgcc defect 5) | LOW | ctl-6 (CTL6.3) |
| B5 Escape dead in trade-propose/rename | MED | ctl-8d (rename, CTL8D.2), ctl-8g (wizard, CTL8G.3) |
| B6 KeyT gate differs | LOW | ctl-10 (T retired, CTL10.4) |
| B7 false-success shape (pgcc defect 2) | LOW | **pgcc-a** (kept in M-postgate-client-coverage, ordered first). The ctl-4 feedback line also never claims undelivered success |
| B8 stuck `dismissPending` (pgcc defect 4) | LOW (latent) | ctl-3 (CTL3.5) |
| B9 `'Cared!'` uncatalogued (pgcc defect 1) | LOW | **pgcc-a** (ordered first) |
| B10 bait/cure parse divergence (pgcc defect 3) | LOW (latent) | ctl-8f (CTL8F.3; selects become lists) |
| B11 menu/help English-only (= C2) | LOW-MED | ctl-5 (menu), ctl-7 (`#help-hint` literal deleted), ctl-14 (help) |
| B12 no on-screen close | MED | ctl-7 (Start chip), ctl-8f (outcome continue), ctl-13 (chips, toast), ctl-15 (right-click, long-press, chips) |
| B13 heal flow split / `locations[0]` | LOW (latent) | ctl-8a (button removed), ctl-8e (bound heal prompt), ctl-10 (dead callback deleted) |
| B14 `held.clear()` inconsistent | LOW | ctl-2 (CTL2.4) |
| B15 "nearby" copy false (= C3) | LOW | ctl-10 (CTL10.5), ctl-14 (generated help) |
| B16 drift: F8, dead test refs, 16 vs 17, g/h presses | LOW | ctl-1 (stale citations), ctl-11 (focusTrap comment, g/h deleted by name), ctl-14 (F8 in Help, PLAYTEST.md) |
| B17 Escape hides an Ongoing battle | MED | ctl-2 (movement gate), ctl-3 (frames drop on battle), ctl-6 (Start never hides a battle), ctl-16 (server) |
| B18 menu affordances | LOW | ctl-4 (indicator), ctl-5 (Right no longer enters) |
| main.ts:1711 ArrowUp/W release | LOW | ctl-1 (CTL1.2) |
| NEW-1 black-on-near-black text | HIGH | ctl-7 (CTL7.3); ctl-4 tokens |
| NEW-2 no in-battle guard on talk/buy/sell | MED | ctl-16 |
| C4 S-overlay-anchor orphaned | HIGH | ctl-7 |
| C7 DECISIONS "integer scaling" wording | LOW | ctl-5 (Boy Scout, CTL5.7) |
| C1, C5, C6, C8, C9, C10 (harness doc/ledger drift) | LOW | This spec's harness PR (housekeeping, below). Not game slices |

## Decision drafts (each landed by the slice named)

Format follows game `docs/DECISIONS.md`. The texts are drafts: the build slice's doc-keeper may tighten wording against the shipped code but keeps the decision, why and rules-out.

**1. Superseding in place, by ctl-14.** This replaces the whole entry "## Client UI: one overlay registry, keyboard first", at the same position.

> ## Client UI: virtual buttons, one context stack, one overlay frame
>
> **Decision.** Every input resolves, through one binding table (`client/src/input/bindings.ts`), to a closed set of virtual buttons: D-pad, A, B, X, Y, LB, RB, Start, Select. Letter keys are optional accelerators that open a canonical menu path. Every screen is a frame on one pure context stack (`client/src/ui/contextStack.ts`) over a world or battle base. B pops one frame. Start pops to the base, or opens the main menu at a base. `SCREEN_POLICY` is a total record per frame (owner, battle behaviour, battle-safety, arm delay). Server-owned state (battles, dialogue, requests) is reconciled into the stack on every batch, never pushed by a keypress. The client never closes a server-owned frame itself; it sends the reducer (`dismissDialogue`). Every frame renders as a class-styled `.mr-frame` inside `#game-screen` with one chrome (`frameView.ts`). Menus are D-pad lists, grids and tabs (`nav.ts`) whose active item is a highlighted key, never an index or a pointer cursor. The hint bar and Help are generated from the live bindings. Bindings persist per browser in `localStorage['mr.controls']` (versioned; D-pad, A, B and Start always keep a key). A pad device and account sync can be added without reshaping. Pure models with thin views, `OVERLAY_A11Y`, `A11Y_TOKENS`, the WAAPI ban and the total typed i18n catalog are unchanged.
>
> **Why.** The operator's intent (2026-10-01) is a handheld-console interface: a few contextual buttons are primary, and hotkeys are accelerators. The previous entry recorded the opposite, after playtest item r2-023 was closed with a single interact key. One stack makes "back one level / exit everything" uniform. It also makes it impossible to hide an ongoing battle or close a conversation client-side. Generated hints and help cannot drift from the bindings.
>
> **Rules out.** A feature reachable only by a hotkey; the `M` discovery menu; a hand-written controls list; the `T` interact key; per-overlay tiers and force-hide lists; overlays anchored to the window or in page flow; menus that hide themselves on a pick. It reverses M23's cut of key remapping.

**2. Amendment, by ctl-5.** Appended to "## Held keys: commit threshold and warp continuity".

> **Amended (console controls).** Movement is driven by virtual D-pad edges, refcounted across physical keys: releasing ArrowUp does not stop a held W. Every push of a non-base frame clears the held set, so a direction held through a menu does not resume walking when the menu closes; the player presses again. Menu auto-repeat is synthesized by the input router on an injected clock (350 ms, then 100 ms) and clamps at list ends. OS key-repeat still drives nothing. **Why.** A walk that resumes behind a closing menu is a ghost step the player did not ask for, and stale hold stamps would skip the commit threshold. **Rules out.** Resuming a held walk after a frame closes; OS repeat driving menus or movement.

**3. New entry, by ctl-10.**

> ## Interaction target: the tile in front, then your own tile
>
> **Decision.** A (and a click on the world) acts on the candidates from `game_core::interact_candidates`, exported to the client as `interact_candidates_coded`. The candidates are the entities on the tile the character faces (`pos.step(facing)`), or, if there are none, the entities on the character's own tile. Same zone only; ordered NPC, then heal, then player, then by id. An entity within range but not in front is never a candidate, even though `talk` accepts up to `TALK_RANGE` (2). The UI starts trades and challenges only from a player you face. The server stays permissive (a proximity guard is a recorded deferral).
>
> **Why.** Interaction should follow what the character faces, as in console RPGs (playtest item r2-024). The server's range is a latency margin for an NPC that steps one tile before the reducer runs. It is not the player's reach.
>
> **Rules out.** A nearest-within-range target; widening the client rule to match `TALK_RANGE`; starting a trade or challenge remotely from a menu.

No other entry meets the bar:
- face-to-face UI routing is code-evident;
- the NEW-2 guards follow the existing `is_in_ongoing_battle` pattern;
- "Bounded client prediction" is unchanged.

## Interaction with other roadmap work

**M-postgate-client-coverage** (harness PR #149, `M-postgate-client-coverage.spec.md`):

| Item | Disposition |
|---|---|
| pgcc-a (B7 shape + B9) | **Keep; run first**, before ctl-1. It is small, build-ready, touches `main.ts` and `careAction.ts`, and has no design conflict. ctl-4, ctl-9 and ctl-16 may run alongside it. |
| pgcc-b (hotkey table, Escape priority, characterization suite, defect 5) | **SUPERSEDED** by ctl-1 (router), ctl-6 (Start/B; defect 5 = B4) and ctl-11 (accelerators). Its characterization suite would pin the behaviour this milestone deletes. Mark it superseded in PR #149 before that PR merges. |
| pgcc-c C3/C4 (shop-open step, defect 4) | **Absorbed into ctl-3** (CTL3.4, CTL3.5). |
| pgcc-c C1/C2/C5 (battle-emit and ranked latches) | **Remain** in client-coverage, re-pointed `after: [pgcc-a]`. |
| pgcc-d D3 (Escape terminal-dismiss latch) | **Absorbed into ctl-6** (CTL6.5). |
| pgcc-d D5 (`<select>` parse, defect 3) | **Obsoleted by ctl-8f** (lists, no parse). |
| pgcc-d D1/D2/D4 and the `vite.config.ts` comment edit | **Remain.** Re-ground the comment: D5 is gone. |

Ordering constraints on `main.ts`:
- pgcc-c′ (C1/C2/C5) and pgcc-d′ (D1/D2/D4) never run concurrently with any slice on the ctl `main.ts` chain.
- pgcc-d′ also never runs concurrently with ctl-8a (`boxView`/`boxModel`) or ctl-8f (`battleView`/`battleModel`).
- **Recommended:** run them after ctl-15, re-grounded against the new code.
- **Acceptable:** run both before ctl-1.
- **Forbidden:** interleaving them inside the ctl chain.

**M25:**
- **S1** (trade-proposal oracles; `blocked:checkpoint-2-ratification`) is server-side and may run in parallel with any ctl slice except ctl-8g and ctl-10. All three touch `client/src/ui/tradeProposeModel.ts` and its test. Whichever lands second re-grounds. S1's `trade-zz-negative.spec.ts` is untouched here, because its proposals are hook-driven. ctl-16 touches `npc.rs`/`economy.rs`, which is disjoint from S1's `trading.rs`.
- **S2** (`battle_challenge` split) touches `pvpModel.test.ts` and `net/rowConvert.ts`. Do not run it concurrently with ctl-8c or ctl-10 (pvp view and model).
- **S4** (audit) runs after this milestone. ctl-16 adds server guards, and the audit reviews them.

**Feedback-ledger re-disposition** (for the supervisor to apply; ids are `r2-2026-07-26-NNN`):

| Item(s) | Current | New disposition |
|---|---|---|
| 006, 007, 091 (overlay design overhaul) | DISPOSED → uxd3 | M-postgate-console-controls: ctl-7 + ctl-8a..8h |
| 008, 009 (NPC panel at page bottom) | DISPOSED → uxd3 | ctl-7, ctl-8e |
| 060, 061 (retro dialogue window) | DISPOSED → uxd3 | ctl-8e |
| 013, 014, 051 (UI within the game screen) | DISPOSED → uxd1 | ctl-7 |
| 010, 011, 012, 047–050 (set-ratio game box) | DISPOSED → uxd1 (partial) | DPR/scaling delivered by uxd1; set-ratio box → named deferral (`residuals.spec.md` presentation backlog) |
| 016 (bare `/` help) | DISPOSED → uxd3 (no criterion) | ctl-6 (CTL6.7) |
| 022 (default interact key) | DISPOSED → uxd2 (delivered as T) | Superseded by ctl-10 (A on the faced target) |
| **023 (contextual buttons)** | DISPOSED → uxd2 (**mis-dispositioned**) | The whole milestone; closes at ctl-15 |
| 024 (interact in front; multi-action pick) | DISPOSED → uxd2 (partial) | ctl-9, ctl-10 |
| 025 (no trade/challenge from anywhere) | DISPOSED → uxd2 (partial) | ctl-10 |
| 026 (easter eggs via interaction) | DISPOSED → uxd2 (not delivered) | Named deferral: content milestone (`interact_candidates` entity kind) |
| 035 (case-insensitive; modifiers pass through) | DISPOSED → uxd3 (partial) | ctl-1 (CTL1.4) |
| 052, 053, 055–059 (researched console-style redesign) | DISPOSED → uxd3 | The whole milestone (design + ctl-4/ctl-7 presentation) |
| 087, 089 | IN-WORK (stale) | DONE → feel-polish (archived) |
| 088, 090 (walk speed / walk animation) | IN-WORK (stale) | Named deferral: backlog (hold-to-run reserved) |

## Spec-PR housekeeping (harness docs in this spec's PR; not game slices)

- PLAN §9:
  - Insert **M-postgate-console-controls** ahead of Playtest-3, after M25 (blocked), with pgcc-a noted as running first.
  - Mark client-coverage's pgcc-b superseded and re-scope pgcc-c/d.
  - Add an **M-gamepad** pre-release placeholder after Playtest-3.
- Fix C1: PLAN §9 item 1 and `M-postgate-twentyfirst-review-residuals.spec.md:3` still say "21r-e remaining". Both 21r-b2 and 21r-e merged.
- `residuals.spec.md`: add the named deferrals that target it (server proximity guard with its c4 B-1 requirements; compass; touch/gestures; set-ratio box).
- Fix C6: add a delivery reconciliation note for uxd1/uxd3 to `archive/M-postgate-ux-design.spec.md`.
- Fix C8: reconcile the residual count (PLAN says 29, the handoff says 17).
- Fix C9: the M18/M19 status lines (Playtest-3 gate; drop "RLS-scope" and the `evals/` direction).
- Apply C5 (stale ledger states) through the re-disposition table above.

## Post-integration verification

After ctl-15 (and ctl-16) merge, on master:
1. The full `just ci` is green, including `client-typecheck`, `client-test`, `client-verify-build`, `wasm` and the `bindings-drift` eval.
2. `just e2e` is green, including the new flows: `menu-flow`, `remap`, `pointer`, `battle-dpad`, `respond-request`, the hold-through-menu case in `movement-input`, and the typing flow in `rename`.
3. No schema or bindings change: `git diff <milestone-base>..master -- client/src/module_bindings server-module/src/schema.rs` is empty. The only `server-module` changes are ctl-16's `npc.rs`, `economy.rs` and their tests. client-wasm and its `.d.ts` are rebuilt, not regenerated bindings.
4. The operator's required flow passes end-to-end on master by **keyboard only** (`menu-flow.spec.ts`) and by **mouse only** (`pointer.spec.ts`). A manual check of the same flow under `fr` shows no English strings.
5. Every pre-existing test passes, or was changed only as a slice's criteria named. The verifier checks that every deletion names its survivor (the named-survivor list in the milestone-wide rules).
6. **Manual before Playtest-3:**
   - an NVDA pass over the main menu, a nested frame, the battle and the session gate (titles announced, no double speech, focus returns correctly);
   - one playtest-style session (explore → talk → shop → battle → menu flow → remap → reload).

   Record findings in the handoff. New defects become residuals, not slice re-opens.

## Risks / decisions

- **Operator defaults taken** (design §14, flagged so the operator can object before ctl-6):
  - (Q1) Start in battle opens the main menu read-only, with the PvP timer running;
  - (Q2) B has no second default key besides Backspace;
  - (Q3) Box, Raising and Evolution merge into Monsters with one action sheet.
- **NEW-2 is a design call** (bug validation: "design impact UNCERTAIN"). The disciplined default is to guard, matching every sibling reducer (ctl-16). ctl-16 is independent and can be dropped if the operator rules that talking or shopping mid-battle is intended.
- **Long `main.ts` serialization** (12 slices). Mitigated by the four parallel lanes and by forbidding `main.ts` edits in fan-out slices. Throughput, not correctness, is the risk.
- **Mixed control grammar between slices.** The strangler keeps the game playable, but the grammar is mixed from ctl-5 to ctl-15. **Do not raise Playtest-3 mid-milestone.**
- **The ctl-6 e2e churn is the largest single break.** Escape means Start from ctl-6 on, across 14 specs. The `closeAll()` helper and the `__game().stack` probe confine it, and in-battle presses are audited one by one.
- **Catalog and `styles.css` contention** during the ctl-8 fan-out (append-only rule; fall back to serial order).
- **Nightly mutation.** game-core's zero-miss nightly mutation run covers the new `interact.rs`. ctl-9 tests every tier and ordering branch. The `mutate-server` cap may need re-adjudication if ctl-16's guards add surviving mutants; that is a report, not a gate.
- **Narrowing the interaction rule** could strand content. Guarded by CTL9.4. A future content PR that adds an enclosed healer fails that test.
- **Platform gaps:**
  - `getLayoutMap` is Chromium-only and async → the synchronous glyph cache with fallbacks (CTL12.5);
  - `localStorage` can be unavailable (private mode) → try/catch with in-memory defaults;
  - Escape is swallowed in fullscreen → M stays a Start alias;
  - touch synthesizes mouse events → `preventDefault` on touch `pointerdown`.
- **Decisions:** three DECISIONS.md entries meet the bar (drafted above). None is needed for face-to-face routing or the NEW-2 guards.

## What the next milestone (M-gamepad) consumes

- `PhysicalInput` already has the `{src: 'pad', button}` arm. The router resolves pads through the same binding table.
- `bindingStore` v1's `devices` map takes a `pad` entry. W3C standard-mapping defaults:

  | Pad button | Virtual button |
  |---|---|
  | 0 | A |
  | 1 | B |
  | 2 | X |
  | 3 | Y |
  | 4 / 5 | LB / RB |
  | 8 | Select |
  | 9 | Start |
  | 12–15 | D-pad |
  | Triggers, stick clicks | Accelerators |

  These need no reshaping.
- The new work is only:
  - a polling `gamepadSource` (edges; disconnect → `releaseAll`);
  - a pure `stickToDpad` (deadzone, hysteresis);
  - a pad glyph family chosen by `lastSource`.
- `contextStack`, `SCREEN_POLICY`, `reconcile`, the screen adapters, nav, the frames, the hint bar and Help are unchanged.
- Steam Input (M21b-3) maps onto the same virtual buttons.
