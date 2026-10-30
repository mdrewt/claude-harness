# qf-1 plan — focus-ring policy (QF1.1-QF1.3)

Worktree: `projects/monster-realm/.claude/worktrees/qf-1` (branch `qf-1`, from origin/master f7f2a531).
Touches: client/src/styles.css, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts,
client/src/ui/overlayA11yWiring.test.ts. FEATHER — pure presentation; no TS behaviour changes.

## Facts measured

- `styles.css` has zero `:focus`/`:focus-visible` rules; the only outline is `.mr-nav-item.is-active`
  (2px solid var(--mr-frame-bg), offset -4px; 3px inside `.mr-nav-row`).
- Anchors (OVERLAY_A11Y.initialFocusSelector, 18 ids) fall in three classes at runtime:
  1. non-interactive heading/status anchors, `tabindex="-1"` (index.html statics + boxView/raisingView/
     battleView/evolutionView titles set in TS);
  2. nav containers — `renderNav` writes `role="listbox"|"grid"` + `tabindex="0"` (`#menu-rows`,
     `#controls-rows`, `#heal-list` after render); `#quest-log-list` is role=listbox with tabindex=-1
     (questLogView);
  3. native controls (`#rename-input`, `#tradepropose-target`, `#claim-signin-btn`, `#privacy-close-btn`).
- Non-anchor `tabindex="-1"` nodes: tradeProposeView `#monsters` / `#review` (programmatic-focus wizard
  panes, non-interactive by their own comment — "Yes / No are marks, not buttons").
- happy-dom 20.14.6 computes `:focus` / `:focus-visible` rules from an injected `<style>` (PoC in
  /tmp/tmp.cHLd6k6P9v). `outline:none` computes `outlineStyle === 'none'`; an UNSTYLED element computes
  `''` (happy-dom has no UA focus ring), so `'none'` discriminates explicit suppression from nothing.
  HAZARD: happy-dom caches computed style per element and a focus change does NOT invalidate it —
  call getComputedStyle on an element only AFTER it is focused, never before.
- happy-dom matches `:focus-visible` on every focus, so the unit tier cannot tell `:focus` from
  `:focus-visible`; QF1.2's EARS says "WHEN … receives focus", so the ring keys on `:focus`.

## Design (functional core: n/a; the whole change is one CSS block)

Append to styles.css after the `.mr-nav-item` block:

```css
/* Focus policy (qf-1). … */
:where([tabindex="-1"]):focus { outline: none; }               /* QF1.1: programmatic-only anchors */
[role="listbox"]:focus, [role="grid"]:focus {                  /* QF1.2: the nav-kit tab stop */
  outline: 2px dashed var(--mr-frame-fg);
  outline-offset: -2px;
}
```

- `:where()` drops the suppression to (0,1,0) so the (0,2,0) ring wins on a `tabindex=-1` listbox
  (`#quest-log-list`) regardless of source order.
- Distinct from `.mr-nav-item.is-active` (filled row + inset SOLID frame-bg outline): the container
  ring is DASHED, fg-coloured, around the whole list.
- Native controls and the canvas `role=application tabindex=0` keep the UA ring (no rule matches).
- No new token, no TS change, no anchor/tabindex change → QF1.3 holds by construction.
- overlayRegistry.ts: at most a one-line comment pointer in the `initialFocusSelector` doc block that
  the anchor's paint policy lives in styles.css (qf-1). No code change.

## Tests (tester; overlayA11yWiring.test.ts — the cross-view file that already adopts real index.html)

New `describe('qf-1 focus-ring policy')`, installing the REAL `client/src/styles.css` text as a `<style>`
in document.head (removed after each), opening every OverlayId through the existing OPENERS:

- QF1-CSS-SANITY: a probe `.mr-nav-row > .mr-nav-item.is-active` computes outline `solid` (sheet parsed).
- QF1.1: every anchor whose live state is `tabindex="-1"` and role ∉ {listbox, grid} computes
  `outlineStyle === 'none'` when focused. Roster pinned exactly (ids + count) from the live classification;
  includes boxView + raisingView titles explicitly.
