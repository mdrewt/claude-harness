# Skill & agent usage auditing

Decide which skills and sub-agents earn their keep — and which are bloat or
scope creep — from real invocation data rather than guesswork.

Every Claude Code session writes a JSONL transcript under `~/.claude/projects/`.
Each `Skill` tool call records `input.skill`; each `Agent`/`Task` call records
`input.subagent_type`. Both are timestamped, so usage is fully auditable.

## Run the audit

```
just audit            # last 7 days
just audit --days 30
just audit --all      # all retained history
```

`just audit` runs `scripts/audit-usage.mjs` (read-only, zero deps). It ranks
agents and skills by invocation count and splits the laggards into two buckets:

- **Defined but never invoked** — a trim candidate. Either delete it, or its
  description never triggers.
- **Invoked but rare (1–2x)** — keep it, but sanity-check the trigger/description.

A zero count means *useless* **or** *never triggered*. Check the description
before deleting — a good skill with a bad trigger looks identical to dead weight.

Extra flags: `--since/--until YYYY-MM-DD`, `--by-project`, `--json` (machine
output), `--roots a,b,c` (where to scan for definitions, default `~/projects`),
`--config <dir>` (default `~/.claude`).

## Ongoing log (hook)

Claude Code prunes old transcripts, so history is short. A `PostToolUse` hook,
`~/.claude/hooks/usage-logger` (matcher `Skill|Agent|Task` in
`~/.claude/settings.json`), appends every invocation to `~/.claude/usage-log.csv`.
The audit script folds that CSV in automatically, so counts survive transcript
rotation. The hook never blocks and always exits 0.

## No double counting

The audit is **idempotent**: it is a stateless recompute that reads the sources
and prints counts. Running it ten times never changes a number — only the hook
ever increments anything (one CSV row per real invocation), and audits never
write.

Two real double-count risks are handled:

- **Same invocation in multiple transcripts.** A resumed/forked session replays
  earlier `tool_use` blocks into a new transcript file. The audit dedups by the
  block `id`, so each invocation counts once. (This was real: 212 raw agent
  lines collapsed to 181 distinct.)
- **Hook CSV overlapping transcripts.** Every new call lands in *both* the
  transcript and the CSV. The audit owns the overlap with transcripts and only
  folds in CSV rows older than the oldest surviving transcript — so the CSV
  purely backfills the pruned tail, never the region transcripts still cover.

Concurrent CSV appends are safe: each hook writes one short line, and on Linux a
single `write()` under 4 KB is atomic, so parallel sessions can't interleave a row.

## Workflow

Run weekly. Delete or fix anything in the never-invoked list, re-check rare
items' trigger descriptions, and keep the heavy hitters. This is the
context-hygiene principle (see `context-hygiene.md`) applied to the harness
itself: fewer, better-targeted skills and agents beat a sprawling registry.
