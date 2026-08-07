# EG4 — FROZEN CONTRACT (post plan-review adjudication)

Supersedes the shape sketches in `monster-realm-EG4-plan.md`. Three lenses (reviewer, red-team,
/simplify) reviewed the plan; this file records the adjudicated decisions. **Testers write against
THIS file; the implementer implements THIS file.**

---

## A. Adjudicated decisions

| # | Finding | Verdict |
|---|---|---|
| **A1** | **BLOCKER (reviewer B1 + red-team C1, independently confirmed).** `server-module/src/content.rs:268-292` `sync_content` clear-and-reinserts `evolution_path` with re-minted `path_id`s. Same `edge_id`s, one transaction, N deletes + N inserts, **unordered**. A store keyed by `edgeId` deletes rows the insert just wrote → client path map silently empties. | **Key `#evolutionPaths` by `pathId` (bigint).** Delete and insert then touch different keys, so callback order cannot matter. `pathId` is carried on the store row for the key only — it is NEVER read by a model or a view-model (EG1-12: an ephemeral in-session Map key is not "persisted gameplay state"). **Gating test required:** fire `onInsert(newPathId, edge 7)` *then* `onDelete(oldPathId, edge 7)` → edge 7 still present. |
| **A2** | **red-team C2 / reviewer M1.** `trustTierRank(unknown) = -1` fails CLOSED for an unknown monster tag but **OPEN** for an unknown threshold tag (`rank >= -1` is always true) → phantom eligibility. | **Do not gate through a shared sentinel.** The trust gate returns `false` when EITHER tag is unrecognized. Unknown threshold = unsatisfiable; unknown monster tier = lowest. Deterministic, never phantom-eligible. Pinned by two tests. |
| **A3** | **red-team C3.** EG4-2's premise ("the server has already auto-applied it") is false in ≥3 reachable states (content republish adds an edge; boxed monsters; `enqueue_move`'s ~60s QT-tick gate). A monster can sit at exactly-1-eligible indefinitely, rendering identically to 0-eligible. | **Honor the EARS literally — no Evolve action, no callback, no `toSpecies` at 1-eligible** (deviating from explicit EARS text is a spec change). But do NOT render it identically to 0: the monster view-model exposes `readyPathName: string \| null`, non-null **IFF `eligibleCount === 1`**, rendered as informational copy ("Ready — evolves on your next action"). Informational text is not an action. **C3 is flagged as a spec gap for the supervisor / EG5.** |
| **A4** | reviewer M3 (new file outside `touches:`) vs /simplify Q1 (fold in; `battleModel.ts:6` already imports `hpPercent` from `boxModel.ts` — house precedent for cross-screen pure-helper reuse). | **NO new file.** The eligibility port lives in `client/src/ui/evolutionModel.ts`; `boxModel.ts` imports from it. Resolves the touches question and the simplification in one move. |
| **A5** | reviewer M5 (no surface for the *progress* half of EG4-1) vs /simplify Q3 (`EvolutionGateViewModel` is speculative). | **Reviewer wins.** EG4-1 says requirements/**progress** panel; per-gate current-vs-required is the deliverable, and it is what stops EG4-6 from being passable by a trivial pass-through (red-team M3). `pathRequirements()` is the ONE gate walk; `unmetRequirement` and `pathSatisfied` both derive from it — zero drift by construction, and Rust's `unmet_requirement_agrees_with_path_satisfied` property test needs no TS analogue. |
| **A6** | /simplify Q3 — `EvolutionChoiceViewModel` redundant with `EvolutionPathViewModel`. | **Accepted, collapsed.** `choices` is `readonly EvolutionPathViewModel[]`. |
| **A7** | /simplify Q2 + reviewer minor — `AffinityName`/`TrustTierName` hand-duplicated against `HANDLED_ENUM_VARIANTS`. | `AffinityName` **derived** from `HANDLED_ENUM_VARIANTS.Affinity`. `TRUST_TIER_ORDER` is **hard-coded and exported** (red-team M3: deriving it from the registry makes the ordering test self-referential and green under any reorder); `TrustTierName = (typeof TRUST_TIER_ORDER)[number]`; a test asserts its SET equals `HANDLED_ENUM_VARIANTS.TrustTier`. |
| **A8** | reviewer M7 — no mechanical gate on Rust↔TS TrustTier **order** (`sdk-enum-exhaustiveness` checks membership only). | **Accepted.** A test parses the `__t.enum("TrustTier", {...})` key order out of `client/src/module_bindings/types.ts` (regen-driven, i.e. Rust declaration order) and asserts element-for-element equality with `TRUST_TIER_ORDER`. **Use `String.indexOf`/slice + a LITERAL regex only — no dynamic `RegExp`** (Semgrep `detect-non-literal-regexp` has bitten this repo twice). |
| **A9** | reviewer M2 — `eligibleEvolutionPaths` result order nondeterministic (Map iteration = subscription-arrival order). Rust returns content order. | **Sort by `edgeId` ascending** before returning. Pinned by a shuffled-insertion-order test. |
| **A10** | red-team M2 — duplicate-affinity essence requirements: Rust `.all()` over the **list**; a Record-keyed port collapses them (last-wins) → over-count, and loses the list order `unmet_requirement` reports in. | Monster essence is a **Record** (kills match-by-position). Path requirements stay an **ordered array**, iterated with `.every()`, and the unmet scan follows array order. |
| **A11** | red-team M1 — `server-module/src/marshal.rs:354-362` `Level::new` rejects `0` / `>100`; `check_and_evolve` **skips** such an edge, `evolve()` hard-errors. A naive `level >= minLevel` treats `minLevel: 0` as trivially satisfied. | Mirror the skip: a path with `minLevel < 1 \|\| minLevel > 100` is **never satisfied and never eligible**. |
| **A12** | red-team H2 — `client/src/main.wiring.test.ts` is an existing `readFileSync` wiring gate over `main.ts` (`W-RN-REDUCER`, `W-TP-REDUCER`, `W-CARE-REDUCER-CALL`). `toSpecies: 0` still typechecks after the signature widens, so EG4-3 has **zero** runtime gate today. | Add a `W-EVOLVE-REDUCER` tooth: the `onEvolve` region contains `reducers.evolve(` and does **NOT** contain `toSpecies: 0`. `main.wiring.test.ts` is treated as an always-in-scope **sibling test of the declared `client/src/main.ts`**; declared in `touches-delta:`. |
| **A13** | reviewer M4 / red-team M4 — `client/src/ui/menuModel.ts:67` still reads `'Evolve & Fuse'` (pinned by `menuModel.test.ts:163,559`, `menuView.test.ts:137`); `helpModel.ts:35` reads `'Open Evolution / fuse monsters'`. | **DO NOT TOUCH — outside `touches:`.** EG4-5's "ALL fusion-wiring" is defined by the colon-list that follows it (view-models, picker, store/rowConvert/connection wiring, `onFuse`); a menu *label* is not in that list, so this is a cleanup invitation, not a task requirement → **follow-up flag**, per the intent boundary. Raised as a HIGH-priority follow-up in the handoff and PR body. |
| **A14** | red-team M6 — no mechanical client/server parity gate for the ported rule (repo precedent: `evals/{movement,prediction,js-path}-parity`). Proposed a Rust-generated JSON fixture matrix. | **Deferred, flagged.** It needs a new Rust test in `game-core/` + a committed fixture — both **outside `touches:`** → would be a hidden-dependency STOP. A8's binding-order test closes the highest-value drift hole in-scope. Recorded as a follow-up for EG5. |
| **A15** | red-team M7 — no `fromSpecies` secondary index; badge is O(party × paths) per batch flush. | **YAGNI.** ~10 authored edges today. Follow-up flag only. |
| **A16** | /simplify Q6 vs red-team M5 — party-only badge, or box too? | Compute in the shared `toCard()` → both lists. This is **less** code than special-casing party-only, and boxed monsters genuinely reach 2+ eligible (`care`/`train`/`essence_train` have no party check). Superset of EG4-8. |
| **A17** | /simplify Q5 — export only `trustTierRank`. | **Overruled by A8** — `TRUST_TIER_ORDER` must be exported for the ordering-drift test. |
| **A18** | reviewer M8 — three pattern-level decisions ship undocumented (client-side port of a game-core predicate; the client type shrink; TrustTier order re-establishment). | EG4 lands **no ADR** (supervisor decree). Flagged in the handoff + PR body for EG5-4's scope. |

### Verified probe facts (red-team, against the installed SDK) — build against these
- `t.option(T)` decodes `None` as **`undefined`**, never `null`. Normalize to `null` at the converter; be total over both.
- `t.option(t.u8())` decodes `Some(0)` as `0` — the falsy-coercion trap is live. Use `== null` / explicit `undefined` checks, never `||`.
- **A unit enum variant deserializes to `{ tag: "Friendly", value: {} }`**, not a bare `{ tag }`. Structural `Sdk*Row` interfaces and converter-test fixtures must not assume a bare `{tag}`.
- `conn.db.evolution_path` confirmed (`client/src/module_bindings/index.ts:162-174`).
- No eval pins the `fusion` subscription; `conversation-privacy` bracket-walks `.subscribe([` — swapping `fusion` → `evolution_path` is safe. A wrong table name errors the WHOLE subscription and `onApplied` never fires — verify the string against `index.ts:163` (`name: 'evolution_path'`).
- `docs/knowledge/**` regen is a **no-op** for a client-only slice (`scripts/okf-export.mjs` sources `server-module/src/*.rs` only). Don't budget for it.
- `box-view-privacy.eval.mjs` brace-walks `type StoreMonsterPub = {...}` and forbids `iv*`/`ev*`/`natureKind` only — the new fields are clean.
- Semgrep runs `--config auto --error`. **Render nicknames/species names with `textContent`/`createElement`, never `innerHTML`** (nicknames are player-controlled via `set_nickname`).
- `client/e2e/recruit.spec.ts:314,330-334,357-359,390-392,428-430` resolves the box root as `h2['Party & Box'].parentElement.parentElement` and scans `root.textContent` for `'HP 0/'` and an `HP cur/max (pct%)` shape. **The badge must render inside `#renderCard`, must not wrap the header, and must not emit text matching `HP `.**

---

## B. Frozen API — `client/src/net/store.ts`

```ts
export type AffinityName = (typeof HANDLED_ENUM_VARIANTS.Affinity)[number];   // re-exported from rowConvert
export type EssenceByAffinity = Readonly<Record<AffinityName, number>>;

export type StoreMonsterPub = {
  // ... unchanged public stat fields ...
  // REMOVED: bond, evolvesTo
  readonly tier: number;
  readonly essence: EssenceByAffinity;
  readonly trustTier: TrustTierName;
  readonly qualityTimeTier: number;
  readonly nutritionPct: number;
};

export type StoreEssenceRequirement = {
  readonly affinity: AffinityName;
  readonly amount: number;
};

export type StoreEvolutionPath = {
  /** DB-internal key ONLY — the store map key (A1). NEVER read by a model or view-model (EG1-12). */
  readonly pathId: bigint;
  readonly edgeId: number;
  readonly fromSpecies: number;
  readonly toSpecies: number;
  readonly minLevel: number;
  /** ORDERED (A10) — never collapsed to a record. */
  readonly essence: readonly StoreEssenceRequirement[];
  readonly minTrustTier: TrustTierName | null;   // null = PERMISSIVE (absent), not "lowest tier"
  readonly minQualityTimeTier: number | null;
  readonly minNutritionPct: number | null;
};
```

Store surface: `#evolutionPaths: Map<bigint, StoreEvolutionPath>` keyed by `pathId`;
`upsertEvolutionPath(p)` / `removeEvolutionPath(pathId: bigint)` / `evolutionPaths(): IterableIterator<StoreEvolutionPath>` / `evolutionPathCount`; cleared in `reset()`.

