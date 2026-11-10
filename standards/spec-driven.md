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
Write testable criteria using EARS so each becomes a test case:

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
  how carry-overs go unsized. (Disposition grammar + audit ownership:
  `docs/workflow-loops.md` §Disposition markers.)

## Rules
- No implementation task starts without an accepted spec + acceptance criteria.
- Tasks are small slices: a feature slice is one mergeable behavior; a refactor
  slice is one mergeable structural change with behavior unchanged (§Refactor
  slices).
- Acceptance criteria are the source for the `tester` subagent's tests.
- Changing intent means changing the spec first, then regenerating code.

## Refactor slices
A refactor slice changes where code lives or how modules reach each other, and
nothing a user or a caller can observe. Its spec section carries, beside
`touches:`, the line `type: refactor · tier: routine` (a move) or
`type: refactor · tier: hard` (an interface or ownership change); `tier:` is
the routing tier its launcher uses. Its PR title is
`refactor(<scope>): <slice id> — <what moved>`, so the squash subject on the
default branch identifies it. How it is verified is `testing-tdd.md`
§Behavior-preserving changes.

- **Behavior unchanged.** No production logic, public signature, or
  side-effect registration order changes, and no asserted expected value
  changes. A defect found on the way is reported in the PR, never fixed in the
  slice; one in a protected category is recorded as a tracked follow-up before
  the merge.
- **Move or interface, never both.** A move relocates existing code to a named
  module and deletes it from the old one. A moved body changes only in how it
  reaches its former same-file neighbours: an import, or one explicit
  parameter object. A routine move never relocates code that writes a mutable
  binding the old file keeps, and never hands such a binding over as a copied
  value. That move, like changing an existing interface or deciding which
  module owns shared mutable state, is a `tier: hard` slice whose spec records
  the decision.
- **`touches:` is measured, not estimated.** Before the spec is accepted,
  search for everything that reads the moved code and list: the source and
  destination files by name; test families as globs that keep a literal
  directory prefix, never a bare directory; every pin with its disposition;
  affected e2e helpers; and any config keyed on the moved file's path (a
  mutation-test exclusion is re-keyed in the same slice). A file the move
  needs that the list misses is a hidden-dependency stop.
- **Criteria are id-led SHALL bullets whose checks are test-runner
  invocations**: the test that reaches the moved behavior through its
  destination module, the suites that already cover it, and the full e2e run
  when the slice moves boot wiring or debug hooks that only e2e exercises. A
  source-text read or a line count is never a criterion.
- **`moved-tests:` in the PR body**, one row per re-pointed, renamed, replaced
  or deleted test: `old path :: test name -> surviving path :: test name`, or
  `none`. The rows are claims; whoever merges confirms each survivor exists.
- **Whole or parked.** A refactor slice fits one run and one squash commit. A
  criterion it cannot meet is a park with the reason, never a deferral into
  the backlog. A default branch left red by its merge is reverted, not fixed
  forward.
- **One at a time, in a quiet window.** It launches only when no open work
  overlaps its `touches:`; nothing overlapping starts until it merges; it
  merges before its siblings.
- **The Boy Scout bound** (`principles.md`) limits incidental cleanup, never
  the declared move.

**A design slice answers a design question before code moves.** When refactor
slices depend on an internal-design choice nobody has recorded, that choice is
itself a slice the loop builds: which module owns shared mutable state, where
a large file's seams fall, what an extracted module exposes, which way a
dependency points, which of several near-duplicates survives, the order of a
migration. It is never escalated for sign-off, because it stays reversible
until the first slice built on it merges. It is for a question several slices
depend on or where sound designs differ; a choice that affects one small move
is one line in that slice's spec section.

A design slice is marked `type: design · tier: hard`. It changes no code, so it
has no red run, no tester and `moved-tests: none`. Its `touches:` are
`docs/DECISIONS.md` and one plan file, `docs/refactors/<topic>.md`. It reads
the affected code in full and has a `judge` score at least two alternatives.
It records the choice and what it rules out in `DECISIONS.md`, and in the plan
file the target module map, who owns what, and the extraction slices still to
make, in order, each named by the symbols it moves. Its PR title is
`docs(design): <slice id> — <question>`, and the PR body carries `decided:`
rows, `question -> choice (over: alternative)`. Its gate is the repository's
own; whoever merges reads the plan against the code. Slices that depend on it
list it in `after:`. Each extraction slice deletes its own line from the plan
file and brings `ARCHITECTURE.md` in line with the structure it leaves; the
slice that makes the last extraction deletes the plan file.

**What still goes to the operator:** a change to persisted data, the schema or
the wire format; to gameplay or anything a player sees; to the security or
privacy posture; to a cost ceiling; or anything git cannot undo. A refactor
slice is blocked only by an `after:` slice or by one of those.

**An extraction too large for one slice** runs expand → migrate → contract as
consecutive refactor slices. The spec names the final contract slice, which
deletes the old export or binding so the compiler proves the migration
complete; the chain stays open until it merges. Only an expand slice may leave
the old definition in place. While the chain is open, every new slice touching
the module uses the new seam, and its spec section says so.
