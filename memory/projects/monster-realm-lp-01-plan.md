# lp-01 — final plan (adjudicated after planner + reviewer + red-team + /simplify)

Branch `feat/lp-01-rate-limit-telemetry`, worktree `.claude/worktrees/lp-01`, base `origin/main@2cd448c`.
Spec: `specs/monster-realm-v2/M-loop-infrastructure.spec.md:141-167`. Gate: `mr-selfcheck` → `SELFCHECK-OK`
plus `--selftest` of every tool touched/added. No ADR (spec §6: loop-infra slices record decisions in the
`mr-*` doctrine file + one line in `memory/decisions-log.md`).

## Measured ground truth (re-derived at slice head; spec line numbers had drifted one slice)

- ARMING heredoc `PYRL` = `mr-native-tick.sh:432-486`, inside the `else` of `if [ "$RC" -eq 0 ]` (`:409`).
  Pre-filter `:454` requires BOTH `"resetsAt"` and `"rejected"` in the raw line; match `:439` is
  `status == "rejected"`. **Zero diff lines inside `:432-490`.**
- Wire shape: top-level `{"type":"rate_limit_event","rate_limit_info":{…},"uuid":…,"session_id":…}`.
  `rate_limit_info` is FLAT and carries ONE window. `utilization` present on `allowed_warning`; absent on
  `allowed`/`rejected`. `resetsAt` is epoch seconds. 3 measured rows carry neither `rateLimitType` nor
  `resetsAt`. `type:"user"` lines can contain `seven_day` inside `tool_use_result` — a substring reader
  false-positives on them.
- Volume: 1 event per tick log; 3-5 per pass log; ~500/day across the corpus. Pass logs ≤ 17 MB,
  longest observed line 74 KB (red-team PROVED a 220 MB line costs 468 MB RSS — cap it).
- `LIVE_BARE` (live slice names, `kill -0`-checked) already computed at `:241-250`, inside the gate-0
  flock (`:233`). Both call sites are inside that flock ⇒ **single writer**.

## Decisions (D = accepted, R = rejected, with the lens that forced it)

- **D1 · Reader = `mr-cost-watch telemetry` one-shot, `price`-style positionals, inline `exit 0`.**
  `mr-cost-watch telemetry LOGFILE GATE NSLICES [OUTFILE]`. red-team PROVED that a dispatch without an
  immediate `exit 0` falls through into `watch` (`--log` became `CAP`, a bogus lock dir was created).
  /simplify: this codebase has zero `--flags` outside `--json`/`--selftest`; 6 flags → 3 positionals + 1.
  `OUTFILE` stays an explicit positional (not an env var) because `mr-cost-watch:13` hardcodes the
  PRODUCTION `MEM` — the out-path is a **safety seam**, not test scaffolding.
- **D2 · Persist EVERY window (five_hour + seven_day + typeless), with `rateLimitType` as a column.**
  Reviewer BLOCKER: the planner's premise ("`overageStatus` only ever appears on five_hour") is FALSE —
  `mr-postmortem-2026-08-15-evidence.json:2753` records a `seven_day` row carrying `overageStatus`. The
  premise is struck; the decision stands on the surviving argument: lp-12/lp-13 are blocked on one full
  reset cycle of this output, so widening later restarts that week, and a type filter is more code than no
  filter. A superset satisfies the EARS `WHEN…SHALL` a fortiori. Flagged in the PR as a spec-amendment
  request, not decided unilaterally in `specs/`.
