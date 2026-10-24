---
title: PixiJS v8 ecosystem vetting — asset pipeline, UI, layout, tilemap, filters, Spine — and DOM vs in-canvas UI
slug: pixijs-ecosystem-ui-and-assets
domain: toolchain
tags: [pixijs, assetpack, pixi-react, pixi-layout, pixi-ui, tilemap, pixi-filters, spine, skeletal-animation, dom-overlay, game-ui, accessibility, hd-2d, licensing]
status: active
updated: 2026-10-24
confidence: medium
sources: 47
supersedes:
abstract: "Verdicts on 8 PixiJS v8 ecosystem libs (assets, UI, layout, tilemap, filters, Spine) + DOM-vs-canvas UI guidance"
---

## Scope

A **project-agnostic** vetting of the PixiJS v8 *ecosystem* (not the core renderer, which is
covered by [[pixijs-2d-rendering]]): eight libraries a browser-game team commonly considers
when it wants better menus, art pipelines, effects, and animation. Each gets: what it does,
maturity/maintenance (versions and dates verified against the npm registry and GitHub API on
2026-10-24), API sketch, strengths, gotchas, alternatives, and a **use / avoid / defer**
verdict with reasoning. It also answers the cross-cutting question those libraries raise —
**DOM overlay vs in-canvas UI** — and the accessibility consequences of each.

Assumed reader context (state your own and re-weigh): a TypeScript client with an
*imperative* (non-React) architecture, Pixi used for the world/scene layer, a pixel-art
look with aspirations toward an "HD-2D" finish ([[top-down-2d-art]]), a small team, and a
non-commercial / open-source posture. Where the verdict flips under a different context, it
says so. Pairs with [[accessibility-interactive-apps]], [[internationalization-localization]],
[[console-style-game-controls]], [[game-content-pipelines]].

---

## Key findings

### 0. Verdict table (as of 2026-10-24)

| # | Library | Latest (date) | Verdict | One-line reason |
|---|---|---|---|---|
| 1 | `@assetpack/core` | 1.7.0 (2025-11-07) | **DEFER** | Real value only once art volume exists; one dominant maintainer, quiet for ~11 months, heavy native/deprecated dep tree, pixel-art-hostile defaults |
| 2 | `@pixi/react` | 8.0.5 (2025-12-01) | **AVOID** (for an imperative non-React client) | Adds React 19 + a reconciler as a second owner of the scene graph; solves a problem an imperative render loop does not have |
| 3 | `@pixi/layout` | 3.2.1 (2026-06-12) | **DEFER** | Healthy and good, but only pays off if UI moves *into* the canvas; CSS already does flexbox better in the DOM |
| 4 | `@pixi/ui` | 2.4.1 (2026-10-01) | **AVOID** as the menu foundation / **DEFER** for HUD widgets | Active, but no accessibility, no gamepad/spatial focus, canvas-drawn text input, no i18n story |
| 5 | `@pixi/tilemap` | 5.0.2 (2025-07-14) | **DEFER** | Userland, one release in 15 months, open v8 bugs (render groups, `roundPixels`, redraw leak); plain sprites + chunk caching suffice at small/medium map size |
| 6 | `pixi-filters` | 6.1.5 (2025-11-29) | **USE** (selectively, profile-gated) | Best-fit library: tree-shakable subpaths, WebGL + WebGPU programs, covers bloom / god-rays / grading / tilt-shift; budget every pass |
| 7 | `@pixijs-userland/spine-layout` | 0.4.1 (2026-09-17) | **AVOID** | Created Apr 2026, 0.x, one author, 1 star, no license metadata, npm presence unconfirmed, needs Spine 4.3 |
| 8 | Spine Runtimes (4.2 / 4.3) | 4.3.13 (spine-pixi-v8) | **DEFER / AVOID** for a non-commercial open-source project | Runtime use is legally conditional on a *paid per-seat Editor license*; derivative-work rules conflict structurally with open contribution; frame animation is the free, genre-appropriate default |

### 1. `@assetpack/core` — asset pipeline

**What it does.** A plugin-based, tag-driven build-time asset pipeline from the PixiJS team
("a configurable asset pipeline for the web"; engine-agnostic). Built-in pipes: cache-buster
(content hashes), compression (sharp → WebP/AVIF/PNG/JPG; GPU formats ASTC/ETC/BCn/Basis),
mipmaps, texture-packer (spritesheets), JSON minify, webfont (woff2, SDF, MSDF),
audio/FFmpeg, Spine atlas mipmaps, and a **manifest** pipe that emits a Pixi `Assets`
manifest. Tags on folder/file names (`{tps}` = pack a spritesheet, `{copy}`, `{ignore}`,
`{fix}`, `{nomip}`) or a `metaData` config field select behavior. Needs Node 20+.

**Maturity.** MIT. 1.7.0 released 2025-11-07; last push the same day; ~170 stars, 48 open
issues. Contributor concentration is high: one maintainer (Zyie) has ~129 of the top-10
contribution count; recent commits come from three authors. Release cadence in 2025 was
roughly monthly (1.4.0 Feb → 1.7.0 Nov) and then **nothing for ~11 months** as of this
writing. Release notes never mention Pixi v8 explicitly (it is the assumed target).

**API sketch.**
```js
// .assetpack.js
import { pixiPipes } from '@assetpack/core/pixi';
export default { entry: './raw-assets', output: './public/assets',
  pipes: [...pixiPipes({ /* resolutions, texturePacker, manifest… */ })] };
```
Run via CLI, programmatic API, or Vite. **There is no published Vite plugin package** (the
npm lookup for `@assetpack/plugin-vite` returned 404); the docs show a ~30-line local Vite
plugin snippet that runs `watch()` in dev and `await run()` once in build.

**Strengths.** Declarative atlas packing with trimming, rotation, extrusion-free padding
(default 2 px), multi-sheet splitting at 4096; "each asset transformed once" caching so raw
art can live in git and be processed in CI; MSDF font generation for crisp in-canvas text;
cache-busting; manifest generation that plugs into `Assets` bundles; numeric-suffix
animation auto-detection (`frame_01`, `frame_02` → an animation).

