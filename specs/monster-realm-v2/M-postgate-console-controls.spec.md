# Spec: M-postgate-console-controls — virtual buttons, one context stack, D-pad menus

**Status:** specced 2026-10-01 · build-ready; the three design §14 defaults are adopted (flagged under Risks; the operator may override) · **Project:** monster-realm. Mostly client work, plus one game-core rule with its client-wasm export (ctl-9) and one behaviour-only server slice (ctl-16) · **Surveyed against:** monster-realm master `efd3f3a0`. Line numbers are `@efd3f3a0` and will drift, so treat the cited symbol as the anchor · **Depends on:** pgcc-a (`M-postgate-client-coverage.spec.md`), which runs first · **Design SSOT:** `specs/monster-realm-v2/console-controls-design.md`. Section references like "design §N" point there · **Operator intent:** `specs/monster-realm-v2/operator-feedback-2026-10-01-controls.md` · **Doctrine:** `standards/testing-tdd.md` (verification SSOT), `standards/spec-driven.md`.

## Problem / intent

The operator's directive of 2026-10-01 asks for a primary interface modelled on a handheld console:
- A virtual D-pad plus A, B, X, Y, LB, RB, Start and Select is primary; letter hotkeys become optional, remappable accelerators. The same keys walk in the world and navigate in menus.
- A game-style highlight marks the active item; there is no mouse-like cursor.
- Start opens the main menu and also exits *all* menus, back to the world or the battle screen. B goes back one level, or performs the "alternate" interaction.
- Controls are remappable and saved per browser.
- Left-click or tap acts as A (in the world, on what the character faces); right-click or long-press acts as B.
- A later controller milestone must be a small additive change.

The operator gave a concrete acceptance flow: open the main menu → enter a submenu and pick something → back out → enter a different submenu and act → exit to the world.

Today's client cannot run that flow:
- `client/src/main.ts` holds a 13-branch letter-hotkey ladder (≈1306-1708) and a 15-branch Escape stack (≈1571-1684).
- The uxd3 menu hides itself before routing a leaf (`activateMenuLeaf`, ≈802), so the player cannot back out into it.
- Nine overlay shells render in-flow below the canvas, with black text on a near-black background (S-overlay-anchor, HIGH, orphaned; NEW-1).
- Interaction ignores facing: `nearestInteractable` picks the nearest target within 2 tiles.
- Trade and challenge can be started from anywhere on the map.

**This is a mis-disposition, not a new idea.** Playtest item `r2-2026-07-26-023` asked for "a few standard contextual buttons (GBA: A, B, LB, RB, Start, Select, D-pad)". It was DISPOSED → uxd2 with the ledger note "extend enum to close the full ask". Only the single `T` key was ever built. Related items were also closed without their criteria:
- r2-016 and r2-035 went to uxd3, which has no criteria for them.
- r2-024, r2-025 and r2-026 went to uxd2, which only partially covered them.
- r2-006–009, 013, 014, 060 and 091 went to uxd3, but the overlays were never anchored.

The recorded decision "Client UI: one overlay registry, keyboard first" (game `docs/DECISIONS.md`) wrote down the opposite of the operator's intent. This milestone supersedes that decision in place (ctl-14).

**Intent:** build the design as a strangler sequence. Every slice merges green and leaves the game playable. The milestone ends with:
- the operator's flow working by keyboard alone and by mouse alone;
- every overlay rendered as a frame inside one game screen;
- help and hints generated from the live bindings;
- the cleanup bugs below fixed.

## Scope

**In:** the input pipeline (virtual buttons, one binding table, the pure router, keyboard and pointer sources); the context stack with `SCREEN_POLICY` and `reconcile`, the nav core, frame chrome and main-menu IA; every per-screen D-pad adapter (design §5, §10); the "in front, then own tile" rule with its wasm export, world A/Y and face-to-face trade/challenge; Options › Controls remapping, the generated hint bar and Help, request banners and the error toast; the DECISIONS.md changes and the ARCHITECTURE.md UI rewrite; every CONFIRMED bug in the coverage table, including the NEW-2 server guards.

**Named deferrals** (declared, not dropped). Each `R-ctl-*` is a row in the residual registry (`memory/projects/mr-residuals.jsonl`, unpromoted, target backlog), not a `residuals.spec.md` section; the others name a milestone:

| Deferred | Target |
|---|---|
| Gamepad support | **M-gamepad** (`M-gamepad.spec.md`, PLAN §9) |
| Steam Input | M21b-3 |
| Server proximity guard on `propose_trade`/`challenge_pvp`. Carries the c4 B-1 requirements: a pure game-core `within_interact_range`; the character looked up via `p.entity_id` as `talk` does; the guard placed after the joined, `require_not_deleting` and counterparty-joined checks; fixtures that seed co-located characters; one uniform error with no zone oracle; lands after ctl-10b | → residual R-ctl-PROXGUARD (backlog [security-privacy/LOW]) |
| Players compass and distance text | → residual R-ctl-COMPASS (backlog [ux-a11y/LOW]) |
| Touch walking, swipes, gestures | → residual R-ctl-TOUCHWALK (backlog [ux-a11y/LOW]) |
| Set-ratio game box (r2-010/047-050) | → residual R-ctl-SETRATIO (backlog [ux-a11y/LOW]) |
| Signs and objects as interactables (r2-026); plug point is a new `interact_candidates` entity kind | → residual R-ctl-OBJINTERACT (backlog [content/LOW]) |
| Walk speed / hold-to-run (r2-088/090); a hold is free for it | → residual R-ctl-RUN (backlog [gameplay/LOW]) |
| First-run welcome card | → residual R-ctl-WELCOME (backlog [ux-a11y/LOW]) |
| `navigator.keyboard.getLayoutMap()` keycap glyphs | → residual R-ctl-LAYOUTMAP (backlog [ux-a11y/LOW]) |
| Account sync of bindings | → residual R-ctl-BINDSYNC (backlog [ux-a11y/LOW]), target the M21b account/platform follow-on |
| Counter-style reach (a facing ray beyond one tile) | Not scheduled; only if content needs it. CTL9.4 guards today's maps |
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

- **Pure cores, thin shells.** Every new decision lives in a pure module with no DOM, SDK, module state or wall clock; time is an injected clock. Each module is tested by colocated vitest (`x.test.ts`). Use table cases, and use fast-check only where the input space is genuinely combinatorial: binding invariants, router refcount and ownership, `navReconcile`, `reconcile` idempotence, and press counts. Views stay thin, and their DOM tests run in jsdom.
- **EARS criteria are behaviour.** Each is testable by an ordinary test or by its slice's one e2e flow. Doc deliverables, symbol deletions and test migrations are slice **Tasks**, verified by review.
- **One e2e per user flow** (never one per criterion):

  | Flow | Home | Slice |
  |---|---|---|
  | Movement hold-through-menu (hold W, open a menu, close it: no step; Ctrl+P is not prevented) | `client/e2e/movement-input.spec.ts` | ctl-1, ctl-2 |
  | Typing (rename opens already typing; Escape stops typing; Enter commits) | `client/e2e/rename.spec.ts` | ctl-8h |
  | D-pad-only battle, plus Start closing a menu back to the battle | NEW `client/e2e/battle-dpad.spec.ts` | ctl-8j |
  | The operator's menu flow, keyboard only | NEW `client/e2e/menu-flow.spec.ts` | ctl-11b |
  | Remap | NEW `client/e2e/remap.spec.ts` | ctl-12 |
  | Respond to a request (Y, Enter) | NEW `client/e2e/respond-request.spec.ts` | ctl-13 |
  | The operator's menu flow, mouse only, plus right-click = B | NEW `client/e2e/pointer.spec.ts` | ctl-15 |

  - E2e presses go through the shared helper `client/e2e/controls.ts` (NEW in ctl-6a): `pressButton`, `pressAccel` and `closeAll`.
