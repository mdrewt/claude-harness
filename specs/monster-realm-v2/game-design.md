# Game Design Document — Monster Realm (v2)

**Date:** 2026-06-24 · **Status:** the SSOT for *design intent* — what the game **is** and why it should be
**good**, complementing the 26 engineering specs (M0–M25) which secure how it **works**. Non-commercial,
open-source (per the harness). This doc is opinionated on purpose: it makes starting calls (clearly marked as
tunable) so the engineering has a real target instead of "TBD". It is the layer the corpus was missing.

> **Why this exists.** The spec corpus is excellent engineering, but a perfectly-engineered game with thin or
> unbalanced content is not "better than v1 in every way." The biggest *unvalidated* risk is not technical —
> it's whether the game is fun. This doc states the design, the content scope, the economy/balance model, the
> MVP, and — crucially — **how we'll find out if it's fun before building all 26 milestones.**

## 1. Vision & pillars

**Vision:** *A trustworthy, social world where you find, raise, and bond with monsters that are genuinely
yours — and that knowledge, care, and fair competition matter more than reflexes or wallet.*

**Pillars** (each maps to specced systems; if a feature doesn't serve a pillar, cut it):
1. **Every monster is a unique individual.** Hidden IVs, trained EVs, a Nature, and bond mean *your* Sparkbit
   is genuinely different from anyone else's — and gets more so as you raise it. *(M6/M9/M10, ADR-0016.)*
2. **A fair, authoritative world.** The server is the only truth; you can't be cheated, and your investment
   (a perfect-IV monster, a hard-won rating) is safe. Trust is what makes individuals *valuable*.
   *(server-authority spine; M15/M16 economy & PvP integrity; M25 security.)*
3. **Knowledge & mastery, not twitch.** Turn-based battles are a legible affinity puzzle; how you *raise* a
   monster shapes its destiny. Skill = understanding, not APM. *(M7/M14 battles; M9 raising.)*
4. **A living social fabric.** Trading, PvP, raids, and guilds make unique individuals matter to *other*
   players — the long-term engine. *(M15–M19.)*

**What it is NOT** (scope guardrails): not an action/twitch game; not idle/afk-farmable; not pay-to-win
(non-commercial); not a single-player-only game (the social layer is the point).

## 2. Player & fantasy

**Target:** players who love collection + mastery + light competition (the tamer/RPG audience), comfortable
with turn-based depth; play in short, meaningful sessions across web/desktop.
**Core fantasy:** *"This team is mine — I found these individuals, I raised them my way, and I can prove it by
battling, trading, and climbing with them."*

## 3. Core loops

- **Moment-to-moment (seconds):** explore a zone → step into grass → a wild encounter → battle (the affinity
  puzzle) → weaken-to-recruit *or* win for XP. *Hook: "what's in this grass, and is it a good individual?"*
- **Session (10–30 min):** clear a bit of the world / a quest, train + care for your team (deliberate
  choices), maybe one PvP match or a raid, check trades. *Hook: visible growth + a social beat each session.*
- **Long-term (weeks+):** complete the roster; *perfect* individuals (chase IVs/Natures, optimize EVs);
  evolve/fuse for power; climb the ranked ladder; build a guild; participate in the economy. *Hook: mastery,
  status, collection, belonging.*

## 4. The fun hypothesis & how we validate it (the key gap)

We are betting on three **explicit, falsifiable** fun hypotheses. The whole point of the MVP is to test them
*before* building Phases B–D:
- **H1 — Weaken-to-recruit is a satisfying puzzle**, not a slot machine (the HP-is-the-lever formula, M8).
- **H2 — Visible divergence creates attachment**: two players' same-species monsters becoming measurably
  different (IV/EV/nature/bond, surfaced in the box) makes players *care* about their individuals.
- **H3 — Server-authoritative fairness makes individuals feel valuable** enough to drive trading + ranked.

**Validation plan (closes "M5 proves sync, not fun"):**
- Ship the **MVP slice** (§9) and run a **closed playtest** at the end of Phase A.
- Measure proxies: do players voluntarily **re-roll / re-catch for better individuals** (H2)? Do they choose
  to **weaken before recruiting** (H1)? Do they **return across sessions**? Does PvP **feel fair** (survey +
  the divergence/reconcile metrics, M20)? Qualitative: "what's the most fun thing you did?"
- **Gate:** if the core loop isn't fun in the MVP, **revise the design before building Phases B–D.** The
  engineering corpus past Phase A is explicitly **provisional** until this gate passes.

## 5. Content plan (scope + design principles)

Content is data (RON), so these are **starting scopes**, tunable. The discipline: each piece has a clear
identity/role; the systems are generic, the content is specific.

- **Species roster (starting scope ~32 forms total ≈ 14–18 base species + their evolutions/fusions).** A
  deliberately lean set — enough for team-building variety + a completable collection, small enough to
  actually balance and to author/test quickly. Each species has a clear archetype (tanky, fast sweeper,
  status, support) and an affinity identity. Starters are base forms only (M6/M10 integrity). Grow the roster
  *after* the loop is proven fun.
- **Affinity (type) chart — ~8 affinities** in a rock-paper-scissors-plus web (data-driven, M7). Goal: enough
  depth that *knowledge* wins (you learn matchups) without a memorization wall. Effectiveness is the
  **primary balance lever**.
- **Skills (~24 at launch).** Power × affinity × category (physical/special) × optional effect (status/
  weather, M14). A tight set keeps learnsets meaningful and the meta legible/balanceable; expand with content.
- **World (starting scope: a hub town + 2 authored zones, ~1–2 biomes).** Built via the M11 Tiled→RON
  pipeline; warps/towns; per-zone encounter tables. A short, clear critical path + a little optional
  exploration — enough to test the loop, not a sprawling world to author up front.
- **NPCs / quests / story (very light).** A minimal frame — "become a tamer, take your first steps into the
  world" — with a handful of system-teaching quests (fetch/talk/defeat, M12 flag-based) on the critical path.
  Story is intentionally **thin at launch** (the systems + individuality + social are the draw); narrative is
  an expandable content layer, not a launch dependency.
- **Items.** Bait (recruit), training food (EVs), healing (town/cost), evolution items, currency — all
  templates (M6/M9/M13), data-tunable.

## 6. Progression & balance philosophy

- **Spine:** catch → raise (EV-train + bond) → evolve/fuse → battle/PvP → repeat at higher mastery.
- **Individuality depth (IV/EV/nature):** IVs are the *discovery/collection* lever (chase good individuals);
  EVs are the *active-investment* lever (252/510 caps force build choices); Nature is a build modifier; bond
  is the *care* lever (and gates some evolutions). Surface this clearly in the box so divergence is **felt**
  (H2). Keep "perfecting" an endgame, not a launch requirement.
- **Curves:** `level³` XP (M6); a difficulty curve that teaches affinities before testing them; recruit rates
  tuned so **weakening is the lever** (M8), never pure luck.
- **Battle balance:** the 1v1-active readable core (M7) first; M14 depth (status/abilities/weather) added
  *only after the base is fun*. Balance is **data-driven + iterative + playtested**, with the affinity chart
  as the main dial and integer math keeping it deterministic. Expect balance to be a **continuous live-ops
  discipline**, not a one-time pass — budget for it.
- **The active-only tension (a real call):** v1 chose no idle growth (anti-afk, ADR/M9). **Recommendation:
  keep active-only as a pillar, but design sessions to be short and rewarding** (every session shows visible
  growth) and add *respectful* low-friction affordances (e.g. a daily structure, town auto-heal at a small
  cost) so "active" doesn't read as "grindy." Re-evaluate at the playtest — if testers find it a slog, a light
  bounded passive lever (e.g. limited offline rest) is the additive escape hatch, not idle farming.

## 7. Economy design (the missing model)

A trading MMO economy needs an explicit faucet/sink model or it inflates. Non-commercial (no first-party
monetization), but a player economy still needs balancing.
- **Faucets (in):** battle/quest currency rewards, selling items/monsters, encounter drops. Keep faucets
  **modest and metered**.
- **Sinks (out):** shop purchases, **town healing cost**, **fusion (consumes two monsters — a hard monster
  sink)**, evolution items, and (later) cosmetic/QoL sinks. Design for sinks ≥ faucets (mild deflation) so
  currency keeps meaning.
- **Trading's role:** the value of *rare individuals* (good-IV/Nature) drives player-to-player trade; scarcity
  comes from the IV/EV/nature roll, not artificial caps. Escrow (M15) prevents dupes; the rarity is real.
- **Anti-inflation & integrity levers:** metered faucets; fusion/healing as monster/currency sinks;
  **consider soulbinding** the starter and certain rewards (untradeable) to prevent farm-and-dump; monitor
  with the M20 economy metrics (currency supply, trade volume, price drift) and treat balance as **live-ops**.
- **Anti-bot / RMT (honest):** active-only growth + rate limits + server authority raise the bar, but bots/RMT
  are a **perennial live threat**, not a solved problem — plan for ongoing detection/moderation (M19/M25), and
  note that non-commercial status *reduces* (not eliminates) RMT incentive. Don't pretend it's "done."
- **Recommendation:** a **single currency, sink-heavy, metered-faucet** economy; soulbind a few entry items;
  monitor and tune live.

## 8. Social & retention design

Individuals are valuable *because* they're unique (collection), provable (PvP/ladder), and tradeable
(economy) — the three reinforce each other and are the long-term retention engine. Friendly vs ranked PvP
serves both casual and competitive players; guilds provide identity/belonging + organize raids (M16–M19).
Retention beats per loop: visible growth (session), mastery/status (ladder), collection (long-term),
belonging (guild).

## 9. The MVP / early-access slice (the missing prioritization)

**Don't build all 26 milestones before validating fun.** Two checkpoints:

- **MVP (the fun test) = M0–M8 + a thin content set.** Move → grass → battle → **weaken-to-recruit** → a small
  box, in the single hand-authored zone, single-player + the two-window proof. The smallest slice that tests
  **H1 + H2** (catch + individuality). Cut: raising/evolution/fusion can wait one beat if needed, but
  including **M9 (raise) + M10 (evolve/fuse)** makes it the full **single-player loop** and tests H2 properly —
  so the **target MVP is M0–M10 (Phase A) + a subset of the starting content: ~16 forms + ~6 affinities +
  ~12 skills + the hub + 1 zone** (about half the §5 scope — the minimum to test the full single-player loop).
- **Early access = + multiplayer core (M15 trade + M16 PvP)** once the loop is proven fun, on a small live
  world, to test **H3** (do individuals feel valuable enough to trade/compete?). The big world (M11–M14) and
  the social depth (M17–M19) follow demand.
- **Launch = + Phase D readiness (M20–M25)**, gated on the M25 security sign-off.

This gives a **playable, testable game at the end of Phase A** — the natural decision point — instead of a
multi-year march to a launch that's never been played.

## 10. Open design questions (honest — resolve via playtest, not on paper)

- **Is the core loop actually fun?** (H1–H3 — the MVP exists to answer this.)
- **Is active-only too grindy** for the target session length? (the §6 escape hatch is the fallback)
- **Economy balance** — faucet/sink numbers, soulbinding scope, inflation in practice (live-ops).
- **PvP balance** — the affinity chart + IV/EV/nature meta (continuous).
- **Content volume** for a satisfying launch (is the lean ~32-form / 2-zone starting scope enough to be
  compelling, or does it need to grow before launch? how much world/story is "enough"?).
- **Battle depth timing** — does the 1v1 core need M14 depth to be fun, or is it fun first?
- **How social-required is it?** (a great single-player loop lowers the multiplayer-criticality and de-risks
  early access.)

## 11. How this doc relates to the corpus

The engineering specs (M0–M25) are the *systems*; this is the *game* those systems serve. Where they meet:
the content here is the **data** the data-driven systems consume (ADR-0006/0016/0021/0022); the balance is the
**tuning** the systems expose; the MVP is a **re-prioritization** of the build order (the loop prompt builds
in milestone order, but this doc says: **stop at Phase A, playtest, then decide**). If the playtest reshapes
the design, the provisional Phase B–D specs change — and that's expected, not a failure.

## 12. Inspirations & influences

We draw **selectively** from the genre's best — taking what serves the pillars (§1), not whole designs.

### Gameplay (what each contributes → the specced system it informs)
- **Pokémon** — the core loop: catch / train / type-chart battles / evolution, and the IV/EV/nature
  individuality model. → M6–M8, M10, M16.
- **Monster Rancher** — deep, deliberate **raising** of a monster as a cared-for individual (regimens, the
  bond between owner and creature). → M9 (training/care/bond).
- **Digimon** — **care- and condition-dependent branching evolution** (how you raise it changes what it
  becomes). → M10 (bond-gated branch evolution).
- **Shin Megami Tensei / Devil Summoner** — **recruit-by-negotiation/weakening** and **fusion** (combine
  monsters into something new), plus affinity/weakness depth. → M8 (recruit-by-weaken), M10 (fusion), M7/M14.
- **Palworld** — the open *collect-and-use* creature feel and monsters as companions. *(We take the feel,
  not the real-time combat / base-building / survival — see below.)*
- **Dragon Quest Monsters** — **synthesis/breeding with inheritance** (offspring inherits the best of its
  parents). → M10 (fusion-with-inheritance: per-stat max IV + higher-bond nature).
- **Monster Sanctuary** — **team-based battles where every monster has a role**, and exploration/collection.
  *(We take the team-building/roles, not the metroidvania platforming.)* → M7 (team building).
- **Cassette Beasts** — **fusing two monsters into one** + a fresh, legible affinity chart. → M10, M7.
- **Monster Crown** — **taming + breeding/inheritance** with a distinct, slightly darker flavor. → M9/M10.
- **Temtem** — the **online MMO structure**: a shared world, co-op, **trading**, and **ranked PvP**, plus an
  SV/TV (IV/EV-like) + trait system. → M15–M19 (multiplayer), M6 (IV/EV).

### Selective adoption (what we deliberately do **not** take)
Turn-based, **not** real-time/action combat (ADR-0017); **no** base-building/survival/automation (vs
Palworld); **no** platforming (vs Monster Sanctuary); a **server-authoritative** MMO, not P2P. The pillars
(§1) are the filter — an inspiration's mechanic is adopted only if it serves them.

## 13. Art direction

**Direction:** high-quality, **bright and colorful**, detailed **2D pixel art** in the GBA/SNES/DS lineage —
appealing, warm, and readable — **shipping flat now, with a planned upgrade path to an HD-2D (lit pixel-art)
look** à la *Octopath Traveler*. Consistent with the PixiJS 2D renderer (ADR-0004), the tile-based overworld
(M1/M11), and sprite-pooled rendering (M4).

- **References & what each lends:** *Pokémon Ruby/Sapphire* (the top-down tile overworld + creature-sprite
  baseline) · *Zelda: The Minish Cap* (lush, charming, bright GBA detail) · *Final Fantasy V* (classic
  vibrant JRPG sprites) · *Metroid Fusion* (polished, readable spritework + lighting) · *Mother 3* (warm,
  expressive, characterful) · *Sword of Mana* (rich, colorful, detailed GBA RPG art) · *Digimon World DS*
  (monster designs + DS-era sprites) · **_Octopath Traveler_** (the **HD-2D** target — detailed pixel-art
  sprites lifted by modern dynamic lighting, bloom, depth-of-field, and parallax; the look we build *toward*).
- **Look & feel:** a vibrant, inviting palette (saturated but not garish); expressive, characterful monster
  designs with clear silhouettes and affinity-readable color identities; a top-down tile overworld + clean
  sprite-based battle scenes; smooth, polished animation (the M4 slide/interpolation already serves this).
- **Readability:** affinity/status conveyed by **shape + icon + color**, never color alone (the M23 a11y rule
  and the bright-palette goal reinforce each other).
- **HD-2D readiness (ADR-0004):** ship **detailed pixel art rendered flat** for the MVP/early-access (cheaper,
  faster, validates *fun* first), but keep HD-2D an **additive, `render/`-only upgrade** (no game-core/server/
  netcode impact). Three cheap, low-regret hedges are adopted now (M4): **(1)** assets authored
  **neutrally-lit** (no baked shadows → normal-map-ready); **(2)** an **extensible renderer material model**
  (albedo now; normal/material channels + a lighting/post pass later); **(3)** **pixels-per-tile as one
  `TILE_PX` constant** decoupled from the resolution-agnostic logical grid. The HD-2D upgrade's dominant cost
  is **art** (≈1.5–2× per-asset for normal maps), bounded by the lean §5 scope and eased by auto-normal-map
  tools; the engineering is a contained PixiJS lighting + post-processing pass.
- **Resolution roadmap:** **32×32 px tiles for the MVP** → upgrade to **48×48 or 64×64 later** when art
  resources allow. Engineering = a one-constant (`TILE_PX`) change; art = a redraw at higher res (pixel art
  doesn't upscale losslessly), so **pair the resolution bump with the HD-2D pass as one art investment**.
  The MVP's neutrally-lit assets make that later high-res redraw HD-2D-ready in a single step.
- **Pipeline:** placeholder sprites at M4 → real art via spritesheets/atlases (the M11 Tiled pipeline +
  PixiJS assets); consistent tile/sprite resolution + a palette. **A detailed style guide (palettes, sprite
  dimensions, animation specs, a few mockups) is a near-term art-production deliverable**, and an
  **HD-2D lighting prototype** is the natural spike to confirm the look + cost before committing.

