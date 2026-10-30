# ctl-7a plan — `#game-screen`, frame contrast, Start/Select chips

Worktree: projects/monster-realm/.claude/worktrees/ctl-7a (branch feat/ctl-7a from 8e4d49b7).

## Verified facts (scope check)
- `render/world.ts:72` appends the innerWidth x innerHeight canvas to `#app`; main.ts:2912 null-tolerant mount.
- Nine shells (dialogue, quest-log, heal, shop, trade, pvp-challenge, leaderboard, rename, tradepropose)
  are in-flow `<body>` children with only `display:none`. Views show them with `display=''` or `'block'`.
- `#help-overlay` / `#menu-overlay`: inline `position:fixed;inset:0;z-index:120;…`. #menu-overlay hosts
  the ui/frame.ts `.mr-frame` (side frame) — menuView.ts:35 `rows.closest('.mr-frame')` + `overlay.contains`
  means **#menu-overlay must NOT itself carry `.mr-frame`** (closest() would return the overlay).
- `.mr-frame` already exists in styles.css (ctl-4 frame chrome, colours #1e1e2e/#e0e0e0, "high-contrast
  frame tokens belong to ctl-7a").
- `#interact-prompt` (main.ts:3042) and `#privacy-countdown` (main.ts:3064) are runtime-built, inline-styled,
  appended to `<body>`.
- `W-ONE-CORNER-AFFORDANCE` no longer exists (main.wiring.test.ts deleted); nothing to rewrite —
  menuView.test.ts only uses `help-hint` as a fixture id (:90, :573). Those references are cleaned.
- Hidden-ish dependency, resolved in-scope: SIX more `main.*.test.ts` files (controls, dialogueDismiss,
  dispatch, input, menu, feedbackCore) assert `body.children.length > 5` on the real index.html. They are
  sibling test files of main.ts (declared) → touches-delta, one-line fixture anti-vacuity change each.
- Stale comments outside touches (evolutionNotice.ts:17, evolutionNotice.test.ts:578, privacyView.ts:99,
  battleView.test.ts:1437) mention #help-hint → follow-up flag, not edited.

## Design
index.html body:
```
<div id="game-screen" class="mr-game-screen">
  <div id="app"></div>                                   (unchanged id; canvas mount + JS views)
  <div id="frame-layer" class="mr-frame-layer">
    nine shells: class="mr-frame mr-shell"  style="display:none"   (ids/testids unchanged)
    #help-overlay: class="mr-frame mr-shell mr-shell--top" style="display:none"
    #menu-overlay: class="mr-shell mr-shell--top mr-shell--scrim" style="display:none" (inner frame.ts .mr-frame)
  </div>
  <div id="hint-bar" class="mr-hint-bar">
    <button id="chip-start"  class="mr-chip" type="button" data-button="Start"  data-menu-launcher></button>
    <button id="chip-select" class="mr-chip" type="button" data-button="Select" data-help-launcher></button>
  </div>
</div>
#build-stamp (unchanged), #a11y-live (unchanged), script
```
- `#game-screen`: `position:relative; height:100vh; overflow:hidden` — NOT fixed (fixed always makes a
  stacking context, which would sink menu/help z 120 under body-level banners z 45-60 and the
  battle-root ordering E0 pins). relative + z-index:auto makes no stacking context.
- `.mr-frame-layer`: `position:absolute; inset:0; pointer-events:none` (no z-index → no stacking context).
- `.mr-shell`: `position:absolute; top/left/right:8px; bottom:<hint-bar height>; overflow:auto; z-index:100;
  pointer-events:auto`. `.mr-shell--top`: z-index 120 (menu/help over battle 110, unchanged order).
- Frame tokens: new `:root { --mr-frame-bg; --mr-frame-fg; --mr-frame-border }` placed BEFORE the evo block
  (evo :root + prefers-contrast must stay single/last). `.mr-frame` reads them; `color-scheme: dark` on
  `.mr-frame` so UA buttons/inputs inside shells render light-on-dark (no element selectors).
- Chips: text = `t('chrome.chip.menu')` / `t('chrome.chip.help')` written by main.ts at boot (null-tolerant);
  `::before content: attr(data-button) / ""` shows Start/Select silently. Click: delegated listener —
  `[data-menu-launcher]` keeps its branch (held.clear + openMenu); new `[data-help-launcher]` branch:
  `overlayVerdict('helpView')==='allow' && identity!==''` → held.clear(); openHelp().
- `#interact-prompt` / `#privacy-countdown`: class `mr-frame mr-frame--prompt` / `mr-frame mr-frame--banner`,
  appended into `#frame-layer` (fallback body when absent: shell-less boot tests), colour/background/font
  inline styles removed (class-styled), positional inline (left/top/display) kept.
- Catalog: delete `chrome.helpHint` (+ pins); add `chrome.chip.menu` (en Menu / fr Menu), `chrome.chip.help`
  (en Help / fr Aide).
- index.html header comment: drop the main.wiring.test.ts citation (B16).
- a11y.spec.ts: re-baseline PASSES_FLOOR_WORLD / INCOMPLETE_CEILING_WORLD by name; keyboard pass Tabs to
  `#chip-start`; new CTL7A e2e (no-scroll with a frame open; frame bbox in viewport; text contrast ≥4.5
  computed; menu active-row non-colour mark).

## Gate CHECK strategy
Vitest JSON tag-count CHECKs (house pattern from ctl-5/6c) over indexShell.smoke.test.ts (structure,
tokens contrast parsed from styles.css), main.a11yFocus.test.ts (chips boot/click), catalog tests.
The a11y.spec.ts e2e is supplementary browser evidence, run once locally with a live server.
