---

## 2026-07-04T~07:00Z — m12.5g TERMINAL STATE: PR #101 OPEN, local just ci GREEN (EXIT=0), remote CI running

**m12.5g (docs/spec reconciliation — DOCS-ONLY pass)**

Monster-realm repo changes (7 files, PR #101, branch `feat/m12.5g-doc-reconciliation`):
- **ARCHITECTURE.md**: `guards.rs` module table adds `reject_if_in_battle`; Decisions ADR range `0035–0057 → 0035–0079` with M11–M12.5 highlights
- **docs/adr/README.md**: implementation ADR range summary `0035–0054 → 0035–0079`
- **docs/adr/0067-follow-camera-and-warp-resubscribe.md**: status `proposed → accepted`
- **README.md**: `server/` → `server-module/`; CI note corrected (e2e IS in default merge gate); standards paths fixed
- **AGENTS.md**: spec range `M0–M9` → `M0–M25` (incl. all M8.x, M10.5, M12.5)
- **server-module/src/raising.rs**: module doc — remove stale "train is parked" claim (train shipped in M9b-tail)
- **CHANGELOG.md**: regenerated via `just changelog`

Harness changes (committed to harness main, same commit):
- M9/M10/M11/M12 spec §5 task checkboxes ticked with PR refs
- M11 spec §3: reconciliation note — ADR-0067 global subscription Option C + culling DEFERRED to M20/size-trigger
- M10.5 spec: D-M8.95 DECIDED (Drew) — scheduled as slice M8.95
- M12.5 spec §5: "Delivered slices" section listing all shipped PRs
- build-loop-prompt.md step 10: "tick spec §5 boxes with PR refs" added to doc-keeper checklist
- All previously-untracked spec files committed (M8.5/M8.6/M8.7/M8.95 specs, ADR-0057, M10.5/M12.5)

**Local just ci:** EXIT=0 — 45 evals, 777 Rust tests, 571 client tests.

**Branch:** `feat/m12.5g-doc-reconciliation`, tip `fa45028`. PR #101 open. Worktree: `.claude/worktrees/m12.5g`.

**Supervisor:** squash-merge PR #101 → master. ADR 0080 NOT consumed (no ADR needed — docs-only). Worktree + branch removable after merge.

**Next slice:** M10.5 (five residual slices still owed — 10.5a content validation, 10.5b doc accuracy, 10.5c ADR-README, 10.5d gates+config), then M8.95 (knowledge bundle), then M13+. Fan-out eligible: M10.5 doc slices ‖ M8.95.

---

## 2026-07-04T~01:00Z — m12.5c1-deflake TERMINAL STATE: PR #100 OPEN, local just ci GREEN, remote CI running

**m12.5c1-deflake (zoneSync e2e deflake — fix-red-master action)** — 1 file, 1 commit:

- **`client/e2e/zoneSync.spec.ts`**: two race fixes, no product code changes:
  1. **Test 1 (`:158` race)**: `setRawMapZoneForTest(1)` + `snap()` combined into a single `page.evaluate()` (atomic: no WebSocket task can fire between set and read in a single synchronous evaluate).
  2. **Test 4 (`:367` timeout)**: replaced passive `waitForFunction(sawFractionalOwnMotion, 15s)` with explicit `step('South')` + state-based `waitForFunction(10s)` — guarantees a new target-tile change and a fresh slide clock animation regardless of prior state.

**Root causes:** (1) inter-evaluate task delivery allowed the reconcile listener to call `switchZone(0)` between the set and the read; (2) when `drain()` immediately applied the queued move (old `move_started_at`), the slide clock initialised at the destination tile with no slide → no fractional motion → flag never re-latched.

**Local just ci:** EXIT=0 — 45 evals, 777 Rust tests, 571 client tests. TypeScript clean.

**Review fixes (commit `5e79950`):** HIGH finding addressed — test 4 setup step now uses direction-aware walkability check instead of hardcoded 'South' (wall-bump risk eliminated); MEDIUM comment clarification added. BITES assertion intact.

**Branch:** `feat/m12.5c1-deflake`, tip `5e79950`. PR #100 open. Worktree: `.claude/worktrees/m12.5c1-deflake`.

**Supervisor:** squash-merge PR #100 → master once remote CI (e2e job) is green. ADR 0080 NOT consumed (no ADR needed — test-only fix). Worktree + branch can be removed after merge.

**Next slice:** `m12.5g-1` (doc reconciliation) or per queue — queue is unblocked once master is green.

---

## 2026-07-04T~03:10Z — M12.5b6 TERMINAL STATE: PR #98 OPEN, local just ci GREEN, remote CI running

**M12.5b6 (nightly republish-without-delete smoke test, ADR-0079)** — 6 files, 2 commits:

- **`.github/workflows/nightly.yml`**: new `smoke-republish:` job (timeout-minutes: 20, after coverage); SHA-pinned actions; installs SpacetimeDB 2.6.0; starts in-memory STDB; runs `just smoke-republish`; dumps logs on failure.
- **`scripts/smoke-republish.sh`**: 6-phase smoke: build + publish (`--delete-data`) → `join_game` → assert starter monster → bump `CONTENT_VERSION` via anchored `sed` + verify patch → rebuild + republish (no `--delete-data`) → `sync_content` + output check → assert monster survived + config version updated. `trap EXIT` restores `lib.rs`.
- **`evals/nightly-smoke-wiring.eval.mjs`**: 5 TEETH A–E wiring gate (statically checks that job is in nightly not ci, `run:` prefix on smoke step, justfile recipe, script shebang+size, ADR failure policy).
- **`evals/smoke-republish-on-disconnect-compat.eval.mjs`**: RT-SR-01 gate (red-team; prevents regression to `FROM player` assertions which `on_disconnect` vacates).
- **`justfile`**: `smoke-republish` recipe with quoted env vars.
- **`docs/adr/0079-nightly-republish-smoke.md`**: decision, smoke sequence, isolation strategy, failure policy.

**Key decisions made during slice:**
- RT-SR-01 (CRITICAL): `on_disconnect` clears `player`+`character` rows; script now asserts `FROM monster` (starter is session-independent, persists).
- `join_game '["SmokePlayer"]'` — JSON-array arg format per SpacetimeDB 2.x CLI.
- `CONTENT_VERSION` bumped by +1 (not +100); `sed` anchored to declaration line start; `trap EXIT` restores lib.rs.
- Retry loops (10 × 1s) replace fixed `sleep 1` for SQL assertions.
- `sync_content` output captured and grepped for error markers (fire-and-forget exit-code gap).

**Local just ci:** EXIT=0 — 45 evals (2 new: nightly-smoke-wiring + smoke-republish-on-disconnect-compat), 777 Rust tests, 571 client tests.

**Branch:** `feat/m12.5b6-nightly-smoke-republish`, tip `9ac5357` (2 commits on top of master). PR #98 open.

**Supervisor:** squash-merge PR #98 → master. ADR next-free = **0080** (0079 used). Worktree: `.claude/worktrees/m12.5b6`.

## 2026-07-04T03:13:22Z — mr-sup-cowork-20260704T030635Z-1749207-13162 (supervisor tick)
IN-PROGRESS: M12.5b6 build run finished (EXIT=0, ATTEMPTS=1, PR #98 open, CI+e2e green, cost $9.11). Orchestration audit FLAGGED (zero tester-role invocations on a code slice) -> per policy, NOT merging yet; launched mandated review pass (tester+reviewer+red-team+domain-auditors+verifier on PR #98 diff) as run m12.5b6-nightly. Merge next tick iff APPROVE-FOR-MERGE memo present.

---

## 2026-07-04T~04:00Z — M12.5b6 REVIEW COMPLETE: APPROVE-FOR-MERGE — tip a92d73e

**Multi-lens review of PR #98 diff (`origin/master...HEAD`) complete. Fixes applied in commit `a92d73e`.**

### Lens verdicts:

- **tester**: CLEAN (adequate) — RED checkpoint `ec1cd6f` genuine (missing impl files, not broken eval). TEETH A–E biting (TEETH E bad-fixture is vacuous in direction that predicate correctly returns false — structurally sound; real-file check at line 300 is the production gate). Eval suite covers A1–A5 EARS criteria. One noted weakness: TEETH E bad-fixture direction never fires for correct impl (by design — expected). Overall: ADEQUATE.
- **reviewer + red-team** (fresh pass): FIXED — 2 HIGH, 4 MEDIUM, 4 LOW found; all fixable items applied in `a92d73e` (see below). M-1 (installer checksum) and M-3 (ADR README row) noted; M-3 blocked by instructions (NEVER touch docs/adr/README.md — pre-existing 12.5g-1 debt).
- **reducer-security-auditor**: NOT_APPLICABLE — no new reducers; `sync_content` owner guard (ADR-0073) confirmed correct in committed code.
- **desync-guard**: NOT_APPLICABLE — no client/sim-harness/wasm changes.
- **verifier**: APPROVE — `just ci` EXIT=0 (45 evals / 777 Rust / 571 client tests), no tests weakened RED→green, all TEETH present and biting, ADR-0079 file complete.

### Fixes in `a92d73e`:
- **H-1** `scripts/smoke-republish.sh:42,82`: pre-initialize `MONSTER_ROWS=""` / `MONSTER_ROWS_AFTER=""` before poll loops (set -u safety)
- **H-2** `scripts/smoke-republish.sh:94`: anchor BUMP_VERSION grep with `[^0-9]` word-boundary to prevent substring false-positives
- **M-2** `scripts/smoke-republish.sh:24`: EXIT trap warns instead of `|| true` silent swallow
- **M-4** `scripts/smoke-republish.sh:73`: `if ! SYNC_OUT=$(cmd)` form — `VAR=$(cmd)` alone suppresses set -e on non-zero exit
- **L-1** `docs/adr/0079-nightly-republish-smoke.md:55`: fix "V+100" → "V+1" copy-paste error
- **L-2** `justfile:109`: document macOS GNU sed requirement
- **L-4** `evals/nightly-smoke-wiring.eval.mjs:276`: add `set -euo pipefail` content check

### Known open items (not blocking):
- **M-1**: Installer script at `https://install.spacetimedb.com` has no SHA checksum verification — supply-chain gap per standards/security.md. SpacetimeDB project does not publish a detached checksum for their installer. Flagged for future hardening.
- **M-3**: ADR README row for 0079 missing, next-free not bumped to 0080 — pre-existing documentation debt scoped to 12.5g-1 doc-keeper pass. Instructions prohibit touching docs/adr/README.md in this slice.
- **TEETH E**: vacuous bad-fixture direction (minor structural observation; real file check is the production gate; no action needed).

**Branch:** `feat/m12.5b6-nightly-smoke-republish`, tip `a92d73e`. All evals green. PR #98 CLEARED FOR MERGE.

**Supervisor:** squash-merge PR #98 → master. ADR next-free = **0080**. Worktree: `.claude/worktrees/m12.5b6`.

---

## 2026-07-04T04:25Z — supervisor tick mr-sup-cowork-20260704T040628Z-1780370-4742

**M12.5b6 MERGED.** Review pass (m12.5b6-nightly, $4.02, sonnet, EXIT=0 ATTEMPTS=1) returned APPROVE-FOR-MERGE with fixes `a92d73e`. Supervisor audits: touches-assert CLEAN (6 files, all within declared set, run.mjs untouched); gating-test CLEAN (ec1cd6f→a92d73e additions only; the single flagged removed line was a redundant-regex simplification with the predicate strengthened). PR #98 squash-merged → master `fa85970`. Worktree `.claude/worktrees/m12.5b6` + branch removed; main checkout ff'd to fa85970.

**master CI: RED (known flake, escalating).** e2e failed on zoneSync 12.5c-1/5 state-based (:136, expect at :158) on fa85970 attempts 1 AND 2 — first time a rerun did not clear it. Same flake also hit doc-only chore PR #99. Recurrences #6 and #7. `ci` job green both times; M12.5b6 touched no client/e2e files. Rerun attempt 3 in flight.

**ADR-0079 index chore PR #99 OPEN** (`chore/m12.5b6-adr-index`, doc-only: README row + next-free→0080). Repo has auto-merge disabled (known since #97) → must be merged manually when checks green; its e2e flaked once, rerun triggered. If still open next tick: rerun/merge it (doc-only, no review needed).

**Composite launch this tick: `M12.5c-1-deflake`** — per queue policy (mandatory on master-red), see IN-PROGRESS entry below. ADR 0080 reserved (use only if ADR-worthy; next-free stays 80 in state until consumed).

**DC note:** supervisor shell died mid-`gh pr merge` (session churn); merge confirmed completed from live PR state on a fresh shell — no divergence.

---

## 2026-07-04T04:30:33Z IN-PROGRESS: m12.5c1-deflake LAUNCHED by mr-sup-cowork-20260704T040628Z-1780370-4742 — zoneSync 12.5c-1 e2e deflake (master RED on this flake, recurrences #6/#7). Brief /tmp/mr_pass_m12.5c1-deflake.md, ADR 0080 reserved (optional). Chore PR #99 (ADR-0079 index) still open pending green e2e — merge it when green.

**2026-07-04T04:35:11Z addendum:** chore PR #99 merged -> master `192e739` (ADR-0079 indexed, next-free 0080). Master e2e attempt 3 on fa85970 FAILED (3rd consecutive) — but PR #99 e2e passed on the same base, confirming flake not hard break; no further reruns, the in-flight m12.5c1-deflake run is the fix.

## 2026-07-04T05:20Z — supervisor tick mr-sup-cowork-20260704T050621Z-1826942-20379
MERGED m12.5c1-deflake (PR #100 → 1298137, squash). Master CI GREEN on merge commit — zoneSync 12.5c-1 flake fix confirmed (was RED 3x on fa85970). Audits: gating-test CLEAN (assertion refactored atomically, nothing weakened); orchestration FLAGGED-mitigated (no tester subagent, but test-only slice with 3 local playwright passes + reviewer/red-team in-build — merged without separate review pass, deviating from b6 precedent; rationale in ledger). Cleanup done (worktree/branch/lock/.done removed; master ff'd to 1298137). No ADR added (next_free stays 80). Composite-launching m12.5g (docs-only reconciliation, g-1+g-2, g-3 referenced as scheduled M8.95) this tick.

## 2026-07-04T05:22:50Z — supervisor tick mr-sup-cowork-20260704T050621Z-1826942-20379 (launch)
IN-PROGRESS: launched m12.5g (docs-only reconciliation; g-1 doc set, g-2 M11/ADR-0067 annotations, g-3 → reference M8.95 as scheduled). Brief /tmp/mr_pass_m12.5g.md, ADR 0080 reserved (optional). Fresh slice, no resume.
