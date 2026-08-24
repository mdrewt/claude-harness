# m23-s4 build plan — constructed-shell a11y wiring + canvas region

Authored by the `planner` agent 2026-08-24; reviewed by reviewer + red-team + /simplify before tests.
Branch `slice/m23-s4` from `origin/master@20c8933`.
Spec: `specs/monster-realm-v2/M23-accessibility.spec.md` §2.2/§2.3, §4 row S4, §5.5, §6 (A11Y-13/14/16/17), §9.3, §9.8.

**touches:** `client/src/ui/{battleView,boxView,raisingView,evolutionView,claimView}.ts`,
`client/src/render/world.ts`, sibling `*.test.ts`, `ARCHITECTURE.md`.
**touches-delta (disclosed):** `client/src/ui/a11yCopy.ts` — one added catalog line (§D9).

---

## §0 F1 — the inherited assumption that is FALSE

`client/src/ui/overlayA11y.ts` cross-slice contract (a) claims the four `#app`-mounted views
"share ONE root" and that S4 "must CLOSE-BEFORE-OPEN". **Falsified by reading the code**: each view
creates its OWN `<div>` (`battleView.ts:53`, `boxView.ts:32`, `raisingView.ts:49`,
`evolutionView.ts:40`) and appends it into the shared `#app` MOUNT (`:137`, `:86`, `:89`, `:63`).
Four distinct roots, four distinct `OverlayId`s → four distinct `OPEN_OVERLAYS` records and four
distinct capture listeners. **S4 must NOT implement close-before-open** — it would close an overlay
the player still has open. The stale S1 comment is OUT OF `touches:`; flag it upward in the PR body
and the `ARCHITECTURE.md` entry, do not edit `overlayA11y.ts`.

## §1 Decisions

- **D1 — the S3 edge pattern, verbatim.** Read the visibility source ONCE as the FIRST statement;
  `openOverlayA11y` is the LAST statement of the open path; `closeOverlayA11y(id, null)` in `hide()`
  is **DELIBERATELY UNGUARDED**.
  ```
  show(): const wasVisible = <source>;  … existing writes …  if (!wasVisible) openOverlayA11y(id, root)
  hide(): … existing writes …          closeOverlayA11y(id, null)
  ```
- **D2 — unguarded close is load-bearing.** A guarded `hide()` reads correct and ships green on every
  other assertion while permanently leaking a live capture listener, a pending timer and an expiring
  return target. S3's red-team measured this: guarding six of ten views went 62/62 green. All five S4
  files carry the tooth.
- **D3 — `evolutionView` write order.** It writes `display` before `#visible` (`:71-72`); hoist the
  `wasVisible` read above BOTH writes so the "read first" invariant is uniform and reviewer-legible.
- **D4 — `battleView.refresh()` needs nothing extra.** `refresh(null)` calls `hide()` unconditionally
  (`:163`) — desirable, since close-with-no-record is a documented no-op and the unconditional call is
  the self-healing path. `refresh(vm)`'s `if (!this.#visible) this.show()` (`:166`) delegates to the
  now-guarded `show()`. **Do not add a second edge check inside `refresh()`** — a second nullity source
  can drift from `#visible` (the `#lastVmWasNull` failure `questLogView.ts:9-14` documents).
- **D5 — claimView has THREE doors and ONE nullity source.** Source = the existing derived getter
  (`claimView.ts:71-73`). Never add a field.
  `show()` and `render(vm)` both guard on `wasVisible`; `hide()` is unguarded; `render`'s close arm IS
  guarded (`else if (!vm.visible && wasVisible)`). Open is the LAST statement of `render()`, after the
  `textContent` writes (`:61-68`), so the deferred `querySelector` resolves against a painted root.
  Real call sequence `main.ts:446 → :457 → :458` (`renderClaim` → `show()` → `renderClaim`) means the
  true open edge fires inside `render()` at `:446`; unguarded `show()` would be a second open in the
  same tick and unguarded `render()` would re-open on every claim event, yanking focus back to
  `#claim-signin-btn` mid-interaction.
