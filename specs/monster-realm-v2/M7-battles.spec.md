# Spec: M7 — Turn-based battles (server-resolved, PvP-ready)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M6.
**Decisions:** ADR-0010 (proof-of-teeth), 0011 (server-resolved, no prediction), 0015 (RLS), 0017 (battle
data & turn model). **Workflow:** harvest v1 M7 chapter → draft → review (§7).

## 1. Problem / intent

Add turn-based battles built on the same functional-core / server-authority spine — but with one
deliberate simplification: **battles are server-resolved with NO client prediction** (animation hides the
round-trip, so there are no damage/faint rollbacks to reconcile — far simpler netcode than movement;
ADR-0011/0013 smoothness is N/A here). The client submits *intent* (a skill id, a swap index); the server
computes the outcome via `game-core` and the client animates the authoritative `BattleState`. Success = a
readable 1v1-active battle (speed-ordered, data-driven type chart, auto-switch on faint, voluntary swap,
visible XP), HP that **persists** to the monster row, and a `battle` table designed so **M16 PvP is purely
additive**.

## 2. Scope

**In scope**
- **`game-core` `combat/` module** (pure, deterministic — variance injected): `BattleState`/`BattleSide`/
  `BattleMonster`; the **integer, float-free `damage`** formula + data-driven `TypeChart`/`Effectiveness`
  (read from `type_relation` content); three resolution rules emitting an ordered `Vec<BattleEvent>` —
  `resolve_turn` (both sides attack in speed order), `resolve_enemy_turn` (player took a non-attack action →
  only the wild acts), `resolve_player_swap` (switch active, then the wild hits the monster sent in); enemy
  AI `pick_best_skill`; `battle_xp_reward`.
- **`battle` table** (public, **RLS to participant(s)**; ADR-0017): synthetic **`battle_id` pk (auto_inc)**;
  indexed **`player_identity` + `opponent_identity`** (PvE: equal, a self-sentinel; PvP/raid differ — wired
  in M16/M18, additive); the whole `BattleState` as one column (**in a table**, not memory → **resumable on
  reconnect** + subscribable); `party_monster_ids`/`opponent_monster_ids`
  (per-side HP write-back); `last_events` (turn log), `last_xp_gain`/`leveled_up`; **reserved**
  `wild_ivs`/`wild_nature` (M8 recruit rebuilds the exact wild).
- **Reducers** (thin, ownership/legality-validated): `start_battle` (M7 dev/test trigger vs a rolled wild of
  a species — the **real grass trigger is M8**); `submit_attack(skill_id)`, `swap_active(team_index)`,
  `flee`; each delegates resolution to `game-core`, writes `BattleState` back, **writes `current_hp` back to
  the `monster` rows** (re-verifying ownership), and grants XP on win (level³, M6). Auto-switch on faint.
- **Battle view** (frontend `battle` screen, M4): a **server-driven** overlay that animates `BattleState`
  from the subscription and submits intent — **no prediction**; routed **before** the movement gate (M4
  robustness) so it can always be exited.
- **`heal_party`** placeholder (free full heal) — an explicit placeholder until town healing locations (M12).

**Out of scope (named deferrals)**
- **Grass encounters / wild capture (recruit)** → M8 (M7 starts battles via a dev trigger). **Training/care**
  → M9. **Evolution/fusion** → M10.
- **Battle depth** (status effects, abilities/auras, multi-active 3v3, weather) → **M14** (the readable core
  here is intentionally shallow; `resolve_turn` stays additive so M14 layers on it).
- **PvP / raids** → M16/M18 (the table + `resolve_turn` are built symmetric/additive so those are
  orchestration, not a re-key).

## 3. Acceptance criteria (EARS)

**Resolution rules (`game-core`)**
- WHEN `resolve_turn` runs with both sides choosing an attack THE SYSTEM SHALL resolve attacks in **speed
  order**, compute **integer** damage scaled by the data-driven type chart, and emit an ordered
  `Vec<BattleEvent>` (damage, faint, …); same `(state, choices, variance)` ⇒ same result (determinism).
- WHEN the active monster faints THE SYSTEM SHALL **auto-switch** to the next conscious party member; IF a
  side has no conscious member THEN the battle ends with that side defeated.
- WHEN the player swaps (`resolve_player_swap`) THE SYSTEM SHALL switch the active then let the wild hit the
  monster sent in (the swap costs the turn).
- WHEN a battle is won THE SYSTEM SHALL award XP via `battle_xp_reward` and drive the level³ curve, setting
  `leveled_up`/`last_xp_gain` for the client to show.

**Reducers (server-authoritative, ADR-0011)**
- WHEN a player submits a battle action THE SYSTEM SHALL accept only **intent** (a skill id / swap index /
  flee) and compute the outcome server-side; it SHALL NEVER accept a client-supplied damage/HP/outcome.
- IF the action is illegal (not your battle / battle over / active doesn't know the skill / swap index out
  of range, is the current active, or is fainted) THEN THE SYSTEM SHALL reject with `Err` (never clamp).
