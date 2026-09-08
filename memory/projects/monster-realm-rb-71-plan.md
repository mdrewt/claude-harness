# rb-71 — plan (PLAN phase checkpoint)

Slice: **rb-71** · residual **R-18r-b-B1** (source slice 18r-b) · branch
`feat/rb-71-m85c-citation` · worktree `.claude/worktrees/rb-71` · from `origin/master@92882d0`.

## 1. The defect, as MEASURED (not as promoted)

`docs/m8.5c-plan.md:85` reads:

```
- **Doc reconciliation (sanctioned, minimal):** `AGENTS.md:8` and `.github/PULL_REQUEST_TEMPLATE.md:5` both
```

and continues on `:86-88` with `FALSELY claim `just ci` includes "coverage + mutation" ... Correct
both to state exactly what `just ci` enforces vs what the nightly enforces.`

| # | Fact | Evidence |
|---|---|---|
| F1 | The cited bullet is AGENTS.md's `- **Done =**` bullet | corroborated by `docs/m8.5c-plan.md:93`, which names this the "Done-line reconciliation" |
| F2 | The citation was CORRECT when written | at m8.5c's own commit `9c8521a` (2026-06-27) the `Done =` bullet was at `AGENTS.md:8` |
| F3 | It drifted to **`AGENTS.md:9`** | commit `3c94216` (2026-08-16, ADR-0197) inserted the SpacetimeDB-versions bullet at line 7; verified stable at `:9` across all 4 revisions since |
| F4 | **The promoted residual text is WRONG** | the residual, the `rb-71` spec section and the seeded ledger `Scope:` all say the bullet "actually lives at `AGENTS.md:7`". It does not. `AGENTS.md:7` is the ADR-0197 bullet; `AGENTS.md:8` is `- **Run:**`. Neither mentions coverage/mutation. Applying `:7` would ship a NEW wrong citation. |
| F5 | `- **Done =**` occurs EXACTLY ONCE in AGENTS.md | `AGENTS.md:9`; other `Done =` hits are prose in `docs/adr/0050-*.md:25,111` (different file) |
| F6 | `docs/m8.5c-plan.md:85` is the repo's ONLY `AGENTS.md:<n>` citation | repo-wide grep |
| F7 | `.github/PULL_REQUEST_TEMPLATE.md:5` is still CORRECT | do not touch it |
| F8 | Nothing cites `m8.5c-plan.md:<n>` | so editing that file is line-safe |
| F9 | No eval reads `docs/m8.5c-plan.md`; `**Done =**` is pinned by no eval | so the doc edit trips no marker gate (rb-36's "doc prose about a pinned marker breaks it" hazard verified INAPPLICABLE) |

## 2. Decision 1 — fix form: landmark anchor + a GATED line number

Two live doctrines conflict: rb-36's landmark+dated-hint (`ARCHITECTURE.md:2214`) is a convention
nothing enforces; rb-67/ADR-0230's "never a file-and-line pair" (`docs/adr/0230-*.md:112-116`) is
scoped to Rust *declarations* and self-declares that `.md` targets ride through it (`:266-267`).

**Synthesis shipped here: keep the number, add the landmark, and make a shipped tooth re-derive the
number from the landmark at test time.** A markdown bullet marker resolves to a unique line, so
unlike a Rust declaration buried in a 6000-line file the number is mechanically re-derivable — a
gated number cannot drift silently, it REDs. This is strictly stronger than either precedent and is
what makes the criterion EARS-testable at all.

The number must NEVER be hand-typed a second time (in the test or elsewhere) — a second copy drifts
in lockstep and proves nothing (the rb-68 lesson).

## 3. Decision 2 — oracle

Placement is FORCED to `sim-harness/src/bin/mr_load_driver.rs`, in a NEW `#[cfg(test)] mod
rb71_doc_citation_tests` appended at **EOF**:

- a new `evals/*.eval.mjs` is barred by ADR-0224, and growing an existing eval likewise;
- a new `.mjs` test is not auto-discovered — `just test` enumerates exactly two node files, so
  wiring one in needs `justfile`, which is OUTSIDE `touches:` (hidden-dependency STOP);
- `cargo nextest run --workspace` DOES auto-discover Rust tests, and this driver is IN `touches:`;
- a new file under `sim-harness/src/bin/` would become another BIN target (cargo auto-discovery);
- the existing `mod tests` at `:2650` is tester-frozen (`:2639`: "The implementer NEVER edits this
  module") — hence a separate module;
- `docs/adr/0232-*.md:51` cites `mr_load_driver.rs:76-89` and ADR-0232 is OUTSIDE `touches:` —
  appending at EOF shifts nothing.

Files are read with `concat!(env!("CARGO_MANIFEST_DIR"), "/../AGENTS.md")` — the
`server-module/src/pvp_tests.rs:1245,1650` idiom, one level up (`CARGO_MANIFEST_DIR` is
`sim-harness/`). `sim-harness` depends only on `game-core` (`Cargo.toml:7-8`) → std-only,
hand-rolled parsing, no regex crate, **no new dependency**.

### Seam A — `rb71_violations(plan_md, agents_md) -> Vec<String>`

Non-short-circuiting labelled collector (rb-68/rb-67 precedent), so one RED shows every violated
clause and no tooth is shadowed by first-failure-wins.

| Leg | Rule | Label | Kills |
|---|---|---|---|
| A | count of `agents_md` lines starting `- **Done =**` must be 1 | `[anchor/missing]` / `[anchor/not-unique]` | bullet deleted / duplicated |
| B | census ALL `AGENTS.md:` occurrences in `plan_md` whose preceding char is not alphanumeric, `/` or `.`; count must be exactly 1 | `[cite/count]` | path typo (→0), repointed at the harness `../../AGENTS.md` (→0), decoy 2nd citation (→2) |
| C | digit run after that token compared by **equality** to leg A's 1-based index | `[cite/line-mismatch]` | `:7`, `:8`, `:10`, any future insertion above `:9` |
| D | the Doc-reconciliation bullet block (from the `**Doc reconciliation` line to the next `^- **` or `^## `) must contain `**Done =**` | `[anchor/doc-missing]` | "fix the number, drop the landmark" regression |
| E | non-emptiness floors: both inputs non-empty, `agents_md` has >= the anchor index lines, block non-empty | `[doc/empty]` | vacuous pass on a gutted/missing file |

### Seam B — `rb71_claim_violations(plan_md, agents_md) -> Vec<String>`

Derives from the RESOLVED AGENTS.md line the parenthetical immediately following the first
`just ci`, then a two-sided conditional:

- `[claim/stale-tense]` — that parenthetical does NOT name coverage/mutation (live: it reads
  `(lint + typecheck + test + eval + security + client checks)`; `mutation + coverage` appear only
  after the `; the nightly workflow` clause) AND the plan block still says `FALSELY claim`.
- `[claim/premature-past]` — it DOES name them AND the plan block carries the past-tense marker.

The conditional is what makes this a CORRESPONDENCE rather than a text pin: if AGENTS.md ever
regresses and re-attributes coverage/mutation to `just ci`, the tooth flips polarity and demands the
present-tense prose back. Honest limit, to be disclosed in the docblock: the presence half alone is
a needle.

### Shipped tests

- **T1** `rb71_m85c_cites_the_live_done_bullet_line` — live files through seam A. RED before
  (`[cite/line-mismatch]`), GREEN after.
- **T2** `rb71_m85c_bullet_matches_the_live_ci_inventory` — live files through seam B. RED before
  (`[claim/stale-tense]`), GREEN after. A SEPARATE `#[test]` so first-failure-wins cannot shadow T1.
- **T3** `rb71_citation_oracle_control` — synthetic fixtures ONLY, never reads the live tree
  (rb-67 precedent: GREEN before AND after). `#[track_caller]` helpers, every fixture asserted **by
  exact label**, plus a `FIXTURE_FLOOR >= 12` roster count so fixtures cannot be quietly deleted.

## 4. Proof of teeth — mutants the suite MUST kill

| # | Mutant | Killed by |
|---|---|---|
| M1 | citation reverted to `AGENTS.md:8` (the RED-before state) | T1 `[cite/line-mismatch]` |
| M2 | citation set to `AGENTS.md:7` (**the residual's own wrong text**) | T1 `[cite/line-mismatch]` |
| M3 | citation set to `AGENTS.md:10` | T1 `[cite/line-mismatch]` |
| M4 | path typo `AGENT.md:9` / `AGENTS.MD:9` | T1 `[cite/count]` (0) |
| M5 | repointed at the harness `../../AGENTS.md:9` | T1 `[cite/count]` (0, preceding-char rule) |
| M6 | a 2nd `AGENTS.md:9` decoy pasted elsewhere in the plan doc | T1 `[cite/count]` (2) |
| M7 | AGENTS.md `- **Done =**` bullet deleted | T1 `[anchor/missing]` |
| M8 | AGENTS.md bullet duplicated | T1 `[anchor/not-unique]` |
| M9 | a bullet inserted above `AGENTS.md:9`, citation unchanged (**the exact drift being fixed**) | T1 `[cite/line-mismatch]` |
| M10 | landmark stripped, bare `AGENTS.md:9` kept | T1 `[anchor/doc-missing]` |
| M11 | number fixed, present-tense `FALSELY claim` prose left in place | T2 `[claim/stale-tense]` |
| M12 | AGENTS.md `just ci` parenthetical re-gains `coverage`, doc stays past-tense | T2 `[claim/premature-past]` |
| M13 | collector body replaced by `Vec::new()` (oracle gutted) | T3 — every label fixture reds |
| M14 | `read_to_string(..).expect()` → `unwrap_or_default()` with AGENTS.md absent | leg E `[doc/empty]` — must RED, never pass |

**M15 is a review rule, not a mutant:** the test must never hardcode `9`.

## 5. Anti-patterns to avoid (measured classes in this corpus)

1. Presence-only needle (`plan.contains("AGENTS.md")`) — passes on every wrong number. Compare
   integers by equality against a DERIVED value.
2. First-hit anchor — never `find()` the first `AGENTS.md:`; census all and require exactly one.
3. Substring decoy — the preceding-char guard is what stops the real, existing harness file
   `../../AGENTS.md:` satisfying the census.
4. Vacuous-on-missing-file — `.expect(<loud message>)` plus the leg-E floors; never
   `unwrap_or_default`.
5. First-failure shadowing — non-short-circuiting collector, three separate `#[test]`s,
   `#[track_caller]` helpers.
6. A second hand-typed literal — derive the line number AND the `just ci` inventory at test time.
7. ADR-0224 — no new eval, no extra clause bolted onto an existing one.
8. Line-drift collateral — append at EOF only (`docs/adr/0232-*.md:51` pins `:76-89`).
9. `cargo clippy --all-targets -D warnings` — the `#[allow]` at `:2649` does NOT cover a new module.
10. nextest prints its summary on **stderr** — every CHECK needs `2>&1` and must pin the PASSED
    COUNT, not merely the word "passed".

## 6. Decision 3 — ADR: do NOT mint 244 (collision)

The supervisor assigned ADR **244**. That number is **already taken and merged**:
`docs/adr/0244-cascade-differential-oracle-for-shell-reachability.md` (rb-9, merged `b1b4ff6`, four
commits before this branch point). `ARCHITECTURE.md:2253,2255,2257` all record **ADR next-free =
0245**. Minting an unreserved 0245 races a sibling merge (a measured hazard).

Per the rb-15/17/18/36/37/68/70 precedent — rb-70's ledger `D-C` is this situation verbatim — **no
number is minted.** The ruling is recorded in the `ARCHITECTURE.md` rb-71 entry, which is in
`touches:`. Zero dependency added, zero production pattern added → ADR-0224 minimalism says the
entry suffices. Flagged to the supervisor in the PR body.

## 7. Boy-Scout (inside `touches:`, ~1 hunk)

`docs/m8.5c-plan.md:86` carries a SECOND stale citation of the same defect class: "justfile
`ci:80`". The `ci` recipe is at `justfile:709` and its dependency list has since gained
`observability-validate`. De-line it (name the recipe, drop the number) and correct the
enumeration, in the same hunk. No second gated citation for it — YAGNI, and `justfile` is outside
`touches:`.

**None** in `ARCHITECTURE.md`, `docs/adr/0231-*.md` or `mr_load_driver.rs` (18r-b already landed the
landmark form at `docs/adr/0231-*.md:142-143`; any other driver edit risks the ADR-0232 range).

## 8. Ordered steps

- **S1 — oracle (RED).** New `mod rb71_doc_citation_tests` at EOF of the driver. Measure and record
  the RED.
- **S2 — citation fix (GREEN).** `docs/m8.5c-plan.md:85-88` per §2, incl. the tense correction and
  the `ci:80` boy-scout.
- **S3 — record.** `ARCHITECTURE.md` rb-71 entry: the residual-text correction, the citation-doctrine
  synthesis, the ADR-244 collision + next-free 0245, the `**Done =**`-is-unpinned verification, the
  mutant results, and the residuals.

## 9. Residuals to disclose

- **R-rb71-TESTHOME** — a docs-correspondence test lives in a load-driver bin because `touches:` +
  ADR-0224 + `justfile`-outside-scope leave no better home. A future slice with `justfile` in
  `touches:` should relocate it to a `scripts/*.test.mjs` wired into `just test`.
- **R-rb71-RESIDUALTEXT** — the harness-side ledger `Scope:` and the `rb-71` spec section still say
  `AGENTS.md:7`. Both are in the HARNESS repo, not the project.

## 10. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Implementer follows the residual text and ships `:7` | T1 derives the number; G3 mutates to `:7` and requires a kill |
| R2 | ADR-244 collision | do not mint; record in ARCHITECTURE; next-free = 0245 |
| R3 | Driver edit shifts `:76-89` | append at EOF only; gate G6 |
| R4 | clippy `-D warnings` on the new module | no `assertions_on_constants`, no `needless_range_loop` |
| R5 | Wrong home for a docs test | disclosed as R-rb71-TESTHOME |
| R6 | T2's presence leg is a needle | disclosed in the docblock; the derived conditional is the load-bearing half |

---

## 11. Plan-review deltas (reviewer + red-team + /simplify, applied)

**Not a finding.** The reviewer's "BLOCKER B1" (a leftover `rb71_probe_tests` module in the
worktree) was a TORN READ of the red-team's in-flight experiment #7, which ran concurrently and
restored the file. Re-verified after both lenses closed: `git status` empty, `git diff origin/master
HEAD` empty, driver at 6053 lines, zero `rb71` symbols in the tree.

| # | Lens | Finding | Applied |
|---|---|---|---|
| D1 | red-team HIGH #1 | Only 4 of the 14 planned mutants were mechanically gated. A "leg-C-only" oracle passes all 7 original gates while blind to M4-M12/M14. | **New gate G8** — a 10-mutant label matrix, each asserted BY ITS OWN LABEL. |
| D2 | both, HIGH | G2's re-derivation regex had no preceding-char guard and MEASURABLY false-passed `../../AGENTS.md:9` (the real harness file) — zero backstop for the exact class it reinforces. | G2 regex now carries a negative lookbehind `(?<![A-Za-z0-9/._~-])`. |
| D3 | red-team MED #3 | G3/G4 restored the tree once at the end, no `try/finally`; a SIGKILL leaves a mutant — including in production source — in the tree. | G3/G4/G8 moved into `memory/projects/rb-71.gates.mjs` (the 18r-b precedent): every mutation in `try/finally`, and each mode re-asserts `git status --porcelain` is EMPTY after restoring. |
| D4 | red-team MED #4 | G4 read "non-zero exit" as KILLED — but a COMPILE error from the gut substitution also exits non-zero, masking that the control assertions never ran. Also coupled to an unstated variable name. | The runner rejects `error[E`/`could not compile` explicitly. **PINNED:** the collector's local accumulator MUST be named `found`, and `// RB71-GUT-POINT` must sit after `let mut found: Vec<String> = Vec::new();` and before any push, so the substitution type-checks. |
| D5 | red-team LOW #5 | Leg B's guard excluded alphanumeric/`/`/`.` but not `_`, `-`, `~`, or markdown link text. | Guard widened to `[A-Za-z0-9/._~-]` in BOTH the Rust leg B and G2. |
| D6 | reviewer M2 | "rb-70's D-C is this situation verbatim" is imprecise — rb-70 had NO number assigned; rb-71 has one assigned that is already taken and merged. | Re-worded: the REMEDY generalizes from rb-70's D-C; the root cause differs. |
| D7 | reviewer m1 | Seam B (the tense correction) is additive beyond the ledger's literal criterion. | **Kept, and disclosed.** /simplify judged it load-bearing, not scope creep: fixing only the number makes the citation resolve CORRECTLY to a bullet the very same sentence then describes FALSELY — strictly worse than the status quo. Now gated by G8/M11+M12 so it is not an unpinned prose change. |
| D8 | reviewer m2 | "the parenthetical immediately following the first `just ci`" is loose — the live text has "green and meaningful" between the token and the paren. | Restated: the FIRST parenthesised group on the anchor line, at or after the `just ci` token. |
| D9 | red-team #10 | R4's clippy risk named `assertions_on_constants`, which cannot fire (M15 forces the number to be derived at runtime). | Real default-level risks for hand-rolled `.lines()`/`.chars()` parsing: `needless_range_loop`, `manual_strip`, `comparison_chain`. |

**Independently CONFIRMED by both lenses (no action):** every fact F1-F9; that
`cargo nextest run --workspace` really does execute a `#[cfg(test)]` module appended at EOF of a
`src/bin/*.rs` target (red-team #7 measured it RED with a canary); that the promoted residual's `:7`
is wrong and `:9` is right (red-team #8 walked `git log -p --follow`); that nextest exits 4 with
"no tests to run" on a zero-match `-E` filter, so G1 cannot pass with the tests deleted (red-team
#6); that ADR-0244 is really taken and 0245 really free; and that an EOF append cannot shift
ADR-0232's cited `:76-89` (red-team #9).

**/simplify verdict: no structural cut.** Zero new dependencies (`sim-harness` depends only on
`game-core`; std-only parsing), so no dependency ADR is owed. The nearest in-tree precedent for this
exact problem shape, `server-module/src/privacy_tests.rs` `rb67p_adr_violations` +
`rb67p_adr0220_citation_oracle_control`, spans ~900 lines; rb-71's ~250-line design is smaller than
its precedent, and the red-team's headline finding was that the gates were too FEW.
