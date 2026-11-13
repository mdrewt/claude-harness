# Spec: M-test-pruning — a test census at milestone close and elaboration

**Status:** elaborated 2026-11-13 against monster-realm `master` @ `1ea867a3` and harness `main` @
`24872ed`, revised after adversarial review · 5 slices, head `tp-1`, closes when `tp-3` and
`tp-5` are both built ·
**Project:** harness loop tooling (`memory/projects/`, `specs/`, `docs/`); no game file is edited
by this milestone · **Source:** operator request 2026-11-13, and the operator's question of the
same day that put the look at milestone close (D8) · **Depends on:** `tp-3` and the two
`structure.spec.md` sections this spec's PR adds (`st-3`, `st-4`) carry
`blocked: tester-ab-close`; `tp-4` and `tp-5` are not blocked, and while the block stands they
record and open no removal (§Tester A/B experiment).
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

- **A milestone's tests do not exist when it is planned.** They are written slice by slice, so a
  census run only at elaboration sees them first when the next milestone is planned, acts on one
  only if a later slice happens to list its file, and never reads what one milestone added as a
  set. The point at which that set is complete and nothing else has yet built on it is the merge
  of the milestone's last slice.

So this milestone does not add a prune session. It adds a **census**: a read-only report of
candidates and of the suite's size, run at two points. **At milestone close** it looks: scoped to
the commits of the milestone's own slices, it records what the milestone added and lists the
candidates in the files it changed. **At milestone elaboration** it acts: the spec author routes
the rows for the files the coming slices list through channels that already exist. A close
candidate in a file no specced slice lists goes to the standing structural queue instead of
waiting for a slice that may never come. How many tests a slice writes is the tester's rules,
which the tester A/B experiment measures and will change.

## Scope

**In:** the report tool `memory/projects/mr-prune` (`census`, `twin`, `keep`, `close`); one bullet
in `milestone-loop-prompt.md`'s structure pass; a hook on `mr-record ledger`'s MERGED row and one
field in `mr-situation`'s bundle, which run and surface the close census with no supervisor-prompt
text; one clause in `structure.spec.md`'s "Written by" rule; a harness `docs/DECISIONS.md` entry; two
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
- **Milestone close is one prose step** in `mr-supervisor-prompt-native.md` §Fan-out ("Milestone's
  last slice merged → a LATER tick's action, doc-only PRs…"). That prompt is 15,796 bytes against
  `mr-selfcheck`'s 15,360-byte note and, with `mr-brief-template.md`, `standards/`, `.claude/` and
  `build-loop-prompt.md`, is closed to supervisor-launched harness slices without an `mr-ask-drew`
  approval. `milestone-loop-prompt.md`, `structure.spec.md` and the `mr-*` tools are not on that
  list.
- **Two tools already run at the right moments.** `mr-record ledger` writes every slice's MERGED
  row and already hosts a hook there (`gates-rotate`, "the merge-time close point"), written so
  that no failure in the hook costs the row. `mr-native-tick.sh` puts `mr-situation`'s bundle in
  front of every tick, including the later tick that opens the close PRs.
- **What a milestone's slices merged is already recorded twice.** The usage ledger holds one
  MERGED row per slice id, and the game repo's `origin/master` carries one squash subject per
  slice, `<type>(<scope>): <slice id> — … (#N)`, which is how `structure.spec.md` defines "built".
- **One source-text scan is sanctioned.** Harness `docs/DECISIONS.md` "A report-only scan lists
  history-style comments a diff adds" says it "does not license others" and rules out an inline
  marker written for a tool to parse. The census is a second report-only scan; `tp-1` records it
  and brings that entry in line (operator decision D4).
- **`mr-touches widen`** lets a run add a measured pin file to its own `touches:` and records it
  in `gates/<slice>.widened.jsonl`. It had not run in a live tick when this was written.

## Design

### Where the step sits

```
milestone close: the MERGED ledger row of the milestone's last slice (mr-record ledger, hook)
  └─ mr-prune close --spec <the milestone's spec>                  read-only, seconds, no session
       ├─ totals + what the milestone's own commits added → one row in prune/trend.jsonl
       ├─ candidates in the files those commits changed → prune/close/<milestone>.json, each with
       │    a route:
       │      slice      an unbuilt slice of another spec lists the file → acted on at that
       │                 spec's elaboration (below)
       │      structure  no specced slice lists it → one `type: refactor` section, written to
       │                 prune/close/<milestone>.section.md; mr-situation's `prune_close` field
       │                 shows it to the tick that opens the close PR, which appends it to
       │                 structure.spec.md
       │      report     protected rows and signals: recorded, never sectioned
       └─ while the tester A/B experiment is open: the row and the candidates, no section file

milestone elaboration (milestone-loop-prompt.md, structure pass)
  └─ mr-prune census --spec <the spec> --record <milestone id>     read-only, seconds, no session
       ├─ duplicates row, pair read by the author → `pruned-tests:` line in the section of a slice
       │    that already lists the file; the tester deletes it in that slice; the supervisor
       │    adjudicates it at merge like any removed check (`mr-prune twin` re-checks the claim)
       ├─ orphans row → a `type: refactor` section in structure.spec.md (code and tests together)
       ├─ orphan-protected, signals, protected-churn → named in the spec's Risks
       └─ totals → one row in memory/projects/prune/trend.jsonl
```

The look is at close because that is the first commit at which everything a milestone added
exists, and the only time it is read as a set. The act is at elaboration or in the structural
queue because a removal needs a slice that owns the file: a redundant test costs something only
when a slice reads or edits its file, and a slice that already edits the file removes it with no
extra session, no extra `touches:` and no slice held behind it. The close census deletes nothing
and no gate reads it.

### The close census

**Which commits are the milestone's.** The slice ids are the `### <id> — ` headings under the
spec's `## Slices`. The milestone's commits are the commits reachable from the game repo's
`origin/master` whose subject is a Conventional Commit subject naming one of those ids as
`<slice id> — `, less any commit a later commit says it reverts. This is the rule
`structure.spec.md` uses for "built", read from the squash subjects the supervisor already writes
at every merge. It is a set of commits, not a range: slices of other milestones, structural-share
refactors and `ci-fix-<utc>` runs merge between a milestone's slices, and a first-to-last range
would count their tests as this milestone's. A slice id with no such commit (a harness slice, a
doc-only slice) is listed in the row as unmatched.

