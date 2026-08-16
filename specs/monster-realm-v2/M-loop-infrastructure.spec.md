# M-loop-infrastructure — the build loop's own remediation backlog

> **Ordinal:** none — this is not a review-residuals milestone. **Source:** the 2026-08-15 build-loop
> post-mortem (7 lanes · 116 findings · 232 adjudications) and implementation plan v7, restricted to
> findings that live in the **harness** rather than in the game. Pinned harness SHA `502c849`;
> monster-realm SHA `67fbff8` for the three slices that touch the project repo. Every claim below was
> re-measured on 2026-08-16 during spec authoring; the corrections that forced are in §6.
> **This is the first spec in the corpus for harness work** — all 59 prior `*.spec.md` target
> `mdrewt/monster-realm`. That divergence is a real decision, recorded in §4, not a filing detail.
> Decisions live as GitHub issues only: to be opened at W0-Q (see §4 — none are open yet).

## 1. Why this milestone exists

The post-mortem's four root failures are all failures of the loop's own machinery, and all four share
one shape: **a control was specified and never built, or built and never read.**

- **RF-1 — continuous gauges collapsed to booleans at ingestion.** The account-wide weekly allowance
  fraction is present in every stream-json log the loop already parses, and the loop keeps
  `resetsAt` and throws the rest away. `mr-audit`'s gating detector has **0 true positives across
  446 v3-era rows**; the human-activity probe fired **72/72 false positives**, 65 of them on the
  loop's own `.codegraph` writes.
- **RF-2 — no pacing.** `mr-budget-config.json` carries `costwatch_enforce: false`, so every
  enforcement path in `mr-cost-watch` is dead code today: 17 WARN / 11 STOP-MONITOR / 4 HARD-MONITOR
  and **zero enforcement actions ever**.
- **RF-3 — records are not queues.** `touches:` correctly forbids out-of-scope work but offers no
  sink, so deferrals become ADR prose nothing reads: 78 defer phrases, 21 Residuals sections, **zero
  mechanical consumers**; mean disclosure→remediation latency **13.1 days**. `mr-state.json`'s
  `queue[]` is **58 past-tense narrative strings** — an append-only journal, while the genuinely
  structured slots (`inflight`, `awaiting_merge`, `parked`) are all empty lists.
- **RF-4 — unbounded context.** 0 compaction events across 231 transcripts; carried thinking/output
  = 34.7% of 703M parent prompt volume; the parent made **0 codegraph calls against 47 by its own
  subagents**.

Revision 3 of the plan found the meta-pattern, and it governs how every slice below is written:
**nine of thirteen gaps were "the harness already specifies it".** Disposition markers, the spec
skeleton, the ask-versus-default interview, the usage audit, `/simplify`, the decision-watch wake
loop and two project test skills were all already written. The loop's deficit is **unenforced
doctrine, not missing design.** Default posture for every slice: search for an existing standard,
skill, command or script before designing anything, and prefer implementing an unenforced rule over
inventing a new one.

**And there is a new blocker this spec surfaced, which the plan did not contain.** The loop has no
path to build a harness-repo slice at all — see `lp-00`. Until it lands, every `lp-*` slice that
touches `memory/projects/**` is unlaunchable by the existing machinery.

## 2. Slices

> **Selection contract:** a slice whose `after:` line carries a `blocked:<reason>` token is not
> selectable by doctrine gate 3 until that reason clears. Slices without it are launchable now.
> **Fidelity is graded on purpose**, per `spec-kit/SKILL.md`'s own rule (*"full fidelity for the next
> build phase only; sketches + ADRs for later milestones"*): Waves 0–2 are authored in full, Wave 5
> is authored at medium fidelity, Wave 7 ships as sketches in §2.5.

#### 2.0 Wave 0 — free groundwork

Not slices: offline replays and one-command reads, ~0 credits, no PR. Each either confirms its
prediction or files the slice it invalidates.

| id | question | gates | status |
|---|---|---|---|
| **W0-0** | Author this spec and `M-postgate-fifteenth-review-residuals.spec.md`; queue both in PLAN §9 | everything | **DELIVERED 2026-08-16** (attended session; this file is the artefact) |
| W0-1 | Does an offline recompute of `seven_day.utilization` from surviving stream-json logs reproduce the measured week (29→33→52→59→74→83→85→87→90)? | `lp-01` | open |
| W0-2 | Is `utilization` monotone non-decreasing within a reset bucket? | `lp-01`'s selftest — if a decrease > 0.01 appears, `util_floor = max()` is invalid and `lp-12` needs a decay model | open |
| W0-3 | Does `remote_red_fix_cycles` sum to 27 over all rows and 0 over the v3 era? | `lp-02` | **ANSWERED 2026-08-16: yes, and worse.** 27 over all 710 rows; 0 over the 374 rows on/after the 2026-07-27 cutover; **last nonzero is 2026-07-20T18:20:26Z.** The column is dead instrumentation, not merely sparse — `lp-02` must re-instrument the writer, not query harder |
| W0-4 | Which turns would `lp-14`'s 250,000-token threshold have armed on, across the 231 transcripts? | `lp-14` — if the arming set is degenerate (<2% or >40% of sessions), re-derive before briefing | open |
| W0-5 | Required check names on `master` | `15r-f` | **ANSWERED: `ci` and `e2e`** — job ids at `ci.yml:12`/`:97`, neither with a job-level `name:`. The workflow display name `CI` at `:1` is **not** a check name. Re-confirm against a live PR's `gh pr checks` immediately before the slice |
| W0-6 | Can the toolchain express a two-identity participant predicate for `15r-sec-a`? | `15r-sec-a` | **ANSWERED 2026-08-16: yes, via `#[view]`; and the RLS route is a trap.** See `M-postgate-fifteenth-review-residuals.spec.md` §2 `15r-sec-a`. Two findings must not be re-derived: the crate is **1.12.0**, and `client_visibility_filter` is behind `feature = "unstable"` **and** documented in-crate as *"currently unimplemented, and are not enforced"* — it would publish clean and enforce nothing. Also: the `spacetimedb-docs-v2-6-0` MCP server serves **master-branch** docs describing a later view API (`accessor =`, `ctx.from`, `impl Query<T>`, `.or()`) that 1.12.0 does not have. Do not cite it as the contract. **CORRECTED 2026-08-16 (ADR-0197):** the parenthetical here originally read "(2.6.0 is the CLI/product version)", implying crate and product versions are decoupled. **They are not** — the `spacetimedb` crate version *is* the product version and has been since crate 2.0.0 (crate 2.6.0 shipped with CLI 2.6.0; crate 2.8.1 with CLI 2.8.1). 1.12.0 was simply the last **1.x** crate. **The module has since been bumped to crate 2.8.1** (ADR-0197), so `accessor =`, `ctx.sender()` and view **primary keys** are all available now. The RLS finding **stands, re-verified byte-identical at 2.8.1**. The MCP-docs warning is now **obsolete**: gitmcp was describing the real 2.x API all along, and `accessor =` is exactly the rename the module has now made. **`15r-sec-a`'s no-view-PK constraint is lifted** — re-plan its client half before building. |
| W0-7 | Hosted wall-clock of the 753-mutant `mutate-server` run | `15r-tst-i` | open — and **higher-value than filed.** ADR-0183's hosted duration cell is literally `—`, and the circulating "~155 min" appears **nowhere** in the 162-ADR corpus, yet it is load-bearing inside the post-mortem's own cost argument against `cargo mutants --in-diff` as a merge gate. The only real hosted datapoint is ADR-0050:205-206 (*43 min at 499 mutants*), which scales to ~65 min at 753. If W0-7 lands near 65, that rejection must be re-adjudicated, not inherited |
| W0-8 | Exact field schema of `mutants.out/outcomes.json` | `15r-tst-i`'s parser | **BLOCKED, and the plan assumed it was free.** No `outcomes.json` exists anywhere on this machine and no `mutants.out/` directory exists; the string appears in no tracked file. It cannot be satisfied by reading the tree. Two routes: (a) add an `actions/upload-artifact` step to the mutation jobs — currently absent, which is *also* why five red nights left no downloadable evidence — or (b) budget a local `cargo mutants` run. **(a) is cheaper and fixes a second defect**; fold it into `lp-03` |
| W0-Q | Open the blocking questions as **non-blocking** `mr-ask-drew` issues and record each number in `mr-state.json` | `lp-12`, `15r-sec-a` | open — **3 questions, not 5** (see §4). Route with `--repo mdrewt/claude-harness` for loop/process questions: `mr-ask-drew:12` defaults to `mdrewt/monster-realm`, and its own header comment at `:4` says the opposite and is stale |
| W0-audit | Pin the skill-invocation baseline before any brief change | `lp-skills`'s confirm step | **CAPTURED 2026-08-16**, `node scripts/audit-usage.mjs --days 30` over 1,649 transcripts: agents **828** (reviewer 238 · red-team 219 · tester 159 · planner 90 · verifier 88), skills **34 across 17 names** — `simplify` 8, `spacetimedb-reducer` 2, and `game-core-testing` / `spacetimedb-client` / `wasm-boundary` / `code-intel` / `spec-kit` / `security` / `code-review` all **0**. 45 custom skills never invoked. Several of the 34 are CLI built-ins the script miscounts (`exit`, `login`, `model`, `doctor`, `compact`), so genuine skill usage is ~21 |

### lp-00 — A path to build a harness-repo slice at all (BLOCKER, MED)
`touches: memory/projects/mr-launch.sh, memory/projects/mr-spawn, memory/projects/mr-brief-template.md, memory/projects/mr-supervisor-prompt-native.md, memory/projects/mr-selfcheck, memory/projects/mr-repo-of (new)`
`after:` (none) — **hard prerequisite for every harness-repo slice below.** `lp-03`, `lp-05` and
`lp-doc-a` touch `mdrewt/monster-realm` and are exempt; everything else in this milestone is not.

**This blocker is not in the implementation plan; spec authoring found it.** Measured at `502c849`:
`mr-launch.sh:18` sets `PROJDIR="$HARNESS/projects/monster-realm"` and all three claude invocation
sites (`:85`, `:124`, `:139`) run `( cd "$PROJDIR" && claude … )`; `:56` polls
`gh pr list -R mdrewt/monster-realm`; and `mr-brief-template.md:23` instructs the run to *"Open the
slice PR on `mdrewt/monster-realm`"*. A slice whose `touches:` are all `memory/projects/**` would
therefore create a pointless monster-realm worktree, edit harness files in the **main checkout** (no
isolation; concurrent siblings collide), and open an empty-diff PR. Corroboration: the harness has had
exactly **2 PRs ever**, both June, from interactive sessions.

Two measured facts to design against. The harness has **no GitHub Actions workflows at all**, so no
remote CI and no branch protection, and nothing in its gate touches `memory/projects/mr-*`. The teeth
home already exists and should be used rather than replaced: the `--selftest` pattern
(`mr-cost-sum --selftest`, 17 fixtures) aggregated by `mr-selfcheck`, which the tick runs at
`mr-native-tick.sh:139`. Its two scanned-file lists are **hand-maintained** — derive them rather than
adding a check that they were remembered.

