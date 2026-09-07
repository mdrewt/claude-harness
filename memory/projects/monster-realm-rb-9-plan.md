# rb-9 plan — A11Y-12 reachability: a computed-cascade differential oracle (ADR-0244)

Residual: R-m23-s2-X3 (source slice m23-s2). Reserved ADR: **0244**.
Worktree: `.claude/worktrees/rb-9`, branch `feat/rb-9-a11y-shell-reachability`, from origin/master@42b6663.

## Problem
A11Y-12 ("styles.css declares zero `#id` selectors") is enforced by string-matching the literal `#`.
Six measured `#`-free, biome-clean stylesheets keep every gate green while hiding `#help-overlay`,
blanking `#help-hint`, or dropping `#a11y-live` from the AX tree (ADR-0151 D1 regression re-created).
ADR-0224 forbids patching the scanner further: port the invariant to a real test, delete the eval clause.

## Measured facts (spike, this worktree)
- happy-dom 20.10.6 DOES run the cascade in `getComputedStyle`: `[id=]`, `[id^=]`, `[id*=]`, `:where()`,
  `:not()`, `:last-of-type`, `nth-child`+`!important`, `*`+`!important`, `@media all`, `content-visibility`.
- Inline `style` beats an author rule without `!important`; `!important` wins. The non-`!important`
  positional twin is therefore a GOOD row and the `!important` one a BAD row.
- happy-dom returns `''` for undeclared properties (NOT the initial value) => vacuity risk => a
  frozen-baseline `want=<exact>` comparison, plus an unprobed-property cascade-liveness control.
- `#help-overlay`/`#menu-overlay` are `display:none` in the shipped markup (view writes `style.display`),
  so the oracle renders TWO states: AS-SHIPPED and SHOWN.

## Design — one oracle, `cascadeOffenders(cssText): string[]`
Render real `client/index.html` in a fresh happy-dom `Window` (settings `disableCSSFileLoading=true`,
`handleDisabledFileLoadingAsSuccess=true` — NOT inherited from the ambient window), inject the css as a
`<style>`, and compare `getComputedStyle` over a bounded `PROBED_PROPERTIES` roster against a FROZEN,
transcribed `CASCADE_BASELINE` for all five `PINNED_SHELL_IDS`, in both states. Offenders are
`"<state>/<id>.<prop> want=<a> got=<b>"`, sorted. Technique-independent AND value-independent.
`PROBED_PROPERTIES` excludes `background`/`font`/box-model shorthands (happy-dom does not round-trip them,
and spec §4 slice S9's `:root` tokens must not false-RED); includes `color` (`color:transparent` blanks
`#help-hint`). Declared blind spot, recorded in the ADR.

## Tasks
- **T0 (done)** spike: fresh `Window` + `document.write(realHtml)` + appended `<style>` applies the cascade.
- **T1 RED** new file `client/src/indexShellCascade.test.ts`, three tests:
  - `RB9-G1` CONTROL: cascade liveness via an UNPROBED property with a runtime-derived value;
    roster non-emptiness; discrimination (`cascadeOffenders('')===[]`, one BAD sheet === its exact set).
  - `RB9-G2` BITES: `CASCADE_FIXTURES` BAD/GOOD table, plain `for..of` (never `it.each`/`skipIf`),
    every BAD row pinning its EXACT sorted offender set. BAD rows = the 6 measured bypasses + the
    indirect `body > div:last-of-type ~ div` that `findCascadeReachingSelectors` admits by its own docblock.
    GOOD rows = the real sheet, `.sr-only`, `.hp-fill`+`@media` guard, `:root{--x}`, `@supports(color:#fff)`,
    and the non-`!important` positional twin.
  - `RB9-G3` REAL ARTEFACT: real html+css => zero offenders, PLUS `realCss + SENTINEL_BYPASS` => its exact
    non-empty set (stops "zero" being an artefact of never rendering the real text).
