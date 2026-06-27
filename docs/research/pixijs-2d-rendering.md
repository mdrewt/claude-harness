---
title: PixiJS as a 2D WebGL/WebGPU rendering library — model, performance, and v8
slug: pixijs-2d-rendering
domain: toolchain
tags: [rendering, pixijs, webgl, webgpu, scene-graph, batching, texture-atlas, draw-calls, sprite, canvas2d, performance]
status: active
updated: 2026-06-27
confidence: high
sources: 12
supersedes:
abstract: "PixiJS v8 is a fast 2D scene-graph renderer over WebGL/WebGPU (not a game engine); when to choose it, how batching/atlases minimize draw calls, and the v8 rewrite's architecture and performance gains."
---

## Scope

A **project-agnostic** deep reference on PixiJS as a 2D rendering library: what it is and
is not, when to choose it over raw Canvas2D or a full framework, its rendering and
performance model (scene graph, sprite batching, texture atlases, draw-call minimization,
culling, the ticker/render loop), and the **PixiJS v8** rewrite specifically (WebGPU
backend, render-group architecture, ESM/package changes, quantified performance gains).
Written for decision and architecture audiences — not an API reference. The project's
vendored `pixijs-*` skills hold the API how-to. Pairs with [[top-down-2d-art]] (normal-mapped
lighting, atlas/batching discipline) and informs integration against
[[deterministic-simulation-architecture]] (one-way data flow, fixed-tick rendering).

---

## Key findings

### 1. What PixiJS is — and is not

PixiJS is a **2D scene-graph renderer**. It takes a tree of visual objects, traverses it
every frame, and issues batched GPU draw calls via WebGL or WebGPU. That is the full scope
of its responsibility.

It is **not** a game engine. PixiJS has no concept of physics, collision detection, audio,
scene/state management, entity-component systems, tilemaps, cameras, input handling,
tweens, pathfinding, or any other game-system. You bring your own game loop and wire game
state into Pixi objects manually. This is a feature, not a deficiency: the surface area
stays small, the bundle stays tight (~200 KB), and game logic is never entangled with
rendering concerns.

**What it does own:**
- A retained-mode scene graph (`Container` → `Sprite`, `Graphics`, `Mesh`, `Text`,
  `ParticleContainer`, etc.)
- GPU-accelerated 2D rendering via WebGL2 (production-ready) and WebGPU (feature-complete,
  still maturing as of June 2026)
- Sprite batching across up to 16 texture slots per batch
- Shader/filter pipeline (custom GLSL fragment shaders in v8 via `GlProgram.from`)
- Asset management (`Assets`), event/interaction system, accessibility overlay
- `Ticker` (a `requestAnimationFrame`-driven callback scheduler)

### 2. When to choose PixiJS

**Choose PixiJS over raw Canvas2D when:**
- The scene has hundreds or thousands of moving sprites — Canvas2D CPU-draws each element
  sequentially; Pixi batches them into one or a handful of GPU draw calls. The crossover
  point is roughly 50–100 objects for interactive apps; above that Pixi wins on every
  metric.
- Custom shaders, blend modes, filters, or normal-mapped lighting are required. Canvas2D
  has no shader surface.
- Frame rate must be stable at 60 fps with many on-screen entities.

**Choose raw Canvas2D over PixiJS when:**
- The scene is simple (a handful of shapes, a chart, a thumbnail) and adding a ~200 KB
  dependency is not justified.
- The environment has no GPU access (server-side rendering, certain headless contexts).
  PixiJS v8.16+ ships an experimental Canvas2D fallback renderer but it is not intended for
  production at the same complexity level as the WebGL path.

**Choose a full framework (Phaser, Godot, Unity) over PixiJS when:**
- You need built-in physics, audio, tilemap loading, scene state machines, tween engines,
  or input management and you do not want to assemble them from separate libraries.
- Phaser 3 internally uses PixiJS's rendering approach but bundles the full game-systems
  layer. It is more opinionated, larger (~500 KB+), and much faster to bootstrap a
  traditional game.
- Godot or Unity export targets carry 3D capability and asset pipelines that PixiJS cannot
  replicate — use them when the project has 3D ambitions or existing Godot/Unity teams.

