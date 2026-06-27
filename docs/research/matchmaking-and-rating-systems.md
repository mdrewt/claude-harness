---
title: Matchmaking & rating systems for competitive games
slug: matchmaking-and-rating-systems
domain: multiplayer
tags: [matchmaking, elo, glicko, trueskill, mmr, ranked, competitive, fairness, smurfs, party-play, pick-ban]
status: active
updated: 2026-06-27
confidence: high
sources: 14
supersedes:
abstract: "Portable deep reference on skill-rating math (Elo/Glicko/TrueSkill), hidden MMR vs visible rank, queue-time tradeoffs, placement/decay, team/party aggregation, pick/ban, and integrity."
---

## Scope

A **project-agnostic** deep reference covering every major subsystem of competitive matchmaking:
the math behind skill rating systems (Elo, Glicko-2, TrueSkill/TrueSkill2); the deliberate
split between hidden matchmaking rating and displayed rank; the core engineering tradeoff between
match quality and queue time; placement matches and rank decay; team/party MMR aggregation and
role-queue fairness; pick/ban draft phases; and matchmaking integrity (smurfs, boosting, throwing,
and alt-account detection). Written to inform brainstorming, planning, or review on any
multiplayer competitive game without assuming a specific project's tech stack, genre, or roadmap.
Pairs with [[monster-taming-mechanics]] where ranked PvP is layered onto a creature-collector
format (as Temtem does).

## Key findings

### 1. The Elo system — foundational math

Elo (Arpad Elo, 1960; adopted by FIDE for chess) is a two-player, win/loss rating system whose
core formula is:

```
R' = R + K × (S − E)
E  = 1 / (1 + 10^((R_opponent − R) / 400))
```

- **E** is the expected score (probability of winning), ranging from near 0 to near 1.
- **S** is the actual result: 1 (win), 0.5 (draw), 0 (loss).
- **K** is the sensitivity factor — how many points a single result can move the rating.
  FIDE uses K=40 for new players, K=20 for established players, K=10 for top players.
  Higher K = more volatile; lower K = more stable but slower convergence.

A 200-point gap implies roughly 76% expected win rate for the higher-rated player. The 400-point
divisor in the exponent is a calibration constant; some implementations use 800 instead.

**Strengths:** simple, interpretable, easy to implement, cheap to compute.
**Weaknesses:** treats all players as equally "known" (no uncertainty); requires many games to
converge for new players; designed for 1v1, not teams or multi-player formats; vulnerable to
inflation/deflation over time; rating doesn't distinguish "we haven't seen you play much" from
"you are genuinely this skill level."

### 2. Glicko and Glicko-2 — adding uncertainty

Mark Glickman (Boston University) introduced **Glicko** (1995) and **Glicko-2** (2001) to fix
Elo's inability to model uncertainty. Each player carries three quantities:

- **r** — the rating mean (same concept as Elo).
- **RD** (Rating Deviation) — one standard deviation of uncertainty; a 95% confidence interval
  for true skill is [r − 2·RD, r + 2·RD]. A new player has RD ≈ 350; a well-established player
  might have RD ≈ 30–50.
- **σ** (volatility, Glicko-2 only) — how erratically the player's underlying performance
  fluctuates. High after a period of inconsistent results; low after sustained consistency.

Updates happen in **rating periods** (batches of games, e.g. one week). A player who does not
compete in a period has their RD inflated by σ² — the system becomes less certain about them
over time, which naturally implements rank decay: their confidence interval widens until new
results narrow it. Glickman's worked example (a 1500-rated player defeating a 1400 opponent
but losing to 1550 and 1700) produces r' = 1464, RD' = 152, σ' ≈ 0.060 — the win against a
lower-rated player yields less gain than intuition suggests because the 1700-rated opponent's
loss carries high information.

**Key invariant:** the update formula weights each game outcome by g(φ_j), a function that
de-weights opponents whose own RD is high (i.e., less-reliable opponents count less). This is
a major practical improvement over Elo.

