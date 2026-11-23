# Gates: ts-6b-6
Spec: M-trade-sessions.spec.md#ts-6b-6
Seed: 7156e44865519775
Seeded: 2026-11-13T18:06:07Z
Repo: project
Scope: M-trade-sessions slice ts-6b-6 (type: feature, tier: routine, game repo) per specs/monster-realm-v2/M-trade-sessions.spec.md §ts-6b-6 and its Fix-batch contract: tactical settlement and wild AI — tests on unreached protected paths, and the dead 1v1 helpers (deletion rule in standards/testing-tdd.md applies to any removed helper/test). Fan-out siblings launched this tick: ts-6b-3 (server economy/inventory/npc), ts-6b-5 (client pointer/controller reach, main.ts), ts-6b-6 (tactical settle/AI tests, marshal, content_cache), tp-5 (harness repo) — all file-disjoint (mr-disjoint SAFE). None of the game-repo siblings adds i18n message ids or tables/columns/reducer signatures unless its spec says so. PR lists the residual ids it closes.
Criteria: 3 seeded, 0 shall-uncaptured
Touches: server-module/src/tactics_settle_tests.rs, game-core/src/tactics/ai_tests.rs, server-module/src/marshal.rs, server-module/src/marshal_tests.rs, server-module/src/content_cache.rs, server-module/src/content_cache_tests.rs, docs/DECISIONS.md

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-6.1: WHEN a tactical win levels up a party monster, THE SERVER SHALL recompute its stats, apply the level-up heal and run the evolution check, and IF the HP write-back failed it SHALL apply no faint penalty — closes `R-bt-17-SETTLEFAILPATHS` (`a_tactical_win_that_levels_a_monster_up_recomputes_stats_heals_and_auto_evolves` and `a_failed_write_back_with_a_fainted_member_adds_no_unfavorable_trust` in `server-module/src/tactics_settle_tests.rs`, each watched failing once against a local break of the path it covers).
  CHECK: cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=tactics_settle::tactics_settle_tests::a_tactical_win_that_levels_a_monster_up_recomputes_stats_heals_and_auto_evolves) | test(=tactics_settle::tactics_settle_tests::a_failed_write_back_with_a_fainted_member_adds_no_unfavorable_trust)'
  EXPECT: /Summary \[[^\]]*\] 2 tests run: 2 passed, [0-9]+ skipped/
  EVIDENCE: pending

- [ ] ts-6b-6.2: WHEN a Territorial wild has several attack tiles in reach, THE SYSTEM SHALL plan the attack from the cheapest tile, never the tile farthest from the player — closes `R-bt-4-TERRITORIALTILE` (`a_territorial_ranged_wild_attacks_from_the_cheapest_tile_not_the_farthest` in `game-core/src/tactics/ai_tests.rs`, watched failing once with Territorial added to the farthest-tile stances).
  CHECK: cargo nextest run -p game-core --run-ignored all -E 'test(=tactics::ai_tests::a_territorial_ranged_wild_attacks_from_the_cheapest_tile_not_the_farthest)'
  EXPECT: /Summary \[[^\]]*\] 1 test run: 1 passed, [0-9]+ skipped/
  EVIDENCE: pending

- [ ] ts-6b-6.3: THE server module SHALL contain no 1v1 marshaling or content-cache helper that only tests call — closes `R-bt-17-MARSHALTESTONLY` (`cargo nextest run -p monster-realm-module` and clippy pass after the deletion; `marshal_tests.rs` and `content_cache_tests.rs` keep their live-helper cases, and the PR lists each deleted test with its reason).
  CHECK: cargo clippy -p monster-realm-module --all-targets --all-features -q -- -D warnings && cargo nextest run -p monster-realm-module --run-ignored all --status-level fail --final-status-level fail && git grep -nE 'fn (wild_battle_monster|build_ability_store|battle_monster_from_row|skill_defs_from_rows|type_chart_from_rows|cached_skills|cached_abilities|type_chart_cache_lookup)[^a-z_]|TypeChartCell|static (SKILLS|ABILITIES)[^A-Z_]' -- server-module/src/marshal.rs server-module/src/content_cache.rs | wc -l
  EXPECT: /^0$/
  EVIDENCE: pending
