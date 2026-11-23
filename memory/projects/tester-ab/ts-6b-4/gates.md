# Gates: ts-6b-4

Spec: M-trade-sessions.spec.md#ts-6b-4
Seed: 5e8633ecc77b6146
Seeded: 2026-11-13T16:13:06Z
Repo: project
Scope: M-trade-sessions slice ts-6b-4 (type: feature, tier: hard, game repo) per specs/monster-realm-v2/M-trade-sessions.spec.md §ts-6b-4 and its Fix-batch contract: tactical rules have one home (unit join, deploy slots, strike and AP counts); no table, reducer or generated binding change, client/src/module_bindings/ untouched. Fan-out siblings in flight: ts-6b-2 (server economy/raising/guards/pvp), ts-6b-8 (list views + i18n catalog — ts-6b-4 adds NO i18n message ids). PR lists the residual ids it closes.
Criteria: 4 seeded, 0 shall-uncaptured
Touches: game-core/src/tactics/content.rs, game-core/src/tactics/content_tests.rs, game-core/src/tactics/mod.rs, server-module/src/tactics.rs, client-wasm/src/lib.rs, game-core/src/tactics/encounter.rs, game-core/src/tactics/encounter_tests.rs, client-wasm/src/tactics_tests.rs, client/src/tactics/wasm.ts, client/src/tactics/wasm.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/main.accel.test.ts, client/src/main.controls.test.ts, client/src/main.help.test.ts, client/src/main.input.test.ts, client/src/main.reconnectStack.test.ts, client/src/tactics/clock.ts, client/src/tactics/clock.test.ts, client/src/tactics/hud.ts, client/src/tactics/hud.test.ts, client/src/tactics/tacticsBattle.ts, server-module/src/tactics_tests.rs

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-4.1: WHEN a `battle_unit` row is joined into a `TacticalUnit`, THE SERVER and THE CLIENT SHALL build its `UnitKit` through the one game-core function — closes `R-bt-11-SHAREDJOIN` (`unit_kit_joins_species_affinity_and_kit_moves_with_the_row_level_and_stats` in `game-core/src/tactics/content_tests.rs`; the unit-join comparison in `client-wasm/src/tactics_tests.rs` is re-pointed from its hand-written copy to the game-core function, and a case in `server-module/src/tactics_tests.rs` holds `TacticsContent::unit_kit` equal to it for a content species).
      CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p game-core -p client-wasm -p monster-realm-module --run-ignored all -E 'test(=tactics::content_tests::unit_kit_joins_species_affinity_and_kit_moves_with_the_row_level_and_stats) + test(=tactics_tests::bt11_unit_join) + test(=tactics::tactics_tests::unit_kit_of_a_content_species_equals_the_game_core_join)' 2>&1
      EXPECT: / 3 tests run: 3 passed/
      EVIDENCE: pending

- [ ] ts-6b-4.2: WHEN the client sizes a deploy panel, THE CLIENT SHALL use the game-core deploy slot count the server enforces for that map — closes `R-bt-12-DEPLOYCAP` (`deploy_slots_is_the_pack_cap_bounded_by_the_side_a_spawns` in `game-core/src/tactics/encounter_tests.rs`; a host test in `client-wasm/src/tactics_tests.rs` that the export equals it for every content map; a `client/src/main.dispatch.test.ts` case that the deploy panel offers as many slots as the export answers).
      CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p game-core -p client-wasm --run-ignored all -E 'test(=tactics::encounter_tests::deploy_slots_is_the_pack_cap_bounded_by_the_side_a_spawns) + test(=tactics_tests::deploy_slots_export_equals_game_core_for_every_content_map)' 2>&1 | tail -3 && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/main.dispatch.test.ts -t 'ts-6b-4.2' 2>&1
      EXPECT: /\b2 tests run: 2 passed\b[\s\S]*Tests\s+1 passed \| \d+ skipped/
      EVIDENCE: pending

- [ ] ts-6b-4.3: WHEN the PvP strike pips are painted, THE CLIENT SHALL draw as many pips as the loaded tuning's `autopass_forfeit` — closes `R-bt-15-STRIKESMAX` (`tuning_out_carries_autopass_forfeit` in `client-wasm/src/tactics_tests.rs`; a `client/src/tactics/clock.test.ts` case that a view model built with seven strikes paints seven pips).
      CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p client-wasm --run-ignored all -E 'test(=tactics_tests::tuning_out_carries_autopass_forfeit)' 2>&1 | tail -3 && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/tactics/clock.test.ts src/main.dispatch.test.ts -t 'ts-6b-4.3' 2>&1
      EXPECT: /\b1 test run: 1 passed\b[\s\S]*Tests\s+2 passed \| \d+ skipped/
      EVIDENCE: pending

- [ ] ts-6b-4.4: WHEN the active unit's AP pips are drawn, THE CLIENT SHALL draw the tuning's turn AP as read through the rules port — closes `R-bt-10-APPIPSMIRROR` (`the active row draws apMax pips from its input` in `client/src/tactics/hud.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/tactics/hud.test.ts src/tactics/tacticsBattle.test.ts -t 'ts-6b-4.4' 2>&1
      EXPECT: /Tests\s+2 passed \| \d+ skipped/
      EVIDENCE: pending
