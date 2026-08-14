# 14r-d — PvE settle log-and-commit hardening — PLAN (planner, opus/high, 2026-08-14)

Branch `feat/14r-d-pve-settle-log-and-commit`, worktree
`projects/monster-realm/.claude/worktrees/14r-d`, base `origin/master` @ c85010d.

## 0. Impact (graph union: cbm query_graph + codegraph_explore + grep)

6 callers of `write_back_battle_results`: `battle.submit_attack`, `battle.swap_active`,
`battle.flee`, `battle.resolve_wild_battle_on_disconnect`, `pvp.settle_pvp_battle`,
`taming.attempt_recruit`. No third graph-only caller. Reducer signatures unchanged →
client blast radius zero (bindings/battleView/main.ts untouched).

### Files that MUST change

| File | Why |
|---|---|
| `server-module/src/battle.rs` | the fix (3 sites) |
| `server-module/src/battle_tests.rs` | the gating tests |
| `docs/adr/0185-pve-settle-log-and-commit.md` | new ADR |
| `ARCHITECTURE.md` | 2-3 line targeted edit (battle-lifecycle/GC para ~:782) |
| `docs/adr/DIGEST.md` | GENERATED; `just adr-digest`. `evals/adr-digest.eval.mjs` reds the moment a new ADR lands |
| `docs/knowledge/reducers/{swap_active,flee,use_battle_item}.md` | GENERATED; `just knowledge`. Each pins a byte-offset `server-module/src/battle.rs#L746/#L880/#L928`; inserting lines at :735 shifts them → `just knowledge-check` reds |

All inside the declared `touches:` + the ALWAYS-in-scope companions (`docs/adr/**`,
`docs/knowledge/**`, `ARCHITECTURE.md`). NOT touched: `pvp.rs`, `taming.rs`, `evals/`,
`docs/adr/README.md`, `CHANGELOG.md`.

`docs/adr/README.md:16` "Next free number: 0184" is hand-maintained and NOT ci-gated
(README:18-22) — taking 0185 leaves it stale; supervisor owns the reconcile chore.

## 1. The diff shape

Key name **`reason`** (not `err`): every hand-built error log in battle.rs already uses
`reason` (:1218/:1301/:1318/:1329/:1446); `err` exists only in pvp.rs. The shipped 12r-d
oracle `d12r_compose_escaped_line` (battle_tests.rs:3865) hardcodes `"reason"`.

`evt` names mirror the same-file precedent `wild_disconnect_writeback_err`:
`submit_attack_writeback_err`, `swap_active_writeback_err`, `flee_writeback_err`.
Distinct per site so a copy-pasted block fails its own test.

`battle_id` = the reducer PARAM in all three (:596, :746, :880). Not `battle.battle_id`
(`update` consumes `battle` by value).

Site 1 — `submit_attack`, replacing battle.rs:735-738:

```rust
    // Write back HP + XP if battle ended. Log-and-commit, NOT `?` (ADR-0185 D1;
    // ADR-0077 log-and-continue): the `update` below is what makes the row
    // terminal, so a `?` here aborts the transaction and strands the row
    // `Ongoing` — which under ADR-0168 D1 also movement-freezes the connected
    // player, turning a rare data-invariant fault into a softlock.
    // Ordering is UNCHANGED (RT-M16-08): the write-back still runs while the DB
    // row is `Ongoing`, so its GC sweep cannot delete the current row.
    if battle.state.outcome != BattleOutcome::Ongoing {
        if let Err(e) = write_back_battle_results(ctx, &battle) {
            // 12r-d (ADR-0170 D5): `e` may contain quotes — escape before
            // interpolating into the hand-built JSON line.
            let escaped = crate::guards::json_escape(&e);
            log::error!(
                "{{\"evt\":\"submit_attack_writeback_err\",\"battle_id\":{battle_id},\"reason\":\"{escaped}\"}}"
            );
        }
    }

    ctx.db.battle().battle_id().update(battle);
```

Site 2 — `swap_active` (:870-872): byte-identical, `evt` = `swap_active_writeback_err`,
short comment pointing at `submit_attack` rather than restating.

