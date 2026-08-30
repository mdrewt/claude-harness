# rb-16 plan — retire the superseded hand-kept `.focus(` file lists (R-m23-s10-X19)

Branch `fix/rb-16-retire-focus-lists`, worktree `.claude/worktrees/rb-16`, fork `origin/master` = 09c75dc.
ADR reserved: **0217**.

## 1. The premise, corrected

The residual's promotion prose names `evals/keyboard-operable-rows.eval.mjs` (rb-13/PR#390) as the
subsuming oracle. **That is wrong** — that eval owns A11Y-25/A11Y-26 (click/keydown pairing), a
different criterion. The actual subsuming oracle is **`evals/overlay-a11y-manifest.eval.mjs`**,
shipped by m23-s10 (PR#370) as its criteria X1 (comment/string-aware multi-spelling focus scan with
the divergence tooth) and X2 (readdir-derived, two-way-ratcheted roster + vacuity floor). The
substance of the residual holds; only the file name in the prose was wrong.

Measured live in the worktree: the eval is auto-discovered by `evals/run.mjs` (readdir of
`*.eval.mjs`), runs inside `just eval` which `justfile:595`'s `ci` recipe includes, and passes:
`[A11Y-15] views=18 hits=0 diverge=0 spellings=8; [A11Y-01..04] pins=4/4 nonInert=10/10 reachable=Y; teeth=19/19`.

## 2. Subsumption verdict, axis by axis

| Axis | S3 (10 files) | S4 (5 files) | MV (menuView.ts) | eval |
|---|---|---|---|---|
| roster | hand-kept 10 | hand-kept 5 | hand-kept 1 | **readdir 18**, two-way ratchet + vacuity floor |
| spellings | literal `.focus(` | literal `.focus(` | literal `.focus(` | **8** (`/\.\s*focus\b/` strictly contains `.focus(`) |
| comments | stripped | stripped | **RAW (not stripped)** | stripped |
| string literals | stripped (blind) | stripped (blind) | raw | **intact** + a bare-`'focus'` clause → stricter |
| divergence tooth | yes | yes | no | yes, on the real files |
| anti-vacuity | declaration pin | declaration pin | shape pins | declaration pin per file |

The union of the three hand lists is **16** distinct files (S3=10 + S4=5 + menuView.ts), a strict
subset of the eval's 18; `errorOverlayView.ts` and `sessionView.ts` appear in **no** hand list and
are covered only by the eval.

- **S3 — SUBSUMED. Delete.** Strict subset on every axis; the eval is stronger on roster, spellings
  and string-hiding, and carries the same divergence tooth.
- **S4 — SUBSUMED. Delete.** Same; S4 already reused S3's stripper and added only a roster.
- **MV — NOT fully subsumed. KEEP, and DEFER its retirement.** See §3.

## 3. The MV ruling — narrow scope, defer the remainder

Two independent plan-phase lenses split on this one:

- `planner` recommended deleting MV with the loss recorded as `wontfix`, arguing the comment-axis
  ban is an authoring artefact already violated 5-of-18 by design (`battleView.ts:26`,
  `boxView.ts:26`, `raisingView.ts:27`, `evolutionView.ts:37`, `claimView.ts:27` each name
  `.focus()` in a header comment — which is *why* the eval had to comment-strip).
- `red-team` **measured a reproducible loss** and recommended DEFER: inserting
  `// NOTE: do not call this.#listboxEl.focus() here — see overlayA11y.ts …` into
  `client/src/ui/menuView.ts` REDs `MV-NO-FOCUS-CALL` today and leaves the eval fully GREEN
  (`pass:true … hits=0 … teeth=19/19`).

**Ruling: keep MV, defer its retirement to `backlog`.** The slice brief is explicit — "if it does
not fully subsume, narrow scope and DEFER the remainder honestly rather than deleting a real gate"
— and a measured non-subsumption is exactly that case. The cost of keeping is ~20 lines of a
passing test; the cost of a wrong deletion is a gate this slice cannot get back. Whether the
comment-axis ban is worth generalising to all 18 views, or dropping deliberately, is a real
decision that deserves its own slice and its own evidence, not a side-effect of a cleanup.

