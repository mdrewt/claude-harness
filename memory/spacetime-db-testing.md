# Introduction

> **Currency check 2026-08-16 (ADR-0197): still accurate at SpacetimeDB 2.8.1.** Re-verified
> against the 2.6.0→2.8.1 delta: there is still no `spacetime test`, GitHub issue #2833
> ("testing reducers") is still open, `crates/testing` remains `publish = false` (internal only),
> and the new `crates/dst` deterministic-simulation crate is an internal harness, not a
> user-facing API. The strategies below stand unchanged.

SpacetimeDB does not currently feature a dedicated, built-in unit testing framework specifically for Rust modules. Because reducers execute inside a sandboxed WebAssembly environment tightly coupled to the database transaction context (ReducerContext), standard practice relies on refactoring business logic into pure Rust functions for unit testing, and using integration harnesses via the SpacetimeDB CLI for database-level testing. Additionally, Rust features a highly optimized, built-in testing framework managed directly via its native build tool, Cargo. You do not need to install third-party frameworks like JUnit or Jest; instead, you annotate functions with #[test] and run them using cargo test.

## Strategies for Testing SpacetimeDB Rust Modules

- Extract Pure Logic: Move validation, math, and data parsing out of #[reducer] functions and into standard helper structs.
- Standard Unit Tests: Test these extracted helper functions using regular #[test] macros and cargo test without initializing the database context.
- Integration Testing via CLI: Spin up a local instance using spacetime dev or spacetime start to publish modules and execute test scripts against a live local node.
- Client SDK Harnesses: Write integration tests in Rust using spacetimedb_sdk where a test client connects to a local test module to invoke and verify behavior

## Rust Core Built-in Testing Mechanisms

- #[cfg(test)] attribute: Instructs the compiler to omit the entire test module during production builds (cargo build), ensuring your final binary size remains small.
- #[test] attribute: Marks an individual function as a test case to be auto-discovered by the test runner.
- #[should_panic] attribute: Used when testing error states; the test passes only if the code triggers a panic!.
- Standard Macros: The standard library includes built-in macros like assert!, assert_eq!, and assert_ne! to evaluate conditions.

## Essential Cargo Testing Commands

The cargo test command serves as Rust's execution harness and provides versatile execution controls:
- Run all tests: cargo test
- Run a single test: cargo test <test_name> (matches by exact name or partial substring)
- Run ignored tests: Append #[ignore] above slow tests, then run them specifically using cargo test -- --ignored.
- Control parallelism: By default, tests run simultaneously on separate threads. Force sequential execution using cargo test -- --test-threads=1

# Rust Ecosystem Extensions for Advanced Testing

While the built-in system handles foundational unit testing, the open-source Rust community fills advanced requirements using specialized libraries:
- mockall: For mocking framework, it simplifies mocking traits to decouple dependencies during unit isolation.
- proptest: For property-Based testing, it automatically generates a barrage of randomized inputs to discover edge-case bugs.
- insta: For Snapshot Testing, it captures complex structures or API outputs to verify against reference files.