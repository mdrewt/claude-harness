# CLAUDE.md

This is a thin pointer. The source of truth for how agents work in this
workspace is **[AGENTS.md](./AGENTS.md)** (portable, cross-tool). This
workspace is designed to act as a multi-repo agentic harness for AI
agents working on the harness's sub-projects.

- **Rules & commands:** see `AGENTS.md`.
- **Engineering standards (SSOT):** see `standards/`.
- **Workflows, routing, context hygiene:** see `docs/`.
- **The full design rationale:** see `WORKSPACE-PLAN.md`.
- **The sub-projects contained withing this harness:** see `projects/` (due to the multi-repo setup the `projects/` folder is in the harness's `.gitignore` file and each sub-project has its own git repository nested within that folder),

Read the nearest `AGENTS.md` in the directory tree — each project under
`projects/` ships its own and overrides this one.
