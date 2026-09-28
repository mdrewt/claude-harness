# Spec: M0 — Foundation & mechanical gates (walking skeleton)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm
**Decisions (all accepted unless noted):** ADR-0002 (SpacetimeDB 2.x), 0003 (shared Rust core),
0004 (PixiJS v8), 0005 (single repo), 0006 (schema evolution + content-sync), 0007 (zoned),
0009 (CI), 0010 (falsifiable gates / proof-of-teeth).
**Review pass:** reviewer + red-team + simplify lenses applied over two passes (see §7).

## 1. Problem / intent

Stand up the v2 project as a **walking skeleton with all mechanical gates wired before any gameplay**.
M0 builds no game system; it builds the *machine that keeps the game correct* — the purity/determinism/
safety gate, the shared-core feature isolation + prediction-parity harness, the schema-evolution +
content-sync pattern, the zoned-schema convention (enforced, not aspirational), the headless netcode/
determinism `sim-harness`, observability + reproducibility, and a complete CI pipeline that is **green
and meaningful** on an almost-empty repo. Success = a single end-to-end pipe proven (client connects →
calls a reducer → server writes a table → client renders it from its subscription), **every gate is
proven to have teeth** (a known-bad fixture each gate rejects), and every v1 CI blind spot (G3/G9) is
closed from commit one. Audience: the build team (you + the agent loop); this is the substrate M1+
slices stand on.

## 2. Scope

**In scope**
- Generate from `templates/spacetimedb-game` via `just new monster-realm spacetimedb-game`; extend to a
  cargo workspace: `game-core`, `client-wasm`, `server-module`, `sim-harness`; plus `frontend/` (PixiJS v8).
- The standard `just` verb surface wired: `setup`, `test`, `lint`, `typecheck`, `eval`, `security`,
  `mutate`, `ci`.
- **Purity / determinism / safety gate** — `clippy.toml` `disallowed-methods` bans wall-clock reads +
  unseeded RNG **workspace-wide** (no crate reads `std::time::{SystemTime,Instant}::now` or
  `rand::{thread_rng,random}`; the server takes time/RNG from `ctx.timestamp`/`ctx.rng()`, the client
  passes time in, tests seed an explicit RNG). `clippy` also denies `unwrap`, `panic!`, `unreachable!`,
  and panic-capable indexing on reachable paths in `game-core` **and** `server-module` (`expect("reason")`
  is permitted). CI runs `clippy --all-targets --all-features -- -D warnings`, so an impurity is a build
  failure, not a review note. One trivial pure rule (`tick_seed(state,input,seed)->state`) proves the gate.
- **Shared-core isolation + parity harness** (ADR-0003): `client-wasm` compiles `game-core` **without**
  the `spacetimedb` feature and is built via `wasm-pack` in CI; a **prediction-parity eval** runs the
  trivial rule through both the server path and the wasm path and asserts identical output — so M1
  movement plugs into an existing gate rather than inventing one.
- **Schema-evolution + content-sync pattern** (ADR-0006): a `sync_content` reducer separate from `init`
  (idempotent upsert-by-stable-id) over a minimal content registry (a `config` singleton + one tiny
  RON-seeded table), a re-derive hook stub, and the schema-snapshot + append-only-ids evals; lean on
  SpacetimeDB automatic migrations for additive schema, with a migration smoke-test.
- **Zoned-schema convention** (ADR-0007): an architecture eval requires every world table to carry an
  indexed `zone_id`; the one M0 world table (`presence`) complies, proving the gate has teeth.
- **End-to-end pipe:** a `presence` table + `join`/`heartbeat` reducers; the PixiJS client connects, calls
  the reducer, and renders one dot per `presence` row from its **generated** bindings + subscription. No
  movement yet (M1).
- **`sim-harness`:** a headless, deterministic, multi-client driver with an injected clock + seed that runs
  a reducer sequence and asserts replay-determinism; latency/loss injection skeleton (used from M1).
- **Observability & performance substrate (ADR-0029, Layer 1 — see `observability-performance-plan.md`):**
  structured (JSON) levelled logging with a threaded correlation id, fail-loud, no silent catch, no
  secrets/PII; an **error-capture seam** (server) + the M3 client panic hook; an **OTel instrumentation
  seam** (spans/metrics from reducers/tick/wasm/loop, **exporter no-op in dev, Datadog in prod**); a
  **benchmark harness + perf-budget eval that gates `just ci`** (criterion micro-benchmarks on `game-core`
  hot rules; a regression beyond the budget fails CI — the `evals.md` benchmark gate, always-on); a
  **health/readiness** signal. The heavy production stack (dashboards/alerts/comprehensive load) is the M20
  capstone; M0 wires the seams + the always-on gate.
