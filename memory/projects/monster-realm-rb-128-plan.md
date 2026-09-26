# rb-128 plan memo — PRV1-7 class-(iv) roster drain (R-rb-45-DRAIN)

Worktree: projects/monster-realm/.claude/worktrees/rb-128 (branch rb-128 from origin/master 540c92d). ADR reserved: 0273.
Ledger: memory/projects/gates/rb-128.gates.md — E1 CHECK/EXPECT filled (nextest -E filter, exact `17 tests run: 17 passed`).

## Decisions (orchestrator, after planner a3e6524ae595fbb2b)
1. ONE slice for all 13 (E1 is one criterion; the ADR-0258 roster edit is atomic).
2. Gate = FIRST statement of each of the 13 bodies: `crate::guards::require_not_deleting(ctx, "<name>")?;`
   (precedents ADR-0250 D4 grant_bait / ADR-0236 D2; forced in movement.rs because authorize_move writes `player`).
   Provable for every reducer by the rb-80 native-host five-state matrix: join_game -> seed player row -> "already joined";
   enqueue/set/clear -> "not joined"; monster reducers -> "monster not found"; attempt_recruit -> "battle not found";
   dismiss_dialogue -> register player_conversation handle -> real delete -> Ok(()) + row oracle (row survives only when refused).
3. DISCLOSED WIDENING (touches-delta): server-module/src/privacy_enforcement_tests.rs — ADR-0258 D6 exact-pinned roster
   (13 rows move DELIBERATE_EXEMPTIONS -> EXPECTED_GATED, 25->12 / 14->27). No sibling in flight (mr-state inflight = rb-128 only).
   Also docs/adr/DIGEST.md (just adr-digest) and docs/knowledge/reducers/*.md (just knowledge, AFTER final fmt).
4. ADR-0250 D5 (dismiss_dialogue OPEN) / D6 (attempt_recruit OPEN) / D7 (raising writers deferred) yield to the spec section
   (rb-128 names all 13; PRV1-10 text covers battle/trade/challenge only). ADR-0273 uses `Extends: 0258, 0250, 0227, 0168`,
   NOT `Amends:` (adr-digest-check would demand an Amended-by edit in ADR-0250, outside touches) — supervisor follow-up.
5. Tests live in guards_tests.rs (in touches; rb-76 behavioural precedent): helper + 13 behavioural + 2 source-pin tests;
   re-pins in raising_tests (bare count 1->5), npc_tests (2->3, D5 frozen body -> gated body), taming_tests (1->2, body bare 0->1),
   movement_tests clear_queue body pin (gate prefix), guards_tests rb78 anchors 10->13 (join_game, evolve, set_nickname).
6. Residual UX (register after lenses): join_game mid-grace reconnect now reports `join: <deletion reject>` as a status line
   (connection.ts:697 exact-matches "already joined"; main.ts:3116 reportError only, no teardown). No e2e reconnects mid-grace.

## Ordered tasks
T0 orchestrator: ledger fill (done), plan memo (this), ADR-0273 draft, wip commit+push.
T0b orchestrator: plan lenses — reviewer ∥ red-team ∥ /simplify (parallel, read-only).
T1-T3 tester (opus): roster edit, guards_tests rb128 block, re-pins; RED record at HEAD (22 tests fail by assertion).
T4 orchestrator: commit red tests (wip), push.
T5 orchestrator-as-specialist: 13 gate lines + comment, cargo fmt, just ci-fast monster-realm-module.
T6 doc-keeper: ADR-0273 final, ARCHITECTURE.md (M22 section :484-485 + rb-128 paragraph after :2317), memory; orchestrator runs just adr-digest + just knowledge.
T7 lenses on artifact: reviewer ∥ /simplify ∥ red-team ∥ reducer-security-auditor ∥ desync-guard, then verifier (+ mutant register live).
T8 orchestrator: full just ci (detached, CI-EXIT marker), mr-gates check --timeout 900, residuals add, PR (touches-delta + boyscout-delta + Items: none + mr-gates render pr line).
