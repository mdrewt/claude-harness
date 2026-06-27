---
title: WebAssembly and the Rust→Wasm toolchain — shared client/server logic, the JS↔Wasm boundary, and wasm-pack/wasm-bindgen
slug: webassembly-and-wasm-pack
domain: toolchain
tags: [webassembly, wasm, rust, wasm-pack, wasm-bindgen, wasm-opt, binaryen, client-prediction, shared-logic, js-interop, code-size]
status: active
updated: 2026-06-27
confidence: high
sources: 14
supersedes:
abstract: "Decision-level reference on compiling Rust to Wasm for shared client/server logic: the boundary cost, toolchain (wasm-pack 0.13–0.15, wasm-bindgen), and architecture tradeoffs."
---

## Scope

A **project-agnostic** deep reference on WebAssembly (Wasm) as a compilation target for Rust, focused on the specific architecture pattern of compiling *one shared simulation/rule codebase* to both a native server binary and a browser-client Wasm module — so the same logic runs authoritatively on the server and for client-side prediction in the browser. Covers: the Wasm execution model and why it is useful; the JS↔Wasm linear-memory boundary and its marshaling cost; how wasm-bindgen and wasm-pack automate the glue layer; build targets and code-size optimization; threads and SIMD; the Component Model on the horizon; testing native/Wasm parity; and architectural tradeoffs at the decision level. API usage and per-project configuration belong in the `wasm-boundary` skill, not here. Pairs with [[deterministic-simulation-architecture]], [[netcode-authoritative-multiplayer]], and [[rust-for-systems-and-games]].

---

## Key findings

### 1. What WebAssembly is and why it matters for shared logic

WebAssembly is a binary instruction format for a stack-based virtual machine. It is designed as a portable compilation target for languages like Rust, C, and C++, runs inside a sandboxed environment in every major browser, and executes at near-native speed after JIT/AOT compilation by the browser engine. Key properties:

- **Near-native throughput.** WebAssembly runs 1.2–2× slower than native on typical compute-heavy workloads (benchmarked Rust→Wasm via wasm-pack vs. native in 2025 benchmarks). For physics and collision logic that would otherwise have to be re-implemented in JavaScript, this is a massive improvement over pure-JS equivalents.
- **Sandboxed.** The Wasm module cannot read or write arbitrary host memory; it only sees its own linear memory region. The host (browser JS engine or server runtime) controls all I/O.
- **Language-agnostic.** The binary format is a compilation target, not a language. Rust is the most ergonomic source language today for Wasm due to its toolchain maturity and zero-overhead abstraction model (see [[rust-for-systems-and-games]]).
- **Portable across environments.** The same `.wasm` binary (for `wasm32-unknown-unknown` target) can be loaded in Chrome, Firefox, Safari, Node.js, Deno, and WASI-compatible runtimes.
- **WebAssembly 3.0** was ratified by W3C in September 2025, standardizing nine features that were previously proposals: WasmGC, exception handling, tail calls, 64-bit memory (Memory64), and 128-bit SIMD, among others.

**The killer use case — one Rust crate, two targets.** A physics/rules/simulation crate can be compiled to a native binary for the authoritative server (`cargo build --release`) *and* to a Wasm module for the browser client (`wasm-pack build`), using the exact same source. This eliminates the class of bugs where server and client implement slightly different versions of the same physics — the root cause of divergence between client prediction and server authority (see [[netcode-authoritative-multiplayer]] §2–3 on determinism requirements). The two builds share a single Rust source of truth; divergence in behavior becomes a compiler error rather than a runtime bug hunt.

The pattern is:
```
crates/
  sim-core/          ← pure Rust, no_std-compatible, #[cfg] guards for Wasm-specific glue
    src/lib.rs       ← physics / collision / rules — no JS or browser types
  server/            ← depends on sim-core; compiles native; holds network I/O, auth, DB
  client-wasm/       ← depends on sim-core; compiled via wasm-pack; exposes JS-callable API
```

