# lpw-9 — plan: a private server applies the host's open or password rule

Spec: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-9 · mechanism: game `docs/local-play.md`
§3 fork (a), design A1 · base: `origin/master` 3099d01c · worktree `.claude/worktrees/lpw-9`.

## What is built

Server module (design A1): a private access rule, a private admission list, a refusal at connect and
in every client-callable reducer, an owner-only door. Client: a one-time host notice on a `private`
target.

### Schema (`server-module/src/schema.rs`), all additive

```rust
#[derive(SpacetimeType, Clone, Copy, Debug, PartialEq, Eq)]
pub enum WorldAccessRule { Open, Password }

#[spacetimedb::table(accessor = world_access)]            // PRIVATE singleton, id 0
pub struct WorldAccess {
    #[primary_key] pub id: u32,
    pub rule: WorldAccessRule,
    pub password_salt: Vec<u8>,   // empty unless rule == Password
    pub password_hash: Vec<u8>,   // empty unless rule == Password
}

#[spacetimedb::table(accessor = world_admission)]         // PRIVATE
pub struct WorldAdmission {
    #[primary_key] pub identity: Identity,
    pub admitted_at_ms: i64,
}

#[spacetimedb::table(accessor = world_admission_attempt)] // PRIVATE
pub struct WorldAdmissionAttempt {
    #[primary_key] pub identity: Identity,
    pub wrong_at_ms: Vec<i64>,                    // at most five, oldest first
    #[index(btree)] pub last_wrong_at_ms: i64,    // the sweep's range key
}
```

`DATA_LIFECYCLE_MANIFEST`: `world_access` NotOwned; `world_admission` Erase, not exported;
`world_admission_attempt` Erase, not exported. The cascade (`accounts::account_deletion_reaper`)
calls `access::erase_admission`.

### `server-module/src/access.rs` (new; owns the three tables)

Constants: `REJECT_NOT_ADMITTED = "not admitted"`, `REJECT_NOT_WORLD_OWNER`,
`REJECT_ADMIT_LOCKED`, `REJECT_NO_PASSWORD_RULE`, `REJECT_PASSWORD_LENGTH`,
`REJECT_OPEN_TAKES_NO_PASSWORD`, `REJECT_PASSWORD_REQUIRED`, `ADMIT_MAX_WRONG_ATTEMPTS = 5`,
`ADMIT_ATTEMPT_WINDOW_MS = 600_000`, `PASSWORD_MAX_BYTES = 128`.

Functional core (pure):
- `effective_rule(row: Option<&WorldAccess>) -> WorldAccessRule` — no row is `Open`.
- `recent_wrong_attempts(wrong_at_ms: &[i64], now_ms) -> Vec<i64>` — the attempts less than ten
  minutes old (`now.saturating_sub(t) < 600_000`; a stamp ahead of the clock counts as recent).
- `attempts_locked(wrong_at_ms, now_ms) -> bool` — five or more recent wrong attempts. A sliding
  window: at most five wrong attempts in any ten minutes, and the refusal lifts when the oldest
  of the five turns ten minutes old.
