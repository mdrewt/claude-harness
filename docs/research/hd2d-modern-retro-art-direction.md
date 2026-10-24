---
title: HD-2D and modern-retro art direction — benchmarks, 2D-renderer feasibility, placeholder-to-final pipeline
slug: hd2d-modern-retro-art-direction
domain: art
tags: [hd-2d, modern-retro, pixel-art, 2d-lighting, post-processing, color-grading, lut, palette, water-readability, placeholder-art, asset-licensing, ai-generated-assets, pixijs, benchmarks]
status: active
updated: 2026-10-24
confidence: medium
sources: 57
supersedes:
abstract: "HD-2D benchmarks, what a 2D browser renderer can fake, palette/res choices, staged placeholder-to-final art path."
---
## Scope
Extends [[top-down-2d-art]] (which already defines HD-2D, the normal-map/2D-only route, hue-shifted
ramps, tile grids and autotiling) and [[pixijs-2d-rendering]] (batching, the lights plugin). This doc does
**not** repeat those. It adds: (1) HD-2D decomposed into an effect stack with a per-effect "needs real 3D?
/ 2D-renderer equivalent / cost" verdict; (2) what the benchmark titles actually disclose (and what is
unverified); (3) a lighting-fidelity ladder and a concrete browser-renderer pass order; (4) resolution /
texel-density / palette discipline; (5) readability (water vs grass); (6) placeholder sourcing, licensing and
AI-asset hygiene; (7) a staged path from programmer art to "2D-HD-ready" placeholders. Written
project-agnostic for any team building a 2D sprite game on a WebGL/WebGPU renderer.

Evidence tags used below: **[V]** read directly in a primary/official page; **[S]** secondary or only seen via
a search-result summary (page not retrievable); **[I]** my inference/engineering judgement, not sourced. Numbers
in brackets point to the Sources list.

## Key findings
1. **HD-2D is a lighting + depth + density stack, not an asset format.** The pixel sprites are ordinary; the
   look comes from 3D-ish environments, dynamic light/shadow, depth-of-field/tilt-shift, bloom, fog and
   particles layered on top [V: 1]. Octopath's own designers say lighting was the first lever (dramatic
   lighting on the 2D art) and that adding 3D elements "really gave the visuals a sense of depth" [V: 3].
2. **Most of the stack is reproducible in a 2D renderer; the parts that are not are *real* shadow casting from
   billboarded sprites onto 3D terrain, true perspective parallax, and real DoF from depth.** Everything else
   (ambient + point lights, bloom, tilt-shift band blur, LUT grading, god-rays, fog, particles, refraction) has a
   2D-filter equivalent in PixiJS v8's community filter set [V: 26,27,28]. A pure-2D game, Sea of Stars, shipped
   "full dynamic lighting" from a custom render pipeline on Unity [V: 13; S: 17].
3. **Octopath's recipe was "more density", not just "more effects".** After early builds felt flat/"lonely"
   on larger screens, the team "increased the density of tile variations and colors" [V: 2]; for the sequel
   they raised background resolution *and* made characters taller because "if we only increased the resolution
   of the background, the characters would look strange" [V: 4,5]. **Texel density must rise together across
   every layer.**
4. **Over-pushing resolution/saturation killed the pixel appeal** in one Octopath attempt [V: 2]; simply
   thickening pixels was rejected as nostalgia-only [V: 3]. Target: crisp nearest-filtered pixels + smooth
   modern light/post.
5. **Lighting is also a readability tool.** Sea of Stars' creative director: the lighting "outlines everything so
   that it helps read" and lets them "use the light to call you to a door"; it "gave volume to the
   environment" [V: 14]. And the whole asset pipeline "has to answer to the technical needs of the dynamic
   lighting" [V: 15] -- plan lighting *before* mass art production.
6. **HD-2D is expensive; scope it.** Triangle Strategy's producer: it "costs more than you'd think" and others
   "may not gain much from copying it" [V: 7]. The first Octopath had only six programmers at peak and leaned on
   an engine's Blueprint/optimisation tooling [S: 8]. A small team should buy the 20% of the stack that gives
   80% of the look (palette, value structure, ambient+point lights, bloom, LUT) first [I].
