# rb-42 plan — R-rb-26-X9-spec-false-premise

Base: origin/master `f53ece2`. Worktree `.claude/worktrees/rb-42`, branch `fix/rb-42-x9-spec-false-premise`.
Repo: **project** (`mdrewt/monster-realm`). No ADR number reserved (supervisor assigned `None`)
=> amend an existing ADR in place (rb-41 precedent), mint nothing.

## 1. The residual, verbatim

From `memory/projects/gates/rb-26.gates.md`:

> DEFER: X9-spec-false-premise -> backlog — `specs/monster-realm-v2/M-residual-backlog.spec.md:65`
> still states that no ADR number was reserved for R-rb-3-X9. Harness repo, `mr-gates residuals
> promote` generator output, supervisor-owned — outside this slice's touches. Also: R-rb-2-X9 and
> R-rb-3-X9 were both closable against PR #380 and were never closed, which is how a stale residual
> reached promotion; the closure step is the defect, not the residual.

## 2. Measured at slice head `f53ece2` — the launch brief's premise is STALE

The launch brief restates rb-26's OWN scope (residual R-rb-2-X9: "the four consumers that STATE
[the typeof inference] SHALL be corrected"), not the X9 defer above. Two independent lenses
(`planner`, `researcher`) measured the four consumers at head. **All four are already corrected**:

| Consumer | Location | State |
|---|---|---|
| seam eval header | `evals/rekey-contract-surface.eval.mjs:41-48` | past tense; names rb-4 retiring the Rust twin |
| Rust T9 twin | `server-module/src/accounts_tests.rs:4319-4328` | past tense + `ADR-0208 D1` back-pointer |
| ADR-0207 x4 | `docs/adr/0207-*.md:19, :109, :113, :158` | `:109` rewritten in place; `:19/:113/:158` carry `**[RETIRED — …]**` escorts |
| ARCHITECTURE.md | `ARCHITECTURE.md:112` (`**rb-2**`), `:158` (`**rb-3**`) | both cite `ADR-0208 D1`/`D2` |

