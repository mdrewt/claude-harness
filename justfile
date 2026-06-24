set windows-shell := ["cmd.exe", "/c"]
# Harness self-management (dogfoods the standard the projects follow).

test:
    node --test scripts/tests/harness.test.mjs scripts/tests/invariants.test.mjs

# Full harness gate (dogfoods what projects do): lint its own scripts, then test.
ci: lint test

doctor:
    node scripts/doctor.mjs

lint:
    npx --yes @biomejs/biome check --config-path templates/_base scripts

format:
    npx --yes @biomejs/biome format --write --config-path templates/_base scripts

review:
    node scripts/workspace-review.mjs

sync *ARGS:
    node scripts/sync-templates.mjs {{ARGS}}

new name stack:
    node scripts/new-project.mjs {{name}} {{stack}}

stacks:
    @node scripts/stacks.mjs
