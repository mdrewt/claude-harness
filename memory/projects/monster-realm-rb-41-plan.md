# rb-41 — plan (REKEY exists-half predicates proven against real DB state)

Slice: rb-41 · residual R-rb-25-X9 (ADR-0222 known-limit 2) · spec
`specs/monster-realm-v2/M-residual-backlog.spec.md#rb-41` · **no new ADR number — ADR-0222 amended in
place** · worktree `.claude/worktrees/rb-41` · branch `feat/rb-41-exists-predicate-real-state-tests`
(forked from origin/master@d5a0aef, remote CI green at that SHA) · baseline
`cargo nextest -p monster-realm-module`: 793/793 · baseline `node evals/run.mjs`: green except one
`account-e2e` WebSocket-reset flake that passed on a standalone re-run · planner: opus, researcher: opus,
2026-09-04.

## The finding that unlocks the slice

`spacetimedb` 2.8.1 `src/lib.rs:1043` exposes `#[doc(hidden)] pub fn ReducerContext::__dummy() -> Self`
(db `Local {}`, sender `Identity::__dummy()`, `AuthCtx::internal()`). The repo's premise "there is NO way
to construct a `ReducerContext` in this crate" (accounts_tests.rs:8, ADR-0225:91, ADR-0226:145,
ADR-0232:15, both native-link stub comments) is STALE. The generated table code bottoms out in
`spacetimedb_bindings_sys::raw` host syscalls that are undefined natively; the crate links today only
because two test files define 10 aborting `#[no_mangle] extern "C"` stubs
(accounts_tests.rs:14294-14330 ×4, privacy_tests.rs:5754-5790 ×6). A REAL in-memory implementation of
those symbols (defined once per binary — so the stubs are REPLACED, not duplicated) lets the SHIPPED
predicates run unchanged against real rows.

## Design (→ ADR-0222 amendment)

