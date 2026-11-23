# Tester brief — ci-fix-20261107T2101 (RED phase) — REV 3

You write ONE new Playwright e2e test in `client/e2e/encounter-battle.spec.ts` and update that file's
header comments. You do NOT touch `client/e2e/controls.ts` (the implementer owns it) or any other
file. Your Bash is static-only; list the runs you need the orchestrator to perform in your report.
Worktree (all paths relative to it):
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ci-fix-20261107T2101`.
Ignore `client/e2e/zz-probe-*.spec.ts` (throwaway diagnostics; they will be deleted).

## Why (the measured defect)

Master CI is red on E2 of this spec: `fightToOutcome` stalled 16 own turns against a Skittish wild
(zone-0 species 3 "Sproutlet") that kites: it only attacks with its Heavy (range 2–3), cannot do so
when the player is ADJACENT at its turn start (range_min 2, and a 1-stride disengage-taxed Move 3 +
Heavy 4 > 6 AP), so it moves to distance 5; the helper then always steps to the tile NEAREST the
enemy (adjacent again) and ends the turn without firing. Reproduced locally 3 of 4 Sproutlet battles.
The game's answer is MOVE THEN SKILL in one turn (2 strides + Light = 6 AP): the implementer adds that
to `controls.ts`. No spec drives that core tactical turn today — your test is its e2e.

## The contract you test (controls.ts — NOT yet implemented; import it from './controls')

```ts
export async function moveThenAttackByButtons(
  page: Page,
  me: Tile,      // the active own unit's LIVE tile ({ x, y }; `sides(t).me` works, it has x/y)
  enemy: Tile,   // the target unit's tile (`sides(t).enemy`)
  opts: { allowKo: boolean; enemyHp: number },
): Promise<{ hit: 'attacked' | 'kills' | 'none'; dest: Tile | null; tries: number }>;
```
Preconditions: the own live turn, the unit's ROOT menu OPEN (`openMenu(page, me)` done), no draft.
Semantics: tries the Move-band tiles nearest `enemy` first; per tile it drafts the Move (its ghost),
re-opens the menu on the unit's live tile and presses the attack through Skills → the forecast → A
(`attackByButtons(page, opts)` from the ghost: the Skills row reads the ghost tile and the budget left
after the Move). The first tile a skill fires from returns `hit: 'attacked'`, `dest` = that tile,
`tries` ≥ 1; the commit `[Move, Skill]` executes on the live turn (the turn stays live; the caller
ends it with `endTurn`). With `allowKo: false` a forecast whose MAX damage reaches `enemyHp` is backed
out exactly as `attackByButtons` does (`'kills'`). When no tile fires: `hit` is the last result
(`'kills'` or `'none'`), the NEAREST tile stays drafted (today's step-toward) and the menu is CLOSED.
`dest: null` only when the Move row is greyed/absent or the band is empty (menu left at its root).

## The test — EARS

Place it between E1 and E2 inside the existing `test.describe.serial(...)`. Name leads with the
behaviour:
`'E1b: an out-of-reach foe is hit in one turn by Move then Skill from the ghost tile (the kiting wild's answer)'`.
`test.setTimeout(300_000)`.

- E1b-SEED. The test SHALL first read the starter's natural speed
  (`sqlRows(sql('SELECT * FROM monster WHERE monster_id = ...'))` → `Number(row?.stat_speed)`, assert
  it is a finite integer > 0), then seed `stat_speed = SEED_SPEED` (new const, 999) on BOTH `monster`
  and `monster_pub` with the file's `sql(...)` helper and read it back (`'the starter row reads back the
  speed seed'`). Why: initiative is `stats.speed desc`, so the starter ALWAYS acts first; spawn rows are
  y=1 vs y=5, so the opening own turn is at Manhattan distance ≥ 4 — out of every Flameling skill's
  reach (Ember range 2–3, Fire Fang 1) — deterministically. Stride length is the SPECIES base speed
  (content), so nothing else changes.
- E1b-LOOP. FOR battle in 0..MAX_E1B_BATTLES (new const, 6) WHILE not done: `huntEncounter(page,
  \`E1b battle ${battle}\`)`; `t = await waitOwnTurnOrEnd(page, null, 15_000)`; if `t.phase !==
  'Active'` → `throughResults` and continue; `{ me, enemy } = sides(t)`; `openMenu(page, me)`.
- E1b-PRE. THEN the root Skills row (`page.locator(TACTICS.menuRow('skills'))`) SHALL have
  `aria-disabled` equal to `'true'` — assert with the message `'E1b: the starter acts first at the
  spawn distance (d≥4): no skill reaches from the start tile, the Skills row is greyed'`. Also assert
  `tileDistance(me, enemy)` ≥ 4 with a message.
