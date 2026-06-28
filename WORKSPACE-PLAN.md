# Agentic Coding Workspace — Plan

**Owner:** Drew · **Status:** v2.2 — built (v0.1 harness in place) · **Last updated:** 2026-06-23

> **Implementation status (v0.1):** Harness, `coding-harness` plugin (8 subagents,
> 13 commands, 4 skills, guard hook), full `standards/` + `docs/`, all **7 stack
> templates** (rust-lib, python-service, node-ts-app, react-web, electron-desktop,
> pixijs-game, spacetimedb-game), the `new-project` generator, a `sync-templates`
> drift tool, a worked example spec, and a passing harness test suite (`just test`,
> 6/6) are all built and verified in-sandbox. Principles are now tiered (Tier 1 /
> Tier 2 / inverted) with a mechanical-enforcement map and a `/simplify` DoD pass;
> doc lookups follow cost-aware routing. Remaining (host-only): `git init` + push,
> and installing host programs — see `SETUP.md`.

This document is the single source of truth for how this workspace is set up and why.
It is itself version-controlled (see §2) so every change to the plan is diffable.

---

## 0. Goals & constraints

- Houses **all** AI-assisted coding projects; each project is its own independent git repo.
- All projects are **open source and non-commercial**.
- Wide tech range: Rust, Python, Node, TypeScript, React, SpacetimeDB, Postgres, Kafka, PixiJS, Electron, Redis. Not every project uses every technology.
- Project types: web apps, microservices, desktop apps, finance/investment apps, single- and multiplayer online games, Arduino robotics, realtime chat, portfolio projects, open-source libraries.
- **Quality bar:** best practices, no anti-patterns/code smells, good architecture — but *appropriateness is judged per project*. Knowing which rules to apply matters as much as applying them.
- **Top priorities:** testability, robustness, correctness, reasonability — via TDD, CI/CD, principle of least surprise, single source of truth, proper design patterns, documentation, and contracts.
- **Automation-first:** anything that must be maintained by hand will go stale. Prefer generated and tool-enforced artifacts over manual upkeep.

### Design decisions locked for this plan
1. **Repo layout:** separate git repo per project. Projects stay fully independent.
2. **Agent target:** Claude Code primary, kept portable via `AGENTS.md`.
3. **Review cadence:** daily ~07:00, only if session usage is below 50%.
4. **SDD front end:** GitHub Spec Kit (Spec → Plan → Tasks → Implement).
5. **Harness is its own git repo** (workspace root), with `projects/` git-ignored.
6. **Default CI security stack:** gitleaks + Semgrep + Trivy/Syft (SBOM) + Renovate.
7. **ADR format:** MADR. **Commits:** Conventional Commits + SemVer.
8. **Packaging:** bespoke agents/skills/commands ship as a personal **`coding-harness` plugin** (versioned, portable, one-click install).
9. **Toolchain:** the **full recommended DX/software suite** (§18) is standardized into `_base` templates.

---

## 1. Mental model

Three layers, each with a clear job:

- **Harness** (this workspace root): durable, shared, slow-changing. Standards, templates, skills, subagents, memory index. Version-controlled.
- **Project** (`projects/<name>/`): an independent repo with its own `AGENTS.md`, specs, ADRs, tests, CI, and devcontainer.
- **Session**: the live agent run. Kept lean on purpose — pulls only what it needs from the harness and project, isolates research/exploration into subagents, and compacts often.

The guiding principle against context rot: **filter information before it reaches the model**, don't dump everything into always-on context.

---

## 2. Directory structure

The workspace root is a git repo. `projects/` is git-ignored so each project remains its own independent repo with no coupling to the harness history.

