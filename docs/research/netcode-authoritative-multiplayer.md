---
title: Netcode for authoritative real-time multiplayer — prediction, reconciliation, interpolation, and lag compensation
slug: netcode-authoritative-multiplayer
domain: netcode
tags: [client-prediction, server-reconciliation, snapshot-interpolation, lag-compensation, rollback-netcode, deterministic-lockstep, fixed-timestep, jitter-buffer, tick-rate, entity-interpolation, authoritative-server]
status: active
updated: 2026-06-27
confidence: high
sources: 13
supersedes:
abstract: "Authoritative-server netcode canon: prediction+reconciliation (replay unacked inputs), entity interpolation in the past, lag compensation rewind, rollback vs lockstep tradeoffs, two-clocks decoupling, and test strategy."
---

## Scope

A **project-agnostic** deep reference on the netcode subsystems required for a responsive, cheat-resistant, authoritative real-time multiplayer game: the authoritative-server model; client-side prediction and server reconciliation; entity/snapshot interpolation and the interpolation delay buffer; jitter and the two-clocks distinction; lag compensation / server rewind; rollback (GGPO-style) vs. deterministic lockstep vs. snapshot interpolation architectural tradeoffs; tick rate and fixed timestep; reconciliation pitfalls; and how to test each property. Written to brief design, planning, or review on *any* similar real-time multiplayer system (2D or 3D, shooter, action, sports). Pairs with [[deterministic-simulation-architecture]] and [[state-sync-interest-management]].

---

## Key findings

### 1. The authoritative-server model

The canonical anti-cheat foundation: the server is the sole owner of authoritative game state. Clients send *inputs* (intents), not positions or outcomes. The server validates, simulates, and sends authoritative state back. A hacked client may render anything locally but cannot alter what other players see — the server ignores invalid state and only acts on received inputs (Gambetta Part I). This works for all genres; the cost is that naïve wait-for-server creates visible input lag proportional to round-trip time (RTT).

**Who validates what.** Every input received by the server must be validated: speed caps, cooldown checks, ammo counts, reachability. "Never trust the client" applies to the payload of each input, not just to the network protocol.

### 2. Client-side prediction

To eliminate perceptible input lag the local client applies the same deterministic movement logic as the server *immediately* on input, without waiting for the round-trip. The predicted state is shown to the player; the server's authoritative response arrives later and is used to correct. For a 50 ms one-way latency, the player sees instant movement even though the server hasn't confirmed it yet (Gambetta Part II). Prediction is only possible for the local entity — predicting remote players would require foreknowledge of their future inputs.

**Determinism requirement.** Prediction only converges if client and server run the same physics with the same inputs. Any floating-point divergence between platforms, or any branching on non-replicated state, breaks convergence. This is why a fixed timestep and a shared rule-code path are load-bearing; see §5 and §7 below.

### 3. Server reconciliation — replaying unacknowledged inputs

Each client input is tagged with a monotonically increasing sequence number. The client keeps a ring buffer of sent-but-unacknowledged inputs. Every server snapshot includes the sequence number of the last input it processed. On receipt:

1. The client loads the server's authoritative state (the *acknowledged* position).
2. It discards all buffered inputs with sequence ≤ acknowledged sequence.
3. It replays every remaining buffered input in order on top of the authoritative state, advancing to the "present."

Result: the client converges smoothly to the server's truth without visible snapping, even at 250 ms RTT with multiple overlapping inputs in flight (Gambetta Part II). This is the *replay-unacked-inputs* algorithm; it is the correct implementation of reconciliation. A naïve implementation that just snaps to the server position without replay produces rubber-banding every round-trip.

**Atomicity.** Reconciliation must be applied atomically to the predicted state — partially applying a snapshot (e.g., position but not velocity) causes divergence on the next prediction step. Snapshots must carry all fields that the local simulation reads.