Corrected by **rb-4 (PR #380)** and **rb-26 (PR #400)**. The `researcher` sweep over the whole repo
(13 patterns, node_modules/target/dist excluded) found **zero remaining STALE assertions**.

The second half of the defer is also discharged: `mr-residuals.jsonl` now carries
`R-rb-2-X9` and `R-rb-3-X9` both at `"status": "closed"`.

**=> The EARS criterion is already satisfied, and it is already under a biting gate**: the
`[T4/*]` doc-tie clause family in `evals/rekey-contract-surface.eval.mjs` (`checkRetiredRegion`
:862-890, `checkD5Instruction` :925-954, `checkArchParagraph` :969-1016) mechanically reds if any
of the ADR-0207 or ARCHITECTURE.md regions regress. No new test is warranted for it.

## 3. What is genuinely still open

**(i) IN touches — the declared back-link debt.** `docs/adr/0208-*.md:1-9` carries `**Amends:** —`
and **no** back-link of any kind. Two ADRs declare a relation to it and explicitly park the
reciprocal edit with byte-identical text:
- `docs/adr/0223-*.md:8` — `**Extends:** ADR-0208 (no reciprocal back-link edit — `docs/adr/0208-*` is outside this slice's declared touches)`
- `docs/adr/0222-*.md:9` — same parenthetical (rb-25)

`docs/adr/**` IS in rb-42's touches, so rb-42 is the slice that can discharge it.

**(ii) OUT of touches — harness repo.** `specs/monster-realm-v2/M-residual-backlog.spec.md:175`
still states "no ADR number was reserved for rb-3 (the supervisor-assigned slot is empty)".
Supervisor-owned generator output. **DEFER.**

**(iii) OUT of touches — production tooling.** `scripts/adr-digest.mjs:203-204` calls
`extractBacklinkField` for `'Amends'` and `'Amended-by'` ONLY. `Extends`/`Extended-by` is in
**no** validated vocabulary: no reciprocity check, and no dangling-reference check either
(`checkRefs` runs on Supersedes/Amends/Superseded-by/Amended-by only, :337-340), so a dangling
`**Extends:** ADR-9999` passes green today. 8 ADRs use `**Extends:**` (0222, 0223, 0227, 0229,
0230, 0231, 0234, 0235) naming ~20 targets. **DEFER** — mechanising it needs ~15 reciprocal
header edits plus its own baseline ratchet + frozen duplicate + fixture teeth: a 12r-f-sized
slice, not a doc-only one.

## 4. Proof-of-teeth vehicle — ADR-0224 governs, and it forbids the obvious move

`planner` proposed adding a `[T4/backlink]` clause to `evals/rekey-contract-surface.eval.mjs`.
**Rejected.** ADR-0224 (Accepted 2026-09-01, supersedes ADR-0010) is explicit:

> Existing evals keep running until migrated; migration is opportunistic — when a slice touches
> code adjacent to an eval, port that specific invariant into a real test and delete the eval,
> **never patch the scanner further.**

and the launch brief repeats it: "no new eval, no scanner-script gate (ADR-0224); if a genuine
test is warranted for the corrected invariant, write an ordinary Rust/TS test, not a script."

The sanctioned alternatives were each assessed:
- **ordinary Rust `#[test]`** — no crate owns a markdown header relation. N/A.
- **ordinary node `--test` sibling** (precedent: `scripts/changelog-freshness.test.mjs`,
  `ops/observability/validate.test.mjs` wired at `justfile:44`) — the natural home is
  `scripts/adr-digest.test.mjs`, but BOTH `scripts/adr-digest.mjs` and `justfile` are **outside
  touches**, and a sibling-test companion only extends to *declared* code files. Wiring a new
  recipe into `just ci` is a hidden-dependency STOP.
- **port + delete the T4 clause** — genuine ADR-0224 migration, but needs the same out-of-touches
  justfile wiring and is a slice of its own.

**=> Per ADR-0224's own fallback** ("anything not naturally test-shaped becomes an explicit
reviewer / domain-auditor checklist item at review time, not a CI gate"), the back-link repair
ships as a **reviewed doc edit with the mechanisation DEFERred to backlog**, not as a bespoke
scanner clause. This is disclosed in the ledger, not hidden: gate X2 is `MANUAL:` with a
resolvable `path:line`, and X6 records honestly that reverting the repair reds nothing today —
which is precisely the argument for the deferred mechanisation.

## 5. The increment (smallest coherent, all in touches)

1. `docs/adr/0208-*.md` — insert ONE header line after `**Amends:** —` (line 7), column 0:
   `**Extended-by:** ADR-0222, ADR-0223`
   Unindented + own line is load-bearing: `extractBacklinkField` (:415-433) absorbs indented
   continuation lines into the preceding field's value, and a value-parenthetical form parses to
   nothing under `splitTopLevelCommas`/`resolveRelationIds`.
2. `docs/adr/0223-*.md:8` — rewrite the now-false parenthetical in place.
3. `docs/adr/0222-*.md:9` — same.
4. `docs/adr/0223-*.md` — amend in place (no new number): re-point escalation 1 to the live line
   (`:175`), mark escalation 2 DISCHARGED (both residual rows closed), and record rb-42's
   close-out + the two DEFERs in Consequences.

**Explicitly NOT touched:** `evals/**` (ADR-0224), `scripts/adr-digest.mjs` (out of touches),
`justfile` (out of touches), `ARCHITECTURE.md` (nothing architectural changed — YAGNI, and a new
`**rb-N**` paragraph would interact with `[T4/arch]`'s paragraph-boundary scan),
`CHANGELOG.md` (git-cliff generated), `docs/adr/README.md` (supervisor-owned, forbidden).

**Do NOT convert `**Extends:**` -> `**Amends:**`.** ADR-0223 D1 states it "adds no technical
content and deliberately does not restate" ADR-0208; relabelling it an amendment would falsify
the record and would additionally demand a reciprocal `**Amended-by:**`, moving the ratchet.

## 6. Blast radius (measured, not assumed)

- Adding `**Extended-by:**` moves **nothing** in the Amends/Amended-by tally:
  `BASELINE_TOLERATED_COUNT = 5` (`evals/adr-backlink-corpus.eval.mjs:166`), `FROZEN_BASELINE`
  (:364), `KNOWN_BACKLINK_GAPS` (`scripts/adr-digest.mjs:75-81`), and
  `evals/adr-backlink-integrity.eval.mjs` TOOTH 8 (`0168->0166`, `0172->0157`) / TOOTH 17
  (`0169->0154`) — none names 0208, 0222 or 0223.
- **DIGEST.md does not change.** `generateDigest()` (:636-745) emits only
  ID|Title|Status|Subsystems|Slice|Decision; relation fields never reach it. No regen commit.
- `docs/knowledge/**` is generated from server-module source (`justfile:496-497`), not ADRs. No regen.
- Zero `ADR-0208:<line>` citations exist in the project repo. THREE exist in HARNESS memory (the
  plan first counted two; the red-team's repo-wide sweep found the third):
  `monster-realm-rb-26-plan.md:36` (`ADR-0208:30-34`), `:86` (`ADR-0208:31`), and
  `monster-realm-handoff-archive-2026-09.md:21` (`0208-…md:111-124`). All drift by +1 — non-gated,
  out of touches, disclosed as a DEFER rather than silently absorbed.

## 7. Anti-patterns to avoid (each has bitten this repo)

1. **Doc prose that QUOTES a uniqueness-pinned marker plants a second occurrence.** Do NOT spell
   the bold field markers in ADR body prose or in the rewritten parentheticals. Write "reciprocal
   back-link", never the literal field token.
2. **Never indent the new header line.** (Mechanism corrected by the plan-phase red-team, which
   probed the real parser rather than reading it: an INDENTED but still bold-marked line is NOT
   folded into the preceding field — `extractBacklinkField`'s continuation loop breaks on any line
   containing `**`, so the line is dropped ENTIRELY and both fields go invisible. The genuine
   folding hazard is an indented BARE-TEXT continuation with no bold markers, which does resolve as
   extra targets of the preceding field. The planned edit always carries its own bold marker, so it
   risks the drop, not the fold. "Do not indent" stands; the reason is different.)
3. **Never write `**Amended-by:** …` on an in-era ADR without a reciprocal `**Amends:**`
   declaration in an existing file** — that mints a `<-` gap and reds `just ci`
   (`scripts/adr-digest.mjs:536-548`). rb-42 mints no ADR, so nothing could legally declare it.
4. **Do not touch `KNOWN_BACKLINK_GAPS`.** It may only shrink; `FROZEN_BASELINE` asserts set
   EQUALITY. If the edit seems to need it, the design went wrong.
5. **Line citations drift on header insert.** Inserting at 0208:8 shifts every later 0208 line by
   one — enumerate inbound citations BEFORE editing (done, §6).
6. **ADR `Amends:` forces a reciprocal back-link edit** — the exact hidden-dependency STOP shape
   this slice is repairing. Do not create a second one.

## 8. Workflow

solo edit + `reviewer` / `red-team` / `/simplify` on the plan, `tester` (adversarial: confirm the
existing T4 teeth still bite and report honestly that the back-link repair has no CI tooth), then
the parallel review batch + `verifier`, then `doc-keeper`. Full `just ci` once, pre-PR.
