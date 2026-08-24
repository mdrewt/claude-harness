# m23-s2 — plan (M23 S2: static-shell ARIA literals, the live region, the first stylesheet)

Branch `slice/m23-s2`, worktree `.claude/worktrees/m23-s2`, from `origin/master` @ e664fa7.
`touches:` `client/index.html`, `client/src/styles.css` (new), `client/src/indexShell.test.ts` (EXTEND).
Companions: `ARCHITECTURE.md` (minimal). **No new ADR** — the supervisor assigned number is `None`
and ADR-0205 (m23-s0) already carries this design (D1/D2 static-shell focusability, the `#menu-rows`
landmine) as does spec §2.4/§2.7. Residuals are recorded in the PR body instead.

## Decisions (planner-reviewed)

- **D-a `<link rel="stylesheet" href="/src/styles.css" />` in `<head>`, NOT `import './styles.css'`.**
  The decisive and SUFFICIENT reason is that `client/src/main.ts` is S5's exclusive touch (spec §4)
  and no other `.ts` in this slice's `touches:` set could carry the import. (CORRECTED after plan
  review M1: an earlier draft claimed a CSS import would fail `client-typecheck` — false.
  `client/tsconfig.json:12` sets `"types": ["vite/client", "node"]` and `vite/client` ships
  `declare module '*.css'`, so it WOULD typecheck. Do not act on the old premise.) The `<link>`
  mirrors `index.html:127`'s `<script type="module">` form, already proven under vite dev
  (root=`client/`) and vite build. This is a durable cross-slice constraint on S9, which extends the
  same file — so it is recorded in `ARCHITECTURE.md`, not only in the PR body (review m7).
- **D-b `styles.css` ships `.sr-only` ONLY.** Spec §2.7 lists `:root` colour tokens and
  `@media (prefers-contrast: more)` as eventual contents — but spec §4's **S9 row already lists
  `styles.css` in its own `touches:`**, so S9 pays zero marginal cost and a stub here is a decoy
  (`overlayRegistry.ts:26`-`:30` A7/A15 zero-consumer rule). `.sr-only` itself is NOT a stub:
  `#a11y-live` consumes it in this same slice.
- **D-c No `aria-label` / `aria-labelledby` in the markup.** §2.8 (M24 seam) bans accessible-name
  literals outside `a11yCopy.ts`; and `aria-labelledby` is actively wrong — it WINS over `aria-label`,
  so it would kill S1/S3's runtime `aria-label = t(meta.labelKey)`, and eight of the eleven heading
  anchors are EMPTY in the markup so it would resolve to `""` (no name at all).
- **D-d The eleven shells get static `role="dialog"` + `aria-modal="true"`; nine anchors get
  `tabindex`** (`-1` on eight passive ones, `0` on `#menu-rows` per ADR-0205 D2's landmine; NONE on
  `#rename-input`/`#tradepropose-target`, which are natively focusable and whose tab order S3 must
  preserve).
- **D-c2 (review M3, now GATED not merely prose) the eleven roots carry NEITHER `aria-label` NOR
  `aria-labelledby`.** Prose is not an oracle: A3 asserts the absence of both attributes on the
  eleven derived roots, so the §2.8 M24-seam ban is mechanical.
- **D-e The shell set is DERIVED, not mapped.** Resolve each of the sixteen
  `OVERLAY_A11Y[id].initialFocusSelector` against `index.html`; the eleven that resolve ARE the static
  shells. No hand-kept `OverlayId -> element-id` map (ADR-0205 D1 forbids a second SSOT); the
  irregular ids (`pvpView`→`pvp-challenge-overlay`) are exactly why. Anchor -> root derivation
  (review m2, stated so it is not improvised): `anchor.closest('body > div')` — today every anchor is
  a direct child of its shell root, so the rule is exact.
- **D-f ONE rule walker, two consumers (review M2).** `findIdSelectors` and `srOnlyIsAccessible` layer
  on a single `parseCssRules` that emits style rules at EVERY brace depth. It (i) skips preludes
  beginning with `@` — that is what lets `@supports (color:#fff)` PASS — and (ii) is string-aware
  INSIDE preludes, not only inside declaration blocks — that is what lets `[href="#top"]` PASS. Those
  two shapes are the ones most likely to be "fixed" by weakening the scanner; A6a's GOOD half pins
  them. Hand-written walker only: a postcss/CSS-AST dependency would need an ADR and is refused.

## Acceptance

`memory/projects/gates/m23-s2.gates.md` — X1..X7, LINT-CLEAN. X1-X3 are a 1:1 transcription of
A11Y-10/11/12; X4 is ADR-0205 D1/D2's derived obligation; X5 is A11Y-13's static-shell half; X6 is the
load path; X7 is the regression floor over the pins this slice's markup edit can move.
Oracle is `client/src/indexShell.test.ts` (vitest), NOT `evals/a11y-static-shell.eval.mjs` — spec §4
gives that eval to **S10** and `evals/` is outside this slice's `touches:`.

## Task order (red -> green)