- **T2 GREEN** `evals/a11y-static-shell.eval.mjs`: delete `T-REAL2` (:2422-2438) and `T-LIVE1` (:2478-2507);
  `teethTotal` 81 -> 79 (:1707); PASS detail `liveness=2/2` -> `1/1` (:2859).
- **T3** retract the now-false docblock claim at `client/src/indexShell.test.ts:980-986`
  ("belongs with S10's eval, not in the hermetic vitest suite") — cite ADR-0244 (a number does not drift),
  and state the retained shape oracle's honest residue. Comment-only.
- **T4** ADR-0244 + ledger + docs.

## Retained on purpose (write into the ADR so nobody "finishes the migration")
`findCascadeReachingSelectors` / `importsAnotherStylesheet` / tooth A6b stay: they cover a real residue the
cascade oracle cannot see — a rule reaching a pinned id through a property OUTSIDE the probed roster on an
element with no inline contract (e.g. `[id="a11y-live"]{color:red}`).

## Named anti-patterns (this slice)
deny-list of selector shapes · `toContain`/non-empty offender assertions · vacuity by `''` ·
fixture-only teeth with no real-artefact arm · fixture monoculture (the `!important` pair is the fix) ·
first-hit anchors / declaration pins / presence needles · count-based CHECK forgery (`vitest -t` with zero
matches exits 0 — pin the COUNT) · meta-checks (ADR-0224 amendment: no "the cascade test still exists" gate) ·
`new RegExp` (Semgrep) and regex literals containing `* / ' "` (the eval's hazardous-regex tripwire) ·
comment-narration drift · a baseline computed from a second render of the same sheet (tautology).

## Read-only inputs
`client/index.html` and `client/src/styles.css` need NO edit. Editing index.html risks
`reduced-motion-purity`'s comment-stripped MOTION_TOKENS scan.

## MEASURED BASELINE (orchestrator spike, worktree, happy-dom 20.10.6)
`show()` in BOTH `client/src/ui/helpView.ts:48` and `client/src/ui/menuView.ts:134` writes
`style.display = ''` (CLEARS the inline declaration) — so the SHOWN state must be modelled as
`el.style.display = ''`, never `= 'block'`. That is what makes a `display:none` author rule reachable
in the shown state.

Props probed: display, visibility, opacity, contentVisibility, position, top, right, bottom, left,
zIndex, width, height, clipPath, overflow, pointerEvents, transform, color.

state=SHIPPED
  help-overlay {"display":"none","visibility":"","opacity":"","contentVisibility":"","position":"fixed","top":"","right":"","bottom":"","left":"","zIndex":"100","width":"","height":"","clipPath":"","overflow":"auto","pointerEvents":"","transform":"","color":"#e0e0e0"}
  menu-overlay {"display":"none",... identical to help-overlay ...}
  help-hint    {"display":"inline-block","visibility":"","opacity":"","contentVisibility":"","position":"fixed","top":"","right":"","bottom":"16px","left":"6px","zIndex":"50","width":"max-content","height":"","clipPath":"","overflow":"","pointerEvents":"auto","transform":"","color":"#9aa0b4"}
  build-stamp  {"display":"block","visibility":"","opacity":"0.55","contentVisibility":"","position":"fixed","top":"","right":"4px","bottom":"2px","left":"","zIndex":"9999","width":"","height":"","clipPath":"","overflow":"","pointerEvents":"none","transform":"","color":"#667"}
  a11y-live    {"display":"block","visibility":"","opacity":"","contentVisibility":"","position":"absolute","top":"","right":"","bottom":"","left":"","zIndex":"","width":"1px","height":"1px","clipPath":"inset(50%)","overflow":"hidden","pointerEvents":"","transform":"","color":""}
state=SHOWN — identical EXCEPT help-overlay.display and menu-overlay.display become "block".

NOTE: `inset:0` does NOT expand to top/right/bottom/left in happy-dom (all ""), so those four cells
are "" in the baseline and an author rule writing `top:100%` still reds (want="" got="100%").

## CORRECTION to the planner's fixture table (orchestrator, measured)
`client/index.html` `<body>` has **16 element children**; `#help-overlay` is `nth-child(11)` (planner
correct), but **`#a11y-live` is `nth-child(15)` and IS `body > div:last-of-type`** — `#build-stamp`
(`nth-child(13)`) is NOT. Therefore the planner's proposed BAD row 7,
`body > div:last-of-type ~ div{visibility:hidden}`, matches **NOTHING** (measured `=> []`) and would be
a vacuous fixture. The correct load-bearing indirect rows, both `#`-free, naming no pinned id, neither
universal nor in `POSITIONAL_SELECTOR_TOKENS` (which lists only nth-child/nth-of-type/nth-last-child/
nth-last-of-type), so both escape `findCascadeReachingSelectors` entirely:
  - `body > div:last-of-type{display:none}`  -> reaches `#a11y-live` (measured `=> ["a11y-live"]`)
  - `body > button{visibility:hidden}`       -> reaches `#help-hint`, the ONLY `<button>` body child
    (a plain TAG selector — the cheapest possible escape from a name/`*`/positional blacklist)

## FINAL DESIGN (supersedes the frozen-baseline design above) — all cells MEASURED
The `/simplify` lens replaced the 170-cell frozen baseline with a **no-sheet differential**: snapshot the
FULLY ENUMERATED computed style (`cs.length` / `cs.item(i)` / `getPropertyValue`) with NO author sheet,
snapshot again WITH the candidate sheet, and diff. Strictly better teeth, ~31 constants instead of ~170,
and the expected-delta equality doubles as the cascade-liveness control. I verified it and then closed
two defects the planner AND the simplify lens both missed:

**DEFECT 1 — the ancestor hole (mine).** A per-element computed-style oracle over the five pinned ids is
blind to `html{display:none}` / `body{display:none}`: in happy-dom AND in a real browser, `display` is
NOT inherited, so hiding an ancestor leaves every descendant's own computed `display` untouched.
MEASURED: `html{display:none}` => NO OFFENDER against a 5-id roster. FIX: put **`html` and `body` in the
target set** alongside the five ids. Re-measured: `html{display:none}` => 2 offenders,
`body{display:none}` => 2. (`visibility` IS inherited, so `body{visibility:hidden}` was already caught —
10 offenders — but `display` is the one that matters and it was not.)

**DEFECT 2 — the `:root` custom-property false-RED.** `:root{--x:1px}` produced `html.--x` as an offender.
Spec §4 slice S9 lands `:root` colour tokens in this very file, so shipped as-is this oracle would
false-RED S9. FIX: **skip properties whose name starts with `--`**. MEASURED that this costs nothing: a
`var()`-consumer attack (`:root{--h:none}` + `[id="help-hint"]{display:var(--h)}`) is STILL caught,
because the CONSUMER's own longhand moves (`help-hint.display inline-block->none`). No second-order tooth
needed.

**Determinism:** 5 consecutive runs of the real-sheet delta => `lengths=62,62,62,62,62 STABLE=true`
(31 entries per render state, all on `#a11y-live`, all the `.sr-only` longhand expansion).

**Soundness precondition (simplify, measured):** a sheet that is ONLY `@import url("...")` yields a
COMPLETELY EMPTY diff under `disableCSSFileLoading:true` — the oracle's own settings create the hole. So
`importsAnotherStylesheet` is NOT residue; it is the precondition of the differential and must be
asserted in the real-artefact arm of the new test.

### The oracle
- targets: `html`, `body`, `#help-overlay`, `#menu-overlay`, `#help-hint`, `#build-stamp`, `#a11y-live`
- states: SHIPPED, and SHOWN (`el.style.display = ''` on the two overlay shells — what `show()` does)
- delta: every enumerated non-custom property, `(absent)` sentinel for unset, sorted, both states
- verdict: offenders = delta entries NOT in the frozen 31-entry ALLOWED map (the `.sr-only` effect),
  compared by `id.property=value`, superset-tolerant in neither direction (equality per state)
- positive liveness: the load-bearing `.sr-only` cells must be PRESENT
  (`position:absolute`, `clip-path:inset(50%)`, `width:1px`, `height:1px`, `overflow:hidden`)
- precondition: no `@import` in the sheet

### Fixture rows, all MEASURED (offender counts are over both states)
BAD  `[id="help-overlay"]{visibility:hidden}`            direct id-naming
BAD  `body > div:nth-child(11){position:static!important}` 2  positional + `!important`
GOOD `body > div:nth-child(11){position:static}`           NO OFFENDER  <-- the load-bearing row:
     the ONLY row that fails a cheap "does any rule match a pinned id" shape oracle. It is what
     forces a real cascade rather than selector text matching.
BAD  `[id="help-overlay"]{display:none!important}`       1  SHOWN-state only (invisible as-shipped)
BAD  `body > div:last-of-type{display:none}`             2  reaches #a11y-live, escapes the shape oracle
BAD  `body > button{visibility:hidden}`                  2  plain TAG selector -> #help-hint
BAD  `div[role="dialog"] ~ button{opacity:0!important}`  2  indirect sibling reach -> #help-hint
BAD  `[id$="-live"]{position:static}`                    2  suffix match; value-pinning is what catches it
BAD  `[id="a11y-live"]{content-visibility:hidden}`       2  AX removal via an unprobed-by-roster property
BAD  `html{display:none}` / `body{display:none}`         2  the ancestor hole
GOOD `:root{--x:1px}` / `@supports (color:#fff){.zz{}}` / `.zz-nothing{color:red}` / the real sheet
CUT (fabricated): `body > div:last-of-type ~ div` matches ZERO elements. CUT (redundant spellings, the
oracle never reads the selector): `[id^="help-"]`, `div[id*=help]`, `:where([id='help-hint'])`.

## DECISIONS after the three plan lenses (orchestrator, binding)

**D1 — the eval deletion is REVERSED to a NARROWING (reviewer B1/B2, BLOCKING).**
`just a11y-e2e` (`justfile:420`, roster at `:456-464`) runs three evals plus EIGHT named spec files, and
`client/src/indexShell.test.ts` is NOT one of them — nor would a new `indexShellCascade.test.ts` be.
So the eval's `T-REAL2` is the ONLY *executing* A11Y-12 check in the nightly tier. Deleting it drops
coverage with no replacement, which ADR-0224:80-83 explicitly forbids ("now-redundant portion" —
T-REAL2 is redundant only in the tier the replacement runs in). Adding the new file to the justfile
roster would fix that, but `justfile` is OUTSIDE `touches:` and is byte-pinned in lockstep by
`evals/ci-gate-wiring.eval.mjs:984` => **hidden-dependency STOP, not a silent widening.**
`T-LIVE1` is likewise RETAINED: it is not an A11Y-12 clause at all but a liveness probe proving
`findIdSelectors` reads its input and walks INSIDE `@media` — a property nothing else tests, and
newly relevant because S9 adds `prefers-contrast` rules to this very file.
=> `teethTotal` stays 81, `liveness=2/2` stays. NO tooth arithmetic changes.

**D2 — the genuinely-redundant A11Y-12 check that CAN be deleted is the SHAPE-reachability half in
`client/src/indexShell.test.ts`** (`findCascadeReachingSelectors` :988-998 + its A6b arm :1629-1660).
It is the m23-s2 stopgap that declared its own inadequacy in writing; it lives only in the `just ci`
tier, which is exactly where the cascade oracle runs, so deleting it costs NO tier. Its stated residue
is measurably false (the differential catches `[id="a11y-live"]{color:red}`, and its own escape-hatch
example matches zero elements). `findIdSelectors` and its A6b arm STAY — they are shared with the
eval's fixtures and with `SHELL_DELEGATIONS[A11Y-07]`'s codeNeedles.
NOTE: this forces an update to `RB15_PARKED_SYMBOLS` (`evals/a11y-static-shell.eval.mjs:~2370`) and its
mirror pin (`client/src/indexShell.test.ts:~2811`) — BOTH are declared `touches:` files.

**D3 — `importsAnotherStylesheet` MOVES into the new test's real-artefact arm** (simplify, measured):
an `@import`-only sheet yields a COMPLETELY EMPTY diff under `disableCSSFileLoading:true`, so it is the
soundness PRECONDITION of the differential, not residue.

**D4 — NO new `SHELL_DELEGATIONS` entry** (reviewer M3 asked for one; simplify correctly called it the
meta-check pattern ADR-0224's amendment retires). The suspension risk (`it.skipIf(true)` / `it.each([])`
exit 0 green) is instead covered by the ledger's X1 pinning the exact PASSED TEST COUNT, and registered
as a residual for the nightly-roster question.

**D5 — SHOWN state is `el.style.display = ''`, never an explicit value** (reviewer B3). Writing
`'block'` would restore an inline declaration that beats every non-`!important` author rule and blind
the oracle to the exact ADR-0151 D1 class. Bite-proof required: `[id="help-overlay"]{display:none!important}`
must be caught in SHOWN and correctly NOT in SHIPPED (measured: 1 offender, shown only).

**D6 — happy-dom harness (reviewer M5):** also set `disableJavaScriptFileLoading` /
`disableJavaScriptEvaluation` (`client/index.html:162` ships `<script type="module" src="/src/main.ts">`,
so `document.write` would try to fetch it — re-creating the hermeticity defect `indexShell.test.ts:820-835`
was written against), and `await win.happyDOM.close()` in a `finally` per `main.wiring.test.ts:4672-4687`.

**D7 — retract ALL THREE false claims** at `client/src/indexShell.test.ts:980-986`, not one (reviewer m4):
(a) "belongs with S10's eval, not in the hermetic vitest suite"; (b) "which needs Playwright" — measured
false, happy-dom 20.10.6 runs the cascade; (c) the present-tense "Recorded as residual R-m23-s2-X3",
which this slice closes. Under D2 most of that docblock leaves with the function.

**D8 — docs (reviewer m5/m6/m7):** T4 = ADR-0244 + `docs/adr/DIGEST.md` regen + one `ARCHITECTURE.md`
paragraph ending `ADR next-free = 0245` + the ledger. ADR-0244 uses `**Amends:** —` (an `Amends:` header
forces a reciprocal `Amended-by:` edit inside ADR-0215, which is OUTSIDE `touches:` => STOP). Subsystem
tags from the fixed vocab: `tooling-docs, ci-gates`. Use the tag `[A11Y-07]`, never bare `[A11Y-12]`
(`evals/keyboard-operable-rows.eval.mjs` already owns `[A11Y-12]` for a DIFFERENT criterion).
`docs/knowledge/**` — no edit expected (it is the server-schema OKF bundle).

**RESIDUALS to register:** (i) the nightly `just a11y-e2e` roster does not run the new cascade test —
needs a `justfile:456-464` edit, outside `touches:`; (ii) no suspension gate covers the new file.

## RED-TEAM RESULT — D2 IS REVERSED. The shape blacklist STAYS.
Red-team built the oracle with a generous 31-property roster and attacked it in happy-dom AND pinned
Chromium (Playwright 1.61.1 / chromium-1228, CDP `Accessibility.getPartialAXTree`).

**BLOCKING FINDING: happy-dom silently DROPS seven at-rule/selector shapes that Chromium honours.**
Each names a pinned id DIRECTLY, is fully live in Chromium (`display:none`, `AX=IGNORED`), and the
cascade oracle reports ZERO offenders because happy-dom's CSS parser never applies the rule:
  `@layer{...}` (anon and named) · `@scope(body){...}` · CSS nesting `body{& [id="help-overlay"]{...}}`
  · `[id="HELP-OVERLAY" i]` (case-insensitive attr) · `@container` (with a `container-type` ancestor)
  · `@media (prefers-contrast: more)` AND `(no-preference)` · `@media (prefers-color-scheme: dark)`
  · `@media (scripting: enabled)`
The last two are TRUE FOR THE DEFAULT USER — measured in Chromium with NO emulation, both hide
`#help-overlay` and `#a11y-live`. And `client/src/styles.css`'s own header says slice S9 ships
`@media (prefers-contrast: more)` into this very file, making it the maximally plausible carrier.

**So the cascade oracle is NOT "technique-independent" — that claim is struck.** Measured, the retained
shape blacklist `findCascadeReachingSelectors` CATCHES 7 of those 8 shapes (it reads the prelude text,
lowercased, so the parser gap is irrelevant to it). The two oracles are COMPLEMENTARY, not redundant:
  - blacklist  -> the at-rule/selector SHAPES happy-dom cannot parse
  - cascade    -> the VALUE/SPECIFICITY/ancestor shapes a prelude scan cannot judge
Deleting the blacklist trades a measured 7-shape catch for nothing. **D2 REVERSED: it is RETAINED and
re-scoped in its docblock as the shape half of a two-oracle pair; only its three FALSE CLAIMS go.**
`importsAnotherStylesheet` likewise stays (red-team: a prepended `@import` works in Chromium and the
oracle only REDs by accident of a happy-dom bug).

**Other blocking findings folded in:**
- A lookup-table stub (`TABLE.get(css) ?? []`) that never constructs a Window passes ALL EIGHT planned
  clauses. Every oracle input was a fixed literal in the file. FIX: one real-artefact arm must be
  RUNTIME-DERIVED and un-transcribable, in the `T-LIVE1` shape (a probe value computed from
  `realCss.length`), and the liveness control must route THROUGH `cascadeOffenders`, not a parallel render.
- Probe the shells' CHILDREN too (`#help-title`, `#help-controls`, `#help-goals`, `#menu-heading`,
  `#menu-rows`, `#menu-back-hint`): `[role="dialog"] > *{display:none}` leaves all five pinned ids
  untouched while the dialog opens EMPTY and takes focus. 0 offenders today.