```
Claude_Projects/                  ← git repo (the "harness"); projects/ git-ignored
├── AGENTS.md                     ← SOURCE OF TRUTH for agent rules (portable, command-first)
├── CLAUDE.md                     ← thin: points to AGENTS.md + standards/
├── README.md                     ← human-facing index
├── WORKSPACE-PLAN.md             ← this file
├── .gitignore                    ← ignores projects/, secrets, build artifacts
├── .claude/
│   ├── settings.json             ← shared permissions (allow/deny lists), hook wiring
│   ├── agents/                   ← subagents: planner, researcher, tester, reviewer, verifier,
│   │                               doc-keeper, judge, red-team
│   ├── commands/                 ← /new-project, /spec, /plan, /loop, /review, /simplify, /adr, /audit,
│   │                               /deep-research, /ultraplan (wrapper),
│   │                               /brainstorm, /debate, /compete, /redteam
│   ├── skills/                   ← changelog, context-hygiene, security, spec-kit (scaffolding=/new-project; ADRs=doc-keeper)
│   └── hooks/                    ← Claude Code event hooks (PreToolUse / Stop gates)
├── standards/                    ← SINGLE SOURCE OF TRUTH for engineering standards
│   ├── principles.md             ← SOLID-where-appropriate, least surprise, SSOT, YAGNI
│   ├── spec-driven.md            ← how we use Spec Kit + EARS acceptance criteria
│   ├── testing-tdd.md            ← red/green/refactor, test ownership, property-based testing
│   ├── evals.md                  ← the living eval harness; what to gate on
│   ├── ci-cd.md                  ← pipeline stages, required checks, branch protection
│   ├── contracts.md              ← per-language contract idioms (types, zod, pydantic/icontract)
│   ├── security.md               ← secrets, SAST/SCA, SBOM, prompt-injection, finance rules
│   ├── observability.md          ← structured logging, tracing, metrics (Datadog-ready)
│   ├── adr-process.md            ← MADR format, when an ADR is required
│   ├── git.md                    ← Conventional Commits, SemVer, branch/worktree conventions
│   ├── language/                 ← rust.md, python.md, node-ts.md, react.md
│   └── domain/                   ← web-app.md, microservice.md, desktop.md, game.md,
│                                   finance.md, arduino.md, realtime-chat.md, library.md
├── templates/
│   ├── _base/                    ← shared: .editorconfig, .gitignore, LICENSE, PR template,
│   │                               CI workflow, devcontainer, ADR dir, AGENTS.md template,
│   │                               Renovate config, lefthook (git hooks), eval scaffold
│   └── <stack>/                  ← rust-lib, python-service, node-ts-app, react-web,
│                                   electron-desktop, pixijs-game, spacetimedb-game, ...
├── scripts/                      ← new-project, sync-templates (drift), workspace-review + tests/ (Node)
├── memory/
│   ├── index.md                  ← map of all projects + pointers (small, always-current)
│   ├── decisions-log.md          ← cross-project decisions
│   └── projects/<name>.md        ← per-project memory cards
├── docs/
│   ├── workflow-loops.md         ← the loops, operationalized (see §7)
│   ├── context-hygiene.md        ← preventing context rot
│   └── routing.md                ← model + effort + orchestration routing (see §8)
├── specs/                        ← workspace-level Spec Kit specs when a project is greenfield
└── projects/                     ← each subfolder is its own independent git repo (git-ignored here)
```

> **Two distinct "hook" systems — don't confuse them.** `.claude/hooks/` are **Claude Code event hooks** (fire on agent events like `PreToolUse`/`Stop`, e.g. to block edits to protected paths). **Git hooks** (pre-commit format/lint/secrets) are a separate, per-project mechanism managed by **lefthook** from `templates/_base/`. Both are used; they operate at different layers.

> **Backup:** push the harness repo to a private remote so your standards, templates, and decision history are recoverable.

---

## 3. Context management (anti context-rot)

Context rot is the progressive degradation of output quality as the window fills with accumulated noise. Controls:

- **AGENTS.md is thin and command-first.** Exact commands, explicit "done" criteria, pointers to `standards/` — not the full text of every rule. `CLAUDE.md` just points here. Agents read the nearest file in the tree, so each project ships its own `AGENTS.md` and overrides cleanly.
- **Rules as on-demand skills.** Anything that matters only sometimes (release checklist, ADR writing) is a skill, not always-on context.
- **Subagents isolate context.** Research, exploration, and large-output work run in their own context windows and return only clean summaries. This is the single biggest lever against rot.
- **Memory index is small and authoritative.** Agents read `memory/index.md` (a map) and pull only the relevant project card — never the whole memory store.
- **Compaction discipline.** Compact at task boundaries; start a fresh context per task rather than letting one session sprawl (long-horizon drift is a known failure mode).
- **Upgrade path:** if the markdown memory store outgrows itself, swap in a graph/managed memory backend (Mem0 / Cognee / Supermemory MCP) without changing the index contract. Deferred until justified.
- **Knowledge contract.** Durable agent-readable knowledge (research libraries, generated schema bundles) follows `standards/knowledge-format.md` (ADR-0008) — an OKF-aligned, generated-from-source, drift-gated markdown convention. It is the portable *index contract* a future memory backend (above) would consume unchanged.

