# Spec: M12 — NPCs, dialogue & quests

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M11.
**Decisions:** ADR-0006 (content), 0007 (zoned), 0010 (proof-of-teeth), 0011 (tick), 0015 (owner RLS), 0021
(dialogue & quest system). **No v1 precedent for quests** (NPCs partial) — designed from standards + v2
patterns. **Workflow:** design → review (§7).

## 1. Problem / intent

Populate the authored world (M11) with **NPCs** that wander and **talk**, **data-driven dialogue**, and a
**quest/flag system** that gives the world purpose — plus **towns** with **healing locations** that finally
resolve the `heal_party` placeholder (M7). All server-authoritative and data-driven. Success = NPCs wander
deterministically in their zones; talking to one runs a data-driven dialogue evaluated against your quest
flags; quests advance/complete server-side and grant rewards; a town healing spot restores your party at a
cost/cooldown.

## 2. Scope

**In scope**
- **`game-core`:** **`npc_decide`** (the pure, seeded NPC-wander rule deferred from M1/M2 — home + wander
  radius, deterministic); a **dialogue** model (data-driven trees: nodes, choices, conditions on quest
  flags, effects); a **quest/flag** model in `game-core/quest/` (quest definitions: steps/conditions/
  rewards; pure advance rules over a player's flags/progress).
- **NPC entity:** an `npc` role row (entity/component split — a `character` row + an `npc` row, in a zone via
  authored data), driven by `npc_decide` inside the **per-zone `movement_tick`** (additive on M2).
- **Content:** RON dialogue trees + quest definitions (`sync_content`, validated: no dangling dialogue/quest/
  flag refs; append-only ids).
- **`player_quest` table** (public, **RLS owner-scoped**): a player's quest flags/progress.
- **Reducers:** `talk(npc_id)` / `advance_dialogue(choice)` (server-evaluated against flags; may set flags /
  grant rewards via the M9 item helpers); quest-advance hooks (talk/defeat/collect triggers). Ownership +
  legality validated.
- **Towns & healing:** authored town zones (M11) with NPCs + a **healing location** (a tile/building) →
  `heal_party` becomes a real action with a **cost/cooldown** (replacing the free placeholder).
- **Frontend:** a `dialogue` screen (M4 `ScreenManager`, overlay-before-gate) + a quest-log view; NPCs render
  as characters (existing).

**Out of scope (named deferrals)**
- **Shops/currency** → M13 (NPCs here can *point* at a shop; the economy is M13). **Trainer/PvP battles via
  NPCs** → M16 (an NPC could start a battle using M7's path additively). **Branching cutscenes/scripting
  language** → YAGNI (data trees suffice).

## 3. Acceptance criteria (EARS)

**NPC wander (`game-core`, ADR-0011)**
- WHEN the per-zone tick runs THE SYSTEM SHALL drive each NPC via `npc_decide` (home + wander radius, seeded)
  deterministically; NPCs move by the same `apply_move`/tick path as players (server-authoritative).

**Dialogue & quests (ADR-0021)**
- WHEN a player talks to an NPC THE SYSTEM SHALL run the data-driven dialogue **server-side**, evaluating
  branches against the player's quest flags, and apply node effects (set flags, grant rewards) atomically.
- WHEN a quest condition is met (talk/defeat/collect) THE SYSTEM SHALL advance/complete the quest and grant
  its reward via the M9 item helpers (XP/items now; **currency** rewards become available **additively at
  M13**, since currency is introduced there); quest state is per-player and **owner-private** (RLS).
- IF a dialogue/quest references a non-existent node/flag/reward THEN `validate_content` SHALL fail (fixture).

**Healing (resolves M7 placeholder)**
- WHEN a player uses a town healing location THE SYSTEM SHALL restore the party's `current_hp` subject to a
  **cost/cooldown** (content), server-validated; in-battle healing remains rejected (M7).

**Security & privacy**
- IF a `talk`/`advance_dialogue`/quest reducer is called with a spoofed identity or for another player's
  state THEN THE SYSTEM SHALL reject (identity from `ctx.sender`); `player_quest` reaches only its owner
  (privacy fixture).

## 4. Plan (high level)
- **`game-core/quest`** holds pure advance rules; dialogue evaluation is pure over `(tree, flags, choice)`.
  NPC wander is `npc_decide` (finally built — the entity/component split makes the NPC a cheap role row).
- **Server** runs dialogue/quest evaluation (never the client — flags gate content + rewards). Rewards route
  through the M9 `grant_item` helpers (XP/items; currency rewards additive once M13 lands).
- **Healing** is content (a location + cost/cooldown), the proper resolution of the M7 placeholder.

**Boundary preview — what M13 will consume:** town shop NPCs + the dialogue entry to a shop screen; quest
rewards in currency; the item/inventory backbone (M9) extended with currency (M13).

## 5. Tasks
- [x] `game-core`: `npc_decide` + dialogue model + quest/flag rules; unit/property + determinism tests. DONE (PR #78, M12a, ADR-0068).
- [x] `npc` entity + per-zone-tick wander (additive); content (dialogue/quests RON) + `validate_content` + fixtures. DONE (PR #79 M12b ADR-0069, PR #81 M12c ADR-0070 — NPC zone policy + RT-ADV-01 fix).
- [x] `player_quest` (RLS) + `talk`/`advance_dialogue`/`dismiss_dialogue`/quest-advance reducers (server-evaluated, reward via helpers) + security/privacy fixtures. DONE (PR #79 M12b, PR #81 M12c — npc-dialogue-quest-security eval 10 checks; `dismiss_dialogue` clears `player_dialogue_state` and carries the same F1/F2/F7 guards as `advance_dialogue`).
- [x] Town healing location → `heal_party` with cost/cooldown (replaces the placeholder). DONE (PR #79, M12b).
- [x] Frontend dialogue screen + quest log; doc-keeper changelog + memory; update M7 (`heal_party` resolved). DONE (PR #83, M12d, ADR-0071).
- [x] Reconcile M1/M2 note: `npc_decide` now exists (the deferral from M1 is closed here). DONE (PR #78, M12a — non-commutative hash closes M1/M2 deferral; ARCHITECTURE.md updated).

## 6. Risks / decisions
- **Quest system depth = flag-based (default, flagged for the M14 checkpoint)** — flags + progress over
  data-driven trees handle fetch/talk/defeat quests; a richer state-machine/branching-cutscene system is a
  possible later enhancement. Chosen for autonomy; revisit at the checkpoint.
- **Server-evaluated dialogue/quests** — flags gate content and rewards, so a client can't grant itself a
  reward; never evaluate quest logic client-side.
- **Healing cost/cooldown** is content — resolves M7's free placeholder (a design decision now made).
- **Open:** dialogue tree schema, quest reward types, heal cost/cooldown → data, tunable.

## 7. Review / red-team notes
### Design notes (NPCs partial in v1; quests/dialogue new — designed from standards)
NPCs reuse the entity/component split + `npc_decide` (the M1/M2 deferral, now closed). Dialogue/quests are
**data, not code** (ADR-0021) — the difference between a scalable content game and hardcoded special cases.
Server evaluation keeps rewards cheat-proof. Healing becomes content (the proper M7 resolution).
### Red-team
- Client granting itself a quest reward → server-evaluated flags + reward via guarded helpers. · Dangling
  dialogue/quest refs → `validate_content` + fixtures. · `player_quest` leak → RLS + privacy fixture. ·
  Free infinite healing → cost/cooldown content + in-battle-heal still rejected.
### Simplify
Flag-based quests + data dialogue trees (no scripting language); NPC is a cheap role row; healing is content.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
