# 16r-a — Post-2.8.1 doc-truth sweep — plan

**Slice:** `16r-a` (M-postgate-sixteenth-review-residuals) · HIGH doc-drift · LIGHT · doc-only
**Branch:** `feat/16r-a-doc-truth-sweep` · worktree `.claude/worktrees/16r-a` from `origin/master@2290f47`
**Triage:** LIGHT / routine. 5 files, prose+comment only, 0 code paths. Routing per `docs/routing.md`:
docs tier (Haiku) + autonomous-loop bump = Sonnet-class work; executed inline by the orchestrator
with a right-sized post-edit lens fan-out (`reviewer` + `red-team` in parallel, then `verifier`).
No `planner` fan-out: the spec already enumerates every edit site verbatim, so a decomposition pass
would restate it. No ADR: correcting stale prose introduces no new pattern or dependency.

**Code-intel routing note (not skipped silently):** CodeGraph indexes **no markdown**, and four of
the five touched files are markdown/TOML. The one code-grounded claim (view PK adoption) was
verified by direct `grep` over `server-module/src/schema.rs` — 5 `#[spacetimedb::view(accessor = …)]`
declarations, **zero** carrying `primary_key`. Graphs contribute nothing further here.

## EARS criteria

- **E1** — WHEN an agent reads `AGENTS.md`/`ARCHITECTURE.md` THE SYSTEM SHALL present only 2.x
  module syntax as current.
- **E2** — WHEN a reader consults ADR-0197/the 2.8.1 runbook on view primary keys THE record SHALL
  state adoption status accurately.

## Edit sites (verified present at 2290f47)

| # | File:line | Defect | Fix | EARS |
|---|---|---|---|---|
| 1 | `AGENTS.md:7` | trailing sentence "**Write 1.x module syntax** (`#[table(name = x)]`, `ctx.sender` as a *field*) until the `M-stdb-2x-module-sdk` migration lands." contradicts the correct 2.x instruction earlier in the same bullet; agents following it emit code that does not compile | delete the stale sentence (and its duplicate trailing skill pointer) | E1 |
| 2 | `ARCHITECTURE.md:25` | "validate `ctx.sender` + legality" — 1.x field spelling | → "validate `ctx.sender()` + legality" | E1 |
| 3 | `server-module/Cargo.toml:16-19` | "crate 1.12.0 (last 1.x) against a 2.8.1 host … write 1.x syntax" — the pin is `2.8.1` (workspace `Cargo.toml:49`) | rewrite to 2.8.1 lockstep reality, keeping the ADR-0197 pointer | E1 |
| 4 | `docs/adr/0197-…:293,300` | "view primary keys … become available" / "revisit `15r-sec-a` now that view primary keys exist" reads as adopted | qualify: available, **not yet adopted**; adoption tracked as `M-stdb-2x-module-sdk` sdk-d opportunistic follow-up | E2 |
| 5 | `docs/spacetimedb-2.8.1-upgrade-runbook.md:163` | "Removes the … constraint that forced hand-rolled … reconciliation" — `store.ts`'s reconciliation is still load-bearing | qualify to "unblocks (NOT yet adopted)"; note the hand-rolled path stays until sdk-d | E2 |

## Constraints

- **ADR body-only edit.** No ADR *header* is touched → no `adr-digest` regen (the digest gate is
  header-only). Keep edits line-count-neutral inside `0197` where practical so external
  `ADR-0197:<line>` citations do not drift (none exist in-repo; the harness spec cites ~299-302).
- **No new eval.** `evals/**` is outside `touches:` and is owned by concurrent siblings 16r-b/16r-c.
  No existing eval reads `AGENTS.md` — E1/E2 have no mechanical gate. Recorded as a follow-up flag,
  not silently dropped.
- `CHANGELOG.md` is `git cliff`-generated — not hand-edited. `docs/adr/README.md` untouched.

## Gate

Full `just ci` green locally (with the asdf/cargo PATH export), then PR. Supervisor merges.
