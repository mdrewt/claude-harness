# rb-137 tester brief — export `battle_summary` and `player_formation`

You write the RED tests for slice rb-137 from its EARS criteria; you do not implement. The
orchestrator runs every test you write (you have no shell) and proves each new gating test
fails on the real defect (no exporter) before implementation. Verification rules:
`~/.claude/harness/standards/testing-tdd.md` (behaviour, not source text; no test of a test).

Worktree (edit ONLY here): /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-137
Spec: /home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/residuals.spec.md lines 18-43.
Plan (contracts + adjudicated red-team findings): /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-rb-137-plan.md

## EARS (the gates)
- rb-137.1: WHEN a player who fought a battle requests a data export, THE bundle SHALL contain
  that battle's `battle_summary` row, and SHALL NOT contain a summary row for a battle the
  player was not in.
- rb-137.2: WHEN a player with a saved formation requests a data export, THE bundle SHALL
  contain their `player_formation` row and no other player's.
Spec detail: the summary's OTHER participant is treated as the existing `battle` exporter
treats it (`json_battle`, privacy.rs ~1058-1138: the other side's identity and its per-side
data are the JSON null literal; a practice battle is wholly owned; a row on neither side is a
loud Err).

## Contracts (what the implementation will provide; all private fns in privacy.rs, reached from
privacy_tests.rs as `super::…`, exactly as `super::json_battle` is today)
- `fn json_battle_summary(row: &BattleSummary, me: Identity) -> Result<String, String>`
  - Neither side is `me` → `Err("export_summary_row_not_own".to_string())`.
  - Otherwise one compact JSON object, EVERY column of `crate::schema::BattleSummary` in
    declaration order (schema.rs ~1453-1490), encodings per the file's contract (u64 → quoted
    decimal string; u32/u16/u8 → bare; bool; `Vec<u32>` → array of bare numbers; enums by
    variant NAME as a string; `Option` None → null):
    battle_id (quoted) · player_identity · opponent_identity · kind (`Wild`|`Pvp`|`Practice`) ·
    outcome (`Ongoing`|`SideAWins`|`SideBWins`|`Fled`) · rounds (bare) · wall_ms (quoted) ·
    idle_ms_a (quoted) · idle_ms_b (quoted) · windows_histogram (array of bare) · autopasses ·
    recruit_attempts · recruit_successes (bare) · weaken_first (bool) · items_used (bare) ·
    damage_dealt_a (bare) · damage_dealt_b (bare) · hits · misses · unit_turns_prequeued ·
    unit_turns_live · halted_plans · se_kos_after_r1 · kos_after_r1 (bare) · end_how (the
    `EndHow` variant name, or null).
  - REDACTION: side A = `player_identity`, `idle_ms_a`, `damage_dealt_a`; side B =
    `opponent_identity`, `idle_ms_b`, `damage_dealt_b`. A side `me` does not hold renders all
    three of its columns as null (identity included — so a wild row's ZERO opponent and a
    tombstoned side are null too). Practice (`me` on both) → nothing redacted. Every other
    column is battle-wide and always emitted (why: plan, "Plan review — red-team").
- `fn json_player_formation(row: &PlayerFormation) -> String` →
  `{"owner_identity":"<hex>","monster_ids":["<u64>",…]}` (ids quoted, u64 rule; empty → `[]`).
- `fn rows_battle_summary(ctx: &ReducerContext, owner: Identity) -> Result<Vec<String>, String>`
  reads `battle_summary` through its `player_identity` AND `opponent_identity` btree indexes
  (the `rows_battle` chain idiom; a practice row arrives exactly once).
- `fn rows_player_formation(ctx: &ReducerContext, owner: Identity) -> Result<Vec<String>, String>`
  reads `player_formation` by its `owner_identity` primary key.
- Chunk `table_name`s: `battle_summary`, `player_formation`. Both manifest entries become
  `exportable: true` (schema.rs `DATA_LIFECYCLE_MANIFEST`), so the exportable set grows 18 → 20
  and `EXPORTERS` follows manifest order (formation after `battle_action`, before
  `player_handle`; summary after `battle`, before `character`).
- Native host (`server-module/src/native_host_tests.rs`): register `battle_summary` on BOTH
  `player_identity` and `opponent_identity` (`fx.table::<BattleSummary>(…)`), and
  `player_formation` on `owner_identity` (`fx.table::<PlayerFormation>(…)`, `.unique()` as
  accounts_tests.rs ~5555 does). Precedent world: `ih1_export_world` (privacy_tests.rs ~8797)
  and `an_export_holds_the_callers_handle_and_no_other_identitys_ih1_8` (~8889), which run the
  SHIPPED `request_data_export` via `fx.run_as_at`. An index no fixture registered reads EMPTY,
  so register both summary indexes or a broken second-column read passes as "no rows".

