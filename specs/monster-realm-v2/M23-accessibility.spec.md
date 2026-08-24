CEREMONY COMPLETE (2026-08-23) — this file WAS a provisional design sketch. It is now the converged,
implementation-ready M23 design, produced by the full `mr-feedback-doctrine.md` §6 HEAVY CEREMONY
(investigation → 6-way ideation → judge synthesis w/ attribution table → adversarial review)
authorized by the 2026-08-23 operator note in `PLAN.md` §9. The original sketch is preserved
verbatim in §11 as the ceremony's input of record. Do not re-run the ceremony; build from §§1–9.

# Spec: M23 — Accessibility

**Status:** converged, implementation-ready (ceremony output, 2026-08-23) · **Phase D** ·
**Design authority:** ADR-0032 `accessibility-strategy` (harness design ADR, accepted 2026-06-24,
builds on 0013/0014) — this spec is the implementation-ready elaboration ADR-0032 defers to. **ADR-0032
is ELABORATED, not amended** (§3, "the dormant plank"). Per-slice implementation ADRs are reserved at
build time from the **project** ADR sequence; the true next-free is **0205** (highest on disk is
`docs/adr/0204-roster-wave-3-electric-and-light.md`; `mr-state.json` `adr_next_free: 205` agrees — **no
drift**, unlike M22's slice-S0 fix-up).
**Stack:** spacetimedb-game · **Project:** monster-realm · **Retrofits:** M4 (frontend/overlays), M7
(battles), and the now-built `M-postgate-ux-design` uxd3 substrate (ADR-0162–0164).
**Boundary:** → **M24** every accessible name this milestone writes is a catalog *key*, never a literal
(§2.8) — ADR-0033 already names this seam. → **M19** is UNBUILT and post-gate; its a11y scope is
**explicitly deferred and NON-NORMATIVE** for this milestone's gate (§7). → **M25** the manual
conformance protocol and any persisted-preference store land there, not here (§3, §8.5).

## 1. Problem / intent

Make the game playable and legible for keyboard, screen-reader, colorblind and motion-sensitive
players — as a **gated property**, not a best-effort retrofit. The ceremony's investigation established
two load-bearing facts that reshape the sketch's plan:

**Fact 1 — accessibility today is exactly zero, and the substrate to fix it already exists.**
`aria-`, `role=`, `tabindex`, `eventMode` and `accessib*` return **0 hits** across `client/src` and
`client/index.html`. There are exactly two `.focus()` calls in the whole client, both
`setTimeout(…,0)`-deferred (`client/src/ui/renameView.ts:102`, `client/src/ui/tradeProposeView.ts:124`).
But `client/src/ui/overlayRegistry.ts` (226 lines, ADR-0162–0164, merged) is a pure modality core whose
`OVERLAY_TIERS` at `client/src/ui/overlayRegistry.ts:76` is typed `Readonly<Record<OverlayId, OverlayTier>>`
— **omitting an overlay id is a COMPILE error**, and `OVERLAY_IDS` is *derived* from it at
`client/src/ui/overlayRegistry.ts:100` rather than hand-maintained. That is the anti-drift device this
milestone needs, already built and already exercised by 1078 lines of tests
(`client/src/ui/overlayRegistry.test.ts`).

**Fact 2 — the sketch's biggest assumed job does not exist, and the real one was not in the sketch.**
The sketch implies a broad "make the menus operable" sweep. Investigation falsifies it:
`document.createElement('button')` is already used in ten view files
(`client/src/ui/shopView.ts:135`, `client/src/ui/boxView.ts:44`, `client/src/ui/pvpView.ts:121`,
`client/src/ui/dialogueView.ts:32`, `client/src/ui/evolutionView.ts:192`,
`client/src/ui/raisingView.ts:164`, `client/src/ui/tradeView.ts:156`,
`client/src/ui/battleView.ts:247`, and the two `<button>`s in `client/index.html`), and the four `<li>`
lists that look inert (`client/src/ui/helpView.ts:60`, `client/src/ui/healView.ts:24`,
`client/src/ui/questLogView.ts:24`, `client/src/ui/leaderboardView.ts:47`) carry **zero event listeners**
— they are correctly non-interactive display lists. **Exactly two genuine click-only interactive sites
remain**: `client/src/ui/menuView.ts:51` (delegated click/mouseover on the `#menu-rows` `<ul>`, rows built
at `client/src/ui/menuView.ts:95`) and the `#help-hint` `<div data-menu-launcher>` at
`client/index.html:118`, whose listener is delegated from `client/src/main.ts:1791`.

Meanwhile the **actual** headline defect was in neither the sketch nor the recency note: `B I E Q U P L
N O T M` are all NVDA/JAWS browse-mode single-letter quick-nav keys, bound at `window` level by the
if-ladder in `client/src/main.ts` (`:1091` KeyB, `:1111` KeyI, `:1124` KeyE, `:1136` KeyQ, `:1150` KeyU,
`:1163` KeyP, `:1177` KeyL, `:1196` KeyN, `:1213` KeyO, `:1225` KeyT, `:1269` KeyM, `:1284` KeyC), with
no `role="application"` anywhere to tell an AT the page wants raw keys. Combined with the fact that
opening an overlay moves no focus at all, a screen-reader user cannot reach, open, or operate a single
overlay. **That, not labelling, is what makes the game unusable today.**

**Out of scope (unchanged from the sketch):** controller/switch access; audio captions (no audio exists).

## 2. The converged design

### 2.0 The central decision — one total table in the registry, not sixteen retrofits

**`OVERLAY_A11Y: Readonly<Record<OverlayId, A11yMeta>>` is added to `client/src/ui/overlayRegistry.ts`
beside `OVERLAY_TIERS`, and is the single SSOT for every overlay's ARIA role, accessible-name *key*,
initial-focus selector and dismiss semantics. Two thunk-free helpers `openOverlayA11y(id, root)` /
`closeOverlayA11y(id)` in a new `client/src/ui/overlayA11y.ts` consume it; no view invents its own ARIA.**

Grounded, not asserted. `OVERLAY_TIERS` (`client/src/ui/overlayRegistry.ts:76`) already makes omission a
compile error and `OVERLAY_IDS` derived (`:99`) — the exact anti-drift device the module's own header
records as a lesson already paid for. The tier↔modality correlation is real and visible at
`client/src/ui/overlayRegistry.ts:76`–`91`: every `GUARD_ONLY` overlay is deny-not-hide, i.e. modal, and
`battleView` is the sole `EXCLUSIVE_TOP`. Splitting role and tier into two hand-kept tables re-creates
precisely the drift `OVERLAY_IDS` was built against.

**Rejected alternatives, each falsified:**

| Rejected | Falsified by |
|---|---|
| An `A11yState` projection emitted by every `*Model.ts` | Duplicates the totality guarantee `client/src/ui/overlayRegistry.ts:76` already provides for free, and scatters a11y state across sixteen model files — the opposite of SSOT. Self-falsified in ideation: a `{role:'generic',label:''}` stub satisfies any presence check. |
| Per-view ad-hoc ARIA attributes | No completeness oracle. `client/src/ui/overlayRegistry.ts`'s own header records this (the "A7" episode) as the mistake already made once and fixed structurally. |
| Enable the PixiJS `AccessibilitySystem` for the overlays | `eventMode` = 0 hits repo-wide; the canvas mounted at `client/src/render/world.ts:71` is a scrolling tilemap with zero interactive stage objects; the system's `deactivateOnMouseMove: true` default drops the shadow overlay mid-read. Wrong substrate — the overlays are *already real DOM*. See §3. |
| Bolt a focus trap onto `client/src/main.ts`'s `window` keydown listener | Re-creates the hand-maintained-guard-list anti-pattern that uxd3-c (ADR-0164) retired in favour of `canOpen`. |
| Re-platform the overlays onto a framework with built-in a11y | Blast radius across a 2812-line `client/src/main.ts` and sixteen views; the canvas is unsolved either way. |

### 2.1 The metadata SSOT

```ts
export interface A11yMeta {
  readonly role: 'dialog' | 'alertdialog';   // CLOSED union — see the vacuity note below
  readonly labelKey: string;                  // `a11y.overlay.<id>.title` — NEVER a literal (§2.8)
  readonly initialFocusSelector: string;      // MUST resolve to a natively focusable element
  readonly dismissible: boolean;              // Escape closes it
}
export const OVERLAY_A11Y: Readonly<Record<OverlayId, A11yMeta>> = { /* all 16 ids */ };
```

Three non-negotiables:

1. **Total from the first commit.** A "backfill later" partial map contradicts the ADR-0163/0164
   convention and makes the compile-time totality guarantee inert.
2. **`role` is a closed union type, not `string`.** This is what kills the obvious vacuity — a
   *presence* scan for `role` passes happily on `role="presentation"`. The TS union makes that a
   **compile** error; the source scan (§5.2) is then a backstop for `client/index.html`'s literals, not
   the primary oracle.
3. **`dismissible` may not contradict tier.** `EXCLUSIVE_TOP`/`GUARD_ONLY` ⇒ `true`. Pinned by
   `[A11Y-03]`.

### 2.2 Focus management, and the two deferred `.focus()` calls

`openOverlayA11y(id, root)`: (1) record `document.activeElement` as the return target in a module-private
`Map<OverlayId, HTMLElement | null>`; (2) set `role`, `aria-modal="true"`, `aria-label = t(meta.labelKey)`
on `root`; (3) `setTimeout(() => root.querySelector(meta.initialFocusSelector)?.focus(), 0)`.
`closeOverlayA11y(id)` removes `aria-modal`, restores focus to the recorded target, falling back to the
canvas region (§2.3) when that target is gone.

**The existing deferred calls are MOVED, not duplicated — and the defer is load-bearing.**
`client/src/ui/renameView.ts:101` documents it verbatim: *"Deferred focus (D3 mechanism 2): let the
opening key event fully complete first"* — i.e. it stops the `KeyN` that opened the overlay from typing
`n` into the freshly-focused input. `client/src/ui/tradeProposeView.ts:121` carries the same pattern
(cited there as D6 mechanism 2). Two independent deferred focus calls racing on the same tick is the
defect; **one shared deferred call in `overlayA11y.ts` is the fix.** Pinned by `[A11Y-15]`: no
`client/src/ui/*View.ts` may contain a literal `.focus(`.

**Focus trap.** New `client/src/ui/focusTrap.ts`: a pure
`nextFocusTarget(focusables, current, shift): HTMLElement` plus a thin `installTrap(root)` shell that
handles **only `Tab`/`Shift+Tab`** and calls `preventDefault()` **only on those two**. This is the direct
answer to the trap-vacuity attack — a trap that `preventDefault()`s every key passes a Tab-only test
while breaking every other keyboard interaction inside the modal. Counter-checked by `[A11Y-T4]`/A11Y-7.

**Three overlays have NO `show()` and are `render(vm | null)`-driven — the ceremony's adversarial review
found this and it is a hard constraint on the wiring mechanism.** `client/src/ui/dialogueView.ts:22`'s
`render(vm: DialogueViewModel | null)` sets `display:'none'` on a null vm (`:24`) and `display:'block'`
otherwise (`:27`); its only call site is `client/src/main.ts:1574`, driven every store tick by *server*
state (the NPC walks out of range, the quest advances). `client/src/ui/healView.ts` and
`client/src/ui/questLogView.ts` have the same shape (a `hide()` but no `show()`). A design that says
"`show()`/`hide()` delegate to `openOverlayA11y`/`closeOverlayA11y`" has **literally nothing to attach
to** for these three: dialogue — the single most common real overlay-close event in the game — would
ship with no role, no focus move, no focus restore, and a stale return-focus map entry that is written
once and never cleared. **Therefore S3 carries an explicit second mechanism:** for render-driven
overlays, `openOverlayA11y`/`closeOverlayA11y` are called from inside `render()` on the
**null↔non-null EDGE**, edge-detected against the previous vm, never on every render. Pinned by A11Y-34.

### 2.3 The hotkey ↔ screen-reader quick-nav collision — ARBITRATED

The collision is confirmed (§1, Fact 2). Two candidate fixes were considered and the obvious one —
gating the whole listener on `document.activeElement === canvasRoot` — **does not work as stated**, on
three citations:

1. **The `role="application"` host cannot be `#app`.** `client/src/main.ts:2180` resolves `#app` as
   `mount` and passes it to `renderer.init(mount, rawMap)`, where `client/src/render/world.ts:71` does
   `mount.appendChild(app.canvas)` — **and then passes the same `mount` to
   `new BattleViewClass(mount, …)` (`client/src/main.ts:2211`), `new BoxViewClass(mount, …)` (`:2184`),
   `new RaisingViewClass(mount, …)` (`:2266`) and `new EvolutionViewClass(mount, …)` (`:2296`).**
   `role="application"` on `#app` would swallow four dialogs into an application region and destroy
   their dialog semantics. **DECIDED: the attributes go on `app.canvas` itself**, set in
   `client/src/render/world.ts` immediately after `:71` — `role="application"`, `tabindex="0"`,
   `aria-label` from `t('a11y.world.region')`. No re-parenting, no extra `main.ts` touch.
   (`client/src/render/world.ts` is coverage-excluded at `client/vite.config.ts:99`, so A11Y-17 is
   scan-verified, not executed — see §9.)
2. **A blanket gate at the top of the listener breaks three existing paths.**
   `client/src/main.ts:1063` carries the comment *"Handled EARLY (before letter-key branches) so they
   work under any overlay"* for F8/F9; `client/src/main.ts:1084` intercepts menu navigation while
   `menuView.visible`, and menu rows have no `tabindex`, so `document.activeElement` is `<body>` there;
   the fourteen-branch Escape ladder (`client/src/main.ts:1300`–`1409`) **must** fire while focus is
   inside an overlay.
3. **`targetOwnsKey` is not a substitute.** `client/src/main.ts:1033` returns `true` only for
   contentEditable, `INPUT`/`TEXTAREA`/`SELECT`, and `Space` on `BUTTON`/`A`. A
   `<canvas role="application" tabindex="0">` is none of those.

**ADOPTED — a scoped gate, not a blanket one:**

```ts
const worldHasFocus = (): boolean => {
  const a = document.activeElement;
  return a === null || a === document.body || a === worldCanvasEl;
};
```

applied **only to the twelve overlay-OPEN branches**, as an additional conjunct in each existing
`canOpen(...)`-derived guard. Exempt by construction: `sessionGateBlocks()`
(`client/src/main.ts:1057`, which must stay first — pinned today by
`client/src/main.wiring.test.ts`'s session-gate-first assertion), `e.repeat`, F8/F9, the menu intercept,
the entire Escape ladder, `KEY_DIR` movement and `Space`.

**The `=== document.body` disjunct is LOAD-BEARING and must never be "cleaned up".** Two independent
reasons, and the second is the important one:

- *Compatibility.* Today a focused `<button>` inside shopView/pvpView/battleView **still lets `KeyB`
  fire** — `client/src/main.ts:1029` states it outright: *"Only renameView/tradeProposeView
  stopPropagation their focusables; the other eight overlays' buttons/selects bubble straight here"*
  (independently confirmed: `stopPropagation` appears in only those two view files). That is a latent
  bug and the gate fixes it. For a sighted player who never Tabs, `activeElement` is `<body>` and
  behaviour is byte-identical.
- *Safety for store-driven closes.* When a focused element becomes `display:none` — exactly what
  `client/src/ui/dialogueView.ts:24`'s `render(null)` does to a focused choice `<button>` — the browser
  blurs it to `<body>`. Without the `document.body` disjunct, `worldHasFocus()` would return false
  **forever** and every hotkey would be dead after any dialogue naturally ends. Pinned by A11Y-35 so
  no future edit can silently drop it.

**Accepted behaviour change (§8.4):** `B` no longer toggles boxView *closed* while focus is inside
boxView. `Escape` still does, and `closeOverlayA11y` returns focus to the canvas, so the loop closes.

### 2.4 Live regions — the `replaceChildren` tension dissolved, not traded off

The constraint is real: an ancestor `replaceChildren` destroys a live-region binding, and this
codebase's idiom is authoritative rebuild (`client/src/ui/menuView.ts:105`,
`client/src/ui/helpView.ts:64`, `client/src/ui/pvpView.ts:97`, `client/src/ui/errorOverlayView.ts:80`).

**The tension is an artefact of assuming the region lives inside a view. It does not.** One node —
`<div id="a11y-live" aria-live="polite" aria-atomic="true" class="sr-only">` — declared in
`client/index.html` as a **direct child of `<body>`**, the established position for view-less chrome
(`#build-stamp` at `client/index.html:110`, `#help-hint` at `client/index.html:127`, `#status` and
`#interact-prompt` created at `client/src/main.ts:2529` and `:2549`). It is outside `#app`, outside every
view root, inside no `replaceChildren` subtree. Owned exclusively by a new `client/src/ui/liveRegion.ts`
whose only DOM write is `node.textContent = msg` — ADR-0135-clean by construction, ADR-0014-clean (it is
a sink, not state). There is **no** conflict with ADR-0014 and none with the rebuild idiom.

**Content scope — deliberately minimal.** Announce exactly four transitions, all of which the DOM shell
already causes: (1) overlay opened — `t(labelKey)`; (2) overlay closed via Escape, naming what is now on
top; (3) battle turn outcome; (4) NPC-in-range prompt / zone change. The mapping is a **pure reducer**
`announcementsFor(prev, next): readonly string[]` with coalescing: identical consecutive messages are
dropped, and at most one message per 500 ms is emitted, later ones replacing earlier. A
"query-nearby-entities" world-summary panel is **rejected as gold-plating** — everything else the player
needs is already real DOM a screen reader can read.

### 2.5 Reduced motion — an injected flag, never a global read

`reduceMotion: boolean` becomes a new field on `ResolveInput`, **injected exactly the way `now` already
is**, so `RenderResolver.resolve` never reads a global. `client/src/render/renderResolver.ts` documents
its own IO-purity ("`now` is injected, so it stays pure-of-IO"); a `matchMedia` call inside it would be
disqualifying. Four edits and one non-edit:

- `client/src/render/renderResolver.ts:91` becomes
  `if (reduceMotion || snapped || targetGapTiles > SNAP_DIVERGENCE_TILES) …snapTo(…)`, reusing the
  **existing pure** `snapTo` at `client/src/render/slideClock.ts:60`. No new motion primitive.
- The remote path at `client/src/render/renderResolver.ts:108` gains a `reduceMotion` branch to a new
  pure `interpolateReducedMotion(row): RenderPos` in `client/src/render/interpolation.ts`, returning the
  authoritative tile. The existing `interpolateHistory`/`interpolate` calls are untouched. (This is the
  only genuinely new remote-side code: there is no snap path there today.)
- `client/src/render/motionPreference.ts` (new, shell-only): `matchMedia('(prefers-reduced-motion:
  reduce)')` plus a `change` listener. **The only module in `client/src` permitted to call
  `matchMedia`** — pinned mechanically by `[A11Y-RM2]`/A11Y-28.
- The HP bar's `transition:width 0.3s` (`client/src/ui/battleView.ts:222` — the **only** CSS transition
  in the codebase) is guarded by `@media (prefers-reduced-motion: reduce)` in the new stylesheet: a
  belt-and-braces CSS path with no JS dependency.
