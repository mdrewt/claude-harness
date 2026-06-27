---
title: Deterministic simulation & shared-rule-core architecture for games and realtime systems
slug: deterministic-simulation-architecture
domain: architecture
tags: [determinism, lockstep, fixed-timestep, floating-point, fixed-point, functional-core, simulation, netcode, rng, wasm, testability]
status: active
updated: 2026-06-27
confidence: high
sources: 18
supersedes:
abstract: "Architecture guide for bit-exact, cross-platform game simulation: fixed timestep, seeded RNG, injected clocks, float determinism, functional core / imperative shell, headless testing, and shared-rule-core compiled to multiple targets."
---

## Scope

A **project-agnostic** deep reference on how to design a game (or any realtime simulation) whose
simulation layer is **fully deterministic**: produces identical outputs on every machine, across
compiler builds, and across rendering framerates, given identical inputs. Covers the full stack
from the game loop to the rule layer to the network layer: fixed timestep + accumulator + render
interpolation; the `(state, input, dt_tick, seed) → state` functional model; seedable PRNG design;
clock dependency injection for testability; the floating-point determinism problem and its
mitigations; functional core / imperative shell; decoupling simulation from rendering for headless
unit testing; one shared rule core compiled to multiple targets (native, WebAssembly); and parity
testing / desync detection. Pairs with [[netcode-authoritative-multiplayer]].

The document treats **determinism as an architectural constraint**, not an afterthought. The
concrete examples are drawn from shipped RTS games (Age of Empires, Supreme Commander, StarCraft,
Factorio) and authoritative literature (Gaffer On Games, Destroy All Software). Tradeoffs and
named precedents are stated throughout.

---

## Key findings

### 1. Why determinism matters

Determinism means: given identical initial state and identical inputs in identical order, the
simulation produces bit-for-bit identical output on every participating machine. The motivation
is threefold:

**Lockstep netcode.** Deterministic lockstep sends only player *inputs* over the network — not
world state. Bandwidth scales with input size, not world size. This is why every major RTS
(Age of Empires, StarCraft, Supreme Commander, Factorio) uses lockstep: thousands of units make
state-synchronization prohibitive, but inputs remain tiny (Fiedler: "you can network a simulation
of one million objects with the same bandwidth as just one" [2]).

**Replays and observability.** Record inputs + initial seed → replay any session exactly. Debug
a bug by re-running the identical sequence on a single machine. No special "deterministic replay"
infrastructure needed beyond input logging.

**Client-side prediction parity.** Prediction + rollback requires the client and server to run the
same rule code and get the same answer. Any divergence produces a visible "pop" when server state
is reconciled. Determinism eliminates the source of divergence.

**Testing and CI.** A deterministic sim can be run headless with a fixed seed and a fixed input
sequence in a unit test and produce a checksum of final state. Tests are reproducible, fast, and
do not need a running renderer or network stack.

### 2. The canonical model: `(state, input, tick, seed) → state`

Frame the simulation core as a **pure function**:

```
next_state = simulate(current_state, inputs_for_tick, tick_number, rng_state)
```

Key invariants:
- `simulate` reads no global mutable state (no `Time.now()`, no `Math.random()`, no world
  globals).
- `inputs_for_tick` contains every player's input for this tick, canonically ordered (by player
  ID, not arrival order — arrival order is non-deterministic).
- `rng_state` is advanced deterministically inside `simulate`; the updated RNG state is part of
  `next_state`.
- `tick_number` is a monotonic counter advancing by exactly 1 per simulation step; wall-clock
  time is not passed into simulation logic.

This model maps directly to Gary Bernhardt's **Functional Core, Imperative Shell** pattern [4]:
the simulation is the pure functional core; rendering, I/O, networking, and OS calls live in the
imperative shell that wraps it.

### 3. Fixed timestep + accumulator + render interpolation

The canonical game loop pattern (Fiedler, "Fix Your Timestep!" [1]):

```
const double DT = 1.0 / 60.0;   // fixed simulation step
double accumulator = 0.0;
State previous, current;

while (!quit) {
    double frame_time = min(real_elapsed(), 0.25); // clamp to prevent spiral-of-death
    accumulator += frame_time;

    while (accumulator >= DT) {
        previous = current;
        current = simulate(current, next_inputs(), tick++, rng);
        accumulator -= DT;
    }

    double alpha = accumulator / DT;          // [0,1] blend factor
    State render_state = lerp(previous, current, alpha);
    render(render_state);
}
```

