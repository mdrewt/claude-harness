# lp-02 — Ledger columns with a slice-size denominator (PLAN)

Branch `feat/lp-02-ledger-slice-size` · worktree `.claude/worktrees/lp-02` · repo `mdrewt/claude-harness`.
Spec: `specs/monster-realm-v2/M-loop-infrastructure.spec.md` § `lp-02` (lines 199-223).

## EARS criteria (verbatim)

- **E1** WHEN a slice row is closed, it SHALL carry `files_changed`, `prod_lines_added`,
  `prod_lines_deleted`, `test_lines_added`, `ears_criteria_count` and `skills_invoked`.
- **E2** Quality columns SHALL be written by the writer that closes the slice, never by a later
  reconciliation.
- **E3** `master_ci_after` SHALL take one of a closed vocabulary.
- **E4** One committed query script SHALL read all new columns and print a variance summary.
- **T**  Proof-of-teeth: the query script REDs on a synthetic ledger where a new column is
  all-identical or all-null. *"Non-null on 5 rows" is not a gate* (ADR-0010).

## Ground truth (verified, not assumed)

- Ledger `memory/projects/monster-realm-usage-ledger.jsonl` is **gitignored** (root `.gitignore:37`),
  append-only (ADR-0011). Measured now: **749 rows / 259 distinct keys / 157 keys appearing once**.
- `master_ci_after`: empty on **498/749**; populated values span `pending`(21) `success`(21)
  `GREEN`(11) `in_progress`(8) `green`(5) `n/a (no merge this tick)`(4) plus sha-suffixed variants
  (`GREEN@15bd08b`, `GREEN 62ee457`, `GREEN (3101508)`, `success (348326ba)`), `RED`(2), `pass`(2),
  `n/a`(2) and one 300-char prose blob.
- `remote_red_fix_cycles` sums 27 over all rows; last nonzero **2026-07-20** (pt-c2b) — dead.
- **Row lifecycle of a slice**: `LAUNCHED` (supervisor LLM, by hand) -> `FINISHED(EXIT=..)` /
  `CRASHED(..)` (`mr-native-tick.sh:82` / `:119`, run_id `wrapper-reconcile`) -> `MERGED` / `PARKED`
  (supervisor LLM decision run). `SUPERVISOR` rows are wrapper bookkeeping, not slice rows.
- **`mr-spawn` writes NO ledger row** (verified: zero `mr-record` references in its 249 lines).
- **The worktree is deleted BEFORE the `MERGED` row is written** — `mr-supervisor-prompt-native.md:126`
  puts "Remove merged worktrees/branches" and `gh pr merge --delete-branch` in the bullet *above*
  ":127 Ledger line (validated) -> handoff entry". This single fact decides the architecture.

## Design

### D1 — derive at first close, replay from a sidecar (the operative reading of E2)

```
mr-record (closing row) --> mr-slice-quality derive <slice> --> /tmp/mr_quality_<slice>.json (sidecar)
                                                            --> the six columns onto the row
```

- The **first** closing row (normally `FINISHED`, written minutes after the run ends while the
  worktree and pass log are still live) measures and persists the sidecar.
- **Later** closing rows (`MERGED`, `PARKED`) replay the sidecar. Same numbers, no re-measurement,
  and no dependency on a worktree that no longer exists.

**Why not in `mr-native-tick.sh`:** the tick only writes `FINISHED`/`CRASHED`. `MERGED` is written by
the supervisor LLM, whose prompt is outside this slice's `touches:`. Deriving inside `mr-record`
means every writer gets the columns without knowing they exist.

**Why not inline in `mr-record`:** `mr-record` is a bash wrapper around one `python3` heredoc with no
`--selftest` and no way to get one; its only coverage is `mr-selfcheck`'s AST parse. ~130 lines of
git/subprocess/log parsing there would ship permanently untested. `mr-record:64-69` already
establishes the delegation pattern (`sys.executable`, `timeout=`, try/except, degrade loudly) for
`mr-cost-sum`; this copies it.

**Counter-argument, answered in the tool header:** "reconciliation" is a term of art here —
`mr-native-tick.sh:49` is headed `# RECONCILE` and its rows carry `run_id="wrapper-reconcile"`. A
literal reader could call the `FINISHED` row the forbidden later reconciliation. Rebuttal: (a) what
E2 bans is a *backfill pass over historical rows*, which ADR-0011 already forbids; (b) the tick
reconcile is the **earliest mechanically-possible** writer; (c) the sidecar puts the columns on the
`MERGED` row too, so the ambiguity is moot in the data.

