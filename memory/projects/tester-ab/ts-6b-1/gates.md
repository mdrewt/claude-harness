# Gates: ts-6b-1
Spec: M-trade-sessions.spec.md#ts-6b-1
Seed: 492a72d6283f3350
Seeded: 2026-11-13T14:58:13Z
Repo: project
Scope: M-trade-sessions slice ts-6b-1 (type: feature, tier: hard, MODERATE, category security-privacy MED, game repo) per specs/monster-realm-v2/M-trade-sessions.spec.md §ts-6b-1 and its Fix-batch contract: residual fix batch 1, runs ALONE (edits server-module/src/schema.rs doc comments only — no table/column/reducer-signature change, no `just gen`, no bindings diff). (1) complete_guest_claim erases the retired guest's tactical rows (schema::erase_tactical_rows then battle::anonymize_battles, beside purge_export_bundles) and the 'only from the reaper'/NOT_REKEYED comments are updated (ts-6b-1.1); (2) require_not_deleting returns the one criterion reason string for every gated reducer, client test samples updated (ts-6b-1.2); (3) accept_challenge deletes player_conversation for both parties after start_pvp_tactical succeeds (ts-6b-1.3); (4) observability-dr.md §8 names the account_deletion_cascade and guest_claim_export_purge log lines and their 30-day Loki retention (ts-6b-1.4). Closes R-weekly-review-2026-10-16-F2 (+ duplicate R-bt-7-GUESTTACTICAL), R-rb-128-X2, R-weekly-review-2026-10-09-F3, R-rb-65-RUNBOOK-LOGCAVEAT — each gate names its proving test. Stay inside touches:.
Criteria: 4 seeded, 0 shall-uncaptured
Touches: server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/battle.rs, server-module/src/schema.rs, server-module/src/guards.rs, server-module/src/guards_tests.rs, client/src/ui/statusModel.test.ts, client/src/main.dialogueEnded.test.ts, server-module/src/pvp.rs, server-module/src/pvp_tests.rs, docs/runbooks/observability-dr.md

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-1.1: WHEN a guest claim completes, THE SERVER SHALL leave no `battle` or `battle_summary` row naming the retired guest identity, treating the opponent's side of those rows as the deletion cascade does — closes `R-weekly-review-2026-10-16-F2` and its duplicate `R-bt-7-GUESTTACTICAL` (`guest_claim_tombstones_the_guests_terminal_battle_and_summary_rows` in `server-module/src/accounts_tests.rs`).
  CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=accounts::accounts_tests::acct_nh::guest_claim_tombstones_the_guests_terminal_battle_and_summary_rows)' 2>&1
  EXPECT: / 1 test run: 1 passed/
  EVIDENCE: pending

- [ ] ts-6b-1.2: WHEN `require_not_deleting` refuses a caller, THE SERVER SHALL return `account deletion requested; this action is unavailable until the deletion is cancelled` for every gated reducer — closes `R-rb-128-X2` (`a_mid_grace_caller_gets_the_same_reason_from_move_talk_and_buy` in `server-module/src/guards_tests.rs`).
  CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=guards::guards_tests::a_mid_grace_caller_gets_the_same_reason_from_move_talk_and_buy)' 2>&1
  EXPECT: / 1 test run: 1 passed/
  EVIDENCE: pending

- [ ] ts-6b-1.3: WHEN a PvP challenge is accepted, THE SERVER SHALL end any open NPC conversation of either party in the transaction that starts the battle — closes `R-weekly-review-2026-10-09-F3` (`accept_challenge_ends_both_parties_open_conversations` in `server-module/src/pvp_tests.rs`).
  CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=pvp::pvp_tests::accept_challenge_ends_both_parties_open_conversations)' 2>&1
  EXPECT: / 1 test run: 1 passed/
  EVIDENCE: pending

- [ ] ts-6b-1.4: WHEN the runbook lists where an erased identity survives, IT SHALL name the deletion-cascade and claim-purge log lines and their 30-day Loki retention — closes `R-rb-65-RUNBOOK-LOGCAVEAT` (doc-only; the line names `account_deletion_cascade` and `guest_claim_export_purge`, each emitted by a server test the PR cites).
  MANUAL: doc-only criterion; a runner asserting runbook wording would pin prose (standards/testing-tdd.md). The cited line is the section 8 bullet; the PR body names the server tests that drive each emitting reducer.
  EVIDENCE: pending
