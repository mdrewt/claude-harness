set windows-shell := ["cmd.exe", "/c"]
# Harness self-management (dogfoods the standard the projects follow).

test:
    node --test scripts/tests/harness.test.mjs scripts/tests/invariants.test.mjs

# Full harness gate (dogfoods what projects do): lint its own scripts, then test.
ci: lint test research-gate

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