**Deleted:** `StoreFusionRow`, `#fusions`, `upsertFusion`, `removeFusion`, `fusions()`, `fusionCount`,
the `reset()` fusion clear, `SdkFusionRow`, `fusionRowToStore`, `ingestFusion` + its 3 handlers,
`'SELECT * FROM fusion'`, `FusionRecipeViewModel`, `toFusionRecipe`, `fusionRecipes`, `onFuse`.
**KEPT:** generated `client/src/module_bindings/fusion_table.ts` + `types.ts` `Fusion` (EG5-6 removes them).

## C. Frozen API — `client/src/ui/evolutionModel.ts` (the eligibility port lives HERE, A4)

```ts
/** Ascending — mirrors game-core/src/evolution/eligibility.rs ASCENDING. Hard-coded (A7/A8). */
export const TRUST_TIER_ORDER = ['Hostile','Wary','Neutral','Friendly','Devoted'] as const;
export type TrustTierName = (typeof TRUST_TIER_ORDER)[number];
export function trustTierRank(tag: string): number;            // unknown -> -1

export type EvolutionGateKind = 'level' | 'essence' | 'trust' | 'qualityTime' | 'nutrition';
export interface EvolutionGateViewModel {
  readonly kind: EvolutionGateKind;
  readonly label: string;        // 'Level' | 'Fire essence' | 'Trust' | 'Quality time' | 'Nutrition'
  readonly currentText: string;
  readonly requiredText: string;
  readonly met: boolean;
}

/** THE single gate walk (A5). Ordered level -> essence(list order) -> trust -> qualityTime -> nutrition.
 *  Permissive gates (null threshold, empty essence list) emit NO row. TOTAL: never throws. */
export function pathRequirements(m: StoreMonsterPub, p: StoreEvolutionPath): readonly EvolutionGateViewModel[];
export function pathSatisfied(m, p): boolean;                  // = every row met (and A11 level-range check)
export function unmetRequirement(m, p): string | null;         // = first unmet row, Rust message format
export function eligibleEvolutionPaths(m, paths): readonly StoreEvolutionPath[];  // fromSpecies filter, FULL set, sorted by edgeId (A9)
```