The residual therefore closes **2 of 3**, honestly, with the third queued as real work.

## 4. Edits (exact)

`client/src/ui/renameView.test.ts` (1350 lines):
- DELETE `:359-623` — the m23-s3 block header, `S3_VIEW_FILES` (:379-390), `s3Strip` (:414-495),
  `s3CountFocusCalls` (:497-499) and the `it()` (:502-621). The helpers **must** go with the
  `it()`: `client/tsconfig.json` sets `noUnusedLocals`/`noUnusedParameters`, so orphaning them REDs
  `client-typecheck` (measured by red-team, Finding 5). Verified repo-wide: they have zero other
  consumers.
- DELETE `:1269-1350` — the m23-s4 block header (incl. the now-false ledger-CHECK note at
  :1276-1277), `S4_VIEW_FILES` and its `describe`.
- KEEP imports `:83-85` (`readFileSync`/`path`/`fileURLToPath`) — still used by RT-RN-07 (:1123)
  and RT-RN-08 (:1153).
- REPOINT prose: `:41-45` (RED REASON b), `:72` and `:80-81` (the WRONG-IMPL-KILLED index) name
  `S3-NO-VIEW-LOCAL-FOCUS` as the killer; repoint each to the eval.

`client/src/ui/menuView.test.ts`: MV survives, so `:105-107`, `:1107` and `:1679-1680` stay true.
One comment-accuracy fix (boyscout): the MV `it()` body claims "This scan is the ONLY oracle for a
focus call on a path no fixture reaches" — false since m23-s10 shipped the eval. Restate MV's real
surviving role (the raw/comment axis the eval deliberately does not cover) and cite the eval.

`ARCHITECTURE.md:1863` names only `MV-NO-FOCUS-CALL`, which survives — **no edit needed**.

`docs/adr/0217-*.md` — new.

## 5. Out of scope — follow-up flags, NOT touched

Stale prose that goes (more) false, in files outside `touches:`. Per the brief's intent boundary
these are follow-up flags, not hidden-dependency stops (nothing breaks; no CI path reads them):
- `client/src/ui/tradeProposeView.test.ts:20`, `:67`, `:792` — claim the contract is "pinned
  repo-wide by `S3-NO-VIEW-LOCAL-FOCUS`".
- `evals/overlay-a11y-manifest.eval.mjs:7-9`, `:516` — "THREE HAND-KEPT FILE LISTS" becomes one.

## 6. Cross-repo record hygiene — SURFACE, do not edit

Three **closed** harness-repo ledgers grep for the deleted ids in vitest JSON:
- `memory/projects/gates/m23-s3.gates.md:82` — needs `S3-NO-VIEW-LOCAL-FOCUS` to pass exactly once.
- `memory/projects/gates/m23-s4.gates.md:83` — needs `S4-VIEW-LOCAL-FOCUS-5` to pass exactly once.
- `memory/projects/gates/m23-s6.gates.md:92` (X13) — needs `MV-NO-FOCUS-CALL` hits>=1. **Unaffected
  by this slice** (MV survives). m23-s6's X14 census (`total>=35`) also survives: menuView.test.ts
  keeps all 40 `it(`.

Verified: nothing re-executes closed ledgers (`just ci` does not run `mr-gates`; `mr-gates verify
--slice S` is per-slice, supervisor-side, at merge). This is record hygiene, not a CI break, and
the files are in a different repo than this PR. Replacement CHECK for both stale rows = rb-16's X2
(the eval CHECK), which strictly supersedes them (18 files ⊃ 10/5; 8 spellings ⊃ 1).

## 7. Proof of teeth

