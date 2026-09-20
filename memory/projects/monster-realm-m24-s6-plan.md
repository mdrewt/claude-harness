# m24-s6 build plan — Boot wiring + §5.4 catalog-shape gate (planner output, 2026-09-20)

Context file: /tmp/m24-s6/context.md (delivered-code facts, touches, ADRs). Toolchain: export PATH="$HOME/.asdf/installs/nodejs/24.13.1/bin:$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH" (node 24.13.1 — the default PATH node is v18).
Verified: Intl plural categories under node 24: en {one,other}; fr {one,many,other}; ru {one,few,many,other}; he {one,two,other}. => S7's catalog.fr.ts must NOT call oneOther( (SHAPE-06 would red it) — record in ADR-0262 consequences.

## 1. Scope decisions (A–G)
| Item | Verdict |
|---|---|
| A placement | Module scope, after `fateLogger` (main.ts:227), before `const ZONE_ID = 0;` (:229). ONE comment line. Adds ~330 code bytes vs ~90 comment bytes → comment-mass margin improves. |
| A alias | Keep `import { t } from './ui/a11yCopy'` (:65) and `t('a11y.world.region')` (:3147) UNTOUCHED — main.wiring.test.ts:11289-11301 (W-M23S5-LIVEREGION-PUMP) freezes that region byte-exactly (ADR-0206 D3). Import i18n as `import { CATALOGS, setLocale, t as i18nT, tf } from './ui/i18n/resolver'` (/simplify: no `currentLocale` import — after `setLocale(LOCALE)` the cell IS `LOCALE` by construction, so both DOM writes read the local `LOCALE`; one fewer import, fewer bytes) + `import { isRtl, negotiateLocale } from './ui/i18n/locale'`. S7 census obligation: derive local names from import specifiers (ADR-0262 D3). |
| B six migrations | IN S6: :582 exportBlocked, :651 privacyOverlayBusy, :961 `tf('chrome.status.disconnected', { where })`, :1040 contentStale, :2442 bugBundleBlocked, :2524 healUnavailable → `i18nT('chrome.status.…')` ×5 + tf ×1, byte-identical English. NOT migrated (no key; messageIds/catalog out of touches): 8× `showFeedback('disconnected — try again')` (:2645-2853) and SESSION_/CLAIM_DISCONNECTED_FEEDBACK. |
| C helpHint | No resolver write in S6 (ADR-0151 D2; W-UX1-HINT-NO-JS-OWNER raw-source pin on `help-hint`). ADR-0262 D5: S7 DEAD-KEY exemption roster = exactly {chrome.helpHint}; SHAPE-02 governs the catalog value; IX-02 keeps the static literal byte-equal. Residual: non-en locale shows the English hint. |
| D ?locale= | `[...new URLSearchParams(window.location.search).getAll('locale'), ...navigator.languages]` → negotiateLocale(…, Object.keys(CATALOGS)); unknown override falls THROUGH to navigator then en; no console.warn. |
| E width | Code points: `Array.from(v).length`. Add one discriminating fixture: 47 code points incl. one astral char (UTF-16 48) PASSES. Non-string value under a budget key → hard fail. |
| F @desc form | `//` only: trimmed line starts with `// @desc:`; ≥10 non-ws chars after the marker ON THAT LINE. Contiguous `//` block ending at entry line−1; blank line breaks it. `/** @desc */` fixture FAILS. Header prose (catalog.en.ts:10-11) non-adjacent → never counted. |
| G ledger | X1..X11 below, counts pinned. |

## 2. Files
- client/src/main.ts (declared): 2 import lines (biome-sorted), boot hunk at :227-229, six literal swaps. Never contains `help-hint`. No identifier `resolver` (one exists at :265).
- client/src/ui/i18n/catalogShape.test.ts (declared, NEW): self-contained §5.4 gate; checkers inside; stripComments from evals/dom-shell-coverage-exclusion.eval.mjs; indexOf/char-class loops, zero RegExp; discovers client/src/ui/i18n/catalog.*.ts EXCLUDING endsWith('.test.ts').
- client/src/ui/i18n/__fixtures__/i18n-hardcoded.json (declared): NO edit, stays 0 (X10 proves).
- client/src/main.i18nBoot.test.ts (sibling-test companion, NEW): runtime-import harness (shape of main.reducedMotionWiring.test.ts / main.privacyCountdown.test.ts) + source pins.
- docs/adr/0262-*.md + DIGEST.md via `just adr-digest` (doc companion); ARCHITECTURE.md one paragraph (doc companion); docs/knowledge only if ci demands.
- Hidden-dependency STOPs: none blocking (frozen A11YSNAPSHOT → alias direction; catalog.test.ts glob collision → .test.ts exclusion + file-set == Object.keys(CATALOGS)).

