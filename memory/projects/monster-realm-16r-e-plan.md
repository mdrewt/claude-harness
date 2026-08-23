# 16r-e — scheduled-function-delay wiring — PLAN (adjudicated)

Branch `feat/16r-e-scheduled-function-delay`, worktree `.claude/worktrees/16r-e`, fork `b5ff14f`.

## Measured ground truth (live SpacetimeDB 2.8.1 `/v1/metrics`, scraped 2026-08-22)
- `# TYPE spacetime_scheduled_function_delay_seconds histogram`; labels `{db, function, le}`.
  The per-reducer label is **`function`**, NOT `reducer` (every other rule in the file uses `reducer=`).
- Bucket edges, complete: `0.001 0.005 0.01 0.05 0.1 0.5 1 5 10 30 60 300 +Inf`. **No 0.03 edge.**
- movement_tick sample: `_count` 15186, `_sum` 4272.39 s.
  cum(le=0.005)=15016; p95 rank = 14426.7 -> **p95 falls inside (0.001, 0.005]**.
  Over 0.05: 158 (1.04%). Over 1 s: 144. Over 60 s: **48 (0.32%)**. Mean 0.2813 s.

## The adjudicated decision (planner recommended p95; red-team refuted it; measurement settles it)
**p95 is structurally blind to this distribution.** The measured tail (48 invocations over 60 s) can
never move a 95th-percentile statistic that is pinned under 5 ms. A `histogram_quantile` alert at
0.03 or 0.05 would ship green while 1-in-220 scheduler starts were minutes late. It is also
*interpolated* (0.03 is not on the lattice). Rejected.

**Ship an exact over-edge RATIO instead**, mirroring this file's own committed/total/ratio idiom
(`mr:slo_set_txns_committed:rate5m` / `..._total:rate5m` / `mr:reducer_success_ratio:rate5m`):

    mr:scheduled_function_starts:rate5m   = sum by (function) (rate(_bucket{function=~SET, le="+Inf"}[5m]))
    mr:scheduled_function_on_time:rate5m  = sum by (function) (rate(_bucket{function=~SET, le="0.05"}[5m]))
    mr:scheduled_function_late:ratio5m    = 1 - (on_time / starts)

Why this shape:
- **Exact.** 0.05 is a real bucket edge, so the ratio restates as "fraction of starts later than
  50 ms" with no distributional assumption. No interpolation anywhere.
- **Tail-visible.** Unlike p95 it counts every late start, including the 60 s+ ones.
- **Normalises the rate mismatch.** `movement_tick` fires ~5/s; `trade_offer_reaper`,
  `pvp_deadline_reaper`, `battle_challenge_reaper` are one-shot `ScheduleAt::Time` inserts
  (verified: trading.rs:137, pvp.rs:156/195) that may fire ZERO times in a 5m window. A ratio is
  comparable across both; a blended quantile is not.
- **Sparse-safe.** Function never invoked -> both series absent -> ratio absent (no fire).
  Counter flat -> 0/0 = NaN -> `gt` is false (no fire). One late one-shot -> ratio 1.0 for <5m,
  which **cannot satisfy `for: 10m`** because the 5m rate window decays first. The `for:` is the
  debounce, and that property is load-bearing, not incidental.
- **SSOT.** The 4-name allowlist appears exactly twice (the two bucket boundaries) and nowhere
  else — same count as `$slo_set`. The panel and alert reference the RECORDED name, never a copy.

Scope set: `movement_tick|trade_offer_reaper|pvp_deadline_reaper|battle_challenge_reaper`.
`battle_challenge_reaper` is IN (pvp.rs, PvP timeout path). Deliberately OUT and named in-comment:
`guest_claim_reaper`, `mr_heartbeat`, `playtest_reaper`.

30 ms is NOT used and must not be pasted in: it is SpacetimeDB's own late-start `log::warn!`
threshold (runbook §5 / :160), a different instrument, and it is not on this histogram's lattice.
The comment block must say so explicitly to stop a future "fix".