- **D3 · Row = 12 fixed top-level keys, asserted by exact key-set equality.**
  `ts, source, gate_reached, slices_running_at_sample, rateLimitType, status, utilization, resetsAt,`
  `isUsingOverage, overageStatus, uuid, ri`. The 8 EARS fields are flattened at top level as the spec
  requires; `ri` is the **verbatim `rate_limit_info` object**, which is why `overageInUse`,
  `surpassedThreshold`, `overageResetsAt` and `overageDisabledReason` are NOT enumerated columns
  (/simplify: the planner's hand-picked 14-field tail already missed two fields that exist in the wild —
  enumeration is itself the defect). Wire fields keep wire spelling, harness-computed fields snake_case.
  ids live in VALUES (`source`), never in key names (the lp-02 259-keys disease). `utilization` is a
  0..1 FRACTION, persisted verbatim, unit pinned by an assertion (lp-12 thinks in percent).
- **D4 · `slices_running_at_sample` is an INPUT (positional 3), not scanned by the reader.**
  Kills red-team's `--registry` path-traversal vector and reviewer's third-copy-of-liveness-logic finding.
  The tick already has `LIVE_BARE`.
- **D5 · TWO call sites, both in `mr-native-tick.sh`, both inside the flock, both non-fatal.**
  (a) `:280-281` — before the gate-1 live-chain standdown, one read per live slice's pass log,
  `gate_reached=live-standdown`. This closes the real blind spot: during a long slice, most ticks stand
  down before spawning, so a tick-log-only reader samples nothing exactly when budget is burning.
  (b) `:407-409` — after CENSUS, before `if [ "$RC" -eq 0 ]`, on `$TLOG`, `gate_reached=tick-post-spawn`.
  Outside both RC branches (samples on success AND failure), above `PYRL`. `RC` is a stored variable
  (`:386`), no `set -e`, so an inserted `TEL=$(…) || TEL=""` cannot alter any gate (red-team PROVED safe).
- **R5 · NO integration into the `mr-cost-watch` watch loop, and no byte-offset threading.**
  /simplify + red-team: the trap addition risks a hung/fallen-through call blocking `rm -rf "$LOCKD"` on
  the HARD-kill path, and offsets are the wrong continuity key (`filesize < offset ⇒ 0` misses a
  same-path relaunch — red-team PROVED silent mid-line seeks). Replaced by **`uuid` dedup against the
  tail of the out file**, which is idempotent under re-read, restart, truncation and rotation alike, and
  makes "run twice, no doubling" a testable property. Cost: a 17 MB re-read per tick ≈ 50 ms.
- **D6 · Loud failure channel.** Reviewer MAJOR: `rows=0` is the normal steady state, so it must not be
  the failure signal too. The reader prints exactly one line — `OK rows=N util=M dup=K skip=S` or
  `ERR <kind> …` — rc always 0; the tick logs it verbatim as `RATE-LIMIT-TELEMETRY …`. A week of
  `util=0` is then visible in `mr-native-tick.log` without a new gate (covers the upstream-rename risk).
- **D7 · Hardening carried from the red-team PoCs:** per-line read cap (1 MiB; longer lines skipped and
  counted, never buffered), `json.dumps` only (never hand-formatted rows, so embedded newlines/control
  chars cannot break the JSONL), `os.write` return value checked (partial write on ENOSPC ⇒ `ERR`, never
  a silent half row), one `os.write` per row under `O_APPEND` with rows kept < 4096 B (string fields
  truncated to 96 chars), `gate`/`source` sanitized to `[A-Za-z0-9._:-]{,64}`, every parse in
  try/except (house rule: this is the cron entrypoint, never a traceback).
- **D8 · `mr-telemetry-selftest`** — new python `mr-*` tool: `#!/usr/bin/python3`, lp-11a polyglot guard
  byte-exact on line 2, self-locating `MEM` with NO env override, accepts `--selftest` and bare, prints
  `TELEMETRY-SELFTEST-OK <n> fixtures / <m> assertions` (rc 0) or `TELEMETRY-SELFTEST-FAIL …` (rc 1).
  Fixtures are EMBEDDED verbatim strings (never read `/tmp` — those files get swept). It extracts `PYRL`
  by content marker (never line number), fails loudly if the marker is missing, and runs it **only**
  against a `tempfile.TemporaryDirectory()` state fixture — red-team PROVED that handing it a real
  `mr-state.json` path silently arms the production rate-limit gate. Belt-and-braces: the selftest
  asserts the real `mr-state.json` AND the production telemetry file are byte-unchanged across its run.

