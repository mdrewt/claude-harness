# ci-fix-20261031T1900 — plan (master-red ci-fix after bt-6, PR #623)

Worktree: `projects/monster-realm/.claude/worktrees/ci-fix-20261031T1900` · branch `slice/ci-fix-20261031T1900` from `origin/master` @ 38a00032.

## Diagnosis (CI run 41227281094, job 124613955215 + the formulas)

- Red: `e2e/encounter-battle.spec.ts:556` "Phase 3 smoke … E2: fighting on to a win" — `outcome-text` reads
  `Defeat...` (121 passed, 1 failed, 1 skipped, 1 did not run). The `ci` job is green.
- Chain, measured from the formulas (`combat/damage.rs`, `monster/rules.rs::derive_stats`, `combat/ai.rs`,
  `marshal.rs::wild_battle_monster`):
  1. bt-6 retune: Ember (id 1) 40 → 20 (a Light), Fire Fang 65 → 70, Razor Leaf 55 → 70.
  2. The e2e attacks with the FIRST skill cell — learnable order `[1, 2]` → Ember.
  3. The seeded starter is level 7 by SQL, but its row keeps the level-5 creation stats
     (`roll_starter`): attack 8–12, HP 19–21; only `stat_defense`/`stat_sp_defense` are seeded (250).
  4. Wilds know every learnable skill and `pick_best_skill` always throws the Heavy; against defense 250 it
     lands the floor of 1 per hit (95 % acc). Zone-0 draws: species 1 (w10, Fire — resists Fire),
     species 3 (w5, Plant), species 2 (w7, Water — fled). So 2/3 of fought wilds resist Ember.
  5. Ember@20 vs a Lv7 wild Flameling (def ≤ 15, HP ≤ 25): base 4·20·atk/def/50+2 → STAB → ×0.5 → var
     = 1–3 per hit → up to 25 turns, past the starter's 19–21 turns of chip. At Ember@40 it was 1–4 per
     hit: already thin; bt-6 halved the only output the script uses.
- Revert rejected: BT6.1 pins the Lights at power 20 (`lights_are_power_20_and_tier_light_bt6_1`,
  `heavies_are_tier_heavy_with_power_exactly_70_bt6_1`), and BT6.5 `dmg_ref(heavy) > 2·dmg_ref(light)` at
  every level 5..=100 fails at Light 40 / Heavy 70 (L5: 7 > 2·5 is false; holding it at Light 40 needs
  Heavy power ≥ 113 at L5) — a broad retune — and the spec's bt-6 build note already places the lengthened
  legacy 1v1 on the e2e side ("those specs still drive before cutover"). Its `MAX_ATTACKS = 30` widening
  guarded the attack budget, not the HP race.
- Measured locally (pre-fix, live spacetime, dev_reducers module): 3 red of 14 runs of the spec, every red
  `Defeat...` at :565 — so a single post-fix green is weak evidence; the bound below plus a repeat loop is
  the proof.

## Fix (narrowest): seed the starter's attack in the e2e, as battle-dpad.spec.ts already does

- `client/e2e/encounter-battle.spec.ts` (tester-owned edit): add `SEED_ATTACK` and seed `stat_attack`
  in `beforeAll` beside the two defense columns; rewrite the SEEDING header paragraph and the
  `MAX_ATTACKS` comment so they state the measured bound. Nothing else changes.
- Value: `SEED_ATTACK = 100`. Worst zone-0 cases with Ember@20 (level 7 ⇒ `2L/5+2 = 4`):
  - Lv7 Flameling, def 15 (IV 31, +nature), HP 25: base 8000/15/50+2 = 12 → STAB 18 → ×0.5 = 9 → var 7–9
    ⇒ ≤ 4 hits.
  - Lv8 Sproutlet, def 16, HP 27: 8000/16/50+2 = 12 → 18 → ×2 = 36 ⇒ 1 hit.
  - Survival: the wild's Heavy vs defense 250 is the floor 1 ⇒ ≥ 19 turns vs ≤ 4 needed (≈5× margin).
  - E1 tolerates a one-hit KO (its own comment: the terminal frame keeps both cards); the rewritten header
    must not promise an intermediate HP frame (a Sproutlet dies in one hit) and must drop "cannot KO it"
    (the wild lands the floor 1 per turn; the race is about turns).
- Alternatives considered: click the Heavy cell (natural attack: 2–3 per hit vs the worst Fire wild → 9–13
  hits + 5 % misses, thinner and couples the script to cell order); raise `SEED_LEVEL` (Lv9+ meets nothing
  in zone 0); seed HP 999 (hides the race instead of winning it; unnecessary at ≤ 4 hits).
- No production code, no content, no CONTENT_VERSION, no content-hash. `battle-dpad.spec.ts` untouched
  (seeds all six stats already). Skills: `code-intel` invoked; `game-core-testing` /
  `spacetimedb-reducer` not applicable (no edit under `game-core/` or `server-module/`).
- Spec: harness `M-battle-tactics.spec.md` bt-6 build note gets a measured addendum (uncommitted, the
  established pattern for build notes).

## Gates (ledger `gates/ci-fix-20261031T1900.gates.md`, X* authored here)

- X1 — the red spec green locally against a live spacetime with the dev_reducers module (the CI e2e job's
  setup): node one-liner → builds the dev wasm, runs `npx playwright test encounter-battle.spec.ts`, prints
  `ci-fix-X1:PASS` only on exit 0 with ≥ 4 passed.
- X2 — bt-6 game-core criteria untouched: `cargo nextest run -p game-core --lib -E 'test(/_bt6_/)'` summary
  `N tests run: N passed`.
- X3 — bt-6 server criteria untouched: same on `monster-realm-module`.
- X4 — MANUAL: the full `just e2e` suite green locally once (the CI job equivalent); evidence file
  `gates/ci-fix-20261031T1900.x4-e2e-full.md` with the deciding summary line.

## Procedure

1. Env prep (background): `npm ci`, `just wasm`, dev_reducers wasm. 2. Plan lenses: reviewer + red-team in
one parallel batch. 3. Tester (opus) edits the e2e per brief; orchestrator diff-checks scope. 4. Red proof: the
CI run (same test, real defect) + one local pre-fix run of the spec (probabilistic — the draw may pass).
5. Green: spec ×3 (exit code), then full `just e2e` (server up). 6. Server down → full `just ci` detached.
7. Server up → `mr-gates check`. 8. Diff lenses: reviewer, red-team, simplify, verifier (desync-guard /
reducer-security-auditor N/A: no core/server edit). 9. Spec addendum, PR with gates render, STOP.

Server discipline: `spacetime start --data-dir $(mktemp -d)/data --in-memory --listen-addr 127.0.0.1:3000`
(sibling-safe), kill by PID after checking `/proc/<pid>/cmdline`; `just ci` needs it GONE.
