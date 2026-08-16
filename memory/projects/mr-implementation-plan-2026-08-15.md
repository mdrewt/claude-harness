# Monster Realm Build-Loop Remediation — Implementation Plan

**Version:** 7 (reconciled) · **Date:** 2026-08-16

> **READ THIS FIRST.** Six revisions accumulated as append-only patches, which left the wave sections
> below describing a design that revisions 2–6 had already superseded — the same stale-prose defect
> this plan exists to fix. **PART A below is the authoritative execution view.** Sections 1–15 that
> follow it are retained as the audit trail (rationale, measurements, refutations) and are
> **superseded wherever they disagree with Part A.**

---

# PART A — THE EXECUTION VIEW (authoritative)

## A.0 What reconciliation changed

**A circular dependency I introduced in Revision 2, found only by reconciling.** Rev 2 stated
"W0-0 stops being an attended session and becomes tick-mode `SPEC`". But SPEC mode requires the tick
ladder and `mr-ready` (`lp-08`), which live in **Wave 2** — whose entry requires Wave 1 — whose entry
requires **W0-0 merged**. The loop cannot author the spec that describes building the thing that
authors specs.

**Resolution: W0-0 stays ONE attended bootstrap session.** Automated SPEC mode arrives in Wave 2 and
handles every *subsequent* spec. The operator's directive is satisfied — the loop authors its own
specs from Wave 2 onward — it just cannot bootstrap itself. Cost: one session, once.

Four other reconciliations, each folding a revision into the wave it actually affects:

| # | change | source |
|---|---|---|
| 1 | `lp-11a` (a CodeGraph line in the brief) is **absorbed into `lp-skills`** — a brief-level skill-dispatch table keyed to `touches:`. A one-off line for one skill was the narrow version of a general defect | Rev 6 |
| 2 | The disposition-marker check **folds into `lp-04`**, which already opens `mr-audit`. It is not a separate mechanism — the grammar and the audit owner were already specified and never built | Rev 3 G3 |
| 3 | **`15r-sec-vis` is new and sits in Wave 3 immediately after `15r-sec-a`** — adding `visibility` to the schema snapshot is the regression gate for the public-table class. Fixing `battle` without it leaves the next table unguarded | Rev 4 |
| 4 | `lp-12`'s band design is **replaced** by the p90 lookahead, with fail-closed priors for modes that have no cost history | Rev 2 R2-3, Rev 3 G5 |

## A.1 The reconciled wave table

Legend: **[+]** new since the base plan · **[Δ]** materially changed · unmarked = as originally specified.

### Wave 0 — bootstrap *(entry: none · ~1 slice + free reads)*
| slice | what | note |
|---|---|---|
| W0-0 **[Δ]** | Attended session: author `M-postgate-fifteenth-review-residuals.spec.md` + `M-loop-infrastructure.spec.md` | **Stays attended** — breaks the Rev-2 circularity. Uses `/spec` + `spec-kit` *explicitly invoked*, never model-dispatched |
| W0-1..W0-8 | Offline replays and settled reads | ~0 credits |
| W0-Q **[Δ]** | Issue the blocking questions | **Now 3, not 5** — Q-B5 answered by the Tier A/B/C directive; Q-B3 answered by measurement |
| W0-audit **[+]** | Record the skill-invocation baseline | Already captured in Rev 6's table; just pin it as the before-number |

### Wave 1 — instrument, never gate *(entry: W0-0 merged · ~11 slices)*
| slice | what | note |
|---|---|---|
| lp-01 | Read and persist `seven_day.utilization` | The cost SSOT |
| lp-02 **[Δ]** | Ledger columns + slice-size denominator | **Adds** production-source lines added/deleted, and skill-invocation counts — the outcome half of Rev 6's confirm step |
| lp-03 | Nightly failure notification | Zero dependencies; ships first if anything slips. **Prerequisite for any `#[ignore]` test** |
| lp-04 **[Δ]** | `mr-audit` policy/detector split | **Adds the disposition-marker check** (Rev 3 G3) — same file, same slice |
| lp-05 · lp-06 · lp-07 | validate.mjs + docker; `mr-backup` + stray-handoff; PATH | Insurance |
| lp-skills **[+][Δ]** | **Brief-level skill dispatch keyed to `touches:`** — `server-module/**`→`spacetimedb-reducer`, `game-core/**`→`game-core-testing`, `client/src/net/**`→`spacetimedb-client`, `client-wasm/**`→`wasm-boundary`, spec work→`spec-kit`, navigation→`code-intel` | **Absorbs `lp-11a`.** Single lines only (RF-4) |
| lp-brief-cost **[+]** | Fix `mr-brief-template.md:21` "Budget is ample — favor thoroughness over frugality" and `:33`'s false 125% ceiling | Keep the thoroughness preference; delete the false premise |
| lp-ollama **[+]** | **Delete** the per-tick ollama preflight; keep `mr-ollama` for manual use | Rev 5 N1 — 803 warm-ups, 0 invocations |
| 15r-a′ | Scanner-audit cap advisory, not exact-equality | Prevents four Wave-3 slices racing on one line |
| lp-doc-a | Close the 46 obsolete residual prose items | |

### Wave 2 — stand-down, kill switch, and a sink *(entry: Wave 1 exit · ~7 slices)*
| slice | what | note |
|---|---|---|
| lp-08 **[Δ]** | `mr-ready` + the **tick-mode ladder** (RECONCILE / IMPLEMENT / SPEC / MILESTONE / HOLD) | **Parses inline `touches:`/`after:`, NOT `## Touches`** — 1 of 59 specs uses the documented token, 42 use inline (G1). Pacing outranks ready-set. RECONCILE is budget-exempt but carries a **`RECONCILE-STUCK` counter** (G13) |
| lp-09 **[Δ]** | Kill-switch provenance | Provenance on `rm`, never `touch`; zero-byte defaults to OPERATOR; **do not neuter `MR_FORCE`**. **Adds** distinct HOLD reasons and **re-arming `mr-decision-watch` past its 7-day cap** (G6) |
| lp-10 | Reboot-only PID guard | |
| lp-11 | Three named doctrine bug fixes | After lp-08 and lp-09 |
| lp-registry **[Δ]** | Structured residuals with a sink | **Implements the EXISTING grammar** `parked → <queued spec id \| wontfix>`; **seeded with a disposition on all 329 items** (N3 — zero dispositionless rows when the check arms); **playtest-feedback files are a source** (N2) |
| lp-spec-mode **[+]** | SPEC + MILESTONE modes | **Explicit skill invocation, never model dispatch** (Rev 6). Output path **pinned to `specs/monster-realm-v2/`** (G2). Tier-C allowlist is a `spec_authoring_allowlist` array in `mr-state.json`, **empty by default** (G12) |
| lp-disjoint | Effective-touches computation | |

### Wave 3 — security and scanner integrity *(entry: Wave 2 exit; `15r-sec-a` exempt · ~8 slices)*
| slice | what | note |
|---|---|---|
| 15r-sec-a | Participant-scoped `battle` | **CRITICAL, live exposure.** May land as soon as W0-0 and W0-6 are done |
| 15r-sec-vis **[+]** | **Add `visibility` to the schema snapshot + a declarative invariant table** | **The regression gate for the whole public-table class.** Without it, `15r-sec-a` fixes one table and leaves the next unguarded — which is how ADR-0042 was violated by M16 |
| 13r-c-2 | Trade-family scanner migration + concat unblock | Orphan, now specced. Gates M21b-2's deploy |
| 15r-sec-mig-a/b/c/d | The remaining blind gated evals, then retire the park machinery | **Seven, not six** |
| 15r-d | Retire the `concat!()` dodge **and the comment instructing its retention** | Strictly after 13r-c-2 |
| 15r-g · 15r-f | `.gitattributes` + driver + selfcheck; branch protection | `15r-f` sole in-flight, with a canary PR |

### Wave 4 — testing capability *(entry: Wave 3 exit incl. `15r-f` · ~6 slices)*
| slice | what | note |
|---|---|---|
| 15r-h1 **[Δ]** | Pure-seam extraction as the primary idiom | **Cites `game-core-testing` + `spacetimedb-reducer` as governing doctrine** (G7) rather than re-deriving. Externally corroborated by both testing sources |
| 15r-h2 **[Δ]** | CLI harness for the irreducible residue | **Adopts the upstream blueprint** — fresh publish to an empty DB per test, single codegen pass. **`#[ignore]` + nightly + `--test-threads=1`**, which requires `lp-03` |
| 15r-consolidate **[+]** | **Collapse the 23 schema-scanning evals onto `15r-sec-vis`'s invariant table** | 26,876 lines, 28.7% of eval LOC. The single largest subtraction available |
| 15r-i **[Δ]** | Retire a subsystem's costume scans | **Net-reduction target with a counter**, replacing "under-30% is a correct result". Deletion coupled to extraction |
| 15r-e | Widen the audit's gated set to enforcing | |

### Wave 5 — credit levers *(entry: Wave 1 exit + one full reset cycle; Wave 4 complete · ~4 slices)*
| slice | what | note |
|---|---|---|
| lp-12 **[Δ]** | **p90 lookahead, spend to ~99%** | **Replaces the band design and the 3/week cadence.** Fail-closed priors for SPEC/MILESTONE, which have no cost history (G5). Launch gate, never a kill |
| lp-13 | Arm the cordon | Cooperative stop-flag only |
| lp-14 | Bounded context segmentation | Fresh spawn, not `--resume` |
| 15r-tst-i **[Δ]** | Mutation survival-**rate** ratchet per module | **Adds: pin the cargo-mutants version** (G11) — currently installed unpinned |

### Waves 6–7 — backlog and meta
Wave 6 drains the CRITICAL/HIGH backlog (~25 above the cut). Wave 7 is ≤1 slice/week: `lp-15`
ceremony retirement **driven by `just audit`'s verdicts** (G9) and **sequenced after `lp-registry`
takes over playtest feedback** (N2); `lp-17`'s weekly report **pairs each skill count with the outcome
it should move** (Rev 6); plus `lp-16`, `lp-18`, `lp-19`, `lp-worktree`, `lp-20`.

## A.2 Ordering constraints — the non-negotiables

1. **Instrument → one full reset cycle → gate.** Never the same slice, never the same week. The v3
   cutover replaced its own instrument in the same commit and is permanently unevaluable.
2. **`lp-03` before any `#[ignore]` test.** An ignored test in an unwatched job is the
   "gate that has never failed" anti-pattern.
3. **`lp-registry` (with playtest intake) before `lp-15`** retires `mr-feedback`.
4. **`13r-c-2` before `15r-d`.** Removing the dodge against a broken scanner produces a false GREEN on
   a security gate — strictly worse than the dodge.
5. **`15r-sec-vis` with or immediately after `15r-sec-a`.** A one-table fix without the class gate
   invites recurrence.
6. **`lp-02` before any new gate.** The measurement must exist before the thing it measures.
7. **Every wave boundary is a safe resting point** — execution will be interrupted by a credit pause.

## A.3 Honest status of the estimate

Roughly **40 slices** for Waves 0–5, up from 34, with the additions concentrated in Wave 1 (cheap,
brief-only) and Waves 3–4 (the consolidation work that pays for itself in corpus reduction). **The
duration is no longer expressed in weeks**, because Revision 2 withdrew the fixed cadence: the loop
runs until the p90 lookahead says stop, so throughput is whatever the allowance supports. The
previously stated "~21 weeks" assumed 3 slices/week and should be read as an upper bound, not a
schedule.

---

# REVISION 2 — 2026-08-16 (operator directives + external testing research)

**This section supersedes the parts of the plan it names.** Four changes, all from operator input.

## R2-1 — Spec authoring becomes AUTOMATED. W0-0 is no longer an attended blocker.

**Supersedes:** Executive Summary item 1; §1 W0-0; §13.1 Q-B5; §15.

Operator directive: the loop should attempt milestone and spec authoring itself, using the existing
skills, and raise questions/decisions through the GitHub-issue mechanism.

The mechanism already exists on all three legs and none of it is new work:
- **Doctrine:** `.claude/skills/spec-kit/SKILL.md` + `standards/spec-driven.md` + `.claude/commands/spec.md`.
  Flow is Spec -> Plan -> Tasks -> Implement; EARS acceptance criteria; narrow `touches:` per slice.
- **Question channel:** `mr-ask-drew` — measured 11/11 answers captured, zero lost, and the
  close-the-loop `<!--mr-system-->` discipline already added 2026-07-27.
- **Precedent:** the weekly review is already unattended spec authoring and the post-mortem lists it
  under WORKING WELL as "the only thing that reliably produces launchable work".

**Graduated by precedent, because the risk is not uniform:**

| tier | what | precedent | mode |
|---|---|---|---|
| **A** | residual specs from verified findings (the 15r-* set, and the 329 OUTSTANDING triaged items) | **proven** — 15/15 merged, 14/15 first-attempt | unattended; PR; merge on green |
| **B** | milestone spec where the design is already decided (an Accepted ADR exists) | moderate | unattended; PR; **async operator review before merge** |
| **C** | fleshing out a skeleton milestone with open design space (M22–M25, 37/37/34/40 lines) | **zero precedent in the corpus** | unattended **draft only**; every architectural/irreversible decision becomes an `mr-ask-drew` issue; PR never auto-merged |

**Hard constraint carried from `spec-kit/SKILL.md`'s own gotcha list — this prevents the obvious failure:**
> "Over-speccing far-future, playtest-dependent milestones -> the detail gets reshaped before it is
> built. **Avoid:** full fidelity for the next build phase only; sketches + ADRs for later milestones."

So a milestone-authoring tick elaborates **exactly one** milestone — the next one needed — never the
M22–M25 block. Tier C ships with an allowlist that starts empty and grows one milestone at a time.

**Decision discipline is unchanged and already correct:** reversible scope/content choices take the
documented default and proceed with `decision-defaulted:<q>=<choice>` recorded; irreversible,
architectural, security or spec-contradicting choices become issues. Spec authoring simply has a
higher ask-ratio than implementation, which is expected, not a defect.

**Consequence:** W0-0 stops being an attended session and becomes tick-mode `SPEC` (below). Q-B5 is
ANSWERED by this directive. §15's "the single most likely way this plan fails" is retired as stated —
the loop can now write its own specs — and is replaced by R2-5 below.

## R2-2 — One task type per tick (tick modes)

**Supersedes:** §3 lp-08's gate design; adds a constraint to every wave.

Operator directive: each tick does exactly one of MILESTONE / SPEC / IMPLEMENT, to create safe
stopping points.

Mode ladder, evaluated in order; the tick commits to the first eligible mode and does nothing else:

| # | mode | fires when | terminal state |
|---|---|---|---|
| 0 | `RECONCILE` | a finished run needs merging, or CI/state needs reconciling | merged / state consistent (**always FREE-tier, never blocked by budget — it harvests credits already spent**) |
| 1 | `IMPLEMENT` | `mr-ready` names a launchable slice AND budget lookahead passes | one slice launched |
| 2 | `SPEC` | no launchable slice, but a milestone with a spec-less decomposition exists | one spec PR |
| 3 | `MILESTONE` | no spec-able work, and the next-needed milestone is a skeleton on the Tier-C allowlist | one milestone draft PR + issues |
| 4 | `HOLD` | budget exhausted, or only operator-blocked work remains | logged reason + wake condition |

This also fixes a defect the plan had not addressed: the current "merge then launch in the same tick"
composite is what trips the loop's own activity probe on its own ff-only merge writes (7 of the 72
false positives). Separating `RECONCILE` from `IMPLEMENT` removes that class structurally.

`HOLD` must record which of the two causes applies — they have opposite resolutions, and conflating
them is the same mistake the zero-byte kill switch made.

## R2-3 — Budget policy: spend to ~99%, stop by lookahead. The 3-slices/week cadence is WITHDRAWN.

**Supersedes:** §9 in full (cadence, the table, and the LOW-confidence resolution); `lp-12`'s band design.

Operator directive: using ~99% of the weekly allowance is *desired*; the loop should work until the
estimated cost of the next task exceeds the remaining allowance, then make no further costly calls
until reset.

This is strictly better than the withdrawn 3/week guess and removes the plan's weakest judgement.

```
before starting any COSTLY tick mode (IMPLEMENT / SPEC / MILESTONE):
    remaining_pp = CEILING_PP - utilization_now        # CEILING_PP = 99
    est_pp       = p90_cost_pp(mode, tier)             # p90, never the mean
    if est_pp > remaining_pp:  -> HOLD(reason=budget, wake=resetsAt)
    else:                      -> proceed
RECONCILE is exempt: it harvests already-spent credits and costs ~$2/tick.
```

Four design points, each load-bearing:
1. **p90, not mean.** The measured spread is wide ($21.40 to $274.37). A mean-based lookahead
   overshoots the ceiling roughly half the time, and overshoot buys overage.
2. **A launch gate, never a kill.** Consistent with D1 and with NOT-DOING #1. A slice already running
   finishes; `RECONCILE` still merges it.
3. **1% headroom is deliberate.** It absorbs quantisation (whole-percent) and lag in the gauge.
4. **Targeting ACCOUNT-WIDE utilization makes the loop self-yielding.** Because `seven_day.utilization`
   already includes the operator's usage on other machines, a ceiling of 99% *account* utilization
   means heavy personal use automatically shrinks the loop's share with no extra mechanism.

**This downgrades Q-B1 from BLOCKING to attribution-only.** Control no longer needs to know the
harness's share — only the *lookahead* needs a slice-to-pp conversion, and that is measured directly
as p90 delta-utilization per tier from `lp-01`. Knowing the split remains useful for reporting, but
it no longer gates `lp-12`.

**Waves keep their entry/exit gates.** Ordering constraints are about correctness (instrument ->
cycle -> gate), not about rationing, and R13 still has no negotiable version. What changes is that a
wave finishes when its slices are done, not when a weekly quota is met.

## R2-4 — Testing plan updates from two external sources

**Supersedes:** §5 `15r-h1`/`15r-h2` details. Sources: `memory/spacetime-db-testing.md` (local) and
the SpacetimeDB fork's `TESTING.md` (upstream repo test infrastructure).

**Both sources independently confirm the plan's central testing decision.** There is no in-process
reducer test harness for module authors, and *extract pure logic into standard helpers, then
`cargo test`* is the primary recommended strategy. `15r-h1` (pure-seam extraction as the primary
idiom) is therefore externally corroborated, not merely inferred from `raising_tests.rs`.

**Upstream's own harness gives `15r-h2` a proven blueprint** (`crates/testing/src/sdk.rs`): build and
**freshly publish the module to a short-lived, initially-empty database per test**, `spacetime generate`
the client bindings, run the client as a **subprocess reporting via exit code**, with a **single
codegen pass amortised across all tests**. Adopt this shape:
- fresh empty DB per test solves the isolation problem the plan had not addressed;
- one codegen pass makes the harness affordable;
- exit-code reporting is exactly the vacuous-green risk R5 already guards — keep all three defences
  (substring pin, positive control, stable error token), because *upstream's own pattern has the same
  weakness*.
- Related upstream prior art if the harness needs to grow: `crates/testing/tests/standalone_integration_test.rs`
  (publish, invoke reducers, inspect logs) and `crates/smoketests/` (CLI/e2e).
- **Caveat, stated plainly:** this is how SpacetimeDB tests *itself*. It is a blueprint, not a
  supported module-author API, and it may drift between versions. Pin to 2.6.0 behaviour and verify.

**NEW — `#[ignore]` resolves a real tension in the plan.** Wave 4 requires a replacement test to run
in a **required status check** (`ci`), but a publish-per-test harness is far too slow for the fast
job. Resolution: fast pure-seam tests run in `ci` (required); slow harness tests are `#[ignore]`-gated
and run via `cargo test -- --ignored` in a separate nightly job. **This only works because `lp-03`
(nightly failure notification) exists** — an ignored test in an unwatched job is precisely the
"gate that has never failed" anti-pattern. Sequence `lp-03` before any `#[ignore]` test lands.
Also add `-- --test-threads=1` for harness tests: they share one local instance.

**NEW — `insta` snapshot testing is a better replacement for the manifest-count tests.** The
"15->16 overlays" count assertions are weak teeth. A snapshot of the actual structure catches
*what changed*, not merely *that the number moved*, and reviews as a readable diff. Add as an option
inside `15r-i` rather than a separate slice.

**Corroborated:** `proptest` for the deterministic rule domains (battle resolution, evolution gating,
economy, escrow) — already in the research findings, now independently confirmed.

**Explicitly NOT adopting `mockall`:** it mocks **traits**, and `ReducerContext` is a concrete struct.
It does not apply to the ReducerContext-test-double route. Recorded so no future slice spends credits
discovering this.

## R2-5 — The most likely way this plan now fails

§15's answer is retired: the loop can now author its own specs. The replacement risk is
**Tier-C over-speccing** — an unattended milestone tick elaborating far-future, playtest-dependent
design that gets reshaped before it is ever built, burning allowance on detail with no consumer.
The mechanisms against it are already stated: one milestone per tick, an allowlist that starts empty,
`spec-kit`'s own full-fidelity-for-the-next-phase-only rule, and every architectural decision going to
an issue rather than being invented.

**Early warning:** a Tier-C spec PR merging with zero `mr-ask-drew` issues raised. That means the
model invented decisions instead of asking, and it is the signal to pull the milestone off the allowlist.

---


---

# REVISION 3 — 2026-08-16 (second full review)

Review lens: *where does the plan invent something the harness already specifies, and what did
Revision 2 break downstream?* Thirteen findings, all verified against the tree.

## BLOCKER — these would make a Wave-2 slice produce nothing

