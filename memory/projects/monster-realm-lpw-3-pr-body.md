The server module now publishes two protocol numbers in a public one-row table, `module_info`, and `just publish` calls `sync_content` as the publishing identity after it publishes. A client can read the numbers before it joins; lpw-4 builds the check that uses them.

## What changes

- **`game-core/src/lib.rs`:** `PROTOCOL_VERSION` and `MIN_CLIENT_PROTOCOL` (both `u32`, both 1), the single source for the server and the client. Their doc comments carry the bump rule.
- **`client-wasm/src/lib.rs`:** the export `protocol_version()` returns `game_core::PROTOCOL_VERSION`.
- **`server-module/src/schema.rs`:** a new public table `module_info { id: u32 (primary key, always 0), protocol: u32, min_client_protocol: u32 }`, classified `NotOwned` and not exportable in `DATA_LIFECYCLE_MANIFEST`. Adding a table is an additive schema change.
- **`server-module/src/module_info.rs` (new):** `ensure_module_info(ctx)` reads row 0. It inserts the row when it is missing, updates it in place when either number differs, and writes nothing when it is current.
- **`server-module/src/lib.rs`:** `init` calls it after the content seed. `sync_content` calls it after both of its refusals and after `sync_content_inner`, outside that function's content-version check, so a publish that changes the module and not the content still refreshes the numbers. The owner check stays in `sync_content`'s own body.
- **`justfile`:** `publish` is now two lines: the publish, then `spacetime call {{db}} sync_content`. A refused call fails the recipe through the CLI's exit status. The `test` recipe gains a door for `justfile.test.mjs`.
- **Bindings:** regenerated with `just gen` (`index.ts`, `types.ts`, new `module_info_table.ts`).
- **Eval baselines (data only):** `table-schemas.json` regenerated with the eval's own `--write`; `client-visible-tables.json` gains `module_info`. No eval script changed.
- **Tests (tester-written):**
  - `game-core/src/protocol_tests.rs`: `MIN_CLIENT_PROTOCOL` never exceeds `PROTOCOL_VERSION`.
  - `server-module/src/module_info_tests.rs`: `ensure_module_info` alone on the native host: insert when missing; one in-place update from six stale starts (each number higher or lower, together and alone); no write when current.
  - `server-module/src/content_tests.rs` (`nh_sync`): the whole `init` and `sync_content` reducers: one row after `init`; the numbers restored from a missing, higher or lower row on the reseed path and on the skip path; no `module_info` write when current; a stranger's call and a zero-owner database are refused and leave the row as it was.
  - `client-wasm/src/lib.rs`: the export equals the constant.
  - `justfile.test.mjs` (new, repo root): runs the real `just publish` with a recording stand-in for the `spacetime` CLI first on `PATH`.
  - `scripts/smoke-republish.sh`: a new Phase 7 (below).
  - Count and roster pins that a 65th table makes false: five tests in `accounts_tests.rs`, `EXPECTED_MODULES` in `privacy_enforcement_tests.rs`, `TABLE_DESCRIBERS` in `native_host_tests.rs`. No rule changed.
- **Docs:** a new `docs/DECISIONS.md` entry (below); `ARCHITECTURE.md` (export list, supporting modules, the two lifecycle bullets); `README.md` (the `just publish` paragraph).

Items: none

## Acceptance

Acceptance: 6/6 met, 0 deferred, 0 unmet — lpw-3 seed:aefd9b063d572681
touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- server-module/src/content_tests.rs — probe (init + sync_content calling ensure_module_info): 7 content_tests::nh_sync tests SIGABRT at the native host wall (datastore_insert_bsatn not modelled) because nh_sync::world() opens every table init/sync_content write and module_info is not among them; the fixture must register module_info, and the whole-reducer lpw-3.1/3.2/3.3 tests reuse that fixture
- README.md — plan review + live probe: README's dev-loop paragraph tells the reader to call sync_content only 'after a later content change', and documents 'spacetime publish -s local' over an existing database with no owner call; the probe measured that a publish alone leaves module_info as it was, so after this slice that guidance leaves the protocol numbers stale (lpw-4 then refuses the client). The paragraph must say just publish makes the owner call and the explicit command needs it

