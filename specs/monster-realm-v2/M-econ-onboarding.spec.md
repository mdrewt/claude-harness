# Spec: M-econ-onboarding — economy sources + new-player onboarding (SKETCH)

**Status:** sketch, 2026-10-24 (Playtest-3 feedback processing, episode pt3-2026-10). Elaborate with
`milestone-loop-prompt.md` when PLAN §9 reaches it, against the CURRENT game repo · **Project:**
monster-realm (game-core + server-module + content; client only via regenerated bindings and
quickfix-owned display) · **Risk class:** promoted HEAVY — economy balance (GDD §7's sinks ≥ faucets
model is the invariant; this milestone edits the faucets) · **Depends on:** `M-pt3-quickfix`
(reward-visibility UI: grant toast + wallet display — tune a VISIBLE economy, not an invisible one)
· **Blocked (partially):** decision batch `pt3-econ-world` (starter-kit contents, recruit yields,
heal-cost timing); slice eo-2 is unblocked and can land first.

**Feedback items:** pt3-2026-10-064, pt3-2026-10-157 · cross-link: pt3-2026-10-145 (the flat
in-battle item AP cost belongs to `M-battle-tactics`; the item PRICE balancing that rule leans on
lands here).
**Absorbs residuals:** R-weekly-review-2026-10-09-F1 (practice self-battles are an uncapped
currency/XP faucet), R-weekly-review-2026-10-23-F1 (join_game re-grants a starter whenever the
identity owns zero monsters — trade-away + rejoin mints starters and rerolls hidden IVs).

## Problem / intent — ground truth (fact-checked 2026-10-24 against code + the playtest-3 DB)

Evidence anchors are file + symbol as of 2026-10-24; symbols, not line numbers.

- `join_game` grants ONLY a level-5 starter monster (`server-module/src/movement.rs`, the
  `has_monsters` guard): no items, no wallet row (`player_wallet` is created lazily on first grant,
  `economy.rs`). The playtest identity's inventory table was EMPTY for the whole session.
- Faucets ARE wired: KO-win currency = `loser_BST / BATTLE_CURRENCY_BST_DIVISOR` (=10, ≈31g per
  typical wild win — `game-core/src/currency.rs::battle_currency_reward`, granted from
  `server-module/src/battle.rs::write_back_battle_results`); quest_001 pays 50g once
  (`game-core/content/quests/000-core.ron`); selling follows the 40%-of-buy convention
  (`ItemDef.sell_price`; `economy.rs::sell_items`) — unusable from a zero-item start.
- But the operator's dominant loop paid NOTHING: all four recorded battle endings were successful
  RECRUITS, and recruit success grants no XP (standing ruling), no currency (no `grant_currency` in
  `taming.rs`), no essence — only the monster. The wallet held exactly the 50g quest reward, which
  arrived with zero acknowledgment. The economy is experientially faucet-less even though faucets
  exist (feedback: "I have no method of earning more of the game's money", pt3-2026-10-157).
- The cheapest shop item is 150g ≈ 5 wild KO wins (`game-core/content/shops/000-core.ron`, whose
  own comments document the 40% sell convention and the "~5 wild wins" sizing).
- Two integrity defects sit on this same ground: `write_back_battle_results` grants currency/XP on
  every `SideAWins` including practice self-battles (`start_battle` allows opponent==self) — a
  scriptable zero-cost farm (R-weekly-review-2026-10-09-F1); and the starter grant is gated only on
  live monster ownership, so trade-away + rejoin mints starters (R-weekly-review-2026-10-23-F1).
- GDD §7 (`game-design.md`): faucets "modest and metered", "Design for sinks ≥ faucets (mild
  deflation)". Its sink list includes town healing cost (inert — healing is free, a documented
  pre-release convenience, `game-design.md` 2026-09 amendment note) and fusion as "a hard monster
  sink" — STALE: fusion was removed 2026-08-02 (essence redesign), so the economy silently lost its
  only monster sink.

