# Mechanics Survey — Monster-Taming Genre vs. `monster-realm`

**Date:** 2026-07-17 · **Status:** awaiting Drew's decisions (fill the `DECISION` blocks) · **Author:** weekly review agent (web-researched, gate-reviewed)
**Purpose:** a decision-support survey of how the 10 pinned inspiration games implement (or omit) each gameplay-mechanic category, compared against monster-realm's **current** (M0–M17 built) and **planned** (M18+ sketches, playtest replan) state. After Drew fills the decision blocks, this file is handed to a coding agent to plan milestones and update the corpus.
**monster-realm sources:** `game-design.md` (esp. §5–§9, §12), `PLAN.md`, milestone specs M6–M19 + `playtest-replan-2026-07.md`, project `docs/adr/` + `ARCHITECTURE.md`, and the reviewed implementation @ `9a74e2a`.

## How to read this document

Each category has: a genre overview; one entry per pinned game (**or an explicit OMITTED**); the **monster-realm** current/planned state with **⚠ DIVERGENCE flags** where the current implementation conflicts with an option Drew might choose (per the survey mandate: the current implementation is *not* treated as fixed); an **MMO-fit note** against monster-realm's constraints (server-authoritative MMO, SpacetimeDB, deterministic integer-math game-core, content-as-data); and a machine-parseable decision block:

```
<!-- DECISION:EXAMPLE_DO_NOT_PARSE -->
> **Decision (Drew):** PENDING        <- replace with one of: ADOPT | ADAPT | HYBRID | ORIGINAL | KEEP-CURRENT | CHANGE-CURRENT | OMIT | DEFER
> **Sources to draw from:**           <- games/elements, e.g. "SMT negotiation layered on current weaken-to-recruit"
> **Notes / constraints:**            <- free text for the implementing agent
> **Priority:**                       <- now | post-playtest | post-launch | never
<!-- /DECISION:EXAMPLE_DO_NOT_PARSE -->
```

**Downstream-agent parsing note:** the real blocks are the 23 with ids other than `EXAMPLE_DO_NOT_PARSE` (22 categories + `wildcards`). **Scope exclusions:** monetization is out of scope (non-commercial project, GDD §1); accessibility/QoL grind-softeners (respec valves, relearn, rentals, difficulty options) are covered where they arise (§2, §8, §19, §22) rather than as a category — M23 owns accessibility proper.

### Glossary of recurring terms

