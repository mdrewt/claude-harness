---
name: spec-kit
description: How to run spec-driven development with GitHub Spec Kit (Specify CLI) in a project. Use when starting a feature or greenfield project.
---
Follow `standards/spec-driven.md`. Flow: Spec -> Plan -> Tasks -> Implement.
If the Specify CLI is installed, use it to scaffold the spec; otherwise write the
spec to `docs/specs/`. Acceptance criteria use EARS
(`WHEN <condition> THE SYSTEM SHALL <behavior>`). Each task is a small vertical
slice and its criteria become the tester's tests. Hand off to `/loop`.
