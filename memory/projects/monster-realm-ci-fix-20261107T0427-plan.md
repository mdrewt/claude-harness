# ci-fix-20261107T0427 — plan (REV 2 — reviewer + red-team folded; see §6)

Master CI red on 1630b4f4 (run 42337547255, e2e job 128297786057): two bt-16-migrated e2e tests failed,
128 passed. Worktree `.claude/worktrees/ci-fix-20261107T0427` from origin/master 1630b4f4. Test-only fix.
Touches: client/e2e/battle-dpad.spec.ts, client/e2e/tactics-wild.spec.ts, client/e2e/controls.ts.

## §0 Measured facts (this session, live local spacetime 2.11.0, dev_reducers module)

F1. battle-dpad.spec.ts unmodified: 29 local runs → 27 green, 2 red. BOTH reds were
    `no wild encounter within 120 steps` in CTL8J-2-B's hunt (NOT the CI error). CI's error
    (`did not finish within maxOwnTurns=16`) reproduced 0/29. Every one of the 27+29 A/B fights
    ended within ≤ 3 own turns (per-turn trace: a landed hit KOs — Ember 100 % / Fire Fang 95 %
    accuracy, attack 250 vs 15–25 HP wilds).
F2. Hunt-failure root cause (server log, captured in-run):
    `wild_start_error … "deploy: HpAboveMax { id: 4294967295, cur_hp: 996, max_hp: 23 }"` on EVERY
    grass trigger after battle A. Mechanism: battle A's win paid XP (`tactics_settle::pay_ledger` →
    `battle::credit_monster`); the starter crossed Lv5→6 (xp 125 → ≥216 = 6³) and `credit_monster`
    recomputes ALL six stat columns from species/IVs/EVs/level (`derive_stats`), discarding the
    owner-SQL seed (stat_hp 999 → 23, stat_attack 250 → 13), while
    `level_up_healed_hp(996, 999, 23)` = 996 + (23−999).saturating = 996 keeps current_hp. The next
    wild start's pack-1 auto-deploy dry run rejects `cur_hp > max_hp` and rolls the start back
    (movement.rs:474-496), so 60 grass rolls produce no battle. Forced reproduction: seeding
    `xp = 215` (one short of Lv6) made the failure 2/2; SQL afterwards: level 6, xp 255/307,
    stat_hp 22, current_hp 995/996, stat_attack 12/13. Natural rate ≈ 7 % (a win's XP is
    `bst·L_wild/(5·L_starter)+1` = 37–91 for bst 318–328, L_wild 3–8; it crosses 91 only for the
    high rolls). Not a product regression: only test-seeded stats can make a level-up LOWER max HP.
F3. tactics-wild pack roll, 40 live hunts with a 2-conscious party: pack 1 ×21, pack 2 ×19, pack 3 ×0
    (zone 0 weights 600/300/100 ‰, 3 clamped to 2 → designed P(pack ≥ 2) = 0.40). The roll is
    healthy; the CI failure (8/8 packs of 1) is the 0.6⁸ = 1.7 % tail of a budget of 8 — the bt-16
    run 42330622918 already spent 4 of its 8 on packs of 1. `ctx.random()` is ChaCha12 seeded per
    reducer call (spacetimedb-2.11.0/src/rng.rs:151) — no low-entropy correlation.
F4. CI's CTL8J-2-B `maxOwnTurns=16` stall is UNEXPLAINED and did not reproduce (F1). With full seeded
    stats the wild AI cannot stall: a Skittish wild (species 3, 23 % of zone-0 rolls) attacks with
    its Heavy whenever a 1-stride move puts us in range 2–3 (ai.rs `attack`/`kite`, tuning
    ap_turn 6 / heavy 4 / stride 2), which leaves it inside Ember's range 2–3 for our next turn;
    Territorial/Aggressive wilds hold or close. 16 consecutive misses at 95–100 % accuracy are
    impossible; a wiped starter (F2) cannot start battle B at all. The current `fightToOutcome`
    throw carries NO per-turn data, so the CI occurrence is untriageable.