- QF1.2: every anchor with role listbox/grid computes a thick (≥2px) non-none/auto/hidden outline whose
  style differs from the is-active probe's; plus renderNav-built list AND grid containers (not anchors)
  get the same ring (the "sibling listbox anchors").
- Scope teeth: a focused native `<button>` inside a dialog and a `tabindex="0"` non-listbox element do NOT
  compute `outlineStyle === 'none'` (kills `*:focus{outline:none}`-style blanket suppression).
- QF1.3: existing S10 teeth unchanged; only the stale `:166` comment ("Nothing in this spec reads
  computed style") is corrected.

## Ledger CHECKs (filled after tests exist; counts pinned)

vitest runs of the named `-t` prefixes in overlayA11yWiring.test.ts with a pinned passed/skipped count;
QF1.3 = full overlayA11yWiring + overlayRegistry + focusTrap + overlayA11y + liveRegion + announcements
files with pinned count + `git diff` of OVERLAY_A11Y block empty.

## Anti-patterns avoided

Text-scanning styles.css (comment/decoy forgeable); a CSS roster of anchor ids (drift); `:focus-visible`
only (unit tier blind to it, and EARS says on focus); removing tabindex (breaks the trap).

## REVIEW AMENDMENTS (reviewer + red-team, 2026-10-25) — these override the sections above

- RING COLOUR: an fg-coloured ring vanishes over the fg-filled `.is-active` row (both lenses). Ring is
  `outline: 2px dashed #cc5500; outline-offset: -2px;` — a literal (one consumer, no token: a token
  nothing else reads is the decoy class evolutionView.test polices for --mr-evo-*). #cc5500 has
  3.80:1 vs --mr-frame-bg #1e1e2e and 3.27:1 vs --mr-frame-fg #e0e0e0 (measured; #e05a00 was 2.82:1 vs fg — the tooth caught it), so WCAG 1.4.11 (3:1)
  holds whether the ring lands on the frame background or on the active-row fill.
- Teeth must pin colour + geometry, not just style: ring outlineColor has ≥3:1 contrast against BOTH
  the is-active probe's computed backgroundColor (fg) and its outlineColor (bg); outlineOffset ≤ 0
  (a positive offset is clipped by `.mr-shell { overflow:hidden }`); width ≥ 2px; style dashed ≠ the
  probe's solid.
- QF1.1 tooth enumerates EVERY `[tabindex="-1"]` element in the document after opening all overlays
  (covers tradePropose `#monsters`/`#review`, not just anchors); each non-listbox/grid one computes
  `none`. Add: no `[tabindex="-1"]` element carries an interactive role other than listbox/grid
  (option/button/checkbox/menuitem/tab/link/textbox…), so the blanket suppression never strips an
  interactive cue.
- QF1.2 tooth enumerates EVERY `[role="listbox"],[role="grid"]` in the document after opening all
  overlays (covers #leaderboard-list etc.), plus one synthetic `role="grid" tabindex="0"`.
- Scope teeth iterate all four native anchors + a synthetic `<button>` + a synthetic
  `role="application" tabindex="0"` (the canvas shape) — none may compute `none`.
- Rosters: assert must-include members (boxView, raisingView heading; menuView listbox) rather than
  an exact id list (reviewer: over-built); keep the 3-class partition totality.
- styles.css header line 5 ("CLASS and :root SELECTORS ONLY") becomes line-neutral wording that
  allows attribute selectors (the sheet already has `[data-feedback]`); no `#id`. Line count of the
  header must not change (other files cite styles.css line ranges).
- CSS comment: no quotes/apostrophes (comment-stripper hazard). Append point: after the
  `.mr-nav-item` block, NOT at EOF (prefers-contrast block must stay last).
- `:where()` kept, with a one-line reason (specificity, so source order is not load-bearing).
- overlayRegistry.ts: no change. Fix the wiring test comment's file name to indexShell.smoke.test.ts.
- Accepted (PR risks): `:focus` also rings on mouse focus of a listbox; an empty list collapses the
  ring; the canvas keeps the UA ring; the unit tier cannot catch a selector a browser drops but
  happy-dom accepts — mitigated by a one-off real-Chromium probe in a sandbox (evidence, not a gate)
  and a follow-up flag for an e2e tooth (client/e2e/a11y.spec.ts is outside touches).