Coverage here is **by construction**, not enumeration: `discoverViewFiles` walks the directory and
the scan loop applies one identical body to every discovered file with no branch, allowlist or
skip — so "does it bite on F" reduces to "is F discovered", which three ratchets already enforce.
Adding a second project-repo oracle to re-assert that would re-create the duplication this slice
retires. **No new project-repo artifact.**

But every one of the eval's 19 shipped teeth runs on *synthetic strings* — not one proves the
real-tree loop reads the real bytes of, say, `helpView.ts`. So the bite proof is still required as
evidence, and ships in the **harness** repo beside the ledger:
`memory/projects/rb-16.bite-probe.mjs` (precedent: `rb-15.mutation-probe.mjs`).

Probe contract:
- `git archive HEAD | tar -x` into a fresh `/tmp/rb16-bite-<pid>/`; **no git command touches any
  tree after the extract** (memory: a directory-wide `git checkout --` and a throwaway `git stash`
  have each destroyed live work in this repo). `process.chdir` there; the eval's paths are relative.
- Two-source roster: the probe hard-codes its own 18 names AND asserts exact set equality against
  the eval's exported `KNOWN_VIEW_FILES` *and* `discoverViewFiles('client/src/ui')`, so the
  denominator is not forgeable by editing the eval.
- CONTROL 0: baseline `pass===true` with `views=18 hits=0 diverge=0 spellings=8` and `teeth=19/19`.
- LOOP A — 18 iterations, **one file at a time** (the eval is fail-fast at `:705`): plant
  `el.focus()`, **re-read and assert the mutation actually applied** (needle present AND byte
  length changed — memory: a first-occurrence replace that silently no-ops reads as "the gate
  accepted the cheat"), require `pass===false` naming that file and `member@`, restore, require
  `pass===true` again.
- LOOP B — on `menuView.ts` alone, all 8 spellings incl. the 7 that MV's literal matcher misses
  (`el?.focus?.()`, `el['focus']()`, `el["focus"]()`, `el . focus()`, `prototype.focus.call`,
  `autofocus`, `'foc'+'us'`, bare `'focus'`). Each must RED. This is the evidence that the eval is
  a net *strengthening* on menuView.ts even though MV stays.
- CONTROL C — plant a comment-only `.focus(` in `menuView.ts`; the eval must stay GREEN. Report
  `commentAxis=EVAL-BLIND`. This is the measured basis of the DEFER, printed rather than asserted
  away.
- One line: `RB16-BITE-OK files=18/18 bit=18 spellings=8/8 restored=18/18 commentAxis=EVAL-BLIND unexpected-green=0`.

The probe is authored by the **`tester`** agent and run against the **unmodified** tree first — the
replacement must be proven to bite *before* anything is deleted. The `specialist` does the deletion
and never edits the probe.

## 8. Anti-patterns

1. Do not keep `s3Strip`/`s3CountFocusCalls`/`S3_VIEW_FILES`/`S4_VIEW_FILES` "in case" — dead, and
   `noUnusedLocals` REDs; a corpse oracle also invites re-wiring.
2. Do not delete MV because it is convenient. Do not "preserve" it by porting a raw-comment ban
   into the eval behind a five-file allowlist — that is the hand-kept list reborn one directory over.
3. Do not let the ledger's X1 be a bare `count===0`: a MISSING spec file reports `numTotalTests:0`
   and exits 0 (measured). Positive control titles are load-bearing.
4. Do not plant into more than one file at a time (fail-fast at `:705` masks the rest).
5. Do not edit the three closed harness ledgers, `CHANGELOG.md`, or `docs/adr/README.md`.
6. Run `just ci` AFTER the final edit — the PostToolUse format hook uses unpinned `npx biome` while
   `just lint` uses the pinned `client/node_modules` one.

## 9. Right-sizing

One mergeable slice: two `it()` deletions + their dead helpers in one file, prose repointing, one
ADR, one harness-repo probe. Parked deliberately: the MV retirement (DEFER → backlog) and the two
out-of-scope stale-prose files (follow-up flags).
