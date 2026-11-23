## What & why

`join_game` now refuses a player who does not own the game, on any build that enforces ownership. What a build enforces and which login issuers it trusts is computed from its cargo features, so it is a property of the artefact and not of a row or a setting.

- **Features** (`server-module/Cargo.toml`): `official`, `world`, `dev_issuers`, `open_join` (implies `dev_issuers`); `dev_reducers` now implies `open_join`. `accounts::build_profile` turns a feature set into a `BuildProfile` (name, enforces, login issuers, dev reducers). A release feature always wins over a dev feature.
- **The check** (`accounts::entitled`, `accounts::require_entitled`): on an enforcing build the caller's token must come from one of the build's login issuers, be addressed to `monster-realm`, and name `base-game` in `mr_ent`. Everyone else, anonymous connections included, gets the one error `ownership required`, and nothing is written. `join_game` calls it after the admission check and before the deletion gate.
- **A module to ship**: `just release-module <official|world>` builds exactly that profile, reads the profile back from the artefact (a wasm section, `mr_build_profile`), refuses anything that is not what was asked for, and writes the artefact with its SHA-256. `just module-profile <wasm>` prints the section.
- **Test builds are unchanged for players**: a build that names `open_join` admits everyone, so the unit tests and the Playwright suite join anonymously as before.

## What to read first (choices the spec leaves open)

1. **The default build is still open.** The access design (`docs/local-play.md` §3, fork (e)) wants a build that names no feature to enforce and admit nobody. That means every site that publishes for anonymous play names `open_join`, and two of those sites are files a build run can never be granted: `scripts/smoke-republish.sh` and `.github/workflows/nightly.yml`. Flipping the default here would have turned both nightly jobs red. So `default = ["open_join"]` stays, and the flip is filed as `R-acs-6-DEFAULTOPEN` with the full list of sites. All five criteria hold without it: the release recipe passes `--no-default-features`, and a release feature beats `open_join` anyway.
2. **A default build now trusts the two dev issuers.** On `master` it trusted only the `.invalid` placeholder. This follows from item 1 plus the spec ("test and dev builds trust the two dev issuers"), and it is stated in DECISIONS.
3. **The ownership check gates entry, not every reducer.** `care`, `train`, `evolve`, `set_nickname` and `set_party_slot` act on a monster the caller owns and never ask for a `player` row, so they do not make the check. Today a not-entitled account gets no token and so owns nothing; it matters for a database carried over from an open build. Filed as `R-acs-6-NOPLAYERROWREDUCERS`; the spec's "every gameplay reducer inherits the rule" is not true as written.
4. **`mr_ent` is read by a hand-written scanner** (`token_names_entitlement`, about 150 lines with its helpers). The module has no JSON crate, and adding `serde_json` edits `Cargo.lock`, which is not grantable while other slices are in flight. It is iterative, fails closed (duplicate key, escaped key, anything it cannot follow), and was attacked directly by the red-team (35 hostile payloads, 1 MB inputs, no false positive, no panic, linear time).
5. **Ranked play reads the production issuer list**, not the build's own (`pvp.rs`). Otherwise a test build, which now trusts the dev issuers, would have switched the ranked gate on and refused every guest PvP test. It stays inert in every build until the production issuer is real, as before.
6. **A `world` build admits nobody yet.** It trusts no login issuer, and the world binding that would entitle its players is a later slice.
7. **`just test` gains one line**: the enforcing tests run on a real dev-enforcing build (`--no-default-features --features monster-realm-module/dev_issuers`). On an open build the check refuses nobody, so no default-build test can see whether `join_game` calls it. I measured this: with the call deleted, all 1,186 default-build tests pass and 11 of the 13 on that line fail.
8. **The account e2e eval builds the module three times now** (test, dev-enforcing, and `official` through the recipe) and takes about 40 s longer warm.

## Acceptance

Acceptance: 5/5 met, 0 deferred, 0 unmet — acs-6 seed:f4d4957bba6b7f53
touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- server-module/src/pvp.rs — red test: with the test build's ALLOWED_ISSUERS set to the two dev issuers (the acs-6 contract), pvp::pvp_tests::ea_ra_06a_ranked_enforcement_inert_until_activation_canary fails (ranked_enforcement_active reads accounts::ALLOWED_ISSUERS, so guest PvP is refused in every test and e2e build); docs/local-play.md section 3 fork (e) names pvp.rs and its tests as changing in this slice. Probe log: /tmp/acs6-sb.vufESS/p2-canary.log
- server-module/src/pvp_tests.rs — red test: with the test build's ALLOWED_ISSUERS set to the two dev issuers (the acs-6 contract), pvp::pvp_tests::ea_ra_06a_ranked_enforcement_inert_until_activation_canary fails (ranked_enforcement_active reads accounts::ALLOWED_ISSUERS, so guest PvP is refused in every test and e2e build); docs/local-play.md section 3 fork (e) names pvp.rs and its tests as changing in this slice. Probe log: /tmp/acs6-sb.vufESS/p2-canary.log
- docs/local-play.md — review finding at e1e985fc (reviewer lens): docs/local-play.md section 3 fork (e) states, as what this slice builds, that the default build admits nobody, that every publish site names open_join and that ranked play reads the build's own issuer list; the slice as built keeps open_join in the default features (the publish sites are files it cannot be granted) and has ranked play read the production list, so those sentences are false at merge unless the doc is amended with the code

