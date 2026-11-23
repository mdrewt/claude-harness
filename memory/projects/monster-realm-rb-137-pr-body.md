A player's data export now includes their `battle_summary` rows and their `player_formation` row (operator-approved, monster-realm#755). Both are read with owner-keyed index queries on the existing tables. There is no schema change: no column, index, table or view moves, and the regenerated bindings are unchanged (`bindings-drift` PASS).

## What changed

- **`privacy.rs`**
  - `rows_battle_summary` reads through `battle_summary`'s `player_identity` and `opponent_identity` indexes. It uses the `rows_battle` chain idiom, so a practice row (the caller on both sides) arrives once.
  - `json_battle_summary` emits every column in declaration order and redacts the other side the way `json_battle` does. The other side's identity, `idle_ms_*` and `damage_dealt_*` become `null`. A practice row is exported whole. A row on neither side is a loud `Err(export_summary_row_not_own)`.
  - The battle-wide counters are emitted. In PvP and Practice they sum both sides (`is_player_owned`). Each one changes only when a step executes or the battle closes, and the facts behind it are already visible to participants through `my_battle_events`, `my_tactical_battle` and `my_battle_clock`. A waiting plan moves none of them, so a mid-battle export reveals no READY plan (design §6.3).
  - `rows_player_formation` reads by the `owner_identity` primary key, and `json_player_formation` emits `{owner_identity, monster_ids}`.
  - New encoders: `BattleKind`, `BattleOutcome` and `EndHow` (exhaustive, no wildcard, `stringify!` names), a bare-number `u32` array, and `Option<u64>` / `Option<u32>`. `battle_side_of` now delegates to a shared `side_ownership(me, a, b)`.
  - `EXPORTERS` gains both readers in manifest order. `EXPORT_MIN_BUNDLE_ROWS` is derived, so it moves from 18 to 20.
  - The arithmetic comments are re-derived: 16 × 20 = 320 ≥ 256; a read window over minimum-size bundles holds twelve whole bundles plus one straddler; a full drain over minimum-size bundles takes about 165 ticks.
