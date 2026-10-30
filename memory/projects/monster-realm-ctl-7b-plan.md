# ctl-7b plan — battle, box, raising, evolution as class-styled `.mr-frame` under `#game-screen`

Worktree `projects/monster-realm/.claude/worktrees/ctl-7b` (branch ctl-7b, from origin/master 8fc9e14b).
Gate: CTL7B.1 (one seeded). Residual fold-in: R-ci-fix-20261002T0901Z-RAISINGVIEWREBUILD (HIGH).

## Facts measured before planning

- The four roots are built in their constructors with inline
  `position:fixed;inset:0;z-index:100|110;background:rgba(0,0,0,.75|.85|var(--mr-evo-backdrop))`
  and appended to the `parent` main.ts passes: `#app` (main.ts:2916-2948).
- `#app` is ALREADY a child of `#game-screen` (index.html:19-20, ctl-7a), and it is unpositioned, so
  an absolutely-positioned child's containing block is `#game-screen` (`position:relative`, 100dvh).
- HIDDEN-DEPENDENCY TRAP AVOIDED: `e2e/pvp.spec.ts:115,147` and `e2e/trade.spec.ts:131` detect the open
  box as `#app > div` with inline `style.display === 'flex'`. Re-parenting to `#frame-layer` would
  break (or vacuously pass) those out-of-touches specs. So the mount STAYS `#app`; main.ts needs no
  edit. The inline `display` toggle (`none` / `flex`) stays — it is the visibility contract.
- `e2e/encounter-battle.spec.ts:330-337` (E0, out of touches) pins the battle root, `#menu-overlay`
  and `#help-overlay` as computed `position: fixed`, with menu/help z strictly above battle.
- `indexShell.smoke.test.ts` CTL7A-2-FRAME-IN-VIEWPORT-CSS (out of touches): a `.mr-shell--*`
  modifier may only set position `absolute` (only `--top` may set `fixed`) and may never override
  an inset or overflow. A modifier setting ONLY `z-index` is legal.
- `evolutionView.test.ts` bans any `class`/`id` on every element of the view and measures inline
  `--mr-evo-*` colours (backdrop composited over white AND black). Its colours are tokens with a
  `prefers-contrast: more` override.
- `evolutionNotice.ts` (R-ctl-7a-EVONOTICEUNDERSHELL) styles itself inline (z 60) and is out of
  touches — that residual is NOT foldable here.

## Design (imperative shell only; no game logic, no schema, no netcode)

1. Box, raising: root `className = 'mr-frame mr-shell'`; root inline style reduced to the
   visibility contract plus layout that the classes do not give (`display:none` and
   `align-items:center`). No inline position/inset/z-index/background/color: `.mr-shell` places the
   box inside the screen (insets 8/8/40/8, overflow auto, z 100), `.mr-frame` paints the opaque
   `--mr-frame-bg` / `--mr-frame-fg` tokens (12.6:1).
2. Battle: root `className = 'mr-frame mr-shell mr-shell--top mr-shell--battle'`. `--top` gives the
   E0-required `position:fixed` (same insets, still inside the viewport); a NEW
   `.mr-shell--battle { z-index: 110; }` declared AFTER `.mr-shell--top` keeps it under the menu/help
   (120) and above the other shells (100). Inline keeps `display` and the centring
   (`justify-content:center;align-items:center`), nothing else.
3. Evolution: root `className = 'mr-frame mr-shell'`; inline drops position/inset/z-index (and the
   padding/overflow/font the shell gives) but KEEPS `background-color:var(--mr-evo-backdrop)` and
   `color:var(--mr-evo-fg)` — the evo tokens are the only route the `prefers-contrast: more`
   override has, and the suite measures them. The root is the ONE element allowed a class; no id
   anywhere still holds.
4. Contrast inside the frames: the dimmed empties (`opacity:0.4` in boxView/raisingView, and any
   other opacity dimming of text) are replaced by a muted colour ≥ 4.5:1 on `--mr-frame-bg`
   (opacity is invisible to a colour-only oracle and composites below AA). Other inline literals
   stay if Chromium measures them ≥ 4.5:1.
