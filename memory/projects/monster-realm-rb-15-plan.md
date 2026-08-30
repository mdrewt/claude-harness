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

---
# REVISION 2 — after reviewer + red-team (both MEASURED against the pinned toolchain)

## R1 (BLOCKER, both lenses, measured) — a third import from the same specifier REDs the shipped RB12-G1
Pinned biome 2.5.1 MERGES same-specifier imports. RB12-G1 (`indexShell.test.ts:2604`)
counts LINES starting with `import` that name `stripCssComments`, requiring exactly 1;
after the merge+wrap that count is **0** and it REDs with a message that reads
"the owner symbol is unreachable from this file". Deterministic under `just lint` AND
under the PostToolUse format hook.
**RESOLUTION — add ZERO new import lines.** The rb-15 symbols are reached through the
EXISTING namespace binding `rb12CssStripperOracle` (`:89`). RB12-G1 is not touched, not
widened (memory: widening a matcher can loosen it), and both retained delegation
needles (`findIdSelectors(css)`, `srOnlyIsAccessible(readStylesCss())`) survive
byte-identically as SUBSTRINGS of the member-access call.
The planner's RK-G namespace *fallback* becomes the PLAN. Red-team's objection to it
(S3/C8: `{...ns, findIdSelectors: bad}` forges it) is closed by R2's namespace-integrity
clause, which is measured, not asserted.

## R2 (BLOCKER, red-team, measured) — a shape blacklist is not an ownership gate
7 shipping-plausible second oracles beat the planned `function NAME(` / `NAME =` ban AND
all four retained needles AND the T-OWN walk, producing an END-TO-END FALSE GREEN on a
deliberately poisoned stylesheet (42 checks, 0 red, while the honest oracle reports
`#help-overlay` + a `display:none` .sr-only): C1 object-method shorthand, C2 object-literal
arrow property, C3 class static method, C4 Object.assign over the namespace, C8 poisoned
namespace spread, C9 sibling `*.test.ts` twin, C12 getter property. All biome-clean.
**RESOLUTION — RB15-G1 = THREE clauses, all required (measured: no two suffice):**
  (a) SHAPE BAN — `function NAME(` / `NAME =` (catches C10/C11, which the census reads as calls);
  (b) OCCURRENCE CENSUS — on comment-AND-string-stripped source, EVERY whole-word
      occurrence of a moved symbol must be immediately preceded by `rb12CssStripperOracle.`
      (catches C1/C2/C3/C9/C12);
  (c) NAMESPACE INTEGRITY — the identifier `rb12CssStripperOracle` must ALWAYS be followed
      by `.`, outside its own import line. `{...ns,` / `Object.assign(…, ns)` / `const o = ns`
      are all followed by `,` `)` or whitespace (catches C4/C8).
T-OWN in the `.mjs` applies (a)+(b) over the client walk INCLUDING `*.test.ts`.
RED controls: LOCAL-DEF, LOCAL-ASSIGN (the pre-move tree yields 11 LOCAL-DEF and ZERO
LOCAL-ASSIGN, so that half ships unexercised without a synthetic control), MEMBER-ACCESS,
NAMESPACE-ESCAPE — plus a GREEN comment-decoy control.

## R3 (HIGH, red-team, measured) — `.includes(reason)` does not discriminate
A constant-fail oracle returning EVERY reason survives all 15 BAD rows; the entire kill
comes from the 5 GOOD rows. And `MIN_SR_ONLY_DECLARATIONS = 0` survives ALL teeth, because
the floor only ever appears as an EXTRA reason no `.includes` can see.
**RESOLUTION —** each BAD row asserts the EXACT reasons SET (order-insensitive, exact
membership), each GOOD row asserts `reasons` is EMPTY. Pin the real artefact's
`declCount` against the LITERAL 9, never against the imported constant (that comparison
is a tautology once both sides come from the same module).

## R4 (BLOCKER-adjacent, reviewer) — do not hand-author 34 duplicate fixture rows
The planned `.mjs` tables are byte-for-byte the tables already at `indexShell.test.ts:1962`
(8 BAD + 6 GOOD) and `:2174` (15 BAD + 4 GOOD). Re-typing them in the second file is the
exact defect this slice exists to remove, one level up.
**RESOLUTION —** export the tables from the `.mjs` as FROZEN DATA (the proven
`CSS_STRIPPER_CORPUS` shape, `:271`); A6a/A7a in the `.ts` loop the imported table; the
`.mjs` teeth loop the same table. One source, executed by BOTH tiers — which is also what
finally runs these fixtures in the nightly `a11y-e2e` tier for the first time.
Guard with the shipped RB12-G3 two-source pattern (`:2649`): a locally re-declared
name/`kills` roster in the `.ts`, set-equal both directions + exact count.

## R5 (reviewer Q8) — PARK the cascade half
`findCascadeReachingSelectors`, `importsAnotherStylesheet`, `CASCADE_PINNED_IDS`,
`POSITIONAL_SELECTOR_TOKENS` and the roster-pin question STAY in the `.ts`. The residual
names three functions; these two drag ~120 lines and are the only reason the roster-pin
ceremony was a question. `parseCssRules` is therefore EXPORTED (the retained
`findCascadeReachingSelectors` consumes it) — which also means RB12-G4 (`:2700`) needs NO
repoint and no title change, and RB12-G7 half 2 keeps working unchanged.
Parked as **R-rb15-CASCADE -> backlog**. Its gate needs no new code: the `[A11Y-07]`
SHELL_DELEGATIONS entry retains both symbols as codeNeedles, so `findInertDelegations` +
`findInertPins` keep proving the `.ts` owns them, non-inert and CI-reachable — exactly the
guarantee that exists today, unchanged, for exactly the two deferred functions.