## Deliverables
1. `ops/observability/rules/recording.rules.yml` — new `mr-scheduler` group, 3 rules + the
   numbered-provenance comment block (the file's existing "THREE DIFFERENT NUMBERS" idiom).
2. `ops/observability/grafana/dashboards/monster-realm.json` — panel id 14, `gridPos {h:6,w:24,x:0,y:31}`
   (panel 13 ends at y=31), `unit: percentunit`, `legendFormat: {{function}}`,
   target `mr:scheduled_function_late:ratio5m`, threshold line at the alert's number.
3. `ops/observability/grafana/provisioning/alerting/rules.yml` — NEW group `scheduler-health`
   (`meta-monitoring` is scoped to pipeline self-health; this is game scheduler health),
   `interval: 20s`, rule `mr-scheduled-function-delayed` / `ScheduledFunctionDelayed`,
   `severity: warning`, `for: 10m` (30x20s), `gt 0.01`, **`noDataState: OK`**,
   datasource `mr-prometheus`, threshold node shaped like AlloyIngestStalled's.
4. `ops/observability/prometheus.yml` — comment ONLY: the metric arrives on the existing S1
   `spacetimedb` job; a second scrape job would be a duplicate. (Declared-but-unchanged reads as
   an oversight otherwise.)
5. `evals/observability-stack-config.eval.mjs` — new gates + teeth (touches-delta).

`noDataState: OK` diverges from all three existing rules — correct, because their exprs always
have a value (`up{...}`, and an `or vector(0)`-guarded series) while a quantile/ratio over an idle
window has none, and Grafana's provisioned default `NoData` routes to the real on-call webhook.
Comment it so nobody "harmonises" it away. Rejected `or vector(0)`: on a `by (function)`
aggregation it injects a phantom LABEL-LESS series (0-label sets never match `function=...`), which
pollutes the legend and fabricates "0 s delay" for a function that did not run.

## Test plan (tester writes these; they start RED)
Gates G13a-G13e, teeth T-q-T-u, all inside the eval, REUSING `parseAlertingRules`, `thresholdShape`,
`scopedScalar`, `scopedBlock`, `listItems`, `keyIndices`, `stripHashComments`, `parseDurationSeconds`.
Re-implementing any of them is a review-blocking defect.
- G13a rule: exactly the 4 names, as a SET; matcher key is `function` and `reducer` appears in no
  selector of this metric; `by (function, le)`; parsed from COMMENT-STRIPPED text; the ratio rule
  DERIVES from the two recorded names rather than restating the matcher.
- G13b panel: unique id; `gridPos` DISJOINT from every existing panel; `legendFormat` has
  `{{function}}`; threshold value === the alert's evaluator param READ FROM THE ALERT DOC.
- G13c alert: found by expr; `severity: warning`; not paused; condition refId resolves;
  `thresholdShape` = threshold/gt/one param; `noDataState: OK`; uid distinct;
  `for:` an exact multiple of ITS OWN group's interval (from `parseAlertingRules`).
- G13d number identity: alert param === panel threshold, and the OVER-EDGE (`le="0.05"`) is a
  member of a measured `SCHEDULED_DELAY_BUCKET_EDGES` constant — pins the LATTICE, so a retune to
  another real edge needs no gate edit while an off-lattice value reds.
- G13e provenance: the numbered comment block exists in RAW text (stripHashComments would delete
  the very thing this gate reads) and names 30 ms as the host's own log threshold, not an edge.
Teeth must each ACCEPT the committed shape first, then REJECT: `reducer=~` swap; a 5th name; a
missing name; `by (le)` only; commented-out rule; `isPaused: true`; `noDataState` absent;
evaluator `lt`; `severity: critical`; duplicate uid; panel/alert threshold disagreement; an
off-lattice value agreed by both; panel gridPos overlapping panel 13; empty panel expr. The
`for:`-multiple tooth MUST use a fixture group whose interval is NOT 20s, else "derived" is
indistinguishable from "restated".

## ADR
**No ADR file.** The supervisor assigned no number, and I must not pick one. ADR-0197 is the
natural home but **16r-d is in flight and its spec explicitly may edit ADR-0197** — touching it
would collide. Decision prose therefore lives in the config files' own comment blocks (this repo's
established practice) + the PR body. Follow-up flag: this decision deserves a numbered ADR.

## Risks
- R1 `just ci` runs `observability-validate` -> `promtool check rules` in Docker (`--require-docker`,
  ADR-0201: a skip is a fail). Run `just observability-validate` before pushing.
- R2 teeth abort the eval early; a buggy tooth hides every other gate. Assert-accept first.
- R3 panel overlap is invisible to `checkDashboardPanelsReal`; only G13b catches it.
- R4 `NODE_TEST_PASS_FLOOR`/`FILE_FLOOR` must not move — do not touch `ops/observability/checks/**`.
- R5 pre-existing, NAMED not fixed: no rule in this file filters on `db`, so a second published
  database (e.g. account-e2e's `mr-acct-e2e`) would blend into any of them. Same-shaped gap in
  `mr:movement_tick_latency_p95` / `mr:reducer_wait_p95`. Follow-up flag, not this slice.
- R6 pre-existing, NAMED: `mr:movement_tick_latency_p95` has the same interpolation caveat
  (ADR-0180:1008 already records the non-default `le` set). Not this slice's to fix.