- **D6 — the four missing focus anchors.** `OVERLAY_A11Y` is frozen S0: the DOM moves to the selector,
  never the reverse. After each `title.textContent = …` (`battleView.ts:60`, `boxView.ts:41`,
  `raisingView.ts:56`, `evolutionView.ts:47`) add
  `title.setAttribute('data-testid', '<battle|box|raising|evolution>-title')` and
  `title.setAttribute('tabindex', '-1')`.
  **`-1`, not `0`:** a non-native anchor with no tabindex makes `root.querySelector(sel)?.focus()` a
  silent no-op; `0` would add a permanent extra tab stop ahead of the overlay's real controls on four
  overlays and would still pass `[A11Y-T5]` (which bans only `>0`). `[A11Y-T3]` bans `-1` only on
  listener-bearing elements — these `<h2>`s carry none. Policy pinned by `client/src/indexShell.test.ts`
  (S2).
  **`setAttribute`, never `title.dataset.testid`** — the latter sets `testid`, not `data-testid`, and
  the deferred focus silently no-ops (`battleView.test.ts:13-19` records the bug already found once).
  **claimView gets NOTHING**: `#claim-signin-btn` is a real `<button>` (`claimView.ts:52`); a natively
  focusable control must carry no `tabindex` at all.
  **Inherited caveat, not re-litigated:** happy-dom focuses a bare `<div>`, so a green A11Y-14 unit test
  is NOT browser proof. Compensating controls: assert the `tabindex` attribute VALUE literally, and the
  nightly axe/Playwright run (spec §5.7).
- **D7 — open AFTER the paint.** `openOverlayA11y` must be invoked when the root's `display` is neither
  `'none'` nor `''`; in a real browser `.focus()` on a `display:none` node is a silent no-op. This is
  the residual S3 explicitly handed to S4 (an open-first implementation measures 62/62 green).
- **D8 — `world.ts`.** Immediately after `mount.appendChild(app.canvas)` (`:71`), three writes on
  `app.canvas`: `role="application"`, `tabindex="0"`, `aria-label = t('a11y.world.region')`, with `t`
  imported from `../ui/a11yCopy`. Inside `init()`, never at module scope (a module-scope `t()` would
  throw at IMPORT time on an unwired key).
