# Spec: M-test-pruning — a test census at milestone elaboration

**Status:** elaborated 2026-11-13 against monster-realm `master` @ `1ea867a3` and harness `main` @
`24872ed`, revised after adversarial review · 3 slices, head `tp-1`, closes on `tp-3` ·
**Project:** harness loop tooling (`memory/projects/`, `specs/`, `docs/`); no game file is edited
by this milestone · **Source:** operator request 2026-11-13 · **Depends on:** `tp-3` and the two
`structure.spec.md` sections this spec's PR adds (`st-3`, `st-4`) carry
`blocked: tester-ab-close` (§Tester A/B experiment).
Anchors cite files and symbols. Measurements are dated and name how they were taken.

## Problem / intent

The suite is large against the code it protects, and nothing ever takes a test out.

| Package | Product lines | Test lines | Tests |
|---|---|---|---|
| `server-module/src` | 19,828 | 79,468 in 26 files | 984 `#[test]` |
| `game-core` | 36,821 (inline test modules included) | 52,765 in 43 files | 1,205 `#[test]` in test files; nextest runs 1,910 |
| `client/src` (bindings excluded) | 47,273 | 228,146 in 237 files | 4,974 `it`/`test` |
| `client/e2e` | — | 51 spec files | about 260 |

(`git ls-files` line counts at `1ea867a3`; test files are `*_tests.rs`, `*/tests/*.rs`, `*.test.ts`.)

The operator's rule for taking a test out: nothing useful leaves without an equal-or-better
replacement, every removal has a valid reason that someone other than the remover verified case
by case, and no test is judged by a count or a coverage figure alone. That is already the
deletion rule in `standards/testing-tdd.md` §Deleting a check is legitimate. What is missing is a
list of candidates and a place in the workflow where someone reads it.

**What the measurements say** (they decide the shape of this milestone):

- **Almost nothing in the suite is provably redundant.** A comparison that ignores all whitespace
  finds no identical bodies among about 2,190 Rust tests and 9 pairs among 4,974 client tests.
  Read one by one: most differ inside a string literal (`''` against `'   '` in
  `ui/renameModel.test.ts`); two pairs sit in different files and test different things
  (`ui/boxView.test.ts` and `ui/evolutionView.test.ts` each call their own `mount()`); one is a
  pair of `it.each` blocks with different case tables (`render/art/registry.test.ts`); and one is
  a true duplicate in two different `describe` blocks (`render/camera.test.ts`, "player at
  (5,3)…" and "player at integer tile uses tile CENTER"). Under a rule strict enough to be safe
  the count today is zero.
- **Mutation data cannot show a test is redundant.** In `game-core/src/interact.rs` (13 mutants,
  28 tests) every mutant is killed by 4–22 tests and a set of 4 tests kills all 13, so 24 tests
  could go with no mutant lost, among them tests that assert different rules. cargo-mutants makes
  no mutant for a constant, a deleted statement, an attribute or RON content, and there is no
  mutation tool for TypeScript, which holds 63% of test lines.
- **The removable volume is retired code that only tests reach.** `game-core/src/combat/resolve.rs`
  (2,593 lines: `resolve_turn`, `resolve_full_turn`, `resolve_enemy_turn`, `resolve_player_swap`,
  `resolve_recruit_failure`, `advance_turn`) has no reference from a production file outside
  `game-core/src/combat/` and the `lib.rs` re-export; neither do `weather_attack_modifier`,
  `apply_weather_damage`, `tick_weather`, `apply_entry_ability`, `apply_ability_modifiers`,
  `TurnChoice` or `TurnVariance` (`git grep -w` at `1ea867a3`). Their tests are
  `combat/battle_core_tests.rs` (2,580 lines), `combat/battle_0hp_tests.rs` (643),
  `combat/weather_tests.rs` (2,241), `combat/ability_tests.rs` (1,978),
  `monster/battle_redteam_tests.rs` (998) and part of `combat/status_tests.rs` (5,599). The game's
  `docs/DECISIONS.md` ("Battles run on one engine at a time…") keeps `combat::*` on purpose as
  the type home of the stored `Battle.state` and of the rules the tactical engine reuses, and
  PLAN §9's tactical depth waves bring entry abilities and weather back. What goes and what stays
  is a design question, not a prune.
- **Shared pins are edited by slices that did not change what they pin.** Of the last 300 `master`
  commits, 58 changed `client/src/ui/i18n/catalog.test.ts`, 25 `ui/screens/index.test.ts`, 24
  `ui/i18n/catalogParity.test.ts`, 21 `ui/contextStack.test.ts`, 18 `ui/reachability.test.ts`. One
  fact is often pinned as a literal in several places: the help overlay's 16 rows in eight
  assertions across `main.help.test.ts` and `ui/helpView.test.ts`; the 29 subscription queries in
  four assertions across `net/connection.runtime.test.ts` and `net/connection.test.ts`.
  M-trade-sessions `ts-3` lists 15 test files outside its own modules to add one screen. Most of
  these are accessibility, i18n and privacy gates, which no prune may remove.
- **A prune session costs more than it saves.** A test line costs about $0.0005 per slice that
  reads it (tester A/B plan, bloat formula); the whole 1,910-test game-core suite runs in about
  1.8 s. A dedicated session per milestone costs tens of dollars and, by the first bullet, finds
  nothing it may safely delete.

So this milestone does not add a prune session. It adds a **census**: a read-only report of
candidates and of the suite's size, run when a milestone is elaborated, whose rows the spec author
routes through channels that already exist. How many tests a slice writes is the tester's rules,
which the tester A/B experiment measures and will change.

## Scope

**In:** the report tool `memory/projects/mr-prune` (`census`, `twin`, `keep`); one bullet in
`milestone-loop-prompt.md`'s structure pass; a harness `docs/DECISIONS.md` entry; two
`type: design` sections added to `structure.spec.md` by this spec's PR (`st-3` shared pins, `st-4`
what stays of the 1v1 battle rules).

