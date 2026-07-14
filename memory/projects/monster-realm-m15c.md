---
name: monster-realm-m15c
description: M15c trade evals tail — 3 eval files + e2e wiring; ADR-0108; PR #170; next-free 0109
metadata:
  type: project
---

M15c is the final M15 trading slice: test-artifact only (no production code). Built on merged m15a (ADR-0106) and m15b (ADR-0107).

**ADR:** 0108 at `docs/adr/0108-m15c-trade-evals.md`
**PR:** https://github.com/mdrewt/monster-realm/pull/170
**Branch:** `feat/m15c-trade-evals-e2e`
**Worktree:** `.claude/worktrees/m15c`

**What shipped:**
- `evals/trade-reducer-security.eval.mjs` — 12 criteria (TR-13..TR-19): no-genes, disconnect hook, propose/respond/confirm role+status+reread+delete, cancel party-check, trade_offer public
- `evals/trade-escrow-guards.eval.mjs` — 11 guard sites (TR-2..TR-12): reject_if_monster_in_trade in 7 reducers (fuse≥2, start_battle≥2), escrowed_item_qty×2, escrowed_currency_amount×2
- `evals/trade-conservation.eval.mjs` — TR-16: dual-write monster+pub, item consume+grant, currency spend+grant, row deletion in confirm_trade
- `client/e2e/trade.spec.ts` — DOM wiring, KeyU/Escape, "No active trade", mutual exclusivity, empty sides

**Key design decisions (ADR-0108):**
- RT-SEC-01: hasCancelPartyCheck requires `if\s+` before both expressions (not macro args); order-agnostic via two alternatives
- RT-SEC-02: bodyHasGuard counts `guard + '('` (call sites only); string literals never end in `(` so they're excluded
- start_battle minCount=2 (both party + opponent loops must have the guard)
- e2e mutual exclusivity uses waitForFunction on `#app > div[display:flex]` (deterministic, not timeout-based)
- Round-trip e2e hidden dependency: propose→confirm requires two distinct players + test-hook; documented in spec header; evals provide static coverage in the interim

**Traps:**
- `bodyHasGuard` needle is `guard + '('` — any future guard that takes no parens would need a different counting approach (unlikely for Rust)
- hasCancelPartyCheck `[^{]*?` prevents cross-block matches; nested if-in-if form (initiator outer, counterparty inner) would NOT be caught — production code uses `&&` form
- evals run from project root (CWD matters for `readFileSync` relative paths)

**next-free ADR:** 0109

**Why:** [[monster-realm-m15a]] [[monster-realm-m15b]]
**How to apply:** m15c DONE; M15 trading fully closed (server + client + evals). Check [[monster-realm-handoff]] for merge status.