Key properties:

- **Simulation and rendering are fully decoupled.** The sim runs at a fixed integer rate; the
  renderer runs at whatever the hardware allows and interpolates between two known sim states.
- **No `delta_time` in simulation logic.** Simulation advances by exactly `DT` per tick. Variable
  frame time only affects how many ticks accumulate per render frame.
- **Spiral-of-death prevention.** Cap `frame_time` at ~250 ms (Fiedler's recommended maximum).
  Under sustained overload, limit the number of simulation steps per render frame (e.g. 4) and
  let the simulation run in apparent slow-motion rather than spiral.
- **Interpolation is render-only.** The `lerp(previous, current, alpha)` value is only for
  display; it is never fed back into the simulation.

Assumption: `simulate()` must take significantly less than `DT` seconds of real time. If the
simulation budget exceeds `DT`, the spiral-of-death cannot be entirely avoided; profile and
optimize, or lower the fixed tick rate.

### 4. Floating-point non-determinism: the core problem

IEEE 754 does not guarantee identical results across:
- Different compilers or optimization flags (`/fp:fast` vs. `/fp:strict`) [3]
- Debug vs. release builds (optimizer reorders or fuses operations)
- x87 FPU vs. SSE2 vs. SIMD paths (x87 uses 80-bit extended precision internally) [3]
- Different CPU architectures (Intel vs. AMD x87 transcendentals differ; PowerPC has a native
  fused-multiply-add that Intel does not) [3]

Sources of variance in detail [3, 6]:

1. **Compiler contractions (FMA).** The compiler may automatically emit fused-multiply-add
   instructions, which differ from a separate multiply + add by one fewer rounding step. One
   machine emits FMA; another does not; results diverge.
2. **Intermediate precision.** The x87 FPU computes in 80-bit internally; SSE2 computes in
   64-bit strictly. The same C expression can produce different results depending on which
   register set is used.
3. **Transcendental instructions.** `fsin`, `fcos` etc. on x87 are specified with a relative
   error bound, not bit-exact values. Intel and AMD implementations differ. Workaround: use
   software implementations (e.g. `sinf()` from a controlled math library, not the FPU opcode).
4. **Non-deterministic library internals.** Physics engines (ODE, Havok) may use internal RNG
   for constraint ordering; solver iteration counts may vary with performance-adaptive code
   (Gas Powered Games found this with physics APIs in Supreme Commander [3]).

### 5. Mitigations for float determinism

Ordered from easiest/cheapest to strongest/costliest:

**5a. Avoid floats in the rule layer entirely (preferred).**
Keep all simulation math in **integer or fixed-point** arithmetic. Use floats only in the
rendering layer (lighting, interpolation, shader math — none of which feeds back into sim
state). This is the approach of StarCraft (fixed-point integer math), OpenTTD (no real numbers
in simulation by convention), and many RTS games.

Fixed-point encoding example (Q16.16, range ≈ ±32k with sub-pixel precision):
```
struct FixedPoint {
    int64_t raw;                               // 48 integer bits, 16 fractional bits
    static FixedPoint from_int(int v) { return {(int64_t)v << 16}; }
    FixedPoint operator*(FixedPoint b) const { return {(raw * b.raw) >> 16}; }
};
```
libfixmath (open source, Q16.16) provides `sqrt`, `sin`, `atan2`, etc. as lookup/integer
approximations [7].

**5b. SSE2 strict mode + `/fp:strict` (for float-based sims on one architecture).**
Gas Powered Games (Supreme Commander 1 and 2, Demigod) demonstrated over 1 million customers
that this approach holds on Intel and AMD x86 by setting at startup:
```c
_controlfp(_PC_24, _MCW_PC);   // 24-bit precision (single float)
_controlfp(_RC_NEAR, _MCW_RC); // round to nearest
```
…and asserting these settings are not clobbered by DirectX, drivers, or library calls on every
tick [3]. The constraint: this does not extend to cross-architecture targets (x86 ≠ ARM ≠
PowerPC), so it cannot protect replay compatibility between PC and console.

**5c. Software float (SoftFloat / STREFLOP / eos-vm pattern).**
For maximum cross-platform determinism (e.g., a sim that must agree between x86 native and
ARM WebAssembly), implement IEEE 754 in software. EOSIO's eos-vm and CosmWasm use this for
blockchain contract determinism [10]. Cost: ~10–30× float performance. Practical for turn-based
or slower-tick simulations; marginal for physics-heavy 60 Hz sims.

**5d. WebAssembly + NaN canonicalization.**
WASM specifies deterministic semantics for all arithmetic operators *except* NaN payload bits.
Wasmer's `canonicalize_nan` mode (used by NEAR Protocol) rewrites NaN payloads to a canonical
form at the boundary of every store/call, making WASM execution fully deterministic [10].
CosmWasm blocks floats entirely via gatekeeper config.

**5e. Avoid transcendental functions in sim logic.**
Replace `sin`/`cos`/`sqrt` with lookup tables or integer approximations. Battlezone 2 found
that wrapping transcendental calls in non-inlineable function calls forced single-precision
evaluation and harmonized Intel vs. AMD behavior [3].

### 6. Seedable PRNG: design and placement

Every random number in the simulation must come from an **explicit, seedable PRNG** that is
part of simulation state — never from `Math.random()`, `rand()`, or the OS entropy pool.

Recommended algorithms for games [12]:
- **xoshiro256\*\*** — fast (2–4 ns/call), 256-bit state, excellent statistical quality,
  passes BigCrush. Good default for a game simulation RNG.
- **splitmix64** — used to *initialize* xoshiro256 from a single 64-bit seed (prevents bad
  initial states from correlated seeds).
- **PCG family** — strong statistical quality, compact state, permutation-based output function.
  Also passes Practically Random and BigCrush.

Placement rules:
- The RNG is a **field of simulation state**, not a global. It is serialized with the snapshot.
- It is advanced in **canonical simulation order** (entity processing order must itself be
  deterministic — sort by stable entity ID, not memory address or hash-map iteration order).
- Multiple independent RNGs may coexist per domain (combat RNG, loot RNG, AI RNG) so that
  adding content in one domain does not shift draws in another (avoids "butterfly effect" on
  replay when content changes).
- ODE physics engine had an internal RNG for constraint ordering that broke determinism; fix:
  seed it with `dSetRandomSeed(frame_number)` before each simulation step [2].

### 7. Injected clocks for testability

"Wall clock" (`System.currentTimeMillis()`, `Date.now()`, `Time.now()`) must never be called
from simulation logic. Pass the current simulation time as an explicit parameter; inject a
controllable clock for everything else (timeouts, cooldowns, rate-limiting).

**Production injection:** pass `tick_number * DT` as simulation time. The accumulator loop
produces this from wall-clock elapsed time, but the simulation itself receives only the
deterministic tick-derived value.

**Test injection:** a fake clock that:
- Starts at a fixed value.
- Advances only when explicitly told to (e.g., `fake_clock.advance(1.0 / 60.0)`).
- Can be queried from any component under test without touching OS time.

This pattern is language-agnostic: `java.time.Clock` (Java), a `Clock` interface with
`SystemClock` / `FakeClock` implementations (C++/Rust/Go), or a `currentTime` lambda injected
into the sim constructor. The key invariant is the **same interface** used in production and
test — no monkey-patching or global clock replacement [13, 14].

### 8. Functional core / imperative shell

Gary Bernhardt's **Functional Core, Imperative Shell** pattern (Destroy All Software, SCNA
2012 "Boundaries" talk [4, 5]) applied to game simulation:

