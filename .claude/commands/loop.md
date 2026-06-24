---
description: Run the PRERRR build loop from a spec task.
argument-hint: <task>
---
Execute the PRERRR loop (`docs/workflow-loops.md`) for: $ARGUMENTS.
1) planner decomposes the task; 2) tester writes failing tests from acceptance
criteria; 3) implement in an isolated worktree to green; 4) reviewer + verifier
gate; 5) refactor with tests green; 6) doc-keeper records ADR/changelog/memory.
Right-size model/effort per `docs/routing.md`. Only merge when `just ci` is green
and meaningful. Escalate to a multi-agent pattern only if the selection policy
(WORKSPACE-PLAN.md §7) says the cost/benefit justifies it.