EARS: WHEN a slice's declared `touches:` lie in the harness repo, THE SYSTEM SHALL run it in an
isolated harness worktree and open its PR on `mdrewt/claude-harness`. **The gate SHALL be
`mr-selfcheck` plus the slice's own `--selftest`, not harness `just ci` alone** — measured, harness
`just ci` covers only `scripts/`, so for a `memory/projects/**` slice it **cannot fail**, and gating
on it would be a green that means nothing. WHEN a slice's `touches:` span both repos, or name a path in neither, THE SYSTEM
SHALL reject it at spawn rather than split it silently. WHEN the target repo's default branch is
ahead of or behind its remote, THE SYSTEM SHALL refuse to spawn — the brief branches from
`origin/<branch>`, so an out-of-sync base makes the slice build on the wrong tree and its PR silently
revert the difference. WHEN a new `mr-*` tool is added, `mr-selfcheck` SHALL check it **without being
edited to know about it**.
Tests: `mr-selfcheck` gains a check that every `mr-*` executable in `$MEM` appears in its own scanned
lists; proof-of-teeth: add a deliberately broken new tool and show `SELFCHECK-FAIL`, then show a
one-file harness slice completing worktree → PR → local-green end to end on a throwaway branch.

### lp-09 — Kill-switch provenance (CRITICAL, MED) — highest-risk single slice in the milestone
`touches: memory/projects/mr-native-tick.sh, memory/projects/mr-hold (new), memory/projects/mr-spawn, memory/projects/mr-selfcheck, memory/projects/mr-supervisor-prompt-native.md, .claude/hooks/guard-bash.mjs`
`after:` lp-00 · `blocked:lp-00` — **pulled to the front of the milestone (operator decision, 2026-08-16).**
With pacing manual, `mr-supervisor-disable` is the only control, and today the loop can `rm` a pause
the operator set.

`.native-supervisor-disabled` is a **zero-byte** flag written by two indistinguishable actors: the
operator via `/home/mdrewt/.local/bin/mr-supervisor-disable` (a bare `touch`) and the supervisor
itself, because doctrine line 81 orders it to. Self-arm/disarm timestamps exist in transcripts on both
sides; `mr-native-tick.sh:124` tests `[ -f … ]` only. *(Live now: present, 0 bytes, Aug 15 17:58 —
the loop is standing down at gate -1 on every fire.)*

**The correction runs opposite to the intuitive fix and is non-negotiable.** (a) Provenance is
checked on **`rm`**, never on `touch`. (b) **Absent-or-empty provenance defaults to OPERATOR —
fail-safe, never auto-cleared — pinned by a unit assertion.** That is what lets the unchanged
`~/.local/bin` wrapper keep working with no out-of-repo edit, which matters because `~/.local/bin`
is outside version control and a `git revert` here could not undo an edit there. (c) **`MR_FORCE=1`
keeps overriding an operator-provenance flag.** Do NOT neuter it: only the operator sets it, and all
five child spawners `unset` it (anchor `unset MR_FORCE MR_TICK_DRYRUN 2>/dev/null || true`). Assert
that so it stays true. **Re-measure at slice head:** there are **two** `MR_FORCE` overrides, `:125`
and `:144`; and **`mr-spawn` lacks the unset line**. Also fix the event-stranding: the flag sits
**above** the event queue — `:126` and `:165` requeue into `pending-events/` correctly, but nothing
drains it while the flag stands and nothing surfaces the backlog depth, which is how one done-event
sat **83.9 h** unprocessed.

EARS: WHEN a hold flag carries no provenance record or is zero-byte, THE SYSTEM SHALL treat it as
OPERATOR-set and SHALL NOT remove it under any condition. WHEN the loop itself sets a hold, it SHALL
write a provenance record naming itself, and only then MAY it clear that hold. `mr-spawn` SHALL
refuse to launch while any hold is present, regardless of provenance. WHEN events are queued behind
a hold, THE SYSTEM SHALL report the backlog depth every tick. Tests: on the branch — `touch` a
zero-byte flag, run a tick, assert (i) it stands down, (ii) the flag still exists, (iii) `MR_FORCE=1`
still runs one tick; then write a supervisor-provenance flag and assert the loop clears it (ADR-0010).

### lp-01 — Read `seven_day.utilization` and stop discarding it (HIGH, MED)
`touches: memory/projects/mr-native-tick.sh, memory/projects/mr-cost-watch, memory/projects/mr-telemetry-selftest (new)`
`after:` lp-00 · `blocked:lp-00` · this is the cost SSOT; `lp-12`/`lp-13` are blocked on one full reset cycle of its output

**The plan's description of the defect is wrong in a way that changes the fix.** There is no
`rate_limit_info` walker. `walk(o)` at `mr-native-tick.sh:361-376` (inside the ARMED heredoc,
`:357-410`) recursively walks the whole parsed JSON of a stream line, and the loop that feeds it is
**pre-filtered at `:379` by a raw substring test requiring BOTH `"resetsAt"` AND `"rejected"` in the
line**. It matches on `status == "rejected" and resetsAt is not None` (`:364`) and reads only
`resetsAt` (`:371`). Only two fields ever reach `mr-state.json`: `rate_limit_resets_at` (`:399`) and
`rate_limit_armed_by` (`:400`). So `utilization`, `rateLimitType`, `overageStatus` and
`isUsingOverage` are not "discarded by the walker" — **the lines carrying them are never parsed at
all**, because a routine `allowed_warning` row contains no `"rejected"`. `grep -n utilization` over
both files returns exactly one hit, a prose comment at `:355`; `mr-cost-watch` has zero.

Consequence for the design: this is a **new reader**, not a widened walker. Do not touch the arming
path — its allowlist-on-`rejected` behaviour is correct and deliberate (`:353-355` records why:
arming on `allowed_warning` would stand the loop down for days over a routine utilization notice).

EARS: WHEN a stream-json log line carries a `seven_day` rate-limit object, THE SYSTEM SHALL persist
`{ts, utilization, resetsAt, status, isUsingOverage, overageStatus, slices_running_at_sample,
gate_reached}` to an append-only file under `$MEM`. WHEN `utilization` is absent — documented on
`rejected` rows — THE SYSTEM SHALL persist the row with `utilization: null` and SHALL NOT drop it.
THE SYSTEM SHALL NOT alter any existing trip condition.
Tests: `mr-telemetry-selftest`, wired into `mr-selfcheck`; proof-of-teeth: demonstrated RED against
three injected defects — a dropped `allowed_warning` row, a `utilization`-absent row silently
skipped, and a changed arming predicate (ADR-0010).

### lp-03 — Nightly failure notification (HIGH, LIGHT) — zero dependencies, ships first if anything slips
`touches: .github/workflows/nightly.yml, evals/nightly-smoke-wiring.eval.mjs` *(project-relative
paths per corpus convention; monster-realm repo — exempt from `lp-00`)*
`after:` (none)

Measured at `67fbff8`: `nightly.yml` declares `permissions:` / `contents: read` at `:15-16` and runs
five jobs — `mutation` (`:22`), `mutation-server` (`:50`), `coverage` (`:73`), `smoke-republish`
(`:90`), `changelog-freshness` (`:147`). There is **no notification job, no issue-opening step, and
no `needs:` anywhere** — all five jobs are independent and none fans in to a reporter (zero hits for
`issue|notif|slack|webhook|actions/github-script`). Failure handling exists only as a prose comment
describing human triage. That is why `mutation-server` was RED for five consecutive nights with no
reaction. **The critical detail:** the permissions block must gain `issues: write` **in the same
diff** as the notification step — a notification step under `contents: read` fails silently at the
API call, which is the same false-green shape this milestone exists to eliminate. Fold in W0-8's
cheaper half here — **but it is not free, and calling it free was the error.** The artifact step must
carry `if: always()` to run on a RED night, the only night the artifact matters; and
`evals/nightly-smoke-wiring.eval.mjs`'s `jobIsNotNeutered` is a deliberate **flat line scan** that
REDs on ANY line beginning `if:` at any indent, across `mutation`, `mutation-server` and `coverage`.
Its own comment states the remedy — extend the predicate with a step-scoped carve-out — so that eval
is in this slice's `touches:` and changes in the same commit. Without `if: always()` the step is
skipped exactly when it is needed: a false green that leaves W0-8 blocked while looking solved.

EARS: WHEN any nightly job fails, THE SYSTEM SHALL open exactly one issue naming the failing job and
linking the run. WHEN several jobs fail in one night, THE SYSTEM SHALL NOT open more than one issue
per job. WHEN a mutation job **fails**, THE SYSTEM SHALL upload its `mutants.out` as an artifact — the success
path is not the case this exists for. WHEN a scope-narrowing flag is added to a mutation recipe,
`jobIsNotNeutered` SHALL still RED; its carve-out SHALL admit `if:` only on an artifact-upload step.
Tests: forced red drill — break one job on a branch, dispatch, and assert **the issue exists**, not
that the step exited 0 (ADR-0010).

### lp-02 — Ledger columns with a slice-size denominator (HIGH, MED)
`touches: memory/projects/mr-record, memory/projects/mr-native-tick.sh, memory/projects/mr-launch.sh, one new committed query script`
`after:` lp-00 · `blocked:lp-00` · **before any new gate** — the measurement must exist before the thing it measures

Measured: 710 rows carrying **259 distinct keys**, roughly 150 of which appear exactly once and dozens
of which bake a milestone id into the key name (`m8_7c_gating_audit`, `park_counter_m85a`, …). That is
schema *collapse*, not richness. Two columns are unusable as-is and the slice must fix the writer, not
the query: **`master_ci_after` is empty or missing on 467 of 710 (65.8%)** and the populated 243 use
at least six vocabularies (`GREEN`, `green`, `success`, `pending`, `in_progress`,
`n/a (no merge this tick)`); **`remote_red_fix_cycles` sums to 27 over all 710 rows and 0 over the 374
post-cutover rows, with its last nonzero value dated 2026-07-20** — dead for four weeks.
The denominator matters beyond tidiness: no cost-per-slice or planning-accuracy claim in this plan is
normalisable without it, **including D4's overrun-as-planning-datapoint mechanism, which currently has
no denominator to record against**. Add the outcome half of `lp-skills`'s confirm step here too:
production-source lines added/deleted, and per-slice skill-invocation counts.

EARS: WHEN a slice row is closed, it SHALL carry `files_changed`, `prod_lines_added`,
`prod_lines_deleted`, `test_lines_added`, `ears_criteria_count` and `skills_invoked`. Quality columns
SHALL be written by the writer that closes the slice, never by a later reconciliation.
`master_ci_after` SHALL take one of a closed vocabulary. One committed query script SHALL read all new
columns and print a variance summary.
Tests: proof-of-teeth — the query script REDs on a synthetic ledger where a new column is all-identical
or all-null. *"Non-null on 5 rows" is not a gate in a schema carrying 259 keys across 710 rows*
(ADR-0010).

### lp-04 — `mr-audit` policy/detector split, plus the disposition check (HIGH, LIGHT)
`touches: memory/projects/mr-audit`
`after:` lp-00 · `blocked:lp-00`

