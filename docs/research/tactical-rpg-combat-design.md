---
title: Tactical RPG combat design — grid battles, turn order, action economy & monster-collector hybrids
slug: tactical-rpg-combat-design
domain: gameplay
tags: [tactical-rpg, grid-combat, turn-order, action-points, aoe-targeting, positioning, ui-patterns, monster-recruiting, pvp-timers, enemy-ai]
status: active
updated: 2026-10-24
confidence: medium
sources: 82
supersedes:
abstract: "Tile-tactics combat design: FFTA, Triangle Strategy, Sword of Convallaria + canon; AP/turn order, AoE, recruiting, PvP."
---
## Scope
A **project-agnostic** reference on how grid/tile-based tactical RPG combat is built, anchored on
three games — **Final Fantasy Tactics Advance (FFTA)**, **TRIANGLE STRATEGY (TS)** and **Sword of
Convallaria (SoC**, a free-to-play title that launched on Steam and mobile in 2024 [25], with an
energy system that gates grinding [21]) — plus genre canon where instructive (Final Fantasy Tactics,
Tactics Ogre, Fire Emblem, Into the Breach, XCOM, Dofus/Wakfu, Disgaea, Devil Survivor, Pokémon
Conquest, Dragon Quest Monsters, Mewgenics). It covers map structure, turn order, action economy,
targeting/AoE, squad size, positioning, UI, AI, monster-collection fusion (incl. recruiting
mid-battle), fun-vs-tedium, and synchronous PvP.

