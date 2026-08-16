# 13r-g — Docs/ledger freshness — PLAN (as launched)

**Branch:** `feat/13r-g-docs-ledger-freshness` · worktree `projects/monster-realm/.claude/worktrees/13r-g` off `origin/master@7eb6980`
**ADR:** 0196 (supervisor-assigned; filename must be 4-digit `0196-*.md` — `scripts/adr-digest.mjs:233` filters `/^[0-9]{4}.*\.md$/`)
**touches:** `CHANGELOG.md`, `.github/workflows/nightly.yml`, `scripts/`, `m13.5r-plan.md`, `docs/`
**OUT of scope (hidden-dependency STOP):** `justfile`, `evals/**`, `ARCHITECTURE.md`(*), `docs/adr/README.md`

## Deliverables
1. `just changelog` regen + commit (pure append: 34 entries, PRs #290–#326, 0 removals).
2. ADR-0165's nightly changelog-freshness check — `scripts/changelog-freshness.mjs` (pure comparator + thin shell), self-testing teeth on every invocation, wired as a 5th `nightly.yml` job.
3. `git mv m13.5r-plan.md docs/specs/m13.5r-plan.md` (siblings m13.5b/m13.5c already there; zero inbound refs).

## Key design decisions
- **Entry-set comparison, not full-text diff.** Full-text equality is red-by-construction the first night after any merge (the per-PR-nag mode ADR-0165 rejected). Entry-set = the only shape in which "lag ≤ one open milestone" is expressible. `filter_unconventional` handled structurally: the generated side is the sole authority, so skipped commits enter neither set.
- **`missing` (behind) is tolerance-bounded; `extra` (committed-but-not-generated) is a hard red** — history here is append-only (squash-merge, force-push hook-blocked), so `extra > 0` can only mean cliff-version/template/config drift or a shallow clone.
- **MILESTONE_LAG_TOLERANCE** — empirically derived (see below), ratchet-down-only, no CLI/env override.
- Teeth: inline fixture suite runs BEFORE the real check on every invocation (exit 3 if a tooth fails to bite) + sibling `scripts/changelog-freshness.test.mjs` (`node --test`).
- Honest gate gap: `just ci` cannot run this (evals/ + justfile out of touches) — only the nightly job does. Follow-ups flagged, not built.

## Empirical basis for the tolerance (measured on master, 2026-08-15)
1 merged commit ≈ 1 changelog entry. Reconciliation-to-reconciliation drift observed: **20** (11r-d→12r-f), **34** (12r-f→HEAD, = the 18-PR drift this slice fixes). ADR-0165's own trigger: **~30**. Single-milestone sizes: fourteenth-review 8, thirteenth-review 8, M20/M21 wave ~13.

## Status
See `monster-realm-13r-g-progress.md` for DONE/REMAINING/NEXT.