**PixiJS is the right choice when** you want maximum rendering throughput for a 2D browser
experience and you are either: (a) building your own game systems on top of it, (b)
building an interactive app that is not strictly a game (data viz, creative tool, animated
UI), or (c) need fine control over the rendering pipeline (custom shaders, deferred
lighting passes, mixing with Three.js). The ~25 vendored `pixijs-*` skills in this project
assume PixiJS as the rendering layer.

### 3. The rendering model — scene graph and retained mode

PixiJS is **retained-mode**: you add objects to the scene graph once; the renderer
re-draws them every frame until they are removed. You never call "draw a rectangle here"
imperatively each frame.

**Scene graph primitives (v8):**
- `Container` — the only type that can hold children (v8 removed the old
  `DisplayObject` base class; leaf nodes such as `Sprite`, `Mesh`, `Graphics` are
  children-capable via wrapping in a Container, not as parents themselves).
- `Sprite` — a textured quad positioned by a transform. The primary unit of game art.
- `Graphics` — immediate-mode vector drawing baked into GPU geometry. Fast for simple
  primitives (< ~100 points); slow if modified constantly.
- `Mesh` — arbitrary vertex geometry with a custom shader. Used for deformation, waves,
  normal-map lighting passes.
- `ParticleContainer` — a flat list of lightweight `Particle` objects (not full scene-
  graph nodes). Bypasses the scene-graph overhead; capable of 1 million moving particles
  at 60 fps on modern desktop hardware (v8 benchmarks: MacBook M3, vs ~200k with
  regular Sprites + Container).
- `Text` / `BitmapText` / `HTMLText` — text rendering, with BitmapText the fastest for
  frequently-updated strings.

**Transforms are hierarchical**: position, scale, rotation, alpha, tint on a Container
cascade to all descendants. v8 adds blend-mode and tint inheritance — set
`container.tint = 'red'` and all children tint red.

### 4. The performance model — batching, atlases, and draw calls

The GPU is fast but context-switching is expensive. Every change in bound texture, blend
mode, shader, or render target forces a **batch break** — the current buffer is flushed and
a new draw call issued. Minimizing draw calls is the primary lever on rendering performance.

**Sprite batching:**
PixiJS groups consecutive sprites that share the same base texture (and blend mode and
shader) into a single draw call, submitting them as one geometry buffer. On desktop Chrome
up to 16 different textures can be included in a single batch (multi-texture batching via
`TEXTURE_ARRAY`); iOS WebGL caps this at 8. In practice: 1,000 sprites from the same
texture atlas = 1–2 draw calls regardless of count.

**Texture atlases (spritesheets):**
A texture atlas packs many logical images into one physical GPU texture. A `Sprite` is
assigned a `Texture` that describes a sub-rectangle of the atlas, not a separate upload.
All sprites referencing any frame within the same atlas share a single base texture and
can be batched together. This is the primary tool for eliminating draw calls in a game
with many different art assets. PixiJS ships the `AssetPack` tool and the `Assets` loader
to manage atlas loading. Performance tips from the official docs: "Use Spritesheets where
possible to minimize total textures."

**What breaks batches (and must be managed):**
- Different base textures in adjacent draw order (interleaving sprites from two different
  atlases)
- Different blend modes on consecutive objects (sorting by blend mode can halve draw calls)
- Filters / masks / render textures each introduce a batch break
- A `Graphics` object larger than 100 points breaks batching

Draw order matters as much as atlas packing: `spriteA / graphicA / spriteB / graphicB` =
4 draw calls; `spriteA / spriteB / graphicA / graphicB` = 2. Sorting the scene graph by
render type is a legitimate optimization strategy.

**Culling:**
v8 makes culling explicit and user-controlled. Set `container.cullable = true` and provide
an optional `cullArea` rectangle; call `Culler.shared.cull(container, viewport)` before
rendering, or install the `CullerPlugin` for automatic per-frame culling. Culling reduces
GPU draw calls when large off-screen subtrees are excluded. It is only beneficial when the
scene is **GPU-bound**; on CPU-bound scenes it costs more than it saves.

**cacheAsTexture:**
`container.cacheAsTexture(true)` rasterizes an entire container to a `RenderTexture` once
and thereafter renders it as a single sprite. Useful for complex but rarely-changing
subtrees (a detailed background layer, a tile chunk). Memory cost is one GPU texture per
cached container.

### 5. The ticker and render loop