- **No forbidden check shapes.** No source-text scans, no greps of keymaps, no coverage or mutation thresholds, no checks of checks, and no eval files. Key-name and ownership tests feed events and assert outcomes.
- **Existing tests pass unmodified**, except tests a slice's Tasks name as intentionally changed. A test may be deleted only under `testing-tdd.md` "Deleting a check": the slice names the reason and the surviving check by path and test name (or "tester names it" for a NEW test), the replacement lands first, and it is watched failing on the real defect.
- **Named survivors** (design §16):

  | Retired check | Survivor | Deleting slice |
  |---|---|---|
  | Dialogue desync (old Escape guard cases) | `contextStack.test.ts` reconcile cases (tester names them) + `client/e2e/dialogue.spec.ts` | ctl-6b |
  | S5T focus no-steal/return, S5T-GATE world-focus cases (`main.a11yFocus.test.ts`) | `contextStack.test.ts` focus cases (ctl-5) + `router.test.ts` ownership cases (ctl-1, ctl-11b) | ctl-11b |
  | `overlayRegistry.test.ts` force-hide exactness and tier cases | `contextStack.test.ts` `SCREEN_POLICY` reconcile cases | ctl-3 (force-hide), ctl-11b (tiers) |
  | Privacy flow via the legacy overlay | Profile › Privacy flow in `client/e2e/monster-privacy.spec.ts` | ctl-8h |
  | `movement-input.spec.ts` test C (walk resumes on close) | the hold-through-menu test in the same file | ctl-2 |
  | `trade.spec.ts` ≈195/≈205 `g`/`h` presses (they assert nothing) | none needed | ctl-11a |
  | `interactModel.test.ts` rule cases | `game-core/src/interact_tests.rs` + `interactModel.test.ts` marshalling cases | ctl-10a |
  | `menuModel.test.ts` MM-KEYGLYPH-FROM-HELP-SSOT | none: leaves stop carrying glyphs, so the invariant is vacuous; ctl-14's generated-help tests list accelerators | ctl-5 |
  | `helpModel.test.ts` CONTROLS pins, `helpView` tests | generated-help tests (tester names them) | ctl-14 |
  | mutual-exclusivity e2e (`pvp.spec.ts` ≈108/≈136/≈161, `trade.spec.ts` ≈119, ≈190-205) | the same tests rewritten to assert that an accelerator replaces the open screen + `contextStack.test.ts` accelerator cases | ctl-11a |

  SHAPE-05 (`t()`'s pinned signature) stays green throughout.
- **Frozen seams:**
  - Legacy overlay root ids, `data-testid`s and the `display:none` visibility contract survive. Each legacy root becomes the root of a frame, tab panel or sheet.
  - Dev hooks `__game`, `__mrTrade` and `__mrPvp` (`main.ts` ≈2377-2379) stay unchanged. `__game()` grows only additively, gaining `stack` (ctl-2) and `navActive` (ctl-5).
  - `styles.css` stays class and `:root` only (A11Y-12). `#a11y-live` stays a `<body>` child in `index.html` (A11Y-10); its adoption into the top frame is ctl-5's.
  - `data-choice-idx`, `data-shop-id` and `data-menu-launcher` stay on their elements until ctl-15 absorbs the document click delegate.
- **Strangler.** Master is green, and the game is playable end-to-end by keyboard, after every slice. Each legacy key retires in the same slice as its replacement, so every key has exactly one owner at every slice boundary.
- **i18n.** Every new player-visible string is a catalog id in both `catalog.en.ts` and `catalog.fr.ts` (plus `messageIds.ts`); `t()` throws on a missing id.
  - Ids reach `t()`/`tf()` only as literals at the call site. Table-driven text (menu titles, disabled reasons, hint verbs, key names, help rows) is stored as thunks, `() => t('lit.id')`, so `catalogParity.test.ts`'s DYNAMIC-KEY and DEAD-KEY checks stay green without amendment. The key-name table is a typed `Record<KeyCode, () => string>`.
  - Glyph marks (▶ ▼ ✓ !) and button letters are never TS string literals written to a DOM sink. They come from CSS pseudo-elements on `data-` attributes, or from catalog glyph ids, so `hardcodedStrings.test.ts` (ceiling 0) stays green.
- **File naming.** `overlayRegistry.test.ts` OR-MANIFEST-COMPLETE pins the `client/src/ui/*View.ts` set to `OVERLAY_IDS` plus `errorOverlayView` and `sessionView`. A new file in `client/src/ui/` ends in `View.ts` only if it is a new `OverlayId` with an `OVERLAY_A11Y` entry; the only one is `controlsView` (ctl-12). Helpers use other names (`navRender.ts`, `frame.ts`, `hintBar.ts`). Screen adapters live in `client/src/ui/screens/`, which the scan does not read.
- **Smoothness contract preserved.**
  - The D-pad feeds the existing `step()` and `held` seam. `HOLD_COMMIT_MS` and the re-issue mechanism are unchanged; only the gate they consult becomes `movementEnabled` (ctl-2).
  - `main.boot` BOOT-MOVE / 14R-E and `movement-input.spec.ts` keep passing, except the named test-C replacement.
- **`main.ts` is a serialization point.** The `main.ts` chain is pgcc-a → ctl-1 → 2 → 3 → 5 → 6b → 6c → 7a → 7b → 10a → 10b → 11a → 11b → 12 → 13 → 14 → 15 → pgcc-c → pgcc-d. ctl-4, ctl-6a, ctl-8a–8k, ctl-9 and ctl-16 never touch it.
- **The ctl-8 screens are a serial chain.** Every screen slice appends to the catalogs, `messageIds.ts` and `client/src/ui/screens/index.ts`, and the i18n gates read those files as text, so they run one at a time in consumer order (see "Build order"). A screen slice changes only its own `screens/<name>Screen.ts`, its model/view files, its `screens/index.ts` entry, the catalogs and its e2e. If it needs a new `Command` arm or other `main.ts` wiring, that is a hidden dependency: stop and surface it, as the build loop requires.

## Slices

Each criterion is an id-led bullet (`**CTL1.1:**` …) with the SHALL in its lead sentence, so `mr-gates init` seeds one gate per id. Sub-bullets carry detail only. Evidence, Notes and Tasks bullets carry no criteria.

### ctl-1 — input foundation: virtual buttons, one binding table, router owns the D-pad and Space
category: input architecture + gameplay defect · severity: MED · size: MODERATE
touches: client/src/input/buttons.ts, client/src/input/bindings.ts, client/src/input/bindings.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/input/keyboardSource.ts, client/src/input/keyboardSource.test.ts, client/src/main.ts, client/src/main.input.test.ts, client/e2e/movement-input.spec.ts
after: [pgcc-a]
- Evidence @efd3f3a0: `KEY_DIR` (main.ts ≈1230) maps W and ArrowUp to North. `HeldDirections.press` is a no-op for an already-held direction, and `release(dir)` filters by direction (`prediction/heldKeys.ts:57-70`). The keyup at main.ts ≈1711 therefore stops a held W when ArrowUp is released.
- Evidence: `main.ts` checks no `ctrlKey`/`altKey`/`metaKey`, and every hotkey calls `preventDefault`. Ctrl+P opens the PvP overlay and swallows the browser's print (r2-035).
- Intent (design §3, §12; migration rule 2): the router replaces the ladder's movement and Space steps (≈1686-1708) **at the same position in the ladder**. The session gate, `e.repeat`, the focus heal, F8/F9, the menu intercept and the letter hotkeys still run first. Every other key falls through to the legacy ladder.
- Notes: the binding table is complete from this slice (LB/RB = Q/E with PageUp/PageDown aliases), but the router consumes LB/RB only from PageUp/PageDown until ctl-11a (CTL6B.6). Sources map physical input to virtual buttons through the one table; the router sees only `{button, down}` edges, so M-gamepad adds a source without touching the router.
- New files: everything under `client/src/input/`, `client/src/main.input.test.ts`.
- Tasks: correct the stale `main.wiring.test.ts` citations at main.ts ≈199 and ≈1309 (part of B16). Add the W/ArrowUp refcount case and a Ctrl+P not-prevented case to `movement-input.spec.ts`.

- **CTL1.1:** WHEN a key event arrives, THE SYSTEM SHALL resolve it by `e.code` through one binding table (`DEFAULT_BINDINGS`) into `{button, down}` edges, and the router SHALL consume D-pad and X edges with today's movement semantics.
  - The table holds the full design §3 default keymap and aliases. Shift and letter case are ignored.
  - In this slice the router consumes only D-pad edges (W/A/S/D, arrows) and X (Space).
  - D-pad at the world: `e.repeat` is ignored, the `held.isHeld` dedupe stays, and one immediate `step()` is followed by `held.press(dir, now)`.
  - X (Space) with the world focused and no overlay open sends exactly one Jump intent.
  - `blur` and `visibilitychange: hidden` release every virtual button (`visibilitychange` is new).

- **CTL1.2:** WHEN two physical keys bound to the same direction are held and one is released, THE SYSTEM SHALL keep that direction held until the last bound key is released.
  - Red: hold W, press and release ArrowUp. Today the character stops (main.ts ≈1711).

- **CTL1.3:** WHEN Ctrl, Alt or Meta is held with any key, THE SYSTEM SHALL leave the event to the browser untouched, and SHALL call `preventDefault` only for edges the router consumes.
  - No hotkey and no movement fire for a chord.
  - Red: a booted test in `main.input.test.ts` presses Ctrl+P. Today it opens the PvP overlay and is `defaultPrevented`.

- **CTL1.4:** WHEN the event's target owns the key, THE SYSTEM SHALL route no edge for it, as decided by a pure `ownership(target, event)`.
  - An IME composition (`isComposing`, or keyCode 229) owns every key.
  - An `INPUT`, `TEXTAREA`, `SELECT` or contentEditable target owns every key except Escape and Enter. Those two reach the router only once ctl-6b routes them; until then they fall through to the ladder.
  - A focused native `<button>` or `<a>` owns Enter and Space: Space on a focused button is neither consumed nor turned into a jump (`main.a11yFocus` S5T-SPACE-BUTTON keeps passing).
  - `router.test.ts` feeds events with each target kind and asserts the edges.

- **CTL1.5:** WHEN a source other than the keyboard emits `{button, down}` edges, THE SYSTEM SHALL route them through the same router to the same outcome as the equivalent key.
  - Test: a fake source in `router.test.ts` emitting Down press/release produces the same world step and release as KeyS.

### ctl-2 — context stack behind the existing show/hide; one movement gate; push clears held keys
category: input architecture + gameplay defect · severity: MED · size: MODERATE
touches: client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/main.input.test.ts, client/e2e/movement-input.spec.ts
after: [ctl-1]
- Evidence: `anyOverlayVisible()` gates movement at main.ts ≈1114 (divergence snap), ≈3211 (frame-loop re-issue), ≈3270 (`overlayUp`) and in the ladder (≈1686). The session gate is a separate check (≈455-461).
- Evidence: B17. Escape on an `Ongoing` battle hides `battleView` (≈1592-1600). Until the next batch, movement is live mid-battle, the server rejects the steps, and the character rubber-bands back.
- Evidence: B14. Of the hotkey open paths, only N/O/?/M/C call `held.clear()`.
- Intent (design §4, migration rule 3): the stack lands *behind* the legacy show/hide paths and mirrors them. No key routing changes in this slice. The base is derived on the same `store.onBatchApplied` hook: `battle` whenever the latest own battle row is `Ongoing`, else `world`. Full server reconcile is ctl-3.
- Tasks: replace `movement-input.spec.ts` test C (walk resumes on close) with the hold-through-menu test, which holds W, opens the menu (M), closes it and expects no step until W is pressed again. The replacement keeps an anti-vacuity arm (pressing W again does walk), so it cannot pass on a dead world. Test C is deleted by name; this deliberately reverses the behaviour documented at main.ts ≈3204.

- **CTL2.1:** THE SYSTEM SHALL represent UI state as a pure stack of frames over a `world` or `battle` base, with a pure `contextStep(stack, edge) → {stack, commands}`.
  - The frame union is `world | battle(id) | screen(id, nav) | prompt(id, nav) | textEntry(owner)`.
  - `SCREEN_POLICY` is a total `Record<FrameId, {owner, onBattle, battleSafe}>`, so an omitted frame id fails `client-typecheck`.

- **CTL2.2:** WHEN any legacy overlay opens or closes through its existing path, THE SYSTEM SHALL push or pop the matching frame, so that `__game().stack` reports the live frames.
  - The `stack` field is additive. Every existing overlay behaviour is unchanged.
  - `__game().stack` lists frames base-first, base included; "above the base" means length > 1 everywhere in this spec.

- **CTL2.3:** THE SYSTEM SHALL gate movement through one pure `movementEnabled(stack, sessionGate)`, which replaces every `anyOverlayVisible()` movement use: the ≈1114 snap, the ≈3211 re-issue, the ≈3270 `overlayUp`, and the ladder suppression.
  - The gate is false whenever the stack holds a `battle` base, even while `battleView` is hidden.
  - A D-pad press under a non-world frame never reaches `HeldDirections`.
  - Red: B17. Start a wild battle, press Escape, press W. Today the character predicts a step.

- **CTL2.4:** WHEN any non-base frame is pushed, THE SYSTEM SHALL call `held.clear()`.
  - Red: B14. Hold W and press B. Today `held` stays latched.

- **CTL2.5:** WHEN a direction is held while a frame opens and that frame then closes, THE SYSTEM SHALL NOT walk until the direction is pressed again.
  - `movement-input.spec.ts`'s hold-through-menu test is this criterion's e2e.

### ctl-3 — reconcile server truth into the stack (battle, dialogue, shop-open, reconnect)
category: correctness (server-owned frames) · severity: MED · size: MODERATE
touches: client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/shopOpenModel.ts, client/src/ui/shopOpenModel.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/main.ts, client/src/main.dialogueDismiss.test.ts
after: [ctl-2]
- Evidence: `BATTLE_FORCE_HIDE` does not cover dialogue, shop, trade, pvp, questLog, heal or claim. Those overlays stay standing on top of a battle (r2 inventory §1.6, B17).
- Evidence: B8. `dismissPending` is set inside the send lambda (main.ts ≈1632-1640 and ≈2109-2120). When `live()` is undefined, no promise comes back and the flag sticks.
- Evidence: the dialogue batch listener (≈1861-1886) consumes `pendingShopId`.
- Absorbs pgcc-c C3/C4 (the shop-open step and defect 4) from `M-postgate-client-coverage.spec.md`.
- Notes: reconnect keeps `resetPredictionState`; `main.battle-reseed.test.ts` and `main.feedbackI18n.test.ts` already guard it.
- New files: `shopOpenModel.ts`, `shopOpenModel.test.ts`, `main.dialogueDismiss.test.ts`.
- Tasks: delete `BATTLE_FORCE_HIDE`, `NEVER_FORCE_HIDE` and `hideAllExceptPlan`; the `overlayRegistry.test.ts` force-hide exactness cases become `SCREEN_POLICY` reconcile cases in `contextStack.test.ts` first.

- **CTL3.1:** THE SYSTEM SHALL reconcile server state into the stack on every `store.onBatchApplied` through a pure, idempotent `reconcile(stack, serverView) → {stack, commands}`.
  - Property: `reconcile(reconcile(s, v), v)` equals `reconcile(s, v)`.

- **CTL3.2:** WHEN a battle appears, THE SYSTEM SHALL pop every frame whose policy is `drop`, keep `suspend` frames (dialogue) beneath the battle, and keep a terminal outcome shown until it is continued (`dismissedBattleId`).
  - Red: open the shop, then start a battle. Today the shop overlay stays over the battle.

- **CTL3.3:** WHEN reconcile pops a frame whose legacy overlay is shown, THE SYSTEM SHALL close it through that view's own hide path, so the view's close callbacks run.
  - Example: `privacyView`'s `onDismissed` fires as it does on a manual close.
  - This is the seam until ctl-6b's `applyStack` owns show/hide.

- **CTL3.4:** WHEN a conversation appears, THE SYSTEM SHALL pop player-owned frames and push the dialogue frame, and WHEN the conversation goes, THE SYSTEM SHALL pop it.
  - A conversation that ends server-side while suspended under a battle is dropped silently: no toast, no focus change. This is a named test row.
  - The client never closes dialogue itself. Popping a dialogue frame emits `dismissDialogue`.

- **CTL3.5:** WHEN given `(state, event)`, a pure shop-open step SHALL return the next `{dismissPending, pendingShopId}` plus at most one effect (`sendDismiss`, `openShop(id)`).
  - The events are dismiss-requested, shop-picked(id), dismiss-rejected(path), dismiss-not-sent(path), batch(conversationPresent) and reconnect.
  - It never sends a dismiss while one is pending, and a dismiss request cancels a pending shop-open.
  - Rollback is per path, exactly as the former pgcc-c C3 stated.
  - The first no-conversation batch clears `dismissPending` and consumes `pendingShopId`. `openShop` then pushes the shop frame, unless the stack holds another player frame, in which case the open is dropped.
  - Reconnect clears both.

- **CTL3.6:** IF a dismiss send produces no reducer call (a frozen link, or `live()` yields no connection), THEN THE SYSTEM SHALL leave `dismissPending` unset (B8).
  - Red: `main.dialogueDismiss.test.ts`, using the booted mock harness. Dismiss with `live() === undefined` and the link not frozen, let `live()` recover, then dismiss again. Today the second dismiss sends nothing.

### ctl-4 — nav core, nav render and frame chrome (presentation kit, unwired)
category: ux-a11y (navigation model) · severity: MED · size: MODERATE
touches: client/src/ui/nav.ts, client/src/ui/nav.test.ts, client/src/ui/navRender.ts, client/src/ui/navRender.test.ts, client/src/ui/frame.ts, client/src/ui/frame.test.ts, client/src/styles.css
after: []
- Intent (design §6, §10): the shared kit every screen adapter uses. It touches no `main.ts` and runs alongside pgcc-a and ctl-1..3.
- Evidence: B18. The uxd3 menu marks the selected row with bold weight only (`ui/menuView.ts` ≈183).
- Notes: the ▶ gutter mark, inverted band, 2 px frame and 9-slice border are styling guidance (design §6, §10), not criteria.
- New files: all six source files above.

- **CTL4.1:** THE SYSTEM SHALL model navigation as pure layouts `list(items) | grid(items, cols) | tabs([{key, layout}])` over `NavItem = {key, enabled, reason?}`, storing the active item by **key**.
  - When content changes, `navReconcile` keeps the key, or else moves to the nearest index. This is a fast-check property.

- **CTL4.2:** WHEN a fresh D-pad or LB/RB edge arrives, THE SYSTEM SHALL wrap at the ends, and WHEN a repeat-flagged edge arrives, THE SYSTEM SHALL clamp at the ends.
  - Lists wrap top↔bottom, grids wrap within the row or column, and tabs wrap (RB on the last tab goes to the first; LB on the first goes to the last).

- **CTL4.3:** WHEN A is pressed on a disabled item, THE SYSTEM SHALL return that item's reason and perform no action.
  - Disabled items stay reachable.

- **CTL4.4:** THE SYSTEM SHALL remember the active entry, tab and per-tab item in a session-scoped `NavMemory` keyed by frame.

- **CTL4.5:** WHEN a nav layout renders, THE SYSTEM SHALL expose one persistent container as the single tab stop, with `aria-activedescendant` naming the active item.
  - Roles are `listbox`/`option`, `grid`/`gridcell` and `tablist`/`tab`.
  - Ids are stable, in the form `{frame}-{tab}-{key}`, with `aria-selected` and `aria-disabled`.
  - Rows are diffed, so DOM focus survives a re-render.
  - The active item carries an `is-active` class and `aria-selected`, so its marking never relies on colour alone.

- **CTL4.6:** THE SYSTEM SHALL render frame chrome through one `frame.ts`: a title bar (title, breadcrumb, tab strip with LB/RB slots), an internally scrolling body, one feedback line and a hint-bar slot, in the sizes side panel, full, bottom box and small.
  - The feedback line shows success only after the caller reports resolution.

### ctl-6a — e2e helpers and migration of prophylactic Escape presses (test-only)
category: test infrastructure · severity: MED · size: MODERATE
touches: client/e2e/controls.ts, client/e2e/a11y.spec.ts, client/e2e/accounts.spec.ts, client/e2e/dialogue.spec.ts, client/e2e/encounter-battle.spec.ts, client/e2e/evolution.spec.ts, client/e2e/monster-privacy.spec.ts, client/e2e/pvp.spec.ts, client/e2e/pvp-side-b.spec.ts, client/e2e/ranked-forfeit.spec.ts, client/e2e/recruit.spec.ts, client/e2e/rename.spec.ts, client/e2e/trade.spec.ts, client/e2e/trade-propose.spec.ts, client/e2e/wallet-balance.spec.ts
after: [ctl-3]
- Intent (design §16): from ctl-6b on, Escape means Start, so at a world base it **opens** the menu. Prophylactic "dismiss any stale overlay" presses would leave a menu open. This slice moves them onto a helper that is correct under both semantics, and lands green before Escape changes meaning.
- Notes: `controls.ts` imports only pure modules (`client/src/input/bindings.ts`), so it loads under Playwright without Vite.
- New files: `client/e2e/controls.ts`.
- Tasks:
  - `pressButton(page, button)` and `pressAccel(page, accel)` press the first key bound in `DEFAULT_BINDINGS`; ctl-12 extends them to the live table.
  - `closeAll(page)` presses the first Start key only while `__game().stack` has length > 1, and returns once it is at the base.
  - Replace every prophylactic Escape in the listed specs with `closeAll()`, including rename ≈220, pvp-side-b ≈202, trade-propose ≈208 and `recruit.spec.ts` `healViaBox`'s Escape+KeyB retry.
  - Leave Escape presses that act on a battle's terminal outcome (encounter-battle ≈305) as `pressButton('Start')`; Start continues a terminal outcome from ctl-6b on, as Escape does today.

- **CTL6A.1:** IF `closeAll(page)` cannot bring `__game().stack` to length 1 within a bounded number of Start presses, THEN THE SYSTEM SHALL fail the test with a message naming the stuck top frame.

### ctl-5 — the main menu on the nav core: A pushes the child above the menu, B returns to it
category: ux-a11y (the operator's flow) · severity: HIGH · size: HEAVY
touches: client/src/ui/menuModel.ts, client/src/ui/menuModel.test.ts, client/src/ui/menuView.ts, client/src/ui/menuView.test.ts, client/src/ui/screens/types.ts, client/src/ui/screens/mainMenuScreen.ts, client/src/ui/screens/mainMenuScreen.test.ts, client/src/ui/overlayA11y.ts, client/src/ui/overlayA11y.test.ts, client/src/ui/liveRegion.ts, client/src/ui/liveRegion.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/a11y.spec.ts, docs/DECISIONS.md
after: [ctl-4, ctl-6a]
- Evidence: `activateMenuLeaf` (main.ts ≈802) hides the menu before routing, so B-style back-out is impossible.
- Evidence: `menuKeyInput` maps ArrowRight/KeyD to "enter" (B18).
- Evidence: the `MENU_TREE` titles, `'Menu'` and the back hints are English literals (B11, menu part).
- Evidence: R-rb-121. The `setTimeout(0)` focus callback in `overlayA11y.ts` ≈134 does not re-check `document.activeElement`, so a click inside a frame in the same macrotask is pulled to the initial anchor.
- Intent (design §5): entries are Monsters, Bag, Journal, Social, Profile, Options and Close. Until the ctl-8 slices land, each entry's child is the legacy overlay or a small sub-list: Monsters → box; Bag → raising; Journal → quest log; Social → Trades / Challenges / Rankings; Profile → Name / Account / Privacy; Options → How to play (legacy help).
- Seam until ctl-6b:
  - M and the `#help-hint` click still open the menu; Escape still closes the top legacy overlay through the Escape stack.
  - The legacy intercept's `menuKeyInput` handling (main.ts ≈1340) is deleted here; the router drives the menu frame through `mainMenuScreen`.
  - B (Backspace) with a legacy child above the menu: the router pops that non-menu top frame through the CTL3.3 hide path, until ctl-6b's `legacyAdapter` takes over.
  - `canOpen` and the overlay tiers treat the menu as non-exclusive, so a child may open over it.
- New files: `screens/types.ts`, `screens/mainMenuScreen.ts` and its test.
- Tasks:
  - Rewrite "Held keys: commit threshold and warp continuity" in place in `docs/DECISIONS.md` with draft 2 (§"Decision drafts"); no appended "Amended" block.
  - C7: correct "Integer pixel scaling" in place. This is substantive, not wording: the Decision becomes "integer device scale; the CSS stage scale is fractional" (`render/viewport.ts` ≈13-17), and the Rules-out line "Fractional stage scales" becomes "Fractional device scales".
  - Rewrite `menuModel.test.ts` for the new tree. Delete MM-KEYGLYPH-FROM-HELP-SSOT by name (survivor in the milestone table).
  - Retarget the `a11y.spec.ts` KeyM assertions (≈272, ≈301) to the new entries, and re-measure and re-baseline `PASSES_FLOOR_MENU` and `INCOMPLETE_CEILING_MENU` by name.
  - The `a11y.spec.ts` keyboard-pass test (≈332-369) asserts `menu-option-categories-*` ids and ArrowLeft back-out; retarget it to the new menu's nav ids and B back-out (named intentional change). Its Tab-to-`#help-hint` step is ctl-7a's.

- **CTL5.1:** WHEN the main menu opens, THE SYSTEM SHALL show the design §5 entries as a wrapping nav list in a right-hand side panel, with every title and description from the catalog in `en` and `fr`.
  - Red: under `fr`, today's menu titles render in English.

- **CTL5.2:** WHEN A is pressed on a menu entry, THE SYSTEM SHALL push that entry's child frame above the menu, leaving the menu open beneath it, and WHEN that child closes by any path, THE SYSTEM SHALL return to the menu with the cursor on that entry.
  - "Any path" is B (Backspace), the child's legacy Escape branch, or its own close control.
  - B at the menu root closes the menu. Right/D no longer activates an entry.
  - Red: open a leaf and press Backspace. Today the menu is already closed.

- **CTL5.3:** WHEN the menu reopens within a session, THE SYSTEM SHALL place the cursor on the last-used entry, and `__game()` SHALL report it as `navActive`.

- **CTL5.4:** WHEN Y (F) is pressed on a menu entry, THE SYSTEM SHALL show that entry's description on the frame's feedback line.

- **CTL5.5:** WHILE a D-pad button stays held under a nav frame, THE SYSTEM SHALL synthesize repeat edges from `router.tick(now)` on the injected clock: the first after 350 ms, then every 100 ms.
  - Repeat edges clamp at the list ends. OS key-repeat still drives nothing.
  - Every push and pop resets the repeat state, so a held key never repeats into a new frame.

- **CTL5.6:** WHEN a frame is pushed above another, THE SYSTEM SHALL make the lower frame `inert` and `aria-hidden` and suspend its focus trap, and WHEN it is popped, THE SYSTEM SHALL restore both.
  - A single pop returns focus to the parent's nav container. A multi-level pop to a base restores focus once, to the canvas.
  - `#a11y-live` is re-adopted into the top frame on every push and pop, and returned to `<body>` at a base.
  - Active-descendant changes are not mirrored into `#a11y-live`.

- **CTL5.7:** WHEN a frame's deferred focus callback fires, THE SYSTEM SHALL skip the focus move if `document.activeElement` is a connected element inside that frame's root (R-rb-121).
  - Red: `overlayA11y.test.ts` focuses an element inside the root before the callback runs. Today focus is pulled to the initial anchor.

### ctl-6b — the screen-adapter seam; Start / B / Select; typing mode; the Escape stack retired
category: ux-a11y + gameplay defect · severity: HIGH · size: HEAVY
touches: client/src/ui/screens/types.ts, client/src/ui/screens/legacyAdapter.ts, client/src/ui/screens/legacyAdapter.test.ts, client/src/ui/screens/index.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/main.ts, client/src/main.a11yFocus.test.ts, client/src/main.privacyWiring.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-5]
- Evidence: the 15-branch Escape stack (main.ts ≈1571-1684) has no claimView branch (B4 / pgcc defect 5).
- Evidence: battle Escape hides an `Ongoing` battle (B17).
- Evidence: help matches `e.key === '?'` (≈1517), so a bare `/` does nothing (r2-016).
- Evidence: B5. Rename and trade-propose controls call `stopPropagation`, so Escape is dead inside them.
- Absorbs pgcc-d D3 (the terminal-dismiss latch). Supersedes pgcc-b's routing and Escape-priority work.
- Intent (design §4, §12): one `legacyAdapter` serves every screen in legacy DOM-button mode (A → `unhandled`, so native activation owns Enter; B → pop; Start → pop to base). `screens/index.ts` holds a total `SCREEN_ADAPTERS: Record<FrameId, ScreenAdapter>`, every entry `legacyAdapter` until its ctl-8 slice swaps it.
- New files: `legacyAdapter.ts` and its test, `screens/index.ts`.
- Tasks:
  - Delete the 15-branch Escape stack and `activateMenuLeaf`'s hide-first path.
  - `main.a11yFocus.test.ts` and `main.privacyWiring.test.ts` change only where they press Escape (named intentional change).

- **CTL6B.1:** THE SYSTEM SHALL route each virtual-button edge to the top frame's `ScreenAdapter.onButton(vm, nav, btn) → Command | consumed | unhandled`, and `main.ts` SHALL run an exhaustive `dispatch(command)` plus `applyStack(prev, next)`.
  - The `Command` union covers every reducer action a screen issues today: care, train, evolve, set nickname, set party slot, buy, sell, trade respond/confirm/cancel, challenge accept/decline/cancel, propose trade, challenge, set profile name, the battle actions, heal party, advance dialogue and dismiss dialogue, plus the claim and privacy actions. A missing arm fails `client-typecheck` (`never` check).
  - Adapters get a read-only `ScreenContext` (store reads, identity, bindings, clock), so screens build their own view models.

- **CTL6B.2:** WHEN Start (Escape or M) is pressed above a base, THE SYSTEM SHALL pop to that base, and WHEN Start is pressed at the world base, THE SYSTEM SHALL push the main menu.
  - Popping a dialogue frame emits `dismissDialogue`.
  - At a battle base, Start on a terminal outcome continues (sets `dismissedBattleId`; a pure rule sets it if and only if the latest battle is terminal, pgcc-d D3). Start on an ongoing battle does nothing in this slice; ctl-6c gives it the menu.
  - Red: B17. Today Escape on an ongoing battle hides the battle view.

- **CTL6B.3:** WHEN B (Backspace) is pressed with a non-base frame on top, THE SYSTEM SHALL pop exactly one frame, and claimView SHALL close on B and on Start.
  - Red: B4. Press C, then Escape. Today claim stays open.

- **CTL6B.4:** WHEN Select (R, or the `Slash` code with or without Shift) is pressed, THE SYSTEM SHALL toggle Help.
  - The `e.key === '?'` branch is retired. Red: r2-016. Today a bare `/` does nothing.

- **CTL6B.5:** WHILE a text field or a `textEntry` frame owns input, THE SYSTEM SHALL let the field own every key except Escape and Enter: Escape stops typing and keeps the text (the next Escape acts as Start), and Enter commits through the owner's `Command`.
  - This is the one typing-mode criterion; ctl-8b, ctl-8e and ctl-8h reference it.
  - Escape pressed inside the field reaches the router (views stop calling `stopPropagation`).
  - A focused native `<button>` or `<a>` still owns Enter and Space (CTL1.4).
  - Red: B5. Focus `#rename-submit` and press Escape. Today nothing happens.

- **CTL6B.6:** WHILE the legacy ladder owns Q and E (until ctl-11a), THE SYSTEM SHALL resolve LB/RB only from PageUp/PageDown and pass Q and E to the ladder.
  - Test: Q at the world still opens the Journal; PageDown on a tabbed screen reaches its adapter as RB.

### ctl-6c — battle semantics: Start over an ongoing battle, outcome continue, the battle-safe policy
category: gameplay defect (B17) · severity: MED · size: MODERATE
touches: client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/screens/mainMenuScreen.ts, client/src/ui/screens/mainMenuScreen.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-6b]
- Intent (design §4; default 1 in design §14): Start on an ongoing battle opens the main menu over it, read-only. Reducer guards stay the authority (`is_in_ongoing_battle`, `reject_if_in_battle`).
- Notes: the in-battle "Start → menu → Monsters → Start → battle" e2e lands in ctl-8j's `battle-dpad.spec.ts`, once Monsters is a real screen.

