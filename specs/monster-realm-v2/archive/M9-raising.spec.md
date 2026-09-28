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
  (privacy proof-of-teeth). *V1 reconciliation: the `inventory` table (spec's `player_item`, ADR-0046) is PUBLIC with NO transport RLS — the "non-owner receives none (RLS)" criterion is **per-owner transport RLS deferred to M16**. The V1-enforced privacy (no gene/seed on public row) + no-idle-accrual confinement are the gated proof-of-teeth.*
- IF `train`/`care` is called by a non-owner, on a non-owned monster, or without the required owned item
  THEN THE SYSTEM SHALL reject with `Err` (never clamp).

**Re-derive consistency**
- WHEN training changes a monster THE SYSTEM SHALL re-store its `derived` stats so the client reads the
  updated value (no client-side recompute).

## 4. Plan (slices + `touches:` for collision-safe fan-out)

Design anchors: `game-core/raising` holds the pure rules (reducers stay thin: validate → consume →
re-derive → write; training/bond fields were reserved on `monster` at M6, additive). The **item economy
primitive (ADR-0018)** — `player_item` + `grant_item`/`consume_one` — is the *single* mutation surface;
every grant path (recruit bait M8, training food, shop M13, quest reward M12) routes through it. `heal_party`
stays a placeholder until town healing (M12).

**`touches:` targets assume the post-M8.9 server-module map.** Train/care reducers land in a
`server-module/src/raising.rs` domain module and the item backbone in `server-module/src/inventory.rs`
(the M8.9 vocabulary), so M9's server work is scoped to those files instead of the monolithic `lib.rs`.
**If M8.9 has NOT landed when M9 builds**, collapse 9b's server `touches:` to `server-module/src/lib.rs`
and accept that 9b serializes against any other `lib.rs` slice (the pre-M8.9 bottleneck). `player_item` is
additive → it also touches `server-module/src/schema.rs`, the one file that serializes table-adds
(acceptable: additive schema changes are rare and want a single reviewable diff).

Dependency chain: the pure rules gate the reducers, which gate the client + evals — the fan-out is the
**client ‖ evals tail**.

- **M9a — `game-core/raising` rules (pure)** · `touches: game-core/src/raising/ (new), game-core/src/lib.rs (mod decl), game-core/src/monster/types.rs (EV/bond fields if M6 didn't reserve them)` — focus-training (EV top-off to per-stat + total caps → `derive_stats`) + care (capped bond); deterministic; unit/property + determinism tests. **Critical-path start (nothing precedes it).**
- **M9b — Server: item backbone + raising reducers** · `touches: server-module/src/{schema,inventory,raising,taming}.rs` *(pre-M8.9: `server-module/src/lib.rs`)* — `player_item` table (RLS owner-scoped); `grant_item`/`consume_one` (saturating, delete-at-zero) as the sole item-mutation surface; `train`/`care` reducers (ownership + owned-item validation; care cooldown from `ctx.timestamp`; reject-not-clamp); retrofit M8 bait grants through `grant_item`. **Serial after M9a** (delegates to its rules).
- **M9c — Client: inventory + raising UI** ‖ **M9d — Evals + doc-keeper** — **disjoint, fan out (N≤2)**:
  - **M9c** · `touches: client/src/...` — an inventory/raising view + `train`/`care` actions via ownership-checked reducers; pure subscription view, no rule logic in TS.
  - **M9d** · `touches: evals/...` — `player_item` privacy proof-of-teeth (non-owner sees none) + `train`/`care` reducer-security-auditor fixtures (rejecting-comparison + a no-rejection bad fixture); changelog + memory.
  - Both depend only on M9b (tables/reducers/bindings exist) and touch disjoint trees (`client/` vs `evals/`) → run concurrently.

Recommended order: **M9a → M9b → { M9c ‖ M9d }.**

**Boundary preview — what M10 (evolution/fusion) will consume:** the monster's `training`/`bond`/`level`
(evolution conditions may read them); the `derive_stats` re-store path (evolution re-derives); the box.
What M13/M15 consume: the `player_item` + `grant_item`/`consume_one` backbone (additive).

## 5. Tasks
- [x] **9a** DONE — `game-core/raising`: focus-training + care rules; unit/property + determinism tests (merged directly to master, commit 14618f1 — no PR#; shipped before M9b).
- [x] **9b** DONE — `care` reducer + inventory backbone + `last_care_at_ms` (delegates to `apply_care`; cooldown from `ctx.timestamp`). *Implementation reconciled the spec's `player_item`/owner-RLS language to the delivered `inventory` table + ADR-0046 V1 (transport RLS → M16) — see ADR-0059.*
- [x] **9b-tail** DONE (PR open) — `train(monster_id, food_item_id)` reducer (pure `evaluate_train` seam → SSOT `focus_train`; decision-before-`consume_one` = reject-never-burns; `current_hp` unchanged, ADR-0058 res-a resolved). Additive `train_stat: Option<StatKind>`/`train_amount` on `ItemDef`+public `ItemRow` (bindings regen), content item id 2 "Power Root", `CONTENT_VERSION` 1→2; EV-caps `pub(crate)` one-SSOT (ADR-0058 res-b resolved). **Residuals:** no production `grant_item` path yet (player can't yet *receive* training food → M12/M13, ADR-0059 §d); no battle-guard (mid-battle train defers buff; safe, minor over-heal edge case); `item-ids.json` empty baseline. NO new ADR (covered by ADR-0058/0059/0006/0018).
- [x] **9c** DONE (PR open) — Inventory + raising client view (pure subscription, no TS rule logic; ADR-0016). `raisingModel` builds a **total** view-model (never throws — `flushBatch` has no per-listener isolation): monster stats copied **verbatim** from server-derived `monster_pub`; items classified trainable by **data** (`def.trainStat` present) not a hardcoded id list. `raisingView` = thin `textContent`-only DOM shell (coverage-excluded). `store` gains `inventory`+`itemDefs` maps with an owner-filtered **deep-copy** `ownInventory(identity)` (no unfiltered `inventories()` accessor — owner-filter is client-side defense-in-depth, ADR-0046 V1, transport RLS → M16) + structure-copy `itemDefs()`. `connection` subscribes `inventory`+`item_row`; `main.ts` adds the **KeyI** overlay (mutually exclusive with the box, battle supersedes, Escape order battle>box>raising>movement, ADR-0014) wiring `onTrain`→`train` / `onCare`→`care` intents. **NO new ADR** (extends ADR-0016/0046/0014; the box/battle view pattern). **Residual / hidden-dependency (re-deferred):** the M8.7e bait-recruit client wiring (join inventory→`BaitItem[]`→`buildBattleViewModel`) is NOT included — its proof-of-teeth gate (`recruit.spec.ts` un-fixme) needs `module_bindings` regen + a `dev_reducers` e2e CI job, **both outside `client/src/**`** → must be its own re-serialized slice (shipping the `main.ts` join without its e2e gate would be ungated integration code).
- [x] **9d** DONE (PR #60) — `player_item` privacy proof-of-teeth + `train`/`care` reducer-security-auditor fixtures (rejecting-comparison + no-rejection bad fixture). Delivered: **no-idle-accrual proof-of-teeth** (confinement oracle + 8 teeth, `GROWTH_WRITERS` allowlist) + **item-ids baseline [1,2]** populated. Reducer-security half was already covered by M9b's `raising-reducer-security.eval.mjs`; inventory privacy scan deferred (tautology vs binding-level reachability); per-owner transport RLS deferred to M16 (ADR-0046/0059).

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