`mr-audit` is 75 lines: orchestration evidence at `:22-38`, gating-test integrity at `:39-70`. The
**permanent constraint, written into the brief**: `:22-38` is the mechanism behind the pre-code
reviewer/red-team gauntlet that the post-mortem lists under WORKING WELL and the DO-NOT-BREAK list
protects. It must not change semantics. `:39-70` has **0 true positives across all 446 v3-era rows**
and `:59` sets `FLAGGED` for hard tier by construction — **but "unconditionally" is wrong as
circulated**: `:58-59` sits inside `if repo and base and head and os.path.isdir(repo)` (`:42`), and
absent those the verdict is `AUDIT-ERROR` (`:69`), not `FLAGGED`. Any rule leaning on
"hard tier always FLAGGED" must carry the file header's own AUDIT-ERROR-treated-as-FLAGGED convention.
**The gating detector stays ADVISORY forever** — evidence for an LLM diff read, never a merge
predicate.

Fold in the disposition check here rather than inventing a mechanism, because
`docs/workflow-loops.md:32-39` **already** defines the grammar (`parked → <queued spec id | wontfix>`),
the location (the spec's closure section), the rule (*"parked work without a disposition is how
carry-overs go unsized"*) **and the owner: *"marker presence is audited supervisor-side (the mr-audit
layer)"***. Measured: `disposition` appears **zero** times in `mr-audit`. The orphan detector falls out
free — a `parked → <spec id>` naming an id that exists in no spec is exactly the check that would have
caught `14r-c-2`, `13r-c-2` and `14r-f-2`.

EARS: The two halves SHALL be separately addressable, with the advisory half emitting to a distinct
field. `lp-04` SHALL NOT change `:22-38`'s semantics. WHEN a merged slice's closure names a parked
item with no disposition marker, THE SYSTEM SHALL report it. WHEN a disposition names a spec id that
exists in no spec file, THE SYSTEM SHALL report it.
Tests: falsification — after `lp-04`, the `FLAGGED` count on the next 5 hard-tier slices must be **2 or
fewer**, not 5. Proof-of-teeth: a fixture closure with a dispositionless park REDs; one with
`parked → wontfix` passes; one naming a nonexistent spec id REDs (ADR-0010).

### lp-skills — Name must-apply skills in the brief, keyed to `touches:` (HIGH, LIGHT)
`touches: memory/projects/mr-brief-template.md, memory/projects/mr-spawn`
`after:` lp-00, W0-audit · `blocked:lp-00` *(absorbs plan id `lp-11a`)*

The skill layer is close to inert and the cause is mechanical. **Agents fire because the brief names
them** — `mr-brief-template.md:15` spells out the role chain literally: 828 agent invocations in 30
days. **Skills rely on model-initiated description matching and measurably do not fire**: 34
invocations in the same window. `spacetimedb-reducer` — carrying the reducer contract
(`ctx.timestamp` never `std::time`; `ctx.sender()` never a client-passed field; `ctx.rng()` never
`thread_rng`) — fired **2** times, while the 120 source-scan sites police exactly those invariants. What raises this from "unused file" to "unapplied
doctrine" is the corroboration: `code-intel` 0 beside the parent's 0 codegraph calls against its
subagents' 47, and `simplify` 8 beside 173 production-source deletions.

Fix: emit a required-skill list into the brief's role chain, computed from `touches:` —
`server-module/**` → `spacetimedb-reducer`; `game-core/**` → `game-core-testing`;
`client/src/net/**` → `spacetimedb-client`; `client-wasm/**` → `wasm-boundary`; spec work →
`spec-kit`; navigation-heavy work → `code-intel`. **Single lines only** — anything added to the brief
is multiplied by ~500 turns (RF-4). Precondition verified: the codegraph MCP tool is in
`~/.claude/settings.json`'s `permissions.allow` and both repos carry `.codegraph/`. Deleting the
zero-count skills is out of scope (§5).

EARS: WHEN a brief is rendered, THE SYSTEM SHALL name every skill whose path glob intersects the
slice's declared `touches:`, at no more than one line per skill. Tests: fixture `touches:` sets →
expected skill lists; proof-of-teeth: a `server-module/**` fixture omitting `spacetimedb-reducer`
REDs. **Confirm step, pre-registered:** re-run `node scripts/audit-usage.mjs --days 30` one month
after merge against the W0-audit baseline. PASS = `spacetimedb-reducer` fires on ~every server-module
slice; FAIL = counts stay 0, meaning naming is insufficient and the doctrine must become gates.
**Guard against gaming:** pair each count with the outcome it should move (production deletions for
`simplify`, parent codegraph calls for `code-intel`); a count that rises while its outcome does not
means the skill is loaded and ignored, which is worse.

### lp-brief-cost — Delete the false premise in the brief's budget line, keep the preference (MED, XS)
`touches: memory/projects/mr-brief-template.md`
`after:` lp-00 · `blocked:lp-00`

`mr-brief-template.md:21` reads *"**Budget is ample — favor thoroughness over frugality**"*, and `:33`
carries a 125% ceiling claim that is false. Under an allowance exhausted most weeks, the first is worse
than a wrong number: it is a standing instruction to spend more, given to the agent that spends ~90% of
the credits. **Surgical — keep the good half.** The thoroughness preference is *correct* per D3 and the
measured value of the review gauntlet, and the sentence's tail is already right (*"add lenses that find
different bugs, not redundant agents re-running the same checks"*). Delete only the false premise:
*"Budget is bounded by the weekly plan allowance — prefer lenses that catch distinct defect classes
over redundant re-runs; never trade a review lens for cost (D3)."* Correct `:33`'s ceiling to whatever
`lp-01` actually measures, or delete the number.

EARS: The brief SHALL NOT assert that budget is ample. The brief SHALL retain the instruction to prefer
distinct review lenses over redundant re-runs. The brief SHALL NOT quote a ceiling figure that no
instrument produces.
Tests: a grep tooth in `mr-selfcheck` for the deleted phrasing (ADR-0010).

### lp-ollama — Delete the per-tick ollama preflight; keep `mr-ollama` (MED, XS)
`touches: memory/projects/mr-native-tick.sh`
`after:` lp-00 · `blocked:lp-00`

`mr-native-tick.sh:27-47` runs an unconditional per-tick preflight that starts `ollama serve` if
absent, checks the model is present, and dispatches a detached warm-up — logging *"OLLAMA preflight:
server up, … warm-up dispatched"* on every tick. Measured: **803 warm-ups, 0 invocations**, across two
generations (the haiku hop it replaced is recorded at `mr-launch.sh:81` as *"0 invocations ever"*).
The plan's earlier proposal only *moved* the preflight below the gates, which preserves the cost and
hides it. **Remove the unconditional preflight; keep `mr-ollama` and the local stack intact** for
manual and experimental use — this removes a standing cost for a capability nothing calls without
destroying a capability the operator invested in. Justified on **signal integrity, not tokens** (the
warm-up costs local compute and tick latency, not credits): a preflight line on every tick for a path
with no consumer is the loop's own "ceremony that survives its own usefulness" anti-pattern, and it
trains the reader to skim the tick log. Rejected alternative, recorded so it is not re-proposed:
*"give it a real job"* — the candidate jobs are either free with grep, or consequential enough that a
silent wrong answer is expensive; two generations produced zero invocations and a third has no better
prior.

EARS: WHEN a tick runs, THE SYSTEM SHALL NOT start, probe or warm the local model server.
`mr-ollama` SHALL remain invocable manually and its consumers SHALL continue to degrade on
`OLLAMA-UNAVAILABLE`.
Tests: the tooth must bind the **behaviour**, not the log string — a preflight that still runs but
stops logging that phrase would pass a grep-only check. Assert that the tick makes **no request to
`localhost:11434`** and spawns no `ollama` process during a dry-run tick, with the log grep kept only
as a cheap secondary. Proof-of-teeth: restore the block on a branch and show both checks RED
(ADR-0010).

### lp-05 — Wire the observability validator and stop it silently skipping (MED, LIGHT)
`touches: ops/observability/validate.mjs, justfile, .github/workflows/ci.yml` *(project-relative per
corpus convention — monster-realm paths; exempt from `lp-00`)*
`after:` (none)

**Correction the brief must carry: there is no `memory/projects/validate.mjs` and no
`scripts/validate.mjs`.** The file the plan means is
`projects/monster-realm/ops/observability/validate.mjs` — a Tier-2 validator that runs each upstream
config validator through the pinned deployment image. It has **zero programmatic callers**: the only
references anywhere are its own usage comment at `:12` and one line in
`ops/observability/README.md:52`. (The two harness validators, `scripts/validate-wiring.mjs` and
`scripts/validate-templates.mjs`, *are* wired — as `just` targets — and are not this slice's subject.)
Its docstring is explicit that *"a skip and a pass are different words here on purpose"* and that every
check is skip-guarded when docker is absent — which is correct behaviour for a laptop and wrong for a
gate. Wire it into the path that should already have been running it, and add a `--require-docker`
mode that turns a skip into a failure there.

EARS: WHEN the observability config changes, THE SYSTEM SHALL run the Tier-2 validator. WHEN
`--require-docker` is passed and docker is unavailable, THE SYSTEM SHALL fail rather than skip. WHEN
docker is unavailable and the flag is absent, THE SYSTEM SHALL report `skipped` loudly and exit 0.
Tests: proof-of-teeth — a deliberately malformed compose file REDs the wired path; and the
`--require-docker` failure is demonstrated on a docker-less runner (ADR-0010).

### lp-06 — `mr-backup` plus a stray-handoff rule (MED, LIGHT) — insurance, not efficiency
`touches: memory/projects/mr-backup (new), memory/projects/mr-selfcheck, memory/projects/mr-record`
`after:` lp-00 · `blocked:lp-00`

The 710-row usage ledger is gitignored — by the **root** `.gitignore:37`
(`memory/projects/*-usage-ledger.jsonl`), *not* by `memory/projects/.gitignore`, which covers only
runtime dotfiles and `pending-events/`. It has had **no backup since 2026-07-24**, and it is the sole
source for every cost figure in this plan. Separately and confirmed live: an untracked
`memory/monster-realm-handoff.md` (1,781 bytes, Aug 15 07:02) sits alongside the tracked
`memory/projects/monster-realm-handoff.md` (428,676 bytes) — a 240× gap whose content is native-tick
entries that belong in the `projects/` file. That is a wrong-path write, not a second copy: entries
written there are invisible to every consumer.

EARS: WHEN the ledger or handoff changes, THE SYSTEM SHALL retain a recoverable copy outside the
working tree. WHEN an **untracked** handoff-shaped file appears outside
`memory/projects/`, `mr-selfcheck` SHALL emit `SELFCHECK-FAIL` naming the path. **The predicate must
be untracked-and-outside-`memory/projects/`, not "anywhere other than the rolling handoff"** — the
tracked archives `monster-realm-handoff-archive-2026-07.md` and `-2026-08.md` are doctrine-sanctioned
and named by the rolling handoff's own header, so the naive form REDs on day one against legitimate
files, and a gate that red-lines on its first run gets disabled within a week.
Tests: proof-of-teeth — create a stray handoff and show the check RED; delete it and show green;
restore the ledger from a backup into a temp dir and diff it byte-for-byte (ADR-0010).

### lp-07 — `settings.json` env PATH (LOW, XS)
`touches: /home/mdrewt/.claude/settings.json` *(out-of-repo machine state — see the rollback note)*
`after:` (none) · `blocked:operator-attended` — **`lp-00` does not unblock this one.** The path lies in
neither repo, so no worktree-and-PR flow can carry it; it needs an attended session or an explicit
operator-run step, and pretending otherwise would leave an unlaunchable slice looking launchable.

Mechanical. **The rollback note is the reason this is not trivial:** `~/.claude` is **not a git
repository** (verified) and `settings.json` currently has **no `env` key at all** (top-level keys are
`permissions`, `model`, `hooks`, `effortLevel`, `skipWorkflowUsageWarning`, `autoMode`). So this change
is out-of-repo state with **no `git revert` path** — the same class as
`~/.local/bin/mr-supervisor-disable`, which `lp-09` treats with a fail-safe default for exactly this
reason. Take a copy of the file into `$MEM` before editing and record it in the slice's progress memo.

EARS: WHEN a session starts, the configured PATH SHALL include the harness tool directory. WHEN the
edit is reverted, the file SHALL be byte-identical to the recorded pre-edit copy.
Tests: assert the pre-edit copy exists in `$MEM` before the edit lands (ADR-0010).

### lp-doc-a — Close the obsolete residual prose (MED, LIGHT)
`touches: docs/adr/` *(project-relative per corpus convention — monster-realm; exempt from `lp-00`)*
`after:` (none)

Leaving shipped work described as outstanding is what makes the residual corpus untrustworthy, which
is the precondition for `lp-registry` being worth building at all. Three tasks. (a) Mark **`m20e-2`**
and **`m20b-2`** SHIPPED (13r-b, commit `7bba44e`, ADR-0191) and **`nh5`** SHIPPED (13r-f, commit
`7e08d36`, ADR-0192) in their Residuals sections, with the closing commit and ADR. (b) Triage
**`14r-f-2`, `11r-e-1`, `11r-e-3`, `11r-e-9`** to either an owner slice or a recorded *"no longer
relevant, because …"* — measured: these four ids appear **zero** times anywhere in `specs/`, which
makes them the starkest instance of the disclosed-but-untracked class. (c) Correct ADR-0186:176's
now-false claim that the audit gate is *"EXPECTED to be RED"* — `node evals/run.mjs` currently reports
`eval PASS: scanner-migration-audit … 18 gated / 10 migrated / 7 debt / 1 not-applicable`. Regenerate
`DIGEST.md` and `design-corpus.json` via `just adr-digest` in the same commit.

EARS: WHEN a residual has shipped, its Residuals section SHALL name the closing commit and ADR. WHEN a
residual is retired without a slice, it SHALL carry a recorded reason. WHEN this slice lands, no ADR
SHALL describe a currently-green gate as expected-red.
Tests: `just adr-digest --check` green; proof-of-teeth: re-run the ADR digest gate against a
deliberately un-regenerated digest and show it RED (ADR-0010).

### lp-08 — `mr-ready` and the tick-mode ladder (HIGH, MED)
`touches: memory/projects/mr-ready (new), memory/projects/mr-native-tick.sh, memory/projects/mr-supervisor-prompt-native.md`
`after:` lp-00 · `blocked:wave-1-exit`

One task type per tick, so every tick boundary is a safe stopping point. Modes evaluated in order,
the tick committing to the first eligible: **0 `RECONCILE`** (merge a finished run or reconcile
CI/state — always free-tier, never budget-blocked, because it harvests credits already spent);
**1 `IMPLEMENT`** (`mr-ready` names a launchable slice AND the lookahead passes); **2 `SPEC`**;
**3 `MILESTONE`**; **4 `HOLD`** (logged reason + wake condition). Separating `RECONCILE` from
`IMPLEMENT` also removes a defect structurally: the merge-then-launch composite is what trips the
loop's own activity probe on its own ff-only merge writes (7 of the 72 false positives). `HOLD` must
record **which** of budget-exhausted or operator-blocked applies — opposite resolutions, and
conflating them is the zero-byte kill switch's mistake. `RECONCILE` is budget-exempt but **counts
consecutive no-state-change ticks**, logging `RECONCILE-STUCK` and falling to `HOLD`.

**Three parsing constraints; getting any wrong returns a wrong ready-set — reproducing the exact bug
this slice exists to fix.** (1) Parse the **de-facto** convention, not the documented one:
**exactly 1 of 59** pre-existing specs uses the documented `## Touches` token, while **15 of 59**
carry a real per-slice declaration in **three** shapes — see §6 for the breakdown and for why a
two-shape parser misses most of them. Accept all three; count specs matching none in `mr-selfcheck`. (2) Parse the
`blocked:<reason>` token on the `after:` line, the selection contract both specs in this queue use.
(3) **Honour retirement markers, which live only in prose** — see §6 for the measured case where a
retirement-blind parser selects a superseded slice. **HC-2:** `mr-ready` may only ever **forbid**, never **compel**, a launch
(mirroring `mr-disjoint:4-5`); `triaged > 0 && launchable == 0` opens an `mr-ask-drew` item + holds.

EARS: WHEN a tick runs, THE SYSTEM SHALL commit to exactly one mode and do no work belonging to
another. WHEN a spec declares `touches:` inline in either observed shape, `mr-ready` SHALL parse it.
WHEN a slice is marked blocked on its `after:` line, or belongs to a retired milestone, `mr-ready`
SHALL NOT list it as launchable. Tests: proof-of-teeth against a **frozen snapshot** of the corpus committed as a fixture — never the
live tree, whose expected answer changes the moment `15r-sec-a` merges. On that fixture: the
documented-only parser returns empty, a retirement-blind parser returns `B2`, a two-shape parser
misses 10 of 15 declaring files, and the correct parser returns `15r-sec-a` (ADR-0010).

### lp-10 — Reboot-only PID guard (MED, LIGHT)
`touches: memory/projects/mr-native-tick.sh`
`after:` lp-00 · `blocked:wave-1-exit`

`crontab -l` confirms the guard targets a real entry: `0 * * * *` hourly, `@reboot sleep 60 && …`, plus
a daily `35 5 * * * mr-usage-snap`. The reboot entry can collide with the hourly one.

EARS: WHEN a reboot-triggered tick starts while an hourly tick holds the lock, THE SYSTEM SHALL exit
without contending. WHEN no tick is running, the reboot entry SHALL proceed normally.
Tests: proof-of-teeth — simulate a held lock and assert the reboot path exits 0 without launching
(ADR-0010).

### lp-11 — Three named doctrine bug fixes (MED, LIGHT)
`touches: memory/projects/mr-supervisor-prompt-native.md, memory/projects/mr-ask-drew, memory/projects/mr-decision-watch`
`after:` lp-08, lp-09 · `blocked:wave-1-exit`

1. **Un-saturate the human-activity probe.** 72/72 trips were false positives, **65 of them on the
   loop's own `.codegraph` writes**. The self-collision surface is live: `.codegraph/` exists at both
   repo roots, and the probe at `mr-supervisor-prompt-native.md:80` stands down on *"harness/project
   non-`.git`/`node_modules`/`target` file writes in last ~6 min you didn't make"* — `.codegraph` is
   not in that exclusion list. Fold in `.codegraph` and the loop's own ff-only merge writes.
   **Falsification counter: probe trips per week must fall from 72 toward the count of genuine
   operator sessions.** This is the cheapest measured win in the post-mortem and it was unassigned.
2. **`allowed_warning` handling.** The doctrine line correctly says not to trip on it, then instructs
   throwing the event away instead of reading the number inside it. `lp-01` reads it; remove the
   discard sentence here.
3. **Repo routing for `mr-ask-drew`.** Doctrine sends loop/process decisions to `claude-harness`, but
   `mr-ask-drew:12` defaults to `mdrewt/monster-realm`. Make the default follow the class — **and fix
   two drift items found while measuring:** `:4`'s header comment claims the default is
   `claude-harness`, contradicting its own code; and the default string is duplicated at
   `mr-decision-watch:16`, so a one-file change leaves them divergent.

EARS: WHEN the loop's own `.codegraph` or merge writes are the only recent file activity, the probe
SHALL NOT stand the tick down. WHEN a rate-limit event carries a utilization number, the doctrine
SHALL NOT instruct discarding it. WHEN a loop/process decision issue is opened, it SHALL default to
`mdrewt/claude-harness`, and that default SHALL be defined once.
Tests: replay the 72 recorded trips against the fixed predicate and assert the false-positive count
falls; proof-of-teeth: a genuine operator-write fixture must still trip it (ADR-0010).

### lp-11b — Human-gate expiry: one constant, and a visible nag (MED, LIGHT)
`touches: memory/projects/mr-decision-watch, memory/projects/mr-native-tick.sh`
`after:` lp-11 · `blocked:wave-1-exit`

*(Split from `lp-11`, which was carrying four concerns. The framing in circulation also needs
correcting.)* `mr-decision-watch` **does** expire silently — `DEADLINE = now + 7*24*3600` (`:22`),
loop guard `:24`, and on expiry a bare `exit 0` (`:59`) with no notification, no ledger row, no event
and no removal of `.blocked-on-human`. But it does **not** deadlock the loop, because
`mr-native-tick.sh:149` carries an *independent* 7-day marker-age check whose else-branch (`:157-158`)
logs *"human-gate marker >7d old — proceeding for a fresh look"*. So the real defects are narrower and
both are duplication: **two 7-day constants live as separate literals in two files with no shared
SSOT** (`7*24*3600` and `604800`), and `:151-155` respawns a dead watcher — resetting *that* clock
from zero while the marker's age keeps counting, so the two clocks drift apart by construction.

EARS: The human-gate cap SHALL be defined once and read by both consumers. WHEN a decision issue
remains open past the cap, THE SYSTEM SHALL emit a visible `HOLD-EXPIRED` line and re-arm rather than
exit silently. WHEN a watcher is respawned, the effective deadline SHALL be computed from the marker's
age, not from the respawn time.
Tests: proof-of-teeth — a fixture marker aged past the cap must produce exactly one `HOLD-EXPIRED`
line and a re-armed watcher; changing the constant in one place must move both consumers (ADR-0010).

### lp-registry — Structured residuals with a sink (HIGH, MED)
`touches: memory/projects/mr-brief-template.md, memory/projects/mr-residuals.jsonl (new), memory/projects/mr-ready`
`after:` lp-04, lp-08 · `blocked:wave-1-exit` · **before `lp-15`** retires `mr-feedback`

**Implement the existing grammar; do not invent one.** `docs/workflow-loops.md:32-39` already
defines `parked → <queued spec id | wontfix>`. This slice gives it a machine-readable sink and a
consumer: one append-only JSONL record emitted at PR time — `{slice_id, title, owner, touches[],
severity, domain, disclosed_at, adr, status, disposition}` — read by `mr-ready` as ready-set input.
**Nothing blocks a merge.** Not DO-NOT-RETRY #12 (*an ADR defer-phrase CI denylist as a blocking
gate*): that was a text denylist over prose; this is a registry with a consumer.

**Two seeding requirements, both correctness rather than tidiness.** (1) **Playtest feedback is a
source.** The intake channel exists — `playtest-feedback-<YYYY-MM>[-rN].md` is already a doctrine
`wake_file` and two files have been filed — but the template's *"What didn't"* and *"Bugs / rough
edges observed"* sections have **no path into a queue**; they are prose read once. Each bullet becomes
a residual row under the same grammar. Playtest is the only channel carrying feel-and-quality signal,
which no gate or mutation score produces. (2) **Every seeded row
gets a disposition on day one.** Measured: 329 OUTSTANDING items — 4 CRITICAL, 26 HIGH, 101 MED, 198
LOW — against a cut line of 25, leaving **304 dispositionless**. Seeding those as-is rebuilds the
graveyard inside the new mechanism and makes `lp-04`'s check fire **304 times on its first run**,
which is how the loop acquired its other decorative gates. `wontfix` is a first-class outcome with a
one-line reason; the 198 LOW items are the pool. **The seeding input is enumerated in §6** — "seed
from §8" is not sufficient, because §8 holds 12 rows against 329 items.

EARS: WHEN a slice's PR is opened, the runner SHALL append one residual record per named follow-up,
or an explicit `residuals: none`. `mr-ready` SHALL surface unclaimed records. No record SHALL block a
merge. **WHEN this slice's seeding step completes, zero registry rows SHALL lack a disposition, and
`lp-04`'s disposition check SHALL pass over the seeded registry in the same commit.** (Phrased against
this slice's own completion, not lp-04's arming moment — lp-04 lands first, so a criterion aimed at
that moment could never be exercised by a test here.)
Tests: seed three synthetic records; assert `mr-ready` lists all three and claiming one removes it.
Falsification: `residuals_emitted` is a pre-registered `lp-17` metric — 0 for four weeks means the
registry is inert (ADR-0010).