7. **Water must be solved by value, pattern, motion and edge treatment together** (see Readability), and
   verified with a grayscale/squint test, not by eye in colour.
8. **Placeholder art is a licensing and provenance liability if it can leak into a release.** A 2026
   precedent shipped AI-made "temporary" props that were "meant to be replaced before release" [V: 41]. Track
   provenance per asset and gate releases on it.
9. **Pure-AI output is likely unprotectable and triggers store disclosure if it ships** (Section 6) -- fine for
   ideation/temporary stand-ins, poor as brand-defining final art.

## Concrete examples & references

### 1. HD-2D decomposed -- effect stack and 2D-renderer verdict
| Ingredient | In a real HD-2D engine | Needs a 3D scene? | 2D-renderer equivalent (PixiJS v8 terms) | Cost / fidelity gap |
|---|---|---|---|---|
| Dynamic light + sprite shadows | Point/sun lights; billboarded sprites cast shadows onto terrain [V: 1] | Only for true receiving/self-shadow | Ambient fill + additive light sprites into a **lightmap** multiplied over the scene (SimpleLightmapFilter takes a `lightMap` texture + ambient `color`) [V: 28]; fake entity shadows with skewed/blob shadow sprites [I] | Cheap; no accurate occlusion unless you add 2D occluder raycasts [I] |
| Normal-map lighting | n/a (real normals) | No | Per-sprite normal maps; deferred plugin or custom filter. Mainstream 2D engines do it natively (Unity secondary textures [V: 36]; Godot `CanvasTexture` normal/specular [V: 37]) | Art x~1.5-2 (see [[top-down-2d-art]]); Unity notes normal maps add a depth pre-pass that "can reduce performance" [V: 36] |
| Depth of field | Depth-buffer blur | Real DoF yes; approximation no | Blur *by layer* (distant parallax layers get Kawase/Blur), or screen-band blur [I] | Blurs pixels -- keep the focus band sharp and avoid blurring sprites you must read [I] |
| Tilt-shift | Lens/DoF with wide FoV | No | `TiltShiftFilter` (options: blur, gradientBlur, start, end) [V: 27,28] | One full-screen pass |
| Bloom | HDR threshold bloom | No | `AdvancedBloomFilter` (code defaults threshold 0.5, bloomScale 1, brightness 1, blur 8, quality 4; its JSDoc contradicts the code) [V: 28]; or an additive *emissive layer* (more controllable on 8-bit targets) [I] | One-two passes; no true HDR |
| Volumetric fog / god-rays | Volumetric fog | No | `GodrayFilter` (angle, gain, lacunarity, time) [V: 27]; scrolling noise/fog sprites; vertical gradient overlay [I] | Cheap |
| Colour grade / tonemap | Post-process LUT | No | `ColorMapFilter`: a 3D LUT unrolled as a **horizontal strip of slices**, with `mix` 0..1; `updateColorMap()` for canvas-backed LUTs [V: 28] | Very cheap, very high impact |
| Parallax / depth cue | Real camera parallax | No | Multi-layer scroll factors; overhead canopies; cloud shadows; height-offset drawing for tall objects [I] | Needs layered art authored for it |
| Particles / VFX | 3D particle emitters | No | Sprite particles, additive blend (v8 also exposes advanced blend modes via an import) [V: 31] | Cheap |
| Water reflection/refraction | Planar reflection / refraction | No | `DisplacementFilter` / `ReflectionFilter` on a masked region [V: 26]. Sea of Stars' teaser showed refraction behind a see-through crystal in pure 2D [S: 43] | Mask authoring required |
| Height/cliffs/terrain relief | Low-poly meshes textured with pixel art | Yes for free camera | ¾ façade tiles + stacked/offset drawing [I] | Fixed camera only |

