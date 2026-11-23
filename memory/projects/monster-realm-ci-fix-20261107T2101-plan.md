# ci-fix-20261107T2101 — plan (REV 3 — planner + reviewer + red-team folded; see §5)

Master CI red on 8ac38368 (uif-3 merge, run 42411029513, e2e job 128518997799): ONE e2e failure, 148
passed. Worktree `.claude/worktrees/ci-fix-20261107T2101` from origin/master 8ac38368. Test-only fix.
Touches: client/e2e/encounter-battle.spec.ts, client/e2e/controls.ts.

> OUTCOME (2026-11-07 22:40 UTC): delivered as PR #677 (https://github.com/mdrewt/monster-realm/pull/677); ledger 6/6 met; `just ci` green locally (gate X5, runs 1 and 3); PR body: ../monster-realm-ci-fix-20261107T2101-pr-body.md; proofs: gates/ci-fix-20261107T2101.x3-proofs.md. The REV 3 design shipped plus one measured addition: `endTurnIfLive` (a full-budget commit ends the turn server-side).

## §0 Facts (measured this session against a live local spacetime 2.11.0 + dev_reducers module, unless marked derived)

F1. The failure: `encounter-battle.spec.ts:639` E2 → `controls.ts:1320` fightToOutcome
    `the battle did not finish within maxOwnTurns=16 own turns`. The trace (#670 added it for exactly
    this occurrence): 16 own turns, every one `r<N>:1` (the wild acts first each round),
    `me(2,4)↔(6,4) hp997`, `enemy(2,5)↔(6,5) hp26/26`, `d5` at every own-turn start, hit `none`,
    `move:drafted`, 274–374 ms per turn. No Playwright artifact was uploaded (only the gitleaks SARIF).
F2. uif-3's own PR CI: its first red (run 42407545424) was `ui-chrome.spec.ts` UIF1.5 geometry
    (`1920x1080: shell left gap: 12 vs 8`), NOT E2. The rerun says nothing about E2.
F3. REPRODUCED LOCALLY (probe, current helper policy, Sproutlet battles only): 3 of 4 stalled with the
    IDENTICAL signature — initiative `[wild, me]`, first own turn `r1:1 me(1,1) enemy(2,5) d5`, then
    `me(2,4)↔(6,4)` / `enemy(2,5)↔(6,5)`, `skillsDisabled=true none move:drafted` every turn, the
    transcript `Moved@wild TurnEnded@wild Moved@me TurnEnded@me RoundEnded …` with no `Executed`.
    All three stalls were on a 64-tile board; the 4th (49 tiles) ended with the wild at d3 and the
    start-tile Light KO'd it. The earlier probe's Sproutlet draw (player first, d4) was also won.
F4. Rules (derived from game-core, unchanged since bt-4 fce1d6da; tuning DESIGN ap 6 / stride 2 /
    heavy 4 / disengage tax 1 / wild_round_cap 30): the Skittish stance (`tactics::ai::plan`) attacks
    ONLY with a Heavy, from the FARTHEST in-reach tile; otherwise it kites to the farthest reachable
    tile within `heavy range_max + 2` of the nearest player. Zone 0's only Skittish entry is species
    3 Sproutlet (weight 5/22; kit 5 = Light 1–2, 6 = Heavy 2–3 Diamond r1). With the player ADJACENT
    at its turn start it cannot attack: Heavy from its own tile fails `range_min 2`; a 1-stride Move
    is disengage-taxed (`movement::disengage_taxed`: a living enemy adjacent to the start) 2+1 +
    Heavy 4 = 7 > 6 AP. So it kites to d5. The player's Flameling kit (1 Ember = Light 2–3 acc 100,
    2 Fire Fang = Heavy 1) fires nothing at d5; `draftMoveToward` picks the band tile NEAREST the enemy
    → adjacency → the wild kites again. One own turn per round; 16 < the 30-round auto-flee cap.
    #670 §F4 ("a Skittish wild attacks whenever a 1-stride move puts us in range 2–3") missed the
    adjacent-start tax; its "stall unexplained" residual is this.
F5. Not a uif-3 regression: uif-3 changed client chrome (TabBar / ContextSheet / hint slot); the
    wild AI runs in game-core on the server; the shell's input path is proven end to end by
    `move:drafted` with the position changing every turn (F1, F3); `none` at d5 is the correct
    Skills-row answer for the kit. No revert.
