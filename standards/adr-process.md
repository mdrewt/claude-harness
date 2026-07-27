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
--strict-confirmation`: filename↔title number match (all `*.md` must be
`NNNN-slug.md` — malformed names FAIL rather than escape), duplicate numbers
(numeric — `0139` == `139`), status enum, `superseded by [ADR-]NNNN` must
resolve, and Confirmation teeth — strict FAILs an accepted ADR whose
Confirmation is missing/empty, still `proposed — …`, junk prose (it must name
an existing backticked repo path or a `just <recipe>`, or carry the literal
`unenforced — review-only`), or names a nonexistent repo path (false-green;
`~/…`-anchor, absolute, glob, and prose-slash tokens are skipped, not checked).
Prose cross-references (`ADR-0139`, markdown links) are OUT OF SCOPE — only
supersede targets resolve. A project corpus adopts non-strict first (missing
Confirmation = WARN, accepted/proposed only) and ratchets once backfilled.
The lint's existence check proves the gate FILE exists, not that it still
asserts what the ADR claims — that staleness channel is the reviewer's duty.
