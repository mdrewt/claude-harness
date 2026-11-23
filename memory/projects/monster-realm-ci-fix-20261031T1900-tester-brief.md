# ci-fix-20261031T1900 — tester brief (opus)

You own the test file. Edit ONLY `client/e2e/encounter-battle.spec.ts` in the worktree
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ci-fix-20261031T1900`.
Never touch the main checkout, any other file, or run builds/servers (your Bash is static-only).

## The defect you are closing (measured)

- master CI red since bt-6 (38a00032): `E2: fighting on to a win …` reads `Defeat...` at :565
  (CI run 41227281094; locally 3 red of 14 runs, same assertion).
- Chain: bt-6 retuned Ember (id 1) 40 → 20 (a Light). The script attacks with the FIRST skill cell —
  Ember, learnable order `[1, 2]`. The seeded starter is level 7 by SQL but keeps its level-5 creation
  stats (`roll_starter`): attack 8–12, HP 19–21; only `stat_defense`/`stat_sp_defense` are seeded (250).
  Wilds know every learnable skill and the AI always throws the Heavy; against defense 250 that lands the
  floor of 1 per turn (95 % accuracy). 2/3 of the fought wilds are species 1 (Fire — resists Fire):
  Ember@20 does 1–3 per hit to a Lv7 wild Flameling (HP 23–25) → up to 25 turns, past the starter's
  19–21 turns of chip. The race is lost on the bad draws.
- Reverting the retune is out: BT6.1 pins Lights at 20 and BT6.5's `dmg_ref(heavy) > 2·dmg_ref(light)`
  lint fails at Light 40 / Heavy 70; the spec's bt-6 build note puts the lengthened legacy 1v1 on the e2e
  side. The sibling `client/e2e/battle-dpad.spec.ts` already seeds all six stats (250 / HP 999).

## The edit (three hunks, nothing else)

1. Constants (after `SEED_DEFENSE`): add `const SEED_ATTACK = 100;` with a doc comment stating WHY
   (first cell = Ember, a bt-6 Light at 20; the level-5 creation roll 8–12 lost the chip race; CI run id)
   and the measured bound: at level 7 (`2L/5+2 = 4`) Ember@20 vs the toughest zone-0 wild, a Lv7
   Flameling with defense 15 / HP 25: 8000/15/50+2 = 12 → STAB 18 → ×0.5 = 9 → variance 85 → 7–9 per hit
   ⇒ ≤ 4 hits; a Lv8 Sproutlet (def 16, HP 27): 12 → 18 → ×2 = 36 → 30–36 ⇒ 1 hit. Survival ≥ 19 turns.
2. `beforeAll` seed loop: add `['stat_attack', SEED_ATTACK],` after the two defense columns (the same
   `UPDATE monster SET … WHERE monster_id = …` statement; the `sql()` charset guard accepts it).
3. The SEEDING header paragraph (lines ~25–33): replace the "defense columns are raised so a zone-0 wild
   (Lv3-8) cannot KO it; attack is left natural, so a kill normally takes several hits and E1 sees an
   intermediate HP frame" sentences with the truth: defense 250 makes the wild's Heavy land only the
   damage floor (1 per turn), attack 100 makes Ember KO the toughest zone-0 wild in ≤ 4 hits (cite
   SEED_ATTACK), the level-5 roll lost that race after bt-6, and E1 reads either an intermediate or a
   terminal HP frame (a Sproutlet dies in one hit; the terminal frame keeps both cards). Keep every other
   sentence (bands, evolution gates, Water wilds) verbatim.

4. Read-back (anti-no-op, in `beforeAll` right after the seeding `UPDATE`s, before the level wait): read the
   row back with the existing helpers — `sqlRows(sql(\`SELECT * FROM monster WHERE monster_id = ${monsterId}\`,
   'seed'), 'seed')` (the charset guard `^[A-Za-z0-9_ *=]+$` accepts it) — and `expect(Number(row?.stat_attack),
   '<message>').toBe(SEED_ATTACK)` plus the same for `stat_defense` → `SEED_DEFENSE`. A seed that matched no
   row or landed in the wrong table would otherwise leave the spec ~21 % red with no pointer to the cause.

Optional 5th hunk only if it reads false after the change: the `MAX_ATTACKS` doc comment (keep it true;
≤ 4 hits worst case, 30 is the ceiling).

## Measured bound you may cite (red-team enumeration of all 2^32 encounter seeds through the real
`resolve_encounter` / `roll_individuality` / `derive_stats` / `calc_damage`)

- Natural attack (8–12): max 25 hits to KO a species-1 wild; P(win | fought wild) = 79.4 % (species 1: 69.1 %,
  species 3: 100 %) — the ~21 % red.
- Attack 100: max 4 hits (worst draw: Lv7 Flameling, IVs 31/31/31/31/20/6, HP 25, defense 15 → 7–9 per hit);
  a Sproutlet dies in one; the wild's Heavy lands exactly 1 per hit against defense 250, so the starter
  (HP ≥ 19) survives every draw; P(win) = 100 %. Ember accuracy 100 never misses; no zone-0 skill applies
  status or weather; Regeneration is entry-only; flee is instant (no wild hit).

## Hard rules

- Do NOT change E0–E3 bodies, helpers, `MAX_ATTACKS`, `SEED_LEVEL`, `SEED_XP`, `SEED_DEFENSE`, imports, or
  anything in another file. No new tests. No `test.only`/`skip`.
- Formatting: biome (2-space, single quotes, 100 cols) — run the static check you are allowed
  (`npx biome check client/e2e/encounter-battle.spec.ts` from the worktree root if the hook permits).
- When done, print the unified diff of the file and stop. The orchestrator runs the spec against the live
  server to prove green (red is already proven by CI + the local pre-fix loop).
