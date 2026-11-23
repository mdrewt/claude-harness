# rb-137 plan — export `battle_summary` and `player_formation`

Base: origin/master adc408a3. Branch slice/rb-137. Tier hard. No schema change (manifest
data + readers only; no column, index, table or view changes; bindings unaffected).

## Functional core / imperative shell
- PURE (privacy.rs): `json_battle_summary(row, me) -> Result<String, String>` (side-redacting,
  like `json_battle`), `json_player_formation(row) -> String`, three enum encoders
  (`BattleKind`, `BattleOutcome`, `EndHow`; exhaustive, no wildcard, `stringify!` names), a
  `json_u32_array_into` (bare numbers), and `side_ownership(me, side_a, side_b)` — the
  existing `battle_side_of` becomes a one-line delegate to it (its truth-table test unchanged).
- SHELL (privacy.rs): `rows_battle_summary(ctx, owner)` = the `rows_battle` chain idiom over
  `battle_summary.player_identity` + `opponent_identity` (trailing `player_identity != owner`
  dedup, so a practice row arrives once), each row through `json_battle_summary(&row, owner)?`;
  `rows_player_formation(ctx, owner)` = `player_formation.owner_identity().find(owner)`.
- REGISTRY: `EXPORTERS` gains both in MANIFEST order (formation after `battle_action`, before
  `player_handle`; summary after `battle`, before `character`) — X2/order requires it.
- DATA (schema.rs): both manifest entries flip to `exportable: true`, basis text updated;
  `BattleSummary`/`PlayerFormation` doc comments say they are exported. Entries stay where they
  are ("Do not re-partition").

## Redaction contract (json_battle_summary) — mirrors json_battle
Every column in declaration order. `me` holds side A (player_identity), side B
(opponent_identity), both (practice), or neither (=> `Err(export_summary_row_not_own)`, loud,
like `export_battle_row_not_own`). The OTHER side's identity column and its per-side columns
are the null literal: side A owns `player_identity`, `idle_ms_a`, `damage_dealt_a`; side B owns
`opponent_identity`, `idle_ms_b`, `damage_dealt_b`. Battle-wide columns (kind, outcome, rounds,
wall_ms, windows_histogram, autopasses, recruit_*, weaken_first, items_used, hits, misses,
unit_turns_*, halted_plans, se_kos_after_r1, kos_after_r1, end_how) are emitted: every one is
computed from transcript events both participants already read through `my_battle_events`
(tactics_settle.rs step deltas), so none reveals the §6.3 READY-plan secret. Encodings: u64 →
quoted decimal, u32/u16 → bare, bool, Vec<u32> → array of bare numbers, enums by variant name,
`end_how: None` → null. A wild battle (opponent ZERO) redacts side B like `json_battle` does.

## Derived arithmetic that moves (EXPORT_MIN_BUNDLE_ROWS 18 → 20, derived, not transcribed)
16 x 20 = 320 >= 256 still holds. A 256-row window over minimum bundles: 12 whole + 1
straddler = 13 stamps (was 15); full-store drain over minimum bundles 43008 / 260 ≈ 165 ticks
(was ≈159). privacy.rs comments at the cooldown note ("walks 18 tables"), the stamp-cap note
(18 chunks / 288 / fourteen whole) and the live-cap note (16 * 18 = 288, about 159) re-derived.
The reader-banner comment ("the two dual-column tables") becomes three.

## Tests (tester; orchestrator runs red)
NEW gating tests in server-module/src/privacy_tests.rs, names ending `_rb137_1` / `_rb137_2`:
- rb-137.1 behavioural, through the shipped `request_data_export` on the native host (the
  `ih1_export_world` precedent + `battle_summary` registered on BOTH identity indexes):
  caller as side A of one battle, side B of another, both sides of a practice battle; a
  stranger-vs-stranger summary row; caller's `battle_summary` chunk holds exactly its three
  rows once each, redacted per the contract, and no chunk names the strangers.
  Plus a pure serializer test: exact JSON for side A / side B / practice, Neither => Err,
  every enum a NON-first variant, u64 past 2^53.
