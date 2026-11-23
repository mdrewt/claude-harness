# ci-fix-20261108T0800 — plan (REV 1 — orchestrator-authored from the measured probe; lenses pending)

Master CI red on 3d5f4a63 (uif-7 merge, PR #682; run 42458770045, e2e job): ONE e2e failure, 168 passed.
Worktree `.claude/worktrees/ci-fix-20261108T0800` from origin/master 3d5f4a63. Test-only fix.
Touches: client/e2e/battle-dpad.spec.ts (declared; controls.ts NOT touched).

## §0 Facts (measured this session against a live local spacetime 2.11.0 + dev_reducers module unless marked derived)

F1. The failure: `battle-dpad.spec.ts:405` CTL8J-2-DPAD-BATTLE-A → line 464
    `CTL8J-2-A: the wild never stood adjacent on a fresh own turn within MAX_APPROACH_TURNS=12 own turns in any of 3 of
    MAX_ADJACENT_HUNTS=3 hunts`. The three `hunt N: the wild never stood adjacent — re-hunting` log lines are stamped
    07:28:39 / 07:29:17 / 07:29:54 — 37–38 s apart = 12 approach turns (~2.5 s each) + flee + results + the next hunt,
    i.e. every one of the three battles ran the FULL approach bound. CTL8J-3x (same battle shell, same battle) passed
    just before; encounter-battle E2 and recruit R3 (`fightToOutcome`) passed in the same run. No Playwright artifact
    was uploaded (gitleaks SARIF only). Prior GREEN masters show hunt 0 re-hunting in 2 of the 5 runs checked
    (42445455986, 42439449581): the kiter draw is common; three in a row is the tail.
F2. uif-7's diff (18 files): client/src/ui/{boxView,monstersModel,monstersScreen,reachability,i18n/*} + their tests,
    e2e ui-monsters / evolution / menu-flow / uiKit, docs/DECISIONS.md — the Monsters screen only. Nothing under the
    tactical shell, `controls.ts` or `battle-dpad.spec.ts`. In the failed run the approach loop executed 36 own turns
    (openMenu → the Recruit-row-greyed assertion → draftMoveToward → endTurn) without a single assertion failure: the
    buttons worked; the wild simply never stood adjacent.
F3. Rules (derived; game-core unchanged since bt-4): zone 0's FROZEN encounter table is species 1 (Aggressive, weight
    10), 2 (Territorial, 7), 3 Sproutlet (Skittish, 5) — sum 22. `tactics::ai::plan`: Skittish attacks ONLY with its
    Heavy (kit 6: range 2–3, Diamond) from the FARTHEST in-reach tile; with the player ADJACENT at its turn start it
    cannot (Heavy `range_min 2` from its own tile; a disengage-taxed 1-stride Move 2+1 + Heavy 4 = 7 > 6 AP), so it
    `kite`s to the farthest tile within `heavy range_max + 2 = 5` of the player. Aggressive adjacent: Fire Fang (Heavy
    range 1) from its own tile (cost 0 wins the tie) → it stays. Territorial adjacent: the Heavy needs a taxed Move
    (7 > 6) → its Light (range 1–2) from its own tile → it stays. So in zone 0 ONLY Sproutlet ever leaves adjacency.
    Flameling's stride is 3 tiles (`stride_for_base_speed(65)`), 2 strides per turn: from d5 the band's nearest tile IS
    adjacent, so the loop re-creates the wild's kite geometry every turn.
F4. REPRODUCED LOCALLY (probe `client/e2e/zz-probe-approach.spec.ts`, the shipped policy, 10 battles, log
    /tmp/cifix0800/probe-old.log): s1 ×4 and s2 ×4 → `adjacent@2` (d3/d4 openings) or `adjacent@3` (one d6 opening on
    an 8x8 map: (2,4) then (2,5)); s3 ×2 → `bound` after 12 own turns with the CI signature:
    `r1 me(1,1) wild(2,6) d6 | r2 me(2,5) wild(6,6) d5 | r3 me(6,5) wild(2,6) d5 | r4 me(2,5) wild(6,6) d5 …` — we stand
    adjacent to where it WAS, it is already at d5, every turn, HP untouched (19/19). A kiter battle costs ~30 s of
    approach + ~5 s flee/results; a non-kiter reaches adjacency in 2 own turns.