---

## 4. Spec-driven development (SDD)

Spec is the primary artifact; code is a regenerable output. This is the main defense against "plausible code that drifts from intent."

- **Tooling:** GitHub Spec Kit, which supports Claude Code natively. Flow: **Spec → Plan → Tasks → Implement**.
- **Acceptance criteria** use EARS notation: `WHEN <condition> THE SYSTEM SHALL <behavior>` — clear, testable, and a natural source for test cases.
- **Where it lives:** `specs/` at workspace level for greenfield bootstrapping; `docs/specs/` inside each project thereafter.
- **Tie-in:** the spec feeds the `/loop` (§7); tasks become small vertical slices; acceptance criteria become eval/test cases.

---

## 5. Auto-recorded design decisions & docs (built for forgetfulness)

Everything here is generated or tool-prompted so nothing depends on remembering to update it.

- **ADRs (MADR).** Each project has `docs/adr/`. The `/adr` command (via the `doc-keeper` subagent) detects an architectural decision made in conversation and writes the ADR automatically. An ADR is **required** before adding a new dependency or design pattern (this doubles as an over-engineering guardrail).
- **Changelog.** Generated from Conventional Commits — never hand-maintained.
- **API docs.** Generated from types/contracts per language (rustdoc, TypeDoc, Sphinx/pdoc).
- **Decisions log + memory cards.** `memory/decisions-log.md` and `memory/projects/<name>.md` updated by the `doc-keeper` subagent at task close.
- **Drift detection.** The daily review (§9) flags decisions discussed but not recorded, and standards that have diverged from code.

---

## 6. Testability, robustness, correctness

- **TDD.** Red → green → refactor. **Test ownership is split:** the implementer subagent does not write or edit the tests that gate its own work in the same loop — the `tester`/`verifier` roles do. Prevents tests-fitted-to-bugs and reward hacking.
- **Living eval harness** (`evals/` per project). Beyond unit tests, a small suite asserting that changes preserve the boundaries that matter (architecture invariants, contract conformance), not merely that code compiles. This is the gate that makes higher autonomy safe — you can only safely automate a loop you can evaluate.
- **Mutation testing** so "tests pass" is meaningful (e.g., `cargo-mutants`, `mutmut`, StrykerJS).
- **Property-based testing** for logic-heavy code (proptest, Hypothesis, fast-check).
- **Determinism** for games/realtime: seedable RNG, injectable clocks, deterministic simulation in tests, flaky-test quarantine instead of silent re-runs.
- **Contracts** at boundaries: Rust's type system + `assert!`/`debug_assert!`; TS `zod` at IO edges; Python `pydantic` + `icontract` for pre/postconditions. Documented in `standards/contracts.md`.
- **CI/CD** (GitHub Actions) with required checks and branch protection — green CI must mean something (coverage + mutation thresholds, not just build).

---

## 7. Workflow loops (the methodologies, operationalized)

Documented in `docs/workflow-loops.md`; invoked via `/loop`.

- **Loops, not prompts.** A fixed structure runs each cycle with an **evaluable success metric** (tests + evals + lint clean). Per Karpathy: a loop you cannot evaluate cannot be safely automated — hence the eval harness is a prerequisite, not an add-on.
- **PRERRR:** Plan → Refine → Execute → Review → Refactor → Repeat, with explicit **review gates** between Execute and Refactor (the `reviewer`/`verifier` subagents).
- **Spec-first entry:** the loop starts from a Spec Kit task, not a freeform prompt.
- **Parallelism via git worktrees.** Claude Code's native worktree isolation (`isolation: worktree` in subagent frontmatter) lets specialist agents work without colliding. Roles: **coordinator** (decomposes), **specialist** (implements in an isolated worktree), **verifier** (gates merge). Merges are sequential.

### Subagents

