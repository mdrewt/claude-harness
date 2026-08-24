# m23-s3 — Plan of record (planner output, pre-review)

**Slice:** M23 accessibility S3 — static-shell view wiring, two mechanisms.
**Worktree:** `projects/monster-realm/.claude/worktrees/m23-s3` (branch `slice/m23-s3` off `master` @ `0953db7`).
**`touches:`** the 10 view files + their sibling `*.test.ts` (4 of which do not exist yet). Nothing else.

---

## 0. Findings that change the design (verified in the worktree, not assumed)

**F1 — the static `role="dialog" aria-modal="true"` literals make the obvious A11Y-13 assertion VACUOUS.** All ten S3 shells already carry both attributes as literals in `client/index.html` (`:17, :22, :25, :29, :36, :44, :52, :57, :64, :90-91`, m23-s2). An `expect(root.getAttribute('role')).toBe('dialog')` after `show()` therefore **passes on a view that never calls `openOverlayA11y` at all**. `aria-label` is absent from every shell. **`aria-label` is the only unforgeable open-oracle in this slice**, and its value comes from `t(OVERLAY_A11Y[id].labelKey)`.

**F2 — all 16 catalog values are distinct** (`client/src/ui/a11yCopy.ts:49-69`). So an `aria-label` identity assertion **also kills the copy-pasted-wrong-`OverlayId` impl**.

**F3 — `DialogueView.hide()` has ZERO production callers, and that is pinned.** `client/src/main.ts:362` sets `overlayHandles.dialogueView = undefined` (sole `NEVER_FORCE_HIDE` member, ptc5c/ADR-0139), and `client/src/main.wiring.test.ts:4352` asserts both spellings occur ZERO times in main.ts. `render(null)` is the only close.

**F4 — `questLogView` and `healView` open via `render(non-null)` but close via `hide()`.** `openQuestLog()` (`main.ts:477-479`) calls only `render(vm)`; closes are `hide()` at `:1142`, `:1376`, `:363`. `healView` opens at `main.ts:545-547`, closes at `:1382`/`:364`. **This asymmetry falsifies a `#lastVmWasNull` field** (D3).

**F5 — `render(null)` is unreachable in production for `questLogView`/`healView`, and fires on EVERY batch for `dialogueView`** (`main.ts:1574`, unconditional). An unguarded `closeOverlayA11y` in the null branch would run every batch forever — A11Y-34 forbids exactly that.

**F6 — the repeat-open hazard is confirmed and is not only `pvpView`.** `main.ts:1699-1701` keeps `forceVisible` true once open → `refresh` → `show()` (`pvpView.ts:93`) unguarded every tick. Same class: `dialogueView.render(non-null)` every tick while a conversation is live.

**F7 — `visible` is trustworthy on all ten**, because every shell ships inline `style="display:none"`. Two getter dialects (`!== 'none' && !== ''` vs `!== 'none'`) differ only on `display === ''`, which never occurs pre-first-`show()`. `main.ts`'s only three `style.display` writes are all `interactPromptEl`.

**F8 — no existing test asserts the deferred focus**, so the two deletions are non-breaking. Only stale header prose at `tradeProposeView.test.ts:14`, `:513`.

**F9 — `client/src/indexShell.test.ts` does NOT break.** It reads the real `client/index.html` from disk; runtime `removeAttribute` is invisible to it.

**F10 — one live source-scan gate reads a touched file.** `evals/wallet-privacy.eval.mjs:626-643, :1360` scans `client/src/ui/shopView.ts` raw source. Do not "tidy" the balance block.

**F11 — spec §9.7 contains a factual error** ("the only `innerHTML` write in the view layer" — false; `questLogView.ts:22`, `healView.ts:22`, `shopView.ts`, `tradeView.ts` all write it). Do the one named fix (`dialogueView.ts:30`) only; flag the error upward.

---

## 1. Design decision table

