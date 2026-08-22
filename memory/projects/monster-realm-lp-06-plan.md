# lp-06 — `mr-backup` + the stray-handoff rule — Plan & Tasks

**Repo:** harness (`mdrewt/claude-harness`) · **Spec:** `specs/monster-realm-v2/M-loop-infrastructure.spec.md` lines 356-377 · **Size:** LIGHT · **Complexity:** MED · **Branch:** `feat/lp-06`

> **READ §7 FIRST.** Sections 1-6 are plan v1. §7 "Review reconciliation" is **plan v2 — the
> design that ships**; where the two differ, v2 wins. v1 is retained because the reviews are only
> legible against what they were reviewing.

`touches:` `memory/projects/mr-backup` (new), `memory/projects/mr-selfcheck`, `memory/projects/mr-record`
Companions (always-in-scope): `memory/projects/lp-06-teeth.sh` (sibling proof-of-teeth script), this plan memo.

## EARS (verbatim from the spec)

1. WHEN the ledger or handoff changes, THE SYSTEM SHALL retain a recoverable copy outside the working tree.
2. WHEN an **untracked** handoff-shaped file appears outside `memory/projects/`, `mr-selfcheck` SHALL emit
   `SELFCHECK-FAIL` naming the path. The predicate must be untracked-AND-outside-`memory/projects/`, not
   "anywhere other than the rolling handoff" — the tracked archives `monster-realm-handoff-archive-2026-07.md`
   and `-2026-08.md` are doctrine-sanctioned and must NOT false-positive.

Tests: proof-of-teeth — create a stray handoff and show the check RED; delete it and show green; restore the
ledger from a backup into a temp dir and diff it byte-for-byte (ADR-0010).

## Blast radius

The seam is `memory/projects/**` shell+python tools. Neither code graph carries CALLS edges for bash /
python-heredoc scripts (Markdown `Section` nodes only), so the graph half of the union is empty **by
construction** here — blast radius was derived by grep over the invocation strings, which is exactly the
dynamic-dispatch case the routing doctrine says grep must cover.

| File | Invoked by |
|---|---|
| `mr-record`    | `mr-native-tick.sh` (under `timeout 60`), `mr-launch.sh`, `mr-spawn`, `mr-selfcheck` (lp-02 + lp-queue fixture batteries), the supervisor prompt |
| `mr-selfcheck` | `mr-native-tick.sh` (daily 24h-marker block), `lp-brief-cost-teeth.sh` (extracts a block by content anchor) |

Two consequences: (a) `mr-native-tick.sh` is NOT in `touches:`, so the 2026-08-15 draft's tick-driven daily
backup is out of scope — the trigger lives in `mr-record`, which is anyway the better fit for EARS-1's "WHEN
the ledger or handoff changes"; (b) `lp-brief-cost-teeth.sh` asserts `grep -cE '^\s*BAD=0' mr-selfcheck == 1`
and its own comment names lp-06 as the plausible source of a stray `BAD=0`. Do not add one, and do not land
the new block inside its `sed` anchor range (`/^# lp-brief-cost:/,/^grep -F .Definition of done/`).

## Spec premise drift (recorded, decision made)

The spec's motivating artifact — an **untracked** `memory/monster-realm-handoff.md` (1,781 bytes) — is now
**tracked**, committed by `e3b6b29 feat(lp-00)`. The spec'd predicate is therefore green against it today.

**Decision: implement exactly as spec'd.** (a) The `untracked` clause is precisely what keeps the baseline
green — drop it and the two doctrine-sanctioned archives red on day one, the failure the spec names; (b) the
gate is **preventive** — the next wrong-path write will be untracked and will red; (c) deleting or moving the
tracked file is outside `touches:`. Pleasant property: a future `git rm --cached` of that file makes it
untracked and the gate fires immediately. Carried as a comment in the block itself so no reader is misled,
plus a follow-up flag (`lp-06a`) in the PR body and handoff.

## 1. `mr-backup` — shape

**Language: Python.** Needs sha256, `os.replace`, a JSON manifest, `fcntl.flock`, `tempfile` fixtures; bash
would shell out for all of it and the selftest would be prose. Cost is two mechanical lines: `mr-selfcheck`
shebang-classifies every executable `mr-*` (`*python*` -> `ast.parse`, unclassifiable -> FAIL) and the PYGUARD
block requires the polyglot interpreter guard as **literally line 2**:

