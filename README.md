# Claude_Projects — Agentic Coding Workspace

A harness for building high-quality, AI-assisted, open-source projects.
The root is a git repo; each project under `projects/` is its **own** repo.

## Map
- **`AGENTS.md`** — rules agents follow (source of truth). **`CLAUDE.md`** points to it.
- **`WORKSPACE-PLAN.md`** — full design + rationale. **`SETUP.md`** — one-time host setup.
- **`standards/`** — engineering standards (single source of truth).
- **`docs/`** — workflow loops, context hygiene, model/effort routing.
- **`.claude/`** — the `coding-harness` plugin: 8 subagents, 13 commands, skills, hooks.
- **`templates/`** — `_base` + 7 stack templates (all working).
- **`scripts/`** — generator, template-drift sync, workspace review, and their tests.
- **`memory/`** — durable index, decisions log, per-project memory cards.
- **`specs/`** — workspace-level specs (`EXAMPLE-url-shortener.md` shows the flow).
- **`projects/`** — your projects (git-ignored here; each is its own repo).

## Harness commands (run at the root with `just`)
- `just new <name> <stack>` — scaffold a project (`/new-project` does the same).
- `just stacks` — list available stacks.
- `just sync [name] [--apply]` — report/propagate shared-config improvements to projects.
- `just review` — run the workspace drift review.
- `just test` — run the harness's own test suite.

## Stacks
`rust-lib` · `python-service` · `node-ts-app` · `react-web` · `electron-desktop`
· `pixijs-game` · `spacetimedb-game`

## Daily
A scheduled review runs each morning (usage-gated) and reports drift/improvements.
Nothing auto-edits project code.