**Gotchas.**
- **Pixel-art-hostile defaults.** Texture-packer defaults: `allowRotation: true`,
  `allowTrim: true`, `padding: 2`, resolution variants `{ default: 1, low: 0.5 }` — i.e. it
  *will* generate half-resolution mip variants, which downscale pixel art. `{nomip}` / `{fix}`
  exist but `{fix}` changed behavior in 1.4.0 (it now resizes to `fixedResolution`; use
  `{nomip}` for the old copy-only meaning). `extrude` support was not confirmed in docs.
- **Heavy, partly deprecated dependency tree.** 32 runtime dependencies including `sharp`
  (native), `@ffmpeg-installer/ffmpeg` (downloads a binary) and `fluent-ffmpeg`, which npm
  marks **"Package no longer supported"**. Dev-time only (never ships to the browser), but it
  widens the supply-chain surface — relevant for repos that allowlist install scripts.
- Pixel-art compressed-texture formats (Basis/ASTC) are mostly irrelevant; the wins are
  atlas packing, hashing, fonts, and a generated manifest.
- Bus factor ~1 and a gap in releases; a pipeline you cannot easily fork is a risk.

**Alternatives.** Aseprite CLI sheet export (plus a hand-written manifest); TexturePacker
(commercial, mature); `free-tex-packer-core` (MIT, unverified this session); `sharp` +
a small script; Vite's own content hashing for cache-busting.

**Verdict — DEFER.** While art is procedural/placeholder there is nothing to pack. Adopt
when there are dozens of authored sprites/tiles and a real atlas step is wanted; then enable
**only** texture-packer + manifest + cache-buster (+ webfont/MSDF if in-canvas text is
needed), force `{nomip}`, set `allowRotation: false`, keep it a `devDependency`, and pin the
version. Re-check maintainer activity before adopting.

### 2. `@pixi/react` — React JSX wrapper

**What it does.** A custom React reconciler so Pixi display objects are JSX:
`extend({ Container, Sprite })` registers classes (tree-shaking), then
`<Application><pixiContainer><pixiSprite texture={t} /></pixiContainer></Application>`;
hooks `useApplication`, `useTick`, `useExtend`. Official description: "a thin wrapper around
Pixi.js … Everything that works in Pixi.js will work here without exception."

**Maturity.** 8.0.5 (2025-12-01); v8.0.0 shipped 2025-02-28 (v7-style API removed,
unprefixed elements opt-in). ~2.9k stars, MIT; repo pushed 2026-01-16. Peer deps:
**`react >= 19`**, `pixi.js ^8.2.6`; depends on `react-reconciler 0.31.0` + `its-fine`.
Maintainers: Zyie, bigtimebuddy, plus legacy v7 maintainers. Release gap since Dec 2025.

**Honest fit assessment for a non-React imperative-TS client.** Adding it is *not* wise
unless the team is already React-centric:
1. **Second owner of the scene graph.** An imperative world renderer (view registry,
   interpolation, per-frame position writes from a ticker) already owns object lifecycle.
   React's reconciler would also want to own it; mixing the two produces ownership bugs.
2. **No problem to solve.** React's value is declarative state→UI diffing for *UI-shaped*
   trees. A game world updated from a render loop at display rate gains nothing and risks
   per-frame reconciliation cost and GC churn.
3. **Wrong layer for the actual pain.** If the goal is consistent menus, React *DOM*
   (or Preact/Lit/Solid/Svelte) in the overlay is the relevant decision — `@pixi/react` is
   about Pixi-in-React, not React-in-the-page. These are different adoptions with different costs.