```
#!/usr/bin/python3
''''exec /usr/bin/python3 "$0" "$@" # '''
```

with `__doc__ = """..."""` **assigned** (the guard line is already the module's first string literal).

**Subcommands (four, no more):**

| Subcommand | Why it exists |
|---|---|
| `snapshot [--file PATH]...` | EARS-1. No `--file` => both canonical singletons. `mr-record` passes the path it just wrote. |
| `status [--json]` | The gate consumes it; keeps the drift predicate in ONE implementation instead of re-deriving sha logic inside `mr-selfcheck`. |
| `restore --file <name> [--at YYYYMMDD] --to <dir>` | Required verbatim by the spec's byte-for-byte restore test. |
| `--selftest` | House convention; wired into `mr-selfcheck` beside `mr-cost-sum --selftest`. |

Deliberately NOT built (named so they are not "restored" later): no `list`, no standalone `prune` (a phase of
`snapshot`), no compression, no remote target, no encryption, no restore-in-place.

**Backup root:** default `${XDG_STATE_HOME:-$HOME/.local/state}/mr-backup/`. Machine singleton, outside every
working tree, survives `git clean -xfd` and `git worktree remove` — the entire point of EARS-1.

**`MR_BACKUP_ROOT` override: yes**, and the contrast with `mr-selfcheck`'s refusal of `MR_SELFCHECK_MEM` is the
justification: `mr-selfcheck` is a **gate**, where an override is a surface for greening production vacuously;
`mr-backup` is a **data copier, not a verdict** — an override cannot fabricate a pass, only redirect where
bytes land, and the consequence of a misdirected root is caught by a gate that reads the **hardcoded default**
root. Without the override, the selftest and teeth script would write into the real backup root — the
"selftest pollutes the real corpus" anti-pattern this corpus already has two guards against.

**Boundary rule (parse-don't-validate, enforced in `mr-backup`, not at the call site):**

- A snapshot **source** must be one of the two canonical singletons unless `MR_BACKUP_ROOT` is set (fixture
  mode). Non-canonical source with no `MR_BACKUP_ROOT` => exit 0, one `skip:` line on **stderr**. This one rule
  is what makes `mr-selfcheck`'s existing `MR_RECORD_LEDGER`/`MR_RECORD_HANDOFF` fixture batteries incapable of
  polluting the real root — and it lives in one place, so `mr-record`'s call site carries no conditional to regress.
- A resolved backup root **inside any git working tree** is an illegal state => non-zero exit, write nothing.
- All diagnostics to **stderr** (`mr-record`'s stdout is parsed by fixtures).

**Change detection: content hash with an mtime+size fast path.** `stat` first; if `(size, mtime_ns)` match the
manifest, do nothing; else sha256 and copy only on a different sha. mtime alone is wrong (a rewrite-to-identical
content — which `_rotate_handoff`'s temp+`os.replace` can produce — would burn a slot on every write); sha alone
costs a 600 KB read on every ledger append.

**Snapshot naming:** `<root>/<YYYYMMDD-UTC>/<basename>`, one directory per UTC day, overwritten within the day
by a later change. Copy is `tmp -> os.replace` inside the day dir, so a crash mid-copy never leaves a truncated
"backup".

**Retention:** newest **14** day-directories, pruned during `snapshot`. Bound ~14 x 1.4 MB ~= 20 MB, stated in
the header. Pruning touches only direct children of the **resolved** root matching `^\d{8}$` that are
directories; anything else is left alone and reported (no unguarded recursive delete — the standing corpus rule
`mr-unlock` exists for).

**Accepted risk (header):** intra-day overwrite means a same-day corruption can overwrite that day's good copy;
the previous day's remains, so worst case is <= 1 day. For the append-only ledger that makes a restore a strict
prefix of the truth, never a corrupted file. Insurance, not a backup product.

**Manifest:** `<root>/manifest.json`, one JSON object, rewritten atomically under `fcntl.flock` on
`manifest.json.lock` (up to 4 slice sessions can call `mr-record` concurrently — the same reason `mr-record`
locks the handoff).

**Not backed up:** the two handoff archives and `mr-state.json` — all tracked; git is their backup. `mr-backup`
exists for the gitignored ledger (root `.gitignore:37`), plus the handoff because the spec says so and because
`_rotate_handoff` is a whole-file read-modify-write that can run between commits.

## 2. The trigger

**In `mr-record`, synchronous and bounded, immediately AFTER the durable write, never before.**

- Ledger: after the append handle closes and `ledger-appended:` prints.
- Handoff: after the `flock` block **releases** (inside it, `_rotate_handoff` still holds the lock and a
  snapshot would read a half-rotated file, or contend).

**Ordering is the row-never-lost proof:** the row is on disk and closed before `mr-backup` is named, so a kill,
hang or crash in the backup path cannot lose it. The call is wrapped so nothing propagates: `try/except
Exception: pass` around a `Popen(..., start_new_session=True)` + `communicate(timeout=...)` + `os.killpg` on
timeout — a copy of the shape already proven by `lp02_quality_bin`, including the process-group kill (killing
only the direct child leaves an orphan holding state, once per tick, forever). Failure prints one
`WARN backup:` line to stderr and changes nothing about the row or the exit code.

**Synchronous-bounded, not detached.** A detached child is untestable without sleeps, and the tick invokes
`mr-record` under `timeout 60` — a detached grandchild outlives that bound and can be reaped mid-copy by the
tick's teardown. Synchronous costs ~5-15 ms and lets a fixture assert the snapshot exists the instant
`mr-record` returns.

**Binary resolution:** `_backup_bin()` mirroring `lp02_quality_bin()` — `MR_BACKUP_BIN` -> `MEM_SELF/mr-backup`
-> `MEM/mr-backup`; `None` => silently skip. Invoked as `[sys.executable, bin, "snapshot", "--file", path]` so
exec-bit / ENOEXEC / asdf-shim breakage cannot take out a cron-critical path. `MR_BACKUP_BIN` is what makes the
failure-isolation fixtures (stub exits 1 / sleeps) cheap and wireable.

**Fixture pollution** is handled entirely by `mr-backup`'s canonical-source boundary; no conditional is added
to `mr-record`.

## 3. The stray-handoff predicate (in `mr-selfcheck`)

**Handoff-shaped** = basename matches `handoff` (case-insensitive) **and** ends `.md`. Name-only; content
sniffing is YAGNI and evadable.

**Predicate** = untracked **AND** outside `memory/projects/`, exactly as spec'd:

```
ROOT=$(git -C "$MEM" rev-parse --show-toplevel)
git -C "$ROOT" ls-files --others --exclude-standard -z
```

`--others --exclude-standard` IS the untracked clause (untracked-and-not-ignored), not a second filter. Skip
entries ending `/` (nested-repo roots) and paths under `memory/projects/`.

**Repo root** is derived from the self-located `MEM`, so a run from a slice worktree scans **that worktree** —
the doctrinally required behaviour (a slice's gate attests the corpus it ships beside); production is the cron
run at the main checkout.

**Unverifiable is not clean:** missing `git`, a failing `rev-parse`, or a non-zero `ls-files` => **FAIL**, the
same rule as the existing `lp02-corpus-pollution` guard.

**FAIL message** names the repo-relative path and the remedy.

**False positives (accepted):** any untracked `*handoff*.md` outside `memory/projects/`, including a scratch
note. Correct by design: it is either handoff content at the wrong path or it should be committed/moved.
**Green today:** the tracked rolling handoff, both tracked archives (untracked clause), everything under
`memory/projects/` (path clause). Zero false positives on the current tree.

**False negatives (accepted, enumerated so a reviewer can audit them):**

1. **Tracked** wrong-path files, incl. today's `memory/monster-realm-handoff.md` (see drift note).
2. Anything under `projects/` — gitignored, so `--exclude-standard` drops it; sub-repos have their own tooling.
3. Anything inside `.claude/worktrees/<slice>/` — `ls-files --others` reports the nested worktree as a single
   directory entry and does not recurse (verified). That checkout's own `mr-selfcheck` covers it.
4. Handoff content in a file whose name contains no "handoff". Out of a name-based predicate's reach.

**Also in `mr-selfcheck` (each closes a hole the stray rule cannot):**

- `mr-backup --selftest` wired with the **marker + fixture COUNT parsed from stdout** (the `mr-audit`
  precedent): a battery that shrinks must red. A bare `|| BAD=1` passes identically against a ten-line stub.
- **Drift check** via `mr-backup status --json`: live ledger sha != manifest's last snapshot sha => FAIL. This
  is the "backup silently stopped running" detector, and it is **hold-immune** — it compares content, not
  wall-clock age. A freshness threshold is explicitly rejected: the loop is on an operator hold, so a staleness
  gate would red purely from the pause and be commented out within the week. Ledger absent beside `MEM` (the
  normal worktree state — it is gitignored) => visible `NOTE` and skip, never FAIL.
- **Static wiring assertion:** `mr-record` must still name `mr-backup` on its write path, so a refactor that
  drops the call reds here rather than a month later at a restore.
- **Corpus-pollution guard extension:** the real backup root's `manifest.json` sha unchanged across a
  `mr-selfcheck` run (direct analogue of the two existing pollution guards).

## 4. Proof-of-teeth

| Layer | Owns | Why not elsewhere |
|---|---|---|
| `mr-backup --selftest` | Pure-tool battery, in-process, `MR_BACKUP_ROOT` at a tmpdir | Fast, runs daily via the gate, no git needed |
| `mr-selfcheck` block | Stray-predicate matrix hooks, `--selftest` marker+count, drift, static wiring, pollution guard | Production properties: must red on the daily run |
| `lp-06-teeth.sh` | Heavy cross-file probes: rewritten-`mr-record` end-to-end, failure isolation, prune bound, restore byte-diff | Too expensive for the daily gate; rewrites a copy of a live tool |

Named `lp-06-teeth.sh`, **not** `mr-*`: `mr-selfcheck` globs `mr-*` executables and would shebang-classify it
as a corpus tool (`lp-brief-cost-teeth.sh` states the precedent).

**Stray-predicate matrix** — extract the block from the REAL `mr-selfcheck` by content anchor, never
hand-copied, with the zero-line and runaway-line guards; each case runs against a hermetic temp git repo:

| # | Fixture | Expect |
|---|---|---|
| S0 | tracked rolling handoff + both tracked archives + tracked `memory/monster-realm-handoff.md` | green — the day-one baseline, and the spec's "archives must not false-positive" |
| S1 | untracked `memory/monster-realm-handoff.md` | RED, message names that exact path |
| S2 | untracked `notes/2026-08-handoff.md` (deep) | RED |
| S3 | untracked `memory/projects/scratch-handoff.md` | green (sanctioned home) |
| S4 | untracked `memory/monster-realm-handoff-archive-2026-09.md` | RED (an archive at the wrong path is still stray) |
| S5 | **tracked** `memory/monster-realm-handoff.md` | green (the untracked clause; without it S0 reds) |
| S6 | gitignored `projects/x/handoff.md` | green (documented blind spot, pinned so a future change is deliberate) |
| S7 | ROOT is not a git repo / `git` unavailable | RED (unverifiable is not clean) |

**S1 and S3 together are the vacuity proof:** a predicate that never fires fails S1/S2/S4; one that always
fires fails S0/S3/S5/S6.

**Backup matrix:**

| # | Assertion |
|---|---|
| B0 | **Byte-for-byte restore** (spec-mandated): snapshot a fixture ledger, save a copy, corrupt/delete the live file, `restore --to $tmp/restored`, `cmp` => identical |
| B1 | Idempotence: two `snapshot` runs, no change => one copy, `snapshot_utc` unchanged, no second day-dir |
| B2 | Prune bound: 20 fabricated day-dirs => exactly the newest 14 survive |
| B3 | Illegal root: `MR_BACKUP_ROOT` inside a git working tree => non-zero exit, nothing written |
| B4 | Boundary: non-canonical source with no `MR_BACKUP_ROOT` => exit 0, nothing written |
| B5 | Restore refuses to write over a live source path |

**Wiring proofs** (the lp-brief-cost lesson: logic-in-isolation is not enough — a FAIL must reach the exit path):

- **W1 — stray `BAD=0`:** `grep -cE '^\s*BAD=0' mr-selfcheck == 1`, plus a check that `lp-brief-cost-teeth.sh`'s
  own extraction range is untouched.
- **W2 — positive `mr-record` direction:** `sed 's|^MEM=.*|MEM=<fixture>|'` a **copy** of the real `mr-record`,
  **assert the substitution count is exactly 1** (single-pass-substitution trap), run with `MR_BACKUP_ROOT` at a
  tmpdir and no `MR_RECORD_*` overrides, assert a snapshot of the fixture ledger appears.
- **W3 — negative direction:** the **real** `mr-record` with `MR_RECORD_LEDGER=$fixture` and a fixture
  `MR_BACKUP_ROOT` => that root stays empty (fixture ledgers are never backed up).
- **W4 — failure isolation:** `MR_BACKUP_BIN` pointing at (a) a stub exiting 1, (b) a stub that sleeps past the
  timeout, (c) a nonexistent path. In all three: `mr-record` exits 0, the row is appended intact, elapsed well
  under the tick's 60 s.
- **W5 — the gate is reachable:** with the S1 fixture, run the **whole real `mr-selfcheck`** against a fixture
  MEM/repo and confirm `SELFCHECK-FAIL stray-handoff` prints and `SELFCHECK-OK` does not.

## 5. Anti-patterns named for this slice

1. **Vacuous green** — a one-line `mr-backup --selftest || BAD=1`. Rejected: parse the marker **and** the count.
2. **The gate that reds on day one and gets disabled** — (a) dropping the `untracked` clause (reds against the
   two sanctioned archives immediately); (b) a wall-clock backup-freshness threshold (reds purely from the
   operator hold). Both replaced by predicates green on the current tree and red only on a real defect.
3. **A backup that silently stops running** — closed by the sha-drift check plus the static wiring assertion.
4. **A selftest that pollutes the real corpus** — closed at the `mr-backup` boundary, plus a manifest-sha
   pollution guard mirroring the two that exist.
5. **A check that can never fire** — closed by S1/S3 in one matrix and by W5.
6. **A backup failure that loses a ledger row** — closed by ordering, a bounded process-group-killed
   subprocess, and a non-propagating `try/except`. Proven by W4.
7. **Backups inside the tree** — the 2026-08-15 draft put them in `$MEM`; rejected (`git clean -xfd` deletes the
   insurance along with the accident).
8. **Rotation deadlock** — snapshotting the handoff while holding the rotation flock. Call after release.

## 6. Tasks

Role constraint: `.claude/hooks/guard-tester-bash.mjs` allows the **tester** only non-executing static checks
(`bash -n`, `ast.parse`) and explicitly rejects `--selftest` as a reward-hacking channel — so the tester authors
T1-T3 blind (RED phase) and the implementer/verifier executes them.

| # | Task | Files | Gating assertion |
|---|---|---|---|
| T1 | Author `lp-06-teeth.sh`: extraction guards + S0-S7 + W1-W5 | `lp-06-teeth.sh` | `bash -n` clean; pre-implementation run FAILS loudly (block absent) — the honest RED |
| T2 | Author the `mr-selfcheck` block: stray predicate, `--selftest` marker/count, drift, static wiring, pollution guard | `mr-selfcheck` | `bash -n` + `ast.parse` on the heredoc; `BAD=0` count still 1; `lp-brief-cost-teeth.sh` range untouched |
| T3 | Author `mr-backup`'s B0-B5 expectations into its `--selftest` | `mr-backup` | `ast.parse` clean; polyglot guard line 2; `__doc__` assigned |
| T4 | Implement `mr-backup` | `mr-backup` | `--selftest` prints `BACKUP-SELFTEST-OK <N>`, exit 0; B0 byte-diff passes |
| T5 | Implement the stray-handoff block | `mr-selfcheck` | S0-S7 all pass; W1 passes |
| T6 | Wire the trigger into `mr-record` | `mr-record` | W2, W3, W4a/b/c |
| T7 | Wire `--selftest` + drift + static wiring + pollution guard | `mr-selfcheck` | full `mr-selfcheck` => `SELFCHECK-OK`; W5 shows the FAIL reaching the exit path |
| T8 | Headers carry the *why* (root choice, override contrast, retention bound, drift note, blind spots) | all three | reviewer pass; `CHANGELOG.md` NOT hand-edited |
| T9 | First real snapshot against the live corpus; paste `status --json` in the PR | — | the 559 KB ledger has a recoverable copy for the first time since 2026-07-24 |
| T10 | Follow-up flag for the tracked `memory/monster-realm-handoff.md` (outside `touches:`) | PR body / handoff | named `lp-06a` |

**Gate:** a `memory/projects/**`-only slice cannot be gated by `just ci` (it runs only `scripts/tests/*` and
lints `scripts/`). The gate is `mr-selfcheck` printing `SELFCHECK-OK` plus `--selftest` of every tool touched or
added, plus `lp-06-teeth.sh`. Run `just`/`node` under a login shell (`bash -lc`) or asdf shims are off PATH and
node falls back to v18 (`import.meta.dirname` undefined -> a false red in `scripts/tests/adr-lint.test.mjs`).

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `mr-record` is cron-critical; a regression stops every ledger write | HIGH | trigger strictly after durability; `try/except` + bounded `Popen` + `killpg`; W4 proves all three failure modes |
| `mr-selfcheck` runs daily and is the only real gate; a bad block reds every night | MED | S0 baseline case; predicate green on today's tree by construction; unverifiable=>FAIL is deliberate and narrow |
| A stray `BAD=0` silences every prior FAIL | MED | W1, already predicted by `lp-brief-cost-teeth.sh`'s own comment |
| The teeth script's sed extraction rots silently | MED | zero-line + runaway-line guards copied from the precedent |
| Backup root permissions / `$HOME` unset in cron | LOW | fail loud to stderr, never fatal; drift check catches sustained failure |
| `lp-queue` also edits `mr-record` (spec says serialize by hand) | MED | different concern and disjoint regions of the file; land one, rebase the other |

## ADR

No ADR number was allocated for this slice (the supervisor-assigned number is literally `None`), and the
harness `docs/adr/` has no README/next-free SSOT to read one from (0001-0011 exist; 0012 appears free). Per the
doc-aggregation rule an ADR number is never self-assigned, so the four non-obvious calls — (1) backup root
outside the tree WITH an env override, explicitly contrasting `mr-selfcheck`'s no-override doctrine; (2) the
trigger at the writer rather than the tick; (3) untracked-AND-outside as the predicate with its four blind
spots; (4) drift-not-freshness as the "backup stopped running" detector — ship as load-bearing tool-header
rationale (the corpus's de facto pattern) and are flagged in the PR body as a follow-up ADR awaiting an
allocated number.

---

# 7. Review reconciliation — plan v2 (the design that ships)

Three independent lenses reviewed plan v1: `reviewer` (3 MAJOR, 3 MINOR), `red-team` (1 CRITICAL, 3 HIGH,
6 MED), `/simplify` (cut the manifest and everything downstream of it). Every finding is dispositioned
below. Where v2 differs from §§1-6, **v2 wins**.

## 7.1 Cut list (from `/simplify`, accepted in full)

`manifest.json`, `fcntl.flock`, the `status [--json]` subcommand, `restore --at`, the mtime+size fast path,
sha256 change detection, and the manifest-sha pollution guard are **all cut**. The reasoning that decided it
is the lens's own: the plan's prune already reads the filesystem, restore's path is a pure function of
`(day, basename)`, and the change-detection cache is an *efficiency* mechanism in a slice the spec labels
"insurance, not efficiency" — near-inert on its main call path besides, since every ledger append changes the
ledger's content by definition, so the "unchanged, skip" branch is dead code for the primary caller. With the
manifest gone there is no shared mutable state, so the lock protecting it goes too.

`snapshot` therefore **copies unconditionally** (`tmp` -> `os.replace`) into `<root>/<YYYYMMDD-UTC>/<basename>`.
Idempotence (B1) stops being a mechanism and becomes a property of the layout.

**This also dissolves red-team C1** (CRITICAL: "the drift check is self-graded"). v1 had `mr-selfcheck` trust
`mr-backup status --json` for *both* halves of the comparison, so one bug in `status` — re-hashing the live
file instead of reading the persisted value — made the slice's most important signal a tautology. In v2
`mr-selfcheck` computes both halves itself: it lists day-dirs under the **default** root and byte-compares the
newest snapshot against the live file. No self-report is trusted anywhere.

## 7.2 The canonical-source boundary, restated (reviewer MAJOR #1)

v1's rule and its own W2/W3 tests contradicted each other: `MR_BACKUP_ROOT` was simultaneously the thing that
*exempts* a non-canonical source (so W2 could pass) and something W3 set while demanding the opposite outcome.
The rule that ships:

- **`MR_BACKUP_ROOT` unset (production):** a snapshot source must be **exactly** one of the two canonical
  absolute paths, compared by `os.path.realpath`. Anything else => exit 0, one `skip:` line on stderr.
- **`MR_BACKUP_ROOT` set (fixture mode):** any readable regular file is accepted.

W3 is restated to the production-relevant property it should always have asserted: **the real `mr-record` with
`MR_RECORD_LEDGER` at a fixture and NO `MR_BACKUP_ROOT` leaves the real default root untouched.** The ambient-
leak variant it was groping at is covered by 7.3 instead.

## 7.3 Environment scrubbing (reviewer MAJOR #3, red-team H3 — PROVEN)

Red-team proved `GIT_DIR`/`GIT_WORK_TREE` override `git -C` **silently, with exit 0**, so an ambient leak
would point the stray-handoff scan at a different repo entirely without tripping the "unverifiable is not
clean" rule. This is the same bug class as the `MR_FORCE` leak lp-09 already closed in `mr-native-tick.sh`.

1. The stray scan runs `git` with `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE` **removed from the environment**
   (mirroring the existing `record()` hardening in `mr-selfcheck`).
2. The drift check derives the backup root from `XDG_STATE_HOME`/`HOME` and **ignores `MR_BACKUP_ROOT`
   entirely**. This is what makes v1's claim ("a misdirected root is caught by a gate that reads the hardcoded
   default") actually true: an ambient `MR_BACKUP_ROOT` redirects `mr-backup`'s writes while the gate keeps
   watching the default root, so the drift check REDs instead of going self-consistently green.
3. `mr-selfcheck`'s `record()` helper pops `MR_BACKUP_ROOT` and `MR_BACKUP_BIN` alongside the `GIT_*` vars it
   already pops, so a leaked value can never switch the existing fixture batteries into fixture mode.

## 7.4 No orphaned backup child (red-team H1 — PROVEN)

Red-team proved a `start_new_session=True` child survives its parent being SIGTERM'd — and SIGTERM is exactly
what the cron `timeout 60` wrapper sends. v1 inherited `start_new_session=True` from `lp02_quality_bin`, whose
helper shells out to `git` and therefore genuinely needs a process-**group** kill to avoid orphaned
grandchildren. **`mr-backup` spawns nothing**, so v2 drops `start_new_session` and kills the direct child
(`p.kill()`) on timeout. Consequence: the backup child stays in `mr-record`'s own process group, so the outer
`timeout`'s group signal reaches it too — the orphan window closes by construction rather than by a signal
handler added to a cron-critical file. Timeout is **10 s** (red-team M6: `mr-record`'s worst case is already
~80 s against a 60 s wrapper; do not make it worse).

**Nonzero exit is reported too** (red-team M7): `WARN backup:` prints on a caught exception, on a timeout, and
on a clean nonzero return.

## 7.5 An external round-trip probe in the daily gate (red-team H2)

The spec's byte-for-byte restore mandate is the slice's one irreversible-harm surface, and in v1 it lived only
in `mr-backup --selftest` (self-graded; a fixture degraded from a byte-compare to a size-check keeps printing
the same `OK <N>`) and in the merge-time teeth script. v2 adds a small **external** probe to `mr-selfcheck`'s
daily block, mirroring the `mr-audit` layer-(b) precedent: in a hermetic tmp root, `snapshot` a fixture,
`restore` it, and byte-compare **in `mr-selfcheck`'s own code**. A broken `restore` reds the next cron run, not
the next PR.

## 7.6 Prune safety (red-team M8)

v1's only root guard was "not inside a git working tree", and `$HOME` is not a git repo — so
`MR_BACKUP_ROOT=$HOME` (a plausible typo for `$HOME/.local/state/mr-backup`) would have let the prune delete
real 8-digit-named directories under `$HOME`. v2 additionally **requires the resolved root's basename to be
literally `mr-backup`**, and prunes only direct children that match `^\d{8}$`, are directories, and are **not
symlinks**. Both checks are two lines and close the review's highest-raw-severity finding.

## 7.7 Ignore-laundering probe (red-team M9 — PROVEN)

`--exclude-standard` honours `.gitignore`, `.git/info/exclude` and `core.excludesFile`, so an ignore rule
matching `*handoff*.md` makes a genuinely stray file invisible **with no error** — a silent, zero-error bypass.
v2 adds a four-line probe: `git check-ignore -q` against two synthetic paths (`<root>/probe-handoff.md`,
`<root>/memory/probe-handoff.md`); if either is ignored, `SELFCHECK-FAIL` — an ignore rule is laundering
handoff-shaped files. (Not configured in this environment today; the probe is what keeps it that way.)

## 7.8 Blind spot broadened (red-team M4 — PROVEN)

False-negative #3 in §3 is wider than "registered worktrees": `git ls-files --others` reports **any** directory
containing a `.git` as one opaque, non-recursed entry, so `mkdir X && git init X` hides a handoff too. The
comment in the shipped block says so plainly rather than implying only worktrees are affected. Not detected —
walking every nested repo is not worth it for a name-based predicate — but honestly enumerated, and S6 pins it.

## 7.9 Lock-ordering pinned statically (red-team M5)

A concurrency test for "the handoff snapshot must be called after the flock releases" costs more than it is
worth. v2 pins it **structurally** instead: the teeth script asserts, by line-number comparison of content
anchors in the real `mr-record`, that the handoff-path backup call appears **after** the `LOCK_UN` /
`with`-block exit. A refactor that "helpfully" moves the call inside the lock reds.

## 7.10 Smaller residue

- `restore --file` takes a **closed vocabulary**: the two canonical basenames only, no separators, no `..`
  (reviewer MINOR #5). It also refuses a `--to` that resolves onto either canonical source path (`/simplify`'s
  one piece of ceremony that earns its keep — the append-only ledger is otherwise unrecoverable).
- Snapshot copies keep tmp+`os.replace` (reviewer MINOR #6 applied to the only writer that remains).
- **Bootstrap:** the drift check reds if the live ledger has no matching snapshot — which is TRUE on a corpus
  that has had no backup since 2026-07-24. T9 (seed a real snapshot before the PR opens) is therefore not a
  nicety, it is what makes the gate green on the day it ships. Its remedy line names `mr-backup snapshot`.
- **Ledger absent beside `MEM`** (every worktree run, since the ledger is gitignored) => visible `NOTE`, skip.
  Unchanged from v1, and confirmed correct by red-team.
- S5 is folded into S0's comment (`/simplify` Q3): S0 already bundles the tracked wrong-path file with the
  archives, so S5 adds diagnostics, not teeth.

## 7.11 Explicitly NOT changed

The trigger's placement and ordering (after durability, after the flock release), the `_backup_bin()`
resolution mirroring `lp02_quality_bin()`, the `try/except` that cannot propagate, the untracked-AND-outside
predicate itself, the `MR_BACKUP_ROOT`-vs-`mr-selfcheck`-no-override contrast, the illegal-root check, the
14-day retention bound, and the `--selftest`/drift/static-wiring triad. All three lenses agreed these are
sound. Reviewer independently verified the insertion points against the real file (`mr-record:486-490` for the
ledger; `mr-record:179-187` for the handoff release) and the `git rev-parse --show-toplevel` worktree
behaviour.

## 7.12 Target size

`mr-backup` ~200-260 lines · `mr-selfcheck` new block ~110-140 (v1's ~110-140 minus the manifest guard, plus
the external round-trip probe and the laundering probe) · `lp-06-teeth.sh` ~350-450.