- E1b-FIRE. `r = await moveThenAttackByButtons(page, me, enemy, { allowKo: false, enemyHp:
  enemy.curHp })`. Branch on `r.hit`:
  - `'attacked'` → `expect(r.dest, 'E1b: the Move went somewhere').not.toBeNull()`;
    `expect({ x: r.dest.x, y: r.dest.y }, 'E1b: the ghost tile is not the start tile').not.toEqual({ x: me.x, y: me.y })`;
    `expect(r.tries).toBeGreaterThanOrEqual(1)`; `await waitExecuted(page, t.events)`;
    `after = await readTactics(page)`; ORACLES (whatever `after.phase`):
      · the own unit's row (`after.units.find(u => u.unitId === me.unitId)`) stands on `r.dest`
        (`{ x, y }` equal) — `'E1b: the Move executed before the skill: the unit stands on the ghost tile'`;
      · `tags = await readEventTags(page)` (import from './controls'; it returns
        `{ tag, unit, how }[]` for the whole battle); `since = tags.slice(t.events)`; assert
        `since.some(e => e.tag === 'Moved' && e.unit === me.unitId)` — `'E1b: the transcript shows the
        unit's Move'` — and `since.some(e => e.tag === 'Executed')` — `'E1b: the transcript shows the
        skill executing after the Move'` (an `Executed` entry has `unit === null` in this reader; do
        not assert on it). Also `console.log` the foe's HP before/after (information only — a pack's
        first aim may hit a pack-mate, and a Heavy can miss).
    Then: if `after.phase === 'Active'` → `await endTurn(page)`; `next = await waitOwnTurnOrEnd(page,
    turnKey(t), 15_000)`; if `next.phase === 'Active'` → `await fleeByButtons(page)`;
    `await throughResults(page, 'E1b')`; `done = true`.
  - `'kills'` (every firing tile forecasts a KO — a KO here would pay XP, level the starter to 8 and
    recompute its seeded stats, breaking E2) or `'none'` (no band tile fires from this opening
    geometry) → `console.log` it with the battle index and `r.tries`; `await endTurn(page)`; `next =
    await waitOwnTurnOrEnd(page, turnKey(t), 15_000)`; if Active → `fleeByButtons`; `throughResults`;
    continue (re-hunt).
- E1b-DONE. After the loop: `expect(done, \`E1b: a Move-then-Skill landed within MAX_E1B_BATTLES=${MAX_E1B_BATTLES} battles (outcomes: ...)\`).toBe(true)` —
  collect the per-battle outcomes in an array for the message.
- E1b-RESTORE. Finally (plain code after the loop, not a `finally` block) write the natural speed back
  on BOTH tables and read it back (`'the starter row reads back its natural speed'`), so E2 runs on
  the natural initiative (CI's configuration: the wild may act first and kite — now answered by the
  fixed helper). Put the restore AFTER the `done` assertion is NOT acceptable (a failure would leave
  the seed): place the restore BEFORE the `done` assertion.

## Header comments to update (same file, prose only)

- The "WHAT THIS ADDS" / bt-16 list: add the E1b line (the core tactical turn by buttons: Move then
  Skill in one turn from the ghost; why it exists — the kiting Sproutlet stall that redded master on
  8ac38368; non-lethal like E1).
- SEEDING paragraph: the TEMPORARY speed seed inside E1b (why; restored before E2; stride length is
  species content so nothing else moves).
- `MAX_OWN_TURNS` doc comment ("16 covers a kiting wild") → the truth: a kiter is answered on the
  first own turn in reach by `fightToOutcome`'s Move-then-Skill; 16 is slack, a stall now means a
  dead button or a changed AI.
- `MAX_E1_BATTLES`-style doc comment for `MAX_E1B_BATTLES` (what a re-hunt means: a lethal-only
  forecast or an opening geometry with no firing tile).

## Rules

- Do not remove, relax, reorder or rename any existing assertion of E0/E1/E2/E3.
- Reuse the file's helpers (`sql`, `sqlRows`, `huntEncounter`, `snap`) and controls exports; add only
  the `moveThenAttackByButtons` and `readEventTags` imports (keep the import list sorted as biome does).
- Formatting: biome — 2 spaces, single quotes, trailing commas, width 100.
- Concrete values only: no "did not throw" assertions.
- Report: the test's line range, the exact run for the orchestrator (the single-spec e2e command),
  and the expected RED reason on the pre-fix tree (the import is missing).