Intent: give a new player a real start (pt3-2026-10-064: "Every new player should either start with
a few basic items, or enough starting money to buy some from the shop"), make the operator's core
loop pay something the operator actually decides on, and run one faucet/sink tuning pass under the
GDD model — closing the two faucet-integrity residuals in the same move. `M-pt3-quickfix` owns
making rewards VISIBLE (toast + wallet display); this milestone owns the BALANCE.

## Scope (sketch)

- **eo-1** starter kit at join — a real once-only game rule (ADR-0091 GrantItem pattern), contents
  pending `pt3-econ-world`; fixes the rejoin re-grant trap for the starter monster AND the kit.
- **eo-2** close the practice-battle faucet (R-weekly-review-2026-10-09-F1) — unblocked, land first.
- **eo-3** recruit yields — the recruit loop currently pays nothing; what (if anything) it should
  pay is an operator decision, pending `pt3-econ-world`.
- **eo-4** faucet/sink tuning pass — sizes starter kit vs shop prices vs KO/quest rewards vs sinks;
  includes the heal-location cost-timing decision and the item-price ↔ AP-cost coupling
  (pt3-2026-10-145). Runs LAST, on a visible economy.

## Non-goals

- Reward-visibility UI (grant toast, wallet display, quest-reward acknowledgment): `M-pt3-quickfix`.
- The AP system and in-battle item AP costs: `M-battle-tactics` (only the currency-price side of the
  operator's "balanced by the price of the item" rule lands here).
- Heal-point landmark art/signage and zone signposting: the world/art presentation milestone — this
  milestone touches only whether healing CHARGES.
- Trade-side floor guards (no-empty-side confirm, last-monster rule, in-party/≥1-HP preconditions):
  the trade-redesign milestone. eo-1 names the seam (Risks) but does not build it.
- A replacement monster sink for removed fusion: FLAGGED in Open decisions, not solved here.
- M20 economy metrics (currency supply / price drift dashboards): later; named only as the
  measuring instrument the tuning pass's worksheet anticipates.
- Dev reducers: never ship (standing ruling); every grant here is a real game rule.

## Constraints (house rules + standing rulings that bind the design)

- Rules once in game-core: deterministic, integer, seeded. Reward formulas stay BST-based integer
  division in `game-core/src/currency.rs` (the essence divisor is deliberately 3x steeper — keep
  that relationship intact when tuning).
- Grants ride the existing primitives: `apply_grant` on the private `player_wallet` (ADR-0081;
  owner-scoped `my_wallet` view per ADR-0154) and the single item-insert path every grant funnels
  through (buy / trade confirm / dialogue GrantItem). MAX_BALANCE / MAX_ITEM_STACK headroom and
  reject-don't-clamp stand.
- Once-only grants follow the ADR-0091 GrantItem pattern: a PERSISTENT claimed marker
  (NotFlag+SetFlag-style), enforced server-side — never inferred from live ownership (that
  inference IS the R-weekly-review-2026-10-23-F1 trap).
- Content is data: kit contents, prices, quest rewards, heal cost live in RON under
  `game-core/content/` with a CONTENT_VERSION bump; tuning is a data change, not a code change.
- SpacetimeDB schema changes additive-only; tables private + owner-scoped views.
- Client bindings generated-only; any new player-facing strings go through the typed i18n catalog
  (en + fr) — though the display surface itself is `M-pt3-quickfix`'s.
- "No recruit XP" is a standing ruling (DECISIONS.md recruit mechanics; reaffirmed by the operator's
  own 2026-10 AP-recruit rule). eo-3 may not quietly amend it — any XP-on-recruit option must be
  named as an amendment in the decision issue.

## Slices (sketch; `touches:` provisional, finalized at elaboration)

### eo-1 — starter kit at join: once-only grant, rejoin mint closed
category: economy/onboarding · severity: MED · size: MODERATE
touches (provisional): game-core (starter-kit rule + content), server-module/src/movement.rs
(join_game), server-module/src/schema.rs (additive claimed marker), game-core/content/
blocked: pt3-econ-world (kit contents: items, money, or both; amounts; soulbound or tradeable)

Design that is FIXED regardless of the pending decision:

- **EO1.1:** WHEN an identity completes its first join, THE SERVER SHALL grant the starter monster
  and the starter kit exactly once, recording a persistent per-identity claimed marker (additive
  schema) that does not depend on what the identity currently owns.
- **EO1.2:** WHEN an identity that has already claimed rejoins owning zero monsters (or zero items,
  or an empty wallet), THE SERVER SHALL NOT grant again — closes R-weekly-review-2026-10-23-F1 for
  the starter monster and prevents the kit from inheriting the same trap.
- **EO1.3:** THE kit's contents SHALL be content RON under `game-core/content/` carried by
  CONTENT_VERSION, granted through `apply_grant` / the single item-insert path, so the operator can
  retune contents as data.

Risk note (hidden-dependency seam, named so neither milestone assumes the other shipped it): the
rejoin re-grant is today's ACCIDENTAL recovery path for a monster-less identity. Closing it makes
"zero monsters" permanent unless a floor guard exists. The trade-redesign milestone owns the
operator's own floor rules (no-empty-side confirm; monsters must be in-party/≥1 HP); elaboration
must check whether any OTHER path to zero monsters exists (release/storage edge cases) and, if so,
either guard it in eo-1 or raise it. The GDD's "consider soulbinding the starter" lever is decision
material for `pt3-econ-world`, not assumed.

### eo-2 — close the practice-battle faucet (unblocked; land ahead of the tuning pass)
category: economy-integrity · severity: MED (scriptable exploit) · size: SMALL
touches (provisional): game-core (battle-reward gating rule + tests), server-module/src/battle.rs
(write_back_battle_results), server-module tests

- **EO2.1:** WHEN a battle's two sides belong to the same identity (a practice/self battle), THE
  SERVER SHALL grant no currency and no XP from its outcome (essence/trust/QT are already
  wild-gated — this extends the same gate to the currency/XP arm). Closes
  R-weekly-review-2026-10-09-F1.
- **EO2.2:** WHEN a wild or PvP battle ends in a KO win, THE SERVER SHALL grant exactly what it
  grants today (regression fixture: the wild-win faucet unchanged, the self-battle fixture asserts
  zero grants).

The residual's own note says "must close when faucets get tuned"; it is an exploit today, so it
lands FIRST and the tuning pass assumes it closed.

### eo-3 — recruit yields (blocked: pt3-econ-world)
category: economy/gameplay · severity: MED · size: SMALL-MODERATE once decided
touches (provisional): game-core (yield rule), server-module/src/taming.rs, content if data-driven

Today a successful recruit yields the monster and nothing else. Options to put to the operator —
NOT decided here: (a) currency on recruit (a game-core BST-based integer formula, sized against the
KO reward); (b) essence at the steeper essence divisor; (c) party XP — this amends the standing
no-recruit-XP ruling and must be named as such; (d) nothing — the monster IS the reward, and the
tuning pass compensates elsewhere. Whatever is chosen rides the deterministic game-core formula
shape and the existing grant primitives, and `M-battle-tactics`' AP-recruit rule (full turn of AP,
bait helps, adjacency) is unaffected.

### eo-4 — faucet/sink tuning pass (last; after eo-1..3 decisions and M-pt3-quickfix visibility)
category: economy-balance · severity: HIGH leverage, LOW code risk · size: MODERATE (mostly data)
touches (provisional): game-core/content/ (shops, items, quests, heal_locations, starter kit),
game-core/src/currency.rs consts, docs
after: [eo-1, eo-2, eo-3]

- One pass under the GDD sinks ≥ faucets model. Dials: `BATTLE_CURRENCY_BST_DIVISOR`, shop buy
  prices + the 40% sell convention, quest rewards, kit size, heal cost. Deliverable: a short tuning
  worksheet (gold-per-session per loop — KO grind, recruit loop post-eo-3, quest line — vs the
  cheapest/median sink) checked in next to the content change; tuned values land as content/const
  changes with a CONTENT_VERSION bump; NO new mechanics.
- Heal-location cost timing — pending `pt3-econ-world`: charge now (the GDD names town healing a
  sink; the implementation plan's S-heal-locations already queued `cost_currency` + a zone-1 heal
  point) vs keep the documented free pre-release convenience. The RON already carries
  `cost_item_id`/`cost_qty` fields, so "charge" is a content + `heal_party` change, not a redesign.
- Item price ↔ AP coupling (pt3-2026-10-145): the operator ruled the flat in-battle item AP cost is
  "balanced by the price of the item (in the game's currency) and by using up the item permanently".
  `M-battle-tactics` owns the AP side; THIS pass owns pricing items so that rule holds. If
  `M-battle-tactics` has not pinned AP costs when eo-4 runs, eo-4 prices provisionally and names
  the re-check in the battle milestone rather than blocking on it.
- Visibility precondition: the quest reward arriving invisibly is WHY the operator believed no
  faucet existed — do not tune against an economy the player cannot see; `M-pt3-quickfix`'s wallet
  display + grant toast land first.

## Open decisions (pending pt3-econ-world)

1. Starter-kit contents: items, money, or both; amounts; soulbound (GDD anti-farm lever) or
   tradeable.
2. Recruit yields: options (a)–(d) in eo-3; option (c) is explicitly an amendment to the standing
   no-recruit-XP ruling.
3. Heal-location cost timing: start charging (GDD sink) vs keep the free pre-release convenience.

Flagged, not solved — the lost fusion monster sink: GDD §7 still lists fusion as the economy's hard
monster sink, but fusion was removed 2026-08-02. The economy currently has NO monster sink
(recruiting is pure supply). A replacement sink (or the decision to accept monster inflation until
M20 metrics exist) belongs in the decision batch but is NOT owned by this milestone; eo-4's
worksheet records the gap so the tuning numbers are read with it in mind.

## Sequencing / integration notes

- eo-2 is independent and unblocked — it can merge before the decision batch returns. eo-1 and eo-3
  build once `pt3-econ-world` answers; eo-4 runs last, `after:` all three and after
  `M-pt3-quickfix`'s visibility slices.
- Fan-out shape (per the M18 fan-out note): a game-core rule slice gates its server-module reducer
  slice; content data is parallel; the client is untouched except regenerated bindings and whatever
  display `M-pt3-quickfix` already owns. Post-integration: full `just ci` green, bindings-drift 0,
  schema snapshot additive, and one end-to-end check that a FRESH identity joins, receives exactly
  one kit, earns from its first battle outcome per the decided rules, and can afford the intended
  first purchase.
- Evidence anchors in this spec are file + symbol at 2026-10-24 (m25-s0 doctrine: symbols, not
  line numbers; de-quantified where rot is likely).