- WHEN a turn resolves THE SYSTEM SHALL write `current_hp` back to the `monster` rows (re-verifying
  `owner_identity` against current state, not the battle-time snapshot) — HP **persists** between battles.

**Privacy & PvP-readiness (ADR-0015/0017) + proof-of-teeth (ADR-0010)**
- THE SYSTEM SHALL deliver a `battle` row only to its participant(s) (RLS `player_identity = :sender OR
  opponent_identity = :sender`); a non-participant receives nothing (privacy eval + fixture).
- THE `battle` table SHALL key on a synthetic `battle_id` with an indexed `opponent_identity` from the
  start, so M16 PvP shares one row **additively** (a schema-snapshot eval forbids a later non-additive
  re-key).

**View (no prediction)**
- THE battle overlay SHALL animate the authoritative `BattleState` from the subscription with **no client
  prediction**, submit intent only, and be exitable before the movement gate.

## 4. Plan (high level)
- **`game-core/combat`** is the rule center (pure, property-tested): damage is integer-only (determinism —
  no float divergence); the type chart is data (read from `type_relation`); `resolve_turn` is **symmetric**
  (both sides choose, speed order) so PvP reuses it unchanged.
- **Thin reducers:** lookup → validate (`ctx.sender` owns the battle/monster; legality) → `game-core` →
  write `BattleState` + HP write-back + XP. No battle logic in a reducer or TS.
- **No prediction:** the client submits and animates; there is no `client-wasm` battle export and no
  reconcile — much simpler than movement, by design.
- **`current_hp` persistence:** stored on the `monster` row; written back each turn; `heal_party` restores
  it (placeholder).

**Boundary preview — what M8 (taming) will consume:** `start_battle` from a grass step (replacing the dev
trigger); the battle's reserved `wild_ivs`/`wild_nature` (so recruit rebuilds *that exact* wild);
`current_hp` (recruit odds rise as the wild weakens). What M16/M18 consume: the symmetric `resolve_turn` +
the `opponent_identity`-keyed shared row (additive).

## 5. Tasks (M7a rules, M7b server, M7c view)
- [x] `game-core/combat`: `BattleState` types + integer damage + `TypeChart` + `resolve_turn`/`resolve_enemy_turn`/`resolve_player_swap` + AI + XP reward; unit/property tests + determinism. — DONE (M7a, commit aae9c56)
- [x] `battle` table (RLS, `battle_id` pk + `opponent_identity` index, PvP-ready) + schema-snapshot/append-only evals. — DONE PR #8 (M7b)
- [x] reducers: `start_battle` (dev trigger), `submit_attack`/`swap_active`/`flee`, HP write-back, XP grant; security-auditor + proof-of-teeth (illegal action rejected; non-participant sees nothing). — DONE PR #8 (M7b)
- [x] battle view (M4 `battle` screen) — server-driven, no prediction, exit-before-gate. — DONE PR #9 (M7c)
- [x] `heal_party` placeholder; doc-keeper changelog + memory; link combat in `ARCHITECTURE.md`. — DONE PR #9 (M7c)

## 6. Risks / decisions
- **PvP-ready keying now (decided — design-for-endpoint)** — synthetic `battle_id` + `opponent_identity`
  (PvE self-sentinel) so M16 is additive; v1 flagged the per-player keying as "a breaking change free now,
  a migration later."
- **Battle depth deferred to M14 (default, flagged at checkpoint)** — readable 1v1-active core now; status/
  abilities/multi-active layer on additively. `resolve_turn` must stay additive (M14 must not rewrite it).
- **No prediction for battles** — deliberate; animation hides the RTT; no rollback netcode (ADR-0011).
- **`heal_party` is a free placeholder** — proper healing is content (a town location + cost/cooldown, M12),
  a design decision not a code fix; in-battle healing is rejected so it doesn't affect the M8 weaken loop.
- **Open:** damage-formula weights, AI heuristic, starter skill sets → data, tunable.

## 7. Review / red-team notes
### Tutorial harvest (v1 M7 chapter + ARCHITECTURE)
Adopted: **battles need no prediction** (the "gift" — server-resolved, animation hides the RTT); the
**integer damage** formula (no float desync); data-driven type chart; speed-ordered `resolve_turn` +
`resolve_enemy_turn` + `resolve_player_swap`; auto-switch + voluntary swap-costs-the-turn; HP persists +
written back with re-verified ownership; event-based turn log; XP on win. **v2 design-for-endpoint:** the
`battle` table is **PvP-ready from M7** (`battle_id` pk + `opponent_identity`), so M16 is additive, not v1's
post-hoc re-key.
### Red-team
- **Client-computed damage/HP** → intent-only reducers; the server derives everything; auditor + fixture.
- **HP write-back trusting the battle-time snapshot** → re-verify `owner_identity` against current state.
- **A later non-additive battle re-key** → schema-snapshot eval forbids it (the keying is right now).
- **Battle row leaking to non-participants** → RLS to participant(s) + privacy fixture.
### Simplify
1v1 active core; depth deferred to M14 (additively); no prediction; dev start trigger (grass is M8).
