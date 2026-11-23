# acs-6 tester brief — write the failing tests; implement nothing

Worktree (the ONLY tree you read or write): `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/acs-6`.
Never read or write the main checkout at `projects/monster-realm/` itself. You have no shell; the
orchestrator runs everything and proves red.

Slice: the server module trusts login issuers by build and `join_game` admits only entitled
players. Plan (read it first, including its last section "Plan review", which overrides the
Contracts where they differ): `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-acs-6-plan.md`.
Design: `docs/local-play.md` lines 782-891 in the worktree.

## Criteria (EARS)

- acs-6.1: WHEN an anonymous connection calls `join_game` on an enforcing build, THE SYSTEM SHALL refuse it with one fixed error and write nothing.
- acs-6.2: WHEN a connection whose token lacks `mr_ent` (or names no `base-game`) calls `join_game` on an enforcing build, THE SYSTEM SHALL refuse it with the same error.
- acs-6.3: WHEN an entitled account from a dev issuer calls `join_game` on a dev-enforcing build, THE SYSTEM SHALL proceed as today.
- acs-6.4: WHEN the e2e suite runs on a test build, THE SYSTEM SHALL let anonymous connections join as today.
- acs-6.5: WHEN a release build is produced by the recipe that ships modules, THE SYSTEM SHALL enforce ownership and trust neither dev issuer (the recipe's test builds the module and checks both).

## Contracts (none of this exists yet; your tests call it)

`server-module/Cargo.toml` features: `default = ["open_join"]`, `official`, `world`, `dev_issuers`,
`open_join = ["dev_issuers"]`, `dev_reducers = ["open_join"]`,
`load_test_zones = ["game-core/load_test_zones", "dev_reducers"]`.

`server-module/src/accounts.rs` (all `pub(crate)` unless noted):

```rust
pub(crate) const PRODUCTION_LOGIN_ISSUERS: &[&str] = &["https://auth.monster-realm.invalid/"];
const LOCAL_DEV_ISSUER: &str = "http://localhost:4455";            // private; its own line
const HOSTED_DEV_ISSUER: &str = "https://auth.monster-realm.spookyowltech.com";   // private
pub(crate) const DEV_LOGIN_ISSUERS: &[&str] = &[LOCAL_DEV_ISSUER, HOSTED_DEV_ISSUER];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct BuildFeatures {
    pub(crate) official: bool, pub(crate) world: bool, pub(crate) dev_issuers: bool,
    pub(crate) open_join: bool, pub(crate) dev_reducers: bool, pub(crate) load_test_zones: bool,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct BuildProfile {
    pub(crate) name: &'static str,
    pub(crate) enforces_ownership: bool,
    pub(crate) login_issuers: &'static [&'static str],
    pub(crate) dev_reducers: bool,
}
pub(crate) const fn build_profile(features: BuildFeatures) -> BuildProfile;
pub(crate) const BUILD_FEATURES: BuildFeatures;      // each field is cfg!(feature = "<its name>")
pub(crate) const BUILD_PROFILE: BuildProfile;        // build_profile(BUILD_FEATURES)
pub(crate) const ALLOWED_ISSUERS: &[&str];           // BUILD_PROFILE.login_issuers
pub(crate) const ALLOWED_AUDIENCE: &[&str] = &["monster-realm"];   // exists today, unchanged

pub(crate) const ENTITLEMENT_BASE_GAME: &str = "base-game";
pub(crate) const ERR_OWNERSHIP_REQUIRED: &str = "ownership required";

pub(crate) fn token_names_entitlement(raw_payload: &str, entitlement: &str) -> bool;
pub(crate) fn entitled(ctx: &ReducerContext, profile: &BuildProfile) -> bool;
pub(crate) fn require_entitled(ctx: &ReducerContext, profile: &BuildProfile, reducer: &str) -> Result<(), String>;

pub(crate) const fn profile_section_len(profile: &BuildProfile) -> usize;
pub(crate) const fn profile_section<const N: usize>(profile: &BuildProfile) -> [u8; N];
```

`build_profile`, in this order:
1. implications: `dev_reducers = f.dev_reducers || f.load_test_zones`; `open_join = f.open_join || dev_reducers`; `dev_issuers = f.dev_issuers || open_join`.
2. `release = official || world`; `enforces_ownership = release || !open_join`.
3. `login_issuers`: `PRODUCTION_LOGIN_ISSUERS` when `official && !world`; `DEV_LOGIN_ISSUERS` when `dev_issuers && !release`; otherwise empty.
4. `dev_reducers` field: the value from step 1 (a release build with a dev-reducer feature still reports `true`).
5. `name`: `"official"` (official && !world), `"world"` (world && !official), `"conflict"` (both); otherwise `"test"` (open_join), `"dev-enforcing"` (dev_issuers), `"default"`.

So: no feature set has production trust with enforcement off, none has production and dev issuers
together, and the five rows of the design table that matter read: none -> default/enforces/no
issuers; dev_issuers -> dev-enforcing/enforces/dev; open_join -> test/open/dev; official ->
official/enforces/production; world -> world/enforces/none.

`token_names_entitlement(raw_payload, entitlement)`: true iff `raw_payload` is a JSON object in
which the key `mr_ent` occurs exactly once at the top level and its value is an array one of whose
elements is the JSON string `entitlement`. Fail-closed rules: a second top-level `mr_ent` -> false;
a backslash in ANY top-level key -> false; a key or element written with an escape never matches;
an element is compared whole (`"base-game "`, `"xbase-game"` do not match); nested arrays or
objects inside the array are skipped, not searched; anything malformed, truncated or not an object
-> false; it never panics (10,000 levels of `[` included) and never recurses.

`entitled(ctx, profile)`: `true` when `!profile.enforces_ownership` (the token is then never read).
Otherwise false with no token; else all three, short-circuit in this order: issuer is exactly one
of `profile.login_issuers`; audience passes `audience_allowed(.., ALLOWED_AUDIENCE)`; the payload
names `base-game`. It reads no table and writes nothing.

`require_entitled`: `Ok(())` when entitled, else `Err(ERR_OWNERSHIP_REQUIRED.to_string())`; no table
read, no write.

`profile_section*`: the ASCII text below, every line ending in `\n`, in this order;
`profile_section_len` is its byte length and `profile_section::<N>` its bytes when `N` is that length:

```
profile=<name>
enforces_ownership=<true|false>
dev_reducers=<true|false>
login_issuer=<issuer>          (one line per issuer, in list order; no line when there is none)
```

`server-module/src/movement.rs`: `join_game` becomes, in this order: `access::require_admitted`,
`accounts::require_entitled(ctx, &accounts::BUILD_PROFILE, "join_game")`,
`guards::require_not_deleting`, `join_with_kit(..)`.

`server-module/src/pvp.rs`: `ranked_enforcement_active()` reads
`crate::accounts::PRODUCTION_LOGIN_ISSUERS` (today it reads `ALLOWED_ISSUERS`).

`justfile` recipes:

- `just module-profile <wasm>`: prints the artefact's `mr_build_profile` custom-section bytes on
  stdout and exits 0; exits non-zero with a line on stderr when the file holds no such section or
  more than one.
- `just release-module <profile>`:
  - any argument but `official` or `world`: exit 64, a line on stderr, and `cargo` is never run;
  - runs exactly one `cargo` command: `build -p monster-realm-module --release --target wasm32-unknown-unknown --no-default-features --features <profile> --target-dir <T>/release-module/<profile>`, where `<T>` is `$CARGO_TARGET_DIR` when set, else `target`; that command's environment has `CARGO_ENCODED_RUSTFLAGS` set to the empty string and `RUSTFLAGS`, `CARGO_BUILD_RUSTFLAGS`, `CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUSTFLAGS` unset, whatever the caller exported;
  - the built file is `<T>/release-module/<profile>/wasm32-unknown-unknown/release/monster_realm_module.wasm`;
  - it refuses (non-zero, writes neither output file) an artefact whose section is absent or
    duplicated, or does not hold the exact lines `profile=<profile>`, `enforces_ownership=true`,
    `dev_reducers=false`, or whose `login_issuer=` lines are not exactly one `https:` issuer for
    `official` / none for `world`, or whose bytes contain any name in `FORBIDDEN_REDUCERS`
    (exported by `scripts/verify-release-reducers.mjs`);
  - on success it copies the artefact to `<T>/release-module/monster-realm-<profile>.wasm`, writes
    `<T>/release-module/monster-realm-<profile>.wasm.sha256` holding the lowercase hex SHA-256 of
    the artefact followed by two spaces, the file's base name and a newline (the `sha256sum`
    format), and its LAST stdout line is `release-module: <profile> <sha256> <absolute path of the copy>`.

