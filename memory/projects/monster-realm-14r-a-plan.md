# 14r-a plan — Nightly mutation gate: triage, re-baseline, failure visibility

Slice: 14r-a · branch `feat/14r-a-nightly-mutation-gate` · worktree
`projects/monster-realm/.claude/worktrees/14r-a` · base `origin/master@4d789bd`.
touches: `justfile`, `.github/workflows/nightly.yml`,
`evals/nightly-smoke-wiring.eval.mjs`, `docs/adr/` (+ sibling tests, doc outputs).

## Context (established, do not re-derive)

- Nightly `mutation-server` RED 5 nights: 753 mutants / 324 missed / 377 caught /
  52 unviable; cap 299 → ratchet violated (ADR-0050 A2).
- Cap 299 set at m17.5a (`9ef0b03`, 2026-07-17; 513 mutants / 299 missed).
  Convention: cap == exact measured missed count, NO headroom (ADR-0118 §3).
- ADR-0137 D4: `MUTATE_SERVER_CAP_BASELINE` (eval line 293) is a ceiling that must
  equal the committed justfile `mutate-server cap=` default; both move together.
- ADR-0050 A2: cap bumps must be justified in a commit touching ADR-0050.
- ADR-0118 §4 procedure: measure at slice head; per-file diff of `missed.txt`
  against the previous baseline; growth inside OLD code = test regression
  (investigate, don't re-baseline); classify survivors legitimate-shell
  (`#[reducer]` body or `&ReducerContext`-taking helper → un-killable in-crate)
  vs weak-test (pure, in-crate-testable → must be killed).
- EVERY non-test `server-module/src/*.rs` file changed since `9ef0b03`, so there is
  no unchanged-file shortcut: a full re-run at `9ef0b03` was required to produce
  the old per-file survivor map. Both runs executed locally, same host/toolchain.
- Decision-hook `mdrewt/claude-harness#14` OPEN/UNANSWERED → implement the
  reversible default only: a failure-policy COMMENT on `mutation`,
  `mutation-server`, `coverage`, mirroring smoke-republish (nightly.yml:78-81).
  No Action/webhook/issue step (irreversible pre-emption).

## Mechanical facts (verified)

- `extractJobBlock(yaml, job)` starts at `  <job>:` and STOPS at the next indent-0
  or indent-2 line ⇒ a preamble comment above the key is outside the block, and an
  in-block 2-space comment TRUNCATES the block. It has 10 callers across 4 eval
  files ⇒ editing it is a hidden-dependency STOP; the new predicate is
  self-contained.
- `jobIsNotNeutered` rejects any trimmed line starting with `if:` ⇒ no
  `if: failure()` step may be added to these three jobs.
- No `new RegExp(...)` anywhere (semgrep `detect-non-literal-regexp`, 3 prior bites).
- ADR back-link gate (`evals/adr-backlink-corpus.eval.mjs`, FROZEN_BASELINE = 5)
  requires a reciprocal `**Amended-by:** ADR-0183` in every ADR that 0183 amends.
- `just adr-digest` must be re-run and `docs/adr/DIGEST.md` committed.

## Tasks (ordered, test-first)

- **T0 (orchestrator)** — measurement intake: totals + `missed.txt` at head and at
  `9ef0b03`; per-file survivor delta; per-survivor classification.
- **T1 (tester, RED)** — `evals/nightly-smoke-wiring.eval.mjs`: new self-contained
  predicate `jobHasFailurePolicyComment(yaml, jobName) → {ok, reason}` + TEETH M
  block (M1, M2a, M2b, M3 mis-attribution, M3b backtick-substring, M4
  non-contiguous, M5 in-block 6-space + 2-space truncation, M6 commented-out key,
  M7 header bleed; positives M-good-1/2/3) + real-file Checks 14/15/16.
- **T2 (specialist, GREEN)** — append the policy lines to the contiguous 2-space
  comment preamble above `mutation:`, `mutation-server:`, `coverage:` in
  nightly.yml. No steps, no `if:`, no `continue-on-error:`, nothing inserted
  inside a block.
- **T3 (orchestrator)** — mutation bite-proofs: delete a preamble → RED; move a
  preamble inside the block at 6-space → RED; at 2-space → RED (+ block checks
  RED); swap the backticked job name → RED.
- **T4** — cap disposition per the decision rules below (justfile header + baseline
  comment, eval constant, boundary teeth re-pointed, all in ONE commit).
- **T5 (doc-keeper)** — `docs/adr/0183-*.md`, reciprocal `**Amended-by:**` links,
  ADR-0050 A2 dated bullet + history reconciliation, `just adr-digest`.
- **T6** — full `just ci` (PATH export), then PR.

## Predicate design (`jobHasFailurePolicyComment`)

1. Find the job key exactly as `extractJobBlock` does (`  <job>:` or
   `  <job>: `); absent → `{ok:false}`.
2. Walk UPWARD collecting contiguous lines that are indent-2 comments; stop at the
   first blank/non-comment/other-indent line. Lowercase the join.
3. Require all three: (a) the phrase `failure policy`; (b) a routing keyword
   (`next slice` | `queue` | `priority`, same vocabulary as `adrHasFailurePolicy`);
   (c) self-attribution via the BACKTICKED job name (`` `coverage` ``) — backticks
   stop `mutation` ⊂ `mutation-server` substring bleed without a regex.

Forecloses: whole-file keyword scan; incidental "failure" prose (the
mutation-server preamble already contains the word); per-job mis-attribution;
substring bleed; commented-out job keys; in-block placement.

## Task-1 decision rules

- **Gate 0 comparability** — if the `9ef0b03` re-run does not reproduce ≈299, the
  local run is not comparable to the committed baseline ⇒ NO cap move; record the
  methodology delta instead. A cap from a non-reproducible run is a fabricated
  ratchet.
- **Gate 1 localisation** — `NEW = S_head \ S_base`; growth in unchanged-source
  files is a test regression, never re-baselined.
- **Gate 2 classification** — each NEW survivor: legitimate-shell vs weak-test.
- **D1** all-legitimate-shell → cap := exact head measurement, ceiling in lockstep.
- **D2** some weak-test → re-baseline WITH NAMED DEBT: enumerate each weak-test
  survivor by file:line + signature in the ADR, declare the cap debt-carrying with
  an explicit ratchet-down target, and name the follow-up kill slice. Never silent
  absorption (server-module is outside this slice's touches).
- **D2′** weak-test is the MAJORITY of the delta → PARK the cap at 299, ship Task 2
  only, ADR records the verdict; the kill slice comes first.
- **D3** head < 299 → ratchet DOWN to the exact measurement.

## Anti-patterns to refuse

Cap headroom · silent absorption of killable survivors · ceiling drift (moving one
of the two coupled numbers) · toothless soft-fail (`continue-on-error`,
`if: failure()`, `|| true`, `--shard/--file/--exclude-re/-o/--output`) ·
whole-file keyword scan · comment inside the job block · pre-empting harness#14
with a notification step · green-by-fixture teeth · reusing `adrHasFailurePolicy`
on YAML · rewriting older ADR bodies instead of amending forward.

## Risks

R1 `extractJobBlock` is shared (4 evals) — do not touch. R2 back-link reciprocity
must land in the same commit. R3 DIGEST drift fails `just ci`. R4 measurement
incomparability. R5 boundary teeth hard-code 299/300/309 and must be re-pointed.
R6 remote-only Semgrep/gitleaks read the new YAML comments — plain prose, no URLs,
no "key". R7 stale prose in ADR-0154/0124 (no eval reads it; amend forward only).
R8 the justfile baseline-history comment is unguarded — reviewer eyeballs it.
R9 the first post-merge nightly is the only real acceptance evidence.