`unmetRequirement` message formats mirror `eligibility.rs:116-151` exactly:
`requires level {n}` · `requires {amount} {Affinity} essence` · `requires trust tier {Tier}` ·
`requires quality time tier {n}` · `requires nutrition {n}%`.

View-models:

```ts
export interface EvolutionPathViewModel {
  readonly edgeId: number;
  readonly toSpecies: number;
  readonly toSpeciesName: string;
  readonly met: boolean;
  readonly unmetReason: string | null;
  readonly gates: readonly EvolutionGateViewModel[];
}
export interface EvolutionMonsterViewModel {
  readonly monsterId: bigint;
  readonly speciesName: string;
  readonly nickname: string;
  readonly level: number;
  readonly tier: number;
  readonly trustTier: TrustTierName;    // EG4-6: all three derived outputs surfaced
  readonly qualityTimeTier: number;
  readonly nutritionPct: number;
  readonly paths: readonly EvolutionPathViewModel[];   // ALL outgoing edges = the progress panel
  readonly eligibleCount: number;
  /** EG4-2: non-empty IFF eligibleCount >= 2. ALWAYS empty at 0 or 1. */
  readonly choices: readonly EvolutionPathViewModel[];
  /** A3: non-null IFF eligibleCount === 1. Informational copy only — NEVER an action. */
  readonly readyPathName: string | null;
}
export interface EvolutionViewModel { readonly monsters: readonly EvolutionMonsterViewModel[]; }
export function buildEvolutionViewModel(monsters, speciesMap, paths): EvolutionViewModel;
```

