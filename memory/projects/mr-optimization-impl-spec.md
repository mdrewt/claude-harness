> **STATUS: IMPLEMENTED 2026-07-24 (with post-spec additions: ollama advisory layer, handback enrichments, reset-anchored governor, budget-config file). This document is the historical design record — CURRENT behavior is authoritative in mr-native-supervisor-README.md + the scripts themselves.**

# MR Supervisor Optimization — Implementation Spec (2026-07-24, Drew-approved plan)

Priorities: 1) final project quality · 2) total cost · 3) wall-clock. Cron currently DISABLED by Drew; ptc5f rooted run LIVE (all shared-script edits must be tmp+mv, never in-place).

## Governor parameters (Drew-adjusted)
- Weekly budget calibration: $1,250 API-equiv (empirical trip at ~$1,310; recalibrate at next park).
- SOFT-PAUSE at >90% of 7d budget: no NEW launches; merges/parks/records still allowed.
- HARD-STOP at >97%: decision runs stand down entirely.
- Fable routing guard: fable 7d spend ≤45% of weekly budget (hard plan cap is 50%).

## Model & effort routing
- Decision tick: sonnet, --effort medium.
- Rooted runs: routine=opus@high · hard=fable@xhigh · content=opus@medium.
- HARD criteria (any): touches server-module schema/reducers · predictor/netcode/reconcile · security/RLS · M20/M25 · resume-after-park · prior attempt failed.
- Escalate-on-retry in wrapper: attempt 3 of an opus run relaunches as fable@xhigh (env MR_NO_ESCALATE=1 disables).
- Sub-agents inherit session effort (no frontmatter changes this pass). Hard-tier briefs direct tester to model opus.
- Haiku triage shim for ambiguous failures (~1¢).

## New scripts (all in $MEM, mr- prefix, /usr/bin/python3 for JSON, executable)
1. mr-situation: emit one JSON bundle (stdout): generated_at, disabled flag, locks[]+pid-liveness, done files, open PRs+checks (gh; tolerate failure), master sha + latest CI run, budget {7d_usd, fable_7d_usd, limit 1250, thresholds, governor_state}, rate_limit_resets_at (mr-state), latched failure, pending BLOCKER lines (handoff tail grep). Header field "authority":"HINTS-ONLY". Used as prompt prefix by tick + by mr-supervisor-status.
2. mr-record: subcommands `ledger` (validated canonical-field append; --from-log backfills cost from last result event; refuses empty ts; temp+append) and `handoff` (timestamped entry append).
3. mr-audit: --slice --log --repo --base --head → JSON verdict {orchestration:{agent_calls, roles[], models[], verdict}, gating:{changed_test_files[], deleted_tests, skip_markers, removed_asserts, verdict}}; always rc=0, verdict in JSON; evidence file /tmp/mr_audit_<slice>.json.
4. mr-spawn: reads /tmp/mr_pass_<slice>.vars.json {slice, model, effort, adr, touches, target_desc, resume_block, tier}; builds brief from mr-brief-template.md via python replace (incl TIER_BLOCK); clears stale stop flags; writes per-run lock; setsid mr-launch.sh <slice> <model> <effort>; asserts detachment (PID==SESS) + model class in log (opus for opus, fable for fable; retry once then fail); prints one status JSON. --dry builds brief + lock only.
5. mr-ci-watch: <pr> <slice>; detached; `timeout 3600 gh pr checks <pr> --watch` poll loop; on completion writes event file + spawns tick (MR_EVENT_SRC=ci). Self-terminates if PR closed/merged.

## mr-native-tick.sh v3 (rewrite via tmp+mv; keep v2 heartbeat/failure-latch semantics)
- Arg $1 optional EVENT payload file; MR_EVENT_SRC (cron|done|ci|crash|reset|manual); log source in SPAWN line.
- Debounce: skip if .last-tick-spawn-epoch < 120s old, unless src=manual.
- Prompt = SSOT + "\n\n## LIVE SITUATION (HINTS-ONLY...)\n" + mr-situation output + optional "\n## EVENT\n" + payload. Situation+event assembled BEFORE the DRYRUN exit so dryrun can verify.
- Spawn: claude --model $SUP_MODEL --effort medium --output-format stream-json --verbose (keeps --pretty live-tail working) >> TLOG.
- Post: extract total_cost_usd/num_turns from result events; SPAWN-DONE logs cost; append SUPERVISOR ledger row via mr-record (tick owns SUPERVISOR cost rows now; SSOT stops writing them).
- Governor pre-gate: if mr-situation reports HARD-STOP → log STANDDOWN budget + exit (before spawning claude at all). SOFT-PAUSE is enforced by the decision run (it may still merge).
- Auth-failure branch: on "Not logged in" also fire best-effort Windows toast (powershell.exe via WSL interop, || true, MR_NO_TOAST=1 skips).

## mr-launch.sh v2 (tmp+mv; ptc5f is running the old copy — safe)
- $3 effort (default high) → --effort on initial + resume calls.
- Escalation: final attempt of opus run → fable@xhigh unless MR_NO_ESCALATE=1; log ESCALATED.
- Model assert accepts requested class (opus-class or fable-class).
- On .done write: build /tmp/mr_event_<slice>.md (done contents + log tail 40 + err tail 20) → setsid tick with MR_EVENT_SRC=done (gates still apply — disabled flag blocks it while Drew has loop paused: correct).
- Real-failure path: event file gains git-worktree status if resolvable → MR_EVENT_SRC=crash.
- Ambiguous rc!=0 (not transient-regex, not auth): haiku triage (--model haiku --effort low, timeout 120, classify transient|real; parse failure → real).

