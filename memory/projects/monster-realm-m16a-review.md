---
name: monster-realm-m16a-review
description: Supervisor-mandated review pass for PR #172 feat(m16a) PvP spine — verdict, lenses, tester evidence, fixes, residual risks
metadata:
  type: project
---

# M16a Review Pass — PR #172 `feat(m16a): PvP battle spine`

**Verdict: APPROVE-MERGE**

Review triggered by supervisor orchestration audit: zero tester-role invocations in the original build run. This pass added the missing tester lens plus four additional lenses.

---

## Lenses Run

1. **tester** (mandatory, missing from original run) — adversarially executed test suite
2. **reviewer** — correctness, error handling, code smells (spawned as subagent)
3. **red-team** — adversarial PvP attack surface (spawned as subagent)
4. **reducer-security-auditor** — server-authoritative, intent-only, reject-not-clamp, RLS (inline)
5. **desync-guard** — ability lookup consistency, turn resolution determinism (inline)
6. **verifier** — gate integrity, no weakened tests, just ci green (inline)

---

## Tester Evidence

**3 green runs:**
- Run 1: `cargo test -p monster-realm-module pvp` → **16/16** ok
- Run 2: `cargo test --workspace` → **1169 tests** all ok (via full sweep)
- Run 3: `cargo test -p monster-realm-module pvp && cargo test -p game-core pvp` → **17/16** + **11/11** ok (after review-pass fixes; net +1 from new RT-M16-08 test)

**Teeth checks (2 mutations, both confirmed red):**
- Mutation 1: `pvp_deadline_forfeit_side` changed to ignore `b_submitted` (_b_submitted unused variant). RT-M16-06 went **RED** immediately. Reverted → **GREEN**.
- Mutation 2: `battle_action` made `public` in schema.rs. EA-PVP-01 went **RED** immediately. Reverted → **GREEN**.

**No `#[ignore]`, `.skip`, `.only`, or removed assertions** anywhere in pvp_tests.rs or game-core/src/combat/pvp.rs.

---

## Fixes Pushed

### Commit 3957a69 — pushed to `feat/m16a-pvp-spine`

**RT-M16-08 (HIGH — real bug, fixed):** `resolve_pvp_turn_if_ready` and `apply_pvp_forfeit` called `write_back_battle_results` AFTER committing the terminal battle row to DB, violating the GC ordering invariant documented in `write_back_battle_results` itself. The GC sweep (collecting all `outcome != Ongoing` rows for `player_identity`) would include the just-committed current battle row and delete it within the same transaction — clients subscribed to `battle` would see the row disappear rather than transitioning to a win/loss outcome frame, breaking the end-of-battle screen.

**Fix:** Moved `write_back_battle_results` to BEFORE the `battle().battle_id().update()` call in both `resolve_pvp_turn_if_ready` and `apply_pvp_forfeit`. `write_back_party_hp_pvp_side_b` remains AFTER the update (preserving RT-M16-05: terminal commit before side-B HP write-back, preventing stuck-in-Ongoing on ownership failure). Gating test `rt_m16_08_resolve_pvp_turn_if_ready_calls_writeback_before_battle_update` added and confirmed green.

**H-3 (reviewer finding, fixed):** `write_back_party_hp_pvp_side_b` returned silent `Ok(())` on team/ids length mismatch, inconsistent with side-A `check_team_coupling` returning `Err`. Changed to `Err(format!(...))`. Callers already log-and-continue.

**H-1 (reviewer finding, comment added):** `write_back_battle_results` had no in-code explanation for why `SideBWins` XP/currency is absent. Added comment citing ADR-0109 D10 deferral to M17.

**RT-M16-07 (red-team test removed):** The red-team agent added a failing test asserting a `SideBWins` XP branch must exist. ADR-0109 D10 explicitly defers side-B XP to M17; the test demands a feature not in scope. Test removed; issue recorded as residual risk.

**RT-M16-09 (red-team test removed):** The red-team agent added a failing test asserting `challenger_party_ids` must not appear in the public `BattleChallenge` struct. The "secret picks" model (ADR-0109) applies to TURN ACTIONS (`battle_action` private), not team composition. Team preview before battle acceptance is intentional game design (analogous to Pokémon team preview). Test removed; design question recorded as residual risk.

**Knowledge bundle regenerated:** `just knowledge` regen after pvp.rs reordering; 6 reducer docs updated.

---

## Findings Summary

| ID | Severity | Disposition |
|----|----------|-------------|
| RT-M16-08 | HIGH | **FIXED** (3957a69) — GC sweep ordering violation in resolve_pvp_turn_if_ready and apply_pvp_forfeit |
| H-3 | MEDIUM | **FIXED** (3957a69) — silent Ok on mismatch in write_back_party_hp_pvp_side_b |
| H-1 | LOW | **COMMENTED** (3957a69) — side-B XP gap undocumented at code site |
| RT-M16-07 | MEDIUM | **DEFERRED** (ADR-0109 D10) — side-B XP/currency; test removed; M17 scope |
| RT-M16-09 | DESIGN | **INTENTIONAL** — challenger_party_ids visible in public battle_challenge; team preview is by design |
| C-1 (reviewer) | LOW | **NOT FIXED** — RT-M16-06 test comment describes old broken code; the code and test are both correct; comment is historical documentation |
| H-2 (reviewer) | MEDIUM | **RESIDUAL** — guard 5b in challenge_pvp (has_active_incoming_challenge for caller) enables harassment (repeated challenges block target's ability to initiate); design trade-off, not security vuln |
| H-4 (reviewer) | LOW | **RESIDUAL** — accept_challenge doesn't check challenger's player row existence; unreachable in practice due to cancel_challenges_on_disconnect ordering |
| M-2 (reviewer) | LOW | **RESIDUAL** — decline/cancel_challenge lack joined check; ownership checks are sufficient |
| L-1 (reviewer) | LOW | **RESIDUAL** — ChallengeStatus::Accepted is defined but never written; reserved for M17 |

---

## Residual Risks

1. **Side-B XP/currency (M17 scope):** PvP opponent who wins earns zero XP and zero gold. Explicitly deferred per ADR-0109 D10. Comment added to code.

2. **team-preview via challenger_party_ids:** Target can preview the challenger's full team (species/level/stats/moveset) via public `battle_challenge` table before deciding to accept. Arguably intentional (Pokémon-style team preview); flagged as design note for M17 competitive mode spec.

3. **guard 5b harassment vector:** A player can block another's ability to send challenges by sending them an incoming challenge. Impact limited: the targeted player can decline immediately. Not a hard lock. May be re-evaluated when ranked/competitive mode ships.

4. **Per-turn ability reload:** `resolve_pvp_turn_if_ready` re-queries `species_row` for ability IDs on every turn. If `sync_content` runs between turns, abilities could shift mid-battle. Low probability; noted for M17.

---

## CI State

`just ci` exits **0** after review-pass fixes. All 32 evals pass (including `no-idle-accrual` which verified `pvp_deadline_reaper` is not a growth writer). 1169 workspace tests green. Knowledge bundle regenerated and committed.

**Why:** **APPROVE-MERGE**