- **Camera: no change.** `FollowCamera.offsetFor` (`client/src/render/camera.ts:40`) already snaps with
  no easing. Inventing camera scope is rejected.

**Netcode-untouched proof.** `reduceMotion` reaches only `resolve()`, which by its own header never
touches the store or the predictor. A green **unmodified** run of `evals/prediction-parity.eval.mjs`,
`evals/movement-parity.eval.mjs`, `evals/netcode-determinism.eval.mjs` and
`evals/netcode-convergence.eval.mjs` **is** the proof — no bespoke check is added. This is a claim for
the `desync-guard` reviewer to verify, not for the implementer to assert (§9.6).

### 2.6 Colour independence and the canvas tint

DOM layer: every status/affinity/outcome badge that is colour-only gains a **text or glyph token**
alongside the colour, and the requirement is pushed into the **content pipeline** — a new `StatusEffect`
or `Affinity` without an icon/text token fails content validation (A11Y-29). The HP bar
(`client/src/ui/battleView.ts:221`) already carries numeric text at `:226`, and evolution gates already
use `✓`/`•` glyphs (`client/src/ui/evolutionView.ts:186`), so the DOM surface is smaller than it looks.

Canvas layer: `ACTION_TINT` (`client/src/render/placeholderAssets.ts:15`) is the entire visual body of
every sprite and the facing notch (`client/src/render/placeholderAssets.ts:21`) its only direction cue —
**neither has a DOM representation and neither can be given one without an art change.** That is an
art-direction ruling, not an engineering call → §8.2, **BLOCKS S8**.