**Named deferrals:**

| Deferral | Target |
|---|---|
| A per-milestone prune session, its trigger, tickets, caps and its own PR type. | Revisit when the tester A/B experiment closes: its report prices bloat and brittle breaks per arm, and the census rows recorded by then show the trend. The harness `docs/DECISIONS.md` entry names this trigger. |
| Removing a test because another test kills the same mutants. | never (see the second measurement) |
| Merging literal-variant tests into one table-driven test. No parametrised-test crate is in the workspace, so a Rust merge is a loop that stops at its first failing row and loses the behaviour-led names. The census prints a count. | the tester's rules after the A/B experiment |
| Replaying removed tests against later bug fixes. With no removal class beyond same-block twins there is nothing a replay could catch. | never |
| `client/e2e/**`: an e2e is redundant only with another e2e driving the same flow through the same surface (`standards/testing-tdd.md` §What earns a check). Flaky and slow specs. | M-test-health (TH1–TH5) |
| `evals/**` (the set is closed and maintained in place), `sim-harness/**`, `client-wasm/**`, `client/test-util/**`, inline `#[cfg(test)]` modules in product files. | backlog; the census counts them and prints no row for them |
| Rewriting a brittle or source-reading test. | the slice that next owns the file, under `standards/testing-tdd.md` §Behavior-preserving changes |
| A mutation tool for client TypeScript. | not planned |

## Current workflow this builds on (verified 2026-11-13)

- **A test removal is already adjudicated at merge.** `mr-audit` `audit_gating` lists deleted test
  files, removed assertion lines and added skip markers as `removed_checks`, and the supervisor
  adjudicates each under `standards/testing-tdd.md` §Deleting a check is legitimate (named reason,
  survivor named by path and test name; a protected category needs a demonstrated survivor and an
  adjudicator who is not the deleter).
- **Dead code and its tests leave through `structure.spec.md`.** A `type: refactor` slice carries
  `moved-tests:` rows in its PR body, one per deleted or re-pointed test, confirmed at merge
  (`standards/spec-driven.md` §Refactor slices). The supervisor's structural share schedules that
  file; a `type: design` slice decides which of several near-duplicates survives, and the
  supervisor sections the extractions its plan file lists.