## 3. Anti-patterns
Comment-mass collapse (main.ts, ~120-byte margin; 1 terse line); dynamic RegExp/regex literals (ADR-0055; blinds stripComments); vacuous gates (empty budget map; parser key-set must EQUAL Object.keys(CATALOGS[locale]); discovered locale set EQUALS Object.keys(CATALOGS); SHAPE-04 walker roster ≥1 `tf(` per named view file; a11yCopy ≥1 a11y. key; SHAPE-06 self-check ru ⊇ {few,many}); `-t` zero-match exits 0 → pin `Tests  N passed`; presence-only needles → exactly-once + ordering on stripped+squashed source; the `disconnected — try again` trap (8 out-of-scope showFeedback sites keep the phrase — the :961 absence needle must be the exact template `${where}: disconnected — try again`); fixture monoculture; no .only/.skip; implementer never edits tests; use `describe(name, { sequential: true }, …)` not `describe.sequential` (S7T-SCAN needs literal `describe(`).

## 4. Tests
main.i18nBoot.test.ts (mock ./ui/i18n/resolver via importOriginal: CATALOGS = {...actual, ...extra→CATALOG_EN}, own cell, setLocale records + throws on unregistered, currentLocale reads the cell; own-property accessor spies on documentElement.lang/dir recording writes; navigator.languages via defineProperty + precondition probe; URL via history.replaceState + location.search probe; await connect() capture):
- BOOT-01 (RED) languages ['he-IL','en-US'], {en} → setLocaleCalls ['en'], langWrites ['en'], dirWrites ['ltr'].
- BOOT-02 (RED) ['he-IL'], {en,he} → ['he'], ['he'], ['rtl'].
- BOOT-03 (RED) ?locale=he, ['en-US'], {en,he} → he/rtl.
- BOOT-04 (RED) ?locale=xx, ['he-IL'], {en,he} → he, no throw.
- BOOT-05 (RED, source) exactly one `negotiateLocale(` before `async function main(` and none after; one `setLocale(`; one `document.documentElement.lang = LOCALE;`; one `document.documentElement.dir = isRtl(`; order setLocale( < .lang = < .dir =; raw source has zero `help-hint`.
- BOOT-06 (RED, source) six chrome.status.* keys each exactly once as i18nT('…')/tf('chrome.status.disconnected', { where }); six exact raw needles absent; `import { t } from './ui/a11yCopy';` exactly once; resolver import has `t as i18nT`.
I18N-23: already GREEN — indexShell.i18n.test.ts:80 IX-01 (cite).
catalogShape.test.ts (live assertions green-on-arrival; teeth proven ONCE by fixtures):
- SHAPE-01: live adjacency + key-set equality + file-set equality. Fixtures: BAD no adjacent desc but header decoy line; BAD 9-char; BAD `/** @desc: */`; BAD blank line between block and entry; GOOD 2-entry source parses exactly 2 keys.
- SHAPE-02: map non-empty; helpHint resolves in every locale as string; en 38 ≤ 47. Fixtures: 52 French FAIL; 47 French PASS; 48 FAIL; 47-cp-with-astral PASS; missing key HARD FAIL; empty map FAIL; closure value FAIL.
- SHAPE-03: live all keys pass ADR-0256 D5 grammar. Fixtures: Battle.HPLine FAIL; chrome.helpHint, a11y.overlay.boxView.title PASS; `chrome`, `chrome..x`, `chrome.1x`, `a-b.c`, `x.y.` FAIL.
- SHAPE-04: (a) 0 hits over all non-test client/src/**/*.ts (stripped); roster ≥1 literal `tf(` per battleView/boxView/leaderboardView/shopView/tradeView; (b) no a11y.* value in CATALOGS ∪ a11yCopy contains {/}; ≥1 a11y. key seen. Fixtures: tf('a11y.overlay.boxView.title', {n: 1}) → 1 hit (also "…" and newline-after-`tf(` forms); tf('box.title', …) → 0; {'a11y.count.items': 'You have {count} items'} FAIL; no-brace PASS.
- SHAPE-05: resolver.ts has exactly one `export function t(`, param text exactly `key: A11yKey | PlainMessageId` + `): string`; zero `export function t<`; no `...`; no `export const t`; runtime t.length === 1. Fixtures: `export function t(key: string): string` FAIL; overload pair FAIL.
- SHAPE-06: per discovered file, Intl.PluralRules(locale).resolvedOptions().pluralCategories; if ≠ {one,other} stripped source has no `oneOther(`. Self-checks en == {one,other}; ru ⊇ {few,many}; fr ⊇ {many}. Fixtures: (ru, oneOther() source) FAIL; (en, same) PASS; (ru, oneOther( in comment only) PASS; (ru, cldr() PASS. catalog.en.ts:39 has `oneOther` in a COMMENT — strip is load-bearing.

## 5. Ledger X-gates (from worktree root; counts re-pinned to the tester's final numbers)
X1 I18N-22 runtime: cd client && npx vitest run src/main.i18nBoot.test.ts -t 'm24s6 BOOT-0[1-4]' → /Tests +4 passed/
X2 I18N-22 source + six migrations: … -t 'm24s6 BOOT-0[5-6]' → /Tests +2 passed/
X3 I18N-23: cd client && npx vitest run src/indexShell.i18n.test.ts -t 'm24s5 IX-01' → /Tests +1 passed/
X4 I18N-24 SHAPE-01 · X5 I18N-25 SHAPE-02 · X6 SHAPE-03 · X7 SHAPE-04 · X8 SHAPE-05 · X9 I18N-33 SHAPE-06: cd client && npx vitest run src/ui/i18n/catalogShape.test.ts -t 'm24s6 SHAPE-0N' → /Tests +K passed/
X10 ceiling stays 0: cd client && npx vitest run src/ui/i18n/hardcodedStrings.test.ts -t 'm24s2 I18N-18' && node -e "…CEILING=…" → /CEILING=0$/m
X11 frozen regions intact: cd client && npx vitest run src/main.wiring.test.ts -t 'W-M23S5-LIVEREGION-PUMP|W-UX1-HINT-NO-JS-OWNER|F-3' → /Tests +N passed/

## 6. ADR-0262 outline
Header ADR-0104: Accepted · 2026-09-20 · m24-s6 · Extends 0256/0257/0261 (no back-link edits — Extends unmodelled by adr-digest) · Subsystems client-ui, ci-gates.
Alternatives rejected: `t as a11yT`; negotiation inside main(); get('locale')+null branch; console.warn; UTF-16 .length / Intl.Segmenter; /** @desc */ tolerance; owning a helpHint write; evals/i18n-catalog-shape.eval.mjs (ADR-0224).
Decisions: D1 vehicle (ADR-0257 D1 template); D2 module-scope hunk + ?locale= semantics; D3 i18nT alias + S7 census obligation; D4 six chrome.status.* migrations, 8 showFeedback excluded; D5 helpHint static, S7 DEAD-KEY roster {chrome.helpHint}; D6 SHAPE-03 grammar = ADR-0256 D5; D7 code-point width; D8 SHAPE-01 //-only + contiguity + equality anti-vacuities; D9 SHAPE-06 Intl-driven, fr `many` hazard; D10 proof shape.
Consequences: every main-importing test runs setLocale('en') at import; S7's catalog.fr.ts auto-discovered → must be registered in CATALOGS and must not call oneOther; residual English hint in non-en; residual 8 uncatalogued disconnect feedbacks.

## 7. Sequence
1 tester (RED): both test files; prereq wasm pkg on disk; i18nBoot expect 6 failed; catalogShape green with fixture teeth. Checkpoint.
2 specialist: main.ts only. Run X1, X2, X10, X11 + main.wiring/main.a11yFocus/hardcodedStrings + `npx tsc --noEmit -p .`. Checkpoint.
3 verifier: mutants on a detached copy (drop dir write; dir twice; ['en'] literal; skip setLocale; navigator.language; isRtl(navigator.language); < for <=; UTF-16 length; SHAPE-01 anywhere-parser; SHAPE-04 single-file walker; SHAPE-06 no strip; revert one literal swap). Each reds exactly one named test.
4 doc-keeper: ADR-0262, adr-digest, ARCHITECTURE paragraph; then full just ci.

## /simplify pass (orchestrator, inline)
- Dropped the `currentLocale` import: `lang`/`dir` both derive from the local `LOCALE` (identical to the cell after `setLocale`). Hunk = 1 comment line + 4 statements.
- Kept one ledger gate per EARS criterion (X1..X9); X10/X11 are cheap regression pins, not new scope. No new module, no helper file, no `console.warn`, no `Intl.Segmenter`.
- ADR-0262 D10 (proof shape) folded into the Consequences; D1-D9 stand.

## Lens outcomes (as run, 2026-09-20)
planner (agreed A–G with 2 overturns: `t as i18nT` alias direction because of the frozen ADR-0206 A11YSNAPSHOT region; 8 showFeedback disconnect literals excluded — no key) → reviewer(plan): no BLOCKER/MAJOR; verified reportError args are not S2 sinks; `${where}` not `${p.where}` ∥ red-team(plan): setAttribute-wrapper not accessor-shadow (PoC'd leak), BOOT-07 getAll fixture, BOOT-02 ['xx-XX','he-IL'], SHAPE-01 literal-mask, SHAPE-02 NFC, SHAPE-04 receivers/generics, SHAPE-05 exact span (t.length ≠ evidence), SHAPE-06 identifier token, `<id>:` naming ∥ /simplify inline: dropped `currentLocale` import → tester A (main.i18nBoot.test.ts, RED 7/7) ∥ tester B (catalogShape.test.ts, 11 green, fixture teeth) → reviewer(tests): APPROVE, minor nested-template note ∥ red-team-writes-the-cheat: B1 vi.mock factory once-per-file (4/7 unpassable), B2 biome local-name specifier sort, `plural['oneOther']` bypass, `[tf][0]` accepted limit → testers resumed via SendMessage (fixes) → specialist (main.ts only; margin 26→187) → reviewer+/simplify inline → verifier APPROVE (11/11 CHECKs, RED→green integrity, 12 main.ts mutants + 5 live-tree mutants killed) → docs inline (landing flag appeared after the test lenses). Full `just ci` GREEN at c4ed256 (CI-EXIT=0; nextest 2433/2433; evals 99/99; client 3356/3356 in 130 files; observability 8/8). PR #493.
