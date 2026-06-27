---
title: Rust for systems & games — language model, when to choose it, and version notes for 1.96
slug: rust-for-systems-and-games
domain: toolchain
tags: [rust, memory-safety, ownership, borrow-checker, fearless-concurrency, webassembly, cargo, ecs, gamedev, zero-cost-abstractions, msrv]
status: active
updated: 2026-06-27
confidence: high
sources: 12
supersedes:
abstract: "Decision-level reference on Rust's value proposition — memory safety without GC, type-driven correctness, fearless concurrency, Wasm portability — and when to choose it for systems and game work."
---

## Scope

A **project-agnostic** decision and architecture reference on the Rust programming language. Covers: the core value proposition (why Rust, not just what it is); ownership/borrowing/lifetimes as a conceptual model and their learning-curve cost; the type-system correctness idioms most relevant to game and simulation work (making illegal states unrepresentable, `parse-don't-validate`, exhaustive `match`); error handling as values vs. exceptions; fearless concurrency; the tooling ecosystem (Cargo, workspaces, Clippy, rustfmt, cargo-nextest, proptest, cargo-mutants); compiling to WebAssembly for shared client/server rule cores; the gamedev ecosystem (ECS, Bevy, Are We Game Yet); and the known tradeoffs (compile times, learning curve, ecosystem gaps). Includes verified version notes for the pinned Rust **1.96.0** (released 2026-05-28) and the editions landscape (2021 / 2024). Written to inform architecture and toolchain choices on any system or game project. The house style rules and enforcement toolchain are in `standards/language/rust.md`; this doc is the *why*, not the *how*. Pairs with [[webassembly-and-wasm-pack]] and [[deterministic-simulation-architecture]].

---

## Key findings

### 1. The core value proposition: memory safety without a garbage collector

Rust's headline claim is that it eliminates whole classes of memory bugs — use-after-free, dangling pointers, double-free, buffer overruns, and data races — **at compile time, with no runtime cost**. The mechanism is the ownership system: every value has exactly one owner, transfers of ownership are explicit, and the compiler tracks when resources go out of scope and frees them deterministically. There is no garbage collector, no reference-counting by default, no runtime pause.

For systems and game programming, this has a concrete architectural implication: **Rust gives C/C++-level throughput and latency with no GC stop-the-world events**. A game's tick loop at 60 Hz cannot afford arbitrary pauses; languages with tracing GCs (Go, Java, C#) require careful tuning to suppress GC pauses during gameplay, whereas a Rust game loop is simply not subject to that class of problem. Memory is freed precisely when a scope exits, making latency behaviour deterministic and easy to reason about.

This is the primary reason to choose Rust over a GC language for latency-sensitive systems: **not raw throughput** (C++ is comparable), but **predictability**. You know when allocations happen, you know when frees happen, and neither is controlled by a background runtime.

### 2. Ownership, borrowing, and lifetimes — the conceptual model and the learning curve

The ownership system has three rules the compiler enforces:

1. Each value has exactly one owner.
2. When the owner goes out of scope, the value is dropped.
3. There may be any number of immutable references (`&T`) **or** exactly one mutable reference (`&mut T`) at any one time — never both simultaneously.

Rule 3 is the borrow checker. It is also the mechanism that eliminates data races: if you cannot have a mutable reference coexist with any other reference, no two threads can simultaneously read-and-write the same memory without explicit synchronisation primitives. The compiler proves this statically.

**Lifetimes** are the compiler's notation for how long a reference is valid. In simple cases they are inferred; in complex cases (storing references in structs, writing certain APIs) they must be named explicitly. Named lifetimes are the single steepest part of the learning curve.

**Learning curve cost — honest assessment.** Developers with backgrounds in C++ or systems programming typically take 2–4 weeks to be productive; those coming from garbage-collected languages (Python, JavaScript, Java) typically take 4–8 weeks. The friction is real and front-loaded: the borrow checker rejects code that would be valid in other languages, until the programmer internalises why. After that period, most developers report that the compiler's rejection messages become helpful rather than obstructive. The tradeoff is that once code compiles, a large class of bugs is statically excluded. There is a known frustration that the borrow checker can be overly conservative in certain patterns (self-referential structs, complex graph structures), requiring workarounds (`Rc<RefCell<T>>`, arenas, index-based graphs). These patterns appear regularly in game engines.

