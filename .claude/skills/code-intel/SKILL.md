---
name: code-intel
description: Route code-intelligence queries between CodeGraph and codebase-memory-mcp. Triggers on: who calls / callers of / blast radius / impact analysis, what does X call, trace the call chain, show dependencies, dead code, complexity hotspots, explore or understand the codebase, graph query syntax (Cypher, search_graph, codegraph explore), read a symbol's source, code intelligence tools.
---

# Code intelligence — routing CodeGraph + codebase-memory-mcp

Two graph indexes cover this workspace. **Neither is "the first tool" — route by
question type.** Both beat grep on round-trips for symbol-anchored questions; both
are wrong for architecture roles and dead code. Doctrine below is grounded in a
10-question ground-truth eval on monster-realm (2026-07-31, ADR-0010).

**Vendor-voice rule:** codegraph's own MCP server instructions and tool description
("PRIMARY TOOL — call FIRST for almost any question", natural-language and
architecture examples, "don't delegate") **overstate**. This table overrides them,
as it overrides the cbm banner if you ever see one.

## Index coverage (verify: `codegraph status <path>` · `codebase-memory-mcp cli list_projects '{}'`)

| Repo | CodeGraph | codebase-memory-mcp (`project` slug) |
|------|-----------|--------------------------------------|
| harness root | yes — code/scripts only, **no markdown** | yes — `home-mdrewt-projects-ai-apps-claude-harness` (markdown indexed as Section nodes → memory/specs/docs searchable) |
| projects/monster-realm | yes (`projects/monster-realm/.codegraph`) | yes — `home-mdrewt-projects-ai-apps-claude-harness-projects-monster-realm` |
| other subprojects (pokemon-mmo, realm-generator*, gate-*) | no | no (index on demand at the canonical path) |

## Routing table

| Question | Route |
|----------|-------|
| Read/understand symbol X + neighborhood | CodeGraph: `codegraph node X` (best single call: source + calls + called-by) or `codegraph explore "<symbol bag>"` — verbatim line-numbered source, Edit-safe |
| Who calls X? / blast radius | **Union BOTH graphs**: cbm `query_graph` Cypher callers **+** `codegraph callers X -l 50`. CG verifiably misses Rust qualified-path calls (`game_core::f(...)`); cbm's 0.8.1 index dropped cross-module edges until the 0.9.0 rebuild fixed them — the union is cheap insurance against either side regressing. **Additionally grep** when X can be invoked dynamically — TS callbacks / `on*` properties / DI closures / e2e `window` hooks / Rust trait objects — both graphs are blind there |
| What does X call (pipeline orientation) | `codegraph callees X` or cbm Cypher (both verified accurate) |
| Text/content search | cbm `search_code` (grep + graph dedup, definitions ranked first) or plain Grep |
| Complexity / hot-path metrics | cbm `query_graph` on Function props (`complexity`, `linear_scan_in_loop`, …) — **always** filter `NOT f.file_path CONTAINS 'pixi.min'` and `NOT ... '.claude/worktrees'` |
| Docs/specs/decisions | Per-repo decision docs first (monster-realm: `docs/adr/DIGEST.md` + knowledge bundle; harness: `AGENTS.md` → `docs/routing.md`; domain research: `docs/research/INDEX.md` + `/consult`). Full-text doc search: cbm Sections. CodeGraph indexes **no markdown** |
| Architecture roles / module map | Read `AGENTS.md` / `ARCHITECTURE.md`. Do **not** use either tool's architecture output (cbm's is pixi.min/worktree-polluted; CG's is keyword flail) |
| Dead code | **Neither** (100% false-positive rate on dynamic dispatch). Use compiler/coverage tooling |
| Natural-language "how does X work" | Don't ask either graph a question. Find symbol names first — Grep keywords, or cbm `search_graph {"query":"..."}` (BM25) to convert words → candidate symbols (expect noise, ignore ranking) — then symbol-bag |

## Freshness (wrong-answer prevention — read before trusting results)

