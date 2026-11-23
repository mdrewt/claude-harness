# Gates: ts-6b-2

Spec: M-trade-sessions.spec.md#ts-6b-2
Seed: a7b865b228d5f65d
Seeded: 2026-11-13T16:12:59Z
Repo: project
Scope: M-trade-sessions slice ts-6b-2 (type: feature, tier: hard, security-privacy, game repo) per specs/monster-realm-v2/M-trade-sessions.spec.md §ts-6b-2 and its Fix-batch contract: shop and heal reach — the server checks where the caller stands. Reopens guards.rs/pvp.rs after ts-6b-1 (merged #758). No table/column/reducer-signature change unless the spec says so. Fan-out siblings in flight: ts-6b-4 (tactics/client main.ts), ts-6b-8 (list views + i18n catalog); ts-6b-2 adds NO i18n message ids (ts-6b-8 owns catalog/messageIds). PR lists the residual ids it closes.
Criteria: 3 seeded, 0 shall-uncaptured
Touches: game-core/src/interact.rs, game-core/src/interact_tests.rs, server-module/src/economy.rs, server-module/src/economy_tests.rs, server-module/src/raising.rs, server-module/src/raising_tests.rs, docs/DECISIONS.md, server-module/src/guards.rs, server-module/src/pvp.rs, server-module/src/trading_session.rs, server-module/src/battle_tests.rs, server-module/src/monster_mgmt_tests.rs, server-module/src/trading_tests.rs, client/e2e/recruit.spec.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-2.1: WHEN `buy`, `sell` or `heal_party` is called by a character outside reach of the offering shop NPC or the heal tile, THE SERVER SHALL reject the call with one error string for wrong zone, too far and missing character, before any read of wallet, inventory or cooldown, and SHALL change nothing — closes `R-weekly-review-2026-10-02-F2` (`buy_and_sell_are_refused_away_from_a_shop_npc_and_accepted_beside_it` in `server-module/src/economy_tests.rs`, `heal_party_is_refused_off_the_heal_tile` in `server-module/src/raising_tests.rs`, `within_npc_reach_*` in `game-core/src/interact_tests.rs`).
      CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p game-core -p monster-realm-module --run-ignored all -E 'test(=economy::economy_tests::buy_and_sell_are_refused_away_from_a_shop_npc_and_accepted_beside_it) + test(=raising::raising_tests::nh::heal_party_is_refused_off_the_heal_tile) + test(/^interact_tests::within_npc_reach_/)' 2>&1
      EXPECT: / (\d+) tests run: \1 passed/
      EVIDENCE: pending

- [ ] ts-6b-2.2: WHEN `open_trade_session` or `challenge_pvp` judges range, THE SERVER SHALL use one shared guard that treats a missing character as out of range — closes `R-ts-5-NOTE1BC25F` (`ts2_open_out_of_range_is_one_string_for_zone_distance_and_missing_characters` in `server-module/src/trading_session_tests.rs` and `ts5_challenge_out_of_range_is_one_string_for_zone_distance_and_missing_characters` in `server-module/src/pvp_tests.rs` pass unedited).
      CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=guards::guards_tests::characters_in_interact_range_treats_a_missing_player_or_character_as_out_of_range) + test(=trading_session::trading_session_tests::ts2_open_out_of_range_is_one_string_for_zone_distance_and_missing_characters) + test(=pvp::pvp_tests::ts5_challenge_out_of_range_is_one_string_for_zone_distance_and_missing_characters)' 2>&1
      EXPECT: / 3 tests run: 3 passed/
      EVIDENCE: pending

- [ ] ts-6b-2.3: THE existing shop, heal, recruit, trade and PvP flows SHALL pass with their characters in reach (`cargo nextest run -p monster-realm-module`, `just e2e`).
      CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module 2>&1 | grep -cE " ([0-9]+) tests run: \1 passed" && MR_E2E_SHARDS=8 MR_E2E_PORT=5460 VITE_STDB_DB=mr-ts6b2 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH just e2e-shards 2>&1 | grep -c "shard [0-9]/8 ok"
      EXPECT: /^8$/
      EVIDENCE: pending