- **The structure pass already has the spec author grep for pins** (`milestone-loop-prompt.md`
  step 2: tests that read moved source as text, `.cargo/mutants.toml` entries, e2e helpers).
- **Milestone close has no mechanical hook.** It is one prose step in
  `mr-supervisor-prompt-native.md` §Fan-out. That prompt is 15,796 bytes against `mr-selfcheck`'s
  15,360-byte note and, with `mr-brief-template.md`, `standards/`, `.claude/` and
  `build-loop-prompt.md`, is closed to supervisor-launched harness slices without an `mr-ask-drew`
  approval. `milestone-loop-prompt.md` is not on that list.
- **One source-text scan is sanctioned.** Harness `docs/DECISIONS.md` "A report-only scan lists
  history-style comments a diff adds" says it "does not license others" and rules out an inline
  marker written for a tool to parse. The census is a second report-only scan; `tp-1` records it
  and brings that entry in line (operator decision D4).
- **`mr-touches widen`** lets a run add a measured pin file to its own `touches:` and records it
  in `gates/<slice>.widened.jsonl`. It had not run in a live tick when this was written.

## Design

### Where the step sits

```
milestone elaboration (milestone-loop-prompt.md, structure pass)
  └─ mr-prune census --spec <the spec> --record <milestone id>     read-only, seconds, no session
       ├─ duplicates row, pair read by the author → `pruned-tests:` line in the section of a slice
       │    that already lists the file; the tester deletes it in that slice; the supervisor
       │    adjudicates it at merge like any removed check (`mr-prune twin` re-checks the claim)
       ├─ orphans row → a `type: refactor` section in structure.spec.md (code and tests together)
       ├─ orphan-protected, signals, protected-churn → named in the spec's Risks
       └─ totals → one row in memory/projects/prune/trend.jsonl
```

The census runs where the next work is about to read the files: a redundant test costs something
only when a slice reads or edits its file, and a slice that already edits the file removes it
with no extra session, no extra `touches:` and no slice held behind it. A candidate in a file no
coming slice touches stays listed and costs nothing until one does.

The census adds no reason to delete a test and removes none. `standards/testing-tdd.md` stays the
only authority; a spec author who reads a pair the census did not list may still write a deletion
under that rule.

### Candidate kinds and where each goes

| Kind | What the census prints | Where it goes |
|---|---|---|
| Same-block twin | `duplicates` row: candidate, survivor | A `pruned-tests:` line in a slice that already lists the file. |
| Twin in a protected path or name | `protected-twins` row | Nowhere by default. Removing one follows the standard's protected path (demonstrated survivor, separate adjudicator). |
| Identical body in another block of the same file | a count, `identical-other-scope` | Information. Different blocks can carry different hooks and bindings. |
| Bodies that differ only in literals | a count per file, `literal-variants` | Information. |
| Product symbol only tests reach | `orphans` row: symbol, the test files naming it | A `type: refactor` section in `structure.spec.md`; the compiler proves the removal. |
| The same, in a protected path or name | `orphan-protected` row | The spec's Risks, as a defect candidate: a guard nothing calls. Never a deletion. |
| Test file reads a file from disk | `signals: source-text` | The slice that moves the code it reads (existing pin rule). |
| Test file edited often without its subject | `signals: churn`; `protected-churn` when protected | `st-3` and whoever next owns the file. |
| Shared count and roster pins | `protected-churn`, `signals: widened` | `st-3` (design). |
| Retired 1v1 rules | `orphans` | `st-4` (design). |
| Flaky tests | not printed | M-test-health. |

### The twin rule

Two tests are twins when all of these hold at one commit:

1. they are in the same file;
2. they share the same enclosing block: the same Rust `mod`, or the same innermost `describe`
   callback (or both at file level);
3. they have the same declaration form: the same Rust attribute list apart from doc comments, or
   the same vitest call (`it`, `test`, `it.each`…) with a token-identical case table;
4. their bodies are token-identical, with comments and the whitespace between tokens ignored and
   every string, template and numeric literal compared exactly;