`sim-core` must not import anything that breaks on `wasm32-unknown-unknown` (e.g. system threads, `std::time::SystemTime` on some targets). Use `#[cfg(target_arch = "wasm32")]` for Wasm-specific imports and `#[cfg(not(target_arch = "wasm32"))]` for native-only code.

---

### 2. The JS↔Wasm boundary: linear memory and marshaling cost

This is the most important architectural concept for anyone designing the wasm-client interface. **WebAssembly's only native ABI values are integers and floats.** The module's entire addressable world is a flat array of bytes called *linear memory*. Nothing else crosses the boundary automatically.

What this means in practice:

| Value type | What happens at the boundary |
|---|---|
| `i32`, `i64`, `f32`, `f64` | Passed directly as numbers — zero overhead |
| `bool` | Passed as `i32` (0 or 1) — zero overhead |
| `&str` / `String` | JS encodes to UTF-8, writes to Wasm linear memory, passes `(ptr: i32, len: i32)` — **allocation + memcopy + UTF-8 encode/decode** |
| Struct/enum | Must be serialized (e.g. via serde/JSON, flatbuffers, or a hand-rolled layout) — **allocation + copy** |
| Vec/slice | Pass `(ptr, len)` pair; caller owns the allocation and must free it — **allocation + copy** |
| JS objects / closures | Cannot be passed into linear memory at all; wasm-bindgen wraps them in handles pointing to a JS-side table |

**The boundary is not free for complex types.** Every string or struct crossing the boundary involves: allocating a buffer in Wasm linear memory, calling the JS `TextEncoder` (UTF-16 → UTF-8 for strings), writing the bytes, calling the Wasm function, and then (on return) reading back and deallocating. Benchmarks consistently show that for small, frequently-called functions, the marshaling overhead can exceed the computation itself.

**The primary design rule: keep the boundary narrow and batch.** Instead of calling `tick(entity_id, delta_x, delta_y)` in a tight loop from JS, pass the entire frame's worth of input as a flat array once per frame, process it entirely within Wasm, and return a compact output buffer. This pattern — agreeing on a shared flat binary layout and passing integer pointer/length pairs — reduces boundary calls from O(entities) to O(1) per frame.

**DRY does not apply across a marshaling boundary.** This is a common architectural mistake. When your Rust struct `PlayerInput` and your TypeScript type `PlayerInput` look identical, it is tempting to try to share them or auto-generate one from the other. But they are separated by a serialization boundary; they will diverge in representation (Rust is packed binary; JS is a heap object), in lifetime (Rust linear memory vs. GC heap), and in semantics (Rust ownership vs. JS references). Having both is the correct design. The wasm-bindgen tool generates the bridge automatically; the data shapes on each side can and should remain independently owned. Trying to collapse them introduces complexity without removing the actual cost: the memcopy.

**wasm-bindgen's approach.** The `#[wasm_bindgen]` proc-macro, when applied to a Rust function, instructs the wasm-bindgen CLI to generate a JS shim function that automates the marshaling. For a function taking a `&str`, the generated JS shim will call `__wbindgen_malloc`, run `TextEncoder`, write the string, then call the actual Wasm export. The shim is generated at build time by the wasm-bindgen CLI (invoked by wasm-pack); it is not an interpreter layer at runtime.

**String interning optimization.** wasm-bindgen offers an `enable-interning` Cargo feature (available since ~0.2.x, requires `std`). When enabled, `wasm_bindgen::intern("some_string")` caches frequently-sent strings so later calls skip the re-encoding. This is useful for enum variant names, event type strings, and other high-frequency short strings. It is not compatible with `no_std`.

---

### 3. The wasm-bindgen / wasm-pack toolchain