## Test-first evidence

Tests were written by the tester (opus) from the criteria and run red by the orchestrator against deliberately wrong stubs (an always-true `entitled`, a substring claim reader, a constant profile, no recipe, no check in `join_game`): `memory/projects/gates/acs-6.red-proof.log`.

| Run against the stubs | Result |
|---|---|
| default build, `test(/acs6/)` | 36 run, 24 failed |
| dev-enforcing build, `test(/acs6_enforcing/)` | 13 run, 11 failed |
| `node --test justfile.test.mjs` | 38 run, 34 failed |
| account e2e eval | failed (`justfile does not contain recipe release-module`) |

The tests that passed against the stubs are the positive paths and the "as today" controls for acs-6.4.

Mutation evidence is in `memory/projects/gates/acs-6.mutants.log`:

- cargo-mutants over every new function (default features, whole module suite per mutant): 148 mutants, 122 caught, 10 timeouts, 12 unviable, 4 missed. The 4 misses were two redundant branches (an empty object and an empty array answer the same either way); I deleted the branches. The re-runs over the rewritten reader: 43 mutants, 42 caught, 1 timeout, 0 missed, twice.
- Hand mutants cargo-mutants cannot make: the check deleted from `join_game` (caught by the dev-enforcing line and by the live eval); `official` trusting the dev issuers (6 tests fail, and the recipe refuses the artefact); the opening brace made optional in the reader (survived, then caught after the tester added rows); the artefact's section built from a fixed `official` profile (the verifier's; survived, then caught after the eval read the section of all three artefacts it builds).

## Local gate

`just ci` exit 0 at `305df60f` (`/tmp/acs-6-ci.log`): Rust 3,502 + 1,205 (`dev_reducers`) + 3,174 (`load_test_zones`) + 13 (dev-enforcing) tests; node doors 141 / 83 / 38; 15 of 15 evals (bindings-drift clean: the features change no table, reducer, view or type); account-service 13 files, 874 tests; client 250 files, 6,364 tests; verify-build OK; observability 9 checks, 0 failed; check-secrets clean.

`just e2e-shards` exit 0 against a local in-memory host: 8 of 8 shards, 276 passed, 1 skipped (`/tmp/acs-6-e2e.log`). The module it publishes is the `dev_reducers` build, which is the test profile.

`mr-gates check`: 5 of 5 met. `mr-comment-scan`: clean.

Two earlier gate runs did not finish, and neither was a failure of this diff: `st-12`'s `just ci` was running at the same time. The account eval kills any other running copy on the machine (a shared marker file), which killed my first run at the eval step (exit 137) and left its host orphaned; the orphan then held the data-directory lock and my second run's host never came up. I stopped my own orphan by pid and the third run was green. Filed as `R-acs-6-EVALKILLSSIBLING`.

## plan-delta

