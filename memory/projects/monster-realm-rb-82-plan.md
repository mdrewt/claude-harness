# rb-82 plan — two factually-wrong .ron content comments (R-17r-e-B1)

Triage: SIMPLE (content/comment fix + one Rust test file). Light routing: no planner
subagent; tester (sonnet) writes the test; orchestrator fixes comments; reviewer +
verifier lenses (CONTENT tier).

## Findings during scope verification
1. `evals/content-version.eval.mjs` contains NO comment-truth check (only TEETH A/B
   + hash/version coupling). The spec's "delete the now-redundant portion" premise is
   false — nothing to delete; eval left untouched.
2. HIDDEN DEPENDENCY (STOP class): that eval SHA-256s raw bytes of game-core/content/**,
   so a comment-only .ron edit reds CI unless `server-module/src/lib.rs` CONTENT_VERSION
   is bumped AND `evals/baselines/content-hash.json` regenerated. Both are OUTSIDE the
   declared touches (070-wave3.ron, 071-wave3-derived.ron, content-version.eval.mjs).
   This is exactly why 17r-e deferred B1. Supervisor must add those two files to
   touches: (also `game-core/tests/rb82_ron_comment_claims.rs`, the mandated Rust test).

## Test design (game-core/tests/rb82_ron_comment_claims.rs — integration test, no mod wiring)
- Claim 1: the sentence in species/070-wave3.ron containing "Electric resists" names a
  roster of affinities (+ "its own mirror"/"itself" == Electric). Data roster = attackers
  with effectiveness < 10 vs defender Electric from `load_type_chart()` → {Electric, Water}.
  Assert stated roster == data roster. Original comment ("nothing but its own mirror")
  → {Electric} → RED.
- Claim 2: the sentence in species/071-wave3-derived.ron containing "Regeneration"
  names species; data roster = species whose `ability == Some(id of "Regeneration"
  in load_abilities())` from `load_species()` → {Sproutlet, Stoneward, Tempestrix}.
  Assert stated roster == data roster and no sole-ownership verb ("owns"). Original
  → {Tempestrix} → RED.
- Teeth: synthetic comment strings + synthetic parsed data (never mutate shipped content).

## Fix
- 070-wave3.ron:17 → "Electric resists only Water and its own mirror, so ..."
- 071-wave3-derived.ron:36 → "Sproutlet, Stoneward and Tempestrix already share the
  Regeneration pivot, and a fourth copy would make the two walls interchangeable."

## Gates ledger: 0 seeded criteria (spec section has no ids) — nothing to fill.
