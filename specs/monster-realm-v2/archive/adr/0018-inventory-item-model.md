# 0018. Inventory & item model (one-stack, saturating helpers)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M9 design; the inventory foundation that M13 (economy) and M15 (item-trade) extend.

## Context and problem statement
Players own consumable items (bait M8, training food M9, later shop goods M13, quest rewards M12). Item
quantities are owner-private and mutated from many paths; a naive model (insert-per-grant, `quantity += n`)
corrupts under reconnect re-delivery, overflow, and zero-quantity lingering — v1 hit exactly these. The
model must make those bugs unrepresentable and be reused by every grant/spend path.

## Considered alternatives
- **One stack per `(owner, item_id)`, quantity mutated only via `grant_item` (`saturating_add(..).min(CAP)`)
  and `consume_one` (delete at zero) (chosen).** A single mutation surface every path routes through; the
  one-stack + saturating + delete-at-zero invariants can't be bypassed. Owner-private via RLS (ADR-0015).
- **Multiple stack rows + naive insert per grant.** Reconnect re-delivers inserts → duplicate stacks; more
  bookkeeping. Rejected.
- **Unbounded `quantity += n`.** `u32` overflow corrupts the stack on a repeatable grant path. Rejected.
- **Per-item-instance rows** (one row per physical item). Heavy and unnecessary for stackable consumables.
  Rejected (revisit only for unique/non-stackable items if ever needed).

## Decision outcome
- Chosen: **one saturating-capped stack per `(owner,item_id)`, mutated only via `grant_item`/`consume_one`,
  RLS owner-scoped.**
- Consequences: every grant/spend (M8 bait, M9 food/care, M13 shop, M12 quest reward, M15 item-trade) goes
  through the two helpers; the invariants are gated (a proof-of-teeth fixture rejects a multi-stack/overflow
  variant). M13 currency and M15 escrow build additively on this surface.
