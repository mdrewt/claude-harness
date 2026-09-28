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

## pt-d2 DELIVERED

**DELIVERED (ADR-0144, PR #242):** Roster wave 2 — species ids **20, 21** (Umbraquill Dark/status, Gustwyrm Wind/support) + evolution-only **22, 23** (Venumbra, Tempestrix), inside the reserved band 20–29, files `050-wave2.ron` + `051-wave2-derived.ron`, `client/art-src/generate_monsters.py` importing shared art module (never editing it); placeholder-replacement sprites for five existing forms. Reserved-band protocol (id + filename) guards concurrent pt-d1; affinity/archetype by explicit tie-break (no coordination needed). Three shared-file edits, all of which DID collide with pt-d1 and all of which failed LOUDLY: `server-module/src/lib.rs` CONTENT_VERSION (pt-d1 took 13, pt-d2 landed second → **14**), `evals/baselines/content-hash.json` (regenerated, never hand-merged), `evolutions.ron` (both stanzas kept — note pt-d1's comment-hygiene rule recorded in that file: full-line comments only, and no comment may contain `species_id:`/`to_species:`). Auto-discovered `evals/pt-d2-roster-wave-2.eval.mjs` enforces band, STAB, orphan-derived-form + evolution-target-must-be-derived teeth (red-team proved base→base evolution passed Rust authority — eval closes for wave-2 only; general fix to `game-core/src/content.rs` deferred), monotonic evolution BST, sprite format/normal-registration, and silhouette-distinctness via pixel-level ~40-line `node:zlib` decoder. Sprites ship inert (`client/src/render/placeholderAssets.ts` is sole provider; wiring deferred). Encounter/skill/item/ability tuning stays with pt-d3 (balance finding: only one Dark and one Wind skill exist — both new forms have thin offensive kits). Full `just ci` EXIT=0 on the merged tree (both waves present): 1393 nextest / 0 skipped, 70 evals / 0 fail, 1337 vitest / 0 skipped; pt-d2's gate reports pt-d1's ids as `INFO: uncovered`, proving the explicit COVERED map is merge-order-independent. **Coverage gap left for pt-d3:** pt-d1 took Earth+Dark and pt-d2 Dark+Wind, so Dark is doubled and Electric/Light remain unrepresented (both still have zero skills); merged roster = 14 forms vs the GDD §5 ~16 target.

## pt-d3 DELIVERED

**DELIVERED (ADR-0145, branch `feat/pt-d3-tuning-pass`, base master `d2a3e5b`, 3 commits) — CLOSES
M-playtest-d (3/3 slices: pt-d1, pt-d2, pt-d3).** Encounter/recruit/economy tuning pass over the merged
14-form roster. Zone 0 left byte-identical: `client/e2e/recruit.spec.ts` derives two remote-CI flake
budgets from zone 0's exact encounter weights (10/7/5, sum 22) and its `encounter_rate` (200) in
TypeScript comments, so touching it would red a long-running e2e for reasons far from the actual change.
All new tuning went into a new zone-1 table, "Tideglass Cove" (`encounter_rate: 150`, 7 entries), giving
the merged roster its first wild-legal placements for pt-d1's species 7/8 and pt-d2's species 20/21.
Only 7 of the 14 roster forms are wild-legal — the derived (evolution) forms `{4,5,6,9,10,22,23}` are a
hard CI failure in an encounter table (`validate_evolution_fusion` step 6), which is why the earlier
"spread all 14 forms" framing above was infeasible as literally stated; ADR-0145 records the correction.
Antidote (item 3) was stocked in a shop for the first time (`buy_price: 150`, preserving the existing
sell=40%-of-buy convention) since the roster gained two wild Poison appliers with it purchasable nowhere.
No other repricing — the currency-faucet band (`battle_currency_reward = bst/10`) is unchanged because
all 7 wild-legal BSTs land in the same 310-328 range. `CONTENT_VERSION` bumped 14→15, content-hash
baseline regenerated. New gates: `game-core/tests/pt_d3_tuning.rs` (17 tests, 5 independently reproduced
RED before the content landed) + `evals/pt-d3-tuning.eval.mjs` (2 criteria, including a defensive check
against the still-unfixed `content-version.eval.mjs` shadowing bug from ADR-0143). Local `just ci`
EXIT=0. Changed-line mutation obligation is vacuous (the only changed Rust source line is a `const`, zero
mutants generated) — reported honestly rather than claimed as a passing mutation run.

**Deferred, recorded in ADR-0145 (not this slice's job):** roster stays at 14 forms vs the GDD §5 ~16
target; Dark is doubled while Electric and Light have zero species and zero skills — a future wave would
need to own `content/skills/*` or fail pt-d1's STAB gate, parked post-gate pending playtest feedback. Town
healing is free (`content/heal_locations/*` outside touch-set; genuinely coupled to the e2e's heal budget,
deserves its own slice). Zone 1 has no heal location. ADR-0143 D4's flee-predicate generalization stays
deferred. Zone 1 is e2e-uncovered by construction — the first live Sandstorm and Hail in the new table
will happen in human playtest, not CI; this is the top thing for a playtester to watch.

## Risks / decisions
Balance is data + iteration, not proof — the playtest itself is the balance test; pt-d3 sets a sane
baseline only. Sprite production inside an autonomous run: generate programmatic sheets in the emberkit
format (palette-swapped bodies are acceptable at distinct-silhouette bar); if quality disappoints, Drew
can swap PNGs post-hoc without code changes (content-pipeline win).
