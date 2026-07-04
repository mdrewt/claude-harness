---
name: monster-realm-m8.95a
description: M8.95a OKF knowledge bundle producer — terminal state, findings, deferred items, next slice
metadata:
  type: project
---

## M8.95a — OKF knowledge bundle producer + generated docs/knowledge/

**Status:** TERMINAL — PR #102 open, `just ci` EXIT=0, remote CI running.

**Branch:** `feat/m8.95a-knowledge-bundle`, tip `9b7ffcc`. Worktree: `.claude/worktrees/m8.95a`.

### What shipped

- `scripts/okf-export.mjs` — producer; reuses `parseTableSchemas()` from `evals/battle-schema-snapshot.eval.mjs` (SSOT, no second schema parser)
- `docs/knowledge/` — 51 files: 22 table concepts, 25 reducer concepts, schema-overview.md, root index.md
- `.claude/hooks/okf-lint.mjs` — verbatim vendor of harness canonical (commit 1512f55)
- `just knowledge` / `just knowledge-check` justfile verbs
- Harness: `scripts/okf-lint.mjs` committed to harness main at 1512f55

### Privacy posture

6 private tables correctly tagged: `monster`, `encounter`, `battle_wild`, `player_dialogue_state`, `heal_cooldown`, `movement_tick_schedule`.

**Why:** ADR-0040/0044/0045. The fail-secure default is `visibility: 'private'` — a missing metadata entry must never silently promote a private table to public.

### Reviewer findings (all resolved)

- **B-1**: `startsWith('#[spacetimedb::reducer')` instead of exact match — captures `reducer(init)` + `reducer(client_disconnected)` → 23→25 reducers
- **M-1**: `p()` normalizer for all `generated.set()` keys (Windows path separator mismatch in drift check)
- **M-2**: Fallback visibility → `'private'` not `'public'` (fail-secure)
- **M-3**: `\n\n## Privacy` (blank line before heading; CommonMark requirement)
- **M-4**: `existsSync(EVAL_PATH)` guard before dynamic import with clear diagnostic
- **m-3**: `gitDate()` fallback → `'1970-01-01'` sentinel (deterministic, not `new Date()`)
- **m-4**: `basename(file, '.rs')` for module tag (biome `noUnusedVariables`)

### Deferred to M8.95b

- `evals/knowledge-bundle-conformance.eval.mjs` — conformance+drift eval with proof-of-teeth
- Unit tests for `parseFrontmatter`/`lintFile`
- m-1 minor: non-bundle URIs with port numbers (`http://host:8080`) — lint rule false positive
- m-5 minor: fenced-code-block false termination (triple-backtick inside code → broken link scan)

### Next slice: M8.95b

Build `evals/knowledge-bundle-conformance.eval.mjs` with:
1. Drift gate: `okf-export.mjs --check` must exit 0
2. OKF conformance: vendor `okf-lint.mjs` runs against the committed bundle
3. Proof-of-teeth: at least 1 bite per lint rule (injected violations in eval fixtures)
4. Wire into `just ci` via `evals/run.mjs` auto-discovery
5. Fix m-1/m-5 lint edge cases in okf-lint

**Why:** ADR-0050 drift gate pattern — producer + eval pair is the established M8 pattern.

**How to apply:** Start M8.95b off updated master after #102 merges. Worktree: `.claude/worktrees/m8.95b`.