F6. Exposure: master has seen two fightToOutcome stalls since bt-16 (this one; battle-dpad
    CTL8J-2-B on 1630b4f4, pre-trace, left unexplained by #670) in ~30 exposed wild fights. recruit
    R3 already catches this class by name ("a kiting (Skittish) wild can outlast the own-turn
    bound") and re-hunts — probabilistic (P(3 kiters) ≈ 1.2 %). E2 and battle-dpad have no catch,
    and a catch would mask the dead-button stall the fight loop exists to expose.
F7. Costs measured: a non-matching hunt + flee + results ≈ 5.6 s; an own turn ≈ 250–330 ms; the
    wild's turn ≈ 0.5 s. Initiative is `eff_speed desc` = the unit's `stats.speed` (the monster row's
    `stat_speed`); stride length is `kit.base_speed` = the SPECIES base speed (content), so seeding
    `stat_speed` moves only who acts first. Spawn rows are y=1 (A) vs y=5 (B): the opening distance is
    ≥ 4 on every PvE map, i.e. out of Ember's range 3.

## §1 Design (test-only; no assertion removed, relaxed or skipped)

D1. controls.ts — `fightToOutcome` learns the game's own answer to a kiter: MOVE THEN SKILL in one
    turn (AP: 2 strides 4 + Light 2 = 6; 1 stride 2 + Heavy 4 = 6), chosen through the UI's own
    legality — never a range or AP computation in the test. New exported
    `moveThenAttackByButtons(page, me, enemy, { allowKo, enemyHp })`
    → `Promise<{ hit: 'attacked' | 'kills' | 'none'; dest: Tile | null; tries: number }>`, called from
    the OPEN ROOT menu of the own live turn with NO draft when the start-tile attack was `none`:
    the band tiles ordered nearest-the-enemy first (the `draftMoveToward` order: Manhattan to the
    enemy, then DOM order; the enemy's own tile excluded), per tile: Move row → A (the aim) →
    `dpadCursorTo(tile)` → A (the drafted Move: `TACTICS.ghost` count 1, mode idle) → the menu
    re-opened on the unit's LIVE tile (`openMenu(page, me)`) → `attackByButtons(page, opts)` — the
    Skills row and the skill rows read the ghost tile and the budget left after the Move
    (commandModel.ts `aimBoard` / `budget`). `attacked` wins (the commit is `[Move, Skill]` on the
    live turn; the turn stays live). Otherwise B (root menu → idle; `.tactics-menu` count 0), B
    (pops the Move chip; `TACTICS.ghost` count 0), `openMenu(page, me)`, next tile. When no tile
    fires, the nearest tile is re-drafted and left drafted, `hit` is that last result, the menu is
    closed (today's "step toward" behaviour; Aggressive / Territorial flows unchanged). `dest: null`
    when the Move row is absent/greyed or the band is empty (the menu stays at its root). Bounded by
    the band size (≤ 24 tiles on 7x7, ≤ 40 on 8x8; measured ~1 s per try). `fightToOutcome`: when
    `hit === 'none'` and `tileDistance(me, enemy) > 1` → the new helper; on `attacked` → the same
    `waitExecuted` / Finished / `endTurn` path as a start-tile hit; the trace line records
    `move:(x,y)+attacked tries:N` / `move:drafted tries:N` / `move:none`. REV 3 guards: the band is
    read ONCE per call (popping the draft restores it); a failed try presses B and asserts
    `.tactics-menu` count 0 BEFORE the pop B (a late beat makes B a skip, not a pop), then asserts the
    ghost is gone; tries are capped at `MAX_MOVE_TRIES = 16` (the adjacent ring ≤ 4 + the distance-2
    ring ≤ 8 + slack) so a turn that can fire nothing costs ≤ ~16 s and 16 such turns still end in the
    NAMED `maxOwnTurns` throw inside E2's 420 s budget rather than a trace-less Playwright timeout;
    the fallback re-draft goes through `draftMoveToward` itself (one owner of the order).
    `allowKo` stays (E1b needs `false`, fightToOutcome `true`). `draftMoveToward`,
    `attackByButtons`, E1, recruit, tactics-wild, my-battle-privacy, battle-dpad are untouched
    (battle-dpad and recruit R3 get the fix through the shared helper).
D2. encounter-battle.spec.ts (tester) — a NEW e2e between E1 and E2, the core tactical turn no spec
    drives today: "E1b: an out-of-reach foe is hit in one turn by Move then Skill from the ghost tile
    (the kiting wild's answer)". Shape (REV 3, after the lenses):
    - SEED: read the starter's natural `stat_speed` by SQL, then seed `stat_speed = SEED_SPEED (999)`
      on `monster` + `monster_pub` (read back): the starter ALWAYS acts first (initiative =
      `stats.speed desc`), so the OPENING own turn is at the spawn distance ≥ 4 (F7) — out of every
      Flameling skill's reach — deterministically. Stride length is species content; nothing else moves.
    - PER BATTLE (≤ MAX_E1B_BATTLES = 6), ONE attempt on the opening turn: hunt → first own turn →
      `openMenu(me)` → ASSERT the root Skills row is greyed (named: the seed + spawn geometry) →
      `moveThenAttackByButtons(page, me, enemy, { allowKo: false, enemyHp: enemy.curHp })`
      (NON-lethal like E1: a KO here would pay XP, level the starter to 8 and recompute its seeded
      stats — the #670 HpAboveMax trap — and break E2's own level-up oracle):
        · `attacked` → `waitExecuted(page, t.events)`; ORACLES on the post-commit snapshot whatever the
          phase: the own unit stands on `r.dest`; `readEventTags()` after index `t.events` holds a
          `Moved` for `me.unitId` and an `Executed` (deterministic even on a 95 % Heavy miss, and
          independent of WHICH foe a pack's first aim hit); log the foe HP change. Then `endTurn`,
          the next own turn → `fleeByButtons`, `throughResults`. done.
        · `kills` (every firing tile forecasts a KO) or `none` (no band tile fires from this
          opening geometry — a choke map or a pack-mate in the way) → log it, `endTurn`, next own
          turn → flee → results → re-hunt.
      After the loop ASSERT done, naming the outcomes seen. 
    - RESTORE: write the natural `stat_speed` back on both tables (read back) so E2 runs on CI's
      initiative — E2 keeps the wild-first kiting geometry that failed, now answered by the helper;
      E1b is the deterministic proof of the mechanism, E2 / battle-dpad / recruit the probabilistic one.
    Header rewritten to the new truth (the bt-16 list gains E1b and why; SEEDING paragraph: the
    temporary speed seed; `MAX_OWN_TURNS` comment "16 covers a kiting wild" → the kiter is answered on
    the first own turn in reach, 16 is slack and a stall now means a dead button or a changed AI).
    E0/E1/E2/E3 assertions untouched. A failing E1b may leave a live battle: E2's `huntEncounter`
    adopts an ongoing battle and E2's `MAX_WIN_BATTLES` loop tolerates a non-win, so no `finally`
    (a throwing cleanup would mask the first error).
D3. No server-module / game-core change: the kiting loop is rules-reachable and intended (§4.2
    stances); the test helper was naive. No `docs/DECISIONS.md` entry (bar not met).

## §2 Proofs the orchestrator runs (the tester's Bash is static-only)

P1. DONE (F3): the current policy stalls 3/4 against Sproutlet with CI's exact signature.
P2. Red: the tester's E1b on PRE-fix controls.ts → fails (the missing export: a TypeError at the call
    or a link error — record the shape); the pre-fix policy's stall against Sproutlet is P1.
P3. Green: encounter-battle 5 passed; battle-dpad 3 passed; recruit 3 passed 1 skipped (X1, X2).
P4. Mutants (the red proofs that matter): (a) the ghost-attack step forced to `none` → E1b red at
    `hit === 'attacked'` by name and the Sproutlet probe stalls again; (b) the pop B removed → the
    ghost-gone assertion reds.
P5. New-helper probe: K Sproutlet battles (unseeded speed, so the wild acts first and kites) all
    Finished within ≤ 2 own turns.
P6. Stability: 3 consecutive encounter-battle runs green (X6); `just ci` (X5); `mr-gates check`.

## §3 Anti-patterns avoided

- No rule arithmetic in the test (ranges, AP, tax: the UI decides); no retry-until-green of the
  asserted outcome; no re-hunt that swallows a stall (the fight loop still throws, so a stall now
  means dead buttons or a changed AI, never a kiter); no probability budget where a seed makes the
  precondition certain.
- No new eval, no source-text check, no prose pin.

## §4 Risks / residuals

- E1b adds ~10–15 s to the suite (one hunt, one turn, one flee).
- E2 runs on natural initiative (the speed seed is restored after E1b), so it meets the wild-first
  kiter in ~17 % of runs — answered by the fixed helper; E1b is the deterministic guard.
- tactics-wild and my-battle-privacy keep calling the naive `draftMoveToward` directly (their loops
  tolerate not landing a hit; outside touches).
- recruit R3's kiter catch is now mostly dead code (outside touches; follow-up flag, not done here).
- `MAX_MOVE_TRIES = 16` could skip a distance-3-only firing tile when both inner rings are large and
  all fail (a crowded 8x8 board); the turn then falls back to today's step-toward and the next turn
  retries from the new geometry.

## §5 Lens findings folded (REV 3)

- planner: settle/menu-0 guard before the pop B; band read once; fallback via `draftMoveToward`; the
  own-unit-on-dest oracle read from the post-commit snapshot whatever the phase; mutants as the red
  proof; keep `tries`. Kept `allowKo` (E1b needs `false`).
- reviewer H1 / red-team #1: E1b non-lethal (`allowKo: false`, `kills` → flee + re-hunt) — a KO would
  level the starter and wipe the seeded stats before E2. M1/#3: no upper bound on the opening distance
  → `none` is a re-hunt, not a failure. M2/#2: transcript + position oracles instead of the nearest
  foe's HP. M3/planner #5/#6: the speed seed is restored after E1b. #4: `MAX_MOVE_TRIES` cap keeps the
  named throw inside the test timeout. #5: no `finally` (E2 adopts a leftover battle).