## R6 (reviewer M2/S11) — required edits the plan omitted
- BOTH `function srOnlyIsAccessible(` AND `function findIdSelectors(` needles must retire
  (`:545`, `:556`); leaving either REDs the eval on itself.
- RB12-G7 half 1 (`:2905-2922`) hard-FAILS after the move (`headIdx = -1`). It must be
  DELETED **and RE-CREATED in the `.mjs`** — it closes a MEASURED bypass (`:2889`: a
  differently-named local stripper + a one-word repoint kept all 25 tests green while
  `findIdSelectors` swallowed a whole `#id` rule) that survives the move verbatim, one
  file over. Deleting it with no replacement is the RED->green weakening a verifier flags.
- RB12-G2 (`:2628`, `:2635`) repoints from `rb12CssStripperOracle.stripCssComments` to the
  BARE `stripCssComments`, because moving `parseCssRules` + `importsAnotherStylesheet`
  out... (with R5, `importsAnotherStylesheet` STAYS, so `:94` keeps a live consumer and
  this edit is NOT needed — verify before touching).

## R7 (red-team S6, measured) — the retained needles are liveness THEATRE
`it.skipIf(true)`, `it.runIf(false)`, `it.each([])`, an early `return`, an unreachable
`if (Number('0') === 1)` block and a SHADOWED `const verdict = {ok:true}` all keep every
retained needle GREEN. Measured against real vitest: exit 0, 2 passed, 2 PENDING, and
`it.each([])` registers nothing at all. `SUSPENSION_SPELLINGS` lives in
`overlay-a11y-manifest.eval.mjs` — OUT OF TOUCHES.
**RESOLUTION —** add a LOCAL extended-suspension clause in the eval I own, covering
`.skipIf(` `.runIf(` `.each([])` `.for([])`. Flag the shared-list gap as a follow-up;
do not edit the sibling eval.

## R8 (red-team S8/S9, measured) — the real-artefact block is vacuous three ways
The planned `#rb15-probe{color:red}` liveness probe is DEPTH-0 and so misses the
depth-0-only walk it exists to catch; there is NO sr-only liveness probe at all; and
`findIdSelectors`/`cascade`/`@import` are all vacuously green on a stylesheet gutted to
its header comment (`trim().length > 0` PASSES on an all-comments file).
**RESOLUTION —** probe id-selectors `@media`-NESTED; ADD an sr-only liveness probe
(append `.sr-only{display:none}`, require the DISPLAY reason); floor on
`parseCssRules(css).length` (RULE count), never on character count.

## R9 (reviewer M1) — the four real-artefact calls THROW and must be caught
`parseCssRules` throws on unbalanced braces / unterminated strings; `stripCssComments`
throws at EOF. Unguarded, an unparseable stylesheet is an eval CRASH with no criterion
name — indistinguishable from a harness bug. The file's own T10c comment (`:706`) already
sets this house rule. Wrap each in `try/catch -> bad('[A11Y-06/07] ... failed to parse')`.

## R10 (reviewer M4) — ADR-0215:147-149 explicitly reserves the OPPOSITE
> "Not closed by this slice: residual R-m23-s10-CSSDRIFT ... those remain gated solely by
> indexShell.test.ts's own inline BAD/GOOD proofs."
rb-15 reverses that sentence, so "ADR-0215 already carries this design" would be FALSE.
No number was reserved and guessing 0217 risks a collision with a concurrent sibling.
**RESOLUTION —** APPEND an `**Update (rb-15)**` note to ADR-0215's body (a status update,
not a rewrite — the record is preserved). The digest gate is HEADER-ONLY, so a body edit
needs no DIGEST regen. Declared under touches-delta.

## R11 (reviewer M5) — overrule the header's stated end state in the same edit
`evals/a11y-static-shell.eval.mjs:55` asserts the end state is
`evals/lib/a11yCssOracle.mjs` imported by both tiers. After this lands that is false.
Rewrite `:32-56` — cite by SYMBOL, never by line (`:36`'s cites 1001/1113/1408 are
already 50 lines stale vs the real 951/1063/1358), and say plainly that the eval file
IS the oracle's home.

## R12 (reviewer Q9) — no duplicated walker
Extract a private `walkClientFiles(root, prefix, accept)`; `listClientSourceFiles`
(`:430`) becomes a thin wrapper with a BYTE-IDENTICAL signature and output (two other
evals consume it); the `*.test.ts` walk is 3 more lines.

## R13 (red-team S12) — touch NO justfile line
`evals/ci-gate-wiring.eval.mjs` verbatim-pins the whole `a11y-e2e` recipe region; adding
`indexShell.test.ts` to its 8-file list is a three-place lockstep. Not done. State it in
the PR so nobody "improves" it.

## CUT as ceremony (reviewer Q7/Q10)
The `SR_ONLY_REASON_* -> SR_ONLY_REASONS` record refactor (forces 15 fixture rewrites for
zero defect-class coverage — the constants stay module-private and the SHARED tables carry
the expected reason strings as literals, which is strictly stronger: mutating a constant
now REDs). The `kills`-uniqueness assertion. The "0 comment lines dropped" PR claim
(an ungated PR-body assertion is evidence theatre). Bite-proof M8.

## Revised sizing: ~600 changed lines, 2 files + ADR-0215 body + ARCHITECTURE.md. One slice.