PixiJS drives its render loop via `requestAnimationFrame` through the `Ticker` class.
The per-frame sequence is:
1. Measure elapsed time (capped by `minFPS`/`maxFPS`); call user listeners via
   `ticker.add()`.
2. Execute `onRender` handlers on scene objects (v8 replacement for the removed
   `updateTransform`).
3. Optionally cull (if `CullerPlugin` installed).
4. Traverse the scene graph, computing world transforms.
5. Walk the display list, batch consecutive compatible objects, upload geometry and
   uniforms to the GPU, issue draw calls.

**PixiJS does not own the physics/simulation tick.** For a deterministic simulation (see
[[deterministic-simulation-architecture]]), the correct architecture is:
- Run a separate fixed-timestep simulation loop (your own accumulator pattern)
- In the Ticker callback (the render step), read game state and write positions/textures
  to Pixi scene objects
- Pixi then renders what it sees; it has no write-back to game state

This one-way data flow (game state → scene objects → GPU) keeps the simulation fully
decoupled from rendering timing. The Ticker's `deltaTime` should only drive visual
animations (tween alpha, particle drift) — not authoritative game state.

Multiple Tickers are supported and useful: a `Ticker.system` (rendering) and a separate
physics ticker at a fixed Hz can co-exist. The Ticker passes itself (not raw deltaTime) to
callbacks in v8, giving callers access to both `ticker.deltaTime` (scaled) and
`ticker.elapsedMS` (unscaled wall-clock ms).

### 6. PixiJS v8 — the rewrite in detail

v8 launched 5 March 2024 (Groves and Zyie, GoodboyDigital) as the most substantial
update since the original release. As of June 2026, the current release is v8.17.x with
active maintenance.

**WebGPU backend:**
v8 implements WebGPU as a first-class rendering backend alongside WebGL2, not as a bolted-
on extension. `autoDetectRenderer()` selects WebGPU if available, falling back to WebGL2,
then (as of v8.16+, experimental) Canvas2D. As of June 2026, the WebGPU renderer is
feature-complete but the official docs mark it "experimental" with a recommendation to use
WebGL for production, due to browser implementation inconsistencies. WebGPU covers roughly
27% of the browser market at launch (Chrome desktop primarily); the expectation is broad
coverage as the spec matures. Renderer initialization is now **async** (`await app.init()`)
because WebGPU device acquisition is asynchronous. This is a v8 breaking change.

**Reactive render loop (the biggest CPU win):**
The headline performance story of v8 is the new reactive, differential update loop. In v7,
the full scene graph transform was recomputed each frame regardless of changes. In v8, only
dirty subtrees are re-traversed. Benchmarks on 100k sprites (Bunnymark):

| Scenario | v7 CPU | v8 CPU | Gain |
|---|---|---|---|
| 100k sprites all moving | ~50 ms/frame | ~15 ms/frame | 3.3× |
| 100k sprites not moving | ~21 ms/frame | ~0.12 ms/frame | 175× |
| 100k sprites (scene structure changing) | ~50 ms/frame | ~24 ms/frame | 2× |

GPU time improvements are similarly large (350% for the moving case). The static-scene gain
is the most dramatic: a world where only a few entities move each tick now costs nearly
nothing on the CPU side.

**Render Groups:**
v8 introduces `RenderGroup`, controlled via `new Container({ isRenderGroup: true })`. A
Render Group is a self-contained mini scene graph; its transform (position, scale, rotation,
tint, alpha) is applied on the GPU rather than the CPU, enabling essentially-free pan/zoom
of a large static world. Practical uses: separate the game world (large, mostly static)
from the HUD (frequently updating) into two Render Groups; pan the world container without
recomputing 10,000 sprite world-matrices on the CPU. Over-use degrades performance;
profile before adding more than 2–3 Render Groups.

The root container passed to `renderer.render()` is implicitly converted to a Render Group.

**Package structure change (v7 → v8 breaking):**
v7 split PixiJS into ~20 `@pixi/*` sub-packages (managed by lerna). v8 collapses back to
a single `pixi.js` package with a single import root. Tree-shaking at compile time
replaces the sub-package approach. Many common sub-systems are opt-in via side-effect
imports (e.g., `import 'pixi.js/accessibility'`), reducing bundle size to only what is
used.

