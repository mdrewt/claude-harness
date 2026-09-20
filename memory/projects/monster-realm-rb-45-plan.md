# rb-45 plan v2 — PRV1-7 / [DEL-06] crate-wide deletion-gate census (closes R-m22-s5-X11 + R-m22-s3b-X18)

Date: 2026-09-20 · branch `feat/rb-45-privacy-manifest-write-gate` · worktree `.claude/worktrees/rb-45` · ADR-0258
Tier HARD (fable@xhigh; planner/tester/red-team/reviewer opus). Budget target $150.
v2.2 (2026-09-20, post-impl reviewer+red-team+security): shape (b) = EXACT predicate call + non-Ok return; handle chains only in sanctioned positions (method receiver, bare-ident let init) else hard error; handle types in params/impl fns/type aliases refused; fn-pointer = any non-call-position path resolving to a crate fn; qself UFCS; body-level use-as/macros; crate-root mod accept-set incl. doc attrs and cfg(test)+anything; Scheduled exemption VERIFIES the scheduler guard as stmt 0 for writing non-owner scheduled reducers; roster class (v) ack_evolution_notices (ADR-0254 decision); residuals R-rb-45-DRAIN (13 class-iv) + R-rb-45-ONGOING-BATTLE registered. RECORD-AS-LIMIT: gate ARGS unchecked (rb-76 containment + ADR-0237 pins are the fence), macro-position writes (rb-78 anchors), impl/method delegation, directory modules.
v2.1 (2026-09-20): test red-team → alias rule = ADR wording, `mod` accept-set widened to the real crate's two test-mod shapes, test 10 pins the whole report, ordering tooth for shape (b), `?`/full-qualification teeth. Verifier must grep `mod census` for `super::` (forgery channel).
v1 → v2: plan reviewed by reviewer (SHIP-WITH-FIXES: B1-B4, M1-M8) + red-team (F1-F10 + coda); every accepted fix is folded in below.

## Frozen decisions
- ONE syn-based ordinary `#[test]` module: NEW `server-module/src/privacy_enforcement_tests.rs`; wired at EOF of `lib.rs`
  in the rb-77 three-line form (`#[cfg(test)]` / `#[path = "privacy_enforcement_tests.rs"]` / `mod privacy_enforcement_tests;`).
  `accounts.rs` / `accounts_tests.rs` NOT edited. No ARCHITECTURE.md row; no knowledge regen (okf-export excludes *_tests.rs).
- Same file: `mod census` engine (specialist) + `rb45_` tests and rosters (tester). syn features `["full","visit"]`.
- Corpus = ("crate", lib.rs) + every `mod x;` in lib.rs that is bare (no attrs) → `src/x.rs`, read via `env!("CARGO_MANIFEST_DIR")`.
  A `mod` carrying exactly `#[cfg(test)]` is skipped; ANY other attribute on a lib.rs `mod` (another cfg spelling, `#[path]`
  without cfg(test), etc.) is a hard error (F6). Fourth deliberate copy of the module-roster derivation (rb47/m22/rb76 have
  text-based ones) — ADR cites ADR-0166 R5; syn-based here.
- Classified = `crate::schema::DATA_LIFECYCLE_MANIFEST` policy ≠ NotOwned (24). Owners = `game_core::STATE_TRANSITION_OWNERS`.
- WRITE VERBS = insert | try_insert | update | delete | clear | insert_or_update | try_insert_or_update (F1).
  Write = `ExprMethodCall` with a write verb whose receiver chain (MethodCall receivers / Field bases / Reference / Paren / Try)
  contains a zero-arg method call named as a classified accessor, OR whose chain ROOT is a `let`-bound alias. ALIAS (v2.1, red-team MAJOR 1) = `let ident =
  <chain>` where the chain contains a classified accessor AND EVERY method call in the chain is zero-arg AND none is
  iter/count/len (so `let h = ctx.db.battle()` and `let h = ctx.db.battle().battle_id()` are handles; `let row =
  ….find(x).unwrap()` / `.iter()` are NOT — a non-zero-arg call anywhere disqualifies the chain), iterated to a fixpoint;
  the WRITE's chain root must be the alias IDENT itself (through `&`/parens only — `row.field.clear()` is a field, not a root). Writes on non-classified chains (HashMap::insert, `row.move_queue.clear()`, NotOwned tables) are not writes.
- TRANSITIVE over crate-local `ExprCall` path callees: `f` (same module first, else EVERY crate fn of that name; zero matches →
  a closure/Fn-param/foreign call, ignored), `m::f`, `crate::m::f`, `self::f`. Fixpoint over sets (cycles terminate). A
  `crate::`-rooted path with ≥2 module segments is a hard error (F7). Closure bodies are walked (Visit), so a writing closure makes
  its defining statement write-reaching (over-approx, safe).