**wasm-bindgen** (`crates.io/crates/wasm-bindgen`, current version ~0.2.122 as of mid-2026) is a Rust crate + CLI tool that:
1. Reads the compiled `.wasm` binary for `#[wasm_bindgen]` annotations embedded as custom sections.
2. Generates JavaScript/TypeScript glue code (the `.js` and `.d.ts` files).
3. Rewrites the `.wasm` binary to strip the custom sections and optimize imports.

The generated glue handles: type conversions, memory management (malloc/free on the Wasm heap), JS exception propagation into Rust Results, and optional JS object handles (wrapping JS objects as opaque references the Wasm module can hold).

**wasm-pack** (`crates.io/crates/wasm-pack`) is the higher-level workflow tool. It orchestrates: `cargo build --target wasm32-unknown-unknown`, then `wasm-bindgen`, then `wasm-opt` (Binaryen optimizer), and packages the output as a publishable npm package. Current pinned version in this project: **0.13.0** (released July 1, 2024). Version history relevant to this project:

| Version | Date | Key changes |
|---|---|---|
| 0.12.0 | Jun 2023 | `--no-pack` flag; replaced curl with ureq (pure-Rust HTTP); `package.json` `"type": "module"` for bundler target |
| 0.13.0 | Jul 2024 | `--no-opt` flag (skip wasm-opt for multi-step builds); linux aarch64 wasm-opt support; relative path fixes for `--target-dir` |
| 0.13.1 | Oct 2024 | Proxy env support; npm binary versioning fix (old binary was silently reused on upgrade) |
| 0.14.0 | Jan 2026 | Arbitrary wasm targets (enables WASI); macOS Apple Silicon release builds; `--profile` for custom cargo profiles; `--split-linked-modules` passthrough |
| 0.15.0 | May 2026 | **Latest.** wasm64-unknown-unknown target support; `--panic-unwind` flag; `wasm-pack new` template vendored into repo; npm binary-install replaced (fixes `npm install -g wasm-pack` 404 regression from 0.14.0); POSIX-compatible `init.sh` |

**Version compatibility note.** wasm-pack and wasm-bindgen versions must be kept in sync: wasm-pack invokes wasm-bindgen CLI, and if the CLI version does not match the `wasm-bindgen` crate version in `Cargo.toml`, the build fails with an opaque error. wasm-pack 0.13.x manages its wasm-bindgen CLI download automatically based on the crate version. The npm binary upgrade bug fixed in 0.13.1 was significant — silent reuse of the old binary after `npm install` upgrade caused confusing behavior.

**Build targets.** `wasm-pack build --target <target>` selects how the output is packaged:

| Target | Use case | Module format | Initialization |
|---|---|---|---|
| `bundler` (default) | Webpack / Rollup pipeline | ES module with `import` of `.wasm` | Automatic via bundler |
| `web` | Browser with `<script type="module">` and no bundler | ES module | Manual: `await init()` before calling exports |
| `nodejs` | Node.js `require()` / server-side | CommonJS | Automatic (synchronous WASM loading) |
| `deno` | Deno runtime | ES module | Manual |
| `no-modules` | Legacy `<script>` tags | Global `wasm_bindgen` object | Manual |

For the shared-logic pattern, the `web` or `bundler` target is typical for the browser client. The `nodejs` target can be used if the server is Node-based, but for a native Rust server the server crate simply depends on `sim-core` directly without Wasm at all.

---

### 4. Code-size optimization

Wasm binary size matters because it is downloaded and parsed at page load. The Rust→Wasm pipeline offers several levers:

**Cargo profile settings** (in `Cargo.toml`):
```toml
[profile.release]
opt-level = "z"   # optimize aggressively for size ("s" = balanced size/speed; "3" = speed)
lto = true        # link-time optimization: removes more dead code cross-crate
codegen-units = 1 # single codegen unit for maximum LTO scope
panic = "abort"   # removes unwinding machinery (~saves 10-30KB)
strip = true      # strips DWARF symbols from native; wasm-pack handles Wasm symbols separately
```