- **CTL6C.1:** WHEN Start is pressed on an `Ongoing` battle base, THE SYSTEM SHALL keep the battle shown and open the main menu over it, and WHEN that menu closes, THE SYSTEM SHALL return to the battle.
  - In PvP the turn timer keeps running and shows in the menu header.

- **CTL6C.2:** WHEN A or B is pressed on a terminal battle outcome, THE SYSTEM SHALL continue exactly as Start does (CTL6B.2) and return to the world.

- **CTL6C.3:** WHILE the stack holds a battle base, THE SYSTEM SHALL refuse every `Command` not marked `battleSafe`, showing its catalogued reason, and SHALL render nav items that would issue one as disabled.
  - One table test covers Care, Feed, Move, Evolve, Bag Use ("Use items from the battle Bag command"), challenge Accept, talk, buy and sell. Screens converted later inherit the rule through `ScreenContext`; they add no per-screen battle criteria.

### ctl-7a — `#game-screen`: anchoring the nine shells, frame contrast, and the Start/Select chips replacing `#help-hint`
category: ux-a11y (S-overlay-anchor HIGH, NEW-1 HIGH) · severity: HIGH · size: HEAVY
touches: client/index.html, client/src/styles.css, client/src/render/world.ts, client/src/main.ts, client/src/ui/menuView.test.ts, client/src/main.feedbackI18n.test.ts, client/src/main.privacyWiring.test.ts, client/src/main.a11yFocus.test.ts, client/src/main.exportTransport.test.ts, client/src/main.partyFull.test.ts, client/src/indexShell.smoke.test.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogShape.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/ui/i18n/resolver.test.ts, client/src/ui/i18n/i18nTypes.compile.test.ts, client/e2e/a11y.spec.ts
after: [ctl-6c]
- Evidence: `render/world.ts:72` appends a canvas the height of `innerHeight` to `#app`. The nine `index.html` shells (dialogue, quest-log, heal, shop, trade, pvp-challenge, leaderboard, rename, tradepropose) carry only `display:none`, so they paint below the fold and the page scrolls (B3, r2-006/008/013, S-overlay-anchor).
- Evidence: none of those shells or their views sets a text colour, so text is UA black on `#0b0d12`, about 1.1:1 (NEW-1).
- Evidence: the `#help-hint` launcher (`index.html` ≈135-142) is a fixed `<body>` child with English text (`chrome.helpHint`, B11), and W-ONE-CORNER-AFFORDANCE (`menuView.test.ts`) allows only `{build-stamp, help-hint}`.
- Intent (design §10, migration rule 4): anchoring only, with no D-pad conversion. The JS-built battle, box, raising and evolution views move in ctl-7b. Claim and privacy anchor in ctl-8h, session in ctl-8k.
- Notes: `main.ts` keeps its null-tolerant mount lookup (today `if (mount !== null)`, ≈2486), so the shell-less boot tests (`main.boot`, `main.i18nBoot`, `main.battle-reseed`, `main.reducedMotionWiring`, `main.frameErrorWiring`, `main.privacyCountdown`) pass unmodified.
- Tasks:
  - Rewrite W-ONE-CORNER-AFFORDANCE by name to `{build-stamp}` plus the in-frame hint bar, replace-first.
  - Update the `buildAppShellFromRealIndexHtml` fixtures in the five `main.*.test.ts` files above, `indexShell.smoke.test.ts` and `overlayA11yWiring.test.ts` to the new `index.html`. The `main.a11yFocus.test.ts` cases that focus `#help-hint` (≈857, ≈1042, ≈1145, ≈1280) target the Start chip instead.
  - `chrome.helpHint` is deleted together with its pins in `catalog.test.ts`, `catalogShape.test.ts`, `resolver.test.ts`, `i18nTypes.compile.test.ts` and `catalogParity.test.ts`'s `DEAD_KEY_EXEMPT` (named intentional changes). The chips use new ids.
  - Correct the `index.html` header comment that cites the deleted `main.wiring.test.ts` (B16).
  - Re-measure and re-baseline `a11y.spec.ts` `PASSES_FLOOR_WORLD` and `INCOMPLETE_CEILING_WORLD` by name.
  - The `a11y.spec.ts` keyboard-pass test (≈332-369) Tabs to `#help-hint`; retarget it to Tab to the Start chip (named intentional change).

