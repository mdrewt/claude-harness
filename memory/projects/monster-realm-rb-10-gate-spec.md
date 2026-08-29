# rb-10 — ADJUDICATED gate design (supersedes §3-§4 of `monster-realm-rb-10-plan.md`)

Written by the orchestrator after the `reviewer` and `red-team` plan lenses. The plan's §1/§2 (the
code + CSS change) stand except where noted. §3/§4 (gate + ledger) are REPLACED by this file.

Criterion id: **`R-m23-s2-X4`** (the residual's own id). Tag: **`[A11Y-RM3]`**.
`A11Y-29` is TAKEN (`specs/monster-realm-v2/M23-accessibility.spec.md:593`) and the whole
`A11Y-1..36` range is allocated (`PLAN.md:800`); the spec is outside `touches:`, so we mint no new
`A11Y-N`. `[A11Y-RM3]` is verified free (only `[A11Y-RM2]` exists).

## 0. What the lenses measured (why this design, not the draft)

`red-team` transcribed the DRAFT gate and ran 17 biome-formatted stylesheets and 4 hostile
`battleView.ts` variants against a REAL Chromium (`~/.cache/ms-playwright/chromium-1228`) under both
motion preferences. **9 stylesheets/implementations were gate-GREEN, `just ci`-clean, and MEASURED
animating under `prefers-reduced-motion: reduce`.** All 17 also passed the existing
`indexShell.test.ts` teeth 19/19. Artifacts: `/tmp/rb10-attack/`.

| # | Bypass (all MEASURED green + animating) | Closed by |
|---|---|---|
| S1 | **Source order** — guard block written BEFORE the base rule. Media queries add no specificity, so the later equal-specificity rule wins. `dur=0.3s`, live animation, ALL 13 draft teeth green. | C5 |
| S2 | `.hp-fill { transition: width 0.3s !important; }` — `biome check` emits `noImportantStyles` as a WARNING and exits 0 | C3 |
| S3 | `div.hp-fill` / `[class~="hp-fill"]` / `.hp-bar > .hp-fill` / `@media screen{.hp-fill{…}}` appended after the guard — none is spelled `.hp-fill`, so a `prelude === '.hp-fill'` count never sees them | C2 |
| S4 | **WAAPI** `hpFill.animate([{width:…}],300)` — invisible to a `transition`/`animation` TEXT ratchet, invisible to the DOM tooth, 49/49 on the REAL `battleView.test.ts`. WAAPI ignores `prefers-reduced-motion` entirely and `transition:none !important` does not stop it. | C1, C8 |
| S5 | **Second-render-only** `hpFill.style.cssText += HP_EASE` with `HP_EASE` in a SIBLING module — first render is byte-clean, and a transition can only fire on a LATER render | C1, C6 |
| S6 | Inert guard bodies: `transition:none; transition-property:width; transition-duration:0.3s` and `transition:none; animation:hp-pulse 1s infinite` — G5 read ONE declaration | C4 |
| S7 | `stripCssComments` (`a11y-static-shell.eval.mjs:83`) is NOT quote-aware: `[data-hp-marker="/*"] … [data-hp-end="*/"]` deletes a `div.hp-fill` rule from the gate's view, braces stay balanced so the fail-loud walker never throws | C7 |
| S8 | Nested guard `@media (prefers-reduced-motion: reduce){@media (min-width:99999px){…}}` — GREEN iff `atContext` is read as "outermost" | C4 |
| S9 | **Hollowed clauses the 8-mutant probe cannot detect** — `atContext.includes('prefers-reduced-motion')` still bites M6, then ships `@media (prefers-reduced-motion: no-preference)` — a PERFECT INVERSION (only the player who asked for reduced motion gets the animation). Likewise a G6 that inspects only the guarded rule still bites M8. | C9 |

**Two FALSE-RED directions also measured** (a false RED is how a clause gets "fixed" into the
hollow form above): `@media not (prefers-reduced-motion: no-preference)`, `@media (prefers-reduced-motion)`
and `@media (prefers-reduced-motion: reduce), print` are all Chromium-correct (`dur=0s`) but RED
under exact-prelude equality; and biome normalises prelude WHITESPACE but not CASE. → C4.

**Held (do not re-litigate):** the character walker itself (quote-aware + paren-shielded) resisted
braces in attribute values, `:has()`/`:is()` args, `content:"}"`; `hpBar.children.length === 1` +
`className ===` exact equality killed the sibling-element and second-class attacks;
`getAttribute('style')` genuinely bites in happy-dom; `styles.css` is invisible to
`reduced-motion-purity`'s census (`.css` is not in `listClientSourceFiles`' extension list), so the
new `@media` block does NOT false-RED `[A11Y-RM2a]`.

