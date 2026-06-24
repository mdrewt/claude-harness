---
name: changelog
description: Generate or update a changelog from Conventional Commits. Use at release time or when summarizing changes. Never hand-maintain a changelog.
---
The changelog is generated from Conventional Commits (`standards/git.md`).
Group by type since the last tag: Features (feat), Fixes (fix), Performance
(perf), then others; call out BREAKING CHANGE prominently and bump SemVer
accordingly. Prefer a tool (e.g. git-cliff / conventional-changelog) wired in CI;
only assemble manually if no tool is configured.
