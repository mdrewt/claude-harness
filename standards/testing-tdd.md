# Testing & verification

The single source of truth for how work is verified in this workspace. Agent
roles (`tester`, `verifier`, `reviewer`), loop prompts, and briefs point here —
they do not restate or extend these rules. Written for capable models: these
are principles to apply with judgment, not an exhaustive rulebook.

## The cycle
Red → Green → Refactor. Write a failing test from an acceptance criterion,
watch it fail **on the real defect it targets**, make it pass minimally, then
refactor with tests green.

That red run is the only "proof of teeth" a check ever needs, and it happens
**once per invariant, never recursively**. Never create a check whose subject
is another check, a test suite, CI wiring, or a gate script — no tests of
tests, no gate-of-gates, no follow-up task auditing whether a test has blind
spots. (That recursion once consumed 20+ consecutive work items here while
real bugs shipped.)

## What counts as a check
- An **ordinary test in the language's own runner** (cargo test/nextest,
  vitest, pytest, Playwright), colocated with the code it protects — or a
  compiler/type/lint rule that makes the bad state unrepresentable.
- **Machine-contract checks** against *generated artifacts* are legitimate and
  first-class: bindings drift (re-run the generator, diff), schema/type
  snapshots that freeze a migration surface, client-visible-surface allowlists
  derived from generated bindings, content-hash pairs, append-only ID rosters.
  The artifact is the contract; diffing it is behavioral, not textual.
- **Forbidden shapes** (each one produced measurable damage here):
  - Scanning or regex-matching **source text** to infer semantics — a check
    proves what code *does* (execute it) or what an artifact *is* (generate
    and diff it), never what its text looks like.
  - Pinning prose: doc/spec/comment text, recipe bodies, file line numbers,
    or exact counts of anything ("exactly 9 steps", coverage floors).
  - A check that exists to prove another check wasn't deleted or weakened.
- **Golden cases are just tests.** A standalone "eval" category earns no
  separate machinery for new work; when a `/compete` or `/debate` scorer is
  worth keeping, it lands as an ordinary test. (Existing machine-contract
  suites that live under `evals/` — e.g. monster-realm's 15 — stay where they
  are and are maintained, not migrated or churned.)

## What earns a check
A check earns its place only by protecting something that matters:
**gameplay/domain correctness, user-data security and privacy, data
integrity, determinism/netcode contracts**. Not theoretical edge cases, not
hypothetical future refactors, not the checking apparatus itself. **When
genuinely unsure whether a check is worth adding, don't add it** — ship the
change and let review catch what a mechanical gate wouldn't.

**User-facing acceptance criteria are verified through the user-facing
surface.** An e2e test that drives internals directly (calling a reducer the
UI was supposed to call) can stay green while the real flow is broken — that
exact failure shipped here.

## Test ownership (anti reward-hacking)
The agent implementing a change does **not** author or edit the tests that
gate it in the same loop. The `tester` writes tests from the spec; the
`specialist` implements; the `verifier` runs and judges. A wrong expected
value is corrected by the tester *from the spec*, never retargeted to match
the code.

## Deleting a check is legitimate
The verifier's question is **"is the behavior still protected?"** — not "did
any test change?". Removing a test/check is allowed, with a one-line stated
reason, when it is redundant with a stronger check, tests implementation
detail rather than behavior, scans source text, pins prose, or is superseded.
Deleting the **only** protection of a protected-category behavior fails
verification. Test deletions are always surfaced for adjudication — they are
reviewable events, not silent ones.

## The pyramid and techniques
Many fast unit tests (pure logic, contracts) · fewer integration tests · few
e2e tests on critical user paths. **Property-based testing** for logic-heavy
code (proptest, Hypothesis, fast-check). **Determinism**: seedable RNG,
injected clocks; no wall-clock or unseeded randomness in tests; flaky tests
are quarantined loudly, not silently retried.

**Coverage and mutation scores are reports, not gates.** Run them to find
gaps worth judging (an uncovered privacy branch matters; an uncovered log
line doesn't); never wire a threshold, floor, or ratchet — a gated number
gets stuffed, and stuffed assertions hide real gaps. A mutation run on a
security/economy module before merge is a good report to read.

## Definition of done
The project's `just ci` green, honestly: no test weakened or quarantined to
pass, deletions adjudicated, new behavior covered by a test that was watched
failing first.
