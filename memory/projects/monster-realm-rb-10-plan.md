# Plan — slice `rb-10` (residual R-m23-s2-X4): reduced-motion CSS guard for the battle HP bar

Worktree: `projects/monster-realm/.claude/worktrees/rb-10`, branch `slice/rb-10`, fork `ed0a8d9`.
Authored by `planner` (opus), 2026-08-29. Reviewed by `reviewer` + `red-team` + `/simplify` before tests.

## 0. Verified ground truth

| Fact | Evidence |
|---|---|
| The inline transition is the sole one | `client/src/ui/battleView.ts:259`; one `transition` hit in the file |
| Nothing awaits a transition | zero `transitionend`/`animationend` hits repo-wide |
| `styles.css` is 67 lines, one rule (`.sr-only`); header :21-31 declares the guard deliberately absent | `client/src/styles.css` |
| `.hp-fill` already appears **in a comment** at `styles.css:29` — a LIVE decoy | ibid |
| A6a already accepts `@media (prefers-reduced-motion: reduce){…}` | `indexShell.test.ts:2074` GOOD fixture |
| `findCascadeReachingSelectors` bans pinned-id substrings, `*`, `nth-*` — `.hp-fill` matches none | `indexShell.test.ts:1126-1180` |
| `parseCssRules` emits style rules at every brace depth, is module-private in a `.test.ts` | `indexShell.test.ts:987-1072` |
| `stripCssComments`/`stripHtmlComments`/`listClientSourceFiles` exported | `evals/a11y-static-shell.eval.mjs:83,108,195` |
| `stripTsComments`/`stripTsCommentsAndStrings` exported | `evals/overlay-a11y-manifest.eval.mjs:138,148` |
| Evals auto-discover; floor of 40+, no exact count pin | `evals/run.mjs:11,16` |
| Eval contract: no `main` guard, default export → `{name,pass,detail}` | `evals/reduced-motion-purity.eval.mjs` |
| `className = '…'` is the client idiom | `client/src/ui/errorOverlayView.ts:30,34,75` |
| Card child order in `#renderMonsterCard` | `[0]` header, `[1]` hpBar, `[2]` hpText, `[3]` status (cond.) |
| Root child order | `[0]` title `[1]` weather `[2]` opponentCard `[3]` playerCard `[4]` skills … |

Blast radius (union CodeGraph + cbm + grep): `BattleView` ← 6 sites in `main.ts`; tests
`battleView.test.ts`, `boxView.test.ts`, `overlayA11yWiring.test.ts`. No e2e selector uses `.hp-`.
No test reads `cssText`/`class` on the battle card. Change is contained to `#renderMonsterCard`.

## 1. Code change — `client/src/ui/battleView.ts` (:256-259)

```ts
const hpFill = document.createElement('div');
// rb-10 (M23 §2.5, R-m23-s2-X4) comment: the class is the ONLY handle a stylesheet has;
// width/background stay inline (computed per render); the width animation moved to
// `.hp-fill` in client/src/styles.css so the reduced-motion media query can neutralise it.
hpFill.className = 'hp-fill';
const pct = card.hpPercent;
const color = pct > 50 ? '#4a4' : pct > 20 ? '#aa4' : '#a44';
hpFill.style.cssText = `width:${pct}%;height:100%;background:${color};`;
```

1. `className =`, not `classList.add` — element is freshly created each render; total assignment
   makes the DOM tooth's exact-equality assertion meaningful.
2. Order `className` before `cssText` is a convention, not a correctness constraint —
   `style.cssText` writes only the `style` attribute and never touches `class`. Stated so nobody
   "fixes" a nonexistent clobber; the DOM tooth asserts the outcome, so reordering cannot false-RED.
3. ONLY `transition` moves. `width`/`background` are per-render computed; `height:100%` is static
   but also stays inline — nothing in `just ci` evaluates the cascade, so every migrated declaration
   is invisible-if-broken surface. Move exactly the one that cannot work inline.
4. Trailing `;` kept; stays a template literal.
5. No `data-testid` — the class is the handle.

Note (do NOT edit): spec §2.5 cites `battleView.ts:222`; the real line is `:259`. Spec is in the
harness repo, outside `touches:`.

## 2. CSS — `client/src/styles.css`

**2a. Header rewrite**: the "DELIBERATELY ABSENT … `@media (prefers-reduced-motion: reduce)` for the
battle HP bar — it cannot work yet …" bullet (:25-30) becomes FALSE and is replaced, line-count
neutral, with the shipped rationale + the two "do NOT re-add" warnings (inline animation in
`battleView.ts`; a `--custom-property` in either rule). Leave :22-24 (S9 tokens) and :31 untouched.

