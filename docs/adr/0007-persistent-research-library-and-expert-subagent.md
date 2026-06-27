# 0007. Persistent research library + expert-consultation subagent
- Status: accepted
- Date: 2026-06-26

## Context and problem statement
`/deep-research` (the `researcher` subagent) is ephemeral by design — its summary is
consumed once and discarded. There was no durable, reusable domain-knowledge layer
(genre mechanics, art direction, netcode patterns) and no consumer that views a task
through an informed lens of that knowledge. We want one agent type to research a domain
and persist it, and another to consult the relevant persisted research before advising —
without re-polluting the main context (`docs/context-hygiene.md`).

## Considered alternatives
- **Per-domain expert wrappers (`gameplay-expert`, `art-expert`, …)** — rejected: an
  index the single `expert` self-routes over removes the need; avoids agent sprawl and
  audit-dead duplicates.
- **A separate `research-writer` agent** — rejected: the existing `researcher` gains a
  persist mode instead, so we don't maintain two near-identical agents.
- **Protocol as a `standards/` doc only** — rejected: a skill can be *preloaded* into
  both agents via the `skills:` frontmatter, giving one deterministically-shared
  contract (DRY).
- **Hand-maintained index / model-instructed index updates** — rejected: violates "generate
  docs from source" and drifts. A generator + write-hook makes sync automatic.

## Decision outcome
- **Chosen:** a per-project research library at `<project>/docs/research/` with a
  GENERATED `INDEX.md`; one new read-only `expert` subagent that self-routes over the
  index (≤3 docs); one shared `research-protocol` skill preloaded into both `researcher`
  (persist mode) and `expert`; a zero-dep `research-index.mjs` generator invoked
  automatically by the `format-edited` PostToolUse hook (with `--check` as a CI backstop);
  and two thin commands (`/research-domain`, `/consult`). All ships via the
  `coding-harness` plugin, so every sub-project gets it at once.
- **Consequences:**
  - *Positive:* informed-decision quality without context rot; one generic expert serves
    all domains; index can't silently drift (hook + `--check`); minimal net surface
    (1 agent, 1 skill, 1 generator, 2 commands, ~8 lines into an existing hook).
  - *Negative / follow-ups:* genre research duplicates across separate game repos
    (acceptable for now); new pieces must earn invocations or `just audit` will flag them;
    propagate the hook/generator to the remaining projects via `just sync`; optionally add
    a persisted generator unit test to `scripts/tests/`.
