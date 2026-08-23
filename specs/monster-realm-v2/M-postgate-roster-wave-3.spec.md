# Spec: M-postgate-roster-wave-3 — Electric + Light roster wave

**Status:** build-ready · **Post-gate, DE-GATED** (Drew 2026-07-25 — no fresh decision needed to build)
· pulled forward 2026-08-23 · **Owner:** build loop · **Stack:** RON content on the ADR-0057
glob-loaded pipeline · **Project:** monster-realm (v2) · **Depends on:** `M-playtest-d-content-pack`
(CLOSED) · **Decision:** reserve project **ADR-0204** at build time — see Notes.

## Problem / intent

Six of the eight `Affinity` variants have content; **Electric and Light have zero species and zero
skills**. The enum has carried all eight since M6 (`game-core/src/monster/types.rs:13`) and
`content/type_chart.ron` already defines every Electric and Light matchup — the gap is **purely
content**, and it is the last one between the current 14-form roster and the GDD §9 MVP content bar.

pt-d3 accepted this as a named residual (ADR-0145): pt-d1 took Earth+Dark and pt-d2 took Dark+Wind, so
**Dark is doubled** while two affinities stayed empty. This milestone closes that residual by adding one
Electric line and one Light line — **base + evolution each** — plus the Electric/Light **skill kits**
those species need to satisfy the ADR-0143 STAB gate.

**No schema, no new mechanics, no Rust rules.** Every registry this milestone touches is a glob-loaded
directory (`game-core/build.rs` read_dirs, filters `*.ron`, sorts by filename), so a new part file is
auto-discovered with **zero code change**.

## Candidate slices (build-time slicing pass finalizes)

| slice | summary | touches | after |
|---|---|---|---|
| rw3a | **this spec** + the PLAN.md bullet link | `specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md`, `specs/monster-realm-v2/PLAN.md` | none (first slice) |
| rw3b | **atomic content drop**: Electric+Light skill kits, both species lines, evolution edges, sprites, ADR-0204 | `game-core/content/skills/070-wave3.ron`, `game-core/content/species/070-wave3.ron`, `game-core/content/species/071-wave3-derived.ron`, `game-core/content/evolution_paths/070-wave3.ron`, `server-module/src/lib.rs` (CONTENT_VERSION only), `evals/baselines/content-hash.json` (regenerated), `evals/rw3b-roster-wave-3.eval.mjs`, `game-core/tests/rw3b_roster_wave3.rs`, `client/art-src/generate_monsters.py` (append plans only), `client/public/assets/monster-*.{png,json}`, `docs/adr/0204-*.md` | rw3a |
| rw3c | **obtainability + tuning**: wild placement for the new tier-0 forms, level/weight banding | `game-core/content/encounters/000-core.ron`, `server-module/src/lib.rs` (CONTENT_VERSION only), `evals/baselines/content-hash.json`, `evals/rw3c-wave-3-tuning.eval.mjs`, `game-core/tests/rw3c_wave3_tuning.rs` | rw3b |

**Why rw3b is atomic (skills + species + evolution together).** The ADR-0143 STAB gate requires every
species to learn at least one skill of its own affinity. A species-only slice is therefore **red on
arrival**, and a skills-only slice lands append-only ids with no learner — unrenumberable dead data if
the species design then shifts. The evolution edges join them for the same reason: a derived form with
no incoming edge is an orphan. Same directory tree, same author, same reviewer — splitting buys nothing
and costs a guaranteed red.

**Sprites ride along** with rw3b, matching the pt-d1/pt-d2 precedent (each wave shipped its own sheets).
They are CI-disjoint — `content-version.eval.mjs` hashes only `game-core/content/**`, never `client/` —
so **if rw3b proves oversized at build time, sprites MAY split into an rw3d**; rw3c may not, because it
edits a shared, e2e-sensitive tuning file.

**Fan-out.** rw3b and rw3c both bump `CONTENT_VERSION` and regenerate `evals/baselines/content-hash.json`,
so they are **not** parallel-safe with each other or with any other content slice; they are `after:`-chained
and collide loudly rather than silently (pt-d1/pt-d2 evidence). Everything else here is `touches:`-disjoint
from the rest of the queue.

## Reserved bands

Wave 3 claims **one number across every registry** — band `40..=49` and the `07x-` filename prefix — so a
future author can check one range instead of four. Species ids and skill ids are **independent
registries with independent numbering** — species 40 and skill 40 are not a collision, they are a
mnemonic. Ids need not be contiguous; gaps are legal (the append-only evals flag removals, never gaps).

