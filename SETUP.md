# One-time host setup (Windows)

The harness, plugin, standards, templates, and generator are already in this
folder (115 files). Two things remain that can only run on your own machine:
initialize git, and install the host programs.

> Why not done already: the build sandbox mounts this folder read-mostly — it
> blocks the file deletes/renames that `git` and `npm install` need. Both work
> normally on your Windows filesystem.

## Step 0 — initialize the harness repo
```powershell
cd $HOME\Desktop\Claude_Projects
git init
git add -A
git commit -m "chore: scaffold agentic coding harness (v0.1) per WORKSPACE-PLAN.md"
git remote add origin <your private repo>   # backup of standards/decisions
git push -u origin main
```
(`projects/` is git-ignored, so each project stays its own independent repo.)

## Step 1 — install host programs (setup.ps1)
```powershell
# Core
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Docker.DockerDesktop -e
winget install --id GitHub.cli -e
winget install --id Casey.Just -e            # task runner
winget install --id jdx.mise -e              # toolchain pinning

# Security / quality CLIs
winget install --id Gitleaks.Gitleaks -e
npm  install -g @stryker-mutator/core        # JS/TS mutation testing
pipx install semgrep                         # SAST
winget install --id AquaSecurity.Trivy -e    # SBOM / SCA

# Spec Kit (spec-driven development)
pipx install specify-cli                      # or: uv tool install specify-cli

# Per-language (install as needed)
#  Rust:   winget install Rustlang.Rustup ; cargo install cargo-mutants
#  Python: winget install astral-sh.uv
```

## Step 2 — confirm it works
1. In Claude Code, confirm the `coding-harness` plugin loads (agents + commands).
2. Context7 MCP is connected (up-to-date library docs).
3. `node scripts/new-project.mjs hello node-ts-app` then `cd projects/hello` and
   `just ci` (or `npm run ci`).

## Notes
- `just ci` = lint, typecheck, test, eval, security. CI adds gitleaks + Semgrep
  + SBOM via GitHub Actions (each project's `.github/workflows/ci.yml`).
- All 7 stacks are built: `rust-lib`, `python-service`, `node-ts-app`,
  `react-web`, `electron-desktop`, `pixijs-game`, `spacetimedb-game`. Each ships
  a sample module, tests, a stack-appropriate eval, and `just` recipes.
- Keep projects current with shared config via `just sync` (reports drift;
  `just sync --apply` updates managed files without touching your source).
- Verify the harness itself anytime with `just test`.
- `projects/smoke-test/` is a throwaway example from verification — safe to delete.
