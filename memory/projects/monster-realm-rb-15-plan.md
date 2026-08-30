# rb-15 plan — consolidate the CSS oracle (R-m23-s10-X18)

## Verdict
ONE mergeable slice, atomic (~1050 changed lines, ~460 pure relocation). Splitting
"move" from "teeth" ships an interval where [A11Y-06]/[A11Y-07] are gated by nothing.

## D1 — direction is INVERTED from the residual's text
The residual says "the .mjs eval delegates to the .ts test". That is IMPOSSIBLE:
a plain-node .mjs cannot import a .ts, and the three functions are module-local in
a vitest+happy-dom file. The workable direction is the inverse, and it has an in-repo
precedent merged 2026-08-29: **ADR-0215 / rb-12** made
`evals/a11y-static-shell.eval.mjs` the SOLE OWNER of `stripCssComments`, with
`client/src/indexShell.test.ts:94` importing it. rb-15 applies the same ruling to the
rest of the oracle. Criterion INTENT (one implementation, no drift, no delegation pin)
is preserved exactly; only the ownership direction flips.

## D2 — no new ADR
The supervisor reserved number `None`. ADR-0215 already carries the direction
decision and the consolidation principle; the reversal being recorded here (retiring
delegation for first-party execution) was itself recorded in a FILE HEADER
(`evals/a11y-static-shell.eval.mjs:32-56`), not an ADR, so the symmetric place to
record the reversal is that same header. `ARCHITECTURE.md` gets the
`no new ADR: ADR-0215 already carries this design` clause in the existing house style.

## D3 — the real operational win (not in the residual text)
`just a11y-e2e` (justfile:348) runs three evals plus eight named spec files, and
`indexShell.test.ts` is NOT one of them. So TODAY, in the nightly a11y tier,
[A11Y-06]/[A11Y-07] are gated by a grep for `function findIdSelectors(` and nothing
else. Moving the oracle into the eval is what makes that tier actually run the check.

## Move manifest
MOVE to `.mjs` (private unless marked): CssRule->@typedef, parseCssRules (PRIVATE),
preludeHasUnquotedHash, findIdSelectors (EXPORT), CASCADE_PINNED_IDS (EXPORT frozen),
POSITIONAL_SELECTOR_TOKENS, findCascadeReachingSelectors (EXPORT),
importsAnotherStylesheet (EXPORT), SR_ONLY_CLASS, SR_ONLY_TOKEN_BOUNDARY,
SR_ONLY_REASON_* -> one frozen `SR_ONLY_REASONS` record (EXPORT),
SR_ONLY_BANNED_DECLARATIONS, hasMeaningfulClip, MIN_SR_ONLY_DECLARATIONS (EXPORT),
SrOnlyVerdict->@typedef, firstTopLevelColon, parseDeclarations, stripImportant,
selectorTargetsSrOnly, srOnlyIsAccessible (EXPORT).
STAY in `.ts`: SLASH_STAR/STAR_SLASH (source-hygiene device each file needs for its
OWN bytes — duplicated by necessity, permanently, with the reason written inline),
readStylesCss, SHIPPED_SR_ONLY_RULE, rb12StripJsComments (a self-referential gate must
never ask another module to tell the truth about this file).
parseCssRules is NOT exported: its only .ts consumer (RB12-G4 :2700) repoints to
findIdSelectors, which calls it.

## What replaces each SHELL_DELEGATIONS guarantee
KEEP both indexShell.test.ts entries; retitle to "consumer liveness".
- EXISTS (`function srOnlyIsAccessible(`) -> RETIRED. False by construction after the
  move, forgeable by decoy anyway. Replaced by: the oracle is IN the eval, so deleting
  it is a ReferenceError -> eval crash -> run.mjs red.
- INVOKED-ON-REAL-ARTEFACT -> RETAINED (`srOnlyIsAccessible(readStylesCss())`,
  `findIdSelectors(css)`) + STRENGTHENED: the eval now runs all four oracles on the
  real client/src/styles.css itself.
- EXPECT-CONSUMES-VERDICT -> RETAINED unchanged (`expect(verdict.ok`,
  `expect(\n      offenders,` — the latter is WHITESPACE-SENSITIVE to :2086; do not reindent).
- NOT-SUSPENDED / describe() survives -> RETAINED free with the entries.
- vite test.include REACHABILITY -> RETAINED (global clause :1090).
- NEW: sole ownership (RB15-G1 in the .ts + T-OWN scan in the .mjs).