### G1 — `mr-ready` would find nothing. The documented contract is not the one on disk.
`standards/spec-driven.md` defines a canonical skeleton whose heading tokens "are the contract —
consumers (the supervisor, fan-out eligibility, close-out) match the token", including `## Touches`.
**Measured: exactly 1 of 59 spec files uses `## Touches`; 42 use an inline `touches:` line.**
`mr-ready` built against the documented contract returns an empty ready-set and the loop concludes
"nothing launchable" — reproducing the exact bug it exists to fix.
**Fix:** `mr-ready` parses the *actual* convention (inline `touches:`/`after:`) and treats the heading
token as an accepted alias. A format migration, if wanted, is a separate later slice and is NOT a
prerequisite. Add a `mr-selfcheck` counter for specs matching neither form.

### G2 — SPEC mode has no unambiguous output path.
Three conventions are live at once: `standards/spec-driven.md` says per-project specs live in
`docs/specs/`; `monster-realm/docs/specs/` really holds **32 files**; and the authoritative milestone
corpus is `specs/monster-realm-v2/` in the *harness* repo with **59 files**. An unattended SPEC tick
has no rule telling it which to write, and picking wrong produces a spec no consumer reads.
**Fix:** pin it explicitly in the SPEC-mode brief — milestone/slice specs go to
`specs/monster-realm-v2/`; `docs/specs/` is per-slice working notes and is NOT a `mr-ready` source.
Record the divergence in `standards/spec-driven.md` rather than pretending the doctrine matches.

## MAJOR

### G3 — The residual registry is already specified. It was never implemented.
`docs/workflow-loops.md` §Disposition markers already defines the grammar
(`parked → <queued spec id | wontfix>`), the location (the spec's `## Delivered / Parked` section,
written at close), the rule ("parked work without a disposition is how carry-overs go unsized",
"missing dispositions are an audit finding"), **and the owner: "marker presence is audited
supervisor-side (the mr-audit layer)"**. Measured: `grep -i disposition mr-audit` returns **nothing**;
nothing anywhere writes or checks `parked →`.
**This is the documented cause of the 487-item backlog and all four orphans**, and it means the
backlog exists because a specified control was never built — not because a format was missing.
**Fix — `lp-registry` is substantially cheaper than planned:** implement the existing grammar instead
of inventing one, and fold the check into `lp-04`, which already opens `mr-audit`. The orphan detector
falls out for free: **a `parked → <spec id>` whose id exists in no spec is exactly the check that
would have caught `14r-c-2`, `13r-c-2` and `14r-f-2`.**

### G4 — The brief actively instructs over-spending, and the plan only fixes the other line.
`mr-brief-template.md:21` reads *"**Budget is ample — favor thoroughness over frugality**"*. The plan
corrects line 33's false 125% ceiling but leaves this. Under an allowance exhausted most weeks, this
is worse than a false claim — it is a standing instruction to spend more, given to the agent that
spends ~90% of the credits.
**Fix (surgical, keep the good half):** the thoroughness preference is *correct* per D3 and the
measured value of the reviewer/red-team gauntlet, and the sentence's tail is already right ("add
lenses that find different bugs, not redundant agents re-running the same checks"). Delete only the
false premise. Becomes: *"Budget is bounded by the weekly plan allowance — prefer lenses that catch
distinct defect classes over redundant re-runs; never trade a review lens for cost (D3)."*

### G5 — The lookahead cannot gate SPEC or MILESTONE on first use.
R2-3 gates costly modes on `p90_cost_pp(mode, tier)`, but there is no cost history for modes that
have never run. A missing p90 either divides by zero or silently defaults to "cheap".
**Fix:** seed conservative priors — SPEC = p90 of the residual-spec slices already in the ledger;
MILESTONE = the measured cost of the 2026-08-08 heavy-ceremony pass, or the highest observed slice
cost if that attribution is unavailable. **Fail closed:** an absent estimate is treated as "too
expensive", never as zero. Replace priors with measured p90 after three runs of each mode.

### G6 — `mr-decision-watch` dies after 7 days, so `HOLD(operator-blocked)` can stall silently.
Verified: the watcher polls every 5 min with `DEADLINE=$(date +%s) + 7*24*3600`. Its wake path is
otherwise complete and good (writes `decisions/issue-N.answer.md`, clears `.blocked-on-human`, fires
a pending event for an immediate tick) — but past the cap it exits and nothing re-arms.
**Fix:** on watcher expiry write a `HOLD-EXPIRED` line and re-issue a fresh watcher, or have the
mode-0 tick re-arm any watcher whose issue is still open. An unanswered decision must degrade to a
visible nag, never to silence.

## MEDIUM

### G7 — The project already has skills for the exact test idiom Wave 4 chose.
`monster-realm/.claude/skills/game-core-testing/SKILL.md` states *"`game-core` is the test center of
gravity — pure, deterministic, integer-only… All game-rule tests live here (rules live once — the
SSOT)"*, and `spacetimedb-reducer/SKILL.md` carries the reducer contract and the ctx rules.
`15r-h1` re-derives this from `raising_tests.rs`. **Fix:** cite both skills in the `15r-h1` brief as
the governing doctrine; the slice implements existing doctrine rather than proposing a new idiom.

### G8 — `/spec` already contains the ask-versus-default discipline R2-1 wrote in prose.
`.claude/commands/spec.md` already says: interview one question at a time, prioritise questions
"whose answers would change the architecture, data model, or UX flow (mechanical details can
default)", give a recommended answer with each, and — importantly — **"If the codebase can answer a
question, explore it instead of asking"**, which is the natural brake on issue spam that R2-1 lacked.
**Fix:** SPEC/MILESTONE modes invoke `/spec` and map "interview one question at a time" onto "one
`mr-ask-drew` issue per architectural ambiguity, each carrying a recommended answer".
**Caveat:** `/spec` escalates gnarly designs to `/grilling`, which its own text notes is
operator-local in `~/.claude` and not shipped with the harness — an unattended tick must degrade
gracefully rather than fail when it is absent.

### G9 — Ceremony retirement already has a tool.
`just audit` (`scripts/audit-usage.mjs`, read-only, zero-dep) parses session transcripts, counts
Skill and Agent invocations, joins hand-rated importance from `scripts/usage-labels.json`, and emits
**KEEP / PROTECT / REVIEW / TRIM** verdicts — with the documented caveat that a zero count means
*useless* **or** *never triggered*.
**Fix:** `lp-15` runs `just audit` instead of hand-deriving; `lp-17`'s weekly report includes its
TRIM/REVIEW rows. This also gives ceremony retirement an objective input rather than a judgement call.

### G10 — `/simplify` is already mandatory and still is not biting.
It appears twice in `mr-brief-template.md` — in the role chain (`reviewer`+`red-team`+`/simplify`)
and in Definition of Done (*"`/simplify` + `/review` closed it"*). Yet the window shows **173 total
production-source deletions**. So the correct finding is not "there is no simplification pressure" —
it is **"a mandatory DoD step is running and producing nothing measurable"**, which is a different and
more troubling defect.
**Fix:** make it observable before adding anything new — `lp-02` records production-source lines
added/deleted per slice, and `lp-17` reports the ratio. Do not add a new simplification mechanism on
top of an unmeasured one that already exists.

### G11 — The mutation tool is installed unpinned.
`nightly.yml` installs via `taiki-e/install-action` `with: { tool: cargo-mutants }` — no version.
A ratchet whose tool can change under it will produce a population change indistinguishable from a
real regression, which is the failure that already fired five red nights.
**Fix:** pin the version in `15r-tst-i`, and record the pinned version alongside the ratchet baseline.

### G12 — The Tier-C allowlist has no storage or mechanism.
R2-1 says it "starts empty and grows one milestone at a time" but never says where it lives or who
edits it.
**Fix:** a `spec_authoring_allowlist` array in `mr-state.json`, operator-edited only, read by the
MILESTONE gate. Empty array is the default and means MILESTONE mode never fires.

### G13 — `RECONCILE` is budget-exempt and unbounded.
Correct in principle (it harvests already-spent credits), but "exempt" with no ceiling is how a stuck
loop burns a day of ticks. Bounded in practice at ~$2/tick, but unmeasured.
**Fix:** count consecutive RECONCILE ticks; after N with no state change, log `RECONCILE-STUCK` and
fall through to HOLD. Cheap, and it converts a silent spin into a visible signal.

## What this review did NOT find

No new BLOCKER in the security or testing waves. `15r-sec-a` (public `battle` table), the seven blind
scanners, the pure-seam idiom, the ordering constraint (instrument → cycle → gate) and the
anti-pattern ledger all survive review unchanged. The Wave 0–7 structure stands; G1/G2 change what
Wave 2 *builds against*, not the wave order.

## The meta-finding

Nine of these thirteen are the same class the operator identified: **the harness already specifies or
tooled the thing, and the plan proposed building it.** Disposition markers, the spec skeleton, the
ask-versus-default interview, the usage audit, `/simplify`, the decision-watch wake loop, and two
project test skills were all already written. The loop's real deficit is **unenforced doctrine**, not
missing design. That should change the default posture of every remaining slice: **search for an
existing standard, skill, command or script before designing anything**, and prefer implementing an
unenforced rule over inventing a new one.

---


---

# REVISION 5 — 2026-08-16 (third review: gap hunt, verified before adoption)

Six candidates generated; **three verified as real gaps and adopted, three refuted and deliberately
NOT added.** Recording the refutations matters as much as the additions — they are the cheapest
possible slices to not build.

## ADOPTED