**Pitfalls.**
- **Rubber-banding**: caused by applying server state without replaying the buffered input queue. The character jumps backward then forward on every ack.
- **Stale snapshot correctness**: a snapshot that arrives out of order (older than a previous one) must be discarded; process only snapshots newer than the last-applied ack sequence.
- **Multi-player interactions**: even with no cheating and a deterministic sim, other players' inputs arriving at the server between two of your own inputs can cause the authoritative state to diverge from your prediction (an enemy pushes you). The replay will silently correct this — but the design must not assume divergence never happens.

### 4. Entity interpolation and the interpolation delay buffer

Remote entities (other players, NPC objects) cannot be predicted from local data because their future inputs are unknown. Instead they are rendered *in the past* relative to the local present:

- The client buffers the last N snapshots from the server (the *interpolation buffer*).
- At render time, it picks a render timestamp that is `interpolation_delay` behind the current local time.
- It finds the two snapshots that bracket that timestamp and linearly (or hermite-spline) interpolates between them.
- The entity is shown where it *actually was*, not where it might be now.

This produces perfectly smooth movement with no artifacts as long as the buffer has enough snapshots (Gambetta Part III; Fiedler "Snapshot Interpolation"). The tradeoff is added visual latency for remote entities: the local player is seen in the present, all others in the past.

**Interpolation buffer sizing.** The buffer depth must be large enough to absorb jitter and packet loss. Fiedler's rule of thumb: set the interpolation delay so you can lose two consecutive packets and still have a snapshot to interpolate toward. At 10 snapshots/s that is ~300 ms; at 30/s it drops to ~150 ms; at 60/s it is ~85 ms. This is the core argument for higher tick/snapshot rates: they reduce interpolation latency, not just temporal resolution.

**Linear vs. hermite.** Linear interpolation produces a subtle first-order discontinuity (position jitter) at sample points when velocity changes. Hermite interpolation — which matches position *and* velocity at both endpoints — eliminates this for rigid bodies at the same snapshot rate. For orientation, spherical linear interpolation (slerp) rather than nlerp is required to avoid non-constant angular speed (Fiedler "Snapshot Interpolation").

**Dead reckoning as an alternative.** For entities with near-constant velocity (vehicles, projectiles), dead reckoning (extrapolating forward from last known position/velocity) reduces the visual delay. It is unreliable whenever motion is non-linear (collision, turning) and produces snapping artifacts when corrections arrive. It is best limited to the fill-in window between two late packets, not as the primary display strategy.

### 5. The two-clocks distinction and how coupling them causes stutter

This is a frequently misunderstood source of visual stutter in otherwise-correct netcode.

**Logical simulation clock.** Advances in discrete, fixed ticks (e.g., 20 ms each at 50 Hz). All game-state updates, physics, input processing, and network send/receive happen on this clock. It must be fixed-size and deterministic.

**Visual/render clock.** Advances at the display's refresh rate (60, 120, 144 Hz), which is almost never an integer multiple of the simulation rate. This clock drives rendering *only*.

**The Fiedler accumulator pattern** (from "Fix Your Timestep!") bridges them correctly:
```
accumulator += real_frame_time
while accumulator >= dt:
    previous_state = current_state
    simulate(current_state, dt)
    accumulator -= dt
alpha = accumulator / dt
render(lerp(previous_state, current_state, alpha))
```
The renderer interpolates between the last two simulation steps using the fractional `alpha`. Without this, a 60 Hz game rendered at 144 Hz will stutter because the same physics frame is rendered 2–3 times with identical state.

**Why coupling causes stutter.** If animation or visual-smoothing code reads the simulation clock directly (e.g., advancing an animation state machine by a fixed tick every render frame), the animation rate locks to the simulation rate. On frames where the renderer runs 2× the simulation rate, animation freezes; on frames where the accumulator fires twice, animation stutters forward double. The fix is to advance visual/animation state using the render-clock delta and the `alpha` blend value, never the simulation tick counter.

**Integer time representation.** Using `double` for accumulated time causes sub-millisecond jitter after hours of uptime as floating-point precision degrades for large absolute time values. Use 64-bit integer nanoseconds for the accumulator; convert to float only when passing to math that needs it (Leite 2025; Fiedler).

### 6. Lag compensation / server rewind