Site 3 — `flee` (:904-905): unconditional (Fled already set above), `evt` =
`flee_writeback_err`. The existing `battle_flee` info log at :908 stays UNCHANGED and
AFTER `update` — the flee did commit; suppressing it would misreport.

No reordering anywhere. Edition 2021 → no let-chain collapse; clippy `collapsible_if`
does not fire on `if let`.

## 2. Inline, NOT a helper (recommendation)

1. Both shipped reference sites are inline (pvp.rs:496-503, battle.rs:1443-1448).
2. A helper is an active TEETH REGRESSION: every gate here extracts a *function body*
   and scans it; moving `log::error!` + `json_escape` into a helper makes every such
   body scan vacuous by construction and turns `evt` into a runtime `&str` no
   format-string scan can see.
3. Duplicated payload is 4 lines, of which only `evt` varies.
4. YAGNI. Revisit trigger (a 6th site) recorded in ADR-0185 D2.

## 3. Gating tests (battle_tests.rs) — static source-shape per ADR-0156 P7

`ea_pve_settle_01_submit_attack_logs_and_commits_on_writeback_err`
`ea_pve_settle_02_swap_active_logs_and_commits_on_writeback_err`
`ea_pve_settle_03_flee_logs_and_commits_on_writeback_err`
`ea_pve_settle_04_battle_rs_has_no_question_mark_writeback_site`
driver `assert_pve_settle_logs_and_commits(reducer, evt)`

Three separate `#[test]`s (not one loop) so a single reverted site reds exactly one
named test. Helpers REUSED: `fn_body_views` (:1454), `block_after` (:1485),
`enclosing_block_headers` (:2550), `squash_ws` (:2491), `MODULE_SOURCE`.

Needle hygiene: every needle built from concatenated fragments so the test file's own
source cannot satisfy a scan. No literal `{e}`, no glob-slash-star in comments.

| # | Assertion | Kills |
|---|---|---|
| L1 | `body.matches(CALL).count() == 1` | (f) call deleted / second un-hardened call |
| L2 | `sq.contains("ifletErr(e)=" + CALL + "(ctx,&battle){")` | (a) this site reverted to `?` |
| L3 | `!sq.contains(CALL + "(ctx,&battle)?")` | (a) belt-and-braces |
| L4 | `block_after(&body, at_call)` → `blk`, `blk_str` (equal-length views, :1451-1463) | scoping for L5-L9 |
| L5 | `squash_ws(blk).contains("log::error!(")` AND `blk_str.contains(EVT)` | (b) commit-but-silent; wrong evt |
| L6 | on `squash_ws(blk_str)`: has `{escaped}` AND NOT `{e}` | (c) raw un-escaped |
| L7 | has `letescaped=crate::guards::json_escape(&e);` OR bare `json_escape(&e)`; AND `matches("letescaped=").count()==1` | (c) placeholder arg; npc_tests shadow-rebind cheat |
| L8 | `!blk.contains("return")` AND `!blk.contains('?')` | (e) early `return Err` inside the arm |
| L9 | `body.matches("update(battle)").count()==1`; `at_upd > be` | (d) update deleted / moved inside the Err arm / hoisted before |
| L10 | `enclosing_block_headers(&body, at_upd).is_empty()` | (d) update re-wrapped in a new `if` |
| L11 | `!body[be..at_upd].contains("return")` and no `?` | (e) bail between log and commit |

`ea_pve_settle_04` census over stripped `MODULE_SOURCE` (= battle.rs ONLY):
- `matches("write_back_battle_results(").count() == 5` (1 def :1096 + 4 calls
  :737/:871/:905/:1443) — a new PvE terminal path without an error posture trips it.
- `squash_ws(src).matches(CALL + "(ctx,&battle)?").count() == 0`.

**The doc comment MUST state the scope boundary**: bounded to battle.rs because
`MODULE_SOURCE` is battle.rs; `taming.rs:270` (`attempt_recruit`/`recruit_fail`) carries
the IDENTICAL un-hardened `?` with the identical consequence, is deliberately out of
14r-d's `touches:`, is disclosed in ADR-0185 D3 — do NOT widen this scan to the crate,
it would red on a known, tracked, deliberately-unfixed site.

