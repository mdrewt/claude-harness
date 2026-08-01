# 0011. Reconstruct per-invocation run cost from cumulative `total_cost_usd`, and repair four loop-instrumentation defects
- Status: accepted
- Date: 2026-08-01

## Context and problem statement

A 48h postmortem of the Monster Realm native supervisor loop (cron-driven, unattended,
~$800/48h of slice spend, merges to master without a human in the loop) was subjected to two
adversarial review passes. Of the postmortem's 7 original findings, **3 were refuted, 1 was
overstated, 2 were partially confirmed and 1 was confirmed** — and the adversarial passes
surfaced four defects the postmortem had missed, including the most consequential one.

### The central defect: `total_cost_usd` is cumulative, and three call sites summed it

`total_cost_usd` on a `"type":"result"` stream-json event reports the **cumulative** spend of
the emitting session's current accumulation run — not the cost of that invocation. Three
copy-pasted loops summed it across every result event in a pass log: `mr-record` (the
authoritative ledger writer), and twice in `mr-native-tick.sh` (the SPEND-ALERT threshold and
the tick's own cost row).

Ground truth from `/tmp/mr_pass_uxd2.log` — 8 result events, all sharing one `session_id`:

```
turns=91 5161s cum=$65.83    modelUsage fable 96.59 + opus 35.14 + sonnet 20.81 + haiku 0.15 = 152.69
turns=4    19s cum=$67.84    modelUsage IDENTICAL
turns=16 1658s cum=$124.32   modelUsage IDENTICAL
turns=53 1558s cum=$152.69   modelUsage IDENTICAL
turns=0     0s cum=$0.00     modelUsage empty
turns=6   109s cum=$11.05    modelUsage fable 11.05      <- counter restarts
turns=0     0s cum=$0.00
turns=4    23s cum=$1.92     modelUsage fable 1.92       <- counter restarts
naive sum $423.65            true $165.65
```

`turns=4 / 19s / $67.84` is impossible as a standalone cost, and the identical `modelUsage`
across events 1-4 proves they are one session's running total. `mr-cost-watch`'s wholly
independent token-priced calibration for the same run was **$155.21** — within 6.7% of
$165.65 and nowhere near $423.65.

Measured across all 11 surviving pass logs: uxd2 **2.56x**, uxd3 **1.40x**, the other nine
(single result event) exactly **1.00x**.

**Blast radius.** `mr-situation` computes the governor's `d7_usd` by summing `cost_usd`. The
live window read **$1083.28 against a $2783 weekly limit (38.9%)** when the true figure was
**$806.41 (29.0%)** — a 36.9% overstatement, so SOFT-PAUSE and HARD-STOP tripped ~$277 early
every week, discarding roughly one slice of headroom. Worse, every SPEND-ALERT adjudication
and "right-sizing lesson" was anchored on a fabricated number: the postmortem's own headline
("uxd2 cost $423.65, 2.8x the threshold, 40% of all slice spend") was an artifact of this bug,
and it very nearly drove a decision to arm cost-cap enforcement.

### Four instrumentation defects

1. **`WATCHER-DEAD` had a 100% false-positive rate.** The alarm inferred "live slice" from
   `/tmp/mr_pass_<s>.vars.json` with no sibling `.done`, but decision runs `rm` the `.done` at
   merge and **nothing anywhere deletes `vars.json`**. 199 fires in 48h across 8 slices, **0
   of which fell inside a live watch window**. At 08:00Z, 3 of the 5 lines in the `tail -5`
   the supervisor reads first each tick were this spam.
2. **`rate_limit_resets_at` was never written by anything.** Gate 2 — the loop's only
   *self-clearing* standdown — reads it; grep showed the field was read-only at two sites and
   written at none. The failure branch greps a log literally containing
   `"resetsAt":1785456000` and discards it into a 200-char text `reason`. So every rate-limit
   lockout fell through to the human-only `.native-supervisor-disabled` kill switch; on
   2026-07-27 that produced a 74h hand-cleared outage.
3. **`CEN2=$(grep -c ... || echo 0)` emitted `"0\n0"`.** `grep -c` prints `0` *and* exits 1 on
   no match, so `|| echo 0` appended a second line. Result: 39 orphan bare-`0` lines in
   `mr-native-tick.log` that break every `^2026-`-anchored log parse (this corrupted the
   postmortem's own first-pass numbers) and a wrong skill count on every CENSUS row.
4. **The event-retry marker was keyed per-source, not per-event.** `/tmp/mr_evretry_$SRC` with
   `$SRC` a fixed enum means two slices finishing inside the same 7-minute window both key on
   `done`, silently dropping the second one's retry.

## Considered alternatives

- **Option A — fix the sum in all three places.** Rejected: the triplication is *why* the bug
  survived, and leaving three copies guarantees the next drift.
- **Option B — extract one cost SSOT, split segments on value-decrease.** Rejected as
  insufficient: `mr-launch.sh:110-115` escalates the final attempt to `fable@xhigh` with a
  +$60 cap top-up, so "attempt N costs more than attempt N-1" is a *designed* outcome. Under
  value-decrease alone the earlier attempt's spend is swallowed — an **undercount**, the
  unsafe direction for a budget governor.
- **Option C (chosen) — one SSOT keyed on mr-launch's own ATTEMPT markers, with
  value-decrease as the fallback.**
- **Option D — sum `modelUsage.*.costUSD` instead.** Rejected, but narrowly: summing it across
  *all* result events overcounts badly, because uxd2 events 1-4 each report the session-*final*
  breakdown while `total_cost_usd` is still climbing. Summing only the **segment-final** event's
  `modelUsage` is in fact a viable second estimator — it agrees with the chosen algorithm to the
  cent on 10 of 11 pass logs. On the eleventh (uxd3 attempt 1) it reads *higher*
  (`modelUsage.claude-opus-5.costUSD` $25.5740 vs `total_cost_usd` max $20.0352), so the shipped
  algorithm may under-read that segment by ~27%. Chosen anyway: it needs one field rather than a
  nested map, it degrades on logs with no `modelUsage`, and the residual is ~$5 on a $47 run
  versus the $258 error being fixed. Worth revisiting as a cross-check if a third estimator is
  ever wanted.
- **Rewriting the inflated ledger rows.** Rejected — the ledger is append-only by doctrine.

## Decision outcome

**New `memory/projects/mr-cost-sum`** is the single implementation. A segment is one
accumulation run, valued at its max reading; total = sum of segment maxima. A segment closes
on either (1) an `ATTEMPT=` / `ESCALAT` / `COST-CAP-WRAP start` marker written by
`mr-launch.sh` — the authoritative invocation boundary — or (2) the value decreasing, the
fallback for logs without markers such as the supervisor's own tick logs.

Deliberately **not** used as boundary signals: `session_id` (`mr-launch.sh:124` resumes with
`--resume`, so all 8 uxd2 events across 3 separate `claude` invocations share one id — a
session-keyed split is dead code); `"subtype":"init"` (not 1:1 with invocations — uxd2 attempt
1 emits 4); `uuid` / `num_turns` / `duration_ms` (carry no boundary information).

Contract: `mr-cost-sum <log>` prints a 4dp total or `-`, always exits 0, and its output is
constrained to `/^([0-9]+\.[0-9]{4}|-)$/` so callers may safely interpolate it. Zero result
events → `-` (COST-UNKNOWN); events summing to zero → `0.0000`, so a genuine $0 run stays
distinguishable from an absent one.

All three call sites now delegate to it. `mr-record` invokes it via `sys.executable` rather
than the shebang, so exec-bit, `ENOEXEC` and asdf-shim breakage cannot take out a
cron-critical path; on any helper failure it falls back to the **naive sum** with a
`COST-FALLBACK-NAIVE` note — deliberately the safe direction, because an overcount trips
SOFT-PAUSE early whereas a `None` counts as $0 in `mr-situation` and would let the loop
overspend unseen.

**Historical correction.** The ledger is append-only, so the two inflated in-window rows are
corrected by **signed reversal rows** (`run_id: cost-correction`, `outcome:
CORRECTION(cumulative-double-count)`): uxd2 −$257.9958 and uxd3 −$18.8755. This establishes a
**new ledger invariant: `cost_usd` may be negative.** `mr-metrics` gained an unconditional
`CORRECTION` fold because its `MERGED` branch filters `>0` and would have silently kept the
inflated per-slice figure. uxd1 was **not** corrected — its in-window row already matches its
single-result log exactly; an earlier draft wrongly diffed it against an out-of-window
2026-07-27 row for a different run, which would have injected phantom credit into the live
governor window.

`mr-native-tick.sh`'s reconcile dedup gained a `CORRECTION` skip **before** the rows were
written: it keys "already recorded" on `slice + any truthy cost_usd` within 12h, so a reversal
row would otherwise have made any rerun of the same slice inside that window look
already-backfilled and silently dropped its real cost.

A fourth and fifth row form a **model-reclassification pair** on uxd2 (−$257.9958 at
`model=fable`, +$257.9958 at `model=n/a`). `mr-situation` accumulates `fable_d7_usd` only from
rows whose `model` contains "fable"; the primary reversal carried `model=n/a`, so `d7_usd` was
corrected while `fable_d7_usd` stayed inflated by the full $257.9958. The pair nets to zero on
`d7_usd` and moves the reversal into the fable bucket: **$640.52 → $382.52**. Neither leg may be
read in isolation.

**Two rules follow for any future correction**, and are the reason the reversals were *not*
backdated here: (1) a reversal must land in the **same weekly governor window** as the row it
reverses — the window is anchored by `.weekly-reset-anchor` and rolls 2026-08-07T00:00Z; a
reversal landing after a roll would subtract from a window that never contained the inflation,
which is the *unsafe* direction. These landed 2026-08-01, six days inside. (2) The reversal must
carry the **same `model`** as the row it reverses, or a paired reclassification, or the
per-model guards silently keep the old figure. Note the consequence of not backdating: any
`mr-metrics` query bounded *before* 2026-08-01T09:53Z still reports the pre-correction figures.
That is intentional double-entry behaviour — the audit trail of what was believed at the time is
preserved — but it means historical retro windows must be re-run with an end bound after the
correction to see true spend.

**The four instrumentation fixes.** `WATCHER-DEAD` is now keyed on a live per-slice lock
(written at `mr-spawn:108`, watcher spawned at `:112`, so lock-exists ⇒ watcher-was-started
holds), retaining the `.done` guard because `mr-cost-watch` exits the moment `.done` appears
while `mr-launch.sh:151` keeps the leader alive through `fire_event`. Deleting `vars.json`
was explicitly **rejected** — it is the sole durable carrier of `cap_override`, `items[]` and
`resume_block` for the cost-park resume path, and the delete would have run before the tick's
`flock`, racing a concurrent resume. A **new `ORPHAN-RUN` alarm** preserves the one class the
old predicate genuinely covered: `mr-spawn` launches at `:62` but only writes the lock at
`:97-109`, so a paid run can be live for 4-200s (unbounded if `mr-spawn` dies between) with no
lock at all, invisible to gate 1, `mr-situation` and the reconcile.

Gate 2 is now armed from the failure branch on an **allowlist of `status == "rejected"`
only**, with epoch-ms coercion, a rejection of anything past or >14 days out, a re-read
immediately before `os.replace` (the Cowork/DC fallback writes `mr-state.json` without the
tick's flock), and a `rate_limit_armed_by` breadcrumb. The allowlist is load-bearing:
`status=="allowed_warning"` events carry a `seven_day` `resetsAt` ~6 days out and appear in
every tick log since 2026-07-31, so a denylist would have stood the loop down for days on a
routine utilization notice — reproducing the outage this fix exists to prevent. The same
denylist bug existed in the **LLM** path (`mr-supervisor-prompt-native.md` told the supervisor
to "Trip on FIRST `status != "allowed"`", which would additionally have killed every live
slice); both prompt sites were corrected in the same pass.

## Explicitly not done

- **Arming `costwatch_enforce`.** All four historical `HARD-MONITOR` 125% trips were on runs
  that finished `EXIT=0` and merged — a 100% false-positive rate on the kill action. A kill
  strands `.git/index.lock`, writes `.costpark-$S`, and `mr-spawn:21` then hard-blocks every
  relaunch until a human hand-edits `cap_override`, converting a bounded overspend into a
  human-blocking incident plus a re-run. MONITOR mode is a documented staged rollout
  (`mr-budget-config.json:55-56`, commit `d47cd82`). Revisit only after this ADR's corrected
  ledger yields a clean calibration table over a fresh sample.
- **Adding `.codegraph` to gate 3's human-activity probe.** Measured false-trip cost is $0 —
  standdowns exit before any spawn and events requeue; worst observed case was 15 minutes of
  merge latency. Widening a safety gate that stops an unattended loop from stomping a live
  human session is a bad trade. The *divergence* between the two probes is now documented
  in-line at both sites rather than silently tolerated.
- **A prompt rule against session-scoped `Monitor` for cross-tick waits.** The prompt already
  forbids sit-polling twice; a third restatement is unenforced prose re-ingested ~24x/day.
  Replaced with a `monitor=` counter on the CENSUS line — review-only, nothing gates on it.
  Note the underlying gap is a **missing tool**: `mr-ci-watch` takes a PR number and cannot
  watch a master-branch workflow rerun.
- **Releasing the chain-owner mutex at tick exit** (gate 4 has fired 0 times in ~250 ticks;
  holding it buys a free standdown) and **a ledger `ts` guard** (all 82 affected rows are
  June-era schema, every production consumer already skips them, and they sit 5+ weeks outside
  any governor window — it was a bug in the postmortem author's throwaway query).

## Consequences

- Governor spend is now truthful: `d7_usd` $1083.28 → $806.41. Multi-attempt runs stop
  inflating the weekly window.
- `cost_usd` may be negative. Any new ledger consumer must handle signed rows.
- `mr-record` gains one external dependency (`mr-cost-sum`) in a cron path, mitigated by the
  `sys.executable` invocation and the naive fallback.
- `WATCHER-DEAD` becomes a signal again; `ORPHAN-RUN` is new and expected to be rare.
- A rate-limit rejection now stands the loop down for free until the reset instead of
  requiring a human to clear a kill switch.

## Confirmation

`mr-selfcheck` — which runs daily from the tick (`mr-native-tick.sh` §DAILY SELFCHECK) — now
gates on `mr-cost-sum --selftest`. The 11 embedded fixtures include the **real uxd2 shape**
(asserting $165.6512, not the naive $423.65), the **escalation case** (`ATTEMPT=1` $10 then
`ATTEMPT=2` $25 must total $35, which a pure value-decrease split would report as $25), a
genuine-zero case that must print `0.0000` rather than `-`, and null/malformed/missing-file
tolerance. `mr-cost-sum` is also added to `mr-selfcheck`'s parse-check file list.

Every fixture drives `emit()` through real stdout and asserts both `rc == 0` and
`re.fullmatch(r"[0-9]+\.[0-9]{4}|-")` — the shell-safe output shape is the contract callers
interpolate, so testing `cost_of_log()` alone would have left it unverified (a `%.2f` typo would
still have passed). Hostile fixtures cover `NaN`, `Infinity`, `"Infinity"`, a negative value and
cross-segment float overflow: `json.loads` accepts bare `NaN`/`Infinity` and `float()` accepts
the string forms, and a `NaN` reaching `mr-situation` makes *every* governor comparison false —
silently disabling SOFT-PAUSE and HARD-STOP while writing RFC-invalid JSON into the ledger.

`mr-selfcheck` additionally parses **python heredocs embedded in bash wrappers**, which `bash -n`
cannot see, across `mr-record`, `mr-metrics`, `mr-situation`, `mr-native-tick.sh`,
`mr-cost-watch`, `mr-audit` and `mr-spawn`. It asserts **opener count == paired count** per file:
the first version of this scanner anchored on a newline immediately after the heredoc tag and so
matched **zero** blocks in `mr-situation` (whose opener carries trailing redirections), leaving
`budget()` — the governor itself — unchecked while reporting green. A silent-zero-match scanner
is worse than no scanner, so pattern drift now fails loudly.

Both gates were verified to bite by injecting a real `SyntaxError` into `mr-record` and into
`mr-situation`'s `budget()` and confirming `SELFCHECK-FAIL`. Hand-running the selftest is not the
gate; the daily tick invocation is.
