# rb-130 plan (v1.2) — exemptCallOpenAt rejects member/private/identifier-glued t(/tf(

Residual R-m24-s4-RT1. Worktree `projects/monster-realm/.claude/worktrees/rb-130`, branch
`fix/rb-130-private-t-reject`. Touches: client/src/ui/i18n/hardcodedStrings.ts (+ its .test.ts).
No ADR (none assigned; single-function fail-safe tightening, no new surface). Tier: SIMPLE.

## Code change (hardcodedStrings.ts `exemptCallOpenAt`, :413-426)
Local "before" check only — do NOT touch shared `isIdentifierChar` (also gates
`callTokenBoundaryAt` for replaceChildren(/setAttribute( boundaries).
1. EARS: reject `before === '#'` (`this.#t('raw')`, `obj?.#tf(...)`).
2. Same defect class, same clause: reject `before.charCodeAt(0) > 127` (non-ASCII identifier
   char, `ét('Raw')` — isIdentifierChar is ASCII-only).
3. Same defect class: skip whitespace BACKWARD from i-1; if the first non-whitespace char is `.`,
   reject (`obj. t('Raw')`, `obj.\n  t('Raw')`, `obj?. t(`). Identifier-then-whitespace
   (`return t(`) stays exempt. Source is already comment-stripped, so no comment case.
   (Planner proposed parking 3 as a residual; orchestrator overrode: ~3 lines in the same fn,
   fail-safe direction, zero real-source hits — cheaper than a separate slice.)
Update the Plan R3 doc comment to state the widened rule.

Real-tree risk: `grep -Pz '\.\s+tf?\('` and `[#\x80-\xff]tf?\(` over non-test client/src → 0 hits,
so I18N-18/18x's exact HARDCODED_CEILING does not move.

## Tests (tester, hardcodedStrings.test.ts) — one new `it('rb130 …')` in the existing describe
Named consts, String.indexOf only, no regex. Each fixture pins {sinks, failing} + segments:
- `el.textContent = this.#t('raw English');` → {1,1} ['raw English']  (RED at HEAD)
- `el.textContent = this.#tf('raw English', { n });` → {1,1}          (RED at HEAD)
- non-ASCII: built with String.fromCharCode(0xe9) + `t('Raw')` → {1,1} ['Raw'] (RED)
- `el.textContent = obj. t('Raw');` and `obj.\n  t('Raw')` → {1,1} ['Raw'] (RED)
- Controls, still exempt {1,0}: `${t('a')}`, `wrap(t('a'))`, `c ? t('a') : t('b')`,
  `list.replaceChildren(x,t('a'))`, `!t('a')` on a sink RHS, `return t('a')` in an arrow block on
  a sink RHS (identifier-then-whitespace stays exempt), `x ?? t('a')`.
Do NOT pin any buggy shape as exempt.

## Gate
X1 (run-authored; ledger seeded 0 criteria): probe `memory/projects/gates/rb-130.gates.mjs x1` —
(a) production oracle: esbuild-transform the live hardcodedStrings.ts to a tmp .mjs, call
scanSource on the RED fixtures + controls directly (independent of the test file's content);
(b) whole-file vitest JSON: exit 0, success, 0 failed/pending/todo, rb130 title passed exactly once.

## v1.2 — after plan lenses (reviewer: no blockers; red-team: 1 HIGH in-class)
Red-team HIGH: `obj.\u00A0 t('Raw')` (NBSP then ASCII space) — ASCII-only whitespace skip stops at
the NBSP, never sees the `.`. Final rule (simplest form covering all in-class shapes):
  1. immediate before char is an ASCII identifier char → reject (unchanged: `at(`, `ét`? no — see 2);
  2. skip ASCII whitespace backward; the first other char `prev` — reject if `.`, `#`, or
     charCode > 127 (fail closed on any non-ASCII in the gap: NBSP/Zs spaces, `ét(`).
  `return t(` / `await t(` stay exempt (prev is an ASCII identifier char after a gap).
Out-of-class, documented not fixed (need scope analysis, not lexing): a locally shadowed `t`
(`const t = (s) => s`), `new t(` / `typeof t(` keyword-prefixed calls. DEL (0x7f) is not valid
source (esbuild rejects), so `> 127` is sufficient.
Gate oracle grows to 16: + `nbsp-gap` MUST_FAIL, + `keyword-gap` (`await t('a')`) MUST_PASS.
Tests add the NBSP-gap fixture and an `await t(` / `return`-style control.