5. neither body depends on the test's own name: no `toMatchSnapshot`, `currentTestName` or
   `expect.getState` in TypeScript, no `function_name!` or `insta::` in Rust.

The candidate is the later-defined test and the survivor the earlier. Because the survivor's body
is the same tokens in the same scope, it calls the same helpers and imports, so deleting the
candidate leaves nothing unused for clippy `-D warnings` or `noUnusedLocals` to reject, and
protects whatever the candidate protected. A test the lexer cannot delimit (a `proptest!` body, a
generated test) is counted `unparsed` and appears in no row.

A twin can still be deliberate: two identical tests may exist to prove a second run after the
first. No lexer sees that, so the author reads the pair before writing the row, and a pair kept on
purpose is recorded with `mr-prune keep --file F --test T --reason "…"` in the tracked
`memory/projects/mr-prune-keep.json`, keyed by file, test name and body hash. A kept pair is not
printed again until its body changes.

**Protected tokens** are a second refusal, not the rule: `priv`, `secur`, `auth`, `account`,
`guard`, `lifecycle`, `delet`, `erase`, `anonym`, `export`, `rekey`, `claim`, `oidc`,
`credential`, `owner`, `hidden`, `reaper`, `retain`, `refus`, `reject`, `a11y`, `contrast`,
`i18n`, `catalog`, `locale`, `movement`, `predict`, `reconcil`, `netcode`, `interp`, `parity`,
`determin`, `oracle`, `leak`, matched case-insensitively in the path or either test name. A match
moves the row to `protected-twins`. The list lives in the tool.

### The orphan rule

A product symbol (a Rust `pub` or `pub(crate)` item in `game-core/src` or `server-module/src`, an
`export` in `client/src`) is an orphan when, with comments and `use` / `import` / `export … from`
statements stripped:

- no tracked production file other than its own names it (test files, `benches/`, and inline
  `#[cfg(test)]` modules are not production; `client/e2e/**`, `evals/**`, `client-wasm/`,
  `sim-harness/`, HTML and config files are); and
- inside its own file it is named by no symbol that has such a reference.

An item carrying an attribute other than `doc`, `inline`, `must_use`, `allow`, `derive` or
`cfg_attr` is an entry point (a reducer, view, table, `wasm_bindgen` export) and is never listed.
An item compiled only under `#[cfg(test)]` outside a test module is listed as `test-only`.

The match is by name, so a name used anywhere in production hides an orphan: the list misses
some and wrongly lists few. A row is a candidate for a `type: refactor` section, where deleting the
symbol either compiles or does not.

### Signals

| Signal | Computed from |
|---|---|
| `source-text` | the test file calls `include_str!`, `read_to_string`, `readFileSync` or `readFile` |
| `churn` | commits among the last 300 on the given ref that changed 12 lines or fewer of the test file and did not change its subject file (same stem without `_tests` / `.test`) |
| `literal-variants` | same-block groups of tests whose bodies are identical once literals are masked: a count |
| `widened` | rows naming the file in `gates/*.widened.jsonl`, when `--mem` is given |

A signal is never a reason to delete a test.

### Totals and the trend row

`census` always prints, per package: product lines, test lines, their ratio, test files, lexed
test count, `unparsed` count, and out-of-scope counts (e2e, evals, inline modules). `--record
<label>` appends that as one JSON row with the commit and the label to
`memory/projects/prune/trend.jsonl` (untracked, like `gates/`; any row can be recomputed from the
commit). `--ci` adds three fields read with one `gh run list` call: wall seconds and conclusion
of the `master` CI run on that commit; the conclusion of the newest completed Nightly (both
mutation gates are zero-miss, so its conclusion is the mutation score); and how many of the last
300 `master` CI runs concluded success on a second or later attempt. Without `gh` the three fields
are null. `mr-prune census` exits 0 whatever it finds: it is a report, and no gate reads it
(`standards/testing-tdd.md`: scores are reports, never gates).

### `mr-prune twin`

`mr-prune twin --repo R --at <sha> --file F --test T --survivor S` prints `PRUNE-TWIN-OK` and
exits 0 when T and S are twins at that commit, else `PRUNE-TWIN-FAIL <rule>` and exits 1. It is
how whoever merges confirms a `pruned-tests:` line against the PR base, the way `moved-tests:`
rows are confirmed. It is not a seeded gate.