- **CTL7A.1:** THE SYSTEM SHALL wrap the canvas mount, a frame layer and a hint-bar slot in `#game-screen`, and the page SHALL never scroll.
  - With any frame open, `document.scrollingElement.scrollHeight` ≤ `innerHeight`.
  - Red (e2e): open the dialogue or shop. Today the page scrolls and the overlay starts below the fold.

- **CTL7A.2:** WHEN any of the nine `index.html` shells, help, the menu, the interact prompt or the privacy countdown is shown, THE SYSTEM SHALL render it as a class-styled `.mr-frame` inside `#game-screen` whose bounding box lies within the viewport.
  - Ids, `data-testid`s and the `display:none` contract are unchanged. The render loop, resize wiring, the canvas `role="application"` and the dev hooks keep working.

- **CTL7A.3:** WHEN any frame shows text, THE SYSTEM SHALL render it in the frame colour token at a contrast ratio of at least 4.5:1 against the frame background.
  - An `a11y.spec.ts` e2e reads computed styles, because `toBeVisible` cannot catch this.
  - Red: NEW-1. Today dialogue text measures about 1.1:1.
  - The same e2e checks that the main menu's active row differs from an inactive sibling in a non-colour computed property (`::before` content from a `data-` attribute, or an outline/border width ≥ 2px) (B18).

- **CTL7A.4:** WHEN the world base is shown, THE SYSTEM SHALL show a Start chip (opens the main menu) and a Select chip (Help) in the hint-bar slot, with verbs from the catalog, and `document.getElementById('help-hint')` SHALL return null.
  - Clicking a chip presses its button; opening the menu clears held keys (CTL2.4).
  - The chips are static until ctl-13 makes the bar live.

### ctl-7b — re-parenting battle, box, raising and evolution under `#game-screen`
category: ux-a11y (S-overlay-anchor) · severity: HIGH · size: MODERATE
touches: client/src/main.ts, client/src/styles.css, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/evolutionView.ts, client/src/ui/evolutionView.test.ts, client/e2e/a11y.spec.ts
after: [ctl-7a]
- Evidence: battle, box, raising and evolution self-style `position:fixed; inset:0` inside `#app` (z 100/110).
- Tasks: the ctl-7a contrast e2e extends to these four frames; re-baseline any `a11y.spec.ts` floor or ceiling the move changes, by name.

- **CTL7B.1:** WHEN battle, box, raising or evolution is shown, THE SYSTEM SHALL render it as a class-styled `.mr-frame` inside `#game-screen`, within the viewport, with its text at a contrast ratio of at least 4.5:1.
  - Their ids, testids and inline-style-free root contract (A11Y-12) hold; `reduced-motion.spec.ts` and `movement-input.spec.ts` keep passing.

### ctl-8a — Dialogue, Shop and Heal on the D-pad
category: ux-a11y + gameplay defect B13 · severity: MED · size: HEAVY
touches: client/src/ui/screens/dialogueScreen.ts, client/src/ui/screens/shopScreen.ts, client/src/ui/screens/healScreen.ts, client/src/ui/screens/index.ts, client/src/ui/dialogueView.ts, client/src/ui/dialogueView.test.ts, client/src/ui/dialogueModel.ts, client/src/ui/dialogueModel.test.ts, client/src/ui/shopView.ts, client/src/ui/shopView.test.ts, client/src/ui/shopModel.ts, client/src/ui/shopModel.test.ts, client/src/ui/healView.ts, client/src/ui/healView.test.ts, client/src/ui/healModel.ts, client/src/ui/healModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/dialogue.spec.ts, client/e2e/shop-npc.spec.ts, client/e2e/wallet-balance.spec.ts
after: [ctl-7b]
- Evidence:
  - The dialogue has no continue or close control, and leaf nodes have 0 choices (r2-008/009/060/061).
  - Shop items have no descriptions (r1 PlaytestReport :85).
  - `healView` is a display-only cost list (`ui/healView.ts` ≈40-55); the real heal is Box → Heal Party with `locations[0]` (B13).
  - The bound heal view model carries the bound `locationId` (`buildHealViewModelForLocation`).
- Notes: the views keep `data-choice-idx` and `data-shop-id`, because the `main.ts` document click delegate stays until ctl-15. The Box Heal Party button stays until ctl-10a, which migrates its e2e user.
- Tasks: `#shop-balance`, `#shop-for-sale button[data-item-id]` and `#dialogue-choices` keep their ids and first-paint semantics (used by `wallet-balance.spec.ts`); the spec passes unmodified.

- **CTL8A.1:** WHEN a conversation is shown, THE SYSTEM SHALL render a bottom-box frame whose choices form a wrapping nav list, where A finishes the text reveal, then advances, then chooses, and B finishes the reveal and, on a choice or leaf node, ends the talk through `dismissDialogue`.
  - Under reduced motion the text appears at once.

- **CTL8A.2:** WHEN Shop opens, THE SYSTEM SHALL show tabs Buy | Sell, opening on Buy, with the balance in the title and a Y description slot that reads "—" when an item has no description.
  - A on an item opens a quantity row; D-pad left/right changes the quantity by ±1.
  - Then a Yes/No confirm: Buy defaults to Yes, Sell to No.
  - Feedback is catalogued (for example "✓ Bought 2 Bait (−40g)").

- **CTL8A.3:** WHEN the heal frame opens for a bound healer, THE SYSTEM SHALL ask "Heal party for N?" with Yes as the default, and on Yes dispatch heal-party with that bound location's id.
  - With no bound location, Heal is disabled with a reason.
  - Red: B13. A view-model test binds location 7 and expects `healParty(7)`. Today the heal view has no action at all.

- **CTL8A.4:** WHEN T is pressed beside an NPC, shop or healer (legacy until ctl-10a), THE SYSTEM SHALL open the converted dialogue, shop or heal frame.
  - `dialogue.spec.ts` and `shop-npc.spec.ts` keep passing through T.

### ctl-8b — Monsters I: Party / Storage tabs, the monster sheet, Move and Nickname
category: ux-a11y (screen conversion) · severity: MED · size: MODERATE
touches: client/src/ui/screens/monstersScreen.ts, client/src/ui/screens/index.ts, client/src/ui/monstersModel.ts, client/src/ui/monstersModel.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/boxModel.ts, client/src/ui/boxModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-8a]
- Evidence: box is a hide-switch overlay operated only by Tab and the mouse; the nickname edit uses `window.prompt()` (`ui/boxView.ts:278`).
- Intent (design §5, default 3 in design §14): the box root becomes the Monsters frame (Party and Storage panels plus the sheet). LB/RB are PageUp/PageDown until ctl-11a. Box's Heal Party control stays in the Monsters frame until ctl-10a removes it.
- New files: `monstersScreen.ts`, `monstersModel.ts` and its test.

- **CTL8B.1:** WHEN Monsters opens, THE SYSTEM SHALL show tabs Party (a list of up to 6) and Storage (a grid), switched by LB/RB, with per-tab cursor memory.

- **CTL8B.2:** WHEN A is pressed on a monster, THE SYSTEM SHALL open its action sheet with Summary, Nickname and Move, and WHEN B is pressed in the sheet, THE SYSTEM SHALL return with the cursor on that monster.
  - X on a monster is a quick Move. Feedback is catalogued ("✓ Moved to party").
  - Care, Feed… and Evolve… join the sheet in ctl-8c.

- **CTL8B.3:** WHEN Nickname is chosen, THE SYSTEM SHALL open an in-frame typing row under the typing-mode rule (CTL6B.5), with no `window.prompt()`.
  - Red: today the nickname edit calls `window.prompt`.

- **CTL8B.4:** WHEN the legacy KeyB is pressed (until ctl-11a), THE SYSTEM SHALL open Monsters on the Storage panel that holds the box root.

### ctl-8c — Monsters II: Care, Feed, Evolve and the evolution notice
category: ux-a11y (screen conversion) · severity: MED · size: MODERATE
touches: client/src/ui/screens/monstersScreen.ts, client/src/ui/monstersModel.ts, client/src/ui/monstersModel.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/raisingModel.ts, client/src/ui/raisingModel.test.ts, client/src/ui/evolutionView.ts, client/src/ui/evolutionView.test.ts, client/src/ui/evolutionNotice.ts, client/src/ui/evolutionNotice.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/evolution.spec.ts
after: [ctl-8b]
- Evidence: raising and evolution are hide-switch overlays operated only by Tab and the mouse; the evolution reveal banner has only an OK button.
- Notes, raising-root ownership: this slice moves raising's per-monster actions onto the Monsters sheet and leaves the raising root holding only its inventory list. ctl-8f then turns that root into Bag. The evolution root hosts the Evolve… list.
- Tasks: `evolution.spec.ts` V2 (≈193, KeyI then the raising Care button) moves to KeyB → monster → sheet → Care via `pressButton` (named intentional change).

- **CTL8C.1:** WHEN the monster sheet opens, THE SYSTEM SHALL add Care, Feed… and Evolve… to it.
  - Feed… opens a food list; picking food feeds with no confirm.
  - Evolve… lists the evolution paths, is disabled with a reason when there are none, and its confirm defaults to No.
  - Feedback is catalogued ("✓ Fed {name}").

- **CTL8C.2:** WHEN an evolution notice arrives, THE SYSTEM SHALL show it as a prompt that A dismisses (OK).

- **CTL8C.3:** WHEN the legacy KeyI or KeyE is pressed (until ctl-11a), THE SYSTEM SHALL open the panel holding the raising root or the evolution root respectively.
  - `evolution.spec.ts`'s KeyE case (≈170) keeps passing; `evo-ready-note` and `evo-choice` testids survive in the Evolve list.

### ctl-8d — Social I: tabs, and responding to trades and challenges
category: ux-a11y (screen conversion) · severity: MED · size: MODERATE
touches: client/src/ui/screens/socialScreen.ts, client/src/ui/screens/index.ts, client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/tradeModel.ts, client/src/ui/tradeModel.test.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/pvpModel.ts, client/src/ui/pvpModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/trade.spec.ts, client/e2e/pvp.spec.ts
after: [ctl-8c]
- Evidence: trade, pvp and leaderboard are three separate overlays.
- Intent (design §5): Social is the place to *respond* to requests. Initiation stays on pvpView's per-player Challenge buttons and O until ctl-10b replaces them. Players and Rankings show placeholders and the legacy leaderboard root until ctl-8g. `pvp-accept-btn` and `pvp-challenge-player-btn` stay directly clickable DOM until ctl-13 and ctl-10b respectively.
- New files: `socialScreen.ts`, `socialModel.ts` and its test.

- **CTL8D.1:** WHEN Social opens, THE SYSTEM SHALL show tabs Players, Trades, Challenges and Rankings, opening on the tab of the oldest waiting request with the cursor on it, or else on the remembered tab.

- **CTL8D.2:** WHEN A is pressed on a trade or challenge row, THE SYSTEM SHALL offer that row's legal actions as a sheet.
  - Trades offer Accept, Decline, Confirm and Cancel. Challenges offer Accept, Decline and Cancel.
  - Decline and the final trade Confirm default to No.

- **CTL8D.3:** WHEN the legacy U, P or L is pressed (until ctl-11a), THE SYSTEM SHALL open Social on the Trades, Challenges or Rankings panel holding the trade, pvp or leaderboard root.

### ctl-8e — trade-propose wizard
category: ux-a11y + defect B5 · severity: MED · size: MODERATE
touches: client/src/ui/screens/tradeProposeScreen.ts, client/src/ui/screens/index.ts, client/src/ui/tradeProposeView.ts, client/src/ui/tradeProposeView.test.ts, client/src/ui/tradeProposeModel.ts, client/src/ui/tradeProposeModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/trade-propose.spec.ts
after: [ctl-8d]
- Evidence: every control calls `stopPropagation`, and initial focus is the target `<select>`, so Escape is dead when the overlay opens (B5, `ui/tradeProposeView.ts` ≈100-124, ≈201-203).
- Overlap: M25 S1 may edit `tradeProposeModel.ts` copy. Do not run the two concurrently.

- **CTL8E.1:** WHEN the wizard opens, THE SYSTEM SHALL step through Offer (A toggles ✓ on own monsters), Coins (a typing row under CTL6B.5), Ask and Review.
  - LB/RB page between the steps, and B steps back. Review confirms with Yes as the default.
  - A Target step appears first only when no target was supplied; ctl-10b always supplies one.
  - Red: B5. Open the wizard and press Escape. Today nothing happens.

- **CTL8E.2:** WHEN the legacy O is pressed (until ctl-10b), THE SYSTEM SHALL open the converted wizard.

### ctl-8f — Bag pockets and Journal
category: ux-a11y (screen conversion) · severity: MED · size: MODERATE
touches: client/src/ui/screens/bagScreen.ts, client/src/ui/screens/journalScreen.ts, client/src/ui/screens/index.ts, client/src/ui/bagModel.ts, client/src/ui/bagModel.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/questLogView.ts, client/src/ui/questLogView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-8e]
- Intent (design §5 rows 2-3): the raising root (inventory only since ctl-8c) becomes the Bag frame. It keeps its `OverlayId`, so no new `*View.ts` file appears. questLog is a display-only list today.
- New files: `bagScreen.ts`, `journalScreen.ts`, `bagModel.ts` and its test.

- **CTL8F.1:** WHEN Bag opens, THE SYSTEM SHALL show pocket tabs derived from item-definition data, each holding a nav list of owned items with quantities, switched by LB/RB.
  - Test: a fixture item definition in a pocket no shipped item uses yields its own tab, so no item id or pocket is hard-coded.

