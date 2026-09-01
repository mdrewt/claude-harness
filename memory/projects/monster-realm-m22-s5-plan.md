# m22-s5 plan — gameplay deletion gating fan-out (PRV1-9 / PRV1-10)

Branch `slice/m22-s5`, worktree `.claude/worktrees/m22-s5`, fork `87f35e7`. ADR number 227
(supervisor-assigned; 0226 is NOT free to take — presumed reserved for the parallel S4 sibling,
whose worktree `feat/m22-s4-export` runs concurrently at the same fork point).

## Settled design (planner + reviewer + researcher; red-team deltas folded in below)

- **D1** `guards.rs` wrapper delegates via `crate::accounts::is_pending_deletion(ctx, ctx.sender())`
  (ctx-bound D7 SSOT) → `should_reject_for_deletion`. Transitive-delegation interpretation of
  ADR-0225 §2 recorded in ADR-0227 D1 (quotes the two conflicting merged comments; ADR-0189 D2
  tie-break; delegation pin + far-hop pin are JOINTLY the compliance proof).
- **D2** `pub(crate) fn require_not_deleting(ctx, reducer: &str) -> Result<(), String>` — NO
  identity param (caller-only structural). Pure `deletion_gate(rejected: bool) ->
  Result<(), &'static str>` for the polarity truth table; `const REJECT_DELETION_GATED` (one
  static PII-free reason — a per-state message would need re-derivation). Reject path =
  `log_reject` (never bare `log::` — `.log-baseline` pins guards.rs at exactly 1 bare warn).
