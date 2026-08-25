# m23-s6 — PLAN (M23 accessibility S6: menuView keyboard/AT semantics)

Branch `slice/m23-s6`, worktree `.claude/worktrees/m23-s6`, forked from `origin/master` @ `3e062c4`.
`touches:` = `client/src/ui/menuView.ts` (+ sibling `client/src/ui/menuView.test.ts`).

## The four deliverables
1. **ARIA listbox on `#menu-rows`** — `role="listbox"` + `aria-labelledby=<#menu-heading id>` set in the
   constructor (runtime, not markup: `client/index.html` is out of `touches:`).
2. **`role="option"` rows** — per `<li>` in `render()`: `id="menu-option-<row.index>"`, `role="option"`,
   `aria-selected`, `aria-disabled`, `tabindex="-1"`. Ids derive from `row.index`, never array position.
3. **`aria-activedescendant`** on `#menu-rows` = the selected row's id; `removeAttribute` when no row is
   selected or the list is empty (never `= ''` — a dangling IDREF).
4. **overlayA11y wiring** — `menuView` is the ONLY one of the 16 `OVERLAY_IDS` whose view never calls
   `openOverlayA11y`/`closeOverlayA11y` (S3 listed 10 views, S4 listed 5; menuView was held back because
   S6 owns the file). Without it the listbox never receives focus and `aria-activedescendant` is inert.
   `show()` copies helpView.ts:42-50 (edge-guarded on `wasVisible`); `hide()` copies :52-58 (unguarded).

## The design tension and its resolution
Spec §5.4's GOOD fixture requires a **delegated `keydown` on `#menu-rows` calling the same callback
identifier as the delegated `click`**. But once `show()` moves focus into `#menu-rows`, such a keydown
also bubbles to `main.ts`'s `window` listener (main.ts:1097, menu intercept at :1131) → `handleMenuInput`
would run TWICE per press.

**ADOPTED — split ownership.** menuView's keydown owns ONLY the inert selection-movement inputs
(`up` | `down` | `left`), with `preventDefault()` + `stopPropagation()` + `callbacks.onInput(input)`.
It returns early, leaving the event untouched, when: the overlay is hidden; `e.repeat` is true;
`menuKeyInput(e.code)` is `undefined`; or the input is `enter` / `escape`.

**Why it is safe (mechanical proof, not judgement).** `menuStep` (menuModel.ts:225-264) shows `up`,
`down` and `left` can only ever produce `effect: {kind:'none'}` → `handleMenuInput` (main.ts:650-661)
maps `'none'` to `renderMenu()` alone. They cannot close the menu, activate a leaf, or reach a reducer.
`enter` and `escape` — the only two that can — keep bubbling, so `sessionGateBlocks()`-first
(main.ts:1102, W-M21B2-SESSION-GATE-FIRST / ADR-0182 D17 G20), the `e.repeat` gate and the Escape
ladder all retain ownership of activation and dismissal. Secondary argument: menuView's EXISTING
delegated `click` already reaches `enterAt` with no session gate at all, so a movement-only keydown is
strictly less privileged than what the file already ships.

`stopPropagation`, NEVER `stopImmediatePropagation` — focusTrap installs capture-phase on
`#menu-overlay` (focusTrap.ts:8-15), so a bubble-phase stop at `#menu-rows` cannot shadow the Tab trap.

## Constraints that must survive
- `MV-NO-INNERHTML` (menuView.test.ts:508-547) scans the RAW source: the words `innerHTML`,
  `outerHTML`, `insertAdjacentHTML` and the write-to-document API must not appear anywhere, comments
  included. Also: no glob-slash-star inside a comment (recruit-eval concat hazard).
- A11Y-15: menuView must never contain a literal `.focus(` — the sole deferred focus lives in
  `overlayA11y.ts`.
- ADR-0135: `textContent` / `createElement` / `replaceChildren` / `setAttribute` / `removeAttribute` only.
- All existing `it(` blocks in menuView.test.ts pass UNMODIFIED (baseline captured mechanically).
- `MV-VIS-02`: show()/hide() write only `style.display` (overlayA11y writes attributes, not styles).
- `menuView.ts` stays OUT of `client/vite.config.ts` `coverage.exclude`.
- `index.html` untouched — `indexShell.test.ts` A5 pins `#menu-rows` `tabindex` as exactly `0`.

### ADR-0014 ruling: importing `menuKeyInput` into the shell is correct SSOT forwarding
The alternative is a second `ArrowUp -> up` switch inside a DOM file, which IS the breach.
`menuKeyInput` is pure (menuModel.ts:276); the shell already manufactures core inputs
(`#indexOfEventTarget`, menuView.ts:64-72). The `up|down|left` subset filter is an event-ROUTING
decision (which listener owns which key), not a nav decision — `menuStep` still decides meaning.