**Assumptions (state them, I cannot see the reader's stack):** square tile grid; a
server-authoritative online game; a creature-roster fantasy; small squads (1–3 per side) as a
design target; the reader may be adapting a 1v1 creature battler. Pairs with
[[monster-taming-mechanics]], [[console-style-game-controls]], [[netcode-authoritative-multiplayer]],
[[deterministic-simulation-architecture]], [[online-game-security-anticheat]],
[[matchmaking-and-rating-systems]].

**Evidence quality.** Wikipedia, official/publisher pages and reviews were read directly. Fandom
wikis, GameFAQs and StrategyWiki returned 402/403, so claims marked *(secondary)* come from
search-result summaries of those pages and were not independently confirmed. Numbers (damage
multipliers, formulas) are mostly *not* published by the anchor games; where I found none I say so
rather than invent one. `[n]` = numbered source below.

## Key findings
- **No anchor game uses a shared per-turn AP pool.** FFTA, TS and SoC are all *move + one action* with a
  side resource: FFTA MP that starts at zero and regenerates each turn [1]; TS per-unit TP (one review:
  start 3, +1 per turn) [15]; SoC per-skill NRG + cooldowns and a team-level TP for commander
  "talents" [20]. True AP/MP pools (6 AP / 3 MP; 100 AP; 4 AP) are the Dofus/Wakfu/Divinity/MENACE
  lineage [50][47][48]. An "FFTA/SoC feel + AP economy" is a deliberate hybrid, not a copy of either.
- **Turn order comes in three families:** per-unit clocks (FFT charge-time, Tactics Ogre wait-turn, TS
  action-time) [9][26][15]; round-based speed ordering (SoC: everyone acts once per round in SPD order)
  [20]; and team-alternating phases (Fire Emblem, Into the Breach) [31][42]. Clock systems add a
  *timing* layer (act-order manipulation) at the cost of readability and swinginess [62].
- **Positioning is rewarded with flat, legible modifiers**, not simulation: back attack = guaranteed
  critical (TS) [17], rear/side bonus (SoC) [24], +20% side / +40% back (Dofus Arena) [52], high ground =
  more damage and/or range (TS, SoC) [17][23]. Exact multipliers are mostly unpublished.
- **Small squads are the modern norm for tight tactics:** 3 mechs on 8×8 (Into the Breach) [42], 4 on
  8×6 (Fire Emblem Heroes) [35], 4 cats on 10×10 (Mewgenics) [55][56], human + 2 demons per team (Devil
  Survivor) [71]; XCOM cut 10+ soldiers to 4 specifically to shorten turns [45]. FFTA fields up to 6 [3][4].
- **Premise check on FFTA "monster units":** FFTA monsters are *captured* by a Hunter (chance ≈
  25 × missing-HP%, capped near 25%, *secondary*) [7] and *raised* in a Monster Bank by feeding [6]; community
  answers say they are not deployed as party members — a Morph job borrows their abilities
  *(secondary, conflicting)* [11]. Monsters-as-deployable-units is better precedented by Pokémon Conquest,
  Devil Survivor, Brigandine, Disgaea and Mewgenics [66][71][76][70][55].
- **Recruit-during-battle has a stable recipe:** soften the target (low HP), be adjacent or in short range,
  roll a *displayed* percentage, and pay an action; failure often has a cost (anger, lost units)
  [29][10][33][72][70]. Pokémon Conquest's "link" recruiting happens *outside* battle [66][68].
- **Type charts alone make tactics shallow:** Conquest reviewers found they "stock up on potions and place
  the right type of Pokémon within attacking range"; maneuvering mattered little [69]. FFTA reviewers say
  facing/placement/terrain barely matter and the game is easy [5]. Positional levers must be designed in.
- **Tedium comes from length, enemy-phase waiting, animation and UI friction**, not from depth: FFTA battles
  run 10 minutes to an hour+ [5]; TS late battles >1 hour, failed attempts ~30 min (anecdote) [18]; enemy
  phases with many units are a standard complaint [64]; Conquest's re-select-the-square attack flow [68].
- **Undo is a spectrum:** free move-undo before commit, limited full-turn reset (Into the Breach) [44],
  unlimited within-turn rewind (Tactical Breach Wizards) [46], limited multi-turn rewind (Fire Emblem,
  Tactics Ogre, SoC ×3) [32][28][20]. Rewinds generally keep RNG outcomes to defeat save-scumming [32][28].
- **AI is mostly a small set of stances** (charge, attack-in-range, guard, delayed-charge) combined into
  formations [36], backed by threat-range display and telegraphing rather than cleverness [42][61].
- **Synchronous tactical PvP options:** side-alternating with a per-side clock; per-unit initiative queue with
  a per-turn cap (Wakfu: 30 s) [50]; simultaneous plan→commit→resolve (Frozen Synapse) [77]; or
  asynchronous AI-controlled defense teams (Fire Emblem Heroes Arena) [37].
- **Sword of Convallaria turn-order reports conflict** (SPD order per round [20][19] vs "all your units, then
  the opponent's" [22]); verify in-game before copying either.

## Concrete examples & references

### Anchor games at a glance
| Game | Squad / side | Turn order | Per-unit action model | Notable layers |
|---|---|---|---|---|
| FFTA | up to 6 [3][4] | Speed/Agility-ordered [2][3] (queue algorithm not verified) | move + act (+ wait), facing chosen at end [1][5] | MP starts 0, regens [1]; Judge/Law system, JP → combos/summons [1][8] |
| TRIANGLE STRATEGY | one review: ~10 deployed [15]; encyclopedia silent [12] | action-time by Speed on an AT bar [15][17]; waiting −20% to next turn [13] | move once (before *or* after) + act [16] | per-unit TP [12][15]; Kudos → one-use-per-battle Quietus [12][16]; height, back crit, follow-up [17] |
| SoC | varies by stage, no fixed cap documented [19][20] | round-based; SPD order; every living unit acts once per round [20] | move then attack/skill; attack ends turn; "Instant" skills exempt [20] | NRG + cooldowns; team TP talents; role triangle; HP-state modifiers [20][19] |
| Tactics Ogre | 10 on field / 30 in army (1995) [26] | wait-turn clock; weight + agility [26][27] | move + act; actions delay next turn [28] | Chariot rewind [27]; Persuade recruit [26] |
| Fire Emblem | n/a | side phases (Player → Enemy → …) [31] | move + act, weapon triangle [30][34] | permadeath / Casual / Phoenix [30]; Talk recruit [33] |
| Into the Breach | 3 mechs, 8×8 [42] | enemy intents telegraphed; player moves every mech; fixed turn limit [42] | move + fire one weapon [42] | perfect information; pushes; short battles by intent [42] |
| XCOM | 4 (to 6) [45] | — | two actions per unit (move/shoot/ability) [45] | cover; shoot-first forfeits second action [45] |
| Dofus / Wakfu | group; Arena teams 2–6 [52] | initiative queue, 30 s turn [50] | 6 AP + 3 MP per turn [50] | LoS, height, push into walls [50] |
| Pokémon Conquest | 6 warriors × 1 Pokémon [67] | warriors act once per turn [68] | each Pokémon has one move [66] | link % replaces levels; once-per-battle warrior power [66] |
| Devil Survivor | team = human + 2 demons [71] | turn-cost timeline; extra round on weakness/crit [71] | move + act [71] | demons via auction/fusion [71] |
| Mewgenics | 4 cats [55] | not verified | a move + an active ability [55] | 10×10 board; breeding [55][56] |

### Battle-map structure
- **Grid type.** Square grids dominate; Untamed Tactics chose squares over hexes — more rigid targeting
  patterns but easier to design and to predict player movement [59]. Battle Isle is the hex precedent [40].
- **Sizes.** Into the Breach 8×8 [42]; Fire Emblem Heroes 8 tall × 6 wide, "designed to fit entirely in the
  screen sizes of mobile devices" [35]; Mewgenics 10×10 [56]; Wakfu "chessboard-style" with obstacles and
  height [50]. TS/SoC sizes are not published in the sources I could read.
- **Movement allowance vs map.** Practitioner guidance: Move 1–2 makes openings boring (wargame territory);
  3 is fine but sluggish if >8 squares to cover; 4 is comfortable (battles joined in ≤2 turns); 5+ makes
  flanking trivial and AoE weaker [58]. SoC: typical Move 3, "Seeker" role 5, Jump 2; a ±2 height step costs an
  extra move point [20].
- **Elevation.** SoC: highland attack boost, ranged stronger from high ground, fall damage scales with
  distance, some units/skills bypass height [23][24][19][20]. TS: higher ground raises damage and range,
  some attacks have height limits [17]. Tactics Ogre: height accuracy stacks with archer skills → archers
  "rarely miss" (a balance complaint) [28]. FFTA: elevation is little more than a cap on attacks across big
  differences (per one review) [5]. Wakfu: very high obstacles block line of sight, low ones only block
  movement [50].
- **Terrain costs/effects.** SoC burning (damage over time) and frozen (slows) tiles [19]; TS fire, ice that
  slows and lowers accuracy, lightning chaining through water [13]; Advance Wars terrain changes movement,
  vision and defense [41]; Disgaea colour-coded Geo Panels apply field effects [70]; Battle Brothers charges
  AP and fatigue per tile by terrain *(secondary)* [54].
- **Obstacles, cover, interactables.** XCOM cover raises evasion and became necessary once maps were fixed
  [45]; SoC explosive barrels (radius), rolling boulders (straight line), knock-into-water hazards [24];
  Into the Breach makes buildings the thing to protect [42].
- **Objectives beyond "kill all".** SoC: defeat all, defeat target, escort, escape, hold N rounds [23];
  Conquest: collect flags [67]; Into the Breach: fixed turn limit + protect infrastructure [42].
- **Deployment.** SoC fixes roster and placement before the fight [19]; Wakfu has a 60 s placement phase
  that ends early when all are ready [50].

### Turn order systems
- **Per-unit clocks.** FFT: CT += Speed each tick, act at 100 [9]. Tactics Ogre: Wait-Turn points shift with
  actions taken, weight and agility [26][27]; a unit that only attacks acts sooner than one that moved first [28].
  TS: "the greater a character's speed – the more often they can move" [15]; AT bar, and a button press shows
  each unit's turn number [17]; hovering an enemy shows its order [14]. Dragon Quest Tact: speed decides turn
  *(secondary)* [75]. Devil Survivor: each action has a Turn Cost that places the unit on a timeline [71].
- **Act-order manipulation levers.** Waiting (no move, no command) cuts time-to-next-turn by 20% in TS [13];
  Urtuk's timeline adds speed penalties, a SLOWED state (attacks against it crit) and EXHAUSTED (no
  reactions) [62]; Devil Survivor grants an extra round for a crit/weakness [71]. Pro: timing becomes tactics.
  Con: outcomes hinge on gauge-tracking; penalties can delete an enemy's responses [62].
- **Round-based speed order.** SoC: round starts ordered by SPD, ends when all living units have acted [20].
  Untamed Tactics recalculates order each round from Speed — fixed order is easy to plan but repetitive;
  recalculated lets status effects shift order and makes rounds feel different [59].
- **Team-alternating.** Fire Emblem phases: players may take unlimited time "except in some multiplayer
  modes" [31]; Advance Wars alternates sides [41]; Into the Breach telegraphs enemy intents, then the player
  moves every mech [42]. Fallout Tactics ships Continuous, Individual and Squad turn-based *modes*,
  showing the choice is orthogonal to the rest of the rules [39].
- **FFTA's order** is Agility/Speed-based [2][3]; TASVideos calls Speed "the single most important stat"
  [3]. I did not verify the queue algorithm.

### Action economy
- **Spine: move + act.** SoC: move, then attack/skill; attacking ends the turn [20]. TS: move once, either
  before or after acting [16]. FFTA: move/act/wait [1].
- **Two-action.** XCOM replaced per-unit time units with two actions so moving never feels like wasting a
  shot; shooting first forfeits the second [45].
- **True AP/MP pools.** Wakfu: 6 AP + 3 MP per turn, unused lost; a third, non-refreshing "WP" resource [50].
  Dofus: spells cost AP, movement costs MP, and each turn is time-limited [51]. Divinity Original Sin 2: 4 AP
  baseline, move/attack/items/skills all cost AP, unspent AP can carry *(secondary)* [48]; its director said
  AP was *reduced* during development to favor tactics *(secondary)* [49]. MENACE: 100 AP/unit, standard
  weapon 40, heavy 60 so it fits once per turn [47]. Dofus caps casts per turn and casts per target per
  spell, plus cooldowns *(secondary)* [53].
- **Side resources.** FFTA MP (starts 0) [1]; TS TP (spent on abilities; one review says mages/healers are
  nearly useless without it) [15]; SoC NRG (+1 at end of each unit's turn), skill cooldowns (example: 2 NRG,
  2-turn cooldown), up to 3 skills, per-round-limited reaction skills [20].
- **Cost-curve levers (synthesis).** A small AP total (4–6) cannot support many distinct cost tiers, so:
  (a) fix one heavy tier that consumes most of the turn (MENACE 60/100) [47]; (b) cap repeats per
  turn/per target [53]; (c) put the strong effect on a cooldown (SoC) [20]; (d) make the strongest effect a
  once-per-battle command (TS Quietus, Conquest warrior powers) [12][66].
- **Snowball/comeback levers.** SoC HP states: Injured (≤70%) −20% dealt / +20% taken; Dying (≤30%) −30% / +30%
  [19]. Rewarding positioning with a resource (SoC/TS TP, Kudos) steers play toward flanks and height [15][21].

### Targeting: range, origin, target tile, AoE
- **Separate the concepts.** Mewgenics' data model is the clearest public example: *range* (who can be
  chosen) and *area* (what is hit) are independent 0–20 scales; area center "isn't always the user's tile";
  shapes: diamond (Manhattan), circle, square, line, straight-shot (stops at first unit), cross, diagonal
  cross, 8-cross, perpendicular line, cone (grows one tile per side per step), all, custom; targeting
  modes: tile, 4-dir, 8-dir, random, none [56].
