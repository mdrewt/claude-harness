---
name: monster-realm-M12.5f-review-verdict
description: Review verdict for PR #92 M12.5f gate & sim-harness teeth — FIXED, 2 doc/test defects corrected
metadata:
  type: project
---

# M12.5f Review Verdict — PR #92 (`feat/m12.5f-gate-simharness-teeth`)

**Verdict: FIXED**
**Date:** 2026-07-03
**Branch tip at verdict:** `24464d3` (fix commit on top of implementing wip `8ebe99b`)
**CI status:** GREEN (both before and after fix — exit 0 both runs)
**Findings count:** 2 defects fixed, 6 informational/clean

---

## Lenses run

1. **reviewer** (correctness + security)
2. **red-team** (adversarial / vacuity)
3. **verifier** (gating-test integrity)
4. **Orchestrator direct analysis** (ZONE_0_ROWS path trace + panic message verification)
5. **CI runs:** `just ci` × 2 (before + after fix)

---

## Defects found and fixed

### H1 — `no_spurious_warp_without_warp_tile` path vacuity (sim-harness/src/world.rs)

**Finding:** The test used path E×4,S×4 from spawn (1,1). ZONE_0_ROWS row y=3 = `"#...##..~#"` — x=5 is a wall `'#'`. After E×4 the character reaches (5,1); the first S moves to (5,2); subsequent S steps bump and stay at (5,2). The character **never reaches (5,5)**. Since `zone_0()` has `warps:vec![]`, the `zone_id == 0` assertion passes regardless — making the stated kill target ("unconditional warp resolution ignoring `map.warp_at()`") vacuously satisfied.

**Fix (`24464d3`):** Changed path to the navigable route E,E,S,S,S,E,E,S (same route used by `warp_crossing_moves_character_to_destination_zone`). Character now correctly reaches (5,5) in zone_0(). `zone_0()` has no warp at (5,5) → `zone_id` stays 0. The kill target is now genuinely exercised: hardcoded "zone_change when at (5,5)" logic would be caught.

**Coverage note:** The bump guard itself (`prev != ch.state.pos`) is properly tested by `bump_adjacent_to_warp_does_not_warp` (uses real RON map with warp, then bumps at (5,5)). Both tests together provide full coverage.

### H2 — Wrong geometry in 3 doc comments + ADR

**Finding:** Three locations claimed the path to (5,5) was "East×4 + South×4" / "→East×4→(5,1)→South×4→(5,5)" — which is physically blocked at (5,3). Affected:
1. `sim-harness/src/lib.rs:880-881` — block comment before convergence test
2. `sim-harness/src/lib.rs:920` — assert message inside convergence test ("after East×4 + South×4")
3. `docs/adr/0076-gate-simharness-teeth.md:23` — "East×4 + South×4 from spawn"

Additional issue: block comment at lines 888-890 claimed "The test uses zone_of ... to confirm the zone flip" but the convergence test uses `apply_stream` (returns `BTreeMap<u64, TilePos>`) and never calls `zone_of`. Zone-flip is verified by the sibling test `warp_crossing_moves_character_to_destination_zone`.

**Fix (`24464d3`):**
- Block comment: updated to "E×2→(3,1), S×3→(3,4), E×2→(5,4), S→(5,5)" with note that direct path is blocked
- Removed incorrect `zone_of` claim; clarified that zone-flip checking is done by the sibling test
- Assert message: "after E×2,S×3,E×2,S navigating to the warp tile"
- ADR-0076: "E×2,S×3,E×2,S from spawn (navigating around the wall pair at (4,3)/(5,3))"

---

## Informational findings (not merge-blocking)

- **M1 (reviewer):** `parseSpacetimeTypes` regex `[^}]*?` would fail on SpacetimeType enums with named struct variants (e.g., `Step { x: i32, y: i32 }`). No current type is affected; 14/14 types parse correctly. Document as latent risk; re-baseline required if any SpacetimeType gains named enum variants.
- **M2 (reviewer):** `hasExpiredFixme` uses raw `indexOf` — token appearing anywhere in file (not just near `test.fixme`) triggers. Currently harmless: recruit.spec.ts is clean, no other e2e file mentions 'M9c'/'M8.7e'. Latent false-positive risk.
- **m1 (reviewer):** `run.mjs` silent `catch {}` hides `readdir` errors before the zero-eval guard. Improvement would be logging the caught error. Non-blocking.
- **m2 (reviewer):** `baitItems: BaitItem[]` naming — passes non-bait items (recruitBonus=0) to `buildBattleViewModel` which filters them internally. Correct behavior; naming is slightly misleading. Non-blocking.
- **m3 (reviewer):** `resolve.rs` out-of-scope edit is CORRECT and JUSTIFIED — spec §12.5f-4 explicitly names this fix; panic message at line 48 matches `expected =` string exactly; trailing `panic!()` removed; minimal change only. Accepted.
- **m4 (red-team):** `no_spurious_warp_without_warp_tile` kill target description "unconditional warp resolution ignoring map.warp_at()" is imprecise even after the path fix (zone_0() has no warps so warp_at always returns None). More accurate description: "hardcoded zone-change based on position rather than map lookup". Non-blocking; sibling test covers the actual bump-guard kill target.

---

## Gating-test integrity (verifier verdict: CLEAN)

- No tests deleted
- No `#[ignore]`, `skip`, `.only`, `it.only`, `test.skip` added
- No assertions removed or weakened
- `unknown_skill_id_panics`: STRENGTHENED — `#[should_panic(expected=...)]` replaces bare `#[should_panic]`; trailing `panic!()` removed
- All proof-of-teeth fixtures verified biting:
  - BattleOutcome+Draw → `checkTypeDrift` returns non-empty ✓
  - T3 comment-only `healView.ts` → flagged as missing ✓
  - T-E1 `test.fixme` + `M9c` → `hasExpiredFixme` returns true ✓
  - T-E2 still-pending blocker → returns false ✓
- `recruit.spec.ts`: contains `test.fixme` (4 blocks) but NO expired tokens (`M9c`/`M8.7e` absent) ✓
- `spacetime-types.json` baseline: 14 types, `BattleOutcome` has 4 variants (not 5) ✓
- `run.mjs` exits 1 (not 0) on zero eval files ✓
- 1 pre-existing `#[ignore]` test (m7b_redteam_tests: owner-change-mid-battle, tracked by spec-gap-revival) — unchanged

---

## CI results

| Run | Tests | Evals | Exit |
|-----|-------|-------|------|
| Pre-fix (8ebe99b) | 761 Rust pass, 571 JS pass | 41 pass | 0 |
| Post-fix (24464d3) | 761 Rust pass, 571 JS pass | 41 pass | 0 |

Skipped: 1 test (`m7b_redteam_tests::owner_change_mid_battle_write_back_unspecified`, pre-existing `#[ignore]`)

---

## Branch state at verdict

- **Tip:** `24464d3` pushed to `origin/feat/m12.5f-gate-simharness-teeth`
- **Fix commit:** `fix(review): correct no_spurious_warp path + doc comment geometry (M12.5f review pass)`
- **Files changed in fix:** `sim-harness/src/world.rs`, `sim-harness/src/lib.rs`, `docs/adr/0076-gate-simharness-teeth.md`
- **No ADR added** (fixes are test path and doc corrections, no architectural decision)

---

## Merge instruction for supervisor

PR #92 (`feat/m12.5f-gate-simharness-teeth`) is **CLEARED for squash-merge**. Tip `24464d3`. After merge, index ADR-0076 via doc-only chore PR. ADR next-free = 0077.
