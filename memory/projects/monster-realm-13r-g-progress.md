# 13r-g — Docs/ledger freshness — PROGRESS

**Branch:** `feat/13r-g-docs-ledger-freshness` (pushed) · worktree `projects/monster-realm/.claude/worktrees/13r-g` off `origin/master@7eb6980`
**ADR:** 0196 (filename `docs/adr/0196-changelog-freshness-nightly-check.md`; 0195 deliberately skipped — supervisor-assigned number kept)
**Local gate:** `just ci` **exit 0** (x3) (87 evals, 604-ish server tests, 2447 client tests / 81 files, clippy `-D warnings`, wasm, security).

## DONE

1. **CHANGELOG regen** — `ab0755f`, the branch's FIRST commit (ordering is load-bearing: a tip regen bakes local `wip:` subjects the squash rewrites). 34 entries appended (#290–#326), zero removals.
2. **`m13.5r-plan.md` → `docs/specs/`** — `7d31a2a`, `git mv`, rename detected, zero inbound refs before or after.
3. **The ADR-0165 nightly check** — `scripts/changelog-freshness.mjs` (pure core + 15-case inline self-test + main-guarded shell with six environment guards) + `scripts/changelog-freshness.test.mjs` (72 tester-authored `node:test` tests) + a 5th `nightly.yml` job `changelog-freshness` (fetch-depth 0, `tool: git-cliff@2.13.1`, SHA-pinned, no `continue-on-error`, failure-policy preamble).
4. **Docs** — ADR-0196, reciprocal `**Amended-by:**` on ADR-0165, a 4-sentence m17.5g addition in `ARCHITECTURE.md`, regenerated `docs/adr/DIGEST.md`.

## The load-bearing design call (do not re-litigate without re-measuring)

The failure rule is a **conjunction**, not a threshold: fail iff `missing >= 15` AND the oldest
missing entry is `>= 6` days old; advisory (exit 0) from `missing >= 8`. Derived by replaying the
real signal — `git cliff` at each of the last 150 master commits vs that commit's committed ledger,
giving 32 nights: `1,3,12,22,11,19,24,26,26,4,17,18,23,23,23,25,8,14,15,15,17,20,21,4,12,18,20,20,20,21,33,34`.
Lag is a weekly sawtooth reaching 20–26 on a HEALTHY wave, so a bare count either nags (`>15` reds
21/32 nights) or misses half the episodes (`>25` reds 4/32). The conjunction fires 5/32 — one night
of lead per wave, sustained red only while a wave stays unreconciled.

Age comes from the oldest missing entry's **commit date** via an `entryTextForSubject` transform
verified to reproduce git-cliff exactly (341/341 at origin/master), clock injected. **Never** file
mtime — in a fresh `actions/checkout` mtime is the checkout time, so an mtime age is always ~0 and
the gate would be permanently, silently green.

## Verification evidence

- 72/72 gating tests green; **15/15 mutation bite-proofs killed** (harness: `/tmp/13rg_bite.mjs`).
  M9 (`runSelfTest` hardcoding `ok: true`) survived until an injected-comparator seam was added —
  `runSelfTest(classify = classifyChangelogDrift)`; the suite now proves the teeth bite by feeding a
  deliberately wrong comparator.
- Live end-to-end run on the branch: `verdict=fresh lag=3 age=0.0d extra=0`, exit 0.
- `nightly-smoke-wiring`, `build-ci-hygiene`, `ci-gate-wiring` evals re-run individually against the
  edited `nightly.yml`: all PASS (the 5th job reds none of them).

## TERMINAL STATE — PR OPEN

**PR:** https://github.com/mdrewt/monster-realm/pull/328 (`feat(13r-g): nightly
changelog-freshness check (ADR-0165 implemented) + ledger regen + docs rehome (ADR-0196)`)
Local `just ci` **exit 0** (run three times: initial, post-review-fixes, post-pipefail-fix).
Remote CI running at open. **`gh pr merge` is supervisor-owned — this run did not merge.**

**Lenses run:** planner · reviewer (plan) · red-team (plan) · tester (3 rounds: v1 RED, v2 from
the revised contract, v3 the teeth-bite seam) · doc-keeper · red-team (implementation) ·
reviewer+simplify (implementation) · **verifier PASS**. Domain auditors deliberately NOT run —
no server-module/game-core/wasm/reducer/schema/client-prediction surface (docs + a node CI
script + a workflow job).

**Two merge blockers were found and closed before the PR:**
1. The age arm failed open — the whole-generation mapped-fraction floor tolerated more
   unmappable entries than the entire missing set; a partially-rotted subject transform dated a
   39-entry / 7.7-day lag as 5.0 days and exited 0. Closed with a missing-set-scoped floor,
   demonstrated before/after (exit 0 -> exit 2) on the same rotted transform.
2. ADR-0196's D2 table claimed age-only fires 1 night in 32; it fires 5 — the same 5 as the
   conjunction. Corrected, with the count arm restated as defence-in-depth, not a discriminator.

## BLOCKERS

None.

## Honest gaps (recorded in ADR-0196, not defects to fix here)

- `just ci` **cannot** run this check — `justfile` and `evals/**` were outside the declared touches.
  Only the nightly job executes it; a runtime error lands green and surfaces at 07:00 UTC. Biome does
  parse both new files, so a syntax error still reds `just ci`.
- The new nightly job has **no wiring guard** (`nightly-smoke-wiring` uses hard-coded job names), so
  deleting it or adding `continue-on-error: true` is invisible to `just ci`.
- Thresholds are a convention, not a mechanical ratchet (pinning needs an eval).
- `extra <= 3` is advisory, so a hand-edit of ≤3 entries is invisible — deliberate (F3: a branch-tip
  regen legitimately produces small `extra`; it already happened once, at `34250d5`).

**Named follow-ups for a slice whose touches include `evals/`/`justfile`:** (1)
`evals/changelog-freshness-teeth.eval.mjs` importing the pure comparator + fixture table so `just ci`
catches comparator rot per-PR and pins the thresholds cross-directory; (2) a `just changelog-check`
recipe; (3) add `changelog-freshness` to `nightly-smoke-wiring`'s guarded-job list.
