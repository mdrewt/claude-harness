# lpw-21 — tester brief

You write gating tests from acceptance criteria. You do not implement. You have no shell: the
orchestrator compiles and runs your tests and proves each fails before the implementation
exists. Report anything you find wrong in the contract as a **defect** or a **question**, apart
from the tests.

Repo (a git worktree, write here directly, absolute paths only):
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-21`

You edit exactly two files there, and no other:

- `server-module/src/access_tests.rs` (module `access::access_tests`)
- `server-module/src/world_binding_tests.rs` (module `world_binding::world_binding_tests`)

Read first, in this order:

1. `server-module/src/native_host_tests.rs` lines 1-33 (what the in-memory host models) and the
   `Fixture` / `Handle` methods (`table`, `table_keyed`, `seed`, `remove`, `rows`, `writable`,
   `scannable`, `unique`, `writes_to`, `reset_writes`, `rows_read`, `reset_reads`,
   `run_as_conn_at`).
2. `server-module/src/access.rs` (whole) and `server-module/src/world_binding.rs` lines 221-330
   and 390-560 (the code as it stands: lpw-15, merged).
3. `server-module/src/access_tests.rs` lines 1-360 (vocabulary) and `mod allowlist` (line 1934 to
   the end): the closest pattern for `set_world_access` under `Allowlist`.
4. `server-module/src/world_binding_tests.rs` lines 1-95 and 316-690 (the world `W`, seeding,
   footprint, the call helpers), `mod join_fixture` (line 694) with `mod open_join_unbound`
   (search it) for the real `join_game`, and `mod allowlist` (search `mod allowlist {`).

## The criteria (spec `M-local-play.spec.md` §lpw-21, operator decision monster-realm#846)

- **lpw-21.1:** WHEN the owner changes a world's rule to `Allowlist`, THE SYSTEM SHALL add to the
  list the account of every binding whose identity the rule in force before the call admitted
  (under `Open` every binding, under `Password` each identity holding an admission), and the
  owner's own bound account, keeping every account already listed.
- **lpw-21.2:** WHEN that seed would put more than `MAX_ALLOWLIST_ACCOUNTS` accounts on the list,
  THE SYSTEM SHALL refuse the rule change with lpw-15's too-many error and write nothing.
- **lpw-21.3:** WHEN a world's rule is `Allowlist` and the owner's identity is bound, THE SYSTEM
  SHALL keep the owner's account on the list: a `set_world_allowlist` call that omits it stores it
  anyway, and an owner who binds while the rule is `Allowlist` has their account added.
- **lpw-21.4:** WHEN the owner removes an account from the list, THE SYSTEM SHALL refuse every
  later reducer call (`join_game` included) from each bound identity whose account it was,
  connected or not, and WHEN the owner adds an account, THE SYSTEM SHALL admit an identity bound
  to it at its next call.
- **lpw-21.5:** WHEN the owner changes the rule from `Allowlist` to `Open` or `Password`, THE
  SYSTEM SHALL admit exactly as lpw-9 defines for that rule, the list unread until the rule is
  `Allowlist` again.

Spec context: the list is kept while the rule is off, and a later switch back adds the seed to it
rather than replacing it (`decision-defaulted:allowlist-reenable=union-with-kept-list`). No
schema change: the seed is read from the existing `world_binding` and `world_admission` rows.

## Contracts

Nothing below changes a signature that exists today. "The owner" is `config.owner_identity`.
"The rule in force" is the stored `world_access` row's rule, or `Open` when there is no row. A
**trusted binding** is a `world_binding` row whose `key_id` equals the `kid` of one of the build
profile's attestation keys (lpw-15's `world_binding::trusted_binding`); in the default test build
that is `crate::accounts::DEV_ATTESTATION_KEYS`. A row under any other `key_id` counts for
nothing everywhere below: it seeds nothing and keeps nothing.

### C1. `access::set_world_access(ctx, rule, password, admit)`

- Its refusals are unchanged and still come first, each with no write: a caller that is not the
  owner (`REJECT_NOT_WORLD_OWNER`), `Allowlist` with a password
  (`REJECT_ALLOWLIST_TAKES_NO_PASSWORD`), and the `Open` / `Password` ones.
- **The seed.** When `rule` is `Allowlist` and the rule in force before the call is `Open` or
  `Password`: let S be the `account_subject` of every trusted binding whose identity
  `access::is_admitted` admits under the rule in force before the call. That is: under `Open`
  (a stored `Open` row, or no row) every trusted binding; under `Password` the trusted bindings of
  the identities holding a `world_admission` row, and the owner's own trusted binding. After the
  call `world_allowlist` holds exactly (its rows before) ∪ S: nothing already listed is removed,
  and an account several identities are bound to is listed once.
- **The cap.** If (rows before) ∪ S numbers more than `MAX_ALLOWLIST_ACCOUNTS` (256, distinct
  accounts), the call answers `Err(REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS.to_string())`
  (`world_binding::REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS`) and makes no write call on any table: the
  rule row is as it was, no admission row is written (neither for a live session nor for the
  `admit` argument), no list row is written. Exactly 256 is accepted.
- `Allowlist` set while the rule in force is already `Allowlist` does not write `world_allowlist`.
- `rule` `Open` or `Password` neither reads nor writes `world_allowlist`; its rows stay.
- The `admit` argument plays no part in the seed: an identity named there that the rule in force
  did not admit gets its admission row, as today, and its account is not listed.
- Unchanged from lpw-15: whenever the rule changes to one that is not `Open`, each identity with a
  `player_session` row that the rule in force before the call admitted (the owner excepted) gets a
  `world_admission` row. `is_admitted` is unchanged: under `Allowlist` an identity with a trusted
  binding is governed by the list alone, and one with no trusted binding by its admission row.

### C2. `world_binding::set_world_allowlist(ctx, accounts)`

- Its refusals are unchanged, in the same order, each with no write: not the owner; more than
  256 named (`REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS`); a bad entry (`REJECT_ALLOWLIST_ACCOUNT`); a
  repeat (`REJECT_DUPLICATE_ENTRY`).
- **The owner's account is kept.** When the rule in force is `Allowlist` and the owner holds a
  trusted binding to account O, the stored set becomes `accounts` ∪ {O}. Naming O is fine and
  stores it once. If `accounts` names 256 others, the call answers
  `Err(REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS.to_string())` with no write and the stored set as it
  was (the cap is never exceeded, and nothing is trimmed).
- Under `Open`, `Password` or no rule row the set is stored exactly as named (an empty list
  clears it), bound owner or not. Under `Allowlist` an owner with no binding, or with a binding
  that is not trusted, keeps nothing: the set is stored as named.

### C3. The binds (`bind_world_account`, `bind_world_account_for`)

- When a bind passes every check it has today, the identity being bound (`who`: the sender of the
  self-serve form, the `who` argument of the relayed form) is the owner, and the rule in force is
  `Allowlist`: the attestation's `sub` is added to `world_allowlist` if it is not there. Rows
  already there stay. An owner bound to account A who binds again to account B leaves both listed.
- If the list already holds 256 accounts and not that one, the bind answers
  `Err(REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS.to_string())` with no write: no binding row written or
  replaced, the nonce row still there, the list as it was. This is the bind's last check: an
  attestation that fails an earlier check answers that check's error.
- A bind of any identity that is not the owner (self-serve or relayed by the owner), and any bind
  under `Open` or `Password`, makes no write to `world_allowlist`.

### C4. Two new functions a test may call directly (both `pub(crate)` in `world_binding.rs`, both
exist today as typed stubs that answer empty)

```rust
/// The account of every binding the build counts whose identity `of` accepts, each once, in
/// ascending byte order. A build with no key answers none without reading.
pub(crate) fn bound_accounts(
    ctx: &ReducerContext,
    profile: &BuildProfile,
    of: impl Fn(Identity) -> bool,
) -> Vec<String>

/// The accounts of `wanted` that `listed` lacks, each once, in ascending byte order. Refused
/// with `REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS` when `listed` and those additions together number
/// more than `MAX_ALLOWLIST_ACCOUNTS`.
pub(crate) fn allowlist_additions(listed: &[String], wanted: &[String])
    -> Result<Vec<String>, &'static str>
```

- `bound_accounts`: "counts" is the trusted-binding rule under `profile` (a `BuildProfile`
  literal with other keys, or none, is how `mod binding_build` already tests `trusted_binding`).
  With a profile that holds no attestation key it answers empty and hands out no `world_binding`
  row (`fx.rows_read("world_binding") == 0`). It scans the table: register `world_binding`
  `.scannable()`.
- `allowlist_additions` is pure (no context). `listed` is the table's key column: no repeats, at
  most 256 entries. `wanted` may repeat and may overlap `listed`. `Ok(v)`: `v` is the distinct
  elements of `wanted` absent from `listed`, ascending by `String`'s `Ord`. `Err` exactly when
  `listed.len() + v.len() > MAX_ALLOWLIST_ACCOUNTS`. It suits a `proptest` (the crate is a
  dev-dependency; `access_tests.rs` `mod wrong_password` shows the style).

Every other helper the implementation adds is internal: reach it through the reducers.

### C5. What each path reads and writes (decides what a fixture must register)

- `set_world_access` to `Allowlist` from `Open` or `Password`: a full scan of `world_binding`
  (`.scannable()`), a full scan of `world_allowlist` (`.scannable()`) and inserts into it
  (`.writable()`); index reads of `world_access.id`, `config.id`, `world_admission.identity`; the
  scan of `player_session` and the writes to `world_access`, `world_admission`,
  `world_admission_attempt` it makes today.
- `set_world_allowlist`: reads `config.id`, `world_access.id`, the caller's `world_binding` row by
  `identity`; scans, deletes from and inserts into `world_allowlist`.
- A bind: what it reads today, plus `config.id` and `world_access.id`; for the owner under
  `Allowlist` a scan of `world_allowlist` and an insert.

## What is already true on `master`, and the existing tests

- lpw-15 built the list, `is_admitted`'s `Allowlist` arm and the carry-over. So lpw-21.4's
  "refused after the owner removes the account, admitted after the owner adds it" and lpw-21.5's
  "admits as lpw-9 defines, the list unread" hold today when the list is written by hand. What is
  missing today is the seed (C1), the kept owner account (C2) and the owner's bind (C3).
- Every test must be watched failing before the implementation. Build each lpw-21.4 and lpw-21.5
  test so that it reaches its criterion **through the seeded switch or the kept owner account**
  (the list a player is removed from is the list the switch made, not one seeded by hand): then
  it fails today at the first step that needs the seed. Where a clause cannot fail today whatever
  you do (the "unread" count, a refusal after delisting), keep it as a later assertion of such a
  test and list it in your report under "already true today": the orchestrator proves those
  against a deliberate local break.
- `access_tests.rs` `mod allowlist` registers `world_binding` and `world_allowlist` read-only
  (`fn tables`, and the comment above the struct `A` says so). Four of its tests switch a world to
  `Allowlist` and will abort in the host once the seed scans and writes those tables. Make that
  fixture's `world_binding` `.scannable()` and its `world_allowlist` `.writable().scannable()`,
  and bring the comment in line. Change no assertion and no test body in the existing modules of
  either file. If you believe an existing lpw-15 assertion contradicts the contract above, do not
  edit it: report it as a defect.

## Scenarios the suite must cover (add what the criteria need beyond these)

lpw-21.1
- From no rule row and from a stored `Open` row: every trusted binding's account is listed,
  whether or not its identity has a live session or an admission row; an account two identities
  are bound to appears once; accounts listed before the call stay; the rule row is `Allowlist`.
- From `Password`: listed are the accounts of trusted bindings whose identity holds an admission
  row, and the owner's; not the account of a bound identity with no admission row.
- The owner's own trusted binding is seeded from both rules, with no admission row and no session.
- A binding under a key the build does not hold (see `RETIRED_KID`) seeds nothing, the owner's
  included.
- After the seeded switch each seeded identity passes the admission check with no admission row
  of its own (not live at the switch), and an identity bound to an account that is not listed is
  refused.
- `Allowlist` over `Allowlist` adds nothing, even with a bound owner whose account is not listed
  and a trusted binding to an unlisted account present.
- The `admit` argument does not seed: `Password` to `Allowlist` naming a bound identity that
  holds no admission row leaves its account off the list.
- `bound_accounts`: distinct and ascending; the `of` predicate filters by identity; the key
  filter; the keyless profile reads nothing.

lpw-21.2
- 257 distinct accounts bound under `Open`: refused with the too-many constant, and every
  registered table holds exactly what it held, with no write call (live sessions and a non-empty
  `admit` argument present, so an admission written before the refusal is caught). 256: accepted,
  all listed.
- The count is of the union: a kept list of n accounts and a seed of m new ones is refused
  exactly when n + m > 256; seed accounts already on the list, and identities sharing an account,
  do not count twice.
- From `Password` the count is of the admitted identities' accounts only: more than 256 bindings
  of which the rule admitted few is accepted.
- `allowlist_additions` directly, by example at the boundary and by property.

lpw-21.3
- `set_world_allowlist` under `Allowlist` with a trusted owner binding: a list that omits the
  owner's account stores it anyway; an empty list stores exactly the owner's account; a list
  that names it stores it once; 256 others is refused with no write and the stored set intact;
  255 others is stored with the owner's as the 256th.
- The same calls under `Open`, under `Password`, with no rule row, with an unbound owner and with
  an owner binding under a key the build does not hold: stored exactly as named.
- A bound identity that is not the owner is not kept: under `Allowlist` the owner's call that
  omits another bound identity's account removes it.
- The owner binds under `Allowlist`, self-serve (`bind_world_account` as the owner, after
  `request_bind_nonce`) and relayed (`bind_world_account_for(owner(), ..)`): the account is
  listed and the rows already listed stay. An account already listed: no list write.
- The owner binds under `Open` and under `Password`: the list is untouched. A joiner's bind under
  `Allowlist`, self-serve and relayed: the list is untouched.
- The owner binds onto a list of 256 others: refused with the too-many constant, no binding row,
  the nonce row still there, and the same attestation binds once a row is taken off the list.
- The owner re-binds to a second account under `Allowlist`: both listed.

lpw-21.4
- Start `Open` with bindings, switch to `Allowlist` (the seed), then the owner's
  `set_world_allowlist` without account X: each identity bound to X (two of them: one with a
  `player_session` row, one with none; give the connected one a `world_admission` row from the
  carry-over, which must not save it) is refused with `access::REJECT_NOT_ADMITTED` by
  `access::require_admitted`, by `crate::on_connect`, by the real `join_game` (through
  `join_fixture`, with every join table as seeded and no write call), and by a second real
  player reducer of your choice. An identity bound to an account still listed keeps passing.
- The owner adds X back: each of those identities passes at its next call and the real
  `join_game` succeeds, with nothing else written for it by the owner's call.
- The owner cannot remove the owner's own account this way (the kept account), while a second
  identity bound to that account stays admitted.

lpw-21.5
- A seeded `Allowlist` world switched to `Open`: a stranger with no binding and an identity bound
  to an unlisted account are both admitted; the list rows are exactly as before the switch; the
  admission checks hand out no `world_allowlist` row (`rows_read` counts rows handed out when a
  read opens, so probe with an identity whose bound account IS a stored list row: a rule that
  consulted the list would hand that row out).
- Switched to `Password` (it needs a password): the owner and identities holding an admission
  row are admitted, a bound identity on the list with no admission row is refused, and again no
  `world_allowlist` row is handed out by a check.
- Back to `Allowlist` from each: the list is the kept list plus the new seed (an account removed
  by the owner while the rule was off and whose identity the rule in force admits is listed
  again; an account bound while the rule was `Open` is listed).

## The test host

- A read through an index no test registered yields no row; a write to a table that is not
  `.writable()`, or a full scan of one that is not `.scannable()`, aborts the whole test process.
  Register every table a path under test touches (C5), and register an index whenever a refusal
  depends on what a read finds (otherwise the test passes for the wrong reason).
- The host models no rollback: "writes nothing" is asserted as every registered table holding
  what it held **and** no write call (`fx.reset_writes()` then the footprint helpers, which
  include `fx.writes_to`).
- Seed rows through the fixture handles, never with `ctx.db.<table>().insert(` in a test.
- Identities are `[n; 32]` with n >= 1, never `[0xDB; 32]`; both files have `id(b)`, `owner()`.
  The existing tests of a file use fixed bytes: pick bytes no helper of that file reserves.
- `ctx.random()` works in the host. Attestations: `world_binding_tests.rs` has `Claims`,
  `dev_attestation`, `ask`, `ask_for`, `bind`, `bind_for`, `nonce_of`; a bind needs the world
  named (`seed_names(&w, &[WORLD])`).
- The suite runs on the default build (profile `test`: it holds the dev attestation keys and
  does not enforce ownership, so `join_game` succeeds once the admission check passes). Your
  modules carry no `#[cfg]`, and must compile with every feature on at once.
- For 257 bindings generate identities and accounts in a loop (an identity may be built from a
  counter spread over the 32 bytes; keep it off `[0; 32]`, the owner and `[0xDB; 32]`).

## Doctrine (binding)

- `~/.claude/harness/standards/testing-tdd.md`: tests execute code. No test reads hand-written
  source text. No test of a test.
- Each refusal test starts from a fixture that is valid in every other way, asserts the exact
  constant, and asserts that no table changed and no write call was made.
- Each acceptance test asserts rows by value (the sorted list of accounts, the binding rows),
  never by count alone.
- Test names lead with the behaviour and end with the criterion token: `..._lpw21_1` to
  `..._lpw21_5`, exactly that spelling, on every test you add (the acceptance ledger selects
  `test(/_lpw21_<n>$/)` across both files). A test serves one criterion.
- Above each test, a doc comment says what it proves and a `kills:` line names the wrong
  implementations it catches, as the existing tests do.
- Comments state what the code does. No criterion ids, slice ids, milestone ids or decision
  numbers in comments (`lpw-21`, `lpw-15`, `#846`), and no history wording (`no longer`,
  `used to`, `the old`, `before this`, `now`, `previously`).
- `scripts/check-secrets.mjs` fails on `(password|secret|api_?key)\s*[:=]\s*["'][^"']{8,}["']` on
  any line, tests included: never assign a string literal of 8 or more characters to a binding
  or field whose name contains one of those words (`let typed = "pw seven";` is the existing
  style).
- `just lint` is clippy with `--all-targets --all-features -D warnings`: no `assert!` on a bare
  constant (bind through `std::hint::black_box`), no unused imports or helpers, doc lists
  indented correctly. `cargo fmt` reformats your files afterwards; do not fight it.
- Deterministic: no wall clock, no unseeded randomness. No `#[ignore]`.
- Put new tests in new modules (suggested: `access_tests.rs` `mod allowlist_seed`;
  `world_binding_tests.rs` `mod owner_account` and `mod list_edits`), each with its own fixture
  helper where the file's shared one lacks a `.scannable()` or `.writable()` it needs; do not
  change what `world_binding_tests.rs`'s shared `world()` registers unless a new test needs it
  and no existing test's meaning changes (adding `.scannable()` to `world_binding` there is
  fine).

## Report

1. Each test's full name, the criterion it serves, and one line on why it fails today.
2. "Already true today": the assertions that cannot fail before the implementation, by test.
3. Defects and questions about the contract, separately.
4. What you could not check without a shell ("not compiled").