### 3. The type system for correctness — making illegal states unrepresentable

Rust's type system, combined with exhaustive `match`, is a primary tool for making correctness a compile-time property rather than a runtime check. Three idioms are load-bearing for simulation and game work:

**Parse, don't validate.** Instead of accepting a raw value and sprinkling validation checks throughout code, construct a validated type at the boundary and use it thereafter. If `NonZeroU32` or a newtype wrapper `pub struct PlayerId(u32)` cannot be constructed without validation, the rest of the code never needs to check — the type carries the proof. This collapses entire categories of "passed the wrong id" or "zero is an invalid health value" bugs.

**Making illegal states unrepresentable via enums.** Rust `enum` variants can carry data, so a state machine with mutually exclusive states can be encoded so that invalid combinations literally cannot be constructed. A network connection that is either `Connecting`, `Connected { socket: TcpStream, peer_addr: SocketAddr }`, or `Disconnected { reason: DisconnectReason }` cannot accidentally be "connected without an address" because the type forbids it.

**Exhaustive `match`.** Every `match` on an enum must cover every variant; the compiler errors if a case is missing. Adding a new variant to an enum causes every downstream `match` to fail compilation until it handles the new case. In a game codebase with many message types or state transitions, this is a significant safety property: you cannot add a new ability or input event and forget to handle it somewhere. This is the type-system equivalent of a protocol buffer's `required` field.

### 4. Error handling: errors as values, not exceptions

Rust has no exceptions. Fallible operations return `Result<T, E>` (recoverable failure) or `Option<T>` (presence/absence). The caller must explicitly handle or propagate the error; there is no unchecked throw path. The `?` operator threads errors up the call stack with minimal syntax overhead.

The architectural benefit is that a function's signature is its complete contract. If a function can fail, `Result` is in the signature; if it cannot, it is not. Callers cannot silently ignore errors — the type system requires them to make a choice. This eliminates entire categories of bugs where exceptions were thrown in rarely-tested paths and silently swallowed.

For game servers, this matters particularly in network and I/O paths, where partial reads, disconnected peers, and malformed packets are the common case. A `Result`-returning parse function cannot be called and its failure silently ignored; the code must handle it or propagate it to a context where it is logged and the connection dropped cleanly.

**`panic!` is not error handling.** Rust's `panic!` macro unwinds the current thread and is appropriate for programmer errors (assertion failures, index-out-of-bounds), not for expected failure modes. In a server that must stay up, `panic!` in a request handler should be caught at the task boundary and the task restarted; application code should not rely on `panic!` for control flow.

### 5. Fearless concurrency via the type system

Rust's concurrency safety comes from the same ownership rules, extended with two marker traits:

- `Send`: a type is safe to transfer ownership to another thread.
- `Sync`: a type is safe to share a reference to across threads (i.e., `&T` is `Send`).

The compiler derives these automatically for most types. Types that are explicitly not thread-safe (e.g., `Rc<T>`, `Cell<T>`, raw pointers) do not implement `Send`/`Sync`, and attempting to send them across a thread boundary is a compile error. The canonical synchronised types — `Arc<Mutex<T>>`, `Arc<RwLock<T>>`, channels — are `Send + Sync`.

The practical result: **data races in Rust are a compile error, not a runtime data corruption event**. This does not eliminate all concurrency bugs (deadlock, starvation, and logical races are still possible), but it eliminates the most catastrophic class. Porting a single-threaded Rust program to use threads typically surfaces type errors at the locations where sharing is unsafe, and fixing them forces explicit choice of a synchronisation primitive — not silent undefined behaviour.

For game servers with CPU-parallel ECS systems or for a simulation codebase with worker threads, this gives high confidence in the threading model without requiring exhaustive testing of rare race conditions.