## Gating tests to write (append a new section at the END of server-module/src/privacy_tests.rs)
EXACTLY two tests whose names end `_rb137_1` and EXACTLY two ending `_rb137_2` (the ledger
CHECK counts them; any helper fns must not be `#[test]`):
1. `…_rb137_1` serializer: exact JSON equality (build expectations with the file's `m22s4_*`
   helpers) for side A, side B and practice; Neither → the Err above; every column carries a
   DISTINCT value (idle_ms_a ≠ idle_ms_b, damage_dealt_a ≠ damage_dealt_b, all counters
   distinct) so a swapped or mis-sided redaction fails; u64 values past 2^53; each enum a
   NON-first variant; one case with `end_how: Some(non-first)` and one with `None`; a
   `windows_histogram` of ≥2 elements; well-formedness via `m22s4_json_is_wellformed`. Build
   every `BattleSummary` as an EXHAUSTIVE struct literal (no `..`), so a new column is a compile
   error here (the file's X1 posture).
2. `…_rb137_1` behavioural, through `request_data_export` on the native host: the caller is
   side A of one PvP battle, side B (only) of another, both sides of a practice battle, side A
   of a wild battle (opponent `Identity::ZERO`), and side B of a battle whose side A was
   tombstoned (`crate::TOMBSTONE_IDENTITY`); strangers: a stranger-vs-stranger row, a
   stranger's wild row, a stranger-vs-tombstone row. The caller's bundle has exactly ONE
   `battle_summary` chunk holding exactly the caller's five rows, each once, each the exact
   expected redacted JSON; the stranger rows are absent; NO chunk of the whole bundle contains
   a stranger's identity hex or a stranger-only battle id; the tombstone renders as null, never
   as its hex. Also: a second caller with no summary rows gets one `battle_summary` chunk with an
   empty rows array.
3. `…_rb137_2` serializer: exact JSON for a formation with several ids (one past 2^53) and for
   an empty `monster_ids`.
4. `…_rb137_2` behavioural: caller and a stranger each hold a formation, the stranger's ids
   OVERLAPPING the caller's (so a reader keyed on ids, not owner, fails); the caller's bundle
   has exactly one `player_formation` chunk holding exactly the caller's row; no chunk names the
   stranger's identity or a stranger-only id; a caller with no formation gets one empty-rows
   chunk.

## Existing tests the spec change invalidates — re-derive from the spec, never from code
- privacy_tests.rs `m22s4_exporter_set_equals_manifest_both_directions` (~2137): floor 18 → 20,
  prose (thirteen-plus-one erase → fourteen erase incl. player_handle + player_formation; four
  → five anonymize incl. battle_summary; plus character).
- privacy_tests.rs `rb111_one_tick_reaps_fifteen_whole_bundles_from_a_same_millisecond_burst`
  (~7954): min bundle 20 → a 256-row window over 18 minimum bundles (360 rows) covers twelve
  whole (240) + 16 rows of the thirteenth = 13 stamps (< 16 cap, < 18 bundles), 13 x 20 = 260
  reaped, 5 survivors (100 rows); re-derive every number and its prose; rename to
  `…_thirteen_…` (the player_handle slice renamed sixteen → fifteen the same way) and fix the
  doc-comment cross-reference at ~7929-7936.
- privacy_tests.rs `rb115_one_tick_reports_due_beside_planned_on_capped_and_exact_windows`
  (~8597): the pin becomes (256, 16, 20); the four populations are hand-sized and their
  expected tuples do not move; re-derive the prose (sixteen minimum bundles = 320 rows; a
  minimum-bundle window holds at most thirteen stamps; B's seventeen-row bundles are now three
  rows short of the minimum).
- server-module/src/accounts_tests.rs (widened into this slice):
  `data_lifecycle_export_scope_structurally_narrower` (~1086: the 20-set, prose);
  `tactical_manifest_entries_are_classified_and_never_exported_bt7_4` (~4965: the eight other
  tactical tables stay `exportable: false`, `battle_summary` and `player_formation` are
  `exportable: true`, the 20-set; rename it if its name no longer states its claim);
  `acct_export_chunks_carry_exactly_the_callers_rows_per_table` (~9266: its final clause
  requires a case for every exportable table — seed summary rows (a→b, b→a, a→a, b→c, the
  existing dual-column pattern) and formations for a and b in its world (`w.summary`,
  `w.formation`, ~5214) and add the two cases).
- evals/account-e2e.eval.mjs `M22S9_MANIFEST_TRANSCRIPTION` (~128): flip
  `battle_summary:Anonymize:opponent_identity+player_identity:0` and
  `player_formation:Erase:owner_identity:0` to `:1`. Check the S9 seed comments (~100-170,
  ~2566-2585) still hold: A is never on both summary columns of one row in S9.

## Report back (separately from the tests)
- Every test you added or changed, by name, with the one-line defect each assertion kills.
- DEFECTS you found in the shipped code, and QUESTIONS about the contract. Do not weaken a
  contract clause to make a test easier.
