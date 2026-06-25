# Spec: M6 — Monsters & individuality

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M5 (POC).
**Decisions:** ADR-0006 (content-sync/additive), 0007 (zoned), 0010 (proof-of-teeth), 0015 (owner-scoped
RLS privacy), 0016 (individuality & progression model). **Workflow:** harvest v1 M6 chapter → draft →
review (§7). The emotional core: **every monster is a unique individual.**

## 1. Problem / intent

Introduce the monster data model where individuality lives — author species as **data**, roll a
one-of-a-kind starter for each player on join, derive its stats **server-side**, and store it with
**row-level privacy** so hidden genes never reach another client. No battles yet (M7); this is the
content pipeline + the individual + the box/party view. Success = on first join you receive a unique
starter (hidden genes, temperament, server-derived stats), can see/organize your box/party, and **no other
client can read your monsters' rows**.

## 2. Scope

**In scope**
- **`game-core` `monster/` module** (pure, deterministic — IV/EV/nature model, ADR-0016): `StatBlock`,
  `Affinity`, **per-stat `IVs`** (hidden innate genes, rolled in a fixed range), **per-stat `EVs`** (effort
  values, trained M9, **dual-capped** per-stat + total), **`Nature`** (raises one stat, lowers another),
  `Bond`, `Level`, `Xp`, `Species`, `MonsterInstance`; rules: the single **integer** `derive_stats(base,
  IVs, EVs, nature, level) → StatBlock`, the **level³ XP curve** (`xp_for_level`/`level_for_xp`/
  `level_bounds`), and seeded `roll_individuality` (rolls IVs + nature) / `roll_starter` (randomness injected
  as a `u32`/variance byte — determinism gate).
