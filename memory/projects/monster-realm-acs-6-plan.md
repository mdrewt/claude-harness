# acs-6 plan — the module trusts issuers by build and admits only entitled players

Worktree `projects/monster-realm/.claude/worktrees/acs-6`, branch `slice/acs-6`, base `af4d5bf2`.
Spec: `specs/monster-realm-v2/M-account-service.spec.md` §acs-6. Design: game `docs/local-play.md` §3
fork (e) and DECISIONS "Ownership is enforced unless a dev feature switches it off".

## Scope decision (right-sizing)

Fork (e) makes the default build enforce and trust nothing, and says every site that publishes for
anonymous play then names `open_join`. Two of those sites are files this run can never be granted
(`mr-touches` NOT_GRANTABLE): `scripts/smoke-republish.sh` (three `--module-path` publishes, then
`join_game`) and `.github/workflows/nightly.yml` (the load smoke publishes the default build, then 20
bots join). Flipping the default here would turn both nightly jobs red with no way to fix them.

So this slice builds the whole mechanism and leaves one line for a follow-up:

- Built: the features `official`, `world`, `dev_issuers`, `open_join`, the implications
  (`open_join` -> `dev_issuers`, `dev_reducers` -> `open_join`), constants computed from the features
  with a release feature winning, the claim reader, `entitled`, the check in `join_game`, the
  `mr_build_profile` section, `just release-module <official|world>`, the ranked gate reading the
  production list, the tests of both sides, DECISIONS amended.
- Left: `default = ["open_join"]` in `server-module/Cargo.toml`. A build that names no feature is
  still the test build, as today. The follow-up removes that line and names `open_join` at
  `scripts/smoke-republish.sh`, `.github/workflows/nightly.yml`, `client/e2e/global-setup.ts`,
  `just publish`, the playtest recipes, `just test`/`ci-fast`/the mutation recipes, README and the
  playtest runbook. Filed with `mr-gates notes add --followup` [security-privacy/MED].
- Every acs-6 criterion is met as written: release builds enforce and trust no dev issuer whatever the
  default is (`--no-default-features --features official`, and a release feature wins anyway).
- Not built: R-lpw-8-LIVEADMISSION (call and sql routes for an unadmitted identity). It is about the
  lpw-9 access rule, not ownership; noted for the supervisor.

## Measured before planning

- P1: a `#[link_section = "mr_build_profile"] #[used] static [u8; N]` built by a `const fn` survives in
  the release wasm (one section, read with `WebAssembly.Module.customSections`), and reflects `cfg!`.
- P2: with the test build's `ALLOWED_ISSUERS` set to the dev issuers,
  `pvp::pvp_tests::ea_ra_06a_ranked_enforcement_inert_until_activation_canary` fails. Widen granted:
  `server-module/src/pvp.rs`, `server-module/src/pvp_tests.rs`.
- `serde_json` is not a dependency of the module; adding it edits `Cargo.lock`, a structural path that is
  refused while acs-4 and st-12 are unmerged. The `mr_ent` claim is read by a small scanner instead.
- Cold release wasm build 30 s; module test binary 58 s.

## Contracts

### `server-module/Cargo.toml` `[features]`

```
default = ["open_join"]
official = []
world = []
dev_issuers = []
open_join = ["dev_issuers"]
dev_reducers = ["open_join"]
load_test_zones = ["game-core/load_test_zones", "dev_reducers"]
```

### `server-module/src/accounts.rs`

