---
name: fix-nightly-mutants-r3-plan
description: fix-nightly-mutants-r3 PLAN — kill 2 EG1 mutants with tests; bless the 3rd (contingent equivalence) with a self-expiring exclusion
metadata:
  type: project
---

# fix-nightly-mutants-r3 — PLAN (phase-1 checkpoint)

**Branch:** `fix/fix-nightly-mutants-r3` · worktree `.claude/worktrees/fix-nightly-mutants-r3` (from `origin/master` 99e31fc)
**ADR:** none assigned (pass-vars `adr: ""`) — and none needed (see D1 rationale)

## The 3 nightly survivors (run 30897187833, `just mutate-core`, 1137 mutants)

1. `game-core/src/content.rs:624:5: replace load_evolution_paths -> Result<Vec<EvolutionPath>, String> with Ok(vec![])`
2. `game-core/src/content.rs:1041:47: replace == with != in validate_evolution_paths` (rule R6)
3. `game-core/src/evolution/eligibility.rs:125:64: replace < with <= in unmet_requirement` (essence first-unmet)

## D1 — mutant #1 is EQUIVALENT (contingently). Proof (planner + red-team, independently)

`game-core/build.rs:23-37` globs `content/evolution_paths/*.ron` into `EVOLUTION_PATHS_RON_PARTS`
(no cfg/feature branch, panics if the dir is empty). That dir holds exactly one file,
`000-core.ron`, whose payload is `[]` — DELIBERATELY empty until slice EG3 authors the graph
(EG1-10 / ADR-0174 D6 require R1-R12 runnable against the empty set). `load_evolution_paths`
(`content.rs:623-625`) is a nullary pure delegate to `parse_parts` (`content.rs:289-300`), which
returns `Ok(vec![])` for that single point. The mutant is byte-identical. No test can alter a
build-time constant → no in-scope kill exists. No doctests anywhere in the file. Rejected
alternatives: assert-equals-parse (both empty), fixture `.ron` (build.rs globs the whole dir → it
would SHIP), test-only cargo feature (production edit), `#[mutants::skip]` (new dep + production
edit), authoring a real edge (that is EG3).

**Non-obvious:** this is NOT the same category as the 3 already-blessed exclusions, which are
equivalent *permanently, by construction*. This one becomes killable the day EG3 lands one edge —
and a line-pinned `exclude_re` is keyed to CODE location, so it would silently suppress a real
mutant forever. Hence the exclusion must be **self-expiring**, enforced mechanically.

Also non-obvious (red-team): `eg1_live_registries_pass_validate_evolution_paths`
(`content.rs:3113-3124`) will NOT start killing it when EG3 lands — an empty path set and a valid
non-empty graph both validate `Ok(())` (the R10 empty-set carve-out, `content.rs:1080-1096`).

## Work items

### W1 — R6 entry-set teeth (`game-core/src/content.rs`, inline `#[cfg(test)]`, after `:3397`)
Why #2 survives: the only R6 test `r6_to_species_in_an_encounter_table_rejected` (`:3386-3397`)
uses `eg1_encounters(0, &[1, 2])`; under `!=` the FIRST entry (`1 != 2`) already fires the same
R6 `Err` (the message interpolates `path.to_species`, never the matched entry), so `expect_err`
still passes. Every other `validate_evolution_paths` test passes `encounters = &[]`.
- **W1a (primary, positive)** `r6_a_wild_catchable_base_form_is_accepted` — `eg1_valid_world()`
  (species 1 tier 0, species 2 tier 1, edge 1→2) + `eg1_encounters(0, &[1])` + items `&[]` →
  `assert_eq!(validate_evolution_paths(..), Ok(()))`. Under `!=`: `any(1 != 2)` → `Err` → fails.
- **W1b (secondary, negative)** table containing ONLY the target species (`eg1_encounters(0, &[2])`)
  → `expect_err` + `starts_with("R6:")`. Under `!=`: `any(2 != 2)` false → `Ok(())` → fails.
- REQUIRED preconditions (else vacuous under both operators): `paths` non-empty; the encounter
  `Vec` non-empty AND at least one table's `.entries` non-empty (`eg1_encounters(z, &[])` is the
  trap); baseline must be genuinely `Ok(())`. Do NOT edit the existing R6 test.