- **Line of sight / first-hit.** Units block the area behind them in a cone; linear effects stop at the nearest
  target [56]; Wakfu: tall obstacles block LoS [50].
- **Friendly fire as a filter.** Mewgenics lets each effect include/exclude allies, the caster or "others" [56];
  SoC barrel blasts and TS water-lightning hit whoever is in the area [24][13].
- **Per-species shapes.** Pokémon Conquest gives each species exactly one move; it hits one or many squares,
  adjacent or 1–2 away, some in patterns (a five-pronged Fire Blast) [66][68]; movement type differs (fliers
  cross obstacles) [67].
- **Distance metric must match movement.** Manhattan suits 4-way movement; Chebyshev treats all 8 steps as
  equal *(secondary)* [63]; Mewgenics uses Manhattan for both movement and the default area [56].
- **Class-based reach.** SoC melee tanks must close; rangers/priests have far more range [22]; Conquest
  warriors command while Pokémon move and fight [66][67].

### Squad sizing and pacing
- **Observed sizes:** see the tables. Smaller squads shorten turns and give designers a fixed constraint for
  map/enemy design (XCOM) [45]; Into the Breach paired 3 units with telegraphed enemies and a turn limit with
  the stated aim of battles "much shorter" than XCOM's [42].
- **Counter-point:** reviewers of FFT found the small scale limited how many characters could fight [9].
- **Roles carry the load when squads are tiny:** SoC role triangle (Breaker > Defender > Seeker > Breaker;
  Watcher > Destroyer) [23]; Fire Emblem's weapon triangle and colour triangle [34][35]; Conquest type
  matchups [66].