**Never reintroduced:** `canEvolve`, `evolvesToSpeciesName`, `bond`, `fusionRecipes`, or any single
`toSpecies` scalar on the monster view-model.

## D. Frozen API — `client/src/ui/boxModel.ts` (EG4-8)

`MonsterCardViewModel` gains `readonly evolutionChoicePending: boolean` — true IFF
`eligibleEvolutionPaths(m, paths).length >= 2`. Computed in the shared `toCard()` (A16); both
`buildPartyViewModel` and `buildBoxViewModel` gain a trailing
`paths: readonly StoreEvolutionPath[] = []`. `boxView.ts` renders a badge inside `#renderCard`
(`data-testid="evo-choice-badge"`), no wrapper around the header, no text matching `HP `.

## E. Frozen — `raisingModel.ts` / `raisingView.ts` (EG4-4)

`RaisingMonsterViewModel.bond: number` → `trustTier: TrustTierName` (verbatim copy, no derivation).
`raisingView.ts:150` `Bond ${mon.bond}` → `Trust ${mon.trustTier}`.

## F. Frozen — `main.ts` (EG4-3)

`onEvolve: (monsterId: bigint, toSpecies: number) => void`, forwarding the **parameter**
(`reducers.evolve({ monsterId, toSpecies })`) — the `toSpecies: 0` literal is deleted. `onFuse` removed.
`refreshEvolution` passes `[...store.evolutionPaths()]`; `refreshBox` passes the same to both box builders.
Preserve the `?.visible || identity === ''` refresh idiom (pinned at ≥6 occurrences,
`main.wiring.test.ts:5337-5344`).

