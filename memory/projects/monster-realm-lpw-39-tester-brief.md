# lpw-39 tester brief

You are the `tester` for slice lpw-39 of the monster-realm game repo. You write tests; you do not
implement. You have no shell: the orchestrator runs every test and reports back.

Worktree (edit ONLY here): `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-39`

## What the slice does

It moves the module SDK from crate 2.11.0 to 2.12.0 and keeps the native test host working there.
From 2.12.0 the vendor's `spacetimedb-bindings-sys` defines the host ABI as native stubs and
`spacetimedb`'s table backend stops calling the host off wasm. So the slice commits copies of the
two crates.io 2.12.0 packages under `vendor/`, patched in 27 `#[cfg]` attributes (each with a
trailing `// monster-realm: was <original attribute>` notice), wired by `[patch.crates-io]`. The
design: `docs/refactors/native-test-host.md` ("The patch", "The guard"). The plan with the file
formats: `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-lpw-39-plan.md`
§Contracts — read it; it is binding.

It is a `type: refactor` slice (`/home/mdrewt/.claude/harness/standards/testing-tdd.md`
§Behavior-preserving changes): no existing server-module test changes. You write one NEW test and
make one NAMED edit to an existing one.

## Contracts

### 1. The guard test (new)

- File: `server-module/src/native_host_tests.rs` (already `#[cfg(test)]`; it is the module's
  in-memory host). Add the test at the end of the file:
  `#[test] fn nh_vendored_crates_are_the_crates_io_release_plus_the_patch()`.
  The name is fixed (the ledger's CHECK and the docs name it).
- Inputs (read at test time; none exist yet — `vendor/` lands after you):
  - `vendor/PRISTINE.sha256` and `vendor/native-host.patch` and the trees `vendor/<crate>/**`,
    located as `Path::new(env!("CARGO_MANIFEST_DIR")).join("../vendor")`;
  - the root `Cargo.toml` (`env!("CARGO_MANIFEST_DIR")/../Cargo.toml`) for the workspace pin line
    `spacetimedb = "=<version>"` in `[workspace.dependencies]`;
  - each copy's `vendor/<crate>/Cargo.toml` `[package]` `version = "<version>"` line (it is a
    cargo-normalised manifest: `[package]` comes after a comment header and `edition`/`rust-version`
    lines; the first `version = "…"` line after `[package]` is the package's).
- Formats: plan §Contracts (`vendor/PRISTINE.sha256`, `vendor/native-host.patch`). Real samples you
  may read: `/tmp/lpw39-vendor.vICKuo/PRISTINE.sha256`, `/tmp/lpw39-vendor.vICKuo/native-host.patch`,
  the patched trees `/tmp/lpw39-vendor.vICKuo/b/{spacetimedb,spacetimedb-bindings-sys}` and the
  pristine ones `/tmp/lpw39-vendor.vICKuo/a/…` (these are exactly what will be committed).
- Checks 1–8 (with 5b) of plan §Contracts "The guard test", each failing with a message that
  names the file, the hunk (`@@` header) or the path. Put them in a private
  `fn check(vendor: &Path, root_manifest: &str) -> Result<(), String>` that the test calls with the
  real paths and `unwrap_or_else(|e| panic!(...))`s — the orchestrator breaks the committed tree
  locally to watch each check fail once. 5/5b need a tiny cfg-predicate parser + evaluator
  (grammar in the plan); keep it minimal and total (reject, never guess). Byte-exact: read files as bytes (`std::fs::read`),
  split into lines keeping each `\n`; a patch body line is a 1-byte kind marker plus the file's
  line bytes. Treat `\r` as an ordinary byte (no normalisation). A patch line starting with `\`
  (no-newline marker), `diff `, `index ` or anything else unexpected is a parse failure.
- Allowed crates: std + `sha2` (`use sha2::{Digest, Sha256};`, dev-dependency `sha2 = "0.11"`,
  default features off — `Sha256::digest(&bytes)` works; format hex yourself). No new dependency.
  Keep the helpers private to this test (nested `fn`s or a small private `mod`), with no `pub`
  item added to the file: the Fixture's public API must stay byte-identical.
- It must fail loudly (not pass vacuously) when `vendor/` is absent, empty, or the manifest has
  no `crate` line or no file lines.
- Style: match the file (doc comment on the test saying what it protects: the provenance of the
  code the module ships, which no behaviour test can see — a wasm-only edit inside a copy passes
  every native test). Comments state current behaviour, never history; no slice ids in names.
  `cargo clippy --all-targets -- -D warnings` and rustfmt (max width 100, the repo's rustfmt.toml
  if any) apply.

### 2. The moved test (named edit)

- File: `client/src/net/authToken.test.ts`, the `describe('SDK-DRIFT (nh4): …')` block (~line 370).
- Change the needle `'Failed to verify token: ${response.statusText}'` to
  `'Failed to verify token: ${status} ${statusText}'`, and in the `it(...)` title the quoted
  string the same way, so the title becomes exactly:
  `BITES: dist/index.mjs contains the literal substring "Failed to verify token: ${status} ${statusText}"`.
  (Single-quoted TS strings: `${…}` stays literal text.) Nothing else in that test's logic changes.
- Comment accuracy only, no assertion change: the comments at ~lines 110-112 and ~418-419 say the
  SDK throws "the SAME message" for a transient 5xx as for a 401. At SDK 2.12.0 the message carries
  the HTTP status (`Failed to verify token: <status> <statusText>`, `dist/index.mjs:5219`); what
  stays true is that the CLIENT counts every rejection alike. Reword those two comments to say that.
  The in-test comment "dropping the statusText interpolation" may stay or say "the status or
  statusText interpolation".

## Report

List each edit with file:line. Separately list **defects** (something in the slice that is wrong)
and **questions** (something the contract leaves open), each one line. Do not write production
code, do not touch `vendor/`, `Cargo.toml`, the ledger or any doc.

### 3. Citation comments in `native_host_tests.rs` (comments only, no code)

The file cites the 2.11.0 crates.io sources. After the slice the two patched crates are the copies
under `vendor/`, and `spacetimedb-sats` / `spacetimedb-primitives` are the crates.io 2.12.0
packages. Re-point each citation (verified by the orchestrator against the 2.12.0 sources):

| Line (now) | Now cites | Becomes |
|---|---|---|
| 6-7 | `ReducerContext::__dummy()` (crate 2.11.0, `src/lib.rs:1043`) | crate 2.12.0, `vendor/spacetimedb/src/lib.rs:1145` |
| 344 | "the `spacetimedb-bindings-sys` 2.11.0 raw externs" | "the 2.12.0 raw externs of `vendor/spacetimedb-bindings-sys`" (wording yours) |
| 555 | bindings-sys `:1059` (`sys::call` `assume_init`) | `vendor/spacetimedb-bindings-sys/src/lib.rs:1357` |
| 568 | `spacetimedb-sats-2.11.0/src/ser/impls.rs:124-128` | `spacetimedb-sats-2.12.0/src/ser/impls.rs:124-128` |
| 570 | `spacetimedb-2.11.0/src/table.rs:1069-1078` | `vendor/spacetimedb/src/table.rs:1517-1526` |
| 572 | `spacetimedb-primitives-2.11.0/src/ids.rs:125` | `spacetimedb-primitives-2.12.0/src/ids.rs:125` |
| 805-807 | `__call_reducer__` (spacetimedb 2.11.0 `rt.rs:1118`); private constructor `lib.rs:1058` | `vendor/spacetimedb/src/rt.rs:1226`; `vendor/spacetimedb/src/lib.rs:1163` |
| 1158 | spacetimedb 2.11.0 `rt.rs:1061` (`__describe_module__`) | `vendor/spacetimedb/src/rt.rs:1169` |
| 1160 | spacetimedb 2.11.0 `rt.rs:1118` (`__call_reducer__`) | `vendor/spacetimedb/src/rt.rs:1226` |
| 1419 | spacetimedb 2.11.0 `rt.rs:1350` (`__call_view__`) | `vendor/spacetimedb/src/rt.rs:1458` |
| 1586 | `RawModuleDef` (V10 on 2.11.0) | V10 on 2.12.0 (`vendor/spacetimedb/src/rt.rs:1150`) |
| 1630 | "(a V10 def on 2.11.0; any other version …)" | "(a V10 def on 2.12.0; …)" |

Also the module doc (lines 10-12) says the native test target "leaves UNDEFINED" the host imports.
On 2.12.0 that holds because the vendored `spacetimedb-bindings-sys` has its `native_link_stubs`
module compiled out by `vendor/native-host.patch`; say so in one clause. Keep every other word.
