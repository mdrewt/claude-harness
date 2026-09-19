# rb-89 plan — R-17r-e-VIEWHDR: five present-tense citations of a retracted contract (a)

Slice: rb-89 · residual: R-17r-e-VIEWHDR · repo: project (`mdrewt/monster-realm`) · branch `fix/rb-89-viewhdr-stale-contract-a-citations`
Worktree: `projects/monster-realm/.claude/worktrees/rb-89` · base `db95397` (origin/master 2026-09-18)
Touches: `client/src/ui/{battleView,boxView,raisingView,evolutionView}.ts` (comment only), `client/src/ui/overlayA11y.test.ts` (tests), `ARCHITECTURE.md`. `overlayA11y.ts` in touches but NOT edited (already correct; 102 line-cites). No ADR (none assigned; ADR-0224 comment-only). No new eval.

## Defect (verified in the worktree)
- `overlayA11y.ts:52-54` — contract (a) reads `(a) A12 — RETRACTED: ... S4 must NOT close-before-open`.
- `battleView.ts:29-33`, `boxView.ts:29-33`, `raisingView.ts:30-34`, `evolutionView.ts:40-44` — byte-identical 5-line paragraph:
  `contract (a) says the four ... "share ONE root" and that S4 must therefore close-before-open. That is a misstatement...` Present tense; (a) no longer says it.
- `ARCHITECTURE.md:1970` (the exactly-one line starting `**m23-s1** complete`) asserts as fact: `the four #app-mounted overlays share ONE root, so S4 must close-before-open or two capture traps stack`.
- `:2094` (m23-s4), `:2243` (17r-e), `:2299` (rb-88) narrate it as dated history — untouched.
- `docs/knowledge` is generated from server-module only — no regen. No eval pins the paragraph, the marker, or `S4-CROSS-VIEW-DISTINCT-ROOTS` (`ci-gate-wiring.eval.mjs:985` names `overlayA11y.test.ts` only as a nightly `a11y-e2e` roster file with a MINIMUM floor — adding tests is safe).

## A — Comment fix (line-neutral, confined to the paragraph, identical in all four files)
Replacement (5 in / 5 out; widths 93/93/96/99/99):
```
// NO CLOSE-BEFORE-OPEN. `ui/overlayA11y.ts`'s cross-slice contract (a) once claimed the four
// `#app`-mounted views "share ONE root" and prescribed close-before-open; 17r-e RETRACTED it
// in place (A12, ui/overlayA11y.ts:52-54); (a) now agrees with this code: each view creates its
// OWN root under the shared MOUNT — four roots, four `OverlayId`s, four records. Closing a sibling
// here would close an overlay the player still has open. Pinned by `S4-CROSS-VIEW-DISTINCT-ROOTS`.
```
Must-survive: marker `// NO CLOSE-BEFORE-OPEN.` (test anchor) · true shape (OWN root under shared MOUNT, four roots/ids/records) · consequence (sibling close kills a live overlay) · pin `S4-CROSS-VIEW-DISTINCT-ROOTS` · retraction attribution (17r-e, A12, `:52-54` — same cite focusTrap.ts:58 carries). Deliberately absent: `contract (a) says`, `must therefore close-before-open`, `misstatement`. No `.focus(`/`openOverlayA11y(`/`installTrap(` tokens introduced (view-file source-scan evals).

**A2 — `ARCHITECTURE.md:1970` — rb-75 bracket idiom, NOT an in-line rewrite** (reviewer MAJOR: `ARCHITECTURE.md:5-6` says milestone blocks quote code "as it shipped"; precedent `:1575/:1827/:1933` `[rb-75: …]` notes appended on the same line with the historical prose byte-preserved). Append to the END of the m23-s1 line: `[rb-89: the "share ONE root, so S4 must close-before-open or two capture traps stack" contract named above was RETRACTED by 17r-e (`overlayA11y.ts:52-54`, A12): each view creates its OWN root under the shared `#app` mount, so S4 must NOT close-before-open — pinned by `S4-CROSS-VIEW-DISTINCT-ROOTS` (`boxView.test.ts`). The prose above is preserved as shipped.]` The master line must remain a byte-prefix of the new line. New `**rb-89**` block appended after `:2299`. Residual-spec drift noted for traceability: the residual cites `ARCHITECTURE.md:1908`; the block lives at `:1970` on this tree (the `:1908` → `:1970` shift is header-insert drift, the rb-75 class).

