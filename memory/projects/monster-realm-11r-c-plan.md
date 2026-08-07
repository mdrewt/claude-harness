# 11r-c — Real server battle movement lock — PLAN (ADR-0168) — as approved for test-authoring

Slice: 11r-c (M-postgate-eleventh-review-residuals §2, HIGH). Repo @ master=90921d1.
Worktree: `.claude/worktrees/11r-c`, branch `feat/11r-c-battle-movement-lock`.
touches: `server-module/src/{movement,guards}.rs` (+sibling tests), `evals/`, docs (ADR-0168).
OUT of touches: `sim-harness/`, `client/`, `server-module/src/lib.rs`.

## 0. Ground truth (verified)

- Drain has no battle check: `movement.rs:184-199` (`find` → empty-queue arm → `remove(0)` → `apply_move` → `apply_state`).
- Only battle reads in movement.rs: warp guard `:217-224` (`is_in_ongoing_battle(ctx, p.identity)`, 11r-a) and grass pre-check `:253-258` (inline single-role).
- `authorize_move` (guards.rs:66-96): joined/seq/character only; accept-time ack at :93-94 (Err rolls back the whole txn incl. the ack).
- Battle start never clears `move_queue` (no writer outside movement.rs; content.rs:546 preserves an NPC queue; :468 seeds `vec![]`).
- NPCs provably never hold queued moves (spawn seeds empty; wander loop never touches queue; `enqueue_move` reaches only the caller's own character).
- Harness models the lock the server lacks: `sim-harness/src/world.rs:101-104`, false comment at :87-89.
- W3 in `evals/zone-warp-server-runtime.eval.mjs:171-206` is vacuous (counts `BattleOutcome::Ongoing` after `warp_at(`; grass pre-check satisfies it) — ADR-0166 R3.
- `set_move`/`clear_queue` have NO production caller (spec §5:171-172; `main.wiring.test.ts:1848-1880` W-NH2-NO-CANCEL forbids them in main.ts).
- Client suppresses movement input under overlays (`main.ts:1197-1201`; re-issue emitters double-gated :768, :2374). Silent repair: `main.ts:801-824` (`dropRejected` → `reconcileFromStore`). (Spec's ":483-508" citation is stale.)
- Prior-slice gating fences in `movement_tests.rs` (11r-a — MUST NOT be modified): layer 1b `.unwrap_or(true);if!skip_warp{` contiguous; layer 1c `battle()` EXACTLY once file-wide; layer 2 zero `player_identity()` in warp region; layer 3 zero `ctx.sender` in warp region (`warp_at(`…`stepped_onto_grass(`).
- npc_tests.rs:352-371 trap: raw (non-stripped) `!src.contains(".unwrap_or(false); // NPCs have no player row")` on movement.rs — NEVER write that comment string; `.unwrap_or(true)` must keep existing (warp guard).
- No reducer-executing harness exists (movement_tests.rs:14-18, ADR-0156 P7) → hardened source-scan doctrine.

## 1. Design decisions

### D1 — Drain guard (movement_tick)
Placement: inside per-character loop, AFTER empty-queue early-continue (:188-194), BEFORE `remove(0)` (:195). Idle characters pay zero probes; before the warp region so 11r-a fences stay green by construction.

```rust
let battle_locked = ctx
    .db
    .player()
    .entity_id()
    .filter(id)
    .next()
    .map(|p| is_in_ongoing_battle(ctx, p.identity))
    .unwrap_or(false);
if battle_locked {
    if row.action != ActionState::Idle {
        row.action = ActionState::Idle;
        ctx.db.character().entity_id().update(row);
    }
    continue;
}
```

- `.filter(id)` (loop var IS entity_id) — avoids hoisting the `:199` local into/above the warp region.
- `unwrap_or(false)`: no player row = NPC = a FACT ("not a player ⇒ never in a battle row"), NOT the warp guard's ADR-0070 `unwrap_or(true)` POLICY. Failure-direction argument: `true` would freeze a (hypothetical) queued NPC move forever; `false` degrades to today's behavior.
- Write-on-change Idle (matches harness world.rs:102 and the sibling empty-queue arm) — unconditional update would churn 5×/s per battling player to all subscribers.
- SSOT delegation forced by layer 1c (`battle()` exactly once): any inline scan or per-tick battle cache breaks a prior gating test.
- REJECTED: hoisting one shared computation for drain+warp (breaks layer 1b contiguity); merging lock into the empty-queue condition (pays lookups for all idle chars).
- Cost accepted: 1 player + ≤2 battle probes per MOVING character per tick.

### D2 — Intake reject: enqueue_move + set_move YES; clear_queue NO (anti-decision)
First statement, BEFORE `authorize_move` (cheaper; observationally identical due to txn rollback of the ack):

```rust
if is_in_ongoing_battle(ctx, ctx.sender) {
    let e = "cannot move during an ongoing battle".to_string();
    log_reject("enqueue_move", ctx.sender, &e);
    return Err(e);
}
```

- Message follows raising.rs idiom ("cannot care during an ongoing battle").
- clear_queue UNGUARDED — the load-bearing anti-decision (ADR-0166-D2-Swap-paragraph shape): (1) pure cancellation, cannot cause movement, enables no attack; (2) rejecting it forces the stale pre-battle queue to survive to battle end (guarantees the post-battle stale drain D1 merely tolerates); (3) denies honest key-release cancel.
- Consequence: guard must NOT live in `authorize_move` (would cover clear_queue). Per-reducer inline; guards.rs UNCHANGED this slice.
- REJECTED: a guards.rs ctx-taking helper (2 call sites; not unit-testable as pure predicate; parameterised-default helper is the wrong-argument evasion class ADR-0166 D2 killed).

### D3 — Client prediction (ADR-0013): no regression (traced)
- Battle start, accepted-but-undrained moves: predictor reconcile rebuilds predicted = server tile + queue depth identically each batch (predictor.ts:265-293, 303-319; baseline rebase convert.ts:100) — stable, no re-issue (divergence emitter double-gated).
- Post-battle-row rejects: dropRejected → reconcileFromStore, silent (M2 §3). Snap-back masked by overlay = accepted consequence, stated honestly.
- Battle end: ≤2 stale moves drain at 1/tick converging TOWARD the predicted position; remote observers see a 1-2 tile walk. Residual, not defect.
- Encounter path unaffected (drain causing the encounter precedes the battle row in the same txn).
- movement-parity/prediction-parity evals model only `apply_move` vectors — no change needed (verified).

### D4 — Grass `already` pre-check (:253-258): KEEP (load-bearing for layer 1c count; defense-in-depth; R4 still open). Add one clarifying comment line only.

### D5 — Other movement-path sweep: join_game (session lifecycle; rejoin can't be mid-battle — on_disconnect settles battles, lib.rs:196-208), NPC wander (no player row), content.rs NPC sync, on_disconnect delete — ALL out; no dev reducers exist; warp already guarded.

### D6 — Evals
1. Fix W3 in place (R3, mandatory): needle → `is_in_ongoing_battle(`; rewrite stale :155-170 docstring; UPDATE `GOOD_MOVEMENT_TICK_MAP_FOR` (:291-327 — currently uses the retired inline filter; must keep `map_for(`/`warp_at(`, no `zone_map(` — W1/W2 GOOD teeth reuse it); ADD `BAD_MOVEMENT_TICK_INLINE_SINGLE_ROLE_WARP_GUARD` + tooth (proves the needle change). Verified: drain guard sits BEFORE `warp_at(` so W3's after-warp_at count has real teeth.
2. NEW `evals/movement-battle-lock.eval.mjs` (auto-discovered; zone-warp house shape; BAD/GOOD teeth per check):
   - B1 first `is_in_ongoing_battle(` in movement_tick precedes `warp_at(`
   - B2 …and precedes `move_queue.remove(`
   - B3 enqueue_move AND set_move bodies contain `ifis_in_ongoing_battle(ctx,ctx.sender)` (+ dead-let BAD fixture)
   - B4 ANTI-DECISION: clear_queue body contains ZERO `is_in_ongoing_battle(` (+ guarded-clear_queue BAD fixture)
   - B5 parity tooth: world.rs still contains `battle_locked` + continue before its drain (READ-only on sim-harness; matched-pair failure message)
   - B6 authorize_move body contains ZERO `is_in_ongoing_battle` (kills the helper-shell evasion)
3. netcode-convergence.eval.mjs: NO change (its certification becomes truthful; honest limit recorded in ADR — only B5 mechanically ties harness↔server).

## 2. File-by-file
- movement.rs: D1 + D2 + clear_queue anti-decision comment + one grass-pre-check comment line.
- movement_tests.rs: ADD 3 tests + helpers (`reducer_region`, `drain_region` from `.is_empty()` → `warp_at(`); existing 2 tests UNTOUCHED.
- guards.rs / guards_tests.rs: NO change.
- evals/zone-warp-server-runtime.eval.mjs: Task 6. evals/movement-battle-lock.eval.mjs: NEW (Task 7).
- docs/adr/0168-server-battle-movement-lock.md (Status: Accepted; Decision ≤240 chars; Amends ADR-0166 (closes R3,R10) + ADR-0013 note; residuals: R4 open, grass check redundant-but-retained, post-battle stale drain, ADR-0156 P7 harness gap). DIGEST + knowledge regen (`just adr-digest` && `just knowledge` — knowledge is line-anchored, WILL drift on any movement.rs line shift). ARCHITECTURE.md slice paragraph.

## 3. Test tasks (TDD) — POST-REVIEW fence set (supersedes the pre-review layer list)

Review outcome (reviewer+red-team+simplify, 2026-07-31): presence/adjacency needles alone were shown
insufficient — a FALL-THROUGH block (no `continue`) and a NESTED-CONDITION intake guard
(`if seq == 0 { return Err }`) pass them all with the vuln live. Fix: FULL-BLOCK contiguous pins
(reachability by construction). Cuts: B5/B1/D1f/I3 (subsumed or empty); no new eval file.

- **T1 E1 drain lock** (`movement_tests.rs`, RED at HEAD):
  - **L1 mega-needle** (6 variants: bare/`guards::`/`crate::guards::` × expr/block closure), ONE contiguous squashed string:
    `.map(|p|is_in_ongoing_battle(ctx,p.identity)).unwrap_or(false);ifbattle_locked{ifrow.action!=ActionState::Idle{row.action=ActionState::Idle;ctx.db.character().entity_id().update(row);}continue;}`
    Pins: SSOT+arg, `unwrap_or(false)`, value-decides-branch, write-on-change Idle, single update, queue untouched, **`continue;` before the block's close** (kills fall-through, red-team CRITICAL-1).
  - **L2** exactly ONE `ifbattle_locked{` in squashed movement.rs (kills decoy-block+real-fall-through pairs). RED (0 at HEAD).
  - **L3** idx(`ifbattle_locked{`) < idx(`move_queue.remove(`) (guard precedes drain; `remove(` unique — verify). RED.
- **T1-sentinel** (separate test, GREEN at HEAD and after): zero `ctx.sender` in drain region (`move_queue.is_empty()` → `warp_at(`; verify anchor uniqueness first — `expect` loudly if absent).
- **T2 E2 intake** (`movement_tests.rs`, RED at HEAD):
  - **I0** region uniqueness: `pubfnenqueue_move(`==1 and `pubfnset_move(`==1 in squashed file (kills nested-decoy-fn hijack of the region extractor, red-team HIGH-3).
  - **I1** in enqueue_move's region (pubfn → next `pubfn`), full-block mega-needle (×3 path spellings):
    `ifis_in_ongoing_battle(ctx,ctx.sender){lete="cannotmoveduringanongoingbattle".to_string();log_reject("enqueue_move",ctx.sender,&e);returnErr(e);}`
    (kills nested-condition/log-without-return, red-team CRITICAL-2; message+shape are the ADR-0168-sanctioned form — honest-limit trade per 11r-a).
  - **I2** same for set_move (`log_reject("set_move"...`).
  - **I3** wrapper-kill count (red-team HIGH-4): `is_in_ongoing_battle(` appears EXACTLY 4× in squashed movement.rs, arithmetic comment (warp 1 + drain 1 + enqueue 1 + set_move 1; HEAD=1 so RED; a differently-named wrapper's extra call = 5 → trips; update DELIBERATELY like layer 1c).
- **T3 clear_queue anti-decision sentinel** (GREEN at HEAD and after): FULL-BODY pin of clear_queue as one contiguous needle
  (`letmutch=authorize_move(ctx,"clear_queue",seq)?;ch.move_queue.clear();ctx.db.character().entity_id().update(ch);Ok(())`)
  — kills both the direct guard AND any wrapper indirection (body text must not change at all). Failure message carries the D2 reasons verbatim.
- **T4 guards_tests.rs** (NEW green sentinel, was "no change"): authorize_move's region in guards.rs contains ZERO `is_in_ongoing_battle` (+ `pubfn`-count uniqueness… note authorize_move is `pub(crate) fn`). Kills the helper-shell that silently guards clear_queue (old eval-B6, moved to Rust). No new pure predicate — tester must NOT invent one.
- **T5 impl** (movement.rs) red→green; existing movement_tests(2) + npc_tests + battle-reducer-security C3 stay green UNMODIFIED.
- **T6 evals** (`zone-warp-server-runtime.eval.mjs` ONLY — no new eval file, simplify cut):
  - W3 needle → `is_in_ongoing_battle(` + docstring rewrite + GOOD fixture update (keep `map_for(`/`warp_at(`, no `zone_map(`) + NEW `BAD_MOVEMENT_TICK_INLINE_SINGLE_ROLE_WARP_GUARD` fixture + tooth (R3).
  - NEW **W6**: in movement_tick's body, first `is_in_ongoing_battle(` idx < `move_queue.remove(` idx (drain guard exists at the eval layer — E3's tie). BAD fixture: guard only in warp branch. GOOD fixture: drain guard before remove.
  - NEW uniqueness guard: movement_tick defined exactly once across server sources (countFnDefinitions-style, precedent battle-reducer-security C3) — protects W1/W2/W3/W6 extraction (red-team HIGH-3).
  - No dynamic RegExp (Semgrep).
- **T7 docs** (was T8): see §2 + review adds below.

## 4. Named anti-patterns/evasions to fence (tester + red-team)
1 module-identity `ctx.sender` in movement_tick (always false — scheduler-only); 2 discarded result `let _ = battle_locked;` + inline condition; 3 local shim fn (already fenced: movement_tests NEW-3 + battle-reducer-security C3 — cite, don't duplicate); 4 inline battle scan any spelling (layer 1c count — existing test, untouchable); 5 guard after drain (+push-back); 6 queue consumed under lock; 7 unconditional row write under lock; 8 wrong unwrap_or defaults (either direction); 9 npc_tests raw comment trap (never write `.unwrap_or(false); // NPCs have no player row`); 10 guarding clear_queue; 11 guard inside authorize_move (eval B6); 12 merging lock into empty-queue condition; 13 hoisting shared guard computation (breaks layer 1b); 14 weakening any prior-slice test; 15 editing sim-harness; 16 editing client/; 17 removing grass pre-check; 18 eval-fixture drift (needle change without GOOD update + new BAD fixture); 19 presence-only needles; 20 dynamic RegExp in evals.

## 5. STOPs / hazards
- npc_tests comment trap (avoid by design). knowledge bundle line-anchor drift (`just knowledge` mandatory). adr-digest 240-char cap, Status: Accepted. Worktree needs client-setup (done). PATH export required. `just wasm` never bare wasm-pack. e2e risk low (no e2e presses movement keys — verified); optional isolated-DB e2e only.

## 6. Plan-review outcomes (2026-07-31, actual)
- **Reviewer**: no BLOCKER. MAJOR-1: ADR-0168 must explicitly state the delivered FREEZE semantics supersede ADR-0166 R10's literal "moved but not warped" phrasing (that described the pre-fix status quo; spec E1 is the authority) — do NOT let anyone "complete" R10's literal test later. MINOR-2: predictor burst-drains the stale queue locally when the server row freezes (predicted tile = server tile + queue depth, masked by the battle overlay; converges at battle end) → ADR residual note, no code change (client out of touches). MINOR-3: opposing `unwrap_or` defaults in one function — keep the planned above-the-line comment.
- **Red-team**: CRITICAL-1 fall-through (no `continue`) defeated ALL planned drain needles → full-block mega-needle (T1 L1). CRITICAL-2 nested-condition intake neuter (`if seq == 0`) → full-block intake needles (I1/I2). HIGH-3 fn-extraction hijack (decoy `pub fn` earlier in blob/file) → I0 + eval uniqueness guard. HIGH-4 differently-named wrapper re-guards clear_queue invisibly → T3 full-body pin + I3 count==4 + T4 authorize_move fence. MEDIUM-5 resolved by mega-needle contiguity. MEDIUM-6 cost framing: probes persist "for the battle's duration" (queue can't drain while locked), not "≤2 ticks" — fix ADR wording; also do NOT claim W3 covers the drain guard (it structurally cannot — occurrences counted after `warp_at(`; W6 is the drain-side eval tooth).
- **Simplify**: CUT B5 (sim-harness already fences its lock behaviorally in the same `just ci`: world.rs:454 `battle_locked_character_does_not_advance` + BL-2/BL-3; ADR keeps one honest-limit sentence), CUT B1 (subsumed by B2/W6), CUT D1f (subsumed by L3), CUT I3-ordering (subsumed by full-block pin; no defect behind ordering per D2's own txn-rollback argument). NO new eval file — fold W6 into zone-warp (saves ~700-line file). DROP the grass pre-check comment (3rd copy + raw-scan comment hazard; ADR carries it). Drain-guard rationale comment goes ABOVE the `.unwrap_or(false)` line, NEVER trailing (npc_tests raw trap). clear_queue anti-decision comment: keep.
- E1 honesty mapping for the ADR: E1 is delivered as source-pinned server guard (T1) + behavioral lock semantics proven in sim-harness's existing tests + NO reducer-executing harness exists (ADR-0156 P7 residual) — say so plainly; do not call T1 an "integration test".

## 7. Test-review outcomes (2026-07-31, after tests written @ 877aa2a)
- Reviewer: NO findings above NOTE — needles verified token-for-token against ADR D1/D2 sketches; sentinels verified green-at-HEAD; existing tests byte-identical; W3 teeth genuinely prove R3.
- Red-team (empirical, built+ran wrong impls): 10 evasion classes DEAD, 2 ALIVE → sent back to tester:
  (1) CRITICAL string-literal decoys (`let _decoy = "<needle>"` / r#-form) defeat ALL needles in BOTH scanners → fix: sequential string-blanking in Rust helpers (plain/byte/raw ≤##, loud asserts beyond) + eval imports stripRustStrings from battle-reducer-security (SSOT); needles updated to string-less forms (name/message pins lost — regions carry per-reducer proof).
  (2) HIGH `let id = u64::MAX;` shadow neuters the pinned chain → green sentinel: zero `letid=`/`letid:` between `foridinids{` and `warp_at(`.
- Notable DEAD results: decoy-block killed by L2 count; second remove( by L3 uniqueness; wrapper/second-lock-route killed by I3==4 (any lock path must name is_in_ongoing_battle or battle(), tripping I3 or 11r-a layer-1c); outcome-blind extra freeze killed ONLY by 11r-a layer-1c battle()==1 — flagged in ADR as known coupling; W6-fooling dead call killed by Rust L1 (union holds there).
- Tester also fixed: two comments contained the slash-asterisk sequence (as a glob) → the evals' regex stripper swallowed guards_tests→lib.rs across file boundaries, false-REDing W5 ("init not found"). Reworded; warning comments added both sites. Trap recorded in ADR residuals.