T1 RED: extend `indexShell.test.ts` (append-only; never touch an existing pin) with the six describe
blocks and both scanners + all BAD/GOOD fixtures. Expect A1/A2/A3/A4/A5/A8 + A6b/A7b RED, A6a/A7a
GREEN by construction (they are impl-independent fixture teeth — narrate this, it reads as vacuous
otherwise).
T2 GREEN: create `client/src/styles.css` -> A6b/A7b. Run `just lint` IMMEDIATELY (biome 2.5.1 lints
CSS and `biome.json:5` includes `**` with no CSS exclusion — the highest-probability surprise red).
T3 GREEN: `<link>` + `#a11y-live` -> A1/A2/A8.
T4 GREEN: 11 `role` + 11 `aria-modal` + 9 `tabindex` -> A3/A4/A5.
T5 COMMIT, then mutation bite-proofs M1..M14 reverting ONLY `client/index.html` /
`client/src/styles.css` (never a directory-wide `git checkout`).
T6 `just client-test`, `just lint`, `just client-typecheck`, then the single full `just ci`.
T7 the two ungated manual checks (`npx vite build`; dev-server `curl -sI /src/styles.css`).
T8 `ARCHITECTURE.md` minimal addition. T9 `mr-gates check`, commit, push, PR.

## Named anti-patterns

`css.includes('#')` (false RED on `color:#fff`) and its false-GREEN sibling `/^#/m`; `.sr-only`
with `display:none`/`visibility:hidden`; `clip` without `position:absolute` (clip only applies to
absolutely-positioned boxes, so the node stays fully visible while looking right); `aria-label`
literals; `aria-labelledby`; `tabindex="-1"` on `#menu-rows`; `tabindex="0"` on the eight passive
anchors (junk tab stops inside an open modal; `[A11Y-T5]` bans only `> 0` so nothing else catches it);
any `tabindex` on the two native controls; `import './styles.css'` from `main.ts`; ANY inline `style`
on `#a11y-live` (a `position:fixed` there reds `main.wiring.test.ts:4727`, outside `touches:`);
`aria-live="assertive"`; a scanner that `includes()` a copy of the shipped CSS blob; editing
`indexShell.test.ts`'s existing helpers or its `:19`-`:20` premise comment (append a correction block);
shipping a `.hp-fill` rule now (zero consumer, and a decoy that makes a later grep believe F1 closed).

## Declared residuals + known duplications

- **m3** A4's ratchet enumerates shells as `body > div[id$="-overlay"]` — the only mechanical
  enumeration available. A twelfth shell named WITHOUT that suffix escapes direction 1; direction 2
  (every `body > div` carrying a `role`) and S10's eval are the compensating controls.
- **m4** `[A11Y-07]`'s scanner will exist twice: here in `indexShell.test.ts` and again in S10's
  `evals/a11y-static-shell.eval.mjs` (a `.mjs` eval cannot import a `.ts` helper). Unavoidable given
  `touches:`. **S10 is the reconciliation owner.**
- **m1** the stale "there is no CSS file anywhere in this repo" premise is at FIVE sites, not two:
  `indexShell.test.ts:19`-`:20`, `:349`, `:509`, `:598`-`:600` (three of them inside assertion
  MESSAGES) and `main.wiring.test.ts:4656`. The appended correction block enumerates all five. No
  assertion breaks — the substance survives because A11Y-12 forbids id selectors.
- **m5** `client/tsconfig.json:15` excludes `**/*.test.ts`, so `just client-typecheck` gives the two
  new scanners ZERO type coverage; only biome and the vitest runtime see them.
- **m6** gitleaks and Semgrep are remote-only; the repo's first `.css` file and the CSS string
  fixtures inside `indexShell.test.ts` are scanned by nothing local. Budget for a post-push red.

## Flags (not this slice's work)

- **F1 spec gap** §2.5 puts the HP-bar reduced-motion guard "in the new stylesheet", but S7's
  `touches:` has no `styles.css`, the transition is INLINE (`battleView.ts:222` `cssText`) so no
  selector can reach it, and `hpFill` has no class. Unowned. Cheapest fix: S4/S8 sets
  `hpFill.className='hp-fill'` and drops the inline transition; S9 (already owns `styles.css`) adds
  the rule + the `@media` guard.
- **F2** ADR-0205:64 says "S2's `evals/a11y-static-shell.eval.mjs`"; spec §4 gives that eval to S10.
  Under the spec's (governing) reading, S2's own gate is tooth A5 in `indexShell.test.ts`.
- **F3** ADR-0205:276 says "the ten static-shell anchors"; D2's own table yields **eight** `-1`
  anchors + `#menu-rows` at `0` (rename/tradePropose are native). Off-by-one in prose only.
- **F4** `main.wiring.test.ts:4656` repeats "there is no CSS file anywhere in this repo" — false after
  this slice, true in substance (A11Y-12). Outside `touches:`; S5 also touches `index.html` and is the
  natural place to correct it.
- **F5** Spec A11Y-18's prose ("`DOM_SHELLS` in `evals/dom-shell-coverage-exclusion.eval.mjs`") does
  not match what that eval does — it reads `client/vite.config.ts` only and its `DOM_SHELLS` are
  `src/**.ts` paths, blind to `index.html`. For S10.
- **R1** the `<link>` shifts every `client/index.html` body line by 1, staling ADR-0205 D2's table
  citations, `a11yCopy.ts:67` and `main.wiring.test.ts:4654` — all comments, none gated.

## Verified NON-dependencies

`main.wiring.test.ts:4685` `W-ONE-CORNER-AFFORDANCE` — filter is over the INLINE `style` attribute;
`#a11y-live` ships with none, so it is excluded from the corner set, and `divs.length` 14->15 still
satisfies `>= 12`. `evals/dom-shell-coverage-exclusion.eval.mjs` reads `vite.config.ts` only.
`client/vite.config.ts` needs no edit (`include: ['src/**/*.ts']` never matches a `.css`).
