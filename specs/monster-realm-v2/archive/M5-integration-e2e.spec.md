# Spec: M5 — Multi-window integration (in-CI e2e + smoothness proof)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M4 (the full POC).
**Decisions:** ADR-0009 (CI completeness — e2e in CI), 0010 (proof-of-teeth), 0012/0013 (prediction +
smoothness), 0014 (client architecture). **Workflow:** harvest v1 M5 chapter → draft → review (see §7).

## 1. Problem / intent

**Prove** the POC holds: two real browser windows, one authoritative world, staying in sync **and feeling
smooth** — automatically, in CI, on every PR. M5 writes no game system; it is the capstone that turns
"works in my demo" into "a regression turns CI red." It closes v1's largest CI blind spot (the two-window
e2e was **local-only**) by running it **in CI against a containerized `spacetime`** (ADR-0009), and it
lifts the ADR-0013 smoothness properties from headless unit checks into an **end-to-end browser assertion**.
Success = a green, meaningful two-window e2e + smoothness gate that fails loudly on any desync, stutter,
rubberband, or skip regression.

## 2. Scope

**In scope**
- **Two-window Playwright e2e** (`frontend/e2e/`): a global setup that republishes the module with
  `--delete-data` (known preconditions: zero players), then two browser contexts each `join_game` and
  assert end-to-end via the **dev `window.__game()`** snapshot — **state, never pixels**.
- **Golden flows** (the regression net): both windows connect and see each other; movement syncs **both
  directions** (A→B and B→A); jump advances a tile; **a wall bump leaves predicted == authoritative** (the
  single most valuable desync assertion); prediction converges to authority; a **disconnect despawns** the
  character in the other window; a **reconnect** cleanly re-initializes (M4) with no stale ghost.
- **End-to-end smoothness assertions** (ADR-0013): over a movement run, each window's own predicted tile is
  **monotonic** (no backward jump except a genuine divergence) and a **remote** character shows no
  frame-to-frame jump > one tile under injected jitter (the interpolation buffer holds).
- **CI wiring** (ADR-0009): a **containerized `spacetime`** service; publish + `spacetime generate` +
  `wasm-pack` build; run the e2e as a **required merge gate**; the bindings-drift, security, mutation,
  coverage, and headless smoothness/netcode gates (M0–M4) continue to gate.
- **Robust test hygiene** (v1 lessons): read `STEP_MS` and spawn tiles **from the hook** (never hard-code);
  probabilistic/timing flows are bounded + retried-with-cap, never silently re-run; flaky tests quarantined.

**Out of scope (named deferrals)**
- Any new game system (monsters M6+); NPC-wander assertions (NPCs → M12 — the v1 e2e tested an NPC; v2's
  does not until they exist).
- Battle/box/trade e2e flows → added with their milestones (M7/M15).
- Comprehensive load/perf/profiling → the **M20** capstone (ADR-0029); per-milestone concurrency/load tests
  are a cross-cutting invariant (the M2 soak/load is the first). M5 keeps the e2e + smoothness gates; it does
  not own the production perf pass.

## 3. Acceptance criteria (EARS)

**Preconditions & harness**
- WHEN the e2e suite starts THE SYSTEM SHALL republish the module with `--delete-data` so each run begins
  from a known world (zero players), and SHALL read `STEP_MS`/spawn tiles from `window.__game()`, never
  hard-coded constants.
- THE SYSTEM SHALL assert only on the `window.__game()` state snapshot / store, never on canvas pixels.

**Sync golden flows**
- WHEN two contexts join THE SYSTEM SHALL show each window the other's character.
- WHEN window A moves THE SYSTEM SHALL reflect the move in window B (and symmetrically B→A), converging to
  the authoritative tile.
- WHEN a character jumps THE SYSTEM SHALL advance it one tile (or hop-in-place at a wall) on both windows.
- WHEN a character steps into a wall THE SYSTEM SHALL leave **predicted == authoritative** (no desync) on
  the acting window — the canonical regression net.
- WHEN a context disconnects THE SYSTEM SHALL despawn its character in the other window; WHEN it reconnects
  THE SYSTEM SHALL re-initialize cleanly (no duplicate/ghost character — M4).

**Smoothness end-to-end (ADR-0013)**
- WHILE a window drives a continuous movement run THE SYSTEM SHALL keep its own predicted tile **monotonic**
  (no backward step except a genuine divergence).
- WHILE network/scheduler jitter is injected THE SYSTEM SHALL keep a **remote** character's rendered motion
  free of any frame-to-frame jump > one tile (the interpolation buffer absorbs jitter).

