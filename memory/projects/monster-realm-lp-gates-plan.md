# lp-gates — Slice Acceptance Ledger + residual sink (PLAN v2, attended, 2026-08-22)

Mined from the `unlazy` v2 skill (github.com/Leonxlnx/unlazy) and adapted to this pipeline.
Attended work while the native loop is held (`.native-supervisor-disabled`, by=operator).

**v2 supersedes v1 after a six-lens adversarial review + judge adjudication.** The review found ten
blockers, three of which I had independently verified; all are applied below. The headline change:
**the Stop hook ships OBSERVE-ONLY** (R13: never ship a gate and its only instrument in one slice),
the audit block ships **advisory**, and the deferral sink gains a **mandatory drain** (§10) —
without which, in the judge's words, "the 13.1-day number does not move and the slice is
visibility theatre."

---

## 0. What `unlazy` v2 is, and what is worth taking

Thesis: **prose cannot enforce prose** — a model that under-executes instructions also under-executes
the instruction not to under-execute. Enforcement moves down a hierarchy: discipline (weakest) → a
gates FILE → runnable CHECK commands → parent re-verification → a Stop hook (strongest). Measured
motivation: across six controlled runs, every skill run's final report contained 1-3 wrong numbers.

### TAKE (adapted)

| # | Concept | Why it fits here |
|---|---|---|
| U1 | Acceptance criteria written to a FILE before work starts | Per-slice criteria are EARS `SHALL` prose in a spec the run reads once. Nothing carries them to the finish line. |
| U2 | `CHECK:` / `EXPECT:` / `EVIDENCE:` — runnable acceptance | Converts "every EARS criterion tested" from a self-asserted DoD bullet into a command with captured output. |
| U3 | Checked-with-`pending`-evidence counts as UNMET | A failure class this corpus has shipped (fabricated counters, lp-01). |
| U4 | A machine-readable surrender line | The measured failure is **not** concealment — it is *declared* deferral into prose nothing reads. A surrender line with a mandatory, resolvable target plus a drain is the sink this corpus lacks. |
| U5 | Parent re-runs the child's checks | The supervisor re-verifies ground truth for merges but has no way to re-verify *completeness*. |
| U6 | Stop hook | The wrapper's terminal predicate is `terminal_pr_open` — "a PR exists" — a proxy for done. Shipping **observe-only**; arming is slice 2. |
| U7 | Re-measure every number at report time | Narrowed to the ONE number that matters (N of M criteria met), generated mechanically and byte-compared. |
| U8 | Evidence capped to the deciding lines | Matches ADR-0012's quiet-run doctrine. |
| U10 | Checks are shell commands, not the model re-reading | Enforcement must cost ~0 tokens. |

*(U9 "5-12 gates per unit is the useful range" was in v1 and is **cut** — see §9.4. Measured here:
median 3 criteria, and only 6 sections corpus-wide exceed 12.)*

### REJECT (with reasons)

- **`tree N` at the SLICE-SELECTION level.** unlazy measured its own arithmetic as fiction (tree 6
  cost 1.0-1.5x tree 3, not 8x) and demoted depth to "decomposition". This pipeline already
  decomposes with `touches:`, `after:`, `blocked:`, `mr-disjoint` and decision-space partitioning —
  strictly stronger. Adopting the dial there would be a regression.
- **`tree N` INSIDE a slice run** (operator question, 2026-08-22). Evaluated properly — see §9.
- **Solo vs Orchestrated mode selection.** This pipeline is always orchestrated.
- **`GATES.md` at the cwd root, discovered by cwd.** Wrong binding for per-slice worktrees that are
  deleted at merge. Bind by slice id; store durably.
- **Self-authored, self-checked gates.** Load-bearing in unlazy; unacceptable here. An unattended
  loop with `--dangerously-skip-permissions` grading its own homework is a reward-hack surface, and
  this corpus has shipped two proven test-cheats (lp-01) and a detector with 0 true positives in 446
  rows. §5 exists entirely to close this.
- **A general "audit every number" scanner.** lp-04's lesson: a detector that fires on everything
  carries no information.
- **Splitting the 40 KB SSOT prompt.** The milestone spec §5 lists it as explicitly out of scope —
  measured at ~$83/yr, **0.087% of spend** — and rules that "any rewrite must be justified on
  correctness or retrievability, never on tokens."

---

## 1. The measured problem

1. **58.8% of uniquely-named slices (107 of 182) live in a remediation milestone**, across 17 of
   them; cadence not decaying (11r=9, 12r=6, 13r=8, 14r=7, 15r=17, 16r=8).
2. Of a 46-slice classified sample, **28 (61%) exist because an earlier slice left declared work
   undone**.
3. **The failure is not concealment** — 10 of 10 substantive handoff hits were deliberate, declared
   parks. The defect is routing: **12 of 18 named continuation slice ids never got a spec section.**
