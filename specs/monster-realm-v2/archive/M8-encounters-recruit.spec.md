# Spec: M8 — Grass encounters & recruit-by-weaken

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M7.
**Decisions:** ADR-0006 (content), 0007 (zoned), 0010 (proof-of-teeth), 0011 (server-paced tick), 0015
(private/RLS visibility), 0017 (battle model), **0045** (wild individuality private side-table — M8c resolution). **Workflow:**
harvest v1 M8 chapter → draft → review (§7).

## 1. Problem / intent

Close the **find → tame** loop: step into tall grass, trigger a data-driven wild encounter, weaken it,
and recruit it — *that exact* individual. Everything stays server-authoritative and data-driven: spawn
tables are **private** (hidden from cheaters), the trigger lives in the server's movement tick, and the
recruited monster is rebuilt from the individuality the battle already stored (M7). Success = grass steps
spawn weighted wilds; recruit odds rise as the wild weakens (plus optional bait); success adds *that exact*
monster to your box at full HP; failure forfeits the turn.

## 2. Scope

**In scope**
- **`game-core` `taming/` module** (pure, deterministic — rolls injected): `EncounterTable` (weighted,
  level-ranged) + `roll_encounter` + the free `encounter_triggers(roll)`; the recruit odds rule
  `recruit_chance(max_hp, current_hp, base_rate, bait_bonus)` + `attempt_recruit`; the `Item` template use
  for bait (**"bait" = any item with `recruit_bonus > 0`** — classify by data, not a magic id).
- **Map grows a tall-grass layer:** `TileKind::TallGrass` (the M1 exhaustive `match` flags every site);
  `TileMap` gains grass info; the `zone_map()` wasm export + the M4 renderer grow to draw grass (additive).
- **`encounter` table (PRIVATE — server-only, never `public`):** per-zone weighted spawn table
  (`#[index(btree)] zone_id`); seeded from RON via `sync_content`; the client never receives it.
- **Grass trigger in the per-zone `movement_tick`:** when a character *steps into* a grass tile, roll
  `encounter_triggers`; if triggered, roll the wild (species from the zone's `encounter` rows +
  `roll_individuality`) and start a wild battle storing the rolled `individuality_seed` in a
  **private `battle_wild` side-table** keyed by `battle_id` (NOT as columns on the public `battle`
  row — ADR-0045; `battle` is public per ADR-0042, and raw IV/seed data must never reach a client
  per ADR-0015).
- **Recruit action** (in-battle reducer): `attempt_recruit` — validate it's the player's wild battle and
  not over; consume one bait if used (`consume_one`); roll `recruit_chance` from the wild's `current_hp`;
  **on success** rebuild *that exact* wild from the battle-row individuality → grant a `monster` (owned by
  `ctx.sender`) at full HP and end the battle; **on failure** the wild strikes back (forfeit the turn).
- **Bait items** (`recruit_bonus > 0`) as content; the battle view gains a recruit/bait action.

**Out of scope (named deferrals)**
- **Training/care** (food spend, bond gameplay) → M9 (the bait/food *templates* + item helpers may be
  shared; the training gameplay is M9). **Evolution/fusion** → M10. **Multi-zone encounter authoring** → M11.

## 3. Acceptance criteria (EARS)

**Rules (`game-core`)**
- WHEN a grass step is rolled THE SYSTEM SHALL decide an encounter via `encounter_triggers(roll)` and, if
  triggered, pick a species by the **weighted, level-ranged** `EncounterTable` for that zone — deterministic
  for a given seed.
- WHEN `recruit_chance(max_hp, current_hp, base_rate, bait_bonus)` is computed THE SYSTEM SHALL rise as
  `current_hp` falls (missing-HP fraction × a factor, on top of the species base rate, plus bait), cap at
  certainty, and guard divide-by-zero (`max_hp.max(1)`); total and deterministic, with boundary tests
  (full < half < near-dead, the cap, zero-HP). **Weakening, not luck, is the lever.**

**Trigger & encounter (server, ADR-0011)**
- WHEN a **player** character **enters a new grass tile** (position actually changed *onto* grass — **not**
  standing still in grass, **not** bumping a wall while facing grass) THE SYSTEM SHALL, inside the per-zone
  `movement_tick`, **roll the cheap probability first** and only on a hit read the zone's `encounter` table
  and start a wild `battle` storing the rolled wild individuality (`wild_ivs`/`wild_nature`); NPCs
  (no `player` row) and a character already in a battle SHALL NOT trigger. One `begin_encounter` backs both
  this grass path and a manual `start_battle` (one implementation, two callers).
