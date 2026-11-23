# lpw-3 plan — the module publishes its protocol numbers; every publish path re-seeds as the owner

Spec: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-3 (EARS lpw-3.1 to lpw-3.6).
Worktree: `projects/monster-realm/.claude/worktrees/lpw-3`, branch `slice/lpw-3`, base `origin/master` 013e0238.
Tier: hard (schema, always-serial, solo).

## What is measured (throwaway probe, reverted; artifacts in `/tmp/lpw3-sb.XBltVv`)

The probe added the constants, the table, the manifest entry, `ensure_module_info` and both call
sites, then ran every suite.

- `cargo nextest run -p monster-realm-module` (default, `dev_reducers`, `load_test_zones`): the same
  13 tests go red in each build, nothing else.
  - Pins inside `touches:` (roster or count edits, no rule changes):
    - `accounts_tests.rs`: `acct_nh::generated_table_set_equals_the_lifecycle_manifest_bt7_1` (64 tables),
      `data_lifecycle_partition_matches_spec_section3` (the NotOwned list of twenty),
      `m22s6_table_row_registry_matches_manifest` and `m22s6_not_owned_identity_exceptions_are_frozen`
      (the S6 row-type registry needs a `module_info` row),
      `tactical_manifest_entries_are_classified_and_only_summary_and_formation_exported_bt7_4` (64 entries).
    - `privacy_enforcement_tests.rs`: `real_crate_matches_the_reducer_rosters_with_no_dev_tactical_start_bt16_1` (`EXPECTED_MODULES`).
    - `native_host_tests.rs`: `TABLE_DESCRIBERS` needs the `module_info` describer, or the generated
      module definition does not carry the table.
  - Outside `touches:`: seven `content::content_tests::nh_sync::*` tests abort (SIGABRT) at the native
    host wall. `nh_sync::world()` opens every table `init` and `sync_content` write, and `module_info`
    is not among them. `mr-touches widen` granted `server-module/src/content_tests.rs` on this proof.
- `just gen` changes exactly `client/src/module_bindings/{index.ts,types.ts}` and adds `module_info_table.ts`.
- Evals: `battle-schema-snapshot` and `client-surface-privacy` go red on their baselines
  (`table-schemas.json`, `client-visible-tables.json`); `bindings-drift`, `spacetime-type-snapshot`,
  `append-only-ids`, `content-version`, `feature-isolation` stay green.
- Client: `tsc` clean and vitest 245 files / 6192 tests green on the regenerated bindings. No client pin moves.
- Live, spacetime 2.11.0, isolated host: a fresh publish holds `(0, 1, 1)`; the owner's SQL
  `UPDATE module_info SET protocol = 4242, min_client_protocol = 4141 WHERE id = 0` exits 0; the
  owner's `sync_content` on the skip path (content version current) restores `(0, 1, 1)`;
  `spacetime call --anonymous <db> sync_content` exits 1 with
  `Error: Response text: sync_content: caller is not the module owner`;
  `spacetime sql --format json … "SELECT protocol, min_client_protocol FROM module_info"` prints one
  line containing `"rows":[[1,1]]`.
- This machine's CLI default server is `proc-test-local` (127.0.0.1:3411), so `just publish` (no `-s`)
  cannot be pointed at a test host by argument.

## Design

Functional core: two `u32` constants in `game-core/src/lib.rs`, the single source for server and client.
Imperative shell: `module_info::ensure_module_info(ctx)` reads row 0 and writes only when it is missing
or differs. Wiring: two call sites in `server-module/src/lib.rs`. Data model: one additive public table.

### Contracts (the tester writes to these; the implementer builds to them)

