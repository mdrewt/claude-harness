# rw3c plan — obtainability + tuning (roster wave 3)

Slice: `M-postgate-roster-wave-3` / rw3c. Branch `slice/rw3c`, worktree
`projects/monster-realm/.claude/worktrees/rw3c` from `origin/master` @ ee2e093.

## D1 — placement goes in ZONE 1, not zone 0

The slice brief's prose says "zone-0 encounter table". That is mechanically impossible:
`game-core/tests/pt_d3_tuning.rs::pt_d3_2_zone0_table_is_byte_identical_to_the_pre_tuning_shape`
pins zone 0's `encounter_rate` AND its exact 3-entry vector, and separately asserts no species
outside {1,2,3} is eligible at player levels 1..=14. `evals/rw3b-roster-wave-3.eval.mjs` pins it
independently. RW3-07 says byte-identical. Zone 1 "Tideglass Cove" is also the design-correct home:
it is documented as carrying the full wild-legal roster, its bands run to 20, and its weights are
declared unpinned tuning data. Edit the EXISTING zone-1 tuple (spec anti-pattern 5 forbids a second
`zone_id` tuple in a new part file). Disclosed as a reasoned deviation in the PR body.

## D2 — the two new zone-1 entries (appended after the existing seven)

    (species_id: 40, weight: 6,  min_level: 10, max_level: 19),   # Voltkit, Electric, uncommon
    (species_id: 42, weight: 4,  min_level: 11, max_level: 20),   # Aurelet, Light, rare

Weights reuse existing tier values (6 = species 8's uncommon tier, 4 = species 3's rare tier).
**Invariant adopted:** each entry's `max_level` is strictly below its species' lowest outgoing
evolution-edge `min_level` (gates are 20 and 22), because ADR-0176 D2 auto-evolution fires
immediately when exactly one path is eligible and each wave-3 base form has exactly one outgoing
edge — a band reaching the gate would ship wild catches that evolve on the spot, so the player never
obtains the tier-0 form RW3-06 promises.

## D3 — two pre-existing exact pins go RED; extend field-for-field, never weaken

`game-core/tests/pt_d3_tuning.rs:285` (`{1,2,3,7,8,20,21}` set EQUALITY) -> add 40, 42.
`game-core/tests/pt_d3_tuning.rs:373` (`levels_by_species.len() == 7`) -> 9.
Superset/`>=` forms are rejected: the pins exist so a smuggled derived form bites.
`pt_d3_tuning.rs` is OUTSIDE declared touches and RW3-08 forbids it => DEFER RW3-08, disclose under
`touches-delta:`, prove the substance with a separate git-diff gate. Second slice to hit this wall;
residual `R-rw3b-X8` (reword RW3-08) already open.

## D4 — gates

New, self-contained (helpers COPIED from `evals/rw3b-roster-wave-3.eval.mjs`, never imported, so the
two gates cannot red each other): `game-core/tests/rw3c_wave3_tuning.rs` and
`evals/rw3c-wave-3-tuning.eval.mjs`. Every predicate factored pure and bitten by a synthetic
counterexample with a paired GOOD fixture; never mutate shipped RON.

## D5 — ordering

1. edit the RON; 2. extend the pt_d3 pins; 3. bump `server-module/src/lib.rs:74` 20 -> 21 (ONE line);
4. regenerate `evals/baselines/content-hash.json` LAST, via the eval's own exported generator
(`hashContentDir` + `readContentVersion` from `evals/content-version.eval.mjs`) — never hand-merged.
NOTE: the `--update` flag the eval's own error message advertises DOES NOT EXIST (no argv handling in
`evals/content-version.eval.mjs`); follow-up flag, that file is outside this slice's touches.
5. author the gates RED-first; 6. `just ci` with the explicit PATH export.

## D6 — docs

`ARCHITECTURE.md` one-line wild-legal count fix. No new ADR (none assigned; ADR-0204 records the
wave's decisions). No `CHANGELOG.md` hand-edit. No `docs/knowledge/**` regen (no schema.rs touch).
