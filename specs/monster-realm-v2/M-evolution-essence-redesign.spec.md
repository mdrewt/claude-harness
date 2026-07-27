# Spec: M-evolution-essence-redesign — essence-graph evolution, fusion removed (SUPERSEDES ADR-0147/0149)

**Status:** DRAFT skeleton only — queued, post-gate, un-blocked (spawned by r2 playtest feedback
2026-07-26, episode `r2-2026-07-26`, ledger items 062-086) · **Owner:** Drew · **Decision:** this is
a REDESIGN (doctrine §4) — Drew explicitly overrules the 2026-07-25 35-agent fuse()-fix decision
(ADR-0147/0149, `M-postgate-evolution-fusion-hardening`). Per doctrine §6, a REDESIGN of this size
requires the full HEAVY ceremony (investigation → 6-way ideation → judge synthesis → execution →
review) BEFORE implementation — this file captures Drew's verbatim intent as the ceremony's input,
it is NOT itself the converged design. Do not build directly from this skeleton; run the ceremony
first (mirror the `monster-realm-evolution-fusion-redesign` workflow precedent, memory card
`monster-realm-evolution-fusion-workflow-2026-07-25.md`).
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** none technically, but
BLOCKS `M-postgate-evolution-fusion-hardening`'s remaining scope (B2 item-triggered evolution,
still un-shipped per its own spec) — reconcile B2 into or against this redesign before either ships,
since both touch the same evolution-trigger machinery.

## 1. Directive (Drew, r2, verbatim intent — condensed; full text is the r2 source file)

Fusion is REMOVED as a feature. Monsters instead have an **evolution graph** (nodes = monsters,
edges = one-way evolution paths; multiple paths in and out of a given monster are allowed). A
monster evolves down one of its available paths when that path's requirements are met. Path
requirements draw on:

- **History stats** (examples only, non-binding per item 074 — the design ceremony may substitute):
  "Quality Time" (active-party playtime), "Trust" (favorable/unfavorable action ratio, Bayesian-
  seeded k=10), "Nutrition" (proximity to max EVs). **Confirmed (issue #8 / r2-q4 answer, evidence
  `decisions/issue-8.answer.md`): EVs are FULLY REMOVED as a battle/training reward — EVs now come
  primarily from food items (nutrition), and essence (not EVs) is what battle/training grants
  going forward.** This is a binding constraint on the ceremony, not an example.
- **Tier/stage**: standardized tier per monster (Digimon-style); evolving moves UP a tier; eggs
  start at the lowest tier (**confirmed forward-looking invariant only, issue #9 / r2-q5 answer,
  evidence `decisions/issue-9.answer.md` — no breeding feature exists or is being built now**);
  monsters never downgrade tier.
- **Level**: higher-tier / rarer evolutions require higher levels; level requirements vary within a
  tier by rarity.
- **Essence quantity/type**: each path requires specific essence-type amounts (e.g. a tier-1 fire
  monster might need 100 air essence to reach a tier-2 lightning form). Essence is acquired via
  battle, training (slower), or consuming "crystalized essence" items. Rarer evolutions require
  more essence. Essence is conceptually EV-adjacent but does not affect stats directly, and resets
  to 0 on evolution (consumed by the transform).

## 2. What the ceremony must produce (not yet decided — open by design)

- The exact essence type taxonomy and combination rules (item 082's fire+air→lightning example is
  illustrative, not a committed type chart).
- Data model: graph representation (nodes/edges/paths), essence-balance storage per monster,
  history-stat storage and update triggers (battle end, training, care ticks).
- Migration/relationship to the EXISTING `evolve()`/`fuse()` machinery (`game-core/src/evolution/*`,
  ADR-0019/0060/0061) — `fuse()` and its A0 field-carry fix (ADR-0147) are being REMOVED; decide
  whether A0's code is deleted outright or repurposed (e.g. its bond/level-taxing math may still be
  useful for a "combine two same-species monsters" mechanic if the ceremony wants one — not
  assumed).
- Relationship to `M-postgate-evolution-fusion-hardening`'s B2 slice (item-triggered evolution via
  `Item(id)`) — B2's trigger-enum work is likely still valid under an essence-graph model (item
  consumption as one essence-acquisition path) but must be re-verified against the new graph shape,
  not assumed compatible.
- Content authoring format (RON schema per ADR-0057 content fan-out conventions) for the graph.
- Whether existing shipped species (30/31 Tidecrag/Cindershade, item-triggered per `M-postgate-
  evolution-fusion-hardening` slice B) map cleanly onto the new graph or need re-authoring.

## 3. Touches (declared for fan-out eligibility — provisional, will firm up post-ceremony)

`game-core/src/evolution/**`, `server-module/src/evolution*.rs`, `content/**/evolution*.ron` (or a
new registry per ADR-0057 fan-out pattern), likely new schema for essence/history-stat storage
(SCHEMA CHANGE → always-serial per fan-out rules), client evolution/fusion UI (`fusion`/box views).
This is a SCHEMA-touching HEAVY milestone — do not fan out alongside other schema work; consider a
contract-first micro-slice to freeze the essence/graph schema so client and content work can build
behind it in parallel (per the fan-out doctrine's "structural-set work parallelizes via contract-
first" guidance).

## 4. Notes

Weight: HEAVY (redesign, schema, economy-balance — all three §5 risk-promotion triggers hit at
once). This spec is deliberately a skeleton, not a plan — the next unit of work on this milestone
is the HEAVY ceremony itself (investigation + 6-way ideation + judge synthesis), sized as its own
tick(s), not rushed into the disposition pass that created this file.