- **IV (Individual Values)** — hidden per-stat "genes" rolled once when a monster is generated and fixed for life; the reason two same-species monsters differ. Temtem calls them **SVs (Single Values)**; Palworld also uses hidden IVs.
- **EV (Effort Values)** — stat points *earned through play* and allocated by the player, with caps that force build choices (you can't max everything). Temtem calls them **TVs (Training Values)**.
- **Nature** — a small innate personality modifier, classically +10% to one stat and −10% to another.
- **Shiny** — an ultra-rare alternate-color version of a species, purely cosmetic in Pokémon; other games' analogs (Temtem **Luma**, Palworld **Lucky**, Monster Sanctuary **Shift**, Cassette Beasts **bootleg**) increasingly attach real mechanical bonuses — see §2.
- **TM (Technical Machine)** — Pokémon's reusable item that teaches a monster a move it wouldn't learn by leveling; **HM (Hidden Machine)** was the legacy variant for world-traversal moves (Cut, Surf). "TM-analog" below means any reusable move-teaching item.
- **PP (Power Points)** — Pokémon's per-move ammo (each move usable N times); contrast Temtem's stamina bar (§6).
- **Dex** — shorthand for the in-game collection register (Pokédex, Tempedia, Paldeck, field guide…).
- **NG+ (New Game Plus)** — replaying the campaign with carryover of monsters/progress.
- **Roguelike/roguelite** — run-based content with randomized elements where most progress resets each run (used for Temtem's Lairs).
- **Metroidvania** — a single interconnected map where progress is gated by movement abilities you unlock over time (Monster Sanctuary's structure).
- **ATB (Active Time Battle)** — Final Fantasy's semi-real-time turn system: each combatant's action bar fills in real time; you act when it's full (WoFF uses this).
- **VGC (Video Game Championships)** — Pokémon's official esports circuit (2v2 doubles); **Smogon** — the fan organization whose unofficial tier lists effectively govern 1v1 competitive Pokémon; **GTS (Global Trade System)** — Pokémon's asynchronous "post an offer, anyone can fulfill it" trade board.
- **H1/H2/H3** — monster-realm's three falsifiable fun hypotheses (GDD §4): **H1** = weaken-to-recruit is a satisfying puzzle, not a slot machine; **H2** = visible individuality divergence creates attachment; **H3** = server-authoritative fairness makes individuals feel valuable enough to trade/compete.
- **ADR (Architecture Decision Record)** — this project's numbered design-decision documents; **EARS** — the structured requirement format ("WHEN X, THE system SHALL Y") used in the milestone specs.

**Version anchors** (facts verified by web research, 2026-07-17): Pokémon = Gen 9 (Scarlet/Violet) + Legends: Arceus; Digimon = World/Next Order (raising line) **and** Story/Cyber Sleuth/Time Stranger (RPG line) — noted separately where they diverge; SMT = III/IV/V:Vengeance; Palworld = **v1.0 (July 2026, one week old — meta unsettled)**; Monster Rancher = 1&2 DX; DQM = The Dark Prince (2023) + classic; Temtem = 1.8.x **maintenance mode** (servers live, balance-only); Monster Sanctuary = final content state (2022+); Cassette Beasts = post-Multiplayer Update (2024); WoFF = Maxima (2018, static). Source lists per game are in §24.

## Summary matrix

Legend — games: ● central · ◐ present/light · ○ omitted. monster-realm (MR): ✔ implemented · ⋯ planned/sketch · ✘ omitted (deliberate or gap).

| # | Category | Pokémon | Digimon | SMT | Palworld | M.Rancher | DQM | Temtem | M.Sanctuary | C.Beasts | WoFF | MR |
|---|----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | Monster acquisition | ● | ◐ | ● | ● | ◐ | ● | ● | ● | ● | ● | ✔ |
| 2 | Individuality & variance | ● | ◐ | ○ | ● | ● | ◐ | ● | ◐ | ◐ | ○ | ✔ |
| 3 | Transformation of form | ● | ● | ● | ○ | ○ | ◐ | ◐ | ◐ | ● | ● | ✔ |
| 4 | Breeding & inheritance | ● | ◐ | ○ | ● | ● | ● | ● | ○ | ○ | ○ | ✘ |
| 5 | Raising, care & lifespan | ◐ | ● | ○ | ◐ | ● | ○ | ◐ | ◐ | ◐ | ◐ | ✔ |
| 6 | Battle core & action economy | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ✔ |
| 7 | Type/affinity system | ● | ◐ | ● | ◐ | ○ | ◐ | ● | ◐ | ● | ◐ | ✔ |
| 8 | Skills & movesets | ● | ● | ● | ◐ | ◐ | ● | ● | ● | ● | ◐ | ✔ |
| 9 | Battle depth layers | ● | ◐ | ● | ◐ | ○ | ◐ | ● | ● | ● | ◐ | ✔ |
| 10 | Team building, roles & formations | ● | ◐ | ● | ◐ | ○ | ● | ● | ● | ◐ | ● | ✔ |
| 11 | Party & storage | ● | ◐ | ● | ● | ◐ | ● | ● | ● | ◐ | ◐ | ✔ |
| 12 | Wild encounter model | ● | ◐ | ● | ● | ○ | ● | ● | ● | ● | ◐ | ✔ |
| 13 | World structure & exploration | ● | ◐ | ● | ● | ○ | ◐ | ● | ● | ● | ◐ | ✔ |
| 14 | Monster utility outside battle | ◐ | ◐ | ○ | ● | ● | ◐ | ○ | ● | ● | ◐ | ✘ |
| 15 | Collection meta | ● | ◐ | ◐ | ◐ | ◐ | ● | ● | ◐ | ◐ | ◐ | ✘ |
| 16 | Story, NPCs & quests | ◐ | ◐ | ● | ◐ | ○ | ◐ | ● | ◐ | ● | ● | ✔ |
| 17 | Economy & items | ◐ | ◐ | ◐ | ● | ● | ◐ | ● | ◐ | ◐ | ◐ | ✔ |
| 18 | Player-to-player trading | ● | ○ | ○ | ◐ | ○ | ◐ | ● | ○ | ◐ | ○ | ✔ |
| 19 | PvP & competitive | ● | ◐ | ○ | ◐ | ◐ | ◐ | ● | ◐ | ◐ | ○ | ✔ |
| 20 | Co-op & multiplayer social | ◐ | ○ | ○ | ● | ○ | ○ | ● | ○ | ● | ○ | ⋯ |
| 21 | Battle-scoped burst/transform states | ● | ◐ | ● | ○ | ○ | ◐ | ○ | ○ | ● | ● | ✘ |
| 22 | Difficulty, endgame & replay | ● | ◐ | ● | ◐ | ● | ◐ | ● | ● | ◐ | ◐ | ✘ |

---

## 1. Monster acquisition

**Genre overview.** Every game answers "what is the player's skill/decision when acquiring a monster?" The levers split into: attrition (weaken then capture-roll), social (negotiate), performance (fight well), accumulation (scan over many encounters), external (real-world media), and odds-shopping (visible scout %).

- **Pokémon** — battle the wild monster, whittle its HP down, ideally inflict a status ailment (sleep and freeze help most), then throw a Poké Ball and hope: the game rolls against a hidden "catch rate" improved by low HP, status, the species' innate catchability, and the ball's quality tier. The player's skill is damage control — dealing *almost* enough damage without a knockout. The 2022 spinoff Legends: Arceus loosened this: you can crouch in tall grass and throw a ball at an unaware monster without battling at all.
- **Digimon** — the two sub-franchises differ completely. *World line (life-sim games):* there is no capture — you raise one or two partners from an egg like a Tamagotchi, and the wild Digimon you defeat or befriend move into your town as shopkeepers/services rather than joining your party. *Story line (traditional RPGs, e.g. Cyber Sleuth):* every time you fight a species, a per-species "scan" percentage ticks up; once it passes 100% you can *build* a copy of that Digimon from a menu, and patient players scan to 200% for a copy with better starting stats. Acquisition is gradual accumulation across many encounters — there is no single dramatic catch moment.
- **SMT** — you *talk* to the enemy demon mid-battle: it demands money, items, or even your HP, asks personality-quiz questions with no objectively right answers, and may join you, take your payment and flee, or get angry and attack. Success recruits it at roughly its encounter level. The player decision is risk appetite — every negotiation gambles battle turns and resources on a partly-random social exchange.
- **Palworld** — real-time action: you weaken the target with your own guns and your active Pal, then throw a "Pal Sphere" (a Poké-Ball-like item crafted in quality tiers). The catch percentage is shown on screen and improves with lower target HP, better spheres, a permanent account-wide "capture power" stat raised by collecting statues in the world, and attacking from behind. Notoriously, human NPCs can be captured with the same mechanic.
- **M.Rancher** — no wild catching at all: monsters are *generated from real-world music*. Originally you physically swapped audio CDs into the PlayStation and the game synthesized a monster from the disc's data; the modern DX remaster replaces discs with an in-game searchable database of ~665,000 real song titles, each mapping deterministically to one of ~1,218 monster variants. Discovery happens *outside* the game — the community catalogues which songs yield rare monsters. Secondary sources: buying basic monsters at market, or combining two you own (§4).
- **DQM** — "scouting": you spend one battle turn on a scout attempt, and the game **shows you the exact success percentage before you commit**, computed from your party's attack power versus the target. The skill is preparation — buffing your team and weakening the target to push the displayed odds up, then deciding whether the roll is worth the turn. Odds-shopping with open information, versus Pokémon's hidden roll.
- **Temtem** — mechanically closest to classic Pokémon (weaken, apply status, throw a TemCard), but battles are always 2-vs-2, so you're trying to precisely weaken one target while its still-healthy partner threatens you every turn — the capture happens inside a live tactical problem rather than a solved one.
- **M.Sanctuary** — defeated monsters drop **eggs**, and the drop chance scales with a 1-to-5-star grade of *how well you fought* — building attack combos, winning efficiently, not pointlessly overkilling. Hatching the egg gives you the monster at your current level. Acquisition rewards combat mastery itself: fight beautifully, get the monster; no capture item exists.
- **C.Beasts** — you "record" a wild monster onto a blank cassette tape mid-battle, with success chance rising with damage dealt. Thematically inverted ownership: you never own the creature — you own its *recording*, and your human character transforms INTO that recorded form during battles (see §6).
- **WoFF** — "Imprisming": every species displays a visible unlock condition on screen — reduce its HP past a threshold, inflict a specific status, feed it an item, hit it with a certain spell. Meet the condition and a capture window opens for a prism throw. Each species is a small puzzle with the answer shown — knowledge and setup, not attrition, is the lever.

**monster-realm (current):** recruit-by-weaken (M8) — HP-is-the-lever formula, server-rolled with a private wild-individuality side-table (anti IV-grind), bait items modify odds, and a failed attempt forfeits the turn (the wild strikes back) — the pressure is attrition, not a turn limit. This is fun-hypothesis **H1** ("a satisfying puzzle, not a slot machine") and is the playtest's primary subject. **Planned:** recruit tuning in M-playtest-d.
**⚠ DIVERGENCE:** none structural — but H1 validation may demand a second knowledge lever; SMT-style micro-negotiation, WoFF-style visible per-species conditions, or DQM-style visible odds are all *additive* on the current formula, whereas M.Sanctuary-style performance grading would replace it.
**MMO-fit:** weaken-to-recruit is already server-authoritative and deterministic. Visible-odds (DQM) is trivially fit (server computes, client displays). Negotiation dialogue is fit-friendly (M12 dialogue trees exist; server-side RNG) but is real content authoring cost. Performance grading conflicts with the 1v1 readable core (combo metrics don't exist).

<!-- DECISION:acquisition -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:acquisition -->

## 2. Individuality & stat variance

**Genre overview.** The axis runs from "identity in the individual" (hidden rolls worth chasing) to "identity in the recipe" (fungible monsters, identity in the build). Shiny-analogs range from cosmetic to mechanically real.

- **Pokémon** — the genre's deepest hidden-variance stack, and the template monster-realm adapted. Each monster rolls **IVs** (per-stat genes, 0–31, fixed at generation — see glossary), earns **EVs** (allocatable training points, capped so you pick two stats to specialize), has a **Nature** (+10%/−10% stat pair), one of up to three possible **Abilities** (per-species passive powers), a gender, and a ~1/4096 chance of being a **shiny** (rare recolor, cosmetic only). Modern entries add "respec valves" — late-game items (Hyper Training maxes an IV, mints override a Nature) that let money substitute for re-rolling, softening the grind while keeping early attachment.
- **Digimon** — *World line:* individuality is almost entirely *nurture* — same-species partners diverge purely by training history and care quality; the species you end up with is itself an outcome of raising (§3), so the "roll" barely matters. *Story line:* personality types (16 of them in Time Stranger, e.g. "Brainy") bias which stats grow fastest, and are re-rollable via training; **ABI** is a hidden meta-stat earned by repeatedly evolving and DE-volving — it measures how well-traveled the individual is and gates the strongest forms, making an individual's *history* its value.
- **SMT** — deliberately shallow, and instructive as the anti-thesis: demons of the same species are nearly identical on purpose, because the game wants you to treat them as fusion ingredients (§3), not individuals. What makes "your" demon unique is which skills you chose to fuse into it — identity lives in the recipe, not the roll. A design lesson: deep variance and consumptive fusion pull in opposite directions.
- **Palworld** — hidden per-stat IVs on a 0–100 scale; up to four random **passive skills** per Pal drawn from a big pool that spans *both* combat perks and work behavior (e.g. +move speed, better mining) — so a "perfect" Pal differs by job; oversized glowing **Lucky** Pals as the shiny-analog (with a guaranteed passive); bigger **Alpha** boss variants; and v1.0's **Awakening** (crafted gems adding a permanent stat tier). Variance is what makes the breeding endgame (§4) worth running.
- **M.Rancher** — stats derive from the song that generated the monster, plus hidden growth curves (when it peaks), hidden lifespan potential, and a loyalty/temperament shaped by praise vs. scolding. Nurture dominates: two identical summons diverge completely through training. Certain real-world discs/songs unlock rare breeds — the shiny-analog lives in the music database.
- **DQM** — light by design: variance comes from which **talents** (skill trees, §8) and **traits** (passives) a monster carries, plus its **size** — a "Large" monster occupies two of your four party slots but acts more than once per round, a build trade-off rather than a gene roll. Rarity ranks (G up to X) express a species' power *ceiling*, not individual variance.
- **Temtem** — the cleanest formalization of the Pokémon model: **SVs** (Single Values, 1–50, fixed at catch — the IV analog) and **TVs** (Training Values — the EV analog, earned and freely re-trainable). **Luma** rares (shiny-analog) come with guaranteed high SVs. Crucially, endgame "Telomere Hack" items raise a bad SV to maximum — you can *grind away bad luck entirely*, consistent with the game's determinism ideology (§9/§19).
- **M.Sanctuary** — no gene layer at all; instead, rare **Light/Dark Shifted** variants (a visible glow) carry a real extra passive power unique to the shift. The shiny is a *build choice with mechanical weight*, not a trophy — the design shows a variance system can be entirely explicit and still drive hunting.
- **C.Beasts** — no genes; tapes gain star grades through use (each grade adds a sticker slot = one more move, §8), and **bootlegs** are the shiny-analog with the most mechanical weight in the genre: a rare recording of a species in a *different element* (e.g. a fire version of a normally-water monster) with bonus slots — the rare variant changes what the monster *is*, not how it looks.
- **WoFF** — OMITTED: captured Mirages of a species are functionally uniform, with no roll and no shiny-analog; all differentiation happens downstream through each Mirage's upgrade board and stat-seed items (§5). The contrast case: a collection game that works with zero variance.

**monster-realm (current):** hidden IVs + trained EVs (252/510 caps) + Nature + bond (M6, ADR-0016), surfaced in the box UI — this is fun-hypothesis **H2** and pillar #1 ("every monster is a unique individual"); wild IVs kept in a private side-table (ADR-0045) so they can't be scraped. **Planned:** nothing further; "perfecting" is explicitly endgame.
**⚠ DIVERGENCE:** (a) no shiny/rare-variant analog exists — pure content+small-schema lever with outsized collection/trading value (Luma/Shift/bootleg precedents); (b) no late-game respec valves (Hyper-Training/mints/Telomere analogs) — if the playtest finds IV-chasing feels punitive, Temtem's "grindable RNG-erasure" is the proven fix, but it *weakens* trade scarcity (GDD §7 says rarity comes from the roll); pick deliberately.
**MMO-fit:** current model is fully server-side and deterministic. Shiny-analogs are content-as-data + one field. Respec valves are simple reducers but interact with economy sinks (good: they can BE sinks).

<!-- DECISION:individuality -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:individuality -->

## 3. Transformation of form (evolution / fusion)

**Genre overview.** Three shapes: one-way evolution (Pokémon), traversable/reversible form graphs (Digimon Story, WoFF), and consumptive fusion (SMT, DQM, M.Rancher combining). The example in the survey brief lives here.

- **Pokémon** — evolution is a permanent, one-way upgrade into the next species in a line, most commonly triggered by reaching a level threshold; alternate triggers include evolution-stone items, being traded to another player, or high friendship. Branching exists (Eevee famously evolves into one of eight species depending on the trigger) but the paths are predetermined and, once taken, irreversible — the "linear, inflexible" pattern the survey brief's example describes.
- **Digimon** — the franchise's center of mass, in two very different shapes. *World line:* your partner "digivolves" at fixed life-stage checkpoints (child→adult→…), and WHICH form it becomes is decided by how you raised it during that stage — stats trained, care mistakes made, weight, happiness. You *influence* the outcome rather than choose it, which makes each result feel earned or tragic. *Story line:* the opposite extreme — a **freely reversible tree**: de-digivolve any Digimon back down and climb a different branch whenever stat/ABI requirements are met. Species is effectively a position on a build graph, and going backward is *rewarded* (it raises ABI, §2, which the strongest forms require). The genre's most-loved modern transformation system.
- **SMT** — no evolution at all; **fusion is the game**: sacrifice two or more demons to create a new species looked up from race-combination tables (each demon belongs to a mythological "race"; race × race → result). The player hand-picks which skills the child inherits from its parents, so every fusion is a deliberate build decision, and demons are consumable crafting inputs rather than companions. SMT V adds **Essence Fusion**: items that bottle a demon's skills and elemental affinities, which you can pour onto another demon (or your protagonist) to overwrite theirs — even a monster's weaknesses become a craftable loadout.
- **Palworld** — OMITTED as evolution: no species ever changes form in place. Variety comes from elemental subspecies (a fire and an ice version of the same Pal) and from breeding outcomes, including v1.0's mutation jackpots (§4).
- **M.Rancher** — OMITTED as evolution: species is fixed the moment a monster is generated; the only way to "change" is combining two monsters into a brand-new one, which ends both careers (§4).
- **DQM** — OMITTED as evolution: species change happens only through synthesis (§4). The closest analog is that a fully-maxed **talent** (skill tree, §8) can upgrade into a stronger version of itself — growth of the *build*, not the body.
- **Temtem** — evolution like Pokémon's with one clever twist: the trigger counts **levels gained since you caught it**, not absolute level — a monster caught at level 40 must still earn its (say) 15 levels with you before evolving, so high-level catches don't shortcut the journey. Some species have special condition-based branches (Tuwai evolves into different elemental forms at different shrines). Irreversible.
- **M.Sanctuary** — mostly OMITTED: only a handful of species evolve, each via a specific one-way catalyst item; the game's real "growth" system is its skill trees (§8).
- **C.Beasts** — "**remastering**": when a tape reaches its maximum star grade through use, it can remaster into a stronger form — some species offer multiple branch options selected by play conditions or outright player choice. Permanent. (Its separate showpiece — two monsters temporarily *fusing mid-battle* — is a different mechanic entirely, covered in §21.)
- **WoFF** — "**transfiguration**": each Mirage's forms — often different *size classes* (small/medium/large, which matter for stacking, §6) — all live on one shared upgrade board, and once unlocked you can **toggle between forms freely**. Fully reversible by design, because which size you need is a tactical, per-fight decision rather than a progression milestone.

**monster-realm (current):** **both** evolution and fusion shipped in M10 (ADR-0019), individuality-preserving: evolution is level+bond-gated with branching (Digimon-inspired care-conditioned paths); fusion consumes two monsters → new species with inheritance (per-stat max IV of parents + higher-bond nature — the DQM synthesis shape) and is a designed **economy sink** (GDD §7). Starters are base forms only.
**⚠ DIVERGENCE:** (a) both mechanics are one-way; a Digimon-Story-style reversible graph would contradict fusion-as-sink and trade scarcity — flagged because it's the genre's most-loved modern shape; (b) evolution items exist as content but no trade-triggered or context evolutions (social-MMO-native triggers are unexplored); (c) SMT essences (affinity/skill grafting as items) would overlap with the skills model (§8) — pick one home for build-crafting.
**MMO-fit:** current model is server-authoritative and integer-deterministic; fusion's consume-two is exactly what escrow/trading integrity (M15) protects. Reversibility would multiply state (form history) and undercut the economy model — expensive fit. Branch-condition content is pure RON data — cheap to grow.

<!-- DECISION:transformation -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:transformation -->

## 4. Breeding & inheritance

**Genre overview.** Breeding is the genre's supply engine and optimization endgame where present — and its most economy-distorting system in multiplayer contexts. Several games deliberately collapse it into fusion instead.

- **Pokémon** — leave two compatible monsters (grouped into "egg groups") at a daycare and eggs appear. Inheritance is steerable with held items: a Destiny Knot passes down 5 of the two parents' combined 12 IVs (the rest re-roll), an Everstone locks in a parent's Nature, parents pass special "egg moves" the child couldn't otherwise learn, and pairing parents from different-language game copies multiplies shiny odds (the "Masuda method"). Breeding chains toward a perfect-stat individual are *the* competitive endgame — and deliberately RNG-flavored so the chase never quite ends.
- **Digimon** — *World line:* inheritance runs through **death**, not pairing — when your partner's lifespan ends, the next egg inherits a fraction of its stats and techniques, so a lineage compounds strength across generations of raising. *Story line:* OMITTED as eggs — skills persist as you move around the digivolution graph (§3), so inheritance is built into transformation instead.
- **SMT** — OMITTED as breeding; fusion (§3) IS the inheritance mechanic — skills flow from the sacrificed parents into the fused child. The Compendium (a registry that re-sells copies of demons you've owned, §11) is memory, not heredity: it preserves builds, it doesn't create lineages.
- **Palworld** — the central endgame loop: put two Pals in a Breeding Farm with a baked cake and get eggs. Species outcome follows a **fixed combination table** — two specific species reliably produce a third — so breeding is also the way to obtain many species; passives and IVs (§2) inherit from the parents, making the real game "funnel these four perfect passives across species lines." v1.0's **Mutation** system adds a small jackpot chance per egg (boosted stats, unique passives), steerable with four cake types — an RNG layer the player buys down with agriculture.
- **M.Rancher** — "**combining**": fuse two of your monsters into a single heir whose breed mix and starting stats derive from both parents (plus optional seasoning items) — at the cost of *both parents' careers* ending. Because trained stats partially carry, compounding a lineage across generations is the long game — breeding, transformation, and succession collapsed into one mechanic.
- **DQM** — "**synthesis**", the franchise pillar: two parents at level 10+ produce a child you *choose from a results list* (monster-family combination tables plus special fixed recipes for rare/boss species). You pick which talents (skill trees) transfer, the child gets half the parents' invested skill points, and — the key design statement — synthesized monsters hold **3 talent slots versus a wild scout's 2**: bred is *strictly deeper* than caught, so the entire progression economy funnels through the breeding tree.
- **Temtem** — breeding underpins the entire player economy (§18): SVs inherit (steerable with single-use "DNA strand" gear), parents pass egg techniques, and — the standout idea — every Temtem has a **fertility** counter that drops with each breeding and is inherited *at the reduced value*, so a lineage can only produce a bounded number of offspring before going sterile. A hard, designed cap on how many near-perfect monsters can ever enter the market — anti-inflation built into biology.
- **M.Sanctuary** — OMITTED: the eggs you collect are combat loot (§1), not offspring; no pairing or inheritance exists.
- **C.Beasts** — OMITTED: no eggs, no inheritance.
- **WoFF** — OMITTED.

**monster-realm (current):** **deliberately OMITTED** — GDD §12 takes DQM's "synthesis with inheritance" *as fusion* (M10), not as breeding; Monster Crown-style breeding was an inspiration the corpus dropped when the roster pinned. **Planned:** nothing.
**⚠ DIVERGENCE:** the strongest tension in the survey. The GDD economy (§7) says scarcity comes from the wild roll and fusion is a monster *sink*; breeding is a monster *faucet* that would invert that — but it is also the genre's proven long-term retention engine for a trading MMO (Pokémon/Temtem/Palworld all lean on it). If ever adopted, Temtem's **fertility cap** is the ready-made anti-inflation answer, and it must co-exist with (or replace) fusion's inheritance role to avoid two competing inheritance systems.
**MMO-fit:** feasible (server-side egg rolls, escrowed like everything else) but the *economy* fit is the issue, not the tech. A bounded variant (fusion-only inheritance now; fertility-capped breeding post-launch if trade volume needs supply) preserves the sink-heavy model.

<!-- DECISION:breeding -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:breeding -->

## 5. Raising, care & lifespan

**Genre overview.** From "raising IS the game" (M.Rancher, Digimon World — including aging and death) to "raising is competitive prep" (Temtem) to near-absent (SMT, DQM). Mortality is the genre's rarest and most emotionally powerful lever.

- **Pokémon** — historically thin: a hidden friendship stat (raised by walking together, items, battling) gates a few evolutions and minor battle perks; recent games add picnics and sandwich-buff cooking as light bonding chores. No aging, no death — a monster caught on day one is identical in kind on day one thousand.
- **Digimon** — *World line:* care IS the entire game, descended directly from the Tamagotchi virtual pet: feed it, praise or scold its behavior, toilet-train it, put it to bed on schedule, train it at the gym, nurse its sickness — under a **hard lifespan** (real hours of play) that ends in death, after which a new egg inherits part of the lineage (§4). Parenting quality decides what it evolves into (§3). The genre's strongest attachment machine, built on mortality. *Story line:* reduced to a "DigiFarm" — stored Digimon train and produce items passively on an island while you play.
- **SMT** — minimal *by design*: demons level up, learn a short fixed list of skills, then stop growing — planned obsolescence that pushes you back to the fusion table (§3). The newest entry adds brief bond conversations with your demons (Demon Haunt) but they're flavor, not a system. Care would defeat the point: demons are ingredients.
- **Palworld** — care industrialized: feed surplus duplicate Pals into a "Condenser" to raise a Pal's star rank, feed harvested Pal Souls to a statue for stat boosts, keep your base workforce fed and sane (a sanity meter — overworked Pals break down). Duplicates are fuel; the emotional register is factory-farm logistics, not bonding.
- **M.Rancher** — the core loop, run on a weekly in-game calendar: choose training drills (each trades stat gains against fatigue, stress, and injury risk), feed it monthly, praise or scold to shape loyalty and battle obedience (§6), treat sickness — all against a **3–5 in-game-year lifespan ending in death** (the Freezer pauses aging, §11), with month-long "errantry" training trips as the big-gain gamble. The player's role is coach and parent; every monster is a finite career.
- **DQM** — OMITTED beyond ordinary leveling and allocating talent points (§8): no feeding, no bond, no aging; monsters are permanent, ageless party members. All the "raising" energy went into synthesis planning (§4).
- **Temtem** — raising is pure competitive preparation: train TVs (§2) via targeted battles or items, respec them freely, hunt Lumas. No care simulation, no bond stat — the relationship is between the player and the ladder, not the player and the monster.
- **M.Sanctuary** — feed each monster up to three permanent food buffs, use catch-up leveling items, and — crucially — **respec skill trees freely at any time**, making "raising" iterative build experimentation with no sunk cost, the opposite of monster-realm's permanent-investment EV model.
- **C.Beasts** — tapes level up through battle use (raising the star grade, §2); the actual *nurture* loop is aimed at your **human companions** — relationship hearts (including romance arcs) that directly increase your fusion power in battle (§21). Care redirected from monsters to people.
- **WoFF** — spend earned points on each Mirage's personal upgrade board (a miniature Final-Fantasy-X-style sphere grid unlocking stats, abilities, and forms), plus permanent stat-seed items and equippable jewels. Compact and deliberate — a build system wearing a raising system's clothes.

**monster-realm (current):** M9 focus-training (deliberate EV allocation via sessions/training food) + care/bond (bond gates some evolutions) on an **active-only** pillar (no idle growth, anti-afk — a real design call the GDD §6 defends with an escape hatch: if the playtest reads "grindy," add a *bounded* passive lever like limited offline rest, never idle farming). Town healing costs currency (sink). No lifespan/aging/death.
**⚠ DIVERGENCE:** (a) active-only vs. Digimon Story's DigiFarm / Palworld's base: any future "monsters do things while you're away" feature (§14) collides with this pillar — the GDD's bounded-rest hatch is the sanctioned compromise; (b) mortality (M.Rancher/Digimon World) is maximally attachment-generating but would be hostile in an MMO where individuals are tradeable investments — adopting it would contradict pillar #2 (investment safety) and is effectively foreclosed; flag it as consciously rejected rather than unconsidered.
**MMO-fit:** current model fits perfectly (all writes server-side, heal cooldowns already exist). Offline-rest hatch is a trivial timestamp mechanic. Lifespan/death would poison trading (buying a dying monster) — fits the tech, breaks the pillars.

<!-- DECISION:raising -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:raising -->

## 6. Battle system core & action economy

**Genre overview.** The genre's widest spread: classic speed-ordered turns (Pokémon, DQM), knowledge-charged turn economies (SMT press-turn), resource economies (Temtem stamina, C.Beasts AP), team-turn sequencing (M.Sanctuary), formation math (WoFF stacking), coached real-time (M.Rancher, Digimon World), and full action (Palworld).

- **Pokémon** — turn-based: both sides secretly pick an action, then the faster monster acts first. One active monster per side (the official competitive format uses 2v2 "doubles"), party of six. Switching your active monster out is cheap — so the deepest skill expression is *prediction*: switching a resistant monster in to absorb the attack you expect, at the risk of eating a different one. A monster's move only spends that monster's turn; the battle rhythm is one-action-per-side.
- **Digimon** — *World line:* real-time arena where your partner fights **semi-autonomously** — you shout orders and throw items on a limited "advice" budget, more sports coach than commander. *Story line:* conventional turn-based with an initiative timeline ordered by an agility stat; three active + reserves you can rotate in; full direct control.
- **SMT** — **Press Turn**, the genre's most influential action-economy invention: your side gets four action icons per round; hitting an enemy's elemental *weakness* or landing a critical refunds half an icon (effectively a bonus action), while missing or attacking into a resist/null *burns extra icons* (you lose actions). Knowledge of enemy weaknesses literally multiplies how many things you do per round — and the enemy side plays by the same rules against your weaknesses, so team composition is defense. Four demons active from a larger carried stock; swapping costs an action.
- **Palworld** — real-time third-person shooter: *you* aim and fire weapons while one of your five carried Pals fights alongside on skill cooldowns; player damage routinely exceeds Pal damage. The trainer-as-main-combatant stance is the genre's biggest outlier (shared only by WoFF's optional Avatar mode) and the corpus explicitly rejects it (ADR-0017).
- **M.Rancher** — real-time 1v1 arena bouts against a countdown clock: techniques are only usable at certain *distances* (range bands — close/mid/far), so positioning is the moment-to-moment game; and your monster obeys commands only as well as its loyalty and stress allow — **indirect control as drama** (a badly-raised monster ignores you in the final). Win by KO or points at time-out.
- **DQM** — classic Dragon Quest rounds: everyone declares, then actions resolve in agility order. Up to four party slots (a Large monster occupies two, §2), spells cost MP, and the signature DQ touch: you can delegate any monster to an **AI tactics policy** ("Show No Mercy", "Focus on Healing") instead of micromanaging — autonomy as a convenience layer.
- **Temtem** — always-2v2 doubles from a squad of six, with **stamina instead of per-move ammo**: every technique costs stamina from a visible bar; overspend and the Temtem *hurts itself and loses its next turn* — a push-your-luck economy replacing Pokémon's PP bookkeeping. "Hold" values delay powerful techniques for N turns after a monster switches in, taxing the free-switch game Pokémon allows.
- **M.Sanctuary** — **3v3 with team-turns**: on your turn, all three of your actives act, in any order you choose; each hit feeds a combo meter that multiplies the damage of later hits in the same turn — so sequencing (set-up hits first, finisher last) is the entire skill. Six-monster party with mid-battle swaps.
- **C.Beasts** — turn-based; both human characters transform into their equipped tapes (§1) and fight; moves cost **AP (action points)** from a pool that grows each turn (costs 0–4), so every turn is a bank-or-spend decision — skip cheap moves now to afford the big one later. Scales 1v1 up to 2v2+.
- **WoFF** — **ATB** (see glossary: action bars fill in real time) built entirely around **stacking**: assemble totems of Large + Medium + Small units whose stats *sum* and whose move lists *merge*, then fight two stacks per side. Accumulated hits **topple** a stack (knocked down and stunned — the risk of going tall), and you can voluntarily *unstack* mid-fight to act three times per bar at much lower power. Formation as the core combat verb.

**monster-realm (current):** turn-based, server-resolved 1v1-active with party bench + swap (M7, ADR-0017: readable "affinity puzzle" core first — pillar #3, knowledge-not-twitch), M14 depth added on top, 2-player PvP with turn deadlines (M16). Speed/turn order server-side, all integer math. GDD Open Question: "does the 1v1 core need M14 depth to be fun?"
**⚠ DIVERGENCE:** the corpus explicitly rejects real-time/action (ADR-0017) — Palworld/M.Rancher/Digimon World cores are out of scope by decision. The open choices are *within* turn-based: (a) a knowledge-charged action economy (press-turn-lite: e.g. small refund on super-effective hits) would amplify pillar #3 but reshapes all balance; (b) 2v2 (Temtem) is the proven doubles-synergy generator but multiplies UI and balance scope; (c) a stamina/AP-style cost pool would replace the current flat one-action turn. All are big-ticket CHANGE-CURRENT moves best decided at the playtest gate.
**MMO-fit:** turn-based intents are what the whole netcode (intent-only, server-resolved, no prediction in battle) is built for; any variant above stays fit. Real-time variants would invalidate the architecture — correctly rejected.

<!-- DECISION:battle_core -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:battle_core -->

## 7. Type/affinity system

**Genre overview.** From an 18×18 load-bearing matrix (Pokémon) through compact-but-brutal per-individual affinities (SMT) to reaction *chemistry* (C.Beasts) to none at all (M.Rancher).

- **Pokémon** — 18 elemental types in a fixed effectiveness matrix: each attack type does 2× ("super effective"), ½× ("not very effective"), or 0× (immune) against each defending type. Monsters can carry *two* types (multipliers stack — a double weakness takes 4×), moves carry one. The chart is the load-bearing center of every battle decision and the main thing a new player must learn. Gen 9's Terastallization lets each monster, once per battle, swap its defensive typing to a pre-chosen "Tera type" — rewriting one axis of the chart mid-fight.
- **Digimon** — *Story line:* two small charts multiplied together: a three-way rock-paper-scissors of categories (Vaccine beats Virus beats Data) × eight elemental attributes (fire/water/plant/electric/wind/earth/light/dark). Each axis is shallow alone; the product gives moderate depth. *World line:* elements exist but barely matter — positioning and technique choice dominate (§6).
- **SMT** — only ~7 damage elements (physical, fire, ice, electric, force, light, dark), but there is no species-type matrix: **every individual demon carries its own row of reactions** — weak / resist / null / drain (absorbs as healing) / repel (bounces back). Because Press Turn (§6) converts weakness hits into extra actions and nulls into *lost* actions, memorizing per-demon affinity rows is the whole knowledge game — a small chart with enormous stakes per cell.
- **Palworld** — 9 elements in a mostly one-directional cycle (fire>grass>ground>electric>water>fire, plus a few extras); deliberately shallow and legible. Matters most at boss/raid element checks, not in moment-to-moment shooting.
- **M.Rancher** — OMITTED entirely: no elements, no chart. Matchups emerge from stat profiles (fast dodgy monsters vs. slow power hitters, intelligence-based vs. power-based attackers) and technique range coverage (§6) — proof the genre can run on stats alone.
- **DQM** — no type-effectiveness matrix for damage. Monster **families** (Slime, Dragon, Beast, Undead…) exist primarily to organize *synthesis* outcomes (§4), while combat uses per-species resistance tables to specific spells/elements — the "chart" serves breeding more than battling.
- **Temtem** — 12 types with dual-typed monsters and a conventional multiplier chart, but made to work twice as hard: in 2v2, choosing *which* opponent to hit is half the game, and "synergy techniques" upgrade when a partner of the right type stands beside the user — the chart powers team construction (§10), not just damage math.
- **M.Sanctuary** — no species types; each monster individually carries weakness/resist tags against the four elements and physical/magical damage. Real but subordinate — the buff/debuff stack economy (§9) decides fights; type tags just bias target selection.
- **C.Beasts** — the genre's most radical rework: elemental matchups don't multiply damage at all — they trigger **chemical reactions** that apply buffs, debuffs, and coatings, and can even *change a combatant's type mid-fight*: fire attacks on a plant monster set it burning; water on an electric monster makes it conductive; metal rusts when wet, plastic melts when burned. The type chart reads like a chemistry table, and playing it — deliberately transmuting yourself or the enemy into a favorable matchup — is the core puzzle.
- **WoFF** — classic Final Fantasy elements (fire/ice/thunder/…) with resistances, but a stack's effective affinities are the **sum of its members'** (§6): one member's fire weakness can poison the whole totem's defense. The chart bites at team-composition time, not move-selection time.

**monster-realm (current):** ~8 affinities in a "rock-paper-scissors-plus web," data-driven RON chart (M7), dual-typing not in evidence (single affinity identity per species per GDD §5), effectiveness is the **primary balance lever**; MVP subset ~6.
**⚠ DIVERGENCE:** (a) SMT-style per-individual affinity rows (drain/null/repel, not just ×2/×½) would deepen the knowledge game the pillars want, at real balance cost; (b) C.Beasts-style reactions are the genre's freshest chart innovation but replace the multiplier model the whole battle core is tuned around — an ORIGINAL/HYBRID candidate only at a design-reset scale; (c) dual-typing is a data-only expansion lever kept in reserve.
**MMO-fit:** the chart is already content-as-data — every option here is data + game-core math, fully deterministic. Reaction systems add battle-state (coatings) but nothing architecture-hostile.

<!-- DECISION:affinity -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:affinity -->

## 8. Skills & movesets

**Genre overview.** The constraint IS the design: 4 slots (Pokémon, Temtem) vs. 8 (SMT) vs. ~20 carried (Digimon Story) vs. full skill *trees* (M.Sanctuary) vs. physical, movable objects (C.Beasts stickers).

- **Pokémon** — a hard **four-move limit** per monster, the franchise's signature build constraint: every monster is a four-choice loadout, and learning a fifth move means permanently forgetting one (modern games allow free relearning in town, softening the anxiety). Moves come from level-up, **TMs** (reusable teaching items, craftable in Gen 9), inherited egg moves (§4), and NPC tutors. Scarcity of slots is what makes movesets *decisions*.
- **Digimon** — *Story line:* the signature is **skill inheritance across the evolution tree**: a Digimon carries up to ~20 learned moves as it digivolves and de-digivolves (§3), so a final form can wield attacks from every earlier form it ever passed through. Building a moveset means *planning a route through the species graph* — cross-lineage movepool curation as the build game.
- **SMT** — eight skill slots per demon; skills arrive from a fixed level-up queue, from **player-selected fusion inheritance** (you choose which parent skills the fused child keeps, §3), and from essence items. Per-demon "skill potentials" (multipliers by skill category — this demon is +2 fire, −1 healing) bias each toward a niche. Your protagonist is customized through the same systems — the player character is just another build slot.
- **Palworld** — three equipped active skills per Pal, learned by leveling; "Skill Fruit" items teach any move to any Pal regardless of element. Each species also carries one fixed **Partner Skill** — its out-of-battle identity (becomes a mount, a flamethrower, a glider). Most build depth lives in passives (§2) rather than actives.
- **M.Rancher** — techniques are organized by *attack range* (§6) and learned by sending the monster on month-long "errantry" training trips to specialized locales, or through tournament experience; no hard slot cap — the practical limit is what the monster mastered in its lifetime. Combining (§4) passes some techniques to the heir.
- **DQM** — "**talents**" are point-buy skill trees: each monster holds 2–3 of them, and leveling grants points you spend to unlock the tree's spells, abilities, and passive stat bumps. Because synthesis (§4) lets you hand-pick which talents the child keeps, a lineage can accumulate exactly the trees you want on one body — moveset-building as a **multi-generation project**.
- **Temtem** — techniques learned by level plus reusable "Courses" (the TM-analog); the monster remembers its entire learned pool and you equip any four, swappable freely outside battle — the Pokémon constraint without the forgetting anxiety. Each individual also carries one of its species' two possible passive **traits** (§2).
- **M.Sanctuary** — every monster has a full **multi-branch skill tree** mixing active attacks, passive bonuses, and team-wide auras, with level-gated tiers and *free respec at any time* — the deepest per-creature build system in the genre, closer to building a Diablo character than picking four moves. The moveset IS the monster.
- **C.Beasts** — moves are physical **stickers**: peel one off a tape and press it onto another; slots are limited by tape star-grade (§2), some stickers are species-restricted, and rare stickers carry bonus side-effects ("attribute" riders — a free shield on use, etc.). Your whole collection shares one sticker inventory, so moveset-building is literally inventory management across the roster.
- **WoFF** — abilities unlock as nodes on each Mirage's board (§5); in battle, a stack's usable ability list is the **union of its members'** lists (§6) — so there's no per-monster slot pressure at all; the constraint is *who's in the totem*, pushing all build thinking into composition.

**monster-realm (current):** ~24 skills at launch (power × affinity × phys/spec × optional effect), per-species learnable sets, `known_skill_ids` on the individual; content-priced, data-driven (M6/M14). Moveset legality validated server-side.
**⚠ DIVERGENCE:** (a) the corpus doesn't pin a hard slot count as a *design statement* — Pokémon's 4-slot scarcity is what makes learnsets "meaningful" (GDD §5's stated goal); confirm-or-change deliberately; (b) no skill-inheritance surface besides fusion — DQM/Digimon-style inheritance curation is the natural deepener when fusion volume grows; (c) M.Sanctuary trees/free respec would conflict with EV-investment permanence (§2's attachment thesis).
**MMO-fit:** all data + server validation, no netcode implication. Free-respec variants interact with economy sinks (could be priced).

<!-- DECISION:skills -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:skills -->

## 9. Battle depth layers (status, weather, abilities, held items)

**Genre overview.** Four canonical layers — status, field states, per-monster passives, held items — with Pokémon running all four at full strength and most games picking two or three.

- **Pokémon** — runs all four canonical layers at full strength. **Statuses**: major ailments (burn, sleep, paralysis, poison, freeze) plus temporary "volatile" ones (confusion). **Field states**: weather (rain boosts water moves, sun boosts fire) and terrains, each enabling whole team archetypes. **Abilities**: per-species passives — arguably the biggest depth multiplier in the series (e.g. an ability that summons rain on entry converts one switch into a field-state play). **Held items**: one per monster (damage-locking Choice items, passive-healing Leftovers, emergency berries). The *interactions between layers* are the competitive metagame.
- **Digimon** — *Story line:* statuses, buff/debuff spells, equippable accessories (USBs), and per-Digimon "support skills" (ability-likes); the party-cost Memory system (§10) is itself a depth layer. No weather/terrain analog.
- **SMT** — ailments plug directly into Press Turn (§6) — a charmed or confused demon wastes your icons, making status warfare an action-economy weapon; the -kaja/-nda buff/debuff spell families **stack multiple stages and are core to every serious fight**, not optional polish; passive skills; and the Magatsuhi burst gauge (§21). No weather, no held items — depth concentrated in few, heavily-interacting systems.
- **Palworld** — elemental status effects (burn, freeze, shock) and crafted armor/weapon tiers for the player plus saddles/gear for Pals; no held-item or weather metagame — depth lives in the tech tree, not the battle.
- **M.Rancher** — OMITTED in-battle: no statuses, items, or field effects. All the depth sits in the *meta-layer around* the fight: managing fatigue and stress in training, timing your monster's aging curve so it peaks for the big tournament — condition management as strategy (§5).
- **DQM** — the classic Dragon Quest status roster (sleep, confusion, instant-death resistances…), buff/debuff spell lines, per-monster **traits** (innate passives like critical-rate boosts), and equippable accessories in some entries. The Dark Prince's season system (§12) touches the overworld far more than the battle.
- **Temtem** — the philosophical outlier: **no critical hits and no baseline miss chance** — statuses run fixed, predictable durations, so every battle outcome traces to decisions, not dice. Held gear items and traits still provide build depth. The design bet: competitive integrity is worth more than slot-machine excitement (§19).
- **M.Sanctuary** — the densest stack economy in the set: damage-over-time effects accumulate in *counted stacks* (bleed ×5, burn ×3), plus charge tokens, shields, regeneration, team-wide auras, and per-monster weapons/accessories — reading and manipulating the stack state is the game, much closer to an action-RPG's buff economy than to Pokémon.
- **C.Beasts** — most depth arrives through the type-reaction system (§7), which applies coatings and statuses as a *byproduct of attacking*; sticker attribute riders (§8) act as the passive/held-item layer; weather is minimal.
- **WoFF** — standard Final Fantasy statuses plus **topple** (a knocked-down stack loses turns — the built-in price of stacking, §6); elemental affinity aggregation across stack members; equippable Mirajewel passives for the human twins.

**monster-realm (current):** M14 shipped status effects, per-species passive **abilities**, and **weather** additively on the M7 core (ADR-0023); battle items usable in-battle (`use_battle_item`); **no held items**. Deterministic integer math throughout (crit model per M7 spec, server-rolled).
**⚠ DIVERGENCE:** (a) held items are the one canonical layer absent — they're also the classic *economy* coupling (consumables/gear as sinks) and a trading surface; (b) Temtem's no-crit/no-miss determinism stance is philosophically adjacent to monster-realm's fairness pillar — if PvP surveys flag RNG frustration, that's the proven direction and would *simplify* rather than grow the system.
**MMO-fit:** held items = one schema column + content + battle-core hooks; well-trodden. All options deterministic-friendly.

<!-- DECISION:depth_layers -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:depth_layers -->

## 10. Team building, roles & formations

**Genre overview.** From community-codified role language (Pokémon) to points-budgeted rosters (Digimon Memory), slot-cost formations (DQM sizes), explicit role archetypes (M.Sanctuary), and literal formation math (WoFF stacks).

- **Pokémon** — no formal in-game role system, but the most mature *emergent* role meta in gaming, with two decades of community-codified vocabulary: a **sweeper** (fast attacker meant to knock out several enemies in a row), a **wall** (defensive sponge), a **pivot** (safe switch-enabler), a **hazard setter** (lays damaging traps on the field). Teams are built as type cores (mutually-covering type trios) plus ability+weather combos (§9). The lesson: given deep enough systems, players will invent the role language themselves.
- **Digimon** — *Story line:* the **Memory cap**: every Digimon costs "memory" points roughly proportional to its power, and your active team must fit under your current cap — field three gods or six mid-tiers. Roster construction becomes a knapsack problem, and the cap itself is the game's power-balancing mechanism (a brilliant, cheap idea for ranked formats).
- **SMT** — teams are built for **affinity coverage**: never field a demon whose weakness the enemy can exploit (each weakness hit *gives the enemy extra actions*, §6), always carry buffers/debuffers (non-optional, §9), and match demon races for Magatsuhi combo skills (§21). Since fusion consumes the roster continuously (§3), team building is perpetual re-manufacture, tuned per boss.
- **Palworld** — two parallel rosters with real tension between them: your combat party of five vs. your base **workforce**, where each Pal carries work-suitability ratings (mining 2, kindling 1, transporting 3…) that determine factory throughput (§14) — a great fighter may also be your best miner, and it can't be both places.
- **M.Rancher** — OMITTED: one monster career at a time; the only "team" is your ranch's succession pipeline across generations (§4).
- **DQM** — roles emerge from talent/trait curation (§8) — build a tank, a healer, a nuker — plus the **size economy**: a Large monster costs two of your four slots but acts multiple times per round, a real formation decision. Since the best monsters are synthesized (§4), team building happens *generations ahead* of the fight.
- **Temtem** — everything orbits 2v2 synergy (§6): synergy techniques that upgrade beside the right partner type, trait pairings, and switch-timing math against Hold penalties. Building a pair that covers each other is the game's core constructive act.
- **M.Sanctuary** — the most explicit role system in the set: monsters are designed as attackers, buffers, debuffers, or healers, and teams are built around *themes* — a "bleed team" where all three actives stack the same damage-over-time, a crit-aura team, a shield team. Choosing which 3 of your 6 fight, and the order they act (§6), is the formation layer.
- **C.Beasts** — a small active roster with deep per-tape customization: build around your intended fusion pair (§21), deliberate reaction chains (§7 — including transmuting your *own* type to dodge a bad matchup), and sticker allocation across tapes (§8).
- **WoFF** — team building IS formation: solve the Large/Medium/Small size puzzle for each totem (your two human leads' own size choice is part of it), sum the members' elemental affinities so no weakness poisons the stack (§7), and maintain up to four pre-configured stacks to swap between (§6).

**monster-realm (current):** species archetypes authored in content (tanky/fast sweeper/status/support — GDD §5), party + bench swap in a 1v1-active core; team synergy is currently *implicit* (coverage + swap timing). M.Sanctuary's "every monster has a role" is a named GDD inspiration for M7 team building.
**⚠ DIVERGENCE:** with a 1v1-active core, most formation mechanics (stacks, doubles synergy, slot costs) have nothing to attach to — this category's depth is *downstream of the §6 decision*. A Memory-style points budget for PvP team legality is the one formation lever that works today (and is a pure server-side rule).
**MMO-fit:** points-budget team legality = a game-core validation rule; trivial fit and a strong ranked-balance tool (see §19).

<!-- DECISION:team_building -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:team_building -->

## 11. Party & storage

**Genre overview.** Mostly commodity mechanics — except where storage itself becomes a system (SMT's paid Compendium, M.Rancher's lifespan-pausing Freezer, Palworld's storage-as-labor-pool, Pokémon HOME as paid cloud identity).

- **Pokémon** — six monsters travel with you; the rest live in PC storage boxes (~960 slots in-game). Pokémon HOME — a separate paid cloud subscription app with 6,000 slots — moves monsters between different game titles and generations, effectively the franchise's persistent account-level monster identity layer. Storage as a product.
- **Digimon** — *Story line:* 3 fighting + up to 8 reserves who still earn XP from battles; a large "DigiBank"; and farm islands where *stored* Digimon train stats and produce items while you play — storage that works for you rather than warehousing.
- **SMT** — 4 active from a carried stock of ~24–30; the standout is the **Demon Compendium**: a registry that permanently records every demon you've ever owned (with its custom fused build) and re-sells copies for escalating amounts of money. Storage doubling as (a) the game's biggest money sink and (b) a build library that makes fusing a beloved demon away *safe* — you can always buy it back.
- **Palworld** — 5 in your party; the "Palbox" at each base holds the rest — and Pals assigned to a base *are* its workforce (§14), so storage is literally a labor pool, not a shoebox.
- **M.Rancher** — one active monster (your current career); the **Freezer** stores others in stasis, which *pauses their aging* (§5) — storage as a strategic lifespan-management tool and stock for combining.
- **DQM** — 4 battle slots (Large monsters cost 2, §10), substitutable reserves, and a vault holding hundreds — which in practice is your synthesis ingredient stock (§4).
- **Temtem** — squad of six with box terminals in every town; account-bound server-side storage, as expected of an MMO.
- **M.Sanctuary** — 6 in the party, unlimited reserve, swap freely from the menu anywhere — deliberately frictionless so experimentation (free respecs, §8) stays cheap.
- **C.Beasts** — each human character carries a small active deck of six tapes; the rest sit in storage.
- **WoFF** — 12 Mirages carried (in the Maxima edition), remainder in the "Prism Case" accessed at save points.

**monster-realm (current):** party slots + box (M6/M9 box view with individuality surfaced — the H2 display surface), unbounded-ish storage, all owner-private (RLS-classified). Trading caps enforce conservation at boundaries.
**⚠ DIVERGENCE:** none pressing. If fusion/trade volume grows, an SMT-style "remember past builds" surface conflicts with monster uniqueness (individuals are not re-summonable by design — that's the point).
**MMO-fit:** storage rows are cheap; the only real constraint is subscription bandwidth (already flagged for RLS/M22).

<!-- DECISION:party_storage -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:party_storage -->

## 12. Wild encounter model

**Genre overview.** The genre has migrated from random grass (Gen 1–7, Temtem, WoFF) to overworld-visible spawns (SV, Legends, SMT V, Palworld, DQM Dark Prince, C.Beasts, Time Stranger) — visibility turns encounters from interruption into choice.

- **Pokémon** — the genre's whole migration in one franchise: Gens 1–7 used invisible random encounters (walk in tall grass, battles interrupt you at random); modern entries (Legends, Scarlet/Violet) show **every monster walking visibly in the overworld** — you choose which fights to take, sneak up for ambush advantage, or walk around what you don't want. Special layers: fixed "static" encounters for legendaries, mass-spawn "outbreaks," and food buffs/chaining methods that manipulate spawn and shiny odds for hunters.
- **Digimon** — *Story line:* followed the same modernization — random encounters in Cyber Sleuth's dungeons, visible overworld monsters (with field first-strike advantages) in Time Stranger.
- **SMT** — visible demons roaming the field (SMT V); sneaking up and striking first grants your side a full Press Turn opening (§6) — encounter *positioning* converts directly into combat currency.
- **Palworld** — pure open-world spawning: everything is visible, zoned by biome and level, with fixed "Alpha" boss dens, dungeons, and night-only species. No random encounters at all.
- **M.Rancher** — OMITTED: there are no wild encounters — monsters enter the game via the music database, the market, or combining (§1/§4); the fourth game added light expedition finds.
- **DQM** — visible overworld monsters whose **spawn tables rotate with the season/weather system**: winter freezes rivers (opening walkable areas with different monsters), summer dries lakes, and so on — the calendar is an encounter-table dial that keeps re-walking the same zones fresh.
- **Temtem** — classic random encounters in route grass and caves; a rotating "Saipark" safari zone features boosted species and Luma odds weekly; purchasable radar items chain repeated encounters with one species for shiny-hunting.
- **M.Sanctuary** — every encounter is hand-placed, visible, and respawnable in specific rooms — the map is authored like a level, not a spawn table; "Champion" minibosses serve as set-piece skill checks graded for rewards (§1).
- **C.Beasts** — visible monsters roam the open island; giant "**Rogue Fusion**" world bosses (two species fused, §21's mechanic gone feral) wander as raid targets for multiplayer (§20).
- **WoFF** — old-school invisible random encounters in fields and dungeons — the most traditional model in the set.

**monster-realm (current):** random grass-tile encounters rolled server-side on the movement tick, per-zone encounter tables (M8, content-as-data), bait/recruit integration; no overworld-visible monsters.
**⚠ DIVERGENCE:** the current model is the genre's *legacy* shape; the industry has decisively moved to visible spawns. Visible spawns in a shared MMO world are ALSO a social feature (players see the same rare spawn — contested moments) but a real netcode/rendering cost (spawn entities need replication, movement, despawn rules, contention resolution). DQM's season-rotation is a cheap *content* lever on the current model (rotate tables by server clock) that adds freshness without new entity tech.
**MMO-fit:** random-roll model is already deterministic and cheap. Visible spawns = new replicated entity class + contention design (who gets the monster?) — significant but standard MMO fare; a natural post-playtest candidate if "what's in this grass" (H1 hook) tests weak.

<!-- DECISION:encounters -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:encounters -->

## 13. World structure & exploration

**Genre overview.** Routes-and-towns (classic Pokémon, Temtem), open worlds (SV, Palworld, C.Beasts), metroidvania (M.Sanctuary), dungeon-crawl hubs (SMT, Digimon Story), menu-driven (M.Rancher), and chapter-linear (WoFF).

- **Pokémon** — Gens 1–8: the classic linear skeleton — numbered routes connecting towns, progress gated by gym badges and HM obstacles (a tree only Cut removes, water only Surf crosses). Gen 9 (Scarlet/Violet): a genuine open world where three questlines can be tackled in any order, "gated" only softly — enemy levels don't scale to you (walk into a hard area and get flattened) and some regions need ride-mount abilities (climb/glide/swim) won from boss fights.
- **Digimon** — *Story line:* hub cities you return to between instanced dungeon crawls through "cyberspace"; Time Stranger splits play between the real world and the Digital World. *World line:* a single island hub whose town literally grows as you recruit wild Digimon to move in (§1) — world progression IS recruitment progression.
- **SMT** — historically claustrophobic dungeon networks; SMT V opens into several large semi-open desert zones with strong verticality, hidden collectibles that buy skill-tree unlocks, and optional superbosses. Progression is gated by *difficulty walls* (areas you technically can enter but cannot survive) rather than keys.
- **Palworld** — an open-world survival sandbox across several large islands; progression gates are your crafted gear tier (tech tree), ambient enemy levels, and which flying/swimming mount Pals you've tamed — the world opens as your logistics mature.
- **M.Rancher** — no traversable world at all: a menu-driven ranch and a calendar (§5); you attend tournaments as dates, not places. Progression = climbing the trainer-rank tournament circuit.
- **DQM** — hub plus themed zones unlocked by story rank; the season system (§12) re-shapes terrain on a rotating schedule (frozen rivers become bridges), so the same map has multiple states; classic entries fed you randomized "traveler's gate" dungeons — an early roguelite touch in the genre.
- **Temtem** — six islands of routes, towns, and dojos (the gym-analog), structured linearly like classic Pokémon — but as a **shared-world MMO**: other real players visibly walk the same routes beside you. Traversal unlocks (surfboard, hoverboard, flying mount) arrive from story progress, not from your monsters.
- **M.Sanctuary** — a genuine **metroidvania** (see glossary): one interconnected side-view platforming map where reaching new areas requires specific monster field abilities (§14) — your collection literally unlocks the world, the tightest possible coupling of catching and exploring.
- **C.Beasts** — one open island explorable in any order from the start, soft-gated by traversal powers (§14) earned through the story's twelve ranger-captain progression; a DLC adds a zone.
- **WoFF** — linear chapter-driven progression through towns and dungeon corridors; the most rail-guided structure in the set.

**monster-realm (current):** hub town + 2 authored zones (~1–2 biomes) via the Tiled→RON pipeline (M11), warps/zone transitions, per-zone encounter tables, "short clear critical path + a little optional exploration" (GDD §5); shared world with visible players. **Planned:** roster/zone growth post-gate.
**⚠ DIVERGENCE:** zone-warp structure is settled engineering; the open question is *gating vocabulary* — monster-realm currently gates by story/rank only. Monster-ability gating (M.Sanctuary/C.Beasts) would coupple collection to exploration (strong genre-native hook) but requires §14 to exist first.
**MMO-fit:** zones are the netcode's native unit (zoned subscriptions/tick). More zones = pure content. Ability-gated doors are trivial server checks once field abilities exist.

<!-- DECISION:world -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:world -->

## 14. Monster utility outside battle

**Genre overview.** The genre's widest ideological split: monsters as traversal keys (HMs, M.Sanctuary abilities, C.Beasts powers), as labor (Palworld bases, Digimon farms), as mounts (SV, DQM, Palworld), or as nothing outside combat (SMT, Temtem).

- **Pokémon** — the genre's cautionary tale and its fix. **HMs** (Hidden Machines) made your battle monsters carry field moves — Cut to fell route-blocking trees, Surf to cross water — which consumed precious 4-slot moveset space (§8) and forced "HM slave" filler monsters; resented for twenty years and finally abolished. Replacements: **ride Pokémon** (game-provided mounts, no team cost), Let's-Go auto-battling (send your monster to fight/gather nearby on its own), and picnic-time egg/item production.
- **Digimon** — *Story line:* stored Digimon staff a farm that runs passive "investigations" and develops items while you play — idle utility from the bench (§11). *World line:* the partner simply *is* with you at all times — a life companion rather than a tool; no traversal gating.
- **SMT** — essentially OMITTED in the mainline; the one strong franchise experiment is the Devil Summoner: Raidou spin-offs, where demons investigate, possess NPCs, and traverse for you in a detective frame.
- **Palworld** — the game's actual center of gravity: Pals staff **automated bases** according to work-suitability tags (§10) — logging, mining, farming, transporting, generating electricity — while others serve as mounts and gliders, or as literal weapon platforms via Partner Skills (§8). Combat utility and labor utility trade off in the same creature.
- **M.Rancher** — inverted: monsters are *primarily* out-of-battle objects — training, errantry trips, expeditions (§5) — and battles are just the periodic exam. The ranch is the game.
- **DQM** — Dark Prince adds ride-on traversal (specific monsters fly or climb for you); nothing else — no field moves, no labor.
- **Temtem** — essentially OMITTED: mounts are equipment items, and your Temtem do nothing outside battle except exist as breeding/trading assets. A deliberate simplification the MMO structure never missed.
- **M.Sanctuary** — **every single species has one exploration ability** — flying mount, wall-smash, darkness-lighting, levitation, water-walking — used to progress the metroidvania map (§13). Party composition doubles as your traversal toolkit: your collection is your key ring, the tightest collection↔level-design coupling in the set.
- **C.Beasts** — recording milestone species grants the *human* character traversal moves (glide, dash, swim, climb, magnetism), stamina-limited in the overworld (§13) — monster abilities transfer to the player rather than the monster being summoned to help.
- **WoFF** — light and pleasant: field skills tied to *carrying* the right Mirage — one finds hidden chests, one melts ice walls, "Joyride" Mirages serve as mounts — an HM-analog without the move-slot tax because field skills aren't battle moves.

**monster-realm (current):** **OMITTED** — monsters currently do nothing outside battle. GDD takes Palworld's "collect-and-use companion feel" as an inspiration *without* base-building/survival.
**⚠ DIVERGENCE:** this is the largest wholly-unimplemented category with strong genre precedent, and the GDD's own Palworld line ("monsters as companions") is currently unexpressed in mechanics. A thin field-ability layer (per-species tags: light a cave, cross water, sniff out items — M.Sanctuary-shaped, content-as-data) is the natural ORIGINAL/ADAPT candidate; base-labor automation is explicitly out of scope (anti-idle pillar). Mounts conflict with tile-movement netcode (speed changes ripple through prediction) — flag as engineering-priced.
**MMO-fit:** field abilities as server-validated interactions with zone objects = clean fit (M11 object layer + M12 flags exist). Anything idle/automated collides with the active-only pillar (§5). Mount speed multipliers touch the movement prediction spine — the one high-cost item here.

<!-- DECISION:utility -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:utility -->

## 15. Collection meta

**Genre overview.** From "the thesis of the franchise" (Pokédex) to structural rewards (DQM: completion feeds synthesis recipes) to pay-per-release inversions (Temtem FreeTem).

- **Pokémon** — the Pokédex IS the product thesis ("Gotta catch 'em all"): an in-game register of every species seen and caught. Completing a regional dex awards the Shiny Charm (permanently better shiny odds — a collection reward that feeds the *next* collection hobby) and diplomas. Crucially, each generation ships as two versions with **exclusive species**, so full completion structurally *requires trading with other players* (§18) — collection engineered as a social engine.
- **Digimon** — a field guide exists, but the real collection meta is completing the **digivolution graph** — making every form reachable from your bank (§3). Rewards are modest; the pull is intrinsic/achievement-driven.
- **SMT** — Compendium completion percentage (§11) grants purchase discounts and completion bonuses; the deeper pull is the bestiary itself — a museum of real-world mythology (Norse, Hindu, Shinto…) that players want to fill for its own sake.
- **Palworld** — the "Paldeck" tracker, plus a clever twist: catching **ten of the same species** pays escalating XP bonuses, making mass capture a leveling *strategy*, not just a checklist; statue collectibles and journals reward map sweeps.
- **M.Rancher** — in-game breed/variant lists exist, but the real collection game is **external**: hunting which real-world songs/CDs generate rare monsters (§1), a community-catalogued treasure hunt that predates wiki culture.
- **DQM** — the smartest structural link in the set: monster-library completion **expands the synthesis possibility space** — every species you've owned becomes available as a breeding ingredient/recipe (§4), so collecting literally grows the crafting system; chasing the rank-X special recipes is the endgame.
- **Temtem** — the Tempedia, plus **FreeTem**: an in-game organization that pays you currency for every caught Temtem you *release*, with weekly bonus rewards — catch-and-release volume turned into an income loop (and a metered currency faucet the economy designers control).
- **M.Sanctuary** — dex/egg completion plus "5-starring" every Champion miniboss (§1) feed your keeper-rank progression; New Game+ offers randomizer-style replay options.
- **C.Beasts** — species completion, then **bootleg hunting** as the long tail — each species can appear in any element (§2), multiplying the collection space; multiplayer raids (§20) drop materials that let you *craft* a chosen bootleg, converting raid play into directed collection.
- **WoFF** — the Mirage Manual, side-quests rewarding exclusive Mirages, coliseum-only captures; rewards largely intrinsic/trophy-level.

**monster-realm (current):** **no formal dex/collection system** — the lean roster (~32 forms) is "completable" per GDD §3's long-term hook, and the box surfaces individuality, but nothing *tracks or rewards* completion. **Planned:** roster growth in M-playtest-d; nothing dex-shaped.
**⚠ DIVERGENCE:** collection is named in GDD §3/§8 as a core long-term hook ("complete the roster") with no mechanical carrier. A species-seen/recruited register with modest rewards is a small, high-leverage addition (content + one table); DQM's "completion unlocks fusion recipes" couples it to the existing fusion sink elegantly.
**MMO-fit:** a per-player collection register is a trivially additive private table; fits RLS classification; fusion-recipe gating is pure game-core data.

<!-- DECISION:collection -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:collection -->

## 16. Story, NPCs & quests

**Genre overview.** From scaffolding (Pokémon) to load-bearing branching morality (SMT) to full JRPG narrative (WoFF, Digimon Story, C.Beasts) to nearly none (M.Rancher — where the monster's biography IS the story).

- **Pokémon** — light, linear, and deliberately skippable-feeling: the gym circuit, a cartoonish villain team, and the champion fight form a pacing skeleton for the systems; nobody plays Pokémon for the plot, and the design accepts that.
- **Digimon** — *Story line:* fully load-bearing — Cyber Sleuth is a complete detective-plot JRPG with case-based side quests, and Time Stranger continues the cinematic-narrative focus; the story is a primary product feature. *World line:* almost no authored plot — the emergent *biography of your partner's lives* (§5) is the narrative.
- **SMT** — load-bearing but **branching**: dialogue and quest choices push you along Law / Neutral / Chaos **alignment routes** with different endings — the narrative weight sits in moral-philosophical choice architecture rather than plot volume. (The Persona sub-series inverts this: heavy linear narrative plus a social calendar.)
- **Palworld** — historically near-none; v1.0 shipped a story overhaul with a proper main quest, but the game remains sandbox-first — narrative as garnish on logistics.
- **M.Rancher** — near-OMITTED: a thin rank-up tournament frame with occasional event vignettes; each monster's finite career (§5) supplies the emotional arc instead.
- **DQM** — moderate: The Dark Prince tells a real Dragon Quest story (villain-protagonist Psaro) that gates zone access by plot rank — denser than Pokémon, far lighter than SMT.
- **Temtem** — surprisingly heavy for an MMO: a ~40-hour scripted campaign (the Clan Belsoto arc) plus a long post-game quest chain that gates the endgame areas — narrative as the on-ramp to the systems game.
- **M.Sanctuary** — a light "order of monster keepers" frame; story exists to scaffold exploration, and gets out of the way.
- **C.Beasts** — strongly load-bearing and unusually adult: a stranded-humans mystery, eldritch "Archangel" bosses, and companion relationship arcs (with romance) that *mechanically matter* — bond levels power fusion strength (§21). Story and systems interlock.
- **WoFF** — the most story-first of the set: a linear JRPG built around Final Fantasy crossover cameos, where the monster systems serve the plot rather than vice versa.

**monster-realm (current):** M12 flag-based NPCs/dialogue/quests (fetch/talk/defeat), deliberately **thin at launch** — "a minimal frame… the systems + individuality + social are the draw; narrative is an expandable content layer, not a launch dependency" (GDD §5). M-playtest-c adds tester onboarding/help.
**⚠ DIVERGENCE:** none — thin-by-design is a recorded decision, and the M12 engine (flags, branches) can carry more content whenever wanted. C.Beasts' companion-bond-feeds-power pattern is the one *mechanical* (not content) idea here, and it would need a companion system that doesn't exist.
**MMO-fit:** quest state is per-player flags (shipped); story volume is pure content cost.

<!-- DECISION:story -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:story -->

## 17. Economy & items

**Genre overview.** Single-player economies are low-friction faucet/sink loops; the MMO entrants (Temtem) and sandbox entrants (Palworld) show the two serious shapes: player-trade economies vs. production economies.

- **Pokémon** — a deliberately low-friction money loop: trainer battles pay out (faucet), shops sell balls/potions/gear (sink), and nothing ever really pressures the wallet. Gen 9 adds the franchise's first real crafting: TMs are built from **materials dropped by defeated monsters** — converting battle volume into build resources rather than just cash.
- **Digimon** — *Story line:* standard JRPG money and shops, with the DigiFarm developing items as a light pseudo-crafting loop (§11); economically shallow by design.
- **SMT** — deliberately *tight*, especially at high difficulty: demons extort cash ("Macca") during negotiations (§1), and Compendium re-summons (§11) price-scale steeply into the true endgame money sink. Money is a survival resource, not an afterthought — the genre's strongest single-player economy pressure.
- **Palworld** — gold and merchants exist (and Pals themselves can be bought and sold — monsters as commodities), but the real economy is **production**: the crafting/tech tree and your bases' automated output chains (§14). Wealth = infrastructure, not currency.
- **M.Rancher** — tournament prize money (faucet) against relentless upkeep — monthly food, training fees, errantry travel costs (sinks); cash pressure genuinely paces the early game, a rarity in the genre.
- **DQM** — gold is minor; the real currency is **monsters themselves** — scouting (§1) supplies synthesis fodder (§4), and time/levels (parents must reach L10+) are the true costs.
- **Temtem** — a single soft currency (Pansuns); after patch 1.7 removed all real-money monetization, every cosmetic became earnable in-game. Player wealth concentrates in **bred monsters** (§4) traded directly between players (§18) — prices negotiated in community channels, since there's no auction house.
- **M.Sanctuary** — minor: gold, shops, and equipment-upgrade costs; the economy exists to be ignored.
- **C.Beasts** — light currency and shops centered on stickers (§8) and consumables; no crafting or production layer.
- **WoFF** — classic Final Fantasy gil and shops; entirely single-player, no player economy.

**monster-realm (current):** single currency, **sink-heavy, metered-faucet** design (GDD §7): battle/quest faucets; shop, town-healing, fusion (hard monster sink), evolution-item sinks; caps with reject-not-destroy conservation (ADR-0113/M17.5); soulbinding under consideration; M20 economy metrics planned for live monitoring. Shops content-priced (M13).
**⚠ DIVERGENCE:** (a) no crafting anywhere — SV's "monster materials → TMs" is the genre's proven light-crafting shape and would add a faucet-to-sink conversion loop without base-building; (b) soulbinding is still an open GDD recommendation, not a decision — it directly interacts with §18 trading scope; (c) no auction-house/async market is a *deliberate* current gap (direct trades only) worth confirming as a decision rather than a default.
**MMO-fit:** crafting = reducers + content, easy. Market/auction structures are major integrity surfaces (pricing, sniping, RMT) — the corpus's threat-model discipline applies; defer-with-intent is a legitimate stance.

<!-- DECISION:economy -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:economy -->

## 18. Player-to-player trading

**Genre overview.** Trading works where scarcity is designed (Pokémon version exclusives; Temtem SV-economy) and dies where acquisition is solo-deterministic (SMT, DQM, M.Sanctuary). It is the genre's clearest "MMO-native" differentiator.

- **Pokémon** — the genre's founding social mechanic, foundational since the 1996 link cable: each generation's paired versions have **exclusive species**, and some monsters **only evolve when traded** — completion structurally requires other people (§15). Modern infrastructure: the **GTS** (post an offer asynchronously; any player worldwide can fulfill it), random "Surprise Trades," and the HOME app as a cross-game hub. The design lesson: trading thrives because scarcity is *designed in*, not emergent.
- **Digimon** — effectively OMITTED in modern entries: every species is obtainable solo through the scan/evolution systems (§1/§3), so there is nothing scarce to trade — a deliberate contrast with Pokémon.
- **SMT** — OMITTED: fusion is deterministic (anyone can manufacture any demon from the same recipe, §3), so no demon is scarce and trading would be pointless; the design closes the door structurally.
- **Palworld** — informal and synchronous only: a party-menu trade UI, shared guild storage, or literally dropping a Pal on the ground for someone — all within one server world; no asynchronous market or cross-world trade.
- **M.Rancher** — OMITTED: acquisition is personal and external (your music collection, §1); the social layer was physically lending CDs to friends — proto-trading outside the software.
- **DQM** — historically strong on handhelds (link-cable and wifi trading culture in the Joker era), diminished in The Dark Prince; everything is solo-completable, so trading is a convenience, not a need.
- **Temtem** — the genre's one real player-to-player market: a first-class in-game trading UI moving the products of the breeding economy (§4 — high-SV lineages, egg-move carriers), with prices negotiated in community channels since no auction house exists. Fertility caps (§4) keep supply bounded — which is exactly what keeps prices meaningful.
- **M.Sanctuary** — OMITTED: no trading of any kind.
- **C.Beasts** — added by the 2024 multiplayer update: trade tapes (with their stickers attached) with other players inside the shared world (§20); cross-platform.
- **WoFF** — OMITTED.

**monster-realm (current):** escrowed dual-consent trading (M15, ADR-0106–0108, 0112–0117): propose/respond/confirm, both-sides escrow guards, conservation at caps, TTL reaper, battle↔trade interlock; **fully hardened server-side but the propose UI is only now scheduled** (M-playtest-c) — human-unreachable today. Scarcity source: the wild IV/nature roll (GDD §7), H3's test subject.
**⚠ DIVERGENCE:** (a) monster-realm has *no designed trade-forcing scarcity* (no version exclusives, no trade evolutions, no zone-exclusive species yet) — Pokémon's lesson is that trading needs a structural reason, not just permission; zone/time-exclusive species are a pure-content lever; (b) async trading (GTS-style offers board) vs. the current synchronous-only model is the scale question for post-launch; (c) soulbinding scope (§17) bounds all of this.
**MMO-fit:** the hard part (escrow integrity) is done and battle-tested. Exclusivity is content. An async offer board is a new table + matching rules — moderate, and a natural M22-era feature once RLS lands.

<!-- DECISION:trading -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:trading -->

## 19. PvP & competitive

**Genre overview.** Two serious models: Pokémon's rotate-the-rules VGC circuit (+ Smogon's parallel community tiering) and Temtem's determinism-normalization-draft stack. Everyone else treats PvP as exhibition.

- **Pokémon** — two-tier competitive infrastructure. In-game: a ranked ladder (singles, plus the official **VGC** doubles format — see glossary) with seasonal resets. Officially: a global esports circuit balanced by **regulation rotation** — rather than nerfing overpowered monsters, each season simply changes *which monsters are legal to bring*, refreshing the meta by fiat. In parallel, the fan-run **Smogon** community maintains unofficial singles tiers (banning monsters into power brackets) that effectively govern non-VGC play. Entry cost is real — breeding/grinding a legal team takes hours — softened recently by borrowable rental teams.
- **Digimon** — *Story line:* Cyber Sleuth had online ranked seasons, but with thin balance maintenance a few degenerate builds dominated; PvP has never been a franchise pillar.
- **SMT** — OMITTED in the mainline: no competitive mode exists; every number is tuned purely for the single-player difficulty curve, which is part of why its systems can be so extreme.
- **Palworld** — v1.0's "Pal Arena": bring one main Pal plus two backups, your *player character's* gear and weapons count (consistent with §6), and lobbies support custom rules — level-sync toggle, Pal bans, damage multipliers. Duels are same-server only with no global ladder as of v1.0.1; the meta is a week old and unsettled.
- **M.Rancher** — exhibition versus between friends' saves (the DX remaster adds online versus); balance is essentially unmanaged — whoever raised bigger stats wins, and that's accepted as the point (your training IS the competition).
- **DQM** — online versus with rank tiers (and, in the Game Boy era, a real-world world-championship circuit); balance is loosely managed and degenerate trait combinations dominate high-level play.
- **Temtem** — the genre's most serious formal stance, built from three pieces: **ranked matchmaking** with a rating; a **pick/ban draft** (bring 8 monsters, each side bans 2 of the opponent's, pick 5 to field) that punishes one-trick teams; and **partial normalization** — levels raised to the cap and SVs maxed to 50, but trained TVs preserved — so the *luck* of the catch is erased while deliberate training investment stays competitive. Combined with no-RNG combat (§9): fairness by construction. (Verified vs. Crema's Ranked Update notes.)
- **M.Sanctuary** — online "Keeper Duels" with a thoughtful first-mover handicap (the player acting first uses only 2 of their 3 monsters that turn — tempo compensation), stalemate timers, and leaderboards; balance-patched historically but no live seasons.
- **C.Beasts** — casual online 1v1 with toggleable house rules (e.g. disabling sticker riders); a social feature, not competitive infrastructure — no ladder, no seasons.
- **WoFF** — effectively OMITTED: the coliseum is a solo AI mode; a vestigial online battle feature existed but no meaningful competitive layer.

**monster-realm (current):** challenge/accept PvP (M16) with turn deadlines/forfeit/disconnect handling; persistent integer-Elo ranked ladder + public leaderboard (M17, ADR-0119/0120); server-authoritative throughout; **no normalization, no formats, no draft — raised stats carry into ranked**. Balance lever: the affinity chart as data + live-ops (GDD §6).
**⚠ DIVERGENCE:** the sharpest philosophical fork in the survey. Pillar #1 says *your* raised individual matters (raising must be felt in PvP); the opposite pole is full normalization (erase all raise-state for fairness). **Temtem itself already occupies the middle ground**: it normalizes the *luck* axes (levels to cap, SVs maxed) while **preserving trained TVs** — deliberate investment stays competitive, RNG doesn't. That maps directly onto monster-realm's stat model: normalize levels+IVs in ranked, keep EVs (the active-investment lever) and nature raw — luck-free but raise-felt. Current implementation is fully un-normalized — closest to Pokémon-without-rentals, which has the worst entry-cost problem. Other middle paths: normalized "friendly" queue + raw ranked queue; Memory-style team budgets (§10); regulation rotation as content. This decision shapes whether H3 ("fairness makes individuals valuable") reads as *fair* to the losing side.
**MMO-fit:** normalization is a game-core stat projection — cheap. Formats/regulation sets are data. Matchmaking beyond challenge-based (queue/MMR pairing) is the real engineering item, already adjacent to M17's profile.

<!-- DECISION:pvp -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:pvp -->

## 20. Co-op & multiplayer social

**Genre overview.** The genre is weakly multiplayer outside the MMO entrants: SV raids are mainline Pokémon's ceiling; Temtem is the only true shared-world MMO; Palworld does server co-op; C.Beasts added 8-player shared worlds; half the roster has nothing.

- **Pokémon** — mainline's ceiling: Scarlet/Violet's "Union Circle" lets 4 players roam the open world together, but activities stay mostly parallel (you can't share most quests); the real co-op pillar is **Tera Raids** — 4-player simultaneous-turn boss battles against a super-powered monster on a timer, with limited-time event raids (7-star difficulty, exclusive monsters) as the franchise's live-ops engine; "Mystery Gift" codes distribute event content.
- **Digimon** — essentially OMITTED in both lines: no raids, no co-op; the franchise's MMO ambitions lived in separate products (e.g. Digimon Masters Online), never in these RPGs.
- **SMT** — OMITTED beyond light asynchronous features (other players' death markers, network gifts) — resolutely single-player.
- **Palworld** — the sandbox approach: 4-player co-op worlds and 32-player dedicated servers with guilds; raid bosses are **summoned at a crafted altar with a consumable slab** — the raid key is an economy sink you manufacture (§17) — plus wave-defense raids added in 1.0.
- **M.Rancher** — OMITTED beyond the versus mode; the franchise's social layer was always physical (lending CDs, §18).
- **DQM** — OMITTED beyond 1v1 versus battles; no cooperative play.
- **Temtem** — the only true MMO shell in the set: a persistent shared world with chat and clubs (guild-analog); the *entire campaign* is playable in 2-player co-op (both tamers fight in the shared 2v2 battles, §6); endgame offers 3–5-player **Lair raids** — roguelike co-op dungeon runs (see glossary) with randomized resources — plus solo/duo challenge modes.
- **M.Sanctuary** — OMITTED beyond online duels; a single-player game with a PvP bolt-on.
- **C.Beasts** — the 2024 update added 8-player shared-world sessions with crossplay: co-op exploration, trading (§18), casual PvP (§19), and co-op raids against roaming **Rogue Fusion** world bosses (§12) whose material drops feed directed bootleg-crafting (§15) — small-scale but complete.
- **WoFF** — OMITTED: strictly single-player; the "champion summons" are AI cameos, not players.

**monster-realm (current):** the shared world itself is live (zones, visible players, chat-less); trading + PvP + ladder are the current social surface. **Planned (post-gate, demoted):** M18 co-op raids (2 allies vs AI boss, additive orchestration over the battle core), M19 guilds/chat/social (untrusted-content threat model ready). GDD §8: the social fabric is pillar #4 and the long-term retention engine.
**⚠ DIVERGENCE:** none in direction — the plan matches the genre's best practice (raids as the co-op anchor, guilds as identity). Two genre patterns worth folding into M18/M19 elaboration when they un-park: consumable raid keys (Palworld) as an economy sink coupling, and directed rare-variant rewards from raids (C.Beasts bootleg-farming) as the §15 collection coupling.
**MMO-fit:** native territory; M18's additive-battle-orchestration sketch is architecture-aligned. Chat is the threat-model heavyweight (M19, correctly post-gate).

<!-- DECISION:coop_social -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:coop_social -->

## 21. Battle-scoped burst / transformation states

**Genre overview.** A distinct modern category the classic taxonomy misses: temporary in-battle power states — Pokémon's rotating generational gimmicks (Mega/Z/Dynamax/Tera), SMT's Magatsuhi gauge, C.Beasts' fusion-as-battle-state, WoFF's stack/unstack tempo, Digimon Story's cross-combos. Games use these to (a) create comeback/tempo decisions and (b) give each generation an identity.

- **Pokémon** — the signature practitioner: each generation ships ONE temporary super-mechanic, deliberately retired when the next generation arrives — **Mega Evolution** (a stronger battle-only form while holding an item), **Z-Moves** (one huge attack per battle), **Dynamax** (three turns of doubled HP and boosted moves), and currently **Terastallization** (once per battle, permanently-for-that-fight change your monster's type to a pre-chosen one). Purpose: give each generation a mechanical identity and every battle a once-per-game tempo decision.
- **Digimon** — *Story line:* light combo/guard-order systems (Cross-Combos in Time Stranger); present but not central.
- **SMT** — the **Magatsuhi gauge**: fills passively over turns; spend it for a party-wide super-turn (e.g. guaranteed criticals — which also refund Press Turn icons, §6) or special skills; SMT V: Vengeance adds combination skills unlocked by fielding demons of matching races together. Deterministic accrual, declared spend — the cleanest, most balance-friendly burst economy in the set.
- **Palworld** — OMITTED: the real-time action core (§6) generates its own tempo; no gauge needed.
- **M.Rancher** — OMITTED.
- **DQM** — light "tension/pep"-style boost mechanics in some entries (charge up for a bigger hit); minor.
- **Temtem** — deliberately OMITTED: a comeback burst is exactly the kind of swing mechanic the determinism thesis (§9/§19) exists to avoid.
- **M.Sanctuary** — OMITTED as a separate layer: the combo meter (§6) IS the tempo system, built into every ordinary turn.
- **C.Beasts** — **fusion as a battle state**: mid-fight, your two active monsters can merge into a single giant combined form — summed stats, merged move lists, a procedurally generated name and look — with duration/strength powered by your human companions' relationship levels (§5/§16). Burst mechanic as narrative payoff: the power spike *is* the relationship made visible.
- **WoFF** — stacking/unstacking (§6) IS the tempo mechanic — build the totem for power, break it for actions, risk topple either way; no separate gauge exists because formation is the burst.

**monster-realm (current):** **OMITTED** — no burst/gauge/temporary-transformation layer exists or is planned.
**⚠ DIVERGENCE:** genuinely open design space rather than a gap — the M7/M14 core is deliberately legible, and a gauge-style burst (SMT Magatsuhi shape: deterministic accrual, spend on a declared super-move) is the variant most compatible with the fairness/knowledge pillars, PvP comeback dynamics, and integer determinism. A bond-powered burst would also give the bond stat (currently evolution-gating only) a battle-facing payoff — an ORIGINAL hybrid with C.Beasts' relationship-fuels-power idea, minus fusion-of-forms.
**MMO-fit:** a gauge is battle-state + game-core rules — fully additive (ADR-0023 pattern), no netcode impact. Rotating-gimmick-per-season is live-ops content the data-driven core could support later.

<!-- DECISION:burst_states -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:burst_states -->

## 22. Difficulty, endgame & replayability

**Genre overview.** Post-story structures: rematch facilities and raid treadmills (Pokémon), superboss gauntlets (SMT), NG+/randomizers (M.Sanctuary), roguelike endgame suites (Temtem's Tamer's Paradise), tournament circuits (M.Rancher's whole game), perfect-monster chases (everyone).

- **Pokémon** — the live treadmill: ranked ladder seasons (§19) and rotating limited-time event raids (§20) keep the game "new" between generations; the evergreen solo chases are shiny hunting and breeding perfect-IV individuals (§2/§4); historically, "Battle Tower" facilities offered escalating AI win-streak challenges with prize currency — the genre's classic post-game structure.
- **Digimon** — *Story line:* post-game dungeons and superbosses, plus the long ABI-maxing grind (§2) required to unlock the most demanding final forms — evolution-graph completion as endgame.
- **SMT** — famously brutal optional **superbosses** (often harder than the final boss and treated as the real exam); NG+ replays down different alignment routes (§16); and the true endgame activity is fusion-crafting bespoke counter-teams for specific walls (§3) — the build system is the endgame.
- **Palworld** — tower bosses and summoned raids (§20), tech-tree completion, and the breeding-perfection chase (§4); v1.0's endgame shape is a week old and still settling.
- **M.Rancher** — no "post-game" exists because the tournament circuit and multi-generation lineage optimization (§4/§5) ARE the game: climb to the S-rank tournaments across as many monster lifetimes as it takes.
- **DQM** — chasing the rank-X special synthesis recipes (the rarest monsters requiring long breeding chains, §4) and post-game tournaments.
- **Temtem** — the deepest formal endgame suite in the genre, explicitly built to retain non-PvP players: **Tamer's Paradise**, a hub of rotating weekly modes — a draft arena (build from random picks), an endless challenge tower, co-op Lair raids (§20) — plus the Luma/perfect-SV chase and weekly dojo rematches for income. The design lesson monster-realm's ⚠ flag cites: an MMO needs rotating PvE challenge for the half of the audience that won't ladder.
- **M.Sanctuary** — NG+ with randomizer-style remix options, community-embraced challenge modes (the permadeath "Bravery" mode), and 5-starring every Champion (§1) as completionism.
- **C.Beasts** — bootleg-collection completion (§15), Rogue Fusion raid farming (§20), and a DLC zone; modest but coherent.
- **WoFF** — Maxima's EX dungeons, coliseum rematches, and NG+ — traditional single-player post-game fare.

**monster-realm (current):** **no designed endgame layer** — the implicit endgame is perfecting individuals (IV/nature chase, GDD §6 "keep perfecting an endgame"), the ranked ladder (M17), and eventually raids (M18). No rematch facility, no NG+-analog (meaningless in an MMO), no rotating challenge content.
**⚠ DIVERGENCE:** acceptable pre-playtest; but the ladder + perfect-chase alone historically bleed non-competitive players. Temtem's lesson: an MMO needs *rotating PvE challenge* (their Lairs) for the non-PvP half. M18 raids are the planned answer — when elaborated, consider Temtem's roguelike-run shape (bounded, fresh weekly) over a static boss list.
**MMO-fit:** rotating challenge content = content + a schedule table; the battle core carries it. Nothing architecture-hostile.

<!-- DECISION:endgame -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**
> **Priority:**
<!-- /DECISION:endgame -->

---

## 23. Wildcard signature mechanics (don't fit the taxonomy)

Distinctive mechanics with no clean category home, listed for à-la-carte consideration. Fill the single decision block below with per-row verdicts (e.g. `negotiation: DEFER, media-gen: OMIT, ...`).

| ID | Mechanic | Game | One-line shape | MMO-fit note |
|----|----------|------|----------------|--------------|
| `negotiation` | Demon negotiation dialogue | SMT | Mid-battle social minigame as acquisition | Fits M12 dialogue + server RNG; content-heavy |
| `media-gen` | External-media monster generation | M.Rancher | Real-world artifacts → deterministic monster | Identity-defining but anti-scarcity in an MMO economy; near-certain OMIT |
| `press-turn` | Press-turn economy | SMT | Affinity knowledge ⇄ action economy | See §6; biggest single battle-feel lever available |
| `compendium` | Compendium buy-back | SMT | Re-summon past demons for money | Conflicts with individual-uniqueness thesis |
| `memory-cap` | Memory/points team budget | Digimon Story | Roster legality as a points budget | Cheap, strong ranked-balance tool (§10/§19) |
| `lifespan` | Lifespan/death/rebirth loop | M.Rancher, Digimon World | Mortality as progression currency | Breaks investment-safety pillar; consciously reject |
| `fertility` | Fertility-limited breeding | Temtem | Per-lineage output cap as anti-inflation | THE enabling tech if breeding is ever adopted (§4) |
| `perf-catch` | Performance-graded acquisition | M.Sanctuary | Fight quality gates drops | Needs combo metrics the 1v1 core lacks |
| `battle-fusion` | Fusion as temporary battle state | C.Beasts | Two actives merge, bond-powered | Bond-powered burst variant noted in §21 |
| `stacking` | Stat-merging stack formations | WoFF | Party as L/M/S totems | Incompatible with 1v1 core; OMIT unless §6 resets |
| `work-suit` | Work-suitability labor | Palworld | Creature stats as factory throughput | Collides with anti-idle pillar |
| `raid-keys` | Consumable raid summons | Palworld | Crafted one-use altar keys | Clean economy-sink coupling for M18 |
| `season-rot` | Season/weather world rotation | DQM | Server-clock rotation of spawns/terrain | Cheap freshness lever on current encounter model (§12) |
| `free-release` | Pay-per-release collection | Temtem (FreeTem) | Releasing monsters pays currency | Metered faucet candidate; watch bot-farming |
| `visible-odds` | Visible scout % | DQM | Show recruit odds before committing | Trivial, honest; strengthens H1's "puzzle not slot machine" |
| `gen-gimmick` | Rotating generational gimmick | Pokémon | One impermanent super-mechanic per era | Live-ops-scale idea for post-launch seasons |
| `avatar` | Player-as-combatant | Palworld, WoFF Maxima | The trainer fights too | Rejected implicitly by ADR-0017; confirm |

<!-- DECISION:wildcards -->
> **Decision (Drew):** PENDING
> **Sources to draw from:**
> **Notes / constraints:**   <- per-row verdicts, e.g. "memory-cap: ADAPT for ranked; lifespan: OMIT; ..."
> **Priority:**
<!-- /DECISION:wildcards -->

---

## 24. Sources & research provenance

Research performed 2026-07-17 by two subagents with live web search; facts cross-checked against the version anchors in §0. monster-realm facts verified against the corpus and the reviewed implementation @ `9a74e2a`.

- **Pokémon:** official SV Terastal guide (scarletviolet.pokemon.com); Serebii (Terastal/raids); Wikipedia (SV); Bulbapedia (IV/EV/breeding).
- **Digimon:** RPG Site + Bandai Namco official (Time Stranger mechanics); GameFAQs personality guide; Wikimon (World/Next Order care systems).
- **SMT:** Megami Tensei Wiki (Essences); Samurai Gamers (SMT V:V essence fusion); Game Rant (fusion); Wikipedia (SMT V).
- **Palworld:** v1.0 patch notes (SteamDB/official, July 2026); palworld.wiki.gg (Arena); Game8 updates hub; Push Square (1.0 launch). *Caveat: v1.0 is ~1 week old; PvP/raid meta unsettled.*
- **Monster Rancher:** LegendCup (MR2DX song database); TheGamer + GameFAQs (DX database guides); Steam community (DX changes).
- **DQM:** Game8 (synthesis, talent evolution); DualShockers (synthesis); RPG Site (Dark Prince review — seasons/sizes).
- **Temtem:** Crema official patch notes; PC Gamer (1.7 monetization removal/content freeze); MMOs.com (1.8 maintenance mode); temtem.wiki.gg (Tamer's Paradise).
- **Monster Sanctuary:** Team17 (PvP update); Monster Sanctuary Wiki (Keeper Duels); Steam.
- **Cassette Beasts:** official wiki (Multiplayer, Abilities); Xbox Wire (multiplayer update); Game Rant (overworld abilities).
- **WoFF:** Square Enix official (Maxima features); LadiesGamers (Maxima review).
- **monster-realm:** `game-design.md` §1–§12; `PLAN.md`; specs M6–M19; `playtest-replan-2026-07.md`; project `docs/adr/DIGEST.md`, `ARCHITECTURE.md`; implementation review @ `9a74e2a` (2026-07-17).
