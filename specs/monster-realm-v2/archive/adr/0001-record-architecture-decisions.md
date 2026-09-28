# 0001. Record architecture decisions (monster-realm)
- Status: accepted
- Date: 2026-06-24

## Context and problem statement
Monster Realm (v2) re-engineers the v1 monster-tamer. v1 captured design in a single prose
`ARCHITECTURE.md` milestone narrative; `standards/adr-process.md` and `AGENTS.md` golden rule #4 require
an ADR for any new dependency or design pattern, with design forks explored via `/debate`/`/brainstorm`
and recorded as the ADR's "Considered alternatives". The project needs `docs/adr/` from day one so the
stack-defining forks (server, prediction, renderer, schema, scaling, authoring, CI) are decided
explicitly rather than implied by code.

## Considered alternatives
- Prose `ARCHITECTURE.md` narrative only (v1's approach) — rejected: rationale drifts from intent and
  conflicts with `standards/spec-driven.md` (spec is the primary artifact).
- Commit messages only — rejected: not discoverable; rationale goes stale.

## Decision outcome
- Chosen: maintain MADR-format ADRs in `docs/adr/`; `ARCHITECTURE.md` is a durable design *record* that
  links ADRs, not a decision log.
- Consequences: every dependency/pattern is diffable and reviewable; the open forks below are tracked
  as Proposed ADRs until `/debate` resolves them.
