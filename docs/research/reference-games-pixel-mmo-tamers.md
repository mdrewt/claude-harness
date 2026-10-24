---
title: Reference games — a browser pixel-art MMO, Coromon, and retro-RPG storytelling
slug: reference-games-pixel-mmo-tamers
domain: gameplay
tags: [reference-games, pixel-art, browser-mmo, monster-tamer, battle-ui, stamina-system, individuality, difficulty-modes, narrative-structure, onboarding, hd-2d]
status: active
updated: 2026-10-24
confidence: medium
sources: 55
supersedes:
abstract: "Reference study: Soulbound Online, Coromon (stamina, Potential, UI), Octopath/Sea of Stars story structure."
---
## Scope
A project-agnostic reference study of four titles often cited as inspiration by small teams
making pixel-art, online, creature-collecting or story-forward RPGs: (1) **Soulbound: Online** —
a pixel-art action-MMO with roguelite dungeons that began as a zero-install browser / chat-app
game; (2) **Coromon** (and its 2026 "Remastered" rebuild) — an indie monster-tamer; (3) **Octopath
Traveler** and (4) **Sea of Stars** — two retro-styled RPGs with opposite story structures.
Written to inform art, UI, onboarding, mechanics and narrative decisions on *any* similar game.
Pairs with [[monster-taming-mechanics]] (formulas/subsystems), [[top-down-2d-art]] (pixel craft),
[[console-style-game-controls]] (menu/input conventions), [[game-content-pipelines]] (dialogue/quest data).

Evidence quality is uneven and flagged inline: the MMO is niche (little independent technical
or art analysis exists), several facts below come from developer marketing, fan wikis, or
search-result summaries rather than full reads. `[S#]` = Sources list. **Gaps are stated, not filled.**

## Key findings

### 1. Soulbound: Online — verified as described, with caveats
- **Exists and matches the description.** Pixel-art action-MMO + bullet-heaven roguelite dungeons,
  by SpiderWare (London, remote, "small indie studio"; ~18 people per one job-board listing — treat as
  unverified) [S1][S5]. Began as a browser + Discord-Activity game (Discord App Pitch 2024
  "Adventure Together" winner), claims >1 million players on those channels, then entered **Steam Early
  Access 2026-07-21** at $14.99 as a one-time purchase [S2][S3][S7][S21].
- **Hidden history matters.** It is the rebuilt successor of an earlier Ethereum/NFT browser MMO
  (16-bit "SNES/Genesis-like" look; sold NFT avatars/apartments; raised a reported $10M) whose
  blockchain features were removed and progress reset in 2026 [S17][S18][S19][S10]. Steam reception is
  "Mixed" (51% of 248 at launch; 59% of 632 later) with many reviews about the studio's past, plus
  allegations (undisclosed AI art, moderation of history discussion) that come from one outlet or
  community sites and are **unverified** [S10][S17][S3].
- **Art style (what is knowable).** "Colorful", "clean, readable, and full of small charming touches",
  "evokes 90s classic RPGs", "crisp, readable … performance-friendly on low-end PCs"; gear visibly
  changes the character sprite; cosmetics occupy separate slots from stat gear [S3][S9][S11][S12][S16].
  **Not documented anywhere I could reach: palette, tile/sprite pixel scale, lighting model.** (Do not
  assume 16x16 or 32x32.)
- **How a small team shipped it.** (a) *Distribution ladder:* zero-install browser play, then the
  Discord Embedded App SDK (iframe Activity) for built-in friend graph/voice, then a native Steam client
  for performance, controllers and discoverability [S7][S9]. (b) *One account across surfaces* (laptop,
  desktop, Discord) [S9]. (c) *In-house engine:* "built by hand for almost 5 years … from an early
  engine to an advanced engine", edits by any team member appear in-engine immediately — i.e. a custom
  engine with live editing; no engine/framework/language is named anywhere [S5]. (d) *Back end:* one
  shared world ("single-shard") plus regional low-latency clusters for instanced combat; a job listing's
  summary mentions GKE, Kafka, MongoDB, PostgreSQL (snippet only) [S20]. Press claims "one shared world server" [S8].
