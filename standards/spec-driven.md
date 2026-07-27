# Spec-driven development (SDD)

The spec is the primary artifact; code is regenerable output. SDD is the main
defense against code that drifts from intent.

## Tooling
GitHub Spec Kit (Specify CLI), which supports Claude Code natively.
Flow: **Spec → Plan → Tasks → Implement** (`/spec`).

## Where specs live
- Greenfield bootstrapping: `specs/` at the workspace root.
- Per project thereafter: `docs/specs/` inside the project repo.

## Acceptance criteria — EARS notation
Write testable criteria using EARS so each becomes a test/eval case:

```
WHEN <trigger/condition> THE SYSTEM SHALL <observable behavior>
WHILE <state> THE SYSTEM SHALL <behavior>
IF <error condition> THEN THE SYSTEM SHALL <handling>
```

## Canonical spec skeleton
Heading **tokens** are the contract — consumers (the supervisor, fan-out
eligibility, close-out) match the token, not a section number; numbering is
optional. Omit empty sections — never fill with filler.

```
# Spec: <id> — <title>
**Status:** … · **Owner:** … · **Stack:** … · **Project:** … · **Depends on:** …
## Problem / intent
## Acceptance criteria (EARS)
## Touches            (declared path-set for fan-out eligibility)
## Non-goals          (optional — untestable scope exclusions only; see below)
## Notes              (weight/sizing, investigation guidance, research slugs)
## Delivered / Parked (closure — written at slice close, with evidence)
```

- **Non-goals:** an *enforceable* exclusion belongs in the criteria as negative
  EARS (`WHEN … THE SYSTEM SHALL NOT …`) so the tester encodes it; the prose
  Non-goals section is only for untestable scope fences — the explicit no-s
  that stop scope drift and "fixing" deliberate omissions.
- **Investigation guidance, not prescription:** criteria may carry falsifiable
  hypotheses ("verify X already succeeds — confirm before assuming"), never a
  prescribed implementation — implementation has refuted a spec's implied cause
  before, and a prescribed mechanism would have shipped the wrong fix.
- **Closure:** each Delivered/Parked item carries evidence (root cause, measured
  blast radius). Every PARKED item ends with a disposition:
  `parked → <queued spec id | wontfix>` — parked work without a disposition is
  how carry-overs go unsized.

## Rules
- No implementation task starts without an accepted spec + acceptance criteria.
- Tasks are small vertical slices (one mergeable behavior each).
- Acceptance criteria are the source for the `tester` subagent's tests.
- Changing intent means changing the spec first, then regenerating code.
