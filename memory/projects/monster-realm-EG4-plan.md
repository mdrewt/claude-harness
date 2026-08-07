# EG4 — essence-graph client UI — build plan

Slice: EG4 (MEDIUM, client UI — essence-graph progress panel replaces fusion overlay).
Branch `feat/eg4-essence-graph-client-ui`, worktree `.claude/worktrees/EG4`, base `3c1cf08` (EG2 merged).
**No ADR owned by this slice** (EG5 lands the doc/ADR tail).

## Ground truth established at build time

1. `just gen` is **zero-diff** — bindings already current on master (EG2 regenerated them).
   `evolution_path_table.ts` + `evolve_reducer.ts` exist; `fuse_reducer.ts` already deleted (EG1);
   **`fusion_table.ts` + `types.ts` `Fusion` STILL EXIST** (removed only at EG5-6 / Migration B).
2. `MonsterPub` public columns include `tier`, 8× `essence*`, `trustTier` (enum), `qualityTimeTier`,
   `nutritionPct` — **and still** `bond` + `evolvesTo` (dropped at EG5-6).
3. `evolution_path` public row: `pathId` (pk), `edgeId`, `fromSpecies`, `toSpecies`, `minLevel`,
   `essence[]`, `minTrustTier?`, `minQualityTimeTier?`, `minNutritionPct?`.
4. **EG4-8's "roster component TBD at build time" = `client/src/ui/boxModel.ts` + `boxView.ts`**
   ("Party & Box" screen; `buildPartyViewModel`). Confirmed; `boxView.test.ts` exists.
5. DB accessors are snake_case: `conn.db.evolution_path` (not `evolutionPath`).
6. `evolutionView.ts` has **no sibling test** — it is a coverage-excluded DOM shell
   (`client/vite.config.ts`, `evals/dom-shell-coverage-exclusion.eval.mjs`). ALL logic must live in
   the model / eligibility module.

## Spec-text corrections to flag (NOT applied — EG5 owns the doc tail)

- **R1 / EG4-1:** "client-side port of the three tier-derivation helpers" is not implementable —
  `trust_tier_of`/`quality_time_tier_of`/`nutrition_pct_of` consume **private** `Monster` fields
  absent from `MonsterPub`. The server already publishes the three derived outputs. What the client
  actually ports is the **gate-comparison predicate** (`path_satisfied` / `eligible_evolution_paths`
  / `unmet_requirement`). Strictly better for SSOT: duplicated rule surface shrinks from
  "banding + Bayesian smoothing + gates" to "gates only".
- **R2 / EG4-5:** "`fuse_reducer.ts`/`fusion_table.ts` disappear on regen" is false —
  `fusion_table.ts` survives to EG5-6. EG4 deletes hand-written wiring only.

## Task order (7 increments, one PR)

- **T0** verification: `just gen` zero-diff, `conn.db.evolution_path` resolves, `Option<TrustTier>` decode shape.
- **T1a** store/rowConvert/connection **additive**: 5 new `StoreMonsterPub` fields,
  `StoreEvolutionPath`/`StoreEssenceRequirement`/`AffinityName`/`TrustTierName`/`EssenceByAffinity`,
  `#evolutionPaths` map + upsert/remove/iterate + `reset()` clear, converter, subscription,
  onInsert/Update/Delete. Backfill every `StoreMonsterPub` test literal.
- **T1b** remove `bond` + `evolvesTo` from the client type; `raisingModel`/`raisingView`
  `Bond ${mon.bond}` → `Trust ${mon.trustTier}`. (EG4-4, EG4-7)
- **T1c** delete ALL fusion wiring (store/rowConvert/connection/evolutionModel/evolutionView/main). (EG4-5)
- **T2** new `client/src/ui/evolutionEligibility.ts` — the pure TS port. (EG4-1 rules half)
- **T3** requirements/progress panel + 2+-only choice UI + `onEvolve(monsterId, toSpecies)`. (EG4-1/2/3/6)
- **T4** party-roster badge in `boxModel`/`boxView`. (EG4-8)
- **T5** docs: minimal `ARCHITECTURE.md` correction + `docs/knowledge/**` regen.