**Pass order that reproduces most of the look in 2D [I], composed from the verified filters:**
world sprites (nearest-filtered) -> lightmap (ambient + additive lights, ideally at half/quarter res because it is
blurred anyway) multiplied over world -> emissive/glow layer (additive) -> bloom -> LUT grade (time of day) -> optional
tilt-shift with a sharp focus band on the player -> vignette overlay -> UI (never filtered).

### 2. Benchmark profiles (what is known vs unknown)
- **Octopath Traveler (I/II, Acquire + Square Enix).** Unreal Engine 4; the style is credited to a team led by
  producer Tomoya Asano and took ~1.5 months to hit; early prototypes reused Final Fantasy VI sprites [V: 1,3].
  Lighting-first: "lighting mixed with pixels in a way that emphasized how light shines on objects" [V: 3].
  Native 720p on Switch (1024x576 handheld), 30 fps, UI at 720p [V: 6] -- i.e. sprites are textured quads in a
  hi-res 3D scene, not an integer-upscaled low-res buffer [I]. Sequel: taller characters, per-skill animations,
  varied camerawork, engine features used "like we would for a 3D scene" instead of scripted events; target
  "picture-perfect no matter when you screenshotted it", with Chrono Trigger as the pixel-density reference
  [V: 4,5]. **Not found:** actual sprite/tile pixel dimensions and tilt-shift/DoF parameters.
- **TRIANGLE STRATEGY (Artdink + Square Enix).** Unreal Engine 4 [V: 11]. The hard problem was a *rotating* camera
  with pixel-dot characters [V: 10]; the VR port reportedly dropped depth-of-field because free 360-degree rotation made
  it hard to control [S: 12]. Lesson: **HD-2D is easiest with a constrained camera**; free rotation multiplies art and
  post-FX cost [I].
- **Sea of Stars (Sabotage, Unity).** Custom render pipeline, "full-on dynamic lighting", built to push "the limits of
  2D pixel-art games" [V: 13]; lighting was the founding idea of the project, with one technical artist full-time from
  2018 [V: 15]; day/night is player-controllable, shadows rotate and sun/moon swap [S: 18]; characters and brighter
  scenery get coloured highlights [V: 16]. A 2020 pre-release feature list named "normal mapping, pixel depth
  writing and shadow receiving, bloom, ambient occlusion, pixel-perfect rendering" [S: 17]. **Unconfirmed:** whether
  normal maps ship in the final game, whether lighting is "hand-authored" vs procedural, the native resolution (a forum
  user claims 640x360 [S: 19]) and sprite sizes. Also: movement was moved off a strict grid to platformer-style
  traversal, with lighting reinforcing paths [V: 13,14]. A "Pixel Perfect" option exists for non-16:9 displays
  [S: 20], showing integer scaling is a live product decision.
- **Sword of Convallaria (XD, mobile + PC).** Developer text: "traditional pixel art with 3D enhancements" / "dynamic 3D
  rendering"; **production pipeline = draw unit in normal proportions -> convert to chibi -> rebuild as pixel art;
  idle/action animations are sketched and checked for proportion, movement and rhythm before polish; factions get
  distinct visual language** [V: 21]. Press calls it "neo-pixel visuals" [V: 22]. **Not found:** engine, resolution,
  lighting method, 3D-environment details (one aggregator mentions real-time shading; unverified). It is
  mobile-scale, not browser-scale.
- **Soulbound: Online (SpiderWare).** Browser + Discord origin (Discord Adventure Together App Pitch 2024 winner),
  1M+ players before a July 2026 Steam Early Access; "handmade" animated pixel-art armor sets; live-service pixel MMO
  [V: 23,24,25]. **Not found:** engine, tile/sprite sizes, lighting, art pipeline -- no public technical breakdown
  surfaced. Value as a benchmark is *product-level*: a pixel-art game can reach very large audiences from a browser.
- **Other 2D-with-3D-lighting references (brief).** Eastward (Pixpil) markets "retro-pixel + 3D lighting" on a
  custom engine; its technique is undocumented (a forum guess that it avoids normal maps is not evidence) [S: 57].
  Other HD-2D-style titles named by Wikipedia: Live A Live and Dragon Quest III remakes, Wandering Sword, Eiyuden
  Chronicle [V: 1].

