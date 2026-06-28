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

- **Slices without a `touches:` set serialize the build** → a slice that names a monolithic file (or declares no `touches:`) collides with every sibling, so the runner fleet can't fan out (`PLAN.md` §9). **Avoid:** give each task a **narrow `touches:` path-set** along the natural boundaries (a `game-core` rule module / a server-module domain module / `client/` / content + `validate_content` / `evals/`), order slices by the real dependency chain (rule → reducer → client/evals, not just file-disjointness), and add a milestone-level **post-integration verification** step — the combined slices must satisfy the milestone's EARS *after* merge (full `just ci`, `bindings-drift = 0`, schema-snapshot intact, e2e), not merely each slice green in isolation. Don't let a milestone grow a new monolith; split the file as part of the milestone.