**Other v8 architectural changes of note:**
- `DisplayObject` removed; `Container` is the universal base class. Leaf nodes (`Sprite`,
  `Graphics`, `Mesh`) can no longer have children directly — wrap in a `Container`.
- `BaseTexture` removed; replaced by typed `TextureSource` variants (`ImageSource`,
  `CanvasSource`, `VideoSource`, `BufferSource`, `CompressedSource`). Textures no longer
  auto-load resources; loading is explicit via `Assets`.
- `ParticleContainer` reworked to use lightweight `Particle` objects (not `Sprite`). Flat
  `particleChildren` array instead of scene-graph `children`. No bounds auto-computation;
  supply `boundsArea` explicitly.
- Shader API updated to accommodate both WebGL and WebGPU: `Shader.from({ gl: {...}, gpu: {...} })`. Textures are now "resources" not uniforms. GLSL ES 3.0 syntax required (v8 uses `in`/`out`; `texture()` instead of `texture2D()`).
- Graphics API redesigned to match Canvas2D conventions: build shape first, then
  `.fill()`/`.stroke()`. `GraphicsContext` replaces `GraphicsGeometry`, enabling one
  context shared across multiple `Graphics` objects.
- Culling moved out of the automatic render loop; now explicit and user-controlled.
- `cacheAsBitmap` renamed `cacheAsTexture()`.
- `settings` object removed; configure via `AbstractRenderer.defaultOptions`.

### 7. HD-2D / normal-mapped lighting in PixiJS

PixiJS supports normal-mapped 2D lighting via its custom shader (`Mesh` + custom fragment)
and filter pipeline — the same technique described in [[top-down-2d-art]] (section
"Lighting in 2D"). The `pixijs-userland/lights` community plugin implements a deferred
shading approach: sprites are rendered to one RenderTexture, their normal maps to a second,
and a light-pass shader samples both to produce per-pixel lit output. For the HD-2D look
(normal maps + point lights + bloom + tilt-shift), the implementation pattern is:

1. Author sprite albedo + normal-map pairs (with SpriteIlluminator or Sprite Lamp).
2. Render albedo sprites to a RenderTexture (scene layer).
3. Render normal-map sprites (same transforms) to a second RenderTexture.
4. Apply a lighting pass shader (via `pixijs-userland/lights` or a custom Filter) that
   samples albedo + normals + light uniforms.
5. Apply post-processing Filters (bloom, blur) on the result.

Performance note: each RenderTexture pass is a batch break plus one extra render. Budget
these passes explicitly; keep them to the minimum required for the visual goal. This maps
directly to the "extensible material model" hedge in [[top-down-2d-art]]: author albedo
now, add the normal + lighting pass later as an additive layer with no impact on game
logic.

### 8. Accessibility — the canvas surface limitation

A `<canvas>` element is opaque to the browser accessibility tree. Screen readers cannot
read canvas content; keyboard navigation cannot land on canvas-drawn buttons. This is an
inherent architectural constraint, not a PixiJS deficiency.

PixiJS provides a partial mitigation via its `AccessibilitySystem`: opt-in (add
`import 'pixi.js/accessibility'`), it places invisible `<div>` overlays positioned over
accessible scene objects. These overlays:
- Receive focus via `tabIndex` (keyboard navigation)
- Announce `accessibleTitle` / `accessibleHint` to screen readers via `aria-label`
- Forward `click`/`mouseover`/`mouseout` events back to PixiJS pointer events

Activation is keyboard-triggered by default (first Tab press). This covers interactive
elements (buttons, clickable objects) but cannot convey dynamic visual information
(character positions, health bars, map state) without explicit ARIA text updates.

For applications with serious accessibility requirements (see [[accessibility-interactive-apps]]):
the correct architecture is a **DOM overlay layer** above the canvas. Game state is
reflected into a live region `<div>` (or a full shadow DOM) that ARIA-annotates entities,
conveys state changes, and provides keyboard focus targets. PixiJS's built-in
AccessibilitySystem is a starting point; it is not a full solution for complex interactive
apps.

The AccessibilitySystem is not available in Web Workers (requires DOM).

### 9. Integration tradeoffs summary