### lp-spec-mode — SPEC and MILESTONE tick modes (HIGH, MED)
`touches: memory/projects/mr-native-tick.sh, memory/projects/mr-spawn, memory/projects/mr-state.json, memory/projects/mr-brief-template.md`
`after:` lp-08, lp-registry · `blocked:wave-1-exit`

Automates what W0-0 did by hand, for the two tiers that have precedent. **Tier A** — residual specs
from verified findings — unattended, PR, merge on green (proven: 15/15 merged, 14/15 first attempt).
**Tier B** — a milestone spec whose design is already decided (an Accepted ADR exists) — unattended,
PR, **async operator review before merge**. Tier C is a different risk class entirely and is split out
into `lp-milestone-mode` below.

Three constraints, each closing a measured hole. (1) **Invoke the skill explicitly — never by model
dispatch.** The original design said "invoke `/spec`", and `spec-kit` has fired **0 times in 30 days**;
building SPEC mode on model-initiated dispatch would reproduce the exact failure `lp-skills` diagnoses.
(2) **Pin the output path**: specs go to `specs/monster-realm-v2/`; `docs/specs/` (32 files in the
project repo) is per-slice working notes and is **not** a `mr-ready` source — three conventions are
live at once and picking wrong produces a spec no consumer reads. (3) Decision discipline is already
written down in `.claude/commands/spec.md` and needs mapping, not inventing: interview one question at
a time, and *"if the codebase can answer a question, explore it instead of asking"* — the natural brake
on issue spam. Caveat: `/spec` escalates gnarly designs to `/grilling`, which its own text notes is
operator-local and not shipped with the harness; an unattended tick must degrade gracefully.

