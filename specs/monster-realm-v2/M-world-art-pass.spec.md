# Spec: M-world-art-pass — 2D-HD-ready placeholders and a readable, larger world

**Status:** elaborated 2026-11-09 from the 2026-10-24 sketch · **build-ready: 11 slices** — `wap-0`…`wap-10`
(stage S0 lock → S1 terrain kit, battle placeholders, characters → S3 world content ‖ client render chain → S2 post
stack → integrated whole) · **Project:** monster-realm (game-core terrain grammar + content RON, client render + art
assets; **no table, reducer or binding change**) · **Measured against** monster-realm `master` `a60796e6` (uif-17,
#699) with M-ui-foundation uif-1…uif-17 and M-battle-tactics bt-1…bt-17 merged. **Anchors are symbols, not lines.** ·
**Doctrine:** `standards/testing-tdd.md` — every criterion is an ordinary colocated test or one Chromium e2e per flow;
criteria about committed prose (the style guide, the decision entry) are verified by review with a `path:line`
citation, never by a test that reads the doc · **Decision ANSWERED 2026-10-24** — monster-realm #587 D5
(`pt3-econ-world`): keep ¾ oblique · 32 px/tile · "warm vibrant storybook" as the base and pursue 2D-HD as a
lighting/post-processing stack over it. The verbatim answer at `memory/projects/decisions/issue-587.answer.md` is the
SSOT; it is folded below (`wap-0`, `wap-9`) and is not reopened.

**Gate role:** per the operator's conclusion (feedback L461, pt3-2026-10-166), map, story, cutscene and shader work is
blocked behind this milestone's placeholder upgrade.

**Feedback items:** pt3-2026-10-021, -022 (2D-HD benchmarks), -155 (placeholders far below the benchmarks), -160 (heal
point should be a landmark), -161 (water indistinguishable from grass), -162 (map small, wants variety), -166
(better placeholders needed soon). Related, already shipped: -156's zone-transition cue (quickfix wave); this milestone
adds the visible warp marker. Each slice names the items it closes.

**Absorbed residuals (named in exactly one slice's criteria — see Residual map):** R-uif-11-SPRITESCALE → `wap-3`.

## Problem / intent

The world renderer draws flat colour rects and nothing else: `WorldRenderer#drawMap` in `client/src/render/world.ts`
fills `WALL_COLOR` where a tile is not walkable and `GRASS_COLOR` where it is tall grass, over a near-black
`FLOOR_COLOR` clear. Characters are `PlaceholderAssets` rounded squares. Measured consequences from the 2026-10
playtest fact-check:

- The ONE authored heal location (`game-core/content/heal_locations/000-core.ron`: zone 0, tile (8,3)) sits on a tall
  grass tile (`"#...##..~#"`, x=8) and renders as ordinary grass, so the operator read it as "a random water tile that
  heals" (pt3-160). The shipped mechanism already matches his landmark intent; the defect is presentation, plus the
  fact that stepping onto the healer can start a wild encounter.
- "Water indistinguishable from grass" (pt3-161) is literally true: the tile grammar is `.` floor / `#` wall /
  `~` tall grass only (`TileKind::from_char` in `game-core/src/types.rs`), so there is no water to draw. The POC
  tileset `client/public/assets/tileset-edge-of-town.{png,json}` (47 frames incl. `water_c`/`water_c2` and a
  `water_shimmer` animation) is committed but nothing loads it.
- Zones 0 (Verdant Hollow) and 1 (Tideglass Cove) ship byte-identical 10×7 rows joined by the warp at (1,5), and no
  marker shows the warp, so the operator perceived "one map" (pt3-156, pt3-162).
- Battle sprites are CSS-cropped `client/public/assets/monster-<slug>.png` sheets: Tidecrag and Cindershade have no
  sheet, and Flameling's sheet ships as `monster-emberkit.png` while `spriteSlug('Flameling')` asks for
  `monster-flameling.png` — three species paint an empty unit today (a latent bug, fixed here).
- The benchmarks the operator names (Octopath, Sea of Stars — pt3-021/-022) are a lighting + density stack, not an asset
  format; most of it is reproducible in the 2D renderer (harness `docs/research/hd2d-modern-retro-art-direction.md`).

This milestone follows that research doc's staged path (§8): lock the style guide, build a readable terrain kit, stand
up the light/grade pass on a look-dev scene, and author real world content on top. Placeholders are honest,
provenance-tracked stand-ins for a hired artist's final art — never image-model output that could leak into a release.

## What already shipped (do not rebuild; these are floors)

- **Integer world scale** — DECISIONS.md "Integer pixel scaling" and "One viewport number scales the world by integers
  and the chrome continuously" (uif-2, #586 D1). This IS pixel-fidelity model A (strict integer grid). The style guide
  records it; no slice re-decides it, changes `render/viewport.ts` policy, or changes `TILE_PX` (32) or
  `TARGET_VISIBLE_TILES` (11).
- **Follow camera** (`render/camera.ts`) already scrolls a map larger than the viewport, so growing a zone needs no
  camera work.
- **The asset seam** — `AssetProvider` in `render/characterView.ts` (neutrally lit, HD-2D-ready) and
  `textureCache.destroyAllTextures` for teardown.
- **The POC art set and its generators** — committed: `client/art-src/generate_art.py` (stdlib-only, emits the hero,
  the edge-of-town tileset, the palette and their normal maps), `client/art-src/generate_monsters.py` (`PLAN_TABLE`,
  13 slugs) and `client/public/assets/` (hero, tileset, palette, 17 monster sheets, most with `-normal` maps). Nothing
  invokes the generators in CI; they are run by hand from `client/`.
- **Reduced motion** — `render/motionPreference.ts` is the sole `matchMedia` reader (A11Y-28); consumers receive the
  `MotionPreference` bit by injection.
- **The heal interaction** — the interact chip reads `heal_location_row` through the bindings and store
  (`ui/interactModel.ts` → wasm `interact_candidates_coded`); it is untouched.
- **The battle board** — a DOM grid (`tactics/boardRender.ts`) with ONE CSS background `.tactics-bg` and 64 px
  `.tactics-sprite` crops; M-battle-tactics deliberately left sprites/backdrop to this milestone.

## Decision folded (#587 D5 — the answer file is SSOT)

| # | Answer (2026-10-24) | Where it lands |
|---|---|---|
| #587 D5 | Keep ¾ / 32 px / storybook as the base; 2D-HD as a lighting/post-processing stack over it; "consider whether there are any PixiJS-compatible libraries that would be genuinely useful" | `wap-0` records the base in the style guide; `wap-9` builds the post stack on `pixi-filters` (the vetted USE verdict, `docs/research/pixijs-ecosystem-ui-and-assets.md` §0/§6). Re-scanned at this elaboration: the verdict table (dated 2026-10-24) is unchanged — `pixi-filters` USE (selective subpaths, profile-gated); `@pixi/tilemap` DEFER (a 40×28 map is 1,120 tiles: plain sprites + chunk caching suffice); `@assetpack/core` DEFER; Spine DEFER/AVOID. Nothing outside the USE verdicts is adopted. |

The sketch's other open questions are closed by measurement, not by a new ruling:

- **Pixel-fidelity model A vs B** — A is already the shipped, recorded decision (see the floors above).
- **Native art resolution (640×360 vs the viewport-driven scale)** — the hybrid scale authority (#586 D1, uif-2)
  decided it: the world scale stays viewport-derived (`TARGET_VISIBLE_TILES`), not a fixed native resolution.
- **POC set promoted vs Kenney-kitbashed** — a build-time judgment inside `wap-0`'s style guide, bounded by the
  provenance rules below; the default is to extend the committed stdlib generators (no external pack needed).
- **Luminance-delta threshold** — a floor is fixed in `wap-2`'s criteria (ΔY ≥ 0.06); `wap-2` may only raise it after
  measuring, and records the measured values in the style guide.

## Scope

**IN**

- **S0 (`wap-0`):** a one-page style guide in the game repo (`docs/art/style-guide.md`) and an **art registry** — one
  typed provenance row per served asset, validated by a pure function that is the mixel lint and the provenance gate.
- **S1:** the terrain grammar (`wap-1`: ten terrain classes, glyphs in the zone-map RON, walkability derived once in
  `game-core`); the terrain-kit atlas (`wap-2`: ten classes × ≥3 variants, animated water, shore band); the battle
  placeholder set (`wap-3`: the two missing sheets, registry-resolved URLs, integer art scale, a palette-coordinated
  backdrop); the terrain renderer (`wap-4`); the hero/character atlas (`wap-5`).
- **S3:** heal landmark + warp markers drawn from data (`wap-6`); a distinct, larger Tideglass Cove (`wap-7`); a larger
  Verdant Hollow whose healer tile no longer starts encounters (`wap-8`).
- **S2 (`wap-9`):** the post stack (ambient lightmap, emissive, AdvancedBloom, Godray, ColorMap LUT time-of-day
  keyframes, vignette) over the world layer only, each pass toggleable, deterministic, reduced-motion-safe, with a
  fixture-page look-dev scene.
- **Integrated whole (`wap-10`):** the operator flow e2e through the real UI and the closing docs.

**Named deferrals (declared, not dropped)**

| Deferred | Target | Why |
|---|---|---|
| Final art | backlog — a final-art milestone, unscheduled (artist hire) | This milestone delivers swap-stable placeholders |
| Release gate that every registry row is `final` (`releaseBlockers` wired into the launch build) | backlog — launch checklist beside M25 sign-off | Wiring it now fails every build; the pure function and its tests land in `wap-0` |
| Normal-map / deferred lighting for hero and props (research rung 4), occluder shadows | backlog | Only if the `wap-9` lightmap alone demonstrably looks flat |
| Live time-of-day cycle in the game | backlog | Needs a world-clock design; `wap-9` ships keyframes, the game uses `day` |
| A player-facing graphics/quality setting (per-pass toggles in Controls) | backlog | A UI-kit screen change; `wap-9`'s toggles are code config |
| Per-zone battle backdrops; a Pixi battle board | backlog | One backdrop asset suffices; the DOM board stays (M-battle-tactics non-goal) |
| NPC / remote-player sprite variety | backlog | `RenderEntity` carries no entity kind; adding it touches `main.ts` and the predictor feed |
| Roof and interior-floor classes; in-world text signage | backlog — with the first interior content | No interiors exist; text in the canvas needs a pixel font + catalog keys |
| Stage-4 polish: tilt-shift, particles, parallax, cloud shadows, foliage loops | backlog | Research §8 stage 4 |
| A frame-time gate per pass | backlog | CI Chromium uses software GL; budgets are measured and recorded (`wap-9`), not asserted |
| `@pixi/tilemap`, `@assetpack/core`, Spine | per the ecosystem verdicts | DEFER / DEFER / DEFER-AVOID |
| Share-alike or EULA-licensed assets | backlog — needs counsel sign-off | The registry rejects them in this milestone |
| A screen-reader mirror of a sprite's action state | `rb-99` (R-rb-57-X4, residuals.spec.md) | Not absorbed; `wap-5` keeps the visual non-colour cue |

## Non-goals

- The battle screen's tactical UI, layout or flow (M-battle-tactics owns them; `wap-3` swaps assets behind the
  shipped seam).
- Viewport scaling policy (`render/viewport.ts`, `TILE_PX`, `TARGET_VISIBLE_TILES`) — decided (#586 D1). R-ctl-SETRATIO
  was closed by `uif-2`.
- Menu/UI chrome, netcode, NPC pacing, trading, economy.
- Schema or reducer changes. A new `TileKind` variant is a `SpacetimeType` shape change (the
  `evals/baselines/spacetime-types.json` baseline, tail-append only) but `TileKind` sits in no table and in no binding.
  If a slice believes it needs a table, reducer or binding change, that is a hidden-dependency STOP.
- New zones (zone 2+), new heal locations, or moving the heal tile.

## Constraints (house rules and prior rulings that bind every slice)

1. **Visual SSOT** — the terrain a tile shows and whether it can be walked derive from the SAME glyph, once, in
   `game-core`; the client never holds a parallel grid (`render/map.ts` header). Landmarks and warp markers are drawn
   from content rows, never hard-coded coordinates.
2. **Content is data** — map/zone/heal/warp data stays in `game-core/content/` RON; art and atlases are client assets.
   Every byte change under `game-core/content/` bumps `CONTENT_VERSION` (`server-module/src/lib.rs`, today 25) and
   regenerates `evals/baselines/content-hash.json` (the `content-version` eval hashes raw bytes, so a comment-only RON
   edit counts). Only `wap-7` and `wap-8` edit content; each bumps once.
3. **Additive** — `TileKind` variants are tail-appended; `zone_map()`'s JS payload only gains fields (`terrain`,
   `landmarks`); every existing field name (`zone_id`, `width`, `height`, `walkable`, `grass`, `warps`) stays, because
   `client/e2e/controls.ts` `safeTile` and ~36 main-boot test fixtures read them.
4. **Pure core / imperative shell** — decision logic lives in new pure, unit-tested modules under `client/src/render/`;
   Pixi calls stay inside `world.ts` and `characterView.ts`, which are already coverage-excluded. No slice adds a file
   to `client/vite.config.ts`'s coverage `exclude` list (it is exact-set-guarded by the dom-shell-coverage-exclusion
   eval).
5. **The `WorldRenderer` surface the mocks assume** (`init`, `setMap`, `render`, `resize`, `screenFor`, `clear`,
   `destroy`, `viewCount`) stays; any new method main.ts calls is invoked optionally (`renderer?.x?.()`), because 36
   test files replace `./render/world` with a mock lacking it.
6. **Determinism render-side** — time enters render code only as an injected `nowMs`; variant choice is an integer hash
   of (zone, x, y); no `Math.random`, no wall-clock read in shaders, filters or animation.
7. **Smoothness contract** — the slide clock, interpolation buffer and reconcile are untouched; per-frame work added by
   this milestone is texture swaps on animated tiles only when their frame index changes.
8. **Reduced motion** — every animation this milestone adds (water, warp pulse, godray time) holds a static frame WHILE
   `reduceMotion` is set; the bit arrives by injection from `motionPreference.ts`.
9. **Never colour alone** — water reads by value, texture, motion and edge; the warp marker and the landmark read by
   shape; character actions read by pose.
10. **Provenance** — every served file under `client/public/assets/` has exactly one registry row (source, license,
    provenance tag). License ladder: CC0 > CC-BY > share-alike > EULA > AI-generated. In this milestone only
    `CC0-1.0`, `CC-BY-4.0`/`CC-BY-3.0` (with an attribution string) and `project-original` (this repo's own generators)
    are accepted. The tag `ai-placeholder` (image-model output) is forbidden in a committed row: AI output is for
    ideation only and nothing it produced ships. Atlas keys are stable ids, so final art is a file swap.

## The style guide (what `wap-0` commits)

`docs/art/style-guide.md` (game repo), one page: perspective ¾ oblique; tile 32 px; character canvas 32×32 (hero and
monster frames); fidelity model A (integer grid, citing the two DECISIONS entries); light direction (top-left, for the
`wap-9` lightmap and the normal maps); the master palette ramps (the generators' ramp table is the source) and one
**value band per terrain class**; outline policy; frame budgets (water 4 frames, warp pulse 2–4, walk 2 steps + mid);
naming and atlas-key rules (`<pack>/<class>_<variant>` style, stable); "no baked cast shadows, small contact AO only";
the provenance fields and ladder; and the terrain class table:

| Class | Glyph | Walkable | Encounter | Notes |
|---|---|---|---|---|
| ground (short grass) | `.` | yes | no | the existing floor glyph, now drawn as outdoor ground |
| tall grass | `~` | yes | yes | the only encounter class (`is_grass`) |
| path | `=` | yes | no | |
| sand | `:` | yes | no | |
| shallow water | `w` | no | no | its own value band; animated; shore band at land edges |
| deep water | `W` | no | no | darker band than shallow; animated |
| rock | `^` | no | no | |
| tree | `T` | no | no | |
| bush | `*` | no | no | |
| wall | `#` | no | no | the existing wall glyph |

Readability pairs (adjacent classes that must separate by value, `wap-2`): ground–tall grass, ground–path,
ground–sand, path–sand, sand–shallow water, shallow–deep water, ground–shallow water, tall grass–shallow water,
ground–rock, ground–tree, ground–bush, tall grass–bush, ground–wall, path–wall, sand–rock.

## Acceptance — integrated whole (proven end-to-end at `wap-10`)

- **WAP.1:** WHEN a zone is drawn, THE CLIENT SHALL draw every tile from the terrain kit by its terrain class, with no
  flat-colour terrain rect outside the atlas-load-failure fallback, and every readability pair SHALL separate by value.

- **WAP.2:** WHERE a tile is water, THE CLIENT SHALL show it in its own value band with a wave texture, a 2–4 frame
  animation that holds still under reduced motion, and a shore band where it meets land.

- **WAP.3:** WHEN a zone has heal_locations rows, THE CLIENT SHALL draw the heal landmark at each row's tile from that
  data, and stepping onto a heal tile SHALL NOT start a wild encounter.

- **WAP.4:** WHEN a zone has warps, THE CLIENT SHALL draw a visible, shape-coded marker on every warp source tile.

- **WAP.5:** THE two zones SHALL be larger than 10×7 and visibly distinct, and the flow "walk zone 0 → see the healer
  landmark → take the marked warp → arrive somewhere that looks different" SHALL hold through the real UI.

- **WAP.6:** WHEN a battle shows a unit, ITS sprite SHALL resolve through the art registry with no request for a
  missing file, at an integer multiple of the 32 px frame, over a palette-coordinated backdrop.

- **WAP.7:** WHILE the post stack runs, IT SHALL filter the world layer only, each pass individually toggleable,
  deterministic for an injected time, frozen under reduced motion, and disabled cleanly where filters are unsupported.

- **WAP.8:** THE art registry SHALL carry exactly one provenance row per served asset with an accepted license, no row
  SHALL carry the ai-placeholder tag, and every row's atlas key SHALL be a stable id so final art is a file swap.

## Sequencing & fan-out

```
wap-0 ─┬─ wap-1 ─┬────────────── wap-4 ── wap-5 ── wap-6 ─┐
       │         └─ wap-7 ── wap-8 ───────────────────────┤
       ├─ wap-2 ───────────── (wap-4 after wap-1 + wap-2) │
       └─ wap-3 ──────────────────────────────────────────┴─ wap-9 ── wap-10
```

- `wap-0` blocks everything (the style guide names the classes; the registry is where every later asset row lands).
- After `wap-0`, **three-way fan-out**: `wap-1` (game-core/wasm/map.ts), `wap-2` (terrain art) and `wap-3` (battle) are
  pairwise file-disjoint.
- After `wap-1`, the **content chain** (`wap-7` → `wap-8`: zone RON, `world.rs`, sim-harness, e2e routes) runs beside
  the **render chain** (`wap-4` → `wap-5` → `wap-6`, serial because all three edit `world.ts`) and beside `wap-3`.
- `wap-9` adds `pixi-filters` (a `client/package-lock.json` change — a structural surface), so it is ordered after
  every other build slice; `wap-10` closes.
- Each asset slice owns its own registry pack file (`client/src/render/art/packs/*.ts`, created empty by `wap-0`), so
  asset slices never collide on the registry.

## Residual map

| Residual | Slice | Disposition at merge |
|---|---|---|
| R-uif-11-SPRITESCALE | wap-3 | Fixed: board sprite, HP bar and base mark take the integer art scale |
| R-ctl-SETRATIO | — | Already closed by `uif-2` (#586 D1); not reopened |
| R-m23-s8-postmerge-tint | — | Already closed by rb-57; `wap-5` must keep the non-colour action cue it pinned |
| R-rb-57-X4 (rb-99) | — | Not absorbed; stays with `rb-99` |

## Slices

### wap-0 — Lock: the style guide and the art registry
category: content · severity: MED · size: MODERATE
touches: docs/art/style-guide.md, docs/DECISIONS.md, client/art-src/README.md, client/src/render/art/registry.ts, client/src/render/art/registry.test.ts, client/src/render/art/packs/characters.ts, client/src/render/art/packs/monsters.ts, client/src/render/art/packs/terrain.ts, client/src/render/art/packs/landmarks.ts, client/src/render/art/packs/battle.ts, client/src/render/art/packs/grade.ts
after: []
Feedback items: pt3-2026-10-021, -022, -155, -166
Measured: no provenance, credits or asset-license file exists anywhere in the game repo (only the root `LICENSE`);
`.gitattributes` marks `*.png binary` (no LFS). The only reader of `client/public/assets/` is the grandfathered
`evals/monster-spritesheet-format.eval.mjs` (monster sheets only). The served set today: `hero{,-normal}.{png,json}`,
`tileset-edge-of-town{,-normal}.{png,json}`, `palette.png`, and 17 `monster-*` sheets, 13 of them with `-normal` maps
(the eval's `NO_NORMAL_MAP` exempts wave-1 ids 7–10). All were produced by this repo's own stdlib generators. The pack
files `terrain.ts`, `landmarks.ts`, `battle.ts`, `grade.ts` start as empty row arrays so later slices fill them without
touching `registry.ts`. The registry is product code (later slices resolve atlas keys through it), so its test exercises
the function over the real rows; it reads PNG headers (generated artifacts), never the text of a hand-authored file.

- **WAP0.1:** THE game repo SHALL carry `docs/art/style-guide.md` recording the base (¾ oblique, 32 px tile, storybook
  palette, #587 D5), fidelity model A citing the two scaling decisions, light direction, palette ramps with one value
  band per terrain class, outline policy, frame budgets, atlas-key rules, the no-baked-cast-shadow rule, the provenance
  fields and ladder, and the ten-class terrain table and readability pairs exactly as this spec states them (verified
  by review with a path:line citation).

- **WAP0.2:** WHEN `validateArtRegistry` receives a row lacking a source, license or provenance tag, a license outside
  the accepted set, a CC-BY row without an attribution string, the `ai-placeholder` tag, a duplicate atlas key or file,
  or a sprite/tile frame whose width or height is not a whole multiple of 16 px or whose atlas scale is not 1, IT SHALL
  reject the registry and name the offending row.

- **WAP0.3:** WHEN `validateArtRegistry` runs over the real aggregated registry, IT SHALL accept it, and every row's file
  SHALL exist under `client/public/assets/` with PNG header dimensions equal to the row's declared sheet size, and every
  PNG served under `client/public/assets/` SHALL be named by exactly one row.

- **WAP0.4:** WHEN `releaseBlockers` receives a registry, IT SHALL return exactly the rows whose provenance is not
  `final`, so the deferred launch gate has one tested query to call.

- **WAP0.5:** THE existing served assets SHALL be registered with provenance `placeholder-procedural`, license
  `project-original` and the generator path as source, and `client/art-src/README.md` SHALL point generator users at
  the registry as the place every new output is recorded.

- **WAP0.6:** THE game repo's `docs/DECISIONS.md` SHALL gain one entry recording that every served asset carries a
  registry provenance row, that image-model output never ships, and that `pixi-filters` is the adopted post-processing
  library under the ecosystem USE verdict (verified by review with a path:line citation).

### wap-1 — Terrain grammar: ten classes, one grid, a richer zone payload
category: gameplay · severity: MED · size: MODERATE
touches: game-core/src/types.rs, game-core/src/world.rs, game-core/src/grass_encounter_tests.rs, game-core/src/bin/tiled_import.rs, game-core/tests/tiled_import_cli.rs, .cargo/mutants.toml, evals/baselines/spacetime-types.json, client-wasm/src/lib.rs, client/src/render/map.ts, client/src/render/map.test.ts
after: [wap-0]
Feedback items: pt3-2026-10-161, -162
Measured: `TileKind { Floor, Wall, TallGrass }` (`types.rs`) derives `SpacetimeType` behind the `spacetimedb` feature, so
new variants are tail-appended and `evals/baselines/spacetime-types.json` gains them (spacetime-type-snapshot eval);
`TileKind` is in no table and no binding. `TileKind::from_char` rejects unknown glyphs and `is_walkable` is an exhaustive
match. `build_grid` (`world.rs`) keeps only `walkable` and `grass`, so `TileMap` gains a `terrain` layer. `TileMap` is
`Serialize`-only; `client-wasm` `zone_map()` serializes it with `serde_wasm_bindgen`, so a new field appears in the JS
payload with no other change. Negative glyph tests use `'Z'` (`grass_encounter_tests.rs`) and `'X'` (`types.rs`): the
new glyphs avoid both. `tiled_import.rs` maps GIDs 0/1/2 only and `.cargo/mutants.toml` pins `tiled_import.rs:<line>`
regexes that go stale if lines move. `game_core::content::load_heal_locations` exists, so the wasm payload can carry
landmarks from compiled content with no store or `main.ts` change. **No byte under `game-core/content/` changes in this
slice** (the RON header's glyph documentation moves with `wap-7`'s bump), so `CONTENT_VERSION` stays 25.

- **WAP1.1:** WHEN a zone-map row contains one of the ten class glyphs, `game-core` SHALL build that tile with the style
  guide's class, walkability and encounter flag, and an unknown glyph SHALL remain a load error naming the glyph and
  its tile.

- **WAP1.2:** WHEN a mover steps from a walkable tile onto each class, THE shared movement rule SHALL move onto ground,
  tall grass, path and sand and SHALL bump on shallow water, deep water, rock, tree, bush and wall, and only tall grass
  SHALL report `is_grass`, proven over a fixture map containing all ten glyphs.

- **WAP1.3:** WHEN `zone_map(zone_id)` is called, THE wasm payload SHALL add a row-major `terrain` list parallel to
  `walkable` naming each tile's class and a `landmarks` list with one `{ kind: 'heal', x, y }` per compiled
  heal_locations row of that zone, while every existing field keeps its name and value.

- **WAP1.4:** WHEN `TileMap.fromRaw` parses a payload, IT SHALL expose `terrainAt(x, y)` and `landmarks`; a payload
  without `terrain` SHALL derive wall / tall grass / ground from `walkable` and `grass`, a payload without `landmarks`
  SHALL have none, and a ragged `terrain` list or an unknown class name SHALL throw.

- **WAP1.5:** WHEN `tiled_import` reads a Tiled layer, IT SHALL map the style guide's GID table for all ten classes and
  SHALL still reject an unmapped GID.

### wap-2 — The terrain kit: ten classes, variants, animated water, shore band
category: content · severity: MED · size: MODERATE
touches: client/art-src/generate_art.py, client/art-src/README.md, client/art-src/preview/terrain-kit@6x.png, client/art-src/preview/terrain-kit-normal@6x.png, client/public/assets/terrain-kit.png, client/public/assets/terrain-kit.json, client/public/assets/terrain-kit-normal.png, client/public/assets/terrain-kit-normal.json, client/src/render/art/packs/terrain.ts, client/src/render/art/terrainKit.test.ts, client/test-util/pngDecode.ts, docs/art/style-guide.md
after: [wap-0]
Feedback items: pt3-2026-10-161, -155
Measured: `generate_art.py` already carries the master-palette ramp table and emits grass, tall grass, path autotiles,
bush, rock, tree canopy/trunk, wall and two water frames (`water_c`, `water_c2`, no inner corners) into
`tileset-edge-of-town`; the kit is a NEW atlas so the POC tileset stays untouched (no consumer reads it; it keeps its
`wap-0` row). Node's `zlib` can inflate PNG IDAT, so the luminance test decodes the generated atlas with a small
test-util helper and needs no new dependency. The pack's rows declare, per class, its variant frame keys, its
animation frame keys (water) and the shore-band keys — the data `wap-4` lays out.

- **WAP2.1:** THE terrain kit atlas SHALL hold, at scale 1 and 32×32 per frame, at least three variant frames for each of
  the ten classes, four pairwise-distinct animation frames for each water class, and shore-band frames for the four
  edges, four outer corners and four inner corners where shallow water meets land.

- **WAP2.2:** WHEN the kit atlas is decoded, EVERY readability pair SHALL differ in mean relative luminance (Rec. 709) of
  its base frames by at least 0.06, and the measured value of each pair SHALL be recorded in the style guide.

- **WAP2.3:** WHEN a 4×4-tile patch of shallow water and one of ground are each box-downsampled to 16×16 px, THE two
  thumbnails SHALL still differ in mean luminance by at least 0.06 and the water thumbnail's mean blue SHALL exceed its
  mean green.

- **WAP2.4:** THE kit's normal atlas SHALL carry the same frame keys with byte-identical frame rects as the albedo atlas,
  and both SHALL have `packs/terrain.ts` provenance rows that pass `validateArtRegistry`.

### wap-3 — Battle placeholders: every species, registry URLs, integer art scale, a backdrop
category: content · severity: MED · size: MODERATE
touches: client/art-src/generate_monsters.py, client/art-src/generate_backdrop.py, client/art-src/preview/monster-tidecrag@6x.png, client/art-src/preview/monster-tidecrag-normal@6x.png, client/art-src/preview/monster-tidecrag-lit@6x.png, client/art-src/preview/monster-cindershade@6x.png, client/art-src/preview/monster-cindershade-normal@6x.png, client/art-src/preview/monster-cindershade-lit@6x.png, client/public/assets/monster-tidecrag.png, client/public/assets/monster-tidecrag.json, client/public/assets/monster-tidecrag-normal.png, client/public/assets/monster-tidecrag-normal.json, client/public/assets/monster-cindershade.png, client/public/assets/monster-cindershade.json, client/public/assets/monster-cindershade-normal.png, client/public/assets/monster-cindershade-normal.json, client/public/assets/battle-backdrop.png, client/src/render/art/packs/monsters.ts, client/src/render/art/packs/battle.ts, client/src/tactics/boardModel.ts, client/src/tactics/boardModel.test.ts, client/src/tactics/boardRender.ts, client/src/tactics/boardRender.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/styles.css, client/src/styles.test.ts, evals/monster-spritesheet-format.eval.mjs
after: [wap-0]
Feedback items: pt3-2026-10-155, -166
Measured: `boardRender.ts` and `tacticsBattle.ts` (ghost sprite) build `url("assets/monster-${slug}.png")` from
`boardModel.spriteSlug(name)`, which lower-cases any alphabetic name with no existence check, so Flameling requests
`monster-flameling.png` (its sheet is `monster-emberkit.png`; only the eval's `SLUG_OVERRIDES` knows) and Tidecrag (30)
and Cindershade (31) request sheets that do not exist (the eval's `NO_SHEET_YET`). `boardRender.test.ts`
BT10-1-RENDER-SPRITE pins the URL form for synthetic slugs, and BT10-1-CSS-LAYOUT reads `styles.css`: `.tactics-bg` needs a
hex-colour `background` brighter than the dock, `.tactics-sprite` is pinned at 64 px / `background-size 192px 256px` /
`image-rendering: pixelated`. `styles.test.ts`'s uif-11 allowlist (`ART_EXACT` has `.tactics-bg`, `ART_PREFIX` has
`.tactics-sprite`) is where art rules may keep px. The eval requires every non-exempt species to have
`monster-<slug>.{png,json}` + `-normal.{png,json}` in the 96×128 / 12-frame format. These tests change here with the
change named; the grandfathered eval is maintained in place (its exemption set shrinks), never imitated.

- **WAP3.1:** THE Tidecrag and Cindershade sheets and normal maps SHALL ship in the shipped monster format from
  `generate_monsters.py`'s plan table, and the spritesheet eval SHALL pass with no species exempt from having a sheet.

- **WAP3.2:** WHEN the board or a ghost renders a unit, ITS sprite URL SHALL come from the art registry's monster row for
  that species — Flameling resolving to its emberkit sheet — and a species with no row SHALL render the
  `tactics-sprite--none` treatment and request no file.

- **WAP3.3:** WHEN the board lays out at any viewport, THE unit sprite, its HP bar and its base mark SHALL size from one
  integer art multiple of the 32 px frame derived from the single scale authority, never a fixed 64 px, closing
  R-uif-11-SPRITESCALE.

- **WAP3.4:** THE battlefield SHALL paint a palette-coordinated placeholder backdrop image registered in
  `packs/battle.ts` over the retained hex fallback colour, and the board's backdrop-brighter-than-dock check SHALL keep
  passing.

### wap-4 — The terrain renderer: kit sprites, variants, shore band, animated water
category: ux-a11y · severity: MED · size: HEAVY
touches: client/src/render/world.ts, client/src/render/terrainLayout.ts, client/src/render/terrainLayout.test.ts, client/src/render/config.ts, client/src/main.ts, client/src/main.reducedMotionWiring.test.ts
after: [wap-1, wap-2]
Feedback items: pt3-2026-10-161, -155
Measured: `#drawMap` builds one `Graphics` of rects and is rebuilt on `setMap` (destroying the old children). `world.ts`
loads no asset today; `Assets` loading and sprite/`cacheAsTexture` calls stay in it (coverage-excluded). `render()` is
called per frame from `main.ts` with `(entities, lastCamX, lastCamY)`; the injected `nowMs` and `reduceMotion` reach it
as one added optional argument from main.ts, which already holds the `MotionPreference` (the resolver's
`ResolveInput.reduceMotion` comes from it). `main.reducedMotionWiring.test.ts` uses `worldRendererNoCanvasMock()`, so it
can observe the argument. `main.dispatch.test.ts` reads main.ts text: if that scan pins the `renderer?.render(` call
shape, it is a hidden dependency (STOP). New render constants (water frame period, chunk size) live in `config.ts`
beside `TILE_PX`; `camera.test.ts` / `viewport.test.ts` import config but none of the new names.

- **WAP4.1:** WHEN a map is drawn, `layoutTerrain` SHALL return exactly one kit frame key for every in-bounds tile chosen
  by its terrain class, and the renderer SHALL draw those frames with no flat-colour terrain rect, falling back to the
  flat draw only when the kit fails to load, logged once.

- **WAP4.2:** WHEN a tile's variant is chosen, IT SHALL be a pure integer hash of (zone, x, y), identical across redraws
  and sessions, and a 10×10 field of one class SHALL show at least two variants.

- **WAP4.3:** WHEN a water tile borders land, IT SHALL draw the shore-band frame its 8-neighbour mask selects, and every
  one of the 256 masks SHALL map to a defined frame.

- **WAP4.4:** WHEN frames advance, THE water animation frame SHALL be a pure function of the injected `nowMs` at the style
  guide's period, and WHILE reduced motion is set IT SHALL hold frame 0.

- **WAP4.5:** WHEN static terrain is drawn, IT SHALL be cached as texture chunks that tile the map exactly with the
  animated water on a separate layer, and `setMap` and `destroy` SHALL release every chunk texture they created.

### wap-5 — Characters: the hero atlas behind the AssetProvider seam
category: ux-a11y · severity: LOW · size: LIGHT
touches: client/src/render/world.ts, client/src/render/atlasAssets.ts, client/src/render/atlasAssets.test.ts, client/src/render/characterView.ts, client/src/render/art/packs/characters.ts
after: [wap-4]
Feedback items: pt3-2026-10-155
Measured: `hero.json` holds `hero_{down,up,right,left}_{idle,stepA,mid,stepB,jump}` (32×32, 160×128 sheet) keyed for the
`AssetProvider` `(action, facing)` seam; `PlaceholderAssets` (and `placeholderAssets.test.ts`, which pins its non-colour
glyph cue) stays as the load-failure fallback, unchanged. Every entity (own, remote, NPC) shares one provider today, so
all wear the hero sprite — no regression, since all are identical squares now; variety is a named deferral. The walk
cycle is chosen from the fractional tile position `CharacterView.update` already receives, so it follows the slide
clock with no second clock.

- **WAP5.1:** WHEN `AtlasAssets` is asked for any (action, facing), IT SHALL return the mapped hero frame, the mapping
  being total over both enums so a new member is a compile error, and the three actions SHALL map to three distinct
  poses in every facing.

- **WAP5.2:** WHILE a character walks, ITS frame SHALL alternate the step poses by the fractional position within the
  current step, so the cycle is a pure function of the slide-clock position.

- **WAP5.3:** WHEN the hero atlas fails to load, THE renderer SHALL fall back to `PlaceholderAssets`, and teardown SHALL
  release the provider's textures either way.

### wap-6 — Landmarks and warp markers, drawn from data
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/render/world.ts, client/src/render/decorLayout.ts, client/src/render/decorLayout.test.ts, client/art-src/generate_art.py, client/art-src/README.md, client/art-src/preview/landmarks@6x.png, client/public/assets/landmarks.png, client/public/assets/landmarks.json, client/src/render/art/packs/landmarks.ts
after: [wap-5]
Feedback items: pt3-2026-10-160, -156
Measured: `TileMap.isWarp` already exists client-side (from `warps`), and `wap-1` adds `TileMap.landmarks`. Actors sort
by `zIndexForEntity(y)` (`render/zorder.ts`) in a `sortableChildren` container, so a landmark taller than one tile joins
that container with its own tile-row z-index. The sign is a pictogram drawn into the sprite: no catalog key is added
(the catalogs are pinned at 524 keys per locale), and the interact chip keeps naming the healer.

- **WAP6.1:** WHEN a map with landmarks is drawn, `layoutDecor` SHALL place the heal-landmark sprite at each landmark's
  tile and at no other, and a map without landmarks SHALL place none.

- **WAP6.2:** WHEN a map with warps is drawn, `layoutDecor` SHALL place a warp marker on every warp source tile, the
  marker distinct from every terrain frame by shape, and ITS pulse SHALL hold a static frame WHILE reduced motion is set.

- **WAP6.3:** WHEN a character stands on the row above a landmark, THE landmark SHALL draw in front of it, and on the row
  below, behind it, by the shared row z-order.

### wap-7 — Tideglass Cove: a distinct, larger coastal zone
category: content · severity: MED · size: HEAVY
touches: game-core/content/zone_maps/000-core.ron, game-core/src/world.rs, server-module/src/lib.rs, evals/baselines/content-hash.json, server-module/src/movement_tests.rs, sim-harness/src/world.rs, sim-harness/src/lib.rs, client/e2e/shop-npc.spec.ts, client/e2e/wallet-balance.spec.ts, client/e2e/ui-world-sheets.spec.ts
after: [wap-1]
Feedback items: pt3-2026-10-162, -156
Measured: zone 1 has no code-constant twin (zone 0's `ZONE_0_ROWS` is `wap-8`'s); its rows are read from the RON by
`map_for`. Anchors read by tests: landing / return warp (1,5) (both directions must be walkable — `validate_zone_maps`
check 8, `warps_avoid_npc_homes_and_the_heal_tile`); `tideglass_shopkeeper` home (8,1), radius 0, with (7,1) its shop
post (`shop-npc.spec.ts`, `wallet-balance.spec.ts`, `ui-world-sheets.spec.ts`); the e2e routes walk column x=1
(y=1..5), row 1 (x=1..7), row 5 (x=1..6) and column x=6 (y=1..5) as written for the identical layouts;
`sim-harness/src/world.rs` assumes column x=1 floor for y=1..5 in both maps. The zone registry bound is 40×28
(`validate_zone_maps` check 4, upper bound only). The disciplined default keeps those anchor tiles walkable and
grass-free so the routes stay valid; the "byte-identical" comments in those files are corrected. The RON header gains
the ten-glyph legend here (inside this slice's one bump).

- **WAP7.1:** THE Tideglass Cove rows SHALL differ from Verdant Hollow's, measure at least 24×16 and at most the 40×28
  registry bound, and use at least six terrain classes with shallow plus deep water covering at least 15% and sand at
  least 10% of the tiles.

- **WAP7.2:** WHEN reachability is computed from the landing tile (1,5), EVERY walkable zone-1 tile SHALL be reachable, the
  shop post (7,1) and the return warp included, and at least eight tall-grass tiles SHALL be reachable so encounters
  still trigger.

- **WAP7.3:** THE zone-1 anchors (warp (1,5), shopkeeper (8,1) and post (7,1), and the e2e route tiles) SHALL stay
  walkable and grass-free, so `shop-npc`, `wallet-balance` and `ui-world-sheets` pass with their routes unchanged or
  rewritten in this slice with the change named.

- **WAP7.4:** WHEN the zone-map content changes, `CONTENT_VERSION` SHALL be bumped exactly once and the content-hash
  baseline regenerated, and `validate_zone_maps` and the sim-harness scenarios SHALL stay green.

### wap-8 — Verdant Hollow: a larger starting zone and a healer that is not grass
category: content · severity: MED · size: HEAVY
touches: game-core/content/zone_maps/000-core.ron, game-core/src/world.rs, game-core/src/content.rs, game-core/src/npc/rules_tests.rs, game-core/src/npc/rules.rs, game-core/tests/interact_reachability.rs, server-module/src/lib.rs, evals/baselines/content-hash.json, server-module/src/npc_tests.rs, server-module/src/movement_tests.rs, sim-harness/src/world.rs, sim-harness/src/lib.rs, sim-harness/src/bin/mr_load_driver.rs, sim-harness/src/bin/movement_vectors.rs, client-wasm/src/lib.rs, client/e2e/dialogue.spec.ts, client/e2e/recruit.spec.ts, client/e2e/remap.spec.ts, client/e2e/ui-world-sheets.spec.ts, client/e2e/menu-flow.spec.ts, client/e2e/pointer.spec.ts, client/e2e/wallet-balance.spec.ts, client/e2e/movement-input.spec.ts, client/e2e/zoneSync.spec.ts, client/e2e/shop-npc.spec.ts
after: [wap-7]
Feedback items: pt3-2026-10-162, -160
Measured: zone 0 lives twice — the RON and `ZONE_0_ROWS` / `zone_0()` in `world.rs`, held equal by
`zone_0_matches_authored_ron` — and `zone_0()` feeds `apply_move_coded` / `predict_move`, the wasm `ACTIVE_TILE_MAP`
default and `movement_vectors` (the movement-parity eval: (1,1) East moves, (1,1) North bumps, (3,3) Jump East blocked by
(4,3), (8,5) South bumps, (2,2) West moves). Pinned anchors: spawn (1,1); corridor row 1 x=1..8 walkable and grass-free
(`movement-input`, `zoneSync`, sim-harness east steps); (0,1) and (9,1) walls and (1,2) floor / (2,2) grass
(`mr_load_driver`); `elder_oak` home (5,5) radius 2; posts (6,2), (6,3), (7,3); warp (1,5) and the S×4 route from (1,1)
to it; row 5 floor x=1..6. The disciplined default keeps the original 10×7 block byte-identical except two tiles —
an opening in its south wall at (3,6) (outside the elder's wander disc and no pinned coordinate) and the heal tile
(8,3) becoming path — and grows the zone south and east of it, padding rows 0–6 beyond x=9 with blocked terrain so
(9,1) stays a wall. `game-core/src/content.rs`'s `zone_0_placeholder_map_fits_within_its_registry_dimensions` holds
the 32×24 bound; `grass_encounter_tests.rs` (edited by `wap-1`) scans `zone_0()` grass and is rechecked here.

- **WAP8.1:** THE Verdant Hollow map SHALL measure at least 24×16 and at most the 32×24 registry bound, keep its original
  10×7 block identical except the (3,6) opening and the (8,3) heal tile, and use at least six terrain classes, including
  path, tree, bush, rock and shallow water.

- **WAP8.2:** WHEN a player steps onto the heal tile (8,3), THE move SHALL NOT start a wild encounter, and the heal tile
  SHALL keep a walkable approach at (7,3).

- **WAP8.3:** WHEN reachability is computed from the spawn (1,1), EVERY walkable zone-0 tile SHALL be reachable, the heal
  tile, the elder's home and the warp included.

- **WAP8.4:** THE movement vectors and the movement-parity check SHALL pass unchanged, `ZONE_0_ROWS` SHALL equal the
  authored rows, and `CONTENT_VERSION` SHALL be bumped exactly once more with the content-hash baseline regenerated.

- **WAP8.5:** THE e2e routes and sim-harness scenarios that walk zone 0 SHALL pass with their routes unchanged or
  rewritten in this slice with the change named.

### wap-9 — The post stack and the look-dev scene
category: ux-a11y · severity: MED · size: HEAVY
touches: client/package.json, client/package-lock.json, client/src/render/postStack.ts, client/src/render/postStack.test.ts, client/src/render/world.ts, client/art-src/generate_luts.py, client/public/assets/lut-dawn.png, client/public/assets/lut-day.png, client/public/assets/lut-dusk.png, client/public/assets/lut-night.png, client/public/assets/lut-interior.png, client/src/render/art/packs/grade.ts, client/e2e/lookdev.spec.ts, docs/art/style-guide.md
after: [wap-3, wap-6, wap-8]
Feedback items: pt3-2026-10-021, -022, -166
Measured: `pixi.js` is `^8.19.0` (lock 8.19.0) and `pixi-filters` is absent; there is no bundle-size budget and no npm
licence gate, and CI runs `npm ci`, so the lock must be committed. `client/package.json` carries an `allowScripts`
block a dependency with install scripts would hit (`pixi-filters` has none). The look-dev scene is a fixture-page e2e
on the uif-8 UIF8.1 precedent (`ui-social.spec.ts`: the real `index.html` and stylesheet on the Vite dev server,
`main.ts` route-aborted, page-side `import('/src/render/world.ts')`), so no dev page ships. No e2e screenshot baselines
exist in the repo; this slice compares frames rendered in the same run instead of committing baselines. The DOM UI is
not in the Pixi stage, so "UI is never filtered" reduces to filters attaching to the world containers only.

- **WAP9.1:** WHEN `planPostStack` receives a configuration, an injected `nowMs`, the reduced-motion bit and a keyframe,
  IT SHALL return the ordered enabled passes (ambient lightmap with vignette falloff, emissive, AdvancedBloom, Godray,
  ColorMap LUT) targeting the world layer only, omitting each disabled pass rather than zeroing it.

- **WAP9.2:** WHEN a pass animates, ITS time uniform SHALL be the injected `nowMs`, and WHILE reduced motion is set IT
  SHALL be held at 0.

- **WAP9.3:** THE five keyframe LUTs (dawn, day, dusk, night, interior) SHALL be generated by `generate_luts.py` and
  registered in `packs/grade.ts`, keyframe selection SHALL be pure, and the live game SHALL use `day`.

- **WAP9.4:** WHEN a filter cannot be constructed or the renderer lacks filter support, THE world SHALL render with the
  stack disabled and one structured warning, never a blank or thrown frame.

- **WAP9.5:** WHEN the look-dev fixture renders its deterministic map of all ten classes plus a landmark and a warp at
  1280×720 and DPR 1, toggling any one pass SHALL change the canvas pixels, two renders with identical injected time and
  toggles SHALL be pixel-identical, and each keyframe SHALL render a distinct frame.

- **WAP9.6:** THE style guide SHALL record the measured frame time per pass from the look-dev run as the budget table,
  a measurement and not a gate (verified by review with a path:line citation).

### wap-10 — The integrated whole
category: ux-a11y · severity: MED · size: MODERATE
touches: client/e2e/world-art.spec.ts, client/e2e/controls.ts, client/src/main.ts, client/src/render/world.ts, client/src/render/config.ts, ARCHITECTURE.md
after: [wap-9]
Feedback items: pt3-2026-10-021, -022, -155, -160, -161, -162, -166
Measured: `window.__game` is assigned DEV-only in `main.ts` and exposes no renderer state, so the flow e2e needs one
DEV-only `art` field reading an optional `WorldRenderer.describeArt()` (kit loaded, landmark and warp-marker tiles with
their screen rects via `screenFor`, active post passes, the drawn zone's terrain histogram). `scripts/verify-build-hooks.mjs`
already proves DEV hooks are stripped from `client/dist`. `controls.ts`'s `safeTile` and BFS read the live `walkable` /
`grass` payload and stay valid. `config.ts`'s `TARGET_VISIBLE_TILES` comment cites the 10×7 zone and is corrected
here (comment only; values unchanged).

- **WAP10.1:** WHEN a player spawns in Verdant Hollow and walks by D-pad to the heal post, THE rendered world SHALL
  report the heal landmark at (8,3) and the canvas pixels inside its screen rect SHALL differ from a ground tile's.

- **WAP10.2:** WHEN the player then walks to the warp, THE marker SHALL be reported on (1,5) before the step, and after
  the zone change the drawn terrain histogram SHALL differ from Verdant Hollow's with water at least 15% of the tiles.

- **WAP10.3:** WHILE that flow runs, THE world SHALL report the terrain kit loaded and the post stack active at the
  `day` keyframe, and the production build SHALL carry no `art` hook.

- **WAP10.4:** THE game repo's `ARCHITECTURE.md` render section SHALL describe the terrain grammar, the art registry,
  the render layers and the post stack as built (verified by review with a path:line citation).

## Post-integration verification

The milestone is done when the merged whole, not each slice, satisfies WAP.1–WAP.8:

1. Full `just ci` green on `wap-10`'s merge (lint, typecheck, Rust, evals, client tests). `bindings-drift` clean: no
   binding diff across the milestone. The only schema-adjacent diff is the tail-appended `TileKind` variants in
   `evals/baselines/spacetime-types.json` (`wap-1`); `battle-schema-snapshot` and `table-schemas` are untouched. The
   `content-version` eval is green at exactly two bumps over 25 (`wap-7`, `wap-8`).
2. Full `just e2e` green, including `world-art.spec.ts` (the operator flow, real server, real UI), `lookdev.spec.ts`,
   `tactics-wild.spec.ts`, `tactics-pvp.spec.ts`, `shop-npc.spec.ts`, `wallet-balance.spec.ts`, `recruit.spec.ts`,
   `movement-input.spec.ts`, `zoneSync.spec.ts` and `a11y.spec.ts`; the movement-parity eval and the sim-harness load
   driver green on the grown maps.
3. The registry test over the final shipped set is green: every served asset provenanced, no ai-placeholder row,
   `releaseBlockers` listing exactly the placeholder rows the deferred launch gate will need replaced.
4. One manual pass at three window sizes (incl. a fractional devicePixelRatio) with the post stack on and off and with
   reduced motion on, confirming WAP.1–WAP.7 by eye, with before/after captures of both zones and the battle board
   attached to the closing PR so the operator can judge the placeholder upgrade.
5. The absorbed residual closed per the Residual map with `mr-gates residuals close`; the feedback items in this spec
   dispositioned from their slices.
6. Smoothness contract untouched: the slide clock, interpolation and reconcile are in no slice's touches; `viewport.test.ts`
   still pins every shipped `deviceScale`, and `TILE_PX` / `TARGET_VISIBLE_TILES` are unchanged.

## What the next milestones consume

- **The final-art milestone (unscheduled):** the registry's stable atlas keys and `releaseBlockers`; art is a file swap
  plus a row change from `placeholder-*` to `final`.
- **Map, story, cutscene and shader work (unblocked per pt3-166):** the ten-class grammar, the Tiled import path, the
  decor layer, the post stack and its keyframes.
- **M-netcode-presence:** unaffected — remote characters still render through the same `CharacterView`.
- **M-gamepad, M-econ-onboarding, M-trade-sessions, M-identity-handles:** no surface shared.

## Risks / decisions

1. **#587 D5 folded, not reopened.** The base stays; 2D-HD is `wap-9`'s stack on `pixi-filters`, the one library the
   ecosystem vet marks USE.
2. **Provenance class for generator output (flag for the operator).** The committed art comes from stdlib Python
   generators written in this repo with agent assistance. The default classifies it `placeholder-procedural` /
   `project-original` — deterministic code output, not image-model output, so not `ai-placeholder`. It never ships, since
   the deferred launch gate requires `final`. If the operator wants agent-written generator output treated as
   AI-generated for disclosure purposes, only the tag value changes.
3. **The terrain grammar lives in `game-core`**, not in a client decoration map: one grid, walkability derived from the
   same glyph, at the cost of a `TileKind` type-baseline append. A client-only art map would duplicate the grid that
   `render/map.ts` forbids duplicating.
4. **Water blocks movement** (shallow and deep). There is no surf/wade mechanic; making shallow water walkable is a
   one-line class-table change if gameplay wants it later.
5. **Growth anchored on the original blocks.** Both zones grow around their pinned anchor tiles, so about ten e2e
   routes, the movement vectors and the sim-harness scenarios stay valid. The cost is a "starter room" opening onto the
   larger zone. A full re-layout is available but rewrites those routes and the parity vectors.
6. **The healer tile stops being tall grass** (`wap-8`): a small gameplay change that removes the encounter-on-heal
   oddity behind pt3-160.
7. **Pictographic sign, no text.** This avoids canvas text and the 524-key catalog pins; text signage is deferred.
8. **No frame-time gate.** Budgets are measured and recorded (`wap-9`); asserting them on software-GL CI would be
   flaky.
9. **`main.ts` is touched twice** (`wap-4`: the injected time and motion argument; `wap-10`: the DEV `art` field), and
   `main.dispatch.test.ts` reads main.ts text. Each builder measures that scan first; a pin on the edited lines is a STOP.
10. **The luminance floor is a default** (ΔY ≥ 0.06). `wap-2` tunes it upward on the first decoded atlas and records
    the measurements; lowering it is a spec change.
11. **Touches are grep-measured, not build-proven.** A file outside a slice's `touches:` is a STOP plus a build note,
    never a silent widen.