- **D3** Gated set exactly {propose_trade, challenge_pvp, accept_challenge}. Placement: propose_trade
  Guard 1a AFTER caller-joined check, before counterparty lookup (trading_tests.rs:2789 pins
  `letme=ctx.sender();check_trade_side_size(` contiguous → NEVER before the caps; ADR-0166 D3);
  challenge_pvp Guard 1a after Guard 1 (joined), before target lookup (ADR-0189 D8 late-placement
  bound doesn't transfer to a self-property); accept_challenge Guard 2a after Guard 2
  (caller==target), before Guard 3/3a and all writes.
- **D4** Caller-only; counterparty gating REJECTED (third-party deletion-status oracle).
- **Anti-decision** submit_pvp_action NOT gated (deadline-reaper forfeit = de-facto force-
  termination, violates PRV1-10); negative census scoped to #[spacetimedb::reducer] fns only
  (12 total in the two files; 9 ungated: respond_trade, confirm_trade, cancel_trade,
  trade_offer_reaper, decline_challenge, cancel_challenge, submit_pvp_action,
  battle_challenge_reaper, pvp_deadline_reaper). Disconnect helpers excluded by construction.
- **DEFERs**: PRV1-7 crate-wide mechanism (supervisor decision per ADR-0225); battle::start_battle
  (PvE) + economy::buy/sell gating → backlog (outside touches, §4.7 names them).

## Hard constraints from the pin inventory (researcher, verified)

- pvp.rs must contain ZERO `ctx.db.account(` (ranking-security [D/no-account-table] + Rust mirror
  pvp_tests.rs ~:4317) and ZERO new `let me =` bindings in the two pvp reducers (n_let_me == 1
  pins ~:4066-4108). No `#[cfg` in those bodies. Call sites are single statements, fully
  qualified: `crate::guards::require_not_deleting(ctx, "<reducer>")?;`.
- trading_tests.rs:2789 first-statement pin (see D3). M6 pin: first cap precedes first `ctx.db`
  substring in propose_trade — the call-site text contains no `ctx.db`, safe.
- pvp-challenge-reaper / pvp-handshake evals: needle-presence on existing statements — early
  insertion safe. `.log-baseline`: unchanged iff wrapper uses log_reject.
- Comment discipline in ALL touched .rs: no unpaired /* anywhere (incl. strings), no bare double
  quote in // comments, no char-literal double quote, no print macros (spacetime generate scan),
  no braces in justfile-adjacent comments. guards_tests G-5a/b fence guards.rs verbatim.
- accept_challenge's first write is via `start_pvp_battle(` — the order pin's write-verb set must
  include helper names {start_pvp_battle(, schedule_trade_reaper(, schedule_challenge_reaper(,
  schedule_deadline(, disarm_challenge_reaper(, disarm_trade_reaper(} plus `().insert(/update(/delete(`
  (bare `.insert(` is WRONG — `seen.insert(mid)` HashSets in both pvp bodies).

## Test plan (tester writes; orchestrator runs — tester has no usable Bash and cannot write into
.claude/worktrees — stage to /tmp, orchestrator applies)

RED-TEAM DELTAS (plan-phase, measured — all folded in): (1) FUSED PIN — decomposed pins admit an
inverted-polarity or hollowed wrapper with everything green; the wrapper body's LEADING expression
must be `deletion_gate(crate::accounts::is_pending_deletion(ctx,ctx.sender()))` (squashed
prefix-pin: starts_with + count==1 + no iffalse/#[cfg/cfg!( in body). Impl shape:
`deletion_gate(...).map_err(|e| { log_reject(reducer, ctx.sender(), e); e.to_string() })`.
(2) Call-site needles END `)?;` (kills `let _ =`/.ok() discards). (3) Call sites FULLY QUALIFIED
`crate::guards::require_not_deleting(` — unshadowable, is_account_holder precedent, security-load-
bearing. (4) NEW P8b log-tag pin on the strings-KEPT comments-stripped squashed view: exactly one
`crate::guards::require_not_deleting(ctx,"<reducer>")?;` per gated reducer (wrong-tag
misattribution survives all other pins). (5) String args are INVISIBLE in the strings-blanked
view — stripped-view needles are `require_not_deleting(ctx,)?;`-shaped. rustfmt: no rustfmt.toml
→ width 100; all three call sites fit one line.

guards_tests.rs: m22s5_deletion_gate_truth_table; m22s5_reject_reason_is_static_pii_free_and_distinct;
m22s5_gate_delegates_fused_and_unconditional (fused pin + log_reject(reducer, clause + no bare log::);
m22s5_guards_never_rederives_deletion_disjunction (comments-stripped strings-kept bans, incl. ctx.db.account( — and fn require_not_deleting defined exactly once in guards.rs);
m22s5_is_pending_deletion_delegates_to_should_reject (far hop, include_str!("accounts.rs"));
m22s5_gated_reducer_census_is_exactly_three (census + bypass bans);
m22s5_already_open_reducers_are_not_gated (PRV1-10); m22s5_gate_precedes_first_write_in_every_gated_reducer;
m22s5_gate_body_performs_no_write; m22s5_gate_call_sites_are_fully_tagged (P8b).
trading_tests.rs: m22s5_propose_trade_carries_the_deletion_gate (statement pin, `)?;` suffix).
pvp_tests.rs: m22s5_challenge_pvp_carries_the_deletion_gate, m22s5_accept_challenge_carries_the_deletion_gate.
12-mutant register (ledger X6): M1 drop propose call (→propose pin), M2 challenge gate after insert
(→order), M3 re-derive in guards (→no-rederive), M4a negate fused arg (→fused), M4b invert
deletion_gate body (→truth table), M5 gate respond_trade (→census), M6 wrong tag (→tags), M7 far-hop
break (→far-hop), M8 if-false accept call site (→accept pin depth), M9 accept gate after
start_pvp_battle (→order), M10 decoy comment (→propose pin), M11 hollow wrapper (→fused), M12
`let _ =` discard (→propose pin/tags). Orchestrator applies one at a time, verifies the patch
applied, records designated failing test + line, reverts ONLY the mutated path.
Guard doc comments in guards.rs avoid the literal banned tokens (prose only, e.g. "deletion-gated").

## Ledger

X1 wiring battery / X2 delegation battery / X3 census+order+purity / X4 PRV1-10 / X5 message+log /
X6 MANUAL mutant register / X7 full module suite / X8 just lint / X9 knowledge+adr-digest / X10 just ci
(nextest -E 'test(a) + test(b)' idiom; EXPECT `N tests run: N passed`; node-e split-string wrappers;
EVIDENCE: pending on every CHECK gate; DEFER lines for PRV1-7-crate-wide + start_battle/buy/sell).
mr-gates check runs FROM the worktree; mr-gates env node is v18.

## Sequencing / ops

1. wip-commit plan+ADR (this checkpoint) → 2. tester (opus) → RED proof → commit tests →
3. specialist red→green (fast gate: clippy -p monster-realm-module + nextest -p) → 4. mutant loop →
5. impl lenses (reviewer + /simplify + red-team artifact pass + reducer-security-auditor +
desync-guard) + verifier → 6. docs (knowledge regen AFTER final source commit; adr-digest) →
7. full `just ci` ONCE (check ps for sibling m22-s4 spacetime lock first!) → mr-gates check →
8. PR (Items: none; touches-delta; boyscout-delta; mr-gates render --format pr) → STOP (no merge).
