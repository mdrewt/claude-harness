# lp-ollama — plan (post-review, binding)

Slice: **Delete the per-tick ollama preflight; keep `mr-ollama`.**
Spec: `specs/monster-realm-v2/M-loop-infrastructure.spec.md:305-334`.
Branch `feat/lp-ollama`, worktree `.claude/worktrees/lp-ollama`, from `origin/main` cf07a25.
No ADR (loop-infra; a deletion plus a test block in an existing house form adds no new pattern).

## EARS

1. WHEN a tick runs, THE SYSTEM SHALL NOT start, probe or warm the local model server.
2. `mr-ollama` SHALL remain invocable manually and its consumers SHALL continue to degrade on
   `OLLAMA-UNAVAILABLE`.

Spec's binding test mandate: the tooth binds **behaviour**, not the log string — a preflight that
still runs but stops logging the phrase must fail. Log grep is a cheap secondary only.
Proof-of-teeth: restore the block, both the behavioural and the static leg go RED.

## The edit (production)

`memory/projects/mr-native-tick.sh` — delete `:27-48` (the `# OLLAMA PREFLIGHT` header comment
`:27-29`, the `if … fi` `:30-47`, and the single blank `:48`), leaving the blank at `:26` as the one
separator before `# RECONCILE`. Add a whole-line tombstone comment in the house form of `:249`
(the debounce-removal tombstone): what was removed, the measurement that justified it (803 warm-ups
/ 0 invocations across two generations), that `mr-ollama` is retained for manual use, and that
rollback is git history. Whole-line `#`, never trailing — the static leg strips whole-line comments
only.

**Nothing else.** Verified consumers that must NOT be cleaned up:
- `MR_NO_OLLAMA` — live at `mr-ollama:30` and `mr-launch.sh:50`.
- `.ollama-last` — still written by `mr-ollama:53`; its `memory/projects/.gitignore:10` entry stays.
- `mr-native-tick.sh:2-4` header does not mention ollama → no header edit.
- `mr-native-tick.sh:269` mentions `mr-ollama` in a whole-line comment (mr-launch's summarize-run
  path) → must survive; the static leg strips it before scanning.

**Boy Scout: take nothing.** Candidates considered and rejected on the record:
(a) `:25` `[ "${_hb_fail:-0}" -le "${_hb_ok:-0}" ]` is not hardened against non-numeric marker
content — changing cron-entrypoint liveness semantics inside a deletion PR muddies the
proof-of-teeth diff; park it. (b) the in-file line-number cross-references (`:267`, `:277`, `:306`,
`:449`, `:475`, `:524`) all shift by 22 after the deletion — fixing six scattered sites exceeds the
3-hunk cap and re-rots on the next edit; the corpus doctrine is content anchors, so this becomes a
follow-up flag in the handoff, not a hunk here.

## The tooth (`memory/projects/mr-selfcheck`, appended before the terminal `SELFCHECK-OK` line)

House form: one `/usr/bin/python3 - "$MEM" <<'PYOLL' … sys.exit(bad)` block with a header comment
naming the slice, the spec lines, and the standing TDD-RED clause. Precedent to imitate: the **A8**
block (extract-by-marker + fixture MEM + "we never run the real tick") and the lp-04 block.

All fixtures under one `tempfile.mkdtemp(prefix="mr-selfcheck-lp-ollama-")`, removed in a `finally`
(house convention; fixed `/tmp` names would race a cron selfcheck against a manual run — S7).

### Leg A — canary / witness-mechanism control
Through the same shim PATH, run `curl http://localhost:11434/api/version`, `ollama list`,
`setsid ollama serve` and assert all three were recorded in a **shared canary witness file** (one
file, three lines). Empty canary ⇒ `SELFCHECK-FAIL lp-ollama-witness-mechanism-inert`. This leg is
**load-bearing, not decorative**: shim interception is the only containment for `setsid … &`, which
by construction escapes the wrapper's `timeout` (S2).

### Leg B — behavioural (the primary tooth)
Extract the **prefix** of `mr-native-tick.sh` up to the `^# RECONCILE` anchor and run only that.
Deliberately not the whole tick: past that anchor it mutates live `/tmp/mr_pass_*.done` markers,
can make `mr-ask-drew` file a real GitHub issue, recurses into `mr-selfcheck` (`:216-220`) and can
self-respawn (`:369`).

