# bt-2 plan — game-core `tactics::{tuning, economy, initiative, resolve, upkeep, outcome}` + golden join

Spec: `specs/monster-realm-v2/M-battle-tactics.spec.md` §bt-2 (BT2.1–BT2.10). Design: §2.1–§2.1.3, §2.2, §2.4, §6.4, §11 T2.
Worktree: `projects/monster-realm/.claude/worktrees/bt-2`, branch `slice/bt-2` from `origin/master` b9a3dd64.
Scope decision: ALL TEN gates (the spec's seam economy+initiative+tuning ‖ resolve+upkeep+outcome is 4‖6, and
deferring 6 > half is a sizing failure). Fallback if the budget tightens: DEFER BT2.10's double-KO half only.

## Shape (functional core only — no shell, no schema change, no content files, no server code)

```
game-core/src/tactics/mod.rs         + pub mod tuning, economy, initiative, resolve, upkeep, outcome; #[cfg(test)] mod *_tests; re-exports
game-core/src/tactics/tuning.rs      TacticsTuning (serde, deny_unknown_fields) + TacticsTuning::DESIGN + Default
game-core/src/tactics/economy.rs     Tier, Entry, TurnBudget, EconomyError, cost, spend, plan_cost, TurnEndCause, guard_granted, apply_guard, apply_flank
game-core/src/tactics/initiative.rs  Contender, TIE_SALT, round1_priority, priority_for_round, compare, order, eff_speed
game-core/src/tactics/resolve.rs     the MODEL (BattleKind, UnitState, SkillTactics, UnitKit, TacticalUnit, TacticalState, TacticalEvent,
                                     TargetResult) + splitmix64 + deploy_unit + can_act + turn_start/turn_end + damage_pipeline + resolve_attack
game-core/src/tactics/upkeep.rs      UpkeepStep, UPKEEP_ORDER, status_tick_damage, surge_damage, surges, run_upkeep
game-core/src/tactics/outcome.rs     StepSnapshot, Adjudication, BattleEndHow, adjudicate, sweep_kos, check_battle_end, end_battle
game-core/src/tactics/golden.rs      new GoldenCase/GoldenResult kinds (below)
game-core/tests/fixtures/tactics_golden.json   grows; CASE_COUNT/KINDS pins updated in golden_tests.rs + golden.parity.test.ts
client/src/tactics/golden.parity.test.ts       BT2.5 `it`s: new kinds present, byte-identity still holds
client-wasm/src/lib.rs               NO CHANGE expected (tactics_golden already runs run_golden over serde'd cases) — in touches, unused
game-core/src/lib.rs                 flat re-exports: resolve_attack, run_upkeep, TacticsTuning
evals/baselines/spacetime-types.json + BattleKind, UnitState (append; `node evals/spacetime-type-snapshot.eval.mjs --write`)
```
No new Cargo deps. No HashMap/HashSet/floats anywhere in tactics (bt-1's source-scan test still covers `tactics/*.rs`).
Carried functions REUSED BY VALUE (never re-implemented): `combat::damage::{calc_damage, accuracy_check}`,
`combat::type_chart::TypeChart`, `combat::types::{BattleMonster, BattleOutcome, StatusEffect, Effectiveness}`,
`combat::ability::StatusKind`, `content::SkillDef`, `monster::types::{StatBlock, Affinity}`, `crate::tick_seed`.
`resolve` builds `BattleMonster`/`SkillDef` VALUES from the view types to call `calc_damage` (empty name, pp 0,
sets_weather None, known_skill_ids empty) — the adapter, not a copy of the rule.

## Contracts (the tester writes against these exact names)

### tuning.rs
`#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)] #[serde(deny_unknown_fields)] pub struct TacticsTuning` fields, DESIGN values:
ap_turn 6 · move_stride_cost 2 · max_strides_per_turn 2 · disengage_tax 1 · light_cost 2 · heavy_cost 4 · exert_surcharge 2 ·
item_cost 3 · recruit_cost 6 · flee_cost 6 · end_turn_cost 0 · guard_min_ap 2 · guard_num 3 · guard_den 4 · flank_num 5 ·
flank_den 4 · surge_start_round: u16 = 9 · surge_pct_per_round 5 · wild_round_cap: u16 = 30 · pvp_window_ms: u32 = 30_000 ·
pve_window_ms 300_000 · pvp_deploy_ms 45_000 · pve_deploy_ms 300_000 · max_windows_per_turn 3 · autopass_forfeit 4 ·
pad_cap_ms 5_000. All u8 unless typed. `pub const DESIGN: TacticsTuning`; `impl Default` = DESIGN. (bt-6's RON must equal DESIGN.)

### economy.rs (self-contained: depends on tuning only)
- `pub enum Tier { Light, Heavy }`; `pub enum Entry { Move { strides: u8, taxed: bool }, Attack(Tier), Item, Recruit, Flee, EndTurn }`
  (Copy, Eq, Debug, serde).
- `pub struct TurnBudget { pub ap: u8, pub strides_used: u8, pub attacks: u8 }` (Copy, Eq, Default = all 0 = not yet activated);
  `TurnBudget::fresh(&TacticsTuning)` → ap = ap_turn, 0, 0.
- `pub enum EconomyError { ZeroStrides, StrideCap { used: u8, requested: u8, cap: u8 }, NeedsFullBudget { ap: u8, required: u8 },
  Unaffordable { cost: u8, ap: u8 } }`.
- `pub fn cost(entry: Entry, budget: &TurnBudget, t: &TacticsTuning) -> u8`: Move = strides·move_stride_cost + taxed·disengage_tax;
  Attack(Light) = light_cost (+ exert_surcharge iff budget.attacks ≥ 1); Attack(Heavy) = heavy_cost (+ exert likewise); Item = item_cost;
  Recruit = recruit_cost; Flee = flee_cost; EndTurn = end_turn_cost. u8 math saturating.
- `pub fn spend(budget: &mut TurnBudget, entry: Entry, t) -> Result<u8, EconomyError>` — checks in order: Move strides == 0 → ZeroStrides;
  Move strides_used + strides > max_strides_per_turn → StrideCap; Recruit/Flee with budget.ap != t.ap_turn → NeedsFullBudget;
  cost > ap → Unaffordable. Then ap −= cost, strides_used += strides, attacks += 1 for Attack. Returns the cost. Err ⇒ budget untouched.
- `pub fn plan_cost(entries: &[Entry], t) -> Result<u8, EconomyError>` — spend each from a fresh budget; total.
- `pub enum TurnEndCause { EndTurn, PreQueuedDrain, AiEnd, AutoPass }`; `pub fn committed(self) -> bool` (AutoPass → false).
- `pub fn guard_granted(cause: TurnEndCause, budget: &TurnBudget, last: Option<Entry>, t) -> bool`
  = cause.committed() ∧ budget.attacks == 0 ∧ budget.ap ≥ t.guard_min_ap ∧ last ∉ {Some(Recruit), Some(Flee)}.
- `pub fn apply_guard(damage: u16, t) -> u16` = 0 if damage == 0 else max(1, damage·guard_num/guard_den) (u32 math).
- `pub fn apply_flank(damage: u16, t) -> u16` = damage·flank_num/flank_den (u32 math, clamp u16::MAX).

### initiative.rs
- `pub struct Contender { pub id: u32, pub side: Side, pub slot: u8, pub eff_speed: u16, pub base_speed: u16 }` (Copy, Eq, serde).
- `pub const TIE_SALT: u64 = 0x5EED;`
- `pub fn round1_priority(kind: BattleKind, seed: u64) -> Side` — Wild → Side::A (the player side; bt-4 deploys the player as A);
  Pvp | Practice → `splitmix64(seed ^ TIE_SALT) & 1 == 0 ? A : B`.
- `pub fn priority_for_round(round1: Side, round: u16) -> Side` — alternates each round: round 1 → round1, 2 → other, …
  (`round.max(1)`; round 0 is treated as 1).
- `pub fn compare(a: &Contender, b: &Contender, priority: Side) -> Ordering` — key `(eff_speed desc, base_speed desc, tie_rank asc, slot asc)`,
  tie_rank = 0 iff side == priority. Total on (side, slot)-unique inputs (ids tie last by id asc as a safety net, documented).
- `pub fn order(contenders: &[Contender], priority: Side) -> Vec<u32>` — ids sorted by `compare`.
- `pub fn eff_speed(stats: &StatBlock, status: Option<&StatusEffect>) -> u16` — the carried speed after status modifiers; carried M14 has NO
  speed-modifying status, so this is `stats.speed` for every status (exhaustive match, documented as the single future hook).

### resolve.rs — the model + the §2.4 pipeline
- `pub fn splitmix64(x: u64) -> u64` = `crate::tick_seed(x, 0, 0)` (canonical splitmix64 next() from state x; splitmix64(0) = 0xE220_A839_7B1D_CDAF).
- Storage enums (append-only; `#[cfg_attr(feature = "spacetimedb", derive(spacetimedb::SpacetimeType))]`, Copy, Eq, serde, non-generic):
  `pub enum BattleKind { Wild, Pvp, Practice }`, `pub enum UnitState { Active, Fainted, Recruited }`.
- `pub struct SkillTactics { pub skill_id: u32, pub tier: Tier, pub affinity: Affinity, pub power: u16, pub accuracy: u8,
  pub applies_status: Option<StatusKind>, pub geometry: SkillGeometry }` (Clone, Eq, serde).
- `pub struct UnitKit { pub species_id: u32, pub affinity: Affinity, pub level: u8, pub stats: StatBlock, pub base_speed: u16,
  pub class: MoveClass, pub skills: Vec<SkillTactics> }` — max_hp = stats.hp; stride = stride_for_base_speed(base_speed).
- `pub struct TacticalUnit { pub id: u32, pub side: Side, pub slot: u8, pub kit: UnitKit, pub pos: Cell, pub cur_hp: u16,
  pub status: Option<StatusEffect>, pub budget: TurnBudget, pub guard: bool, pub first_stand: bool, pub state: UnitState }`
  + `max_hp()`, `is_conscious()` (= state == Active ∧ cur_hp > 0), `stride()`.
- `pub enum DeployError { Fainted { id: u32 }, ZeroMaxHp { id: u32 }, ZeroDefense { id: u32 } }`
  `pub fn deploy_unit(id, side, slot, pos, kit: UnitKit, cur_hp: u16) -> Result<TacticalUnit, DeployError>` — cur_hp == 0 → Fainted (reject,
  never clamp); stats.hp == 0 → ZeroMaxHp; stats.defense == 0 → ZeroDefense (calc_damage precondition). Sets first_stand = true,
  state Active, guard false, budget Default (idle until TurnStart), cur_hp = min(cur_hp, max_hp)?? NO — cur_hp > max_hp → `DeployError::HpAboveMax { id }`.
- `pub struct TacticalState { pub kind: BattleKind, pub seed: u64, pub action_seq: u64, pub round: u16, pub width: u8, pub height: u8,
  pub terrain: Vec<Terrain>, pub units: Vec<TacticalUnit>, pub initiative: Vec<u32>, pub turn_idx: u8, pub queued: Vec<u32>,
  pub attack_damage_dealt: [u32; 2], pub outcome: BattleOutcome }` (Clone, Eq, serde).
  `TacticalState::new(kind, seed, map: &BattleMapDef, units: Vec<TacticalUnit>) -> Self` — round 1, action_seq 0, initiative built,
  turn_idx 0, queued empty, outcome Ongoing. `board(&self) -> Board` (units → BoardUnit{alive = is_conscious}). `unit(id)`, `unit_mut(id)`.
  `tie_priority(&self) -> Side` = priority_for_round(round1_priority(kind, seed), round). `contenders(&self) -> Vec<Contender>` (conscious units).
  `rebuild_initiative(&mut self)` = initiative::order(contenders, tie_priority); turn_idx = 0.
  `remove_from_initiative(&mut self, id) -> bool` — also drops `id` from `queued`; decrements turn_idx when the removed index < turn_idx.
  `queued` = ids holding a READY plan on the server (bt-3 persists the rows; game-core needs only the ids so a KO voids the plan visibly).
- `pub enum ActError { UnknownUnit(u32), Fainted(u32), Recruited(u32), BattleOver }`; `pub fn can_act(state, id) -> Result<(), ActError>`
  (order: BattleOver → UnknownUnit → Recruited → Fainted(state Fainted OR cur_hp == 0)).
- `pub fn turn_start(state, id, t) -> Result<(), ActError>` — budget = fresh, guard = false, first_stand = false (an auto-pass still ran TurnStart).
- `pub fn turn_end(state, id, cause: TurnEndCause, last: Option<Entry>, t) -> Result<bool, ActError>` — sets unit.guard = guard_granted(…); returns it.
- `pub struct TargetResult { pub unit: u32, pub hit: bool, pub damage: u16, pub effectiveness: Option<Effectiveness>, pub flank: bool,
  pub guard: bool, pub stood_ground: bool, pub ko: bool, pub status: Option<StatusEffect> }` (miss ⇒ damage 0, effectiveness None, flags false).
- `pub enum TacticalEvent { Executed { attacker: u32, skill_id: u32, results: Vec<TargetResult> }, Missed { attacker: u32, target: u32 },
  StoodGround { unit: u32 }, StatusApplied { unit: u32, status: StatusEffect }, StatusTick { unit: u32, status: StatusEffect, amount: u16 },
  StatusCured { unit: u32, status: StatusEffect }, Surge { round: u16, unit: u32, amount: u16 }, Ko { unit: u32 }, QueueVoided { unit: u32 },
  BattleEnd { outcome: BattleOutcome, how: BattleEndHow } }` (Clone, Eq, serde; exhaustive — NOT non_exhaustive).
- `pub struct PipelineTrace { pub hit: bool, pub d0: u16, pub d1: u16, pub d2: u16, pub d3: u16, pub effectiveness: Effectiveness,
  pub applied: u16, pub hp_after: u16, pub stood_ground: bool }`
  `pub struct RollPair { pub accuracy: u8, pub variance: u8 }` (in resolve.rs; golden re-uses it);
  `pub fn draw_rolls(state: &mut TacticalState) -> RollPair` — accuracy = (splitmix64(seed ^ action_seq) % 100) as u8, action_seq += 1;
  variance = 85 + (splitmix64(seed ^ action_seq) % 16) as u8, action_seq += 1.
  `pub fn damage_pipeline(attacker: &TacticalUnit, target: &TacticalUnit, skill: &SkillTactics, chart: &TypeChart, flank: bool,
  rolls: RollPair, t) -> PipelineTrace` — PURE (no mutation): hit = accuracy_check(skill.accuracy, rolls.accuracy); miss ⇒ all zero,
  hp_after = cur_hp; else d0 = calc_damage(att_bm, def_bm, skilldef, chart, variance, None).0; d1 = flank ? apply_flank(d0) : d0;
  d2 = target.guard ? apply_guard(d1) : d1; d3 = Immune ? 0 : max(d2, 1); First-Stand: target.first_stand ∧ d3 ≥ cur_hp ⇒ hp_after = 1,
  stood_ground = true, applied = cur_hp − 1; else hp_after = cur_hp − d3 (saturating), applied = min(d3, cur_hp).
- `pub enum ResolveError { Act(ActError), UnknownSkill { unit: u32, skill_id: u32 }, Geometry(GeometryError), Economy(EconomyError) }`
- `pub struct AttackOutcome { pub events: Vec<TacticalEvent>, pub ap_spent: u8, pub actor_fainted: bool, pub battle_over: bool }`
- `pub fn resolve_attack(state: &mut TacticalState, attacker: u32, skill_id: u32, aim: Cell, chart: &TypeChart, t) -> Result<AttackOutcome, ResolveError>`
  Order (an Err leaves state byte-identical — 0 AP, no rolls drawn):
  1. snapshot = StepSnapshot::capture(state); 2. can_act(attacker) → Act; 3. skill ∈ attacker.kit.skills → UnknownSkill;
  4. targets = target_set(&skill.geometry, attacker, aim, &state.board()) → Geometry; 5. spend(budget, Attack(skill.tier)) → Economy (ap_spent = cost);
  6. per target IN target_set ORDER: acc = (splitmix64(seed ^ action_seq) % 100) as u8, action_seq += 1; var = 85 + (splitmix64(seed ^ action_seq) % 16) as u8,
     action_seq += 1 (both ALWAYS drawn, hit or miss); flank = is_flanked(attacker, target.pos, &board.units) (board captured once before the loop —
     flank is evaluated on the pre-attack board); trace = damage_pipeline(…); apply: target.cur_hp = hp_after, first_stand cleared on stood_ground,
     attack_damage_dealt[attacker.side] += applied; ko = hp_after == 0; status: hit ∧ !Immune ∧ !ko ∧ target.status.is_none() ∧ skill.applies_status
     ⇒ target.status = Some(carried mapping; Sleep { turns_remaining: 3 }) + StatusApplied; miss ⇒ Missed event (no status, no damage).
  7. events = [Executed{results}] ++ per-target detail events in target order (Missed | StoodGround, StatusApplied) ++ sweep_kos(state)
     ++ check_battle_end(state, &snapshot) → end_battle. 8. actor_fainted = attacker.state == Fainted; battle_over = outcome != Ongoing.
  A self-hit through an `All`-filter AoE goes through the same pipeline (First-Stand/Guard apply to the actor as to any target).

### upkeep.rs
- `pub enum UpkeepStep { StatusTicks, Surge, DepthWave, KoSweep, StatusExpiry, RoundCaps, NextRound }` and
  `pub const UPKEEP_ORDER: [UpkeepStep; 7]` in exactly that order; `run_upkeep` iterates UPKEEP_ORDER with an exhaustive match.
- `pub fn status_tick_damage(status: &StatusEffect, max_hp: u16) -> Option<u16>` — Poison max_hp/8 (min 1), Burn max_hp/16 (min 1), others None.
  M14 VALUES: `combat::status::{poison,burn}_dot_amount` are private to a file outside touches; a tactics test pins equality against the carried
  PUBLIC `apply_post_turn_effects` (executed, over max_hp 1..=2000) so the two homes cannot drift; bt-17 retires the 1v1 copy.
- `pub fn surges(kind: BattleKind) -> bool` — Pvp | Practice → true (design §6.1: Practice uses the PvP ruleset); Wild → false.
- `pub fn surge_damage(max_hp: u16, round: u16, t) -> Option<u16>` — None if round < surge_start_round; else
  max(1, max_hp · surge_pct_per_round · (round + 1 − surge_start_round) / 100) (u32 math; = max_hp×5×(r−8)/100 at DESIGN).
- `pub fn run_upkeep(state: &mut TacticalState, t) -> Vec<TacticalEvent>` — no-op (empty) when outcome != Ongoing. snapshot at upkeep start.
  StatusTicks: for id in this round's `initiative` order, conscious units with Poison/Burn: cur_hp −= amount (saturating), StatusTick.
  Surge: if surges(kind) ∧ surge_damage is Some: every conscious unit in initiative order: cur_hp −= amount, Surge{round, unit, amount}
  (true damage: no Guard, no First-Stand — the pipeline is not involved). DepthWave: no-op. KoSweep: sweep_kos + check_battle_end(snapshot)
  → end_battle; if ended RETURN (later steps skipped). StatusExpiry: conscious units in initiative order: Sleep{n} → n−1, 0 ⇒ status None +
  StatusCured; Freeze → roll = (splitmix64(seed ^ action_seq) % 100), action_seq += 1, roll ≥ 80 ⇒ cured (carried thaw rule); others persist.
  RoundCaps: kind == Wild ∧ round == wild_round_cap ⇒ end_battle(Fled, RoundCap), RETURN. NextRound: round = round.saturating_add(1);
  rebuild_initiative().

### outcome.rs
- `pub struct StepSnapshot { pub hp_pct: [u32; 2], pub conscious: [u8; 2] }`; `StepSnapshot::capture(&TacticalState)` — per side (A = 0, B = 1):
  hp_pct = Σ over units with state Active of floor(cur_hp·100/max_hp) (per-unit floor); conscious = count of is_conscious().
- `pub enum Adjudication { HpPercent, Conscious, DamageDealt, Coin }` — which tuple element decided.
- `pub fn adjudicate(state, snap) -> (Side, Adjudication)` — higher hp_pct → higher conscious → higher attack_damage_dealt →
  `splitmix64(seed ^ u64::from(round)) & 1` (0 → A, 1 → B). Never Ongoing/Fled.
- `pub enum BattleEndHow { SideEmpty, Adjudicated(Adjudication), FixedOrder, RoundCap }` (Copy, Eq, serde).
- `pub fn sweep_kos(state) -> Vec<TacticalEvent>` — every unit with state Active ∧ cur_hp == 0 (in `units` order): state = Fainted,
  remove_from_initiative (drops it from `queued` too); events Ko{unit} then QueueVoided{unit} iff it was queued.
- `pub fn check_battle_end(state, snap) -> Option<(BattleOutcome, BattleEndHow)>` — a_alive = any conscious on A, b_alive likewise:
  both alive → None; only B empty → (SideAWins, SideEmpty); only A empty → (SideBWins, SideEmpty); both empty: Pvp | Practice →
  adjudicate → (winner, Adjudicated(why)); Wild → the standing r2 ruling (ADR-0156 R5: fixed [A, B] evaluation, the first side found empty
  loses, no Draw) → (SideBWins, FixedOrder). Does not mutate.
- `pub fn end_battle(state, outcome, how) -> TacticalEvent` — sets state.outcome (never overwrites a decided outcome), returns BattleEnd.
- `BattleOutcome` gains NO variant: the exhaustive 4-arm matches in ranking.rs/battle_core_tests.rs and the type-snapshot baseline stay as-is.

### golden.rs — new kinds (every rule above joins the harness; ALL outputs are ≤ u32 so JS Number is exact; u64 INPUTS stay < 2^53)
GoldenCase += `Rolls { seed: u64, action_seq: u64, draws: u8 }` → `Rolls(Vec<RollPair { accuracy: u8, variance: u8 }>)` (the per-target stream);
`Economy { entries: Vec<Entry> }` → `Economy(Result<u8, EconomyError>)` (plan_cost at DESIGN); `Guard { damage: u16 }` → `Guard(u16)`;
`FlankDamage { damage: u16 }` → `FlankDamage(u16)`; `SurgeDamage { max_hp: u16, round: u16 }` → `SurgeDamage(Option<u16>)`;
`StatusTick { status: StatusEffect, max_hp: u16 }` → `StatusTick(Option<u16>)`; `Initiative { contenders: Vec<Contender>, priority: Side }` →
`Initiative(Vec<u32>)`; `Priority { kind: BattleKind, seed: u64, round: u16 }` → `Priority(Side)`;
`Pipeline { attacker: TacticalUnit, target: TacticalUnit, skill: SkillTactics, flank: bool, rolls: RollPair }` → `Pipeline(PipelineTrace)`;
`Resolve { battle: GoldenBattle, attacker: u32, skill_id: u32, aim: Cell }` → `Resolve(Result<BattleTrace, ResolveError>)`;
`Upkeep { battle: GoldenBattle }` → `Upkeep(BattleTrace)`; `Adjudicate { battle: GoldenBattle }` → `Adjudicate((Side, Adjudication))`.
`GoldenBattle { kind, seed, action_seq, round, rows: Vec<String>, units: Vec<TacticalUnit>, queued: Vec<u32>, attack_damage_dealt: [u32; 2] }`
→ TacticalState via the same glyph board as GoldenBoard (malformed ⇒ BadCase). `BattleTrace { events: Vec<TacticalEvent>,
units: Vec<UnitAfter { id, cur_hp, state, status, guard, first_stand, ap }>, round: u16, initiative: Vec<u32>, action_seq: u64?? NO — u64 output;
use `draws: u32` = action_seq delta }`, outcome: BattleOutcome }`. Pipeline/Resolve use `TypeChart::new(&load_type_chart())` (embedded content).
Native golden_tests + vitest pins (CASE_COUNT, KINDS, BAD_CASE_COUNT) updated by the tester.

## Test files and naming (CHECK filters depend on this)
Every gating test name starts `bt2_<k>_` (k = criterion number, `bt2_10_` for BT2.10). Files: `tuning_tests.rs`, `economy_tests.rs`,
`initiative_tests.rs`, `resolve_tests.rs`, `upkeep_tests.rs`, `outcome_tests.rs`, `golden_tests.rs` (+ vitest `it` titles beginning `BT2.5`).
A criterion's tests may span files (BT2.3 Guard: economy + resolve + upkeep; BT2.6: resolve + upkeep; BT2.10: resolve + outcome) — the ledger
CHECK filters `tactics::.*::bt2_<k>_` across the whole module.
Required teeth per gate (the tester may add more):
- BT2.1 every cost at DESIGN AND at a perturbed tuning (proves the value is READ); EndTurn 0; disengage +1 once per Move; stride cap across entries.
- BT2.2 exhaustive enumeration of every sequence ≤ 4 over the alphabet {Move1, Move1 taxed, Move2, Light, Heavy, Item, Recruit, Flee, EndTurn}:
  Ok(total ≤ 6) ∧ attacks ≥ 2 ⇒ the attacks are exactly [Light, Light] and the sequence has no Move/Item; Heavy+Light = 8 and Heavy+Heavy = 10 Err.
- BT2.3 guard_granted full truth table (4 causes × attacks × ap × last); apply_guard vectors incl. 1 → 1, 4 → 3, 0 → 0; Guard halves nothing
  twice (set twice stays one flag; pipeline applies ×3/4 once); cleared by turn_start; StatusTick/Surge amounts identical with guard true/false.
- BT2.4 proptest: compare is a total order (antisymmetric, transitive, trichotomous) on distinct (side, slot); exact-order vectors for each key
  level; priority alternation across rounds; Wild round 1 = A; PvP coin from splitmix64(seed ^ 0x5EED) & 1 (vectors); a mid-round speed change
  leaves `initiative` untouched until rebuild; remove_from_initiative keeps turn_idx on the actor.
- BT2.5 pipeline vectors with every intermediate pinned (d0..d3) incl. flank-then-guard ordering (a case where ×5/4 then ×3/4 ≠ ×3/4 then ×5/4 by floor);
  immune → 0 even with flank/guard/First-Stand; per-target rolls differ (AoE of 2+ targets) and the stream advances 2 per target (action_seq);
  miss: AP spent, attacks += 1, no status, Missed emitted, hp unchanged; Err paths leave state identical and draw nothing; golden kinds present.
- BT2.6 First-Stand saves at 1 HP with StoodGround and clears; a 2nd lethal hit after the save KOs (spec: the flag clears on save); turn_start clears
  it without damage; StatusTick/Surge ignore it (take hp to 0); the EXHAUSTIVE SIM: for every (attacker species, target species) of the live 20-species
  roster at every level 5..=100 (derive_stats with zero IV/EV, neutral nature) with the P1 kit bound (Light 20 / Heavy 75, STAB, super-effective
  ×2, flank, variance 100, no Guard), the single-unit nova (Heavy; Light+Light) from full HP never KOs a first_stand unit. (Multi-attacker bursts
  CAN KO after the save — by the spec's clear-on-save; flagged in the PR.)
- BT2.7 UPKEEP_ORDER equals the design list; an event-order test on a crafted state (poisoned units, PvP r ≥ 9, a Sleep{1}, a Freeze with a
  thaw roll) shows ticks (initiative order) → Surge → Ko → StatusCured → round += 1 + rebuilt initiative; a KO during ticks is swept once; a
  battle ending in the sweep skips expiry/caps/next-round; resolve_attack runs the battle-end check (BattleEnd emitted by the attack itself).
- BT2.8 surge_damage vectors (r 8 → None, r 9 → 5 %, r 14 → 30 %, min 1); Wild never surges at any round; Surge bypasses Guard and First-Stand;
  exhaustive max_hp 1..=u16::MAX: Σ_{r=9}^{14} surge_damage ≥ max_hp; proptest PvP states (any hp) run through upkeep from r = 1 with no actions
  → outcome != Ongoing by the end of round 14.
- BT2.9 each tuple level decides when the earlier ones tie (vectors), the coin from splitmix64(seed ^ round) & 1; outcome is SideAWins|SideBWins only;
  an exhaustive 4-arm match on BattleOutcome compiles; Wild double-KO → SideBWins + FixedOrder.
- BT2.10 deploy_unit rejects cur_hp 0 (and never clamps); can_act/turn_start/resolve_attack refuse a 0-HP or Fainted unit; a mid-turn KO drops
  the unit from `initiative` and `queued` with Ko + QueueVoided; an `All` AoE that KOs the actor → actor_fainted ∧ can_act Err; PvE double-KO → r2
  (SideBWins); PvP double-KO → adjudication.

## Gate CHECK sketch
`cargo nextest run -p game-core -E 'test(/^tactics::.*::bt2_<k>_/)' 2>&1` → EXPECT `/ N tests run: N passed/` (exact N pinned after red).
BT2.5 = native + `just wasm` + the vitest file via `--reporter=json` with exact numPassedTests and 0 failed/pending (BT1.9 shape).

## Anti-patterns avoided
HashMap/HashSet/floats; panics on bad input (typed errors; a bad fixture is BadCase); clamping (0-HP deploy is rejected, HP above max rejected);
re-implementing calc_damage/accuracy_check/the type chart; wall clock / ambient RNG (the stream is splitmix64(seed ^ action_seq) with the seq in
state); a TS copy of any rule; `#[non_exhaustive]` on the event enum (exhaustive matches are the OCP gate); growing `BattleOutcome`.

## Judgement calls (PR-flagged)
1. First-Stand clears when it saves (EARS literal) ⇒ a second lethal attacker before activation CAN KO; the "exhaustive max-burst" sim is the
   single-unit nova bound of §2.1.3 (one Heavy or two Lights), where no pre-activation KO exists for any roster pair at any level.
2. PvE (Wild) double-KO = ADR-0156 R5 fixed-order ruling ⇒ SideBWins (the player side A is evaluated first and found empty). Practice follows PvP.
3. Adjudication Σ cur_hp×100/max_hp uses a per-unit floor; "cumulative attack damage dealt" counts HP actually removed by attacks (after
   First-Stand's clamp), not the pipeline's d3.
4. M14 status values (1/8, 1/16, Sleep 3 turns, Freeze thaw ≥ 80, Paralysis never ticks) re-stated in tactics because the carried fns are private
   to `combat/status.rs` (outside touches); pinned equal by executing the carried public API. eff_speed = stats.speed (no carried speed status).
5. The rolls stream draws accuracy AND variance for every target, hit or miss (fixed consumption ⇒ simpler parity and forecast).
6. Freeze thaw in upkeep draws from the private stream (one draw per frozen unit, initiative order).
7. `TacticalState.queued` (READY ids only) exists so BT2.10's "plan voided with a visible event" is a game-core rule; bt-3 owns the rows.
8. Geometry/affordability errors from resolve_attack are "invalid entry" (0 AP, no draws) — bt-3's validate_at_pop re-checks before calling.

## AMENDMENTS after plan review (BINDING — override the sections above where they differ)
A1 (Surge, BT2.8 — spec erratum). The spec's `max_hp × 5 × (r − 8) / 100` (floor, min 1) does NOT terminate every match by
   round 14: Σ_{r=9}^{14} is 16 for max_hp 19 (a level-5 base-HP-45 monster), 36 for 39, 78 for 79 — the six floors each lose
   up to 1. The formula is implemented EXACTLY as specified (u64 intermediates, saturating to u16::MAX; `round + 1 − start`
   with u32 math). The termination property proves the TRUE bound: every PvP match terminates by the end of round 15 (the
   exhaustive sweep over max_hp 1..=65535 shows Σ_{r=9}^{15} ≥ max_hp), and a vector test documents the r14 counterexamples
   (19 → 16, 39 → 36, 79 → 78). Ruling asked of the operator (ceil formula keeps "by 14"; or amend the claim to 15) — recorded
   via mr-ask-drew, non-blocking; the default stands until ruled. Surge vectors must include max_hp 19 at r 11–14.
A2 (First-Stand, BT2.6 — spec tension). EARS literal: the flag CLEARS when it saves, so a second lethal attacker before
   activation can KO; the "exhaustive max-burst round-1 simulation" is the SINGLE-UNIT nova bound of design §2.1.3 (one Heavy,
   or Light + Light) over every ordered roster pair at every level 5..=100 with every multiplier maxed: no pre-activation KO.
   Tests pin the ruled behaviour: a 2nd lethal hit after the save KOs; a non-first_stand unit takes a lethal hit and KOs (no
   unconditional clamp); First-Stand untouched by a miss, an immune hit or a non-lethal hit. Ruling asked (keep clear-on-save +
   amend §2.1.3 wording, or persist until first TurnStart) via mr-ask-drew, non-blocking.
A3 (economy overflow). All AP arithmetic is u16 or saturating; the StrideCap check precedes any multiplication;
   `Move{strides: 255}` and `strides_used 2 + 254` are typed `Err(StrideCap{..})` with exact payloads, never a trap.
A4 (one validation site). `TacticalState::new(..) -> Result<Self, DeployError>`: every unit through `validate_unit`
   (Fainted → HpAboveMax → ZeroDefense), then set checks DuplicateId{id}, DuplicateSlot{side, slot}, BadPosition{id}
   (off-map or shared tile), EmptySide{side}; then `units` canonicalised to (side, slot) order. `ZeroMaxHp` dropped
   (unreachable). `deploy_unit` runs `validate_unit`. Golden `Pipeline` validates both units (else BadCase).
A5 (turn_idx removed). bt-3 owns the cursor. "Frozen except removals" is proven as: after any public call the initiative is a
   subsequence of the round-start list.
A6 (Guard input). `TurnBudget` gains `last: Option<Entry>`, set by `spend` on every Ok entry except `EndTurn`.
   `guard_granted(cause, &budget, t)`; `turn_end(state, id, cause, t)` reads the budget for Guard, then resets it to
   `TurnBudget::default()` (idle) — a post-turn `resolve_attack` is `Economy(Unaffordable{ap: 0, ..})`.
A7 (pinned behaviours). `TargetResult.damage` = HP actually removed (`applied`). An empty target set is Ok: AP spent,
   attacks += 1, 0 draws, `Executed{results: []}`. `attack_damage_dealt[attacker.side]` counts ONLY targets with
   `target.side != attacker.side`; ticks and Surge add nothing. Flank is evaluated on the pre-attack board (judgement 9).
   There is NO status-chance roll (carried `applies_status` has no chance): exactly 2 draws per target, plus 1 per frozen
   unit at expiry. `Ko` events follow the canonical `units` order. `TargetResult` = {unit, hit, damage, effectiveness, flank,
   guard, ko}; StoodGround/StatusApplied are events only. `AttackOutcome` = {events, ap_spent} (actor KO / battle over are
   read from state).
A8 (settle SSOT). `outcome::settle(state, &snap) -> Vec<TacticalEvent>` = sweep_kos → check_battle_end → end_battle; called
   by `resolve_attack`, by upkeep step 4, and by bt-3 after every non-attack entry. `adjudicate(&snap, attack_damage_dealt,
   seed, round)` takes scalars. Snapshots at resolve-entry start and at upkeep start (before ticks and Surge).
A9 (BT2.2 two-sided). The enumeration compares `plan_cost` against an INDEPENDENT closed-form oracle for every sequence
   (Ok/Err and exact payload); Ok ∧ attacks ≥ 2 ⇒ attacks == [Light, Light] (EndTurn allowed); `[Light, Light]` = Ok(6);
   total is permutation-invariant over Move/Attack/Item; `[Heavy, Light]` = `Unaffordable{cost: 4, ap: 2}`.
A10 (carried status values). Poison 1/8 and Burn 1/16 stay re-stated in `status_tick_damage`, pinned by executing the carried
   PUBLIC `apply_post_turn_effects` (StatusDamage.amount) over max_hp 1..=65535 (other statuses: none). Sleep/Freeze expiry
   CALLS the carried public `tick_status` through a scratch one-slot `BattleStatusStore` + `StatusVariance` (adapter, no copy):
   Sleep{0|1} → cured, Sleep{2} → Sleep{1}, Freeze thaws at roll 80 not 79. Sleep application `turns_remaining: 3` pinned via
   the public `resolve_turn`. Residual for bt-17: delete the 1v1 copies and these pins together.
A11 (golden scope). Kinds added: `Rolls`, `Economy{start, entries}`, `SurgeDamage`, `StatusTick`, `Initiative`, `Priority`,
   `Pipeline`, `Adjudicate{snapshot, attack_damage_dealt, seed, round}`. Dropped: Guard, FlankDamage (visible as d1/d2),
   Resolve, Upkeep, GoldenBattle, UnitAfter, BattleTrace (BT4.8/BT11.7 may add whole-battle kinds). `Pipeline` uses
   `load_type_chart().map_err(..)?`; the live chart has NO immune pair, so Immune is native-only with a hand-built
   `TypeChart::new(&[TypeRelation{effectiveness: 0, ..}])`. Existing pins to update: KINDS roster, BadCase-capable roster
   (+ Pipeline), CASE_COUNT, BAD_CASE_COUNT.
A12 (tuning). `TacticsTuning::validate() -> Result<(), TuningError>` (ZeroGuardDen → ZeroFlankDen → ZeroApTurn). NO `impl
   Default` (callers name DESIGN or load content). RoundCaps uses `round >= wild_round_cap`. `draw_rolls` wraps action_seq.
A13 (layout). `BattleKind` lives in `tuning.rs` with `uses_pvp_rules()` (Pvp | Practice) — the single home of that mapping;
   `upkeep::surges` dropped. Helpers `battle_monster_of`, `skill_def_of`, `board_unit_of`, `side_index`, `winner_outcome` are
   `pub(crate)`. `UpkeepStep`/`UPKEEP_ORDER` dropped (straight-line code; the event-order test proves the order).
   `initiative::eff_speed` dropped (`contenders()` passes `stats.speed`; the single documented hook).
A14 `plan_cost(start: &TurnBudget, entries, t)`.
A15 Plan text above reconciled by these amendments where they conflict (effectiveness is `Option<Effectiveness>` in
   PipelineTrace; HpAboveMax carries {id, cur_hp, max_hp}).
A16 (decision record). docs/DECISIONS.md is outside bt-2's touches; the conventions go in the PR body and into bt-3's
   DECISIONS entry (handoff note): Side::A is the player in Wild; coin bit 0 → A; Practice uses PvP rules; Wild double-KO is
   SideBWins (FixedOrder); both rolls drawn per target; flank on the pre-attack board; the Surge and First-Stand rulings.
A17 Dropped tests: the `BattleOutcome` 4-arm match (already pinned by ranking.rs, battle_core_tests.rs, the type baseline).
A18 (test naming, standards/testing-tdd.md). Names lead with the behaviour; the criterion tag is a TRAILING token
   `_bt2_<k>` (e.g. `heavy_plus_light_is_unaffordable_bt2_2`). Ledger CHECKs filter `test(/_bt2_<k>$/)`. A test proving two
   criteria carries the primary one; write a second test for the other.
A19 Out of bt-2's scope, stated explicitly: turn-skip statuses (Sleep/Freeze blocking a turn) and the Paralysis action roll are
   bt-3 TurnStart concerns; ARCHITECTURE.md's tactics row is a doc-keeper follow-up (outside touches).
Judgement 9: flank is evaluated on the pre-attack board (an ally KO'd earlier in the same AoE loop still counts as a flanker).