- **Content as data** (ADR-0006): RON registries under `game-core/content/` (`species`, `skill`,
  `type_chart`/`type_relation`, `item` templates) + pure `load_*` (parse-don't-validate) +
  `validate_content` (no dangling skill/species/affinity refs; **append-only ids**). Seeded into public,
  read-only tables via `sync_content` (the table is the runtime cache — reducers read it, never re-parse).
- **Tables:** `species`/`skill`/`type_relation`/`item` (public, world-readable, module-write-only content);
  **`monster`** (public **but RLS-scoped to `owner_identity`**, indexed) — `species_id`, `nickname`,
  `level`/`xp`, `potential`, `temperament`, `training`, `bond`, `current_hp` (**persists between battles**),
  server-derived `derived: StatBlock`, `party_slot: Option<u8>`, `evolves_to` (server-computed, M10).
- **Reducers:** extend `init`/`sync_content` to seed content; grant **one seeded-roll starter** on
  `join_game`; `set_nickname` (validated) and `set_party_slot` (validated box↔party moves). All
  ownership-checked (`ctx.sender`).
- **Owner-scoped RLS privacy** (ADR-0015): a `client_visibility_filter` scoping `monster` rows to
  `owner_identity = :sender`, so hidden genes/derived stats never cross to another client; a **privacy
  eval** proves another client's subscription never receives your rows.
- **Box/party view** (frontend): the `box` screen (M4 `ScreenManager`) as a **pure view** of the owner's
  `monster` subscription; party slots; nickname edit. Reads authoritative state; calls ownership-checked
  reducers; never mutates locally.

**Out of scope (named deferrals)**
- **Battles** (turn resolution, skills in combat) → M7. **Grass encounters / wild capture** → M8.
- **Training/care mutations** (food/bond gameplay) → M9 (the `item` *templates* are seeded here; the
  spend/grant gameplay is M9). **Evolution/fusion eligibility logic** → M10 (`evolves_to` column reserved).
- **Trading** (cross-owner transfer) → M15.

## 3. Acceptance criteria (EARS)

**Individuality rules (`game-core`, ADR-0016)**
- WHEN `roll_starter`/`roll_individuality` is called with a seed THE SYSTEM SHALL produce a deterministic
  unique individual (same seed ⇒ same monster); no clock/RNG read directly (determinism gate).
- WHEN `derive_stats` is called THE SYSTEM SHALL compute the `StatBlock` from species base + **IVs + EVs +
  nature + level** by the single shared **integer** formula (no floats — determinism; the client reads the
  stored result; the formula is never re-implemented). EVs respect their per-stat and total caps.
- WHEN XP changes THE SYSTEM SHALL map level↔xp by the `level³` curve (`xp_for_level`/`level_for_xp`),
  total and deterministic.

**Content (ADR-0006)**
- WHEN the module initializes/republishes THE SYSTEM SHALL seed `species`/`skill`/`type_relation`/`item`
  from RON via `sync_content` idempotently; IF content has a dangling ref (unknown skill/species/affinity)
  or a removed/renumbered id THEN `validate_content`/the append-only-ids eval SHALL fail.

**Starter & ownership**
- WHEN a new player `join_game`s THE SYSTEM SHALL grant exactly one seeded-roll starter `monster` owned by
  `ctx.sender`; a second join SHALL NOT duplicate it.
- IF a `set_nickname`/`set_party_slot` caller does not own the target monster THEN THE SYSTEM SHALL reject
  with `Err`; names are validated (length/charset); party slots are range-checked.

**Privacy (ADR-0015) + proof-of-teeth (ADR-0010)**
- THE SYSTEM SHALL deliver a player's `monster` rows ONLY to that owner's subscription (RLS
  `owner_identity = :sender`); IF a non-owner subscribes THEN it SHALL receive none of those rows (privacy
  eval + proof-of-teeth fixture: a second client never sees the first's monsters/genes).
- Content tables (`species`/etc.) are world-readable but **module-write-only** (no client write path).

**View**
- THE box/party view SHALL render purely from the owner's subscription and mutate state only via
  ownership-checked reducers (one-way flow — ADR-0014).

## 4. Plan (high level)
- **`game-core`** stays the rule center: individuality + derive + XP are pure unit/property-tested; the
  `monster` columns are the M1-style shared types under the `spacetimedb` feature.
- **Content pipeline:** RON → `load_*` → `validate_content` → `sync_content` upsert into read-only tables;
  reducers look up by id. New affinity types grow the enum (exhaustive match flags sites).
- **RLS:** `monster` is `public` for subscription transport but carries a `client_visibility_filter`
  (`owner_identity = :sender`). **Version-sensitive:** RLS was experimental in STDB 2.6 — confirm syntax +
  maturity vs the pinned version; ADR-0015 records a fallback (a server-curated public projection of only
  non-sensitive fields) if RLS is insufficient.
- **derive-on-write:** `derived` stats are recomputed and stored whenever inputs change (level-up, training
  M9, evolution M10); the client reads the stored value.

**Boundary preview — what M7 (battles) will consume:** the owner's party `monster` rows (derived
`StatBlock`, `current_hp` that persists, `species`/`skill`/`type_relation` content), read by the
battle resolver; the battle will write `current_hp` back per turn. M7's `battle` table is designed
**PvP-ready** (synthetic `battle_id` pk + indexed `opponent_identity`) so M16 is additive.

## 5. Tasks (M6a content+rules, M6b server+privacy, M6c view)
- [ ] `game-core/monster`: individuality types + `derive_stats` + level³ XP + seeded rolls; unit/property tests.
- [ ] `game-core/content`: RON registries + `load_*` + `validate_content` (dangling-ref + append-only-id checks).
- [ ] `sync_content` seeds `species`/`skill`/`type_relation`/`item`; migration smoke-test for the additive tables.
- [ ] `monster` table (RLS owner-scoped) + starter grant on join + `set_nickname`/`set_party_slot`; security-auditor + privacy eval + proof-of-teeth.
- [ ] Box/party view (M4 `box` screen) — pure subscription view + ownership-checked reducers.
- [ ] doc-keeper: changelog + memory; link the monster/content model in `ARCHITECTURE.md`.

## 6. Risks / decisions
- **RLS maturity (STDB 2.6 experimental)** — confirm vs the pinned version; ADR-0015 fallback if needed.
  This is the load-bearing privacy mechanism; do not ship monsters public.
- **Individuality model = IV/EV/nature (chosen at the Phase A checkpoint; ADR-0016 rev 2)** — per-stat
  hidden IVs + per-stat dual-capped EVs (trained M9) + a Nature + bond, feeding the single integer
  `derive_stats`. Richer than v1's simpler genes+temperament; the depth/replayability the user wanted.
- **Content is the first real `sync_content` payload** — exercises ADR-0006 (additive + idempotent +
  re-derive); species ids append-only forever.
- **Open:** exact starter set, stat formula weights, XP curve constant → data, tunable.

## 7. Review / red-team notes
### Tutorial harvest (v1 M6 chapter + ARCHITECTURE)
Adopted: species-as-template / monster-as-individual; **server-derived stats stored on the row** (formula
single-sourced; client reads); seeded starter on join; content as RON →
read-only tables (the "table is the cache"); the **third visibility mode** (public-but-RLS-filtered) for
owner-private data; `validate_content` integrity + append-only species ids. **v2 enhancement (Phase A
checkpoint):** a richer **IV/EV/nature** individuality model (ADR-0016 rev 2) — per-stat hidden IVs +
dual-capped EVs (trained M9) + a Nature + bond — deeper than v1's genes+temperament, still hidden,
server-derived, and float-free.
### Red-team
- **Genes leaking to other clients** → RLS filter + privacy eval + proof-of-teeth (a second client sees
  nothing). The #1 risk; never trust a `public` table to hide fields.
- **Client recomputing stats** → derive server-side, store, read-only client (no second formula to drift).
- **Content drift / dangling refs** → `validate_content` + append-only ids, both gated.
### Simplify
Battles/training/evolution deferred (columns/templates reserved, gameplay later); the box view is a pure
subscription view, no local state.