## 4. Proof-of-teeth ladder (orchestrator runs by hand; inverse-Edit restore, NEVER
`git checkout --`)

`cargo nextest run -p monster-realm-module ea_pve_settle`

| Step | Mutation | Expected RED |
|---|---|---|
| M0 | none — new tests vs HEAD's `?` shape | all four RED (01/02/03 on L2; 04 on the census) |
| M1 (a) | revert ONLY `submit_attack` to `?` | 01 RED L2/L3 + 04 RED; **02/03 stay GREEN** |
| M2 (b) | empty the `swap_active` Err arm | 02 RED L5 |
| M3 (c) | `flee`: drop `let escaped`, log raw `{e}` | 03 RED L6 + L7 |
| M4 (d-i) | move `submit_attack`'s `update` inside the Err arm | 01 RED L9 |
| M5 (d-ii) | delete `swap_active`'s `update` | 02 RED L9 |
| M6 (d-iii) | wrap `flee`'s update in `if true { }` | 03 RED L10 |
| M7 (e) | `return Err(e);` after the log in `submit_attack` | 01 RED L8 |
| M8 (f) | delete the whole terminal `if` block from `submit_attack` | 01 RED L1 + 04 RED (4≠5) — non-vacuity |
| M9 | NEGATIVE CONTROL: apply the same fix to `taming.rs:270`, run, revert | all four GREEN both ways — proves scope |

Then restore exactly, `just knowledge`, `just adr-digest`, full `just ci` (false-RED
guard over the neighbouring body scanners: battle-reducer-security.eval.mjs,
battle-lifecycle-gc.eval.mjs, ranking-pve-exclusion.eval.mjs, no-idle-accrual.eval.mjs,
and `battle_reason_log_sites_interpolate_an_escaped_binding`).

## 5. ADR-0185 — `docs/adr/0185-pve-settle-log-and-commit.md`

Header fields required by `scripts/adr-digest.mjs:267-317`: Status/Date/Slice/
Supersedes/Amends/Subsystems/Decision(<=240 chars).

**`Amends:` MUST be `—`.** Declaring `Amends: ADR-0168` trips the 12r-f bidirectional
back-link gate (`evals/adr-backlink-integrity.eval.mjs`, era >= 0151, both endpoints
in-era) which would demand an `Amended-by: ADR-0185` line in
`docs/adr/0168-server-battle-movement-lock.md` — OUTSIDE `touches:`, CI-red without it.
ADR-0168 D1 is not being changed; this ADR closes its disclosed residual (0168:213-223),
a Context-prose relation. Cite in prose.

- **D1** error posture at the three PvE sites (shape, `reason` key, per-reducer `evt`,
  ordering explicitly unchanged per RT-M16-08; cite pvp.rs:496-503, battle.rs:1443-1448).
- **D2** inline not a helper + revisit trigger (a 6th site).
- **D3** disclosed deliberately-unfixed sibling `taming.rs:270`; follow-up slice
  `touches: server-module/src/taming.rs, taming_tests.rs`, `evt` =
  `recruit_fail_writeback_err`. Must also appear in the PR body.
- **D4** static source-shape not dynamic (ADR-0156 P7); HONEST LIMITS: the scan cannot
  see runtime JSON validity (covered transitively by guards_tests G-1..G-3 +
  `escaped_reason_composes_a_well_framed_json_log_line`) nor that the txn genuinely
  commits under SpacetimeDB semantics.
- **D5** consequence of committing on top of a PARTIAL write-back (below).

### Residual risk — partial-failure semantics (the non-obvious call)

`write_back_battle_results` (:1096-1371) has strictly ordered `Err` exits, so an error
always leaves a PREFIX of effects committed:

| Err exit | Committed before it fires |
|---|---|
| `check_team_coupling` :1106 | nothing |
| `write_back_party_hp` :1047-1051 / :1055-1057 | party monsters `[0..i)` dual-written; `[i..]` not |
| :1038-1040 index-oob | unreachable (coupling asserted :1033) |
| faint-penalty loop :1177-1179 | all party HP; `battle_wild` sidecar deleted (:1117); prior-terminal GC (:1131-1156); `trust_unfavorable_count` for the fainted prefix |
| XP loop :1353-1355 | all the above + `grant_currency` (:1208, once) + essence/Trust-favorable/XP/level/stat-recompute/`accrue_quality_time`/`check_and_evolve` for winners `[0..i)` |
| :1242-1244 index-oob | unreachable |