| Subagent | Job | Default model | Isolation |
|----------|-----|---------------|-----------|
| planner | architecture, task decomposition from spec | Opus | — |
| researcher | exploration/codebase Q&A; protects main context | Sonnet | worktree/none |
| tester | writes tests from acceptance criteria (TDD) | Sonnet | worktree |
| reviewer | code review: correctness, security, smells, over-engineering | Sonnet | — |
| verifier | runs tests/evals/security gates; approves merge | Sonnet | worktree |
| doc-keeper | ADRs, changelog, memory cards | Haiku | — |
| judge / synthesizer | scores competing outputs, picks or merges the best | Opus | — |
| red-team | adversarial: attacks code for bugs / security / edge cases | Sonnet | worktree |

### Multi-agent patterns (dynamic, cost-governed)

The coordinator picks a collaboration pattern **per task**, based on value, risk, and whether a cheap evaluator exists — escalating beyond a single agent only when the cost-to-benefit ratio justifies it. `ultracode` is the engine that spawns these dynamically; this policy is the governor that keeps it honest. Commands `/brainstorm`, `/debate`, `/compete`, `/redteam` invoke a pattern explicitly when you already know which you want.

**Pattern library** (rough token multipliers):

| Pattern | What happens | ~Cost | Use when |
|---|---|---|---|
| Solo (default) | one agent | 1× | routine, reversible, low-stakes |
| Generator–Critic | produce → self-critique → revise | ~1.5–2× | any non-trivial code; cheap quality bump |
| Proposer–Verifier | implementer + independent test/eval gate | ~2× | correctness-critical (the standard `/loop`) |
| Brainstorm (divergent→convergent) | N agents propose different *approaches*; synthesizer converges | ~2–3× | architecture/design forks → feeds ADR "alternatives" |
| Debate | agents argue opposing options; judge arbitrates | ~2.5× | decisions with real tradeoffs, no objective metric |
| Best-of-N / tournament | N independent solutions; objective judge picks/merges | ~N×+ | high-value, well-specified, **objectively scorable** tasks |
| Red-team / adversarial | blue builds, red attacks (security, edge cases, fuzz) | ~2× | security-sensitive (finance!), parsers, untrusted input, protocols |

**Selection policy (the dynamic decision rule):**

- Objective evaluator exists *and* task is high-value → **Best-of-N**.
- Design fork with tradeoffs, no metric → **Brainstorm** or **Debate**; record the result as an ADR (competing options become the "Considered alternatives" — free design documentation).
- Robustness/security is the dominant risk → **Red-team**.
- Non-trivial but routine → **Solo + Generator-Critic**.
- Low-value / reversible / cheap-to-redo → **Solo**, never escalate.
- Rule of thumb: escalate only when **(high value OR high risk OR hard to reverse) AND (a cheap evaluator or clear decision criteria exist)**.

**Cost governance (non-negotiable guardrails):**

- **Budget caps / circuit breakers per run.** Multi-agent can reach ~15× tokens; a misbehaving subagent (recursive spawning, oversized tool output) can compound that by another ~10×.
- **No recursive spawning** — subagents cannot spawn subagents (orchestration depth = 1). The coordinator owns all fan-out.
- **Cap N at 2–3**; bound tool-result sizes.
- **Cheap competitors, strong judge** — run candidates on Sonnet (or diverse temperatures), judge/synthesize on Opus, keeping the N× affordable.
- **Adaptive stopping** — end debate/iteration on consensus or stability, not a fixed round count.
- **Bad-fit rule** — don't use multi-agent where agents must share mutable context or are tightly interdependent; it underperforms a single agent there. Multi-agent shines on *parallel, independent* exploration (the worktree isolation in §7 is what makes it safe).

---

## 8. Model, effort & orchestration routing

`docs/routing.md`. Two independent dials — *which model* and *how much effort/orchestration* — are the biggest quality-vs-cost levers. Correct model routing alone saves ~60–80% vs. all-Opus.

### Model
- **Haiku:** test scaffolding, docs, changelog, lint-level review.
- **Sonnet:** feature implementation, bug fixes, standard refactors, code review (most volume).
- **Opus:** architecture, multi-file refactors, complex debugging, unfamiliar code.
- **Heuristics:** human-in-the-loop downgrades one tier; an autonomous loop upgrades one tier; hard latency needs force Haiku.

### Effort & thinking
- Claude Code exposes a persistent `/effort` setting (low / medium / high / max) plus a session-only `ultracode` level. On 4.6-class models, thinking is **adaptive** — the model scales reasoning depth to the task — so the old `ultrathink` keyword is **legacy**; prefer `/effort` as the canonical dial.
- **Policy:** default **low/medium**; **high** for feature work and reviews; **max / ultracode** reserved for architecture, multi-file refactors, gnarly debugging, and security review.

