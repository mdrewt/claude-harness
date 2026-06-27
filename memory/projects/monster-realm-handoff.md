# monster-realm-v2 — milestone-runner handoff

_Single source of truth for the autonomous slice runner. TRUST LIVE repo/PR state over this file._

## Last pass (2026-06-27 ~00:33–00:38 Z — run #13 RESUME, run_id mr-resume-20260627T003310Z, M-infra-a MERGED)
- **outcome: M-infra-a MERGED.** PR **#11** squash-merged to `master` @ **`8844716`** ("feat(M-infra-a): CI caching + fast inner loop (#11)") at 00:37:01Z; **post-merge master CI GREEN** (run 28273081344). This was a **supervisor verify-then-merge resume** of the slice run #12 parked when its rooted run crashed at the merge step (PR already open + remote-CI green).
- **Crash resolution:** run #12 rooted `claude` session died abruptly at the squash-merge step (no `.done`, empty `.err`). Diagnosed: host had 45Gi RAM / 41Gi free / 12Gi swap unused, **no dmesg oom-kill** → not sustained OOM; most likely a transient WSL/host event. Resolution: completed the pending mechanical merge directly (no heavy loop relaunch), so the transient was not re-triggered.
- **Gating-test integrity audit (mechanical, RED a94124d → merged tip): CLEAN.** Only gating artifact = `evals/cache-freshness.eval.mjs`: 0 assertions removed, 0 skip/.only/xit/#[ignore] introduced, eval strengthened (ca88012, net +44/-6), proof-of-teeth present on master + self-verifying (rejects known-bad fixtures or the whole eval fails). Remote `just ci` gate green on the PR and on master post-merge.
- **What M-infra-a shipped:** `.github/workflows/ci.yml` (sccache + rust-cache, distinct prefix keys, no shared CARGO_TARGET_DIR, CARGO_INCREMENTAL=0), `justfile` (`ci-fast` + nextest + doctest), `evals/cache-freshness.eval.mjs` (anti-stale-cache proof-of-teeth), `docs/adr/0043-ci-caching-fast-inner-loop.md`, `ARCHITECTURE.md`. Later slices now get the faster cached inner loop.
- **Cleanup:** worktree `.claude/worktrees/m-infra-a-ci-caching` removed; local + remote branch `feat/m-infra-a-ci-caching` deleted. Main checkout on `master` @ 8844716, clean, single worktree. Lock released.
- **STOP POINT (per user request):** resumed + finished M-infra-a only; **did NOT start the next slice (M8b).**

## RUN #14 (2026-06-26) — M8b IN FLIGHT (right-sized to encounter-table/privacy/B1)
- **Scope decision:** the full M8b surface (encounter table + grass trigger + recruit + client) was too large for one mergeable slice. Right-sized M8b = **`encounter` PRIVATE table + `sync_content` seeding + privacy proof-of-teeth + B1 (empty entries) + dup-species + m1-m5 (fixture_item) cleanup.** PARKED: **M8c** = grass `TileKind` + `movement_tick` trigger + `begin_encounter` + `start_battle` wild-individuality storage (needs additive `wild_ivs`/`wild_nature` on `battle` — DO NOT EXIST yet). **M8d** = `attempt_recruit` reducer + inventory + `grant_item`/`consume_one` + bait content + client battle-view action.
- **Key design facts (carry to M8c/M8d):** real privacy ADR is **ADR-0040** (not spec-prose "0015"). `Level` has NO `SpacetimeType` derive → flatten at the table boundary (server-local `EncounterEntryRow` u8 levels). `encounter` table = `EncounterRow { #[primary_key] zone_id, encounter_rate, entries: Vec<EncounterEntryRow> }`, private (no `public`), seeded validate-before-write upsert-by-zone_id in `sync_content_inner`. game-core already has `load_encounters`/`validate_encounters`/`roll_encounter`/`encounter_triggers`/`recruit_chance` (M8a). New **ADR-0044** records the shape + accepted residuals (types.ts shape-not-data, stale-zone rows, partial-sync window, eval cfg_attr blind spot backstopped by bindings-drift).
- **State:** worktree `.claude/worktrees/m8b-encounter-privacy`, branch `feat/m8b-encounter-privacy` (off 8844716). All local gates GREEN (full `just ci`: 294 tests, 18/18 evals incl. encounter-privacy 6 teeth, clippy clean), verifier PASS (gating tests byte-for-byte intact, teeth demonstrated to bite). **PR #12 OPEN** (https://github.com/mdrewt/monster-realm/pull/12), remote CI (ci+e2e) running.
- **RESUME POINT:** poll `gh pr checks 12 --repo mdrewt/monster-realm`; when ci+e2e GREEN → `gh pr merge 12 --squash` to `master` (collapses the wip: checkpoints into one Conventional Commit). Then `git -C <main checkout> merge --ff-only origin/master`, remove the worktree + delete branch, finalize this handoff. If CI red after ~4-5 fix cycles or branch protection blocks → PARK (leave PR open, document blocker). After M8b → M8c, M8d, then M9, M10 (close Phase A), then M11–M25.

## Current state (verified live)
- **Project `monster-realm`:** `master` @ **`8844716`**. **M0–M7 + M8a + M-infra-a merged.** M8b PR #12 open (awaiting remote CI). Phase A remaining: M8b (merging), M8c, M8d, M9, M10.
- Main checkout still on `master` @ 8844716, clean. One worktree (m8b-encounter-privacy). PR #12 open. M8c/M8d parked (not yet started). No active reset-time gate. No live lock.

