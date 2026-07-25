# 0019. Evolution & fusion model (individuality-preserving + content integrity)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M10 design (closes Phase A).

## Context and problem statement
Evolution and fusion transform a monster into another species. The emotional core (ADR-0016) is that each
monster is a *unique individual* a player invests in (genes, training, bond, name). A transform that
re-rolls individuality would erase that investment. Fusion combines two individuals into one; the recipes
and the resulting forms must be content-integrity-safe (no ambiguous recipe; a fusion/evolution-only form
must not appear in the wild). v1 left the integrity rules to row-order and author discipline — both failed
silently.

## Considered alternatives
- **Individuality-preserving transforms + content-integrity gates (chosen).** Evolution carries
  genes/temperament/training/bond/name and re-derives stats; fusion combines both inputs' individuality via
  an order-independent recipe and atomically replaces them with one output. `validate_content` enforces "no
  duplicate fusion pair" and "no wild-catchable derived form", each with a proof-of-teeth fixture.
- **Re-roll individuality on transform.** Simpler, but erases the player's investment and the discovery
  loop's payoff. Rejected.
- **Fusion produces a fresh average monster** (no inheritance). Loses what made the inputs special.
  Rejected.
- **Integrity by author discipline / RON comments** (v1). The first matching recipe wins by row order; a
  derived form sneaks into encounters. Rejected — make it code.

## Decision outcome
- Chosen: **carry/combine individuality through transforms; gate content integrity in `validate_content`.**
- Consequences: `derive_stats` is re-run after a transform (single source of truth); `fuse` is one atomic
  transaction (delete two, insert one) and respects the escrow/in-battle guards (ADR-0017/M15); the
  integrity rules are mechanical (fixtures), not discipline. Trade-evolution and temporary battle-forms are
  deferred (additive) to M15/M14.

## Amendment — 2026-07-25 (fuse() drift from stated intent; fusion-vs-evolution design debate)

**Trigger:** Drew's first closed playtest (`playtest-gate-decision-2026-07-25.md`) reported that fusion
"erases the individual monsters... while evolution allows the individual monsters to grow and develop,"
proposing to replace fusion with a typed-energy-accumulation evolution system. Rather than deciding
unilaterally, this was run through a full research → brainstorm (5 divergent candidates) → adversarial
debate (2 axes, FOR/AGAINST + judge) → 3-judge panel → 4 rounds of adversarial critique-and-refine
workflow (`monster-realm-evolution-fusion-redesign`, 35 agents, 2026-07-25) before any decision was made.
Full research/candidates/debate/judgment trail: `$MEM/monster-realm-evolution-fusion-workflow-2026-07-25.md`
(harness memory card). Implementation-ready spec: `M-postgate-evolution-fusion-hardening.spec.md`.

**Finding: this ADR's own stated intent ("identity isn't erased by a transform") was never fully honored
by `fuse()`'s implementation.** `evolve()` correctly carries 100% of individuality state (nickname, level,
xp, IVs, nature, EVs, bond) — full compliance. `fuse()` correctly combines the *genetic* half (IVs via
per-stat max, nature from the higher-bond parent — the DQM-inheritance model this ADR's "considered
alternatives" already chose over a fresh-average reroll) but resets the *relationship* half — level→1,
EVs→0, bond→default, nickname→`None` — to fresh values on every fusion. That is a real, verified drift
from "carry/combine... not erase," not a misreading of the original decision.

**Decision: repair `fuse()`, do not replace fusion with evolution.** The debate panel and 3-judge synthesis
converged (adversarially, across 4 refinement rounds — not a first-draft accept) on:
1. **Fusion stays permanent/destructive** (both parents consumed, one new row) — its economy-sink role
   (game-design.md §6) and Steamveil's only legitimate acquisition path both depend on it, and no candidate
   proposing temporary/reversible fusion resolved what replaces that sink.
2. **`fuse()`'s field-carry formula is broadened**, extending the *combine, don't erase* treatment this ADR
   already grants IVs/nature to level, EVs, and bond too (taxed/averaged rather than hard-reset — see the
   new spec for the exact formulas, which close a self-fusion/bond-laundering exploit found during
   critique) — this is the actual fix for Drew's complaint, not a new mechanic.
3. **Drew's worked example ships almost for free, with zero engine changes**: the evolution-trigger enum
   already has a live `Item(id)` variant (exercised today by species 1/Flameling's branch); two new
   Item-triggered evolution branches on existing species reproduce his "Flameling + Water Energy →
   Steamveil"-shaped pitch through already-built plumbing.
4. **The full typed multi-energy-accumulator system is explicitly deferred, not rejected** — gated on
   playtest evidence that the cheap item-triggered version (point 3) doesn't already satisfy the H2
   divergence/attachment hypothesis. The evolution-trigger enum was deliberately built with no wildcard
   match arm (this ADR's own mechanical-enforcement discipline), so this deferral costs no real option
   value: adding a typed variant later is exactly as cheap as building it now, without the risk of an
   under-evidenced 8-typed-accumulator system (a legibility failure mode multiple researched precedents —
   Digimon World 1's opaque multi-axis gating — hit hard).

**Not unanimous — recorded honestly, not smoothed over** (see the new spec's Decisions section for the
full open-decision list Drew should confirm/override): whether fusion should remain a distinct mechanic
long-term at all (a minority position through the critique rounds argued for graduating it to a
secondary/optional system, given its 1-recipe-vs-6-evolution-block content footprint); the exact tax/floor
constants (structurally sound, proven exploit-closed, but not playtest-tuned); where the new
`fusion_eligible()` gate should live in the module structure.

**Consequences:** no schema change for the core fix (Slice A0 is a function-signature + one reducer-arg
change, ~23 compiler-enforced call sites); a small new private table + owner-scoped view for a fusion
preview screen is deferred to a fast-follow slice (A1); the 1 existing `fusion.ron` recipe and all 6
existing `evolutions.ron` blocks are unchanged in place — no content migration, no backfill of
already-fused rows (a one-time grandfather, not a correction). Superseded belief: ptc5-era discussion
assumed fusion's mechanics were either fine as-is or needed wholesale replacement; neither was correct —
the gap was narrow and specific, and finding that required actually reading `fuse()`'s implementation
against this ADR's own stated intent, not re-deriving fusion design from genre first principles.