- **Team-building budgets for fairness:** Dofus Arena capped a team's total "value" at 6,000 kama across
  fighters, spells and gear [52].
- **Pacing arithmetic (inference, not sourced):** unit-turns per round = units per side × 2; FFTA's enemy
  turns took ~12–18 s of real time in a speedrun [4]. A 3v3 for 8 rounds is ~48 unit-turns — at 15 s avg ≈ 12 min,
  at a 30 s cap up to 24 min. Hence 2v2–3v3, tight caps, banked clocks and animation skip for an online queue.

### Positioning depth
- **Facing.** FFTA2: units "move, face one of four directions, and attack" [2]; FFTA assigns movement, action
  and facing each turn [5]. TS back attack = guaranteed crit, with a mark/icon when available; advice: avoid
  it in early turns because moving behind enemies exposes you [17][14]. SoC: rear/side bonus [24]; the "Block"
  trait works only vs front/side attacks, 50% [20]. Dofus Arena: +20% side, +40% back [52]. Untamed Tactics
  dropped facing because art is front-only [59].
- **Flank/follow-up.** TS: a second attack from an ally on the opposite side (weaker) [15][17]; positioning feats
  earn Kudos [12]; SoC TP comes from high ground, flanking and interrupting (one review) [21].
- **Zone of control.** ZOC types: rigid (stop on entry), semi-rigid, fluid/elastic (extra cost), locking
  (cannot leave) [57]; some rulesets force attacks on adjacent enemies [57]. I found no documented ZOC in
  the anchor games; their substitutes are threat-range display and counters [19][20]. Conquest lets an enemy
  strike first when you enter its attack area [67].
- **Knockback.** SoC: pits/water, fall damage by height, collision damage with walls or units [19][20]; Into the
  Breach uses pushes as a core verb [42]; Wakfu: push into the border wall damages [50].
- **Combos/combined arms.** FFTA JP-funded combos with nearby allies [1]; TS follow-ups [15].

### UI patterns
- **Tile cursor + overlays.** TS: blue = move range outside enemy reach, purple = move range inside enemy
  reach, red lines = who can hit the selected unit, red panels = your attack range, yellow = AoE [17]. SoC: blue move,
  red max attack, purple danger zone (shows only *basic-attack* max range, so skills can still reach
  you) [19].
- **Turn-order display.** TS AT bar + button-press turn numbers + hover shows an enemy's order [14][17];
  SoC numbered markers + role diagram [20][23]; Dragon Quest Tact shows a profile strip *(secondary)* [75].
  Flaw: TS's initiative list recenters on selection and can cover nearby enemies when zoomed [15][16].
- **Forecast / preview.** SoC prediction window: damage, type advantage, counter-attack damage, red cross =
  lethal [20]. TS demo feedback added: compare est. damage/accuracy when switching commands, "Simulation
  Mode" for out-of-range targets, destination preview for movement abilities, back-attack icon, buff/debuff
  duration display, per-turn auto-save and retry [14].
- **Action menus.** Conquest friction: attack requires select-then-re-select the target square, "Fight"
  shows when nothing is reachable, unexplained 1–2 s delays [68]. Show only legal options; one input to
  attack an in-range target (inference).
