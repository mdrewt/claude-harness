---
title: Virtual economy & systems design for games — currencies, sinks & faucets, inventory, shops, trading, and telemetry
slug: virtual-economy-design
domain: gameplay
tags: [virtual-economy, faucets-sinks, currency-design, inflation-control, inventory-model, item-binding, shop-pricing, player-trading, escrow, economy-telemetry, mudflation]
status: active
updated: 2026-06-27
confidence: high
sources: 14
supersedes:
abstract: "Design reference for game economies: dual-currency architecture, faucet/sink balance, inventory data models, server-authoritative shops, dual-consent trading with escrow, and telemetry-driven balancing."
---

## Scope

A **project-agnostic** deep reference on the full stack of in-game economy systems: how currencies are structured and why; the faucet/sink framework that governs inflation and deflation; item and inventory data models (stacking, binding, provenance); server-authoritative shop transactions; player-to-player trading with dual-consent escrow and anti-dupe protections; and the telemetry dashboard and balancing levers used to keep a live economy healthy. Draws on MMO industry practice (EVE Online, Path of Exile, World of Warcraft, Runescape), F2P mobile design, academic economic research on virtual worlds, and game backend platform documentation. Pairs with [[monster-taming-mechanics]] (for collectible/creature economies) and [[online-game-security-anticheat]] (for cheat-proofing all transaction paths).

---

## Key findings

### 1. Currency architecture — soft, hard, and multi-tier systems

The fundamental split is between **soft currency** (earned by playing — time, skill, or grind) and **hard/premium currency** (purchased with real money, or earned very slowly as a login reward). This bifurcation serves several design goals at once:

- **Conversion asymmetry**: Hard currency can always buy soft-currency-priced goods; the reverse is forbidden or rate-capped. This makes premium currency valuable and prevents free players from trivially accessing everything.
- **Monetization control**: If a player could ultimately buy everything with earned currency, the entire catalog is free for sufficiently persistent players. Gating high-value items behind hard-only pricing creates the purchase moment.
- **Psychological distance**: Premium currencies abstract real-money cost, reducing purchase friction. The exchange rate (e.g., 100 gems = $0.99) is deliberately non-round to make mental accounting harder (Shokrizade, "The Top F2P Monetization Tricks").

Modern games routinely extend to **four or more currencies**: primary soft, premium hard, a secondary earned currency tied to a specific system (guild tokens, PvP marks, season pass coins), and social/gift currencies that cannot be bought and can only be sent peer-to-peer. Each additional currency adds a new axis of progression and a distinct pace of accumulation.

**Single-currency pitfall**: Economies with only one currency make it easy to convert every action into a single wealth metric, which collapses distinct economies (crafting vs. combat vs. social) into one and accelerates inflation through cross-domain pooling.

**Hard currency as a soft sink**: Hard currency can act as a safety valve — players may convert it to soft currency at a generous rate, which functions as a de facto faucet for soft currency that the studio can throttle by adjusting that exchange rate or removing the conversion entirely.

### 2. Faucets and sinks — the engine of economic health

Every virtual economy is governed by the same two-force model: **faucets** inject resources into the economy; **sinks** remove them permanently. An economy is healthy when the long-run flow in ≈ flow out. Persistent imbalance in either direction causes well-characterized failure modes.

**Faucet taxonomy:**
- *Enemy drops*: Fixed or RNG-governed drops from combat. Scales with player population and play hours — the most common runaway faucet.
- *Quest / mission rewards*: Discrete, one-time injections. Predictable; used for pacing gates.
- *Passive income*: Buildings, pets, or timers that generate currency while offline. A compounding faucet; dangerous if not capped.
- *Player-to-player generated value*: When players craft items from ingredients obtained from faucets, the craft may inject more total value than the ingredient cost. Net creator of purchasing power.
- *Inflation injections*: Emergency interventions when deflation is detected (bonus events, temporary drop-rate increases).

