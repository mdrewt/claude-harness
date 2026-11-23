# lpw-30 plan — the mutation gates judge rules, not log lines

Spec: M-local-play.spec.md §lpw-30 (feature, hard). Touches: .cargo/mutants.toml, justfile,
.github/workflows/nightly.yml, .github/workflows/ci.yml, CONTRIBUTING.md, docs/DECISIONS.md.

## Measured facts (2026-11-22, origin/master eb3cf06c)
- `cargo mutants --list -p monster-realm-module`: 2106 mutants; 15 of them in the four functions
  (json_escape 12, log_reject 1, mr_log 1, mr_log_breadcrumb 1). Listing takes 0.2 s.
- Every non-test caller of `guards::json_escape` feeds a log line.
- Nightly server shards: 25-37 min each; master has 0 server survivors.
- Log-sink tests (8 files): every one asserts an `evt` value; Alloy (`ops/observability/alloy/config.alloy`)
  extracts `evt` from every module JSON line into a label and `mr_log_events_total`, the relay parses
  `sched`/`cause`/`phase`. So no test asserts only text no tool parses: **zero deletions, no widening**.
- No eval reads the workflows; `scripts/ci-parity.test.mjs` needs only (a) every `ci:` recipe as a
  step and (b) every job running `just` to use `./.github/actions/tools`.

## Changes
1. `.cargo/mutants.toml`: two `exclude_re` rows keyed by file + function name (no line/column),
   covering the body replacement and every in-body mutant of `guards::{json_escape,log_reject}`
   and `observability::{mr_log,mr_log_breadcrumb}`; one-line reason. Header comment rewritten
   (the "log lines are killed, never excluded" / "server gate is zero-tolerance" prose).
2. `justfile`:
   - `mutate-diff base="origin/master" package=""`: `package` empty = both crates (unchanged);
     `monster-realm-module` / `game-core` restricts the git diff path and `-p`. Unknown = exit 64.
   - `mutate-server shard=""`: a report — lists survivors, exits 0 on a verdict (0/2/3); still
     fails on a non-verdict cargo-mutants exit or a missing missed.txt (a broken sweep is not a report).
3. `ci.yml`: job `mutation-diff` (pull_request only, fetch-depth 0, cargo-mutants 27.1.0 + nextest,
   tools action): `just mutate-diff origin/master monster-realm-module`; uploads mutants.out.
4. `nightly.yml`: second cron (weekly) + `workflow_dispatch` input `suite` (nightly |
   server-mutation-sweep). Nightly jobs + notify skip on the weekly event / sweep dispatch;
   `mutation-server` (8 shards, unchanged) runs only on them; new `mutation-server-report` job
   downloads the shard artifacts and files ONE issue (comment on the open one, else create) on the
   default branch when survivors > 0; any other branch = dry-run to the log + step summary.
   `mutation-server` leaves notify's `needs`.
5. `docs/DECISIONS.md`: rewrite "The nightly mutation gates run sharded and both are zero-tolerance"
   in place (new title), incl. the accepted gap (diff gate misses a test weakened/deleted with no
   source change; the weekly report is read for it).
6. `CONTRIBUTING.md`: rewrite the survivor rule (game-core nightly zero; server PR diff zero; weekly
   report = candidates).

## Gates
- lpw-30.1: CHECK `cargo mutants --list -p monster-realm-module`, EXPECT a whole-output regex:
  none of the four functions' mutants AND positive controls (json_escape_into, build_log_line,
  require_owner still listed). RED on master (verified). No in-repo test: testing-tdd.md forbids a
  check whose subject is a gate's config; the config is consumed only through cargo-mutants.
- Runs (PR body): PR run with a planted, never-merged server survivor → mutation-diff red; clean
  push → green; workflow_dispatch suite=server-mutation-sweep at the planted commit → exits 0,
  survivors listed, report step dry-run.

## Tester
Opus tester: adjudicate (a) no in-repo test for lpw-30.1 + CHECK vacuity review, (b) the zero-deletion
inventory. Writes findings, no tests (CI wiring and gate scripts are not tested per testing-tdd.md).

## Follow-up notes (mr-gates notes)
- README.md:127 and .claude/agents/verifier.md:13 call mutate-server a nightly check (outside touches).
