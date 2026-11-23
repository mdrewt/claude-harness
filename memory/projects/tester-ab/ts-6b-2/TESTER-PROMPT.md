# Tester brief — ts-6b-2 (red phase: you write the gating tests; you implement nothing)

Worktree (every path below is relative to it):
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ts-6b-2`

You have Read, Grep, Glob, Write and Edit — no shell. The orchestrator compiles and runs what you
write and proves each new test fails on today's code for the reason you state. Write Rust that is
rustfmt-clean (default rustfmt settings) and clippy-clean under `-D warnings`.

Verification rules (binding): `/home/mdrewt/projects/ai-apps/claude-harness/standards/testing-tdd.md`.
In short: tests execute the shipped code and assert what it does; never read a source file as text
(`include_str!`, a scan of `.rs`), never pin comment or doc wording, never write a test whose subject
is another test. Test names lead with the behaviour. Do not edit any non-test file.

## What this slice fixes

A modified client can shop from anywhere and heal from anywhere in the heal zone: `economy::buy`
and `economy::sell` read no position at all, and `raising::heal_party` compares the caller's zone
with the heal location's zone and never the tile. The fix makes the server check where the caller's
character stands.

**ts-6b-2.1** — WHEN `buy`, `sell` or `heal_party` is called by a character outside reach of the
offering shop NPC or the heal tile, THE SERVER SHALL reject the call with one error string for wrong
zone, too far and missing character, before any read of wallet, inventory or cooldown, and SHALL
change nothing.

**ts-6b-2.2** — WHEN `open_trade_session` or `challenge_pvp` judges range, THE SERVER SHALL use one
shared guard that treats a missing character as out of range. (Today the rule has two copies:
`pvp::characters_in_interact_range(ctx, &Player, &Player)` and an inline `match` in
`trading_session::open_trade_session`.)

**ts-6b-2.3** — THE existing shop, heal, recruit, trade and PvP flows SHALL pass with their
characters in reach. (For you: every existing test that calls `buy`, `sell` or `heal_party` keeps
proving what it proves today, with its caller standing in reach.)

### The rules, exactly

Shop reach (`buy`, `sell`). The caller's character (found through its `player` row's `entity_id`)
must be within reach of an NPC that offers the shop:
- "offers": the `npc` row's `interaction` is `NpcInteraction::Shop(id)`. `buy(shop_id, ..)` needs an
  NPC with `Shop(shop_id)` — that exact id — in reach. `sell(..)` needs any `Shop(_)` NPC in reach.
  A `Dialogue` or `Heal(_)` NPC never counts.
- "in reach": the same zone, and the Manhattan distance from the caller's tile to the NPC's HOME
  tile (`npc.home_x`, `npc.home_y`) is at most `TALK_RANGE + npc.wander_radius` (inclusive;
  `game_core::TALK_RANGE` is 2). The NPC's CURRENT tile (its `character` row) is not consulted: an
  NPC wanders up to `wander_radius` from home, and an open shop must not strand its customer.
- A caller with no `character` row, in another zone, or too far gets ONE refusal, word for word:
  `the shop is not close enough` — the same text from `buy` and from `sell`. A `buy` naming a shop id
  that no NPC in reach offers (a shop offered only elsewhere, or by no NPC at all) gets that text too.

Heal reach (`heal_party(location_id)`). The caller's character must be in the heal location's zone
and within `TALK_RANGE` (2, Manhattan, inclusive) of the location's tile (`heal_location_row.tile_x`,
`tile_y`) — `game_core::interact::within_interact_range`. A caller with no `character` row, in
another zone, or too far gets ONE refusal, word for word: `the healer is not close enough`.
`heal_party` no longer returns `character not found` or `not in heal location zone`.

Guard order after the fix (earlier wins; assert it by which refusal a doubly-refused call gets):
- `buy` / `sell`: `not joined` → the ownership guard → the deletion gate
  (`guards::REJECT_DELETION_GATED`) → **shop reach** → `cannot buy|sell during an ongoing battle` →
  `qty must be > 0` → stock / item lookup → escrow, wallet, inventory, headroom → the writes.
- `heal_party`: `not joined` → the deletion gate → `heal location not found` (the location lookup
  now comes BEFORE any look at the caller's character) → **heal reach** → `cannot heal during an
  ongoing battle` → cooldown → currency → item cost → the writes.

A refused call writes nothing. The reach refusal does not depend on the caller's wallet, inventory,
cooldown or battle state.

Pair range (ts-6b-2.2). `guards::characters_in_interact_range(ctx, a, b)` is true exactly when both
identities have a `player` row, both of those rows' `entity_id`s have a `character` row, and the two
characters pass `within_interact_range` (same zone, Manhattan <= 2). A missing `player` row or a
missing `character` row on either side is out of range (false), never an error. The two reducers'
behaviour does not change: `ts2_open_out_of_range_is_one_string_for_zone_distance_and_missing_characters`
(`server-module/src/trading_session_tests.rs`) and
`ts5_challenge_out_of_range_is_one_string_for_zone_distance_and_missing_characters`
(`server-module/src/pvp_tests.rs`) must pass UNEDITED — do not touch those two files.

## Contracts

Tests you must write, with exactly these names (the acceptance ledger selects on them):

| Criterion | Test name | File | Rust module path |
|---|---|---|---|
| ts-6b-2.1 | `within_npc_reach_*` — at least the four behaviours listed under "game-core tests" below, every name starting `within_npc_reach_` | `game-core/src/interact_tests.rs` (top level of the file) | `interact_tests` |
| ts-6b-2.1 | `buy_and_sell_are_refused_away_from_a_shop_npc_and_accepted_beside_it` | `server-module/src/economy_tests.rs` (top level of the file, not inside a nested `mod`) | `economy::economy_tests` |
| ts-6b-2.1 | `heal_party_is_refused_off_the_heal_tile` | `server-module/src/raising_tests.rs`, inside the existing `mod nh` | `raising::raising_tests::nh` |
| ts-6b-2.2 | `characters_in_interact_range_treats_a_missing_player_or_character_as_out_of_range` | `server-module/src/guards_tests.rs` (top level of the file) | `guards::guards_tests` |

You may add further tests beside these where a distinct behaviour needs its own test. Keep each one
behaviour-named, in the same file and module as its criterion's required test. Any extra game-core
test of the new function must start with `within_npc_reach_`; no other test anywhere may start with
that prefix. List every test you add or edit in your report, with its criterion and its full module
path.

Production signatures the tests call:

```rust
// game-core/src/interact.rs — NEW in this slice (does not exist yet)
#[must_use]
pub fn within_npc_reach(zone: u32, pos: TilePos, npc_zone: u32, npc_home: TilePos, wander_radius: u8) -> bool;
// game-core/src/interact.rs — exists
pub fn within_interact_range(zone_a: u32, pos_a: TilePos, zone_b: u32, pos_b: TilePos) -> bool;
// game-core/src/npc/rules.rs — exist (in_talk_range: Manhattan <= TALK_RANGE)
pub fn in_talk_range(a: TilePos, b: TilePos) -> bool;
pub fn npc_decide(current: TilePos, home: TilePos, wander_radius: u8, facing: Direction, npc_id: u64, tick: u64, map: &TileMap) -> Option<Direction>;
pub const TALK_RANGE: i64 = 2; // game_core::TALK_RANGE, game_core::npc::TALK_RANGE