### W2 — essence first-unmet boundary teeth (`game-core/src/evolution/m10a_gating_tests.rs`, after `:593`)
`eligibility.rs` has NO inline test module (file ends `:238`); `m10a_gating_tests.rs` is its
declared sibling test file (`evolution/mod.rs:23-24`) and already imports the helpers.
Why #3 survives: every existing essence fixture is SINGLE-entry (`five_gate_path` `:314`), so `<`
and `<=` select the same entry. `essence_gate_met` (`:55-59`) uses a separate `>=` and is not the
mutated line; `<=` matches a superset of `<`, so `.expect()` at `:126` can never panic — the mutant
only changes WHICH entry is named. `unmet_requirement_agrees_with_path_satisfied` (`:467-511`)
compares only `is_none()` → structurally cannot kill it. Only a MESSAGE-CONTENT assertion bites.
- Fixture: `path.essence = vec![req(Fire, 100), req(Water, 75)]`; `essence[Fire] = 100` (EXACTLY at
  threshold → met), `essence[Water] = 74` (strictly unmet); level 50 vs min 1; trust/QT/nutrition
  `None`. `<` → names Water/75; `<=` → names Fire/100.
- Assertions: reuse `assert_unmet_names` (`:433-456`, case-insensitive contains) with
  `["essence","water","75"]`, PLUS an explicit `!msg.to_lowercase().contains("fire")`.
- Keep thresholds 100/75/74/99 — avoid substring collisions (never 100 vs 10).
- Add an anchor sub-case (`essence[Fire]=99`, `[Water]=75`) pinning "first in LIST order".

### W3 — blessed exclusion #4 for mutant #1, made SELF-EXPIRING
`.cargo/mutants.toml`: add a 4th line-pinned `exclude_re` entry with the contingency spelled out.
`evals/mutate-core-recipe-integrity.eval.mjs`: bump the hard pin 3 → 4 (`quoteCount !== 8`),
add the entry-4 fragment check, update `CANONICAL_MUTANTS_TOML`, rebuild TEETH 8 (four → five
entries) and the TEETH 14/15 messages, and add NEW teeth for:
  - entry-4 present ⇒ the `content.rs` canary test exists;
  - entry-4 present ⇒ `game-core/content/evolution_paths/*.ron` is still semantically `[]`
    (strip `//` line comments, trim → must equal `[]`). **This is the self-expiry:** the instant
    EG3 authors one edge the EVAL goes red, forcing removal of the exclusion, at which point the
    mutant is killable by an ordinary non-emptiness test.
`game-core/src/content.rs`: canary test `eg1_load_evolution_paths_is_empty_pending_eg3` asserting
the loaded registry is empty, doc-commented with exactly what to delete when EG3 lands.

**touches-delta (out of the declared 2-file set):**
`game-core/src/evolution/m10a_gating_tests.rs` (sibling test file — ALWAYS-in-scope companion),
`.cargo/mutants.toml`, `evals/mutate-core-recipe-integrity.eval.mjs`.
Justified: the supervisor's own brief pre-authorises a mutants.toml exclusion *with* justification,
and the r1 slice set the precedent (entries 2→3 + the same eval surgery). Collision risk verified
NIL: no open PRs, no other worktrees, EG2/EG3 staged-but-NOT-launched (blocked on green master).
No ADR: entries 1-3 were added under ADR-0088 §Decision 2 without new ADRs; r1 likewise shipped
ADR-none. No ADR number was assigned to this slice and picking one is forbidden.

## Anti-patterns to avoid
"does not panic"/`is_ok()`-only assertions (#3 never panics, #1 never errors) · exact-punctuation
message asserts · assertions that hold under the mutation (the #2 trap) · single-entry essence
fixtures · widening the 324-cell grid at `m10a_gating_tests.rs:481-510` (can't observe the message,
costs runtime × 1137 mutants) · editing the existing R6 test instead of adding one · threshold
numbers that substring-collide.

## Proof of teeth (evidence for the PR)
Per test: hand-apply the mutation, run `cargo test -p game-core`, record that the NEW test fails
while the pre-existing ones still pass (that last part is the evidence of WHY the mutant survived),
then revert. Finally the authoritative
`cargo mutants -p game-core --file game-core/src/content.rs --file game-core/src/evolution/eligibility.rs`
→ expect 0 missed. Then the full `just ci` once, pre-PR.

## Gates
`export PATH="$HOME/.asdf/installs/nodejs/24.13.1/bin:$HOME/.asdf/shims:$HOME/.cargo/bin:$PATH"`,
`cd` explicitly in every command (cwd resets between turns), `cd client && npm install --include=dev`
once before any vitest/tsc/biome run.