- rb-137.2 behavioural: caller and stranger each hold a formation; caller's
  `player_formation` chunk is exactly its row; no chunk names the stranger's ids; a caller
  with no formation gets one empty-rows chunk. Plus exact `json_player_formation` shape.
EXISTING pins the spec change invalidates (tester re-derives from the spec, never to code):
- privacy_tests.rs `m22s4_exporter_set_equals_manifest_both_directions` (18 → 20),
  `rb111_one_tick_reaps_fifteen_whole_bundles_from_a_same_millisecond_burst` (min bundle 20:
  13 stamps, 260 reaped, 5 survivors / 100 rows; rename to `..._thirteen_...` as player_handle's
  slice renamed sixteen→fifteen; fix the citation at :7934 region if any),
  `rb115_one_tick_reports_due_beside_planned_on_capped_and_exact_windows` (pin (256,16,20);
  populations are hand-sized and their values do not move; re-derive prose).
- accounts_tests.rs (widened): `data_lifecycle_export_scope_structurally_narrower` (20-set),
  `tactical_manifest_entries_are_classified_and_never_exported_bt7_4` (8 tactical tables stay
  non-exportable; summary + formation exportable; 20-set), and
  `acct_export_chunks_carry_exactly_the_callers_rows_per_table` (covered == exportable: add
  summary + formation cases to its seeded world).
- evals/account-e2e.eval.mjs transcription: `battle_summary:...:1`, `player_formation:...:1`
  (the S9 scenario writes A's battle1 summary and A's formation organically; SQL reconcile
  sums per column, A never on both columns in S9).

## Docs
- docs/DECISIONS.md: "Tactical battle privacy is structural, and tactical rows are not
  exportable" superseded in place → "Tactical battle privacy is structural; only the summary and
  the formation are exported" (prefix kept: tactics_tests.rs:2530 and ARCHITECTURE.md:341 cite
  it). "Account deletion and data export" gains the ALLOWED_ISSUERS launch condition
  (R-rb-132-WALLETSYBIL accepted until then, #757).
- ARCHITECTURE.md:351 (widened): "none is exportable" → the two exceptions.

## Scope
touches + widened: accounts_tests.rs (3 named pins), ARCHITECTURE.md (falsified sentence).
plan-delta: exporter fns placed in manifest order with the other readers (spec said "beside
rows_heal_cooldown"; the registry must be manifest order anyway). DECISIONS text written by
the orchestrator (doc-keeper writes the main checkout — measured hazard).

## Plan review — red-team (adjudicated)
- F1 (MED, "battle-wide counters are side-A-only telemetry"): REJECTED with evidence.
  tactics.rs:851-855 builds `player_units` with game_core `is_player_owned(kind, side)` =
  `kind.uses_pvp_rules() || side == A` (game-core/src/tactics/queue.rs:397): PvP/Practice count
  BOTH sides (aggregate), Wild counts side A = the caller. The per-turn facts behind them are
  participant-visible live: live-vs-prequeued = whether `turn_state` was `Waiting(unit)`
  (my_tactical_battle) / the clock window (my_battle_clock); `PlanHalted`/`QueueVoided` are
  transcript events (my_battle_events; DECISIONS already lists QueueVoided as an accepted
  reveal). So the battle-wide columns stay emitted; the decision text says why.
- F2 (LOW, zero/tombstone caller): not reachable — request_data_export requires a `player` or
  `account` row keyed on ctx.sender(); anonymize keeps those identity columns and tombstones
  only `battle`/`battle_summary` columns; the spec says mirror `rows_battle`, which has the
  same shape. No guard; answered in the PR body.
- F3 (Ongoing-row columns 0): out of scope (tactics_settle behaviour, not export).
- F4 + the test-gaming list: folded into the tester brief (both indexes registered, B-only
  battle, practice once, a tombstoned-side row, a stranger wild row, per-column distinct
  values, non-first enum variants, end_how Some+None, whole-bundle stranger scan, overlapping
  stranger formation ids, empty-formation chunk).
