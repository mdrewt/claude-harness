# Sketch: M-world-art-pass — placeholder-art upgrade + world content

**Status:** sketch, 2026-10-24 (Playtest-3 feedback episode). Elaborate with
`milestone-loop-prompt.md` when PLAN §9 reaches it, against the CURRENT game repo ·
**Project:** monster-realm (client render + art assets + content RON; **no schema work**) ·
**Gate role:** per the operator's conclusion (feedback L461), further map/story/cutscene/shader
work is BLOCKED behind this milestone's placeholder upgrade — "a lot of the desired graphical
milestones require higher quality placeholders in order to continue development."
**Feedback items:** pt3-2026-10-021, pt3-2026-10-022, pt3-2026-10-155, pt3-2026-10-160,
pt3-2026-10-161, pt3-2026-10-162, pt3-2026-10-166. (pt3-2026-10-156's zone-transition cue
already shipped in the quickfix wave; this milestone adds the remaining visible-warp and
distinct-zone art.) **Absorbs residuals:** none open — checked: R-ctl-SETRATIO (set-ratio
letterboxing) stays with the scaling-methodology decision, not this milestone;
R-m23-s8-postmerge-tint was closed by rb-57 (GAME PR #442).

## Problem / intent

The world renderer draws three flat colour rects — WALL/FLOOR/GRASS
(`client/src/render/world.ts:25-30`) — and nothing else. Measured consequences from the
2026-10 playtest fact-check:

- The ONE authored heal landmark (`game-core/content/heal_locations/000-core.ron`: zone 0,
  tile (8,3)) renders as ordinary grass — no landmark sprite, no signage — so the operator
  read it as "a random water tile that heals" (agent-6 finding 3). The shipped mechanism
  already matches his Pokecenter/landmark intent; the defect is pure presentation.
- "Water indistinguishable from grass" is literally true because there IS no water art: the
  tile grammar is floor/wall/tall-grass only, and the POC water autotile set exists unused in
  the art generator (`client/art-src/generate_art.py`), never wired into the renderer.
- Two zones exist (Verdant Hollow, Tideglass Cove) but ship byte-identical 10×7 tile rows
  joined by an invisible warp at (5,5), so the operator perceived "one map" and an NPC-swap
  bug (agent-6 findings 5–6).
- The benchmarks the operator names (Octopath, Sea of Stars — pt3-021/022) are a lighting +
  density stack, not an asset format; most of it is reproducible in the 2D renderer
  (`docs/research/hd2d-modern-retro-art-direction.md`).

This milestone follows that research doc's staged path (§8): lock the style guide, build a
readable terrain kit, stand up the light/grade pass on a look-dev scene, then author real
world content on top. Placeholders are honest, provenance-tracked stand-ins for a hired
artist's final art — never AI output that could leak into a release.

## Scope (sketch — four stages, serial S0 → S1 → S2, S3 after S1)

### S0 — lock the style guide (one page, committed to the game repo)

Native art resolution + integer-scale rule, tile px, character canvas sizes, perspective,
light direction, master palette + per-material value bands, outline policy, animation frame
budgets, naming/atlas keys, "no baked cast shadows" rule, provenance fields, and the
pixel-fidelity model (research §3: A strict integer grid — the current renderer's model —
vs B free-camera nearest-filtered). Exit: style guide committed; a mixel lint (every asset
at the base grid).

**DECIDED 2026-10-24 (#587 `pt3-econ-world` D5, recommendation accepted):** the locked POC art
direction (¾ oblique · 32 px/tile · "warm vibrant storybook", memory
`monster-realm-art-direction`) is KEPT as the base; 2D-HD is pursued as a lighting/
post-processing stack over it (the staged S0→S2 plan below). The operator added: "Consider
whether there are any PixiJS-compatible libraries that would be genuinely useful" — S2's
`pixi-filters` USE verdict (`docs/research/pixijs-ecosystem-ui-and-assets.md`) is the vetted
answer; re-scan that doc's verdict table at S2 elaboration for anything newly useful, and adopt
nothing outside its USE verdicts without a fresh vet. S0 is unblocked
(`memory/projects/decisions/issue-587.answer.md` is the recorded answer).

### S1 — readable terrain kit (fixes "water indistinguishable from grass")

- 10–12 terrain classes (grass, path, sand, shallow/deep water, rock, wall, roof, floor,
  tree, bush…), 3+ variants each, recoloured into the master palette from CC0 bases (Kenney
  kitbash) and/or the existing POC generator set — mixed sources palette-locked so they read
  as one kit.
- REAL water art: its own value band (never grass's mid-value), wave-pattern texture,
  **2–4 frame animation**, and shoreline band tiles treated as a soft edge, per research §7.
- The renderer moves from flat colour rects to the tile kit (plain sprites + chunk caching;
  `@pixi/tilemap` is a DEFER verdict — adopt only if profiling shows tile rendering as the
  bottleneck, `docs/research/pixijs-ecosystem-ui-and-assets.md` §0/§5).
- **Monster battle-sprite placeholder set** (shared base + per-species recolour/variant at
  the style guide's canvas size) — produced here, CONSUMED by **M-battle-tactics P1**
  (cross-link); the battle screen's integration, layout and backdrop live in that milestone,
  not this one. Coordinate the backdrop's palette with this kit.
- Exit tests (research §8 stage 1): grayscale/luminance-delta check between every adjacent
  terrain-class pair on a rendered screenshot grid (threshold tuned empirically — open
  question); water still reads in a 16×16 thumbnail; no flat-colour terrain rects remain.

### S2 — deterministic look-dev scene + light/grade pass

- A deterministic test map rendered with the 20%-of-the-stack-for-80%-of-the-look passes:
  ambient + additive lightmap, emissive layer, **AdvancedBloomFilter**, **GodrayFilter**,
  **ColorMapFilter** LUT time-of-day grading (3–5 keyframe LUTs), optional tilt-shift,
  vignette. `pixi-filters` is the vetted **USE** (selective subpath imports, profile-gated)
  from the ecosystem research; UI is never filtered.
- Determinism doctrine applies render-side: time/seed injected as uniforms, no wall-clock in
  shaders or particle logic, fixed viewport + device pixel ratio for baselines.
- Exit tests (research §8 stage 2): each effect individually toggleable; frame-time budget
  per pass recorded; tolerance-based screenshot baselines per time-of-day keyframe; the S1
  art visibly improved with zero new assets.
- Hero/prop normal-map lighting (research ladder rung 4) is NOT this stage — see Non-goals.

### S3 — world content (after S1; parallel to S2)

- **Distinct Tideglass Cove:** zone 1 gets its own authored map art (coastal identity —
  water/sand/rock mix) so the two zones are no longer byte-identical and the warp reads as
  travel. Zone registry and zone_maps are append-only content RON with a CONTENT_VERSION
  bump; existing registry dims (32×24 / 40×28) are validated upper bounds.
- **Larger, more varied authored maps:** both zones grow past the current 10×7 placeholder
  grids (8×5 playable interiors) toward the registry bounds, using the S1 kit's variety.
- **Heal-location landmark:** a landmark sprite + signage rendered data-driven from the
  `heal_locations` content rows (the same rows the interact chip already consults) — never a
  hard-coded tile. Any signage text goes through the typed i18n catalog (en+fr).
- **Warp-tile visibility:** warp tiles rendered with a visible marker, data-driven from the
  zone_maps `warps` lists (the transition cue itself shipped in the pt3 quickfix).
- Exit: the operator flow "walk zone 0 → see the healer landmark → take the visibly marked
  warp → arrive somewhere that looks different" holds; `validate_content` green;
  CONTENT_VERSION bumped once per content slice.

### Milestone-wide: placeholder provenance hygiene

One provenance manifest row per asset (source, license, `provenance:` tag), license ladder
CC0 > CC-BY > share-alike > EULA > AI-generated; assets get stable IDs/atlas keys so final
art is a file swap; a release gate fails if any `ai-placeholder`-provenance asset is still
referenced (the 2026 Pearl Abyss shipped-AI-props precedent + Steam/itch disclosure rules,
research §6). AI output is permitted for ideation only — nothing it produced ships.

## Non-goals

- Final art (a professional artist is hired for that; this milestone's deliverable is
  2D-HD-ready placeholders with swap-stable IDs).
- The battle screen, tactical combat UI, or battle backdrop integration — **M-battle-tactics**
  owns those; this milestone only supplies the monster sprite placeholder set (S1).
- The viewport scaling methodology (integer-snap vs continuous responsive, R-ctl-SETRATIO)
  — a standing decision point raised in the feedback-episode batches; S0's fidelity-model
  call feeds it but this milestone does not change `render/viewport.ts` policy.
- Normal-map/deferred lighting for hero/props (research ladder rung 4): the POC generator
  already emits normal maps, but the render pass is deferred until the S2 lightmap alone
  demonstrably looks flat. Occluder shadows likewise.
- Menu/UI chrome, NPC pacing, netcode, trading, economy — other Playtest-3 milestones.
- `@assetpack/core` (DEFER until art volume exists), `@pixi/tilemap` (DEFER, see S1),
  Spine/skeletal animation (AVOID/DEFER — licensing + genre fit, research §7–8).
- Schema or reducer changes. If a slice believes it needs one, that is a hidden-dependency
  STOP, not a silent widening.

## Risks / notes

- **Sequencing:** touches are render/, art assets, and content RON — disjoint from the
  queued ttd-1/so-1/so-2 main.ts work, so this milestone can elaborate without waiting on
  them. S2's filter work and S3's map authoring both depend on S1's kit; S0 blocks all.
- **Density rises together** (research finding 3): if S0 re-bases tile px or character
  canvas, every layer (tiles, characters, monsters, UI pixel grid) moves in the same slice
  wave — a mismatch reads as wrong faster than low resolution.
- **Content vs client split:** map/zone/heal/warp DATA stays in `game-core/content/` RON;
  tile/sprite ART and atlases are client assets. Keep that boundary — content stays
  locale-agnostic, strings in the catalog.
- The POC asset set (tileset incl. water autotiles, hero, Emberkit, HD-2D demo) is currently
  untracked in the game repo; promoting any of it means committing the assets + generator
  with provenance rows like any other source.
- Perf: every full-screen filter is a fill-rate cost and a batch break — render the lightmap
  at reduced resolution, cap simultaneous lights, make every effect toggleable, degrade
  gracefully (research design implications).

## Open decisions (pending)

- ~~pt3-econ-world re-base question~~ — ANSWERED 2026-10-24 (#587 D5): keep ¾/32px/storybook,
  2D-HD as a post stack. S0 unblocked.
- Pixel-fidelity model A vs B (S0 call; interacts with the scaling-methodology decision).
- Native art resolution arithmetic (e.g. 640×360 integer-scales to 720p/1080p/1440p/4K) vs
  the current TARGET_VISIBLE_TILES-driven viewport — S0 call.
- How much of the POC generator set is promoted vs Kenney-kitbashed fresh — build-time
  judgment inside the S0 style guide.
- Luminance-delta threshold for the S1 terrain-readability gate — tune empirically on the
  first screenshot grid (research open question).