- **Reproducibility:** `rust-toolchain.toml` pins Rust (workspace pin: 1.96.0) with `components =
  [rustfmt, clippy]` and `targets = [wasm32-unknown-unknown]` (the target `wasm-pack` needs); the
  `spacetime` CLI version is pinned; the workspace `Cargo.toml` uses **`resolver = "2"`** (keeps per-crate
  feature sets from leaking — the structural half of feature-isolation, with the eval as proof) and
  declares shared dep versions once in **`[workspace.dependencies]`** (SSOT for versions); devcontainer;
  CI uses the pinned versions.
- **Supply chain / git hygiene:** `gitleaks` as a pre-commit hook **and** a CI gate; Semgrep (SAST); SCA
  with pinned lockfiles + dependency review; SBOM (Trivy/Syft) + license check; Renovate; Conventional-
  Commit message enforcement (commit-msg hook) feeding a generated changelog; least-privilege MCP
  allow-list + destructive-action deny-list in `.claude/settings.json`.
- **Full CI** (ADR-0009): lint → typecheck → unit/property tests → eval harness → mutation (changed lines)
  → security → build (incl. `wasm-pack`); **bindings-drift gate**; **e2e in CI** against a containerized
  `spacetime`. Branch protection: PR-only, squash, linear history.
- `AGENTS.md` declaring principle tiers/inversions (Postel inverted; OCP→exhaustive enums; SSOT/
  determinism Tier-1) and the project verbs; `ARCHITECTURE.md` linking the ADRs.

**Out of scope (non-goals)**
- Any gameplay: movement rules, monsters, battles, taming, content beyond the skeleton registry (M1+).
- Real maps / Tiled pipeline (ADR-0008, M11); multiple zones beyond a single hardcoded `zone_id`.
- Client **prediction logic** and reconciliation (M3) — M0 builds the parity *harness* but predicts nothing.
- RLS filters (no private data yet — added with the first owner-scoped table, M6).
- OTel tracing / metrics dashboards, latency/loss *tests* (skeleton only), art beyond a placeholder dot.

## 3. Acceptance criteria (EARS)

**Scaffold & commands**
- WHEN `just ci` runs on a fresh clone THE SYSTEM SHALL run lint, typecheck, tests, eval, mutation, and
  security stages and exit zero.
- WHEN any standard verb (`setup`/`test`/`lint`/`typecheck`/`eval`/`security`/`mutate`/`ci`) is invoked
  THE SYSTEM SHALL map to the stack-native command without a missing-target error.

**Purity / determinism / safety gate**
- IF `game-core` source reads a wall clock or constructs unseeded randomness THEN THE SYSTEM SHALL fail
  `just lint`.
- IF any workspace crate reads a wall clock (`std::time::{SystemTime,Instant}::now`) or constructs
  unseeded randomness (`rand::{thread_rng,random}`) THEN THE SYSTEM SHALL fail `just lint`.
- IF `game-core` or `server-module` uses `unwrap`, `panic!`, `unreachable!`, or panic-capable indexing
  on a reachable path THEN THE SYSTEM SHALL fail `just lint` (`expect("reason")` is permitted).
- WHEN the pure M0 rule runs twice with identical `(state, input, seed)` THE SYSTEM SHALL produce
  byte-identical output (determinism unit + property test).

**Shared-core isolation & prediction parity (ADR-0003)**
- IF the `client-wasm` build graph contains the `spacetimedb` feature or any server-only dependency
  THEN THE SYSTEM SHALL fail the feature-isolation eval.
- WHEN the M0 rule is run natively (the path the server compiles) and through the `wasm-pack` build with
  the same inputs THE SYSTEM SHALL produce identical output (prediction-parity eval) — this catches
  feature-flag- or target-induced divergence before any real rule depends on it.
- WHEN CI builds THE SYSTEM SHALL build `client-wasm` via `wasm-pack` (toolchain proof).

**Time & clock contract**
- WHILE resolving a reducer THE SYSTEM SHALL obtain time from `ctx.timestamp` and pass it as an injected
  `Millis` into `game-core`; `game-core` SHALL never read time itself.
- WHEN `sim-harness` runs a sequence THE SYSTEM SHALL drive time from its injected clock (no wall-clock).

**Schema evolution & content-sync (ADR-0006)**
- WHEN the module is republished over an existing database with only additive schema changes THE SYSTEM
  SHALL migrate automatically without data loss (migration smoke-test).
