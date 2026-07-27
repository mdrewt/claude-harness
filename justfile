set windows-shell := ["cmd.exe", "/c"]
# Harness self-management (dogfoods the standard the projects follow).

test:
    node --test scripts/tests/harness.test.mjs scripts/tests/invariants.test.mjs scripts/tests/adr-lint.test.mjs

# Full harness gate (dogfoods what projects do): lint its own scripts, then test.
ci: lint test research-gate adr-gate

doctor:
    node scripts/doctor.mjs

lint:
    npx --yes @biomejs/biome@2 check --config-path templates/_base scripts

format:
    npx --yes @biomejs/biome@2 format --write --config-path templates/_base scripts

review:
    node scripts/workspace-review.mjs

sync *ARGS:
    node scripts/sync-templates.mjs {{ARGS}}

new name stack:
    node scripts/new-project.mjs {{name}} {{stack}}

stacks:
    @node scripts/stacks.mjs

# Heavy: scaffold every stack template and run its REAL gates (npm/cargo/uv
# install + `just ci`). Catches templates that generate but don't pass their own
# gates. For a scheduled/manual CI job, not the fast `just test` suite.
validate-templates *STACKS:
    node scripts/validate-templates.mjs {{STACKS}}

# Skill & sub-agent usage audit (read-only; parses ~/.claude transcripts and
# folds in the PostToolUse hook log). Defaults to last 7 days.
#   just audit            # last 7 days
#   just audit --all      # all retained history
#   just audit --days 30
audit *ARGS:
    node scripts/audit-usage.mjs {{ARGS}}

# Validate that every skill & sub-agent is correctly wired (harness + projects).
# Skills must be <name>/SKILL.md dirs; agents .claude/agents/<name>.md. Exits 1 on FAIL.
validate-wiring *ARGS:
    node scripts/validate-wiring.mjs {{ARGS}}

# Regenerate a project's docs/research/INDEX.md from doc frontmatter (SSOT). The
# format-edited write hook calls this automatically; use it for a manual refresh.
#   just research-index projects/monster-realm/docs/research
research-index DIR:
    node scripts/research-index.mjs {{DIR}}

# Verify a research index is in sync (exits 1 if stale) — CI backstop.
research-index-check DIR:
    node scripts/research-index.mjs {{DIR}} --check

# Lint research docs against the research-protocol authoring contract: frontmatter
# completeness + one-line abstract; with --shared, project-agnostic purity (no
# project/milestone/ADR leakage). WARNs are advisory; exits 1 only on FAIL.
#   just research-lint docs/research --shared
research-lint *ARGS:
    node scripts/research-lint.mjs {{ARGS}}

# Gate the harness shared research library: index in sync (+ no dup slugs) and the
# doc lint with project-agnostic purity. Part of `just ci`.
research-gate:
    node scripts/research-index.mjs docs/research --check
    node scripts/research-lint.mjs docs/research --shared

# Lint an ADR corpus (structure, status enum, supersede links, Confirmation teeth).
#   just adr-lint docs/adr                          # non-strict (missing Confirmation = WARN)
#   just adr-lint docs/adr --strict-confirmation    # accepted ADRs must name a real gate
adr-lint *ARGS:
    node scripts/adr-lint.mjs {{ARGS}}

# Gate the harness's own ADR corpus (strict — backfilled 2026-07-27). Part of `just ci`.
adr-gate:
    node scripts/adr-lint.mjs docs/adr --strict-confirmation

# Reproducible ~/.claude wiring: link the harness's shared skills + global agents
# (expert, review-lens) and a `harness` anchor into ~/.claude so they're discoverable
# in every session, with the harness repo as the single source of truth. Idempotent.
#   just setup-claude            # create/repair the links
#   just setup-claude --check    # verify only (exit 1 on drift)
#   just setup-claude --dry-run  # preview
setup-claude *ARGS:
    node scripts/setup-claude.mjs {{ARGS}}

# Prune stale backup clutter in memory/projects (*.bak.* older than 14 days).
# Lists candidates by default; deletes only with an explicit --delete.
#   just memory-prune            # list candidates
#   just memory-prune --delete   # remove them
memory-prune *ARGS:
    #!/usr/bin/env bash
    set -euo pipefail
    cd "{{justfile_directory()}}"
    found=$(find memory/projects -maxdepth 1 -name '*.bak.*' -type f -mtime +14 2>/dev/null || true)
    if [ -z "$found" ]; then echo "memory-prune: no *.bak.* files older than 14 days"; exit 0; fi
    if [ "{{ARGS}}" = "--delete" ]; then
        find memory/projects -maxdepth 1 -name '*.bak.*' -type f -mtime +14 -print -delete
    else
        echo "memory-prune candidates (rerun with --delete to remove):"
        echo "$found"
    fi
