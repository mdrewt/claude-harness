# rb-76 — plan memo (residual R-rb-46-GRASSPATH; ADR-0246 pre-assigned) — v2 after plan review

Worktree: `projects/monster-realm/.claude/worktrees/rb-76`, branch `feat/rb-76-grasspath-deletion-gate`,
base origin/master@8b90b69. Planner: opus. Plan reviewer: opus (5 MAJOR, 5 MINOR, 4 NIT — all taken).
Plan red-team: opus (11 findings; #1 converged with the reviewer's M1). Orchestrator: fable@xhigh.
Design record: `docs/adr/0246-rb76-scheduler-opened-wild-encounter-is-a-gated-commitment.md` (worktree).

## Decision (D1)
A scheduler-opened grass-path wild encounter IS a §4.7 new battle commitment: refuse it for a
mid-grace/terminal walker. The walker's STEP still happens; only the encounter is refused, SILENTLY (like a
fainted party). Gating SERVES PRV1-10: an encounter opened mid-grace is a live battle the §4.4 cascade
would later have to boot.

## Seam (D2) — `guards.rs`, the first identity-PARAMETERISED wrapper, NON-LOGGING
```rust
pub(crate) fn require_subject_not_deleting(ctx: &ReducerContext, subject: Identity) -> Result<(), String> {
    deletion_gate(crate::accounts::is_pending_deletion(ctx, subject)).map_err(|e| e.to_string())
}
```
Insert immediately after `require_commitment_predates_deletion` (guards.rs ~:149) so the three deletion
wrappers stay contiguous. Doc comment: cites ADR-0246 D2; says it is the first identity-parameterised
wrapper, that ADR-0227 D2's structural caller-only guarantee is NOT claimed for it, that containment is a
crate-wide census (name the test), that it deliberately does NOT log (begin_encounter's contract: the
caller owns observability; a warn per refused encounter at ~1/s per deleting walker for 7 days would be
an unbounded client-triggered emitter — red-team #1 / reviewer M1), and that the body is byte-pinned.
Prose must avoid `/*`, `*/`, `r##`, the five banned account-state spellings, `#[cfg`.
- REJECTED: log_reject in the wrapper (3 envelope drifts + unbounded warn stream + retention of erased
  identities in the log — dissolves R-rb-76-ENVELOPE); runtime scope predicate (`ctx.database_identity()`
  is an unstubbed host syscall — MEASURED link failure `undefined symbol: identity`); witness type;
  stamp seam (pinned to one consumer; a grass encounter is opened NOW).
- Name is prefix-free vs `require_not_deleting` (battle.rs bare count must stay 2) and vs
  `require_commitment_predates_deletion`.
- Expected rustfmt: the declaration line is `pub(crate) fn require_subject_not_deleting(ctx: &ReducerContext, subject: Identity) -> Result<(), String> {`
  = 106 cols > 100 → rustfmt WILL break the params vertically (like `require_commitment_predates_deletion`).
  The body line `    deletion_gate(crate::accounts::is_pending_deletion(ctx, subject)).map_err(|e| e.to_string())`
  = 96 cols ≤ 100 with arg list 46 ≤ 60 → stays inline. VERIFY after `cargo fmt`; the equality pin must
  accept whatever rustfmt produces (squashed view is whitespace-free, so the decl break is invisible; the
  trailing-comma variant `(ctx,subject,)` must be accepted like the siblings' pins do).
  Squashed body (strings-blanked & comments-stripped view):
  `deletion_gate(crate::accounts::is_pending_deletion(ctx,subject)).map_err(|e|e.to_string())`
  Squashed signature: `pub(crate)fnrequire_subject_not_deleting(ctx:&ReducerContext,subject:Identity)->Result<(),String>{`

## Call site (D3) — `battle.rs` `begin_encounter`, the choke point both callers share
`crate::guards::require_subject_not_deleting(ctx, player_identity)?;` (73 cols, inline) after the pure
`check_party_size` + dedup block (after the `}` closing the dedup block, before the `// Reject if the
player is already in an ongoing battle` comment), immediately before `is_in_ongoing_battle` (first DB read)
— ADR-0236 D2. Short `//` comment citing ADR-0246 D3 (subject = server-derived `player_identity`, never
`ctx.sender()` which is the module identity on the scheduler path). Squashed (both views identical — no
string): `crate::guards::require_subject_not_deleting(ctx,player_identity)?;` (+ `(ctx,player_identity,)?;`).
Callers (both graphs + grep): `movement_tick` (scheduler) and dev-only `start_wild_battle` (already
caller-gated; its own gate fires first, its argument is `me == ctx.sender()`).
REJECTED: movement_tick pre-roll `continue` (account vocabulary in movement.rs; second consumer; grass
pins forbid `?`/`return`; keys on call path; CHANGES the per-tick `ctx.random()` draw count so one walker's
deletion state shifts later characters' seeds — the R-E coupling); gating both.

## movement.rs (D4) — routine skip, spelling FORCED by a prior pin
Inside `if let Err(e) = begin_encounter(..) {`, as a separate depth-0 statement IMMEDIATELY ABOVE the
existing `if e != NO_CONSCIOUS_MONSTER_REASON {`:
```rust
                // rb-76 (ADR-0246 D4): a deletion-gated walker is refused the encounter as ROUTINE
                // gameplay, like a fainted party — it must consume neither the error log nor the
                // limiter window (client-reachable at tick rate). Skips ONLY the log/limiter arm:
                // the encounter block is the last statement of the per-character loop. COUPLING:
                // keyed by equality on the ONE reason constant; a per-state reason split (ADR-0227
                // D2 deferral) must extend this skip and its pin in the same slice.
                if e == crate::guards::REJECT_DELETION_GATED {
                    continue;
                }
```
Fully qualified constant, `==`, `continue`, no `?`/`return`/`let _`. The existing contiguous needle
`ife!=NO_CONSCIOUS_MONSTER_REASON{ifletSome(suppressed)=BEGIN_ENCOUNTER_ERR_LIMITER.check(` stays
intact. Import line `use crate::battle::{begin_encounter, ...}` unchanged.

## Tests (tester writes — 6 `rb76_` tests; RED reasons at HEAD). Scan-substrate rules everywhere:
needles from `concat!`/`[..].concat()` fragments, no raw double-quote CHAR literal, no contiguous
block-comment markers, never spell `#[cfg` contiguously in prose. Reuse each file's OWN strip/squash
helpers (guards_tests: `m22s5_stripped_squashed`, `m22s5_comments_only_squashed`, `m22s5_squashed_fn_body`;
battle_tests: `MODULE_SOURCE`, `fn_body`, `fn_body_views`, `squash_ws`, `strip_rust_comments`,
`strip_rust_strings`; movement_tests: `squashed_movement`, `movement_tick_body`, `grass_region`).

guards_tests.rs:
1. `rb76_subject_gate_wrapper_is_declared_once_fused_and_unconditional` — RED (declared 0×, loud
   extraction failure). Clauses: `fnrequire_subject_not_deleting(` ×1 in squashed guards.rs; squashed
   SIGNATURE exactly `pub(crate)fnrequire_subject_not_deleting(ctx:&ReducerContext,subject:Identity)->Result<(),String>{`
   (accept the trailing-comma param form too); WHOLE-BODY EQUALITY against
   `deletion_gate(crate::accounts::is_pending_deletion(ctx,subject)).map_err(|e|e.to_string())` (accept
   `(ctx,subject,)`); body bans `iffalse`, `#[`, `cfg!(`, `log::`, `log_reject(`; prefix-freeness: the new
   bare name contains neither sibling name and neither contains it; AND the direct witness for ADR-0227 D2:
   squashed guards.rs contains `fnrequire_not_deleting(ctx:&ReducerContext,reducer:&str)->Result<(),String>`
   exactly once (green at HEAD).
2. `rb76_subject_gate_and_begin_encounter_are_contained_crate_wide` — RED (anti-vacuity: guards.rs
   bare-name count 0). Module list DERIVED from lib.rs `mod` lines exactly like
   `trading_tests.rs:5018 rb47_scanned_module_names` (copied, per the local-machinery convention), but
   seeded with `"lib"` and excluding ONLY `guards` and `*tests` (accounts and schema ARE scanned). Views:
   comments-stripped + strings-blanked + squashed per file. Clauses: (a) bare name
   `require_subject_not_deleting`: guards.rs = 1 (the declaration; the body does not recurse), battle.rs =
   1, every other module = 0; (b) `begin_encounter(` per module: movement.rs = 1, battle.rs = 2 (decl +
   start_wild_battle call), every other = 0 — and movement.rs must contain
   `usecrate::battle::{begin_encounter,` exactly once (the import binding); (c) bare name
   `is_pending_deletion`: allowed only in `accounts`, `guards`, `privacy` (assert each ≥1 for
   anti-vacuity: accounts ≥2, guards = 2, privacy = 1), zero everywhere else; (d) anti-vacuity: ≥10
   modules derived, list contains trading, pvp, battle, economy, ranking, privacy, movement, accounts;
   an unreadable module PANICS by name; (e) `#[path` attributes in lib.rs: every occurrence must be
   followed (next non-attribute, non-blank, non-comment line) by `mod <name>;` with `<name>` ending in
   `tests`, and at least one such attribute exists — the silent wrong-file-scan hole. Assertion messages
   must explain each clause's mutant.
3. `rb76_subject_gate_answers_from_the_named_subject` — COMPILE-RED at HEAD (symbol absent; house
   precedent). Executed under `crate::native_host_tests::fixture()` (if `crate::native_host_tests` is not
   reachable from guards_tests, put this test in battle_tests.rs instead — both in touches). Register the
   account table via `fx.table::<crate::schema::Account>("account", "identity", |r| r.identity)`. Stranger
   `[9u8;32]` mid-grace seeded throughout. Subject `[7u8;32]`. Matrix: subject no row → Ok; subject Active →
   Ok; SENDER's own row (ctx.sender(), all-zero) mid-grace while subject Active → Ok (kills sender-keyed);
   subject mid-grace (sender Active) → Err(REJECT_DELETION_GATED.to_string()); subject terminal → Err;
   subject row removed → Ok. Rows only via `new_account_row` → `requested_deletion` → `terminal_account`.
   Compare against the CONSTANT, never a retyped literal.
battle_tests.rs:
4. `rb76_begin_encounter_refuses_only_a_deletion_gated_walker` — RED: got
   `Err("party monster 1 not found")` for a mid-grace WALKER. Executed: walker `[7u8;32]`,
   `crate::battle::begin_encounter(&ctx, walker, vec![1], 1, 1, 1)`; ordinary =
   `Err("party monster 1 not found".to_string())`, gated = `Err(crate::guards::REJECT_DELETION_GATED.to_string())`;
   stranger mid-grace throughout; five walker states (no row/Active/mid-grace/terminal/removed) + the two
   controls: (i) SENDER's own row mid-grace while walker Active → ordinary; (ii) walker mid-grace while
   sender's row Active → gated. Doc comment: the write wall means the RED is "admitted into the party
   lookup", never "battle row written"; ordering is owned by test 5; the sender is all-zero ==
   WILD_IDENTITY so constant-keyed gates are the equality pins' job.
5. `rb76_begin_encounter_carries_the_subject_deletion_gate` — RED (0 statements). Re-derive locally (do
   NOT widen `rb46_assert_gate_pinned`). Clauses: 0a `pubfnbegin_encounter(`… NOTE begin_encounter is
   `pub(crate) fn` → use the squashed form `pub(crate)fnbegin_encounter(` — count 1 file-wide on the
   comments-stripped view (kills a decoy twin in the same file); 0b quote landmine on RAW source; 0c
   brace-char landmines on the body; A the statement `crate::guards::require_subject_not_deleting(ctx,player_identity)?;`
   (or `,player_identity,)?;`) exactly once in the string-blanked squashed body; F bare name
   `require_subject_not_deleting` exactly once in the body; E `#[` = 0 and `cfg!(` = 0 in the body;
   I-b PREFIX EQUALITY: everything in the squashed string-blanked body before the gate must equal EXACTLY
   `check_party_size(party_monster_ids.len())?;{letmutseen=std::collections::HashSet::new();for&midin&party_monster_ids{if!seen.insert(mid){returnErr(format!());}}}`
   — TYPE this literal from the current file (verify against battle.rs ~:397-406 after `cargo fmt`; never
   rebuild it from the file inside the test); C/D/I-a (depth 0, predecessor `}`, return census) are
   subsumed by I-b — include only if the doc comment says so and keep the messages sharp; G/H anchors each
   exactly once and ordered `check_party_size(` < gate < `is_in_ongoing_battle(ctx,player_identity)` <
   `battle().insert(`. Plus a one-clause PROSE rider on `rb46_assert_gate_pinned`'s clause F doc (zero
   assertion changes): begin_encounter now carries a subject-keyed sibling contained by census.
movement_tests.rs:
6. `rb76_grass_path_skips_the_deletion_refusal_before_the_limiter` — RED (0 skips). On
   `grass_region(movement_tick_body(&squashed_movement()))`: contiguous
   `ife==crate::guards::REJECT_DELETION_GATED{continue;}ife!=NO_CONSCIOUS_MONSTER_REASON{` ×1 (kills
   dropped / inverted / relocated / `&&`-folded / unqualified in one assertion); skip alone ×1;
   `REJECT_DELETION_GATED` file-wide in movement.rs ×1 (no decoy const, no second consumer); anti-vacuity:
   the existing filtered-gate needle (movement_tests.rs:2484-2491 shape) ×1, `BEGIN_ENCOUNTER_ERR_LIMITER.check(`
   ×1, `begin_encounter(` ×1 in the region. Doc comment: why (tick-rate client-reachable → limiter
   saturation masks faults), why `?`/`return` are forbidden here (`movement_tick_grass_block_never_aborts_the_tick`),
   and the reason-split coupling.
Also (prose only, zero assertion changes): a SCOPE rider in guards_tests.rs's rb-46 census comment
(~:2913-2917 and ~:3064-3076) noting that rb-76 ships a differently-named, prefix-free sibling this count
deliberately does not see, contained by its own census (test 2).

RED evidence protocol: tests 1,2,4,5,6 compile at HEAD → record their assertion-RED first (run with test 3
temporarily absent or `cfg`-free-commented); then add test 3 → COMPILE-RED record; then implement.

## Pins that must stay green (planner + red-team MEASURED on patched copies — all pass)
rb46 bare `require_not_deleting` in battle.rs = 2; 7 bypass bans = 0; m22-s5 marker ×1 + body equality;
5 re-derivation bans (strings-intact view); rb-47 stamp seam ×1 in guards.rs; `#[cfg` 1 / `#![cfg` 0 in
guards.rs; movement I3 = 5; grass-region `ctx.sender`/`player_identity()`/`BattleOutcome`/`?`/`return`/
`let_` = 0; `log::error!` = 4 body / 2 region; filter contiguity ×1; both `.check(` ×1; `.log-baseline`
rows unchanged; begin_encounter `with_lead` ×2; evals/battle-reducer-security C1 (containment) + C4
(insert sites = 3); observability-log-wrapper A6 envelope literal untouched.
NOT touched: pvp.rs, trading.rs, trading_tests.rs (its rb-47 prose is now false → residual
R-rb-76-RB47PROSE), accounts.rs, economy.rs, lib.rs, native_host_tests.rs, evals/*, ADR-0227.

## Anti-patterns
log_reject / any logging in the new wrapper; a `reducer` tag parameter; bool-returning identity oracle;
a 2nd consumer anywhere (pvp.rs keyed on the target; movement.rs); fn-pointer/`use`-alias consumers
(census needle is the BARE name); `let _`/`.ok()`/`.is_err()` discards; `&&`-folding the skip; re-deriving
the disjunction; consuming the stamp seam; a name containing `require_not_deleting`; any `#[cfg` in
guards.rs beyond the existing test-module line; new bare `log::`; `ctx.database_identity()` on an
executed path; re-gating start_wild_battle; `?`/`return` in the grass region; rebuilding the prefix
literal from the file inside the test.

## Mutant register: `memory/projects/gates/rb-76.mutants.py` (rb-46 shape; re-verify anchors with
--dry-run after cargo fmt). Includes the red-team's fn-pointer consumer, `use`-alias consumer, `#[path]`
module swap, cross-file begin_encounter twin, and the reviewer's log-added-back mutant.

## Ledger E1
CHECK: `cargo nextest run -p monster-realm-module -E 'test(/rb76_/)' 2>&1 | tail -3`
EXPECT: `/Summary \[[^\]]*\]\s+6 tests run: 6 passed/`

## Docs
ADR-0246 (done, v2: D1..D6, alternatives, residuals R-rb-76-REASONSPLIT, R-rb-76-RB47PROSE,
R-rb-76-CHALLENGERGRACE; is_pending_deletion crate-wide containment closed in passing by test 2(c));
ADR-0236 `Extended-by:` + dated amendment (done); ARCHITECTURE.md :476-477 + guards row (done — the
guards row text must be updated to the 2-arg non-logging shape); `just adr-digest` → `just knowledge`.

## Residuals to register at the end (mr-gates residuals add): R-rb-76-REASONSPLIT, R-rb-76-RB47PROSE,
R-rb-76-CHALLENGERGRACE.

## Task-0 link probe (executed 2026-09-11)
`fx.ctx().database_identity()` inside a native-host test → `rust-lld: error: undefined symbol: identity`
(PROBE-EXIT 101; /tmp/rb76-probe.log). Probe removed; worktree clean at wip 058331d.
