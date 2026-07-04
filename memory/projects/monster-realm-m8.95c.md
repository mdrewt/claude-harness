---
name: monster-realm-m8.95c
description: M8.95c research-library conformance — type field + type-aware vendored scripts; PR #104
metadata:
  type: project
---

M8.95c COMPLETE (PR #104 open, local just ci EXIT=0, remote CI running).

## What shipped

- `docs/research/monster-taming-mechanics.md`: `type: Research Note` frontmatter
- `docs/research/top-down-2d-art.md`: `type: Research Note`; fixed `[[wikilink]]` → markdown link
- `.claude/hooks/research-lint.mjs` (NEW): validates required fields including `type: Research Note`; `confidence` enum (low/medium/high); YAML block-scalar abstract guard; no new RegExp(); exit 0/1/2
- `.claude/hooks/research-index.mjs`: `| type |` column added; strict `--check` equality (no .trim()); ellipsis on 120+ char abstract cells
- `docs/research/INDEX.md`: regenerated with type column + ellipsis

**Why:** M8.95 knowledge-format.md requires `type` on every research doc; research-lint.mjs enforces it.

## Known open items (M8.95d owns these)

- `research-lint.mjs` NOT wired into `just ci` (hook tool only in this slice)
- Parser divergence FINDING 2 (LOW): lint trims indented keys, index uses startsWith — theoretical edge case with well-formed docs
- ADR-0080 (milestone impl ADR) — M8.95d's job
- Spec §5 checkboxes for 8.95a/b/c — M8.95d tick

## How to apply

When M8.95d closes, verify research-lint.mjs wiring decision and ADR-0080 covers the lint design.