4. The postmortem already named it: **RF-3 "records are not queues"** — 130 defer/park phrases, 45
   ADRs with a Residuals section, **zero mechanical consumers**, **mean latency 13.1 days**.
5. Postmortem C4 **"gates that cannot fail correctly"**: `gating_test_audit` 0 true positives
   all-time; a merged slice crash-looped 4 of 8 containers with a CLEAN audit.
6. Spot-check of 6 merged slices: **14 EARS criteria → 9 covered, 3 not covered, 2 undetermined.**
7. Remediation slices carry **$2,838 of $5,736 = 49.5% of matched slice spend**; median remediation
   slice **$46.75**.

Target: **(a) unverified completeness claims, (b) declared deferrals with no sink or drain.**

---

## 2. Design

### 2.1 The artifact — `$MEM/gates/<slice>.gates.md` (untracked)

```markdown
# Gates: <slice>
Spec: <spec-file>#<slice>
Seed: <sha256-16 over canonical seeded ids+titles>     # written ONCE, never rewritten by init
Seeded: <utc>
Repo: harness|project
Scope: <target_desc>

- [ ] E1: <EARS SHALL sentence, verbatim>
  CHECK: cargo nextest run -p game-core -E 'test(evolve_rejects_unowned)'
  EXPECT: /1 passed/
  EVIDENCE: pending

- [ ] E2: <EARS SHALL sentence>
  MANUAL: <why no command can prove it>
  EVIDENCE: pending          # must resolve: path:line, or a quoted deciding output line

- [ ] X1: <run-authored extra acceptance>
  CHECK: ...
  EXPECT: ...
  EVIDENCE: pending

DEFER: E2 -> <existing spec slice id | backlog | wontfix> — <reason>
```

Hardening over unlazy, each load-bearing:

- **`Seed:` is written once by `init` and never rewritten.** `verify` recomputes from the live spec;
  a mismatch is `SEED-DRIFT`. A legitimate spec amendment is cleared only by a supervisor-run
  `mr-gates reseed --slice S --reason …`, logged. *(Blocker 10: both naive readings break — a
  self-rewriting seed lets a run launder an edit, and a frozen seed makes SEED-DRIFT fire on every
  honest spec fix, which would have made the arming band unreachable.)*
- **One gate per `SHALL`-bearing SENTENCE, deduped**, with the sentence text in the hash — *not* per
  `SHALL` occurrence. `mr-slice-quality:481` counts occurrences and the corpus contains sentences
  with three.
- **DEFER targets must resolve.** `new` is **removed** (it reproduces finding #3 inside the new
  mechanism). Legal targets: an existing `### <id>` spec heading, `backlog` (materialised into a real
  heading by the supervisor — §10), or `wontfix` with a reason.
- **Manual gates need a resolvable citation**, not prose; `verify` resolves it and prints the line.

### 2.2 The tool — `$MEM/mr-gates`

`init` · `check` · `status` · `lint` · `verify` · `render {pr|park|handoff}` ·
`residuals {list|add|promote|claim|close|disposition|policy}` · `reseed` (supervisor) · `--selftest`.

House rules: `#!/usr/bin/python3` + the polyglot guard on line 2; hand-rolled parsing with a closed
allowlist; temp+`os.replace`; rc 0/1/2; `MR-GATES-SELFTEST-OK <n>` with a fixture floor.

**`MEM` is HARDCODED, not self-locating** — copying `mr-record:33-37`, not `mr-audit`. Its rationale
applies verbatim: a self-locating `MEM` lets a worktree copy fork the append-only SSOT. *(Blocker 4.)*

### 2.3 What the run does

Criteria exist in a file before the first line of code. The run fills `CHECK`/`EXPECT` during the
plan phase, runs `mr-gates check` after each green increment, and reaches terminal state only when
every gate is met with evidence or explicitly DEFERred. The `Acceptance:` PR block is generated.

### 2.4 What the supervisor does — `mr-gates verify`

1. Recompute `Seed:` from the live spec → mismatch = `SEED-DRIFT`.
2. Re-execute every CHECK in the slice's worktree, **each command string first passed through
   `guard-bash.mjs`** — blocked ⇒ `NOT-REVERIFIED`. *(Blocker 8: a Python `subprocess` never reaches
   PreToolUse, so `verify` would otherwise execute run-authored shell unguarded inside the tick.
   This adopts ADR-0012 commitment 3 verbatim.)*
3. Compare fresh output to recorded EVIDENCE as a **normalized substring match on the EXPECT-bearing
   line**, never a byte-compare — a byte-compare punishes real test runners (timings, ordering) and
   rewards static greps.
4. Resolve manual citations; print the cited line.
5. Lint (§5).
6. **Adversarial spot-check** of one *passing* gate, drawn deterministically from **slice id + seed
   hash** — *not* head sha, which the run controls and could amend until the draw is favourable.