**wasm-opt** (Binaryen). wasm-pack automatically runs `wasm-opt` after wasm-bindgen. By default in release mode it runs `-O`, which optimizes for performance. For size:
- `wasm-pack build --release` + `opt-level = "z"` in Cargo profile already produces size-optimized output.
- To add wasm-opt size flags: `wasm-pack build -- --features=...` and then run wasm-opt manually with `-Oz` (most aggressive size) or `-Os` (balanced). wasm-opt typically removes an additional 10–20% on top of Rust compiler flags. Use `--no-opt` (added in 0.13.0) to skip wasm-opt during iterative development builds and only run it in the final release step.
- `--strip-debug` and `--strip-producers` remove DWARF and toolchain metadata sections.
- `--converge` runs optimization passes to a fixed point (multiple passes).

**Removing the Rust standard library.** For a pure-computation `sim-core` crate with no I/O, `#![no_std]` (with `alloc` for heap allocation) can dramatically reduce binary size by excluding the formatted-error-string machinery. Requires marking panic handlers explicitly (`#[panic_handler]`). Not always worth the ergonomic cost; profile first.

**Realistic sizes.** A simple Rust physics core with wasm-bindgen glue, compiled with `opt-level = "z"` + LTO + `panic = "abort"`, then wasm-opt'd with `-Oz`, typically lands at 50–200KB before gzip. After gzip compression, well-structured Wasm compresses to ~30–70% of its raw size.

---

### 5. Wasm threads and SIMD

**SIMD.** Fixed-width 128-bit SIMD is now part of the WebAssembly 3.0 standard (W3C, September 2025) and is supported across all major browsers. In Rust, SIMD intrinsics for Wasm are available via `std::arch::wasm32` and are stabilizing. wasm-pack passes through SIMD-compiled modules without stripping them. For a simulation core doing batch vector math (position updates, collision response), SIMD can yield 2–4× throughput improvements.

**Threads.** WebAssembly threads are also part of Wasm 3.0 and use `SharedArrayBuffer` + atomics under the hood. Browser support requires the page to be served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers; without them, `SharedArrayBuffer` is unavailable and Wasm runs single-threaded. As of 2025–2026 these headers are feasible in production contexts (established pattern in e.g. Figma, Google Earth). The Rust ecosystem for Wasm threads uses the `wasm-bindgen-rayon` crate to bring rayon thread pools into the browser. For the shared-logic pattern, threading on the browser client is an optimization, not a correctness requirement — the server can use native threads freely; the browser client typically needs only single-threaded Wasm for prediction since prediction is tied to the render loop.

**WASI threads** are still evolving. WASI 0.2 (stable, released January 2024) does not include threads; WASI 0.3 (expected 2025–2026) will add async support and eventual threading. This matters only if the shared core is being compiled for WASI server targets rather than native Rust.

---

### 6. The Component Model: future-facing but not production-ready for browsers

The **WebAssembly Component Model** is a specification for composing Wasm modules with well-typed interfaces defined in WIT (Wasm Interface Types). It enables modules written in different languages to interoperate without shared linear memory, replacing the current "pass a pointer and length" convention with higher-level types (strings, records, variants). Tools: `wasm-tools`, `wit-bindgen`, `jco` (for transpiling to browser JS).

As of mid-2026, the Component Model is production-stable in non-browser WASI runtimes (Wasmtime, Spin, WASI 0.2). **Browser support requires a transpilation step** via `jco`, which generates JS glue equivalent to what wasm-bindgen does today. It is not yet natively supported in any browser engine. For the current shared-logic use case, wasm-bindgen remains the right tool; the Component Model is worth monitoring as the ecosystem matures.

---

### 7. Testing native/Wasm parity

