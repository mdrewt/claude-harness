# 21r-a plan — taming.rs write-backs: log-and-commit instead of bare `?`

Spec: specs/monster-realm-v2/M-postgate-twentyfirst-review-residuals.spec.md#21r-a · base master 4f36de2 · branch `slice/21r-a` · worktree `.claude/worktrees/21r-a`
touches: server-module/src/taming.rs, server-module/src/taming_tests.rs (verified live at 4f36de2: defect at taming.rs:166 and :267, unchanged since triage).

## Production change (taming.rs)
- Site A (:166, success path): `if let Err(e) = write_back_party_hp(ctx, &battle) { let escaped = crate::guards::json_escape(&e); crate::observability::mr_log("recruit_success_writeback_err", &format!("\"battle_id\":{battle_id},\"reason\":\"{escaped}\"")); }` — then the unchanged battle_wild delete, `update(battle)`, `recruit_success` info line, `Ok(())`. No return / no monster delete in the Err arm.
- Site B (:267, terminal path inside `if outcome != Ongoing`): same block around `write_back_battle_results`, evt `recruit_fail_writeback_err`; `update(battle)` at :269 stays unconditional.
- Two evt names (not one + a field): the Err text is byte-identical on both paths (site B's comes from the nested write_back_party_hp), the shape must stay `battle_id`+`reason` like battle.rs:759-765, and `evt` is a Prometheus label. Names pair with the existing `recruit_success`/`recruit_fail` events.
- One-line comment per site pointing at the rationale in `battle::submit_attack` (battle.rs:750-758). Do NOT copy "Only the `evt` name differs" (false at site A).
- Untouched `?`s at :150/:152/:156/:187/:188/:200 abort BEFORE the battle row changes — not softlocks, out of scope.

## Tests (taming_tests.rs `mod nh`, names `nh_21ra_*`, tester-owned)
- Private log sink (`struct TmLogSink(Mutex<Vec<(log::Level,String)>>)`, `static TM_LOGS`), installed as the first statement of each test (`set_logger(..).expect(..)` + `set_max_level(Info)`); nextest-only (process per test) — same caveat as battle_tests.rs:3939.
- Failure injection: party monster 11 re-seeded owned by `b()` → `write_back_party_hp` Err "write_back_party_hp: ownership changed mid-battle for monster 11 — aborted" (battle.rs:1091-1095), before any monster write.
- T1 success path: bait 9 (bonus 1000 → certain success), T0. Asserts `Ok(())` (RED at HEAD), exactly one recruit (a(), species 5, level 4, box) + its monster_pub row, battle SideAWins, battle_wild empty, exactly one captured line `(Info, {"evt":"recruit_success_writeback_err","battle_id":7,"reason":"…"})`, monster 11 untouched (owner b(), HP 33). "Not rolled back" is proven by `Ok(())` (SpacetimeDB commits on Ok) — the host models no rollback; row presence only proves no in-reducer delete.
- T2 terminal path: `turn_number = u16::MAX`, no bait, one fixed clock whose roll fails (precondition assert on the playtest event `success == false`; ~92% of clocks fail; try T0 then T0 + k*7_919). advance_turn → Fled → write_back_battle_results → battle_wild GC → Err at battle.rs:1205. Asserts `Ok(())` (RED at HEAD), battle Fled, exactly one `recruit_fail_writeback_err` line with the same reason. Register `type_relation_row` scannable (as :608-610) and any index the sweep reads (`battle.player_identity`) — verify against the host's D5 abort rule.
- Ledger CHECK: `cargo nextest run -p monster-realm-module --run-ignored all -E 'test(/nh_21ra_/)' 2>&1 | tail -3`, EXPECT exact `2 tests run: 2 passed`.

## Traps
- `battle_id` (reducer arg) in the format!, not `battle.battle_id` (moved by update). No reserved keys (`"evt":` etc.) in extra fields (debug_assert). `cargo fmt` lays the mr_log args vertically. No `#[allow]`. Test doc comments: single-paragraph `kills:` lines (clippy doc lints under -D warnings).
- nextest Summary is on stderr → `2>&1` in the CHECK.

## Boy Scout (≤2 lines)
- taming.rs:265 drop "(it deletes battle_wild unconditionally)" — false on a coupling Err (battle.rs:1139-1142 returns before :1159).
- taming_tests.rs:199-200 drop "The failed-roll branch (resolve_recruit_failure) is covered by game-core." — this file's :601 test and T2 run it on the server.

## Risks / residual candidates (register after the last lens)
- Partial HP writes now commit on a multi-monster party (same accepted trade-off as submit_attack/swap/flee).
- Site B coupling Err now commits Fled with an orphaned battle_wild row (documented trade-off battle.rs:1144-1154) — outside spec; residual, not fixed here.
- DECISIONS.md: no entry (extends a pattern whose why is in code).
- Impact: no signature change; all 6 graph/grep callers of attempt_recruit expect Ok or a pre-roll refusal — none reaches a write-back Err.

## REV 2 — after reviewer + red-team + /simplify (2026-09-28)
Production change: unchanged. Comments name `battle::submit_attack`, never line numbers.
Tests (still exactly 2; ledger EXPECT `2 tests run: 2 passed` unchanged):
- Sink records `(record.target().to_string(), record.args().to_string())`; assert target == "monster_realm_module::observability" (kills a bare `log::info!`/`log::error!` in taming.rs with identical JSON — the only runtime observable of "via mr_log"; subsumes the Level check, so no level is recorded). Filter the sink by the `writeback_err` needle before asserting (the fixed code also emits `recruit_success`/`recruit_fail` info lines).
- Doc comment on the sink: nextest-only (process per test). `just test`, `just mutate-server` and remote CI all use nextest; plain `cargo test -p monster-realm-module` would panic on the 2nd `set_logger` (battle_tests.rs:3939 is the other installer). A shared sink needs native_host_tests.rs — outside touches; flagged as a follow-up in the PR body, not fixed here.
- T1 (success path): pin the full reason literal `write_back_party_hp: ownership changed mid-battle for monster 11 — aborted`; assert precondition "monster 11 is owned by b()" BEFORE the call; assert `Ok(())`; exactly one non-11 monster owned by `a()` + a `monster_pub` row for it (no species/level/pub-bytes repeats — :447 covers those); battle SideAWins; `wilds` empty; exactly one `recruit_success_writeback_err` record with the exact JSON; monster 11 untouched (owner b(), HP 33). DROPPED (not protected-category, /simplify): the control phase (owner a() → no writeback_err line), the whole-evt-sequence pin.
- T2 (terminal path): register `fx.table::<Battle>("battle", "player_identity", |r| r.player_identity)` (MANDATORY — makes the GC sweep live so an "update-before-write-back" wrong fix deletes the in-flight Fled row and is caught); `type_relation_row` scannable; battle re-seeded with `turn_number: u16::MAX`; owner swap; one hard-coded clock whose roll fails (choose at authoring time; the tester derives it, the orchestrator confirms by running). Assert FIRST the precondition `events.len()==1 && !events[0].success` (a clock flip reads as a precondition failure, not a bogus RED), then `Ok(())`, then exactly one battle row with outcome Fled, `wilds` empty (kills site B calling write_back_party_hp instead of write_back_battle_results), exactly one `recruit_fail_writeback_err` record with the exact JSON (same reason literal). DROPPED: full-row equality (outcome + row count suffice).
- Accepted unkillable-by-test: `json_escape` omission (no reachable reason text contains `"`/`\`/controls) — verified by review of the copied shape, not by a source scan.
- Boy Scout item 2 wording: the sentence is STALE (game-core does cover the branch; this file's :601 and T2 run it on the server), not false.
- Follow-up flags (outside touches, not changed): taming.rs:240 "terminal rows are immediately GC'd" is false (the terminal row is kept as the outcome frame, battle.rs:1170-1173) but the same text lives at battle.rs:724/:876 — a cross-file comment claim; fix all three together or delete.
