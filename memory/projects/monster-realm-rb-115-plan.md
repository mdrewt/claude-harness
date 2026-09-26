# rb-115 plan — REV 2 (2026-09-26) — REV 1 + plan reviewer (APPROVE-WITH-CHANGES: 0 BLOCKER, 2 MAJOR, 9 MINOR) + plan red-team (0 BLOCKER, 3 MAJOR, 8 MINOR; MEASURED the §2 bytes + §3b re-freezes in a scratch copy: 1031/1031 and 1032/1032 GREEN, census list complete, knowledge anchors unmoved, 44 source-scanning evals unchanged) + /simplify

## REV 2 resolutions (each overrides the REV 1 text below where they conflict)

**R2-1 (reviewer M2 + red-team MAJOR 1 — the tripwire claim is over-stated; REWORD everywhere).** Truncation needs the 16 oldest window stamps to total ≤ 255 rows, so it needs a stamp of **≤ 15 rows** (16 × 16 = 256 fills the window with no 17th stamp), not "fewer than 17". MEASURED (red-team model): with a 15-row minimum 45 of 20 000 ticks bound, with a 16-row minimum 0. Sources of a short stamp: pre-rb-86 torn leftovers, bundles minted by an OLDER module with a smaller `EXPORTERS` set, out-of-band owner SQL deletes. `due > planned` is ONE-DIRECTIONAL evidence about order: a range read that INTERLEAVES stamps can produce it, but a reversed-yet-grouped (descending) read of ≥ 16-row bundles NEVER does (MEASURED: 0 of 20 000 descending trials, 12 073 of 20 000 shuffled). So: "under the modelled ascending yield, `due > planned` implies a stamp of ≤ 15 rows or a read that interleaves stamps; it can reveal, but cannot rule out, a non-ascending yield." DELETE "first production-side tripwire for R-rb-109-ORDERMODEL" and "invariant breach" from §0.1, §2e, §6 D4, §7 and the ARCHITECTURE paragraph. Finding 2's direction, stated precisely (CORRECTED by the doc-keeper's fact-check): `reaped < read ⇒ truncated` holds in ANY order — equivalently (contrapositive) `not truncated ⇒ reaped ≥ read`, because an untruncated tick deletes every stamp the window holds and therefore every window row. What NEEDS the ascending yield is the CONVERSE `truncated ⇒ reaped < read` (i.e. reading `reaped ≥ read` as not-truncated): under a descending grouped read P1 (16 × 15-row stamps + a 31-row oldest) is truncated with `reaped == read == 256`. Also: the seam pass costs TWO sorts (plan_export_reap's and the stamps') plus one dedup, not one sort. `due` counts STAMPS, not bundles: pre-rb-111 shared stamps stay alive until about 2026-10-02 (R-rb-111-LEGACYSTAMP).

**R2-2 (red-team MAJOR 2 — the EARS proof needs a THREE-COUNT twin).** On the ascending native host the OLD record already decides truncation by inference (`reaped < read`), so T2's A/B twin only shows `planned` alone is ambiguous. The literal proof that the three-count record is insufficient is two populations with BYTE-IDENTICAL three counts and different `due`: **A** = 20 expired × 13 rows (+2 live) → `(256, 16, 208)`, due **20**; **A′** = 16 expired × 13 rows + ONE newest expired 60-row bundle → window = 208 + 48 rows → `(256, 16, 208)`, due **17** (MEASURED by the red-team). New clause **`[rb115/three-count-twin]`** in T2: `(read, planned, reaped)` equal across A and A′ while `due` differs, so NO function of the three counts yields it. A′ is ragged, so it needs an `rb115_` seeding helper (rb109_seed_population seeds uniform sizes and its chunk ids `1 + 1000·i + k` collide across two calls; the rb115 helper takes `&[(owner, stamp, chunks)]`, assigns chunk ids from one monotone counter, and seeds through `rb109_table`'s handle in the same shape as rb109_row). X7 / ADR / ARCHITECTURE wording: "on the ascending host the old record already decides WHETHER truncation happened; `due` is the direct, order-independent observation of HOW MANY stamps the window held, which no function of the three counts can recover (A vs A′)". The exactly-16-vs-truncated INDISTINGUISHABILITY is real only off the ascending order (P1 = 16 × 15 rows + a 31-row oldest vs P2 = 15 × 16 rows + a 16-row oldest under a descending read both give `(256, 16, 256)`, due 17 vs 16) — state it in the ADR, do NOT test it (R2-5).

**R2-3 (red-team MAJOR 3 + reviewer M1 — close the truncation half, DEFER the window-edge half EXPLICITLY).** The ledger scope names BOTH halves ("planned==16 …" and "read==256 may still have drained …"). `due` resolves the first (and the rb-87 "twenty stamps of five chunks" low-read case) and is BLIND to the second by construction (taken over the window; on the live tree `due == planned` on every well-formed tick, so it never shows a partly drained window there). Resolution: an acceptance gate **`X8`** is seeded in the ledger for the drained-vs-partial half (an X-id: mr-gates lint counts any non-X id as a seeded criterion and blocks a >50% deferred ratio) and **`DEFER: X8 -> backlog`** with the mechanism + candidate design (the supervisor mints `R-rb-115-X8` from that line — the established DEFER-derived id shape, cf. R-rb-86-X9 → rb-113 — do NOT also `residuals add` it, or two rows describe one thing). Severity **MED** (it is the live-tree backlog question). Every doc says "R-rb-87-BACKLOGAMBIG closed on the truncation half; the window-edge half is R-rb-115-X8, open" and NO doc says the record is now a complete backlog signal; T4 pins `R-rb-115-X8` + the phrase `stays open` in ADR-0269, the rb-115 span of ADR-0238 and the `**rb-115**` ARCHITECTURE line, and bans `closes R-rb-115-X8` / `R-rb-115-X8 closed` in the same spans (the `[rb111/doc-tickbound-open]` idiom; same treatment for `R-rb-109-ORDERMODEL stays open`). On live data `due` is a TRIPWIRE, not a backlog signal; consecutive `read == EXPORT_REAP_MAX_READ_PER_TICK` ticks remain the backlog heuristic (rb-87 X10 alarm item).

**R2-4 (reviewer M-5 / red-team 9 — two more privacy.rs retruths, both line-neutral, above :1881).** (a) :1830–1831 "capped at `max_stamps`: the tick's write bound" is half-true once the count passes `rows.len()` → "capped at `max_stamps` — the tick's write bound when the helper calls it, the window's own length when the count does". (b) :1700 `no range scan and no writes` (count 1) joins the stale-needle list: the host models the range read and the index-point delete since rb-109. §3a T4 `[rb115/prod-stale-claim]` needles (each pre 1 → post 0): `three-count record`, `HINT, never a proof`, `THREE RAW COUNTS`, `HINT, not a proof`, `stand for all three`, `no range scan and no writes`. Record comment: define `due` as WINDOW-SCOPED ("that window holds", never "the store owes").