## Anti-patterns the tests must kill
1. double-step (no `stopPropagation`) — killed by a `window` spy, not an `onInput` call count.
2. over-broad stop (all five inputs / `stopImmediatePropagation` / stopping before the `undefined` check).
3. repeat leak (missing `e.repeat` guard) — held Arrow would scroll the menu.
4. dangling IDREF (`aria-activedescendant = ''`).
5. set-once-never-clear (attribute survives an empty render).
6. array-position ids (coincide with `row.index` on every real VM — needs an `index: 7,3` fixture).
7. unguarded `show()` (re-yanks deferred focus on every nav render).
8. guarded `hide()` (breaks overlayA11y's self-heal).
9. literal `role='dialog'` assertion — VACUOUS, `index.html:105` ships it statically; read
   `OVERLAY_A11Y.menuView.role` and pin `aria-label` ABSENT before `show()`.
10. per-`<li>` keydown listener (violates [A11Y-T3] + leaks per render).
11. a banned needle inside a new comment.
12. a second `getElementById('menu-heading')` instead of `this.#headingEl.id`.

## Task order
1. Capture the vitest JSON baseline on the untouched tree.
2. tester writes the new RED tests (X1-X11 + the `.focus(` source pin); prove RED for the right reason.
3. constructor -> render() -> show()/hide() -> keydown, red->green per step.
4. `just lint`, typecheck, full client suite, then the single full `just ci`.
5. Hand-write each of the 12 wrong impls and confirm each is killed (revert ONLY menuView.ts between rounds).

## Out-of-touches residuals to flag in the PR (do NOT fix here)
- `main.a11yFocus.test.ts:313-315,:568-570` prose goes stale ("menuView ... does not call openOverlayA11y
  at all today").
- `index.html:110-117`'s biome-ignore comment ("retires this suppression") becomes obsolete; it is inert
  anyway (biome 2.5.1 has no HTML linter).
- S10 blocker: spec §5.5's `overlayA11yWiring` vacuity-kill requires the `initialFocusSelector` target's
  tag to be BUTTON/INPUT/SELECT/A/TEXTAREA. `#menu-rows` is a `<ul tabindex="0">`, and ten of sixteen
  anchors are already `tabindex="-1"` nodes. S10 must relax to "natively focusable OR tabindex-focusable".
- S10 blocker: spec §5.4 `[A11Y-13]`'s identity extraction names `handleMenuInput` (main.ts's identifier);
  inside menuView both bodies reference `callbacks.onInput`. A bare-identifier scanner fails this file.
- `sessionGateBlocks()` can be true with the menu visible; menuView's keydown moves the selection then.
  Accepted (effect is provably `{kind:'none'}`; the click path is already ungated).
- Falsifiable-verdict (ii), spec :684 — if `aria-activedescendant` does not announce on NVDA/JAWS/VO the
  design is overturned. No mechanical oracle; belongs in S11's manual protocol, never reported CI-green.
- The S5 handoff's `visibleIds(probes)[0]` z-order residual (overlayRegistry.ts:372-374 /
  announcements.ts:39-40) is NOT S6's — both fixes are outside `touches:`. Recommend S10.