- WHEN `sync_content` is called THE SYSTEM SHALL upsert every content row by stable id and SHALL be
  idempotent (a second call with unchanged content produces no row churn).
- IF a content change removes or renumbers an existing stable id THEN THE SYSTEM SHALL fail the
  append-only-ids eval.
- IF a schema diff is non-additive on a non-event table THEN THE SYSTEM SHALL fail the schema-snapshot
  eval, and the committed baseline SHALL only change in a PR a verifier approves as intentional.

**Zoned-schema convention (ADR-0007)**
- IF a world table lacks an indexed `zone_id` THEN THE SYSTEM SHALL fail the architecture eval.

**End-to-end pipe & security**
- WHEN a client calls `join` THE SYSTEM SHALL create exactly one `presence` row keyed by `ctx.sender`
  (identity from `ctx.sender` only, never a client-passed field).
- WHEN a `presence` row changes THE SYSTEM SHALL deliver it to subscribed clients, which SHALL render one
  dot per row using the **generated** bindings.
- IF a reducer receives a client-passed identity field THEN THE SYSTEM SHALL ignore it and use
  `ctx.sender` (security eval asserts no reducer trusts client-passed identity).

**Sim-harness**
- WHEN `sim-harness` replays a fixed reducer sequence twice with the same seed THE SYSTEM SHALL produce
  identical final state (replay-determinism).

**Observability & errors (ADR-0029, Layer 1)**
- WHEN a reducer rejects an action THE SYSTEM SHALL emit one structured (JSON) log line with a level, reason,
  and correlation id, and SHALL NOT silently swallow the error (no secrets/PII in logs).
- WHEN a reducer/tick/wasm-boundary executes THE SYSTEM SHALL emit OTel spans/metrics through the
  instrumentation seam (exporter no-op in dev; Datadog in prod) — wired but off by default.
- IF a `game-core` hot-rule benchmark regresses beyond its committed perf budget THEN `just ci` SHALL fail
  (the always-on benchmark/perf-budget gate; a proof-of-teeth fixture proves a seeded regression fails it).
- THE SYSTEM SHALL expose a health/readiness signal for the module.

**CI completeness & supply chain (ADR-0009 — closes v1 G3/G9)**
- IF committed `module_bindings` differ from a fresh `spacetime generate` THEN THE SYSTEM SHALL fail the
  bindings-drift gate.
- WHEN CI runs THE SYSTEM SHALL execute the Playwright e2e suite against a containerized `spacetime`
  instance as a required gate (not local-only).
- WHEN CI runs THE SYSTEM SHALL run gitleaks, Semgrep, SCA/dependency-review with pinned lockfiles, and
  produce an SBOM + license check.
- IF mutation score on changed lines is below threshold THEN THE SYSTEM SHALL fail CI.
- IF line coverage is below the project threshold THEN THE SYSTEM SHALL fail CI.
- IF a commit message violates Conventional Commits THEN THE SYSTEM SHALL reject it (commit-msg hook).
- IF a direct push to `main` is attempted THEN THE SYSTEM SHALL be rejected by branch protection.

**Proof-of-teeth (cross-cutting — makes "green" meaningful; ADR-0010)**
- For EACH mechanical gate (determinism, safety, feature-isolation, parity, zoned, append-only-ids,
  schema-snapshot, bindings-drift, identity-trust) THE SYSTEM SHALL ship a known-bad fixture/test proving
  the gate **fails** when the invariant is violated. WHEN the proof-of-teeth suite runs THE SYSTEM SHALL
  confirm every gate rejects its bad fixture.

## 4. Plan (high level)

Walking-skeleton-first: build the **shell + the gates + proof each gate bites**, then prove one thin
vertical through it.

- **Workspace:** cargo workspace (`game-core` pure; `client-wasm` thin wasm exports; `server-module` STDB
  tables+reducers; `sim-harness` headless driver) + `frontend/` PixiJS. Shared value types live in
  `game-core` and derive `SpacetimeType` only under the `spacetimedb` feature (enabled by `server-module`,
  **not** `client-wasm`) — cross-boundary shapes are generated, never hand-written twice. The
  feature-isolation eval guards that the client never pulls the server feature.
- **Gates as code:** `clippy.toml` (purity+safety); architecture/feature/parity/zoned/content evals under
  `evals/`; each gate paired with a proof-of-teeth fixture so the suite verifies the gate *can* fail.
- **Time/RNG:** injected everywhere; reducers read `ctx.timestamp`, pass `Millis` in; `sim-harness` owns a
  deterministic clock + seed.
