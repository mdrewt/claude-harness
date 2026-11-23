# lpw-3 — tester brief

You write the gating tests for slice `lpw-3` of Monster Realm. You do not implement the feature.
Everything you write goes under the slice worktree:

`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-3`

(called `WT` below; every path in this brief is relative to it). It is at `origin/master` today:
none of the production names below exist yet, so your Rust tests will not compile until the
implementer lands them. That is the expected red state. You have no shell; I run everything.

Verification doctrine: `/home/mdrewt/.claude/harness/standards/testing-tdd.md`. The parts that bind
here: a test executes code or diffs a generated artifact; it never reads hand-written source as text,
never pins prose, never checks another check. Expected values come from their owner (the game-core
constants), never a pasted literal. Test names lead with the behaviour; no slice or criterion id in a
test name.

## The criteria (verbatim from the spec)

- **lpw-3.1:** WHEN the module is published to an empty database, THE SYSTEM SHALL hold exactly one `module_info` row whose `protocol` and `min_client_protocol` equal `game_core::PROTOCOL_VERSION` and `game_core::MIN_CLIENT_PROTOCOL`.
- **lpw-3.2:** WHEN the owner's `sync_content` runs on a database whose `module_info` row is missing or holds other numbers, THE SYSTEM SHALL write the module's numbers into exactly one row, whether or not `config.content_version` was current.
- **lpw-3.3:** WHEN `sync_content` runs on a database whose `module_info` row already holds the module's numbers, THE SYSTEM SHALL write no `module_info` row.
- **lpw-3.4:** THE SYSTEM SHALL keep `MIN_CLIENT_PROTOCOL` at or below `PROTOCOL_VERSION` (a `game-core` test).
- **lpw-3.5:** WHEN `just publish` publishes over a database that holds data, THE SYSTEM SHALL then call `sync_content` as the owner and exit non-zero when that call is refused.
- **lpw-3.6:** WHEN `scripts/smoke-republish.sh` republishes over live data with an unchanged `CONTENT_VERSION` and a `module_info` row it first overwrote with other numbers, THE SYSTEM SHALL show the module's numbers again after the owner's `sync_content`.

## Contracts

These names and shapes are fixed. Call exactly these.

```rust
// game-core/src/lib.rs  (implementer adds)
pub const PROTOCOL_VERSION: u32 = 1;
pub const MIN_CLIENT_PROTOCOL: u32 = 1;
#[cfg(test)]
mod protocol_tests;            // -> game-core/src/protocol_tests.rs (YOU create; tests at file top level,
                               //    so a test's id is `protocol_tests::<name>`)

// client-wasm/src/lib.rs  (implementer adds)
#[wasm_bindgen]
#[must_use]
pub fn protocol_version() -> u32;      // game_core::PROTOCOL_VERSION

// server-module/src/schema.rs  (implementer adds)
#[spacetimedb::table(accessor = module_info, public)]
pub struct ModuleInfo {
    #[primary_key]
    pub id: u32,                       // always 0
    pub protocol: u32,
    pub min_client_protocol: u32,
}
// plus a DATA_LIFECYCLE_MANIFEST entry: table "module_info", DeletionPolicy::NotOwned, exportable: false.
// The struct derives nothing beyond what the table macro gives it (no Debug, no PartialEq): compare
// fields, or BSATN bytes as `content_tests.rs::nh_sync::bytes` does.

// server-module/src/module_info.rs  (implementer adds)
pub(crate) fn ensure_module_info(ctx: &ReducerContext);
// Reads row 0. Equal on both numbers: no write. Present and different: ONE update. Missing: ONE insert.
#[cfg(test)]
#[path = "module_info_tests.rs"]
mod module_info_tests;         // -> server-module/src/module_info_tests.rs (YOU create), so a test's
                               //    id is `module_info::module_info_tests::<name>`

// server-module/src/lib.rs  (implementer adds)
mod module_info;
// init:         sync_content_inner(ctx).expect(..);  then  crate::module_info::ensure_module_info(ctx);
// sync_content: the two refusals (zero owner_identity; caller != owner) stay first in the reducer body,
//               then sync_content_inner(ctx)?;  then  crate::module_info::ensure_module_info(ctx);
//               — after the content step and OUTSIDE sync_content_inner's version gate.
```