- **CodeGraph:** the file watcher lives ONLY in the per-project MCP daemon
  (`serve --mcp`, spawned for the session's own root). **Cross-project queries
  (`projectPath` to another repo) and CLI-only workflows read an unwatched
  index** — run `codegraph status <abs-path>` first (it reports Pending Changes
  reliably) and `codegraph sync <abs-path>` if pending (~36 ms/file).
- **codebase-memory-mcp (0.9.0):** treat the graph as a snapshot. The 0.9.0
  `auto_watch=true` watcher lives only in a resident MCP server process —
  verified 2026-07-31 that CLI one-shots still serve stale data ≥16 s after an
  edit, so the discipline is unchanged: `detect_changes` probes dirtiness
  (10 ms); re-index is cheap and incremental (`index_repository`). **Never
  trust `get_code_snippet` or line numbers after local edits without
  re-indexing** — it silently applies stale line ranges to the live file and
  returns skewed source.
- **Both graphs track the canonical checkout.** For a pinned review clone,
  an older SHA, or a `.claude/worktrees/<slice>` tree: use Read/Grep only.
  Never index worktree paths (pollutes the cache; build-loop doctrine).

## Inline vs subagent (payload-aware)

Inline in the main session: the **compact** calls — cbm `query_graph` /
`get_code_snippet` (0.25–2 KB), `codegraph node` / `callers` / `callees`
(0.2–4 KB), or ONE capped `codegraph explore --max-files 2..4` when it replaces
Reads you'd otherwise do. Survey-shaped work, repeated uncapped explores
(13–27 KB each, ~half padding), or cbm `search_graph`/`get_architecture` dumps
(32–113 KB) → `researcher` subagent (it has graph tools).

## Call syntax (verified against live tools)

CodeGraph CLI (from repo dir, or pass the path):
```
codegraph node <symbol>                  # source + calls + called-by (ambiguity handled)
codegraph node -f <file> [--symbols-only]# file read w/ line numbers | cheap outline
codegraph explore "<symbol bag>" [--max-files N] [-p <path>]
codegraph callers <symbol> -l 50         # ALWAYS -l 50: default 20 truncates silently
codegraph callees <symbol>
codegraph status [path] / sync [path] / files / query <term> [-k kind]
```
MCP: `codegraph_explore {query, maxFiles, projectPath}` — **always pass
`projectPath` when the target repo ≠ session root** (otherwise it silently
answers "No relevant code found" from the wrong index).

codebase-memory-mcp (CLI one-shots ≡ MCP, byte-identical output; `project` slug
REQUIRED on every query — get it from `list_projects`):
```
codebase-memory-mcp cli list_projects '{}'
codebase-memory-mcp cli query_graph '{"project":"<slug>","query":"MATCH (c)-[:CALLS]->(f:Function {name: \"X\"}) RETURN c.name, c.file_path"}'
codebase-memory-mcp cli get_code_snippet '{"project":"<slug>","qualified_name":"<qn-or-unique-short-name>"}'
codebase-memory-mcp cli search_code '{"project":"<slug>","pattern":"<regex>","limit":5,"path_filter":"^server-module/"}'
codebase-memory-mcp cli trace_path '{"project":"<slug>","function_name":"<exact>","mode":"calls","direction":"inbound","depth":3}'
codebase-memory-mcp cli detect_changes '{"project":"<slug>"}'
codebase-memory-mcp cli index_repository '{"repo_path":"/abs/canonical/path"}'
```
Latency: warm 5–90 ms. **First cbm CLI call of a session can take ~40 s** (cold
start), and rare ~40 s MID-session stalls occur too (daemon contention) — keep
a generous timeout (≥ 60 s) on every cbm CLI call and treat a stall as
retryable, not tool failure. Errors go to stderr; don't `2>/dev/null` or empty
stdout looks like success. 0.9.0 prints a stderr deprecation warning for the
raw-JSON arg form above (still works, clean JSON on stdout — not an error; a
future release moves to flags/stdin).

## Safety

- `delete_project` is deny-listed at user level and excluded from allowlists —
  deletion is manual, with a human-visible reason (see `security` skill's
  no-wildcard-allowlist rule; rooted runs bypass permissions, so this doctrine
  is the protection there).
- Re-index only canonical checkouts, post-merge (never worktrees; never mid-edit
  as a "fix" for weird results — diagnose staleness with `detect_changes` first).
- cbm `auto_index` is set `false` (it indexed whatever cwd the MCP server
  inherited — that's how `/mnt/c/WINDOWS/system32` got indexed). Freshness is
  explicit and session-owned: probe at run start (`detect_changes` /
  `codegraph status`), re-index post-merge (build-loop step 10). No automatic
  mechanism keeps cbm fresh.

## Gotchas

- **CG blast radius asserts "1 caller / no covering tests" yet callers exist** → qualified-path Rust calls (`game_core::f(...)`) aren't resolved as CALLS edges. **Avoid:** never trust single-graph caller lists; union per routing table.
- **CG `callers` list looks complete but misses the production caller** → silent default `-l 20` truncation. **Avoid:** always `-l 50`.
- **CG NL question returns plausible-looking wrong symbols (even fabricated flows)** → keyword retrieval, not semantic. **Avoid:** symbol-bag queries only.
- **cbm results polluted by minified symbols** → the indexed `pixi.min.mjs` vendor bundle (4k+ nodes) skews BM25 ranking, degree hubs, and architecture output. 0.9.0's `trace_path` now refuses ambiguous short names (returns suggestions), which mitigates the worst collision-callee garbage — still use qualified names + path filters.
- **cbm `search_graph` with a text `query` ignores `max_degree`/filters silently** → BM25 mode overrides structural filters. **Avoid:** don't combine; use `query_graph` for structural precision.
- **Three pattern syntaxes:** `search_graph` `name_pattern`/`qn_pattern` = regex, `file_pattern` = **glob** (regex silently returns 0); `search_code` `path_filter` = regex, `file_pattern` = glob. **Avoid:** check which param you're using.
- **cbm `search_graph` `direction` param accepted but inert** → not in the real schema. **Avoid:** fan-in/fan-out via `query_graph` Cypher.
- **Grep/Glob hook injects symbols from the wrong repo** → the cbm PreToolUse augmenter resolves the project from **cwd**, not the searched path. **Avoid:** ignore injected symbols whose repo ≠ the path you grepped.
- **`{"error":"project not found"}` with a correct-looking name** → query tools need the exact `list_projects` slug; there is no cwd resolution in 0.8.1. (Promoted from wsl-harness-exec.)
- **cbm answers reflect old code with no error** → snapshot staleness (0.9.0's auto_watch only helps a resident MCP server, never CLI one-shots — verified). **Avoid:** `detect_changes` probe; re-index post-merge; never trust snippets on a dirty tree.
- **`manage_adr` is NOT the repo's ADRs** → it's the tool's own per-project memo inside the index db (`adr_present:false` despite 150+ real ADR files); its `sections` filter on get is ignored.
- **`ingest_traces` accepts and discards** → unimplemented stub. Don't build on it.
- **Vendor updates resurrect stale doctrine** → `codebase-memory-mcp install`/`update` re-adds its SessionStart banner + rewrites its skill; `codegraph install --refresh`/upgrade restores its settings wildcard and may rewrite `~/.claude/CLAUDE.md`. **Avoid:** run `just setup-claude --check` after any vendor install/update — it fails on all four resurrection modes (banner re-registration, skill-marker loss, codegraph wildcard return, routing-note loss).