- **Content/migration:** `init` creates tables + calls `sync_content` once; `sync_content` is also callable
  on republish (idempotent). Content is RON under `game-core/content/`, parsed by a pure `load_*`
  (parse-don't-validate, integrity-tested), seeded into a read-only table. Lean on STDB automigration for
  additive schema; schema-snapshot eval diffs the serialized module schema against a verifier-approved
  baseline; append-only-ids eval guards the registry.
- **Zoned convention:** `presence` carries `zone_id u32` + btree index; the architecture eval scans table
  defs for world tables missing it.
- **Pipe:** `presence` + `join`/`heartbeat` (identity = `ctx.sender`); the client renders dots from the
  generated bindings + subscription.
- **Test division of labor:** `sim-harness` = fast headless logic/netcode/determinism (every loop);
  Playwright e2e = the real browser + `spacetime` integration (gate, fewer cases) — no duplicated coverage.
- **CI:** one GitHub Actions pipeline (ADR-0009); `spacetime` in a service container for e2e + migration
  smoke-test; bindings-drift regenerates and diffs; pinned toolchain/CLI; Renovate for freshness. The Rust
  job builds `client-wasm` once via `wasm-pack` and uploads it as an artifact the frontend job consumes
  (`needs:`), so the frontend typechecks/tests against the **real compiled wasm**, not a stub.
- **Contracts at boundaries:** reducers validate `ctx.sender` + legality → delegate to `game-core` → write
  tables (reject with `Err`, never clamp); frontend validates external IO at the edge.

## 5. Tasks (small vertical slices — one mergeable behavior each)

> Sequencing: tasks group into **M0a (substrate + gates, no gameplay)** and **M0b (the presence vertical +
> e2e)**. M0a can merge and be green before M0b begins — see §6.

**M0a — substrate & gates**
- [ ] Scaffold via `just new monster-realm spacetimedb-game`; pin toolchain + `spacetime` CLI; devcontainer; commit empty-but-green CI + branch protection + commit-msg hook.
- [ ] Add workspace crates (`game-core`, `client-wasm`, `server-module`, `sim-harness`) + wire `just` verbs.
- [ ] Purity/determinism/safety gate: `clippy.toml` (clocks/RNG + unwrap/panic) + the pure M0 rule + determinism unit/property test.
- [ ] Feature-isolation eval (`client-wasm` has no `spacetimedb` feature) + `wasm-pack` build in CI + prediction-parity eval on the M0 rule.
- [ ] `sim-harness` skeleton (injected clock+seed) + replay-determinism eval + latency/loss injection stub.
- [ ] Schema-snapshot eval + append-only-ids eval + zoned-schema architecture eval.
- [ ] Supply chain: gitleaks (hook+CI), Semgrep, SCA + pinned lockfiles, SBOM + license check, Renovate; `.claude/settings.json` allow/deny lists.
- [ ] Observability/perf substrate (ADR-0029): structured logging + correlation id + error/OTel seams (exporters off in dev) + health/readiness; **criterion benchmark harness + perf-budget eval gating `just ci`** + a seeded-regression proof-of-teeth.
- [ ] **Proof-of-teeth** suite: a known-bad fixture per gate; CI asserts each gate rejects it.

**M0b — walking-skeleton vertical**
- [ ] `presence` table (indexed `zone_id`) + `join`/`heartbeat` reducers (identity from `ctx.sender`) + structured rejection logging + security eval.
- [ ] `sync_content` reducer (idempotent) + minimal RON registry + pure loader + integrity test + migration smoke-test.
- [ ] PixiJS client: connect, call `join`, render one dot per `presence` row from generated bindings.
- [ ] Bindings-drift CI gate; Playwright e2e in CI against containerized `spacetime` (assert via a DEV introspection hook, never pixels).
- [ ] `AGENTS.md` (tiers/inversions + verbs) + `ARCHITECTURE.md` linking ADRs; doc-keeper records the M0 changelog + memory.

## 6. Risks / decisions

- **SpacetimeDB version-sensitive APIs** (scheduled reducers, RLS, automigration semantics) — verify
  against current docs before implementing; pin SDK + CLI (ADR-0002 condition). Note the Rust **crate** is
  versioned independently of the **product** (v1: crate `1.12` for product `2.6`) — match the crate to the
  installed `spacetime` CLI and confirm against current docs, not memory.
- **e2e-in-CI cost/flakiness** — containerized `spacetime` + a DEV introspection hook, bounded retries;
  quarantine flaky tests, never silent-retry (testing-tdd).
- **Mutation/coverage on a near-empty repo** — set forgiving thresholds in M0, tune up as `game-core`
  grows; mutation runs on changed lines so the trivial rule is enough to prove the gate.
- **M0 size** — large for one PR; **recommended split M0a → M0b** (gates land and stay green before the
  vertical) so a regression in the skeleton can't mask a missing gate.
- **Proof-of-teeth maintenance** — known-bad fixtures live beside each eval and are themselves cheap; they
  are the mechanical answer to "is this green because it's correct or because it tests nothing?"
- Open: exact mutation/coverage thresholds → set in M0a, revisited each milestone.

## 7. Design & review notes

### Observability & performance substrate (ADR-0029)
Closed the "no plan for observability/perf" gap by building **Layer 1** into M0: formalized structured
logging (correlation id, no PII), an error-capture + **OTel instrumentation seam** (exporters off in dev,
Datadog in prod), a **health/readiness** signal, and — the key always-on gate — a **criterion benchmark
harness + perf-budget eval that fails `just ci`** on a hot-rule regression (with a seeded-regression
proof-of-teeth). The heavy production stack + comprehensive load/profiling/tuning is the new **M20** capstone
(Phase D); the per-milestone instrumentation/benchmark/load rule is a new cross-cutting invariant. See
`observability-performance-plan.md`.

### v1 design-tutorial harvest
Read the M0/M1/CI chapters of the v1 tutorial (`tutorial-DrEnc_Nk.js`) and folded in:
- **Determinism clock/RNG ban is workspace-wide** (not just `game-core`) — no crate should read `std`
  time/RNG; the server uses `ctx.timestamp`/`ctx.rng()`. CI clippy runs with `-D warnings` (the teeth).
- **`resolver = "2"`** named as the structural mechanism behind feature-isolation (eval = proof);
  **`[workspace.dependencies]`** as the version SSOT; **`wasm32-unknown-unknown`** added to the toolchain pin.
- **CI wasm-artifact reuse** — the Rust job builds `client-wasm` once and the frontend job consumes it, so
  the frontend tests against the real compiled wasm.
- **Crate-vs-product version gotcha** recorded in risks (the `spacetimedb` crate ≠ the product number).
- **e2e-in-CI validated** by the tutorial's own honest verdict ("arguably better… would genuinely raise the
  safety bar"); v1 deferred it only for CI simplicity — exactly the blind spot (G3) M0 reverses (ADR-0009).

### Review + simplify (ADR sync)
- **Precision:** tightened the safety gate (ban `unwrap`/`panic!`/`unreachable!`/panic-capable indexing;
  `expect("reason")` allowed) — `expect` always carries a message, so "expect-without-reason" was a
  non-rule; removed the ambiguity.
- **Completeness:** added an explicit **coverage-threshold** criterion alongside mutation (`ci-cd.md`
  /`testing-tdd.md` require both); clarified the **parity eval** as native-vs-`wasm-pack` and stated its
  purpose (catch feature-flag/target divergence).
- **ADR sync:** promoted the M0-load-bearing ADRs **0006, 0007, 0009** from proposed → **accepted** (a
  spec must not start on proposed decisions per `spec-driven.md`); recorded the new **proof-of-teeth**
  pattern as **ADR-0010** and the **feature-isolation** invariant in ADR-0003; updated PLAN.md's ADR
  table + the M0→M0a/M0b sequencing.

### Expansion (reviewer + red-team + simplify lenses)
Reviewer + red-team + simplify lenses, cross-checked against `standards/`:

- **Reviewer (gaps):** added the `unwrap`/`panic` safety gate (v1 invariant, was unstated); reproducibility
  (pinned `rust-toolchain.toml` + `spacetime` CLI + devcontainer); structured logging + fail-loud
  (`observability.md`); Conventional-Commit enforcement + generated changelog (`git.md`); pinned lockfiles,
  SBOM license check, Renovate, MCP allow/deny lists (`security.md`).
- **Red-team (failure surface):** added **proof-of-teeth** (every gate ships a known-bad fixture it must
  reject — defeats "green-but-meaningless" CI); **feature-isolation eval** (client must not pull the
  `spacetimedb` feature — closes a silent client/server coupling class); explicit **clock-injection
  contract**; **verifier-approved schema-snapshot baseline** (so the gate can't be quietly rubber-stamped);
  stated **sim-harness vs e2e** division to avoid redundant cost.
- **Simplify (premature complexity):** pulled the **prediction-parity harness forward to M0** using the
  trivial rule (so M1 movement plugs into an existing gate, net-cheaper); kept RLS, OTel/metrics, latency
  *tests*, and multi-zone explicitly **deferred**; recommended the **M0a/M0b split** rather than one
  oversized slice.