## 1. Architecture — TWO oracles, deliberately

Six of the nine bypasses are cascade-resolution facts **no source-text oracle can see**. So:

- **CI-resident** (runs inside `just ci`, protects the repo forever):
  `evals/reduced-motion-hp-bar.eval.mjs` + the `RM3-HP-FILL` describe in
  `client/src/ui/battleView.test.ts`. Source text + happy-dom.
- **Ledger-resident** (not in `just ci` — needs a browser; it is the slice's ACCEPTANCE evidence):
  `rb-10.cascade-probe.mjs`, a REAL Chromium oracle beside the ledger. This is the airtight one.
  `@playwright/test` is already a devDependency and `chromium-1228` is already installed; red-team's
  full 17×2 matrix ran in ~4 s.

Declared residual **R-rb-10-CASCADE**: the Chromium oracle is ledger-time, not CI-time
(`client/e2e/` is outside `touches:` and `a11y-e2e` is a separate recipe, not part of `just ci`).
A future slice should promote it. This is now a NARROWER residual than the draft's, because the
CI-resident eval closes the source-text half of every bypass above.

## 2. CI-resident eval — `evals/reduced-motion-hp-bar.eval.mjs`

### Oracles (all local to this file; export them for fixture testing)

- **`stripCssComments`** — RE-IMPLEMENT, quote-aware. Do NOT import the one from
  `a11y-static-shell.eval.mjs` (S7 is a measured bypass of it). Port the string-aware shape from
  `client/src/indexShell.test.ts`. Additionally: **reject any CSS string literal containing `/*` or
  `*/`** — that is the carrier, and banning it also fixes the false-RED direction (a legitimate
  future string containing `/*` would otherwise throw `unterminated string`).
- **`parseCssStyleRules(css)`** → `[{ prelude, body, atStack, startIndex, endIndex }]`.
  Character walk, paren-shielded, quote-aware. `atStack` is the **FULL at-rule stack** (array), never
  "outermost" and never "nearest" (S8). Emits rules at every depth. **Throws** on unbalanced braces
  / unterminated string / non-empty stack at EOF.
- **`selectorMatchesClass(prelude, 'hp-fill')`** — a class-TOKEN matcher, not string equality
  (S3). Model it on `selectorTargetsSrOnly` (`client/src/indexShell.test.ts:1367`). Must match
  `.hp-fill`, `div.hp-fill`, `.hp-bar > .hp-fill`, `.hp-fill:not(.x)`, `[class~="hp-fill"]`,
  and a comma-separated list containing any of these. Must NOT match `.hp-fill-x` / `.xhp-fill`.
- **`declarations(body)`** → ordered `[{ prop, value, important }]`. Custom properties verbatim.
- **`findInlineAnimationDecls(tsSrc)`** over the file's own **quote-aware comment-stripped** source
  (comments gone, string bodies INTACT). Flags: `transition`/`animation` followed by `:` or `-`;
  `.transition =` / `.webkitTransition =`; `setProperty('transition'…)`; **and the WAAPI family
  `.animate(`, `new Animation(`, `KeyframeEffect`** (S4); **and `style.cssText +=`** (S5).
  Literal regexes / `indexOf` only — never `new RegExp(<variable>)` (Semgrep, remote-only).

### Clauses (each is a ledger-visible tag; on FAILURE print ONLY the failing tag)

- **C0 / anti-vacuity** — both files readable, non-empty, over byte floors (`styles.css` ≥ 800 B,
  `battleView.ts` ≥ 10 000 B); `parseCssStyleRules(styles.css).length >= 2`; stripped
  `battleView.ts` contains `#renderMonsterCard`; a thrown parse error is a FAIL, never swallowed.
- **C1 `[A11Y-RM3/inline]`** — `findInlineAnimationDecls(battleView.ts) === []`.
  ALSO: `hpFill.style` is written exactly ONCE and only via `cssText =` (count === 1, no `+=`).
- **C2 `[A11Y-RM3/set]`** — the set of rules in `styles.css` that `selectorMatchesClass(…,'hp-fill')`
  AND declare any `transition*`/`animation*` property is **exactly two**: the base and the guard.
  Any third — at ANY depth, under ANY at-rule, spelled ANY way — FAILS. This subsumes S3 and the
  draft's T13 uniqueness.
- **C3 `[A11Y-RM3/base]`** — the base rule has `atStack.length === 0` (top level — reviewer B3),
  declares `transition`, and **no declaration in it carries `!important`** (S2).
- **C4 `[A11Y-RM3/guard]`** — the guard rule has `atStack.length === 1` (S8) and its single entry,
  **lowercased and whitespace-collapsed**, is one of the EQUIVALENT-PRELUDE ALLOW-LIST:
  `@media (prefers-reduced-motion: reduce)` · `@media (prefers-reduced-motion)` ·
  `@media not (prefers-reduced-motion: no-preference)`.
  A comma-separated list is accepted iff EVERY branch is in the allow-list or is a non-screen media
  type. `no-preference` as a positive value is REJECTED (S9's perfect inversion).
- **C5 `[A11Y-RM3/order]`** — `guard.startIndex > base.endIndex`, i.e. the guard follows EVERY
  `.hp-fill`-matching transition rule (reviewer B2 / S1). **The single highest-value clause.**
- **C6 `[A11Y-RM3/body]`** — the guard body's WHOLE declaration set (S6): `transition` is exactly
  `none`; there is no `transition-*` longhand after it; there is no `animation*` property at all;
  and neither rule declares a `--*` custom property (the R-m23-s10-RMCSS escape, folded in here as
  one assertion rather than its own tooth/mutant/ledger row — reviewer's cut).
- **C7 `[A11Y-RM3/delegate]`** — a delegation pin: `client/src/ui/battleView.test.ts` still contains
  the `RM3-HP-FILL` tag AND the two load-bearing needles (`fill.className` and
  `fill.getAttribute('style')`), and `client/vite.config.ts`'s `test.include` still selects
  `src/**/*.test.ts`. Follows the `findInertPins`/`findInertDelegations` precedent
  (`evals/a11y-static-shell.eval.mjs:300-322`). **Without this, C1's ratchet is the only thing
  standing between a gutted DOM tooth and a green ledger (S9).**

**Success detail (the ONLY place these substrings may appear):**
```
[A11Y-RM3] inline=0 matchingRules=2 base@0 guard@1 order=OK guardValue=none important=0 customProps=0 delegate=OK teeth=<n>/<n>
```

### Fixture teeth (BAD must be flagged, GOOD must be accepted)

BAD, one per measured bypass: S1 reversed order · S2 `!important` · S3 all four carriers
(`div.hp-fill`, `[class~=]`, `.hp-bar > .hp-fill`, `@media screen`) · S4 `.animate(` · S5
`cssText +=` · S6 both inert-guard bodies · S7 the `/*`-in-string carrier · S8 the nested guard ·
S9 `no-preference` · empty `.hp-fill{}` · comment-only `.hp-fill` (the LIVE decoy at
`styles.css:29`) · base rule under `@media print` · a `--mr-reduce` in the base rule and a `:root`
under the guard.
GOOD (a false RED here is how the clause gets hollowed): the three equivalent preludes
(`not (…: no-preference)`, bare `(prefers-reduced-motion)`, `…reduce), print`) · an UPPERCASE
prelude · the shipped post-fix `battleView.ts` comment naming the animation in prose · a hex colour
in a nested declaration · `.\#notanid` · `content:"#x"` · `url(#grad)`.

## 3. DOM tooth — `RM3-HP-FILL` in `client/src/ui/battleView.test.ts`

Appended describe. Structural walk (NOT `querySelector('.hp-fill')` — querying by the class then
asserting it is a tautology): `parent.firstElementChild` → `root.children[2]` (opponent) / `[3]`
(player) → `card.children[1]` (hpBar) → `hpBar.firstElementChild`.
Fail-loud preconditions FIRST: `root.children.length === 10`; opponent card text contains
`'Opponent:'`, player card `'You:'`; `hpBar.children.length === 1`.

**Render TWICE with a CHANGED `hpPercent`** and re-assert on the post-update fill (S5 — the first
render is always byte-clean; a transition can only fire on a later render).

Per card, per render: `fill.className === 'hp-fill'` (exact equality) · `fill.style.transition === ''`
· `(fill.getAttribute('style') ?? '')` contains neither `transition` nor `animation` (PRIMARY oracle
— measured to bite in happy-dom) · non-vacuity `fill.style.width` equals the VM's percent and
`fill.style.height === '100%'`.

Verified empirically by the orchestrator: happy-dom yields `style.transition === 'width 0.3s'` and
`styleAttr` containing `transition: width 0.3s;` PRE-fix, and `''` / no `transition` POST-fix. Both
oracles genuinely RED before the fix.
Trap: happy-dom does **not** implement `Element.animate` — a module-scoped previous-HP map reds 6
existing tests, but an instance-scoped WAAPI form is 49/49 green, which is exactly why C1 must ban
the WAAPI spellings by TEXT.

## 4. Probes beside the ledger (harness repo, `memory/projects/gates/`)

### `rb-10.mutation-probe.mjs` — X6, the proof-of-teeth
`mkdtempSync` + `cpSync {recursive, dereference}` of ONLY the files the oracles read (the two source
files, the new eval, `battleView.test.ts`, and the vitest config) — **NOT** `cp -al`; hardlink
copies are not isolation. CONTROL first (unmutated copy must PASS). Function replacer + a count
assertion (`if (n !== 1) throw`) — a `$'`-bearing `String.replace` duplicates the file tail and a
silently-non-applying replace reads as "the gate accepted the cheat".
**One mutant per TOOTH ROW, each pinned to the tag it must produce** — a mutant caught by a
DIFFERENT tooth is a FAIL; narrow the mutant, never re-point the pin (S9 is exactly this failure).
**ELEVEN mutants — one per CLAUSE plus one per measured hollowing shape** (`/simplify`: the draft's
17 collapsed; an empty `.hp-fill{}` is the same clause as a deleted base rule, `prefers-contrast` is
already a pure fixture, and three custom-property sites share one clause — those stay as FIXTURES,
which cost nothing, rather than as tmpdir mutants):
M1 restore the inline transition (**the RED proof**) · M2 delete `className` *(vitest)* ·
M3 delete the base rule · M5 delete the guard block · M7 guard value → `width 0.3s` ·
M9 **`no-preference`** (S9's perfect inversion) · M10 `--mr-reduce` in the BASE rule (the site the
draft's single mutant missed) · M13 **swap the two blocks — source order** (S1) · M14 `!important`
(S2) · M15 `div.hp-fill` appended after the guard (S3) · M16 `.animate(` *(vitest)* (S4).
**M2 and M16 are adjudicated by VITEST, not by the eval** — run
`npx vitest run src/ui/battleView.test.ts -t "RM3-HP-FILL"` in the mutated copy and require the
`RM3-HP-FILL` test to FAIL. Routing every mutant through the eval is how a hollow DOM tooth reaches
8/8 (S9).

### `rb-10.cascade-probe.mjs` — X7, the REAL browser oracle
Playwright + the installed `chromium-1228`. Serves a minimal static page carrying the REAL
`client/src/styles.css` and a `<div class="hp-fill">`, under `context({reducedMotion:'reduce'})` and
`'no-preference'`. Asserts, under `reduce`: `getComputedStyle(fill).transitionDuration === '0s'`
**AND `fill.getAnimations().length === 0`** (the `getAnimations` half is the ONLY signal that
catches the WAAPI class); under `no-preference`: `transitionDuration === '0.3s'` (proves the base
rule is live, i.e. the guard is not a blanket kill).
Red-team's `/tmp/rb10-attack/cascade.mjs` is a working starting point.

## 5. Acceptance ledger (8 rows)

Idiom per `memory/projects/gates/rb-8.gates.md:64` — NO `sh -c` wrapper (the `node -e` body contains
single quotes, which would terminate it):
`cd <ABS_WORKTREE> && PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH" <cmd> 2>&1 | tail -N`

| id | criterion | CHECK | EXPECT |
|---|---|---|---|
| X1 | no inline animation declaration reaches the fill element | the eval | `/\[A11Y-RM3\] inline=0/` |
| X2 | the rendered fill carries the class and no inline animation, across TWO renders | `npx vitest run src/ui/battleView.test.ts -t "RM3-HP-FILL" --reporter=json` + a pass-count floor | `/RM3-DOM-OK passed=[1-9]/` |
| X3 | exactly two `.hp-fill`-matching animation rules; the base is top-level and `!important`-free | the eval | `/matchingRules=2 base@0/` |
| X4 | the guard is exactly one media level deep, under an equivalent prelude, and its whole body is inert | the eval | `/guard@1 .*guardValue=none/` |
| X5 | the guard follows every matching base rule in source order | the eval | `/order=OK/` |
| X6 | proof-of-teeth: every tooth row has a mutant, pinned per tooth, control-first | `rb-10.mutation-probe.mjs` | `/RB10-PROBE control=PASS mutants=11\/11 toothPinsMatched=11\/11/` |
| X7 | REAL Chromium: under `reduce` the fill neither transitions nor animates; under `no-preference` it does transition | `rb-10.cascade-probe.mjs` | `/RB10-CASCADE reduce=0s anims=0 noPref=0.3s/` |
| X8 | the whole repo gate is green on the shipped tree | `just ci` | `/eval: .* 0 FAIL/` (adjust to the real terminal line) |

**Authoring traps** (all measured, do not rediscover):
- `mr-gates lint` BLOCKs any CHECK containing `||` (`mr-gates:446`, unanchored, applies to X-rows
  too). Use `??` / `Number(x)`, never `||`.
- `mr-gates lint` BLOCKs a CHECK containing the EXPECT literal verbatim (`mr-gates:453`) — keep
  EXPECTs escaped-regex.
- Every gate needs an `EVIDENCE:` placeholder line or `check` ticks the box, writes nothing and
  reports 0/N.
- `CHECK: MANUAL:` is executed by `sh`. Only use `MANUAL:` where the row really is manual.
- `check_timeout_s = 120`, `verify_budget_s = 600` (`mr-gates:87`). X8 (`just ci`) will exceed 120 s
  → pass `--timeout`; if the supervisor's `verify` budget strands it, that is a known, declarable
  limit, not a forged row.
- With `| tail -N` the pipeline exit status is `tail`'s, so the EXPECT regex is the SOLE
  adjudicator: **the eval must print ONLY the failing tag on failure**, never the success line.
- `-t` marks non-matching tests PENDING, not failed, and a MISSING spec file reports
  `numTotalTests:0` with exit 0 — hence X2's pass-count floor. Note it still cannot see a GUTTED
  test body; C7's delegation pin + the vitest-adjudicated mutants are what cover that.
- **DROPPED from the draft:** the `git diff --stat <fork> -- <3 paths>` row. Measured forgeable — a
  typo'd pathspec prints nothing and exits 0, identical to "unchanged", with no control probe. X8
  replaces it with a row that actually runs the gate.

## 6. Implementer contract (hard constraints)

1. **`client/src/ui/battleView.ts` must not contain the literal strings `prefers-reduced-motion` or
   `matchMedia` — in code OR comments.** `evals/reduced-motion-purity.eval.mjs:319` runs
   `findMotionReaders` over **RAW** file text and allows exactly one owner
   (`render/motionPreference.ts`); any other hit REDs `[A11Y-RM2a]` with a message about resolver
   purity that has nothing to do with this slice. Write "the reduced-motion media query in
   `client/src/styles.css`" instead. `styles.css` and `*.test.ts` are outside that walk — safe.
2. `docs/adr/DIGEST.md` MUST be regenerated (`just adr-digest`) — `just ci` runs
   `adr-digest-check` (`justfile:431`). Declare it under `touches-delta:`.
3. `ARCHITECTURE.md:1698` says "Today it holds exactly one rule, `.sr-only`" — that becomes false.
   One targeted paragraph edit.
4. Do NOT add the new eval to the `a11y-e2e` recipe region — `evals/ci-gate-wiring.eval.mjs:517`
   (`A11Y_EVAL_FILES`) and `:614/:650` pin it, and adding it REDs `ci-gate-wiring`. **STOP-4.**
   `evals/run.mjs:11` auto-discovers the new file; zero shared files change.
5. STOP-1 widening `reduced-motion-purity.eval.mjs`; STOP-2 touching `indexShell.test.ts` (verified
   to need NO change — if it REDs, the CSS is wrong, not the tooth); STOP-3 touching `client/e2e/`.
6. Run the PINNED `client/node_modules/.bin/biome check <changed files>` BEFORE `just ci` — a single
   unformatted new eval reds the whole run with diagnostics misattributed to untouched client files.
   Note `noImportantStyles` is only a WARNING (exit 0), so biome will NOT catch S2 for you.
7. `CHANGELOG.md` is generated — never hand-edit.