- The GOOD non-`!important` twin must be written with `position`, NOT `display`: after
  `style.display=''` there is no inline `display` left to beat, so a non-`!important` `display:none`
  DOES bite (1 offender) — and the tempting "fix" of modelling SHOWN as `'block'` would silently
  delete that whole class from the gate.
- New-file content constraints: NO regex literal carrying `/ * ' "` (flips the file to RAW scanning and
  turns comment mentions of owned symbols into census violations), and never spell
  `function <ownedSymbol>(` inside a string (parsed as a LOCAL-DEF second oracle). Both MEASURED to FAIL
  `[A11Y-CSSOWN2]`. Reference the retained residue by ADR NUMBER, not by symbol name.
- X1/X2 EXPECT backreferences force self-consistency, not size: `tests=1/1 ... failed=0` is byte-identical
  green for a single trivial test. Pin LITERAL counts AND test titles (the `justfile` half-4 precedent).

**NEW RESIDUALS (declared, not fixed here):** occlusion/clipping is outside ANY computed-style oracle —
`body::after{position:fixed;inset:0;background;z-index:2147483647}` and `body{clip-path:inset(100%)}`
were PIXEL-PROVEN blank in Chromium (crop bytes 213 vs 2496 control, vs 210 for a fully blank page)
with geometry and every computed property byte-identical to the control.

**Clean negatives (verified NOT bypasses):** `body{visibility:hidden}` (10 offenders — visibility IS
inherited), `.sr-only{display:none}`, all six originally-measured bypasses, `body{all:initial}`,
`body{max-height:0}`, `@keyframes`+`animation`, `::first-line`, `@font-face`. `nth-child(11)` =
`#help-overlay` CONFIRMED in both engines (but `#help-hint` is a `<button>` at 14, so a positional
fixture aimed at it must use `body > button`).

**Verified-safe:** the new-file boundary. Red-team built a full sim tree and diffed `node evals/run.mjs`
in both: the ONLY delta anywhere is `a11y-static-shell`'s `specFiles=203 -> 204`, compared against a
floor, not an exact pin. All other evals byte-identical.
