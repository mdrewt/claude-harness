# m23-s9 — plan of record (M23 S9: contrast remediation + text scaling + em/px normalisation, evolutionView)

Worktree `.claude/worktrees/m23-s9`, branch `feat/m23-s9-evolution-contrast`, from origin/master@c8321bb.
ADR: supervisor assigned **None**. Planner recommends ONE new ADR; doc-keeper takes the next free
number (0253 candidate, 0252 highest on disk 2026-09-18) and the PR body FLAGS it as self-assigned.

## Ground truth (measured, not assumed)
- `evals/contrast-ratio.eval.mjs` + `evals/baselines/contrast-unresolved.json` (spec §5.3) do NOT exist —
  S10 DEFERred them (ledger X16) and ADR-0224 bans new evals. A11Y-30/31 are met here as ORDINARY vitest
  DOM oracles in `client/src/ui/evolutionView.test.ts` (S8 precedent: `battleView.test.ts:3247`).
- `evolutionView.ts` today: root `background:rgba(0,0,0,0.8)` (translucent → worst-case backdrop `#333`
  over white), `em` font sizes (0.85/0.8/0.75em, no root font-size), hex literals inline. Hand-computed
  WCAG failures: `#666` on card `#1e1e2e` = 2.86:1; `#666` on root worst-case `#333` = 2.2:1;
  `#fff` on `#059669` (Evolve button, 13.6px normal) = 3.77:1. Everything else ≥ 5.4:1.
- happy-dom preserves `var(--x)` in inline `cssText` and reads it back via the LONGHAND
  (`style.backgroundColor`, `style.color`); the `background` SHORTHAND does NOT populate
  `backgroundColor`. `rgba(0,0,0,0.8)` reads back re-spaced `rgba(0, 0, 0, 0.8)`. UA defaults (h2 size,
  bold) are NOT modelled: `getComputedStyle(h2).fontSize === '16px'`.
- `evals/reduced-motion-purity.eval.mjs:731-738` GOOD fixture e8 = `:root{--mr-fg:#fff}@media
  (prefers-contrast: more){:root{--mr-fg:#000}}` — "S9's own declared future edit". Custom properties are
  banned ONLY inside motion-scoped at-rules and inside the `.hp-fill` rules (hp-bar eval C6).
- `evals/a11y-static-shell.eval.mjs` exports `stripCssComments` / `parseCssRules` (sole owner per
  ADR-0215/rb-15); `indexShell.test.ts:89,94` already imports them from a `.ts` test.
- `client/index.html:5` viewport = `width=device-width, initial-scale=1` — no zoom block. NO EDIT needed.

## Design (D1–D3) — AMENDED after the reviewer + red-team plan lenses (2026-09-18)
D1 `styles.css`: append `:root { --mr-evo-* }` colour tokens (9) + `@media (prefers-contrast: more)
   { :root { … } }`. Override tier = AAA (≥7:1 text) with an OPAQUE backdrop. New comments must NOT
   mention `.hp-fill` (hp-bar eval F26). Header bullets `styles.css:21-24` become "PRESENT since S9".
D2 `evolutionView.ts`: EVERY text `color` and every tokenised surface consumes a token as inline
   `var(--mr-evo-*)` in the existing `cssText` idiom — `background-color` LONGHAND only (happy-dom reads
   `var()` back through the longhand; the shorthand is a measured blind spot). `em`→`px`: 0.85em→14px,
   0.8em→13px, 0.75em→12px. Borders (`border`, `border-left`) use tokens too (`--mr-evo-border` /
   `--mr-evo-ok`) so a high-contrast user keeps the card boundary (reviewer m4).
D3 Tests (tester, red-first, titles `m23s9 X1..X4 …`): module-local `s9Rgb/s9Luminance/s9Contrast` with
   `rgba()` alpha compositing over BOTH `#fff` and `#000`; walker = EVERY element under the root that has
   a direct non-blank text node (never `children.length===0`); `color` via ancestor walk; background =
   nearest ancestor `background-color` stack composited until opaque. Threshold = **4.5:1 for EVERY pair
   in default scope** (the 3:1 large-text tier is DROPPED — WCAG "large" is 24px / 18.67px-bold and
   nothing here qualifies), **7:1 in the more scope**, more ≥ default per pair. Scopes resolved with
   `parseCssStyleRules` + `atStack` + `normaliseMediaPrelude` imported from
   `evals/reduced-motion-hp-bar.eval.mjs` (exported; module has no import-time side effects) — NO text
   slicing. `stripCssComments` from the same module (the header comment already contains the substring
   `@media (prefers-contrast: more)` once — a raw census is a decoy trap).
   Preconditions folded into X1 (not separate gates, per ADR-0224): alpha composite
   `rgba(0,0,0,0.8)`+white = `#333`; hostile GOOD pair (`#2a3a2a` bg) passes; spec §5.3 BAD `#777`/`#0b0d12`
   fails; reader THROWS on empty/`var(--x, #fb)`/named/`hsl()`/`color-mix()`/8-digit hex/alpha>1.

