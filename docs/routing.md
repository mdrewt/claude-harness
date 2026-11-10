# Model, effort & orchestration routing

Two independent dials — *which model* and *how much effort/orchestration*.

> **Basis (measured on this harness, 60 build runs):** build runs are about 95% of spend and
> the supervisor's decision ticks about 5%. Inside a run, subagents on Sonnet are about 15% of
> its cost: tester 50% of subagent tokens, reviewer 20%, red-team 17%, verifier 5%, everything
> else under 3% each. Sonnet to Opus multiplies a role's cost by 1.67, Opus to Fable by 1.5.

## Model
| Tier   | Use for |
|--------|---------|
| Sonnet | high-volume subagent work: tests from criteria, adversarial probing, research |
| Opus   | implementation, review, verification verdicts, loop decisions, planning, judging |
| Fable  | hard-tier implementation; netcode and security audits |

Rule: raise a role's tier when its tokens are few and its output gates what merges or what gets
built next (reviewer, verifier, the supervisor tick, the security and desync auditors). Keep the
cheaper tier where volume is high and another role checks the output (tester, red-team). Each
agent's tier is its `model:` line in `.claude/agents/`; the supervisor tick's is `SUP_MODEL` in
`mr-native-tick.sh`. Human-in-the-loop work can drop a tier. Switch mid-session with `/model`.

## Effort (`/effort`)
- Persistent levels: low / medium / high / max. Session-only: `ultracode`.
- Since the 4.6 generation, thinking is **adaptive** — `ultrathink` is legacy;
  prefer `/effort`.
- Policy: default low/medium; **high** for features/reviews; **max / ultracode**
  for architecture, multi-file refactors, gnarly debugging, security.

## Orchestration
- **`ultracode`** — max effort + dynamic multi-step workflow with auto subagents.
  Complex tasks only; token-heavy.
- **`ultraplan`** — offloads planning to a cloud session; keeps local context lean.
- **`/deep-research`** — custom command delegating to the `researcher` subagent
  in isolation; returns a summary only.

### Intra-task parallelism (within one slice)
Fan out the **independent, read-only** analyses concurrently (up to N = 2–3,
depth = 1): the plan/test/impl **review lenses** (`reviewer` + `red-team`), the
**domain auditors**, and `researcher` lookups. Keep the **ordered gates serial** —
tests precede implementation, merges are sequential and verifier-gated, and no two
specialists touch the same files. Triage complexity first, then route (an
autonomous loop bumps one tier): solo/light for a simple slice, full multi-agent
+ `ultracode` for a gnarly/security one.

## Token-efficiency
Escalation buys quality by spending more tokens — be selective. Efficiency comes
from: effort routing, subagent isolation, model routing, cloud offload, and
compaction. Caveat: availability of `ultracode`/`ultraplan` is version-gated —
confirm in your Claude Code build.

## Code discovery (cost-aware)
Two graph indexes (CodeGraph + codebase-memory-mcp) cover the harness root and
`projects/monster-realm`. **Route by question type — the `code-intel` skill is
the SSOT** (routing table, verified syntax, freshness rules, gotchas).
Cost rule: compact graph calls (query_graph, node, callers) run inline —
cheaper than spawning; survey-shaped exploration → `researcher` subagent
(it has the graph tools).

## Documentation lookups (cost-aware)
Library docs are a major token + quota cost. Discipline:
- **Prefer no-quota sources first** — a repo's `llms.txt`, official vendor skills,
  or a repo-serving doc MCP. Reserve **metered** services (e.g. Context7's limited
  free tier, ~1k req/month) for libraries that are BOTH version-sensitive AND lack
  usable `llms.txt`/repo docs.
- **Route by ownership** — one source per library; never double-query the same
  lookup (it burns quota *and* doubles the payload).
- **Load doc MCP tools lazily** (Tool Search), not at session start — a connected
  server costs context every session just by existing.
- **Fetch narrowly** — ask for the specific symbol/topic ("scheduled reducer
  syntax"), never "the whole docs for X". Payload size dominates the cost.
- **Verify version-sensitive identifiers** against current docs rather than
  trusting recalled tokens; prefer official vendor **skills** over model memory
  for fast-moving APIs.