EARS: WHEN SPEC mode runs, THE SYSTEM SHALL invoke `spec-kit` by name and SHALL write to
`specs/monster-realm-v2/`. WHEN a decision is reversible, THE SYSTEM SHALL take the documented default
and record `decision-defaulted:<question>=<choice>`. WHEN it is irreversible, architectural, security-
or spec-contradicting, THE SYSTEM SHALL open an issue. WHEN a Tier-B spec PR is green, THE SYSTEM SHALL
NOT auto-merge it.
Tests: proof-of-teeth — a fixture ambiguity of each class must route to default-and-record vs
open-an-issue correctly; a Tier-B PR must remain open on green (ADR-0010).

### lp-milestone-mode — MILESTONE mode, Tier C, over a populated allowlist (HIGH, MED)
`touches: memory/projects/mr-native-tick.sh, memory/projects/mr-state.json, memory/projects/mr-brief-template.md`
`after:` lp-spec-mode, lp-decision-block · `blocked:wave-1-exit`

*(Split from `lp-spec-mode`: Tier C has **zero precedent in the corpus** while Tiers A and B are
proven, so bundling them would give one rollback to two different risk profiles.)* Elaborate a
skeleton milestone into a real spec — M18/M19/M22–M25 are 3.9–4.5KB sketches against 68–78KB for an
authored milestone. Unattended **draft only**; the PR is never auto-merged; every architectural or
irreversible choice becomes an `mr-ask-drew` issue naming its milestone.

**The allowlist ships POPULATED, reversing the plan's empty-by-default design (operator decision,
2026-08-16).** `spec_authoring_allowlist` in `mr-state.json` holds **every incomplete milestone in
scheduled order** — measured as the six that are both sketch-sized and entirely unbuilt:
`[M18, M19, M22, M23, M24, M25]`. M18/M19 additionally carry `blocked:playtest-gate`, so the mode
cannot reach them until that lifts. **One milestone per tick, in allowlist order**, which is what
answers `spec-kit`'s over-speccing gotcha here: the nearest-term milestone is always the one
elaborated, so far-future detail is never written early — *ordering* does the work an empty list used
to do.

EARS: WHEN the allowlist is non-empty, MILESTONE mode SHALL elaborate exactly one milestone per tick,
in allowlist order, and SHALL NOT auto-merge its PR. WHEN a milestone is barred by `lp-decision-block`,
MILESTONE mode SHALL skip it and consider the next. WHEN an architectural, irreversible, security or
spec-contradicting choice arises, THE SYSTEM SHALL open an issue naming its milestone rather than
invent an answer.
Tests: proof-of-teeth — a fixture allowlist with a barred first entry must elaborate the second, not
stall. **Early warning, pre-registered:** a Tier-C PR merging with **zero** issues raised means the
model invented decisions instead of asking — pull that milestone off the allowlist.

### lp-decision-block — Per-milestone decision gate over all costly modes (HIGH, MED)
`touches: memory/projects/mr-native-tick.sh, memory/projects/mr-ask-drew, memory/projects/mr-decision-watch, memory/projects/mr-state.json`
`after:` lp-08 · `blocked:wave-1-exit`

**New machinery, from the operator's 2026-08-16 rule: a milestone carrying an unresolved decision is
barred from spec-writing *and* implementation until it is answered** — not merely from the tick that
raised the question. Today the only equivalent is `.blocked-on-human`, which is **global**: one open
question stops the whole loop. This is the scoped version, and it gates all three costly modes
(`IMPLEMENT`, `SPEC`, `MILESTONE`), not just milestone authoring.

Two constraints keep it a gate rather than a stall, and both are existing doctrine rather than new
invention. **(a) "Unresolved decision" means the BLOCKER classes** — irreversible, architectural,
security, spec-contradicting, explicitly-gated. A reversible scope/content choice still takes the
documented default and records `decision-defaulted:<q>=<choice>`, exactly as doctrine has required
since 2026-07-25; without this distinction every minor question would bar its milestone and the loop
would converge on doing nothing. **(b) Every tick reads live issue state *before* selecting a mode**
and consumes any answers, so an answered question unblocks its milestone on the very next tick with
no operator ping. Each `mr-ask-drew` issue gains a milestone field so the block can be scoped.

EARS: WHEN a milestone has an open blocking decision issue, THE SYSTEM SHALL NOT write specs or
implementation for that milestone. WHEN other milestones are clear, THE SYSTEM SHALL still select work
from them rather than standing down. WHEN a tick starts, it SHALL read the state of every open
decision issue and consume answers before selecting a mode. WHEN a decision is reversible, THE SYSTEM
SHALL default-and-record rather than open a blocking issue.
Tests: proof-of-teeth — a fixture with one barred and one clear milestone must select from the clear
one; answering the issue must unblock the barred one on the next tick with no operator action; and a
fixture where **every** milestone is barred must produce a `HOLD` with a named reason rather than a
silent standdown (ADR-0010).

### lp-disjoint — Effective-touches computation (MED, MED)
`touches: memory/projects/mr-disjoint, memory/projects/mr-spawn, one shared companion-rules JSON (new)`
`after:` lp-00 · `blocked:wave-1-exit`

`mr-disjoint` operates on **declared** touches only (`:6-7`), and its STRUCTURAL always-serial list at
`:13` is exactly `["Cargo.lock","package-lock.json","client/src/module_bindings/*","evals/run.mjs",
"*schema*","*migration*"]` — containing **none** of the doc set. Meanwhile `mr-brief-template.md:1`
grants **every** slice, universally, `docs/adr/**`, `docs/knowledge/**`, `CHANGELOG.md` and
`ARCHITECTURE.md`. So any two concurrent slices collide on the doc set by construction while
`mr-disjoint` returns SAFE every time, because the grant appears in no slice's declared string. That is
the mechanical root of the recorded 13r-b/13r-f collision, whose conflict set was *exactly*
`{ARCHITECTURE.md, docs/adr/DIGEST.md}`.

Design: one shared JSON of companion rules read by **both** `mr-disjoint` and the brief renderer —
expand declared touches by sibling test files (`X_tests.rs` for `X.rs`, `X.test.ts` for `X.ts`), move
the universal doc-set grant into STRUCTURAL, and add `content/**` (ADR-0145:225 — `CONTENT_VERSION` is
a single shared integer and `content-hash.json` a whole-tree hash, so two content slices collide by
construction). **Account for the matcher's actual semantics:** `:21` is
`fnmatch(p, pat) or pat.strip("*") in p` — a **substring** test, so `*schema*` becomes the bare
substring `schema`. That already produced a recorded false positive (`docs/adr/0174-*-schema-*.md`
forcing SERIAL-REQUIRED); adding doc paths naively would multiply it.

EARS: WHEN two candidate slices would both **write** the same doc-set file, `mr-disjoint` SHALL return
SERIAL-REQUIRED. (Wording matters: the grant is *universal*, so a criterion phrased "both receive the
grant" would set concurrency to 1 for every pair in the corpus. Model what a slice actually writes —
its reserved ADR file, its `docs/knowledge/` entries — not the blanket grant.) WHEN a slice declares `X.rs`, its effective touches SHALL include `X_tests.rs`. WHEN a
STRUCTURAL pattern is evaluated, THE SYSTEM SHALL NOT match a path that only incidentally contains the
pattern's bare substring.
Tests: pin the exact `14r-c`/`14r-e` input as a fixture and require SERIAL-REQUIRED where it previously
returned SAFE; pin `docs/adr/0174-…-schema-….md` as a fixture that must **not** trip STRUCTURAL
(ADR-0010). Relationship to `15r-g`: complementary — `.gitattributes` handles the doc set that must
stay shared; this stops the code-side sibling collisions `.gitattributes` cannot touch.

### lp-gitattr — `merge.ours` driver, the regeneration recipe, and its selfcheck (MED, LIGHT)
`touches: memory/projects/mr-selfcheck, memory/projects/mr-supervisor-prompt-native.md`
`after:` lp-00 · `blocked:wave-1-exit`

