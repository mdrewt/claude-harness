---
name: spec-kit
description: How to run spec-driven development with GitHub Spec Kit (Specify CLI) in a project. Use when starting a feature or greenfield project.
---
Follow `standards/spec-driven.md`. Flow: Spec -> Plan -> Tasks -> Implement.
If the Specify CLI is installed, use it to scaffold the spec; otherwise write the
spec to `docs/specs/`. Acceptance criteria use EARS
(`WHEN <condition> THE SYSTEM SHALL <behavior>`). Each task is a small vertical
slice and its criteria become the tester's tests. Hand off to `/loop`.

## Gotchas

_Living log — edge cases, bugs, quirks. Per entry: **symptom/quirk** → cause → **avoid:** action. Append new ones as you hit them._

- **Acceptance criteria aren't testable** → prose criteria don't map to a test. **Avoid:** write each as EARS (`WHEN … THE SYSTEM SHALL …`) so it becomes exactly one tester test.
- **Over-speccing far-future, playtest-dependent milestones** → the detail gets reshaped before it's built. **Avoid:** full fidelity for the next build phase only; sketches + ADRs for later milestones.
