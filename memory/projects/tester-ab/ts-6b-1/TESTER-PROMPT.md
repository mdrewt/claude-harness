# Tester brief — ts-6b-1 (red phase: you write the gating tests; you implement nothing)

Worktree (every path below is relative to it):
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ts-6b-1`

You have Read, Grep, Glob, Write and Edit — no shell. The orchestrator compiles and runs what you
write and proves each new test fails on today's code for the reason you state. Write Rust that
compiles against the code AS IT IS NOW (no production signature changes in this slice) and is
rustfmt-clean (default rustfmt settings).

Verification rules (binding): `/home/mdrewt/projects/ai-apps/claude-harness/standards/testing-tdd.md`.
In short: tests execute the shipped code and assert what it does; never read a source file as text
(`include_str!`, a scan of `.rs`), never pin comment or doc wording, never write a test whose subject
is another test. Test names lead with the behaviour.

## What this slice fixes (four criteria; you write tests for the first three)

**ts-6b-1.1** — WHEN a guest claim completes, THE SERVER SHALL leave no `battle` or `battle_summary`
row naming the retired guest identity, treating the opponent's side of those rows as the deletion
cascade does.
- Today `accounts::complete_guest_claim` (server-module/src/accounts.rs) re-keys the guest's game
  data, purges its export bundles and consumes the code. It writes nothing to the guest's finished
  battles, so `battle`, `battle_summary` and the per-battle tactical rows keep naming an identity
  that will never play again.
- The fix will run, for the retired GUEST identity, the two helpers the account-deletion cascade
  already runs for a deleted account: `schema::erase_tactical_rows` then `battle::anonymize_battles`
  (see `accounts::account_deletion_reaper`). The intended end state for the guest is therefore the
  cascade's end state for its subject:
  - every `battle` row that named the guest survives with the guest's column(s) holding
    `crate::TOMBSTONE_IDENTITY` and the other side's identity untouched (a practice row, guest on
    both sides, gets both columns swapped; a wild row keeps `crate::WILD_IDENTITY` opposite);
  - every `battle_summary` row that named the guest survives with only its identity column(s)
    rewritten the same way — every telemetry column byte-identical;
  - every per-battle tactical row (`battle_tactical`, `battle_unit`, `battle_queue`,
    `battle_deploy`, `battle_clock`, `battle_secret`, `battle_wild_unit`, `battle_event`) of a
    battle the guest was a side of is gone, the other participant's rows of that battle included;
  - rows of battles the guest was NOT a side of are byte-identical, whoever owns them;
  - the claim's existing effects still hold: the guest's game data (its formation included) arrives
    under the claimer, the code is spent. A refused claim writes nothing.
- The claim is refused while the guest or the claimer is in an `Ongoing` battle (guard 10), so
  every battle of the guest at claim time is terminal.

**ts-6b-1.2** — WHEN `require_not_deleting` refuses a caller, THE SERVER SHALL return
`account deletion requested; this action is unavailable until the deletion is cancelled` for every
gated reducer.
- Today `guards::REJECT_DELETION_GATED` reads `account deletion requested; new trades, battles and
  challenges are unavailable`, which is wrong for move, talk, shop, care and the rest. Every existing
  server test compares against the CONSTANT, so none of them can see the wording. Your test asserts
  the LITERAL from the criterion.
- Two client tests hold the old literal as sample data: `client/src/ui/statusModel.test.ts` (the
  `others` list, ~line 408) and `client/src/main.dialogueEnded.test.ts` (`DELETION_GATED`, ~line
  134). Update both literals to the new text; change nothing else in those files.

**ts-6b-1.3** — WHEN a PvP challenge is accepted, THE SERVER SHALL end any open NPC conversation of
either party in the transaction that starts the battle.
- Today `pvp::accept_challenge` (server-module/src/pvp.rs) leaves both parties'
  `player_conversation` rows in place. `talk` and `advance_dialogue` refuse during a battle, so the
  row is dead, and the client keeps its dialogue frame above the battle while the row exists.
- The fix deletes the `player_conversation` row of the acceptor and of the challenger once the
  tactical battle has started. An accept that is refused starts no battle and must leave both rows
  as they were. A bystander's conversation is never touched.

**ts-6b-1.4** is a runbook edit — no test.

## Contracts

Tests you must write, with exactly these names (the acceptance ledger selects on them):

| Criterion | Test name | File | Rust module path |
|---|---|---|---|
| ts-6b-1.1 | `guest_claim_tombstones_the_guests_terminal_battle_and_summary_rows` | `server-module/src/accounts_tests.rs`, inside `mod acct_nh` | `accounts::accounts_tests::acct_nh` |
| ts-6b-1.2 | `a_mid_grace_caller_gets_the_same_reason_from_move_talk_and_buy` | `server-module/src/guards_tests.rs` | `guards::guards_tests` |
| ts-6b-1.3 | `accept_challenge_ends_both_parties_open_conversations` | `server-module/src/pvp_tests.rs` | `pvp::pvp_tests` |

You may add further tests beside these where a distinct behaviour of a criterion needs its own test
(for example: a refused claim or a refused accept writes nothing). Keep each one behaviour-named, in
the same file and module as its criterion's required test, and list every test you add in your
report with the criterion it belongs to.

Production signatures the tests call (all exist today and do not change):

```rust
// server-module/src/accounts.rs
pub fn start_guest_claim(ctx: &ReducerContext, code: String) -> Result<(), String>;
pub fn complete_guest_claim(ctx: &ReducerContext, code: String) -> Result<(), String>;
// server-module/src/movement.rs
pub fn enqueue_move(ctx: &ReducerContext, input: game_core::MoveInput, seq: u64) -> Result<(), String>;
pub fn set_move(ctx: &ReducerContext, input: game_core::MoveInput, seq: u64) -> Result<(), String>;
// server-module/src/npc.rs
pub fn talk(ctx: &ReducerContext, npc_entity_id: u64) -> Result<(), String>;
// server-module/src/economy.rs
pub fn buy(ctx: &ReducerContext, shop_id: u32, item_id: u32, qty: u32) -> Result<(), String>;
// server-module/src/pvp.rs
pub fn accept_challenge(ctx: &ReducerContext, challenge_id: u64, party_ids: Vec<u64>) -> Result<(), String>;
// server-module/src/lib.rs
pub(crate) const TOMBSTONE_IDENTITY: Identity;  pub(crate) const WILD_IDENTITY: Identity;
// server-module/src/accounts.rs — pure row constructors for account states
new_account_row(identity, issuer: String, now_ms) -> Account; requested_deletion(Account, requested_at_ms) -> Account;
```

Data shapes: `schema::Battle` (`battle_id`, `player_identity`, `opponent_identity`, `state.outcome`,
…), `schema::BattleSummary` (`battle_id`, `player_identity`, `opponent_identity`, telemetry columns),
`schema::PlayerConversation { owner_identity, npc_entity_id: u64, current_node_id: String }`.

The new reason literal, exactly:
`account deletion requested; this action is unavailable until the deletion is cancelled`

## The test host you are writing against (read before writing)

`server-module/src/native_host_tests.rs` is an in-memory model of the SpacetimeDB host. Facts that
decide whether your test runs at all:
- A read through an index no fixture registered returns no rows. An index-point DELETE, an insert,
  an update or a table scan on a table/index the fixture did not register (`writable` / `scannable`)
  ABORTS the whole test process. So every table the code under test may write must be registered by
  the world you use.
- There is no rollback: a reducer that returns `Err` keeps whatever it wrote before returning. That
  is what makes "a refused call writes nothing" observable.
- `Handle::seed` pushes a row (no upsert); `rows()` reads them back; `remove(key)` returns a count.

Fixtures to build on (read them, reuse them, do not duplicate them):
- **accounts** — `accounts_tests.rs`, `mod acct_nh`: `fixture()`, `world(&fx)` (registers every
  index the claim and the cascade touch, the ten tactical tables included), `signed_in`, `code`,
  `player_row`, `battle_row`, `summary_row`, `tactical_row`, `unit_row`, `queue_row`, `deploy_row`,
  `clock_row`, `secret_row`, `wild_unit_row`, `event_row`, `formation_row`,
  `seed_tactical_population`, `per_battle_rows`, `enc` / `encs`. The cascade's own test,
  `deletion_cascade_erases_tactical_rows_by_battle_and_tombstones_summaries_bt7_4` (~line 9851),
  shows the population and the shape of the assertions for the end state described above;
  `guest_claim_moves_the_formation_onto_the_claimer_bt7_4` (~line 10145) shows a claim driven to
  `Ok(())`.
- **guards** — `guards_tests.rs`: `rb128_seed_player`, `rb128_seed_deleting_stranger`, and the
  `rb128_*_refuses_only_a_deletion_gated_caller` tests show how a reducer is called on the native
  host with a mid-grace caller. `talk` and `buy` check `not joined` BEFORE the gate, so the caller
  needs a `player` row; `enqueue_move` / `set_move` gate first. `npc_tests.rs` (~line 647) and
  `economy_tests.rs` (~line 262) show `talk` and `buy` reaching the gate.
- **pvp** — `pvp_tests.rs`: `pv_accept_world(&fx, format)` returns `(PvWorld, PvTacticsWorld)`;
  the tactical world (`tactics_tests::world`) already registers `player_conversation` on
  `owner_identity` as its `conversations` handle. `nh_accept_challenge_is_target_only_and_opens_a_
  tactical_pvp_battle_bt16_1` (~line 1033) drives accepts to refusal and to success.

## One comment to bring up to date

`accounts_tests.rs`, in `acct_rekey_roster_is_total_and_game_data_sees_every_rekeyed_table`: the
comment above `const NOT_REKEYED` (~line 7431) says a finished battle's per-battle rows "belong to
that battle (GC-bound)" and that `battle_summary` is telemetry, as the reason they stay under the
guest. After this slice they do not stay under the guest: the claim erases the tactical rows and
tombstones the guest's side of `battle` and `battle_summary`, as the deletion cascade does. Reword
that comment to state the current behaviour (no history, no slice ids). Do not change the two
rosters or any assertion in that test.

## What to hand back

1. The tests, written into the worktree files named above.
2. A report listing, for each test: its full name, its criterion, and one sentence saying why it
   FAILS on today's code (the specific assertion and the defect it meets).
3. For each test, the wrong implementations it kills (for example: only one of the two helper calls;
   the helpers run before the re-key; the conversation deleted for one party only; the delete placed
   before the battle start).
4. Anything in the existing code or fixtures that contradicts this brief or that you believe is a
   defect — state it as a claim with `path:line`; do not work around it silently.

Do not edit any file other than the three server test files, the two client test files and nothing
else. Do not edit production code. Do not weaken, skip or delete an existing test; if an existing
assertion will become false under the intended behaviour, name it in your report instead of
changing it.
