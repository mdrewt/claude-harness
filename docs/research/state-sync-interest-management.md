---
title: Server state synchronization, interest management & spatial partitioning for online games
slug: state-sync-interest-management
domain: netcode
tags: [interest-management, spatial-partitioning, replication, sharding, zoning, pub-sub, tick-rate, bandwidth, aoi, server-meshing, consistency]
status: active
updated: 2026-06-27
confidence: high
sources: 14
supersedes:
abstract: "Why naïve broadcast breaks at scale, how AoI + spatial partitioning + relevancy-priority solve it, sharding/meshing tradeoffs, and tick scheduling."
---

## Scope

A **project-agnostic** deep reference on how authoritative online game servers manage the
scalability problem of world state distribution: why broadcasting every entity update to
every client is infeasible beyond small player counts, what area-of-interest (AoI) and
spatial partitioning techniques exist, how replication priority/relevancy models work,
how servers split the world across processes (zones, shards, server meshing), how tick
scheduling interacts with zone load, what the consistency tradeoffs are at boundaries,
and how to load-test this system. Pairs with [[netcode-authoritative-multiplayer]].

---

## Key findings

### 1. The broadcast problem: O(n²) at the root

An authoritative server that sends every entity's state to every connected client produces
O(n²) messages per tick. EVE Online's documentation states this explicitly: "server load
scales at O(n²) with players on grid." At 1,000 players per zone, naïve broadcast means
~1,000,000 state updates per tick — far beyond any single machine's network or CPU budget.
The corollary is that **any scalable design must filter state delivery**, and the filtering
mechanism is the lever that determines the rest of the architecture.

Interest management (also called area-of-interest management, AoI, or relevancy filtering)
is the accepted solution: each client receives only the subset of world state that could
meaningfully affect or be perceived by that client. Academic literature on Distributed
Virtual Environments (DVEs) has studied this since the 1990s; the canonical survey is
Yahyavi & Kemme (ACM Computing Surveys, 2013).

### 2. AoI techniques — a spectrum of precision vs. cost

**Radius / distance-based (simplest)**
The server calculates the Euclidean distance between entity pairs each tick; entities within
a configurable radius are in-scope. This is the foundation of Unreal Engine's relevancy
system and Mirror Networking's deprecated NetworkProximityChecker. Linear scan cost is
O(n·m) per tick for n entities and m connections. In practice all production systems layer
a spatial accelerator on top to avoid the full scan.

**Uniform grid / cell-based (most common in production)**
The world is divided into uniform cells; each entity is hashed to a cell. When computing
a client's subscription set, the server sends all entities in the 8-neighbor cells (or a
configurable radius of cells). Mirror's `SpatialHashingInterestManagement` (previously
called GridChecker in uMMORPG) reports **30× faster** than distance checking in that
engine's benchmarks, because the expensive `Vector3.Distance` per-pair call is replaced by
cell lookups. Photon's "Interest Groups" use the same pattern. The trade-off: fixed cell
size is hard to tune for mixed-scale worlds (a large dungeon boss and a tiny projectile
need different granularity).

**Quadtree / octree (adaptive)**
Recursive subdivision that concentrates resolution in dense regions and uses coarse cells
in sparse ones. Game Programming Patterns (Nystrom) gives a clean implementation: each
quadrant splits when object count exceeds a threshold, recursing until every leaf is below
that count. Better than a uniform grid when population density varies widely; the cost is
pointer chasing and occasional rebalance on movement.

**Zone / region-based**
Rather than a continuous geometry, the world is divided into hand-authored or
procedurally-generated named zones, each run as a discrete server process. A client in
zone A receives no updates about entities in zone B. This is the architecture used by
classic MMOs (World of Warcraft, EverQuest). Zone boundaries are the natural sharding
unit; large zones can be further sub-divided by the grid/quadtree technique above.

**Line-of-sight (LoS) / occlusion-based**
AoI is computed by casting rays or testing occlusion geometry; entities behind solid walls
are excluded even if within radius. This is most valuable in indoor/dungeon worlds with
many walls; in open-world or space games it adds CPU cost for small benefit. SiriKata
research explored using **visual salience (projected screen area)** rather than distance
as the relevancy measure, on the observation that distant but large objects have higher
perceptual impact than nearby small ones.

