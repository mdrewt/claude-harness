---
description: Deep planning, optionally offloaded to a cloud session, then reviewed.
argument-hint: <planning task>
---
Produce a thorough plan for: $ARGUMENTS. If this Claude Code build supports the
native `ultraplan` (cloud plan-mode offload), use it so local context stays lean;
otherwise run the planner subagent at high effort locally. Return the plan for
review before any implementation. Record the chosen approach as an ADR if it sets
architecture.
