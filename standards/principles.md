# Engineering principles

> Principles are tools, not laws. They are **tiered**, and some are deliberately
> **inverted** or excluded per project. Knowing which to apply — and which to NOT
> apply — matters as much as applying them. Don't cargo-cult "all best practices";
> several conflict. Each project declares its own tiers/inversions in its
> `AGENTS.md` (or `ARCHITECTURE.md`) with one-line rationale, and records
> decisions that meet the bar in `standards/decisions.md`.

## Tier 1 — non-negotiable (default everywhere)
- **Single source of truth (SSOT).**
- **Separation of concerns** — functional core / imperative shell wherever real IO exists.
- **Make illegal states unrepresentable** / parse-don't-validate; validate at boundaries.
- **Lightweight design-by-contract** — pre/postconditions on critical functions.
- **Errors are values; fail loud, fail early.**
- **Mechanize what protects users and data; judge the rest.** Wire a check for
  the protected categories in `testing-tdd.md` (domain correctness, data
  security/privacy, data integrity, determinism) rather than relying on
  remembering — but a check that exists to enforce *process* is bloat, and a
  rule that would need a scanner to enforce is better left to review. (The
  old absolute form of this rule — "wire a check; never rely on remembering" —
  measurably drove a 10:1 checking:production ratio.)
- **DRY — but NOT across marshaling/serialization boundaries.** Duplicated data
  *shapes* across a Rust↔TS or service boundary are often correct; coupling them is worse.
- **YAGNI with named exceptions** — state the exceptions explicitly so they aren't
  "simplified" away later.
- **The Boy Scout Rule — leave every file you touch better than you found it.** Make
  the opportunistic improvement *within the change's blast radius*: a clearer name, a
  deleted dead branch, a missing test for the behavior you changed, a small decoupling.
  **Bounded, not unbounded** — improve what you are already editing; do *not* reformat
  untouched code or widen the diff with drive-by rewrites (that fights minimal-diff
  review and inflates blast radius). Cleanups larger than the current change get
  **flagged separately** (a refactor slice per `spec-driven.md` §Refactor slices, an issue, or a
  decision entry), never smuggled inline. For
  long-lived code this is the compounding default that keeps the codebase cheap to
  change — the build-loop's "every milestone leaves the code easier to change" is this
  rule applied per slice.

## Tier 2 — apply with judgment
- **SOLID where it fits** (evolving services/libraries); skip for thin scripts. Note
  OCP can fight exhaustive enums — sometimes you *want* the compiler to flag every
  match site instead of an open extension point.
- **Defensive programming at trust boundaries only** — not inside pure core code.
- **Data-driven content** — things that vary (config, content, maps) are data, not code.
- **Design patterns** only when the problem matches the named pattern.
- **KISS / least astonishment / fail-fast.**
- **TDD for the core**; behavior-focused tests over implementation-coupled tests.

## Commonly inverted / unsuitable — decide per project, document the call
- **Postel's Law is often INVERTED** at security/finance boundaries: be *strict* —
  reject out-of-contract input, don't clamp silently.
- **Full SOLID** is usually cherry-picked; don't add interfaces for one implementation.
- **Heavyweight BDD/contract frameworks / uniform-access**: keep the principle, skip
  the tooling (YAGNI).

## Declaring tiers & inversions per project
A project's `AGENTS.md` lists any Tier-1 promotions, Tier-2 demotions, and inverted
principles, each with one line of rationale. Non-obvious or contested calls get a `docs/DECISIONS.md` entry when they meet the `decisions.md` bar.

## Mechanical enforcement map (principle → enforcer)
Where a concern maps to a protected category, a tool enforces it; the rest is judged in review:

| Concern | Enforced by |
|---------|-------------|
| Format / lint / style | formatter + linter in `just lint` (pre-commit via lefthook) |
| Types / illegal states | compiler / `tsc` / mypy + contracts (`contracts.md`) |
| Architecture invariants | dependency lints / compile-time structure (testing-tdd.md §What counts as a check) |
| Determinism | seedable RNG / injected clocks + determinism tests |
| Secrets / deps | gitleaks + dependency audit in CI; SAST/SBOM per the project's threat model (`security.md`) |
| Over-engineering / DRY / YAGNI | `/simplify` + the `reviewer` |
| Incremental code health (Boy Scout) | the `reviewer` + the per-task `/review` pass, scoped to the diff's blast radius |
| Correctness / smells | `/review` + tests + mutation reports |
| Blast radius of shared changes | impact analysis before edit (below) |

**Every task's definition-of-done includes a `/simplify` and a `/review` pass.**

## Documentation
- Docs describe **current state** and are rewritten in place. Appending is not
  updating; git history is the archive. A doc whose claims can't be re-derived
  from the code it describes gets corrected or cut.
- **A record stays only while a current reader or tool needs it.** The test is
  need, not whether it was accurate when written: a correct account of a past
  state is still noise to every agent that reads or searches it. Specs exist
  for open and future milestones; when a milestone closes, its lasting
  decisions go to `DECISIONS.md` and the spec and its per-slice plans, briefs
  and reports are deleted. No `archive/` folders, dated post-mortems kept "for
  reference", or backup copies in the tree. Before deleting, check for live
  citations: a file a script or current doc names as the home of a contract is
  current, so correct it instead.
- **Comments and docs state what the code does now and why.** Not what it used
  to do, what it replaced, or how a bug was found: "was", "used to", "before
  this", "no longer" and dates are the tell. A past failure belongs in a
  comment only as the present-tense reason a guard exists ("a fixed sleep reads
  a stale column on a slow runner"), never as a story. History lives in commit
  messages, PR descriptions, the generated changelog and the rolling
  operational logs (handoff, ledgers), which are history by purpose.
- `ARCHITECTURE.md` changes only when the structure it describes changes.
  Decision records follow `standards/decisions.md`. The changelog is generated
  from Conventional Commits, on demand. **No per-task doc duties** belong in
  any definition of done — routine work does not mint decision entries,
  architecture edits, or memory ceremony.
- **Process metadata stays out of the artifact.** Task/slice IDs, decision
  numbers, reviewer narration, and workflow vocabulary never appear in
  production code and tests (comments, identifiers, strings — test names
  included) or current-state docs — they live in commits, PRs, and the
  work-tracking files that own them.

## Impact analysis before changing shared signatures
Before changing a signature/type used across a boundary or by multiple modules,
identify and report the affected callers/tests **first**, not after. In indexed
repos the code-knowledge graphs (**CodeGraph** + **codebase-memory-mcp**) answer
"what-calls-X / what-depends-on-X" far more cheaply than grepping or reading
files — but each has verified blind spots, so blast radius = the **union of both
graphs**, plus a grep when the symbol can be invoked dynamically (callbacks,
trait objects). Route per the `code-intel` skill. A missed caller across a
marshaling boundary is how client/server or producer/consumer contracts
silently desync.

## Red flags the reviewer enforces
- Premature abstraction; speculative generality.
- Duplicated *sources of truth* (≠ duplicated shapes across a boundary, which is fine).
- Public surface larger than the spec requires.
- Comments that restate code instead of explaining *why*; comments or docs
  written for a tool to parse rather than a human to read.
- Comments or docs added by the diff that narrate change — what the code used
  to do, a slice or decision id, a date — instead of stating current behaviour
  and its reason.
- A touched file left *worse* than found — a new smell, dead code, or changed
  behavior without a test — when a bounded in-blast-radius fix was available (Boy
  Scout violation). Note the inverse is also a red flag: an unbounded drive-by
  cleanup that balloons the diff beyond the change at hand.