**2b. Rule appended after :67** (never inserted):

```css
.hp-fill { transition: width 0.3s; }

@media (prefers-reduced-motion: reduce) {
  .hp-fill { transition: none; }
}
```
with a block comment recording: why the animation lives here (unreachable inline at any
specificity); why `transition: none`; why no custom property (R-m23-s10-RMCSS purity escape).

**2c. `transition: none` ruling** — CHOSEN: total (kills every property present and future),
unambiguous. Rejected: `transition-duration: 0.01ms` (its whole purpose is keeping `transitionend`
firing; zero listeners repo-wide, still schedules a transition, magic number); `transition: width 0s`
(still a transition in computed style; scoped to `width`, so a future second property escapes);
`transition-property: none` (leaves a stale duration in the cascade).

## 3. The gate — NEW `evals/reduced-motion-hp-bar.eval.mjs`

Criterion `A11Y-29`, tag `[A11Y-RM3]` (T0: confirm both unused before authoring).

**Oracles.** Reuse `stripCssComments` (a11y-static-shell) and `stripTsComments` (overlay-a11y-manifest)
— eval→eval import is established precedent. Tradeoff stated: reuse buys two measured traps free
(CSS has no `//` comment; a quote-aware TS scanner is required), at the cost of silent coupling —
mitigated by T4/T5/T12 pinning the exact stripper polarities we depend on.
**Re-implement, do not import, the CSS rule walker** (`parseCssRules` is module-private in a
`.test.ts`; importing drags vitest globals into a dependency-free eval).

- `findInlineAnimationDecls(tsSrc)` over `stripTsComments` output (comments gone, string bodies
  intact). Flags `transition` followed by `:`/`-`, `.transition =`/`.webkitTransition =`,
  `setProperty('transition'…)`, and `animation` in the same shapes. Literal regexes / `indexOf`
  only — never `new RegExp(variable)` (Semgrep `detect-non-literal-regexp`, remote-only).
- `parseCssStyleRules(cssSrc)` — character walk on `stripCssComments` output; emits style rules at
  every brace depth carrying the enclosing at-rule prelude as `atContext`; paren-shielded so
  `(prefers-reduced-motion: reduce)` cannot open/close a block; quote-aware; **throws** on
  unbalanced braces / unterminated string / non-empty stack at EOF (parse ambiguity fails loud).
- `declaredProps(body)` (lowercased, custom properties verbatim), `declValue(body, prop)`.

**Wrong implementation → tooth**