### 3. What the browser 2D renderer gives you (state as checked 2026-10-24)
- `pixi.js` latest 8.22.0; `pixi-filters` latest 6.1.5 with peer `pixi.js >=8.0.0-0` [V: 29,30]. ~38 community filters
  incl. AdjustmentFilter, AdvancedBloom, Bloom, ColorMap, ColorGradient, Godray, KawaseBlur, SimpleLightmap, TiltShift,
  Reflection, DropShadow, Outline, Pixelate, CRT [V: 26,27].
- **WebGPU:** inspected source shows ColorMap, AdvancedBloom and SimpleLightmap define both `GpuProgram` (WGSL) and
  `GlProgram` [V: 28]; TiltShiftFilter inherits from an axis-filter parent I did not inspect. Custom filters need both
  a `glProgram` and a `gpuProgram` to run on both backends [V: 31].
- **Normal-map lighting is not built in.** The community deferred-lights plugin documents v7+ and a layers package;
  v8 support is unconfirmed [V: 33; S: 34]. A v8 route is a custom filter/mesh shader (a Spine forum thread shows the
  normal-map dot-product shader and a UV-remap gotcha; port to `texture()`/`finalColor`) [S: 35]. v8's `RenderLayer`
  decouples draw order from the scene graph (useful for separating lit world, emissive layer, UI) but is not a lighting
  pass [V: 32]. Filters/masks/render textures break batches (see [[pixijs-2d-rendering]]).
- **Mainstream engines' pattern to copy** even if you stay in Pixi: an *ambient colour* sets the darkness floor and
  lights add to it (Godot `CanvasModulate` + `PointLight2D`/`DirectionalLight2D`) [V: 37]; sprites optionally carry a
  normal map and a **mask map** (Unity: the R channel gates how much light a region receives, for highlights/rim/shadow)
  [V: 36]. Godot's normal-mapped lights need a raised light *height* or they look dim [V: 37]. For a 3D-scene variant,
  Godot's `Sprite3D` exposes billboarding, an "Opaque Pre-Pass" alpha-cut mode that allows smooth edges, and a
  `shaded` flag so scene lights affect the sprite [V: 38].
- **Pixel fidelity models** [I]: (A) *strict grid* -- render the world to a low-res target, integer-upscale, apply lighting
  at either resolution; crisp, shimmer-free, camera locked to the pixel grid. (B) *Octopath-style free camera* --
  hi-res scene, nearest-filtered textured quads, sub-pixel motion, smooth zoom/rotation/tilt-shift; costs the
  strict "every art pixel = N screen pixels" guarantee. Pick one before building cutscene camera tools; non-integer
  zoom under model A shimmers.

### 4. Time-of-day palettes and grading
- Author 3-5 keyframe **LUTs** (dawn, day, dusk, night, interior) by grading a neutral reference screenshot in any
  image editor; `ColorMapFilter` consumes a horizontal slice strip [V: 28]. To crossfade between keyframes, interpolate
  the two LUT images into one canvas and call `updateColorMap()` (the documented hook for canvas-backed maps) [hook: V: 28;
  the interpolation approach is I]. Tiny LUTs (e.g. 16 slices) make this negligible.
- Pair the LUT with an **ambient colour** change in the lightmap and a shadow-direction/length change if you have
  sprite shadows (Sea of Stars rotates shadows with the sun [S: 18]). Palette-snapping the final frame to the master
  palette is possible but gives up smooth light -- Octopath kept smooth light on top of crisp pixel textures [V: 2,3] [I].

### 5. Resolution, density and palette discipline
- **Choose an art resolution that integer-scales to your target displays.** Arithmetic: 640x360 scales x2 (720p), x3
  (1080p), x4 (1440p), x6 (4K); 480x270 scales x4 (1080p) and x8 (4K) but not to 720p/1440p; 960x540 scales x2 (1080p)
  and x4 (4K) only. Visible tiles: at 640x360, 32 px tiles = 20 x 11.25, 48 px tiles = 13.3 x 7.5; at 480x270, 32 px
  tiles = 15 x 8.4.
