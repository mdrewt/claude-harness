## master-red ci-fix — encounter-battle E2 kiting stall (test-only; uif-3 #676 stays)

CI run 42411029513 on `8ac38368` (the uif-3 merge) failed ONE e2e test (148 passed): `encounter-battle.spec.ts` E2 → `fightToOutcome` `the battle did not finish within maxOwnTurns=16 own turns`, trace `me(2,4)↔(6,4) hp997 | enemy(2,5)↔(6,5) hp26/26 | d5 | none move:drafted` for all 16 own turns.

### Diagnosis (not a uif-3 regression — no revert)
- **The wild was kiting, by the rules.** Zone 0's species 3 Sproutlet is the Skittish stance (`tactics::ai`): it attacks ONLY with its Heavy (range 2–3) from the farthest in-reach tile, and when the player is ADJACENT at its turn start it cannot fire at all — Heavy `range_min 2` from its own tile, and a disengage-taxed 1-stride Move (3 AP) + Heavy (4) exceeds the 6 AP budget — so it kites to `heavy range_max + 2 = 5`. The Flameling kit (Ember Light 2–3, Fire Fang Heavy 1) fires nothing at d5, and the old helper always stepped to the band tile NEAREST the enemy (adjacent again) and ended the turn. One own turn per round, 16 < the 30-round wild cap: a deterministic loop for that draw. This is the "unexplained `maxOwnTurns` stall" #670 left as a residual (its §F4 missed the adjacent-start tax); battle-dpad's CTL8J-2-B stall on `1630b4f4` was the same shared helper.
- **Reproduced locally 3 of 4 Sproutlet battles** with the pre-fix policy: identical initiative `[wild, me]`, `r1:1 me(1,1) enemy(2,5) d5`, the same ping-pong, transcript `Moved@wild TurnEnded@wild Moved@me TurnEnded@me RoundEnded …` with no `Executed`.
- uif-3 changed client chrome (TabBar / ContextSheet / hint slot); the AI runs in game-core on the server, and `move:drafted` with the position changing every turn proves the shell's input path end to end. uif-3's own PR red (run 42407545424) was a different test (ui-chrome UIF1.5 geometry).

### Change (`client/e2e/controls.ts`, `client/e2e/encounter-battle.spec.ts`)
- **controls.ts** — `fightToOutcome` learns the game's answer to a kiter: **Move then Skill in one turn**, chosen through the UI's own legality. New `moveThenAttackByButtons(page, me, enemy, opts)`: band tiles nearest the enemy first; per tile it drafts the Move (ghost), re-opens the unit's menu on its live tile and presses the attack through Skills → the forecast → A — the Skills row and its rows read the ghost tile and the post-draft budget (`commandModel.ts`), so no range or AP arithmetic lives in the test; a tile that fires nothing is undone (B closes the menu, B pops the chip; both asserted) and the next tried, ≤ `MAX_MOVE_TRIES` (12: the adjacent + distance-2 rings); when none fires the nearest tile is re-drafted as before. `draftMoveToward` keeps its contract (its body is split into `openMoveAim` / `nearestFirst` / `confirmMoveTo`, shared). New `endTurnIfLive(page, turn)`: a commit that spends the whole budget ends the turn server-side in the same transaction (the wild replies and the next own turn may already be Waiting), so Start is pressed only while the turn is still ours — measured: a blind Start ended the NEXT own turn, the shell's once-per-turn send guard then refused the next commit, and a later Start dismissed the results panel. The trace now records `move:(x,y)+attacked tries:N` / `move:drafted(x,y) tries:N` / `move:none`; the `maxOwnTurns` throw is unchanged, so a stall still fails loud (it now means a dead button or a changed AI, never a kiter).
- **encounter-battle.spec.ts (tester-authored)** — new **E1b**: "an out-of-reach foe is hit in one turn by Move then Skill from the ghost tile (the kiting wild's answer)" — the core tactical turn no spec drove before. It seeds `stat_speed = 999` (read back) so the starter acts first and its opening turn is at the spawn distance ≥ 4, out of every skill's reach, deterministically; asserts the root Skills row is greyed from the start tile, `moveThenAttackByButtons({ allowKo: false })` returns `attacked` from a ghost tile ≠ the start tile, the unit stands on that tile after the commit, and the transcript since the turn began holds our `Moved` followed by an `Executed` BEFORE our own `TurnEnded` (attributed by order: the foe's reply follows our `TurnEnded`). Non-lethal like E1 (`kills`/`none` → flee, re-hunt, ≤ 6 battles) because a KO would pay XP, level the starter to 8 and recompute its seeded stats before E2. The speed seed is written back in a `finally` (read back) so E2 runs on CI's natural initiative. Header + `MAX_OWN_TURNS` comments rewritten to the new truth. **No assertion of E0/E1/E2/E3 removed, relaxed, skipped or moved.**
- `battle-dpad` CTL8J-2-A/B and `recruit` R3 get the fix through the shared helper (gate X2).

### Proofs (details: `memory/projects/gates/ci-fix-20261107T2101.x3-proofs.md`)
- Red: the pre-fix tree fails to load the spec at the missing export (`TS2305`; Playwright `SyntaxError … does not provide an export named 'moveThenAttackByButtons'`).
- Mutants on the fixed tree: (a) the ghost attack forced to `none` → E1b red by name, `outcomes: 0:none tries:16 … 5:none tries:16`; (b) the pop press removed from `undoDraft` → red at `undoDraft: B pops the drafted Move (its ghost)`.
- Green: four full-spec runs `5 passed` (19.8–26 s); a 5-battle Sproutlet probe with the REAL `fightToOutcome` on natural initiative: `5 victories, rounds=[2,2,2,1,2]` (the first hit is answered by First-Stand at 1 HP, the second KOs).
- Lenses: planner + reviewer + red-team on the plan (REV 3 folded: non-lethal E1b, speed restore, transcript oracle, tries cap); reviewer + red-team + verifier + /simplify on the artifact (folded: Executed attributed by order, `finally` restore, vacuous assertion dropped, the two fired tails collapsed, `MAX_MOVE_TRIES` un-exported and 12). `reducer-security-auditor` / `desync-guard` not applicable (no server or game-core change).

### Acceptance ledger
Acceptance: 6/6 met, 0 deferred, 0 unmet — ci-fix-20261107T2101 seed:e3b0c44298fc1c14

### touches-delta:
none — the diff is exactly the declared `client/e2e/controls.ts`, `client/e2e/encounter-battle.spec.ts`.

### boyscout-delta:
none.

### Decisions
none (test-only; `standards/decisions.md` bar not met).

### Residuals / follow-up flags (not done here)
- `recruit.spec.ts` R3's "kiting wild → flee + re-hunt" catch is now mostly dead code (outside touches); remove when recruit.spec.ts is next touched.
- `tactics-wild.spec.ts` / `my-battle-privacy.spec.ts` still call the naive `draftMoveToward` directly; their loops tolerate not landing a hit.
- A Heavy from the ghost can miss (95 %); E1b's oracles are the transcript + position, not the foe's HP, by design.
- `attackByButtons`' KO guard reads the NEAREST foe's HP while the aim is the first legal target: in a pack of 2–3 a weaker pack-mate could be KO'd (pre-existing; E1 has the same shape).

Items: none

🤖 Generated with [Claude Code](https://claude.com/claude-code)