- **Netcode / feel.** Developer: long-standing network and performance issues fixed, 200+ fps on some
  hardware, combat "responsiveness and tempo" redesigned for PC [S6][S10]. Launch-era Steam reviews
  report jitter, rubber-banding, desync and input delay, and frame drops on strong hardware —
  anecdotal user reports, improving per the same reviews [S16][S12].
- **World / zone structure.** A shared, **mob-free overworld** (towns, farming, crafting, quests,
  trading) separate from **instanced roguelite dungeons** (solo or up to 3 players; branching paths;
  escalating boss phases; **full bag loss on death**, permanent meta-progression); raids for larger
  groups; a player-owned home base/"apartment" hub with a layout editor; named zones (starter mine and
  bay → hub town → city / "lunar city"); areas run on separate server shards [S3][S4][S13][S14].
  Early-Access statement: 12–18 months, level cap 50 growing to 99, 50+ handwritten quests (to more than double) [S3].
- **Social features.** Parties of 3, dungeon finder, leaderboards (in-game and Steam), chat tabs (All /
  Local / Global / Trade / Guild / System), mail, in-game trading; auction house and guilds/guild bases are
  **roadmap items** (late 2026–2027) even though marketing copy mentions guilds today [S3][S4][S13][S10].
  "100% player-driven economy" (player-run shops, player-set prices, seasonal ladders) [S1][S2].
- **UI design language (thin evidence).** Mini-map top-right with a strip of icon buttons (mail, events,
  shop, wiki, quest globe on a hotkey); 28-slot bag with a distinct box for quest items/mounts and for
  currencies; MMO-standard quest markers (gold "!" available, silver "!" requirements unmet, gold "?"
  ready to turn in, silver "?" in progress); hotkeys remappable [S13][S14]. The best QoL praise is
  **automatic tool-swapping** between gathering tasks [S11]. No independent UI critique found.
- **Onboarding.** Fiction: you wake in a hostile digital world, are rescued by a robotic companion, face
  an enemy collective called the Anima; the mystery is told "through environmental storytelling" [S3][S8].
  Flow: scripted intro scene → starter-area tutorial quest (an NPC teaches mining/foraging) → tutorial
  dungeon(s) → teleport to the hub town → one introductory quest per life-skill → a contract board
  → "if you're stuck, follow the main questline" [S13][S15]. Chapter 1 is a **linear main story with
  optional side quests**, told by quest text and NPC dialogue (no voice at launch; partial VO shipped
  2026-09); later chapters promised to be more non-linear [S12][S14][S4]. User reviews cite broken
  tutorials/loading hangs and a store pop-up ~30 minutes in (anecdotal) [S16].
- **Monetization / ethos.** Browser/Discord: free-to-play; Steam: paid, cosmetic store added 2026-09,
  stated "not pay-to-win" (developer claim); creators may stream and monetize freely; tagline "Jump in,
  loot up, log out"; publishes a public roadmap with dated slips; builds "with the community" [S1][S2][S4][S5].
  **Recurring complaints:** long crafting/smelting/upgrade timers (reportedly being cut), repetitive
  progression, "empty world" for lack of grouping partners, content gated behind teammates [S16][S12].

### 2. Coromon (and Remastered)
- **Basics.** Indie monster-tamer by TRAGsoft (two-founder team, reported Netherlands-based; composer
  Davi Vasc), 120+ creatures, six biomes, ~30–40 h campaign, released 2022 on PC/Switch and later mobile,
  GOG, Epic; online PvP incl. ranked and 3v3/6v6 "Battle Dome" [S22][S23][S41][S35].
  **Remastered** (v1.5.0, 2026-03-19) is a *free update* that rebuilt UI, engine and input for PC; the
  PC build shipped first and a beta continues on Steam/Android — final multi-platform status was not
  confirmed [S24][S25][S26][S23].