4. **Cost.** React 19 + reconciler + a JSX toolchain, a rewrite of tested pure-model/dumb-view
   code, and loss of framework-free unit tests. (Bundle impact not measured — measure with the
   bundler's analyzer before deciding.)
5. **Coupling.** `@pixi/layout` v3 has first-class React typings/elements, which can pull a
   team toward React; do not let a layout library decide the app framework.

**Alternatives.** Keep imperative TS with a small view-model/view split; if declarative DOM UI
is wanted, evaluate a tiny reactive DOM library (Preact ≈ React API, Lit, Solid) as a *separate*
decision.

**Verdict — AVOID** (reconsider only if the whole client becomes React).

### 3. `@pixi/layout` — Yoga flexbox for Pixi

**What it does.** Opt-in CSS-flexbox layout for Pixi scene objects, powered by Facebook's
Yoga. `import '@pixi/layout'` *before* creating the app (applies mixins), then set a
`layout` property: `new Container({ layout: { width: 500, justifyContent: 'center',
flexWrap: 'wrap', gap: 8 } })`, `new Sprite({ texture, layout: true })`. Supports
`objectFit`/`objectPosition`, `overflow: scroll`, percentage sizes, `backgroundColor`,
`borderRadius` (the last three only via `LayoutContainer`/`LayoutSprite` components).

**Maturity.** 3.2.1 (2026-06-12); v3.0.0 (2025-04-29) was a **ground-up rewrite** (v2 → v3 is
breaking). MIT, 169 stars, 29 open issues. Peer deps: `pixi.js ^8`, **`yoga-layout ^3`**
(WebAssembly; v3's default entry needs top-level-await support, otherwise use
`yoga-layout/load` and `await` it — package ~224 KB unpacked, gzipped runtime cost not
measured). Optional peer: `@pixi/react`. Main author CyberDex (232 commits) + Zyie (55).

**Strengths.** Real flexbox semantics in-canvas: responsive panels, wrapping grids,
alignment, scroll containers without hand-written math. Pairs with `@pixi/ui` components
conceptually (both by the same authors), though no documented joint integration was found.

**Gotchas.**
- Layout-enabled objects **ignore `anchor` and `pivot`**; position is forced to (0,0), scale
  to 1 — use `transformOrigin`. Never enable it on world/entity containers; it is for UI trees.
- Leaf nodes default to `'intrinsic'` size, measured from bounds; docs warn this has a cost
  and recommend **fixed sizes for large trees**.
- Rotating a container already in layout does not trigger relayout.
- `backgroundColor` / `borderRadius` / `overflow` need the Layout component variants.
- Adds a WASM dependency to the main bundle path.

**Alternatives.** CSS flex/grid in a DOM overlay (superior text, zoom, a11y); hand-rolled
anchor/percent layout in the resize handler; `@pixi/ui`'s `List`/`ScrollBox` for simple stacks.

**Verdict — DEFER.** Worth adopting if (and only if) a decision is made to put
substantial UI *inside* the canvas. For DOM-overlay UI it is redundant.

### 4. `@pixi/ui` — UI components

**What it does.** A component kit: `Button`, `FancyButton`, `CheckBox`, `RadioGroup`,
`Switcher`, `Slider`, `DoubleSlider`, `ProgressBar`, `CircularProgressBar`, `List`,
`ScrollBox`, `Select`, `Input`, `MaskedFrame`, plus (per source listing) `Dialog` and
`Drawer` (added in the 2.3/2.4 line). Signals-based events: `button.onPress.connect(fn)`.
Subpath imports (`@pixi/ui/Button`) and `sideEffects: false` allow tree-shaking.

**Maturity.** 2.4.1 (2026-10-01; 2.4.0 same day: new Drawer, mobile `Input` fixes, built-in
signals replacing `typed-signals`, **breaking for `Input` subclasses**). MIT, 325 stars, 10
open issues; peer `pixi.js ^8.6.2`; dep `tweedle.js`. Main author CyberDex (335 commits).
Version map: Pixi 7 ↔ UI 1.x; Pixi 8 ↔ UI 2.x. Healthy cadence.

**Strengths.** Quick path to buttons/sliders/scroll lists in-canvas; Storybook sandbox with
copy-paste code; extensible classes; active maintenance.

**Gotchas / gaps (none addressed on the official landing page).**
- **No accessibility** story and **no gamepad / spatial-navigation focus model** — Pixi's own
  accessibility layer is Tab-order only. A console-style D-pad menu needs a custom focus
  manager regardless of library.
- **`Input` is canvas-drawn text entry** — IME composition, mobile virtual keyboards,
  selection, autofill, and paste are exactly what native `<input>` gives free; the 2.4.0 notes
  show mobile `Input` was still being fixed.
- No theming/i18n/RTL layer; text is Pixi `Text`/`BitmapText` (glyph coverage and wrapping are
  your problem — see [[internationalization-localization]]).
- Using it does *not* by itself yield consistent screens; consistency comes from a shared
  component contract + design tokens, whichever layer hosts the UI.

**Alternatives.** Native DOM + CSS (+ a small component kit); Pixi core `NineSliceSprite` +
`BitmapText` for bespoke frames; engine-agnostic UI frameworks in a DOM overlay.

**Verdict — AVOID as the foundation for menus/dialogs/forms** where an accessible DOM-overlay
UI exists or is desired. **DEFER** as a source of in-canvas *HUD* widgets (progress bars,
sliders) if those are ever drawn diegetically.

### 5. `@pixi/tilemap` — tilemap renderer

**What it does.** Low-level rectangular tilemap rendering from a spritesheet:
`const tm = new CompositeTilemap(); tm.tile('grass.png', 0, 0);` — a lazy composite of
fixed-texture-count `Tilemap` layers drawn with a custom batched shader/geometry (aimed at
very large maps; RPG-Maker lineage). Pixi 8 ↔ tilemap 5.x.

**Maturity.** 5.0.2 (2025-07-14); v5.0.1 (2024-04-14) was the first v8 release; **one release
in ~15 months**, last push 2025-07-14. Peer `pixi.js >= 8.5.0`. MIT, 331 stars, 51 open
issues. Lives in `pixijs-userland`, which the official ecosystem page says "may not be up to
date with the latest PixiJS releases." Top contributors are original/early authors
(ivanpopelyshev 138, ShukantPal 88); current activity is minimal. Peer range is open-ended,
so compatibility with the current 8.22 line is **plausible but not verified** by a release.

**Open v8-specific issues worth knowing** (from the issue tracker, 2026-10-24):
- Position does not follow parent when the parent is an `isRenderGroup` container (#161) —
  render groups are a recommended v8 perf tool ([[pixijs-2d-rendering]] §6).
- Cleaning/updating a tilemap needs `renderGroup.onChildUpdate` (#164).
- Tilemap does not honor the renderer's **`roundPixels`** (#165) — matters for pixel art.
- Moves the wrong distance when `app.stage.position` changes (#167); redraw memory-leak
  report (#169); index buffer recreated on change for big maps (#168); multi-tilemap
  movement interference on WebGPU (#166).
- A 16k-tiles-per-tilemap limit (lifted with 32-bit indices) and a fixed textures-per-tilemap
  cap (settings noted as "temporarily switched off" in the README).
- README's "out-of-the-box canvas fallback" predates v8; Pixi's own renderer table lists the
  Canvas renderer as "coming soon" — do not rely on it.

**Why it's often unnecessary.** Pixi v8's retained scene graph makes *static* content nearly
free: the official benchmark shows 100k static sprites at ~0.12 ms CPU/frame
([[pixijs-2d-rendering]] §6). For small/medium tile grids, plain `Sprite`s from one atlas in
a `Container`, optionally per-chunk `cacheAsTexture` and explicit culling, give 1–2 draw
calls per chunk with no extra dependency and no custom shader to fight when adding lighting.
(That last clause is an inference: a custom tilemap shader can complicate a per-pixel
lighting pass; filters on a parent container still work.)

**Alternatives.** Sprites-in-chunks + `cacheAsTexture` (above); `ParticleContainer` with a
single-atlas `Particle` per tile for very large static layers; a custom `Mesh` with an
instanced tile geometry.

**Verdict — DEFER.** Revisit only if profiling shows tile rendering as the bottleneck on
large maps. If adopted, pin the version, avoid combining with render groups until #161 is
retested, and verify `roundPixels` behavior visually.

### 6. `pixi-filters` — effects (HD-2D relevance)

**What it does.** A community-authored (but pixijs-org-hosted) collection of ~40 custom
filters: Adjustment, **AdvancedBloom**, Ascii, BackdropBlur, Bevel, Bloom, BulgePinch,
**ColorGradient**, **ColorMap** (LUT), ColorOverlay, ColorReplace, Convolution, CrossHatch,
CRT, Dot, DropShadow, Emboss, Glitch, Glow, **Godray**, Grayscale, **HslAdjustment**,
**KawaseBlur**, MotionBlur, MultiColorReplace, OldFilm, Outline, Pixelate, RadialBlur,
Reflection, RGBSplit, Shockwave, **SimpleLightmap**, SimplexNoise, **TiltShift**, Twist,
ZoomBlur. Pixi core ships only Alpha, Blur, ColorMatrix (sepia/kodachrome/etc. presets),
Displacement, Noise.

**Maturity.** 6.1.5 (2025-11-29; 6.1.4 touched a MotionBlur *WebGPU* shader); peer
`pixi.js >= 8.0.0-0`; MIT; ~1.1k stars; last push 2026-02-13. Top author bigtimebuddy (237
commits), a PixiJS core maintainer. Pixi 8 ↔ filters 6.x. Per-filter **subpath exports**
(`pixi-filters/advanced-bloom`, `/godray`, `/color-map`, …) allow tree-shaking.
In source, the four filters inspected (AdvancedBloom, Godray, ColorMap, ColorGradient) each
construct **both a `GlProgram` and a WGSL `GpuProgram`**, so they run on either backend;
the README itself makes no WebGPU statement.

**API sketch.**
```ts
import { AdvancedBloomFilter } from 'pixi-filters/advanced-bloom';
world.filters = [new AdvancedBloomFilter({ threshold: 0.5, bloomScale: 1, blur: 8, quality: 4 })];
world.filterArea = app.screen;           // skip per-frame bounds measurement
// GodrayFilter does not self-animate: advance `filter.time` in your ticker.
```

**HD-2D effect map** (what to reach for; see [[top-down-2d-art]] for the look itself):

| Wanted effect | Candidate | Notes |
|---|---|---|
| Bloom / glow on lights, magic | `AdvancedBloomFilter` (extract bright → Kawase blur → composite); `GlowFilter` per-object | Pixi renders 8-bit LDR, so "bright" is display-referred; author an explicit emissive/highlight design rather than expecting HDR bloom (inference) |
| God-rays / light shafts | `GodrayFilter` (angle, gain 0.5, lacunarity 2.5, parallel or point-source `center`, `time`) | Noise-driven *screen-space* shafts, not occlusion-aware volumetric light (inferred from its parameter set: no occluder input) |
| Colour grading / mood / time of day | `ColorMapFilter` (LUT texture + `mix`), `AdjustmentFilter`, `HslAdjustmentFilter`, `ColorOverlayFilter`, core `ColorMatrixFilter` | `ColorMapFilter` is the real "LUT grade"; LUT slice layout not documented — confirm from the shader before authoring LUTs |
| Gradient tint / vignette | `ColorGradientFilter` (linear / radial / conic, stops, `replace`, `maxColors` for posterized steps) | Radial type gives a vignette |
| Tilt-shift / depth-of-field feel | `TiltShiftFilter` | Fake DoF (no depth buffer); the signature HD-2D miniature look |
| Simple 2D lighting | `SimpleLightmapFilter` (multiply by a lightmap texture) | Not normal-mapped |
| Normal-mapped dynamic lights | **Not in pixi-filters**; the community `pixijs-userland/lights` plugin has **no confirmed v8 release** (latest tag v4.1.0, 2023-07, "PixiJS v7+"; last push 2024-12) | Plan a custom filter/mesh shader (GLSL + WGSL) or verify the plugin on v8 before depending on it. This tempers the sibling reference's recommendation of that plugin |

**Gotchas.**
- **Every filter is a render pass** ("Filters are expensive, using too many will start to slow
  things down" — official performance tips). Set `filterArea`, null out `filters` when idle,
  prefer one filter on a *layer* over many on entities, and put effects behind a
  quality-tier / reduced-effects setting (also an accessibility need: bloom/flash/shake).
- Filters on pixel art: confirm they do not smear texels at non-integer scale; keep
  filtered layers at the integer-scaled resolution you want the effect computed at.
- Library quirks seen in source: `GodrayFilter` `center` default is a shared object
  (mutating `centerX/Y` on a default-constructed instance can mutate the static default —
  pass a fresh object); AdvancedBloom's doc comments disagree with its coded defaults
  (threshold comment says 1, code 0.5; blur comment says 2, code 8) — read the code.
- Maintenance is steady but not rapid (last release Nov 2025).
- WebGPU: Pixi's official renderer table still lists WebGPU as "Experimental … recommended to
  use the WebGL renderer for production," so treat dual-program coverage as insurance, not a
  reason to ship on WebGPU.

**Alternatives.** Hand-written `Filter` with `GlProgram`/`GpuProgram` (full control, more
work); `RenderTexture` + `Mesh` post pass; engine-level post stacks if the stack ever changes.

**Verdict — USE, selectively.** Import only the subpaths needed; gate behind a profile and a
settings toggle; keep effects an additive render-layer concern.

### 7. `@pixijs-userland/spine-layout` — Spine composition framework

**What it does.** A `SpineLayout` container that orchestrates Spine skeletons with controllers
for animation states/events (folder-name conventions like `state_idle`, `event_win`), skins,
bone/slot queries, text binding, nested scene composition, pointer-following bones and
orientation changes; `createInstancesFromManifest(manifest, 'spines')`. Optional Howler audio
peer. Default entry targets **Spine 4.3** + `@esotericsoftware/spine-pixi-v8`; a legacy
`/pixi4` entry targets Pixi 4 / Spine 3.8. Particles are no-ops on the v8 entry (no v8 emitter).

**Maturity — very low.** Repo created 2026-04-27; v0.1.0 prerelease 2026-08-24, v0.4.1
2026-09-17 (five minor versions in under a month, with breaking changes such as an
`attachBones()` signature change in 0.3.0); **1 star, 0 forks**, 2 open issues; **GitHub
reports no license** (`license: null`; package.json says MIT); the last five commits are one
author. The README gives no install command and **an npm registry lookup for the scoped name
returned 404** — publication is unconfirmed. Peers: `spine-pixi-v8 ^4.3.7`, `pixi.js ^8.19.0`,
`howler ^2.2.4`. Example themes (reels, win events) suggest a slot/casino-style origin.

**Verdict — AVOID.** Pre-1.0 churn, bus factor 1, unclear licensing/publication, and it
inherits the full Spine license burden (§8) plus a Spine-4.3 pin. Compose Spine scenes
directly with the official runtime if Spine is ever chosen.

### 8. Spine Runtimes (EsotericSoftware) — and the license constraint

**What it is.** Esoteric Software's commercial 2D skeletal-animation editor plus open-*source-
available* runtimes. The official Pixi v8 runtime is `@esotericsoftware/spine-pixi-v8`
(announced 2024-11-07, developed with the PixiJS team). Current: **4.3.13**, peer
`pixi.js ^8.16.0`, license field `LicenseRef-LICENSE` (GitHub reports `NOASSERTION`).
The runtimes repo's default branch is **4.3** (branches 4.2 and 4.3 both live); repo pushed
2026-10-21; 5.3k stars. The community `pixi-spine` v8 repo was archived 2026-02-04 and
folded into the official one (per a secondary source; migration = swap imports).
**Version rule:** an exported skeleton's editor `major.minor` must match the runtime's
(`4.2.x` export ↔ `4.2.x` runtime; `4.3.x` ↔ `4.3.x`); older exports are "not guaranteed
nor supported" on newer runtimes. The operator-linked 4.2 branch is the *previous* train; the
docs recommend pinning `~4.2.0` for it and, from 4.3, `new Spine({ skeleton, atlas })`
(the `Spine.from()` form is deprecated in 4.3, removal scheduled for 4.4).
```ts
Assets.add({ alias: 'rig-skel',  src: 'rig.skel' });
Assets.add({ alias: 'rig-atlas', src: 'rig.atlas' });
await Assets.load(['rig-skel', 'rig-atlas']);
const rig = new Spine({ skeleton: 'rig-skel', atlas: 'rig-atlas' }); // 4.3+
stage.addChild(rig);
```

**The license (verify at the source; this is a summary, not legal advice).**
- **The runtimes may not be integrated without a valid, paid Spine Editor license.** Editor
  License Agreement §2.1(b)/§2.4: you may integrate the runtimes into a Product only if you
  "have a valid Spine Editor license at the time the Spine Runtimes are integrated"; §2.4
  repeats that a license is required to integrate them or create derivative works. The
  Spine Runtimes License Agreement (April 2025 text) otherwise states that "each user of the
  Products must obtain their own Spine Editor license." The **free trial grants no runtime
  rights** (§1.4.1).
- **Price and seats** (purchase page, 2026-10-24): Essential **$69** (list $99), Professional
  **$379** (list $449), "each named person … requires their own license"; Essential lacks
  meshes and other advanced features (and cannot save/export projects using Professional
  features). Updates are free. **Enterprise** ($2,499 + $379/user, annual term) is mandatory
  at ≥ $500k annual revenue/financing. The **Education** license "may not be used for any
  commercial purpose" and is restricted to accredited institutions. **There is no free,
  hobby, or open-source tier.**
- **Distribution is fine; modification is not.** Players need nothing. A third party may
  redistribute your unmodified Product with the Exhibit A license text, but may not "modify,
  adapt, or create derivative works containing the Runtimes" without their *own* Editor
  license (§2.3); the SDK/toolkit example in §2.4 says each user of a toolkit that embeds
  the runtimes must hold a license. Spine's FAQ answer is consistent: others may distribute
  "as long as they don't modify it or use it to create new products."
- **Implication for an open-source / non-commercial project (my reading, flag for
  confirmation with Esoteric Software):** the cost ($69–$379 per integrating named person)
  is small, but the *structure* conflicts with open contribution — any contributor who
  forks and modifies the code that integrates the runtime is arguably creating a derivative
  work needing their own license; the runtime itself is not under an OSI license so it cannot
  be relicensed with the project; and a hired artist's own license does not cover the
  *integrator's* obligation (§2.2/§2.4 key on who integrated). Keep the runtime an
  external npm dependency (never vendored/forked), keep the project's own license
  explicit about the exception, and get written clarification before committing.
- Spine staff have said they would like to revise the license "to make it usable on websites"
  but gave no timeline — web distribution terms may shift.

**Free / cheaper alternatives (ranked for a pixel-art monster-battler-style project).**
1. **Frame-by-frame sprite-sheet animation** — the genre-native approach (see
   [[top-down-2d-art]] animation sections). Tools: Aseprite (~$19.99 one-time per secondary
   sources; source-available EULA, compiling for *personal* use is permitted, redistributing
   builds is not), LibreSprite / Pixelorama (free forks/alternatives; not re-verified here),
   TexturePacker or AssetPack's packer. In Pixi: `Spritesheet` with an `animations` map +
   `AnimatedSprite`. **Aseprite JSON caveat:** its export is TexturePacker-like but not
   identical and carries tags under `meta.frameTags`; Pixi wants an `animations` map, so
   budget a small converter (export with Tags in meta, frame keys `{frame}`).
2. **Transform/shader-driven "puppet" animation** — squash-stretch, bob, flip, hit-flash,
   palette swap via tweens and filters on static sprites; `MeshRope`/`MeshPlane` for cheap
   deformation. Zero license cost; strong for low-frame-count pixel art.
3. **DragonBones** — runtime is MIT (DragonBonesJS repo: 857 stars, last push 2026-01-23,
   82 open issues), but the vendor (Egret) is described by its own community Pixi-v8 port as
   having "abandoned DragonBones … from years ago"; that port (`dragonbones-pixijs` 1.0.5,
   ISC on npm vs MIT in README, single maintainer, "next-gen features coming soon") is
   community-run. **Not recommended for new work** except as a stopgap.
4. **Rive** — MIT runtimes (`@rive-app/canvas`, `/webgl`), but it is vector/state-machine
   oriented (poor fit for pixel art) and, per a 2025-10 vendor post, **new exports moved to
   paid plans** (~$9/mo "Cadet"); not Pixi-native. Verify current terms.
5. **Spriter** (BrashMonkey; ~$59.99 on Steam per a price tracker) — skeletal, but
   development cadence and engine support unverified; low confidence.

**Verdict — DEFER; AVOID for a non-commercial open-source project unless skeletal rigs are
essential.** If the art direction later demands skeletal motion, buy Essential/Professional
for the single integrating developer, use the **4.3** train with `spine-pixi-v8` (pin
exactly; match editor `major.minor`), and re-read the license text at purchase time.

### 9. The standard answer for UI in Pixi games — DOM overlay vs in-canvas vs hybrid

There is no single canon, and the sources pull in different directions:
- **Pixi's own ecosystem** invests in *in-canvas* UI (`@pixi/ui`, `@pixi/layout`, a built-in
  accessibility overlay) and ships a `DOMContainer` (positions an HTML element from the scene
  graph's transform) that is explicitly **experimental** and a **leaf** (no nested Pixi
  children; filters/masks/blend modes do not affect the HTML).
- **Web-accessibility guidance for canvas games** says the opposite default: "Avoid
  rendering UI text on the canvas if it can be rendered in HTML instead" — canvas text is
  invisible to screen readers, not selectable, and ignores browser zoom; keep HUD values in
  DOM with ARIA and a polite live region.
- **Engines converge on hybrids:** Phaser's `DOMElement` (HTML layered over the canvas,
  recommended for "login forms, text inputs, high-resolution text"; always above or below the
  canvas, cannot be interleaved with game objects), Three.js `CSS2DRenderer` (HTML labels
  positioned from 3D scene coordinates), and Chrome's **HTML-in-Canvas** origin trial
  (Chrome 148–150; `layoutsubtree`, `drawElementImage`, WebGL/WebGPU texture upload) which
  would let DOM content be drawn into the canvas *while staying in the accessibility tree* —
  experimental, single-engine, not a production dependency.

**Decision matrix.**

| Surface | Best home | Why |
|---|---|---|
| World, sprites, particles, diegetic effects, battle scene | Canvas (Pixi) | Needs shaders, depth ordering, filters |
| Damage numbers, floating nameplates, in-world bars | Canvas (`BitmapText`/MSDF) | Tied to world coordinates; frequently updated |
| Menus, inventory, dialogue, shops, settings, forms, text input | **DOM overlay** | Text layout, i18n/IME, zoom, ARIA roles, focus, translate/find, native inputs |
| Screen-wide cinematic UI (transitions, shader-warped panels) | Canvas | DOM cannot be filtered by Pixi |
| Pixel-art "frames" around DOM content | DOM styled with CSS (`border-image`, `image-rendering: pixelated`) | Gets art-directed look without leaving DOM |

**Hybrid pattern that works** (and is the default recommendation): a single source of truth
for state (pure view-models), a *thin* DOM view per surface that renders from the model, and a
canvas world layer that reads the same model. Drive **both layers from one computed scale
factor** (e.g. expose it as a CSS custom property from the same function the canvas uses) so the
world and the chrome do not scale by different rules — mixed snap-to-integer canvas scaling and
continuous CSS scaling is a common source of "inconsistent UI" complaints. Pixel-art worlds
often want integer texel scaling for crispness while text/UI wants continuous scaling; choose
per layer deliberately, not by accident.

**What fixes "menus feel inconsistent".** A shared component contract (frame, tab strip, list,
footer hint, focus behavior) and design tokens (spacing, type scale, colors, state styles) —
*in whichever layer hosts the UI*. Swapping rendering layers or libraries does not create that
consistency; a component kit does, and a migration between layers is a rewrite-sized cost with
accessibility regression risk.

**When in-canvas UI is the right call:** no-DOM targets (some embedded wrappers lack DOM/CSS
support — raised in old Pixi forum threads), full-screen shader treatment of UI, or a
strict console-style rendering path where every pixel is art-directed. Then adopt layout + UI
libraries *and* budget for your own text input, IME, focus manager, and accessibility mirror.

### 10. Accessibility implications of the HTML layer

- **What the DOM gives free:** semantic roles/labels, native focus order, screen-reader
  support, browser zoom, high-contrast and forced-colors modes, translate/find-in-page,
  native `<input>`/IME/autofill, text selection ([[accessibility-interactive-apps]]).
- **What Pixi's in-canvas mitigation does:** the opt-in `AccessibilitySystem`
  (`import 'pixi.js/accessibility'`) overlays invisible `<div>`s over objects with
  `accessible = true` (`accessibleTitle`, `accessibleHint`/`aria-label`, `accessibleType`,
  `tabIndex`) and forwards click/hover to Pixi events. It is **Tab-order only** — there is no
  arrow-key or spatial navigation (a 2018 request for it was closed) and nothing for gamepads.
  v8.22.0 (2026-10-01) restored Tab-press activation on a fresh page, a default that had
  regressed in v8.14.0 — evidence the feature is real but lightly exercised.
- **Obligations the DOM layer creates (all standard, all testable):**
  - Modal dialogs: `role="dialog"`, `aria-modal="true"`, initial focus inside, Tab trapped,
    Esc closes, **focus returns to the invoker** (WAI-ARIA Authoring Practices). Per APG,
    "windows under a modal dialog are inert" and `aria-modal` "can prevent users of some
    assistive technologies from perceiving content outside the dialog" — so a global
    **live region that lives outside an open modal may go unannounced**; host or re-parent
    announcements inside the active dialog, or use a dialog-local live region.
  - Keep keyboard focus on the canvas/container during play; move it into an overlay on open
    and back on close (web-game ARIA guidance).
  - Throttle live-region updates (e.g. a periodic minimap summary rather than per-frame).
  - **Gamepad / D-pad menus need a custom focus model** (roving `tabindex` or
    `aria-activedescendant`, cursor memory, direction-follows-layout) in *both* approaches;
    see [[console-style-game-controls]].
  - Respect `prefers-reduced-motion` and offer reduced-effects for bloom/shake/flash.
- **Gotchas of mixing layers:** the DOM overlay sits above or below the canvas only; `pointer-events`
  pass-through must be managed so the canvas still receives world input; the build/stamp or
  debug chrome should not steal focus; filters cannot style DOM; screenshot/recording tools
  that read only the canvas omit DOM UI.

---

## Concrete examples & references

- **Pixi core UI-adjacent primitives that remove the need for a UI library for frames and
  text:** `NineSliceSprite` (scalable panel frames), `BitmapText` (fast dynamic text),
  `HTMLText`, `Text`; official performance tips: "Bitmap Text gives much better performance
  for dynamically changing text," avoid per-frame `Text` updates (each redraws a canvas and
  re-uploads), rectangle masks are fastest, sprite masks "really expensive."
- **Version snapshot** (npm registry + GitHub API, 2026-10-24): `pixi.js` 8.22.0 (2026-10-01);
  `@pixi/ui` 2.4.1; `@pixi/layout` 3.2.1; `@pixi/react` 8.0.5; `@pixi/tilemap` 5.0.2;
  `pixi-filters` 6.1.5; `@assetpack/core` 1.7.0; `@esotericsoftware/spine-pixi-v8` 4.3.13;
  `yoga-layout` 3.2.1.
- **Maintainer map (bus factor):** CyberDex → layout, ui, spine-layout; Zyie → assetpack,
  react; bigtimebuddy → filters; tilemap → original authors, now near-dormant. Concentration
  in 1–2 people per package is the norm for this ecosystem; plan to be able to fork or vendor
  anything you adopt.
- **Precedent hybrids:** Phaser `DOMElement`; Three.js `CSS2DRenderer`; Pixi `DOMContainer`
  (experimental); Chrome HTML-in-Canvas (origin trial).
- **Spine pricing source of truth:** the vendor purchase page (Essential $69, Professional
  $379, Enterprise $2,499 + $379/user; $500k revenue threshold) and the Editor License
  Agreement §§1.1–1.4, 2.1–2.4, Exhibit A.

## Design implications & transferable principles

1. **Separate the three questions people conflate:** (a) *which rendering layer hosts the
   UI*, (b) *which component library*, (c) *which app framework*. A Pixi-side library only
   answers (b) for the in-canvas case; none of the libraries here answer (a) or (c).
2. **Default to DOM for text-heavy, interactive, localizable chrome; canvas for the world and
   diegetic/shader-heavy elements.** Revisit only for a hard no-DOM target or a cinematic
   requirement.
3. **A pure view-model layer makes the hosting decision reversible.** Keep presentation
   logic in testable models and let thin views render them; then moving a surface between DOM
   and canvas is a view rewrite, not a logic rewrite.
4. **Fix inconsistency with a component kit and design tokens, not a renderer swap.**
5. **One scale authority.** Compute the display scale once and feed both canvas and CSS from
   it; decide per layer whether it snaps to integers or scales continuously.
6. **Adopt ecosystem libraries only against a measured need, and only if you can fork
   them.** Userland and single-maintainer packages are fine as pinned, vendorable
   dependencies; they are poor foundations for architecture.
7. **Treat every post-processing pass as a budgeted, toggleable, additive layer** (and a
   reduced-effects accessibility setting), consistent with an HD-2D-as-upgrade strategy.
8. **For effects Pixi does not ship (normal-mapped lights), plan a custom shader** rather
   than relying on a dormant plugin; verify dual GLSL + WGSL support.
9. **Read licenses as architecture constraints.** A per-seat, derivative-restricting runtime
   license shapes who can contribute; resolve it before the art pipeline depends on it, and
   prefer free frame-based or code-driven animation until skeletal rigs are indispensable.
10. **Prefer boring, version-pinned toolchain additions in CI-visible places** (pipeline as a
    devDependency, outputs deterministic) and re-verify maintainer activity at adoption time.

## Open questions

- **Unverified / not confirmed in this research:** gzipped/runtime bundle cost of
  `@pixi/layout` + `yoga-layout`, `@pixi/react` + React 19, `@pixi/ui`, and `pixi-filters`
  subpaths (measure with the bundler); whether `@pixijs-userland/spine-layout` is published to
  npm; `@pixi/tilemap` behavior on Pixi 8.19–8.22 (peer range allows it; no release
  confirms it); AssetPack `extrude` support and whether its 32-dependency tree will be
  refreshed; ColorMapFilter LUT slice orientation; whether `@pixi/ui` components accept a
  `layout` prop cleanly; Spriter's and Rive's *current* terms; LibreSprite / Pixelorama /
  `free-tex-packer-core` status (named from general knowledge, not re-fetched).
- **License interpretation:** whether npm-installing the Spine runtime in a public
  open-source repo, and contributors modifying integration code, requires per-contributor
  Editor licenses — ask Esoteric Software in writing.
- **Doc-consistency flags for the sibling reference** [[pixijs-2d-rendering]]: it recommends
  the community normal-map lights plugin (no confirmed v8 release; see §6) and says an
  experimental Canvas2D renderer ships in v8.16+, whereas the official renderers page
  (fetched 2026-10-24) lists WebGPU "Experimental" and Canvas "Coming soon." Reconcile on
  next refresh.
- **DOM-vs-canvas data gap:** no recent (2025–2026) benchmark of DOM-overlay cost vs
  in-canvas UI at scale; the available performance anecdotes are from 2014 forum threads.
- Does HTML-in-Canvas reach stable, cross-browser support? If so, a canvas-composited,
  accessible DOM layer could dissolve much of this trade-off.

## Sources

1. https://registry.npmjs.org/@assetpack/core/latest — AssetPack 1.7.0 deps, license (2026-10-24)
2. https://api.github.com/repos/pixijs/assetpack — stars/issues/pushed_at
3. https://api.github.com/repos/pixijs/assetpack/releases — release history 1.4.0–1.7.0
4. https://api.github.com/repos/pixijs/assetpack/contributors and /commits — maintainer concentration
5. https://pixijs.com/blog/assetpack-1.0.0 — AssetPack 1.0 announcement (pipes, tags, Node 20)
6. https://pixijs.io/assetpack/docs/guide/pipes/overview/ — pipes and tag system
7. https://pixijs.io/assetpack/docs/guide/pipes/texture-packer/ — packer defaults (padding, rotation, mip resolutions)
8. https://pixijs.io/assetpack/docs/guide/getting-started/installation/ — install, `pixiPipes`
9. https://pixijs.io/assetpack/docs/guide/getting-started/vite/ — Vite integration snippet (no packaged plugin)
10. https://registry.npmjs.org/fluent-ffmpeg/latest — npm deprecation message
11. https://registry.npmjs.org/@pixi/react/latest and https://api.github.com/repos/pixijs/pixi-react(/releases) — React peer range, history
12. https://react.pixijs.io/getting-started/ and https://react.pixijs.io/extend/ — thin-wrapper claim, `extend()`
13. https://pixijs.com/8.x/guides/getting-started/ecosystem — official ecosystem list, React 19 note, userland caveat
14. https://registry.npmjs.org/@pixi/layout/latest, https://api.github.com/repos/pixijs/layout(/releases,/contributors) — layout versions, peers
15. https://pixijs.com/blog/layout-v3 — layout v3 rewrite announcement
16. https://layout.pixijs.io/docs/guides/core/overview/ — sizing, limitations (anchor/pivot ignored)
17. https://raw.githubusercontent.com/pixijs/layout/main/README.md — API sketch
18. https://www.npmjs.com/package/yoga-layout (and Yoga 3.0 release notes) — TLA / `yoga-layout/load`; https://registry.npmjs.org/yoga-layout/latest — size
19. https://registry.npmjs.org/@pixi/ui/latest, https://api.github.com/repos/pixijs/ui(/releases,/contents/src,/contributors) — UI versions, component list
20. https://raw.githubusercontent.com/pixijs/ui/main/README.md and https://pixijs.io/ui/ — component list, version map
21. https://registry.npmjs.org/@pixi/tilemap/latest, https://api.github.com/repos/pixijs-userland/tilemap(/releases,/issues,/contributors) — tilemap versions, open v8 issues
22. https://raw.githubusercontent.com/pixijs-userland/tilemap/master/README.md — API sketch, limits
23. https://registry.npmjs.org/pixi-filters/latest, https://api.github.com/repos/pixijs/filters(/releases,/contributors) — filters versions, subpath exports
24. https://raw.githubusercontent.com/pixijs/filters/main/README.md — filter list, compat table
25. https://raw.githubusercontent.com/pixijs/filters/main/src/advanced-bloom/AdvancedBloomFilter.ts — options/defaults, GL+GPU programs
26. https://raw.githubusercontent.com/pixijs/filters/main/src/godray/GodrayFilter.ts — options, manual `time`, shared-default quirk
27. https://raw.githubusercontent.com/pixijs/filters/main/src/color-map/ColorMapFilter.ts and .../color-gradient/ColorGradientFilter.ts — LUT and gradient options
28. https://pixijs.com/8.x/guides/concepts/performance-tips and https://pixijs.com/8.x/guides/components/filters — filter/mask/text cost statements
29. https://api.github.com/repos/pixijs-userland/lights (and /releases) — lights plugin last release v4.1.0 (2023), last push 2024-12
30. https://github.com/pixijs-userland/spine-layout, its README and package.json, https://api.github.com/repos/pixijs-userland/spine-layout(/commits) — maturity, peers, license metadata
31. https://registry.npmjs.org/@esotericsoftware/spine-pixi-v8/latest — 4.3.13, `LicenseRef-LICENSE`, peer Pixi ^8.16.0
32. https://en.esotericsoftware.com/spine-pixi — runtime guide (4.2 pin, 4.3 constructor, `from()` deprecation)
33. https://esotericsoftware.com/blog/spine-pixi-v8-runtime-released — official v8 runtime announcement (2024-11-07)
34. https://api.github.com/repos/EsotericSoftware/spine-runtimes (and /branches) — default branch 4.3, license NOASSERTION
35. https://en.esotericsoftware.com/spine-purchase — prices, seats, revenue threshold, FAQ, education/trial limits
36. https://en.esotericsoftware.com/spine-editor-license — §§1.1–1.4, 2.1–2.4, Exhibit A
37. https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.2/LICENSE — Spine Runtimes License Agreement (April 2025)
38. https://en.esotericsoftware.com/spine-versioning and forum threads on `major.minor` matching (e.g. https://esotericsoftware.com/forum/d/24230-what-is-the-oficial-stand-on-old-runtimes)
39. https://github.com/aseprite/aseprite/blob/main/EULA.txt — Aseprite EULA §2(g); secondary price sources (Wikipedia; community forum) for $19.99
40. https://community.aseprite.org/t/configure-json-animation-export/1948 and related threads — Aseprite JSON vs Pixi `animations` map
41. https://api.github.com/repos/DragonBones/DragonBonesJS and https://unpkg.com/dragonbones-pixijs@1.0.5/README.md (+ npm `dragonbones-pixijs`) — DragonBones status
42. https://rive.app/blog/rive-s-new-9-mo-plan and https://npmjs.com/package/@rive-app/canvas — Rive export pricing, MIT runtime
43. https://pixijs.com/8.x/guides/components/accessibility — AccessibilitySystem; https://api.github.com/repos/pixijs/pixijs/releases — v8.22.0 notes
44. https://pixijs.com/8.x/guides/components/renderers — WebGPU "Experimental", Canvas "Coming-soon"
45. https://docs.phaser.io/phaser/concepts/gameobjects/dom-element and https://threejs.org/docs/pages/CSS2DRenderer.html — hybrid-UI precedents
46. https://developer.chrome.com/blog/html-in-canvas-origin-trial — HTML-in-Canvas origin trial (Chrome 148–150)
47. https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ and https://www.abratabia.com/game-accessibility/web-game-aria.php — modal-dialog semantics; "keep UI text out of the canvas" web-game guidance (also https://html5gamedevs.com/topic/8494-user-interface-pixi-vs-dom for the 2014 Pixi-vs-DOM thread; Pixi DOMContainer status via the pixijs-skills `pixijs-scene-dom-container` mirror, secondary)
