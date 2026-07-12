---
name: monster-realm-deflake-recruit-r2-progress
description: deflake-recruit-r2 — cycle-2 fix pushed (b946d0a), remote CI pending; root cause = write_back_party_hp on flee + cooldown-budget risk
metadata:
  type: project
---

# deflake-recruit-r2 — Progress Memo

**Status: cycle-2 fix pushed — PR #144 open, local `just ci` EXIT=0, remote CI running.**

## TRUE ROOT CAUSE (cycle-2 discovery)

Previous session (tip 351145e) falsely claimed DONE. CI run 29154350070 on that head showed
`R2 diagnostics: encounters=30 recruitClicks=1 heals=0 recruited=false`.

The *actual* root cause: **HP depletion persists across encounters via `write_back_party_hp` on flee.**

- `flee` reducer → `write_back_battle_results` → `write_back_party_hp` (ADR-0047)
- Next `begin_encounter` builds `side_a.team[0].current_hp` from current DB HP
- After flee at HP=4/20 (20%), next battle starts at 20% → immediately triggers `OWN_HP_FLEE_THRESHOLD_PCT=30%` → flee with no combat → no recruit phase
- `heals=0` because `battleEndedWithPartyAlive=true` for all flees (KO path never triggered)
- `recruitClicks=1` because only the FIRST non-Water encounter reached recruit phase

The cycle-1 budget raise (MAX_ENCOUNTERS 14→30) just exposed the infinite-flee loop more visibly.

## FIXES APPLIED (cycle 2)

### Commit e5bef40 — root cause fix

`client/e2e/recruit.spec.ts` (+123 insertions):

- `MAX_FLEE_HEALS = 30` constant with root-cause rationale comment
- `restoreHpBeforeEncounter(p)` function: opens box, checks HP via
  `/HP (\d+)\/(\d+)/g` regex, heals via "Heal Party" if < 80%.
  Retry loop: 8 clicks × 6 s each = 48 s max (covers 30 s server cooldown).
- `fleeHealCount` variable + call at top of each enc iteration
- Per-encounter `console.log` diagnostics
- `fleeHeals=${fleeHealCount}` in final R2 diagnostics line

### Commit b946d0a — hardening from reviewer + red-team lenses

Four fixes:

**M-1/M-2 (matchAll):** Single `.match()` only checked the first monster's HP.
Replaced with `matchAll(/HP (\d+)\/(\d+)/g)` + `.some(anyLow)` for needsHeal check
and `.every(allHealthy)` for the restore-confirmation wait, so ALL visible monster
rows must satisfy the 80% threshold.

**FINDING-4 (cooldown guard):** Added `HEAL_COOLDOWN_MS = 31_000` constant and
`lastFleeHealAt` tracker. The enc-loop skips `restoreHpBeforeEncounter` if a heal
fired <31 s ago. Without this, consecutive Water-type flees with an active cooldown
caused 8×6 s = 48 s busy-wait per iteration, risking the 900 s timeout.

**M-3 (log on box-open fail):** Added `console.log` when 20-try box-open loop
exhausts so CI logs show the skip reason.

**LOW-1 (timeout bump):** `needsHeal` `waitForFunction` timeout 2 000 → 5 000 ms.

## VALIDATION

| Gate | Result |
|------|--------|
| `just client-typecheck` | PASS (clean) |
| `just client-test` | PASS (778/778) |
| `just eval` | PASS (53 evals green) |
| `just ci` (full) | PASS EXIT=0 |
| Reviewer lens | PASS (M-1/M-2/M-3/LOW-1 all fixed in b946d0a) |
| Red-team lens | PASS (FINDING-4 cooldown guard fixed, FINDING-1 matchAll fixed) |
| Verifier lens | PASS (gates 1–5 all green, no test weakening) |

## PR / BRANCH

- **Branch:** `feat/deflake-recruit-r2`, tip `b946d0a`
- **PR:** https://github.com/mdrewt/monster-realm/pull/144

## REMAINING

None locally. Remote CI e2e job is the final gate.

## EXACT NEXT STEP

**Supervisor:** squash-merge PR #144 → master once remote CI (e2e job) green.
Then advance to M14.5 or next queued Phase C item per PLAN §9.

**ADR 0098 not consumed** — available for next ADR-worthy slice.