- `hash_password(salt, password) -> Vec<u8>` — Argon2id, m = 19 456 KiB, t = 2, p = 1, 32 bytes
  (the account service's parameters); `password_matches(row, password) -> bool` — false unless
  the row holds a 16-byte salt and a 32-byte hash; the compare folds over all 32 bytes.

Shell:
- `is_admitted(ctx, identity) -> bool` — rule `Open`, or `identity == config.owner_identity`, or a
  `world_admission` row.
- `require_admitted(ctx, reducer) -> Result<(), String>` — first statement of every
  client-callable reducer that is not owner-only; `Err(REJECT_NOT_ADMITTED)` + `log_reject`.
- `require_admitted_at_connect(ctx)` — first statement of `on_connect`; same refusal, log line
  limited to one a minute (`movement::RateLimiter`, as the unlisted-issuer line is).
- `erase_admission(ctx, identity)` — both identity-keyed tables, for the cascade.
- `set_world_access(ctx, rule, password: Option<String>, admit: Vec<Identity>)` — owner-only.
  Validates before any write: `Open` with a password is refused; `Password` with `Some(p)` needs
  1..=128 bytes; `Password` with `None` needs a stored hash. Then writes row 0 (`Open` clears salt
  and hash; a new password gets a fresh 16-byte salt from `ctx.random()`); when the rule leaves
  `Open` it admits every identity in `player_session` except the owner; then admits each identity
  in `admit`. Every admission is insert-if-absent (an identity with two sockets, or one named
  twice, is one row and keeps its first `admitted_at_ms`) and drops that identity's attempt row.
  `Password` -> `Password` admits nobody but the `admit` list.
- `admit(ctx, who, password)` — owner-only (the door). Refused with `Err` and no write: caller not
  the owner; rule not `Password`; `who` locked out; password empty or over 128 bytes. `who`
  already admitted: `Ok`, no write, no hash. Right password: admission row written, attempt row
  dropped. **Wrong password: the attempt is recorded and the reducer returns `Ok(())`** (see
  plan-delta 1). Both writing paths sweep attempt rows whose `last_wrong_at_ms` is ten minutes old (index range
  scan, then delete by key).

`lib.rs`: `mod access;`, `on_connect` opens with `access::require_admitted_at_connect(ctx)?`, and a
`pub(crate) fn live_session_identities(ctx) -> Vec<Identity>` beside `has_live_session`.

### Guard sites (widened at the red run)

`crate::access::require_admitted(ctx, "<name>")?;` as the first statement of the 40 client-callable
player reducers: `accounts.rs` (4, declared), and by `mr-touches widen`: `economy.rs` (2),
`evolution.rs` (2), `monster_mgmt.rs` (2), `movement.rs` (4), `npc.rs` (3), `privacy.rs` (1),
`pvp.rs` (4), `raising.rs` (5), `ranking.rs` (1), `tactics.rs` (4), `trading.rs` (4),
`trading_session.rs` (4). `sync_content`, `set_world_access` and `admit` are owner-only and carry no
check. Dev reducers (`dev_reducers`, `load_test_zones`) are outside the client-callable roster and
are not changed.

Also widened: `game-core/src/lib.rs` (`PROTOCOL_VERSION` 1 -> 2: DECISIONS "The module publishes its
protocol numbers" — it rises with every table or reducer change; `MIN_CLIENT_PROTOCOL` stays 1, no
older client reads the new tables or reducers), `client/src/ui/i18n/catalogParity.test.ts` (its
roster of catalog keys `main.ts` names), `docs/local-play.md` (§3 says none of the design is built).

### Client (lpw-9.6)

- `client/src/ui/hostNoticeModel.ts` — pure, storage injected:
  `hostNoticeStorageKey(uri, db)` = `mr.hostNotice.v1|<enc uri>|<enc db>`;
  `hostNoticeDue(kind, storage, uri, db)` — true only for `private` with no seen mark (unreadable
  storage counts as not seen); `markHostNoticeSeen(storage, uri, db) -> boolean`.
- Catalog key `chrome.status.privateHostNotice` (en, fr).
- `main.ts` `onReady` (the page's first join; not `onReconnect`): when due,
  `route('privacy-notice', text)` (the standing world hint, said once by the live region), then
  mark seen. The mark is device storage (`browserStorage()`), keyed on the raw `(uri, db)` pair
  as the reconnect token is: the server a player has an identity on is the server the notice was
  shown for. Unreadable storage shows the notice on every first join of a page.

## Functional core / imperative shell

Core: the rule default, the lockout arithmetic, the attempt step, the hash. Shell: table reads and
writes, the owner check, the log lines. Client core: `hostNoticeModel.ts`; shell: the `onReady`
branch in `main.ts`.

## Tests (tester-authored; orchestrator proves each red on the skeleton)

- `server-module/src/access_tests.rs` — by criterion, in modules `open_by_default` (9.1),
  `unadmitted` (9.2: `require_admitted`, `on_connect`), `wrong_password` (9.3), `owner_only` (9.4),
  `owner_admits` (9.5), plus `password_hash` (known answer at the production parameters).
- `server-module/src/privacy_enforcement_tests.rs` — `admission_roster`: the roster is the file
  names `client/src/module_bindings/*_reducer.ts` (generated bindings); a hand-written probe per
  reducer calls the shipped reducer as an unadmitted identity on a `Password` world over an open
  connection; the two name sets must be equal; each player reducer must answer
  `Err(REJECT_NOT_ADMITTED)`, each owner-only one its owner refusal.
- `accounts_tests.rs`, `native_host_tests.rs`, `privacy_enforcement_tests.rs` — pinned rosters and
  counts follow the three tables, the type, the module and the two reducers; the cascade test
  gains the admission rows.
- Client: `hostNoticeModel.test.ts`, `main.hostNotice.test.ts`, `catalog.test.ts`.

No new source-text scan: the reducer census of the design is the executing roster test above.
The design's "the census refuses a handler or a row filter" is held by the compiler: both sit
behind the `spacetimedb` crate's `unstable` feature, which the workspace does not enable.

## plan-delta

1. **A wrong password returns `Ok(())`.** A reducer that returns `Err` rolls its transaction back,
   so a counted refusal has to commit. `admit` therefore answers `Ok` with no admission row and one
   more wrong attempt recorded; the caller (the owner's CLI, later the gate) reads the admission
   row to learn the outcome. Every other refusal of `admit` writes nothing and returns `Err`.
2. **A third private table, `world_admission_attempt`.** The spec names two tables; the count of
   wrong attempts needs a row for an identity that is not admitted, and `world_admission` holds
   only admitted identities.
3. **No syn census.** `testing-tdd.md` forbids a new parse of hand-written source; the executing
   roster test replaces it, and the compiler holds the handler and filter refusal.
4. **Argon2id for the salted hash** (`argon2` 0.5, `alloc` only): a world save that is shared
   carries the row, so a fast hash of a short shared password would be recoverable offline.
   Measured natively: 18 ms release, 209 ms debug per hash; it builds for
   `wasm32-unknown-unknown`.
5. **Dev reducers carry no admission check.** They are not in the generated client roster and
   never ship.
6. **No removal reducer.** lpw-9 has no criterion for removing an admission; the owner can delete
   the row over SQL, and the per-reducer check then refuses that identity at once.

## Plan review (reviewer, red-team) — what changed and what stands

- Lockout is a sliding window, not a window anchored at the first wrong attempt (that let nine
  guesses through around the boundary).
- `password_matches` fails closed on an empty or short stored hash; `Password` with `None` is
  refused unless the row already holds a hash.
- The claim flow neither moves nor erases an admission: a signed-in identity is a different
  identity and passes the door itself; `rekey_all` is unchanged. A shipped `world` build lists no
  login issuer, so no account exists there.
- Every client-callable player reducer is gated alike, the deletion and export reducers included:
  an identity that is not admitted cannot connect, so an exemption would reach nobody.
- Not taken: a count across identities that caps hashing (the design rules it out: it would let
  anyone lock every new joiner out); a row cap on the attempt table (only the owner writes it, and
  the sweep bounds it to the identities refused in the last ten minutes); a sum-typed rule column
  (lpw-15 adds `Allowlist` beside these; one writer builds the row and the reader fails closed).
- A procedure was weighed for the door (it can commit the count in its own transaction and still
  answer a refusal): not taken. The design names a reducer, the deletion census refuses any
  procedure attribute, and procedures are client-callable without the connect reducer's contract
  being measured.
- Two `docs/DECISIONS.md` entries at close: the door's contract, and the admission check as the
  first statement of every client-callable reducer.

## Live-host probe (recorded, not a committed script)

On a 2.11.0 standalone host with the built module, from a scratch directory: with the rule
`Password`, an identity that was never admitted is refused a reducer call, a `sql` read of every
table the schema lists (`spacetime describe`), and a subscription; five wrong `admit` calls then a
right one leave no admission row (the count survives across transactions); the time of one
`admit`; and whether the commit log on disk holds a reducer's string argument in the clear. The log
goes to `$MEM/gates/lpw-9.live-probe.log` and the PR body.

## Risks

- A first statement added to 40 reducers may trip body-shape pins in other suites: measured at
  the green run; each is the tester's to adjudicate.
- The in-host cost of one Argon2id hash: measured by the live probe.
- No in-repo test shows an unadmitted connection receiving no row: that rests on the host running
  the connect reducer before every route (`docs/local-play.md` §3). The live probe repeats that
  measurement on this module.
- If the host's commit log keeps reducer arguments, the password is on the host's disk in the
  clear whatever the table holds, and a shared world directory carries it. The probe measures it;
  the finding goes to a follow-up and the operator, since the remedy (the caller stretches the
  password before the call) changes lpw-8's door contract.
- A hostile identity connected while the rule is `Open` is admitted when the rule leaves `Open`,
  and stays admitted across a password change (design A1; no module call closes a connection).