- **Readability.** TS overloads yellow (facing *and* attack preview) and has an unclear facing arrow — a
  problem because facing is central [16]; use shape + colour (TS does for colour-blind players) [15]. Keep a
  hit-chance honest: perceived fairness matters more than statistical accuracy [59].
- **Undo conventions.** Free move-undo until an action commits; attacks lock in (Into the Breach) [44]; a
  limited whole-turn reset (once per battle; counts vary by source) [44]; unlimited within-turn rewind but no
  earlier-turn rewind (Tactical Breach Wizards) [46]; Fire Emblem: Echoes 3–12 charges, Three Houses 50 turns / 3–13
  charges, Engage unlimited on Normal and 10/map on Hard, rewinds don't re-roll RNG [32]; Tactics Ogre
  Chariot up to 50 turns, same action replays same rolls [28]; SoC Backtrack ×3 per battle [20]; Persona 5
  Tactica undoes the previous turn *(secondary)* [65]. Fire Emblem's older games had permadeath [30] and
  no rewind, which later entries added [32].
- **Input.** Cursor memory and D-pad grid navigation: see [[console-style-game-controls]].

### Difficulty and AI basics
- **Stances (Fire Emblem GBA modding guide, community).** *Charge* (rush from anywhere), *attack-in-range*
  (hold until a target enters weapon range), *guard tile* (never moves; point-holders and long-range
  fixtures), *attack-in-2-range* (charge when a target is within twice move range), *linked group* (bait one,
  the group charges — not vanilla), *escape/anti-turtle* objectives. Overusing charge degenerates to "mashing
  End Turn at chokepoints"; overusing attack-in-range yields bait-and-switch. Rule of thumb: starting
  enemies ≈ 2–3× player units; add breather turns [36].
- **Telegraph over cleverness.** Into the Breach shows each enemy's intended attack direction, movement
  range and health; telegraphing was meant to speed play [42]. Telegraph/readability principles generalize
  (players can only plan around threats they can read) [61].
- **Threat-range tools** are standard UI for AI legibility (SoC threat range/danger zone; TS red lines) [19][17].
- **Exploitable AI is normal in PvE-as-PvP.** Fire Emblem Heroes Arena defense teams are run by a
  deterministic AI that players learn to exploit *(secondary)* [37]; a research prototype has AI imitate the
  player to stay unpredictable [38].
- **Difficulty knobs seen in the wild:** TS Easy/Hard battle difficulty + battle retry [14]; Fire Emblem Casual
  and Phoenix modes [30]; TS retreat keeps XP/Kudos but forfeits loot [16]; win-condition variety [23];
  SoC auto-combat is weak at escort/protect [20]. FFTA reviewers call it easy [5].
- **Hidden information:** keep it low — too much feels random, too little is fully calculable [59].

### Monster collection × tactics
**Architectures.**
- *Trainer-commands-creature:* Pokémon Conquest (warrior + one Pokémon; "link" % replaces XP and scales
  stats; one-use warrior power; defeated warriors can join) [66][67]; Brigandine (a knight leads monsters;
  dead monsters revivable by item) [76]; Devil Survivor (human + 2 demons per team; demons from auction or
  fusion) [71].
- *Creature-as-unit:* Mewgenics (cat roster + breeding; move + ability on a grid) [55]; Disgaea (humanoids
  and monsters share the grid; throwing units around) [70]; Dragon Quest Tact (army of monsters; new allies
  come from a Scout screen using tickets and gems [73], described as gacha pulls [75], not in-battle).
- *Capture-and-store:* FFTA (Hunter Capture → Monster Bank; affection must reach 100 before stats can be
  raised by feeding; all monsters Speed 100) [7][6].

**Recruit-in-battle mechanics (compare).**
| Title | Trigger | Reach | Chance | Cost / risk |
|---|---|---|---|---|
| FFT Entice (Orator) | skill | range 3 (H3/V3) [10] | not listed | target fights for you during battle, joins after; separate *Tame* for critically wounded creatures [10] |
| FFTA Capture (Hunter) | skill | not verified | ≈25 × missing-HP%, cap ≈25% *(secondary)* [7] | not last enemy/boss *(secondary)* [7]; status effects don't help [6] |
| Tactics Ogre Subdue/Tame | Beast Tamer skill | adjacent (guide) [29] | ≈25% [29] | kill the rest first; same tile = same result [29] |
| Fire Emblem Talk | command | adjacent; eligible tile highlighted [33] | deterministic [33] | right speaker / right phase required [33] |
| DQ Monsters scouting | "show of force" | n/a | % shown; depends on offense/wisdom [72] | failure can anger the target (no retries) [72] |
| Disgaea capture | throw into base panel | positional | "several factors" [70] | failure kills units inside the panel [70] |
| Conquest link | minigame, outside battle | world map [66][68] | cap per warrior/species (as low as 28%) [68] | no trading, so poor pairs stick [68] |

**Lessons.**
- **Make recruiting a tactical action.** Every battle-recruit above consumes position, an action and
  setup (soften, isolate) — which is what separates it from a menu roll [29][10][33].
