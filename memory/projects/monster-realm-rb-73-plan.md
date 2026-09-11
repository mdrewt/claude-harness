# rb-73 plan — disconnect side effects gated on the LAST live connection (R-18r-b-DISCONNECTSELF)

Status: DELIVERED 2026-09-11 as PR #457 under a disclosed scope widening (see handoff); plan executed steps 2-10. Produced by `planner` (opus) from the orchestrator's verified fact base; amended by the orchestrator (§A) after the reviewer/red-team lenses. Slice worktree: `.claude/worktrees/rb-73` (branch `feat/rb-73-disconnect-session-guard`, from 9434dfb). ADR number: **0245** (supervisor-assigned; ledger text's 0244 is stale — consumed by rb-9).

## Verified platform facts (cite, do not re-derive)
- SpacetimeDB 2.8.1 `POST /v1/database/<db>/call/<reducer>` (crates/client-api/src/routes/database.rs `with_connection`, v2.8.1) generates a random `ConnectionId`, calls `client_connected`, runs the reducer, then ALWAYS calls `client_disconnected` for that connection. Every HTTP reducer call is therefore an ephemeral connection whose close fires `on_disconnect` for the caller's identity.
- `client_connected`/`client_disconnected`: `ctx.connection_id()` is guaranteed `Some` (vendor lifecycle docs; the vendor's canonical `client_disconnected` example is a PRIVATE `sessions` table keyed by `connection_id` with an `identity` column).
- Module launch/restart replays `call_identity_disconnected` for every dangling `(identity, connection_id)` in `st_client` (crates/core/src/host/host_controller.rs "Disconnect dangling clients"); a republish that requires client disconnect calls the NEW module's disconnect reducer for each old client. A session table drains itself after crashes/restarts.
- `ReducerContext::__dummy()` (crate 2.8.1 src/lib.rs:1043) has `connection_id: None` (PRIVATE field — not settable), `sender = Identity::__dummy()` (all zeros).
- `native_host_tests.rs`: reads modelled; all four write syscalls `unmodelled()` → process abort. `UniqueColumn::delete` and btree `delete(point)` both go through `datastore_delete_by_index_scan_point_bsatn`; `insert` through `datastore_insert_bsatn`.
- Private tables are not emitted by `spacetime generate` → no `client/src/module_bindings` churn.
- `client/src/net/connection.ts:665-669` treats a `joinGame` rejection of exactly `'already joined'` as benign (reconnect overlapping the old session's lagging drop). Today that late drop deletes the presence rows underneath the new session.

## Decision

**(A), refined: a multi-row PRIVATE `player_session` table keyed by `connection_id`, with a btree `identity` column; "last connection out" runs the side effects. Classified `Erase` in `DATA_LIFECYCLE_MANIFEST`, not `NotOwned`.**

Rejected alternatives, with the reason each dies:

- **(B) single-row "first connection owns the presence"** — fixes the amplifier but NOT the reconnect-overlap wipe (ADR-0085 opens a new WS before the old drop; under B the owner's late `client_disconnected` still deletes the presence rows underneath the live new session, and `client/src/net/connection.ts:665-669` deliberately treats the resulting `'already joined'` as benign, so the bug stays invisible). Its keyed-by-identity row also needs a find-then-insert or an `update`, where A's PK can never collide. A stale B row is *permanently* wedging; a stale A row only blocks until its own dangling `client_disconnected` replays at module start.
- **(C1) no table — read `st_client`** would be the ideal fix. Not available: module code has no system-table access in 2.8.1 (`spacetimedb-2.8.1/src/lib.rs:1092-1099`).
- **(C2) store the owning `ConnectionId` on the existing `player`/`character` row** — both tables are `public` (pinned in `evals/battle-schema-snapshot.eval.mjs:2570-2589`), so it breaks ADR-0015 (connection ids must never leak) outright.
- **(C3) a per-identity counter row** — an `update`-based counter cannot self-heal, and `datastore_update_bsatn` is the least testable syscall we have.
- **(D) lib.rs-only mitigation without persisted state** — none exists: the HTTP connection is indistinguishable from a WS connection without recording connection ids, and module-static memory is non-transactional and non-durable (not idiomatic; rejected).

Why `Erase` and not `NotOwned`+frozen-five: the row names an identity and a connection id, and (unlike `account_deletion_reaper_schedule`) it is NOT guaranteed absent at cascade time — a subject deleted while connected would keep it. `m22s6_not_owned_identity_exceptions_are_frozen` (`server-module/src/accounts_tests.rs:11413-11508`) calls widening its frozen four "a PRIVACY-CLASSIFICATION DECISION for a human reviewer"; taking a sanctioned lane beats widening an allowlist. *Fallback if the supervisor refuses `accounts.rs`/ADR-0228 in touches:* `NotOwned` + frozen-five, argued in ADR-0245 as a deliberate retention decision.

Key shape is final on first ship (ADR-0006 / ADR-0173 D5, transcribed at `evals/battle-schema-snapshot.eval.mjs:281-289`): tail columns with `#[default]` remain addable later, a unique/PK does not — so PK-on-`connection_id` + btree-on-`identity` must be right now. No `connected_at_ms` (YAGNI; addable later as a defaulted tail column).

## Design

Table (declare in `server-module/src/schema.rs`, beside `ExportBundle` at :930-944 — a data table, not a scheduler table, so the ADR-0056 colocation exception does not apply; `m22s6_table_row_types` names `crate::schema::*` for every data table):

```rust
#[spacetimedb::table(accessor = player_session)]   // PRIVATE: no `public` arg; accessor FIRST (accounts_tests.rs:3546-3570)
pub struct PlayerSession { #[primary_key] pub connection_id: ConnectionId, #[index(btree)] pub identity: Identity }
```

Three helpers in `lib.rs`, beside `erase_character_rows` (lib.rs:259-263 — the precedent for a cascade helper living in lib.rs):

- `open_player_session(ctx)` — `let Some(conn) = ctx.connection_id() else { return; };` then `.connection_id().delete(conn);` then `.insert(PlayerSession{ conn, ctx.sender() })`. Delete-before-insert is what the vendor's unstable `insert_or_update` does (`spacetimedb-2.8.1/src/table.rs:400-418`, `#[cfg(feature="unstable")]` so unusable) and makes a re-entrant `client_connected` (hot republish) impossible to panic on. Infallible: no `Err`, no `unwrap`, no `expect`.
- `live_connection_count(ctx, me, excluding: Option<ConnectionId>) -> usize` — **SUPERSEDED by §A3: `has_live_session(ctx, identity) -> bool`** = `ctx.db.player_session().identity().filter(identity).next().is_some()`. This is the whole security decision and it is read-only, so it executes on the native host.
- `erase_player_sessions(ctx, owner)` — the cascade step (Erase policy).

`on_connect` (lib.rs:222-228) becomes, in exactly this order:

```
let jwt = ctx.sender_auth().has_jwt();
open_player_session(ctx);
if !jwt { return Ok(()); }
accounts::provision_or_touch_account(ctx)
```

Squashed, `has_jwt(` still precedes `provision_or_touch_account(`, `returnOk(())`, `accounts::`; the body holds no `Err(` and no `ctx.db.` token at all — so `auth1_on_connect_has_jwt_gate_is_first_and_no_err_before` (accounts_tests.rs:1262-1297) and `[I/anon-first]`/`[I/anon-no-err]` (guest-claim-integrity.eval.mjs:936, 974-1007; absent tokens are *skipped*, :985) all hold. The session write deliberately runs for anonymous connections too — that is the feature; the compensating pin is X3's frozen single-purpose helper body, so it can never grow a second write.

`on_disconnect` (lib.rs:265-279) becomes: `let me = ctx.sender(); let leaving = ctx.connection_id();` → `if let Some(conn) = leaving { ...connection_id().delete(conn); }` → `if live_connection_count(ctx, me, leaving) > 0 { return; }` → the existing four lines verbatim. `resolve_all_live_interactions(` still occurs exactly once (`trading_tests.rs:3144-3154`), `profile(` never (`pvp_tests.rs:1919-1937`, `evals/ranking-security.eval.mjs:2840-2853`), and `resolve_all_live_interactions`'s own frozen body (accounts_tests.rs:9841-9876) is untouched.

Behaviour: the HTTP `/call` connection inserts then deletes its own row; if a real WS session exists the count is ≥1 and every side effect is skipped. A **lone** ephemeral connection is still last-out, so `evals/smoke-republish-on-disconnect-compat.eval.mjs`'s premise survives unchanged. `connection_id() == None` (impossible in these hooks per vendor lifecycle) fails safe in both directions: with live sessions it skips, with none it runs the legacy path. Deploy transition is fail-open to legacy: pre-existing WS clients have no row in the new empty table, so their disconnect behaves exactly as today.

## Tests (ADR-0224: ordinary `#[test]`s only; no new/extended `evals/*.eval.mjs` clauses)

New file `server-module/src/rb73_session_tests.rs`, declared `#[cfg(test)] #[path = "rb73_session_tests.rs"] mod rb73_session_tests;` from lib.rs (precedent `m14_5d_1a_tests` at lib.rs:45-47; the `*tests` module name is what exempts it from `m22_declared_mod_names`, accounts_tests.rs:3618, and the `_tests.rs` file suffix is what the cross-file eval scanners key on — native_host_tests.rs:25-38).

EXECUTED on the in-memory host (`fx.table::<PlayerSession>("player_session","identity",|r| r.identity)`; `ConnectionId::from_u128` is public+const, `spacetimedb-lib-2.8.1/src/connection_id.rs:60`, so keys are constructible even though a ctx's `connection_id` is not):

(SUPERSEDED by §A3 — the helper is `has_live_session -> bool`; the three bool tests are named in ADR-0245 D5. Kept for provenance.)

| test | kills |
|---|---|
| `rb73_sessions_counts_siblings_excluding_the_leaving_connection` (2 rows, exclude one → `1`) | M5 `live_connection_count` always 0 (the whole fix no-ops) |
| `rb73_sessions_lone_connection_counts_zero` (1 row, exclude it → `0`) | M4 ignoring `excluding` — the availability mutant: no disconnect ever cleans up |
| `rb73_sessions_other_identity_rows_are_not_counted` (seed identity B) | M6 whole-table / wrong-index counting (a `.iter()` mutant additionally hits the unmodelled `datastore_table_scan_bsatn` wall, native_host_tests.rs:351-354) |
| `rb73_sessions_absent_connection_id_counts_every_row` (`excluding = None`) | a fallback flipped to "count nothing" (silent bypass) |

Each asserts the returned `usize` (the oracle is the return value), opens with a vacuity pre-assert that the seeded rows are visible through `ctx.db`, and closes with the rb72 `Handle::remove` falsifiability control (accounts_tests.rs:20201-20223).

SOURCE-SHAPE (the reducers' `Some(conn)` branches are structurally unexecutable: `ReducerContext::connection_id` is a private field and `__dummy()` yields `None`, `spacetimedb-2.8.1/src/lib.rs:1043-1055`):

- `rb73_wiring_on_connect_body_is_frozen` — declaration-uniqueness + fail-loud extraction + **exact equality** of the squashed body. Kills M8 (session insert moved inside the JWT branch) and M7 (insert deleted).
- `rb73_wiring_open_session_body_is_frozen_and_single_purpose` — exact body equality **plus** the compensating clauses for the `ctx.db.`-before-the-guard widening: the body names only the `player_session` accessor, and contains zero `Err(`/`accounts::`/`unwrap(`/`expect(`/`panic!(`.
- `rb73_wiring_on_disconnect_guard_precedes_and_body_is_frozen` — counts/ordering first (guard index < `resolve_all_live_interactions(` index, each exactly once) so a failure says *which* part moved, then exact body equality as the finale, mirroring `m22s3b_resolver_body_order` (accounts_tests.rs:9822-9876). Kills M1 guard deleted, M2 `> 0`→`== 0`/`> 1`, M3 guard moved below the resolver, M9 the `connection_id().delete` dropped (rows leak → every future disconnect skips cleanup).
- `rb73_schema_session_table_is_private_and_keyed` — exact equality over the declaration: attribute is `accessor = player_session` and nothing else, `#[primary_key]` on `connection_id`, `#[index(btree)]` on `identity`, columns in order. Kills a `public` flip and a key-shape drift (which ADR-0006 makes unfixable later).
- `rb73_wiring_cascade_erases_sessions` — the reaper reaches `erase_player_sessions(`; complements the existing map test rather than restating it.

Squashed pins are whitespace-insensitive, so rustfmt's `fn_call_width` re-wrap cannot false-RED them.

**Do NOT extend `native_host_tests.rs` with `Handle::allow_deletes()` in this slice.** It is implementable safely (the host already maps `index_id → table_id`, native_host_tests.rs:81/336-344, so an opt-in `HashSet<table_id>` would keep `unmodelled()` as the default and leave the abort wall — hence rb72's Leg A kill (accounts_tests.rs:20060-20090), rb41/46/47 — byte-for-byte intact). Carry as residual **R-rb-73-HOSTWRITES** (design sketch above) and **R-rb-73-NOEXEC** (M1/M2/M3/M8/M9 are killed by source equality only — see §A for the executed skip-path test that narrows this).

## Files (the widened `touches:` the supervisor must re-serialize — this is a hidden-dependency STOP)

| file | why | the gate that forces it |
|---|---|---|
| `server-module/src/lib.rs` | the fix + 3 helpers + the new `mod` | the defect itself |
| `server-module/src/schema.rs` | `PlayerSession` + manifest entry (Erase, `exportable:false`, basis with **no `/`**, schema.rs:972-975) + the 41→42 / 13-ERASE→14 prose at :989-993 | `data_lifecycle_manifest_totality_bidirectional` (accounts_tests.rs:3836-3900) |
| `server-module/src/rb73_session_tests.rs` **(new)** | all teeth | ADR-0224 |
| `server-module/src/accounts.rs` | ONE line: `crate::erase_player_sessions(ctx, args.account_identity);` in `account_deletion_reaper` (:1046-1058). No accessor is named here, so `allowed_write_tables` (accounts_tests.rs:300) stays at four | `m22s3b_cascade_covers_manifest` (:9909) — an Erase table must be reachable from the reaper |
| `server-module/src/accounts_tests.rs` | frozen reaper body literal (:7317, "thirteen delegated calls"→fourteen); coverage map + census 22→23 (:9930, :10000); `m22s6_table_row_types` (:10937) + census 41→42 (:11201) + identity-bearing 21→22 (:11216); X1 population 17→18 (:11298); `expected_erase` roster (:4019); totality floors 41→42 (:3847, :3866); `m22s6_cascade_chain` entry + census (:11574); rb72 "HOST WALL"/"no guards" prose stays true | the tests above, all exact-equality/exact-count |
| `server-module/src/privacy_tests.rs` | `m22s4_no_exportable_false_table_is_named` floor 22→23 and its 41/24 prose (:4832-4840) — ratchet | same test |
| `server-module/src/trading_tests.rs` | prose only: `m22s3b_resolver_extraction_chain` says "on_disconnect is a lifecycle reducer with no guards at all" (:3110-3112) — now guarded; the count assertion stays | comment-accuracy (present-tense narration of a changed fact) |
| `evals/guest-claim-integrity.eval.mjs` | ONE `REKEY_MANIFEST` data row `'player_session.identity': { policy: 'EXEMPT', reason: … }` (:1808-1952). `SYNTH_KEYS`/`GOOD_TREE` are derived (:3737-3743) so no fixture edit follows | `[G6/declared]`: every Identity column needs a D6 policy |
| `evals/battle-schema-snapshot.eval.mjs` | T-VIS private count 23→24 (:2553) + `pinnedPrivateTables` += `player_session` (:2605-2639) | T-VIS-ANCHORS' own set-equality arm (:2653-2663) demands it deliberately |
| `evals/baselines/table-schemas.json` | regenerate: `node evals/battle-schema-snapshot.eval.mjs --write` (:3167-3191) | schema-snapshot drift |
| `docs/adr/0245-*.md` **(new)** | the decision record every pin cites | in scope already |
| `docs/adr/0232-…-injected-clock-e2e.md` | D2 (:44-67) states the disconnect mechanism rb-72 just corrected; it changes again | doc-vs-code SSOT; needs the ADR-0245 pointer **and** the reciprocal `Amended-by:` if 0245 says `Amends:` |
| `docs/adr/0228-…` | the frozen-reaper message says "re-derive this literal FROM ADR-0228 D2's step list" (accounts_tests.rs:7326-7328); the list gains a step | doc-vs-code SSOT |
| `sim-harness/src/bin/mr_load_driver.rs` | AM25 prose (:76-89) claims an HTTP call "would also destroy a concurrent WS session's join state" — false after the fix (the rest of AM25 stays true) | present-tense narration of a changed fact |
| `docs/adr/0180-observability-stack-selection.md` | the AM25 twin claim — verify wording, edit only if it repeats the falsified sentence | same |
| `docs/knowledge/**`, `ARCHITECTURE.md`, `docs/adr/DIGEST.md` | `just knowledge`, the lifecycle/table paragraph, `just adr-digest` | drift gates; already in-scope companions |

CHANGELOG is cliff-generated. **Fan-out ineligible → SERIAL:** a new table moves eight different census constants (41/42, 17/18, 22/23, 13/14, 21/22, 23/24) and regenerates a committed baseline; any concurrent sibling touching `schema.rs`/`accounts_tests.rs`/the baseline conflicts by construction.

## Steps (for the resumed run, after re-serialization)

1. ~~STOP + checkpoint~~ (done 2026-09-11: plan + ADR-0245 draft committed as `wip:`; handoff + progress memo written).
2. ADR-0245 finalize (decision, the rejected designs, the `Erase` argument, the `ctx.db.`-before-`has_jwt` widening + its compensating pin, `Amends: ADR-0232` + reciprocal back-link, ADR-0228 D2 step list).
3. `schema.rs`: struct + manifest entry. Run `cargo nextest run -p monster-realm-module` → record the census REDs verbatim as X1's RED evidence.
4. Census/roster updates in `accounts_tests.rs` + `privacy_tests.rs` → green.
5. ~~`tester` writes `rb73_session_tests.rs`~~ DONE 2026-09-11 (wip 9b6b3e5): 9 tests, RED = 23 build errors all naming the seam (E0432 `PlayerSession`/`player_session`, E0425 `has_live_session`, E0599 accessor). See §A13 for the pinned literals the specialist must match.
6. `specialist`: `lib.rs` helpers + `on_connect`/`on_disconnect` wiring; `accounts.rs` cascade line; frozen reaper literal → GREEN.
7. Wiring-freeze teeth, then the mutant sweep M1-M11 (one at a time, rebuild between runs — a stale build reuses the previous row; restore the tree after each).
8. Evals: REKEY row, T-VIS count+roster, `--write` the baseline; `node evals/run.mjs`.
9. Docs: ADR-0232/0228 amendments, `mr_load_driver.rs` prose, ARCHITECTURE.md, `just knowledge`, `just adr-digest`; confirm `just gen` leaves `client/src/module_bindings` clean (private tables are not emitted).
10. `just ci` (detached, CI-EXIT marker) → ledger EVIDENCE; lenses (reviewer/red-team/simplify/reducer-security-auditor/desync-guard/verifier) → PR.

**Vertical slicing — confirmed: no smaller coherent increment.** A pure-function seam alone is unused code in the lib target (`-D warnings` dead_code). "Table+plumbing now, guard later" is the only real split and it buys nothing: both halves need the *same* widened touches, it doubles the knowledge/baseline/ADR regen, and it merges a write-only table with no reader.

## Risks / anti-patterns

- **Do not add any `log::`/`mr_log` line to either hook** — `evals/observability-log-wrapper.eval.mjs` and `no-logic-in-wrapper` scan lib.rs, and every extra statement enlarges the frozen bodies.
- **Never name `player_session` anywhere in `privacy.rs`** — `m22s4_no_exportable_false_table_is_named` bans a non-exportable accessor there (privacy_tests.rs:4815-4829).
- **Do not put the struct or its writes in `accounts.rs`** — that forces widening `allowed_write_tables` *and* its JS twin `OWNED_TABLES`.
- **Stale rows** are the one availability failure mode: a leaked row wedges cleanup for that identity until the host replays its dangling `client_disconnected` at module start. Mitigations already in the design: delete-before-insert on connect, delete-by-`connection_id` on disconnect, and the count excluding `leaving` even if the delete did not fire. State it in ADR-0245 as an accepted, self-healing residual; do not build a TTL reaper (YAGNI).
- **`has_jwt()` placement**: the hoisted-bool shape is the only one that satisfies AUTH-1 + `[I/anon-first]` *and* gives anonymous connections a session row with a single call site. Expect the red-team to challenge "a helper launders `ctx.db.` past the anon guard" — the frozen single-purpose helper body (X3) is the answer, and the ADR must say so out loud.
- **Basis string must contain no `/`** (schema.rs:972-975) or the snapshot gate's string-unaware stripper truncates the parsed table set.
- **Multi-tab semantics change** (a second tab now keeps presence alive when the first closes). Intended; name it in ADR-0245 with the `client/src/net/connection.ts:665-669` interaction.
- **Cascade × still-connected subject**: erasing session rows during a deletion cascade makes that subject's next drop "last out" even with another live connection. Knowingly accepted; record it.
- **Number reservation**: ADR-0245 is free today (`docs/adr/0244-*` is the max) but races sibling merges — re-check before committing.
- `m22s6_table_row_types` names row **types**, not strings: a struct rename is a compile error there, which is the point — do not "fix" it with a string.

## Gates (X1..X8; ledger seeded 0 criteria — `N` is the count measured on the GREEN run and written into the CHECK before the gate is claimed; a filter matching nothing prints `0 tests run` and cannot satisfy the EXPECT)

See `memory/projects/gates/rb-73.gates.md` (authoritative; this list is the plan-phase draft).

- **X1 — the schema/manifest censuses stay total.** `cargo nextest run -p monster-realm-module -E 'test(/m22s6_|data_lifecycle_|m22s3b_/)'` → `<N1> tests run: <N1> passed`.
- **X2 — the decision predicate is EXECUTED and falsifiable.** `-E 'test(/rb73_sessions_/)'` → `4 tests run: 4 passed`.
- **X3 — the wiring is frozen.** `-E 'test(/rb73_wiring_|rb73_schema_/)'` → `5 tests run: 5 passed`.
- **X4 — no regression in the lib.rs pins other modules own.** `-E 'test(/auth1_on_connect|m22s3b_resolver|ea_pvp_05|ptc5b_4_wiring|m17a_rl2_/)'` → `<N4> tests run: <N4> passed`.
- **X5 — mutant sweep.** MANUAL, one row per mutant M1-M11.
- **X6 — every eval green.** `node evals/run.mjs` pass/fail count → `fail=0`.
- **X7 — the live two-connection proof.** MANUAL: WS session + `spacetime call <db> join_game` + a second HTTP call from the same identity; the `player` row survives and the WS session stays joined.
- **X8 — docs/knowledge do not drift.** `just knowledge-check && just adr-digest-check`.

## §A — orchestrator amendments after the plan lenses (2026-09-11; reviewer + red-team + /simplify)

**A1. BLOCKER closed — a third 41-entry census.** `evals/account-e2e.eval.mjs:156-162` carries `M22S9_MANIFEST_TRANSCRIPTION`, a 41-entry pipe-joined transcription of `DATA_LIFECYCLE_MANIFEST`; `m22s9_e2e_manifest_transcription_matches_manifest` (accounts_tests.rs:13271-13324) derives the string from the real manifest, asserts `n_parts == 41` (literal at :13289) and byte-equality with the eval constant. Adding `player_session` (Erase, `identity`, exportable false) inserts `player_session:Erase:identity:0` alphabetically between `player_quest` and `player_wallet` and bumps the count to 42. ADD to touches: `evals/account-e2e.eval.mjs` (constant) + `accounts_tests.rs:13289` (41→42). Gate X1 now filters `m22s9_e2e_manifest` too. Secondary: `S9_VACUITY_ALLOWLIST` (account-e2e.eval.mjs:167-181) is hard-capped at 3 — `player_session` MUST be non-vacuous for subject A at the pre-cascade snapshot (A is connected over the driver's persistent WS at that point, so exactly one row is expected); if it reads zero, that is a seeding bug, never a 4th allowlist entry.

**A2. Executed reducer tests (MAJOR, both lenses).** Under `ReducerContext::__dummy()` (`connection_id: None`) the FIXED `on_disconnect` takes `leaving = None` → no delete → `has_live_session(ctx, me)` is true when one `player_session` row is seeded for `ctx.sender()` → `return` before ANY write. So the reducer itself is executable: `rb73_exec_on_disconnect_skips_while_another_session_is_live` seeds one session row + `player`/`character` rows for the all-zero sender, calls `crate::on_disconnect(&ctx)`, asserts both presence rows still readable through `ctx.db` (with the rb-72 `Handle::remove` falsifiability control). RED before the fix = process abort on the unguarded `player_conversation().owner_identity().delete(me)` (`unmodelled()` write; nextest reports `SIGABRT`, the rb-72 precedent). Likewise `rb73_exec_on_connect_none_branch_writes_nothing`: seed a row, call `crate::on_connect(&ctx)` (or the helper), assert the row untouched and the return is `Ok(())` — this also pins that `provision_or_touch_account` under `AuthCtx::internal()` takes the anonymous path. HONEST LIMIT (red-team F6): the skip-path test cannot distinguish "skipped because a sibling session exists" from "always skips" — a bare-`return` body passes it; the fires-when-it-should direction rests on the frozen-body pin (X4) and the mutant sweep (X6, mutant M12 added for exactly this). State that in ADR-0245.

**A3. Simplify: drop the `excluding` parameter.** `on_disconnect` deletes its own row BEFORE asking, so the remaining rows already exclude the leaving connection; `excluding` only matters if the delete is skipped while the own row exists, which cannot happen (the delete precedes the read). Replace `live_connection_count(ctx, me, excluding) -> usize` with `has_live_session(ctx, identity) -> bool` = `ctx.db.player_session().identity().filter(identity).next().is_some()` — the oracle is the return value. Executed tests shrink to three: rows-for-me → true; no rows → false; rows only for a stranger → false. Mutant M4 becomes "always false", M5 "always true". Also acceptable for `open_player_session`: `let _ = ctx.db.player_session().try_insert(PlayerSession{..})` (one syscall, no delete verb in a frozen body) instead of delete-before-insert — either is safe; the implementer picks one and the freeze pin pins it.

**A4. Simplify: cut two redundant pins.** `rb73_wiring_cascade_erases_sessions` duplicates `m22s3b_cascade_covers_manifest` (which already forces every Erase table to be reachable from the reaper) — cut. `rb73_schema_session_table_is_private_and_keyed` is redundant IF `evals/baselines/table-schemas.json` records pk/index attributes for the table (verify when regenerating; if it only records columns+visibility, keep the Rust pin for the key shape).

**A5. Freeze-pin extraction anchors (red-team F7).** Every `rb73_wiring_*` pin must anchor on the full signature line (`fn on_connect(ctx: &ReducerContext) -> Result<(), String> {`, `fn on_disconnect(ctx: &ReducerContext) {`, `#[spacetimedb::table(accessor = player_session)]` + `pub struct PlayerSession {`) via the existing `stripped_for_scan`/`extract_squashed_fn_body` helpers, assert declaration count == 1 FIRST, and ban `#[cfg` within the pinned statement window — the decoy-twin / cfg-attr / doc-comment-copy bypass classes measured on earlier slices.

**A6. Rejected-connect rollback (red-team F5) — VERIFIED, cite it.** `crates/core/src/host/module_host.rs:721-798` (v2.8.1) `call_identity_connected`: the `st_client` insert (:743-750) and the `client_connected` reducer call (:753-769, `call_reducer(tx, params)` handed the SAME `MutTxId`) share ONE transaction that commits at most once (:775-784 comment); `ReducerOutcome::Failed` maps to `Err(ClientConnectedError::Rejected)` (:789) and the transaction is never committed (the actor's `call_reducer_with_tx` rolls back a failed reducer; the scopeguard at :736-742 rolls back on a crash), so `st_client` stays untouched — the doc comment at :2100-2111 states exactly this contract; `with_connection` (database.rs) then bails BEFORE `fut` and never calls `call_identity_disconnected`. So `open_player_session`'s insert rolls back together with a bad-audience `Err` from `provision_or_touch_account` — no leaked row, no storage DoS. Add an executed test if cheap (force the Err path natively is NOT possible: `AuthCtx::internal()` has no JWT, so the anonymous branch is the only reachable one — record as a cited platform fact instead of a test).

**A7. Severed-socket bound (red-team F4) — VERIFIED, cite it.** `crates/client-api/src/routes/subscribe.rs:419-483` (v2.8.1) `WebSocketOptions`: `ping_interval` 15 s, `idle_timeout` 30 s ("a connection is considered idle if no data is received nor sent, including Ping/Pong"; the idle timer closes it), `close_handshake_timeout` 250 ms. A WS that dies without a close frame is closed by the host within ~30 s and its `client_disconnected` fires. So a stale row from a severed socket lives ≤30 s + host detection; a stale row from a crashed host lives until relaunch replay.

**A8. Residuals to NAME in ADR-0245 (red-team F1-F3).**
- `R-rb-73-PVP-HOLD` — a losing PvP player can hold a second live connection so the game tab's drop is not last-out and `forfeit_on_disconnect` does not fire; bounded to one turn by the scheduled `pvp_deadline_reaper` (`pvp.rs:1328-1382`, `PVP_TURN_DEADLINE_MS` = 60 s at `pvp.rs:50`), which is connection-independent. Accepted.
- `R-rb-73-WILD-HOLD` — no reaper covers wild `battle`/`battle_wild` rows (`battle.rs:1451-1453` says so); `resolve_wild_battle_on_disconnect` is the only resolver, so a held second connection stalls a wild battle. PRE-EXISTING (today: never disconnect + never move stalls it identically); the fix changes only the mechanism. Accepted, disclosed; a wild-battle idle reaper is a separate slice.
- `R-rb-73-TOKEN-WEDGE` — a stolen-token holder can open a LIVE WS as the victim and keep it alive (answering pings) so the victim's own disconnects never run cleanup: trades/challenges fall to their TTL reapers, PvP to the 60 s deadline, but wild battles (above) and the `player`/`character`/`player_conversation` presence rows have no independent backstop while the attacker's socket lives. This is the directional inverse of the defect (suppress vs force) and is bounded by the attacker keeping a live socket open (30 s idle close). Accepted for this slice with the mitigation path named: `connected_at_ms` tail column + an idle-session reaper (both additive) if it ever matters in practice.
- `R-rb-73-NOEXEC` — the `Some(conn)` branches of both hooks (own-row insert/delete) execute only under a real host; killed by source-freeze pins + the mutant sweep + X8's live proof.
- `R-rb-73-HOSTWRITES` — modelling `datastore_delete_by_index_scan_point_bsatn` behind an opt-in `Handle::allow_deletes()` in `native_host_tests.rs` would make the own-row delete executable; deferred (YAGNI here; the rb-72/41/46/47 abort-wall kills must stay byte-identical).

**A9. REKEY_MANIFEST reason must be truthful (reviewer MAJOR 3).** `'player_session.identity': { policy: 'EXEMPT', reason: 'per-connection presence bookkeeping keyed by the host-minted ConnectionId; a row belongs to the socket that opened it, not to the account, and the claimed identity opens its own row on its next connect. Honest limit: a row the guest opened survives the claim until that socket closes (<=30 s after a severed socket, or the next module launch replay), briefly referencing the retired guest identity.' }`. Mirror the `export_bundle.owner_identity` precedent's tone (guest-claim-integrity.eval.mjs:1936-1951).

**A10. Insertion point for the 14th cascade call (reviewer MINOR 2).** `crate::erase_player_sessions(ctx, args.account_identity);` goes immediately AFTER `crate::erase_character_rows(ctx, args.account_identity);` (accounts.rs:1056) and BEFORE `anonymize_display_names` — presence bookkeeping erases with the presence rows; ADR-0228 D2's step list gains "6e erase player_session rows" beside 6d. The frozen reaper literal at accounts_tests.rs:7317 ("thirteen delegated calls") and `m22s6_cascade_chain` (:11574) gain the matching entry.

**A11. Erase vs NotOwned, final.** Keep `Erase` (privacy-correct: the row names a live identity+connection of a subject whose account is being tombstoned; erasing it also makes that subject's next drop last-out, which is right for a deleted account). If the supervisor's re-serialization excludes `accounts.rs`, the `NotOwned` + frozen-five fallback stands, argued in ADR-0245 as a deliberate bounded retention (≤ socket lifetime).

**A12. Gates (authoritative in `memory/projects/gates/rb-73.gates.md`, X1-X9, all `EVIDENCE: pending`).** Never pin `0 skipped` under a `cargo nextest -E` filter — nextest reports FILTERED-OUT tests as skipped (rb-68 note); the pinned `N tests run: N passed` count is what catches an `#[ignore]`. X7/X9 use exit-code markers (`node evals/run.mjs >/dev/null 2>&1; echo RB73-EVALS-EXIT=$?`, `just ci >/dev/null 2>&1; echo RB73-CI-EXIT=$?`) because a pass/fail alternation EXPECT is rejected by `mr-gates lint`. Run `mr-gates check` FROM the slice worktree (cwd-relative) with the project toolchain on PATH.

**A13. Tester handoff (2026-09-11, opus, sandboxed) — the literals the specialist MUST match.**
- `on_connect` squashed body: `letjwt=ctx.sender_auth().has_jwt();open_player_session(ctx);if!jwt{returnOk(());}accounts::provision_or_touch_account(ctx)`.
- `on_disconnect` squashed body: `letme=ctx.sender();letleaving=ctx.connection_id();ifletSome(conn)=leaving{ctx.db.player_session().connection_id().delete(conn);}ifhas_live_session(ctx,me){return;}resolve_all_live_interactions(ctx,me);ctx.db.player_conversation().owner_identity().delete(me);ifletSome(p)=ctx.db.player().identity().find(me){ctx.db.character().entity_id().delete(p.entity_id);ctx.db.player().identity().delete(me);}` — variable names `me`/`leaving`/`conn` and the separate `let leaving` statement are load-bearing; calls are unqualified (`open_player_session(ctx)`, `has_live_session(ctx, me)`).
- schema.rs: `#[spacetimedb::table(accessor = player_session)]` IMMEDIATELY followed by `pub struct PlayerSession {` (any `#[derive]` goes ABOVE the table attribute); body exactly `#[primary_key] pub connection_id: ConnectionId, #[index(btree)] pub identity: Identity,` with `ConnectionId` spelled UNQUALIFIED (schema.rs needs `use spacetimedb::{ConnectionId, Identity};`) and the trailing comma.
- `open_player_session` is NOT exact-pinned: declared exactly once; body STARTS with `let Some(conn) = ctx.connection_id() else { return; };`; zero `Err(`/`accounts::`/`unwrap(`/`expect(`/`panic!(`/`ctx.db.player()`; ≥1 `ctx.db.` site and every one is `player_session()` (delete-before-insert or `try_insert` both satisfy it).
- `fn has_live_session(` declared exactly once in lib.rs (a `#[cfg(test)]` twin is the bypass this kills); `fn on_connect(`/`fn on_disconnect(` declared exactly once; no `#[cfg` token inside either pinned body.
- Executed tests: `rb73_sessions_no_rows_means_no_session` reaches the empty state by seed→PRE→remove (never by not seeding); `rb73_sessions_stranger_rows_are_not_mine` asserts a discriminating pair (stranger→true, me→false) over two stranger rows; `rb73_exec_on_connect_none_branch_writes_nothing` proves "only readable row" as count-for-sender==1 and a probe identity `[3u8;32]`==0 (whole-table scans are unmodelled). Connection ids: `0x5e55` for the exec-disconnect sibling row, `0x5e55_0001..0004` elsewhere.
- Ledger arithmetic: X2 = 3 (`rb73_sessions_`), X3 = 2 (`rb73_exec_`), X4 = 4 (`rb73_wiring_|rb73_schema_`) — filled.
