# 0022. Currency & shop economy
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M13 design. Extends ADR-0018 (inventory); reused by M15 (player trade).

## Context and problem statement
Items need value: a currency and shops, with sinks (purchases, healing) and sources (selling, rewards). The
economy must be cheat-proof (no client-set prices/totals, no negative/overflow balances), owner-private, and
built so player↔player trade (M15) reuses the same transaction surface rather than a second one.

## Considered alternatives
- **A single saturating owner-private currency + server-mediated, content-priced buy/sell (chosen).** One
  balance per player mutated only via `grant_currency`/`spend_currency` (cap, reject-on-insufficient — the
  ADR-0018 discipline for currency); shops are content (prices/stock); the server is the counterparty and
  computes totals; buy/sell are atomic transactional reducers.
- **Item-only barter (no currency).** Simpler but thin economy; awkward for shops. Rejected (currency is the
  expected model).
- **Multiple / premium currencies.** More design surface than the scope needs now; the single-currency model
  is extensible. Deferred (YAGNI).
- **Client-computed prices/totals.** A classic exploit. Rejected — prices are content, totals server-side.

## Decision outcome
- Chosen: **one saturating, owner-private currency; content-priced, server-mediated, atomic buy/sell.**
- Consequences: every economy path (buy/sell, quest/battle rewards, healing cost) routes through the
  currency + item helpers (single mutation surface, gated with fixtures); M15 player-trade adds only a
  dual-consent escrow on this backbone — no new mutation surface. Balance (prices, funds, sinks/sources) is
  tunable content.