## Files you write (only these five)

1. `server-module/src/accounts_tests.rs` — append new modules; do not touch existing tests.
   - `mod acs6_profile`: `build_profile` over ALL 64 feature sets against an oracle you write
     independently in the test (do not call the function to build the expectation), plus the
     named rows above spelled out one by one, plus the two invariants (no production issuers
     without enforcement; never production and dev issuers together; a release never reports a dev
     issuer), plus the per-build constants: `BUILD_PROFILE == build_profile(BUILD_FEATURES)`,
     `ALLOWED_ISSUERS == BUILD_PROFILE.login_issuers`, and feature-gated checks of the build itself
     (`#[cfg(feature = "open_join")]`: not enforcing, the two dev issuers in order, name `test`;
     `#[cfg(all(feature = "dev_issuers", not(feature = "open_join")))]`: enforcing, the two dev
     issuers, name `dev-enforcing`). Pin the three issuer strings by value.
   - `mod acs6_claim`: `token_names_entitlement` — a table and a `proptest` property whose JSON
     text is rendered from a model you generate (so the model is the oracle; `proptest` is already
     a dev-dependency, `serde_json` is NOT available). The table must include: the real payload
     `{"iss":"http://localhost:4455","sub":"dev:1f0e","aud":"monster-realm","mr_ent":["base-game"],"iat":1,"exp":2}` compact and with spaces/tabs/newlines around `:` `,` `[` `]` `{` `}` (true); `["a","base-game"]` (true); multi-byte UTF-8 in other values (true); `mr_ent` first, middle and last member (true); a `sub` whose string value contains the escaped text `x\",\"mr_ent\":[\"base-game\"]` and no real claim (false); a value `"a\\"` before the real key (true: the backslash pair ends the string); `{"p":{"mr_ent":["base-game"]}}` (false); `{"mr_ent":[["base-game"]]}` (false); `{"mr_ent":[{"a":"base-game"}]}` (false); `"mr_ent":"base-game"` (false); `"mr_ent":{"base-game":1}` (false); elements `"base-game-x"`, `"xbase-game"`, `"base-game "`, `"Base-Game"`, `"base-game"` (false); keys `"xmr_ent"`, `"mr_ent "`, `"MR_ENT"`, `"mr_ent"` (false); a duplicate key in both orders, `[]` then `["base-game"]` and the reverse (false); `{"mr_ent":["base-game"],"mr_ent":[]}` (false); `mr_ent` null, true, 1, `[]`, `[1,null,true]` (false); a top-level array, `""`, `{`, `{"mr_ent":["base-game"`, an unterminated string, trailing garbage after the object, 10,000 `[` (false, no panic); the second argument is honoured (`"soundtrack"` named, `base-game` asked: false; and the reverse).
   - `mod acs6_door`: `entitled` and `require_entitled` on the native host with the profile as an
     argument (these run in every build, the default one included, and are what the nightly
     mutation gate sees). Build profiles with `build_profile(..)`. Cover: a non-enforcing profile
     admits an anonymous caller and a caller with no connection; under the dev-enforcing profile an
     anonymous connection (no token), a host-style token (`iss` not listed), a dev-issuer token
     without `mr_ent`, with `mr_ent` naming something else, with the wrong audience but the claim,
     and a production-issuer token with the claim are each refused with exactly
     `ERR_OWNERSHIP_REQUIRED`; a dev-issuer token with audience and claim is admitted (both dev
     issuers); under the official profile the production-issuer token with the claim is admitted
     and the dev-issuer one refused; under the `world` and `default` profiles nobody is admitted;
     a token from an untrusted issuer whose `aud` is a number does not panic (the audience is
     never read for it); and `require_entitled` performs no table read and no write (the fixture
     counts both).
   - `mod acs6_section`: `profile_section_len` / `profile_section` exact bytes for the official,
     world, dev-enforcing, test and default profiles (expected text written out literally).