### Orchestration
- **`ultracode`** (`/effort ultracode`, or the keyword in a single prompt) sends max effort *and* has Claude plan a **dynamic multi-step workflow, spinning up subagents automatically**. For genuinely complex tasks only; session-only and token-heavy by design.
- **`ultraplan`** (`/ultraplan <prompt>`) offloads planning to a **cloud** Claude Code session in plan mode while the local session keeps working; review/revise in the browser, then execute anywhere. Heavy planning happens off the local context — a token-efficiency win for big greenfield work. (Research preview; version-gated.)
- **`/deep-research`** is **not** a confirmed built-in — implemented here as a custom command that delegates to the `researcher` subagent in an isolated context and returns only a summary. Same benefit, portable, token-efficient (exploration never touches the main window).

### Token-efficiency model — "quality AND efficiency"
Max effort / `ultracode` / `ultrathink` raise quality by spending *more* tokens; they are not themselves efficient. Efficiency comes from spending them **selectively** plus isolation:
1. **Effort routing** — cheap by default; escalate only at high-leverage gates (planning, architecture, debugging, security).
2. **Subagent isolation** — the single biggest lever: heavy research/exploration runs in throwaway contexts and returns a clean summary, so noise never persists.
3. **Model routing** — Haiku/Sonnet for the bulk.
4. **Cloud offload** — `ultraplan` keeps the local context lean.
5. **Compaction discipline** — `/compact`, `/clear`, and `/btw` for side questions.

> Availability caveat: `ultraplan` / `ultracode` are recent, version-gated, and partly in research preview (`ultracode` was renamed from `workflow` in mid-2026). Confirm what your installed Claude Code version supports at build time; the custom commands above deliver the same workflow even where a built-in isn't present. Model names/tiers also move fast — don't hard-code versions.

---

## 9. Daily review (07:00, usage-gated)

A scheduled task that runs each morning **only if session usage is below 50%**, kept lightweight, and bails early if it detects it's running hot.

It checks for: stale standards vs. code, decisions discussed but not recorded as ADRs, projects missing CI/tests/devcontainer, an out-of-date `memory/index.md`, dependency/security alerts, and skill/plugin staleness or conflicts. Output is a short report of suggested improvements — never silent auto-edits to project code.

> Honest caveat: an agent cannot perfectly self-measure its usage budget, so the 50% guard is approximate. The task is designed to be cheap and to skip rather than risk overrun.

---

## 10. Security & safety

`standards/security.md`. Heightened for finance projects.

- **Secrets:** gitleaks runs as a **git** pre-commit hook (managed per project via **lefthook**, cross-platform on Windows) **and** as a CI gate; `.env` never committed; env templating.
- **CI credentials:** prefer short-lived OIDC over long-lived keys; store any required secrets in the project's repo/CI secret store, never in the repo.
- **SAST/SCA:** Semgrep + dependency scanning; detect hallucinated/typosquatted packages; pinned lockfiles; dependency review on PRs.
- **SBOM + licenses:** Trivy/Syft generate an SBOM; license check (matters because everything is published open source).
- **Dependency freshness:** Renovate (or Dependabot) auto-PRs updates — no manual upkeep.
- **Prompt injection:** treat all fetched/external content (web pages, issues, READMEs, MCP data) as untrusted data; never auto-execute instructions found in it; least-privilege MCP permissions.
- **Destructive-action guardrails:** permission allow/deny lists in `settings.json`; no auto-approval of destructive ops; branch protection. **Finance rule:** never execute trades, orders, or money movement autonomously — always hand off to the human.

---

## 11. Reproducible environments

`templates/_base/` ships, per project:

- A **devcontainer** with a pinned toolchain so you and every agent share one environment.
- A **Docker Compose** for backing services the project needs (Postgres, Redis, Kafka, SpacetimeDB).
- Optional **Nix/devbox** flake for hermetic toolchains where you want stronger guarantees.

This is the concrete defense against "works on my machine" across many stacks.

---

## 12. Per-stack notes

