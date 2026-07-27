---
description: Author or refine a spec using the Spec Kit flow (Spec -> Plan -> Tasks).
argument-hint: <feature or project description>
---
Drive spec-driven development per `standards/spec-driven.md` for: $ARGUMENTS.
Produce/refine a spec with EARS acceptance criteria, then a plan, then small
vertical-slice tasks. Use Spec Kit (Specify CLI) if available in the project;
otherwise write the spec to `docs/specs/`. Hand off to `/loop` for implementation.

Before finalizing the spec, interview the operator one question at a time about
the ambiguities you found — prioritize questions whose answers would change the
architecture, data model, or UX flow (mechanical details can default). If the
domain is unfamiliar to the operator, offer a blind-spot pass first (`/consult`:
"what should we be asking about this domain that we're not?").