### 6. Zero-cost abstractions: traits, generics, and monomorphization

Rust's generics are resolved at compile time via **monomorphization**: the compiler generates a concrete copy of generic code for each concrete type instantiation. The result is that calling a generic function is indistinguishable in cost from calling a concrete function — no virtual dispatch, no boxing, no runtime type tag lookup.

Traits (Rust's equivalent of interfaces or typeclasses) allow polymorphism through either **static dispatch** (`impl Trait` / `T: Trait` bounds, resolved at compile time via monomorphization) or **dynamic dispatch** (`dyn Trait`, a vtable pointer at runtime, comparable to C++ virtual functions). The choice is explicit and local; the default is static dispatch.

This matters for game hot paths. An ECS system that calls a physics solver, a renderer, or a network serialiser through a trait bound pays zero overhead vs. calling the concrete function directly. The idiomatic Rust pattern of composing behaviour through traits rather than inheritance trees achieves the same flexibility as OOP polymorphism without the vtable cost on hot paths.

The cost of monomorphization is **code size** and **compile time**: each generic instantiation adds binary size and incremental compile work. This is a real tradeoff in large codebases with many generic types.

### 7. Cargo, workspaces, and the tooling ecosystem

**Cargo** is Rust's all-in-one build system and package manager. It handles dependency resolution (`Cargo.toml` / `Cargo.lock`), building, testing, benchmarking, documentation generation, and publishing to crates.io. The dependency and build experience is widely considered the gold standard among systems languages.

**Workspaces** are Cargo's multi-crate monorepo primitive: a `[workspace]` in the root `Cargo.toml` groups member crates that share a single `Cargo.lock`, unified build cache, and dependency deduplication. For a game or simulation project, a typical workspace might contain: `game-core` (simulation rules, shared between server and wasm client), `game-server` (async networking), `game-client` (rendering), and `game-tests` (integration tests across crates). This enables strict layering with compile-time enforcement: `game-server` can depend on `game-core` but not vice versa, and that invariant is mechanical.

**Clippy** is the official linter, shipping with Rust and covering hundreds of lint categories from correctness to performance to idiom. Running `cargo clippy --all-targets --all-features -- -D warnings` as a CI gate is standard practice and catches a surprisingly large fraction of real bugs.

**rustfmt** is the official formatter; it is deterministic and opinionated. `cargo fmt --check` in CI eliminates formatting debate entirely.

**cargo-nextest** is the preferred test runner, offering parallel test execution with better output, test filtering, retry logic, and timing information. It is a drop-in for `cargo test` for most cases and meaningfully faster in large workspaces.

**proptest** and **quickcheck** enable property-based testing: declare a property that should hold for all inputs, and the library generates randomised inputs to find counter-examples. For deterministic simulation code (rules engines, physics integrations), property tests are a high-leverage investment because they explore the input space far more thoroughly than hand-written test cases.

**cargo-mutants** applies mutation testing: it systematically introduces small mutations into the source code (negating a condition, changing an operator) and verifies that the test suite detects them. This measures the actual fault-detection capability of the test suite rather than just line coverage.

**sccache** (shared compilation cache) and modern linkers (`mold` on Linux, `lld` on all platforms) are the primary levers for reducing compile times in CI and local development. `sccache` is most effective on clean builds; incremental compilation handles iterative local development. The combination reduces link times from tens of seconds to 1–3 seconds in typical game-sized workspaces.

### 8. Compiling to WebAssembly — the shared-logic architecture

Rust has first-class WebAssembly support via two primary targets:

- **`wasm32-unknown-unknown`**: for browser environments; produces a `.wasm` binary with no OS dependencies.
- **`wasm32-wasip1` / `wasm32-wasi`**: for server-side Wasm runtimes (Wasmtime, WasmEdge, Fastly Compute, etc.) that expose POSIX-like system calls via WASI.

The **shared-logic architecture** that makes Rust particularly valuable for multiplayer game development: write the authoritative simulation rules once, in a `no_std`-compatible or WASI-compatible crate, and compile it to **both** the native server binary and the `wasm32` client target. The browser client and the game server run the same code path. This is the strongest technical argument for Rust over C++ when building a web-accessible multiplayer game: C++ can compile to Wasm via Emscripten, but the ecosystem friction is substantially higher than Rust's native `wasm32` target with `wasm-pack` and `wasm-bindgen`.

For a deterministic tick-loop simulation (see [[deterministic-simulation-architecture]]), the shared-rule crate enforces that both endpoints run identical floating-point arithmetic (or fixed-point) without any adaptation layer. Divergence bugs between client and server are caught in unit tests of the shared crate, not by comparing runtime traces.

As of Rust 1.96, the WebAssembly targets no longer pass `--allow-undefined` to the linker by default. Undefined symbols during Wasm linking are now a hard error. This is a correctness improvement: it catches misconfigured builds and symbol naming bugs at link time rather than at Wasm instantiation time. Projects relying on the old behaviour of importing undefined symbols from the `"env"` module must add `RUSTFLAGS=-Clink-arg=--allow-undefined` or use explicit `#[link(wasm_import_module = "env")]` annotations. This change was pre-announced on the Rust Blog in April 2026 before taking effect in 1.96.

### 9. The gamedev ecosystem — honest status

**Bevy** is the dominant open-source Rust game engine (Apache 2.0 / MIT). It is ECS-first: game logic is structured as Systems that query Components attached to Entities. The ECS scheduler parallelises systems automatically based on the borrow checker's proof that two systems touching disjoint components can run concurrently. Bevy 0.18 (early 2026) shipped an editor preview and reached a maturity level where assembling a real game without writing every subsystem from scratch is tractable. It is not yet 1.0 and has a history of significant API churn between minor versions.

**Are We Game Yet? (arewegameyet.rs)** is the community index of Rust game libraries. As of mid-2026 it has seen renewed contribution after a period of reduced maintenance. Physics (Avian, covering 2D/3D), audio (kira), ECS (Bevy, hecs, shipyard), and networking (laminar, quinn for QUIC) are sufficiently mature for serious use. Asset pipeline tooling and toolchain integration for artists remain the weakest areas.

**Honest maturity assessment.** Bevy in 2026 is roughly where Godot was in 2022: a credible choice for a specific class of indie project, not yet the default choice for all games. The ECS architecture is a paradigm shift that has real productivity advantages for data-oriented, parallel gameplay code but a steeper entry ramp than object-oriented scene-graph engines. **The best argument for using Bevy is not that it is more ergonomic than Unity or Godot today — it is not — but that its correctness and concurrency model aligns well with server-side simulation code written in the same language**, enabling true shared logic across client, server, and simulation test harness.

For projects where the client rendering engine is Unity or Godot and Rust is used for the server and shared rule core only, the ECS question is moot: Rust shines as a systems language for the server binary regardless of the client engine.

### 10. Tradeoffs and failure modes

**Compile times.** Rust's compilation is slow relative to Go, and noticeably slower than C++ in incremental clean-crate rebuilds. The combination of monomorphization, codegen units, LLVM IR optimisation, and linking adds up. Mitigation: workspace decomposition into fine-grained crates (maximises incremental compilation hit rate), `mold` or `lld` as the linker, `sccache` in CI, and `cargo nextest` with `--no-fail-fast` to run tests in parallel. Cold CI builds for a medium-sized game workspace run 3–8 minutes; incremental dev-loop builds are typically 5–20 seconds after the first build.

**Learning curve.** The borrow checker frustration is front-loaded but does not go away for certain patterns. Self-referential structures (nodes with parent/child pointers), complex ownership graphs, and async Rust (which adds `Pin` and `Future` lifetimes to the cognitive load) are genuinely harder than equivalent C# or Python code. The payoff — compile-time safety and fearless refactoring — is real, but should not be understated as a hiring and onboarding cost.

**Ecosystem churn.** Rust moves fast. The six-week release cadence and the history of edition changes mean that code written against a 2021-era API may need updating for 2024-edition idioms. Bevy in particular has broken plugin APIs between every 0.x minor release. Pinning versions (`Cargo.lock` committed, explicit MSRV declaration) and keeping a migration discipline are necessary.

**Unsafe code.** Rust permits `unsafe` blocks that bypass the borrow checker. Game engines and low-level libraries use `unsafe` for performance-critical paths (SIMD, FFI, custom allocators). The existence of `unsafe` does not break the broader safety guarantees — unsafe code is audited at boundaries — but it does mean that a codebase with undisciplined `unsafe` usage can reintroduce the bugs Rust was chosen to prevent. The rule: unsafe code should be encapsulated behind safe APIs, and `cargo-audit` / `cargo-geiger` should surface the unsafety surface in dependencies.

---

## Concrete examples & references

- **The Rust Book, Chapter 4 (Ownership)**: Canonical explanation of ownership and borrowing with interactive examples. The basis for any new Rust team member's onboarding. "None of the features of ownership will slow down your program while it's running." (https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)

- **The Rust Book, Chapter 16 (Fearless Concurrency)**: Covers `Send`/`Sync`, channels, and `Mutex`. "By leveraging ownership and type checking, many concurrency errors are compile-time errors in Rust rather than runtime errors." (https://doc.rust-lang.org/book/ch16-00-concurrency.html)

- **Rust Blog, "Abstraction without overhead: traits in Rust" (2015)**: The foundational post explaining how generics and monomorphization deliver zero-cost abstractions. Still the best single explanation of why Rust generics have no runtime overhead vs. C++ templates. (https://blog.rust-lang.org/2015/05/11/traits/)

- **Announcing Rust 1.85.0 and Rust 2024 Edition (2025-02-20)**: Official announcement stabilising the Rust 2024 edition. Key 2024 edition changes: async closures (`async || {}`), tighter RPIT lifetime capture, unsafe extern blocks, changes to `if let` temporary scopes, and style editions for `rustfmt`. The 2024 edition requires opt-in per crate via `edition = "2024"` in `Cargo.toml`. (https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/)

- **Announcing Rust 1.96.0 (2026-05-28)**: Official release notes. Key stabilisations: `core::range::Range*` Copy-implementing range types (RFC 3550); `assert_matches!` and `debug_assert_matches!` macros; `From<T> for LazyCell/LazyLock`; Wasm linker change (undefined symbols now a hard error). Also patches CVE-2026-5223 (crate tarball symlink extraction) and CVE-2026-5222 (authentication URL normalisation) in Cargo for third-party registry users. (https://blog.rust-lang.org/2026/05/28/Rust-1.96.0/)

- **harudagondi, "Parse, don't Validate and Type-Driven Design in Rust"**: Concrete walkthrough of newtype wrappers, fallible constructors, and how exhaustive `match` enforces completeness. Demonstrates `NonZeroF32` and `NonEmptyVec` as examples of illegal-states-unrepresentable. (https://harudagondi.space/blog/parse-dont-validate-and-type-driven-design-in-rust/)

- **Are We Game Yet? (arewegameyet.rs)**: Community-maintained index of Rust game development libraries, engines, and resources. The primary resource for discovering what is mature vs. experimental in the Rust gamedev ecosystem. (https://arewegameyet.rs/)

- **Bevy Engine (bevy.org)**: Open-source Rust ECS game engine. Bevy 0.18 (early 2026) includes an editor preview, improved scheduler, and a substantially larger plugin ecosystem. The engine is pre-1.0 with ongoing API churn. (https://bevy.org/)

- **Rust and WebAssembly Book (rustwasm.github.io)**: Official guide to compiling Rust to `wasm32-unknown-unknown`, using `wasm-bindgen` for JavaScript interop, and using `wasm-pack` to build npm-compatible packages. (https://rustwasm.github.io/book/)

- **Shuttle, "Rust Tooling: 8 tools that will increase your productivity" (2024)**: Practical survey of Clippy, rustfmt, cargo-nextest, sccache, and related tools with configuration guidance. (https://www.shuttle.dev/blog/2024/02/15/best-rust-tooling)

- **Rust Blog, "Changes to WebAssembly targets and handling undefined symbols" (2026-04-04)**: Pre-announcement of the Wasm linker behaviour change that landed in 1.96. Explains the migration path for projects using `--allow-undefined`. (https://blog.rust-lang.org/2026/04/04/changes-to-webassembly-targets-and-handling-undefined-symbols/)

- **Rust FAQ, "How to Manage the MSRV"**: Explains the `rust-version` field in `Cargo.toml`, its role in dependency resolution (enabled by RFC 3537, MSRV-aware resolver), and how `rust-toolchain.toml` pins the exact toolchain for a project. (https://www.rustfaq.org/en/how-to-manage-the-msrv-minimum-supported-rust-version/)

- **JetBrains "The State of Rust Ecosystem 2025" (2026-02-11)**: Survey of Rust adoption, pain points, and tooling usage across thousands of Rust developers. Confirms compile times and the learning curve as the top-reported friction points; confirms Cargo and Clippy as among the most-valued aspects. (https://blog.jetbrains.com/rust/2026/02/11/state-of-rust-2025/)

---

## Design implications & transferable principles

**1. Choose Rust when predictable latency matters more than raw throughput, or when safety must be proven rather than tested.**
GC-based languages can reach comparable throughput on benchmarks, but they cannot guarantee absence of GC pauses. For a 60-Hz tick loop, a 10 ms stop-the-world pause is a missed frame. Rust eliminates that risk structurally. Separately: if correctness of a simulation or protocol is hard to test exhaustively (state spaces too large), Rust's type system encodes many correctness properties as compile-time facts, reducing the surface that testing must cover.

**2. Structure the codebase around a shared-logic crate from day one.**
The highest-leverage architectural decision in a Rust multiplayer game project is putting the authoritative simulation rules in a `no_std`-compatible workspace crate early. This crate can be compiled to both native (server) and `wasm32` (browser client) targets. Adding Wasm support later requires retrofitting `no_std` compatibility and removing platform-specific dependencies, which is far more expensive than designing for it upfront. See [[webassembly-and-wasm-pack]].

**3. Use the type system to encode invariants, not just to satisfy the borrow checker.**
The borrow checker prevents memory unsafety, but the bigger productivity gain from Rust's type system comes from domain modelling: newtype wrappers for distinct ID types, enums that make impossible state combinations unrepresentable, `Result`-returning constructors as the only way to produce validated types. Teams that treat the type system as a documentation tool ("I have to add these types to make it compile") leave most of the value on the table. Teams that treat it as a correctness tool ("I will encode this invariant in the type so it can never be violated") see dramatically fewer runtime bugs in production.

**4. Decompose workspaces into fine-grained crates early; do not wait for compile-time pain.**
A monolithic crate with 50,000 lines of code forces a full recompile on nearly any change. A workspace with 15 focused crates (core rules, input handling, networking, rendering, serialisation, etc.) recompiles only the changed crate and its dependents. The layering discipline this imposes — each crate must declare its dependencies explicitly — also prevents architecture drift where "everything depends on everything."

**5. Pin the toolchain and declare MSRV explicitly.**
Use `rust-toolchain.toml` to specify the exact Rust version used in the project (`channel = "1.96.0"`, `components = ["rustfmt", "clippy"]`). Declare `rust-version = "1.96"` in the workspace `Cargo.toml`. This prevents "works on my machine / fails in CI" scenarios and makes it unambiguous when a dependency requires a newer compiler. The six-week release cadence means dependencies can silently require a newer Rust than the one your CI uses. Pinning makes that a controlled, deliberate upgrade rather than a surprise.

**6. Async Rust is not beginner Rust; introduce it deliberately.**
Async/await in Rust is the mechanism for high-concurrency I/O (a game server handling thousands of connections) and is heavily used in networking crates (tokio, async-std). It introduces `Pin`, `Future` lifetimes, and `Send` bounds that are substantially harder than synchronous Rust. Teams new to Rust should start with synchronous code, get comfortable with the borrow checker, then introduce async. Mixing async and sync incorrectly (blocking inside async executors) is a common source of subtle performance bugs.

**7. Treat `unsafe` as a bounded audit surface, not a blanket escape hatch.**
Every `unsafe` block in the codebase is a location where the compiler's safety guarantees do not apply. Mark the boundary explicitly with a `// SAFETY:` comment explaining the invariant that makes the code safe. Run `cargo-geiger` to measure the unsafe surface. The acceptable-unsafe pattern: a small, well-audited `unsafe` core wrapped behind a safe public API. The unacceptable pattern: `unsafe` sprinkled throughout application logic because a borrow-checker restriction was inconvenient.

**8. Budget for compile-time infrastructure from the start.**
A team that sets up `mold` or `lld`, sccache, and cargo-nextest on day one will never notice compile times as a problem. A team that builds a large workspace without these tools and then tries to retrofit them after the workspace is established will face a more disruptive transition. Treat the build infrastructure the same way as testing infrastructure: set it up before it becomes painful.

---

## Open questions to resolve per project

- Is the shared-logic crate approach feasible given the target platforms? If targeting iOS/Android native, `wasm32` compilation may not be the primary sharing mechanism; a native shared library is instead. Understand the client deployment model before committing to the architecture.
- What is the concurrency model for the server? If the server is primarily I/O-bound (many connections, thin game logic per tick), async Rust (tokio) is appropriate. If it is CPU-bound (heavy physics simulation per tick), a thread-per-core model with message passing may be better. The choice affects which concurrency primitives are idiomatic throughout the codebase.
- Is Bevy the right choice for the client, or is the client a web browser, native GUI, or an existing engine (Unity, Godot)? If the client is not Bevy, the case for Bevy's ECS on the server is weaker; a lighter-weight ECS (hecs, legion) or no ECS at all may be more appropriate for the server.
- How will the edition strategy be managed for dependencies? Projects pinning Rust 1.96 will see their dependencies gradually adopt the 2024 edition. The 2021/2024 edition boundary is seamless at the crate level (crates of different editions interoperate), but the team needs a policy for when to migrate the project's own crates to the 2024 edition.
- What is the plan for unsafe code in performance-critical paths? If SIMD physics, custom allocators, or FFI with C libraries are anticipated, establish the `unsafe` audit process and the `// SAFETY:` documentation discipline before the first `unsafe` block is written.
- Has the team accounted for Bevy's pre-1.0 API churn in the schedule? Bevy 0.x minor versions have historically broken plugin APIs. Projects using Bevy should plan for a meaningful migration cost on each Bevy upgrade and avoid coupling too tightly to Bevy internals.

---

## Version notes: Rust editions and 1.96

**Release cadence.** Rust ships a new stable version every **six weeks** on a fixed train schedule. Nightly → Beta → Stable, six weeks each. As of this writing (June 2026), Rust **1.96.0** is the current stable release (released 2026-05-28).

**Editions.** Rust editions are opt-in, roughly-triennial snapshots of language evolution that may introduce syntax changes or new defaults that would otherwise break existing code. Editions are backward-compatible at the crate boundary: a 2021-edition crate can depend on a 2024-edition crate seamlessly. Migration is semi-automated via `cargo fix --edition`. Current editions: **2015** (original), **2018** (improved module paths, `dyn Trait` syntax), **2021** (prelude additions, disjoint closure capture, `IntoIterator` for arrays), **2024** (stabilised in Rust 1.85.0, February 2025: async closures, tighter RPIT lifetime capture, `unsafe extern` blocks, `unsafe` attribute changes, reformatted `rustfmt` style edition). For new projects, **edition = "2024"** is the recommended starting point.

**Rust 1.96.0 — notable for pinned projects (2026-05-28):**

- **`core::range` Copy range types (RFC 3550 — stable).** New `core::range::Range`, `core::range::RangeFrom`, `core::range::RangeInclusive` types implement `Copy` + `IntoIterator` (not `Iterator`), resolving the long-standing footgun of `Range` being non-`Copy`. Useful for storing ranges in `Copy` structs (e.g., a `Span` type carrying a `Range<usize>` as a bitset or buffer slice descriptor). The legacy `std::ops::Range` types continue to work; range literals (`0..10`) still produce legacy types. Migration to new types is opt-in and forwards; prefer `impl RangeBounds` in public APIs to accept both.
- **`assert_matches!` / `debug_assert_matches!` — stable.** Pattern-matching assertions with improved diagnostic output (prints the `Debug` value on failure vs. just "assertion failed"). Useful in tests for game state verification. Not added to the prelude to avoid collision with the popular `assert_matches` third-party crate; import from `core::assert_matches`.
- **Wasm linker change.** Undefined symbols are now a hard linker error for all Wasm targets (not converted to `"env"` imports). Projects using `--allow-undefined` behaviour must add `RUSTFLAGS=-Clink-arg=--allow-undefined` or explicit `#[link(wasm_import_module)]` annotations. This is a breaking change for some Wasm build setups; the change was pre-announced in April 2026.
- **Cargo security patches.** CVE-2026-5223 (medium: symlink extraction in third-party registry tarballs) and CVE-2026-5222 (low: URL normalisation in authentication) are fixed. Users of crates.io are unaffected; users of private or third-party registries should upgrade.
- **Minimum LLVM version raised to 21.** Relevant only for teams building Rust from source.
- **`expr` metavariable in `cfg`.** Allows passing expression metavariables to `cfg` in macro contexts, tightening hygiene in complex procedural macro setups.

**MSRV / pinning rationale.** Pinning to 1.96.0 gives a stable, reproducible compiler with a concrete set of stabilised APIs. The `rust-version = "1.96"` field in `Cargo.toml` combined with a `rust-toolchain.toml` specifying `channel = "1.96.0"` ensures every developer and CI runner uses the same compiler. When upgrading (every few months is typical), the process is: update `rust-toolchain.toml`, run `cargo update`, review changed dependency MSRV requirements, and validate the test suite. The six-week cadence means waiting one or two releases before upgrading is low-risk and allows point releases to address any regressions.

---

## Sources

1. https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html — The Rust Programming Language, Chapter 4: Understanding Ownership
2. https://doc.rust-lang.org/book/ch16-00-concurrency.html — The Rust Programming Language, Chapter 16: Fearless Concurrency
3. https://blog.rust-lang.org/2015/05/11/traits/ — Rust Blog, "Abstraction without overhead: traits in Rust", 2015
4. https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/ — Rust Blog, "Announcing Rust 1.85.0 and Rust 2024", 2025-02-20
5. https://blog.rust-lang.org/2026/05/28/Rust-1.96.0/ — Rust Blog, "Announcing Rust 1.96.0", 2026-05-28
6. https://blog.rust-lang.org/2026/04/04/changes-to-webassembly-targets-and-handling-undefined-symbols/ — Rust Blog, "Changes to WebAssembly targets and handling undefined symbols", 2026-04-04
7. https://harudagondi.space/blog/parse-dont-validate-and-type-driven-design-in-rust/ — harudagondi, "Parse, don't Validate and Type-Driven Design in Rust"
8. https://arewegameyet.rs/ — Are We Game Yet?, community index of Rust gamedev libraries
9. https://bevy.org/ — Bevy Engine, open-source Rust ECS game engine
10. https://rustwasm.github.io/book/ — Rust and WebAssembly Book, official guide to wasm32 targets
11. https://www.shuttle.dev/blog/2024/02/15/best-rust-tooling — Shuttle, "Rust Tooling: 8 tools that will increase your productivity", 2024
12. https://blog.jetbrains.com/rust/2026/02/11/state-of-rust-2025/ — JetBrains, "The State of Rust Ecosystem 2025", 2026-02-11