- **Art.** GBA-era pixel art "with retro heart and modern polish"; reviewers liken it to Pokémon Ruby/Zelda,
  praise detailed location-matched **battle backdrops** that wrap monsters "without pulling focus",
  "gorgeous" monster animations, and per-monster overworld sprites; common criticism is the **boxy /
  oversized-head human sprites** and some blob-like monster designs; full-screen play stretches the art
  [S23][S35][S31][S34]. Individuality is shown by **palette variants** (three colour schemes by potential
  tier) [S36][S40]. The remaster redrew some creatures/environments for continuity with its spinoff [S26].
  **Sprite scale and exact palette not documented in sources.**
- **Battle scene & move selection.** Classic turn-based layout: opposing creatures seen front/back against
  a location backdrop, 6-creature squad, **4 equipped skills** (swappable out of battle; "skill flashes"
  relearn moves), one type per creature plus skill-based damage categories, held items, passive traits,
  weather [S31][S32][S34][S26]. Pre-remaster complaints: healing-item picker always preselects the first
  party member, no animation skip, multi-hit moves slow the text box, typings/skills under-explained
  [S34][S31]. **Remaster fixes (a useful checklist):** *all actions in one panel* (no extra button press to
  reach Skills), quick "smart" Cake/Spinner (heal/capture) suggestions that favour the cheapest effective
  item, hotkey skill-detail inspection, target crosshairs, shoulder buttons to cycle creature details,
  HP bar colour by percentage, toast popups instead of full-screen messages, readable weather popups,
  mouse-hover tooltips, higher-res scaling [S24][S25][S26].
- **Summary / storage UI.** Summary shows level, potential tier and allocated potential stats; skins
  switchable from it; passive "potential reader" always displays tier of caught creatures. Storage sorts by
  date/level/potential/dex number, shows a "New" badge, can auto-send to storage when the squad is full,
  supports nicknaming, and a storage item opens it anywhere; post-catch keep/release prompt; world map marks
  captured species; database screens became grids with back sprites [S25]. Exact screen layouts: not verified.
- **Stamina (vs PP).** Every skill spends from **one shared SP pool per creature** (no per-move PP).
  Weak moves are cheap, strong finishers cost more ("discourages button-mashing"); if no skill is
  affordable the creature must **rest**; resting skips a turn and restores about half the pool (reviewers);
  sleep restores 25% per turn; shared base pool 34 (46 with one trait; a "conserver" trait cuts costs);
  healing cakes restore HP and SP; the spinoff makes 2v2 with *shared* stamina [S28][S29][S33][S31][S35][S23].
  **Reception split:** praised for pacing, anti-spam depth and saving healing consumables; criticised as
  removing tactical challenge / making battles simpler ("dumbed down") because recovery is nearly free
  [S33]; another reviewer reports money pressure from healing items [S31].
- **"Potential" individuality.** Hidden-value-like, but **visible and player-steered**: value 1–21;
  Standard 1–16, Potent 17–20, Perfect 21 (distinct colour); a separate XP-like meter "awakens" in
  steps, each granting 3 stat points the *player allocates* (cap ≈ 66 at the bottom vs 126 at the top);
  wild creatures roll random potential, trainer/boss creatures are fixed; paid tools raise it (once per
  creature) or reset allocations; online "level-50 rule" grants every creature the full 126 [S27][S25][S29].
  Critics: a clear improvement over opaque EV-style training ("takes a lot of the margin of error away"),
  makes hunting for rare tiers rewarding and sets Coromon apart, but contributes to the game being easy
  [S33][S31][S34].
- **Difficulty.** Four presets plus a fully custom fifth: easy (cheaper shops, generous healing), normal,
  **hard/insane = built-in Nuzlocke-style rules** (fainted creature leaves the squad, no fleeing; insane
  adds recall-item and per-area capture limits), custom toggles (item prices/availability, capture
  limits per area, healing limits), built-in randomizer; also puzzle-difficulty assists and a
  colourblind mode [S37][S39][S33][S29][S34][S24]. Sources disagree on which preset carries which
  rule, so treat the per-preset rules as approximate.