7. Emit JSON. Anything unverifiable is `NOT-REVERIFIED` and **fails closed to FLAGGED**.

Environment for CHECKs: **`MR_*` scrubbed, but `PATH`/`HOME`/`CARGO_HOME` inherited** — cron's PATH
is minimal and `mr-native-tick.sh:10-11` installs asdf shims; a truly clean env would make every
cargo CHECK `NOT-REVERIFIED`.

### 2.5 The sink — `$MEM/mr-residuals.jsonl` (untracked; added to `.gitignore` and `mr-backup`)

One append-only row per DEFER, using lp-registry's already-specified schema (`{slice_id, title,
owner, touches[], severity, domain, disclosed_at, adr, status, disposition}`) plus `source_slice`,
`gate_id`, `defer_count`, `promoted_slice`.

This implements **lp-registry's emitter from a better source**: lp-registry proposed "the runner
appends one record per named follow-up at PR time", which is prose-driven and skippable. A DEFER line
is the *only* legal way to close a gate you did not meet, so the emitter cannot be skipped without
the acceptance verdict going FLAGGED. **The drain is §10 and is not optional.**

### 2.6 The Stop hook — OBSERVE-ONLY in slice 1

`$HARNESS/.claude/hooks/gates-stop.mjs`. It computes its decision, appends it to
`$MEM/gates/<slice>.stoplog`, and **always exits 0 with no `decision` key**. That log is the R13
instrument. Arming is slice 2, against a pre-registered **block-rate** band.

Empirically established (see `monster-realm-lp-gates-hookprobe.md`, CLI 2.1.240):
Stop hooks **do** fire in headless `claude -p`; hooks **do** inherit the parent env; blocking works
and the model does the work; multiple hooks compose and a crashing hook is isolated.

**`stop_hook_active` must NOT short-circuit the hook.** It flips true after the first block, so
bailing on it (as `check-docs-updated.mjs` does, and as v1 of this plan specified) would permit
exactly one block per session. Log it; never branch on it. *(Blocker 1.)*

Known and deliberately deferred to the arming slice: the progress detector must **escalate** on
stasis rather than release (stasis is free and cheaper than progress); three of v1's five release
valves are unreachable code at `costwatch_enforce:false`; and `/tmp/mr_warn_<S>` is touched
unconditionally at 80% of cap (`mr-cost-watch:551`, outside the `ENFORCE` branch) so a
"warn ⇒ don't block" valve would self-disarm on exactly the expensive slices.

---

## 3. Wiring (slice 1 — HARNESS-ONLY)

The slice must be harness-only: `mr-repo-of` **refuses** `REPO-MIXED`, so a slice spanning both repos
is unlaunchable by construction. With the hook observe-only, the project-repo files leave scope
entirely; the project shim is decided by Spike 0.

| file | change |
|---|---|
| `$MEM/mr-gates` | NEW. |
| `$MEM/mr-spawn` | `init` call inserted **below the `--dry` exit at `:988`** so dry runs stop seeding real state. Failure is advisory (`emit`, never `status`, which exits). |
| `$MEM/mr-launch.sh` | `MR_SLICE="$S"` **prefix-scoped on each of the three `claude` invocations**, never a script-scope `export` — plus `env -u MR_SLICE` at `mr-native-tick.sh:400`. |
| `$MEM/mr-audit` | New **advisory** acceptance block (`{"advisory":true,"contract":…}`), no `force_read`. Move together or selfcheck REDs: `mr-audit:341 _ST_COUNT_FLOOR`, `mr-selfcheck:98 COUNT_FLOOR`, register `_st_a_battery` at `:1411`. |
| `$MEM/mr-brief-template.md` | Ledger paragraph, DEFER doctrine, stopping points. Path derived from the already-substituted `<SLICE>` — **no new placeholder** (a new one is a new render-refusal surface for zero gain). |
| `$MEM/mr-supervisor-prompt-native.md` | `verify` at merge; **promote** added to the action set at `:51`; residual surfacing at Pick-work. |
| `specs/.../build-loop-prompt.md` | Steps 2-3 fill the ledger; step 9 `check`; step 11 render. |
| `$MEM/mr-selfcheck` | `PYGATES` block: selftest wiring + the §10 anti-rot alarms. |
| `$MEM/.gitignore`, `$MEM/mr-backup` | `gates/`, `mr-residuals.jsonl`. |
| `specs/.../M-loop-infrastructure.spec.md` | `### lp-gates` in §2.6 Delivered; `lp-registry` amended (emitter + drain superseded). |
| `specs/.../M-residual-backlog.spec.md` | NEW standing spec — the promotion target (§10). |
| `memory/decisions-log.md` | One row. **No ADR** — loop-infra slices produce none (spec §6). |

