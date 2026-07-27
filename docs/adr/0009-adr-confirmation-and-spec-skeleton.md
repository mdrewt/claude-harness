# 0009. ADR Confirmation section + adr-lint gate; codified spec skeleton
- Status: accepted
- Date: 2026-07-27

## Context and problem statement
A format review (docs/context-engineering-5gen-review.md follow-up) asked
whether the ADR/spec formats could be meaningfully improved — e.g. by adding
gotchas / recommended-algorithm / notes sections. Analysis: in an agent-operated
corpus a field earns its place only with a defined consumer, a single home, and
ideally a mechanical check; agents dutifully fill every section they see, so
unconsumed fields become filler at corpus scale. Meanwhile two real gaps
existed: nothing verified that a decision's claimed enforcement exists (ADRs
could assert gates that were never built — false green), and the living spec
format (Status header, Touches, closure evidence) had outrun the documented
standard, propagating only by imitation. The plan was refined through a
two-round adversarial-judge debate before implementation.

## Considered alternatives
- Gotchas/algorithm/pattern sections in ADRs and specs — rejected: wrong
  retrieval geometry (gotchas are needed by task type → skills' Gotchas logs;
  algorithm advice is consultant knowledge → research library), and prescribing
  implementation in specs breaks on refuted hypotheses (a real slice refuted
  its spec's implied cause).
- Full upstream MADR (frontmatter, decision-makers, per-option pros/cons) —
  rejected: solo-operator workspace; inline alternatives style is terser.
- Confirmation as convention only (no lint) — rejected by the adversarial
  judge: a written rule is discipline, and unverified enforcement claims are
  worse than silence (false green).

## Decision outcome
- Chosen: (1) `## Confirmation` in the ADR template with a lifecycle
  (`proposed — <gate>` at draft; real gate or `unenforced — review-only` at
  close) enforced by a new `scripts/adr-lint.mjs` via `just adr-gate` in
  `just ci` (strict: accepted ADRs may not lack Confirmation, stay `proposed`,
  or name a nonexistent repo path); status enum extended with
  rejected/deprecated; supersede links must resolve; the 8 existing harness
  ADRs backfilled with individually verified gates. (2) The canonical spec
  skeleton codified in `standards/spec-driven.md` — heading tokens as the
  contract, optional `## Non-goals` for untestable scope fences (enforceable
  exclusions go in negative EARS criteria), closure dispositions
  (`parked → <spec id | wontfix>`). (3) A knowledge-promotion rule in the
  doc-keeper: folded Deviations and durable discoveries get
  `promoted → <path>` / `local-only` dispositions, routed by retrieval
  geometry, one home + links.
- Consequences: decisions carry auditable enforcement claims; specs stop
  drifting from their living format; discovered knowledge routes to where it
  is read. Cost: one more CI gate; project corpora adopt non-strict and
  ratchet when backfilled; the promotion dispositions are review-audited, not
  mechanically judged (only their presence is cheap to check).

## Confirmation
`scripts/adr-lint.mjs` (proof-of-teeth: `scripts/tests/adr-lint.test.mjs` — the
gate is proven to pass clean input and bite each defect class, and a wiring
assertion in that test file verifies the justfile's `ci` recipe still includes
`adr-gate`, so silently unwiring the gate is itself a test failure). This ADR's
own corpus is linted by the gate it records.
