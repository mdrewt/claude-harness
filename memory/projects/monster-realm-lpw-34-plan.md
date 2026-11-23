# lpw-34 plan, increment 1: the generated-definition check, with the version hops deferred

## Why this is the increment
At step 1 the hop past 2.11.0 measured blocked, on three counts (notes n1 and n2, residual R-lpw-34-NOTE7A6229):
- From 2.12.0 on, `spacetimedb-bindings-sys` always defines native host-ABI stubs. They collide with
  `native_host_tests.rs`, and 769 of 1311 module tests fail.
- SDK >= 2.14.0 needs Node >= 24.22.1, and the workflows that pin Node are not grantable.
- SDK 2.16.1 is under the npm cooldown until 2026-11-27.

The part of lpw-34 that holds at any version is lpw-34.6: the check that replaces the guarantee
"`unstable` is off, so no HTTP handler or row filter can be declared". It ships now at 2.11.0, with
`unstable` still off, so that the slice that switches the feature on and hops to 2.16.1 finds the
guard in place. Gates .1, .2, .3, .4, .5 and .7 all name 2.16.1 or the recorded upgrade, so they are
DEFERred with the measured reason.

## Functional core / imperative shell
- **Default build (Rust, test code).** `server-module/src/privacy_enforcement_tests.rs` gets
  `fn definition_violations(def: &RawModuleDefV10) -> Vec<String>`. It walks every section:
  - `HttpHandlers`, `HttpRoutes` and `RowLevelSecurity` must be empty, and each entry is named in a
    violation;
  - `Submodules` is walked recursively, since a submodule holds a nested `RawModuleDefV10`;
  - every other known kind passes, and any section kind the walker does not know is a violation
    (the enum is `non_exhaustive`, and a hop that adds a kind must re-review the check).

  Two tests use it:
  - `lpw34_6_generated_definition_declares_no_http_handler_route_or_row_filter`: on
    `fixture().module_def()`, violations are empty, and the def has a non-empty `Reducers` section
    (so a decode of nothing cannot pass);
  - `lpw34_6_definition_check_names_every_planted_handler_route_and_filter`: synthetic defs built
    from the vendor structs, one per kind at top level and one inside a submodule, each yielding a
    violation.
- **Release artefact (JS core).** `scripts/verify-release-reducers.mjs` exports
  `findDefinitionViolations(extractSchemaOutput: string): string[]` over the JSON that
  `spacetimedb-standalone extract-schema <wasm>` prints (`{"V10":{"sections":[{"Kind": …}, …]}}`).
  The same rules apply. It THROWS on input it cannot use: empty, not JSON, a top-level key other
  than `V10`, no `sections` array, or no non-empty `Reducers` section.
- **Release artefact (shell).** In the node part of the `release-module` recipe in `justfile`, after
  the existing checks and before anything is written:
  - read the CLI's own path from the `spacetime Path: <file>` line that `spacetime --version` prints;
  - run `<that dir>/spacetimedb-standalone extract-schema <built>`;
  - refuse when the run fails, when the output cannot be used, or when there are any violations,
    each with a refusal line that says why.

  The tool is the one installed beside the CLI on PATH, the same way the recipe finds cargo, and no
  environment variable names it.

## Tests (tester; the orchestrator proves red)
- Rust: the two tests above, in `privacy_enforcement_tests.rs`. Red proof: a planted handler, route
  and filter in a sandbox copy with `unstable` switched on, never committed.
- JS units in `scripts/verify-release-reducers.test.mjs`. Red until the export exists.
- `justfile.test.mjs`:
  - `runJust` installs a `spacetime` stand-in (`--version` prints `spacetime Path: <bin>/spacetimedb-cli`)
    and a `spacetimedb-standalone` stand-in beside it that prints `$MR_FAKE_DEF`, or a clean def by
    default, exits with `$MR_FAKE_DEF_EXIT`, and logs its arguments;
  - new tests, per profile: a def holding a handler, a route, a filter, or a handler inside a
    submodule, and a failing extractor, are each refused with no artefact written; the extractor ran
    once, on exactly the built file.

## Docs (in touches)
- The `justfile` recipe comment.
- The `verify-release-reducers.mjs` header.
- `docs/local-play.md` §3 "What the module never declares".
- `docs/DECISIONS.md`: the access entry's "declares no HTTP handler and no row filter" sentence.
- `docs/runbooks/spacetimedb-upgrade.md` step 7: release-module reads the artefact's definition with
  `extract-schema`, so the JSON shape must be rechecked at each hop.
- The justfile node-door floor is re-derived.

## Ledger
- .6 gets a node CHECK that runs the named Rust tests and both node files, and that calls
  `findDefinitionViolations` on a planted def and a clean def.
- The rest are DEFERred to `backlog`, each citing R-lpw-34-NOTE7A6229, n1 or n2.

## Evidence beyond tests
- Real `just release-module world` and `official` on CLI 2.11.0, both accepted.
- The sandbox planted-handler watch: the Rust test fails, and release-module refuses.
