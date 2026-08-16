# 13r-e plan memo — monster_pub need-to-know privacy (ADR-0194)

**Status:** planning complete; plan-review lenses (reviewer+red-team, opus) dispatched; T2 probe DONE.
**Branch:** `feat/13r-e-monster-pub-need-to-know` @ worktree `.claude/worktrees/13r-e` (base master 1756653).

## Decision (orchestrator, per autonomy doctrine; recorded in ADR-0194)
Mechanism = **private table + owner-scoped multi-row view** (`my_monster_pub`), the ADR-0154/0087 family pattern.
**`engaged_monster_pub` DEFERRED**: verified zero client consumers of other-player monster_pub rows
(battle UI ← battle.state; trade UI ← embedded MonsterCard; challenge UI takes no monsters; store.monster()/
monsters() have no production callers). EARS 2's required row set is empirically EMPTY → satisfied with zero
delivery; e2e proves UIs render fully. ADR specs the engaged view + trigger condition (first production read
of a non-own monster row).

## Load-bearing verified facts
- Rust crate is **spacetimedb 1.12.0** (CLI product 2.6.0 ≠ crate version). Views: `Vec<T>` OK, indexed access
  only, **NO view PK in 1.12.0** → SDK never fires onUpdate; updates arrive as unordered onInsert+onDelete
  within a transaction burst. Client must burst-reconcile (remove deletedIds∖insertedIds at MicrotaskBatcher
  flush; pure fn `resolveBurstRemovals`). my_wallet insert-only wiring and my_conversation pairwise
  `shouldRemoveOnViewDelete` are both WRONG here (stranding / coalescing-wipe).
- **T2 probe (DONE, live spacetime 2.6.0, scratch server 127.0.0.1:3111, db mr-13re-privflip):**
  public→private automigration **ACCEPTED** — verbatim: `▸ Changed access for table monster_pub (public → private)`,
  `Updated database` same identity, seeded row survived; view publishes + serves owner rows;
  `spacetime generate` emits `my_monster_pub_table.ts`, `monster_pub_table.ts` disappears.
- `evals/monster-privacy.eval.mjs` ALREADY EXISTS (spec's "(new)" is stale): its `checkMonsterPubClean`
  asserts monster_pub IS public → revised per #284 (spec-driven flip, not weakening); hidden-genes checks +
  per-file stripper-soundness retained.
- RLS `client_visibility_filter`: exists in crate 1.12.0 ONLY behind `feature = "unstable"`; `Filter::Sql`
  can't express Vec<u64> membership → over-broad; rejected in ADR. schema.rs:405 comment stale → fix in-hunk.
- `scripts/okf-export.mjs`: NOT touched (out of declared set; degrades gracefully — private table w/o
  PRIVATE_ADRS entry just loses its Privacy section). Follow-up flag in PR/handoff.
- Rust mirror test → `evolution_tests.rs` (in-scope sibling; owns monster_pub discipline tests) — avoids
  lib.rs mod-line out-of-set touch.
- sim-harness subscribes only `SELECT * FROM character` — unaffected. battle-schema baseline: no edit
  (visibility not tracked). connection.test.ts:1957 anchor retargets to the view.
- `Items: none` (no feedback-ledger row for #284).

## Tasks (test-first)
T1 revise monster-privacy eval RED-first (clauses V/2a-2e body pin, V/3a-3c reader-closure bans, C bindings
probes, S subscription-shape; BAD+GOOD fixtures each; existing teeth survive) →
T3 schema.rs flip+view+comment fix + evolution_tests.rs mirror →
T4 `spacetime generate` bindings regen →
T5 connection.ts rewire + pure burst-reconcile + store/connection/viewDelete tests →
T6 e2e client/e2e/monster-privacy.spec.ts (two-client: never-see, UIs-render-with-zero-foreign-rows,
live trade ownership transfer) + ADR-0194 + knowledge regen (AFTER schema commit) + adr-digest + minimal
ARCHITECTURE.md.
(T2 done. T7 = deferred engaged view, ADR-spec only.)

## Risks
Burst-reconcile edge shapes (unit-enumerate I/D permutations); eval vacuity (teeth for every clause);
deploy order server-before-client (ADR note); okf-export follow-up flag.
