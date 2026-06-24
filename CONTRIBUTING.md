# Contributing to the harness

This repo is the **harness** that scaffolds and governs individual projects (which
live under `projects/` as their own repos). Start with `README.md` for the big
picture and `WORKSPACE-PLAN.md` for the rationale.

## Before you commit
- `just doctor` — confirm host tools are present.
- `just ci` — runs the harness gate (lint its own scripts + the guard tests).
- Optional: `lefthook install` once, so `just lint`/`just test`/secret-scan run on
  every commit automatically.

## Conventions
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`…).
- **Standards are the single source of truth** — change a rule in `standards/`,
  never duplicate it elsewhere.
- Keep diffs focused; match the style of the file you're editing.

## Adding or changing a stack
1. Create `templates/<stack>/` with at least: a `justfile` (start it with
   `set windows-shell := ["cmd.exe", "/c"]` and override `setup`/`lint`/
   `typecheck`/`test`), sample source + tests, and a stack-appropriate `eval`.
2. Reuse shared config from `templates/_base/` (don't duplicate `biome.json`,
   CI, etc. — they're single-sourced and synced).
3. Run `just test` — the guard tests enforce the harness invariants (no silent
   no-op gates, `.env` always ignored, lint is a real linter, README documents
   every stack, …). Fix whatever they flag.
4. Generate a throwaway project and run its `just ci` to confirm it's green, then
   delete it.

## Changing shared config in `_base`
Run `just sync` to see which existing projects would drift, and
`just sync --apply` to propagate the change.