- **Quest / journal presentation.** Progress is framed as a researcher's career: a main "task force"
  storyline, location-grouped side quests, six quest types (battle, capture, fetch, puzzle, quiz, talk), a
  logbook updated per quest step, and **"milestones" (research goals) paying promotion rewards** with a
  claim-all button; a gauntlet device with swappable abilities gates puzzles; stealth/timed-run
  interludes break up travel; checkpoints added after early access [S30][S32][S31][S25]. Journal screen
  layout: not verified.
- **What it changed vs Pokémon.** Gyms → multi-phase boss "Titans" and dungeons; shared SP instead of PP;
  visible Potential instead of hidden IV/EV; skills swappable anytime and never forgotten; built-in
  Nuzlocke/randomizer difficulty; puzzle-ability gauntlet; non-battle interludes; online play as the main
  endgame [S31][S34][S33]. Worked: art, Potential, difficulty breadth, QoL. Did not: still "closely
  resembles traditional" Pokémon, a thin post-game, no breeding, late-game resist-all creatures, a
  basic story that "ends flatly", too easy, grindy [S31][S34][S38].
- **Critical reception.** Metacritic 73 (PC, 16 reviews) / 75 (Switch, 12); OpenCritic 73 (40 reviews,
  65% recommend); Steam ~85% positive of ~3,200; sampled outlets: 4/5, 6/10, "worth checking out"
  unscored. Consensus: charming, polished, "a bit too safe" [S38][S22][S33][S31][S34].

### 3. Storytelling structures (brief)
- **Octopath Traveler — eight vignettes.** Eight protagonists (four male, four female, chosen so parties
  vary), each with a **four-chapter personal arc**; pick one to start, recruit others via their chapter 1,
  then do later chapters in any order; only four in the party; benched members earn no XP; the arcs
  *converge only in a finale* [S42][S43][S46]. **Travel banter** is the connective tissue: from chapter 2,
  after event scenes, a "press +" prompt opens a short two-character scene (mostly unvoiced), one per pair
  per chapter, fully optional [S44]. Reception: Metacritic 83 (Switch) / 80 (PC); praised for presentation,
  music, combat; the stories were called "lackluster" and "repetitive" by one major outlet and "solitary"
  by others, while some defend the lack of a unifying plot as a vignette strength; chapters reuse one
  template (town → nearby dungeon → boss) [S43][S45]. Its sequel added **"Crossed Paths"** pair-up
  interludes and more integrated path actions, which critics judged only a partial fix: cutscenes still
  play as if the hero were alone and banter feels "tacked on" [S45][S48]. A later entry swapped back to
  **one custom, silent hero**; early reviews say that loses the ensemble appeal and weakens immersion
  rather than fixing it (search-summary evidence) [S47].