F5. P(a kiter battle) ≤ 5/22 ≈ 0.227 (pack slots roll species independently — `wild_seed(encounter_seed, i)` — so a
    pack of k is all-Skittish with 0.227^k); P(3 kiters in a row) ≈ 1.2 % per CI run — the size of this failure.
    recruit.spec.ts already derives its budgets from these frozen numbers (the table's own comment says so).
F6. Not a uif-7 regression (F2, F3, F4) → NO revert.
F7. A deterministic precondition is NOT available without reseeding: First-Stand is cleared at the unit's own
    TurnStart (`resolve.rs turn_start`), so a 250-attack hit KOs any wild that has already acted; an Exhausted
    (immobile) wild needs a NON-lethal hit; a `stat_speed` seed would make the starter act first but changes every
    battle of the spec (CTL8J-3x's is already running when CTL8J-2-A starts) and still needs the hit to land.
    Rejected for a ci-fix: it couples the setup to three rules (initiative, First-Stand, Exhausted).

## §1 Design (test-only; `battle-dpad.spec.ts`; NO assertion removed, relaxed, skipped or moved)

D1. KITE DETECTION, read from the event the loop already waits for — the fresh own turn's snapshot after the wild's
    reply (`waitOwnTurnOrEnd`). Remember the enemy we stepped toward: `stepped = { unitId, x, y }` of `sides(tt).enemy`
    when `draftMoveToward` ran. On the next fresh own turn: if `tileDistance(me, stepped) === 1` (our Move reached the
    tile next to where it stood) AND that same unit (found by `unitId`) is still `Active` AND `tileDistance(me, it) > 1`
    (it stepped away) → `kited`: give this battle up NOW (flee on this fresh own turn — Flee needs the whole budget, we
    are at an own live turn with no draft and the menu closed, `fleeByButtons` opens the menu itself). Otherwise keep
    approaching (not reached yet: a far spawn or a choke map), still bounded by MAX_APPROACH_TURNS = 12 (unchanged: the
    hard cap stays for the geometry the detector cannot judge). A cornered kiter that stays adjacent simply satisfies the
    adjacency check. Behaviour-based, not content-based: no species list in the test.
D2. MAX_ADJACENT_HUNTS 3 → 8, its doc comment carrying the derivation: zone 0's frozen weights 10/7/5 make a kiter
    battle ≤ 5/22 ≈ 23 % (independent per pack slot), so P(8 in a row) ≈ 7e-6; a kiter hunt now costs ~2 own turns +
    flee + results (≈ 10–15 s measured) instead of 12 turns (~37 s in CI), so 8 × ~15 s ≈ 2 min ≪ the 600 s test budget.
D3. DIAGNOSTICS in the log and the throw (fightToOutcome's trace precedent): per hunt `hunt N: battle <id>
    wild=<species_id>L<level>[+…] <kited@T | bound | ended:<phase>> — r<round>:<turnIdx> me(x,y) wild#<unitId>(x,y) d<dist>
    | …`. The species comes from the owner SQL `SELECT * FROM battle_wild_unit WHERE battle_id = <id>` through the
    file's existing `sql` + `sqlRows` (charset-guard compatible). DIAGNOSTIC ONLY — never an oracle (content, not
    behaviour). The final throw keeps its first clause (`CTL8J-2-A: the wild never stood adjacent on a fresh own turn
    within MAX_APPROACH_TURNS=…`) and appends ` — hunts: <joined per-hunt lines>`.
D4. The `bound` path keeps today's wait-then-flee; `ended` keeps `throughResults`; `kited` flees at once (D1).
D5. Header: the CTL8J-2-A bullet and the constant comments state the new truth (a kiter is recognised the turn it steps
    away from adjacency and the battle is given up; 8 hunts and why).
D6. Nothing in controls.ts / client/src / server-module / game-core. No `docs/DECISIONS.md` entry (bar not met).

## §2 Proofs the orchestrator runs (the tester's Bash is static-only)

P1. DONE (F4): the shipped loop against Sproutlet = `bound` after 12 turns with the CI ping-pong (probe-old.log).
P2. The detector prototype (probe, `PROBE_POLICY=new`): Sproutlet → `kited@2`; s1/s2 → `adjacent@2–3`; ZERO false kites.
P3. The tester's spec: `3 passed`; three consecutive runs green (X1, X5).
P4. Forced throw (sandbox copy of the fixed spec with MAX_APPROACH_TURNS = 1, MAX_ADJACENT_HUNTS = 1): the named throw
    fires carrying `hunts: hunt 0: battle <id> wild=s<id>L<lvl> bound — r1:… d<n>` — the trace reaches the CI log.
P5. Mutant on the fixed spec: the detector's stepped-away condition removed → a Sproutlet hunt runs the 12-turn bound
    again (probabilistic to observe: recorded when a Sproutlet comes up; the deterministic bite is P4 + P2).
P6. `just ci` (X4); `mr-gates check`.

## §3 Anti-patterns ruled out

- A catch-and-retry of ANY asserted behaviour: the post-adjacency assertions (bait list, B, B, nothing spent,
  `fightToOutcome`, results, A → world) and CTL8J-2-B are byte-identical.
- A species-based skip (content coupling; the frozen table may gain Skittish entries only at min_level ≥ 15 but the
  detector should not care).
- Raising MAX_APPROACH_TURNS (buys nothing against a kiter) or a probability budget without its derivation.
- Rule arithmetic in the test (First-Stand / Exhausted / initiative) — F7.
- Any change to the shared `controls.ts` (outside touches; every other spec is green).

## §4 Risks / disclosures

- P(8 kiters) ≈ 7e-6 per run — residual, documented in the constant's comment.
- The detector cannot tell a Skittish kite from a changed AI that disengages; the trace names the species so a reviewer
  can (a non-Skittish `kited` line is the tell).
- A far spawn on a choke map may need 2 approach turns before the detector can judge (≤ 12 either way).
- One owner-SQL read per hunt (~0.2 s).

## §5 REV 2 deltas (plan lenses: planner a4c1527c, reviewer a4100ca0, red-team a5b085ea; probe-new: 12 battles, s3 ×3 → kited@2/2/3, s1/s2 ×9 → adjacent@2–3, zero false kites)

R1. (all three, HIGH) The `kited` exit must flee on the CURRENT fresh own turn: `last` is already that turn's key, so the
    shipped `waitOwnTurnOrEnd(page, last, …)` block would wait for a turn that never comes and throw after 15 s.
    Explicit branch: `if (kited) fleeByButtons(page)` (the menu is already open on that turn: adjacency check →
    openMenu → the Recruit-greyed assertion → the kite judgement → Flee uses the open menu) · `else if (!ended)` the
    existing wait-then-flee · `throughResults` for all three.
R2. (planner, reviewer M1) `stepped` is set ONLY when `draftMoveToward` returned true, declared per hunt (reset), and
    the judgement is a small pure function in the spec file: `kitedAway(me, stepped, units)` = `stepped !== null &&
    tileDistance(me, stepped) === 1 && (w = units.find(unitId)) !== undefined && w.state === 'Active' &&
    tileDistance(me, w) > 1`. Order per fresh turn: phase → the moved assertion (R3) → adjacency → menu + greyed →
    kite judgement → draft + end turn.
R3. (red-team #3, real weakening) 8 hunts would let a DEAD Move pass green (an Aggressive wild walks up by itself;
    0.545^8 ≈ 0.8 % red vs 16 % today). Restore the teeth: `stepped` also records `from` (our tile at the draft) and
    every fresh own turn after a drafted Move asserts `tileDistance(me, stepped.from) > 0` with the message
    `the drafted Move executed: the unit left (x,y)` + the hunt trace so far (measured: `me` moved on every drafted turn in
    all 22 probe battles).
R4. (reviewer M2, red-team #2, planner 4) The species read is DIAGNOSTIC and NON-FATAL: `battleId` validated
    `/^[0-9]+$/`, the `sql`+`sqlRows` call wrapped in a try/catch that yields `?` (the one try/catch allowed; it guards
    no asserted behaviour), rows sorted by `wild_index`, read once right after `huntEncounter`. Kept (not cut) because
    it is the only tell between a Skittish kite and an AI that disengages.
R5. (planner 4) One per-hunt line on EVERY outcome (`adjacent@T` too), collected in `hunts: string[]`; the re-hunt
    console.log prints that line; the throw keeps its first clause and appends ` — hunts: <lines joined by ' || '>`.
R6. (red-team #4, planner 3) MAX_APPROACH_TURNS stays 12 (the fallback for geometry the detector cannot judge — a rough
    band on maps 3/6 can cost one extra approach turn); the constant comment states the measured cost model: a kiter
    hunt ≈ 10–15 s (detected @2–3), a bound hunt ≈ 37 s, so even 8 bound hunts + the fight tail ≈ 360 s < 600 s; no
    deadline guard (YAGNI). The named-throw guarantee assumes measured turn times (~2.5 s).
R7. (red-team #6) Packs cannot occur in this spec: `effective_pack` clamps to the conscious party count and the identity
    owns ONE monster — every probe battle was single-wild. The unitId tracking still stands (it is free and exact).
R8. (planner 5) The probe spec `client/e2e/zz-probe-*.spec.ts` is deleted before the final gate run and never committed.
R9. Proofs: P2′ (planner) — a sandbox copy of the FIXED spec with the adjacency success suppressed so all 8 hunts run:
    every s3 hunt shows `kited@`, every s1/s2 hunt ends `bound` with d1 on every fresh turn, never `kited` — the real
    code, both directions, one run; P5 = the stepped-away condition removed on that sandbox → s3 hunts go `bound`
    again (the shipped behaviour). P4 (forced throw) kept.
