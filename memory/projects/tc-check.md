# tc-check

- **Stack:** node-ts-app (TypeScript)
- **Status:** active — toolchain verification project
- **Path:** `projects/tc-check/`
- **Repo:** independent git repo (per root `.gitignore`); `master` is the default/protected branch.
- **Purpose:** Exercises the `node-ts-app` toolchain end to end — lint, typecheck, test + coverage, eval, security scan, and mutation testing.

## Toolchain
Inherited from the `node-ts-app` / `_base` templates (these are template defaults, not
project-specific technology choices, so no per-project ADR is required):
Biome (lint/format), Vitest + v8 coverage, Stryker (mutation), git-cliff (changelog),
lefthook (git hooks), Renovate (digest-pinned GitHub Actions).

## Pointers
- AGENTS: `projects/tc-check/AGENTS.md`
- Specs: `projects/tc-check/docs/specs/` · ADRs: `projects/tc-check/docs/adr/`
- CI: `projects/tc-check/.github/workflows/ci.yml` · Evals: `projects/tc-check/evals/`
