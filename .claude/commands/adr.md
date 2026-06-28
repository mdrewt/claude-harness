---
description: Record an architecture decision as an ADR (MADR).
argument-hint: [decision summary]
---
Delegate to the doc-keeper. Detect the decision from the recent conversation
(or $ARGUMENTS), then write an ADR to `docs/adr/NNNN-title.md` per
`standards/adr-process.md`. Populate "Considered alternatives" from any prior
/brainstorm or /debate. Confirm status and consequences.

**Resolve NNNN — never guess the number.** If the orchestrator/brief assigned you
an ADR number, use exactly that. Otherwise resolve the real next-free number from
the project's ADR registry: read `docs/adr/README.md` ("Next free number") and
scan **every** location the project keeps ADRs (this repo's `docs/adr/` AND any
spec-corpus `adr/` dir the README points to) so a number already taken in either
place is never reused. If you allocate the number yourself, update the
`docs/adr/README.md` index row + "Next free number" — unless a supervisor owns
the index (then leave it for reconciliation).