| axis | reserved band | owner / file |
|---|---|---|
| species ids | `40..=49` (40 Electric base, 41 Electric derived, 42 Light base, 43 Light derived; 44–49 headroom) | `species/070-wave3.ron` + `species/071-wave3-derived.ron` |
| skill ids | `40..=49` (Electric and Light kits share the band — flat, no per-affinity sub-band) | `skills/070-wave3.ron` |
| evolution edge ids | `100..=199` | `evolution_paths/070-wave3.ron` |
| species filenames | `070-wave3.ron` (tier 0), `071-wave3-derived.ron` (derived) | mirrors the `050`/`051` wave-2 pair |
| skills filename | `070-wave3.ron` | first part file the skills registry has ever had |
| evolution filename | `070-wave3.ron` | `evolution_paths/000-core.ron` owns `1..=99` |
| ability ids | **none claimed** | reuse existing ids 1–3 or omit |

The species band was **pre-reserved in-tree** for this milestone: `species/060-item-evo-derived.ron`
states verbatim that slice B owns `30..=39` and *"Roster wave 3 MUST take 40..=49"*.

`skills/000-core.ron` holds ids 1–11 and carries **no band claim**; wave 3 is the first slice to add a
second skills part file. It claims `40..=49` and leaves `12..=39` unclaimed for core growth. **Do not
edit `skills/000-core.ron` to retro-annotate a band** — that widens the diff into a file this milestone
otherwise never touches, for no mechanical gain (the collision check reads actual ids, not comments).

## Acceptance criteria (EARS)

Criteria RW3-01…RW3-09 govern the **content** slices (rw3b/rw3c) and become their gate ledgers. rw3a's
own acceptance is its slice ledger, not this section.

- **RW3-01** WHEN the content registries load, THE SYSTEM SHALL expose at least one `Electric` species
  and at least one `Light` species, and at least two `Electric` and two `Light` skills.
- **RW3-02** WHEN any wave-3 species loads, IT SHALL declare at least one learnable skill whose affinity
  equals its own (the ADR-0143 STAB gate), and the skills it names SHALL exist in the same commit.
- **RW3-03** ALL wave-3 species ids and skill ids SHALL fall inside `40..=49` of their registry, SHALL be
  unique, and SHALL NOT renumber or remove any existing id.
- **RW3-04** EACH wave-3 base form SHALL declare `tier: 0`; EACH wave-3 derived form SHALL declare a
  `tier` exactly one greater than its source, SHALL be the target of at least one wave-3 evolution edge,
  and ALL wave-3 edge ids SHALL fall inside `100..=199`.
- **RW3-05** IF a wave-3 species has two or more outgoing evolution edges, THEN THOSE EDGES SHALL either
  share a `min_level` or the lowest SHALL carry an additional non-level gate (ADR-0176 D2).
- **RW3-06** THE SYSTEM SHALL NOT place any wave-3 evolution-edge target (`to_species`) in an encounter
  table, and WHEN rw3c lands, EACH wave-3 tier-0 species SHALL appear in at least one encounter entry.
- **RW3-07** THE zone-0 encounter table SHALL remain byte-identical (the `client/e2e/recruit.spec.ts`
  flake budgets are derived from its exact weights and `encounter_rate`).
- **RW3-08** THE SLICE SHALL NOT modify Rust source other than `CONTENT_VERSION` and its own new test
  files, and SHALL NOT edit `Affinity`, `AbilityEffect`, or `content/type_chart.ron`.
- **RW3-09** EACH content slice SHALL ship its own `evals/rw3*.eval.mjs` and `game-core/tests/rw3*.rs`,
  SHALL bump `CONTENT_VERSION` monotonically, SHALL regenerate `evals/baselines/content-hash.json` with
  its generator, and SHALL NOT edit `evals/run.mjs` or another slice's gate file.

## Touches

Declared per slice in the candidate-slices table above. rw3a itself touches only
`specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md` and `specs/monster-realm-v2/PLAN.md`.

## Non-goals

- **New affinities, mechanics, or abilities.** `AbilityEffect` is an exhaustive Rust enum with only ids
  1–3 authored; a new passive effect is a code change and belongs to its own milestone.
- **Type-chart tuning.** `type_chart.ron` already covers all eight affinities and is **not** glob-loaded
  (single `include_str!`), so it has no band and collides with everything. Balance note for the author,
  not a chart edit: Electric resists nothing but its mirror, and Light/Dark are mutually super-effective
  with no resist either way — Light lines read glassy against the doubled Dark roster. Design the stat
  spreads around that.
