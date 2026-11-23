# Tester brief — Monster Realm slice ts-6b-3 (economy debits and one-time rewards)

You write the gating tests for this slice (TDD red phase). You do NOT implement anything: edit only
the five test files named under Contracts. You have no shell; the orchestrator compiles and runs
your tests and proves each one fails on the real defect, so write code that compiles against the
contracts below exactly as stated.

Worktree (write here, absolute paths only):
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ts-6b-3`

Read first:
- Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-trade-sessions.spec.md` lines 1220-1285.
- Verification rules: `/home/mdrewt/.claude/harness/standards/testing-tdd.md` (behaviour tests in the
  language's own runner; never read source text; no tests about tests; assert domain values).
- The code under test in the worktree's `server-module/src/`: `inventory.rs`, `economy.rs`,
  `npc.rs`, `raising.rs` (lines 120-405, 640-700), `trading_session.rs` (lines 128-245),
  `guards.rs` (lines 330-440: what a trade locks).
- The test host: `server-module/src/native_host_tests.rs` (module doc, `Fixture`, `Handle`,
  `writes_to`, `reset_writes`, `run_as`, `run_as_at`). Two facts decide how you assert:
  1. The host has NO transaction rollback. A refusal must be asserted as "refused and nothing
     written": compare a byte snapshot of every table the call could touch, before and after, and
     where the claim is "no write at all" also assert `fx.writes_to("<table>") == 0` after
     `fx.reset_writes()`.
  2. `fx.writes_to("inventory")` counts insert/update/delete syscalls. That is how "one write, not
     one per unit" is observed.
  3. A read over an index no test registered returns no rows. A test that claims "nothing is in
     trade" proves nothing unless the trade tables are registered; a test that needs a lock must
     seed a real `trade_session` or `trade_offer` row under the indexes `guards::sessions_of` /
     `offers_of` read (`trade_session` by `opener` and `partner`; `trade_offer` by `initiator` and
     `counterparty`).
- Fixture exemplars to copy from (same files you edit): `economy_tests.rs` `ec_world` / `EcWorld`
  (lines 609-861) and `buy_and_sell_are_refused_away_from_a_shop_npc_and_accepted_beside_it`;
  `raising_tests.rs` `mod nh` `world` / `heal_world` (lines 2177-2470, 2930-3055) and
  `mod heal_currency` (3586-3688); `npc_tests.rs` `nh_quest_complete_grants_exactly_the_content_currency_reward`
  (898-999), `mod nh_dialogue_security` (1269-1580) and `mod ctl16_battle_guard` (1580-2039);
  `trading_session_tests.rs` `world` and `ts4_apply_swap_deletes_a_drained_stack_row_and_leaves_a_bystander_untouched`
  (lines 136-500), plus wherever that file builds a confirmed `TradeSession` row.

## What changes (the behaviour your tests pin)

1. **One item debit.** A new `inventory::consume_n` removes `qty` units from one owner's stack of one
   item with one lookup and one write. `economy::sell`, `raising::heal_party` (its item cost) and
   `trading_session::apply_swap` (its item debits) call it instead of looping `consume_one`;
   `consume_one` is `consume_n(.., 1)`.
2. **Heal cost item locked by a trade.** `heal_party` refuses, before any write, when the caller's
   stack covers the item cost but a trade lock (a confirmed session side, or a legacy offer) leaves
   too little of it free. Today it heals and consumes the locked item.
3. **Shortfall is not "in a trade".** `buy`, `sell`, the heal currency cost
   (`raising::evaluate_heal_currency`), `train` and `consume_crystalized_essence` say a plain
   shortfall when the request exceeds the RAW holding, and name an active trade ONLY when the raw
   holding covers the request and the part not locked in trades does not. Today a plain shortfall
   gets the active-trade text.
4. **Rewards are refused, never clamped.** A quest-completion reward or a dialogue `GrantItem` that
   would push a stack past `game_core::MAX_ITEM_STACK` or the balance past `game_core::MAX_BALANCE`
   refuses the whole call: the quest stays active, the dialogue does not advance, no stack, wallet,
   quest, dialogue-state or conversation row changes. The check covers the WHOLE reward of the call
   (several grants of one item sum; several quests completing in one trigger sum). Today
   `grant_item` / `grant_currency` saturate at the cap and the quest is marked done.

## Contracts

Test files and Rust module paths (each file is attached with `#[path]` from its code file, so
`use super::*` reaches private items of that module):

| file (under `server-module/src/`) | module path | notes |
|---|---|---|
| `inventory_tests.rs` | `inventory::inventory_tests` | uses absolute `crate::` paths today |
| `economy_tests.rs` | `economy::economy_tests` | top level has `use super::*` |
| `raising_tests.rs` | `raising::raising_tests`, submodules `nh` and `heal_currency` | |
| `npc_tests.rs` | `npc::npc_tests` | top level has `use super::*` |
| `trading_session_tests.rs` | `trading_session::trading_session_tests` | |

Signatures the implementation will have (write against these exactly):

```rust
// inventory.rs
pub(crate) const ERR_NOT_ENOUGH_ITEM: &str = "not enough of that item";
pub(crate) fn item_count(ctx: &ReducerContext, owner: Identity, item_id: u32) -> u32; // 0 with no stack
pub(crate) fn consume_n(ctx: &ReducerContext, owner: Identity, item_id: u32, qty: u32) -> Result<(), String>;
pub(crate) fn consume_one(ctx: &ReducerContext, owner: Identity, item_id: u32) -> Result<(), String>; // unchanged signature

// economy.rs
pub(crate) const ERR_NOT_ENOUGH_CURRENCY: &str = "not enough currency";
pub(crate) const ERR_CURRENCY_IN_TRADE: &str = "currency is in an active trade";
pub(crate) const ERR_ITEM_IN_TRADE: &str = "item is in an active trade";
pub(crate) fn check_currency_spend(want: u64, balance: u64, escrowed: u64) -> Result<(), String>;
pub(crate) fn check_item_spend(want: u32, count: u32, escrowed: u32) -> Result<(), String>;
// reducers, signatures unchanged: buy(ctx, shop_id, item_id, qty), sell(ctx, item_id, qty)

// raising.rs — signatures unchanged
pub(crate) fn evaluate_heal_currency(defs: &[game_core::HealLocationDef], location_id: u32,
    read_balance_and_escrow: impl FnOnce() -> (u64, u64)) -> Result<Option<u64>, String>;
// reducers: heal_party(ctx, location_id), train(ctx, monster_id, food_item_id),
//           consume_crystalized_essence(ctx, monster_id, item_id)

// trading_session.rs — signature unchanged
pub(crate) fn apply_swap(ctx: &ReducerContext, plan: &SwapPlan, initiator: Identity,
    counterparty: Identity, dest_slot: impl Fn(u64) -> u8) -> Result<(), String>;

// npc.rs (private; reach them through `use super::*`)
fn apply_effects_to_db(ctx: &ReducerContext, owner: Identity, state: &PlayerDialogueState,
    effects: &[DialogueEffect]) -> Result<(), String>;
fn apply_quest_trigger(ctx: &ReducerContext, owner: Identity, event: &TriggerEvent,
    state: &mut PlayerDialogueState,
    quest_defs: Result<&[game_core::QuestDef], String>) -> Result<(), String>;
fn talk_with_content(ctx: &ReducerContext, npc_entity_id: u64,
    trees: Result<&[game_core::DialogueTree], String>) -> Result<(), String>;
fn advance_dialogue_with_content(ctx: &ReducerContext, choice_idx: u32,
    trees: Result<&[game_core::DialogueTree], String>) -> Result<(), String>;
// reducers, signatures unchanged: talk(ctx, npc_entity_id), advance_dialogue(ctx, choice_idx),
// dismiss_dialogue(ctx). `talk` / `advance_dialogue` call the `_with_content` function with the
// shipped trees; `talk` passes the shipped quest definitions to `apply_quest_trigger`.
```

Behaviour contracts:

- `consume_n`: `qty == 0` → `Ok(())`, no write. No stack row → `Err("item not in inventory")`, no
  write. A row with `count == 0` → that row is deleted and `Err("item count is zero")` (checked
  BEFORE the shortfall, for any `qty >= 1`). `count < qty` → `Err(ERR_NOT_ENOUGH_ITEM)`, the row
  byte-identical, no write. `count == qty` → the row is deleted. `count > qty` → the row's count is
  `count - qty`. A successful call makes exactly ONE `inventory` write whatever `qty` is, and
  touches only the `(owner, item_id)` stack.
- Spend rule (`check_currency_spend`, `check_item_spend`): `want > held` → the shortfall text
  (`ERR_NOT_ENOUGH_CURRENCY` / `ERR_NOT_ENOUGH_ITEM`), whatever is locked; else
  `want > held - locked` (saturating) → the active-trade text (`ERR_CURRENCY_IN_TRADE` /
  `ERR_ITEM_IN_TRADE`); else `Ok(())`. `want == held - locked` is allowed; `want == 0` is `Ok`.
- `buy`: funds short of the server total → `ERR_NOT_ENOUGH_CURRENCY`; covered but locked →
  `ERR_CURRENCY_IN_TRADE`. `sell`: more than the raw stack (a missing stack counts 0) →
  `ERR_NOT_ENOUGH_ITEM`; covered but locked → `ERR_ITEM_IN_TRADE`. Each before any write; the
  position of these refusals among `buy`/`sell`'s other refusals is unchanged.
- `evaluate_heal_currency`: a priced location with `cost > balance` → `ERR_NOT_ENOUGH_CURRENCY`;
  `cost <= balance` but `cost > balance - escrowed` → `ERR_CURRENCY_IN_TRADE`.
- `heal_party` with an item cost, after the cooldown check and before any write: the currency cost
  is decided first (as above); then, if the caller's stack covers `cost_qty` but a trade lock
  leaves less than `cost_qty` free → `Err(ERR_ITEM_IN_TRADE)`; a stack that does not cover
  `cost_qty` is refused by `consume_n` itself with ITS texts (`"item not in inventory"` for no
  stack — existing tests pin that and must stay unedited — or `ERR_NOT_ENOUGH_ITEM` for a short
  stack), also before any write. On success the item cost is taken in one `inventory` write.
  `cost_qty == free` (boundary) is admitted. A session side the caller has NOT confirmed locks nothing.
- `train` and `consume_crystalized_essence`: no stack of the item at all → `ERR_NOT_ENOUGH_ITEM`;
  a stack fully held by a trade → `ERR_ITEM_IN_TRADE` (unchanged).
- Rewards: the refusal text for a stack cap is
  `game_core::check_item_headroom(count, qty, item_id).unwrap_err().to_string()` and for the
  balance cap `game_core::check_currency_headroom(balance, amount).unwrap_err().to_string()`
  (compute the expected text from game-core as `nh_buy_refuses_before_writing_and_charges_the_server_price`
  does). When several caps are exceeded at once the call is refused with one of those texts; do not
  pin which. Counts are the RAW stack count and RAW balance (a trade lock does not make room).
  Exact fill to a cap is admitted. A `GrantItem` of quantity 0 grants nothing and never refuses.
  - `apply_effects_to_db`: sums every `GrantItem` in `effects` per item; over a cap → `Err`, no
    write of any kind (no `player_quest` row from a `StartQuest` in the same list either).
  - `apply_quest_trigger`: `quest_defs` is `Err(_)` → `Ok(())`, nothing written, `*state`
    unchanged (the load error is logged, never a refusal). A `player_quest` row whose id is not in
    `quest_defs` is skipped, never a refusal. Otherwise every active quest of `owner` is processed
    in row order exactly as today; if the summed reward of every quest completing in this call does
    not fit → `Err`, NO write (not even another quest's step advance) and `*state` unchanged. On
    `Ok`, behaviour is today's: completed rows deleted, steps advanced, rewards credited exactly,
    `state.active_quests` / `done_quests` updated, and a later quest whose step condition reads an
    earlier completion of the same call still sees it.
  - `talk_with_content` / `talk`: a refused reward returns `Err`. When the entry node has no
    DB-side auto effect (no `StartQuest`, no `GrantItem`), a refused `talk` writes NOTHING: no
    conversation row, no dialogue-state row, no quest, stack or wallet change. (When the entry node
    itself granted or started something and the Talk trigger's reward is then refused, production
    relies on the transaction abort; the host cannot show that, so assert only the `Err` there if
    you cover it at all.) On success the quest-completion acknowledgement is unchanged: after the
    call the completed `player_quest` row is gone AND the caller's `player_conversation` row exists.
  - `advance_dialogue_with_content` / `advance_dialogue`: a refused reward returns `Err` before any
    write: the conversation row is byte-identical (same node), no dialogue-state row is written, no
    quest row, stack or wallet change; `dismiss_dialogue` afterwards still removes the conversation.

## Required tests (use these exact names, at these module paths — the acceptance ledger runs them by name)

`inventory::inventory_tests` (top level):
- `consume_n_removes_the_quantity_deletes_a_drained_stack_and_rejects_a_shortfall_unchanged`
- `consume_n_writes_the_stack_once_whatever_the_quantity` (also: `qty == 0` writes nothing; only
  the asked `(owner, item)` stack moves, with a stranger's stack of the same item and the owner's
  stack of another item present)
- `consume_one_deletes_an_empty_stack_row_and_refuses` (a `count == 0` row: deleted, exactly
  `"item count is zero"`; via `consume_one` and via `consume_n` with `qty > 1`; no stack →
  exactly `"item not in inventory"`, no row created)

`economy::economy_tests` (top level):
- `sell_debits_a_multi_unit_stack_in_one_inventory_write` (qty >= 3; also a refused over-sell
  leaves the stack untouched and makes no inventory write)
- `buy_beyond_the_balance_with_nothing_in_trade_says_not_enough_currency`
- `sell_beyond_the_stack_with_nothing_in_trade_says_not_enough_of_that_item` (a short stack AND no
  stack at all)
- `a_spend_names_a_trade_only_when_the_raw_holding_covers_it` (the rule matrix on both pure
  functions AND through `buy` and `sell` with a REAL lock row seeded: held 9 / locked 5 → want 10
  is the shortfall, want 5 is the trade text, want 4 is admitted; `locked > held`; boundaries)

`raising::raising_tests::nh`:
- `heal_party_refuses_a_cost_item_locked_by_a_confirmed_trade_session` (store byte-identical and no
  write; controls: the same session unconfirmed → healed; lock leaving exactly `cost_qty` free →
  healed; a legacy `trade_offer` listing the item locks it too; assert the wallet/stack/monsters/
  cooldown are untouched on the refusal)
- `heal_party_takes_a_multi_unit_item_cost_in_one_inventory_write` (`cost_qty >= 3`)
- `heal_party_short_of_the_cost_item_with_nothing_in_trade_gets_a_shortfall_reason` (stack 1, cost
  2 → `ERR_NOT_ENOUGH_ITEM`, stack untouched, no write; and stack 1, cost 2, with the 1 locked →
  still the shortfall, never the trade text)
- `train_and_essence_without_the_item_say_not_enough_of_that_item`

`raising::raising_tests::heal_currency`:
- `heal_cost_beyond_the_balance_with_nothing_in_trade_says_not_enough_currency` (and: covered but
  locked → the trade text; `escrowed > balance` with `cost > balance` → the shortfall)

`npc::npc_tests` (top level):
- `quest_completion_at_a_full_stack_is_refused_and_the_quest_stays_active` (through
  `apply_quest_trigger` with your own `QuestDef` carrying an item reward: stack at
  `MAX_ITEM_STACK` → `Err`, the `player_quest` row, stacks, wallet and `state` unchanged, no write;
  then with room the same call completes and credits exactly — the quest stayed completable)
- `a_dialogue_reward_at_a_full_stack_is_refused_and_the_dialogue_does_not_advance` (through
  `advance_dialogue_with_content` with your own tree whose choice carries `GrantItem` and a
  `next_node`; no write to `player_conversation`, `player_dialogue_state`, `player_quest`,
  `inventory`; then `dismiss_dialogue` clears the row; then with room the same choice advances and
  grants exactly)
- `a_reward_is_checked_against_the_caps_as_a_whole` (two `GrantItem` of one item that each fit and
  together do not → refused; two quests completing in one trigger whose item rewards / currency
  rewards together do not fit → refused, neither completes; an effect-list grant followed by a
  quest reward of the same item (call `apply_effects_to_db` then `apply_quest_trigger`) sums;
  exact fill admitted; a stack already at the cap with a zero-quantity grant is `Ok` and writes
  nothing; a currency reward of `u64::MAX`, and two that sum past `u64::MAX`, are refused, never
  wrapped or clamped)
- `a_refused_quest_reward_advances_no_other_quest` (quest A would step-advance, quest B's
  completion is refused, in both row orders: A's `step_index` unchanged and
  `writes_to("player_quest") == 0`; and the success twin: quest B's step condition requires quest A
  done, A's row first, both complete in one call as today)
- `talk_refuses_a_reward_over_the_cap_before_any_write` (through the `talk` reducer with shipped
  content: NPC `npc_id: "elder_oak"`, tree `elder_oak_talk`, an active `quest_001` row, balance
  `MAX_BALANCE - reward + 1` → `Err`, zero writes on `player_conversation`,
  `player_dialogue_state`, `player_quest`, `player_wallet`, `inventory`; balance
  `MAX_BALANCE - reward` → `Ok`, balance exactly `MAX_BALANCE`, quest row gone, conversation row
  present; and through `talk_with_content` with your own tree whose entry node auto-grants an item
  onto a full stack → `Err`, zero writes)
- `missing_quest_definitions_refuse_nothing` (`quest_defs` `Err` → `Ok`, nothing written; a row
  with an unknown quest id beside a completable one → the unknown is skipped, the other completes)

`trading_session::trading_session_tests`:
- `apply_swap_debits_each_item_stack_in_one_write_and_refuses_a_shortfall_unchanged` (a multi-unit
  item swap makes one `inventory` write per debited stack and one per credited stack; a plan that
  debits more than a side holds → `Err` with that side's stack byte-identical)

Add further tests only where a contract line above has no assertion.

## Existing tests you must edit (and only these edits)

These five assertions encode the defect this slice fixes; re-pin each to the new contract and keep
everything else in the test as it is:
- `economy_tests.rs` `buy_and_sell_are_refused_away_from_a_shop_npc_and_accepted_beside_it`:
  "9 in the wallet for a 10 purchase" → `"not enough currency"`; "selling one more than held" →
  `"not enough of that item"`. (The two escrow rows next to them keep the active-trade text.)
- `raising_tests.rs` `heal_currency::a_priced_location_consults_the_wallet_and_rejects_when_broke`
  (balance 0, escrow 0) and `heal_currency::exactly_the_available_balance_is_affordable_one_more_is_not`
  (balance 49, escrow 0) → the shortfall text. The other `heal_currency` tests keep `ESCROW_ERR`.
- `raising_tests.rs` `nh::nh_train_refusals_never_burn_food`, row "only a stranger owns the food" →
  `"not enough of that item"`.
- `npc_tests.rs` `nh_quest_complete_grants_exactly_the_content_currency_reward`: its two
  `apply_quest_trigger` calls take the new fifth argument (the shipped definitions, e.g.
  `Ok(defs.as_slice())`) and assert the returned `Ok(())`. Fix stale comments in these files that
  describe the old texts or the old signature when you touch the lines they sit on.

Do NOT edit, and keep passing as they are: `nh::nh_heal_party_refusals_write_nothing`,
`nh::heal_party_is_refused_off_the_heal_tile`, `nh::nh_heal_party_heals_only_the_callers_party`,
`nh_sell_refuses_before_writing_and_credits_the_server_price`,
`nh_buy_refuses_before_writing_and_charges_the_server_price`,
`ts4_apply_swap_deletes_a_drained_stack_row_and_leaves_a_bystander_untouched`, and everything else.

## Style and limits

- Follow the surrounding files: doc comment per test saying what it proves and a `kills:` line
  naming the wrong implementations it catches; literals as oracles; no test-only production code.
- Comments describe current behaviour only (no "previously", no slice ids as history, no ADR numbers).
- `cargo clippy --all-targets -- -D warnings` runs on test code: no unused imports/variables, no
  `unwrap` on `Result` where the file uses `expect`, handle every `#[must_use]` result.
- rustfmt formatting (the orchestrator runs `cargo fmt`).
- Do not add `#[ignore]`, do not weaken or delete any assertion beyond the five edits above.

## Report back

List every test you added (module path + name), every existing assertion you changed, any
contract line you could not test and why, and anything in the contracts that looks wrong or
untestable (do not work around it silently).