- **Show the odds** (DQM, forecast panels) and give failure a legible cost [72][70].
- **Type matchups plus a grid is not enough.** Conquest was praised for faithful capture/evolution but
  criticized for shallow tactics [69]; its luck pain points were 75%-accurate fixed moves and 50% dodge
  abilities [68]. Per-species *shape, reach and movement type* are the identity lever [66][68].
- **Individuality, raising and evolution** still apply — see [[monster-taming-mechanics]].

### What makes tactical combat fun vs tedious
- **Fun:** environmental kills and lining up hazards, rewarded positioning, boss fights, meaningful approach
  choices, flexible failure (retreat/retry) [21][16][14]; telegraphed perfect-information puzzles [42];
  small squads that keep turns short [45].
- **Tedious:** overlong battles [5][18]; enemy phases with many units [64]; escort missions and
  too many overlapping systems [21]; UI friction [16][68]; repetitive narrated summaries (TS) [15];
  a dominant ranged build [28]; abilities that all equal the basic attack [5].
- **Scope discipline.** Into the Breach's team cut roughly 60% of its planned systems and shipped the grid
  combat core alone as the whole game [43].
- **Heuristics.** "On each turn the player should have to make a non-arbitrary decision"; one action per
  unit keeps rounds short [60]. A folk rule — fun ≈ meaningful decisions ÷ time — is unsourced. Turn-based
  play lets players think at their own pace and is more accessible [59].
- **Time sinks to budget:** animation length (offer speed/skip), camera control, confirmation prompts
  (inference).

### Multiplayer / PvP for synchronous tactical battles
- **Timers in practice.** Wakfu: 30 s per character turn, 60 s placement, initiative queue; solo disconnect =
  surrender, team KO'd player is removed after 3 turns and may reconnect; optional per-fight "speed bonus"
  every 3 turns [50]. Idle handling precedents: auto-pass (Ultima III) and per-move limits [79].
- **Clock models.** Sudden death, Fischer increment (add time per move), Bronstein delay, byo-yomi, hourglass
  [80]. For multi-unit sides a *banked* side clock + small per-turn increment bounds total match length
  (inference).
- **Simultaneous variants.** Frozen Synapse: unlimited planning, commit, ~5 s deterministic resolution,
  prediction tools, asynchronous, only 1v1 confirmed [77]; WEGO (Combat Mission) executes both order sets
  together [40]; Phantom Brigade resolves few-second segments (single-player) [78]. Simultaneous
  removes first-mover advantage but needs a conflict-ordering rule (inference).
- **First-mover compensation.** Going first is usually an advantage; mitigations include extra resources for
  the second player or restricting the first turn *(secondary)* [81]; split-phase turns where the second
  player acts after seeing the first *(secondary)* [82].
- **Asynchronous PvP.** Fire Emblem Heroes: a squad of up to 4 on 8×6 [35]; Arena opponents are AI-run
  defense teams *(secondary)* [37] — no waiting, no AFK. Dragon Quest Tact later added a "Real-time Match"
  feature, but the release notes I could read publish no rules [74].
- **Fairness & economy.** Dofus Arena: team-value budget, initiative, Elo ladder; the project never shipped
  officially and shut down in 2014 [52]. See [[matchmaking-and-rating-systems]]; autoscaling/pick-ban in
  [[monster-taming-mechanics]]. Waiting while others act is itself a noted multiplayer drag [79].

## Design implications & transferable principles
*(Synthesis. Items without a citation are my inference; treat as hypotheses to playtest.)*
1. **Decide what positioning will decide before choosing numbers.** A type chart + grid yields "bring the
   right type" play [69]. Give every battle ≥3 positional levers (facing, height, hazards/knockback,
   shaped AoE, range blocking) and give species distinct *shapes and reach*, not just stats [66][68].
2. **Pick the action model on purpose.** For 1–3 units per side, per-unit decision richness must rise.
   Cheapest path: *move + one action* spine (FFTA/SoC/TS) plus one side resource with cooldowns and a
   per-battle command. Choose an AP/MP pool (Wakfu-style 6/3) only if you want variable-cost
   multi-action turns; if you do, fix 1–2 heavy tiers and cap per-turn/per-target repeats [47][53][50].
3. **Turn order:** per-unit clocks give act-order tactics but demand a legible order bar (hover turn
   numbers, projected order after the planned action) [17][14]; round-based speed order is the simplest
   interleave [20]; side-alternating is simplest to timer and to wait through. For online PvP the
   alternating side-clock is the lowest-friction default; a round-based interleave is fine at ≤3v3.
4. **Make ranges/shapes data.** One shared function — origin, range metric, target mode, shape, LoS,
   friendly-fire filter — used by both the authoritative validator and the client highlighter [56]. Match the
   metric to movement (Manhattan for 4-way) [63]. Never trust client-sent target sets; recompute server-side
   ([[online-game-security-anticheat]], [[deterministic-simulation-architecture]]).
5. **Squad/board scale:** 3 per side on ~8×8 or smaller, Move 3–4 [42][58], keeps fights joinable in ~2
   turns and short; scale squads *down* before animations *up* [45]. Budget total match time explicitly
   (see arithmetic above).
6. **Recruit-in-battle as a PvE verb:** low-HP gate + adjacency/short range + displayed percentage + an
   action cost + a visible failure cost; one recruit attempt per target per turn to deny spam [29][10][72].
   Never allow recruiting in PvP.
