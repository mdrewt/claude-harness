# Spec: M14 — Deeper battle systems (status, abilities, weather)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M13. **Closes Phase B.**
**Decisions:** ADR-0006 (content), 0010 (proof-of-teeth), 0011 (server-resolved battles), 0017 (battle
model — extend additively), 0023 (additive battle-depth). **No v1 chapter** (explicitly deferred in v1) —
designed from standards + game-design practice with extra ADR care. **Workflow:** design → review (§7).

## 1. Problem / intent

Add tactical depth to battles **without breaking the tested M7 core**: **status effects**, **abilities**
(passive per-species), and **weather/field** — all as **additive layers on `resolve_turn`** (which stays
symmetric and server-resolved, so M16 PvP gets the depth for free). The depth must be data-driven, behind
**exhaustive enums** (a new variant flags every site), deterministic, and must extend `resolve_turn`'s event
pipeline rather than rewrite it. Success = battles gain status/abilities/weather as content-driven additive
rules, M7's existing battle tests still pass unchanged, and PvP (M16) inherits the depth symmetrically.

> **Scope is the fork** (appendix flags it). This spec proposes a **default set** (status + abilities +
> weather; multi-active deferred). The Phase B checkpoint decides the final set.

## 2. Scope

**In scope (default set — confirm at the checkpoint)**
- **Status effects** (`game-core`): a `StatusEffect` enum (e.g. Poison, Burn, Paralysis, Sleep, Freeze) on
  `BattleMonster`; applied by skills/abilities; resolved each turn (damage-over-time, action-skip chance,
  etc.) via injected variance — **exhaustive `match`** (a new status flags every site). Cured by items
  (extend M9) / switching / time.
- **Abilities** (`game-core` + content): passive per-species effects (e.g. status immunity, weather synergy,
  on-entry effects), read from `species` ability data; resolved in the turn pipeline.
- **Weather / field** (`game-core`): a battle-wide field state (e.g. Rain/Sun/Sand) affecting damage/
  effectiveness/status, set by skills/abilities, ticking down each turn.
- **Content:** `skill`/`species` gain status/weather/ability fields; new status/weather/ability data; all
  `sync_content` + `validate_content` (no dangling refs; append-only ids).
- **Resolution:** all of the above extend `resolve_turn`'s ordered `BattleEvent` pipeline **additively** —
  `resolve_turn`'s signature/semantics for a plain attack are **unchanged** (M7 tests pass).

**Out of scope (named deferrals)**
- **Multi-active (2v2/3v3)** → deferred (it changes `BattleSide` structure — a bigger, separate additive
  step; decide at the checkpoint). **Mega/temporary forms** → optional later (additive on M10 transforms).
- **PvP-specific depth tuning** → M16 (the depth is symmetric, so PvP inherits it; balance is content).

## 3. Acceptance criteria (EARS)

**Additive depth (ADR-0023) — must not regress M7**
- WHEN a plain attack turn is resolved THE SYSTEM SHALL behave **identically to M7** (the M7 battle tests
  pass unchanged) — depth is additive, `resolve_turn` is not rewritten.
- WHEN a status/ability/weather effect applies THE SYSTEM SHALL resolve it deterministically (variance
  injected) and emit ordered `BattleEvent`s for the client to animate.
- WHEN a new `StatusEffect`/weather/ability variant is added THE SYSTEM SHALL force an exhaustive-`match`
  update at every resolution site (compiler-enforced — OCP inverted, per principles).

**Status / abilities / weather**
- WHILE a monster has a status THE SYSTEM SHALL apply its per-turn effect (DoT, action-skip chance, …) and
  expire/cure it per the rules; abilities modify these per their data (e.g. immunity).
- WHILE weather is active THE SYSTEM SHALL apply its damage/effectiveness/status modifiers and tick it down.

**Content integrity + proof-of-teeth**
- IF content references a non-existent status/ability/weather THEN `validate_content` SHALL fail (fixture).
- THE SYSTEM SHALL ship proof-of-teeth fixtures: a depth change that altered plain-attack resolution fails
  the M7 regression; a non-exhaustive match fails to compile.

## 4. Plan (high level)
- **`game-core/combat` extensions** are pure rules layered into `resolve_turn`'s existing event pipeline
  (apply pre-turn effects → speed-ordered actions → post-turn effects → weather/status tick), each emitting
  `BattleEvent`s. The plain-attack path is untouched; new effects are new branches behind exhaustive enums.
