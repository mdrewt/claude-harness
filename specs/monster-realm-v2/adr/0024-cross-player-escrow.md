# 0024. Cross-player escrow & dual-consent transactions
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M15 design. The cross-player transaction backbone reused by markets and PvP handshakes.

## Context and problem statement
Two players exchanging assets (monsters/items/currency) is the first transaction where neither party is
trusted *and* both must agree. It must be dupe-proof and theft-proof, must prevent using an asset that's
mid-trade, must let a counterparty see what's offered without leaking hidden state, and must be atomic.

## Considered alternatives
- **Dual-consent + escrow-in-the-offer-row + atomic re-verified swap (chosen).** A `trade_offer` row (RLS to
  the two parties) holds the lock; a `reject_if_in_trade` guard on every asset-mutating reducer enforces the
  escrow; `confirm_trade` re-reads both live rows, re-checks ownership/escrow, and swaps in one transaction.
  A display-only `MonsterCard` snapshot shows the offered monster without exposing its row.
- **Optimistic swap without escrow** (transfer on confirm, no lock). Lets a player sell/fuse the asset
  between offer and confirm → theft/dupe. Rejected.
- **A central "trade holding" account** (move assets to escrow ownership). More moving parts + a failure mode
  (assets stuck in escrow). The in-row lock is simpler. Rejected.
- **Client-mediated trade.** A client could fake consent/ownership. Rejected (server-authoritative).

## Decision outcome
- Chosen: **dual-consent, escrow-in-row, atomic re-verified swap, display-only snapshots.**
- Consequences: a `reject_if_in_*` guard family (battle, trade) is wired into every asset-mutating reducer
  mechanically (proof-of-teeth), not by discipline; `confirm` is one transactional reducer; disconnect
  releases escrow. This backbone is reused by the M16 PvP **challenge** handshake (same directed,
  RLS-to-two-parties shape) and any future player market.