### D2 — closing-row predicate

Mirrors the existing classifier idiom at `mr-metrics:37-45` (`str(outcome).upper().startswith(...)`).

```
is_closing(slice_, outcome):
    if slice_ == "SUPERVISOR":     -> False   # wrapper bookkeeping; mr-record:35 already fences it
    h = str(outcome).strip().upper()
    if h.startswith("CORRECTION"): -> False   # accounting reversal; precedent mr-native-tick.sh:70
    return h.startswith(("MERGED", "FINISHED", "CRASHED", "PARKED"))
```

Verified against the real ledger tail. Two accepted historical mis-classifications, documented, that
can never recur (v2-era strings, never re-written): `merged M8.5e (PR #30) + launched M8.5f` and
`parked-progress (wrapper...)`.

**The six columns are emitted ONLY on closing rows** — omitted entirely elsewhere. Emitting nulls on
every `tick-ok` row would amplify the 259-key collapse this slice exists to fix, and it destroys the
reader's trivial row-selection rule ("the rows carrying the keys").

### D3 — `quality_source`, a 7th column (deliberate superset of E1)

`quality_source` in a closed set `{derived, sidecar, partial, unavailable}`. It is the only thing that
lets a reader distinguish a **measured 0** from an **unmeasurable** one — which is the whole point of
the proof-of-teeth clause. Per-source reasons go into the existing `notes` field as
`QUALITY-NULL(diff): worktree-missing`, mirroring `mr-record:96`'s `COST-UNKNOWN (...)` precedent.
Flagged in the PR as a spec-amendment request (precedent: `mr-telemetry-selftest:44-48` for lp-01).

### D4 — `master_ci_after` closed vocabulary: **normalize, never reject**

Vocabulary: `green | red | pending | not-applicable | unknown`.
Normalizer: strip from the first whitespace/`@`/`(`/`[`, lowercase, map. Unmappable -> `unknown`,
raw string preserved in `notes`, warning on stdout, **rc 0**.

`die()` on an unmappable `--ci` was considered and **rejected**: `mr-record`'s contract is that a row
is never lost (the ledger is "the durable standdown record", `mr-supervisor-prompt-native.md:150`).
Dying would trade a data-*quality* problem for a data-*loss* problem the first time the supervisor
LLM types `GREEN (abc1234)`.

`mr-native-tick.sh` passes `--ci not-applicable` on the `FINISHED` and `CRASHED` writes: those are
pre-merge rows, so "master CI after this slice" is not yet a defined property. That alone converts
most of the measured 65.8% empty mass into a truthful closed-vocabulary value going forward.

### D5 — line classification (first match wins, on the repo-relative POSIX path)

1. **TEST** — any path segment in `{tests, test, __tests__, e2e, evals, fixtures}`; or basename
   matching `[._-](test|spec|eval)\.<ext>$`; or `^test_.*\.py$`; or `*_tests.rs`; or basename
   `mr-selfcheck` or `^mr-.*selftest$`.
2. **OTHER** — extension in `{.md,.mdx,.txt,.rst}`; or path under `docs/`; or basename in
   `{Cargo.lock, package-lock.json, pnpm-lock.yaml}`; or path containing `/bindings/`.
3. **PROD** — otherwise.

`files_changed` counts every record (incl. binary and OTHER). `prod_lines_added/deleted` sum PROD
only; `test_lines_added` sums TEST only. Binary numstat records (`-\t-\tpath`) count toward
`files_changed` and contribute 0 lines — never `int('-')`. Renames count once, classified on the
destination.

**Stated measurement bias, not to be fudged later:** harness slices under-report `test_lines_added`,
because harness tests live inside `mr-selfcheck` and each tool's `--selftest` rather than in test
files. Clause 1's `mr-selfcheck`/`*selftest` carve-out recovers most of it; the residual is documented.

### D6 — degeneracy predicate and floors (E4 + T)

Measured cadence (last ~3-4 weeks of the ledger): ~17-22 closing rows and ~8-12 distinct slices per
week. Floors: **`N_MIN_ROWS = 20` and `N_MIN_SLICES = 8`**, both required — 4x the "5 rows" ADR-0010
calls not-a-gate, and 20 rows drawn from 3 slices is not a sample.

