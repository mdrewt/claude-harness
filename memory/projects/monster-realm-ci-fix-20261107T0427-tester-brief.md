# ci-fix-20261107T0427 — tester brief (TEST-ONLY slice: you write the e2e changes; nothing else changes)

Worktree (ALL paths relative to it): `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ci-fix-20261107T0427`
(branch `ci-fix-20261107T0427`, base origin/master 1630b4f4). Read with Read/Grep/Glob only. Your Bash is static-check-only
(hook): `node --check <file>` is allowed; playwright / vitest / cargo / npx are NOT. The orchestrator runs every spec against a live
SpacetimeDB and feeds the output back. Edit ONLY these three files: `client/e2e/battle-dpad.spec.ts`, `client/e2e/tactics-wild.spec.ts`,
`client/e2e/controls.ts`. Do not touch anything under client/src, server-module, game-core, .claude.
Plan (read §0 facts, §1 D1/D2/D4 as amended by §6 R1–R6): `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-ci-fix-20261107T0427-plan.md`.
Verification SSOT: `/home/mdrewt/projects/ai-apps/claude-harness/standards/testing-tdd.md` — no assertion may be removed, relaxed or
moved into a comment; every wait keeps a numeric bound and a message naming it; test names lead with the behaviour.
Formatting: biome (2-space, single quotes, trailing commas, 100 cols) — match the surrounding code exactly; the PostToolUse format hook
may rewrite your edit, re-read after editing.

## Why (the measured defects — do not re-diagnose)
1. battle-dpad CTL8J-2-B's hunt failed locally 2/29 with `no wild encounter within 120 steps`: battle A's win paid XP, the Lv5 starter
   crossed to Lv6 (xp 125 → ≥ 216), and `server-module/src/battle.rs credit_monster` recomputed ALL six `stat_*` columns from
   species/level (999 HP → 23, attack 250 → 13) while `current_hp` stayed 996; every later wild start is refused server-side with
   `deploy: HpAboveMax { cur_hp: 996, max_hp: 23 }` (a logged no-op), so the shuttle rolls 60 grass entries and no battle ever
   starts. Forced (xp seeded to 215) it is 2/2. CI's other B failure (`did not finish within maxOwnTurns=16`) never reproduced
   (0/29; every fight ended in ≤ 3 own turns) and the throw carries no per-turn data.
2. tactics-wild BT12-5-WILD-FLEE: the pack roll is healthy (40 live hunts: 21 packs of 1, 19 of 2 — designed P(pack ≥ 2) = 0.40) but
   `MAX_PACK_HUNTS = 8` fails 0.6^8 = 1.7 % of runs (CI hit 8/8). Also (red-team): pack-1 battles auto-deploy BOTH party monsters
   (the remembered formation) and the wild AI prefers the lowest-HP unit, so the UNSEEDED recruit (~20 HP) can faint across many
   pack-1 flees — a fainted recruit clamps every later pack to 1 (`effective_pack`) and the budget is wasted; and the HP-persistence
   oracle's `before` map is taken BEFORE the pack-1 flees, so pack-1 damage alone could satisfy it.
3. `BAIT_SEED = 9` against a `MAX_BATTLES × MAX_OWN_TURNS` = 80-attempt recruit loop (residual R-ci-fix-20261107T0300-tactics-wild-bait-budget;
   a live Recruit debits one bait, success or not; an empty bag drops the `bait:1` row).

## Changes to make (exact contract)

### A. `client/e2e/battle-dpad.spec.ts`
A1. New constants next to SEED_STAT/SEED_HP: `const SEED_LEVEL = 7;` and `const SEED_XP = SEED_LEVEL * SEED_LEVEL * SEED_LEVEL;`
    (xp_for_level = level³; encounter-battle.spec.ts:78 precedent). Doc comment: one win's XP is `bst·L_wild/(5·L_starter)+1` ≤
    328·8/(5·7)+1 = 75 < 512−343 = 169, so battle A's win can never reach Lv8 and `credit_monster` never recomputes the seeded stats
    before battle B; Lv7 keeps all three zone-0 encounter entries eligible (level bands 3–7, 3–7, 4–8).
A2. In `beforeAll`, seed `['level', SEED_LEVEL]` and `['xp', SEED_XP]` on BOTH `monster` and `monster_pub` in the same loop as the stats
    (the loop already runs over both tables; encounter-battle.spec.ts:437-446 is the precedent). Then READ BACK by SQL (anti-no-op):
    `SELECT monster_id, level, xp, stat_hp FROM monster WHERE monster_id = N` and `expect` level === SEED_LEVEL, xp === SEED_XP,
    stat_hp === SEED_HP with messages naming the seed (`sqlRows` does not exist in this file — add a small parser like
    tactics-wild.spec.ts:134-146 or assert with a regex on the raw stdout; keep the `sql()` charset guard untouched). Also
    `await expect.poll(() => snap(page).then(s => s.ownMonsters[0]?.level), { timeout: 15_000 }).toBe(SEED_LEVEL)` so the client view
    carries the seed before the first hunt.
