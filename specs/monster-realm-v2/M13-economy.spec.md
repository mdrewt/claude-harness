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
- [x] Currency balance (RLS owner-scoped) + `grant_currency`/`spend_currency` (saturating, reject-on-insufficient) + privacy/overflow fixtures.
- [x] Shop content (RON) + `validate_content` + `buy`/`sell` reducers (atomic, server-priced) + security-auditor.
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

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