**Combat-state-aware / dynamic AoI**
Research (Moallem et al., IEEE 2018) shows that a player in active combat has a larger
effective AoI than a player standing idle, because missiles, AoE effects, and pursuing
enemies expand the "matter radius." Dynamically expanding AoI radius on entering combat
and contracting after reduces bandwidth during idle periods while maintaining fidelity
during peak action.

### 3. Subscription / replication models

**Owner-push / server-broadcast-to-AoI**
The server is the sole authority; it computes each client's subscription set and pushes
delta-encoded snapshots every tick. The subscribe/unsubscribe events (entity enter/leave
AoI) are explicit messages. This is the model used by Unreal Engine replication, Mirror,
and Nakama's authoritative match loop.

**Pub/sub via message broker**
Clients (or workers) subscribe to "channels" or "topics" keyed to spatial cells or entity
groups. A message broker (Redis Pub/Sub, custom socket server) fans out state changes only
to subscribers of the relevant channel. SpatialOS used this model: workers hold interest
queries and receive only updates matching those queries ("Query-Based Interest", QBI).

**Snapshot vs. delta replication**
Snapshot replication sends full state each tick (simple, no dependency on prior packets);
delta replication sends only changed fields. Delta replication is always more
bandwidth-efficient per update but requires sequencing, acknowledgment, and a
reconciliation path when packets are lost. Most production engines (Unreal, Mirror) use
delta replication with dirty-flag tracking on properties.

### 4. Priority and update-rate scaling

Unreal Engine's replication subsystem surfaces this cleanly:

- `NetUpdateFrequency` — maximum replications per second (e.g., 100 Hz for the player
  pawn, 10 Hz for background NPCs).
- `MinNetUpdateFrequency` — used by Adaptive Net Update Frequency (`net.UseAdaptiveNetUpdateFrequency`),
  which dynamically reduces the rate when no properties have changed, saving bandwidth at
  idle.
- `NetPriority` — a floating-point weight; an Actor with priority 2.0 is updated **exactly
  twice** as often as one with priority 1.0 when bandwidth is constrained. The engine
  multiplies NetPriority by time-since-last-replicated to avoid starvation.

The scheduler fills the connection's bandwidth budget in priority order each tick; Actors
that don't fit are deferred to the next tick. This makes bandwidth a **soft cap** rather
than a hard one: state arrives eventually, high-priority state arrives first.

The practical design rule is a **priority tier system**: player pawns > nearby NPCs in
combat > nearby NPCs idle > distant background objects > environmental decorators.
Tie-breaking by time-since-last-update prevents indefinite starvation of low-priority
entities.

### 5. Server tick and zone scheduling

The canonical tick loop:
```
while running:
    read_all_inputs()
    advance_simulation(dt)
    compute_aoi_sets()          # most expensive step at high density
    send_delta_snapshots()
    sleep_until_next_tick()
```

**Tick rate choices and trade-offs**

| Tick rate | Latency budget | Typical use |
|---|---|---|
| 60–128 Hz | 8–16 ms | Competitive FPS (VALORANT, CS2) |
| 20–30 Hz | 33–50 ms | Action RPGs, third-person combat |
| 10 Hz | 100 ms | Turn-tolerant MMO background zones |
| 1 Hz | 1000 ms | EVE Online base (pre-TiDi) |

**Per-zone vs. per-entity tick cadences**
Not all work needs to run on every tick. A common pattern:
- Player inputs and physics: every tick.
- AI decision/replanning: every 5 ticks.
- NPC pathfinding: budgeted across ticks (one NPC per tick, rotating through the pool).
- Player stat persistence: every 30 seconds.
- AoI recompute for distant, stationary entities: every 10 ticks.

This "tiered tick" model converts a bursty per-tick budget into a flatter load profile
and is the most impactful first optimization when a zone server starts falling behind.