5. styles.css: add `.mr-shell--battle` (z-index only) after `.mr-shell--top`, with a comment; update
   the header/`#game-screen` comments that say "the battle overlay's 110" to name the class.
6. RAISINGVIEWREBUILD: `RaisingView.refresh` re-renders `#monsterEl` only when a JSON render key of
   everything `#renderMonsters` reads (monsters, the train-capable items, and the resolved Care /
   Train strings so a locale switch still re-renders) changed; same for `#inventoryEl` with items.
   `hide()` forgets both keys (the reopen's refresh rebuilds); a render that throws leaves no key.
   Pattern: `pvpView.ts` `#renderIfChanged` (ci-fix-20261002T0901Z). Locks unchanged — nodes
   survive, so the live-node release already re-enables the right buttons.

## Tests (tester writes; orchestrator proves red)

Unit (vitest, happy-dom), tags exactly-once:
- `CTL7B-1-BATTLE-FRAME` (battleView.test.ts): the root carries `mr-frame`, `mr-shell`,
  `mr-shell--top`, `mr-shell--battle`; its inline style sets no position/inset/top/right/bottom/
  left/z-index/background/background-color/color; shown → `display` is `flex`, hidden → `none`.
- `CTL7B-1-BATTLE-LAYER-CSS` (battleView.test.ts, parses styles.css): `.mr-shell--battle` exists, sets
  only `z-index`, its value is > `.mr-shell`'s and < `.mr-shell--top`'s, and it is declared after
  `.mr-shell--top` (so the cascade keeps 110 for a root carrying both).
- `CTL7B-1-BOX-FRAME` (boxView.test.ts), `CTL7B-1-RAISING-FRAME` (raisingView.test.ts): classes
  `mr-frame` + `mr-shell`, no `--top`; same inline ban; display toggle.
- `CTL7B-1-EVOLUTION-FRAME` (evolutionView.test.ts): classes `mr-frame` + `mr-shell`; no inline
  position/inset/z-index; root is the only element with a class; no element has an id.
- `CTL7B-1-NO-OPACITY-DIM` (boxView.test.ts and raisingView.test.ts — one tag each, suffix
  `-BOX`/`-RAISING`): in the empty states no rendered element carries inline `opacity` or `filter`,
  and the empty text has an explicit colour.
- `CTL7B-RV-NO-REBUILD` (raisingView.test.ts): a refresh with an EQUAL view-model keeps the very same
  Care/Train button nodes (`===`) and keeps focus on a focused Care button; a changed VM re-renders;
  hide()+show()+refresh() re-renders; a changed locale string re-renders; an in-flight Care lock
  survives an unchanged refresh and its settle re-enables the (same) live node.
- Pre-existing tests that pin the old inline root (`position:fixed`, z-index, rgba backdrop, "no
  class"), or that pin a rebuild-on-every-refresh precondition, are edited BY NAME as intentional
  changes (listed in the PR), never deleted/skipped.

E2E (a11y.spec.ts, Chromium, real stylesheet) — evidence in the PR, not the CHECK (needs a live
server; no ledger precedent for a Playwright CHECK):
- `CTL7B-E2E-BOX` (KeyB), `CTL7B-E2E-RAISING` (KeyI), `CTL7B-E2E-EVOLUTION` (KeyE): open from the
  world, `expectFrameOk` (no scroll, root box in viewport, ≥ 4.5:1 for every visible text node),
  close with the same key. The root is selected structurally (`[data-testid=…-title]`'s parent or
  the `#app > div` shown), and the root must carry `.mr-frame` and sit inside `#game-screen`.
- `CTL7B-E2E-BATTLE`: a real encounter walk is out of a11y's budget (encounter-battle E0 already
  proves real-battle layering), so the test imports `/src/ui/battleView.ts` through the Vite dev
  server inside the page, mounts it into the real `#app` with a fixture view-model (both cards,
  skills, a status), shows it and runs `expectFrameOk`; then hides it.
- `measureFrameInPage` folds the product of ancestor `opacity` into each text's foreground alpha
  (R-ctl-7a-CTL7A.3's suggestion), so opacity dimming cannot pass.
- Re-run the axe floors; re-baseline `PASSES_FLOOR_*` / `INCOMPLETE_CEILING_*` by name only if a
  measured value changes.

## Acceptance ledger CHECK (CTL7B.1)

vitest JSON over the four view test files; every CTL7B tag passes exactly once; no failures,
pending, todo, `.fails(`; each file seen. EXPECT `ctl-7b-CTL7B.1:PASS`.

## Out of scope / residuals

- R-ci-fix-20261002T0901Z-VIEWREBUILD stays open for evolution/shop/trade/quest-log/heal/leaderboard
  (re-noted: raising closed here).
- R-ctl-7a-EVONOTICEUNDERSHELL: evolutionNotice.ts out of touches.
- Real-battle contrast through an actual encounter: encounter-battle.spec (out of touches).

## Revisions after plan review (reviewer + red-team, sonnet, 2026-10-02)

- Raising render key = JSON of `[currentLocale(), monsters, items]` for `#monsterEl` and
  `[currentLocale(), items]` for `#inventoryEl`, with the pvpView bigint replacer (`${v}`, never
  Number). The whole VM is serialized, so no field can be forgotten and an in-place mutation still
  changes the key. Key is deleted before render and set after (a throw leaves none). `hide()` deletes
  both keys. Initial state = no key (an empty first VM renders its empty text).
- Unit teeth added: root inline-property ALLOW-LIST (box/raising `{display, align-items}`, battle
  `{display, align-items, justify-content}`, evolution adds `{background-color, color}` with
  `var(--mr-evo-*)` values only), sampled after construct, show, populated refresh, empty refresh,
  hide; a subtree walk banning inline position/inset/top/right/bottom/left/z-index/opacity/filter/
  transform/visibility/mix-blend-mode/-webkit-text-fill-color on descendants; root identity
  (`parent` gets exactly one child per view, it is the title's parentElement and the classed node);
  `.mr-shell--battle` is top-level (no at-rule) and the cascaded z-index of a `--top --battle` root is
  110. Empty-state colours are parsed: alpha 1 and ≥ 4.5:1 on the frame bg and the `#1a1a2e` card.
- RV-NO-REBUILD teeth: fresh deep-equal VM skips (node `===`, zero childList mutations, focus kept);
  every single-field change (incl. itemId, trustTier, count, order) re-renders; items-only change
  re-renders `#monsterEl`; description-only change re-renders only `#inventoryEl`; bigint ids
  2^53 / 2^53+1 swap re-renders and Care forwards the new id; locale switch re-renders (empty and
  populated); in-place mutation re-renders; first empty refresh renders empty text; a throwing render
  leaves no key; lock: Care (and Train) pending → hide → show → equal refresh → button enabled;
  click → changed refresh → equal refresh → settle → LIVE node re-enabled.
- Battle root uses `justify-content: safe center` so a tall battle is scrollable to its title.
- E2E: real roots (constructed hidden at boot) are found via their title's parentElement and must sit
  in `#app` inside `#game-screen` with the classes (this exercises main.ts's real mount); battle
  fixture is tagged `data-ctl7b-fixture`, measured in an ongoing state (controls shown) and an
  outcome state, also at a 640x360 viewport (title reachable: root.scrollTop 0 shows the title inside
  the root rect), then hidden + removed in `finally`; closing asserts computed display none.
  Oracle: opacity product from the element to <html> folds into fg alpha; `webkitTextFillColor`
  used when it differs; any ancestor `background-image` ≠ none or `filter`/`mix-blend-mode` ≠ none
  fails; every measured text rect lies inside the root rect.