Because remote entities are shown in the past (§4), a player aiming at a moving target sees its position 100+ ms ago. Without correction, even a perfect shot misses because the server evaluates the hit against the current-time position, not the displayed one.

The **lag compensation / backwards reconciliation** pattern (Valve Source; Gambetta Part IV):

1. The server keeps a rolling 1-second history of all player hitbox positions (a circular buffer of per-tick snapshots).
2. When a hitscan or targeted action arrives with a client timestamp `T`, the server computes the command execution time: `T_cmd = current_server_time − packet_latency − client_interpolation_delay`.
3. The server rewinds *only* the hit-tested entities to their state at `T_cmd`, evaluates the hit, then restores them to present.
4. If the hit is confirmed, the hit is applied at present time; the damage is authoritative.

The tradeoff: a player who has already moved behind cover can still be hit up to `interpolation_delay + RTT/2` milliseconds later from their attacker's perspective. This is the "dying behind cover" phenomenon. The alternative — requiring the attacker to lead targets — is considered worse for most game types. Rewind limits (typically 1 s) prevent extreme-latency abuse. The Valve wiki notes: "the server is happy because it's always authoritative; the shooter is happy because their aim is respected; only the target in an edge case is unhappy" (Gambetta Part IV, paraphrasing).

**Not applicable to melee and collision.** Server rewind for hitbox detection works for projectiles and hitscan. It does not help a local player's melee hit or body collision against a remote player, because the remote player is interpolated (past) and cannot be reliably touched in present time. Games that require tight melee-collision interactions (sports, platform fighters) are better served by rollback (§8) or by predicting the remote entity on the client.

### 7. Tick rate and fixed timestep

**Tick rate** (server simulation frequency) is the primary knob for netcode quality. Higher tick rate:
- Reduces interpolation latency (smaller inter-snapshot gaps).
- Improves input responsiveness (inputs are processed sooner after arrival).
- Increases server CPU and bandwidth costs linearly.

Common values: casual/strategy games 10–20 Hz; competitive shooters 60–128 Hz (Counter-Strike 2 runs at 64 Hz standard, 128 Hz on premium servers). Overwatch uses 60 Hz tick with ECS-backed state serialization (Ford, GDC 2017).

**Fixed vs. variable tick.** A fixed server tick rate makes prediction tractable and delta-encoding straightforward. Variable tick rates (used in Quake lineage / Apex Legends) attach timestamps to inputs, allowing high-refresh-rate clients to sample input more frequently. The tradeoff: variable time-deltas in integration can cause slight behavioral differences at different input rates (jump arc precision, collision detection edge cases) and require clamping to prevent server overload (SnapNet Part III).

**Spiral of death** (Fiedler; Leite). If each simulation step takes longer than the step's logical duration in wall-clock time, the accumulator grows unboundedly and the server falls further behind each frame. Mitigation: clamp the frame accumulator to 250 ms (accept slow-motion rather than freeze), ensure simulation budget fits comfortably inside the tick period, and alert on sustained overrun.

**Playout delay buffer for lockstep / input-driven.** In deterministic lockstep the simulation cannot advance until all peers' inputs for the next frame are received. A playout delay buffer absorbs jitter by queuing inputs and delivering them at a steady rate offset by a fixed delay (typically 100 ms). Without it, even small jitter causes hitching (Fiedler "Deterministic Lockstep").

### 8. Rollback vs. deterministic lockstep vs. snapshot interpolation

These are the three canonical networking architectures; the right choice depends on game type, player count, and simulation complexity.

| Property | Deterministic lockstep | Snapshot interpolation (authoritative server + prediction) | Rollback (GGPO-style) |
|---|---|---|---|
| Bandwidth | Very low (inputs only) | Medium–high (state snapshots, delta-compressed) | Low (inputs only) |
| Determinism required | Bit-exact cross-platform | Not required (server is authoritative) | Bit-exact on all rollback clients |
| Player count limit | ~2–4 (latency of slowest player) | Large (100+ with interest management) | ~2–8 practical |
| Input latency | Added delay proportional to RTT | Near-zero for local player | Near-zero (optimistic) |
| Visual consistency | Perfect (all see same frame) | Dual time-streams (local = present, remote = past) | Momentary inconsistency on misprediction + rollback |
| State save/load | Not needed | Not needed (server canonical) | Required; entire game state must be serializable |
| Best fit | Real-time strategy, fighting (legacy) | FPS, action-RPG, MMO | Fighting games, racing, sports |
| Key precedent | StarCraft (early), AoE | Quake, CS, Source, Overwatch, Apex Legends | GGPO, Skullgirls, Mortal Kombat 11, Rocket League |

