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