| Layer | Characteristics |
|---|---|
| **Simulation core (functional)** | Pure functions; no I/O; no mutation of external state; all inputs explicit parameters; returns new state. Testable without a display, network, or OS. |
| **Imperative shell** | Reads wall clock, drives the accumulator loop, samples input devices, sends/receives network packets, plays audio, issues draw calls. Wraps the core. |

The core contains: simulation tick function, rule evaluators, PRNG, fixed-point math. The shell
contains: the window, the renderer, the network socket, the audio mixer, the input poller.

**Practical boundary:** the shell calls `new_state = sim.tick(state, inputs, tick)` and owns
the state object between calls. The sim may not reach outside that call boundary. If a function
inside the sim needs to "send a message" (e.g., trigger a sound effect), it returns an
**effect list** as part of its output — a data structure the shell reads and acts on — rather
than calling the audio API directly.

### 9. Simulation / render separation and headless testability

Corollaries of the functional core pattern:

- **The sim can be instantiated without a renderer.** No `#include <SDL.h>` or OpenGL header
  in sim code. Sim compilation succeeds with no graphics drivers present. This is the test
  environment.
- **Headless CI tests:** create a sim, inject a fixed seed and fake clock, apply a scripted
  input sequence, advance N ticks, hash the resulting state, assert the hash matches a golden
  value. If the hash changes, a game-logic regression has occurred — even if it is invisible
  in manual play.
