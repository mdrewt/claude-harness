---
name: monster-realm-m8.95d
description: M8.95d doc-keeper — closes M8.95 knowledge-bundle milestone (ADR-0080, ARCHITECTURE.md, CHANGELOG, spec ticks)
metadata:
  type: project
---

## M8.95d — doc-keeper + verifier closes M8.95 knowledge-bundle milestone

**Status:** TERMINAL — PR #105 open, `just ci` EXIT=0, remote CI running.

**Branch:** `feat/m8.95d-doc-keeper`. Worktree: `.claude/worktrees/m8.95d`.

**M8.95 milestone: ALL SLICES MERGED** — 8.95a (PR #102) + 8.95b (PR #103) + 8.95c (PR #104) + 8.95d (PR #105).

### What shipped

- **`docs/adr/0080-generated-knowledge-bundle.md`** (NEW): project-side implementation ADR, mirror of harness corpus ADR-0057. Records A+F1+G1 decisions: generate from `parseTableSchemas()` SSOT; commit+drift-check; `knowledge-bundle-conformance` eval with proof-of-teeth. Lists all 4 M8.95 slices with PR refs.
- **`ARCHITECTURE.md`**: three targeted additions:
  1. `§ Mechanical gates`: "Knowledge-bundle drift (M8.95, ADR-0080): committed `docs/knowledge/` == fresh `okf-export.mjs --check`; a stale or malformed concept fails CI."
  2. New `§ Agent knowledge bundle (M8.95 — ADR-0080)`: concept-type table (22 tables/25 reducers/1 overview/1 index), producer SSOT note, privacy posture surfaced, vendored linter, research library conformance, `just knowledge`/`knowledge-check` recipes.
  3. `§ Decisions`: range updated `0035–0079→0080` + "0080 generated knowledge bundle (OKF-conformant `docs/knowledge/` bundle, drift-gated, M8.95)" added to highlights.
- **`CHANGELOG.md`**: regenerated via `just changelog`; picks up M8.95a/b/c feat entries (PRs #102–#104).
- **Spec §5 ticks**: `specs/monster-realm-v2/M8.95-knowledge-bundle.spec.md` — 8.95a/b ticked (PR #102/#103); 8.95d ticked (PR #105). (8.95c was already ticked.)

### ADR-0080 key decisions

- **Source**: generator reuses `parseTableSchemas()` from `evals/battle-schema-snapshot.eval.mjs` (SSOT, not a second parser)
- **Freshness**: committed bundle + drift gate (mirroring `bindings-drift` pattern, ADR-0009/0050)
- **Conformance**: `knowledge-bundle-conformance.eval.mjs` with proof-of-teeth (ADR-0010)

### ADR next-free

**0081** (0080 consumed by this slice)

### Next milestones

M10.5 (five residual slices still owed). M8.95 fully closed.
