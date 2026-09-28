---
description: Review the current diff for correctness, security, smells, over-engineering.
argument-hint: [optional path or PR]
---
Delegate to the reviewer subagent on the current change ($ARGUMENTS if given).
Return findings grouped by severity with file:line and suggested fixes. When a
dependency or pattern was added, judge it against `standards/decisions.md`'s
bar — flag a missing `docs/DECISIONS.md` entry only when the bar is met, and
flag entries minted for routine work.