```rust
// game-core/src/lib.rs
pub const PROTOCOL_VERSION: u32 = 1;      // each on its own line, in exactly this declaration form
pub const MIN_CLIENT_PROTOCOL: u32 = 1;
#[cfg(test)]
mod protocol_tests;                       // game-core/src/protocol_tests.rs, tests at file top level

// client-wasm/src/lib.rs
#[wasm_bindgen]
#[must_use]
pub fn protocol_version() -> u32;         // returns game_core::PROTOCOL_VERSION

// server-module/src/schema.rs
#[spacetimedb::table(accessor = module_info, public)]
pub struct ModuleInfo {
    #[primary_key]
    pub id: u32,                          // always 0
    pub protocol: u32,
    pub min_client_protocol: u32,
}
// DATA_LIFECYCLE_MANIFEST: { table: "module_info", policy: NotOwned, exportable: false }

// server-module/src/module_info.rs
pub(crate) fn ensure_module_info(ctx: &ReducerContext);
#[cfg(test)]
#[path = "module_info_tests.rs"]
mod module_info_tests;

// server-module/src/lib.rs
mod module_info;
// init:         … sync_content_inner(ctx).expect(..); crate::module_info::ensure_module_info(ctx); …
// sync_content: … owner guard (unchanged, in this body) …; sync_content_inner(ctx)?;
//               crate::module_info::ensure_module_info(ctx); …   (after the content step, outside its version gate)
```

```just
publish:
    spacetime publish --module-path server-module {{db}}
    spacetime call {{db}} sync_content
```

`ensure_module_info`: `find(0)`; row equal on both numbers → no write; row present and different →
`update`; no row → `insert`. It never scans the table. A row with `id != 0` can only come from the
database owner's SQL and is outside the model (the primary key makes row 0 unique).

Native-host registration for tests: `fx.table_keyed::<ModuleInfo, u32>("module_info", "id", |r| r.id).writable().unique()`.

### Tests (tester-owned)

