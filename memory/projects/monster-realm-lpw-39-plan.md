# lpw-39 plan — the native test host moves to the patched vendor crates (lockstep hop to 2.12.0)

Slice: `lpw-39` (type: refactor · tier: hard). Spec: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-39.
Design (SSOT, merged in #858): `docs/refactors/native-test-host.md` (alternative B). This file is the
build plan only; where it and the design differ, the difference is a `plan-delta:` line below.

Worktree `.claude/worktrees/lpw-39`, branch `slice/lpw-39`, base `origin/master` 7e549b49.

## Baseline (measured 2026-11-22 on 7e549b49, crate 2.11.0)

`cargo nextest run -p monster-realm-module --run-ignored all` → `1311 tests run: 1311 passed, 0 skipped`
(2.565 s). No `#[ignore]` in `server-module/src`. One test binary (`monster-realm-module` lib).
Names saved to `$MEM/gates/lpw-39.master-tests.txt` (1311 lines, `<binary-id> <test name>`).

## Artefacts (all measured in sandbox `/tmp/lpw39-vendor.vICKuo`)

- `.crate` files downloaded from `static.crates.io`; sha256 equals the index `cksum`:
  `spacetimedb 2.12.0 6d6450e80e92aef92659c96e1eb04badd8e512510659c6f1f4ee69d46b6e96b3`,
  `spacetimedb-bindings-sys 2.12.0 55e82002d0ab2a71c3a5b40dee0ac4f403ab12dc676dbae8ff4654038d5ceb88`
  (identical to the cargo registry cache copies).
- Unpacked: 46 files; each crate has a `Cargo.lock` (omitted from the copy) → 44 files committed.
  No executable bit, no CRLF, no symlink.
- `native-host.patch` produced with `diff -u --label a/<p> --label b/<p>` per file: 16 hunks, 27 `-`,
  27 `+`. `patch -d <pristine> -p1 --fuzz=0` reproduces the patched tree byte-for-byte.

## Contracts (the tester writes against these; decided by the builder)

### `vendor/PRISTINE.sha256` (UTF-8, LF line endings)

- Blank lines and lines starting with `#` are comments.
- `crate <name> <version> <cksum>` — one per vendored crate. `<name>` is the crate's directory
  under `vendor/`; `<cksum>` is 64 lowercase hex (the `.crate` file's sha256 = crates.io index
  `cksum`). Present for `spacetimedb` and `spacetimedb-bindings-sys`, both `2.12.0`.
- `<sha256>  <path>` (two spaces, sha256sum style) — a file the copy holds; `<path>` is relative to
  `vendor/`, starts with `<name>/`, uses `/`. The hash is of the file as published (before the patch).
- `omitted <sha256>  <path>` — a file the package holds that the copy leaves out (each crate's
  `Cargo.lock`). That path SHALL NOT exist in the tree.
- Lines sorted by path within a crate; order is not part of the contract.

### `vendor/native-host.patch`

Unified diff, `--- a/<path>` / `+++ b/<path>` per file (same `<path>`, relative to `vendor/`), hunks
`@@ -<os>,<oc> +<ns>,<nc> @@`, body lines ` `, `-`, `+`. No `\ No newline at end of file` today
(files end in `\n`), but a parser should reject what it does not understand rather than guess.

### The guard test (tester writes it)

`server-module/src/native_host_tests.rs`, `#[test] fn nh_vendored_crates_are_the_crates_io_release_plus_the_patch()`.
Reads `concat!(env!("CARGO_MANIFEST_DIR"), "/../vendor")`. Uses `sha2::{Digest, Sha256}` (already a
dev-dependency, `sha2 = { version = "0.11", default-features = false }`) and `std::fs` only. Asserts:

1. **Manifest parses**; at least one `crate` line; every file line's first path component is a
   declared crate; no path repeats; no `..`/absolute/backslash paths.
2. **No extra or missing files.** Walking `vendor/<crate>/` for each declared crate (regular files only;
   a symlink or other non-regular entry fails) yields exactly the manifest's held-file paths;
   every `omitted` path is absent.
3. **The patch only names manifest files** and parses strictly (unknown line kinds fail; hunk line
   counts equal the header counts; hunks of a file ascend and do not overlap).
4. **Strict reverse-apply.** For each patched file (bytes, split on `\n` keeping the terminator),
   each hunk's new side (context + `+`) equals the file's lines at `<ns>` exactly; it is replaced by
   the old side (context + `-`). A hunk whose new lines are not in the tree fails.
5. **Shape of the patch.** Within each hunk, each contiguous run of changed lines is k `-` lines then
   k `+` lines, paired in order; each pair is exactly: `-<ws>#[cfg(<A>)]` and
   `+<ws>#[cfg(<B>)] // monster-realm: was #[cfg(<A>)]` with identical leading whitespace `<ws>`,
   nothing else on either line (the `+` line ends right after the notice). `<A>` and `<B>` must each
   PARSE as a cfg predicate: `all(…)` / `any(…)` / `not(…)` (one argument) over comma-separated
   predicates (an empty `all()`/`any()` allowed), `target_arch = "<s>"` or `feature = "<s>"` with
   `<s>` in `[A-Za-z0-9_-]*`; any other key, an unbalanced paren, a `]`, or trailing text fails.
   (So a `+` line cannot smuggle code after its attribute.)
   5b. **Wasm equivalence.** Evaluating `<A>` and `<B>` with `target_arch = "wasm32"`, for EVERY
   on/off assignment of the features either names, gives the same result. (So on wasm each patched
   attribute selects what the original selected: the shipped module is the vendor's code.)
6. **Hashes.** Every held file's sha256 — after the reverse-apply for patched files — equals its
   manifest line.
7. **Version agreement.** Each `crate` line's version equals the `version = "…"` in that copy's
   `Cargo.toml` `[package]` table, and the root `Cargo.toml` pin `spacetimedb = "=<v>"` — the line
   inside `[workspace.dependencies]` only (`[patch.crates-io]` also has a `spacetimedb =` line) —
   equals the `spacetimedb` crate line's version.
8. **The guard covers what cargo builds.** The top level of `vendor/` is exactly the declared crate
   directories plus `README.md`, `native-host.patch` and `PRISTINE.sha256`; the root `Cargo.toml`
   `[patch.crates-io]` table lists exactly the declared crates, each `{ path = "vendor/<name>" }`;
   the declared crates are exactly `spacetimedb` and `spacetimedb-bindings-sys`.

Structure: the checks live in a private `fn check(vendor: &Path, root_manifest: &str) -> Result<(), String>`
called by the test, so each failure is one message. The orchestrator proves each of checks 2-8
bites by a local break of the committed tree (never committed), restored from the sandbox copies.

Failure messages name the file/hunk/path. The test must fail (not pass vacuously) when `vendor/`
is absent — which it is before the implementation lands: that is this slice's red run.

### The moved test (tester edits it)

`client/src/net/authToken.test.ts` :: `SDK-DRIFT (nh4)` — the needle
`'Failed to verify token: ${response.statusText}'` → `'Failed to verify token: ${status} ${statusText}'`
and the part of the `it(...)` title that quotes it. Nothing else in the assertion changes. Red until
the SDK moves to 2.12.0 (2.11.0's dist has the old string; 2.12.0's `dist/index.mjs:5219` the new).

## Gates (runner CHECKs in `$MEM/gates/lpw-39.gates.md`; `mr-gates lint` refuses a harness-side probe)

- **lpw-39.1** — `cargo nextest run --locked -p monster-realm-module --run-ignored all && cargo tree
  --locked -p monster-realm-module -e normal --prefix none`. One whole-output EXPECT: summary
  `1312 tests run: 1312 passed, 0 skipped` (1311 master + the guard; the numeral is re-pinned to the
  tester's delivered count), the guard's own `PASS` line, and the tree lines
  `spacetimedb v2.12.0 (/…/vendor/spacetimedb)` / `spacetimedb-bindings-sys v2.12.0 (/…/vendor/…)`.
  The guard ties the vendored bytes to the crates.io 2.12.0 release and the workspace pin to them.
  "Fixture's public API unchanged": every one of the 1311 unchanged tests compiles against it and
  passes, and the diff of `native_host_tests.rs` is comments + the guard (read at review).
- **lpw-39.2** — `cargo clean -p monster-realm-module -p spacetimedb-bindings-sys && cargo test
  --locked -p monster-realm-module --lib --no-run -v`. EXPECT: nothing in the output names
  `muldefs`, `allow-mul`, `link-arg` or `linker=`; bindings-sys and spacetimedb compile at 2.12.0
  from `vendor/`; the verbose rustc line of the lib test binary is present (a fresh link); the
  `Executable` line is printed (the link succeeded). GNU ld refuses a duplicate strong definition,
  so a link with no permission flag has none.
- Both measured RED on master (2.11.0 from the registry) with `mr-gates check`.
- lpw-39.2 runs `cargo clean --locked -p monster-realm-module -p spacetimedb -p spacetimedb-bindings-sys`.
  A `RUSTC_WRAPPER` could add link flags the verbose line does not show; `just cache-on` (opt-in
  sccache) is the only wrapper the repo knows and adds none, so the lookahead is not anchored to a
  bare `rustc` (that would false-red an sccache shell). A successful link without a permission
  flag rules out duplicate strong definitions among the members ld loads; the EVIDENCE adds the
  probe's `nm` result over every dependency rlib, and the PR body the probe's name diff (1311 master
  names all present) and `git diff --stat origin/master -- server-module/src`.
- Local cross-check, not a CHECK: `$MEM/gates/lpw-39.probe.mjs tests|link` also diffs the 1311
  master names (`lpw-39.master-tests.txt`) and runs `nm` over every dependency rlib.

## Isolated environment (never touch `~/.local/share/spacetime`)

Built: `. /tmp/lpw39-iso.u5sDDx/env.sh` (2.12.0 CLI + standalone from the verified release tarball in
`$ISO/bin`; 2.11.0 pair in `$ISO/bin211`; just 1.58.0 install dir on PATH because the asdf shim
needs `~/bin/asdf`). The block below is the recipe it follows.

```sh
ISO=$(mktemp -d /tmp/lpw39-home.XXXXXX); mkdir -p $ISO/bin
cp ~/.local/share/spacetime/bin/2.12.0/spacetimedb-cli $ISO/bin/spacetime
cp ~/.local/share/spacetime/bin/2.12.0/spacetimedb-standalone $ISO/bin/
export RUSTUP_HOME=$HOME/.rustup CARGO_HOME=$HOME/.cargo ASDF_DATA_DIR=$HOME/.asdf \
  PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright GIT_CONFIG_GLOBAL=$HOME/.gitconfig \
  DOCKER_CONFIG=$HOME/.docker npm_config_cache=$HOME/.npm
export PATH="$ISO/bin:$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.asdf/shims:$HOME/.cargo/bin:$PATH"
export HOME=$ISO/home XDG_DATA_HOME=$ISO/home/.local/share XDG_CONFIG_HOME=$ISO/home/.config
```
(`$HOME/.local/bin` deliberately NOT on PATH: its `spacetime` is the version proxy into the operator's
data dir.) Verify `spacetime --version` says 2.12.0 and `which spacetime` is `$ISO/bin`. Every
`just gen` / `just ci` / eval run that may start a host runs in this shell.

## Sequence

1. Ledger CHECK/EXPECT + probe; run the probe on master → both RED (record).
2. Plan review (reviewer + red-team in parallel); fold; checkpoint `wip:` commit + push.
3. Tester (opus): guard test + moved needle. Orchestrator red run: guard fails (no `vendor/`);
   needle fails on SDK 2.11.0; everything else green. Checkpoint.
4. Implement: `vendor/**` (44 files + patch + PRISTINE + README), `.gitattributes` `vendor/** -text`,
   root `Cargo.toml` pin `=2.12.0` + `[patch.crates-io]`, `cargo update -p spacetimedb --precise
   2.12.0` (the seven `spacetimedb*` at 2.12.0), `server-module/Cargo.toml` comment,
   `native_host_tests.rs` citation comments, `account-e2e` non-member dirs list, `ci-tools.sh` pin +
   sha256 `154853dd…2f89` (re-verify by download), `npm install spacetimedb@2.12.0` — the install argument is exact (a
   range would resolve past 2.13, and 2.14+ needs Node 24.22.3); `package.json` gets npm's default
   `"^2.12.0"` as the design says, the lock pins 2.12.0, `just gen` in the isolated
   shell, `authToken.ts` comments. Targeted: nextest module + feature sets, vitest authToken, probe.
   4b. The runbook legs that start a host, all in the isolated shell (`$ISO/bin` also holds the
   2.11.0 `spacetimedb-standalone`/`spacetimedb-cli` from the release tarball): step 1 (release
   notes 2.11.0→2.12.0, `gh release view v2.12.0`); step 6 (2.11.0 host publishes master's module
   and seeds data on an isolated data dir → stop → 2.12.0 host on the same dir → publish this
   branch's module without `--delete-data` → seeded rows survive; then `MR_SMOKE_DB=…
   just smoke-republish`); step 7 (`spacetime describe --json` shape against
   `scripts/verify-release-reducers.mjs`); step 8 (`/v1/metrics` families the recording rules use;
   the Loki/relay leg only if the stack is up, else named in `not-verified:`).
5. Docs to the BUILT state (runbook re-vendor step + advisory read, DECISIONS lockstep version +
   test-host entry built, ARCHITECTURE server-tests row + `vendor/` row, AGENTS/README/PLAYTEST/
   playtest-ops/e2e-flakes/local-play §3 quotation/playtest-report comments/two skills, the design
   doc's built state — incl. its `.cargo-ok` statements, README's License section, the runbook's
   "current pin is 2.11.0" line and a `vendor/` row in its "What moves together" table). The
   runbook's re-vendor step is written for the NEXT hop: re-vendor before step 2's `cargo check`
   (else cargo warns the patch is unused and links the registry stubs); exact commands that write
   PRISTINE in the contract format; `patch --no-backup-if-mismatch` (offsets otherwise leave
   `.orig` files, which check 2 refuses); after an offset apply, regenerate `native-host.patch`
   with `diff -u --label` from a pristine copy (check 4 needs exact line numbers). Measured-on-2.11.0 statements keep their version.
6. Lens batch: reviewer (diff file), red-team (writes cheats against the guard + probe),
   reducer-security-auditor (pinned crates + patch), verifier. `/simplify` inline. desync-guard
   skipped (no game-core, wasm-bindgen or reducer change; the shipped wasm is the vendor's code).
7. Before committing `vendor/`: `git ls-files vendor | wc -l` = 47 (44 + 3). `just ci` once in the isolated shell; `mr-gates check`; comment-scan; PR; STOP.

## plan-delta (vs the design doc)

- `.cargo-ok` is not in a `.crate` (cargo writes it when unpacking into its registry src). Copies
  unpacked from the downloaded `.crate` never have it, so `PRISTINE.sha256` marks only `Cargo.lock`
  as omitted.
- The guard adds checks 5 (cfg-only shape with notice) and 7 (version agreement) to the design's
  two (provenance, no extra files): an edit planted in BOTH a copy and the patch passes 4+6, so 5
  is what makes "nothing else changes" a test, not a review promise.
- `authToken.ts`: besides the lines the design names, the `toError` (:81) and `onConnect` token
  (:238) citations point at 2.11.0 dist lines; they move to 2.12.0's (`errorFromEvent`, :6343;
  `this.token = token` :6214, `if (!this.token && …)` :7059). Boy Scout: :42 names
  `connection.test.ts` for the SDK-DRIFT tooth, which lives in `authToken.test.ts`.