- **New zones, story, or art polish beyond distinct-silhouette.**
- **Wiring sprites into the renderer.** `client/src/render/placeholderAssets.ts` remains the sole
  provider; wave-3 sheets ship inert exactly as wave 2's did.

## Notes

**Roster count.** 14 → **18 forms**. That is *not* an overshoot of the GDD's "~16": §9 names
`~16 forms + ~6 affinities + ~12 skills` as the **MVP subset floor** — "about half the §5 scope" — and
§5's full starting scope is ~32 forms. 18 forms / 8 affinities / ~15 skills sits correctly between the
MVP floor and the starting-content target, and completing both empty affinities symmetrically (base +
evolution each) is what makes Electric and Light as deep as the six that already exist.

**Evolution data lives in `content/evolution_paths/`.** The essence-graph redesign (ADR-0174/0176, spec
EG3-1) **deleted** `content/evolutions.ron`, and **deleted** `content/fusion.ron` with it; the graph is
now one directed edge per entry with an append-only `edge_id`. ⚠️ The precedent spec
`M-playtest-d-content-pack.spec.md` still names the **deleted**, **stale** `evolutions.ron` in its pt-d1
row — follow this section, not that table.

**ADR-0204 is reserved for rw3b, in the project repo.** `adr_next_free = 204` (highest on disk:
`0203-nightly-red-response-policy.md`). rw3a deliberately does **not** create it: a harness-repo slice
that also writes a project-repo file is refused as REPO-MIXED by mr-spawn's repo routing. rw3b authors
`docs/adr/0204-*.md` recording the wave's affinity/archetype and band decisions.

**Anti-patterns — the traps CI will NOT catch for you.** (Band discipline, STAB, and RON parse errors all
fail loudly on their own; these do not.)
1. **Auto-evolution is a race.** A monster with exactly one eligible path evolves *immediately*, so an
   unconditional low-`min_level` edge silently kills every higher-level sibling branch before the player
   is offered a choice (ADR-0176 D2, pinned by `eg3_evolution_graph.rs` t11). One outgoing edge per base
   form makes this vacuous — the safe default.
2. **"Spread all forms across encounters" is infeasible as usually stated.** Derived forms in an
   encounter table are a hard CI failure — rule **R6** of `validate_evolution_paths`
   (`game-core/src/content.rs:934`, enforced at `:1050`). Only tier-0 forms are wild-legal; pt-d3 hit
   this for real. ⚠️ R6 keys on the evolution graph, **not** on the `tier` field: it rejects a species
   that is some edge's `to_species` *and* appears in an encounter table. A derived form that was never
   given an incoming edge would slip past R6 — which is why RW3-04 requires every derived form to be an
   edge target. (The name `validate_evolution_fusion`, used in `encounters/000-core.ron` and in the
   pt-d3 precedent text, is **stale** — no such function exists in `game-core/src` today.)
3. **RON comment hygiene** (ADR-0143 D7, gated by `pt_d1_roster.rs` pt_d1_7): full-line comments only,
   and no comment may carry an id-shaped needle (`species_id:`, `to_species:`, a bare `id:`) — the
   content scanners strip whole lines and then regex the remainder. Write `id=N` / `edge=N` instead.
4. **Never hand-merge `evals/baselines/content-hash.json`**, and never "resolve" a `CONTENT_VERSION`
   conflict by keeping both sides — take the next integer and regenerate the baseline.
5. **A second `zone_id` tuple in a new encounters part file is not a safe merge.** Encounter tables are
   keyed per zone; placement means editing the existing zone tuple in `encounters/000-core.ron`.

**`CONTENT_VERSION` was 19 when this spec was written** (`server-module/src/lib.rs`). Treat that as a
staleness check, not an instruction: **re-read it live** and take the next integer. Both content slices
bump it, so the second to land takes 21, not 20.

**Post-integration verification.** Each slice green in isolation is not sufficient: after rw3b and rw3c
are both merged, a full `just ci` must be green on the combined tree (the wave-2 gate reporting wave-1
ids as `INFO: uncovered` is the precedent that this stays merge-order-independent).

## Delivered / Parked

- **rw3a — DELIVERED.** This spec + the PLAN.md bullet link. Evidence: slice ledger
  `memory/projects/gates/rw3a.gates.md`.
- **rw3b — not started.** parked → queued as the next candidate for this milestone.
- **rw3c — not started.** parked → queued behind rw3b.