---

## 4. Enforcement posture

- **Stop hook: OBSERVE-ONLY.** R13 forbids shipping a gate and its only instrument together.
- **Audit block: ADVISORY.** Promoting it to POLICY would re-inflate the exact metric lp-04 shipped
  to deflate, and `mr-selfcheck:215` asserts `read_reason == ["advisory-inputs-unavailable"]`
  **exactly**, so a `force_read("acceptance-unmet")` REDs selfcheck on landing.
- **Armed in slice 1 anyway, because none of these blocks anything:** seeding, `check`, the residual
  emitter, **auto-promote and queue-add (§10)**, and the anti-rot alarms. Work getting *picked up* is
  a scheduler hint, not a gate.
- **Arming criterion for slice 2, pre-registered:** after 10 merged slices carrying ledgers, promote
  the audit block to POLICY and arm the hook iff the acceptance verdict was FLAGGED on **≥1 and ≤4**
  of them (counting LEDGERED slices only — a `NO-LEDGER` verdict is an absent measurement, not a
  failed one, and every pre-lp-gates slice returns it) (fires on all 10 or 0 of 10 ⇒ no information — lp-04's lesson) and every adjudicated false
  positive traces to a fixable cause.

---

## 5. Anti-reward-hacking (revised after the attack pass)

1. **Criteria come from the spec.** `Seed:` recomputed by `verify`; only a supervisor `reseed` clears
   drift.
2. **`E*` CHECKs must invoke a real gate runner** — `cargo test`/`cargo nextest`/`just`/`npm test`/
   `node --test`/an eval invocation, or be declared `MANUAL:` with a resolvable citation.
   `grep`/`rg`/`test -f`/`git`/`wc` are legal on `X*` gates only. **This is the load-bearing
   defence.** CHECKs are authored in the plan phase, *before tests exist*, so the only thing a run
   can write then is `grep -q "fn foo" src/…` — which passes every other lint, re-executes
   deterministically, matches byte-for-byte, and certifies nothing. It also bounds defence 3's
   shell-execution surface to a short allowlist.
3. **The supervisor re-executes every CHECK**, through `guard-bash.mjs`, comparing normalized
   substrings — not bytes.
4. **`check` never writes on failure.** *(Constrains the tool only; the run holds Write. Not a
   defence against a hand-edited checkbox — defences 1, 2 and 3 are.)*
5. **Manual gates need a resolvable citation.**
6. **Deterministic adversarial spot-check** of one passing gate, seeded from slice id + seed hash.
7. **Vacuity lint** = the command-head allowlist, plus: empty EXPECT; EXPECT appearing verbatim in
   its own CHECK; any trailing `|| …` or `; true`; any EXPECT whose regex alternation covers both
   success and failure tokens. The `done`/`ok`/`0` denylist from v1 is **removed** — it banned
   `grep -c FAIL` → `0`, the most common honest check in this corpus, pushing runs toward *weaker*
   EXPECTs.
8. **CHECKs run with `MR_*` scrubbed but PATH/HOME/CARGO_HOME inherited.**
9. **DEFER needs a resolvable target and a reason**, emits a residual row, and **>50% of seeded `E*`
   gates DEFERred is FLAGGED regardless of the rest** — closing the "DEFER everything at minute
   five" exit.
10. **Fail closed:** not re-verifiable ⇒ `NOT-REVERIFIED` ⇒ FLAGGED.
11. **The completeness number in the PR body is generated by `render --format pr`**, and the
    supervisor is instructed to compare it against the ledger. Stated honestly: this one is an
    LLM instruction, not a mechanical check — nothing parses the PR body. It is the weakest
    defence in this list and is named as such rather than counted as machinery.
12. **The MANUAL escape hatch is capped.** The runner allowlist (defence 2) binds only gates that
    HAVE a `CHECK`, so declaring every criterion `MANUAL:` with a plausible citation would dodge it
    wholesale. >50% of a slice's LIVE seeded gates being manual is a BLOCK, with a minimum sample of
    3 (a ratio over one gate is noise, and a 1-criterion doc-truth slice is legitimate). unlazy's
    own rule: *"if you cannot think of a CHECK, ask whether the outcome is observable at all; if it
    is not, sharpen it."* Found by running the mechanism end to end on a real slice, not by review.

**Removed as false comfort:** "the progress detector cannot be gamed" (stasis is free); "five release
valves" (three unreachable at `costwatch_enforce:false`, none write-guarded — `grep -c mr_stop` in
both `guard-bash.mjs` copies is 0); "Claude Code force-releases at 8" (the counter resets on any
tool-executing turn).

**Accepted for slice 1:** `rm`ing the gates file disarms everything. With an advisory verdict and an
observe-only hook, nothing is being enforced, so there is nothing to disarm. It becomes a blocker for
the arming slice, closed by recording seed success in the ledger so *absent* ≠ *never-seeded*.