| # | Decision | **Recommendation** | Falsifier for the rejected options |
|---|---|---|---|
| **D1** | Where the open edge is detected | **Read `this.visible` BEFORE the display write; open only on `false→true`.** | Unconditional open is falsified by F6 + `overlayA11y.ts:88-89,100-113`: a re-open clears and re-schedules the deferred-focus timer → focus yanked back every batch tick, overlay untabbable. De-duping inside `overlayA11y` is out of `touches:` and would break S1's re-open-tears-down semantics that S4 depends on. |
| **D2** | Where the close edge is detected | **Deliberately ASYMMETRIC: `render(null)` guarded, `hide()` UNGUARDED.** | Unguarded `render(null)` violates A11Y-34 literally (F5). Guarded `hide()` is falsified by self-healing: if a record ever desynchronises from the DOM (S1's named A13 leak, `overlayA11y.ts:55-59`), a guarded `hide()` reads `visible === false`, skips the close, and the leak becomes permanent. `closeOverlayA11y` is a documented no-op with no record. **This asymmetry must be written into each module header as a decision, not left looking like an oversight.** |
| **D3** | Previous-vm nullity source for the three render-driven views | **Derive from the existing `visible` getter. Zero new state.** | A `#lastVmWasNull` field is falsified by F4: `hide()` never touches it, so the second open of the quest log ships no role, no label, no focus, no trap. Patching that makes the field a strictly-worse duplicate of `visible`. Residual: `visible` is a DOM-string read (F7 shows no rogue writer today). |
| **D4** | `pvpView`'s dual bookkeeping | **Read `this.#visible` before mutating; keep the field.** | Dropping it is falsified by blast radius: `overlayProbes.pvpView` (`main.ts:335`), the auto-show predicate (`main.ts:1700`) and `refresh`'s own `if (this.#visible) this.hide()` all read it — a `main.ts` contract this slice may not touch. |
| **D5** | `toggle()` | **Zero edits to all four `toggle()` bodies.** | `toggle()` already dispatches on `this.visible` and delegates to the now-guarded `show()`/`hide()`; anything more double-counts the edge. |
| **D6** | The `OverlayId` literal per view | **One module-scope `const OVERLAY_ID: OverlayId = '<id>'`, two uses.** | Inlining twice risks two literals drifting inside one file (type-checks perfectly, opens the wrong overlay) — the exact hazard `main.ts:348-356` documents for the handle table. Constructor injection is out of scope. |
| **D7** | Call ordering inside the body | **`openOverlayA11y` LAST in `show()`/the non-null `render()` branch; `closeOverlayA11y` LAST in `hide()`/the null branch.** | Open-first is not wrong for these ten (all anchors are static constructor-time children) but is wrong as the house rule S4 copies, where anchors sit beside `replaceChildren()` rebuilds. |
| **D8** | `closeOverlayA11y`'s `fallbackFocus` | **`null`, always.** | ADR-0205 A3 / `overlayA11y.ts:129-131`: S3 views hold no canvas handle. |
| **D9** | Static-shell literals surviving only until the first close | **Correct-by-design; S3 changes nothing.** | S1's rationale (`overlayA11y.ts:119-120`) is sound and F9 proves no gate breaks. Flag to S10: (i) the pre-first-open state is inconsistent with S1's own rule, (ii) F1 means role/aria-modal are useless as an open-oracle. |

---

## 2. Per-file task list (edit shapes, not code)

Every file gets the same four-part diff: **(i)** import `openOverlayA11y`/`closeOverlayA11y` from `./overlayA11y` + `type { OverlayId }` from `./overlayRegistry`; **(ii)** one module-scope `const OVERLAY_ID: OverlayId = '<basename>'`; **(iii)** the edge wiring; **(iv)** a module-header paragraph recording D1/D2.

- **T1 `shopView.ts`** — `show()` (`:77-79`): `const wasVisible = this.visible` before `display=''`, then `if (!wasVisible) openOverlayA11y(OVERLAY_ID, this.#overlay)` last. `hide()` (`:81-85`): unguarded `closeOverlayA11y(OVERLAY_ID, null)` appended. **Do not touch the balance block (F10).**
- **T2 `tradeView.ts`** — identical against `:63-65` / `:67-72`.
- **T3 `leaderboardView.ts`** — identical against `:28-30` / `:32-34`. **Not** coverage-excluded → both new branches must be executed by tests.
- **T4 `helpView.ts`** — identical against `:40-42` / `:44-46`. **Not** coverage-excluded.
- **T5 `renameView.ts`** — `show()` (`:99-103`): **delete `:101-102`** (rationale comment + `setTimeout(() => this.#input.focus(), 0)`), replace with the edge-guarded open. `hide()`: unguarded close appended. **Rewrite header bullet 2 (`:8-9`)** to point at `overlayA11y.ts` as sole defer owner.
- **T6 `tradeProposeView.ts`** — `show()` (`:121-125`): **delete `:123-124`**; same replacement. `hide()`: unguarded close appended. **Rewrite header bullet 2 (`:8-9`).**
- **T7 `pvpView.ts`** — `show()` (`:64-67`): capture `const wasVisible = this.#visible` **before** the two writes. `hide()`: unguarded close. **`refresh()` byte-unchanged.** Header must name `main.ts:1699-1701` as the repeat-`show()` caller — the crux, and the only place a future reader finds it.
- **T8 `dialogueView.ts`** — `render()`: `const wasVisible = this.visible` as the FIRST statement; null branch → `display='none'`, then `if (wasVisible) closeOverlayA11y(...)`, return; non-null branch → after the paint, `if (!wasVisible) openOverlayA11y(...)`. `hide()`: unguarded close. **Boy-scout: `:30` `innerHTML = ''` → `replaceChildren()`.** Header records F3.
- **T9 `questLogView.ts`** — same render-edge shape against `:16-28`; `hide()` unguarded close. Header records F4. Do **not** touch `:22`'s `innerHTML` (F11).
- **T10 `healView.ts`** — identical to T9 against `:16-30` / `:36-38`.
- **T11 — sibling specs.** EXTEND `shopView/tradeView/leaderboardView/helpView/renameView/tradeProposeView.test.ts`. CREATE `dialogueView/questLogView/healView/pvpView.test.ts` (all four coverage-excluded shells; the `dom-shell-coverage-exclusion` eval compares `vite.config.ts`'s exclude array to `DOM_SHELLS` only, so new specs do not touch it). Every new file starts `// @vitest-environment happy-dom`. Fix stale prose at `tradeProposeView.test.ts:14`, `:513`.

**Ordering:** RED specs for one representative of each mechanism (shopView, dialogueView, pvpView) first → impl → remaining seven by template → the two deletions → headers.

---

## 3. Anti-patterns to avoid, named

1. **Unguarded `show()` → `openOverlayA11y`** — the crux (F6): re-schedules the deferred focus every batch tick.
2. **`#lastVmWasNull` (or any second visibility field)** — D3's falsifier; silent second-open failure.
3. **Guarding `hide()`'s close** — D2's falsifier; makes S1's A13 leak permanent instead of self-healing.
4. **Reading `this.visible` AFTER mutating `display`** — the guard becomes a constant; produces a *green* behavioural suite.
5. **Inlining the id literal twice per file** (D6).
6. **Touching `refresh()`, `toggle()`, or `visible`** — `main.ts` contracts.
7. **"Fixing" `main.ts`, `overlayA11y.ts`, or `client/index.html`** to make a test pass → HIDDEN DEPENDENCY, escalate.
8. **Sweeping `innerHTML` beyond `dialogueView.ts:30`** (F11).
9. **`try/catch` around the open/close calls** — `t()` throws by design (ADR-0205 D4); `overlayA11y.ts:47-49` bans swallowing.
10. **Fake timers** — flush with `await new Promise((r) => setTimeout(r, 0))`.

---

## 4. Test obligations for `tester`

**All ten specs must construct the REAL exported view class** against a happy-dom fixture whose overlay root is byte-copied from `client/index.html`'s shell markup, **including `style="display:none"` and the `tabindex="-1"` anchor**. **Every expected value is read from `OVERLAY_A11Y[id]` / `t(...)` at assert time — never a hard-coded `'Shop'`.**

| Criterion | Obligation |
|---|---|
| **A11Y-13** | After the open edge: `role === OVERLAY_A11Y[ID].role`, `aria-modal === 'true'`, **and `aria-label === t(OVERLAY_A11Y[ID].labelKey)`** — the third is the tooth (F1), asserted in the SAME `it()`. |
| **A11Y-14** | After one macrotask flush, `document.activeElement === root.querySelector(initialFocusSelector)` — **identity**, never `contains`. Paired negative polarity: synchronously after open, `activeElement !== target`. |
| **A11Y-15** | Local source scan over the ten `*View.ts` asserting zero `.focus(` after comment- AND string-stripping. S10's eval does not exist yet; S3 must not ship on trust. |
| **A11Y-16** | Focus a sentinel, `show()`, flush, `hide()` → `activeElement === sentinel`. Plus the detached-target branch: no throw, no focus on a dead node. |
| **A11Y-34** | Spy-counted: 3× `render(vm)` = 1 open; 3× `render(null)` = 1 close; `render(vm)→render(null)→render(vm)` = open/close/open, 3 calls. |

### WRONG-IMPL-KILLED
1. **WIK-1 the unguarded-show impl** — focus a sentinel INSIDE the overlay after the first open+flush, `show()` again, flush, assert `activeElement` is STILL the sentinel. Invisible to any attribute assertion.
2. **WIK-2 the `#lastVmWasNull` impl** — `render(vm) → hide() → render(vm)`; assert `aria-label` present after the SECOND open.
3. **WIK-3 the read-after-mutate impl** — assert the FIRST `show()` from a `display:none` fixture produces the `aria-label`.
4. **WIK-4 the wrong-id impl** — `aria-label === t(OVERLAY_A11Y['<own id>'].labelKey)` (F2).
5. **WIK-5 the attribute-only impl** — A11Y-14 identity assertion PLUS a Tab-trap probe (dispatch Tab at the last focusable, assert wrap).

### Vacuity attacks (declared, each with its killer)
- **V1 static-literal free ride (F1)** → `aria-label` + a post-close assertion that all three attributes are ABSENT.
- **V2 open on every render** → call-count spy AND WIK-1's focus-steal assertion (a re-open is attribute-idempotent).
- **V3 never open at all** → any positive `aria-label` assertion, paired with V1's negative.
- **V4 fixture-without-`display:none`** → `expect(view.visible).toBe(false)` immediately after construction in every spec, before any open assertion.
- **V5 hardcoded expected strings** → derive every expectation from `OVERLAY_A11Y`/`t` inside the assertion.
- **V6 missing-spec false green** → every CHECK asserts `numTotalTests > 0` and required `fullName`s present exactly once.
- **V7 cross-test module-state bleed** (`OPEN_OVERLAYS` is module state) → `afterEach` calls the production `closeOverlayA11y(ID, null)` + one macrotask flush.

---

## 5. Risks / residuals

- **R1 (cross-slice → S5).** Ten overlays now move focus INTO themselves on open. For `dialogueView` this is store-driven (`main.ts:1574`) — after it, `activeElement` is `#dialogue-npc-name`, so S5's `worldHasFocus()` reports false and letter hotkeys are dead while a conversation is up. Believed benign (dialogueView is `GUARD_ONLY`; the Escape ladder is exempt) but **S5 must verify**; §4.1's cross-slice contract list should gain "S3 store-driven open ↔ `worldHasFocus()`".
- **R2 (→ S5).** Every force-hide of these ten already routes through `overlayHandles[id]?.()` → the view's `hide()` (`main.ts:357-368`), so the record is cleared. S5 must not introduce a direct `style.display='none'` path.
- **R3 (→ S4).** S3 sets the house template (D1/D2/D7). S4's four overlays share one `#app` root, where S1's A12 close-before-open contract also applies — the S3 template alone is not sufficient there.
- **R4 (→ S10).** (i) `overlayA11yWiring.test.ts` must NOT use `role`/`aria-modal` as its open-oracle (F1). (ii) `[A11Y-15]`'s scan must exempt `*.test.ts` and be comment/string-aware. (iii) the cross-view parameterised loop is S10's, not S3's.
- **R5 (nightly coverage).** `leaderboardView`, `helpView`, `renameView`, `tradeProposeView` are in the coverage denominator; `just coverage` gates lines at 96% and is NOT in `just ci` — so a miss fails nightly, not locally.
- **R6.** Installing a Tab trap on six previously-untrapped roots changes real-browser keyboard behaviour; `client/e2e/*.spec.ts` are out of scope and unaudited for Tab presses.
- **R7 (spec defect).** §9.7's "the only `innerHTML` write in the view layer" is false (F11).
- **R8 (declared, accepted).** With D2, if `dialogueView`'s DOM is hidden by something other than `render(null)`/`hide()`, the record leaks permanently — nothing can do that today (`overlayHandles.dialogueView` is `undefined`).

**No hidden dependencies found.** `main.ts`, `index.html`, `overlayRegistry.ts`, `overlayA11y.ts`, `evals/` and `vite.config.ts` all stay untouched.

---

## 6. Acceptance gates X1..X11

CHECK template: run the spec(s) under `npx vitest run --reporter=json`, then assert in one `node -e` that `success === true && numTotalTests > 0 && numFailedTests === 0 && numPendingTests === 0` AND every required `fullName` appears exactly once with `status === "passed"`. `-t` filtering is BANNED (it marks non-matching tests pending and substring-matches decoys).

| Gate | Behaviour | EXPECT |
|---|---|---|
| **X1** | Open edge sets `aria-label` from the table on all six `show()`/`hide()` views (A11Y-13) | `X1-OPEN-LABEL-FROM-TABLE-OK` |
| **X2** | Repeat `show()` does not re-open and does not steal focus back (WIK-1, V2) | `X2-REPEAT-SHOW-NO-REFOCUS-OK` |
| **X3** | Deferred focus, both polarities (A11Y-14) | `X3-DEFERRED-FOCUS-IDENTITY-OK` |
| **X4** | Close strips role+aria-modal+aria-label and restores focus; detached sentinel → no throw (A11Y-16, V1) | `X4-CLOSE-STRIP-AND-RESTORE-OK` |
| **X5** | `render(vm) → hide() → render(vm)` re-opens (WIK-2) | `X5-REOPEN-AFTER-HIDE-OK` |
| **X6** | Call-count edges (A11Y-34) | `X6-A11Y34-EDGE-COUNTS-OK` |
| **X7** | Zero `.focus(` in the ten `*View.ts` after comment+string stripping (A11Y-15) | `X7-NO-VIEW-LOCAL-FOCUS-OK` |
| **X8** | Wrong-id kill: each view's `aria-label` equals its OWN id's copy (WIK-4) | `X8-ID-IDENTITY-OK` |
| **X9** | First `show()` from a `display:none` fixture opens; `visible===false` at construction (WIK-3, V4) | `X9-FIRST-OPEN-FROM-HIDDEN-OK` |
| **X10** | Whole client suite green (`just client-test`) — no regression in the six pre-existing specs, `main.wiring.test.ts`, `indexShell.test.ts` | exit 0 (never the tail line — it reads "N passed" on failure) |
| **X11** | `just eval` + `just client-typecheck` green (`wallet-privacy` over `shopView.ts`, `dom-shell-coverage-exclusion`) | exit 0 |

---

## 7. Post-review adjudication (reviewer + red-team + /simplify, all three closed)

All of §0's F1–F11 were independently re-verified against the worktree by the `reviewer` lens and
hold exactly as written. Adjudications below are the plan of record where they conflict with §§1–6.

### Accepted — plan CHANGED

- **A1 (from /simplify) — D6 is CUT.** No per-file `const OVERLAY_ID`. Inline the string literal at
  both call sites: `openOverlayA11y('shopView', this.#overlay)` / `closeOverlayA11y('shopView', null)`.
  `OverlayId` is a closed union so a typo is already a compile error, and the drift case the const
  guarded against (open uses one id, close another) is *caught by tests*, not by the const: a close
  with the wrong id is a no-op, so X4's "all three attributes absent after close" reds. Ten fewer
  lines of ceremony, same teeth.
- **A2 (from red-team #1/#2) — the gate CHECK template is REPLACED.** Two measured false-greens:
  (i) `it.todo('<TOKEN>')` satisfies `success`, `numTotalTests>0`, `numFailedTests===0` **and**
  `numPendingTests===0` — vitest counts `.todo` in a separate `numTodoTests` the old template never
  read; (ii) `fullName` is the **describe-chain + title**, so an `=== '<TOKEN>'` match against
  `fullName` can never fire for an idiomatically-nested test. **The CHECK now matches on
  `assertionResults[].title` (the bare it() title) with `status === 'passed'` occurring exactly once,
  and adds `numTodoTests === 0` as a fifth counter.** The counters are necessary-but-insufficient;
  the per-`title` clause is the load-bearing one.
- **A3 (from red-team #4) — the oracles are relabelled.** `aria-label` is a **value** oracle: it kills
  the wrong-id impl (F2) and the never-opened impl, but a cheat that hand-copies the correct literal
  and never calls the helper **passes it** (measured). The **mechanism** oracle is the
  `vi.mock('./overlayA11y', { spy: true })` call assertion plus the deferred-focus identity check.
  Every per-file spec must carry both.
- **A4 (from /simplify) — header prose is proportionate, not ten essays.** The full rationale lives
  ONCE, here in §1 and in the PR body. Per file: `pvpView.ts` carries the crux paragraph (it owns the
  unique `main.ts:1699-1701` repeat-`show()` fact); `dialogueView.ts` carries F3/F5;
  `questLogView.ts`/`healView.ts` carry F4 (two lines); the six `show()`/`hide()` views get a
  two-line note naming D1/D2 and pointing at `pvpView.ts`. Ten independent copies of one decision is
  the duplicated-SSOT smell the standards flag.
- **A5 (from /simplify) — X7's ten-file `.focus(` sweep is explicitly PROVISIONAL.** It lives in
  `renameView.test.ts` (which owned one of the two deleted calls; `tradeProposeView.test.ts` owned
  the other and asserts only about itself), and its `it()` title says in words that
  `evals/overlay-a11y-manifest.eval.mjs` `[A11Y-15]` supersedes it at S10 and it should be deleted
  then — so S10's cleanup is a grep, not archaeology.
- **A6 (from /simplify) — `fallbackFocus: null` is pinned by assertion, not by grep.**
  `expect(closeSpy).toHaveBeenCalledWith('<id>', null)` in every close test (D8).
- **A7 (from red-team #B / reviewer #2) — fixture realism buys ZERO test power here, and the plan says
  so.** Measured: happy-dom's `.focus()` moves `document.activeElement` onto a `<div>` with
  `tabindex="-1"`, with `tabindex="0"`, and with **no `tabindex` at all** — it does not model
  focusability. This is the same residual `overlayA11y.test.ts:60-73` already records for S1. The six
  pre-existing mount helpers therefore do NOT need their anchors updated for correctness; add
  `tabindex="-1"` only where it costs one attribute, for fidelity with `client/index.html`, and do
  **not** treat a passing A11Y-14 as proof a real browser would honour the focus. Real focusability is
  covered by `indexShell.test.ts` (reads `index.html` from disk) and the nightly axe/E2E run S11 adds.
- **A8 (from /simplify) — V7 isolation is a PER-FILE obligation.** Each of the four NEW spec files
  must copy `overlayA11y.test.ts:97-105`'s `beforeEach`/`afterEach` shape (production
  `closeOverlayA11y(id, null)` sweep + one macrotask flush), not merely cite it.
- **A9 (from reviewer #1) — factual correction.** `toggle()` exists in **six** files
  (`shopView:87`, `tradeView:74`, `leaderboardView:36`, `helpView:48`, `renameView:118`,
  `tradeProposeView:145`), not four. D5's rule is unchanged: all six stay byte-identical.

### Accepted — documented as RESIDUAL, not fixed here

- **A10 (red-team #3) — a vacuous test carrying the exact required `title` defeats every mechanical
  clause of the CHECK.** Measured: `it('X1-…-OK', () => expect(true).toBe(true))` is green on all five
  counters. This is **unclosable by any CHECK script** — a runner can verify a name and a status, not
  that a body attempts the right assertion. It is closed by the tester/implementer split plus the
  `verifier`'s "gating tests not weakened" pass reading the bodies, and it is disclosed in the PR.
- **A11 (red-team #6, OUT OF SCOPE) — a latent half-open state in S1's `overlayA11y.ts`.**
  `openOverlayA11y` writes `role` and `aria-modal` *before* calling `t(meta.labelKey)`, which throws
  by design on an unwired key (ADR-0205 D4). On a throw the DOM keeps `role`/`aria-modal` but no
  record is stored, so the later `closeOverlayA11y` no-ops and can never strip them — contradicting
  that module's own "no half-open state" header claim. **Unreachable today** (A11Y-4 pins all 16
  catalog keys present) and `overlayA11y.ts` is outside this slice's `touches:`. Flagged upward for
  S4/S10; NOT fixed here.
- **A12 (reviewer #3) — new dangling real timers in the six extended specs.** Every pre-existing
  `view.show()` call in those files now schedules a real `setTimeout(0)` that no existing test awaits.
  Harmless today (no existing assertion reads `document.activeElement`; a deferred `.focus()` on a
  detached node is a silent no-op) but it is new inter-test timing noise — which is exactly what A8's
  `afterEach` sweep neutralises.
- **A13 (red-team #8, VERIFIED SAFE) — the two `.focus()` deletions are behaviourally sound.**
  `focusTrap.ts` registers on `root` with `capture: true`, so the capturing walk reaches it *before*
  the target-phase `stopPropagation()` in `renameView.ts:64` / `tradeProposeView.ts:99`; the trap
  early-returns on every non-`Tab` key, so it never contends with those views' `Escape`/`Enter`
  handling. Net user-visible change: identical input focus, **plus** a Tab trap and return-focus
  restoration.
- **A14 (R6) — six previously-untrapped roots now trap Tab in a real browser.** No e2e in this
  slice's `touches:`; disclosed in the PR as a nightly/manual residual.

### Rejected

- **/simplify's proposal to collapse the mechanism assertions into one new cross-view spec file**
  (`overlayA11yWiring.s3.test.ts`, parameterised over a `{id, ViewClass, mount}[]` table). Rejected on
  **scope**, not on merit: the always-in-scope companion rule admits *sibling* test files of a declared
  source file (`foo.ts` → `foo.test.ts`), and such a file is a sibling of nothing. It also shadows the
  filename spec §4 assigns to S10. The duplication is instead bounded by A1/A3/A4 and by keeping each
  per-file spec to 5–6 focused `it()`s that assert the **wiring** (which helper, which id, which edge),
  never re-testing `overlayA11y.ts`'s internals — those stay owned by `overlayA11y.test.ts`'s
  already-merged 16-way loop.
- **A Tab-trap dispatch probe per file (WIK-5).** Superseded by A3: a `{ spy: true }` call assertion
  proves the helper actually ran, which is strictly stronger and far cheaper than re-deriving it from
  wrap behaviour.

### Verified mechanics (measured in this worktree, not assumed)

| Claim | Result |
|---|---|
| `vi.mock('./overlayA11y', { spy: true })` records calls AND calls through to the real impl | **YES** — attributes were written and `mock.calls.length === 1` in the same test |
| happy-dom `.focus()` on `<div tabindex="-1">` moves `document.activeElement` | **YES** (and also with no `tabindex` at all — it does not model focusability) |
| vitest 4 JSON `assertionResults[]` carries a bare `title` alongside the chained `fullName` | **YES** — match on `title` |
| `numTodoTests` is reported separately from `numPendingTests` | **YES** — both must be asserted zero |

## 8. Final CHECK template (supersedes §6's)

```
cd <worktree>/client && npx vitest run <SPECS> --reporter=json 2>/dev/null \
| node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
const j=JSON.parse(s.slice(s.indexOf("{")));
const a=j.testResults.flatMap(r=>r.assertionResults);
const need=process.argv.slice(1);
const ok=j.success===true&&j.numTotalTests>0&&j.numFailedTests===0
  &&j.numPendingTests===0&&(j.numTodoTests??0)===0
  &&need.every(n=>a.filter(x=>x.title===n&&x.status==="passed").length===1);
process.stdout.write(ok?"S3-<GATE>-OK\n":"S3-<GATE>-RED\n")})' <required it() titles...>
```
