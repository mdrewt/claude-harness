# m20a plan memo — DRAFT (planner output, pre-review)

Slice: m20a — Layer-1 observability retrofit (M20 §5, ADR-0180).
Branch: feat/m20a-observability-layer1 (worktree .claude/worktrees/m20a).
Planner agent: a33759a1865c3caf9. Status: awaiting reviewer+red-team+/simplify adjudication.

(Adjudicated version to follow in monster-realm-m20a-plan.md. This draft records
the planner's raw output headline decisions:)

- C1 (correction): private scheduled table DOES drift client bindings types.ts — must regen + commit (bindings-drift runs real spacetime generate in ci job).
- C2 (correction): evals/baselines/spacetime-types.json likely NO change (no SpacetimeType derive on schedule structs); verify, don't pre-regen.
- observability.rs API: build_log_line (pure) + mr_log + mr_log_breadcrumb + Breadcrumb<'a> {cause: Option<&str>, sched: Option<(&str,i64)>, phase: Option<&str>}; phase stays &str (G9 call-site scan needs the literal); no macro_rules!, no Phase enum, no PHASE_* consts.
- Heartbeat: MrHeartbeatSchedule (id u64 PK auto_inc, scheduled_at ScheduleAt), 60s interval const; scheduler-only guard (ctx.sender != ctx.identity()); content_version read from Config ROW (find(0), unwrap_or(0)); ensure_mr_heartbeat reuses playtest::plan_reaper_arm; wired in init + sync_content after ensure_playtest_reaper.
- .log-baseline format: per-file per-level counts (file\tinfo\twarn\terror), sorted, "# total 53" self-check; counting rule = whole-line trimmed-`//`-prefix filter + literal indexOf needles (log::info!(, log::warn!(, log::error!(), NO regex; generator (--write main-guard in the eval) and checker share one exported fn.
- Perf gate: new `perf-budget:` justfile recipe called from `eval:` recipe BODY (ci: dep-list must NOT change — ci-gate-wiring pins it vs ci.yml which is out of touches); harness=false bench `hot_paths` runs criterion (warm_up 500ms, measure 2s, sample 30), reads target/criterion/*/new/estimates.json (serde_json), feeds pure budgets::violations(); fail loud on violation/missing/unparseable. Budgets in game-core/benches/budgets.rs (compiled Rust, ceilings ~20x measured, inline measured-baseline comment + date). Teeth: [[test]] perf_budget_predicate at benches/budget_check_tests.rs (seeded-regression, good, missing, boundary).
- Bench ids (verified signatures): apply_move, derive_stats, resolve_turn, resolve_encounter, evolution_eligible_paths, evolve, map_for. attempt_recruit deliberately NOT benched (sub-ns, flaky); client-wasm marshaling NOT benched (OBS-7). Fixtures via public load_* content loaders, built outside measured closure.
- criterion workspace dep: default-features=false, features=["cargo_bench_support"], exact pin; serde_json "1"; both game-core dev-deps only.
- log-wrapper eval (G1): A1-A9 assertions incl. G2 wiring (A7/A8) + OBS-48 (A9) + empty-$trace_pair_set assertion (no phase:"enter"/"exit" literals at call sites); teeth T-new-call/T-doc-mention/T-new-file/T-good/T-level-swap/T-lower/T-unwired/T-rustfmt run before real scans.
- metrics-contract eval (G3/G4): skip-when-no-instance (bindings-drift:122 idiom); pure predicates + teeth always run (88-family good/32-family bad fixtures, function-attribution good/bad); pin tripwire vs ci.yml literal; MR_OBS_LIVE=1 opt-in live mode; one live run required for slice DoD (output into handoff). G5 -> m20e (pre-sanctioned, ops/observability is m20b's touches).
- observability_tests.rs (G7): behavioral (build_log_line envelope/escaping/field order, heartbeat_fields, plan_reaper_arm singleton convergence) + Rust-mirror source scans (baseline recount, no macro_rules!, heartbeat purity).
- $trace_pair_set EMPTY in m20a (OBS-41 vacuous; OBS-50/51 preconditions live in m20b/m20d/m20e).
- Implementation order: baseline fact-check (53) -> G1 teeth RED -> observability.rs -> heartbeat+wiring+regens (types.ts, table-schemas.json, knowledge AFTER schema commit) -> G7 RED -> perf predicate RED -> measure+set ceilings -> wiring A7/A8 RED -> metrics-contract -> MR_OBS_LIVE local run -> orchestrator bite-proofs (seed bare log::warn! / halve ceiling / unwire perf-budget) -> full just ci.
- Risks R1-R8 + anti-patterns 1-9 recorded (see agent transcript). OBS-8 untouched. docs/adr/0180 likely untouched (no DIGEST drift allowed).