A3. In CTL8J-2-DPAD-BATTLE-B, BEFORE `huntEncounter`, add the precondition oracle (import `readOwnMonsters` from './controls'):
    `const starterNow = (await readOwnMonsters(page))[0]; expect([starterNow?.maxHp, (await snap(page)).ownMonsters[0]?.level],
    'battle A's win did not level the starter: its seeded stats survive (a level-up recomputes stat_* from the species and
    HpAboveMax then refuses every later wild start)').toEqual([SEED_HP, SEED_LEVEL]);` — one `expect` with that message (wording may
    be tightened, meaning kept). Nothing else in B changes: NO re-hunt, NO flee fallback, the existing assertions stay byte-identical.
A4. Header comment: replace the paragraph "SEEDING … Levels are NOT seeded: two wins cannot lift a Lv5 starter past zone 0's Lv3-8
    encounter bands." with the new truth: the level IS seeded (7, xp 7³) so that a win cannot level the starter — a level-up
    recomputes the seeded stat columns server-side and leaves current_hp above the new max, after which every wild start is refused
    (HpAboveMax) — while staying inside zone 0's 3–8 bands. Keep the rest of the header.

### B. `client/e2e/controls.ts` — `fightToOutcome` (≈ lines 1272-1307)
B1. Keep the signature and the strict throw. Accumulate a per-turn trace `string[]`: per own turn push
    `r${t.round}:${t.turnIdx} me(${me.x},${me.y})hp${me.curHp} enemy(${enemy.x},${enemy.y})hp${enemy.curHp}/${enemy.maxHp}
    d${tileDistance(me, enemy)} ${hit}${moveNote} ${elapsedMs}ms` where `moveNote` is `' move:drafted'` / `' move:none'` when the
    move branch ran (the `draftMoveToward` boolean) and `''` when it did not, and `elapsedMs` is the turn's wall time via
    `Date.now()` deltas (test-side clock; not a product clock). Append `— trace: ${trace.join(' | ')}` to the existing throw message
    (keep its first clause byte-identical: `${opts.label}: the battle did not finish within maxOwnTurns=${opts.maxOwnTurns} own
    turns`). Update the doc comment: the throw names the bound AND carries the per-turn trace (hit result, Move drafted or not) so a
    dead-button stall (leftover draft / cursor / lock) is distinguishable from a kiting wild in the CI log. No new export, no
    behaviour change on the green path, no console.log.

### C. `client/e2e/tactics-wild.spec.ts`
C1. `const BAIT_SEED = MAX_BATTLES * MAX_OWN_TURNS;` (move the const below MAX_BATTLES/MAX_OWN_TURNS; comment: one bait per possible
    live Recruit — a Recruit debits one bait, success or not, and an empty bag drops the `bait:1` row; recruit.spec.ts:157 precedent).
C2. `MAX_PACK_HUNTS = 30`, redefined as ONE budget of grass hunts shared by every BT12-5-WILD-FLEE attempt (not per attempt): the
    doc comment states P(30 packs of 1) = 0.6^30 ≈ 2e-7 and the measured cost (≤ ~11 s per pack-1 hunt incl. flee + results).
    `huntPackOfTwo` takes/consumes the shared budget (e.g. a `{ left: number }` counter or an outer `let packHuntsLeft`) and its throw
    names hunts spent, packs of 1 met and MAX_PACK_HUNTS. Update the header paragraph's probability sentence (currently
    "P(eight packs of 1) = 0.6^8 ~ 1.7 %").
C3. In BT12-5-WILD-FLEE, where the recruit is moved into the party (`party_slot = 1` on both tables), ALSO seed it sturdy on BOTH tables:
    `stat_hp = SEED_HP`, `current_hp = SEED_HP`, `stat_defense = SEED_DEFENSE`, `stat_sp_defense = SEED_DEFENSE` (same ownerSql
    shape as the starter's beforeAll seed), then poll `readOwnMonsters` until the recruit's `maxHp === SEED_HP` (≤ 15 s, message
    naming it). Comment: pack-1 battles auto-deploy the remembered formation (both monsters) and the wild targets the lowest-HP unit;
    an unseeded recruit can faint across the pack-1 flees and a fainted recruit clamps every later pack to 1.
C4. Move the `before` snapshot (`new Map(readOwnMonsters … currentHp)`) INSIDE the attempt loop, right after `huntPackOfTwo` returns
    its Deploying battle (HP write-back happens only at battle end), so the persistence oracle compares against the pre-battle HP of
    THE pack-2 battle, never a pack-1 flee's damage. `takeAHitThenFlee(page, before)` and the final oracle keep using it unchanged.
C5. Nothing else: the deploy/editor/flee/persistence assertions stay byte-identical (gate X4 pins eleven of them by text).

## Static checks you may run
`node --check` is useless on TS; instead re-read your edits. The orchestrator runs `npx tsc --noEmit -p client` and biome, then the
specs live (red/mutant/green proofs P2–P6 in the plan §2 as amended) and feeds results back.

## Report back
List every edit (file, function, what), the constants' final values, and anything you could not do inside the contract. Create
`/tmp/ci-fix-20261107T0427-tester.done` LAST (write an empty file with Write).