Token table (default → prefers-contrast:more) — 9 tokens, every one consumed by an EVALUATED pair or the
border assertion; `#999`/`--mr-evo-faint` DROPPED (4.43:1 on `#333`, reviewer M1); `--mr-evo-title` DROPPED
(decoy; title uses `--mr-evo-fg`); `--mr-evo-gate-met` MERGED into `--mr-evo-ok`:
`--mr-evo-backdrop rgba(0,0,0,0.8)→#000` · `--mr-evo-card #1e1e2e→#101018` · `--mr-evo-row #181826→#000` ·
`--mr-evo-fg #e0e0e0→#fff` (title, name, prompt, unmet heading, button text) ·
`--mr-evo-muted #aaa→#ddd` (hint, stats, both empties, unmet gate) · `--mr-evo-ok #34d399→#6ee7b7` ·
`--mr-evo-warn #f59e0b→#fcd34d` · `--mr-evo-button #065f46→#022c22` (fg on it: 5.82 default / 15.0 more) ·
`--mr-evo-border #333→#bbb` (card border + unmet border-left; the met border-left is `--mr-evo-ok`).
Default-scope matrix (all ≥4.5): fg/backdrop#333 9.57 · muted/#333 5.44 · fg/card 12.4 · muted/card 7.06 ·
ok/card 8.5 · ok/row 8.95 · fg/row 13.0 · warn/row 8.0 · muted/row 7.4 · fg/button 5.82.

Extra assertions the red-team demanded (all adopted): style-declaration ALLOW-LIST over every element in
the subtree (kills `opacity`/`filter`/`mix-blend-mode`/`text-shadow`/`-webkit-text-fill-color`/
`background-image`/bare `background`/`font` shorthand/`zoom`/`transform`) · shorthand/longhand coherence
(`getAttribute('style')` names `background-color` ⇔ `style.backgroundColor !== ''`) · every walked
`style.color` and non-empty `style.backgroundColor` `startsWith('var(--mr-evo-')` · per-state
`data-testid`/literal-text census + `expect(pairs.length).toBe(N)` · consumption = membership in an
evaluated pair (border token: a dedicated assertion — resolves to a parseable colour in BOTH scopes, and ≥3:1 vs
card AND backdrop in the MORE scope only; default `#333` is 1.3:1 and 1.4.11 is out of scope per §3.1) ·
each `--mr-evo-*` declared EXACTLY once per scope, same name SET in both, no other at-rule declares one ·
containers (root/list/card/row/picker) declare NO `font-size` · `@media (prefers-contrast: more)` census on
STRIPPED text = 1 (a comment-only mention → 0 → loud RED).

## Steps
0 spike (DONE, above) · 1 tester writes T1–T5 red · 2 reviewer+red-team on the tests · 3 implement
styles.css + evolutionView.ts red→green · 4 reviewer + /simplify + red-team + verifier · 5 doc-keeper
(ADR 0253 self-assigned+flagged, `Subsystems: client-ui`, records the §5.3 deviation — inline `var()` is not
hex-literal-extractable — and the AAA policy; ARCHITECTURE.md:2002 + :2011-2013; styles.css header) · 6 `just ci` once · 7 `mr-gates check` · 8 PR.

## Anti-patterns named
decoy tokens · self-source needles / presence-only pins (oracle = rendered DOM + arithmetic) · fixture
monoculture (4 states × 2 backdrops × 2 scopes) · first-hit anchors (exactly-once census) · count-only
gates · coarse mutants (one `expect` per pair, pair named in the message) · NaN-passing negations
(`toBeGreaterThanOrEqual`, never `not.toBeLessThan`) · `new RegExp`.

## Boyscout candidates (list only; ≤40 lines cap)
`evolutionView.test.ts:85` stale `evolutionView.ts:70-72` citation → cite `show()` by symbol ·
`evolutionView.test.ts:41-48` historical RED REASON → "(historical — resolved)" prefix.
Outside touches (flag only): `client/vite.config.ts:105` says "evolution/fusion screen" — fusion retired.
