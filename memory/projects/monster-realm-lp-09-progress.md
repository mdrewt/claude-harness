# lp-09 — kill-switch provenance · progress memo

Branch `lp-09`, worktree `.claude/worktrees/lp-09`, base `origin/main` = 03ea926. Harness repo.
Gate = `memory/projects/mr-selfcheck` printing `SELFCHECK-OK` + `--selftest` of every tool touched.

## Slice-head measurement (IMPORTANT — most of lp-09 landed EARLY in e3b6b29 `feat(lp-00)`)

Already on `main`, NOT to be redone: `mr-hold` (provenance tool, `status|set|clear|--selftest`,
fail-safe absent/empty/garbage ⇒ OPERATOR ⇒ never auto-clearable, pinned by fixtures);
`mr-spawn:17-22` refuses to launch under any hold; `mr-selfcheck:39` runs `mr-hold --selftest`;
`guard-bash.mjs:44-46` blocks `rm`/`mv` of the flag and `mr-supervisor-enable` at command position;
`mr-native-tick.sh:123-134` gate -1 reports `by=` + `queued_events=`.

So EARS-1 (fail-safe) and EARS-3 (mr-spawn refusal) are code-satisfied at head. This slice is the
measured residual: the MR_FORCE holes, the missing assertions, the age half of EARS-4, and — the
one that matters most — the doctrine that still manufactures an unclearable hold.

## DONE (planning phase)

- planner (opus) produced the build plan; `reviewer` + `red-team` reviewed it in parallel.
- Two NEW findings from planning, both real, both in declared files:
  - **NF-1** `mr-native-tick.sh:314` launches the paid session (`timeout 5400 claude …`) WITHOUT
    stripping `MR_FORCE`. That — not `mr-spawn:7` — is the live leak of forced-ness into a session
    that can re-enter a nested forced tick. `mr-spawn:7` is defence-in-depth only (its children
    unset it themselves), but still a declared-scope one-liner.
  - **NF-2** `mr-ask-drew:50` is a spawner with no `unset MR_FORCE` ⇒ `touches-delta`.

## DECISIONS taken from the review lenses (each overrides the original plan)

1. **REJECTED: narrowing the guard anchors with `(?<!\\)`** (red-team CRITICAL). The premise was
   "`\|` is always an escaped, literal pipe". False for `\\|` — bash consumes `\\` as an escaped
   backslash, leaving a REAL pipe. Verified: `bash -c 'true \\| echo X'` prints `X`. A single-char
   lookbehind therefore opens a genuine bypass (`true \\| rm …flag`) that today's pattern catches.
   The measured over-fire (a `grep` whose BRE `\|` precedes the needle) is accepted as fail-safe and
   **pinned by a fixture + comment** so nobody "fixes" it into a hole later.
2. **Content forgery is unclosable by content checks** (red-team CRITICAL): a session can
   `printf 'by=supervisor\n' > flag` then use the *sanctioned* `mr-hold clear --by supervisor`.
   No local secret helps — the adversary reads the same filesystem. In-scope mitigation: extend the
   guard to the Bash **write** verbs against the flag (`>`, `tee`, `sed -i`, `chmod`, `truncate`,
   `cp`, `ln`, `unlink`). Residual, documented honestly: `Write`/`Edit` tools have no PreToolUse
   matcher (`.claude/settings.json` is OUT of declared touches) ⇒ follow-up flag, not a silent gap.
3. **CUT: `qstat` at :162/:172/:290** (reviewer MAJOR-1). Gate -1 runs first and exits, so no
   unforced tick can reach those lines while a hold stands — reporting there does not serve EARS-4.
   Gate -1 only; and it REPLACES the duplicated `find|wc -l` at :129/:132 (SSOT, reviewer MAJOR-4).
4. **CUT: the `stranded` boolean + 24h threshold** (planner). Unsanctioned policy on a spend
   control. Ship `oldest_event_age_h` as a number — that is what makes 83.9h visible.
5. **A2 reworked** to "the only file that DEREFERENCES `$MR_FORCE`/`${MR_FORCE` is mr-native-tick.sh"
   (both lenses): a substring predicate reds on the six `unset MR_FORCE` lines and on mr-hold's prose.
6. **A1 restricted to bash tools + exact anchor substring** — python tools cannot carry the bash
   remedy, so including them is a permanent false positive (red-team HIGH-4).
