# mr-retro-playbook — postmortem/retrospective methodology (converged over retros 1-5, Jul 2026)
Consumer: any session (Cowork or native) asked to review a supervision window. Read fully, then execute.

1. SCOPE the window: exact start/end (Drew's enable/disable times or wake events). All times UTC in
   evidence; convert only when reporting to Drew (EST). EXCLUDE human-wait time (blocked-on-human
   spans) from latency/cost-rate metrics — measure the machine, not Drew's calendar.
2. EVIDENCE SWEEP before ANY judgment (evidence-before-verdict): `mr-metrics --since --until` for the
   ratified rollup; mr-native-tick.log DECISION/STANDDOWN lines; /tmp/mr_pass_*.log attempts +
   subagent_type census; usage-ledger rows (watch for COST-UNKNOWN and escalated: labels); handoffs;
   PR list + master CI; pending-events/archive. Record findings as facts with pointers first.
3. DEEP-DIVES via subagents (separate contexts, no shared conclusions): one on code/artifact quality
   of the window's merges, one on process forensics (gates, latencies, anomalies). They report
   observations; synthesis happens after both return.
4. METRICS: use judge-ratified metrics only (mr-metrics). ANY new/changed metric goes to the `judge`
   agent (structural bias protocol) BEFORE use. Comparisons: dual-anchor, like-for-like windows,
   blended-not-best-case; n<5 findings are flagged EXTRAPOLATED, never silently generalized.
5. VERDICT + FIXES: each defect gets root cause, prevention, AND detection — prevention never retires
   detection. Fixes ranked by cost/benefit; over-engineering is a defect too (dead weight found in a
   retro gets removed, not documented around).
6. IMPLEMENT → REVIEW → CLEANUP: every retro so far, the review-after-implement pass found real bugs
   in the fixes themselves — it is not optional. Verify edits landed (grep counts) after any session
   interruption. Leave the corpus truthful: no stale claims, no false provenance. Commit + push.
7. RECORD: retro summary in the handoff file with window, verdicts, fixes shipped, checkpoints armed
   (what data the next retro should collect that this one lacked).

TESTER A/B CLOSE — a retro whose note starts `tester-ab` runs this procedure instead of steps 1-7.
`$MEM/mr-tester-ab` does the measuring; the retro runs it, narrates its report and makes no
judgement the report did not.
a. For every slice `mr-tester-ab status` lists as collected: `mr-tester-ab score <slice> --end`
   (replays what is missing, including the default-branch head).
b. `mr-tester-ab judge-pack`, issue the one Agent call it prints, then the `judge-apply` it names.
   Repeat until `judge-pack` prints `AB-SKIP nothing-to-judge`. File every line `judge-apply`
   marks "file as a residual" in the residual sink (`mr-gates` header: `residuals`).
c. `mr-tester-ab report` writes `$MEM/retros/<utc>-tester-ab.md`. Its Decision section is the
   result. The seeded-defect table is a reported measure beside it, never a gate. Its last
   sections total the tests the experiment added to the suite and, when `$MEM/prune/` holds
   census rows, print them.
d. Open the follow-up work as proposals in the handoff: the game PR that sets the tester's
   `model:` and `effort:` and edits its rules, and the harness slice that removes the experiment.
   Every line the report marks `PROPOSAL for the operator` is the operator's ruling; apply none.
e. Lift the `tester-ab-close` blocks: `mr-tester-ab.jsonl` now holds the `close` row they wait
   for. Open one docs PR that removes the `blocked: tester-ab-close` line, and the sentence
   saying when the block lifts, from `tp-3` in `specs/monster-realm-v2/M-test-pruning.spec.md`
   and from `st-3` and `st-4` in `specs/monster-realm-v2/structure.spec.md`.
f. Decide operator decision D2 of `M-test-pruning.spec.md` (a per-milestone prune session) from
   the report alone: its bloat and brittle figures per arm and its census trend rows. Write the
   proposed ruling and those figures in the handoff for the operator; the default (not built)
   stands until the operator rules.
