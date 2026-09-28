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
- **Machine-contract checks** against *generated artifacts* are legitimate
  and first-class. A generated artifact is **output a tool emits** — generated
  bindings (`spacetime generate`), compiler/`cargo metadata` output, a built
  bundle, serialized program output — or a data file the product itself
  loads, read through the product's own loader. Regenerate and diff it: the
  artifact is the contract. **A parse of hand-written source is never a
  generated artifact**, whatever the check is named.
- **Forbidden shapes** (each one produced measurable damage here):
  - Reading the text of any hand-authored file (code, config, manifests, CI
    recipes, docs) to assert what it contains — whatever the runner. A check
    proves what code *does* (execute it) or what a generated artifact *is*
    (regenerate and diff it); a config is consumed only through the tool
    that consumes it.
  - Pinning prose: doc/spec/comment wording, recipe bodies, line numbers, or
    counts of **process artifacts** (checks, steps, files — "exactly 9 CI
    steps", coverage floors). Asserting domain values (an inventory count, a
    damage number) is ordinary testing, not pinning.
  - A check that exists to prove another check wasn't deleted or weakened.
    (Tooling that *is* a security or ownership boundary — a guard hook, a
    code generator — is product code and is tested like any other; the ban
    targets checks whose purpose is proving another check exists, runs, or
    bites.)
  - A bespoke "lint" is inside these rules, not around them. A lint is a
    configured rule of an established linter operating on the AST (clippy,
    biome/eslint, cargo-deny, dependency-cruiser); a project-authored script
    that reads source text is a scanner no matter what it is called, and a
    genuinely new lint rule needs a `docs/DECISIONS.md` entry.
- **Golden cases are just tests.** A standalone "eval" category earns no
  separate machinery for new work; when a `/compete` or `/debate` scorer is
  worth keeping, it lands as an ordinary test. **monster-realm's `evals/`
  set is closed**: its 15 surviving files are maintained in place as
  grandfathered exceptions, never precedents — the three that still parse
  source (`battle-schema-snapshot`, `spacetime-type-snapshot`,
  `content-version`) protect real live-DB migration contracts and are
  replaced with generated-artifact equivalents when next touched, not
  imitated. New machine-contract checks are ordinary tests in the language's
  runner, not new eval files.

## What earns a check
A check earns its place only by protecting something that matters:
**gameplay/domain correctness, user-data security and privacy, data
integrity, determinism/netcode contracts, and critical user flows through
the real UI**. Not theoretical edge cases, not
hypothetical future refactors, not the checking apparatus itself. **When
genuinely unsure whether a check is worth adding, don't add it** — ship the
change and let review catch what a mechanical gate wouldn't.

**User-facing acceptance criteria are verified through the user-facing
surface.** An e2e test that drives internals directly (calling a reducer the
UI was supposed to call) can stay green while the real flow is broken — that
exact failure shipped here. The grain is **one e2e per user-facing flow**,
not per criterion (unit tests carry the criteria); and an e2e is redundant
only with another e2e driving the *same flow through the same surface*,
never with unit tests underneath it.

## Test ownership (anti reward-hacking)
The agent implementing a change does **not** author or edit the tests that
gate it in the same loop. The `tester` writes tests from the spec; the
`specialist` implements; the `verifier` runs and judges. A wrong expected
value is corrected by the tester *from the spec as it stood at the RED
checkpoint*, never retargeted to match the code — and relaxing a
protected-category acceptance criterion mid-slice is a deletion under the
rule below, not a correction. **Deleting a test that gates the current
change counts as editing it**: only the tester may do it, from the spec,
never the implementer in the same loop.

## Deleting a check is legitimate
The verifier's question is **"is the behavior still protected?"** — not "did
any test change?". Removing a check is allowed when it is redundant with a
stronger check, tests implementation detail rather than behavior, reads
source text, pins prose, or is superseded — under these conditions:
- The removal **names its reason and the surviving check(s) by path and test
  name**; "redundant" with nothing named is not a reason.
- A test that is *failing against the current change* is never a deletion
  candidate for the change's author (that's the ownership rule).
- For a **protected-category** behavior, someone other than the deleter
  adjudicates (reviewer, supervisor, or a human), and the named survivor is
  demonstrated: re-create the scenario the deleted check guarded and show
  the survivor catches it. A forbidden-shape check that is the *only*
  protection of a protected behavior is **replaced first, deleted second** —
  the executing replacement lands and is watched failing on the real defect
  before the old check dies.
- Quarantining, `skip`ping, or `#[ignore]`-ing a protected-category test is
  a deletion under this rule, not a lesser act.
Deleting the only protection of a protected-category behavior fails
verification. Deletions are reviewable events, never silent ones.

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
security/economy module before merge is a good report to read. A surviving
mutant or uncovered line is a *candidate*, never automatically a work item:
act only when the missed behavior is protected and a plausible real failure
exists. A project's existing, deliberately adjudicated mutation config
(e.g. monster-realm's nightly game-core zero-miss run and server cap) is
that project's recorded decision and stands until re-adjudicated.

## Definition of done
The project's `just ci` green, honestly: no test weakened or quarantined to
pass, deletions adjudicated, new behavior covered by a test that was watched
failing first.