**EVE Online Time Dilation (TiDi) — a scaling relief valve**
EVE runs a 1 Hz tick target (one complete simulation advance per second). When a solar
system hosts thousands of ships firing simultaneously, the per-tick work exceeds 1 second
of wall time. Rather than dropping simulation steps, CCP introduced TiDi: the game clock
is stretched so the server has multiple real seconds to complete one game-second of work.
At maximum dilation the game runs at **10% of normal speed** (1 game-second = 10 real
seconds). This is transparent to players — all timers scale — except wall-clock-anchored
systems (skill training, industry). The EVE university wiki states the load scaling
explicitly: O(n²) with players on grid. TiDi is a graceful degradation strategy: trade
time for correctness rather than drop state or admit defeat.

### 6. World partitioning: sharding, zones, and server meshing

**Parallel shards (identical copies)**
Multiple independent copies of the same world exist simultaneously; players are assigned
to a shard at login. Shards never interact. This is the classic approach (EverQuest shards,
many Korean MMOs). Maximal isolation, no cross-shard consistency problem, but players
cannot meet across shards and the world feels smaller than its population suggests.

**Zone-based single world**
One logical world divided into zones; each zone is one server process. Players move
between zones via load-screen transitions. Cross-zone entity interaction is handled by
a message bus or shared world database. WoW's realm/zone model. The challenge is
population imbalance: a popular capital city zone saturates while rural zones idle.

**Seamless zone handoff**
Zones exist but transitions are invisible to the player. Requires "border entities" to be
replicated to both the current and neighboring zone server so rendering is continuous.
The authoritative hand-off happens as the entity crosses the boundary midpoint: the
receiving server takes authority, the sending server switches to receiver mode. Star
Citizen's Replication Layer handles this: "as the entity crosses the physical border,
authority to decide the entity's fate swaps, and the original server becomes the receiver
of updates." The hard problem is doing this in a window short enough (typically <200 ms)
to be imperceptible.

**Dynamic server meshing**
The zone boundary is not fixed at content-authoring time; the runtime dynamically assigns
server instances to sub-regions based on player density. Sparse areas get merged onto one
server; dense areas get split across many. Star Citizen's roadmap calls for this as the
end state; Alpha 4.0 shipped static server meshing with ~500 players per shard. True
dynamic meshing introduces race conditions at split/merge points and is considered
unsolved at MMO scale as of 2026. SpatialOS was the most prominent commercial attempt;
its worker model let load be redistributed across a pool of workers without world
restarts, but the product was discontinued in 2023.

**Zoneless / entity-authority distribution**
Research (Yahyavi et al.) explored assigning authority over individual entities rather
than geographic regions to individual server processes or peers. This maximizes load
distribution but introduces consistency challenges when two entities interact and are
owned by different processes. Most production systems avoid this and use region ownership
with cross-region message passing for edge cases.

### 7. Consistency tradeoffs at zone boundaries

The CAP theorem applies: in a distributed game world, you cannot simultaneously guarantee
strong consistency, high availability, and partition tolerance. Production MMOs accept
**eventual consistency** for most state, with selective strong consistency for
economically or competitively sensitive operations.

**Practical consistency tiers:**
- **Strong (synchronous)** — trade execution, loot attribution, death resolution. Requires
  a distributed lock or a single authoritative process; adds latency. Use for events where
  duplication or loss is unacceptable.
- **Causal** — player A killed monster X before player B opened the chest; relative ordering
  matters but absolute wall-clock precision does not. Vector clocks or CRDTs can maintain
  this cheaply.
- **Eventual** — NPC positions, ambient state, chat scroll. Clients may see divergent
  states briefly; they converge within one to a few ticks. Correct for nearly all visual
  state.

At zone boundaries, the dangerous window is the entity-in-transit period. Standard
mitigation: the entity is replicated read-only to the receiving server during handoff;
no writes are accepted on the old server during the final hand-off phase (a brief "freeze").
For seamless worlds, this freeze must be sub-tick.

**CRDTs** (Conflict-Free Replicated Data Types) have been proposed (Netskip architecture,
ScienceDirect 2025) for maintaining replicated game state across distributed nodes with
asynchronous updates that converge deterministically. In practice CRDTs suit commutative
operations (score tallies, flag toggles) but not physics simulation, which requires a
single authority.