(`xp_skip_loser_*` paths `return Ok(())`, not `Err`.)

Today `?` rolls that prefix back AND strands the row `Ongoing`. After D1 the prefix is
RETAINED and the terminal outcome commits on top. Trade: *atomic rollback + softlock* →
*partial write-back + progress*. Why right:

1. **No duplication is possible, and the terminal commit is the mechanism.** All three
   reducers reject a non-`Ongoing` row at their outcome guard (:605/:755/:889), so once
   the outcome commits the path is closed and a partially-granted currency/XP/essence
   credit can never be re-granted. The commit MAKES the partial credit exactly-once.
2. Every retained write is a legitimately-earned subset, never a fabrication.
3. What is lost: all-or-nothing party-HP atomicity — monsters `[0..i)` at post-battle HP,
   `[i..]` at pre-battle HP. A bounded partial free heal. No monster/item/currency can be
   LOST; cannot compound (the invariant violation re-fires and re-logs next battle).
4. **One genuinely new leak — the `battle_wild` orphan.** If the Err fires before :1117
   the private sidecar is not deleted. Pre-change the row stayed `Ongoing` so
   `resolve_wild_battle_on_disconnect` (:1407, Ongoing-only) would sweep both on the next
   disconnect. Post-change the row is terminal, that selector never matches, and
   `battle_wild` is deleted ONLY at :1117 and :1453 — no reaper. One permanently orphaned
   row per occurrence. Impact INERT: private table (ADR-0045, unsubscribed), autoinc
   `battle_id` never reused, sole reader `attempt_recruit` requires an Ongoing battle.
   **Accept + document; do NOT add a belt-and-suspenders delete in the Err arm** (diverges
   from both reference shapes, adds a second table write to a path whose value is
   minimalism). Real fix recorded as follow-up: hoist the `battle_wild` delete to the top
   of `write_back_battle_results`, before `write_back_party_hp` (same slice as D3).
5. A pre-:1117 failure also skips the prior-terminal GC sweep → the client's
   keep-latest-per-player outcome frame (M8.7e) may briefly see two terminal rows.
   Cosmetic, self-healing.
6. PvP untouched: `settle_pvp_battle` already log-and-commits, and all three reducers
   reject ranked-PvP rows before the write-back (:613/:762/:897).

**Also record:** the nightly `mutate-server` gate (ADR-0183, cap 324, successor ratchet
<=313) — three new `if let Err` branches add cargo-mutants targets that are
legitimate-shell/uncoverable in-crate and may raise the survivor count. Nightly-only, not
`just ci`. Do NOT pre-emptively bump the cap; if nightly reds, re-measure per ADR-0118 §4
in a follow-up. Naming it here prevents mis-attribution later.

## 6. Anti-patterns (named)

1. Repo-wide "no `?` on write_back" scan (reds on out-of-scope taming.rs:270).
2. Reordering write-back vs `update` (RT-M16-08).
3. Extracting a helper (vacuous-izes every body-scoped scan).
4. Raw `{e}` interpolation (ADR-0170 D5).
5. Differently-named / shadow-rebound escape binding (npc_tests:1117-1223 cheat).
6. Literal needles in the test file.
7. Glob-slash-star or unpaired slash-asterisk in new comments; double-quote in a char
   literal (naive strippers; battle-reducer-security.eval.mjs:19-22).
8. Suppressing `flee`'s `battle_flee` info log on error.
9. `git checkout --` to undo a mutation.
10. Shipping without `just knowledge` + `just adr-digest`.
11. Pre-emptively bumping the mutation cap.
12. Adding a `battle_wild` delete in the Err arm as a while-I'm-here fix (that is D3).

## 7. Right-sizing: ONE slice, do not split

~28 source lines across 3 sites in 1 file, 1 test section, 1 ADR, 2 generated regens.
One decision, one ADR. Splitting would leave the census test red on master. The only
carve-out (`taming.rs`) is already carved out by `touches:` and tracked as D3.
