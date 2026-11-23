## master-red ci-fix — battle-dpad CTL8J-2-A: a kiting wild exhausted the 3-hunt approach budget (test-only; uif-7 #682 stays)

CI run 42458770045 on `3d5f4a63` (the uif-7 merge) failed ONE e2e test (168 passed): `battle-dpad.spec.ts:405` CTL8J-2-DPAD-BATTLE-A → `CTL8J-2-A: the wild never stood adjacent on a fresh own turn within MAX_APPROACH_TURNS=12 own turns in any of 3 of MAX_ADJACENT_HUNTS=3 hunts`.

### Diagnosis (not a uif-7 regression — no revert)
- **Three kiter battles in a row.** The three `hunt N … re-hunting` log lines are 37–38 s apart = 12 full approach turns each. Zone 0's species 3 Sproutlet is the Skittish stance (`tactics::ai`): with the player ADJACENT at its turn start it cannot attack (Heavy `range_min 2`; a disengage-taxed Move + Heavy exceeds 6 AP) and kites to distance 5; the approach loop then steps adjacent again (`draftMoveToward` picks the band tile nearest the wild) and ends the turn — so on EVERY fresh own turn the wild stands at d5. Adjacency is unreachable for that species by the rules, for the whole battle. Species 1 (Aggressive) and 2 (Territorial) stay adjacent (own-tile attacks win the cost tie), so only Sproutlet does this; at weight 5/22 the three-in-a-row draw is ≈ 1.2 % per run — and prior green masters already show hunt 0 re-hunting in 2 of 5 runs.
- **Reproduced locally** with the shipped loop (probe, 10 battles): both Sproutlet battles ran the full 12-turn bound with the CI ping-pong `me(2,5) wild(6,6) d5 | me(6,5) wild(2,6) d5 | …` (HP untouched); every species-1/2 battle stood adjacent on own turn 2 or 3.
- uif-7's 18-file diff is the Monsters screen (boxView / monstersModel / monstersScreen / reachability / i18n + their tests, ui-monsters e2e); nothing under the tactical shell, `controls.ts` or this spec. CTL8J-3x (same battle, same shell) passed moments earlier in the failed run, and the approach loop's own assertion (the Recruit row greyed) held on all 36 turns.
- A deterministic precondition is not available without reseeding initiative (First-Stand is cleared at a unit's own TurnStart, so a hit-to-exhaust setup only works when the starter acts first) — rejected as rule-coupling for a ci-fix.

### Change (`client/e2e/battle-dpad.spec.ts` only; tester-authored)
- **Kite detection, from the event the loop already waits for** (the fresh own turn's snapshot after the wild's reply): the loop remembers the wild it stepped toward (`unitId`, its tile, and the tile the Move left) and, on the next fresh own turn, `kitedAway` is true when our Move reached the tile next to where it stood and that same conscious wild is no longer adjacent — it stepped away. That battle is fled on the spot (the menu is already open on that turn) and the grass re-hunted. Behaviour-based: no species list in the test. The 12-turn bound stays as the fallback for geometry the judgement cannot read (a boxed-in unit, a Move that stopped short).
- **`MAX_ADJACENT_HUNTS` 3 → 8**, derived in its comment from the FROZEN zone-0 weights 10/7/5 (P(kiter) ≤ 5/22; 8 in a row ≈ 7e-6 per run) and the measured cost model (a kiter hunt ≈ 10–15 s now, a full-bound hunt ≈ 37 s; even 8 bound hunts + the fight stay under the 600 s budget).
- **New teeth, not fewer:** every drafted approach Move is asserted executed on the next fresh own turn (`the drafted Move executed: the unit left (x,y)` + the hunt trace) — without it, 8 hunts would have let a dead Move pass green because an Aggressive wild walks up on its own (red-team finding).
- **Diagnostics for the next red:** one line per hunt (`hunt N: battle <id> wild=s<species>L<level> <adjacent@T | kited@T | bound@12 | ended:<phase>@T> — r:turn me(x,y) wild#id(x,y)hp d…`) in the re-hunt log and appended to the named throw; the species comes from a non-fatal owner-SQL read of `battle_wild_unit` (diagnostic only — a CLI hiccup prints `?`, never fails the test). It is the tell between a Skittish kite and an AI that disengages.
- **No assertion removed, relaxed, skipped or moved.** CTL8J-3x, CTL8J-2-A's post-adjacency block (Recruit → bait list → B → B → nothing spent → `fightToOutcome` → results → A → world) and CTL8J-2-B are byte-identical (gate X3 pins twelve of their fragments).

### Proofs (details: `memory/projects/gates/ci-fix-20261108T0800.x2-proofs.md`)
- Red (the defect): the shipped loop vs Sproutlet = `bound` after 12 turns, 2/2, with the CI signature.
- Real-code, both directions (a sandbox copy of the fixed spec with the adjacency success turned into a give-up so all 8 hunts run): 3/3 Sproutlet hunts `kited@2/2/3`, 5/5 species-1/2 hunts `adjacent@2–3`, zero false kites; each kited hunt fled on its own fresh turn and reached the world; the named throw carried all 8 lines with species.
- Mutants on that sandbox: `kitedAway` forced false → every Sproutlet hunt back to `bound@12` (the shipped ping-pong); the draft skipped but recorded → `the drafted Move executed: the unit left (1,1) — r1 … | r2 me(1,1) …` red by name on own turn 2.
- Green: `3 passed` ×3 consecutive (11.0 s / 7.7 s / 7.2 s); `tsc` and `biome` clean.
- Lenses: planner + reviewer + red-team on the plan (REV 2 folded: explicit kited flee path, `stepped` only on a drafted Move, non-fatal species read, the moved assertion); reviewer + red-team + verifier on the artifact (folded: comment accuracy, `?` for a missing column). `reducer-security-auditor` / `desync-guard` not applicable (no server or game-core change).

### Acceptance ledger
Acceptance: 5/5 met, 0 deferred, 0 unmet — ci-fix-20261108T0800 seed:e3b0c44298fc1c14

A sandboxed SpacetimeDB (`spacetime start --data-dir <private> --in-memory --listen-addr 127.0.0.1:3000`, pid 3689600) is left up for the supervisor's re-execution of X1/X5; `just ci` (X4) ran green beside it.

### touches-delta:
none — the diff is exactly the declared `client/e2e/battle-dpad.spec.ts`.

### boyscout-delta:
none.

### Decisions
none (test-only; `standards/decisions.md` bar not met).

### Residuals / follow-up flags (not done here)
- The kite judgement is geometric: a partial AI regression that made a NON-Skittish wild disengage would show as `kited` lines naming species 1/2 in the CI log but would not fail this D-pad spec (game-core's `ai_tests` pin the stances). Asserting on the species here would couple the test to content; declined on purpose.
- The moved assertion proves the unit LEFT its tile, not that it reached the drafted tile (`draftMoveToward` returns a boolean; `controls.ts` is outside touches). A wrong-tile Move would surface as a `bound@12` standoff in the trace.
- The per-hunt species read is a synchronous `spacetime sql` (≤ 15 s worst case per hunt, inside the 300 s PvE idle window).

Items: none

🤖 Generated with [Claude Code](https://claude.com/claude-code)