- **Performance benchmarks:** run the sim at 10× or 100× speed with a real clock stripped away,
  measure tick throughput. No render bottleneck contaminates the measurement.
- **Render-side interpolation:** the renderer reads `(previous_state, current_state, alpha)` and
  constructs its own visual representation. It never writes back to simulation state. Visual
  smoothness is entirely a render concern; sim correctness is entirely a core concern.

### 10. Shared rule core, multiple compile targets

Pattern: one rule-layer codebase (C, C++, or Rust preferred for cross-compilation; TypeScript
via Wasm also viable) compiled to:
- **Native binary** — server process or standalone client.
- **WebAssembly** — browser client or worker. Wasmer/Wasmtime as runtime for server-side WASM.

Benefits:
- Server and client cannot diverge in rule interpretation (no dual-maintenance of rule logic).
- "Parity test": run the same input sequence through the native build and the WASM build, hash
  state each tick, assert hashes match. Any divergence indicates a platform-specific bug in
  compilation or runtime.
- WASM is inherently sandboxed and portable across CPU architectures. With
  NaN-canonicalization enabled, WASM floating-point is deterministic across ARM, x86, and RISC-V
  runtimes [10].
- Code-size note: WASM bloat from a C++ simulation layer can be large; strip aggressively;
  consider splitting rule core (small, WASM) from asset pipeline (native-only).

Assumption: the rule core must be free of host-specific APIs (file I/O, threading primitives,
OS timers). These belong in the shell.

### 11. Desync detection and replay-based testing

**State hashing workflow** (Bugnet [11], Fiedler [2]):
1. After each tick, serialize all simulation state to a canonical byte buffer (entities in
   stable ID order; no pointer values; no padding bytes).
2. Compute SHA-256 (or xxHash for speed) of the buffer.
3. Broadcast the hash alongside normal network traffic.
4. On hash mismatch: record the tick, dump full state from both participants, diff field-by-field
   to identify the divergence point.

In debug builds: hash every tick. In production: hash every N ticks (10–30) to control overhead.

**Input replay for CI:**
- Record `(tick, player_id, input_struct)` tuples. This is the complete "replay file."
- CI test: load replay file, run sim from tick 0, check hash at every tick against golden
  values captured from a known-good build.
- Finding the first divergent tick in a replay pins the regression to a commit.

**Snapshot + rollback testing:**
- At tick T, serialize state to a snapshot. Continue to tick T+N. Restore snapshot. Re-simulate
  T→T+N. Assert final state is identical to the un-restored run. If it diverges, the sim has
  hidden mutable state (a static, a global, a non-serialized field) that breaks determinism.

---

## Concrete examples & references

**Factorio (Wube Software)** [9] — pure deterministic lockstep; all clients simulate identically;
only inputs travel the network; desync = game state disagrees between server and at least one
client; "the most fundamental limit is game speed is limited by the slowest player."

**Supreme Commander 1 & 2, Demigod (Gas Powered Games)** [3] — floats with strict FPU mode;
`_controlfp(_PC_24 | _RC_NEAR)` enforced every tick; physics APIs excluded because their solvers
had performance-adaptive iteration counts (non-deterministic); shipped to 1M+ customers without
desync due to FPU differences.

**Battlezone 2 (Pandemic Studios)** [3] — lockstep; discovered AMD/Intel x87 transcendental
differences; fixed by wrapping sin/cos/tan in non-inlineable calls to force single-precision.

**StarCraft / StarCraft II** — fixed-point integer math for all simulation; famously deterministic
enough that replays remain valid across patches for years.