**Implementations:** Counter-Strike 2, Dota 2 (CS2 uses Glicko-2 as its underlying rater),
Guild Wars 2, Lichess, Chess.com, Pokémon Showdown, Splatoon 2. Glicko-2 is in the public
domain; Glickman's reference implementation and example PDF are freely available at glicko.net.

### 3. TrueSkill and TrueSkill 2 — Bayesian, team-aware

Developed at Microsoft Research (Herbrich, Minka, Graepel; deployed on Xbox Live in 2005,
described using Halo 2 beta data), **TrueSkill** models each player's skill as a Gaussian
N(μ, σ²) and infers posterior beliefs after each match using **factor graphs** and
**expectation propagation**.

The "displayed rating" convention is μ − 3σ — a conservative lower bound that has roughly 99%
probability of being below the player's true mean. This means low σ (high certainty) raises
displayed rating even without improved mean skill, creating a strong incentive to keep playing.

TrueSkill natively handles:
- **Multi-player and team games** (any number of teams, any team size).
- **Partial orderings** (not just win/loss — place 1st through Nth in a battle royale).
- **Uncertainty collapse on early games**: σ falls rapidly at first, then plateaus — this is
  the natural "placement match" behavior without requiring an explicit placement phase.

**TrueSkill 2** (Minka, Cleven, Zaykov; Microsoft Research, 2018) extended the model to
incorporate per-game signals beyond win/loss: kill counts, squad membership, player experience,
tendency to quit, and cross-mode skill transfer. TrueSkill 2 achieves **68% match-outcome
prediction accuracy vs. 52% for TrueSkill** on Halo 5 data. The improvement comes from richer
evidence, not architectural change — the Bayesian framework absorbs new signals cleanly.

**Proprietary note:** TrueSkill is patented by Microsoft and requires a license for commercial
use. TrueSkill 2 is described in a public paper but the implementation is not open-sourced.
Glicko-2 is the closest open equivalent for team-aware use.

### 4. Choosing a rating system

| Criterion | Elo | Glicko-2 | TrueSkill |
|---|---|---|---|
| 1v1 only | Native | Native + uncertainty | Multi-player native |
| Team / multi-player | Workarounds | Workarounds | Native |
| Uncertainty tracking | None | RD + σ | σ (single value) |
| Per-game updates | Yes | Rating-period batch | Yes |
| Open/free | Yes | Yes (public domain) | No (patent) |
| Complexity | Low | Medium | High |
| Transparency to players | High | Medium | Low |

**Rule of thumb:** use Elo if you need simplicity and 1v1, Glicko-2 if you need uncertainty
modeling and want open-source freedom, TrueSkill if you need team-game support and can accept
patent licensing. For indie/small-team games, Glicko-2 is the pragmatic default.

### 5. Hidden MMR vs. displayed rank

The most influential matchmaking architecture pattern, popularized at scale by League of Legends
and adopted universally across competitive games:

- **Hidden MMR** (Matchmaking Rating): the real signal used to find opponents. Updated
  continuously, reflects actual game outcomes. Players do not see the raw number.
- **Displayed rank** (tiers, divisions, LP, SR, RR, Elo visible label): a cosmetic
  translation of MMR into a progression system with floors, ceilings, tiers, and promotion
  matches. Provides visible, motivating milestones while decoupling the raw signal from
  psychological pressure.