- **32 px vs 48 px tiles.** 48 px gives ~2.25x the pixels per tile (48^2/32^2) -- more room for gaze/hair/animation
  nuance but "significantly more work" [S: 45]; 16 px is the easiest to source and scale; 32 px is the common
  top-down character middle ground [S: 45]. Characters need not equal one tile: tall 1x2-tile sprites (e.g. 16x32 on
  16 px tiles) are a normal pattern [S: 45]. Octopath II's move to taller characters shows proportions are a density
  lever [V: 4]. For a small team targeting richer-than-16-bit, **32 px tiles at 640x360** is the pragmatic default;
  48 px if hero close-ups/cutscenes dominate and art capacity exists [I].
- **Never mix pixel scales ("mixels").** A commonly cited failure when combining packs or scaling sprites in-engine;
  keep engine scale 1 and a fixed base viewport; trace/redraw foreign assets to the target grid [S: 46]. An exception
  many artists accept: a background layer with a different pixel size, but not varying sizes within it [S: 46].
- **Palette discipline.** One master palette of hue-shifted ramps (see [[top-down-2d-art]]); assign each *material class*
  a value band first, hue second; ban baked cast shadows (keep small contact AO) so lighting can own shadows [I;
  consistent with the "flat-lit textures, no baked lighting" recipe in a community HD-2D build note, 39 --
  non-authoritative].
- **Cluster shading.** Shade in coherent pixel clusters; avoid **banding** (parallel pixel lines hugging an outline, which
  also makes anti-aliasing fuzzy) [V: 42] and pillow shading (shading that traces the outline) [S: 42]. Even visual
  balance and consistent cluster work are top design keys for tilesets [V: 40].

