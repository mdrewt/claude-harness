# 0009. CI completeness & merge gates
- Status: accepted
- Date: 2026-06-24
- Accepted as a load-bearing decision for the M0 spec (final review pass)

## Context and problem statement
v1's pre-M11 review found CI blind spots: the two-window e2e was local-only, there was no
bindings-drift check (a forgotten `spacetime generate` ships stale bindings green), and the
`reducer-security-auditor`/`desync-guard` gates were not in CI. `standards/ci-cd.md` requires
lint → typecheck → tests → **eval harness** → **mutation** → **security (gitleaks/Semgrep/SCA/SBOM)** →
build, all gating merge. v2 must wire the full pipeline from M0.

## Considered alternatives
- **Full pipeline incl. containerized e2e + bindings-drift + security/desync evals (recommended)** —
  e2e runs against a containerized `spacetime` in CI; a bindings-drift job regenerates and diffs;
  security + desync checks become evals (`standards/evals.md`) that gate merge; mutation + coverage
  thresholds enforced on changed lines. Higher CI time/cost; catches the v1 blind-spot class
  mechanically.
- **Keep e2e local-only + manual gen discipline (v1)** — rejected: "contract left to discipline" is the
  exact recurring bug shape v2 is eliminating.

## Decision outcome
- Chosen: **full pipeline from M0; empty-but-green CI committed at scaffold.** The M0 spec's final review
  expanded the gate set beyond the original list: lint (incl. purity/determinism/safety clippy) →
  typecheck → unit/property tests → eval harness → mutation **and coverage** thresholds on changed lines →
  security (gitleaks hook+CI, Semgrep, SCA with pinned lockfiles, SBOM + license check, Renovate) → build
  (incl. `wasm-pack`). Additional gates: **bindings-drift**, **containerized e2e**, **feature-isolation**
  (client-wasm has no `spacetimedb` feature), **prediction-parity**, **Conventional-Commit** message
  enforcement, and **proof-of-teeth** (ADR-0010 — every gate ships a known-bad fixture it must reject).
- Consequences: closes v1 gap G3/G9; CI is slower but "done" is mechanically meaningful and falsifiable;
  evals are added before agent autonomy is raised on any loop. Least-privilege MCP allow/deny lists live
  in `.claude/settings.json`.
- Supporting evidence (v1 design tutorial): v1 kept the two-window e2e **local-only** because its CI
  runners lacked the `spacetime` CLI, and its own "honest verdict" says installing it in CI is *"arguably
  better … would genuinely raise the safety bar"*, deferred only for CI simplicity. v2 takes that
  better path via a containerized `spacetime`. Clippy runs `--all-targets --all-features -- -D warnings`
  (the teeth behind the purity gate), and the Rust job publishes the `wasm-pack` build as an artifact the
  frontend job consumes so the frontend tests against the real compiled wasm, not a stub.