- **CTL8F.2:** WHEN A is pressed on an item, THE SYSTEM SHALL offer Feed (→ a monster picker, no confirm) or Info as the item allows, and after a Feed SHALL close the picker with the cursor back on the item.
  - Use is disabled with the catalogued reason "Use items from the battle Bag command" where it does not apply.

- **CTL8F.3:** WHEN Journal opens, THE SYSTEM SHALL show the quests as a nav list, with A or Y opening the selected quest's detail.

- **CTL8F.4:** WHEN the legacy KeyI or KeyQ is pressed (until ctl-11a), THE SYSTEM SHALL open Bag or Journal respectively.

### ctl-8g — Social II: Players and Rankings
category: ux-a11y (screen conversion; B15) · severity: LOW · size: LIGHT
touches: client/src/ui/screens/socialScreen.ts, client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/ui/leaderboardView.ts, client/src/ui/leaderboardView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-8f]
- Evidence: Help claims "nearby player", which is false (B15).
- Intent (design §5): Players is the only in-game way to find someone to walk up to for a face-to-face trade. It reads the already-public `character` subscription (`net/connection.ts` ≈793), so nothing new is disclosed. The character row carries no battle state (`schema.rs` ≈27), so there is no "In battle" badge.

- **CTL8G.1:** WHEN the Players tab renders, THE SYSTEM SHALL list online players with name, zone name and a "Nearby" badge when the player is in the same zone within `NEARBY_TILES` = 12 Manhattan tiles.
  - `NEARBY_TILES` is a named `socialModel` presentation constant that gates nothing.
  - A on a row shows "Walk up to {name} and press A"; no remote action exists.

- **CTL8G.2:** WHEN the Rankings tab renders, THE SYSTEM SHALL show the leaderboard as a read-only nav list.

### ctl-8h — Profile (Name typing, Account, Privacy) and claim/privacy anchoring
category: ux-a11y + defects B2/B5 · severity: MED · size: HEAVY
touches: client/src/ui/screens/profileScreen.ts, client/src/ui/screens/index.ts, client/src/ui/renameView.ts, client/src/ui/renameView.test.ts, client/src/ui/renameModel.ts, client/src/ui/renameModel.test.ts, client/src/ui/claimView.ts, client/src/ui/claimView.test.ts, client/src/ui/claimModel.ts, client/src/ui/claimModel.test.ts, client/src/ui/privacyView.ts, client/src/ui/privacyView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/rename.spec.ts, client/e2e/accounts.spec.ts, client/e2e/monster-privacy.spec.ts
after: [ctl-8g]
- Evidence:
  - B2: `claimView` creates its title and body hidden, and `render()` never shows them (`ui/claimView.ts` ≈69-77, ≈135-149). `accounts.spec.ts` uses `toHaveText`, which ignores visibility.
  - B3: claim and privacy append themselves to `<body>`.
  - B5: the `#rename-submit` keydown only calls `stopPropagation` (`ui/renameView.ts` ≈89-91).
- Notes: claim and privacy fall back to `document.body` when `#game-screen` is absent (shell-less boots).
- Tasks: `monster-privacy.spec.ts` drives the privacy flow through Profile › Privacy (named survivor).

- **CTL8H.1:** WHEN Profile opens, THE SYSTEM SHALL show a nav list Name, Account & sign-in, Privacy & data, with each child rendered as a `.mr-frame` inside `#game-screen`.
  - The roots `rename-overlay`, the claim root and the privacy root keep their ids and testids.

- **CTL8H.2:** WHEN Name opens (from Profile, or from N), THE SYSTEM SHALL start in typing mode under CTL6B.5 and commit through the existing set-profile-name command.
  - `rename.spec.ts` is the typing e2e.

- **CTL8H.3:** WHEN the claim frame renders in any phase, THE SYSTEM SHALL show its title and body, and offer its actions as nav rows.
  - The decline confirm defaults to No.
  - Red: B2. An `accounts.spec.ts` `toBeVisible` assertion on the claim title fails today.

- **CTL8H.4:** WHEN Privacy & data opens, THE SYSTEM SHALL offer its actions as nav rows, and account deletion SHALL keep its two-step confirm with No as the default.

- **CTL8H.5:** WHEN the legacy N or C is pressed (until ctl-11a), THE SYSTEM SHALL open Profile › Name (typing) or Profile › Account respectively.

### ctl-8i — Battle I: command list and skill grid
category: ux-a11y (screen conversion) · severity: MED · size: MODERATE
touches: client/src/ui/screens/battleScreen.ts, client/src/ui/screens/index.ts, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/battleModel.ts, client/src/ui/battleModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-8h]
- Evidence: battle is operable only by Tab and the mouse; the skill buttons omit accuracy (R-rb-56-FOLLOWUP-ACC).

- **CTL8I.1:** WHEN a battle turn begins, THE SYSTEM SHALL show the command list Fight, Recruit, Swap, Bag, Run with the cursor reset to Fight.
  - Run is disabled in PvP, with a reason.
  - While waiting on the opponent, the list greys out under "Waiting for {name}…".

- **CTL8I.2:** WHEN Fight is chosen, THE SYSTEM SHALL show a two-column skill grid in which each cell gives affinity, power and accuracy, with the cursor on the last skill used by that monster in this battle.

- **CTL8I.3:** WHEN Start is pressed inside a battle sub-list, THE SYSTEM SHALL open the main menu above it, and WHEN that menu closes, THE SYSTEM SHALL return to the same sub-list with its cursor.

### ctl-8j — Battle II: recruit, swap and bag lists; the D-pad battle e2e
category: ux-a11y + input hygiene (B10) · severity: MED · size: MODERATE
touches: client/src/ui/screens/battleScreen.ts, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/battleModel.ts, client/src/ui/battleModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/battle-dpad.spec.ts, client/e2e/encounter-battle.spec.ts, client/e2e/recruit.spec.ts
after: [ctl-8i]
- Evidence: the bait and cure `<select>`s parse divergently (B10 / pgcc defect 3, `ui/battleView.ts` ≈580-629). Obsoletes pgcc-d D5: no string parse remains.
- New files: `client/e2e/battle-dpad.spec.ts`.
- Tasks: `recruit.spec.ts` and `encounter-battle.spec.ts` change only where they select from the old `<select>`s (named intentional changes).

- **CTL8J.1:** WHEN Recruit, Swap or Bag is chosen, THE SYSTEM SHALL show a nav list in which each entry's key maps directly to its id, so no string is parsed (B10).
  - Recruit lists bait items with "No bait" first, then a Yes/No that defaults to Yes.
  - Swap lists the bench. Bag lists cure items, then the target.
  - `data-testid="bait-selector"` survives on the bait list root.

- **CTL8J.2:** WHEN a battle is played with the D-pad, A and B only, THE SYSTEM SHALL complete it to an outcome, and A or B SHALL continue from the outcome.
  - `battle-dpad.spec.ts` is the D-pad-only battle e2e.

- **CTL8J.3:** WHEN Start is pressed mid-turn, then A opens Monsters, then Start is pressed again, THE SYSTEM SHALL return to the battle screen with the command list intact and `__game().stack` equal to `[battle]` (length 1).
  - A second case in `battle-dpad.spec.ts` (design §5, battle variant of the flow).

### ctl-8k — the session gate as an in-frame system modal (B1)
category: ux-a11y defect (B1 HIGH, latent) · severity: HIGH · size: LIGHT
touches: client/src/ui/sessionView.ts, client/src/ui/sessionView.test.ts, client/src/ui/sessionModel.ts, client/src/ui/sessionModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-8j]
- Evidence: B1.
  - `sessionView`'s `ensureElement` creates the title, body and all four buttons with `display:none`, and `render()` never shows the title or body (`ui/sessionView.ts` ≈15-23, ≈53-61).
  - `primaryActionLabel` (`ui/sessionModel.ts` ≈118, ≈132) has no reader, so no button gets a label.
  - The gate swallows every key, so an expired session is a dead end.
  - The bug is latent until a real issuer ships (`net/connection.ts` ≈996).

- **CTL8K.1:** WHEN the session gate is shown in any state, THE SYSTEM SHALL render, inside `#game-screen`, a visible title, a visible body and labelled action buttons from the catalog, with Retry as the default action.
  - "Continue as guest" asks for confirmation, defaulting to No.
  - B and Start are inert, and the frame says so.
  - Red: a `sessionView.test.ts` case renders the expired state. Today the title and body are hidden and the buttons have no label.

### ctl-9 — game-core interaction rule (front tile, then own tile) and its wasm export
category: gameplay rule (r2-024) · severity: MED · size: MODERATE
touches: game-core/src/interact.rs, game-core/src/interact_tests.rs, game-core/src/lib.rs, client-wasm/src/lib.rs, game-core/tests/interact_reachability.rs, docs/DECISIONS.md, ARCHITECTURE.md, .claude/skills/wasm-boundary/SKILL.md
after: []
- Evidence: `nearestInteractable` (`ui/interactModel.ts` ≈75) picks the nearest NPC or healer within `TALK_RANGE` = 2 (`game-core/src/npc/mod.rs:14`) and ignores facing. `TilePos::step` (`game-core/src/types.rs:44`) already defines the tile in front.
- Evidence: `talk` re-checks the same zone and Manhattan distance ≤ `TALK_RANGE` against the NPC's current character row (`server-module/src/npc.rs` ≈284-294). `heal_party` checks the zone only.
- Evidence: client-wasm has no `serde_json`; JS values cross through `serde_wasm_bindgen` (`evolution_eligibility`, `client-wasm/src/lib.rs` ≈336-342).
- Intent (design §7; operator answer, binding): a new rule, not a port.
- Notes: game-core runs the nightly zero-miss mutation job, so tests target every branch. CTL9.2's property is a regression guard over the tier rule, not a separate proof.
- New files: `interact.rs`, `interact_tests.rs`, `game-core/tests/interact_reachability.rs`.
- Tasks: add the export to the wasm export lists in `docs/DECISIONS.md` (≈14), `ARCHITECTURE.md` (≈117-118) and `.claude/skills/wasm-boundary/SKILL.md`.

- **CTL9.1:** WHEN given the character's position, facing and zone plus a list of entities (NPC at its character-row position, heal location, other player), `game_core::interact_candidates` SHALL return the indices of the first non-empty tier: entities on the faced tile (`pos.step(facing)`), else entities on the character's own tile.
  - Only same-zone entities count.
  - Within a tile, order is by kind (NPC < heal < player), then by numeric id (a test pins id 9 before id 10).
  - Tests show that an NPC directly behind, two tiles ahead, or diagonal is not a candidate; that the faced tile wins over the own tile; and that another zone is excluded.

- **CTL9.2:** WHEN `interact_candidates` returns an NPC, THE SYSTEM SHALL guarantee that its Manhattan distance from the character is at most `TALK_RANGE`.
  - A property test, so every offered target is one the server accepts.

- **CTL9.3:** THE SYSTEM SHALL export `interact_candidates_coded(own_x: i32, own_y: i32, facing: u8, zone: u32, entities: JsValue) -> Result<JsValue, JsValue>` from client-wasm.
  - Entities arrive as `[{kind, x, y, zone, id}]` through `serde_wasm_bindgen`, with `id` as a decimal string parsed to `u64`. The result is an array of input indices.
  - It returns `Err` for an invalid facing code, an unparseable id or an unknown kind (reject, never clamp).
  - Native tests sit beside `talk_range()`.

- **CTL9.4:** WHEN content loads, every heal location and every NPC home SHALL have at least one walkable 4-neighbour in its zone map.
  - `game-core/tests/interact_reachability.rs` asserts this through the product's own content loader, so no interactable becomes unreachable once the range tier is gone.

### ctl-10a — world A and Y act on what you face; T retired; healing only at the healer
category: gameplay/UX (r2-024) + defects B6/B13 · severity: HIGH · size: HEAVY
touches: client/src/ui/interactModel.ts, client/src/ui/interactModel.test.ts, client/src/ui/actionSheetModel.ts, client/src/ui/actionSheetModel.test.ts, client/src/ui/screens/worldScreen.ts, client/src/ui/screens/index.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/helpModel.ts, client/src/ui/helpModel.test.ts, client/src/main.ts, client/src/main.boot.test.ts, client/src/main.a11yFocus.test.ts, client/src/main.battle-reseed.test.ts, client/src/main.exportTransport.test.ts, client/src/main.feedbackI18n.test.ts, client/src/main.frameErrorWiring.test.ts, client/src/main.i18nBoot.test.ts, client/src/main.partyFull.test.ts, client/src/main.privacyCountdown.test.ts, client/src/main.privacyWiring.test.ts, client/src/main.reducedMotionWiring.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/controls.ts, client/e2e/dialogue.spec.ts, client/e2e/shop-npc.spec.ts, client/e2e/wallet-balance.spec.ts, client/e2e/recruit.spec.ts
after: [ctl-8e, ctl-9]
- Evidence: T is gated on `!anyOverlayVisible()` with no world-focus gate (B6, main.ts ≈1492-1515).
- Evidence: `interactModel.ts` ≈135 and ≈166 hard-code `keyGlyph: 'T'`.
- Evidence: Box Heal Party sends `locations[0]` (B13, main.ts ≈2514-2525, `healTargetLocationId`), and `recruit.spec.ts` `healViaBox` (≈270-345, ≈361-415, ≈781-787, ≈861-862) clicks it.
- Evidence: `elder_oak` wanders (`wander_radius: 2`, `game-core/content/npcs/000-core.ron`), so a fixture that faces it once can lose it.
- New files: `actionSheetModel.ts` and its test, `screens/worldScreen.ts`.
- Tasks:
  - Remove Box Heal Party, its `main.ts` callback and `healTargetLocationId`.
  - Migrate `recruit.spec.ts`'s `healViaBox` callers to the bound healer: walk to a walkable 4-neighbour of the bound heal location facing it (dev positioning via `__game` where available, else scripted steps), `pressButton('A')`, then Yes. `heal_party` is zone-scoped.
  - KeyT sites (dialogue ≈188, shop-npc ≈293 and ≈370, wallet-balance ≈350) become `pressButton('A')` through a `controls.ts` helper that re-faces the NPC and retries while it wanders. `shop-npc.spec.ts` ≈350's prompt glyph assertion "T" becomes the A keycap.
  - `CONTROLS` drops the T row and gains A interaction; `helpModel.test.ts`'s pinned key set drops T (named).
  - `nearestInteractable` shrinks to a marshalling adapter with no TypeScript rule.
  - The world chip memoises `interact_candidates_coded` on (position, facing, batch); it is never called per frame.
  - The eleven `main.*.test.ts` files in `touches:` mock the wasm package with a factory that lacks the new export; add an `interact_candidates_coded` stub to each (named fixture change), and have the client read the export lazily, not at module top level.

