# Plan — slice `fix-nightly-coverage-wasm`

Branch `fix/nightly-coverage-wasm`, worktree
`.claude/worktrees/fix-nightly-coverage-wasm` from `origin/master` @ 5206446.
Repo: **project** (`mdrewt/monster-realm`). No ADR (mechanical CI-recipe fix;
it restores an ADR-0050 gate, it decides nothing new).

## 1. Root cause (empirically verified, not inferred)

Nightly `coverage` red 4 consecutive nights (#362/#372/#374/#375). From the
run log of job 98621321295:

    Failed to resolve import "../../client-wasm/pkg/client_wasm.js" from "src/main.ts"
    Tests  36 failed | 2782 passed (2818)
    error: recipe `coverage` failed on line 196 with exit code 1

`justfile:195` declares a bare `coverage:` with **no** dependencies, while the
siblings `e2e:` (:283) and `a11y-e2e:` (:324) both declare `: wasm` for exactly
this reason (rationale comment at :315-318). Verified via
`just --dump --dump-format json`: `coverage` deps `[]` priors `0`;
`e2e`/`a11y-e2e` deps `["wasm"]` priors `1`.

### The complication the slice brief missed

`.github/workflows/nightly.yml:111-121` — the `coverage` job provisions ONLY
`actions/checkout`, `actions/setup-node`, `extractions/setup-just`, then
`- run: just coverage`. **No Rust toolchain, no wasm-pack.** Adding
`coverage: wasm` to the justfile alone would convert today's "36 test failures"
red into a `wasm-pack: command not found` red — still red. The fix is therefore
two-file and atomic. Splitting it leaves master strictly worse than today.

### The finding that makes this worth more than a 1-line fix

Measured (red-team, hardlink copy of `client/`): **with any failing test vitest
emits no coverage report at all and never evaluates the threshold** (36 failures
-> 0 coverage tables; 4 failures -> 0; 0 failures -> 1). So the nightly coverage
gate has not merely been *red* since the `main.ts`-importing specs landed — it
has been **silently unenforced**. This slice re-arms a gate that was off.

Measured post-fix: **98.22% lines** (2818 passed, exit 0) vs the 96 threshold —
2.22 points of headroom. `client/vite.config.ts:97` excludes `src/main.ts` from
the denominator, so resolving the import cannot *lower* the number; it moved
98.12 -> 98.22. The threshold is NOT touched (policy: restore coverage with
tests, never by lowering the gate — `docs/nightly-red-response-policy.md:22`).

## 2. The change

1. `justfile:195` — `coverage:` -> `coverage: wasm`, plus a short load-bearing
   rationale comment mirroring :315-318.
2. `.github/workflows/nightly.yml` `coverage` job — add **only the three
   `uses:` steps** (rust-toolchain@stable + `targets: wasm32-unknown-unknown`,
   rust-cache with the distinct `prefix-key: v1-coverage`, and
   `jetli/wasm-pack-action@0d096b08b4e5a7de8c28de67e11e945404e9eefa`
   `version: 'v0.15.0'`), copied from the `a11y-e2e` job (:254-281).
3. New slice-owned eval `evals/nightly-coverage-wasm-wiring.eval.mjs`.

**Do NOT copy `a11y-e2e`'s `- name: Install client deps / run: cd client && npm ci`
step.** `jobIsNotNeutered` (`evals/nightly-smoke-wiring.eval.mjs:1063-1106`,
applied to `coverage` at :10257) requires the gate to be the FIRST `run:` step;
that copy reds `just eval` with a message about shim attacks that reads nothing
like "you copied one step too many". It is also redundant — `justfile:196`
already runs `npm ci` itself. `uses:` steps before the gate are an explicitly
deferred residual (:305-309) and are permitted.

## 3. The gating eval — three criteria, oracle is the parsed dep graph

Oracle: `just --dump --dump-format json` (a real parse), never a text grep on
the justfile. Verified shape-compatible on just **1.21.0** (bare `/usr/bin/just`,
what `mr-gates` inherits) and **1.55.1** (asdf pin): both emit
`dependencies: [{recipe, arguments}]` and `priors`. Normalize, and **fail loud**
on any other shape.

- **C1** — `coverage` declares `wasm` as a **prior** dependency.
  Measured bypass this closes: `coverage: && wasm` (a *subsequent* dep) emits a
  `dependencies` array **identical** to the honest `coverage: wasm`, but runs the
  body FIRST — vitest fails before wasm builds. Only `priors` distinguishes them.
  So: `priors >= 1` AND `wasm` in `dependencies.slice(0, priors)`.
  Plus: the `wasm:` recipe body must contain `wasm-pack build client-wasm` —
  otherwise `wasm:\n  echo skip` keeps every criterion green with no pkg built.
- **C2 (totality)** — the brief's "confirm no other nightly-only recipe has the
  same gap", stated correctly. `ci.yml` does **not** run `just ci`; it runs each
  verb as its own step (`- run: just wasm` at :76, then `client-typecheck` :78 /
  `client-test` :79). Those recipes have NO `wasm` dep and are correct anyway,
  because an earlier step in the same job built the pkg. So the rule is
  **job-scoped and ordered**, not closure-only:

  > for every `just X` invocation at line L in job J of ci.yml/nightly.yml, if
  > `closure(X)` intersects the client-loading roster, then `wasm` must be a
  > prior in `closure(X)` **or** J must contain an exact `- run: just wasm`
  > line at an index < L.

  A closure-only C2 reds `- run: just client-test` — a correct configuration.
  Roster is **derived** (comment-stripped body matches `vitest` / `npm test` /
  `npm run typecheck`), which measures to exactly
  `{coverage, client-test, client-typecheck, a11y-e2e}` — no false positives
  from the cargo `test` recipe. Anti-vacuity floors: that derived set must
  contain all four (else "the matcher rotted"), entry-point discovery must find
  the known nightly + ci rosters, and obligations-checked must be >= 3.
  **Declared limit, written in the eval header rather than papered over:** a
  future recipe that runs vitest via a wrapper script is invisible to a
  body-text matcher. The floors catch *removal* of the known four, not
  *addition* of an invisible fifth. `justfile:60-62` (`eval:` shells out to
  `just perf-budget`) is a live in-tree instance of the dep-graph blind spot.
- **C3** — the nightly `coverage` **job block** provisions the toolchain, so the
  new dependency is satisfiable on the runner. Without C3 the fix is cosmetic.
  Must use a strict, anchored job-block extraction (import the hardened
  `strictJobBlock`, `evals/nightly-smoke-wiring.eval.mjs:444`) — a whole-file
  scan for `jetli/wasm-pack-action` is **vacuously green on master today**
  (it already appears at nightly.yml:265 in the `a11y-e2e` job).
  Require, over non-comment lines in the block: the wasm-pack `uses:` ref equal
  (not `indexOf`) to the pinned SHA + `version: 'v0.15.0'`; rust-toolchain with
  `targets: wasm32-unknown-unknown`; both at line indices < the
  `- run: just coverage` line; neither carrying `if:` nor a
  `continue-on-error:` other than the literal `false`; and no duplicate
  `coverage:` job key (GHA is last-key-wins, extractors return the first).

Teeth (each fixture must BITE): C1 — deps `[]`; deps as a *subsequent* (`priors:0`);
gutted `wasm:` body; `coverage` key absent; malformed dep entry. C2 — coverage
with no dep and no earlier wasm step (REJECT); ci-shaped job with an earlier
`- run: just wasm` (ACCEPT — without this tooth the predicate is wrong, not
strict); the wasm step moved after (REJECT); commented (REJECT); `|| true`
suffixed (REJECT); zero entry points (floor REJECT). C3 — good (ACCEPT);
wasm-pack deleted / commented / SHA-suffixed / moved below the gate /
`if: false` / `targets:` dropped / no coverage job (all REJECT).

Assert `fixture !== BASE` after every `.replace()` — a first-occurrence replace
that silently no-ops reads as "the gate accepted the cheat".

## 4. Constraints / anti-patterns

- No `new RegExp(` (Semgrep `detect-non-literal-regexp` is remote-only, bitten twice).
- No main guard on the eval (a dirname/endsWith guard truncates `run.mjs`
  mid-loop at exit 0 — measured: 37/90 ran, 3 FAILs swallowed, CI green).
- The `just` spawn must FAIL, never `skip`, on a missing/erroring binary.
  Pin `--justfile <repoRoot>/justfile`: `just` searches upward and this repo is
  nested under a harness that has its own justfile.
- Node **v18**-compatible source: `mr-gates` CHECKs execute under `/usr/bin/node`
  v18.19.1, and they import this module.
- Never touch `--coverage.thresholds.lines=96`; never add `continue-on-error`
  or `if:` to a coverage step; never weaken an existing eval.
- Comment separator above the job key must be `  #`, never a blank line —
  `jobHasFailurePolicyComment` (:2029) and `jobPreambleCitesPolicyDoc` (:2992)
  walk upward and stop at the first blank line.

## 5. Scope / disclosure

`touches:` is **`justfile` only**. `.github/workflows/nightly.yml` is a
**disclosed hidden dependency** — it is REQUIRED (see §1) and the fix is
incorrect without it. Collision risk verified nil at plan time: zero open PRs,
one worktree. Disclosed loudly in the PR body (`touches-delta:`) and the handoff
so the supervisor can re-serialize or reject. The new eval file is slice-owned
test authorship (evals auto-discover via readdir; `evals/run.mjs` untouched).

Boyscout (in-cap, in-`touches:`): `justfile:194`'s comment still claims 97.56%
from 2026-07-22; the measured post-fix value is 98.22%. Comment-accuracy fix.

## 6. Order of work

0. worktree prep: `npm ci` + `just wasm` (DONE)
1. tester writes the eval; RED proof pre-fix (must fail on C1 AND C3)
2. apply justfile + nightly.yml edits
3. GREEN proof + real-file bite drill (revert only `coverage: wasm` -> RED)
4. `just eval` (catches `jobIsNotNeutered('coverage')` regressions)
5. `just coverage` — record the measured lines %
6. full `just ci` once
7. `mr-gates check`, review lenses, verifier, PR
