# 13r-h — Rust test-mirror parity tail — Plan + Tasks (planner output, 2026-08-15)

**Repo:** `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm` (master `6469503`; worktree `.claude/worktrees/13r-h`, branch `feat/13r-h-test-mirror-parity`).
**Complexity:** LIGHT · **Ceremony:** HARD · **Spec:** harness `specs/monster-realm-v2/M-postgate-thirteenth-review-residuals.spec.md` §13r-h · **Wound source:** `docs/adr/0179-accounts-auth-implementation-design.md` §amendment 9.

## 0. Recommended workflow

solo (tester → specialist, sequential) + ONE scoped red-team pass on the two *new* gates (W1 enumerator, W3 struct-shape tripwire) — cheat-writing, not re-reading (harness lesson `red-team-tests-by-writing-the-cheat`).

## 1. Scope boundary (STOP list)

In-bounds: `server-module/src/accounts_tests.rs`, `server-module/src/evolution_tests.rs`, `server-module/src/accounts.rs`, `server-module/src/schema.rs`, `docs/adr/0195-*.md` (+ generated `docs/adr/DIGEST.md`), `docs/knowledge/**` (regen only), `ARCHITECTURE.md` (one paragraph).

Hidden-dependency STOP: `evals/**` (incl. baselines), `client/src/module_bindings/**`, `server-module/src/observability.rs`, `server-module/src/pvp_tests.rs`, `justfile`, `CHANGELOG.md`, `docs/adr/README.md`.