Why hide MMR? Riot's rationale: raw MMR stripped of context is misleading (different queues,
different game states), and visible precision encourages unhealthy behaviors like queue-dodging
or obsessive number-watching. The rank layer provides richer context — where you stand relative
to the population, what division you're progressing through. LP gains and losses are calibrated
to close the gap between your hidden MMR and your displayed rank: if your MMR is significantly
above your displayed rank, you earn more LP per win than you lose per defeat ("LP gain is
lopsided in your favor").

Overwatch 2 moved in the opposite direction in Season 9: SR became directly equal to MMR,
removing the cosmetic buffer. This simplified the system at the cost of more volatile displayed
numbers, which the community found disorienting.

**Implication for designers:** a hidden-MMR + displayed-rank split is almost always the right
call for casual-to-competitive games. The rank provides the retention hook (tiers, promotion
ceremonies, end-of-season rewards) while the hidden signal ensures match quality is not gamed
by rank chasers.

### 6. The match-quality vs. queue-time tradeoff

This is the fundamental operational tension in matchmaking and has no universal answer. AWS/
Amazon GameLift architect Bruce Brown's framework (2017) defines it as: start from the player's
tolerance for waiting (informed by match length, sessions-per-session, casual vs. competitive
split), then relax skill constraints iteratively as time passes.

In practice, most systems implement **expanding search radius**: begin with a tight MMR window
(e.g., ±50 points), then widen every N seconds until a match is found or a hard cap is reached.
Key levers:
- **Player population size** — small populations cannot sustain tight matchmaking at all hours;
  server region consolidation or cross-region matching is often required at off-peak times.
- **Queue segmentation** — ranked vs. casual, role-queue vs. fill, party vs. solo all create
  sub-pools that must each be large enough to sustain quality.
- **Hard quality floors** — Valve added a minimum match-quality floor to Dota 2 to prevent the
  system from creating genuinely terrible matches just to reduce wait time; the tradeoff was
  longer queues for some players.
- **Role/autofill pressure** — League of Legends data shows that mid lane is 2–3× more popular
  than support in most regions. Autofill (assigning a player their non-preferred role) is
  necessary to keep queue times viable, but autofilled players perform worse, degrading match
  quality. Riot's 2024 priority is autofill parity (equal autofill counts on both teams) rather
  than autofill elimination.

**Apex Legends** (2024) introduced Continuous Window Matchmaking (CWMM), dynamically adapting
the skill window to real-time population, separately from Ranked (which uses RP as the matching
signal). This decouples casual and competitive matchmaking design.

### 7. Placement matches and rank decay

**Placement matches** are not a blank slate — they are a confidence-building window. Two players
who both go 5-0 in placements will land in different ranks if their pre-placement MMR estimates
differ. Placements simply compress the uncertainty collapse (equivalent to Glicko-2's RD falling
after active play). Common implementations use 5–10 placement games before revealing a rank.

**Seasonal soft resets** pull all ranks toward a mid-point (e.g., Diamond → Platinum) without
erasing underlying MMR. This creates re-engagement: players feel progress is "on the line" at
season start, boosting early-season activity. CS2 resets Premier Elo and map-specific ranks at
each seasonal leaderboard boundary. Valorant drops players 1–2 tiers per Act.

**Rank decay from inactivity** enforces that displayed rank reflects current performance, not
historical peak. Mechanically: after N days (typically 14–30) without a ranked game, the
player's displayed rank is hidden and may decay, requiring activity to restore it. Overwatch 2
removed inactivity decay in 2023; Valorant hides rank after 14 days but does not decay it; most
games find a middle ground. Decay is most important at the top of ladders (preventing rank-
campers from holding peak positions without playing).

### 8. Team and party MMR aggregation

When a pre-formed party (2–5 players) enters a queue, the system must estimate their combined
threat level. Approaches:

- **Mean MMR:** simple average of all members. Underestimates coordinated teams.
- **Adjusted/bonus MMR (Dota 2):** parties receive an upward adjustment to mean MMR,
  compensating for voice/coordination advantages. Large skill spreads within a party receive a
  higher bonus (the high-skill member carries harder than their MMR suggests in an uncoordinated
  team). Maximum MMR spread in a Dota 2 party: 2800 MMR. Solo vs. party LP/MMR change
  differential: ±30 solo, ±20 party in Dota 2.
- **Constraint matching:** each team should have the same number of parties (Dota 2: "each
  team contains about the same number of parties"). Five-player full parties are matched only
  against other five-player parties.
- **Role-based MMR (Overwatch 2):** each role (Tank, Damage, Support) carries a separate SR.
  Role Delta logic: if one team has a vastly higher-rated Tank, the imbalance shows up in
  win rates even with otherwise equal team skill; per-role ratings correct for this.
- **Lane opponent targeting (LoL exploration, 2024):** matching players based on lane-opponent
  skill rather than team mean — a mid laner's match quality is determined by who they face in
  lane, not the aggregate. Riot identified this as promising but not yet shipped due to
  queue-time cost.

### 9. Pick/ban phases

In games with large hero/character rosters, the **draft phase** (pick/ban) is a separate fairness
subsystem layered on top of matchmaking. It does not affect who is matched but does affect how
much the match outcome is skill-determined vs. composition-determined.

Standard pattern (as in League of Legends and Dota 2 competitive, and Temtem ranked):
- **Ban phase first:** each team bans N characters, removing them from selection. Bans target
  meta-dominant picks, counter picks, or opponents' signature characters.
- **Snake pick order:** teams alternate picks in a mirrored sequence (e.g., 1-2-2-1-2-2-1-1)
  so that the team picking first does not accumulate an unfair advantage. First pick is
  valuable for securing a contested character before the opponent can.
- **Draft as information:** partially-revealed opponent picks inform later picks; full information
  only at the end. This adds a strategic layer independent of in-game skill.

For ranked play in a creature-collector or hero-based game, pick/ban is the single most effective
tool for ensuring that composition-based imbalances do not determine outcomes at high ranks.
Temtem's ranked 8-member squad with pick/ban is the genre exemplar (see [[monster-taming-mechanics]]).

### 10. Engagement-Optimized Matchmaking (EOMM) — a cautionary system

The **EOMM paper** (Chen et al., WWW 2017, EA Research) challenged the assumption that fair
matches maximize player retention. Their core finding: using churn rate (quit probability) as
the engagement signal and modeling it per match outcome, the optimal matchmaking policy is
**not** to match equal-skill players but to maximize the expected engagement-weighted outcome
across the player pool. On 36.9M matches from an EA title (2016 data), EOMM reduced churn
measurably compared to skill-parity matchmaking.

This finding is valid but ethically contested. The implication: a system optimized for retention
might deliberately give a frustrated player an easy win, or deprive a high-performer of a
promotion to extend their engagement arc. This is **engagement manipulation**, not fairness.
It conflates what keeps players in the game short-term with what is good for them or for the
community long-term.

Design recommendation: **do not implement EOMM as the primary matchmaking objective.** Skill
parity remains the fairness contract players expect. EOMM insights can legitimately inform
secondary decisions — e.g., ensuring new players get a first win relatively early to anchor
retention — but should not override the core matching signal. Transparent fairness is a trust
asset.

### 11. Matchmaking integrity — smurfs, boosting, throwing

**Smurfs** (experienced players on new accounts) are the most player-perceived fairness problem.
Riot's Valorant data (2022): smurf stomp rate (one team wins 8+ rounds ahead) was 32% in
smurf-contaminated matches vs. a baseline target near 5–10%. Approaches to mitigation:

- **Behavioral detection via machine learning:** anomalous accuracy, reaction time, aim movement
  curves, or win/loss patterns relative to account age. Valorant's automated smurf detection
  (2022) adjusted detected smurfs' MMR up to their estimated main-account level; detected smurfs
  reached correct MMR in ~4 games vs. ~10+ for undetected ones. Global rollout cut smurf counts
  ~17%.
- **Fast-track convergence:** TrueSkill2-style systems can converge new accounts 3× faster than
  Elo by using richer signals (kill stats, movement patterns) beyond win/loss.
- **Social/structural fixes:** Valorant allowing any-rank 5-stacks (Patch 3.10) removed the
  most common legitimate motivation for creating smurfs (playing with lower-ranked friends).
  5-stack fairness improved because main-account play replaced smurf play.
- **Smurf counts among lower ranks:** estimates of 27% of matches in lower brackets featuring
  at least one smurf during peak periods illustrate the population's sensitivity.

**Boosting** (paid services to artificially raise an account's rank via account sharing or
duo-queue manipulation) is addressed through: account-sharing detection (login patterns, device
fingerprints), duo-partner correlation analysis, and LP manipulation tracking. Riot 2025:
boosting and account-sharing trigger 3-day suspensions on first offense.

**Throwing/intentional deranking** is detected via behavioral signals: unusually high rates of
intentional deaths, AFK timers, correlation between game result and player action patterns. It
is bannable under most competitive ToS and is actively tracked.

**League of Legends (2024)** detected and force-matched "winrate harvesting teams" — coordinated
accounts maintaining artificially high winrates — against each other, breaking the manipulation
loop without requiring individual bans.

## Concrete examples & references

- **Elo formula derivation:** Arpad Elo, *The Rating of Chess Players, Past and Present* (1978);
  practical walkthrough at https://medium.com/@adelbasli/unlocking-the-elo-system-a-deep-dive-into-the-mathematics-of-skill-measurement-0e824ef3f1b6
- **Glicko-2 algorithm with worked example:** Mark Glickman (2022 revision),
  https://www.glicko.net/glicko/glicko2.pdf
- **TrueSkill:** Herbrich, Minka, Graepel (2006), https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/
- **TrueSkill 2 paper:** Minka, Cleven, Zaykov (2018), https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/trueskill2.pdf
- **EOMM paper:** Chen et al. (2017), https://arxiv.org/abs/1702.06820 and https://dl.acm.org/doi/10.1145/3038912.3052559
- **Riot MMR/rank explainer:** https://support.riotgames.com/league-of-legends/gameplay/mmr-rank-and-lp
- **League of Legends matchmaking dev blog 2024:** https://www.leagueoflegends.com/en-ph/news/dev/dev-matchmaking-in-2024/
- **Valorant smurf detection dev series (2022):** https://playvalorant.com/en-us/news/dev/valorant-systems-health-series-smurf-detection/
- **Riot bots/boosters blog 2025:** https://www.leagueoflegends.com/en-us/news/dev/dev-banning-bots-boosters-and-more-in-2025/
- **Dota 2 party matchmaking wiki:** https://dota2.fandom.com/wiki/Matchmaking
- **Overwatch Role Queue announcement:** https://overwatch.blizzard.com/en-gb/news/23060961/introducing-role-queue/
- **Overwatch matchmaker explainer:** https://overwatch.blizzard.com/en-us/news/24224365/weekly-recall-meet-your-matchmaker/
- **AWS/GameLift queue-time vs. quality framework:** https://aws.amazon.com/blogs/gametech/questions-of-matchmaking/
- **Apex Legends CWMM matchmaking update 2024:** https://www.ea.com/en/games/apex-legends/apex-legends/news/matchmaking-update-0924

## Design implications & transferable principles

1. **Match Glicko-2 to the uncertainty you actually have.** New players (high RD) should be
   matched against other high-RD players; their wins/losses contain high information. Once RD
   drops below a threshold (e.g., RD < 75), treat rating as settled and reduce K or weight.

2. **Hidden MMR + displayed rank is almost always correct.** The cosmetic layer (tiers, LP,
   promotions) drives retention through visible progress and milestone ceremonies. The hidden
   signal ensures the matchmaker is not gamed by rank-seeking behavior. Never surface raw MMR
   to players unless your design specifically benefits from full transparency.

3. **Queue time budget is determined by match length.** A 30-minute match can tolerate a
   2–3 minute queue. A 5-minute match cannot. Compute your acceptable wait-time ceiling early
   and design your population segmentation (ranks, queues, regions) to fit inside it.

4. **Party bonus MMR is mandatory for team-coordination compensation.** Uncoordinated solo
   players lose to organized parties even at equal mean MMR. Model the bonus empirically
   (instrument win rates solo vs. party at the same mean MMR) and adjust the bonus until
   solo vs. party win rates converge.

5. **Per-role MMR pays off in role-queue games.** A single flat MMR across roles will create
   systematic imbalances at role-boundary skill gaps. The accounting cost (multiple MMR values
   per player) is low; the fairness gain is high.

6. **Placement matches are not the calibration — they are the confidence reveal.** Design the
   rating system to handle uncertainty natively (Glicko-2/TrueSkill) rather than treating
   placements as a magic oracle. The player experience of placements is what matters: make the
   output feel meaningful even if the math is doing most of the work beforehand.

7. **Soft seasonal resets drive re-engagement; hard resets destroy goodwill.** Pull toward
   midpoint, not to zero. The emotional contract with players is "your progress matters across
   seasons." A hard reset breaks that contract.

8. **Pick/ban is required above a threshold roster size.** Once a character roster exceeds
   ~20 options and some characters are meta-dominant, pick/ban is the only effective tool to
   prevent composition from dominating skill. Implement it at the start of high-rank play, then
   consider expanding it down the ladder as the meta develops.

9. **Smurf mitigation is structural, not purely detection.** The Valorant data shows that
   removing the legitimate motivation (playing with friends of different ranks) reduced smurf
   counts as much as automated detection. Design your social queuing rules first; detection
   plugs the residual gap.

10. **Do not optimize matchmaking for engagement.** EOMM's finding is real, but deploying it
    as the primary objective trades trust for short-term retention. Fairness is a long-term
    trust asset; engagement manipulation is a short-term metric exploit that degrades community
    health and risks player backlash if discovered.

11. **Use richer signals than win/loss when available.** TrueSkill2's 68% vs. 52% prediction
    accuracy improvement came from ingesting kill counts, squad membership, and mode-transfer
    skills. Any game that tracks meaningful per-match performance data (damage dealt, objectives,
    assists) should feed those signals into the rating system, weighted by their predictive power.

## Open questions to resolve per project

- Which base rating system fits the game's team structure (1v1 → Elo/Glicko-2; teams →
  Glicko-2 with team aggregation or TrueSkill with licensing)?
- At what population size does tight skill-based matchmaking become viable? What is the MVP
  queue-time budget vs. match quality floor?
- Separate MMR per role/queue or a single shared value? What is the correlation between
  performance across modes, and does cross-mode transfer help new-account seeding?
- Seasonal reset depth: soft pull (25–50% toward midpoint) vs. hard reset, and at what cadence?
- Pick/ban at what rank threshold, and how many bans per side?
- What signals are tractable for smurf detection in the specific game (aim patterns? economy
  decisions? map knowledge?) and what is the acceptable false-positive rate?
- Is there a legitimate case for any engagement-weighted signal in secondary decisions (e.g.,
  new-player first-win bonus) and how is that governed separately from the core matching policy?

## Sources

- https://www.glicko.net/glicko/glicko2.pdf
- https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/trueskill2.pdf
- https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/
- https://arxiv.org/abs/1702.06820
- https://dl.acm.org/doi/10.1145/3038912.3052559
- https://support.riotgames.com/league-of-legends/gameplay/mmr-rank-and-lp
- https://www.leagueoflegends.com/en-ph/news/dev/dev-matchmaking-in-2024/
- https://playvalorant.com/en-us/news/dev/valorant-systems-health-series-smurf-detection/
- https://www.leagueoflegends.com/en-us/news/dev/dev-banning-bots-boosters-and-more-in-2025/
- https://dota2.fandom.com/wiki/Matchmaking
- https://overwatch.blizzard.com/en-gb/news/23060961/introducing-role-queue/
- https://overwatch.blizzard.com/en-us/news/24224365/weekly-recall-meet-your-matchmaker/
- https://aws.amazon.com/blogs/gametech/questions-of-matchmaking/
- https://www.ea.com/en/games/apex-legends/apex-legends/news/matchmaking-update-0924