```rust
pub(crate) const PRODUCTION_LOGIN_ISSUERS: &[&str] = &["https://auth.monster-realm.invalid/"];
const LOCAL_DEV_ISSUER: &str = "http://localhost:4455";            // one line: the eval patches it
const HOSTED_DEV_ISSUER: &str = "https://auth.monster-realm.spookyowltech.com";
pub(crate) const DEV_LOGIN_ISSUERS: &[&str] = &[LOCAL_DEV_ISSUER, HOSTED_DEV_ISSUER];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct BuildFeatures {
    pub(crate) official: bool, pub(crate) world: bool, pub(crate) dev_issuers: bool,
    pub(crate) open_join: bool, pub(crate) dev_reducers: bool,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct BuildProfile {
    pub(crate) name: &'static str,              // official | world | conflict | dev-enforcing | test | default
    pub(crate) enforces_ownership: bool,
    pub(crate) login_issuers: &'static [&'static str],
    pub(crate) dev_reducers: bool,
}
pub(crate) const fn build_profile(features: BuildFeatures) -> BuildProfile;
pub(crate) const BUILD_FEATURES: BuildFeatures;   // the cfg!() literal, the only per-build line
pub(crate) const BUILD_PROFILE: BuildProfile = build_profile(BUILD_FEATURES);
pub(crate) const ALLOWED_ISSUERS: &[&str] = BUILD_PROFILE.login_issuers;

pub(crate) const ENTITLEMENT_BASE_GAME: &str = "base-game";
pub(crate) const ERR_OWNERSHIP_REQUIRED: &str = "ownership required";

pub(crate) fn token_names_entitlement(raw_payload: &str, entitlement: &str) -> bool;
pub(crate) struct TokenFacts<'a> { pub(crate) issuer: &'a str, pub(crate) audience: &'a [String], pub(crate) raw_payload: &'a str }
pub(crate) fn entitled_under(profile: &BuildProfile, token: Option<TokenFacts<'_>>) -> bool;
pub(crate) fn entitled(ctx: &ReducerContext, profile: &BuildProfile) -> bool;
pub(crate) fn require_entitled(ctx: &ReducerContext, profile: &BuildProfile, reducer: &str) -> Result<(), String>;

pub(crate) const fn profile_section_len(profile: &BuildProfile) -> usize;
pub(crate) const fn profile_section<const N: usize>(profile: &BuildProfile) -> [u8; N];
```

`build_profile` (the fork (e) table): release = official || world; enforces = release || !open_join;
login issuers = PRODUCTION when official && !world, DEV when dev_issuers && !release, else empty;
`dev_reducers` copied. Names: official (official && !world), world (world && !official), conflict
(both), then for non-release: test (open_join), dev-enforcing (dev_issuers), default (neither).

`token_names_entitlement`: true iff the payload is a JSON object with exactly one top-level member
whose key is the bytes `mr_ent` and whose value is an array holding the string `entitlement` as one
element. String-aware and depth-aware; a key or element written with an escape never matches;
anything it cannot follow is `false`.

`entitled_under`: `!profile.enforces_ownership`, or a token whose issuer is in
`profile.login_issuers` exactly, whose audience passes `audience_allowed(.., ALLOWED_AUDIENCE)` and
whose payload names `base-game`. No binding input: lpw-15 adds it when the binding exists.

`require_entitled`: `Err(ERR_OWNERSHIP_REQUIRED)` through the module's `reject` (logged), no read of
any table, no write.

Section text (ASCII, `\n`-terminated lines, in this order):
`profile=<name>`, `enforces_ownership=<true|false>`, `dev_reducers=<true|false>`, then one
`login_issuer=<issuer>` line per trusted issuer.

### `server-module/src/lib.rs`

- `#[cfg(target_arch = "wasm32")] #[link_section = "mr_build_profile"] #[used] static` of
  `profile_section::<{ profile_section_len(&BUILD_PROFILE) }>(&BUILD_PROFILE)`.
- `compile_error!` when a release feature and `dev_reducers` are both named, skipped under `cfg(clippy)`.

### `server-module/src/movement.rs`

```rust
pub fn join_game(ctx: &ReducerContext, name: String) -> Result<(), String> {
    crate::access::require_admitted(ctx, "join_game")?;
    crate::accounts::require_entitled(ctx, &crate::accounts::BUILD_PROFILE, "join_game")?;
    crate::guards::require_not_deleting(ctx, "join_game")?;
    join_with_kit(ctx, name, crate::content_cache::cached_starter_kit())
}
```