**R2-5 (/simplify + reviewer M-3 + red-team 7 — drop the order-model tests).** DELETE `[rb115/model-inference]` (kills nothing `[rb115/count-order]` does not; `rb86_window` sorts ascending then truncates, so it cannot build the descending window as written) and do NOT add the red-team's `[rb115/grouped-order-blind]` — both are disclosures, and the ADR carries the arithmetic. Also drop the plan's "no `rb115_` fn name may contain `due`" rule (red-team 6: it contradicts T2's own name; no clause counts a bare `due`); keep the `count_export_reap_stamps` half of that rule.

**R2-6 (reviewer MINOR 1, 2, 4; red-team 10 — T1/T2 rows and the mutant register).** T1 gains a row with a NON-shipped `ttl_ms` (precedent privacy_tests.rs:8500–8509), so a count body that hard-codes `EXPORT_BUNDLE_TTL_MS` reds by value. T2 gains tick **C** = `(20 expired, 0 live, 5 chunks)` → exactly `(100, 16, 80, 20)` — the rb-87 residual's own "twenty expired stamps of five chunks" case (ADR-0238:583–584), the only tick-level counterexample to "`read < cap` ⇒ drained" without `due`. T2 tick B keeps a WINDOWEDGE disclosure: 4 expired bundles (68 rows) survive while `due == planned == 16`. Register gains: `due: planned` (tail), `due: rows.len()` (tail), count ignoring its `ttl_ms` parameter; and an EQUIVALENTS list killed only by the equality pins (disclosed, not counted as teeth): cap `usize::MAX` / `rows.len() + 1` / the READ cap (T1's 300-row kill works only because a test may pass > 256 rows), helper calling `count_export_reap_stamps(&rows, cutoff, 0)`, the `let due` binding moved below the delete loop.

**R2-7 (red-team 4 — paren-less seam spellings).** `(plan_export_reap_stamps)(…)` and `let f = plan_export_reap_stamps; f(…)` add 0 to the `plan_export_reap_stamps(` count and are clippy-clean (MEASURED). `[rb115/seam-sites]` therefore counts BOTH the paren form == 3 and the bare identifier == 3 over squashed privacy.rs (pre 2 / 2), attributed per body: declaration 1 + `rb85_helper_body` 1 + the count body 1 (each body is equality-pinned, so no decoy fits the arithmetic). Drop the plan's redundant file-wide-only spelling.

