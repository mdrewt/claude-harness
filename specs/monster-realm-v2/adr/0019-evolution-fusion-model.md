# 0019. Evolution & fusion model (individuality-preserving + content integrity)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M10 design (closes Phase A).

## Context and problem statement
Evolution and fusion transform a monster into another species. The emotional core (ADR-0016) is that each
monster is a *unique individual* a player invests in (genes, training, bond, name). A transform that
re-rolls individuality would erase that investment. Fusion combines two individuals into one; the recipes
and the resulting forms must be content-integrity-safe (no ambiguous recipe; a fusion/evolution-only form
must not appear in the wild). v1 left the integrity rules to row-order and author discipline — both failed
silently.

## Considered alternatives
- **Individuality-preserving transforms + content-integrity gates (chosen).** Evolution carries
  genes/temperament/training/bond/name and re-derives stats; fusion combines both inputs' individuality via
  an order-independent recipe and atomically replaces them with one output. `validate_content` enforces "no
  duplicate fusion pair" and "no wild-catchable derived form", each with a proof-of-teeth fixture.
- **Re-roll individuality on transform.** Simpler, but erases the player's investment and the discovery
  loop's payoff. Rejected.
- **Fusion produces a fresh average monster** (no inheritance). Loses what made the inputs special.
  Rejected.
- **Integrity by author discipline / RON comments** (v1). The first matching recipe wins by row order; a
  derived form sneaks into encounters. Rejected — make it code.

## Decision outcome
- Chosen: **carry/combine individuality through transforms; gate content integrity in `validate_content`.**
- Consequences: `derive_stats` is re-run after a transform (single source of truth); `fuse` is one atomic
  transaction (delete two, insert one) and respects the escrow/in-battle guards (ADR-0017/M15); the
  integrity rules are mechanical (fixtures), not discipline. Trade-evolution and temporary battle-forms are
  deferred (additive) to M15/M14.

## Amendment — 2026-07-25 (fuse() drift from stated intent; fusion-vs-evolution design debate)

**Trigger:** Drew's first closed playtest (`playtest-gate-decision-2026-07-25.md`) reported that fusion
"erases the individual monsters... while evolution allows the individual monsters to grow and develop,"
proposing to replace fusion with a typed-energy-accumulation evolution system. Rather than deciding
unilaterally, this was run through a full research → brainstorm (5 divergent candidates) → adversarial
debate (2 axes, FOR/AGAINST + judge) → 3-judge panel → 4 rounds of adversarial critique-and-refine
workflow (`monster-realm-evolution-fusion-redesign`, 35 agents, 2026-07-25) before any decision was made.
Full research/candidates/debate/judgment trail: `$MEM/monster-realm-evolution-fusion-workflow-2026-07-25.md`
(harness memory card). Implementation-ready spec: `M-postgate-evolution-fusion-hardening.spec.md`.