**Split out of `15r-g` at review, because that slice's touch-set spanned both repos** — which `lp-00`
makes an explicit spawn-time rejection, so as originally written it would have been unspawnable the
moment `lp-00` worked as specified, stranding `15r-f` and the five slices behind it. `15r-g` keeps
the project-repo half (`.gitattributes`); this is the harness half. **Order between the two halves
does not matter**, because a `merge=ours` attribute is **inert** until a driver of that name is
configured on the machine performing the merge — measured, `git config --get-regexp 'merge\.'`
returns empty at local, global and project scope, so neither half is dangerous alone.

`merge=ours` discards the other branch's content by design, so it is only safe paired with a
**mandatory post-merge regeneration step** in the supervisor's merge recipe (`just adr-digest &&
just changelog`) on top of the existing CI freshness gates. Add the new tool names to
`mr-selfcheck`'s two hand-maintained lists in the same commit.

EARS: The runner's git config SHALL define `merge.ours.driver true`. WHEN that key is absent,
`mr-selfcheck` SHALL emit `SELFCHECK-FAIL`. WHEN a merge touches a generated artefact, the supervisor
recipe SHALL regenerate it before recording the merge.
Tests: proof-of-teeth — `mr-selfcheck` shown RED with the config key removed, and a synthetic
three-way merge on `DIGEST.md` resolving cleanly with the driver configured and conflicting without
it (ADR-0010).

#### 2.4 Wave 5 — credit levers (medium fidelity; re-elaborate at slice head)

**Entry for all three: Wave 2 exit met PLUS one full reset cycle of `lp-01` samples** (R13: instrument
→ one full cycle → gate; never the same slice, never the same week — the v3 cutover replaced its own
instrument in the same commit and is permanently unevaluable).

**The tokens are the contract, and an earlier draft's prose ("Wave 4 complete") disagreed with them.**
Resolved in favour of the tokens, deliberately: these are credit levers whose value is highest
*early*, none depends on a Wave-3 or Wave-4 deliverable, and R13 is satisfied by the reset-cycle
clause above rather than by wave number. R13 is carried as a second token on `lp-12` so it cannot be
lost if the wave token is ever relaxed.

### lp-12 — p90 lookahead, spend to ~99% (HIGH, MED-HEAVY)
`touches: memory/projects/mr-cost-watch, memory/projects/mr-spawn, memory/projects/mr-situation, band config`
`after:` lp-01, lp-08 · `blocked:wave-2-exit` · `blocked:r13-one-reset-cycle`

Before starting any costly mode: `remaining_pp = CEILING − utilization_now`;
`est_pp = p90_cost_pp(mode, tier)`; if `est_pp > remaining_pp` → `HOLD(reason=budget, wake=resetsAt)`,
else proceed. **`CEILING` ramps, and that is an operator decision, not a tuning knob: auto-purchase of
extra credits is ON**, so a lookahead miss silently *buys* rather than failing loudly. Start at **95**
while the estimator holds fewer than 3 samples for a mode/tier; move toward **99** as measured
variance shrinks. Any row carrying overage is a **loud alert**, never a routine band. **p90, never
the mean** — the measured spread is $21.40 to $274.37, and a mean-based lookahead overshoots about half
the time; overshoot buys overage. **A launch gate, never a kill.** The 1% headroom absorbs whole-percent
quantisation and gauge lag. Targeting *account-wide* utilization makes the loop self-yielding: heavy
operator use elsewhere automatically shrinks the loop's share, which is why Q-B1 is attribution-only.
**Fail closed on modes with no history** (SPEC and MILESTONE have never run): seed SPEC from the p90 of
residual-spec slices already in the ledger, MILESTONE from the 2026-08-08 heavy-ceremony pass or the
highest observed slice cost. **An absent estimate means too expensive, never zero.** Replace priors
with measured p90 after three runs. **The floor matters as much as the ceiling:** credits do not roll
over, so below the low band the correct action is to launch more, not idle — cadence is an *output*.

Two measured facts to design against: `costwatch_enforce` is **false**, so every enforcement path in
`mr-cost-watch` is currently dead code; and `mr-situation` decides state on `eff = d7 + est +
committed` (`:118`) where `est` and `committed` are **hardcoded tier medians `{hard:90, routine:25,
content:35}` duplicated at `:105` and `:108`** — roughly a third of the number driving HARD-STOP is a
stale guess with no refresh path, in two copies that can silently diverge.

EARS: WHEN the p90 estimate for the next costly mode exceeds remaining allowance, THE SYSTEM SHALL
HOLD and record the reset time. WHEN no estimate exists for a mode, THE SYSTEM SHALL treat it as
exceeding remaining allowance. WHEN utilization is below the floor, THE SYSTEM SHALL NOT idle a tick
that has launchable work. A running slice SHALL never be stopped by this gate.
Tests: **DRYRUN for one full cycle**, logging what it would have done and changing nothing;
exit condition is a would-hold false-positive rate **< 10%**. Proof-of-teeth: synthetic gauge series
driving a hold at 98.5% and a launch at 40% (ADR-0010).

### lp-13 — Arm the cordon (HIGH, MED)
`touches: memory/projects/mr-cost-watch, memory/projects/mr-spawn`
`after:` lp-09, lp-12 · `blocked:lp-12-dryrun-fp` (clears at <10% would-hold false positives) ·
`blocked:stall-duration-measured` (clears after one full cycle of the measurement below)

**Cooperative only — never a kill.** All four historical HARD trips merged EXIT=0; a kill strands locks
and hard-blocks relaunch, and under a fully-consumed allowance a kill *reallocates* spend rather than
saving it. Checkpoint, push, PR, exit clean. Checked in `mr-spawn` **before** anything `mr-ready`
proposes — the pacing gate outranks the ready-set. Non-overridable by a spawned session, overridable by
the operator (only the operator can reach `MR_FORCE`).

**The prerequisite measurement the plan omitted, with three corrections from re-measuring
`mr-cost-watch`:** (a) the stall counter increments on a *string* comparison of log size (`:79`,
`[ "$SZ" = "$PREV_SZ" ]`) and is then tested with `-eq 6` at `:81` — **exactly six**, so `LOG-STALL`
fires once per contiguous stall and never repeats however long blindness persists; (b) **no
end-of-stall line is ever logged** (`:79`'s else branch is a bare `STALL=0`), so the 89 in-window
"episodes" are an onset count of unknown duration and the operator cannot distinguish *still blind*
from *recovered 40 minutes ago*; (c) the guard is **asymmetric** — only the HARD branch consults
`$STALL` (`:94`), while the STOP branch (`:88-93`) never does, so a blind watcher **will still write
the cooperative stop flag**. The `:81` message *"enforcement suspended"* therefore overstates what
happens. Add an end-of-stall line, report stall **duration** not onset count for one full cycle before
arming, and resolve the STOP/HARD asymmetry deliberately rather than inheriting it.

EARS: WHEN the cordon fires, THE SYSTEM SHALL set a cooperative stop flag and SHALL NOT signal the
process. WHEN the watcher is blind, THE SYSTEM SHALL log both the onset and the end. WHEN the operator
sets `MR_FORCE`, the cordon SHALL be overridable.
Tests: proof-of-teeth — a synthetic stall must produce a matched onset/end pair; a cordon fire must
leave the branch pushed and the PR open (ADR-0010).

### lp-14 — Bounded context segmentation (HIGH, HEAVY)
`touches: memory/projects/mr-launch.sh, memory/projects/mr-spawn, segmentation config`
`after:` W0-4 · `blocked:wave-2-exit` — **not blocked on `lp-01`**: it arms on parent context size
from transcripts, not the rate-limit gauge, which nothing in its mechanism or rollback touches.

**The mechanism correction decides whether this works at all.** `mr-launch.sh` has three claude
invocation sites: `:85` a **fresh** `-p` spawn, `:124` `--resume "$SID"`, `:139` the cost-cap wrap
(`--resume "$WSID" --effort low`). The established measurement is that **`--resume` does NOT reset
context** (334,916 → 45,235 only on a fresh spawn), and the only relaunch path is `--resume`.
**Therefore segment N+1 MUST be a fresh spawn on the `:85` path, seeded from the checkpoint memo —
never `--resume`.** Built on the resume loop it produces checkpoint memos and park risk with **exactly
0% context reduction**. The detectable signal is segment 2's turn-1 prompt token count: ≲50K, not
≳300K. Absolute veto. Second trap: the kill switch must be an explicit
**sentinel** — with `context_tokens > threshold`, `0` arms segmentation *maximally*, not off, so
test `if threshold <= 0: disabled` before any comparison.

**Exit is outcome-based, not volume-based** — a volume target is monotonically improved by cutting
harder, which is what turns a working slice into a park; parent-volume reduction is a diagnostic
only. Exit: (1) credits (or Δutil) per **merged** slice does not increase;
(2) first-attempt merge rate does not fall below 14/15; (3) **zero scope re-derivation**
(absolute veto); (4) zero slices ending `SEGMENTS>0` with no PR. Threshold confidence is **LOW** and
labelled so: 250,000 from a p50 parent context of 200,100, and nobody has observed a segmented run —
W0-4 validates the arming set, not the cut.

EARS: WHEN a segment boundary is reached, the next segment SHALL be a fresh spawn seeded from the
checkpoint memo. WHEN the threshold is at or below the off-sentinel, THE SYSTEM SHALL NOT segment.
WHEN a checkpointed run is in flight, it SHALL finish its segment and exit clean, never resume.
Tests: proof-of-teeth — segment 2's turn-1 prompt token count ≲50K on a real segmented run; a
`threshold = 0` fixture must not arm (ADR-0010).

#### 2.5 Wave 7 — meta (sketches, ≤1 slice/week)

Deliberately **not** authored at full fidelity: entry is Wave 6's above-the-cut items complete or
re-prioritised, which is months out, and `spec-kit`'s own rule is sketches for later milestones. Each
is elaborated at slice head.

- **`lp-15` — ceremony retirement.** Archive `mr-feedback` (0 of 189 rows ever terminal) and its
  doctrine, and edit **all four** `mr-selfcheck` sites in the same diff — `:11` (ast-parse of
  `mr-feedback`, **which also breaks on a `git mv`**), `:12` (`mr-feedback selftest`), `:53` (grep
  `"Feedback doctrine (ACTIVE"`), `:54` (grep `"ACTIVE 2026"`) — plus the tick call site at
  `mr-native-tick.sh:139`. Must be **one slice**: archiving without the selfcheck edits leaves an
  interruptible boundary that is RED. Sequenced strictly **after `lp-registry`** takes over playtest
  intake, or the retirement removes the only (broken) consumer and leaves nothing. Driven by
  `just audit`'s KEEP/PROTECT/REVIEW/TRIM verdicts rather than hand-derived judgement.
- **`lp-15b` — `N_MAX=2` + `NMAX-GATE`.** Split from `lp-15` for two reasons: bundling means the revert
  that rescues a RED selfcheck also silently restores `N_MAX=3`, two unrelated failure modes sharing
  one rollback; and a credit justification would be the mirror of a known dead end (concurrency changes
  the *rate*, not credits per slice). **The only permitted justification is removing dead doctrine** —
  the N≥3 protocol has been used zero times. Ship it as that, or drop it.
- **`lp-16` — `mr-doctrine-lint` in `mr-selfcheck`**, constant-parity first. Concrete seeds already
  measured: the two duplicated 7-day human-gate constants (`mr-decision-watch:22`,
  `mr-native-tick.sh:149`); the duplicated `mr-ask-drew` default repo (`:12`, `mr-decision-watch:16`);
  the duplicated tier-median dicts (`mr-situation:105`, `:108`); and `mr-selfcheck`'s own two
  hand-maintained file lists.
- **`lp-17` — pre-registration + weekly report section 4.** Keep `residuals_emitted`. **Drop the
  production-vs-test line ratio** — it improves when tests are deleted (the very action under test) and
  when production code gets more verbose, so it is gameable in both directions. Use metrics that cannot
  be moved by emitting or deleting lines: credits (or Δutil) per **merged** slice; escaped defects found
  by the gauntlet **after CI green**; mutation **survival rate per module**. Pair each `lp-skills` count
  with the outcome it should move. Pre-register directions **before Wave 4 starts**.
- **`lp-18` — `mr-size` backtest** *(conditional)*. **`lp-19` — review cadence trigger** *(conditional)*.
- **`lp-worktree` — worktree isolation for concurrent slices.** Measured: `mr-launch.sh:18` points at
  the **main checkout**, and all three invocation sites run `( cd "$PROJDIR" && claude …
  --dangerously-skip-permissions )`, so concurrent slices under `N_MAX=2` share one working tree with
  permissions disabled. Ranked last **deliberately** — but named rather than silently omitted, because
  omitting it silently would make this plan its own disclosed-but-untracked instance. Note `lp-00`
  establishes the harness-side half of this for `lp-*` slices.
- **`lp-20` — spec tier.** Deferred past everything; three blockers of its own; largely subsumed by
  `lp-spec-mode`'s Tier A/B/C, which is the answer to the question `lp-20` was posed to ask.

## 2.6 Delivered

**lp-09 — DELIVERED 2026-08-16 (attended).** New `memory/projects/mr-hold` is the provenance-aware
interface (`set --by operator|supervisor`, `clear`, `status`, `--selftest` with 19 fixtures). The
fail-safe is the whole design: **absent or unrecognised provenance means OPERATOR**, so the live
zero-byte flag already reads as an operator hold and the unchanged wrapper in `~/.local/bin` keeps
working with no edit outside version control.

**Enforcement is mechanical, and that required going outside the declared touches.** The tick never
removed the flag — every clear came from an LLM session, so a rule in the prompt would not bind the
one actor that mattered. `.claude/hooks/guard-bash.mjs` (both harness and project copies) now blocks
deletion or renaming of the hold file, and the operator's resume wrapper, when issued as a Bash tool
call — leaving `mr-hold clear`, which checks provenance, as the only in-session path. The operator's
own terminal is unaffected, because the hook only sees tool calls. `touches:` was corrected to name
the hook instead of the `mr-supervisor-disable` vendoring the spec had listed; **vendoring was
deliberately NOT done** — that path has no git history, so an edit there could not be reverted with
the slice, and the fail-safe default makes it unnecessary.

A first version of the guard matched those command names as bare substrings and blocked merely
*writing about* the kill switch — it blocked this slice's own documentation. The rules are now
anchored at command position. **An over-firing guard is worse than a narrow one: it gets switched
off, which is how decorative gates are born.** This is defense-in-depth behind the provenance check,
not a sandbox.

Also shipped: `mr-native-tick.sh` gate -1 logs `SKIP hold by=<who> queued_events=<n>`, closing the
second half of the defect where one done-event sat **83.9 h** behind the flag with nothing surfacing
the backlog; and `mr-spawn` refuses with `HOLD-PRESENT` **before** repo routing and before the sync
gate's network fetch, because a hold outranks everything.

**Teeth — 25 across the slice, 0 dead.** Against the live hold: the loop cannot clear it and the flag
survives; a real tick stands down `rc=0` logging `by=operator queued_events=0`; `mr-spawn` returns
`HOLD-PRESENT`. Guard: 10 classification cases, invocations blocked and prose/reads allowed. A
provenance-default regression reds `mr-selfcheck`, then restores. One bug found by its own selftest
and fixed: `def read_hold(flag=FLAG)` bound the live path at definition time, so the fixtures were
silently reading the real kill switch — a shape that would have hidden a real regression just as
easily. `MR_FORCE=1` still overrides without clearing; deliberately not neutered.

**lp-00 — DELIVERED 2026-08-16 (attended).**
`mr-repo-of` (new, 207 lines) is the routing SSOT: it maps declared `touches:` to
`harness | project | MIXED | EXTERNAL`, and both `mr-spawn` and `mr-launch.sh` read the same verdict
(the launcher via the lock), so the rule cannot drift between them. `mr-spawn` routes cwd, worktree
base branch and PR target, and refuses four ways — `REPO-MIXED`, `REPO-EXTERNAL`, `REPO-UNRESOLVED`,
`REPO-OUT-OF-SYNC`. `mr-launch.sh` gained `RUNDIR`/`OTHERDIR`/`PRREPO`; **`terminal_pr_open` now polls
the run's own repo**, which was the expensive latent bug — polling the wrong repo makes it
permanently false and burns all three attempts on a finished run. The brief is tokenised
(`<PR_REPO>`, `<BASE_BRANCH>`, `<WT_ROOT>`, `<REPO_BLOCK>`); zero hardcoded repo or branch strings
remain in it.

**Two things found by building it that the spec did not contain.**
1. **The harness local `main` was 9 commits ahead of `origin/main`** — every one an unpushed
   `chore(mr-sup):` — while monster-realm was 0/0. A harness slice branching from `origin/main` would
   have built on a base missing all of it. That is now the `REPO-OUT-OF-SYNC` gate, and it is not
   harness-specific: it protects both repos and is a no-op when in sync.
2. **`mr-selfcheck`'s two hand-maintained lists are gone, not merely checked.** The spec asked for a
   check that every `mr-*` tool appears in them; deriving the lists removes the drift class instead.
   The old 19-path list had already drifted — it omitted `mr-selfcheck` itself and `mr-feedback`.
   `.bak*` is excluded deliberately (several backups are executable). Deriving also made the heredoc
   scanner scan `mr-selfcheck`, which exposed a real scanner bug: it counted a `python3 - <<'PY'`
   example **inside a comment** as an opener. Comment lines cannot open a heredoc in bash, so the fix
   is general rather than a carve-out for this file.

**Proof-of-teeth — 15 fixtures, all demonstrated RED then restored green.** `mr-repo-of --selftest`
carries 15 cases including the real declared `touches:` of live slices, plus a degeneracy check
(≥4 distinct verdicts) so a stuck classifier cannot pass. All **43** live slice declarations across
both specs route as intended. `mr-selfcheck` bit on: a new tool with a bash syntax error (three
variants), a python syntax error, an unclassifiable shebang, a python-heredoc error in `mr-ask-drew`
(a file the old 7-name list never scanned), a `mr-repo-of` classification regression, and — as a
negative control — a genuinely unpaired heredoc opener, proving the comment filter does not hide real
drift. One fixture was initially recorded as a dead tooth and was wrong: `if [ 1 = 1 ; then` is valid
bash *syntax*, so `bash -n` correctly passes it.

**NOT exercised, and it needs saying:** the outward half — `git push` of a harness branch and
`gh pr create` on `mdrewt/claude-harness` — was **not** run. The local half is proven end to end
(worktree from `origin/main`, isolated commit, gate green, teardown clean, main checkout untouched)
and `gh repo view mdrewt/claude-harness` confirms reachability and `default=main`, but the first real
harness slice is what proves push+PR. Expect to babysit it.

## 3. Sequencing & fan-out

**Execution order, set by operator decision 2026-08-16:** `lp-00` (attended bootstrap) → `lp-09` →
`lp-01` → then the rest of this milestone and `15r-sec-a`. `lp-09` and `lp-01` are pulled to the front
because **pacing through Waves 0–4 is manual**: the operator watches usage and runs
`mr-supervisor-disable`. That makes the kill switch the only control, and today the loop can `rm` a
pause the operator set — so the provenance fix and a real utilization number to watch both outrank
everything else. `lp-03`, `lp-05` and `lp-doc-a` are monster-realm slices needing no `lp-00`, so they
are available as fan-out candidates at any point; `lp-03` remains the prerequisite for any
`#[ignore]`d test (`15r-h2`), since an ignored test in an unwatched job is the "gate that has never
failed" anti-pattern in its purest form.

**This milestone is unaffected by the SpacetimeDB 2.8.1 bump**, and that is why it leads PLAN §9.
Every `lp-*` slice except `lp-03`, `lp-05` and `lp-doc-a` touches only `memory/projects/**` in the
harness repo — no Rust, no `schema.rs`, no `evals/` attribute scanners. So `lp-00` → `lp-09` → `lp-01`
can proceed while the project repo is mid-migration, which is exactly the work that should run during
a project-side freeze. The three project-repo slices are attribute-agnostic (`nightly.yml`,
`ops/observability/`, `docs/adr/`) but should still be re-checked against the bumped tree at slice
head.

**There is no automated pacing until `lp-12` (Wave 5), and that is a recorded operator choice, not an
oversight.** The 3-slices/week hand cap the plan once proposed is **withdrawn** and must not be
reintroduced as a default. The measured precedent is on the record — 18 slices, $1,731, 29%→90% in
3.5 days, internal governor reporting NORMAL throughout — which is precisely why `lp-09` and `lp-01`
now come first.

**Wave 1 exit — all four must hold before any Wave-2 slice starts:** (1) one full reset cycle
(Thu 20:00 ET → Thu 20:00 ET) of `seven_day.utilization` samples captured, each tagged by launch state
and by which gate the tick reached; (2) `lp-02`'s new columns show **non-degenerate variance** over the
first five slices and are readable by one committed query script the selfcheck runs; (3) a deliberately
forced nightly red opens exactly one issue, and the drill asserts **the issue appeared**; (4)
`lp-01`'s selftest is demonstrated RED against its three injected defects.

**Wave 2 exit — all four:** (1) zero supervisor self-arms of the disabled flag in two weeks; (2) zero
events stranded > 2 h behind the flag (baseline: one done-event sat **83.9 h**); (3) **the supervisor
cannot CLEAR a hold it did not set**, proven by touching a zero-byte flag on the branch and confirming
the tick stands down and does not remove it; (4) `mr-selfcheck` greps the last 24 h of tick log for the
wedge predicates and emits `SELFCHECK-FAIL` on any hit.

**The one non-negotiable ordering constraint is R13: instrument → one full reset cycle → gate. Never
the same slice, never the same week.** The v3 cutover replaced its own instrument in the same commit
and is permanently unevaluable. `lp-12`, `lp-13` and `15r-tst-i` all carry it.

**Fan-out.** Most Wave-1 slices are file-disjoint and genuinely parallel: `{lp-03, lp-05, lp-doc-a}`
are three different repos/paths; `{lp-01, lp-04}`, `{lp-02, lp-06}`, `{lp-skills, lp-07}` are disjoint
pairs. **But `lp-01`, `lp-02`, `lp-09`, `lp-10`, `lp-11`, `lp-ollama` and `lp-spec-mode` all touch
`mr-native-tick.sh`** — that file is this milestone's `lib.rs`, and until `lp-disjoint` lands nothing
mechanical will notice. Serialize them by hand and say so in each brief. `lp-09` is the highest-risk
single slice in the plan and runs alone.

## 4. DECISIONS for Drew

**All ANSWERED 2026-08-16 by direct operator interview — W0-Q does not need to open any of them.**
Recorded here and as one row in `memory/decisions-log.md`.

- **`lp-00` execution path — ANSWERED: build it.** Harness slices get their own worktree and a PR on
  `mdrewt/claude-harness`. Rejected explicitly, and recorded so they are not re-proposed:
  supervisor-direct commits (no review gauntlet on the thing that does the reviewing — the plausible
  mechanism behind RF-0, the improvement loop freezing 2026-08-01), attended-only (against D5), and
  deferring loop-infrastructure entirely.
- **Q-B1 `rev15-harness-utilization-share` — WITHDRAWN, not asked.** `lp-12` targets *account-wide*
  utilization, which makes the loop self-yielding, so control never needs the harness's share. Useful
  for reporting; gates nothing.
- **Q-B2 `rev15-overage-autopurchase` — ANSWERED: auto-purchase is ON.** A lookahead miss therefore
  *buys* credits rather than failing loudly, which is the invisible failure. Consequence, carried into
  `lp-12`: the ceiling **ramps** — 95% until the p90 estimator holds ≥3 samples for a mode/tier, then
  toward 99% as measured variance shrinks — and any row carrying overage is a **loud alert**, never a
  routine band. **Unresolved observation, recorded rather than guessed:** 29 ledger rows carry
  `overageStatus:"rejected"` with `overageDisabledReason:"org_level_disabled_until"`, which contradicts
  "ON". Re-check when `lp-01` gives live telemetry; it changes only the band's severity ranking.
- **Interim pacing — ANSWERED: run UNPACED, disable by hand** through Waves 0–4 (~25 slices, before
  `lp-12` exists). The operator's call, made with the measured precedent in view: 18 slices / $1,731 /
  29%→90% in 3.5 days while the internal governor reported NORMAL. A 3-slices/week hand cap, a 2/week
  cap, and gauge-first sequencing were all offered and declined. **The plan's earlier "3/week nominal,
  floor 2, ceiling 4" is therefore WITHDRAWN and must not be reintroduced as a default.**
- **Consequence — ANSWERED: pull `lp-09` and `lp-01` to the front.** Because manual disable is now the
  only control, the un-clearable kill switch and the real utilization gauge land before any other
  remediation. Execution order: `lp-00` → `lp-09` → `lp-01` → `15r-sec-a` → the rest. PLAN §9 is
  reordered so this milestone precedes `M-postgate-fifteenth-review-residuals`.
- **Q-SPEC-HOME `rev15-loop-spec-location` — DEFAULTED, not escalated.** This spec stays in
  `specs/monster-realm-v2/` because the supervisor selects work from PLAN §9 plus the sibling
  `M*.spec.md`, and a spec filed elsewhere is invisible to its only consumer. Recorded as
  `decision-defaulted:loop-spec-location=specs/monster-realm-v2/`; reversible with a `git mv` plus one
  PLAN line once `lp-08` gives `mr-ready` an explicit spec-root list.

## 5. Explicitly NOT in scope

- **All `15r-*` and `13r-c-2` work** — `M-postgate-fifteenth-review-residuals.spec.md`, queued
  immediately before this milestone in PLAN §9. Split rule is the id prefix and it is mechanical.
- **Wave 6's 25-item backlog** — catalogued in the fifteenth-residuals spec §7.
- **`costwatch_enforce = true` as a kill** — measured dead end. All four historical HARD trips merged
  EXIT=0; two of four counterfactual kills land at 81.7% and 87.9% of real cap; under a consumed
  allowance a kill reallocates spend rather than saving it. `lp-13` ships as a cooperative stop only.
- **Trimming the supervisor prompt to save tokens** — measured at ~$83/yr, **0.087%** of spend. Any
  rewrite must be justified on correctness or retrievability, never on tokens.
- **Raising duty cycle, `N_MAX` or cron frequency for throughput** — concurrency changes the rate, not
  credits per slice; at 87% utilization `N=4` drives straight into overage.
- **The fable/opus A/B on current instruments** — every quality column is dead
  (`remote_red_fix_cycles` sums to 0 across 446 v3-era rows), so the experiment has no readout.
- **Raising the supervisor tick's model tier** — verified and refuted: there is no measured defect
  attributable to the tick model. In-window merges were clean, the gate audit's 0 true positives is a
  *detector* defect, and no bad-merge incident exists in the ledger. Revisit only if a quality readout
  with non-zero variance ever shows tick-attributable error.
- **CodeGraph index staleness as a hazard** — verified and refuted: the *project* index is live
  (`projects/monster-realm/.codegraph/codegraph.db`, written 2026-08-15 with an active daemon, against
  source touched the same day). Build sessions work in the project repo. The stale index is the
  *harness* one, which matters only to interactive navigation.
- **Harness working-tree state loss** — verified and refuted: `memory/projects/.gitignore` deliberately
  excludes runtime state with a documented rationale. The one genuine item, the stray handoff, is
  already `lp-06`'s.
- **Deleting the zero-count skills** — they are unfired, not worthless; the defect is the dispatch
  mechanism. `lp-skills` fixes the trigger.

## 6. Notes for the runner

- **Twenty-six slice entries** across four waves, plus eight Wave-7 sketches (§2.5) that are not launchable
  until their entry condition. **Loop-infra slices produce no ADR** — the ADR corpus belongs to
  monster-realm. They record decisions in the relevant `$MEM/mr-*` doctrine file plus one line in
  `memory/decisions-log.md`. The three project-repo slices (`lp-03`, `lp-05`, `lp-doc-a`) **do** take an
  ADR, reserved at build time from `mr-state.json`'s `adr_next_free` (**198** as of 2026-08-16 — 0197 was taken by the SpacetimeDB upgrade ADR;
  `docs/adr/README.md:16` says `0184` and is stale by 13 — its own line 18 warns the field is
  hand-maintained and ungated).
