# m22-s3 plan v2 (post plan-review) — right-sized S3 (PRV1-4/5/7-partial) + structural deferral of the cascade

Slice: m22-s3 · branch slice/m22-s3 · worktree .claude/worktrees/m22-s3 · fork d114de0 · ADR 0225
Quality tier HARD · tester=opus · no sibling fan-out. Plan v1 reviewed by reviewer+red-team (both
opus; red-team MEASURED all claims in a /tmp clone); all findings adjudicated below and folded in.

## The load-bearing discovery (verified by both lenses)

G5 MODULE_WRITE_ISOLATION (evals/guest-claim-integrity.eval.mjs:1280-1345, live in CI, + Rust twin
[rb24/owned-set-closed]) closes accounts.rs's write set at {account, guest_claim,
guest_claim_reaper_schedule, account_deletion_reaper_schedule}; `ctx.db.battle(` is banned as a
literal. Every foreign-table write delegates to the owning module (rekey_all precedent). ZERO
erase/anonymize helpers exist in owning modules (only privacy.rs:33 purge_export_bundles = rb-22's
export purge). So PRV1-6b/c/d (+6a wiring, 6e, PRV1-19) require NEW helpers in ~10 out-of-touches
files. The lib.rs resolve_all_live_interactions extraction REDS evals/trade-reducer-security TR-18
(:124-126, needs the literal inside on_disconnect's extracted body) — out-of-touches eval. The M22
ceremony never reconciled §4.4 "cascade in accounts.rs" with ADR-0179 D0/G5. → spec gap, ADR-0225.
DEFER cascade to S3b. S3b touches (complete list, red-team m13): server-module/src/accounts.rs +
accounts_tests.rs + lib.rs + trading/pvp/battle/monster_mgmt/inventory/economy/npc/raising/ranking/
playtest/privacy(.rs + _tests) + evals/trade-reducer-security.eval.mjs (migrate-or-edit, ADR-0224)
+ docs/knowledge + ARCHITECTURE.md.

## IN scope (accounts.rs + accounts_tests.rs + docs only)

W0 — pure block after `claimed_account` (~:270), before "Context-bound predicates (SSOT)":
  1. `pub(crate) fn account_has_terminal_marker(account: &Account) -> bool` = terminal_at_ms.is_some().
     (RENAMED from account_is_terminal — reviewer m1 + red-team m9 converged: spec §4.1's defined
     "terminal" is the conjunction; this is deliberately the marker half, fail-closed on the illegal
     Active+Some shape. Doc cites §4.1 + says so plainly.)
  2. `pub(crate) fn should_reject_for_deletion(account: &Account) -> bool`
     = status == PendingDeletion || account_has_terminal_marker(account). Spec §4.7 names this
     signature; S5's shared entry point (S5 touches exclude accounts.rs, so only S3 ships it).
     Explicit disjunction. Doc warns: is_pending_deletion delegates here; any third disjunct
     requires re-deriving that delegation (NOT the reaper predicate — decoupled, see 3).
  3. `pub(crate) fn reaper_should_run_cascade(account: &Account, now_ms: i64) -> bool`
     defined DIRECTLY (reviewer M2 structural fix — immune to future S5 widening of the gate):
     status == PendingDeletion && !account_has_terminal_marker(account)
       && game_core::is_deletion_due(account.deletion_requested_at_ms, now_ms).
     Mirrors spec §4.5 verbatim. Doc: is_deletion_due(None,_)==false is load-bearing (cancel clears
     the stamp); the NOT-YET-DUE no-op branch drops the fired one-shot with no re-arm — S3b MUST
     re-arm there (red-team m8; also in ADR + W2 comment).
  4. `const REJECT_ALREADY_DELETED: &str = "this account has already been permanently deleted";`
     private, beside REJECT_UNRECOGNIZED_* (~:75). NOT `REJECT_ACCOUNT_DELETED` (reserved for
     blocked PRV1-8(a)); doc says so. -D warnings is the wiring tooth (X7).
  5. `is_pending_deletion` body becomes `.is_some_and(|a| should_reject_for_deletion(&a))`
     (red-team M4, measured green across all pins incl. auth12_13_14's needle): guard 3 of
     complete_guest_claim becomes terminal-aware; identical behavior on all LEGAL states (terminal
     ⇒ PendingDeletion); fail-closed on the illegal shape; gives the spec-named predicate a real
     production consumer ("one predicate", §4.7). Doc comment updated to say it delegates.

W1 (PRV1-4) — cancel_account_deletion: guard after the account lookup, BEFORE the AUTH-38 gate:
  `if account_has_terminal_marker(&account) { return reject("cancel_account_deletion", me, REJECT_ALREADY_DELETED); }`
  Honest rationale (reviewer n1): on every LEGAL state the order is neutral; guard-first is
  fail-closed on the illegal Active+Some shape (debug_assert compiled out in release) and is what
  ADR-0221 R3 asked for. Update the stale ":631 rb-21 owes PRV1-4" comment. Closes the guard half
  of R-m22-s2-S3-CANCEL-TERMINAL; T9 adds the constructor-level-test half; the debug-assertions-
  in-release decision half is re-pointed to S3b in ADR-0225 (nothing writes Some until S3b).

W1b (red-team M7, defense-in-depth) — delete_account: BEFORE the needs_deletion_write gate:
  `if account_has_terminal_marker(&account) { return Ok(()); }`
  Ok-shape (NOT reject) preserves PRV1-2's letter (terminal is status-PendingDeletion → SHALL
  return Ok(())); kills the measured laundering path where the illegal Active+Some row passes
  needs_deletion_write(Active)=true, gets re-written to a LEGAL PendingDeletion+terminal row and
  RE-ARMS a second cascade on an already-erased account. Zero behavior change on legal states.

W2 (PRV1-5) — account_deletion_reaper body (replaces rb-24 no-op):
  scheduler guard (unchanged first stmt) →
  `let Some(account) = ctx.db.account().identity().find(args.account_identity) else { return Ok(()); };`
  → `if !reaper_should_run_cascade(&account, now_ms(ctx)) { return Ok(()); }` → `Ok(())` with
  comment: "S3b: the §4.4 five-step cascade lands here; S3b MUST also re-arm on the not-yet-due
  path (the runtime already deleted this fired one-shot row)". `_args`→`args`. Full header doc
  rewrite (reviewer m7 — the old "THIS SLICE SHIPS A DELIBERATE NO-OP (rb-24)" text is the source
  of the knowledge-bundle abstract): states the recheck semantics, the S3b deferral + why (G5
  closed write set), inherited ADR-0221 R2, exposure-nil argument (ALLOWED_ISSUERS `.invalid`).
  MUST NOT: stamp terminal_at_ms; call interaction resolvers; touch the schedule accessor (census
  pins 3 = 1 arm + 2 disarm); add any write; re-arm (arm-exactly-once census).

Docs:
  ADR-0225 records (X10 MANUAL gate): (1) scope decision + G5/D0 spec gap + S3b shape&touches;
  (2) deliberate deviation from ADR-0221 R1 — the frozen-noop pin is RE-PINNED, not retired
  (reviewer m4; retire happens in S3b with the cascade); (3) predicate LOCATION —
  accounts::should_reject_for_deletion(&Account); S5's guards.rs wrapper delegates, never
  re-derives (reviewer m5; spec §7.3 wrongly implies game-core); (4) account_has_terminal_marker
  naming divergence from §4.1 (red-team m9); (5) debug-assertions/Err-promotion half of the
  CANCEL-TERMINAL residual re-pointed to S3b; (6) not-yet-due re-arm obligation for S3b; (7) T3-
  style structure tests justified in one sentence (reducer bodies have no runtime harness —
  reviewer n2); (8) PRV1-8 BLOCKED note (#403). Extends:/prose refs only, never Amends:. Decision
  header ≤240 chars. `just adr-digest` after final (recipe: adr-digest-check, HEADER-ONLY gate).
  ARCHITECTURE.md — CORRECT (not append beside) the now-false claims at :383 ("S3 writes it"),
  :390 ("deliberate NO-OP"), :398-400 ("S3 owns the re-arm path"), :416 (module-map "no-op") to
  the shipped reality + S3b pointer (reviewer m3, red-team m10).
  Knowledge bundle — `just knowledge` AFTER the code commit; measured 8 files drift; the reaper
  abstract regenerates from the REWRITTEN header (do the header rewrite first or the stale
  abstract passes X8). CHANGELOG: never hand-edited.

## Tests (tester=opus; prefix m22s3_; all in accounts_tests.rs)

T1 m22s3_account_has_terminal_marker_truth_table — PRV1-4, pure, 4 rows incl. fail-closed
   (Active,Some)=T.
T2 m22s3_reject_already_deleted_is_distinct_and_static — PRV1-4, const-value: non-empty, distinct
   from every other reject reason const/literal in use, no `{`/`}`.
T3 m22s3_terminal_guards_precede_state_writes — PRV1-4/W1b, the ONE structure test (justified:
   no reducer runtime harness). Clauses (red-team M2 + B1 discipline — needles AUTHORED FROM THIS
   PLAN, concat!-split in test source):
   cancel body: whole-statement needle `ifaccount_has_terminal_marker(&account){returnreject(` +
   `,me,REJECT_ALREADY_DELETED);}` occurs EXACTLY once, at brace-depth 0, index BEFORE
   `needs_cancel_write(` AND before `.update(cancelled_deletion`;
   delete body: `ifaccount_has_terminal_marker(&account){returnOk(());}` occurs EXACTLY once,
   index BEFORE `needs_deletion_write(`.
T4 m22s3_reaper_should_run_cascade_truth_table — PRV1-5, pure, full 2x2x2 + requested=None row.
T5 m22s3_reaper_should_run_cascade_grace_boundary — PRV1-5, pure: ==boundary T, -1ms F,
   future-dated F, i64::MAX no-panic.
T6 m22s3_should_reject_for_deletion_truth_table — PRV1-7, pure, 4 rows incl. (Active,Some)=T and
   (Active,None)=F.
T7 re-pin rb24_frozen_reaper_body() (:5367) + rb24_deletion_reaper_body_is_frozen_noop doc rewrite
   (:6261-6298) — ORDER MATTERS (red-team B1): FIRST assert plan-authored clauses — exactly one
   `if!reaper_should_run_cascade(&account,now_ms(ctx)){returnOk(());}` and exactly one
   `.find(args.account_identity)` in the squashed body — THEN the full-body exact equality
   (derive the literal by execution ONLY for the equality clause, never for the needles).
T9 m22s3_cancelled_deletion_rejects_terminal_input — PRV1-4 residual, constructor-level
   #[should_panic(expected = "cancelled_deletion: illegal Account state")] on the legal terminal
   row (precedent :3029). Documents the release-gap the W1 guard covers.
(T8 DROPPED — reviewer m2: no consumer until S5/S6, mixed reducer signatures defeat the fn-pointer
   probe, ADR-0224 resolves uncertainty toward absence.)
Also: is_pending_deletion delegation is covered by T6 + existing M21 pins (auth12_13_14 needle
   untouched, measured); no new test needed (behavior identical on legal states).

RED staging (red-team m12 — two receipts, no ceremony):
  RED-1: full new suite on unmodified tree → cargo nextest compile fail E0425 naming ALL new
  symbols (receipt for T1/T2/T4/T5/T6/T9 + T3's needles).
  Then implementer lands W0 ONLY (predicates + const + is_pending_deletion delegation) →
  RED-2: T3 red (guards not wired), frozen-noop pin red (old body); T1/T2/T4/T5/T6/T9 green.
  Then W1/W1b/W2 → all green. Exactly these two runs are the red-green cycle (ADR-0224).

Non-regression (both lenses traced/measured): rb24_cancel_disarms_the_reaper all clauses,
auth37/38 shapes, sole-writers census 3, arm/disarm exactly-once censuses, machinery_g2_*,
g5_writes_only_owned_tables, G2 enumerator + REDUCER_SANCTIONS/PLANNED_PIN, account-privacy G12
(scoped to provision/on_connect), reject_message_contracts_present (presence-only; do NOT add a
row — T2 is stronger), bindings unaffected (scheduled reducers emit no *_reducer.ts). Expected
full-tree result pre-docs: 684 passed / 0 failed (red-team measured); evals: only
knowledge-bundle-conformance red until regen (account-e2e is environmental).

## Acceptance ledger — authored gates (nextest -E only; zero-match exits 4; NO numeric floors)
X1 T1+T2 · X2 T3+T9 · X3 T4+T5 · X4 frozen re-pin + scheduler-guard-first · X5 T6 · X6 accounts
suite green (no N pin — ADR-0224) · X7 just lint (wiring tooth) · X8 just knowledge-check +
just adr-digest-check · X9 full just ci · X10 MANUAL ADR-0225 content (path:line cites — the
digest gate is header-only, red-team m11).
DEFER: PRV1-6a/b/c/d/e + PRV1-19 → S3b (touch list above); PRV1-7-enforcement → S5/S6 (mechanism
needs supervisor decision under ADR-0224); PRV1-8 → BLOCKED #403.

## Risks (v2)
R1 knowledge drift misread → X8, regen after code commit, header rewrite FIRST.
R2 frozen-pin derived-from-impl polarity inversion → T7 clause order (B1 fix).
R3 T3 green with guard-after-gate → the needs_cancel_write ordering clause (M2 fix).
R4 -D warnings dead_code → every symbol has a production caller by design; X7.
R5 gate false-green on zero-match filters → nextest -E everywhere, counts in EXPECT.

## Anti-patterns (unchanged from v1)
No double quotes/apostrophes in // comments in accounts.rs; concat!-split every needle in test
source; no containment relaxation of the frozen pin; no terminal stamp/re-arm/partial cascade; no
new evals, no bite-proof ceremony, no ratchets; no git checkout -- during the loop; knowledge
regen after code commit; adr-digest after ADR final.