### N1 — Delete the per-tick ollama preflight (the plan only *reorders* it)
**Issue verified.** The plan puts "the ollama triage hop" on DO-NOT-RETRY (correct: 0 invocations
across two generations — the haiku hop it replaced is recorded at `mr-launch.sh:81` as "0 invocations
ever"), and NEEDS-TWEAKING says to *move the preflight below gates -1/1*. Moving it preserves the
cost and hides it: every tick still logs "server up, hrbrmstr/ornith-35b-fixed present, warm-up
dispatched" — **803 warm-ups for zero invocations.**

**Best solution — surgical, not destructive.** Remove the *unconditional per-tick preflight*; keep
`mr-ollama` and the local stack intact for manual and experimental use. This removes a standing cost
for a capability nothing calls, without destroying a capability the operator invested in. Consistent
with the plan's existing "archive, don't destroy" posture.

**Justified on signal integrity, not tokens** (the warm-up costs local compute and tick latency, not
credits): a preflight line on every tick for a path with no consumer is the plan's own
"ceremony that survives its own usefulness" anti-pattern, and it trains the reader to skim the tick log.

**Rejected alternative — "give it a real job."** Considered and declined. The candidate jobs (log
classification, event triage, HOLD-reason classification) are either already free with grep/jq, or
consequential enough that a silent wrong answer is expensive. Two generations of this idea produced
zero invocations; a third has no better prior.

### N2 — Playtest feedback must become registry rows, and it must land BEFORE Wave 7
**Issue verified, and my first framing of it was wrong.** The intake channel is not missing: the
convention exists (`playtest-feedback-TEMPLATE.md`), the supervisor prompt already treats
`playtest-feedback-<YYYY-MM>[-rN].md` as a `wake_file` that lifts the playtest gate, and **two files
have actually been filed** (`playtest-feedback-2026-07.md`, `-r2.md`).

The real defect is narrower and is RF-3 in a second location: the template's own
**"What didn't"** and **"Bugs / rough edges observed"** sections have **no path into a queue.** They
are read once by a decision run to "reshape the queue" — prose, consumed by a human-equivalent read,
exactly like the ADR Residuals sections. And the only consumer that might have processed them,
`mr-feedback`, is retired in Wave 7 (0 of 189 rows ever terminal).

**Best solution:** make playtest-feedback files a **source for `lp-registry`** — each bullet under
"What didn't" / "Bugs" becomes a residual row under the same
`parked → <queued spec id | wontfix>` grammar, read by the same `mr-ready` consumer. No new
subsystem, no revival of a measured-dead one.

**Sequencing is load-bearing:** this must land **before** Wave 7 retires `mr-feedback`, or the
retirement removes the only (broken) consumer and leaves nothing. Add as a dependency edge on
`lp-15`.

**Why this matters beyond tidiness:** the operator's stated PRIMARY priority explicitly includes
*"the ability to … change them in response to feedback."* Playtest is the only channel that carries
feel-and-quality signal, which no gate, eval or mutation score can produce.

### N3 — The 304 below-the-cut residuals need dispositions AT SEEDING, or the registry launches broken
**Issue verified, and it is a correctness bug in the registry rollout, not a backlog-grooming nicety.**
Measured: 329 OUTSTANDING items — **4 CRITICAL, 26 HIGH, 101 MED, 198 LOW.** Wave 6's cut line is 25.
That leaves **304 items with no disposition.**

Two failures follow directly, and both are self-inflicted:
1. **The registry launches as a graveyard.** G3's whole point is that
   `parked → <queued spec id | wontfix>` is mandatory and "parked work without a disposition is how
   carry-overs go unsized." Seeding 304 dispositionless rows rebuilds the graveyard *inside the new
   mechanism* on day one.
2. **The new audit check fires 304 times immediately** — and a gate that red-lines 304 times on its
   first run is a gate that gets disabled within a week. That is precisely how the loop acquired its
   other decorative gates.

**Best solution:** the seeding slice assigns **every** item a disposition, and `wontfix` is a
first-class, cheap outcome carrying a one-line reason. The 198 LOW items are the obvious `wontfix`
pool. Expected end state: a real queue of roughly 30 items plus an auditable `wontfix` ledger,
instead of a 304-item silent backlog. **Acceptance criterion: zero dispositionless rows exist when
the audit check is first armed** — the check must be able to pass on the day it ships.

## REFUTED — verified, and deliberately NOT added

### CodeGraph index staleness as a hazard for `lp-11a`
**Hypothesis:** routing build-session navigation through CodeGraph is unsafe if the index is stale
(open question 12 noted a 15-day-stale harness index).
**Refuted by measurement:** the *project* index is live —
`projects/monster-realm/.codegraph/codegraph.db` was written 2026-08-15 21:52 with an active daemon,
against source files last touched the same day. Build sessions work in the project repo. The stale
index is the *harness* one, which matters only to supervisor/interactive navigation of `mr-*` scripts
and does not justify a slice. `lp-11a` ships unchanged.

### Raising the supervisor tick's model tier
**Hypothesis:** the tick makes the most consequential decisions (launch / merge / kill) on
sonnet@medium, so it is under-modelled.
**Refuted:** there is **no measured defect** attributable to the tick model. In-window merges were
clean; the gate audit's 0 true positives is a detector defect, not a model defect; and no bad-merge
incident exists in the ledger. Proposing a tier raise here would be exactly the
"cost increase justified by routing aesthetics" that DO-NOT-RETRY #6 already rejects for spec
authoring. Revisit only if MD-5 (a quality readout with non-zero variance) ever shows tick-attributable
error.

### Harness working-tree state loss
**Hypothesis:** uncommitted/untracked files in the harness risk losing loop state.
**Refuted:** `memory/projects/.gitignore` deliberately excludes runtime state with a documented
rationale ("written every tick/run; tracking them churns every commit"). The modified files are normal
working state. The one genuine item — a stray untracked `memory/monster-realm-handoff.md`, the
split-brain second copy — is **already covered** by `lp-06`'s stray-handoff rule. Nothing to add.

---


---

# REVISION 6 — 2026-08-16 (G10 generalized: the skill layer is inert)

**G10 was scoped too narrowly.** The operator's instinct that "multiple skills are not being
triggered when they should be" is correct, and measuring it turns a one-line observation into one of
the largest structural findings in this exercise. G10 is **superseded** by this section.

## INVESTIGATE — measured, not asserted

`node scripts/audit-usage.mjs --days 30` over **1,641 transcripts (2026-07-17 → 2026-08-15)**.
The tool already existed (G9); this is its first use.

**The AGENT layer is healthy.** reviewer 238 · red-team 219 · tester 159 · planner 90 · verifier 89 ·
doc-keeper 42 · desync-guard 22 · reducer-security-auditor 21 — all KEEP. Only `judge` and
`implementer` are dead (0).

**The SKILL layer is close to inert.** Counts over the same 30 days:

| skill | count | why it should have fired |
|---|---|---|
| `simplify` | **8** | mandatory in *every* task's Definition of Done |
| `spacetimedb-reducer` | **2** (21d ago) | governs every server-module slice; carries the reducer contract |
| `game-core-testing` | **0** | governs the pure-seam idiom Wave 4 is built on |
| `spacetimedb-client` | **0** | governs every client/net slice |
| `wasm-boundary` | **0** | governs the prediction boundary |
| `code-intel` | **0** | the CodeGraph routing doctrine `lp-11a` depends on |
| `spec-kit` | **0** | the doctrine Revision 2's SPEC mode is built on |
| `security` | **0** | pre-merge security checklist |
| `vitest-fast-check` · `toolchain-pin` · `changelog` · `context-hygiene` | **0** | each governs a recurring task class |
| `code-review` (plugin, rated PROTECT — "primary review skill") | **0** | — |

**Both measurement caveats checked and neither explains it.** (1) Slash-only skills
(`disable-model-invocation: true`) never auto-fire — but those are the `acadian-demo`-scope Matt
Pocock pack, *not* the monster-realm skills above. (2) The usage-CSV hook gap
(`#!/usr/bin/env python3` exiting 126 under asdf) affects CSV-era counts only; **this audit is
transcript-derived and unaffected.**

## DIAGNOSE — why agents fire and skills do not

The two layers differ in exactly one way, and it is causal:

- **Agents are invoked because the brief NAMES them.** `mr-brief-template.md:15` spells out the role
  chain literally — `planner` → `reviewer`+`red-team` → `tester` → `specialist` → `verifier` →
  `doc-keeper`. Explicit dispatch. It works: 238 reviewer invocations.
- **Skills rely on model-initiated description matching.** Nothing names them, so a headless session
  must decide to load them. **Measured: it essentially never does.**

**The consequence is not cosmetic, and there is independent corroboration.** Build sessions write
server code without loading `spacetimedb-reducer`, the skill carrying the contract
(`Result<(), String>`; `ctx.timestamp` never `std::time`; `ctx.sender()` never a client-passed field;
`ctx.rng()` never `thread_rng`). **Those are precisely the invariants the 120 source-scan sites exist
to police.** The plausible causal chain — labelled INFERRED, but supported by three independent
measurements — is: *doctrine is not loaded → violations become possible → scanners are written to
catch them → the scanner corpus grows to 26,876 lines.* The corroborating measurements: `code-intel`
at 0 alongside RF-4's finding that the parent made **0 codegraph calls while its own subagents made
47**; `game-core-testing` at 0 alongside reducer logic never being extracted in pvp/battle/evolution;
and `simplify` at 8 alongside **173 total production-source deletions**.

**Honest limit:** a count of 0 proves the *artifact* was not loaded, not that its *content* was
unknown to the model. The three corroborations above are what raise this from "unused file" to
"unapplied doctrine."

**This also invalidates a dependency in Revision 2.** SPEC mode was designed to "invoke `/spec`" —
but `spec-kit` has fired **0 times in 30 days**. Building SPEC mode on model-initiated skill dispatch
would reproduce this exact failure. SPEC mode must name the skill explicitly, the way the role chain
names agents.

## FIX — explicit dispatch, mechanical where it must not be optional

Three tiers, by how much the doctrine matters:

1. **MUST-APPLY doctrine → name it in the brief, keyed to `touches:`.** The brief already computes a
   `touches:` set; map path globs to required skills and emit the list into the brief's role chain
   next to the agent roster. `server-module/**` → `spacetimedb-reducer`; `game-core/**` →
   `game-core-testing`; `client/src/net/**` → `spacetimedb-client`; `client-wasm/**` →
   `wasm-boundary`; any spec authoring → `spec-kit`. Single lines, so RF-4's multiply-by-500-turns
   constraint holds.
2. **MUST-NOT-BE-OPTIONAL doctrine → make it a gate, not a prose rule.** Where a skill encodes a
   checkable invariant (the reducer contract's `std::time`/`thread_rng`/`ctx.sender()` bans), the
   invariant belongs in the centralized conformance suite from Revision 4 — which is where those
   scans were already headed. **A skill is documentation; a gate is enforcement. Do not use the
   first where the second is required.**
3. **The genuinely-optional rest → let the audit decide.** Re-rate them in
   `scripts/usage-labels.json` and let `just audit`'s KEEP/PROTECT/REVIEW/TRIM verdicts drive
   retirement in `lp-15`. Note `code-review` is already rated PROTECT — "valuable but never triggered
   (fix the trigger, don't delete)", which is exactly this finding in the tool's own vocabulary.

**Explicitly NOT proposed:** deleting the zero-count monster-realm skills. They are unfired, not
worthless, and the tool's own doc warns that "a good skill with a bad trigger looks identical to dead
weight." The defect is the dispatch mechanism, not the content.

## CONFIRM — the falsification test

Re-run `node scripts/audit-usage.mjs --days 30` one month after the brief change:

- **PASS:** `spacetimedb-reducer` fires on approximately every server-module slice;
  `game-core-testing` fires on game-core slices; `code-intel` is non-zero; `spec-kit` fires on every
  SPEC-mode tick. Baseline for comparison is this section's table.
- **FAIL:** counts stay at 0 → explicit naming is not sufficient either, and the doctrine must move
  into gates (tier 2) or into the brief text itself. **Recording the failure mode in advance is the
  point** — this is the pre-registration discipline `lp-17` exists to create, applied to its own
  first hypothesis.
- **Guard against the obvious gaming:** a rising invocation count is not the goal. Pair it with the
  outcome each skill is supposed to move — production-source deletions for `simplify`, parent
  codegraph calls for `code-intel`, new source-scan sites for `spacetimedb-reducer`. A count that
  rises while its outcome does not means the skill is being loaded and ignored, which is a different
  and worse defect.

## Placement

Tier 1 is a **Wave 1** change (brief-only, no behaviour change, no gate). Tier 2 folds into Revision
4's conformance-suite consolidation in Wave 4. Tier 3 folds into `lp-15` in Wave 7. The SPEC-mode
correction is a **prerequisite for Revision 2's SPEC mode** and must land with it.

---

## EXECUTIVE SUMMARY

**The four things that matter.**

1. **The plan cannot start until somebody writes the specs.** Measured: `ls specs/monster-realm-v2/ | grep -i residual` returns 22 spec files, the newest being `M-postgate-fourteenth-review-residuals.spec.md`. There is **no fifteenth-review-residuals spec and no loop-infra spec**. Doctrine (`mr-supervisor-prompt-native.md:81`) selects work as "first unfinished non-blocked: slice per PLAN §9 order **+ its M\*.spec.md**", and `mr-state.json`'s queue records at least three ticks standing down for exactly this reason (*"13r-c-2 itself is undrafted (no M\*.spec.md entry yet)"*). **W0-0 — an operator-attended spec-authoring ceremony — is now the first step of the plan, ahead of everything.** Without it every wave stalls at gate 3 and the credits are spent on standdown ticks. This was the single biggest hole the reviews found.

2. **There are SEVEN blind security scanners, not six, and one CRITICAL live data exposure that was filed two months too late.** Measured at `evals/scanner-migration-audit.eval.mjs:124` — `KNOWN_UNMIGRATED_CAP = 7` — with exactly seven entries at `:135-191`, all owned by orphan slice `14r-c-2`: battle-, evolution-, npc-dialogue-quest-, raising-, recruit-, shop- **and trade-reducer-security**. Two of them (evolution, raising) are measured to *swallow* the canary needle outright. The established brief's claim that `trade-reducer-security` is migrated is **wrong** — it imports `rust-scan.mjs` but scans with its own local strippers. Separately, `server-module/src/schema.rs:396` is still `#[spacetimedb::table(name = battle, public)]` and `client/src/net/connection.ts:690` subscribes it unfiltered — every client receives every player's battle state, including both sides' derived stats. The draft plan had that fix in Wave 6, roughly two months out. **It moves to Wave 3, first.**

3. **The kill switch and `MR_FORCE` must not be "fixed" in the direction the draft proposed.** All three reviewers independently refuted Wave 2's exit condition "MR_FORCE=1 cannot launch under a hold". Measured: `mr-supervisor-run:9` is `setsid env MR_FORCE=1 … mr-native-tick.sh`, `mr-native-tick.sh:125` is the override, and all five child spawners (`mr-launch.sh:12`, `mr-ci-watch:6`, `mr-reset-watch:5`, `mr-cost-watch:12`, `mr-decision-watch:9`) already `unset MR_FORCE`. `MR_FORCE` is already provenance-scoped: only the operator can set it, and it cannot reach a spawned session. Neutering it deletes the operator's only manual escape hatch. The real fix is the mirror image: **provenance is checked on `rm`, never on `touch`, and an unlabelled zero-byte flag defaults to OPERATOR and is never auto-cleared.** (Measured: the flag on disk right now is `-rw-rw-r-- … 0 Aug 15 17:58`, and `/home/mdrewt/.local/bin/mr-supervisor-disable` is a bare `touch` — so the fail-safe default is what keeps the unchanged wrapper working with no out-of-repo edit.)

4. **This takes about five months, not eight weeks, and it says so up front.** Waves 0–5 are 34 slices; at the 3-slices/week cadence adopted here that is ~11–12 weeks. Adding Wave 6's 25-item cut line is ~8–9 weeks more: **~20–21 weeks total.** Executing all ~65 catalogued Wave-6 items would be ~8 months and this document does not commit to that — the tail is re-derived from `lp-17`'s weekly report. The draft's §15 printed "~65 slices, continuous" with no duration, which read as a backlog rather than as 60% of the calendar.

**What changes structurally.**

- The `seven_day.utilization` number that already exists in every stream-json log stops being discarded at `mr-native-tick.sh:364` and becomes the loop's cost SSOT (D2).
- The kill switch gains provenance, so "the operator paused to protect credits" and "the supervisor finished its queue" stop being the same zero-byte file.
- Residuals gain a **sink**: a structured registry emitted at PR time that `mr-ready` reads, so the next 367 items do not accumulate the way these did.
- Reducer guards become **behaviourally testable** — primarily by extracting pure `game-core` seams (the measured-good `raising_tests.rs` pattern: 54 tests, 1 source read), with a CLI harness only for the irreducibly reducer-bound residue.
- `master` gets branch protection with the two required checks whose names are now **measured**, not guessed: job ids `ci` (`.github/workflows/ci.yml:12`) and `e2e` (`:97`), neither carrying a job-level `name:`.

**What the operator gets at the end of each wave.**

| wave | deliverable in one sentence |
|---|---|
| 0 | Two spec files that make every later slice launchable, five decision issues already in flight, and five offline replays that either confirm the plan's numbers or kill the slices that rest on them — for roughly one slice of credit. |
| 1 | A real weekly-allowance gauge with a demonstrated-red selftest, a ledger whose new columns have *variance* rather than merely being non-null, nightly failures that open an issue, and an SSOT backup that has not existed since 2026-07-24. |
| 2 | A loop that cannot self-disable in a way that strands work, cannot clear the operator's pause, cannot strand an event behind the flag for 84 hours, and has a place to *put* a residual. |
| 3 | Battle state stops being world-readable; all seven blind security scanners see string literals correctly; the `concat!()` dodge is gone from production source; `master` is protected; doc-set merge conflicts are structurally impossible. |
| 4 | Reducer guards are testable behaviourally, and the first subsystem's costume source-scans are deleted against demonstrated-red replacements. |
| 5 | The loop paces itself against the real allowance with a **floor as well as a ceiling**, and long sessions segment instead of replaying 200K-token prefixes. |
| 6 | The CRITICAL/HIGH residual backlog drained in severity order, ~25 items above the cut line. |
| 7 | Dead ceremony retired, the improvement loop restarted with pre-registered hypotheses. |

---

## 0. Ground rules that bind every slice

These are restated from the operator's settled decisions and are not re-litigated anywhere below.

- **D1 scarcity:** near the ceiling, finish in-flight work, start nothing new. Stranding a half-done slice is worse than idling.
- **D2 cost SSOT:** percentage of weekly plan allowance from real telemetry. No synthetic dollars.
- **D3 no tier demotion under credit pressure.** Defer instead. Sole exception: work genuinely too simple for the model difference to matter.
- **D4 slice sizing:** the cap is a **decomposition target at planning time**. At run time a breach is a *query against account headroom*, not a kill. Headroom → continue and log the overrun as a planning-accuracy datapoint. No headroom → D1.
- **D5 reduce operator babysitting** is a goal in its own right.
- **Standing rule 4 (extended):** every path in a brief is `ls`-verified at authoring time; prefer unique symbol names to line numbers; **and every count, cap or threshold quoted in a brief carries the command that produced it.** (R15, extended per reviewer 1 — the draft's own "cap 5→2" and the brief's "6 blind evals" are the case in point.)
- **Proof-of-teeth:** a gate that has never been shown to fail is a decoration. Every gate ships with a demonstrated RED against an injected defect.
- **ADR numbering:** measured 2026-08-15, `ls docs/adr/*.md | wc -l` = 165 (162 numbered ADRs + `README.md`, `DIGEST.md`, `template.md`); highest is `0196-changelog-freshness-nightly-check.md`, so **next free is 0197**. Note `docs/adr/README.md:16` still says "Next free number: **0184**" — stale by 13, tracked as ADR-0166 R8.
- **Loop-infra slices produce no ADR** (the ADR corpus belongs to monster-realm). They record decisions in the relevant `$MEM/mr-*` doctrine file plus one line in `memory/decisions-log.md`.

---

## 1. WAVE 0 — free groundwork and the spec unblock

**Entry:** none.
**Cost:** W0-0 is one attended session (~1 slice of credit). W0-1..W0-8 are offline replays and one-command reads (~0 credits). The five `mr-ask-drew` issues are ~0.
**Exit:** the two spec files exist and are `mr-ready`-selectable; all five blocking questions are issued and their issue numbers recorded in `mr-state.json`; W0-1..W0-8 have each either confirmed their prediction or filed the slice they invalidate.

### W0-0 — author the two missing spec files *(BLOCKER for the entire plan; GAP-2)*

| field | value |
|---|---|
| **id** | W0-0 |
| **title** | Spec-authoring ceremony: `M-postgate-fifteenth-review-residuals.spec.md` + `M-loop-infrastructure.spec.md` |
| **touches** | `specs/monster-realm-v2/M-postgate-fifteenth-review-residuals.spec.md` (new), `specs/monster-realm-v2/M-loop-infrastructure.spec.md` (new), `specs/monster-realm-v2/PLAN.md` (§9 queue) |
| **tier** | operator-attended heavy-ceremony session (not a native tick — doctrine says *"native ticks cannot self-serve heavy spec ceremony"*, recorded verbatim in `mr-state.json`'s queue) |
| **ADR** | none (spec artefact) |
| **format** | The **measured-working ~25-line-per-slice residual format**: 15/15 merged, 14/15 first-attempt. Generalise it; do not redesign it. Each slice entry: id, one-sentence intent, `touches:`, `after:`, EARS acceptance criteria, proof-of-teeth fixture, tier. |
| **EARS** | (a) WHEN the supervisor runs `mr-ready`, the fifteenth-residuals spec SHALL be selectable and its first unblocked slice SHALL be launchable. (b) Every slice id referenced anywhere in this plan SHALL appear in exactly one of the two spec files. (c) No slice entry SHALL exceed 30 lines. |
| **proof-of-teeth** | Dry-run `mr-ready` (or the equivalent read of doctrine's selection rule) and confirm it names `15r-sec-a` as the first launchable slice. If it names nothing, the spec is wrong. |
| **falsification** | Before W0-0: `grep -rn '13r-c-2\|15r-sec-a\|lp-01' specs/` returns 0 hits (measured today for `13r-c-2`). After W0-0: non-zero for every id in this document. |
| **effort** | M (attended) |
| **risk** | The ceremony is the one step that costs operator attention (against D5) and is not automatable until `lp-20`, which is deferred behind everything with three blockers of its own. Accepted. |
| **rollback** | Delete the two files; nothing else depends on their content until Wave 1 launches. |

### W0-1..W0-8 — offline replays and settled reads

| id | question | method | cost | what it gates | if it fails |
|---|---|---|---|---|---|
| W0-1 | Does an offline recompute of `seven_day.utilization` from surviving stream-json logs reproduce the measured week (29→33→52→59→74→83→85→87→90)? | replay script over surviving `/tmp` logs + Cowork audit tree | ~0 | `lp-01` | `lp-01` ships with a wider parser and W0-1 re-runs; `lp-12`/`lp-13` stay blocked |
| W0-2 | Is `utilization` monotone non-decreasing within a reset bucket? | same replay; count decreases and their magnitude | ~0 | `lp-01` selftest | if a decrease > 0.01 appears, `util_floor = max()` is invalid and `lp-12` needs a decay model |
| W0-3 | Does the ledger's `remote_red_fix_cycles` sum to 27 over all 710 rows but 0 over the 446 v3-era rows? | `jq` over `memory/projects/monster-realm-usage-ledger.jsonl` | ~0 | `lp-02` | confirms the column **died at the v3 cutover** rather than never working — a stronger, more actionable finding (GAP-9) |
| W0-4 | Which turns would `lp-14`'s 250,000-token threshold have armed on, across the 231 transcripts? | offline replay of the arming set | ~0 | `lp-14` | if the arming set is degenerate (fires on <2% or >40% of sessions), re-derive the threshold before briefing |
| W0-5 | **SETTLED — re-confirm only.** Required check names on `master`. | **measured 2026-08-15:** `.github/workflows/ci.yml:11` `jobs:`, `:12` `ci:`, `:97` `e2e:`, neither with a job-level `name:` → check-run names are **`ci`** and **`e2e`** (lowercase, job-id derived). The workflow display name `CI` at `ci.yml:1` is **not** the check name; using it produces the never-resolving `expected` deadlock R4 warns about. | ~0 | `15r-f` | one-line re-confirm against a live PR's `gh pr checks <n>` immediately before the slice |
| W0-6 | **NEW.** Can a SpacetimeDB 2.6.0 `#[view]` predicate OR two identity columns against `:sender` (`player_identity = :sender OR opponent_identity = :sender`)? | scoped local publish, or the pinned 2.6.0 docs | ~0 | `15r-sec-a` | if unsupported, `15r-sec-a` re-scopes to two views + a store-level union and re-sizes M→L; it stays in Wave 3 but moves behind the migration slices |
| W0-7 | Hosted wall-clock of the 753-mutant `mutate-server` run. | one `workflow_dispatch` with timing captured | ~0 (CI minutes) | `15r-tst-i` | `docs/adr/0183-*.md:42`'s hosted duration cell is literally `—`; `grep -rn "155" docs/adr/` returns nothing, so the "~155 min" figure in circulation is unsourced |
| W0-8 | Exact field schema of `mutants.out/outcomes.json`. | read one real file from a scoped run | ~0 | `15r-tst-i`'s parser | write the parser against the real artefact, never against the book |

### W0-Q — issue all five blocking questions NOW, non-blocking *(reviewer 1, MAJOR)*

The draft marked five questions BLOCKING but never said when to ask. Three need a human answer; asking at the point of need serialises operator latency into the critical path, against D5.

Mechanism (measured): `$MEM/mr-ask-drew` opens a labelled DECISION issue; its `--blocking` form additionally writes `$MEM/.blocked-on-human` and spawns `mr-decision-watch` (5-min poll), and doctrine `mr-supervisor-prompt-native.md:81` then stands the loop down free until a wake_file appears. A **non-blocking** ask does not park the loop.

Issue all five in Wave 0 as **non-blocking**:

- **Q-B1** (harness share of account utilization) → `--repo mdrewt/claude-harness`
- **Q-B2** (is auto-purchase of extra credits actually ON) → `--repo mdrewt/claude-harness`
- **Q-B4** (accept a third mandatory hard-refresh, or land per-table subscription builders first) → default `mdrewt/monster-realm`. **This is the only one that may escalate to `--blocking`, and only against its own slice, never the wave.**
- **Q-B5** (which milestones may an unattended session author specs for) → `--repo mdrewt/claude-harness`
- **Q-I7** — **withdrawn, ANSWERED.** Measured: `wc -l specs/monster-realm-v2/M2[2-5]*.spec.md` → 37 / 37 / 34 / 40 = 148 lines total across four milestones, against 655+ for an authored milestone. M22–M25 are ~35-line design sketches, not authored specs. `lp-20`'s value case stands on measured ground.

Routing note: `mr-ask-drew` defaults to `REPO=mdrewt/monster-realm`; loop/process decisions must carry `--repo mdrewt/claude-harness` or they land where the operator will not associate them with the loop. **Record every issue number in `mr-state.json`** so the gating slice checks for an answer mechanically instead of re-deriving the question.

---

## 2. WAVE 1 — instrument (never gate)

**Entry:** W0-0 merged; W0-1/W0-2 either confirmed or their failure recorded.
**Slices:** 10 (several XS).
**Cadence:** 3/week nominal → ~3.5 weeks.
**Exit — all four must hold:**
1. One full reset cycle (Thu 20:00 ET → Thu 20:00 ET) of `seven_day.utilization` samples captured, with each sample tagged by launch state and by which gate the tick reached.
2. `lp-02`'s new columns show **non-degenerate variance** over the first 5 slices — not all-equal, not all-null — and are readable by one committed query script the selfcheck runs. *(GAP-9: "non-null on 5 rows" is not a gate in a schema carrying ~250 distinct one-off keys across 710 rows.)*
3. A deliberately forced nightly red opens exactly one issue, and the drill asserts the **issue appeared**, not that the step exited 0.
4. `lp-01`'s selftest is demonstrated RED against three injected defects (see below).

### lp-01 — telemetry emitter: read `utilization`, stop discarding it

| field | value |
|---|---|
| **touches** | `memory/projects/mr-native-tick.sh`, `memory/projects/mr-cost-watch`, `memory/projects/mr-telemetry-selftest` (new) |
| **tier** | standard |
| **defect (measured)** | `mr-native-tick.sh:353-364` walks `rate_limit_info` objects with an allowlist on `status == "rejected"` only, extracting `resetsAt` (the `min()` reduction at `:372-374`) and discarding `utilization` entirely. `grep -n utilization mr-native-tick.sh mr-cost-watch` returns only prose comments at `:355` and prompt line 116. The number is in the stream and thrown away. |
| **EARS** | (a) WHEN a stream-json log contains a `rate_limit_info` object with `rateLimitType == "seven_day"`, the emitter SHALL persist `{ts, utilization, resetsAt, status, isUsingOverage, overageStatus, slices_running_at_sample, gate_reached}` to an append-only file under `$MEM`. (b) WHEN `utilization` is absent (documented on `rejected` rows), the emitter SHALL persist the row with `utilization: null` and SHALL NOT drop it. (c) The emitter SHALL NOT alter any existing trip condition. |
| **proof-of-teeth** | The selftest must be demonstrated **RED** against three injected fixtures: (i) a log whose parser drops the `seven_day` variant and reads `five_hour` instead; (ii) a malformed/absent `rate_limit_info`; (iii) a `seven_day` event on a `rejected` row with `utilization` absent. Pattern to copy: `evals/adr-digest.eval.mjs:207-250` TOOTH 6 generates a correct artefact, deliberately corrupts it, and asserts `--check` exits non-zero with an actionable message. *(GAP-12)* |
| **falsification** | Offline recompute (W0-1) and the live emitter must agree within 1% on the same log set. If they diverge, `lp-12` and `lp-13` are **blocked** — a pacing band computed from a wrong gauge is worse than no band, because it will be trusted. |
| **the Q-B1 byproduct** *(reviewer 2, MAJOR)* | Tag every sample with `slices_running` at sample time and with which gate the tick reached. The hourly cron spawns a decision run on most ticks, so the **launch-hour vs no-launch-hour difference in Δutil is a direct estimator of the harness's share** — no 20-point regression with R²≥0.6 required. The one genuinely blind window is a hold, because `mr-native-tick.sh:124` exits at gate -1 before spawning anything, and that blindness costs nothing since resume is timer-driven off `resetsAt`. **Confidence: MEDIUM** — utilization is whole-percent quantised and lagged, so the estimator needs a full reset cycle to settle, which is exactly Wave 1's exit condition. |
| **effort** | M | **risk** | MED — touches the gate chain's log walk. **rollback** | one-hunk revert; the emitter is additive and no gate reads it in Wave 1. |

### lp-02 — ledger columns with a slice-size denominator

| field | value |
|---|---|
| **touches** | `memory/projects/monster-realm-usage-ledger.jsonl` writer sites in `mr-native-tick.sh` / `mr-launch.sh`, one new committed query script |
| **defect (measured)** | 710 rows carrying roughly 250 distinct keys, most one-off per-milestone (`m8_7c_gating_audit`, `park_counter_m_infra_a`, …). `master_ci_after` is empty on 467 of 710 (plan said 466 — one row of drift, immaterial). `remote_red_fix_cycles` sums to 27 across all 710 but 0 across the 446 v3-era rows: the column **died at the cutover**. |
| **EARS** | (a) Every merged slice row SHALL carry `files_changed`, `prod_lines_added`, `prod_lines_deleted`, `test_lines_added`, `ears_criteria_count`. (b) Quality columns SHALL be written by the same writer that closes the slice, never by a later reconciliation. (c) One committed query script SHALL read all new columns and print a variance summary. |
| **why the denominator** | No cost-per-slice or planning-accuracy claim in this plan is normalisable without it — **including D4's overrun-as-planning-datapoint mechanism, which currently has no denominator to record against.** *(MD-4 / GAP-9)* |
| **proof-of-teeth** | The query script REDs on a synthetic ledger where a new column is all-identical (degenerate) or all-null. |
| **effort** | M | **risk** | LOW | **rollback** | revert the writer hunks; the columns are additive. |

### lp-03 — nightly failure notification *(zero dependencies; ships first if anything slips)*

| field | value |
|---|---|
| **touches** | `.github/workflows/nightly.yml` |
| **defect (measured)** | `nightly.yml:15-16` declares `permissions: contents: read`. Jobs are `mutation` (`:22`), `mutation-server` (`:50`), `coverage` (`:73`), `smoke-republish` (`:90`), `changelog-freshness` (`:147`) — **no notification job and no gating job.** |
| **EARS** | WHEN any nightly job fails, the workflow SHALL open exactly one issue naming the failing job and linking the run. |
| **critical detail** *(GAP-12)* | The permissions block must gain `issues: write` **in the same diff as the notification step**. A notification step under `contents: read` fails silently at the API call — the same false-green shape this whole plan exists to eliminate. |
| **proof-of-teeth** | Forced red drill: break one job on a branch, dispatch, assert the **issue exists**. Not "the step exited 0". |
| **effort** | S | **risk** | LOW | **rollback** | one-file revert. |

### lp-04 — mr-audit policy/detector split *(with a permanent constraint)*

| field | value |
|---|---|
| **touches** | `memory/projects/mr-audit` |
| **the constraint, written into the brief** *(reviewer 2, MAJOR)* | `mr-audit:22-38` (orchestration evidence — did the tester and reviewer/verifier subagents actually run) is the mechanism behind the pre-code gauntlet that is on the DO-NOT-BREAK list. `mr-audit:39-70` (gating-test integrity detector) has **0 true positives across all 446 v3-era rows**, and `mr-audit:68` reads `if a.get("tier")=="hard": g["verdict"]="FLAGGED"` **unconditionally** — every hard-tier slice is FLAGGED by construction. **The gating-test detector remains ADVISORY forever**; its output is evidence for an LLM diff read, never a merge predicate. Only `:22-38` may ever gate, and its predicate stays "the required review roles ran". |
| **EARS** | (a) The two halves SHALL be separately addressable, with the advisory half emitting to a distinct field. (b) `lp-04` SHALL NOT change `:22-38`'s semantics. |
| **falsification** | After lp-04, `FLAGGED` count on the next 5 hard-tier slices must be **2 or fewer** (i.e. the unconditional hard-tier flag is gone), not 5. |
| **effort** | S | **risk** | MED — this is the cheapest true-positive detector in the loop; do not touch `:22-38`. | **rollback** | single revert. |

### lp-05 — wire `validate.mjs` + `--require-docker`
`validate.mjs` has **zero callers** (high-confidence measurement). Wire it into the path that should already have been running it. **Effort S, risk LOW, rollback single revert.**

### lp-06 — `mr-backup` + stray-handoff rule *(insurance, not efficiency)*

Measured: `.gitignore:37` is `memory/projects/*-usage-daily.jsonl` / `*-usage-ledger.jsonl` — **the 710-row ledger is untracked and has had no backup since 2026-07-24.** Also: `git status` currently shows an untracked `memory/monster-realm-handoff.md` alongside the tracked `memory/projects/monster-realm-handoff.md` — a stray-handoff hazard the rule closes. **Effort S, risk LOW, rollback single revert.**

### lp-07 — `settings.json` env PATH
Mechanical. **Effort XS.**

### lp-11a — CodeGraph line in the brief *(GAP-7; single line, justified on navigation ACCURACY)*

| field | value |
|---|---|
| **touches** | `memory/projects/mr-brief-template.md` (one line) |
| **measured** | `grep -c codegraph mr-brief-template.md` → **0**. Parent tool census: Bash 2,135 / Grep 0 / Glob 0 / `codegraph_explore` 0, while the parent's own subagents made 47 codegraph calls. Precondition **verified satisfied**: `/home/mdrewt/.claude/settings.json` `permissions.allow` contains `mcp__codegraph__codegraph_explore`, and both repos carry `.codegraph/`. |
| **value case — read this carefully** | **Navigation accuracy** (dynamic-dispatch hops grep cannot follow), *not* token savings. The savings are unmeasured and claiming them would trip R11. This is exactly the class of change the DO-NOT-BREAK list permits: *"anything added is multiplied by ~500 turns, so additions must be single lines."* |
| **falsification** | Non-zero `codegraph_explore` calls in parent transcripts within one week. If still zero, the line did nothing and is reverted. |
| **paired concern** | A26 (duplicate CodeGraph daemons; 15-day-stale harness index) degrades whatever this buys. Pair it or state why not — this brief states: **index freshness is checked once here and, if stale, filed as a one-line Wave-2 item; the daemon dedup is Wave 7.** |
| **effort** | XS | **risk** | LOW | **rollback** | one line. |

### 15r-a′ — scanner-audit cap: advisory, **not** exact-equality *(REPLACES the draft's 15r-a)*

| field | value |
|---|---|
| **touches** | `evals/scanner-migration-audit.eval.mjs` |
| **what the draft wanted** | flip `entries.length > cap` (measured at `:546`) to `!==`. |
| **why that is CUT** *(reviewer 2, MAJOR — resolved against reviewer 1)* | The set is already pinned exactly from **both** sides: completeness (a gated, Rust-reading file that is neither migrated nor parked FAILS) and self-retirement (a parked entry that now passes Legs 1+2 REDs, demanding deletion — pinned by T5). The literal is a redundant third copy. Exact-equality converts that redundancy into **load-bearing cross-slice state**: Wave 3 runs four migration slices, each deleting entries and decrementing the same constant on line 124. Merge two and you get either a textual conflict or, if a conflict is resolved by taking one side, **a red master caused by MORE migration** — the same shape as DO-NOT-RETRY #4. Reviewer 1's proposed fix (rewrite the failure message) mitigates a change we should not make. |
| **what ships instead** | (a) Keep `>` as the failing predicate. (b) Add a **non-blocking advisory** line when `entries.length < cap`: *"KNOWN_UNMIGRATED has N entries but the cap is M — tighten the cap to N in the slice that migrated the difference."* (c) Correct the over-cap message, which currently reads *"exceeding the cap of N"* and would be false on its face for the under-cap case. |
| **the cap's real fate** | It is **deleted outright** by `15r-sec-mig-d` when `KNOWN_UNMIGRATED` becomes empty (Wave 3). That is the genuine simplification, in a loop measured at 173 total production-source deletions. |
| **proof-of-teeth** | A fixture with entries=6, cap=7 prints the advisory and **exits 0**; a fixture with entries=8, cap=7 REDs with the corrected message. |
| **effort** | XS | **risk** | LOW | **rollback** | one hunk. |

### lp-doc-a — close the obsolete residual prose *(GAP-11)*

| field | value |
|---|---|
| **touches** | `docs/adr/0186-*.md`, the ADRs owning m20e-2 / m20b-2 / nh5, plus `DIGEST.md` + `design-corpus.json` via `just adr-digest` |
| **work** | (a) Mark **m20e-2** and **m20b-2** SHIPPED (13r-b, commit `7bba44e`, ADR-0191) and **nh5** SHIPPED (13r-f, commit `7e08d36`, ADR-0192) in their Residuals sections, with the closing commit and ADR. (b) Triage **14r-f-2, 11r-e-1, 11r-e-3, 11r-e-9** to either an owner slice or a recorded "no longer relevant, because …". (c) Correct ADR-0186:176's now-false claim that the audit gate is "EXPECTED to be RED" — measured: `node evals/run.mjs` reports **`eval PASS: scanner-migration-audit … 18 gated / 10 migrated / 7 debt / 1 not-applicable`**. |
| **why it matters** | Leaving shipped work described as outstanding is what makes the residual corpus untrustworthy, which is the precondition for `lp-registry` (Wave 2) to be worth building. |
| **effort** | S | **risk** | LOW | **rollback** | docs-only revert. |

---

## 3. WAVE 2 — stand-down, kill switch, and a sink for residuals

**Entry:** Wave 1 exit met (or `lp-03` shipped alone if Wave 1 slipped — it has zero dependencies and this is a hard constraint).
**Slices:** 6.
**Cadence:** ~2 weeks.
**Exit — all four:**
1. Zero supervisor self-arms of `.native-supervisor-disabled` in two weeks.
2. Zero events stranded > 2h behind the flag. (Baseline: one done-event sat **83.9h** unprocessed because the flag sits *above* the event queue.)
3. **The supervisor cannot CLEAR a hold it did not set**, proven by a test that touches a zero-byte flag on the branch and confirms the tick stands down and does not remove it.
4. `mr-selfcheck` greps the last 24h of tick log for the three R2 wedge predicates and emits `SELFCHECK-FAIL` on any hit.

### lp-08 — `mr-ready` + FREE wrapper gate

Single slice. Adds a ready-set computation and a free-tick wrapper so a tick that has nothing to do costs nothing.

**Hard constraint (HC-2):** `mr-ready` may only ever **forbid** ("nothing remains"), never **compel** a launch. This mirrors the existing, correct architecture: `mr-disjoint:4-5` documents itself as NECESSARY-NOT-SUFFICIENT — *"the supervisor may still SERIALIZE on semantic grounds this check cannot see; it may NEVER override toward parallel."*

**Escalation:** `triaged > 0 && launchable == 0` → `mr-ask-drew` decision item + hold. Correct behaviour, and it costs operator attention only until Q-B5 is answered.
**Effort M. Risk MED. Rollback: one-hunk, each gate independently revertable.**

### lp-09 — kill-switch provenance *(BLOCKER-corrected; all three reviewers)*

| field | value |
|---|---|
| **touches** | `memory/projects/mr-native-tick.sh`, `memory/projects/mr-hold` (new), `memory/projects/mr-spawn`, optionally `memory/projects/mr-supervisor-disable` (vendored) |
| **measured problem** | `.native-supervisor-disabled` is a **zero-byte** flag written by two indistinguishable actors: the operator via `/home/mdrewt/.local/bin/mr-supervisor-disable` (a bare `touch`, confirmed by reading the file) and the supervisor itself running `touch` directly via Bash because doctrine line 81 orders it to. Verified self-arm/disarm timestamps exist in transcripts on both sides. `mr-native-tick.sh:124` tests `[ -f … ]` only. |
| **the correction — non-negotiable** | (a) Provenance is checked on **`rm`**, never on `touch`. (b) **Absent-or-empty provenance defaults to OPERATOR — fail-safe, never auto-cleared — pinned by a unit assertion.** This means the unchanged `~/.local/bin/mr-supervisor-disable` keeps working with **no out-of-repo edit required**, which matters because `~/.local/bin/` is outside version control, so a `git revert` of lp-09 could not undo an edit there. (c) `MR_FORCE=1` continues to override an **operator-provenance** flag exactly as `mr-native-tick.sh:125` and `mr-native-supervisor-README.md:24-25` document. (d) The supervisor **cannot set** `MR_FORCE` — already true by construction across five `unset MR_FORCE` sites (`mr-launch.sh:12`, `mr-ci-watch:6`, `mr-reset-watch:5`, `mr-cost-watch:12`, `mr-decision-watch:9`, all verified) — assert it with a test so it stays true. |
| **optional hardening** | If the wrapper is updated anyway, **vendor `mr-supervisor-disable` into `$MEM/`** and make `~/.local/bin/mr-supervisor-disable` a one-line `exec` shim, so the rollback is genuinely a single revert. |
| **also fixes** | The flag currently sits **above** the event queue. lp-09 moves event requeuing so a finished slice's done-event is processed (or at minimum durably queued and visible) rather than stranded — the 83.9h case. Note `mr-native-tick.sh:126` already requeues into `pending-events/`; the defect is that nothing drains it while the flag stands, and nothing surfaces the backlog depth. |
| **EARS** | (a) WHEN a hold flag carries no provenance record or is zero-byte, the loop SHALL treat it as OPERATOR-set and SHALL NOT remove it under any condition. (b) WHEN the loop itself sets a hold, it SHALL write a provenance record naming itself, and only then MAY it clear that hold. (c) `mr-spawn` SHALL refuse to launch while any hold is present, regardless of provenance. |
| **proof-of-teeth** | On the lp-09 branch: `touch` a zero-byte flag, run a tick, assert (i) it stands down, (ii) the flag still exists afterwards, (iii) `MR_FORCE=1` still runs one tick. Then write a supervisor-provenance flag and assert the loop clears it on its own next cycle. |
| **effort** | M | **risk** | HIGH — this is the file that stops the loop. | **rollback** | single revert of the in-repo hunks; the fail-safe default means no out-of-repo state to restore. |

### lp-10 — reboot-only PID guard
`crontab -l` confirms `0 * * * *` plus `@reboot sleep 60`, so the guard targets a real entry. **Effort S. Risk MED. Rollback: one hunk.**

### lp-11 — three named doctrine bug fixes *(after lp-08 AND lp-09)*

The draft never said which three. They are:

1. **Un-saturate the human-activity probe (GAP-5 / A23).** Measured: 72/72 trips were false positives, **65 of them on the loop's own `.codegraph` writes**. Verified the self-collision surface is live: `.codegraph/` exists at both `/home/mdrewt/projects/ai-apps/claude-harness/.codegraph` and `…/projects/monster-realm/.codegraph`, and the probe at doctrine `mr-supervisor-prompt-native.md:80` stands down on *"harness/project non-.git/node_modules/target file writes in last ~6 min you didn't make"* — `.codegraph` is not in that exclusion list. Fold `.codegraph` and the loop's own ff-only merge writes into the exclusion set. **Falsification counter: probe trips per week must fall from 72 toward the count of genuine operator sessions.** This is the cheapest measured win in the whole post-mortem and it was unassigned.
2. **`allowed_warning` handling.** `mr-supervisor-prompt-native.md:~116` correctly says not to trip on it but then throws the event away instead of reading the number inside it. lp-01 reads it; lp-11 removes the doctrine sentence that says to discard it.
3. **Repo routing for `mr-ask-drew`.** Doctrine's repo rule sends loop/process decisions to claude-harness, but `mr-ask-drew` defaults to `mdrewt/monster-realm`. Make the default follow the class.

**Effort S. Risk LOW. Rollback: three independent hunks.**

### lp-registry — structured residuals with a sink *(GAP-3 / A11; NEW)*

| field | value |
|---|---|
| **touches** | `memory/projects/mr-brief-template.md`, `memory/projects/mr-residuals.jsonl` (new), `memory/projects/mr-ready` |
| **measured problem** | RF-3: 78 defer phrases, 21 Residuals sections, **zero mechanical consumers**; `after:` has zero mechanical consumers; `mr-state.json`'s `queue[]` is 58 past-tense narrative paragraphs. `mr-brief-template.md:1` asks the runner to *"record it in the handoff"* with no machine-readable sink. Mean disclosure→remediation latency **13.1 days**. Wave 6 drains the existing 367 items; **nothing stops the next 367 accumulating.** |
| **design** | One append-only JSONL record emitted at PR time: `{slice_id, title, owner, touches[], severity, domain, disclosed_at, adr, status}`. `mr-ready` reads it as ready-set input. Nothing blocks a merge. |
| **explicitly NOT the rejected item** | DO-NOT-RETRY #12 rules out *"an ADR defer-phrase CI denylist as a BLOCKING gate"* — a text denylist over prose. This is a registry with a consumer. Different mechanism, different failure mode. |
| **EARS** | (a) WHEN a slice's PR is opened, the runner SHALL append one residual record per named follow-up, or an explicit `residuals: none`. (b) `mr-ready` SHALL surface unclaimed residual records in its ready set. (c) No residual record SHALL block a merge. |
| **proof-of-teeth** | Seed three synthetic residual records; assert `mr-ready` lists all three and that claiming one removes it from the ready set. |
| **falsification** | `residuals_emitted` becomes a pre-registered metric in `lp-17`. If it stays 0 for 4 weeks the brief line is not being honoured and the registry is inert. |
| **effort** | M | **risk** | LOW | **rollback** | additive; revert the brief line and the reader. |

### lp-disjoint — effective-touches computation *(GAP-4 / A6; NEW)*

| field | value |
|---|---|
| **touches** | `memory/projects/mr-disjoint`, `memory/projects/mr-spawn` (brief renderer), one shared companion-rules JSON |
| **measured problem** | `mr-disjoint:6-7` states *"Operates on DECLARED touches only"*, and its STRUCTURAL always-serial list at `:13` is `["Cargo.lock","package-lock.json","client/src/module_bindings/*","evals/run.mjs","*schema*","*migration*"]` — containing **none** of the doc set. Meanwhile `mr-brief-template.md:1` grants **every** slice, universally, `docs/adr/**`, `docs/knowledge/**`, `CHANGELOG.md`, `ARCHITECTURE.md`. So any two concurrent slices collide on the doc set by construction, and `mr-disjoint` returns SAFE every time because it cannot see the grant. |
| **design** | One shared JSON of companion rules read by **both** `mr-disjoint` and the brief renderer: expand declared touches by sibling test files (`X_tests.rs` for `X.rs`, `X.test.ts` for `X.ts`), and move the universal doc-set grant into STRUCTURAL. Additionally add `content/**` to STRUCTURAL (ADR-0145:225 — `CONTENT_VERSION` is a single shared integer and `content-hash.json` is a whole-tree hash, so two concurrent content slices collide by construction). |
| **proof-of-teeth** | Pin the exact `14r-c`/`14r-e` input as a fixture and require `mr-disjoint` to return **SERIAL-REQUIRED** where it previously returned SAFE. |
| **relationship to 15r-g** | Complements, does not duplicate: `.gitattributes` handles the doc set that must stay shared; this stops the code-side sibling collisions `.gitattributes` cannot touch. |
| **effort** | M | **risk** | MED — over-serialising costs throughput, which the operator does not value either way, so err toward serial. | **rollback** | revert the rules file; both consumers fall back to declared touches. |

---

## 4. WAVE 3 — security, scanner integrity, and the deploy gate

**Entry:** Wave 2 exit met. **Exception:** `15r-sec-a` is explicitly **exempt from R13** — it has no dependency on the gauge, the kill switch or the pacing bands, and it is the plan's only CRITICAL live exposure. It may land as soon as W0-6 and W0-0 are done.
**Slices:** 9.
**Cadence:** ~3 weeks.
**Exit — all five:**
1. `battle` is participant-scoped; no client receives another player's battle rows.
2. `KNOWN_UNMIGRATED` is **empty and deleted**, along with `KNOWN_UNMIGRATED_CAP` and the park machinery, with the completeness check demonstrated RED against a fake unmigrated gated eval. *(Replaces the draft's unmeetable "cap 7→2" and R3's incompatible "cap 5→2".)*
3. `concat!()` is gone from `server-module/src/accounts.rs` and `server-module/src/pvp.rs`, `trade-escrow-guards` is demonstrated RED against an injected weakened escrow guard, and `evals/account-e2e.eval.mjs`'s patcher throw is preserved.
4. `master` is protected with required checks `ci` and `e2e`, and a canary PR has completed the supervisor's ff-only merge path.
5. `mr-selfcheck` confirms `merge.ours.driver` is configured **in the runner's git config**, and a synthetic three-way merge on `DIGEST.md` resolves without conflict.

### 15r-sec-a — participant-scoped `battle` *(CRITICAL; moved from Wave 6)*

| field | value |
|---|---|
| **touches** | `server-module/src/schema.rs`, `server-module/src/pvp.rs`, `server-module/src/battle.rs`, `client/src/net/connection.ts`, `client/src/net/connection.test.ts`, `client/src/ui/battleModel.ts`, `evals/monster-privacy.eval.mjs`, `evals/battle-schema-snapshot.eval.mjs`, `docs/adr/0197-*.md` |
| **tier** | hard |
| **ADR** | 0197 |
| **measured exposure** | `server-module/src/schema.rs:396` is `#[spacetimedb::table(name = battle, public)]`. `Battle` carries `player_identity`, `opponent_identity`, `party_monster_ids`, `opponent_monster_ids` and `state: BattleState`, whose `BattleMonster` (`game-core/src/combat/types.rs:41-54`) holds level, current/max HP, all six derived stats, known skills and status. `client/src/net/connection.ts:709` subscribes `'SELECT * FROM battle'` **unfiltered** — every connected client receives every battle row in the world. The in-file comment concedes it is client-side filtering only. This also re-opens the ADR-0040/0045 derived-stat→IV inversion channel that ADR-0194 just closed for `monster_pub`, and it is the exact channel Drew's issue #284 need-to-know decision closed elsewhere. ADR-0042:30 declared M16 *blocked* from reusing this schema without mitigation; M16 shipped anyway (ADR-0109 privatised only `battle_action`). |
| **the unverified mechanism** *(reviewer 2, MAJOR — this is why W0-6 exists)* | Every existing owner view (`my_wallet`, `my_conversation`, `my_account`, `my_monster_pub`) is **single-identity**. `Battle` has **two** identity columns, and `schema.rs:427` records that `client_visibility_filter` is unstable and unavailable in this toolchain. A participant view needs `player_identity = :sender OR opponent_identity = :sender`, whose support in 2.6.0 is unverified. **W0-6 settles it before a brief exists.** If unsupported: two views + a store-level union, re-sized M→L. |
| **EARS** | (a) The `battle` table SHALL NOT be `public`. (b) WHEN a client subscribes, it SHALL receive only rows where it is `player_identity` or `opponent_identity`. (c) The client SHALL read battles only through the view. (d) An exact-body pin SHALL fix the view's predicate. |
| **proof-of-teeth** | Two-identity e2e: client A in a battle, client B connected; assert B's store contains **zero** rows for A's battle. Demonstrated RED against the current `public` table. |
| **the rollout hazard — Q-B4** | `client/src/net/connection.ts:690` is **one** `.subscribe([…])` array containing 20 `SELECT * FROM` entries (measured: `grep -c "SELECT \* FROM" connection.ts` → 20), and `connection.test.ts:1603-1604` asserts that anchor is unique. `docs/adr/0087-*.md:103-105` names it: *"a visibility republish strands ALREADY-LOADED bundles (whole-subscription-batch error, reconnect loop) … Subscription-batch isolation (per-table builders) is a named deferral."* The contract has fired twice already (ADR-0154 wallet, ADR-0194 `my_monster_pub`); this is the **third**. **Correction to the draft's mechanism note:** per-table builders do **not** prevent an old client erroring on a now-private table — they downgrade whole-batch failure to graceful per-table degradation. Still the right reason to want them, but a different claim. **Recommendation to the operator (Q-B4): accept the documented hard-refresh, because the playtest is solo/local, and give `15r-net-a` (per-table builders) a definite slot in Wave 6 §netcode rather than an event-triggered one — otherwise it fires a fourth time.** |
| **fan-out** | `schema.rs` matches `mr-disjoint:12`'s STRUCTURAL `*schema*`, so this is forced SERIAL-REQUIRED automatically. |
| **effort** | L | **risk** | HIGH (client strand on republish) | **rollback** | restore `public` + the original subscribe entry; one commit. |

### 13r-c-2 — trade-family scanner migration + concat unblock *(ORPHAN, now specced)*

| field | value |
|---|---|
| **touches** | `evals/trade-escrow-guards.eval.mjs`, `evals/trade-conservation.eval.mjs`, `evals/trade-reducer-security.eval.mjs`, `evals/scanner-migration-audit.eval.mjs`, `evals/rust-scan.mjs` |
| **tier** | hard |
| **ADR** | 0198 |
| **measured** | `evals/trade-escrow-guards.eval.mjs:36` defines its own `stripRustComments`, `:50` its own `stripRustStrings`, `:73` applies them in the **wrong order** (`stripRustStrings(stripRustComments(rawSrc))`), and `:124` builds a **whole-crate blob** (`parts.push(readFileSync(path.join(dir, f), 'utf8'))`) with `accounts.rs` sorted first. A bare URL literal in `accounts.rs` therefore inverts quote polarity **for the entire crate**. `trade-reducer-security.eval.mjs` is `KNOWN_UNMIGRATED` entry 7 and still calls file-local strippers at `:35, :49, :69, :94, :99, :149, :292, :319, :433, :454, :474`; its `extractFunctionBody` brace-walks **string-unstripped** source. `trade-conservation.eval.mjs` has the same untreated shape. |
| **cap arithmetic — read this** | `trade-escrow-guards.eval.mjs` **can never move the cap.** `isGatedName` (`scanner-migration-audit.eval.mjs:245-247`) returns true only for `-security.eval.mjs` / `-privacy.eval.mjs`; T6 explicitly asserts `isGatedName('zzz-guards.eval.mjs')` is FALSE, and T5b uses `trade-escrow-guards.eval.mjs` as the deliberate **negative** fixture proving an out-of-set entry must RED (measured at `:557-562` — *"would create a cross-slice merge deadlock and is not allowed here"*). Only `trade-reducer-security` moves the cap, by one. **The cap number must not appear in this slice's stopping rule.** |
| **EARS** | (a) All three trade-family evals SHALL import `stripRustSource` from `evals/rust-scan.mjs` and SHALL define no local stripper. (b) `trade-reducer-security`'s `KNOWN_UNMIGRATED` entry SHALL be deleted in the same commit. (c) Function-body extraction SHALL operate on offset-preserving blanked source. |
| **proof-of-teeth** | Per eval, a URL-scheme-literal fixture verified **RED before, GREEN after**. Plus a demonstrated RED of `trade-escrow-guards` against a **deliberately weakened escrow guard** on a throwaway branch — that red is the evidence, not greenness. |
| **falsification** | `grep -n 'stripRustComments\|stripRustStrings' evals/trade-*.eval.mjs` returns zero definitions afterwards. |
| **why it matters beyond trade** | It **gates the M21b-2 deploy** (ADR-0179:482, ADR-0182:459 — *"the deployment-timed follow-up that flips ALLOWED_ISSUERS/ALLOWED_AUDIENCE must not land before 13r-c-2"*). |
| **effort** | L | **risk** | MED | **rollback** | per-eval revert; each is independent. |

### 15r-sec-mig-a / -b / -c — the remaining five blind gated evals *(widened per GAP-1)*

The draft dissolved orphan `14r-c-2` into two slices covering evolution and raising, leaving **four evals with an owner id that would no longer denote anything** — converting a tracked orphan into an untracked one, which is the exact RF-3 failure the plan exists to fix. Measured: `grep -rn '14r-c-2' specs/` → **zero hits**; the id exists only inside the eval and in state prose. So all seven get owners in this wave.

| id | evals | why this grouping |
|---|---|---|
| **15r-sec-mig-a** | `evolution-reducer-security`, `raising-reducer-security` | the two the gate's own canary reports **SWALLOW** the needle — *"canary needle was SWALLOWED"* — highest priority |
| **15r-sec-mig-b** | `battle-reducer-security`, `npc-dialogue-quest-security` | both canary-measured `output length 61 != canary length 78 (not offset-preserving)` — every offset handed downstream is misaligned |
| **15r-sec-mig-c** | `recruit-reducer-security`, `shop-reducer-security` | shop carries the strip-comments-**then**-strip-strings ordering ADR-0181 names as the false-GREEN bug. Recruit additionally carries **two live gate defects from ADR-0054:231**: `recruit-reducer-security.eval.mjs:354` returns early when `checked_sub` is absent, making the guard at `:362` have a provably-false second conjunct (the bare `count - 1` underflow check **can never fire**); and `:250` accepts `None => return Ok(())` as a rejection, so a silently-passing wild-battle guard satisfies the security eval. Fix both here. |

Shared fields for all three: **touches** = the two named evals + `evals/rust-scan.mjs` + `evals/scanner-migration-audit.eval.mjs`. **tier** hard. **ADR** one shared (0199) amended by each. **EARS**: each eval imports `stripRustSource`, defines no local stripper, and deletes its `KNOWN_UNMIGRATED` entry in the same commit. **proof-of-teeth**: per eval, a URL-scheme-literal fixture RED-before/GREEN-after. **effort** M each. **risk** MED. **rollback** per-eval.

**Fan-out (mandatory):** every one of these slices, plus `13r-c-2`, must declare `evals/scanner-migration-audit.eval.mjs` in `touches:`. `mr-disjoint:12`'s STRUCTURAL list includes `*migration*`, and `pat.strip("*") in p` matches `scanner-migration-audit.eval.mjs`, forcing **SERIAL-REQUIRED**. They cannot run in parallel and must not be drawn with a shared brace. *(Reviewer 1; reinforced by reviewer 2's cross-slice-constant finding.)*

Also fold in here (same touch set, zero marginal cost): `evals/encounter-privacy.eval.mjs` migration (ADR-0044:118 — the regex eval is blind to cfg_attr-wrapped or runtime-renamed-table leaks).

### 15r-sec-mig-d — retire `KNOWN_UNMIGRATED`, the cap, and the park machinery

| field | value |
|---|---|
| **touches** | `evals/scanner-migration-audit.eval.mjs` |
| **entry** | `KNOWN_UNMIGRATED.length === 0` |
| **work** | Delete the array, `KNOWN_UNMIGRATED_CAP` (and its four uses at `:805, :828, :1062, :1138`), the park-validation function, and T5/T5b, whose subject no longer exists. |
| **why this is a strengthening, not a weakening** | Once parking is impossible, the **completeness** check ("a gated, Rust-reading file that is neither migrated nor parked FAILS") becomes strictly stricter. This is the real simplification 15r-a was groping at, in a loop measured at **173 total production-source deletions** across the window. |
| **proof-of-teeth** | Add a fake unmigrated gated eval fixture (`zz-fake-security.eval.mjs` with a naive stripper); the completeness check must RED. Delete the fixture; green. |
| **effort** | S | **risk** | LOW | **rollback** | single revert restores the ledger. |

### 15r-d — retire the `concat!()` scanner dodge *(STRICTLY after 13r-c-2)*

| field | value |
|---|---|
| **touches** | `server-module/src/accounts.rs`, `server-module/src/pvp.rs`, `server-module/src/pvp_tests.rs`, `evals/account-e2e.eval.mjs`, `evals/trade-escrow-guards.eval.mjs` (verification only) |
| **tier** | hard | **ADR** | 0200 |
| **measured sites** | `server-module/src/accounts.rs:54` `pub(crate) const ALLOWED_ISSUERS: &[&str] = &[concat!("https:/", "/auth.monster-realm.invalid/")];`; `server-module/src/pvp.rs:63` `const RANKED_PLACEHOLDER_ISSUER: &str = concat!("https:/", "/auth.monster-realm.invalid/");`; **plus three more in `server-module/src/pvp_tests.rs:4772-4774`** (measured today — these are test fixtures and must be swept in the same diff or explicitly justified as deliberate negative controls). |
| **the auth-side hazard the draft missed entirely** *(reviewer 2, MAJOR; GAP-8)* | `evals/account-e2e.eval.mjs:77` hardcodes `export const ISSUER_NEEDLE = 'concat!("https:/", "/auth.monster-realm.invalid/")'`; `:135-140` **throws** *"refusing to publish an unpatched module"* when the needle is absent; `:147` rewrites it into another `concat!()` form **for a live publish**; `:880` reconstructs the whole declaration line; `:1624` asserts the patched line still contains the needle. So deleting the concat from `accounts.rs` **hard-fails the live-publish patcher**, and if the needle silently drifts instead, the account e2e runs against an **unpatched issuer allowlist and passes — a false green on authentication.** R3 covered only the trade-escrow half of this. |
| **non-negotiable invariants in the brief** | (1) `evals/account-e2e.eval.mjs:135-140`'s THROW on an absent token is preserved **verbatim** through the rewrite — that comment says *"a silent no-op"* is the hazard and it is the whole safety property. (2) The `:1624` self-check is **rewritten, not deleted**, to pin the new literal form, with a demonstrated red that a needle mismatch fails. (3) `accounts.rs:52`'s comment ordering future slices to *"Keep the placeholder values, the concat!() construction"* is **removed in the same diff** — leaving it makes production source instruct future slices to restore the dodge. (4) `pvp.rs:63` lands in the same slice; a half-migration leaves two spellings of the same constant. |
| **EARS** | (a) No `concat!()` string-splitting workaround SHALL remain in `server-module/src/*.rs` non-test source. (b) `trade-escrow-guards` SHALL be green with the bare literal present. (c) `account-e2e`'s patcher SHALL still throw on an unpatched module. |
| **stopping rule — CORRECTED** *(reviewer 2, MAJOR)* | The draft's early warning was *"trade-escrow-guards green with the bare literal present is the positive signal"*. **That is unfalsifiable**: the failure mode this slice guards against **is** a false green, and a false green and a true green are the same observation. **Replace with:** after 15r-d, `trade-escrow-guards` must be demonstrated **RED against a deliberately weakened escrow guard** on a throwaway branch, and that red reproduced in the slice's evidence. *Green with no red proof is the warning.* |
| **expected** | `mr-audit` will FLAG the modified assertion. **That detector firing here is a true positive** and should be read as such. |
| **effort** | L | **risk** | HIGH (false green on auth) | **rollback** | restore the two constants and the eval needle; one commit. |

### 15r-g — `.gitattributes` merge strategies, driver, and a selfcheck *(three-part, one slice)*

| field | value |
|---|---|
| **touches** | `.gitattributes`, runner git config, `memory/projects/mr-selfcheck`, supervisor merge recipe in `mr-supervisor-prompt-native.md` |
| **measured** | `.gitattributes` today contains only `* text=auto eol=lf` plus binary declarations — **no `merge=` entries** (read in full). `git config --local --get-regexp 'merge\.'` and `git config --global --get-regexp 'merge\.'` both return **nothing** — there is no `merge.ours.driver` anywhere. Git's `merge=ours` attribute is a **no-op** unless a driver of that name is configured in the git config of the machine performing the merge. So Q-I10's answer is already known: *yes, it needs explicit config, and it is not set.* |
| **the union-merge correction** *(reviewers 2 and 3, both MAJOR — resolved together)* | **Never `merge=union` on human-authored prose.** Union interleaves both sides with no conflict marker, so the failure is always syntactically valid Markdown discovered later by a human. `ARCHITECTURE.md` and `docs/adr/*.md` get **no merge attribute at all** — a conflict there is the correct outcome and must stay visible. **`merge=ours` ONLY on generated artefacts:** `docs/adr/DIGEST.md` and `docs/adr/design-corpus.json` (generated by `justfile:232-240` `adr-digest: node scripts/adr-digest.mjs`, gated by `adr-digest-check` inside `just ci`, with `evals/adr-digest.eval.mjs` TOOTH 6 proving `--check` REDs on drift) and `CHANGELOG.md` (generated by `just changelog`; never hand-edited — a standing project rule). Reviewer 3 is right that union on a *generated* file is worse than useless: it produces byte content the generator would never emit, so it fails CI deterministically. |
| **mandatory pairing** | `merge=ours` discards the other branch's content by design, which is only safe with a **mandatory post-merge regeneration step** in the supervisor's merge recipe (`just adr-digest && just changelog`) plus the existing CI freshness gates (`changelog-freshness` job at `nightly.yml:147`; ADR-0104 gates the digest). |
| **EARS** | (a) `.gitattributes` SHALL declare `merge=ours` for exactly the three generated artefacts and for nothing else. (b) The runner's git config SHALL define `merge.ours.driver true`. (c) `mr-selfcheck` SHALL grep for that config key and emit `SELFCHECK-FAIL` if absent. (d) The supervisor merge recipe SHALL regenerate the digest and changelog after any merge that touched them. |
| **exit condition — CORRECTED** *(reviewer 1)* | The draft's *"doc conflicts structurally impossible"* is unverifiable inside the wave, because R12's early warning (*"any manual conflict resolution after merge"*) only fires on the next collision, possibly weeks later and possibly during a credit pause. **Restate:** *"selfcheck confirms the ours driver is configured AND a synthetic three-way merge on `DIGEST.md` resolves without conflict"* — checkable the day it merges. |
| **effort** | M | **risk** | MED (a wrongly-configured driver is silent) | **rollback** | remove the attributes and the config key; the selfcheck line reverts with them. |

### 15r-f — branch protection *(sole in-flight slice; wave boundary)*

| field | value |
|---|---|
| **touches** | repo settings via `gh api` (no code); the exact call and the pre-change protection JSON recorded in the slice's progress memo |
| **measured baseline** | `gh api repos/mdrewt/monster-realm/branches/master/protection` → **404 "Branch not protected"**. From-scratch enablement, nothing to diff against. |
| **placement — CORRECTED** *(reviewer 1)* | This is the one slice that can stop the loop entirely. It lands as the **only** slice in flight, at a wave boundary, with Wave 3 otherwise fully drained and merged. The draft put it sixth of seven with `N_MAX` defaulting to 2, where a wedge strands a sibling and blocks the wave's remaining merge. |
| **the protection object — pinned** *(reviewer 2)* | Required status checks **only**, names exactly `ci` and `e2e` (W0-5, measured). **Zero** required approving reviews — the supervisor merges its own PRs, and self-approval is prohibited by doctrine, so any nonzero requirement stops the loop dead. **`enforce_admins: false`** — otherwise neither the operator nor the loop token can unblock without deleting the whole object. **No linear-history requirement** that conflicts with the existing ff-only path. Note `ci.yml:3-8` uses `cancel-in-progress: true`, so a superseded run can leave a required check in a non-success state; the canary below is what catches that. |
| **mandatory post-merge canary** | Open a throwaway PR immediately after enabling and confirm the supervisor's ff-only merge path completes on it **before any real slice is briefed**. |
| **the Friday rule — DROPPED as unenforceable** *(reviewer 2)* | *"Do not ship this on a Friday"* has no mechanism: the launcher is an hourly cron, nothing in `mr-native-tick.sh` or `mr-spawn` gates on day-of-week, and the only lever is `.native-supervisor-disabled`, which requires the operator to remember — precisely the babysitting D5 targets. A rule in prose that no code enforces is RF-3 drift *inside the risk register*. The canary PR is the real control and it is mechanical. |
| **effort** | S (the change) / M (the verification) | **risk** | HIGH | **rollback** | `gh api -X DELETE repos/mdrewt/monster-realm/branches/master/protection` — one command the operator can run without the loop. |

---

## 5. WAVE 4 — testing capability, built before the things that depend on it

**Entry:** Wave 3 exit met, **including `15r-f`** (see the required-check constraint below).
**Slices:** 4.
**Cadence:** ~1.5 weeks.
**Exit — all three:**
1. The replacement suite REDs on a deliberately deleted guard, and runs in single-digit seconds for the `game-core` portion.
2. ≥1 subsystem's costume source-scans deleted, each against a demonstrated-red replacement.
3. `15r-e`'s widened gated-set predicate is enforcing with **zero** newly-discovered unmigrated files, because Wave 3 drained them all.

### 15r-e — widen the audit's gated set from advisory to enforcing *(MOVED to Wave 4)*

| field | value |
|---|---|
| **touches** | `evals/scanner-migration-audit.eval.mjs` |
| **why it moved out of Wave 3** *(reviewer 2, MAJOR — resolved against reviewer 1's "put it first")* | Widening `isGatedName` from `-security`/`-privacy` to also cover `-guards` requires **rewriting T5b and T6, the gate's own teeth** — `T6` asserts `isGatedName('zzz-guards.eval.mjs')` is FALSE and `T5b` uses `trade-escrow-guards.eval.mjs` as its deliberate negative fixture. Changing a gate by editing its own teeth is the v3-cutover anti-pattern R13 exists to prevent. And it would instantly hard-fail master for every newly-gated unmigrated file, because parking an out-of-set name is *deliberately illegal*. Reviewer 1's concern (establish the enforcing denominator once, before it moves) evaporates entirely, because after `15r-sec-mig-d` **there is no cap left to move**. |
| **hard prerequisite** | Every file the widened predicate would newly gate is already migrated and green. Enumerate with `ls evals | grep -- '-guards.eval.mjs'` at authoring time and name them in the brief. `13r-c-2` covers `trade-escrow-guards` and `trade-conservation`; ADR-0116:32 also names `pvp-handshake-guards`, `pvp-deadline-disconnect`, `pvp-challenge-reaper` and `ranking-pve-exclusion` as reading Rust with naive strippers while being invisible to the gate — **all of these must be migrated first or the widening REDs master.** If any remain, this slice splits: migrate them (`15r-e-0`) then widen. |
| **EARS** | (a) The gated predicate SHALL cover `-guards.eval.mjs` in addition to `-security`/`-privacy`. (b) T5b's fixture SHALL be re-pointed at a filename still outside the widened set; T6 SHALL gain a new negative case. (c) Resolving a newly-gated file by parking it SHALL be impossible (there is no park list). |
| **proof-of-teeth** | Demonstrated red that the widened predicate still **rejects** a genuinely non-gated name, and that a naive-stripper `-guards` eval REDs. |
| **effort** | M | **risk** | MED | **rollback** | revert the predicate + the two teeth in one commit. |

### 15r-h1 — pure-seam extraction as the PRIMARY idiom *(BLOCKER-corrected; reviewer 2)*

| field | value |
|---|---|
| **touches** | `game-core/src/**` (new pure seams), `server-module/src/movement.rs`, `server-module/src/guards.rs`, the corresponding `*_tests.rs` |
| **the correction** | The draft made a `spacetime call` CLI harness the primary replacement idiom. **The measured-good pattern already exists and is cheaper:** `raising_tests.rs` is 54 tests / 1 source-read because `evaluate_train(...)` was extracted into `game-core` as a pure seam; `game-core` needs almost no source-scanning. A CLI harness is a **third** idiom and the slowest and least debuggable of the three: it needs a published module and a live server (only available in `ci.yml`'s `e2e` job, which does `spacetime start --in-memory --listen-addr 127.0.0.1:3000` at `:149` plus a full publish), it asserts on stringly-typed CLI output, and a failure gives a stderr blob rather than a stack frame. |
| **the two-step rule, written into every brief** | For each guard: **(1)** if the guard's logic can be extracted into a pure `game-core` seam (`fn authorize_x(state, actor) -> Result<…>`), the replacement is a `game-core` unit test in the `raising_tests.rs` style, with the reducer keeping a 3-line delegation. This is a **deepening refactor** that improves changeability, is already proven, runs in the fast `ci` job, and needs no server. **(2)** ONLY guards that are irreducibly reducer-bound (`ctx.sender` identity, table visibility/RLS, transactional rollback) go to the CLI harness (`15r-h2`). |
| **scope for wave 1 of extraction** | `movement_tick`'s battle-lock decision (ADR-0168:208 names this exact gap) and one PvP guard, as the proof that the pattern generalises beyond `raising`. |
| **EARS** | (a) Each extracted seam SHALL be `ReducerContext`-free and unit-tested with real inputs and outputs. (b) The reducer SHALL retain only a delegation call. (c) The corresponding source-scan SHALL be deleted **only** after the unit test is demonstrated RED against the deleted guard. |
| **proof-of-teeth** | Delete the guard body on a throwaway branch; the new unit test must RED. |
| **effort** | L | **risk** | MED | **rollback** | per-seam revert; the delegation is a one-line restore. |

### 15r-h2 — CLI reducer-conformance harness for the irreducible residue

| field | value |
|---|---|
| **touches** | `server-module/tests/` or `scripts/` (CLI-driven), `.github/workflows/ci.yml` (`e2e` job) |
| **why it is still needed** | Measured: there is **no reducer-executing test harness anywhere in the crate**. 18 `*_tests.rs`, 46,434 lines, 637 tests, **120 source-reading sites** (`include_str!` ×106, `read_to_string` ×14; concentration pvp 28/51, evolution 15/42, content_cache 12/28, battle 11/51, economy 10/24). A guard living inside a reducer is unreachable by any behavioural test — which is *why* source-scanning exists. `spacetime --version` → `spacetimedb tool version 2.6.0` on this box, so the CLI route is available. |
| **the vacuity problem — three defences, all required** | (1) **Every assertion pins the `Response text:` substring.** Both a reducer rejection and a server crash surface as EXIT=1; a suite asserting only exit codes passes when the server is dead. (2) **Every negative assertion ships PAIRED with a positive control** — same reducer, same args, an *authorized* identity, asserted to SUCCEED — so a typo'd/absent reducer, wrong arg arity, stale publish or uncreated test identity fails the pair rather than passing the negative. *(reviewer 2)* (3) **Reducer errors carry a stable machine token** (e.g. `E_NOT_OWNER: …`) and assertions pin the **token, not the prose**, so a later slice rewording the human half cannot silently change gate behaviour. |
| **EARS** | (a) Every assertion SHALL pin a stable error token. (b) Every negative SHALL have a positive control. (c) No assertion SHALL ship without a demonstrated RED against its injected defect. |
| **falsification** | The suite's runtime dropping sharply, or a subsystem's assertions all passing on a branch where the guard was deliberately deleted. |
| **effort** | L (split h2a/h2b if capped; per D4 a cap breach is a headroom query, not a kill) | **risk** | MED | **rollback** | the suite is additive; delete the job step. |

### 15r-i.\<subsystem\> ×1 — retire one subsystem's costume scans

| field | value |
|---|---|
| **touches** | one subsystem's `*_tests.rs` + the replacement test file |
| **the rule, repeated verbatim in every brief** | *"No scan is deleted before its replacement is green in CI and demonstrated RED on the injected defect. The 214-test / ~22,336-line ceiling is a **bound, never a target** — if a subsystem's retirement is under 30% of its scans, that is a correct result, not a failure."* This sentence is the single best defence against the deletion count becoming a gameable output metric (DO-NOT-RETRY #10), and it is repeated rather than referenced on purpose. |
| **CI-required constraint** *(reviewer 2, MAJOR)* | *"Green in CI"* is underspecified. `ci.yml` has a **fast `ci` job** (where the 214 scan-touching tests run today) and a separate **`e2e` job**. Deleting fast-job scans and replacing them with assertions in a slow, non-required job converts a **blocking** gate into an **advisory** one — a coverage regression that shows up as all-green. Therefore: **a replacement counts as green in CI only if it runs in a job that is a required status check on `master`.** This makes `15r-i` blocked on `15r-f`, not merely later in the diagram. Combined with the `15r-h1` inversion (prefer pure seams), most replacements land in the fast `ci` job anyway and this constraint binds only on the irreducible residue. |
| **per-subsystem discovery** | Q-I9's 34.3% is an **upper bound**, not a delete list. Distribution is wildly uneven (pvp 28 scan sites, evolution 15, content_cache 12, battle 11, economy 10 … raising 1, taming 1, marshal 0), so a global rate would be meaningless. Apply the two-diagnostic rule per subsystem; discover, do not predict. |
| **effort** | M per subsystem | **risk** | MED | **rollback** | per-subsystem revert restores the scans; the behavioural suite is additive and stays. |

**Remaining `15r-i.<subsystem>` slices move to Wave 6 §testing.** The wave EXIT only requires one subsystem retired, so the undetermined N does not belong in the wave. *(Reviewer 1's Wave-4 count correction.)*

**From here: ≤1 loop-infra slice/week (D-7), ~2 game slices/week.**

---

## 6. WAVE 5 — credit levers

**Entry:** Wave 1 exit met **plus one full reset cycle of samples** (hard constraint 1: instrument → cycle → gate, never the same slice, never the same week). Wave 4 complete.
**Slices:** 4.
**Cadence:** ~2 weeks + one observation cycle.
**Exit:**
1. `lp-12`'s would-hold false-positive rate < 10% over one DRYRUN cycle.
2. `lp-14`: **credits (or Δutil) per MERGED slice does not increase**, first-attempt merge rate does not fall below the 14/15 baseline, **zero scope re-derivation** (absolute veto), and zero slices ending with `SEGMENTS>0` and no PR.
3. `15r-tst-i`: the mutation ratchet fires on a synthetic rate regression and does **not** fire on a population increase with a flat rate.

### lp-12 — plan-usage bands with a FLOOR as well as a ceiling

| field | value |
|---|---|
| **touches** | `memory/projects/mr-cost-watch`, `memory/projects/mr-spawn`, band config |
| **inputs** | `seven_day.utilization` from `lp-01`; the launch-hour/no-launch-hour Δutil estimator (primary for Q-B1) with p90 Δutil-per-tier as the backstop. |
| **the floor** *(reviewer 1, MAJOR)* | Plan credits **do not roll over**. Below the low band the correct action is to **launch more**, not to idle. Under "value per weekly credit" with idle hours free, systematically under-spending a non-rolling allowance is a loss. The draft fixed the cadence as a constant in §2 and gave `lp-12` only a ceiling. **Cadence becomes an OUTPUT of the band, bounded below and above.** |
| **DRYRUN first** | One full cycle logging what it *would* have done, changing nothing. |
| **Q-B2 dependency** | Measured: 29 rows carry `overageStatus:"rejected"` with `overageDisabledReason:"org_level_disabled_until"`, all on `five_hour` `allowed` rows. **REPORTED-not-reproducible** — the `/tmp` logs those came from are ephemeral and the survivors do not go back that far, which is itself the evidence-destruction MD-1 exists to fix. If overage is org-disabled, the OVERAGE band is a **rejection predictor**, not a spend-waste predictor, and its severity ranking changes. Do not infer from the flag; the Wave-0 ask answers it. |
| **effort** | L | **risk** | HIGH (a wrong number the governor trusts) | **rollback** | DRYRUN flag; band config only. |

### lp-13 — arm the cordon *(after lp-09, after lp-12's FP < 10%, and after MD-10)*

| field | value |
|---|---|
| **the MD-10 gate the draft omitted** *(GAP-6)* | Measured: `mr-cost-watch:81` is `[ "$STALL" -eq 6 ] && log "LOG-STALL log not growing for 2min while pass live — enforcement suspended (blind watcher, review F-A)"` — **`-eq`, so it logs the ONSET only and never the end**, making the 89 in-window "episodes" an onset count of **unknown duration**. And `:94` `HARD) if [ "$ENFORCE" = 1 ] && [ "$STALL" -lt 6 ]` suppresses the 125% branch for the entire stall, while the STOP branch at `:88-92` does **not** check STALL at all. **Consequences:** if stalls are long, an armed cordon is blind for an unknown fraction of every run and its false-negative rate is unmeasurable; and the cooperative stop can fire during a stall while the hard branch cannot. **Add an end-of-stall log line and report stall DURATION, not onset count, for one full cycle before arming.** Resolve the STOP/HARD asymmetry deliberately rather than inheriting it. |
| **HC-2** | The cordon is checked in `mr-spawn` **before** anything `mr-ready` proposes. The pacing gate outranks the ready-set. `mr-spawn` is the correct chokepoint because doctrine `:110` already routes every launch through it. |
| **cooperative only** | Never a kill. Checkpoint, push, PR, exit clean. (DO-NOT-RETRY #1: all four historical HARD trips merged EXIT=0; a kill strands locks and hard-blocks relaunch; under a fully-consumed allowance a kill *reallocates* spend rather than saving it, and violates D1.) |
| **operator override preserved** | The cordon is non-overridable by a **spawned session** and overridable by the **operator**, since only the operator can reach `MR_FORCE`. |
| **effort** | M | **risk** | HIGH | **rollback** | disarm flag. |

### lp-14 — bounded context segmentation *(NOT blocked on lp-01)*

| field | value |
|---|---|
| **R10 scoping correction** *(reviewer 1, MAJOR)* | R10's failure mode is a defect in the **gauge reading path**. `lp-12` and `lp-13` genuinely read that gauge and must be blocked. **`lp-14` arms on parent context size, measured from transcripts, not from `rate_limit_info`.** Nothing in its mechanism, veto set or rollback touches the gauge. It blocks on **W0-4** (arming-set replay) plus its own four absolute vetoes. It stays in Wave 5 for fan-out reasons, and is explicitly struck from R10's blocked set so a well-meaning supervisor does not park the plan's largest measured lever. |
| **the mechanism correction — this is the one that decides whether it works at all** *(reviewer 3, MAJOR)* | Measured: `mr-launch.sh:124` is `claude --model "$MODEL" --effort "$EFFORT" --dangerously-skip-permissions --resume "$SID"`, and `:139` is the cost-cap wrap with `--resume "$WSID" --effort low`. The established measurement is that **`--resume` does NOT reset context** (334,916 → 45,235 only on a fresh spawn). `mr-launch.sh`'s only relaunch path is `--resume`. **Therefore: segment N+1 MUST be a FRESH `claude -p` spawn (the `:85` path) seeded from the checkpoint memo, NEVER `--resume`.** If `lp-14` is built on the existing `--resume` loop it produces checkpoint memos and park risk with **exactly 0% context reduction** — the claimed 30–38% becomes zero while the segmentation risk is fully incurred. R7's stated early warnings cannot detect this; **the detectable signal is segment 2's turn-1 prompt token count, which must be ≲50K, not ≳300K.** This is a fifth absolute veto. |
| **the `--effort low` trap** | `:139` uses `--effort low` for the cost-cap wrap. If `lp-14` reuses that wrap prompt verbatim, confirm the checkpoint write is squarely inside D3's *"too simple for the model difference to matter"* exception rather than a silent tier demotion. |
| **kill switch — sentinel, not a magic zero** *(reviewer 2, MINOR but dangerous)* | `segment_ctx_threshold: 0` is ambiguous in exactly the wrong direction: with a `context_tokens > threshold` comparison, 0 makes segmentation **maximally armed**, not off. **Define the off-value as an explicit sentinel tested before any comparison** (`if threshold <= 0: segmentation disabled`), or use key-absence as off, and pin it with a unit assertion in the same slice. **In-flight behaviour:** a run that has already checkpointed **completes its current segment and exits clean; it does not resume.** Add "threshold set to the off-value while a segment file exists" to the test matrix. |
| **EXIT — outcome-based, not volume-based** *(reviewer 2, MAJOR)* | The draft's headline was a token-volume reduction target, which is **monotonically improved by cutting more aggressively** — exactly the behaviour R7 says turns a working slice into a park — while the countervailing veto is qualitative and costs operator attention (against D5). Demote parent-volume reduction to a **diagnostic**. The exit conditions are: (1) credits (or Δutil) per **merged** slice does not increase; (2) first-attempt merge rate does not fall below 14/15; (3) zero scope re-derivation (absolute veto); (4) zero slices with `SEGMENTS>0` and no PR. **If volume drops 38% but per-merged-slice cost is flat, the segmentation bought nothing and is reverted via the config kill switch.** |
| **threshold confidence: LOW** | 250,000 is chosen because p50 parent context is 200,100 and 300K would fire on only 3.1% of turns. **Nobody has observed a segmented run.** W0-4 validates the *arming set*, not the *quality* of the cut. Labelled low confidence, not hidden. |
| **effort** | L (one slice, ~6 edits) | **risk** | HIGH | **rollback** | config-only kill switch, effective next launch; full revert available. |

### 15r-tst-i — mutation survival-RATE ratchet *(NOW HAS A POSITION)*

| field | value |
|---|---|
| **why it is here** | It carries hard constraint 1 (instrument → one full cycle → gate) and the draft placed it **in no wave at all**, mentioned only in Q-I4/Q-I5. A slice carrying a hard constraint cannot be parked in the one wave that has no positions in it. It sits in Wave 5 next to `lp-12`: both are gate-on-instrument slices, both must land at least one full reset cycle after `lp-01`/`lp-02`. |
| **touches** | `justfile`, `evals/nightly-smoke-wiring.eval.mjs`, `docs/adr/0050-*.md` (A2 amendment) |
| **measured** | `justfile:110` is `mutate-server cap="324"`; `evals/nightly-smoke-wiring.eval.mjs:330` is `const MUTATE_SERVER_CAP_BASELINE = 324;`. The cap has drifted 180 → 309 → 308 → 324 across four re-baselines, and **five red nights** were caused by population growth misread as regression: baseline 513 mutants / 299 missed = 58.3% survival; head 753 / 324 = **43.0%** — the population grew 47% while the RATE improved 15 points. |
| **design** | Ratchet on **survival RATE per module** (`missed / viable`), denominator free to grow. Keep the exact-baseline ceremony on the RATE. **Never raise the absolute cap** (DO-NOT-RETRY #4). |
| **prerequisites** | W0-7 (real hosted wall-clock — ADR-0183:42's duration cell is `—` and the circulating "~155 min" appears nowhere: `grep -rn "155" docs/adr/` → nothing) and W0-8 (real `outcomes.json` field schema — read one file, do not infer from the book). |
| **proof-of-teeth** | Synthetic outcomes where the population grows 50% at a flat rate → **must not fire**. Synthetic where the rate worsens 5 points at a flat population → **must fire**. |
| **effort** | M | **risk** | MED | **rollback** | restore the absolute cap in one hunk. |

---

## 7. WAVE 6 — the triaged backlog

**Entry:** Wave 5 exit met.
**Cadence:** ~2 game slices + ≤1 loop-infra per week.
**Ordering:** by severity within shared `touches:` groups. `15r-sec-a` has already landed in Wave 3.
**Cut line at 25.** Everything below it is re-derived from `lp-17`'s weekly report, **not executed from this document six months from now.**

### 7.1 Above the cut line — CRITICAL and HIGH

| # | id | title | severity | touches (abbrev.) | evidence anchor |
|---|---|---|---|---|---|
| 1 | 15r-sec-b | owner-scoped `inventory` (private + `my_inventory` view) | HIGH | `schema.rs:439`, `inventory.rs`, `connection.ts:714` | triple-recorded ADR-0046:132 / 0054:228 / 0059:265; the "no `client_visibility_filter`" blocker is **obsolete** — `schema.rs:433-435` says inventory *"would follow the owner-view pattern (my_monster_pub, ADR-0194)"* |
| 2 | S-13rc2-tail | `pt-b1b` — wire the 8 dead client event sources | HIGH | `client/src/main.ts`, `eventRing.ts` | measured: 8 constructors exist (`eventRing.ts:90-118`) but `grep -n 'eventRing.push' main.ts` → **6 sites only**. H1 (recruit funnel) 3/3 dead, H2 (box) 3/3 dead, H3 loses both trade sources. **The playtest gate cannot measure 2 of its 3 hypotheses.** Cheap and pre-designed: push sites + latches + tests. |
| 3 | S-log-ratelimit | server log rate-limit tail | HIGH | `npc.rs:167`, `movement.rs:304/:314`, `battle.rs` | `npc.rs:167` is an unbounded, **client-triggerable** `log::error!` (`quest_defs_load_error`); `cached_quest_defs` caches its `Err`, so every `talk()` re-fires it → log-ingest DoS. Its sibling at `:188` *is* limited. |
| 4 | S-movement-ratelimit | per-identity token bucket on `enqueue_move` + throttled reject logging | HIGH | `guards.rs`, `movement.rs` | ADR-0148:205 — `grep -n 'rate\|RATE_LIMIT' guards.rs` → no limiting construct; `log_reject` at `:47-55` emits one `log::warn!` per rejection with no throttle. Measured 63.8 sends/s under an honest client flood. |
| 5 | S-taming-settle | ADR-0185 D1 applied to `taming.rs`'s two write-back sites | HIGH | `taming.rs:169`, `:270`, `taming_tests.rs` | both still bare `?`; the **success-path** abort rolls back the already-inserted recruited monster. Gate must scan for `write_back_party_hp(` too. |
| 6 | S-credential-hardening | pre-deployment credential hygiene | HIGH | `authToken.ts`, `bugBundle.ts`, new eval | ADR-0150:181/:188 — a credential at rest with no mechanical no-dump-hook gate, plus the SDK's `?token=` **query-string** credential, addressed in neither ADR-0179 nor ADR-0182. Trigger ("before any hosted deployment") is imminent. |
| 7 | S-overlay-anchor | viewport-anchor the nine in-flow overlay shells + `errorOverlayView` | HIGH | `client/index.html`, `errorOverlayView.ts`, `indexShell.test.ts` | **named by four independent ADRs** (0151:165, 0151:172, 0154:134, 0160:200, 0163:160) whose designated owner (`M-postgate-overlay-registry`) closed via ADR-0164 covering **modality only, never layout**. Measured: only `#help-overlay` (`:83`) and `#menu-overlay` (`:96`) carry `position:fixed`. Concrete cost: the wallet readout renders below the fold. |
| 8 | S-trade-oracle | opaque trade-rejection for balance-dependent rejects | HIGH | `trading.rs:305/:357`, `trading_tests.rs`, `trade-reducer-security.eval.mjs` | ≤64-call binary search yields the counterparty's **exact** private balance — an active oracle, strictly worse than the passive lower-bound leak the same ADR accepted. Fix is a two-line message collapse; it does **not** need RLS. |
| 9 | S1-pvp-lifecycle | `challenge_pvp` party-liveness guard + corpse-active repair | HIGH/MED | `pvp.rs`, `pvp_tests.rs` | ADR-0166 R1/R2 — challenging with an all-fainted party makes the target's `accept_challenge` always error while guard 5b locks the target out for 120s. Repeatable at zero cost. |
| 10 | S10-mutation-banlist | widen `mutateServerRecipeIntact`'s scope-narrowing ban list | HIGH | `evals/nightly-smoke-wiring.eval.mjs` | `:416/:418` ban only `--shard`/`--exclude-re`. `--in-diff`, `--iterate`, `--exclude`, `--skip-calls`, `--test-package`, `--baseline` and every short form (`-e -E -f -F`) are unbanned and could empty `missed.txt` → **vacuously green mutation gate**. |
| 11 | 15r-okf-views | teach the OKF exporter to emit `#[view]` entries | MED→HIGH | `scripts/okf-export.mjs`, `docs/knowledge/` | `grep -rln 'my_wallet\|my_monster_pub\|my_conversation\|my_account' docs/knowledge/` → **zero files**. Four owner-scoped views are the sole sanctioned read path for four private tables and the generated bundle documents **none**. Direct hit on the operator's PRIMARY priority. |
| 12 | 15r-e2e-reconnect | two-window drop/rejoin + despawn e2e | MED | `client/e2e/reconnect.spec.ts` (new) | `grep -rn 'reload()\|rejoin' client/e2e/*.ts` → **zero** across 19 specs. ADR-0085's whole reconnect mechanism has never been exercised end to end. |
| 13 | S4-scan-helpers | one `scan_helpers` module; delete 12 verbatim `strip_rust_comments` copies | MED | `server-module/src/lib.rs`, 12 files | measured `grep -rc 'fn strip_rust_comments' server-module/src/*.rs` → **12**. ADR-0166 R5 said 4; ADR-0186 D7 re-measured 12; still 12. **Do not bundle into a security slice** — 12-file blast radius, zero EARS progress. |
| 14 | S15-evolution-r4 | one binding R4 predicate across three implementations | MED | `validate.rs`, `evolution-content-integrity.eval.mjs`, `eg3_evolution_graph.rs`, `schema.rs` | R4 has **three** implementations and the **dev-time gate authors actually run is the weakest of the three**. Also closes the at-birth and upper-bound holes and the stale R1 comment at `schema.rs:479-481`. |
| 15 | 15r-quest-cascade | quest/NPC-removal cascade + implement `GrantXp` + no-op-skip upsert | MED | `content.rs`, `npc.rs`, `npc_tests.rs` | `grep -n 'player_quest()' content.rs` → **zero**; the pattern exists for `player_conversation` (`:441`, `:677`). `npc.rs:113`: `GrantXp` → **no-op** — a dialogue reward silently grants nothing, and this defer phrase lives **only in a production source comment**. |
| 16 | 15r-battle-gc | hoist terminal-battle GC into a shared helper for both write-back paths | MED | `battle.rs`, `taming.rs`, `battle_tests.rs` | recruit-success calls `write_back_party_hp` (no GC); GC lives only in `write_back_battle_results` (`battle.rs:1157-1180`). `battle.rs:1144-1152` names the aggravation: a retained terminal row sits *"in a `public` table every client subscribes to unfiltered"*. |
| 17 | S-lint-gate | biome preset migration + a non-empty-ruleset tooth | MED | `biome.json`, `client/package.json` | `biome.json:16` `recommended: true` is deprecated; **silently ignored in biome 3.x, disabling every lint rule with a green build**. Also: the deferred test-file `noNonNullAssertion` debt has grown from 117 sites to **949 warnings across 167 files** — the deferral was a growth licence. |
| 18 | S-supply-chain | `npm audit` gate mirroring `cargo audit` | MED | `ci.yml`, `justfile`, `client/package.json` | `ci.yml:79-81` runs `cargo audit` only; grep for `npm audit` across `justfile` and workflows → **zero**. The entire JS/TS tree has no supply-chain gate. |
| 19 | S-zone-sub | zone-scoped `character` + `npc` subscriptions | MED | `connection.ts:691-696`, `:727` | now a **privacy** item after ADR-0194: every client still receives every player's live position in every zone. |
| 20 | 15r-net-a | per-table subscription builders | MED | `connection.ts`, `connection.test.ts` | ADR-0087:105's named deferral, fired **three** times. Give it a definite slot rather than an event trigger. **Mandatory before any hosted deployment.** |
| 21 | S12-client-obs | extract `makeMoveRejectRecorder` + send-side sink pin + structural anti-vacuity guard | MED | `client/src/net/`, `main.wiring.test.ts` | `main.ts:938` is a coverage-excluded shell held off by source-scan teeth only; `main.ts` is at ~50.3% comments with **~408 characters of headroom** before three anti-vacuity ratio guards misfire. |
| 22 | S9-obs-severity | severity-carrying `mr_log_err` + the missing `mr_client_*` recording rules | MED | `observability.rs`, `recording.rules.yml` | `observability.rs` exposes only `mr_log`/`mr_log_breadcrumb`; three write-back fault diagnostics log at `info`, weaker than their `wild_disconnect_writeback_err` sibling. |
| 23 | S23-obs-parks | close four standing ops parks in one pass | MED | `ops/observability/**` | tempo's undefined `-server.http-listen-address` (`:115`, `:140`) means **tempo cannot boot** (ADR-0190 evidence: *"restarting, 11"*); caddy has no port-80 binding; **alloy — the one service that writes — is the one without `read_only`**; `build_sha` grammar is a weak cardinality bound; the relay's OTLP POST client is parked so **no span reaches Tempo**. |
| 24 | S5-recruit-teeth | (folded into `15r-sec-mig-c`) — listed here for traceability | HIGH | — | see Wave 3 |
| 25 | S-heal-locations | `heal_locations` pass: `cost_currency`, zone-1 location, heal send binding, recruit-spec budget | MED | `000-core.ron`, `main.ts`, `healModel.ts`, `recruit.spec.ts` | town healing is **free**, contradicting the GDD's named sink; the plumbing shipped (12r-d) so only the data value is missing; zone 1 carries the whole 7-form wild roster with **no heal point**. Three ADR items, one slice. |

### 7.2 Below the cut line — catalogued, not committed

The remaining ~40 catalogued items (LOW-severity UX polish, docs reconciliation, conditional watches whose triggers have not fired, `S17` client copy tidy, `S18` held-key warp tail, `S19`–`S26`) stay in the triage output as a reference. **They are re-derived from `lp-17`'s weekly report, not executed from this document.** Honest position: Waves 1–5 plus the CRITICAL/HIGH backlog are justified; the tail has **no measured value case at all**.

Three items in the triage deserve promotion consideration when their blockers clear, and are named so they are not re-discovered:

- **`15r-ops-e` (battle event log)** — filed LOW because it is a *decision*, not a build. But ADR-0042:36's decision was **silently dropped, not deferred**, at M14 close (`grep -rn 'BattleEvent' --include=*.rs .` → hits only in `game-core`, zero in `server-module`), and three later residuals block on it. Promote once the store-vs-push call is made.
- **`S-stuck-pending`** (ADR-0177:218) — a player-visible monster stranded at exactly-1-eligible with no reducer coming. A real product defect that should not sit indefinitely; needs an owner decision, not a build.
- **`S-pre-evolve-warning`** (ADR-0176:140) — ~10 wild wins can auto-evolve a monster into the wrong branch with no player action and no warning. The mitigation was deferred with spec §6, which has no slice on disk.

### 7.3 Correctly parked — do NOT queue

Recorded so they are not re-derived: shop stock depletion (YAGNI, and content is not a focus); per-species recruit base rates (content tuning, deprioritised); `MOVE_QUEUE_CAP` retune (two later slices re-affirmed the cap as correct); the service-image migration for the e2e spacetime start (green as-is); the NPC multi-tile-jump watch (trigger has not fired — this is the *correctly shaped* conditional watch the post-mortem praises); `M21b-3` Steam (explicit operator deferral, **not** an orphan); the harness-side `templates/_base` upstream fix (outside monster-realm's build loop entirely).

---

## 8. WAVE 7 — meta, ≤1 slice/week

**Entry:** Wave 6's above-the-cut items complete or explicitly re-prioritised.

### lp-15 — ceremony retirement *(N_MAX SPLIT OUT)*

| field | value |
|---|---|
| **touches** | `memory/projects/mr-feedback` (archived), `memory/projects/mr-feedback-doctrine.md` (archived), `memory/projects/mr-selfcheck`, `memory/projects/mr-supervisor-prompt-native.md`, `memory/projects/mr-native-tick.sh` |
| **the four selfcheck sites — name all four** | `mr-selfcheck:11` (ast-parse of `mr-feedback` — **which also breaks on a `git mv`**, and which the draft's ":12 and :53-54" phrasing undercounted), `:12` (`mr-feedback selftest`), `:53` (grep `"Feedback doctrine (ACTIVE"` in `mr-supervisor-prompt-native.md`), `:54` (grep `"ACTIVE 2026"` in `mr-feedback-doctrine.md`). Plus the tick call site at `mr-native-tick.sh:~137`. **The brief re-counts against the file at authoring time** (standing rule 4). Prompt-side anchor verified present at `mr-supervisor-prompt-native.md:83`. |
| **must be one slice** | Archiving without the selfcheck edits in the same diff leaves an interruptible boundary that is RED. Single revert commit restores everything (`git mv` back + the call-site hunks); nothing is destroyed. |
| **effort** | M | **risk** | MED | **rollback** | one revert. |

### lp-15b — `N_MAX=2` + `NMAX-GATE` *(SPLIT from lp-15; reviewer 2 MAJOR + GAP-10)*

Two reasons for the split. **(1)** It breaks R14's own safety property: R14 justifies the single-slice packaging because *"single revert commit restores everything"* — bundling a concurrency-policy change means the revert that rescues a RED daily selfcheck **also silently restores `N_MAX=3`**, and vice versa. Two unrelated failure modes sharing one rollback. **(2)** If justified on credit savings it is the mirror image of DO-NOT-RETRY #3: concurrency changes the **rate** of consumption, not credits per slice, so lowering it saves nothing and only reduces throughput, which the operator does not value either way.

**Permitted justification, and the only one:** doctrine `:81` already sets *"N_MAX default = 2; up to 4 permitted ONLY under the N≥3 LAUNCH PROTOCOL"*, and the N≥3 protocol was used **zero times**. So this is a **no-op on behaviour** and its real value is **removing dead doctrine**. Ship it as that, or drop it. If a correctness case is wanted instead, use measured merge-conflict/rework rate at N=3 vs N=2 — `mr-disjoint`'s structural serial list already forced N=1 twice, so the data exists.

### lp-16 — `mr-doctrine-lint` in `mr-selfcheck` (CONSTANT PARITY first)
### lp-17 — pre-registration + weekly report section 4

**Metrics — corrected** *(reviewer 2, MINOR but methodologically important)*. Pre-registration is the best idea in the document; the proposed metric was not. **Keep `residuals_emitted`. Drop production-vs-test line ratio** — it improves when tests are deleted (the very action under test — circular) *and* when production code gets more verbose, so it is gameable in both directions by producing or destroying output: DO-NOT-RETRY #10 wearing a different hat. **Replace with metrics that cannot be moved by emitting or deleting lines:**

- credits (or Δutil) per **merged** slice;
- count of escaped defects found by the red-team/reviewer gauntlet **after CI green**;
- mutation **survival RATE per module** (missed/viable, denominator free to grow).

Pre-register the direction of each **before Wave 4 starts**, so the honest outcome *"the behavioural suite simply became the new treadmill"* is refutable rather than arguable.

### lp-18 — `mr-size` backtest *(conditional)*
### lp-19 — review cadence trigger *(conditional)*
### lp-worktree — A27, worktree isolation *(GAP-10; named, not silently omitted)*

Measured: `mr-launch.sh:18` sets `PROJDIR="$HARNESS/projects/monster-realm"` — the **main checkout**, not a worktree — and all three invocation sites (`:85` initial, `:124` resume, `:139` cost-cap wrap) run `( cd "$PROJDIR" && claude … --dangerously-skip-permissions … )`. So concurrent slices under `N_MAX=2` share one working tree with permissions disabled. The post-mortem ranks this last **deliberately**; omitting it from early waves is defensible, **omitting it silently is not** — that would make the plan its own "disclosed-but-untracked" instance.

### lp-20 — spec tier *(DEFERRED past everything, three blockers, gated on Q-B5)*

---

## 9. WEEK-BY-WEEK — what the operator is actually committing to

### The cadence number and why it is 3

Two reviewers disagreed and both were right about their own risk.

- **Reviewer 1 (affordability):** measured from `memory/projects/monster-realm-usage-ledger.jsonl`, between 2026-08-07T02:50Z and 2026-08-10T14:05Z the loop merged **18 costed slices totalling $1,731.35** (mean $96.19; max M21b-2 $274.37; min 12r-b $21.40) while `seven_day.utilization` ran 29% → 90%. So the historical cadence was ~18 slices/week and 4/week is a **~4.5× throughput cut**. Plan credits **do not roll over**; systematically under-spending is a loss.
- **Reviewer 2 (exposure):** Waves 1–4 execute **before `lp-12`/`lp-13` exist**, i.e. with no pacing band at all — the exact condition under which the loop previously drove to 90% while its internal governor reported 64.7%/NORMAL (a measured **1.39× under-report**), and the prior week logged a real `{"status":"rejected","rateLimitType":"seven_day","isUsingOverage":true}`. Idle hours are free; overage is a regression. The downside is asymmetric.

**Resolution: 3 slices/week nominal through Waves 1–4, with a hand-enforced floor of 2 and ceiling of 4 (D1 applied by hand), replaced from Wave 5 by `lp-12`'s band, which has both a floor and a ceiling.** A hard 2/week is a guaranteed forfeit of a non-rolling allowance; 4/week under a blind gauge is the condition that produced the 90% week. **Confidence: LOW** — this is a judgement between two correct arguments, and the number should be replaced by measurement (`lp-12`) as soon as one full reset cycle exists.

### The table

Cost column uses the measured mean of **$96.19/slice** (n=18, 08-07..08-10). The **% of weekly allowance** column is deliberately blank: nothing currently measures the harness's share of account utilization (Q-B1), so every such figure would be an **upper bound at best and fiction at worst**. `lp-01` fills it in from week 4 onward.

| week | wave | slices | what lands | ≈ cost | notes |
|---|---|---|---|---|---|
| 1 | 0 | 1 attended + 8 free | W0-0 spec ceremony; W0-1..W0-8; five ask-drew issues | ~$100 | **Operator attention required.** Nothing else can start. |
| 2 | 1 | 3 | lp-03, lp-07, 15r-a′ | ~$290 | lp-03 first — zero dependencies, ships even if everything slips |
| 3 | 1 | 3 | lp-01, lp-05, lp-11a | ~$290 | lp-01 starts the sample clock |
| 4 | 1 | 3 | lp-02, lp-04, lp-06 | ~$290 | first real gauge readings appear in the tick log |
| 5 | 1 | 1 + observe | lp-doc-a; **Wave 1 exit checked** | ~$100 | one full reset cycle must elapse before Wave 5 |
| 6 | 2 | 3 | lp-08, lp-09, lp-10 | ~$290 | lp-09 is the highest-risk single slice in the plan |
| 7 | 2 | 3 | lp-11, lp-registry, lp-disjoint | ~$290 | **Wave 2 exit checked** |
| 8 | 3 | 3 | 15r-sec-a, 13r-c-2, 15r-sec-mig-a | ~$400 | all hard tier; 15r-sec-a may slip to L if W0-6 says the OR-predicate is unsupported |
| 9 | 3 | 3 | 15r-sec-mig-b, 15r-sec-mig-c, 15r-sec-mig-d | ~$300 | serialised by `mr-disjoint`'s `*migration*` rule — **cannot** run in parallel |
| 10 | 3 | 2 | 15r-d, 15r-g | ~$250 | 15r-d strictly after 13r-c-2 |
| 11 | 3 | **1** | **15r-f alone**, plus the canary PR | ~$100 | **nothing else in flight all week.** Wave 3 exit checked. |
| 12 | 4 | 3 | 15r-e, 15r-h1, 15r-i.×1 | ~$350 | |
| 13 | 4 | 1–2 | 15r-h2 (split if capped) | ~$200 | **Wave 4 exit checked** |
| 14 | 5 | 2 | lp-12 (DRYRUN), 15r-tst-i | ~$250 | DRYRUN observes for one full cycle |
| 15 | 5 | 2 | lp-14, lp-13 (armed after MD-10 measured) | ~$250 | **Wave 5 exit checked; the band takes over cadence** |
| 16–24 | 6 | ~2–3/wk | the 25 above-the-cut backlog items | ~$250/wk | ordering by severity within `touches:` groups |
| 25+ | 7 | ≤1/wk | lp-15, lp-15b, lp-16, lp-17, lp-worktree | ~$100/wk | overlaps Wave 6 |

**Honest totals.**

- **Waves 0–5: 34 slices, ~15 weeks (~3.5 months), ~$3,600** at the measured mean.
- **Plus Wave 6's above-the-cut 25: ~9 weeks more → ~24 weeks total (~5.5 months), ~$6,000.**
- Executing all ~65 catalogued Wave-6 items would add roughly 13 more weeks → **~8 months**. **This document does not commit to that.**

Compare against the historical burn: 18 slices for $1,731 in 3.5 days took utilization 29% → 90%. This plan's 3/week is roughly **one sixth** of that rate. That is comfortably affordable **and** is the reason `lp-12` needs a **floor** — at one sixth of the historical burn, the plan risks forfeiting a large fraction of a non-rolling weekly allowance for nothing. Both failure directions are live, which is precisely why the gauge is Wave 1 and the band is Wave 5.

---

## 10. NOT DOING — and the mechanism that keeps it that way

| # | not doing | why (measured) | mechanism |
|---|---|---|---|
| 1 | `costwatch_enforce=true` as a **kill** | all 4 historical HARD trips merged EXIT=0; a kill strands locks and hard-blocks relaunch; 2 of 4 counterfactual kills land at 81.7% and 87.9% of real cap; under a consumed allowance a kill **reallocates** spend, and it violates D1 | `lp-13` ships as a cooperative stop-flag only (checkpoint, push, PR, exit clean); the brief forbids a kill path |
| 2 | trimming the supervisor prompt to save tokens | ~$83/yr, **0.087%** of spend | R11's rejection rule; any rewrite must be justified on correctness or retrievability |
| 3 | raising duty cycle, `N_MAX` or cron frequency for throughput | concurrency changes the **rate**, not credits per slice; at 87% utilization N=4 drives straight into overage | `lp-15b`'s justification is restricted to *removing dead doctrine* |
| 4 | raising the **absolute** mutation survivor cap | 513/299 = 58.3% → 753/324 = **43.0%**: the population grew 47% while the rate improved 15 points; the absolute cap fired 5 red nights on a real improvement | `15r-tst-i` ratchets on **rate per module**, denominator free to grow |
| 5 | the fable-vs-opus A/B on current instruments | every quality column is dead: `remote_red_fix_cycles` = 0 across 446 v3-era rows; `master_ci_after` reads "pending" on 9 of 17; ATTEMPTS is a spawn counter | `lp-17` must pre-register a working quality metric *before* any model A/B is proposed |
| 6 | routing spec authoring to the hard-tier model | no observed quality deficit: 15/15 merged, 14/15 first-attempt, zero spec-ambiguity failures | the residual spec format is on the DO-NOT-BREAK list |
| 7 | cutting the heavy elaboration ceremony on format-equivalence grounds | refuted | — |
| 8 | `clear_thinking_20251015` / `context-management-2025-06-27` in `mr-launch.sh` | **unimplementable** — that path invokes the Claude CLI, not the Anthropic API | `lp-14` uses bounded segments (turn cap + checkpoint + **fresh spawn**) |
| 9 | `first_repo_edit_turn` as a target | gameable, and pressures against the pre-code gauntlet that demonstrably works | absent from `lp-17`'s metric set |
| 10 | tokens-per-line-added as a KPI | improves whenever the loop emits **more** lines | absent from `lp-17` |
| 11 | "remediation share of spend" as a headline metric | imports a feature-velocity objective the operator disclaimed; gameable by relabelling | absent from `lp-17` |
| 12 | de-duplicating repeated file reads (~$4/wk); the ollama triage hop (0 invocations ever, 2 generations); standalone maintenance ceremonies (0-for-3 on survival); an ADR defer-phrase CI **denylist as a blocking gate** | measured dead ends | `lp-registry` is a **registry with a consumer**, explicitly not a text denylist |
| 13 | "correcting" `.weekly-reset-anchor` | it is already right (`1784851200` decodes to Thu 20:00 America/New_York, matching both the plan reset and the observed `resetsAt`) | any brief proposing it is rejected on sight |
| 14 | **CUT — 15r-a as `>` → `!==`** | converts a redundant constant into load-bearing cross-slice state on one shared line; four Wave-3 slices would race on it, and a badly-resolved conflict REDs master **for doing more migration** | replaced by `15r-a′` (advisory) + `15r-sec-mig-d` (delete the constant) |
| 15 | **CUT — Wave 2's "MR_FORCE=1 cannot launch under a hold"** | deletes the operator's only manual escape hatch; `MR_FORCE` is already provenance-scoped and stripped from all five child spawners | replaced by the provenance-on-`rm` exit condition |
| 16 | **CUT — the "not on a Friday" rule for 15r-f** | no mechanism exists; nothing gates on day-of-week and the only lever requires the operator to remember (against D5) | replaced by the mandatory post-merge canary PR |
| 17 | **CUT — `merge=union` on `ARCHITECTURE.md` or any ADR** | union interleaves prose with no conflict marker; the result is always syntactically valid and always wrong | `merge=ours` on **generated artefacts only**, plus mandatory regeneration |
| 18 | **CUT — the CLI harness as the primary replacement idiom** | a third idiom, slowest and least debuggable; would move guard coverage out of the fast `ci` job | `15r-h1`'s two-step rule: pure `game-core` seams first, CLI only for the irreducible residue |

---

## 11. ANTI-PATTERN LEDGER

| # | anti-pattern | where it bit (measured) | mechanism that prevents it here |
|---|---|---|---|
| A | **Changing a gate by editing its own teeth** | the v3 cutover replaced its own instrument in the same commit and is **permanently unevaluable**; the draft's `15r-e` would have rewritten T5b and T6 | R13's ordering constraint; `15r-e` moved behind full migration so the predicate change needs no teeth relaxation; `15r-d` **rewrites, never deletes**, `account-e2e.eval.mjs:1624` |
| B | **A binary tripwire on a continuous gauge** | `utilization` dropped at `mr-native-tick.sh:364`; `mr-audit` collapses a diff to a FLAGGED bit (0 TPs / 446 rows); the activity probe collapses mtime to a trip (72/72 FP, 65 on the loop's own `.codegraph` writes) | `lp-01` persists the magnitude; `lp-04` keeps the 0-precision detector permanently advisory; `lp-11` excludes `.codegraph` with a falsification counter |
| C | **A record with no queue** | 78 defer phrases, 21 Residuals sections, **zero mechanical consumers**; `after:` zero consumers; `queue[]` = 58 narrative paragraphs; mean disclosure→remediation **13.1 days** | `lp-registry`'s append-only record read by `mr-ready`; `residuals_emitted` pre-registered in `lp-17` |
| D | **An orphan created by dissolving a tracked orphan** | the draft's Wave 3 dissolved `14r-c-2` into two slices, leaving four evals with an owner id denoting nothing (`grep -rn '14r-c-2' specs/` → **0**) | all seven evals get owners in Wave 3; `15r-sec-mig-d` deletes the ledger only when it is empty |
| E | **A rule stated in prose that no code enforces** | the Friday rule; R2's three wedge predicates with no consumer; `mr-brief-template.md:1`'s "record it in the handoff" | the Friday rule is cut; R2's predicates become three greps in `mr-selfcheck` + `lp-03`'s nightly issue; the handoff line becomes `lp-registry` |
| F | **A gate that has never failed** | `merge=ours` with no driver configured is inert and silent; `nightly.yml` under `contents: read` fails silently at the API call | every gate ships with a demonstrated RED against an injected defect; `15r-g` adds a selfcheck for the driver key; `lp-03` adds `issues: write` in the same diff |
| G | **Production source shaped to satisfy broken test infrastructure** | `concat!()` in `accounts.rs:54` and `pvp.rs:63`, with `accounts.rs:52` **instructing future slices to keep it**, and three more copies in `pvp_tests.rs:4772-4774` | `13r-c-2` fixes the scanner **first**; `15r-d` then deletes the dodge **and the instructing comment** |
| H | **A vacuously-green behavioural gate** | both a reducer rejection and a server crash surface as EXIT=1; `--in-diff`/`--iterate`/short forms could empty `missed.txt` | `15r-h2`'s three defences (substring pin + positive control + stable token); `S10-mutation-banlist` widens the flag ban with a BAD fixture per flag |
| I | **An output metric that rewards producing output** | 82,076 in-window insertions, 16.7% production, 72.2% test+eval, **173 total production-source deletions** — no simplification pressure anywhere | `lp-17`'s metric set contains no line-count metric; R6's ceiling clause repeated verbatim in every `15r-i` brief |
| J | **Stale citations in a brief** | measured corrections needed this cycle alone: `0180-observability-selection.md` → `0180-observability-stack-selection.md`; `b64_encode` `:1577` not `:1575`; `parse_frame_header` `:1688` not `:1695`; `MUTATE_SERVER_CAP_BASELINE` `:330` not `:323`; `ATTEMPT=` at `:84`/`:123` not `:100`/`:129`; `master_ci_after` empty on **467** of 710, not 376 | standing rule 4, **extended to numbers**: every count/cap/threshold carries the command that produced it |
| K | **A gauge trusted before it was validated** | the internal governor reported 64.7%/NORMAL while the real number ran to 90% — a **1.39×** under-report | hard constraint 1: instrument → one full reset cycle → gate, never the same slice, never the same week |

---

## 12. RISK REGISTER

Each row: risk → early warning (with a **named consumer**) → stopping rule.

| # | risk | early warning + who watches it | stopping rule |
|---|---|---|---|
| **R0** | **The plan consumes the allowance it is protecting.** Waves 1–4 run before any pacing band exists — the same condition that produced the 90% week under a 64.7% self-report. *(reviewer 2, MAJOR — the draft had no such row.)* | Any `seven_day.utilization` sample above the prior week's same-weekday reading. Watched by: the operator, from `lp-01`'s log, weekly. | D1 applied by hand: finish in-flight, start nothing, until `lp-12` exists. Cadence is 3/week nominal (floor 2, ceiling 4) until the band replaces it. |
| **R1** | **W0-0 never happens**, so nothing is launchable and the credits go to standdown ticks. | Any tick logging `STANDDOWN` with a "spec undrafted" reason. Watched by: `mr-selfcheck` grep (added in Wave 2) and `lp-03`'s nightly issue. | The plan does not start. Do not "work around" it by launching an unspecced slice — that reproduces the 13r-c-2 orphan. |
| **R2** | **A Wave-2 slice wedges the loop.** `lp-08`, `lp-09`, `lp-10` all edit `mr-native-tick.sh`'s gate chain — the code with 0 ORPHAN-RUN / 0 WATCHER-DEAD / 0 CRASHED in-window. | Three predicates, each with a **consumer**: (a) a tick logging `STANDDOWN no-ready-work` while `launchable_count > 0`; (b) a `REFUSED-HOLD` with no flag file present; (c) **a zero-byte `.native-supervisor-disabled` cleared by any actor other than the operator**. Watched by: three greps over the last 24h of tick log added to `mr-selfcheck` (~10 lines) plus `lp-03`'s nightly notification. | Revert the single slice immediately — each has a one-hunk rollback. **Do not forward-fix a wedged loop.** `mr-supervisor-disable` must keep working unmodified on both sides of every merge, which the fail-safe OPERATOR default guarantees. |
| **R3** | **`15r-d` lands before `13r-c-2` is genuinely complete**, re-inverting quote polarity crate-wide → **a false GREEN on a security gate**, strictly worse than the dodge removed. | Greenness is **not** the signal — a false green and a true green are the same observation. The warning is `trade-escrow-guards` green **with no accompanying red proof**. Watched by: the merge reviewer, against the slice's evidence bundle. | `15r-d` may not be briefed until (a) `grep` confirms `trade-escrow-guards.eval.mjs` imports `stripRustSource` and defines no local stripper, **and** (b) a demonstrated-RED proof exists showing it failing against an injected weakened escrow guard. If it reds after `15r-d`, revert `15r-d` the same day. **The cap number must not appear in this rule.** |
| **R4** | **`15r-f` deadlocks the supervisor's own merge path.** | The first ff-only merge after the change fails, or a PR sits with checks reported as `expected` and never resolving. Watched by: the mandatory canary PR, run immediately after enabling. | Rollback is `gh api -X DELETE repos/mdrewt/monster-realm/branches/master/protection` — recorded in the progress memo with the pre-change protection JSON, runnable by the operator without the loop. Ship it as the **sole** in-flight slice. |
| **R5** | **`15r-h2` goes vacuously green** — a suite asserting only exit codes passes when the server is dead, the reducer name is misspelled, the arity is wrong, the publish is stale, or the test identity was never created. | The suite's runtime dropping sharply, or a subsystem's assertions all passing on a branch where the guard was deliberately deleted. Watched by: the slice's own runtime record in the ledger. | Every assertion pins a **stable error token**, carries a **positive control**, and has a **demonstrated RED**. If any assertion cannot be shown RED against its injected defect, it does not ship. |
| **R6** | **`15r-i` deletes a scan whose replacement does not cover the same defect** — or moves coverage from the required `ci` job into a non-required `e2e` job, an all-green coverage regression. | A red-team or reviewer finding in a subsystem whose scans were just retired. Watched by: `lp-17`'s escaped-defect count. | No scan is deleted before its replacement is demonstrated RED **and** runs in a job that is a **required status check** on `master` (hence the `15r-f` dependency). Ceiling is a **bound, never a target**: under-30% retirement is a correct result. |
| **R7** | **`lp-14` converts a working slice into a park — or delivers 0% saving.** | Five signals: a `.done` with `SEGMENTS>0` and no PR; an empty "exact next step" in a progress memo; segment 2's first-edit index exceeding segment 1's; **segment 2's turn-1 prompt token count ≳300K instead of ≲50K** (proves it used `--resume` and saved nothing); per-merged-slice cost flat despite a volume drop. | Any of the five absolute vetoes reverts it. Kill switch is an explicit **sentinel** (`threshold <= 0 → disabled`, tested), config-only, effective next launch. A run that has already checkpointed **completes its segment and exits clean; it does not resume**. |
| **R8** | **`S23-obs-parks` becomes an unbounded stack-repair project.** Measured: `ops/observability/docker-compose.yml` binds **seven+** services under `network_mode: host` (prometheus `:34`, alloy `:60`, loki `:103`, tempo `:120`, grafana `:145`, node-exporter `:171`, a service at `:195`, node at `:239`), `:4-5` documents that `ports:` is inert under host networking, and `grep healthcheck` returns **zero hits**. | The slice exceeding its cap with fewer than half the services green. | Time-box it. Land over the subset that boots and record excluded services as **named debt with owners** — the self-retiring pattern already working at `evals/scanner-migration-audit.eval.mjs:126-191`. A partial gate with a written exclusion list beats an abandoned slice, and beats one that quietly widens its own scope. |
| **R9** | **`15r-sec-a` strands every connected client on republish** (third firing of ADR-0087:105's named deferral), **or its two-identity view predicate turns out unsupported mid-slice.** | The first playtest after merge failing with a whole-subscription-batch error; or W0-6 returning "unsupported". | W0-6 settles the predicate **before** the brief exists; if unsupported, re-scope to two views + store union and re-size M→L. For the refresh: accept and **document** a mandatory hard-refresh (Q-B4 recommendation; the playtest is solo/local) and give `15r-net-a` a definite Wave-6 slot. Do not discover this during a playtest. |
| **R10** | **Wave 1's exit is never met** because the gauge parser diverges from offline recompute. | `lp-01`'s selftest failing to reproduce W0-1/W0-2 within 1%. | **`lp-12` and `lp-13` are blocked, not worked around.** **`lp-14` is explicitly NOT in this blocked set** — it does not read the gauge. A band from a wrong gauge is worse than no band, because it will be trusted. |
| **R11** | **A loop-infra slice is justified on efficiency and is not worth it.** MEASURED: the supervisor layer is **2.9% of spend** ($250.04 vs $8,394.81; last supervisor tick row `cost_usd` ≈ $2.05 vs $96.19 mean per slice). | Any brief whose value case reads "saves N tokens per tick". Watched by: the brief reviewer. | Reject it. **Scoped correctly:** a **supervisor-layer** slice may not be justified on token efficiency; **build-session** efficiency is a separate category with a ~65%-of-spend denominator (prefix replay) and may be justified on **cost per MERGED slice**, never on raw volume. This is what keeps R11 from being cited to kill `lp-14`. Permitted justifications for loop-infra: correctness, insurance, or removing a paid idle tick. D-7 caps them at 1/week from Wave 4. |
| **R12** | **Doc-set merge conflicts recur despite `15r-g`**, because the driver is inert. | `mr-selfcheck` reporting the `merge.ours.driver` config key absent — checkable the morning after the merge, not at the next collision weeks later. | Verify the driver is configured in the **runner's** git config, not just the repo's. Never union on prose. If a generated file ever conflicts, regenerate rather than resolve. |
| **R13** | **The plan is executed out of order** because Wave 1 produces no visible product value. | Any slice that **reasons about the gauge** merging before Wave 1's exit is met. *(Narrowed per reviewer 1: R13 binds gauge-consuming slices, not everything numbered ≥3. `15r-sec-a` is explicitly exempt.)* | The v3 cutover is the precedent: it replaced its own instrument in the same commit and is permanently unevaluable. If Wave 1 is skipped, every subsequent claim becomes unfalsifiable and the whole exercise repeats. **This is the one ordering constraint with no negotiable version.** |
| **R14** | **`lp-15` turns the daily selfcheck permanently RED.** | `SELFCHECK-FAIL` in the tick log the day after merge. | It **must be one slice** — archiving without all four `mr-selfcheck` edits (`:11`, `:12`, `:53`, `:54`) in the same diff is the failure. Single revert restores everything. **`N_MAX` is split into `lp-15b`** so one rollback does not carry two unrelated failure modes. |
| **R15** | **A brief cites a path, line or number that has drifted.** | A slice failing at its first Read with "file not found", or a grep returning zero hits. | Standing rule 4, extended to numbers. The briefs that measurably work already `ls`-verify and prefer symbol names. The draft's own "cap 5→2" vs disk's 7, and the established brief's "6 blind evals" vs 7, are the case in point. |

---

## 13. OPEN QUESTIONS

### 13.1 BLOCKING — issued as non-blocking `mr-ask-drew` items in Wave 0

| # | question | blocks | why it blocks | how it gets answered |
|---|---|---|---|---|
| **Q-B1** | What fraction of account-wide `seven_day.utilization` is the harness? | `lp-12`, `lp-13`, the whole cadence assumption | Without it the band cannot distinguish "the loop is burning too fast" from "Drew used Claude heavily on another machine today" — opposite responses (throttle vs. throttling forfeits allowance for nothing). | **Primary (new): the launch-hour vs no-launch-hour Δutil difference, which falls out of `lp-01` for free** once samples are tagged with `slices_running` and the gate reached. Backstop: p90 Δutil per tier. The old fallback (a regression demanding R²≥0.6, n≥20) becomes the third resort. The 85h halt is **not** usable as a natural experiment (no samples emitted; endpoints straddle the reset). *(Confidence MEDIUM — utilization is whole-percent quantised and lagged; needs a full reset cycle to settle.)* |
| **Q-B2** | Is auto-purchase of extra credits actually ON? | `lp-12`'s OVERAGE band semantics | If overage is org-disabled, the OVERAGE band is a **rejection predictor**, not a spend-waste predictor, and its severity ranking changes. | Ask Drew directly (`--repo mdrewt/claude-harness`). **Do not infer from the flag.** Note the 29 rows with `overageDisabledReason:"org_level_disabled_until"` are **REPORTED-not-reproducible** — the source logs are ephemeral and gone, which is itself the evidence-destruction MD-1 exists to fix. |
| **Q-B4** | Accept a third mandatory hard-refresh for `15r-sec-a`, or land `15r-net-a` first? | `15r-sec-a` sequencing | ADR-0087:105's hard-refresh contract has fired twice (ADR-0154 wallet, ADR-0194 `my_monster_pub`); this is the third. | Operator call. **Recommendation: accept the hard-refresh** (the playtest is solo/local) **and give `15r-net-a` a definite Wave-6 slot rather than an event trigger**, or it fires a fourth time. The only question that may escalate to `--blocking`, and only against its own slice. |
| **Q-B5** | Which milestones, if any, may an unattended session author specs for? | `lp-20`; indirectly `lp-08`'s `triaged>0 && launchable==0` escalation | Until Drew names milestones, the loop's answer is an `mr-ask-drew` item and a hold — correct, but it costs operator attention (against D5), and W0-0 shows exactly how much. | Operator decision. Genuinely deferrable: `lp-20` sits behind everything with three blockers of its own. The allowlist ships **empty** by design. |
| ~~Q-B3~~ | ~~exact required-check names~~ | — | **ANSWERED, MEASURED 2026-08-15.** `ci.yml:11` `jobs:`, `:12` `ci:`, `:97` `e2e:`, neither with a job-level `name:` → the check contexts are **`ci`** and **`e2e`**. The workflow display name `CI` at `ci.yml:1` is **not** the check name; using it produces exactly the never-resolving `expected` deadlock R4 warns about. W0-5 is reduced to a one-line re-confirm against a live PR's `gh pr checks <n>` immediately before `15r-f`. |
| ~~Q-I7~~ | ~~are M22–M25 genuinely unauthored?~~ | — | **ANSWERED, MEASURED.** `wc -l specs/monster-realm-v2/M2[2-5]*.spec.md` → 37 / 37 / 34 / 40 = **148 lines** across four milestones, vs 655+ for an authored milestone. They are ~35-line design sketches. `mr-state.json` independently records *"M22-25 still design-sketch/unelaborated"*. The elaboration-tier value case stands on measured ground. An open question a 5-second `wc -l` settles is a decision the plan should have made. |

### 13.2 IN-FLIGHT — resolvable during execution, do not hold the plan

| # | question | resolve during | note |
|---|---|---|---|
| Q-I1 | Is `seven_day.utilization` provably monotone non-decreasing within a reset bucket? | `lp-01` selftest (W0-2) | INFERRED from 160 adjacent same-week pairs with 5 decreases, all exactly 0.01 (quantisation dither). A larger decrease invalidates `util_floor = max()` and `lp-12` needs a decay model. Cheap to detect. |
| Q-I2 | Can `utilization` be sampled while no session runs? | `lp-01` after one cycle | **Revised (reviewer 2).** Samples are available **every hour the tick actually spawns a decision run**, not only on launch hours — so the gauge is far less blind than the draft assumed. It is blind only while the disabled flag short-circuits at `mr-native-tick.sh:124`, and that costs nothing because resume is timer-driven off `resetsAt`. This turns Q-B1 from a blocking unknown into a Wave-1 byproduct. |
| Q-I3 | Are SpacetimeDB 2.6.0 server→client frames uncompressed UTF-8 on `v1.json.spacetimedb`? | the `15r-h-ws` spike, only if taken | Unknown. `sim-harness/src/bin/mr_load_driver.rs:1784` `drain_feed` discards payloads without inspecting a byte, so the green load-driver run is **not** evidence. Irrelevant unless session-coupled coverage is demanded. |
| Q-I5 | Exact field schema of `mutants.out/outcomes.json` | **W0-8, before `15r-tst-i`'s parser** | The cargo-mutants book confirms the file holds summary counts but does not document field names. Read one real file. Consistent with the repo's own posture (the cap constant is duplicated under a lockstep-equality rule and pinned against a real artefact). |
| Q-I6 | Do loki 3.7.6 and tempo 2.10.7 expose stable readiness endpoints on the loopback ports the compose file binds? | `S23-obs-parks` | Confirmed a real prerequisite: `grep -n healthcheck ops/observability/docker-compose.yml` → **zero hits**. loki is pinned at `grafana/loki:3.7.6@sha256:…` (`:103`), tempo at `grafana/tempo:2.10.7@sha256:…` (`:120`), both `network_mode: host`. Needed to write correct `healthcheck:` blocks rather than guessed ones — a guessed endpoint fails loudly at first run, which is why this does not block. |
| Q-I8 | Can a Node process using `spacetimedb@2.6.0` + the committed bindings hold a live headless connection? | only if `15r-h-ws` is taken up | The dependency and 64 binding files exist; the headless-Node connection is untested and is the one real risk in that route. Correctly gates only the conditional route, not `15r-h2`. |
| Q-I9 | How many of the 214 scan-touching Rust tests have a genuinely architectural predicate that must survive? | per subsystem, during `15r-i` | 34.3% is an **upper bound**, not a delete list. Distribution is wildly uneven (pvp 28, evolution 15, content_cache 12, battle 11, economy 10 … raising 1, taming 1, marshal 0), so a global rate is meaningless. `raising_tests.rs` at 1 scan site is the existing proof the good pattern is reachable. |
| ~~Q-I4~~ | ~~hosted wall-clock for the 753-mutant run~~ | **moved to W0-7** | `docs/adr/0183-*.md:42`'s hosted duration cell is literally `—`; `grep -rn "155" docs/adr/` → nothing, so the circulating "~155 min" is unsourced. One `workflow_dispatch` with timing captured settles whether sharding is needed. Near-zero cost, so it belongs in Wave 0. |
| ~~Q-I10~~ | ~~does `merge=ours` need explicit runner git config?~~ | **ANSWERED — resolve inside `15r-g`** | Measured: `git config --local --get-regexp 'merge\.'` and `--global` both return nothing; `.gitattributes` has no `merge=` entry. **Yes, it needs explicit config, and it is not set.** The failure mode Q-I10 describes is the *default* state `15r-g` must actively escape, not a contingency. |

---

## 14. CHANGELOG — what changed from the draft and why

**Cut outright (with reason):**

- **`15r-a` as `>` → `!==`.** Converts a redundant third copy of an already-doubly-pinned invariant into load-bearing cross-slice state on a single shared line, which four Wave-3 slices would race on; a badly-resolved conflict REDs master **for doing more migration**. Replaced by `15r-a′` (non-blocking advisory + corrected message) and `15r-sec-mig-d` (delete the constant when the ledger empties).
- **Wave 2's exit condition "MR_FORCE=1 cannot launch under a hold."** All three reviewers refuted it independently; measured, `MR_FORCE` is the operator's only manual path and is already stripped from all five child spawners. Replaced by the provenance-on-`rm` exit condition with an OPERATOR fail-safe default.
- **The Friday rule for `15r-f`.** No mechanism exists; it is RF-3 drift inside the risk register. Replaced by the mandatory post-merge canary PR.
- **`merge=union` on `ARCHITECTURE.md`** (and any consideration of it for `DIGEST.md` / `design-corpus.json`). Union on prose silently interleaves; union on a *generated* file produces content the generator would never emit and fails CI deterministically. `merge=ours` on generated artefacts only.
- **The CLI harness as the primary replacement idiom.** Inverted: pure `game-core` seams first (the measured-good `raising_tests.rs` pattern), CLI only for the irreducible residue.
- **`lp-17`'s production-vs-test line-ratio metric.** Circular (improves when tests are deleted — the action under test) and gameable in both directions.
- **Wave 4's "~4 slices" framing.** N was undetermined by construction; the wave EXIT only requires one subsystem retired, so the remaining `15r-i.<subsystem>` slices moved to Wave 6.
- **Q-B3 and Q-I7 as open questions.** Both answered by one command each; carrying them open was a punt the plan elsewhere criticises.

**Corrected in place:**

- **Wave 3's exit "cap 7→2" and R3's "cap 5→2"** — neither reachable, and mutually incompatible. Replaced by "`KNOWN_UNMIGRATED` empty and deleted", achieved by widening the migration to all seven evals.
- **The blind-eval count: 6 → 7.** The established brief's claim that `trade-reducer-security` is migrated is **wrong**; it imports `rust-scan.mjs` but scans with local strippers and is `KNOWN_UNMIGRATED` entry 7. Flagged as instructed.
- **`15r-sec-a` moved Wave 6 → Wave 3, first**, and gated on a new W0-6 spike because its two-identity view predicate is unverified in 2.6.0.
- **`15r-e` moved Wave 3 → Wave 4**, behind full migration, because widening its predicate requires rewriting its own teeth and would hard-fail master on every newly-gated unmigrated file.
- **`15r-f` moved to a wave boundary as the sole in-flight slice**, with its protection object pinned (zero required reviews, `enforce_admins:false`, no linear-history requirement).
- **`lp-14` struck from R10's blocked set** (it does not read the gauge), given a **fifth absolute veto** (fresh spawn, never `--resume` — otherwise 0% saving), an explicit **sentinel** kill switch, and an **outcome-based** exit condition.
- **`lp-13` gated additionally on MD-10** (measure LOG-STALL *duration*, not onset count) with the STOP/HARD asymmetry resolved deliberately.
- **`lp-04` given a permanent constraint**: `mr-audit:39-70` stays advisory forever; `:68` unconditionally FLAGs every hard-tier slice, so enforcement would block 100% of hard-tier merges on a zero-information verdict.
- **`lp-15` split**: `N_MAX` extracted to `lp-15b` so one rollback does not carry two unrelated failure modes; the four `mr-selfcheck` sites named explicitly (`:11`, `:12`, `:53`, `:54`).
- **`15r-d` scope widened** to `pvp.rs:63`, the three `pvp_tests.rs` copies, `account-e2e.eval.mjs`'s patcher/needle/self-check, and deletion of `accounts.rs:52`'s instruction to keep the dodge.
- **R3's stopping rule** replaced (greenness cannot discriminate a false green from a true one) with a demonstrated-RED-against-injected-defect requirement.
- **R11 scoped** to supervisor-layer slices, so it cannot be cited to kill `lp-14`.
- **R13 narrowed** to gauge-consuming slices, so it cannot be cited to park `15r-sec-a`.
- **Wave 1's exit** changed from a presence test ("4 columns non-null on 5 slices") to a **variance** test with a committed query script.
- **Cadence** changed from 4/week to **3/week nominal with a floor of 2 and a ceiling of 4**, explicitly labelled LOW confidence, resolving reviewer 1's non-rolling-allowance argument against reviewer 2's blind-gauge asymmetry argument.
- **Horizon stated honestly**: ~15 weeks for Waves 0–5, ~24 weeks including Wave 6's cut line, ~8 months for the full catalogue (not committed).

**Added (from the completeness lens):**

- **W0-0** spec-authoring ceremony (GAP-2) — the plan's new first step.
- **`lp-registry`** structured residuals with a sink (GAP-3 / A11).
- **`lp-disjoint`** effective-touches computation (GAP-4 / A6).
- **`.codegraph` exclusion** as a named `lp-11` fix with a falsification counter (GAP-5 / A23).
- **MD-10 gate on `lp-13`** (GAP-6).
- **`lp-11a`** CodeGraph brief line, justified on navigation accuracy (GAP-7 / A15).
- **`15r-d`'s widened scope** (GAP-8).
- **Variance-based Wave 1 exit + the slice-size denominator** (GAP-9 / MD-4).
- **`lp-worktree`** named rather than silently omitted (GAP-10 / A27).
- **`lp-doc-a`** closing obsolete residual prose for m20e-2, m20b-2, nh5 and the four memo-only orphans (GAP-11).
- **`lp-01`'s three injected-defect RED fixtures and `lp-03`'s `issues: write`** (GAP-12).
- **`15r-tst-i` given an explicit wave position** (Wave 5, next to `lp-12`).
- **R0**, the risk row for the plan's own consumption.
- **W0-Q**, an issuance point for all five blocking questions.

**Kept unchanged and endorsed:** the brief's `TARGET_DESC` construction (~3,152 tokens; zero of 18 merges show scope re-derivation — **do not shorten it**); the reviewer/red-team pre-code gauntlet (93 runs, $1.71 and $1.97 per run, found a merge-blocker before code existed and a HIGH after CI was green); proof-of-teeth RED-first discipline; ADRs as decision-granular anchors (143 ADRs cited 3,729 times in production source — the problem is the Residuals-as-graveyard section, not the ADR); the ~25-line residual spec format (15/15 merged, 14/15 first-attempt); the event bridge, flock and lock hygiene; `mr-disjoint`'s STRUCTURAL always-serial list; ADR-0011 as the template for a good intervention.

---

## 15. THE SINGLE MOST LIKELY WAY THIS PLAN FAILS

It is not technical, and it is no longer the draft's answer.

The draft said the plan fails because Wave 1 gets skipped. That risk is real and R13 holds it. But the reviews found something that fails **earlier**: **there is no spec, so nothing is launchable at all.** `mr-state.json` already records three ticks standing down for exactly this reason, and `13r-c-2` — an orphan that gates the M21b-2 deploy and owns a live security exposure — has sat undrafted since 2026-08-10 for precisely this reason. A plan with ~80 named slices and no step that writes them into `M*.spec.md` is a plan the loop's own selection mechanism cannot see.

**W0-0 is the first step. Nothing else starts until it merges.** After that, R13 is the constraint with no negotiable version, and it is worth re-reading before the first brief is written.