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