Explicit non-goals (name in PR body): tombstone rating re-anchor (issue #307 / OQ2); G12 identifier-list parity; `write_target_accessors` unbounded `rfind`; the `accounts_tests.rs:30-36` BLOCKED-vs-EXEMPT note; `//`-before-strings stripper ordering in wallet-privacy/ranking-security/currency-integrity; shared Rust scanner extraction; **no enum fold** (ADR-0195 D1).

## 2. EARS acceptance criteria

### Wound 1 — G2 dynamic reducer enumeration (accounts_tests.rs:1517-1535)
- W1-1: G2 mirror SHALL derive the reducer set by enumerating every `#[spacetimedb::reducer`-attributed fn in ACCOUNTS_RS; no hardcoded needle list.
- W1-2: WHEN enumeration yields zero reducers, the test SHALL fail loud (Rust twin of `[R/name-set]`), never pass vacuously.
- W1-3: WHEN a reducer is added/removed, the test SHALL fail on an EXACT (sorted, set-equality) name-set pin until consciously updated.
- W1-4: WHEN any enumerated reducer declares a param whose type text contains `Identity` (incl. `Option<Identity>`, `Vec<Identity>`, tuples), the test SHALL fail naming the reducer + signature.
- W1-5: IF text between a reducer attribute and its `fn` is anything but optional `pub`/`pub(crate)`, OR parens are unbalanced, the enumerator SHALL panic loud — never `continue`.
- W1-6: The attr match SHALL accept only `#[spacetimedb::reducer]` and `#[spacetimedb::reducer(` (parity with parseReducers' `]`/`(` guard).
- W1-7: Structural markers in test strings SHALL be `concat!`-fragment-assembled; no unpaired `/*`; no `'"'` char literals (0x22 constants).
- W1-8: The rewrite SHALL still cover the original five reducers — coverage may only widen.

### Wound 2 — derived scheduled-scan set (evolution_tests.rs:2591)
- W2-1: Scan set derived by recursive `read_dir` of `CARGO_MANIFEST_DIR/src`, `*.rs` minus `*_tests.rs`, sorted, `Vec<(String,String)>` (pvp_tests.rs:1470 `collect_scan_sources` shape).
- W2-2: ANY IO failure SHALL panic loud — never skip a path.
- W2-3: Discovered scheduled-reducer names SHALL contain all SEVEN anchors: movement_tick, pvp_deadline_reaper, battle_challenge_reaper, trade_offer_reaper, playtest_reaper, **guest_claim_reaper**, **mr_heartbeat**.
- W2-4: IF a discovered scheduled reducer's body is not found in the derived set, panic with a derived-scan remedy message (replace stale text at 2789).
- W2-5: The two newly covered reducers' extracted bodies SHALL be non-empty AND contain a known anchor call (`guest_claim_reaper` → `delete_claim(`; `mr_heartbeat` → `mr_log(`) — guards the `observability.rs:67` `'}'` char-literal brace-walk truncation hazard.
- W2-6: Coverage guard SHALL be a BASENAME anchor set (≥ accounts.rs, observability.rs, movement.rs, playtest.rs, pvp.rs), never a `>= N` count floor.
- W2-7: Existing EG2-9 teeth survive unweakened: both vacuity guards, `L1_ALLOWED = ["write_back_battle_results"]` single entry, direct-call + one-hop assertions.
- W2-8: Dead `PLAYTEST_RS_SOURCE` const + comment (1484-1486) deleted (clippy `-D warnings`).

### Wound 3 — Account illegal states (schema.rs:708-725 / accounts.rs)
- W3-1: ONE pure predicate in accounts.rs over `&Account`: Active ⇒ deletion_requested_at_ms None; PendingDeletion ⇒ Some; `claimed_from.is_some() == claimed_at_ms.is_some()`.
- W3-2: All FIVE Account-returning pure constructors (new_account_row:113, touch_login:127, requested_deletion:164, cancelled_deletion:174, claimed_account:183) SHALL `debug_assert!` the invariant on the returned value.
- W3-3: Release wasm: invariant compiles out; no behavior change (precedent observability.rs:82 debug_assert).
- W3-4: WHEN Account field list OR AccountStatus variant list changes, tripwire SHALL fail by EXACT equality with an "extend the invariant" message.
- W3-5: Account doc comment names the invariant fn + tripwire test, placed in the EXISTING outer doc block — struct body region stays byte-stable (bsatn-compat-smoke parses it).
- W3-6: A constructor mutated to mint an illegal pair SHALL fail at least one EXECUTED test under `cargo test` (debug).
- W3-7: Predicate mutated to constant `true` SHALL fail a direct unit test (release-proof, mutation-cap defense).
- W3-8: `just knowledge` regen AFTER the code commit (bundle stamps gitDate(schema.rs), pins schema.rs#L709 + six accounts.rs line pins); `just knowledge-check` green.
- W3-9: Existing `auth6_no_email_or_subject_stored` ban-list scan remains — shape pin is additive.

## 3. Ordered tasks (tester vs specialist)

- C1 (orchestrator/doc-keeper): ADR-0195 (outline §6) + `just adr-digest` (DIGEST.md regen → touches-delta).
- C2 (tester, evolution_tests.rs): pre-change GREEN proof of T6/T7 first (orchestrator); port derived scan; update eg2_9 anchors to seven + basename guard + body anchors; replace 2789 message; delete PLAYTEST_RS_SOURCE. Leave A3 set (2984-2992) alone.
- C3 (tester, accounts_tests.rs): enumerator helper next to extractors (~250); rewrite G2 to consume it; separate `g2_reducer_name_set_is_pinned` exact-set test; machinery self-teeth on synthetic fixtures (two-reducer fixture w/ decoy + empty fixture).
- C4 (tester, accounts_tests.rs): `auth_account_state_invariant_table` (table-driven over predicate — compile-RED until specialist ships fn); `auth_constructors_return_legal_states`; `schema_account_struct_shape_tripwire` (auth6 extraction shape, exact-equality field body + AccountStatus variant pin).
- C5 (specialist, accounts.rs + schema.rs): pure predicate beside pure seams; bind-assert-return in all five constructors (no field-expression changes); extend Account outer doc block.
- C6 (orchestrator): fmt → commit → `just knowledge` → commit bundle; ARCHITECTURE.md one paragraph next to the source-scan section (~178); full `just ci`.

## 4. Proof-of-teeth (T1-T18) — mutation → expected RED

T1 add reducer w/ `target: Identity` → G2 names it. T2 add clean reducer → name-set pin RED (**pre-change GREEN recorded first — the wound proof**). T3 `Option<Identity>` param → RED (beats old `:Identity` substring). T4 comment out all reducer attrs → loud empty-set fail. T5 `#[allow(...)]` between attr and fn → enumerator panics loud. T6 direct `accrue_quality_time(` call in guest_claim_reaper → EG2-9 names it (**pre-change GREEN first**). T7 same in mr_heartbeat (temp mutation of out-of-touches file, reverted, never committed) → EG2-9 names it (**pre-change GREEN first**). T8 rename mr_heartbeat → seven-anchor guard RED. T9 scan path mutated to bogus dir → loud IO panic. T10 `s.push('}')` inside mr_heartbeat before mr_log → body-anchor RED (char-literal truncation caught). T11-T14 constructor mutations (wrong status/dropped ts/half-set claim) → debug_assert/legality RED. T15 predicate → `true` → direct table test RED. T16 append `pub grace_until_ms: Option<i64>` to Account → tripwire RED. T17 add `Deleted,` variant → variant pin RED. T18 (red-team) tripwire rewritten `.contains` → T16 goes GREEN (documents the cheat; revert).

Post C2/C3: full `cargo test` re-run proving no pre-existing test weakened.

## 5. Anti-patterns

Vacuous-green: zero-yield derivations passing; `>= N` count floors; `.contains` where shape-pin; self-fulfilling pins (expected list must be a hardcoded literal); empty/truncated body extractions without positive anchors; `if let Some(body) = … { assert! }` (use expect/panic).
Scan-hazards: contiguous structural markers in test strings (concat! always); no unpaired `/*`; no `'"'`/`'{'`/`'}'` char literals in scanned files; do NOT touch `strip_comments_and_strings`/`stripped_for_scan` (shared, high blast radius).
Weakening: nothing added to L1_ALLOWED (verified: no newly scanned file calls growth helpers — L1 unchanged); anchors extend to seven (not replace); auth6 stays; A3 hardcoded set stays; G2 must not become a smoke test.
Slice-discipline: no enum fold; no new shared scanner abstraction; no Result/runtime-assert invariant; no CHANGELOG/README hand-edits.

## 6. Risks

1. observability.rs:67 `'}'` char literal truncates build_log_line stripped body (benign today; W2-5 anchors are the proof). Do not edit observability.rs.
2. `//` in string URLs blanks line remainders in newly scanned files — re-verify via body anchors; fixing the stripper is a non-goal.
3. Mutation cap: T15's direct table test is mandatory (predicate mutants).
4. Knowledge regen ordering: fmt → commit → `just knowledge` → commit bundle; `just knowledge-check` gates.
5. DIGEST.md regen goes in touches-delta.
6. Dead PLAYTEST_RS_SOURCE → -D warnings RED if forgotten.
7. debug_assert teeth are debug-profile-only; legality test + tripwire are the profile-independent teeth (say so in ADR consequences).
8. Five vs four constructors: use all five uniformly (ADR-0195 D3).
9. G2 name-set pin = intended maintenance tax (~zero this milestone).
10. Graphs index the canonical checkout, not the worktree.

## 6.5 ADJUDICATED PLAN-REVIEW DELTAS (2026-08-15, reviewer + red-team lenses — BINDING over anything above that conflicts)

1. **W1 upgraded to full checkNoClientIdentity parity (red-team BLOCKER).** The param rule is a POSITIVE wire-safe-scalar allowlist (String/bool/u8..u128/i8..i128/f32/f64, recursing through `Option<`/`Vec<`), NOT a `contains("Identity")` substring ban — this catches E1 struct-wrapped Identity (`ClaimTarget`), type aliases (`Ident`), and everything non-scalar with one rule. Plus: (a) scheduled-struct carve-out — a param typed as the struct mapped from `scheduled(<reducer>)` in ACCOUNTS_RS is exempt ONLY IF the reducer's squashed body contains the pinned scheduler guard `ifctx.sender!=ctx.identity(){return` (fragment-assembled); (b) IDENTITY_CTORS file-wide ban — squashed ACCOUNTS_RS must contain none of `Identity::from_hex(`/`from_byte_array(`/`from_be_byte_array(`/`from_str(` (fragment-assembled needles). New teeth: T-E1 (struct-wrapped-Identity reducer → RED), T-E2 (`Identity::from_hex` in body → RED), T-G (neuter the scheduler guard to the `let scheduler_only = ...; let _ = ...;` shape → RED).
2. **W1-5 REVERSED (reviewer MAJOR + red-team #4 agree):** tolerant walk-forward-to-next-`fn` (word-boundary in squashed text), exactly like parseReducers — `trading.rs:219-220` already stacks `#[allow(clippy::too_many_arguments)]` on a reducer. Panic loud ONLY when no `fn` follows the attribute. T5 becomes a GOOD fixture (attr + `#[allow(...)]` + `pub fn` → enumerated correctly). Add GOOD fixtures: trailing comma in a wrapped signature (skip empty segment after depth-0 comma split); `-> Result<Identity, String>` return type NOT flagged (params-only scope — return values are not client input; matches JS twin).
3. **W2 processed PER-FILE, never a joined blob (red-team MAJOR #3):** scheduled-name discovery, L1 fn-body enumeration, and body lookup all run per file with file attribution in every failure message. This structurally eliminates cross-file brace-walk bleed (a phantom-open `'{'` char literal near EOF would fuse files in a joined blob). A per-file net-brace-balance assert was REJECTED: `observability.rs:67`'s `'}'` char literal makes that file net-imbalanced today → false-RED. Residual local-truncation hazard (a phantom brace truncating its OWN fn's body) stays; W2-5 body anchors + ADR-0195 residual note cover it.
4. **Wound framing corrected (red-team MAJOR #2):** T2/T6/T7 are already caught by `just ci`'s eval stage (guest-claim-integrity + no-idle-accrual are fully dynamic). The wound is Rust-mirror/local-`cargo test`/mutation-suite parity — defense-in-depth, NOT a live unguarded hole. ADR-0195 consequences + PR body must say so. Pre-change GREEN proofs run against the Rust test binary only.
5. **Risk-1 mechanism corrected (reviewer MINOR):** `observability.rs:67` truncates `build_log_line`'s OWN stripped body only; `mr_heartbeat`'s extraction re-anchors fresh and is unaffected today. Masking risk is a growth-call hidden AFTER a phantom-close inside the same fn — named residual, W2-5 anchors are the cheap partial guard.
6. **PR body must explicitly surface:** the "eval-gated tripwire → Rust mirror test" spec deviation (reviewer MAJOR #2, defensible, ADR-0195 D2); the spec's stale `schema.rs:685-700` anchor (actual struct at 708-725); the E-shape defenses now ported (delta 1) and which JS-only defenses remain JS-only (none, after delta 1).
7. **Reviewer verified sound (no action):** five constructors complete + call-site legality traced (no legal path violates the invariant); W2-5 anchors real (`delete_claim(` accounts.rs:527, `mr_log(` observability.rs:126); L1 unchanged by the widened scan; PLAYTEST_RS_SOURCE dead-code claim precise; exact name-set pin correct parity.

## 7. ADR-0195 outline

Title: "Rust test-mirror parity: derived scan sets, source-derived reducer enumeration, and the Account legal-state invariant."
D1 no enum fold (non-additive column-type change per ADR-0006/0173 D5; module_bindings + two baselines outside touches; recorded so M22 picks it up deliberately). D2 gating mechanism is the Rust mirror test, not an eval (evals/ outside touches; wound class IS Rust-mirror weakness). D3 all five constructors carry the postcondition. D4 derived scan sets + named basename anchors, never count floors (extends ADR-0179 amendment 1's pvp_tests pattern). D5 source-derived reducer enumeration + EXACT name-set pin; param ban on `contains("Identity")`. D6 fail-loud everywhere.
Consequences: pin-update tax on new reducers (intended); EG2-9 covers 21 files, L1 provably unchanged; debug-profile caveat; regen obligations; named residuals still open.
