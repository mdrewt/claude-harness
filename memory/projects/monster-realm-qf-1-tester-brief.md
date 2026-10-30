# qf-1 tester brief

Write the RED gating tests for qf-1 in ONE file:
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/qf-1/client/src/ui/overlayA11yWiring.test.ts`
(the slice worktree — never the main checkout). Do NOT edit styles.css or any production file. The
orchestrator runs the tests (your Bash is static-only) — you may run `npx biome format`/`tsc`-style
static checks if your hook allows; otherwise just write carefully.

Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-pt3-quickfix.spec.md` § qf-1
(QF1.1, QF1.2, QF1.3). Plan: `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-qf-1-plan.md`
(read "Facts measured", "Design", "Tests" — and the REVIEW AMENDMENTS section if present).

## What to add (a new top-level `describe('qf-1 focus-ring policy', …)`)

Test names MUST start with these exact prefixes so ledger CHECKs can `-t` them:
`QF1-1-…` (QF1.1 teeth), `QF1-2-…` (QF1.2 teeth), `QF1-SANITY-…` (stylesheet-loaded control).
Use prefix-free ids (no id may be a prefix of another — e.g. not `QF1-1` and `QF1-10`).

1. Install the REAL `client/src/styles.css` text into `document.head` as a `<style>` element
   (read with readFileSync, path resolved like INDEX_HTML_PATH), after `adoptRealIndexHtml()`;
   remove it in afterEach. Do not text-scan the CSS — the oracle is happy-dom's computed style.
2. QF1-SANITY: a probe `.mr-nav-row > .mr-nav-item.is-active` appended to the document computes
   `outlineStyle === 'solid'` — proves the sheet parsed (anti-vacuity for every other tooth).
3. QF1-1: open each OverlayId via the existing `OPENERS`, flush one macrotask, assert the anchor
   (`root.querySelector(OVERLAY_A11Y[id].initialFocusSelector)`) is `document.activeElement`, then
   classify its LIVE state: `tabindex === '-1'` and role ∉ {listbox, grid} ⇒ "heading anchor" ⇒
   `getComputedStyle(anchor).outlineStyle === 'none'`. Pin the exact heading-class id roster
   (measure it from the code; it must include `boxView` and `raisingView`) and its count, so a
   reclassification reds.
4. QF1-2: anchors with role listbox/grid (pin that roster too; it must include `menuView` via
   `#menu-rows`) compute a ring: outlineStyle ∉ {'', 'none', 'auto', 'hidden'}, parseFloat(outlineWidth) ≥ 2,
   AND outlineStyle differs from the is-active probe's outlineStyle (visually distinct, QF1.2).
   Also build a list container AND a grid container with the real `renderNav` (ui/navRender.ts)
   inside a `role="dialog"` wrapper, focus each, assert the same ring — the "sibling listbox
   anchors" clause, covering containers that are not initialFocusSelector anchors.
5. Scope teeth (put under QF1-1-…): a focused native `<button>` inside a dialog, and a
   `tabindex="0"` element with no listbox/grid role, must NOT compute `outlineStyle === 'none'`
   (kills blanket `*:focus{outline:none}` / `[tabindex]:focus{outline:none}`). Native-control
   anchors (`#rename-input`, `#claim-signin-btn`, `#privacy-close-btn`, `#tradepropose-target`) likewise
   must not compute `'none'`.
6. Totality: the three classes (heading / nav / native) partition all OVERLAY_IDS; assert the
   sum equals OVERLAY_IDS.length and an unclassified anchor throws.

## Hazards (measured)

- happy-dom has NO UA focus ring: an unstyled focused element computes `outlineStyle === ''`, explicit
  `outline:none` computes `'none'`. That difference IS the QF1.1 oracle.
- happy-dom CACHES computed style per element and a focus change does NOT invalidate it. NEVER call
  getComputedStyle on an element before it is focused in the same test; read it once, after focus.
- happy-dom matches `:focus-visible` on every focus (it cannot distinguish it from `:focus`).
- The file deliberately strips the `<link rel=stylesheet>` before parsing index.html; keep that,
  and correct the now-false comment near `adoptRealIndexHtml` ("Nothing in this spec reads computed
  style") — that is the ONLY edit allowed to existing teeth (QF1.3: existing S10 teeth unchanged).
- Reuse the file's existing helpers (OPENERS, flushMacrotask, sentinel pattern); do not duplicate them.
- Biome formats this repo (`npx --prefix client biome check`); match the file's comment density
  (WRONG IMPL KILLED notes per tooth are the house style).

Each tooth's comment should name the wrong implementation it kills. Report back: the test names
added, the measured rosters, and which teeth you expect to be RED on the unmodified styles.css
(QF1-1 heading teeth and QF1-2 ring teeth should be red; QF1-SANITY and the scope teeth green).