---

## 6. Cost (corrected)

Median slice **$46.75** (not the "$20-60 relaunch" figure v1 used — that justification was fiction:
`mr-launch.sh:137` `--resume`s and `terminal_pr_open` short-circuits the loop in the target case).
Direct overhead **≈$0.70/slice**; each induced block at opus context depth **≈$4-8** (relevant only
once the hook is armed). Against 49.5% of slice spend in remediation and a 13.1-day latency, the
mechanism pays for itself — the plan should be right about *why*.

---

## 7. Risks

| risk | mitigation |
|---|---|
| `init` failure wedges a launch | Advisory (`emit`, never `status`); a missing ledger surfaces at audit, not as a refusal. |
| `verify` slow at merge | Per-gate timeout + a stated numeric global budget; over-budget ⇒ FLAGGED, not a stall. |
| Slice has no spec section | `SPEC-SECTION-NOT-FOUND`, zero `E*`; run must author `X*`; **zero gates ⇒ FLAGGED with `ZERO-GATES`** (implemented in `cmd_verify`; 40 of 166 launchable sections extract zero criteria, so a CLEAN there would be an instrument reading fine with its sensor disconnected). Not a wedge. |
| `MR_SLICE` leaks to the supervisor | Verified real: `mr-launch.sh:58` spawns the tick with the wrapper's env and `mr-native-tick.sh:400` scrubs only `MR_FORCE`. Prefix-scope + `env -u` + `mr-selfcheck` G6, which asserts BOTH halves (no script-scope export; every `claude` site under $RUNDIR carries the prefix; the tick scrubs it) and is proven to bite on each. |
| Registry becomes a graveyard | §10 — the whole section. |
| Ledger becomes decorative | `residuals_emitted`/`residuals_closed` pre-registered as falsification metrics (ADR-0010). |

---

## 8. Deliberately NOT done

Splitting the SSOT prompt (spec §5: out of scope, 0.087% of spend) · mechanical merge refusal (slice
2) · seeding the 329 pre-existing OUTSTANDING residuals (stays lp-registry's; seeding as-is rebuilds
the graveyard inside the new mechanism) · `mr-ready`/lp-08 · SPEC mode/lp-spec-mode · a general
report-number auditor · an ADR (loop-infra slices produce none).

---

## 9. Intra-slice `tree N` — evaluated, rejected, one adoption

**Operator question (2026-08-22):** slice first, then let the run implement its own depth tree?

**9.1 It cannot be executed, only planned.** `AGENTS.md` and `build-loop-prompt.md:53` hard-cap
orchestration at **depth = 1**. The slice session is the driver; its subagents are its only leaves.
Any tree deeper than two layers is a planning outline — which build-loop step 2's `planner` already
produces.

**9.2 The gates ARE the leaves, and better ones.** unlazy defines a leaf by its gates file
(`method.md` rule 2). The ledger already decomposes each slice into 2-5 spec-derived criteria with
runnable checks. They beat tree-derived leaves on the axis that matters: they come from the **spec**,
not the graded party, and the seed hash makes them immutable. `mr-gates check` after each increment
is unlazy's per-leaf completion discipline at **zero subagent cost**.

**9.3 What a real tree adds is fresh context per leaf — and it does not pay.**
- **Size.** unlazy's own floor is ">= ten minutes of focused effort" per leaf and "do not orchestrate
  small tasks... under roughly half an hour, context re-establishment outweighs the attention gain."
  Measured here: **median 3 criteria per slice, mean 4.0**.
- **No parallelism to win.** unlazy requires leaves to own disjoint files; criteria inside one slice
  routinely share a file — that is *why* they are one slice. Sequential leaves = full
  re-establishment cost, zero wall-clock gain.
- **It breaks the role split.** `tester` writes the gating tests → `specialist` makes them pass →
  `verifier` re-runs them, and the implementer never edits its own gating tests
  (`build-loop-prompt.md:52`). A per-criterion leaf that implements *and* tests its criterion
  re-merges those roles inside every leaf — a regression on the pipeline's strongest quality control.

