---
name: monster-realm-m16.5c
description: M16.5c trade client completion (ADR-0114, PR #185): overlay symmetry e2e, typed TradeStatus, render hygiene + UI deadlock fix
metadata:
  type: project
---

Close three M16.5 ninth-review residuals. ADR-0114 (PR #185). next-free ADR: 0115.

**Why:** Ninth-review found missing e2e, string-typed status, and render hygiene gaps in M15b trade UI.

**What shipped:**

1. **16.5c-1 — Overlay symmetry e2e**: KeyQ/KeyH/KeyG guards already correct from M16b with `!tradeView?.visible` checks. New Playwright e2e test added: `client/e2e/trade.spec.ts` line ~200, case `'trade open: G/Q/H keys do not open overlays (16.5c-1)'`. Uses `toBeHidden({ timeout: 2_000 })`.

2. **16.5c-2 — Typed TradeStatus**: `StoreTradeOffer.status` narrowed from `string` to `'Pending' | 'ConfirmedByCounterparty'` in `store.ts` line 253. SDK boundary cast at `rowConvert.ts` line 524: `row.status.tag as 'Pending' | 'ConfirmedByCounterparty'`. `TradeStatus` type exported from `tradeModel.ts` line 45. `deriveActionsAndLabel` uses exhaustive two-switch structure with NO `default:` arm — TypeScript TS2366 fires on a new variant (proven empirically without `noImplicitReturns` — TS2366 fires for any function whose explicit return type excludes `undefined` and has an unreachable return path).

3. **16.5c-3 — Render hygiene**: `#lastRenderKey: string | null` in `tradeView.ts` tracks `${tradeId}-${statusLabel}`; on change, clears `#feedbackEl.textContent`. `btn.disabled = this.#pending` in `#renderActions()` at button creation. **Critical fix from red-team (TV-4)**: `finally()` now uses `this.#actionsEl.querySelectorAll<HTMLButtonElement>('button')` loop (not captured `btn` closure reference) — the old closure was orphaned when `render()` fired mid-flight (normal SpacetimeDB batch flow), causing UI deadlock.

**Key traps:**

- `finally()` captures btn by closure — if `render()` fires mid-flight (normal SpacetimeDB path: row-update batch before reducer Promise settles), `innerHTML=''` orphans the captured button. Fix: `querySelectorAll<HTMLButtonElement>('button')` loop in `finally()`.
- TypeScript exhaustive switch (no `default:`) + explicit return type → TS2366 compile error on new variant. This does NOT require `noImplicitReturns` — TS2366 fires for any function whose explicit return type excludes `undefined` and has an unreachable return path.
- SDK boundary: `row.status.tag as 'Pending' | 'ConfirmedByCounterparty'` in rowConvert.ts — trust-the-server pattern (consistent with battleChallengeRowToStore). Runtime crash path exists if server sends unexpected variant, but consistent with all other SDK converters.
- `#lastRenderKey` only clears `#feedbackEl` on key CHANGE — same-key re-renders preserve feedback intentionally.
- `render(no-trade)` does NOT clear `#feedbackEl` directly — only sets `#lastRenderKey=null` so next trade render will clear. Minor transient stale feedback accepted (out of spec scope).

**Tests:**
- TV-1: buttons disabled during pending (re-render while #pending=true)
- TV-2: feedback clears on statusLabel change
- TV-3: feedback clears on no-trade→trade transition
- TV-4: buttons re-enabled after Promise resolve + mid-flight render (red-team finding)
- TM-12a: all 4 role×status cells (exhaustive)
- TM-6d updated: tests both valid statuses (not 'SomeFutureStatus' — now a compile error)
- TM-10a updated: `fc.constantFrom('Pending', 'ConfirmedByCounterparty')` (not 'UnknownFutureStatus')
- e2e: G/Q/H overlay guard test

**Gate result:** `just ci` EXIT=0, 943 tests, 61 evals. Commits: 40af2bc (main impl) + 560df95 (red-team fix) + 94e8912 (docs).

**Next slice:** Per M16.5 spec, 16.5d (trade runtime coverage — e2e propse→respond→confirm flow + escrow-guards eval fix; ADR-0115 reserved).
