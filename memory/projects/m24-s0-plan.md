# m24-s0 plan — sink elimination (M24 §2.1(a)/(b), I18N-1..5)

Population correction: spec counts 14 sites; live = 13 (3 markup + 10 clears). dialogueView.ts:30 already converted (dialogueView.ts:59 replaceChildren()).

## 1. Edits
shopView.ts: :115 markup → createElement('li')+textContent+replaceChildren(li); :116 → replaceChildren(); :121 → replaceChildren(); :126 markup → same; :129 → replaceChildren(); :134 markup → same. Module-private `function emptyRow(text): HTMLLIElement` (not exported). Lines 105–111 (balance anchors) byte-identical (wallet-privacy.eval.mjs:626-643,1360 pins them).
tradeView.ts: :94,95,96,122,165 → replaceChildren(); :180 comment innerHTML=''→replaceChildren().
questLogView.ts:42, healView.ts:43 → replaceChildren(). Statement order (clear+paint BEFORE openOverlayA11y) unchanged.
dialogueView.ts: zero edits (scan-roster member only).
tradeView.test.ts:220 stale narration "clears actionsEl.innerHTML" → replaceChildren.
Preserve byte-for-byte: openOverlayA11y/closeOverlayA11y at shopView.ts:85,95; tradeView.ts:71,82; questLogView.ts:38,51,61; healView.ts:39,54,64.

## 2. Tests
NEW client/src/ui/i18n-no-html-sink.test.ts (node env). Literal `describe(` required (S7T-SCAN, motionPreference.test.ts:365). Import stripComments from '../../../evals/dom-shell-coverage-exclusion.eval.mjs' (4 precedents). Recursive readdirSync walk rooted at dirname(fileURLToPath(import.meta.url))/.. ; predicate endsWith('.ts') && !endsWith('.test.ts').
Matcher findHtmlSinks(code): indexOf loops only. Assignment family `.innerHTML`/`.outerHTML` followed by optional ws then `=` not `==`, or `+=`; call family literal `insertAdjacentHTML(`, `document.write(`, `.setHTML(`.
- I18N-1 'm24s0 I18N-1: zero .innerHTML = / .outerHTML = assignment sites…' — red at HEAD (13 sites), green after.
- I18N-2 'm24s0 I18N-2: zero insertAdjacentHTML( / document.write( / .setHTML( call sites'
- I18N-3 'm24s0 I18N-3: fixture list.innerHTML = t('shop.empty') is flagged by findHtmlSinks' + polarity controls (=== comparison → [], += → hit, comment → []).
- I18N-4 'm24s0 I18N-4: the walk read every named S0 target file and each is non-empty' — named roster of 5 files; no numeric floor.
shopView.test.ts append: 'm24s0 I18N-5: render(no-shop) builds the empty-state row via createElement("li") + textContent…' — populated render first, then vi.spyOn(document,'createElement') AFTER mount+ctor, render(no-shop), assert exactly one 'li' createElement call, #shop-for-sale childElementCount 1, LI, one Text node, exact text; #shop-inventory childNodes.length 0.

## 3. Scope: whole client/src/**/*.ts minus *.test.ts (satisfiable: 0 sinks after S0; client-no-pii-logs already runs stripComments over the client tree).
## 4. §8.1: no li/#shop-* structural selectors in shopView.test.ts, styles.css, index.html; e2e wallet-balance.spec.ts:1065 text-only. Resolved.
## 5. ADR-0255 docs/adr/0255-delete-html-parsing-sinks-before-string-externalization.md — Subsystems: client-ui, ci-gates; alternatives: RHS-predicate guard / keep innerHTML='' / eval script (ADR-0224) / TS-compiler scan.
## 6. Anti-patterns: regex strippers, new RegExp, site-count floors, 5-file-only scope, substring test exemption, third stripComments copy, missing describe(, renaming exports, spy before mount.
## 7. Gates X1..X5 = vitest -t per criterion with EXPECT /Tests +1 passed \| \d+ skipped/; X6 = the 5 sibling suites, count pinned.
