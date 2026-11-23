## master-red ci-fix — battle-dpad + tactics-wild e2e (test-only; PR #668/#669 stay)

CI run 42337547255 on `1630b4f4` failed two bt-16-migrated e2e tests (128 passed): `battle-dpad.spec.ts` CTL8J-2-DPAD-BATTLE-B (`the battle did not finish within maxOwnTurns=16 own turns`) and `tactics-wild.spec.ts` BT12-5-WILD-FLEE (`8 of MAX_PACK_HUNTS=8 hunts rolled a pack of 1`).

### Diagnosis (not a bt-16 product regression)
- **battle-dpad.** 29 local runs of the unmodified spec: 27 green, 2 red — both reds were a *third* signature, CTL8J-2-B's hunt (`no wild encounter within 120 steps`), and the in-run server log named the cause: every grass trigger after battle A was refused with `wild_start_error … deploy: HpAboveMax { cur_hp: 996, max_hp: 23 }`. Battle A's win pays XP; when the Lv5 starter crosses to Lv6, `credit_monster` recomputes all six `stat_*` columns from species/level (`derive_stats`), wiping the owner-SQL seed (999 HP → 23, attack 250 → 13) while `level_up_healed_hp(996, 999, 23)` leaves `current_hp` at 996; the pack-1 auto-deploy dry run then rejects every later wild start and rolls it back. Forced (xp seeded one short of Lv6) it reproduces 2/2. Only test-seeded stats can make a level-up *lower* max HP, so there is no product defect. CI's `maxOwnTurns=16` stall did not reproduce (0/29; all 56 fights ended in ≤ 3 own turns) and is not rules-reachable with full seeded stats (a Skittish wild must step into Heavy range 2–3 to attack, which puts it inside Ember's range); the artifact red-team's leading hypothesis is a dead-button stall from leftover shell state — exactly what CTL8J-2-B exists to catch — so it must stay a hard failure, now with a per-turn trace.
- **tactics-wild.** 40 live hunts with a two-conscious party: 21 packs of 1, 19 packs of 2 (designed 60/40 ‰ after the clamp). The roll is healthy; the budget of 8 fails 0.6⁸ ≈ 1.7 % of runs (the bt-16 run already spent 4 of its 8 on packs of 1). Two latent hazards in the same loop surfaced in review: pack-1 battles auto-deploy BOTH party monsters and the wild AI prefers the lowest-HP unit at equal distance, so the unseeded (~20 HP) recruit can faint across pack-1 flees — a fainted recruit clamps every later pack to 1; and the HP-persistence oracle's `before` map was taken before the pack-1 flees.

### Change (`client/e2e/battle-dpad.spec.ts`, `client/e2e/tactics-wild.spec.ts`, `client/e2e/controls.ts`)
- battle-dpad: the starter is seeded `level 7, xp 343` (7³) on both tables and read back by SQL. One win's XP is at most `328·8/(5·7)+1 = 75 < 169`, so battle A's win cannot level it and the seeded stats survive; Lv7 keeps all three zone-0 encounter entries eligible. Before B's hunt a precondition asserts `maxHp === SEED_HP && level === SEED_LEVEL` with a message naming the mechanism (the former unnamed `no wild encounter` becomes a named failure). Header rewritten.
- controls.ts `fightToOutcome`: same signature, same strict throw, green path unchanged; the throw now carries a per-turn trace (`r<round>:<turnIdx> me(x,y)hp enemy(x,y)hp/max d<dist> <hit> move:<drafted|none> <ms>ms`) so a dead-button stall is distinguishable from a kiting wild in the CI log.
- tactics-wild: `MAX_PACK_HUNTS = 30` as ONE budget shared across the `MAX_FLEE_BATTLES` attempts (0.6³⁰ ≈ 2e-7; ≤ ~11 s per pack-1 hunt), the throw names hunts spent / packs of 1 met / the budget; the recruit is seeded sturdy when it joins the party (`RECRUIT_SEED_HP = 120` — below the starter's 300 so it stays the wild's preferred target and its slot's write-back stays exercised, far above what the pack-1 hits can take; defences 250) with a read-back poll; `before` is re-snapshotted right after each pack-of-two hunt returns (pre-battle HP of THAT battle); `BAIT_SEED = MAX_BATTLES * MAX_OWN_TURNS` (closes `R-ci-fix-20261107T0300-tactics-wild-bait-budget`).
- No assertion removed, relaxed, skipped or moved; gate X4 pins eleven assertion fragments (message + matcher + value) against origin/master.

### Proofs
- Red (pre-fix): forced level-up (`xp = 215`) → `no wild encounter within 120 steps` 2/2, SQL `level 6 | stat_hp 22 | current_hp 995/996 | stat_attack 12/13`.
- Teeth (post-fix): `SEED_XP` forced to 511 → CTL8J-2-B fails before its hunt with the precondition's message (SQL `level 8 | stat_hp 25 | current_hp 997`); `maxOwnTurns: 1` → `… did not finish within maxOwnTurns=1 own turns — trace: r1:0 me(1,1)hp997 enemy(2,6)hp16/16 d6 none move:drafted 329ms`; `MAX_PACK_HUNTS = 1` → `the shared hunt budget is spent — 1 hunts spent, 1 packs of 1 met, of MAX_PACK_HUNTS=1`.
- Green: battle-dpad 3 passed, tactics-wild 2 passed (×2), then the ledger's X6 3-of-3 stability run and `just ci` (X5) — see the ledger block.
- Lenses: reviewer + red-team on the plan (the planned bounded re-hunt for B was DROPPED on the red-team's HIGH: it would clear leftover shell state and mask the regression B exists to catch); reviewer + red-team + /simplify + verifier on the artifact. `reducer-security-auditor` / `desync-guard` not applicable (no server or game-core change).

### Acceptance ledger
```
Acceptance: 6/6 met, 0 deferred, 0 unmet — ci-fix-20261107T0427 seed:e3b0c44298fc1c14
```

### touches-delta:
none — the diff is exactly the declared `client/e2e/battle-dpad.spec.ts`, `client/e2e/tactics-wild.spec.ts`, `client/e2e/controls.ts`.

### boyscout-delta:
none.

### Decisions
none (test-only; `standards/decisions.md` bar not met).

### Residuals / risks
- CI's one-off `maxOwnTurns=16` stall remains unexplained; the trace in the throw makes the next occurrence triageable and the test stays a hard failure by design (see Diagnosis).
- `R-ci-fix-20261107T0300-tactics-wild-bait-budget` is fixed by this PR (supervisor to close the row).
- Follow-up flag (not done here): `sqlRows` now exists in three specs (tactics-wild, encounter-battle, battle-dpad); hoist into controls.ts when encounter-battle.spec.ts is next touched (outside this slice's touches).
- `encounter-battle.spec.ts` E2 and `recruit.spec.ts` R3 also win with seeded attack; neither hunts again after a leveling win in the same test, so no action.
- The pack ≥ 2 rate itself is protected by game-core's encounter tests, not by this e2e (a 30-hunt budget would still pass at a much lower rate).

Items: none

🤖 Generated with [Claude Code](https://claude.com/claude-code)