## Eligibility module (T2) — exported surface

```ts
export const TRUST_TIER_ORDER: readonly TrustTierName[];   // ascending, mirrors eligibility.rs ASCENDING
export function trustTierRank(tag: string): number;        // unknown -> -1 (fails CLOSED)
export function pathSatisfied(m, p): boolean;
export function unmetRequirement(m, p): string | null;     // gate order level->essence->trust->qt->nutrition
export function eligibleEvolutionPaths(m, paths): StoreEvolutionPath[];   // FULL set, never first-match
```

Semantics ported verbatim from `game-core/src/evolution/eligibility.rs`: five gates AND-combined;
thresholds INCLUSIVE `>=`; a `null` history gate is PERMISSIVE; empty `essence` imposes no
requirement; essence matched **by affinity, never by position**; `fromSpecies === speciesId` filter.
All functions TOTAL — never throw.

Consumed by BOTH `evolutionModel.ts` and `boxModel.ts` — neither re-implements a gate.

## Key representation decisions

- Essence stored as `Readonly<Record<AffinityName, number>>`, built once in `monsterPubRowToStore`
  — the affinity↔column mapping is stated exactly once, at the SDK boundary; downstream code
  *cannot* index by position.
- `TrustTier` normalized to a bare string (precedent: `StoreStatusEffect.tag`); ORDER is
  re-established by `TRUST_TIER_ORDER` + `trustTierRank`, pinned by a 25-pair unit test citing the
  Rust `ASCENDING`. Registered in `HANDLED_ENUM_VARIANTS` (ADR-0127).
- `StoreEvolutionPath` deliberately has **no `pathId`** (EG1-12 forbids client references); the
  store map is keyed by `edgeId`.
- `EvolutionMonsterViewModel` exposes `choices` that is **non-empty IFF `eligibleCount >= 2`**;
  `canEvolve` / `evolvesToSpeciesName` / any single `toSpecies` scalar are deleted and never
  reintroduced — the view is structurally incapable of an Evolve button for the single-eligible case.

## Anti-patterns named

String-comparing TrustTier (lexicographic order is wrong AND plausible) · essence by position ·
first-match resolution (`.find`/`[0]`) · re-deriving the three tiers client-side · falsy coercion on
a meaningful numeric 0 · treating `None` as "requires lowest tier" · throwing in a model (starves
`flushBatch` siblings) · any Evolve affordance at exactly-1-eligible · referencing `path_id` ·
spreading the SDK row · creating a NEW `*View.ts` (would force `vite.config.ts` +
`dom-shell-coverage-exclusion.eval.mjs` edits — both OUTSIDE touches → hidden-dependency STOP) ·
gate logic in a View · client eligibility treated as authoritative · adding "pending choice" state.

## Risks

- R3 `Option<TrustTier>` decode shape unverified → handle both `undefined` and `null` via `== null`.
- R6 `sdk-enum-exhaustiveness.eval.mjs` checks TrustTier **membership, not order** — the 25-pair
  ordering test is mandatory, not optional.
- R7 96% client line-coverage gate over `src/**/*.ts`; `evolutionView.ts` additions are excluded, so
  all decision logic must be in the model.
- R9 no e2e covers the evolution overlay; EG4-3's `main.ts` glue is `tsc`-gated only. Accepted.
- R8 `ARCHITECTURE.md` M10c client bullet becomes false at T1c → minimal in-place correction only.
- **No hidden-dependency STOPs found.** Near-misses `client/vite.config.ts` and
  `evals/dom-shell-coverage-exclusion.eval.mjs` are avoided by NOT creating a new View file.

## Right-sizing verdict

**One coherent slice.** EG4-1..EG4-8 are welded by a single type: `StoreMonsterPub` cannot gain the
tier fields and lose `bond`/`evolvesTo` across two PRs without shipping a client that reads columns
EG5-6 is about to drop, or doing the same eight-test-factory churn twice. EG4-8 is the only
defensible split (~40 LOC) and is kept in — deferring it leaves EG2-11's 2+-eligible monsters with
no discoverable notification anywhere in the client.
