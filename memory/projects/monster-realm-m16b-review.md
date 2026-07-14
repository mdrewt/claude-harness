---
name: monster-realm-m16b-review
description: Review pass verdict for PR #176 (m16b PvP client UI) — FIXED, 5 defects pushed as 51e6f5d + 6e016bb
metadata:
  type: project
---

# m16b Review Pass — VERDICT: FIXED (pushed 51e6f5d, 6e016bb)

**PR:** #176 `feat(m16b): PvP client UI`
**Branch:** `feat/m16b-pvp-client-ui`
**Pre-fix tip:** `ce89707`
**Post-fix tip:** `6e016bb`
**Date:** 2026-07-14
**Triggered by:** Supervisor pre-merge audit — zero tester-role invocations in build run

---

## Defects Found and Fixed

### Commit 51e6f5d — Two fixes

**FIXED — WARNING RT-M16B-R1: KeyG missing `!tradeView?.visible` guard**

`client/src/main.ts:470-479`: The `KeyG` (shop) handler was missing `!tradeView?.visible`.
Shop could open over an active trade overlay. ADR-0110 RT-M16B-03 closed KeyQ/KeyH/KeyT
but missed KeyG. Added `!tradeView?.visible` at line 477.

**FIXED — WARNING RT-M16B-R2: pvpView `forceVisible` preservation ignores `anyOverlayVisible`**

`client/src/main.ts:905-906`: Changed from
`(!anyOverlayVisible && vm.incoming !== null) || (pvpView?.visible ?? false)`
to `!anyOverlayVisible && (vm.incoming !== null || (pvpView?.visible ?? false))`.
Prevents pvpView staying open over a newly-started battle when player accepts a challenge
while pvpView is open.

### Commit 6e016bb — Three fixes

**FIXED — WARNING RT-PVP-01: pvpModel.ts returns non-Pending outgoing (auto-show bypass)**

`client/src/ui/pvpModel.ts:75`: Added `&& c.status === 'Pending'` to outgoing selection.
Without this, terminal-status (Declined/Cancelled/Accepted) outgoing challenges caused
`pvpView.refresh`'s `hasActive` check to trigger `show()` even when `forceVisible=false`
and `anyOverlayVisible=true`. 4 new gating tests in `pvpModel.test.ts` (3 terminal→null,
1 Pending→non-null).

**FIXED — WARNING W-1: pvpView.refresh `hasActive` bypasses `forceVisible` guard**

`client/src/ui/pvpView.ts:86`: Changed `if (!hasActive && !forceVisible)` to
`if (!forceVisible)`. The `hasActive` path was an independent auto-show trigger that
bypassed the batch listener's `anyOverlayVisible` check entirely — an incoming challenge
during an active battle would trigger `this.show()` regardless of `forceVisible=false`.
The batch listener's `forceVisible` is now fully authoritative.

**FIXED — WARNING Finding-2: pvpPendingTurnNumber not cleared on forfeit**

`client/src/main.ts:772-777`: Added `|| r.action.battle.outcome !== 'Ongoing'` to the
clear condition. `apply_pvp_forfeit` sets a terminal outcome without calling `advance_turn`,
so `turnNumber` stays at N and `N > N` never fires. The "Waiting for opponent" banner
would persist on the outcome frame and into a subsequent battle's early turns.

---

## Lens Results

### Tester lens (mandatory — the missing role from the build run)

3 full runs pre-fix: **934/934 stable** (no flake).
Mutation A (pvpPendingSubmit guard bypass) → **RED**: 2 tests failed (teeth confirmed).
Mutation B (isPvp always-false) → **RED**: 6 tests failed (teeth confirmed).
Mutation C (forceVisible always-true in main.ts) → **GREEN** (main.ts orchestration untestable
at unit level — only e2e covers it; RT-M16B-R2 + W-1 fix addresses the actual logic bugs).
Git status after restores: clean.

### Verifier lens

934/934 stable (3 runs). `just ci` passes. No `.skip`/`xit`/`xdescribe`/`.only` markers.
Fixture change `opponentIdentity: 'npc' → 'alice'` is a CORRECTION (not weakening):
keeping 'npc' would make default fixture PvP under the new isPvP detection.
RT-PVP-DS-01 double-submit suppression tests have real DOM-query teeth.
Style gap: `pvpModel.test.ts` lacked `// Kills:` comments (4 new RT-PVP-01 tests add them).

### Red-team lens

Confirmed: `battle_action` never subscribed (ADR-0015 clean); double-submit race
safe by server one-battle-per-player invariant; `new Identity()` with bad hex gracefully
degrades (no exploit); `battle_challenge SELECT *` exposes all challenges (by-design,
acknowledged INFO per ADR-0109 W3).

Found and fixed: RT-PVP-01 (outgoing filter) + forfeit clear gap.
INFO: comment in connection.ts says "challenger + target subscribe" but SELECT * gives
all clients all challenges — recommend disclosure comment update (no code change).

### Reviewer lens

Confirmed all ADR-0110 design invariants. Found and fixed: RT-PVP-01 + pvpView hasActive
bypass (W-1) + KeyG gap (W-3).
MINOR M-1 (vm===null dead code in pvpView.refresh) — acceptable defensive code, left as-is.
MINOR M-2 (?? null fallback disables pending guard) — low-risk, not fixed (server invariant
prevents zero-battle battle-view scenario).
MINOR M-3 (showFeedback dead API) — documented inconsistency, not fixed (sendGuarded
pattern is intentional; shopView/tradeView use async await pattern instead).

---

## Final CI Status

- Unit tests: **938/938 PASS** (934 original + 4 new RT-PVP-01 gating tests)
- Evals: **58/58 PASS**
- Remote CI will re-run at tip `6e016bb`

---

## ADR Note

No new ADR created. All fixes are within ADR-0110's claimed guarantees.
ADR next-free remains **0111**.