### `server-module/src/pvp.rs`

`ranked_enforcement_active()` reads `accounts::PRODUCTION_LOGIN_ISSUERS`: inert in every build until
the production issuer is real, as today.

### `justfile`

- `module-profile wasm`: prints the artefact's `mr_build_profile` text; non-zero unless exactly one
  such section exists.
- `release-module profile`: refuses anything but `official`/`world` (exit 64) before building; builds
  `cargo build -p monster-realm-module --release --target wasm32-unknown-unknown --no-default-features
  --features <profile> --target-dir ${CARGO_TARGET_DIR:-target}/release-module/<profile>` with
  RUSTFLAGS, CARGO_ENCODED_RUSTFLAGS, CARGO_BUILD_RUSTFLAGS and
  CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUSTFLAGS unset; refuses an artefact whose section does not say
  `profile=<profile>`, `enforces_ownership=true`, `dev_reducers=false`; copies it to
  `<target>/release-module/monster-realm-<profile>.wasm`, writes `<that>.sha256`, and prints
  `release-module: <profile> <sha256> <path>` as its last line.
- `test`: one more line, the enforcing side on a real dev-enforcing build:
  `cargo nextest run --workspace --no-default-features --features monster-realm-module/dev_issuers -E 'package(monster-realm-module) & test(/acs6_/)'`;
  the justfile suite's floor moves with its new tests.

### `evals/account-e2e.eval.mjs`

- `ISSUER_NEEDLE` becomes the `const LOCAL_DEV_ISSUER` line; the patched copy is still built with
  default features (the test build) and the existing flow is the acs-6.4 control on a live host.
- New step after the publish: run the recipe on the patched copy
  (`just --justfile <repo>/justfile --working-directory <tmp> release-module official`,
  `CARGO_TARGET_DIR` the shared target), read `module-profile`, publish the artefact to a second
  database on the same host, then over the HTTP call route: a host-minted (anonymous) token and a
  stub-issuer token carrying `mr_ent: ["base-game"]` each call `join_game`; both must be 530 with
  `ownership required`, and the database must hold no `player`, `monster` or `account` row.
- Pure checkers over data: `parseBuildProfile(text)`, `checkReleaseProfile(profile, {want, devIssuers})`,
  `checkOwnershipRefusals(input)`. The pass detail carries
  `ACS6-RELEASE-VERIFIED(profile=official enforces=true …)`.

## Tests (tester, opus) and where each criterion is proved

| Criterion | Tests |
|---|---|
| acs-6.1 | `movement_tests.rs` `acs6_enforcing::acs6_1_*` (real `join_game`, dev-enforcing build: anonymous refused with the fixed error, every table unchanged); default-build twin through `require_entitled` with an enforcing profile |
| acs-6.2 | `acs6_enforcing::acs6_2_*` (dev-issuer token without `mr_ent`, with `mr_ent` naming something else, with the wrong audience; same error, no write); `accounts_tests.rs` claim-reader table and property test, `entitled_under` table |
| acs-6.3 | `acs6_enforcing::acs6_3_*` (entitled dev token joins; rows as an open join writes them) |
| acs-6.4 | `movement_tests.rs` `acs6_open::acs6_4_*` (default build: anonymous join through `join_game`; `BUILD_PROFILE` is the test profile); the account e2e's anonymous joins on a live host; the Playwright suite |
| acs-6.5 | the eval step above; `accounts_tests.rs` `build_profile` table over all 32 feature sets and the section bytes; `justfile.test.mjs` argument refusal |

Mutation gate (nightly `mutate-server`, default features, zero tolerance): every function added is
reachable in the default build with the profile as an argument, so no mutant is equivalent there.

## Order