Per column, over the rows carrying that key:

```
N < N_MIN_ROWS or distinct_slices < N_MIN_SLICES -> exit 2  INSUFFICIENT-DATA  (NOT green)
null_rate == 1.0                                 -> exit 1  DEGENERATE(all-null)
distinct(non-null values) <= 1                   -> exit 1  DEGENERATE(all-identical)
null_rate >= 0.5                                 -> exit 1  DEGENERATE(half-blind)
else                                             -> exit 0
```

The `null_rate >= 0.5` clause is the direct descendant of the measured defect (`master_ci_after`
empty on 65.8%). Without it that column would have passed as "has variance".

Scope: the degeneracy predicate applies to the **six new columns only**. `master_ci_after` gets a
**vocabulary-conformance** check instead (post-cutover values in the closed set; report the `unknown`
rate and the raw strings behind each). Reason: there is no remote CI on the harness repo, so for
harness slices `master_ci_after` is permanently `not-applicable` and `distinct <= 1` would be a
guaranteed false RED.

**No `--min-rows` override and no `MR_*_MEM` override.** An override is a surface for greening the
gate vacuously — `mr-selfcheck:4-10` argues exactly this. The selftest generates >= N_MIN synthetic
rows programmatically.

### D7 — gate wiring is fixtures-only, on purpose

`mr-selfcheck` runs `mr-slice-quality --selftest`, **not** a run against the real ledger. Today zero
rows carry the new columns, and `"name":"Skill"` occurs in only **4 pass logs corpus-wide** — so a
real-ledger gate would RED on day one and be disabled within the week. When `skills_invoked` does
RED on real data later, that exit 1 is a **true finding** about the loop, not a broken gate. Said in
the wiring comment so nobody "fixes" it by deleting it.

## Anti-patterns (named, do not do these)

- **A1** Backfilling / rewriting historical rows. ADR-0011: the ledger is append-only.
- **A2** Silent 0. `git -C <missing> ... | wc -l` fake-reads `0`
  (`mr-supervisor-prompt-native.md:152`); and do **not** copy `mr-record:103`'s
  `int(a.get("cycles") or 0)` idiom for the new columns — that idiom is exactly what makes a missing
  value indistinguishable from a measured zero.
- **A3** `die()` on unmappable `--ci` (see D4).
- **A4** Nulls on every row (see D2).
- **A5** Vacuity-greening overrides (`--min-rows`, `MR_SLICE_QUALITY_MEM`). One exception,
  precedent-backed: `MR_QUALITY_DIR` for the sidecar path, mirroring `mr-record:14-15` — a *writer*
  override cannot green a gate.
- **A6** Per-column `--files_changed`-style flags. A fabrication surface; this workspace has already
  shipped fabricated counters once (lp-01). Derivation-only makes the denominator unfakeable.
- **A7** A second new script. `touches:` allows exactly one.
- **A8** Touching `mr-supervisor-prompt-native.md`, `mr-metrics`, `mr-situation`, `mr-spawn` —
  hidden-dependency STOP.
- **A9** Skipping a selftest when `git` or a log is absent. Skip = false green; fail loudly
  (`mr-selfcheck:93-95`, `:148-150` set the precedent twice).
- **A10** Milestone ids baked into key names (`park_counter_m85a`) — the collapse pattern measured.
- **A11** Hand-editing `CHANGELOG.md` (git-cliff generated).
- **A12** Authoring an ADR — **no number was reserved by the supervisor**. Whys go in the tool header
  and the PR body; the PR requests a number for D1 and D4.

## Right-sizing

ONE coherent mergeable slice. `mr-launch.sh` gets **ZERO edits** — it writes `.done` at `:164`, the
worktree survives to reconcile, and nothing there needs to change. `touches:` is an upper bound, not
an obligation.

**Parked, with disposition markers:**
1. `parked -> lp-02b` — teaching `mr-metrics` / `mr-situation` the closed CI vocabulary at read time
   (outside `touches:` anyway).
2. `parked -> lp-02b` — promoting `mr-slice-quality variance` from a fixture selftest to a
   real-ledger gate, once N_MIN is reached. Impossible today: zero rows carry the columns.
