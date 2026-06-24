---
description: Adversarial review — actively try to break the code before shipping.
argument-hint: [path or feature]
---
Delegate to the red-team subagent on $ARGUMENTS (default: current change). It
crafts malicious/boundary inputs and writes failing tests/PoCs for any findings.
Required before shipping security-sensitive or finance code. Report findings by
severity with repro steps.
