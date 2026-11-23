# Gates: ts-6b-3
Spec: M-trade-sessions.spec.md#ts-6b-3
Seed: 1b45d867b07409d2
Seeded: 2026-11-13T18:05:54Z
Repo: project
Scope: M-trade-sessions slice ts-6b-3 (type: feature, tier: hard, data-integrity, game repo) per specs/monster-realm-v2/M-trade-sessions.spec.md §ts-6b-3 and its Fix-batch contract: economy debits and one-time rewards. Reopens economy.rs/raising.rs/trading_session.rs after ts-6b-2 (merged #761). Fan-out siblings launched this tick: ts-6b-3 (server economy/inventory/npc), ts-6b-5 (client pointer/controller reach, main.ts), ts-6b-6 (tactical settle/AI tests, marshal, content_cache), tp-5 (harness repo) — all file-disjoint (mr-disjoint SAFE). None of the game-repo siblings adds i18n message ids or tables/columns/reducer signatures unless its spec says so. PR lists the residual ids it closes.
Criteria: 4 seeded, 0 shall-uncaptured
Touches: server-module/src/inventory.rs, server-module/src/inventory_tests.rs, server-module/src/trading_session.rs, server-module/src/economy.rs, server-module/src/raising.rs, server-module/src/raising_tests.rs, server-module/src/economy_tests.rs, server-module/src/npc.rs, server-module/src/npc_tests.rs

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-3.1: WHEN a reducer debits `qty` units of one item from one owner, THE SERVER SHALL remove exactly `qty`, delete a drained stack, and reject a shortfall leaving the stack unchanged, through one primitive that `sell`, `heal_party` and `apply_swap` share — closes `R-ts-2-SWAPCOST` (`consume_n_removes_the_quantity_deletes_a_drained_stack_and_rejects_a_shortfall_unchanged` in `server-module/src/inventory_tests.rs`; the existing sell, heal and swap debit tests pass unedited, `ts4_apply_swap_deletes_a_drained_stack_row_and_leaves_a_bystander_untouched` among them. The write count is not observable from a test; the per-unit loops leaving is read in review).
  CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=inventory::inventory_tests::consume_n_removes_the_quantity_deletes_a_drained_stack_and_rejects_a_shortfall_unchanged) + test(=inventory::inventory_tests::consume_n_writes_the_stack_once_whatever_the_quantity) + test(=inventory::inventory_tests::consume_one_deletes_an_empty_stack_row_and_refuses) + test(=economy::economy_tests::sell_debits_a_multi_unit_stack_in_one_inventory_write) + test(=raising::raising_tests::nh::heal_party_takes_a_multi_unit_item_cost_in_one_inventory_write) + test(=trading_session::trading_session_tests::apply_swap_debits_each_item_stack_in_one_write_and_refuses_a_shortfall_unchanged) + test(=trading_session::trading_session_tests::ts4_apply_swap_deletes_a_drained_stack_row_and_leaves_a_bystander_untouched) + test(=economy::economy_tests::nh_sell_refuses_before_writing_and_credits_the_server_price) + test(=raising::raising_tests::nh::nh_heal_party_heals_only_the_callers_party) + test(=raising::raising_tests::nh::nh_heal_party_refusals_write_nothing)' 2>&1
  EXPECT: / 10 tests run: 10 passed/
  EVIDENCE: pending

- [ ] ts-6b-3.2: IF a heal location's cost item is locked by the caller's confirmed trade side, THEN THE SERVER SHALL reject `heal_party` before any write — closes `R-ts-2-HEALCOSTLOCK` and its duplicate `R-ts-0b-HEALITEMESCROW` (`heal_party_refuses_a_cost_item_locked_by_a_confirmed_trade_session` in `server-module/src/raising_tests.rs`).
  CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=raising::raising_tests::nh::heal_party_refuses_a_cost_item_locked_by_a_confirmed_trade_session)' 2>&1
  EXPECT: / 1 test run: 1 passed/
  EVIDENCE: pending

- [ ] ts-6b-3.3: IF a buy, sell or heal exceeds the caller's raw holding, THEN THE SERVER SHALL reject with a shortfall reason, and SHALL name an active trade only when the raw holding covers the request and the escrow-netted holding does not — closes `R-ctl-7d-CTL7D.4` (`buy_beyond_the_balance_with_nothing_in_trade_says_not_enough_currency` in `server-module/src/economy_tests.rs`, with the sell and heal twins beside it).
  CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=economy::economy_tests::buy_beyond_the_balance_with_nothing_in_trade_says_not_enough_currency) + test(=economy::economy_tests::sell_beyond_the_stack_with_nothing_in_trade_says_not_enough_of_that_item) + test(=economy::economy_tests::a_spend_names_a_trade_only_when_the_raw_holding_covers_it) + test(=raising::raising_tests::heal_currency::heal_cost_beyond_the_balance_with_nothing_in_trade_says_not_enough_currency) + test(=raising::raising_tests::nh::heal_party_short_of_the_cost_item_with_nothing_in_trade_gets_a_shortfall_reason) + test(=raising::raising_tests::nh::train_and_essence_without_the_item_say_not_enough_of_that_item) + test(=economy::economy_tests::buy_and_sell_are_refused_away_from_a_shop_npc_and_accepted_beside_it) + test(=raising::raising_tests::heal_currency::a_priced_location_consults_the_wallet_and_rejects_when_broke) + test(=raising::raising_tests::heal_currency::exactly_the_available_balance_is_affordable_one_more_is_not) + test(=raising::raising_tests::nh::nh_train_refusals_never_burn_food) + test(=trading::trading_tests::nh_escrowed_items_and_currency_shrink_the_spendable_headroom)' 2>&1
  EXPECT: / 11 tests run: 11 passed/
  EVIDENCE: pending

- [ ] ts-6b-3.4: IF a quest or dialogue reward would exceed the receiver's stack or balance cap, THEN THE SERVER SHALL reject the call and leave the quest, dialogue, inventory and wallet state unchanged — closes `R-weekly-review-2026-10-16-F3` (`quest_completion_at_a_full_stack_is_refused_and_the_quest_stays_active` and `a_dialogue_reward_at_a_full_stack_is_refused_and_the_dialogue_does_not_advance` in `server-module/src/npc_tests.rs`).
  CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=npc::npc_tests::quest_completion_at_a_full_stack_is_refused_and_the_quest_stays_active) + test(=npc::npc_tests::a_dialogue_reward_at_a_full_stack_is_refused_and_the_dialogue_does_not_advance) + test(=npc::npc_tests::a_reward_is_checked_against_the_caps_as_a_whole) + test(=npc::npc_tests::a_refused_quest_reward_advances_no_other_quest) + test(=npc::npc_tests::talk_refuses_a_reward_over_the_cap_before_any_write) + test(=npc::npc_tests::missing_quest_definitions_refuse_nothing) + test(=npc::npc_tests::nh_quest_complete_grants_exactly_the_content_currency_reward)' 2>&1
  EXPECT: / 7 tests run: 7 passed/
  EVIDENCE: pending