### 6. Placeholder sourcing, style guides and AI hygiene
- **Style guide minimum (one page):** perspective; base tile px; character canvas sizes and head:body ratio (Sword of
  Convallaria's chibi canon is the model [V: 21]); light direction; master palette + material value bands; outline policy;
  animation frame budgets; naming/atlas keys; "no baked cast shadow" rule; provenance fields [I].
- **Kitbash/CC0 bases.** Kenney assets are CC0: commercial use OK, attribution optional, only the Kenney logo is reserved
  [V: 55]. The Liberated Pixel Cup base set is **dual CC-BY-SA 3.0 / GPLv3** with per-author credits (some under
  OGA-BY 3.0), so it brings attribution/share-alike obligations [V: 44]. Many itch/OpenGameArt sets are CC-BY or custom
  EULAs -- record each license, forbid redistribution of raw files, and avoid share-alike assets in a closed project
  unless counsel signs off [I]. Recolour every kit into the master palette (palette lock) so mixed sources read as one
  set; still watch for mixels.
- **AI-assisted placeholders -- legal and platform facts.**
  - US Copyright Office Part 2 report (29 Jan 2025): AI outputs are protectable only where a human determined sufficient
    expressive elements; prompts alone do not suffice; AI used as an aid, or inside a larger human work, does not bar
    copyright [S: 56].
  - Steam's generative-AI disclosure (policy Jan 2024, revised 17 Jan 2026) applies to content *consumed by players*
    (art, audio, narrative, localisation, marketing); tools used only inside the dev workflow and ideation that never
    ships are exempt; disclosure is a legal attestation and "necessary but not sufficient" [V: 48; S: 47]. itch.io
    (Nov 2024) requires a generative-AI disclosure field on asset pages and tags/de-indexes accordingly [S: 49].
  - **Cautionary precedent:** Pearl Abyss confirmed (Mar 2026) that AI-made 2D props from early production, "meant to be
    replaced before release", shipped, and the game launched without disclosure; it began an all-asset audit [V: 41].
  - Pixel-native generators exist as Aseprite-integrated products (Retro Diffusion: one-time purchase, tileset and
    seamless-texture modes; PixelLab: rotation, tilesets, animation) -- general image models usually fail the "true
    pixel grid" requirement [S: 50,51; the last clause is I]. **I could not retrieve either vendor's licence text;
    verify commercial terms before shipping anything generated.**
  - Practical policy [I]: use AI for ideation, palette/mood exploration, and *temporary* stand-ins; tag every such file
    `provenance: ai-placeholder` in a manifest; fail the release gate if any such file is still referenced; redraw by
    hand/commission for anything that carries identity (characters, key tiles, logo).

### 7. Readability -- making water read as water
Evidence-backed cues, to be applied **together**:
1. **Value first.** Value contrast, not hue, drives shape separation; desaturate the screenshot (grayscale/"squint" test) and
   confirm adjacent terrain classes still separate [S: 52]. Give water its own value band (typically darker or
   cooler-shifted than grass, never the same mid-value) [I].
2. **Texture frequency.** Water as "wavy interconnected blob shapes formed by single pixel wide lines," with highlights and a
   crude drop shadow a few pixels below the bright lines [V: 40] -- visibly unlike grass's short irregular clusters [I].
3. **Motion.** Alternate two water tiles (optionally a 50%-opacity blend frame); too fast reads as noise, too slow as
   choppy [V: 40]; a typical animated set uses 32x32 tiles x4 frames, three water types sharing one palette [S: 53];
   wave motion has steeper crests than troughs [S: 54].
4. **Edges.** Treat the shoreline as its own soft band separate from the deep-water fill rather than hand-painting
   shore as a third terrain; avoid mixing straight-down and tilted perspectives on the same edge; large overlaps + heavy
   shadow make water look raised above the ground [S: 53].
5. **Shader layer.** Specular glints (additive), subtle displacement/refraction on submerged sprites, cool LUT
   response [I]; Sea of Stars' light/volume work is credited with helping players read the level [V: 14].
6. **Accessibility.** Water is usually a movement rule -- cue it with pattern/motion/edge as well as colour (never colour
   alone; see [[accessibility-interactive-apps]]).

### 8. Staged path: programmer art -> 2D-HD-ready placeholders
Principle: spend on what changes *every* frame's read (palette, value structure, tile variation, light) before what
changes *a few* frames (animation). Octopath's team found density of tile variety/colour and added depth fixed "flat" [V: 2,3];
Sea of Stars built art around lighting from day one [V: 15]. The staging itself is [I].
| Stage | Invest in | Exit criteria (testable) |
|---|---|---|
| 0. Lock | native resolution + integer-scale rule, tile px, character canvas, perspective, light direction, master palette + material value bands, pixel-fidelity model (A vs B) | one-page style guide committed; mixel lint (all assets at base grid) |
| 1. Readable terrain kit | ~10-12 terrain classes (grass, path, sand, shallow/deep water, rock, wall, roof, floor, tree, bush), 3+ variants each, shore band tiles, 2-frame water; recolour CC0 base into master palette | grayscale test passes between every adjacent class pair; automated luminance-delta check on a screenshot grid; water reads in a 16x16 thumbnail |
| 2. Look-dev scene + light/grade pass | a deterministic test map; ambient + 4-8 lights, emissive layer, bloom, LUT time-of-day, optional tilt-shift, vignette; per-effect toggles and a time-of-day slider | each effect individually toggleable; frame-time budget per pass recorded; screenshot baselines per time-of-day (tolerance-based diff); flat art visibly improved with zero new assets |
| 3. Hero normals/emissive | normal + mask/emissive maps for the player, NPCs, key props (torches, windows, crystals) | lit vs unlit A/B screenshots; perf delta recorded; only proceed if the lightmap alone looks flat |
| 4. Animation, parallax, particles | 2-4 frame loops for water/foliage, idle breathing, canopy/parallax layers, cloud shadows, ambient particles, cutscene camera tools (pan, letterbox, focus band) | animation budgets met; cutscene shots reproducible from data |
| 5. Final-art replacement by tier | hero > most-seen terrain > props, swapped by stable asset IDs/atlas keys so replacement is a file swap | placeholder-provenance gate: zero `placeholder`/`ai-placeholder` assets referenced in release builds |

Testing 2D-HD effects [I]: inject time/seed as uniforms (no wall-clock in shaders or particles), fix viewport and device
pixel ratio, render in a software-GL/headless browser for CI, compare against per-effect baselines with a tolerance (GPUs
differ in blur/bloom rounding), and keep a perf probe per pass.

## Design implications & transferable principles
- **Decide the fidelity model (strict pixel grid vs free-camera nearest-filtered) before building cutscene or camera tools**;
  it changes zoom, tilt-shift and lighting resolution.
- **Raise density as one move** (tiles, characters, UI, light) -- a mismatch reads as wrong faster than low resolution.
- **Value structure before hue; light before animation.** Terrain classes need non-overlapping value bands; lighting should
  be allowed to "outline everything".
- **Climb the lighting ladder only as needed:** flat -> baked + ambient/LUT -> ambient + additive lightmap (+ emissive layer)
  -> normal-mapped hero assets -> occluder shadows. Each rung is additive, render-only, and A/B-testable.
- **Constrain the camera to constrain cost.** Free rotation (Triangle Strategy) strains pixel sprites and DoF; a fixed ¾
  camera lets parallax, tilt-shift and 2D lighting carry the look.
- **Treat placeholders as debt with a ledger:** one provenance manifest, a license ladder (CC0 > CC-BY > share-alike >
  EULA > AI-generated), stable IDs for swap-in, and a release gate that fails on leftovers.
- **Use AI for exploration, not identity.** Lack of copyright protection for unaided output, mandatory disclosure when it
  ships, and detection-driven reputational risk all argue for human-authored finals.
- **Budget the passes.** Each full-screen filter is a fill-rate cost and a batch break; render light at reduced
  resolution, cap simultaneous lights, make every effect toggleable, and degrade gracefully on weak GPUs.
- **Verify before trusting any single benchmark claim.** Several flagship studios disclose little; avoid copying a
  "technique" that is actually a fan guess.

## Open questions
- Octopath/Sea of Stars native sprite and tile dimensions, and whether Sea of Stars ships normal maps -- not publicly confirmed
  in what I could retrieve; an art book or developer talk would settle it.
- Sword of Convallaria and Soulbound engines/pipelines: no public breakdowns found.
- Whether the community deferred-lights plugin works on PixiJS v8 (unconfirmed) vs writing a custom filter; and TiltShift's
  WebGPU status (parent class not inspected).
- Vendor licence terms for pixel-native AI generators (not retrieved); platform AI policies change frequently.
- Octopath's Unreal pages (spotlight, sequel interview) returned 403; claims attributed to them come from search summaries.
- Best lightmap resolution and pass count for mobile browsers -- needs on-device benchmarking.
- Automated value-contrast gate thresholds (what luminance delta between adjacent terrain classes is "enough") -- tune empirically.

## Sources
1. https://en.wikipedia.org/wiki/HD-2D
2. https://www.siliconera.com/project-octopath-traveler-developers-answer-project-started-troubles-developing-hd-2d/
3. https://nintendoeverything.com/octopath-traveler-devs-on-character-origins-visual-style-initial-hd-rumble-plans-much-more/
4. https://nintendoeverything.com/octopath-traveler-ii-devs-on-the-games-evolved-use-of-hd-2d-and-more/
5. https://www.nintendolife.com/news/2022/10/octopath-traveler-ii-devs-aimed-to-make-its-hd-2d-visuals-picture-perfect
6. https://nintendoeverything.com/octopath-traveler-technical-analysis/
7. https://wccftech.com/hd-2d-is-more-expansive-than-people-think-triangle-strategy-producer-says/
8. https://www.unrealengine.com/en-US/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true
9. https://www.unrealengine.com/en-US/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style
10. https://www.destructoid.com/triangle-strategy-interview-producers-asano-arai-square-enix-hd-2d-tactics-rpg/
11. https://en.wikipedia.org/wiki/Triangle_Strategy
12. https://square-enix-games.com/en_GB/news/triangle-strategy-meta-quest-launch-interview
13. https://sabotagestudio.com/presskits/sea-of-stars/
14. https://screenrant.com/sea-stars-interview-thierry-boulanger/
15. https://mobilesyrup.com/2023/09/11/sea-of-stars-level-design-sabotage-studio-thierry-boulanger-interview/
16. https://www.megavisions.net/the-art-of-sea-of-stars-a-sea-of-pixels/
17. https://nichegamer.com/2020/03/19/the-messenger-prequel-rpg-sea-of-stars-enters-kickstarter-launches-2020-for-pc/
18. https://www.pcgamer.com/sea-of-stars-is-a-gorgeous-retro-rpg-from-the-makers-of-the-messenger/
19. https://steamcommunity.com/app/1244090/discussions/0/3817418065214858628
20. https://primagames.com/tips/what-is-the-pixel-perfect-option-in-sea-of-stars-answered
21. https://dotgg.gg/sword-of-convallaria/unveiling-the-next-generation-pixel-art-of-sword-of-convallaria/
22. https://www.rpgsite.net/news/15961-free-to-play-pixel-art-tactical-rpg-sword-convallaria-launches-on-july-31-for-mobile-devices-pc
23. https://soulbound.game/press/
24. https://www.gamedeveloper.com/press-release/out-now-soulbound-online-enters-steam-early-access-inviting-players-to-help-guide-its-future
25. https://store.steampowered.com/app/4369490/Soulbound_Online/
26. https://github.com/pixijs/filters
27. https://pixijs.io/filters/docs/
28. https://raw.githubusercontent.com/pixijs/filters/main/src/color-map/ColorMapFilter.ts (plus advanced-bloom/AdvancedBloomFilter.ts, simple-lightmap/SimpleLightmapFilter.ts, tilt-shift/TiltShiftFilter.ts, color-map/color-map.frag in the same repo)
29. https://registry.npmjs.org/pixi-filters/latest
30. https://registry.npmjs.org/pixi.js/latest
31. https://pixijs.com/8.x/guides/components/filters
32. https://pixijs.com/8.x/guides/concepts/render-layers
33. https://github.com/pixijs-userland/lights
34. https://www.npmjs.com/package/pixi-lights
35. https://jp.esotericsoftware.com/forum/d/27902-custom-shadersfilters-for-spine-pixi-v8
36. https://docs.unity3d.com/Manual/urp/SecondaryTextures.html
37. https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html
38. https://docs.godotengine.org/en/stable/classes/class_spritebase3d.html
39. https://github.com/Phaazoid/Godoiosis/issues/176
40. https://slynyrd.com/blog/2023/3/26/pixelblog-43-top-down-tiles-part-2
41. https://respawn.outlookindia.com/gaming/gaming-news/pearl-abyss-launches-audit-after-ai-art-found-in-crimson-desert
42. https://pixeljoint.com/forum/forum_posts.asp?TID=11303
43. https://twinfinite.net/2021/05/sea-of-stars-teaser-trailer-shows-pixel-refraction/
44. https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles
45. https://dev.to/creativa_gs_fe3a743b902bc/the-challenge-of-indie-asset-fatigue-why-i-chose-a-48x48-grid-for-my-pixel-art-6og
46. https://community.flowlab.io/t/mini-rant-stop-using-mixels/38287
47. https://80.lv/articles/steam-has-clarified-its-rules-on-the-use-of-ai-in-video-games
48. https://legalmoveslawfirm.com/steam-ai-policy/
49. https://80.lv/articles/asset-creators-on-itch-io-now-have-to-disclose-the-use-of-generative-ai/
50. https://astropulse.itch.io/retrodiffusionlite
51. https://app.cinevva.com/guides/ai-pixel-art-generators
52. https://gbstudiocentral.com/?p=2094
53. https://opengameart.org/content/animated-water-tiles-0
54. https://www.slynyrd.com/blog/2018/10/12/pixelblog-10-water-in-motion
55. https://kenney.nl/support
56. https://blogs.loc.gov/copyright/2025/02/inside-the-copyright-offices-report-copyright-and-artificial-intelligence-part-2-copyrightability/
57. https://www.eastwardwiki.com/Eastward