- GATE (only two shapes, both fully qualified — ADR-0248 D1 / ADR-0246; B3+F5):
  (a) a depth-0 expression statement `crate::guards::require_not_deleting(..)?;` | `crate::guards::require_subject_not_deleting(..)?;`
      | `crate::guards::require_commitment_predates_deletion(..)?;` (Stmt::Expr(Expr::Try(ExprCall path == exactly those 3 segments)));
  (b) a depth-0 `if` whose condition is NOT a unary `!`, contains a call to `crate::accounts::is_pending_deletion` (or bare
      `is_pending_deletion` only when the scanned module is `accounts`), and whose then-branch's LAST statement is `return …`.
  Gated iff such a statement's index < the index of the first depth-0 statement that transitively reaches a classified write.
  A gate in a helper, in a nested block, under `!`, with a discarded verdict (`let _ = …;`, `.ok();`), or after the first write is NOT a gate.
- STRUCTURAL EXEMPTIONS (precedence Owner > Lifecycle > Scheduled > NoClassifiedWrites > Gated > Ungated):
  Owner = name ∈ owners; Lifecycle = the reducer ATTRIBUTE ARGUMENT is init | client_connected | client_disconnected (the fns are
  named init/on_connect/on_disconnect); Scheduled = the reducer's NAME appears as the ident inside `scheduled(<ident>)` of any
  `#[spacetimedb::table(..)]` attribute in the corpus (F4; not the param type). The real-crate test PINS the Lifecycle and
  Scheduled verdict sets EXACTLY (M4) so a new structural exemption is a conscious edit.
- HARD ERRORS (`CensusError`): Parse{module,msg}; MissingModuleFile{module}; DuplicateReducer{name}; UnsupportedShape{module,what}
  for: any `Item::Macro` in a scanned module (item-position macro invocation OR macro_rules! definition — M2/ADR-0248 family);
  any non-lib scanned module declaring a `mod` item (inline or file) not carrying `#[cfg(test)]` (F7; `#[cfg(test)] mod tests {}`
  in content.rs and `#[cfg(test)] #[path] mod x_tests;` are ACCEPTED and skipped); a lib.rs `mod` whose attribute set is anything
  other than exactly [] (scanned), [cfg(test)] or [cfg(test), path] (skipped) — e.g. `cfg(not(test))`, `path` alone (F6); `use … as …` (F9); a `let ident = <path>` whose path names a crate fn (fn-pointer binding, F9);
  an `impl` block containing a fn whose signature mentions `ReducerContext` (F8); a fn whose return type mentions `TableHandle`,
  `impl Table`, or `Table<` (F2 — handle-returning helper; `EncounterTable` must NOT match); an `ExprCall` with ≥2 path segments
  whose last segment is a write verb (UFCS `Table::delete(..)`, F3); an item attributed `#[procedure]`/`#[spacetimedb::procedure]`;
  a fn named require_not_deleting | require_subject_not_deleting | require_commitment_predates_deletion | is_pending_deletion |
  should_reject_for_deletion defined in a module other than guards/accounts (shadow, F5b).
- ROSTER `DELIBERATE_EXEMPTIONS: &[(&str, &str)]` (name, basis) in the test file; 25 rows in 4 basis classes. Real-crate test asserts
  Ungated set == roster names EXACTLY both directions + no duplicate rows; the failure message prints each Ungated reducer's
  `writes` + `via` so a widening is visible (F10 = recorded limit: the roster pins names, not write-sets). NEVER a count.
- Docs: ADR-0258 (Amends: ADR-0225, ADR-0228; Extends: ADR-0224, ADR-0227, ADR-0246, ADR-0248, ADR-0257; Subsystems
  security-authz, ci-gates; Decision ≤240 chars; alternatives cite ADR-0229; states the ADR-0224 delete-on-touch check: no eval
  encodes DEL-06 — grep `require_not_deleting|DEL-06|X18` over evals/ hits only a11y/nightly files — so nothing to delete).
  0225: insert `**Amended-by:** ADR-0258` + dated paragraph; 0228: append `, ADR-0258` to the EXISTING Amended-by line (M6) + dated paragraph.
- touches-delta (disclosed): server-module/Cargo.toml (+syn dev-dep), Cargo.lock (+1 line), docs/adr/0225, 0228, DIGEST.md (regen).
- Follow-up residual (register AFTER lenses, add-only): roster drain — gate the 14 KNOWN-GAP gameplay writers (each its own reject test).

