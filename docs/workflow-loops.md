# Workflow loops

The new skill is designing loops, not writing prompts. A loop runs a fixed
structure each cycle with an **evaluable success metric** — you can only safely
automate a loop you can evaluate, which is why a real, behavior-executing test
suite (`standards/testing-tdd.md`) is a prerequisite.

## PRERRR (the default build loop) — `/loop`
**Plan → Refine → Execute → Review → Refactor → Repeat**, entered from a Spec
Kit task (never a freeform prompt). Review gates sit between Execute and
Refactor.

1. **Plan** — `planner` decomposes the spec task into small vertical slices.
   Scope/impact discovery is graph-first in indexed repos (`code-intel` skill):
   affected callers come from the union of both graphs, not a grep sweep.
2. **Refine** — tighten acceptance criteria (EARS); `tester` derives failing tests.
3. **Execute** — `specialist` implements in an isolated git worktree to green,
   keeping an `implementation-notes.md` there: when an edge case forces a
   deviation from the plan, pick the conservative option, log it under a
   **Deviations** heading, and keep going.
4. **Review** — `reviewer` (correctness/smells/over-engineering) + `verifier`
   (the project's CI gate + security) gate the change; blast-radius checks use
   both code graphs (`code-intel` skill), never a single graph. Both read the
   slice's `implementation-notes.md`; a Deviation needs a test only when it
   touches a protected-category behavior, a decision entry only when it meets
   the bar — otherwise its log line accounts for it.
5. **Refactor** — improve with tests green.
6. **Repeat** — next slice; `doc-keeper` records a `docs/DECISIONS.md` entry
   only when the bar in `standards/decisions.md` is met, and updates memory
   only when something durable changed (the notes file itself is worktree
   scratch and never merges).

## Disposition markers (work items)
Spec closure (`standards/spec-driven.md`): every PARKED item ends
`parked → <queued spec id | wontfix>`, so carry-overs never go unsized.
Durable-knowledge routing is the doc-keeper's judgment call
(`.claude/agents/doc-keeper.md`), not an audited grammar.

## Parallelism
Specialists run in separate worktrees so they never collide; merges are
sequential and verifier-gated. Subagents never spawn subagents (depth = 1).

## Success metric per cycle
`just ci` green, **honestly** (`standards/testing-tdd.md`: nothing weakened or
quarantined to pass). If the metric can't be evaluated cheaply, don't automate
the loop — add a real test first.

## When to escalate to multi-agent patterns
See `WORKSPACE-PLAN.md` §7 and the selection policy. Default solo; escalate only
when (high value OR high risk OR hard to reverse) AND a cheap evaluator exists.

## Definition of done (every task)
The DoD is `standards/testing-tdd.md`'s (honest CI), plus a **`/simplify`**
pass (strip over-engineering) and a **`/review`** pass
(correctness/security/smells) per `standards/principles.md`.

## Merge title discipline
Squash-merge titles drive `git cliff` CHANGELOG generation. **Do not use `wip(…):`
as a squash-merge title** — `wip(...)` commits produce a spurious `### Wip` section
in the generated changelog. Use a conventional commit type (`feat`, `fix`, `docs`,
`chore`, `test`, `refactor`) with the slice scope, e.g. `feat(m13.5g): …`.