2. `server-module/src/movement_tests.rs` — inside `mod nh` (reuse `sr11_world` and its helpers):
   - `#[cfg(all(feature = "dev_issuers", not(feature = "open_join")))] mod acs6_enforcing` — the
     REAL reducer `crate::movement::join_game` on a real dev-enforcing build. Test names start
     `acs6_1_`, `acs6_2_`, `acs6_3_` (the acceptance ledger selects
     `test(/acs6_enforcing::acs6_1_/)` and so on):
     - `acs6_1_*`: an anonymous connection (a connection with no token, and one with a host-style
       token) is refused with exactly `ERR_OWNERSHIP_REQUIRED`, and no table gained, lost or
       changed a row (compare every table the join world registers, before and after; also the
       fixture's write counters).
     - `acs6_2_*`: a dev-issuer token without `mr_ent`; with `mr_ent` naming only another
       entitlement; with `mr_ent` an empty array; with the claim but another audience: the same
       error, nothing written.
     - `acs6_3_*`: an entitled dev-issuer token joins, for each of the two dev issuers; the rows it
       writes are the rows an open join writes (player, character, move intent, handle, kit as
       `sr11_world` arranges), and a second call answers `already joined`.
   - `#[cfg(feature = "open_join")] mod acs6_open`, names starting `acs6_4_`: on a test build the
     real `join_game` admits an anonymous connection, a connection with no token at all and a
     host-style token, and writes the player row; `BUILD_PROFILE.enforces_ownership` is false.
   Use `fx.run_as_conn_at(who, conn, Some(&payload_json), at(ms), |ctx| ..)` for a token-bearing
   connection and `None` for an anonymous one (see `server-module/src/access_tests.rs` lines 60-100
   and 205-225, and `native_host_tests.rs` lines 1017-1070 and 1975-2020).
3. `server-module/src/pvp_tests.rs` — the ranked gate must stay inert in every build: the existing
   canary `ea_ra_06a_ranked_enforcement_inert_until_activation_canary` and the `ea_ra_06b` matrix
   keep their assertions; update only the message text that names `accounts::ALLOWED_ISSUERS` to
   name `accounts::PRODUCTION_LOGIN_ISSUERS`, and add one test, `acs6_ranked_gate_reads_the_production_list`,
   asserting `!super::ranked_enforcement_active()` and that `issuers_configured(crate::accounts::DEV_LOGIN_ISSUERS)`
   is true (so the gate would have switched on had it read the build's own list on a test build).
4. `justfile.test.mjs` — new `node:test` cases that RUN the real recipes with a recording stand-in
   `cargo` first on PATH (the file already does this for `spacetime`; copy its pattern, its env
   scrubbing and its temp-dir cleanup). The stand-in parses `--target-dir <dir>` and writes the
   fixture wasm the test chose to `<dir>/wasm32-unknown-unknown/release/monster_realm_module.wasm`,
   and records its arguments and the four rustflags variables (set or unset, and value). A wasm
   fixture is the 8-byte header `00 61 73 6d 01 00 00 00` followed by custom sections, each
   `00`, LEB128(size of the rest), LEB128(name length), name bytes, payload bytes. Run the recipes
   as `just --justfile <JUSTFILE> --working-directory <tmp dir> ...` with `CARGO_TARGET_DIR` unset
   so outputs land under `<tmp dir>/target/release-module/`. Cases: a bad argument (`dev`, `test`,
   `official,world`, empty) exits 64 and cargo was never run; the cargo arguments and environment
   for `official` and for `world` with `RUSTFLAGS`, `CARGO_BUILD_RUSTFLAGS`,
   `CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUSTFLAGS` and `CARGO_ENCODED_RUSTFLAGS` all exported by the
   caller; a good `official` artefact and a good `world` artefact are accepted (copy present and
   byte-identical, `.sha256` content, last stdout line); each refusal alone (no section; two
   sections; `profile=test`; `profile=world` when `official` was asked; `enforces_ownership=false`;
   `dev_reducers=true`; `official` with no issuer, with two issuers, with an `http:` issuer; `world`
   with an issuer; a `profile=officialx` line and a `xprofile=official` line (exact-line matching);
   an artefact whose bytes contain `grant_bait`) exits non-zero and writes neither output file;
   a failing cargo fails the recipe; `module-profile` prints the section bytes exactly and refuses
   zero and two sections. Report the new total number of tests in the file (the door in `just test`
   holds a floor).
5. `evals/account-e2e.eval.mjs` — the live rig. Keep every existing step. Changes:
   - `ISSUER_NEEDLE` becomes the full line `const LOCAL_DEV_ISSUER: &str = "http://localhost:4455";`
     and `patchAllowedIssuers` replaces it with the same line carrying the stub issuer (same throw
     contract; the trailing-slash rule stays). This file carries NO scheme literal anywhere,
     comments included: assemble every URL from parts as the file already does (`http:${'//'}…`).
   - `mintJwt` gains an optional last parameter of extra claims merged into the payload.
   - Export pure functions (decisions over data, like the file's other checkers):
     `parseBuildProfile(text)` -> `{ ok, reason, profile, enforcesOwnership, devReducers, loginIssuers }`
     (exact `key=value` lines; unknown key, a missing or repeated single-valued key, or a line
     without `=` -> not ok); `checkReleaseProfile(parsed, { want, devIssuers, productionIssuer })`
     -> `{ ok, reason }` (name is `want`, enforces, no dev reducers, issuers exactly
     `[productionIssuer]` for official, and none of `devIssuers`);
     `checkOwnershipRefusals(input)` -> `{ ok, reason, detail }` over the recorded statuses, bodies
     and row counts described below.
   - In `runLivePhase`, after the first `publish` succeeds and BEFORE the driver is spawned:
     a. Dev-enforcing: build the patched copy again with
        `cargo build -p monster-realm-module --release --target wasm32-unknown-unknown --no-default-features --features dev_issuers`
        (same cwd, env and target dir as the first build; it overwrites the same wasm path, which
        is why it runs after the first publish) and publish it to the database
        `mr-acct-e2e-enforcing`.
     b. Mint, from the stub's first issuer and key with audience `[E2E_CLIENT_ID]`: a token with
        `mr_ent: ['base-game']`, one with no `mr_ent`, one with `mr_ent: ['soundtrack']`. Get an
        anonymous token with `POST <host>/v1/identity` (JSON reply `{ identity, token }`).
     c. Call `join_game` over the HTTP route: `POST <host>/v1/database/<db>/call/join_game`, headers
        `Authorization: Bearer <token>` and `Content-Type: application/json`, body a JSON array of
        the arguments (`["Name"]`). Measured on 2.11.0: a reducer `Err` answers status 530 with the
        error text as the whole body; success answers 200 with an empty body; a join's starter
        monster and its `player_handle` row outlive the call, its `player` row does not.
     d. On `mr-acct-e2e-enforcing`: the anonymous token, the no-claim token and the other-claim
        token are each 530 with body exactly `ownership required`; then `monster` and
        `player_handle` each hold 0 rows; then the entitled token is 200; then each holds exactly 1.
     e. Official: run the recipe on the patched copy,
        `just --justfile <repoRoot>/justfile --working-directory <tmp> release-module official`,
        with `CARGO_TARGET_DIR` the same shared target dir, timeout 900 s. Take the copy's path
        and hash from the last stdout line, recompute the SHA-256 of the file and require equality,
        read the profile with `just --justfile <repoRoot>/justfile module-profile <path>`, and
        require `checkReleaseProfile` with `devIssuers` = the stub issuer the copy was patched to
        and the hosted dev issuer, `productionIssuer` = the `.invalid` placeholder.
     f. Publish that artefact to `mr-acct-e2e-official`. The anonymous token and the ENTITLED
        stub token are each 530 `ownership required`; `monster`, `player_handle` and `account`
        each hold 0 rows there (no account for a dev-issuer token).
     g. Any failure throws, as every other step does. On success the returned `detail` begins
        with these two tokens, in this order, before the existing text:
        `ACS6-RELEASE-VERIFIED(profile=official enforces_ownership=true dev_reducers=false login_issuers=1 sha256=<first 12 hex>)`
        and `ACS6-ENFORCING-VERIFIED(anon=refused no_claim=refused other_claim=refused entitled=joined)`.
   - `sqlTable` is bound to `DB_NAME`; add a database parameter or a sibling for the counts.

## Rules

- Tests state behaviour through the contract above; no test reads source text.
- The nightly mutation gate (cargo-mutants, default features, zero surviving mutants) covers
  `build_profile`, `token_names_entitlement`, `entitled`, `require_entitled`, `profile_section_len`
  and `profile_section`: every comparison, boolean operator and boundary in them needs a test that
  fails when it is flipped. Prefer exact-value assertions (`assert_eq!` on whole results).
- Repo scanners: no credential-shaped literal (`secret`, `password`, `token` followed by an 8+
  character string literal) in fixtures; in comments you add, no slice or ticket ids (`acs-6`,
  `lpw-9`, `ADR-…`) and no history wording (`no longer`, `used to`, `previously`, `now` as a
  change marker). Test NAMES may carry `acs6_…`. Comments state what the test proves.
- `rustfmt` and `biome` formatting; `clippy --all-targets --all-features -D warnings` compiles
  every test under every feature at once (official and world together: `ALLOWED_ISSUERS` is then
  EMPTY, so never index it with a constant; index `DEV_LOGIN_ISSUERS` / `PRODUCTION_LOGIN_ISSUERS`).
- Do not edit any non-test source file, the justfile, Cargo.toml or anything outside the five files.

## Report back (short)

1. Per file: the test names added, and for the Rust files the count per ledger selector
   (`acs6_enforcing::acs6_1_`, `acs6_enforcing::acs6_2_`, `acs6_enforcing::acs6_3_`,
   `acs6_open::acs6_4_`) and the total `node:test` count of `justfile.test.mjs`.
2. Findings, apart from the tests: **defects** you believe the contract or existing code has, and
   **questions** where the contract was silent and what you assumed.
