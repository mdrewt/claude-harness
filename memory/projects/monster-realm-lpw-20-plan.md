# lpw-20 plan — the module never receives a world password

Slice: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-20 (feature, hard). Branch `slice/lpw-20`,
worktree `.claude/worktrees/lpw-20`, base origin/master 35c6814c (lpw-22 #862).
Operator ruling monster-realm#840: the gate (lpw-14) checks the password; the module never receives
one; a joiner is admitted through the owner's `set_world_access` admission (lpw-9.5).

## What changes (functional core / imperative shell)

`server-module/src/access.rs` is the only production code file that changes behaviour.

1. `set_world_access(ctx, rule: WorldAccessRule, admit: Vec<Identity>)` — the `password:
   Option<String>` argument goes. Every rule stores `password_salt = []` and `password_hash = []`
   (lpw-20.1), which also clears a salt and hash an earlier module stored, at the owner's next call
   whatever the rule (lpw-20.2). Nothing else about the call changes: owner-only first; carry-over
   of live identities the old rule admitted when the rule changes to one that is not `Open`; the
   lpw-21 seed when it changes to `Allowlist`; `admit` admits outright under every rule. `Password`
   no longer needs a stored or a new password: it means "the owner and admitted identities only".
2. The reducer `admit(who, password)` goes, and with it everything only the door used:
   `hash_password`, `password_matches`, `password_length_ok`, `recent_wrong_attempts`,
   `attempts_locked`, `sweep_stale_attempts`, the Argon2 cost constants, `ADMIT_MAX_WRONG_ATTEMPTS`,
   `ADMIT_ATTEMPT_WINDOW_MS`, `PASSWORD_MAX_BYTES`, `PASSWORD_SALT_BYTES`, `PASSWORD_HASH_BYTES`,
   `LOG_WRONG_PASSWORD`, and the refusals `REJECT_ADMIT_LOCKED`, `REJECT_NO_PASSWORD_RULE`,
   `REJECT_PASSWORD_LENGTH`, `REJECT_OPEN_TAKES_NO_PASSWORD`, `REJECT_PASSWORD_REQUIRED`,
   `REJECT_ALLOWLIST_TAKES_NO_PASSWORD`. Kept: `REJECT_NOT_ADMITTED`, `REJECT_NOT_WORLD_OWNER`,
   `effective_rule`, `rule_in_force`, `is_world_owner`, `is_admitted` (unchanged: it never read the
   salt or hash), `require_admitted`, `require_admitted_at_connect`, `require_world_owner`,
   `withdraw_admission`, `erase_admission`.
3. `admit_identity` keeps deleting the admitted identity's `world_admission_attempt` row, and the
   cascade (`erase_admission`) still deletes it (an earlier module may have written one; manifest:
   Erase). (Plan review: dropping it was unasked-for and kept personal data longer.)
4. Schema: unchanged (additive rule; `world_access`'s salt/hash columns stay and are written empty;
   `world_admission_attempt` stays, written by nobody). `table-schemas.json` unchanged.
5. `game-core/src/lib.rs`: `PROTOCOL_VERSION` 3 -> 4 (a reducer removed and an argument removed).
   `MIN_CLIENT_PROTOCOL` stays 1: no game client calls `set_world_access` or `admit` (grep of
   `client/src` outside `module_bindings`: none), and "Rules out: raising MIN for a change no older
   client reads". Recorded in plan-delta.
6. Bindings: `just gen` — `set_world_access_reducer.ts` loses `password`, `admit_reducer.ts` is
   deleted, `index.ts` and `types/reducers.ts` lose `admit` (types/reducers.ts is outside touches:
   widen at the regen step, as lpw-22 did). `evals/baselines/client-callable-reducers.json` loses
   `admit` and `set_world_access.password`. `client/src/net/wireContract.json` does not exist
   (lpw-25 unbuilt): nothing to append (PR body).
7. Docs: `docs/DECISIONS.md` — rewrite "The door records a wrong password and answers `Ok`..." to the
   gate's check (the module takes no password; the gate keeps the Argon2id salt/hash and the count,
   lpw-14.6; why: the commit log); edit "A world that is not open refuses an unadmitted identity..."
   where it names `admit` and "the owner relays the door". `docs/local-play.md` §3: the door
   passages state the gate's check and the module's outright admission; Boy Scout the lpw-22 stale
   lines (no unbind reducer; "can call nothing"; the official build's refused list).

## Widening (each at its measuring step)

- `server-module/src/world_binding_tests.rs` — compile error at the skeleton: it calls
  `crate::access::set_world_access(ctx, rule, password, admit)` (lines ~4434, ~4717).
- `client/src/module_bindings/types/reducers.ts` — `just gen` rewrites it (AdmitParams goes);
  `bindings-drift` fails otherwise.

## Order

1. Skeleton (orchestrator, production code only): `set_world_access` takes `(rule, admit)` and keeps
   today's behaviour as if `password` were `None` (Password keeps a full stored salt+hash, else is
   refused `REJECT_PASSWORD_REQUIRED`; Open/Allowlist store empty). `admit` stays. Compiles; the
   old tests do not (signature) — the tester migrates them.
