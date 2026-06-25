# Monster Realm (v2) — Greenfield Plan

> **Status:** Proposed (planning). Not yet scaffolded.
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
  weaken (`M8-encounters-recruit.spec.md`); **M9** raising (train/care) (`M9-raising.spec.md`; ADR-0018 inventory model); **M10** evolution & fusion (`M10-evolution-fusion.spec.md`; ADR-0019). **Phase A complete.**

**Phase B — Expanded world (new):**
- **M11 Authored multi-zone world** — Tiled → RON pipeline (ADR-0008 accepted; ADR-0020 zone transitions):
  multiple maps, warps, doors, data-driven collision + encounter zones; **per-zone subscriptions/tick**
  become user-visible; follow-camera; real schema migration. See `M11-authored-world.spec.md`.
- **M12 NPCs, dialogue & quests** (`M12-npcs-dialogue-quests.spec.md`; ADR-0021; closes the `npc_decide`
  deferral; resolves `heal_party` via town healing) — data-driven dialogue trees + a quest/flag system in `game-core`
  (`quest/`); towns with **healing locations** (resolves the `heal_party` placeholder with cost/
  cooldown content).
- **M13 Economy & inventory** (`M13-economy.spec.md`; ADR-0022) — shops, a single owner-private currency,
  and content-priced server-mediated buy/sell on the M9 inventory backbone (ADR-0018); M15 player-trade adds
  only a dual-consent escrow on top.
- **M14 Deeper battle systems** (`M14-deeper-battle.spec.md`; ADR-0023) — status effects, abilities, weather
  as **additive** layers on the symmetric `resolve_turn` (M7 untouched; PvP/raids inherit it); multi-active
  deferred to the Phase B checkpoint. **Phase B complete.**

**Phase C — Social & multiplayer depth (re-engineered + extended):**
- **M15 Trading** (escrowed dual-consent; `M15-trading.spec.md`; ADR-0024) · **M16 PvP** (`M16-pvp.spec.md`; ADR-0025;
  shared battle row, both-submit secret picks, **turn-deadline + forfeit-on-disconnect** up front) ·
  **M17 Ranked ladder** (persistent Elo profile; `M17-ranked-ladder.spec.md`; ADR-0026) ·
  **M18 Co-op raids** (`M18-coop-raids.spec.md`; ADR-0027) · **M19 Guilds/chat/social** (`M19-social.spec.md`;
  ADR-0028).

**Phase D — Production readiness:**
- **M20 Observability, performance & load hardening** (`M20-observability-performance.spec.md`; ADR-0029) —
  the capstone: production monitoring (OTel→Datadog dashboards/alerts), full-system load testing (scaled
  sim-harness), profiling the named hot paths, and the **measured** performance-tuning pass + SLO baselines.
  The always-on substrate (structured logging, OTel seams, a benchmark + perf-budget CI gate, health/
  readiness) is built in **M0**; every milestone instruments + benchmarks + load-tests what it adds (a
  cross-cutting invariant). See `observability-performance-plan.md`; backup/DR runbook folded in.
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