- **`schema.rs`:** both `DATA_LIFECYCLE_MANIFEST` entries flip to `exportable: true` with updated `basis` text. The `BattleSummary` and `PlayerFormation` doc comments now say what the export carries and when a summary row is inserted.
- **Tests (tester-written):**
  - Four gating tests in `privacy_tests.rs`, two per gate (`*_rb137_1`, `*_rb137_2`).
  - Pins re-derived for 18 → 20, from the spec:
    - `privacy_tests.rs`: `m22s4_exporter_set_equals_manifest_both_directions`; `rb111_…` renamed from fifteen to `…_thirteen_whole_bundles_…`; `rb115_…`; the rb132 message; rb107/rb109 labels.
    - `accounts_tests.rs`: `data_lifecycle_export_scope_structurally_narrower`; `tactical_manifest_entries_are_classified_and_only_summary_and_formation_exported_bt7_4` (renamed; it now pins each tactical table's flag exactly, eight false and two true); `acct_export_chunks_carry_exactly_the_callers_rows_per_table` (gains summary and formation cases).
  - `evals/account-e2e.eval.mjs`: the transcription flips both tables to `:1`.
- **`docs/DECISIONS.md`**
  - "Tactical battle privacy is structural, and tactical rows are not exportable" is superseded in place as "… ; only the summary and the formation are exported". The title prefix is kept for the two citations. The entry gives the redaction rule, the reason the whole-battle counters are safe, and what is ruled out: an exporter for any other tactical table, exporting the other side's columns, and a summary column that moves while a plan waits unless the export redacts it.
  - The `battle_summary` cap entry drops its rules-out clause "exporting the table (it stays not exportable)", which is now false.
  - "Account deletion and data export" gains the launch condition: a configured real sign-in issuer (`ALLOWED_ISSUERS`) is required for the official server. The anonymous tier's sybil exposure (R-rb-132-WALLETSYBIL) is accepted until then (monster-realm#757).
- **`ARCHITECTURE.md`:** "none is exportable" now names the two exceptions.

## Acceptance
Acceptance: 2/2 met, 0 deferred, 0 unmet — rb-137 seed:d673445b48c1e180

- **rb-137.1:** `cargo nextest run -p monster-realm-module -E 'test(/_rb137_1$/)'` → `2 tests run: 2 passed`.
  - Serializer: exact JSON for side A, side B, practice, and an empty histogram. Neither side → Err. Every enum is checked through all of its variants.
  - Behaviour, through the shipped `request_data_export` on the native host with both summary indexes registered: the caller is side A of a PvP battle, side B of another, both sides of a practice battle, side A of a wild battle (opponent `ZERO`), and side B of a battle whose other side is tombstoned. Stranger rows are interleaved.
  - The bundle holds exactly the caller's five rows, each once and each redacted. No chunk names a stranger, a counterparty or the tombstone hex. A caller with no summaries gets one empty chunk.
- **rb-137.2:** `cargo nextest run -p monster-realm-module -E 'test(/_rb137_2$/)'` → `2 tests run: 2 passed`.
  - The caller's formation is exported exactly. A stranger's formation shares an id with it and still never appears.
  - A caller with an empty formation gets that row; a caller with no formation gets one empty chunk.

**Red proof:** the orchestrator ran the tester's tests against contract-shaped stubs, with the manifest not flipped. 10 of 11 failed, and both behavioural gates failed on the missing chunk (`[rb137/summary-chunk] left: 0 right: 1`, `[rb137/formation-chunk] left: []`). The one test that passed carried only a message edit. Evidence: `memory/projects/gates/rb-137.red-before.md`.

**Mutants:** red-team planted 22 mutants against the gating tests. 20 died and 1 was equivalent. The one survivor, a formation reader that drops an empty `monster_ids` row, is now killed by the empty-formation case (re-checked by the orchestrator: `4 tests run: 3 passed, 1 failed`).

**Local gate:** `just ci` → `CI-EXIT=0`.
- fmt and clippy clean.
- nextest: 3392 / 3392 (workspace), 1099 / 1099 (dev_reducers), 3065 / 3065.
- 15 / 15 evals, including account-e2e: "all 26 S9 milestones asserted; export assembled: 271 chunks across 20 tables, one request, contiguous, reconciled".
- client: 245 files, 6162 / 6162.
- observability: 9 checks, 0 failed.

touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- server-module/src/accounts_tests.rs — named pins: data_lifecycle_export_scope_structurally_narrower (exact 18-table exportable set), tactical_manifest_entries_are_classified_and_never_exported_bt7_4 (asserts battle_summary/player_formation exportable:false and the 18-set) and acct_export_chunks_carry_exactly_the_callers_rows_per_table (covered == every exportable table) all red once the spec flips both manifest entries to exportable:true
- ARCHITECTURE.md — ARCHITECTURE.md:349-351 states the tactical tables are swept and 'none is exportable'; the spec's manifest flip falsifies that sentence, and docs must state current behaviour (DoD)

touches-delta: server-module/src/accounts_tests.rs, ARCHITECTURE.md (both widened above)

plan-delta:
- The two readers sit in manifest order with the other readers, not literally beside `rows_heal_cooldown`, because the `EXPORTERS` order must match the manifest (X2/order) and the file keeps the readers in that order.
- The redaction covers the other side's per-side columns (`idle_ms_*`, `damage_dealt_*`) as well as its identity. This mirrors `json_battle`, which also nulls the other side's per-side monster-id list.
- The orchestrator wrote the DECISIONS.md text rather than doc-keeper, because doc-keeper has been measured writing to the main checkout.

boyscout-delta: none

comment-scan: one flag, `docs/DECISIONS.md:1249 [id] R-rb-132-WALLETSYBIL`. Kept on purpose: the spec text for this slice names that residual as the accepted exposure, and the launch condition points to it.

## Lens results
- **Plan:**
  - The reviewer found one decisions entry the plan missed (the `battle_summary` cap rules-out line), now fixed.
  - Red-team F1, "the battle-wide counters are side-A telemetry", was rejected with evidence: `is_player_owned` = `uses_pvp_rules() || side == A`, so PvP and Practice sum both sides, and each counted fact is visible to participants.
- **Implementation:**
  - reviewer: no blocker or major. Fixed: a missed `288` figure, the four-table list in the reader banner, and the wording of the sybil exposure (it lasts as long as identities keep re-exporting, and up to 7 days after they stop).
  - red-team: no leak, abort, drop or double.
  - reducer-security-auditor: PASS.
  - verifier: PASS. Every changed pre-existing test was re-derived from the spec, and none was weakened.
  - `/simplify`: no change. The new encoders follow the file's established one-encoder-per-type pattern.
  - desync-guard: not run. No `game-core`, wasm or prediction code changed.
- **Zero or tombstone caller (red-team F2):** not reachable. `request_data_export` requires a `player` or `account` row keyed on `ctx.sender()`, and the cascade keeps those identity columns while tombstoning only `battle` and `battle_summary` columns. The new reader mirrors `rows_battle`, as the spec asks.

## Risks
- **Export cost now scales with play (MED, R-rb-137-NOTEB0AFFE).**
  - `battle_summary` is the first exportable table whose rows per player grow without a per-player bound. Only the global `BATTLE_SUMMARY_CAP` (100,000) limits it, and practice battles let one caller mint rows alone.
  - One request can serialize tens of MB under the write lock. A request refused at the second admission gate leaves no chunk, so it sets no cooldown.
  - The fix (estimate the row count before the walk, or refuse above a ceiling) refuses some subject-access requests, so it is a security-posture call. Because this slice is residual-promoted, mr-gates would not file a follow-up row. The row is therefore filed with target `wontfix` and an explicit "not declined on merit" reason, for the supervisor to re-promote.
- **No Rust-side check ties the account-e2e transcription to `schema.rs`** (spec note n1). The eval header cites two Rust tests that do not exist. The live S9 run is what verified the flags; it reconciled all 20 tables.

Items: none

not-verified:
- Remote-only CI jobs (gitleaks, cargo-audit, the Playwright e2e job) were not run locally.
- A publish-over-data proof was not run. There is no schema change, and the manifest is module code, not table data.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