### 8. Bandwidth math — why density is the enemy

A rough model: if each entity sends a 64-byte position/state update at 20 Hz, one entity
costs 64 × 20 = 1,280 bytes/sec to one subscriber. With 100 entities in AoI and 100
concurrent clients, the per-server outbound bandwidth is 100 × 100 × 1,280 bytes/sec =
**1.28 GB/sec** — clearly untenable on any realistic uplink.

Interest management reduces the subscriber count; delta encoding reduces the per-update
size; adaptive update frequency reduces the 20 Hz floor for unchanged state. Together
these bring the "dense zone" scenario to a manageable range:
- Reduce subscriber set from 100 to AoI ≈ 20 nearby entities: 5× reduction.
- Delta encoding: typically 70–90% reduction in bytes for slowly-changing state.
- Adaptive frequency: idle entities drop from 20 Hz to 2 Hz: 10× reduction.
- Net: ~100× bandwidth reduction from combining all three.

The 0fps.net "Replication in networked games" series (Parts 1–4) provides a worked
numeric treatment of these reductions across game types.

### 9. Load testing and scaling validation

The correct approach to validate AoI + zone scaling is a **bot harness**:
1. Profile a real player session: record movement packet rate, action frequency, packet
   sizes, burst patterns.
2. Build headless bots that replay that statistical profile.
3. Ramp bots logarithmically (e.g., 100 → 200 → 400 → 800 …) to find the zone
   saturation knee.
4. Instrument the server: measure tick duration, AoI recompute time, bandwidth per
   connection, entity count per zone.
5. Validate that AoI culling actually reduces per-client bandwidth proportionally (common
   bug: AoI correctly culls visibility but still processes all entities for collision or
   AI, wasting CPU).

Riot Games ran 1,000 simulated players in their first load test for VALORANT, then doubled
the count at each iteration until reaching their two-million-concurrent-player target for
the backend layer. The load test bot pool also doubles as regression tooling: if a code
change causes per-tick time to rise measurably at N=200 bots, it will fail at N=400 in
production.

---

## Concrete examples & references

**EVE Online — TiDi (Time Dilation)**
The clearest public example of a server-side scaling relief valve. Server targets 1 Hz
tick; when a system's player count (O(n²) per-tick load) exceeds the 1-second budget,
TiDi stretches real time so each game-second spans up to 10 real seconds. Maximum dilation
= 10% speed. Walls-clock-anchored timers (skill training, industry) are excluded from
dilation, maintaining economic sanity.
- https://www.eveonline.com/news/view/introducing-time-dilation-tidi
- https://wiki.eveuniversity.org/Time_dilation
- https://imperium.news/understanding-eve-online-server-tick/

**Unreal Engine — Actor Relevancy & Priority**
Production-grade reference implementation. IsNetRelevantFor() returns false outside a
configurable distance (or when behind an occluder); the priority/NetUpdateFrequency system
then schedules which relevant actors actually get replicated within the bandwidth budget.
- https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-relevancy-and-priority?application_version=4.27
- https://www.mattgibson.dev/blog/unreal-replication-settings

**Mirror Networking — Spatial Hashing Interest Management**
Open-source Unity networking library with swappable interest management backends: distance
(parity replacement for NetworkProximityChecker), spatial hashing (uniform grid, 30×
faster than distance in benchmarks), hex spatial hashing (optimized variant), and a custom
hook. The spatial hashing implementation uses 2D cell keys (XZ or XY), sends the 8
neighboring cells, and is configurable per-game-object type.
- https://mirror-networking.gitbook.io/docs/manual/interest-management
- https://mirror-networking.gitbook.io/docs/manual/interest-management/spatial-hashing

**SpatialOS / Improbable — Query-Based Interest (QBI)**
Decomposed game world into ECS entities; "workers" (server processes) declare interest
queries; the runtime's replication layer delivers only matching state changes. QBI enabled
per-worker interest beyond simple geographic proximity — e.g., a worker responsible for
global economy could receive commodity prices from all zones without receiving player
positions. The architecture is the clearest production example of decoupled interest from
geographic ownership.
- https://ims.improbable.io/insights/the-new-runtime-is-here-with-a-new-feature-for-managing-areas-of-interest/
- https://ims.improbable.io/insights/how-spatialos-works-with-game-engines/