```just
# justfile  (implementer changes the recipe to exactly these two lines)
publish:
    spacetime publish --module-path server-module {{db}}
    spacetime call {{db}} sync_content
```
`db` is `env_var_or_default("VITE_STDB_DB", "monster-realm")`. No `-s`: both commands use the CLI's
default server and the CLI's own identity, which is what "as the owner" means at this level (no
`--anonymous`, the same server and database as the publish).

Native-host registration of the new table (in any test that lets a write reach it):
`fx.table_keyed::<ModuleInfo, u32>("module_info", "id", |r| r.id).writable().unique()`.

## What to write

### 1. `game-core/src/protocol_tests.rs` (new) — lpw-3.4

One test, `min_client_protocol_never_exceeds_protocol_version`.
`cargo clippy --all-targets -- -D warnings` runs over test code, and `assert!(A <= B)` on two constants
trips `clippy::assertions_on_constants`. Write it so it is a real runtime comparison that lint accepts
(for example bind both through `std::hint::black_box` first), and say in your report which form you
chose so I can confirm it under clippy.

### 2. `server-module/src/module_info_tests.rs` (new) — `ensure_module_info` alone

Model on `nh_ensure_mr_heartbeat_arms_one_interval_singleton` in
`server-module/src/observability_tests.rs` (it calls a `pub(crate)` ensure-helper straight through
the native host with `fx.ctx()`). Header convention: `server-module/src/summary_reaper_tests.rs`
(a `//!` doc saying where the file is declared from, then plain `use` lines and `#[test]` functions;
`super::` is `crate::module_info`). Register ONLY `module_info`. Read
`server-module/src/native_host_tests.rs` for `fixture()`, `Fixture::{ctx, table_keyed, writes_to,
reset_writes, rows_read, reset_reads}` and `Handle::{seed, remove, rows, writable, unique}`.

Facts about that host you must design around:
- A write to a table no test opened `writable` ABORTS the test process. A read through an index no
  test registered returns NO rows, silently. So every "nothing was written" assertion needs a
  pre-assertion that the table is really registered and visible: the seeded row is readable through
  `ctx.db.module_info().id().find(0)` (import the accessor trait: `use crate::schema::module_info;`)
  before the call, and `fx.rows_read("module_info") >= 1` after it.
- `Handle::seed` and `Handle::remove` bypass the write counter (they are fixture edits, not syscalls).
  `fx.writes_to("module_info")` counts insert, update and delete syscalls, including a byte-identical update.

Tests:
- `ensure_module_info_inserts_the_modules_numbers_when_the_row_is_missing` — empty table; after the
  call exactly one row `(0, PROTOCOL_VERSION, MIN_CLIENT_PROTOCOL)` and `writes_to == 1`.
- `ensure_module_info_overwrites_a_row_holding_other_numbers` — three seeded starts, each in a fresh
  state: both numbers differ; only `protocol` differs; only `min_client_protocol` differs. Each ends
  with exactly one row holding the module's numbers and `writes_to == 1` (an update in place, not a
  delete and an insert). Derive the "other" numbers from the constants (`PROTOCOL_VERSION + 7`, …) so
  they can never coincide with them.
- `ensure_module_info_writes_nothing_when_the_row_is_current` — row seeded with the module's numbers;
  the pre-assertion above; after the call `writes_to == 0`, the row's bytes unchanged, and the read
  reached the table.

### 3. `server-module/src/content_tests.rs`, `mod nh_sync` — the whole reducers

This file is in scope (widened by measurement). `nh_sync::world()` registers every table `init` and
`sync_content` touch; the two reducers will now also read and write `module_info`, so:

- Add a `module_info: Handle<'a, ModuleInfo, u32>` field to `World` and register it in `world()`
  (writable, unique). Without this the seven existing `nh_sync` tests that run `crate::init` or
  `crate::sync_content` abort (measured).

Then add, beside the existing `nh_init_and_sync_content_arm_no_zone_in_an_empty_world`:

- `init_on_an_empty_database_records_the_modules_protocol_numbers` (lpw-3.1) — `fx.run_as(owner(), crate::init)`
  on a fresh `world`; exactly one `module_info` row, equal to the module's numbers with `id == 0`.
- `sync_content_restores_the_protocol_numbers_on_the_reseed_and_the_skip_path` (lpw-3.2) — the 2×2:
  {row missing, row holding other numbers} × {`config.content_version` stale (`seed_config(&w, 0)`, the
  reseed path), current (the skip path)}. Start each from a world `init` built, put `module_info` in
  the starting state with the handle, run the owner's `crate::sync_content`, expect `Ok(())` and
  exactly one row holding the module's numbers. The "current" cases must leave
  `config.content_version == CONTENT_VERSION` untouched before the call: that is what proves the call
  sits outside the version gate.
