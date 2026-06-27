---
title: SpacetimeDB — the "database IS the server" model for realtime multiplayer
slug: spacetimedb
domain: toolchain
tags: [spacetimedb, database-oriented-design, reducers, subscriptions, wasm-modules, realtime-multiplayer, state-sync, row-level-security, scheduled-reducers, clockwork-labs, serverless-backend]
status: active
updated: 2026-06-27
confidence: high
sources: 18
supersedes:
abstract: "Database-that-is-a-server: logic runs as in-DB transactional reducers; clients subscribe to SQL for live row-deltas."
---

## Scope

A **project-agnostic** architecture and decision reference for SpacetimeDB (Clockwork Labs), covering the "database IS the server" mental model; the WASM module runtime; reducers as the only write path; SQL subscriptions as built-in interest management; row-level security and views for access control; scheduled reducers as the server game-loop tick; the storage and concurrency model; and the full tradeoff surface for choosing (or rejecting) SpacetimeDB on a real-time multiplayer project.

Version anchor: **SpacetimeDB 2.6.0** — confirmed the **Latest** release (tagged 16 Jun 2026). The docs are versioned at the **2.0.0** line (the current docs major; 2.0 shipped early 2026 with substantial breaking changes from 1.x), and releases 2.1–2.6 continue under that docs line with no second major. **2.6.0** specifically added primary-key support for **Views** (Rust/TS/C#), event-table automigration improvements, commitlog tuning knobs (default `write_buffer_size` raised 8KiB→128KiB), ARM-cross-compiled CLI binaries, and a deterministic-reducer-randomness docs clarification (full changelog v2.5.0…v2.6.0). Behavior here is verified against the live **2.0.0** docs and the **v2.6.0** release notes.

Pairs with [[netcode-authoritative-multiplayer]] (the DB is the authoritative server) and [[state-sync-interest-management]] (subscriptions are the interest-management layer). Touches [[online-game-security-anticheat]] where access control and server-authoritative validation are discussed.

**Confidence: high** for the architecture and the 2.x/2.6.0 facts — verified against the live official docs (version 2.0.0) and the confirmed **v2.6.0** GitHub release. **Caveat:** SpacetimeDB is still young (1.0 shipped March 2025, 2.0 early 2026) and churns APIs across versions, so re-verify version-sensitive specifics against the current docs. A few internals (e.g. exact per-language WASM overhead) remain **[UNVERIFIED]** and are flagged inline.

---

## Key findings

### 1. The core idea: database-oriented design

SpacetimeDB inverts the conventional three-tier stack (client → app server → database). In the conventional model, a game server process holds authoritative state in memory, queries a database for persistence, and pushes updates to clients. SpacetimeDB removes the middle tier entirely: the application logic runs **inside** the database itself, compiled to WebAssembly.

The official framing: "SpacetimeDB is a database that is also a server." A single `spacetime publish` command deploys a WASM binary that becomes both the schema definition and the entire server-side business logic. Clients connect directly to the database process over WebSocket and interact with it through reducers (write calls) and subscriptions (streaming reads). There is no separate game server process, no container, no Kubernetes, no app-server tier.

This is structurally similar to stored procedures in traditional RDBMSs, but with a modern developer experience: the module is written in a full general-purpose language (Rust, C#, C++, or TypeScript as of 2.x), has a full type system, and is deployed atomically as a unit. The analogy to smart contracts is intentional and made in the docs — but without the blockchain overhead.

**The real-world proof case**: The entire MMORPG backend for BitCraft Online (thousands of concurrent players; chat, inventory, terrain, player positions) runs as a single SpacetimeDB module. Clockwork Labs built SpacetimeDB to satisfy this use case before opening it to third parties. Tyler Cloutier presented "Database-Oriented Design: Why We Built Our MMORPG Inside a Database" at GDC 2025.

### 2. The WASM module model

A SpacetimeDB **module** is a WebAssembly binary (or JavaScript bundle in TypeScript) that the host loads and executes. The module:

- Declares the database schema by defining table structs in source code (not SQL DDL files)
- Exports reducer functions that the host invokes on client requests or schedule triggers
- Has access to a typed, generated API for reading and writing tables
- Cannot perform I/O, network calls, or access the file system from within a reducer (the WASM sandbox enforces this; violations are caught at the runtime boundary)

Module languages supported as of 2.x: **Rust**, **C#**, **C++**, **TypeScript** (TypeScript/JS via a bundler). The client-side SDKs cover Rust, C#, TypeScript, and Unreal (C++/Blueprint). Unity support was the original first-class use case; Unreal support was added officially in September 2025.

Deploying is `spacetime publish <db-name>`. The host loads the new module, inspects the schema, performs automatic migrations where possible, and hot-swaps the module without dropping active connections. Open subscriptions continue to function through the update.

Global/static variables inside a module are **undefined behavior** — the host may run each reducer in a fresh WASM instance, may crash-recover from the WAL, or may re-execute reducers for serializability. All state must live in tables.

### 3. Reducers: the only write path

A **reducer** is a function exported by a module that runs inside a database transaction. Key properties:

- **Atomicity**: the reducer either commits all its writes or rolls them all back. There is no partial commit. If the reducer throws an exception or returns an error, the database is left unchanged.
- **Isolation**: reducers do not observe writes from concurrently executing reducers. The current implementation serializes all writes through a single global Read-Write Mutex (parking_lot::RWMutex with eventual fairness). This makes linearizability trivially provable but means two writes cannot execute concurrently.
- **No I/O**: reducers cannot make HTTP requests, read files, or call external services. The WASM sandbox enforces this. Side-effectful work goes through **Procedures** (a separate, non-transactional function type added in 2.x that can make HTTP requests but must manually open and commit transactions; Procedures were in Beta at 2.0 launch).
- **Caller identity**: every reducer receives a `ReducerContext` carrying the caller's `Identity` (a 32-byte hash derived from OpenID Connect issuer+subject). This is the primary mechanism for authorization — the module code checks `ctx.sender` (or `ctx.sender()` in 2.x) against stored data.
- **No nested transactions**: a reducer can call another reducer directly, but they share the outer transaction. A nested reducer error does not independently roll back.

Reducers are the **only** way to mutate tables. Clients cannot write directly. This is the enforcement boundary for the authoritative-server model: the client sends a reducer call (an intent), the module validates it and mutates state, the result propagates via subscriptions. This maps directly to the pattern described in [[netcode-authoritative-multiplayer]] §1: "the server is the sole owner of authoritative game state; clients send inputs, not positions."

**Concurrency model caveat**: because all write reducers share a single global lock, a long-running or hung reducer stalls all other writes and all reads. This is a hard architectural constraint in the current implementation. The performance claims on the SpacetimeDB benchmarks (150K+ transactions/second for Rust modules) hold when reducers are short; they degrade sharply if reducers perform expensive computation inside the critical section.

### 4. Subscriptions: SQL queries as the interest-management layer

Clients do not poll the database. Instead, they **subscribe** to one or more SQL queries and receive a streaming feed of row-level deltas whenever the subscribed rows change.

The subscription model:

1. Client connects and issues a `subscriptionBuilder().subscribe([tables.player, tables.item])` call (typed query builder) or a raw SQL query string.
2. The server sends the initial matching rows immediately (the "applied" event).
3. On every committed transaction that changes a subscribed row, the server computes the diff (insert/update/delete) and pushes it to every client whose subscription covers that row.
4. The client SDK maintains a local in-memory cache of subscribed rows. Reads from the cache are instant (local memory). Row callbacks (`onInsert`, `onDelete`, `onUpdate`) fire transactionally — callbacks see a fully-updated cache state.

This is **built-in state replication**. SpacetimeDB automatically mirrors relevant state to connected clients in real time. The subscription query defines exactly what each client sees — a near-direct analog of an interest-management filter. See [[state-sync-interest-management]]: subscriptions are the mechanism by which SpacetimeDB implements per-client AOI (area of interest). A query like `SELECT * FROM player WHERE zone_id = :player_zone` (via appropriate filter) can limit what a client receives to their local zone.

**Zero-copy subscription semantics**: subscribing to the same query more than once is a no-op on the server. Unsubscribing from one copy of a duplicated subscription does not cause the server to re-evaluate. This allows safe "subscribe before unsubscribe" transitions when updating subscription scope.

**2.0 change — event tables**: In 1.x, reducer arguments were broadcast to any subscriber of affected rows, creating a security risk (accidentally leaking sensitive data) and coupling events to reducers. In 2.x, reducer arguments are never broadcast. Cross-client notifications are now done explicitly via **event tables** — a transient table type whose rows are inserted during a transaction and automatically delivered to subscribers as insert events, then the table is empty. Event tables must be subscribed to explicitly (excluded from `subscribeToAllTables`).

**Subscription query constraints**: the SQL dialect for subscriptions supports `WHERE` and `JOIN` but with performance-relevant restrictions (e.g., semijoins require indexes on both join columns). Raw SQL subscriptions have documented constraints; the typed query builder generates compliant queries.

### 5. Row-level security and views

SpacetimeDB provides two **complementary** mechanisms here — the earlier "use Views instead of RLS" framing is outdated; the current 2.x workflow uses both for different jobs:

**RLS filters — the access-control / client-scoping layer.** Per the official 2.x workflow, *"RLS filters restrict the data view server-side before subscriptions are evaluated; these filters can be used for access control or client scoping."* They are SQL access rules declared in the module (`#[client_visibility_filter]` in Rust, `[SpacetimeDB.ClientVisibilityFilter]` in C#); each is a `SELECT` optionally filtered by the special `:sender` parameter (the caller's Identity), applied automatically to every subscription (evaluated as OR; recursive across RLS-protected tables). This is what stops a client subscribing to rows it should not see — the defense-in-depth boundary in [[online-game-security-anticheat]]. (The module-level RLS *filter API* may still carry an `unstable` feature flag in some language bindings — verify for your pinned version.)

**Views — read-only computed functions.** A View is a `public`, context-only function that queries tables and returns derived/aggregated/joined results, **subscribable** like a table and auto-updating when its inputs change; it runs inside a transaction (consistent snapshot). Use Views for computed data a client needs server-side — **not** as a substitute for RLS access control. (2.6.0 added **primary-key support for Views** in Rust/TS/C#; C++ view PKs are slated for a later release.)

**Owner exemption**: The module's own Identity (the database owner) has unrestricted access to all tables regardless of RLS. This is relevant for [[online-game-security-anticheat]]: admin tools and server-side diagnostics can always read full state.

**Authorization in reducers**: The main enforcement point for write access is inside reducer code. The module checks `ctx.sender` against stored permissions, admin lists, or object ownership, and `return Err(...)` / throws to abort the transaction. This is explicitly equivalent to traditional server-side authorization middleware, but co-located with the data.

### 6. Scheduled reducers: the server game-loop tick

SpacetimeDB implements server-side ticks through **schedule tables**. A table marked as a schedule table has a `ScheduleAt` column. When a row is inserted with a `ScheduleAt` value, the host monitors the table and invokes the linked reducer at the scheduled time. For recurring ticks:

```rust
// Insert once, repeats indefinitely
GameTick::insert(GameTick {
    scheduled_id: 0,
    scheduled_at: ScheduleAt::Interval(Duration::from_millis(100)),
});
```

The linked reducer fires every 100 ms and receives the schedule row as its argument. Interval schedules are never automatically deleted — the tick continues until the row is explicitly removed. One-shot schedules are deleted after execution.

**This is the server game loop.** A 20 Hz tick (50 ms interval) moves entities, resolves physics approximations, and triggers events. The SpacetimeDB docs show game ticks at 50–100 ms intervals as the canonical example. Clockwork Labs' own GDC talk describes scheduling every 50 ms to "step forward simulations by moving all entities, similar to a standard game 'tick' or 'frame'."

**Important caveat**: scheduled reducers run on a **best-effort basis**. Under heavy load, execution may be delayed. There is no hard real-time guarantee. This is appropriate for game-server ticks (server-side authoritative movement) but would be inappropriate for safety-critical timing.

**In 2.x, scheduled functions are private by default**: only the database owner and collaborators can invoke scheduled reducers directly. The authorization check that was required in 1.x module code (`if ctx.sender != ctx.identity { return Err(...) }`) is no longer necessary.

### 7. Storage model: in-memory with async WAL

SpacetimeDB is **primarily an in-memory database**. The committed state lives in a hash-table-like structure protected by a global Read-Write Mutex. Speed is achieved by keeping all data in RAM and avoiding disk I/O in the transaction critical path.

Durability comes from a **Write-Ahead Log (WAL)** that is flushed to disk asynchronously, on a background thread, roughly every 50 ms by default. This means:

- A server crash within the last ~50 ms window can lose committed transactions (from the application's perspective, they were "accepted" but not yet durable).
- **In 2.x, confirmed reads are enabled by default**: subscription updates and SQL results are not sent to clients until the underlying transaction is confirmed durable. This adds a few milliseconds of latency but prevents clients from observing data that would be lost on crash. Games that prioritize latency over durability can opt out with `withConfirmedReads(false)`.
- **Capacity is RAM-bounded**: SpacetimeDB is not disk-backed in the traditional sense. If the dataset exceeds available RAM, the instance fails. The only scaling axis for a single database is vertical (bigger machine).

Periodic **snapshots** are also written to disk to make WAL recovery faster after a restart (no need to replay from the beginning of the WAL on every startup).

**Replication**: the docs describe a "SpacetimeDB cluster" as a primary with eventually-consistent followers. Replication uses the WAL, which is asynchronous — the cluster is not strongly consistent across replicas. This limits high-availability guarantees. A technical reviewer (vmg, Feb 2026, strn.cat) characterized the architecture as "a more powerful Redis" rather than "a more performant relational database" — accurate in the sense that it shares the in-memory, single-node-primary model and the same class of availability trade-offs.

### 8. Identity and authentication

SpacetimeDB uses OpenID Connect as the identity layer. A client Identity is a 32-byte hash derived from the issuer and subject fields of a JWT (`blake3_hash(issuer + "|" + subject)`). Identity is globally unique and persistent across connections. Each connection gets a separate `ConnectionId`.

The practical flow for a game: the game client authenticates with an OIDC provider (SpacetimeDB's own **SpacetimeAuth** turnkey provider, or any compliant provider — Google, Facebook, custom), receives a JWT, and presents it to SpacetimeDB on connect. The resulting Identity is attached to every reducer call. Modules verify permissions by checking `ctx.sender` against stored identity data.

### 9. Migration and schema evolution

Automatic migration is supported for safe changes: adding tables, adding indexed columns (with defaults), adding reducers. Forbidden changes (removing tables, reordering columns, removing columns, adding columns without defaults, changing column types) cause `spacetime publish` to fail. Breaking schema changes require either:

- `spacetime publish --delete-data` (development only; nukes all data)
- **Incremental migrations**: a documented dual-write pattern — add new tables/columns alongside old ones, migrate data in a reducer, then remove old columns in a subsequent publish once all clients have updated.

During automatic migrations, active connections are maintained and subscriptions continue. Clients may see brief interruptions in scheduled reducers during the publish window.

**The migration story is the most operationally immature part of the system**. The Automatic Migrations doc itself acknowledges "Future Improvements" including "data migration scripts for table modifications" and "automatic client compatibility checking." This is a significant production risk for evolving live games with data that cannot be deleted.

### 10. Relationship to netcode patterns

SpacetimeDB is a specific implementation of the authoritative-server model described in [[netcode-authoritative-multiplayer]]:

| Netcode concept | SpacetimeDB implementation |
|---|---|
| Authoritative server | The module reducer — the only write path, server-validated |
| State replication / snapshots | Subscriptions — push row deltas on commit, maintaining client cache |
| Interest management / AOI | Subscription SQL filters — each client subscribes to the rows relevant to them |
| Server tick / game loop | Scheduled reducers — interval schedule tables trigger movement/physics reducers |
| Client prediction | Not provided — clients must implement prediction logic on their own using the client SDK |
| Server rewind / lag compensation | Not provided — no built-in mechanism; would need to be implemented in reducer logic |
| Anti-cheat (server authority) | Inherent — no client writes directly; reducers validate all inputs per [[online-game-security-anticheat]] |

SpacetimeDB gives you the authoritative server and state replication out of the box. It does not give you client prediction, server rewind, or lag compensation — those remain netcode problems the game developer must solve at the client and reducer level.

### 11. Tables, data-oriented design, and decomposition by access pattern

Everything is stored in **tables**, held in memory for low latency and **automatically persisted to disk**. The model is the full relational model, and the docs make a pointed claim: **Entity-Component-System (ECS) patterns implement a _strict subset_ of relational capabilities** — tables add joins, indexes, and constraints ECS lacks (Tables docs; "Databases and Data-Oriented Design").

The highest-leverage practical guidance is **decompose tables by access pattern, not by entity**. Rather than one wide `Player` row mixing 60 Hz position with rarely-changing settings, split by *update frequency*: `PlayerState` (position/velocity, 60 Hz), `PlayerResources` (health/mana, occasional), `PlayerStats` (lifetime totals, rare), `PlayerSettings` (very rare). In a subscription-replicated system the payoff is large: **bandwidth** (a client subscribed to positions never receives a row update when settings change — at 1000 players x 60 Hz this dominates), **cache locality** (a position write does not touch cache lines holding lifetime stats), and **schema evolution** (adding a `PlayerStats` column never perturbs `PlayerState`). The rule: *organize data by access pattern — keep data you read together in one table, separate data you read at different frequencies.* This is a concrete instance of the bandwidth/interest-management principle in [[state-sync-interest-management]].

**Visibility & schema:** tables are **private by default** (reducer- and owner-only) or **`public`** (client-readable via subscriptions; writes still only through reducers). Constraints (primary key, unique, crash-safe auto-inc sequences, indexes) are declared in module code, not SQL DDL, and the schema is self-describing via **system tables** (`st_table`, `st_column`).

**Rust nuances:** the Rust `pub` on a table struct is ordinary module visibility with **no** SpacetimeDB meaning — client visibility is the `public` attribute on `#[spacetimedb::table]`. Accessors are `ctx.db.<snake_name>()` (e.g. `ctx.db.player_score()`), and `ctx.sender()` is a method (a 1.0->2.0 change).

### 12. Hosting & developer workflow (self-hosted vs maincloud, templates, coding agents)

**Hosting — two paths.** **Self-hosted standalone**: run your own host (`spacetime start`, default port 3000; **no SSL in standalone — terminate TLS at a reverse proxy**) on your own infrastructure — full control, and the model SpacetimeDB was built around (BitCraft self-hosts). **maincloud**: Clockwork Labs' managed cloud (`spacetime publish --server maincloud <name>`), which ships a **database dashboard** (live rows, concurrent-user counts, logs, metrics). **Key implication: self-hosting does NOT give you the maincloud dashboard — you supply your own observability** (structured logs, OTel/metrics, perf dashboards — see [[observability-performance-realtime]]), TLS, scaling, and ops. Choose self-hosted for control / data-residency / cost; maincloud for zero-ops.

**Workflow:** `spacetime init --template <name>` scaffolds a working module + client; the templates and a published "LLM benchmark" reflect a deliberate push to make the platform legible to coding agents. The vendor's "build a multiplayer game with Claude Code" walkthrough shows the **start-from-a-working-template, then iterate in small focused prompts** pattern.

> **Caveat (rigorous-build posture):** that walkthrough is a **TypeScript, single-prompt, ~30-minute prototype** on maincloud. The same primitives apply to a Rust, test-first, spec-driven build, but its engineering discipline does not transfer — keep determinism in a pure rule core, gate with tests/evals, and treat a template as a starting scaffold, not a substitute for the standards. **Where the walkthrough's TS / one-shot / maincloud guidance conflicts with the Rust + 2.6.0 + self-hosted specifics, prefer the latter.**

---

## Concrete examples & references

- **GDC 2025 — "Database-Oriented Design: Why We Built Our MMORPG Inside a Database"** (Tyler Cloutier, presented by SpacetimeDB): Argues stored procedures deserve revival as a first-class feature. BitCraft runs entirely as a single module: chat, inventory, terrain, player positions, all reducers, all subscriptions. https://gdcvault.com/play/1035359/-Database-Oriented-Design-Why

- **BitCraft Online (Steam)**: The production proof case. Thousands of concurrent players, entire backend as a single SpacetimeDB module. Public server source available at https://github.com/clockworklabs/BitCraftPublic

- **SpacetimeDB docs — Key Architecture**: Canonical reference for the host/database/reducer/client/identity model. https://spacetimedb.com/docs/intro/key-architecture

- **SpacetimeDB docs — Reducers**: Transactional execution, isolation guarantees, the no-global-state requirement, and the procedure escape hatch for HTTP I/O. https://spacetimedb.com/docs/functions/reducers/

- **SpacetimeDB docs — Subscriptions**: Zero-copy semantics, typed query builder, lifetime grouping best practice, avoiding overlapping queries. https://spacetimedb.com/docs/clients/subscriptions/

- **SpacetimeDB docs — Schedule Tables**: Interval vs. one-shot scheduling, row lifecycle, 100 ms game-tick example, best-effort delivery caveat. https://spacetimedb.com/docs/tables/schedule-tables/

- **SpacetimeDB docs — Row Level Security**: Experimental status, `#[client_visibility_filter]`, `:sender`, recursive RLS application, recommendation to use Views instead. https://spacetimedb.com/docs/how-to/rls/

- **SpacetimeDB docs — Automatic Migrations**: Safe/potentially-breaking/forbidden change matrix; incremental migration pattern; --delete-data caveat. https://spacetimedb.com/docs/databases/automatic-migrations/

- **SpacetimeDB docs — Migrating 1.0 to 2.0**: Documents every breaking change in 2.0: event tables replacing reducer callbacks, confirmed reads on by default, scheduled functions now private, typed query builder replacing raw SQL subscriptions. https://spacetimedb.com/docs/upgrade/

- **vmg — "SpacetimeDB: a short technical review" (Feb 2026, strn.cat)**: The most technically rigorous independent analysis of the internals available. Identifies the global RWMutex, async WAL, in-memory-only storage, and cluster-replication limitations. Written by a principal systems engineer formerly at GitHub and PlanetScale. https://strn.cat/w/articles/spacetime/ — **high signal; read this before committing to SpacetimeDB on a production project.**

- **SpacetimeDB blog — "Let's Talk Benchmarks" (Tyler Cloutier, May 2026)**: The official response to benchmark criticism, including context on what the 150K TPS figure measures. https://spacetimedb.com/blog/benchmarking

- **GitHub issue #2833 — "Testing reducers"**: Open as of mid-2025, requesting isolated database environments for unit testing, custom pre-population, multi-identity test scenarios. Indicates testing tooling is still immature. https://github.com/clockworklabs/SpacetimeDB/issues/2833

---

## Design implications & transferable principles

**1. The tier collapse is real and dramatic for small-team authoritative multiplayer.**
If your game would otherwise require a standalone authoritative game server process, a message bus, and a separate persistence layer, SpacetimeDB replaces all three. The savings in operational complexity and infrastructure surface area are real. A two-person studio that cannot staff a dedicated backend engineer gains access to a production-grade authoritative server model with subscription-based state replication out of the box. This was the original design goal and BitCraft validates it in production.

**2. Subscriptions-as-interest-management is the most compelling feature.**
The subscription model solves the hardest usability problem in state replication (see [[state-sync-interest-management]]): the developer expresses *what* each client should see in SQL, and the system takes care of tracking changes, diffing, and pushing deltas. Writing a bespoke interest-management layer in a traditional game server is weeks of work with many correctness pitfalls (who receives the update when a player crosses a zone boundary?). SpacetimeDB makes this declarative.

**3. The single-node/single-lock model is a known and bounded risk.**
The in-memory, global-mutex architecture is not a secret flaw — it is a deliberate design choice that enables the performance and simplicity properties of the system. For a game server handling one match (or one persistent-world shard), a single machine with sufficient RAM is often exactly the right operational model. The risk is capacity planning: dataset size must fit in RAM, and reducer throughput must fit in the available CPU time within the global mutex. Establish these budgets early. A 10 GB RAM budget and 100 ms reducers are very different constraints than a 100 GB world and 1 ms reducers.

**4. SpacetimeDB does not replace client-side netcode; it replaces the server tier.**
Client prediction, entity interpolation, lag compensation, and the two-clocks decoupling (see [[netcode-authoritative-multiplayer]] §2–§6) are still entirely the client developer's responsibility. SpacetimeDB delivers authoritative state deltas via subscriptions; what the client does with those deltas to produce a smooth, low-latency experience is unchanged. Do not mistake "subscriptions deliver state changes in real time" for "netcode is solved." The subscription callback fires when the server commits a state change — that is equivalent to receiving a server snapshot, not a smoothed interpolated position.

**5. Use RLS filters for access control, Views for computed data — they are complementary.**
Per the current 2.x workflow, **RLS filters** are the server-side mechanism that scopes which rows a client may subscribe to (the per-player visibility case: each player sees only their own inventory, adjacent-zone entities, etc.) via `:sender` Identity filtering. **Views** are for derived/aggregated read-only data computed server-side. Do not treat Views as an RLS replacement (an older docs framing) — use each for its job, and verify the RLS filter API stability flag for your pinned version.

**6. Design schema evolution into the module from day one.**
The migration limitations are the most operationally significant constraint for a live game. Columns cannot be removed or reordered by automatic migration. Plan schemas to be additive: if you might change a field, consider whether it should be a separate table row (easily added) rather than a new column (requires default values, cannot be reordered). Follow the incremental migration pattern — the docs describe it explicitly — and test migrations with representative data before shipping.

**7. Plan for testing infrastructure early.**
Unit testing reducers requires a running SpacetimeDB instance (GitHub issue #2833 confirms the tooling for isolated environments is immature). This means reducer logic that you would normally unit test needs to be either (a) extracted into pure functions in a library crate that can be tested independently of SpacetimeDB, or (b) integration-tested against a local SpacetimeDB process via `spacetime start`. Both approaches are workable but require deliberate architecture. A hybrid: keep pure game logic (physics step, rule evaluation) in a library; use SpacetimeDB reducers as thin orchestration that calls the library. The library is fully unit-testable; the reducer integration tests can be lighter.

**8. The lock-in profile is moderate but real.**
SpacetimeDB modules are written in standard Rust, C#, C++, or TypeScript — the language itself is not lock-in. The lock-in is the substrate: the `ReducerContext`, the table macros, the subscription protocol, and the WASM deployment model are all SpacetimeDB-specific. Porting a SpacetimeDB module to a different server runtime means rewriting the data layer and all authorization logic. For a small game with one multiplayer backend, this is acceptable. For a large multi-title studio, assess whether the productivity gain outweighs the dependency on a v2.x-era, VC-backed, single-vendor platform.

**9. Match the deployment model to the game type.**
SpacetimeDB's in-memory, single-primary, vertically-scaled model is well-matched to:
- Persistent-world games (one authoritative shard, dataset fits in RAM)
- Session-based games where each match/lobby runs as a separate SpacetimeDB database
- Small-to-medium concurrent-player counts per shard (hundreds to low thousands, constrained by RAM)

It is less well-matched to:
- Games requiring multi-region active-active replication with strong consistency
- Analytical workloads, batch processing, or large dataset sizes exceeding available RAM
- Games that need to query historical data across large time windows (SpacetimeDB is optimized for present state, not historical queries)

**10. Decompose hot state by update frequency.**
In any subscription/replication system (SpacetimeDB or otherwise), split entities into separate tables/components by how often each field changes (60 Hz position vs. rare settings). It cuts replication bandwidth, improves cache locality, and decouples schema evolution — the single highest-leverage schema decision for a realtime backend, and a direct lever for [[state-sync-interest-management]].

---

## Open questions

- **Version currency.** The pin **2.6.0** is confirmed Latest (16 Jun 2026); 2.0→2.6 were additive/perf releases (no second major), so the 1.0→2.0 migration checklist in the docs remains the breaking-change reference. Re-confirm Latest before a new project — the 2.x line iterates fast.

- **What is the RAM budget for the project's world state?** This is the binding capacity constraint. Estimate the number of entities × bytes per entity and add headroom for indices and the WAL buffer. SpacetimeDB provides no automatic sharding or disk-overflow path.

- **Will the scheduled-reducer tick frequency meet latency requirements?** At 20 Hz (50 ms), server-authoritative movement updates are 1–3 subscription cycles behind a client input at typical latencies. Is that acceptable without client-side prediction? If the game requires sub-20 ms perceived input response, client prediction becomes mandatory.

- **Is the C# SDK or the Rust SDK the module language for this project?** Rust modules compile to smaller WASM and have a lower per-reducer overhead. C# uses the .NET WASM runtime (significantly more overhead per cold start / instance). At high reducer throughput the language choice affects the effective max TPS under the global lock. [UNVERIFIED: specific overhead figures for .NET vs. Rust in SpacetimeDB's WASM runtime — verify before using as a performance argument.]

- **How will incremental migrations be tested?** Define a staging database that mirrors production schema. Build a migration playbook: for each schema change, document the dual-write period, the migration reducer, and the cutover sequence. This infrastructure needs to exist before the first post-launch schema change.

- **What happens to in-flight subscriptions during a `spacetime publish`?** The docs say connections are maintained and subscriptions continue, with possible brief interruptions to scheduled reducers. Measure the actual interruption window against the game's connection-drop tolerance before relying on this in production.

- **Is the project's game-server workload read-heavy or write-heavy?** The global RWMutex allows multiple concurrent readers or one exclusive writer. A workload with many short writes and lighter reads is the sweet spot. A workload with expensive View computations competing with writes could cause reader starvation or writer starvation depending on mutex fairness policy.

- **Is Procedures (HTTP I/O from within a module) required?** As of 2.0 launch, Procedures were in Beta. If the project needs to call external services (payment APIs, anti-cheat backends, third-party matchmaking) from within the module, verify that Procedures are stable in the pinned 2.6.x version before depending on them.

---

## Version notes: SpacetimeDB 2.x

**Confidence: high** — verified against the live official docs (version label "2.0.0") and the confirmed **v2.6.0** GitHub release.

**2.6.0** (Latest; released 16 Jun 2026): primary-key support for **Views** in Rust/TypeScript/C# (C++ view PKs deferred); layout-altering automigrations now allowed for **event tables**; commitlog config knobs (`max_segment_size`, `write_buffer_size` default 8KiB→128KiB, `preallocate_segments`); Timestamp primary keys in C#; ARM-cross-compiled CLI binaries; deterministic-reducer-randomness docs clarification. (Full changelog v2.5.0…v2.6.0.)

Key changes introduced in **2.0** (breaking from 1.x):
- Reducer argument broadcasting removed; replaced by explicit **event tables** for cross-client notification
- **Confirmed reads on by default**: subscription deltas only sent after WAL durability confirmation (opt-out via `withConfirmedReads(false)`)
- **Scheduled functions are now private**: no longer callable by clients; authorization checks inside scheduled reducers are no longer needed
- Typed **query builder** replaces raw SQL as the recommended subscription API (raw SQL still supported)
- `light_mode` removed (was used to suppress reducer event broadcast — now irrelevant since broadcast is gone)
- `CallReducerFlags` removed (no-success-notify option gone; success notifications are now lightweight and always sent)
- **Procedures** introduced (Beta) for non-transactional server-side functions that can make HTTP requests
- **Views** introduced as stable, recommended alternative to RLS for read-only computed access patterns
- **Event tables** introduced for transient event publication
- Table name canonicalization changed (accessor vs. name distinction; case conversion policy configurable)
- `sender` changed from field to method in Rust/C++ module code
- `withModuleName` replaced by `withDatabaseName` on client connection builder
- Private items excluded from `spacetime generate` by default; use `--include-private` to include

**Module languages as of 2.x**: Rust, C#, C++, TypeScript (TS compiles to a JS bundle rather than Wasm). Parity is close but not exact — e.g. **C++ does not yet support primary keys on Views as of 2.6.0** (slated for a later release). See https://spacetimedb.com/docs/intro/language-support for the current matrix.

**Unreal Engine** support added officially September 2025 (after 1.0, before 2.0). Unreal SDK uses C++ and Blueprint.

---

## Sources

1. https://spacetimedb.com/docs/ — SpacetimeDB Official Documentation (Docusaurus, version 2.0.0), Clockwork Labs
2. https://spacetimedb.com/docs/intro/key-architecture — Key Architecture (host, database, reducer, view, client, identity, connectionId, energy)
3. https://spacetimedb.com/docs/functions/reducers/ — Reducers: transactional execution, isolation, no-I/O constraint, scheduling, undefined behavior of global state
4. https://spacetimedb.com/docs/clients/subscriptions/ — Subscriptions: zero-copy semantics, typed query builder, lifetime grouping, overlapping-query hazards
5. https://spacetimedb.com/docs/tables/schedule-tables/ — Schedule Tables: interval vs. one-shot, row lifecycle, best-effort caveat
6. https://spacetimedb.com/docs/how-to/rls/ — Row Level Security: experimental status, `#[client_visibility_filter]`, `:sender`, recursive rules, recommendation to use Views
7. https://spacetimedb.com/docs/databases/automatic-migrations/ — Automatic Migrations: safe/breaking/forbidden change matrix, incremental migration pattern
8. https://spacetimedb.com/docs/upgrade/ — Migrating from SpacetimeDB 1.0 to 2.0: full breaking-change list, event tables, confirmed reads, private scheduled functions
9. https://strn.cat/w/articles/spacetime/ — vmg, "SpacetimeDB: a short technical review," February 2026; independent technical analysis of storage engine, global mutex, WAL durability, and cluster model
10. https://spacetimedb.com/blog/introducing-spacetimedb-1-0 — Tyler Cloutier, "Introducing SpacetimeDB 1.0," March 4, 2025; production announcement, BitCraft backstory
11. https://gdcvault.com/play/1035359/-Database-Oriented-Design-Why — GDC 2025, "Database-Oriented Design: Why We Built Our MMORPG Inside a Database," presented by SpacetimeDB
12. https://github.com/clockworklabs/SpacetimeDB/issues/2833 — GitHub issue #2833: "testing reducers" — open feature request for isolated test environments, multi-identity test scenarios
13. https://github.com/clockworklabs/SpacetimeDB/releases/tag/v2.6.0 — Release v2.6.0 (16 Jun 2026, Latest): View primary keys (Rust/TS/C#), event-table automigration, commitlog knobs, ARM CLI binaries, deterministic-reducer-randomness docs note
14. https://spacetimedb.com/docs/intro/what-is-spacetimedb — "What is SpacetimeDB?": database-that-is-a-server, in-memory + commit log, RLS-filters-before-subscriptions workflow, read-only state mirroring
15. https://spacetimedb.com/docs/functions — Functions overview: the reducers vs procedures vs views capability matrix (procedures beta; views read-only/subscribable)
16. https://spacetimedb.com/docs/tables — Tables: in-memory + auto-persist, data-oriented design (ECS as a relational subset), decompose-by-access-pattern, private/public visibility, system tables, per-language accessors
17. https://spacetimedb.com/blog/building-with-claude-code — vendor walkthrough (Jan 2026): template-start + small-prompt iteration, maincloud dashboard, scheduled-table game loop (a TypeScript prototype)
18. https://spacetimedb.com/blog/databases-and-data-oriented-design — Data-oriented design: tables as the full relational model vs. ECS as a strict subset