7. **A4 scoped to the hold gate** only (reviewer HIGH-5: 9 SKIP/STANDDOWN lines exist, not 4).
8. **ADDED A8** — the spec's literal Tests clause (`spec.md:137-139`) executed SAFELY: extract gate -1
   from the shipped file by MARKERS (cannot drift) and run it in a tempdir against a fixture flag and
   a stub `mr-hold`. Proves (i) stands down, (ii) flag survives, (iii) `MR_FORCE=1` proceeds, and that
   the depth is reported — with no paid session and zero live-state mutation. Both lenses flagged the
   naive reading of that clause as a real money/live-state hazard (red-team CRITICAL-3).
9. **`mr-selfcheck` becomes SELF-LOCATING** (`MEM=$(cd "$(dirname "$0")" …)`). Without it the
   worktree copy of the gate checks the *live main-checkout* tools and every new assertion is a false
   green. Chosen over an `MR_SELFCHECK_MEM` env override, which would let a session green production
   vacuously. `mr-hold` deliberately KEEPS its hardcoded path (singleton machine-wide artifact).
10. **ADR**: amend `docs/adr/0002-pretooluse-destructive-command-guard.md` + update its Confirmation.
    The supervisor brief arrived with an EMPTY ADR number and self-assigning is forbidden; a
    standalone `0012-kill-switch-provenance` is offered as a docs-only follow-up once numbered.

## COMPLETE — terminal state reached (PR open + local gate green)

All of the above shipped. Gate: `SELFCHECK-OK` · `HOLD-SELFTEST-OK 39 fixtures` ·
`GUARD-SELFTEST-OK 47 fixtures` · `just ci` green (under the PINNED node 24 — a bare shell resolves
node 18, where `adr-lint.test.mjs:191`'s `import.meta.dirname` is undefined and test 12 falsely reds).
Verifier verdict PASS; all 8 proof-of-teeth mutations bite; no test weakened RED→green.

**Post-implementation review found ONE MORE real bypass, now fixed** (both lenses, independently, by
execution): the guard's command-position anchor `(^|[;&|(]\s*)` has no `m` flag, so `^` is
STRING-start only and the separator class omits `\n`. A single leading space — or an ordinary
two-line Bash call (`ls -la` ⏎ `rm …flag`) — matched NOTHING, so EVERY kill-switch rule, including
the pre-existing `rm`/`mv` ones, was bypassable by an everyday shape. Now `(^\s*|[;&|(\n]\s*)`, with
6 ANCHOR fixtures. Also fixed from review: the age clamp (`max(0.0,…)` turned a future mtime into a
healthy `0.0h`, hiding the stranded-event class), A1's coincidental self-pass, and a truncation guard
so a drifted gate-extraction fails loudly instead of gating a fragment.

**`main` was red on `just ci` before this slice, for two unrelated pre-existing reasons** — a biome
format violation in `scripts/setup-claude.mjs` and `docs/adr/0011`'s Confirmation naming no backticked
repo path. Both fixed here per the red-master-overrides-scope rule; declared as `touches-delta:`.

## FOLLOW-UPS (not blockers; for the supervisor to queue)

1. **`.claude/settings.json` PreToolUse matcher for `Write`/`Edit`.** The guard hook is wired to the
   Bash tool ONLY, so those tools bypass every kill-switch rule. Out of this slice's declared touches.
2. **A behavioural test for EARS-3.** `mr-spawn`'s refusal is only statically proven (A6 is an
   honestly-labelled position proxy). A8's extract-and-execute pattern would cover it properly.
3. **`git clean -fdx` deletes the flag** (it is gitignored). Blocking it is an operator policy call —
   it is also routine cleanup — so it ships as a documented known-gap fixture, not a rule.
4. The spec's lp-09 Tests clause cites "(ADR-0010)", which is the unrelated code-intel routing ADR;
   and the section still calls `mr-hold` "a NEW script this slice creates" though lp-00 landed it.

## BLOCKERS

None. NOTE: the live loop is ACTIVE (hold was lifted ~02:12Z 2026-08-17) and a supervisor is watching
this session — so **never** write, move, chmod or remove `memory/projects/.native-supervisor-disabled`,
and never run an unforced-vs-forced live tick comparison. All fixtures live in tempdirs.