### 2.7 Contrast, text scaling, and the first `.css` file

**DECIDED: introduce exactly one `client/src/styles.css`**, with a hard safety constraint.
`client/src/indexShell.test.ts` pins `#help-overlay`'s and `#help-hint`'s exact inline positioning and
z-index band by regex — and states in its own text that there is no CSS file anywhere in this repo. A
stylesheet re-declaring `z-index`/`position` on those ids could silently satisfy or defeat those
assertions. Therefore: **new class selectors and `:root` custom properties ONLY; zero `#id` selectors**
(pinned by `[A11Y-07]`/A11Y-12); `display:none` stays inline because JS toggles `style.display`
directly. Contents: `.sr-only` (**CSS clip-path, never `display:none`/`visibility:hidden`** — those
remove the node from the accessibility tree entirely), `:root` colour tokens,
`@media (prefers-reduced-motion: reduce)` and `@media (prefers-contrast: more)`.

Contrast auditing must normalise units: `client/src/ui/evolutionView.ts` uses `em` while everything else
uses `px`, and the large-text threshold (≥18px, or bold ≥14px) is otherwise mis-applied.

### 2.8 Copy keys — the M24 seam

`adr/0033-i18n-strategy.md` **names this seam explicitly** — "a11y copy (M23) flows through the
catalogs" — restated in `M24-internationalization.spec.md`. This is a named dependency in an ACCEPTED
authority, not speculation. So: **M23 writes zero raw string literals into a11y metadata.** Every
accessible name is a flat dotted key (`a11y.overlay.boxView.title`) resolved through `t(key): string`,
implemented in M23 as a trivial lookup into one flat `Record<string, string>` in
`client/src/ui/a11yCopy.ts` — the `client/src/ui/helpModel.ts` "typed TS const, NOT a RON file (YAGNI)"
precedent.

**Explicitly out of M23:** no ICU syntax, no `{count}` placeholders, no plural rules, no fallback chain,
no locale switching. Where a count is needed, enumerate `a11y.count.one` / `a11y.count.other`
concretely. M24 swaps the resolver; M23's keys become catalog entries with **zero renaming**. The brace
ban is mechanical (`[A11Y-02]`/A11Y-3) so the guardrail cannot erode.

### 2.9 Settings persistence — DECIDED: none

There is **no `localStorage` anywhere** in `client/src`: the single hit is a comment at
`client/src/net/authToken.ts:126`. The project uses `sessionStorage` through an **injected storage host**
(`client/src/net/authToken.ts:51`, `:100`, `:106`) per ADR-0150 D3, whose rationale — two tabs sharing a
token could let one forfeit the other's PvP battle — is session-specific and **does not transfer** to
display preferences.

**M23 ships no settings store, no persistence and no settings overlay.** Reduced motion and increased
contrast come from OS-level media queries only. Rationale: (i) YAGNI — the OS preference *is* the
correct source of truth and needs zero persistence; (ii) the alternative has a concrete mechanical cost
— a settings overlay is a **17th `OverlayId`**, triggering the totality compile ripple across
`OVERLAY_TIERS`/`OverlayProbes`/`OverlayHandles` **plus** the ADR-0139 overlay mutual-exclusion fan-out
symmetry gate; (iii) settings must not be stashed on the read-only store (ADR-0014 one-way flow). If the
operator later wants a manual override it is `localStorage` (cross-tab-shared *display* prefs are
desirable, unlike tokens) behind the same injected-host purity seam — **M25, not M23** (§8.5).

## 3. Scope discipline — what is CUT, and the honest conformance boundary

| Cut | Why |
|---|---|
| **PixiJS `AccessibilitySystem`** | 0 `eventMode` hits; zero interactive stage objects; one shadow DOM element per accessible container over a scrolling tilemap creates a false Tab affordance, and `deactivateOnMouseMove: true` drops it mid-read. **ADR-0032's `pixijs-accessibility` plank is DORMANT, not wrong** — it presumes canvas *interactives*, of which there are none. Do not add the dependency until a canvas-interactive feature exists to justify it. The future slice's option set is recorded here so it need not be re-derived: `enabledByDefault:false`, `activateOnTab:true`, `deactivateOnMouseMove:false`, scoped to one container, with `accessibleTitle`/`accessibleHint` set. |
| **Key remapping** | The sketch lists "remappable keys". Investigation shows this is not a data-table swap: `client/src/main.ts` binds fifteen literal `e.code` comparisons across a 2812-line if-ladder (`:1091`…`:1284`, plus `KEY_DIR` at `:1016`), so remapping is a per-key-literal refactor of the single highest-risk file, colliding with the one-`main.ts`-slice rule (§4). Deferred; the focus gate (§2.3) delivers most of the AT benefit at a fraction of the risk. |
| **A settings overlay as a 17th `OverlayId`** | §2.9 — concrete compile + ADR-0139 fan-out ripple. |
| **A world-summary / "query nearby entities" panel** | Everything the player needs is already real DOM a screen reader can read. Gold-plating. |
| **The 16-file keyboard-operability sweep** | Falsified (§1, Fact 2). Two genuine sites remain, and they are S6 alone. Any plan sized larger is wrong. |
| **A `role="list"` list-semantics sweep** | Follows from the same correction — the `<li>` lists are display-only and correctly so. |
| **Enabling Biome's `a11y` rule group** | It lints JSX-oriented rules against a repo with zero JSX (`biome.json` sets `rules.recommended` only). Churn with no oracle value. |
| **Full canvas WCAG conformance** | Structurally impossible — see the declaration below. |

### 3.1 Partial-conformance declaration

> **Conformance scope.** monster-realm claims WCAG 2.2 Level AA conformance for **the DOM overlay layer
> and the persistent DOM chrome** (`#status`, `#interact-prompt`, `#build-stamp`, `#help-hint`,
> `#a11y-live`). The `<canvas>` world region (`client/src/render/world.ts:71`) is **outside the
> conformance claim** and is covered by the live-region text mirror (§2.4) as an alternate version.

Cannot be met, and why — stated honestly rather than quietly failed:

- **1.4.10 Reflow** — the canvas is a fixed-px, viewport-sized backing store
  (`client/src/render/viewport.ts`, DPR-derived); it does not reflow at 320 CSS px without horizontal
  scroll.
- **1.4.11 Non-text Contrast** — sprite and tile art is authored bitmap content; contrast there is an
  art-direction property, not a style property, and cannot be mechanically guaranteed.
- **1.4.4 Resize Text** — partially: DOM overlay text scales; canvas-rendered text does not.
- **2.4.7 Focus Visible** — inside the canvas there are no focusable sub-elements to make visible; the
  region is a single focus stop.

## 4. Slices, dependency spine, and fan-out

Dependency spine: **S0 → S1 → {S2 ‖ S7} → {S3 ‖ S4} → S5 → S6 → {S8 → S9} → {S10 ‖ S11}.**