**What the row holds.** The trend row of §Totals and the trend row, labelled with the spec's file
stem, plus a `close` object: each slice id with its commit; the unmatched ids; test lines and
product lines added and removed, summed from `git show --numstat` over the set; the ratio of test
lines to product lines, at `origin/master`, over the files the set changed; and how many of the
changed test files carry each signal (`source-text`, `churn`, `protected-churn`, `widened`).

**Which candidates are listed.** The `duplicates`, `protected-twins`, `orphans` and
`orphan-protected` rows of a census at `origin/master`, kept when the row's files meet the files
the set changed. A twin's file is its test file. An orphan's files are the file that defines the
symbol and the test files that name it.

**Routes.** Every listed row gets one:

| Route | When | What happens |
|---|---|---|
| `slice` | A file of a `duplicates` or `orphans` row matches a `touches:` entry of a slice in another `*.spec.md` of the corpus, and that slice has no commit on `origin/master`. The row records the spec and the slice id. | Nothing at close. That spec's elaboration census prints the row for its author (`--spec` selects by the same `touches:`). |
| `structure` | A `duplicates` or `orphans` row no such slice lists, whose own files number 12 or fewer. | Goes into the close's one section, inside the cap. |
| `report` | `protected-twins`, `orphan-protected`, every signal, and an `orphans` row wider than 12 files. | Recorded in the close file. Removing a protected test follows the standard's protected path, and a wide orphan is a design question (`st-4` is the standing case). |

**The section.** One `type: refactor · tier: routine` section per close, in the shape
`structure.spec.md` sets, written to `prune/close/<milestone>.section.md` with the id left as
`st-<n>` for whoever appends it. Its `touches:` are the files of its rows. Each row names the
three things the deletion rule asks for: the reason (a same-block twin; a symbol no production
file names), the surviving check (the twin's survivor by path and test name; for an orphan, the
symbol whose removal the compiler proves and the suites that still run), and the second party
(the supervisor at merge, who confirms each twin with `mr-prune twin` on the PR base and each
`moved-tests:` row, and is not the tester who made the deletion). The run that builds the section
reads each pair and each symbol's tests first and removes only the rows it confirms; a row it
does not confirm stays, with its reason in the PR body, and a pair kept on purpose is then
recorded with `mr-prune keep`. The section's one criterion is the suites of the listed files'
packages passing.

