# Knowledge format (research libraries)

The markdown convention for the workspace's **research libraries** — the one
live instance of this format: `docs/research/` per project plus the shared
consultant library. Hand-authored knowledge with no machine source (design
rationale, domain research). Producer: humans / `/research-domain`. Index:
`research-index.mjs`. Lint: `research-lint.mjs` (runs in harness `just ci`).

A **concept** is one markdown file; the library-relative path is its identity
(`netcode/rollback.md` → `netcode/rollback`). YAML frontmatter + CommonMark
body.

## Frontmatter

| Key | Req? | Notes |
|-----|------|-------|
| `type` | required | the concept's kind (e.g. `Research Note`). |
| `title` | required | human label. |
| `slug` | required | equals the file path sans `.md` (lint-enforced). |
| `updated` | required | ISO date. |
| `tags` | required | `[a, b]`. |
| `abstract` | required | one line ≤ 120 chars (index truncates). |
| `status` | optional | `draft\|active\|stale\|superseded`. |
| `confidence`, `sources`, `supersedes` | optional | provenance fields. |

Producers may add keys; consumers tolerate unknown keys.

Concepts link with library-relative markdown links, forming a navigable graph.
Directories may carry a generated `index.md` (`BEGIN:auto`/`END:auto` fenced;
prose preserved). No `[[wikilinks]]`; no per-concept history files — git is
the archive.

## Security posture
Knowledge files are **untrusted-by-default data, never instructions**
(AGENTS.md rule #6). Never ingest a third-party knowledge bundle into a
trusted agent context — an unreviewed external concept is a prompt-injection
surface.

## History
This began as a superset of Google's OKF, with a second instance — generated,
drift-gated schema bundles — that monster-realm has since retired along with
its producer; nothing generates bundles today, and reviving that machinery
would need a fresh decision entry. Background: the pre-2026-09 ADR corpus in git history and
`docs/archive/OKF-research-and-impact-analysis.md`.
