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

## Rust Ecosystem Extensions for Advanced Testing

While the built-in system handles foundational unit testing, the open-source Rust community fills advanced requirements using specialized libraries:
- mockall: For mocking framework, it simplifies mocking traits to decouple dependencies during unit isolation.
- proptest: For property-Based testing, it automatically generates a barrage of randomized inputs to discover edge-case bugs.
- insta: For Snapshot Testing, it captures complex structures or API outputs to verify against reference files.


# SpacetimeDB Observability

To get high observability/traceability around a SpacetimeDB app, a practical way to think about it (at a high level) is: reducers/procedures are your “units of work”, and transactions are your “atomic boundary”, so you want consistent identifiers and structured events around those boundaries.

## 1) Use transactions as your primary trace boundary
Reducers are transactional, and any error rolls back all changes, which is a natural “span boundary” conceptually: either the unit of work committed or it didn’t.  
[(1)](https://spacetimedb.com/docs/databases/transactions-atomicity)

SpacetimeDB doesn’t support nested transactions, and when one reducer calls another they share the same transaction—so if you want separate trace segments with separate commit boundaries, you’ll need to model that as separate transactions (the docs mention using scheduled reducers to trigger a second reducer asynchronously when you need separate transactions).  
[(1)](https://spacetimedb.com/docs/databases/transactions-atomicity), [(2)](https://spacetimedb.com/docs/intro/key-architecture)

## 2) Prefer reducers for state changes; use procedures when you need external I/O
The docs recommend preferring reducers unless you need procedure-only capabilities (notably HTTP requests).  
[(3)](https://spacetimedb.com/docs/functions/procedures), [(2)](https://spacetimedb.com/docs/intro/key-architecture)

A useful observability pattern is:
- Do external calls (HTTP) in procedures.
- Keep the database transaction portion small and explicit (open/commit manually inside the procedure).  
[(3)](https://spacetimedb.com/docs/functions/procedures), [(1)](https://spacetimedb.com/docs/databases/transactions-atomicity), [(2)](https://spacetimedb.com/docs/intro/key-architecture)

This gives you a clear separation between:
- “External span” (HTTP request latency, retries, failures)
- “DB span” (transaction work that commits/rolls back)

## 3) Be careful with retries / re-execution inside procedure transactions
In procedures, the function passed to `withTx` / `with_tx` may be invoked multiple times and must be deterministic with respect to the same database state, and it must not let values from prior runs influence behavior when run against a different database state. Avoid capturing mutable state in those closures.  
[(3)](https://spacetimedb.com/docs/functions/procedures)

From an observability standpoint, that means:
- Don’t attach “exactly once” semantics to logs/events emitted *inside* the transaction closure unless you can tolerate duplicates.
- If you need exactly-once external side effects, keep them outside the transaction closure and design for idempotency.

## 4) Treat “procedure can’t do HTTP while holding a transaction” as a design constraint
Procedures can’t send requests at the same time as holding open a transaction.  
[(3)](https://spacetimedb.com/docs/functions/procedures)

Observability implication: your traces should reflect a two-phase flow:
1) external call(s) (no open transaction)
2) transaction block (no external calls)

That structure tends to produce clearer traces in tools like Datadog (separate spans for external dependency vs commit).

## 5) Capture and surface errors in a way that’s useful to clients
The docs emphasize returning descriptive errors and that errors roll back all changes.  
[(1)](https://spacetimedb.com/docs/databases/transactions-atomicity)

Separately, there’s an example report (non-official) that reducer errors returned to clients can contain stack traces (shown for C#). If you rely on that behavior for debugging/traceability, treat it as an implementation detail rather than a guaranteed interface.  
[(4)](https://github.com/clockworklabs/SpacetimeDB/issues/3959)

## 6) What I can’t confirm from the provided sources
I can’t confirm, from the provided sources, any of the following:
- A built-in OpenTelemetry/Datadog integration for SpacetimeDB modules or hosts
- APIs for emitting custom spans/traces, attaching trace IDs to reducer/procedure execution, or exporting profiling data
- How to profile module code (CPU, allocations) in SpacetimeDB, or whether the host exposes profiler hooks

If you want, tell me which module language you’re using (TypeScript/C#/Rust/C++) and whether you’re self-hosting or on Maincloud, and I can point to the most relevant places in the docs you *do* have (reducers vs procedures vs transaction boundaries) to structure your own instrumentation strategy around those constraints.