**Rollback mechanics** (GGPO, Cannon 2006/open-sourced 2019). Clients run their local simulation immediately using predicted remote inputs (typically: carry last known input forward — "input decay" variants reduce this). When actual remote input arrives for frame N when the local client is at frame N+5:
1. Restore saved state from frame N−1.
2. Re-simulate frames N through N+5 with corrected inputs.
3. Render frame N+5.
All within one render frame (~16 ms). This requires the full game state to be serializable and restorable in < ~1 ms per frame. Rollback beyond 100–150 ms becomes unplayable due to prediction error accumulation (SnapNet Part II). To extend the stable range, a fixed *input delay* of 2–3 frames is re-added: the client applies its own input N frames late but reduces the rollback window by the same amount. Rocket League transitioned from snapshot interpolation to rollback precisely because predicted local cars needed to interact with a correctly-timed interpolated ball — only rollback could align them (Cone, GDC; SnapNet Part III).

**Deterministic lockstep** (Fiedler "Deterministic Lockstep"). Sends only inputs; requires bit-exact simulation on all peers. Bandwidth is minimal. The fundamental scaling limit: every peer must receive all peers' inputs before simulating the next frame, so latency is determined by the *slowest* peer. Above 2–4 players the added playout-delay overhead becomes impractical for fast-paced games. Cross-platform floating-point determinism is also extremely difficult without fixed-point math. Best fit: small-player-count games where simulation is too complex to snapshot (large unit counts in RTS).

**Snapshot interpolation (authoritative-server)** is the dominant choice for competitive online games. The server alone runs the simulation; clients predict only their own entities and interpolate everything else. This removes the cross-platform determinism requirement, scales to large player counts with interest management, and enables accurate server-authoritative lag compensation. The dual time-stream (§4, §9) is its main design burden.

### 9. Dual time-stream design implications

In snapshot interpolation, the local client exists in two time streams simultaneously: the local player is predicted (slightly ahead of the server); remote entities are interpolated (behind the server). Interactions *within* one stream are consistent; interactions *across* streams are inherently asynchronous.

Practical consequences:
- **Hitscan weapons**: use server rewind (§6) — the server reconciles the shooter's interpolated view of the target.
- **Melee / stomps**: the attacker sees the target in the past; the server sees the target in the present. If tight timing matters, predict the opponent as well (adds complexity) or accept a small discrepancy.
- **Moving platforms**: interpolated platforms should be treated as predicted if the local character can ride them; otherwise the player teleports when the platform moves.
- **Projectile–player collision**: if projectiles are interpolated and players are predicted, a player can "dodge" a projectile too late and still be hit. Rocket League's solution was to switch to rollback so all objects share one time stream (Cone, GDC; SnapNet Part III).

Design for rollback when: player-to-player collision, melee, and ball/puck physics must all be responsive and consistent. Design for snapshot interpolation when: the world is large, player counts are high, and hitscan weapons dominate.

### 10. Reconciliation and prediction: correctness checklist

The following are the most common implementation errors, each causing a distinct observable symptom:

| Failure mode | Symptom | Root cause |
|---|---|---|
| No input replay on reconcile | Rubber-banding every RTT | Applying server state without replaying buffered inputs |
| Partial snapshot on reconcile | Divergence after correction | Snapshot missing velocity / orientation / auxiliary state |
| Out-of-order snapshot applied | Backward jump | Missing sequence-number check before applying |
| Simulation clock tied to render | Stutter at high refresh rates | Missing alpha-blend / two-clock decoupling |
| Variable dt in physics | Platform-dependent behavior, tunneling | Missing fixed-timestep accumulator |
| No rewind limit | Dying behind cover far too late | No cap on server lag-compensation window |
| Prediction run on non-owned entities | Visual conflicts with authoritative state | Mistakenly applying local prediction to remote entities |