**The cap.** A section holds at most 6 rows and 12 files, twins before orphans, each kind by path
then name. Rows that do not fit are marked `over-cap` in the close file; a later census finds them
again, because every row is recomputed from the code. When no row is routed `structure`, no
section file is written and the close PR adds nothing to `structure.spec.md`.

**While the tester A/B experiment is open.** `mr-prune close` writes the row and the close file
and no section file until `memory/projects/mr-tester-ab.jsonl` holds a `close` row, the same
condition that lifts `blocked: tester-ab-close`. Recording changes nothing a shadow test compiles
against.

**How the close step runs it.** `mr-record ledger` runs `mr-prune close` from its MERGED-row hook
when the row just written completes a milestone: every slice id of the spec that holds the merged
slice now has a MERGED row. The supervisor writes that row at every merge, so no prompt text asks
for the census. The hook is total, like `gates-rotate` beside it: a failure prints a warning and
the row stands. `mr-situation` then lists, under `prune_close`, each section file whose
milestone's spec is still in the corpus, with one line saying where it goes; the entry
disappears when the close PR deletes the spec. `structure.spec.md`'s "Written by" rule names this
source, so the section is appended under that file's own authority. `mr-supervisor-prompt-native.md`
stays at 15,796 bytes.

The census adds no reason to delete a test and removes none. `standards/testing-tdd.md` stays the
only authority; a spec author who reads a pair the census did not list may still write a deletion
under that rule.

### Candidate kinds and where each goes

| Kind | What the census prints | Where it goes |
|---|---|---|
| Same-block twin | `duplicates` row: candidate, survivor | At elaboration: a `pruned-tests:` line in a slice that already lists the file. At close: route `slice` when an unbuilt specced slice lists the file, else the close's `structure` section. |
| Twin in a protected path or name | `protected-twins` row | Nowhere by default. Removing one follows the standard's protected path (demonstrated survivor, separate adjudicator). |
| Identical body in another block of the same file | a count, `identical-other-scope` | Information. Different blocks can carry different hooks and bindings. |
| Bodies that differ only in literals | a count per file, `literal-variants` | Information. |
| Product symbol only tests reach | `orphans` row: symbol, the test files naming it | A `type: refactor` section in `structure.spec.md`; the compiler proves the removal. At close: route `slice` when an unbuilt specced slice lists one of its files, else the close's `structure` section (12 files or fewer) or `report` (wider). |
| The same, in a protected path or name | `orphan-protected` row | The spec's Risks, as a defect candidate: a guard nothing calls. Never a deletion. |
| Test file reads a file from disk | `signals: source-text` | The slice that moves the code it reads (existing pin rule). |
| Test file edited often without its subject | `signals: churn`; `protected-churn` when protected | `st-3` and whoever next owns the file. |
| Shared count and roster pins | `protected-churn`, `signals: widened` | `st-3` (design). |
| Retired 1v1 rules | `orphans` | `st-4` (design). |
| Flaky tests | not printed | M-test-health. |
| What one milestone added | the `close` object of its trend row | The operator and the tester A/B report read the trend. |

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
are null. `mr-prune close` appends the same row with a `close` object (§The close census), once
per milestone. `mr-prune census` and `mr-prune close` exit 0 whatever they find: each is a
report, and no gate reads it (`standards/testing-tdd.md`: scores are reports, never gates).

### `mr-prune twin`

`mr-prune twin --repo R --at <sha> --file F --test T --survivor S` prints `PRUNE-TWIN-OK` and
exits 0 when T and S are twins at that commit, else `PRUNE-TWIN-FAIL <rule>` and exits 1. It is
how whoever merges confirms a `pruned-tests:` line against the PR base, the way `moved-tests:`
rows are confirmed. It is not a seeded gate.

## Tester A/B experiment