## Repo mapping (re-verify each pass via `git remote -v`)
- Harness `/home/mdrewt/projects/ai-apps/claude-harness` -> `git@github.com:mdrewt/claude-harness.git` (tooling/specs; branch `main`). Harness working tree has PRE-EXISTING uncommitted doc/skill edits — NOT the supervisor's; leave untouched.
- Project `/home/mdrewt/projects/ai-apps/monster-realm` -> `git@github.com:mdrewt/monster-realm.git` (slice code; branch `master`). Never cross remotes.

## Environment (load-bearing)
- DC defaultShell on this host is `powershell.exe` (NOT WSL). Supervisor must launch WSL explicitly: `start_process("wsl.exe -d Ubuntu bash -l")` (cold start ~30s, may time out once — retry), then reuse that PID via `interact_with_process`. Setting defaultShell="wsl.exe -d Ubuntu bash -l" does NOT take on DC 0.2.42 (falls back to powershell). DC interact tolerated ~18-22s waits; keep ≤20s. Detached run + watcher survive shell death.
- Watcher `/tmp/mr_watch.py` (status-based trip, correct schema). Launch detached `setsid nohup python3 /tmp/mr_watch.py …`; match by `pgrep -f mr_watch.py`.
- Launch line: `cd <harness> && setsid bash -c 'claude --dangerously-skip-permissions -p "$(cat /tmp/mr_pass_prompt.md)" --output-format stream-json --verbose </dev/null >/tmp/mr_pass.log 2>/tmp/mr_pass.err; echo EXIT=$? >/tmp/mr_pass.done' >/tmp/mr_pass.nohup 2>&1 & echo $!`. NB: exit-trap does NOT fire on whole-session SIGKILL — absence of `.done` + empty `.err` ⇒ abrupt kill; reconcile via live PR/CI then finish the mechanical step directly (as run #13).
- `export GIT_SSH_COMMAND='ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new'`; `timeout 30` git net ops; advance local master via `git merge --ff-only origin/master`. `gh pr merge --squash` works over API (no ssh). gh 2.95 authed mdrewt; claude 2.1.83; `jq` NOT installed (use python3).
- **RATE-LIMIT SCHEMA (claude 2.1.83):** `rate_limit_info` = `{status, resetsAt, rateLimitType, overageStatus, overageDisabledReason, isUsingOverage}`. NO `utilization`/`surpassedThreshold`. Trip on `status != "allowed"`, isUsingOverage backstop, prefer five_hour resetsAt. Org overage disabled → 5h cap is HARD.

## Park counters
- M7a/b/c: 0 · M8a: 0 · **M-infra-a: 1 progress-park (run #12 crash at merge) then MERGED (run #13 resume) — resolved, NOT a blocker** · M8b: 0 (PR #12 open, merging).

## OUTSTANDING
- **B1 (DONE in M8b):** `validate_encounters` now rejects empty `entries` + duplicate species within a zone. **m1–m5:** `fixture_item` dead-code removed in M8b; the Hash-derive/Vec-alloc items were checked and found NOT needed (no concrete instance). 
- **For M8c:** dup-species/rate-0 are validated/ documented but NOT new ADRs. Red-team noted `loser_base_stat_total` returns u16 (safe; doc corrected). M8c trigger must tolerate the partial-sync window (a species may update while encounters keep prior rows if encounter validation fails) and rate-0 zones.

## Risks / notes
- Run #12 crash at merge step was a transient (ample RAM, no oom-kill). If a future rooted run dies with no `.done`+empty `.err`, reconcile via live PR/CI and finish the mechanical step directly rather than relaunching the heavy loop.
- Semgrep `detect-non-literal-regexp` (ReDoS) has bitten before; cache-freshness.eval.mjs passed remote Semgrep (now on master).
- five_hour resetsAt 1782524400. ADR-0042 RLS gap on public `battle` table — revisit at PvP (M16).

## IN-PROGRESS — run #14 (started 2026-06-27T01:15:23Z)
- **slice: M8b** · run_id `mr-20260627T011523Z` · launcher_pid 1588052 (claude child 1588054) · watcher pid 1588167.
- **branch/worktree:** `feat/m8b-encounter-privacy` @ `.claude/worktrees/m8b-encounter-privacy` (from origin/master 8844716). Loop right-sized M8b toward the encounter-privacy core (private `encounter` table + never-leak proof-of-teeth); remainder (attempt_recruit reducer, battle-view action) likely parked as a follow-up slice (M8c).
- **health:** rooted pass launched clean (`.err` empty, stream-json events flowing). Rate-limit schema verified live on **claude 2.1.195** = {status, isUsingOverage, overageStatus, overageDisabledReason, rateLimitType, resetsAt} — **NO `utilization`** (watcher trips on `status!="allowed"` OR isUsingOverage). status=allowed, not in overage as of ~01:20Z. five_hour resetsAt 1782524400 (01:40Z) = a refresh, not pressure.
- **lock:** live + heartbeated by watcher. If a subsequent pass fires while this lock is live (heartbeat <90min, claude alive) → exit per Gate 2 (no double-run). When the run finishes (`.done`) the watcher exits, lock goes stale → next pass reconciles live PR/CI, runs the gating-test integrity audit, restores main checkout to master, records ledger/handoff for the M8b outcome.
- **stray (untouched):** project main checkout has uncommitted `.claude/skills/*` flat→dir conversions (tooling edits, NOT the supervisor's) — left as-is; do not commit/discard.
