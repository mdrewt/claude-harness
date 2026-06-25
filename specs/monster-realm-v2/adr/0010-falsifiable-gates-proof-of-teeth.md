# 0010. Falsifiable mechanical gates (proof-of-teeth)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: the M0 red-team review pass

## Context and problem statement
The harness leans hard on **mechanical enforcement over discipline** (`standards/principles.md`): a long
list of gates (determinism/safety clippy lints, feature-isolation, prediction-parity, zoned-schema,
append-only-ids, schema-snapshot, bindings-drift, identity-trust security eval). A gate that is wired but
never *observed to fail* gives false confidence — "green CI on an almost-empty repo" can be green because
it tests nothing, which is the exact reward-hacking failure `standards/testing-tdd.md` warns about. v1's
recurring bug class was "a contract left to discipline instead of a mechanism"; the v2 analogue is "a
mechanism that was never proven to bite." We need a way to keep every gate honest.

## Considered alternatives
- **Proof-of-teeth: every gate ships a known-bad fixture it must reject (chosen)** — for each mechanical
  gate, commit a minimal fixture that violates the invariant, and a meta-test asserting the gate fails on
  it. The proof-of-teeth suite runs in CI. Cost: one small fixture per gate; benefit: "green" provably
  means "correct", not "untested", and a gate that is accidentally disabled/weakened is caught.
- **Mutation testing alone** — necessary but insufficient: it proves *unit tests* are meaningful, not that
  *evals/lints/architecture gates* actually reject violations. Kept, but does not cover the gate layer.
- **Trust the gates (status quo)** — rejected: indistinguishable from a no-op gate until a real regression
  slips through; defeats the purpose of mechanical enforcement.

## Decision outcome
- Chosen: **proof-of-teeth is mandatory for every mechanical gate.** A gate is not "done" until its
  known-bad fixture and the meta-test that the gate rejects it both exist and run in CI.
- Consequences: codified in the M0 spec as a cross-cutting acceptance criterion; new gates added in later
  milestones inherit the requirement (a new eval without a proof-of-teeth fixture fails review). Slightly
  more fixtures to maintain, kept cheap by colocating each fixture beside its eval.
