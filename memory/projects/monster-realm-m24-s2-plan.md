# Plan — m24-s2: extraction lint as a co-located vitest test (planner output, 2026-09-20)

Worktree: projects/monster-realm/.claude/worktrees/m24-s2 · branch feat/m24-s2-i18n-hardcoded-strings-lint · ADR 0257

## Files
- client/src/ui/i18n/hardcodedStrings.ts (new) — pure typed fs-free scanner over already-comment-stripped source.
- client/src/ui/i18n/hardcodedStrings.test.ts (new) — Phase 0 fixtures then the real 19-file scan; imports stripComments from ../../../../evals/dom-shell-coverage-exclusion.eval.mjs (precedent catalog.test.ts:32).
- client/src/ui/i18n/__fixtures__/i18n-hardcoded.json (new) — {"HARDCODED_CEILING": N}, plain data, read via readFileSync+JSON.parse with a shape check.
- docs/adr/0257-i18n-hardcoded-string-lint-colocated-vitest-exact-ratchet.md (new)
- harness spec M24 §4 S2 row, §5.2 heading, §5 intro note, HC-04 baseline path, S3/S4/S5/S6 touches += the JSON.
- harness memory/projects/gates/m24-s2.gates.md — author X1..X7.

## Helper API
SINK_FLOOR=169; SCAN_TARGETS (19, rel. client/src); SET_ATTRIBUTE_ALLOWLIST {aria-label, aria-live, aria-describedby, title, alt};
NON_TRANSLATABLE_CHARS = Set([' ','\t','\n','\r','0'..'9','·','×','‰','%','/',':','(',')','[',']',',','.','-','—','+','#','°',"'",'"']) size 33.
type SinkKind = 'textContent'|'title'|'replaceChildren'|'setAttribute'; interface Sink {kind,line,rhs,segments,failingSegments,truncated};
interface ScanResult {sinks,failing,unterminated}; isCleanSegment(seg); scanSource(stripped).
Internals: maskLiterals (typed port of client-no-pii-logs.eval.mjs:166-249 stringMask + text[i]/topLevel[i]), findSinkSites, rhsSpan, segmentsOf (minus t(/tf( call spans; identifier-boundary and no '.' before t). indexOf/char loops only, NO RegExp.

## Decisions
Q1 mask t(/tf( spans inert; every top-level literal run in the payload is a static segment; zero segments ⇒ PASS; interpolation contents unexamined (residual evolutionView.ts:264 documented).
Q2 assert failing === HARDCODED_CEILING (exact pin; ≤ kept as its own it) — blind-scanner vacuity kill; S3-S6 touches gain the JSON.
Q3 token then whitespace then '=' not followed by '=' or '+='; .titleEl/.title()/==/=== are not sinks.
Q4 RHS: walk unmasked chars tracking ()[]{} depth; end at depth-0 ; , ) ] } or EOF; EOF at depth>0 ⇒ truncated (real scan fails loud). Calls: balanced parens; setAttribute splits at first depth-0 ','; first arg must be a bare sq/dq literal ∈ allowlist else not a sink.
Q5 every fixture pins {sinks:n, failing:m} counts; set size 33; unterminated/truncated fixtures; real scan: 19 present+non-empty, ≥169, no unterminated, no truncated, === CEILING.
Q6 helper must not contain (even in comments): .innerHTML .outerHTML [aria-live matchMedia window addEventListener( .dataset. tabindex document.body. Negative vocabulary asserted in the test file only.
Q7 banned: per-file classification, length threshold, literal-only scanning, RegExp, copying stripComments, --update flag, skip/only, numeric file-count floor.

## Tests (order = definition order; names are -t handles)
1 m24s2 I18N-12 isCleanSegment set/rejects · 2 I18N-13 BAD1 · 3 I18N-14 BAD2 · 4 I18N-15 GOOD1/BAD3/GOOD3/vacuity(a) · 5 I18N-16 BAD4/GOOD2/negative vocab · 6 I18N-HC-01 RHS shapes · 7 I18N-17 real scan 19 files ≥169 · 8 I18N-18 ≤ ceiling · 9 I18N-18x === ceiling + JSON shape.

## Ledger X1..X7 ↔ I18N-12..18: CHECK `cd client && npx vitest run src/ui/i18n/hardcodedStrings.test.ts -t 'm24s2 I18N-nn'`, EXPECT `/Tests +1 passed \| \d+ skipped/` (X7: 2 passed).

## Tasks: T1 helper skeleton (typecheck green) → T2 tests RED → T3 impl GREEN (18x RED with measured N) → T4 baseline N, client-test/typecheck/biome, just eval unperturbed → T5 ADR-0257, spec edits, ledger.

## Risks: ADR number race; coverage dent (cover every branch); stripComments tl-state ignores ${}; '\' ∉ set (escapes fail by design); ceiling churn intended; formatter wrapping fixtures (use constants); vocabulary leak into other scanners.

## Revisions after reviewer + red-team (plan lenses, 2026-09-20)
R1 SCOPE: scan EVERY non-test `client/src/**/*.ts` (S0 precedent, walk+endsWith). The 19 spec-named files are asserted present-or-fail (HC-05); SINK_FLOOR=169 is `>=` over the whole-tree total. Measured out-of-19 sinks: privacyView.ts (7; :145 'Privacy & Account Data' FAILS), evolutionNotice.ts (2; :209 'OK' FAILS), liveRegion.ts:111 (ident), render/world.ts:83 + overlayA11y.ts:118 (t() → pass). Spec §4 S5 row gets privacyView.ts + evolutionNotice.ts (else I18N-19 ceiling=0 unreachable).
R2 LITERALS AT ANY DEPTH: every string/template literal inside the RHS span, at any paren/interpolation depth, outside a `t(`/`tf(` call span, contributes its static segments (bare literal = one segment; template = text outside `${}`; interpolation contents recurse). Strictly stricter than §2.2 (direction: toward extraction, §2.2's own cost clause). Kills `replaceChildren(emptyRow('Nothing for sale.'))` (shopView.ts:125/136/144), `${c ? 'Won' : 'Lost'}`, `${'Raw'}`, `wrap('Raw')`. No topLevel array needed.
R3 t(/tf( span: identifier-boundary before `t`/`tf` (no ident char, no `.`, no whitespace between name and `(`); balanced-paren skip via the mask. `obj.t('Raw')`, `at('x')`, `t ('x')` are NOT exempt (their literal fails — conservative).
R4 CEILING: I18N-18 `it` asserts `<=` (EARS letter); I18N-18x `it` asserts `===` (shrink-only made mechanical) + JSON shape (non-negative integer, `<= sinks.length`) + `ceiling <= CEILING_AT_S2` constant in the test (raising above the S2 mark needs a test edit). Merge discipline (documented in ADR-0257 + the failure message): S3->S4->S5 are serial; S6 ‖ S3 may both lower it — the second to merge re-measures and edits the JSON (one line). Permanent tooth, reaches 0 after S6.
R5 MASK-DESYNC TRIPWIRE: a sink token found at an index where the literal mask is TRUE fails loud (parity-flip signature — two regex literals each containing one quote leave `unterminated` false).
R6 ADR-0257: `Extends: 0224, 0255` (unmodelled by adr-digest — no reciprocal edit; `Amends:` would force an ADR-0224 edit + backlink eval); explicit section on the ADR-0224 tension; names residuals with numbers: hoisted identifiers/parameters/Model-file prose (28 ident-RHS sinks, ~41 off-sink prose literals, Model files), out-of-vocabulary tokens (innerText, insertAdjacentText, append('..'), placeholder, prompt( boxView.ts:248), non-literal setAttribute first arg, ASCII-only whitespace (NBSP/en-dash not in set), `→`/`…`/`’` glyphs will still fail after migration unless reviewed in.
R7 FIXTURES ADDED (each pins {sinks, failing}): replaceChildren(helper('Raw')) FAIL; textContent = wrap(t('k')) PASS; t('k') || 'Raw' FAIL; obj.t('Raw') FAIL; x ? t('a') : t('b') PASS; ${c ? 'A' : 'B'} FAIL; ${x ?? ''} PASS; comma-operator end; newline after `=`; `x ??\n 'Raw'` (evolutionView.ts:248 shape); multi-line `+` concat (boxView.ts:94 shape); `??=`/`||=` are not sinks; parity-flip regex fixture fails LOUD via R5; JSON shape rejects string/float/negative.
R8 COVERAGE: T4 sub-step — run `just coverage`-equivalent on the helper (vitest --coverage on the one file) and add fixtures for any uncovered branch.
R9 Subsystems `client-ui, ci-gates` (no i18n tag). Roster restated: main.ts + ui/{battleView,boxView,raisingView,evolutionView,dialogueView,questLogView,healView,shopView,tradeView,pvpView,claimView,sessionView,leaderboardView,menuView,renameView,tradeProposeView,errorOverlayView,helpView}.ts.
