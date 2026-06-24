# 0001. Record architecture decisions (harness)
- Status: accepted
- Date: 2026-06-24

## Context and problem statement
The harness itself (templates, hooks, CI, scripts) accrues design decisions just
like the projects it generates. `standards/adr-process.md` requires an ADR in
`docs/adr/` for any decision a future maintainer would question, but the harness
root had no `docs/adr/`, so harness-level decisions lived only in commit messages
and `memory/decisions-log.md` (with empty ADR pointers).

## Considered alternatives
- No ADRs at root (rely on commits / decisions-log) — rejected: rationale goes
  stale and the SSOT (`standards/adr-process.md`) is contradicted by reality.
- Keep ADRs only inside generated projects — rejected: harness-level decisions
  (hooks, template CI, Renovate policy) belong to no single project.

## Decision outcome
- Chosen: maintain MADR-format ADRs in `docs/adr/` at the harness root, mirroring
  the per-project convention.
- Consequences: harness rationale stays with the code and is diffable;
  `memory/decisions-log.md` can point to concrete ADRs.