| Dimension | PixiJS v8 | Raw Canvas2D | Phaser 3 | Unity/Godot WebGL |
|---|---|---|---|---|
| Bundle size | ~200 KB | 0 KB (native) | ~500 KB+ | Multi-MB |
| Sprites/entities at 60 fps | 100k+ (WebGL) | ~50–200 | 10k–50k | Very high (3D engine) |
| Game systems | None (you build) | None | Physics, audio, input, tilemap | Full 3D + 2D |
| Custom shaders | Full (GLSL ES 3.0) | None | Limited | Full |
| WebGPU | Yes (v8, maturing) | No | No (WebGL) | Limited |
| Accessibility | Partial (div overlay) | None (same issue) | Similar overlay | Varies |
| 2D normal-mapped lighting | Via custom filters | Not practical | Via plugin | Native |
| Deterministic sim integration | Manual (your loop) | Manual | Manual | Varies |
| Learning curve | Low (renderer only) | Lowest | Medium | High |

---

## Concrete examples & references

**v8 Bunnymark performance numbers** (official, verified from release post):
100k sprites all moving: v7 CPU ~50 ms → v8 ~15 ms (3.3×); GPU ~9 ms → ~2 ms (4.5×).
100k sprites static: v7 CPU ~21 ms → v8 ~0.12 ms (175×). These are on the Goodboy
Bunnymark at https://goodboydigital.github.io/pixi-bunnymark/

**ParticleContainer v8 benchmark** (official blog): MacBook M3 — regular Sprites + Container:
~200k at 60fps; Particles + ParticleContainer: ~1M at 60fps (5× throughput).

**Multi-texture batching** (Goodboy Medium, "GPU multi-texture sprite batching"): Chrome
desktop holds 16 texture slots; iOS WebGL holds 8. All sprites sharing any frame within
an atlas are drawn in one call; a scene with 1,000 sprites from one atlas = 1–2 draw calls.

**Render Group GPU-transform demo**: marking the game world as `isRenderGroup: true` and
panning it with a single position change (instead of moving 10,000 sprite world positions)
reduces CPU pan cost to near-zero because the transform is applied as a GPU matrix on the
single render group rather than recomputed for every child.

