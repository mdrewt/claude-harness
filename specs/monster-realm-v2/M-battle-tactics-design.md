<!-- CEREMONY RECORD (doctrine SS6, 2026-10-24): HEAVY ceremony for M-battle-tactics P0.
21 agents: 6 brainstormers (b1 unbiased / b2 investigation / b3 monsters-as-units /
b4 pacing / b5 +tactical-rpg-combat-design.md / b6 +tactical-combat-player-reception.md),
each refined against its own adversarial critic (6 critiques + 6 revisions); judge synthesis
(pre-committed criteria, SS14) -> independent adversarial review (2 BLOCKER + 5 MAJOR + 7 minor,
all dispositioned: 13 accepted, 1 sub-point rejected with reason in SS12) -> judge-final.
Binding inputs: M-battle-tactics.spec.md operator rulings (#583/#584/#587-D1, answer files SSOT).
Intermediate artifacts (b*.md, critiques, draft synthesis) lived in the session scratchpad
(ephemeral); the attribution table (SS13) is the durable adopted/rejected record.
This document BINDS elaboration (slicing/touches/EARS still drafted at elaboration against the
then-current repo). SS12's operator options adopt the LITERAL ruling as default; the operator can
object on the closed decision issues at any time. -->

# M-battle-tactics design (P0 ceremony synthesis, 2026-10-24, final after adversarial review)

**Status:** this is the judge's synthesis of six refined brainstormer proposals (b1–b6), finalized against an independent adversarial review. It binds elaboration, as the spec's P0 requires. **Binding inputs:** the spec's Operator rulings (#583, #584 and #587 D1), the Action queue section and Binding constraints 1–9. Where this document reads a ruling, it uses the literal text by default. Any reading that departs from the literal text is listed in §12 as an operator option, not adopted. **Verified facts from the code** (game repo `projects/monster-realm`, checked by the judge, not taken from any proposal):

- **Damage:** `combat/damage.rs::calc_damage` computes `base=(2L/5+2)·P·atk/def/50+2`, then STAB ×3/2, then type effectiveness 0/5/10/20 divided by 10, then a variance roll of 85..=100. A separate `accuracy_check(skill_accuracy, roll)` exists. Skill content carries accuracy 100 (9 skills), 95 (3) and 90 (3).
- **Recruit odds:** `taming/rules.rs::recruit_chance` works in per-mille: `RECRUIT_BASE_RATE=80`, plus bait, plus missing-HP up to `MISSING_HP_FACTOR=500`, capped at 1000.
- **Outcomes:** `BattleOutcome` is {Ongoing, SideAWins, SideBWins, Fled}. There is no Draw variant, and pvp.rs pins "no new variant" for BSATN stability.
- **PvP today:** an immediate `forfeit_on_disconnect`, and `settle_pvp_battle` is the single decisive funnel.
- **Board visibility today:** `BattleMonster` (including derived `stats`) is already visible to participants through `my_battle`. Only `battle_wild.individuality_seed` is private.
- **Roster:** base speeds span 30–118 across 20 species, and base HP spans 44–92.

---

## 1. Design summary

**One sentence:** each monster's turn is one small queue spent from a 6-pip budget. You can draft it live or ahead of time. The server re-checks every entry against the live board at the moment it pops. A broken plan hands the rest of the turn back to you instead of wasting your pips. The clock only runs while the battle is waiting on you, and it restarts every time you submit.

**Core shape:**
- **Board:** a tile grid of 7×7 (one wild) or 8×8 (2–3 wilds, and all PvP), Manhattan distance, 4-way movement.
- **Squads:** 1–3 deployed monsters per side.
- **Turn order:** round-based by speed. Every unit acts once per round. The order is recomputed at each round start and frozen within the round, and a visible turn-order bar shows it.
- **AP:** 6 pips per unit-turn.
  - Movement is bought in **strides**. 2 pips buys "up to *stride* tiles". Stride comes from the species' speed, and movement cost comes from terrain × movement class.
  - Attacks: **Light 2 / Heavy 4**. Items cost **3**. Recruit and Flee cost **all 6**.
  - So **move + Heavy = 6** is the typical turn (D584.1).
  - A second attack in the same turn costs +2 ("Exert"). That makes Heavy plus anything else unaffordable and leaves two stationary Lights as the only double attack.
- **Positional levers in P1:** zone-of-control disengage tax, flank bonus (pincer), Guard, AoE shapes with friendly-fire filters, terrain × movement class, and minimum range on ranged skills. Elevation, obstacles and line/cone shapes stay in P3 (operator-deferred).
- **Queue (D583.2):** one per monster, holding its *next* turn's worth of actions.
  - Drafting is client-local, so undo is free.
  - Submit marks the plan READY. Cancel-and-clear is allowed any time before that unit's turn.
  - A READY plan executes the instant the unit's turn begins.
  - Every entry is re-validated when it pops. The first invalid entry and everything after it are **wasted**: discarded, never executed, no AP charged. Control of the remaining AP returns to the player ("halt-and-return").
  - Live play uses the same machine. A live turn is a draft that submits when you commit an irreversible action or press End Turn.
- **Idle clock (D583.2 + D584.5, literal):**
  - It runs only while the battle is `Waiting` on a unit with no READY plan and no presentation pad pending.
  - It **resets on every accepted submit**. The AP floor caps a unit-turn at 3 windows.
  - PvP: 30 s per window, so at most 90 s per unit-turn. Expiry auto-passes. The 4th auto-pass of the match is a forfeit.
  - PvE uses the same machinery with a 300 s inactivity window that auto-flees. This is the rb-104 reaper, not a thinking clock.
- **Forecast:** computed from the same wasm rules the server runs, in three honesty tiers:
  - Firm: current board, exact range, hit %.
  - Provisional: `~`, dashed, plus the assumption that makes it provisional.
  - Unknown: `—`.
  - The lethal skull appears only when the minimum roll kills on a hit.
- **Identity:** each species gets a movement class, a stride band, two skills with distinct geometry (one Light, one Heavy), a role tag and a wild stance. Abilities, weather and signatures come back in later depth waves (D583.1).
- **Wild AI:** seed-free and deterministic. It has three stances (Aggressive, Territorial, Skittish) plus a universal **Exhausted** rule: a wild below 25% HP stops moving. Telegraphs are computed by the client from public state.
- **Recruit:** adjacent target, the whole 6-pip turn, bait as a 0-AP parameter, odds shown exactly as rolled, zero yield.
- **Anti-alpha:** **First-Stand**. Attack damage cannot reduce a monster below 1 HP before its first activation.
- **PvP:**
  - Secret slot deployment (reveal-by-copy).
  - Secret queues with no ready signal to the opponent.
  - A %-max-HP **Surge** from round 9, so every match ends arithmetically.
  - A deterministic adjudication tuple (no draws).
  - The unchanged M17 rating machinery.

**What the operator is asked to confirm** (all flagged in §12; each default is the literal or carried reading):
1. Whether to tighten the ruled reset-on-submit clock to a cumulative per-unit-turn budget. The default is the literal reset.
2. "Wasted" read as: the planned action is lost and its AP is not charged (halt-and-return).
3. Light-skill power retuned to 20.
4. Whether to make accuracy rolls dormant at cutover. The default keeps the carried roll live.
5. PvP grants no XP.
6. Swap/reserve deferred to depth wave D1.

**What is deliberately *not* changed:**
- The carried `calc_damage`, `accuracy_check` and the ×2/×½ type multipliers (D583.1).
- `recruit_chance` inputs.
- PvP disconnect, which stays an immediate forfeit (constraint 5 carry-over).
- The `is_in_ongoing_battle` predicate.
- No new `BattleOutcome` variant.

---

## 2. Core rules

### 2.1 AP economy (all integer, game-core `tactics::economy`; constants in `tactics_tuning.ron`)

| Constant / action | Value | Rule |
|---|---|---|
| `AP_TURN` | **6** | Refreshes at the unit's turn start. No banking or carry-over. Shown as 6 pips. |
| **Move** (per stride) | **2** | `Move{dest, strides: 1\|2}` costs `2·strides`. The path's summed terrain weight must be ≤ `strides × stride(unit)`. At most **2 strides per unit-turn**, across all Move entries. |
| Disengage tax | **+1** | Added to a Move entry whose start tile is Manhattan-adjacent to a living enemy. Charged once per entry. Fly-class units are exempt. |
| **Light** skill | **2** | P1 content: power **20**, single tier. |
| **Heavy** skill | **4** | P1 content: power **65–75**. |
| **Exert** surcharge | **+2** | Applies to the 2nd and later attack in one unit-turn, any target. |
| **Item** | **3** | Flat, strictly between Light 2 and Heavy 4 (:418). Range and target filter are item content. Items stay free outside battle. |
| **Recruit** | **6** | The unit must have its full 6 AP at execution, and Recruit must be the only entry this turn (§5). |
| **Flee** (wild only) | **6** | Full 6 AP, only entry (§3.6). |
| **EndTurn** | 0 | Terminal entry. |
| Guard | — | Granted at turn end, not bought (§2.1.2). |

**Stride** is derived from species **base** speed, so it never changes with level: ≤49 → **2**, 50–89 → **3**, ≥90 → **4**. On the live roster that splits 6 / 9 / 5. This satisfies `move cost = f(distance, terrain, monster type, speed)` (:416): distance becomes strides, terrain becomes weights, type becomes the movement class, and speed becomes the stride band.

**Terrain weight (stride points per tile entered):**

| class \ terrain | Plain | Rough | Water | (Blocked, schema only in P1) |
|---|---|---|---|---|
| Walk | 1 | 2 | ✗ | ✗ |
| Nimble | 1 | 1 | ✗ | ✗ |
| Swim | 1 | 2 | 1 | ✗ |
| Fly | 1 | 1 | 1 | ✗ |

**Occupancy:** a unit may pass through allies but not end on them, and may not pass through enemies. Path choice is the cheapest-weight path, with ties broken by the lowest `(y, x)` sequence (Dijkstra with an explicit order and no HashMap iteration).

#### 2.1.1 Ruling checks (integers)

- **Typical turn (D584.1):** Move 1 stride (2) + Heavy (4) = 6. The ruled "move + one attack" *is* the budget.
- **Strong beats weak (:417):** the content lint and property test require `dmg_ref(heavy) > 2·dmg_ref(light)` for every kit at every level 5..=100. `dmg_ref` is the carried `calc_damage` at neutral type, no STAB, atk = def and variance 100.
  - With Light 20 and Heavy ≥ 65 this holds: L5 7 > 6, L10 9 > 8, L20 15 > 12, L50 30 > 20.
  - The best double attack (two stationary Lights, 2 + 4 = 6 AP) deals 12 at L20. One Heavy deals 15 *and* leaves a stride.
- **Item between weak and strong (:418):** 2 < 3 < 4.
- **Exert closes novas:** Heavy + Light = 4 + 4 = 8 > 6, and Heavy + Heavy = 4 + 6 = 10 > 6. Neither is affordable.

#### 2.1.2 Guard (restraint valve; replaces banking)

At turn end, a unit gains **Guard** if all three hold:
- (a) the turn ended by player commitment: an EndTurn entry, a pre-queued plan draining, or AI End. A timeout auto-pass never counts.
- (b) no attack skill executed this turn.
- (c) ≥ **2** AP are unspent.

Guard multiplies incoming **attack** damage by ×3/4 (floor, min 1) until the unit's next turn starts. It never stacks and does not reduce status ticks or Surge.

Consequences:
- Pure End = Guard.
- Moving 2 strides (4 AP) = Guard, so the *chaser* is the one who is guarded.
- Item (3) + End = Guard.
- Any attacking turn = no Guard, which closes the kite-and-guard loop.
- Recruit and Flee spend all 6, so no Guard.
- AFK gets nothing.
- The End Turn button's label is computed live. It reads **"Guard"** when the conditions hold and **"End Turn"** otherwise.

#### 2.1.3 Degenerate-optimum audit (property-tested in step T2)

| Line | Bound |
|---|---|
| Single-unit nova | Max attack damage per unit-turn is one Heavy, or two stationary Lights. Exert pushes every other combination over 6. |
| Round-1 deletion | Prevented by **First-Stand** (§2.4): attack damage cannot take a unit below 1 HP before its first activation. This holds by construction, not by map arithmetic. |
| Kiting | A ranged unit can do Light (2) + 2 strides (4) with no Guard. **Lint:** `range_max ≥ 3 ⇒ range_min = 2`, `stride + heavy.range_max ≤ 6` and `stride + any.range_max ≤ 7`, so fast units carry short Heavies. A caught kiter pays the disengage tax and has two options: Light (2) + tax (1) + 1 stride (2) = 5, or a 2-stride retreat with no attack (4 + 1 = 5). Either way the leftover 1 AP buys nothing and Guard is lost (it attacked, or < 2 AP stayed unspent). 8×8 boards run out within 2 rounds, and PvP Surge ends stalls. The residual is mobile chip harassment, accepted as a skirmisher identity and instrumented. |
| Turtling | Guard only on non-attacking turns, so a turtle never closes. PvP Surge (§6.4) is true damage that bypasses Guard. In PvE, turtling only delays the player's own fight; the round cap is 30 (§3.7). |
| Heal-stall | Two items = 6 AP, no move. PvP Surge outpaces heals (%-max-HP per round, rising). In PvE, item prices are the economy lever (spec non-goal), and item-use counts are logged in `battle_summary`. |
| Alpha by speed stacking | Initiative is frozen per round, and First-Stand covers round 1. Telemetry tracks the KO-by-round-3 rate. |

#### 2.1.4 Reception conventions departed from, and why

These are conventions from `docs/research/tactical-combat-player-reception.md` §7.
- **Conv. 3, movement free or separate with combat value:** movement costs AP because :416 rules `move cost = f(distance, terrain, monster type, speed)` and D584.1 rules that a typical turn is move + one attack inside the budget. Movement gets its combat value from the flank bonus, the ZoC tax, AoE positioning, recruit adjacency and Exhausted-hold targeting. Stride quantization keeps it to a single 2-pip decision.
- **Conv. 7, non-wasteful passing:** met by Guard (§2.1.2) instead of AP banking.
- **Conv. 11, a timer that scales with options and banks forward:** D584.5 rules a flat 30 s per-unit cap, and banking would supplement a ruled parameter, which needs operator sign-off. The literal reset-on-submit does give a unit that takes more steps more windows (up to 3), which partly scales time with what the unit does.

### 2.2 Round / turn flow (game-core `tactics::initiative`, `tactics::queue`, `tactics::upkeep`)

**Battle phase:** `Deploying → Active → Finished`. `is_in_ongoing_battle` is true from row creation, including Deploying, because the anchor `battle` row is `Ongoing`. Deploying is time-bounded in both modes (§2.3, §3.7).

**Round start, round r:** the initiative list is all living deployed units sorted by the exact comparator
`(eff_speed desc, base_speed desc, tie_rank asc, side_slot asc)`, where:
- `eff_speed` is the carried `StatBlock.speed` after status modifiers.
- `tie_rank = 0` for the side holding tie priority in round r.
- Priority alternates each round. Round-1 priority goes to the player side in PvE, and to `splitmix64(seed ^ 0x5EED) & 1` in PvP.
- The list is published (it drives the turn-order bar) and frozen for the round. Mid-round speed or status changes apply next round. The only mid-round edits are KO and recruit removals.

**Unit-turn state machine** (server-authoritative; game-core receives expiries as explicit `AutoPass`/`AutoFlee` inputs, so there is no wall-clock in game-core):

```
TurnStart(U):
  skip if U fainted/recruited/removed
  ap=6, strides_used=0, attacks=0, guard=false, first_stand=false (expires on activation)
  if turn-skip status (carried M14) → delete U's READY row (event QueueVoided), TurnEnd(committed=false)
  if U is wild  → Execute(ai::plan(board,U), origin=AI)
  elif READY row for U exists → take+delete row → Execute(entries, origin=PreQueued)
  else → Waiting(U)

Execute(entries, origin):              # runs inside the current reducer transaction; "Executing" is never persisted
  for e in entries:
    match validate_at_pop(e, live_board, U):
      Ok  → resolve(e); ap -= cost(e); emit Executed; if battle over → Finished; if U fainted → TurnEnd(false)
      Err(reason) → emit PlanHalted{U, idx, reason_kind}; discard e and all later entries (WASTED, 0 AP)
                    if U player-owned ∧ conscious ∧ ap ≥ 2 → Waiting(U)   # halt-and-return
                    else TurnEnd(committed=true)
  # drained without halt:
  if origin ∈ {PreQueued, AI} ∨ last entry == EndTurn ∨ ap < 2 → TurnEnd(committed=true)
  else → Waiting(U)                    # live submit that didn't end the turn (e.g. Light then decide)

Waiting(U):  battle idle on U's owner; a clock window runs (§2.3)
  submit_queue(U, entries):
    if validate_at_pop(entries[0]) fails on the live board → Err(InvalidNow{reason}); nothing changes, window keeps running
    else accepted → window closes → Execute(entries, origin=Live)   # a later Waiting(U) opens a FRESH window (ruled reset)
  submits/cancels for OTHER units → no effect on U or its clock
  window expiry → PvP: AutoPass ⇒ TurnEnd(committed=false), autopass_count += 1 (4 ⇒ forfeit)
                  PvE: AutoFlee ⇒ battle Fled (HP persists)

TurnEnd(U, committed): guard = committed ∧ attacks == 0 ∧ ap ≥ 2 ∧ last action ∉ {Recruit, Flee}
```

**Transaction bound (chain rule):**
- A reducer call that resolves turns (`submit_queue` for the waiting unit, `tactical_deadline_fire`, `tactical_advance`, a battle start) keeps chaining TurnStarts for pre-queued and AI units. It stops when the battle reaches `Waiting`, reaches `Finished`, or completes the current round's upkeep.
- It **never crosses a round boundary.** If round r+1 can begin without player input, the transaction ends with `turn_state = Advancing` and writes a zero-delay `tactical_advance_sched` row with arg-identity pins `(battle_id, round)` (ADR-0126 pattern) that continues the chain.
- **Worst case per transaction:** ≤ 6 unit-turns × ≤ 3 actions = 18 resolved actions plus one upkeep.
  - Each Move is one Dijkstra over ≤ 64 tiles.
  - Each AoE touches ≤ 13 tiles.
  - Each AI plan scores ≤ 64 candidate tiles × ≤ 3 targets.
- T5 measures this synthetic worst case on the pinned host (§11).

**Other turn rules:**
- **Battle-end check** runs after **every** resolved entry and in upkeep.
- **Mid-round KO:** the unit leaves the remaining order immediately. Its READY row is deleted with a visible event ("Sparkit's plan was lost"). Other queues referencing it fail at pop, and halt-and-return covers them. Nothing is ever re-planned on the player's behalf.
- **KO of the actor during its own Execute** (P1 content can do this only through an `All`-filter AoE): the remaining entries are discarded and the turn ends.
- **Double-KO in PvE:** the standing r2 ruling applies, re-proven. In PvP it goes to adjudication (§6.4).
- **No reactions, counters or interrupts in P1.** A queue is not simultaneous resolution; execution happens only on the owning unit's turn.

**End-of-round upkeep** (fixed order `[rule]`):
1. Status damage ticks (M14 values, in this round's initiative order).
2. **PvP Surge** if r ≥ 9 (§6.4).
3. Reserved slot for depth waves: weather/field, terrain hazards. They land here without reordering anything.
4. KO sweep (the **R-21r-a-TERMINALSWEEP** site, once, for all causes), battle-end check, and adjudication if both PvP sides are empty.
5. Status duration decrement and expiry.
6. Round caps: wild r == 30 → auto-flee (§3.7).
7. r += 1; rebuild initiative; continue through the chain rule above.

### 2.3 Queue + clock state machine

**Queue (per monster, per upcoming turn):**

```
EMPTY ──edit──▶ DRAFT (client RAM only: free add/pop/reorder; nothing on the wire)
DRAFT ──submit_queue──▶ READY (server row in private battle_queue)
READY ──cancel_queue (any time before U's TurnStart)──▶ EMPTY
READY ──U's TurnStart──▶ consumed by Execute (row deleted in the same transaction)
READY ──U fainted / battle ended / turn-skip status──▶ deleted + visible event
```

- A READY plan is that unit's **next** turn, whenever that turn comes: later this round if U hasn't acted yet, otherwise next round. READY rows survive the round boundary.
- **Submit gate** (server; costs the plan on the board as it stands at submit):
  - The sender owns U, U is alive and deployed, and the phase is Active.
  - **≤ 3 action entries** (the most 6 AP can buy at the 2-AP minimum), plus an optional trailing `EndTurn`. `EndTurn` may only be last. For a pre-queue, the server appends `EndTurn` only if it is absent, so a stored plan never exceeds 4 entries.
  - Recruit and Flee must each be the only action. Both are rejected in PvP.
  - **Cost on the current board ≤ available budget:** `strides·2 + tier costs + Exert + 3·items + disengage tax`. The tax is charged for each Move whose start tile (U's current tile, or the previous Move's destination) is adjacent to a living enemy *at submit time*. The budget is 6 for a pre-queue, or current AP for a live submit. A plan that is unaffordable on the unchanged board is rejected, never stored to fail later.
  - At most 2 strides in total.
  - Each skill must be one of U's skills. The owner must hold each item in at least the quantity this plan uses. Every target id must exist in the battle.
  - A pre-queue atomically replaces any previous READY row for U.
  - A live submit must also pass `validate_at_pop` on its first entry. Otherwise it is rejected with typed `Err(InvalidNow{reason})`, nothing executes, and the clock window is not reset (§2.2).
- **Execution gate** (server, authoritative): `validate_at_pop` checks:
  - It re-costs the path, including the disengage tax.
  - It recomputes range, geometry and target sets with the **one** shared geometry function.
  - It re-checks adjacency, headroom and affordability.
  - It **re-reads the owner's inventory** for Item and bait entries; the debit happens in the same transaction as the effect.
  - Client-sent tiles are never trusted (BT2).
  - If the same consumable sits in two units' READY plans, the plan that pops first uses it. The second halts at that entry (halt-and-return, 0 AP), so there is no server-side double-spend.
- **Target binding:**
  - Skills bind a **unit id** (or Self). AoE re-centres on that unit's current tile if it is still in range.
  - Moves bind a **destination + stride count**. The executor may re-path at equal or lower weight. If the destination is unreachable or occupied, the whole Move is invalid. There is no partial walking, so you never land on a surprise tile.
- **Waste rule — halt-and-return:** the first invalid entry and all later entries are wasted. No AP is charged and they are never re-tried. The player gets the remaining AP back in `Waiting(U)`. *Why:*
  - "Wasted" stays literally true: the planned actions never happen.
  - Paying AP for a non-event reads as economy theft, the most-resented pattern in the reception corpus [DS].
  - Halting rather than continuing means nothing ever executes from a board the plan didn't assume. Because the submit gate costs the plan on the submit-time board, a pre-queue halts only when the board changed after submit, or when an earlier entry's rolled outcome changed it (for example, a KO).
  - It removes the zero-width-cancel problem: an ally's KO of your recruit target never costs you the turn.
  - Conditional scripting is impossible, because nothing runs after an invalid entry.
- **Cancel race:** a `cancel_queue` that arrives after TurnStart finds no row and returns typed `Err(AlreadyActing)`. The client shows "Too late — already acting".

**Idle clock** (server-module scheduling; pure arithmetic in game-core `tactics::clock`):

| Situation | Clock |
|---|---|
| A pre-queued unit's or the AI's Execute, other players' turns, upkeep, `Advancing` | never runs |
| Entering `Waiting(U)` at server time t0 | a window opens at `t0 + pad`. `pad = Σ presentation caps of events emitted since the last Waiting`, capped at 5,000 ms, so animations never count (D583.2). `deadline = t0 + pad + BUDGET`; `window_seq += 1` |
| An accepted submit for U at time t (at least the first entry executes) | the window closes; `idle_ms_total += max(0, t − (t0+pad))` (telemetry). If U returns to `Waiting` (live remainder or halt-and-return), a **fresh full window** opens. This is the ruled reset. |
| A submit for U rejected with `InvalidNow` | nothing executes; the window keeps running; no reset |
| Windows per unit-turn | **≤ 3**. Every window after the first needs ≥ 2 AP left, and every accepted live submit that doesn't end the turn spends ≥ 2 AP (6 → 4 → 2). |
| Submit or cancel for a different unit V | no effect on U's deadline |
| PvP budget | **30,000 ms per window** (so ≤ 90 s per unit-turn); expiry → AutoPass (no Guard); `autopass_count[player] += 1`; the **4th** in the match → forfeit. The count never resets (shown as pips). |
| PvE budget | **300,000 ms per window**; at 240,000 ms the client shows a "Still there?" countdown; expiry → AutoFlee (damaged HP persists) |
| PvP deploy | separate 45,000 ms deploy clock; expiry → remembered formation; not a strike |
| PvE deploy (pack ≥ 2 confirm screen) | 300,000 ms; expiry → the battle closes as `Fled` with no HP write (no damage was dealt), the same path as a disconnect during Deploying |

The deadline fires through one scheduled-reducer row per window, with arg-identity pins `(battle_id, unit_id, window_seq)` on arm and disarm (ADR-0126 pattern). A stale fire is a no-op.

**How "resets the moment they submit a monster's actions" is honoured (literal reading, BT7):**
- Every accepted submit for the waiting monster ends its window. If that monster still has a live remainder, the next window starts at the full budget.
- Each unit-turn starts with a fresh window.
- A pre-queued unit spends 0 ms.
- Only a submit that executes nothing (`InvalidNow`) leaves the clock running. That is what stops zero-cost resubmits from refilling the clock forever.
- The AP floor caps a unit-turn at 3 windows (90 s in PvP).
- The cumulative per-unit-turn alternative is §12 Q1, operator option only.

### 2.4 Damage pipeline (pinned order; integer floor at every step; byte-identical native/wasm)

```
hit = accuracy_check(skill.accuracy, roll % 100)      # carried rule; one roll per target; miss → 0 damage, no status, event Missed
d0 = calc_damage(attacker, skill, defender, variance∈85..=100, weather=None)   # carried: base, STAB×3/2, type eff/10, variance
d1 = flank ? d0·5/4 : d0
d2 = guard ? d1·3/4 : d1
d3 = immune ? 0 : max(d2, 1)
First-Stand (attack damage only): if target.first_stand ∧ d3 ≥ target.hp → target.hp = 1, first_stand = false, event StoodGround
```

- **Flank:** the target is Manhattan-adjacent to ≥ 2 living units of the attacker's side. Every such adjacent unit counts, including the attacker only if the attacker is itself adjacent. A ranged attacker therefore flanks when two allies pin the target.
- **First-Stand:**
  - `first_stand` is set true at deployment. It is cleared at the unit's first TurnStart (an auto-pass counts as activating) or when it saves the unit.
  - It applies to **attack damage only**. Status ticks and Surge ignore it, which keeps the Surge termination proof (§6.4) intact.
  - In P1 every deployed unit activates in round 1 before the first upkeep, so the exemption becomes reachable only with D1 Swap entrants, which inherit this rule.
- **Variance and accuracy rolls:** each AoE target gets its own accuracy and variance draw. Both come from `splitmix64(battle_secret.seed ^ action_seq)`, where `action_seq` increments per draw. Seeds are never client-readable.
- **Accuracy is live at cutover** (the carried `accuracy_check`; content values 90/95/100, mean ≈ 97%). The forecast shows hit %. A miss is an executed action: its AP is spent, and it is not "invalid". Dormant accuracy is an operator option (§12 Q4). Status-application chances are carried M14 data, rolled on the same private stream and shown in the forecast.
- **Pacing anchor** (reference L20, base ~60, HP ≈ 58, atk = def; computed at both STAB mixes):
  - No-STAB Heavy 65 → 15 before variance, mean ≈ 13.4 after the floored 85..=100 roll → 5 hits per KO, ≈ **5.2 attack-turns** with ≈ 97% accuracy.
  - STAB Heavy 70 → 24, mean ≈ 21.7, minimum 20 → always 3 hits, ≈ **3.1 attack-turns**.
  - **Blended ≈ 4 attack-turns per KO.**
  - Super-effective STAB Heavy 70 → 48 before variance (2 hits). Resisted → ≈ 6 (no STAB) to ≈ 11 (STAB).

---

## 3. Grid, maps, terrain, deployment, multi-wild generation

### 3.1 Geometry (game-core `tactics::geometry`, the ONE shared function)
- **Manhattan everywhere:** movement, adjacency (for recruit and flank), range, AoE.
- **LoS:** P1 maps contain no LoS blockers, so LoS is always true. The function signature takes a blocker grid from day one, so P3 obstacles and elevation (-138/-139) become content plus a function body, with no schema rework.
- **Shapes (P1):** `Single`, `Diamond(r ≤ 2)` (a Manhattan ball), and `Burst(1)` (self-centred, excludes the origin). The enum is extensible: `Line` and `Cone` are reserved for -141 (P3).
- **Skill fields** (separate, Mewgenics-style; the operator's fireball model :410–413): `range_min`, `range_max` (0 = self, 1 = melee), `origin {Caster, TargetUnit}`, `shape`, `radius` (0 = the target tile only), and `ff_filter {Enemies, AllButSelf, All}`.
- The server validator, the client highlighter, the forecast and the AI all call the same symbol.

### 3.2 Maps (RON content under `game-core/content/battle_maps/`, CONTENT_VERSION-pinned)
- **Sizes:** **7×7** for 1-wild encounters; **8×8** for 2–3-wild encounters and all PvP. Validator bounds: width and height each 6..=8.
- **Tile schema:**
  - `terrain: Plain|Rough|Water|Blocked`. Blocked is reserved and unused in P1 content.
  - `elevation: u8 = 0` and `blocks_los: bool = false`, both defaulted and unread, so P3 is additive.
- **Spawns:** `spawn_a: [(x,y); 3]` and `spawn_b: [(x,y); 3]`, as ordered slots. **Validator rules:**
  - Minimum opposing slot distance is **4** on 7×7 and **5** on 8×8. This is about contact pacing only; round-1 KO prevention is First-Stand's job.
  - Maximum opposing distance ≤ 2·4 + 3 = 11, so contact is guaranteed by round 2.
  - Every spawn tile is Walk-passable.
  - A Walk path connects the two sides.
  - The species reach lints from §2.1.3 run in the same CI pass.
- **P1 content:** **6 maps**: 3 at 7×7 and 3 at 8×8 (open field, water channel, rough choke). PvP uses 2 mirrored 8×8 maps. Zone RON gains `battle_map_pool`, and the map is `pool[encounter_seed % len]`. Per-zone gimmick maps are the first content follow-up, since reception names maps and objectives as the variety source [CQ/TS].
- **Presentation floor:** one shared battlefield background and the existing species sprites from `client/public/assets`.

### 3.3 Deployment UX (fixed spawn slots + assignment; no free-placement phase in P1)
- **Remembered formation:** owner-scoped `player_formation` holds ≤ 3 monster ids in slot order.
  - The default is the first 3 conscious party members.
  - The formation updates on every confirmed deploy.
  - Fainted or traded-away members are auto-replaced by the next conscious party member in party order.
- **Wild, pack size 1:** no screen. The remembered formation auto-deploys and the battle starts immediately, as fast as today's 1v1.
- **Wild, pack ≥ 2:** a confirm screen shows the wild composition (information before commitment).
  - **A** starts with the remembered formation.
  - **X** opens the editor: LB/RB cycles conscious party monsters, the D-pad picks a slot, A assigns, and Start confirms.
  - The 0-HP gate means fainted monsters are never listed (BT1). Median cost: one press.
  - There is no back-out; Flee is available on the first turn.
  - The screen is bounded by the 300 s PvE deploy window (§2.3). On expiry the battle closes as `Fled` with no HP write, so `is_in_ongoing_battle` is released (rb-104).
- **PvP:** simultaneous and **secret**, through owner-only `battle_deploy` staging rows.
  - When both sides lock, or the 45 s deploy clock expires (auto-filling the remembered formation, else the first conscious monsters in slot order), one reducer **copies** both stagings into `battle_unit` rows and flips the phase to Active in a single transaction.
  - No conditional-visibility view is assumed, because RLS is unenforced and `public` on a view is inert. Species, slots and positions reveal together.
- Wakfu-style free placement is a P3 additive option; spawn slots are already tiles in content.

### 3.4 Multi-wild encounter generation
- **Pack size:** encounter RON gains `pack_weights` in per-mille (default **1: 600, 2: 300, 3: 100**, tunable per zone), rolled from the existing encounter seed.
- **Clamp:** `effective = min(rolled, 3, conscious_party_count)`. The wild side never outnumbers what the player can actually field.
- **Species and levels:** per slot, from the zone's existing pool and level rules (unchanged).
- **Per-unit seed:** `individuality_seed_i = (splitmix64(encounter_seed ^ i) as u32)`.
  - It is stored in one **`battle_wild_unit`** row per wild (private, no view).
  - Recruit rebuilds *that* wild from *that* seed, which extends the existing single-wild ruling by an index.
  - The old `battle_wild` table is retired from use, not dropped.
- **Wild placement:** slots `0..pack` onto `spawn_b` in order. Stance comes from the species' `battler.stance`.

---

## 4. Species identity + wild AI

### 4.1 Identity levers (all species/skill RON; no new verbs)

| Lever | Field | P1 values |
|---|---|---|
| Movement class | `battler.movement` | Walk / Nimble / Swim / Fly (§2.1 table; Fly is also exempt from the disengage tax) |
| Stride | derived from base speed | 2 / 3 / 4 |
| Kit | `learnable_skill_ids` (tactical kit = exactly 2) | one **Light** + one **Heavy**, with **distinct geometry**. At least one must have `range_min = 1`. |
| Geometry | per-skill `tactics:` block | e.g. melee single r1, lance r1–2 single, artillery r2–3 Diamond(1), self Burst(1), r2–3 single ranged |
| Role tag | `battler.role` | Striker / Guardian / Skirmisher / Support / Artillery. This is a UI chip and stance default, never a rule. |
| Types / stats / status / accuracy | carried M14 data | live at cutover (D583.1) |
| Ability, signature, footprint | dormant columns | inert until waves D1 / D3 (§11) |

- **Verb set (6, inside the reception 4–6 budget):** Move, Skill (Light or Heavy), Item, Recruit (wild only), Flee (wild only), End/Guard. PvP Forfeit is a menu action, not a queued verb.
- **Content lints** (CI):
  - The `dmg_ref` property from §2.1.1.
  - `range_max ≥ 3 ⇒ range_min = 2`.
  - `stride + heavy.range_max ≤ 6`, and `stride + any.range_max ≤ 7`.
  - Every kit has distinct geometry: Light and Heavy differ in at least one of range band or shape.
  - An `ff_filter = All` AoE must be authored with `origin = TargetUnit`, so that self-hit is explicit and shown.
- **Power retune** (content, CONTENT_VERSION bump):
  - Lights → 20 (Ember, Water Gun, Spark, Glimmer, Aqua Jet, Vine Whip; Toxic Sting is already 20).
  - Heavies → 65–75 (Razor Leaf 55 → 65).
  - Weather-setter skills (7–10) re-enter with the weather wave.

### 4.2 Wild AI (game-core `tactics::ai`; **seed-free signature, structurally**)

`ai::plan(board, unit) -> Vec<QueuedAction>` takes **no** RNG or seed parameter. A future stance that wants randomness cannot compile against a seed; it must move telegraphs to server-pushed `battle_event`s (the designated escape hatch). The plan is decided **at the wild's own TurnStart** from the live board and executed by the **same executor** as player queues. All tie-breaks follow `(Manhattan distance, cur_hp, side_slot, y, x)` ascending.

| Stance | Behaviour (greedy, 1-turn) |
|---|---|
| **Aggressive** | If some player unit is attackable this turn (Heavy after ≤ 1 stride, else Light after ≤ 2 strides), pick the target by tie-break, move to the cheapest attack tile, then attack (Heavy if affordable). Otherwise move 2 strides minimizing distance to the nearest player unit. |
| **Territorial** | Same, but never ends a move > 2 tiles from its spawn tile. If no attack is possible, End (it Guards). |
| **Skittish** | If a target is reachable within its Heavy's range after 1 stride, choose the attack tile that maximizes distance to the nearest player unit. Otherwise move 2 strides to maximize that distance while staying ≤ `range_max + 2` from it. |
| **Exhausted** (universal) | When `cur_hp·4 < max_hp`, the wild **never moves**. It attacks from its tile if anything is in range, else End (it Guards). Shown as an icon. This is "weakening is the lever" made spatial: a weakened wild holds still to be recruited. |

- AI never uses items, Recruit or Flee in P1.
- **Telegraph:** each wild shows a stance icon and an **intent chip** (target + path). The client computes it with the same wasm `ai::plan` on the **shared provisional board** (§9.3), so intent chips and forecasts can never contradict each other.
- Each chip is labelled "current intent — changes if the board changes". This is a threat display, not a promise.
- Danger overlay: the union of every enemy's next-turn attackable tiles.
- **Difficulty** comes from encounter composition and maps, never stat inflation [reception Tier-1 #3].

---

## 5. Recruit (tactical form of the standing rulings)

- **Verb:** `Recruit{target: wild_unit_id, bait: Option<item_id>}`. It must be the only entry of the turn. It needs **6 of 6 AP** at execution and requires the target to be a wild that is **Manhattan-adjacent**.
  - "A full turn's action budget spent on an ADJACENT wild" (:419) is taken literally: you start your turn adjacent.
  - The setup (weaken until Exhausted, close to adjacent, recruit next turn) is the tactical commitment the research praises.
- **Headroom:** a `check_headroom` pre-flight (ADR-0113/0124 pattern) runs at submit **and** at execution. With no headroom the verb is greyed with a reason ("Party full — no room"). At execution it is invalid, so halt-and-return applies and nothing is charged.
- **Bait** is a parameter of the attempt at **0 additional AP**: it raises the odds without raising the cost (:419, literal).
  - Bait is consumed on the attempt, success or failure.
  - Inventory is re-read at execution (§2.3).
  - **R-21r-a-CONTENTLOAD:** the bait's content row loads and validates *before* inventory is debited, at this exact site.
- **Odds — carried rule, quantized so that shown = rolled:**
  - `permille = recruit_chance(max_hp, hp, base_rate(=80, per-species later), bait_bonus)` is unchanged.
  - `pct = permille / 10` (floor).
  - Success iff `roll % 100 < pct`, where the roll comes from the private stream.
  - The forecast shows line items that always sum: `Base ⌊80/10⌋=8 + Bait ⌊b/10⌋ + Weakened (= pct − 8 − bait line) = pct%`.
  - Example: a wild at 20% HP with bait 150‰ gives 80 + 150 + 400 = 630‰, displayed as **8 + 15 + 40 = 63%**.
- **Success:**
  - The wild leaves the board and initiative immediately. It is rebuilt from its `battle_wild_unit` seed at **full HP**, with exact genes.
  - It gets **zero XP, zero essence, zero currency** (#587 D1).
  - It is **not deployable in this battle**.
  - If it was the last wild, the battle ends in a win (§7).
- **Failure:** the turn is consumed (D584.3). Odds are unchanged on later attempts: no anger spiral and no hidden stacking. The remaining wilds act normally.
- **Invariants re-proven at this site:**
  - R-21r-a-FAINTPENALTY: the trust penalty on recruit success.
  - TERMINALSWEEP: upkeep step 4 plus the battle-end path.
  - CONTENTLOAD: above.
  - The **H1/H2 proxies** (`scripts/playtest-report.mjs`: weaken-first, recatch, success rate) read `battle_summary` (§8). Field names and semantics stay stable, though rates are expected to re-baseline because the friction profile changed.
- **Wild-only:** Recruit is rejected at the submit gate in PvP and never appears in the PvP menu.

### 3.6 / 5a. Flee (wild only)
- `Flee` must be the only entry and needs **6 of 6 AP**. It works from any tile, and success is **deterministic** (no escape roll).
- The whole player side exits and the outcome is `Fled`.
- **Damaged HP persists** for every deployed unit (ADR-0138 / `write_back_party_hp` semantics).
- Rewards already earned for KOs in the ledger are paid (§7).
- Voluntary Flee, PvE auto-flee (from the clock or the round cap) and disconnect auto-flee are **one code path with three triggers**.

### 3.7 Wild bounds (rb-104 closed)
- **Deploying (pack ≥ 2 confirm screen):** 300 s → the battle closes as `Fled` with no HP write.
- **Inactivity:** a 300 s window with no accepted submit on a player unit-turn → AutoFlee.
- **Round cap:** at r == 30, end-of-round → AutoFlee. The turn-order bar warns from round 25.
- **Disconnect:** last-connection drop → immediate AutoFlee. READY rows are discarded, not executed. During Deploying, the battle closes as `Fled` with nothing persisted.

Every phase of a wild battle is therefore time-bounded. All four paths release `is_in_ongoing_battle`. The Active-phase paths persist damaged HP.

---

## 6. PvP specifics

### 6.1 Format and ranked mapping
- `battle_challenge` gains an additive `format: u8` (1..=3).
  - **Ranked is fixed at 3** (3v3). Casual challenges pick 1–3.
  - Each side deploys exactly `format` conscious monsters, or all it has if fewer. At least 1 is required to accept.
- **Ranked:** the unchanged M17 rating machinery, fed by the unchanged `settle_pvp_battle` funnel. Outcomes are always `SideAWins` or `SideBWins`. There is **no Draw** and no new `BattleOutcome` variant (BSATN stability).
- **Practice** (self vs self) uses the PvP ruleset with no rating and no rewards.

### 6.2 Clock
- The §2.3 idle clock replaces the 60 s secret-pick deadline reaper.
- Each window is 30 s and restarts on every accepted submit, so a unit-turn gets at most 90 s.
- Expiry auto-passes with no Guard. The **4th** auto-pass of the match is a forfeit, and the count never resets.
- Both players see both clocks and both strike counts. The opponent's clock running is already implied by public `Waiting(U)` state, so showing it leaks nothing, and the visible strikes deter griefing.

### 6.3 Secrecy (exact scope)
- **Secret, no opponent read path:**
  - `battle_queue` entries, **and whether a READY row exists at all**: there is no ready flag on `battle_unit` and no lock icon on opponent chips.
  - `battle_deploy` staging.
  - `battle_secret` (seed) and `battle_wild_unit`.
- **Inferable only after the fact:** when a unit's turn starts and executes instantly, the opponent can infer a READY plan existed. The plan is already resolving, so this has no strategic value.
- **Events:** `battle_event` rows are emitted only at execution. A halted plan's discarded tail never appears; only `PlanHalted{unit, reason_kind}` does.
- **Public to participants:** both sides' deployed positions, HP, stats, status and stance. Derived stats were already participant-visible in today's `my_battle`; genes and seeds were not.
- A two-identity subscription e2e (M16.5d pattern) proves that the opponent never receives a `battle_queue`, `battle_deploy` or `battle_secret` row, and never receives an unexecuted entry through `battle_event`.

### 6.4 Surge, adjudication, forfeit, disconnect
- **Surge** (PvP only; wild battles never get it):
  - At upkeep step 2, for r ≥ **9**, every living unit loses `max_hp × 5 × (r − 8) / 100` (floor, min 1) as true damage.
  - That is 5% at r9, 10% at r10, and **105% cumulative through r14**, so every match terminates by round 14 at any level.
  - First-Stand does not apply (§2.4).
  - Telegraphed from r7 ("Surge in 2").
- **Adjudication** when both sides are empty in the same resolution step or upkeep step. The exact tuple:
  1. Higher `Σ cur_hp×100/max_hp` over own deployed units at the start of that step.
  2. More conscious units at the start of that step.
  3. Higher cumulative attack damage dealt this match.
  4. `splitmix64(seed ^ round) & 1`.

  The result is logged and shown on the results screen.
- **Forfeit:** a menu action with a confirm dialog. It is not a queue entry and costs no AP. One reducer, mapped to a normal loss through the funnel.
- **Disconnect:** the carried, immediate `forfeit_on_disconnect` on last connection, keyed on the last session (constraint 5).
  - READY rows are deleted, not executed.
  - During Deploying, the battle is cancelled with no rating change.
  - A reconnect-grace window is an open question (§12 Q7), not adopted.
- **No recruiting and no Flee in PvP.**

---

## 7. Rewards (XP / essence / currency; recruit pays nothing)

A single game-core hook, `on_unit_defeated(killer, victim)`, writes to an in-battle **ledger**. The ledger is paid **once at battle end** through the existing write-back funnel. There are no mid-battle stat changes, so queues and forecasts never chase a moving stat block.

| Payout | Wild battles | PvP / practice |
|---|---|---|
| **XP** per defeated wild (carried `xp.rs` amount) | **50% to the killer**; 50% split evenly over the *other* deployed allies conscious at the KO moment (integer division, remainder to the killer). If the killer is alone, it takes 100%. | **none.** Rating is PvP's progression. This closes M16a D10's side-A-only asymmetry and removes farming. |
| **Essence** (carried `essence_battle_reward(bst)`) | 100% to the killer (constraint 7, same primitive, call site moved into KO settlement) | per KO, to the killer, **both sides symmetric** (constraint 7 preserved in every battle kind) |
| **Currency** (carried `battle_currency_reward(bst)`, the M-econ faucet) | per defeated wild, to the player | none |
| Recruit success | **zero XP, essence and currency** (#587 D1); the hook never fires | n/a |

- **Payment condition:** a monster's ledger share is paid only if it is **conscious at battle end** (carried rule: today's write-back skips fainted members). Fainted monsters forfeit their share, and it is not redistributed. Benched party members get 0. Scaling is to the deployed team, never the roster average.
- **Paid on every terminal path** (win, loss, Flee, auto-flee, disconnect): KOs that already happened were real. Awards render as per-monster lines on the results screen, so there are no invisible payouts.

---

## 8. Data model + where every rule lives

### 8.1 Tables (ALL private; additive-only; old 1v1 tables retired from use, never reordered; bindings regenerated)

| Table | Key columns | Client read path |
|---|---|---|
| `battle` (existing, schema unchanged) | the anchor row: identities, `party_monster_ids`, `state.outcome`, `created_at_ms` | existing `my_battle`. `is_in_ongoing_battle` is **unchanged** and keys on `Ongoing`. |
| `battle_tactical` (new, PK battle_id) | kind {Wild, Pvp, Practice}, format, map_id, content_version, phase {Deploying, Active, Finished}, round: u16, initiative: Vec<u32>, turn_idx: u8, **turn_state: {NotActive, Waiting(unit_id), Advancing}**, tie_priority_side | `my_tactical_battle` (participants) |
| `battle_unit` (new, PK unit_id, idx battle_id) | **side: u8 + owner: Option<Identity>** (stored separately so that a future 2-ally side is just new rows — the M18 hook), monster_id?, wild_index?, species_id, level, affinity, x, y, cur_hp, max_hp, stats, skill_ids, status, ap, strides_used, attacks, guard, first_stand, movement, stride, stance?, state {Active, Fainted, Recruited} | `my_battle_units` (participants see **both** sides; there is **no** queue or ready field). Rows exist only after Deploying → Active. |
| `battle_queue` (new, unique (battle_id, unit_id)) | owner, entries: Vec<QueuedAction> (≤ 4 including EndTurn), submitted_at_ms. READY state only; DRAFT never leaves the client. | `my_battle_queue`, **owner only** |
| `battle_deploy` (new) | battle_id, owner, picks: Vec<(monster_id, slot)>, locked | `my_battle_deploy`, **owner only**; deleted at materialization |
| `battle_clock` (new, (battle_id, player)) | window_seq, window_open_ms?, deadline_ms?, windows_this_unit_turn: u8, idle_ms_total, autopass_count | `my_battle_clock` (both participants) |
| `battle_secret` (new, PK battle_id) | seed: u64, action_seq: u64 | **none, ever** |
| `battle_wild_unit` (new, (battle_id, wild_index)) | species_id, level, individuality_seed: u32 | **none** (`battle_wild` doctrine) |
| `battle_event` (new, append; idx battle_id) | seq, round, payload (BSATN enum: Executed{…per-target dmg, hit, flank, guard}, Missed, PlanHalted, QueueVoided, AutoPass, StoodGround, Status, Surge, KO, RecruitResult, Awards…) | `my_battle_events` (participants); emitted only at execution |
| `battle_summary` (new) | one row per finished battle: kind, outcome, rounds, wall_ms, idle_ms per player, windows per unit-turn histogram, autopasses, recruit attempts/successes, weaken_first, items used, damage totals, hits/misses | none (telemetry; H1/H2 source) |
| `player_formation` (new) | owner, monster_ids ≤ 3 | `my_formation` (owner) |
| scheduled `tactical_deadline_sched`, `tactical_advance_sched`, `battle_gc_sched` | ADR-0126 arg-identity pins: `(battle_id, unit_id, window_seq)`, `(battle_id, round)`, `(battle_id)` | — |
| `battle_challenge` (existing) | **+ `format: u8`** (additive) | unchanged |

- **`turn_state` semantics:**
  - `NotActive` in Deploying and Finished.
  - `Waiting(U)` exactly when the battle is idle on U's owner and a clock window is armed.
  - `Advancing` exactly when a `tactical_advance_sched` row is pending between chained transactions (§2.2).
  - Execution and upkeep happen inside a transaction and are never persisted.
- **GC and lifecycle:** 24 h after the battle finishes, `battle_gc_sched` deletes the battle's `battle_event`, `battle_unit`, `battle_queue`, `battle_clock`, `battle_secret` and `battle_wild_unit` rows. `battle_summary` survives for telemetry.
- Every new table joins the account-deletion / anonymize cascade (the `anonymize_battles` path).

**`QueuedAction`** is a closed enum: `Move{dest, strides}`, `Skill{skill_id, target: Unit(id)|SelfTarget}`, `Item{item_id, target}`, `Recruit{target, bait}`, `Flee`, `EndTurn`. Additive BSATN rules apply: no `serde(default)` compatibility assumptions (M14.5f lesson).

**Client reducers (4):** `deploy_units`, `submit_queue`, `cancel_queue`, `forfeit`.
- Internal and scheduled reducers: `start_wild_tactical` (from the encounter path), `start_pvp_tactical` (from the challenge path), `tactical_deadline_fire`, `tactical_advance`, `battle_gc`.
- Every reducer validates the sender, calls game-core and writes tables.
- A new server `tactics` domain module carries all of this, per the fan-out note; `battle.rs` does not grow.

### 8.2 RON content (`game-core/content/`, CONTENT_VERSION bump)
- `battle_maps/*.ron` (§3.2).
- Skills gain `tactics: (tier: Light|Heavy, range_min, range_max, origin, shape, radius, ff_filter)`, plus the power retune. Carried `accuracy` stays live.
- Species gain `battler: (movement, role, stance)` plus dormant `signature: None` and `footprint: 1`.
- Items gain `battle_use: Option<(range, target_filter)>`.
- Encounters gain `pack_weights` and `battle_map_pool`.
- `tactics_tuning.ron` holds **every** constant in this document.

### 8.3 Rule homes (game-core, exactly once; client forecast, telegraph and highlight call the identical wasm build)

| Module | Owns |
|---|---|
| `tactics::geometry` | metric, range bands, shapes, ff filters, LoS(blockers), the adjacency predicate, the flank predicate |
| `tactics::movement` | terrain × class weights, stride bands, Dijkstra with explicit tie-break, disengage |
| `tactics::economy` | AP costs, Exert, stride caps, Guard eligibility, submit-time board costing (including the tax) |
| `tactics::initiative` | the comparator tuple, tie priority, freeze |
| `tactics::queue` | submit-gate checks, `validate_at_pop` (including the inventory re-read), Execute, halt-and-return, the chain rule |
| `tactics::resolve` | the §2.4 pipeline (calls carried `accuracy_check`, `calc_damage`, `type_chart`, `status`), First-Stand (attack-only), KO, `on_unit_defeated` → ledger |
| `tactics::upkeep` | the fixed upkeep order, Surge, KO sweep, round caps |
| `tactics::outcome` | battle-end predicates, PvP adjudication tuple |
| `tactics::ai` | the 3 stances + Exhausted, seed-free |
| `tactics::recruit` | adjacency, quantized odds over carried `recruit_chance`, seed rebuild, headroom predicate |
| `tactics::encounter` | pack roll, clamp, per-wild seed derivation, map pick |
| `tactics::clock` | pure window / pad / reset / window-count / strike arithmetic over supplied timestamps |
| `tactics::rewards` | ledger split, payout eligibility |
| `tactics::lint` | content lints + the `dmg_ref` property (used by CI) |

---

## 9. Battle UI (D-pad-first; base under the ONE context stack; frames ride SCREEN_POLICY + B17; every string in the typed i18n catalog en+fr, ~80 keys)

### 9.1 Layout
- **Field:** the top ~70% (grid, sprites at real positions, health bars over units, shared background).
- **Command dock:** a visually separated bottom band with a border and darker value (-129/-130).
- **Info boxes:**
  - The loved **red/green info boxes** (name / level / HP / type, -121) are docked per side, one compact row per unit.
  - The hovered or targeted unit expands to show status icons, Guard shield, First-Stand pip, role chip and stance icon.
  - The **6 AP pips** sit in the active unit's box. Drafted spend blinks, so the remainder is previewed before any press commits.
- **Turn-order bar** (top):
  - Portraits in frozen order: current unit highlighted, acted units dimmed, KO'd chips drop out, next round ghosted.
  - **Own** chips show a lock when READY; **opponent** chips never show queue state.
  - It also carries the round counter, the "Surge in N" badge (PvP, from r7) and the "Retreat at 30" badge (wild, from r25).
  - It never recentres on selection.
- **Overlays** (shape + colour, colour-blind safe):
  - Blue = 1-stride reach; light blue = 2-stride reach.
  - Red crosshair tiles = attack range for the selected skill.
  - Yellow = AoE ghost, including the caster's own tile when it would be hit.
  - Purple hatched = danger (toggle).
  - Wild intent chips.
  - Shield pips on enemy-adjacent tiles mark the disengage tax.
- **Clocks:**
  - PvP: a radial ring on the waiting unit's portrait, visible to both players. It refills on every accepted submit, turns amber at 10 s and red at 5 s. Strike pips (0–4) sit by each player name.
  - PvE shows only the "Still there?" countdown from 240 s into a window.
- **Event ticker** above the dock: every waste ("Fire Fang skipped — target fainted. Your move."), miss, auto-pass, StoodGround, Surge tick, status tick and award, as an i18n line. Nothing resolves silently.

### 9.2 Controller map (keyboard and mouse mirror it; mouse is never the only path)

| Input | Action |
|---|---|
| D-pad | tile cursor (with per-unit memory) / menu navigation |
| A | select / confirm; on own unit, open the command menu |
| B | back; in DRAFT, pop the last chip (undo). **Hold B** = skip presentation. |
| X | danger overlay toggle; on the wild confirm screen, edit formation |
| **Hold Y (500 ms)** | cancel-and-clear a READY plan (a tap shows the "hold to clear" hint) |
| LB / RB | cycle own units **any time**, including opponent and wild turns; opens that unit's queue strip |
| Start | live: **End Turn / Guard** (live label); pre-queue: **Submit** |
| Select | battle log / help (`?`) |

**UNDO and CANCEL are never offered together:** which one is visible tells you whether the plan is a DRAFT or READY.

### 9.3 Flows
- **Live turn** (≈ 6 presses for move + attack):
  1. A opens the hierarchical menu: **Move ▸ / Skills ▸ / Item ▸ / Recruit ▸ (bait sub-list) / Flee / End Turn|Guard**. It shows only legal options. Illegal ones are greyed with a one-line reason ("Needs all 6 AP — start your turn adjacent", "Out of range", "Party full").
  2. Move: the D-pad picks a tile in a band, then A, and a ghost sprite appears there. This is a client-local draft, so B undoes it for free, in PvE **and** PvP, because nothing has been sent.
  3. Skills ▸ Heavy: the D-pad or LB/RB cycles legal targets, and the forecast updates.
  4. A commits: the draft plus the attack submits and executes.
- **Pre-queue** (during the opponent's or a wild's turn, or during playback): RB to a unit, then the **same** menu and cursor.
  - Each step appends a chip to that unit's strip, with AP pips (tax included on the current board) and a **✓ / ~ / ✗** badge (firm / provisional / stale, re-evaluated on every subscription update).
  - A consumable planned in more plans than the owner holds badges `~` with "only N held".
  - Start submits (the strip locks); hold Y clears.
- **Forecast panel** (right dock, on aim):
  - Hit % (carried accuracy).
  - Damage `min–max` (variance 85 and 100) with line items: type arrow ×2/×½, STAB, flank ×5/4, target Guard ×3/4.
  - Lethal **skull** only if the minimum kills on a hit; a **hollow skull** if only the maximum kills; a **First-Stand marker** ("survives at 1 HP") when the pip would catch it.
  - Status chance.
  - Recruit `%` with line items that sum, plus the bait selector, live.
- **Provisional board:** the live board, plus this player's own READY and DRAFT plans applied in initiative order.
  - In **PvE**, each wild's `ai::plan` is also applied.
  - In **PvP**, enemies are frozen in place, with the caveat "assumes enemies hold".
  - Provisional numbers render in the **Projected** style: dashed border, `~` prefix, the i18n label "Projected — the board may change", and the assumption line ("if Sprigg is still at C4").
  - Hidden-state dependencies render as `—`. Live-turn forecasts render solid.
- **Results:** XP, essence and currency lines per monster, recruits, PvP rating change. Auto-advances after 3 s, skippable.

### 9.4 Presentation constitution (client-side; the server resolves instantly)
- **Caps:** 400 ms per action; 100 ms per tile for movement (max 400); 1,000 ms for the upkeep batch; 2,000 ms battle start; 3,000 ms results.
- **No turn banner** for READY or AI turns.
- Hold B skips.
- **Reduced-motion** (shipped wiring) replaces slides and flashes with instant state changes plus the ticker line.
- The server's clock pad (§2.3) is the deterministic sum of these caps. Skipping banks at most that time, which is bounded and accepted.

---

## 10. Match-length budget (integer arithmetic; blended assumptions; pessimistic mix checked against targets)

**Inputs:**
- Reference HP 58.
- Attack-turns per KO: **≈ 5.2 with no STAB / ≈ 3.1 with STAB / ≈ 4 blended** (§2.4, including ≈ 97% mean accuracy).
- Playback 0.8 s per unit-turn (cap 1.2 s).
- Upkeep 1 s per round when something ticks; assume half of rounds.
- Player idle 8 s per **live** unit-turn and ~3 s per pre-queued turn; **blended 6 s** in PvE and **8 s** in PvP. The literal reset clock does not change typical idle.

| Fight | Derivation (no-STAB / STAB) | Time (no-STAB / STAB) | Target |
|---|---|---|---|
| **Wild 1v1** (7×7) | contact in r1–r2 (opposing distance 4); **≈ 6 / ≈ 4 rounds**, 12 / 8 unit-turns | 6×8 + 12×0.8 + 3 + 2 + 3 = **≈ 66 s** / 4×8 + 8×0.8 + 2 + 5 = **≈ 45 s** | median ≤ 90 s |
| **Wild 1v1, recruit path** | weaken to < 25% without overkill (3 Heavy + Light / 2 Heavy + Light); at 20% HP + bait the odds are 63% → 1.6 expected attempts → **≈ 7 / ≈ 5.5 rounds** | 7×8 + 14×0.8 + 3.5 + 5 = **≈ 76 s** / 5.5×8 + 11×0.8 + 2.75 + 5 = **≈ 61 s** | median ≤ 90 s |
| **Wild 3v3** (8×8) | wild pool 3×58 = 174 → 15.6 / 9.3 player attack-turns; r1 ≈ 1 (contact distance 5), then ≤ 3 per round → **≈ 6 / ≈ 4 rounds**; ≈ 17 + 14 = 31 / 12 + 9 = 21 unit-turns | 17×6 + 31×0.8 + 3 + 3 (confirm) + 2 + 3 = **≈ 138 s** / 12×6 + 21×0.8 + 2 + 8 = **≈ 99 s** | median ≤ 3 min, p90 ≤ 5 min |
| **PvP 3v3** (8×8) | symmetric 174 pools, decaying with losses → **≈ 7 / ≈ 4.5 rounds**, ≈ 35 / ≈ 23 unit-turns (blended ≈ 5.5 rounds, ≈ 30) | 35×8.8 + 3.5 + 20 (deploy median) + 5 = **≈ 5.6 min** / 23×8.8 + 2.25 + 25 = **≈ 3.8 min** (blended ≈ 4.9 min) | median ≤ 6 min, p90 ≤ 9 min |
| **PvP 1v1** casual | ≈ 6 / ≈ 4 rounds × 2 unit-turns | 12×8.8 + 3 + 25 = **≈ 2.2 min** / 8×8.8 + 2 + 25 = **≈ 1.6 min** | ≤ 3 min |

The pessimistic (no-STAB) column is the one checked against targets. **PvP 3v3 pessimistic is 5.6 min against ≤ 6 min, a 0.4 min margin.** It is the first number the gate watches.

**Worst cases, stated honestly:**
- **PvP true AFK:** at most 4 × 30 s = **120 s** of dead air, then forfeit.
- **PvP legal max-stall** under the literal clock: both players submit at 29.9 s in all 3 windows of every unit-turn.
  - Surge bounds the match at **14 rounds**, so at most 84 unit-turns × 90 s = 126 min idle (63 min per player).
  - Adding 84×1.2 s playback, 14 s upkeep and 45 s deploy gives **≈ 128.7 min** in theory.
  - Under the Q1 cumulative alternative it would be 84 × 30 s = 42 min idle, **≈ 44.7 min** total.
- **One-sided stall:** ≈ 63 min of that player's own time (21 min under Q1's alternative).
- This exposure is inherent in D584.5's per-unit model combined with D583.2's reset-on-submit. It is surfaced here, not silently capped.
- **Knobs if telemetry shows abuse:**
  - Surge start (`SURGE_START`, tuning; no ruling touched).
  - The Q1 cumulative clock (operator sign-off).
  - A per-match idle bank (supplements a ruled parameter; operator sign-off; **not** adopted).
- **PvE:** no thinking clock. Wall time is bounded only against abandonment: a 300 s window, the deploy window, round 30, and disconnect.

**Gate:** `battle_summary` logs rounds, wall_ms, idle_ms, windows per unit-turn and autopasses from P1 day one. The cutover gate blocks unless the internal-eval medians land inside the targets above (§11, T10/T11).

---

## 11. Build-phase plan (inside the P1 → P2 big-bang; nothing ships until both are done; one release, D583.2 and D583.3)

Each step is eval-green before the next. The spine (rules → reducers) is serial. After it, client ‖ evals ‖ content run in parallel. Slicing and `touches:` are drafted at elaboration against the then-current tree.

**P1 — wild tactical core (internal build phase)**

| Step | Deliverable | Gate (evidence) |
|---|---|---|
| **T1** | `tactics::geometry`, `movement`, map RON schema + validator | golden geometry vectors (including the flank predicate with a ranged attacker); Dijkstra tie-break determinism on adversarial maps; **native = wasm byte-identity harness from this first PR** |
| **T2** | `economy`, `initiative`, `resolve` (§2.4 pipeline over carried `accuracy_check` + `calc_damage`), `upkeep`, `outcome` | property tests: no nova fits 6 AP; Guard eligibility; First-Stand (exhaustive max-burst round-1 sim, no pre-activation attack KO; Surge/status ticks unaffected); comparator total order; pipeline-order golden vectors; **0-HP re-proofs** (deploy-conscious-only, no-act-at-0, mid-turn KO, double-KO) |
| **T3** | `queue` (submit gate with submit-time costing including the tax, `validate_at_pop` with inventory re-read, halt-and-return, chain rule), `clock` (pure) | exhaustive transition evals (every state, every halt reason, the cancel-vs-TurnStart race, cross-round READY persistence, turn-skip void, shared-item second pop halts, `InvalidNow` rejects without reset, ≤ 4 stored entries); clock arithmetic (every window ≤ budget + pad; ≤ 3 windows per unit-turn; a zero-execution submit never resets) |
| **T4** | content: skill `tactics:` blocks + power retune, species `battler:`, 6 maps, pack tables, `tactics_tuning.ron`, lints | CI lints including the `dmg_ref` property at L5..=100; CONTENT_VERSION bump |
| **T5** | server `tactics` module: all §8.1 tables and views, 4 reducers, scheduled deadline + advance (PvE parameters, including the deploy window), GC, `battle_summary`; bindings regen; schema snapshot | **Privacy audit:** no public battle table; `battle_secret` / `battle_wild_unit` have no view; owner-only queue and deploy (two-identity eval). `is_in_ongoing_battle` holds for tactical rows including Deploying (trade ADR-0112, care/train ADR-0136, movement, evolution). **Deploying timeout** releases the interlock. Disconnect GC: wild → auto-flee, **persist damaged HP of all deployed units**, READY rows discarded; Deploying → closes as `Fled`. **Reducer-budget benchmark:** the §2.2 worst-case round (6 units, 8×8, Diamond(2) AoEs, 3-action plans, AI plans) runs as one transaction on the pinned host. The threshold is fixed at elaboration from that host's measured reducer limits. **rb-104 closes here.** |
| **T6** | `ai` (seed-free) + `encounter` (packs, clamp, per-wild seeds) | seed-free signature pinned by compile shape + eval; **intent parity eval** (client wasm plan == server plan on sampled frozen boards) |
| **T7** | recruit + flee port | adjacency, full budget, bait at 0 AP, quantized odds (shown == rolled), headroom pre-flight, recruited-lockout; **R-21r-a trio re-proven**; H1/H2 continuity from `battle_summary` |
| **T8** | `rewards` ledger + write-back funnel | XP split integer cases (solo, remainder, fainted forfeits); **essence-from-defeat preserved**; currency faucet per KO'd wild; recruit pays nothing |
| **T9** | client | board, cursor memory, overlays, live draft, queue strip + badges, forecast tiers (one provisional board, hit %), HUD keep-signals, event playback + caps + skip + reduced-motion, deploy confirm + formation, results, i18n en+fr, D-pad reachability audit |
| **T10** | wild e2e + match-length telemetry eval | §10 wild medians measured at both STAB mixes; BT1–BT6 + BT7 (PvE half) green |

**P2 — PvP tactical**

| Step | Deliverable | Gate |
|---|---|---|
| **T11** | challenge `format`, secret deploy (reveal-by-copy), PvP clock parameters (30 s window, reset on accepted submit, ≤ 3 windows, autopass 4 → forfeit), Surge, adjudication tuple, Forfeit, disconnect forfeit, `settle_pvp_battle` mapping (rating only + symmetric essence), animation-skip | two-context e2e: no `battle_queue` / `battle_deploy` / `battle_secret` row, and no unexecuted entry, ever reaches the opponent; AFK and plug-pull e2e; Surge termination ≤ r14 property; adjudication determinism; **BT7 PvP half**; §10 PvP medians measured |
| **T12 — cutover** | delete 1v1 reducers, screens and paths (hard replace); retire old tables in place; retire the 60 s PvP deadline reaper | full `just ci`, bindings-drift = 0, schema snapshot intact, e2e green, **combined BT1–BT7 end-to-end**, then the strict §10 playtest gate (D583.5) as go/no-go |

**Depth re-enable** (post-cutover, D583.1). Each wave is content plus one module, with no flow or schema rework, and each **re-runs the §10 gates**: depth may not buy back dead time.
- **D0 (cutover):** types, stats, status, carried accuracy.
- **D1:** M14 abilities (entry abilities fire on deploy; the M14.5h `apply_ko_switch_entry_abilities` logic is re-homed) **+ Swap/reserve** (4 AP; the entrant cannot act that round; it keeps First-Stand against attacks only).
- **D2:** weather/field (upkeep slot 3; the client weather view model carries over).
- **D3:** signature wave (b3's table as the content plan, from a closed exhaustive enum) + one 2×2-footprint evolution line.
- **P3** (operator-deferred): obstacles/cover/LoS activation, elevation, line/cone shapes. All are additive on the shipped columns and enum.

**Invariants re-proven (checklist, all gates):**
- r2 0-HP family (deploy, act, mid-turn KO, double-KO).
- `is_in_ongoing_battle` everywhere, including Deploying, and every phase time-bounded.
- ADR-0112 and ADR-0136 interlocks.
- ADR-0138 disconnect GC, including partial deployment.
- rb-104 wild bounds.
- R-21r-a faint penalty / terminal sweep / content-load.
- Essence-from-defeat.
- Recruit seed-rebuild at full HP, no XP, seed privacy.
- No public battle table; queue, deploy and secret read-path audit.
- Native = wasm byte identity on every `tactics` module.
- Clock bound (≤ 3 windows).
- Reducer-transaction bound.
- No item double-spend.
- Surge termination.
- Event GC preserves telemetry.
- Deletion cascade covers the new tables.
- H1/H2 still reporting.

---

## 12. Risks & open questions for elaboration

**Operator confirmations** (each default is the literal or carried reading; each alternative is one constant or one rule):

| # | Item | Default adopted | Alternative (operator sign-off required) |
|---|---|---|---|
| Q1 | "Clock resets the moment they submit a monster's actions" | **literal:** every accepted submit for the waiting unit starts a fresh 30 s window; a submit that executes nothing is rejected and resets nothing; ≤ 3 windows (90 s) per unit-turn by the AP floor | cumulative 30 s per unit-turn (cuts the PvP legal max-stall from ≈ 128.7 to ≈ 44.7 min); departs from the ruling's literal text |
| Q2 | "Invalid actions … are wasted" | halt-and-return: wasted actions never execute, no AP charged, the rest of the turn returns live | consume the nominal AP of the first invalid entry (one rule in `queue.rs`) |
| Q3 | Light power retuned to 20 (Heavies 65–75) to satisfy :417 under the carried affine `calc_damage` | adopted | AP 12 / Light 5 / Item 6 / Heavy 8 (b1's scale) |
| Q4 | Accuracy at cutover | **carried roll live** (D583.1 carries rules forward; its "types/stats/status only" list does not by itself authorize deleting a carried roll); hit % shown | dormant until D1 (a miss wastes a 4-AP Heavy: the [DS] "opaque RNG cancelling earned economy" lesson). Pacing cost of keeping it ≈ 3%. |
| Q5 | Carried ×2/×½ type multipliers | kept (D583.1) | **escalate** to ×3/2 / ×2/3 if trigger §12-F(c) fires (b3/b4/b6 evidence: CQ "counterpick solitaire") |
| Q6 | PvP: no XP, no currency; essence per KO symmetric | adopted (closes D10) | carry the current side-A-only funnel |
| Q7 | PvP disconnect = carried immediate forfeit | adopted | 60 s reconnect grace (b1/b4), a new scheduled reducer |
| Q8 | No Swap/reserve at cutover (1v1 had swap) | deferred to D1 | ship 4-AP Swap in P1 |
| Q9 | Move-undo in PvP (the sketch said "PvE only") | free, because live drafts are client-local and nothing reaches the opponent | restrict to PvE (no secrecy gain) |
| Q10 | Recruit needs 6/6 AP, so you must start the turn adjacent (literal :419) | adopted; Exhausted makes weakened wilds hold still | allow stride movement before Recruit (b3 reading) |

**Risks:**
1. **Idle-only clock and queue UX have zero reception precedent**, and the queue editor is the largest new input surface. *Mitigation:* live play degrades to a normal command menu, so mastering the queue is an optional speed-up. Submit latency, windows per unit-turn and pre-queue share are instrumented from T5.
2. **Big-bang concentration** (D583.2): no player-facing rollback. *Mitigation:* the internal wild loop is playable from T9; tables are retired, not dropped; the D5 playtest is go/no-go.
3. **Byte-identity across a much larger rule surface** (Dijkstra, comparator, pipeline). *Mitigation:* the T1 harness comes first; explicit tie-breaks; no HashMap iteration.
4. **Carried ×2 type plus STAB** can one-shot the frailest species after First-Stand expires (SE STAB Heavy 75 at L20 rolls 42–50 vs HP 50). *Mitigation:* Guard, the Heavy cap at 75, telemetry. The Q5 escalation trigger is §12-F(c).
5. **First-Stand is novel:** it may invite "strip the pips" alphas in PvP. Flagged for T11 measurement.
6. **Legal PvP slow-play** ≈ 128.7 min theoretical under the literal clock (§10). Knobs are listed; no deviation is smuggled in. Q1 is the operator's lever.
7. **Kiting residual** (mobile chip): measure the fast-ranged win rate and time-to-contact. Reserve lever: true ZoC stop.
8. **Map variety:** 6 maps at cutover is thin against Tier-1 lesson #8. Per-zone gimmick maps are the first content follow-up.
9. **Party-full recruit path** depends on existing storage/headroom semantics. Elaboration must confirm the overflow destination.
10. **M18 two-ally:** `battle_unit.side + owner` makes allies additive rows. The `my_battle` two-identity limit still applies to the *anchor* view and needs a participant-set view at M18.
11. **Reducer-transaction cost is unmeasured until T5.** The chain rule bounds work per transaction to one round (≤ 18 actions + upkeep), but the host's limit for that work is not yet known.
12. **Pacing margin:** the pessimistic PvP 3v3 median (5.6 min) sits 0.4 min inside the 6 min target. A modest rise in idle per unit-turn breaches it.

**Review findings rejected:**
- Finding 1 (partly): the review's 120 s per-unit-turn bound (4 windows) under the literal reading is rejected. With 6 AP and a 2-AP minimum per non-terminal submit, the submit in the third window spends the last 2 AP and ends the turn, so at most 3 windows fit (6 → 4 → 2), which is 90 s. The rest of the finding was accepted: the literal reading is now the default, and the unbounded halt-and-return re-entry it identified is closed by rejecting zero-execution live submits (`InvalidNow`, §2.3).

**F — falsifiable overturn conditions for this verdict** (any one reopens the named decision):
- (a) In ≥ 20 internal wild 3v3 battles the median exceeds 4 min, or PvP 3v3 exceeds 8 min → the AP/HP/power constants are wrong (retune). If at the same time queued turns are < 20% of player unit-turns, the queue-as-spine bet failed (UX redesign).
- (b) More than 30% of pre-queued plans halt → the Q2 waste semantics or the provisional-board UX is wrong.
- (c) More than 25% of post-round-1 KOs are single-hit super-effective → escalate Q5.
- (d) The operator picks the alternative for Q1, Q2, Q4 or Q10 → those sections are replaced by the listed alternatives. The rest stands because each is isolated.
- (e) A two-identity eval shows any queue, deploy or seed leak → the privacy design is falsified; stop the cutover.
- (f) The operator rules any element rejected below as compliant → its brainstormer's C1 score rises and the element is reconsidered on merit.
- (g) The T5 worst-case round exceeds the host threshold → replace the chain rule with one unit-turn per transaction (a `tactical_advance` row per TurnStart).
- (h) Internal PvP telemetry shows > 5% of unit-turns using a 3rd window, or any match exceeding 20 min → put Q1 to the operator with that data.

---

## 13. Attribution table

### 13.1 Evidence → scores (recorded before any verdict; provenance not used as evidence; the judge authored, advised and reviewed none of b1–b6)

**Asymmetry note:** b2 cited code facts and the others mostly did not. The judge independently verified the facts that mattered (the header of this document) rather than crediting assertions. All six were scored against the same refined versions.

**Final-pass note:** this pass applied an independent reviewer's findings to the judge's own synthesis. Each finding was accepted or rejected on the spec text and arithmetic, not on who raised it. The recorded scores below are unchanged. Two post-review observations bear on them:
- b3's cumulative clock (adopted in the draft) departs from D583.2's literal reset, so b3's C1 would score at or below its recorded value.
- b6's reset-reading now matches the default.

Neither observation changes the verdict, because no single candidate wins either way.

| Brainstormer | Key recorded observations | C1 ×.30 | C2 ×.20 | C3 ×.15 | C4 ×.10 | C5 ×.10 | C6 ×.10 | C7 ×.05 | **Weighted** |
|---|---|---|---|---|---|---|---|---|---|
| b1 | One submit/cancel surface; client-local live draft; seed-free AI pinned structurally; explicit, argued PvP-undo deviation; 12-AP per-tile pricing; honest 2 h worst case | 4 | 5 | 4 | 3 | 5 | 3 | 4 | **4.10** |
| b2 | Evidence ledger; DOA downgrade; stance-collapse; flank; structural deploy secrecy; match idle bank supplements a ruled parameter (flagged); replace-rights add a phase | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.95** |
| b3 | Speed → stride; ZoC; Exert; complete turn machine; one clock with two parameter sets; ×3/2 type deviation; 2×2 at cutover; dense terrain matrix | 3 | 4 | 3 | 5 | 4 | 3 | 3 | **3.50** |
| b4 | Time budget first; presentation constitution; event log; %-HP surge; bait at 0 AP; committed round-start AI queues (fizzle-bait exploit); ×3/2; bank | 3 | 4 | 5 | 3 | 4 | 4 | 4 | **3.75** |
| b5 | Strides; one projection source; `battle_seed` rowless table; reveal-by-copy; atomic Execute; invents a new damage formula replacing carried `calc_damage` (unflagged, against D583.1 and rules-once) | 3 | 5 | 4 | 4 | 5 | 4 | 4 | **4.00** |
| b6 | First-Stand; summing odds line items; ✓/~/✗ badges; drop-to-live remainder; comparator tuple; DEV-2 deletes speed from :416's named inputs (C1 violation); invented damage formula; ×3/2 | 2 | 4 | 4 | 4 | 4 | 5 | 3 | **3.45** |

**Verdict:** no single candidate clears the bar alone. The top two (b1 4.10, b5 4.00) each carry a disqualified or weaker element: b1's 12-AP readability, and b5's replaced damage formula. The **synthesis** adopts b1's single-surface spine, b5's stride economy and privacy mechanics, and b6's First-Stand and honesty UI, and repairs every C1 issue found, including, after review, the clock and accuracy readings.

### 13.2 Adopted / rejected per brainstormer

| | **ADOPTED** (where it landed) | **REJECTED** (why) |
|---|---|---|
| **b1** | Single `submit_queue` / `cancel_queue` surface and live play as a client-local draft that auto-submits on an irreversible action (§2.3, §9.3); free move-undo in both modes via draft editing (§9.3, Q9); `Executed/Skipped`-style event narration (→ `PlanHalted`, §8.1); firm / provisional / unknown honesty ladder (§9.3); **seed-free AI with no seed parameter + server-push escape hatch** (§4.2); remembered formation + singleton deploy-skip (§3.3); round-parity tie alternation (§2.2); non-resetting AFK strikes with pips (4/match) (§6.2); clock bound to the *waiting* unit only (§2.3); typed `AlreadyActing` cancel race (§2.3); `owner` + `side` split for M18 (§8.1); `battle_summary` + 24 h event GC (§8.1); one scheduled-reducer pattern for every deadline (§2.3, §8.1); content-computed lints idea (§4.1); wild round cap 30 (§3.7) | 12-AP budget with per-tile AP movement (reception: tiny pip budgets read best; strides are more legible); Guard as an explicit min-4-AP verb (replaced by automatic eligibility, §2.1.2); 40-round PvP cap with damage tiebreak (Surge terminates by r14 arithmetically); 9×9 maps (exceeds ≤ 8×8 guidance); Marsh terrain and Pack stance (rules density); 60 s PvP disconnect grace (constraint-5 carry-over kept; Q7); 60 s deploy clock (→ 45 s) |
| **b2** | Queue-IS-the-turn-system framing (§1); **unit-id target binding** (§2.3); DOA insight, generalized into halt-and-return (§2.3); **stance-collapse → Exhausted** (§4.2); **flank ×5/4 pincer** (§2.4); pinned damage-pipeline order (§2.4); deterministic full-turn whole-side Flee (§5a); structural deploy secrecy via owner-only staging (§3.3); storm concept (→ %-HP Surge, §6.4); own clock ring and live "Guard / End Turn" Start label (§9); battle-log ticker (§9.1); per-mille pack weights (§3.4); floor-displayed odds (§5); evidence-ledger discipline (to be reused at elaboration) | **Match idle bank** (180 s for 3v3 is exhausted by normal 8 s thinking; it supplements a ruled parameter; kept only as a flagged knob); once-per-skill rule (Exert covers it without a new verb rule); replace rights / bench reinforcement (pacing and rules density; Swap is in D1); max-range falloff (density; min-range lint instead); Brace "moved ≤ 2" gate (no-attack eligibility instead); flat storm (does not scale with level; b4's % form used); progress reaper (round cap is simpler); 10 AP; 9×7 maps |
| **b3** | **Speed → stride bands** (speed does double duty; keeps :416's speed input) (§2.1); movement-class × terrain table (trimmed to 4×3) (§2.1); **ZoC disengage tax** (+1, once per Move) (§2.1); **Exert / second-attack surcharge** (§2.1); one clock mechanism with PvE/PvP parameter sets (satisfies BT7) (§2.3); complete unit-turn state machine (§2.2); recruited monster not deployable this battle (§5); 2-skill distinct-geometry kits + role tag (§4.1); signature table as the D3 content plan (§11); multiplier-order golden vectors (§11 T2) | Cumulative per-unit-turn clock (adopted in the draft; review showed it inverts D583.2's literal reset; kept only as the Q1 operator alternative); no misses at cutover (deletes a carried rule; kept as the Q4 operator alternative); ×3/2 type cap (D583.1 carries the rules; escalated as Q5 instead); 2×2 footprint at cutover (pathing risk; D3); 8 AP; Forest cover and P1 LoS blockers (operator deferred obstacles/cover to P3); "fires into the air" AP consumption (punishes queuers; DS lesson); Aquatic start bonus; Lurker/Warden stances; round-15 storm / round-20 HP-sum end; recruit after movement (literal :419 kept; Q10) |
| **b4** | **Time-budget-first framing + presentation constitution** (caps, hold-B skip, reduced-motion, banner suppression on READY) (§9.4); **`battle_event` emitted only at execution** as the replay source (§6.3, §8.1); AI executed by the *same* queue executor (§4.2); **%-max-HP Surge, PvP only, r9+** (§6.4); no Surge in wild (§3.7); **pack clamp to deployable count** (§3.4); **bait as a 0-AP Recruit parameter** (§5); Fly exempt from disengage (§2.1); turn-skip status voids the queue (§2.2); hold-Y cancel (§9.2); flat 30 s cap, no decay (§6.2); 6 AP with 2/3/4 tiers (§2.1); PvP no XP (§7) | Committed round-start wild queues (players can bait wilds into fizzling every round, trivialising PvE; conflicts with halt-and-return; the AI decides at its TurnStart instead); AP bank cap 2 (alpha and density; Guard is the valve); skip-free no-reopen waste (replaced by halt-and-return); no deployment choice in PvP (secret slot assignment instead); ×3/2 type (Q5); playback-ack grace (P1 uses a deterministic pad; no client-trust surface); disconnect grace 60/120 s (Q7); decaying idle cap; hazard tiles (depth); opponent-visible ready dot (leaks pre-commitment) |
| **b5** | **Stride-quantized movement** (2 AP per stride, ≤ 2, two-band overlay) (§2.1, §9.1); **one provisional board shared by intent chips and forecast**, "assumes enemies hold" in PvP (§9.3); stance published on `battle_unit` (§8.1); **`battle_secret` rowless-to-clients seed table** (§8.1); **reveal-by-copy PvP deploy** (§3.3); **atomic single-transaction Execute** (§2.2; now bounded by the chain rule); reach-budget lint + ranged min-range 2 (§4.1); Guard rule shape: player-committed + no attack + ≥ 2 AP (§2.1.2); recruit headroom pre-flight at submit and execution (§5); deterministic `playback_ms` pad (§2.3); 45 s deploy clock (§3.3); `is_in_ongoing_battle` true during Deploy (§2.2); shown == rolled odds (§5); disconnect table structure (§3.7, §6.4) | **Invented damage formula** (replaces carried `calc_damage`: a D583.1 / rules-once violation; the carried formula is kept and power retuned instead); Baited thrown-bait status (3 AP raises the cost of baiting, contrary to :419; behaviour addition); strikes-with-decay (non-resetting is simpler and griefer-proof); round cap 15 + sudden death + damage-score tiebreak (Surge + adjudication instead); 8×6 maps; wild levels scaled to the deployed average (zone content owns levels; out of scope); authored stride field (derived from speed instead); opponent-visible ready lock; PvE with no clock machinery (BT7 is met via shared machinery instead); ranked 2v2 default (3v3 fixed) |
| **b6** | **First-Stand** (§2.4, §2.1.3; scoped to attack damage after review); **recruit odds line items that always sum** (§5, §9.3); **✓ / ~ / ✗ chip badges** (§9.3); UNDO/CANCEL mutual exclusion as a state indicator (§9.2); drop-to-live remainder (→ halt-and-return, §2.3); explicit initiative comparator tuple (§2.2); PvP stall-winner tuple (→ adjudication without draws, §6.4); match-total 4th-auto-pass forfeit (§6.2); both clocks visible to both players (§6.2); "Exert" naming (§2.1); cut-menu discipline and risk register (§12); splitmix per-wild seeds (§3.4); reset-on-submit with a 90 s per-unit-turn ceiling, adopted in substance (§2.3): the draft rejected it for the cumulative clock; after review the literal reset is the default, and the same 90 s ceiling falls out of the AP floor, so no separate token mechanism is needed | **DEV-2, speed removed from move cost** (deletes a named input of the operator's :416 directive: C1 gate); invented clamp damage formula (rules-once); DEV-3 ×3/2 (Q5); Focus (+10 initiative) and AP bank (P1 density); 6-AP Signatures at cutover (abilities by another name; D583.1); dash tiles (strides cover it); Fatigue applied to both modes (punishes the PvE recruit play the operator favours; Surge is PvP-only); PvE placement phase (remembered formation is faster); 4-AP Swap in P1 (D1) |

---

## 14. Pre-committed criteria (verbatim, as written in step 1 before opening any candidate)

```
PRE-COMMITTED CRITERIA (written before opening any candidate, 2026-10-24)
C1 Ruling compliance — GATE + 30%. Any element contradicting an operator ruling / binding constraint / standing recruit ruling in the spec is excluded regardless of other merit.
C2 Coherence of AP x round-order x queue x clock x forecast — 20%. One state machine; every interaction (queue waste, invalidation, KO mid-round, timeouts, ties) defined; no undefined transitions.
C3 Pacing arithmetic — 15%. Explicit integer math for wild / trainer / PvP match length that lands inside spec targets; blended (not best-case) assumptions.
C4 Species identity — 10%. Species read as tactically distinct through data (movement, range, footprint, terrain affinity, ability), not bespoke code per species.
C5 Netcode/determinism feasibility — 10%. Server-authoritative, deterministic resolution (seeded RNG, stable ordering), fits SpacetimeDB reducers/tables, PvP secrecy enforceable given RLS caveats.
C6 Readability for cozy D-pad audience — 10%. Low input count per turn, forecast before commit, few hidden rules, undo/edit affordances, controller-first.
C7 Build realism — 5%. Fits P1->P2 big-bang, reuses existing modules/invariants, bounded content cost, named invariants to re-prove.
Scoring 0-5 per criterion, weighted. Prefer measured/quoted evidence.
```

The criterion *topics* were supplied by the task. The weights and the 0–5 scale are the judge's own, added before any candidate was read. No criterion was added afterwards. The criteria file is saved at `/tmp/claude-1000/-home-mdrewt-projects-ai-apps-claude-harness/0bb488c1-73f7-419f-b667-7de9234f4c61/scratchpad/judge/criteria.txt`.