- **lpw-3.1:** `cargo nextest run -p monster-realm-module -E 'test(=content::content_tests::nh_sync::init_on_an_empty_database_records_the_modules_protocol_numbers)'` → `1 test run: 1 passed`.
- **lpw-3.2:** the whole-reducer restore test plus the two `ensure_module_info` write tests → `3 tests run: 3 passed`.
- **lpw-3.3:** the whole-reducer and the unit no-write tests → `2 tests run: 2 passed`. Each zero write count is paired with a read count, so it cannot come from an unregistered table.
- **lpw-3.4:** `cargo nextest run -p game-core -E 'test(=protocol_tests::min_client_protocol_never_exceeds_protocol_version)'` → `1 test run: 1 passed`.
- **lpw-3.5:** `node --test justfile.test.mjs` → `pass 3`. The publish's whole argument list is `publish --module-path server-module <db>` (so no `-c`/`--delete-data`), the call's is `call <db> sync_content` (so no `--anonymous`, no other server or database); a refused call (stand-in exit 1 and 3) fails the recipe and its reason reaches stderr; a failed publish is followed by no call.
- **lpw-3.6 (manual gate):** `mr-gates verify` has no SpacetimeDB host, so this gate cites a recorded run: `just smoke-republish` at `a54b1967` against an isolated 2.11.0 host, `SMOKE-EXIT=0` (`memory/projects/gates/lpw-3.smoke-republish.log:94`). Phase 7 runs after the existing phases: it checks the stored content version is unchanged, records the two numbers from the live row, overwrites row 0 by SQL, republishes without `--delete-data`, checks the publish alone restored nothing, calls `sync_content` as the owner, and checks the row is exactly the recorded numbers again. The nightly `smoke-republish` job is the standing check.

**Red proof** (`memory/projects/gates/lpw-3.red-proof.log`): at the tester's commit `a67f2163`, before any production code, the module and client-wasm test binaries fail to compile on the missing names, and `justfile.test.mjs` fails two of three. Against a skeleton with no behaviour (the table, the manifest row, an empty `ensure_module_info`, no call site) the pins pass and exactly the seven behaviour tests fail on their assertions. The smoke script at `a67f2163` fails at Phase 7 against a live host.

**Wrong implementations** (`memory/projects/gates/lpw-3.mutants.log`): 19 applied one at a time to a clean tree, all caught, tree restored each time. They are: no call in `init`; the call made only when the content version was stale; an unconditional update; delete then insert; the call before the owner checks; `MIN_CLIENT_PROTOCOL` above `PROTOCOL_VERSION`; comparing one column only (each); `<=` and `>=` in place of `==`; never inserting; a literal in the wasm export; a row at id 1; and six recipe variants (exit status ignored, `--anonymous`, sync before publish, `--delete-data`, `-c`, no module path).

## Gate

`just ci` at `a54b1967`: exit 0.
- Rust: 3417, 1120 (`dev_reducers`) and 3089 (`load_test_zones`) tests passed.
- Node doors: ops 141, scripts 83, justfile 3; both tester-guard fixture batteries passed.
- Evals: 15 of 15 pass, including `bindings-drift`, `battle-schema-snapshot` (65 tables) and `client-surface-privacy` (35 accessors).
- Client: typecheck clean; 245 files, 6192 tests passed; build-hook check OK.
- Observability validate: 9 checks, 0 failed.

`just smoke-republish`: green at `a54b1967` (above).

## Lenses