**Star Citizen — Static + Dynamic Server Meshing**
Static meshing (Alpha 4.0, 2024): planetary systems are fixed to specific server instances;
~500 players per shard. The Replication Layer sits between game servers and clients;
entities at zone boundaries are replicated read-only to neighboring servers for smooth
handoff. Dynamic meshing (roadmap): runtime splits/merges of server regions based on
density. The technical description of authority transfer: one server does calculations
while the neighboring server receives data; at the physical border authority swaps and
the original server becomes the receiver.
- https://starcitizen.tools/Server_meshing

**0fps.net — Replication in Networked Games (4-part series)**
The most thorough publicly available treatment of AoI mechanics, bandwidth math, and
consistency models for game replication, with worked numeric examples and comparisons
across game genres.
- https://0fps.net/2014/02/10/replication-in-networked-games-overview-part-1/
- https://0fps.net/2014/03/09/replication-in-network-games-bandwidth-part-4/

**Academic surveys — DVE interest management**
- Yahyavi, A. & Kemme, B. "Interest Management for Distributed Virtual Environments: A
  Survey." *ACM Computing Surveys* 46(4), 2013.
  https://dl.acm.org/doi/10.1145/2535417
- Springer 2017: "Evaluation of 2D and 3D interest management techniques in the distributed
  virtual environment DiVE." *Virtual Reality* journal.
  https://link.springer.com/article/10.1007/s10055-017-0322-3

**Riot Games — VALORANT load testing**
1,000 bots → doubled each iteration → 2M concurrent target validated.
- https://technology.riotgames.com/news/scalability-and-load-testing-valorant

**Nakama — Authoritative match loop and tick scheduling**
Open-source server framework; match tick rate is a constructor parameter (e.g., 10 =
10 ticks/sec); the match loop is a pure function called each tick with accumulated
inputs; the framework serializes calls so no lock is needed inside the loop.
- https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/

---

## Design implications & transferable principles

**Pick spatial structure early, but make it swappable.**
The choice between uniform grid, quadtree, or zone-list affects memory layout and
update latency across the codebase. Model interest management behind an interface
(`IInterestManager.GetSubscribers(entity) → []ClientID`) so the backing structure can
be replaced when profiling reveals the bottleneck. Start with uniform grid; upgrade to
quadtree only if population density is highly non-uniform.

**AoI radius and cell size must be tuned together.**
An AoI radius smaller than one cell means the entity's 8-neighbor cells over-include
(waste); larger than ~2-cell-diameter means the lookup misses relevant entities. Set the
cell size to roughly half the AoI radius. Document these numbers as named constants with
units in the codebase so tuning is a config change, not a code change.

**Delta replication is the norm; dirty-flag discipline is required.**
Every replicated field must be marked dirty on write and cleared on send. The most common
bug: a field is set identically to its current value on every tick, appearing dirty to the
replication layer. Add a `SetIfChanged` wrapper that no-ops on equal values. In languages
without property syntax, a lint rule or code-gen step enforces this.

**Priority tiers prevent starvation without complexity.**
Three tiers (critical / normal / background) with explicit per-type assignments are
sufficient for most games. Make them a per-entity-type constant in data (e.g., config
file or entity-type table). Defer the starvation-prevention multiplier (time-since-last-
replicated × base priority) to the scheduler, not the per-entity code.

**Zone ownership is simpler than entity ownership.**
Assign authority to geographic regions, not individual entities, to avoid distributed
coordination on every entity interaction. Cross-zone interactions (ranged attacks crossing
a boundary, trading between zones) are message-passing events on the zone message bus.
Design the bus contract first; the routing is the hard part.

**Seamless zone handoff requires a freeze window; make it explicit.**
The handoff protocol must define: (a) a "prepare" phase where the receiving server
pre-loads entity state read-only, (b) a "freeze" phase where the sending server stops
accepting writes, (c) an "authority transfer" message, (d) a "resume" on the receiving
server. The freeze duration is the latency spike visible to the player; target <1 tick
(16–33 ms at 30–60 Hz). If the freeze is longer, clients should receive a prediction
continuation, not a dead frame.

