# m17.5a progress memo (2026-07-17)

**Slice:** m17.5a — unify the "already in an ongoing battle" guard to BOTH battle roles
(close side-B PvP damage-laundering exploit). M17.5 spec §2 17.5a, EARS 17.5a-1..5.
**Branch:** `feat/m17.5a-sideb-battle-guards` (pushed). **ADR:** 0122. **Worktree:**
`.claude/worktrees/m17.5a`.

## DONE
- Plan authored + reviewer/red-team plan-fan → all findings dispositioned into plan (docs/specs/m17.5a-plan.md). wip-committed.
- Tester RED gates: 7 pure-core unit tests (`is_in_ongoing_battle_either_role`, empty-player-arm discipline + WILD-sentinel + laundering) in guards_tests.rs; 4 side-B seam tests + both-role seam chains in evolution_tests.rs; eval C1–C4 in battle-reducer-security.eval.mjs. Test-fan (reviewer+red-team) → 6 hardenings applied (if-form+identity-token C1, structural chain-count C2 fuse≥2, args-region+order C3, alias bad-fixture C4, fuse-B seam test, naming fixes). Verified RED (8×E0425 compile-RED + eval C1×4/C2×2/C3×2, 0 TEETH FAILED).
- Implementation (5 prod files): guards.rs two-function split (`is_in_ongoing_battle_either_role` pure core + `is_in_ongoing_battle(ctx,id)` wrapper, WILD refinement verbatim, player-iter first/opponent-iter second); start_battle/begin_encounter/start_wild_battle/heal_party → `if is_in_ongoing_battle(...)` byte-stable strings; evolve/fuse chain `.opponent_identity().filter()` (evolve×1, fuse×2); pvp.rs private copy DELETED + imports shared. 288 module tests green, clippy/fmt clean, eval pass.
- Impl-fan: reviewer (clean; B-1 "ADR missing" resolved by doc-keeper), red-team (SOUND — 5/5 live mutation spot-checks bit + exploit-path trace confirms all vectors rejected), reducer-security review-lens (CLEAN verdict; challenge_pvp info-oracle pre-existing/accepted given public battle table; movement.rs residuals documented). Polish edits (comment/naming/doc-trim/seam-string parity) applied.
- Docs: ADR-0122 written at reserved number (D1–D9 incl. movement/warp/care-train/start_pvp_battle residuals; Decision line ≤240; signature+error-strings corrected by orchestrator). ARCHITECTURE.md M17.5a entry. DIGEST + knowledge regen. **mutate-server re-baselined 308→299** (513 mutants, ADR-0118 §4) in justfile.
- **Blast-radius fix:** heal_party refactor broke `evals/npc-dialogue-quest-security.eval.mjs` C6 needle (scanned battle()/Ongoing/BattleOutcome, none survive the SSOT wrapper). Tester taught C6 the `is_in_ongoing_battle(` form + added GOOD_HEAL_PARTY_WITH_SSOT_GUARD fixture; bad-fixture teeth preserved. Eval suite exit 0.

## REMAINING (at memo time)
- Final full `just ci` running (background b35jr4k9p / monitor bf0zghwlp) — MUST be exit 0 before PR.
- Open PR on mdrewt/monster-realm; STOP (supervisor owns merge).

## BLOCKERS
- none. (Note: fresh worktree needs `cd client && npm install --include=dev` before `just ci` — biome/tsc/vitest live in client/node_modules; done this run.)

## touches-delta (beyond declared set — for supervisor audit)
- `server-module/src/pvp.rs` (+ no test change) — REQUIRED by hoist (delete private fn, import shared). Expected per plan.
- `evals/npc-dialogue-quest-security.eval.mjs` — NOT declared; heal_party refactor blast-radius (C6 needle + good fixture). SERIAL slice, no sibling owns it. Teeth preserved.
- `justfile` — mutate-server cap 308→299 (ADR-0118 §4 re-baseline).
- Standard doc outputs: docs/adr/0122-*, docs/adr/DIGEST.md, docs/knowledge/** (11 reducer cards regen), ARCHITECTURE.md, docs/specs/m17.5a-plan.md.

## Residuals recorded in ADR-0122 (candidate follow-up slices, NOT fixed here)
- D4 warp-guard (movement.rs:209-222 player-role-only → side-B can warp mid-PvP; separate invariant).
- D7 care/train have no battle guard either role (NOT laundering today — HP snapshotted at creation; weaponized if write-back ever recomputes from live stat_hp).
- D2 movement.rs encounter pre-check player-only (non-security fast-path; wasted RNG draw, determinism-neutral).

## Exact next step
Confirm `just ci` exit 0 → `gh pr create` → STOP at "PR open + local ci green + remote CI running".