## Frozen engine API (tester writes against this BEFORE the engine exists)
```
mod census {
  pub(super) const WRITE_VERBS: &[&str]
  pub(super) fn classified_tables() -> BTreeSet<&'static str>              // manifest, policy != NotOwned
  pub(super) fn real_sources() -> Result<Vec<(String, String)>, CensusError> // [("crate", lib.rs), (module, src)…]
  pub(super) fn census(sources: &[(String, String)], classified: &BTreeSet<&str>, owners: &[&str])
      -> Result<Report, CensusError>
  #[derive(Debug)] pub(super) struct Report { pub verdicts: BTreeMap<String, Verdict>, pub modules: Vec<String> }
      impl Report { pub fn ungated(&self) -> BTreeSet<&str>; pub fn names_with(&self, f: impl Fn(&Verdict)->bool) -> BTreeSet<&str> }
  #[derive(Debug, Clone, PartialEq, Eq)] pub(super) enum Verdict {
      Owner, Lifecycle, Scheduled, NoClassifiedWrites,
      Gated   { gate_stmt: usize, first_write_stmt: usize },
      Ungated { writes: BTreeSet<String>, first_write_stmt: usize, gate_stmt: Option<usize>, via: Vec<String> } }
  #[derive(Debug, Clone, PartialEq, Eq)] pub(super) enum CensusError {
      Parse { module: String, msg: String }, MissingModuleFile { module: String },
      DuplicateReducer { name: String }, UnsupportedShape { module: String, what: String } }
}
```
`modules` lists "crate" + every scanned module name in lib.rs order. `via` = the resolved helper chain to the first write (diagnostic).

## Tests (10, all `rb45_`) → killing engine mutation
1 synthetic_ungated_reducer_is_flagged (alone AND injected into the real corpus → roster mismatch) → default classified writers to Gated / ignore injected module
2 gate_after_the_first_write_is_ungated → drop the `<` ordering
3 conditional_nested_negated_or_discarded_gate_is_not_a_gate → recursive gate scan / accept `!` / accept `let _ =`
4 table_handle_alias_write_is_a_write (and a `find`-row alias `.field.clear()` is NOT) → drop alias pass
5 helper_delegated_write_is_a_write (same-module, `crate::m::f`, two hops, a cycle) → depth-0 call graph
6 owner_lifecycle_and_scheduled_are_exempt_with_precedence → 3 mutants: drop owners / drop attr-arg parse / drop scheduled(<ident>)
7 not_owned_and_foreign_writes_are_not_classified → classify every manifest entry
8 both_gate_shapes_and_every_write_verb_are_recognised → drop shape (b) / drop `clear` from WRITE_VERBS
9 unsupported_shapes_are_hard_errors (table-driven over the UnsupportedShape list) → silent skip of Item::Macro
10 real_crate_matches_the_rosters (whole 54-row report pinned: Ungated == DELIBERATE_EXEMPTIONS; Gated == EXPECTED_GATED (14); NoClassifiedWrites == {start_guest_claim}; verdicts.len() == reducer-attr count derived from sources; Lifecycle == {init,on_connect,on_disconnect}; Scheduled ==
   exact set; modules == "crate"+21 in lib.rs order; cfg-hidden `grant_bait`/`start_wild_battle` ∈ Gated; every reducer has a verdict) → one-direction compare

## Tasks
T1 orchestrator Cargo.toml (DONE) · T2 tester tests+rosters+`unimplemented!()` stub (RED) · T3 specialist engine (GREEN 9/10) ·
T4 specialist roster fill from the real failure output (10/10) · T5 orchestrator bite proofs on a COPY + ci-fast + full just ci ·
T6 doc-keeper ADR-0258 final + 0225/0228 + adr-digest · T7 orchestrator residual add.

## Spike census (real crate, 2026-09-20): 54 reducers; 51 reach classified writes; 14 GATED (accept_challenge challenge_pvp talk
advance_dialogue start_wild_battle start_battle grant_bait request_data_export heal_party buy sell set_profile_name propose_trade
complete_guest_claim); 3 OWNER; 3 LIFECYCLE; SCHEDULED(with writes) 6 (pvp_deadline_reaper battle_challenge_reaper export_bundle_reaper
trade_offer_reaper movement_tick playtest_reaper) + guest_claim_reaper/mr_heartbeat (scheduled, no writes → Scheduled by precedence);
start_guest_claim → NoClassifiedWrites; 25 UNGATED: (i) already-open commitment: submit_attack swap_active flee use_battle_item
submit_pvp_action cancel_trade confirm_trade cancel_challenge decline_challenge · (ii) respond_trade (decline arm deletes before the
accept gate, ADR-0237) · (iii) sync_content (operator-only) · (iv) KNOWN GAP: join_game evolve care train essence_train
consume_crystalized_essence attempt_recruit set_nickname set_party_slot enqueue_move set_move clear_queue dismiss_dialogue ack_evolution_notices
