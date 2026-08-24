# m22-s0 — PLAN (M22 privacy/compliance, slice S0: contract-first export surface)

Slice: export the S0 contract that S1-S9 (esp. S6's `evals/deletion-completeness.eval.mjs`) import
instead of reimplementing the Identity-column walker.
Declared `touches:` `evals/guest-claim-integrity.eval.mjs`, `evals/rekey-registry-shared.mjs`.
Out of scope: `mr-state.json`/adr_next_free; all S1-S9 behaviour. No ADR (ADR-0179 D6 owns the manifest,
ADR-0181 D1 owns scanner ownership; M22 has ADR-0031).

## D1 — Export IN PLACE. Do NOT create `evals/rekey-registry-shared.mjs`.
The spec's precondition for lifting is "if the file is already near a size-split threshold — check
first". Checked: there is NO split-threshold convention anywhere in the repo — no `max-lines` in
`biome.json` (recommended rules only), nothing in `AGENTS.md` or `docs/`; a whole-worktree search for
`split threshold|size-split|max-lines` returns one unrelated `splitLines()` hit. (The spec's own S4 row
cites "the M8.9 split threshold" as if it existed; it does not.) `guest-claim-integrity.eval.mjs` is
3075 lines — 4th largest of 89 eval files, behind `nightly-smoke-wiring` (10741) and
`observability-stack-config` (7387). The precondition is unsatisfiable in the affirmative, and a new
module with one producer and one consumer is YAGNI that would fork the file from the FG1-FG59 teeth
that exercise the walker.

## D2 — The S0 surface is `REKEY_MANIFEST` + `findIdentityColumns` ONLY. No re-export barrel.
Spec S7.1's literal wording ("imports findIdentityColumns/parseTableSchemas/stripRustSource/
REKEY_MANIFEST from the S0 export surface") would require re-exporting two symbols this file does not
own. Rejected:
- The anti-drift argument is mechanically empty. `evals/run.mjs` imports every eval into ONE process;
  ESM gives `deletion-completeness.eval.mjs` and `guest-claim-integrity.eval.mjs` the *same function
  object* for `stripRustSource`. A barrel cannot strengthen that, and cannot stop the only real drift
  mode (S6 writing its own stripper).
- `rust-scan.mjs` IS the shared owner (ADR-0181 D1, ~50 call sites); `parseTableSchemas`'s owner is
  `battle-schema-snapshot.eval.mjs` (6 call sites incl. `gate-teeth.eval.mjs`, `scripts/okf-export.mjs`).
  A barrel invents a second canonical spelling — the exact ambiguity ADR-0181 removed.
- The one re-export precedent (`evals/wallet-privacy.eval.mjs:154-157`) is backwards-compat for an
  EXISTING surface after de-duplication, explicitly "so this module's public surface is unchanged" —
  it argues against inventing a hub.
Discharged instead by (a) a comment at the export site naming the canonical owners, and (b) a
BEHAVIOURAL tooth proving the walker really strips (T3), which catches genuine drift a barrel cannot.
Residual for the supervisor: amend spec S7.1's wording.

## D3 — Gating tests live in a NEW eval file: `evals/rekey-contract-surface.eval.mjs`.
Decisive: an in-file FG-tooth references the LOCAL `const` binding and passes identically with or
without the `export` keyword — and the `export` keyword IS the deliverable. Only an external module can
observe it. Import-purity (T4) is likewise unobservable from inside. Spec S7.2 also mandates a per-slice
eval file. Auto-discovered by `run.mjs` readdir; no wiring edit. Declared under `touches-delta:`.

## D4 — Teeth (what actually bites)
- **T1 surface bound + immutable.** `REKEY_MANIFEST` present, non-empty, every key splits into exactly
  two non-empty halves on `.`, and `Object.isFrozen`. Probe-write a key, assert it is absent.
  Bites: export removed/renamed; an unfrozen manifest corruptible by any of ~90 co-resident evals.
  Shallow freeze only — deep-freeze is YAGNI and S2 adds fields in SOURCE, which freeze does not block.
- **T2 the exported binding is LIVE, not a snapshot.** Against the real tree:
  `checkRekeyCompleteness(treeSrcs, accountsSrc, m.REKEY_MANIFEST)` -> `null`; the same with a
  SHALLOW COPY minus one key -> a string containing `[G6/declared]`. Bites a hand-copied stale export;
  the second half also proves the first is not always-green.
- **T3 walker shape + stripper provenance.** Synthetic in-memory `treeSrcs` (3 tiny files, per-file,
  never concatenated): a real `Identity` and a real `Option<Identity>` column present with the
  documented `{path,type}` record; a table declaration existing ONLY inside a Rust string literal
  ABSENT; a `fn f(identity: Identity)` parameter ABSENT. Bites a walker that drops `stripRustSource`
  or regresses to a whole-file `: Identity,` line match.
- **T4 import purity.** Child process imports the eval module; assert empty stdout + exit 0.
  Bites removal/breakage of the `process.argv[1]` main guard, which would make S6's import silently
  re-run the whole 59-tooth guest-claim suite inside `run.mjs`.

## D5 — What the contract must NOT pin (S2 red-on-arrival hazards)
Never pin `Object.keys(REKEY_MANIFEST)` by set-equality or count (S2 adds
`AccountDeletionReaperSchedule` / `export_bundle` columns), and never pin entry VALUE shape
(`string starting EXEMPT|BLOCKED`, or `{rekey,exists}`) — S2 object-ifies entries.

## Tasks
1. Author ledger gates X1-X6; run `mr-gates check` from the worktree; confirm each is RED for the
   RIGHT reason (X1 "not exported", X2-X4 "Cannot find module"). Only moment non-vacuity is observable.
2. Add `export` + `Object.freeze` + the contract comment to `guest-claim-integrity.eval.mjs`. X1 GREEN.
3. `tester` writes `evals/rekey-contract-surface.eval.mjs` (T1-T4 + BAD/GOOD fixtures).
4. Orchestrator bite-proofs each tooth by mutating the TARGET: (a) delete the `export` keyword;
   (b) drop `Object.freeze`; (c) `stripRustSource(f.src)` -> `f.src` in `findIdentityColumns`;
   (d) delete the main guard. Commit step 3 FIRST; revert only the mutated file.
5. `node evals/run.mjs` (expect 90 PASS / 0 FAIL), then the full `just ci` once.
6. Ledger evidence; PR body records the S7.1 residual and R1.

## Anti-patterns
1. `typeof x === 'function'` as the ONLY assertion. 2. Pinning the manifest key set/count. 3. Pinning
entry value shape. 4. Creating `rekey-registry-shared.mjs`. 5. A re-export barrel. 6. MUTATING the
shared `REKEY_MANIFEST` from the new eval (one module instance across ~90 evals, readdir order not
guaranteed) — spread-copy only. 7. `new RegExp` (Semgrep `detect-non-literal-regexp`, REMOTE-ONLY).
8. Re-implementing a Rust walk in the new eval. 9. Stripping a CONCATENATED blob. 10. Hazard characters
written contiguously in the new file's own comments (unpaired slash-star, stray double quote) — use
`String.fromCharCode(0x22)`; repo scanners read `evals/*.mjs` as raw text and this has false-RED'd
before. 11. Writing `deletion_policy`/`exportable`/`terminal_at_ms` into guest-claim-integrity, even in
prose (X6 bans it; that is S2 knowledge). 12. ADR cites with a `:line` suffix (line cites drift).
13. Touching `mr-state.json`, `evals/run.mjs`, or any server-module/game-core/client source.

## Risks
- **R1 (hand to S2).** `guest-claim-integrity.eval.mjs` ALREADY has three dependencies on the
  manifest's current VALUE shape that S2 will break: `:1558-1567` (`typeof exemptPolicy !== 'string'
  || !startsWith('EXEMPT')` -> `[G6/anchors]`), `:1596-1598` (`if (typeof policy === 'string')
  continue;` — object-ified entries newly enter the `[G6/consumed]` loop), and `:3035-3037` (the REKEY
  count in the detail line). S0 must not add a fourth; S2 must fix these three.
- **R2.** Spec S7.1's literal wording would make S6's import fail under D2. Mitigated by the
  owner-naming comment; needs a S7.1 amendment (supervisor).
- **R3.** Semgrep + gitleaks are REMOTE-ONLY; local `just ci` proves nothing about them.
- **R4.** Freezing turns a future runtime mutation into a strict-mode TypeError. Intended; noted in the
  comment.
- **R5.** The ledger lives in the HARNESS repo — a second repo. Keep the project commit clean; no stray
  `cd` sending a bare `git commit` to the main checkout.
- **R6.** X5's `pass>=90` assumes the 89-green baseline. Re-derive if an unrelated eval lands first.

---

# PLAN REVIEW ADJUDICATION (reviewer + red-team + /simplify, all three run in parallel)

The red-team WROTE AND RAN the cheats in /tmp copies (never the worktree); its findings are measured,
not argued. Where lenses conflicted, the measurement wins.

## Accepted — plan CHANGED

**A1 (all three lenses, BLOCKER). T1's probe-write is deleted.** ESM is implicit strict mode, so
writing to a frozen object THROWS — the tooth would red-on-arrival; and on bite-proof (b) the write
SUCCEEDS and permanently poisons the one module-scope `REKEY_MANIFEST` shared by ~90 co-resident
evals in `run.mjs`'s single process, violating the plan's own Anti-pattern 6 and reding a file the
orchestrator never mutated. T1 now asserts `Object.isFrozen` only.

**A2 (red-team F5, MEASURED — overrides /simplify's "shallow freeze is ceremony"). DEEP freeze.**
Shallow freeze leaves the `{rekey, exists}` entry objects mutable, and the red-team measured that
corrupting one turns a REAL regression from RED to GREEN: with `rekey_monsters(` removed from
`rekey_all`, a clean manifest yields `[G6/consumed] ...` and a corrupted one yields `null`. That is
the half the file's own comment calls "the ONLY part of G6 not already covered" elsewhere. So the
freeze is load-bearing, not ceremony — but only if it reaches the entries. Freeze each entry, then
the container. This also resolves /simplify's fair charge that "shallow freeze + a dedicated tooth +
a bite-proof" is the incoherent middle: we take the coherent end.

**A3 (/simplify M2 + reviewer M3/m6). T2 (live-tree `checkRekeyCompleteness`) is CUT.** Three
independent reasons: (i) its first half is byte-equivalent to what `guest-claim-integrity.eval.mjs`
already runs at `:3017`, doubling the slowest scan in the suite so real drift reds twice; (ii) its
second half re-spells existing fixtures FG48/FG49; (iii) decisively, running it forces the new eval
to RE-IMPLEMENT the tree glob + `_tests.rs` filter + read loop from `:2958-2985` — a second source of
truth for "what is the tree", which is the exact drift class this contract slice exists to prevent.
Replaced by anchor-key presence (`account.identity`, `profile.identity`) folded into T1: three lines,
no tree walk, and S2-safe (no key-set, count or value-shape pin, so D5 holds).

**A4 (red-team F1, CRITICAL, MEASURED). T3's child process must set `argv[1]`.** The natural spelling
`node --input-type=module -e "await import(...)"` leaves `process.argv[1]` undefined, so
`path.resolve(process.argv[1] ?? '')` can never equal the module URL and the tooth is BLIND to the
cheat that matters: widening the guard predicate to compare `path.dirname`. Measured consequence of
that cheat under `run.mjs` — where `argv[1]` IS a sibling `.mjs` — the guard fires at import time, the
59-tooth suite runs at module scope and hits `process.exit(0)`: **37 of 90 evals ran, 3 already-printed
`eval FAIL:` lines were swallowed, and `run.mjs` exited 0.** A silent full-CI false green.
Verified empirically here: `node --input-type=module -e "<code>" ./evals/foo.mjs` sets
`process.argv[1]` to `./evals/foo.mjs` — the `run.mjs` shape, with NO new probe file needed.
T3 spawns with a sibling `evals/*.mjs` path as `argv[1]`.

**A5 (red-team F3, MEASURED). The string-literal phantom fixture MUST be multi-line.**
`parseTableSchemas`'s regex requires a newline before the closing brace, so the obvious one-line
fixture is invisible to the parser even on RAW source and the tooth is VACUOUS: measured, a one-line
fixture lets `parseTableSchemas(stripRustSource(f.src))` -> `parseTableSchemas(f.src)` survive GREEN;
a multi-line fixture catches it. The existing 59 FG teeth do NOT cover this mutation, so this is the
one tooth guarding stripper provenance.

**A6 (reviewer m7). The fixture must spell the attribute `#[spacetimedb::table(accessor = <name>)]`**
— `parseTableSchemas` requires `accessor =` as the first argument (`:1491-1494`, and `synthSchemaSrc`
at `:1955` emits exactly that). A `(public, name = x)` spelling parses to nothing.

**A7 (red-team F6). T2 asserts the EXACT result size** of the synthetic walk, not just presence:
without it a "defensive" walker that unions the manifest back into its result survives GREEN
(measured), and S6 consumes `findIdentityColumns` directly.

**A8 (/simplify M3 + red-team). T2's `fn f(identity: Identity)` clause is CUT** — it is
`parseTableSchemas`'s contract (owned by `battle-schema-snapshot.eval.mjs`, ADR-0181 D1), vacuous by
construction against any parser-based walker, and pinning it here recreates the ownership ambiguity
D2 rejected the barrel to avoid.

**A9 (/simplify M4/M5). Ledger cut 6 gates -> 4, and X5's `pass>=90` floor is REPLACED** by
"0 FAIL + `eval PASS: rekey-contract-surface` present exactly once + `eval PASS: guest-claim-integrity`
present". Same evidence, no cross-slice coupling — this also retires risk R6.

**A10 (red-team, HARD CONSTRAINT). The filename must not end `-privacy.eval.mjs` / `-security.eval.mjs`**
— `evals/scanner-migration-audit.eval.mjs:1325` (`isGatedName`) pulls those into a gated set and the
red-team MEASURED a false-RED in that OTHER eval on arrival. `rekey-contract-surface.eval.mjs` is
outside the predicate. This is a constraint, not a preference.

## Accepted — recorded, NOT built (with reasons)

**A11 (reviewer M3). The tree-reader is NOT extracted/exported.** Reviewer is right that the input-set
rule (glob `server-module/src/**/*.rs`, skip `*_tests.rs`, fail loud on empty, sort — `:2958-2985`) is
the piece with real drift risk for S6, and that a narrower glob there is a SILENT false-green on
`[DEL-01]`. But extracting it means restructuring early-`return {name, pass, detail}` control flow
inside a 3075-line security gate's default export, and it adds a FIFTH symbol to a contract the
supervisor scoped to four. Seam-freeze doctrine is explicit that a frozen seam siblings build against
must be a crisp, minimal diff. So: the rule is pinned VERBATIM in the contract comment, and the
extraction is a named follow-up for the supervisor to schedule into S2 or a successor. Recorded as a
residual, not silently inherited.

**A12 (reviewer M4). The spec amendment is a supervisor action, not a slice edit.** The spec lives in
the HARNESS repo; the brief scoped this slice to the project repo precisely to avoid a cross-repo
touch (that is also why `mr-state.json` is excluded). Exact wording handed to the supervisor in the PR
body + handoff, covering Sec.2 (`:74-77`), Sec.7.1, and the Sec.7.2 S0 row (`:456`). Note this is a
deviation from a WORDING detail, not from intent: Sec.2's stated goal is "exactly one walker, two gate
files reading it", which D2 preserves — ADR-0181 D1 already decided scanner ownership.

**A13 (reviewer m5 + /simplify m7). `mr-state.json`'s `adr_next_free` is ALREADY 205** (verified at
`memory/projects/mr-state.json:14`), so the spec's S0 deliverable is already landed — it is not
dropped work. It also lives in the harness repo, so spec Sec.7.2 listing it under a project slice's
`touches:` was mis-specified. Both facts go to the supervisor with A12.

**A14 (red-team F4, residual). T-teeth cannot distinguish a byte-identical DUPLICATE export from the
live binding.** Measured: renaming the live const and pasting a frozen duplicate passes every tooth,
then the two drift on the policy REASON strings. Under export-in-place there is exactly one literal,
X4 fences the diff, and the diff is ~15 lines under three review lenses — so the residual is accepted
and disclosed rather than papered over with a self-source needle (this repo has 4 measured bypasses of
that shape).

**A15 (red-team F2, residual). T3 measures OUTPUT, not WORK.** A deliberate top-level
`await guestClaimIntegrityEval().catch(() => null)` above an intact guard leaves stdout empty and exits
0 (measured: 0.02s -> 0.15s import). T3 additionally asserts stderr is empty (catching the
`console.error` variant), but a wall-clock budget would be a flake source in CI and the residual shape
is a deliberate cheat, not a plausible regression. Disclosed.

**A16 (reviewer M2, follow-up flag, OUT of touches).** `evals/run.mjs` has a vacuity floor only on
`files.length === 0`; nothing asserts every discovered eval produced a result, so ANY eval reaching
`process.exit` at module scope truncates CI silently with exit 0 (red-team measured 37/90). Real, and
exactly the hazard T3 guards the near end of — but `evals/run.mjs` is out of `touches:` and the spec
forbids slices editing it. Flag only.

**A17 (reviewer R1 refinement).** The S2 hand-off is "three code sites + one detail-string count + one
fixture", not three: add `:3048` (a second `Object.keys(REKEY_MANIFEST).length` in the detail string)
and FG52 (`:2770-2774`, constructs `{rekey, exists}` and expects `[G6/anchors]`).

## Rejected

**/simplify's "drop the freeze entirely is also coherent".** Rejected on red-team F5's measurement: a
corrupted entry silently greens a real `[G6/consumed]` regression. Deep freeze is the coherent end.

**/simplify m6's "first use of Object.freeze in evals/ is a least-astonishment cost".** Noted in the
PR body as requested, but the seam is the first cross-eval SSOT of its kind; being first is not an
argument against being right.

## FINAL TOOTH SET (3) and BITE-PROOFS (5)

- **T1 contract surface** — exported; non-empty; every key two non-empty dot halves; `Object.isFrozen`
  on the container AND on every non-string entry (with a >0 nested-entry floor so the clause cannot go
  vacuous); anchors `account.identity` + `profile.identity` present; `findIdentityColumns` is a
  function. Phrase: `contract surface frozen`.
- **T2 walker shape + stripper provenance** — synthetic in-memory sources (per file, never
  concatenated), `accessor =` spelling: a real `Identity` and a real `Option<Identity>` returned as
  `{path,type}`; a MULTI-LINE table declared only inside a Rust string literal ABSENT; exact result
  size. Phrases: `walker shape proven`, `string-literal phantom rejected`.
- **T3 import purity** — child process, `argv[1]` set to a sibling `evals/*.mjs`; stdout AND stderr
  empty; exit 0. Phrase: `import is side-effect-free`.

Bite-proofs (orchestrator runs each; commit the eval FIRST, revert only the mutated file):
(a) delete the `export` keyword -> T1 reds · (b) freeze the container but not the entries -> T1 reds ·
(c) `parseTableSchemas(stripRustSource(f.src))` -> `parseTableSchemas(f.src)` at `:1457` -> T2 reds ·
(d) widen the main guard to `path.dirname(...)` equality -> T3 reds · (e) delete the main guard -> T3 reds.
