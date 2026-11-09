# Spec: M-world-art-pass — 2D-HD-ready placeholders and a readable, larger world

**Status:** elaborated 2026-11-09 from the 2026-10-24 sketch · **build-ready: 11 slices** — `wap-0`…`wap-10`
(research stages: S0 `wap-0` → S1 `wap-1`…`wap-5` → S3 `wap-6`…`wap-8` → S2 `wap-9` → the integrated whole `wap-10`;
the build order is the Sequencing section's two chains, not the stage numbers) · **Project:** monster-realm (game-core terrain grammar + content RON, client render + art
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
- **S2 (`wap-9`):** the post stack (ambient lightmap with vignette falloff, AdvancedBloom, Godray, ColorMap LUT
  time-of-day keyframes) over the world layer only, each pass toggleable, deterministic, reduced-motion-safe, with a
  fixture-page look-dev smoke scene.
- **Integrated whole (`wap-10`):** the operator flow e2e through the real UI and the closing docs.

**Named deferrals (declared, not dropped)**

| Deferred | Target | Why |
|---|---|---|
| Final art | backlog — a final-art milestone, unscheduled (artist hire) | This milestone delivers swap-stable placeholders |
| Release gate that every registry row is `final` (a query over the registry wired into the launch build) | backlog — launch checklist beside M25 sign-off | Wiring it now fails every build, and a query with no caller is speculative; the registry's `provenance` field is all it needs |
| Normal-map / deferred lighting for hero and props (research rung 4), the emissive layer, occluder shadows | backlog | Only if the `wap-9` lightmap alone demonstrably looks flat; no slice authors emissive masks, so an emissive pass would have no input |
| Live time-of-day cycle in the game; the dawn and interior LUT keyframes | backlog | Needs a world-clock design (and interiors); `wap-9` ships day / dusk / night to prove the mechanism, the game uses `day` |
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
4. **Pure core / imperative shell** — decision logic (layout, fallback choice, chunk lifetime, pass planning,
   frame selection) lives in new pure, unit-tested modules under `client/src/render/` that take injected factories and
   clocks; Pixi calls stay inside `world.ts` and `characterView.ts`, which are already coverage-excluded. No slice adds
   a file to `client/vite.config.ts`'s coverage `exclude` list. What only the Pixi shell does is proven once, through
   the real UI, by `wap-10`'s e2e reading `describeArt()`.
5. **The `WorldRenderer` surface the mocks assume** (`init`, `setMap`, `render`, `resize`, `screenFor`, `clear`,
   `destroy`, `viewCount`) stays; any new method main.ts calls is invoked optionally (`renderer?.x?.()`), because 36
   test files replace `./render/world` with a mock lacking it.
6. **Determinism render-side** — time enters render code only as an injected `nowMs`; variant choice is an integer hash
   of (zone, x, y); no `Math.random`, no wall-clock read in shaders, filters or animation.
7. **Smoothness contract** — the slide clock, interpolation buffer and reconcile are untouched. Per-frame CPU work
   added by the terrain and decor layers is texture swaps on animated tiles only when their frame index changes; the
   `wap-9` filter chain adds a per-frame GPU cost that is measured and recorded, not hidden.
7a. **Pixel fidelity under the new layers** — every atlas, chunk and LUT texture samples `nearest`, chunk textures render
    at the device scale, and filters run at the world's device scale, so a 32 px tile edge stays a hard step at every
    integer scale (DECISIONS "Integer pixel scaling").
7b. **No new test reads hand-authored text** — no slice adds an assertion that reads `styles.css`, a RON file, a doc or
    a manifest. Where a slice must change an existing CSS-text assertion (`boardRender.test.ts` BT10-1-CSS-LAYOUT,
    `styles.test.ts`'s uif-11 art allowlist), it replaces that assertion by a behavior check (a pure test or a
    computed-style check inside an existing e2e flow), replacement-first, with the deletion named in the PR.
8. **Reduced motion** — every animation this milestone adds (water, warp pulse, godray time) holds a static frame WHILE
   `reduceMotion` is set; the bit arrives by injection from `motionPreference.ts`.
9. **Never colour alone** — water reads by value, texture, motion and edge; the warp marker and the landmark read by
   shape; character actions read by pose.
10. **Provenance** — every served file under `client/public/assets/` has exactly one registry row (source, license,
    provenance tag). License ladder: CC0 > CC-BY > share-alike > EULA > AI-generated. In this milestone only
    `CC0-1.0`, `CC-BY-4.0`/`CC-BY-3.0` (with an attribution string) and `project-original` (this repo's own generators)
    are accepted. The tag `ai-placeholder` (image-model output) is forbidden in a committed row: AI output is for
    ideation only and nothing it produced ships. The row type makes these rules unrepresentable where it can (the
    provenance and license unions omit `ai-placeholder`, share-alike and EULA; a CC-BY row requires its attribution
    string); the runtime validator covers what types cannot (duplicates, dimensions, files). Atlas keys are stable ids,
    so final art is a file swap.

## The style guide (what `wap-0` commits)

`docs/art/style-guide.md` (game repo), one page: perspective ¾ oblique; tile 32 px; character canvas 32×32 (hero and
monster frames); fidelity model A (integer grid, citing the two DECISIONS entries); light direction (top-left, for the
`wap-9` lightmap and the normal maps); the master palette ramps (the generators' ramp table is the source) and one
**value band per terrain class**; outline policy; frame budgets (water 4 frames, warp pulse 2–4, walk 2 steps + mid);
naming and atlas-key rules (`<pack>/<class>_<variant>` style, stable); "no baked cast shadows, small contact AO only";
the provenance fields and ladder; and the terrain class table below. **Code owns the table:** `TileKind` in
`game-core/src/types.rs` (`wap-1`) is the single definition of glyph, Tiled GID, walkability and encounter flag; the
style guide and the zone-map RON header cite it for review and are never parsed.

| Class | `TileKind` (wire name) | Glyph | Tiled GID | Walkable | Encounter | Notes |
|---|---|---|---|---|---|---|
| ground (short grass) | `Floor` | `.` | 1 | yes | no | the existing floor glyph, now drawn as outdoor ground |
| tall grass | `TallGrass` | `~` | 2 | yes | yes | the only encounter class (`is_grass`) |
| path | `Path` | `=` | 3 | yes | no | |
| sand | `Sand` | `:` | 4 | yes | no | |
| shallow water | `ShallowWater` | `w` | 5 | no | no | its own value band; animated; the shore band where it meets land |
| deep water | `DeepWater` | `W` | 6 | no | no | darker band than shallow; animated; borders only water (content rule) |
| rock | `Rock` | `^` | 7 | no | no | |
| tree | `Tree` | `T` | 8 | no | no | |
| bush | `Bush` | `*` | 9 | no | no | |
| wall | `Wall` | `#` | 0 | no | no | the existing wall glyph |

`Floor`, `TallGrass` and `Wall` keep today's variants, glyphs and GIDs (0 wall, 1 floor, 2 grass); the seven new
variants are tail-appended in the table's order (`Path` … `Bush`).

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
  missing file, at an integer device-pixel multiple of the 32 px frame, over a palette-coordinated backdrop.

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
- Each asset slice owns its own registry pack file (`client/src/render/art/packs/*.ts`). `wap-0` creates all six and
  the aggregator in `registry.ts` once, because `wap-3` (battle) and `wap-6` (landmarks) can run concurrently and would
  otherwise both edit the aggregator.

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
touches: docs/art/style-guide.md, docs/DECISIONS.md, client/art-src/README.md, client/src/render/art/registry.ts, client/src/render/art/registry.test.ts, client/src/render/art/packs/characters.ts, client/src/render/art/packs/monsters.ts, client/src/render/art/packs/terrain.ts, client/src/render/art/packs/landmarks.ts, client/src/render/art/packs/battle.ts, client/src/render/art/packs/grade.ts, client/test-util/pngDecode.ts
after: []
Feedback items: pt3-2026-10-021, -022, -155, -166
Measured: no provenance, credits or asset-license file exists anywhere in the game repo (only the root `LICENSE`);
`.gitattributes` marks `*.png binary` (no LFS). The only reader of `client/public/assets/` is the grandfathered
`evals/monster-spritesheet-format.eval.mjs` (monster sheets only). The served set today: `hero{,-normal}.{png,json}`,
`tileset-edge-of-town{,-normal}.{png,json}`, `palette.png` (82×210, no frames), and 17 `monster-*` sheets, 13 with
`-normal` maps (the eval's `NO_NORMAL_MAP` exempts wave-1 ids 7–10). All were produced by this repo's own stdlib
generators. Rows: hero → `characters.ts`; monster sheets → `monsters.ts` (keyed by species name, so Flameling's row
names `monster-emberkit.png`); the edge-of-town tileset and `palette.png` → `terrain.ts`. `landmarks.ts`, `battle.ts`
and `grade.ts` start as empty arrays and `registry.ts` aggregates all six once (see Sequencing). Row kinds: `sprite`,
`tile`, `normal` (frame rules apply), `palette` and `lut` (no frames; exempt from the frame-grid rule). The registry is
product code (later slices resolve atlas keys through it), so its test runs the validator over the real rows. It reads
PNG headers of generated files and lists the served directory. That is allowed: the artifacts are generator output, and
the listing is the provenance boundary itself, not a count. No file count is ever asserted. `client/test-util/pngDecode.ts`
(Node `zlib` inflate, no new dependency) lands here so `wap-2` and `wap-3`, which run concurrently, share it without
both creating it.

- **WAP0.1:** THE game repo SHALL carry `docs/art/style-guide.md` recording the base (¾ oblique, 32 px tile, storybook
  palette, #587 D5), fidelity model A citing the two scaling decisions, light direction, palette ramps with one value
  band per terrain class, outline policy, frame budgets, atlas-key rules, the no-baked-cast-shadow rule, the provenance
  fields and ladder, and this spec's terrain class table and readability pairs, citing `TileKind` as their owner
  (verified by review with a path:line citation).

- **WAP0.2:** THE registry row type SHALL make an `ai-placeholder` tag, a share-alike or EULA license, a missing
  source / license / provenance, and a CC-BY row without an attribution string unrepresentable, each proven by a
  `@ts-expect-error` fixture in the colocated test.

- **WAP0.3:** WHEN `validateArtRegistry` receives a duplicate atlas key or file, a `sprite` / `tile` / `normal` frame
  whose width or height is not a whole multiple of 16 px, or an atlas whose scale is not 1, IT SHALL reject the registry
  and name the offending row.

- **WAP0.4:** WHEN `validateArtRegistry` runs over the real aggregated registry, IT SHALL accept it, every row's file
  SHALL exist under `client/public/assets/` with PNG header dimensions equal to the row's declared sheet size, and
  every PNG served under `client/public/assets/` SHALL be named by exactly one row.

- **WAP0.5:** THE existing served assets SHALL be registered with provenance `placeholder-procedural`, license
  `project-original` and the generator path as source, and `client/art-src/README.md` SHALL tell generator users that
  every new output gets its registry row in the same change.

- **WAP0.6:** THE game repo's `docs/DECISIONS.md` SHALL gain one entry recording that every served asset carries a
  registry provenance row and that image-model output never ships (verified by review with a path:line citation).

### wap-1 — Terrain grammar: ten classes, one grid, a richer zone payload
category: gameplay · severity: MED · size: MODERATE
touches: game-core/src/types.rs, game-core/src/world.rs, game-core/src/grass_encounter_tests.rs, game-core/src/bin/tiled_import.rs, game-core/tests/tiled_import_cli.rs, .cargo/mutants.toml, evals/baselines/spacetime-types.json, client-wasm/src/lib.rs, client/src/render/map.ts, client/src/render/map.test.ts
after: [wap-0]
Feedback items: pt3-2026-10-161, -162
Measured: `TileKind { Floor, Wall, TallGrass }` (`types.rs`) derives `SpacetimeType` behind the `spacetimedb` feature, so
new variants are tail-appended and `evals/baselines/spacetime-types.json` gains them (spacetime-type-snapshot eval);
`TileKind` is in no table and no binding. `TileKind::from_char` rejects unknown glyphs and `is_walkable` is the only
exhaustive match (`world.rs` uses `matches!`; nothing in server-module, sim-harness or client-wasm matches on it).
`build_grid` (`world.rs`) keeps only `walkable` and `grass`, so `TileMap` gains a `terrain` layer. `TileMap` is
`Serialize`-only and `client-wasm` `zone_map()` serializes it with `serde_wasm_bindgen`; `landmarks` has no home in
`TileMap`, and `#[serde(flatten)]` would make `serde_wasm_bindgen` emit a JS `Map` (breaking `raw.walkable`), so the
payload is a concrete DTO struct in `client-wasm` with explicit fields. `zone_map_ok` returns `UNDEFINED` on native
targets, so the DTO is tested natively through `serde_json`. `game_core::load_heal_locations` is re-exported with no
feature flag. Negative glyph tests use `'Z'` and `'X'`; the proptest draws only from `.#~`. `tiled_import.rs` maps GIDs
0/1/2 in one `match`; the `.cargo/mutants.toml` line regexes sit above it and go stale only if imports at the top move.
No byte under `game-core/content/` changes here (the RON header legend moves with `wap-7`'s bump), so `CONTENT_VERSION`
stays 25. The 36 main-boot test fixtures return `zone_map` literals without the new fields; that is why both are
optional on the client.

- **WAP1.1:** WHEN a zone-map row contains one of the ten class glyphs, `game-core` SHALL build that tile with the class
  table's `TileKind`, walkability and encounter flag, and an unknown glyph SHALL remain a load error naming the glyph
  and its tile.

- **WAP1.2:** WHEN a mover steps from a walkable tile onto each class, THE shared movement rule SHALL move onto ground,
  tall grass, path and sand and SHALL bump on shallow water, deep water, rock, tree, bush and wall, and only tall grass
  SHALL report `is_grass`, proven over a fixture map containing all ten glyphs.

- **WAP1.3:** WHEN `validate_zone_maps` checks a map in which a deep-water tile has a non-water 4- or 8-neighbour, IT
  SHALL reject the map naming the tile, so the shore band is only ever shallow water's.

- **WAP1.4:** WHEN `zone_map(zone_id)` is called, THE payload SHALL add a row-major `terrain` list parallel to `walkable`
  holding each tile's `TileKind` wire name and a `landmarks` list with one `{ kind: 'heal', x, y }` per compiled
  heal_locations row of that zone, while every existing field keeps its name and value.

- **WAP1.5:** WHEN `TileMap.fromRaw` parses a payload, IT SHALL expose `terrainAt(x, y)` and `landmarks`; a payload
  without `terrain` SHALL report no terrain (the renderer then takes its flat fallback; no client-side derivation from
  `walkable`/`grass`), a payload without `landmarks` SHALL have none, and a ragged `terrain` list or a name outside the
  ten wire names SHALL throw.

- **WAP1.6:** WHEN `tiled_import` reads a Tiled layer, IT SHALL map the class table's GIDs 0–9 through `TileKind` and
  SHALL still reject an unmapped GID.

### wap-2 — The terrain kit: ten classes, variants, animated water, shore band
category: content · severity: MED · size: MODERATE
touches: client/art-src/generate_art.py, client/art-src/README.md, client/art-src/preview/terrain-kit@6x.png, client/art-src/preview/terrain-kit-normal@6x.png, client/public/assets/terrain-kit.png, client/public/assets/terrain-kit.json, client/public/assets/terrain-kit-normal.png, client/public/assets/terrain-kit-normal.json, client/src/render/art/packs/terrain.ts, client/src/render/art/terrainKit.test.ts, docs/art/style-guide.md
after: [wap-0]
Feedback items: pt3-2026-10-161, -155
Measured: `generate_art.py` already carries the master-palette ramp table and emits grass, tall grass, path autotiles,
bush, rock, tree canopy/trunk, wall and two water frames (`water_c`, `water_c2`, no inner corners) into
`tileset-edge-of-town`; the kit is a NEW atlas, so the POC tileset stays untouched (no consumer reads it; it keeps its
`wap-0` row). The luminance test decodes the generated atlas with `wap-0`'s `pngDecode` helper. The pack's rows
declare, per class, its variant frame keys, its animation frame keys (water) and the shore-band keys — the data `wap-4`
lays out.

- **WAP2.1:** THE terrain kit atlas SHALL hold, at scale 1 and 32×32 per frame, at least three variant frames for each of
  the ten classes, four pairwise-distinct animation frames for each water class, and shore-band frames for the four
  edges, four outer corners and four inner corners where shallow water meets land.

- **WAP2.2:** WHEN the kit atlas is decoded, EVERY readability pair SHALL differ in mean relative luminance (Rec. 709) of
  its base frames by at least 0.06; the measured values are reported in the style guide for review, never asserted
  against it.

- **WAP2.3:** WHEN a 4×4-tile patch of shallow water and one of ground are each box-downsampled to 16×16 px, THE two
  thumbnails SHALL still differ in mean luminance by at least 0.06 and the water thumbnail's mean blue SHALL exceed its
  mean green.

- **WAP2.4:** THE kit's normal atlas SHALL carry the same frame keys with byte-identical frame rects as the albedo atlas,
  and both SHALL have `packs/terrain.ts` provenance rows that pass `validateArtRegistry`.

### wap-3 — Battle placeholders: every species, registry URLs, integer art scale, a backdrop
category: content · severity: MED · size: MODERATE
touches: client/art-src/generate_monsters.py, client/art-src/generate_backdrop.py, client/art-src/preview/monster-tidecrag@6x.png, client/art-src/preview/monster-tidecrag-normal@6x.png, client/art-src/preview/monster-tidecrag-lit@6x.png, client/art-src/preview/monster-cindershade@6x.png, client/art-src/preview/monster-cindershade-normal@6x.png, client/art-src/preview/monster-cindershade-lit@6x.png, client/public/assets/monster-tidecrag.png, client/public/assets/monster-tidecrag.json, client/public/assets/monster-tidecrag-normal.png, client/public/assets/monster-tidecrag-normal.json, client/public/assets/monster-cindershade.png, client/public/assets/monster-cindershade.json, client/public/assets/monster-cindershade-normal.png, client/public/assets/monster-cindershade-normal.json, client/public/assets/battle-backdrop.png, client/src/render/art/packs/monsters.ts, client/src/render/art/packs/battle.ts, client/src/render/resizeWiring.ts, client/src/render/resizeWiring.test.ts, client/src/tactics/boardModel.ts, client/src/tactics/boardModel.test.ts, client/src/tactics/boardRender.ts, client/src/tactics/boardRender.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/styles.css, client/src/styles.test.ts, client/e2e/tactics-wild.spec.ts, evals/monster-spritesheet-format.eval.mjs
after: [wap-0]
Feedback items: pt3-2026-10-155, -166
Measured: `boardRender.ts` and `tacticsBattle.ts` (ghost sprite) build `url("assets/monster-${slug}.png")` from
`boardModel.spriteSlug(name)`, which lower-cases any alphabetic name with no existence check, so Flameling requests
`monster-flameling.png` (its sheet is `monster-emberkit.png`, emitted by `generate_art.py` — `wap-2`'s file, which is why
the fix is a registry lookup rather than a rename) and Tidecrag (30) and Cindershade (31) request sheets that do not
exist (the eval's `NO_SHEET_YET`). The eval keeps its own `SLUG_OVERRIDES` fixture: it is grandfathered and maintained
in place, its exemption set shrinking here. `generate_monsters.py` needs `PLAN_TABLE` rows AND `PALETTES` entries for
the two species (`build_species_sheet` fails without a palette). The integer world scale lives only in
`render/viewport.ts` (`viewportScale().deviceScale` / `stageScale`); the DOM receives only the continuous
`--mr-ui-scale` (`resizeWiring.ts`), and `styles.test.ts` UIF11.1 forbids tactics rules from reading `--mr-ui-scale` or
using `zoom` / `scale()`. So `resizeWiring` also publishes `--mr-world-scale` (the stage scale: CSS px per art pixel),
and the sprite, HP bar and base mark size as `32px × var(--mr-world-scale)` multiples, which is an integer number of
device pixels per art pixel by construction. `boardRender.test.ts` BT10-1-CSS-LAYOUT reads `styles.css` (sprite 64 px,
`.tactics-bg` hex brighter than the dock); per Constraint 7b those text assertions are replaced, not edited, by the
`resizeWiring` test and computed-style checks inside the existing `tactics-wild.spec.ts` flow. If UIF11.1's scan also
blocks the new variable, its allowlist is narrowed with the change named, never widened into a new scan.

- **WAP3.1:** THE Tidecrag and Cindershade sheets and normal maps SHALL ship in the shipped monster format from
  `generate_monsters.py`'s plan table, and the spritesheet eval SHALL pass with no species exempt from having a sheet.

- **WAP3.2:** WHEN the board or a ghost renders a unit, ITS sprite URL SHALL come from the art registry's monster row for
  that species name — Flameling resolving to its emberkit sheet — and a species with no row SHALL render the
  `tactics-sprite--none` treatment and request no file.

- **WAP3.3:** WHEN the window resizes, `resizeWiring` SHALL publish `--mr-world-scale` equal to the viewport stage scale
  beside `--mr-ui-scale`, and in the battle flow the unit sprite, its HP bar and its base mark SHALL measure a whole
  number of device pixels per art pixel at 1280×720 DPR 1 and at a fractional DPR, never a fixed 64 px, closing
  R-uif-11-SPRITESCALE.

- **WAP3.4:** WHEN a battle opens, THE battlefield SHALL paint the registered `battle-backdrop.png` (a `packs/battle.ts`
  row) over a retained hex fallback colour with the image request succeeding, and the decoded backdrop's mean relative
  luminance SHALL sit within the style guide's battlefield band (default 0.15–0.40) so the tile overlays stay legible.

### wap-4 — The terrain renderer: kit sprites, variants, shore band, animated water
category: ux-a11y · severity: MED · size: HEAVY
touches: client/src/render/world.ts, client/src/render/terrainLayout.ts, client/src/render/terrainLayout.test.ts, client/src/render/config.ts, client/src/main.ts, client/src/main.reducedMotionWiring.test.ts
after: [wap-1, wap-2]
Feedback items: pt3-2026-10-161, -155
Measured: `#drawMap` builds one `Graphics` of rects and is rebuilt on `setMap` (destroying the old children). `world.ts`
loads no asset today; `Assets` loading and sprite / `cacheAsTexture` calls stay in it (coverage-excluded) and take
their decisions from `terrainLayout.ts`, which gets injected texture factories and destroyers so chunk lifetime is
testable with fakes (the `placeholderAssets.test.ts` fake-renderer precedent). `render()` is called per frame from
`main.ts` with `(entities, lastCamX, lastCamY)`; the injected `nowMs` and `reduceMotion` reach it as one added optional
argument from main.ts, which already holds the `MotionPreference`. No test pins the `renderer?.render(` argument shape
(`main.dispatch.test.ts` scans only `movementGate` / `worldBaseLive`). `mainBootHarness.ts`'s
`worldRendererNoCanvasMock()` records nothing, so `main.reducedMotionWiring.test.ts` observes the argument through its
own inline mock. New render constants (water frame period, chunk size) live in `config.ts` beside `TILE_PX`; it is
imported only by named imports. Today's `appInitOptions` sets `antialias: false` but nothing sets texture sampling, and
`cacheAsTexture` defaults to linear filtering, so Constraint 7a is a real criterion here.

- **WAP4.1:** WHEN a map with terrain is laid out, `layoutTerrain` SHALL return exactly one kit frame key for every
  in-bounds tile chosen by its terrain class, and WHEN the kit is absent or the payload has no terrain IT SHALL return the
  flat-fallback plan with a single warning record.

- **WAP4.2:** WHEN a tile's variant is chosen, IT SHALL be a pure integer hash of (zone, x, y), identical across redraws
  and sessions, and a 10×10 field of one class SHALL show at least two variants.

- **WAP4.3:** WHEN a shallow-water tile borders land, IT SHALL draw the shore-band frame its 8-neighbour mask selects, and
  every one of the 256 masks SHALL map to a defined frame.

- **WAP4.4:** WHEN frames advance, THE water animation frame SHALL be a pure function of the injected `nowMs` at the
  configured period, and WHILE reduced motion is set IT SHALL hold frame 0.

- **WAP4.5:** WHEN the chunk planner covers a map, ITS chunks SHALL tile the map exactly with animated water excluded,
  and WHEN `setMap` or `destroy` runs, THE chunk cache SHALL destroy every texture it created, counted through the
  injected factory and destroyer.

- **WAP4.6:** WHEN the chunk cache creates a texture, IT SHALL request `nearest` sampling at the device scale, and the
  atlas textures SHALL be loaded with `nearest` sampling.

### wap-5 — Characters: the hero atlas behind the AssetProvider seam
category: ux-a11y · severity: LOW · size: LIGHT
touches: client/src/render/world.ts, client/src/render/atlasAssets.ts, client/src/render/atlasAssets.test.ts, client/src/render/characterView.ts, client/src/render/art/packs/characters.ts
after: [wap-4]
Feedback items: pt3-2026-10-155
Measured: `hero.json` holds `hero_{down,up,right,left}_{idle,stepA,mid,stepB,jump}` (five poses × four facings, 32×32,
160×128 sheet). `AssetProvider.texture(action, facing)` has no phase, and `CharacterView.update` swaps the texture only
when its `animKey(action, facing)` changes, so the walk cycle needs an OPTIONAL third `phase` argument (`PlaceholderAssets`
still satisfies the interface unchanged; its test and its non-colour glyph cue stay as the load-failure fallback) and a
phase-aware swap key in `characterView.ts`. The phase comes from the fractional tile position `update` already receives,
so it follows the slide clock with no second clock. Every entity (own, remote, NPC) shares one provider today and
`ACTION_TINT` encodes action, not identity, so there is no own-versus-other cue to lose; variety is a named deferral.

- **WAP5.1:** WHEN `AtlasAssets` is asked for any (action, facing, phase), IT SHALL return a hero frame from a mapping
  total over both enums (a new member is a compile error), with Idle → idle, Walking → the step poses, Jumping → jump,
  so the three actions use disjoint frames in every facing.

- **WAP5.2:** WHILE a character walks, ITS phase SHALL come from the fractional position within the current step, so
  the step pose alternates as a pure function of the slide-clock position.

- **WAP5.3:** WHEN `createCharacterAssets` receives no hero atlas, IT SHALL return the `PlaceholderAssets` provider, and
  WHEN either provider is destroyed IT SHALL release every texture it created.

### wap-6 — Landmarks and warp markers, drawn from data
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/render/world.ts, client/src/render/decorLayout.ts, client/src/render/decorLayout.test.ts, client/art-src/generate_art.py, client/art-src/README.md, client/art-src/preview/landmarks@6x.png, client/public/assets/landmarks.png, client/public/assets/landmarks.json, client/src/render/art/packs/landmarks.ts
after: [wap-5]
Feedback items: pt3-2026-10-160, -156
Measured: `TileMap.isWarp` already exists client-side (from `warps`), and `wap-1` adds `TileMap.landmarks`. Actors sort
by `zIndexForEntity(y)` (`render/zorder.ts`) in a `sortableChildren` container, so a landmark taller than one tile joins
that container with its own tile-row z-index. The sign is a pictogram drawn into the sprite: no catalog key is added
(the catalogs are pinned at 524 keys per locale), and the interact chip keeps naming the healer. The landmark and the
marker carry bright highlight pixels, which is what `wap-9`'s bloom pass acts on.

- **WAP6.1:** WHEN a map with landmarks is laid out, `layoutDecor` SHALL place the heal-landmark sprite at each
  landmark's tile and at no other, and a map without landmarks SHALL place none.

- **WAP6.2:** WHEN a map with warps is laid out, `layoutDecor` SHALL place a warp marker on every warp source tile, the
  marker distinct from every terrain frame by shape, and ITS pulse frame SHALL be a pure function of the injected
  `nowMs` held at frame 0 WHILE reduced motion is set.

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
`sim-harness/src/world.rs` assumes column x=1 floor for y=1..5 in both maps. No test asserts a `CONTENT_VERSION` literal
(only the eval does). The zone registry bound is 40×28 (`validate_zone_maps` check 4, upper bound only). The disciplined
default keeps those anchor tiles walkable and grass-free so the routes stay valid; the listed e2e and sim files are
re-run, edited only if a route breaks, and their "byte-identical" comments corrected. The RON header gains the
ten-glyph legend here, inside this slice's one bump.

- **WAP7.1:** THE Tideglass Cove rows SHALL differ from Verdant Hollow's, measure at least 24×16 and at most the 40×28
  registry bound, contain shallow water, deep water, sand and rock, and have water on at least 10% of the tiles.

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
touches: game-core/content/zone_maps/000-core.ron, game-core/src/world.rs, game-core/src/content.rs, game-core/src/grass_encounter_tests.rs, game-core/src/npc/rules_tests.rs, game-core/src/npc/rules.rs, game-core/tests/interact_reachability.rs, game-core/benches/budgets.rs, game-core/benches/budget_check_tests.rs, server-module/src/lib.rs, evals/baselines/content-hash.json, server-module/src/npc_tests.rs, server-module/src/movement_tests.rs, sim-harness/src/world.rs, sim-harness/src/lib.rs, sim-harness/src/bin/mr_load_driver.rs, sim-harness/src/bin/movement_vectors.rs, client-wasm/src/lib.rs, client/e2e/dialogue.spec.ts, client/e2e/recruit.spec.ts, client/e2e/remap.spec.ts, client/e2e/ui-world-sheets.spec.ts, client/e2e/menu-flow.spec.ts, client/e2e/pointer.spec.ts, client/e2e/wallet-balance.spec.ts, client/e2e/movement-input.spec.ts, client/e2e/zoneSync.spec.ts, client/e2e/shop-npc.spec.ts
after: [wap-7]
Feedback items: pt3-2026-10-162, -160
Measured: zone 0 lives twice — the RON and `ZONE_0_ROWS` / `zone_0()` in `world.rs`, held equal by
`zone_0_matches_authored_ron` — and `zone_0()` feeds `apply_move_coded` / `predict_move`, the wasm `ACTIVE_TILE_MAP`
default and `movement_vectors` (the movement-parity eval: (1,1) East moves, (1,1) North bumps, (3,3) Jump East blocked by
(4,3), (8,5) South bumps, (2,2) West moves). Pinned anchors: spawn (1,1); corridor row 1 x=1..8 walkable and grass-free
(`movement-input`, `zoneSync`, sim-harness east steps); (0,1) and (9,1) walls and (1,2) floor / (2,2) grass
(`mr_load_driver`); `elder_oak` home (5,5) radius 2 (Manhattan, `npc/rules.rs`); posts (6,2), (6,3), (7,3); warp (1,5)
and the S×4 route from (1,1) to it; row 5 floor x=1..6. The disciplined default keeps the original 10×7 block
byte-identical except two tiles — an opening in its south wall at (3,6) (Manhattan 3 from the elder's home, so outside
the disc; no test pins it or row 6) and the heal tile (8,3) becoming path — and grows the zone south and east of it,
padding rows 0–6 beyond x=9 with blocked terrain so (9,1) stays a wall. `content.rs`'s
`zone_0_placeholder_map_fits_within_its_registry_dimensions` holds the 32×24 bound; `grass_encounter_tests.rs` scans
`zone_0()` grass and loses (8,3). `game-core/benches/budgets.rs` caps `map_for` at 3000 ns (measured 134.5 ns on 10×7);
a 32×24 map with the third per-tile layer costs roughly 16× that, so the ceiling is re-measured and re-set here with the
number named. The e2e files are re-run and edited only if a route breaks.

- **WAP8.1:** THE Verdant Hollow map SHALL measure at least 24×16 and at most the 32×24 registry bound, keep its original
  10×7 block identical except the (3,6) opening and the (8,3) heal tile, and contain path, tree, bush, rock and shallow
  water.

- **WAP8.2:** WHEN the shipped content loads, EVERY heal_locations tile SHALL be a walkable, non-tall-grass tile with a
  walkable approach, so stepping onto a healer never starts a wild encounter, and the zone-0 healer at (8,3) SHALL keep
  its approach at (7,3).

- **WAP8.3:** WHEN reachability is computed from the spawn (1,1), EVERY walkable zone-0 tile SHALL be reachable, the heal
  tile, the elder's home and the warp included.

- **WAP8.4:** THE movement vectors and the movement-parity check SHALL pass unchanged, `ZONE_0_ROWS` SHALL equal the
  authored rows, and `CONTENT_VERSION` SHALL be bumped exactly once more with the content-hash baseline regenerated.

- **WAP8.5:** THE e2e routes, the sim-harness scenarios and the `map_for` perf budget SHALL pass on the grown map, with
  any route or ceiling change made in this slice and named.

### wap-9 — The post stack and the look-dev scene
category: ux-a11y · severity: MED · size: HEAVY
touches: client/package.json, client/package-lock.json, client/src/render/postStack.ts, client/src/render/postStack.test.ts, client/src/render/world.ts, client/art-src/generate_luts.py, client/public/assets/lut-day.png, client/public/assets/lut-dusk.png, client/public/assets/lut-night.png, client/src/render/art/packs/grade.ts, client/e2e/lookdev.spec.ts, docs/art/style-guide.md, docs/DECISIONS.md
after: [wap-3, wap-6, wap-8]
Feedback items: pt3-2026-10-021, -022, -166
Measured: `pixi.js` is `^8.19.0` (lock 8.19.0) and `pixi-filters` is absent (its 6.x peer is `pixi.js >=8.0.0-0`; the
builder confirms the exact version's WebGL/WebGPU programs for the four passes). There is no bundle-size budget; CI runs
`npm ci` (commit the lock) and a best-effort `dependency-review-action`; `client/.npmrc` sets `min-release-age = 7`, so
pick a version older than a week; `allowScripts` needs no change (`pixi-filters` has no install scripts). A new
dependency meets the decision bar (`standards/decisions.md`), so the `pixi-filters` adoption entry lands here, where the
lock changes. The look-dev scene is ONE fixture-page smoke e2e on the uif-8 UIF8.1 precedent (`ui-social.spec.ts`: the
real `index.html` and stylesheet on the Vite dev server, `main.ts` route-aborted, page-side
`import('/src/render/world.ts')`), collected by the default Playwright project; per-pass behavior is unit-tested through
the pure plan, and no screenshot baseline is committed. The DOM UI is not in the Pixi stage, so "UI is never filtered"
reduces to filters attaching to the world containers only.

- **WAP9.1:** WHEN `planPostStack` receives a configuration, an injected `nowMs`, the reduced-motion bit, a keyframe and
  the device scale, IT SHALL return the ordered enabled passes (ambient lightmap with vignette falloff, AdvancedBloom,
  Godray, ColorMap LUT) targeting the world layer only at the device scale with `nearest` LUT sampling, omitting each
  disabled pass rather than zeroing it.

- **WAP9.2:** WHEN a pass animates, ITS time uniform SHALL be the injected `nowMs`, and WHILE reduced motion is set IT
  SHALL be held at 0.

- **WAP9.3:** THE three keyframe LUTs (day, dusk, night) SHALL be generated by `generate_luts.py` and registered in
  `packs/grade.ts`, keyframe selection SHALL be pure, and the live game SHALL use `day`.

- **WAP9.4:** WHEN `planPostStack` is told filters are unsupported or a pass failed to construct, IT SHALL return an
  empty plan with one warning record, so the world renders with the stack disabled and never a blank or thrown frame.

- **WAP9.5:** WHEN the look-dev fixture renders its deterministic map of all ten classes plus a landmark and a warp at
  1280×720 and DPR 1, THE stack-on frame SHALL differ from the stack-off frame, two renders with identical injected time
  and toggles SHALL be pixel-identical, the day and night keyframes SHALL render different frames, and a tile edge SHALL
  stay a one-pixel hard step with the stack on.

- **WAP9.6:** THE style guide SHALL report the measured frame time per pass from the look-dev run as the budget table,
  and `docs/DECISIONS.md` SHALL record the `pixi-filters` adoption, world-layer-only filtering and injected-time
  determinism (both verified by review with a path:line citation).

### wap-10 — The integrated whole
category: ux-a11y · severity: MED · size: MODERATE
touches: client/e2e/world-art.spec.ts, client/e2e/controls.ts, client/src/main.ts, client/src/render/world.ts, client/src/render/config.ts, ARCHITECTURE.md
after: [wap-9]
Feedback items: pt3-2026-10-021, -022, -155, -160, -161, -162, -166
Measured: `window.__game` is assigned DEV-only in `main.ts` and exposes no renderer state, so the flow e2e needs one
DEV-only `art` field in that snapshot reading an optional `WorldRenderer.describeArt()` (kit or fallback, the drawn
frame key per tile, landmark and warp-marker tiles with their screen rects via `screenFor`, the active post passes and
keyframe, the drawn zone's terrain histogram). The `art` field is stripped with the DEV block, which
`scripts/verify-build-hooks.mjs` already proves for `__game`; `describeArt` itself is a read-only method that stays in
the bundle like `screenFor`. `controls.ts`'s `safeTile` and BFS read the live `walkable` / `grass` payload and stay
valid. `config.ts`'s `TARGET_VISIBLE_TILES` comment cites the 10×7 zone and is corrected here (comment only; values
unchanged). This e2e is also where the shell-only behaviors (kit drawn rather than fallback, nearest sampling visible
as hard tile edges, decor actually on screen) are proven through the real UI.

- **WAP10.1:** WHEN a player spawns in Verdant Hollow and walks by D-pad to the heal post, THE rendered world SHALL report
  the terrain kit drawn with no fallback, the heal landmark at (8,3), and canvas pixels inside the landmark's screen
  rect that differ from a ground tile's.

- **WAP10.2:** WHEN the player then walks to the warp, THE marker SHALL be reported on (1,5) before the step, and after
  the zone change the drawn terrain histogram SHALL differ from Verdant Hollow's with water on at least 10% of the tiles.

- **WAP10.3:** WHILE that flow runs, THE world SHALL report the post stack active at the `day` keyframe, and the
  production build SHALL carry no `__game` hook (the existing verify-build-hooks gate, re-run).

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
3. The registry test over the final shipped set is green: every served asset provenanced, no ai-placeholder row;
   the rows still tagged `placeholder-*` are the list the deferred launch gate will need replaced.
4. One manual pass at three window sizes (incl. a fractional devicePixelRatio) with the post stack on and off and with
   reduced motion on, confirming WAP.1–WAP.7 by eye, with before/after captures of both zones and the battle board
   attached to the closing PR so the operator can judge the placeholder upgrade.
5. The absorbed residual closed per the Residual map with `mr-gates residuals close`; the feedback items in this spec
   dispositioned from their slices.
6. Smoothness contract untouched: the slide clock, interpolation and reconcile are in no slice's touches; `viewport.test.ts`
   still pins every shipped `deviceScale`, and `TILE_PX` / `TARGET_VISIBLE_TILES` are unchanged.

## What the next milestones consume

- **The final-art milestone (unscheduled):** the registry's stable atlas keys and provenance tags; art is a file swap
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
9. **`main.ts` is touched twice** (`wap-4`: the injected time and motion argument; `wap-10`: the DEV `art` field).
   Measured clean: no test pins the `renderer?.render(` call shape, and `main.dispatch.test.ts`'s text scan covers
   `movementGate` / `worldBaseLive` only. A new scan landing before those slices is a STOP.
10. **The luminance floor is a default** (ΔY ≥ 0.06), and so are the coastal-identity figure (water ≥ 10% of
    Tideglass Cove) and the battlefield band (0.15–0.40). They are domain values read through the loader or the decoded
    artifact, not pins on prose; `wap-2`/`wap-3`/`wap-7` may tighten them after measuring, and loosening one is a spec
    change.
11. **Flameling's sheet is resolved through the registry, not renamed.** Renaming `monster-emberkit.*` would need
    `generate_art.py`, which `wap-2` edits concurrently; the registry row is the client's single source, and the
    grandfathered spritesheet eval keeps its own `SLUG_OVERRIDES` fixture until that eval is next replaced.
12. **Battle art scale is published as a second CSS variable** (`--mr-world-scale`, from the same `viewportScale` call
    as `--mr-ui-scale`), so the DOM board can size art in whole device pixels without reading the continuous chrome
    scale that UIF11.1 forbids. One pure function still drives both (#586 D1 holds).
13. **Two CSS-text assertions are retired by replacement** (`wap-3`, Constraint 7b). The repo's testing standard
    forbids reading hand-authored files; the replacements are behavior checks, and the PR names each deletion.
14. **Touches are grep-measured, not build-proven.** A file outside a slice's `touches:` is a STOP plus a build note,
    never a silent widen.
