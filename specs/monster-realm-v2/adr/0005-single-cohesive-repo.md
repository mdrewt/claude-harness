# 0005. Single cohesive repo with a cargo workspace
- Status: accepted
- Date: 2026-06-24

## Context and problem statement
The harness treats each project as its own independent repo under `projects/`. v2's rules live once in
`game-core` and are compiled into both the server module and the client-prediction wasm — the SSOT
marshaling boundary is the most desync-critical seam in the system. The repo shape must not weaken it.

## Considered alternatives
- **Single cohesive repo (chosen)** — `game-core`, `client-wasm`, `server-module`, `sim-harness` in one
  cargo workspace + a `frontend/` workspace. The shared rule crate is consumed by path, so client and
  server always compile the *same* code at the same version.
- **Two repos (engine + game)** — a versioned `monster-engine` library consumed by the game; rejected:
  introduces cross-repo version coupling on the exact layer (`game-core`) whose whole value is being a
  single, lockstep source of truth. A version skew = a desync.
- **Three repos (core / server / client)** — maximal isolation; rejected for the same reason, amplified.

## Decision outcome
- Chosen: single cohesive repo, refined crate boundaries (adds `sim-harness` vs. v1).
- Consequences: one CI pipeline; impact analysis across the workspace before shared-signature changes;
  no publish/version dance for the rule core.