// server-module/src/guards.rs — NEW in this slice (does not exist yet)
pub(crate) fn characters_in_interact_range(ctx: &ReducerContext, a: Identity, b: Identity) -> bool;

// server-module/src/economy.rs — exist, signatures unchanged
pub fn buy(ctx: &ReducerContext, shop_id: u32, item_id: u32, qty: u32) -> Result<(), String>;
pub fn sell(ctx: &ReducerContext, item_id: u32, qty: u32) -> Result<(), String>;
// server-module/src/raising.rs — exists, signature unchanged
pub fn heal_party(ctx: &ReducerContext, location_id: u32) -> Result<(), String>;
```

Only TWO production symbols are new: `game_core::interact::within_npc_reach` and
`crate::guards::characters_in_interact_range`. Tests that call them will not compile until the
orchestrator's first increment adds them — that is their red. Everything else you write must compile
against the code AS IT IS NOW: reference no other new symbol (no new constant, no new helper). The
two refusal texts are asserted as string LITERALS:

- `the shop is not close enough`
- `the healer is not close enough`

Data shapes (read `server-module/src/schema.rs` for the full structs):
- `schema::Npc { entity_id: u64 (pk), npc_id: String (unique), zone_id: u32 (btree index "zone_id"),
  home_x: i32, home_y: i32, wander_radius: u8, dialogue_tree_id: String, interaction: game_core::NpcInteraction }`
  with `NpcInteraction::{Dialogue, Shop(u32), Heal(u32)}`. The shop reach check reads `npc` through
  the `zone_id` index: register it with
  `fx.table_keyed::<Npc, u32>("npc", "zone_id", |r| r.zone_id)`.
- `schema::Character { entity_id: u64 (pk), zone_id: u32, tile_x: i32, tile_y: i32, facing, action,
  move_started_at_ms: i64, sprite_id: u32, move_queue: Vec<MoveInput>, acked_seq: u64 }`, read through
  the `entity_id` index: `fx.table_keyed::<Character, u64>("character", "entity_id", |r| r.entity_id)`.
  An NPC's current tile is the `character` row with the NPC's `entity_id`.
- `schema::Player { identity, entity_id: u64, name, online, last_input_seq }` (index `identity`).
- `schema::HealLocationRow { location_id: u32 (pk), zone_id, tile_x, tile_y, cost_item_id:
  Option<u32>, cost_qty: u32, cooldown_ms: i64, cost_currency: u64 }`,
  `schema::HealCooldown { owner_identity, last_heal_at_ms }`.

## The test host you are writing against (read before writing)

`server-module/src/native_host_tests.rs` is an in-memory model of the SpacetimeDB host. Facts that
decide whether your test means anything:
- A read through an index no fixture registered returns NO ROWS. So a "refused" assertion passes for
  free when the `npc` `zone_id` index (or the `character` index) is not registered or holds no row.
  EVERY refusal you assert needs a positive control in the SAME fixture that differs in exactly one
  variable (the caller's tile, the caller's zone, the presence of the character row, the NPC's
  interaction, the shop id asked for).
- An insert, an update, an index delete or a table scan on a table/index the fixture did not opt in
  (`writable` / `scannable`) ABORTS the whole test process.
- There is no rollback: a reducer that returns `Err` keeps whatever it wrote before returning. That
  is what makes "a refused call writes nothing" observable — snapshot the rows before and after.
- The ORDER of reads is not observable. "Before any read of wallet, inventory or cooldown" is proved
  by precedence: an out-of-reach caller gets the reach refusal even when a later guard would refuse
  too, and the refusal is the same whatever the caller's wallet, inventory, cooldown or battle rows
  hold.
- `Handle::seed` pushes a row (no upsert); `rows()` reads them back; `remove(key)` returns a count.
  `fx.run_as(identity, |ctx| ..)` / `fx.run_as_at(identity, timestamp, |ctx| ..)` run a call as a
  sender; `fx.ctx()` is the all-zero sender.

Fixtures to build on (read them, reuse or extend them, do not duplicate them):
- `server-module/src/economy_tests.rs`: `ec_world` / `EcWorld` (line ~616 on), `rb46_seed_player`,
  `mod ctl16_shop_battle_guard` (`shop_world`).
- `server-module/src/raising_tests.rs` `mod nh`: `world` / `World`, `heal_world`, `join`,
  `join_char_only`.
- `server-module/src/pvp_tests.rs` and `trading_session_tests.rs`: read how the two named
  out-of-range tests seed players and characters (do not edit those files); the guard seam test in
  `guards_tests.rs` seeds the same two tables.
- `game-core/src/interact_tests.rs`: the `within_interact_range` section at the end of the file
  (`ME`, `ZONE`, `OTHER_ZONE`, `offset`) and its proptest block.

## Tests to write

### game-core tests (`game-core/src/interact_tests.rs`)

`within_npc_reach` is a pure function. Cover, with exact values:
1. Accepted on every tile at Manhattan distance `0 ..= TALK_RANGE + r` from home and refused at
   `TALK_RANGE + r + 1`, for `r` = 0, 1, 2 and one larger radius; on each axis, split across both
   axes, and with negative offsets. Use a home with `x != y` and offsets with `dx != dy`. At `r = 0`
   the diagonal (+2,+1) (Manhattan 3) is refused.
2. Another zone is never in reach, at any distance including the home tile itself.
3. At `r = 0` it agrees with `within_interact_range` of the home tile for every offset (the reach of
   a stationary NPC is the talk range).
4. The property the rule exists for (proptest): for every home, radius, every tile `t` with
   Manhattan(`t`, home) <= radius and every `pos` with `in_talk_range(pos, t)`, `pos` is in reach;
   and every `pos` in reach is in talk range of at least one tile of that disc (the bound is no
   wider than the wander disc plus the talk range).
5. Extremes: `i32::MIN` against `i32::MAX` on both axes with radius 255 returns false and does not
   panic; radius 255 at ordinary coordinates accepts 257 and refuses 258.

### `buy_and_sell_are_refused_away_from_a_shop_npc_and_accepted_beside_it` (economy_tests.rs)

One world (extend `ec_world` or build beside it) with real stock, wallet and inventory so the
accepted calls run to `Ok(())` and their effects are asserted. It must kill each of these wrong
implementations — say which assertion kills which in the doc comment (`kills:`):
- reach never checked (today's code): a far caller buys and sells.
- `<` instead of `<=`; the radius dropped or passed as 0; `home_x`/`home_y` swapped; the spawn or
  current tile used instead of home. Use a shop NPC with `wander_radius >= 2`, `home_x != home_y`,
  caller offsets with `dx != dy`: accepted at exactly `TALK_RANGE + r`, refused at `+ 1`. Seed that
  NPC's own `character` row AWAY from home: a caller within reach of home but more than `TALK_RANGE`
  from the NPC's current tile is accepted, and a caller within `TALK_RANGE` of the current tile but
  out of reach of home is refused.
- zone ignored: a caller on the very tile that is in reach, but in another zone, is refused; a shop
  NPC at the same coordinates in another zone does not put the caller in reach.
- `buy` accepting any shop: two shop NPCs with different shop ids, far apart; beside Y, `buy` from
  shop X is refused while `buy` from shop Y succeeds; a shop id no NPC offers is refused.
- `sell` accepting any NPC: beside only a `Dialogue` NPC and beside only a `Heal(_)` NPC, `sell` is
  refused; beside a shop NPC of any id it succeeds.
- three texts instead of one: no `character` row (the `player` row is present), another zone, and
  too far all return exactly `the shop is not close enough`, from `buy` and from `sell`.
- the reach check placed after a later guard: an out-of-reach caller still gets the reach text when
  it is ALSO in an ongoing battle, passes `qty == 0`, names an unstocked item (`buy`) or an
  unsellable / unknown item (`sell`), has too little or escrowed currency (`buy`), a full stack
  (`buy`), or too few or escrowed items (`sell`).
- a refusal that writes: wallets, stacks and every other row the world holds are byte-identical
  after each refusal.

### `heal_party_is_refused_off_the_heal_tile` (raising_tests.rs, `mod nh`)

- Accepted (`Ok(())`, party healed, cooldown row written) on the heal tile and at Manhattan 1 and
  exactly 2 from it — use a tile with `x != y` (the fixture's (8,3) is fine) and offsets with
  `dx != dy`.
- Refused with exactly `the healer is not close enough` at Manhattan 3 in the heal zone (straight
  and the (+2,+1) diagonal), on the heal tile's coordinates in another zone, and with no `character`
  row (the `player` row present). Same literal for all.
- Precedence: an out-of-reach caller gets the reach text when it is also in an ongoing battle,
  inside the cooldown, or lacks the cost item. An unknown `location_id` still answers
  `heal location not found`, with or without a character.
- Nothing written on any refusal (monsters, stacks, cooldowns, wallets byte-identical).
- kills: zone-only (today's code), `<` for `<=`, Chebyshev, the check after the battle or cooldown
  guard, a per-cause text.

### `characters_in_interact_range_treats_a_missing_player_or_character_as_out_of_range` (guards_tests.rs)

Call `crate::guards::characters_in_interact_range(ctx, a, b)` directly. True at the same tile, at
Manhattan 1 and exactly 2 (both argument orders); false at Manhattan 3, in different zones on the
same coordinates, when `a` has no `player` row, when `b` has none, when `a`'s `player` row points at
an `entity_id` with no `character` row, and when `b`'s does. Each false case differs from a true
case in one variable. Include `a == b` (a joined player with a character is in range of itself).

## Existing tests to migrate (ts-6b-2.3)

After the fix a caller with no character, or one standing away from a shop NPC or the heal tile, is
refused before the behaviour these tests exist to prove. Give each fixture a caller in reach, and
re-pin a refusal only where the OLD text no longer exists or the guard order above changes which
refusal comes first. Keep every existing assertion's meaning; do not delete or weaken a test. Where
you re-pin, derive the new expected value from the rules above, and keep the test's doc comment true
(a comment that describes the old flow is rewritten to the current one — no history). Callers
measured (find any others with Grep for `buy(`, `sell(`, `heal_party(` under `server-module/src`):

- `server-module/src/economy_tests.rs`: `rb46_buy_is_refused_only_while_the_caller_is_deletion_gated`,
  `rb46_sell_is_refused_only_while_the_caller_is_deletion_gated` (their "ordinary" admitted answer is
  whatever the first guard after the deletion gate now returns for that fixture),
  `nh_buy_success_spends_wallet_and_grants_one_stack`, everything built on `ec_world`
  (`nh_buy_refuses_before_writing_and_charges_the_server_price`,
  `nh_sell_refuses_before_writing_and_credits_the_server_price`, `mod ctl16_shop_battle_guard`).
- `server-module/src/raising_tests.rs`: `rb80_heal_party_is_refused_only_while_the_caller_is_deletion_gated`
  (same remark), `mod nh`: `heal_world`, `nh_heal_party_heals_only_the_callers_party`,
  `nh_heal_party_refusals_write_nothing` (its "wrong zone" row pins a retired text).
- `server-module/src/trading_tests.rs`: `nh_escrowed_items_and_currency_shrink_the_spendable_headroom`
  (calls `sell` and `buy`).
- `server-module/src/battle_tests.rs` (`bn_side_b_of_an_ongoing_pvp_battle_is_blocked_everywhere`)
  and `server-module/src/monster_mgmt_tests.rs` (`dw_raising_sites`): both call `heal_party(ctx, 999)`
  with the character on the heal tile already — check them and leave them alone if they need nothing.
- `server-module/src/guards_tests.rs`: `a_mid_grace_caller_gets_the_same_reason_from_move_talk_and_buy`
  pins `buy`'s ordinary answer for an `Active` caller with no character.

## Report

List: every test added (name, full module path, criterion, what it kills); every existing test or
fixture edited (what changed and why, one line each); anything in this brief you found wrong or
could not test, and why. If a rule above is ambiguous, say which reading you tested.