**CI gating (ADR-0009) + proof-of-teeth (ADR-0010)**
- WHEN CI runs THE SYSTEM SHALL execute the two-window e2e against a containerized `spacetime` as a
  **required** gate (not local-only).
- IF a change reintroduces a desync (e.g. a TS-reimplemented rule), a stutter (renderer reads
  `move_started_at`), or a rubberband (mid-batch reconcile) THEN the corresponding e2e/smoothness assertion
  SHALL fail — each shipped with a proof-of-teeth fixture.
- IF a probabilistic/timing flow is added THEN it SHALL be bounded with a cap and a reliable inner action,
  never a silent retry; flaky tests are quarantined, not re-run blindly.

## 4. Plan (high level)

- **e2e harness:** Playwright, two `BrowserContext`s against one published module; a `global-setup` that
  `spacetime publish --delete-data` + `spacetime generate`; assertions poll `window.__game()` (a stable
  dev-only snapshot) with bounded waits keyed to `STEP_MS` from the hook.
- **Smoothness in the browser:** the snapshot exposes the per-frame predicted tile history + remote
  interpolated positions so the test can assert monotonicity + the bounded-jump property; jitter is injected
  at the connection layer (a test-only latency/loss shim) or via the sim-harness driving one side.
- **CI:** a `spacetime` **service container** (pinned version) in the e2e job; the Rust job builds+uploads
  the `wasm-pack` artifact the frontend job consumes (M0); the e2e job publishes, generates, serves
  (`vite build` + preview), and runs Playwright headless. The job is a required check on `main`.
- **Division of labor:** headless sim-harness/predictor smoothness + netcode tests (M2–M4) run every CI run
  and catch most regressions cheaply; the two-window e2e is the realistic, slower, integration gate — no
  duplicated coverage.

**Boundary preview — what M6 will consume:** a green, trusted POC foundation + the e2e harness pattern
(`window.__game()` + `--delete-data` global-setup) that M6+ extend with new golden flows (a rolled starter
on join, owner-scoped monster visibility) as systems land.

## 5. Tasks (vertical slices)
- [ ] Playwright config + `global-setup` (`--delete-data` republish, `spacetime generate`).
- [ ] Two-context join + sync golden flows (see-each-other, both-direction sync, jump, bump⇒predicted==auth, convergence).
- [ ] Disconnect-despawn + reconnect-clean-reinit flows.
- [ ] End-to-end smoothness assertions (monotonic predicted; bounded remote jump under injected jitter) + proof-of-teeth fixtures.
- [ ] CI: containerized `spacetime` e2e job (publish/generate/serve/Playwright) as a required gate; wire artifact reuse.
- [ ] doc-keeper: changelog + memory; mark the POC (M0–M5) complete in `ARCHITECTURE.md`.

## 6. Risks / decisions
- **e2e flakiness/cost in CI** — containerized `spacetime` + assert-on-state (never pixels) + bounded waits
  keyed to `STEP_MS`; quarantine, never silent-retry (testing-tdd). Confirm the pinned `spacetime`
  container image/version.
- **Jitter injection point** — a test-only shim at the connection or sim-harness-driven side; keep it out of
  production paths. Open: exact `interpDelay`/jitter levels for the bound → tune with the HUD numbers.
- **NPC flows removed** vs v1 (NPCs → M12) — the e2e tests two *players* instead; re-add NPC-wander when M12
  lands.
- **No new ADR** — e2e-in-CI is already ADR-0009; this milestone implements it.

## 7. Review / red-team notes
### Tutorial harvest (`tutorial-DrEnc_Nk.js`, M5 chapter)
Adopted: two-window Playwright asserting on `window.__game()` (state, never pixels); `--delete-data`
global-setup for deterministic preconditions; read `STEP_MS`/spawn from the hook; the **bump ⇒
predicted == authoritative** golden assertion ("the single most valuable assertion"); the two-job CI
(Rust→artifact→frontend). **v2 upgrade:** v1's honest verdict called installing `spacetime` in CI to run
the e2e "arguably better … would genuinely raise the safety bar" but deferred it for simplicity — v2
**takes that path** (ADR-0009), and adds the **end-to-end smoothness assertions** (monotonic predicted +
bounded remote jump) that v1 never had.
### Red-team
- A green-but-shallow e2e → require the bump-desync + smoothness assertions with proof-of-teeth (each must
  fail on a known regression), so the gate is meaningful, not decorative.
- Flaky timing → bounded waits keyed to `STEP_MS`, quarantine policy, no blind retries.
### Simplify
No new game systems; NPC flows deferred; headless tests keep most coverage cheap, the e2e is the thin
realistic gate.