**Sink taxonomy (from the GDC talk "Economic Balancing and Improved Monetization Through Clever Sink Design", 2014):**
- *Vendor purchases*: NPC stores that consume currency for consumables or cosmetics. The most psychologically accepted sink because players feel they receive value.
- *Repair / durability costs*: Ongoing maintenance fees destroy currency proportional to engagement. High engagement → more generation → more drain; naturally self-balancing.
- *Upgrade / enhancement fees*: Paying currency to upgrade items. A major sink with variable outcomes (some games have item destruction on failure, creating fear and heavy hedging behavior).
- *Fast-travel / convenience fees*: Minor sinks; acceptable to nearly all players.
- *Auction house / marketplace taxes*: A percentage of every player-to-player transaction is destroyed (not transferred). This is a critical sink because it scales with trading volume, which itself scales with economic activity. Runescape's Grand Exchange and World of Warcraft's Auction House both use this mechanic.
- *Cosmetic gacha / crafting material sinks*: Optional but popular; players voluntarily dump currency into random-outcome systems hoping for rare cosmetics. Psychologically powerful; ethically contentious.
- *Time-limited currencies*: Seasonal coins that expire at the end of a season are the ultimate guaranteed sink — all unspent value is destroyed.

**The Daniel Cook / Lost Garden "value chains" model** (2021) formalizes this as: faucets → transforms (crafting steps that add player-contributed value) → drains. The key insight is that each transform adds a psychological value premium even if raw resource quantities remain constant. Long crafting chains create richer economic ecosystems by giving players roles (gatherer, processor, manufacturer, seller) without multiplying currency in the economy.

**Balancing the ratio**: A simple diagnostic is to compute daily net currency creation: `(total faucet output) - (total sink absorption)`. If positive for sustained periods, inflation is occurring. Targets vary by design intent: many live-service games aim for mild (1–3%/month) inflation to keep players feeling rewarded while slowly eroding old hoards. Deflation is considered more dangerous than inflation in practice — when currency is scarce, players stop transacting, markets lock up, and new players cannot afford anything.

### 3. Mudflation and inflation failure modes

**Mudflation** (from "MUD inflation") is the specific failure mode where new content introduces more powerful items at lower relative cost, making veteran players' accumulated gear instantly worthless. It is distinct from currency inflation (too much money) and is driven by item power creep rather than monetary policy. See Richard Bartle's *Designing Virtual Worlds* (2003) for the earliest rigorous treatment.

**Mechanisms that cause mudflation:**
- New content zones drop items 20% better than the previous tier, so the old tier's AH price collapses.
- Crafting recipes for new-tier items require old-tier items as ingredients, briefly spiking demand, then crashing it when the crafting rush ends.
- Level cap raises make entire item categories obsolete.

**Mitigation levers:**
- *Horizontal progression*: New items are different rather than strictly better (build diversity, situational strengths). Reduces power-tier obsolescence.
- *Binding*: Once-equipped or picked-up items cannot be resold. Removes old items from the tradeable economy, slowing mudflation of those items.
- *Item sinks*: Destruction recipes that consume old items to produce new materials create ongoing demand for the old tier.
- *Transmog/cosmetic layer*: Veteran achievements persist as visible cosmetics even when the gear is replaced, preserving the social value of past attainment.

**Runaway inflation** (distinct from mudflation) is caused when faucets outpace sinks at scale. EVE Online's "Blackout" event in 2019 and its 2021 "Age of Scarcity" update (restricting ore availability and increasing ship construction costs) are the canonical large-scale live interventions — CCP used its full-time economist Eyjólfur Guðmundsson (hired 2007, the first game economist in the industry) to monitor and model these. Both interventions caused short-term market shocks before stabilizing.

### 4. Inventory and item data models

The inventory system is the boundary surface between the economy and the player. Its data model determines what is tradeable, how duplication is prevented, and how far back provenance can be traced.

**The two-table pattern** (industry standard for any non-trivial game):
```
ItemTemplate {
  template_id: UUID,          // primary key, identifies the item class
  display_name: string,
  stackable: bool,
  max_stack_size: int,        // 0 = not stackable; 250 = typical consumable cap
  bind_rule: enum { NONE, ON_PICKUP, ON_EQUIP, ACCOUNT_BOUND },
  base_value: int,            // vendor price floor
  category: string,
  ...                         // stats, visual refs, etc.
}

ItemInstance {
  instance_id: UUID,          // GUID — the unique identity of this specific copy
  template_id: UUID FK,
  owner_player_id: UUID FK,
  quantity: int,              // for stackables only; always 1 for non-stackable
  bound_to_player_id: UUID,   // set on pickup/equip; prevents trading when non-null
  durability: int,
  created_at: timestamp,
  provenance_log_id: UUID FK, // pointer into audit/history table
  ...
}
```