The correctness of the shared-logic pattern depends on native and Wasm builds producing identical outputs from identical inputs. This must be tested explicitly; the Rust compiler does not guarantee it.

**Sources of divergence:**
- **Float non-determinism.** Even with the same Rust source, `f32`/`f64` arithmetic can differ between native (x86 with extended 80-bit intermediates, or fused multiply-add instructions) and Wasm (strict IEEE 754, no extended precision). Mitigation: use `#[cfg(target_arch = "wasm32")]` to gate tests, or use fixed-point arithmetic for deterministic values (see [[deterministic-simulation-architecture]]).
- **`std::collections::HashMap` ordering.** HashMap uses a random seed on native; on `wasm32-unknown-unknown`, the seed is not randomized (explicitly noted in the Rust compiler book). This creates an accidental parity in some tests that will break when either side is changed. Use `BTreeMap` or `IndexMap` for determinism.
- **Panic behavior.** With `panic = "abort"` in Wasm and `panic = "unwind"` on native, error-propagation paths differ. Use `Result` returns rather than panics in `sim-core`.
- **`f32::NAN` comparisons.** NaN is bit-identical between targets but comparison semantics can be surprising. Ensure your equality checks handle it consistently.

**Testing strategy:**
1. `cargo test` on native for all logic tests.
2. `wasm-pack test --headless --chrome` (or `--firefox`) to run the same test suite in a real browser Wasm environment. wasm-pack integrates `wasm-bindgen-test` and uses `wasm-bindgen-test-runner` under the hood.
3. A dedicated **parity harness**: generate a corpus of input states → expected output states using the native build; replay the corpus against the Wasm build and assert bit-equality. Run this in CI as a regression gate.
4. Test with `panic = "abort"` in CI Wasm builds even if native uses `panic = "unwind"`, so divergent paths surface.

---

### 8. Tradeoffs and failure modes

**Boundary overhead accumulates invisibly.** A codebase that starts with a narrow boundary tends to sprout convenience calls over time ("just pass the player name here for debugging"). Each cross-boundary call that passes a non-numeric type allocates on the Wasm heap and invokes the TextEncoder. Profile the boundary layer explicitly in browser devtools (the Wasm memory allocation flamegraph is visible in Chrome DevTools Memory tab).

**Debugging Wasm is harder than debugging native.** Stack traces from Wasm are typically hex offsets unless DWARF symbols are preserved (which increases file size) and browser tooling can decode them. The practical workflow is: write and debug the simulation logic in native Rust with full tooling (rust-analyzer, lldb/gdb, cargo-flamegraph), then run the Wasm-specific tests as an automated parity check rather than an interactive debugging environment.

**Wasm module load time.** Parsing and compiling a 200KB Wasm module takes 50–200ms in modern browsers (streaming compilation via `WebAssembly.instantiateStreaming` overlaps with network download). For a game client this is part of the initial load, not the game loop; it is fine. Streaming compilation requires serving the `.wasm` file with `Content-Type: application/wasm`.

**wasm-pack tooling maturity.** The rustwasm organization transferred wasm-pack maintenance to the `wasm-bindgen` GitHub organization in late 2024 (reflected in the URL change from `github.com/rustwasm/wasm-pack` to `github.com/wasm-bindgen/wasm-pack`). The 0.14.0 npm package shipped with a broken download URL, making `npm install -g wasm-pack` fail with a 404; 0.15.0 fixed this by inlining the install logic. For stability, pin to a specific version via `Cargo.toml` or the npm package version. The `--no-opt` flag added in 0.13.0 meaningfully reduces CI build times in projects that run wasm-pack multiple times.

**wasm-bindgen tight-loop overhead.** A 2025 Hacker News thread reported a team achieving 2.5× speedup over stock wasm-bindgen for high-frequency JS↔Rust calls by reducing the glue-layer indirection. This confirms that the generated shims, while convenient, are not free. The architecture implication: design the Wasm API surface to be called once per frame at most, never once per entity.