## SSOT prompt (mr-supervisor-prompt-native.md) surgical edits
- Add "Model & effort routing" + "Budget governor" sections (params above; ledger model+reason required on launch rows).
- Add "Offload tools" section; REPLACE manual procedures: recon → mr-situation (hints-only; re-verify only what you mutate); launch steps → write vars.json + mr-spawn; audits → mr-audit + adjudicate FLAGGED only; records → mr-record; CI wait → spawn mr-ci-watch, record, EXIT (never sit polling).
- Note: SUPERVISOR ledger rows are wrapper-owned now.
- Keep all war-story gotchas; delete only steps the tools replace.

## Brief template
- Add <TIER_BLOCK> placeholder near top; mr-spawn fills: hard → "QUALITY TIER: HARD — invoke tester with model opus; depth over speed; xhigh effort session." · else "".

## Fallback Cowork task
- Step 1 v2: stale-heartbeat OR latched .native-supervisor-last-failure → escalate (else standdown one-liner + 3-line digest: governor state, live slice, latched failures/BLOCKERs). Update via scheduled-tasks tool if it supports prompt/model edits (model→sonnet); else emit new text for Drew.

## Tests (sandboxed; MR_FORCE for gate -1; MR_NO_TOAST=1)
bash -n all · mr-situation live JSON validity · mr-record against ledger COPY · mr-audit against real ptc5g log + f57a383..aee493a · tick DRYRUN with+without event file (prompt assembly, debounce, governor branch with faked ledger) · mr-spawn --dry from a fixture vars.json · escalation branch trace.

## Corpus cleanup
README sections (components/controls/health), maintenance-log entry, handoff entry via mr-record (dogfood), mr-state queue directive, plan doc cross-ref. Obsolete: none removed beyond SSOT steps replaced by tools.

## Out of scope this pass
Residual-milestone consolidation (needs 2wk data) · chore-PR branch-protection fix (GitHub settings, Drew) · CLI pinning decision (Drew) · agent frontmatter effort keys (unverified support).

## AMENDMENTS (post-review, 2026-07-24 — two multi-lens reviews, both APPROVE-WITH-FIXES)
A1. mr-spawn kills a failed first attempt BY RECORDED PID before retry (detach or model-class failure); model assert = observed class EQUALS requested class. Performs the mechanical active-session probe pre-launch (IDE pid + recent-writes) and aborts PROBE-TRIPPED.
A2. mr-situation: always rc=0 valid JSON, per-field "error:" markers; 45s TTL cache (.situation-cache.json, --fresh bypass, --no-gh for tests); governor emits state=UNKNOWN when budget uncomputable (tick fails OPEN + flags loudly; never silent stop/bypass). Tick degrades to SSOT-only prompt if bundle unparseable.
A3. Durable events: event files live in $MEM/pending-events/ (one per slice+type, coalescing). Ticks that lose flock/debounce leave them (requeue by default); the tick that wins consumes ALL pending into the prompt and archives them. Cron/hourly remains the safety net — Drew re-enables after testing.
A4. Reconciliation pre-gate: tick (before gate -1, after health markers) scans .done files + dead-pid locks lacking ledger rows → mr-record backfill mechanically. Accounting runs even when disabled/HARD-STOP. Governor input includes unreconciled_runs estimate (median $25) biasing toward pause.
A5. mr-audit: internal error → verdict AUDIT-ERROR (treated as FLAGGED, never CLEAN). Auto-FLAG categories beyond greps: modified existing assertion lines (threshold/literal changes), added/modified suppression comments (nosemgrep, eslint-disable, #[allow, @ts-ignore, #[ignore]), and ALWAYS for tier=hard slices (mandatory LLM read).
A6. Fable attribution (conservative): mr-launch logs ATTEMPT markers with model; ledger `model` = "escalated:" prefix when mixed; fable_7d counts FULL row cost if any fable attempt. mr-record validates model against known identifiers; routing reason goes in `notes` (canonical schema unchanged).
A7. Escalation guards: skip escalation if fable_7d > guard (cheap ledger sum in wrapper) OR attempts 1-2 error-tails identical (deterministic bug → real failure, stop). Cross-model --resume accepted (state preservation > cache re-ingestion cost; documented tradeoff).
A8. mr-ci-watch: setsid+disown, per-slice watcher lock, gated on disabled flag at startup, distinguishes checks-concluded vs gh-error (retry ≤3 backoff → CI-WATCH-INCONCLUSIVE event), self-terminates on merged/closed. mr-reset-watch added (sleep until rate-limit resetsAt+120s → tick, src=reset). MR_NO_EVENT_BRIDGE=1 disables all bridges (launch hooks + watchers).
A9. Debounce: epoch written only at actual claude spawn; cron-source may skip; event-source requeues (A3). Heartbeat/tick-alive v2 ordering preserved exactly.
A10. Rollback: .bak.v2.<ts> copies of tick/launch/status/SSOT/template pre-swap; bak retention pruned to 3/file at cleanup.
A11. SSOT: delegated-exit one-liner required ("Delegated CI-wait for PR#N to mr-ci-watch; resumes via event tick"); SUPERVISOR ledger rows wrapper-owned; HARD-tier derivation from spec touches: globs listed mechanically.
A12. Tests add: mr-supervisor-status + --pretty against post-change formats; mr-audit replayed for semantic-weakening fixtures; per-slice event coalescing.
A13. New helper mr-supervisor-chat [slice|tick N|list]: extracts session_id from run/tick logs → resume interactively (exec claude --resume SID) or one-shot (-p "q"). Cache-expiry caveat documented.
