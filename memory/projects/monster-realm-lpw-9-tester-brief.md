# lpw-9 — tester brief (server module)

You write the gating Rust tests for slice `lpw-9` of Monster Realm. You do not implement the
feature and you do not edit production code. Everything you write goes under the slice worktree:

`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-9`

(`WT` below; every path is relative to it). Read with Read/Grep on `WT` only (the code-graph tools
index another checkout). You have no shell; I run everything and report failures back to you.

A **compile-only skeleton** is already committed: the three tables and their lifecycle entries
(`server-module/src/schema.rs`, search `WorldAccessRule`), and `server-module/src/access.rs` with
every signature below and inert bodies. Your tests compile against it and must FAIL on behaviour
until the implementer fills it in. `server-module/src/access_tests.rs` exists and is empty.

Doctrine: `/home/mdrewt/.claude/harness/standards/testing-tdd.md`. What binds here: a test executes
shipped code or reads a generated artifact; it never reads hand-written source as text, never pins
prose, never checks another check. Expected values come from their owner (the `access` constants),
never a pasted literal. Test names lead with the behaviour; no slice or criterion id in a test name.
Do not add a new source-parsing census; do not grow the existing `census` engine in
`privacy_enforcement_tests.rs` (grandfathered: you may only update its pinned rosters).

## The criteria (verbatim)

- **lpw-9.1:** WHEN a world has no `world_access` row, THE SYSTEM SHALL treat its rule as `Open`.
- **lpw-9.2:** WHEN a connection not yet admitted joins a world whose rule is `Password`, THE SYSTEM SHALL deliver it no row of any table the module declares (the test lists the tables from the schema, not by hand) and refuse every reducer but the admission call.
- **lpw-9.3:** WHEN the admission call presents a wrong password, THE SYSTEM SHALL refuse it with no write to world state, and after five wrong attempts from one identity within ten minutes SHALL refuse that identity's attempts until the ten minutes pass.
- **lpw-9.4:** WHEN anyone but `config.owner_identity` calls `set_world_access`, THE SYSTEM SHALL refuse it.
- **lpw-9.5:** WHEN the owner admits an identity through `set_world_access`, THE SYSTEM SHALL admit that identity without a password (the shell admits its own player this way).

The mechanism is fixed by the game's `docs/local-play.md` §3 fork (a), design A1 (read
"The design (A1)" and "Proved by", lines ~513-593): the connect reducer refuses an identity the
rule has not admitted; every client-callable reducer makes the same check first; the door is
owner-only, `admit(who, password)`, and counts wrong attempts against `who`. Under A1 an unadmitted
identity is refused the door too, and lpw-9.2's "no row" half rests on the host running the connect
reducer before every route: the in-repo proof is that `on_connect` refuses.

## Contracts (fixed; call exactly these)