| # | Wrong impl | Tooth | Polarity |
|---|---|---|---|
| T1 | pre-fix inline `transition:width 0.3s` in the cssText | `findInlineAnimationDecls` length 1 | BAD — the RED proof |
| T2 | ratchet: `el.style.transition = …` re-added | flagged | BAD |
| T3 | spelling escapes: `transition-duration`, `webkitTransition`, `setProperty`, `animation:` | all four flagged | BAD |
| T4 | the shipped post-fix COMMENT names the animation in prose | NOT flagged | GOOD (raw-text ratchet false-REDs the correct file) |
| T5 | declaration hidden in a string literal | flagged | BAD (why T4 can't be bought by stripping strings) |
| T6 | class never assigned (rule unreachable) | assignment text present in stripped source | BAD (ratchet only — see 3.4) |
| T7 | CSS rule never landed, or empty `.hp-fill{}` | base rule exists AND declares `transition` | BAD (the failure `styles.css:29` warns of) |
| T8 | guard block present with no `.hp-fill` rule inside | guarded-rule count exactly 1 | BAD |
| T9 | wrong feature: `prefers-contrast: more`, `prefers-reduced-motion: no-preference` | `atContext` normalises to exactly `@media (prefers-reduced-motion: reduce)` | BAD |
| T10 | guard present but inert (`transition:width 0.3s` inside it) | `declValue(guard,'transition') === 'none'` | BAD |
| T11 | RMCSS escape: `--mr-reduce:1` in guarded rule / base rule / a `:root` inside the guard | no `--` prop in either `.hp-fill` rule or under the guard context | BAD |
| T12 | comment decoy — `.hp-fill`/`transition:none` only inside a CSS comment | must RED "no base rule" | BAD |
| T13 | forged uniqueness — a SECOND `.hp-fill` base rule overriding the first | exactly 1 base + exactly 1 guarded; `>1` REDs, never "take the first" | BAD |

**Anti-vacuity `G0`** before any real-tree assertion: both files readable + non-empty + over byte
floors (`styles.css` ≥ 800 B, `battleView.ts` ≥ 10 000 B); `parseCssStyleRules(styles.css)` returns
≥ 2 style rules; stripped `battleView.ts` contains `#renderMonsterCard`; a thrown parse error is a
FAIL, never swallowed.

**Real-tree clauses** `G1` inline count 0 · `G2` class assignment present · `G3` base rule declares
`transition` · `G4` exactly one guarded rule under the exact query · `G5` guard value `none` ·
`G6` zero custom properties · `G7` exactly-one-of-each uniqueness.

**Success detail (uniquely-on-success):**
`[A11Y-RM3] inlineAnimationDecls=0 baseRules=1 guardedRules=1 guardValue=none customProps=0 classAssigned=Y cssStyleRules=<n> teeth=13/13`

**3.3 DOM side — appended `describe` in `client/src/ui/battleView.test.ts`, tag `RM3-HP-FILL`.**
Walk structurally (`root.children[2]`/`[3]` → `card.children[1]` → `hpBar.firstElementChild`) — do
NOT `querySelector('.hp-fill')` then assert the class (tautology). Fail-loud preconditions first
(`root.children.length >= 4`; card text contains `'Opponent:'`/`'You:'`; `hpBar.children.length === 1`).
Assertions per card: `fill.className === 'hp-fill'` (exact equality, not `contains`);
`fill.style.transition === ''`; `getAttribute('style')` contains neither `transition` nor
`animation` (PRIMARY oracle — happy-dom may differ from a browser on `style.transition`);
non-vacuity `fill.style.width === '40%'`/`'100%'` and `height === '100%'`.

**3.4 Ownership split.** The eval owns SOURCE-TEXT criteria (rule shape, media prelude exactness,
uniqueness counts, no-custom-property, the `battleView.ts` inline ratchet) — it has no DOM.
`battleView.test.ts` owns RUNTIME REACHABILITY and is the authoritative oracle for the class. The
eval's `G2` is a cheap ratchet only and its failure message says so verbatim ("presence of the
assignment text is not reachability").
**Declared residual R-rb-10-CASCADE:** nothing in `just ci` evaluates the real cascade; the airtight
oracle is Playwright `emulateMedia({reducedMotion:'reduce'})` + `getComputedStyle(fill).transitionDuration`
— `client/e2e/` is outside `touches:` and e2e is not in `just ci`. → M23 S11.
**Declared residual (scope boundary):** repo-wide `styles.css` custom-property ban
(`R-m23-s10-RMCSS`) stays open; we close it only for the two `.hp-fill` rules.

## 4. Acceptance ledger (8 rows) — see `memory/projects/gates/rb-10.gates.md`

X1 inline animation decls = 0 · X2 DOM tooth (vitest JSON with a pass-count guard — a MISSING spec
reports `numTotalTests:0` and exits 0; `-t` marks non-matching tests *pending*) · X3 base rule ·
X4 guarded rule + value · X5 no custom property · X6 **proof of teeth** (mutation probe, 8 mutants,
per-mutant tooth pin, control first) · X7 pre-existing stylesheet/a11y gates untouched and green ·
X8 the stale "deliberately absent" claim is gone from the `styles.css` header.
Every CHECK begins `sh -c 'cd <ABS_WORKTREE> && …'` — `mr-gates check` runs with cwd = the main
checkout. `mr-gates lint` rejects a bare `grep` and requires the `EVIDENCE:` placeholder.

**Mutation probe** `memory/projects/gates/rb-10.mutation-probe.mjs` (rb-3 precedent):
`mkdtempSync` + `cpSync {recursive, dereference}` excluding `node_modules`/`.git`/`target`/`dist`;
**`cp -al` hardlink copies are NOT isolation** — assert the inode differs on a sample file. Run the
eval with `cwd = tmp`. **Per-mutant tooth pin** — a mutant caught by a DIFFERENT tooth is a FAIL
(never re-point a pin; narrow the mutant). **CONTROL first** (unmutated copy must PASS). Apply
mutations with a function replacer + a count assertion (`if (n !== 1) throw`) — `String.replace`
with a `$'`-bearing pattern duplicates the file tail, and a silently-non-applying first-occurrence
replace reads as "the gate accepted the cheat". M1..M8 = restore inline transition · delete
`className` · delete base rule · empty `.hp-fill{}` · delete guard block · guard with
`prefers-contrast: more` · guard value `width 0.3s` · add `--mr-reduce:1` to the guarded rule.

## 5. Anti-patterns (measured in this repo)

1. First-hit `indexOf` anchors are forgeable — COUNT occurrences, throw on `>1`; never `rules.find`.
2. A decoy string literal or comment beats a text pin — `styles.css:29` is a LIVE decoy (T12); the
   post-fix `battleView.ts` comment is the opposite polarity (T4). Both required.
3. A gate that greps its own source proves presence, not reachability — `G2` is labelled a ratchet.
4. Declaration pins are forgeable — every clause runs through the parsed rule structure.
5. Test-suffix exemptions admit disguised production code — scan the two named files by exact path.
6. Semgrep is remote-only and matches comment text — no `new RegExp(variable)`, no `ws://` strings.
7. Never put a slash-star/star-slash glyph inside a comment in the new eval; CSS-comment fixtures
   must be string literals.
8. Biome formats `client/**` and new eval files — run the PINNED
   `client/node_modules/.bin/biome check` on the four changed files BEFORE `just ci`; a single
   unformatted new eval reds the whole run with diagnostics misattributed to untouched client files.
9. Never `cd` in a throwaway diagnostic line; never `git stash`/`git checkout -- <dir>` during the
   mutation loop. Commit the gates before running the probe.
10. Do not edit `evals/run.mjs` or any existing eval/test outside `battleView.test.ts`.
11. `CHANGELOG.md` is generated — never hand-edit.
12. ADR digest gate is header-only — append the ADR-0213 header row, never insert.

## 6. Hidden dependencies — STOP conditions (none required by this plan)

- **STOP-1** widening `evals/reduced-motion-purity.eval.mjs` to close R-m23-s10-RMCSS repo-wide.
- **STOP-2** touching `client/src/indexShell.test.ts` — its teeth need no change; if it REDs, the
  CSS is wrong, not the tooth.
- **STOP-3** adding a Playwright cascade check (`client/e2e/` outside `touches:`).

## 7. Risks

R1 happy-dom `style.transition` semantics → `getAttribute('style')` is the primary oracle.
R2 biome reformat reds CI with misattributed diagnostics → pre-format + pinned biome check.
R3 `A11Y-29`/`[A11Y-RM3]` already taken → T0 grep.
R4 `mr-gates check` cwd is the main checkout → every CHECK `cd`s to the absolute worktree.
R5 `styles.css:29`'s live `.hp-fill` mention false-GREENs a presence-only gate → T12 + parsed-structure.
R6 the post-fix comment false-REDs a raw-text ratchet → T4.
R7 index-based DOM walk drifts → fail-loud structural preconditions.
R8 hardlink copy mutates the real worktree → `cpSync {dereference}` + inode assertion.
R9 the spec's stale `:222` cite → `:259` pinned here and in the ADR; spec is read-only.

## 8. ADR-0213 (header appended, never inserted)

D1 `transition: none` over `0.01ms`/`width 0s`/`transition-property: none` — grounded in the
zero-listener measurement. D2 only `transition` migrates — nothing in `just ci` evaluates the
cascade, so migrated declarations are invisible-if-broken surface. D3 split ownership + the declared
R-rb-10-CASCADE residual. D4 no custom property in either rule (self-restraint against R-m23-s10-RMCSS,
which stays open repo-wide by design). Plus: the eval re-implements the CSS walker rather than
importing the module-private `parseCssRules`.
`ARCHITECTURE.md`: ONE short paragraph — `styles.css` now holds two rules; the guard is CSS-only with
no JS dependency; the class is assigned in `#renderMonsterCard`.

## 9. Task order (RED-first)

T0 confirm criterion ids free · **T1 author the eval + the `RM3-HP-FILL` describe, run against the
UNMODIFIED tree, both MUST RED, record the failure strings, COMMIT the gates** · T2 `battleView.ts`
· T3 `styles.css` · T4 re-run → GREEN, capture the detail line for the EXPECTs · T5 mutation probe
(control + 8 mutants, per-mutant tooth pin) · T6 ADR-0213 + `ARCHITECTURE.md` + residuals · T7
pinned biome check then full `just ci` ONCE · T8 `mr-gates lint` then `mr-gates check` on the final
tree · T9 red-team pass on the gate.

## 10. Right-sizing

**ONE mergeable slice; park nothing.** ~3 lines of TS + ~8 lines of CSS across two declared files;
the class name, the rule and the failure mode were pre-specified by `styles.css:25-30`. Splitting
would force a merge window where the class exists with no rule (or vice versa) — precisely the two
half-states the gate rejects. Two things are DECLARED RESIDUALS, not parked work: the browser-cascade
oracle (M23 S11) and the repo-wide custom-property ban (S9/RM2).