---

## G. Gating tests — EARS → teeth (what each MUST bite)

| Criterion | Test file | Fixture / assertion | Mutation it kills |
|---|---|---|---|
| EG4-1 | `evolutionModel.test.ts` | level `=== minLevel` eligible, `minLevel-1` not — **per gate** (5 boundary fixtures) | `>=` → `>` on any gate |
| EG4-1 | ″ | 8 **distinct** essence values, assert each `AffinityName` reads its own column | a Wind/Light column swap in the converter map |
| EG4-1 | ″ | path needs `{Water:10}`; monster `{Fire:999,Water:0}` NOT eligible, then `{Fire:0,Water:10}` eligible | essence matched by position/index |
| EG4-1 | ″ | `essence: []` → no requirement, no gate row | `.every` → `.some` |
| EG4-1 | ″ | each of the 5 gates unmet in turn with the other 4 met | `&&` → `\|\|` |
| EG4-1 | ″ | `minTrustTier:'Neutral'` + monster `'Devoted'` → **eligible**; `minTrustTier:'Devoted'` + `'Hostile'` → **not** | TrustTier compared as a string (lexicographic order gets BOTH backwards) |
| EG4-1 (A2) | ″ | unknown threshold tag → NOT eligible; unknown monster tag → NOT eligible; neither throws | the `-1` sentinel failing open on the threshold side |
| EG4-1 (A11) | ″ | `minLevel: 0` and `minLevel: 101` → never eligible | naive `level >= minLevel` |
| EG4-1 (A10) | ″ | `essence: [(Fire,900),(Fire,150)]`, monster Fire=200 → NOT eligible | record-collapse last-wins |
| EG4-1 (A9) | ″ | shuffled insertion order → `choices`/eligible set still ascending by `edgeId` | Map-iteration-order dependence |
| EG4-1 (A8) | ″ | `TRUST_TIER_ORDER` === the `__t.enum("TrustTier",{...})` key order parsed from `module_bindings/types.ts`; and its SET === `HANDLED_ENUM_VARIANTS.TrustTier` | a Rust enum reorder (invisible to `sdk-enum-exhaustiveness`, which checks membership only) |
| EG4-1 | ″ | 25 hard-coded `(a,b)` rank comparisons — **literal booleans, not derived** | a self-referential ordering test |
| EG4-1 | ″ | `unmetRequirement` returns the FIRST unmet gate in canonical order; message strings match the Rust formats verbatim | reordered gate reporting / message drift vs the server's reject string |
| EG4-2 | `evolutionModel.test.ts` | 2 eligible → `choices.length === 2`, both `toSpecies` present | **first-match auto-resolve** (`.find`/`[0]`) |
| EG4-2 | ″ | exactly 1 → `choices` empty AND VM has no `canEvolve`/`evolvesToSpeciesName` key | reintroducing the single-eligible Evolve action |
| EG4-2 (A3) | ″ | exactly 1 → `readyPathName` non-null; 0 and 2 → null | 1-eligible rendering identically to 0 |
| EG4-3 (A12) | `main.wiring.test.ts` | `W-EVOLVE-REDUCER`: `onEvolve` region contains `reducers.evolve(` and NOT `toSpecies: 0` | the literal-0 stub surviving the signature widening |
| EG4-4 | `raisingModel.test.ts` / `raisingView.test.ts` | `trustTier` copied verbatim incl. `'Hostile'`; VM has no `bond`; status line contains `Trust` and NOT `Bond` | re-deriving trust; a half-swapped label |
| EG4-5 | `store.test.ts` / `rowConvert.test.ts` / `evolutionModel.test.ts` | `upsertFusion`/`fusions`/`fusionCount` undefined on a store instance; `EvolutionViewModel` has no `fusionRecipes` | a partial deletion leaving dead wiring |
| **EG4-6** | `evolutionModel.test.ts` | **Differential, not pass-through:** two monsters differing ONLY in `trustTier` (one eligible, one not); same for `qualityTimeTier`; same for `nutritionPct`; plus an equality case per gate. Assert `gates` carries a trust row, a qualityTime row and a nutrition row each with the monster's current value | a panel that renders only level+essence and pass-throughs the three scalars while ignoring their gates |
| EG4-7 | `boxModel.test.ts` / `tradeProposeModel.test.ts` (+ siblings) | no `bond:` literal survives; factories supply the 5 new fields; `store.test.ts:504-528` required-field list updated | — (compile gate) |
| EG4-8 | `boxModel.test.ts` | 0/1/2/3 eligible → `false/false/true/true`; **3 paths of which exactly 1 eligible** → false; a foreign-`fromSpecies` fully-satisfied path → not counted | `>= 1` (badging the auto-resolved case), `=== 2`, `paths.length >= 2` ignoring eligibility, a missing `fromSpecies` filter, a divergent copy of the predicate inside `boxModel.ts` |
| EG4-8 | `boxView.test.ts` | badge present when flagged, absent otherwise; renders inside the card; no `HP ` text | e2e-breaking DOM restructure |
| **A1** | `store.test.ts` / `connection.test.ts` | `onInsert(pathId=9, edge 7)` **then** `onDelete(pathId=5, edge 7)` → edge 7 still present | the `edgeId`-keyed store wipe |

