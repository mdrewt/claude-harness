---
description: Review the current diff for correctness, security, smells, over-engineering.
argument-hint: [optional path or PR]
---
Delegate to the reviewer subagent on the current change ($ARGUMENTS if given).
Return findings grouped by severity with file:line and suggested fixes. Confirm
an ADR exists if a dependency or pattern was added.
