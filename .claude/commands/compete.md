---
description: Best-of-N: N independent solutions, objective judge picks/merges.
argument-hint: <well-specified, objectively scorable task>
---
Run a best-of-N tournament for: $ARGUMENTS. Requires an objective scorer
(passing tests / eval / benchmark). Spawn N=2-3 candidates (depth=1, cheaper
model), then the judge runs the scorer and picks or synthesizes the winner. Turn
the scorer into a permanent eval. Enforce per-run budget caps.
