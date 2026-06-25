# Spec: M10 — Evolution & fusion (individuality-preserving)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M9.
**Decisions:** ADR-0006 (content), 0010 (proof-of-teeth), 0015 (owner RLS), 0016 (derive-on-write), 0019
(evolution & fusion model). **Workflow:** harvest v1 M10 chapter → draft → review (§7). **Closes Phase A.**

## 1. Problem / intent

Add the two transformation systems that complete the core single-player loop — **conditional branch
evolution** and **fuse-with-inheritance** — both of which **keep or combine the monster's individuality**
rather than re-rolling it, so a player's investment (genes, training, bond, name) survives the change.
Both are data-driven and server-authoritative, with content integrity that makes illegal forms
unrepresentable. Success = an eligible monster evolves (keeping individuality, re-derived); two monsters
fuse into one (combining individuality); and the content can't define a duplicate recipe or a wild-catchable
derived form.

## 2. Scope

**In scope**
- **`game-core` `evolution/` module** (pure): branch-evolution **eligibility** (`evolves_to` from the
  species `evolutions` conditions — level/item/bond/etc.) + the **evolve transform** (change `species_id`,
  **carry genes/temperament/training/bond/name**, re-`derive_stats`); the **fusion** rule (recipe
  `a + b → to`, **order-independent**): the offspring inherits the **better gene per stat** (`max(a,b)`
  per-IV — it out-genes either parent) and the **higher-bond parent's nature**, but starts **fresh** (level
  1, no EVs, no nickname) and takes the **lower party slot** of its parents (fusing party members never
  silently shrinks the active team) — all
  deterministic.
- **`fusion` table** (public content): recipes (`a`,`b`→`to`); **`species.evolutions`** content (branch
  conditions/targets).
- **`validate_content` extensions:** no duplicate fusion pair (order-independent); an evolution/fusion-only
  form is **never** in any `encounter` table (not wild-catchable); no dangling species refs; **append-only
  ids**.
- **Reducers:** `evolve(monster_id)` (validate eligibility + ownership → transform in place, re-derive) and
  `fuse(monster_a_id, monster_b_id)` (validate recipe + ownership of both → produce one output, **delete the
  two inputs**, atomically) — ownership-validated, reject-not-clamp.
- **Server-computed `evolves_to`** stored on the monster row (eligibility shown to the client; the client
  never computes it).
- **Evolve/fuse UI** (frontend): a pure subscription view + ownership-checked actions.

**Out of scope (named deferrals)**
- **Trade-triggered evolution** (a classic) → folds in with M15 trading if desired. **Mega/temporary battle
  forms** → M14 (battle depth). **Multi-zone evolution items** → content, M11+.

## 3. Acceptance criteria (EARS)

**Rules (`game-core`, ADR-0019)**
- WHEN evolution eligibility is computed THE SYSTEM SHALL derive `evolves_to` from the species `evolutions`
  conditions and the monster's state (level/item/bond), deterministically.
- WHEN a monster evolves THE SYSTEM SHALL change its `species_id` while **carrying** its individuality
  (genes/temperament/training/bond/nickname) and re-`derive_stats` — never re-roll a new individual.
- WHEN two monsters fuse THE SYSTEM SHALL apply the order-independent recipe and produce one offspring with
  the **per-stat max IV** of the two parents + the **higher-bond parent's nature**, fresh at level 1 (no EVs/
  nickname), at the parents' lower party slot — deterministically. (Fusion **consumes** both parents — a
  deliberate deflationary **sink** for the economy; "breeding" that keeps the parents is the inflationary
  alternative, rejected for the economy goals.)

**Reducers (server-authoritative)**
- WHEN `evolve` is called by the owner of an eligible monster THE SYSTEM SHALL transform it in place and
  re-store derived stats; IF not owned or not eligible THEN reject with `Err`.
- WHEN `fuse` is called by the owner of both inputs with a valid recipe THE SYSTEM SHALL create exactly one
  output and delete both inputs **in one transaction** (atomic — no dupe, no orphan); IF the recipe is
  invalid, an input is not owned, or an input is escrowed (in a trade/battle, M15/M7) THEN reject with `Err`.

**Content integrity + proof-of-teeth (ADR-0010)**
- IF content defines a duplicate fusion pair (order-independent) OR places an evolution/fusion-only form in
  an `encounter` table OR a dangling species ref THEN `validate_content` SHALL fail — each with a fixture on
  a synthetic violation. Species ids remain append-only.

## 4. Plan (high level)
- **`game-core/evolution`** holds the pure transforms + eligibility (property-tested; individuality carried,
  not re-rolled). The reducers are thin (validate → transform → write); `fuse` is one atomic transaction
  (delete two, insert one) — SpacetimeDB's transactional reducer gives this for free.
- **Content integrity** lives in `validate_content` (the same place dangling-ref checks already live), gated
  with proof-of-teeth — the rules ("no dup recipe", "derived forms not wild") are real integrity, not author
  discipline.
- **Reuse `reject_if_in_battle`/`reject_if_in_trade`** guards (M7/M15) so an escrowed/in-battle monster
  can't be fused away.

**Boundary preview — Phase B (M11, the authored world):** the now-complete single-player loop (move → find
→ tame → raise → evolve/fuse) runs in one hand-authored zone; M11 makes the world **data** (Tiled→RON,
multi-zone, warps) and accepts ADR-0008.

## 5. Tasks
- [ ] `game-core/evolution`: eligibility + evolve transform + fusion rule (individuality-preserving); unit/property + determinism tests.
- [ ] `fusion` table + `species.evolutions` content; `validate_content` extensions + proof-of-teeth fixtures.
- [ ] `evolve`/`fuse` reducers (ownership, eligibility/recipe, atomic fuse, escrow guards) + security-auditor.
- [ ] Server-computed `evolves_to` on the row; evolve/fuse UI (pure view + actions).
- [ ] doc-keeper changelog + memory; mark **Phase A complete** in `ARCHITECTURE.md`.

## 6. Risks / decisions
- **Preserve, don't re-roll, individuality** (ADR-0019) — re-rolling on evolution/fusion would erase the
  player's investment (bond/training) and the emotional core; carry/combine it.
- **Content integrity as code, not comments** — "no dup recipe" / "derived forms not wild" live in
  `validate_content` with fixtures (v1 left the first to row-order and the second to author discipline —
  both failed silently).
- **`fuse` atomicity** — delete-two-insert-one in one transaction; guard against escrowed/in-battle inputs.
- **Open:** evolution conditions, fusion recipes, inheritance weights → data, tunable.

## 7. Review / red-team notes
### Tutorial harvest (v1 M10 chapter + ARCHITECTURE)
Adopted: conditional **branch** evolution + **fuse-with-inheritance**, both keeping/combining individuality;
order-independent fusion recipes; content integrity in `validate_content` (no dup pair; derived-forms-not-
wild; append-only ids); server-computed `evolves_to`. v2 records the individuality-preserving transform +
the integrity rules as ADR-0019 with proof-of-teeth.
### Red-team
- Re-rolled individuality on transform → carry/combine it (rule + test). · Duplicate/ambiguous recipe →
  order-independent validate + fixture. · Wild-catchable derived form → encounter-table integrity check. ·
  Fusing an escrowed/in-battle monster → reuse the reject guards. · Non-atomic fuse (dupe/orphan) → one
  transaction.
### Simplify
Trade-evolution / battle-forms deferred; transforms are additive `game-core` rules + content.