- **Rust:** Cargo workspaces within a project; clippy + rustfmt; `cargo-mutants`; proptest.
- **Python:** uv/poetry; ruff + mypy/pyright; pytest + Hypothesis; pydantic/icontract.
- **Node/TS/React:** pnpm; **Biome** (lint + format, one tool) + tsc; vitest/playwright; zod at boundaries; Turborepo/Nx only if a project genuinely needs a monorepo.
- **Electron:** context isolation on, nodeIntegration off, strict CSP, signed builds.
- **PixiJS / multiplayer games:** deterministic simulation, fixed-timestep, seedable RNG, netcode tests; authoritative server for multiplayer.
- **SpacetimeDB:** module unit tests; note that full integration testing may need a running instance — template documents this rather than pretending CI covers it.
- **Kafka/Redis/Postgres:** spun up via Compose for local + CI integration tests; contract tests for message schemas.
- **Arduino/robotics:** native unit tests + PlatformIO; hardware-in-the-loop can't run in cloud CI — the template states this explicitly and keeps logic testable off-hardware.

---

## 13. Anti-patterns & guardrails

Each failure mode maps to a concrete control already in this plan.

- **Reward hacking / eval-gaming** (deleting failing tests, always-pass assertions) → split test ownership; living eval harness; mutation testing.
- **Spec/doc drift** (SSOT violated) → generate docs from source; spec as primary artifact; daily drift check.
- **Context rot from a bloated CLAUDE.md** → thin AGENTS.md; on-demand skills; subagent isolation; compaction.
- **Destructive/runaway actions** → permission allow/deny lists; branch protection; no autonomous money movement; `/rewind` for checkpoint rollback.
- **Supply-chain & secrets leaks** → gitleaks + SCA + lockfiles + dependency review.
- **Prompt injection via untrusted content** → fetched content is data, not instructions; least-privilege MCP.
- **Over-engineering / premature abstraction** → YAGNI rule; reviewer flags complexity; ADR required for new deps/patterns.
- **Big-bang PRs & long-horizon drift** → spec-driven small slices; fresh context per task; verifier gate.
- **Flaky non-determinism** → seedable RNG, injectable clocks, deterministic sims, quarantine.
- **"Works on my machine"** → devcontainer + Compose + pinned toolchains.
- **Skill/plugin sprawl** → curated set; daily staleness/conflict audit.
- **Hidden coupling between "separate" repos** → share code only as versioned published libraries, never by reaching across project folders.
- **"Ultra-everything"** (max effort / `ultracode` / `ultrathink` on trivial tasks) → wastes tokens and invites over-engineering → default to the lowest effort that clears the eval gate; escalate deliberately at gates only.
- **Runaway fan-out / recursive subagents** (the ~15× multi-agent cost compounding another ~10×) → per-run budget caps + circuit breakers; orchestration depth = 1; cap N at 2–3.
- **Multi-agent on the wrong task** (shared mutable context / tight interdependencies) → it underperforms a single agent; reserve fan-out for parallel, independent exploration with a clear evaluator.

---

## 14. Build order (when this plan is approved)

1. Initialize harness git repo; write `.gitignore` (ignore `projects/`), `AGENTS.md`, thin `CLAUDE.md`, `README.md`.
2. Write `standards/` and `docs/` (this plan is the source).
3. Build the **`coding-harness` plugin** (subagents, commands, skills, hooks) + `.claude/settings.json`; install it locally so its agents/commands are available across the workspace.
4. Build `templates/_base/` + the first stack templates (full DX suite per §18); build the `new-project` generator.
5. Wire MCPs: **Context7** (connected); local **Postgres** per-project via `.mcp.json`; confirm engineering-plugin connectors (GitHub, Datadog, etc.).
6. Register the daily review scheduled task (07:00, usage-gated).
7. **Verification:** generate a throwaway project from a template, run its lint/test/eval/security CI locally in the sandbox end-to-end, confirm the ADR/changelog/memory automation fires, then delete it.
8. Push the harness repo to a private remote (backup).

---

## 15. Open items to confirm at build time

- Package managers per language (uv vs poetry; pnpm vs npm) — defaults above, override if preferred.
- Whether to adopt Nix/devbox now or keep devcontainers-only initially.
- Memory backend: start markdown, decide later on graph/managed upgrade.
- Confirm the current Claude model lineup for routing defaults.
- **Default license:** MIT in `_base` (simplest for portfolio/libraries); switch a project to Apache-2.0 when a patent grant matters. *(Defaulted — no action needed.)*
- **Code of conduct / CONTRIBUTING / issue & PR templates** in `_base` since everything is public.
- **Confirm Claude Code version** supports `/effort`, `ultracode`, and `ultraplan`; otherwise rely on the custom `/deep-research` and `/ultraplan` wrapper commands.

