# Monster Realm (v2) — Greenfield Plan

> **Status:** In progress — Phase A (M0–M13.5) complete; Phase B (M14) complete; M14.5 residuals complete (PRs #147–#158 + #162–#164); Phase C underway — M15 Trading CLOSED (m15a–m15c, ADR-0106–0108, PRs #165/#168/#170); M16 PvP CLOSED (m16a–m16c, ADR-0109–0111, PRs #172/#176/#178); M-infra-d ADR digest merged (#159/#161); M16.5 ninth-review residuals CLOSED (a–g, ADR-0112–0117, PRs #180–#193). M17 ranked ladder CLOSED (m17a #196 / m17b #199 / m17c #198, ADR-0119–0121); M17.5 tenth-review residuals CLOSED (ADR-0124–0127). **2026-07-17 playtest-first replan underway** (`playtest-replan-2026-07.md`): M-playtest-a (client build hygiene + local ops, ADR-0128/0129) & M-playtest-b (observability, ADR-0130/0131) CLOSED; M-playtest-c UX completion CLOSED (rename/trade-propose/help, ADR-0132–0135, PR #230); **M-playtest-c.5 pre-gate residuals 6/7 merged** — ptc5a #232 (0136) · ptc5d #234 (0137) · ptc5b #236 (0138) · ptc5c #237 (0139) · ptc5e #238 (0140) · ptc5g #239 (0141) — with **ptc5f (this slice, ADR-0142, ledger reconciliation) closing it out**. **M-playtest-d content pack CLOSED** (pt-d1 #241/ADR-0143, pt-d2 #242/ADR-0144, pt-d3 #244/ADR-0145) — all pre-gate milestones (M-playtest-a/b/c/c.5/d) CLOSED 2026-07-25. **⛩ PLAYTEST GATE RUN 2026-07-25** (Drew's closed solo session; verdict + root-caused findings in `playtest-gate-decision-2026-07-25.md`): CONDITIONAL PASS — core loop engaged despite friction; two concrete input/movement bugs found and two hardening milestones spawned (`M-postgate-netcode-hardening`, `M-postgate-ux-hardening`), reordered to the FRONT of the post-gate queue, `blocked:playtest-gate` LIFTED for those two only. M18+ and the rest of Phase D remain post-gate provisional pending a second, cleaner playtest read (see the Phase D post-gate block).
> **Relationship to v1:** This is a *new, from-scratch* project — the spiritual sequel to
> `projects/pokemon-mmo` (published db `monster-tamer-mmo`). It is **not** that project and does
> **not** modify it. Working repo name: **`monster-realm`** (rename freely; must stay kebab-case for
> the generator). Published db name proposal: `monster-realm`.
> **Harness rule:** where v1 conflicts with `standards/`, the standard wins. This plan resolves every
> such conflict in favor of the harness standard and records the call.

This is the durable plan. The stack-defining forks are deliberately left **open** and captured as
**Proposed ADRs** in [`adr/`](adr/) — per `AGENTS.md` golden rule #4, design forks are explored with
`/debate` and the options become each ADR's "Considered alternatives". Nothing here locks an
architecture until the corresponding ADR is accepted.

---

## 0. TL;DR

Rebuild the server-authoritative monster-taming MMO with the same proven *spine* (pure deterministic
Rust rule-core; authoritative server; integer-tile movement with client prediction; data-driven
content) but fix the four things v1 deferred and the engineering gaps relative to current harness
standards:

1. **Spec-first, not milestone-first.** Every slice starts from a Spec Kit spec with EARS acceptance
   criteria (`standards/spec-driven.md`), not a freeform `ARCHITECTURE.md` narrative.
2. **A real eval harness + complete CI** (`standards/evals.md`, `standards/ci-cd.md`) that closes v1's
   named blind spots: bindings-drift, e2e-in-CI, security/desync gates, mutation + coverage thresholds.
3. **Schema evolution & content-sync designed in from day one** — v1's single biggest deferred risk
   ("`--delete-data` is the only reset").
4. **Spatial/zoned subscriptions + per-zone tick scheduling baked into the schema** so concurrency is a
   query change, never a migration.

Plus an **expanded game design** (multi-zone authored world, NPCs/quests/dialogue, economy, deeper
battle systems, social/guild layer) sequenced as additive milestones on top of the re-engineered spine.

---

## 1. What v1 got right — carry forward unchanged

These are load-bearing and **not** up for "simplification". They are the reason v1 never desynced.

- **Functional core / imperative shell with server authority.** One pure `game-core` crate; the
  server, the wasm boundary, and the frontend are the effectful shell.
- **"Every game rule lives once in `game-core`."** Server runs it for truth; client runs the *same
  compiled code* (wasm) for prediction. Re-implementing a rule in TS/reducer is the desync bug.
- **Integer-tile authority + deterministic core.** Position is integer tiles (client/server cannot
  numerically diverge); sub-tile motion is pure client visual interp. `(state,input,time,seed) ⇒ same
  output`, enforced mechanically by `clippy.toml` (bans wall-clock + unseeded RNG).
- **Prediction only where it pays.** Movement predicts + reconciles; battles are turn-based and
  server-resolved with *no* prediction (animation hides the round-trip → no rollback netcode).
- **Data-driven content.** Monsters/skills/type-chart/encounters/items are RON data parsed by a pure
  loader, seeded into read-only tables; clients read content from their subscription (never duplicated
  in TS). `validate_content` holds content integrity as testable invariants.
- **Reducers stay thin.** Validate `ctx.sender` ownership + legality → delegate the rule to
  `game-core` → write tables. Reject with `Err`, never silently clamp.
- **Tiered, documented principles.** Postel inverted at the hostile-client boundary; OCP rejected for
  exhaustive `match`; SSOT/determinism non-negotiable. v2 keeps this curation discipline.

## 2. v1 lessons & gaps — what v2 fixes

Sourced from `pokemon-mmo/ARCHITECTURE.md` (M11 entry-conditions + Scaling path) and
`docs/known-issues.md`, then cross-checked against `standards/`.

| # | v1 gap / lesson | Standard implicated | v2 resolution |
|---|---|---|---|
| G1 | No schema-migration story; content seeded only in `init`; `--delete-data` is the only reset. | principles (SSOT, mechanical enforcement) | **ADR-0006**: additive-schema discipline + an idempotent `sync_content` reducer (upsert by stable id) separate from `init`; re-derive affected rows after a content change. Designed in M0. |
| G2 | Subscriptions + movement tick are O(all rows); fan-out is global. | domain/game; observability | **ADR-0007**: `zone_id`/`map_id` indexed from the first table; per-zone subscriptions + per-zone tick scheduling are the *default*, not a deferred optimization. |
| G3 | CI blind spots: e2e local-only, no bindings-drift check, `reducer-security-auditor`/`desync-guard` not in CI; stale `spacetime generate` ships green. | ci-cd; evals; testing-tdd | **ADR-0009**: bindings-drift gate, e2e in CI (containerized `spacetime`), security + desync promoted to **evals** that gate merge; mutation + coverage thresholds enforced. |
| G4 | Design captured as a prose `ARCHITECTURE.md` milestone narrative, not specs. | spec-driven | Spec Kit `docs/specs/` with EARS criteria; `ARCHITECTURE.md` becomes the durable *design record* only, generated decisions link to ADRs. |
| G5 | Map is a `const` grid (`poc_map()`); no real authoring or multi-map collision. | domain/game (data-driven content) | **ADR-0008**: Tiled-authored multi-zone maps → RON, data-driven collision/warps/encounter-zones. Enables the expanded world. |
| G6 | PvP gaps: no turn-timeout reaper; disconnect-voids-loss exploit; tie-break is a documented first-cut. | domain/game (netcode tests) | Turn-deadline scheduled reducer + forfeit-on-disconnect specced as M-multiplayer acceptance criteria with simulated-latency/loss netcode tests. |
| G7 | `heal_party` free untimed heal; `Scene` has no teardown; linear `level_for_xp` scan. | YAGNI w/ named exceptions | Carried as *named* deferrals (not silent) in the v2 plan; healing becomes a content location (cost/cooldown) once towns exist. |
| G8 | Bespoke repo predates the `spacetimedb-game` template + the `just` command surface. | AGENTS.md (standard commands) | Generate from `templates/spacetimedb-game` via `just new`; wire the full `just` verb set (`setup/test/lint/typecheck/eval/security/ci/mutate`). |
| G9 | Recurring "contract left to discipline" bug class (caught late in v1's hardening review). | principles (mechanical enforcement) | Each known shape (action-rejection surfacing, content-as-keyed-Maps, item-stack helpers, classify-by-data, content invariants in `validate_content`) becomes a **template/eval from M0**, not a post-hoc fix. |

## 3. Open technical evaluations (decide via `/debate` → ADR before locking)

You chose **open re-evaluation of everything**. These are the forks. Each has a Proposed ADR stub; my
recommendation is stated but the alternatives are real and must be argued in the ADR before acceptance.

| ADR | Decision | Recommendation (rebuttable) | Live alternatives to argue |
|---|---|---|---|
| 0002 | **Server platform & netcode** | Keep **SpacetimeDB 2.x** — relational subscriptions + reducers were v1's strongest fit; the cost is migration tooling (G1). | Authoritative Rust server (Axum/Tokio + Postgres + custom sync); Colyseus/Nakama; Hytopia/other. |
| 0003 | **Shared rule layer & prediction** | Keep **pure Rust `game-core` → wasm** for client prediction (the anti-desync spine). | Server-only (no client prediction, lean on interpolation); TS rule reimpl (rejected — desync). |
| 0004 | **Client rendering stack** | Re-evaluate but lean **PixiJS v8** (template + skills already in the harness). | Phaser; a Rust/`bevy`→wasm client (one language end-to-end); custom WebGL/WebGPU. |
| 0005 | **Repo shape** | **Single cohesive repo**, cargo workspace + crate boundaries (your choice). | Two/three repos (rejected: weakens the SSOT marshaling boundary). |
| 0006 | **Schema evolution & content-sync** | Additive schema + idempotent `sync_content` reducer + re-derive pass. | Versioned-migration reducer chain; export/import snapshots. |
| 0007 | **Spatial/zoned subscriptions** | Per-zone subscriptions + per-zone tick from day one; `zone_id` indexed. | Global subscription until measured (v1's choice — rejected for v2). |
| 0008 | **Map/content authoring** | Tiled → RON pipeline, data-driven multi-zone. | Hand-authored RON; in-engine editor; const grids (rejected). |
| 0009 | **CI completeness & gates** | Full pipeline incl. containerized e2e + bindings-drift + security/desync evals. | Keep e2e local-only (rejected — that was a v1 blind spot). |
| 0010 | **Falsifiable gates (proof-of-teeth)** | Every mechanical gate ships a known-bad fixture it must reject. | Trust the gates / mutation-only (rejected — can't prove a gate bites). |
| 0011 | **Server-paced zoned movement** | Bounded move-queue + scheduled per-zone tick draining one move/tick via `apply_move`. | Per-move cooldown; external cron; global tick; client-authoritative (all rejected). |
| 0012 | **Client prediction & reconciliation** | 4-step predict/reconcile vs auth state + server queue; rebase time, never sync clocks; divergence-return. | Reconcile-position-only; clock-sync; no prediction; TS reimpl (all rejected). |
| 0013 | **Netcode smoothness** | Remote interpolation delay buffer; decoupled own slide clock; atomic reconcile snapshot; bounded prediction + snap-on-gap; smoothness evals. | v1's slide-on-update/no-buffer/server-time animation (rejected — the feel bug). |
| 0014 | **Client app architecture** | Read-only store + one-way flow + DOM-overlay menus + Pixi canvas + enum routing; no UI framework in the loop. | React/Vue whole-app; Phaser/Kaboom; two-way binding (all rejected for the loop). |

**Resolution status (updated through the netcode-quality review):** ADRs **0002, 0003, 0004** decided by
`/debate` and ratified; **0005, 0006, 0007, 0009, 0010** accepted as load-bearing for M0; **0011** for M2;
**0012, 0013** for M3/M4; **0014** for M4; **0015/0016** for M6, **0017** for M7, **0018** for M9,
**0019** for M10 (Phase A); **0008**+**0020** for M11, **0021** for M12, **0022** for M13, **0023** for M14
(Phase B); **0024** for M15, **0025** for M16, **0026** for M17, **0027** for M18, **0028** for M19
(Phase C); **0029** (observability) for M20, **0030** (auth) for M21, **0031** (privacy) for M22, **0032**
(a11y) for M23, **0033** (i18n) for M24, **0034** (security audit) for M25 (Phase D). **All 34 ADRs accepted;
the v2 roadmap (M0–M25) is fully specced.** Companion SSOTs: the **ADR registry**
([`adr/README.md`](adr/README.md)), `netcode-quality-review.md`, `observability-performance-plan.md`,
`security-threat-model.md`, the holistic `spec-corpus-review.md` (final-pass consistency + gaps), and
**`game-design.md`** (the design SSOT — what the game *is* + content/economy/balance + art direction + the
MVP & fun-test), and **`validation-checklist.md`** (the verify-first technical-assumptions register).

## 4. Proposed architecture (assuming the recommended ADR outcomes)

Single repo, cargo workspace + a frontend workspace. Crate boundaries refined from v1.

```
monster-realm/
├─ AGENTS.md                 # lean lookup table; declares principle tiers/inversions + project verbs
├─ ARCHITECTURE.md           # durable design record (links ADRs; NOT a milestone narrative)
├─ justfile                  # setup/test/lint/typecheck/eval/security/ci/mutate (standard verbs)
├─ Cargo.toml                # workspace: game-core, client-wasm, server-module, (sim-harness)
├─ clippy.toml               # disallowed-methods: bans wall-clock + unseeded RNG (determinism gate)
├─ docs/
│  ├─ specs/                 # Spec Kit specs (EARS acceptance criteria) — source of truth
│  ├─ adr/                   # accepted ADRs (these stubs move here on scaffold)
│  └─ data-model.md, netcode.md, content.md   # generated/curated reference
├─ game-core/                # PURE deterministic Rust — the one rule layer
│  ├─ content/               # RON registries (species, skills, type-chart, items, fusions, encounters)
│  ├─ src/{world,monster,combat,taming,raising,evolution,economy,quest}/  # rule modules, grow-not-speculate
│  └─ src/types.rs           # shared value types; derive SpacetimeType only under `spacetimedb` feature
├─ client-wasm/              # thin wasm-bindgen exports wrapping game-core for client PREDICTION
├─ server-module/            # SpacetimeDB module: tables + reducers (thin; delegate to game-core)
├─ sim-harness/              # NEW: headless multi-client netcode simulator (latency/loss, replay) — see §7
├─ frontend/                 # PixiJS v8 + TS: render, input, net glue, prediction/reconciliation
│  ├─ src/{render,input,net,prediction,ui,convert}/
│  ├─ src/module_bindings/   # generated by `spacetime generate` (committed; drift-checked in CI)
│  └─ e2e/                   # Playwright multi-window (now a REQUIRED CI gate)
└─ evals/                    # architecture + contract + determinism + security + netcode evals
```

**Refinements over v1's layout:**
- A dedicated **`sim-harness`** crate (headless, deterministic, multi-client) makes netcode/determinism
  testable in CI without a browser — directly serving `standards/domain/game.md` ("netcode tests with
  simulated latency/loss; snapshot/replay determinism tests").
- `game-core` modules named per *system* and grown per milestone (`grow-the-schema, don't speculate`),
  with `economy/` and `quest/` reserved as **named YAGNI exceptions** for the expanded scope.
- `module_bindings` drift is a CI gate, not a manual discipline.

## 5. Schema, migration & content (the v1 risk, fixed)

Designed from M0, not bolted on:

- **Additive-only schema discipline** — never change a PK/type on an existing table; new systems add
  new tables. Enforced by an eval that snapshots the schema and flags non-additive diffs.
- **`sync_content` reducer** distinct from `init`: idempotent upsert-by-stable-id over the RON
  registries, callable on republish, followed by a **re-derive pass** for affected `monster` rows.
  Species ids are **append-only** (never reused/renumbered) — an eval enforces it.
- **Migration story before any real launch** is a first-class ADR (0006), not a footnote — once real
  users exist, `--delete-data` is gone.

## 6. Scalability designed-in (not deferred)

- Every world table carries an indexed **`zone_id`** (and `map_id`) from row one.
- **Per-zone subscriptions** (client subscribes to its zone + neighbors, SQL-filtered) replace v1's
  `SELECT *` fan-out.
- **Per-zone scheduled ticks** replace the single global `movement_tick`.
- This is the v1 "Scaling path" promoted to the *default* design; the named hot paths (subscription
  fan-out, scheduled tick, per-frame Pixi render) remain the only places to optimize, and only with a
  measurement (`standards/observability.md`).

## 7. Testing, evals & CI — closing every v1 blind spot

Per `standards/testing-tdd.md`, `standards/evals.md`, `standards/ci-cd.md`:

- **`game-core` is the test center of gravity** — unit + **property tests** (`proptest`) per rule;
  **mutation tests** (`cargo-mutants`) enforce a minimum score on changed lines.
- **Determinism + prediction-parity evals** — the client wasm path == the server path, snapshot/replay
  reproducibility. Run headless in `sim-harness`, gated in CI.
- **Netcode evals** — `sim-harness` injects latency/loss/reorder and asserts convergence (no desync,
  forfeit-on-disconnect, turn-deadline).
- **Security evals** — the v1 `reducer-security-auditor`/`desync-guard` checks become *evals that gate
  merge*, plus gitleaks + Semgrep + SCA + SBOM (`standards/security.md`).
- **Bindings-drift gate** — CI regenerates bindings and fails if the committed output differs.
- **e2e in CI** — Playwright multi-window against a **containerized `spacetime`** instance is a
  required pre-merge gate (v1 ran it local-only).
- **Test ownership** — the implementing agent does not author the gating tests; the `tester` writes
  from EARS criteria, the `verifier` runs them (anti reward-hacking).

## 8. Tooling, workflow & cost routing

- **Generate** from `templates/spacetimedb-game` via `just new monster-realm spacetimedb-game`, then
  extend with the `game-core`/`client-wasm`/`frontend` crates and the PixiJS skills already vendored in
  `templates/pixijs-game/.claude/skills/`.
- **Build loop:** PRERRR via `/loop` from a spec task — Plan → Refine → Execute → Review → Refactor →
  Repeat, specialists in isolated worktrees, verifier-gated merges (`docs/workflow-loops.md`).
- **Decisions:** `/adr` for any new dependency/pattern; `/debate` for the open forks (§3);
  `/brainstorm` for design; `/simplify` + `/review` on every task's definition-of-done.
- **Routing** (`docs/routing.md`): default Sonnet/medium; **Opus/max** for the architecture ADRs,
  cross-boundary refactors, and netcode debugging; Haiku for tests/docs/changelog. Doc lookups stay
  narrow + lazy (prefer the vendored PixiJS skills + SpacetimeDB `llms.txt` over metered services).
- **Self-management commands wired** so "done" = `just ci` green **and meaningful**.

## 9. Expanded game design (sequenced as additive milestones)

Beyond a faithful re-engineer, v2 grows the game. Each is a vertical slice with its own spec; none
breaks the spine. Numbering restarts for the new project.

> **Build order & gates (read with `game-design.md` + `validation-checklist.md`).** The milestones are
> listed in dependency order, but the *build* is **gate-driven, not a straight march**: (1) run the **Tier-1
> validation spike** (`validation-checklist.md`) before committing to the order — it de-risks the
> SpacetimeDB-capability assumptions; (2) build to the **MVP = Phase A (M0–M10) + the lean §5/GDD content**,
> then **stop at the playtest gate** (`game-design.md` §4) — is the core loop *fun*? (3) **Phases B–D are
> provisional** until that gate passes and may change from playtest learnings; (4) **launch is gated on the
> M25 security sign-off**. Treat "all 26 specced" as *the plan*, and "MVP → playtest → decide" as *the path*.
> **Fidelity note:** to avoid over-speccing, **Phase C/D (M15–M25) are intentionally *design sketches*** —
> decision (ADR) + scope + boundary, with full EARS criteria + tasks drafted by the loop at build time;
> **Phase A/B (M0–M14) carry full detail** (the near-term path). See `spec-corpus-review.md` §7.

> **Build parallelism & slice independence (for the autonomous runner).** The build is gate-driven
> and the **spine (M0–M10) is largely a serial dependency chain** — each milestone consumes the prior
> one's delivered code. The runner's throughput comes from (1) **chaining** slices back-to-back with no
> idle gap and (2) **bounded fan-out (N ≤ 2)** onto *genuinely independent* slices. When a milestone is
> decomposed into slices, **each slice declares a `touches:` path-set** (the crates/files it may modify);
> the supervisor runs two slices concurrently **only when their `touches:` sets are disjoint**, and merges
> them **serially (verifier-gated, the second rebased on the first)**. Natural independence lives at the
> **leaves, not the spine**: client/render vs server/reducer slices within a milestone, pure **content-data**
> additions, and the cross-cutting **M20 (observability) · M23 (accessibility) · M24 (i18n)** retrofits. A
> slice with **no** `touches:` declaration is treated as colliding → run serially. This is the §7
> worktree-isolation pattern (`WORKSPACE-PLAN.md` §7; `docs/routing.md`: N = 2–3, depth = 1, serial gated
> merges) applied to the build — quality is unchanged; only the idle between slices is removed. **Note (post-M8.9):**
> until M8.9, *all* server gameplay lives in one `server-module/src/lib.rs`, so every server-reducer slice
> collides on that file and is forced serial; **M8.9 splits it into domain modules** (battle/taming/movement/…)
> so server-reducer slices touching different domains become `touches:`-disjoint and parallelizable — widening
> leaf independence on the server side, not only the client side.

**Phase A — Spine (re-engineered v1, better):**
- **M0** Contracts, generator scaffold, determinism gate, **schema-evolution + content-sync from day
  one**, full CI incl. sim-harness skeleton. Split into **M0a** (substrate + gates + proof-of-teeth, no
  gameplay) → **M0b** (the `presence` walking-skeleton vertical + e2e). See `M0-foundation.spec.md`.
- **M1** `game-core` movement (test-first) + determinism/parity evals. See `M1-movement-core.spec.md`.
- **M2** SpacetimeDB module + **zoned schema** (zone_id indexed) + per-zone tick. See `M2-server-module.spec.md`.
- **M3** `client-wasm` prediction (the consumable wasm API + `convert` + the Predictor; see
  `M3-client-prediction.spec.md`); **M4** PixiJS frontend + debug HUD (see `M4-frontend.spec.md`;
  read-only store + one-way flow, ADR-0014) — builds in the ADR-0013 netcode **smoothness** layer from the
  start (remote interpolation delay buffer + decoupled own-character slide clock), the chief fixes for v1's
  stutter/rubberband; **M5** multi-window integration (in-CI e2e + the smoothness evals; see `M5-integration-e2e.spec.md`).
- **M6** Monsters & individuality (`M6-monsters-individuality.spec.md`; ADR-0015/0016); **M7** turn-based
  battles (`M7-battles.spec.md`; ADR-0017 PvP-ready battle model); **M8** grass encounters + recruit-by-
  weaken (`M8-encounters-recruit.spec.md`); **M8.5** hardening & remediation (`M8.5-hardening-remediation.spec.md`; inserted between M8 and M9 — resolves the 2026-06-27 multi-lens review findings: `start_battle` authz/privacy, rule-core contracts, proof-of-teeth gate teeth, CI/toolchain hygiene, doc accuracy; no new game-design surface, like the `M-infra-a` slice); **M8.6** residual hardening (`M8.6-residual-hardening.spec.md`; the verified 2026-06-27 review residuals M8.5 did not cover — pure-core swap legality (illegal-states-unrepresentable), the unwired M4c render-smoothness layer, predictor flow-control + minor robustness; lands after M8.5; no new game-design surface); **M8.7** third-review residual hardening (`M8.7-third-review-residuals.spec.md`; the verified 2026-06-27 *third*-review residuals neither M8.5 nor M8.6 covers — found on the M8b/M8c/M8d delta both prior reviews predated, plus two load-bearing CI gates: generalize the single-table schema-snapshot gate to every table (ADR-0006), broaden the zoned-schema gate to non-tile per-zone tables (ADR-0007), `#[cfg]`-gate the dev reducers `start_wild_battle`/`grant_bait` out of release builds (+ derive-zone-from-character; proposed ADR-0051), make the `inventory` single-stack invariant structural + correct its false "RLS by owner_identity" doc, render battle outcomes, de-tautologize the IV-inversion red-team test; lands after M8.6; no new game-design surface); **M8.8** fourth-review residual hardening (`M8.8-fourth-review-residuals.spec.md`; the verified 2026-06-27 *fourth*-review residuals none of M8.5/M8.6/M8.7 cover — release fail-loud (`[profile.release] overflow-checks`) + determinism-gate completeness (ban `OsRng`/`getrandom`/`rand::rng`/`chrono::now`, all in the lockfile graph; proposed ADR-0054), recruit-path turn-limit terminal owned once in game-core (SSOT — `attempt_recruit` advances `turn_number` out-of-band), sim-harness *real* convergence teeth (the loss/reorder `Link` is never fed to `ServerWorld`), client reconnect-seq re-seed + reconcile-divergence re-issue, content `skill.accuracy` validation; lands after M8.7; no new game-design surface); **M8.9** structural modularization for fan-out — server-module + content (`M8.9-server-module-modularization.spec.md`; two disjoint workstreams that fan out against each other. **(A)** pure behavior-preserving reorg — splits the ~2081-line flat `server-module/src/lib.rs` (15 tables, 18 reducers, 27 helpers) into cohesive domain modules (schema/guards/marshal/content/movement/monster_mgmt/battle/taming) + `require_owner` consolidation + inline-test extraction, so server-side slices declare domain-scoped `touches:` and fan out per §9 instead of serializing on one file; proven by byte-identical bindings + unchanged schema-snapshot; `docs/adr/0055` (harness adr/0055 = server-module boundary). **(B)** content as glob-loaded directories (`docs/adr/0057`) — a `build.rs` embeds `content/<registry>/*.ron` so content additions (M9/M10/M11+) become disjoint files, proven by content-parity (no schema/bindings change), running in parallel with (A); lands after M8.8; no schema/behavior/game-design change); **M8.95** agent knowledge bundle (`M8.95-knowledge-bundle.spec.md`; OKF-aligned generated schema/reducer projection for agents — adopts the *curated* OKF subset per harness **ADR-0008** + `standards/knowledge-format.md`; generated from the post-M8.9 `schema.rs` and **drift-gated like bindings** so it stays SSOT-safe; corpus **`docs/adr/0057`**; lands after M8.9; pure additive tooling — no schema/rule/game-design change); **M9** raising (train/care) (`M9-raising.spec.md`; ADR-0018 inventory model); **M10** evolution & fusion (`M10-evolution-fusion.spec.md`; ADR-0019). **Phase A complete.**

**Phase B — Expanded world (new):**
- **M11 Authored multi-zone world** — Tiled → RON pipeline (ADR-0008 accepted; ADR-0020 zone transitions):
  multiple maps, warps, doors, data-driven collision + encounter zones; **per-zone subscriptions/tick**
  become user-visible; follow-camera; real schema migration. See `M11-authored-world.spec.md`.
- **M12 NPCs, dialogue & quests** (`M12-npcs-dialogue-quests.spec.md`; ADR-0021; closes the `npc_decide`
  deferral; resolves `heal_party` via town healing) — data-driven dialogue trees + a quest/flag system in `game-core`
  (`quest/`); towns with **healing locations** (resolves the `heal_party` placeholder with cost/
  cooldown content).
- **M12.5 Sixth-review residuals** (`M12.5-sixth-review-residuals.spec.md`; inserted between M12 and M13 while M12a was in flight — resolves the verified 2026-07-02 sixth-review findings on the M10b–M11c delta: the Critical `fuse` monster_pub dual-write bug, the dead `sync_content`/re-derive content-update path (G1/ADR-0006), client reconnect/warp zone-sync robustness, ADR-0013 smoothness residuals, terminal-battle GC, sim-harness warp coverage + schema-snapshot depth, and a doc-reconciliation pass; extends M10.5 (delivered PRs #107–#110); no new game-design surface).
- **M13 Economy & inventory** (`M13-economy.spec.md`; ADR-0022) — shops, a single owner-private currency,
  and content-priced server-mediated buy/sell on the M9 inventory backbone (ADR-0018); M15 player-trade adds
  only a dual-consent escrow on top.
- **M13.5 Seventh-review residuals** (`M13.5-seventh-review-residuals.spec.md`; inserted between M13 and M14 while m13a was in flight — resolves the verified 2026-07-04 seventh-review findings @ `15bd08b`: gate-of-gates CI/nightly wiring guards + coverage-ratchet re-tighten, the silent phantom-intent desync + reducer-rejection UX surfacing + reconnect confirmation, content-lifecycle completion (NPC upsert, zone removal, write-back clamp), hot-path content-parse caching, battle-overlay/zone-failure/render UX fixes, GrantItem/quest-wildcard/coded-decode/party-slot type-rigor hardening, a docs/ledger reconciliation pass (incl. the harness↔project ADR 0055–0057 numbering-collision rule fix), and the named recruit-e2e revival slice 12.5f-5 demanded; no new game-design surface).
- **M14 Deeper battle systems** (`M14-deeper-battle.spec.md`; ADR-0023) — status effects, abilities, weather
  as **additive** layers on the symmetric `resolve_turn` (M7 untouched; PvP/raids inherit it); multi-active
  deferred to the Phase B checkpoint. **Phase B complete.**

**Phase C — Social & multiplayer depth (re-engineered + extended):**
- **M14.5 Eighth-review residuals** (`M14.5-eighth-review-residuals.spec.md`; inserted between M14 and M15 while the Phase C deflake-recruit-r2 slice was in flight — resolves the verified 2026-07-11 eighth-review findings @ `3eeb484`: the swap/recruit paths that bypass the entire post-turn status/weather tick pipeline (closes R1/R3/RT-W14-DESYNC-01 + the recruit turn-freeze), the Phase-4.5 status-misdirection-onto-switched-in-monster bug, end-to-end wiring of the structurally-inert M14c passive-ability system, client battle-UX completion (use_battle_item is player-unreachable; weather is dropped before the store), ADR-0089 cache completion for skills/items, a BSATN-level additive-schema proof + randomized/warp-under-loss convergence coverage, and a ledger-reconciliation pass (ADR 0055–0057 collision-note correction, CHANGELOG M14 backfill); no new game-design surface).
- **M-infra-d ADR digest** (`M-infra-d-adr-digest.spec.md`; insertable any time after M14.5, before or alongside early Phase C — generated, drift-gated `docs/adr/DIGEST.md` as the agent entry point to the 104-ADR corpus: canonical header block (Status/Supersedes/Amends/Subsystems/Decision) backfilled across `docs/adr/`, controlled subsystem vocabulary, frozen `design-corpus.json` snapshot of harness ADRs 0002–0034 under an `H-` namespace encoding the 0055–0057 collision as data, `just adr-digest` + CI drift gate with fixture-corpus proof-of-teeth; `docs/adr/README.md` stays supervisor-owned; no renumbering, no behavior change, pure docs/tooling like M-infra-a/M8.95).
- **M15 Trading** (escrowed dual-consent; `M15-trading.spec.md`; ADR-0024) · **M16 PvP** (`M16-pvp.spec.md`; ADR-0025;
  shared battle row, both-submit secret picks, **turn-deadline + forfeit-on-disconnect** up front) ·
  **M17 Ranked ladder** (persistent Elo profile; `M17-ranked-ladder.spec.md`; ADR-0026) ·
  **M18 Co-op raids** (`M18-coop-raids.spec.md`; ADR-0027) · **M19 Guilds/chat/social** (`M19-social.spec.md`;
  ADR-0028). **M18/M19 are demoted to post-gate provisional** by the 2026-07-17 playtest replan — GDD §9:
  social depth follows demand; do not build them before the gate (`blocked:playtest-gate`).
- **M16.5 Ninth-review residuals** (`M16.5-ninth-review-residuals.spec.md`; inserted between M16 and M17 while m16a was in flight — resolves the verified 2026-07-14 ninth-review findings @ `3424c5c`: the one-directional battle↔trade interlock (trade-away-mid-battle → permanent zombie Ongoing battle + bricked battler, incl. PvP-row coverage) plus real teeth for the write_back_party_hp owner-change abort (the revived anchor test is a zero-assertion body), reject-not-destroy conservation at receiver item/currency caps, trade runtime-coverage completion (full-flow e2e hook or honest spec amendment; attempt_recruit added to the escrow-guards eval), symmetric trade-overlay mutual exclusivity (KeyQ/KeyH/KeyG) + exhaustive client status typing, eval-infra hardening (spacetime-type append-only gate, extraction robustness, additive-column smoke coupling), trade SSOT/privacy-doc polish + stale-offer TTL decision, and a ledger reconciliation pass (ADR README/ARCHITECTURE/CHANGELOG/PLAN + spec checkboxes); no new game-design surface).

- **M17.5 Tenth-review residuals** (`M17.5-tenth-review-residuals.spec.md`; scheduled by the 2026-07-17
  playtest replan; slices 17.5a–g — the HIGH side-B ongoing-battle guard unification (closes the PvP
  damage-laundering exploit) + trade same-item near-cap conservation, shop reject-not-destroy, leaderboard
  name drift, challenge TTL/anti-spam, PvP runtime coverage + SDK-boundary enum safety, ledger
  reconciliation; §3 decisions resolved per `playtest-replan-2026-07.md` §3; no new game-design surface).

**Pre-gate playtest block (2026-07-17 replan — `playtest-replan-2026-07.md`; build in order a→b→c→d,
fan-out per each spec's pairing notes):**
- **M-playtest-a Local playtest build & ops** (`M-playtest-a-deployment.spec.md`; **rescoped 2026-07-17
  per Drew: local-only, solo tester**) — `just playtest-up`: release module (`dev_reducers`-absent proof)
  on the local instance as `monster-realm-playtest` + production client build + DEV-gated hooks + version
  stamp + wipe/republish ops runbook. Hosted deployment = explicit DEFERRED exception (M-playtest-a2 when
  external testers join). Lands only after 17.5a/b.
- **M-playtest-b Playtest observability & feedback loop** (`M-playtest-b-observability-feedback.spec.md`) —
  the **M20 pull-forward**: client error overlay + event ring + F9 bug-report bundle; additive
  `playtest_event` table + `just playtest-report` producing the H1/H2/H3 proxy report (GDD §4). M20 keeps
  the production capstone.
- **M-playtest-c Playtest UX completion & tester onboarding** (`M-playtest-c-ux-completion.spec.md`) —
  trade **propose UI** (H3 is untestable without it; resolves D-17.5-D), `set_profile_name` (D-17.5-C,
  subsumes m17b-2), in-client help overlay, `docs/PLAYTEST.md`.
- **M-playtest-c.5 Pre-gate review residuals** (`M-playtest-c.5-pregate-review-residuals.spec.md`;
  inserted between M-playtest-c and M-playtest-d by the 2026-07-20 weekly review @ `0421f2c` while pt-c2
  was in flight — resolves the verified eleventh-review findings, no new game-design surface): ptc5a
  care/train both-role ongoing-battle guard (closes the mid-battle HP-laundering path ADR-0122 §D7
  wrongly claims impossible) · ptc5b wild-battle disconnect resolution + `battle_wild` GC (fixes the
  returning-player soft-lock + row leak) · ptc5c overlay mutual-exclusion symmetry (KeyB/I/E) + registry ·
  ptc5d OKF knowledge-bundle `*_tests.rs` exclusion + two degraded test teeth (RT-M14.5A-02, mutate-server
  cap) · ptc5e SSOT/content/dedup polish · ptc5f ledger reconciliation. §3 lists five decisions for Drew
  (ADR-0090 burst-spread, overlay registry, care-cooldown-as-content, coverage exclusions, warp predictor
  epoch). Land after M-playtest-c closes or opportunistically for disjoint slices. **All five §3 decisions RESOLVED 2026-07-20 (Drew-delegated): A/B/C in-slice; D→post-gate `M-postgate-client-coverage`; E→defer + ADR-0085 amend/pin (fix→post-gate `M-postgate-netcode-hardening`). Plus the M10.5 render-snap fix scheduled pre-gate as new slice ptc5g.**
- **M-playtest-d Playtest content pack** (`M-playtest-d-content-pack.spec.md`) — roster 6→~16 forms +
  distinct-silhouette sprites + encounter/recruit/economy tuning to GDD §5 MVP scope; pure content/data
  on ADR-0057, fan-out friendly.
- **⛩ PLAYTEST GATE** (GDD §4/§9) — **RUN 2026-07-25.** Drew's closed solo playtest + `just playtest-report`
  H1/H2 proxies analyzed in `playtest-gate-decision-2026-07-25.md`: **CONDITIONAL PASS** (core loop engaged
  despite friction; H1 signal directionally positive at n=7 events — not yet statistically powered). Two
  concrete input/movement bugs were root-caused against live code and spawned two new pre-post-gate
  milestones (below), reordered to the front of Phase D. Fusion-vs-evolution (Drew's proposed alternative
  design) is PARKED pending a `/debate`/`/consult` pass, not decided by the gate doc. Re-run the playtest +
  `just playtest-report` after the two hardening milestones land, before committing to any further Phase D
  work — the friction found was loud enough to be a confound on the H1-H3 read.

**Phase D — Production readiness (`blocked:playtest-gate` LIFTED for the two hardening milestones only; the
rest stays post-gate provisional pending a cleaner second playtest read):**

- **M-postgate-netcode-hardening** (`M-postgate-netcode-hardening.spec.md`) — **CLOSED 2026-07-31** (11r-d
  ledger reconciliation): all four slices merged — nh1 #247/ADR-0146, nh2 #250/ADR-0148, nh4 #252/ADR-0150,
  nh3 #254/ADR-0152. Historical scope below.
  Promoted from a PLAN bullet to a full spec 2026-07-25. Three newly-found HIGH slices from the 2026-07-25
  playtest: nh1 movement-suppression missing `preventDefault()` (arrow keys get hijacked by browser scroll
  once any overlay is left open — root cause of Drew's reported "controls stopped working"), nh2 released
  movement keys don't cancel already-queued steps (root cause of the "slippery"/overshoot/stutter
  complaints, `MOVE_QUEUE_CAP=2` steps always drain after release regardless of intent), nh4 the client
  never persists a reconnect token — server telemetry (`spacetime logs`) showed the session actually
  spanned 6 separate anonymous identities, each reload (likely triggered by the nh1 freeze) silently
  resetting all progress to a fresh starter, also undercounting the H2 recatch proxy. Plus the
  pre-existing nh3, same code region: the warp-path `Predictor` epoch/generation guard so a stale
  cross-warp rejection's `.catch` no-ops on a rebuilt predictor (M-playtest-c.5 Decision E,
  Drew-delegated 2026-07-20; ADR-0085 amended pre-gate in ptc5f/ADR-0142 to accept the risk for the closed
  playtest + pin the reachability bound). ptc5f's red-team pass had already sharpened the reachability —
  reachable in _solo_ play by warping while holding a movement key — and recommended pulling it forward;
  the 2026-07-25 gate is that pull-forward.
- **M-postgate-ux-hardening** (`M-postgate-ux-hardening.spec.md`) — **MERGED 2026-07-31 with one named
  partial** (11r-d ledger reconciliation): ux1 #251/ADR-0151, ux2 #255/ADR-0154, ux3 #253/ADR-0153,
  ux4 #256/ADR-0155 all merged. **NOT fully closed:** ux2 delivered the SERVER half only — the client
  wallet wiring (ADR-0154 D7: `my_wallet` subscription, `rowConvert` converter, both `buildShopViewModel`
  call sites, two-identity e2e privacy tooth) is **ux2b**, now scheduled as slice **11r-e** of
  `M-postgate-eleventh-review-residuals`. Close this milestone when 11r-e merges. Historical scope below (new,
  spawned 2026-07-25). ux1 persistent on-screen hint for the existing (but undiscovered) `?` help overlay +
  battle-result continue hint; ux2 owner-scoped `player_wallet` view (mirrors the `player_conversation`
  ADR-0087 pattern) so the shop can show the player's own balance without weakening the privacy model; ux3
  `playtest-up`/`playtest-wipe` preflight check for a running SpacetimeDB instance (confirmed gap — first
  action Drew hit); ux4 repro-and-confirm step for a suspected box-vs-team discoverability gap around the
  battle swap UI (which already exists in code) before deciding whether anything there needs a code fix.
  Larger design questions from the same playtest (responsive viewport scaling, shop-via-NPC-interaction,
  full main-menu redesign) are deliberately NOT bundled in — recorded as deferred/owned in the gate
  decision doc §8, each needing its own sizing pass.
- **M-postgate-evolution-fusion-hardening** (`M-postgate-evolution-fusion-hardening.spec.md`) —
  **PARTIALLY RETIRED 2026-08-02** (ceremony outcome: `M-evolution-essence-graph.spec.md`, per ADR-0019
  Amendment 2026-08-02). Historical record for context: spawned 2026-07-25 via a 35-agent debate workflow;
  A0's field-carry fix was delivered (PR#248/ADR-0147) and subsequently **DELETED** by essence-graph
  migration EG1-9 (fusion removed entirely). Slices **A1** (fusion preview UI, never shipped) and **C**
  (lineage fields, never shipped) are **RETIRED** — EG4 replaces A1 with an always-on requirements-panel
  built entirely from public schema, and single-parent evolution makes C's lineage semantics inapplicable.
  **B2's content intent** (item-triggered evolution access) **SURVIVES, TRANSFORMED**: the discrete
  `Item(id)` trigger reducer (ADR-0149, now Superseded) is replaced by `consume_crystalized_essence()`
  (EG2-4), and its RON branches are re-authored as accumulating-essence-pool triggers (EG3-6/EG3-8); no
  separate B2 implementation needed.
- **M-evolution-essence-redesign** (`M-evolution-essence-redesign.spec.md` input skeleton → `M-evolution-essence-graph.spec.md` converged spec) — **CEREMONY COMPLETE 2026-08-02**. HEAVY redesign (r2 feedback 2026-07-26, ledger items 062-086): fusion removed; evolution becomes a directed essence-graph with five AND-combined gates (tier, level, essence-type/amount, Trust, Quality-Time); essence-train reducer + item consumption path; Bond retired; Trust Bayesian-smoothed; Nutrition re-labeled from EV totals; five sequential slices (EG1 schema → EG2/EG3/EG4 parallel → EG5 tail), full details in implementation-ready spec. **5 of 6 decisions CONFIRMED by Drew 2026-08-02** (Bond full-retirement, graph visibility, strict tier +1 per edge, full essence reset, Trust-tier granularity expanded 4→5); only the tier cap remains explicitly open (deliberately — its PROVISIONAL framing is confirmed accurate, not a blocker; `Species.tier <= 5` stands as the interim value). All six implemented at their stated default regardless, so the build is never blocked. Five design-panel highlights in ADR-0019 Amendment 2026-08-02 + M-evolution-essence-graph.spec.md §4. Ready for implementation; runner picks up per spec's build order (EG1 first, serially; EG2/EG3/EG4 fan-out in parallel).
- **M-postgate-battle-0hp-fix** (`M-postgate-battle-0hp-fix.spec.md`) — **PvE HALF MERGED 2026-07-31,
  PvP HALF PARKED** (11r-d ledger reconciliation): #258/ADR-0156 landed the PvE fix (never seat a 0 HP
  lead; reject actions from a fainted active). **The PvP half was deliberately parked by ADR-0156** and is
  now folded into `M-postgate-eleventh-review-residuals` slices **11r-a** (PvP server-guard parity) and
  **11r-b** (PvP side-B battle overlay). Do NOT mark CLOSED until those merge. Historical scope below (originally: NEW, queued, post-gate, un-blocked; r2 feedback, items 005/030/031/036-039). LIGHT bug fix: 0hp lead-monster sent out at
  battle start, ghost-attack accepted, silent round-2 swap. Disjoint from other r2 milestones — fan-out
  candidate.
- **M-postgate-movement-investigation** (`M-postgate-movement-investigation.spec.md`) — **CLOSED 2026-07-31**
  (11r-d ledger reconciliation): #259/ADR-0158 root-caused the residual double-move to the CLIENT
  (server proved innocent) and shipped the hold-commit tap/hold gate; the OBSERVABILITY fallback was not
  needed. Historical scope below (originally: NEW, queued, post-gate, un-blocked; r2 feedback, items 003/015/029/040-042). Residual double-move defect distinct
  from nh1/nh2 (already merged); root-cause client-vs-server before fixing; OBSERVABILITY fallback if
  undiagnosable within budget.
- **M-postgate-dev-observability** (`M-postgate-dev-observability.spec.md`) — **CLOSED 2026-07-31** (11r-d
  ledger reconciliation): #257/ADR-0157 shipped the flag-gated dev-console outbound-reducer log.
  Historical scope below (originally: NEW, queued, post-gate, un-blocked; r2 feedback, items 043/045/046). Toggleable dev-console outbound-event logging, dev-only.
  Disjoint — fan-out candidate.
- **M-postgate-feel-polish** (`M-postgate-feel-polish.spec.md`) — **CLOSED 2026-07-31** (11r-d ledger
  reconciliation): #260/ADR-0159 shipped care-button confirmation feedback + collision-aware NPC wander.
  Historical scope below (originally: NEW, queued, post-gate, un-blocked; r2 feedback item 091's sibling process-defect closure + r1 strays finally sized: care-button no-op,
  movement/NPC feel tuning, no walk animation; items 087-090). LIGHT, bundle as one slice.
- **M-postgate-client-coverage** (client-hardening; M-playtest-c.5 Decision D, Drew-delegated 2026-07-20) — extract the inline decision logic in `main.ts`/`battleView.ts`/`boxView.ts` into tested pure `*Model.ts` cores and drop the coverage-denominator exclusions; a mechanical fence lands pre-gate (fail if the `vite.config.ts` excluded set grows). Pairs with the ptc5c-2 overlay-registry client-hardening work. Stays post-gate provisional (order unchanged) behind the two hardening milestones above.
- **M-postgate-ux-design** (`M-postgate-ux-design.spec.md`) — **CLOSED 2026-07-31** (11r-d ledger
  reconciliation): all three designed slices merged — uxd1 #262/ADR-0160 (responsive viewport), uxd2
  #264/ADR-0161 (shop-via-NPC context interact), uxd3 in three parts a/b/c #266/ADR-0162, #267/ADR-0163,
  #268/ADR-0164 (overlay IA → probe substrate → write substrate + `canOpen` migration). uxd3-c
  **also closed `M-postgate-overlay-registry`**, which this milestone subsumed. Named residual, NOT
  blocking closure: the Escape-tooth re-anchoring boy-scout was deferred three times as over-cap
  (~73 lines / 4 hunks, atomic) → carry as `uxd3-d` if it is ever wanted. Historical scope below
  (DESIGNED 2026-07-25, the three larger UX
  design questions from the gate, sized via a brainstorm→debate→judge→synthesize multi-agent convergence
  pass; all three converged). Three slices: **uxd1** responsive viewport scaling (DPR-correct + device-integer
  crisp + fill-model follow-camera + small-map centering; render-edge-only, netcode-safe by construction);
  **uxd2** shop-via-NPC context-sensitive interaction (server-anchored `NpcInteraction{Dialogue,Shop,Heal}`
  enum + generalized `KeyT` + on-world prompt; MVP touches no reducer); **uxd3** unified overlay IA / two-level
  main menu opened by a pinned `KeyM`, governed by a `canOpen` modality policy that preserves the
  guard-only-never-hide gate — **this SUBSUMES `M-postgate-overlay-registry`** (delivers the registry substrate
  + the menu in one). Designs are complete; **implementation stays post-gate provisional** (built after a
  cleaner second playtest read, in normal queue order, ADR per slice at build). Sequencing: uxd3 is `main.ts`-
  SERIAL and lands AFTER netcode-hardening nh1/nh2; uxd1/uxd2 are largely disjoint. See spec §4 for the full
  sequencing/fan-out notes and the per-slice open-questions-for-Drew (each with a recommended default).
- **M-postgate-eleventh-review-residuals** (`M-postgate-eleventh-review-residuals.spec.md`) — **NEW,
  queued 2026-07-31; inserted between `M-postgate-ux-design` (in flight) and
  `M-evolution-essence-redesign`** per the weekly-review insertion convention. Verified eleventh
  multi-lens review findings @ `3063149`: three HIGH product defects — PvP 0hp-lead exploit
  (the ADR-0156-parked PvP half, folds in `M-postgate-battle-0hp-fix-pvp`), PvP side-B has no
  battle overlay in production (ADR-0155 D6, folds in `M-postgate-pvp-side-b-overlay`), and the
  server lacks the battle movement lock the sim-harness models (the `battle_lock_convergence`
  eval criterion certifies a fictional invariant) — plus the skipped post-gate-wave ledger
  reconciliation (CHANGELOG stops at #239 vs HEAD #261; ADR README catalog stops at 0134),
  ux2b wallet completion (ADR-0154 D7), resume-from-idle interpolation smoothness, a server
  hardening basket (silent encounter failures, ADR-0089 abilities/type-chart cache completion,
  `HealLocationRow.cost_currency`), test-integrity residuals, and gate-coverage extensions.
  Four DECISIONS for Drew in spec §4 (battle-table team exposure, unsolicited-trade escrow
  griefing, held-key RTT pin, changelog gate). `main.ts` slices are SERIAL with uxd3 — see
  spec §3 sequencing. No new game-design surface outside the §4 decisions.
- **M-postgate-twelfth-review-residuals** (`M-postgate-twelfth-review-residuals.spec.md`) —
  **NEW, queued 2026-08-07; inserted after `M-postgate-eleventh-review-residuals` (fully
  merged) and after the in-flight `M-evolution-essence-graph` (EG4/EG5 outstanding)**, per the
  weekly-review insertion convention. Verified twelfth multi-lens review findings @ `3c1cf08`
  (10 lenses, every finding independently re-verified by separate verifier agents; four
  severities revised DOWN by the verifiers and the revised values are what the spec records).
  The EG1/EG2/EG3 + 11r delta is unusually clean — six of ten lenses found nothing reportable,
  and the security, netcode and test-integrity lenses each returned an explicit "no findings".
  What remains is the enforcement-and-documentation layer around the code: two HIGH slices —
  **12r-a** append-only id baselines for species/items/skills were never updated as content
  grew (`[1,2,3]` vs 16 live species; the gate only flags *removed* baseline ids, so deleting
  or renumbering species 20 / item 4 / skill 7 passes green today) and **12r-b** `PLAYTEST.md`
  still documents the `G`/`H` hotkeys uxd2 deleted while omitting `M` entirely, in a doc that
  claims to be kept in sync with `helpModel.ts` — plus **12r-c** the `monster-dual-write` eval
  ignores `pub(crate) fn` boundaries and so no longer verifies each function's own mirror,
  **12r-d** the ADR-0170 residual basket (heal `cost_currency` silent-debit trap, `pvp`/`taming`
  cache swaps, six unescaped JSON log sites) which was honestly disclosed at 11r-g but queued
  nowhere, **12r-e** a validator/core hardening tail (R4 vacuous-path tests field presence not
  gate semantics; `lead_party`'s silent whole-party accrual disable, which ADR-0175 names in
  its own Consequences and no queue picked up; a provably-dead R1 backstop; Quality-Time cap
  write amplification on the hottest reducer), and **12r-f** ledger/doc reconciliation
  (CHANGELOG re-drifted 13 PRs one delta after 11r-d fixed it; four missing ADR `Amended-by:`
  back-links that the digest gate structurally cannot catch). ONE decision for Drew
  (issue #284: whether per-monster raising progress stays world-readable on public
  `monster_pub` — deliberately has no slice). a/b/c/f are pairwise disjoint fan-out
  candidates; d → e is SERIAL; **12r-d touches `schema.rs` and so must be ordered explicitly
  against EG5-6 Migration B**. No new game-design surface.
- **M-postgate-overlay-registry** — **SUBSUMED + RETIRED 2026-07-25** by `M-postgate-ux-design` §uxd3, which
  delivers the registry substrate (`overlayRegistry.ts` + a pure `canOpen` modality reducer) together with the
  main-menu IA this parked slice was corroborating (unify the ~15 open-coded overlay-guard sites). Do NOT
  schedule this separately.
- **RELEASED FOR IMPLEMENTATION 2026-07-27** (r2 playtest feedback, per the SSOT's r2-specific addendum):
  `M-postgate-ux-design` uxd1 (responsive viewport) and uxd3 (overlay/menu cohesion) are no longer
  build-after-second-playtest-provisional — r2's items 006-014/016/035/047-061/060/091 land here directly
  and the milestone proceeds now, in normal queue order. uxd2 (context-sensitive NPC interaction) also
  absorbs r2's interact-key redesign ask (items 022-026/032) — extend its `NpcInteraction` enum scope
  accordingly at build time.
- **M-postgate-roster-wave-3** (content; **deprioritized, DE-GATED**) — complete the roster toward the GDD §5
  ~16-form target by adding the currently-unrepresented **Electric + Light** species lines. These have
  **zero forms AND zero skills** today, so this is net-new species *and* net-new skill kits (the Electric/
  Light skills the ADR-0143 STAB gate requires), not a top-up — it also closes the Dark-doubled / 14-vs-16
  residual accepted at pt-d3 (ADR-0145). Follows the ADR-0057 content fan-out + ADR-0143/0144 wave
  conventions (reserved id/filename bands, STAB + RON comment-hygiene gates). **DECISION (Drew, 2026-07-25):
  DE-GATED** — supersedes the earlier "gated on playtest feedback / no auto-launch without a fresh Drew
  decision"; the loop MAY auto-launch this as normal content queue work with no fresh Drew decision, but it
  is **deprioritized to the tail** of this block (sequence it after the two hardening milestones + the
  UX-design specs; do not pull it ahead of them). ADR reserved at build time.
- **M20 Observability, performance & load hardening** (`M20-observability-performance.spec.md`; ADR-0029) —
  the capstone: production monitoring (OTel→Datadog dashboards/alerts), full-system load testing (scaled
  sim-harness), profiling the named hot paths, and the **measured** performance-tuning pass + SLO baselines.
  The always-on substrate (structured logging, OTel seams, a benchmark + perf-budget CI gate, health/
  readiness) is built in **M0**; every milestone instruments + benchmarks + load-tests what it adds (a
  cross-cutting invariant). See `observability-performance-plan.md`; backup/DR runbook folded in.
  **Slimmed 2026-07:** the playtest-scale error-surface/event-capture layer moved to **M-playtest-b**;
  M20 remains the production capstone (export/dashboards/load/SLOs) and consumes `playtest_event` learnings.
- **M21 Accounts & authentication** (`M21-accounts-auth.spec.md`; ADR-0030) — OIDC-backed stable identity
  (cross-device, recovery) replacing anonymous identities; guest→account claim. No game-data schema churn
  (the identity keying pays off).
- **M22 Privacy, data deletion & compliance** (`M22-privacy-compliance.spec.md`; ADR-0031) — registry-driven
  deletion cascade (erase/anonymize), data export, retention; a deletion-completeness eval.
- **M23 Accessibility** (`M23-accessibility.spec.md`; ADR-0032) — keyboard/screen-reader/colorblind/
  reduced-motion (a visual switch on ADR-0013), WCAG-AA; retrofits across M4/M7/M19.
- **M24 Internationalization** (`M24-internationalization.spec.md`; ADR-0033) — externalized catalogs +
  locale-keyed RON content; a new language is a data drop; chat untranslated.
- **M25 Security audit & threat-model gate** (`M25-security-audit.spec.md`; ADR-0034; `security-threat-
  model.md`) — the **final pre-launch gate**: consolidated threat model + a tooled/manual audit (RLS-leak
  verification on the pinned version is the headline check) + a blocking security sign-off + re-audit cadence.

Phases gate on the prior phase's CI being green-and-meaningful. Phase B/C items stay **named YAGNI
exceptions** until their phase — declared, not silently dropped.

## 10. Risks & open questions

- **SpacetimeDB version drift** — pin the module SDK + CLI; verify scheduled-reducer + RLS syntax
  against current docs before M2 (version-sensitive; route via the vendored skill/`llms.txt`).
- **Tiled pipeline scope creep (M11)** — keep the importer pure + tested; don't build an in-engine
  editor (YAGNI).
- **Expanded scope vs. effort budget** — Phase A alone is a full project; Phases B/C are explicitly
  deferred behind specs so the plan can stop at any phase boundary with a shippable game.
- **Open ADRs 0002–0004** — if a `/debate` overturns "keep the spine", §4–§7 change materially; that's
  expected and why the stack is not locked here.

## 11. Immediate next steps (on approval)

1. Run `/debate` on ADRs **0002, 0003, 0004** (Opus/max); accept or revise; scorers become evals.
2. `just new monster-realm spacetimedb-game` to scaffold; commit the empty-but-green CI.
3. Write the **M0 spec** (`docs/specs/`) with EARS criteria for: determinism gate, schema-evolution +
   `sync_content`, zoned-schema, sim-harness, full CI.
4. Begin PRERRR `/loop` from the first M0 task.

> Nothing in Phase B/C is built before Phase A is green-and-meaningful. The deferred v1 items (G1–G9)
> are tracked here as acceptance criteria, not memory.
