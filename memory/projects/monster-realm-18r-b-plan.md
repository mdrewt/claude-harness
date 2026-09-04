# 18r-b — plan (citation/pointer truth micro-sweep)

Worktree: `projects/monster-realm/.claude/worktrees/18r-b`, branch `feat/18r-b-citation-truth-sweep`, forked from origin/master `e630386` (master CI green).
Scope: doc/comment-only. No schema, no reducer, no client behaviour. No new ADR (supervisor reserved NONE).
touches: docs/adr/0231-*.md, sim-harness/src/bin/mr_load_driver.rs, ARCHITECTURE.md, AGENTS.md.

## Measured ground truth (HEAD e630386)
- ADR-0231:139-140 cites `main.ts:2756`; :2756 is `onSessionExpired:`. Sole non-comment
  `store.ownAccount(` read in main.ts is :2777 (`?.claimedFrom`); :2773 is its comment.
  `terminalAtMs` occurs 0 times in main.ts. Nothing cites ADR-0231 by line.
- mr_load_driver.rs:80 cites `server-module/src/lib.rs:213-239`; real: `#[spacetimedb::reducer(client_disconnected)]`
  at lib.rs:263, `pub fn on_disconnect` at :264. Sole `213-239` hit in the repo.
  HARD CONSTRAINT: ADR-0232:51 cites `mr_load_driver.rs:76-89` (the whole `# Why WebSocket only (AM25)`
  //! section, 14 lines). ADR-0232 is OUTSIDE touches -> the driver edit MUST be line-count-neutral.
- ARCHITECTURE.md is 2160 lines. `= 0234` entries: :2152 rb-36, :2154 rb-37, :2156 17r-a, :2158 17r-b.
  :2160 is rb-40 (ADR-0235) ending `ADR next-free = 0236` — the TERMINAL pointer is ALREADY correct.
  mr-state.json adr_next_free = 236; docs/adr max = 0235. `grep -c rb-39 ARCHITECTURE.md` = 0 — the one
  surviving defect is the MISSING rb-39 entry. rb-43 (tip) made DIGEST.md the derived next-free SSOT;
  ARCHITECTURE.md:848-852 is the canonical prose about it.
- AGENTS.md:7 says "in three places"; measured FOUR `Pin spacetime` steps (ci.yml:65,143; nightly.yml:167,331),
  each spelling the version twice. No eval reads AGENTS.md.
- Gate hazard: evals/rekey-contract-surface.eval.mjs T4/arch pins `**rb-2**` (:112) and `**rb-3**` (:158),
  each must occur EXACTLY once. `**17r-a**`/`**17r-b**` are NOT `**rb-` markers.

## Decisions
- **D1 (ADR-0231):** rb-36 form — landmark carries the claim (`onClaimResult`'s AUTH-51/D15 claim-rejected
  branch), number as an explicitly dated hint (`main.ts:2777` as of 18r-b). Also strengthen with the
  cheaply-re-derivable fact: main.ts carries ZERO `terminalAtMs`. Keeping a number is deliberate: it gives
  the gate an equality tooth against the derived call site.
- **D2 (driver):** function-name-only, no line number. Replace EXACTLY lines 78-81 with EXACTLY 4 lines;
  76-77 and 82-89 byte-identical. Verified by `git diff --numstat` == `4 4` and by gate arm i3.
- **D3 (ARCHITECTURE.md):** (a) CHRONOLOGICAL insert of the rb-39 entry between :2158 (17r-b) and :2160
  (rb-40) — terminal append would either restate a wrong terminal pointer (0235) or claim a value untrue
  as of rb-39 (0236), and would destroy the correct "last entry's pointer is current" property.
  rb-39's own pointer = `ADR next-free = 0235` (it minted 0234). (b) LEAVE the four `= 0234` historical
  entries; add ONE clause at :852 (rb-43's canonical next-free prose) stating the per-entry notes are
  point-in-time and never back-edited, and DIGEST.md's derived number is the only current one.
  Claim STATUS, not accuracy — the accuracy generalization is NOT measured (:1502=0169 precedes
  :1722=0100, so the log is non-monotonic there). This is the de-enumeration trap.
- **D4 (AGENTS.md):** "four places — two `Pin spacetime` steps in each file, each step spelling the version
  twice (`version install` then `version use`)". Names the oracle so the count is re-checkable.

## Gate: memory/projects/18r-b.gates.mjs (harness-side; 17r-a/17r-b/rb-37 precedent, outside ADR-0224)
Arms i1..i5 + b1. EVERY expected value DERIVED from the live tree; nothing hardcoded.
- i1 ADR-0231: exactly one non-comment `store.ownAccount(` in main.ts -> N; that line takes only
  `?.claimedFrom`; `terminalAtMs` count == 0; the ADR bullet's single `main.ts:(\d+)` hint == N.
  BITE: re-pointing the hint at :2773 (a comment that DOES contain claimedFrom) must RED.
- i2 driver: exactly one `pub fn on_disconnect(`; preceded by `#[spacetimedb::reducer(client_disconnected)]`;
  its body deletes both player and character rows; driver //! block mentions `on_disconnect` and has ZERO
  `server-module/src/lib.rs:<digit>` cites.
- i3 neutrality: ADR-0232's `mr_load_driver.rs:(\d+)-(\d+)` == the section bounds derived from the live driver.
- i4 ARCHITECTURE: `**rb-2**`/`**rb-3**` counts == 1 (T4/arch hazard, attributed locally); `**rb-39**` == 1;
  its slice names ADR-0234 and the residual id parsed from ADR-0234's own `**Slice:**` header;
  `docs/adr/0234-*.md` exists; rb-39's `next-free` == (the ADR number it names)+1;
  indexOf(rb-39) < indexOf(rb-40) (encodes D3a); the LAST `ADR next-free` in the file == max(docs/adr NNNN)+1.
- i5 AGENTS: count `- name: Pin spacetime <V>` steps in both workflows -> P; all V identical; each step
  followed within 5 lines by `version install V` and `version use V`; the bullet says `in <word(P)> places`
  and NO `in <word(k)> places` for k != P.
- Success line printed only after all arms pass; EXPECT substring `B1 CITATION TRUTH OK`.

### What the gate honestly does NOT prove
It cannot prove the English sentences are true — only that the named landmarks exist with the claimed
shape and every surviving number resolves to the derived site. The comment split in main.ts is a `//`
heuristic, not a parser. ADR-0224 bars a new project eval, so the stale-citation CLASS stays ungated in
`just ci` after merge; this slice fixes four instances, it does not close the class (residual R-18rb-NOGATE).

## Anti-patterns (refuse)
1. Re-pointing a bare line number (reproduces the defect on a delay — rb-36's core finding).
2. A gate that greps for the NEW literal text (proves the edit, not the claim).
3. Any net line change inside driver 76-89 (breaks ADR-0232, which I may not edit).
4. Planting `**rb-2**`/`**rb-3**` literals or de-bolding an `**rb-` marker (reds rekey T4/arch).
5. Hand-editing CHANGELOG.md (git-cliff generated).
6. Minting an ADR number (none reserved).
7. De-enumeration trap: shipping "each per-entry pointer was correct at its merge" (NOT measured).
8. Boyscout inflation — the whole slice is prose correction; a fifth stale citation inside touches is a
   NEW ledger item, not a boyscout hunk.

## Tasks
T0 npm ci in worktree/client; confirm toolchain PATH.
T1 write 18r-b.gates.mjs BEFORE any edit; run b1 -> must be RED; capture to gates/18r-b.red-before.md.
   CHECKPOINT A: a gate not RED here is vacuous — fix the gate, not the docs.
T2 item 1 edit; i1 green.
T3 item 2 edit (4-for-4); i2+i3 green; `cargo fmt --check`; clippy -p sim-harness.
   CHECKPOINT B: `git diff --numstat` on the driver == `4 4`.
T4 item 3 edits; i4 green; `just eval` (adr-*/rekey-* evals have NO main guard — direct node invocation
   prints nothing and exits 0, so it is not evidence). CHECKPOINT C.
T5 item 4 edit; i5 then b1 -> success line. CHECKPOINT D: record the exact line for EVIDENCE.
T6 bite-proof sweep (7 mutants) in a scratch copy; restore; re-run b1.
T7 full `just ci` DETACHED (setsid nohup + CI-EXIT marker; a backgrounded wrapper's exit code lies).
T8 mr-gates fill + check; register residuals; commit.

## Residuals to declare (do not fix here)
- R-18rb-M85CCITE — docs/m8.5c-plan.md:85 cites AGENTS.md:8 for a bullet at :7.
- R-18rb-LIBRSCITES — same defect class, UNMEASURED candidates: docs/adr/0230:132,135; 0221:94;
  0054:37,238; docs/m8.7b-plan.md:7,54; m8.7d-plan.md:19; docs/specs/nh2-plan.md:73; 0148:188.
  Most live under docs/adr/** so the class needs a reserved ADR number to close.
- R-18rb-NOGATE — the class stays ungated in `just ci` (ADR-0224).
- R-18rb-LOGORDER — ARCHITECTURE.md:1502 (=0169) precedes :1722 (=0100); unmeasured.

## Right-sizing
ONE mergeable slice, park nothing. ~16-20 changed lines, 4 files, 5-6 hunks, one harness-side gate script.
Workflow: solo implementation + plan lenses + one ARTIFACT red-team scoped to the gate script (the single
failure mode that wastes the slice is a vacuously-green gate).

---

# Plan-review adjudication (reviewer + red-team + /simplify, all three closed)

## reviewer — PASS, no blockers
Fact-checked every replacement sentence against HEAD. `onClaimResult` (main.ts:2767) is real, not
invented; ADR-0234's header fields (Slice rb-39, residual R-rb-22-EO-11, Date 2026-09-03, the G5
receiver-chain Decision, Extends 0179/0195/0224) all verified verbatim; the four `Pin spacetime`
steps each spell the version twice; the driver replacement preserves meaning and //!/em-dash style.
One cosmetic note on the plan's own wording for 3b (moot — 3b is cut below).

## red-team — 2 accepted findings, plus 2 gate-derivation fixes
- **HIGH (MEASURED): the weakened (3b) rule is STILL FALSE.** Tested against all ~65 class members via
  `git log --all -p -- ARCHITECTURE.md`: two per-entry write-ups WERE back-edited by a later unrelated
  slice — **M15a** (added PR #165 `c5fddc4`, rewritten next day by PR #168 `a20507a`) and **ux2**
  (added PR #255 `f8f50cb8`, rewritten 6 days later by PR #273 `9c1f75e7`, +~250 bytes). In both the
  trailing NUMERAL was byte-identical, so only a numeral-scoped claim survives. Also found two more
  non-monotonic adjacent pairs: :1868(11r-h)=0173 -> :1870(11r-f)=0172, and :2146(rb-17)=0218 ->
  :2148(rb-15)=0217.
- **MEDIUM (MEASURED): arm i3 is vacuous against a content swap that preserves the line count.** Built a
  scratch mutant deleting the "Live-verified: join_game returns 200..." sentence ADR-0232 cites as its
  evidence and padding with an inert `//!` line: section still spans 76-89, i3 stays GREEN. The plan's
  only defence was CHECKPOINT B, a MANUAL step.
- LOW-MED: i3 off-by-one — there is a trailing blank `//!` at :90 before the next heading at :91;
  deriving "end = next-heading-1" yields 76-90 and FALSE-REDs.
- LOW: the residual-id parse must be anchored `R-[A-Za-z0-9-]+`, not "up to the next comma"
  (ADR-0234's header is `... R-rb-22-EO-11, ...`).
- Verified SAFE (measured, no action): T4/arch cannot be disturbed (`**rb-2**`'s slice ends at :121,
  `**rb-3**`'s at :169 — ~2000 lines above the insert; rekey-contract-surface is the ONLY eval reading
  ARCHITECTURE.md); ADR-0232:51 is the sole inbound `mr_load_driver.rs:<n>-<n>` cite; nothing cites
  ADR-0231 by line; `scripts/adr-digest.mjs` parses HEADER fields only, so the Consequences edit cannot
  drift the digest; main.ts has exactly 3 `store.ownAccount(` hits, :460/:1354 are comments, :2777 is
  the sole call and reads only `?.claimedFrom`; `terminalAtMs` count 0.

## /simplify — gate is over-built for a ~16-line doc diff
Cut i4's global-next-free + ordering sub-checks and its cross-artifact header parse; tighten i5's
window 5->2-3 lines; replace the N->word converter with a literal map; shorten edits (1) and (3a);
CUT (3b) as unseeded scope creep (ARCHITECTURE.md:848-852 already names DIGEST.md the sole
enumeration, and 3b duplicates residual R-18rb-LOGORDER); 7 mutants -> 5 (one per arm; b1 is a pure
AND, so a dedicated composite mutant buys nothing).

## RULINGS
- **R1. CUT edit (3b) entirely.** Both lenses converge from different directions (false as written /
  unseeded). It was never required: the spec's "advance the prose pointer to match the allocator" is
  ALREADY DISCHARGED at HEAD by rb-40's terminal `= 0236`. The reader-confusion concern is handled
  IN PLACE by one clause inside the rb-39 entry ("...which is why the four entries above it still read
  `ADR next-free = 0234`") — local to the defect, asserts only what 18r-b measured, and states no rule
  over a class. Residual **R-18rb-LOGORDER** carries the unmeasured remainder.
- **R2. ACCEPT the i3 hardening.** Arm i3 additionally byte-compares `mr_load_driver.rs:76-77` and
  `:82-89` against the pre-edit blob (read from `git show origin/master:<path>`), so a content swap
  inside ADR-0232's cited range REDs mechanically instead of relying on a manual checkpoint.
- **R3. ACCEPT** the i3 end-bound derivation (last NON-BLANK `//!` content line before the next `# `
  heading) and the anchored `R-[A-Za-z0-9-]+` residual-id capture.
- **R4. PARTIALLY ACCEPT /simplify on i4.** DROP the `indexOf(rb-39) < indexOf(rb-40)` positional pin —
  it is subsumed. KEEP the derived `last "ADR next-free = N" in the file === max(docs/adr NNNN)+1`:
  that IS the property this slice relies on to justify leaving the four historical entries alone ("a
  reader taking the terminal pointer gets the right number"), it is fully derived, and its one
  false-red mode (an ADR minted with no log entry added) is EXACTLY the defect being fixed — an alarm,
  not noise. KEEP the ADR-0234 header cross-parse (2 lines, anchored per R3) — cheap, and it is a
  cross-artifact derivation rather than a text pin.
- **R5. ACCEPT** i5 window 5->3 lines and the literal `{3:'three',4:'four',5:'five'}` map.
- **R6. ACCEPT the shorter edit (1)** — drop the "carries zero occurrences of `terminalAtMs`" clause:
  it restates the bullet's own "write-only" topic sentence, and the GATE checks the count regardless of
  whether the prose says so (prose written to feed a gate is backwards).
- **R7. ACCEPT the shorter edit (3a)** — drop the `Extends ADR-0179/0195/0224` enumeration (drift
  surface, de-enumeration risk, already in the ADR) and the "does NOT assert" negative list (hedging).
  KEEP a one-clause provenance note (the entry IS a backfill; without it a reader assumes rb-39 wrote
  it) and the `ADR next-free = 0235` point-in-time value.
- **R8. Bite-proofs: 5 mutants, one per arm** (i1 citation-number equality; i2 zero-old-cite; i3 the
  new byte-identity leg, using red-team's measured content-swap mutant; i4 rb-39 count; i5 count/word),
  each must RED with its own named check.

## FINAL EDIT SET (3 files touched, not 4 — AGENTS.md/ARCHITECTURE.md/driver/ADR-0231; 3b removed)
1. ADR-0231 Consequences bullet — landmark + dated hint, no `terminalAtMs` count clause.
2. mr_load_driver.rs — EXACTLY lines 78-81 replaced by EXACTLY 4 lines; 76-77 and 82-89 byte-identical.
3. ARCHITECTURE.md — ONE inserted paragraph (+blank) after :2159; rb-40 stays the file's last line.
4. AGENTS.md:7 — "four places" + the named oracle.

---

# Implementation-review adjudication (reviewer + artifact red-team + reducer-security-auditor)

## reviewer — no blockers, no majors
Re-verified every shipped sentence against the code it describes. `onClaimResult` (main.ts:2767) real;
`main.ts:2777` sole non-comment `store.ownAccount(` read taking only `?.claimedFrom`; `terminalAtMs`
count 0. `on_disconnect` at lib.rs:264 under `#[spacetimedb::reducer(client_disconnected)]`, deletes
character (:274) and player (:275). Every clause of the rb-39 paragraph matches ADR-0234's header
verbatim; "the four entries above it still carry the pre-rb-39 pointer value" verified as exactly four,
all `= 0234`. AGENTS.md wording exact. Diff strictly inside `touches:`; agreed NO boyscout hunks (every
hunk is slice-core); the only new line-citation is the deliberate dated `main.ts:2777` hint.
Method caveat it self-disclosed: no Bash, so it read files rather than running `git diff` — the
orchestrator's own numstat/status checks cover that gap.

## reducer-security-auditor — PASS, 2 nits
Confirms the driver's rewritten claim is accurate on every clause it makes, and that the wider
"HTTP is structurally dead for load" argument still holds (no connection-scoping anywhere in the
module; `on_disconnect` never reads `ctx.connection_id()`, so closing ANY one connection for an
identity tears down that identity's whole live session). Confirms ADR-0232:51's `76-89` citation is
byte-range intact after the edit.
- **Nit 1 (ACTED ON):** the comment omitted `resolve_all_live_interactions` (lib.rs:269), which
  force-resolves live trades / PvP forfeit / wild-battle flee BEFORE the row deletes. Not false (no
  exclusivity was claimed) but it invites the "a stray HTTP call is harmless" misread — a reader could
  silently forfeit a live PvP match. **Fixed in-place, still 4-for-4 line-count-neutral:** lines 80-81
  now read "resolves its live trades/PvP/battles and deletes its presence rows BY IDENTITY"
  ("presence rows" is ADR-0232:49's own vocabulary). `cargo fmt --check` re-run clean; section still 76-89.
- **Nit 2 (residual R-18r-b-ADR0232MECH):** ADR-0232:47-50 misattributes the row deletes to
  `resolve_all_live_interactions`, which performs no row write itself. Outside `touches:`.
- Security observation (residual R-18r-b-DISCONNECTSELF): disconnect side effects are
  client-triggerable on demand — one HTTP call forces trade cancel / PvP forfeit / wild-battle flee for
  that identity without dropping its WebSocket. Self-directed, so not privilege escalation, but a
  token-leak amplifier.

## artifact red-team — 4 MEASURED gate vacuities (b1 GREEN while the claim is FALSE)
All four were reproduced in a scratch copy against the real gate script. Returned to the **tester**
(which owns the gating artifact) to harden — the implementer does not edit gating tests:
1. **[HIGH] i2 body-check is comment-blind** — commenting OUT the delete block in `on_disconnect`
   (leaving the needles inside `//` comments) keeps i2/b1 GREEN while the reducer deletes nothing.
2. **[HIGH] i4 residual-id test is not prefix-free** — `R-rb-22-EO-110` (nonexistent) passes because it
   CONTAINS `R-rb-22-EO-11`. Exactly the prefix-free class this repo's memory already names.
3. **[MED] i1 counts call SITES (lines), not OCCURRENCES** — a second same-line
   `store.ownAccount(identity)?.status` read keeps i1 GREEN while ADR-0231's "sole read ... takes only
   `?.claimedFrom`" becomes literally false.
4. **[MED] the editable window 78-81 has no content-truth coverage** — i3 freezes only the FLANKING
   lines, so swapping the cited path to `server-module/src/trades.rs` (false) keeps i2/i3/b1 GREEN.
   Fix: DERIVE which file actually contains `pub fn on_disconnect` and require the driver cites it.
Confirmed clean by the same pass: all four shipped sentences TRUE at HEAD; the four `= 0234` entries
are exactly four; no inbound citation to `ARCHITECTURE.md:21xx` was falsified by the +2-line insert
(the only nearby ones are frozen historical journal entries already stale from EARLIER slices);
rekey T4/arch keys off marker text, not line numbers, so the insert cannot disturb it; and the
fenced-code-block hint-duplication attack correctly REDs.
[LOW, no action, recorded as a known limit] i5 reads only `{ci,nightly}.yml`, so a `Pin spacetime` step
in a THIRD workflow is invisible — this does not falsify the shipped sentence, which is scoped to
exactly those two files.
