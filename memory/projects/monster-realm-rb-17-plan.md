# rb-17 plan (promoted residual R-m23-s10-X20) — PLAN PHASE MEMO

Slice branch: `slice/rb-17`; worktree
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-17`
forked from origin/master 95a7101.

## 0. Facts MEASURED on the live worktree (orchestrator-verified, not planner-asserted)

| fact | evidence |
|---|---|
| `client/src` file census | `.ts` 253 · `.tsx` 0 · `.js` 0 · `.mjs` 0 · `.cjs` 0 · `.d.ts` 0 · `.css` 1 |
| `client/src/module_bindings/*.ts` | 65 |
| motion tokens in `module_bindings` | **0 files** |
| the only `.css` | `client/src/styles.css`; its `@media (prefers-reduced-motion: reduce)` block is `:95-99`, body `.hp-fill{transition:none}` — **no custom property** |
| `getComputedStyle`/`getPropertyValue` in NON-TEST `client/src` | **0** |
| real `.focus(` sites in non-test `client/src` | `ui/overlayA11y.ts:135,:174` · `ui/focusTrap.ts:148` · `main.ts:1110,:2781`. Five views name `.focus()` in HEADER COMMENTS only (battleView:26, boxView:26, raisingView:27, evolutionView:37, claimView:27) |
| `.ts` test importing `.mjs` eval | proven live: `client/src/indexShell.test.ts:89,:94` |
| `walkClientFiles` (`evals/a11y-static-shell.eval.mjs:870`) | **`if (entry === 'module_bindings') continue;`** |
| `evals/reduced-motion-hp-bar.eval.mjs` exports | `stripCssComments:103` `parseCssStyleRules:240` `declarations:450` `normaliseMediaPrelude:544` `GUARD_PRELUDES:558` `guardPreludeIsEquivalent:603` `listClientModules:1010`. `splitTopLevelCommas:572` is **module-private** |

### FINDING 1 — the (b) divergence is the OPPOSITE of what the residual text says, and it is 65 files wide
The residual claims the eval walker (5 exts) is WIDER than the shipped census (`.ts` only).
Measured, the five extra extensions buy **zero** files (there are none), while
`listClientSourceFiles` **skips `module_bindings` entirely** and the shipped census does not:

* eval roster `[A11Y-RM2a]` = **92** files
* shipped census `S7T-SCAN` (`motionPreference.test.ts:301`) = **157** files (92 + 65 bindings)

So the only LIVE divergence is that **the eval is 65 files weaker**. Reconciling "by construction"
onto `listClientSourceFiles` — the obvious reading of the residual — is a **65-file LOOSENING of
the stronger tier**. That direction is REFUSED. rb-17 reconciles UPWARD.

### FINDING 2 — `evals/lib/**` must NOT be created (YAGNI, and actively harmful)
Every CSS primitive (a) needs is already exported by `evals/reduced-motion-hp-bar.eval.mjs`
(importing from a non-`touches:` eval is READING, which this file already does at `:51-61`).
`evals/a11y-static-shell.eval.mjs:197` records that rb-15 explicitly OVERRULED an
`evals/lib/a11yCssOracle.mjs` end state. Creating `evals/lib/` would make a fourth home for CSS
primitives. Also `evals/run.mjs` readdirs NON-recursively, so a `lib/` file is invisible anyway.

### FINDING 3 — two inbound ADR line citations point below every insertion point
`docs/adr/0213-…:165` cites `reduced-motion-purity.eval.mjs:319`; `docs/adr/0215-…:126` cites
`:354`. The ADR digest gate is header-only, so CI cannot catch the drift.

## 1. Sub-part (c) R-m23-s10-FOCUSHELPER — RULING: **DEFER**, and the recorded blocker is REFUTED

The residual states the blocker is "an explicit owner allow-list requiring main.ts in touches".
**That is wrong.** `[A11Y-15]` never EDITS a scanned file — it `readFileSync`s them
(`evals/overlay-a11y-manifest.eval.mjs:685`). Naming `main.ts` a sanctioned owner is a string
constant INSIDE THE EVAL. `main.ts` needs no edit; neither do `ui/overlayA11y.ts` or
`ui/focusTrap.ts`, which are equally out of `touches:` and equally do not need to be in it.

**The accurate blocker is `evals/overlay-a11y-manifest.eval.mjs` itself.** Every moving part lives
in that one un-touchable file: scan root `UI_DIR:50` + predicate `:258`; the two-way roster ratchet
`KNOWN_VIEW_FILES:66-85` consumed at `:664-678`; the per-file anti-vacuity declaration pairing
`:680-700` (widening to arbitrary `ui/*.ts` helpers means inventing a declaration pin for each, in
that file); `findFocusCallSites` + the two strippers `:138,:148` and the divergence tooth `:711-718`.

Second, independent reason: **ADR-0217** (Accepted 2026-08-30, merged two commits ago at 95a7101)
rules verbatim "Two oracles for one criterion drift invisibly" (`:36`) and "One oracle for
A11Y-15's call axis" (`:91`). Landing an `[A11Y-15]` clause in `reduced-motion-purity.eval.mjs`
(tag `[A11Y-RM2]`, criterion A11Y-28) is a criterion/file mismatch AND a same-week reversal of
ADR-0217 needing its own superseding ADR. rb-12 and rb-15 each already paid for that shape.

Third: the gap is **hypothetical today** — no `ui/focusHelper.ts` exists and every live `.focus(`
site is already sanctioned. Sequencing it behind (a)/(b) loses nothing.

**Action:** fresh residual `R-rb17-FOCUSHELPER`, `touches: evals/overlay-a11y-manifest.eval.mjs`
(+ `docs/adr/**`), recommended to be merged with the already-queued `R-rb16-COMMENTBAN`
(ADR-0217:78) — both settle "which files does A11Y-15 govern, and on raw or stripped text".

## 2. Sub-part (a) R-m23-s10-RMCSS — the gate

**`[A11Y-RM2e]` (CSS side).** Walk `client/src/**/*.css`. Parse with hp-bar's `parseCssStyleRules`
(THROWS on ambiguity — no try/catch, per ADR-0215 RK-2). RED if any style rule whose `atStack`
contains a motion prelude declares a `--*` custom property. Report file + at-stack + property.

* **A1 — polarity.** Predicate is `normaliseMediaPrelude(p)` CONTAINS `prefers-reduced-motion`
  **OR** `guardPreludeIsEquivalent(p)`. `guardPreludeIsEquivalent` ALONE is wrong: it deliberately
  REJECTS `no-preference` (hp-bar:594-598) because for `[A11Y-RM3]` that is an inversion of a
  guard — but for rb-17 the inversion is an EQUALLY GOOD JS-readable channel. Same normaliser,
  opposite polarity. Substring-on-normalised also subsumes comma media-query lists and case, so
  the module-private `splitTopLevelCommas` is not needed.
* **A2 — CSS Nesting is a parser blind spot; FAIL LOUD on it.** For
  `:root{@media (prefers-reduced-motion:reduce){--mr-reduce:1}}` the inner `@media` frame is
  `kind:'at'` and DISCARDED (hp-bar:294) while `:root`'s body is the whole nested text;
  `declarations()`'s `firstTopLevelColon` then yields
  `rawProp = "@media (prefers-reduced-motion: reduce) { --mr-reduce"` ⇒ **`custom === false`**.
  hp-bar:1124-1128 (R7) already records that the parser does not model nesting. So: after
  comment-stripping, if any STYLE-rule body contains an unquoted `@`, THROW, with a message saying
  the repair is to un-nest, never to loosen.
* **A3 — two CSS strippers now coexist in one file, deliberately.** `reduced-motion-purity` already
  imports `stripCssComments` from `a11y-static-shell:131`; hp-bar:89-94 records that one as a
  MEASURED false-GREEN carrier (`[data-a="/*"]{}…[data-b="*/"]{}` deletes a rule from view with
  braces balanced). Import under explicit ALIASES; reach the hardened one only transitively via
  `parseCssStyleRules`. Do NOT swap `findOutOfTreeMotionReads:142-151` over — ADR-0215 designates
  the shell one sole owner for that pair, and hp-bar's refuses shapes `index.html` may grow.
  **This coexistence is the content of the reserved ADR.**
* **A4 — the geometric channel is NOT closed, and that is declared, not hidden.**
  `@media (prefers-reduced-motion: reduce){.probe{width:2px}}` + `probe.offsetWidth===2` carries
  no custom property and no `getComputedStyle`. Banning `offsetWidth`/`getBoundingClientRect`
  would false-RED the first legitimate layout feature, which is how a clause gets deleted
  (hp-bar:338,:838; ADR-0217:80). Declared as residual **`R-rb17-GEOM`**.

**`[A11Y-RM2f]` (JS read-back side).** Over the SOURCE census only (never the spec census —
`indexShell.test.ts:984` names `getComputedStyle` in a comment), RAW text (consistent with
`findMotionReaders:127`'s documented RAW polarity), word-boundary, case-sensitive; ban
`getComputedStyle` `getPropertyValue` `computedStyleMap` `currentStyle` `styleSheets` `cssRules`.

**Anti-vacuity floors (all four).** `cssFiles.length>=1` AND contains `styles.css`;
`styles.css` byte length `>=800` (hp-bar:61 `STYLES_MIN_BYTES`); **`motionScopedRules.length>=1`
over the real tree** (else "zero motion at-rules ⇒ zero custom props ⇒ pass" is permanently
vacuous — the failure text must say this floor and `[A11Y-RM3]` retire TOGETHER); and the existing
`files.length<40` roster floor, raised to the reconciled roster.

**Wrong implementations that must be killed:**
W1 `atStack.some(includes) && declarations().custom` — passes 9 of 10 obvious fixtures, ships the
CSS-Nesting spelling. W2 `guardPreludeIsEquivalent` alone — ships `no-preference`. W3 ban `--`
anywhere in the `.css` — false-REDs S9's `:root` colour tokens (`styles.css:22-24`). W4 raw-text
`prefers-reduced-motion` then `indexOf('--')` — REDs on merge, `styles.css:29` names
`--custom-property` in prose. W5 `parseCssRules` (a11y-static-shell:224) — no `atStack`, so the
"fix" degenerates to W3. W6 `stripCssComments` from a11y-static-shell — total false-GREEN on the
real file. W7 ban `getComputedStyle` only. W8 run `[A11Y-RM2f]` over the spec census — REDs on merge.

## 3. Sub-part (b) R-m23-s10-RMEXT — the reconciliation

`evals/reduced-motion-purity.eval.mjs` becomes SOLE OWNER of "which `client/src` files the motion
census covers", exporting `MOTION_CENSUS_EXTS`, `listMotionCensusFiles(root)`,
`isCensusSource(rel)`, `isCensusSpec(rel)`. Own walker: 5 exts, **`module_bindings` INCLUDED**,
`.d.ts` / `.test.ts` / `.test.tsx` excluded. `[A11Y-RM2a]` switches from `listClientSourceFiles`
to `listMotionCensusFiles` — a STRENGTHENING 92 → 157 (verified safe: 0 motion hits in bindings).
`motionPreference.test.ts` IMPORTS the two predicates (rb-12 pattern) so the tiers agree BY
CONSTRUCTION. The reconciliation must be a **set-identity NO-OP on the live tree**: 157 source /
96 spec before and after (`.d.ts`/`.tsx` are the only formal changes; both empty sets today).

**`[A11Y-RM2g]` agreement ratchet** (the same shape as `KNOWN_VIEW_FILES`'s two-way ratchet, not a
second oracle): `listMotionCensusFiles \ listClientSourceFiles` must be EXACTLY the
`module_bindings/` paths and non-empty (`>=20`); the reverse difference must be EMPTY.

Answers to the three open questions: `isCensusSpec` accepts `.test.ts` AND `.test.tsx`, and the
disguised-test tripwire (`:334-338`) runs over both (no-op today, free). `.d.ts` IS a third
divergence — reconciled by EXCLUDING (type-erased, so it can carry no shipped call, but it CAN
carry the raw string and false-RED the RAW census). A FOURTH walker exists —
`listClientModules` (hp-bar:1010), byte-identical to `listClientSourceFiles`; rb-17 must not touch
it; declared as residual **`R-rb17-WALKER3`**.

**Cross-file constraint:** `MOTION_DELEGATIONS:155-164` pins `motionPreference.test.ts` with
`titleNeedles:['S7T-SCAN']` and `codeNeedles:['mentionsMatchMedia']`, proven to bite by
`findInertPins:363`. The identifier `mentionsMatchMedia` (`:340`) and the id `S7T-SCAN` (`:283`)
MUST survive the rewrite.

## 4. Proof-of-teeth (each tooth runs the SAME pure function the real-tree clause runs)

CSS: e1 BAD `reduce{:root{--mr-reduce:1}}` · e2 BAD `no-preference{…--mr-reduce:0}` (kills W2) ·
e3 BAD nested `@supports` inside the guard (kills `atStack[0]`-only) · e4 BAD comma media list
(kills exact-prelude equality) · e5 BAD CSS-Nesting ⇒ RED **via the refusal** (kills W1) ·
e6 BAD uppercase `@MEDIA` (kills case-sensitive substring) · e7 GOOD the LIVE `styles.css` read
from disk · e8 GOOD `prefers-contrast` custom props (kills W3, and is S9's declared future edit) ·
e9 GOOD a CSS comment naming `--mr-reduce` inside the block · e10 GOOD the live
`.hp-fill{transition:none}` shape.
JS: f1 BAD `getComputedStyle(el).getPropertyValue('--mr-reduce')` · f2 BAD
`document.styleSheets[0].cssRules` (kills W7) · f3 BAD `el.computedStyleMap()` · f4 GOOD
`el.style.transition='none'` (40 such sites ship in battleView.ts) · f5 GOOD an identifier merely
CONTAINING a banned token · f6 GOOD the spec roster is out of scope (kills W8).
Roster: g1 `isCensusSource('ui/x.js')` TRUE · g2 `isCensusSource('module_bindings/index.ts')`
**TRUE** (kills the 65-file loosening) · g3 `'foo.test.ts.bak'` TRUE (`endsWith`, never
`includes`) · g4 `isCensusSpec('ui/x.test.tsx')` TRUE and `isCensusSource` of it FALSE ·
g5 the agreement fn on INJECTED sets REDs (provable without mutating the tree) · g6 real tree.

**The wrong impl that passes a naive tooth set is W1** — it passes NINE of the ten CSS fixtures.
Only e5 kills it, and e5 only exists because `parseCssStyleRules` was traced by hand.

## 5. Anti-patterns (measured in this repo)
self-source needles · first-hit `indexOf` anchors (count and throw on >1) · decoy comments ·
regex-literal-blind strippers (`/[/*]/` blanks a span with NO throw) · census/region contradiction
(the new `>=1` motion floor vs `[A11Y-RM3/set]`'s `motion.length===2` — check mutual
satisfiability) · vacuous floors (a count floor is not a positive-find floor) · **gate needles
hidden in the failure message** (no `bad()` string may contain a token the ledger EXPECTs) ·
main-guard truncation of `run.mjs` (this file has NO main guard by design `:49` — do not add one) ·
`.mjs` import direction only (never call the eval's default export from vitest: vitest's cwd is
`client/`, the eval's paths are repo-root-relative) · APPEND to the `detail:` string `:384-393`,
never insert · `new RegExp(<var>)` is Semgrep-banned remote-only · the format hook runs an
unpinned biome, so re-run `just lint` after every write · red-teaming the plan ≠ red-teaming the
artifact.

## 6. Tasks → acceptance gate ids
X1 census predicates + walker (g1–g4) · X2 `[A11Y-RM2g]` agreement ratchet (g5, g6) ·
X3 `motionPreference.test.ts` imports them; `[A11Y-RM2a]` switches walker; set-identity no-op
157/96 · X4 CSS walker + four floors · X5 `[A11Y-RM2e]` (e1–e10) · X6 `[A11Y-RM2f]` (f1–f6) ·
X7 ADR + `ARCHITECTURE.md` · X8 artifact red-team: write the WRONG IMPLEMENTATIONS W1–W8, not
just mutate fixtures; one distinguishable tag per mutant.

Residuals to declare: `R-rb17-FOCUSHELPER` (c), `R-rb17-GEOM`, `R-rb17-WALKER3`.