**R2-8 (reviewer M-6 / red-team 5 — the line budget above :16799, MEASURED).** A single `concat!` element for the new helper statement wraps under rustfmt to +5 / +4 lines; the TWO-element spelling stays flat at +2 / +2: `concat!("letdue=count_export_reap", "_stamps(&rows,now_ms,").to_string(),` then `"EXPORT_BUNDLE_TTL_MS);".to_string(),` (and the analogous two lines in `rb85_helper_body_source`, spelled independently). Absorb the +4 by condensing the flat-twin note at :11871–11877 (it restates :11862–11869) — keep the M17 rationale at :11826–11833 intact; the rb-115 pin note is ONE line, detail lives in the T3 doc. Never delete rationale to hit a count; FALLBACK if the budget cannot be met: re-point ADR-0265:55 and :298 in place (docs/adr/** is in touches) and say so in the PR. X4 anchors on the FIRST line mentioning `[rb86/stamp-cap-throughput]`, so no re-freeze text above :16799 may quote that label. Inbound citations into privacy_tests.rs below :11800: only ADR-0265:55 and :298 (mr_load_driver.rs:6595 cites :10996, unaffected).

**R2-9 (reviewer MINOR 7, 8, 9; red-team 11 — gates, stage 4, rb109, rosters).** X3 lists FOURTEEN edited tests: the ten in §5 plus `rb109_oversized_tick_is_bounded_and_reaps_the_oldest_bundles_whole`, `rb109_stamp_cap_binds_when_the_window_holds_more_than_sixteen_stamps`, `rb111_one_tick_reaps_sixteen_whole_bundles_from_a_same_millisecond_burst`, `rb85_new_seams_declared_once_private_with_frozen_signatures`. Stage 4 is scoped to ASSERTION-bearing re-freezes only (message-only edits and compiler-forced arity edits cannot red a clause of their own). rb109's stamp-cap test destructures `due` to `_` at :22363 — leave it (its label roster is closed at 36; T2 tick A asserts `due == 20` on the identical population) and say so in `rb109_tick`'s doc. T5's dependency roster adds `rb87_reap_line_is_the_exact_json_envelope`, `rb87_reap_fields_is_pure`, `rb48_privacy_has_exactly_one_cfg_attribute` (the backstop against a `#[cfg]` twin of the new fn) and the five re-frozen `rb109_` tuple tests. Document the tuple-order mismatch in BOTH fixture docs: `rb87_tick(read, due, planned, reaped)` (record order) vs `rb109_tick → (read, planned, reaped, due)` (append-only, R4). `mr-gates check --slice rb-115 --timeout 2400` from the worktree (X2 exceeds the 120 s default).

**R2-10 (red-team 8 — T4 vacuity closures).** `[rb115/doc-split-token]` gets per-document FLOORS (0 == 0 must not pass); `[rb115/doc-closure]`'s co-occurrence clause is scoped to the rb-115 amendment SPAN of ADR-0238 (from the `## Amendment (` line carrying whole-token `rb-115` to the next `## ` or EOF), not file-wide; WINDOWEDGE/ORDERMODEL "stays open" + closes-ban per R2-3.

**R2-11 (reviewer NITs + ADR header).** Keep `**Extends:** 0238` — rationale is "ungated prose drift (the rb-110 amendment's five self-citations :752–761) plus lineage consistency with 0267/0268", not a gate break (the only `include_str!` readers of 0238, privacy_tests.rs:23314 and :26449, never use line numbers). Superseded-sentences list adds ADR-0238:545–546 (the three-key fragment). Re-check `docs/adr/0269-*` is still free at commit time (reservation races). Clippy in the fast gate runs `--all-targets --all-features` (the red-team's clean run omitted `dev_reducers`).

**R2-12 (/simplify verdict on §2 + §3a).** §2 is the smallest SSOT-preserving shape: one one-line pure fn, one field, two builder calls, one binding, one tail field; no new dependency, no new pattern beyond ADR-0269. §3a stays at FIVE tests (T1 pure value table + order + vs-plan; T2 native-host ticks A, A′, B, C; T3 source pins; T4 docs census; T5 closed roster); the one new test helper family is the rb115 ragged seeder (+ `rb115_tick_over`), justified by A′. Nothing else is added.

### Reusable red-team scratch (`/tmp/rb-115/redteam/`): `patch_prod.py` (the §2 production patch with `assert count == 1` replacements — the orchestrator's RED-stage starting point, to be UPDATED for R2-1/R2-4 wording), `squash.py` (a Python port of the strip/squash pipeline for pre-checking pins), `privacy.pristine.rs` (== 584cce2), `twin.py` / `sim.py` (the tick models behind R2-1/R2-2).

---
--- REV 1 below (superseded where REV 2 says so) ---

# rb-115 plan — REV 1 (2026-09-26) — planner (opus) output

Slice rb-115 (promoted residual **R-rb-87-BACKLOGAMBIG**, source rb-87). Worktree `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-115`, branch `rb-115` from origin/master @584cce2. ADR reserved: **0269** (FREE at 584cce2). File name FINAL (T4 `include_str!`s it): `docs/adr/0269-rb115-export-reap-tick-reports-pre-truncation-stamp-count.md`.

Baseline MEASURED on the worktree @584cce2 (2026-09-26): `cargo nextest run -p monster-realm-module --run-ignored all` → **1031 passed**; `--features dev_reducers` → **1032**. Target after the slice: 1036 / 1037 (+5 rb115_ tests).

Task 0 MEASURED (orchestrator, `rustfmt --edition 2021` on a scratch file): the §2 production bytes below are rustfmt-canonical (no diff) — the new fn stays flat (signature 85 cols, call args 32 cols), the helper's new statement stays flat (76 cols, 35 cols of args), the record and `reap_fields` as spelled.

Touches: `server-module/src/privacy.rs`, `server-module/src/privacy_tests.rs`, `docs/adr/0269-*.md` (new), `docs/adr/0238-*.md` (body amendment ONLY — no header line), `ARCHITECTURE.md` (one `**rb-115**` paragraph), `docs/knowledge/**` (regen, expect zero diff). touches-delta: `docs/adr/DIGEST.md` (`just adr-digest`).
NOT touched (hidden dependency → STOP): schema.rs, native_host_tests.rs, observability.rs, evals/**, client/**, ops/**, docs/adr/README.md, CHANGELOG.md.

---

## §0 Ground truth (MEASURED unless marked otherwise)

### `privacy.rs` (2074 lines)

| Item | Line(s) |
|---|---|
| Reaper section banner | :1688–1709 |
| Stale claim in the banner: "native test host models no table scan, no range scan and no writes" (false since rb-109) | :1700 |
| Stamp-cap comment already stating "a 256-row window in ascending stamp order holds at most fifteen whole bundles and one straddler" | :1733–1735 |
| `EXPORT_MIN_BUNDLE_ROWS = EXPORTERS.len()` (= 17, pinned by rb107 :19834 and rb111 :25649) | :1767 |
| `plan_export_reap` | :1805–1820 |
| `plan_export_reap_stamps`, frozen | :1839–1856 |
| Reducer comment | :1858–1879 |
| `#[spacetimedb::reducer]` / `pub fn export_bundle_reaper(` | :1880 / :1881 |
| Record comment | :1894–1914 |
| `ExportReapTick` (derive at :1915) | :1916–1920 |
| `reap_fields` | :1931–1941 |
| `export_reap_cutoff_ms` | :1949–1951 |
| Helper comment | :1953–2019 |
| `reap_expired_export_bundles` (seam call at :2030–2035, tail at :2041–2045) | :2020–2046 |
| Arm | :2051 |
| `#[path]` trailer | :2072–2074 |

Every sentence that must be retruthed, each measured at raw count 1:
- :1705 `three-count record`
- :1876 `HINT, never a proof`
- :1899 `THREE RAW COUNTS`
- :1906 `HINT, not a proof`
- :1910 `R-rb-87-BACKLOGAMBIG` (its only occurrence in the file)
- :2019 `stand for all three`

Inbound citations and anchors:
- **`privacy.rs:<line>` citations elsewhere.** Every accurate one points at ≤ :1565. ADR-0265:219 cites `:1832` and is already stale history (R-rb-111-ADRCITE). So code inserted below :1881 drifts no live citation.
- **`docs/knowledge` anchors.** Three: `#L1793` (schedule table), `#L1559` (request_data_export) and `#L1881` (the reducer). If every edit above :1881 is line-count-neutral, none of them moves.

### `privacy_tests.rs` (EOF :26986)

| Pin | Lines |
|---|---|
| rb85 helper-body pin: `,);` target, flat twin, source control | :11834–11856 / :11878–11884 / :11947–11975 (docs :11805–11833, :11858–11877) |
| `rb85_new_seams…` message "private three-count `ExportReapTick`" | :13484 |
| `[rb85/helper-body-exact]` message "THREE-COUNT TICK RECORD" | :13598–13615 |
| `[rb85/helper-name-tests]`: tests name `reap_expired_export_bundles` once, paren and paren-less | :14448–14474 |
| rb86 seam needles / signature + body pins / `rb86_plan` (the one test-side call) | :15061–15068 / :15133–15174 / :15279 |
| rb86 kills-doc "a second caller of the seam … → `[rb86/seam-scope]`" | :16450–16452 |
| `[rb86/seam-scope]` privacy.rs == 2; tests == 1; every other crate file 0 | :16709–16716 / :16717–16726 / :16727–16749 |
| `[rb86/stamp-cap-throughput]`, the ADR-0265 citation anchor (`16 × min_bundle ≥ 256`) | :16799–16812 |
| `[rb86/cap-wiring]` (unchanged under this design) | :16818–16857 |
| rb87 section header (names BACKLOGAMBIG) | :17286–17342 (:17310–17319) |
| `rb87_tick_fields_pin` / `rb87_tick_decl_source` | :17362 / :17370 |
| `rb87_fields_body_pin` / `…_source` | :17401 / :17426 |
| `rb87_nd_tick_tail` / `rb87_tick(read, planned, reaped)` | :17487 / :17526 |
| rb87 value table (5 rows) and quote census `== 6` | :17562–17586 / :17608–17618 |
| rb87 envelope rows, and message "four-key line" | :17653–17662 / :17677 |
| rb87 `[rb87/tick-shape]` | :17795–17804 |
| rb87 `[rb87/fields-body-exact]` | :17947–17960 |
| `rb87_helper_reports_the_whole_tick`: control rows / `let` control `==5` / constant bans / tail / `let` census `==5` | :18011–18026 / :18039 / :18050–18066 / :18069–18079 / :18094 |
| rb87 rosters, closed at 8 tests and 23 helpers | :18566 / :18586 |

rb-109:
- **`rb109_tick`.** Declared at :21664. It returns a 3-tuple and is the only place the test file names the helper. `[rb109/tick-owner]` at :23199–23216 pins that ownership.
- **Tuple use sites:** :21942, :22078–22086 `(85usize, 5, 85)`, :22155 `Vec<(usize, usize, usize)>`, :22195, :22246–22253, :22266–22274, :22363. Also one in rb111, at :25724.
- **The stamp-cap test (:22345).** 22 bundles × 13 chunks gives a tick of (256, 16, 208) with **20** distinct stamps in the window.
- **The oversized test (:21886).** 17-chunk bundles give (256, 16, 272) with exactly 16 stamps in the window.
- **Rosters:** :22739 (8 tests), :22759 (17 helpers), :22795 (3 dependencies), :22881 (36 labels).

rb-110 and rb-111:
- **`[rb110/no-alias]` (:23993–24019)** counts, over squashed privacy.rs: READ cap 3, STAMPS cap 2, `EXPORT_REAP_MAX_` family 5.
- **`[rb110/doc-*]` (:24139–24144)** sets per-document floors and ceilings on the retired name `EXPORT_REAP_MAX_DELETE_PER_TICK`. ARCHITECTURE.md is at its ceiling (2 of 2) and ADR-0238 has 3 lines against a ceiling of 4. New docs must never spell that name.
- **rb111 docs test (:26496).** Bans `or every bundle` and `same millisecond` in privacy.rs. Reads a span of ADR-0238 from `## Amendment (2026-09-25, rb-111` to the next `## ` heading. Finds the ARCHITECTURE line beginning `**rb-111**`.
- **`rb111_test_span` (:25048).** Ends a test's span at `\n#[test]`, `\n    #[test]` or `\n// ===`. An rb-115 block appended after an opening banner cleanly terminates the span of `rb111_test_roster_is_closed`.

### Docs
- **ADR-0238.** Header :3–10, no `Amended-by`. Amendments at :252, :273, :394, :513 (rb-87), :651, :739 (rb-110), :774 (rb-111, last).
- **ADR-0238 rb-87 amendment** HINT/BACKLOGAMBIG sentences at :579–586.
- **ADR-0238 rb-110 amendment** cites its own line numbers `:59/:302/:423/:437/:537`, so any header insert makes all five stale.
- **ARCHITECTURE.md.** rb-87 paragraph :2297 names BACKLOGAMBIG twice. rb-111's paragraph is :2311, `## M24` is :2313.
- **Subsystem vocabulary is fixed** (`scripts/adr-digest.mjs:22–33`): use `schema-persistence, security-authz` (same as 0238 and 0268).
- **`**Amends:**` would force a reciprocal `**Amended-by:**`** in the target's header block (adr-digest.mjs:43, :212–216).

### An arithmetic finding: verified, and larger than the brief assumed
1. **Truncation cannot bind on the live tree.** For 17+ distinct stamps in a 256-row window read in ascending order, the first 16 stamps lie wholly inside it, needing 16 × 17 + 1 = 273 rows (> 256). In general `truncate(16)` binds only when `STAMPS × MIN_BUNDLE_ROWS < READ` — the exact negation of `[rb86/stamp-cap-throughput]` (:16804). While that test is green, **`due == planned` on every tick over bundles this module writes, when the range read arrives in ascending key order.** `due > planned` on a live tick therefore means something is broken: a stamp holds fewer than 17 rows (pre-rb-86 torn leftovers only), or the range read did not arrive in ascending key order — a live violation of R-rb-109-ORDERMODEL. So `due` is also the first production-side tripwire for R-rb-109-ORDERMODEL.
2. **The three counts already encoded truncation, by inference.** Under the ascending model, truncated ⇔ `reaped < read`: if truncated, the 16 oldest stamps lie wholly inside the window and a 17th stamp's row is also inside, so `reaped ≤ read − 1`; if not truncated, every row in the window is deleted, so `reaped ≥ read`. (Cross-checked against rb109: stamp-cap 256/16/208 truncated, reaped < read; oversized 256/16/272 not truncated, reaped ≥ read.) The residual's "planned==16 may be exactly-sixteen" is true of `planned` alone but not of the full record. What `due` really adds is a *direct, order-independent* observation in place of an inference that rests on ascending order. The ADR must say this plainly.
3. **The window-edge ambiguity is not resolved.** When `read == 256` and every stamp was planned, expired rows may still lie beyond the window. The rb-109 oversized population is exactly this case: 4 expired bundles remain after a tick of 256/16/272, with `due` 16 and `planned` 16. This is **R-rb-115-X8** (§7).

---

## §1 Design decision: Design A, with four refinements

**Chosen design.** A new private pure fn runs the frozen seam uncapped:

```rust
fn count_export_reap_stamps(rows: &[(u64, i64)], now_ms: i64, ttl_ms: i64) -> usize {
    plan_export_reap_stamps(rows, now_ms, ttl_ms, rows.len()).len()
}
```

| | A (chosen) | B: wrapper that truncates itself | C: independent recount |
|---|---|---|---|
| SSOT | The seam is the only definition of the stamp set | Kept | **Broken**: a second definition of the bundle set |
| Frozen seam | Signature and body untouched | The seam's `max_stamps` becomes dead in production, contradicting :1830–1831 | Untouched |
| Pins moved | `[rb86/seam-scope]` 2→3 (attributed), helper pin, rb87 tail + `let` census 5→6 | `[rb86/cap-wiring]` reds; the cap moves; more pins | Fewest pins, but SSOT-blocked |
| `.iter()` / `.count()` censuses | 3 / 2, unchanged | Unchanged | High risk of an iterator chain |
| Native-host execution | Pure fn directly executable; helper runs via `rb109_tick` | Same | Same |

**Refinements.**
- **R1: placement.** New fn directly **above the helper**, between `export_reap_cutoff_ms` (:1951) and the helper comment (:1953). Everything lands below :1881, so the three knowledge anchors stay fixed. The 24-byte window before the new fn is the cutoff's `.saturating_sub(ttl_ms)}`, before the helper it becomes `…rows.len()).len()}`. Neither contains `pub` or `#[`.
- **R2: field name `due` in data-flow order**: `read, due, planned, reaped`. `stamps` collides with the helper's local; `expired` reads as rows. Data-flow order keeps the bytes above `fnreap_fields(` as `…planned:usize,reaped:usize,}` and `reap_fields` still ends `…tick.reaped);out}`, so the :13400–13405 doc stays true. Line: `{"evt":"export_bundle_reap","read":256,"due":16,"planned":16,"reaped":272}`. Nothing consumes it yet (ADR-0238:591).
- **R3: the helper binds `let due = …` right after `.collect();`**, before `let stamps`, over exactly `&rows, now_ms, EXPORT_BUNDLE_TTL_MS`. The reducer shell stays byte-identical.
- **R4: `rb109_tick` widens to a 4-tuple with `due` LAST**: `(read, planned, reaped, due)`. Stays the only test-side call site (no re-attribution of `[rb85/helper-name-tests]` / `[rb109/tick-owner]`). `due` last because the drain test reads `.0/.1/.2` by position (:22169–22179); a mid-tuple insert compiles and silently re-points `tick.2`.

**Header: `**Extends:** 0238`, not `**Amends:**`** (rb-110/rb-111 precedent; `Amends` forces `**Amended-by:** 0269` into 0238's header, shifting every line and staling the rb-110 amendment's five self-citations). The "amends the lineage" semantics are carried by 0238's dated body amendment with its superseded-sentences list.

---

## §2 Exact production bytes (rustfmt-canonical — MEASURED by Task 0)

**2a. Record (:1915–1920).** Squashed field span: `read:usize,due:usize,planned:usize,reaped:usize,`
```rust
#[derive(Debug, Clone, Copy)]
struct ExportReapTick {
    read: usize,
    due: usize,
    planned: usize,
    reaped: usize,
}
```

**2b. `reap_fields`.** Insert after the `read` pair:
```rust
    json_field_into(&mut out, &mut first, stringify!(due));
    json_usize_into(&mut out, tick.due);
```
Squashed body: `letmutout=String::new();letmutfirst=true;json_field_into(&mutout,&mutfirst,stringify!(read));json_usize_into(&mutout,tick.read);json_field_into(&mutout,&mutfirst,stringify!(due));json_usize_into(&mutout,tick.due);json_field_into(&mutout,&mutfirst,stringify!(planned));json_usize_into(&mutout,tick.planned);json_field_into(&mutout,&mutfirst,stringify!(reaped));json_usize_into(&mutout,tick.reaped);out`

**2c. New fn, inserted at :1952** (flat; no trailing-comma twin).
Squashed signature: `fncount_export_reap_stamps(rows:&[(u64,i64)],now_ms:i64,ttl_ms:i64)->usize`
Squashed body: `plan_export_reap_stamps(rows,now_ms,ttl_ms,rows.len()).len()`
Comment intent (~6 lines, no `"`, no residual id, no cross-file claim): the window's DISTINCT expired creation stamps BEFORE the write bound, computed by the bundle seam above with a cap it cannot reach (the window's own length), so there is no second expiry rule and no second set definition. PURE and ONE LINE; the result is only ever a count, never a plan.

**2d. Helper.** Insert `    let due = count_export_reap_stamps(&rows, now_ms, EXPORT_BUNDLE_TTL_MS);` after :2029 (the `.collect();`). Tail becomes `ExportReapTick {\n read: rows.len(),\n due,\n planned,\n reaped,\n }`. The flat-twin target `EXPORT_REAP_MAX_STAMPS_PER_TICK,);` still occurs exactly once.
Full squashed pin: `letcutoff=export_reap_cutoff_ms(now_ms,EXPORT_BUNDLE_TTL_MS);letrows:Vec<(u64,i64)>=ctx.db.export_bundle().created_at_ms().filter(..=cutoff).take(EXPORT_REAP_MAX_READ_PER_TICK).map(|c|(c.chunk_id,c.created_at_ms)).collect();letdue=count_export_reap_stamps(&rows,now_ms,EXPORT_BUNDLE_TTL_MS);letstamps=plan_export_reap_stamps(&rows,now_ms,EXPORT_BUNDLE_TTL_MS,EXPORT_REAP_MAX_STAMPS_PER_TICK,);letplanned=stamps.len();letmutreaped=0usize;forstampinstamps{reaped+=ctx.db.export_bundle().created_at_ms().delete(stamp)asusize;}ExportReapTick{read:rows.len(),due,planned,reaped,}`

**2e. Comment retruths.** No `"`, no `same millisecond` / `or every bundle`, no retired read-cap name, no *new* residual ids.

| Lines | Constraint | Intent |
|---|---|---|
| :1697–1708 (banner) | line-neutral | **Boy-scout:** "the native test host models no table scan, no range scan and no writes" → the host models the range read and the index-point delete (rb-109), never a table scan. Name the three pure seams. "three-count record" → four raw counts (rb-87, widened by rb-115, ADR-0269). Drop the "privacy_tests.rs pins BY VALUE" meta-claim. |
| :1875 (second half) – :1879 (reducer) | line-neutral | Replace the HINT sentence: the tick reports its stamp count before the write bound beside what it planned, so a binding cap is observed rather than inferred. A FULL read window says nothing about rows past its edge; only a tick that read less than a full window and planned every stamp it saw has drained every row expired at its instant. |
| :1899–1910 (record) | may grow | FOUR RAW COUNTS: define `due`. Keep the rejected-`backlog`-flag sentence. `due > planned` is the cap binding. While the throughput floor holds (16 minimum bundles ≥ the read window), that cannot happen for bundles this module writes, so on a live tick it flags a short stamp or a range read not in key order. Remove `R-rb-87-BACKLOGAMBIG`. |
| :2014–2019 (helper) | may grow | Add `due` to the list; drop "stand for all three". |

---

## §3 Test suite, re-freeze list, census hunt

**Hygiene for every new line.** Block at EOF (after :26986) under a flush-left `// ===` rb-115 banner. `//` comments only, no `"` inside any comment. None of `/*`, `*/`, `r#`, `log::`, print/`dbg!` macros, `\"`. Every production identifier inside a needle split with `concat!`. No `[rb115/…]` label in a doc comment. Do not quote other slices' labels. New helpers `rb115_*` only (rb87/rb109/rb110/rb111 helper rosters are closed). No `rb115_` fn name may contain `count_export_reap_stamps` or `due`. Never spell `reap_expired_export_bundles` or `plan_export_reap_stamps` in code — go through `rb109_tick` and `rb86_plan`. `count_export_reap_stamps` named in code exactly once, in `rb115_count`. Never a bare `due` needle: use `letdue=`, `,due,`, `tick.due`, `stringify!(due)` or `due:usize,`.

### 3a. New tests: 5 → suite 1031/1032 → 1036/1037

**T1 `rb115_count_is_the_distinct_expired_stamps_before_the_cap`** (pure, through `rb115_count`)
- `[rb115/count-value]` value table (now = 1_760_000_000_000; ttl = shipped constant), expected values from the spec:

| Row | Expected | Kills |
|---|---|---|
| Empty window | 0 | — |
| All-live window (3 stamps at cutoff+1..3, 17 rows each) | 0 | ignore-expiry |
| One expired bundle of 17 rows | 1 | `rows.len()`, `plan_export_reap(..).len()`, `0` |
| 16 expired stamps × 16 rows | 16 | — |
| 19×13 + 9 rows = 20 expired stamps | 20 | **`X = capped plan`** |
| 3 expired + 2 live stamps | 3 | — |
| A stamp exactly at the cutoff counts; cutoff+1 does not | 1 | — |
| 300 single-row expired stamps | 300 | READ-cap mutant |
| `now=i64::MAX`, created `i64::MIN` / `now=i64::MIN`, created `i64::MAX` | 1 / 0, no panic | — |

- `[rb115/count-order]`: the 20-stamp window reversed and interleaved still gives 20 (kills dedup-without-sort).
- `[rb115/count-vs-plan]`: on the 16- and 20-stamp rows, `rb86_plan(.., 16).len()` is 16 in both while the count gives 16 vs 20.
- `[rb115/model-inference]` (default include, ~40 lines): a test-local tick under a DESCENDING yield — one 200-row oldest bundle plus 19 × 13-row bundles; the window is the 256 newest rows → `due` 20, `planned` 16, `reaped` 395 ≥ `read` 256: the three-count inference says not-truncated and is wrong, `due` is right. Ascending yield of the same population gives (256, 6, 265, 6). Reuse `rb86_bundle_rows` and `rb86_window`.

**T2 `rb115_one_tick_reports_due_beside_planned_for_a_capped_and_an_exact_window`** (native host; the EARS proof)
- Helper `rb115_tick_over(expired, live, chunks, payload)` acquires `fixture()` INSIDE itself (`FIXTURE_LOCK` is non-reentrant); seeds via `rb109_table`, `rb109_bundles`, `rb109_seed_population`; returns `rb109_tick`.
- `[rb115/tick-sizing]`: constants are (256, 16, 17), else a re-derive message.
- `[rb115/tick-capped]`: A = `(20 exp, 2 live, 13 chunks)` → exactly `(256, 16, 208, 20)`.
- `[rb115/tick-exact]`: B = `(20, 6, 17)` → exactly `(256, 16, 272, 16)`.
- `[rb115/twin]`: `(read, planned)` equal across A and B while `due` differs.
- `[rb115/tick-bounds]`: both ticks `planned == min(due, cap)` and `due ≤ read`.
- `[rb115/tick-inference]` (disclosure): `A.reaped < A.read` and `B.reaped ≥ B.read` under this ascending host.

**T3 `rb115_count_is_declared_once_private_frozen_and_wired`** (source pins)
- `[rb115/count-decl]`: `fncount_export_reap_stamps(` once. `[rb115/count-vis]`: 24-byte window has no `pub`/`#[`. `[rb115/count-control]` + `[rb115/count-blind]`: pins satisfiable against independently spelled `rb115_count_decl_source`/`rb115_count_body_source`, blind to prose. `[rb115/count-sig]` + `[rb115/count-body]`: equality (kills capped-plan, read-cap, Design-C, `usize::MAX` — the last value-equivalent, disclosed). `[rb115/count-named]`: privacy.rs paren and paren-less counts both 2; test file squashed 1 and 1. `[rb115/seam-sites]`: `plan_export_reap_stamps(` named 3× file-wide == declaration 1 + helper body 1 + count body 1 (the attribution for 2→3). `[rb115/helper-binding]`: the whole statement `letdue=count_export_reap_stamps(&rows,now_ms,EXPORT_BUNDLE_TTL_MS);` once, `letdue=` once. `[rb115/same-window]`: the helper's count-call arg list equals the first three seam args `&rows,now_ms,EXPORT_BUNDLE_TTL_MS`.

**T4 `rb115_docs_record_the_pre_truncation_count`**
- Compute every number first; full dossier in the first clause's message.
- `[rb115/prod-residual-closed]`: privacy.rs names `R-rb-87-BACKLOGAMBIG` 0× (pre 1). `[rb115/prod-stale-claim]`: the five §0 raw needles each 0× (pre 1). `[rb115/doc-adr]`: ADR-0269 names `count_export_reap_stamps`, `R-rb-87-BACKLOGAMBIG`, `R-rb-115-X8`, `**Extends:** 0238`, `**Amends:** —`. `[rb115/doc-closure]`: ADR-0238 has a line starting `## Amendment (` carrying whole-token `rb-115` (no date pin); some line carries both `R-rb-87-BACKLOGAMBIG` and whole-token `rb-115` (line-scoped because :586 already names the residual). `[rb115/doc-arch]`: a line starting `**rb-115**` names `ADR-0269` and `R-rb-87-BACKLOGAMBIG`. `[rb115/doc-windowedge]`: ADR-0269 whole, the rb-115 amendment span of 0238, and the rb-115 ARCHITECTURE line each contain `R-rb-115-X8` (presence only). `[rb115/doc-split-token]`: raw count == identifier-only count for `count_export_reap_stamps` and `ExportReapTick` per document.

**T5 `rb115_test_roster_is_closed`** (rb111 shape): `[rb115/roster-vacuity]`, `[rb115/roster-dup]`, `[rb115/roster-name]`, `[rb115/roster-closed]`, `[rb115/decl-total]` (squashed `fnrb115_` count == tests + helpers), `[rb115/label-census]` + `[rb115/label-total]` (via `rb111_test_span` + `rb115_labels_in`), `[rb115/body-floor]` (no `if` opener, no `iffalse{`, span ≥ 300). Dependency roster: `rb85_helper_body_exact`, `rb85_helper_is_never_named_outside_privacy_rs`, `rb86_reaper_deletes_whole_bundles_by_stamp_and_never_by_chunk_id`, `rb86_bundle_cap_is_sixteen_and_the_read_cap_is_unchanged`, `rb87_reap_fields_renders_three_bare_counts`, `rb87_tick_record_declared_once_private_with_frozen_shape`, `rb87_helper_reports_the_whole_tick`, `rb109_test_roster_is_closed`, `rb22p_scan_hygiene`.

### 3b. Re-freeze list

**Above :16799 (LINE-NEUTRAL; X4 gates it):**
1. :11834–11856 `rb85_helper_body_pin`: insert the `letdue=…;` element after :11845 (split with `concat!`), ~+2 lines; tail :11853 → `…Tick{read:rows.len(),due,planned,reaped,}`.
2. :11947–11975 `rb85_helper_body_source`: add the source line after :11961 and `due,` at :11972, spelled INDEPENDENTLY of 1.
3. Absorb 1–2 (~+4 lines) by condensing the rb-87 notes at :11826–11833 and :11871–11877 into one rb-87 + rb-115 note (records twin-target uniqueness; no new twin).
4. :13484 "three-count" → "four-count"; :13611–13613 gains the `due` binding and field (message-only, line-neutral).
5. :16450–16452 doc: "a second caller" → "an unattributed (fourth) caller".
6. :16709–16716 `[rb86/seam-scope]` 2 → 3, message rewritten in the same 5 lines (declaration + capped helper call + the one uncapped count call; cites `[rb115/seam-sites]`; "FOUR or more…").

**Below :16832 (growth allowed):**
- rb87: `rb87_tick_fields_pin` (:17363), `rb87_tick_decl_source` (+`"    due: usize,\n"`), `rb87_fields_body_pin` + `_source` (+ the `due` pair, independent spellings), `rb87_nd_tick_tail` (:17488), `rb87_tick(read, due, planned, reaped)` (:17526). Value rows (:17562–17586): `(0,0,0,0)`, `(7,5,3,11)`, `(256,20,16,4096)`, `(4_294_967_296,…297,…298,…299)`, all `usize::MAX`. Quote census 6 → 8, fixture `(12,23,34,56)` (EIGHT / TEN quoted count / SIX missing key). Envelope rows four keys; "four-key" → "five-key". `[rb87/tick-shape]` → four raw fields, a FIFTH field or verdict still rejected; `[rb87/tick-blind]`, `[rb87/fields-body-exact]` → four pairs. Section header :17310–17319: BACKLOGAMBIG closed by rb-115.
- `rb87_helper_reports_the_whole_tick`: control + live `let` census 5 → 6 (message lists the new binding; attribution in `[rb115/helper-binding]`); add a `due:0` row to the control table and the `[rb87/no-constant-tick]` loop; tail message lists three bindings. Test NAME keeps "three" (cited at ADR-0238:622); doc line notes it.
- rb109: `rb109_tick` returns `(tick.read, tick.planned, tick.reaped, tick.due)` (doc: due-last); :21942 and :22363 destructure `(…, _)`; :22081 → `(85usize, 5, 85, 5)`; :22155 → 4-tuple type; :22195 → `[(256,16,272,16),(68,4,68,4),(0,0,0,0)]`; :22249, :22269 → `(0usize,0,0,0)`; messages → 4-tuple wording.
- rb111 :25724 destructures `(read, planned, reaped, _)`.

### 3c. Census hunt (every scan that walks the changed bodies)
**Helper body (`rb85_helper_body`):** moves — `rb85_helper_body_exact` (equality), `rb87_helper_reports_the_whole_tick` (tail needle, two `let` censuses, new `due:0` rows). Unchanged (new statement has no left-bounded `if`/`break`/`continue`/`return`, no `?`, no brace, no index reach, no `.take(`/`.filter(`/`.iter()`/`.count()`): `rb85_reaper_reads…` (range-inclusive, take-adjacent, iter-scope); `rb86_reaper_deletes…` (delete args, depth 1, `if` 0, `break`/`continue` 0, `return` 0, stamp-index 2, sender 0); `rb86_bundle_cap…` (cap-wiring seam args, `.take(` args); `[rb111/index-reach]` helper 2. `m22s4_call_arg_lists(helper, "plan_export_reap_stamps(")` cannot match `count_export_reap_stamps(`.
**Reducer body (`rb48_reaper_body`) byte-identical:** `[X9/now-scope]` 1, `rb48_reaper_body_exact`, `rb87_reaper_emits_one_terminal_observation` (`?` 0, returns 0, diverging 0) unchanged.
**Whole-file privacy.rs unchanged:** `.iter()` 3, `.count()` 2, `now_ms(` 2, `#[cfg` 1, one quote pair, hygiene bans, export_bundle accessor census 10, filter chain 2, index reach 3, mr_log 2, evt partition, `reap_expired_export_bundles` 2, `EXPORT_REAP_MAX_*` family 3/2/5. The single count that moves: `plan_export_reap_stamps(` 2 → 3.
**Outside privacy_tests.rs:** accounts_tests.rs, evolution_tests.rs, rb74_citation_tests.rs scan privacy.rs for unrelated needles; evals only mark `pub fn export_bundle_reaper(` (unchanged); no ops/evals consumer of the line. Nightly `mutate-server` cap (324, `justfile:177`) gains two mutants on the new fn (returns 0 / returns 1); T1 kills both.

---

## §4 RED stages and mutant register
Record at `memory/projects/gates/rb-115.red-before.md`. Patch from a pristine copy of privacy.rs with every replacement asserting count == 1. Never `git checkout`/`git stash`; sleep ≥ 1 s between mutants. Plain `cargo nextest … --no-fail-fast` (dead-code warnings expected; `-D warnings` would make them errors).
- **Stage 0.** Doc-keeper drafts ADR-0269 (T3/T4 `include_str!` it).
- **Stage 2: build RED.** Full tester patch on the unfixed tree: E0425 in `rb115_count`, E0609 on `tick.due` in `rb109_tick`, E0560 on `due` in `rb87_tick` (ASSUMED counts).
- **Stage 1': runtime RED.** Compile shim only (`due` field, helper tail `due: 0`, count fn returning 0). Predicted first clauses: T1 `[rb115/count-value]` one-bundle 0 vs 1; T2 `[rb115/tick-capped]` due 0 vs 20; T3 `[rb115/count-body]`; T4 `[rb115/prod-residual-closed]` 1; `[rb85/helper-body-exact]`; `[rb86/seam-scope]` 2 vs 3; `[rb87/fields-value]` 3 keys; `[rb87/line-exact]`, `[rb87/fields-body-exact]`; `[rb87/no-constant-tick]` (`due:0`); `[rb109/expired-exact]`, `[rb109/drain-sequence]`; T5 GREEN.
- **Stage 3 (deciding).** Full production + docs patch, count body = the three-count information content `plan_export_reap_stamps(rows, now_ms, ttl_ms, EXPORT_REAP_MAX_STAMPS_PER_TICK).len()` (`due == planned`). Predicted RED: T1 20-stamp row 16 vs 20; T2 `[rb115/tick-capped]` + `[rb115/twin]`; T3 `[rb115/count-body]`; `[rb110/no-alias]` stamps 2 → 3. Everything else GREEN.

| # | Edit | Predicted first-failing clause(s) |
|---|---|---|
| 3b | Helper `let due = stamps.len();` after truncation | `[rb85/helper-body-exact]`, T2, `[rb115/count-named]` 1≠2 |
| 3c | Count body `rows.len()` | T1 one-bundle 17≠1, T2, `[rb86/seam-scope]` 2, `[rb109/expired-exact]` |
| 3d | Count body `0` | T1, T2, rb109 tuple sites |
| 3e | Tail `due: 0` | `[rb87/no-constant-tick]`, T2 |
| 3f | Encoders for `due` and `planned` transposed | `[rb87/fields-value]` row 2 |
| 3g | `reap_fields` unchanged (line not threaded) | `[rb87/fields-value]`, quote census 6 vs 8 |
| 3h | Count ignores expiry (own loop, sort, dedup) | T1 all-live 3≠0, T3, `[rb86/seam-scope]` |
| 3i | Count capped at the READ cap | T1 300-row (256), `[rb110/no-alias]` READ 3→4 |
| 3j | Helper passes `cutoff` as `now_ms` | T2 (0), `[rb115/same-window]` |
| 3k | Equivalent: `usize::MAX` cap | T3 `[rb115/count-body]` only (disclosed) |

- **Stage 4.** On the fixed tree, revert each §3b re-freeze one at a time; each must red its own clause.
- **GREEN.** Zero test edits. Clippy `-D warnings` clean, `cargo fmt --check` clean, 1036/1037.

---

## §5 X-gates (mirror rb-111; `PATH=…` prefix accepted; no `||`; no CHECK echoes its EXPECT)
- **X1 [rb-115 teeth].** nextest `-E` with the five exact `test(=privacy::privacy_tests::rb115_…)` names, `2>&1 | tail -3`. EXPECT `/Summary \[[^\]]*\] 5 tests run: 5 passed, [0-9]+ skipped/`.
- **X2 [non-regression].** rb-111's `node -e` spawnSync script (stdout+stderr joined); default `1036 tests run: 1036 passed, 0 skipped`, dev_reducers `1037 … 1037 passed, 0 skipped`; prints `rb115-X2:SUITE-GREEN|RED`. EXPECT `rb115-X2:SUITE-GREEN`.
- **X3 [re-frozen pins still bite].** Ten tests by exact name: `rb85_helper_body_exact`, `rb86_reaper_deletes_whole_bundles_by_stamp_and_never_by_chunk_id`, `rb87_reap_fields_renders_three_bare_counts`, `rb87_reap_line_is_the_exact_json_envelope`, `rb87_tick_record_declared_once_private_with_frozen_shape`, `rb87_reap_fields_is_pure`, `rb87_helper_reports_the_whole_tick`, `rb109_tick_deletes_exactly_the_expired_set_including_the_cutoff_stamp`, `rb109_repeated_ticks_drain_to_the_live_set`, `rb109_zero_expired_and_empty_tables_report_a_zero_tick`. EXPECT `/Summary \[[^\]]*\] 10 tests run: 10 passed, [0-9]+ skipped/`.
- **X4 [ADR-0265 anchor].** rb-111 X4 `node -e`, printing `rb115-X4:CITATION-RESOLVES`.
- **X5.** `just knowledge-check 2>&1 | tail -2`, EXPECT `okf-export: bundle in sync (no drift)`.
- **X6.** `just adr-digest-check 2>&1 | tail -1`, EXPECT `adr-digest: DIGEST.md is up-to-date (no drift).`
- **X7 [RED before, GREEN after].** MANUAL; EVIDENCE = the stage-3 summary line in `rb-115.red-before.md:<line>`.

---

## §6 Docs
**ADR-0269** `0269-rb115-export-reap-tick-reports-pre-truncation-stamp-count.md`. Header: Status Accepted; Date = slice UTC date (confirm at commit); Slice rb-115 (residual R-rb-87-BACKLOGAMBIG, promoted from rb-87; M-residual-backlog.spec.md#rb-115); Supersedes —; **Amends —; Extends 0238**; Subsystems `schema-persistence, security-authz`. Decision (≤240 chars, measure): "export_bundle_reaper's tick record gains `due`: the window's distinct expired stamps BEFORE the stamp cap, from a pure count_export_reap_stamps running the frozen bundle seam uncapped; due > planned means the cap bound." Context: the rb-87 record + disclosed ambiguity; the frozen seam; ADR-0224. Findings: §0 findings 1 and 2 stated plainly. Decisions D1 (pure count fn, SSOT + idiom, `rows.len()` mirrors `plan_export_reap(rows, …, rows.len())`), D2 (field, position, helper binding — same window/instant/TTL), D3 (fragment + line shape), D4 (operator semantics: `due > planned` = cap bound = on shipped constants an invariant breach → live tripwire for R-rb-109-ORDERMODEL and short stamps; `read < 256` with `due == planned` = everything expired at that instant drained; `read == 256` silent past the edge), D5 (seam namings 2 → 3; the only uncapped caller consumes with `.len()`, never plans), D6 (`rb109_tick` widened, due last). Rejected: B; C; reshaping the seam; `backlog: bool`; `.take(257)` peek (changes the read bound + ~six pins); `max_stamps + 1` (boolean not count); deriving truncation from `reaped < read` (order-dependent); `usize::MAX`; `Amends`. Consequences: one more uncapped seam pass per hourly tick over ≤256 rows (≤ ~65k `contains` + one sort, negligible next to 16 point deletes); the line grows by one bare number; natural first ops alerts `due > planned` and N consecutive `read == 256` belong to the rb-87 X10 alarm backlog item. Confirmation: the 5 tests, §3b re-freezes, RED record path.

**ADR-0238 amendment.** Append after rb-111's as `## Amendment (<date>, rb-115 — residual R-rb-87-BACKLOGAMBIG closed)`, no header edit. What ships (ADR-0269 **Extends** this record). **Superseded sentences** (listed, none edited): rb-87 HINT/backlog passage :579–586; "Three RAW counts, never a derived verdict" :535–539; the three-key line composition :552; rb-111's "sharpens the backlog HINT … without changing its shape" :801–803. What does not change: the seam, the reducer shell, both bounds, the absence of any verdict. Honest bounds: the tripwire arithmetic and **R-rb-115-X8** (open). Proof paragraph. Must not spell `EXPORT_REAP_MAX_DELETE_PER_TICK`.

**ARCHITECTURE.md.** New `**rb-115**` paragraph after :2311, before `## M24`, rb-111 house style: ADR-0269 **Extends** 0238; one production file, zero schema/reducer-roster/native-host/client/eval change; what ships + bounds incl. tripwire and WINDOWEDGE; the rb-87 paragraph's BACKLOGAMBIG clause is rb-87 history, superseded here; proof, suite counts, DIGEST touches-delta. No retired read-cap name.

---

## §7 Residuals (register AFTER the lenses; `mr-gates residuals add` is not upsert)
- **R-rb-115-X8 (LOW).** Mechanism: a tick that reads a full window (`read == EXPORT_REAP_MAX_READ_PER_TICK`) and plans every stamp it saw cannot say whether expired rows remain past the window's edge; `due` is taken over the window and inherits that blindness. Measured case: the rb-109 oversized population, 256/16/272 with `due` 16, still leaves 4 expired bundles. Candidate fix: after the deletes, one probe `ctx.db.export_bundle().created_at_ms().filter(..=cutoff).next().is_some()` reported as a raw observation (one range syscall, ≤ one buffer fill; the native host already models it); re-freezes `[rb85/range-census]`, `[rb86/stamp-index-reaches]`/`[rb111/index-reach]`, the helper body pin. Zero-cost interim: an ops rule on consecutive full-window ticks.
- No new ADRCITE drift (everything lands below every accurate privacy.rs citation).
- **R-rb-109-ORDERMODEL** stays open; gains a production tripwire (`due > planned`) but is not closed.

## §8 Open questions (recommended default in bold)
1. Proceed given the three counts already implied truncation under the ascending model? **Yes** — direct, order-independent count + tripwire; the ADR states the finding.
2. Field name: **`due`** (runner-up `eligible`).
3. Order: **data-flow `read, due, planned, reaped`**; `rb109_tick` tuple puts `due` last.
4. Header: **Extends 0238** + body amendment.
5. Keep `[rb115/model-inference]`? **Keep** (~40 lines); drop if /simplify objects.
6. Rename `rb87_reap_fields_renders_three_bare_counts`? **No**; doc note.
7. Execute the tick: **widen `rb109_tick`** rather than a second helper call site.
8. Reducer-security-auditor: **light pass** (aggregate count, no subject; PRV1-17/20).

## §9 Tasks, in order
1. Orchestrator: baseline (DONE 1031/1032), 0269 free (DONE), Task 0 rustfmt (DONE), plan → harness memory (this file).
2. Doc-keeper: draft ADR-0269 (stage 0).
3. Tester (sandbox; ≠ implementer): §3a block at EOF + all §3b re-freezes; net line delta above :16799 exactly 0; `red-prediction.md` naming each stage's first failing clause.
4. Orchestrator: stage 2, stage 1', record both.
5. Implementer (specialist): §2a–2e to privacy.rs, P1/P2 line-neutral.
6. Orchestrator: stage 3, mutants 3b–3k, stage 4, GREEN; clippy `-D warnings`; `fmt --check`.
7. Doc-keeper: finalize ADR-0269, 0238 amendment, ARCHITECTURE paragraph; fact-check against the diff; `just adr-digest`; `just knowledge` LAST.
8. Orchestrator: detached `just ci`; fill X1–X7; `mr-gates check --slice rb-115` FROM the worktree.
9. Lenses: tests reviewer, tests red-team (write the cheat), impl reviewer + red-team + /simplify + reducer-security-auditor (light) + verifier (with a mutant of its own).
10. Orchestrator: register R-rb-115-X8.

## Things to avoid
Reshaping the frozen seam or adding a second truncation site · a second definition of the stamp set · iterator chains or `.count()` in new production code · taking `due` after truncation or from `rows.len()` · a `backlog: bool` · inserting `due` mid-tuple in `rb109_tick` · a header insert in ADR-0238 · date-pinned needles · bare `due` needles · two fixtures alive at once · new rb87_/rb109_/rb110_/rb111_ fns · line growth above :16799 · the retired read-cap name in any doc · residual ids or cross-file meta-claims in new production comments · `same millisecond` / `or every bundle` in privacy.rs.