| File | Test | Criterion |
|---|---|---|
| `game-core/src/protocol_tests.rs` | `min_client_protocol_never_exceeds_protocol_version` | lpw-3.4 |
| `server-module/src/module_info_tests.rs` | `ensure_module_info_inserts_the_modules_numbers_when_the_row_is_missing` | lpw-3.2 |
| same | `ensure_module_info_overwrites_a_row_holding_other_numbers` (both differ, only `protocol`, only `min_client_protocol`) | lpw-3.2 |
| same | `ensure_module_info_writes_nothing_when_the_row_is_current` (`writes_to("module_info") == 0`) | lpw-3.3 |
| `server-module/src/content_tests.rs` `nh_sync` | `init_on_an_empty_database_records_the_modules_protocol_numbers` | lpw-3.1 |
| same | `sync_content_restores_the_protocol_numbers_on_the_reseed_and_the_skip_path` (row missing / other numbers × stale / current content version) | lpw-3.2 |
| same | `sync_content_writes_no_module_info_row_when_the_numbers_are_current` (both paths) | lpw-3.3 |
| same | `sync_content_by_a_stranger_leaves_the_protocol_numbers_untouched` (refusal, beside the owner control) | lpw-3.2 (the owner's call) |
| `client-wasm/src/lib.rs` `mod tests` | `protocol_version_is_game_cores_protocol_version` | contract |
| `justfile.test.mjs` (repo root, sibling test of `justfile`) | runs the real `just publish` with a recording stand-in for the `spacetime` CLI first on `PATH`: publish then `call <db> sync_content` on the same database with no `--anonymous`; a refused call (stand-in exits 1) makes `just publish` exit non-zero; a failed publish is followed by no call | lpw-3.5 |
| `scripts/smoke-republish.sh` | new phases: assert the fresh publish shows the module's numbers, overwrite row 0 by SQL, republish with `CONTENT_VERSION` unchanged, owner `sync_content`, assert the numbers and the single row are back | lpw-3.6 |

Pins the tester updates (roster and count only): the five `accounts_tests.rs` tests above,
`EXPECTED_MODULES`, `TABLE_DESCRIBERS` plus its extern declaration, and `nh_sync::world()` gains the
`module_info` handle.

The implementer owns: the production code, `just gen`, the two eval baselines, the `publish` recipe,
and a door line for `justfile.test.mjs` in the `test` recipe.

### Why these shapes

- **Whole-reducer tests live in `content_tests.rs::nh_sync`.** That module already holds the fixture
  that lets `crate::init` and `crate::sync_content` run whole, and it needed the `module_info`
  registration anyway. A second copy of that 170-line fixture in `module_info_tests.rs` would drift.
- **lpw-3.5 is a hermetic test of the recipe, not a live one.** `just publish` takes no server, so a
  live test would publish to whatever the CLI default is. The test executes the recipe through `just`
  and doubles only the external CLI; the CLI's own exit code on a refused reducer (1 at 2.11.0) is
  measured live above and exercised again by the smoke script's owner call.
- **`justfile.test.mjs` sits beside the justfile.** `scripts/` is not grantable, and the scope rule
  admits a test file only beside the declared file it is named after.
- **lpw-3.6 is a MANUAL gate.** `mr-gates verify` has no SpacetimeDB host, and only an e2e-runner CHECK
  is classed CI-only. The evidence is a recorded `just smoke-republish` run against an isolated host;
  the nightly `smoke-republish` job is the standing check.
- **No stray-row sweep** in `ensure_module_info`: YAGNI, see above.

## Order of work

1. Checkpoint this plan (`wip(lpw-3): plan`).
2. Tester (opus) writes every test and pin above.
3. Red run: (a) compile failure naming the missing symbols; (b) with a no-behaviour skeleton (constants,
   table, manifest row, empty `ensure_module_info`, no call site), each behaviour test fails on its
   assertion; the smoke script fails at its first `module_info` read against master's module.
4. Implement; `just gen`; regenerate `table-schemas.json` (`--write`), add `module_info` to
   `client-visible-tables.json`.
5. Targeted loop per crate; wrong-implementation proofs (ensure inside the version gate; always-write;
   `init` without the call; `MIN_CLIENT_PROTOCOL > PROTOCOL_VERSION`; recipe without the call; recipe
   that ignores the call's exit), each restored before the next.
6. Lens batch: reviewer, simplify, red-team, reducer-security-auditor, desync-guard, then verifier.
7. `just ci` once; `just smoke-republish` against an isolated host (commit first: the script's EXIT trap
   restores `server-module/src/lib.rs` from the index); `mr-gates check`.
8. Docs: `docs/DECISIONS.md` entry (the bump rule and the owner sync after every publish that keeps
   data), `ARCHITECTURE.md` (module table, wasm export list). README's `just publish` paragraph stays
   true; a note records that it does not mention the owner sync.
9. PR, stop.

## Acceptance ledger

- lpw-3.1: nextest, the `init_on_an_empty_database…` test, `1 test run: 1 passed`.
- lpw-3.2: nextest roster of three (`sync_content_restores…`, the two `ensure_module_info` write tests), `3 tests run: 3 passed`.
- lpw-3.3: nextest roster of two (`sync_content_writes_no_module_info_row…`, `ensure_module_info_writes_nothing…`), `2 tests run: 2 passed`.
- lpw-3.4: nextest, game-core `protocol_tests::min_client_protocol_never_exceeds_protocol_version`.
- lpw-3.5: `node --test justfile.test.mjs`, exact pass count.
- lpw-3.6: MANUAL, citing the recorded smoke run beside the ledger.

## Plan review (reviewer + red-team), applied

- Smoke oracle: the script records the module's numbers from the live row after the publish and proves
  they return; it reads no source file. The round sits after the existing Phase 6. The
  declaration-form rule on the constants is dropped.
- `justfile.test.mjs` fails closed: sentinel database name checked on both invocations, exact `call`
  arguments, `--justfile`/`--working-directory`, `JUST_*` removed, temp `XDG_CONFIG_HOME`/`XDG_DATA_HOME`.
- Native-host tests carry pre-assertions (the seeded row is visible through the index; the read reached
  the table) and exact write counts (insert 1, update 1, current 0).
- The refusal test covers both refusals `sync_content` makes (a stranger, a zero owner).
- README.md widened: its dev-loop paragraph must say `just publish` makes the owner call and that the
  explicit `spacetime publish` over an existing database needs it.
- Publish-path inventory for R-sr-4b-NOTE505D57: `just publish` (this slice), `playtest-up` and
  `scripts/smoke-republish.sh` (already call it), `playtest-wipe`, `load-host`, the e2e global setup and
  the smoke script's first phase (`--delete-data`, so `init` runs), the nightly load-smoke job and
  `account-e2e` (a fresh in-memory host per run, so the publish creates the database).
- Rejected: a source-text pin that `module_info.rs` names the constants (forbidden shape; the tests
  compare against the constants); a stray-row sweep and a parameter seam for the numbers (YAGNI).
  Known limit: while both constants are 1, no test can tell a swapped pair of fields; every test
  compares against the constants, so the first bump that separates them shows it.
- Notes for lpw-4 (filed with `mr-gates notes add`): a reader takes row `id == 0`; between a
  schema-changing publish and the owner's call a reconnecting client sees no row.