**Age of Empires (early titles)** [8] — one of the first shipped uses of lockstep in a
commercial RTS; established the "send commands, not state" model that the genre still uses.

**OpenTTD (open-source transport sim)** — code convention: "no use of real numbers"; uses
integer arithmetic throughout the simulation; floating point only in the renderer.

**ODE Physics Engine** [2] — internal RNG used for constraint ordering caused non-determinism;
fix: `dSetRandomSeed(frame_number)` before each sim step.

**Gary Bernhardt, "Boundaries" (SCNA 2012)** [4] — originating talk for the Functional Core /
Imperative Shell pattern; the sim as a "value transformer" with effects returned as data rather
than executed inline.

**Glenn Fiedler, "Fix Your Timestep!" (2004)** [1] — canonical fixed-timestep + accumulator +
interpolation loop; the spiral-of-death analysis; decoupling sim and render framerates.

**Glenn Fiedler, "Deterministic Lockstep" (2014)** [2] — input-only synchronization; playout
delay buffer; UDP redundant-input protocol beating TCP; checksum-based desync detection.

**Glenn Fiedler, "Floating Point Determinism" (2010)** [3] — curated forum quotes from Jon
Watte, Gas Powered Games, Pandemic Studios, Shawn Hargreaves et al.; the most complete
practitioner-level survey of the problem.

**WebAssembly NaN non-determinism** [10] — only source of WASM non-determinism in scalar
arithmetic is NaN payload bits; Wasmer's `canonicalize_nan` mode (used by NEAR Protocol)
eliminates this; CosmWasm blocks floats entirely.

**xoshiro / splitmix64** [12] — David Blackman & Sebastiano Vigna's PRNG family; recommended
for game simulation; SplitMix64 used as seed expander.

---

## Design implications & transferable principles

**1. Make determinism a first-class constraint from day one.**
Retrofitting determinism into a mature codebase is an order of magnitude harder than building
it in from the start [11]. Decide at project start: will the sim be lockstep-capable? If yes,
fix the architecture before writing game logic.

**2. Float strategy is a single architectural decision.**
Choose one approach and enforce it mechanically: (a) pure integer/fixed-point rule layer,
(b) SSE2 + `/fp:strict` on one architecture, or (c) software float. Do not mix. A lint rule
or module boundary should prevent floating-point types from entering rule-layer source files if
(a) is chosen.

**3. Ban wall-clock and global RNG from the rule layer with tooling.**
In CI, run a static check (grep, custom lint, compiler attribute) that the simulation module
contains no calls to `time()`, `Date.now()`, `rand()`, `Math.random()`, or platform entropy
APIs. These are the two most common accidental sources of non-determinism.

**4. Functional core / imperative shell is the structural enforcement of these constraints.**
If the boundary is honored (sim = pure function; shell = I/O), then wall-clock and global RNG
physically cannot reach simulation logic without crossing the boundary — which is reviewable.

**5. The accumulator loop is the only correct game loop for deterministic simulation.**
Variable-`dt` sim loops ("pass real elapsed time as dt") are incompatible with determinism —
different framerates produce different floating-point sequences even with identical inputs.
Semi-fixed timestep (variable remainder step) is also not bit-exact. Only a fully fixed
`dt` produces identical results [1].

**6. Shared rule core eliminates an entire class of server/client divergence bugs.**
If the server runs a different code path for the same rule than the client, the divergence is
structural and will resurface as each rule change is made. Sharing the binary (via WASM or a
common native library) eliminates this class of bugs by construction.

**7. Seedable PRNG placement determines the blast radius of RNG changes.**
One global sim RNG means any content addition that calls the RNG shifts all downstream draws.
Multiple domain-scoped RNGs (combat, loot, AI) isolate blast radius. Advance the correct RNG
only from the correct domain call site.

**8. State hashing is the cheapest desync safety net.**
Implement tick-level state hashing in debug builds from the start. Without it, desyncs are
discovered late (if ever), and isolating the cause is weeks of work. With it, the bug is
localized to a single tick.

**9. Headless sim + golden-hash CI tests are a regression safety net for game logic.**
A game without headless tests has no safety net for logic regressions — only manual QA.
Golden-hash tests catch any change to sim output, including accidental float/int type changes,
silent rule changes, and platform-specific behavior.