7. **Displayed-odds policy:** show hit/recruit chances and lethal markers; accept that perceived fairness beats
   statistical purity; avoid fixed low-accuracy species moves with no alternative [59][68].
8. **UI must-haves:** tile cursor with memory; blue move / red attack / purple danger overlays; turn-order bar;
   forecast panel with counter damage and lethal marker; destination preview for displacement; facing
   indicator in its own visual channel (don't overload one colour) [17][20][14][16].
9. **Undo policy:** PvE — free move-undo before commit plus a small rewind allowance that preserves RNG
   [44][32][28]. PvP — no rewind; commits are final (mirrors server authority).
10. **AI:** a handful of stances + threat-range display + telegraphed intents; use enemy count/level and
    objectives (escort, hold, escape) for difficulty rather than hidden bonuses [36][42][23].
11. **Pacing guardrails:** per-turn cap + banked side clock; AFK = auto-pass then forfeit; animation
    skip/speed; fast enemy phases [79][80][64].
12. **PvP formats to consider, easiest first:** asynchronous AI-defense teams [37]; side-alternating sync
    with banked clock [31][80]; per-unit initiative queue with a per-turn cap [50]; simultaneous
    plan-commit-resolve [77] (needs deterministic resolution order).
13. **Content as data.** Skills (cost, cooldown, range, shape, filters), maps (heights, costs, objects),
    and species behaviors should be validated data, so balance passes are content edits
    ([[game-content-pipelines]]).

## Open questions
- Which action model fits: move+act with a side resource, or a true AP/MP pool? (Both defensible; AP raises
  decision count per unit but needs cost-curve tuning.)
- Per-unit initiative queue vs side-alternating for online PvP — waiting experience vs tactical depth.
- Exact damage multipliers for back/height in TS and SoC are unpublished in my sources; measure in-game if
  they must be matched.
- FFTA: do captured monsters ever deploy as units, or only via Morph? Capture range and the queue algorithm
  were not confirmed (fandom wikis blocked).
- SoC: confirm round vs side-alternating order, squad cap per stage, and TP gain rule (sources differ:
  +~3 per friendly turn end [20] vs earned by positioning feats [21]).
- Recruit odds and caps that feel fair in PvE without trivializing rarity; interaction with a roster cap.
- Acceptable target match length for an online queue (hypothesis: a few minutes) — unmeasured.

## Sources
**FFTA / FFT**
1. https://en.wikipedia.org/wiki/Final_Fantasy_Tactics_Advance
2. https://en.wikipedia.org/wiki/Final_Fantasy_Tactics_A2:_Grimoire_of_the_Rift
3. https://tasvideos.org/5620S
4. https://tasvideos.org/Forum/Posts/457120
5. https://www.nintendoworldreport.com/review/4138
6. https://tirodvd.wordpress.com/2018/07/21/ffta-monster-bank-ez-feeding/
7. https://finalfantasy.fandom.com/wiki/Hunter_(Tactics_Advance) (secondary — search summary)
8. https://finalfantasy.fandom.com/wiki/Law_system_(Tactics_Advance) (secondary — search summary)
9. https://en.wikipedia.org/wiki/Final_Fantasy_Tactics
10. https://www.cavesofnarshe.com/fft/jobs?job=Orator
11. https://www.supercheats.com/gameboyadvance/questions/finalfantasytacticsadvance/258512/how-can-i-call-a-monster-into.htm (secondary — Q&A)

**TRIANGLE STRATEGY**
12. https://en.wikipedia.org/wiki/Triangle_Strategy
13. https://www.nintendo.com/au/news-and-articles/ten-tactical-tips-for-triangle-strategy-tm/
14. https://www.nintendo.com/en-gb/News/2021/September/See-what-s-changing-in-TRIANGLE-STRATEGY-after-the-demo-feedback-survey--2047085.html
15. https://turnbasedlovers.com/review/triangle-strategy-tbl
16. https://www.rpgfan.com/review/triangle-strategy
17. https://game8.co/games/Triangle-Strategy/archives/368789
18. https://www.godisageek.com/reviews/triangle-strategy-review-a-fantastic-and-deep-adventure/ (secondary — search summary)

**Sword of Convallaria**
19. https://gamewith.net/sword-of-convallaria/69373
20. https://www.levelwinner.com/sword-of-convallaria-beginners-guide-tips-tricks-strategies/
21. https://turnbasedlovers.com/review/sword-of-convallaria-review-classic-rpg-tactics-with-a-lot-of-twists/
22. https://www.pocketgamer.com/sword-of-convallaria/review/
23. https://www.thegamer.com/sword-of-convallaria-combat-tips-strategies/
24. https://gameplay.tips/guides/sword-of-convallaria-advanced-combat-guide.html
25. https://www.rpgsite.net/news/15961-free-to-play-pixel-art-tactical-rpg-sword-convallaria-launches-on-july-31-for-mobile-devices-pc (secondary — launched 2024 on Steam and mobile)

**Tactics Ogre**
26. https://en.wikipedia.org/wiki/Tactics_Ogre
27. https://en.wikipedia.org/wiki/Tactics_Ogre:_Let_Us_Cling_Together_(2010_video_game)
28. https://www.gamedeveloper.com/business/what-s-old-is-new-again-a-tactics-ogre-let-us-cling-together-analysis
29. https://commonsensegamer.com/tactics-ogre-reborn-beast-tamer-class-guide/

**Fire Emblem**
30. https://en.wikipedia.org/wiki/Fire_Emblem
31. https://fireemblemwiki.org/wiki/Phase
32. https://fireemblemwiki.org/wiki/Turn_rewind
33. https://fireemblemwiki.org/wiki/Talk
34. https://fireemblemwiki.org/wiki/Weapon_Triangle
35. https://fireemblemwiki.org/wiki/Fire_Emblem_Heroes
36. https://feuniverse.us/t/randomwizards-enemy-placement-guide/14888
37. https://gamepress.gg/feheroes/node/16046 (secondary — search summary)
38. https://arxiv.org/abs/2512.11902

**Other tactics games & design writing**
39. https://en.wikipedia.org/wiki/Tactical_role-playing_game
40. https://en.wikipedia.org/wiki/Turn-based_tactics
41. https://en.wikipedia.org/wiki/Advance_Wars
42. https://en.wikipedia.org/wiki/Into_the_Breach
43. https://kotaku.com/the-creators-of-into-the-breach-came-very-close-to-givi-1833498295
44. https://pixeltwelve.com/guides/into-the-breach-beginner-guide-enemy-attacks-grid (secondary — search summary)
45. https://www.gamedeveloper.com/design/celebrating-xcom-enemy-unknown-s-design
46. https://en.wikipedia.org/wiki/Tactical_Breach_Wizards
47. https://turnbasedlovers.com/news/menace-action-points-missions-morale-and-weather-system-everything-revealed-in-the-latest-devlogs-from-the-creators-of-battle-brothers
48. https://gamecloud.net.au/review/divinity-original-sin-2 (secondary — search summary)
49. https://www.tomshardware.com/uk/news/divinity-original-sin-2-pax,29965.html (secondary — search summary)
50. https://wakfu.wiki.gg/wiki/Combat
51. https://en.wikipedia.org/wiki/Dofus
52. https://en.wikipedia.org/wiki/Dofus_Arena
53. https://dofuswiki.fandom.com/wiki/Spell (secondary — search summary)
54. https://steamcommunity.com/app/365360/discussions/0/135512931362069398 (secondary — player thread)
55. https://en.wikipedia.org/wiki/Mewgenics
56. https://mewgenics.wiki.gg/wiki/Range_and_Area
57. https://en.wikipedia.org/wiki/Zone_of_control
58. https://www.gamedeveloper.com/design/choosing-the-ideal-movement-range
59. https://gameworldobserver.com/2022/12/02/how-to-design-turn-based-combat-system-untamed-tactics
60. https://www.gamedeveloper.com/design/building-an-rpg-battle-system-part-1
61. https://www.gamedeveloper.com/design/enemy-attacks-and-telegraphing
62. https://itch.io/devlog/58555/timeline-initiative.amp
63. https://chris3606.github.io/GoRogue/articles/grid_components/measuring-distance.html (secondary — search summary)
64. https://www.xmodhub.com/info/guides/is-there-a-way-to-skip-enemy-turns-star-wars-zero-company/ (secondary)
65. https://gamerant.com/persona-5-tactica-how-undo-turns/ (secondary — search summary)

**Monster-collection × tactics**
66. https://en.wikipedia.org/wiki/Pok%C3%A9mon_Conquest
67. https://serebii.net/conquest/battle.shtml
68. https://www.dragonflycave.com/conquestreview.aspx
69. https://gameinformer.com/games/pokmon_conquest/b/nintendo_ds/archive/2012/06/19/taking-pok-233-mon-from-turn-based-to-tactics
70. https://en.wikipedia.org/wiki/Disgaea:_Hour_of_Darkness
71. https://en.wikipedia.org/wiki/Shin_Megami_Tensei:_Devil_Survivor
72. https://dragon-quest.org/wiki/Monster_scouting
73. https://dragon-quest.org/wiki/Dragon_Quest_Tact
74. https://apkmirror.com/apk/square-enix-co-ltd/dragon-quest-tact/dragon-quest-tact-3-0-0-release (secondary — "Real-time Match" added in 3.0.0; no mechanics given)
75. https://www.siliconera.com/dragon-quest-tact-first-gameplay-footage-shows-battle-and-some-gacha/ (secondary — search summary)
76. https://en.wikipedia.org/wiki/Brigandine:_The_Legend_of_Runersia

**PvP / timing**
77. https://en.wikipedia.org/wiki/Frozen_Synapse
78. https://en.wikipedia.org/wiki/Phantom_Brigade
79. https://en.wikipedia.org/wiki/Turns,_rounds_and_time-keeping_systems_in_games
80. https://en.wikipedia.org/wiki/Time_control
81. https://tvtropes.org/pmwiki/pmwiki.php/Main/FirstPlayerAdvantageMitigation (secondary — search summary)
82. https://finalbastion.com/updates/turn-based-comes-to-ranked-pvp/ (secondary — search summary)