## Teeth (the spec's three injected defects + controls)

| id | assertion | injected defect that must RED it |
| --- | --- | --- |
| T1 | `allowed_warning`/`seven_day` fixture ⇒ row with `utilization == 0.87` | filter on `status=="rejected"` (defect a) |
| T2 | `rejected` fixture with no `utilization` ⇒ row with `utilization is None` | `if util is None: continue` (defect b) |
| T3 | extracted `PYRL`: `allowed_warning`-only log ⇒ `NONE` and state fixture UNWRITTEN; `rejected` log ⇒ `ARMED <iso>` | widen the arming predicate to include `allowed_warning` (defect c); narrowing it REDs the other half |
| T4 | vacuity control: a log with no rate-limit events ⇒ `rows=0` and no file created; fixture set yields ≥2 distinct `rateLimitType` | an emitter that emits on every line |
| T5 | exact key set on every row; `0 <= utilization <= 1`; every row < 1024 B and valid standalone JSON | schema drift / unit drift |
| T6 | idempotency: same log twice ⇒ no doubling (`dup=` counts the second pass) | broken uuid dedup |
| T7 | negative control: a `type:"user"` line containing `"rateLimitType":"seven_day"` in `tool_use_result` ⇒ NOT persisted | a raw-substring reader (the defect this slice fixes) |
| T8 | `telemetry` dispatch never creates `/tmp/mr_costwatch_*.lock.d` | missing inline `exit 0` (red-team PoC #2) |
| T9 | static: every `gate` literal at the tick's call sites is in the closed vocabulary; the telemetry call at site (b) precedes `if [ "$RC" -eq 0 ]`, appears once, and `PYRL` follows it | someone moves the call into the RC branch |
| T10 | production non-pollution: `mr-state.json` and the production telemetry file unchanged by the selftest | the red-team PoC #1 hazard |

## Files

| file | status | change |
| --- | --- | --- |
| `memory/projects/mr-cost-watch` | declared | header block + `telemetry_emit()` heredoc `<<'PYTEL'` + dispatch with inline `exit 0` |
| `memory/projects/mr-native-tick.sh` | declared | two call sites, ~8 lines; `:432-490` untouched |
| `memory/projects/mr-telemetry-selftest` | declared (new) | the tests |
| `memory/projects/mr-selfcheck` | **touches-delta** | one `--selftest` wiring line + rationale comment |
| `memory/projects/.gitignore` | **touches-delta** | one line: the runtime telemetry file |
| `memory/decisions-log.md` | **touches-delta** | one row — mandated by spec §6 for loop-infra slices |

Out file: `$MEM/mr-rate-limit-telemetry.jsonl` (untracked). Reviewer argued for tracking it (the sibling
`mr-usage-daily.jsonl` is tracked, durability matters for a cost SSOT). REJECTED with the tradeoff
recorded: it is appended by production on `main` several times an hour, so tracking it conflicts on every
parallel slice branch and dirties every `git status` the loop reads. **Follow-up flagged in the PR:** a
durable daily rollup into a tracked file is the right home for durability, and belongs to whoever owns
the read path (lp-12).

## Order

tests (`mr-telemetry-selftest` + the `mr-selfcheck` wiring line, RED, naming the missing subcommand) →
implementation (`mr-cost-watch`, then `mr-native-tick.sh`, then `.gitignore`) → green →
review lenses + verifier → proof-of-teeth matrix (3 injected defects, captured verbatim) → docs → PR.
`just ci` needs `export PATH="$HOME/.asdf/shims:$PATH"` (node 24.13.1) or `adr-lint.test.mjs` REDs
spuriously on `import.meta.dirname` under /usr/bin/node v18.