**Stacking correctness**: Stackable items (potions, crafting mats, currency coins) can share a single `ItemInstance` row with `quantity > 1`. The danger is partial-stack operations — splitting a stack of 100 into 60+40 must be a single atomic database transaction that deletes the original row and inserts two new rows, or updates the original and inserts one. Any two-phase split without a transaction is a dupe vector.

**Binding semantics:**
- *Bind on pickup (BoP)*: The item's `bound_to_player_id` is set the moment it enters any player's inventory. It can never be traded. Used for progression-critical items to prevent market shortcuts.
- *Bind on equip (BoE)*: Item is tradeable until the first time it is equipped. Creates a market for "new in box" items that collapses once used. World of Warcraft pioneered this to allow gearing via the auction house while limiting re-trading of used gear.
- *Account bound*: Tradeable between a single player's characters but not to other accounts. Used for cosmetics and cross-character currencies.
- *No binding*: Fully tradeable. Used for crafting mats, consumables, cosmetics without prestige value.

**Provenance and audit logging**: Each `ItemInstance` should link to a history table recording every ownership transfer, creation event (crafting recipe ID, drop source, shop purchase), and modification. This enables: (a) detecting dupe exploits post-hoc by finding items with impossible history branches, (b) GM investigations of scam reports, (c) rollback of erroneous transactions. The OpenMU project's analysis of MU Online dupe exploits (Sven, 2018) identifies reproducible item IDs for craft results as a forward-looking countermeasure: if the same ingredients always produce an item with the same derived ID, duplicate IDs in the database are instantly detectable.

**Saturating caps**: Every currency wallet and item stack should have an enforced server-side maximum (e.g., 9,999,999 gold). This prevents integer overflow exploits, limits hoarding scale, and provides a natural ceiling for faucet output at maximum engagement. The cap is a design decision, not just a technical safeguard.

### 5. Server-authoritative shop transactions

A shop (NPC vendor, content store, gacha machine) must be entirely server-side. The canonical implementation is an **atomic buy/sell pattern**:

```
server.buy(player_id, item_template_id, quantity, offered_currency, offered_amount):
  BEGIN TRANSACTION
    // 1. Re-verify price from server catalog (never trust client-sent price)
    canonical_price = catalog.get_price(item_template_id) * quantity
    if offered_amount < canonical_price: ABORT → PriceMismatch

    // 2. Verify and deduct currency atomically
    wallet = lock_player_wallet(player_id)
    if wallet.balance < canonical_price: ABORT → InsufficientFunds
    wallet.balance -= canonical_price

    // 3. Create item instance(s) and assign to player
    item = create_item_instance(template_id, owner=player_id, quantity=quantity)
    add_to_inventory(player_id, item)

    // 4. Log transaction
    log_transaction(type=SHOP_BUY, player=player_id, item=item, cost=canonical_price)
  COMMIT
```

Key invariants:
- **Price re-verification**: The server reads the price from its own catalog on every purchase. Client-sent price parameters are ignored. This prevents client-side price manipulation.
- **Atomicity**: Currency deduction and item grant happen in one transaction. No possibility of deducting currency without granting the item, or granting the item without deducting currency.
- **Idempotency token**: For mobile/laggy networks, purchases should include a client-generated idempotency token (UUID). If the server receives the same token twice, it returns the result of the first transaction rather than executing again. This prevents accidental double-purchases on retry.
- **Receipt logging**: Every transaction generates an immutable log entry. Enables retroactive audits, refunds, and economy analysis.

PlayFab's Economy v2 service (Microsoft) provides this pattern as a managed service: `PurchaseInventoryItems` API deducts virtual currency and grants items in a single server-side operation; client devices call via Azure Functions or title game servers, never directly, to prevent forged requests.