- The default build does not flip (item 1 above).
- The "release feature with a dev reducer does not compile" rule is a `const` assertion in `accounts.rs`, not `compile_error!` in `lib.rs`: the reducer census refuses a macro at item position.
- The profile `static` exists in every build and only its `link_section` is wasm-only; otherwise the section functions are dead code on native targets.
- No `TokenFacts` struct and no separate pure rule: `entitled` short-circuits (not enforcing, no token, issuer, audience, claim), so an untrusted token's audience is never read (plan review).
- `build_profile` applies cargo's implications itself and takes `load_test_zones` too, so a feature handed to the compiler from outside cargo cannot produce an unlisted state (plan review).
- The recipe builds `--locked`, empties the rustflags (an empty `CARGO_ENCODED_RUSTFLAGS` also overrides config files) and unsets `RUSTC`, `RUSTC_WRAPPER`, `RUSTC_WORKSPACE_WRAPPER`; it also refuses an artefact that names a dev reducer anywhere in its bytes (code review, red-team).
- The eval proves the enforcing side on a live host twice (a dev-enforcing build and the recipe's `official` artefact) and reads the profile section of all three artefacts (plan red-team, verifier).
- Tester's questions, answered: the reader checks structure (strings, brackets, colons, commas) and reads numbers loosely, as its doc comment says; a nested `mr_ent` is not a duplicate; the recipe's last line carries the canonical path of the copy.

## touches-delta

- `justfile.test.mjs`: the declared `justfile`'s own test (35 new cases, floor moved from 3 to 38).
- `docs/DECISIONS.md`: the spec's contract orders the amendment of "Accounts, guest identity and the claim flow". Also amended in place, because this slice made them false: "Ownership is enforced unless a dev feature switches it off" (what is built, the interim default, where the check does not reach), "Dev-only reducers never ship" (`dev_reducers` implies `open_join`), and one sentence of the ranked-play entry.
- `ARCHITECTURE.md`: two sentences naming the issuer constants.
- Widened through `mr-touches` (reasons in Acceptance): `server-module/src/pvp.rs`, `server-module/src/pvp_tests.rs`, `docs/local-play.md`.
- `mr-touches scope` reports `justfile` and `justfile.test.mjs` as outside. That is the runner lock, not the diff: its `touches` list was split wrong at launch (the eighth entry is `justfile` joined to the next spec line, and the rest of the spec file follows as entries). The spec and the ledger header declare `justfile`. Filed as `R-acs-6-LOCKTOUCHESPARSE`, because the same list makes this slice look like a claimant of acs-7 to acs-12's files.

## boyscout-delta

- `server-module/Cargo.toml` `[features]`, the `dev_reducers` comment: says what the publish route is, where it narrated a past correction.

## comment-scan

CLEAN.

## Lenses

| Lens | Outcome |
|---|---|
| Plan: reviewer | 1 blocker (test gating by feature, not by "default build"), 5 should-fix; all taken except building `world` in a test |
| Plan: red-team | 7 attacks; taken: backslash in any top-level key is false, exact-line recipe parsing with an issuer count, a live admit of an entitled token; recorded: the interim default, token expiry |
| Code: reviewer | 1 blocker (DECISIONS false at merge) fixed; 4 should-fix fixed (design doc, a misplaced doc comment, `--locked`, the unset compiler variables); nits fixed except the load build's profile name (`test` with `dev_reducers=true`) |
| Code: red-team (wrote and ran its attacks in a scratch worktree) | nothing exploitable; 1 test gap closed (opening brace); the loose number grammar is documented, not pinned |
| reducer-security-auditor | PASS; 1 medium filed (item 3 above); refused joins are logged once each with no rate limit, like every other refusal |
| desync-guard | PASS: no game-core, wasm or bindings change |
| verifier | PASS; 2 mutants of its own survived: the section one is closed; the other (the eval's pure checkers have no test of their own) stands, since the doctrine forbids checks of checks and the Rust tests pin the error string |
| /simplify | no change |

## Residuals

- `R-acs-6-DEFAULTOPEN` [security-privacy/MED]: the default build is still the test build.
- `R-acs-6-NOPLAYERROWREDUCERS` [security-privacy/MED]: five reducers do not make the ownership check.
- `R-acs-6-TOKENEXPIRY` [security-privacy/LOW]: an open connection outlives its token; a refund reaches it at the next connect.
- `R-acs-6-EVALKILLSSIBLING` [loop-ops/LOW]: concurrent `just ci` runs kill each other in the account eval.
- `R-acs-6-LOCKTOUCHESPARSE` [loop-ops/MED]: the runner lock's touches list.
- `R-lpw-8-LIVEADMISSION` is **not** closed here although it targets this slice: it is about the access rule, not ownership. Note n5 says what the rig now has that makes it cheap.

## Notes and follow-ups (`mr-gates notes list --slice acs-6`)

n1 to n4 and n7 are the residuals above; n5 is the open `R-lpw-8-LIVEADMISSION`; n6 is the contract as built, with the inputs for acs-7 (the error string; nothing tells a client that a build enforces before it calls `join_game`), acs-11 (change `PRODUCTION_LOGIN_ISSUERS` only; the recipe requires an `https:` issuer; the ranked canary fires then) and lpw-15 (the binding is a further input to `entitled`; its run under `official` is one more nextest line).

Items: none

## not-verified

- Remote CI (gitleaks, cargo-audit, semgrep, the e2e job) has not run on this branch. New test fixtures and docs contain the two dev issuer URLs in plain text.
- `just release-module world` is not built by any test. I ran it by hand at this head: it prints `profile=world`, `enforces_ownership=true`, `dev_reducers=false` and no issuer. Its row is pinned by the table test over all 64 feature sets.
- The nightly mutation gate (`just mutate-server`) was not run whole, only over the functions this slice adds.
- No token from the real account service has met the module: the eval uses its stub issuer, patched in as the local dev issuer. acs-5.2 is where a real dev account joins.
- Cold-cache cost of the eval's extra builds in CI (the recipe's own target directory compiles the dependency tree once per cache).
- Not built on macOS, where the `link_section` attribute is skipped by `cfg_attr`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