2. Tester (opus): gating tests + migration of existing call sites + deletion of the door tests the
   ruling supersedes (each listed with reason and survivor). Contracts in the tester brief.
3. Red run: every new `_lpw20_N` test fails on the real defect against the skeleton.
4. Implement (orchestrator): items 1-3, 5 above; `just gen`; baseline edit.
5. `just ci-fast` / nextest loop; lens batch; doc-keeper; `just ci`; `mr-gates check`; PR.

## Test plan (tester; names end `_lpw20_<n>`)

- lpw-20.1 (access_tests.rs `mod password_rule_lpw20`, privacy_enforcement_tests.rs
  `mod no_password_argument`):
  - from no row, `Open`, `Allowlist` and a legacy row: owner's `set_world_access(Password, [])` stores
    exactly `{id 0, Password, [], []}`; the owner and an admitted identity pass `require_admitted`
    and connect; a stranger is refused at both with no write.
  - census over `fx.module_def()` (a generated artifact: the compiled module's describe output):
    every reducer, client-callable and private; no reducer `admit`; `set_world_access` params are
    exactly `[rule: WorldAccessRule, admit: Array<Identity>]`; no param name contains `password`,
    `passwd`, `passphrase`, `salt`, `hash` or `secret` (case-insensitive); the set of
    (reducer, param) whose type resolves (through the typespace) to one holding a `String` or a
    `u8` array anywhere equals an exact roster, each row with a basis saying why it carries no
    password (attestation, guest claim code, names, accounts).
- lpw-20.2 (access_tests.rs `mod legacy_password_lpw20`): a legacy `Password` row holding the real
  Argon2id KAT salt+hash of a known password, plus an admitted A and a stranger S:
  - meanwhile S is refused at `require_admitted` and at connect, and every player reducer refuses
    S (admission_roster sweep on the legacy row, privacy_enforcement_tests.rs); A passes.
  - the owner's next `set_world_access` under each rule (`Password` same-rule, `Open`, `Allowlist`)
    stores empty salt and hash, keeps the admission rows, and admits nobody new (no live S gets a
    row on Password->Password; carry-over rules unchanged otherwise).
- lpw-20.3 (access_tests.rs `mod admitted_outright_lpw20`, privacy_enforcement_tests.rs): on a
  world the owner set to `Password` through the reducer (salt/hash empty):
  - an identity in the call's `admit` list (at the rule change, and later with the rule unchanged)
    connects (session recorded) and passes `require_admitted`; its admission time is the call's.
  - a never-admitted identity is refused at connect with no write and by every reducer of the
    generated roster (admission_roster's sweep run on this world).

## Deletions (superseded by ruling #840; lpw-9.3's lockout moves to the gate, lpw-14.6)

`mod wrong_password` (whole), `mod password_hash` (whole), the door halves of `mod owner_only`,
`owner_admits` tests about salts/hash/password changes, `allowlist` tests about the password
argument and the door on an Allowlist world, the door/`admit` probe in `mod admission_roster`.
Survivors per deletion: the lpw-20 census (no reducer takes a password, `admit` absent), the
lpw-20.1/20.3 admission tests, the existing owner guard tests on `set_world_access`. Listed in the
PR body `deleted-tests:` for adjudication by the reviewer lens.

## Notes to file (mr-gates notes add)

- `argon2` is unused in `server-module/Cargo.toml` after lpw-20 (Cargo.toml/Cargo.lock outside touches).
- Stale comments outside touches: `ARCHITECTURE.md:164` (names `admit` and the door),
  `server-module/src/schema.rs:1931-1933,1952-1955,2220,2399` (the salt/hash and wrong-password
  table), `server-module/src/world_binding.rs:588` ("the door").
- `world_admission_attempt` and the salt/hash columns are dead after lpw-20: lpw-32's removal list
  names the columns, not the table.
- lpw-14: admitting through `set_world_access` also sets the rule; a gate call naming `Password`
  after the host switched to `Allowlist` switches it back. The gate must read the rule in force or
  the module needs an admit-only owner call.

## Ledger CHECKs

Each: `PATH=... cargo nextest run --workspace -E 'package(monster-realm-module) & test(/_lpw20_<n>$/)'`
with EXPECT the exact `N tests run: N passed` once the tester's count is known.

## Plan review (reviewer + red-team), dispositions

- Kept: item 3 dropped (reviewer M3). Exact row equality over legacy rows for every rule, forged
  Open/Allowlist rows with salt (red-team M3). Census broadened name segments; text roster kept as
  a tripwire, honestly labelled: an Identity/u64 argument could carry a derived value; review is
  the defence (reviewer M5 / red-team M4). Docs say the commit log written before lpw-20 keeps past
  passwords and that no password door exists until lpw-14 (red-team L6/L7).
- Rejected: red-team H1 (a world with no owner keeps a legacy hash): only a registered owner could
  have written a Password row, and the owner cannot become zero, so no such world exists.
  Red-team H2 / reviewer Q6 (admitting via set_world_access also writes the rule): the ruling and
  lpw-14 route admission through set_world_access; filed as a spec note for lpw-14.
  Full literal roster of every reducer param (red-team M4): duplicates client-callable-reducers.json.