- **Plan:** reviewer and red-team. Applied: the smoke script records its expected numbers from the live row and reads no source file; the recipe test fails closed; exact write counts and visibility pre-assertions; a zero-owner refusal case; the README correction.
- **Code:** reviewer (two should-fix items, both in the decision entry: a sentence that was false of the upgrade runbook, and length; fixed), red-team (fixed: the recipe test's flag denylist missed the CLI's `-c` alias, now an exact argument list; no stale-row case used lower numbers, now six starts), reducer-security-auditor (pass, no finding), desync-guard (pass, no finding), simplify (nothing to cut), verifier (approve).
- **Tester's questions:** the frozen-exception test's population count did move (20 to 21; the list of four did not). `TABLE_DESCRIBERS` order matches the regenerated baseline (`module_info` is last in both). The lower-number starts stay lower while both constants are at least 1; the numbers only rise, so no floor is pinned.
- **Declined, with reasons:** sweeping rows whose `id` is not 0 (only the database owner's SQL can make one; note n1 tells lpw-4 to read row 0); a floor of 1 on the constants (the spec states none); whitespace-tolerant JSON matching in the smoke script (the CLI is pinned, and a format change fails loudly).

touches-delta:
- `server-module/src/content_tests.rs` — widened (measured, above).
- `README.md` — widened (above).
- `justfile.test.mjs` — a test beside the declared `justfile`.
- `ARCHITECTURE.md`, `docs/DECISIONS.md` — the doc set.

boyscout-delta: none

plan-delta:
- The spec named three pins. The probe measured six red pin tests, all in the declared files, plus seven tests that abort on a fixture in `content_tests.rs` (13 red tests, the same in all three feature builds).
- lpw-3.5 is tested by running the recipe against a stand-in CLI, not a live host. `just publish` takes no server argument, so a live test would publish to whatever the CLI's default server is. The CLI's exit status on a refused reducer was measured live (1 at 2.11.0).
- The whole-reducer tests sit in `content_tests.rs::nh_sync`, beside the one fixture that runs `init` and `sync_content` whole, and not in `module_info_tests.rs`.
- lpw-3.6 is a manual gate (above).

comment-scan: CLEAN

## Decisions

- New entry: "The module publishes its protocol numbers; a publish that keeps data is followed by the owner's `sync_content`". It records the bump rule and `decision-defaulted:publish-reseed=owner-sync-after-every-publish`.
- Closes residual **R-sr-4b-NOTE505D57** for this repository. `just publish` now makes the owner call; `just playtest-up` and `scripts/smoke-republish.sh` already did. Every other publish creates its database, so `init` runs: `playtest-wipe`, `load-host`, the e2e global setup and the smoke script's first phase pass `--delete-data`; the nightly load-smoke job and `account-e2e` publish to a fresh in-memory host. lpw-13 and lpw-17 carry it into the shell and the standalone package (note n4).

## Risks / follow-ups

- A schema-changing publish disconnects connected clients, so this ships at a publish window.
- A database created before this slice has no `module_info` row until the owner's `sync_content` runs after the publish. Until lpw-4 nothing reads the row. Note n1 tells lpw-4 that a client connecting inside that window sees no row.
- While both constants are 1, no test can tell the two columns apart, or `protocol_version()` from the other constant. Every test compares against the constants, so the first slice that raises `PROTOCOL_VERSION` alone makes them discriminating (note n3).
- A database whose `config.owner_identity` is zero (published before the owner was recorded) refuses `sync_content`, so `just publish` exits non-zero there after a successful publish. The reducer's message names the remedy.
- Spec notes pending fold: n1 (for lpw-4), n2 (`touches:` gaps and the manual gate), n3, n4 (the residual).

not-verified:
- Remote-only jobs (gitleaks, cargo-audit, the e2e job) run in CI. The browser e2e suite was not run locally; no client code reads the new table or export yet.
- `just publish` was not run end to end against a live host: the recipe ran against a stand-in CLI, and the same two commands ran live through the smoke script with `-s`.
- The `publish` recipe was not run under the Windows `cmd.exe` shell the justfile also configures.
- The nightly mutation gates were not run; the 19 wrong implementations above stand in for them.
- Scratch left in `/tmp/lpw3-sb.XBltVv` (probe patch, red and smoke logs, the wrong-implementation runner, three in-memory host data dirs). No process is left running.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
