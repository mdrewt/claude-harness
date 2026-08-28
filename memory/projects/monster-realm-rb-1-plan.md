# rb-1 — plan (RW3-08 is unsatisfiable as worded; amend it and give it teeth)

Repo: **harness**. Branch `slice/rb-1`. Worktree `.claude/worktrees/rb-1`.
Source residual: `R-rw3b-X8` (dup: `R-rw3c-X3`). Promoted section: `M-residual-backlog.spec.md#rb-1`.

## 1. The defect

`specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md:94` RW3-08 forbids *all* Rust-source edits
beyond `CONTENT_VERSION` and a slice's own **new** test files. Every content slice that appends an
evolution edge or a derived species must **extend a pre-existing exactly-pinned set**, so the
criterion is mechanically unsatisfiable. Both slices that hit it (rw3b PR#357, rw3c PR#358) DEFERred
it. **The code was never in violation; the criterion text is wrong.**

The three real merged extensions the amended criterion must PERMIT (verified from git):

| slice | file | change |
|---|---|---|
| rw3b `ee2e0930` | `game-core/src/content.rs` (inside `mod tests`) | `EG1_TIER_ONE_IDS: [u32; 9] = [4,5,6,9,10,22,23,30,31]` -> `[u32; 11] = [...,41,43]` + doc comments |
| rw3b `ee2e0930` | `game-core/tests/eg3_evolution_graph.rs` | 2 tuples appended to `expected_edges()`; `paths.len() == 10` -> `== 12`; `(1..=10).collect()` -> `vec![1..10,100,101]`; `fn t2_..._ten_edges` -> `..._twelve_edges` |
| rw3c `12af096` | `game-core/tests/pt_d3_tuning.rs` | `[1u32,2,3,7,8,20,21]` -> `[...,40,42]` (set-EQUALITY pin); `levels_by_species.len() == 7` -> `== 9` |

Every one is strictly additive: nothing removed, no assertion weakened.

## 2. The decisive design call — ALLOW-LIST, not deny-list

The first draft classified diffs by *deny* predicates (bite on a weakening token, a deletion, a
decreased integer, a non-superset id list). The red-team lens killed it in one move: **a pure-`+`
hunk trips none of them**, so a new `pub fn`, a new `struct`, or a smuggled `mod tests` block in an
existing `src/*.rs` file reads as PERMIT — while RW3-08 forbids exactly that. A criterion of the
form "SHALL NOT modify X except A, B, C" is an **allow-list**, and only an allow-list classifier can
enforce it.

**Rule: every changed line in a Rust file BITEs unless it positively matches a permitted shape.**

### File classes
| class | rule |
|---|---|
| `NEW-TEST` (new file under a `tests/` dir or `*_test(s).rs`) | PERMIT wholly (exception b) |
| `NEW-OTHER-RS` | BITE — a new non-test `.rs` file is not an exception |
| `BANNED` (`content/type_chart.ron`, the `Affinity` / `AbilityEffect` declaration sites) | BITE on any change |
| `EXISTING-TEST` (pre-existing file under `tests/`) | line rules below; pure additions PERMITted |
| `EXISTING-SRC` (pre-existing `.rs` under `src/`) | line rules below; pure additions BITE unless comment/blank |
| `NON-RUST` | out of RW3-08's scope -> PERMIT (other criteria govern content `.ron`) |

### Line rules (within a hunk)
Removed/added lines are paired by **content similarity** (`difflib.SequenceMatcher` opcodes, then
best-ratio within each `replace` block) — *never* by position. Positional zip is defeated by
inserting one inert line so the real weakening lands in an unpaired slot (red-team §2).

Permitted shapes, each a named rule id that must have its own BITE fixture:

- `P-inert` — comment / doc-comment / blank line, added or removed.
- `P-content-version` — the `CONTENT_VERSION` literal, value non-decreasing.
- `P-count` — paired lines whose skeletons (integers -> `#`) are equal and every integer is
  non-decreasing with at least one increased.
- `P-idset` — paired lines whose bracketed integer list on the added side is a strict **superset**
  of the removed side's, with the surrounding skeleton preserved. Multi-line (rustfmt-wrapped)
  literals are joined to the matching bracket before comparison.
- `P-range-to-list` — removed side has `(a..=b)`, added side has an explicit list superseting
  `expand(a..=b)`. (The literal rw3b `t7` case.)
- `P-msg-or-name` — **test-class files only**: the pair differs only inside double-quoted string
  contents and/or the identifier after `fn `, with no integer decreased and no weakener introduced.
  (The literal rw3b `ten`->`twelve` rename + assert-message case.)

Violations (each with a fixture):
`V-unpaired-removal` (a substantive removed line with no extension partner = a deletion) ·
`V-commented-out` (substantive removed line paired with a comment) · `V-weakened` (paired line
introduces `>=` / `is_subset` / `is_superset` / `debug_assert` / `|| true` / `&& false`, or downgrades
`assert_eq!` -> `assert!`) · `V-added-weakener` (an added line anywhere carries `#[ignore]` or
`#[cfg(feature`) · `V-test-count` (per **pre-existing** file, `#[test]` delta < 0 — scoped to
non-new files so the slice's own new test file cannot launder a deletion) · `V-unpermitted-src`
(any non-inert change in `EXISTING-SRC` matching no `P-*`) · `V-banned-path` · `V-new-non-test-rs`.

### Named anti-patterns (review checklist)
No Rust parser / AST / brace matching. No "is this hunk inside `mod tests`" — the permit condition
is *what the edit does*, not *where it lives*, which is why the `src/content.rs` case falls out for
free. No judgement of "necessary" or "minimal" (undecidable). No wave-3 ids in the rules (ids appear
only in fixtures) — ids in a rule set is what makes a tool dead on the next wave. No git subprocess,
no network, no reading the monster-realm tree: input is a unified diff, hermetic. No positional
pairing. No env override on the spec path (`mr-selfcheck:6-8`).

### Accepted, documented limitations (NOT bugs — do not build these)
- **Causality is not checked.** The classifier cannot tell whether ids appended to a pinned set
  correspond to content the slice actually ships. RW3-02/03/04/06 already gate that; a cross-registry
  causality checker is scope creep. Recorded in the criterion note and the tool header.
- **Prose <-> anchor drift.** The spec's rule-token anchor can stay in sync while the prose above it
  drifts. Same staleness channel `standards/adr-process.md:64-65` already assigns to the reviewer.

## 3. Decisions

- **D1 SSOT link: YES, via a rule-token anchor.** An HTML comment after the criteria list carries the
  stable rule tokens; the tool asserts its implemented rule set EQUALS that token set. Parsing the
  English clause list was the anti-pattern (an equivalent rewording would red the tool). The anchor's
  value is a **deletion alarm**: remove the exception from the spec and the tool reds. It is
  agreeing-by-construction on day one — that is true of every SSOT pin and is not circularity.
- **D2 Name: `mr-content-scope`**, not `mr-rw3-scope`. `rw3` encodes one milestone into a name
  `mr-selfcheck` enumerates forever; `mr-diff-scope` overpromises a universal policy engine.
- **D3 No ADR.** No number was assigned; `docs/adr/README.md` and `CHANGELOG.md` are off-limits, so a
  new ADR would ship un-indexed. The substance is a **criterion correction**, whose SSOT is the spec
  itself. Precedent: `mr-gates` — a far larger and more novel mechanism in the same `mr-*` family —
  has no harness ADR either (`docs/adr/` 0001-0012 are hooks/CI/cost/routing meta-infra). Rationale
  lives in the spec amendment note, the tool `__doc__`, and the rb-1 Resolution block. **The PR body
  states this so the supervisor can overrule with a number.**
- **D4 Wire into `mr-selfcheck`**, marker+count with a floor (the `mr-backup` shape), not the bare
  `|| BAD=1` form. `mr-selfcheck:619-621` records a red-team that stubbed `--selftest` to an
  unconditional `print("BACKUP-SELFTEST-OK 11")` and both bare checks stayed green. A tool run only
  by a ledger that closes at merge is decoration by the next tick (G2 ADOPTION-DRIFT).
- **D5 Seed safety.** `mr-gates` hashes the criteria it extracts from `### rb-1`; recorded
  `Seed: 6d97183777f61762`; reseed is supervisor-only. `section_of` runs rb-1 to **EOF** (no later
  `### `), so the whole file tail is inside the section. The Resolution block is therefore plain
  prose: **no `SHALL` token, no `-`/`*`/`+` bullet, no `### ` line**, and the header + `EARS:` line
  are byte-identical. Verified by re-hashing with mr-gates' own extractor (gate X1) — not by
  `mr-gates status`, which never computes drift, and not by the main-checkout-only `init`/`verify`.

## 4. Cross-repo residual (cannot be fixed here)

`projects/monster-realm/docs/adr/0204:100-103` commits "Reword RW3-08 before rw3c... rw3c must do
this." That is a **different git repo**, out of this slice's scope and read-only. ADR-0204 will keep
reading as an open commitment after rb-1 lands. Disclosed in the PR body as a follow-up flag.

## 5. Tasks

- T1 baseline (done): worktree `mr-selfcheck` FAIL keys = {B2-adoption-drift, gates-hook-adoption,
  residual-unpromoted}; main-checkout FAIL keys = {residual-unpromoted}; `just ci` GREEN, tail
  `adr-lint: 12 ADRs - 0 FAIL - 0 WARN - strict-confirmation:on`. X2 must therefore be a
  NO-NEW-FAILS wrapper, never a bare `SELFCHECK-OK`.
- T2 **tester**: author `mr-content-scope`'s fixture battery + marker contract from the real diffs,
  with `classify()` unimplemented -> RED.
- T3 **specialist**: the two spec edits + implement `classify()` red->green + the `mr-selfcheck` leg.
- T4 fill and run the ledger; `mr-gates lint` clean.
- T5 **tester** adversarial: mutate rules/fixtures/anchor and confirm each reds; break the shipped
  tool in-place and confirm `mr-selfcheck` emits `SELFCHECK-FAIL mr-content-scope`, then restore.
- T6 lenses + verifier + docs + PR.

## 6. Risks

| # | risk | mitigation |
|---|---|---|
| R1 | SEED-DRIFT on rb-1 (supervisor-only reseed -> blocked) | prose-only Resolution; gate X1 re-hashes with mr-gates' own extractor |
| R2 | vacuous green (battery gutted / marker printed unconditionally) | computed counts in the marker, concrete numbers in EXPECT, per-rule "every rule has a bite fixture" assertion, CLI subprocess fixtures, T5 mutation pass |
| R3 | `mr-selfcheck` already red for unrelated reasons | X2 compares the FAIL-key SET to the frozen baseline |
| R4 | `mr-gates verify` defaults cwd to the monster-realm repo | every CHECK fully absolute and cwd-independent |
| R5 | fixtures are snapshots that can drift from the real diffs | hermetic by choice; shas cited in comments (live-git fixtures would couple a harness tool to another repo's rewritable history) |
| R6 | `just ci` false green (`test` runs 2nd of 4; `# fail 0` prints before a later failure) | EXPECT taken from the LAST recipe's tail |