## Tester A/B experiment

The experiment (plan: `scratchpad/tester-ab/PLAN.md`) runs shadow testers on the tester-bearing
slices of M-trade-sessions (`ts-6b-K`), M-local-play groundwork, M-netcode-presence and
M-econ-onboarding, keeps `.claude/agents/tester.md` frozen, and scores a shadow test `brittle`
when it passes at the slice's merge and fails or stops compiling at the default-branch head when
the analysis runs.

- A removal between those two points can change that score: a shadow test that calls an orphan
  symbol, or edits a pin file that a consolidation rewrites, stops compiling. So `tp-3` (which
  turns the routing on) and the sections `st-3` and `st-4` carry `blocked: tester-ab-close`. The
  supervisor lifts it when `memory/projects/mr-tester-ab.jsonl` holds a `close` row (operator
  decision D3).
- `tp-1` and `tp-2` add a report tool nothing calls. `tp-1` adds one line each to `mr-selfcheck`
  and `memory/projects/.gitignore`, which the experiment's own build also edits; `mr-disjoint`
  serialises the launches.
- No slice here touches `tester.md`, its guards, `mr-spawn`, `mr-audit` or the retro playbook.
- The experiment's close changes the tester's rules and prices bloat. Whether a per-milestone
  prune session is worth building is decided then, from its report and the recorded census rows.

## Risks / flags

- **The yield is small by design.** The census will usually print no `duplicates` row. Its value
  is the orphan list, the pin signals for `st-3`, and a trend the operator can read.
- **The larger removals are the two design slices**, which wait on the experiment and are built by
  the structural share, not by this milestone. `st-4`'s extractions may remove several thousand
  test lines with the code they test; `st-3` changes where literals live and removes no gate.
- **Name matching is approximate** in the orphan rule (trait methods, macro-built names, a name
  reused for two things). Rows are candidates; the refactor slice's compile is the proof.
- **The lexers are hand-written** for two languages. Anything they cannot delimit is `unparsed` and
  never a candidate; the selftest fixtures are cut from real files, including the three shapes
  that fooled a looser comparison (`boxView`/`evolutionView`, the `registry.test.ts` `it.each`
  pair, a whitespace-only literal difference).
- **A second source-text scan.** Recorded as a decision with what it rules out: promoting it to a
  gate, an inline keep marker, and using a row as a deletion reason by itself.
- **The elaboration step is one prose bullet.** Nothing fails when an author skips it; the recorded
  trend row is the trace that it ran.
- **Stale text elsewhere:** `standards/testing-tdd.md` and `PLAN.md` call the server mutation gate a
  "cap"; the game's decision made both gates zero-tolerance. Not edited here (anti-reaccretion).

### Considered and rejected

- **The tool applies each deletion and a check compares the PR diff with the tool's output.**
  A twin's survivor is token-identical in the same block, so the deletion strands no helper or
  import, which was the case that forced edits outside the test. The deletion rides in a feature
  slice whose diff legitimately holds other test edits, so "diff equals tool output" cannot be a
  gate there; and at zero twins today an `apply` command would have nothing to apply.
  `mr-prune twin` gives the merger a one-command check of the claim instead.
- **A rule that recognises rejection tests through helper calls** (`s2_refused`-style helpers
  appear 42 times in `trading_session_tests.rs`). No rule here depends on recognising a rejection
  test: the only removal class keeps an identical test in place.
- **Literal-variant merges in vitest only, as `it.each` with a row-per-tuple check.** Cut with the
  Rust case: a merged test changes test names every later slice selects on, for a count of lines
  nobody has priced.
- **One routine-tier trial PR over M-battle-tactics removing duplicates and retired-battle
  tests.** The strict twin count is zero and the one true duplicate is not in a file that
  milestone changed. The retired rules are kept on purpose by a recorded decision, are executed
  as oracles by `tactics/resolve_tests.rs`, `tactics/queue_tests.rs` and `tactics/upkeep_tests.rs`,
  and feed the deferred depth waves; `monster/battle_redteam_tests.rs` holds tests written for
  past findings. That needs `st-4`'s design read, not a routine deletion.