Repo convention: `it('BITES: …')` with a `// Kills: …` comment.

---

## H. Post-test-review adjudications (red-team pass on the tests)

| # | Decision |
|---|---|
| **D1** | `EvolutionMonsterViewModel.paths` (the full outgoing set the panel renders) is **ascending by `edgeId`**, same as `choices` / the eligible set. Same rationale as A9: a muscle-memory click must not land on a different evolution between sessions. |
| **D2** | An out-of-range `minLevel` (`< 1` or `> 100` — the A11 case the server skips) emits a level gate row with **`met: false`**. Never a green row on a permanently-blocked path. |
| **D3** | **A new `client/src/ui/evolutionView.test.ts` gates the marquee DOM surface** (EG4-1's panel, EG4-2's choice picker, A3's ready copy, EG4-5's fusion removal, and `textContent`-not-`innerHTML` for player-controlled nicknames). Previously EG4-1/EG4-2 had no rendering gate at all while EG4-8 had four. A sibling `.test.ts` of a declared file is always in scope. |
| **D4** | INFO only: `client/tsconfig.json` excludes `**/*.test.ts`, so test fixtures are **never typechecked**. EG4-7's "avoid a TypeScript compile failure" premise is inaccurate — the real teeth are runtime (`store.test.ts` required-field list, `rowConvert.test.ts` `not.toContain('bond')`). Another spec-text correction to flag. |
| **D5** | The implementer keeps `main.ts`'s **inline-arrow** callback idiom (`onEvolve: (monsterId, toSpecies) => {…}`), not a named-function reference — `main.wiring.test.ts`'s parameter slice assumes it. |

### Red-team corrections already applied to the tests (do not undo)
1. `connection.test.ts` — the `batcher.schedule()` window was a **false red** against the house `const ingestX = …` helper idiom; re-anchored on `evolutionPathRowToStore(` → `conn.db.evolution_path.onDelete`.
2. `evolutionModel.test.ts` A9 — fixture was monotone in `pathId`, so a `pathId` sort passed for free; now anti-correlated.
3. `evolutionModel.test.ts` EG4-2 — `choices` fixture was monotone in `toSpecies`; now anti-correlated.
4. `evolutionModel.test.ts` A2 — fail-closed now pinned on the **gate row** (`met === false`), not only on `pathSatisfied`; an all-green trust row next to a blocked path was previously passable.
5. `rowConvert.test.ts` — added a namespace-import probe that `fusionRowToStore` is `undefined` (deleting a test is not a gate).
6. `store.test.ts` A1 — added the **mid-burst** `evolutionPathCount === 2` assertion; the two order tests alone were passable by an `edgeId`-keyed map with a scanning remove.
7. `evolutionModel.test.ts` — added a key-shape tooth so `pathId` cannot leak into `EvolutionPathViewModel` via `{...path}`.