```rust
// server-module/src/schema.rs
pub enum WorldAccessRule { Open, Password }                  // Clone, Copy, PartialEq, Eq, Debug
pub struct WorldAccess { pub id: u32 /* always 0 */, pub rule: WorldAccessRule,
                         pub password_salt: Vec<u8>, pub password_hash: Vec<u8> }   // accessor world_access, PRIVATE
pub struct WorldAdmission { pub identity: Identity /* pk */, pub admitted_at_ms: i64 } // accessor world_admission, PRIVATE
pub struct WorldAdmissionAttempt { pub identity: Identity /* pk */, pub wrong_at_ms: Vec<i64>,
                                   pub last_wrong_at_ms: i64 /* btree index */ }      // accessor world_admission_attempt, PRIVATE
// The row structs derive nothing beyond the table macro: compare fields.
// Manifest: world_access NotOwned; world_admission Erase; world_admission_attempt Erase; none exportable.

// server-module/src/access.rs
pub(crate) const REJECT_NOT_ADMITTED: &str;          // require_admitted, on_connect
pub(crate) const REJECT_NOT_WORLD_OWNER: &str;       // set_world_access, admit: caller != config.owner_identity
pub(crate) const REJECT_ADMIT_LOCKED: &str;          // admit: who is locked out
pub(crate) const REJECT_NO_PASSWORD_RULE: &str;      // admit: the rule is not Password
pub(crate) const REJECT_PASSWORD_LENGTH: &str;       // a password that is empty or over PASSWORD_MAX_BYTES
pub(crate) const REJECT_OPEN_TAKES_NO_PASSWORD: &str;// set_world_access(Open, Some(_), ..)
pub(crate) const REJECT_PASSWORD_REQUIRED: &str;     // set_world_access(Password, None, ..) with no stored hash
pub(crate) const ADMIT_MAX_WRONG_ATTEMPTS: usize;    // 5
pub(crate) const ADMIT_ATTEMPT_WINDOW_MS: i64;       // 600_000
pub(crate) const PASSWORD_MAX_BYTES: usize;          // 128
pub(crate) const PASSWORD_SALT_BYTES: usize;         // 16
pub(crate) const PASSWORD_HASH_BYTES: usize;         // 32

// Pure.
pub(crate) fn effective_rule(row: Option<&WorldAccess>) -> WorldAccessRule;   // None is Open; else row.rule
pub(crate) fn recent_wrong_attempts(wrong_at_ms: &[i64], now_ms: i64) -> Vec<i64>;
    // the stamps with now_ms.saturating_sub(t) < ADMIT_ATTEMPT_WINDOW_MS, order kept
    // (a stamp ahead of the clock is recent)
pub(crate) fn attempts_locked(wrong_at_ms: &[i64], now_ms: i64) -> bool;
    // recent_wrong_attempts(..).len() >= ADMIT_MAX_WRONG_ATTEMPTS
pub(crate) fn hash_password(salt: &[u8], password: &str) -> Vec<u8>;
    // Argon2id v1.3, m = 19456 KiB, t = 2, p = 1, 32 bytes out
pub(crate) fn password_matches(row: &WorldAccess, password: &str) -> bool;
    // false unless row.password_salt.len() == 16 and row.password_hash.len() == 32

// Shell.
pub(crate) fn is_admitted(ctx: &ReducerContext, identity: Identity) -> bool;
    // rule Open (or no row)  ||  identity == config.owner_identity (config row 0)  ||  a world_admission row
pub(crate) fn require_admitted(ctx: &ReducerContext, reducer: &str) -> Result<(), String>;
    // Err(REJECT_NOT_ADMITTED) when !is_admitted(ctx, ctx.sender()); writes nothing
pub(crate) fn require_admitted_at_connect(ctx: &ReducerContext) -> Result<(), String>; // same refusal
pub(crate) fn erase_admission(ctx: &ReducerContext, identity: Identity);
    // deletes that identity's world_admission and world_admission_attempt rows

#[spacetimedb::reducer]
pub fn set_world_access(ctx: &ReducerContext, rule: WorldAccessRule, password: Option<String>,
                        admit: Vec<Identity>) -> Result<(), String>;
#[spacetimedb::reducer]
pub fn admit(ctx: &ReducerContext, who: Identity, password: String) -> Result<(), String>;

// server-module/src/lib.rs — on_connect's FIRST statement becomes
//     crate::access::require_admitted_at_connect(ctx)?;
// so a refused connection writes no player_session row and provisions no account.
// accounts::account_deletion_reaper calls crate::access::erase_admission(ctx, subject).
```

### `set_world_access` (owner-only)

1. Caller is not `config.owner_identity` (config row 0; a missing row has no owner):
   `Err(REJECT_NOT_WORLD_OWNER)`, no write. This is the first check, on every world, whatever the
   caller's admission.
2. Validation, before any write: `Open` with `Some(_)` -> `Err(REJECT_OPEN_TAKES_NO_PASSWORD)`;
   `Password` with `Some(p)` where `p` is empty or longer than 128 bytes ->
   `Err(REJECT_PASSWORD_LENGTH)`; `Password` with `None` while the stored row is not a `Password`
   row holding a hash -> `Err(REJECT_PASSWORD_REQUIRED)`.
3. Row 0 of `world_access` is written (insert, or update in place): `Open` leaves salt and hash
   empty; `Password` with `Some(p)` stores a fresh 16-byte salt and `hash_password(salt, p)`;
   `Password` with `None` keeps the stored salt and hash byte for byte.
4. When the rule was `Open` (or no row) before the call and is `Password` after it: every identity
   that has a `player_session` row, other than the owner, is admitted.
5. Every identity in `admit` is admitted, under either rule.
6. "Admitted" is insert-if-absent: one `world_admission` row per identity with
   `admitted_at_ms` = the call's time; an identity already admitted keeps its row unchanged. An
   admitted identity's `world_admission_attempt` row is deleted.
7. `Password` -> `Password` (a password change, or `None`) admits nobody but the `admit` list.
   Admission rows survive a return to `Open` and a password change.

### `admit(who, password)` (owner-only: the door; the owner relays a joiner's password)