- **A manual replay command.** Cut with every class it could have checked.
- **Printing the census at milestone close.** Close has no mechanical hook and the supervisor
  prompt is closed and over its size note. The census reads any commit, so a close-time row can be
  recomputed later; elaboration is where a candidate can be acted on at no cost (D7 offers the
  close-time clause).

## Operator decisions (defaults stand unless overruled)

| # | Question | Default |
|---|---|---|
| D1 | PLAN §9 position. | New item 5, after M-econ-onboarding (the last tester A/B sample milestone) and before M-identity-handles. Alternatives: beside M-test-health; or earlier, with `tp-3` still blocked. |
| D2 | A per-milestone prune session, as first proposed. | Not built. Census at elaboration; removals ride in slices that already touch the file. Revisit at the A/B experiment's close. Alternative: build a capped session now, against the review's cost finding. |
| D3 | Removals while the A/B experiment runs. | Held: `tp-3`, `st-3` and `st-4` are `blocked: tester-ab-close`. Alternative: unblock `st-3` and `st-4` now; they are docs-only, and only their extractions would wait. |
| D4 | A second report-only source-text scan in the harness. | Yes, recorded in `docs/DECISIONS.md`; never a gate. Alternative: no tool; authors grep by hand. |
| D5 | Mutation results as a reason to remove a test; a TypeScript mutation tool. | No to both. |
| D6 | What stays of the 1v1 battle rules. | `st-4` decides and records it; stored types and rules the tactical engine or its depth waves use stay. Alternative: rule now that all of `combat::*` stays, and delete `st-4`. |
| D7 | A clause in the supervisor prompt so the close PR records a census row. | None (needs `mr-ask-drew` approval and prompt room). |

## Post-integration verification (after `tp-3`)

- `mr-selfcheck` run from the main checkout prints SELFCHECK-OK.
- `mr-prune census --repo projects/monster-realm --at origin/master` exits 0 and leaves the game
  repository's worktree, index and refs unchanged. Read against the hand measurements above: no
  `duplicates` row for the `boxView`/`evolutionView` pair or the `registry.test.ts` pair; the
  `camera.test.ts` pair counted under `identical-other-scope`; `resolve_turn` under `orphans`.
- The first milestone elaborated after `tp-3` has one row in `prune/trend.jsonl` and its spec names
  the census rows it acted on.
- Lasting decision: harness `docs/DECISIONS.md` "The test census is a report read at milestone
  elaboration" (what it lists, that a row is never a reason, the twin rule, the keep file, what
  it rules out, and the A/B close as the point to revisit a prune session).
- `structure.spec.md` carries `st-3` and `st-4`; their blocks lift on the experiment's close row.

## Slices

Order: tp-1 → tp-2 → tp-3. All three are harness slices; tp-1 and tp-2 edit
`memory/projects/mr-prune`, so they are serial. A harness slice's gate is `mr-selfcheck` plus
`mr-prune --selftest`, run from the worktree copy; each criterion is proved by a selftest fixture
named after its id, over temporary git repositories. The tool reads the game repo through `git`
object reads at a commit and never checks it out.

