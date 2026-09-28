---
description: Run the PRERRR build loop from a spec task.
argument-hint: <task>
---
Execute the PRERRR loop (`docs/workflow-loops.md`) for: $ARGUMENTS.
1) planner decomposes the task; 2) tester writes failing tests from acceptance
criteria; 3) implement in an isolated worktree to green, logging any plan
deviation in the worktree's `implementation-notes.md` (Deviations section);
4) reviewer + verifier gate — both read the Deviations log; 5) refactor with
tests green; 6) doc-keeper records a decision entry only if the
`standards/decisions.md` bar is met, and memory only if something durable
changed. Right-size model/effort per `docs/routing.md`. Only merge when
`just ci` is green honestly (`standards/testing-tdd.md`). Escalate to a multi-agent pattern only if the selection policy
(WORKSPACE-PLAN.md §7) says the cost/benefit justifies it.
