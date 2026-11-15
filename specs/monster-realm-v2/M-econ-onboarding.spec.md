# Spec: M-econ-onboarding — a real start for a new player, one tuning pass

**Status:** elaborated 2026-11-14 (from the 2026-10-24 sketch) against game `master` `9fb5bd25`
(after st-7). np-b, a docs-only study (`docs/send-pipeline-depth.md`, `docs/DECISIONS.md`), is the
only slice in flight; no eo- slice edits its record. · **Project:** monster-realm · **Slices:** 2 —
`eo-1`, then `eo-4`. The sketch's `eo-2` and `eo-3` are rulings with no build (below). Anchors are
files and symbols, never line numbers.

**Feedback items:** pt3-2026-10-064 (a new player should start with a few basic items or enough
money to buy some) → `eo-1`; pt3-2026-10-157 (no way to earn money; nothing affordable) → `eo-1`
(the start) + `eo-4` (the tuning pass). Cross-link, not absorbed: pt3-2026-10-145 (the flat
in-battle item AP cost) belongs to `M-battle-tactics`; `eo-4` checks the price side of that rule.
**Absorbed residuals:** R-weekly-review-2026-10-23-F1 (join_game re-grants a starter whenever the
identity owns zero monsters) → `eo-1` (criterion `eo-1.2`, the sketch's EO1.2);
R-weekly-review-2026-10-09-F1 (practice self-battles are an uncapped currency/XP faucet) →
resolved by the M-battle-tactics cutover, no build (the sketch's `eo-2`, see "Rulings with no
build"). `M-trade-sessions.spec.md` routes both here under those ids.

> **Balance stance (operator, 2026-11-12; GDD §7 and §14):** the economy is not a major aspect of
> the game. Tune items, prices and rewards as for a single-player game (Pokémon-style), with
> exceptions only where the official server's shared economy needs one; every number here must feel
> fair to one player with nobody to trade with.

## Problem

Measured at `9fb5bd25`:

- **A new player starts with nothing but a monster.** `join_game` (`server-module/src/movement.rs`)
  inserts the player, character and `move_intent` rows, then grants the starter monster when the
  identity owns no `monster` row. It writes no item and no wallet: `economy::grant_currency`
  creates `player_wallet` lazily on the first grant. The cheapest shop item is the Antidote at
  150 (`game-core/content/shops/000-core.ron`: Lure Berry 200, Power Root 300, Antidote 150, the
  two essence shards 500).
- **The starter grant infers "new player" from live ownership.** `on_disconnect` deletes the
  `player` row, so every session's first `join_game` runs the grant check again. An identity that
  reaches zero monsters gets a second starter with fresh hidden IVs
  (R-weekly-review-2026-10-23-F1). Two paths reach zero monsters today. One is account deletion,
  after which the identity can never join again. The other is the guest claim:
  `accounts::complete_guest_claim` moves every monster to the account through `rekey_all`, and the
  retired guest token can still call `join_game`, so it gets a second starter. The session trade
  refuses a trade that would leave a side with no monster
  (`game_core::trading::session`, `TradeSessionError::LastMonster`), the legacy propose path
  returns `LEGACY_TRADE_RETIRED` (`server-module/src/trading.rs`), and no reducer releases a
  monster. Any future path to zero monsters would reopen the re-grant, because the rule reads
  ownership.
- **Faucets exist and are visible.** Each wild KO in a tactical battle adds
  `battle_currency_reward(victim BST)` (BST / `BATTLE_CURRENCY_BST_DIVISOR` = 10, about 31 for a
  typical wild) to the battle ledger (`game_core::tactics::rewards::on_unit_defeated`), paid at
  settle (`server-module/src/tactics_settle.rs::pay_ledger`). quest_001 pays 50 once
  (`game-core/content/quests/000-core.ron`). Selling pays the item's `sell_price` (40% of buy).
  M-pt3-quickfix (closed; PLAN §Built) made them visible: the wallet readout in the shop and quest
  log (`client/e2e/wallet-balance.spec.ts`), the quest-reward toast (`statusModel.ts`
  `questCompletionAck`, `client/e2e/dialogue.spec.ts` UIF4.2) and the KO-win payout lines (qf-17).
  The sketch's dependency is therefore met; this milestone adds no reward-visibility UI.
- **Recruiting changed shape.** A tactical wild battle seats a pack. A recruited wild earns nobody
  anything (`on_unit_defeated` refuses a `Recruited` victim), but the wilds the player KOs in the
  same battle still pay. A battle against a single wild that ends in a recruit pays nothing, and
  a single wild is 600 of every 1000 encounters (`pack_weights` in
  `game-core/content/tactics_zones/`).
- **Healing is free and its price is data.** `heal_party` (`server-module/src/raising.rs`) charges
  `HealLocationDef.cost_currency` through `evaluate_heal_currency` when it is above 0; the one
  location (`game-core/content/heal_locations/000-core.ron`) sets none. The client heal view
  already shows a price (`client/src/ui/healModel.ts`, `costCurrency`).
- **No item restores HP.** The item registry (`game-core/content/items/000-core.ron`) holds a
  bait (Lure Berry), a training food (Power Root), a status cure (Antidote) and two essence shards.
  Only the Antidote is usable in battle (`game-core/content/tactics_items/000-core.ron`).

## Scope

In:
- **`eo-1`** — the starter kit (#587 D2) granted at an identity's first join, together with the
  starter monster, once per identity, recorded by a persistent claimed marker that does not read
  ownership. Closes R-weekly-review-2026-10-23-F1.
- **`eo-4`** — one faucet/sink tuning pass under the balance stance: a worksheet checked in beside
  the content change, the quest reward retuned, the heal-cost question settled, content invariants
  the worksheet relies on pinned as tests.

Named deferrals:
- **An HP-restoring item** (a potion) is a new item effect, battle action and UI → a later content
  or battle-depth milestone (row R-econ-spec-NOTE241D57). The kit's "heal item" is the Antidote,
  the only healing item that exists.
- **A soulbound flag** for kit items → not built (decision `kit-tradeable` below). The official
  server's alt-identity farm is named in Risks with its row.
- **A welcome notice** for the kit → backlog (ux-a11y/LOW, row R-econ-spec-NOTE7D4055). The kit shows in the wallet readout and
  the Bag.
- **More quest content** (repeatable or additional quests as a recruit-loop faucet) → the
  content/world milestones (row R-econ-spec-NOTE241D57). `eo-4` tunes the one quest that exists.
- **A replacement monster sink** → not needed now (#587 D4); `eo-4`'s worksheet records the gap.
- **Economy metrics** (currency supply, price drift) → the observability milestone (M20 follow-on).
- **The legacy battle funnel's unreachable self-battle branch** (`write_back_battle_results`'s
  `is_practice` arm and its only caller of `practice_xp_reward`) → row R-econ-spec-NOTE27294A (the
  funnel's retirement), see "Rulings with no build".

## Prior rulings that bind

- #587 (answer file `memory/projects/decisions/issue-587.answer.md`, SSOT): D1 recruit pays
  NOTHING; D2 a one-time small starter kit per player, ~200 gold + 2–3 basic items; D3 healing stays
  free until this milestone tunes faucets and sinks together; D4 no monster sink now.
- "No recruit XP" (`docs/DECISIONS.md`, recruit mechanics) stands; nothing here pays a recruit.
- Grants ride the single surfaces: `economy::grant_currency` (wallet) and `inventory::grant_item`
  (items), with `MAX_BALANCE` / `MAX_ITEM_STACK` headroom checked first — reject, never clamp.
- A once-only grant is gated by a persistent marker set in the same transaction as the grant,
  never inferred from what the identity owns (the GrantItem `NotFlag`+`SetFlag` pattern that
  `validate_npc_content` rule 6c enforces for dialogue content).
- Content is data in `game-core/content/`, carried by `CONTENT_VERSION`
  (`server-module/src/lib.rs`) and the `content-version` eval's baseline
  (`evals/baselines/content-hash.json`). Schema changes are additive only. No dev reducers.

## Rulings with no build

- **Sketch `eo-2` — the practice faucet is closed.** Every battle a player can start is tactical
  (`tactics::start_pvp_tactical` and the wild start are the only `battle` inserts, each with its
  `battle_tactical` row). A self battle is `BattleKind::Practice`, and `on_unit_defeated` pays a
  Practice KO nothing. Tests: `game-core/src/tactics/rewards_tests.rs`
  `practice_friendly_fire_and_wild_kills_pay_nothing_bt5_6` and
  `server-module/src/tactics_settle_tests.rs`
  `a_practice_settle_rates_and_rewards_nothing_but_writes_back_both_lists_hp_bt14_6`. The legacy
  funnel `battle::write_back_battle_results` still pays currency and practice XP on `SideAWins`,
  but it runs only for an anchor with no `battle_tactical` row (the disconnect auto-flee, which
  ends `Fled`, and `pvp::apply_pvp_forfeit` on a legacy anchor). Both `battle` insert sites in
  `tactics.rs` write the `battle_tactical` row in the same transaction, so no new legacy anchor can
  exist. A self battle left over from before the cutover would also pay nothing:
  `forfeit_on_disconnect` forfeits the `player_identity` side first, which ends `SideBWins`, and
  `pvp_deadline_reaper` sees the same submission state for both sides of one identity, so it
  returns early or forfeits A. A pre-cutover non-self legacy PvP anchor is ordinary PvP, not this
  residual.
  R-weekly-review-2026-10-09-F1's disposition: resolved (fixed by M-battle-tactics), with this
  evidence. The unreachable branch is a follow-up row, not a slice of this milestone.
- **Sketch `eo-3` — recruit yields:** no payout (#587 D1). No build, no slice. `eo-4` owns the
  consequence.

## Decisions (reversible; documented defaults — no operator question)

- `decision-defaulted:starter-claim-marker=reserved-dialogue-flag` — the marker is the flag
  `sys:starter_claimed` in the owner's private `player_dialogue_state.flags`. That row is already
  rekeyed by the guest claim (`npc::rekey_npc_state`), erased by the deletion cascade
  (`npc::erase_npc_state`), counted by `accounts::account_has_game_data`, and delivered to no
  client; it appears only in the owner's own data export (the table is `exportable`). A new table
  would need a lifecycle-manifest entry plus the rekey, game-data, export and schema-baseline
  wiring. Writes go through a `pub(crate)` helper in `npc.rs`, the table's owner. Content may not
  name a `sys:` flag: `validate_npc_content` (`game-core/src/content.rs`, home of the GrantItem
  rule 6c) refuses any dialogue condition or effect, quest start condition or quest step condition
  that does. It runs in the publish validate phase (`server-module/src/content.rs`) and in the
  content tests, so a tree that names one never ships.
- `decision-defaulted:retired-guest=marker-tombstone` — `accounts::complete_guest_claim` moves the
  guest's dialogue row to the account, and nothing stops the retired guest token from calling
  `join_game` again: it holds no account row, so `require_not_deleting` passes. Without a marker it
  would get a second kit and a fresh starter. When the moved row holds `sys:` flags,
  `rekey_npc_state` leaves the guest a row with only those flags and a copy of `done_quests`, so the
  retired guest gets no second kit or starter and cannot redo a quest. This is a named change to
  "the claim moves, never copies": the account holds the whole row, and the guest keeps the
  tombstone.
- `decision-defaulted:kit-contents=200g+2xLureBerry+1xAntidote` — #587 D2's "~200g + 2–3 basic
  items (a heal item and a bait)". The Antidote is the heal item: the only one that exists. Two
  Lure Berries, because recruiting is the operator's dominant loop. The 200 gold buys exactly one
  more Lure Berry, the intended first purchase.
- `decision-defaulted:kit-content-home=game-core/content/starter_kit.ron` — one record
  (`currency`, `items: [(item_id, qty)]`; `tactics_tuning.ron` is the single-record precedent),
  loaded by `load_starter_kit` and checked by a new `validate_starter_kit(&kit, &items)` beside
  `validate_shops` (items exist, every qty ≥ 1, no item twice, each qty within `MAX_ITEM_STACK`,
  currency within `MAX_BALANCE`). `game-core/src/lib.rs` re-exports both beside the other
  `load_*`/`validate_*` names, and `server-module/src/content.rs`'s publish validate phase calls
  the validator. The server reads the kit through `content_cache::cached_starter_kit` (the ADR-0089
  `LazyLock` pattern). It is not synced to a table: no client reads it.
- `decision-defaulted:kit-load-failure=fail-loud` — when `cached_starter_kit` returns `Err` at
  join, `join_game` refuses with a structured reject log, as it does today when the starter species
  is missing ("content sync required"). Nothing is written. The embedded kit is validated at
  publish, so this arm is reachable only through a broken build.
- `decision-defaulted:kit-tradeable=yes` — kit items are ordinary items. Soulbinding needs a new
  item field and a trade rule. Each fresh identity already gets a tradeable starter monster; the
  alt-farm consequence is in Risks.
- `decision-defaulted:legacy-joiner=kit-without-second-starter` — an identity with no marker that
  already owns a monster (it joined before `eo-1`) gets the kit and the marker, and no second
  monster. An identity with no marker and no monster gets both. An identity with the marker gets
  nothing.
- `decision-defaulted:kit-headroom=whole-kit-or-none` — the kit is checked against the wallet and
  stack caps before any write. A kit that does not fit (reachable only for a legacy joiner near a
  cap) is not granted, the marker is not set, the join still succeeds, and a
  `starter_kit_skipped` line names the cap through `observability::mr_log`. The next join tries
  again. A fresh identity always fits.
- `decision-defaulted:export-tier-signal=unchanged` — `request_data_export` sizes its admission
  cap with `export_live_row_cap(is_account_holder, wallet_exists)` (`server-module/src/privacy.rs`).
  An anonymous caller with no wallet row gets the smallest "newcomer" tier. The kit gives every
  joiner a wallet, so after `eo-1` that tier holds only identities that connected and never
  joined. `eo-1` keeps the signal: any per-identity signal an anonymous identity can earn is cheap,
  and the open R-rb-132-WALLETSYBIL ask (sign-in as a launch condition) already covers the
  anonymous tier. The cost of reaching the larger anonymous tier drops from a join plus one quest
  Talk to a join (Risks).
- `decision-defaulted:kit-ack=none` — no new notice. The wallet readout and the Bag show the kit.
- `decision-defaulted:onboarding-module=server-module/src/onboarding.rs` — the grant decision
  (`starter_grant(claimed, owns_monster) -> StarterGrant`, pure) and the kit grant live in a new
  module. `join_game` keeps its statements and replaces its `has_monsters` test with one call. The
  monster-roll block stays in `movement.rs`, gated by the decision's `monster` field: this slice
  changes the gate, it does not move the block. `privacy_enforcement_tests.rs` parses every module
  `lib.rs` declares, so `onboarding.rs` uses the code shapes its parser already accepts.
- `decision-defaulted:heal-cost=free` — `eo-4` keeps every heal location at no cost. Under the
  balance stance (Pokémon-style: healing is free), a heal charge would be a sink against a
  one-player faucet. GDD §7's "town healing cost" stays inert, and the worksheet records it with
  the monster-sink gap.
- `decision-defaulted:quest-reward=quest_001:50->150` — the one quest pays an Antidote's price.
  #587 D1 makes quests the compensating faucet for recruit-heavy play.
- `decision-defaulted:prices-and-divisor=unchanged` — `BATTLE_CURRENCY_BST_DIVISOR` stays 10 (the
  essence divisor stays 3× steeper), shop prices stay, sell stays 40% of buy.
- `decision-defaulted:recruit-loop-budget=lure-berry-within-15-battles` — a recruit-heavy player
  (every wild battle ends in a recruit, the rest of the pack KO'd) earns from the KOs. With zone 0's
  `pack_weights` (600/300/100), 0.5 KOs a battle on average, so about 15 gold a battle at a 31-gold
  KO: a Lure Berry in about 13 battles. `eo-4.4` pins "within 15". A lone-wild recruit pays
  nothing (D1).

Every value above is gameplay a player sees, so it is not the builder's to move
(`standards/spec-driven.md` §Adapting the plan during a build). A build whose measurement
contradicts one records it with `mr-gates notes add` and, if the slice cannot hold, parks.

## Contracts between slices

- **C1 (`eo-1` → `eo-4`):** the kit file `starter_kit.ron`, `load_starter_kit`, and a fresh
  identity's start state of 200 gold, 2 Lure Berries and 1 Antidote. `eo-4.1` reads the kit
  through the loader. Proof after merge: `eo-4.1` passes on `master`, and
  `client/e2e/wallet-balance.spec.ts` reads `Gold: 350` (kit + quest).
- **C2 (`eo-1` ↔ guest claim / deletion):** the marker lives in a row the claim rekeys (leaving
  the guest a tombstone) and the cascade erases. Proof after merge: `eo-1.5`, `eo-1.6`, `eo-1.7`
  and `account-e2e` (`just eval`), whose vacuity allowlist no longer excuses
  `player_dialogue_state`, pass on `master`.
- **C3 (`eo-1`, `eo-4` ↔ `CONTENT_VERSION`):** each slice bumps `CONTENT_VERSION` once and
  re-records `evals/baselines/content-hash.json`. The pair is ordered, so the second bump starts
  from the first. Proof after merge: the `content-version` eval passes on `master`.

## Structure

`join_game` is a multi-responsibility reducer. `eo-1` adds no logic to it: the decision and the
kit grant go in `server-module/src/onboarding.rs`, the marker helpers in `npc.rs` (the table's
owner), the loader and validator in `game-core/src/content.rs` beside `load_shops` /
`validate_shops`. `eo-4` changes data, tests and a doc. The slices share
`server-module/src/lib.rs` (the version constant), `game-core/src/content.rs` (`eo-4` edits only
the quest parity snapshot test), `evals/baselines/content-hash.json` and
`client/e2e/wallet-balance.spec.ts`, and they are ordered (`eo-4` after `eo-1`), so no refactor
slice comes first.

## Slices

### eo-1 — starter kit at first join; the starter is granted once per identity
type: feature · tier: hard
category: economy/onboarding · severity: MED · size: MODERATE
touches: game-core/content/starter_kit.ron, game-core/src/content.rs, game-core/src/lib.rs, server-module/src/onboarding.rs, server-module/src/onboarding_tests.rs, server-module/src/movement.rs, server-module/src/movement_tests.rs, server-module/src/npc.rs, server-module/src/npc_tests.rs, server-module/src/content.rs, server-module/src/content_cache.rs, server-module/src/content_cache_tests.rs, server-module/src/lib.rs, server-module/src/monster_mgmt_tests.rs, server-module/src/guards_tests.rs, server-module/src/accounts_tests.rs, evals/baselines/content-hash.json, evals/account-e2e.eval.mjs, client/e2e/wallet-balance.spec.ts, client/e2e/trade-zz-negative.spec.ts, client/e2e/trade-full.spec.ts, client/e2e/trade-session.spec.ts, client/e2e/recruit.spec.ts, client/e2e/tactics-wild.spec.ts, client/e2e/encounter-battle.spec.ts, docs/DECISIONS.md
after: []

`join_game` asks `onboarding` what to grant before its monster block:
- `starter_grant(claimed, owns_monster)` returns `{ monster, kit }`. Claimed: neither. Not
  claimed: the kit, plus the monster when the identity owns none.
- `onboarding::grant_kit` checks the kit against the caps (`check_currency_headroom`,
  `check_item_headroom`), then grants through `grant_currency` and `grant_item`, then sets the
  marker.
- The decision and the writes run in the one `join_game` transaction.

`server-module/src/lib.rs` gains `mod onboarding;` and the `CONTENT_VERSION` bump. No schema,
reducer signature or bindings change, and no client source change.

Measured pins (each a named intentional change; the build widens for any further one it measures):
- The native host aborts on a write to a table a test did not register. Every native caller of
  `join_game` is in `movement_tests.rs`, `monster_mgmt_tests.rs` (`dw_insert_sites`, a brand-new
  player), `guards_tests.rs` or `accounts_tests.rs`. A fresh-identity call now also writes
  `inventory`, `player_wallet` and `player_dialogue_state`, and its fixture registers them.
  Assertions stay.
- A claim test in `accounts_tests.rs` or `npc_tests.rs` that asserts the guest keeps no
  `player_dialogue_state` row changes to "keeps only the tombstone" (`retired-guest`).
- `evals/account-e2e.eval.mjs`: `player_dialogue_state` leaves `S9_VACUITY_ALLOWLIST` (the reason
  it gives, "no zone-0 organic writer", is false once `join_game` writes the marker) and
  `S9_VACUITY_ALLOWLIST_CAP` goes from 9 to 8. Its `buildSeedStatements` inserts item rows that
  would sit beside the kit's stacks; they seed by update (or delete-then-insert) instead.
- e2e seeding: an identity now owns one stack of item 1 and of item 3 and a wallet row from its
  join. A spec that SQL-inserts a second stack of either item breaks the one-stack-per-item rule
  (`item_count` and `consume_n` read the first row), and one that inserts a `player_wallet` row
  collides on its key. Those seeds become updates: `tactics-wild.spec.ts` (bait),
  `recruit.spec.ts`, `trade-zz-negative.spec.ts`, `trade-full.spec.ts` (items and wallet).
- e2e start-state assertions:
  - `wallet-balance.spec.ts`: `EXPECTED_BALANCE_TEXT` `Gold: 50` becomes `Gold: 250`, as do its
    `'50'` literals. "B must own NO player_wallet row" and the "unknown" arm become "B reads its
    own 200, never A's 250". The escape valve that treats "a wallet row exists" as "the quest paid"
    reads the balance instead.
  - `trade-zz-negative.spec.ts` "A must hold no coin" / "B holds no coin" and `trade-full.spec.ts`
    "hold no item" / "no wallet row" become the kit's state. Seeded balances count from there.
  - `trade-session.spec.ts`: the coin branches its comments call unreachable are now taken. The
    comments and the branches' expectations change.
  - `recruit.spec.ts` R1 ("a fresh inventory holds no bait") becomes "the kit's bait row is
    offered". Its no-bait case uses an identity that has sold its berries first.
  - `encounter-battle.spec.ts`'s "the win must credit currency" (`balance > 0`) would pass on the
    kit alone. It compares against the balance read before the battle.
- `evals/baselines/content-hash.json` is re-recorded with `CONTENT_VERSION`.
- The `client-surface-privacy`, `spacetime-type-snapshot` and `bindings-drift` evals see no
  change, because no table, type or reducer changes.

The `docs/DECISIONS.md` entry records the starter rule ("the starter is a once-per-identity grant
recorded by a marker; ownership is never the test"), the retired-guest tombstone, the kit and the
reserved `sys:` flag namespace.

- **eo-1.1:** WHEN an identity with no starter marker and no monster joins, THE SERVER SHALL grant one starter monster, 200 gold, 2 Lure Berries and 1 Antidote, and set the marker, in the one `join_game` transaction (`server-module/src/onboarding_tests.rs`, through `join_game` on the native host).

- **eo-1.2:** WHEN an identity whose marker is set joins owning zero monsters, zero items and no wallet row, THE SERVER SHALL grant nothing (`server-module/src/onboarding_tests.rs`). Closes R-weekly-review-2026-10-23-F1.

- **eo-1.3:** WHEN an identity with no marker that owns a monster joins, THE SERVER SHALL grant the kit and set the marker, and SHALL insert no monster (`server-module/src/onboarding_tests.rs`).

- **eo-1.4:** WHEN the kit would push the joiner's balance past `MAX_BALANCE` or a stack past `MAX_ITEM_STACK`, THE SERVER SHALL grant no part of the kit, leave the marker unset, log `starter_kit_skipped`, and still complete the join (`server-module/src/onboarding_tests.rs`).

- **eo-1.5:** WHEN a guest identity holding the marker is claimed into an account, THE account SHALL hold the marker and the guest's quest history, and a later join of the account SHALL grant nothing (`server-module/src/accounts_tests.rs`).

- **eo-1.6:** WHEN the retired guest identity of a completed claim joins again, THE SERVER SHALL grant it no kit and no monster, and a talk to quest_001's NPC SHALL pay it nothing (`server-module/src/accounts_tests.rs`).

- **eo-1.7:** WHEN an identity's deletion completes, THE marker SHALL be gone with the rest of its dialogue state, and THE identity's `join_game` SHALL be refused (`server-module/src/accounts_tests.rs`).

- **eo-1.8:** WHEN content holds a starter kit naming an unknown item, a zero quantity, an item twice, a quantity above `MAX_ITEM_STACK` or a currency above `MAX_BALANCE`, or a dialogue condition or effect or a quest start or step condition naming a `sys:` flag, THE content validation SHALL refuse it with an error naming the offending entry (`game-core/src/content.rs` tests).

- **eo-1.9:** WHEN the starter kit cannot be loaded at join, THE SERVER SHALL refuse the join with a structured reject log and write nothing (`server-module/src/onboarding_tests.rs`).

- **eo-1.10:** WHEN a fresh browser identity joins and opens the shop, THE wallet readout SHALL read `Gold: 200` and the Bag SHALL list 2 Lure Berries and 1 Antidote (`client/e2e/wallet-balance.spec.ts`).

Build note (eo-1): Plan-delta (onboarding-module row): join_game keeps only its deletion gate and
hands content_cache::cached_starter_kit() to a new pub(crate) movement::join_with_kit, which holds
the former body. The cached kit is embedded and cannot fail on the native test host, so eo-1.9 needs
the kit passed in; the kit is resolved before take_start (the first write), so a kit that cannot
load refuses before anything is written on a host with no rollback. The refusal is unconditional (a
marker-holding identity is refused too).

Build note (eo-1): Plan-delta (retired-guest row): npc::rekey_npc_state leaves the retired guest a
tombstone on EVERY claim (its sys: flags, the starter marker whether or not it held it, a copy of
done_quests), not only when the moved row holds sys: flags. eo-1.6 is unconditional, and a guest
without the marker (it joined before eo-1, or its kit was skipped at a cap) left no row, re-joined
with no monster and was granted a second starter and kit (found by the plan red-team, the code
reviewer and the reducer security audit). The spec's own pin applied:
acct_guest_claim_round_trip_moves_every_row_and_spends_the_code now asserts the guest keeps only the
tombstone. A guest retired before eo-1 deployed has no tombstone and is still granted a starter and
kit at its next join (the legacy-joiner class).

Build note (eo-1): eo-1.6 quest clause: proven for a quest the guest had finished (the tombstone
copies done_quests, as the retired-guest row states). A quest the guest had started but not finished
(its player_quest row moves to the account) or never started can still be earned once by the retired
guest. That gold cannot leave it: the retired guest owns no monster, and a session trade refuses a
side that would hold none (TradeSessionError::LastMonster).

Build note (eo-1): Pins measured beyond the spec's list (each widened with its red run):
server-module/src/privacy_enforcement_tests.rs EXPECTED_MODULES gains 'onboarding' (lib.rs declares
the module); client/e2e/ui-inventory.spec.ts UIF8.4 reads the empty Other pocket (the kit fills Bait
and Medicine); client/e2e/a11y.spec.ts CTL7B-E2E-RAISING measures the Bag over the empty Food
pocket; server-module/src/accounts_tests.rs sr11_join_tables registers the inventory auto-inc.
recruit.spec.ts R1's no-bait case removes the kit's berry stack with owner SQL where the spec's pin
says 'sold its berries first': no e2e drives the Sell tab and the state is the same.
client/e2e/monster-privacy.spec.ts SQL-inserts a second stack of item 1 beside the kit's and still
passes (it asserts with some()); it was not edited.

Build note (eo-1): The publish-phase validate_starter_kit call in sync_content_inner has no test
that fails when it is removed (a measured surviving mutant): sync_content_inner reads the cached kit
and has no seam to inject an invalid one. The shipped kit is validated against the shipped items by
game-core's eo-1.8 test, so an invalid kit cannot pass CI.

Build note (eo-1): R-rb-132-WALLETSYBIL after eo-1: a join alone now creates the player_wallet row
(the kit's 200 gold), so export_live_row_cap's 'newcomer' tier holds only identities that connected
and never joined; the cost of leaving it drops from a join plus one quest Talk to a join (spec
decision export-tier-signal=unchanged).

Build note (eo-1): Follow-up: the retired guest's tombstone row (reserved flags and quest ids under
the retired guest identity) is not erased when the account that claimed it is deleted;
docs/DECISIONS.md records it as an accepted consequence.

Build note (eo-1): Follow-up: an account that claims a retired (tombstone-only) guest ends with the
starter marker and no monster, with its one claim spent; a zero-monster identity holding the marker
is final by eo-1.2.

Build note (eo-1): Follow-up: the a11y contrast measurement of the Bag covers an empty pocket only;
the default frame (Bait listing the kit's Lure Berry) is unmeasured because #bag-list's gradient
defeats the arithmetic.

### eo-4 — faucet/sink tuning pass
type: feature · tier: hard
category: economy-balance · severity: MED · size: SMALL (data + tests + one doc)
touches: docs/economy-tuning.md, game-core/content/quests/000-core.ron, game-core/src/content.rs, game-core/tests/pt_d3_tuning.rs, server-module/src/lib.rs, evals/baselines/content-hash.json, client/e2e/wallet-balance.spec.ts, client/e2e/dialogue.spec.ts, docs/DECISIONS.md
after: [eo-1]

The tuning invariants are tests over the shipped content: they extend the existing
`game-core/tests/pt_d3_tuning.rs`, which already pins the anti-arbitrage rule and the price bands.
The worksheet `docs/economy-tuning.md` (new; not a criterion) explains the numbers for whoever
retunes next: gold per loop against the cheapest and median sink, the inert heal sink, the
monster-sink gap and the pt3-2026-10-145 price↔AP rule. It cites the `pt_d3_tuning.rs` tests
by name instead of copying their values, so a retune that breaks the reasoning fails a test.

Measured pins:
- `game-core/src/content.rs` `m12c_quest_defs_parity_snapshot` pins quest_001's `currency: 50`.
- `client/e2e/dialogue.spec.ts` UIF4.2's toast text ("You received 50 gold.") and
  `client/e2e/wallet-balance.spec.ts`'s quest-completion balance move with the reward. The toast
  reports the balance gain across the batch, so the kit does not enter it.
- Client unit tests that use 50 are fixtures that read no content (`statusModel.test.ts`,
  `catalog.test.ts`, `main.dialogueEnded.test.ts`) and stay.

The `docs/DECISIONS.md` entry records the tuning ruling: healing is free under the balance stance,
and the quest is the recruit-loop faucet, citing the worksheet.

- **eo-4.1:** THE shipped content SHALL let a fresh player afford one Lure Berry from the kit's currency alone (`game-core/tests/pt_d3_tuning.rs`, over `load_starter_kit`, `load_shops` and `load_items`).

- **eo-4.2:** THE shipped heal locations SHALL charge nothing: `cost_currency` 0, no cost item and `cost_qty` 0 (`game-core/tests/pt_d3_tuning.rs`, over `load_heal_locations`).

- **eo-4.3:** WHEN a player completes quest_001, THE SERVER SHALL credit 150 gold once, and THE toast SHALL say "You received 150 gold." (`client/e2e/dialogue.spec.ts` UIF4.2; `client/e2e/wallet-balance.spec.ts` reads `Gold: 350` for a fresh identity that completed it).

- **eo-4.4:** THE expected currency of one recruit-heavy wild battle in zone 0 (its `pack_weights`, every wild but one KO'd, each KO paying `battle_currency_reward` of the encounter table's mean wild BST) SHALL buy a Lure Berry within 15 battles (`game-core/tests/pt_d3_tuning.rs`, over `load_encounters`, `load_species`, the tactical zone table and `load_shops`).

- **eo-4.5:** EVERY battle-usable item (the tactical item sidecar) SHALL be sold by a shop at a buy price above 0 and at or below the median buy price of the shop's stock, the lower middle value when the count is even, so its flat AP cost (`item_cost`, `game-core/content/tactics_tuning.ron`) is balanced by a price a player pays and by the item being used up (pt3-2026-10-145) (`game-core/tests/pt_d3_tuning.rs`).

Build note (eo-4): Readings taken where eo-4's criteria leave room (each is what the tests encode).
eo-4.4 'mean wild BST' is the spawn-weighted mean of zone 0's encounter entries (integer floor); on
the shipped table it is 321, so a KO pays 32 (the budget row says about 31): 16 gold a battle, a
Lure Berry in 13 battles. The criterion pays each KO at the reward of the mean BST; the game pays
each wild's own reward (31.3 on average), a gap below one gold per KO. eo-4.1 is 'at least' the Lure
Berry's price, as the EARS says, not 'exactly one'. A price counts only in a shop some NPC offers
(game_core::interact::npc_offers_shop, the predicate economy::require_shop_in_reach uses), so a shop
no NPC opens cannot satisfy eo-4.1, eo-4.4 or eo-4.5.

Build note (eo-4): recruit-loop-budget does not model the party clamp. effective_pack limits a wild
pack to the conscious party, so the budget row's 0.5 KOs a battle holds for a party of three or
more. A two-monster party averages 0.4 KOs: 12.8 gold a battle, 16 battles for a Lure Berry, outside
'within 15'. A one-monster party meets only lone wilds, so recruit-only play pays it nothing; a
fresh player's first recruits are carried by the kit and quest_001. eo-4.4 is written over zone 0's
pack_weights, which is the full-party case; it holds and is tested as written, and
docs/economy-tuning.md states the assumption.

Build note (eo-4): eo-4.5's bound is relative to the shop's own stock. Measured: with the Antidote
and both essence shards all at 3200 the median is 3200 and the criterion holds; the only absolute
ceiling on a price is pt_d3_content_sanity_bands (100 KO rewards of the best-paying wild). A shop
whose whole stock is the one battle item satisfies the criterion at any price for the same reason.
The worksheet lists this under the limits no test pins; an absolute ceiling would be a new tuning
value for the spec to state.

Build note (eo-4): World-content gap the eo-4 red-team measured: nothing validates where an NPC or a
heal location stands. A shopkeeper moved to (500,500), put on a tree tile, or left in a zone whose
only warp is removed passes validate_npc_content and every other publish validator, and the tuning
tests then read a price no player can pay (they check that an NPC offers the shop, not that the NPC
can be walked to). The shipped shopkeeper is covered end to end by client/e2e/shop-npc.spec.ts.

## Post-integration verification (the milestone is done when all hold on `master`)

- Full `just ci` green, with `just eval` included: the `content-version` eval passes at the second
  bump (C3); `account-e2e` passes with its trimmed allowlist (C2); and `bindings-drift`,
  `spacetime-type-snapshot` and `client-surface-privacy` show no change (no schema, type or reducer
  change in either slice).
- On `master`, `client/e2e/wallet-balance.spec.ts` (`eo-1.10`, `eo-4.3`) and
  `client/e2e/dialogue.spec.ts` pass together. That is the integrated proof of C1: a fresh identity
  joins, receives exactly one kit, completes the quest and holds 350.
- `server-module/src/accounts_tests.rs`'s `eo-1.5`–`eo-1.7` cases pass on `master` (C2).
- One manual playtest pass on one fresh local database, recorded in `eo-4`'s PR:
  - a new player sees 200 gold and the kit in the Bag;
  - they buy one Lure Berry;
  - a pack battle that ends in a recruit pays the KOs;
  - a disconnect and rejoin grants nothing again.

## Risks

- **Alt-identity farming on the official server.** An anonymous identity costs nothing to mint,
  and each one already gets a tradeable starter monster. After both slices a throwaway identity
  also yields about 570 gold to a main identity through a session trade: 200 from the kit, 220
  from selling the kit, 150 from quest_001. That is more than one essence shard (500). Session
  trades need no account (`trading_session::open_trade_session` checks only join, reach and the
  deletion gate). Gating the kit on an account is not available: no issuer is provisioned yet
  (`ALLOWED_ISSUERS` is a fail-closed placeholder), so nobody would get the kit. In a
  single-player world or on a friends server the farm is harmless. On the official server it is a
  launch condition beside R-rb-132-WALLETSYBIL's: before that server opens, trading requires an
  account on both sides, or the kit and quest payouts become untradeable. Row
  R-econ-spec-NOTEDED5DD tracks it; it is not built here.
- **A one-time kit for every existing identity** (`legacy-joiner`). Pre-launch this reaches only
  development and playtest databases.
- **The export newcomer tier gets cheaper to leave** (`export-tier-signal` above). Before `eo-1`
  an anonymous identity needed one currency grant (the quest_001 Talk) to move from the newcomer
  export cap to the anonymous cap. After it, a join is enough. That widens R-rb-132-WALLETSYBIL a
  little and changes neither its fix (sign-in) nor its pending ask. `eo-1`'s PR states it, and the
  row's text is updated through `mr-gates notes`.
- **Deletion closes the identity.** The cascade erases the marker with the dialogue state, but the
  anonymised `account` row keeps its terminal marker, and `require_not_deleting`
  (`accounts::should_reject_for_deletion`) refuses that identity's `join_game` for good. A deleted
  identity never gets a second kit. While a deletion is pending, the same gate refuses
  `open_trade_session` and `set_trade_offer`.
- **A marker with zero monsters is final.** `eo-1.2` grants nothing to a claimed identity that owns
  no monster. Today deletion (which blocks the join) and the guest claim (whose retired guest keeps a
  tombstone marker) reach zero monsters. A future
  release or loss mechanic must bring its own floor rule; this one does not re-grant.
- **A reserved flag inside dialogue state.** Content that named `sys:starter_claimed` could clear
  the marker and re-open the grant. `eo-1.8` makes `validate_npc_content` refuse any `sys:` flag in
  dialogue or quest content. That check is the boundary, so it lands in the same slice.
- **The e2e corpus assumed an empty start.** Four specs are measured pins. Others that only read
  their own purchases still pass, and the build runs the whole e2e suite, widening for any further
  measured pin. A widen refused because a live slice holds the file is a hidden-dependency stop.
- **Default numbers are judgement.** Quest 150, free healing and the kit split are reversible data.
  If the playtest finds the economy too loose or too tight, the remedy is a content retune, with
  the worksheet in the same PR.
- **mr-prune census** (2026-11-14, `9fb5bd25`, `--spec` this file, recorded as
  `M-econ-onboarding`): 0 duplicates, so no `pruned-tests:` line.
  - **orphans:** ten single-string `parse_*` wrappers in `game-core/src/content.rs` (`parse_shops`,
    `parse_heal_locations`, `parse_quest_defs`, `parse_npc_defs`, `parse_zones`,
    `parse_dialogue_trees`, `parse_evolution_paths`, `parse_encounters`, `parse_species`,
    `parse_abilities`) that only tests call. Their loaders call the `_parts` forms. They go to one
    `type: refactor` section of `structure.spec.md`, filed through `mr-gates notes` because this
    PR may not edit that file. `eo-1` adds no such wrapper: `load_starter_kit` and its tests call
    the one parse path.
  - **signals** (named, no action): `movement_tests.rs` reads source as text; `accounts_tests.rs`
    (also `protected-churn`, token `account`), `monster_mgmt_tests.rs` and `npc_tests.rs` churned
    in recent merges. `eo-1` edits only their `join_game` fixtures and adds no source-text read.
  - **literal-variants:** `guards_tests.rs`, 3 groups, none in the `join_game` case `eo-1` edits.
