set windows-shell := ["cmd.exe", "/c"]
# Harness self-management (dogfoods the standard the projects follow).

test:
    node --test scripts/tests/harness.test.mjs scripts/tests/invariants.test.mjs

# Full harness gate (dogfoods what projects do): lint its own scripts, then test.
ci: lint test

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
