# lpw-20 tester brief — the module never receives a world password

You are the `tester` for Monster Realm slice lpw-20. Write the gating tests from the EARS criteria
below; do NOT implement the feature (you edit only test files). You have no shell: the orchestrator
compiles, runs and proves each new test red against the current skeleton, then hands results back.

Worktree (write here only): `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-20`
Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-local-play.spec.md`
§lpw-20 (~line 643), the ruling block "Where the world password is checked" (~line 164), lpw-9
(~458; lpw-9.2 and lpw-9.5 are referenced by lpw-20.3) and lpw-14.6 (~610).
Plan: `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-lpw-20-plan.md`.
Verification SSOT: `~/.claude/harness/standards/testing-tdd.md` (read "What counts as a check",
"Test ownership", "Deleting a check is legitimate").

## The criteria

- **lpw-20.1:** WHEN the owner sets the rule to `Password`, THE SYSTEM SHALL store the rule with no
  salt and no hash and admit only the owner and admitted identities, and no reducer the module
  declares SHALL take a password, a hash of one or a value derived from one as an argument.
- **lpw-20.2:** WHEN a world holds a salt and hash stored by an earlier module, THE SYSTEM SHALL
  clear them at the owner's next `set_world_access` and admit nobody by them meanwhile.
- **lpw-20.3:** WHEN an identity the owner admitted outright joins a `Password` world, THE SYSTEM
  SHALL admit it as lpw-9.5 does, and an identity never admitted SHALL be refused at connect and in
  every reducer as lpw-9.2 does.

## Contracts (the code under test, after the implementation)

- `server-module/src/access.rs` (the skeleton already has the new signature; read it):
  - `pub fn set_world_access(ctx: &ReducerContext, rule: WorldAccessRule, admit: Vec<Identity>) -> Result<(), String>`
    — owner-only (first check, `REJECT_NOT_WORLD_OWNER`). Writes row 0 of `world_access` as
    `WorldAccess { id: 0, rule, password_salt: Vec::new(), password_hash: Vec::new() }` under EVERY
    rule, whatever the stored row held (so a salt/hash an earlier module stored is cleared at the
    owner's next call). `Password` needs nothing else (no stored or new password). Unchanged
    otherwise: when the rule changes to one that is not `Open`, every live-session identity the rule
    in force before the call admitted (owner excluded) gets a `world_admission` row; the lpw-21
    seed on a change to `Allowlist`; each identity in `admit` gets a `world_admission` row (stamped
    with the call's time; an existing row keeps its time) under every rule.
  - The reducer `admit(who, password)` is REMOVED, with `hash_password`, `password_matches`,
    `recent_wrong_attempts`, `attempts_locked`, and the constants `ADMIT_ATTEMPT_WINDOW_MS`,
    `ADMIT_MAX_WRONG_ATTEMPTS`, `PASSWORD_HASH_BYTES`, `PASSWORD_MAX_BYTES`, `PASSWORD_SALT_BYTES`,
    `REJECT_ADMIT_LOCKED`, `REJECT_NO_PASSWORD_RULE`, `REJECT_OPEN_TAKES_NO_PASSWORD`,
    `REJECT_PASSWORD_LENGTH`, `REJECT_PASSWORD_REQUIRED`, `REJECT_ALLOWLIST_TAKES_NO_PASSWORD`.
    Your tests must not reference any of these (they will not compile after the implementation).
    The skeleton still has them, so your red run compiles: tests that need a removed item must not
    exist.
  - Kept and unchanged: `effective_rule`, `is_admitted`, `require_admitted(ctx, reducer)`,
    `require_admitted_at_connect(ctx)`, `REJECT_NOT_ADMITTED`, `REJECT_NOT_WORLD_OWNER`,
    `withdraw_admission`, `erase_admission` (the cascade still deletes an identity's
    `world_admission_attempt` row), and `admit_identity`, which still deletes the admitted
    identity's `world_admission_attempt` row (an earlier module may have written one), so
    `admitting_drops_that_identitys_attempt_row` stays (migrate its call). Nothing writes or sweeps
    that table any more otherwise (`sweep_stale_attempts` goes with the door).
  - `crate::on_connect(ctx)` (server-module/src/lib.rs) refuses with `Err(REJECT_NOT_ADMITTED)` as
    its first statement an identity the rule does not admit.
- Schema (`server-module/src/schema.rs`, unchanged): `WorldAccess { id: u32, rule, password_salt:
  Vec<u8>, password_hash: Vec<u8> }`; `WorldAdmission { identity, admitted_at_ms }`;
  `WorldAdmissionAttempt { identity, wrong_at_ms: Vec<i64>, last_wrong_at_ms }`.
- Native test host: `crate::native_host_tests::{fixture, Fixture}`; read how `access_tests.rs`
  builds worlds (`world`, `password_world`, `call`, `call_signed_in`, `footprint`, `passes`,
  `set_access`), and `fx.module_def()` -> `RawModuleDefV10` (`def.reducers()`: each
  `RawReducerDefV10 { source_name, params: ProductType, visibility, .. }`, both client-callable and
  private/lifecycle/scheduled reducers; `def.typespace()` resolves `AlgebraicType::Ref`). See the
  existing use in `privacy_enforcement_tests.rs` `ts2_privacy_session_tables_are_private` (~line
  2120). Vendored crate source for these types:
  `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/spacetimedb-lib-2.12.0/src/db/raw_def/v10.rs`
  and `spacetimedb-sats-2.12.0` for `AlgebraicType` / `ProductType`.
- `just test` runs the module tests under three builds: default, `--features
  monster-realm-module/dev_reducers`, and `--features monster-realm-module/load_test_zones` (adds
  the dev reducers `grant_bait(item_id: u32, qty: u32)`, `dev_expire_tactical_window(battle_id:
  u64, side: u8)`, `dev_place_in_load_zone(zone_id: u32)`). A module_def census therefore runs on
  every build; it must hold on each (none of the dev reducers carries text).
- Generated bindings after `just gen`: `client/src/module_bindings/admit_reducer.ts` is deleted;
  `set_world_access_reducer.ts` holds `rule` and `admit` only. The generated roster becomes 49
  reducers.

## What to write (test names end `_lpw20_1`, `_lpw20_2` or `_lpw20_3`; the ledger CHECK selects
them by that suffix, so every test that gates a criterion carries exactly one)

Files: `server-module/src/access_tests.rs`, `server-module/src/privacy_enforcement_tests.rs`,
`server-module/src/world_binding_tests.rs` (call-site migration only).

1. **lpw-20.1** — `access_tests.rs`, a new `mod` (your name):
   - From no `world_access` row, from a stored `Open` row and from a stored `Allowlist` row: the
     owner's `set_world_access(Password, vec![])` is `Ok` and leaves exactly one row equal to
     `WorldAccess { id: 0, rule: Password, password_salt: vec![], password_hash: vec![] }` (compare
     the whole row, encoded, not fields one by one). Then the owner and an identity holding a
     `world_admission` row pass `require_admitted` and `on_connect`; a stranger is refused by both
     with `REJECT_NOT_ADMITTED` and no write to any registered table.
   - `privacy_enforcement_tests.rs`, a new `mod` (your name): a census over `fx.module_def()` of
     every reducer the build declares (client-callable AND private). It asserts: no reducer named
     `admit`; `set_world_access`'s params are exactly `rule` (a Ref resolving to the
     `WorldAccessRule` sum) then `admit` (an array of `Identity`); no param name has a
     `_`-separated segment (case-insensitive) in {password, passwd, passphrase, pass, pwd, pw,
     salt, hash, digest, secret, phrase, pin, credential, kdf}; and the set of `reducer.param`
     whose type, resolved through the typespace at any depth (products, sums, arrays, options),
     holds a `String` or an array of `U8` equals an exact literal roster in the test, each row with
     a one-line basis saying what the argument carries and why it is not a password or derived from
     one (e.g. `bind_world_account.attestation`: a token the account service signed). Derive the
     roster from `evals/baselines/client-callable-reducers.json` and the reducer sources (scheduled
     reducers take their schedule row: read each schedule table's struct in `schema.rs` and the
     modules). Today's client-callable text args: bind_world_account.attestation,
     bind_world_account_for.attestation, complete_guest_claim.code, join_game.name,
     set_nickname.nickname, set_profile_name.name, set_world_allowlist.accounts,
     set_world_names.names, start_guest_claim.code (and `admit.password`,
     `set_world_access.password`, which must NOT be in your roster). If a private reducer's row
     holds a String, it goes in the roster with its basis; if you cannot tell, say so in your
     report and the red run will show the real set.
2. **lpw-20.2** — `access_tests.rs`, a new `mod`: a legacy row = `Password` with the real Argon2id
   KAT salt and hash already in the file (`KAT_SALT`, `KAT_HASH_HEX`; keep those constants and
   `unhex`, delete only what dies). Plus one admitted identity A (holds a `world_admission` row) and
   a stranger S with a live `player_session` (S is connected).
   - Meanwhile: S is refused by `require_admitted` and `on_connect` with no write; A passes; the
     owner passes.
   - The owner's next call, once for each rule (`Password` with the rule unchanged, `Open`,
     `Allowlist`), each from a fresh legacy world: `Ok`, and the stored row equals
     `{0, <rule>, [], []}` exactly. After `Password`->`Password`: S still refused and holds no
     admission row (the unchanged rule carries nobody over); A's admission row is unchanged
     (same time). Also a forged legacy `Open` row and a forged `Allowlist` row holding a non-empty
     salt/hash: the owner's next call with the same rule stores both empty.
   - `privacy_enforcement_tests.rs` `mod admission_roster`: every player reducer, called by an
     unadmitted non-owner on the LEGACY world (KAT salt/hash), answers the admission refusal before
     anything else (re-use `every_player_reducer_refuses_an_unadmitted_caller_before_anything_else`'s
     machinery; the world builder may take the row as a parameter).
3. **lpw-20.3** — `access_tests.rs`, a new `mod`, on a world the OWNER set to `Password` through
   `set_world_access` (not seeded):
   - an identity named in the `admit` list of the call that set `Password` connects (`on_connect`
     `Ok`, its `player_session` row recorded) and passes `require_admitted`; its admission time is
     that call's. A second identity admitted by a later call with the rule unchanged
     (`set_world_access(Password, vec![b])`) does the same, and the stored row stays `{0, Password,
     [], []}`.
   - an identity never admitted is refused at `on_connect` (no session, no write) and by
     `require_admitted`.
   - `privacy_enforcement_tests.rs` `mod admission_roster`: the sweep of every player reducer runs
     on a world whose `Password` row was written by the owner's `set_world_access` (empty
     salt/hash), named `_lpw20_3`.

## Migration of existing tests (not gating lpw-20; keep their assertions)

- Every call of `set_world_access(ctx, rule, password, admit)` becomes `set_world_access(ctx, rule,
  admit)` — `access_tests.rs` `set_access` helper, `privacy_enforcement_tests.rs:2516`,
  `world_binding_tests.rs:4434` and its helper at ~4708-4717 (drop its `password` parameter and the
  `Some("...")` arguments at its call sites, e.g. ~5477). Assertions stay as they are unless they
  assert something the ruling removes.
- `privacy_enforcement_tests.rs`: `mod admission_roster` loses the `admit` probe; the generated
  roster count becomes 49 (fix the count message too); the owner-only set loses `admit`; the
  `DELIBERATE_EXEMPTIONS` row for `admit` (~line 1333) goes; the seeded `password_world` there
  stores an empty salt/hash (it uses `crate::access::PASSWORD_SALT_BYTES`, which is removed).

## Deletions (superseded by operator ruling monster-realm#840: the door moves to the gate,
lpw-14.6)

A test that already passes against the skeleton (e.g. a stranger refused on a legacy row) is
fine to write when it encodes a clause of the criterion; the orchestrator proves its teeth with a
temporary mutant instead of the skeleton. Do not add `_lpw20_` copies of existing tests that
assert nothing new.

Delete the tests whose subject the ruling removes: `mod wrong_password` (whole), `mod
password_hash` (whole), the door (`admit`) halves of `mod owner_only`, the `owner_admits` tests
about salts, hashes, a password change or a required password, the `allowlist` tests about the
password argument and the door on an `Allowlist` world, and any `world_binding_tests.rs` assertion
that relies on the door or a password (rare). A test that mixes a surviving behaviour with a door
step: keep it, drop the door step. LIST every deleted test by name in your report with: the
reason (superseded by #840 / references a removed item) and the surviving test(s) that still
protect any behaviour it also covered (e.g. the owner guard on `set_world_access`).

## Doctrine (repo scanners and lint)

- `scripts/check-secrets.mjs` flags `(password|secret|api_?key)\s*[:=]\s*["'][^"']{8,}["']` on any
  line of any file, tests included: never write `password = "..."`/`secret: "..."` with a literal of
  8+ characters (a `const` name like `KAT_PASSWORD` is fine only if its value is under 8 chars or
  the line does not match; prefer deleting what dies).
- `mr-comment-scan` flags criterion ids in comments (allowed only as the trailing token of a test
  name) and history words in comments: "no longer", "the old", "used to", "was", "previously",
  "now". Comments state current behaviour.
- clippy runs `--all-targets --all-features -D warnings`: no `assert!` on a constant (bind through
  `std::hint::black_box`), no unused imports/helpers after the deletions (remove dead helpers such
  as `door`, `door_as`, `attempt_row`, `attempts`, `attempts_of` when nothing uses them), every
  `#[cfg(feature)]` test compiles with all features on.
- Each new test's doc comment names what it kills (`/// kills: …`), as the files already do.
- Tests execute the code (reducers through the native host); never read a hand-written source
  file's text.

## Report (reply to the orchestrator)

1. Each new test name, its criterion, and the defect it fails on against the skeleton (the skeleton
   keeps a stored full salt+hash on `Password`, refuses `Password` with nothing stored
   (`REJECT_PASSWORD_REQUIRED`), and still declares `admit(who, password: String)`).
2. Count of new tests per suffix (`_lpw20_1`, `_lpw20_2`, `_lpw20_3`).
3. Deleted tests: name, reason, survivor.
4. Defects (code bugs you saw) and questions, apart from the tests.
