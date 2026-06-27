# M-infra-a — CI caching + fast inner loop (collision-safe)

> **Infra slice (inserted before M8b).** Pure build/CI acceleration; no game-design surface, no schema
> change. One mergeable PR on `mdrewt/monster-realm`. Build it test-first like any slice — it touches CI,
> so the proof-of-teeth is an anti-stale-cache eval.

## Why
Run #11 measured: the loop ran the full `just ci` 8× and every compile was cold (no `sccache`, no
`Swatinem/rust-cache`; `cargo-audit` compiled from source each CI run). This slice makes every later slice
~10-15 min faster without touching rigor (the full meaningful gate still runs once locally + once remote).

## Invariants upheld
- **No shared `CARGO_TARGET_DIR`** (path/fingerprint-keyed → stale-artifact & lock-contention prone).
  Sharing happens at the **content-addressed `sccache`** layer only.
- Caching covers **third-party dependency compilation only** — never workspace-member artifacts and never
  test *results*; changed code always rebuilds and the full suite always runs.
- nextest is additive: it **cannot run doctests**, so `cargo test --doc` is kept (no coverage regression).

## EARS acceptance criteria
1. WHEN a `cargo` compile runs in a loop worktree, the build SHALL route through `sccache`
   (`RUSTC_WRAPPER=sccache`, shared `SCCACHE_DIR`, `CARGO_INCREMENTAL=0`), enabled via env/recipe — NOT a
   committed `.cargo` `rustc-wrapper` (so contributors without sccache are unaffected).
2. WHEN the `ci` and `e2e` GitHub jobs run, each SHALL restore `Swatinem/rust-cache@v2` with a **distinct
   per-job `prefix-key`** (`v1-ci`, `v1-e2e`), caching deps only (workspace crates auto-stripped).
3. WHEN `just test` runs, it SHALL run `cargo nextest run --workspace` AND `cargo test --doc --workspace`.
4. WHEN iterating red→green, the loop SHALL use `just ci-fast <crate>` (clippy + nextest + doctest, scoped
   to the changed crate) and SHALL run the full `just ci` at most once per slice.
5. WHEN CI needs `cargo-audit`/`cargo-nextest`, it SHALL install prebuilt binaries via
   `taiki-e/install-action`, not `cargo install` from source.
6. PROOF-OF-TEETH: `evals/cache-freshness.eval.mjs` SHALL fail if a warm cache ever serves a stale
   workspace artifact (flip a sentinel const → rebuild on warm cache → assert the new value is observed),
   and SHALL be asserted-wired in the eval manifest (like `evals/e2e-desync-teeth.eval.mjs`).

## Non-goals / deferrals
- Shared target dir (rejected). Larger/self-hosted runners (deferred). Splitting security into a parallel
  CI job → optional follow-up `M-infra-b` (keep it a required gate).

## Implementation notes (build-ready; see outputs/02_infra_slice_ci_caching.md for full snippets)
- **justfile:** replace `test` (nextest + `--doc`); add `ci-fast <crate>`; add a `cache-on` recipe that
  exports `RUSTC_WRAPPER`/`SCCACHE_DIR`/`SCCACHE_CACHE_SIZE`/`CARGO_INCREMENTAL=0`.
- **.github/workflows/ci.yml:** add `Swatinem/rust-cache@v2` to both jobs (per-job `prefix-key`);
  `setup-node` `cache: npm`; replace `cargo install cargo-audit --locked` with
  `taiki-e/install-action {tool: cargo-audit}`; add `taiki-e/install-action {tool: cargo-nextest}` before
  `just test`; cache Playwright browsers in `e2e`.
- **Loop setup:** worktree bootstrap sources the cache env so all cargo/just calls are sccache-backed.

## Definition of done
Full `just ci` green-and-meaningful; `sccache -s` shows hits on a 2nd worktree build; a CI run logs
"Cache restored" and `ci` wall-time drops (~5m → ~2-3m warm); cache-freshness eval red when caching is
stubbed to reuse workspace artifacts, green otherwise; doctests still run; no test deleted/skipped.
