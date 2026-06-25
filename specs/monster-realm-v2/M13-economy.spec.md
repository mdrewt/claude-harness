# Spec: M13 — Economy & inventory (currency + shops)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M12.
**Decisions:** ADR-0006 (content), 0010 (proof-of-teeth), 0015 (owner RLS), 0018 (inventory primitive), 0022
(currency & shop economy). **No v1 precedent** — designed from standards + the inventory backbone.
**Workflow:** design → review (§7).

## 1. Problem / intent

Give items value: a **currency**, **shops** (run by town NPCs, M12) to buy/sell, and the sinks/sources that
make the inventory matter — built **on the M9 inventory primitive** (ADR-0018) so the item/currency mutation
surface stays single and overflow-safe, and so M15 (player↔player trade) reuses the same backbone. Success =
buy/sell at content-defined prices with server-validated currency, balanced sinks (shop costs, town healing)
and sources (selling, rewards), all owner-private and overflow-safe.

## 2. Scope

**In scope**
- **Currency:** an owner-private **balance** (a `wallet`/`player` field or `player_wallet` table, RLS
  owner-scoped, ADR-0015), mutated only via **saturating** helpers (`grant_currency`/`spend_currency`,
  mirroring ADR-0018: cap, never unchecked `+=`, reject on insufficient funds).
- **Shops** (content): RON shop definitions (stock, buy/sell prices) referenced by town NPCs (M12 dialogue
  entry); `sync_content`-seeded, validated.
- **Reducers:** `buy(shop_id, item_id, qty)` (validate stock + funds → `spend_currency` → `grant_item`) and
  `sell(item_id, qty)` (validate owned → `consume_one`×qty → `grant_currency`) — server-validated,
  reject-not-clamp, the server is the counterparty.
- **Sinks/sources:** shop purchases + town healing (M12) as sinks; selling + quest/battle rewards as sources
  (balance is content/data).
- **Frontend:** a `shop` screen (M4 `ScreenManager`) + a wallet display; pure subscription views + ownership-
  checked reducers.

**Out of scope (named deferrals)**
- **Player↔player item/currency trade** → M15 (reuses this backbone + a dual-consent escrow). **Auction
  house / player markets** → later, on the M15 escrow. **Multiple currencies / premium currency** → YAGNI
  (single currency now; the model is extensible).

## 3. Acceptance criteria (EARS)

**Currency (ADR-0022/0018) + privacy (ADR-0015)**
- WHEN currency is granted/spent THE SYSTEM SHALL use saturating helpers (cap on grant; **reject on
  insufficient funds**, never go negative or clamp silently); the balance is **owner-private** (RLS; a
  non-owner sees nothing — privacy fixture).

**Shops**
- WHEN `buy` is called with sufficient funds and available stock THE SYSTEM SHALL `spend_currency` then
  `grant_item` **atomically**; IF funds/stock are insufficient or the shop/item is invalid THEN reject with
  `Err`.
- WHEN `sell` is called for owned items THE SYSTEM SHALL `consume_one`×qty then `grant_currency` atomically;
  IF the items aren't owned (or are escrowed, M15) THEN reject with `Err`.
- Prices/stock are **content** (server-side); the client never sets a price (a client-priced buy is rejected).

**Integrity**
- IF a shop references a non-existent item THEN `validate_content` SHALL fail (fixture). Every grant/spend
  routes through the single helper surface (ADR-0018/0022) — a bypass fails review.

## 4. Plan (high level)
- **Currency mirrors ADR-0018:** one balance per player, saturating + reject-on-insufficient, single mutation
  surface; every economy path (buy/sell, rewards, healing cost) routes through it.
- **Shops** are content + thin reducers (validate → spend/grant atomically); the server is the counterparty
  (no cross-player consent needed — that's M15). Atomicity is free (one transactional reducer).
- **Reuse** M9 `grant_item`/`consume_one`; M12 rewards/healing route through the currency helpers.

**Boundary preview — what M15 will consume:** the item + currency helpers + the validated-atomic-transaction
pattern; M15 adds a **dual-consent escrow** for player↔player trades on top (no new mutation surface).

## 5. Tasks
- [ ] Currency balance (RLS owner-scoped) + `grant_currency`/`spend_currency` (saturating, reject-on-insufficient) + privacy/overflow fixtures.
- [ ] Shop content (RON) + `validate_content` + `buy`/`sell` reducers (atomic, server-priced) + security-auditor.
- [ ] Wire sinks/sources (healing cost, quest/battle rewards) through the currency helpers.
- [ ] Frontend shop screen + wallet display; doc-keeper changelog + memory.

## 6. Risks / decisions
- **Single currency (default, flagged for the M14/Phase-B checkpoint)** — sufficient and simplest; multiple/
  premium currencies are an extensible future option.
- **Server-priced, server-as-counterparty** — a client-set price or client-computed total is a classic
  economy exploit; prices are content, totals are server-computed; reject-not-clamp.
- **Overflow/negative balance** → saturating cap + reject-on-insufficient (never negative); single helper
  surface (ADR-0018/0022), gated.
- **Open:** price tables, starting funds, sink/source balance → data, tunable (an economy-balance pass later).

## 7. Review / red-team notes
### Design notes (no v1 precedent — built on the inventory backbone)
The economy is the M9 inventory primitive + a parallel currency primitive (same saturating/single-surface
discipline) + content-priced shops. Built so M15 player-trade reuses it with only a dual-consent escrow
added — "build the cross-player transaction primitive once."
### Red-team
- Client-set prices/totals → server-priced content + server-computed totals. · Negative/overflow balance →
  saturating + reject-on-insufficient. · Selling escrowed/in-use items → reuse the reject guards (M15/M7). ·
  Currency leak → RLS + privacy fixture.
### Simplify
Single currency; server-as-counterparty (no consent); reuse the inventory helpers; player markets deferred.