- **Data-driven:** statuses/abilities/weather are content on skills/species; the resolver reads data, never
  hardcodes a special case.
- **Symmetric → PvP-ready:** because `resolve_turn` stays symmetric (ADR-0017), M16 PvP inherits the depth
  with no extra work; raids (M18) too.

**Boundary preview — Phase C (M15–M19):** the now-deeper, still-symmetric `resolve_turn` is what M16 PvP and
M18 raids resolve; the battle table (M7) is already PvP-ready. M15 trade is independent of battle depth.

## 5. Tasks
- [x] `game-core`: `StatusEffect` enum + per-turn resolution (additive on `resolve_turn`); unit/property + determinism + **M7-regression** tests. *(m14a — PR #134, ADR-0092)*
- [x] Server schema + persistence: `BattleMonster.status`, `StatusCured.slot` (RT-S14-01), `submit_attack→resolve_full_turn`, bindings regen. *(m14b — PR #135, ADR-0093)*
- [x] Abilities (data-driven passives); StatusKind payload-free, AbilityEffect exhaustive, per-species content, `validate_abilities` additive sibling, apply_entry_ability hooks. *(m14c — PR #137, ADR-0094)*
- [x] Weather/field state; content fields + `validate_content` + fixtures. *(m14d — PR #139, ADR-0095)*
- [x] Items that cure status (extend M9); battle view animates the new `BattleEvent`s. *(m14e — PR #141, ADR-0096)*
- [x] Proof-of-teeth: plain-attack-unchanged regression; exhaustive-match enforcement. *(distributed: m14a M7-regression + exhaustive-match; m14b RT-S14-01; m14c OCP gate; m14d validate_content exhaustive match; m14e 6-guard test)*
- [x] doc-keeper changelog + memory; mark **Phase B complete** in `ARCHITECTURE.md`. *(m14f — ADR-0097)*

## 6. Risks / decisions
- **Default set chosen for autonomy (status + abilities + weather; multi-active deferred) — the Phase B
  checkpoint confirms it.** Multi-active is the larger structural change (separate additive step).
- **Must not rewrite `resolve_turn`** (ADR-0017/0023) — depth extends the event pipeline additively; the M7
  tests are the guardrail (a regression fixture proves it).
- **Exhaustive enums** (OCP inverted) — a new status/weather/ability flags every site; intended.
- **Open:** the exact status/ability/weather set + their numbers → data, tunable; balance is a content pass.

## 7. Review / red-team notes
### Design notes (no v1 chapter — v1 deferred this; designed from standards + practice, extra ADR care)
The key constraint is **additivity**: M7's `resolve_turn` is tested and symmetric; depth must layer on its
event pipeline, never rewrite it — so PvP/raids inherit depth for free and the existing tests stay green.
Everything is data behind exhaustive enums (the difference between a scalable battle system and hardcoded
special cases).
### Red-team
- Depth silently changing plain-attack resolution → M7-regression fixture (must stay green). · Hardcoded
  effects → data + `validate_content`. · A new variant missed at a site → exhaustive `match` (won't compile).
- Asymmetric depth breaking PvP → keep `resolve_turn` symmetric; depth applies to both sides equally.
### Simplify
Default set only; multi-active + mega-forms deferred; no `resolve_turn` rewrite; all additive + data-driven.

## 8. Slice breakdown (finalized 2026-07-10)

Dependency order: m14a → m14b → (m14c ‖ m14d) → m14e → m14f.

### m14a — game-core status rules (THIS SLICE)
Pure-rule layer only. No schema changes, no bindings regen. Serial-safe with everything.

**Touches:** `game-core/src/combat/status.rs` (NEW), `game-core/src/combat/types.rs` (new `BattleEvent` variants + `TurnChoice::Pass`), `game-core/src/combat/resolve.rs` (additive `resolve_full_turn` wrapper + `skill_id_from` Pass arm), `game-core/src/combat/mod.rs` (re-exports), `game-core/src/lib.rs` (re-exports), `game-core` test files.

**Delivered:**
- `StatusEffect` enum: `Poison | Burn | Paralysis | Sleep { turns_remaining: u8 } | Freeze`
- `BattleStatusStore { side_a: Vec<Option<StatusEffect>>, side_b: Vec<Option<StatusEffect>> }` (pure game-core, not `SpacetimeType` — persistence wired in m14b)
- `StatusVariance { action_skip_roll_a/b, freeze_thaw_roll_a/b, sleep_wake_roll_a/b }` (separate from `TurnVariance` so existing signature is unchanged)
- `TurnChoice::Pass` variant — falls through silently in `resolve_turn` (no existing arm touched); `skill_id_from` gains a `Pass => unreachable!` arm
- `resolve_full_turn(state, choice_a, choice_b, skills, type_chart, turn_variance, status, status_variance)` — new wrapper: pre-turn action-blocking → `resolve_turn` (unchanged) → post-turn DoT → status tick
- New `BattleEvent` variants (all under `#[non_exhaustive]`, no `SpacetimeType`): `StatusApplied { side, status }`, `StatusDamage { side, amount }`, `ActionBlocked { side }`, `StatusCured { side }` (for completeness — curing wired in m14e)
- Unit + property + determinism tests; **proof-of-teeth**: (1) M7-regression — `resolve_full_turn` with empty `BattleStatusStore` and a plain-attack produces byte-identical events to `resolve_turn`; (2) exhaustive-match — adding a future `StatusEffect` variant must fail to compile at every `match` site

**Cross-slice contract:** `StatusEffect`, `BattleStatusStore`, `StatusVariance` types exported from `game-core::combat`. m14b depends on these being stable.

**Fan-out-eligible:** NO (adds new `BattleEvent` variants — cross-boundary contract; touches shared `types.rs`). Must run serially.

---

### m14b — server schema + persistence for status
Serial after m14a. Depends on m14a types being merged.

**Touches:** `game-core/src/combat/types.rs` (`StatusEffect` gains `SpacetimeType` cfg-attr), `server-module/src/battle.rs` (new server domain module if needed, or extension of existing), `server-module/src/schema.rs` (additive column on `BattleMonster`), `client/src/module_bindings/` (regen), `evals/battle-schema-snapshot.eval.mjs` (snapshot update).

**Delivered:** `BattleMonster` gains `pub status: Option<StatusEffect>` with `#[serde(default)]`; server `submit_turn` reducer calls `resolve_full_turn` instead of `resolve_turn`; status store constructed from/persisted to `BattleMonster.status` fields; bindings drift = 0 after regen.

**Cross-slice contract:** `BattleMonster.status` column added additively (ADR-0006); `module_bindings` updated.

---

### m14c — passive abilities (per-species)
Serial after m14b. Parallel-eligible with m14d (disjoint files).

**Touches:** `game-core/src/combat/ability.rs` (NEW), `game-core/src/content.rs` (`Species` gains `ability: Option<u32>` id field; new `AbilityDef` registry), content RON files.

**Delivered:** `AbilityDef { id, name, effect: AbilityEffect }` where `AbilityEffect` is exhaustive enum; `apply_entry_ability` + `apply_ability_modifiers` hooks in the full-turn pipeline; `validate_content` cross-checks ability ids; content integrity fixtures.

---

### m14d — weather / field state
Serial after m14b. Parallel-eligible with m14c.

**Touches:** `game-core/src/combat/weather.rs` (NEW), `game-core/src/combat/types.rs` (`BattleState` gains `weather: Option<WeatherEffect>`), `server-module/src/schema.rs` (additive column), content RON (`SkillDef` gains optional `sets_weather` field).

**Delivered:** `WeatherEffect { Rain | Sun | Sandstorm | Hail, turns_remaining: u8 }` enum; per-turn weather damage and effectiveness modifiers; weather tick in `resolve_full_turn`; validate_content cross-checks.

---

### m14e — status-curing items + client event display
Serial after m14b + m14c merged. Parallel-eligible: server item-cure reducer ‖ client animation.

**Touches (server):** `server-module/src/battle.rs` (new `use_battle_item` reducer or `ItemEffect::CureStatus` branch in existing item reducer).

**Touches (client):** `client/src/battle*.ts` — render new `BattleEvent` variants (StatusApplied, StatusDamage, ActionBlocked animations).

**Fan-out-eligible:** YES (server ‖ client if files are disjoint).

---

### m14f — doc-keeper close + Phase B complete
Serial last. Doc-only, no production code.

**Touches:** `docs/adr/0092-*.md` (ADR), `ARCHITECTURE.md` (Phase B section), harness memory, spec §5 tick-boxes.

---

**Post-integration verification:** After m14a–m14e merge in order, run full `just ci` on the integrated whole: `bindings-drift = 0`, `battle-schema-snapshot` green with status column, `resolve_full_turn` M7-regression test still passes, e2e recruits and battles green, mutation rate within ratchet.

---

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