| Slice | Scope | `touches:` | `after:` |
|---|---|---|---|
| **S0** | `A11yMeta` (closed `role` union) + total `OVERLAY_A11Y` for all 16 ids + flat `a11yCopy.ts` `Record<string,string>` + `t(key)`. No literals in the table. Reserve project ADR-0205. | `client/src/ui/overlayRegistry.ts`, `client/src/ui/a11yCopy.ts` (new) | — |
| **S1** | Pure `focusTrap.ts` (`nextFocusTarget` + Tab-only `installTrap`); `liveRegion.ts` (`textContent`-only sink); pure `announcementsFor(prev,next)` with 500 ms coalescing; `overlayA11y.ts` (`openOverlayA11y`/`closeOverlayA11y`, sole owner of the deferred focus). | `client/src/ui/focusTrap.ts`, `client/src/ui/liveRegion.ts`, `client/src/ui/announcements.ts`, `client/src/ui/overlayA11y.ts` (all new) | S0 |
| **S2** | Static-shell ARIA literals for the eleven `client/index.html` shells; add `<div id="a11y-live" class="sr-only">` as a direct `<body>` child; new `client/src/styles.css` (class + `:root` selectors ONLY). EXTEND `indexShell.test.ts` — never edit its existing pins. | `client/index.html`, `client/src/styles.css` (new), `client/src/indexShell.test.ts` | S0 |
| **S3** | Static-shell view wiring, TWO mechanisms: `show()`/`hide()` delegate to `openOverlayA11y`/`closeOverlayA11y`; **and** the three render-driven views (`dialogueView`, `healView`, `questLogView` — no `show()` exists) wire on the `render(vm\|null)` null↔non-null EDGE (§2.2). DELETES the two view-local deferred `.focus()` calls. | `client/src/ui/dialogueView.ts`, `client/src/ui/questLogView.ts`, `client/src/ui/healView.ts`, `client/src/ui/shopView.ts`, `client/src/ui/tradeView.ts`, `client/src/ui/pvpView.ts`, `client/src/ui/leaderboardView.ts`, `client/src/ui/renameView.ts`, `client/src/ui/tradeProposeView.ts`, `client/src/ui/helpView.ts` | S1, S2 |
| **S4** | Constructed-shell wiring (`battleView`, `boxView`, `raisingView`, `evolutionView` share the `#app` mount; `claimView` is body-appended via its own `ensureElement`, so it shares the mechanism but not the nesting concern) + the canvas region attributes after `client/src/render/world.ts:71`. | `client/src/ui/battleView.ts`, `client/src/ui/boxView.ts`, `client/src/ui/raisingView.ts`, `client/src/ui/evolutionView.ts`, `client/src/ui/claimView.ts`, `client/src/render/world.ts` | S1, S2 |
| **S5** | **THE ONLY SLICE TOUCHING `client/src/main.ts`.** `worldHasFocus()` conjunct on the twelve open branches; Escape-ladder close announcements; focus return; `#help-hint` becomes a native `<button>`. | `client/src/main.ts`, `client/index.html` (the `#help-hint` element only) | S3, S4 |
| **S6** | `menuView` keyboard/AT semantics: `role="listbox"` on `#menu-rows`, `role="option"` + `id` per row, `aria-activedescendant` driven by the existing `menuKeyInput` path. The second and last genuine click-only site. | `client/src/ui/menuView.ts` | S5 |
| **S7** | Reduced motion: `motionPreference.ts` (new, sole `matchMedia` caller); `ResolveInput.reduceMotion`; the two `renderResolver.ts` branches; `interpolateReducedMotion`. **`desync-guard` review MANDATORY.** | `client/src/render/motionPreference.ts` (new), `client/src/render/renderResolver.ts`, `client/src/render/interpolation.ts` | S0 |
| **S8** | Colour independence: text/glyph tokens on status and affinity badges; content-pipeline validation requiring an icon/text token per `StatusEffect`/`Affinity`. **BLOCKED on §8.1 and §8.2.** | `client/src/ui/battleView.ts`, `client/src/ui/battleModel.ts`, `game-core/src/content/` validator | S5, §8.1+§8.2 rulings |
| **S9** | Contrast remediation + text scaling; `em`/`px` normalisation for `client/src/ui/evolutionView.ts`. | `client/src/ui/evolutionView.ts`, `client/index.html`, `client/src/styles.css` | S8 |
| **S10** | The five evals + baseline + happy-dom specs. | `evals/overlay-a11y-manifest.eval.mjs`, `evals/a11y-static-shell.eval.mjs`, `evals/contrast-ratio.eval.mjs`, `evals/keyboard-operable-rows.eval.mjs`, `evals/reduced-motion-purity.eval.mjs`, `evals/baselines/contrast-unresolved.json` (all new), `client/src/ui/overlayA11yWiring.test.ts` | S3, S4, S7 |
| **S11** | `just a11y-e2e` recipe + nightly-workflow wiring + the manual protocol doc. | `justfile`, `.github/workflows/nightly.yml`, `docs/a11y-manual-protocol.md` (new), `evals/ci-gate-wiring.eval.mjs` (nightly-recipe check only) | S10 |