- **CTL10A.1:** WHEN A is pressed at the world base, THE SYSTEM SHALL act on the candidates returned by the wasm `interact_candidates_coded`.
  - With one candidate that has a default action, A runs it: NPC → talk; healer → the bound heal frame.
  - With several candidates, A opens a picker of entity × action (for example "Rival — Trade" from ctl-10b).
  - With none, A does nothing and shows no toast.
  - Until ctl-10b a player candidate has no default action and no picker entries, so the picker lists only Talk/Shop/Heal entries and a lone player is a no-op.
  - Red: r2-024. With an NPC directly behind the character, pressing T today starts a talk.

- **CTL10A.2:** WHEN Y is pressed at the world base with a candidate, THE SYSTEM SHALL open the primary candidate's full action sheet (Talk, Shop, Heal, Trade, Challenge, as applicable).

- **CTL10A.3:** WHEN T is pressed, THE SYSTEM SHALL do nothing, and the world interaction chip SHALL read `[{A keycap}] {verb} — {name}` or `[{A keycap}] Choose…` from the live binding and the catalog.
  - Red: B6. Today T starts a talk whenever no overlay is visible, with no world-focus check.

- **CTL10A.4:** WHEN Monsters renders, THE SYSTEM SHALL offer no Heal Party control, so healing happens only at a bound healer (B13).

### ctl-10b — face-to-face trade and challenge; O retired
category: gameplay/UX (r2-025) + defect B15 · severity: HIGH · size: MODERATE
touches: client/src/ui/actionSheetModel.ts, client/src/ui/actionSheetModel.test.ts, client/src/ui/screens/worldScreen.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/tradeProposeModel.ts, client/src/ui/tradeProposeModel.test.ts, client/src/ui/tradeProposeView.ts, client/src/ui/tradeProposeView.test.ts, client/src/ui/menuModel.ts, client/src/ui/menuModel.test.ts, client/src/ui/helpModel.ts, client/src/ui/helpModel.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, docs/DECISIONS.md, client/e2e/controls.ts, client/e2e/trade-propose.spec.ts, client/e2e/pvp-side-b.spec.ts, client/e2e/ranked-forfeit.spec.ts, client/e2e/monster-privacy.spec.ts
after: [ctl-10a]
- Evidence: O, the pvpView per-player Challenge buttons, and menu leaves start trades and challenges remotely (r2-025).
- Evidence: CONTROLS says "nearby player" (B15).
- Evidence: `pvp-side-b.spec.ts` ≈313, `ranked-forfeit.spec.ts` ≈287 and `monster-privacy.spec.ts` ≈467 click `pvp-challenge-player-btn` through the UI; they are not hook-driven.
- Tasks:
  - Land the "Interaction target: the tile in front, then your own tile" entry (draft 3) in `docs/DECISIONS.md`.
  - `CONTROLS` describes face-to-face trading with no O and no false "nearby"; `helpModel.test.ts`'s pinned key set drops O (named).
  - trade-propose ≈210 (KeyO): position A beside B facing B, then A → picker → Trade.
  - The three challenge-button sites above: the same positioning, then A → picker → Challenge → Yes; where the test is not about the UI, use the `__mrPvp` hook instead. Hook-driven `proposeTrade`/`challengePvp` specs are unaffected.

- **CTL10B.1:** WHEN Trade or Challenge is chosen for a faced player, THE SYSTEM SHALL open the trade wizard with that target pre-filled (no Target step), or send the challenge after a Yes-default confirm.
  - The server reducers are untouched.

- **CTL10B.2:** WHEN O is pressed, or any menu, Social or pvpView surface is used, THE SYSTEM SHALL offer no way to start a trade or challenge.
  - Red: r2-025. Today O opens the wizard for any online player.

### ctl-11a — accelerators move to the router; Q/E become LB/RB; J and V
category: input architecture · severity: MED · size: MODERATE
touches: client/src/input/router.ts, client/src/input/router.test.ts, client/src/input/bindings.ts, client/src/input/bindings.test.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/controls.ts, client/e2e/dialogue.spec.ts, client/e2e/wallet-balance.spec.ts, client/e2e/trade.spec.ts, client/e2e/evolution.spec.ts, client/e2e/pvp.spec.ts
after: [ctl-10b, ctl-8k]
- Evidence: Q opens Journal and E opens Evolution today, colliding with the operator's bumpers (migration rule 2: Q/E → LB/RB, Q → J and E → V land in **one** slice).
- Tasks:
  - KeyQ (dialogue ≈397, wallet-balance ≈657 and ≈925, trade ≈200) → `pressAccel('J')`. KeyE (evolution ≈170) → `pressAccel('V')`, then the monster sheet → Evolve.
  - Rewrite the mutual-exclusivity e2e (`pvp.spec.ts` ≈108, ≈136, ≈161; `trade.spec.ts` ≈119, ≈190-205) to assert that an accelerator replaces the open screen (named intentional change; survivors in the milestone table).
  - Delete the vacuous `trade.spec.ts` ≈195 and ≈205 `g`/`h` presses by name (B16): they assert nothing.

- **CTL11A.1:** WHEN an accelerator key is pressed, THE SYSTEM SHALL pop to the base and push that accelerator's canonical menu path with the cursor on the leaf.
  - The accelerators: B → Monsters › Storage; I → Bag; V → Monsters › Party; J → Journal; U, P, L → Social › Trades, Challenges, Rankings; N → Profile › Name; C → Profile › Account. F8 and F9 are unchanged.
  - Pressed while its own screen is on top, an accelerator acts as Start.
  - Red: today Q opens the Journal and E opens Evolution.

- **CTL11A.2:** WHILE the top frame is server-owned, a `textEntry`, a prompt, or the session gate, THE SYSTEM SHALL deny accelerators.
  - Over a battle, the CTL6C.3 battle-safe policy applies to the pushed path.

- **CTL11A.3:** WHEN Q or E (or PageUp or PageDown) is pressed on a tabbed screen, THE SYSTEM SHALL switch to the previous or next tab (LB/RB), and WHEN pressed in the world, THE SYSTEM SHALL do nothing.
  - RB on the last tab wraps to the first; LB on the first wraps to the last.

### ctl-11b — the legacy ladder deleted; reachability; the keyboard menu-flow e2e
category: input architecture · severity: MED · size: MODERATE
touches: client/src/input/router.ts, client/src/input/router.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/ui/reachability.test.ts, client/src/ui/focusTrap.ts, client/src/main.ts, client/src/main.a11yFocus.test.ts, client/e2e/menu-flow.spec.ts
after: [ctl-11a]
- Evidence: `KEY_DIR`, `targetOwnsKey`, `worldHasFocus`, the probe and handle tables, `canOpen` and `OVERLAY_TIERS` survive only for the legacy hotkeys.
- New files: `reachability.test.ts`, `client/e2e/menu-flow.spec.ts`.
- Tasks:
  - Delete the keydown ladder, `KEY_DIR`, `targetOwnsKey`, `worldHasFocus`, the probe and handle tables, `canOpen` and `OVERLAY_TIERS`. `overlayRegistry` keeps only `OverlayId` and `OVERLAY_A11Y`, and `OVERLAY_IDS` derives from `OVERLAY_A11Y`'s keys, so OR-MANIFEST-COMPLETE keeps holding.
  - Rewrite the S5T-GATE world-focus cases in `main.a11yFocus.test.ts` as `router.test.ts` ownership cases (named survivors).
  - B16: the `focusTrap.ts` line-1 comment says "16"; correct it to the `OverlayId` count.

- **CTL11B.1:** WHEN a key not bound in the binding table is pressed at the world base, THE SYSTEM SHALL fire no handler and leave the event unprevented, and WHEN focus is outside `#game-screen` and not on `<body>`, THE SYSTEM SHALL leave every key event to the browser.
  - Note: `errorOverlayView` and `sessionView` still append to `<body>` until ctl-13 and ctl-8k; that is safe because they take no focus trap.

- **CTL11B.2:** WHEN press counts are computed over the pure menu, nav and stack models, every accelerator target SHALL be reachable from the world in at most 7 D-pad/A presses.
  - Fast-check and table tests in `reachability.test.ts`.

- **CTL11B.3:** WHEN the operator's required flow (design §5, press by press) is played with the keyboard only, THE SYSTEM SHALL produce the documented result at every step, and the final W SHALL walk.
  - `menu-flow.spec.ts` is the flow's e2e.

### ctl-12 — remapping: Options › Controls, binding store, glyphs
category: accessibility (WCAG 2.1.4) + operator intent · severity: MED · size: HEAVY
touches: client/src/input/bindingStore.ts, client/src/input/bindingStore.test.ts, client/src/input/glyphs.ts, client/src/input/glyphs.test.ts, client/src/input/bindings.ts, client/src/input/bindings.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/ui/controlsModel.ts, client/src/ui/controlsModel.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/ui/screens/optionsScreen.ts, client/src/ui/screens/index.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/remap.spec.ts, client/e2e/controls.ts
after: [ctl-11b]
- Evidence: M23 cut remapping because `main.ts` was a literal `e.code` ladder (`specs/monster-realm-v2/archive/M23-accessibility.spec.md:335`). The ladder is gone after ctl-11b.
- Intent: design §9. `controlsView` is a new `OverlayId` with an `OVERLAY_A11Y` entry (file-naming rule).
- New files: `bindingStore.ts`, `glyphs.ts`, `controlsModel.ts`, `controlsView.ts`, `optionsScreen.ts`, their tests, `client/e2e/remap.spec.ts`.

- **CTL12.1:** WHEN Options › Controls opens, THE SYSTEM SHALL show tabs Buttons (12 rows) and Shortcuts, each row with a Primary and an Alt slot, where A on a slot starts capture ("Press a key for {button}…").

