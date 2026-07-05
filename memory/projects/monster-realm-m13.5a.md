---
name: monster-realm-m13.5a
description: gate-of-gates (PR #118, ADR-0050 amendment) — dual-anchor ci-wiring guard, nightly mutation-server ratchet cap 180, coverage 25→96, quote-aware stripComments; 7 accepted gaps in ADR
metadata:
  type: project
---

m13.5a (M13.5 §13.5a HIGH, PR #118, branch `feat/m13.5a-gate-of-gates`, base `e875af0`) closed the self-sealing guard gap. Non-obvious facts a future slice needs:

- **Package-name trap:** the `server-module/` directory's cargo package is `monster-realm-module` — `cargo mutants -p server-module` fails "Package not found". The spec/decision text says "-p server-module"; every recipe/eval uses the real name.
- **Mutation ratchet numbers (@ e875af0, 2026-07-04):** 253 mutants / 180 missed / 56 caught / 17 unviable; 2 min local (32-core, `-j4`, nextest). `just mutate-server cap="180"` — cap = exact baseline; bumps must update ADR-0050 A2; eval ceiling rejects cap > 200. Single nightly job `mutation-server:` (no sharding — runtime recorded satisfies the "sharded if runtime demands" clause). `--test-tool nextest` is PINNED for baseline determinism and eval-enforced.
- **Coverage ratchet:** post-exclusion measured 99.35% lines → justfile threshold 96 (was 25 from a 29.65% pre-exclusion denominator). `coverageRecipeThresholdIntact` enforces ≥96 with LAST-flag-wins parsing (vitest honors the last repeated flag).
- **Dual anchor topology (ADR-0050 A3):** `evals/ci-gate-wiring.eval.mjs` runs under `just eval` AND from a bare `- run: node evals/ci-gate-wiring.eval.mjs` step in ci.yml's e2e job AND a lefthook pre-commit command. The lefthook BINARY is not installed anywhere on the dev machine (config-as-documentation) — the e2e-job step is the real non-self-sealing anchor; that's why the brief's "ci.yml read-only" note was deviated from (spec 13.5a-1 names the e2e job; reviewer-ratified). The e2e anchor step must stay EXACT bare form — anchorIsWired requires the trimmed line `- run: node evals/ci-gate-wiring.eval.mjs`, and any `if:`/`continue-on-error` would trip e2e-desync-teeth.
- **Guarded-job contract:** nightly job names `mutation:`/`coverage:`/`mutation-server:` are stable contract; `jobIsNotNeutered` is a FLAT block scan, so those three jobs must never carry a legitimate step `if:` (e.g. `if: failure()` log-dump) — will false-RED by design (ADR-0050 gap 6).
- **stripComments trap (fixed):** the old regex block-comment stripper mangled glob STRINGS — `'src/**/*.ts'` contains `/**/` which parses as an empty block comment. Now a quote-aware character scanner in dom-shell-coverage-exclusion. Any future eval stripping JS comments from sources containing globs must not use the regex approach.
- **Main-guard trap (fixed):** `await import(import.meta.url)` inside a module's own top-level = deadlock (Node exit 13, "unsettled top-level await"). Self-runner evals must name the default export and call it directly.
- **`ci:`-job checks:** ciStepsUnneutered uses a HARDCODED 7-verb oracle (not derived from the justfile — dual-deletion defense), exact step-line matching (kills `|| true` suffixes), per-step neuter scoping (the ci job's dependency-review step legitimately carries `if:` + `continue-on-error: true` — block-wide scans false-red), duplicate `ci:`/`jobs:` key detection (GHA last-key-wins vs extractJobBlock first-match).
- **Residual risk recorded (ADR-0050 A3 gaps):** a single commit deleting BOTH the ci job's `just eval` step AND the e2e anchor step defeats both CI layers (lefthook = theater without the binary); `-o`/`--output`/`--shard`/`--file`/`--exclude-re` are eval-banned in the mutate-server recipe body.
- First scheduled nightly run of `mutation-server` is the real-world runtime validation (~15–30 min extrapolated). If it reds on runtime or count drift, that's the [[monster-realm-m13.5a]] follow-up, not a revert.

Related: [[monster-realm-eval-gate-integrity]], [[monster-realm-coverage-gate-scope]], [[monster-realm-determinism-gate-m88a]].
