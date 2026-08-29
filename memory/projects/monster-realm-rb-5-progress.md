# rb-5 — TERMINAL: PR open, local gate green, ledger resolved

PR **https://github.com/mdrewt/monster-realm/pull/383** · branch `slice/rb-5` (HEAD ba13ab2,
pushed) · worktree `.claude/worktrees/rb-5` · fork d525eb3 · ADR-0209.
Ledger: **8/10 met with captured evidence, 2 DEFERred to backlog, 0 unmet.**

## STATE
Terminal state per the loop contract: PR open + full local `just ci` green (exit 0, run twice) +
every acceptance gate met or explicitly DEFERred. **Merge is supervisor-owned — not attempted.**

## WHAT SHIPPED
- `evals/run.mjs` +53/-0, purely additive: a `// rb-5:exit-verdict` region whose
  `process.on('exit')` handler raises a zero/undefined exit code to 1 when
  `completed !== files.length` or `failed > 0`, names the in-flight eval, and never clobbers a
  real non-zero code. Zero-eval guard byte-unchanged. Terminal `process.exit()` retained.
- `evals/run-completeness.eval.mjs` — 20 behavioural teeth (tester-authored).
- ADR-0209, regenerated `docs/adr/DIGEST.md`, 3 `ARCHITECTURE.md` hunks.

## FOR THE SUPERVISOR
- `mr-gates render --slice rb-5 --format pr` output is byte-copied into the PR body under "## Gate".
- X9/X10 DEFER to `backlog`; both carry measured evidence in ADR-0209 so promotion is a copy.
- The X6 probe `memory/projects/gates/rb-5.mutation-probe.mjs` must survive until final verify.
- Its CHECK uses an ABSOLUTE harness path (rb-4 precedent): `mr-gates check` runs with cwd = the
  project worktree, so a `memory/...`-relative path resolves nowhere. This cost one FAIL cycle.
- A fresh worktree needs `just setup` before `just eval`, or `account-e2e` REDs on an unrelated
  missing-`client/node_modules` driver import and looks like a regression.

## FOLLOW-UPS (flagged, not done — outside `touches:` or outside the tester/implementer split)
- `evals/run.mjs:11` returns raw `readdir` order; a `.sort()` would make eval execution order
  reproducible, but it changes order for 94 evals with documented shared-realm coupling (ADR-0208),
  so it is a behaviour change, not a Boy Scout hunk.
- Four out-of-touches prose sites still say run.mjs "fails only at ZERO eval files"
  (`justfile:321,362`, `nightly.yml:254`, `docs/a11y-manual-protocol.md:112`). Their
  deletion-blindness argument stays TRUE; only the "only" is now imprecise.
- `evals/ci-gate-wiring.eval.mjs` could cheaply add the new guard to `runMjsIsIntact`'s needle list
  (out of touches). Note its `process.exit(1)` needle is satisfied by the ZERO-EVAL guard, not the
  loop's terminal `process.exit(failed ? 1 : 0)` — a pre-existing weakness.