- No ADR number was assigned to this slice by the supervisor (the prompt's slot was empty), so no ADR
  file is authored. The split-ownership decision is recorded in-file and in the PR body.

---

## PLAN REVISION after the three plan-review lenses (red-team measured on a candidate build; reviewer read all 15 wired siblings)

**BLOCKER accepted — CUT the per-row `tabindex="-1"`.** Both lenses landed on it independently.
red-team MEASURED it: `tabindex="-1"` makes an `<li>` **mouse-focusable**, so a click on a row focuses
that `<li>`; the click emits `{kind:'click'}` -> `menuStep` `effect:'none'` -> `renderMenu()` ->
`replaceChildren` destroys the focused node -> **focus falls to `<body>`**. From then on
`aria-activedescendant` announces nothing (it only speaks while the listbox holds focus) and menuView's
own keydown never fires again — the entire slice's deliverable is dead after one mouse click or hover.
The ARIA APG activedescendant pattern puts `tabindex` on the **container only**, which
`client/index.html:117` already ships (`<ul id="menu-rows" tabindex="0">`). Rows get NO tabindex.
=> spec §5.4:488-491's "rows at `tabindex="-1"`" is WRONG; S10 must not encode it (added to the DEFER).

**Also adopted:**
- **Fixture fidelity (`mountMenuOverlay`).** Add `role="dialog"` + `aria-modal="true"` on the overlay and
  `tabindex="0"` on `#menu-rows`, mirroring `client/index.html:105-106,117` — the S3 precedent
  (`renameView.test.ts:112-124`, `leaderboardView.test.ts:124-132`). Without it the focus-trap ring has
  **0** focusables (measured) and every ARIA/close tooth is vacuous.
- **overlayA11y test isolation.** Copy `leaderboardView.test.ts:88-101`: `for (const id of OVERLAY_IDS)
  closeOverlayA11y(id, null)` in BOTH `beforeEach` and `afterEach`, plus a real-macrotask flush.
  Without it every `show()` leaks a capture listener on a detached node + a pending timer, and the next
  test inherits a stale `returnFocus`.
- **Sibling-listener tooth.** `stopImmediatePropagation` is behaviourally identical to `stopPropagation`
  here (red-team: 13/13 attacks identical). Kill it by registering a SECOND `keydown` on `#menu-rows`
  itself after construction and asserting it still fires.
- **Both-polarity bubble tooth** for `Enter` / `Escape` / **`KeyM`** / an unrecognised code / `repeat:true`:
  assert `defaultPrevented === false` AND a `window` spy DID fire. The over-broad-stop cheat passes
  21/21 of the existing tests (measured) — `KeyM` is the worst case: it is the only way to close the
  menu once focus is inside it.
- **Mechanise the split-ownership proof.** `menuStep(s, {up|down|left}, a).effect.kind === 'none'` over
  both levels x both availability polarities, imported into `menuView.test.ts` (gate X11). The prose
  proof is true today; `menuModel.ts:245-248` explicitly contemplates the edit that would break it.
- **`aria-disabled` only when `row.disabled`** — `aria-disabled="false"` is identical to absent.
- **`aria-activedescendant` is written AFTER `replaceChildren`**, and the tooth asserts the IDREF
  resolves to a live node inside `#menu-rows`.
- **Idiom:** `li.id = ...` (property, `claimView.ts:55`) but `setAttribute` for `role`/`aria-*`
  (`world.ts:81-83`, `overlayA11y.ts:106-108`, `boxView.ts:72-74`). `el.role = ...` appears nowhere in
  `client/src` — do not introduce it.
- **Update `menuView.ts`'s own header** (`:12-14` "textContent / createElement / replaceChildren ONLY")
  to admit `setAttribute`/`removeAttribute`, or the diff reads as a firewall breach.
- **Name-and-reject the fourth design option** the reviewer raised (`<li><button>` rows, which would
  satisfy [A11Y-12]'s native-button exemption with no keydown at all): rejected because a `<button>`
  inside `role="option"` violates presentational-children, it creates 16 tab stops, and spec §4 row S6
  mandates the activedescendant pattern.

**Corrections to the original plan's own text:**
- The `[A11Y-13]` "S10 blocker" is DOWNGRADED to a spec-prose nit. Both bodies reference
  `callbacks.onInput` — the same identifier — which IS the rule; `handleMenuInput` in §5.4:489 is loose
  fixture prose. Escalating it would make S10's gate worse.
- Anti-pattern 3's rationale was wrong: a missing `e.repeat` guard does NOT cause scrolling
  (`main.ts:1103-1106` suppresses it first); it causes **selection key-repeat**, which
  `main.ts:1129-1130` explicitly forbids. Assert `onInput` not called, not `defaultPrevented`.
- The `show()` edge guard is defensive uniformity here, not a fix for an observed bug: `menuView.show()`
  has ONE reachable call site (`main.ts:588`), and `renderMenu()` never calls it. Keep it; do not overclaim.
- `aria-labelledby` names an EMPTY `#menu-heading` until the first `render()`. Production is fine
  (`openMenu()` renders before `show()`, `main.ts:585-588`); worth one comment.
- Citation fix: the focusTrap capture-phase install is `focusTrap.ts:150`, not `:8-15` (that is the header).

**Attack surfaces measured CLEAN (do not re-litigate):** no key sequence double-fires or drops; the
`e.repeat` path keeps nh1's scroll suppression; `activateMenuLeaf`'s hide-then-open does NOT steal the
incoming overlay's deferred focus (measured end-to-end); `menu-option-<n>` collides with nothing
(60 index.html ids + every runtime-created id); no `client/e2e/**` spec drives the menu and none uses
`[role=dialog]` as a selector; no eval references `menuView`/`overlayA11y`; the full client suite is
95 files / 2715 tests green with the whole candidate wiring in place.

**One extra OUT-OF-TOUCHES finding to flag (pre-existing on master, NOT caused by S6):** open the menu
by clicking `#help-hint`, then close it with Escape — focus stays on the badge, `worldHasFocus()` is
false, and all twelve overlay-open hotkeys are dead until the player clicks the canvas. Fails identically
on the untouched tree. Recommend S10/S11.

**ADR:** the supervisor assigned NO ADR number to this slice (the prompt's slot was empty), so no ADR
file is authored and ADR-0206 (S5's) is not edited. The split-ownership decision is recorded in
`menuView.ts`'s header and the PR body; the missing allocation is escalated in the handoff.