**9.4 Sizing signal — DEMOTED, not adopted as a feature.** v1 promised a `SIZE-WARN` gate; the
review refuted it as a headline (median 3 criteria; only 6 sections corpus-wide exceed 12, so it
would almost never fire). `init` computes the count anyway, so it **prints `criteria=N`** (free, and
cross-checkable against `mr-slice-quality`'s `ears_criteria_count`) and warns above 10. That is two
lines, honestly labelled as rare — not the mechanism this slice is about.

**9.5 ADOPTED — fresh context on RESUME, because it is free.** A resumed slice is a new session
anyway; the resume brief is built from the ledger's **unmet gates** (`render --format park`) rather
than a hand-written memo. The one case where attention decay is plausible and the fresh context is
already paid for.

**9.6 Reinstatement trigger.** It cannot be measured today: the milestone spec §5 records that the
quality columns are dead (`remote_red_fix_cycles` sums to 0 across 446 rows), the same reason the
fable/opus A/B is out of scope. The ledger is the instrument that makes it evaluable. Revisit when
**≥3 slices in a window carry ≥10 criteria and also cost-park or exceed 2 attempts.**

---

## 10. THE DRAIN — how a deferral is guaranteed to become finished work

*(Operator requirement, 2026-08-22, and independently the judge's blocker 9. Without this section the
slice reproduces finding #3 — "12 of 18 continuation ids never got a spec section" — inside a nicer
file format. A sink with no drain is a graveyard with better lighting.)*

**Invariant: every residual reaches exactly one of two terminal states — MERGED (its criterion
passes a gate in a later slice) or DISPOSITIONED (`wontfix` with a recorded reason) — and it cannot
sit in between silently.** Five mechanisms, each mechanical, each with a bounded failure mode.

### 10.1 Targets always resolve; `backlog` is materialised, never a void

A DEFER target is an existing `### <id>` spec heading, `wontfix`, or `backlog`. `backlog` is not
`new` by another name: the supervisor **materialises** it into a real heading in the standing spec
`specs/monster-realm-v2/M-residual-backlog.spec.md` via `mr-gates residuals promote`, which appends

```
### <allocated-id> — <title> (from <source_slice>, deferred <date>)
`touches: <inherited>`
EARS: <the verbatim SHALL sentence from the deferred gate>
```

and writes the allocated id back onto the residual row. **The criterion text is already
spec-quality — it came from the spec** — so promotion is a mechanical copy, not spec authoring.
That is strictly safer than lp-spec-mode's already-approved **Tier A** ("residual specs from
verified findings — unattended, PR, merge on green; proven 15/15 merged, 14/15 first attempt").

Ownership: the **run** writes only the DEFER line; the **supervisor** promotes, via the existing
doc-only chore-PR path (`chore/residual-promote-<batch>`, auto-merge enabled since 2026-07-25),
batched one PR per tick. This respects `REPO-MIXED` (a project-slice run never edits harness specs)
and reuses a proven path rather than inventing one.

### 10.2 Age forces pickup — via the queue, not via a priority rewrite

Placing the backlog spec at a fixed position in PLAN §9 is wrong in both directions: at the front
features starve, at the back residuals starve (today's bug). Instead, age drives the **existing
fast path**:

- **T1 = 3 days** — an unpromoted residual is promoted; a promoted one becomes eligible for
  `mr-record queue-add`, which is exactly the pointer cache Pick-work consumes *before* the PLAN §9
  derivation. Bounded wait: `queue[]` is capped at 5, all of which also drain, so an aged residual
  launches within a few ticks.
- Baseline is a 13.1-day mean, so T1=3d targets roughly a 4x improvement.

No new scheduler, no priority inversion — `queue-add` already exists, is already re-verified live,
and is already consumed by deletion.

### 10.3 Closure is proved by a gate, not by a merge

The promoted stub carries the same criterion text, so the promoted slice's own ledger seeds it as an
`E*` gate. A residual is closed **only when the promoted slice's own ledger is fully resolved** —
`mr-gates residuals close` refuses on a missing ledger or on any unmet gate, and `--force` (the
honest escape when the slice legitimately DEFERred it onward) is recorded on the row. Closing on
"something merged with the right branch name" is the weakest possible predicate and would let a
residual be retired by a slice that did not deliver it. This runs in the supervisor's merge
sequence and records the PR ref; it is what makes `residuals_closed` a real number.

### 10.4 Anti-rot alarms, in a channel the tick already reads every run

`mr-selfcheck` (whose output the tick greps at `mr-native-tick.sh:203`) gains:

- `SELFCHECK-FAIL residual-unpromoted` — a residual `status=unpromoted` older than **T1 (3d)**: the
  promote step itself stalled.
- `SELFCHECK-FAIL residual-stale` — any open residual older than **T2 (14d)**.
- `SELFCHECK-FAIL residual-graveyard` — `emitted > 0 && closed == 0` over a trailing **28 days**.
  This is the direct falsification test for "the sink is a graveyard" (ADR-0010 pattern), and the
  converse of lp-registry's own pre-registered `residuals_emitted` metric.

**The constants live once**, in `mr-gates`, and `mr-selfcheck` reads them via
`mr-gates residuals policy --json` rather than re-declaring them — structurally preventing the
two-literals-in-two-files drift that is lp-11b's entire defect.

### 10.5 Escape hatches that cannot be abused

- `wontfix` requires a reason, is recorded, and is counted.
- **A HIGH/CRITICAL-severity residual cannot be `wontfix`ed by the supervisor** — it requires
  `mr-ask-drew`. This is the existing BLOCKER discipline (reversible ⇒ default and proceed;
  irreversible/security ⇒ ask) applied to disposition.
- **`defer_count >= 2` ⇒ `mr-ask-drew` is NOT built** (deferred to `lp-gates-arm`). The field is
  written as a literal `1` and read by nothing. Recorded here as unbuilt rather than described as
  shipped — describing an unbuilt mechanism is the exact failure this slice exists to end.
- **>50% of a slice's seeded `E*` gates DEFERred ⇒ FLAGGED** (§5.9), so "defer everything" is not a
  quiet exit.

### 10.6 Bounded failure modes (stated, so none of them is silent)

| scenario | what happens | bounded by |
|---|---|---|
| Ticks keep choosing other work | Residual ages past T1 → `queue-add` → next tick takes the fast path | ≤ 4 other queue entries, all draining |
| Promote itself stalls | `residual-unpromoted` FAIL after 3d | selfcheck, read every tick |
| Promoted slice defers the same criterion again | `defer_count=2` → operator issue | one issue, not a loop |
| Budget SOFT-PAUSE blocks all launches | Residual ages; `residual-stale` fires at 14d | correctly attributed to budget, not rot |
| Supervisor `wontfix`es everything to keep launching | Reasons recorded and counted; HIGH/CRITICAL needs the operator | visible rate, operator-gated tail |
| The whole mechanism goes inert | `residual-graveyard` at 28d | the falsification metric |

### 10.7 Deferred to slice 2 (needs measurement first, per R13)

A **WIP cordon** — a hard cap on open residuals that blocks new IMPLEMENT launches until the backlog
drains (precedent: `queue[]`'s cap of 5, "so a stuck consumer fails loudly instead of regrowing
silently for months"). Slice 1 ships the **counter and the alarm**; arming a launch-blocking cordon
without a measured distribution is exactly what R13 forbids, and `lp-13` is blocked on the same
grounds for the cost cordon. Merges and RECONCILE would remain exempt so in-flight work always lands.

---

## 11. Spikes — before any code

**Spike 0.** Does a project-worktree cwd inherit `$HARNESS/.claude`'s Stop hook via the ancestor
walk? v1 asserted "not inherited"; `mr-launch.sh:18` asserts the opposite for agents/skills. Neither
is proven, and the shim, double-fire and counter arithmetic all depend on the answer. Probe: register
a Stop hook in a fake harness-root `.claude`, run `claude -p` from a nested fake-project dir.

**Spike 1.** Prove `MR_SLICE` prefix-scoping does **not** reach `mr-native-tick.sh`'s child. Assert
the fix; do not assume it.

## 12. Build order

(1) `mr-gates` core — format, `Seed:`, `init`, `status`, `--selftest`, hardcoded `MEM`.
(2) Lint + runner allowlist (§5.2) and `check`, with a fixture for each proven evasion.
(3) **`mr-residuals.jsonl` + `promote` + the drain (§10) + the supervisor action** — this is the
piece that moves the measured number; if it slips, the slice has not shipped its thesis.
(4) `verify` with guard-bash routing, per-gate timeout, stated global budget.
(5) `mr-spawn` wiring below the `--dry` exit.
(6) Advisory `mr-audit` block + the floor/battery/golden move.
(7) Observe-only `gates-stop.mjs` + `MR_SLICE` scoping + `env -u`.
(8) Brief, build-loop, selfcheck, spec sections, `.gitignore`, decisions-log.

---

## 13. One line, many doors — consolidating the queues

*(Operator question, 2026-08-22: should the drains and work queues be a single SSOT with explicit
rules about what enters at the front vs the back?)*

**Yes for ORDERING. No for INTAKE.**

**CORRECTED 2026-08-23 (operator decision).** v2 of this section said `mr-feedback`'s 189 rows with
0 terminal proved the two intake ledgers were "a genuine duplicate pair" that `lp-15` should
resolve by retirement. Re-measured properly — the ledger is event-sourced, so 189 rows fold to
**91 items: 79 DISPOSED, every one carrying an action and a target, and 76 of 79 targets resolving
to a real spec file or `### <slice>` heading.** The triage worked. What never happened is the
TRANSITION to a terminal state when the target merged. So the diagnosis "duplicate ledger" was
wrong; the right one is **"two ledgers, no drain between them and the work queue"** — the same
RF-3 shape as everything else in this plan. Two typed intake records (a feedback item carries
`kind`/`confidence`/`weight`/`episode`/an operator quote; a residual carries
`gate_id`/`source_slice`/`defer_count`) are the right shape and flattening them would lose fields.
**Two typed doors, one drain, one line.** `lp-15` is rewritten from retirement to repair.

### 13.1 What actually exists, sorted by KIND (the fragmentation is smaller than it looks)

| kind | artifact | role |
|---|---|---|
| **Definition** | `specs/**/M*.spec.md` `### <slice>` sections | SSOT for *what a work item is* (`touches:`, `after:`, `blocked:`, EARS) |
| **Ordering** | `PLAN.md §9` + `blocked:`/`after:` + `mr-disjoint`; `mr-ready` (lp-08, unbuilt) | SSOT for *what is next* |
| **Ordering cache** | `queue[]` in `mr-state.json`, cap 5 | a memoised fast path over the above — explicitly "never authority" |
| **Live state** | `inflight[]`, `awaiting_merge[]`, `parked[]`, master CI | observed each tick, never queued |
| **Intake** | `mr-feedback` (91 items, 79 disposed with resolvable targets, 0 transitioned), `mr-residuals.jsonl` (new), playtest reports, decision issues | things *discovered* that are not yet work items |

**None of these is a duplicate.** `queue[]` is a derived cache, not a backlog — merging it with an
intake ledger would fuse a source with a projection. And the two intake ledgers are typed records
for different origins (see the correction above); what they lacked was a shared drain, which is
what this slice builds and what `lp-15` extends to the feedback half.

### 13.2 The invariant that removes the fragmentation

> **Nothing is launchable until it is a spec section.**

Intake channels do not feed the launcher; they **drain into the spec corpus**, and then a single
derivation orders everything. This is why §10.1 promotes a residual into a real `### <id>` heading
instead of making it a second class of launchable item.

This is a deliberate **divergence from `lp-registry` as specced**, which has `mr-ready` read residual
rows directly "as ready-set input". That would create a second kind of work item needing its own
`touches:`/EARS handling in `mr-spawn`, `mr-gates init`, `mr-disjoint` and `mr-audit` — precisely the
fragmentation this section exists to prevent. Recorded as a spec amendment, not done silently.

### 13.3 The single line, and the rules for where something enters it

Expressed as an **extension of `lp-08`'s mode ladder**, not a competing scheme:

- **Mode 0 RECONCILE** — live-detected, never queued, always wins: master CI red, awaiting-merge
  PRs, parked slices to resume, stranded events. *(Finish before you start.)*
- **Mode 1 IMPLEMENT** — consume exactly ONE item from the single ordered line:
  1. residual past **T2 (14d)** — a breached deadline;
  2. residual past **T1 (3d)** — aged debt;
  3. next unblocked slice in `PLAN §9` order — normal forward progress;
  4. within any tier, oldest `disclosed_at` first.
- **Mode 2 SPEC** — intake convergence: promote unpromoted residuals into spec sections, process
  playtest/feedback bullets. This is the only door from intake into the corpus.
- **Modes 3-4 MILESTONE / HOLD** — unchanged.

**Why aging rather than a fixed rank.** A fixed "debt first" starves features; a fixed "features
first" starves debt, which is today's bug. Aging is self-balancing: debt sits *behind* plan work
until T1, then preempts, and preempting clears it so normal order resumes. With 0-2 residuals per
slice the steady state is roughly alternating debt and feature work — and the loop already spends
49.5% on debt, just 13 days late and via the most expensive detector available.

**`queue[]` is the materialisation of that line** — the drain uses the existing
`mr-record queue-add`, adding **no new queue**. Bounded failure mode: `queue[]` is capped at 5, so a
residual aging out while the queue is full waits; `residual-stale` fires at T2 and makes that visible.

### 13.4 What this slice does about it

- **Route the drain through `queue-add`** — no new queue, no new priority path. *(Done in §10.2.)*
- **`lp-15` is rewritten from retirement to repair** (operator decision 2026-08-23). The
  field-mapping table drafted for a migration is withdrawn: `mr-feedback` keeps its ledger,
  doctrine and state machine, and gains the same drain, the same gate-proved terminal transition
  and the same aggregated aging alarms this slice built for residuals. Reuse, do not duplicate.
- **Write the ladder in §13.3 down once**, in the supervisor doctrine, and reference it from the
  `lp-08` and `lp-registry` spec entries so the unbuilt SSOT inherits it instead of inventing a
  second one.
- **NOT built here:** `mr-ready` itself (lp-08). It is a specced slice with its own three parsing
  constraints and a frozen-corpus fixture requirement; building it inside this slice would collide
  with a planned slice and blow the scope the review just cut.

### 13.5 Left alone deliberately

**Decision issues** (`mr-ask-drew`, `.blocked-on-human`, `mr-decision-watch`) are not backlog —
they are *blocks* with their own lifecycle and wake conditions. Folding them into the work line
would conflate "cannot proceed" with "not yet started", which is the conflation `lp-08` explicitly
calls out as the zero-byte kill switch's mistake.