### tp-1 — `mr-prune`: test listing, twins, keep file, totals
type: feature · tier: hard
touches: memory/projects/mr-prune, memory/projects/mr-prune-keep.json, memory/projects/fixtures/prune/*, memory/projects/mr-selfcheck, memory/projects/.gitignore, docs/DECISIONS.md
after: []

A python tool in the house form (polyglot guard line, `/usr/bin/python3`, flags in the header
comment, `--selftest`). Subcommands here: `census` (sections `totals`, `duplicates`,
`protected-twins`, counts), `twin`, `keep`. `mr-prune-keep.json` starts as `{}`. `.gitignore`
gains `prune/`; `mr-selfcheck` gains the selftest line. `docs/DECISIONS.md` gains the entry named
in §Post-integration verification, and the sentence in "A report-only scan lists history-style comments a diff adds" that calls that
scan the only one is brought in line with it. Eligible test files are `game-core/src/**/*_tests.rs`,
`game-core/tests/*.rs`, `server-module/src/**/*_tests.rs` and `client/src/**/*.test.ts`.

- **TP1-A1:** WHEN two tests in one file share the same enclosing block and declaration form and
  their bodies are token-identical, comments and whitespace between tokens ignored, THE tool SHALL
  print one `duplicates` row naming the later-defined test as candidate and the earlier as
  survivor.

- **TP1-A2:** WHEN two bodies differ in any string, template or numeric literal, including in
  whitespace inside a string, THE tool SHALL NOT print a `duplicates` row for them.

- **TP1-A3:** WHEN two tests with token-identical bodies are in different files THE tool SHALL NOT
  print a `duplicates` row for them.

- **TP1-A4:** WHEN two tests with token-identical bodies are in different enclosing blocks of one
  file THE tool SHALL count them under `identical-other-scope` and print no `duplicates` row.

- **TP1-A5:** WHEN two `it.each` or `test.each` tests have token-identical callbacks and different
  case tables, or two Rust tests have token-identical bodies and different attribute lists, THE
  tool SHALL NOT print a `duplicates` row for them.

- **TP1-A6:** WHEN a body contains `toMatchSnapshot`, `currentTestName`, `expect.getState`,
  `function_name!` or `insta::` THE tool SHALL NOT print a `duplicates` row for its test.

- **TP1-A7:** WHEN a twin's path or either test name carries a protected token THE tool SHALL print
  the pair under `protected-twins` and not under `duplicates`.

- **TP1-A8:** WHEN the tool cannot delimit a test's body THE tool SHALL count it `unparsed` and
  print no row naming it.

- **TP1-A9:** WHEN the keep file holds a candidate's file, test name and current body hash THE tool
  SHALL omit its row and add one to the `kept` count.

- **TP1-A10:** WHEN a kept candidate's body hash differs from the recorded one THE tool SHALL print
  its row again.

- **TP1-A11:** WHEN `mr-prune twin` is given a candidate and a survivor that are twins at the
  commit THE tool SHALL print `PRUNE-TWIN-OK` and exit 0.

- **TP1-A12:** WHEN `mr-prune twin` is given a pair that breaks a twin rule, or a test missing at
  the commit, THE tool SHALL print `PRUNE-TWIN-FAIL` with the rule and exit 1.

- **TP1-A13:** WHEN `mr-prune census --repo <path> --at <sha>` runs THE tool SHALL print, per
  package, product lines, test lines, their ratio, test files, test count, `unparsed` count and
  the out-of-scope counts, and exit 0.

- **TP1-A14:** WHEN `census` runs with `--record <label>` THE tool SHALL append exactly one row with
  the commit, the label and the totals to `prune/trend.jsonl`.

- **TP1-A15:** WHEN `census`, `twin` or `keep` finishes THE inspected repository's worktree, index
  and refs SHALL be unchanged.

- **TP1-A16:** WHEN `mr-selfcheck` runs THE check SHALL run `mr-prune --selftest` and print
  SELFCHECK-OK.

Confirmed by reading at merge, not by a criterion: the fixtures include bodies cut from
`client/src/ui/boxView.test.ts` and `ui/evolutionView.test.ts`, `render/art/registry.test.ts`,
`render/camera.test.ts` and `ui/renameModel.test.ts`; the decision entry states what the scan
rules out.

### tp-2 — `mr-prune`: orphans, signals, spec scope, CI fields
type: feature · tier: routine
touches: memory/projects/mr-prune, memory/projects/fixtures/prune/*
after: [tp-1]

Adds the `orphans`, `orphan-protected`, `signals` and `protected-churn` sections, `--spec`,
`--mem` and `--ci`.

- **TP2-A1:** WHEN a product symbol is named by no production file other than its own, and inside
  its own file by no symbol that is, comments and `use`, `import` and `export … from` statements
  ignored, THE tool SHALL print one `orphans` row with the symbol and the test files that name it.

- **TP2-A2:** WHEN a symbol is named only by test files, `benches/` and inline `#[cfg(test)]`
  modules THE tool SHALL treat it as having no production reference.

