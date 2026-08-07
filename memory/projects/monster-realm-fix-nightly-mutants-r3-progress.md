---
name: fix-nightly-mutants-r3
description: fix-nightly-mutants-r3 DONE — PR #281 open, 2 killed + 1 self-expiring equivalent; EG1 coverage, mutation-kill trap fixes
metadata:
  type: project
---

# fix-nightly-mutants-r3 slice — DONE

**Branch:** `fix/fix-nightly-mutants-r3`  
**Worktree:** `.claude/worktrees/fix-nightly-mutants-r3`  
**PR:** #281 — https://github.com/mdrewt/monster-realm/pull/281  
**Status:** PR open, local `just ci` EXIT=0, remote CI running  
**ADR:** None (test-only slice, no new architectural decisions)  
**ADR next-free:** 0175 (unchanged — none consumed)

---

## Summary

Killed 2 mutants from nightly run 30897187833 (1137 total, 3 missed) originating in slice EG1 (PR #279, ADR-0174: essence-graph schema evolution). The third mutant is genuinely equivalent (contingent on empty RON content) and blessed with a self-expiring exclusion that forces cleanup when EG3 lands. Also closed two critical pre-existing security findings in the eval's exclusion validation (per-entry check + live-test tripwire) and minor simplifies as part of the infrastructure review.

---

## Changes

### 1. `game-core/src/content.rs` — 2 new tests (R6 rule coverage)

Added inline tests after line 3397:

- **`r6_a_wild_catchable_base_form_is_accepted`** (positive) — eg1_valid_world() + eg1_encounters(0, &[1]) must validate Ok(()); kills `1041:47 == -> !=`
- **`r6_to_species_alone_in_encounter_table_rejected`** (negative) — eg1_encounters(0, &[2]) must Err with "R6:"; second witness for the same mutant

Why #2 survived (trap): the pre-existing R6 test uses `eg1_encounters(0, &[1, 2])`; under `!=`, the FIRST entry (1 != 2) already fires the Err (message interpolates path.to_species, never the matched entry), so expect_err still passes. All other tests pass empty encounters `&[]`, never testing the `.any()` loop body. **Lesson:** an `.any()` predicate needs a fixture with entry-set discrimination AND a positive (Ok) control, not just expect_err.

Added canary test `eg1_load_evolution_paths_is_empty_pending_eg3` (asserts loaded registry is empty, doc-commented with retirement instructions for EG3).

### 2. `game-core/src/evolution/m10a_gating_tests.rs` — 1 new test (essence boundary)

Added after line 593:

- **`unmet_requirement_essence_names_the_strictly_unmet_entry_not_an_at_threshold_one`** — Two-entry fixture [Fire 100, Water 75]; monster Fire=100 (exactly at threshold → met), Water=74 (strictly unmet); kills `eligibility.rs:125:64 < -> <=` (mutation renames Water to Fire). Plus sub-case with Fire=99, pinning "first in list order" over the <= bug.

Why #3 survived (trap): every existing essence fixture was SINGLE-entry, so `<` and `<=` pick the same entry. `<=` matches a superset of `<`, so expect() never panics — the mutant only changes WHICH entry is named. Only a MESSAGE-CONTENT assertion (not is_ok/is_none) can detect it. `unmet_requirement_agrees_with_path_satisfied` compares only is_none() and is structurally incapable of killing it.

(Note: eligibility.rs itself remained UNCHANGED; its tests live in the declared sibling file per evolution/mod.rs:23-24.)

### 3. `.cargo/mutants.toml` — blessed exclusion #4 (self-expiring)

Added 4th line-pinned `exclude_re` entry for `content.rs:624:5 load_evolution_paths -> Ok(vec![])`.

**Why mutant #1 is equivalent (contingently):** `game-core/build.rs:23-37` globs `content/evolution_paths/*.ron` into EVOLUTION_PATHS_RON_PARTS at compile time. That dir holds one file, `000-core.ron`, payload `[]` (deliberately empty until EG3 authors the graph per ADR-0174 D6). load_evolution_paths is a pure nullary delegate returning Ok(vec![]). No test can alter a build-time constant. Doctests: none in file.

**Why this exclusion is SELF-EXPIRING (critical distinction):** The other 3 blessed entries are equivalent *permanently, by construction*. This one becomes KILLABLE the day EG3 lands one edge. A line-pinned exclude_re is CODE-keyed, so a naive exclusion would silently suppress a real mutant forever. **Solution:** three coupled artifacts force retirement when EG3 lands:
1. Canary test `eg1_load_evolution_paths_is_empty_pending_eg3` (live #[test], uncommented)
2. Eval tripwire: canary must EXIST and must be LIVE
3. Eval tripwire: every content/evolution_paths/*.ron must still reduce to [] (after //comment strip)

EG3 must retire all THREE together — then an ordinary non-emptiness test kills the mutant for real.

**Non-obvious:** eg1_live_registries_pass_validate_evolution_paths will NOT start catching it when EG3 lands (empty set and valid graph both validate Ok(()) per R10 carve-out).

### 4. `evals/mutate-core-recipe-integrity.eval.mjs` — blessed-count pin + 2 tripwires + CRITICAL fix

- Bumped hard pin: 3 → 4 entries (quoteCount check)
- Added entry-4 fragment check + TEETH for canary existence + TEETH for .ron emptiness
- Updated CANONICAL_MUTANTS_TOML, TEETH 8 (four → five blessed entries), TEETH 14/15 messages

**CRITICAL fix (pre-existing security finding):** Previously, `mutantsTomlPinned` validated by unordered substring search over CONCATENATED exclude_re, with count only checking quotes. This allowed `exclude_re = [".*", "<one entry with all fragments>", "", ""]` to PASS while `.*` silences every mutant — the gate designed to stop exclusion-laundering could itself be laundered. Fixed: each entry is split and validated individually; any unrecognized/wildcard/combined/duplicate entry is rejected. New tooth uses exact bypass string.

**HIGH fix:** Canary tripwire was bare substring search, so a canary deleted-but-still-quoted-in-comments satisfied it, as did #[ignore]'d tests. Fixed: check now requires live, uncommented `fn` declaration carrying #[test] and NOT #[ignore]d.

---

## Review Findings Closed

(These are durable infrastructure lessons, not test-specific.)

1. **CRITICAL (pre-existing):** eval's mutantsTomlPinned gate could be bypassed by wildcard or combined entries. Fixed by splitting array, classifying each entry, and rejecting unrecognized ones.

2. **HIGH (pre-existing):** Canary tripwire accepted deleted tests if quoted in comments, and accepted #[ignore]'d tests. Fixed by requiring live, uncommented `fn` with #[test] and no #[ignore].

3. **Minor simplifies:** Removed dead conditional, corrected false claim that tripwires "retire themselves", removed unnecessary String.fromCharCode(0x22) constant, fixed wrong tooth header comment, clarified that both R6 tests are separately sufficient (not jointly necessary).

---

## Gates

- **Local `just ci`:** EXIT=0 — 76/76 evals PASS, 65 client test files / 1852 tests pass, full Rust suite green, Semgrep/security clean
- **Targeted cargo mutants:** `cargo mutants -p game-core --file game-core/src/content.rs --file game-core/src/evolution/eligibility.rs` → 256 mutants tested, 213 caught, 43 unviable, **0 missed** ✓
- **Proof of teeth (hand-applied):** Both R6 tests failed when mutation applied; pre-existing R6 test still passed (evidence of survival). Essence test failed; unmet_requirement_names_each_gate and unmet_requirement_agrees_with_path_satisfied still passed (evidence of survival). Red→fix cycle: one cargo fmt diff, resolved before PR.

---

## Collision Risk & Scope

Worktree verified isolated: no open PRs, no other worktrees, EG2/EG3 staged but not launched.

Touches beyond declared {content.rs, eligibility.rs}:
- `game-core/src/evolution/m10a_gating_tests.rs` (declared sibling test file, always in-scope)
- `.cargo/mutants.toml` (blessed exclusion, precedent set in r1)
- `evals/mutate-core-recipe-integrity.eval.mjs` (infrastructure fix + self-expiry tripwires, precedent set in r1)

Justification: supervisor's brief pre-authorizes mutants.toml exclusion + justification; r1 set precedent for eval surgery.

---

## No ADR

Entries 1–3 were added to mutants.toml under ADR-0088 §Decision 2 without new ADRs. r1 likewise shipped ADR-none. r3 is test-only; no new architectural decisions. No ADR number was assigned and picking one is forbidden.

---

## Next Step

PR #281 is open. After supervisor squash-merges, the nightly mutate-core should re-run with missed=0 for game-core (origin/master 99e31fc + this slice). Remote CI is running; gates await confirmation.

**Follow-up (not a blocker, not touched by this slice):** The same nightly run 30897187833 also showed surviving mutants in the separate `mutate-server` job (server-module/src/lib.rs and battle.rs). That job is a survivor-count RATCHET (not zero-tolerance), so it did not gate, but it warrants a separate slice.
