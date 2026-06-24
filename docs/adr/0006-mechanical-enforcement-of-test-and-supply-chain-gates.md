# 0006. Mechanically enforce mutation, coverage, and SCA gates
- Status: accepted
- Date: 2026-06-24

## Context and problem statement
A harness review found the harness contradicted its own SSOT: `standards/ci-cd.md`
and `standards/testing-tdd.md` require mutation-score, coverage, and dependency
(SCA) gates, but none ran in CI. SCA tools lived only in `just security` (which CI
never invoked) and were masked locally by `|| echo`; mutation was unconfigured (and
broken for the one stack that referenced StrykerJS); coverage had no floor.

## Considered alternatives
- Leave the standards aspirational — rejected: the harness's whole thesis is
  mechanical enforcement; an unenforced standard is drift waiting to happen.
- Gate everything in every stack's CI immediately — rejected for mutation on
  python/rust: `mutmut`/`cargo-mutants` add heavy per-run cost and unreliable exit
  semantics; shipping fragile red CI is worse than a scoped rollout.

## Decision outcome
- Chosen:
  - **Mutation:** StrykerJS wired (config + deps + recipe) for node stacks with
    pure logic; gated in CI via `just mutate`. Electron documents a skip (runtime
    glue). Python (`mutmut`) and Rust (`cargo-mutants`) ship working local recipes;
    CI gating deferred per language due to tool cost/exit-code semantics.
  - **Coverage:** vitest `--coverage` with numeric `thresholds` (node) and
    `--cov-fail-under` (python); rust/spacetimedb deferred (needs `cargo-llvm-cov`).
  - **SCA:** real CI gates in every stack — `npm audit` (node), `pip-audit`
    (python), `cargo audit` (rust/spacetimedb) — plus `dependency-review` on PRs.
    Local audits are explicitly advisory; CI is authoritative.
  - **Enforcement of the above** lives in `scripts/tests/invariants.test.mjs` so a
    new stack can't silently drop a gate.
- Consequences: CI is the authoritative quality gate; thresholds are conservative
  floors projects should raise. Deviations (per-language mutation/coverage rollout)
  are tracked here rather than hidden.
