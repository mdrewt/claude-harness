# ADR process (MADR)

Architecture Decision Records capture *why*, automatically, so rationale never
goes stale or lives only in someone's memory.

## Where
`docs/adr/` in each project. Files: `NNNN-title.md` (zero-padded, incrementing).

## When an ADR is REQUIRED
- Adding or removing a dependency.
- Introducing a design pattern, architectural layer, or new module boundary.
- Choosing between technologies (DB, queue, transport, framework).
- Any decision a future maintainer would ask "why did we do it this way?"

## How (automatic)
- The `/adr` command (via the `doc-keeper` subagent) detects a decision made in
  conversation and drafts the ADR.
- `/brainstorm` and `/debate` outputs populate the **Considered alternatives**
  section automatically.

## MADR template
```
# NNNN. <Title>
- Status: proposed | accepted | rejected | deprecated | superseded by NNNN
- Date: YYYY-MM-DD
## Context and problem statement
## Considered alternatives
## Decision outcome
  - Chosen: <option>, because <justification>.
  - Consequences: <positive / negative / follow-ups>.
## Confirmation
  <How compliance with this decision is verified: name the concrete gate — an
  eval, lint rule, test, CI check, or hook, with a backticked repo path where
  one exists — or the literal `unenforced — review-only`.>
```

## Confirmation lifecycle (mechanical-enforcement applied to decisions)
- At draft time the gate often doesn't exist yet: write `proposed — <planned gate>`.
- At slice close the doc-keeper updates it to the real gate, or to the literal
  `unenforced — review-only`. An `accepted` ADR may not stay `proposed — …`.
- The reviewer verifies the named gate exists and bites — especially when the
  Confirmation names no checkable repo path.

## Authoring rules
- **Omit sections with nothing to say — never fill with filler.** An ADR can be
  short; structure earns its place only when content exists. Exception: an
  accepted ADR always carries `## Confirmation` (the unenforced literal counts).
- Keep the inline `Option X — … Rejected: …` style for alternatives; no
  per-option subsections.

## Mechanical gate
`just adr-gate` (in `just ci`) runs `scripts/adr-lint.mjs docs/adr
--strict-confirmation`: filename↔title number match, no duplicate numbers,
status pinned to the enum above, `superseded by NNNN` must resolve, and
Confirmation teeth — an accepted ADR missing/still-`proposed` Confirmation
FAILs, and a Confirmation naming a nonexistent repo path FAILs (false-green).
A project corpus adopts non-strict first (missing Confirmation = WARN) and
ratchets to strict once backfilled.