## B — Tests (append `describe('rb-89 …')` to `overlayA11y.test.ts`; 21 → 26; readFileSync/path/fileURLToPath per renameView.test.ts:867-881; `.includes`/`indexOf` only, no RegExp)
1. `rb-89-CONTRACT-A-RETRACTED-GROUND-TRUTH` — overlayA11y.ts has exactly one line containing `(a) A12 — RETRACTED` AND it is line 52, with `S4-CROSS-VIEW-DISTINCT-ROOTS` on line 54 (red-team 4: validates the `:52-54` cite the four paragraphs carry; green on master; a lock).
2. `rb-89-VIEWHDR-AGREES-WITH-CONTRACT-A` — it.each over the four view files (4 tests, each RED on master):
   - exactly one line startsWith `// NO CLOSE-BEFORE-OPEN.` (`expect(count).toBe(1)` — FAIL LOUD, never an early `return`; red-team 2); window = that line through consecutive `//` lines; `expect(window.length).toBe(5)`;
   - window includes `RETRACTED`, `S4-CROSS-VIEW-DISTINCT-ROOTS`, `OWN root`;
   - WHOLE FILE excludes `contract (a) says` and `must therefore close-before-open` (whole-file: kills the blank-line-then-second-`//`-block park).
   Kills: M1 revert · M2 tense-only `said` patch · M3 RETRACTED decoy outside window · M4 marker deleted · M5 marker duplicated · M6 S4 pin dropped · M7 6-line paragraph · M8 3-of-4 files fixed.
   Not killed in-repo: M12 present-tense paraphrase without either needle — disclosed; ledger X2 hash-pin owns it. ARCHITECTURE.md deliberately NOT read from a client unit test — ledger X2 owns it.
3. `boxView.test.ts:287` title (`… "share ONE root" claim is a misstatement of the code`) — follow-up residual `R-rb-89-BOXTITLE`, not in scope (gating test id cited by name in focusTrap.ts:62, overlayA11y.ts:54, ARCHITECTURE.md:2094/2243/2299).

## C — Ledger X-gates (0 seeded SHALL; rb-84/88 shape)
X1 vitest JSON: 26 total, 0 failed/pending/todo, exactly 5 `rb-89-` titles · X2 line-neutrality: for each of the 4 views WHOLE-FILE line count == origin/master AND every line OUTSIDE the 5-line window byte-identical to origin/master (red-team 1: closes the "planted note after a blank line" bypass — no `//` line may appear anywhere else) + sha256 of the window == approved hash (one hash, four identical paragraphs) + ARCHITECTURE m23-s1 line: exactly one, master's line is a byte-PREFIX of it, the suffix == the approved bracket (sha256), and `git diff origin/master -- ARCHITECTURE.md` removes exactly one line · X3 harness-side mutant register on a scratch copy (M1-M12 + controls) · X4 `just ci` exit 0 · X5 touches ⊆ declared set.

## D — Anti-patterns
No new eval; no ADR; no `new RegExp`; no window-scoped negative needles; no whole-file negative on ARCHITECTURE.md; no marker rename; no 6th comment line or header insert in any view; no git checkout/stash on the worktree; no rewriting of :2094/:2243/:2299; do not "fix" boxView.test.ts:287.

## E — Risks
Paraphrase bypass M12 unclosable in-repo (hash-pinned in X2, disclosed) · it.each titles must keep `rb-89-` + filename literal · `:52-54` cite couples to overlayA11y.ts header line count (pre-existing coupling) · add node:fs/path/url imports at the top of overlayA11y.test.ts (biome merges same-specifier imports) · nightly a11y-e2e floor is a minimum.