F5. The previous ci-fix (#669) left `R-ci-fix-20261107T0300-tactics-wild-bait-budget`
    (tactics-wild.spec.ts:66 `BAIT_SEED = 9` vs a 5×16 = 80-attempt recruit loop; same exhaustion
    class as the recruit R2 master red). Same file, same class → fixed here.

## §1 Design (test-only; no assertion removed or relaxed)

D1. battle-dpad.spec.ts — make the stat seed survive by construction: seed `level = 7`, `xp = 343`
    (7³) on `monster` + `monster_pub` (encounter-battle E2's precedent). One win's XP is at most
    `328·8/(5·7)+1 = 75 < 512−343 = 169`, so battle A's win cannot reach Lv8 and `credit_monster`
    never recomputes the seeded stats before battle B. Lv7 keeps all three zone-0 encounter entries
    eligible (bands 3–7, 3–7, 4–8; `roll_encounter` filters by the lead's level). Read the seed
    back by SQL (anti-no-op). Before B's hunt, assert `ownMonsters[0].level === SEED_LEVEL` with a
    message naming the mechanism ("battle A's win did not level the starter: the seeded stats
    survive") — turns the former `no wild encounter within 120 steps` into a named failure.
    Rewrite the header's "Levels are NOT seeded …" paragraph to the new truth (bands + level-up).
D2. controls.ts — `fightToOutcome` keeps its signature and strict throw, but records a per-turn
    trace (`r<round>:<turnIdx> me(x,y)hp<cur> enemy(x,y)hp<cur>/<max> d<dist> <hit>` plus the
    elapsed ms) and puts the trace in the thrown error, so the next CI stall is triageable from the
    log. Factor the loop into an exported `fightTurns(page, opts): Promise<{ end: TacticsSnap | null;
    trace: string[] }>` (end null = budget spent, battle still Active); `fightToOutcome` = fightTurns
    + the throw. E2 / recruit R3 / CTL8J-2-A keep calling `fightToOutcome` unchanged.
D3. battle-dpad.spec.ts CTL8J-2-B — a bounded re-hunt around the fight, the pattern CTL8J-2-A and
    tactics-wild already use for a kiting wild: for hunt < MAX_FIGHT_HUNTS (3): hunt, assert a NEW
    battleId + stack [battle], `fightTurns` (MAX_OWN_TURNS); if `end` is null →
    `console.log('[bt-16 CTL8J-2-B] battle N: no outcome within MAX_OWN_TURNS=16 own turns — trace:
    …; fled, re-hunting')`, flee on a fresh own turn (`fleeByButtons` after `waitOwnTurnOrEnd`),
    `throughResults`, continue. After the loop the SAME assertions as today run on the fought
    outcome: `end.phase === 'Finished'`, `expectTerminalResults`, `continueWith('B')`, stack
    [world], results hidden, battle root gone, `ongoingBattle` null. A fallback flee is NEVER the
    asserted outcome (it only abandons a stalled battle); exhausting MAX_FIGHT_HUNTS throws naming
    the bound and all traces. Unexplained class F4 stays loud (3/3 stalls fail) but a one-off no
    longer reds master.
D4. tactics-wild.spec.ts — `MAX_PACK_HUNTS = 30` (P(30 packs of 1) = 0.6³⁰ ≈ 2.2e-7 per attempt;
    measured cost 0.3–8 s per pack-1 hunt + ~3 s flee/results → ≤ ~5 min worst case inside the
    1_200_000 ms test timeout); header probability text updated. `BAIT_SEED = MAX_BATTLES *
    MAX_OWN_TURNS` (80; u32 count, owner-SQL seed; closes F5's residual) with the comment naming
    one bait per possible attempt.
D5. Nothing in server-module / game-core changes. The HpAboveMax-after-level-up behaviour is
    reachable only through test-seeded stats (a real level-up raises max HP), so no product fix and
    no DECISIONS entry (bar not met).

## §2 Proofs the orchestrator runs (the tester's Bash is static-only)

P1 (red, pre-fix, F2): unmodified spec + `xp = 215` seed → `no wild encounter within 120 steps`, server
   log `HpAboveMax` (DONE this session: 2/2, /tmp/cifix0427-xpprobe-{1,2}.log).
P2 (tooth, post-fix): the fixed spec with `SEED_XP` forced to 511 (one short of Lv8) → battle A's win
   levels the starter → the new precondition assertion fails naming the mechanism (NOT the hunt bound).
P3 (green): fixed battle-dpad spec 3 passed; ≥ 3 consecutive green runs (X6).
P4 (tooth, D2/D3): `MAX_OWN_TURNS` forced to 0 in a sandbox copy → B logs the trace line, flees,
   re-hunts, and fails after MAX_FIGHT_HUNTS naming the bound with 3 traces; A throws with a trace.
P5 (tooth, D4): `MAX_PACK_HUNTS` forced to 1 → the first pack of 1 fails at the named throw.
P6 (green): tactics-wild 2 passed, 3 consecutive (X6).

## §3 Anti-patterns ruled out
- A flee as B's asserted outcome (weakens "the buttons fight to an outcome"); kept as abandon-only.
- Raising MAX_OWN_TURNS (hides F4 instead of tracing it).
- Seeding xp below the level floor (level_for_xp would DROP the level on the first gain).
- Touching game-core / server-module (outside touches; no product defect proven).
- Any dev reducer (deleted by bt-16 on purpose).

## §4 Gates — see gates/ci-fix-20261107T0427.gates.md (X1 dpad green · X2 wild green · X3 MANUAL
   proofs · X4 oracles intact · X5 just ci · X6 3-of-3 stability).

## §5 Risks / disclosures
- F4 remains unexplained; D2's trace + D3's bounded re-hunt make it visible and non-fatal for a one-off.
- encounter-battle.spec.ts E2 and recruit.spec.ts R3 call `fightToOutcome` after seeding attack; a
  WIN that levels the starter there is followed by no further hunt in the same test (E2 seeds the
  level-up deliberately), so no action; noted for the supervisor.
- A stalled HpAboveMax player is a dead world for that identity (test-only reachability).

## §6 REV 2 deltas (plan lenses: reviewer a8e2168, red-team a2227c8)

R1. D3 (B's bounded re-hunt) is DROPPED. Red-team HIGH: a leftover draft / cursor / lock from battle A
    makes B's buttons inert — exactly a 16-turn "no outcome" — and a flee + results + re-hunt would
    clear that state and go green, hiding the very regression CTL8J-2-B exists to catch. B keeps the
    strict `fightToOutcome` throw; D2's trace records per turn whether a button action committed
    (hit result and whether a Move was drafted), so a dead-button stall is distinguishable from a
    kite in the CI log. Reviewer: D2 is ONE function (trace accumulated inside `fightToOutcome`,
    appended to the existing throw) — no `fightTurns` export.
R2. D1 gains the real invariant: before B's hunt assert BOTH `readOwnMonsters(page)[0].maxHp ===
    SEED_HP` and `ownMonsters[0].level === SEED_LEVEL` (a recompute that does not change the level
    is caught too). Seed level AND xp together (xp below the level floor would make level_for_xp
    DROP the level on the first gain).
R3. D4 hazards (red-team MED×2, LOW-MED): (a) the pack-1 battles auto-deploy the REMEMBERED
    FORMATION — both party monsters (measured: `ownUnits 2` on every pack-1 probe hunt) — and the
    wild AI targets the lowest-HP unit at equal distance, so an UNSEEDED recruit (~20 HP) faints
    after a few pack-1 hits; a fainted recruit clamps every later pack to 1 (`effective_pack`), and
    the budget is spent for nothing → seed the recruit sturdy (stat_hp/current_hp = SEED_HP,
    stat_defense/stat_sp_defense = SEED_DEFENSE on `monster` + `monster_pub`) when it is moved into
    the party, with the read-back poll; (b) the HP-persistence oracle's `before` map is snapshotted
    BEFORE the pack-1 flees, so pack-1 damage alone could satisfy "a fled battle persists the damage
    taken" → re-snapshot `before` inside the attempt loop right after `huntPackOfTwo` returns its
    Deploying battle (the write-back happens only at battle end); (c) 3 attempts × 30 hunts × ≤11 s
    ≈ 16.5 min is thin under 1_200_000 ms → MAX_PACK_HUNTS = 30 is ONE budget shared across the
    MAX_FLEE_BATTLES attempts (P(<3 packs ≥2 in 30 hunts at 0.4) ≈ 1e-6).
R4. Gates: X2 prefixes the same cargo build as X1 (standalone-runnable); X4 counts fragments on
    NON-comment lines only (a fragment moved into a comment or the throw text no longer passes);
    X3's evidence lives in gates/ci-fix-20261107T0427.x3-proofs.md (absolute path:line citation),
    never /tmp.
R5. BAIT_SEED stays derived (`MAX_BATTLES * MAX_OWN_TURNS`), never the literal 80.
R6. Confirmed by both lenses: the XP bound (328·8/35+1 = 75 < 169), Lv7 eligibility, no other stat
    rewrite path between A's win and B's start (evolution is Lv20 / essence-gated; faint penalties,
    trust and monster_pub sync do not touch stat_*), and no rules-reachable 16-turn stall with full
    stats — which makes the dead-button hypothesis for F4 the leading one (R1).
