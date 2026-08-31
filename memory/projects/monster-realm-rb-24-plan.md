# rb-24 plan of record — AccountDeletionReaperSchedule (declare + PRV1-1/PRV1-3 wiring)

Branch `slice/rb-24`, worktree `.claude/worktrees/rb-24`, fork `efdae74`. ADR number: **0221**
(launch-assigned 220 is TAKEN by rb-22's `docs/adr/0220-guest-export-orphan-purged-at-claim.md`,
merged same-day; `mr-state.json adr_next_free: 221`. Collision flagged to supervisor in PR + handoff.)

Planner: opus subagent a586bc798dc667440 (full output in session transcript). Orchestrator deltas:
plan-review lenses RUN (launch procedure overrides planner §8's skip recommendation); implementer =
orchestrator (tester is a different agent — split preserved; no `specialist` agent type exists here).

## Code changes (file-level; all anchors verified by planner against live tree)

1. `server-module/src/accounts.rs`
   - Header: add 4th owned table to WRITE-ISOLATION list; extend ADR-0056 bare-ident note to the
     second scheduled reducer. Do NOT disturb tokens `privacy`/`purge_export_bundles` (rb22 pin :4782).
   - New pure seam after `claim_is_expired` (:110): `pub(crate) fn deletion_fire_at_ms(requested_at_ms: i64) -> i64`
     = `requested_at_ms.saturating_add(game_core::DELETION_GRACE_MS_DEFAULT)`. Enables real unit tests
     + cross-check vs `is_deletion_due` (SSOT parity — flag in ADR; the rule constant stays in game-core).
   - New helpers before `delete_account` (~:526): `arm_deletion_reaper(ctx, account, requested_at_ms)`
     (insert, `scheduled_id: 0`, `ScheduleAt::Time(Timestamp::from_micros_since_unix_epoch(deletion_fire_at_ms(..).saturating_mul(1_000)))`),
     `disarm_deletion_reaper(ctx, account)` (collect ids via `.account_identity().filter()`, delete by PK
     — ADR-0126 D4, mirroring `disarm_claim_reaper` :321-335). Direct `ctx.db.` chains only (G5).
   - `delete_account` (:531): bind `let now = now_ms(ctx);` once; `update(requested_deletion(account, now))`;
     append `arm_deletion_reaper(ctx, me, now);` LAST. AUTH-37-compatible (first-occurrence order pin only).
   - `cancel_account_deletion` (:554): append `disarm_deletion_reaper(ctx, me);` AFTER the
     `needs_cancel_write` gate AND after the account update (AUTH-38 "no write when Active" preserved;
     pre-gate disarm is a named anti-pattern).
   - New table + reducer after `guest_claim_reaper` (:613): exact spec §4.4 row shape; bare-ident
     `scheduled(account_deletion_reaper)`; reducer `_args: AccountDeletionReaperSchedule`, first
     statement scheduler guard (exact squashed pin `ifctx.sender()!=ctx.database_identity(){return`),
     then `Ok(())` deliberate no-op (S3 owns PRV1-5 recheck + PRV1-6 cascade).
   - Style: no `/*`, no glob `*`, no bare `"` in comments; no print macros; no slash in string literals.
2. `server-module/src/schema.rs`: `DataLifecycleEntry` for `account_deletion_reaper_schedule`,
   policy `NotOwned` (Erase would force a C3 self-disarm anti-pattern into S3's cascade via [DEL-04]),
   truthful basis, `exportable: false`; appended after guest_claim_reaper_schedule entry (:1164-1170);
   update partition doc comment (:987-989).
3. `server-module/src/accounts_tests.rs` (sibling — in scope): census edits table (planner §1.3):
   `allowed_write_tables()` 3→4 (:282), g2 reducer set 5→6 (:2064), T1 floors 38→39/39→40, T2
   `expected_not_owned` 17→18 (+message), doc-truth recounts (T2 :3573, T9 :3956). Plus all new
   `rb24_*` gating tests (tester-authored — see test plan).
4. Touches-delta (each justified; no sibling in flight — verified no open PRs/branches):
   - `evals/guest-claim-integrity.eval.mjs`: REKEY_MANIFEST 25th key
     `account_deletion_reaper_schedule.account_identity` EXEMPT (truthful reason — planner verified NO
     guest-orphan hole exists: start_guest_claim rejects account holders AUTH-7, arm only reachable via
     delete_account which requires an account row; do NOT copy export_bundle honest-limit language);
     `OWNED_TABLES` (:1226) + accessor. Do NOT touch PLANNED_PIN (:466) / do NOT promote
     `account_deletion_reaper` PLANNED→REQUIRED (REDs [R/planned-set] both directions).
   - `evals/battle-schema-snapshot.eval.mjs`: T-VIS-ANCHORS ritual — `realPrivateCount !== 21`→`22`
     (:2553, + message 18/21→18/22), append to `pinnedPrivateTables` (:2603-2628) w/ ADR-0221 comment.
   - `evals/baselines/table-schemas.json`: regen via `node evals/battle-schema-snapshot.eval.mjs --write`
     (this eval HAS --write; never hand-merge).
   - `client/src/module_bindings/**`: publish + `spacetime generate`; expect types.ts-only diff
     (private table ⇒ CamelCase types only, no reducer module file).
   - `docs/knowledge/**`: `just knowledge` AFTER fmt + final schema/accounts commit (line anchors).
   - `docs/adr/0221-*.md` + `docs/adr/DIGEST.md` (`just adr-digest`), `ARCHITECTURE.md` (one block).
   - NOT touched: CHANGELOG.md (cliff), game-core/**, privacy.rs, account-privacy.eval.mjs,
     evolution_tests.rs, ops/**, .claude/hooks fixtures.

## Ordered commits
1. wip: plan checkpoint (ADR-0221 draft) → 2. wip: RED gating tests + census edits (tester) →
3. wip: GREEN impl (schema.rs + accounts.rs) → 4. wip: eval touches-delta + baseline regen →
5. wip: publish + bindings regen → 6. wip: knowledge regen + ADR final + ARCHITECTURE → 7. review fixes.

## Test plan (tester writes, RED-first, `rb24_` prefix in accounts_tests.rs; reuse existing strippers)
POST-LENS REVISION (plan-review reviewer a15f… + red-team a405f… findings F1-F10 folded in; red-team
PoCs at /tmp/rb24-attack/, 7/7 original mutants confirmed biting before the new survivors were found):
 1. rb24_deletion_schedule_table_shape_and_privacy — count-anchored (throw on >1), exactly-3 fields
    in order, no `public`, bare-ident scheduled(), #[index(btree)] pinned, no timestamp field.
 2-4. rb24_deletion_fire_at_ms_{boundary,saturates,agrees_with_is_deletion_due} — PARITY SCOPED to
    requested_at <= i64::MAX - GRACE (reviewer M1/red-team F10: saturating_add vs saturating_sub
    formulations DIVERGE at the bound); _saturates asserts clamping in isolation AND documents the
    divergence (also → ADR residuals).
 5. rb24_delete_account_arms_the_reaper_last — arg-pin `;arm_deletion_reaper(ctx,me,now);` exact,
    depth 0, after `update(requested_deletion(account,now))`, no `return` between, PLUS [wire/no-shadow]
    (F2): exactly one `letnow=` occurrence and it is `letnow=now_ms(ctx);`, PLUS [wire/no-rebind] (F3):
    exactly one `letme=` and it is `letme=ctx.sender();` (same clause for cancel in test 8).
 6. rb24_arm_deletion_reaper_body_frozen — squashed-body EQUALITY (ms→µs pin inside).
 7. rb24_arm_called_exactly_once_in_crate — crate census via m22_scanned_sources.
 8. rb24_cancel_disarms_the_reaper — SAME four clauses as the arm pin (F8): statement-form
    `;disarm_deletion_reaper(ctx,me);`, depth 0, after needs_cancel_write( and after the update, no
    return between; + [wire/no-rebind] for cancel; negative cross-pins (no arm in cancel, no disarm
    in delete).
 9. rb24_disarm_deletion_reaper_body_frozen — squashed-body EQUALITY (F4: kills wrong-filter-arg
    `filter(ctx.database_identity())` and wrong-table `guest_claim_reaper_schedule` delete).
10. rb24_deletion_reaper_scheduler_guard_is_first_statement — F1 FIX: needle prefix is forgeable
    (`{return` matches `{returned_scheduler_reject(ctx);…`); assert body starts_with
    needle+`Err(` (reject form) — never bare `{return`. ALSO harden the shipped eval SCHEDULER_GUARD
    clause (guest-claim-integrity.eval.mjs:637) the same way — measured green on an inert guard for
    the SHIPPED guest_claim_reaper too (live master weakness; flag in PR).
11. rb24_deletion_reaper_body_is_frozen_noop — F5 FIX: full squashed-body EQUALITY
    (`…{returnErr("account_deletion_reaper is scheduler-only".to_string());}Ok(())` shape) — kills
    delegated cascade via pub(crate) helpers in other modules; designed to RED deliberately when S3 lands.
12. rb24_owned_write_set_covers_the_deletion_schedule — widening-not-vacuous.
13. rb24_schedule_table_sole_writers — F6 FIX: whole-file occurrence census of
    `ctx.db.account_deletion_reaper_schedule()` == 3, each inside arm/disarm bodies (hardened LOCAL
    attribution — the shared write_target_accessors has the measured alias/anchorless holes).
Census edits (g2 6-name, totality, T2 expected_not_owned 18 — INSERT FIRST, list is sorted and
order-sensitive assert_eq!, reviewer m4) also tester-authored and RED.
Do NOT duplicate AUTH-37/38, legal-state, T3, T9, [R/planned-shape].
≥13 new named tests → X12 floor baseline+12 confirmed satisfiable (reviewer M2).

## Proof-of-teeth mutants (orchestrator-run, DISTINCT message-pinned fragments, 14 — red-team F7):
(1) drop grace add (2) drop saturating_mul(1_000) (3) arm before update (4) arm(ctx,me,now_ms(ctx))
(5) disarm before gate (6) filter→iter (7) guard→inert let form (8) reaper body gains .delete(
(9) manifest entry deleted (10) #[index(btree)] dropped (11) guard `{ returned_scheduler_reject(ctx); }`
prefix cheat [F1] (12) reaper delegates `crate::monster_mgmt::rekey_monsters` [F5] (13) `let now = 0i64;`
shadow before arm [F2] (14) disarm deletes from guest_claim_reaper_schedule [F4b].

## Ledger: gates E1 + X1..X15 per planner §3, via gate scripts
`memory/projects/rb-24.{rust-gate,eval-gate,bindings-probe,migration-probe,bite-proof,scope-gate}.mjs`
(node-v18-safe ES5; markers print ONLY on success; never in failure messages). X9 republish probe:
own --data-dir/port, additive republish MUST pass + non-scheduled→scheduled CONTROL MUST fail;
never concurrent with `just ci`. LENS-DRIVEN gate-script requirements:
- X9 (red-team): assert (i) baseline publish SUCCEEDED, (ii) additive republish is an automigration
  onto the SAME db name with no -c/clear flag, (iii) the control rejection message names the
  scheduled/table-schema change — `control=red` for an unrelated reason must FAIL the probe.
- X12 (red-team): fail LOUD if the recorded baseline is non-numeric (a coerced NaN placeholder must
  never print RATCHET-OK); baseline measured on the fork tree before any edit.
- X13 (red-team F9): NEVER `import()` the fork eval copy (ESM cache returns the same frozen object —
  measured tautology; and a second *.eval.mjs in evals/ joins the run.mjs glob). Extract via
  `git show efdae74:evals/guest-claim-integrity.eval.mjs` to /tmp, parse REKEY_MANIFEST TEXTUALLY
  (brace-walk precedent accounts_tests.rs:3368), CONTROL: fork keys == 24, live keys == 25.
- X10: 14 mutants, each pinned to a DISTINCT failure-message fragment.

## Risks/ADR content (planner §6): R1 spec §4.2 re-drive claim moot (single transaction) — rejected
alternative recorded, AUTH-28 pin preserved verbatim; R2 fired-noop leaves PendingDeletion+unarmed
(S2-era expected; S3 inherits); R3 NotOwned conditional on reaper-sole-driver; R6 `_args` fallback.
S3 obligations (planner §7) → ADR Residuals: replace no-op body (delete rb24 noop tooth deliberately),
resolve_all_live_interactions factoring, rb-21 terminal guard BEFORE disarm, re-classify on new
cascade driver, re-arm strategy for fired-noop-era accounts, spec §7.2 S2-row amendment (supervisor).

## Anti-patterns (named, planner §5): PLANNED→REQUIRED promotion; path-form scheduled(); ctx.db
aliasing; matcher-widening w/o positive tooth; first-hit anchors; duplicated now_ms; pre-gate disarm;
insert-if-missing re-drive branch; slash/quote in basis; hand-edited baseline; probe concurrent with
ci; directory-wide checkout in mutation loop.
