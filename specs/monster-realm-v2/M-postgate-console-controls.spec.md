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
- **`main.ts` is a serialization point.** The `main.ts` chain is pgcc-a → ctl-1 → 2 → 3 → 5 → 6b → 6c → 7a → 7b → 7c → 7d → 10a → 10b → 11a → 11b → 12 → 13 → 14 → 15 → pgcc-c → pgcc-d. ctl-4, ctl-6a, ctl-8a–8k, ctl-9 and ctl-16 never touch it (ctl-7c and ctl-7d are the seams that make this true).
- **The ctl-8 screens are a serial chain.** Every screen slice appends to the catalogs, `messageIds.ts` and `client/src/ui/screens/index.ts`, and the i18n gates read those files as text, so they run one at a time in consumer order (see "Build order"). A screen slice changes only its own `screens/<name>Screen.ts`, its model/view files and their tests, its `screens/index.ts` entry, the catalogs, its e2e and (ctl-8a only) the frame class rules in `styles.css`. If it needs a new `Command` arm or other `main.ts` wiring, that is a hidden dependency: stop and surface it, as the build loop requires.

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
- Build note (ctl-1, 2026-10-01): the e2e refcount case drives the KeyD/ArrowRight pair (the suite's measured world is the y=1 east/west corridor); W/ArrowUp is driven in `main.input.test.ts` and `router.test.ts`. The keyboard source answers a non-repeat keydown on a still-recorded code (a lost keyup, e.g. macOS under Cmd) with `[up, down]`, so the key is never dead. The chord return sits right after the session gate, which stays first.

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
- Build note (ctl-2, 2026-10-01):
  - **The e2e uses the box, not the menu.** The e2e holds ArrowRight in the y=1 corridor and opens the box (KeyB), not the menu. M already called `held.clear()` on master, so an M-only test could not fail on the defect; KeyB never cleared held. The menu, I, E, Q, L, U and P openers and a server-opened dialogue are covered in `main.input.test.ts`.
  - **The stack mirrors; nothing pushes onto it directly.** `syncStack()` in main.ts mirrors the visible overlays (`mirrorEdges`) and derives the base inside the sync from `store.ongoingBattle` (any Ongoing own row, either role, agreeing with the server guard and `__game().ongoingBattle`). It does not use "latest row is Ongoing" from a separate listener, so listener order cannot matter.
  - **Where it syncs.** It syncs on every `movementGate()` read, at the top and tail of each keydown, at the top of each frame and in the last batch listener. `__game().stack` only reads it.
  - **A base change also clears held.** A change of base kind (world↔battle) clears held too, so a hold never outlives a battle.
  - **KeyT uses the movement gate too.** The KeyT interact guard moved to `movementGate()` along with the prompt's `overlayUp`, so the prompt never advertises a target T refuses.
  - **`nav` is not on the frames yet.** `screen`/`prompt` carry no `nav` yet; it arrives with ctl-4/ctl-5. `SCREEN_POLICY` values other than dialogue are provisional.
  - **Residuals.**
    - A batch that both pulls the player back and server-opens an overlay still lets that batch's reconcile re-issue send one step, because the overlay is shown by a later listener. This is unchanged from master; ctl-3's store-derived reconcile closes it.
    - Stale citations outside `touches:`: `main.a11yFocus.test.ts:526` names the deleted test C, and `ui/claimView.ts:3` says `anyOverlayVisible()` guards movement.

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
- Build note (ctl-3, 2026-10-01):
  - **Reconcile only pops.** `reconcile(stack, {ongoingBattleId, outcomeShown, conversation})` derives the base and pops; it never pushes. The dialogue frame and the terminal-outcome frame are still pushed by the mirror of their store-rendered views, so a null view model (a missing NPC row, a corrupt battle team) can never strand a frame and kill movement. "Push the dialogue frame" (CTL3.4) is therefore the mirror's job until ctl-6b's `applyStack` owns show/hide.
  - **Batch-only, level-triggered.** Reconcile runs on every batch (the first UI listener, before the battle and dialogue listeners, so a close never follows a show and steals focus), as base → mirror → reconcile. Frame, keydown and `movementGate` syncs stay base + mirror. Like master's per-batch force-hide, an overlay opened over an Escape-hidden Ongoing battle closes on the next batch; ctl-6c's `battleSafe` refines that.
  - **The terminal outcome drops too.** `outcomeShown` is `decideBattleOverlay`'s answer for a terminal row, read without committing it. It only decides drops and never pushes or pops the `battleView` frame, so a zone switch cannot pop an unseen outcome.
  - **`canOpen('battleView', …)` now denies.** `overlayRegistry.ts` must stay import-free, so it cannot read `SCREEN_POLICY`, and nothing in production asked it about a battle.
  - **The deferred shop open is stricter than written.** It is dropped unless the stack is a bare world base (a battle base or an outcome frame blocks it as well as a player frame), via the pure `blocksPlayerOpen`.
  - **Deferred to ctl-6b.** The CTL3.4 sub-bullet "popping a dialogue frame emits `dismissDialogue`" is a *player* pop (Start), which has no producer before ctl-6b. A reconcile pop is server-caused and emits nothing.
  - **Residuals.** The ctl-2 residual (a batch that pulls the player back and server-opens an overlay can still re-issue one step) stays open, because the dialogue frame is still pushed by the view mirror. Outside `touches:`, stale comment citations of the deleted symbols remain in `privacyView.ts:22`, `dialogueView.ts:24`, `menuView.test.ts`, `main.privacyWiring.test.ts`, `tradeProposeView.test.ts`, `leaderboardView.test.ts`, `renameView.test.ts`, `privacyView.test.ts` and `helpView.test.ts`.

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
- Build note (ctl-4, 2026-10-01):
  - **What a consumer calls.** `nav.ts`: `list`/`grid`/`tabs` (validated: no duplicate or whitespace keys, `cols` an integer ≥ 1, tab keys `tab`/`root` reserved, no `{tab}-{key}` or `tab-{tab}` id clash across tabs), `navInit(layout, remembered?)`, `navStep(layout, state, {button, repeat})` → `moved | none | ignored | activate | disabled{reason}`, `navReconcile(prev, next, state)`, `navFocus(layout, state, {tab?, item?})` for declared defaults (Shop→Buy, Fight, Yes/No), and `rememberNav`/`recallNav` over an immutable `NavMemory` map that the session (ctl-5) holds. `navRender.ts`: `renderNav(container, layout, state, {frame, fill, labelledBy?})` and `renderTabs`. `frame.ts`: `createFrame(doc, {id, size})`, `setFrameTitle`, `renderFrameTabs`, and the pure `feedbackStep` with a thin `renderFeedback`.
  - **Behaviour beyond the criteria.** A with `repeat` set does nothing. Zero tabs and empty lists are legal. `tabs([])` and empty tabs are legal for Bag pockets. Per-tab memory never stores null. A vanished remembered tab lands on the first tab's remembered item. The same state object comes back when nothing changed.
  - **Ids.** Frame ids must be non-empty with no whitespace or `-`, so `{frame}-{tab}-{key}` ids cannot collide across frames. Non-tab layouts use the tab segment `root`.
  - **Feedback tokens.** Tokens must be unique per action. A late resolution of a superseded, cleared or info-interrupted action is ignored.
  - **Rendering.** The kit resets item classes every render, and `fill` owns only an item's children, which are never focusable. The active item is scrolled into view (`block: nearest`) when it changes while attached.
  - **The kit writes no text.** Glyphs (▶ › ✓ ! … LB/RB) are CSS pseudo-elements with empty alternative text. The feedback line is not a live region.
  - **Residual R-ctl-4-X1.** Three render-hygiene mutants survive the unit tier.

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
- Build note (ctl-6b, 2026-10-01):
  - **Escape is routed in the capture phase; nothing else is.** `renameView.ts`/`tradeProposeView.ts` are outside `touches:`, so instead of the views dropping `stopPropagation`, main.ts registers its key handler twice: capture phase for `Escape` only, bubble phase for every other code. The views' `stopPropagation` therefore still shields their fields and submit buttons from the letter ladder (a focused `#rename-submit` + N does not toggle-close and wipe the draft). A composing Escape (IME) is stopped before the views' own Escape→hide and is not prevented. Residual R-ctl-6b-CTL6B.1 (→ ctl-14 DECISIONS).
  - **Typing mode** is the DOM-focused text field (text-like `INPUT`, `TEXTAREA`, contentEditable — not `SELECT`/checkbox): Escape moves focus to the frame's first enabled non-text control (else `<body>`, residual R-ctl-6b-CTL6B.5 → ctl-8h) and keeps the text; Enter stays the view's own and commits through `dispatch`. `textEntry` frames have the pure rules (Start pops it, A commits through the owner's adapter) but no producer yet.
  - **The stack stays the mirror.** `applyStack(prev, next)` only closes what `next` drops (top first, so privacy's dismiss flush still finds the claim shown), then `syncStack()` re-mirrors; a dismissed dialogue stays on the stack until the server row goes. Start on an Ongoing battle base is swallowed (B17); on a terminal outcome it continues via the pure `continuedBattleId`.
  - **Every view callback runs through `dispatch(command)`** (31 reducer arms + 4 stack arms), pinned row-by-row in `main.dispatch.test.ts`.
  - **Intentional test changes beyond the two named files:** `main.menu.test.ts` (CTL5-2-MAIN-ESCAPE-RETURNS, the Profile › Account case), `main.input.test.ts` (CTL2-3-BOOT-B17, CTL3-2-BOOT-OUTCOME-SAME-BATCH), `router.test.ts` (CTL5-2-ROUTER-B-POPS-COVERED, no `pop` router effect any more), and `main.a11yFocus.test.ts`'s `?` presses (now `code: 'Slash'`; `e.key` is retired). Spec gap: a slice that changes a key's meaning should list every booted `main.*.test.ts` sibling that presses it.
  - **Unchanged by design:** Start/Select at the world keep the `worldHasFocus()` guard (as KeyM/`?` had); `?` on non-US layouts no longer opens help, and the player-facing help text still names `?`/Escape (residual R-ctl-6b-CTL6B.4 → ctl-14). `activateMenuLeaf` was already deleted by ctl-5.

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
- Build note (ctl-6c, 2026-10-01):
  - **Start opens the menu only at the bare battle base.** The pure `battleButton(stack, btn, outcomeAgeMs)` in `contextStack.ts` is asked before the top frame's adapter. With a conversation suspended over the battle (`[battle, dialogueView]`) Start is still CTL6B.2's pop-to-base and dismisses it.
  - **Frames opened over a battle are stamped.** A screen frame first mirrored while the base is (and already was) a battle carries `overBattle: <battleId>`. `reconcile` keeps a stamped `battleSafe` frame while that same battle is the base and drops it when the battle ends, vanishes or is replaced. A frame opened at the world still drops when a battle arrives (CTL3.2). A link drop hides every stamped frame, so a re-delivered battle row is the bare battle base again.
  - **CTL6C.2 as built differs from the criterion text ("exactly as Start does").** B and Start continue at once, as ctl-6b left them (B pops the outcome frame, Start pops to the base). A pops only the outcome frame, and only once the outcome has been up 400 ms (`OUTCOME_CONTINUE_GRACE_MS`), so an Enter mashed through the battle's last turn cannot skip the result; a held A never continues. A conversation suspended under the outcome survives A and B (Start dismisses it). The hint reads "Press Enter or Esc to continue".
  - **CTL6C.3.** `COMMAND_BATTLE_POLICY` is a total `Record` over the `Command` kinds (12 safe: the stack moves, the battle's own actions, `dismissDialogue`; 24 refused). `dispatch` refuses with `menu.disabled.inBattle` on the status line and the live region; the line is cleared when the base is the world again. Talk and Bag Use have no `Command` arm yet: talk is stopped by the movement gate, Bag Use by the disabled Bag row (`menu.disabled.battleBag`). The total `Record` makes ctl-10a and ctl-8f classify their new arms.
  - **Layering (supervisor decision option-a).** `client/index.html` gives `#menu-overlay` and `#help-overlay` z-index 120, above the battle root's 110. Journal and Rankings are `battleSafe` but stay **disabled** over a battle (`HIDDEN_UNDER_BATTLE` in `mainMenuScreen.ts`): their shells are in the page flow, under the battle. Over a battle only Options › How to play and Close are enabled.
  - **Obligations for ctl-7a / ctl-7b.** Keep the menu and help painting above the battle (the e2e below guards it). Once the Journal and Rankings shells paint above the battle, empty `HIDDEN_UNDER_BATTLE` and flip its pins; that needs `mainMenuScreen.ts`, `mainMenuScreen.test.ts` and `main.controls.test.ts` in that slice's `touches:` (R-ctl-6c-JOURNALRANKINGS).
  - **The layering e2e lifts `inert`.** `encounter-battle.spec.ts` E0 hit-tests with `elementFromPoint`. The a11y layer marks the suspended battle root `inert`, and Chromium leaves inert subtrees out of hit-testing, so a plain probe passed on the unfixed build while the battle painted over the menu. E0 lifts `inert` inside one `evaluate` and also pins the z-index order.
  - **touches-delta.** By the supervisor decision: `client/index.html`, `client/e2e/encounter-battle.spec.ts`. Sibling tests of declared files: `main.controls.test.ts`, `main.input.test.ts` (CTL2-3-BOOT-B17 and one stack shape), `main.dispatch.test.ts`, `catalog.test.ts`, `catalogParity.test.ts`.
  - **Residuals.** R-ctl-6c-PVPTIMER (the CTL6C.1 sub-bullet: the timer keeps running but the menu header does not repeat it, → ctl-8j), -MONSTERSRO (Monsters is disabled, not read-only, → ctl-8b), -SELECTINERT (→ ctl-8j), -JOURNALRANKINGS (→ ctl-7b), -MENUCOPY (→ ctl-8j), -REFUSALSURFACE (→ ctl-13), -STALETEXT (the shadowed `baseButton` battle arm in `screens/index.ts`, → ctl-8i).

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
- Build note (ctl-7a, 2026-10-02):
  - W-ONE-CORNER-AFFORDANCE no longer existed (its file, `main.wiring.test.ts`, was deleted), so there was nothing to rewrite. Six more `main.*.test.ts` files (controls, dialogueDismiss, dispatch, input, menu, feedbackCore) carried the same `body.children > 5` fixture check and were updated as sibling tests of `main.ts`.
  - `#game-screen` is `position: relative` at `100dvh` with `overflow: hidden`, never `fixed`, because a fixed box makes a stacking context that would sink the menu and help under the body-level banners. The nine shells and help are `.mr-frame.mr-shell`. `#menu-overlay` is `.mr-shell` only, because its visible frame is the `ui/frame.ts` one inside it. `.mr-shell--top` (menu, help) is `position: fixed`, because the ctl-6c E0 e2e pins all three layering roots as fixed.
  - The chips draw the button name with `::before` and speak it too, so the accessible name is "Start Menu" / "Select Help" (label in name). Both chips honour the session gate. Select has no identity guard, like `?`. `#status` moved into `#game-screen` as `.mr-status`.
  - The contrast e2e measures the menu, help and the rename shell. Extending it to every frame is R-ctl-7a-CTL7A.3, targeted at ctl-7b.

### ctl-7b — re-parenting battle, box, raising and evolution under `#game-screen`
category: ux-a11y (S-overlay-anchor) · severity: HIGH · size: MODERATE
touches: client/src/main.ts, client/src/styles.css, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/evolutionView.ts, client/src/ui/evolutionView.test.ts, client/e2e/a11y.spec.ts
after: [ctl-7a]
- Evidence: battle, box, raising and evolution self-style `position:fixed; inset:0` inside `#app` (z 100/110).
- Tasks: the ctl-7a contrast e2e extends to these four frames; re-baseline any `a11y.spec.ts` floor or ceiling the move changes, by name.

- **CTL7B.1:** WHEN battle, box, raising or evolution is shown, THE SYSTEM SHALL render it as a class-styled `.mr-frame` inside `#game-screen`, within the viewport, with its text at a contrast ratio of at least 4.5:1.
  - Their ids, testids and inline-style-free root contract (A11Y-12) hold; `reduced-motion.spec.ts` and `movement-input.spec.ts` keep passing.
- Build note (ctl-7b, 2026-10-02):
  - The four roots stay mounted in `#app`, which ctl-7a already put inside `#game-screen`. Moving them to `#frame-layer` would break `pvp.spec.ts` and `trade.spec.ts`, which detect the open box as `#app > div` with inline `display:flex`. `main.ts` is unchanged.
  - Box, raising and evolution are `.mr-frame.mr-shell`. Battle is `.mr-frame.mr-shell.mr-shell--top.mr-shell--battle`: `--top` gives the `position:fixed` that encounter-battle E0 pins, and the new `.mr-shell--battle { z-index: 110 }` follows `--top` so the battle sits under the menu and help (120) and above the other shells (100). Each root's inline style is only the `display` toggle and centring (battle: `justify-content: safe center`, so a tall battle scrolls from its title).
  - Evolution keeps `background-color: var(--mr-evo-backdrop)` and `color: var(--mr-evo-fg)` inline, because those tokens are what `prefers-contrast: more` re-colours. It is therefore the one frame whose background is translucent (0.8 black). The Chromium e2e measures it at 4.5:1 or better against both a white and a black canvas.
  - The `opacity:0.4` empty states in box and raising became `color:#aaa` (7:1).
  - Folded in R-ci-fix-20261002T0901Z-RAISINGVIEWREBUILD. `RaisingView.refresh` re-renders each list only when a JSON key over the locale and the view-model changes (the pvpView shape). `hide()` forgets the keys.
  - The contrast e2e (`a11y.spec.ts` CTL7B-E2E-*) measures box, raising and evolution from real keypresses. Battle is measured through a fixture `BattleView` mounted in the real `#app`, because a grass-encounter walk is too slow for this spec; E0 still covers real-battle layering. The axe floors are unchanged.

### ctl-7c — the screen-nav seam: D-pad delivery, shell-hosted adapter state, `healParty { locationId }`
category: ux-a11y (structural seam) · severity: MED · size: MODERATE
touches: client/src/input/router.ts, client/src/input/router.test.ts, client/src/ui/screens/types.ts, client/src/ui/screens/index.ts, client/src/ui/screens/index.test.ts, client/src/ui/screens/legacyAdapter.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/main.controls.test.ts, client/src/main.input.test.ts, client/src/main.dispatch.test.ts
after: [ctl-7b]
- Evidence (ctl-8a parked at verify-scope, 2026-10-02, draft PR mdrewt/monster-realm#551): ctl-6b built the adapter seam only far enough for the main menu. Every other D-pad screen (ctl-8a–8k) hits three gaps that a `main.ts`-free slice cannot close.
  - `router.ts` hands a D-pad edge to `nav` only while the main menu is the uncovered nav frame (`main.ts` `routeCtx` sets `nav` from `menuPlace()`). A dialogue, shop or heal frame on top gets no Up/Down/Left/Right.
  - `screens/index.ts` always passes `nav = undefined` to `onButton`, and frames carry no `nav`. `ScreenAdapter.onButton` returns only a `ScreenResult`, so reveal progress, cursor, tab, quantity and confirm state have no home (module state is forbidden by the milestone rules). The main menu is hosted by hand in `main.ts` (`menuState`, `applyMenuStep`, `renderMenu`).
  - The `Command` arm is `{ kind: 'healParty' }`; `dispatch` resolves `healTargetLocationId(store.healLocations())`, which is `locations[0]` (B13).
- Intent: one generic seam, so ctl-8a–8k stay inside their declared `touches:` and keep their promise never to touch `main.ts`. No screen is converted here.
- Notes: the main menu keeps working unchanged (it becomes the first user of the generic path or stays on its hand-hosted path; either is fine if its tests keep passing). The Box Heal Party button stays location-less until ctl-10a.

- **CTL7C.1:** WHEN the top frame is a screen or prompt frame that has a nav-capable adapter, THE SYSTEM SHALL deliver D-pad edges to that frame (not only to the main menu), with the router's existing repeat rules.
  - A frame with no nav-capable adapter (every legacy frame) keeps today's behaviour: D-pad goes to the world when it is active, otherwise it is swallowed.
  - Red: `router.test.ts` pins a non-menu nav frame receiving Up/Down.
- **CTL7C.2:** THE SYSTEM SHALL host per-frame adapter state in the shell: `onButton(vm, state, btn)` returns `{ state, result }`, `main.ts` keeps one state per `FrameId`, resets it when the frame opens, and repaints the top frame's view after each step.
  - Legacy and existing adapters (`legacyAdapter`, main menu) keep their behaviour through a pass-through state.
  - Red: `index.test.ts` pins state threading, reset-on-open and one repaint per step.
- **CTL7C.3:** THE SYSTEM SHALL add `healParty { locationId?: number }` to the `Command` union. WHEN `locationId` is present `dispatch` SHALL send that id; WHEN absent it SHALL keep today's Box behaviour.
  - Red: `main.dispatch.test.ts` pins both arms, and the exhaustive `Command` row table stays total.
- Build order note: ctl-7d, then ctl-8a–8k, follow this slice.
- Build note (ctl-7c, 2026-10-02):
  - **Router.** `RouteContext.nav.screen` marks the uncovered nav frame as a nav-capable screen. Its D-pad presses and the synthesized repeats (350 ms, then 100 ms) go to `ctx.screen`, the top frame's adapter; A, B and Y reach it by the path they already had, so `battleButton` stays in front of every adapter call. The main menu keeps its `nav`-effect path and stays hand-hosted in `main.ts`. No existing router test changed. The Red named in CTL7C.1 is `CTL7C-1-SCREEN-NAV-DPAD`.
  - **`ScreenHost`** (`screens/index.ts`) replaces the free `screenButton`. `main.ts` holds one instance; it keeps one adapter state per `FrameId`. `ScreenAdapter<VM, S, V>` is now `nav?: true`, `viewModel(ctx)`, `init(vm)`, `onButton(vm, state, btn) → { state, result }` and an optional `paint(view, vm, state)`. State starts from `init` at the frame's first step after it opens (`opened(frame)` runs on the stack's push edge and only forgets the state), each step paints once into the view instance `main.ts` lends for that frame id, and a paint that throws is reported (console, error overlay, deduped on the message) without losing the button's result.
  - **How a ctl-8 screen plugs in without touching `main.ts`:** swap its `SCREEN_ADAPTERS` entry; give the adapter `nav: true` and a `paint` that calls its view (import the view class as a type only). There is no paint when the frame opens and none after a store batch: the view draws its opening state from the screen's own `init(vm)` and keeps its last painted state for `main.ts`'s legacy `view.render(vm)` batch calls. State is reset only on a push edge, so a frame whose content is replaced while it stays open (a new conversation in the same batch) must key its state on that content. A step's state is kept before its command runs and the command may be refused; an adapter must not act on `btn.repeat`. X (Space) is never delivered to a screen.
  - **Repeat rules tightened** (found by the lenses; they also apply to the menu): `resetRepeat()` forgets the held-press order, so a key held since before a push or pop is never handed the repeat back; a change of base kind and a reconcile drop reset the repeat.
  - **Intentional test changes:** the seven `CTL6B-*` tests in `screens/index.test.ts` (call shape; `call.nav` is now the init state) and the `ask` helper of `screens/legacyAdapter.test.ts`. `screens/index.test.ts` still pins that every shipped entry is the legacy adapter (`CTL6B-1-ADAPTERS-TOTAL`, `CTL7C-1-NAV-CAPABLE`); the first ctl-8 slice to swap an entry updates both as sibling tests.
  - **touches-delta:** `client/src/ui/screens/legacyAdapter.test.ts` (sibling test). `contextStack.ts` and its test needed no change.
  - **Still blocking ctl-8a (not built; outside the three criteria).** A dry-run of CTL8A.1–.3 against the seam found needs that live only in `main.ts` / `types.ts`. Residuals R-ctl-7c-BOUNDIDS, -SHOPQTY, -SHOPPICK, -REDUCEDMOTION (and -HEALGUARDTEST, backlog: the `healParty` send guard has no test on either arm):
    - `boundShopId` / `boundHealLocationId` are private to `main.ts`, so a shop adapter cannot know its `shopId` and a heal adapter cannot know the location to put in `healParty { locationId }`. Two read-only `ScreenContext` values would close it.
    - `buy` / `sell` carry no quantity; `dispatch` sends `SHOP_QTY = 1` (CTL8A.2's quantity row).
    - The greet-then-shop choice opens the shop only through the document click delegate (`stepShopOpen({ kind: 'shopPicked' })`); A on that choice needs a `Command` arm and a `COMMAND_BATTLE_POLICY` row.
    - The reduced-motion preference is private to `main.ts`, so an adapter cannot tell an instant reveal from a running one (CTL8A.1).
    - All four are built by ctl-7d (below), which also closes two more gaps its dry-run found.

### ctl-7d — the screen-context seam: bound ids, reduced motion, shop quantity and pick, batch observation
category: ux-a11y (structural seam) · severity: MED · size: MODERATE
touches: client/src/ui/screens/types.ts, client/src/ui/screens/index.ts, client/src/ui/screens/index.test.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/shopModel.ts, client/src/ui/shopModel.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/main.dialogueDismiss.test.ts, client/src/main.feedbackI18n.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts
after: [ctl-7c]
- Evidence @04a07833 (the ctl-7c build note above, re-surveyed):
  - `main.ts` keeps `boundShopId` / `boundHealLocationId` as module `let`s. `openPendingShop` and the T heal branch set them, and a reconnect clears them. A close leaves them set. `screenCtx` exposes only `store`, `identity`, `bindings` and `now`.
  - `Command` has `buy { shopId, itemId }` and `sell { itemId }`; `dispatch` sends `qty: SHOP_QTY` (`= 1`) and reports the fixed `shop.feedback.purchased` / `shop.feedback.sold` lines through `performCare`, whose `successMessage` is resolved before the send.
  - `stepShopOpen({ kind: 'shopPicked', shopId })` is reachable only from the document click delegate's `[data-shop-id]` branch. `COMMAND_BATTLE_POLICY` (`ui/contextStack.ts`) is total over `Command['kind']`, so a new arm needs a row there.
  - `motionPreference` (`render/motionPreference.ts`, the one `matchMedia` reader, A11Y-28) is read only by the render loop. It follows the query's `change` event.
  - Every view's batch listener in `main.ts` is registered before the final `store.onBatchApplied(() => syncStack())`, and nothing is registered after it.
  - **Found by this slice's dry-run (not in the ctl-7c note):**
    - `ScreenHost` runs adapter code only on a button step. A conversation's node is replaced by a server batch while its frame stays open, and nothing steps then, so a dialogue adapter cannot learn when the new text started to reveal. Its first A after a finished reveal would be a dead press (the CTL8A.1 reveal).
    - The shop's success line is chosen inside `dispatch`, so ctl-8a cannot make it name a quantity without touching `main.ts` (CTL8A.2's "Bought 2 Bait (−40g)").
- Intent: give adapters what ctl-8a needs, so ctl-8a–8k keep their promise never to touch `main.ts`. No screen is converted, and every `SCREEN_ADAPTERS` entry stays the legacy adapter.
- Notes:
  - The booted-`main.ts` Reds live in `main.dispatch.test.ts`. Its `vi.mock` of `ui/screens/index` and `swapAdapter` already put a stand-in adapter on one `SCREEN_ADAPTERS` entry, which is the path a ctl-8 screen takes, so no new dev hook or boot harness is needed.
  - The feedback formatter in `shopModel.ts` is pure and returns data (`{ qty, name?, gold? }`). `main.ts` passes it to `tf` with literal ids, so `shopModel.ts` stays free of i18n (`catalogParity`'s resolver-import roster is unchanged; ids stay literals at the call site).
  - Residuals R-ctl-7c-BOUNDIDS, -SHOPQTY, -SHOPPICK and -REDUCEDMOTION are delivered here. Their registry rows stay targeted at ctl-8a, because `mr-gates` has no retarget. The supervisor closes them when ctl-7d merges (`residuals close --slice ctl-8a --force --reason "delivered by ctl-7d"`) or with ctl-8a. R-ctl-7c-HEALGUARDTEST stays in the backlog.
- Tasks:
  - `main.ts`:
    - add the three `screenCtx` getters;
    - call `screenHost.observe(contextStack, screenCtx)` inside the final batch listener, right after `syncStack()`;
    - add the `pickShop` case;
    - check the quantity and build the feedback in the `buy` / `sell` cases;
    - delete `SHOP_QTY`, so the legacy shop view's buttons send `qty: 1`;
    - make the click delegate's `[data-shop-id]` branch dispatch `pickShop`, so the click and A share one path.
  - Delete `shop.feedback.purchased` / `.sold` from both catalogs and `messageIds.ts` (they become unused; `catalogParity` DEAD-KEY).
  - Named intentional test changes:
    - `main.feedbackI18n.test.ts`: the pinned feedback ids.
    - `main.dispatch.test.ts`: the `buy` / `sell` rows, the ShopView `onBuy` / `onSell` feedback-id pins, and the battle case's literal refuse list.
    - `contextStack.test.ts`: the `buy` literal and the policy counts.
    - `catalog.test.ts`: `EXPECTED_KEYS`.
    - `catalogParity.test.ts`: the `main.ts` literal-key list and its count.
- Build note (ctl-7d, 2026-10-02):
  - **Context.** `screenCtx` is one object with three live getters (`shopId`, `healLocationId`, `reduceMotion`), so a context an adapter keeps also reads live. `healView` is not hidden on a reconnect, so a heal frame can stay open reading `healLocationId: null` (residual R-ctl-7d-CTL7D.1 → ctl-10a; CTL8A.3's disabled Heal covers it).
  - **Quantity.** `validShopQty` (`ui/shopModel.ts`) is the rule; `dispatch` refuses before `performCare`, logs `console.error(<message naming the command>, qty)` and tells the player nothing. The SDK writes a u32 with `DataView.setUint32`, which wraps silently (−1 → 4294967295, 1.5 → 1, `'3'` → 3), so the check also refuses every non-number. Shop and item ids are not validated (residual R-ctl-7d-CTL7D.3, backlog).
  - **Feedback line.** `buyFeedback` / `sellFeedback` return a two-arm union, `{ kind: 'item', qty, name, gold } | { kind: 'count', qty }`, not the `{ qty, name?, gold? }` sketched in Notes: a name without gold cannot be built, and `main.ts` picks the id by `kind`. Any missing or malformed row gives the `count` arm.
    - Four ids replace the two deleted ones: `shop.feedback.buy.item`, `.buy.count`, `.sell.item`, `.sell.count`. en: "✓ Bought 2 Bait (−40g)" / "✓ Bought ×2" / "✓ Sold 3 Berry (+30g)" / "✓ Sold ×3". fr: "✓ Acheté 2 Bait (−40 or)" / "✓ Acheté ×2" / "✓ Vendu 3 Berry (+30 or)" / "✓ Vendu ×3".
    - The ✓ of CTL8A.2's example is part of these catalog strings, so ctl-8a adds nothing for it. The minus is U+2212.
    - `gold` is the unit price × `qty` in bigint, read off the same rows the reducer prices from. It is display only; a content re-seed between the send and the reducer is the one case where it can differ from what the server moved.
  - **`pickShop`.** The document click delegate dispatches it (its `Number.isNaN` guard stays), so the click and a screen's A share one path and a battle base refuses both.
  - **`observe`.** `ScreenHost.observe(stack, ctx)` keeps the state after the paint, so a paint that throws leaves the previous state. It compares states by identity (`!==`). A text-entry frame is skipped; on the real stack it replaces its owner's frame, so an owner is not observed while typing (no text-entry frame is pushed today; ctl-8h extends the walk if it needs it).
    - A persistently throwing `observe` reports on every batch; the error ring dedupes on the last message only (residual R-ctl-7d-CTL7D.6 → ctl-10a).
    - Not pinned: that `observe` runs only on a batch. A per-frame call would pass every test (verifier mutant M4). The next slice that edits `main.dispatch.test.ts` adds the assertion to `CTL7D-6-BOOT-OBSERVE`.
  - **How a ctl-8 screen uses it.** Return the SAME state object from `observe` when nothing changed and a new object to be painted; never change a state in place. The batch's legacy `view.render(vm)` has already run when `observe` is called.
  - **Tests.** The booted Reds are all in `main.dispatch.test.ts` and `main.feedbackI18n.test.ts`; `main.dialogueDismiss.test.ts` needed no change. Intentional test changes beyond the list above: `contextStack.test.ts` also changes the `sell` literal; `catalog.test.ts`'s edit sites are `EXPECTED_PLAIN`, `SAMPLE_PARAMS` and `EXPECTED_PARAM_OUTPUTS` (`EXPECTED_KEYS` is derived); `catalogParity.test.ts` 21r-b FR-04 drops the two deleted ids (15 → 13), and `CTL7D-4-CATALOG-BYTES` in the same file pins the four new ids' en and fr bytes instead.
  - **touches-delta:** none. `contextStack.ts` gained only the `pickShop` policy row.
  - **Found, not built.** `sell` answers a quantity above the owned count with "item is in an active trade" even with nothing in escrow (residual R-ctl-7d-CTL7D.4, backlog). `ui/shopOpenModel.test.ts` `CTL3-5-NO-DOUBLE-SEND` has an unseeded fast-check anti-vacuity floor (`opens > 10`) that fails about 1 run in 200. `render/motionPreference.ts`'s header cites a source scan that does not exist and calls `ResolveInput.reduceMotion` the only consumer.

- **CTL7D.1:** THE SYSTEM SHALL give adapters the bound shop and the bound heal location as two read-only `ScreenContext` values, `shopId: number | null` and `healLocationId: number | null`, read live at each call.
  - They report the shop the greet-then-shop open bound and the heal location T bound. Shop id 0 and location id 0 are reported as 0, not as null. After a reconnect both read null. After a close they keep their last value (every open rebinds).
  - Red: a stand-in adapter for `shopView` / `healView` records what its `viewModel(ctx)` saw on a button press after a real open.
- **CTL7D.2:** THE SYSTEM SHALL give adapters the OS reduced-motion preference as a read-only `ScreenContext.reduceMotion: boolean`, read live from `main.ts`'s one `motionPreference`.
  - No second `matchMedia` read (A11Y-28).
  - Red: a stubbed `matchMedia` fires `change` between two presses, and the stand-in adapter sees both values.
- **CTL7D.3:** THE SYSTEM SHALL carry a quantity on `buy { shopId, itemId, qty }` and `sell { itemId, qty }`, and `dispatch` SHALL send that `qty` to the reducer. WHEN `qty` is not an integer from 1 to 4294967295 (the reducer's `u32`), `dispatch` SHALL send nothing.
  - Reject, don't clamp. For 0, −1, 1.5, `NaN` and 2^32, the check runs before `performCare`: there is no reducer call and no shop line, and a `console.error` names the command. An invalid quantity is an adapter bug, not player input.
  - Red: a `qty` of 3 reaches `buy` and `sell` verbatim, and each invalid value sends nothing.
- **CTL7D.4:** WHEN a `buy` or `sell` succeeds, THE SYSTEM SHALL show a catalogued line in the shop that names the quantity, the item and the gold moved (for example "Bought 2 Bait (−40g)" / "Sold 3 Berry (+30g)"), in every locale.
  - The values are read from the store when the command is sent, not when it settles: the item name and `sellPrice` from the item-definition row, and the buy price from the shop-item row for the command's `shopId`. A sell-all removes the inventory row before the line shows.
  - WHEN the row is missing, the line names the quantity only. Any glyph follows the milestone's glyph rule.
  - The formatter is table-tested in `shopModel.test.ts`. A booted test pins the line in `#shop-feedback` under `en` and `fr`.
- **CTL7D.5:** THE SYSTEM SHALL add `pickShop { shopId: number }` to the `Command` union, which `dispatch` SHALL run as `stepShopOpen({ kind: 'shopPicked', shopId })`, and `COMMAND_BATTLE_POLICY` SHALL classify it `refuse`.
  - Dispatched with a conversation open, it sends one `dismiss_dialogue`. The shop opens on the first batch with no conversation, as the click does today.
  - Intentional: a Shop click over a dialogue suspended by a battle is now refused with the battle reason, where it used to send a dismiss. No test pins the old behaviour.
  - Red: `main.dispatch.test.ts` (or `main.dialogueDismiss.test.ts`) pins dismiss-then-open through the command. `contextStack.test.ts` pins that it is refused at a battle base.
- **CTL7D.6:** WHEN a store batch has been applied, THE SYSTEM SHALL call the optional `ScreenAdapter.observe(vm, state, now)` once for every open screen or prompt frame whose adapter defines it, and keep the state it returns.
  - The host API is `ScreenHost.observe(stack, ctx)`. It walks every screen or prompt frame in the stack from the bottom up, not only the top one. Each call gets `vm = adapter.viewModel(ctx)`, `now = ctx.now()`, and the kept state, or `init(vm)` when there is none.
  - `main.ts` calls it inside the final batch listener, right after `syncStack()`. A frame this batch pushed therefore starts from `init`, and the view renders of the batch have already run.
  - WHEN the returned state is a different object from the kept one, the host paints that frame once. When it is the same object, the host does not paint.
  - A throw from `viewModel`, `observe` or `paint` goes to the paint-error path. That frame keeps its previous state, and the remaining frames are still observed.
  - Adapters without `observe` (legacy, main menu) are not called, and their state is untouched.
  - Red: `screens/index.test.ts` pins threading, init-on-first-observe, paint-only-on-change, the throw case and skipping adapters without `observe`. `main.dispatch.test.ts` pins that a batch reaches a stand-in's `observe`.

### ctl-8a — Dialogue, Shop and Heal on the D-pad
category: ux-a11y + gameplay defect B13 · severity: MED · size: HEAVY
touches: client/src/ui/screens/dialogueScreen.ts, client/src/ui/screens/shopScreen.ts, client/src/ui/screens/healScreen.ts, client/src/ui/screens/index.ts, client/src/ui/dialogueView.ts, client/src/ui/dialogueView.test.ts, client/src/ui/dialogueModel.ts, client/src/ui/dialogueModel.test.ts, client/src/ui/shopView.ts, client/src/ui/shopView.test.ts, client/src/ui/shopModel.ts, client/src/ui/shopModel.test.ts, client/src/ui/healView.ts, client/src/ui/healView.test.ts, client/src/ui/healModel.ts, client/src/ui/healModel.test.ts, client/src/ui/screens/dialogueScreen.test.ts, client/src/ui/screens/shopScreen.test.ts, client/src/ui/screens/healScreen.test.ts, client/src/ui/screens/index.test.ts, client/src/ui/dialogueView.i18n.test.ts, client/src/ui/healView.i18n.test.ts, client/src/styles.css, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/dialogue.spec.ts, client/e2e/shop-npc.spec.ts, client/e2e/wallet-balance.spec.ts
after: [ctl-7d]
- Evidence:
  - The dialogue has no continue or close control, and leaf nodes have 0 choices (r2-008/009/060/061).
  - Shop items have no descriptions (r1 PlaytestReport :85).
  - `healView` is a display-only cost list (`ui/healView.ts` ≈40-55); the real heal is Box → Heal Party with `locations[0]` (B13).
  - The bound heal view model carries the bound `locationId` (`buildHealViewModelForLocation`).
- Notes: the views keep `data-choice-idx` and `data-shop-id`, because the `main.ts` document click delegate stays until ctl-15. The Box Heal Party button stays until ctl-10a, which migrates its e2e user.
- Tasks: `#shop-balance`, `#shop-for-sale button[data-item-id]` and `#dialogue-choices` keep their ids and first-paint semantics (used by `wallet-balance.spec.ts`); the spec passes unmodified.
- Seam map (ctl-7d dry-run against the seam at 04a07833 plus ctl-7d; nothing here touches `main.ts`):
  - **CTL8A.1.** `dialogueScreen.viewModel(ctx)` builds `buildDialogueViewModel(ctx.store.ownConversation(ctx.identity), <npcs by entity id from ctx.store.allNpcs()>, DIALOGUE_TREES)` (import `ui/dialogueContent`) and carries `ctx.reduceMotion`.
    - The state is keyed on the node. `observe` re-keys it when a batch replaces the node and records `now` as the reveal start. `onButton` has no clock, so `viewModel(ctx)` also carries `ctx.now()`, and A compares the two to know whether the reveal is still running.
    - A frame re-pushed while still shown (Start over an open dialogue: the server keeps the row and `syncStack` pushes it again) starts over from `init`. Its `observe` stamps a new reveal start, and the paint that follows restarts the view's reveal, so view and state agree.
    - While a battle suspends the dialogue (`SCREEN_POLICY` `suspend`), it stays the top frame and takes the D-pad. The adapter answers `unhandled` while `ctx.store` shows the player in an ongoing battle, so A does not raise a battle refusal on every press.
    - A on a choice → `advanceDialogue { choiceIdx }`; A on the greet-then-shop choice (`shopAction`) → `pickShop { shopId }`; A on a leaf, and B → `dismissDialogue`. The adapter answers Start as the legacy adapter does today.
    - The reveal itself is a class-driven animation in `styles.css`, so `styles.css` is in `touches:`. The bottom box is a class rule as well, because roots stay free of inline styles (A11Y-12). Under reduced motion there is no animation, and the state starts revealed.
    - `indexShell.smoke.test.ts` fails any `.mr-shell--*` rule that sets an inset or `overflow`. The bottom box therefore anchors an inner frame by flex alignment inside the shell, never with a `.mr-shell--bottom { bottom: 0 }`.
    - `dialogueView.i18n.test.ts` DV-01 pins the `#dialogue-choices` button texts. DV-02 walks the whole overlay for the text `render()` writes. New text is either a catalog id that those tests accept or is written by `paint`; either way they change as sibling tests.
  - **CTL8A.2.** `shopScreen.viewModel(ctx)` builds `buildShopViewModelForShop(ctx.shopId, …)`. A null `ctx.shopId` gives the no-shop view model.
    - Confirm Yes → `buy { shopId, itemId, qty }` / `sell { itemId, qty }`. The feedback line is ctl-7d's (CTL7D.4), so this slice adds no feedback ids.
    - Buy | Sell switch on LB/RB, which reach the adapter from PageUp/PageDown only until ctl-11a (CTL6B.6). Y (KeyF) reaches it, and the descriptions come from `StoreItemRow.description`.
    - **DOM shape pinned outside `touches:`.** `main.feedbackCore.test.ts` and `main.feedbackI18n.test.ts` click `#shop-for-sale button` and `#shop-inventory button` after a bare batch, with no step and no paint. `wallet-balance.spec.ts` needs `#shop-for-sale li` / `button[data-item-id]` at first paint. So both lists stay in the DOM from `render(vm)`, and the tabs only show and hide them and move the cursor. They never build only the active tab's rows.
    - An A-driven buy has no in-flight lock: `ShopView`'s pending lock guards only its own buttons, and `applyRouterEffect` drops `dispatch`'s promise. This is accepted, because the server is the authority. The confirm step makes a double send unlikely, and a lock would need `ScreenContext` and `main.ts` work.
  - **CTL8A.3.** `healScreen.viewModel(ctx)` builds `buildHealViewModelForLocation(ctx.healLocationId, ctx.store.healLocations(), ctx.store.itemDefs())` when the id is not null. Yes → `healParty { locationId }`.
    - `healView.i18n.test.ts` HL-01 / HL-02 pin `#heal-list` to its "Heal here (…)" rows. The question, Yes / No and the disabled reason therefore sit outside `#heal-list`.
  - **Known limit (not a ctl-8a criterion).** Initial focus goes to the static manifest anchors in `overlayRegistry.ts` (`#dialogue-npc-name`, `#shop-title`, `#heal-list`), and `overlayA11yWiring.test.ts` pins that. Focus therefore never reaches the nav container, and screen readers do not announce cursor moves. Moving the anchors is `overlayRegistry.ts` work for a slice that touches it (ctl-11b or ctl-12).
  - **CTL8A.4.** T keeps its legacy open paths in `main.ts`. Swapping the three `SCREEN_ADAPTERS` entries converts the frames they open, and `screens/index.test.ts` (`CTL6B-1-ADAPTERS-TOTAL`, `CTL7C-1-NAV-CAPABLE`) is updated as a sibling test.
- Build note (ctl-8a, 2026-10-02, PR mdrewt/monster-realm#551):
  - **Three pure screens** (`screens/dialogueScreen.ts`, `shopScreen.ts`, `healScreen.ts`), each `nav: true` with `observe` and `paint`; no screen imports the i18n resolver (`catalogParity` PARITY-02 pins the exact 25-file resolver roster outside this slice's touches), so every new string is written by its view. The views keep their legacy `render(vm)` and DOM (`data-choice-idx`, `data-shop-id`, `button[data-item-id]`, `#shop-balance`, the `#heal-list` rows) and gain `paint(p)`: the kept paint is re-applied after each batch render and reset on the hidden→visible edge (the shop also on a render while hidden, because `openPendingShop` renders before `show()`).
  - **Dialogue.** The state is keyed `${npcEntityId}:${nodeId}`; `init` is unkeyed, so the open's `observe` paints; the same key re-seats the cursor with `navReconcile`. The reveal is a fixed 600 ms CSS wipe (`.is-revealing`, `DIALOGUE_REVEAL_MS`; the reduced-motion guard follows the base rule). A finishes a running reveal, then acts on the cursor (a choice → `advanceDialogue`, the shop action → `pickShop`, a leaf → `dismissDialogue`) and arms a 1 s resend guard (`DIALOGUE_RESEND_MS`; under reduced motion a node that follows an A-issued command keeps it from its arrival). **B always ends the talk at once** (`main.controls.test.ts` pins B dismissing 100 ms after the batch); only A is reveal-gated. In an ongoing battle only B, Start and Select are answered; everything else is `unhandled`. A re-pushed frame's first A only paints the fresh cursor. The bottom box: the root gains `.mr-dock` (not `.mr-shell--dock`: `battleView.test.ts` CTL7B-1-FRAME-CSS-ROSTER pins every `/mr-(shell|frame)/` selector and is outside `touches:`; residual R-ctl-8a-CTL8A.1 → ctl-8i) and the three content nodes move into one inner `.mr-frame--bottom`; the root's inline display becomes `flex`.
  - **Shop.** Row keys are `shopBuyKey` (the stock row id) and `shopSellKey` (the item id), shared through `shopModel.ts` with `itemDescription`. Phases `browse → qty → confirm`; a quantity clamps to 1..99 (buy) or 1..owned (sell), repeats included; a Yes/No cursor never moves on a repeat; a count-0 stack is disabled. The open prompt carries the painted name and unit price: `settle` refreshes them from the live rows and the press that first sees a change only paints, so Yes never sends at a price the player has not seen. `#shop-title` and `#shop-balance` sit in one `.mr-frame-titlebar`; `#shop-tabs`, `#shop-description` and `#shop-prompt` (`#shop-prompt-text`, `#shop-confirm`) are created by the view; both lists stay in the DOM and the inactive one is `hidden`. No / B at the confirm, and B at the quantity row, return to the list.
  - **Heal.** `{ location }` from the bound id (null: unbound or unknown), Yes disabled with `heal.prompt.unavailable`; A on Yes sends `healParty { locationId }` from the LIVE view model and moves the cursor to No; `observe` repaints only when the cost line changes. The question, reason and Yes/No sit outside `#heal-list`.
  - **Catalog:** 11 ids (`shop.tab.buy/.sell`, `shop.description.none`, `shop.qty.buy/.sell`, `shop.confirm.buy/.sell`, `prompt.yes/.no`, `heal.prompt.question/.unavailable`). `catalog.test.ts` (roster 213 → 224 plus the pins) is edited as the sibling test of the catalogs — touches-delta, as every ctl-8 screen slice will need.
  - **Named intentional test changes:** `screens/index.test.ts` `CTL6B-1-ADAPTERS-TOTAL`, `CTL7C-1-NAV-CAPABLE`, `CTL7D-6-OBSERVE-SKIPS` (the 14 legacy ids); `shopView.test.ts` the balance-order tooth (`compareDocumentPosition`) and SV-02's roster (+ the two tab ids). `dialogueView.i18n.test.ts`, `healView.i18n.test.ts`, `dialogueModel.ts`, `healModel.ts` and the three e2e specs needed no change; `dialogue.spec.ts`, `shop-npc.spec.ts` and `wallet-balance.spec.ts` pass unmodified against a local server (16/16).
  - **Found, not built:** a row that vanishes re-seats the cursor on the first row, not the neighbour (residual R-ctl-8a-CTL8A.2, backlog); Enter on a focused legacy button (Tab, or a click) still buys 1 / advances with no quantity row or confirm, as today, until ctl-15 absorbs the click delegate; the French heal question carries the heal model's English cost copy ("pour Free ?"), as `heal.location` already did.

- **CTL8A.1:** WHEN a conversation is shown, THE SYSTEM SHALL render a bottom-box frame whose choices form a wrapping nav list, where A finishes the text reveal, then advances, then chooses, and B finishes the reveal and, on a choice or leaf node, ends the talk through `dismissDialogue`.
  - Under reduced motion the text appears at once.

- **CTL8A.2:** WHEN Shop opens, THE SYSTEM SHALL show tabs Buy | Sell, opening on Buy, with the balance in the title and a Y description slot that reads "—" when an item has no description.
  - A on an item opens a quantity row; D-pad left/right changes the quantity by ±1.
  - Then a Yes/No confirm: Buy defaults to Yes, Sell to No.
  - Feedback is catalogued (for example "✓ Bought 2 Bait (−40g)"); the line is dispatch's, built in ctl-7d (CTL7D.4).

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
- Build note (ctl-8b, 2026-10-02):
  - **Seam.** The Monsters frame is the `boxView` frame id: `SCREEN_ADAPTERS.boxView = monstersScreen` (nav). KeyB and the menu leaf both open it through `boxView.show()`, so it always opens on Storage (residual R-ctl-8b-CTL8B.4 → ctl-11a). No new `Command` arm: Move is `setPartySlot` (the view model's `party_slot_none()` sentinel to Storage, `-1` to the next free party slot, dispatch reporting a full party), the commit is `setNickname` through the view's existing callback. The party size and the sentinel come from the `party_size()` / `party_slot_none()` wasm exports imported by `monstersScreen.ts` (the real pkg loads under vitest).
  - **Screen.** Tabs Party (a list) | Storage (a 3-column grid) over the nav kit, per-tab cursor memory; A → sheet (Summary, Nickname, Move); B backs out one level, B at the list pops. The state keeps each tab's key list, so `observe` re-seats by key and answers the same object on an equal batch. The "Moved to party / storage" line (`.mr-frame-feedback[data-feedback="ok"]`, catalogued) shows only once a batch shows the monster in the other tab; a pending Move expires with the next button, so a refused Move never claims success.
  - **Nickname (CTL6B.5).** An in-frame `<input type="text">`; Enter reaches the adapter as A, which hands the view a one-shot commit token, and the view sends the field's text (not when it equals the live name or what that open prefilled — a stale prefill never reverts a rename). The field's keydown shield keeps typed letters out of main.ts's hotkey ladder (B would close the box). While the row shows, Heal Party is disabled so typing mode's Escape lands on the sheet's nav list (Enter there is A), never on Heal; the tabs, sheet, summary, row and Move line sit before the hint and panels for the same reason.
  - **View.** Panels and parts hide by inline `display:none` (the panels set `display:grid`, which beats `[hidden]`); both panels stay in the DOM for the e2e textContent scans. The cursor card carries `is-active` + `aria-current` + an inline outline, not `.mr-nav-item` (its active rule repaints the cards' inline colours). The Party panel is one column (it is a list). The per-card Rename button and `window.prompt` are deleted (R-ctl-8b-CTL8B.3 → ctl-15).
  - **Catalog:** +7 ids (`box.tab.party/.storage`, `box.sheet.summary/.nickname/.move`, `box.feedback.movedToParty/.movedToBox`), −1 (`box.card.rename`); `box.rename.prompt` labels the row. `catalog.test.ts` 224 → 230 (touches-delta).
  - **Found, not built:** X quick Move (router.ts swallows X; R-ctl-8b-CTL8B.2 → ctl-11a); the Move line is not announced (R-ctl-8b-CTL8B.2-ANNOUNCE → ctl-13); R-ctl-6c-MONSTERSRO (Monsters read-only over a battle) needs `menuModel.ts` / `mainMenuScreen.ts`, outside these touches.

- **CTL8B.1:** WHEN Monsters opens, THE SYSTEM SHALL show tabs Party (a list of up to 6) and Storage (a grid), switched by LB/RB, with per-tab cursor memory.

- **CTL8B.2:** WHEN A is pressed on a monster, THE SYSTEM SHALL open its action sheet with Summary, Nickname and Move, and WHEN B is pressed in the sheet, THE SYSTEM SHALL return with the cursor on that monster.
  - X on a monster is a quick Move. Feedback is catalogued ("✓ Moved to party").
  - Care, Feed… and Evolve… join the sheet in ctl-8c.

- **CTL8B.3:** WHEN Nickname is chosen, THE SYSTEM SHALL open an in-frame typing row under the typing-mode rule (CTL6B.5), with no `window.prompt()`.
  - Red: today the nickname edit calls `window.prompt`.

- **CTL8B.4:** WHEN the legacy KeyB is pressed (until ctl-11a), THE SYSTEM SHALL open Monsters on the Storage panel that holds the box root.

### ctl-8c — Monsters II: Care, Feed, Evolve and the evolution notice
category: ux-a11y (screen conversion) · severity: MED · size: MODERATE
touches: client/src/ui/screens/monstersScreen.ts, client/src/ui/monstersModel.ts, client/src/ui/monstersModel.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/raisingModel.ts, client/src/ui/raisingModel.test.ts, client/src/ui/evolutionView.ts, client/src/ui/evolutionView.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/messageIds.ts, client/e2e/evolution.spec.ts
after: [ctl-8b]
- Evidence: raising and evolution are hide-switch overlays operated only by Tab and the mouse; the evolution reveal banner has only an OK button.
- Notes, raising-root ownership: this slice moves raising's per-monster actions onto the Monsters sheet and leaves the raising root holding only its inventory list. ctl-8f then turns that root into Bag. The evolution root hosts the Evolve… list.
- Build note (park, 2026-10-03): the Monsters sheet is painted only by `boxView.ts` (`SHEET_LABELS`, `FEEDBACK_TEXT`, `SHEET_LAYOUT`), so Care/Feed…/Evolve… and their feedback need `boxView.ts` + `boxView.test.ts`; no `main.ts` and no new Command arm (`care`, `train`, `evolve` exist in `screens/types.ts`). CTL8C.3 is already true on master (the KeyI/KeyE toggles in `main.ts`) and rides here as a non-regression row.
- Tasks: `evolution.spec.ts` V2 (≈193, KeyI then the raising Care button) moves to KeyB → monster → sheet → Care via `pressButton` (named intentional change).

- **CTL8C.1:** WHEN the monster sheet opens, THE SYSTEM SHALL add Care, Feed… and Evolve… to it.
  - Feed… opens a food list; picking food feeds with no confirm.
  - Evolve… lists the evolution paths, is disabled with a reason when there are none, and its confirm defaults to No.
  - Feedback is catalogued ("✓ Fed {name}").

- **CTL8C.2:** moved to ctl-13 as CTL13.5 (park finding 2026-10-03: it needs `main.ts` probe/handle wiring, which this slice may not touch).

- **CTL8C.3:** WHEN the legacy KeyI or KeyE is pressed (until ctl-11a), THE SYSTEM SHALL open the panel holding the raising root or the evolution root respectively.
  - `evolution.spec.ts`'s KeyE case (≈170) keeps passing; `evo-ready-note` and `evo-choice` testids survive in the Evolve list.

### ctl-8s — the Social seam: cross-open screen memory, one `openSocial(tab)` path, one Social frame
category: ux-a11y (structural seam) · severity: MED · size: MODERATE
touches: client/src/ui/screens/types.ts, client/src/ui/screens/index.ts, client/src/ui/screens/index.test.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/leaderboardView.ts, client/src/ui/leaderboardView.test.ts
after: [ctl-8c]
- Evidence (ctl-8d park, 2026-10-03, PR mdrewt/monster-realm#556, no code written):
  - `main.ts` calls `screenHost.opened(frame)` on every push edge and `ScreenHost.opened` deletes the frame's state. `init(vm)` sees only a view model built from `ScreenContext`, so no adapter can remember a tab between opens. Only the main menu's `menuState.memory` survives, hosted by hand in `main.ts`. ctl-8b hit the same gap (R-ctl-8b-CTL8B.4).
  - U, P and L and the menu leaves `menu.social.trades/challenges/rankings` open three separate frames through `openTrade`, `openPvp` and `openLeaderboard`. Each has its own probe and handle entries and batch listener, and pvpView's listener auto-shows its frame on an incoming challenge. No `Command` arm switches the shown frame, and `ScreenContext` binds no requested tab.
  - Workarounds inside ctl-8d's old touches fail: re-parenting the pvp root under the trade root breaks pvpView's `#visible` flag (its `forceVisible` is false whenever another overlay shows), and per-view chrome duplicates every panel and cannot switch tabs across frames.
- Intent: give ctl-8d what it needs so ctl-8d keeps its promise never to touch `main.ts`. No Social UI is built here; the Social frame renders the three legacy roots as panels, and `SCREEN_ADAPTERS` keeps the legacy adapter for it until ctl-8d.
- Notes:
  - Design is the run's call within the EARS below; its dry-run records the chosen shape in a build note.
  - ctl-8d consumes this seam unchanged. ctl-8g (Players, Rankings) and ctl-11a (hotkey retirement) build on it.
  - Anti-vacuity: each Red names the legacy behaviour it replaces.
- Build note (ctl-8s, 2026-10-03, PR mdrewt/monster-realm#557):
  - **The frame.** Social is the frame id `social` (`SOCIAL_FRAME` in `contextStack.ts`), the first frame id that is not an overlay id (`FrameId = OverlayId | 'social'`), so every `main.ts` site that used a frame id as an overlay id had to handle it to compile. `mirrorEdges` folds the visible `tradeView` / `pvpView` / `leaderboardView` overlays into that one frame: `__game().stack` shows `{ kind: 'screen', id: 'social' }` for U, P, L, the three menu leaves and the challenge auto-show, and a change of the shown panel raises no edge, so the adapter's state survives a tab switch. `SCREEN_POLICY.social` is player / drop / not battle-safe and `SCREEN_ADAPTERS.social` is the legacy adapter. The three panel ids keep their rows in both tables but are never frames (the main menu's battle rule still reads their policy rows). The roots are not re-parented: each stays its own `role=dialog` shell in `#frame-layer`, all three with the same box, one displayed at a time.
  - **Open path.** `openSocial(tab)` binds `ScreenContext.socialTab`, shows the tab's panel alone (`socialPanel`: challenges → the pvp root, rankings → the leaderboard root, trades / players / null → the trade root), mirrors the frame and seats its adapter. No caller passes `players` or `null` yet (the menu's Social entry is still a group). The panel is rendered and shown before the others hide, so the a11y layer closes the old root as a covered dialog and focus never bounces through the menu beneath; exactly one panel is left on screen even when a render throws.
  - **Legacy keys.** With Social closed, U / P / L open under the panel's own `canOpen` verdict and `worldHasFocus()`, as before. With Social open, the key of the panel now shown and the key that opened the frame (`socialTab`) close it, and any other Social key does nothing, so `pvp.spec.ts` and `trade.spec.ts` pass unmodified.
  - **Memory (CTL8S.1).** `ScreenAdapter.remember?: true` and `init(vm, remembered?)`. `ScreenHost.opened` moves an opt-in adapter's kept state into a per-frame memory; `ScreenHost.forget()` clears that memory and the opt-in kept states, and runs on the first connect and on every reconnect. `ScreenHost.seat(frame, ctx)` runs `init` and paints once at the open. Only `openSocial` calls it: every other frame still starts at its first button or batch.
  - **Lent view.** The Social adapter's `paint` receives a `SocialFrameView` (`screens/types.ts`): `trades` / `challenges` / `rankings` (the three views), `chrome` (one empty element that follows the shown panel through each view's `hostChrome`) and `show(panel)`, which does nothing for the panel already shown or while another frame covers Social.
  - **pvp listener.** A shown Challenges panel is only refreshed: "another overlay is showing" no longer hides it (the menu it was opened from counted as one). An incoming challenge calls `openSocial('challenges')` with no overlay visible and a world base. A battle or a conversation still closes the frame through `reconcile`.
  - **ctl-8d seam map** (dry-run against this seam; nothing here touches `main.ts`):
    - `SCREEN_ADAPTERS.social = socialScreen` (`nav`, `remember`).
    - CTL8D.1: `viewModel(ctx)` reads `ctx.socialTab` and the trades and challenges in `ctx.store`. `init(vm, remembered)` picks the requested tab, else the oldest waiting request's, else `remembered`'s. The seat paints it at the open: `paint(view: SocialFrameView, vm, state)` calls `view.show(<the tab's panel>)`, paints the tab strip into `view.chrome` through a `TradeView` method, and the rows and sheet through `view.trades` / `view.challenges`. The Players placeholder lives in the trade root; Rankings is the legacy leaderboard root, which carries the chrome.
    - CTL8D.2: existing `Command` arms only.
    - CTL8D.3: U / P / L already bind `trades` / `challenges` / `rankings`; the adapter honours a non-null `socialTab` before the waiting-request rule.
    - ctl-8g paints Players and Rankings through `view.rankings` (`leaderboardView.ts`).
  - **Named intentional test changes:** `screens/index.test.ts` (`CTL6B-1-ADAPTERS-TOTAL` and every "each frame id" table read the overlay ids plus `social`); `contextStack.test.ts` (`CTL2-1-MIRROR`'s oracle folds the panels; `CTL2-1-POLICY`, `CTL3-2-POLICY-EXACT` and the battle-safe literal gain `social`); `main.dispatch.test.ts` (`CTL7C-2-BOOT-VIEWS` covers the `social` composite instead of three panel frames; the stub views honour `forceVisible` and record `hostChrome`); `main.controls.test.ts` and `main.menu.test.ts` (the stack pin ends in `social`). New: `main.social.test.ts` (the real three views and the real a11y layer).
  - **Found, not built:** the auto-show is level-triggered (it re-opens after a close while the challenge is pending), as before, until ctl-13's banner; hiding a panel resets its in-flight lock, as a P–P toggle always did; `PvpView.refresh(vm, false)` has no production caller left; `SCREEN_POLICY.social` and the menu's panel rows agree only while Rankings is in `HIDDEN_UNDER_BATTLE` (the comment on the row says so). Two things the unit tier cannot prove, both for ctl-8d to mind: `hostChrome`'s "already first: no re-insert" guard (happy-dom records no mutation and keeps focus on a self-prepend, so switch panels through `view.show`, never call `hostChrome` directly), and the `worldHasFocus()` gate on the U / P / L open (a mutant dropping it survives, on master too).

- **CTL8S.1:** THE SYSTEM SHALL let a screen adapter keep its state across closes of its frame within a session, through the host (not module state), so `init` can seat a reopened frame from the remembered state.
  - Adapters opt in; every existing adapter keeps today's reset-on-open. A reconnect or identity change clears the memory.
  - Red: a stand-in adapter that opts in sees its previous state on the second open and a reset one does not.
- **CTL8S.2:** THE SYSTEM SHALL bind a requested Social tab (`players | trades | challenges | rankings | null`) as a read-only `ScreenContext` value set by the open path, read live like `shopId`.
  - A plain open (the menu's Social entry) binds `null`.
  - Red: a stand-in adapter reads the tab each open path bound.
- **CTL8S.3:** THE SYSTEM SHALL route U, P, L and the three `menu.social.*` leaves through one `openSocial(tab)` path in `main.ts`, which opens ONE Social frame with the trade, pvp and leaderboard roots hosted as panels of it, one shown at a time.
  - The roots' DOM ids and testids, handles and probe entries are unchanged, so existing e2e selectors still resolve.
  - pvp's auto-show on an incoming challenge opens Social on Challenges (`openSocial('challenges')`) and still works with no overlay open and not over a battle.
  - A panel nested in the Social frame renders (pvpView's visibility is no longer decided by "another overlay is showing").
  - Red: today U, P and L open three frames, so `__game().stack` shows three different ids; after, it shows one Social id for all three.

### ctl-8d — Social I: tabs, and responding to trades and challenges
category: ux-a11y (screen conversion) · severity: MED · size: MODERATE
touches: client/src/ui/screens/socialScreen.ts, client/src/ui/screens/index.ts, client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/tradeModel.ts, client/src/ui/tradeModel.test.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/pvpModel.ts, client/src/ui/pvpModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/trade.spec.ts, client/e2e/pvp.spec.ts
after: [ctl-8s]
- Evidence: trade, pvp and leaderboard are three separate overlays.
- Intent (design §5): Social is the place to *respond* to requests. Initiation stays on pvpView's per-player Challenge buttons and O until ctl-10b replaces them. Players and Rankings show placeholders and the legacy leaderboard root until ctl-8g. `pvp-accept-btn` and `pvp-challenge-player-btn` stay directly clickable DOM until ctl-13 and ctl-10b respectively.
- New files: `socialScreen.ts`, `socialModel.ts` and its test.
- Build note (park, 2026-10-03): the first attempt parked with no code (draft PR monster-realm#556, branch `ctl-8d`, empty wip). "Remembered tab", the open-on-request rule and the one-Social-frame over three roots need `main.ts` and the host, so they moved to ctl-8s, which this slice is now `after`. Resume by rebasing `ctl-8d` on master once ctl-8s merges. CTL8D.2 needs only existing `Command` arms (`respondTrade`, `confirmTrade`, `cancelTrade`, `acceptChallenge`, `declineChallenge`, `cancelChallenge`).
- Build note (ctl-8d, 2026-10-03, PR mdrewt/monster-realm#556):
  - **Screen.** `SCREEN_ADAPTERS.social = socialScreen` (`nav`, `remember`) over the pure `socialModel.ts`. The rows are the blocks the legacy roots show, each picked through that root's own selector (`shownTradeOffer`, `incomingChallenge`, `outgoingChallenge`: new exports of `tradeModel.ts` / `pvpModel.ts`): 0..1 trade row; then the request and the viewer's own sent challenge. `init` takes the requested tab (`ctx.socialTab`), else the oldest waiting request's, else the remembered one, else Players; the cursor goes to the opened tab's waiting request, and the phase always starts at the list (a remembered sheet is not carried). A "waiting request" is an incoming one not yet answered; a trade awaiting the viewer's own final Confirm is not one.
  - **Sheet.** A on a row opens its legal actions with the cursor on the first (Accept for a request: design §5's "U, Enter, Enter"). Accept and Cancel send at once; Decline and a trade's Confirm ask Yes / No on No. A sheet whose row is gone, or whose legal actions changed, closes; it is never re-pointed. Start pops to the base from every phase; B backs out one level.
  - **Painting.** `TradeView.paintSocial(chrome, p)` is the frame's one painter. The tab strip (`#social-tabs`), the sheet (`#social-sheet`) and the prompt (`#social-prompt`) live INSIDE the shared chrome, because the roots' own children are pinned by tests outside `touches:`; they are painted on every paint, whichever panel shows. The trade root keeps the paint while it is visible: on Players `#trade-status` reads the placeholder and the sides and legacy actions are hidden; the trade row's cursor is a mark on `#trade-status`. `PvpView.paintCursor` marks `#pvp-challenge-incoming` / `#pvp-challenge-outgoing`. Every legacy button stays clickable.
  - **CTL8D.3 as built.** U / P / L, the three menu leaves and the challenge auto-show bind a tab, and the adapter honours it before the waiting rule and the memory. With Social open the three keys only close it (ctl-8s); they never switch tabs. LB/RB do (PageUp/PageDown until ctl-11a).
  - **Behaviour changes outside the criteria.** `incomingChallenge` is the oldest Pending request (the lowest `challengeId`; it was the first in store order; the server allows one Pending request per target, so the same row in practice). The trade action table is total: an offer in a status this client does not know offers no action, shows its raw status and is not a Social row (it used to throw, and that throw would now reach the frame's uncaught button path).
  - **Catalog:** +12 ids (`social.tab.{players,trades,challenges,rankings}`, `social.players.placeholder`, `social.action.{accept,decline,confirm,cancel}`, `social.confirm.{declineTrade,confirmTrade,declineChallenge}`). `catalog.test.ts` 237 → 249.
  - **touches-delta (sibling tests):** `screens/socialScreen.test.ts`, `screens/socialScreen.boot.test.ts` (main.ts booted over the real views and adapter table), `screens/index.test.ts`, `i18n/catalog.test.ts`.
  - **Named intentional test changes:** `screens/index.test.ts` `CTL6B-1-ADAPTERS-TOTAL` (Social holds `socialScreen`; 13 legacy ids), `CTL7C-1-NAV-CAPABLE` and `CTL7D-6-OBSERVE-SKIPS` (their rosters derive from `CONVERTED`). e2e: `trade.spec.ts` gains "U opens Social on Trades with four tabs; PageDown / PageUp switch the panel" and `pvp.spec.ts` a two-player case (B declines from the sheet, No the default); every existing case in both passes unmodified.
  - **Found, not built** (residuals, all → ctl-13):
    - R-ctl-8d-CTL8D.1-PLAINOPEN: no production open path binds a null tab, so the waiting-request tab choice and the remembered tab are proven at the adapter and host tier only. Only the cursor-on-request half is live, through the auto-show.
    - R-ctl-8d-CTL8D.2-ANNOUNCE: the sheet and its prompt are not announced (focus stays on the panel's static anchor, as the shop's).
    - R-ctl-8d-CTL8D.2-FEEDBACK: a trade command's result shows only while the trade panel is the shown one; a challenge command has no result line.
    - R-ctl-8d-CTL8D.2-CANCELPROMPT: Cancel sends with no prompt, so a mashed A can accept a trade and then cancel it.
  - **Known limits:** the announcer names the Players tab "Trade" until ctl-8g; Enter on a Tab-focused legacy Reject button rejects with no prompt; a frame closed mid-sheet keeps the sheet painted in its hidden root until the next open repaints it; the cursor arrow sits on its own line above a challenge block (`styles.css` is outside `touches:`).

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
  - **CTL8E.1 as built.** B5's Escape was already live (ctl-6b routes Escape in the capture phase), so the slice's red was the D-pad, A, B and LB/RB doing nothing in the overlay. The wizard keeps every row on screen (main.ts heals focus out of an inline `display:none` subtree, and main.controls pins Escape-in-a-field landing on the select); the step is a cursor, shown by an `<ol>` header with `aria-current="step"`, and focus follows it on a step change only. The DOM is the one draft: the screen holds the step, the Offer cursor (by monster id) and one-shot toggle/commit tokens the view applies once, so what is on screen is what is sent and the mouse path still works. Focus is on the select at Target (overlayA11y's pinned initial focus; the select owns the arrows, so only A and Escape reach the wizard there), on the monster list at Offer, in the field at Coins/Ask, and on the review row at Review. Review prints the parsed draft; a commit whose list rebuild dropped a ticked monster or the target sends nothing. Accepted: A on Target with no player picked and A on Yes with an incomplete draft are not blocked by the screen (Review shows "This offer is not complete."); after Escape stops typing, focus sits on the select (R-ctl-6b-CTL6B.5 → ctl-8h).

### ctl-8f — Bag pockets and Journal
category: ux-a11y (screen conversion) · severity: MED · size: MODERATE
touches: client/src/ui/screens/bagScreen.ts, client/src/ui/screens/journalScreen.ts, client/src/ui/screens/index.ts, client/src/ui/bagModel.ts, client/src/ui/bagModel.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/questLogView.ts, client/src/ui/questLogView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [ctl-8e]
- Intent (design §5 rows 2-3): the raising root (inventory only since ctl-8c) becomes the Bag frame. It keeps its `OverlayId`, so no new `*View.ts` file appears. questLog is a display-only list today.
- New files: `bagScreen.ts`, `journalScreen.ts`, `bagModel.ts` and its test.
- Build note (ctl-8f, 2026-10-03):
  - **Pockets are derived, not authored.** `StoreItemRow` has no category, so `bagModel.pocketOf` reads the effect fields (train stat → Food, cured status → Medicine, recruit bonus → Bait, else Other); the tabs are the pockets the definitions hold (plus Other for an owned item with no definition), ordered by the lowest item id in each — shipped content gives Bait | Food | Medicine | Other, so RB from the opening pocket lands on Food. Shipped content already uses all four, so CTL8F.1's "pocket no shipped item uses" test is read as: tabs exist only for pockets the data holds, and swapping two fixture items' effect fields swaps the tab order. Rows merge per item id (counts summed). No DECISIONS.md entry (presentation only).
  - **Bag.** The raising root keeps its id; `raisingView.paint(BagPaint)` adds `#bag-tabs`/`#bag-list` (nav kit), `#bag-sheet` (Feed when food — disabled "No monsters to feed" with none; Use on cure/bait items, always disabled with `menu.disabled.battleBag`; Info), `#bag-info`, `#bag-picker` and `#bag-status`. A on a monster sends `train` at once and closes the picker on the item; "Fed {name}" (`box.feedback.fed`) shows once a batch shows the count drop, and the next button expires a pending feed. The legacy monster cards stay (residual R-ctl-8f-CTL8F.2 → ctl-11b: `main.controls.test.ts` CTL6C-3 and `main.feedbackCore.test.ts` PGCCA-A4 click the raising Care button). Only `openSocial` seats a frame, so the Bag paints at the first batch (`init` leaves `shown` null) or button; until then the legacy inventory grid shows (residual R-ctl-8f-CTL8F.1 → ctl-11a).
  - **Journal.** `questLogView.paint(JournalPaint)` marks the existing `<li>` rows with the kit's contract (their text is e2e-pinned), names the listbox by the overlay label, and shows `#quest-log-detail` (name + `journal.detail.step`) after the list; `render(vm)` re-applies the kept paint and the hidden→visible edge resets it.
  - **Catalog:** +10 ids (`bag.pocket.{bait,food,medicine,other}`, `bag.action.{feed,use,info}`, `bag.picker.title`, `bag.feed.noMonsters`, `journal.detail.step`); `catalog.test.ts` 259 → 269.
  - **Named intentional test changes:** `screens/index.test.ts` CTL6B-1-ADAPTERS-TOTAL / CTL7C-1-NAV-CAPABLE / CTL7D-6-OBSERVE-SKIPS rosters, and the covering legacy frame in CTL7D-6-OBSERVE-SKIPS, CTL8A-4-ADAPTERS-SWAPPED, CTL8B-4-ADAPTER-SWAPPED and CTL8E-2-ADAPTER moved from `questLogView` to `evolutionView`; `catalog.test.ts` roster.

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
- Build note (ctl-8g, 2026-10-03):
  - **Zone name DEFERRED (hidden dependency).** The client has no zone-name source: `zone_def` is public on the server but not subscribed in `net/connection.ts`, the store holds no zone map, and client-wasm exports only zone tiles (`zone_map`). Showing it needs `connection.ts` + `store.ts` + the exact-pinned client subscription-set eval, all outside `touches:`; copying the RON names into the TS catalog would break "Content is data compiled into game-core". CTL8G.1 is DEFERred to backlog in the ledger. Everything else in it ships.
  - **Players** sits over the leaderboard root, per the ctl-8s seam map. `socialScreen.paint` shows `leaderboardView` for Players and Rankings; `contextStack.socialPanel` is not edited. `socialModel.socialPlayers` lists online players other than the viewer, ordered by raw name then identity using code-unit comparisons. Sorting is not nearby-first, so rows stay put while walking. A player is Nearby when both characters are known, share a zone, and `|dx|+|dy| <= NEARBY_TILES` (12). A on a row enters a `walkUp` phase that shows "Walk up to {name} and press A" (`#leaderboard-walkup`, name in a `<bdi>`, never a resolver argument: the line is resolved around a NUL slot). B or any move ends it.
  - **Repaint signal.** The Players rows are data in a kept paint, so `SocialScreenState.people` (`socialPeopleKey`: JSON of key/name/nearby) makes `settle` return a new state when a player joins, leaves, is renamed or crosses the line. The state object stays the same otherwise.
  - **Rankings** keeps the board `<li>`s (e2e/i18n-pinned) and marks them by hand with the nav kit's contract (`social-rankings-<hex>`, listbox named by `social-tab-rankings`). An empty board stays a plain list. A does nothing.
  - **leaderboardView lifecycle.** `paintSocial` is kept while the root shows and re-applied by every `render` (main's batch listener). It is dropped on the show edge, by a render while hidden, and by `hide()`, so a closed root is byte-identical to the legacy board. A list hidden under the focus hands it to `#leaderboard-title` first (tradeView's rule).
  - **Catalog:** +3 ids (`social.players.{nearby,none,walkUp}`); `catalog.test.ts` 269 → 272.
  - **touches-delta (tests):** `screens/socialScreen.test.ts`, `screens/socialScreen.boot.test.ts`, `i18n/catalog.test.ts` (siblings), and `screens/index.test.ts`, whose `socialHostCtx` stub gains the three store reads and whose two Players pins now expect `leaderboardView`.
  - **Named intentional test changes:** `socialScreen.test.ts` `PANEL.players` and the "no call on the Rankings view" pin; `socialScreen.boot.test.ts` CTL8D-1-BOOT-TABS (Players over the leaderboard root); `index.test.ts` CTL8D-1-HOST-REMEMBERS's Players panel; catalog roster.
  - **Found, not built** (residuals):
    - R-ctl-8g-CTL8G.1: zone name, as above.
    - R-ctl-8g-CTL8G.1-ANNOUNCE (→ ctl-13): the announcer names the Players tab "Leaderboard" (`overlayRegistry.ts`). The walk-up line is not announced (cf. R-ctl-8d-CTL8D.2-ANNOUNCE).
    - R-ctl-8g-CTL8G.1-UCLOSE (→ ctl-11a): with Social on Players, U no longer closes it unless U opened it (main.ts compares `socialPanel(key)` with the shown panel). L does close it.
    - R-ctl-8g-CTL8G.1-DEADPATH: tradeView's Players placeholder branch, `social.players.placeholder` and `contextStack.socialPanel`'s "players → trade root" comment are now unreachable or stale (files outside `touches:`).
    - Every batch rebuilds the Players rows (`renderNav`'s `fill`): fine at tens of players, ~180 ms at 5000 in happy-dom.

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
  - **ctl-8h as built (PR #561).** The Profile list is the main menu's `profile` group (ctl-5). The three children are row screens (`ui/screens/profileScreen.ts`) whose rows are each view's real controls, with DOM focus as the cursor; a press is a one-shot token, and A with no focused row only seats the default. Confirms default to No: arming focuses No/Keep, disarming focuses Decline/Delete, and after a Confirm nothing is seated. Gaps: the relabel to "Account & sign-in" / "Privacy & data" was DEFERRED because `menuModel.test.ts` and `mainMenuScreen.test.ts` pin the English labels outside touches. R-ctl-6b-CTL6B.5 is still open because `main.controls.test.ts` pins focus-on-page for an empty rename draft; the D-pad re-seats focus instead. `monster-privacy.spec.ts` has no account-privacy flow, so Profile › Privacy is covered by the `CTL8H-4-BOOT-TWO-STEP` boot test.

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
  - **ctl-8i as built (PR #562).**
    - **Routing.** A bare battle base is nav-capable, and `ScreenHost` steps `ui/screens/battleScreen.ts` there. The adapter answers with one-shot op tokens. The outcome frame keeps the legacy adapter.
    - **The cursor.** The cursor lives in `BattleView`: a list plus an index, painted as one `aria-current` with an outline. It resets to Fight on a new (battle, turn) or on a PvP wait. An op made while focus is off a cursor row only seats the cursor. Run greys with a reason in PvP.
    - **Skill memory.** A skill is remembered per team slot, and only when its press is accepted.
    - **Cell text.** Cells read `Name (power) · Affinity · Acc N%`, which closes R-rb-56-FOLLOWUP-ACC.
    - **Bug fix.** Cure items are no longer offered in PvP: `use_battle_item` rejects them.
    - **Deviations, because out-of-touches e2e specs click these controls.** The skill grid stays visible during the command list; choosing Fight moves the cursor into it. The legacy Flee button stays beside Run. `pvp-status` keeps its text, and "Waiting for {name}…" is the list's caption. Recruit, Swap and Bag lead to their group's buttons only; the selects are CTL8J.1.
    - **Residuals.** R-ctl-6c-STALETEXT is partly addressed: the comments are fixed, but folding `battleButton` needs `contextStack.ts` and `main.ts`. R-ctl-8a-CTL8A.1 is not done: it needs `styles.css` and `dialogueView.ts`. Both are hidden dependencies.

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
  - **ctl-8j as built.**
    - **Lists.** The bait and cure `<select>`s are gone. Recruit opens a `role=group` list (`data-testid="bait-selector"`): No bait first, then one row per bait with `data-recruit-bonus`. Bag opens the cure list (`cure-item-selector`, rows with `data-cure-status`). Every row is a button whose click handler holds the model's id; nothing is parsed (B10).
    - **Second step.** A pressed bait row opens "Recruit with {bait}?" with Yes (the cursor, `recruit-action`) and No. A pressed cure row opens one target row, "Use on {species}" (`use-item-action`). `use_battle_item` has no target parameter and cures the active monster, so the target list has that one row. B or No goes back to the picked row by id.
    - **The pick.** `battleModel.resolveBattlePick` keeps a pick only on its own battle and turn while the model still offers its item, in an ongoing PvE battle. Any action taken (a skill, Flee, a swap, Yes or the target) spends an open pick under the PvE lock. Choosing a command or hide() clears it.
    - **Focus.** A row focused by Tab or the mouse is the cursor, so a same-turn render re-focuses its replacement.
    - **CTL8J.3 deferred → ctl-13.** Over a battle the menu's Monsters row is disabled (`SCREEN_POLICY.boxView` is not battleSafe), and R-ctl-6c-MONSTERSRO was closed by #554 without the change. Enabling it needs `contextStack.ts`, `screens/mainMenuScreen.ts` and a read-only `monstersScreen.ts` mode. `battle-dpad.spec.ts` CTL8J-3x-START-HELP-START runs the same round trip through Options › How to play instead.
    - **e2e.** `battle-dpad.spec.ts` seeds the starter's attack, defenses and HP: with defenses alone it fainted in the first battle, and an all-fainted party meets no encounter. `recruit.spec.ts` R1/R2 press No bait before `recruit-action` (Yes).
    - **Residuals.** R-ctl-8j-SELECTINERT → ctl-11a (main.ts), -PVPTIMER → ctl-13 (menuView.ts), -MENUCOPY → ctl-13 (the Close copy; the battleBag reason is now true), -MASHRECRUIT → backlog.

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
- **Build note (ctl-8k).**
  - **Frame.** `#session-overlay` is built in `#frame-layer` as `.mr-frame.mr-shell.mr-shell--top` (z 120). It is appended at boot after the static menu and help shells, so it wins their tie by DOM order, and it sits above the battle root (110). Inline style is `display` only.
  - **Contents.** Children in order: title (h2), body, feedback, confirm prompt, Retry, Continue as guest, Yes, No, hint. Arming replaces Retry and Continue with the prompt and Yes/No. Every label comes from the VM: `retryLabel` is `session.retry`, Yes and No are `prompt.yes` / `prompt.no`, and `hint` is `session.hint` ("B and Start do nothing here. Tab moves, Enter chooses."). The new ids sit in a `session.*` namespace because `resolver.test.ts` snapshots every plain `chrome.*` value.
  - **Focus.** The open edge focuses Retry, or No when the gate opens armed. On an open gate, arming focuses No and disarming focuses Continue (`reseatRow`). A plain re-render moves nothing, and closing blurs a focused gate control.
  - **Keys.** A held Enter or NumpadEnter is `preventDefault`ed on repeats, so it fires one click. B and Start stay inert through main.ts's `sessionGateBlocks()`.
  - **touches-delta.** `catalog.test.ts`: the roster grows from 283 to 285, plus pins.
  - **Residuals.**
    - R-ctl-8k-CTL8K.1 (→ ctl-13): the D-pad and arrows never reach the gate. Today Tab plus Enter/Space is the only way through.
    - R-ctl-8k-MODALA11Y (→ ctl-13): no focus trap, dialog role or focus return.
    - R-ctl-8k-LOCALESTALE (→ backlog): an open gate is not re-rendered when the locale changes.

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

- Build note (ctl-10a, PR #565): the picker / Y sheet is world-base state in `ScreenHost` (`screens/index.ts`: `WorldPort`, `sheet`, `closeSheet`; `takesNav` is true at a bare world while it is open), not a context-stack frame, because `FrameId` and `Command` sit outside touches. The 0/1/many rule counts actionable rows (`pickerEntries`), and the chip derives from the same rows. Origin = the predicted tile and facing (authoritative fallback), zone from the row. Help gained Enter and F rows. Left outside touches as residuals: `BoxViewCallbacks.onHealParty` (optional, unread), `healModel.healTargetLocationId`, `healParty.locationId` (optional), the `talk_range` export, stale KeyT prose (R-ctl-10a-BOXCB/HEALTARGET/TALKRANGE/DOCS/SHEETA11Y).

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
touches: client/src/input/router.ts, client/src/input/router.test.ts, client/src/input/bindings.ts, client/src/input/bindings.test.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/controls.ts, client/e2e/dialogue.spec.ts, client/e2e/wallet-balance.spec.ts, client/e2e/trade.spec.ts, client/e2e/evolution.spec.ts, client/e2e/pvp.spec.ts, client/src/main.accel.test.ts, client/src/main.a11yFocus.test.ts, client/src/main.controls.test.ts, client/src/main.dispatch.test.ts, client/src/main.input.test.ts, client/src/main.social.test.ts, client/src/ui/screens/bagScreen.boot.test.ts, client/src/ui/screens/journalScreen.boot.test.ts, client/src/ui/screens/profileScreen.boot.test.ts, client/src/ui/screens/socialScreen.boot.test.ts, client/src/ui/screens/index.test.ts, client/src/ui/menuView.ts, client/src/ui/menuView.test.ts, client/e2e/a11y.spec.ts, client/e2e/movement-input.spec.ts, client/e2e/rename.spec.ts, client/e2e/accounts.spec.ts, client/e2e/monster-privacy.spec.ts, client/e2e/pvp-side-b.spec.ts, client/e2e/encounter-battle.spec.ts
after: [ctl-10b, ctl-8k]
- Evidence: Q opens Journal and E opens Evolution today, colliding with the operator's bumpers (migration rule 2: Q/E → LB/RB, Q → J and E → V land in **one** slice).
- Build note (park, 2026-10-04; draft PR monster-realm#567, branch `ctl-11a` @ 35b6fe83): gates 3/3 met in-touches but `just ci` is red on 11 boot tests outside `touches:` that pin the retired ladder (stack shapes, KeyQ/KeyI/N/C/U/P/L), plus e2e that pin KeyE and close-returns-to-menu. Re-serialized with widened touches (supervisor): the four `screens/*.boot.test.ts`, `screens/index.test.ts` (delete `routedBindings`), the `main.*.test.ts` siblings, `menuView.ts`/`.test.ts` (`setCovered` visibility guard, replaces the main.ts workaround), and the audited e2e specs. Resume by migrating those tests as named intentional changes (verifier audits for weakened assertions), then the in-touches e2e tasks, lens batch, full `just ci`.
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
touches: client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/ui/hintBar.ts, client/src/ui/hintBar.test.ts, client/src/ui/noticeModel.ts, client/src/ui/noticeModel.test.ts, client/src/ui/errorOverlayModel.ts, client/src/ui/errorOverlayModel.test.ts, client/src/ui/errorOverlayView.ts, client/src/ui/errorOverlayView.test.ts, client/src/ui/screens/worldScreen.ts, client/src/ui/menuModel.ts, client/src/ui/menuModel.test.ts, client/src/main.ts, client/src/ui/evolutionNotice.ts, client/src/ui/evolutionNotice.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/screens/index.ts, client/src/ui/contextStack.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/respond-request.spec.ts, client/e2e/pvp.spec.ts, client/e2e/pvp-side-b.spec.ts, client/e2e/ranked-forfeit.spec.ts, client/e2e/monster-privacy.spec.ts
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

- **CTL13.5:** WHEN an evolution notice arrives, THE SYSTEM SHALL show it as a prompt that A dismisses (OK). (Moved from ctl-8c as CTL8C.2.)
  - The banner is deliberately not an `OverlayId` today (`evolutionNotice.ts` header; rendered by a `main.ts` batch listener). A prompt frame needs a `main.ts` probe and handle entry, an `OverlayId`, a `SCREEN_ADAPTERS` entry (total over `FrameId`) and a `SCREEN_POLICY` row; the a11y rosters follow if it joins the `*View` roster.

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
ctl-4 (any time before ctl-5) ────────────┴→ ctl-5 → ctl-6b → ctl-6c → ctl-7a → ctl-7b → ctl-7c → ctl-7d
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
- **Long `main.ts` serialization** (21 slices including pgcc). Throughput, not correctness, is the risk; the parallel lanes mitigate it.
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