---

## Concrete examples & references

- **Rustwasm Book — "Add Wasm Support to a General-Purpose Crate"**: The canonical guide for structuring a crate that compiles to both native and Wasm. Uses `#[cfg(target_arch = "wasm32")]` for Wasm-only deps and `[target.'cfg(target_arch = "wasm32")'.dependencies]` in Cargo.toml to gate wasm-bindgen itself. (https://rustwasm.github.io/book/reference/add-wasm-support-to-crate.html)

- **wasm-bindgen Guide — Deployment**: Documents all `--target` modes (bundler, web, nodejs, no-modules, deno) with their module format and initialization requirements. Authoritative reference for choosing how to package Wasm for different JS environments. (https://rustwasm.github.io/docs/wasm-bindgen/reference/deployment.html)

- **wasm-pack releases (GitHub)**: Authoritative changelog for all wasm-pack versions including exact dates: 0.13.0 = Jul 1 2024, 0.13.1 = Oct 29 2024, 0.14.0 = Jan 20 2026, 0.15.0 = May 15 2026. (https://github.com/wasm-bindgen/wasm-pack/releases)

- **Rustwasm Book — "Shrinking .wasm Size"**: Covers `opt-level = "z"`, LTO, `panic = "abort"`, and wasm-opt flags. Notes that `wasm-opt -Oz` on top of Rust size flags can remove another 10–20%. (https://rustwasm.github.io/book/reference/code-size.html)

- **MDN — "Compiling from Rust to WebAssembly"**: Step-by-step guide including wasm-pack workflow, the `#[wasm_bindgen]` macro, and how the JS glue is structured. Good entry-point reference for the toolchain mechanics. (https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Rust_to_Wasm)

- **WebAssembly Threads (web.dev)**: Explains the `SharedArrayBuffer` + `COOP`/`COEP` header requirement for threads, with Rust/C examples. Confirms headers are the gating factor in browser environments, not spec support. (https://web.dev/articles/webassembly-threads)

- **16 Patterns for Crossing the WebAssembly Boundary (DEV Community)**: Practical taxonomy of boundary-crossing patterns — numeric passthrough, shared memory, serde-based serialization, flat binary layouts. Directly supports the design principle of narrowing and batching the boundary. (https://dev.to/rafacalderon/16-patterns-for-crossing-the-webassembly-boundary-and-the-one-that-wants-to-kill-them-all-5kb)

- **WebAssembly Advanced Data Types — Strings, Arrays, and the Serialization Nightmare**: Deep dive into string encoding mismatch (JS is UTF-16, Wasm expects UTF-8), allocation lifecycle, and the cost structure of complex type passing. Makes the "duplicate data shapes are correct" argument concrete. (https://sumitso.in/explora/webassembly-tutorial/ch06-js-wasm-data-marshaling/)

- **WASI and the Component Model — Current Status (eunomia, Feb 2025)**: Summary of where WASI 0.2 landed (stable), what WASI 0.3 will add (async, threading eventually), and the Component Model's state in browser vs. non-browser runtimes. (https://eunomia.dev/blog/2025/02/16/wasi-and-the-webassembly-component-model-current-status/)

- **The State of WebAssembly — 2025 and 2026 (platform.uno)**: Survey of Wasm 3.0 features standardized in September 2025 (SIMD, WasmGC, threads, Memory64, etc.), browser adoption curves, and the ecosystem's trajectory toward the Component Model. (https://platform.uno/blog/the-state-of-webassembly-2025-2026/)

- **Hacker News: "We built a faster WASM-bindgen (2.5×) for high-frequency JavaScript↔Rust calls"**: Community discussion confirming that wasm-bindgen shim overhead is measurable for tight-loop call patterns, and that the correct architectural response is to reduce boundary crossing frequency rather than optimize the shims. (https://news.ycombinator.com/item?id=45664341)

- **wasm-bindgen Guide — Introduction**: The official guide for the `wasm-bindgen` crate: macro usage, JS type bindings, `js-sys`, `web-sys`, closures, and the enable-interning feature. (https://rustwasm.github.io/docs/wasm-bindgen/)

- **MDN — SharedArrayBuffer**: Documents the cross-origin isolation security requirement (`COOP`/`COEP` headers) for enabling SharedArrayBuffer in browsers, which is required for Wasm threads. (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)

- **wasm-opt — Reducing Wasm Bundle Size**: Practical guide to wasm-opt flags (`-O`, `-Os`, `-Oz`, `--converge`, `--strip-debug`). Documents that wasm-opt averages 12% binary size reduction and 9% compressed size reduction on benchmark suites. (https://www.webassembly-wasm.com/compilation-pipelines-toolchain-setup/wasm-optimization-flags-size-reduction/reducing-wasm-bundle-size-with-wasm-opt/)

---

## Design implications & transferable principles

**1. The shared-crate pattern is the correct way to achieve simulation parity.**
Compile the same Rust simulation core to native (for the authoritative server) and to Wasm (for client prediction in the browser). Any divergence in behavior is caught by the compiler or by a parity test harness, not discovered as a latent bug in production. This pattern is the toolchain-level answer to the determinism requirement in [[netcode-authoritative-multiplayer]] §2.

**2. Keep the JS↔Wasm boundary surface minimal and batch-oriented.**
Design the Wasm API as a *frame protocol*, not a function-call API: accept a flat binary input buffer (inputs for this frame), advance the simulation, return a flat binary output buffer (state for this frame). One call per frame. This eliminates marshaling cost from the hot path. Richer convenience functions (string-passing, struct-returning) are fine for initialization and one-time setup, where the cost is not repeated.

**3. Duplicate data shapes across the boundary — do not share or auto-generate them.**
The JS/TypeScript representation of a struct and the Rust representation are separated by a serialization boundary. They are allowed to evolve independently. Trying to auto-generate one from the other collapses two separate things and makes the interface harder to change in isolation. wasm-bindgen generates the bridge; own the data shapes on each side separately.

**4. Use `wasm-pack test --headless` as the parity verification step in CI.**
Running the same unit tests against the Wasm build catches float-determinism issues, HashMap ordering bugs, and panic-behavior divergences automatically. Supplement with a corpus-based parity harness for properties that unit tests might miss.

**5. Pin wasm-pack and wasm-bindgen versions together.**
wasm-pack invokes the wasm-bindgen CLI; if the CLI version does not match the crate version, builds fail with confusing errors. Pin both in your CI toolchain and upgrade them together. Note the 0.13.1 binary-versioning fix: upgrading the npm package without this fix silently reused the old binary.

**6. Use `--no-opt` during development, `-Oz` in release.**
wasm-opt is slow on large modules. `wasm-pack build --dev` skips it by default. For iterative development with `wasm-pack build --release`, add `--no-opt` and only run the full wasm-opt pipeline in CI release builds.

**7. Treat SIMD as an optimization layer, not an architecture requirement.**
128-bit SIMD is now standardized and broadly supported, but enabling it in the simulation core requires the `wasm32` SIMD intrinsics and should be behind a feature flag so the core still compiles cleanly for native targets without special treatment. Profile before adding SIMD; the memory-access pattern often matters more than vectorization for simulation workloads.

**8. Threads on the browser client require infrastructure work.**
The COOP/COEP headers needed for SharedArrayBuffer must be set on the server serving the page. If the client host is a CDN or a third-party service, this can be a hard blocker. Design the client Wasm module to be correct and performant single-threaded first; add threading as an enhancement if the environment supports it.

**9. The Component Model is the right long-term direction but not the right choice today for browsers.**
WIT-based interfaces are cleaner than the current pointer/length convention and will eventually replace it. For production browser Wasm in 2025–2026, use wasm-bindgen. Monitor `jco` (Bytecode Alliance) for when browser-native Component Model support becomes viable.

**10. Debug in native, validate in Wasm.**
All interactive debugging (rust-analyzer, lldb, cargo-flamegraph, cargo-fuzz) works cleanly on the native build. The Wasm build is the validation target: run its tests in headless browsers automatically. Resist spending time trying to decode Wasm stack traces; fix the bug natively and let the parity harness confirm the fix holds in Wasm.

---

## Open questions

- Should `sim-core` use fixed-point arithmetic to guarantee bit-exact float parity between native and Wasm, or is the IEEE 754 behavior of `wasm32-unknown-unknown` sufficiently consistent with x86 native in practice for this project's physics fidelity requirements? See [[deterministic-simulation-architecture]] for the float-determinism analysis.
- Is the initial Wasm binary size acceptable for the target audience's network conditions? Measure baseline before and after wasm-opt. If >500KB uncompressed, audit what is being pulled into `sim-core` transitively.
- For the long term: what is the migration path from wasm-bindgen to the Component Model? The WIT interface definition should be designed now so it can be adopted incrementally.
- Does the server-side simulation need to run the same binary (via WASI) or just the same source? WASI is now viable with wasm-pack 0.14+ arbitrary-target support, but adds runtime overhead vs. native. Clarify whether the "run the same binary" property is a correctness or an operational requirement.
- How does the Wasm client handle updates to `sim-core` between browser page loads? The `.wasm` file is a cacheable static asset; cache-busting strategy and versioning must be designed explicitly to avoid running mismatched client/server logic after a server update.

---

## Sources

1. https://rustwasm.github.io/book/reference/add-wasm-support-to-crate.html — Rustwasm Book, "How to Add WebAssembly Support to a General-Purpose Crate"
2. https://rustwasm.github.io/docs/wasm-bindgen/ — wasm-bindgen Guide, Introduction
3. https://rustwasm.github.io/docs/wasm-bindgen/reference/deployment.html — wasm-bindgen Guide, Deployment (build targets)
4. https://github.com/wasm-bindgen/wasm-pack/releases — wasm-pack GitHub Releases (authoritative version history and changelogs)
5. https://rustwasm.github.io/book/reference/code-size.html — Rustwasm Book, "Shrinking .wasm Size"
6. https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Rust_to_Wasm — MDN, "Compiling from Rust to WebAssembly"
7. https://web.dev/articles/webassembly-threads — web.dev, "Using WebAssembly threads from C, C++ and Rust"
8. https://dev.to/rafacalderon/16-patterns-for-crossing-the-webassembly-boundary-and-the-one-that-wants-to-kill-them-all-5kb — Calderon, "16 Patterns for Crossing the WebAssembly Boundary"
9. https://sumitso.in/explora/webassembly-tutorial/ch06-js-wasm-data-marshaling/ — "WebAssembly Advanced Data Types: Strings, Arrays, and the Serialization Nightmare"
10. https://eunomia.dev/blog/2025/02/16/wasi-and-the-webassembly-component-model-current-status/ — Eunomia, "WASI and the WebAssembly Component Model: Current Status" (Feb 2025)
11. https://platform.uno/blog/the-state-of-webassembly-2025-2026/ — Platform.uno, "The State of WebAssembly – 2025 and 2026"
12. https://news.ycombinator.com/item?id=45664341 — HN thread: "We built a faster WASM-bindgen (2.5×) for high-frequency JavaScript↔Rust calls"
13. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer — MDN, SharedArrayBuffer (cross-origin isolation requirements)
14. https://www.webassembly-wasm.com/compilation-pipelines-toolchain-setup/wasm-optimization-flags-size-reduction/reducing-wasm-bundle-size-with-wasm-opt/ — "Reducing Wasm Bundle Size with wasm-opt"
