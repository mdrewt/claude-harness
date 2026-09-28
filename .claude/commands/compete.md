---
description: Best-of-N: N independent solutions, objective judge picks/merges.
argument-hint: <well-specified, objectively scorable task>
---
Run a best-of-N tournament for: $ARGUMENTS. Requires an objective scorer
(passing tests / eval / benchmark). Spawn N=2-3 candidates (depth=1, cheaper
model), then the judge runs the scorer and picks or synthesizes the winner. The
scorer is scratch unless it protects something meeting the bar in
`standards/testing-tdd.md` — then it lands as an ordinary test. Enforce
per-run budget caps.