**A. `server-module/src/native_host_tests.rs`** (cfg(test) only; wired from lib.rs as
`#[cfg(test)] #[path = "native_host_tests.rs"] mod native_host_tests;` beside `m14_5d_1a_tests`).
The module NAME must end in `tests`: `accounts_tests.rs::m22_declared_mod_names` (:3590-3621) walks every
`mod <name>;` in lib.rs + the 21 domain files and REDs on any non-`tests`-suffixed name without a scanned
`<name>.rs`. The FILE name must end in `_tests.rs`: that suffix is what the `_tests.rs`-exempting evals key
on, and monster-privacy `[SCOPE]` requires the declaring parent to carry `#[cfg(test)]` within 160 chars.
- State: `static HOST: OnceLock<Mutex<Host>>` (locked briefly inside each syscall) + `static
  FIXTURE_LOCK: Mutex<()>` (held for a test's lifetime; `cargo test` shares a process, nextest does not).
  Table/index ids are minted on first lookup and NEVER reset (the generated `table_id()`/`index_id()` are
  memoised per process in a `OnceLock`); only rows/iters reset. Poison recovered via `into_inner`.
- Rows are opaque BSATN bytes stored as `(key_bsatn, row_bsatn)`; every indexed column in scope is an
  `Identity`, so the fixture handle is `table::<R: Serialize>(name, index_name, owner_of: fn(&R) ->
  Identity)`; `seed(&row)` = `bsatn::to_vec` (the same encoder the real insert path uses) + push;
  `remove(owner)` / `clear()` for the "removes it" half. The shim never names a row type or an accessor
  (`player_wallet()` / `PlayerWallet {` are banned outside economy.rs/schema.rs/economy_tests.rs/privacy.rs
  by currency-integrity ACCESSOR_BYPASS, which scans test files too).
- Syscalls: `table_id_from_name` / `index_id_from_name` permissive (mint-or-return; `account_has_game_data`
  touches all six tables in every test while each test registers only its own — an unregistered table has
  no rows; requested index names are recorded so a wrong generated-name guess prints itself);
  `datastore_index_scan_point_bsatn` = byte-equality on the key (BSATN is canonical) → new iter;
  `datastore_table_scan_bsatn` = all rows; `row_iter_bsatn_advance` REAL-HOST protocol (no rows → -1 with
  0 bytes; next row too big → BUFFER_TOO_SMALL (11, via `Errno::code()`) with `*len` = needed; else write
  whole rows that fit and return **-1 on the call that drains the iterator**, 0 only when rows remain —
  `UniqueColumn::find` calls `next()` ONCE and then asserts `is_exhausted()`, which is true only after a -1,
  so a "0 with data, -1 next call" protocol panics every `.find` predicate; reviewer B1, verified by the
  spike); `row_iter_bsatn_close`. The four write syscalls (`insert` / `update` /
  `delete_all_by_eq` / `delete_by_index_scan_point`) stay LOUDLY unmodelled — `panic!` naming the symbol
  (the old stubs used a silent `abort()`), because the tests seed through the handle: this sidesteps the
  auto_inc `unreachable!()` write-back trap, the monster-dual-write pairing scan, and the
  inventory-single-stack "insert only inside `grant_item`" scan — all of which read test files.
- All ten defined as `#[no_mangle] unsafe extern "C" fn` (clippy `not_unsafe_ptr_arg_deref` under
  `-D warnings`), every pointer op under a `// SAFETY:` comment, no `static mut`.

**B. Seven `rb41_*` tests, one per REKEY exists-half predicate, each in the exempt sibling file:**

| predicate | file | seed row |
|---|---|---|
| `wallet_exists` | `economy_tests.rs` (the ONLY wallet-token-exempt test file) | `PlayerWallet { owner_identity, balance }` |
| `profile_exists` | `ranking_tests.rs` (`make_profile` builder :258) | `Profile` |
| `has_heal_cooldown` | `raising_tests.rs` | `HealCooldown { owner_identity, last_heal_at_ms }` |
| `has_items` | NEW `inventory_tests.rs` (wired from inventory.rs) | `Inventory { inv_id: nonzero, .. }` |
| `has_monsters` | NEW `monster_mgmt_tests.rs` (wired from monster_mgmt.rs) | `Monster` via a local ~45-field literal (copy the shape of marshal_tests.rs:152) |
| `has_quest_or_dialogue_state` (quest) | `npc_tests.rs` | `PlayerQuestRow { pq_id: nonzero, .. }` |
| `has_quest_or_dialogue_state` (dialogue) | `npc_tests.rs` | `PlayerDialogueStateRow` |

Body shape (5 steps): empty → predicate false AND `account_has_game_data` false; seed a STRANGER's row →
both still false (kills a "table non-empty" hollow); seed the OWNER's row → both true (this IS the Rust
twin of the six disjuncts — proven as behaviour, not a source pin: deleting a disjunct reds its table's
test); remove the owner's row (stranger's stays) → both false. Identities via
`Identity::from_byte_array([n; 32])`. Every new fn is `rb41_`-prefixed (prefix-free ids; also avoids the
Family-A evals' first-match `extractReducerBody` hijack for names like `grant_item` / `care` / `talk`).

**C. Eval cut (ADR-0224 amendment 1: superseded portion deleted in the SAME slice):** delete the `exists`
half of `[G6/correspondence]` (the "S4 portion": naming-integrity-by-token-presence that the real tests
supersede), the whole `[G6/mirror]` clause + `EXISTS_COVER` (it existed only to excuse monster_pub from
that half), teeth FG75b/n/o/p/q/r, live probes L1 + L5, `monster_rows_present` fixture text, the
mirror-count summary fragment; RE-POINT the ten structural teeth FG75f/g/h/i/j/k/u/v/w/y from exists
helpers to rekey helpers (their legs still serve the surviving half — deleting them would silently unprove
it); re-derive `TEETH_PINNED` from the eval's own report. KEEP `[G6/consumed]` incl. its exists half
(identifier-bounded needle matching — the needle-swap/substring class the residual says stays), the whole
rekey half of correspondence, FG75a/c/d/e/l/m/s/t/x, L2/L3/L4. External consumers verified: rekey-contract-
surface imports only `REKEY_MANIFEST` + `findIdentityColumns`; accounts_tests T9 + privacy_tests read the
file as TEXT anchored on the manifest only; nothing outside the file references TEETH_PINNED / EXISTS_COVER
/ FG75 / liveHalvesVerified.

**D. Docs:** ADR-0222 gains `## Amendment (2026-09-04, rb-41 — residual R-rb-25-X9)` (header block
untouched; no `Amends:`), `just adr-digest` regenerated; ARCHITECTURE.md one paragraph after the rb-25
paragraph (~:132) + "five live-tree borrow proofs" → three.

**Coverage delta the cut creates (reviewer B2 — recorded as a NEW ADR-0222 known limit, not a gate):**
the exists needle is no longer resolved to a declaration, so exists-side correspondence is now
BEHAVIOURAL and covers exactly the six tables with `rb41_*` twins. A REKEY entry added for a seventh
table has an unchecked `exists:` needle until it gets a twin — a reviewer / security-auditor checklist
item per ADR-0224's escape hatch ("a new REKEY manifest entry ships with an `rb41_*` twin"), stated in the
amendment and in the ARCHITECTURE.md clause. Also recorded as limits: the shim's index is caller-supplied
(a green run proves the predicate reads the registered table through the registered index NAME, not that
the index is on the schema-declared column); `requested_indexes()` records only the first lookup per
process (OnceLock memo — reliable under nextest); `Fixture::ctx()` is the only sanctioned route to
`__dummy()` (a direct call bypasses the serialisation lock under plain `cargo test`); `just ci` never
compiles the module for wasm — monster-privacy `[SCOPE]` (cfg(test) on the mod line) is what keeps the
ten `#[no_mangle]` symbols out of the published module, and `just build` is run once as X7 evidence.

## touches-delta (declare in the PR)
`server-module/src/native_host_tests.rs` (new), `server-module/src/lib.rs` (one mod line),
`server-module/src/monster_mgmt.rs` + `inventory.rs` (one cfg(test) mod line each),
`server-module/src/monster_mgmt_tests.rs` + `inventory_tests.rs` (new siblings),
`server-module/src/economy_tests.rs` + `ranking_tests.rs` + `raising_tests.rs` + `npc_tests.rs` (one
`rb41_*` test appended each; siblings of the predicate-owning modules), `server-module/src/
accounts_tests.rs` (stub block deleted; stale "no way to construct" header line corrected — boyscout),
`server-module/src/privacy_tests.rs` (stub block deleted — mechanical relocation; no sibling slice live),
`docs/adr/DIGEST.md` (regenerated by `just adr-digest`). Follow-up flag (outside cap / outside touches):
the "ReducerContext is not constructible" rationale prose also lives at privacy_tests.rs:1019/3819/5003,
accounts_tests.rs:~7493/~8827, ranking_tests.rs:13, content_tests.rs:145 and ADR-0225:91 / 0226:145 /
0227:58 / 0232:15 — named in the ADR-0222 amendment, not edited.

## Order
T0 spike (orchestrator): shim + a throwaway `wallet_exists` drive; prints the requested index names.
T1 tester (opus): the seven tests against the documented shim API (staged outside `.claude/`, copied in).
T2 RED proof (orchestrator): hollow each predicate → its test RED by name → restore → GREEN; recorded in
`memory/projects/gates/rb-41.red-before.md`. T3 eval surgery (orchestrator, eval re-run after each
re-point). T4 doc-keeper + diff fact-check. T5 ledger `mr-gates check`, full `just ci` detached, PR.

## Anti-patterns
guessing TEETH_PINNED · deleting re-pointable teeth · any check-of-a-check · `abort()` for unmodelled
syscalls · wallet tokens outside economy_tests.rs · `.inventory().insert(` / `ctx.db.monster().insert(`
literal anywhere new · `#[spacetimedb::table(` contiguous in a test file · `git checkout -- <dir>` in the
mutation loop · two concurrent `just ci` · backticks in `-m`.
