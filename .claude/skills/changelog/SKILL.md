---
name: changelog
description: Generate or update a changelog from Conventional Commits. Use at release time or when summarizing changes. Never hand-maintain a changelog.
---
The changelog is generated from Conventional Commits (`~/.claude/harness/standards/git.md`).
Group by type since the last tag: Features (feat), Fixes (fix), Performance
(perf), then others; call out BREAKING CHANGE prominently and bump SemVer
accordingly. Prefer a tool (e.g. git-cliff / conventional-changelog) wired in CI;
only assemble manually if no tool is configured.

## Gotchas

_Living log — edge cases, bugs, quirks. Per entry: **symptom/quirk** → cause → **avoid:** action. Append new ones as you hit them._

- **Changelog misses commits / runs against the wrong history** → `projects/` are independent git repos (gitignored from the harness root); running `git cliff` at the harness root won't see a project's commits. **Avoid:** run the changelog from the project repo root.
- **Commits silently absent from the changelog** → non-Conventional messages aren't grouped by type. **Avoid:** enforce Conventional Commits (commit lint) so every change is categorized.