- **CTL12.2:** WHILE capturing, THE SYSTEM SHALL accept any key, including Escape, Enter and Backspace, and SHALL refuse reserved keys with a reason.
  - Reserved: Tab, Shift+Tab, F5, F11, F12, bare modifiers, Ctrl/Alt/Meta chords.
  - Keyboard cancel: pressing the key the slot already holds (for an empty slot, the key in the row's other slot) ends capture unchanged. The Cancel chip does too.

- **CTL12.3:** WHEN a captured key is bound elsewhere, among buttons or accelerators, THE SYSTEM SHALL swap the two bindings and say so ("Swapped: …"), and IF a change would leave a protected button (D-pad, A, B, Start) with no key, THEN THE SYSTEM SHALL refuse it.
  - Buttons and accelerators share one key namespace.
  - "Reset all" asks Yes/No, defaulting to No.

- **CTL12.7:** WHEN Clear is chosen on an accelerator row, THE SYSTEM SHALL unbind both of its slots, so that accelerator key does nothing until rebound.
  - Button rows offer no Clear (protected buttons can never be emptied), which keeps WCAG 2.1.4 met: every accelerator is remappable or removable.

- **CTL12.4:** WHEN bindings change, THE SYSTEM SHALL save them immediately to `localStorage['mr.controls']` as `{v:1, buttons, accels}` through plain `saveBindings(storage, b)`, and load them at boot through `loadBindings(storage)`.
  - `storage` is injected; every access is wrapped in try/catch, so unavailable storage gives in-memory defaults.
  - A total `parseBindings(raw: unknown)` falls back entry by entry; an unknown `v` gives the defaults.

- **CTL12.5:** WHEN a keycap is displayed, THE SYSTEM SHALL resolve it synchronously through `glyph(code)`: the `e.key` learned for that code or recorded at capture, else the catalogued key name.
  - AZERTY `KeyW` reads "Z" once the key has been pressed.

- **CTL12.6:** WHEN a player remaps A to K and reloads the page, THE SYSTEM SHALL confirm with K and no longer with Enter, and every hint SHALL show the new keycap.
  - `remap.spec.ts` is the flow's e2e; this slice extends `controls.ts`'s `pressButton` to read the live table (`localStorage['mr.controls']` through `parseBindings`, else `DEFAULT_BINDINGS`).

### ctl-13 — the live hint bar, request banners, the error toast, world Y/B on notices
category: ux-a11y (discoverability, B12) · severity: MED · size: MODERATE
touches: client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/ui/hintBar.ts, client/src/ui/hintBar.test.ts, client/src/ui/noticeModel.ts, client/src/ui/noticeModel.test.ts, client/src/ui/errorOverlayModel.ts, client/src/ui/errorOverlayModel.test.ts, client/src/ui/errorOverlayView.ts, client/src/ui/errorOverlayView.test.ts, client/src/ui/screens/worldScreen.ts, client/src/ui/menuModel.ts, client/src/ui/menuModel.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/respond-request.spec.ts, client/e2e/pvp.spec.ts, client/e2e/pvp-side-b.spec.ts, client/e2e/ranked-forfeit.spec.ts, client/e2e/monster-privacy.spec.ts
after: [ctl-12]
- Evidence: pvpView auto-shows on an incoming challenge when nothing else is open (main.ts ≈1971-1981).
- Evidence: the error overlay closes only with F8 (B12).
- Notes: notices are exactly two kinds: a pending incoming request and the pending error.
- New files: `hintBarModel.ts`, `hintBar.ts`, `noticeModel.ts`, their tests, `client/e2e/respond-request.spec.ts`.
- Tasks: the B side in `pvp.spec.ts`, `pvp-side-b.spec.ts` ≈334, `ranked-forfeit.spec.ts` ≈313 and `monster-privacy.spec.ts` ≈484 waits for `pvp-accept-btn` through the auto-show. It now accepts via `pressButton('Y')` then Enter, or via the `__mrPvp` hook where the test is not about the UI (named intentional changes).

- **CTL13.1:** WHEN any context is on top, THE SYSTEM SHALL drive the hint bar from a pure `hintBar(stack, bindings, notices)` as chips (button badge + live keycap + verb).
  - In the world the bar shows Start (Menu) and Select (Help), adds A with the target verb when there is a target, and adds Y (View) and B (Dismiss) when a notice is pending and there is no target.
  - A remap shows on the next render. The static ctl-7a chips are replaced.

- **CTL13.2:** WHEN an incoming trade or challenge arrives, THE SYSTEM SHALL show a non-modal banner and badges on the Social entry and the Start chip, and SHALL NOT move focus or open a frame.
  - Red: today an incoming challenge auto-opens the PvP overlay.

- **CTL13.3:** WHEN Y is pressed at the world base with no target and a request pending, THE SYSTEM SHALL open that request's action sheet (Accept / Decline / View) with Accept active, so Y then Enter accepts, and WHEN B is pressed at the world base, THE SYSTEM SHALL dismiss the top notice.
  - The error overlay becomes a toast, dismissed by world B or F8.

- **CTL13.4:** WHEN player B proposes a trade to player A, THE SYSTEM SHALL let A respond with Y then Enter from the world, with no letter hotkey.
  - `respond-request.spec.ts` is the flow's e2e.

### ctl-14 — generated Help; Report a problem; CONTROLS deleted; the "Client UI" decision superseded
category: content/i18n (B11 help) + docs · severity: MED · size: MODERATE
touches: client/src/ui/helpModel.ts, client/src/ui/helpModel.test.ts, client/src/ui/helpView.ts, client/src/ui/helpView.test.ts, client/src/ui/helpView.i18n.test.ts, client/src/ui/screens/helpScreen.ts, client/src/ui/screens/optionsScreen.ts, client/src/ui/screens/index.ts, client/src/ui/reachability.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, docs/PLAYTEST.md, docs/DECISIONS.md, client/e2e/a11y.spec.ts
after: [ctl-13]
- Evidence: B11. The `CONTROLS` and `GOALS` literals in `ui/helpModel.ts` ≈26-43 are rendered raw.
- Evidence: B16. CONTROLS lacks F8, and `docs/PLAYTEST.md` ≈32-51 is an unpinned, drifting copy.
- Evidence: F9 (bug bundle) is reachable only by hotkey; playtesters use it.
- Tasks:
  - Delete `CONTROLS`, `GOALS` and every English help literal together with their importers; the help root keeps its id. The generated-help tests replace `helpModel.test.ts`'s CONTROLS pins first (named survivors).
  - `docs/PLAYTEST.md`'s controls section points to in-game Help and lists the default virtual buttons.
  - Replace "Client UI: one overlay registry, keyboard first" in place in `docs/DECISIONS.md` with draft 1. With this slice every item in the old entry's scope is gone.
  - `a11y.spec.ts`'s Shift+Slash case asserts the generated Help contents; re-baseline `PASSES_FLOOR_HELP` and `INCOMPLETE_CEILING_HELP` by name.

- **CTL14.1:** WHEN Select is pressed (or Options › How to play is chosen), THE SYSTEM SHALL open Help with tabs This screen | All controls | Goals, generated from the context table, the live bindings and the catalog.
  - The tabs include F8 and F9, and a "key names vs button names" note.
  - Red: under `fr`, Help today renders English CONTROLS rows.

- **CTL14.2:** WHEN Options › Report a problem is chosen, THE SYSTEM SHALL assemble and save the bug bundle exactly as F9 does.
  - `reachability.test.ts` adds the row to its set (≤ 7 presses).

### ctl-15 — pointer and touch: one dispatcher on `#game-screen`; ARCHITECTURE.md
category: ux-a11y (B12; operator pointer intent) · severity: MED · size: HEAVY
touches: client/src/input/pointerSource.ts, client/src/input/pointerSource.test.ts, client/src/input/longPress.ts, client/src/input/longPress.test.ts, client/src/ui/navRender.ts, client/src/ui/navRender.test.ts, client/src/ui/menuView.ts, client/src/ui/menuView.test.ts, client/src/ui/hintBar.ts, client/src/ui/hintBar.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/src/styles.css, client/src/main.ts, ARCHITECTURE.md, client/e2e/pointer.spec.ts
after: [ctl-14]
- Evidence: there are no `pointer*`, `contextmenu` or touch listeners. The canvas has no click handler. A document click delegate (main.ts ≈2098) handles `[data-choice-idx]`, `[data-shop-id]` and `[data-menu-launcher]`, and `menuView` moves the selection on `mouseover`.
- New files: `pointerSource.ts`, `longPress.ts`, their tests, `client/e2e/pointer.spec.ts`.
- Tasks: `ARCHITECTURE.md` § Client › UI describes the shipped pipeline (keyboard and pointer sources → router and binding table → context stack with `SCREEN_POLICY` and `reconcile` → screen adapters → `dispatch`/`applyStack`; frames inside `#game-screen`; the generated hint bar and Help; `interact_candidates`) and no longer mentions `M` as the menu, `CONTROLS` or `T`.

- **CTL15.1:** WHEN the canvas is left-clicked or tapped at the world base, THE SYSTEM SHALL press A, passing no coordinates.
  - A click elsewhere at the world base, other than on a hint-bar chip, does nothing. Red: today a canvas click does nothing.

- **CTL15.2:** WHILE frames are open, a click or tap on a `[data-nav-key]` in the **top** frame SHALL make that item active and then press A.
  - A click on a tab-strip tab switches the tab.
  - Any other click, including on the canvas or a lower frame, is ignored.
  - The document click delegate is absorbed, so nothing is dispatched twice.

- **CTL15.3:** WHEN `#game-screen` is right-clicked, or a touch long-press completes (at least 500 ms, at most 10 px of movement, with a fill ring), THE SYSTEM SHALL press B exactly once.
  - `contextmenu` is suppressed only on `#game-screen`. A right-click also cancels remap capture.
  - Pointer Events throughout; `touch-action: none` on the canvas and `pan-y` on scroll bodies; `preventDefault` on touch `pointerdown`.

- **CTL15.4:** WHEN the pointer moves to new coordinates over a nav item, THE SYSTEM SHALL make that item active, and WHEN a key is next pressed, THE SYSTEM SHALL hide the hover state.
  - A re-render under a stationary pointer changes nothing. `menuView`'s `mouseover` selection is removed.

- **CTL15.5:** WHEN a contextual hint-bar chip (A, B or Y with its verb) is clicked or tapped, THE SYSTEM SHALL press that button, so every frame can be left without a hold (B12).
  - The Start and Select chips have been clickable since ctl-7a; this slice moves them onto the dispatcher.

- **CTL15.6:** WHEN the operator's required flow is played with the mouse only, THE SYSTEM SHALL produce the same results as the keyboard flow, with a right-click going back one level.
  - `pointer.spec.ts` clicks: the Start chip (menu opens) → the Bag row (Bag opens above the menu) → the Food tab → an item → Feed → a monster ("✓ Fed …"; picker closes) → right-click (menu, cursor on Bag) → the Monsters row → the Storage tab → a monster → Move ("✓ Moved to party") → the Start chip (world). Then a canvas click with nothing faced does nothing, and W walks.

### ctl-16 — server: no talking, advancing dialogue or shopping during an ongoing battle (NEW-2)
category: gameplay integrity (server authority) · severity: MED · size: LIGHT
touches: server-module/src/npc.rs, server-module/src/npc_tests.rs, server-module/src/economy.rs, server-module/src/economy_tests.rs, server-module/src/raising_tests.rs
after: []
- Evidence: `talk` (`server-module/src/npc.rs` ≈261-300) has no in-battle check. Neither do `advance_dialogue` (≈357, which applies effects including `GrantItem`), `buy` (`economy.rs` ≈100) or `sell` (≈194). So a client, hostile or via B17, can mid-battle open a dialogue that applies `auto_effects` and fires the quest Talk trigger, advance into granting choices, and buy cures or bait.
- Evidence: every sibling reducer that touches monsters, items or currency guards on the SSOT `guards::is_in_ongoing_battle(ctx, identity)` (`care`, `train`, `heal_party`, `essence_train`, `consume_crystalized_essence` in raising.rs) and returns a plain `Err("cannot X during an ongoing battle")` with no log line.
- Notes: behaviour only; no schema change, no reducer signature change, no bindings regeneration. Runs in parallel with everything. No e2e or eval talks, advances or shops mid-battle; `trading_tests.rs` ≈2907-2947 is unaffected. `dismiss_dialogue` stays allowed, so Start can pop a dialogue suspended under a battle.
- Tasks: fixtures register the battle row with `player_identity`/`opponent_identity` via `fx.table_keyed`. Make `raising_tests.rs`'s private `ongoing_battle()` helper (≈559) `pub(crate)` and reuse it.

- **CTL16.1:** IF `talk` is called by a player in an `Ongoing` battle in either role, THEN THE SYSTEM SHALL return `Err("cannot talk during an ongoing battle")` with the store unchanged.
  - The guard sits after the joined and `require_not_deleting` checks.
  - No conversation row is created or replaced, no `auto_effects` apply, and no quest trigger fires.
  - Red: a native-host test in `npc_tests.rs`. Today `talk` succeeds mid-battle.

- **CTL16.2:** IF `advance_dialogue` is called by a player in an `Ongoing` battle in either role, THEN THE SYSTEM SHALL return `Err("cannot advance dialogue during an ongoing battle")` with the store unchanged.
  - The guard sits after `require_not_deleting`, before any effect applies.
  - Red: a native-host test where advancing a `GrantItem` choice mid-battle grants the item today.

- **CTL16.3:** IF `buy` or `sell` is called by a player in an `Ongoing` battle in either role, THEN THE SYSTEM SHALL return `Err("cannot buy during an ongoing battle")` or `Err("cannot sell during an ongoing battle")`, with no wallet, inventory or escrow change.
  - The guard sits after `require_not_deleting` and before the quantity checks, so the store is byte-identical on refusal.
  - Red: native-host tests in `economy_tests.rs`. Today both succeed mid-battle.

- **CTL16.4:** WHEN `dismiss_dialogue` is called during an `Ongoing` battle, THE SYSTEM SHALL still succeed.
  - A native-host test pins this.

## Build order

```
pgcc-a ─→ ctl-1 → ctl-2 → ctl-3 → ctl-6a ─┐
ctl-4 (any time before ctl-5) ────────────┴→ ctl-5 → ctl-6b → ctl-6c → ctl-7a → ctl-7b
  → ctl-8a → 8b → 8c → 8d → 8e ─┬→ ctl-10a → ctl-10b ─────────────┐
           ctl-9 (any time) ────┘                                 │
                                └→ 8f → 8g → 8h → 8i → 8j → 8k ───┴→ ctl-11a → ctl-11b
  → ctl-12 → ctl-13 → ctl-14 → ctl-15 → pgcc-c → pgcc-d
ctl-16 (any time; server-only)
```

- **Parallel lanes:** ctl-4 alongside pgcc-a and ctl-1..3; ctl-9 and ctl-16 at any time. `docs/DECISIONS.md` is touched by ctl-5, ctl-9, ctl-10b and ctl-14 (different entries); the overlap check will serialize ctl-9 against whichever of those is in flight.
- **ctl-8 chain, consumer order:** Dialogue/Shop/Heal, Monsters I, Monsters II, Social I and the wizard first, because ctl-10a/10b consume them. Bag/Journal, Social II, Profile, Battle I, Battle II and Session follow; ctl-11a needs every screen. ctl-10a/10b may interleave with 8f–8k; they share only the append-only catalogs and `screens/index.ts`, so the supervisor's overlap check may serialize them, and either order is correct.

## Bug coverage (every CONFIRMED item → its fixing slice)

| Bug | Sev | Fixed by |
|---|---|---|
| B1 blank session overlay | HIGH (latent) | ctl-8k (CTL8K.1) |
| B2 claim title/body invisible | MED | ctl-8h (CTL8H.3) |
| B3 overlays unanchored (11 shells) | HIGH | ctl-7a (9 shells, prompt, countdown), ctl-7b (JS views), ctl-8h (claim, privacy), ctl-8k (session) |
| B4 claim ignores Escape (pgcc defect 5) | LOW | ctl-6b (CTL6B.3) |
| B5 Escape dead in trade-propose/rename | MED | ctl-6b (CTL6B.5), applied in ctl-8e and ctl-8h |
| B6 KeyT gate differs | LOW | ctl-10a (CTL10A.3) |
| B7 false-success shape (pgcc defect 2) | LOW | **pgcc-a** (runs first); the ctl-4 feedback line never claims undelivered success |
| B8 stuck `dismissPending` (pgcc defect 4) | LOW (latent) | ctl-3 (CTL3.6) |
| B9 `'Cared!'` uncatalogued (pgcc defect 1) | LOW | **pgcc-a** |
| B10 bait/cure parse divergence (pgcc defect 3) | LOW (latent) | ctl-8j (CTL8J.1) |
| B11 menu/help English-only (= C2) | LOW-MED | ctl-5 (menu), ctl-7a (`#help-hint` deleted), ctl-14 (help) |
| B12 no on-screen close | MED | ctl-7a (chips), ctl-8j (outcome continue), ctl-13 (toast), ctl-15 (right-click, long-press, chips) |
| B13 heal flow split / `locations[0]` | LOW (latent) | ctl-8a (bound heal prompt), ctl-10a (Box button and callback removed) |
| B14 `held.clear()` inconsistent | LOW | ctl-2 (CTL2.4) |
| B15 "nearby" copy false (= C3) | LOW | ctl-10b (CONTROLS rows), ctl-14 (generated help) |
| B16 drift: F8, dead test refs, 16 vs 17, g/h presses | LOW | ctl-1 (main.ts citations), ctl-7a (`index.html` citation), ctl-11a (g/h), ctl-11b (focusTrap comment), ctl-14 (F8 in Help, PLAYTEST.md) |
| B17 Escape hides an Ongoing battle | MED | ctl-2 (movement gate), ctl-3 (frames drop on battle), ctl-6b/6c (Start never hides a battle), ctl-16 (server) |
| B18 menu affordances | LOW | ctl-4 (indicator), ctl-7a (CTL7A.3 non-colour mark), ctl-5 (Right no longer enters) |
| main.ts:1711 ArrowUp/W release | LOW | ctl-1 (CTL1.2) |
| NEW-1 black-on-near-black text | HIGH | ctl-7a (CTL7A.3), ctl-7b (CTL7B.1) |
| NEW-2 no in-battle guard on talk/advance/buy/sell | MED | ctl-16 |
| C4 S-overlay-anchor orphaned | HIGH | ctl-7a, ctl-7b |
| C7 DECISIONS "integer scaling" wording | LOW | ctl-5 (Task; substantive) |
| C1, C5, C6, C8, C9, C10 (harness doc/ledger drift) | LOW | Harness documents, not game slices |

## Decision drafts (each landed by the slice named)

Format follows game `docs/DECISIONS.md` (title-keyed, rewrite in place). The build slice's doc-keeper may tighten wording against the shipped code but keeps the decision, why and rules-out.

**1. Superseding in place, by ctl-14.** Replaces the whole entry "## Client UI: one overlay registry, keyboard first", at the same position.

> ## Client UI: virtual buttons, one context stack, one overlay frame
>
> **Decision.** Every input resolves, through one binding table (`client/src/input/bindings.ts`), to a closed set of virtual buttons: D-pad, A, B, X, Y, LB, RB, Start, Select. Letter keys are optional accelerators that open a canonical menu path. Every screen is a frame on one pure context stack (`client/src/ui/contextStack.ts`) over a world or battle base. B pops one frame; Start pops to the base, or opens the main menu at a base. `SCREEN_POLICY` is a total record per frame (owner, battle behaviour, battle-safety). Server-owned state (battles, dialogue, requests) is reconciled into the stack on every batch, never pushed by a keypress, and the client never closes a server-owned frame itself; it sends the reducer (`dismissDialogue`). Every frame renders as a class-styled `.mr-frame` inside `#game-screen` with one chrome (`client/src/ui/frame.ts`). Menus are D-pad lists, grids and tabs (`client/src/ui/nav.ts`) whose active item is a key, never an index or a pointer cursor. The hint bar and Help are generated from the live bindings. Bindings persist per browser in `localStorage['mr.controls']` (versioned; D-pad, A, B and Start always keep a key). Each view keeps its state in a pure model (`*Model.ts`) with a thin DOM view. Accessibility metadata for every overlay is one total record (`OVERLAY_A11Y`); status badges pair colour with a short text token defined once in `game-core` (`A11Y_TOKENS`); `Element.animate` is banned by a Biome plugin (`client/lint/no-waapi.grit`). All UI strings come from a total typed catalog (`client/src/ui/i18n/`: `en` and `fr`); `t()` throws on a missing key, and `setLocale` throws on an unregistered locale.
>
> **Why.** A handheld-console grammar, where a few contextual buttons are primary and hotkeys are shortcuts, is the intended interface. One stack makes "back one level" and "exit everything" uniform. Silently dismissing a modal on a stray keypress loses input, and for dialogue it desyncs server conversation state, so server-owned frames follow the store and an ongoing battle cannot be hidden. Pure models make the UI logic testable without a DOM. Generated hints and help cannot drift from the bindings. A total catalog makes a missing translation a compile error rather than a blank label, and throwing (rather than showing the key) keeps an unwired string from looking wired.
>
> **Rules out.** A feature reachable only by a hotkey; a hotkey-only discovery menu; a hand-written controls list; a dedicated interact key; per-overlay tiers, mutual-exclusion checks and force-hide lists; overlays anchored to the window or in page flow; menus that hide themselves on a pick; conveying meaning by colour alone; WAAPI animation; hard-coded UI strings; falling back to the key or `en` when a string is missing.

**2. Rewrite in place, by ctl-5.** Replaces the body of "## Held keys: commit threshold and warp continuity".

> ## Held keys: commit threshold and warp continuity
>
> **Decision.** Movement is driven by virtual D-pad edges from the input router (`client/src/input/router.ts`), refcounted across physical keys, so releasing ArrowUp does not stop a held W. OS key-repeat drives neither movement nor menus (`e.repeat` is ignored). A press sends one step immediately; continuation comes from the frame loop re-issuing the held direction only after the key has been held for `HOLD_COMMIT_MS` (150 ms, `client/src/prediction/heldKeys.ts`), only when the predictor has no outstanding steps, and only while `movementEnabled` (the world base with no frame above it and the session gate open). Every push of a non-base frame clears the held set, so a direction held through a menu does not resume when the menu closes; the player presses again. Menu auto-repeat is synthesized by the router on an injected clock (350 ms, then 100 ms) and clamps at list ends. A zone warp keeps the held-key stack across the prediction reset; a reconnect does not.
>
> **Why.** Key-repeat rates vary by OS and flood the server. The threshold separates a tap (one tile) from a hold (walk), and waiting for outstanding steps to clear stops the client from queueing moves faster than the server drains them. Keeping the stack across a warp lets a player walk through a door without re-pressing the key. A walk that resumes behind a closing menu is a step the player did not ask for, and stale hold stamps would skip the commit threshold.
>
> **Rules out.** Repeat-driven movement or menus; emitting continuation steps while earlier ones are still in flight; resuming a held walk after a frame closes.

**3. New entry, by ctl-10b.**

> ## Interaction target: the tile in front, then your own tile
>
> **Decision.** A (and a click on the world) acts on the candidates from `game_core::interact_candidates`, exported to the client as `interact_candidates_coded`. The candidates are the entities on the tile the character faces (`pos.step(facing)`), or, if there are none, the entities on the character's own tile. Same zone only; ordered NPC, then heal, then player, then by id. An entity within range but not in front is never a candidate, even though `talk` accepts up to `TALK_RANGE` (2). The UI starts trades and challenges only from a player you face. The server stays permissive.
>
> **Why.** Interaction follows what the character faces, as in console RPGs. The server's range is a latency margin for an NPC that steps one tile before the reducer runs. It is not the player's reach.
>
> **Rules out.** A nearest-within-range target; widening the client rule to match `TALK_RANGE`; starting a trade or challenge remotely from a menu.

No other entry meets the bar: face-to-face UI routing is code-evident; the NEW-2 guards follow the existing `is_in_ongoing_battle` pattern; "Bounded client prediction" is unchanged.

## Interaction with other roadmap work

**M-postgate-client-coverage** (`M-postgate-client-coverage.spec.md`):

| Item | Disposition |
|---|---|
| pgcc-a (B7 shape + B9) | **Runs first** (`after: []`); ctl-1 is `after: [pgcc-a]`. Its feedback core is what the screen adapters later call. ctl-4, ctl-9 and ctl-16 may run alongside it. |
| pgcc-b (hotkey table, Escape priority, characterization suite, defect 5) | **Superseded** by ctl-1 (router), ctl-6b (Start/B; defect 5 = B4) and ctl-11a (accelerators). |
| pgcc-c C3/C4 (shop-open step, defect 4) | **Absorbed into ctl-3** (CTL3.5, CTL3.6). |
| pgcc-c C1/C2/C5 (battle-emit and ranked latches) | **Remain**, `after: [pgcc-a, ctl-15]`, re-grounded against the new code. |
| pgcc-d D3 (Escape terminal-dismiss latch) | **Absorbed into ctl-6b** (CTL6B.2). |
| pgcc-d D5 (`<select>` parse, defect 3) | **Obsoleted by ctl-8j** (lists, no parse). |
| pgcc-d D1/D2/D4 and the `vite.config.ts` "KNOWN FOLLOW-UP" comment rewrite | **Remain**, `after: [pgcc-c]`. pgcc-d owns the comment rewrite. |

**M25:**
- **S1** (trade-proposal oracles; `blocked:checkpoint-2-ratification`) is server-side and may run in parallel with any ctl slice except ctl-8e and ctl-10b, which touch `client/src/ui/tradeProposeModel.ts` and its test. Whichever lands second re-grounds. S1's `trade-zz-negative.spec.ts` is untouched here (hook-driven). ctl-16's `npc.rs`/`economy.rs` are disjoint from S1's `trading.rs`.
- **S2** (`battle_challenge` split) touches `pvpModel.test.ts` and `net/rowConvert.ts`. Do not run it concurrently with ctl-8d or ctl-10b.
- **S4** (audit) runs after this milestone and reviews ctl-16's guards.

**Feedback-ledger re-disposition** (for the supervisor to apply; ids are `r2-2026-07-26-NNN`):

| Item(s) | Current | New disposition |
|---|---|---|
| 006, 007, 091 (overlay design overhaul) | DISPOSED → uxd3 | ctl-7a/7b + the ctl-8 chain |
| 008, 009 (NPC panel at page bottom) | DISPOSED → uxd3 | ctl-7a, ctl-8a |
| 060, 061 (retro dialogue window) | DISPOSED → uxd3 | ctl-8a |
| 013, 014, 051 (UI within the game screen) | DISPOSED → uxd1 | ctl-7a |
| 010, 011, 012, 047–050 (set-ratio game box) | DISPOSED → uxd1 (partial) | DPR/scaling delivered by uxd1; set-ratio box → R-ctl-SETRATIO |
| 016 (bare `/` help) | DISPOSED → uxd3 (no criterion) | ctl-6b (CTL6B.4) |
| 022 (default interact key) | DISPOSED → uxd2 (delivered as T) | Superseded by ctl-10a (A on the faced target) |
| **023 (contextual buttons)** | DISPOSED → uxd2 (**mis-dispositioned**) | The whole milestone; closes at ctl-15 |
| 024 (interact in front; multi-action pick) | DISPOSED → uxd2 (partial) | ctl-9, ctl-10a |
| 025 (no trade/challenge from anywhere) | DISPOSED → uxd2 (partial) | ctl-10b |
| 026 (easter eggs via interaction) | DISPOSED → uxd2 (not delivered) | R-ctl-OBJINTERACT |
| 035 (case-insensitive; modifiers pass through) | DISPOSED → uxd3 (partial) | ctl-1 (CTL1.3) |
| 052, 053, 055–059 (researched console-style redesign) | DISPOSED → uxd3 | The whole milestone |
| 087, 089 | IN-WORK (stale) | DONE → feel-polish (archived) |
| 088, 090 (walk speed / walk animation) | IN-WORK (stale) | R-ctl-RUN |

**Roadmap facts:** PLAN §9 lists this milestone as item 1, ahead of M25 (blocked) and Playtest-3, with pgcc-a first and pgcc-c/pgcc-d after ctl-15; M-gamepad is a pre-release item after Playtest-3. R-rb-56-FOLLOWUP-ACC (rb-98) is absorbed by ctl-8i and R-rb-121-DEFER-FOCUS-RECHECK by ctl-5.

## Post-integration verification

After ctl-15 (and ctl-16) merge, on master:
1. The full `just ci` is green, including `client-typecheck`, `client-test`, `client-verify-build`, `wasm` and the `bindings-drift` eval.
2. `just e2e` is green, including the new flows: `menu-flow`, `remap`, `pointer`, `battle-dpad`, `respond-request`, the hold-through-menu case in `movement-input`, and the typing flow in `rename`.
3. No schema or bindings change: `git diff <milestone-base>..master -- client/src/module_bindings server-module/src/schema.rs` is empty. The only `server-module` changes are ctl-16's. client-wasm and its `.d.ts` are rebuilt, not regenerated bindings.
4. The operator's required flow passes on master by **keyboard only** (`menu-flow.spec.ts`) and by **mouse only** (`pointer.spec.ts`). A manual check of the same flow under `fr` shows no English strings.
5. **Manual before Playtest-3:**
   - an NVDA pass over the main menu, a nested frame, the battle and the session gate (titles announced, no double speech, focus returns correctly);
   - one playtest-style session (explore → talk → shop → battle → menu flow → remap → reload).

   Record findings in the handoff. New defects become residuals, not slice re-opens.

## Risks / decisions

- **Design §14 defaults adopted** (the operator may override; each has a last safe override point):
  - Start in battle opens the main menu read-only, with the PvP timer running — override before ctl-6c (where it is built; ctl-6b leaves Start inert on an ongoing battle).
  - B has no second default key besides Backspace — override before ctl-12 (the key is baked into `DEFAULT_BINDINGS` from ctl-1, but remap and the generated hints are not yet built).
  - Box, Raising and Evolution merge into Monsters with one action sheet — override before ctl-5 (the menu IA names Monsters).
- **NEW-2 is a design call** (bug validation: "design impact UNCERTAIN"). The disciplined default is to guard, matching every sibling reducer (ctl-16). ctl-16 is independent and can be dropped if the operator rules that talking or shopping mid-battle is intended.
- **Long `main.ts` serialization** (19 slices including pgcc). Throughput, not correctness, is the risk; the parallel lanes mitigate it.
- **Mixed control grammar between slices.** The strangler keeps the game playable, but the grammar is mixed from ctl-5 to ctl-15. **Do not raise Playtest-3 mid-milestone.**
- **The Escape-means-Start change is the largest e2e break.** ctl-6a moves the prophylactic presses onto `closeAll()` before ctl-6b changes Escape's meaning.
- **Nightly mutation.** game-core's zero-miss run covers `interact.rs` (ctl-9 tests every branch); ctl-16 may need a `mutate-server` cap re-adjudication, which is a report, not a gate.
- **Narrowing the interaction rule** could strand content. Guarded by CTL9.4.
- **Platform gaps:** `localStorage` can be unavailable (private mode) → try/catch with in-memory defaults; Escape is swallowed in fullscreen → M stays a Start alias; touch synthesizes mouse events → `preventDefault` on touch `pointerdown`; keycaps on non-QWERTY layouts are right only after a key's first press (R-ctl-LAYOUTMAP).

## Controller readiness

`M-gamepad.spec.md` owns the pad design (W3C standard mapping, `stickToDpad`, pad glyphs). This milestone delivers what it consumes: the router's source-agnostic `{button, down}` edges (CTL1.5), the one binding table, `releaseAll`, the versioned binding store and `glyph()`. Contexts, nav, screen adapters, frames, the hint bar and Help need no change for a pad.

## Spec review (2026-10-01)

- Faithfulness, correctness, standards and simplify lenses revised this spec: pgcc-a first; §14 defaults adopted; splits into ctl-6a/6b/6c, 7a/7b, 10a/10b, 11a/11b and an eleven-slice serial ctl-8 chain; the cuts listed in design §17 and its changelog; i18n and file-naming rules; non-behavioural criteria moved to Tasks; `advance_dialogue` guarded.
- Not adopted:
  - A structured `mr_log` on ctl-16 refusals: in-battle refusals in `raising.rs` (care, train, heal) return a plain `Err` with no log, and ctl-16 follows that pattern.
  - Editing the six shell-less boot tests for `#game-screen`: `main.ts` already tolerates a missing mount (≈2486), and ctl-7a keeps that.
  - Bag as a new `OverlayId`: the probe and handle records stay `main.ts`-owned until ctl-11b, which a screen slice cannot touch; Bag reuses the raising root (ctl-8c → ctl-8f).
  - The "+4 over the accelerator" press-count test: dropped; only the ≤ 7 reachability bound is a criterion.
  - pgcc-a after ctl-15, and deferring Players: overruled (pgcc-a first; a minimal Players list kept).
- Final verification round (2026-10-01): a tested non-colour active mark (CTL7A.3); LB/RB edges wrap tabs (CTL4.2, CTL11A.3); deferrals live in the residual registry; a Clear action for accelerator rows only (CTL12.7) keeps accelerators removable; the chip carve-out in CTL15.1; the a11y keyboard-pass test retargeted (ctl-5, ctl-7a); candidate memoisation (ctl-10a); the ctl-5 menu seam and the ctl-2 base derivation made explicit; `__game().stack` is base-inclusive; wallet-balance ids frozen (ctl-8a); Y lands on Accept (CTL13.3); a lone player is a no-op until ctl-10b; the e2e helper and `nearestInteractable` shapes moved to Tasks; absences rephrased as behaviour (CTL7A.4, CTL11B.1); the CTL8F.1 novel-pocket fixture.