1. Plan review (reviewer, red-team), ledger CHECK/EXPECT, wip checkpoint.
2. Tester writes the tests; orchestrator proves red.
3. Implement: Cargo features and accounts.rs, lib.rs, movement.rs, pvp.rs, justfile, eval wiring.
4. Targeted loop: clippy (`--all-features`), nextest default, dev_reducers, load_test_zones, dev_issuers.
5. Lenses: reviewer, /simplify, red-team, reducer-security-auditor, desync-guard, verifier.
6. `just ci`, `mr-gates check`, e2e shards, doc-keeper (DECISIONS), PR.

## Risks

- `ALLOWED_ISSUERS[0]` in `access_tests.rs` under `clippy --all-features` (official + world: an empty
  list). If rustc's `unconditional_panic` lint fires there it is a compile error and the file is
  widened with that proof.
- The eval's second build adds about a minute warm; cold it compiles the dependency tree once more.
- `ranked` stays inert on a dev-enforcing build; lpw-15's bound players have no `account` row, so the
  gate must not key on the build's own list. Recorded in DECISIONS.

## Plan review (reviewer + red-team), what changed

Accepted, and binding over the Contracts above where they differ:

1. Test gating is by feature, never by "default build": `acs6_open` under
   `#[cfg(feature = "open_join")]`, `acs6_enforcing` under
   `#[cfg(all(feature = "dev_issuers", not(feature = "open_join")))]`. The `just test` line filters
   `test(/acs6_enforcing/)`.
2. `build_profile` applies cargo's implications itself, so a feature given to the compiler from
   outside cargo cannot produce a state the table lacks: `BuildFeatures` gains `load_test_zones`;
   `dev_reducers = dev_reducers || load_test_zones`, `open_join = open_join || dev_reducers`,
   `dev_issuers = dev_issuers || open_join`, then the table. 64 feature sets in the table test.
   The `compile_error!` covers `load_test_zones` too.
3. No `TokenFacts`, no `entitled_under`: `entitled(ctx, profile) -> bool` short-circuits in this order
   (not enforcing -> true; no token -> false; issuer; audience; claim), so an untrusted token's
   audience is never read. `require_entitled` wraps it.
4. Claim reader: exactly one top-level occurrence of the key `mr_ent`; a duplicate is false; a
   backslash in ANY top-level key is false (a reader that decodes escapes takes the last of two
   spellings); iterative, byte-wise, no recursion, no panicking slice. The reviewer's input list is
   in the tester brief.
5. `release-module`: `CARGO_ENCODED_RUSTFLAGS` is set empty (it then overrides config-file flags)
   and `RUSTFLAGS`, `CARGO_BUILD_RUSTFLAGS`, `CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUSTFLAGS` are
   unset; the section is parsed as exact `key=value` lines; `official` must list exactly one login
   issuer and it must be `https:`, `world` none; the artefact's bytes must hold none of
   `FORBIDDEN_REDUCERS` (`scripts/verify-release-reducers.mjs`; measured: a reducer's name is plain
   bytes in the wasm, `join_game` 5 hits, the dev names 0 in a default build).
6. The eval proves the enforcing side on a live host twice: a dev-enforcing build of the patched
   copy (anonymous refused, a stub token without `mr_ent` refused, a stub token with it joins) and
   the recipe's `official` artefact (anonymous refused, the entitled stub token refused, no
   `account` row). Both run before the driver starts.
7. The comment over the deletion gate in `join_game` is corrected.

Recorded, not built:
- The interim default is not "as today": a build naming no feature also trusts the two dev issuers
  (today it trusts only the `.invalid` placeholder). Stated in DECISIONS and in the follow-up.
- `release-module world` is not built by any test (its row is pinned by the table test); run once by
  hand for the PR.
- A connection that outlives its token keeps playing: nothing re-reads `exp` after connect, so a
  refund reaches an open connection only at its next connect. Spec note with a follow-up row.
- No source pin on the `require_entitled` line in `join_game` (doctrine: no source-text scans); the
  dev-enforcing nextest line in `just test` and the eval's live steps are what fail if it is removed.