---

## Concrete examples & references

- **Gambetta Part I (authoritative server)**: The seminal accessible explanation of why an authoritative server prevents cheating. Demonstrates that a hacked client can render anything but can't alter what the server computes. (https://www.gabrielgambetta.com/client-server-game-architecture.html)

- **Gambetta Part II (prediction + reconciliation)**: Shows the sequence-number ring-buffer algorithm step by step. At t=250 ms, the client receives "x=11, last ack=#1", discards input #1, replays input #2, arrives at x=12. No rubber-band. (https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)

- **Gambetta Part III (entity interpolation)**: At a 100 ms server time step, client 2 renders client 1 at `t=900–1000` during the window `t=1000–1100`: "you're always showing actual movement data, except 100 ms late." (https://www.gabrielgambetta.com/entity-interpolation.html)

- **Gambetta Part IV (lag compensation)**: Server stores a 1-second hitbox history. On receiving a shot, computes `T_cmd = now − RTT/2 − interp_delay`, rewinds hit-tested entities to that time, evaluates hit. "You aimed at their head in your present, so you get the headshot." (https://www.gabrielgambetta.com/lag-compensation.html)

- **Fiedler "Fix Your Timestep!" (accumulator + two-clocks)**: Introduces the `accumulator` pattern and the `alpha = accumulator/dt` interpolation for the render call. States explicitly: "the renderer produces time and the simulation consumes it in discrete dt-sized steps." Warns about the spiral of death and the precision loss of `double` over long runtimes. (https://gafferongames.com/post/fix_your_timestep/)

- **Fiedler "Snapshot Interpolation" (buffer sizing, hermite)**: At 10 snapshots/s with 5% packet loss, an interpolation delay of 350 ms achieves smooth playback without hitching. Increasing to 30/s drops required delay to 150 ms. Hermite interpolation (matching velocity at endpoints) eliminates first-order position jitter visible with linear interpolation. Extrapolation works for linear motion but breaks on collision. (https://gafferongames.com/post/snapshot_interpolation/)

- **Fiedler "Deterministic Lockstep" (UDP vs. TCP, playout buffer)**: TCP resends add RTT*2 stall at every dropped packet; UDP with redundant input bundling achieves clean playback at 2 s / 25% packet loss. Playout delay buffer delivers inputs at a steady cadence. Lockstep fails above ~4 players due to synchronous input collection from all peers. (https://gafferongames.com/post/deterministic_lockstep/)

- **Valve "Latency Compensating Methods" / Source Multiplayer Networking**: Lag compensation system keeps "a history of all recent player positions for one second." Command execution time = `current_server_time − packet_latency − client_view_interpolation`. Default `cl_interp 0.1` adds 100 ms interpolation lag; server-side lag compensation knows each client's interpolation and adjusts rewind accordingly. (https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking; https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization)

- **GGPO / Tony Cannon (rollback)**: Open-sourced MIT 2019. Core loop: predict remote input (carry-last-known), simulate immediately, save state, on late input arrival restore state and re-simulate affected frames. Practical limit: misprediction beyond 100–150 ms becomes visually unacceptable. Input decay (100% → 0% over 3–4 frames) reduces rubber-band on direction reversals (also used in Rocket League). (https://www.ggpo.net/; https://en.wikipedia.org/wiki/GGPO)

- **SnapNet Part II (rollback architecture, performance, spiral of death)**: At 60 Hz, supporting 300 ms rollback requires re-simulating up to 18 frames within 16.6 ms, leaving ~0.9 ms per sim step. Fixed 3-frame input delay reduces rollback window by 50 ms. Beyond ~150 ms of latency, inconsistency degrades experience faster than input delay would. (https://www.snapnet.dev/blog/netcode-architectures-part-2-rollback/)

- **SnapNet Part III (snapshot interpolation, dual time streams, Rocket League)**: Documents the fixed vs. variable tick-rate tradeoff for snapshot models. The Rocket League case: "SARBC used snapshot interpolation, but cars interacting with an interpolated ball was the challenge; Psyonix moved to rollback and player experience improved markedly." Also covers bit-packing, quantization, delta-encoding, and Oodle Network for snapshot compression. (https://www.snapnet.dev/blog/netcode-architectures-part-3-snapshot-interpolation/)

- **Overwatch GDC 2017 (Ford / Prometheus engine)**: Prediction applied to all abilities and projectiles by default, opt-out only when necessary — unusual at the time and the reason Overwatch felt dramatically more responsive than contemporaries. Ring buffer of past states + inputs enables rewind to authoritative frame and replay. 60 Hz tick. ECS architecture enables per-component serialization for snapshots. (https://www.gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and)

- **Leite 2025 "Taming Time in Game Engines" (fixed-point time, two-clock demo)**: Demonstrates visually that raw physics position snaps while the alpha-blended interpolated position is smooth. Shows nanosecond-precision integer accumulator avoiding `double` precision loss after hours. Covers tunneling as the failure mode of variable dt at low frame rates. (https://andreleite.com/posts/2025/game-loop/fixed-timestep-game-loop/)

---

## Design implications & transferable principles

**1. Authoritative logic belongs on the server; prediction is an illusion layer on the client.**
Never let the client's rendered position be the input to further simulation. The client runs the same physics locally for responsiveness; the server's acked state is always the ground truth. Any divergence is corrected silently by reconciliation, not by the client asserting its prediction is correct.

**2. Implement reconciliation as replay, not as snap.**
The replay-unacked-inputs algorithm is the only correct form of reconciliation. The server must include the last-processed input sequence number in every snapshot. The client must buffer all sent inputs and discard on ack, not discard blindly. Rubber-banding is a diagnostic for missing replay, not for high latency.

**3. Snapshot completeness is a correctness property.**
A snapshot used for reconciliation must carry all state that the local simulation reads during replay. Missing a field (velocity, angular momentum, a status flag) causes divergence on the very next prediction step and typically surfaces as subtle drift rather than obvious rubber-banding — harder to diagnose.

**4. Higher tick rate is worth it up to the server's budget.**
The primary benefit of higher tick rate is not simulation accuracy but reduction of interpolation latency for remote entities (§4) and tighter lag-compensation rewind windows (§6). Budget 60 Hz for competitive titles; 20–30 Hz for casual. Variable tick rate (Quake lineage) adds responsiveness at the cost of determinism and requires careful simulation-rate clamping.

**5. Decouple the two clocks at the architecture level.**
The simulation clock (fixed dt) and the render clock (monitor Hz) must be separate. The accumulator pattern connects them. Any system that advances using the simulation tick count (animation state machines, VFX timing, UI lerps) will stutter on monitors faster than the simulation rate. Pass `alpha = accumulator/dt` into any visual-only interpolation path; keep the simulation state clean of render-rate artifacts.

**6. Choose architecture by the interaction model, not by genre label.**
- Need to interact with remote entities in real time (melee, ball, physics)? Use rollback and accept the serialization cost.
- Need anti-cheat, large player counts, and hitscan weapons? Use snapshot interpolation + server rewind.
- Two players, deterministic simulation, bandwidth-starved? Use lockstep with UDP + redundant inputs.
- Mixed interaction model? Hybrid: predict local entities, interpolate remote, apply rewind for hitscans (the Overwatch/Source model).

**7. Lag compensation must be bounded.**
Cap the rewind window (1 s is the Source default). Above the cap, late shots are rejected. Document the cap as a designed tradeoff: it defines the minimum latency at which "dying behind cover" stops being possible.

**8. Design animations and VFX for misprediction visibility.**
In any rollback or prediction scheme, frames that were rendered under a misprediction will snap when the authoritative state arrives. Startup frames (anticipation animation before a move becomes active) are the fighting-game solution: they are skipped by remote players during rollback correction, but critical frames survive. For non-fighting contexts: particle effects and sounds are often best triggered on "confirm" state rather than on prediction, to avoid confusing visual artifacts on rollback.

**9. State serialization is a first-class requirement for rollback.**
Implement save/load-state from the beginning if rollback is planned. The entire mutable game state must be serializable into a contiguous buffer and restorable from it in under 1 ms per frame (for a 60 Hz, 10-frame rollback budget). Audio/VFX state is typically not fully serialized; track "event occurred" flags instead and replay them as cancel/restart signals.

**10. Test netcode with adversarial conditions, not just happy-path LAN.**
A suite of simulated network conditions should be a mandatory pre-ship gate. Canonical test matrix: 0 ms / 50 ms / 100 ms / 250 ms one-way latency × 0% / 1% / 5% packet loss × 0% / ±2-frame jitter × out-of-order delivery. Regression properties to verify:
- **Convergence**: after any reconciliation event, the client and server state must agree within N ticks.
- **Smoothness**: no frame should jump more than X world-units for a remote entity in normal conditions.
- **No spiral of death**: server tick budget stays below 80% under sustained 5% packet loss.
- **Lag compensation accuracy**: hitscan shots at a moving target at 100 ms RTT + 100 ms interp should register at the expected hitbox position (record server rewind state and compare).

---

## Open questions to resolve per project

- What is the target tick rate? This flows into interpolation delay budget, bandwidth estimates, and server infrastructure cost.
- Does the game require tight player-to-player physical interaction (melee, physics-driven movement)? If yes, rollback is strongly indicated over snapshot interpolation.
- Is cross-platform play required? If yes, floating-point determinism must be audited early; rollback and lockstep both depend on it.
- What is the rewind cap for lag compensation? This should be a product decision (fairness vs. inclusivity for high-latency players) documented as a deliberate choice, not a code accident.
- Will the simulation clock be fixed or variable? Variable (Quake lineage) requires careful integration precision auditing; fixed is simpler but limits high-refresh-rate advantages.
- How will the interpolation buffer adapt to varying network conditions (adaptive vs. fixed delay)? Adaptive buffers shrink at low jitter and grow at high jitter, reducing latency in good conditions without hitching in bad.
- Are there systems that currently couple to the simulation tick counter that need to be refactored onto the render-alpha path (animations, VFX, UI)?

---

## Sources

1. https://www.gabrielgambetta.com/client-server-game-architecture.html — Gambetta, "Fast-Paced Multiplayer Part I: Client-Server Game Architecture"
2. https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html — Gambetta, "Fast-Paced Multiplayer Part II: Client-Side Prediction and Server Reconciliation"
3. https://www.gabrielgambetta.com/entity-interpolation.html — Gambetta, "Fast-Paced Multiplayer Part III: Entity Interpolation"
4. https://www.gabrielgambetta.com/lag-compensation.html — Gambetta, "Fast-Paced Multiplayer Part IV: Lag Compensation"
5. https://gafferongames.com/post/fix_your_timestep/ — Fiedler, "Fix Your Timestep!", Gaffer On Games
6. https://gafferongames.com/post/snapshot_interpolation/ — Fiedler, "Snapshot Interpolation", Gaffer On Games
7. https://gafferongames.com/post/deterministic_lockstep/ — Fiedler, "Deterministic Lockstep", Gaffer On Games
8. https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking — Valve Developer Community, "Source Multiplayer Networking"
9. https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization — Valve Developer Community, "Latency Compensating Methods in Client/Server In-game Protocol Design and Optimization"
10. https://www.ggpo.net/ — Tony Cannon, GGPO Rollback Networking SDK
11. https://www.snapnet.dev/blog/netcode-architectures-part-2-rollback/ — Mattis, "Netcode Architectures Part 2: Rollback", SnapNet
12. https://www.snapnet.dev/blog/netcode-architectures-part-3-snapshot-interpolation/ — Mattis, "Netcode Architectures Part 3: Snapshot Interpolation", SnapNet
13. https://andreleite.com/posts/2025/game-loop/fixed-timestep-game-loop/ — Leite, "Taming Time in Game Engines", 2025
