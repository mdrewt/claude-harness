# rb-46 plan (v2, post plan-review) — deletion gate reaches PvE battle start + shop buy/sell (R-m22-s5-X12)

Branch `feat/rb-46-deletion-gate-battle-shop`, worktree `.claude/worktrees/rb-46`, fork `origin/master@4b4ab4b`
(master CI green). ADR **0236** (supervisor-assigned; max on disk at fork = 0235). Ledger
`memory/projects/gates/rb-46.gates.md` (E1 seeded + X1-X6 authored). Tier HARD (tester = opus).
Lenses run on the plan: planner (opus) · researcher pin-inventory · reviewer (opus) · red-team (opus) · /simplify.

## Scope
Insert `crate::guards::require_not_deleting(ctx, "<reducer>")?;` (existing caller-only wrapper, guards.rs:111 —
its body is pinned byte-for-byte by guards_tests m22s5; NEVER edit guards.rs) as the first STATEFUL check in
`battle::start_battle`, `economy::buy`, `economy::sell`, and (D-c, disclosed extension) dev-only
`battle::start_wild_battle`. pvp.rs untouched (ADR-0227 D5). Proof-of-teeth = ordinary `#[test]`s
(ADR-0224: no new evals, no growing one). Close R-m22-s5-X12 via `mr-gates residuals close --slice rb-46 --pr N`
(requires the ledger fully resolved). Declared touches: server-module/src/{battle,economy,battle_tests,
economy_tests,guards,guards_tests}.rs, docs/adr/** (0236 + ADR-0227 back-link/amendment), companions
docs/knowledge/** (regen), ARCHITECTURE.md (minimal). account-e2e drives none of buy/sell/start_battle/
start_wild_battle (its S9 wild battle comes from grass walking = the ungated scheduler path) → no e2e exposure.

## SPIKE-0 (done, worktree, reverted) — behavioral teeth are viable
Under `crate::native_host_tests::fixture()` (rb-41) the shipped reducers are directly callable and the reject
path (`log_reject` → `log::warn!`, no logger installed natively) does NOT abort. Pre-gate results with no
account row / Active / PendingDeletion: `buy(&ctx,1,1,1)` → `Err("shop 1 does not stock item 1")`;
`sell(&ctx,1,1)` → `Err("unknown item 1")`; `start_battle(&ctx, me, vec![1], vec![2])` →
`Err("party monster 1 not found")`; `guards::require_not_deleting(&ctx,"x")` with a PendingDeletion row →
`Err(REJECT_DELETION_GATED)`. Why the pre-gate path never aborts: `datastore_index_scan_point_bsatn` returns
EMPTY for any unregistered index (native_host_tests.rs:311-319), so `is_in_ongoing_battle`'s two filters,
`monster().monster_id().find`, `shop_item_row().shop_id().filter`, `item_row().id().find` all no-op; the
first write is never reached. `Fixture::table` keys rows by Identity bytes only → u32/u64-keyed indexes can
never be seeded. `ctx.sender()` = `Identity::__dummy()` = all-zero = `WILD_IDENTITY` (lib.rs:89) — harmless
(start_battle's provenance rule admits `me`), disclose in docstrings. Honest RED = "a deletion-gated caller is
admitted past every caller-standing check into content lookup"; the gate-after-write mutant is owned by the
source pins. Writes/full-table iters abort the PROCESS (uncatchable) — never rely on `#[should_panic]`.

## Placement (final)
- **D-a `start_battle`** (battle.rs): after the dedup HashSet block (:113), immediately before
  `if is_in_ongoing_battle(ctx, me)` (:117). The gate is a DB read: it must not precede the pure O(1)
  `check_party_size` caps (M8.5a "before any DB read", = ADR-0166 D3), the pure provenance (:88) or dedup
  checks. `start_battle` has NO caller-standing guard (the provenance check validates the `opponent_identity`
  ARGUMENT) — so the anchor here is "first DB read", not ADR-0227's "after standing"; record that in ADR-0236.
  Pins: `opponent_identity!=me` < gate < `is_in_ongoing_battle(ctx,me)` (first-DB-read property, message
  precedence only) < `battle().insert(` (the ONE load-bearing write anchor; `seen.insert(` is a HashSet and
  unreachable by a `().insert(` needle). Oracle check: a deletion-gated caller naming a foreign opponent gets
  the provenance error first — both errors are caller-relative, nothing about a third party is disclosed.
- **D-b `buy` / `sell`** (economy.rs): immediately after `require_owner(ctx, "buy"|"sell", p.identity)?;`
  (:112 / :199), before `if qty == 0`. Standing is established exactly there; a DB read already precedes
  `qty == 0`; preamble reads joined → owner → not-deleting (ADR-0227 D3). `require_owner` stays the FIRST call
  (shop-reducer-security pins it). Pins: `require_owner(ctx,"buy",p.identity)?;` < gate < `ifqty==0`
  < `spend_currency(` (buy) / `consume_one(` (sell).
- **D-c `start_wild_battle`** (dev_reducers-only, battle.rs:531): GATE IT, structure-pin only, after the
  joined-check `let Some(player) = … else {…};` block, before the `character` lookup (challenge_pvp "Guard 1a
  after guard 1" precedent). Not in the default test build; `clippy --all-targets --all-features` typechecks
  it and CI's dev wasm build (ci.yml:157; ADR-0086 publishes it for e2e) compiles it. Disclosed as ledger X6 +
  ADR-0236 D3. rustfmt: `crate::guards::require_not_deleting(ctx, "start_wild_battle")` is 61 chars >
  fn_call_width 60 → it WILL wrap vertically with a trailing comma (pvp.rs:1004 `"accept_challenge"` = 60
  stays inline); the pins must accept the trailing-comma form. start_battle (56) / buy (47) / sell (48) inline.
- **D-d grass path** `movement_tick → begin_encounter` (movement.rs:465): opens a wild battle for a mid-grace
  walker; `ctx.sender()` there is the database identity so the caller-only gate is structurally wrong
  (ADR-0227 D2/D4); movement.rs out of touches → disclosed residual → `mr-gates residuals add` → backlog,
  joined to the [DEL-06]/S6 enforcement residual (ARCHITECTURE.md:524-526).
- Doc-comment accuracy: buy/sell "Server flow" numbered lists gain the gate step; start_battle gets one `///`
  line. Never write the needle in a `//` comment inside the reducer files (census counts it — stripped, but
  keep the discipline); no raw strings, no `'"'`/brace char literals in new prose.

## Test design — EIGHT `rb46_` tests (tester writes; all RED at HEAD)
Shared fixture rules: handles from ONE `Fixture` (they borrow it); build account rows with the shipped pure
constructors `crate::accounts::new_account_row(me, String::new(), 0)` → `requested_deletion(row, 1)` →
`terminal_account(row, 2)` (never an `Account {..}` literal); every identity derived from `ctx.sender()`;
`seed` PUSHES (no upsert; a duplicate PK makes `find` assert "cannot return more than one row") so
progressions `remove(me)` and assert `== 1` between states; NEVER `ctx.db.x().insert(` in tests; fully
qualified paths, no new `use` lines; needles built with the split idiom
(`["crate::guards::require_not_", "deleting("].concat()`) — house style, and it keeps every test file
decoy-free for whole-crate concatenating scanners (battle-reducer-security sorts files, so the real hazard is a
file sorting BEFORE the production file; hygiene anyway). Squash stage is EXPLICIT: battle_tests
`squash_ws`(:2498) over `fn_body(name)` (fully stripped, quotes blanked) → needle
`crate::guards::require_not_deleting(ctx,)?;` or trailing-comma `…(ctx,,)?;`; economy_tests `compact_ws`
(:1480) over the existing strippers (`strip_rust_strings_economy` KEEPS quotes but discards payloads, and it
SHRINKS the source so views are not offset-transferable) → needle `…(ctx,"")?;` / `…(ctx,"",)?;` with the
blank literal built from `char::from(0x22u8)` (pvp_tests `m22s5_blank_string_literal`).

1. `rb46_gated_reducer_census_battle_and_economy` (guards_tests.rs) — REUSES the proven m22s5 machinery
   (`m22s5_stripped_squashed`, `m22s5_reducer_bodies`, `m22s5_strip_comments_only`/squash, the
   scan-preconditions) over NEW `include_str!("battle.rs")` / `include_str!("economy.rs")` consts (both files
   verified: zero block comments, zero deep raw strings, zero brace/quote char literals, only bare
   `#[spacetimedb::reducer]` attrs; the `#[cfg(feature)]` on start_wild_battle sits ABOVE the reducer attr, so
   the extractor's "attr immediately followed by fn" precondition holds). Asserts per file: gated SET
   (reducer bodies containing the qualified `…deleting(ctx,` needle) == {start_battle, start_wild_battle} /
   {buy, sell} — missing AND extra both listed; whole-file BARE-NAME count (`require_not_deleting` on the
   stripped squashed view) == 2 per file (closes helper gating, an alias, a `require_not_deleting_for`
   sibling, a duplicate — a sibling fn in guards.rs with zero callers dies to clippy dead_code anyway);
   tag pins on the comments-only squashed view: `crate::guards::require_not_deleting(ctx,"start_battle")?;`
   == 1, `…"buy")?;` == 1, `…"sell")?;` == 1, and `…"start_wild_battle")?;` + trailing-comma form summing to
   1; bypass bans == 0 in both files: `crate::accounts::is_pending_deletion(`, `should_reject_for_deletion(`,
   `ctx.db.account(`, `cfg_attr(`, `::reducer as` (all 0 at HEAD). Add a comment-only cross-reference near
   the m22s5 census noting "exactly three" is scope-local (the crate-wide caller set is now 4 → 8).
2. `rb46_start_battle_is_refused_only_while_the_caller_is_deletion_gated` (battle_tests.rs, behavioral):
   register `account`; 5 states — no row → `Err("party monster 1 not found")` (exact string); Active row →
   same; `remove==1`, PendingDeletion → `Err(REJECT_DELETION_GATED)`; `remove==1`, terminal (PendingDeletion +
   marker via `terminal_account`) → same; `remove==1`, no row → ordinary error again. Kills: dropped gate,
   `let _ =`, `if false`, constant reject / inverted polarity, sender==WILD_IDENTITY-keyed or
   row-exists-keyed fakes (the Active state), latched answer.
3. `rb46_start_battle_carries_the_deletion_gate` (battle_tests.rs, structural, via the per-file helper
   `rb46_assert_gate_pinned(fn_name, before, after, write)` — a plain fn, NOT a `#[test]`): on the squashed
   fully-stripped body: needle (plain + trailing-comma) count == 1; the statement carries `?` (needle ends
   `)?;`); brace depth 0 at the needle; the char immediately preceding the needle is `;` or `}` (or offset 0)
   — kills `#[cfg(test)]`/`#[cfg(debug_assertions)]`/`#[cfg(not(wasm32))]` on the statement (RED-TEAM
   CRITICAL: with `#[cfg(test)]` every test is green and the wasm ships ungated), `let () = …?;`,
   `.and(…)`, and a token-swallowing macro `ignore!(…)`; body contains no `#[` and no `cfg!(` (precedents
   shop-reducer-security:302-304, ranking-security D_CFG_ATTR); BARE-name count == 1 in the body (kills the
   `require_not_deleting_for(ctx, opponent_identity)` third-party sibling, which the behavioral test cannot
   see because the dummy sender == WILD_IDENTITY == the only admissible opponent); every anchor occurs
   EXACTLY once (anti-vacuity); brace-char-literal ban (`'{'`/`'}'`/`'"'` — battle's stripper has no char
   lexer); order `before < gate < after < write`. Anchors: `opponent_identity!=me`,
   `is_in_ongoing_battle(ctx,me)`, `battle().insert(` (all measured ×1 at HEAD; `#[`=0).
4. `rb46_start_wild_battle_carries_the_deletion_gate` (battle_tests.rs, same helper): anchors
   `player().identity().find(me)` < gate < `character().entity_id().find(` ; effect `begin_encounter(`
   (each ×1). Trailing-comma form is what rustfmt will produce here.
5. `rb46_buy_is_refused_only_while_the_caller_is_deletion_gated` (economy_tests.rs, behavioral): register
   `account` + `player`; seed ONE Player row for `me` (`entity_id` any, `name` empty, `online` true,
   `last_input_seq` 0) so the joined check passes; same 5-state progression; ordinary error exactly
   `"shop 1 does not stock item 1"` (an exact string so a "not joined" regression cannot masquerade).
6. `rb46_sell_is_refused_only_while_the_caller_is_deletion_gated`: ditto with `sell(&ctx, 1, 1)`; ordinary
   error exactly `"unknown item 1"`.
7. `rb46_buy_carries_the_deletion_gate` (economy_tests.rs, per-file helper with the same clause set as #3,
   on `compact_ws` of the existing stripped view): anchors `require_owner(ctx,"",p.identity)?;` (on the
   stripped view the tag is blanked — verify the exact spelling the stripper yields) < gate < `ifqty==0` <
   `spend_currency(`.
8. `rb46_sell_carries_the_deletion_gate`: anchors `require_owner(ctx,"",p.identity)?;` < gate < `ifqty==0`
   < `consume_one(`.
NOTE the split: tag pins + set/count census live in guards_tests.rs (one proven pipeline, no re-derived
strippers — /simplify + reviewer M2); per-site order/depth/reachability pins + behavioral tests live beside
the reducer (the m22-s5 pvp_tests/trading_tests split). Positive-control clauses (no row / Active / removed)
are green at HEAD by design inside otherwise-red tests. `Active + terminal marker` (illegal shape) is
accounts' truth-table territory (`should_reject_for_deletion`, accounts_tests) and unconstructible here
(`terminal_account` debug-asserts legality) — say so in ADR-0236 rather than leave it looking like a gap.

## Mutant register (ledger X5, MANUAL; evidence `memory/projects/gates/rb-46.red-before.md:<line>`)
M1 drop start_battle gate → #2 + #3 · M2 drop buy → #5 + #7 · M3 drop sell → #6 + #8 · M4 drop
start_wild_battle → #4 + #1 (set + count) · M5 `let _ =` in buy → #5 + #7 · M6 wrong tag `"sell"` in buy →
#1 (tag pins; behaviour blind) · M7 gate below `spend_currency(…)?;` → #5 (shop error precedes) + #7 (order;
nothing aborts — `spend_currency` returns `Err("no wallet")` before any write) · M8 `if false {…}` wrap →
#3/#7 (depth) + #2/#5 · M9 gate `submit_attack` → #1 (set + file count) · M10 gate `spend_currency` helper →
#1 (bare-name count 3) · M11 `use crate::guards::require_not_deleting;` + unqualified call → #3/#7
(qualified needle 0) + #1 · M12 duplicate call → #3/#7 (count) + #1 · M13 delete + decoy `//` comment → #3/#7
+ #1 (comments stripped) · M14 constant reject at a call site → positive-control clauses of #2/#5/#6 ·
M15 `#[cfg(test)]` on the gate statement → #3/#7 (predecessor char `]`, `#[` ban) · M16 sibling
`require_not_deleting_for(ctx, who)` in guards.rs + extra call with `opponent_identity` → #3 (bare-name 2)
+ #1 (file count 3) · M17 `ignore!(…)` macro-swallow → #3/#7 (predecessor `(`). Third-party gating THROUGH
the shipped wrapper is unwritable by signature (ADR-0227 D2) — the ADR grounds caller-only in the signature
+ the pinned call text + the bare-name count, never in a behavioral proof.

## Pin inventory (researcher, verified) — SAFE / MUST-DO / MUST-AVOID
SAFE: guards_tests m22s5 census scans trading.rs+pvp.rs only; `.log-baseline` unchanged (log_reject, no bare
macro); currency-integrity ACCESSOR_BYPASS untouched; no whole-file hash/frozen pins on battle.rs/economy.rs;
no `#[cfg` ban covering start_wild_battle; every line-number citation into battle.rs/economy.rs is prose-only;
no `#[test]`-count census on battle_tests/economy_tests; shop-reducer-security's clauses (require_owner FIRST
and before spend/grant; headroom before spend/consume; no `cfg!(`/`#[cfg` in body) all hold.
MUST-DO: `just knowledge` LAST after the final `cargo fmt` + commit (pages start_battle, start_wild_battle,
submit_attack, swap_active, flee, use_battle_item, buy, sell restamp `resource:#L`/abstract; gate =
knowledge-bundle-conformance TOOTH B in `just eval`); `just adr-digest`; ADR-0227: add `**Extended-by:**
ADR-0236` header line (safe — Extends is unmodelled by adr-digest/backlink evals; no inbound line citations
exist) AND a dated `## Amendment (2026-09-04, rb-46 — residual R-m22-s5-X12 closed)` section discharging its
"Still-ungated §4.7 targets" bullet (rb-41 precedent; ledger X3 pins the heading); ARCHITECTURE.md:461-462
"remain ungated §4.7 targets" → corrected in place (do NOT de-enumerate) + a short rb-46 entry at the tail
(chronological; `ADR next-free = 0237`); mutant register file `memory/projects/gates/rb-46.red-before.md`
with per-row designated-test failure lines; residuals to REGISTER (`mr-gates residuals add`): grass-path
opener (D-d) and the pre-existing trading.rs:252 hole (its m22s5 pins have no `#[cfg`/predecessor-char
clause; pvp.rs sites are incidentally covered by ranking-security's body-wide `#[cfg` ban).
MUST-AVOID: editing guards.rs; a `use crate::guards::…` import; the needle in production comments; a second
fn-body enumerator in battle_tests (ADR-0003 — reuse `fn_body`/`extract_fn_body_range`); relaxing any pin to
get green (a test that cannot go green is a plan defect — re-derive from the spec).

## Ledger (authored; see rb-46.gates.md)
E1 nextest `-E 'test(/rb46_/)'` → `8 tests run: 8 passed`; X1 full nextest 0 skipped; X2 lint token; X3
knowledge-check + adr-digest-check + ARCHITECTURE grep + ADR-0227 amendment heading; X4 full `just ci` token;
X5 MANUAL mutants; X6 start_wild_battle pin by name (D-c disclosure). Run `mr-gates check --slice rb-46
--timeout 1800` FROM the worktree (default check_timeout_s = 120 would kill X1/X4).

## Order of operations
plan checkpoint (ADR-0236 draft + digest, wip commit + push) → tester writes the 8 tests (staged; orchestrator
applies) → RED evidence captured → 4 gate lines + doc comments → `cargo fmt --all` → `just ci-fast
monster-realm-module` → nextest E1 + full → 17 mutants one at a time (scripted, reverting each) → `just eval`
→ commit → docs (ADR-0236 final, ADR-0227 amendment + back-link, ARCHITECTURE.md) → `just adr-digest` →
`just knowledge` → commit → review lenses (reviewer, /simplify, red-team, reducer-security-auditor;
desync-guard SKIPPED — no game-core/wasm/movement surface, say so; verifier) → detached `just ci` →
`mr-gates check --timeout 1800` → PR (touches-delta, boyscout-delta, Items:, rendered ledger line) →
`mr-gates residuals close --slice rb-46 --pr N` → handoff.

## v2 test revisions (post tests-review: reviewer + artifact red-team, both opus, 2026-09-04)
- CORRECTION to "Placement D-c": rustfmt `fn_call_width` bounds the ARGUMENT LIST, not the call expression;
  `ctx, "start_wild_battle"` is 24 cols → ALL FOUR sites stay inline (red-team ran `cargo fmt` on the
  canonical impl). Pins accept the trailing-comma form only as future-proofing.
- CRITICAL bypass measured green against v1 (red-team R1): a depth-0 early `return` ABOVE the gate delegating
  to an ungated twin — `if me != crate::WILD_IDENTITY { return buy_inner(..) }` (the native sender IS all-zero)
  or a file-scope `#[cfg(debug_assertions)]` const steering a `return` (tests build debug, wasm is release).
  Clause I added to both helpers: in the prefix before the gate, count(`return`) == count(`returnErr(e);`)
  (start_battle 5/5, start_wild_battle 1/1, buy 0/0, sell 0/0). Residual: a macro_rules! conditional return.
- R2 (HIGH, out of touches): `lib.rs` `#[cfg(target_arch)]`-selected `mod guards` swap → disclosed residual
  (touches-delta audit + reviewer checklist), no scanner (ADR-0224).
- R3: behavioral tests now seed a STRANGER PendingDeletion row throughout (kills a table-keyed gate).
- M-2: quote landmine checked on the RAW file (tautological post-strip); m-1: clause B deleted (A ∧ F imply
  it); R6: battle helper gains the `n_decl == 1` precondition; n-2: body dump truncated to 400 chars; m-2/m-3
  wording (consume_one lives in inventory.rs; "no NEW pre-check datastore exposure").
- Register grows to 20: M18 `is_pending_deletion` → `.is_some()` (row-exists fake; kills state 2), M19 memoised
  verdict (kills state 5), M20 sender-keyed early-return twin (kills clause I), M21 cfg-const early-return twin
  (clause I). ADR-0236 D4 + Consequences updated accordingly.