- THE `encounter` table SHALL be **private** (no client subscription); IF a client subscribes to it THEN it
  receives nothing (privacy proof-of-teeth — spawn weights/odds stay hidden).

**Recruit (server-authoritative)**
- WHEN `attempt_recruit` succeeds THE SYSTEM SHALL rebuild the wild from the `individuality_seed` stored in
  the private `battle_wild` side-table (keyed by `battle_id`) — so it is *that exact* monster — grant it to
  `ctx.sender` at full HP, and end the battle; IF bait was used it SHALL be `consume_one`'d first.
- IF `attempt_recruit` is called on a non-owned/over/non-wild battle, or without owned bait when bait is
  specified, THEN THE SYSTEM SHALL reject with `Err`; on a failed roll the wild SHALL strike back (turn
  forfeited).

## 4. Plan (high level)
- **`game-core/taming`** holds the rules (pure, property-tested); the rolls come from `ctx.rng()` injected
  server-side (determinism gate). The map's grass layer is shared verbatim (wasm export + renderer).
- **Trigger** is additive on the M2 per-zone tick (a grass-step branch) and the M7 `start_battle` path
  (storing wild individuality). **Recruit** is additive on the M7 battle (a new in-battle action) + M9-style
  item helpers (`grant_item`/`consume_one`, one stack, saturating).
- **Privacy:** `encounter` is the **second visibility mode** (fully private/server-only) — the simplest of
  ADR-0015's three modes; a proof-of-teeth confirms it never reaches a client.

**Boundary preview — what M9 (raising) will consume:** the `item` helpers (`grant_item`/`consume_one`,
saturating, one-stack) generalized to training food; the box of recruited monsters with `training`/`bond`
fields to grow; `current_hp` persistence.

## 5. Tasks
- [ ] `game-core/taming`: `EncounterTable` + `roll_encounter`/`encounter_triggers` + `recruit_chance`/`attempt_recruit`; unit/property + determinism tests.
- [ ] Map grass layer (`TileKind::TallGrass`) + `zone_map`/renderer growth; M1 exhaustive-match updates.
- [ ] `encounter` private table + `sync_content` seeding (per-zone, indexed) + privacy proof-of-teeth.
- [ ] Grass trigger in `movement_tick` → `start_battle` with wild individuality; security-auditor.
- [ ] `attempt_recruit` reducer (bait classify-by-data, rebuild-exact-wild, full-HP grant, fail-strikes-back) + fixtures.
- [ ] Battle view recruit/bait action; doc-keeper changelog + memory.

## 6. Risks / decisions
- **`encounter` must be private** — a public spawn table is a cheat surface; enforce + proof-of-teeth.
- **Rebuild the *exact* wild** from the stored `individuality_seed` (not a fresh roll) — otherwise recruit
  returns a different monster than the one you fought (a feel/trust bug). **M8c resolution (ADR-0045):**
  the seed is stored in a private `battle_wild` side-table (1:1 keyed by `battle_id`), NOT on the public
  `battle` row — `battle` is client-subscribable (ADR-0042) and raw RNG-derived genes are must-never-leak
  (ADR-0015). `roll_individuality(seed)` is pure/deterministic so the seed is the SSOT; M8d reads it to
  rebuild the exact wild. Storing only the seed (not expanded IV columns) also keeps the table SSOT-clean.
- **Classify bait by data** (`recruit_bonus > 0`) on both client and server — a hard-coded item id drifts.
- **Probabilistic e2e** (recruit/encounter) must be **bounded + robust** (cap the loop, field a tanky
  monster to survive), never an unbounded retry.
- **Open:** encounter weights, recruit base rates, bait bonuses → data, tunable.

## 7. Review / red-team notes
### Tutorial harvest (v1 M8 chapter + ARCHITECTURE)
Adopted: grass tiles + the **private** per-zone `encounter` table; the trigger inside the movement tick;
recruit-by-weaken odds rising with HP loss + bait; **rebuild the exact wild** from stored individuality;
fail-forfeits-the-turn; **classify bait by data** not a magic id; bounded/robust probabilistic tests. All
additive on the M1 map (grass), M2 tick (trigger), and M7 battle (wild fields) — the v2 foresight paid off.
### Red-team
- Spawn-table leak → private table + fixture. · Recruit returning a *different* monster → rebuild from the
  reserved battle-row individuality. · Magic-id bait drift → data predicate both sides. · Flaky random e2e →
  bound + make the inner action reliable.
### Simplify
No training/evolution here (templates/fields reused later); the map change is one additive `TileKind`.
