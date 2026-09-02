# m22-s3b Plan — §4.4 deletion cascade, per-module erase delegation, re-arm, PRV1-8(b)

Base: origin/master 161b04c · worktree .claude/worktrees/m22-s3b · branch slice/m22-s3b · ADR: 0228 (reserved).
Planner + researcher recon complete (2026-09-01). This memo is the orchestrator's condensed SSOT; the full
planner output is reproduced in the section "PLANNER OUTPUT" below the fold of this file's history — key
decisions restated here so a resume never re-derives them.

## Scope (10 items, all atomic — see launch brief + ADR-0225 'Consequences and S3b handoff')
1 resolve_all_live_interactions extraction (lib.rs) + TR-18 delete-from-eval + Rust port
2 per-module erase_*/anonymize_* helpers · 3 five-step cascade in account_deletion_reaper
4 PRV1-19 practice-battle single visit · 5 PRV1-8(b) terminal reset (issue #403 Option B)
6 RE-ARM (not-yet-due branch + ensure_deletion_reapers_armed sweep at init/sync_content)
7 re-pin rb24 reaper body pin (renamed rb24_deletion_reaper_body_is_pinned_cascade)
8 account_state_is_legal: KEEP debug_assert (ADR-0228 D5; no release debug-assertions, no Err promotion)
9 AUTH-13 Guard-3 terminal reason split (REJECT_ALREADY_DELETED) · 10 schema.rs:777 comment reword

## Helper map (final)
| Step | Table(s) | File | Helper |
|---|---|---|---|
| 6a | — | lib.rs | resolve_all_live_interactions(ctx, identity) — 4 calls verbatim order from lib.rs:220-232, stays IN lib.rs (pvp_tests ea_pvp_05/ptc5b_4 scan whole LIB_RS) |
| 6b | monster+monster_pub | monster_mgmt.rs | erase_monsters (both deletes in ONE fn — monster-dual-write.eval.mjs:142) |
| 6b | inventory | inventory.rs | erase_inventory (owner_identity btree) |
| 6b | player_dialogue_state+player_quest+player_conversation | npc.rs | erase_npc_state |
| 6b | heal_cooldown | raising.rs | erase_heal_cooldown (PK) |
| 6b | player_wallet | economy.rs | erase_wallet — THE one exempted .delete(; place BEFORE fn rekey_wallet (currency-integrity checkWalletZeroArgPin unbounded forward search) |
| 6b | playtest_event | playtest.rs | erase_playtest_events (.iter().filter() — no index; NOT the TTL reaper's cap) |
| 6b+6d | trade_offer(+its reaper sched) | trading.rs | erase_trade_offers — place BEFORE cancel_trades_on_disconnect (EA-REAPER-02 window ends at #[cfg(test)]) |
| 6b+6d | battle_challenge(+its reaper sched)+battle_action | pvp.rs | erase_pvp_rows (challenger AND target btree; battle_action .iter().filter()) |
| 6b | export_bundle | privacy.rs | REUSE purge_export_bundles (privacy.rs:58) — no new helper |
| 6d | character | lib.rs | erase_character_rows (player.identity→entity_id→character delete) |
| 6c | player.name+profile.name | ranking.rs | anonymize_display_names → game_core::TOMBSTONE_DISPLAY_NAME; .update ONLY (C1a bans profile delete); NOT via rekey_profile/tombstoned_profile (rb34 census + guest-sentinel confusion); avoid identifiers containing "tombstoned_profile" |
| 6c+6d | battle(+battle_wild+pvp_deadline_schedule) | battle.rs | anonymize_battles — per-row: sweep battle_wild(battle_id) + pvp_deadline_schedule(.iter().filter, no index) THEN update via pure battle_with_tombstoned_party(b, deleting, tombstone) swapping EACH matching side (practice battle = both sides, ONE update = PRV1-19). Dedup collect: player_identity().filter(owner) then opponent_identity().filter(owner).filter(b.player_identity != owner) (my_battle idiom schema.rs:423-427) |
| 6c+6e | account | accounts.rs | pure anonymized_account (auth_issuer→TOMBSTONE_AUTH_ISSUER) + terminal_account (terminal_at_ms=Some(now)); both debug_assert legality |

TOMBSTONE_IDENTITY: lib.rs beside WILD_IDENTITY(:85) = Identity::from_byte_array(game_core::TOMBSTONE_IDENTITY_BYTES); NEVER in accounts.rs ([R/identity-ctor] ban).

## Reaper body shape (frozen-pin re-derivation target)
scheduler guard → find(args.account_identity) → let now = now_ms(ctx) (ONE read) →
if !reaper_should_run_cascade(&account, now) { if let Some(req) = reaper_rearm_at_ms(&account, now) { arm_deletion_reaper(ctx, args.account_identity, req); } return Ok(()); }
→ 6a crate::resolve_all_live_interactions → 6b nine erase calls (manifest order) + purge_export_bundles →
6d erase_character_rows BEFORE 6c anonymize_display_names → battle::anonymize_battles →
6e ctx.db.account().identity().update(terminal_account(anonymized_account(account), now)) LAST → Ok(())
New pure seams: reaper_rearm_at_ms(&Account, now)->Option<i64> = Some(requested) iff PendingDeletion && !marker && !is_deletion_due (defined DIRECTLY, never !reaper_should_run_cascade — that re-arms Active/terminal rows). Loop-freedom theorem: not-due ⟹ deletion_fire_at_ms(req) > now (test it).
Re-arm fire time ALWAYS deletion_fire_at_ms(requested), NEVER now+GRACE.

## Sweep (ADR-0221 R2)
accounts.rs: ensure_deletion_reapers_armed(ctx) + pure plan_deletion_rearms(pending, already_armed)->Vec<(Identity,i64)> (mirrors plan_schedule_reconcile lib.rs:95-115; idempotent, skips armed/terminal/Active). Called from lib.rs init + sync_content beside ensure_playtest_reaper (sole-writer teeth ⇒ body in accounts.rs).

## PRV1-8(b)
provision_or_touch_account match: first Some arm `Some(existing) if account_has_terminal_marker(&existing) => update(new_account_row(ctx.sender(), issuer.to_string(), now))` (update not insert; carries NOTHING; placement AFTER i_insert guard-order pins per auth2_3). No new log-like callee with claim-tainted args (account-privacy Check G substring matcher — "login" contains "log", touch_login is the documented benign over-match; do not add new ones).

## Gating-test edits (each conscious, attributed, verifier-audited)
- rb24_deletion_reaper_body_is_frozen_noop → RENAMED rb24_deletion_reaper_body_is_pinned_cascade; re-derive frozen literal + recheck-polarity needle (now includes hoisted `now` + re-arm branch); NEW plan-authored needles BEFORE equality: resolve< first-erase; erase_character_rows< anonymize_display_names; terminal_account( once + last update; re-arm once inside not-due branch. Never containment.
- rb22_purge_called_exactly_once_in_accounts_rs (:4679) + rb22_purge_naming_budget("accounts.rs")=1 (:4906) → 2, compensating scoped pin (one call in complete_guest_claim, one in account_deletion_reaper, zero elsewhere — model: m22s4_purge_named_twice_declaration_and_call).
- auth5 :889 doc claim ("touch_login on ANY existing row") re-derived; new test for terminal-reset arm.
- economy_tests player_wallet_rows_are_never_deleted (:1766) — single-fn exemption for erase_wallet BY NAME + exact-body pin + exercised clause + keep non-vacuity clauses.
- pvp_tests ea_pvp_05 + ptc5b_4 tightened from whole-LIB_RS to resolve_all_live_interactions body scope.
- trade-reducer-security.eval.mjs: DELETE TR-18 (:8 header, :119-126 needle fn, :641-659 teeth, :1326-1336 enforcement, "17 criteria" strings :619/:1509 → 16). No other TR-18 refs exist.
- rb34_guest_claim_rekey_delegate… must stay green untouched (cascade never calls rekey_*).

## Prescribed test names (tester MUST use — gates ledger CHECKs reference them)
accounts_tests: m22s3b_resolver_body_order · m22s3b_cascade_covers_manifest (derived FROM DATA_LIFECYCLE_MANIFEST → helper-needle map) · m22s3b_anonymized_account_truth · m22s3b_terminal_account_truth · m22s3b_reaper_rearm_at_ms_truth_table · m22s3b_plan_deletion_rearms_idempotent · m22s3b_ensure_rearm_wiring · m22s3b_provision_terminal_reset_defaults · m22s3b_touch_login_scope_excludes_terminal · m22s3b_guard3_terminal_reason_distinct · rb24_deletion_reaper_body_is_pinned_cascade
trading_tests: m22s3b_resolver_extraction_chain · battle_tests: m22s3b_battle_tombstone_truth_table · m22s3b_anonymize_battles_sweeps_joins_before_swap · ranking_tests: m22s3b_deleted_name_rows · economy_tests: m22s3b_erase_wallet_sanctioned_shape

## Anti-patterns (reject on sight)
table-census resolver bundle (drops wild-battle resolve → soft-lock) · rekey_all/rekey_profile from cascade (measured bypass, rb34) · second now_ms read · now+GRACE re-arm · practice battle visited twice · hand-typed tombstones (always game_core::) · eval-scanner patching · containment-relaxed body pin · schema tweaks (no new indexes — unindexed sweeps are accepted §8.3 residual) · second playtest retention pass · profile delete · monster without monster_pub in same fn · comment hygiene in battle/raising/npc/trading (KNOWN_UNMIGRATED naive strippers: no bare quote in //-comments, no /* in comments, no contiguous // in strings)

## ADJUDICATED REVIEW DELTAS (reviewer+red-team plan pass, 2026-09-01 — BINDING on tester+implementer)
1. **reaper_rearm_at_ms None branch (B3/RT-1):** `let requested = account.deletion_requested_at_ms?;` FIRST — `(PendingDeletion, requested=None)` ⇒ None (no re-arm, fail-closed on the illegal shape). Truth table MUST include that row + the property "returned Some(r) ⇒ deletion_fire_at_ms(r) > now" tested over wall-clock-representable inputs; the i64::MAX-GRACE saturation band is documented (re-arm clamps to i64::MAX ⇒ never fires again — permanent no-op, not a hot loop), NOT tested as a universal theorem.
2. **Arm census 2→4 (B1/RT-5a):** rb24 arm-census (accounts_tests:5899-5957, expected accounts.rs=2/crate=2) reds on the re-arm + sweep. Re-derive to 4/4 WITH per-site scoped pins: exactly one arm call in delete_account's span (existing [rb24/arm-call-in-delete] holds), exactly one inside the reaper's not-due branch, exactly one inside ensure_deletion_reapers_armed, zero elsewhere; argument-list pinned per site ([rb24/arm-shape] model).
3. **Ranking census 4→5 (B2/RT-5b):** d1_scan whole-file `profile().identity().update(` count (ranking_tests:648-659) goes 4→5; bump WITH a per-fn pin anonymize_display_names==1. Helper must not use `= ctx.db.profile()`/`= ctx.db.player()` split-bindings (clause b/c + RT-17).
4. **pvp_deadline_schedule sweep moves to pvp.rs (M4):** new `pub(crate) fn disarm_pvp_deadlines(ctx, battle_id)` in pvp.rs (its sole writer), called from battle::anonymize_battles — delegation doctrine kept.
5. **anonymize_battles SKIPS Ongoing rows (RT-11):** process only settled/terminal-outcome battles (tombstone + join sweeps). An Ongoing row at 6c means 6a's resolver failed on it (logged anomaly); leave its live deadline machinery intact so it can still settle — recorded ADR residual. Collect-then-mutate (both filters collected BEFORE any update).
6. **Reaper subject needles for delegated calls (RT-3):** every delegated call is spelled `(ctx, args.account_identity)` directly (NO local binding); plan-authored needles: count(squashed body, "(ctx,args.account_identity)") == N_delegated (=11: 8 erase + purge + erase_character_rows + anonymize_display_names — battle::anonymize_battles also (ctx,args.account_identity) ⇒ N=12... derive N from the final body at authoring, from THIS plan's call list, not from the impl) AND count("ctx.sender()")==1 (scheduler guard only). Count-before-index on every ordering needle (RT-18).
7. **Per-helper body pins (RT-4):** every delegated helper gets a shape pin in its owning module's _tests (erase_pvp_rows: challenger AND target AND battle_action AND challenge-reaper disarm — pvp_tests; erase_trade_offers: initiator AND counterparty, NO is_active() filter, + trade-reaper disarm — trading_tests + non-active-offer fixture note; erase_npc_state 3 tables — npc_tests; erase_heal_cooldown — raising_tests; erase_playtest_events, no cap/limit token — playtest_tests; anonymize_display_names — ranking_tests; anonymize_battles + battle_with_tombstoned_party — battle_tests; erase_wallet — economy_tests). erase_monsters (both twins) + erase_inventory + erase_character_rows pins live in accounts_tests.rs (monster_mgmt/inventory have no _tests sibling; do NOT create new files). Each pin: accessor + key/index + both identity columns where two exist + non-vacuity.
8. **set_profile_name gains the deletion gate (RT-2, in-touches fix):** ranking.rs's set_profile_name calls guards::require_not_deleting first (mirrors the three ADR-0227 S5 call sites) — otherwise a connected terminal session un-tombstones its own display name post-cascade, hollowing 6c. Test: gate needle in set_profile_name body before the player write (ranking_tests). join_game/movement.rs re-population (RT-2) is OUT of touches — recorded residual + PR risk flag; S6's [DEL-06] enforcement mechanically forces it later.
9. **Guard-3 split shape (RT-5c):** terminal check FIRST via `account_has_terminal_marker(&account)` (already-bound row), THEN the existing `is_pending_deletion(ctx, me)` for mid-grace — BOTH needles stay in the caller-state partition (auth12_13_14 re-pin keeps `is_pending_deletion(`).
10. **Chain test two-link + pvp twin (RT-9):** m22s3b_resolver_extraction_chain asserts on_disconnect→resolver AND resolver→cancel_trades_on_disconnect; duplicate the on_disconnect→resolver link into pvp_tests beside the re-scoped ea_pvp_05/ptc5b_4.
11. **cascade_covers_manifest is totality-driven (M5):** iterate DATA_LIFECYCLE_MANIFEST with exhaustive match on DeletionPolicy; panic on an Erase/Anonymize/ViaJoin entry missing from the hand table→helper map; [DEL-04] S6 contract change recorded in ADR.
12. **erase_wallet exemption mechanics (RT-8):** exempt BY NAME from the same rust_fn_bodies walk + assert exactly one entry named erase_wallet + exact-body pin from that walk + positional assertion (before fn rekey_wallet).
13. **Arithmetic fix (m1):** 6b = 8 erase helpers + purge_export_bundles = 9 calls; total delegated calls incl. 6c/6d = derive from the helper map at pin-authoring time.
14. **ADR consequences added (M1/M2/M3/M6/M7/RT-6/7/10/12/13/14/16, m3-m7):** see ADR-0228 rev 2 — wallet client-contract break (S8 owner); profile ladder survival + guard-11 guest-claim block + refresh_profile_name re-attach; AUTH-14 per-incarnation bound; online-at-fire session state; last_login_at_ms retention; third-party export bundles + S4b TTL dependency; tombstone-vs-tombstone practice reclassification; counterparty-direction commitments; sweep×publish volume; player-ownership exception; schema.rs comment hygiene; shared-eval WARN declaration; double-fire idempotence.

## Phase state
- [x] Recon + plan + researcher constraint map
- [x] Gates ledger authored (X1-X18) · ADR-0228 drafted
- [x] Plan review (reviewer opus + red-team opus) → 3 blockers + 7 major adjudicated into deltas above; ADR rev 2 (bc75af5)
- [x] Tests r1 applied+committed (815bdbb), red proofs recorded (red-1 compile, red-2 assert)
- [x] Test review: reviewer SOUND; red-team 14 measured cheats → r2 strengthening list sent to tester (+3 addenda: plan_deletion_rearms raw-stamp fix, sole-writer census 3→4, 4 clippy errors)
- [x] IMPLEMENTATION committed (9ed7016): all 10 scope items; 759/762 (3 reds await tester r2); 13 security evals PASS; lint reds only in tester code; 8/8 bite-proof mutants FAILED correctly (memory/projects/m22-s3b.teeth.txt)
- [x] ARCHITECTURE.md m22-s3b paragraph + knowledge regen (in sync)
- [x] r2+r3+r4 applied; verifier APPROVE; final just ci green on bfbc764; PR #408 OPEN — terminal state reached