In this order:
1. Caller is not `config.owner_identity`: `Err(REJECT_NOT_WORLD_OWNER)`, no write.
2. The rule is not `Password`: `Err(REJECT_NO_PASSWORD_RULE)`, no write.
3. `who` is already admitted: `Ok(())`, no write, whatever the password.
4. `attempts_locked(who's stamps, now)`: `Err(REJECT_ADMIT_LOCKED)`, no write (not even the right
   password gets through).
5. `password` empty or over 128 bytes: `Err(REJECT_PASSWORD_LENGTH)`, no write, not counted.
6. Right password: a `world_admission` row for `who` (`admitted_at_ms` = now), `who`'s attempt row
   deleted, `Ok(())`.
7. **Wrong password: `Ok(())`** — no admission row; `who`'s attempt row becomes its recent stamps
   plus `now` (`last_wrong_at_ms` = now). This is deliberate and you must assert the `Ok`: a
   reducer that returns `Err` is rolled back by the real host, so a refusal that has to be counted
   must commit. The native host models no rollback, so only the returned `Ok` tells a counted
   refusal from one the real host would forget. The refusal is: no `world_admission` row, and no
   write to any table but `world_admission_attempt`.
8. Paths 6 and 7 also delete every `world_admission_attempt` row whose `last_wrong_at_ms` is
   `ADMIT_ATTEMPT_WINDOW_MS` or more behind `now` (other identities' stale rows).

Time is `crate::marshal::now_ms(ctx)` (the context's timestamp in ms).

### What the implementation touches in the native host (register exactly what a test needs)

- `world_access`: point find on `id`; insert; update by `id`.
- `world_admission`: point find on `identity`; insert; point delete on `identity`.
- `world_admission_attempt`: point find on `identity`; insert; update by `identity`; point delete
  on `identity`; range scan on `last_wrong_at_ms`.
- `config`: point find on `id`. `player_session`: full scan (`iter()`), only at the
  `Open` -> `Password` step. `on_connect` also writes `player_session` as it does today.
- Nothing else. A table a test did not opt in as writable aborts on a write, which is how "no
  write to world state" shows: register `config`, `player_session`, `world_access`,
  `world_admission` and whatever else you want to prove untouched, and compare rows and
  `Fixture::writes_to(..)` before and after.

`server-module/src/native_host_tests.rs` is the in-memory host (`fixture()`, `Fixture::table`,
`table_keyed`, `run_as_at`, `run_as_conn_at`, `writes_to`, `set_database_identity`,
`DEFAULT_DATABASE_IDENTITY`). The three new tables need their describers there: add
`register_table_world_access`, `register_table_world_admission`,
`register_table_world_admission_attempt` (link names
`__preinit__20_register_describer_<accessor>`) to the extern block and to `TABLE_DESCRIBERS`
(65 -> 68). `accounts_tests.rs` `mod acct_nh` shows how a suite builds a world and calls
`crate::on_connect` over a client connection (`as_conn`).

## Files you write

### 1. `server-module/src/access_tests.rs` (new; ids are `access::access_tests::<mod>::<name>`)

Put the tests in these modules, so one criterion is one module:

- `mod open_by_default` (lpw-9.1) — with no `world_access` row: `effective_rule(None)` is `Open`;
  a stranger passes `require_admitted`; a stranger's `on_connect` is accepted and records its
  session. The same with a row whose rule is `Open`.
- `mod unadmitted` (lpw-9.2) — on a `Password` world: a stranger's `require_admitted` is
  `Err(REJECT_NOT_ADMITTED)` and writes nothing; the owner and an admitted identity pass.
  `on_connect`: a stranger is refused with `Err(REJECT_NOT_ADMITTED)`, and after the refusal
  there is no `player_session` row for it and no write to `player_session` or `account`
  (anonymous, and with a JWT from an allowed issuer: the refusal comes before provisioning); the
  owner and an admitted identity connect and get their session row. A `Password` world whose
  `config` row is missing admits only identities with an admission row (nobody is the owner,
  the all-zero identity included). The owner is `config.owner_identity`, not
  `ctx.database_identity()`: set the two apart and show the database identity is refused.
- `mod wrong_password` (lpw-9.3) — the door, called by the owner for `who`:
  one wrong password returns `Ok(())`, leaves no admission row, records one stamp, and writes no
  table but `world_admission_attempt` (`world_access`, `config`, `player_session`,
  `world_admission` rows and write counts unchanged); four wrong then the right one admits and
  clears the attempt row; five wrong then the right one inside ten minutes is
  `Err(REJECT_ADMIT_LOCKED)` with no write at all on that call; the lock is per identity (another
  identity is admitted meanwhile); the boundary (the right password is refused at oldest stamp +
  599_999 ms and admits at + 600_000 ms); the window slides (four wrong at t0, a fifth at
  t0 + 599_000: locked; at t0 + 600_000 the first four have aged out, so one more attempt is
  taken); a clock that runs backwards does not unlock; an already-admitted `who` with a wrong
  password is `Ok` with no attempt row; `admit` on an `Open` world is
  `Err(REJECT_NO_PASSWORD_RULE)` with no write; an empty and a 129-byte password are
  `Err(REJECT_PASSWORD_LENGTH)`, not counted; a writing call sweeps another identity's stale
  attempt row and keeps a fresh one; `admit` never writes a row for an identity other than the
  `who` it was given. Plus the pure table for `recent_wrong_attempts` / `attempts_locked`
  (a `proptest` property is welcome: never more than five recent stamps lock-free).
- `mod owner_only` (lpw-9.4) — `set_world_access` and `admit` called by a non-owner are
  `Err(REJECT_NOT_WORLD_OWNER)` with no write: a stranger on an `Open` world; an ADMITTED
  non-owner on a `Password` world (so the refusal is not the admission check's); a non-owner
  giving the right password to `admit`; the database identity when it is not the owner; any
  caller when `config` has no row.
- `mod owner_admits` (lpw-9.5) — the owner's `set_world_access(Password, Some(p), vec![x])`
  admits `x` (row with the call's time; `x` then passes `require_admitted` and `on_connect`)
  with no password given for `x`; an `admit` list under `Open` writes the row and it holds after
  the rule becomes `Password`; leaving `Open` admits every identity in `player_session` (an
  identity with two sockets is one row; give the owner a session row too and show the call
  succeeds); `Password` -> `Password` does not admit a connected, unadmitted identity;
  admitting twice keeps the first `admitted_at_ms`; admitting drops that identity's attempt row;
  the validations of step 2 above, each with no write; `Password` + `None` keeps salt and hash
  byte for byte; returning to `Open` empties salt and hash, and `Password` + `None` is then
  `Err(REJECT_PASSWORD_REQUIRED)`; after a password change the new password admits through
  `admit` and the old one is a wrong attempt.
- `mod password_hash` — known answer at the production parameters, from an independent
  implementation (OpenSSL through Node's `crypto.argon2Sync('argon2id', {memory: 19456,
  passes: 2, parallelism: 1, tagLength: 32})`):
  `hash_password(b"0123456789abcdef", "correct horse")` is hex
  `ae4d8c8b713876044c8347c76986a9b5655944aaacfffe9bea4dff9e7b6a1899`, and
  `hash_password(&[0,1,2,...,15], "p")` is hex
  `721231c82ccd80f45d6e9cacf6bedf24ac5fb55f2cbde872d43a2f36243b2bfa`. `password_matches` is
  false for every password against a row with an empty hash, an empty salt, or a 31-byte hash,
  and true only for the password the row was built from.

One Argon2id hash costs about 0.2 s in a debug build: keep the number of hashing calls per test
modest (a lockout test needs about six), and never loop a property test over `hash_password`.

### 2. `server-module/src/privacy_enforcement_tests.rs` — add `mod admission_roster`

The executing form of the design's reducer census. No source parsing.

- The roster is the generated bindings: the file names
  `client/src/module_bindings/*_reducer.ts` (list the directory through
  `env!("CARGO_MANIFEST_DIR")` + `/../client/src/module_bindings`; strip `_reducer.ts`; the stem
  is the reducer's snake_case name). Reading a generated directory listing is the machine
  contract; do not open the files.
- A hand-written probe table: one row per reducer, `(name, kind, call)`, where `call` runs the
  SHIPPED reducer fn with any well-typed arguments (zeros, empty vectors, `Identity::ZERO`-style
  dummies, a default `MoveInput`; read each signature from its module) as a caller that is not
  the owner and has no admission row, over an open client connection
  (`Fixture::run_as_conn_at`), on a world whose rule is `Password`.
- The two name sets are equal in both directions: a generated reducer with no probe fails naming
  it, and so does a probe for a reducer the bindings do not have. After the implementer
  regenerates the bindings the roster holds 43 names (today's 41 plus `admit` and
  `set_world_access`); the bindings on disk today lack those two, so this half is red until
  then.
- Each `Player` probe answers exactly `Err(REJECT_NOT_ADMITTED)`. Each `OwnerOnly` probe
  (`sync_content`, `set_world_access`, `admit` and no other) answers an `Err` that is its own
  owner refusal (`REJECT_NOT_WORLD_OWNER` for the two access reducers; `sync_content`'s existing
  message for it). The owner-only set is pinned exactly.
- Register only `config`, `world_access` and `world_admission` (plus what `sync_content` needs to
  reach its owner refusal): a reducer that wrote or scanned before refusing aborts the test in
  the host, which is the "before anything else" proof.
- Dev-only reducers (`dev_reducers`, `load_test_zones` features) are not in the generated roster
  and get no probe.

Also update this file's pinned rosters for the new module and reducers (see "Pins" below).

### 3. `server-module/src/accounts_tests.rs` — the cascade and the pins

- The deletion cascade erases the subject's `world_admission` and `world_admission_attempt` rows
  and leaves a bystander's: extend the existing native-host cascade test
  (`acct_nh::acct_deletion_reaper_erases_every_owned_row_and_nothing_else`) or add one beside it.
- The pins below.

## Pins the skeleton already turned red (update the rosters and counts, never the rules)

I ran the module suite on the skeleton; exactly these eight fail, each because a roster or count
predates the three tables and two reducers:

1. `accounts::accounts_tests::acct_nh::acct_rekey_roster_is_total_and_game_data_sees_every_rekeyed_table`
   — `world_admission` and `world_admission_attempt` need a claim-flow classification. They are
   NOT re-keyed: a signed-in identity is a different identity and passes the door itself; a claim
   neither moves nor erases an admission. Add both to `NOT_REKEYED` with that reason.
2. `accounts::accounts_tests::acct_nh::generated_table_set_equals_the_lifecycle_manifest_bt7_1`
   — the native module def lacks the three tables (the describers above).
3. `accounts::accounts_tests::data_lifecycle_partition_matches_spec_section3` — the ERASE set
   gains `world_admission`, `world_admission_attempt`; the NotOwned set gains `world_access`.
4. `accounts::accounts_tests::m22s6_owner_keyed_tables_are_erase_or_anonymize`,
5. `accounts::accounts_tests::m22s6_not_owned_identity_exceptions_are_frozen`,
6. `accounts::accounts_tests::m22s6_table_row_registry_matches_manifest` — the S6 row-type
   registry (`m22s6_table_row_types`) needs the three row structs.
7. `accounts::accounts_tests::tactical_manifest_entries_are_classified_and_only_summary_and_formation_exported_bt7_4`
   — the manifest count is 68, was 65.
8. `privacy_enforcement_tests::real_crate_matches_the_reducer_rosters_with_no_dev_tactical_start_bt16_1`
   — on the skeleton `admit` and `set_world_access` write nothing. Once implemented both write
   classified tables with no deletion gate: they belong in `DELIBERATE_EXEMPTIONS` class (iii)
   (operator-only behind the world-owner guard; no player caller exists), `access` joins
   `EXPECTED_MODULES` (lib.rs declares `mod access;` first among the domain modules), and
   `REDUCER_FLOOR` / `CLASSIFIED_TABLE_FLOOR` follow if they are exact. `on_connect` stays a
   lifecycle reducer. If the engine itself refuses a shape in `access.rs`, tell me: that is the
   implementer's code to reshape, not the engine's to grow.

Other pins may only show once the real bodies land (for example a per-reducer verdict that
changes when `require_admitted` becomes each reducer's first statement). I will send you each
failure verbatim.

## Kill list (each must fail at least one of your tests)

- The connect check runs after `open_player_session` (a refused connection leaves a session row).
- `require_admitted` is in a reducer but not first (a write or a scan precedes the refusal).
- The owner is `ctx.database_identity()`, or the first `player_session` identity, or anyone when
  `config` is missing.
- The lockout uses `> 5` (the sixth wrong attempt is taken), or never expires, or expires early,
  or resets when the clock runs backwards, or counts per world instead of per identity.
- `admit` returns `Err` on a wrong password (the real host would forget the count).
- `admit` hashes or writes before the owner check; admits on a locked identity's right password.
- `password_matches` accepts anything against an empty stored hash; `Password` + `None` on a
  world that never had a password succeeds.
- Returning to `Open` keeps the old salt or hash; a password change keeps accepting the old one.
- `Password` -> `Password` admits everyone connected; leaving `Open` admits nobody, or aborts on
  an identity with two sockets.
- `set_world_access` by an admitted non-owner succeeds.
- The cascade leaves the subject's admission or attempt row, or deletes a bystander's.
- A client-callable reducer with no admission check (the roster probe).

## What I need back

The files written, and separately: **defects** you found in the contract or the skeleton (I fix
them), and **questions** (I answer them in the plan). List every test id you added, grouped by
the module names above, with a count per module: the acceptance ledger selects on them.
