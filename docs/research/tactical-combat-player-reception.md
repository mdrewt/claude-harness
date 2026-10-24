---
title: Tactical combat player reception — what players loved and disliked in six tactics/monster-army games, and AP vs move+act sentiment
slug: tactical-combat-player-reception
domain: gameplay
tags: [player-reception, tactical-rpg, action-points, move-and-act, pacing, grind, difficulty-ai, monster-recruiting, monetization, onboarding]
status: active
updated: 2026-10-24
confidence: medium
sources: 126
supersedes:
abstract: "Reception of six tactics games + AP vs move+act sentiment: ranked lessons, loved/disliked per game."
---
## Scope
A **project-agnostic** synthesis of *how players and critics received* six tactics / monster-army games,
plus a cross-cutting look at how players feel about **action-point (AP) pools versus simpler move + one
action** turns. It complements [[tactical-rpg-combat-design]] (which documents *mechanics*) by documenting
*reception*: what worked, what players resented, and how loudly. Related: [[monster-taming-mechanics]],
[[reference-games-pixel-mmo-tamers]], [[virtual-economy-design]], [[matchmaking-and-rating-systems]],
[[retro-rpg-menu-ui-design]].

**Provenance (why this exists).** Commissioned 2026-10-24 by the operator of a downstream small-squad
monster-collection tactics project (decision issue #584 in that project's tracker): "research what people
thought about all of them [the six inspiration games]. Find out what worked well and what people didn't
like"; and (decision D1) "research on what people like and dislike about AP battle systems and compare it
to what people like and dislike about simpler battle systems like FFTA."

**Games covered (the six):** Final Fantasy Tactics Advance (FFTA, 2003), TRIANGLE STRATEGY (TS, 2022),
Sword of Convallaria (SoC, 2024, free-to-play), Pokémon Conquest (CQ, 2012), Shin Megami Tensei: Devil
Survivor (DS, 2009; DS2 2012; Record Breaker 2015) and Brigandine (BRG; 1998 original, Legend of Runersia
2020). The seventh report (**AP**) covers Divinity: Original Sin 2 (DOS2), Baldur's Gate 3 (BG3), old
Fallout, Dofus/Wakfu, XCOM, Into the Breach (ITB), Mario + Rabbids (Kingdom Battle 2017, Sparks of Hope
2022) and Fire Emblem: Three Houses.

**Method and attribution.** Seven structured reception reports were compiled on 2026-10-24 from web
searches and page fetches (professional reviews, Steam community threads, fan forums, retrospectives,
aggregate pages). This document synthesizes them. Every claim carries a report tag — **[FFTA] [TS] [SoC]
[CQ] [DS] [BRG] [AP]** — and usually the outlet and year the report cited. No reception claim here is
absent from its report; inferences by the persisting author are labelled *(synthesis)*. I did not
independently re-verify the reports' quotes or figures.

**Evidence quality (read before leaning on a number).**
- Mix is reviews + Steam threads + forums; single forum or Steam posts are anecdotes, not aggregates.
- [FFTA] Reddit threads did not surface in standard or extended search; community sentiment there comes
  from forum and user-review sources (DVD Talk, AnandTech, Giant Bomb, GameSpot users).
- [CQ] GameSpot's review was reached only via search summary (direct fetch returned 403).
- [DS] The "RNG cancels my Extra Turns" complaint rests mainly on one r/Megaten thread (via a mirror) and
  one GameSpot user review; treat as a vivid but narrow signal.
- [AP] English-language Dofus/Wakfu player sentiment about turn *timers* was thin; the timer mechanics are
  well documented but like/dislike evidence for them is inferred from adjacent titles (Atlantica, Chains of
  Freedom) and Steam comparison threads. Board-game design literature is design theory, not game reception.
- Steam percentages and review counts are snapshots (SoC retrieved 2026-10; TS snapshot dated 2026-06).
- Several games are premium single purchases (FFTA, TS, CQ, DS, BRG), so their monetization evidence is
  thin to absent; only SoC is free-to-play with an energy system.

**Assumptions about the reader (state them; I cannot see the reader's stack).** A creature-roster
tactics game with small squads, a persistent-monster online setting, recruiting by weakening wild monsters,
and a deliberately gentle ("cozy") positioning. Section "Design implications" additionally takes the
commissioning project's **fixed rulings** as given: tuned AP where a typical turn = move + one attack;
round-based speed order; a per-monster action queue with an idle-only clock; a 30 s per-unit cap in PvP;
recruit odds shown to the player; 1-3 units per side.

## Key findings
**Executive summary — cross-game lessons ranked by how strongly the evidence repeats.**
Ranking method (author's count, not stated by the reports): number of the six games whose report carries
a claim bearing on the lesson; ties broken by how often the issue was the dominant complaint or praise for
a game. **[AP]** is the cross-cutting seventh report and is shown separately.

**Tier 1 — evidence repeats in 5-6 of the six games**

| # | Lesson | Games |
|---|---|---|
| 1 | **Pace decides retention.** Short, self-contained battles are praised (FFTA vs FFT; DS "quick battles"; CQ ~20-turn cap; BRG 12-turn cap). Long battles, dead approach turns, stacked mandatory fights, replaying long losses and downtime between fights are the top complaint in TS (30-50+ min between fights; hour-plus late battles) and BRG ("the biggest problem"), and a major one in DS (8+ attempts; 30 min to hours with retries). | All 6; [AP]: DOS2 "too slow", Fallout trash-mob animations, BG3 co-op waiting, FFTA "painfully sluggish" |
| 2 | **Grind, repetition and time-gating sour goodwill even without monetization.** FFTA ~100 h and rare-item learn gates; TS under-levelling into a mock-battle loop; SoC re-running identical fights and ~100 days to max a unit F2P; CQ link/evolution crawl and repetitive post-game; DS "bitterly necessary" Free Battles; BRG same maps and enemy comps "blend together". | All 6 |
| 3 | **Difficulty and AI are usually miscalibrated:** too easy with exploitable AI (FFTA, CQ, BRG), spiky with mid-battle rug-pulls (DS), or inflated by stats (TS Hard; SoC power creep, weak auto-battle). Praised fixes: difficulty through encounter design, and player-selectable difficulty/assist modes (DS Blessed mode 79 to 84 Metacritic). | All 6 |
| 4 | **UI/menu friction and onboarding gaps are named even in well-scored games** (FFTA cluttered menus despite ~87 Metacritic; TS "irritating" UI; SoC forced standby clicks; DS menu-map travel; BRG several menu visits per resupply). Praised mitigations: diegetic low-stakes tutorials and dismissible guidance. | All 6 |
| 5 | **Information readable before commit wins; hidden or asymmetric rules lose.** TS follow-up odds preview; SoC deterministic turn order; vs DS opaque RNG cancelling earned Extra Turns and mid-battle objective changes, FFTA random laws, CQ Perfect-Link obscurity. | TS, SoC, DS, FFTA, CQ; [AP]: ITB telegraphs, Rabbids 0/50/100 chances, BG3 bonus-action opacity |
| 6 | **Soft failure and undo valves are cheap goodwill; penalties that follow the player out of the battle are resented.** FFTA no-death judge praised vs jail resented (removed in FFTA2); SoC 3 rewinds; DS easier mode; BRG permadeath "extremely punishing"; TS retry and change-difficulty-any-time. | FFTA, TS, SoC, DS, BRG; [AP]: move-undo, Divine Pulse |
| 7 | **Distinct per-unit identity from a small verb set is what players remember** (TS fixed kits; CQ one move per species; SoC niche low-rarity units; BRG terrain-specialised monsters; DS leader + 2 demons; FFTA build breadth) — but too few verbs read as shallow (CQ #1 launch criticism) and too little progression choice reads thin (TS). | All 6; [AP]: uniform AP costs flatten identity |
| 8 | **Variety comes from maps, objectives and encounter gimmicks, not unit complexity or type charts.** TS Chapter 7 fire-trap map; CQ's 17 themed kingdoms; SoC terrain/boss stages; BRG terrain specialists vs repeating maps; CQ type-chart counterpicking trivialised fights. | TS, CQ, SoC, BRG; [AP]: ITB needs content variety |

**Tier 2 — evidence repeats in 3-4 games**

| # | Lesson | Games |
|---|---|---|
| 9 | **Leader-plus-squad / break-the-leader structures are liked** and compress SRPG scale (DS human + 2 demons, kill-the-leader tradeoff; BRG commander rout; CQ warrior + Pokémon with a once-per-battle warrior power). | DS, BRG, CQ |
| 10 | **Acquisition is loved as a tactical commitment with close margins, resented as grind-funded or obscure.** CQ recruit-within-~4-turns "adds tension" vs Perfect-Link obscurity; DS Skill Crack and close-margin auction vs "to auction you need money... you need to grind"; BRG territory decides which monsters you can summon. | CQ, DS, BRG |
| 11 | **Economy is graded separately from combat but writes the review score.** SoC tactics "expertly designed" yet ~55% positive at launch over currencies/stamina; TS zero-MTX counted in its favour; DS selling grind-relief DLC for a grind-criticised game; CQ time gates read like energy systems; Wakfu pay-adjacent PvP complaints. | SoC (dominant), DS, CQ, TS; [AP] |
| 12 | **Use the whole roster, everywhere, and give benched units jobs.** FFTA dispatch missions praised; SoC's best-loved mode barred the main roster (a top frustration); CQ roster carryover loved. | FFTA, SoC, CQ |
| 13 | **A strong core loop outlives launch friction.** SoC ~55% to ~75% positive in two years; CQ "flew under the radar" then best-spinoff status; DS "most underrated" retrospectives; BRG Steam 86% / user 8.3 vs critic 75-76. FFTA and TS settled (FFT's shadow; "visual novel with battles"). | SoC, CQ, DS, BRG |

**Tier 3 — thin evidence (one game or the cross-cutting report only; do not over-weight)**

| # | Lesson | Games |
|---|---|---|
| 14 | **Per-battle rule modifiers must intersect the player's toolkit and have tactical counterplay; no consumable deletes them; no out-of-match penalty.** Unambiguous but single-game evidence; echoed by DS2 mid-map objective changes and [AP] "random restriction" complaints. | FFTA (+ echoes) |
| 15 | **Multiplayer-specific reception is sparse:** PvP in a collection game is instantly audited for pay-to-win (SoC); waiting on other players is the binding constraint (BG3 co-op); ~30 s turn timers are table stakes in turn-based MMOs but resented when opponents burn all of it. | SoC, [AP] only |

## Concrete examples & references

### 1. Final Fantasy Tactics Advance [FFTA] — 2003, GBA, premium
*Snapshot:* MobyGames critic average 86% over 63 ratings, ~87 Metacritic, 1M+ copies; Wikipedia's reception
summary names two canonical complaints — lighter story tone and cluttered menus.

**Loved**
- FFT-inherited fundamentals (free-order move + act, height/facing, grid) were solid and legible; the tactical core "was rarely the complaint".
- Build breadth: ~34 jobs across 5 races, abilities learned from equipped gear; "a wealth of rare equipment and some 300 missions", 20-100+ hours.
- Mission board plus **dispatch missions** (send benched units on async side quests for items) — consistently praised; gave idle roster members something to do and suited session-sized play.
- Short, self-contained skirmishes fit the handheld; some forum veterans (DVD Talk, AnandTech) preferred FFTA's pacing to FFT's.
- Onboarding: Nintendo World Report (7.5, 2003) "especially tailored for players unfamiliar with the genre"; Inverse (2023) calls the snowball-fight opening "the perfect way to teach players the basics" and the judge's no-death rule a "handy bumper lane for newcomers" — accessibility through soft failure, not shallower systems.
- Law-system *defenders* (a real minority): "forces players to come up with new strategies or fight tougher battles every time they play" (Giant Bomb user); "an acquired taste, but it adds depth" (GameSpot user). Per-battle rule variety as an idea was liked even by people who hated the execution.

**Disliked**
- **Law/Judge execution** — the most consistent criticism, launch and retrospective. NWR: "In practice, it only works occasionally... at least half of the laws aren't going to be applicable to your main party, and the ones that do have the potential to screw things up can usually be nullified with anti-law cards." Random draws read as noise when irrelevant and a consumable tax when relevant; a reader called battles "dumbed down and horribly restrictive".
- **Jail penalty:** a red card removes the unit from battle *and* jails it outside the battle (unavailable for missions, gear locked, bail fee). Felt punitive, not tactical; Square's FFTA2 (2008) removed penalties and rewards compliance instead (Siliconera).
- **Too easy, weak AI:** RPGamer readers "Painfully Easy"; HonestGamers "mostly pushovers" outside bosses; RPGamer: late game you can "completely wipe out the opposition before a single enemy has a chance to attack", partly because enemy levels scale to the *average of all your characters* (unused recruits lower the challenge). "AI is severely lacking" recurs.
- **Pace/grind:** one launch review "painfully sluggish"; NWR 2016 re-review lists "requires a lot of grinding" (~100 h); equipment-gated ability learning is slower than the prior game and locks skills behind rare-item RNG.
- **Cluttered UI:** RPGamer scored Interface 3/10.
- **Reputation gap vs FFT:** lighter story/tone hardened into "FFT is the better game"; Inverse (2023) concedes it "doesn't have quite the cult following of the original".
- Monetization: not applicable; nearest economic friction was bail fees and consumable anti-law cards acting as a tax on the rule system.

**Lessons the report draws:** draw battle modifiers from the monsters/skills actually present and give tactical (not consumable) counterplay; keep penalties inside the match; prefer carrots to sticks (FFTA2's shape); do not scale difficulty to roster average, scale to the deployed team, and invest in AI; achieve coziness through soft failure, not shallow combat; give benched units async jobs; protect short match length; make skill-acquisition gates visible and farmable; budget real effort for out-of-battle roster/equip UI; position tone honestly from the first screenshot.

### 2. TRIANGLE STRATEGY [TS] — 2022, Switch then PC, premium
*Snapshot:* ~83 Metacritic at launch; OpenCritic 89th percentile; Steam "Mostly Positive", ~80% of ~3,570 reviews (SteamPulse snapshot 2026-06). Zero microtransactions, which players counted in its favour.

**Loved**
- **Positional trinity** — elevation (levels 1 to 10+, damage/range bonus), backstab auto-crit, and pincer follow-up attacks — most consistently praised (RPGamer, Nintendo Everything, Cubed3, 2022).
- **Follow-up preview UI** shows the odds before commit. Reviewers *disagreed* on the actual follow-up damage ("weaker hit" vs "doubles damage") — evidence the legible preview mattered more than the formula.
- **TP action economy:** ~3 TP at start, +1 per turn; cheap basics vs expensive ultimates force budgeting rather than best-move spam. The flip side (casters "nearly useless" when dry) was accepted as intended tension (TurnBasedLovers, RPGamer 2022).
- **Fixed unique characters** instead of classes: "No classes... almost a totally unique set of skills" (God is a Geek 9/10); a 2024 r/JRPG thread still defends distinct roles over open customization.
- **Scripted encounter gimmicks:** Kotaku (2022-03) wrote up the Chapter 7 map (rooftop archers, player-usable fire traps, reinforcement waves, a boss that starts chasing after N turns) as a memorable, teachable spike.
- Normal difficulty "one or two careless moves results in disaster" (Tilting at Pixels); difficulty changeable any time with identical rewards, used "guilt-free".
- One curated hand-designed battle per chapter plus optional repeatable mock battles; Scales of Conviction votes gate recruits/routes and drive NG+ replay.

**Disliked**
- **Story-to-battle ratio — the defining complaint:** heavy dialogue, long waits between battles, worst early. Steam anecdotes range "50/50 in actual time" to "75-80% dialogue"; one stretch of 50+ minutes of cutscenes/exploration/voting before a battle (iMore, Cubed3, Steam 2022-2024).
- **Late battle length:** "well over an hour per battle" near the end, replay on loss (vooks.net, GamingTrend PC 2022-10).
- **Under-levelling into grind:** "the most notable issue is how under-levelled you will be no matter what" (GamingTrend); Game Informer: optional grinding "a tedious loop".
- Thin progression/customization: linear one-path promotions, minor weapon trees ("upgrading is minimum... a more limited feel"); even defenders concede it is shallow next to FFT/Tactics Ogre.
- **Hard = artificial:** "enemies do such massive damage with such high HP that it makes you struggle in a way that isn't really about skill" (Steam).
- Untelegraphed reinforcement waves read as being "swamped" (Kotaku); UI "irritating" (Tom's Guide) and "endless trips between the merchant and the forge".
- Veteran framing: "still lags far behind Tactics Ogre and Final Fantasy Tactics" (RPG Site 2022-03) — "great positioning game, shallow build game"; some recruits route-locked behind votes, needing multiple NG+ runs.

**Lessons the report draws:** a small regenerating pool (start ~3, +1/turn) is a proven low-complexity budget that suits few-unit sides; keep positional rules to a legible trinity and always preview; pincer/follow-up is the best mechanic to steal for multiplayer (ally completes the pincer); protect battle-to-downtime ratio and cap match length (mid-battle checkpoints or no-penalty retry); fixed distinct kits beat open customization but give each unit one or two real build forks; scale difficulty by encounter design (composition, terrain, objectives, reinforcement timing) never stat inflation; telegraph reinforcement waves; difficulty changeable any time without reward penalty; don't leave players under-levelled into a grind; do not gate collectible units behind irreversible long-arc choices in a persistent game *(report's inference: reads as FOMO)*; budget encounter *cadence*.

### 3. Sword of Convallaria [SoC] — 2024, Steam/mobile, free-to-play
*Snapshot:* launch week ~55% positive / 45% negative on Steam (ProGameGuides 2024-08); recovered to "Mostly Positive" (~75%, ~3,530 of 4,697 per stmstat, 2026-10) and still updated at its 2nd anniversary (Inven Global 2026-07-30).

**Loved**
- Core grid tactics called a genuine FFT/Tactics Ogre homage — positioning, terrain, elevation, elemental + weapon-triangle, facing bonuses; "expertly designed", "rewards careful positioning" (CGMagazine, RPG Site, Turn Based Lovers, Escapist, Aug-Sep 2024).
- **Action economy shape:** basic attacks cost 0; skills cost per-unit NRG *and* carry independent cooldowns (double-gated); support units/engravings that restore NRG or reset cooldowns create build depth around the resource (GameWith 2024-25). Detractors call it "simplified", not broken.
- **Deterministic turn order** from fixed speed stats (tanks first, ranged last) makes stages plannable; predictability treated as a feature (RPG Site 2024-09).
- **Low-rarity units stay "crucial" in endgame PvE** via specialised tools — the most-cited F2P fairness defence (RPG Site; Vaporlens).
- **Limited rewind (undo up to 3 moves per stage)** praised as a safety net (Vaporlens).
- Stage/boss design: "every stage presents a unique challenge", bosses the fun peak (Pocket Gamer 2024); 2026 anniversary "Natural Protection" enemy mechanic marketed as "strategy matters more than raw power" (Inven Global).
- **Spiral of Destinies** — offline branching campaign gated by earnable keys, no gacha units — the most-praised part of the product; a 1,100-hour Steam player was still exploring paths.
- Pixel art and the Hitoshi Sakimoto soundtrack near-universally praised.

**Disliked**
- **Monetization is the dominant negative and cleanly separable from combat sentiment:** 8-10 overlapping currencies, several confusing pity systems, dupe dependence, a "generally not recommended" weapon banner, a tutorial that pushes purchases, called dark patterns outright in Steam reviews.
- **Energy/stamina** (cap too low, recharge too slow, *expiring* refill items, FOMO currencies) read as "a mobile mechanic on PC" (Vaporlens; RPG Site).
- **Monetization reaching into the kit:** unlocking a unit's alternate skill costs Castalia, hard to get without paying — a paywall on build choice (RPG Site 2024-09).
- **Power-creep anxiety:** banner units every 2-4 weeks vs ~100 days to max one character F2P (300 shards at a 3/day farm cap); progression walls near account level 30-40.
- **Depth/control complaints:** "feels so simplified"; units auto-face their movement direction and you cannot choose facing after acting — a "peculiar quirk" that punishes through a control gap, not a decision.
- **UI/turn friction:** forced "standby" confirmation clicks, double-clicking tiles behind obstacles, fixed isometric camera obscuring crowded areas.
- Weak auto-battle (works only when over-levelled) paired with grind that re-runs identical fights; deploy cap of 5-6 on harder stages felt restrictive.
- **PvP read as pay-to-win:** "a ranking system for PvP would mostly rank players by real-world wealth"; "a gacha tactics game basically invalidates any tactics".
- Spiral's own frictions: sparse Beacon checkpoints, cannot use the main-game roster, large time cost, bland protagonist. Launch black marks: advertised controller support that did not work, mobile-port UI scaling.

**Lessons the report draws:** players grade combat and economy separately but the economy writes the score — keep to one or two legible currencies; free basic action + per-unit resource + independent cooldown is a proven liked shape for small rosters; show the turn queue and keep randomness out of ordering; let the player choose facing as the last step of an action; never force dead inputs (budget clicks per turn); keep early monsters viable via late-game niches; a limited undo is a loved, on-brand valve; no energy gates, expiring resources or binding daily caps; keep self-contained strategic content *but* let the main roster in; retain difficulty through enemy mechanics, not stat inflation; avoid re-running identical fights; normalize or bracket power in ranked PvP so position reads as skill; frame small deploy caps as the format; launch reception is recoverable but input/platform polish is day-one critical.

### 4. Pokémon Conquest [CQ] — 2012, DS, premium
*Snapshot:* Metacritic 80, IGN 9/10, Famitsu 34/40, Game Informer 7/10; ~1M sold ("flew under the radar"); retrospectively named the franchise's best spinoff (Dexerto 2024-03).

**Loved**
- Monster-as-tactical-unit fusion: Fire Emblem-style grid where type matchups are the tactical language, "addictive and fresh" (GamesRadar 2012); "type match-ups matter here, and they matter a lot" (RetroXP 2020).
- The **prep/strategy layer** more than the battles — Kotaku (2012): "the joyous intricacies of battle prep"; garrison choices across 17 kingdoms, elemental counter-planning.
- Accessibility: concepts drip-fed, intuitive controls (Trusted Reviews, Nintendojo, Famitsu).
- **Per-map variety:** 17 kingdoms each with a terrain gimmick (banner capture, poison tiles, moving statues, lava) and alternating rout/objective victory — this, not unit complexity, is what reviewers cited for variety.
- Once-per-battle Warrior powers (boosts, heals, invincibility) as a readable second decision layer.
- **Recruit-by-performance:** defeated warriors join if beaten within ~4 turns or via super-effective hits ("adds some tension", Kotaku); wild Pokémon recruited via a short rhythm/timing "link" minigame, fondly remembered.
- Bounded matches (~20-turn limits; RPGFan, Gamer Guides); ~15 h campaign plus 37 post-game episodes with roster carryover ("the best postgame in all of Pokémon", Smogon/Bulbagarden fans).
- **One move per Pokémon** as identity: retrospectively cited as core charm (Dexerto 2024; Bulbagarden) — the same mechanic critics panned at launch.

**Disliked**
- **One move = shallow at launch:** Kotaku "turn-based tactics at their most basic", Pokémon "living artillery"; the commonest fan sequel wish is 2 moves per unit or bigger/hex maps (Bulbagarden).
- **Counterpicking trivialises fights:** you see the enemy roster before choosing a team, so super-effective picks make "dominating fairly easy" (HonestGamers); beyond the type chart the mechanics "aren't very deep" (Smogon).
- **Flat difficulty with an endgame cliff;** "relatively exploitable AI" (Bulbagarden) then a "fairly sudden and steep climb" (Smogon).
- **Link/evolution grind:** evolutions take months of in-game time, Warlord evolutions in-game years; **Perfect Link obscurity** — one ideal partner per warrior, often behind random swarms, forcing trial-and-error or wikis.
- Meta-layer decay: "back-to-back events" early, "waiting and clicking through prompts" late (Lemmy comment); the 6-per-kingdom cap forces garrison shuffling; the first campaign withholds kingdom upgrading entirely.
- Post-game repetition (most of 37 episodes "re-conquer Ransei with a different warlord"); thin fiction; pure-RNG map gimmicks (e.g. Illusio flag warps) disliked even by fans.
- Critic split: IGN 9/10 vs Game Informer 7/10 — "almost entirely over whether simple battles were 'accessible' or 'shallow.'"

**Lessons the report draws:** 2-3 moves with distinct geometry beats both 1 and 4+ interchangeable ones; type advantage should be a modifier, not a verdict (hide or partly reveal compositions, limit last-second swaps, cap multipliers); recruit-by-performance beats recruit-by-attrition; hard turn limits help pacing but create defender-stall incentives (prefer escalating pressure in PvP); map gimmicks and alternate objectives are the cheapest sustainable variety; a once-per-battle trainer power adds a decision layer cheaply; time-gated progression reads as grind and hidden requirements export depth to wikis; the between-battle layer needs decision density all the way through; gate complexity by hours, not by playthrough; vary rules (not just rosters) in post-launch content; accessible-but-simple can win long-term.

### 5. Shin Megami Tensei: Devil Survivor [DS] — 2009 (DS2 2012; Overclocked/Record Breaker remakes), premium
*Snapshot:* DS1 84 Metacritic, Overclocked 78; DS2 79, Record Breaker 84 after adding the easier "Blessed" mode.

**Loved**
- **Unit-as-small-team:** each grid unit is a human leader + 2 demons; engaging triggers a 3v3 skirmish with SMT weakness rules — "Fire Emblem, but Shin Megami Tensei"; "probably the deepest combat in a tactical RPG on a handheld" (user review, 2009).
- **Extra Turn economy:** weaknesses and crits grant extra actions; kill the enemy leader to delete the team fast (forfeiting its demons' XP/macca) or pick minions off for rewards (GamesRadar 2009 via Inverse).
- **Turn-order-as-resource:** skipping an attack to act earlier next turn singled out as a prized, cheap tradeoff (GamesRadar via Inverse).
- **Skill Crack:** declare a skill on a specific enemy pre-battle; that squad must land the kill. Turned fights into a secondary puzzle and made Free Battles "not feel like a complete waste of time" (RPGFan 2009).
- **Demon Auction:** "a bit like eBay for exorcists"; narrow wins "became a dependable thrill" (Nintendo Life 2015).
- Heavy pre-battle prep (fusion, skill inheritance, composition) — "more than the usual amount of time is spent before each battle" (RPGFan); "quick battles and short conversations" suited the handheld (GamesRadar).
- Difficulty as identity ("difficult but exquisitely balanced", Famitsu); adding an easier mode measurably improved reception; retrospectives (Inverse 2022/2024) call the series Atlus's most underrated.

**Disliked**
- **Difficulty spikes and mid-battle objective changes** — the most consistent complaint, worst in DS2: "difficulty will spike unexpectedly, or objectives will change midway, throwing your entire strategy right out the window" (RPGamer, NWR 2012); prep invalidated mid-map read as a rug-pull.
- **Mandatory grinding:** Free Battles "bitterly necessary" (Game Revolution 2015); "to auction you need money, and to get money, you need to grind" (Operation Rainfall 2015). Dissenters (Smogon) say losses were loadout problems — but the game did not signal that, so players ground.
- **RNG that steals earned action economy:** enemy lucky crits/low-accuracy hits cancelling the player's Extra Turns (r/Megaten thread ~2024; Game Informer 2009 on chance-based elements; a GameSpot user claimed the AI got unearned extra turns).
- **Retry marathons and boss gauntlets:** "8 or more attempts" (Destructoid 2009); fights of "30 minutes to several hours depending on retries" (Operation Rainfall 2015); no mid-battle saves on long maps.
- Menu-map world navigation undercut immersion; launch-era RPGamer called DS1 "something of a letdown" over a "lopsided battle system and lots of grinding".
- Mild monetization: $0.99 grind-accelerator Free Battle DLC (level-scaled, not pay-to-win) on a game criticised for grind; 3DS eShop closure (2023-03) made all DLC unobtainable.

**Lessons the report draws:** the leader-plus-monsters squad maps onto small squads; reward weakness exploitation with extra actions but keep triggers deterministic/player-biased and legible; add a cheap turn-order currency; never invalidate prep mid-battle without warning; make loadout change (not levels) the intended answer to walls *and say so* on defeat; give recruiting a Skill-Crack-style declared intent; keep acquisition margins close but the economy solvent from normal play; short maps with checkpoints and breathers between bosses; ship difficulty/assist options at launch; never sell relief from friction the design created.

### 6. Brigandine [BRG] — 1998 original (Grand Edition 2000); Legend of Runersia 2020, premium
*Snapshot (Runersia):* 76 Metacritic critic vs 8.3 user; OpenCritic top-critic average 75, 62% recommend; Steam 86% positive of 1,200+; 4.46/5 on PSN (795 ratings). The 1998 original became a cult collectible (~$300 physical copies); sequel Brigandine Abyss announced 2026-02.

**Loved**
- **Commanding monster armies:** each Rune Knight leads summoned monsters raised from level 1 into "some enormous and devastating force of nature" (Nintendo Life 7/10); 1998 fans remember big sprites and 3D battle animations.
- **Commander mechanics:** knights buff monsters in nearby hexes; **routing the commander routs the squad** — a clean dramatic win condition (RPG Site 8/10; matchstickeyes 2021).
- Hex combat with terrain specialisation ("greater positional tactics than a standard square grid", RPGFan 85/100); water monsters and flyers as a cheap source of variety.
- **12-turn battle cap** credited as anti-quagmire; most battles end before turn 7 (RPGFan; GameSkinny).
- **Monster loss stakes:** dead monsters gone barring rare Revival Stones — losses "genuinely felt".
- **Strategic layer feeds tactical:** territory held determines mana income and *which monsters you can summon*; the layers "reinforce each other" (matchstickeyes).
- Depth: ~100 rune knights, ~50 monster types with branching evolutions, six factions; easy mode removes the campaign season limit rather than changing battle rules; a guided-training mode toggleable at any time (Nintendo Life 2020-06).

**Disliked**
- **Battle length — #1 complaint across both eras:** 3-4 dead turns of approach (Nintendo Life), "half-hour to 45 minute battles just isn't worth it" (But Why Tho), Cubed3 "the biggest problem" (1-2 hours claimed); Twinfinite (2022-05) on "sluggishness and frankly, repetitive nature of battles".
- **Battle volume:** "upwards of five to six battles back to back" exhausted even an 85/100 reviewer (RPGFan).
- **Repetition:** same maps and similar enemy comps; 1998 "battles all blend together" (RPGamer); Runersia "isn't varied enough to keep you invested".
- **Exploitable AI:** attacks whatever it can kill rather than the biggest threat; will not invade territories garrisoned above its combat power ("checking" a border); commits piecemeal (RPGFan; matchstickeyes; Steam 2022-23).
- **Steep onboarding:** "very little help" for non-strategy players; "glacially slow... with far too many menus"; the 1998 original needed several menu visits to resupply a commander. Moved units unusable the next turn felt like a chore.
- **Snowball/late slog:** hardest early, easier later; best squads earn the most XP, widening the gap.
- Presentation: generic 3D knights, palette-swap upgrades, static dialogue; Happinet itself replaced the 1998 slow 3D battle animations with "simpler and faster 2D animations" in Grand Edition (2000). Reception "good rather than great"; steep ~$50 price vs dated presentation.

**Lessons the report draws:** protect the commander-and-monsters fantasy with legible squad stakes (break the leader); hard turn caps help only if contact starts on turn 1-2 (30+ minute battles were the most-cited quit reason); fight *volume* fatigues as much as length; variety must be structural (rotate objectives, layouts, comps; terrain-specialised monsters); AI must weigh threat and not freeze on "your power is higher"; permadeath creates beloved stakes but drives reset-scumming when revival is scarce — prefer a softer cost *(report's recommendation)*; tie geography to recruitment; difficulty knobs should change pressure, not rules; layered dismissible tutorials and fewer menu steps; make attack presentation fast and skippable; fix the snowball.

### 7. AP vs move + one action — sentiment and the conventions that make AP readable [AP]
This report covers **AP-pool** turns (DOS2, old Fallout, Dofus/Wakfu; the abandoned XCOM time-unit design),
**named-slot economies** (BG3/5e action + bonus action — neither pure AP nor move+act, but relevant for
legality opacity) and **move + one action** turns (ITB, Mario + Rabbids, Fire Emblem: Three Houses, XCOM's
two-action design, FFTA).

**What players like about AP**
- *Flexibility and scale:* DOS2 reviewers called its AP "one of if not the best turn-based combat systems"; with up to 6 AP a character gets the equivalent of 2-3 full actions, which made large fights "feel reasonable" vs BG3/5e's one-main-action turns ("made fights drag", 2021 Steam critic).
- *Banking:* ending a turn early banks unused AP — passing or holding is never strictly wasteful; rewards restraint.
- *Creative freedom:* PC Gamer's DOS2 praise centred on "yes, you can attempt it" — mixing movement, items, environment interaction and attacks in any order.
- *Grid combat as the draw:* Dofus/Wakfu Steam comparisons credit combat where "player skills/mechanics... feel more impact"; positional bonuses (Dofus Arena +20% side / +40% back) give the grid meaning.

**What players dislike about AP**
- *Binary gates:* DOS2 armor — CC is 100% blocked until matching armor is stripped, then 100% lands — collapses play to "knock out one armor type then chain CC" and mono-damage parties (most-cited design regret).
- *Initiative design:* DOS2 round-robin side alternation made initiative a near-dump stat and made finishing off weak enemies counterproductive (it promotes a strong enemy in the queue) (RPG Codex 2017; re-litigated later).
- *Pace:* "combat is waaaaaay too slow" (Steam); the popular fix was an 8-AP mod that trivialises fights — "more AP, not better fights".
- *Flattened costs:* a dagger stab and a giant axe swing both cost 2 AP (GameBanshee) — readable but flattens identity.
- *Opacity and stacking (BG3):* "I never quite know what I can and can't do in combat" (bonus-action legality is invisible until tried; edge cases read as bugs); Haste + Action Surge + Quickened Spell ends encounters in one turn; Larian itself restricted Haste stacking in Honour mode.
- *Old Fallout:* fine in boss-scale fights, "real tedious" vs groups of weak critters — enemy-turn time, not player-turn time, was the complaint.
- *Analysis paralysis (board-game consensus):* many options x few affordable actions; players simulate every movement path to min-max AP; coupling movement and attacks in one pool is named as a cause.
- *Multiplayer waiting:* BG3 co-op players "spend most of a fight doing nothing", large encounters near an hour (PC Gamer); workaround is splitting the party.
- *Timers:* hard timers are "the absolute worst thing in turn-based games" in single-player (Steam, 2025) but table stakes in turn-based MMOs; resentment shifts to teammates/opponents who use *all* of it. Wakfu monetization/grind and imbalanced PvP flagged in Steam comparisons.

**What players like about move + one action**
- *ITB perfect information:* enemy intents telegraphed before you act — Digital Trends "masterclass in elegant design", each turn "feels like a logic puzzle"; proof a one-move-one-action economy can carry great depth.
- *Rabbids:* movement embedded with free actions (Dash damages while moving without consuming your attack; Team Jump chains) inside a simple economy; quantized 0%/50%/100% hit chances named the readability gold standard. *Sparks of Hope* (2022): free movement in a radius, lock-in only on firing, Dash/Team Jump usable in any order — "transformative".
- *XCOM's rationale:* Jake Solomon (2012) dropped Time Units because "players had trouble relating that vague number to what they could do", it was never clear what optimal TU use was, and the 2-action design makes players *want* to move; Julian Gollop (2017) conceded pure time-unit optima were "very slow, and ultimately a bit boring".
- *Fire Emblem Three Houses:* "no complicated button maneuvers", "not pressured to move quickly"; depth from terrain/positioning/Combat Arts atop a simple economy; Divine Pulse rewind softens mistakes.
- *Undo-before-commit:* FFTA's revoke-and-replace-movement convention praised even by its critics.

**What players dislike about move + one action**
- *Long-run repetition:* ITB's one consistent criticism — an ultra-constrained economy cannot generate build diversity, so content variety must.
- *Simple does not mean fast:* FFTA battles still called "painfully sluggish" and "dull"; linked multiplayer battles "take a long time"; random Judge restrictions resented.
- *Shallow reads* (cross-report): CQ's one-move units and SoC's "simplified" label show the same economy can be called accessible or shallow depending on the player.

**Comparison at a glance**

| Dimension | AP pool (DOS2, Fallout, Dofus/Wakfu) | Move + one action (ITB, Rabbids, FE3H, XCOM, FFTA) |
|---|---|---|
| Praised | Fine-grained freedom; banking; big fights feel proportionate; grid as the draw | Readability; perfect-information puzzles; accessibility; undo; depth from position |
| Resented | Binary CC gates; initiative quirks; slow pace; flat costs; opaque legality; alpha-strike stacking; analysis paralysis | Repetition over time; thin variety without content support; "shallow" label |
| Multiplayer time | Waiting dominates; ~30 s timer is the survived convention | Fewer decisions per unit, so turns are naturally short; simultaneous same-side turns help |
| Failure mode | Optimum collapses to one strategy | Same economy cannot differentiate builds |

**Conventions that make AP (or any budget) readable** — all from [AP] unless noted
1. Show the remaining budget as **discrete icons**, not a number; preview exactly what remains after a queued move *before* the click.
2. Keep the cost tiers few (uniform costs are readable; they flatten identity, so differentiate via per-unit stats such as range/movement/cooldowns).
3. Make movement free or separate *and* give it combat value (positional damage; Rabbids-style dash-through damage) — "the single most-praised mechanic cluster" in the report.
4. Telegraph enemy intent before commit (ITB); quantize hit/recruit chances to a few steps (Rabbids 0/50/100) rather than 73%-style precision.
5. Allow move-undo before the action commits (FFTA, Rabbids); keep attacks as the commit point.
6. Make every action's legality visible before the player tries it: grey-out with reasons beats error-on-click (BG3 lesson).
7. Make passing non-wasteful (bank a small bonus next turn, DOS2-style) so hesitant players are not punished.
8. Phase the turn (move, then act) and keep each unit's option list short — the report suggests 4-6 verbs, "FE/Pokémon-scale".
9. Cap extra-action stacking hard and audit the first round for alpha-strike optima (BG3 Honour-mode precedent).
10. Avoid binary immunity-then-guarantee control gates; use graded effects (shortened duration, resistance that builds per application).
11. Timer conventions: ~30 s base turn, +~0.5 s per AP/MP owned, unused time banked forward (cap ~90 s) (Wakfu wiki, Method Wakfu) — turn time scales with how much a unit can do.
12. Simultaneous same-side turns ("a blessing for multiplayer", PC Gamer 2023) attack the waiting problem; the report suggests targeting a full 1v1-to-3v3 round resolving in under ~45 s including animations.

**Closest precedents to a "tuned AP where a typical turn = move + one attack" hybrid** *(synthesis from the above)*:
XCOM's two-action design (explicitly built so players want to move); Sparks of Hope's free-movement-in-a-radius
with lock-in on attack; SoC's free basic attack + per-unit resource + cooldown; TS's small regenerating TP pool;
DS's "skip your attack to act earlier" turn-order currency. The report's default recommendation for 1-3
monsters per side was *move + one action, or a tiny 2-3 point budget with uniform costs*, not a large AP pool,
because the roster is too small for AP's main selling point (budgeting across many actors).

## Design implications & transferable principles
*(Synthesis. Each point cites its report tag; items marked "synthesis" are the author's inference from the
reports. They are hypotheses to playtest, not reception findings.)*

**Target design taken as fixed** (commissioned rulings): (a) tuned AP where a typical turn = move + one
attack; (b) round-based speed order; (c) per-monster action queue with an idle-only clock; (d) 30 s per-unit
cap in PvP; (e) recruit odds shown; (f) 1-3 units per side. The reports were also written against: a gentle
"cozy" positioning, persistent monsters in an online world, recruit-by-weakening as a tactical verb, a single
wallet currency, and an existing swap action.

### Per-ruling implications
**(a) Tuned AP, typical turn = move + one attack**
- Reception favours this shape: XCOM's designers abandoned a pure AP/time-unit pool because players could not map "a vague number" to actions [AP]; move+act/hybrid shapes with a small side resource are the liked ones in TS (TP), SoC (free basic + NRG + cooldown) and DS (turn-order currency) [TS][SoC][DS].
- Keep the budget small, shown as icons, with the post-move remainder previewed pre-click [AP]. Fix one heavy tier that eats most of a turn rather than many cost tiers *(synthesis, consistent with [AP] "few tiers")*; differentiate monsters through range, movement and cooldowns rather than per-action costs [AP].
- Give movement value without spending the attack (positional damage, dash-through effects) — and note it makes repositioning to corner a weakened monster a native verb [AP].
- Cap extra-action effects and audit round one for alpha-strike optima; a small roster makes a single extra action swing a whole match [AP][DS: extra turns must be legible and not stolen by opaque RNG].
- Avoid binary CC gates and "stunlock-weakening" in the recruit loop [AP].
- Add a cheap turn-order currency (skip the attack to act earlier) — repeatedly cited in DS as depth for almost no build cost [DS].

**(b) Round-based speed order**
- SoC players treated deterministic speed-based order as a feature that made stages plannable puzzles; show the queue and keep randomness out of ordering [SoC].
- DOS2's strict side alternation turned initiative into a dump stat and punished finishing off weak enemies [AP] — a speed-stat round order avoids the first but watch the second: in a weaken-then-recruit loop, leaving a target alive is the point *(synthesis)*.
- Initiative stacking is a documented alpha-strike route in both AP games and BG3 [AP]; test who acts first in round one.
- Simultaneous same-side turns were praised for multiplayer [AP] *(whether this fits a round-based order is unresolved; see Open questions)*.

**(c) Per-monster action queue with an idle-only clock**
- **Evidence gap:** no report examines idle-only clocks. The nearest reception evidence is general: hard timers are hated in single-player and accepted in turn-based MMOs, with resentment aimed at players who consume the whole timer every turn [AP]. Treat any claim that an idle-only clock reads as fair or unfair as untested.

**(d) 30 s per-unit PvP cap**
- 30 s is the convention that survived Dofus/Wakfu/Atlantica [AP]; those timers scale with what a unit can do and bank unused time [AP]. A fixed 30 s with no scaling gives a rare-action unit and a many-option unit the same clock *(synthesis)*.
- A per-unit cap is a ceiling, not a pace: 6 units x 30 s is 3 minutes per round worst case; the [AP] report's ~45 s round target implies typical turns must be far shorter, which favours short option lists and fast, parallel animations [AP][BRG: even developers swapped slow 3D animations for fast 2D] *(arithmetic is synthesis)*.
- Do not reward timeout wins: CQ's defender auto-wins on stall; prefer escalating pressure over a raw timer [CQ].
- Bracket or normalise monster power so ladder position reads as skill; PvP in a collection game is audited for pay/grind-to-win immediately [SoC].
- Hide or only partially reveal opposing compositions pre-match and limit last-second swaps, or cap effectiveness multipliers, so counterpicking is a disadvantage not a verdict [CQ].

**(e) Recruit odds shown**
- Previews are loved: TS reviewers praised the follow-up odds pop-up without agreeing on the formula [TS]; quantize chances into a few legible steps [AP]; explain why bonus actions or extra turns happened [DS].
- Make recruiting a *commitment*: layer a performance condition (tempo, no-faint, finisher type) on top of HP-whittling [CQ]; add a declared pre-battle intent ("recruit THAT monster, weakened by THIS unit") [DS]; sit near the edge (narrow HP band, risk of a voiding KO) for close-margin tension [DS].
- Keep the feeding/acquisition economy solvent from normal play — "grind money to participate in acquisition" was resented [DS]; make evolution/upgrade requirements discoverable in-game [CQ]; avoid time-gated crawls [CQ].
- Region-gate wild availability to give the world map pull [BRG]. Do not gate collectible units behind irreversible long-arc choices in a persistent game [TS].
- Recruit-by-weakening is not itself directly attested in the reception evidence; the closest analogues are CQ (recruit within ~4 turns), DS (Skill Crack, auction) and BRG (territory-gated summons) [CQ][DS][BRG] *(synthesis)*.

**(f) 1-3 units per side**
- Leader-plus-small-squad is the most-praised small-roster structure [DS][BRG]; each unit's turn carries more weight, so a regenerating small pool [TS] or resource + cooldown [SoC] keeps turns meaningful.
- Frame the cap as the format (like doubles), not a gate that content removes; SoC's 5-6 deploy cap drew "withheld content" complaints [SoC]. Variety then must come from pre-battle choice, swaps and synergy breadth [SoC] and from maps/objectives [CQ][TS].
- Give each monster 2-3 moves with distinct geometry [CQ] within the report's 4-6 total verb budget [AP]; one or two real build forks per species [TS]. *(Tension: CQ fans ask for 2 moves; AP suggests 4-6 verbs in total. Reconcile by counting move/item/swap in the verb total, then playtest.)*
- Keep early-route species relevant late via specialised niches [SoC]; give benched monsters async jobs [FFTA]; let recruited monsters be usable in every mode [SoC].

### Cross-cutting guardrails (ordered by how strongly the evidence repeats)
1. **Pace budget [all six; AP].** First contact on turn 1-2 [BRG]; target minutes-long matches; no stacked mandatory fights [BRG]; mid-battle checkpoints or a no-penalty retry [TS][DS]; no more than 1-3 enemy combatants and fast, parallel enemy animations [AP]; protect downtime ratio (dialogue, menu upkeep, travel) [TS].
2. **No grind loops; vary repeatable content [all six].** Repeatable battles need modifiers, rotation or first-clear weighting [SoC][BRG]; make any optional repeatable fight intrinsically fun (recruit opportunities, modifiers) rather than an XP chore [TS]; do not let normal play leave players under-levelled [TS]; no time-gated progression that reads as an energy system [CQ][SoC].
3. **Difficulty by encounter design, with assist options at launch [all six].** Composition, terrain, objectives and reinforcement timing, not stat inflation [TS][SoC]; scale to the deployed team, not roster average [FFTA]; telegraph reinforcement waves [TS]; selectable difficulty any time with no reward penalty [TS]; invest in AI that weighs threat and does not freeze on a power number [BRG][FFTA]; make loadout change the signalled answer to walls [DS]; never invalidate prep mid-battle without warning [DS]. Floor difficulty matters more than ceiling for a gentle-positioned game; keep ceiling in optional content [DS].
4. **UI and onboarding budget [all six].** Budget real design effort for roster/equip/mission UI [FFTA]; budget clicks per turn and never force dead inputs [SoC]; layered, dismissible tutorials plus a diegetic low-stakes first fight [FFTA][BRG]; do not withhold a core system for a whole first campaign [CQ]; ruthlessly cut resupply/menu steps [BRG].
5. **Legibility [TS, SoC, DS, FFTA, CQ; AP].** Telegraph; preview; show the queue; let the player choose facing as the last step of an action if facing exists [SoC]; grey-out illegal actions with reasons [AP]; no symmetric opaque RNG cancelling earned action economy [DS].
6. **Soft failure, nothing outside the match [FFTA, TS, SoC, DS, BRG; AP].** Free move-undo [FFTA][AP]; a limited rewind [SoC]; no battle outcome locks a monster out of the roster or levies surprise fees [FFTA]; replace permadeath with a softer cost (injury/retreat) while keeping visible investment [BRG].
7. **Identity and variety [all six].** Distinct kits; map/objective variety per biome; terrain-specialised monsters as the cheapest praised variety [BRG]; avoid pure-RNG map gimmicks [CQ]; if modifiers or weather exist, draw them from present monsters, show them pre-battle, and make counterplay tactical (positioning, swaps, skill choice), never a consumable [FFTA]; prefer bonus-objective carrots ("win without KOs") to penalties [FFTA].
8. **Economy [SoC; DS; CQ; TS].** One or two legible currencies; no energy gates, expiring resources or binding daily caps on building a monster you own; no paywall on build choice; never sell relief from friction the design created; if convenience is sold, the base loop must be demonstrably grind-free first [SoC][DS].
9. **Tone [FFTA].** Position the game honestly from the first screenshot so the promise being judged is the one actually made.

### Tensions between games that the ceremony should decide explicitly
- **Simple vs shallow:** CQ and SoC show the same simple economy praised as accessible and panned as shallow; depth should live in team-building, positioning and objectives rather than per-unit move lists [CQ][AP].
- **Reveal vs counterpick:** telegraph everything *inside* the battle (ITB, DS) but limit pre-match composition reveal to stop counterpick-and-stomp (CQ) *(synthesis of [AP]/[CQ])*.
- **Turn limit:** good for pacing (BRG, CQ) but creates stall incentives (CQ); choose escalating pressure over a defender-favoured timer.
- **Permadeath stakes:** BRG players loved the stakes and called the loss "extremely punishing"; the cozy answer is a softer cost with visible investment.
- **Fixed kits vs build depth:** TS (fixed kits loved, customization thin) vs FFTA (job breadth loved, gear-learn RNG resented) vs AP uniform costs (identity flattened).
- **Verb count:** 2-3 moves (CQ fans) vs 4-6 verbs (AP).
- **Carrots vs sticks:** FFTA2's replacement of penalties with compliance bonuses is the community-validated shape [FFTA].

## Open questions
- No report covers an **idle-only clock** or a per-monster **action queue**; how do players react to a timer that only runs while they are idle? (Nearest evidence: general hard-timer sentiment [AP].)
- Do simultaneous same-side turns [AP: BG3] compose with a round-based speed order, or only with side-alternating play?
- How much do cozy-positioned audiences tolerate "tuned AP" at all? The reports contain no data on cozy-audience reception of any AP game.
- **Recruit-by-weakening** has no direct reception precedent; the analogues (CQ, DS, BRG, FFT/FFTA capture) are indirect. Which odds feel fair without trivialising rarity?
- Do DS's well-loved Extra Turns survive without an RNG loophole? What exactly makes a trigger "deterministic or player-biased" in practice? [DS]
- How much weight does a 1-3 unit format give to a single extra action or crit swing (a small-roster variance question the reports raise but do not measure)?
- FFTA community sentiment lacks Reddit coverage; Dofus/Wakfu timer sentiment is inferred; GameSpot's Conquest review was not read directly. Re-run these with a different search path if a decision hinges on them.
- Review-score snapshots (Steam, OpenCritic, stmstat) will drift; re-check before quoting numbers externally.

## Sources
Accessed 2026-10-24 via the seven reports; dates are publication dates where the report gave one. Some entries bundle several URLs.

**FFTA** [FFTA]
- Wikipedia, Final Fantasy Tactics Advance, reception section (accessed 2026-10-24): https://en.wikipedia.org/wiki/Final_Fantasy_Tactics_Advance
- MobyGames aggregate (86% over 63 ratings): https://mobygames.com/game/10325/final-fantasy-tactics-advance
- Nintendo World Report launch review, 7.5/10 (2003): https://www.nintendoworldreport.com/review/4138
- Nintendo World Report Wii U VC re-review (2016): https://www.nintendoworldreport.com/review/41902
- RPGamer staff review (2003): https://rpgamer.com/review/final-fantasy-tactics-advance-review/
- RPGamer reader reviews (2003-04, archive): https://archive.rpgamer.com/games/ff/ffta/reviews/fftardrev1.html (also fftastrev1-3, fftardrev2/5)
- GameSpot launch review (2003): https://www.gamespot.com/reviews/final-fantasy-tactics-advance-review/1900-6074647/
- HonestGamers review: https://www.honestgamers.com/5362/game-boy-advance/final-fantasy-tactics-advance/review.html
- RPGFan review (2003): https://www.rpgfan.com/review/final-fantasy-tactics-advance/
- Inverse 20th-anniversary retrospective (2023-09-26, updated 2024-02-20): https://www.inverse.com/gaming/20-years-later-underrated-final-fantasy-sequel-still-deserves-more-credit
- Giant Bomb user reviews: https://giantbomb.com/user-reviews/id/72668/good-but-far-below-expectations
- GameSpot user reviews: https://www.gamespot.com/final-fantasy-tactics-advance/user-reviews/2200-434788/
- Final Fantasy wiki, Law system (yellow/red cards, jail, bail): https://finalfantasy.fandom.com/wiki/Law_system_(Tactics_Advance)
- Siliconera on FFTA2 (2008): https://www.siliconera.com/final-fantasy-tactics-a2-polished-to-amazement/
- Forum sentiment (DVD Talk thread; AnandTech FFTA2 thread) — no URL in the report; Reddit did not surface in search.

**TRIANGLE STRATEGY** [TS]
- Kotaku, Fire Trap Map / Chapter 7 (2022-03): https://kotaku.com/triangle-strategy-square-enix-strategy-avlora-fire-trap-1848691876
- RPGamer review (2022-03): https://rpgamer.com/review/triangle-strategy-review/
- TurnBasedLovers review (2022): https://turnbasedlovers.com/review/triangle-strategy-tbl
- Nintendo Everything review (2022-03): https://nintendoeverything.com/review-triangle-strategy/
- RPG Site review (2022-03): https://rpgsite.net/review/12464-triangle-strategy-review
- iMore review (2022-03): https://www.imore.com/triangle-strategy
- Tom's Guide review (2022-03): https://www.tomsguide.com/reviews/triangle-strategy
- God is a Geek review, 9/10 (2022-03): https://godisageek.com/?p=260832
- God is a Geek PC & Steam Deck review (2022-10): https://godisageek.com/reviews/triangle-strategy-pc-steam-deck-review/
- GamingTrend PC review (2022-10): https://gamingtrend.com/feature/reviews/triangle-strategy-review-on-pc-this-will-do/
- Tilting at Pixels review (2022): https://tiltingatpixels.com/post/Triangle-Strategy-Review
- Cubed3 review (Xbox port era): https://www.cubed3.com/games/reviews/xbox-series-x-s/triangle-strategy-1
- Vooks review (2022-03): https://vooks.net/triangle-strategy-review
- Steam Community discussions, app 1850510 (2022-2024): https://steamcommunity.com/app/1850510/discussions/0/3821908745309366422 ; https://steamcommunity.com/app/1850510/discussions/0/3878221733389134345 ; https://steamcommunity.com/app/1850510/discussions/0/3497635239409246674
- SteamPulse aggregate (snapshot 2026-06): https://steampulse.org/game/1850510
- r/JRPG retrospective thread (2024-07-17): https://www.reddit.com/r/JRPG/comments/1e5s1pg/triangle_strategy
- Nintendo official battle tips (2022): https://www.nintendo.com/us/whatsnew/tips-for-getting-started-with-triangle-strategy
- Wikipedia, Triangle Strategy reception summary (accessed 2026-10): https://en.wikipedia.org/wiki/Triangle_Strategy
- OpenCritic aggregate (launch 2022-03): https://opencritic.com/game/12840/triangle-strategy

**Sword of Convallaria** [SoC]
- Vaporlens Steam review summary (updated ~May 2025): https://vaporlens.app/app/2526380/sword_of_convallaria.md
- RPG Site feature by Chao Min Wu (2024-09-13): https://rpgsite.net/feature/16293-sword-convallaria-great-tactical-rpg-only-to-be-overshadowed-by-its-optional-free-to-play-trappings
- ProGameGuides launch-reception news (2024-08): https://progameguides.com/news/sword-of-convallaria-gains-a-flood-of-negative-reviews-just-hours-after-its-release/
- Inven Global, 2nd anniversary update (2026-07-30): https://www.invenglobal.com/articles/24322/sword-of-convallaria-marks-2nd-anniversary-with-frozen-path-of-blood-chapter-update
- Steam community discussions, app 2526380 (2024): https://steamcommunity.com/app/2526380/discussions/ (threads 4417550491786146735, 4637113788886162325, 552359157631552107, 4354492594968545742)
- Escapist Magazine review (2024-08): https://www.escapistmagazine.com/sword-of-convallaria-is-the-ff-tactics-successor-gacha-players-have-been-waiting-for-review/
- CGMagazine review (2024): https://www.cgmagonline.com/review/sword-of-convallaria-for-this-world-of-peace/
- Turn Based Lovers review (2024): https://turnbasedlovers.com/review/sword-of-convallaria-review-classic-rpg-tactics-with-a-lot-of-twists/
- Pocket Gamer review (2024): https://www.pocketgamer.com/sword-of-convallaria/review
- GameWith character guides (2024-2025): https://gamewith.net/sword-of-convallaria/ (e.g. /48237, /48241, /48227)
- stmstat Steam stats (retrieved 2026-10): https://stmstat.com/app/2526380
- OpenCritic aggregate: https://opencritic.com/game/17166/sword-of-convallaria

**Pokémon Conquest** [CQ]
- Wikipedia, Pokémon Conquest reception (accessed 2026-10-24): https://en.wikipedia.org/wiki/Pok%C3%A9mon_Conquest
- Kotaku review (2012-06): https://kotaku.com/pokemon-conquest-the-kotaku-review-5919578
- GamesRadar review (2012): https://gamesradar.com/pokemon-conquest-review
- HonestGamers review (2012): https://honestgamers.com/10385/ds/pokmon-conquest/review.html
- Nintendojo review (2012): https://www.nintendojo.com/?p=78563
- Trusted Reviews review (2012): https://www.trustedreviews.com/reviews/pokemon-conquest
- Game Informer, 7/10 (2012-06-19): https://gameinformer.com/games/pokmon_conquest/b/nintendo_ds/archive/2012/06/19/taking-pok-233-mon-from-turn-based-to-tactics
- God is a Geek review (2012-07): https://godisageek.com/2012/07/pokemon-conquest-review/
- Dragonfly Cave review (fan site, 2012): https://www.dragonflycave.com/conquestreview.aspx
- RPGFan review (2012): https://www.rpgfan.com/review/pokemon-conquest/
- GameSpot review (2012; via search summary, direct fetch 403): https://www.gamespot.com/pokemon-conquest/reviews/pokemon-conquest-review-6383552/
- Smogon spotlight article (fan retrospective): https://www.smogon.com/articles/spotlight-pokemon-conquest
- Smogon forums retrospective post: https://www.smogon.com/forums/goto/post?id=8164308
- Bulbagarden thread "any conquest fans here": https://bulbagarden.net/threads/any-conquest-fans-here.299029/
- Bulbagarden thread "Would you like to see another Conquest-style game?": https://bulbagarden.net/threads/would-you-like-to-see-another-conquest-style-game.175438/
- PokeCommunity threads: https://www.pokecommunity.com/threads/pok%C3%A9mon-conquest-needs-more-love.295837/ and https://www.pokecommunity.com/threads/another-pokemon-conquest.291768/
- Dexerto, "Pokémon's best spinoff is still stuck on DS" (2024-03-12): https://www.dexerto.com/pokemon/pokemons-best-spinoff-is-still-stuck-on-ds-2585449/
- Retro XP (Marc Normandin), Top 101 Nintendo games No. 66 (2020-12-09): https://retroxp.substack.com/p/ranking-the-top-101-nintendo-games-689
- Gamer Guides walkthrough (20-turn limit example): https://www.gamerguides.com/pokemon-conquest/guide/the-main-kingdoms/kingdoms-one-to-seventeen
- Lemmy retrospective comment: https://lemmy.ndlug.org/post/1384896/2891943

**Devil Survivor** [DS]
- Metacritic via Wikipedia reception sections (accessed 2026-10-24): https://en.wikipedia.org/wiki/Shin_Megami_Tensei:_Devil_Survivor ; https://en.wikipedia.org/wiki/Shin_Megami_Tensei:_Devil_Survivor_2
- RPGFan review, Devil Survivor (2009): https://www.rpgfan.com/review/shin-megami-tensei-devil-survivor/
- GamesRadar review (2009): https://www.gamesradar.com/shin-megami-tensei-devil-survivor-review/
- Destructoid review (2009): https://www.destructoid.com/destructoid-review-devil-survivor/
- RPGamer reader review (launch-era dissent): https://archive.rpgamer.com/games/megten/devilsurvivor/reviews/devilsurvivorrdrev1.html
- Nintendo World Report, Devil Survivor 2 (2012): https://www.nintendoworldreport.com/review/29508
- Nintendo Life, Record Breaker (2015): https://nintendolife.com/reviews/3ds/shin_megami_tensei_devil_survivor_2_record_breaker
- Game Revolution, Record Breaker (2015): https://www.gamerevolution.com/?p=67694
- GameCritics, Record Breaker (Joshua Tolentino, 2015): https://gamecritics.com/joshua-tolentino/shin-megami-tensei-devil-survivor-2-record-breaker-review/
- Operation Rainfall, Overclocked (2015-04-02): https://operationrainfall.com/2015/04/02/review-shin-megami-tensei-devil-survivor-overclocked/2/
- Inverse retrospective by Jess Reyes (2022-03-27, updated 2024-02-20): https://inverse.com/gaming/devil-survivor-needs-another-sequel
- r/Megaten vent thread on Extra Turn RNG (~2024, via mirror): https://reddit.fabiomanganiello.com/r/Megaten/comments/1gmvu05/minor_megaten_vent (original: reddit.com/r/Megaten/comments/1gmvu05)
- GameSpot user reviews, Overclocked: https://www.gamespot.com/shin-megami-tensei-devil-survivor-overclocked/user-reviews/2200-204335/
- Smogon forums Devil Survivor thread: https://www.smogon.com/forums/goto/post?id=2095608
- Record Breaker DLC coverage: Gematsu (2015-04) https://gematsu.com/2015/04/devil-survivor-2-record-breaker-dlc-schedule-announced ; DualShockers (2015) https://www.dualshockers.com/survive-harder-or-record-breakerer-with-devil-survivor-2-record-breakers-downloadable-content/ ; Megaten Wiki on eShop closure (2023-03-27) https://megatenwiki.com/wiki/Devil_Survivor_2_Record_Breaker

**Brigandine** [BRG]
- RPGFan review, 85/100 (2020-06-25): https://www.rpgfan.com/review/brigandine-the-legend-of-runersia/
- RPG Site review, 8/10 (2020-06-25): https://rpgsite.net/review/9911-brigandine-the-legend-of-runersia-review
- Nintendo Life review, 7/10 (2020-06-26): https://www.nintendolife.com/reviews/switch-eshop/brigandine_the_legend_of_runersia
- OpenCritic aggregate (2020): https://opencritic.com/game/9685/-
- Cubed3 review (2020): https://www.cubed3.com/games/reviews/nintendo-switch/brigandine-the-legend-of-runersia
- But Why Tho review (2020-06): https://butwhytho.net/2020/06/review-brigandine-legend-of-runersia-is-just-an-okay-strategy-game/
- Twinfinite PC review (2022-05): https://twinfinite.net/2022/05/brigandine-the-legend-of-runersia-review-ruling-is-no-easy-feat/
- Matchsticks for my Eyes retrospective (2021-09-11): https://www.matchstickeyes.com/2021/09/11/brigandine-the-legend-of-runersia-an-atmospheric-console-strategy-rpg/
- RPGamer Brigandine (1998) retroview: https://rpgamer.com/review/brigandine-review/
- GameRevolution Brigandine review (1998 original): https://www.gamerevolution.com/review/34227-brigandine-review
- GameSkinny Runersia review (2020): https://www.gameskinny.com/reviews/brigandine-the-legend-of-runersia-review-of-monsters-and-muddles/
- Tech-Gaming Runersia reviews (2020-2022): https://www.tech-gaming.com/brigandine-legend-of-runersia/
- Steam community discussions (2022-2023): https://steamcommunity.com/app/1843940/discussions/0/3409804177169141748 and https://steamcommunity.com/app/1843940/discussions/0/3494256256416747851
- Steam aggregate via Wikipedia/steamdata.ai (c. 2022-2025): https://en.wikipedia.org/wiki/Brigandine:_The_Legend_of_Runersia
- The Obelisk (Substack) retro highlight: https://theobelisk.substack.com/p/retro-game-highlight
- Wikipedia, Brigandine (1998) + Grand Edition changes: https://en.wikipedia.org/wiki/Brigandine_(video_game)
- Turnbased Lovers PC review (2022): https://turnbasedlovers.com/review/brigandine-the-legend-of-runersia-pc-version-review
- Siliconera producer interview: https://www.siliconera.com/brigandine-interview-producer-kazuhiro-igarashi-on-reviving-a-ps1-strategy-gem/
- Brigandine Abyss announcement (2026-02; Gematsu/Push Square): https://www.gematsu.com/2026/02/brigandine-abyss-announced-for-ps5-xbox-series-switch-2-and-pc
- Ludonautas (Spanish) retro analysis: https://ludonautas.substack.com/p/retroanalisis-brigandine-the-legend

**AP vs move + act** [AP]
- RPG Codex DOS2 review (2017): https://rpgcodex.net/article.php?id=10848
- GameBanshee DOS2 review (2017): https://gamebanshee.com/kdc43
- PC Gamer DOS2 review (2017-09): https://pcgamer.com/divinity-original-sin-2-review
- Checkpoint Gaming DOS2 review (2017-10): https://checkpointgaming.net/reviews/2017/10/divinity-original-sin-2-benchmark-crpg/
- Steam DOS2 forum threads (2017-2020): https://steamcommunity.com/app/435150/discussions/0/3056238885201838997 and https://steamcommunity.com/app/435150/discussions/0/1483232961050709584
- Steam BG3 forums (2020-2023): https://steamcommunity.com/app/1086940/discussions/0/3812913197994293751 and https://steamcommunity.com/app/1086940/discussions/0/6045572598936473034
- r/BaldursGate3 Feedback Friday via teddit mirror (2020-10): https://teddit.bsalzberg.com/r/BaldursGate3/comments/jgp3hc/feedback_friday/g9tcmjf
- PC Gamer, BG3 simultaneous turn-based combat (2023): https://www.pcgamer.com/baldurs-gate-3s-simultaneous-turn-based-combat-is-a-blessing-for-multiplayer/
- esports.net BG3 vs Divinity comparison: https://www.esports.net/news/dnd/baldurs-gate-3-vs-divinity
- Digital Trends Into the Breach review (2018-02): https://digitaltrends.com/gaming/into-the-breach-review
- Destructoid Into the Breach review (2018-02): https://www.destructoid.com/reviews/review-into-the-breach/
- Prototypr, Into the Breach UX (2018): https://blog.prototypr.io/into-the-breachs-ux-makes-you-feel-smart-a9cb03210757
- Mario+Rabbids Kingdom Battle reviews (2017-08): GameCritics https://gamecritics.com/brad-gallaway/mario-rabbids-kingdom-battle-review/ ; TheSixthAxis https://www.thesixthaxis.com/2017/08/28/mario-rabbids-kingdom-battle-review/ ; NintendoLife https://nintendolife.com/reviews/nintendo-switch/mario_plus_rabbids_kingdom_battle
- Mario+Rabbids Sparks of Hope reviews (2022-10): RPGFan https://www.rpgfan.com/review/mario-rabbids-sparks-of-hope/ ; TheSixthAxis https://www.thesixthaxis.com/2022/10/17/mario-rabbids-sparks-of-hope-review/ ; Empire https://empireonline.com/gaming/reviews/mario-rabbids-sparks-of-hope
- Jake Solomon on dropping Time Units (2012): GamingBolt https://gamingbolt.com/aftermath-xcom-enemy-unknown-interview-with-jake-solomon ; GameBanshee roundup https://gamebanshee.com/ddq
- RPG Codex, Julian Gollop Phoenix Point interview (2017): https://rpgcodex.net/article.php?id=10618
- Can I Play That, Fire Emblem Three Houses accessibility review (2019): https://caniplaythat.com/games/fire-emblem-three-houses/
- Shacknews FE3H review (2019-07): https://shacknews.com/article/113034/fire-emblem-three-houses-review-back-to-school
- GOG forum Fallout 1/2 combat threads (2009-2010s): https://www.gog.com/forum/fallout_series/does_anyone_like_the_combat_in_this_game ; HonestGamers Fallout review: https://www.honestgamers.com/9813/pc/fallout/review.html
- RPGamer archived FFTA reader reviews (2003-2004): https://archive.rpgamer.com/games/ff/ffta/reviews/fftastrev3.html ; HonestGamers FFTA review: https://www.honestgamers.com/5362/game-boy-advance/finalefantasyetacticseadvance/review.html
- Wakfu wiki Combat/AP pages + Method Wakfu turn-timer guide (accessed 2026-10): https://wakfu.wiki.gg/wiki/Combat ; https://methodwakfu.com/en/getting-started/general-information/
- Steam Wakfu forum Dofus-vs-Wakfu comparison thread (app 215080): https://steamcommunity.com/app/215080/discussions/1/7439433895938079156
- Dofus Arena mechanics (Wikipedia): https://en.wikipedia.org/wiki/Dofus_Arena
- Board-game design literature on AP and analysis paralysis: https://islaythedragon.com/guides/where-the-actions-at-a-guide-to-action-point-allowance/ ; https://www.leagueofgamemakers.com/designing-games-to-prevent-analysis-paralysis-part-2 ; https://www.bgdf.com/forum/archive/archive-game-creation/game-design/analysis-paralysis-movement
- Steam Chains of Freedom turn-timer sentiment thread (2025): https://steamcommunity.com/app/2994010/discussions/0/509578026046991482
- Report caveat: English-language Dofus/Wakfu timer sentiment was thin; timer like/dislike is inferred from adjacent titles (Atlantica, Chains of Freedom) and Steam comparison threads.
