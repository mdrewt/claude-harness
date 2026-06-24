# Claude_Projects — an agentic coding harness

A personal **harness** for building high-quality, AI-assisted, open-source
projects. It is not a project itself — it's the shared scaffolding, standards,
and tooling that every new project starts from, plus a set of AI agents and
commands tuned to follow those standards.

The root folder is its own git repo. Every project you create lives under
`projects/` and is its **own independent git repo** (the harness git-ignores
`projects/`, so the two never entangle).

---

## Table of contents
- [What you get](#what-you-get)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [The command vocabulary](#the-command-vocabulary)
- [Available stacks](#available-stacks)
- [How it works](#how-it-works)
- [Everyday workflows](#everyday-workflows)
- [Maintaining the harness](#maintaining-the-harness)
- [Repository layout](#repository-layout)
- [Troubleshooting](#troubleshooting)
- [Where to read more](#where-to-read-more)

---

## What you get

- **A project generator.** One command scaffolds a new repo from a stack
  template: source + tests, a CI workflow, a devcontainer, a living eval
  harness, ADR folder, license, lint/format config, git hooks, and an
  `AGENTS.md` — all wired together.
- **Seven working stacks** (Rust, Python, Node/TS, React, Electron, PixiJS,
  SpacetimeDB), each with a real, runnable `just ci` gate.
- **One command vocabulary** across every stack — `just setup`, `just test`,
  `just ci`, etc. mean the same thing regardless of language (principle of least
  surprise).
- **Engineering standards as a single source of truth** (`standards/`) that the
  AI agents read and enforce.
- **A `coding-harness` plugin** (`.claude/`): purpose-built subagents and
  slash-commands for spec-driven development, reviews, multi-agent patterns, and
  automatic decision records.
- **Self-checks**: a guard-test suite (`just test`) that catches drift and
  silent regressions, plus a daily review that reports problems.

---

## Prerequisites

Install the host tools once. The fastest check is to ask the harness:

```
just doctor
```

It reports which tools are present and which are missing (with install hints).

| Tool | Required? | Used for |
|------|-----------|----------|
| **git** | required | version control |
| **node** (LTS) | required | the generator + scripts + Node stacks |
| **just** | required | the command runner (every stack's recipes) |
| **docker** | per-stack | devcontainers + Compose services (Postgres/Redis/Kafka) |
| **cargo / rustup** | per-stack | `rust-lib`, `spacetimedb-game` |
| **uv** | per-stack | `python-service` |
| **spacetime** | per-stack | `spacetimedb-game` |
| gitleaks, semgrep | optional | local secret/SAST scanning (CI runs them regardless) |

Windows install hints are in `SETUP.md`. After installing, run `just doctor`
again — it should report "required tools present".

---

## Quick start

```
# 1. Confirm your machine is ready
just doctor

# 2. Scaffold a new project (kebab-case name + a stack)
just new my-app node-ts-app
#   …or, inside Claude: /new-project my-app node-ts-app

# 3. Enter the project and install its dependencies
cd projects/my-app
just setup

# 4. Run the full local gate (lint, typecheck, test, eval, security)
just ci
```

`just stacks` lists every available stack name.

Then start building — ideally spec-first with the AI: `/spec` to write the spec,
`/loop <task>` to implement it slice by slice.

---

## The command vocabulary

Every generated project understands the same `just` recipes, no matter the
language. Run them from the project root.

| Command | What it does |
|---------|--------------|
| `just setup` | install dependencies / toolchain |
| `just lint` | lint **and** format-check (fails on either) |
| `just typecheck` | static type check |
| `just test` | run the test suite |
| `just eval` | run the project's living eval harness (architecture invariants, etc.) |
| `just security` | local secret scan (+ dependency audit where available) |
| `just ci` | the full local gate: lint → typecheck → test → eval → security |
| `just mutate` | mutation tests (verifies the tests are meaningful) |
| `just changelog` | regenerate `CHANGELOG.md` from Conventional Commits |
| `just format` | auto-fix formatting (the writing counterpart to `just lint`) |

A change is **done** when `just ci` passes. CI on GitHub Actions runs the same
gate plus gitleaks, Semgrep, and an SBOM.

---

## Available stacks

| Stack | For | Toolchain | Status |
|-------|-----|-----------|--------|
| `node-ts-app` | Node/TypeScript app or service | Node, Biome, Vitest | ✅ verified |
| `react-web` | React + Vite web app | Node, Biome, Vitest, Testing Library | ✅ verified |
| `electron-desktop` | secure-by-default desktop app | Node, Biome, Electron | ✅ verified |
| `pixijs-game` | 2D game (deterministic sim + Pixi render) | Node, Biome, Vitest | ✅ verified |
| `rust-lib` | Rust library | cargo, clippy, rustfmt, proptest | ✅ verified |
| `python-service` | Python service/library | uv, ruff, mypy, pytest, Hypothesis | ✅ verified |
| `spacetimedb-game` | multiplayer game on SpacetimeDB | cargo + spacetime CLI | ⚠️ skeleton |

"Verified" means a freshly generated project passes `just ci` out of the box.

**`spacetimedb-game` is a deliberate skeleton.** The pure game logic compiles
and is unit-tested, but the SpacetimeDB table/reducer macro syntax is
**version-specific**, so it ships as a clearly-marked reference sketch in
`server/src/lib.rs`. To use it: uncomment the sketch, re-add the `spacetimedb`
dependency in `server/Cargo.toml`, and align the macro syntax to *your* installed
SpacetimeDB version's docs. Full integration testing needs a running instance
(`spacetime start`).

---

## How it works

- **Standards are the source of truth.** `standards/` holds the engineering
  rules (testing, contracts, security, CI, principles, per-language and
  per-domain guidance). Agents read these instead of guessing. Change a rule in
  one place; nothing is duplicated.
- **Templates + a generator.** `templates/_base/` holds everything shared by all
  projects; `templates/<stack>/` adds the stack-specific bits. `just new` merges
  base + stack, substitutes `{{NAME}}`/`{{STACK}}`/etc., and `git init`s the new
  repo. `.gitignore` is *merged* (not overwritten) so shared ignores like `.env`
  always survive.
- **Single-sourced config.** Shared config (Biome, Renovate, lefthook, CI, the
  secret scanner, eval runner) lives once in `_base` and flows into every
  project. `just sync` propagates later improvements to projects already created.
- **Guard tests.** `scripts/tests/` encodes the harness's own invariants
  (no silent no-op gates, `.env` always ignored, config not duplicated, lint is a
  real linter, etc.). Run them with `just test`.
- **The AI layer.** `.claude/` is the `coding-harness` plugin: subagents
  (planner, tester, reviewer, verifier, red-team, judge, doc-keeper, researcher)
  and slash-commands. A `PreToolUse` hook and permission deny-list block
  destructive shell commands; each generated project carries a minimal copy of
  those guardrails.

---

## Everyday workflows

**Start a new project**
```
just new <name> <stack>     # scaffold + git init
cd projects/<name> && just setup
/spec                       # write the spec (Spec → Plan → Tasks)
```

**Build a feature (the loop)** — `/loop <task>` runs spec → failing tests →
implement in an isolated worktree → review + verify gates → refactor. The
implementer never grades its own tests. Merge only when `just ci` is green.

**Record a decision** — adding a dependency or a design pattern? `/adr` writes
the Architecture Decision Record automatically. Explore tradeoffs first with
`/brainstorm` or `/debate`; the options become the ADR's "considered alternatives".

**Escalate deliberately** — most work stays cheap; reach for `/compete` (best-of-N
on an objectively scorable task), `/redteam` (before shipping anything
security-sensitive), or `/ultraplan` (heavy planning) only when the stakes justify
the extra tokens. Use `/deep-research` to explore without bloating the main
session.

**Slash-command reference**: `/new-project` · `/spec` · `/loop` · `/review` ·
`/simplify` · `/adr` · `/audit` · `/deep-research` · `/brainstorm` · `/debate` ·
`/compete` · `/redteam` · `/ultraplan`.

---

## Maintaining the harness

| Command | When to use |
|---------|-------------|
| `just test` | after changing templates/scripts — confirms invariants still hold |
| `just lint` / `just format` | lint/format the harness's own scripts |
| `just sync` | report which projects have drifted from current `_base` config |
| `just sync --apply` | propagate `_base` config updates into existing projects (never touches your source) |
| `just review` | one-off drift report across the workspace |

A **daily scheduled review** also runs each morning (only when session usage is
low) and reports drift and suggestions — it never edits project code.

To back up the harness: add a private remote and push (`git remote add origin …`
then `git push -u origin main`). Projects are separate repos with their own
remotes.

---

## Repository layout

```
Claude_Projects/            ← the harness (its own git repo; projects/ is ignored)
├── README.md               ← you are here
├── AGENTS.md               ← rules the AI agents follow (source of truth)
├── CLAUDE.md               ← thin pointer to AGENTS.md
├── WORKSPACE-PLAN.md       ← full design + rationale
├── SETUP.md                ← one-time host-tool setup
├── justfile                ← harness commands (new, test, doctor, sync, review…)
├── .claude/                ← the coding-harness plugin (agents, commands, skills, hook)
├── standards/              ← engineering standards (SSOT): principles, testing,
│                             security, ci-cd, contracts, + language/ and domain/
├── docs/                   ← workflow loops, context hygiene, model/effort routing
├── templates/
│   ├── _base/              ← shared scaffolding every project inherits
│   └── <stack>/            ← the 7 stack templates
├── scripts/                ← new-project, sync-templates, workspace-review, doctor + tests/
├── memory/                 ← project index, cross-project decisions log, per-project cards
├── specs/                  ← workspace-level specs (see EXAMPLE-url-shortener.md)
└── projects/               ← your projects (git-ignored; each is its own repo)
```

---

## Troubleshooting

**`just doctor` says a required tool is missing.** Install it (the hint shows
how) and re-run. See `SETUP.md` for Windows install commands.

**`just: command not found`.** Install `just` (`winget install Casey.Just`). It's
required — it's how every stack's recipes run.

**`just` errors with "could not find the shell `sh`".** Your justfile is missing
the Windows shell setting. Every harness/template justfile already has
`set windows-shell := ["cmd.exe", "/c"]` at the top; add that line to any justfile
you write by hand. (Avoid relying on a POSIX shell on Windows — the `bash` on
`PATH` is usually WSL, which runs in a different filesystem.)

**First `cargo`/`uv` run is slow.** Normal — it downloads and compiles the
toolchain/deps once, then caches.

**`cargo audit` / `pip-audit` "not found" during `just security`.** Those SCA
tools are optional; the recipe degrades gracefully (prints a hint, doesn't fail).
Install them if you want local dependency auditing
(`cargo install cargo-audit`, `uv tool install pip-audit`).

**gitleaks / semgrep missing.** Optional locally — CI runs them. Install via
`winget install Gitleaks.Gitleaks` and `pipx install semgrep` for local scans.

**Biome prints "the recommended field has been deprecated".** Harmless
informational notice; linting still works. It only needs changing when Biome 3
ships.

**`npx` fails in PowerShell with "running scripts is disabled".** PowerShell's
execution policy blocks `npx.ps1`. Run the command through `cmd` instead, or
adjust your execution policy. Generated projects invoke tools via `cmd`, so their
`just` recipes are unaffected.

**git: "could not lock config file" / "not a git repository".** A `.git` folder
got into a broken state. Remove it and re-init: `Remove-Item .git -Recurse -Force`
(PowerShell) then `git init`.

**Lots of "LF will be replaced by CRLF" warnings.** Line-ending normalization.
`.gitattributes` pins everything to LF; if warnings persist, run
`git add --renormalize .` once.

**`just ci` lint fails on a brand-new project.** The templates are pre-formatted,
but if you hit a formatting nit, run `just format` to auto-fix, then re-run
`just ci`.

**A `just test` (harness) check fails.** That's the point — a guard test caught a
real regression (e.g., a stack shipped a placeholder recipe, `biome.json` drifted,
or a synced file went missing). Read the assertion message; it names the broken
invariant.

**Unknown stack.** Run `just stacks` to see valid names; the generator also lists
them when you pass one it doesn't recognize.

---

## Where to read more

- **`AGENTS.md`** — the rules the AI follows (start here to understand agent behavior).
- **`WORKSPACE-PLAN.md`** — the full design rationale and decision history.
- **`SETUP.md`** — one-time host setup.
- **`standards/`** — the engineering standards themselves.
- **`docs/`** — workflow loops, context hygiene, and model/effort routing.