---

## 16. Prerequisites (on your Windows machine)

- **Git** + a GitHub account (separate repo + CI per project).
- **Docker Desktop** — required for devcontainers and the Compose service stacks (Postgres/Redis/Kafka/SpacetimeDB).
- **Node.js** (runs the cross-platform generator/maintenance scripts) and **Claude Code**.
- **Specify CLI** (GitHub Spec Kit) for the SDD flow.
- Per-stack toolchains installed inside devcontainers, so the host stays clean.

---

## 17. Day-to-day quickstart

A new project:

1. `/new-project <name> <stack>` → generator scaffolds the repo from a template (devcontainer, CI, lefthook, ADR dir, eval scaffold, `AGENTS.md`), inits git, adds it under `projects/`.
2. `/spec` → write the spec with Spec Kit (Spec → Plan → Tasks). Acceptance criteria in EARS notation.
3. Open the devcontainer so you and agents share one environment.

A new feature (the loop):

1. `/loop <task>` starts from a Spec Kit task (not a freeform prompt).
2. `planner` decomposes; `tester` writes failing tests from acceptance criteria; specialist implements in an isolated worktree; `verifier` runs tests + evals + security gates; `reviewer` checks correctness/smells/over-engineering.
3. On a design decision, `/adr` records it automatically; changelog and memory cards update at task close.
4. Merge only when CI is green **and meaningful** (coverage + mutation thresholds, security clean).

**Escalate effort deliberately, not by default:** routine work stays at low/medium effort; use `/effort high` for features; reach for `ultracode` or `/ultraplan` only for architecture-level or multi-file tasks; use `/deep-research` to explore an unfamiliar area without bloating your main context.

**Bring in multiple agents when the stakes justify it (§7):** `/brainstorm` or `/debate` at a hard design fork (the options auto-fill the ADR), `/compete` for a high-value task with an objective scorer, `/redteam` before shipping anything security-sensitive. The coordinator will also select these automatically under `ultracode` — the cost guardrails keep it from running away.

Each morning the daily review reports drift and suggestions — you skim it, nothing auto-edits your code.

---

## 18. Tooling, MCPs & capability inventory

The plan's growth (multi-agent patterns, SDD, security gates, worktrees) justifies expanding capabilities in three buckets. **Create** = bespoke, built with the harness. **Install (MCP)** = connectors. **Install (software)** = the local DX layer.

### Create (bespoke — no off-the-shelf equivalent)
The subagents (planner, researcher, tester, reviewer, verifier, doc-keeper, judge, red-team) and the skills/commands (`new-project`, `adr-writer`, `changelog`, `context-hygiene`, `security`, Spec Kit wrapper, `/loop`, `/brainstorm`, `/debate`, `/compete`, `/redteam`, `/deep-research`, `/ultraplan`) are specific to this workflow. **Bundle them into a personal `coding-harness` plugin** so they're version-controlled and one-click installable on any machine — directly serving portability and the daily-review improvement loop. The plugin lives in the harness repo and is installed locally; updating it updates every project's available agents and commands at once.

### Install — MCPs
- **Context7** *(recommended now)* — up-to-date library/API docs on demand; cuts hallucinated/outdated APIs across Rust/Python/TS/React/etc. High value, low cost.
- **Local Postgres MCP** *(per project)* — schema-aware queries during DB work, configured in the project's `.mcp.json`. Preferred over a cloud connector since projects are local. (Supabase / PlanetScale connectors exist if you adopt hosted Postgres.)
- **Memory MCP** — *deferred* (per §3): start markdown, revisit a Mem0/Supermemory-class server later.
- **Already available via your engineering plugin:** GitHub, Datadog (observability), Notion, Linear, Slack, Atlassian, PagerDuty, Asana — plus **Postman** (API/contract testing for microservices).

### Install — software (DX layer)
- **Spec Kit** (Specify CLI) — SDD front end.
- **Security:** gitleaks, Semgrep, Trivy/Syft — wired into CI + lefthook.
- 