- **D9 — the `a11y.world.region` catalog delta (touches-delta).** `client/src/ui/a11yCopy.ts` holds
  exactly the sixteen `a11y.overlay.*` keys and no `a11y.world.*` key; S1 did not land it despite the
  S0 header predicting it would. The addition is PRE-SANCTIONED, not merely tolerated:
  `a11yCopy.test.ts:37-44` filters its namespace gate to `a11y.overlay.` on BOTH sides precisely so a
  later slice can add `a11y.world.region` without weakening an S0 gate, and assigns `a11y.world.*`
  orphan-checking to "the slice that owns its consumer" (D5) — i.e. this one. No existing gate reds.
  Rejected alternatives: a raw literal (violates §2.8 / the M24 seam ADR-0033); referencing the key
  without adding it (`t()` throws by design → `WorldRenderer.init` throws → the game does not boot);
  reusing an overlay key (announces "Battle" for the world region); omitting the label and deferring
  A11Y-17 (fails the slice's own criterion).
- **D10 — no ADR.** `docs/adr/0205-*` is the authority; every S4 decision applies D1/D2/D5/D7 plus the
  merged S3 precedent. S3 authored none on the same reasoning. ADR next-free stays 0206. Record the
  reasoning in module headers + an `ARCHITECTURE.md` entry APPENDED after the m23-s7 block, never
  inserted (inserted header lines drift inbound `ADR-nnnn:<line>` citations).

## §2 Test plan

**Extend** (exist): `battleView.test.ts`, `boxView.test.ts`, `raisingView.test.ts`,
`evolutionView.test.ts`. **Create**: `client/src/ui/claimView.test.ts`, `client/src/render/world.test.ts`.

Shared scaffolding per view spec (from S3's `helpView.test.ts`): `// @vitest-environment happy-dom` ·
`vi.mock('./overlayA11y', { spy: true })` (**the mechanism oracle** — records calls AND calls through) ·
`flushMacrotask()` = one REAL `setTimeout(…,0)` (never `vi.useFakeTimers()`) · file-level
`beforeEach`/`afterEach` sweeping the production `closeOverlayA11y(id, null)` over `OVERLAY_IDS` plus a
real macrotask, `vi.clearAllMocks()` LAST. **Mandatory when extending the four live spec files**: their
pre-existing `show()`/`refresh()` calls start scheduling timers and installing traps the moment the
wiring lands.

| Tooth (`S4-<view>-*`) | Criterion | Wrong impl killed |
|---|---|---|
| `OPEN-ARIA` | A11Y-13 | never opens; copy-pasted wrong `OverlayId` |
| `HELPER-CALLED` (`toHaveBeenCalledTimes(1)`, `…With(id, root)`, close with literal `null`) | A11Y-13/16 | hand-copied literal ARIA (no trap, no record, no timer) |
| `ANCHOR` (selector resolves, `tagName==='H2'`, `tabindex==='-1'`, `textContent` byte-unchanged) | A11Y-14 | `dataset.testid`; `tabindex="0"`; wrapping/mutating the `<h2>` |
| `DEFER-FOCUS` (BOTH polarities: not focused synchronously; focused after ONE real macrotask, by identity) | A11Y-14 | synchronous focus; focusing a decorative wrapper |
| `CLOSE-RESTORE` (all three attributes ABSENT, focus back on the pre-open element) | A11Y-16 | close that never strips ARIA / never restores focus |
| `REPEAT-NO-REOPEN` | A11Y-13/14 | unguarded `show()`; `wasVisible` read AFTER the write |
| `CLOSE-UNGUARDED` (`hide()` on a never-shown view still calls close; show/hide/hide ⇒ 2) | D2 | guarded `hide()` — the measured 62/62-green leak |
| `OPEN-LAST` (capture `root.style.display` at the instant open is invoked; ≠ `'none'`/`''`) | D7 | open-before-paint |
| `battleView-REFRESH-EDGES` | A11Y-13/16 | an edge check bolted into `refresh()` |
| `claimView-THREE-DOORS` (replay `main.ts:446→457→458` ⇒ open === 1; then `hide()` + `render(false)` ⇒ close === 1) | A11Y-13/16 | unguarded `render()` open; unguarded `show()` double-open |
| `S4-NO-VIEW-LOCAL-FOCUS` (comment+string-stripped `.focus(` scan over the FIVE S4 files, plus "no `role=`/`aria-modal` string literal") | A11Y-15 | a re-introduced view-local defer; the copied-attribute cheat. **Required**: S3's scan enumerates only its ten files |

**`world.test.ts` — a pure SOURCE SCAN, never importing `world.ts`** (that would drag PixiJS into
vitest). Modelled on `client/src/render/motionPreference.test.ts`:
1. fail-loud `readFileSync` off `import.meta.url` (a silently-empty read passes every "must not
   contain" clause vacuously);
2. comment stripping with composed delimiters (a decoy in a comment must not satisfy the scan);
3. anti-vacuity: the stripped source still contains `export class WorldRenderer`;
4. **ANCHOR, fail-loud** (§9.3 verbatim): locate `mount.appendChild(app.canvas)` in the STRIPPED source;
   if absent, FAIL naming the refactor — never pass;
5. the three writes appear AFTER the anchor index, on the `app.canvas` receiver, with the
   `t('a11y.world.region')` form (the §2.8 zero-raw-literals tooth);
6. no positive `tabindex` anywhere in the stripped file (A11Y-26);
7. CONTROL probe first (comment-only fixture must FAIL, real-call fixture must PASS), then the real file;
8. the `#app carries no role` half of A11Y-17, read from `client/index.html` with a fail-loud anchor;
9. `t('a11y.world.region').trim() !== ''` (executes the real catalog) and every `a11y.world.*` key in
   `a11yCopy` is referenced by the stripped `world.ts` — the D5 orphan obligation.

## §3 Tasks (T1 → {T2 ‖ T3} → {T4 ‖ T5})

| # | Scope | Gate |
|---|---|---|
| T1 | `data-testid` + `tabindex="-1"` on the four `<h2>` titles | `ANCHOR` ×4 |
| T2 | `show()`/`hide()` wiring in battle/box/raising/evolution + specs | the eight common teeth + `REFRESH-EDGES` |
| T3 | claimView three-door wiring + new `claimView.test.ts` | `THREE-DOORS` + the common teeth |
| T4 | `world.ts` attributes + the `a11yCopy.ts` delta + new `world.test.ts` | the nine scan clauses |
| T5 | five-file `.focus(`/literal-ARIA scan + the `ARCHITECTURE.md` entry | `S4-NO-VIEW-LOCAL-FOCUS` |

## §4 Risks

- **R1 — coverage applies ZERO pressure.** All six touched sources are coverage-excluded
  (`client/vite.config.ts:99` ff.). Nothing but the tests will ever execute S4's new branches. The
  single biggest false-green risk in the slice.
- **R2** — extending four LIVE spec files; the sweep hooks (§2) are mandatory.
- **R3** — A11Y-15's existing scan covers only S3's ten files; T5 closes the gap in-slice.
- **R4** — the `touches-delta` (§D9), disclosed in the PR body.
- **R5** — `world.ts` calls `t()` directly, so a missing key throws inside `init()` and the client never
  boots; `world.test.ts` clause 9 is the guard.
- **R6** — happy-dom focusability is not browser proof (declared residual, §D6).
- **R7 — e2e coupling:** `client/e2e/recruit.spec.ts` finds the box root via an `h2` with
  `textContent === 'Party & Box'` then `.parentElement.parentElement`. Attribute-only edits are safe;
  ANY change to the heading's text or nesting is not.
- **R8 — non-risk, confirmed:** `evals/monster-privacy.eval.mjs`'s `battleViewBody` is about the Rust
  `my_battle` reducer, not `client/src/ui/battleView.ts`. `main.wiring.test.ts` scans `main.ts`, untouched.

**Impact graph (union of cbm + CodeGraph + grep for optional-chained dynamic sites):** no production
caller of any of the six outside `client/src/main.ts`.

## §5 Anti-patterns (name them in the PR checklist)

1. Reading `visible`/`#visible` AFTER the display or flag write.
2. Guarding `hide()`'s close.
3. Hand-writing the three `setAttribute`s in the view instead of delegating.
4. `title.dataset.testid = …`.
5. `tabindex="0"` on the four headings, or any tabindex on `#claim-signin-btn`.
6. Wrapping the `<h2>` or appending inside it (breaks `recruit.spec.ts`).
7. Close-before-open on the four `#app`-mounted views (§0 F1).
8. Editing `overlayA11y.ts` — out of `touches:`, including "fixing" its stale header.
9. Editing `overlayRegistry.ts`'s selectors to match the DOM (S0 frozen).
10. `vi.useFakeTimers()` for the defer.
11. Importing `world.ts` inside `world.test.ts`.
12. A whole-file grep for `role="application"` (a comment decoy passes; an anchor move passes vacuously).
13. Widening `a11yCopy.test.ts`'s namespace filter (an S0 gate, out of `touches:`).
14. A `#lastVmWasNull`-style second nullity source in claimView.

## §6 Boy Scout — none warranted

Considered and rejected: normalising `evolutionView`'s display-then-flag write order, and converting
`boxView`/`raisingView`'s `this.#visible ? … : …` expression statement to `if/else`. Both are pure
cosmetics with no gate demanding or protecting them. YAGNI. Exception: the write-order tidy is
acceptable ONLY if hoisting the `wasVisible` read naturally lands both writes in the same hunk.

## §7 Workflow

Solo build, then a **scoped red-team on the gating tests** (not on the design — S3 merged this exact
pattern across ten views two commits ago; the design space is closed, and S3's own record shows the
failures were in the SUITE, not the design: 14 wrong implementations → 3 green-but-wrong holes).
Red-team's ranked targets: (1) guarded `hide()` in each of the five files independently; (2) hand-copied
literal ARIA; (3) open-before-paint (a brand-new tooth with no precedent to inherit); (4)
`dataset.testid`; (5) claimView `render()` open unguarded; (6) a `world.ts` comment decoy and an
anchor-moved-away variant.

---

# §8 Plan-review adjudication (reviewer + red-team + /simplify, 2026-08-24)

All three lenses ran in parallel on the plan above, before any test or code was written. Their
findings are adjudicated here; **where §8 contradicts §§0–7, §8 wins.**

## A1 — [ACCEPT, reviewer MAJOR-1] claimView can re-open after a manual dismiss. Documented, not fixed.

`claimModel.ts`'s `ClaimPhase` never transitions back to `'hidden'` (verified: no `claimStep` arm
produces it), and `main.ts`'s `KeyC` close calls `claimView.hide()` **directly**, never through
`applyClaim` — so the model still believes the overlay is open. A later reconnect-driven
`onClaimPending`/`onClaimAwaitingAccount`/`onClaimResult` calls `applyClaim` → `render(vm)` with
`vm.visible === true` while the DOM reads hidden. **Today that silently re-shows the overlay
(a pre-existing display bug). After S4 it also announces and steals focus.**

The a11y layer is behaving correctly for the DOM state it observes — the defect is upstream, in a
model that cannot represent "dismissed". Fixing it requires `claimModel.ts` (a new `ClaimEvent`) or
`client/src/main.ts` (route the `KeyC` close through `applyClaim`); **both are outside `touches:`,
and `main.ts` is reserved for S5 by spec §4.** So S4:
- ships a test that PINS the composed behaviour (`hide()` → `render(visible:true)` re-opens exactly
  once) so it is examined rather than silent, with a comment naming the upstream owner;
- records it as a residual in the PR body and flags it to S5/backlog.

## A2 — [ACCEPT, red-team #1 CRITICAL] the `world.ts` scan must be brace-scoped, not "after the anchor"

"The three writes appear after the anchor index" passes a wrong implementation that leaves `init()`
untouched and puts the three `setAttribute` calls in a **private method nothing calls** (red-team
PoC: anchor found, all three writes present, on `app.canvas`, in `t(...)` form → PASS, while the real
canvas gets zero ARIA — i.e. the milestone's headline defect ships green). Since `world.ts` is never
executed by the test, textual placement is the only signal there is.
**Required:** locate `async init(` and its brace-matched closing `}` by depth counting; the anchor
AND all three writes must fall inside THAT span, and within a small line window after the anchor.

## A3 — [ACCEPT, red-team #2 HIGH] `OPEN-LAST`'s mechanism is pinned here, not left to the tester

A post-hoc read of `mock.calls[0][1].style.display` is **provably vacuous** (red-team PoC: it passes
the open-before-paint impl and the correct impl identically — JS is synchronous, so by assertion time
both statements have run in either order). The capture MUST happen synchronously at invocation.
Two admissible mechanisms, in preference order:
1. **Intercept the first attribute write.** `openOverlayA11y` sets `role` first; spy on
   `root.setAttribute`, record `root.style.display` when `name === 'role'`, then delegate to the real
   bound method. No vitest-mock internals, no second module instance.
2. `vi.mocked(openOverlayA11y).mockImplementationOnce` capturing `root.style.display` and delegating
   to `getMockImplementation()` — **never** `vi.importActual`, which returns a SECOND module instance
   with its own `OPEN_OVERLAYS` map and silently breaks every close/restore assertion in the file.

**The tester MUST bite-prove this tooth**: write the open-before-paint implementation, confirm RED,
revert. A green-on-both OPEN-LAST is worse than no tooth.

## A4 — [ACCEPT, red-team #3 HIGH] one cross-view test, in `boxView.test.ts`

§0 F1's "four distinct roots, therefore NO close-before-open" is the single most load-bearing
correctness claim in the slice and **nothing in §2 tests it** — every spec is single-view-scoped.
Add to `boxView.test.ts` (a sibling of a declared file, so in scope): open `boxView`, then construct
and open `battleView`, and assert `boxView`'s root STILL carries `role`/`aria-modal`/`aria-label` and
that closing `battleView` leaves them intact. This pins anti-pattern #7 with a test instead of prose.

## A5 — [ACCEPT, red-team #4] `OPEN-LAST` applies to claimView's `render()` door, not just `show()`

D5 states the real production open edge fires inside `render()`. A `render()` that opens before its
display/`textContent` writes satisfies a count-only `THREE-DOORS` and a `show()`-scoped `OPEN-LAST`.
Apply the A3 capture to the `render()` open specifically.

## A6 — [ACCEPT, red-team #6] one `TOGGLE` assertion per view that has one

`boxView`, `raisingView`, `evolutionView` and `claimView` expose `toggle()`; it has **no production
caller today**, so a miswired `toggle()` (duplicating the helper call instead of delegating) ships
green and is a trap for whoever wires it next. Two `expect`s per view: hidden→`toggle()` opens
exactly once; `toggle()` again closes exactly once.

## A7 — [ACCEPT, /simplify] cut the composed teeth; keep one executable oracle per criterion

`vi.mock('./overlayA11y', { spy: true })` calls through, and S1's merged `overlayA11y.test.ts` already
proves — for all sixteen ids — ARIA-from-registry, strip-on-close, return-focus restore and both defer
polarities. So a per-view tooth of the form "the helper's EFFECT happened" is
`HELPER-CALLED ∘ (an already-merged S1 tooth)` — derived coverage, not independent coverage.

- **CUT** `DEFER-FOCUS` and `CLOSE-RESTORE` as separate teeth. **FOLD** their one non-composed
  assertion each into the tests that remain: one `expect(document.activeElement).toBe(anchor)` after a
  real macrotask inside the open test (the end-to-end A11Y-14 oracle on the REAL constructed class),
  and, inside the close test, focus an outside `<button>` before `show()` and assert focus returns to
  it plus all three attributes are absent (the A11Y-16 oracle).
- **FOLD** `battleView-REFRESH-EDGES` into `REPEAT-NO-REOPEN`, instantiated through `refresh(vm)`
  instead of `show()`, plus two explicit expects for the `refresh(null)` → `hide()` arm.
- Each S4 spec carries ONE comment line naming the composition, so the absence reads as a decision
  rather than an omission.

Surviving teeth per view: `OPEN-ARIA` (the call-through tripwire — the one non-mock-shaped assertion,
which reds if `{spy:true}` ever degrades to a stub), `HELPER-CALLED`, `ANCHOR`, `REPEAT-NO-REOPEN`,
`CLOSE-UNGUARDED` (+ folded restore), `OPEN-LAST`, `TOGGLE`; plus `claimView-THREE-DOORS`, the
battleView refresh arm, and the A4 cross-view test.

## A8 — [ACCEPT with amendment, /simplify + red-team #5] REPLACE T5's new scanner with a 6-line reuse

T5 as planned re-implements ~250 lines of comment/string stripper for the five S4 files — a second
copy of an apparatus whose own test title reads *"PROVISIONAL — delete when S10 ships
evals/overlay-a11y-manifest.eval.mjs"*. That is both over-build and a re-opening of a hole this repo
has already been bitten by twice (a regex literal containing a quote defeated an earlier stripper).
**Instead: add the five S4 files to `S3_VIEW_FILES` in `client/src/ui/renameView.test.ts` and bump its
anti-vacuity pin from 10 to 15.** Strictly less scope, strictly more coverage — it inherits the
hardened stripper, the comments-only-vs-string-stripped divergence tooth and the CONTROL fixtures for
free. Disclose as `touches-delta` #2 (see A10).
The plan's extra "no `role=`/`aria-modal` literal" clause is **dropped**: as red-team notes, an
attribute-style `role=` match would not catch `setAttribute('role', …)` anyway, and the hand-copied-ARIA
cheat is already killed by `HELPER-CALLED`'s mechanism oracle.

## A9 — [ACCEPT, /simplify] `world.test.ts` shrinks from 9 clauses to 5, reusing a proven stripper

Clauses 1–8 were a pre-implementation of S10's `evals/a11y-static-shell.eval.mjs`, which owns
`[A11Y-08]` by name. But S4 must still ship something, for a reason that is **not** S10's: `t()` is
deliberately untyped, `world.ts` is coverage-excluded, so a missing `a11y.world.region` throws inside
`init()` and **the client does not boot with `just ci` green** (R5). Ship for that.
Final clause set — **comment-stripping only** (the three writes ARE string literals; a string-aware
stripper would eat the thing being checked), reusing `client/src/render/motionPreference.test.ts`'s
merged `stripComments` + its inline CONTROL:
1. fail-loud `readFileSync` off `import.meta.url`;
2. anti-vacuity: `export class WorldRenderer` survives stripping;
3. **fail-loud anchor** on `mount.appendChild(app.canvas)` (§9.3 verbatim), **brace-scoped to
   `init()`'s body per A2**, with the three writes inside that span on the `app.canvas` receiver;
4. every `t('…')` key extracted from the stripped source resolves in the REAL imported `a11yCopy`,
   with an extraction count `>= 1`. One assertion, four jobs: R5, the D5 orphan obligation, §2.8's
   no-raw-literal tooth (a raw literal yields zero `t()` matches → reds the count), and key validity;
5. `world.ts` contains no `mount.setAttribute('role'` — the in-scope half of A11Y-17's "`#app` carries
   no `role`" (plus a read-only assertion on `client/index.html`'s `id="app"` tag, which reads but does
   not touch a file outside `touches:`; the static-shell half is S10's by name).
**CUT** the old clauses 6 (no positive tabindex — `world.ts` gains exactly one `tabindex="0"` already
pinned literally by clause 3; A11Y-26's home is S10's `keyboard-operable-rows.eval.mjs`), 7 (the
two-fixture CONTROL probe — CONTROLs are owed by a NEW stripper; **this cut is CONDITIONAL: if the
implementer copy-pastes the stripper instead of importing/reusing the proven one, clause 7 comes
back**) and 9a (`t(...).trim() !== ''` — already asserted for every catalog value, namespace-agnostic,
by `a11yCopy.test.ts`).

## A10 — `touches-delta` is TWO files, both additive, both disclosed

1. `client/src/ui/a11yCopy.ts` — one added line, `'a11y.world.region'` (§D9; pre-sanctioned by
   `a11yCopy.test.ts`'s own text, cannot red any existing gate).
2. `client/src/ui/renameView.test.ts` — the A8 six-line reuse (5 filenames + one pin 10→15).

Neither has a concurrent owner: S3 and S7 are merged, there is exactly one worktree and zero open PRs.
Both are listed under `touches-delta:` in the PR body for mechanical audit.

## A11 — [FLAG UPWARD, do not fix here] three cross-slice items for the PR body

1. `overlayA11y.ts`'s cross-slice contract (a) is factually wrong (§0 F1). Out of `touches:`; the
   correction belongs to whoever next opens that file (S10's `overlayA11yWiring.test.ts` is the
   natural home). Raise it as a follow-up, do not write `ARCHITECTURE.md` prose about another
   module's stale header.
2. Spec §5.5's vacuity-killer for S10's `overlayA11yWiring.test.ts` requires the resolved
   `initialFocusSelector` element's tag to be in `{BUTTON, INPUT, SELECT, A, TEXTAREA}` — but S0 already
   froze all four constructed-shell selectors onto `<h2 tabindex="-1">` anchors. **S10 will fail on
   four ids unless that tag list is widened.** Not S4's to fix (and S4 cannot: `overlayRegistry.ts` is
   S0-frozen), but it must not be rediscovered cold at S10.
3. The claimView re-open residual (A1).

## A12 — precision note for the PR body

`indexShell.test.ts` pins the `tabindex="-1"` convention for the STATIC `client/index.html` shells; it
does not directly cover these four dynamically-created headings. D6 cites it as *policy*, which is
accurate — say so precisely so no reader assumes direct test coverage.
