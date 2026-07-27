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
architecture, data model, or UX flow (mechanical details can default). Give your
recommended answer with each question, so the operator corrects an assumption
rather than drafting from scratch. If the codebase can answer a question,
explore it instead of asking. If the domain is unfamiliar to the operator, offer
a blind-spot pass first (`/consult`: "what should we be asking about this domain
that we're not?"). For a gnarly design that warrants an exhaustive stress-test,
escalate to `/grilling` (operator-local skill in `~/.claude`, not shipped with
the harness — skip gracefully if absent).
