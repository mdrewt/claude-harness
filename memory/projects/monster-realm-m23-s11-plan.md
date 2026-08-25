# m23-s11 plan — M23 accessibility S11 (final slice)

Branch `slice/m23-s11`, worktree `.claude/worktrees/m23-s11`, forked from origin/master @ 2770ec9.

## Deliverable (spec M23 §4 S11 row, §5.7, §6 A11Y-32/33)
1. `just a11y-e2e` recipe beside `e2e:`.
2. A nightly-workflow job invoking it, no truthy `continue-on-error`.
3. Additive wiring checks in `evals/ci-gate-wiring.eval.mjs` (REQUIRED_JUST_STEPS untouched).
4. `docs/a11y-manual-protocol.md` — the human protocol for A11Y-32 + A11Y-33, NEVER CI-green.

## Central design decision — what `just a11y-e2e` executes (candidate D)
No axe-core exists in the repo and no M23 slice owns authoring `client/e2e/a11y.spec.ts` or the
`@axe-core/playwright` devDependency — a genuine spec gap. Rejected alternatives:
- (A) `playwright test --grep @a11y` → 0 matching tests: hard-red nightly, or vacuous the day
  someone adds `--pass-with-no-tests`.
- (B) recipe hard-fails "axe tier not implemented" → reds nightly EVERY night and auto-opens one
  GitHub issue per night via the ADR-0200 `notify` job. Turns the notifier into noise.
- (C) author the axe spec + dependency → out of `touches:`, hidden dependency.
- (D') re-run the existing a11y evals/specs as-is → pure duplication of `just ci`; a gate that can
  only fail when CI already failed is ceremony.

**Chosen (D): a decay/ratchet lens `just ci` structurally cannot apply.** Two real decay shapes exist
today and are invisible to `just ci`:
- `evals/run.mjs` fails only at ZERO eval files — deleting `overlay-a11y-manifest.eval.mjs` keeps
  `just eval` green at 92 PASS. Nothing asserts the a11y evals EXIST.
- a MISSING vitest spec reports `numTotalTests:0` and exits 0 — deleting `overlayA11yWiring.test.ts`
  keeps `just client-test` green with 84 fewer tests. Nothing floors the a11y tier's size.

`a11y-e2e floor="169": wasm` therefore runs, fail-closed:
- **Half 1 — eval roster.** `import()` each of the 3 a11y evals BY NAME and require `pass === true`.
  A deleted/renamed eval makes the import THROW: fail-closed by construction, no floor needed.
  Must be `node -e "import(...)"` — none of the three has a main guard, so running the file
  directly exits 0 vacuously.
- **Half 2 — unit-tier floor.** `vitest run --reporter=json` over the 8 wholly-a11y spec files, then
  assert `files === 8 && numTotalTests >= {{floor}} && failed === 0 && pending === 0 && todo === 0`.
- Prints ONE success sentinel and an explicit `DEFERRED: axe-core + real-browser tier` banner.

`: wasm` dependency (the `e2e: wasm` idiom): `client/src/main.a11yFocus.test.ts` imports `main.ts`,
which imports `../../client-wasm/pkg/client_wasm.js`. Without a prebuilt pkg its 26 tests fail to
resolve. MEASURED: `just wasm` = 10.7s warm. Including it keeps the M23-S5 focus-return tier inside
the ratchet; excluding it would leave that file's deletion invisible everywhere.

MEASURED BASELINES @ 2770ec9 (worktree, wasm built):
- roster: files=8 total=169 failed=0 pending=0 todo=0  → **floor = 169**
- eval suite: 93 PASS / 0 FAIL
- a11y evals: `a11y-static-shell`, `overlay-a11y-manifest`, `reduced-motion-purity` (3 — NOT 5;
  `contrast-ratio` + `keyboard-operable-rows` were DEFERred to backlog by m23-s10)

Recipe idiom copied verbatim from `mutate-server cap=` (justfile:142-180): shebang bash,
`set -euo pipefail`, and the non-integer `case` guard BEFORE the run — `[ "" -gt N ]` inside an `if`
is set -e-EXEMPT, a measured false-green in this exact file. `{{`/`}}` never appear in inline JS.

The `floor` parameter buys a repeatable, idempotent negative bite-proof: `just a11y-e2e 999999` must
exit non-zero naming `floor is 999999`.

## HIDDEN DEPENDENCY (mechanically forced, disclosed)
`docs/nightly-red-response-policy.md` is OUTSIDE the declared `touches:` but is unavoidable:
`evals/nightly-smoke-wiring.eval.mjs` `policyMatrixCoversNightlyJobs` (:2755, Check 32) demands the
doc's `## Job response matrix` job-key set be SET-EQUAL to `nightly.yml`'s declared jobs, derived
from the file (never hardcoded). Declaring the job without the row makes `just ci` RED locally.
No in-touches design declares a new job key and avoids it.

Piggybacking the step onto an existing nightly job avoids the doc edit and was REJECTED as worse
engineering: `notify` reports the JOB KEY, so an a11y failure would open "nightly failure: coverage"
and route the responder to "Restore coverage with tests" — ADR-0203 exists precisely to make
"which job failed" answer "what must I do".

No concurrent sibling slice is running (0 open PRs, only this worktree), so the re-serialisation risk
the STOP rule protects against is nil. Disclosed under `touches-delta:` in the PR body and here.

Other mechanically-forced, IN-touches companions of a new nightly job key:
- `notify.needs:` must gain `a11y-e2e` (set-equality, eval :1584).
- a contiguous 2-space `#` preamble directly above the job key citing the policy doc
  (`jobPreambleCitesPolicyDoc`, looped over EVERY declared job, Check 35).
- the job must NOT grant `issues: write`; no job-level `if:`/`continue-on-error:`.

## ADR
None authored: the supervisor assigned NO ADR number and doc-aggregation forbids picking one.
The policy row cites existing ADR-0050 (nightly-gate policy) + ADR-0205 (the overlay a11y contract).
FLAGGED UPWARD: an ADR for "the nightly a11y tier: what `just a11y-e2e` measures, why it is not axe
today, and the never-CI-green rule" is warranted; request a number.

## Order of work
1. Plan + ledger + checkpoint.  2. tester writes the two new ci-gate-wiring predicates + fixtures
   (staged via /tmp — the write guard blocks `.claude/`), orchestrator applies; capture RED.
3. Implement: justfile recipe → nightly job + preamble → notify.needs → policy-doc row →
   docs/a11y-manual-protocol.md → ARCHITECTURE.md.
4. Bite-proofs, reverting ONLY the mutated path each time.  5. Full `just ci`.  6. Ledger + PR.

## Risks
1. Cannot COMMIT a red `ci-gate-wiring.eval.mjs` — `lefthook.yml:11` runs it pre-commit. RED is a
   captured run, never a committed state. Do NOT reach for `--no-verify`.
2. `.claude/hooks/quiet/fixtures/evals-green.txt:16` holds this eval's PASS line TRUNCATED at ~100
   chars. APPEND to the eval's `name`; never edit its prefix.
3. Nightly floor red auto-opens a GitHub issue. Mitigated by scoping the roster to wholly-a11y files
   and documenting the bump procedure in the policy row.
4. No `new RegExp(...)` anywhere in the eval (Semgrep detect-non-literal-regexp, 3 prior bites).
5. Policy doc clause A10: no pipe-prefixed line anywhere in that file outside the one table.
6. Format hook uses an unpinned newer biome; run the pinned `client/node_modules/.bin/biome`.
7. Bite-proof reverts: revert only the mutated PATH, never `git checkout -- <dir>`.
