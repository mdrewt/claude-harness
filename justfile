set windows-shell := ["cmd.exe", "/c"]
# Harness self-management (dogfoods the standard the projects follow).

test:
    node --test scripts/tests/harness.test.mjs scripts/tests/invariants.test.mjs

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
    @node -e "for(const d of require('node:fs').readdirSync('templates',{withFileTypes:true}))if(d.isDirectory()&&d.name!=='_base')console.log(d.name)"