3. `parked -> wontfix` — retiring `remote_red_fix_cycles`. Marked DEPRECATED in `mr-record`'s usage
   header; the flag stays accepted forever (append-only ledger; never break a past reader).

## Tasks (build order — tester first)

- **T1** TESTER (RED): `mr-slice-quality --selftest` fixture battery F1-F12 against a stub.
- **T2** TESTER (RED): `mr-record` behavioural fixtures F13-F18 (subprocess, `MR_RECORD_LEDGER=<tmp>`).
- **T3** IMPL: `memory/projects/mr-slice-quality` (`derive` + `variance` + `--selftest`).
- **T4** IMPL: `memory/projects/mr-record` (`--ci` normalizer, closing-row hook, `--cycles` DEPRECATED).
- **T5** IMPL: `memory/projects/mr-native-tick.sh` (`--ci not-applicable` on `:82` and `:119`).
- **T6** GATE WIRING (`touches-delta:`): `memory/projects/mr-selfcheck` + WHY comment.
- **T7** DOCS: `ARCHITECTURE.md` minimal bullet; PR body carries the E2 reading, the `quality_source`
  amendment request, the three parks and the `test_lines_added` bias. No ADR.
- **T8** GATE: `mr-selfcheck` -> `SELFCHECK-OK`; `mr-slice-quality --selftest`; harness `just ci`
  (cheap, not the gate). Dogfood against this slice's own live worktree with
  `MR_RECORD_LEDGER=/tmp/scratch.jsonl`.

## Risks

| id | sev | risk | mitigation |
|----|-----|------|------------|
| R1 | HIGH | `mr-record` is cron-critical; a crash there loses accounting for every slice | all derivation in try/except; helper via `sys.executable` + `timeout=20`; row always written; F16 pins it |
| R2 | HIGH | `git -C <missing>` fake-reads 0 -> silent 0 instead of null | `isdir` + explicit returncode checks; F10 tooth |
| R3 | MED | E2's "never by a later reconciliation" disputed at review | header + PR argument; sidecar puts values on the `MERGED` row too |
| R4 | MED | variance legitimately REDs on `skills_invoked` once real data lands | fixtures-only gate; documented as a true finding |
| R5 | MED | test-cheat surface (lp-01 shipped fabricated counters) | no per-column flags; F9 asserts against a real `git init` repo; F6 vacuity tooth |
| R6 | MED | `mr-selfcheck`'s polyglot-guard + heredoc-pairing scanners fail on a byte | line 2 copied verbatim from `mr-telemetry-selftest:2`; run `mr-selfcheck` early, not only at T8 |
| R7 | LOW | `/tmp` sidecar lost on reboot -> `MERGED` nulls | accepted; the `FINISHED` row is the durable carrier |

---

# REVISIONS after the plan-review gauntlet (reviewer + red-team + /simplify, all three read-only, parallel)

The three lenses converged. The plan above is superseded on the points below; where a section is
marked SUPERSEDED, the revision here is authoritative.

## R-A — **D1 SUPERSEDED: the `/tmp` sidecar is CUT.** Replay from the LEDGER instead.

All three lenses attacked it independently: `/tmp` is swept by the supervisor (`ledger:709` records a
`mr_pass_*.done` sweep — one glob away), 86 of 220 slices carry >=2 closing rows and slice ids are
**reused** across park->relaunch, so a name-keyed sidecar replays run-1's numbers stamped
`quality_source=sidecar` — the field that is supposed to certify provenance. And the corpus already
fixed this exact fragility once (`mr-native-tick.sh:84-92`, "P3 durability ... survive /tmp loss").