- **TP2-A3:** WHEN a symbol is named in `client/e2e/**`, `evals/**`, `client-wasm/` or
  `sim-harness/` THE tool SHALL NOT list it.

- **TP2-A4:** WHEN an item carries an attribute other than `doc`, `inline`, `must_use`, `allow`,
  `derive` or `cfg_attr` THE tool SHALL NOT list it.

- **TP2-A5:** WHEN an item outside a test module compiles only under `#[cfg(test)]` THE tool SHALL
  list it as `test-only`.

- **TP2-A6:** WHEN an orphan's path or name carries a protected token THE tool SHALL print it under
  `orphan-protected` and not under `orphans`.

- **TP2-A7:** WHEN an eligible test file calls `include_str!`, `read_to_string`, `readFileSync` or
  `readFile` THE tool SHALL print it under `signals` as `source-text`.

- **TP2-A8:** WHEN commits among the last 300 on the given ref changed 12 lines or fewer of a test
  file without changing its subject file THE tool SHALL print the file under `signals` with that
  commit count as `churn`.

- **TP2-A9:** WHEN a file with a `churn` signal carries a protected token in its path THE tool SHALL
  also print it under `protected-churn`.

- **TP2-A10:** WHEN tests in one block have bodies identical once literals are masked THE tool SHALL
  add the group to the file's `literal-variants` count and print no row naming a test.

- **TP2-A11:** WHEN `--mem <dir>` is given and `<dir>/gates/*.widened.jsonl` holds rows naming a
  test file THE tool SHALL print the file under `signals` with that row count as `widened`.

- **TP2-A12:** WHEN `census --spec <file>` runs THE tool SHALL print rows only for files that match
  a `touches:` entry of that file, each with the slice ids whose `touches:` match it.

- **TP2-A13:** WHEN `--ci` is given and `gh` answers THE recorded row SHALL carry the CI run's wall
  seconds and conclusion for the commit, the newest completed Nightly's conclusion, and the count
  of rerun-to-green `master` CI runs among the last 300.

- **TP2-A14:** WHEN `--ci` is given and `gh` is absent from `PATH` or fails THE tool SHALL record
  those three fields as null and exit 0.

Confirmed by reading at merge, not by a criterion: run on the game's `origin/master`, the
`orphans` section lists `resolve_turn` and the `signals` section lists
`client/src/ui/i18n/catalog.test.ts`.

### tp-3 — the census is a step of milestone elaboration
type: feature · tier: routine
blocked: tester-ab-close
touches: specs/monster-realm-v2/milestone-loop-prompt.md, memory/projects/mr-native-supervisor-README.md
after: [tp-2]

Docs only. The structure pass in `milestone-loop-prompt.md` gains one bullet, and the README's
tool list gains `mr-prune`. The bullet:

> Run `memory/projects/mr-prune census --spec <this spec> --mem memory/projects --ci --record
> <milestone id>` against the game repo's `origin/master`. Its rows are candidates, never reasons
> (`standards/testing-tdd.md` §Deleting a check). A `duplicates` row whose pair you have read goes
> into the section of a slice that already lists the file, as a line `pruned-tests: <path> ::
> <test> -> <path> :: <surviving test>`, with "confirmed at merge: `mr-prune twin` on the PR
> base"; a pair kept on purpose is recorded with `mr-prune keep`. An `orphans` row becomes a
> `type: refactor` section in `structure.spec.md` that removes the symbol and its tests together,
> inside the three-section limit. `orphan-protected`, `signals` and `protected-churn` rows are
> named in the spec's Risks. A `duplicates` row never gets a slice of its own.

The first run after the block lifts records a row labelled `baseline`.

- **TP3-A1:** WHEN `mr-selfcheck` runs from the worktree THE check SHALL print SELFCHECK-OK.

Confirmed by reading at merge, not by a criterion: the bullet sits in the structure pass and
matches the text above; `prune/trend.jsonl` in the main checkout holds the `baseline` row; the
README names the three subcommands.