**10. Lockstep imposes a latency floor and a "slowest peer" constraint.**
In lockstep, no client can advance past the tick for which all peers' inputs have been
received. This creates a minimum command latency of ~1 RTT and means the slowest peer governs
simulation speed for all [2, 9]. RTS games mask this with animation ("Yes, sir!"). Real-time
action games typically prefer **rollback netcode** (client-side prediction + replay) over pure
lockstep; see [[netcode-authoritative-multiplayer]]. The determinism architecture described
here is a prerequisite for both.

---

## Open questions to resolve per project

- **Float strategy:** pure fixed-point throughout, or SSE2-strict + single-architecture
  constraint? Fixed-point is the safer cross-platform choice; SSE2-strict requires CI
  enforcement that the same compiler and flags are used for all players.
- **Tick rate:** 20 Hz (RTS-style, low bandwidth), 30 Hz (many action games), 60 Hz (fighting
  games, platformers). Higher tick rate increases CPU budget per frame and bandwidth for
  input packets.
- **Lockstep vs. rollback:** lockstep simpler to implement and verify deterministic; rollback
  requires deterministic *and* fast-enough to re-simulate N ticks per render frame. Choose
  based on tolerable input latency and genre conventions.
- **Multiple domain RNGs vs. one:** one is simpler; multiple isolates replay-breaking blast
  radius when content is added. Make this decision before writing game logic.
- **WASM target:** compile rule core to WASM for browser clients? Adds build complexity;
  gains browser reach, sandboxing, and cross-architecture portability with NaN canonicalization.
- **Snapshot format:** binary (fast, compact, brittle to schema change) vs. structured
  (slower, larger, self-describing for debugging). Use structured in debug/test builds;
  binary in production.
- **Desync budget in production:** hash every tick (high overhead, catches bugs immediately)
  or every N ticks (low overhead, latency to detection). Typical: every tick in debug/beta,
  every 30 ticks in release.

---

## Sources

1. Glenn Fiedler, "Fix Your Timestep!" — https://gafferongames.com/post/fix_your_timestep/
2. Glenn Fiedler, "Deterministic Lockstep" — https://gafferongames.com/post/deterministic_lockstep/
3. Glenn Fiedler, "Floating Point Determinism" — https://gafferongames.com/post/floating_point_determinism/
4. Gary Bernhardt, "Boundaries" (SCNA 2012 talk) — https://www.destroyallsoftware.com/talks/boundaries
5. Gary Bernhardt, "Functional Core, Imperative Shell" (DAS screencast) — https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell
6. Bruce Dawson, "Floating-Point Determinism" — https://randomascii.wordpress.com/2013/07/16/floating-point-determinism/
7. libfixmath (Q16.16 fixed-point library) — https://github.com/PetteriAimonen/libfixmath
8. Socratopia, "Lockstep as the RTS Gold Standard" — https://www.socratopia.app/library/math-for-game-devs-en/chapter-30
9. Factorio Wiki, "Desynchronization" — https://wiki.factorio.com/Desynchronization
10. Xedonman, "Determinism & WASM" (Haderech Dev) — https://medium.com/haderech-dev/determinism-wasm-40e0a03a9b45
11. Bugnet Blog, "How to Debug Multiplayer Desync Issues in Games" — https://bugnet.io/blog/how-to-debug-multiplayer-desync-issues-in-games
12. David Blackman & Sebastiano Vigna, xoshiro / prng.di.unimi.it — https://prng.di.unimi.it/
13. Medium, "Mock the Clock, Not My Tests" (java.util.Clock pattern) — https://medium.com/@Tom1212121/mock-the-clock-not-my-tests-how-java-util-clock-saved-my-sanity-b0b9730a2244
14. Jonas G., "How to Effectively Test Time-Dependent Code" — https://jonasg.io/posts/how-to-effectively-test-time-dependent-code/
15. Jakub Tomsu, "Reliable fixed timestep & inputs" — https://jakubtomsu.github.io/posts/input_in_fixed_timestep/
16. WebAssembly FAQ — https://webassembly.org/docs/faq/
17. Snapnet, "Netcode Architectures Part 1: Lockstep" — https://www.snapnet.dev/blog/netcode-architectures-part-1-lockstep/
18. OpenTTD source conventions (integer-only simulation) — https://www.openttd.org/
