## lpw-9 — a private server applies the host's open or password rule

Spec: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-9 · mechanism: `docs/local-play.md` §3 fork (a), design A1.

Items: none

### What changed

**Server module**
- `server-module/src/access.rs` (new) owns three private tables: `world_access` (one row: the rule `Open | Password`, an Argon2id salt and hash), `world_admission` (identity, when), `world_admission_attempt` (identity, up to five wrong-password times). A world with no row is `Open`.
- `on_connect` opens with the admission check: under `Password` an identity that is neither `config.owner_identity` nor admitted is refused before its session or account is written.
- The 40 client-callable player reducers open with `access::require_admitted`. `sync_content`, `set_world_access` and `admit` are owner-only.
- `set_world_access(rule, password: Option<String>, admit: Vec<Identity>)`, owner-only: sets the rule, admits every connected identity when the rule leaves `Open`, and admits each identity in `admit` without a password.
- `admit(who, password)`, owner-only (the door): the right password admits `who`; five wrong passwords less than ten minutes old lock `who` out; a wrong password is recorded and the call answers `Ok`.
- The deletion cascade erases the subject's admission and attempt rows. `PROTOCOL_VERSION` is 2 (`MIN_CLIENT_PROTOCOL` stays 1).
- New dependency: `argon2` 0.5 (`alloc` only).

**Client**
- On a `private` target the page's first join shows, once per server, "This server's host can read and change your data in this world." (`ui/hostNoticeModel.ts`, `main.ts` `onReady`; en and fr).

