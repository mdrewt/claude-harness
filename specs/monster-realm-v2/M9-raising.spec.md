# Spec: M9 — Raising (focus-training + care)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M8.
**Decisions:** ADR-0006 (content), 0010 (proof-of-teeth), 0015 (owner RLS), 0016 (derive-on-write), 0018
(inventory/item model). **Workflow:** harvest v1 M9 chapter → draft → review (§7).

## 1. Problem / intent

Let players **grow** a monster actively: **focus-training** (spend food to nudge a stat) and **care**
(raise bond). Both deepen individuality and feed evolution (M10). The item economy primitive introduced
here (`player_item`, one-stack saturating helpers) is the **backbone the economy (M13) and item-trade
(M15) reuse** — built once, correctly, now. Success = consuming a training food re-derives the monster's
stats server-side; care raises bond; item quantities are owner-private and overflow-safe.

## 2. Scope

**In scope**
- **Design constraint — active only, no idle/offline growth:** every bit of growth is a **deliberate,
  validated action** (train/care/battle), server-checked for cost + cooldown. There is deliberately **no
  timer that accrues stats/bond over time** — this keeps the game honest (no afk-farming) and makes
  investment feel earned.
- **`game-core` `raising/` module** (pure): a focus-training rule (a food grants **EVs** toward a stat,
  respecting a **per-stat cap (e.g. 252) and a total cap (e.g. 510)** — the IV/EV model, ADR-0016 — then
  `derive_stats` re-run, M6 single-source) and a care rule (bond increase, capped). Deterministic; no
  clock/RNG read directly (cooldown time comes from `ctx.timestamp` in the reducer, not the rule).
- **`player_item` table** (public, **RLS owner-scoped** — ADR-0015) — owned item quantities, one stack per
  `(owner, item_id)`.
- **Item helpers (ADR-0018):** `grant_item` (merge into the existing stack, `saturating_add(..).min(CAP)`)
  and `consume_one` (decrement, **delete at zero**) — the **only** item-mutation paths (no naive insert/`+=`).
- **Reducers:** `train(monster_id, food_item_id)` (validate ownership + owned food → `consume_one` →
  re-derive) and `care(monster_id)` (raise bond, optionally via a care item) — both ownership-validated,
  reject-not-clamp.
- **Inventory + raising UI** (frontend): an item/inventory view + train/care actions; a pure subscription
  view calling ownership-checked reducers.

**Out of scope (named deferrals)**
- **Shops / currency / buying-selling** → M13 (this milestone builds the inventory primitive; the *economy*
  is M13). **Evolution/fusion** → M10 (training/bond here become evolution inputs there). **Item trading**
  → M15 (reuses the `player_item` + escrow backbone). **Town healing** (replacing `heal_party`) → M12.

## 3. Acceptance criteria (EARS)

**Rules (`game-core`)**
- WHEN a focus-training food is applied AND the target stat has headroom THE SYSTEM SHALL add EVs up to the
  per-stat and total caps (**fill-to-cap / top-off**, never overflow) and re-`derive_stats`; IF the stat is
  **already at its cap** THEN the rule SHALL return `Err` so the reducer can **reject and NOT consume the
  food** (reject-vs-clamp drawn precisely where it serves the player — a near-cap food tops off; a maxed
  stat doesn't eat the item for nothing).
- THE training reducer SHALL **validate-and-apply the rule *before* consuming** the food (fallible work
  before the irreversible spend; one transaction rolls back cleanly on `Err`).
- WHEN care is applied THE SYSTEM SHALL raise `bond` by a capped amount; both rules are deterministic.

**Care cooldown (server-authoritative)**
- WHEN `care` is called THE SYSTEM SHALL gate it by a **per-monster cooldown** measured from
  `ctx.timestamp` (`last_care_at_ms` on the row — a client clock is never trusted); IF the monster is at max
  bond THE SYSTEM SHALL reject **before** burning the cooldown; IF the cooldown has not elapsed THEN reject
  with `Err`.
- THE SYSTEM SHALL have **no idle/offline accrual** path for stats or bond (active-only — a privacy/economy
  property: an idle timer would invite afk-farming).

**Items (ADR-0018) + privacy (ADR-0015)**
- WHEN an item is granted THE SYSTEM SHALL merge into the player's single stack using
  `saturating_add(..).min(MAX_ITEM_STACK)` (no overflow, no second stack); WHEN spent it SHALL `consume_one`
  and **delete the row at zero** (no lingering empty stacks).
- THE SYSTEM SHALL deliver `player_item` rows only to their owner (RLS); a non-owner receives none
  (privacy proof-of-teeth).
- IF `train`/`care` is called by a non-owner, on a non-owned monster, or without the required owned item
  THEN THE SYSTEM SHALL reject with `Err` (never clamp).

**Re-derive consistency**
- WHEN training changes a monster THE SYSTEM SHALL re-store its `derived` stats so the client reads the
  updated value (no client-side recompute).

## 4. Plan (high level)
- **`game-core/raising`** holds the pure rules; the reducers stay thin (validate → consume → re-derive →
  write). Training/bond fields were reserved on the `monster` row at M6 (additive).
- **Item economy primitive (ADR-0018):** `player_item` + `grant_item`/`consume_one` are the single mutation
  surface; every grant path (recruit bait M8, training food, future shop M13, quest reward M12) routes
  through them, so the one-stack/saturating invariant can't be bypassed.
- **`heal_party`** remains the placeholder until town healing (M12).

**Boundary preview — what M10 (evolution/fusion) will consume:** the monster's `training`/`bond`/`level`
(evolution conditions may read them); the `derive_stats` re-store path (evolution re-derives); the box.
What M13/M15 consume: the `player_item` + `grant_item`/`consume_one` backbone (additive).

## 5. Tasks
- [ ] `game-core/raising`: focus-training + care rules; unit/property + determinism tests.
- [ ] `player_item` table (RLS owner-scoped) + `grant_item`/`consume_one` helpers (saturating, delete-at-zero) + privacy proof-of-teeth.
- [ ] `train`/`care` reducers (ownership + owned-item validation, re-derive) + security-auditor + fixtures.
- [ ] Inventory + raising UI (pure subscription view + ownership-checked reducers).
- [ ] Retrofit M8 bait grants through `grant_item` (single mutation surface); doc-keeper changelog + memory.

## 6. Risks / decisions
- **Item overflow / multi-stack** (v1 recurring pitfall) → one stack per `(owner,item)`, `saturating_add`
  + cap, delete-at-zero, mutated only via `grant_item`/`consume_one` (ADR-0018). Every grant path uses them.
- **Client recomputing trained stats** → re-derive server-side and store; client reads (ADR-0016).
- **Open:** train amounts/caps, bond curve, `MAX_ITEM_STACK` → data, tunable.

## 7. Review / red-team notes
### Tutorial harvest (v1 M9 chapter + ARCHITECTURE)
Adopted: focus-training (food → training → re-derive) + care (bond); the **one-stack, saturating**
`grant_item`/`consume_one` helpers as the sole item-mutation surface (v1's known-issue guard); `player_item`
owner-scoped; `heal_party` still a placeholder until towns. v2 makes the item primitive an explicit
**foundation ADR** (0018) since M13/M15 reuse it.
### Red-team
- Overflow/empty-stack corruption → saturating cap + delete-at-zero, single mutation surface, gated.
- Non-owner train/leak → ownership checks + RLS + privacy fixture.
### Simplify
Inventory primitive only (no shops/currency — M13); training/bond reuse M6-reserved fields.
