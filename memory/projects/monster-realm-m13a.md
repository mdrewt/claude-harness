---
name: monster-realm-m13a
description: m13a currency primitive — PR #111 review pass COMPLETE; branch e020be5 pushed, remote CI running
metadata:
  type: project
---

# M13a — Currency Primitive (PR #111)

**Status:** Post-hoc review pass COMPLETE. Branch `feat/m13a-currency-primitive` at `e020be5`. PR #111 open. Remote CI running. Supervisor owns merge.

**Why:** Supervisor's pre-merge audit flagged the original build log as overwritten (0 Agent invocations recorded) → mandatory review pass required before merge.

**How to apply:** When resuming or continuing M13 work, M13a is fully reviewed and CI-green. Supervisor should squash-merge to master, then M13b (shops) can start.

---

## DONE

- 5 parallel review lenses: reviewer / red-team / reducer-security-auditor / desync-guard / verifier
- All findings addressed:
  - **RT-C1-01** (RED HIGH): `hasSaturatingCap` accepted `saturating_add.min(u64::MAX)` — wrong cap. Fixed: require `apply_grant` delegation exclusively
  - **RT-C2-01/02** (RED HIGH): `saturating_sub`/`wrapping_sub` bypassed C2 check. Fixed: `hasUncheckedBalanceDecrement` helper added + wired into scan
  - **RT-C4-01** (RED MEDIUM): `hasZeroGuard` was file-scoped; guard in `spend_currency` could satisfy check even if `grant_currency` lost its guard. Fixed: brace-depth walk scopes search to `grant_currency` function body
  - **Reviewer MAJOR-1**: Missing `#[must_use]` on `apply_grant` (u64 return). Added. `apply_spend` correctly omitted (`Result` already `#[must_use]`, clippy `double_must_use`)
  - **Reviewer MAJOR-2**: `spend_currency` zero-guard was a mutation survivor (no test). Added `spend_currency_has_zero_amount_guard` → 5 economy_tests total
  - **Reviewer MINOR-4**: `economy_tests.rs` not excluded from ACCESSOR_BYPASS eval scan. Fixed
  - **Reviewer MINOR-5**: "no wallet" vs "insufficient funds" error distinction undocumented. Added to ADR-0081 Consequences
- `just ci` EXIT=0 (801 Rust + 574 client + 48 evals all green)
- Committed `e020be5`, pushed to `feat/m13a-currency-primitive`

## REMAINING

- Supervisor to squash-merge PR #111 to master (remote CI must be green)
- M13b: shops (buy/sell reducers) — serial after m13a

## BLOCKERS

None.

## EXACT NEXT STEP (for supervisor)

1. Wait for remote CI on `e020be5` to go green
2. Squash-merge PR #111 to master with Conventional Commit: `feat(m13a): currency primitive — player_wallet (private) + apply_grant/spend + economy helpers (ADR-0081)`
3. Launch M13b (shops: RON shop content + buy/sell reducers)

## M13b FORWARD OBLIGATIONS (from reducer-security-auditor)

- Every M13b reducer calling `spend_currency` MUST first call `require_owner` and pass `ctx.sender` as `owner`
- Remove `#[allow(dead_code)]` from whichever helper gets its first reducer call
- Map both `Err("no wallet")` and `Err("insufficient funds")` to a single opaque user-visible string at the reducer boundary (e.g. "not enough currency")