Replacement:
- The **first** closing row that can measure derives from live ground truth and writes the columns.
- A **later** closing row for the same slice **replays from the ledger** — reusing the existing
  last-300-lines scan idiom already in `mr-record:43-54` (`wrapper_cost_exists`). No second storage
  medium, no new path convention, no reboot story, no `MR_QUALITY_DIR` (**A5's exception is CUT**),
  **R7 is CUT**.
- `derive` becomes a **side-effect-free stdout helper** — exactly `mr-cost-sum`'s shape, which
  `mr-record:64-69` already knows how to call.

Ledger-replay (not "emit only once") is retained because **E1 is literal**: *every* closed slice row
shall carry the columns. The statistical harm /simplify identified (a 4-row slice voting four times)
is removed by R-F instead.

## R-B — **D4 SUPERSEDED: the `--ci` normalizer as specified maps a real RED to `green`.**

Red-team implemented D4's head-token rule verbatim and ran it over all 750 rows: **21 real rows
mismap**, headed by
`'GREEN (CI wf); Nightly RED (mutation job, run 29146681177) — queued follow-up'` -> `green`, plus 20
rows of `GREEN @ <sha> (CI success); chore <sha> CI in_progress` -> `green`. That is strictly worse
than `unknown`: compound verdicts are *how the supervisor writes reds*.

Replacement — precedence scan over the **whole** string, never the head token:
1. any red token anywhere (`red`, `fail`, `failure`, `broken`) -> **`red`**;
2. else >=2 distinct verdict families present -> **`unknown`** (never collapse a compound verdict);
3. else map the single family: `green|success|pass|ok` -> `green`; `pending|in_progress|queued|rerun*`
   -> `pending`; `n/a|not-applicable|no-remote-ci*` -> `not-applicable`;
4. else -> `unknown`, raw string preserved in `notes` **truncated to 120 chars** (M7: `--ci` is
   LLM-supplied and unbounded, and every `mr-record` call re-reads the ledger tail).

Vocabulary becomes six values: `green | red | pending | not-applicable | not-recorded | unknown`.
- **`not-recorded`** is new and load-bearing: reviewer B3 found the newest `MERGED` row
  (`ledger:743`, lp-01) carries `""` because the supervisor simply omitted `--ci` — so the measured
  65.8%-empty defect survived the original D4 untouched on exactly the row class the spec cares
  about. On a **closing** row an absent/empty `--ci` now becomes `not-recorded`; it stays `""` on
  non-closing rows (no churn on the ~400 `tick-ok` rows). This keeps "nobody claimed anything"
  distinguishable from "someone claimed something unparseable" (`unknown`).
- Mapper seeded from the real corpus strings, incl. `no-remote-ci-local-gate-green` (`ledger:736`)
  and `rerun-triggered` (`ledger:728`), both of which the original rule dropped to `unknown`.
- **E3 gets teeth** (reviewer B3: a report with no threshold is not a gate). `variance` REDs when
  `(unknown + not-recorded)` share of post-cutover closing rows **> 0.10**. Normalize-never-reject
  (A3) is retained — the fix is a downstream threshold, not a `die()`.

## R-C — **`git` walks UP out of a deleted worktree. R2's stated mitigation does not catch it.**

Verified live: `.claude/worktrees/<slice>` is *inside* the harness repo, so after
`git worktree remove` a `git -C .claude/worktrees ... diff --numstat` returns **rc 0 and empty**, and
both `isdir` and the returncode check pass -> a confident, fabricated
`files_changed=0 ... quality_source=derived`. That is A2 in its purest form, and it is the **normal**
post-merge state, not an edge case.

Replacement — **identity assertion, not existence**:
- `git -C p rev-parse --show-toplevel` MUST equal the expected worktree path, **and**
- `git -C p rev-parse --abbrev-ref HEAD` MUST equal the slice branch from
  `.harness-runner.<slice>.lock`.
Any mismatch -> all six columns `null`, `quality_source=unavailable`.

## R-D — **The tick can be wedged by the new subprocess. Bound it at three levels.**

`mr-native-tick.sh` bumps `.native-supervisor-tick-alive` (`:21`) and `.native-supervisor-heartbeat`
(`:25`) **before** the reconcile (`:49`), and takes its flock 184 lines **later** (`:233`). A stall in
the reconcile therefore leaves both heartbeats fresh — so the DC/Cowork fallback stands down — while
the tick never reaches the kill switch, the selfcheck or the decision run, and the next hourly cron
tick enters reconcile too. That is byte-for-byte the "~2 days undetected" failure in
`mr-native-supervisor-README.md:39`.

- `mr-native-tick.sh:82` and `:119` get `timeout 60` (precedent: `:170` already does this for the
  handoff write). **This is the only edit to `mr-native-tick.sh` beyond `--ci not-applicable`.**
- The helper is launched with `start_new_session=True` and killed by **process group** on
  `TimeoutExpired`, so an orphaned `git` grandchild cannot accumulate hourly.
- `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`, `--no-optional-locks`, list-argv (never
  `shell=True`), read-only subcommands only, never `fetch`.
- **The row is assembled and appended independently of derivation**: derivation runs inside a
  `try/except Exception` that returns `{}`, so no derivation defect can become a row-loss defect.

## R-E — Column derivation contracts (the plan above specified only 3 of the 6)

- **Worktree/base resolution** comes from `.harness-runner.<slice>.lock` (`repo`, `base_branch`) —
  the lp-00 routing SSOT — **never** `git worktree list | grep` (`mr-launch.sh:44`'s unanchored match
  is the bug `mr-launch.sh:72-74` had to fix: `lp-02` would match an `lp-02b` worktree). The harness
  base is `main`, monster-realm's is `master`; a hardcoded `main` would make every project slice
  `unavailable` and leave `N_MIN_SLICES` satisfied by a biased subpopulation.
- **Dirty worktree**: `git status --porcelain` non-empty -> the four diff columns are `null` and
  `quality_source=partial`. `CRASHED`/`PARKED` rows are *exactly* the case with uncommitted WIP, and
  reporting `files_changed=0` there feeds a fabricated zero into the denominator. A clean worktree at
  `HEAD == merge-base` is a genuine `0`, `derived`.
- **`skills_invoked`**: parse the stream-json properly — `type=="assistant"` -> content blocks with
  `type=="tool_use"` and `name=="Skill"`, **deduped by block `id`** (streaming repeats blocks).
  Substring counting is a fabrication: the word `Skill` appears **69x** in `mr_pass_11r-a.log` from
  the init event's tool allowlist and from monster-realm's own `SkillRow` Rust type, for a slice that
  invoked zero. Absent/unparseable log -> `null`, never `0`. The column counts `Skill` **tool_use
  blocks only** — a `/simplify` mentioned in prose is not an invocation (measured: 53 prose
  occurrences, 0 tool_use blocks in lp-01's log). Stated in the tool header; the EARS name is kept
  because E1 names it.
- **`ears_criteria_count`**: from the **spec section only**, located by an anchored
  `^### <slice>\b` heading in `specs/monster-realm-v2/*.spec.md` (both repos' specs live in the
  harness), counting `\bSHALL\b` to the next `^### `. **Never** fall back to the brief: the brief is a
  14 KB single-line blob that embeds spec prose *and* EARS-shaped boilerplate, so a `grep -c SHALL`
  over it returns a plausible integer for the wrong thing. Heading not found -> `null`.
  (Measured: the `lp-02` section yields 4.)
- **Slice-id sanitisation**: `re.fullmatch(r"[A-Za-z0-9._-]{1,64}", slice_)` before ANY path use.
  `mr-record:34` validates only non-emptiness, and **64 real ledger rows** carry ids that fail it,
  including one containing a path separator. Failure -> all `null`, `quality_source=unavailable`,
  never `die()`.

## R-F — D6 SUPERSEDED: fold per slice; one floor; four clauses

- **Fold to one observation per slice** before computing anything (prefer `quality_source=derived`).
  This is what makes ledger-replay statistically harmless, and it is what the spec's phrase
  *"slice-size denominator"* actually asks for.
- `N_MIN_ROWS` is therefore redundant (`N == distinct_slices`) and is **CUT**. One floor:
  **`N_MIN_SLICES = 8`** (~1 week of measured cadence; 4x the "5 rows" ADR-0010 calls not-a-gate).
  `exit 2 INSUFFICIENT-DATA` is retained and is **not** green — conflating "no data yet" with
  "collapsed schema" is the dishonesty this slice exists to remove.
- Per column, over the folded observations:
  ```
  n_slices < 8            -> exit 2  INSUFFICIENT-DATA
  null_rate == 1.0        -> exit 1  DEGENERATE(all-null)
  distinct(non-null) <= 1 -> exit 1  DEGENERATE(all-identical)
  null_rate    >= 0.5     -> exit 1  DEGENERATE(half-blind)        # descends from master_ci_after 65.8%
  zero_rate    >= 0.5     -> exit 1  DEGENERATE(silent-zero-suspect)  # descends from A2
  ```
  The `zero_rate` clause is the answer to the point that a systematically-zero column passes every
  null-based test because `0` is non-null. It is expected to fire on `skills_invoked` once real data
  lands — a **true finding**, and the reason the wired gate is fixtures-only (D7 stands).
- `master_ci_after` keeps its exclusion from the degeneracy predicate (the harness has no remote CI,
  so `distinct <= 1` would be a guaranteed false RED) but gains the hard `>0.10` threshold in R-B.
- `variance` prints the `quality_source` distribution and the `unavailable` rate as **first-class
  lines**, because the missingness is non-random: `mr-native-tick.sh:57-78` skips the `FINISHED`
  write whenever a cost-bearing row already exists within 12h, i.e. whenever the slice agent
  self-recorded — so it correlates with *well-behaved* slices.

## R-G — `quality_source` KEPT (values changed), prose mirror trimmed

/simplify argued the six columns are already trivalent (key-absent / `null` / int) so the 7th column
is redundant. Kept anyway, with `{derived, replayed, partial, unavailable}`: `partial` (R-E dirty
tree) and `replayed` are **not** derivable from nullability, and `partial` reading as authoritative is
exactly the failure reviewer flagged for `CRASHED`-first slices. The duplicated per-source
`QUALITY-NULL(...)` prose is trimmed to **one** compact `QUALITY(<source>): <reason>` note emitted
only when `source != derived` — the column carries the *class*, the note carries the *cause*; that is
not a dual write.

## R-H — **Gate vacuity was the single largest hole. `mr-record` behavioural fixtures move INTO `mr-selfcheck`.**

Red-team H5: harness `just ci` never runs over `memory/projects/`; `mr-selfcheck` always exits 0 and
the tick greps it once a day; T6 wired only `mr-slice-quality --selftest`; and T1 specified fixtures
"against a stub". Net: `mr-record` could emit no columns at all and every gate stays green forever.
T2's fixtures also had **no legal home** (A7 forbids a second script; there is no sibling-test
analogue for an extensionless bash tool).

Fix: F13-F18 ship as a `python3 <<'PY...'` behavioural block **inside `mr-selfcheck`** (already
declared gate wiring / `touches-delta:`), in the established `PYENV` idiom — `git init` a temp repo
with a known diff, a fake lock, `MR_RECORD_LEDGER=<tmp>`, invoke the **real** `mr-record`, and assert
the exact six values on the appended row, **plus** the negative direction (worktree removed -> `null`,
not `0`).

**Helper resolution** (M5): `mr-record:6` hardcodes `MEM` to the **main checkout**, so a worktree copy
would call the main checkout's `mr-slice-quality` — which does not exist until merge, making the
dogfood observe clean degradation and read as a pass. `MEM`/`LEDGER` stay hardcoded (the ledger is a
singleton SSOT; making `MEM` self-locating would split it). Only the **helper path** becomes
self-locating: `MR_QUALITY_BIN` env wins, else `<dir of the mr-record being run>/mr-slice-quality`,
else the hardcoded `$MEM` copy. A writer-side override cannot green a gate (A5).

## R-I — Decisions taken on the reviews' remaining recommendations

- **B1 worktree-free `git log --numstat` fallback: REJECTED (YAGNI).** Measured: 1 of the last 59
  closing rows lacks a prior `FINISHED`. A subject-line-matching heuristic over squash commits is
  more fragile than the honest `null` it would replace. Instead the hole is made **visible**:
  `quality_source=unavailable` + the first-class `unavailable` rate in `variance` + the
  `null_rate >= 0.5` clause. Parked -> `lp-02b`.
- **M8 `mr-supervisor-prompt-native.md:72` (the canonical field list the supervisor LLM types
  `--ci` from) goes stale on merge.** It is outside `touches:` and the task does not *require* it —
  the normalizer works regardless of what the LLM types. Per the brief's intent boundary that makes
  it a **follow-up flag**, not an edit and not a STOP. Recorded in the handoff and the PR; parked ->
  `lp-02b`.
- **ADR:** no number was reserved, and picking one risks colliding with a concurrent sibling. So:
  **amend `docs/adr/0011`** (which already owns the ledger invariants — *"`cost_usd` may be negative.
  Any new ledger consumer must handle signed rows"*) with an lp-02 section, and request a standalone
  number in the PR body. Precedent: lp-09 amended `docs/adr/0002` and `0011` with no reservation.
  **A12 is amended accordingly: no NEW numbered ADR; an amendment to the topically-owning ADR is in
  scope.**
- **Minor adopted:** atomic-write concerns die with the sidecar; `notes` truncation (M7);
  `sys.executable` forces a python helper — pinned in the header and asserted in the selftest (L2);
  the citation `mr-supervisor-prompt-native.md:126` is really `:125` (m1); the "two historical
  mis-classifications" count is really ~40, all keyless and therefore invisible to the reader's
  row-selection rule (m4).

## R-J — Fixture list (replaces the unspecified "F1-F18")

Each line is one property with one named defect class it pins.

1. binary numstat `-\t-\tpath` -> counted in `files_changed`, 0 lines, never `int('-')`
2. rename record -> counted once, classified on the destination
3. classification table: TEST / OTHER (`docs/`, lockfile, `/bindings/`) / PROD + the
   `mr-selfcheck`/`*selftest` carve-out
4. **removed worktree -> all six `null` + `unavailable`, NOT `0`** (R-C; the A2 tooth)
5. dirty worktree -> `partial` + diff columns `null` (R-E)
6. clean worktree, `HEAD == merge-base` -> a genuine `0`, `derived`
7. `derive` against a real `git init` fixture repo, never a stub (the lp-01 fabricated-counter shape)
8. degeneracy: healthy -> 0; all-null -> 1; all-identical -> 1; half-null -> 1; all-zero -> 1;
   below-floor -> 2
9. **vacuity tooth:** blank each of the six columns in the healthy fixture in turn and assert each
   mutation REDs — an implementation that only ever checks `files_changed` must not pass
10. **`ci_normalizer_never_greens_a_red`**, seeded with the 21 real corpus strings: no output is
    `green` while the raw string contains a red token; a compound verdict maps to `red`/`unknown`
11. `--ci` mapping table: `GREEN@sha`, `GREEN (3101508)`, `success (348326ba)`,
    `n/a (no merge this tick)`, `no-remote-ci-local-gate-green`, `rerun-triggered`, `in_progress`,
    `pass`, `RED`; unmappable -> `unknown` + raw (truncated) in `notes` + **rc 0**
12. absent `--ci` on a closing row -> `not-recorded`; on a non-closing row -> `""`
13. `mr-record` **still writes its row** when the helper raises / times out / is missing (R1, the
    cron-critical property)
14. `mr-record` **omits all six keys** on a non-closing row (A4)
15. `CORRECTION*` and `SUPERVISOR` are not closing rows (D2)
16. `skills_invoked`: 3 real `Skill` tool_use blocks (one duplicated by streaming) -> `3`; a log full
    of the *word* `Skill` in prose/allowlists -> `0`; absent log -> `null`
17. `ears_criteria_count`: anchored spec heading -> 4 for `lp-02`; unknown slice -> `null`
18. slice id failing `[A-Za-z0-9._-]{1,64}` -> `unavailable`, no path touched, no `die()`
19. `variance` folds per slice (a 4-row slice votes once)

## R-K — Tasks (supersedes T1-T8)

- **T1** TESTER (RED): the R-J battery — items 1-12 and 16-19 in `mr-slice-quality --selftest`;
  items 13-15 (+4 negative direction) in the `mr-selfcheck` behavioural block.
- **T2** IMPL `memory/projects/mr-slice-quality` (`derive` stdout-only + `variance` + `--selftest`).
- **T3** IMPL `memory/projects/mr-record` (whole-string `--ci` normalizer; closing-row hook with
  ledger replay; row-append independent of derivation; `MR_QUALITY_BIN` self-locating helper
  resolution; `--cycles` marked DEPRECATED).
- **T4** IMPL `memory/projects/mr-native-tick.sh`: `--ci not-applicable` **and** `timeout 60` on
  `:82` / `:119`.
- **T5** GATE WIRING `memory/projects/mr-selfcheck` (`touches-delta:`): the `--selftest` line + the
  behavioural block + the WHY comment on fixtures-only.
- **T6** DOCS: `docs/adr/0011` amendment; minimal `ARCHITECTURE.md` bullet; PR body carries the E2
  reading, the `quality_source` amendment request, the parks and the `test_lines_added` bias.
- **T7** GATE: `mr-selfcheck` -> `SELFCHECK-OK`; `mr-slice-quality --selftest`; harness `just ci`
  (cheap, not the gate); dogfood on this slice's own live worktree with
  `MR_RECORD_LEDGER=/tmp/…scratch`.