## Teeth (teethTotal 24 -> ~70), frozen tables, `teeth++` per row, mandatory `kills:`
[A11Y-07] literal-id: 8 BAD + 6 GOOD. [A11Y-07] cascade: 5. [A11Y-07] surface: 2.
[A11Y-06] srOnly: 15 BAD (each asserts the SPECIFIC reason) + 5 GOOD (each asserts
reasons===[]). Table integrity: 2 (exact row counts; every `kills` non-empty+unique).
T-OWN: 2 fixture teeth + the live scan over client/src INCLUDING *.test.ts (new
private listClientSpecFiles — listClientSourceFiles:442 excludes .test.ts by design,
which is exactly the disguised-twin blind spot; do NOT parameterise it, two other
evals consume it). Real artefact: 4 CONTROL probes + 4 real assertions + a liveness
probe (append `#rb15-probe{color:red}` to the real text, require it IS flagged).
Add a fail-loud `if (teeth !== teethTotal) return bad(...)` — today that evenness
check lives ONLY in justfile:365 (nightly), so a dropped tooth is invisible to `just ci`.

## Proof-of-teeth (ADR-0010) — the slice's own criterion
T1 RED: author RB15-G1 in the .ts BEFORE moving anything; it must RED naming the local
definitions it found. Capture that output as evidence.
Bite-proofs (each must RED after the fix): M1 paste findIdSelectors back into the .ts;
M2 the same text in a COMMENT must stay GREEN (control); M3 a second aliasing import;
M4 findIdSelectors -> return []; M5 parseCssRules emits only at depth 0; M6 drop
content-visibility from the deny-list; M7 bypass stripImportant (must red BOTH the
`display:none!important` BAD and the `position:absolute!important` GOOD); M8 point
STYLES_CSS at a missing path (AC-4 fail-loud); M9 delete a fixture row; M10 delete
`srOnlyIsAccessible(readStylesCss())` from the .ts; M11 srOnlyIsAccessible -> const-true.

## Anti-patterns named
Vacuous teeth (BAD asserting only ok===false passes a constant-fail oracle — assert the
REASON; GOOD asserts reasons===[]). Decoy-defeated ownership scan (comment decoy handled
by stripping; STRING decoy is a false RED = safe direction, do not "fix"; the .test.ts
twin is the real hole -> the spec walk). Never cross the CSS and JS/TS strippers (feeding
CSS to the JS stripper eats every `https://` line). Count occurrences, never anchor on the
first hit. Move the MEASURED doc comments VERBATIM (:1092 the [id=] Chromium bypass,
:1182 the 1651px^2 measurement, :1300 the two-directional !important bug, :1371 the KNOWN
DELIBERATE FALSE RED on @media print, :1337 the :is(.a,.b) residual) and prove it
mechanically in the PR ("0 comment lines dropped"). No literal comment delimiters in .mjs
fixtures — assemble from SLASH_STAR/STAR_SLASH. Never write
`Number.parseInt(e.raw, 10) > 0` or `const badTabindex = tabindexEls` anywhere in
indexShell.test.ts: keyboard-operable-rows.eval.mjs:3808 occurrence-counts them at exactly 1.

## Risks / residuals for the PR
RK-A RB12-G7 half 1 is amputated (it pins `function parseCssRules(` inside the .ts);
keep half 2 (behavioural, works through the import); optionally re-add a same-file region
pin in the .mjs. RK-B the eval header's line cites are ALREADY stale (:36 says
1001/1113/1408, real 951/1063/1358) — cite by SYMBOL, never by line. RK-C a 460-line
deletion restales every `indexShell.test.ts:<n>` prose cite. RK-D importsAnotherStylesheet
false-REDs on `content:"@import"` (pre-existing; do NOT encode a GOOD fixture for it).
RK-E X18 is only PARTLY closed: reduced-motion-hp-bar.eval.mjs:103 is a third
stripCssComments that CANNOT converge (ADR-0215 RK-1). RK-F a future EVAL re-implementing
the oracle is outside T-OWN's walk. RK-G Biome may merge the third import -> namespace
fallback (`rb12CssStripperOracle.findIdSelectors(css)` keeps both retained needles as
substrings). RK-H client/tsconfig.json excludes **/*.test.ts, so tsc never checks these
call sites; vitest is the only signature gate.
