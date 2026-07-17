# Sketch: M-playtest-d — Playtest content pack

**Status:** design sketch (scheduled — playtest replan 2026-07) · **Pre-gate** · **Decision:** content
plan = `game-design.md` §5 (MVP targets); no new systems · Pure content/data + assets on the ADR-0057
glob-loaded content pipeline — **fan-out friendly** against pt-a1/pt-b1/pt-c1.

## Problem / intent
The systems outgrew the content: 6 species forms vs the GDD §5 MVP target ~16, one real spritesheet
(emberkit) with everything else on placeholder textures, and recruit/encounter tuning never revisited
since M8. H2 (visible divergence → attachment) and re-catch variety are undertested at this roster size;
attachment needs distinct silhouettes. Grow content to the MVP bar — **no schema, no new mechanics**.

## Scope (condensed)
- **Roster 6 → ~16 forms:** +3–4 base species with evolutions (archetype coverage per GDD §5: tanky /
  fast sweeper / status / support; affinity spread across the existing chart), learnsets from the
  existing ~11-skill set (top up toward ~12 only if a learnset gap demands it).
- **Sprites:** one spritesheet per new form + replace placeholder fallbacks for the existing 5 uncovered
  forms. Placeholder-quality is acceptable; **distinct silhouette + palette per species is the bar**
  (H2 attachment). Follows the emberkit sheet format (`client/public/assets/monster-*.{json,png}`).
- **Tuning pass (data-only):** encounter tables across both zones spread the roster (commons/uncommons/
  rares per GDD §6); recruit-rate curve re-checked so **weakening is the lever** (H1) at the new roster's
  stat spreads; shop/bait/heal prices sanity pass on the M13 economy.
- **Content-integrity:** all existing gates (content parity, determinism, schema-snapshot) stay green —
  this milestone *proves* the ADR-0057 content pipeline at MVP scale.
- **Out of scope:** new zones (2 + hub is the GDD MVP bar), new skills-as-mechanics, story/quests beyond
  what exists, art polish beyond distinct-silhouette.

## Candidate slices (build-time slicing pass finalizes)
| slice | summary | candidate touches |
|---|---|---|
| pt-d1 | roster wave 1 (+2 lines w/ evolutions) + sprites + learnsets | `game-core/content/species/*`, `content/evolutions.ron`, `client/public/assets/monster-*` |
| pt-d2 | roster wave 2 + placeholder-replacement sprites for existing forms | same shape as pt-d1, disjoint files |
| pt-d3 | encounter/recruit/economy tuning pass + eval updates | `game-core/content/encounters/*`, `content/items/*`, `content/shops/*`, tuning evals |
Pairing: d-slices are disjoint RON/PNG file adds → pair with each other and with pt-a1/pt-b1/pt-c1.
pt-d3 after d1/d2 (tunes the full roster).

## Risks / decisions
Balance is data + iteration, not proof — the playtest itself is the balance test; pt-d3 sets a sane
baseline only. Sprite production inside an autonomous run: generate programmatic sheets in the emberkit
format (palette-swapped bodies are acceptable at distinct-silhouette bar); if quality disappoints, Drew
can swap PNGs post-hoc without code changes (content-pipeline win).