**Docs**: `docs/DECISIONS.md` (the access entry rewritten in place; a new entry for the door's contract), `docs/local-play.md` §3 (what is built, the proofs, the live measurement), `ARCHITECTURE.md`.

### Acceptance ledger

Acceptance: 6/6 met, 0 deferred, 0 unmet — lpw-9 seed:a1c26b9a5a743dbe
touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- client/src/ui/i18n/catalogParity.test.ts — named pin: catalogParity.test.ts lists every catalog key main.ts names as a literal; lpw-9.6 adds chrome.status.privateHostNotice to main.ts
- server-module/src/economy.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/evolution.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/monster_mgmt.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/movement.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/npc.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/privacy.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/pvp.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/raising.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/ranking.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/tactics.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/trading.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- server-module/src/trading_session.rs — red test privacy_enforcement_tests::admission_roster::every_player_reducer_refuses_an_unadmitted_caller_before_anything_else: each client-callable reducer in these modules answers its own error, not the admission refusal, until require_admitted is its first statement (design A1; the spec says the guard sites are widened by the build)
- game-core/src/lib.rs — named pin: docs/DECISIONS.md 'The module publishes its protocol numbers' — PROTOCOL_VERSION rises with every change to the module's tables or reducers; lpw-9 adds three tables and two reducers
- client/src/module_bindings/types/reducers.ts — generated artifact: just gen rewrites client/src/module_bindings/types/reducers.ts when a reducer is added (bindings-drift fails otherwise)
- client/src/ui/i18n/resolver.test.ts — red test: resolver.test.ts m24s1 RESOLVER-T pins every plain chrome.* key with its English value; the new chrome.status.privateHostNotice makes the catalog one key longer than the pinned map
- docs/local-play.md — docs/local-play.md section 3 states 'None of this is built' and names the tests that prove fork (a); lpw-9 builds fork (a)'s module half, so both statements are false at this head until the doc is updated (reviewer finding)

Per gate (each CHECK is re-executed by `mr-gates check`; ids are `monster-realm-module` nextest modules or vitest titles ending `[lpw-9.6]`):
- lpw-9.1 — `access::access_tests::open_by_default` (3)
- lpw-9.2 — `access::access_tests::unadmitted` (7) + `privacy_enforcement_tests::admission_roster` (3)
- lpw-9.3 — `access::access_tests::wrong_password` (15)
- lpw-9.4 — `access::access_tests::owner_only` (6)
- lpw-9.5 — `access::access_tests::owner_admits` (11)
- lpw-9.6 — `hostNoticeModel.test.ts` (16), `main.hostNotice.test.ts` (9), `catalog.test.ts` (2)

Red proof on the contracts-only skeleton: 44 module tests and 30 client tests failed on behaviour; the four controls that guard against refusing everyone passed. Local gate: `just ci` exit 0 at `8f85074e` (Rust 3465 / 1168 / 3137 tests in the three builds, 15 evals with `bindings-drift` clean, client 6364 tests, `check-secrets` clean); gitleaks clean over the branch's commit range.

### plan-delta

1. **A wrong password answers `Ok`.** A reducer that returns `Err` is rolled back, so a refusal that must be counted has to commit. The caller reads the `world_admission` row for the outcome. Every other refusal of `admit` is an `Err` with no write.
2. **A third private table**, `world_admission_attempt`: the count needs a row for an identity that is not admitted.
3. **A sliding window** (plan review): a window anchored at the first wrong attempt let nine guesses through around its boundary.
4. **No syn census.** `testing-tdd.md` forbids a new parse of hand-written source. `privacy_enforcement_tests.rs` `mod admission_roster` takes the roster from the generated bindings' file names and executes every shipped reducer as an unadmitted caller. An HTTP handler or row filter cannot be declared while the `spacetimedb` crate's `unstable` feature is off; the existing deletion census refuses a `procedure`.
5. **Argon2id** at the account service's parameters for the salted hash (22 ms per door call in-host, measured).
6. **Dev-only reducers make no admission check** (not in the generated roster; never ship). **No removal reducer** (no criterion; the owner deletes the row over SQL).
7. Tester questions answered: a duplicate admission insert cannot happen (find-then-insert); `ctx.random()` works in the native host; the two `open_by_default` shell tests pass on the skeleton by design (guards against refusing everyone); `sync_content`'s owner refusal is read from a control call.

### Live-host measurement (2.11.0 standalone, the built module; log `memory/projects/gates/lpw-9.live-probe.log`)

- After the owner set `Password`, an identity never admitted: seven reducers each 403 `not admitted`; a `sql` read of all 68 tables the schema lists refused (the owner reads all 68); its WebSocket closes with no message.
- Five wrong `admit` calls exit 0 and leave one record; the right password is then refused and no admission row exists (the count survives across transactions). One wrong then the right password admits; that identity joins, reads and keeps its socket. An identity admitted through `set_world_access` joins with no password.
- A door call that hashes: median 23.4 ms over HTTP against 1.0 ms for one that does not.
- **The host's commit log keeps reducer arguments in the clear: the password given to `set_world_access` and every password given to `admit`, wrong ones included.** The hash protects the row, not a copied world directory. Follow-up `R-lpw-9-COMMITLOG` (the shell and the gate stretch the password before the call) and operator question monster-realm#840 (non-blocking; the default stands).

### Review lenses

- **Plan** (reviewer, red-team): the sliding window, fail-closed `password_matches`, insert-if-absent, the claim-flow statement and the live probe came from it.
- **reviewer**: no blocker. Fixed: a false `basis` string, three doc comments the inserted check left false, the module doc's roster wording, a redundant length compare, storage bound once in `main.ts`, `NAME` hoisted in four tactics reducers. Kept: the guarded delete in `admit_identity` (an admission of an identity with no record writes nothing to the attempt table).
- **red-team** (54 mutants, 51 killed): one real edge fixed — the sweep keyed on the call's time, so after a backwards clock step it could delete a row that still locked an identity; it keys on the latest stamp. Three test gaps closed (fresh salt, unregistered all-zero owner, a read before the admission check); each new test was watched failing on its mutant. Two survivors are behaviour-equivalent (hashing before the lock check is unobservable natively; the rule clause in the `Password`/`None` arm).
- **reducer-security-auditor**: PASS. Two nits answered: no cap on the owner-only `admit` vector (the owner can already do unbounded work over SQL; the gate relays only the door); the door may admit an identity whose account was erased (an admission is the host's decision about an identity, and a deleted account re-registers fresh).
- **desync-guard**: PASS (one constant in `game-core`; no rule moved).
- **/simplify**: two candidates applied (above); nothing else to cut.
- **verifier**: PASS on test integrity: no rule relaxed (rosters and counts moved to follow the three tables, two reducers, one module and one catalog key; the retired-reducer index pin still refuses every index in its kill list and allows only the admission check's one), nothing deleted or skipped, no forbidden shape (`admission_roster` lists generated file names and opens no file). Its flags: commit `4c55a276` carries the tester's `trading_tests.rs` edit beside production code, because the worktree is committed whole; every test edit in the range was written by the tester subagent, and the implementer ran only `cargo fmt` and biome over test files. The ledger evidence was re-recorded after the four added tests.

### touches-delta

Widened by `mr-touches` (reasons in the ledger render above): the twelve reducer modules that take the guard site (`economy`, `evolution`, `monster_mgmt`, `movement`, `npc`, `privacy`, `pvp`, `raising`, `ranking`, `tactics`, `trading`, `trading_session`), `game-core/src/lib.rs` (`PROTOCOL_VERSION`), `client/src/module_bindings/types/reducers.ts` (generated), `client/src/ui/i18n/catalogParity.test.ts`, `client/src/ui/i18n/resolver.test.ts`, `docs/local-play.md`. Sibling test of a widened file: `server-module/src/trading_tests.rs` (the retired-reducer index pin now allows the admission check's one index). Doc set: `docs/DECISIONS.md`, `ARCHITECTURE.md`.

### boyscout-delta

none

### comment-scan

`mr-comment-scan`: FLAGGED 30, each answered:
- `client/src/ui/i18n/catalog.test.ts`, `catalogParity.test.ts`, `resolver.test.ts` (16, `[id] lpw-9`): tester-authored; those files mark every pinned-roster change with a `<slice> (named intentional change)` comment, and the new lines follow the file's own rule.
- `docs/local-play.md` (5, `[id]`): that document names work by its slice id by its own stated convention (§3, first paragraph).
- `server-module/src/access_tests.rs` (4, `[history] the old`): "the old password" is the scenario's subject (what a password change does to the previous password), not code history.
- `server-module/src/trading.rs` (3) and `trading_tests.rs` (2), `[history] Retired`: the three legacy trade reducers are retired in the current code (they return `LEGACY_TRADE_RETIRED`); the word states what they are.

### Risks

- The commit-log finding above: until the callers stretch the password, a shared world directory gives up the host's password.
- A hostile identity connected while the rule is `Open` is admitted when the rule leaves `Open`, and stays admitted across a password change (design A1: no module call closes a connection; no removal reducer yet).
- The per-identity lockout does not bound guessing (identities are free); the gate's limit by source address does, and the gate is not built.
- An unadmitted joiner sees a generic connect failure (`R-lpw-9-REFUSEDJOIN`).

### not-verified

- Remote CI: `cargo-audit` over the new `argon2` dependency tree (not installed locally) and the e2e job were not run. gitleaks was run locally over the commit range and is clean.
- No Playwright e2e drives the host notice in a real browser against a private server: lpw-9.6 is proved by the model tests and by `main.hostNotice.test.ts`, which boots the real `main.ts` in happy-dom.
- The door through a real gate or shell (neither is built): the live probe called the reducers over HTTP and the CLI as the owner.
- Argon2id's in-host cost on other hardware, and what one 19 MiB hash does to the host's resident memory against the `docs/local-play.md` §6 budgets.
- The `world` and `official` release builds do not exist yet; everything ran on the default and dev builds.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
