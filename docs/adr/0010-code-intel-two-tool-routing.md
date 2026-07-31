# 0010. Route code intelligence between CodeGraph and codebase-memory-mcp by question type
- Status: accepted
- Date: 2026-07-31

## Context and problem statement

Two code-intelligence tools are installed: **codebase-memory-mcp 0.8.1** (Go binary,
14 MCP tools ≡ `cli` one-shots, per-project SQLite in `~/.cache/codebase-memory-mcp/`)
and **CodeGraph 1.5.0** (`@colbymchenry/codegraph`, per-repo `.codegraph/` SQLite,
one MCP tool + a rich CLI). Each vendor's installer shipped an "always use me FIRST"
doctrine (cbm: a SessionStart banner + PreToolUse augmenter + skill; codegraph: a
fenced CLAUDE.md block + 4.6 KB of MCP server instructions), producing three
contradictory "first-resort" voices in every session, a stale vendor skill (3
materially false claims for 0.8.1), a harness-level permissions wildcard that
auto-approved `delete_project` against the harness's own security skill, and junk
indexes (`/mnt/c/WINDOWS/system32`, `/tmp` dirs) from cbm's auto-index-on-session-start.

A 7-agent research pass (hands-on deep-dives of both tools, a 10-question
ground-truth eval on monster-realm, a prior-integration audit, and a surface map),
followed by a 3-lens adversarial design review (27 findings), established:

- Both tools beat grep round-trips for **symbol-anchored** questions; both are
  sub-second warm (cbm first CLI call of a session can be ~40 s cold).
- **Complementary blind spots (the central fact):** CodeGraph does not resolve
  Rust qualified-path calls (`game_core::f(...)` → falsely reported "1 caller /
  no covering tests"); cbm dropped cross-module CALLS edges (taming.rs). Each
  found the caller the other missed; the union covered every observed miss.
  Both are blind to dynamic dispatch (7/7 "dead" client callbacks were live).
- **Freshness:** CodeGraph's watcher lives only in the per-project MCP daemon —
  cross-project (`projectPath`) and CLI-only queries read an unwatched index;
  cbm 0.8.1 has no watcher at all, and a stale index makes `get_code_snippet`
  silently return skewed source. (Upstream cbm 0.9.0 adds a watcher.)
- **Both fail** at natural-language questions, architecture roles (cbm's output
  additionally polluted by the indexed `pixi.min.mjs` vendor bundle and
  `.claude/worktrees` copies), and dead-code detection.
- SessionStart hook output reaches the **main session only**; `~/.claude/CLAUDE.md`
  reaches subagents too — so a banner cannot carry doctrine to exploring agents.
- Under `defaultMode: "auto"` (user level) uncovered tools are auto-approved, and
  supervisor-rooted runs use `--dangerously-skip-permissions` — enumerated
  allowlists alone are doctrine hygiene, not enforcement; only `deny` rules bite.

## Considered alternatives
- Option A — crown one tool "first" (either vendor's shipped doctrine).
- Option B — route by question type; union both graphs for blast radius; keep
  both MCP servers connected; retire the vendor banners/skill in favor of one
  harness-owned SSOT skill.
- Option C — disconnect both MCP servers, CLI-only (lazy-MCP purism).

## Decision outcome
- Chosen: **Option B**, because the eval showed neither tool dominates (each
  missed real callers the other found), CLI-only would strand the no-Bash
  subagents (researcher/planner/reviewer get read-only MCP grants — the
  load-bearing reason cbm stays connected) and kill CodeGraph's only watcher,
  and a single harness-owned SSOT ends the three-voice contradiction.
- Doctrine (SSOT = `.claude/skills/code-intel/SKILL.md`): read a symbol →
  `codegraph node`/symbol-bag `explore`; **blast radius → union of both graphs
  + grep for dynamically-invocable symbols**; text search → cbm `search_code`
  or Grep; metrics → cbm Cypher with `pixi.min`/worktree filters; docs →
  per-repo decision docs then cbm Sections; architecture roles & dead code →
  neither tool. Vendor-injected "use me first" guidance (including codegraph's
  un-editable MCP server instructions) is explicitly subordinated in
  `AGENTS.md`, `~/.claude/CLAUDE.md`, and the skill.
- Mechanics: cbm SessionStart banner deregistered (no replacement banner — the
  CLAUDE.md note is the channel that reaches subagents); PreToolUse augmenter
  kept (8 ms, non-blocking; its cwd-based project resolution documented as a
  gotcha); vendor skill body replaced with a supersession stub; harness + user
  wildcards (`mcp__codebase-memory-mcp__*`, `mcp__codegraph__*`) replaced with
  enumerated read-only query + indexing tools (`index_repository` mutates the
  cache and stays allowlisted; `delete_project` does not);
  `mcp__codebase-memory-mcp__delete_project` added
  to user-level **deny** (the only scope with teeth under auto mode; rooted
  runs bypass permissions entirely — there, doctrine is the protection);
  `auto_index` set `false` (root cause of the junk indexes — it indexed the MCP
  server's inherited cwd; freshness is now explicit and session-owned: run-start
  `detect_changes`/`codegraph status` probes + the build loop's step-10
  post-green re-index — no supervisor seeding step exists); junk/ghost indexes deleted by root-path
  predicate (system32, /tmp, scratchpads, and the ghost pokemon-mmo entry
  rooted at its pre-move path); inert `~/.claude/.mcp.json` removed.
- Consequences: + one routing doctrine, verified syntax, measured failure modes;
  + exploring subagents (harness AND monster-realm copies — rooted runs shadow
  the harness ones) can finally execute the graph-first doctrine; − a future
  `codebase-memory-mcp install`/`update` (including the recommended 0.9.0
  upgrade) resurrects the banner/skill, and `codegraph install --refresh`/
  upgrade restores its settings wildcard and may rewrite `~/.claude/CLAUDE.md`
  — all four resurrection modes are caught by the `setup-claude --check`
  vendor-drift teeth (cbm banner re-registration, vendor-skill marker loss,
  codegraph wildcard return, routing-note loss/reorder); − cbm 0.8.1 staleness
  remains a standing wrong-answer hazard until the 0.9.0 upgrade (recommended
  follow-up, forces full re-index).

## Confirmation
`scripts/setup-claude.mjs --check` fails on vendor-doctrine resurrection
(`cbm-session-reminder` re-registered in `~/.claude/settings.json`; the vendor
skill losing its "superseded by the code-intel skill" marker; the
`mcp__codegraph__*` wildcard returning; the `~/.claude/CLAUDE.md` routing note
missing or displaced below the CODEGRAPH fence). Routing
doctrine itself: `unenforced — review-only` (lives in the `code-intel` skill;
adoption measurable via `just audit` skill-usage ranking).