- `sync_content_writes_no_module_info_row_when_the_numbers_are_current` (lpw-3.3) — after `init`,
  `fx.reset_writes()`, then the owner's `sync_content` on the skip path and again on the reseed path:
  `fx.writes_to("module_info") == 0` each time, row unchanged.
- `sync_content_refused_leaves_the_protocol_numbers_untouched` — the criterion says the OWNER's call.
  Two refusals, each on a row holding other numbers: a caller that is not `config.owner_identity`,
  and a config row whose `owner_identity` is the all-zero identity (the reducer refuses that before
  anything else). Each returns `Err`, leaves the row's bytes as seeded and makes no `module_info`
  write. Put the owner's success beside them as the positive control (same starting row, `Ok`, numbers
  restored), or point at the test above if it already is that control.

### 4. Pins that count tables or modules (existing tests; roster and count edits only, no rule change)

Measured red once the table exists:

| File | Test | What moves |
|---|---|---|
| `server-module/src/accounts_tests.rs` | `acct_nh::generated_table_set_equals_the_lifecycle_manifest_bt7_1` | 64 → 65, and its message's roster prose |
| same | `tactical_manifest_entries_are_classified_and_only_summary_and_formation_exported_bt7_4` | 64 → 65, same prose |
| same | `data_lifecycle_partition_matches_spec_section3` | `expected_not_owned` gains `module_info` (twenty → twenty-one; keep the list sorted as it is, and bring the message in line) |
| same | `m22s6_table_row_registry_matches_manifest`, `m22s6_not_owned_identity_exceptions_are_frozen` | the S6 row-type registry (`m22s6_table_row_types`) gains a `module_info` row; it has no Identity column, so the frozen exception list of four does not change |
| `server-module/src/privacy_enforcement_tests.rs` | `real_crate_matches_the_reducer_rosters_with_no_dev_tactical_start_bt16_1` | `EXPECTED_MODULES` gains `"module_info"` right after `"marshal"` (the corpus is `lib.rs`'s bare `mod` lines in declaration order; the implementer declares `mod module_info;` there) |
| `server-module/src/native_host_tests.rs` | (fixture) | the extern block gains `#[link_name = "__preinit__20_register_describer_module_info"] fn register_table_module_info();` and `TABLE_DESCRIBERS` becomes `[..; 65]` with it appended |

Grep `accounts_tests.rs` for any other count or roster that names the table total or the NotOwned
set and would be falsified by a 65th table; change what the new table makes false and nothing else.
Report each edit as `file :: test — old → new`.

### 5. `client-wasm/src/lib.rs`, `mod tests` — the export

`protocol_version_matches_game_core_const`, beside `party_size_matches_game_core_const`, same shape.
Touch only the test module of that file.

### 6. `justfile.test.mjs` (new, at the repo root, beside `justfile`) — lpw-3.5

A `node:test` file that RUNS the real recipe: `just --justfile <abs>/justfile --working-directory <abs> publish`,
with a recording stand-in for the `spacetime` CLI first on `PATH`. Node 24 runs it in CI; keep it
runnable on Node 18 too (no `import.meta.dirname`; use `fileURLToPath`). Style: the existing
`scripts/*.test.mjs` files (plain `node:test` + `node:assert/strict`, 2-space, single quotes, semicolons;
biome formats and lints this file).

The stand-in is a small executable script the test writes into a fresh `mkdtemp` directory (never an
absolute path in the recipe: it must be found through `PATH`). It appends its arguments, one
invocation per line, to a log file named by an environment variable, and exits with a code the test
chooses per subcommand (`publish`, `call`); on a refused `call` it prints a recognisable line on
stderr, as the real CLI does (`Error: Response text: sync_content: caller is not the module owner`).
Set `VITE_STDB_DB` to a distinctive sentinel name in every run, so an inherited value cannot matter,
and check that name on BOTH recorded invocations. Remove `JUST_*` variables from the child
environment. Fail closed: also point `XDG_CONFIG_HOME` and `XDG_DATA_HOME` at directories inside the
temp dir, so a real `spacetime` CLI, were it ever reached instead of the stand-in, would hold no
identity. Leave `HOME` alone (a `just` resolved through an asdf shim needs it).

Tests (three; keep each to one behaviour):
1. After a publish that succeeds, the recipe calls `sync_content` on the same database as the
   publishing identity: `just publish` exits 0; the log has exactly two invocations, in order; the
   first is a `publish` that names the database and does not carry `--delete-data`; the second's
   arguments are exactly `call <db> sync_content` (so: no `--anonymous`, no other server, no other
   database).
2. A refused `sync_content` makes `just publish` exit non-zero, and the refusal's reason reaches the
   operator (the stand-in's stderr line is in the recipe's stderr). The publish still ran first.
   Hold it for more than one non-zero code from the stand-in (1 is what the CLI returns today).
3. A failed publish is not followed by a `sync_content` call, and `just publish` exits non-zero.

A vacuity guard belongs in the helper: fail loudly if `just` could not be spawned (`result.error`),
so "non-zero exit" can never be a missing binary.

### 7. `scripts/smoke-republish.sh` — lpw-3.6

This script is itself the live check (nightly `smoke-republish` job; `just smoke-republish`). Read it
whole first. Add the `module_info` round; keep every existing phase and assertion as it is.

Measured on spacetime 2.11.0 against a live host (you can rely on these exactly):
- `spacetime sql -s "$SERVER" --format json "$DB" "SELECT protocol, min_client_protocol FROM module_info"`
  prints a warning line, a blank line, then ONE line of JSON containing `"rows":[[1,1]]` for a single
  row `(1, 1)` (two rows would read `"rows":[[..],[..]]`, none `"rows":[]`). `grep -F` on
  `"rows":[[P,M]]` is therefore an exact one-row oracle and needs no `jq`.
- `spacetime sql -s "$SERVER" "$DB" "UPDATE module_info SET protocol = 4242, min_client_protocol = 4141 WHERE id = 0"`
  exits 0 for the publishing identity and the row then reads `(4242, 4141)`.
- The owner's `spacetime call -s "$SERVER" "$DB" sync_content` exits 0; a refused call exits 1.
- A fresh `--delete-data` publish leaves exactly one row holding the module's numbers.

The round goes AFTER the existing Phase 6, so the existing bump path runs untouched first. At that
point `server-module/src/lib.rs` is still patched to the bumped `CONTENT_VERSION`, the live module was
built from it and `config.content_version` equals it: a republish now is a republish with
`CONTENT_VERSION` unchanged, and the owner's `sync_content` takes the skip path. Say so in a comment.

Do NOT read the expected numbers out of a source file (the script's `sed` over `lib.rs` for
`CONTENT_VERSION` is a grandfathered shape, not one to repeat). The module's numbers are what the live
row holds after a publish and the owner's sync: record them from the database, then prove they come
back.

1. Assert the stored `config.content_version` is the bumped version (the script's existing
   word-boundary grep).
2. Read the live row. Require exactly one row (the JSON shape above) and record its two numbers as
   the module's numbers. A read that is not exactly one row fails the script.
3. Overwrite row 0 with two other numbers derived from the recorded ones and different from each
   other's offsets (so a swapped column shows); assert the overwrite took, with the exact one-row oracle.
4. Republish WITHOUT `--delete-data`, nothing rebuilt or patched in between. Assert the row still
   holds the other numbers (the publish alone restores nothing; this attributes the restore to step 5).
5. The owner's `sync_content`, in the script's existing `if ! VAR=$(…)` form.
6. Assert the row is exactly the recorded numbers again (one row), and the stored content version is
   still the bumped version.
The final `PASS` line should say that the protocol numbers were restored, so a log reader sees it.
`set -euo pipefail` is on: an assertion helper must `fail` with what it expected and what it got.

## Not yours

Production code, `just gen`, eval baselines, the `publish` recipe, the `test` recipe's door for
`justfile.test.mjs`, docs.

## Report (two parts, under 500 words)

**Tests** — per file: the tests written, the criterion each covers, and the red state you expect
before the implementation (a compile error naming which missing symbol, or an assertion). List every
pin edit as `file :: test — old → new`. Say "not syntax-checked" where true.

**Findings** — each a **defect** (one observable wrong outcome plus the file and symbol you read) or
a **question** (spec silence, a runtime fact you could not confirm, a slip in this brief). No
duplicates; no test written for a question.

Last action: create the empty file `/tmp/lpw-3-tester.done`.