The experiment (its rules are in the header of `memory/projects/mr-tester-ab`) runs shadow testers on the tester-bearing
slices of M-trade-sessions (`ts-6b-K`), M-local-play groundwork, M-netcode-presence and
M-econ-onboarding, keeps `.claude/agents/tester.md` frozen, and scores a shadow test `brittle`
when it passes at the slice's merge and fails or stops compiling at the default-branch head when
the analysis runs.

- A removal between those two points can change that score: a shadow test that calls an orphan
  symbol, or edits a pin file that a consolidation rewrites, stops compiling. So `tp-3` (which
  turns the routing on) and the sections `st-3` and `st-4` carry `blocked: tester-ab-close`. The
  supervisor lifts it when `memory/projects/mr-tester-ab.jsonl` holds a `close` row (operator
  decision D3). The experiment writes that row itself: every pre-merge audit tries its close
  conditions (`mr-tester-ab close-check`), so the loop-active-days backstop closes it after its
  last slice has merged. An experiment that never ran cannot hold the block: it also lifts once
  M-econ-onboarding, the last sample milestone, has closed while `mr-tester-ab.config.json` is
  absent or reads `enabled: false`. An enabled experiment that is still open when that
  milestone closes has no slice left to wait for: the supervisor runs
  `$MEM/mr-tester-ab close-check --sample-done`, which writes the `close` row and queues the
  close retro, and the block lifts by the first rule.
- `tp-1` and `tp-2` add a report tool nothing calls. `tp-1` adds one line each to `mr-selfcheck`
  and `memory/projects/.gitignore`, which the experiment's own build also edits; `mr-disjoint`
  serialises the launches.
- `tp-4` and `tp-5` make the close census run while the experiment is open. It reads commits and
  writes two untracked files under `prune/`; it opens no section until the `close` row exists, so
  nothing a shadow test calls or edits moves. The per-milestone rows it records over the sample
  milestones are trend data the experiment's close reads beside its own report.
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
- **The close census fires on ledger rows.** A milestone that ends with a slice dropped or never
  merged has no completing MERGED row, so the hook does not run; `mr-prune close --spec` run by
  hand records the same row at any later commit, because the commit set is read from subjects.
- **A subject that omits the slice id hides a commit.** The supervisor writes the squash subject
  in the `<slice id> — ` form at every merge; a slice merged under another subject is listed as
  unmatched in the row, which is where the gap shows.
- **The fold into `structure.spec.md` is a hint, not a gate.** A tick that ignores `prune_close`
  loses the section when the spec is deleted. The close file and the trend row remain, and the
  rows are found again by any later census.
- **A `slice`-routed row can wait on a spec that is already elaborated.** Its slice reads the file
  without the row in front of it. The row stays in the close file and returns in the next census
  that covers the file.
- **A close section mixes files from several modules.** The cap keeps it to one run; its quiet
  window is the union of its files, so a busy file can hold it behind feature work, which is the
  intended order.
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
- **A prune session at milestone close.** The close census gives the look a session would have
  given, for seconds of a tool the merge already runs. A session would still cost tens of dollars
  per milestone to act on a candidate list that is usually empty, and what it deleted would need
  its own PR type, tickets and caps. A row that deserves a removal already has two owners: the
  slice that next lists the file, or one capped section in the structural queue.