- **`lp-00` first, and nothing harness-side is launchable before it.** This is the one finding in this
  spec that the implementation plan does not contain, and it is structural, not a detail: the loop has
  never opened a harness PR. If `lp-00` proves harder than MED, the fallback is explicit rather than
  silent — the operator runs `lp-*` slices attended, which is what happens today by default and which
  D5 exists to reduce.
- **The block token is the selection contract, and the parser must scope to the `after:` line, never
  grep the whole entry.** That is not a style preference: `lp-08`'s own body necessarily quotes the
  literal (it is the slice that implements the parser), so an entry-wide grep would mark `lp-08`
  blocked for describing blocking. It happens to be blocked anyway, which is exactly how this class
  of bug survives review. `lp-08`'s `mr-ready` parses it there, alongside the inline `touches:`/
  `after:` convention — **not** `standards/spec-driven.md:33`'s `## Touches` heading, which exactly
  1 of 59 spec files uses.
- **Re-measure before you quote.** Every count here was re-derived on 2026-08-16 and re-measurement
  overturned five circulating claims, recorded so they are not re-inherited: (a) the rate-limit walker
  is **not** `rate_limit_info`-specific and its input is pre-filtered on the literal `"rejected"`, so
  `utilization` lines are never parsed — `lp-01` is a new reader, not a widened walker; (b) **`mr-spawn`
  already exists** (8,329 bytes, executable, self-checked by `mr-selfcheck` at `:6` and `:31`) — extend
  it, never create it, or a live component is clobbered; (c) `mr-audit`'s hard-tier FLAGGED is **not**
  unconditional — it is nested under a repo/base/head guard whose failure yields `AUDIT-ERROR`; (d)
  **`validate.mjs` does not exist** at either path the plan names — the real file is
  `projects/monster-realm/ops/observability/validate.mjs`; (e) `mr-decision-watch`'s silent 7-day expiry
  does **not** deadlock the loop, because `mr-native-tick.sh:149` carries an independent marker-age
  check — the real defect is two duplicated constants and a respawn that resets one clock but not the
  other.