- **Sea of Stars — one linear narrative.** A classic prophesied-heroes tale (two "Solstice" warriors vs
  an alchemist villain) in a shared universe with the studio's prior game; tone "epic, silly, and
  emotional"; **no random encounters, no separate battle screens, no grinding**; timed-button combat; a
  day/night cycle and dynamic lighting inside the pixel style; platformer-like traversal; cooking, fishing,
  a tavern card game [S49][S50]. Reception: Steam 88% (≈6,700), Metacritic ~87–91 by platform, >4 million
  players in <4 months (subscription inclusion inflates), "Best Indie Game" awards [S49][S50][S54].
  Narrative critique converges: **supporting cast (esp. the cook-warrior) beats the two leads**, who read
  as stiff; pacing/ending uneven [S53]. Director's stated craft: a fan-favourite character's return
  is "the ultimate reward" gated behind side content; foreshadowing hooks that interlock; "pruning" genre
  conventions that aged badly (shorter dungeons, capped currency); genre dictates structure ("a turn-based
  RPG needs a party") [S51][S52].
- **How retro-styled RPGs deliver story (patterns, not a census).** (1) *Dialogue-box scenes* with
  portraits/emotes and optional banter; (2) *in-engine scripted cutscenes* using the same sprites,
  often with camera pans, no pre-rendered video; (3) *state-dependent NPC lines* keyed to world flags
  (classic scripts store conditional/branching dialogue); (4) *environmental storytelling* — places and
  incidental objects imply history, used explicitly by the MMO above and by reactive NPCs in Coromon
  ("NPCs react to player actions"); (5) *visible enemies / no random encounters* keep exploration in the
  narrative flow [S3][S36][S49][S55]. Evidence beyond these examples is thin.

## Concrete examples & references
- **Distribution ladder** (browser → chat-app embed → native client) — Soulbound [S7][S9][S10].
- **One-panel battle menu + smart item suggestions + toasts** — Coromon Remastered patch notes [S25].
- **Potential tiers as colour palettes with player-allocated points** — Coromon [S27][S36].
- **Shared stamina pool with Rest (skip turn → ~half back)** — Coromon [S28][S33]; 2v2 shared stamina — its spinoff [S23].
- **Rules-as-menu difficulty (Nuzlocke presets + custom toggles + randomizer)** — Coromon [S37][S39].
- **Optional pair-banter scenes / pair-up interludes** — Octopath and its sequel [S44][S45].
- **Earned character return via side content** — Sea of Stars [S51].
- **Scripted intro → starter tutorial quest → tutorial dungeon → hub teleport → per-skill intro quests** — Soulbound [S13][S15].

## Design implications & transferable principles
Assumptions: a small team, 2D pixel-art, a web or desktop client, an authoritative server, and a story-forward
creature-collecting or online-RPG scope. Options are listed with trade-offs.
1. **Art.** Prioritise *readability on small screens and at low-end hardware* over detail (every positive
   art quote in the MMO is about readability). Treat palette variants as a cheap, legible **individuality
   channel** (Coromon's tiers). Keep human sprites as polished as creatures (the recurring Coromon
   complaint). Cheap atmosphere: a day/night cycle with dynamic lighting on pixel art (Sea of Stars), or an
   HD-2D hybrid of sprite characters over polygonal depth (Octopath) — but the Octopath team reported
   early HD-2D trials looked flat or over-saturated, so prototype before committing [S46][S49][S43].
   Backdrops that match the location frame the fight without stealing focus [S35].
2. **Battle / menu UI.** Make the *common action reachable in one input*: show all actions in a single panel,
   preselect the actionable target (not "first party member"), suggest the cheapest effective item,
   provide hover/hotkey inspection, use toasts not modal messages, colour HP by threshold, allow animation
   skip, and explain typings/skills in-game [S25][S34][S31]. Storage: sort keys (date/level/tier/index),
   "new" badges, auto-send when full, nicknaming, and a remote-access item [S25]. Pair with remappable
   controls and an accessibility mode [S33][S29]; see [[console-style-game-controls]], [[accessibility-interactive-apps]].
3. **Resource model.** A shared stamina pool + free-ish rest gives anti-spam pacing and fewer consumable
   purchases, but reviewers read it as *less* tactical; if adopted, make rest costly (an opponent's free
   turn), scale move costs steeply, and give recovery a price somewhere else [S33][S28]. PP-style limits
   are more punishing but add "run-out" tension; see [[monster-taming-mechanics]].
4. **Individuality.** A visible, tiered, player-allocated value (Potential) removes the "hidden stat" opacity
   and turns shiny-hunting into build-hunting; the cost is reduced margin for error and an easier game,
   so pair it with fixed trainer values, paid resets as a sink, and level-capped competitive rules [S27][S33].
5. **Difficulty as rules, not numbers.** Expose permadeath-style, capture-limit, and price/heal toggles as
   first-class presets plus a custom page; it captures the Nuzlocke audience and the casual audience at
   once [S37][S34]. Because presets are described inconsistently across outlets, document each rule
   plainly in-game.
6. **Story structure.** *Vignettes* give replay, parallel pacing and low coupling to authored content, but
   critics consistently ask for interconnection; *a single narrative* gives a stronger arc but
   depends on the lead characters being compelling (the Sea of Stars weak spot) [S43][S45][S53]. Practical
   middle ground: a single spine with *optional pair-banter or "crossed path" interludes*, an earned
   (side-content-gated) character return, and a **strong supporting cast**; avoid a silent avatar if
   immersion is the goal [S44][S51][S47]. Keep chapter templates varied to avoid the "town → dungeon → boss"
   repetition critique [S43].
7. **Online/MMO shipping.** For a small team, a zero-install web build plus a social-platform embed is a
   strong user-acquisition ladder; plan the native-client move for input latency and controller support,
   and expect launch-week netcode complaints [S7][S10][S16]. Keep the overworld low-friction (mob-free),
   put danger in instances, make the first hour a scripted fiction → guided mini-quests → hub ladder, and
   publish an honest early-access scope (duration, caps, what is missing) and roadmap [S3][S4][S13].
   Avoid long real-time crafting timers (a top review complaint) and avoid advertising features that are
   still on the roadmap (guilds) [S16][S4]. Studio-history or monetization changes cost trust long after
   they are fixed — transparency about resets is cheaper than rebuilding reputation [S10][S11]. See
   [[social-systems-and-moderation]], [[state-sync-interest-management]], [[netcode-authoritative-multiplayer]].
8. **Quest/journal presentation.** Combine standard MMO "!/?" state markers (gold = actionable, silver =
   not yet) with an in-fiction progress frame (researcher milestones with a claim-all button) and
   variety interludes (puzzles, stealth) [S14][S25][S30]; keep authored content in validated data, see
   [[game-content-pipelines]].

## Open questions
- Soulbound: palette, tile/sprite scale, lighting, engine/language, true netcode model, and an
  independent UI critique are **unknown** (no source found). Guild/marketing/roadmap statements and level-cap
  figures conflict across pages (e.g. cap 50 vs 60; raid sizes 3, 4+, 8+, 10, 25; platform support).
- Soulbound AI-art and moderation allegations, and the NFT-era financial figures, rest on single outlets /
  crypto press and are unverified here. Player-count and review figures are time-sensitive snapshots.
- Coromon: whether SP costs are shown in the skill list, summary/storage pixel layouts, the journal's
  actual screen design, and the final multi-platform Remastered release state were not confirmed. The
  developer's reasoning for stamina vs PP was not found.
- Octopath's third entry and several reception claims are from search-result summaries only; re-verify before citing.
- Which narrative structure best fits a creature-collecting game with a "story emphasis" is a design
  decision, not settled by this evidence.

## Sources
S1 https://soulbound.game/ — official site (marketing)
S2 https://soulbound.game/press/ — press/fact sheet
S3 https://store.steampowered.com/app/4369490/Soulbound_Online/ — Steam page, EA statement
S4 https://soulbound.game/roadmap/ — roadmap and history of changes
S5 https://spiderware.gg/about — studio page
S6 https://soulbound.game/news/soulbound-online-official-steam-trailer/ — Steam trailer post
S7 https://soulbound.game/news/soulbound-mmorpg-discord-gaming/ — Discord pitch post
S8 https://www.gamespress.com/GAME-ANNOUNCEMENT-1M-PLAYER-PIXEL-ART-MMO-SOULBOUND-ANNOUNCES-STEAM-VE — press release
S9 https://indiegame.com/en/archives/27831 — preview
S10 https://indiegame.com/en/archives/31675 — early-access review
S11 https://www.gamingnexus.com/News/73370/Soulbound-Online2c-launching-today-into-Early-Access2c-deserves-a-second-look-/ — launch impressions
S12 https://soulboundonline.wiki/review/ — fan-wiki review (unofficial)
S13 https://wiki.soulbound.game/Getting_Started — official wiki
S14 https://wiki.soulbound.game/Quest — official wiki
S15 https://wiki.soulbound.game/Minamoto_Intro_Scene — official wiki
S16 https://steamcommunity.com/app/4369490/reviews/?browsefilter=toprated — user reviews (anecdotal)
S17 https://massivelyop.com/2026/07/21/controversial-ex-blockchain-mmo-soulbound-online-has-officially-entered-early-access/ — search-summary only
S18 https://mein-mmo.de/en/mmorpg-launched-with-blockchain-decided-against-it-now-wants-to-convince-you-with-a-demo-on-steam,1573855/
S19 https://decrypt.co/93466/rising-metaverse-game-pairs-ethereum-nfts-with-retro-16-bit-look ; https://decrypt.co/122001/retro-style-ethereum-nft-metaverse-game-worldwide-webb-raises-10m (summary only)
S20 https://freehire.me/jobs/backend-server-engineer-mmorpg-gcp-spiderware-bdy6rguo ; https://freehire.me/companies/spiderware (summaries; partial)
S21 https://discord.com/blog/discord-app-pitches-2024-category-winners — search-summary only
S22 https://store.steampowered.com/app/1218210/Coromon/
S23 https://coromon.com/
S24 https://steamcommunity.com/app/1218210/allnews/ — developer news incl. Remastered post
S25 https://coromon.wiki.gg/wiki/Build_Notes — patch notes (fan wiki mirror)
S26 https://www.gamegrin.com/news/coromon-gets-surprise-remaster-update-plus-celebratory-discount/
S27 https://coromon.wiki.gg/wiki/Potential
S28 https://coromon.wiki.gg/wiki/Stats
S29 https://coromon.wiki.gg/es/wiki/Manual
S30 https://coromon.wiki.gg/wiki/Quests (stub page)
S31 https://www.rpgsite.net/review/12864-coromon-review — 6/10
S32 https://www.rpgsite.net/preview/11686-coromon-feels-familiar-but-theres-potential-preview
S33 https://www.pocketgamer.com/coromon/review/ — 4/5
S34 https://www.nintendoworldreport.com/review/61024 — unscored
S35 https://www.keengamer.com/articles/previews/coromon-review-one-monster-upgrade-pc/
S36 https://www.siliconera.com/preview-attention-to-detail-makes-coromon-a-standout-monster-battler/
S37 https://gonintendo.com/contents/918-coromon-featurette-showcases-built-in-nuzlocke-style-mode-accessibility-difficulty
S38 https://opencritic.com/game/12957/coromon ; https://legacy.prod.metacritic.com/game/pc/coromon (search-summary scores)
S39 https://progameguides.com/coromon/which-difficulty-should-i-choose-in-coromon/ (search-summary only)
S40 https://www.gameravenreview.com/coromon — 2021 preview
S41 https://twinfinite.net/pc/coromon-interview-tragsoft/ ; https://www.ntower.de/bericht/998-our-interview-with-tragsoft-about-coromon/ (search-summary only)
S42 https://kotaku.com/how-octopath-travelers-structure-actually-works-1827478495
S43 https://en.wikipedia.org/wiki/Octopath_Traveler
S44 https://www.siliconera.com/octopath-travelers-travel-banter-offers-socialization-without-losing-focus/
S45 https://shacknews.com/article/134209/octopath-traveler-2-review-score
S46 https://www.siliconera.com/project-octopath-traveler-developers-answer-project-started-troubles-developing-hd-2d/ (search-summary only)
S47 https://www.shacknews.com/article/147017/octopath-traveler-0-review-score ; https://www.rpgsite.net/review/19069-octopath-traveler-0-review (search-summary only)
S48 https://www.destructoid.com/review-octopath-traveler-2/ ; https://fingerguns.net/reviews/2023/03/13/octopath-traveler-ii-review-switch-pieces-of-eight/ (search-summary only)
S49 https://store.steampowered.com/app/1244090/Sea_of_Stars/
S50 https://www.gamedeveloper.com/press-release/_sea-of-stars_-surpasses-4-million-players-in-less-than-four-months
S51 https://www.rpgsite.net/interview/14807-developer-debrief-chatting-with-the-mind-behind-sea-of-stars
S52 https://mobilesyrup.com/2023/09/07/sea-of-stars-sabotage-director-thierry-boulanger-interview/ (search-summary only)
S53 https://rpgamer.com/review/sea-of-stars-review/ ; https://press-start.com.au/reviews/pc-reviews/2023/08/29/sea-of-stars-review/ (search-summary only)
S54 https://gameworldobserver.com/2023/08/30/sea-of-stars-sales-100k-launch-sabotage-studio (search-summary only)
S55 https://sf-encyclopedia.com/entry/chrono_trigger ; https://www.intechopen.com/online-first/1225186 (search-summary only; general narrative-technique context)