- **A clause in the supervisor prompt's milestone-close bullet.** The shortest clause that names
  the tool, its argument and where the section goes ("Before deleting the spec: `$MEM/mr-prune
  close --spec <it>`; append its section file, if any, to `structure.spec.md`.") is 118 bytes in a
  prompt that is 436 bytes over its size note, and the same bytes would have to be cut from another rule. The
  MERGED-row hook and the bundle field cost none (D7).
- **Running the close census from the tick that opens the close PRs.** That tick has no tool call
  of its own to hang it on. The MERGED row of the last slice is written by a tool, at the commit
  the census should read.
- **A first-to-last commit range for "what the milestone added".** Other work merges between a
  milestone's slices; the subject-named set counts only its own.
- **Opening removal sections while the experiment runs.** Covered by D3; the close census records
  and waits.
- **One section per candidate, or no cap.** A close can list more rows than one run removes with
  care, and each section holds a quiet window; one capped section per close keeps the structural
  share for the moves it exists for.

## Operator decisions (defaults stand unless overruled)

| # | Question | Default |
|---|---|---|
| D1 | PLAN §9 position. | New item 5, after M-econ-onboarding (the last tester A/B sample milestone) and before M-identity-handles. Alternatives: beside M-test-health; or earlier, with `tp-3` still blocked. |
| D2 | A per-milestone prune session, as first proposed. | Not built. Census at close and at elaboration; removals ride in slices that already touch the file, or in one capped `structure.spec.md` section per close. Revisit at the A/B experiment's close. Alternative: build a capped session now, against the review's cost finding. |
| D3 | Removals while the A/B experiment runs. | Held: `tp-3`, `st-3` and `st-4` are `blocked: tester-ab-close`. Alternative: unblock `st-3` and `st-4` now; they are docs-only, and only their extractions would wait. |
| D4 | A second report-only source-text scan in the harness. | Yes, recorded in `docs/DECISIONS.md`; never a gate. Alternative: no tool; authors grep by hand. |
| D5 | Mutation results as a reason to remove a test; a TypeScript mutation tool. | No to both. |
| D6 | What stays of the 1v1 battle rules. | `st-4` decides and records it; stored types and rules the tactical engine or its depth waves use stay. Alternative: rule now that all of `combat::*` stays, and delete `st-4`. |
| D7 | A clause in the supervisor prompt so the close PR records a census row. | Decided 2026-11-13: no clause. The operator approved one, paid for by a trim in the same section; the close census runs from `mr-record ledger`'s MERGED-row hook and reaches the close tick through `mr-situation`'s `prune_close` field, so the prompt stays at 15,796 bytes and nothing is trimmed. |
| D8 | When a milestone's own tests are looked at. | Decided 2026-11-13, on the operator's question ("how will the workflow know about which tests to prune at the planning step if the tests aren't written until the slices are implemented?"): look at wrap-up, act at planning. The close census records what the milestone added and its candidates; a candidate no specced slice lists becomes one capped `type: refactor` section per close. |
| D9 | The close section's cap. | 6 rows and 12 files per close, one section; nothing is written when no row qualifies. Alternative: a smaller cap, or rows left to the next elaboration only. |

## Post-integration verification (after `tp-3` and `tp-5`)

- `mr-selfcheck` run from the main checkout prints SELFCHECK-OK.
- `mr-prune census --repo projects/monster-realm --at origin/master` exits 0 and leaves the game
  repository's worktree, index and refs unchanged. Read against the hand measurements above: no
  `duplicates` row for the `boxView`/`evolutionView` pair or the `registry.test.ts` pair; the
  `camera.test.ts` pair counted under `identical-other-scope`; `resolve_turn` under `orphans`.
- The first milestone elaborated after `tp-3` has one row in `prune/trend.jsonl` and its spec names
  the census rows it acted on.
- The first milestone whose last slice merges after `tp-5` has one row with a `close` object in
  `prune/trend.jsonl` and a `prune/close/<milestone>.json`; its slice ids match the squash
  subjects on the game's `origin/master`; and while `mr-tester-ab.jsonl` holds no `close` row
  there is no section file and `mr-situation` prints an empty `prune_close`.
- `wc -c memory/projects/mr-supervisor-prompt-native.md` prints 15796.
- Lasting decision: harness `docs/DECISIONS.md` "The test census is a report: recorded at
  milestone close, acted on at elaboration" (what it lists, that a row is never a reason, the
  twin rule, the keep file, how a milestone's commits are found, the routes and the cap, what it
  rules out, and the A/B close as the point to revisit a prune session).
- `structure.spec.md` carries `st-3` and `st-4`; their blocks lift on the experiment's close row.

## Slices

Order: tp-1 → tp-2 → tp-4 → tp-5; tp-3 follows tp-2 when its block lifts. All five are harness
slices; tp-1, tp-2 and tp-4 edit `memory/projects/mr-prune`, so they are serial. A harness slice's
gate is `mr-selfcheck` plus the `--selftest` of each tool it touches, run from the worktree copy;
each criterion is proved by a selftest fixture named after its id, over temporary git
repositories. The tool reads the game repo through `git`
object reads at a commit and never checks it out.

### tp-1 — `mr-prune`: test listing, twins, keep file, totals
type: feature · tier: hard
touches: memory/projects/mr-prune, memory/projects/mr-prune-keep.json, memory/projects/fixtures/prune/*, memory/projects/mr-selfcheck, memory/projects/.gitignore, docs/DECISIONS.md
after: []

A python tool in the house form (polyglot guard line, `/usr/bin/python3`, flags in the header
comment, `--selftest`). Subcommands here: `census` (sections `totals`, `duplicates`,
`protected-twins`, counts), `twin`, `keep`. `mr-prune-keep.json` starts as `{}`. `.gitignore`
gains `prune/`; `mr-selfcheck` gains the selftest line. `docs/DECISIONS.md` gains the entry named
in §Post-integration verification (`tp-4` adds what it says of the close census), and the sentence in "A report-only scan lists history-style comments a diff adds" that calls that
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
README names the tool's subcommands.

### tp-4 — `mr-prune close`: what a milestone added, its candidates and their routes
type: feature · tier: hard
touches: memory/projects/mr-prune, memory/projects/fixtures/prune/*, docs/DECISIONS.md
after: [tp-2]

Adds the `close` subcommand of §The close census: `mr-prune close --spec <milestone spec> --repo
<path> [--at <ref>] --mem <dir> [--ci]`. The other specs it reads for routes are the `*.spec.md`
files beside `--spec`. It writes only under `<mem>/prune/`. The decision entry `tp-1` wrote gains
how a milestone's commits are found, the routes and the cap.

- **TP4-A1:** WHEN `mr-prune close --spec <file>` runs THE tool SHALL take as the milestone's
  commits exactly the commits reachable from `--at` whose subject is a Conventional Commit subject
  naming `<slice id> — ` for a `###` slice heading under that file's `## Slices`.

- **TP4-A2:** WHEN a later commit reachable from `--at` says it reverts one of those commits THE
  tool SHALL leave the reverted commit out of the set.

- **TP4-A3:** WHEN a commit that names no slice id of the spec lies between two of the milestone's
  commits THE tool SHALL NOT count its files or its lines.

- **TP4-A4:** WHEN `close` runs for a spec with no `close` row yet THE tool SHALL append exactly one
  row to `prune/trend.jsonl` holding the spec's file stem as label, the commit, the totals of
  TP1-A13 and a `close` object.

- **TP4-A5:** WHEN the row is written THE `close` object SHALL hold each matched slice id with its
  commit, the unmatched slice ids, and test lines and product lines added and removed, each summed
  from the per-commit numstat of the set.

- **TP4-A6:** WHEN the row is written THE `close` object SHALL hold the ratio of test lines to
  product lines at `--at` over the files the set changed, and the count of changed test files
  under each of `source-text`, `churn`, `protected-churn` and `widened`.

- **TP4-A7:** WHEN a `duplicates` or `protected-twins` row's test file, or an `orphans` or
  `orphan-protected` row's defining file or a test file naming the symbol, is a file the set
  changed THE tool SHALL list the row in `prune/close/<label>.json`.

- **TP4-A8:** WHEN none of a row's files is a file the set changed THE tool SHALL NOT list the row.

- **TP4-A9:** WHEN a file of a listed `duplicates` or `orphans` row matches a `touches:` entry of a
  slice in another `*.spec.md` beside `--spec`, and no commit reachable from `--at` names that
  slice, THE tool SHALL give the row the route `slice` with that spec and slice id.

- **TP4-A10:** WHEN no such slice lists a file of a listed `duplicates` or `orphans` row and the
  row's own files number 12 or fewer THE tool SHALL give the row the route `structure`.

- **TP4-A11:** WHEN a listed row is `protected-twins` or `orphan-protected`, or is an `orphans` row
  with more than 12 files, THE tool SHALL give it the route `report`.

- **TP4-A12:** WHEN `<mem>/mr-tester-ab.jsonl` is absent or holds no `close` row THE tool SHALL
  write the trend row and the close file and no section file.

- **TP4-A13:** WHEN `<mem>/mr-tester-ab.jsonl` holds a `close` row and at least one row is routed
  `structure` THE tool SHALL write one `prune/close/<label>.section.md` in `structure.spec.md`'s
  section shape, `type: refactor · tier: routine`, whose `touches:` are the files of its rows.

- **TP4-A14:** WHEN the section file is written THE section SHALL name, for each row, its reason,
  its surviving check and the confirmation whoever merges makes.

- **TP4-A15:** WHEN the rows routed `structure` number more than 6 or their files more than 12 THE
  tool SHALL put in the section the rows that fit, twins before orphans and each kind by path then
  name, and mark the rest `over-cap` in the close file.

- **TP4-A16:** WHEN no row is routed `structure` THE tool SHALL write no section file.

- **TP4-A17:** WHEN `prune/trend.jsonl` already holds a `close` row for the label THE tool SHALL
  print `PRUNE-CLOSE-SKIP`, write nothing and exit 0.

- **TP4-A18:** WHEN no commit reachable from `--at` names a slice id of the spec THE tool SHALL
  record the row with every id unmatched, zero line counts and an empty candidate list, and exit 0.

- **TP4-A19:** WHEN `close` finishes THE inspected repository's worktree, index and refs, and every
  file outside `<mem>/prune/`, SHALL be unchanged.

Confirmed by reading at merge, not by a criterion: run by hand with `--mem` pointing at a
temporary directory against the game's `origin/master` and `M-trade-sessions.spec.md` (or the
newest closed milestone's spec from harness history), the matched slice ids are the ones
`git log --oneline` shows; the section text carries no criterion that is a source-text read.

### tp-5 — the merge of a milestone's last slice runs the close census
type: feature · tier: routine
touches: memory/projects/mr-record, memory/projects/mr-situation, memory/projects/mr-selfcheck, specs/monster-realm-v2/structure.spec.md, memory/projects/mr-native-supervisor-README.md
after: [tp-4]

`mr-record ledger` gains a second hook beside `gates-rotate` on a MERGED closing row, and
`mr-situation`'s bundle gains the `prune_close` field. A milestone spec is any `*.spec.md` of the
corpus other than `structure.spec.md` and `residuals.spec.md`. `structure.spec.md`'s "Written by"
rule gains the clause "by the supervisor at a milestone's close, from the section `mr-prune
close` wrote for it (the bundle's `prune_close`; one section per close, appended in the doc-only
PR that deletes the milestone's spec)". The README's tool list names `mr-prune close` and the
field. `mr-supervisor-prompt-native.md` is not edited.

- **TP5-A1:** WHEN `mr-record ledger` appends a MERGED closing row for a slice, and every `###`
  slice heading of the milestone spec that holds that slice now has a MERGED row in the ledger,
  THE tool SHALL run `mr-prune close` for that spec against the game repo's `origin/master`.

- **TP5-A2:** WHEN a slice heading of that spec has no MERGED row THE tool SHALL NOT run
  `mr-prune close`.

- **TP5-A3:** WHEN the merged slice's section is in `structure.spec.md` or `residuals.spec.md`, or
  in no spec, THE tool SHALL NOT run `mr-prune close`.

- **TP5-A4:** WHEN `mr-prune close` is missing, fails or runs past its time limit THE tool SHALL
  leave the ledger row appended, print one `WARN prune-close` line on stderr and exit 0.

- **TP5-A5:** WHEN a fixture ledger is set with `MR_RECORD_LEDGER` and no prune directory is set
  beside it THE tool SHALL NOT run the hook.

- **TP5-A6:** WHEN `prune/close/<label>.section.md` exists and `<label>.spec.md` is in the corpus
  THE bundle SHALL carry one `prune_close` entry with the milestone, the section file's path and
  one line saying it is appended to `structure.spec.md` in the PR that deletes that spec.

- **TP5-A7:** WHEN no section file exists, or its milestone's spec is gone from the corpus, THE
  bundle's `prune_close` SHALL be an empty list.

- **TP5-A8:** WHEN the prune directory is missing or unreadable `mr-situation` SHALL still exit 0
  with valid JSON.

- **TP5-A9:** WHEN `mr-selfcheck` runs from the worktree THE check SHALL print SELFCHECK-OK.

Confirmed by reading at merge, not by a criterion: `structure.spec.md` carries the clause above;
`wc -c memory/projects/mr-supervisor-prompt-native.md` prints 15796 at the PR head; the hook sits
after the row is appended and reported, as `gates-rotate` does.