- Anchor must match, and the prefix must be substantial (`>15` lines and contains
  `native-supervisor-tick-alive`) — anchor-not-found is a **loud FAIL**, never a skip (A8's rule).
- Two rewrites via `re.subn(…, count=1)`: `^HARNESS=…` → sandbox, `^export PATH=…` → shim dir
  prefixed (the hardcoded PATH at `:10` clobbers any env-passed shim). **`n == 1` failure is fatal
  to the leg and must `return` BEFORE any `subprocess.run`** — not the house record-and-continue
  `fail()` idiom (S1). If the `HARNESS=` rewrite silently no-ops, the prefix's unconditional writes
  at `:21`/`:25` overwrite the **real** `.native-supervisor-tick-alive` / heartbeat on every daily
  cron selfcheck, corrupting the state gate -1 escalation reads.
- Containment proof: capture the real `.native-supervisor-tick-alive` and
  `.native-supervisor-heartbeat` mtimes before and after the run and assert unchanged (S1).
- Sandbox MEM holds only a copy of `mr-ollama` (every other `"$MEM/mr-*"` call then degrades);
  pre-`touch` `.selfcheck-last` for defence in depth against the recursion branch.
- Shims (`curl`, `ollama`, `setsid`, `wget`) append their full argv to the tick witness file and
  **never exec**. `curl` exits 0 so a restored block skips the 5×`sleep 2` retry loop. The `ollama`
  shim answers `list` with the model tag the sandboxed `mr-ollama model` resolves, so a restored
  block reaches the deepest line — the `/api/generate` warm-up at `:39` — instead of dead-ending in
  MODEL-MISSING (S6).
- Liveness (assertion-of-absence is worthless without it): append `echo LP-OLLAMA-PREFIX-END`,
  assert rc == 0, the sentinel in stdout, **and** the sandbox `.native-supervisor-tick-alive` exists
  (proves `:21` really executed). Never assert on the live marker's mtime — a concurrent cron tick
  would flake it.
- `MR_TICK_DRYRUN=1` is passed but is **inert by construction** for the extracted prefix (the DRYRUN
  branch is at `:406`); keep it with a one-line comment saying so — it honours the spec's dry-run
  framing and stays correct if the anchor ever moves.
- Assertion: the **union** of tick-witness records contains no line mentioning `11434` and no argv
  token `ollama` (union, because `setsid ollama serve` is recorded by the `setsid` shim, not the
  `ollama` shim).
- `subprocess` timeout ≤ 20 s; `TimeoutExpired` is a FAIL, never a pass.

### Leg C — static (catches the relocation the spec explicitly rejects)
Strip **whole-line** `#` comments only (never inline `#`: `${SL#mr_pass_}` at `:53`/`:118`/`:282`
would be mangled, and a truncation could hide a relocated block) from the **whole**
`mr-native-tick.sh`, not just the prefix — this is the only leg that sees a preflight moved below
the extraction anchor, which is precisely the "just move it lower" alternative the spec rejects at
`:313-314`. Assert the stripped text contains no `11434`, no `ollama` command invocation, and no
`OLLAMA preflight` phrase (the log-grep secondary, run against the **source**, never against
`mr-native-tick.log` — it holds 803 historical matches and rotates at 1 MB).
Vacuity guards: stripped text `>100` lines and still contains `native-supervisor-tick-alive`.
Also pin `mr-launch.sh` (the child the tick spawns) free of a literal `11434`; `mr-ollama` itself is
excluded by construction — it is the retained consumer.

### Leg D — EARS-2 (mr-ollama survives)
Run **under the same shim PATH** with its **own** witness file and **no assertions on that witness**
(S4: `mr-ollama`'s `pick_model()` curls `localhost:11434/api/ps` at `:15` *before* the
`MR_NO_OLLAMA` early-exit at `:30`, so an un-shimmed probe would make the daily gate itself contact
the model server — the very thing this slice forbids — and a shared witness would manufacture a
false RED):
- `mr-ollama model` → rc 0, non-empty stdout (never assert the tag: host-dependent resolution).
- `MR_NO_OLLAMA=1 mr-ollama ping` → rc 0, stdout starts with `OLLAMA-UNAVAILABLE`.
- static pin: `mr-launch.sh` still carries its `OLLAMA-UNAVAILABLE*` degrade arm (`:50-53`).
Neither probe reaches `mark()` (`mr-ollama:53`), which hardcodes the real `.ollama-last` path — do
not extend leg D to `ping` without `MR_NO_OLLAMA=1`, `summarize-run` or `triage` (S5).

## Named residual risks (state them in the PR, do not pretend they are closed)

1. Leg B covers the tick **prefix** only; leg C covers the whole file statically. A preflight both
   relocated below `# RECONCILE` **and** obfuscated (port in a variable, `$OLBIN` instead of
   `ollama`) evades both. Closing it means executing the whole tick, whose hazards (live `/tmp`
   marker mutation, a real GitHub issue, selfcheck recursion, self-respawn) exceed the value.
2. Bash never consults PATH for a command name containing `/`, so an absolute-path
   `/usr/local/bin/ollama` bypasses leg B's shims entirely (S8). Leg C's literal scan still catches
   the `11434`/`ollama` tokens. The proof-of-teeth claim holds for a byte-for-byte restore.
3. Transitive: a callee's callee could probe without any scanned file containing `11434`.
4. `mr-ollama:22` reads the real `~/.hermes/hermes-agent/.env` even from the sandboxed copy —
   read-only, harmless, noted so it is not a surprise later.

## Anti-patterns fenced

Grep-only tooth (spec `:327` rejects it) · gating on the live tick log · silently-skipped extraction
("anchor missing → skip" is a false green, A8) · assertion-of-absence with no liveness sentinel ·
executing the real tick · one witness file shared by the tick probe and the mr-ollama probe ·
inline-`#` stripping · deleting `MR_NO_OLLAMA` / the `.gitignore` entry as "dead cleanup" ·
scope creep into the cron entrypoint.

## Task order

0. Orchestrator: baseline `mr-selfcheck` → SELFCHECK-OK on the unmodified worktree.
1. `tester`: append the PYOLL block to `<worktree>/memory/projects/mr-selfcheck` only. (Its Bash is
   allowlisted to syntax checks — `.claude/hooks/guard-tester-bash.mjs:130-138` — so it cannot run
   the gate; the orchestrator captures RED.)
2. Orchestrator/verifier: run the gate on the UNMODIFIED tick → legs B **and** C must be RED. Only
   one red ⇒ the other is vacuous ⇒ bounce to the tester.
3. `specialist`: the deletion + tombstone. Must not edit mr-selfcheck.
4. `verifier`: gate green; proof-of-teeth (restore the block in a scratch copy → both legs RED);
   containment (no live marker/`.ollama-last`/`/tmp` mutation, no leftover temp dirs); harness
   `just ci` (records that it cannot see `memory/projects/**`).
5. `doc-keeper`: `mr-native-supervisor-README.md` preflight references (`:9`, `:41`, `:48`,
   `:58-59`), the handoff, memory. Declare every out-of-declared-set file under `touches-delta:`.