**Normal-mapped lighting**: `pixijs-userland/lights` at
https://github.com/pixijs-userland/lights demonstrates the deferred shading approach
(albedo + normal RenderTextures + light-pass). SpriteIlluminator
(https://www.codeandweb.com/spriteilluminator) is the standard tool for authoring normal
maps from 2D sprites without 3D modelling.

**WebGL vs WebGPU status** (v8 docs, verified June 2026): WebGPU renderer marked
"experimental" with the explicit doc note "It is recommended to use the WebGL renderer for
production applications." The Canvas2D fallback renderer (v8.16+) is also marked
experimental.

**Phaser vs PixiJS** framing: "Comparing Phaser and PixiJS is like comparing a complete car
to an engine." (generalistprogrammer.com). Phaser's renderer is conceptually PixiJS-like
but Phaser provides the rest of the car.

---

## Design implications & transferable principles

**1. Keep PixiJS as a thin visual layer — never let it own game state.**
Game state (entity positions, health, animation state) lives in a read-only store or
simulation output. The Ticker callback reads that state and writes to Pixi objects. Nothing
in the Pixi scene graph is the authoritative source for game simulation. This is the
rendering equivalent of the one-way data-flow principle in UI frameworks: UI (Pixi) mirrors
state, never generates it. This directly enables [[deterministic-simulation-architecture]]:
the simulation runs its fixed-tick loop independently; Pixi gets a read-only view at render
time.

**2. Atlas discipline is a first-class design constraint, not a late optimization.**
Batch-break patterns must be understood during art and content planning. Group art into
atlases by "things that appear on screen at the same time" — character sprites, a biome's
tile set, UI elements. Do not mix atlas membership arbitrarily. Switching atlases mid-scene
is the primary cause of unexpected draw-call explosion. See [[top-down-2d-art]] §Tools &
performance for the tile-atlas discipline.

**3. Render Groups are a structural concern, not a micro-optimization.**
Decide early which subtrees are logically independent (game world, HUD, lighting overlay)
and mark them as Render Groups. This is an architectural decision that enables GPU-side
transform math for pan/zoom and isolates dirty tracking between layers. Adding Render Groups
reactively mid-project is valid but requires profiling; over-use degrades performance.

**4. The v8 static-scene CPU gain changes the performance equation for tile worlds.**
A top-down tile world where most tiles do not move benefits from the 175× CPU improvement
in static frames. This justifies heavier tile density and higher art resolution than was
practical in v7, as long as tile sprites share an atlas (batch stays tight) and only the
small number of moving entities dirty their subtrees.

**5. For HD-2D: author albedo now; add the normal + lighting pass as an additive layer.**
The three hedges from [[top-down-2d-art]] (neutrally-lit assets, extensible material model,
one TILE_PX constant) translate directly into PixiJS architecture: albedo sprites render
normally; when the HD-2D pass is ready, add a second normal-map sprite layer + a Mesh/Filter
lighting pass on top. No game logic changes; the extra RenderTexture passes are purely
additive. Budget the extra draw-pass cost up front.

**6. Plan the accessibility architecture — not just the AccessibilitySystem.**
If the application requires keyboard navigation or screen-reader announcements of dynamic
content (character dialogue, health change, map update), build a DOM overlay strategy from
day one. PixiJS's AccessibilitySystem handles interactive element focus; it does not cover
dynamic live-region announcements. A dedicated `<div aria-live="polite">` layer fed from
game state events is the correct complement, not the AccessibilitySystem alone.

**7. Treat WebGPU as the horizon, not today's target.**
As of June 2026, use the WebGL renderer for production; let `autoDetectRenderer` silently
try WebGPU for the users who have it. Do not ship a WebGPU-only code path. Write shaders in
GLSL ES 3.0 (v8 required) with the `gl:` shader slot; add a `gpu:` WGSL slot only when the
WebGPU target is mature and validated.

---

## Open questions

- When does the PixiJS team graduate the WebGPU renderer from "experimental"? Current
  guidance (June 2026) is still "use WebGL for production." Track the v8.x blog for
  promotion.
- What is the actual draw-call budget for a top-down tile world with HD-2D lighting
  (albedo + normal pass + post-processing)? Needs a project-specific benchmark with the
  target device set (mobile vs desktop).
- Does `pixijs-userland/lights` (the deferred shading plugin) maintain v8 compatibility?
  The GitHub repo showed activity but confirm before committing to it as the lighting
  approach.
- What is the correct pattern for running PixiJS in a Web Worker (OffscreenCanvas) for the
  rendering thread, while the simulation runs on the main thread? PixiJS supports
  OffscreenCanvas but the accessibility and event systems do not. Evaluate if this pattern
  is needed for the target performance envelope.
- How much of the `netcode-authoritative-multiplayer` interpolation-alpha pattern (render
  between two sim snapshots via `lerp(prev, current, alpha)`) should be expressed in the
  Ticker vs the simulation's fixed-tick output? Specifically: does the visual-alpha blend
  for remote-entity interpolation live inside Pixi Ticker callbacks or is it driven by the
  sim layer before handing off to Pixi?

---

## Sources

1. https://pixijs.com/blog/pixi-v8-launches — Groves & Zyie, "PixiJS v8 Launches!", GoodboyDigital, March 2024
2. https://pixijs.com/8.x/guides/migrations/v8 — Official PixiJS v8 Migration Guide
3. https://pixijs.com/8.x/guides/concepts/render-groups — Official docs: Render Groups
4. https://pixijs.com/8.x/guides/concepts/render-loop — Official docs: Render Loop
5. https://pixijs.com/8.x/guides/concepts/performance-tips — Official docs: Performance Tips
6. https://pixijs.com/8.x/guides/components/renderers — Official docs: Renderers (WebGL vs WebGPU status table, as of June 2026)
7. https://pixijs.com/8.x/guides/components/accessibility — Official docs: Accessibility (DOM overlay system)
8. https://pixijs.com/blog/particlecontainer-v8 — "ParticleContainer — The New Speed Demon in PixiJS v8", PixiJS blog
9. https://medium.com/goodboy-digital/gpu-multi-texture-sprite-batching-21c90ae8f89b — Walker, "GPU multi-texture sprite batching", Goodboy Digital / Medium
10. https://github.com/pixijs-userland/lights — pixijs-userland/lights: deferred shading / normal-mapped lighting plugin
11. https://generalistprogrammer.com/tutorials/phaser-vs-pixijs-renderer-comparison — "Phaser vs PixiJS: Renderer vs Game Framework Comparison", generalistprogrammer.com
12. https://www.codeandweb.com/spriteilluminator — SpriteIlluminator: normal-map editor for 2D dynamic lighting
