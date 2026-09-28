# 0003. Shared rule core & client prediction
- Status: accepted
- Date: 2026-06-24
- Decided via: `/debate` (see PLAN.md "Debate 2"), ratified by Drew 2026-06-24

## Context and problem statement
v1's anti-desync spine: every game rule lives once in a pure deterministic `game-core` Rust crate; the
server runs it for truth and the client runs the *same compiled code* (via `client-wasm`) for movement
prediction. Integer-tile authority + determinism (clock/RNG injected, enforced by `clippy.toml`) make
desync hard to even express. This ADR confirms whether v2 keeps that shape.

## Considered alternatives
- **Pure Rust `game-core` → wasm shared with the client (recommended)** — single source of truth for
  rules; prediction == authority by construction. Cost: the wasm build/marshaling boundary.
- **Server-only authority, no client prediction** — simpler client; relies on interpolation only.
  Acceptable for turn-based battles (v1 already does this) but regresses movement feel.
- **Reimplement rules in TypeScript on the client** — rejected outright: two sources of truth for a
  rule is the canonical desync bug; violates SSOT (Tier-1, non-negotiable).

## Decision outcome
- Chosen: **pure Rust `game-core` → wasm, shared with the client; predict movement only, battles
  server-only** — exactly v1's split, which the debate ratified as already optimal. Movement prediction
  earns its complexity (overworld feel / latency-hiding) and is contained to one `prediction/` module;
  turn-based battles stay server-resolved so animation hides the round-trip with zero rollback netcode.
- Rejected: server-only/interpolation (every step waits a full RTT — a visible feel regression); TS rule
  reimplementation (two sources of truth = the canonical desync bug; violates Tier-1 SSOT).
- Refinement: movement is the **sole** predicted system; any future predicted system must ship its own
  prediction-parity eval before it is added.
- Consequences: determinism + prediction-parity evals (PLAN.md §7) gate this; a `game-core` change
  ripples to wasm + server + bindings (impact analysis required before any shared-signature change).
- Feature-isolation invariant (added in the M0 final review): `client-wasm` compiles `game-core`
  **without** the `spacetimedb` feature, so the server-only derives/deps never leak into the client build.
  A feature-isolation eval enforces this mechanically from M0, and the prediction-parity harness is built
  at M0 against a trivial rule so M1 movement plugs into an existing gate. Structurally, the workspace uses
  Cargo's `resolver = "2"` so per-crate feature sets do not leak between crates (the eval is the proof that
  they don't); `game-core` depends on `spacetimedb` only as an `optional` dep behind its `spacetimedb`
  feature, which adds `SpacetimeType` derives and **no runtime logic**.