**Dynamic pricing**: Some games use supply/demand-sensitive pricing in NPC shops (Path of Exile's currency exchange uses player-driven ratios; some games use exponential price curves for repeated purchases of limited items). Dynamic pricing must still be computed server-side and re-verified at purchase time to prevent race conditions where a displayed price is stale by the time the transaction executes.

### 6. Player-to-player trading — dual-consent escrow and atomic swaps

Player-to-player trading is the highest-risk economy operation because it involves two counterparties who may be adversarial, on different connections with different latency, and who may both attempt to abort at the last instant to gain advantage.

**The dual-consent escrow pattern:**

```
STATE MACHINE:
  IDLE → PENDING_BOTH → A_CONFIRMED → BOTH_CONFIRMED → EXECUTING → COMPLETE
                    ↘ B_CONFIRMED ↗                  ↘ ROLLBACK (on failure)

trade_propose(player_a, player_b, items_a, items_b, currency_a, currency_b):
  // Lock all offered items into escrow (remove from A's inventory, place in limbo)
  escrow.lock(player_a, items_a, currency_a)
  state = PENDING_BOTH

trade_confirm(confirming_player):
  // Called separately by each player
  state → [A or B]_CONFIRMED
  if both confirmed:
    state → EXECUTING

trade_execute():
  BEGIN TRANSACTION
    // Re-verify both parties still have the escrowed items (they do — escrow holds them)
    // Re-verify neither item has been modified (binding check, quantity check)
    // Atomically swap ownership
    transfer(escrow[player_a].items → player_b.inventory)
    transfer(escrow[player_b].items → player_a.inventory)
    state → COMPLETE
  COMMIT or ROLLBACK → IDLE (items returned from escrow)
```

**Why escrow is mandatory**: Without escrow, the naive pattern "A sends first, then B sends" creates a trust asymmetry — whoever sends first is exposed. Escrow holds both parties' contributions in neutral server-controlled storage before either receives anything. This is the game equivalent of the dual-deposit escrow mechanism studied in smart contract research (Hogan-Hennessy et al., arXiv 2210.07970).

**The re-verification step before execute** is critical for anti-dupe: when `trade_execute()` runs, the server must re-check each offered item's current state against the database. If an item's `instance_id` does not exist in escrow (because it was duplicated and the original moved), the transaction aborts. This catches the class of exploit where a player initiates a trade, triggers a dupe, and now has two copies — the re-verify step sees the inconsistency.

**Trade window timeout**: A pending trade with no second confirmation within N seconds (typically 30–60 s) automatically aborts and returns all escrowed items. This prevents "frozen trade" denial-of-service where a player ties up another's inventory.

**Chat/auction scam prevention**: Social scams (link-swapping where a player shows item A but puts item B in the trade window) are addressed by UI design (displaying item names and stats prominently, requiring explicit acknowledgment) and by keeping the confirmation step as the last action after full review. The server cannot prevent social engineering, but it can slow the process and make each item's properties clearly visible at the consent step.

**Item duplication exploits — root causes and server mitigations** (Sven / OpenMU, 2018; GameDev.net forums):
1. *Race condition on save*: Two actions (trade + server change) write the same state at different times; the later write overwrites the first. Fix: serialized session ownership — an account can only have one active session, and the old session's state must be fully persisted before a new session is granted an auth token.
2. *Missing state machine enforcement*: Server allows opening a second dialog (e.g., NPC + trade window simultaneously) that creates an unexpected inventory snapshot conflict. Fix: a per-player state machine that enforces mutually exclusive states (`IN_TRADE`, `NPC_DIALOG_OPEN`, etc.).
3. *Non-atomic stack splits*: Splitting a stackable item into two creates a window between the read of the original and the write of the two children. Fix: all stack operations in a single DB transaction under a row-level lock.
4. *Global duplicate detection*: Each item instance should have a database-level UNIQUE constraint on `instance_id`. If a bug ever creates a duplicate instance_id, the constraint prevents it from persisting. Periodic background jobs can scan for duplicate UUIDs as an additional backstop.

### 7. Economy telemetry and balancing dashboards

A live game economy requires continuous monitoring. Key metrics to track:

**Currency flow metrics:**
- *Daily net currency created*: total faucet output minus total sink absorption, per currency. Target range is design-specific; deviations trigger investigation.
- *Currency velocity*: average number of times a unit of currency changes hands per day. Low velocity signals hoarding or market freeze; high velocity can signal speculation loops.
- *Per-percentile wallet balance*: p10, p50, p90, p99 wallet sizes, tracked daily. A growing p99 with flat p50 signals wealth concentration at the top.
- *Gini coefficient*: applied to virtual wealth distribution. Minecraft economies have been measured at Gini > 0.9 (extreme inequality); game designers typically target Gini < 0.6 to maintain market participation across the player base (research: Bainbridge / Blackwell & Carroll; PMC4143195).

**Item flow metrics:**
- *Item sink/faucet rates by category*: how many of each item category are created vs. destroyed per day.
- *Auction house liquidity*: what fraction of listed items actually sell within 24 hours? Chronic low liquidity signals mispriced items or defunct economies.
- *Price index baskets*: track the player-to-player price of 10–20 key items over time. If the basket price in soft currency is rising, soft currency is inflating (i.e., losing purchasing power).

**Player engagement signals:**
- *Trade volume per DAU*: declining trade per active player suggests reduced market participation.
- *New player time-to-first-purchase*: if new players can't afford anything in reasonable time, faucets are too weak or prices too high.
- *Whale-to-minnow ratio in hard currency spending*: the top 1% of spenders generating >50% of IAP revenue is typical F2P; ratios outside the expected range signal monetization design issues.

**Balancing levers (data-driven interventions):**
- *Faucet rate adjustment*: increase drop rates during deflation; decrease during inflation. Applies immediately to all players.
- *Sink introduction*: add a new NPC vendor selling desirable items for soft currency. Absorbs excess currency without requiring server downtime.
- *Tax rate adjustment*: raise/lower the AH transaction tax. A 1% AH tax on all trades at high volume is a substantial sink; 5% is aggressive.
- *Targeted item injections/removals*: GM-distributed bonus events inject currency/items when the economy is too tight; ban waves for dupers remove illegitimate supply.
- *Price floor/ceiling anchors*: NPC buy prices set a floor (players won't sell cheaper to other players); NPC sell prices set a ceiling (players won't pay more to other players for items also available from NPCs).

**The Machinations modeling tool** (Joris Dormans, from *Game Mechanics: Advanced Game Design*, 2012; now online at machinations.io) allows designers to diagram and simulate economies as flow graphs before launch — running thousands of simulated sessions to detect runaway loops or starvation before real players encounter them. This is the standard tool for pre-launch economy stress-testing.

---

## Concrete examples & references

- **EVE Online player-driven economy and CCP's economist (Fast Company, 2013)**: CCP Games hired Eyjólfur Guðmundsson in 2007 as a full-time in-game economist — the first game studio to do so. The EVE economy is almost entirely player-driven: resources are mined, refined, manufactured into ships and modules, and sold on regional markets. CCP publishes a quarterly Economic Report showing supply/demand, inflation indexes, and regional trade flows. The "Age of Scarcity" update (2021) deliberately restricted ore sources to fight inflation and restore ship value. CCP's ISK/PLEX dual-currency system lets players exchange real money for PLEX (a game-time token), which can then be traded for ISK (soft currency) on the in-game market — a player-regulated hard-to-soft exchange rate. (https://www.fastcompany.com/3024392/meet-the-alan-greenspan-of-virtual-currency-in-eve-online; https://www.eveonline.com/news/view/global-plex-market-and-friction-free-trade)

- **Lost Garden "Value Chains" (Daniel Cook, December 2021)**: Presents the formalization of the faucet-and-drain model as composable value chains. Key finding: long transform chains (raw resource → processed material → crafted component → finished item) create economic roles without inflating total currency, because each transform step destroys input and creates output at a higher psychological value. Chains also localize inflation to specific tiers, making targeted sink adjustment more precise. (https://lostgarden.com/2021/12/12/value-chains/)

- **GDC Vault "Economic Balancing and Improved Monetization Through Clever Sink Design" (2014)**: Catalogs six currency sink archetypes and eleven item sink archetypes with behavioral economics analysis of player acceptance. Core insight: players accept sinks most readily when they receive perceived value in return (vendor purchases); they resist sinks that feel punitive (repair costs in down-time). Framing a sink as an "investment" (upgrading) rather than a "tax" dramatically increases uptake. (https://www.gdcvault.com/play/1020085/Economic-Balancing-and-Improved-Monetization)

- **Ramin Shokrizade — F2P monetization and neuroeconomics**: Shokrizade's body of work (Game Developer articles; Substack) explains how premium currencies exploit psychological distance from real money, why soft/hard currency splits are asymmetrically powerful for monetization, and how the "coercive monetization" pattern (blocking progress with hard-currency gates) differs from cosmetic-only F2P. His concept of "game neuroeconomics" models player spending as driven more by loss aversion and social comparison than by perceived utility. (https://www.gamedeveloper.com/author/ramin-shokrizade; https://raminshokrizade.substack.com/)

- **Path of Exile multi-currency barter economy**: Path of Exile replaces a single soft currency with ~40 functional currency items (Orbs of Alteration, Chaos Orbs, Exalted Orbs, etc.), each of which modifies items in specific ways. This design makes every transaction a direct barter: the "exchange rate" between currencies floats based on supply and demand, published on community price-tracking sites. The result is a complex, player-regulated market with no centralized auction house (trades require direct player interaction for non-currency items). This design choice reduces AH-tax sink options but creates rich market emergent behavior and eliminates the inflation that a single currency accumulator would suffer. BoE items create a pre-use market; mirrored items (copies of exceptional gear) are provenance-tracked with a visible "Mirrored" tag. (https://pathofexile.fandom.com/wiki/Trading)

- **World of Warcraft / RuneScape Grand Exchange AH tax as a sink**: Both games' auction houses charge a percentage of sale price in soft currency (destroyed on collection), making all player trade a net sink. WoW's 5% AH cut was a deliberately designed ongoing drain; at peak population with millions of auctions per day, this drained enormous sums. RuneScape's Grand Exchange added automatic price stabilization (rolling median price bands) that resists extreme speculation.

- **OpenMU dupe exploit analysis (Sven, May 2018)**: Technical post-mortem of item duplication exploits in MU Online, with countermeasures: GUID-per-item-instance with database UNIQUE constraint; thread-safe login session manager (one account, one session); per-player state machine preventing concurrent conflicting actions; reproducible item IDs for crafted items (same inputs → same derived ID → DB constraint fires if dupe is attempted). (https://munique.net/item-duplication-exploits/)

- **PlayFab Economy v2 (Microsoft, 2023)**: Managed backend service providing: virtual currency wallets with server-enforced balance operations; item catalogs with server-canonical pricing; `PurchaseInventoryItems` API for atomic buy transactions; receipt validation against Apple/Google/Steam store servers; idempotency token support for retry safety. Recommended architecture: client → title cloud function (validates, applies rules) → PlayFab API (executes atomically). (https://learn.microsoft.com/en-us/gaming/playfab/economy-monetization/economy-v2/overview)

- **Academic research: Gini coefficient in virtual economies**: Studies of Minecraft and Second Life economies find Gini coefficients of 0.9+ — extreme wealth concentration. Research from PMC (PMC4143195, "Behavioral and Network Origins of Wealth Inequality: Insights from a Virtual World") finds power-law wealth tails emerge even in simple economies from network effects, not just from grinding advantage. Implication: designers must anticipate inequality accumulation and design sinks and redistribution mechanics accordingly. (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4143195/)

- **arXiv market intervention study (Hogan-Hennessy, 2022)**: Economic analysis of interventions in large-scale virtual economies (targeting EVE Online-scale systems). Confirms that supply restrictions (reducing faucet rates) are more effective than tax increases (sink additions) for controlling inflation when the player base is large and rational arbitrageurs quickly find gaps in tax-based sinks. (https://arxiv.org/pdf/2210.07970)

- **Machinations.io / Joris Dormans, Game Mechanics: Advanced Game Design (2012)**: Formal visual notation for resource flows, pools, converters, and feedback loops. Industry-standard pre-launch simulation tool. Allows running N=1000 simulated sessions to detect starvation (resources never reach sinks) or runaway accumulation (positive feedback loops compound). (https://machinations.io/homepage; https://www.gamedeveloper.com/design/the-designer-s-notebook-machinations-a-new-way-to-design-game-mechanics)

- **Richard Bartle, Designing Virtual Worlds (2003)**: The foundational text for virtual world economy design. Establishes "mudflation" as the canonical term and describes it at the macroeconomic level: player persistence + content power creep + lack of item destruction → complete devaluation of all non-current-tier items. Bartle's framework of four player types (achievers, explorers, socializers, killers) maps onto economic roles (hoarders, speculators, gifters, market manipulators). (https://mud.co.uk/richard/DesigningVirtualWorlds.pdf; https://www.goodreads.com/book/show/627902.Designing_Virtual_Worlds)

- **Gamesbrief "Looking at In-Game Currencies" (2014)**: Industry practitioner overview of the practical dual-currency setup and why mobile F2P games typically maintain 4+ currencies. Documents the "premium currency as abstraction layer" mechanic and the tension between player fairness and monetization pressure. (https://www.gamesbrief.com/2014/12/looking-at-in-game-currencies/)

- **Sonamine / Alterdata — data-driven game economy balancing**: Practitioner resources on economy KPI tracking, per-percentile wallet monitoring, and using daily telemetry to detect inflation before it becomes visible to players. (https://www.sonamine.com/blog/achieving-game-economy-balance-through-data-driven-insights; https://alterdata.com/blog/what-drives-monetization-in-mobile-games-a-data-driven-guide-to-optimizing-game-economy/)

---

## Design implications & transferable principles

**1. Every currency needs a designated purpose, pace, and player segment.**
Soft currency should feel earnable by any active player. Hard currency should feel aspirationally earnable (login bonuses, achievement unlocks) but meaningfully purchased. Secondary currencies should gate a specific system (guild content, seasonal battle pass) without leaking into the general economy. Define each currency's purpose before adding it; currencies added reactively tend to dilute the meaning of all existing ones.

**2. Design sinks before faucets.**
It is far easier to add faucets later (double-drop weekend, level-up bonus) than to add sinks (players resist new costs as "nerfs"). If the economy launches with too-weak sinks, inflation is nearly guaranteed and the retroactive introduction of new drains faces player backlash. Start conservative on faucet rates; add generosity over time rather than taking it away.

**3. A functioning auction house tax is often the most powerful sink in the game.**
At scale, the volume of player-to-player trades dwarfs NPC vendor sinks. A 3–5% AH cut destroys purchasing power continuously, invisibly, and automatically. The tax rate is a tunable lever: increase it to fight inflation; decrease it to stimulate trade during deflation. Never set it to 0 — that removes your best passive sink.

**4. Binding is the primary tool for preventing market trivialization of progression.**
BoP items preserve the achievement value of high-end content by ensuring the items cannot be purchased. BoE items preserve market economy while still limiting re-trade of used gear. Use BoP sparingly — too many BoP items kill the trading economy by removing supply. A 70/30 split (70% tradeable, 30% BoP for top-tier or story-critical items) is a common starting point.

**5. All item operations must be atomic at the database level.**
Every operation that moves an item — pickup, trade, stack split, crafting — must execute as a single database transaction under appropriate row-level locks. The item duplication exploit surface is precisely the set of operations not protected by atomicity. Assume adversarial players will probe every transition for timing windows.

**6. Implement dual-consent escrow from day one for any P2P trading feature.**
Retrofitting escrow onto a trade system that launched without it is extremely difficult. The state machine (propose → both_confirm → execute → complete/rollback) must be designed into the server data model before the first trade. Escrow is also the natural place to apply re-verification logic (check that offered items still exist and are unmodified at the point of atomic execution).

**7. Price re-verification on the server is non-negotiable for shop transactions.**
The client displays a price; the server must ignore that displayed price and look up the canonical price from its own catalog at execute time. This prevents the simplest economy exploit (sending a purchase packet with a forged price). In dynamic-pricing systems, include a price timestamp and reject purchases where the displayed price diverges from current by more than N% or is more than T seconds stale.

**8. Track per-percentile wallet balances, not just averages.**
Average currency holdings are meaningless in economies with a power-law tail (a few whales hold orders of magnitude more than median players). The p50 wallet tells you what the median player experiences; the p99 wallet tells you whether concentration is occurring. Track both, watch the ratio. A growing p99/p50 ratio over time is an early warning of market exclusion for new players.

**9. Use Machinations (or an equivalent flow model) before launch, not after.**
Simulate the economy at design time. The model doesn't need to be exact — it needs to reveal whether positive feedback loops exist, whether any currency path has no sink, and whether any player archetype (casual, hardcore, whale) faces starvation or runaway accumulation. A 1-week simulation effort before launch is worth months of live rebalancing.

**10. Expect wealth inequality to emerge; design redistribution deliberately.**
Even well-balanced economies trend toward Gini > 0.7 over time as early adopters and high-engagement players accumulate. Deliberate redistribution mechanisms include: seasonal resets of certain currencies, gift/tip systems, and time-gated rewards that are equal regardless of prior wealth. These do not need to be framed as punitive redistribution — seasonal rewards framed as "new player catch-up" are broadly accepted.

**11. For collectible/creature economies, treat creature acquisition as a hard-currency or binding event.**
In monster-taming and collection games (see [[monster-taming-mechanics]]), the creature itself is an economic unit. If creatures are freely tradeable and can be produced by soft-currency farming, the gacha/capture faucet rate directly inflates the supply of the most desirable creatures. Common solutions: legendary creatures are BoP; trades require hard currency as a fee (destroying purchasing power); or trading is limited to a "fresh caught" window before bonding occurs.

**12. Every economy-touching system is a security surface — enforce at the server.**
Item creation, currency grants, quantity modifications, trade execution, and shop purchases must all be server-authoritative and validated against the player's current actual state (not the client's claimed state). Client-reported inventory states are advisory at best; the server's database is the truth. See [[online-game-security-anticheat]] for the broader principle and for detection of economy-exploit behavior patterns via telemetry anomaly detection.

---

## Open questions to resolve per project

- What is the monetization model (premium one-time purchase, F2P with IAP, subscription)? This determines whether a hard currency even exists and how aggressively sinks should operate.
- How many distinct currencies are needed at launch, and what is the upgrade plan if the list grows? More currencies = more economic surface area to balance.
- Is player-to-player trading in scope? If yes, is it in-scope at launch or post-launch? The escrow state machine and anti-dupe infrastructure should be designed before launch even if the feature ships later.
- Which item categories are BoP, BoE, or fully tradeable? This is a player-experience decision (accessibility vs. achievement meaning) that must be made explicitly.
- What is the target sink rate per currency per day? Derive this from expected faucet rates and desired inflation target. Model it in Machinations before committing.
- What telemetry events are being emitted from every economy operation at launch? Retroactively adding telemetry to a live economy is hard; instrument every transaction (shop buy, trade complete, item drop, crafting result) from the beginning.
- Is there a player-facing auction house or marketplace? If so, what is the transaction tax rate, and is it a live-tunable parameter or hardcoded?
- What is the rollback/GM-reverse policy for economy exploits? Define the policy for item deletion after a dupe exploit before it happens — post-exploit policy design under player pressure leads to inconsistent enforcement.
- How is the Gini coefficient or equivalent inequality metric being tracked, and what threshold triggers a designer intervention?

---

## Sources

1. https://www.fastcompany.com/3024392/meet-the-alan-greenspan-of-virtual-currency-in-eve-online — "Meet The Alan Greenspan Of Virtual Currency In EVE Online", Fast Company, 2013
2. https://www.eveonline.com/news/view/global-plex-market-and-friction-free-trade — CCP Games, "Global PLEX Market and Friction-Free Trade", EVE Online, 2025
3. https://lostgarden.com/2021/12/12/value-chains/ — Daniel Cook, "Value Chains — A method for creating and balancing faucet-and-drain game economies", Lost Garden, December 2021
4. https://www.gdcvault.com/play/1020085/Economic-Balancing-and-Improved-Monetization — GDC Vault, "Economic Balancing and Improved Monetization Through Clever Sink Design", 2014
5. https://www.gamedeveloper.com/author/ramin-shokrizade — Ramin Shokrizade author page, Game Developer
6. https://raminshokrizade.substack.com/p/61-game-economics-defined — Ramin Shokrizade, "Game Economics Defined", Substack
7. https://pathofexile.fandom.com/wiki/Trading — Path of Exile Wiki, "Trading"
8. https://munique.net/item-duplication-exploits/ — Sven, "On item duplication exploits and how to prevent them", OpenMU Project Blog, May 2018
9. https://learn.microsoft.com/en-us/gaming/playfab/economy-monetization/economy-v2/overview — Microsoft Learn, "Economy v2 overview — PlayFab"
10. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4143195/ — Bainbridge et al., "Behavioral and Network Origins of Wealth Inequality: Insights from a Virtual World", PLOS ONE, 2014
11. https://arxiv.org/pdf/2210.07970 — Hogan-Hennessy, "Market Interventions in a Large-Scale Virtual Economy", arXiv, 2022
12. https://machinations.io/homepage — Machinations.io, visual game economy simulator
13. https://www.gamedeveloper.com/design/the-designer-s-notebook-machinations-a-new-way-to-design-game-mechanics — Ernest Adams, "The Designer's Notebook: Machinations, A New Way to Design Game Mechanics", Game Developer
14. https://www.gamesbrief.com/2014/12/looking-at-in-game-currencies/ — Gamesbrief, "Looking at In-Game Currencies", 2014