**Finding: this ADR's own stated intent ("identity isn't erased by a transform") was never fully honored
by `fuse()`'s implementation.** `evolve()` correctly carries 100% of individuality state (nickname, level,
xp, IVs, nature, EVs, bond) — full compliance. `fuse()` correctly combines the *genetic* half (IVs via
per-stat max, nature from the higher-bond parent — the DQM-inheritance model this ADR's "considered
alternatives" already chose over a fresh-average reroll) but resets the *relationship* half — level→1,
EVs→0, bond→default, nickname→`None` — to fresh values on every fusion. That is a real, verified drift
from "carry/combine... not erase," not a misreading of the original decision.

**Decision: repair `fuse()`, do not replace fusion with evolution.** The debate panel and 3-judge synthesis
converged (adversarially, across 4 refinement rounds — not a first-draft accept) on:
1. **Fusion stays permanent/destructive** (both parents consumed, one new row) — its economy-sink role
   (game-design.md §6) and Steamveil's only legitimate acquisition path both depend on it, and no candidate
   proposing temporary/reversible fusion resolved what replaces that sink.
2. **`fuse()`'s field-carry formula is broadened**, extending the *combine, don't erase* treatment this ADR
   already grants IVs/nature to level, EVs, and bond too (taxed/averaged rather than hard-reset — see the
   new spec for the exact formulas, which close a self-fusion/bond-laundering exploit found during
   critique) — this is the actual fix for Drew's complaint, not a new mechanic.
3. **Drew's worked example ships almost for free, with zero engine changes**: the evolution-trigger enum
   already has a live `Item(id)` variant (exercised today by species 1/Flameling's branch); two new
   Item-triggered evolution branches on existing species reproduce his "Flameling + Water Energy →
   Steamveil"-shaped pitch through already-built plumbing.
4. **The full typed multi-energy-accumulator system is explicitly deferred, not rejected** — gated on
   playtest evidence that the cheap item-triggered version (point 3) doesn't already satisfy the H2
   divergence/attachment hypothesis. The evolution-trigger enum was deliberately built with no wildcard
   match arm (this ADR's own mechanical-enforcement discipline), so this deferral costs no real option
   value: adding a typed variant later is exactly as cheap as building it now, without the risk of an
   under-evidenced 8-typed-accumulator system (a legibility failure mode multiple researched precedents —
   Digimon World 1's opaque multi-axis gating — hit hard).

**Not unanimous — recorded honestly, not smoothed over** (see the new spec's Decisions section for the
full open-decision list Drew should confirm/override): whether fusion should remain a distinct mechanic
long-term at all (a minority position through the critique rounds argued for graduating it to a
secondary/optional system, given its 1-recipe-vs-6-evolution-block content footprint); the exact tax/floor
constants (structurally sound, proven exploit-closed, but not playtest-tuned); where the new
`fusion_eligible()` gate should live in the module structure.

**Consequences:** no schema change for the core fix (Slice A0 is a function-signature + one reducer-arg
change, ~23 compiler-enforced call sites); a small new private table + owner-scoped view for a fusion
preview screen is deferred to a fast-follow slice (A1); the 1 existing `fusion.ron` recipe and all 6
existing `evolutions.ron` blocks are unchanged in place — no content migration, no backfill of
already-fused rows (a one-time grandfather, not a correction). Superseded belief: ptc5-era discussion
assumed fusion's mechanics were either fine as-is or needed wholesale replacement; neither was correct —
the gap was narrow and specific, and finding that required actually reading `fuse()`'s implementation
against this ADR's own stated intent, not re-deriving fusion design from genre first principles.

## Amendment — 2026-08-02 (fusion removed; essence-graph evolution model, supersedes the 2026-07-25 amendment per Drew's r2 override)

**Trigger:** Drew's playtest feedback (documented in M-postgate-eleventh-review-residuals.spec.md) initiated round-2 adversarial review across the 2026-07-25 amendment's own synthesis. The review surfaced internal-consistency gaps (species-1 Embersworn branch migration asymmetry; unenforced tier cap; incomplete eval-migration table) and a buildability gap (absent contract-first staging guidance despite the charter's own suggestion of a schema-first slice). More fundamentally, Drew's own directive text ("evolution is explicit player choice; essence is a single-pool system both battle and training feed into; fusion is out") was unified and unambiguous, whereas the 2026-07-25 synthesis had routed around it, proposing a repair-fusion-and-keep-both path instead. A second, narrower 6-candidate synthesis (B1–B6, not a full 35-agent debate) was run with an explicit mandate: take Drew's directive literally and design to that spec, not around it.

**Finding: fusion removal is a real, binding override, not a debate topic.** The 2026-07-25 amendment's own framing — "the typed-accumulator system is explicitly deferred, not rejected" — was a careful choice to preserve long-term optionality. That optionality was explicity revoked by Drew's own directive for this round. The present amendment honors that directive.

**Decision: remove fusion entirely. Evolution becomes a directed graph, essence-gated (§1–§2 of the implementation-ready spec), with five AND-combined factors (level, tier, essence, trust, quality-time).** Fusion's dual-parent-combine and permanent-sink economy roles are recognized as real design work that *did* matter to the 2026-07-25 synthesis, but Drew's explicit judgment is that the complexity and opacity cost more than those roles are worth at this stage. All five factors are applied uniformly: (1) **Tier** — a new standardized 0–3 scalar on Species, wild species locked to tier 0 by structural validation, every evolution edge forced to tier-up exactly (a DAG by construction, not by separate validation). (2) **Essence** — 8 flat private `u32` columns on Monster (one per Affinity type, reusing the existing enum), accumulated from PvE battle wins, a new dedicated `essence_train()` cooldown reducer, or rare-item consumption, all reset to zero on any evolution (the essence is "spent" by the edge trigger itself, per Drew's phrasing). (3) **Trust** (replaces Bond entirely) — Bayesian-smoothed (K=10; formula in EG1-6 of the spec) Favorable/Unfavorable counts on the private Monster row, derived to a coarse 4-tier label on MonsterPub. Credited favorably by `care()` succeeding, and by a capped once-per-24h wild-battle win; credited unfavorably by a wild-battle faint. `train()`/`essence_train()` succeeding do NOT touch Trust. Asymmetric gates apply uniformly across Trust, essence, and Quality-Time alike: practice AND PvP battles are both fully exempt from all three, closing the shared-settlement-funnel collusion-farming vector for either credit type. (4) **Quality Time** — a per-day counter (no scheduled reducer — directly violates this codebase's hard `evals/no-idle-accrual` gate) credited once per calendar day inside the already-allowlisted deliberate-action reducers; exposed as a coarse tier only. (5) **Nutrition** — a zero-new-storage relabeling of the existing EV-total percentage, exposed as a public aggregate percentage (a narrow exception to the EV/IV privacy rule), with the binding constraint that EVs are *only* acquired from item consumption (no battle grants — per binding constraint #1), making Nutrition the sole permanent-character axis for stats, a deliberate regression from the Pokémon/DQ precedent (detailed risk and remediation in §2.5 of the implementation-ready spec).

**Converged design shape:** an explicit `evolve(monster_id, to_species)` reducer (player always names the specific target species); the server re-derives eligibility fresh at call time from live state; multi-eligible edges never auto-resolve (Applin model, not silent race-to-first-wins); migrations preserve gate parity (species 30/31's migrated edges never silently tighten beyond the old item-triggered requirements); species 6 (Steamveil, whose only old path was fusion) gains two new fan-in edges from species 1 and 2, demonstrating the multi-source graph capability Drew's directive explicitly called for. Removed outright: `fuse()`, `EvolutionTrigger`/`EvolutionCondition`/`SpeciesEvolutions`, the `Fusion` table, `fusion.ron`, the A0 taxed-carry/field-combine formulas (ADR-0147 in its entirety — none of that work carries forward), and the item-as-discrete-trigger shape (ADR-0149 — item-trigger becomes item-as-essence-source, a generalized input to the accumulated-pool model, not a discrete one-shot transform). The requirements/progress screen (direct implementation of the tiered-graph research's most load-bearing UX recommendation: visible-threshold transparency) is built essentially for free from the new public `evolution_path` table plus existing owner-RLS-scoped private-Monster subscription.

**Validation rule additions (§5 of the spec):** tier cap (rule 11 — `Species.tier <= 5`, PROVISIONAL as of the 2026-08-02 addendum below, structural enforcement of the standardized tier range); tier monotonicity on every edge (rule 5 — ensures DAG, prevents downgrade chains); derived-forms-not-wild invariant (rule 6 — no evolution-only species may appear in any encounter table; carries forward 2026-07-25's one-directional check, not a bidirectional strengthening of it); essence-type cap at 3 per edge (rule 7 — legibility on-screen); item-purpose exclusivity (rule 9 — no ItemDef may carry `essence_affinity` alongside `train_stat` or `cure_status`); edge-identity well-formedness (rule 12, added 2026-08-02 — see addendum below).

**Schema mutation disposition:** additive-only Migration A ships with EG1 (§2 EG1-1/EG1-2 of the spec — the new `evolution_path` table, and the essence/Trust/Quality-Time/tier columns on `Monster`/`MonsterPub`, all new, appended, and carrying explicit `#[default(...)]` annotations); `bond`/`evolves_to` removal, and the now-unused `Fusion` table struct's removal, are a separate Migration B — an explicit incremental migration (ADR-0006's ADR-gated escape hatch), sequenced after EG2/EG3/EG4 land and landing alongside EG5, never combined with Migration A in one `spacetime publish`. Build sequencing guidance is in §2/§7 of the spec: a contract-first schema-content slice (EG1) freezes the shape, then EG2/EG3/EG4 build the reducer/content/client layer in parallel behind that freeze, then EG5 lands the eval-gate migration, docs, and Migration B together.

### Addendum — 2026-08-02 (`evolve()` key-design debate + real full-roster scale numbers)

**Trigger:** two follow-up items, same day as the amendment above, before any EG-slice implementation began. (1) A design question on why `evolve()` takes `to_species` rather than an edge/path identifier, given the graph framing — worth a real debate rather than an assumption, since the original synthesis never explicitly recorded a reason. (2) Drew supplied the actual full-roster target this design had been sized without: ~500 species across 7–9 tiers, 3–10 evolutions per non-top-tier species. Both were resolved before content authoring begins, not after.

**`evolve()`'s key design — resolved by a genuine two-agent debate to full consensus (not a coin flip, not one side yielding):** `evolve(monster_id, to_species)` stays as specced — R1 (no duplicate `(from_species, to_species)` pairs) makes it a complete, unambiguous key today, and it matches the player's actual decision vocabulary (the panel, the choice UX, error messages are all already species-terms). The debate's real finding was two-part: (a) `evolution_path` was missing a database index entirely, inconsistent with this project's own established convention of indexing every other lookup-heavy table — genuinely fixed now (spec EG1-4), independent of the key-design question. (b) The deferred lineage feature (`evolved_via_*`) needs a durably-identified edge to reference, and the DB auto-increment `path_id` is not confirmed stable across content republish — genuinely fixed now by adding a second, content-authored `edge_id` field (spec EG1-4/EG1-12/R12), used internally only; `evolve()`'s wire contract never needed to change to get this. `evolve()`'s internal implementation changes from "compute the full eligible-path set, then check membership" to "look up and validate the one targeted edge directly" (spec EG2-1), sharing a gate-evaluation predicate with the unchanged full-set query (spec EG1-6) so the two can never drift. One documented contingency: if R1 is ever relaxed to allow parallel edges between the same species pair, `evolve()`'s signature must be revisited then — low-probability, not solved now.

**Tier cap corrected, marked provisional:** the original `Species.tier <= 3` (four tiers) was sized against no real target at all. Against the actual ~500-species/7–9-tier target, it's simply wrong. Raised to `Species.tier <= 5` (six tiers, R11) as a deliberate interim value — not a final answer — chosen because it unblocks content authoring now without over-committing to an unconfirmed exact count; revisit before content authoring approaches the new cap. Two further scale-driven findings recorded as open decisions in the spec (§4), not silently resolved: `TrustTier`'s 4-variant closed enum has a granularity ceiling well below a 7–9-tier ladder (Quality-Time, a plain `u8`, does not have this problem); and the "never auto-resolve, present all eligible paths" UX (already correct in principle) has only been demonstrated at 2–3-way branching, not the 10-way branching the real target implies.

Implementation-ready spec (updated): `M-evolution-essence-graph.spec.md` §2 (EG1-4, EG1-6, EG1-12, EG2-1), §4 (two new decision items + amplified stakes on the existing tier-per-edge item), §5 (R1 note, R11 revised, new R12), §6 (two new deferred items).

### Addendum — 2026-08-02 (event-based auto-evolution, per Drew's clarification)

**Trigger:** Drew clarified the original directive's intent — evolution is not a standing player action gated by a manual "Evolve" button. A monster with exactly one currently-satisfied path evolves automatically, the moment it becomes eligible. Player choice is needed ONLY when a monster is simultaneously eligible for 2+ paths — the genuine-ambiguity case the original synthesis's "never auto-resolve" principle was actually protecting against. This is a real interaction-model change, not a restatement: `evolve(monster_id, to_species)` (the earlier addendum, above) goes from being the sole path to evolution to being reachable, in practice, only for disambiguation.

**Mechanism:** eligibility is re-checked, fresh, every time any gate value (essence/level/Trust/Quality-Time) changes — a new shared `check_and_evolve` helper called from the same five reducers already established for Quality-Time accrual (a confirmed complete covering set, since Quality-Time itself changes on all five and is one of the checked gates). 0 eligible → no-op; exactly 1 → auto-apply immediately, same transaction; 2+ → unchanged player-choice UI, now additionally surfaced via a party-roster badge (client-computed, no new server state) rather than only being discoverable by opening a monster's own panel. Evolving can itself make the next tier immediately reachable (Trust/Quality-Time/level persist across evolution) — per Drew's directive this cascades automatically, bounded structurally by the tier cap (R5+R11), with an explicit defensive iteration cap as well.

**Explicitly deferred, not built:** a player-facing decline/cancel affordance. Drew flagged a possible future direction instead — equippable items that freeze specific gate values from changing (an XP-blocking or essence-blocking item) — noted in the spec (§6) as a forward-looking idea only, no design or schema commitment made now.

Implementation-ready spec (updated): `M-evolution-essence-graph.spec.md` §1 (event-triggered framing), §2 (EG2-11/12/13 new; EG2-1, EG4-2 revised; EG4-8 new; EG5-4 updated), §6 (decline/cancel note).

**Supersessions:** this amendment supersedes ADR-0147 (evolution-fusion-taxed-carry — the A0 work to repair fusion and carry fields through fuse() is explicitly not inherited) and ADR-0149 (item-triggered-evolution-content — the discrete item-trigger design is subsumed into the essence-source model, a generalization rather than a deployment of that design). Full detail on what survived the redesign (species 30/31 BST/flavor/migration-fidelity, the shop-stocking convention, Steamveil sidegrade flavor) vs. what was discarded (the reduce-to-average fusion model, A0's field-tax math, A1's preview-reducer, C's lineage-tracking) is in §8–§10 of the implementation-ready spec.

Implementation-ready spec: `M-evolution-essence-graph.spec.md`.