**TiDi is a pattern, not just an EVE trick.**
Any system where player action rate is the primary load driver can benefit from a
server-side "slow-motion" mode: report a tick multiplier to clients, scale physics and
timers by it, accept more wall time per simulation step. This is simpler to implement
than dynamic zone splitting and more graceful than dropping state.

**Bot harness is a first-class deliverable.**
Build the bot harness alongside the server, not after the first outage. The harness
measures tick duration, AoI set sizes, per-connection bandwidth, and zone-saturation
knee. Regression on these metrics in CI catches AoI regressions before they reach
production. Budget one bot per expected peak player in the largest supported zone.

**Eventual consistency is correct for visual state; use strong consistency only where
duplication or loss is economically/competitively meaningful.**
Define the consistency tier for each state category in a table (a "state contract"). Use
it to decide synchronization mechanism: distributed lock (strong), message-bus
ordering (causal), or fire-and-forget delta replication (eventual).

---

## Open questions

- At what player density does a quadtree outperform a uniform grid for AoI recompute,
  given the rebalance overhead? Benchmark both at 200, 500, 1000 entities/zone.
- What is the minimum viable "freeze" window for seamless zone handoff at 30 Hz tick rate,
  given typical inter-process communication latency on the same host vs. across hosts?
- Is per-combat AoI radius expansion worth the added complexity for a game where most
  content is PvE with modest player density? Measure bandwidth at peak raid density first.
- CRDTs solve commutative state convergence but not causal ordering. Which specific state
  categories in a given game can be modeled as CRDTs without gameplay correctness loss?
- What is the correct bot behavior model for load testing — replay of recorded sessions
  or a parametric Markov model of actions? The latter generalizes better to content not
  yet recorded.
- Does dynamic server meshing deliver enough density relief to justify the hand-off
  complexity for a game whose peak density events are scheduled (e.g., raid nights)?
  Might manual zone spin-up on a schedule be adequate?

---

## Sources

1. https://www.eveonline.com/news/view/introducing-time-dilation-tidi — CCP dev blog introducing TiDi (2011)
2. https://wiki.eveuniversity.org/Time_dilation — EVE University wiki: TiDi mechanics, O(n²) footnote
3. https://imperium.news/understanding-eve-online-server-tick/ — Imperium News: EVE 1 Hz tick mechanics
4. https://dl.acm.org/doi/10.1145/2535417 — Yahyavi & Kemme, "Interest Management for DVEs: A Survey," ACM Computing Surveys 46(4), 2013
5. https://link.springer.com/article/10.1007/s10055-017-0322-3 — "Evaluation of 2D and 3D interest management techniques in DiVE," Virtual Reality, Springer 2017
6. https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-relevancy-and-priority?application_version=4.27 — Unreal Engine 4.27: Actor Relevancy and Priority
7. https://www.mattgibson.dev/blog/unreal-replication-settings — Matt Gibson: Unreal replication NetUpdateFrequency/Priority walkthrough
8. https://mirror-networking.gitbook.io/docs/manual/interest-management — Mirror Networking: Interest Management overview
9. https://mirror-networking.gitbook.io/docs/manual/interest-management/spatial-hashing — Mirror Networking: Spatial Hashing (30× benchmark)
10. https://ims.improbable.io/insights/the-new-runtime-is-here-with-a-new-feature-for-managing-areas-of-interest/ — Improbable: SpatialOS Query-Based Interest (QBI)
11. https://starcitizen.tools/Server_meshing — Star Citizen Wiki: server meshing, Replication Layer, authority transfer
12. https://0fps.net/2014/02/10/replication-in-networked-games-overview-part-1/ — 0fps.net: Replication in networked games Part 1
13. https://0fps.net/2014/03/09/replication-in-network-games-bandwidth-part-4/ — 0fps.net: Replication in networked games Part 4 (bandwidth)
14. https://technology.riotgames.com/news/scalability-and-load-testing-valorant — Riot Games: VALORANT scalability and load testing
