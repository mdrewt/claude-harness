---
name: monster-realm-m17.5b
description: m17.5b trade conservation — ordered_steps() debits-before-credits SSOT + netted currency headroom (ADR-0123, PR #205); arg-span needle pattern; doc-keeper main-checkout misfire trap
metadata:
  type: project
---

# Monster Realm m17.5b — trade same-item near-cap conservation (ADR-0123, PR #205)

**Delivered (2026-07-18):** EARS 17.5b-1/2/3. `SwapPlan::ordered_steps() -> Vec<ApplyStep>` in
game-core is the published debits-before-credits SSOT (per-transfer exact parity; credit variants
carry `to_initiator = !from_initiator` inverted ONCE at emission — no inversion at any dispatch
site). `confirm_trade` = one exhaustive 4-arm match; legacy per-transfer loops deleted. Currency
headroom netted INLINE in the `check_headroom` args (`wallet_balance(x).saturating_sub(offer.x_currency)`)
— cap-headroom-only: a broke sender passes the check and rejects at `spend_currency` with
whole-transaction rollback (platform atomicity, documented ADR-0123 D2). Amends ADR-0113.

**Traps / patterns worth reusing:**
- **Arg-span needle pattern:** body-wide `contains` needles are bypassable by dead let-bindings
  (`let _pin = <needle-expr>;`) — verify needles INSIDE the target call's paren-depth-matched
  argument span (mirrors `check_authorize_call`). EA-CONSERVATION-ORDER-01 does this; the gate
  consequently REQUIRES the inline argument form — a named-variable refactor must update the gate
  (pinned + explained by EA-CONSERVATION-ORDER-INLINE-01).
- **Constructive proptest bounds must match the plan quantities:** bounding only the headroom-check
  inputs while building the plan with unbounded sends made a correct implementation trip the model
  tripwire in ~17% of draws — bound the sends BEFORE building the plan.
- **Tripwire-before-clamp:** a clamp-mirroring test model must `assert!` the no-overflow invariant
  BEFORE applying `.min(cap)`, or the mirror silently absorbs the regression it exists to catch.
- **Doc-keeper main-checkout misfire (2nd occurrence — also m17a):** doc-keeper wrote ADR/ARCH to
  the MAIN checkout instead of the worktree, and fabricated mechanism details (inverted root cause,
  invented "synthetic ledger" eval, >240-char Decision line caught by the adr-digest gate).
  Recovery: plain file copies only (no git mutations against the main checkout). Review doc-keeper
  ADR content against ground truth before committing.
- **Scan needles double as mutation killers:** `include_str!` source-guard tests catch cargo-mutants
  mutants that alter pinned text (netting ops, loop forms). mutate-server landed at EXACTLY the
  299 baseline (513 mutants) — zero new survivors from the refactor; bare `if flag` dispatch reads
  generate no mutants at all.

**Residuals:** shop buy/sell cap-headroom = slice 17.5c (next); `consume_one` O(qty) → candidate
`consume_qty` primitive; future `ordered_steps()` callers must run netted `check_headroom` first
(type-unenforced pairing, ADR-0123 D6). ADR next-free = 0124. See [[monster-realm-m17.5a]],
[[monster-realm-m16.5b]] (item netting precedent).