- **Skills must be named in the brief.** Until `lp-skills` lands, name the governing skill explicitly in
  every brief: harness-script work → `code-intel` for navigation; spec work → `spec-kit`. Measured, the
  model does not load them on its own: 34 skill invocations against 828 agent invocations in 30 days.
- **Every slice test-first with proof-of-teeth per ADR-0010**, and for this milestone the teeth live in
  the `--selftest` subcommand pattern aggregated by `mr-selfcheck` — the same pattern
  `mr-cost-sum --selftest` already uses with 17 fixtures. Add every new tool to `mr-selfcheck`'s two
  hand-maintained lists (`:6` and `:30-31`) in the same commit, or it ships unchecked.
- **The retirement trap `lp-08` must clear, measured while running W0-0's own proof-of-teeth.** A
  parser that walks `### <id>` headings and checks git for a merge commit selects **`B2`** from
  `M-postgate-evolution-fusion-hardening` — a slice retired 2026-08-02 by both its own spec banner
  (*"Do not schedule A1/B2/B/C from this file"*) and its PLAN §9 bullet. Retirement is recorded only
  in prose, in two places, in neither a heading nor a token. A naive `mr-ready` would spend a full
  slice on superseded work — worse than the standdown it replaces. This is RF-3 in a third location.
- **`lp-14` slice-head check, moved here so the slice entry stays sized:** `mr-launch.sh:139`'s
  cost-cap wrap runs `--effort low`. If `lp-14`'s checkpoint write reuses that wrap verbatim, confirm
  it sits inside D3's *"too simple for the model difference to matter"* exception rather than being a
  silent tier demotion.
- **`lp-08`'s `touches:` calibration, measured at review because the first count was wrong in the
  dangerous direction — too few shapes.** Of 59 pre-existing specs: **1** uses the documented
  `## Touches` token; **15** carry a real per-slice declaration, in **three** shapes —
  **bullet/table-embedded 10** (the most common; M20, M21, the M8.x family), **heading-carried 4**
  (13r style), **own-line 1** (14r style). A further 22 mention the string in prose only. A parser
  built on the two shapes an earlier draft named would miss **10 of the 15 declaring files**.
- **`lp-registry`'s seeding input, enumerated.** The 12 rows of
  `M-postgate-fifteenth-review-residuals.spec.md` §8; its §7 catalogue (25 above-cut + 3 promotion
  candidates + the parked set); and the remaining ~290 items in
  `memory/projects/mr-implementation-plan-2026-08-15-evidence.json` — the triage output and the only
  place all 329 exist as records. If that file is unavailable at slice head, **re-run the triage
  rather than seed a partial registry**: one that silently omits most of the backlog is worse than
  none.
- **Slice sizing: the bound is 33 lines, measured, not guessed.** The plan said "no slice entry
  exceeds 30", written before the corpus was measured; the two reference specs actually run **11–33**
  per slice, so ≤33 is the enforced bound. It bit four times across both specs and was right each
  time — `lp-11b`, `lp-milestone-mode`, `lp-decision-block` and `15r-d-0` were split out of entries
  that had quietly grown two concerns. **One stated exception: `lp-00` at 34**, which passed the bound
  until delivery and grew only when the `REPO-OUT-OF-SYNC` requirement found during implementation was
  written back into its EARS. It is now a record of shipped work rather than a brief to hand a
  session, so the decomposition signal the bound exists to raise does not apply; the implementation
  detail lives in §2.6, not in the entry.
- **`lp-09` runs alone.** It is the file that stops the loop.