**`touches:`-disjoint fan-out pairs:** S2 ‖ S7, S3 ‖ S7, S4 ‖ S7 (`render/*` vs `ui/*`), S10 ‖ S11.
**Never paired:** S3 ‖ S4 (both consume S1's helper surface — pair only once S1 is frozen); S8 ‖ S9
(both edit `battleView`-adjacent inline styles). **S5 is serial by construction:** it is the sole
`client/src/main.ts` touch, and everything downstream of the focus gate sequences after it. S7's earlier
draft also touched `main.ts` for the startup preference read; that read is instead owned by
`motionPreference.ts` and consumed at the existing render-loop call site inside S5's window, so S7 stays
`main.ts`-free.

**Co-located unit tests ride with their source slice.** The four specs §5.5 names are owned by the
slice that owns their subject — `focusTrap.test.ts`/`liveRegion.test.ts`/`announcements.test.ts` with S1,
`renderResolver.test.ts` with S7 — and only `overlayA11yWiring.test.ts` (which spans every view and so
cannot exist before S3/S4 land) is listed under S10. A slice that defers its own co-located tests to S10
is mis-scoped, not efficient.

### 4.1 Post-integration verification (the milestone's real DoD)

Slices passing in isolation does not prove they work together. After the slices merge (serial,
verifier-gated, each later slice rebased on the merged earlier ones), M23 MUST verify the integrated
whole: full `just ci` green-and-meaningful; `bindings-drift = 0` and the schema snapshot intact
(M23 changes no schema, so a non-zero drift is itself a defect); the four parity/determinism evals green
and **unmodified** (§2.5); and one end-to-end pass proving the *combined* behaviour — an overlay opened
by hotkey from the canvas region announces, traps focus, and returns focus to the canvas on Escape, with
the reduced-motion branch active. Cross-slice contracts that must be named and tested after integration:
`OVERLAY_A11Y` ↔ every view's `show()`/`render()` (S0↔S3/S4), `overlayA11y.ts`'s return-focus map ↔
`main.ts`'s Escape ladder (S1↔S5), `worldHasFocus()` ↔ the store-driven close paths (S5↔S3), and
`ResolveInput.reduceMotion` ↔ both interpolation paths (S7↔S0).

## 5. Gates — the eval design

Oracle tiering, strongest available per property, with a written reason the stronger tier fails:
**(a) TS compile → (b) source-scan eval → (c) happy-dom vitest → (d) Playwright + axe → (e) manual.**
Binding rule: **where no mechanical oracle exists, the property is tracked ONLY in the manual checklist
doc and is NEVER reported as CI-green.**

### 5.1 `evals/overlay-a11y-manifest.eval.mjs` [SCAN]

Exports `findMissingA11yIds` / `findUnsanctionedA11yIds` — a **two-way ratchet** on the `OverlayId` union
parsed textually from `client/src/ui/overlayRegistry.ts:36` vs `OVERLAY_A11Y`'s keys, modelled on
`evals/dom-shell-coverage-exclusion.eval.mjs`'s `findMissingExclusions`/`findUnsanctionedExclusions`.

| Tag | Check |
|---|---|
| `[A11Y-01]` | every `OverlayId` member appears as an `OVERLAY_A11Y` key, and every key is a union member (both directions) |
| `[A11Y-02]` | `labelKey` matches `/^a11y\.[a-z0-9.]+$/`, is non-empty after trim, contains no `{`/`}` (the ICU ban, §2.8), and is unique across the sixteen |
| `[A11Y-03]` | no id whose tier is `EXCLUSIVE_TOP`/`GUARD_ONLY` declares `dismissible: false` |
| `[A11Y-04]` | every `labelKey` resolves to a non-empty `a11yCopy.ts` entry, and no copy entry is an orphan (both directions) |
| `[A11Y-15]` | no `client/src/ui/*View.ts` contains a literal `.focus(` call — the single deferred focus lives only in `overlayA11y.ts` (§2.2); the scan is comment- and string-aware so a `.focus(` inside a comment is not a false positive, and it exempts `*.test.ts` |

**BAD proof-of-teeth fixtures:** a 17th union member absent from the table (`01`); `labelKey:'a11y.x'`
duplicated on two ids (`02`); `labelKey:'a11y.count.{n}'` (`02`, ICU ban); `helpView` with
`dismissible:false` (`03`); a `labelKey` with no copy entry, and a copy entry no key references (`04`); a
`renameView.ts` that still calls `this.#input.focus()` (`15`).
**GOOD hostile-but-correct fixture:** all sixteen present with `role` **REUSED** across overlays
(15× `dialog`, 1× `alertdialog`) and textually identical `initialFocusSelector`s — must PASS, proving the
oracle does not wrongly demand per-overlay uniqueness.
A second GOOD fixture for `[A11Y-15]`: a `*View.ts` whose *doc comment* mentions `.focus(` and a
`*View.test.ts` that asserts on focus — both must PASS, proving the scan is not a naive substring grep.
**Vacuity attack (declared and killed):** the manifest is pure theatre unless a consumer reads it back —
`[A11Y-01..04]` alone pass a build in which no view ever reads `OVERLAY_A11Y`. Killed by §5.2 (static
side) and §5.5 (constructed side); both are **hard requirements**, not "should pair with". `role` being a
closed TS union additionally makes `role="presentation"` a compile error, not a scan miss.

### 5.2 `evals/a11y-static-shell.eval.mjs` [SCAN]

| Tag | Check |
|---|---|
| `[A11Y-05]` | exactly one `aria-live` node in `client/index.html`; it is a direct `<body>` child; no `replaceChildren` call in `client/src` targets `document.body` or `#a11y-live` |
| `[A11Y-06]` | `.sr-only` in `styles.css` uses `clip-path`/`clip` + `position:absolute`, and contains **neither** `display:none` **nor** `visibility:hidden` |
| `[A11Y-07]` | `styles.css` contains zero `#id` selectors (protects `client/src/indexShell.test.ts`'s inline pins) |
| `[A11Y-08]` | `world.ts` sets `role="application"` + `tabindex="0"` + a non-empty `aria-label` on `app.canvas`, **and** `#app` carries no `role` |

**BAD fixtures:** two `aria-live` nodes (`05`); `#a11y-live` nested inside `#app` (`05`);
`.sr-only{display:none}` (`06`); a `styles.css` containing `#help-overlay{…}` (`07`);
`role="application"` on `#app` (`08`).
**GOOD hostile-but-correct fixture:** an `aria-live` node placed as the *last* `<body>` child, after
`#help-hint`, with `.sr-only` using `clip-path:inset(50%)` rather than the legacy `clip:rect(…)` — must
PASS, proving the check is on semantics and not on a copied literal.
**Declared residual:** a scan cannot prove the live region is ever *written to*; that is §5.5's
`liveRegion.test.ts` plus A11Y-22's `[E2E]`.

### 5.3 `evals/contrast-ratio.eval.mjs` [SCAN]

Pure-JS WCAG relative luminance (`0.2126R + 0.7152G + 0.0722B` after sRGB linearisation) over fg/bg hex
pairs extracted from inline `style.cssText` literals, with `em`↔`px` normalised for the large-text
threshold.

| Tag | Check |
|---|---|
| `[A11Y-09]` | a resolved pair's ratio is ≥ 4.5:1 (normal text) |
| `[A11Y-10]` | ≥ 3.0:1 for ≥18px, or bold ≥14px |
| `[A11Y-11]` | the `NO_BG_UNRESOLVED` count is ≤ the checked-in baseline in `evals/baselines/contrast-unresolved.json` |

**Vacuity attack (declared and killed):** split `color:` and `background:` into two `cssText` assignments
a few lines apart and every real violation reports as "unresolved" forever. Killed by `[A11Y-11]`'s
**monotonic baseline ratchet** — unresolved pairs may shrink, never grow. The mechanism is proven in this
repo: `evals/baselines/` holds fifteen files and evals read them at runtime
(`evals/content-version.eval.mjs`, `evals/battle-schema-snapshot.eval.mjs`). The baseline file records a
per-file breakdown so a growth diff is legible to a reviewer.
**BAD fixtures:** `#777` on `#0b0d12` (`09`); 20px `#8a8a8a` on `#666` (`10`); a new split-assignment
pair pushing the unresolved count above baseline (`11`).
**GOOD hostile-but-correct fixture:** a pair deliberately far from near-`#000`/`#fff` — e.g. a `#2a3a2a`
background with a foreground computed to land at exactly 4.52:1 — must PASS, proving the luminance maths
is real and not a black/white heuristic.

### 5.4 `evals/keyboard-operable-rows.eval.mjs` [SCAN]

| Tag | Check |
|---|---|
| `[A11Y-12]` | an element with a `click` listener, no paired `keydown`, and no native `<button>`/`<a>` child fails |
| `[A11Y-13]` | the paired `keydown` body must reference **the same callback identifier** as the `click` body |
| `[A11Y-T3]` | `NEGATIVE_TABINDEX_INTERACTIVE` — `tabindex="-1"` on an element that itself carries a click/keydown listener fails |
| `[A11Y-T5]` | no `tabindex` value greater than 0 anywhere |

**Vacuity attack (declared and killed):** an empty no-op `keydown` handler satisfies a presence check →
`[A11Y-13]` requires callback *identity*, not handler presence.
**BAD fixtures:** a bare `li.addEventListener('click', fn)` (`12`); the same with
`li.addEventListener('keydown', () => {})` (`13`); a `<button tabindex="-1">` carrying a click listener
(`T3`); any `tabindex="1"` (`T5`).
**GOOD hostile-but-correct fixture:** `menuView`'s delegated `click` on `#menu-rows` paired with a
delegated `keydown` calling the *same* `handleMenuInput` identifier, rows at `tabindex="-1"` and **no
per-row listener** (the `aria-activedescendant` pattern S6 ships) — must PASS, proving `[A11Y-T3]`
targets listener-bearing elements only.
**Declared residual:** `[A11Y-13]`'s identity extraction is string-scanning, not AST parsing (the repo's
`.mjs` eval idiom has no parser). It is reliable for the arrow-function/`const fn` shapes this codebase
actually uses and is specified to **fail loud on an un-parseable handler shape** rather than pass it —
a new shape is a gate failure demanding a gate update, which is the correct default.

### 5.5 happy-dom vitest [UNIT] — rides the existing `client-test` step

- `overlayA11yWiring.test.ts` — parameterised over `OVERLAY_IDS`, **constructing the REAL exported view
  class** (never a hand-rolled stand-in): after open, `root.getAttribute('role') === OVERLAY_A11Y[id].role`,
  `aria-modal === 'true'`, and `initialFocusSelector` resolves to a focusable element. This is the
  consumer-side read-back that de-theatres §5.1. **Vacuity attack:**
  `expect(root.contains(document.activeElement))` passes on a decorative `tabindex="-1"` wrapper —
  killed by asserting `document.activeElement === root.querySelector(selector)` **and** that the
  element's tag is in `{BUTTON, INPUT, SELECT, A, TEXTAREA}`.
- `focusTrap.test.ts` — Tab wrap forward and back, plus `[A11Y-T4]`: a non-Tab key dispatched into the
  trapped root is NOT `preventDefault`ed and still reaches an app-level handler.
- `liveRegion.test.ts` — `textContent`-only; identical consecutive messages coalesced; ≤1 per 500 ms.
- `renderResolver.test.ts` (extended) — `reduceMotion: true` yields the authoritative tile for own **and**
  remote paths regardless of `now`.

### 5.6 `evals/reduced-motion-purity.eval.mjs` [SCAN]

`[A11Y-RM2]`: `matchMedia` appears in non-test `client/src` **only** in `render/motionPreference.ts`, and
`renderResolver.ts` imports neither it nor `window`.
**BAD fixture:** `renderResolver.ts` calling `matchMedia` directly.
**GOOD hostile-but-correct fixture:** a `*.test.ts` file referencing `matchMedia` in a mock — must PASS
(test files excluded, following the ptc5d OKF `*_tests.rs` exclusion precedent).

### 5.7 CI vs nightly — DECIDED

`evals/ci-gate-wiring.eval.mjs` hardcodes
`REQUIRED_JUST_STEPS = ['lint','typecheck','test','eval','wasm','client-typecheck','client-test']`, and
the `justfile`'s `ci:` recipe is exactly those plus `security` and `observability-validate`. `e2e`,
`coverage` and `mutate*` are deliberately absent because `just ci` is fast, hermetic and server-free.

- **§§5.1–5.4 and 5.6 → `just eval`.** Source scans are milliseconds and are auto-discovered by
  `evals/run.mjs`'s `readdir` + `.eval.mjs` filter — **no slice edits `run.mjs`**, and **no edit to
  `REQUIRED_JUST_STEPS`** is needed since `eval` is already required.
- **§5.5 → `client-test`.** Already required.
- **axe-core + Playwright → NOT in `just ci` and NOT in `REQUIRED_JUST_STEPS`.** Adding them puts a live
  server in the hermetic gate, contradicting the exact principle that keeps `e2e` out. Instead:
  `just a11y-e2e` beside `e2e`, run nightly, plus a **cheap additive wiring check** in
  `ci-gate-wiring.eval.mjs` that the recipe exists and is invoked by the nightly workflow with a
  non-truthy `continue-on-error` (reusing its existing `isTruthyCoe` helper). This is an additive check
  on the nightly job, **not** a mutation of `REQUIRED_JUST_STEPS`.
- **A deliberately-broken fixture overlay as a SHIPPED artefact is rejected** — it would be a 17th
  `OverlayId` with the full compile ripple. Its intent survives as the inline BAD fixtures above, which
  is this repo's idiom.

## 6. Acceptance criteria (EARS)

Prefix `A11Y-n`. Each maps to exactly one oracle, annotated `[COMPILE]`/`[SCAN]`/`[UNIT]`/`[E2E]`/`[MANUAL]`.

**S0 / S1 — the substrate**

- **A11Y-1** [COMPILE] WHEN a new `OverlayId` union member is added without an `OVERLAY_A11Y` entry THE SYSTEM SHALL fail `just client-typecheck`.
- **A11Y-2** [COMPILE] WHEN an `A11yMeta.role` is any value outside `'dialog' | 'alertdialog'` THE SYSTEM SHALL fail `just client-typecheck`.
- **A11Y-3** [SCAN] WHEN any `labelKey` is empty, duplicated across ids, or contains `{` or `}` THE SYSTEM SHALL fail CI (`[A11Y-02]`).
- **A11Y-4** [SCAN] IF a `labelKey` has no `a11yCopy.ts` entry, or a copy entry has no referencing key, THEN THE SYSTEM SHALL fail CI (`[A11Y-04]`).
- **A11Y-5** [SCAN] WHEN an id's `dismissible` value contradicts its `OVERLAY_TIERS` tier THE SYSTEM SHALL fail CI (`[A11Y-03]`).
- **A11Y-6** [UNIT] WHEN `nextFocusTarget` is called on the last focusable element with `shift = false` THE SYSTEM SHALL return the first focusable element.
- **A11Y-7** [UNIT] WHEN a non-Tab key is dispatched into a trapped root THE SYSTEM SHALL NOT call `preventDefault` and SHALL let the key reach an app-level handler.
- **A11Y-8** [UNIT] WHEN `announcementsFor` receives two consecutive identical states THE SYSTEM SHALL emit zero messages.
- **A11Y-9** [UNIT] WHEN more than one announcement is produced within 500 ms THE SYSTEM SHALL emit only the most recent.

**S2 — shells, live region, stylesheet**

- **A11Y-10** [SCAN] THE SYSTEM SHALL contain exactly one `aria-live` node, as a direct child of `<body>` and outside `#app` (`[A11Y-05]`).
- **A11Y-11** [SCAN] IF `.sr-only` declares `display:none` or `visibility:hidden` THEN THE SYSTEM SHALL fail CI (`[A11Y-06]`).
- **A11Y-12** [SCAN] WHEN `styles.css` contains any `#id` selector THE SYSTEM SHALL fail CI (`[A11Y-07]`).

**S3 / S4 — view wiring**

- **A11Y-13** [UNIT] WHEN any of the sixteen overlays becomes visible THE SYSTEM SHALL set `role` and `aria-modal="true"` on its root to the values `OVERLAY_A11Y` declares for that id.
- **A11Y-14** [UNIT] WHEN any of the sixteen overlays becomes visible THE SYSTEM SHALL move `document.activeElement` to the element its `initialFocusSelector` resolves to, and that element SHALL be natively focusable.
- **A11Y-15** [SCAN] IF any `client/src/ui/*View.ts` contains a literal `.focus(` call THEN THE SYSTEM SHALL fail CI — the single deferred focus lives only in `overlayA11y.ts`.
- **A11Y-16** [UNIT] WHEN an overlay becomes hidden THE SYSTEM SHALL restore focus to the element focused immediately before it became visible, or to the canvas region if that element is gone.
- **A11Y-34** [UNIT] WHERE an overlay has no `show()` and is driven by `render(vm | null)` (`dialogueView`, `healView`, `questLogView`), WHEN its vm transitions null→non-null or non-null→null THE SYSTEM SHALL invoke `openOverlayA11y`/`closeOverlayA11y` exactly once per transition and SHALL NOT invoke either on a repeat render at the same nullity.
- **A11Y-17** [SCAN] THE SYSTEM SHALL set `role="application"`, `tabindex="0"` and a non-empty `aria-label` on the Pixi canvas, and SHALL NOT set any `role` on `#app` (`[A11Y-08]`).
- **A11Y-18** [SCAN] WHEN the set of `client/index.html` overlay shells changes THE SYSTEM SHALL fail CI unless `DOM_SHELLS` in `evals/dom-shell-coverage-exclusion.eval.mjs` is updated in the same change.

**S5 / S6 — the focus gate and the two click-only sites**

- **A11Y-19** [E2E] WHEN a single-letter overlay hotkey is pressed while `document.activeElement` is inside an open overlay THE SYSTEM SHALL NOT open or toggle any overlay.
- **A11Y-20** [E2E] WHEN a single-letter overlay hotkey is pressed while `document.activeElement` is `<body>` or the canvas region THE SYSTEM SHALL open the same overlay it opened before this milestone.
- **A11Y-21** [UNIT] WHEN `sessionGateBlocks()` is true THE SYSTEM SHALL return before evaluating `worldHasFocus()`, preserving the existing session-gate-first ordering pin.
- **A11Y-35** [UNIT] WHEN a focused element inside an overlay is hidden by a store-driven `render(null)` and the browser blurs it to `<body>` THE SYSTEM SHALL report `worldHasFocus()` as true, so hotkeys remain live.
- **A11Y-22** [E2E] WHEN Escape closes an overlay THE SYSTEM SHALL announce the accessible name of the overlay now on top, or that the world region is now focused.
- **A11Y-23** [E2E] WHEN the player Tabs from the canvas region THE SYSTEM SHALL move focus to `#help-hint` as a native `<button>`, and SHALL activate it on both Enter and Space.
- **A11Y-24** [UNIT] WHEN the menu selection index changes THE SYSTEM SHALL update `aria-activedescendant` on `#menu-rows` to the id of the selected `role="option"` row.
- **A11Y-25** [SCAN] IF an element carries a click listener with no same-callback `keydown` pair and no native button/anchor child THEN THE SYSTEM SHALL fail CI (`[A11Y-12]`/`[A11Y-13]`).
- **A11Y-26** [SCAN] THE SYSTEM SHALL contain no `tabindex` value greater than 0 (`[A11Y-T5]`).

**S7 — reduced motion**

- **A11Y-27** [UNIT] WHEN `ResolveInput.reduceMotion` is true THE SYSTEM SHALL return the authoritative tile position for own and remote characters regardless of the injected `now`.
- **A11Y-28** [SCAN] IF `matchMedia` is referenced in any non-test `client/src` module other than `render/motionPreference.ts` THEN THE SYSTEM SHALL fail CI (`[A11Y-RM2]`).
- **A11Y-36** [SCAN] WHEN S7 lands THE SYSTEM SHALL keep `evals/prediction-parity.eval.mjs`, `evals/movement-parity.eval.mjs`, `evals/netcode-determinism.eval.mjs` and `evals/netcode-convergence.eval.mjs` green and **byte-unmodified**.

**S8 / S9 — colour and contrast**

- **A11Y-29** [SCAN] WHEN a `StatusEffect` or `Affinity` is added without an icon or text token THE SYSTEM SHALL fail content validation.
- **A11Y-30** [SCAN] WHEN a resolved foreground/background pair falls below 4.5:1, or below 3.0:1 for large text, THE SYSTEM SHALL fail CI (`[A11Y-09]`/`[A11Y-10]`).
- **A11Y-31** [SCAN] IF the `NO_BG_UNRESOLVED` count exceeds the checked-in baseline THEN THE SYSTEM SHALL fail CI (`[A11Y-11]`).

**S11 — the manual tier**

- **A11Y-32** [MANUAL] WHEN the manual protocol is executed THE SYSTEM SHALL allow a tester using **NVDA 2024.x + Chrome, mouse unplugged and screen covered**, to complete: reach the world region → open the Box → move the party selection → close → confirm the announcement. VoiceOver + Safari is a cross-check, not a second gate. This criterion SHALL NEVER be reported as CI-green.
- **A11Y-33** [MANUAL] WHEN the manual protocol is executed THE SYSTEM SHALL confirm that `aria-modal` on the four `#app`-nested overlays actually renders the rest of the document inert to the tested AT — a browser/AT implementation detail the source tree cannot prove.

*Deliberately excluded, with reasons:* an "announced within one render frame" criterion (a pure-reducer
unit test proves output shape, not integration timing — untestable as written); a "tab order matches the
declared order field" criterion (circular — it proves the code agrees with itself, not perceptual
correctness); a "the help overlay lists every bound hotkey" criterion (already enforced by
`client/src/ui/helpModel.ts`'s MM-KEYGLYPH-FROM-HELP-SSOT — duplicate scope).

## 7. Deferred M19 sub-scope — NON-NORMATIVE for M23's gate

M19 (guilds/chat/social) is unbuilt and post-gate (`blocked:playtest-gate`). These are criteria M19 must
satisfy **when it builds**, not gates M23 can meet today. They are deliberately kept **out of §6's
`A11Y-*` acceptance set**: mixing unmeetable-now criteria into the acceptance ledger either keeps it
permanently red or invites a fake skip annotation that pollutes the gate. A one-line addendum in
`M19-social.spec.md` should point back here when that spec is next edited.

- **M19-A1** Chat SHALL use `aria-live="polite"`, **never `assertive`** — chat is not an emergency
  channel, and assertive would interrupt battle announcements mid-utterance.
- **M19-A2** Chat bursts SHALL be throttled to ≤1 announcement per ~2 s, reusing M23's
  `announcementsFor` coalescer rather than building a second mechanism.
- **M19-A3** Chat is the one surface where `innerHTML` pressure reappears (user text with mentions or
  formatting). M19 SHALL stay `textContent`-only per ADR-0135, or amend ADR-0135 with its own ADR —
  **never a silent exception**.

Staleness risk is real and accepted: if M19's design diverges (chat as a separate surface rather than a
DOM overlay), these could go stale with only the cross-reference to catch it.

