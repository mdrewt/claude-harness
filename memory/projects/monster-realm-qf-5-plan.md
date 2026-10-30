# qf-5 plan — NPC conversation pinning + wander cadence

Worktree `.claude/worktrees/qf-5`, branch `slice/qf-5` from origin/master 1a244065.
Touches (exact): game-core/src/npc/rules.rs, game-core/src/npc/rules_tests.rs,
server-module/src/movement.rs, server-module/src/movement_tests.rs. No schema change,
no lib.rs/mod.rs edit (new symbols reached as `game_core::npc::rules::…`; `npc` and
`rules` are already `pub`). `npc_decide` is server-only (no wasm export) → no parity eval.

## Functional core (game-core/src/npc/rules.rs)

Inserted BELOW `NPC_CONTINUE_REROLL` (the `.cargo/mutants.toml` line-pin
`npc/rules.rs:61:15` forbids any insertion above line 61):

```rust
/// QF5.2 wander cadence: at most one NPC step every NPC_STEP_TICKS movement ticks
/// (5 × STEP_MS 200 ms = 1000 ms) — walk one tile, pause, repeat.
pub const NPC_STEP_TICKS: u64 = 5;

/// True on the movement ticks where NPC `npc_id` may take its step. Phase is offset by
/// `npc_id` so a zone's NPCs do not all step on the same tick; exactly one tick in every
/// window of NPC_STEP_TICKS consecutive ticks is due.
#[must_use]
pub fn npc_step_due(npc_id: u64, tick: u64) -> bool {
    tick.wrapping_add(npc_id).is_multiple_of(NPC_STEP_TICKS)
}
```

`npc_decide` is UNCHANGED (its 987-line suite pins known-answer vectors at arbitrary ticks).
The cadence gates the whole decision, homing included ("at most one step every N ticks").
With npc_decide's own 1-in-5 stay roll the mean is ~0.8 steps/s — "roughly one per second".

## Imperative shell (server-module/src/movement.rs NPC wander block)

```rust
let conversing: Vec<u64> = if npc_entity_ids.is_empty() { Vec::new() } else {
    ctx.db.player_conversation().iter().map(|c| c.npc_entity_id).collect()
};
for entity_id in npc_entity_ids {
    // QF5.2 cadence (game-core rule) + QF5.1 conversation pin
    if !npc_step_due(entity_id, tick_counter) || conversing.contains(&entity_id) { continue; }
    …unchanged…
```

Full scan of `player_conversation` is deliberate: no index on `npc_entity_id` (adding one is
a schema.rs edit = outside touches); the table holds only live dialogues (≤1 row/player,
deleted on disconnect, lib.rs) and the scan runs once per zone tick only when the zone has
NPCs (keeps raising_tests' NPC-less movement_tick runs off the unmodelled scan syscall).
"Active" = the row exists (spec text). A wedged row (WALKEDAWAYROLLBACK) pins the NPC until
the player advances/disconnects — correct behaviour; qf-6 fixes the wedge.

## Tests (tester; names are the gate ids)

game-core `npc::rules_tests`:
- `qf5_2_npc_step_ticks_span_one_second` — `NPC_STEP_TICKS as i64 * STEP_MS == 1000`.
- `qf5_2_npc_step_due_exactly_once_per_window` — for several npc_ids over a long tick run:
  every window of N consecutive ticks has exactly one due tick; due ticks spaced exactly N.
- `qf5_2_npc_step_due_phase_is_seeded_by_npc_id` — ids 0..N cover all N phases (kills a
  phase that ignores npc_id); determinism.
- `qf5_3_gated_wander_stays_in_radius_one_tile_on_due_ticks_only` — compose
  npc_step_due + npc_decide + apply_move on the real map from elder-style home: non-due tick
  → no move; due tick → ≤1 tile; always within radius.

server `movement::movement_tests::nh` (native host, scannable `player_conversation`):
- `nh_qf5_1_npc_in_conversation_never_moves` — conversation row references the NPC; run of
  ticks including due ticks where npc_decide → Some: position+facing unchanged. Control
  without the row moves.
- `nh_qf5_1_conversation_pins_only_the_referenced_npc` — row references NPC A; NPC B
  still wanders as the rule says.
- `nh_movement_tick_npc_wander_uses_the_step_tick_counter` (updated) — expectation becomes
  `npc_step_due(NPC, tick) && decide(tick)`; sample self-checked to contain due+Some and
  not-due+Some ticks; NPC id residue ≠ 0 mod N (kills `tick % N` with no id phase, and the
  server ignoring/reimplementing the cadence).
- `nh_qf5_3_npc_multi_tick_walk_stays_home_zone_within_radius` — consecutive ticks on the
  shipped zone map: zone_id fixed, ≤1 tile per tick, ≤ wander_radius from home.
- existing `nh_movement_tick_warps_a_player_but_never_an_npc` stays green.

## Anti-patterns avoided
No float, no clock read in game-core; no rule duplicated in the server (server only calls
`npc_step_due`); no schema change; nothing above rules.rs line 61.

## Risks
Tick counter is `now / STEP_MS` from the scheduler timestamp: a jittered duplicate tick
value can double-step a due NPC, a skipped value stretches one pause to 2 s (pre-existing
property of the counter; npc_decide already had it). Accepted, noted in PR.