## 8. Operator escalations (`mr-ask-drew`, BLOCKER discipline)

1. **Colourblind palette — redesign the default, or ship an opt-in theme? [BLOCKS S8]** Options:
   (a) redesign the default palette to be CB-safe for everyone; (b) an opt-in theme. **Recommended
   default: (a)** — an opt-in theme requires the settings store §2.9 cuts, so (b) drags M25 scope into
   M23. Blocks S8 because the token set differs.
2. **Canvas sprite-tint contrast is an art-direction call. [BLOCKS S8]** `ACTION_TINT`
   (`client/src/render/placeholderAssets.ts:15`) conveys action state with colour alone and has no DOM
   representation. Options: (a) accept as out-of-scope under the §3.1 partial-conformance declaration;
   (b) commission an art pass adding a non-colour cue per action state. **Recommended default: (a)** for
   M23, with a tracked art ticket.
3. **Definition of done for the AA claim. [BLOCKS S11's exit, not its build]** Options: (a) self-attested
   checklist; (b) third-party audit; (c) a playtest with a real screen-reader user. **Recommended
   default: (a) for M23 plus (c) scheduled before any public conformance statement.** (b) is
   disproportionate pre-launch; a conformance claim published on (a) alone is a legal exposure, not just
   an engineering one.
4. **Accepted behaviour change: `B` no longer toggles boxView closed while focus is inside boxView.
   [DEFAULTS, does not block]** Escape still closes it and focus returns to the canvas. **Recommended
   default: accept.** Overturn condition: a playtest shows sighted players relying on same-key-to-close
   after clicking a button.
5. **A manual reduced-motion / high-contrast override toggle. [DEFAULTS, does not block]** M23 ships
   OS-media-query-only (§2.9). If the operator wants a manual toggle it is `localStorage` behind the
   `client/src/net/authToken.ts:51` injected-host seam plus a 17th `OverlayId` with the ADR-0139 fan-out
   ripple. **Recommended default: defer to M25.**

## 9. Non-goals, residual risks, accepted limitations

1. **The manifest→consumer link is proven only for constructed shells at the unit tier.** For the eleven
   static shells, `client/index.html`'s literals are scanned against `OVERLAY_A11Y`; a scan cannot prove
   runtime identity. Declared residual; the nightly axe/E2E run is the compensating control.
2. **Cross-AT divergence is unoracled.** NVDA, JAWS and VoiceOver coalesce polite queues differently and
   no static tool sees it. Manual-only, never CI-green.
3. **`client/src/render/world.ts` is coverage-excluded** (`client/vite.config.ts:99`), so A11Y-17 is
   scan-verified, not executed. A refactor moving the canvas mount out of `world.ts` would silently void
   the check — the scan MUST fail loud if its anchor line is not found, rather than pass vacuously.
4. **Baseline ratchets decay.** `contrast-unresolved.json` can be re-blessed upward by a careless
   reviewer. Mitigated by a per-file breakdown in the baseline so a growth diff is legible.
5. **The `=== document.body` disjunct is a compatibility escape hatch AND a safety net** (§2.3). It also
   means the gate does nothing for a user who has never focused anything — accepted, because in that
   state an AT in browse mode intercepts the letter first, so there is nothing to gate.
6. **S7 touches `client/src/render/interpolation.ts`.** Additive, but `desync-guard` review is
   mandatory. The four parity/determinism evals are the mechanical proof; a green run is necessary, not
   sufficient.
7. **An incidental ADR-0135 inconsistency was found and is NOT fixed here.**
   `client/src/ui/dialogueView.ts:30` does `this.choicesContainer.innerHTML = '';` — the only
   `innerHTML` write in the view layer, in a file otherwise governed by the textContent-only firewall.
   It is a clearing assignment with a constant, so it is not an injection vector today, but it is
   exactly the line a future edit would extend. S3 already touches this file; **the S3 implementer
   SHOULD replace it with `replaceChildren()` as an in-slice boy-scout fix** and note it. Recorded here
   so it is not lost if S3 is re-scoped.
8. **Adding `setAttribute('aria-…')` to a view does NOT trip the existing per-view XSS assertions** —
   verified: those tests inject markup and assert `querySelector('script')`/`querySelector('img')` are
   null and `textContent` is the literal payload; they never inspect attributes. No pre-wiring
   verification step is needed for S3/S4 on that account.

**Falsifiable verdict.** This design is overturned if: (i) a real-browser run shows an AT in focus mode
still fails to deliver a single-letter hotkey to `window` with `role="application"` set on the canvas —
§2.3's gate then collapses and key remapping returns to scope; (ii) `menuView`'s `aria-activedescendant`
pattern is shown not to announce on any of the three target ATs, forcing real per-row `tabindex` and
killing §1's two-site sizing; (iii) `interpolateReducedMotion` cannot be made pure without reading
predictor state, in which case S7 is re-scoped rather than shipped.

## 10. Attribution table (ceremony evidence base)

Per `mr-feedback-doctrine.md` §6.3, the synthesis must record, per brainstormer, its unique elements
adopted and rejected. This is the evidence base for the operator's open 6-vs-4 brainstormer calibration
question (2026-07-27).

| Lens | Unique elements ADOPTED (and where) | Unique elements REJECTED (and why) |
|---|---|---|
| **B1 — unbiased (no code access)** | `announcementsFor` as a **pure** reducer incl. the coalescing/rate-limit criterion → §2.4, S1, A11Y-8/9. "Reduced motion must not be readable by the netcode module" as an **import-boundary lint** → §5.6, A11Y-28 (made mechanical; B1 flagged it as assumed). "A new StatusEffect/Affinity without an icon/text token fails **content validation**" → §2.6, S8, A11Y-29. "No positive tabindex" → `[A11Y-T5]`, A11Y-26. Two operator rulings → §8.1, §8.3. | The `toA11yState` per-model projection — duplicates the totality `client/src/ui/overlayRegistry.ts:76` gives free and scatters SSOT across sixteen files; self-falsified in its own review. The Pixi text-mirror slices — falsified by 0 `eventMode` hits. The tab-order test — circular, per B1 itself. The rebind-conflict criterion — remapping is cut (§3). A `localStorage` keymap — no localStorage exists (§2.9). "Within one render frame" — untestable. A shipped broken-fixture overlay — a 17th `OverlayId`'s compile ripple; intent preserved as inline BAD fixtures. **Net: six criteria and two escalations, zero adopted architecture.** |
| **B2 — investigation-grounded** | **The central decision** — `OVERLAY_A11Y` as a total table in the registry, argued from the tier↔modality correlation → §2.0/§2.1, S0. The **`main.ts` serialization rule** (exactly one slice may touch it; a second touch must sequence after) → §4, S5. "`initialFocusSelector` resolves for all sixteen" as one parameterised loop → A11Y-14, §5.5. Dismissibility-vs-tier → `[A11Y-03]`, A11Y-5. The `DOM_SHELLS` pin → A11Y-18. The finding that the two deferred `.focus()` calls will **race** a trap-on-show → §2.2, S3, A11Y-15. `evolutionView`'s `em`-vs-`px` normalisation → §2.7, S9. Both of its self-review vacuity fixes (allowed-enum → a closed TS union; `contains(activeElement)` → identity + tag assertion). | "The help overlay lists every bound hotkey" — already enforced by `client/src/ui/helpModel.ts`'s MM-KEYGLYPH-FROM-HELP-SSOT; duplicate scope. Its S5 as a single 16-file slice — its own review said 2–3, and the click-only correction reduces it to one slice (S6). Its remap slice — cut (§3). **Net: supplied the architecture and the strongest sequencing rule.** |
| **B3 — assistive-technology user / WCAG-2.2-AA auditor** | The **hotkey↔quick-nav collision** — the milestone's headline defect, absent from the sketch → §1 Fact 2, §2.3. The `role="application"` + focus-gated listener fix → §2.3, A11Y-17/19/20 (**corrected**: the host is `app.canvas`, not `#app`; the gate is scoped to open branches, not blanket). The stable-live-node vs `replaceChildren` tension → §2.4 (**dissolved** by body-level placement). `.sr-only` must be clip-path, never `display:none` → §2.7, A11Y-11. The explicit WCAG SC mapping and the **partial-conformance declaration** → §3.1. NVDA+Chrome primary / VoiceOver+Safari cross-check / mouse unplugged and **screen covered** → A11Y-32. "Announce what is on top after Escape" → A11Y-22. Cross-AT divergence as unoracled → §9.2. | Its "every `<li>` is an inert click-only row" premise → falsified: ten view files already use native `<button>` and the four `<li>` lists carry zero listeners (§1 Fact 2). The list-semantics sweep that followed from it → cut (§3). The world-summary panel → cut as gold-plating. "Complete a full wild battle" as one manual criterion → its own review split it; A11Y-32 scopes to the Box flow instead. `activeElement === canvasRoot` **as stated** → refuted on three citations (§2.3). **Net: found the headline defect and the honest conformance boundary; its central mechanism needed correction.** |
| **B4 — CI-gate / verification engineer** | **The vacuity attack — the single most valuable artefact of the ideation** → §5 throughout: manifest-is-theatre-without-read-back promoted to a hard requirement (§5.5); the split-`cssText` dodge killed by a **baseline ratchet** (`[A11Y-11]`); the no-op-keydown dodge killed by **callback identity** (`[A11Y-13]`); `NEGATIVE_TABINDEX_INTERACTIVE` (`[A11Y-T3]`); the preventDefault-everything trap counter-check (`[A11Y-T4]`/A11Y-7); "construct the REAL exported class, never a stand-in". The **oracle-tiering frame** → §5 preamble and every `[TIER]` annotation in §6. The two-way ratchet modelled on `dom-shell-coverage-exclusion` → §5.1. Real WCAG luminance maths plus the hostile GOOD fixture avoiding near-`#000`/`#fff` → §5.3. **The CI-cost ruling** (scans → `just eval`; happy-dom → `client-test`; axe+Playwright → a new nightly `just a11y-e2e`, NOT `REQUIRED_JUST_STEPS`) → §5.7. "No mechanical oracle ⇒ manual doc only, NEVER CI-green" → §5 preamble, A11Y-32. | Its claim that hotkeys dispatch on semantic action strings → false; `client/src/main.ts` is a literal `e.code` if-ladder, which is precisely why remapping is cut. Its "every list row is inert" premise → false, which shrinks `keyboard-operable-rows.eval.mjs` from a sweep-detector to a two-site regression ratchet (kept — the ratchet is the point). **Net: owns §5 almost entirely.** |
| **B5 — research: PixiJS v8 and web primitives** | The falsification of ADR-0032's `pixijs-accessibility` plank **on cited mechanism** (`activateOnTab`, `deactivateOnMouseMove:true`, one DOM element per container) → §3, with the future slice's exact option set recorded. The **`reduceMotion`-as-injected-`ResolveInput`-field seam** — the cleanest netcode-safety argument any lens produced → §2.5, S7, A11Y-27. Reuse of the existing pure `snapTo` rather than a new primitive. `interpolateReducedMotion` as a small pure function. "The camera needs **no** change" — avoided invented scope. The four existing parity/determinism evals as the mechanical untouched-netcode proof → §2.5, A11Y-36. The **minimal live-region scope** (only the transitions the DOM shell already causes) → §2.4. The stylesheet analysis — one `styles.css`, **new class selectors only, zero `#id` selectors**, because `client/src/indexShell.test.ts` pins `#help-overlay`'s inline positioning → §2.7, A11Y-12. The `@media (prefers-reduced-motion)` belt-and-braces guard. Sprite-tint contrast as an art-direction escalation → §8.2. `interpolation.ts` needs `desync-guard` review → §9.6. | Nothing material rejected. Its self-flagged DOM-churn inference is not load-bearing — the cut rests on 0 `eventMode` hits and the mouse-move deactivation, both cited. **Net: owns §2.5 and §2.7 outright and supplied the strongest single cut.** |
| **B6 — research: decision corpus and neighbouring milestones** | **The M24 collision as a NAMED dependency**, not a hypothesis (ADR-0033 and `M24-internationalization.spec.md` both say "a11y copy (M23) flows through the catalogs") → §2.8. The `t(key)` + flat-`Record` seam with its **own over-speculation guardrail** (no ICU; enumerate `a11y.count.one`/`.other`) → §2.8, `[A11Y-02]`'s brace ban, A11Y-3. `client/src/ui/helpModel.ts`'s "typed TS const, NOT a RON file (YAGNI)" as the reusable copy convention → §2.8, S0. The **17th-`OverlayId` mechanical cost** (totality ripple + ADR-0139 fan-out symmetry gate) → §2.9, §3, §8.5 — what makes the settings-overlay cut concrete rather than taste. Settings must not live on the read-only store (ADR-0014) → §2.9. `OVERLAY_A11Y` total from the first commit → §2.1. The **M19 placement ruling** (a non-normative section plus an `M19-social.spec.md` addendum, never in the EARS table) → §7, including all three M19 criteria. The ADR-0032 verdict: **elaboration; the plank is DORMANT, not wrong** → §3. | Its "41 `localStorage` hits" → flatly false; there is one hit and it is a comment (`client/src/net/authToken.ts:126`). Its persistence conclusion is discarded and replaced by "no store at all" (§2.9). Its ADR-0135-vs-`setAttribute` landmine → verified and refuted (§9.8) — no per-view test inspects attributes, so the pre-wiring verification step it wanted is unnecessary friction. **Net: the only genuinely cross-milestone contribution, plus the cost model that justifies the largest cut — and one flatly wrong fact.** |

**Calibration note for the 6-vs-4 question, on this run's evidence.** The load-bearing content came from
**B2** (architecture), **B4** (§5 entire), **B5** (§2.5/§2.7 and the biggest cut), **B3** (the headline
defect and the conformance boundary) and **B6** (the M24 seam and the cut's cost model) — five lenses,
each with content no other lens produced. **B1, the deliberately un-grounded lens, produced six small
criteria and two escalations and zero adopted architecture**, and three of its four architectural
proposals were falsified (two by its own self-review, one by cited code). On this run the marginal lens
was the **un-grounded** one, not the sixth one — which argues for keeping six lenses but grounding all
of them, rather than for cutting to four.

## 11. Ceremony input of record — the original sketch (preserved verbatim, 2026-08-23)

The text below is the pre-ceremony design sketch exactly as it stood at `origin/main` before this
ceremony ran, including its 2026-08-23 recency check. It is preserved unedited as the ceremony's input
of record; where it conflicts with §§1–9, §§1–9 govern.

---

## Problem / intent
Make the game playable + legible for keyboard, screen-reader, colorblind, and motion-sensitive players — a
gated property, leveraging the architecture's affordances.

## Scope (condensed)
- **Keyboard:** full operation of all menus/overlays; visible focus + logical order/trapping; remappable keys.
- **Screen readers:** the **DOM-overlay menus** (ADR-0014) carry roles/labels/ARIA; battle events via live
  regions; canvas interactives via the **`pixijs-accessibility`** mirror.
- **Color independence:** affinity/status by **icon/text + color**, never color alone; a colorblind palette.
- **Reduced motion:** a `prefers-reduced-motion`-default option that **snaps** instead of interpolating — a
  switch on the **ADR-0013 visual layer only** (netcode correctness untouched).
- WCAG-AA contrast + text scaling; an automated a11y check + manual checklist gate.
- **Out of scope:** controller/switch access; audio captions (no audio yet).

## Key design + boundary
The DOM-overlay-menus decision (ADR-0014) and the visual/netcode split (ADR-0013) make a11y *cheap* — menus
are real HTML, reduced-motion is a clean visual switch. A11y copy **composes with i18n (M24)**.

## Risks / decisions
Color-only info → icon/text + color. Reduced-motion breaking netcode → visual-only switch. Inaccessible canvas
→ DOM overlays + `pixijs-accessibility` (don't make the WebGL scene a screen-reader target).

## Recency check (2026-08-23, review pass — ceremony AUTHORIZED, PLAN.md §9)

The DOM-overlay-menus premise this sketch leans on (ADR-0014) is **more concrete today** than when written:
`M-postgate-ux-design`'s uxd3 (ADR-0162–0164, merged) built the actual substrate —
`client/src/ui/overlayRegistry.ts` + a `canOpen` modality-policy reducer unifying what were ~15 open-coded
overlay-guard sites, opened via a pinned `KeyM` two-level main menu. Ceremony time should retrofit
roles/labels/ARIA into **this real registry**, not a hypothetical future overlay system — read
`overlayRegistry.ts`/`overlayRegistry.test.ts` directly rather than re-deriving the menu shape from ADR-0014
alone. The retrofit-into-M19 sub-scope stays explicitly **conditional/deferred**: M19 (guilds/chat/social)
remains unbuilt (`blocked:playtest-gate`), so write its a11y criteria as forward-looking (what M19's chat/
guild UI must satisfy *when* it builds) rather than criteria this milestone can gate today — don't let that
sub-scope block the rest of M23's ceremony or implementation. M4/M7 retrofit scope is unaffected (both
built, stable). ADR-0013's visual/netcode split (the reduced-motion switch's foundation) is unchanged.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.

---

## 12. Notes for the runner

- **Build from §§1–9.** §§10–11 are the ceremony's record, not requirements.
- **Order matters more than parallelism here.** The spine in §4 is real: S5 is the sole
  `client/src/main.ts` touch and gates S6/S8/S9. Fan out only the pairs §4 names as disjoint.
- **S0 reserves project ADR-0205** and writes per-slice ADRs from there onward; ADR-0032 (harness) is
  the design authority and is elaborated, not re-decided or renumbered.
- **Two slices carry a mandatory extra reviewer:** S7 (`desync-guard`, §9.6) and S8 (blocked on the two
  §8 rulings). Do not start S8 before both are answered.
- **Do not "simplify" the `document.body` disjunct out of `worldHasFocus()`** — §2.3 and A11Y-35
  explain why it is load-bearing; dropping it kills every hotkey after a dialogue ends.
- **§9.7 is an in-slice boy-scout item for S3**, not a separate slice.
