# 12r-e — Validator & core hardening tail — PLAN (adjudicated)

Branch `feat/12r-e-validator-core-hardening`, worktree `.claude/worktrees/12r-e`, base
`b616249` (12r-d, master CI green at start). ADR reserved: **0178** (`adr_next_free` was 178).
Spec: `specs/monster-realm-v2/M-postgate-twelfth-review-residuals.spec.md:177-240`.

`touches:` `game-core/src/content.rs`, `server-module/src/{content,battle,movement,raising}.rs`
\+ sibling `*_tests.rs`, `docs/adr/**` (0178 only + forced back-links), `docs/knowledge/**`,
`ARCHITECTURE.md`. NOT `CHANGELOG.md`, NOT `docs/adr/README.md`.

## Ground truth verified before planning

| Fact | Evidence |
|---|---|
| No `ReducerContext` test harness exists in `server-module` | `raising_tests.rs:1261-1264`, `evolution_tests.rs:20`, `battle_tests.rs:1353`, `content_tests.rs:144` |
| `evolution_path` write phase = full clear then **total 1:1 map** | `server-module/src/content.rs:265-287` |
| `seen_pairs` appears exactly once in `server-module/src/content.rs` | line 73 — clean E4 needle |
| `Level::new` rejects 0 and >100; min level is 1 | `game-core/src/monster/types.rs:531-535` |
| `trust_tier_of(0,0) == Neutral`, NOT Hostile (Bayesian midpoint) | `eligibility.rs:176` — kills the floor-monster-in-production idea |
| `daily_cap_stops_credit` (`raising_tests.rs:1701`) asserts the OPPOSITE of item 4 | must be rewritten with the refutation recorded |
| 3 `movement_tests.rs` scans hard-code the `lead_party(` needle | `:2695`, `:2918`, `:3192` |
| `content_cache_tests.rs:776-796` forbids `r#` and `'"'` in `battle.rs` | out-of-scope file — our edit must not trip it |
| Existing R4 tests use non-degenerate values (50/Friendly/2/40) | `content.rs:3299`, `:3317` — stay green under the fix |

## IMPLEMENTATION RECORD (what actually shipped)

- **Item 1** `game-core/src/content.rs` — R4 is now an inline `let binds = ...` with five `||`
  terms in `path_satisfied`'s gate order (A9 honored: no helper fns, matching the file's
  twelve-rule inline idiom). Rule doc-block R1 and R4 lines both rewritten. **game-core: 991
  passed, 0 failed.**
- **Item 2** `server-module/src/battle.rs` — `lead_party_ids` is the BASE helper (query, sort,
  ids; parses nothing, cannot fail for a non-empty party); `lead_party` delegates to it,
  point-reads `ids[0]`, and rate-limits its warn through a new `LEAD_LEVEL_ERR_LIMITER`
  (`crate::movement::RateLimiter`, 5000 ms window) per A5. `movement.rs:150` consumes
  `lead_party_ids`; `movement.rs:436` and `battle.rs`'s wild-encounter caller keep `lead_party`.
- **Item 3** `server-module/src/content.rs` — the 15-line backstop deleted; replaced by a
  do-NOT-re-add comment carrying the 1:1-map argument, so the re-add loop is closed in the
  code and not only in the ADR.
- **Item 4** `server-module/src/raising.rs` — `return false` in the `creditable == 0` branch,
  no re-anchor, with the mutual-exclusion proof inline. **server-module: 501 passed, 0 failed.**
- **ADR-0178** written; `0174` gains `, ADR-0178` on its existing `**Amended-by:**` line plus an
  in-body `Amendment (12r-e)` note under D5; `0175` gains a new `**Amended-by:** ADR-0178` line
  plus a `[CLOSED by 12r-e]` marker on Consequences (4). `just adr-digest` regenerated
  `DIGEST.md` (144 project ADRs).
- **A18 was WRONG — corrected by the verifier.** I checked `just knowledge-check` BEFORE item 2
  landed and recorded "no drift / genuine no-op". Once `battle.rs` gained lines, the bundle DID
  drift: commit `6a76762` regenerated **8 reducer pages**, all `resource: …#Lnnn` line-anchor
  shifts only. The prediction's *reasoning* was right (`okf-export` harvests only
  `#[spacetimedb::reducer]` fns, so no NEW page appeared and `lead_party_ids` is invisible to it)
  but its *conclusion* was wrong, because existing pages carry line anchors into the files we
  edited. **S4's STOP condition did NOT trigger**: no `docs/knowledge/tables/**`, no
  `schema-overview.md`. Lesson: re-run a drift probe AFTER the code lands, never before.
  `scripts/check-secrets.mjs`: clean.
- **`ARCHITECTURE.md` NOT touched** — verified it never mentions the seed-gate backstop, and the
  new helper is `pub(crate)`. `CHANGELOG.md` and `docs/adr/README.md` NOT touched.
- **An eval regression was caught and fixed mid-slice:** `evals/monster-dual-write.eval.mjs`
  went RED because a tester assertion-message STRING literal contained
  `ctx.db.monster().monster_id().update(` contiguously — that eval strips `//` comments but
  NOT string literals, so the needle landed inside `daily_cap_stops_credit`'s column-0 `fn`
  span, which has no `monster_pub` write. Confirmed pre-existing-clean on `origin/master` in a
  throwaway worktree before diagnosing. **Generalises the landmine family: a needle written as
  DOCUMENTATION can trip a different gate that scans the same file.**
- **`/tmp/mr_warn_12r-e` appeared after the implementation commit.** Landing pattern honored:
  the 5-lens impl-review batch was NOT run; `verifier` ran as the single remaining required
  gate (same call as 12r-d). Adversarial coverage already banked: full `red-team` passes on
  BOTH the plan and the tests (the latter with applied, executed PoCs), plus `reviewer` and
  `/simplify` on the plan.

## PLAN-REVIEW ADJUDICATION (reviewer + red-team + /simplify, all opus, run in parallel)

Every ruling below overrides the corresponding section further down. Rulings are recorded with
the lens that raised them and why the chosen option beat the alternative.

**A1 · [reviewer C-1 / red-team HIGH / simplify §3 — all three lenses] Test 1.7's floor monster
was UNSOUND.** `trust_tier_of(0,0) == Neutral` (Bayesian midpoint, `eligibility.rs:170-201`), so
a zero-history monster is NOT the weakest representable one and the asserted biconditional is
false for `Some(Wary)`/`Some(Neutral)`. /simplify said CUT the test; reviewer said FIX the
fixture. **RULING: fix the fixture, keep the test.** `trust_unfavorable_count: 14` yields
`Hostile` (`unfav=13` → `30*33=990 <= 1000` → Wary; `unfav=14` → `30*34=1020 > 1000` → Hostile),
which makes 1.7 a true biconditional and the ONLY test that catches drift between the vacuity
floor and `path_satisfied` — exactly the bug class item 1 exists to fix. The `unfav >= 14 ⇒
Hostile` step is the one non-obvious number, so it becomes an explicit asserted fixture pin.
Cost accepted: ~35 lines of `MonsterInstance` fixture in a module that has none today.

**A2 · [red-team HIGH] The tightened R4 still accepts two encodings that qualify AT BIRTH.**
`Some(Wary)` and `Some(Neutral)` are binding in the "can exclude someone" sense (a monster with
`unfav >= 14` is Hostile) but are satisfied by a newborn. **RULING: implement the spec's
criterion (`> Hostile`) and DISCLOSE the at-birth gap as a named residual.** The spec's E1 scopes
the fix to "each is the minimum of its own comparison" (`spec:188-191`) — that is the
can-ever-exclude notion, not the at-birth notion. Tightening to `> Neutral` would reject content
encodings the spec does not sanction and is a behaviour change beyond the slice. Test 1.6's trust
row therefore asserts `Some(Wary)` is ACCEPTED — its doc must say this pins the
can-ever-exclude semantics and must name the at-birth residual, so the row is not read as
endorsing at-birth qualification.

**A3 · [red-team HIGH] `lead_party_ids` as a wrapper over `lead_party` passes every planned scan
with ZERO behaviour change** (PoC'd against verbatim copies of the real scan helpers: 2.1, 2.2
and 2.5 all green while a bad lead level still disables the whole party). **RULING: adopt
/simplify §1's two-function shape, which makes the cheat structurally impossible.** `party_sorted`
is CUT. `lead_party_ids` becomes the BASE (query + sort + collect ids, parses no level, cannot
fail); `lead_party` = `lead_party_ids(..)?` + an indexed point-read of `ids[0]` + `Level::new` +
the warn. The dependency now points the safe way, so no scan can be satisfied by delegating the
wrong direction. Cost: one O(1) indexed read on two COLD paths (`begin_encounter`,
`movement_tick`'s wild roll) — never the hot path this item is about. 2.1 additionally asserts
`lead_party_ids`' body contains ZERO `lead_party(`.

**A4 · [red-team HIGH] Test 2.2 passes with a provably dead warn** (a `lead_level.as_u8() == 0`
branch is unreachable — `Level` is 1..=100 — yet satisfies a byte-window position assertion).
**RULING: scope the assertion to the failure BLOCK, not a byte window.** Reuse
`battle_tests.rs:1486`'s `block_after`: the block following `Level::new(` must contain BOTH
`log::warn!` and `return None`. Under A3's shape the warn sits in a real `Err(_) =>` arm.

**A5 · [red-team MED] The new warn lands on `movement_tick` (`movement.rs:436`) — per character,
per tick, unlimited.** One corrupt lead level becomes a log flood on the hottest scheduled
reducer. **RULING: route the warn through a rate limiter**, the same idiom the file already uses
8 lines below (`ENCOUNTER_TABLE_ERR_LIMITER`, `movement.rs:443-455`, ADR-0170 D4). "Never silent
again" must not become "never quiet again".

**A6 · [reviewer H-2] Item 4's rejection of `ticked`-gating had the RIGHT verdict on a WRONG
proof.** The cap does NOT become unenforceable (`gap` is measured from an un-advanced anchor, so
it grows monotonically and the tick eventually fires with full credit). **RULING: replace the
rationale.** The real fatal case is the two branches whose entire purpose is to persist an anchor
with NO tick — `raising.rs:505-508` (backwards clock: a future anchor is never cleared →
permanent lockout) and `:516-519` (idle: the anchor never advances past an idle period, so every
later call re-takes the idle branch → **Quality Time dies permanently after the first log-off**).
Same decision, correct proof. This proof, not the old one, goes into the ADR — a future reader who
checks the cap argument would find it false and "correct" the decision back.

**A7 · [red-team MED] Item 4's disclosed residual had the WRONG SIGN.** The plan disclosed only
over-credit. Red-team's port of `apply_quality_time_credit` (20 000 randomised trials × 400 calls)
measured worst-case **−2 ticks**: with the anchor frozen, the first post-rollover call can land in
the idle branch and its whole gap is dropped. That is precisely what `daily_cap_stops_credit`'s
doc says at `raising_tests.rs:1697-1698` — **that rationale is not refuted, it is BOUNDED.**
**RULING:** the rewritten doc and the ADR must say "bounded at ≤ 2 QT ticks in EITHER direction
per UTC rollover", never "not load-bearing"; test 4.2 asserts the BOUND. Also the write reduction
is **~1.94×** over a realistic 4 h capped session straddling midnight (2880 → 1483 writes), not
24× — 24× holds only strictly inside the capped window. Do not quote 24× as the headline.

**A8 · [red-team MED / reviewer L-1] Test 3.1's needle and baseline were both wrong.**
`seen_pairs` occurs **twice** (`server-module/src/content.rs:73` and `:75`), not once; and the
needle is an identifier, so re-adding the block as `dup_guard` keeps it green. **RULING: assert
on SHAPE, body-scoped.** Inside `sync_content_inner`'s body, require `HashSet` == 0,
`collections::` == 0 and `.insert((` == 0 (measured today: 1/1/1, all three the backstop —
rename-proof). Keep vacuity layer (b) (`validate_evolution_paths(` still called in that body — it
guards the real false-green where someone deletes the validate call and the scan reports "zero
backstops"). **CUT layer (c)** per /simplify: the cross-crate R1-message scan restates
`r1_duplicate_from_to_pair_rejected` (`game-core/src/content.rs:3210`), which is a strictly
stronger behavioural test.

**A9 · [simplify §2] CUT the five `*_is_binding` fns + `path_has_binding_gate`.** All twelve rules
in `validate_evolution_paths` are inline `for` loops with inline conditions; six private fns
would make R4 the only rule in the file with a call graph. **RULING: one inline `let binds = ...`
with five `||` terms, one per line, in `path_satisfied`'s exact gate order, each commented with
its `eligibility.rs` twin.** The five-gate correspondence stays visible as five lines; nothing
outside R4 needs the predicate (test 1.7 goes through the public validator).

**A10 · [simplify §5 DISSENT — overruled] Consume ADR-0178 as planned.** /simplify argued for
in-body `## Amendment (12r-e)` sections in 0174/0175 (sanctioned by `docs/adr/README.md:47-49`,
precedent 12r-d/ADR-0170). **RULING: a new ADR.** 12r-d's precedent was residual *closure* of ONE
ADR; this is a cross-ADR behaviour change plus **four newly-surfaced residuals** (A2's at-birth
gap, the eval R4 mirror, the upper-bound hole, the `schema.rs` stale comment) that need ONE home
rather than being scattered across two ADRs with no natural section. There are also three
genuinely non-obvious WHYs a future reader will otherwise "fix" back: why the floor is `>
Hostile` and not at-birth (A2), why the backstop was deleted rather than moved post-insert (the
1:1-map proof), and A6's corrected `ticked` proof. Keep it TIGHT (~90 lines). Back-link format is
verified against `scripts/adr-digest.mjs:481` + 12r-f's gate: **0174** `**Amended-by:** ADR-0175,
ADR-0176` → append `, ADR-0178`; **0175** has NO `**Amended-by:**` line → add one at column 0 in
the header preamble. Both endpoints are ≥ `BACKLINK_ERA_MIN = 0151`, so both directions are
enforced. Red-team verified none of `adr-backlink-corpus.eval.mjs` T9(b)/T12/T13's counts move.

**A11 · [reviewer H-1 / red-team MED] `evals/evolution-content-integrity.eval.mjs:725`
(`checkR4Vacuous`) is an INDEPENDENT JS re-implementation of R4 with the OLD field-presence
semantics.** After item 1 it is strictly weaker than the Rust validator — a degenerate edge is
rejected by Rust and accepted by the eval, silently, in the exact rule this slice is fixing.
Nothing reds (its fixtures all use non-degenerate values). **RULING: do NOT touch it.** `evals/**`
is outside `touches:` and the slice does not REQUIRE the edit — per the intent boundary that makes
it a follow-up flag, not a hidden-dependency STOP. Record it as a **named residual in ADR-0178 +
the PR body + the handoff** with a queued follow-up. This is the single most important thing this
slice hands to the supervisor.

**A12 · [reviewer M-1 / red-team MED] Stale duplicate-pair comments after item 3.** Adjudicated
per file: `game-core/src/content.rs:920-922` is IN `touches:` and E4 demands accuracy → **FIX**
(core, not boyscout). `docs/adr/0174:48` D5 → **FIX** (the spec mandates it).
`server-module/src/schema.rs:454-456` is OUT of `touches:` **and** red-team proved touching it
restamps the ENTIRE knowledge bundle (`scripts/okf-export.mjs:415-417` stamps every page from
`gitDate(schema.rs)`) → **do NOT touch; named residual.**
`evals/evolution-path-index-pin.eval.mjs:277` is prose inside a failure `detail` string, not
asserted → note only.

**A13 · [reviewer M-3 / red-team] The UPPER-bound dual hole is real and OUT of scope.**
`min_quality_time_tier: Some(5..=255)` and `min_nutrition_pct: Some(101..=255)` are representable
while `quality_time_tier_of` saturates at 4 and `nutrition_pct_of` caps at 100
(`eligibility.rs:207-215`, `:233-238`) — a permanently UNSATISFIABLE edge that R4, R10 and every
other rule accept, so R10 certifies a species "reachable" while it is unobtainable forever.
**RULING: do NOT implement.** The spec's E1 names only the four lower-bound encodings; a ceiling
rule is a new rule with its own EARS, tests and content-acceptance semantics. Record as a
named residual with the concrete finding so the supervisor can queue it — it is ~6 lines in the
same predicate block whenever it is scheduled.

**A14 · [reviewer M-4] `game-core/tests/eg3_evolution_graph.rs:578-581` (T11) hand-rolls a THIRD
copy of the field-presence predicate.** Out of `touches:` (`game-core/tests/`). Stays green on
shipped content. **RULING: named residual in ADR-0178 Consequences**, so the "three
implementations of does-this-edge-gate-anything" fact is recorded rather than rediscovered.

**A15 · [reviewer H-3 / red-team LOW] STOP S3's `include_str!` inventory was incomplete.** Add and
mark checked-not-at-risk: `game-core/src/combat/{redteam_m14e_tests.rs:554,
m7b_redteam_tests.rs:165, redteam_m14c_tests.rs:106}`, `server-module/src/{economy_tests.rs:515,
517; m14_5d_1a_tests.rs:31; guards_tests.rs:1521,1576}`. **Extend the landmine anti-pattern by
file:** `guards_tests.rs:1513-1595` bans a char-literal double quote AND an unbalanced `/*`/`*/`
in **`movement.rs`**; `raising_tests.rs:1013-1019` bans `r#` in **`raising.rs`** (the plan named
only `battle.rs`/`content.rs`).

**A16 · [simplify] Test cuts adopted.** CUT **2.3** as a standalone (fold its one useful
assertion — `lead_party`'s body contains no `owner_identity()` filter — into 2.5). CUT **2.6**
(`Level::new` premise already pinned three times: `monster/types.rs:693`, `:700`, `:708`). CUT
**4.4** (an unmodified test is proven unmodified by the diff; it is a citation in 4.1's doc, not
a test item). **REJECTED** /simplify's collapse of 1.1-1.4 into one four-row table: the spec's E1
says "four tests" verbatim and four separate tests give four independent RED signals for the
proof-of-teeth run — EARS wording wins over the file idiom here. **REJECTED** folding 1.6 into
the green `:3317` table: adding rows to a passing test invites weakening scrutiny for no gain;
1.6 stays a separate ~18-line boundary test.

**A17 · [simplify §6] Boy Scout: both discretionary entries CUT, so `boyscout-delta: none`.**
`raising.rs:528-529`'s comment tightening is redundant (the stronger bound already holds today —
`if creditable == 0 { return }` precedes it, so the plan's "holds after item 4" rationale was
also wrong). `ARCHITECTURE.md`'s symbol cell is churn for a `pub(crate)` helper on a
drift-gated doc. `battle.rs:279-282`'s `None`-contract truth-up is **reclassified as CORE** (item
2 forces it and it is the documented half of E2), not boyscout. Verified: `ARCHITECTURE.md` never
mentions the seed-gate backstop, so item 3 forces no edit there either.

**A18 · [red-team] `just knowledge` will be a NO-OP** — `scripts/okf-export.mjs` harvests only
`#[spacetimedb::reducer]`-annotated fns; `lead_party_ids` is `pub(crate)` and no reducer signature
changes. Run it to confirm zero diff; **any diff is a STOP** (S4 stands, now with the expectation
that it protects nothing unless something unexpected happened).

**A19 · [reviewer L-3] Tests 2.4 and 2.5 MUST land in the same commit.** 2.4 re-points three
`movement_tests.rs` needles — the classic shape of hollowing a scan — and 2.5's negative
assertion (`lead_party(` count == 0 in `enqueue_move`) is the only thing that constrains it.
Also verify per-scan whether a re-point is even needed: `movement_tick` (`movement.rs:436`) still
calls `lead_party(`, so a scan targeting that call site must NOT be re-pointed.

**A20 · Claims verified CLEAN by two or three lenses independently** (do not re-litigate): item
4 changes no `check_and_evolve` gating (`accrue_quality_time` returns `ticked`, already `false`
in the capped branch); the mutual-exclusion proof holds (`QT_MIN_WRITE_GAP_MS = 5_000 > 0`, the
rollover branch sets `window_ms = 0` ⇒ `headroom = CAP` ⇒ `creditable > 0`); item 3's backstop is
genuinely dead (`ctx.db.evolution_path().insert(` occurs at exactly ONE site repo-wide,
`server-module/src/content.rs:269`, fed by the same unmutated Vec); shipped content survives the
tightened R4 (all ten edges in `000-core.ron`; the two `min_level: 1` edges survive on
essence 150 / `Some(Friendly)`); repo-wide there are ZERO `Some(Hostile)` / `amount: 0` /
`Some(0)` path fixtures in `.rs`/`.ron`/`.mjs`; the `/*`-in-comment landmine is not live for the
planned scans; `docs/adr/README.md`'s "next free number" is already stale by 12 and is ungated;
no eval or gate reads `ARCHITECTURE.md`; `evolution_tests.rs`'s EG2-9 scheduled-reducer closure
and the `no-idle-accrual`/`monster-dual-write`/`evolution-reducer-security` evals are unaffected.

## Decisions

- **Item 1 (R4):** five private `*_is_binding` predicates + `path_has_binding_gate` in
  `game-core/src/content.rs` above `validate_evolution_paths`; R4 becomes
  `if !path_has_binding_gate(path)`. Floors: `min_level.as_u8() > 1`,
  `essence.iter().any(|r| r.amount > 0)`, `> TrustTier::Hostile`, `qt > 0`, `pct > 0`.
  REJECTED: calling `path_satisfied` with a floor monster in production — `trust_tier_of(0,0)`
  is `Neutral`, so it would also reject `Some(Neutral)`, a strictly larger rejection set than
  the spec sanctions. The floor monster survives as **test 1.7**, the equivalence oracle.
  `evolution/eligibility.rs` is the SSOT-ideal home but is **out of `touches:` → STOP S1**.
- **Item 2 (`lead_party`):** add `party_sorted()` (one query+sort) and
  `pub(crate) fn lead_party_ids(ctx, owner) -> Option<Vec<u64>>` (parses no level, cannot
  fail). `lead_party` keeps its signature, delegates to `party_sorted`, gains a
  `log::warn!` on the `Level::new` failure arm only. `movement.rs:150` switches to
  `lead_party_ids`. `Option<Vec<u64>>` (not `Vec`) preserves the zero-`trade_offer`-reads
  property for a party-less caller (`movement_tests.rs:2956-2961`).
- **Item 3 (dead R1 backstop): DELETE** (`server-module/src/content.rs:68-82`). Option B
  (post-insert re-scan) rejected on evidence: the write phase is a total 1:1 map of an
  already-validated multiset, so it can catch nothing; it is untestable except tautologically;
  and it costs a full table scan on every `init`/`sync_content`. Record the deletion in the ADR
  so a future hardening pass does not re-add it.
- **Item 4 (QT cap): `return false` in the `creditable == 0` branch**, not `ticked`-gating.
  Proof: `creditable == gap.min(headroom)`, `gap >= QT_MIN_WRITE_GAP_MS > 0`, so
  `creditable == 0 ⟺ headroom == 0 ⟺ window_ms >= CAP`; but the day-rollover branch sets
  `window_ms = 0` ⇒ `headroom == CAP` ⇒ `creditable > 0`. **The two branches are mutually
  exclusive**, so `return false` drops exactly ONE mutation — the re-anchor. `ticked`-gating is
  REJECTED: it would suppress the sub-tick write that advances `window_ms`, making the 2 h
  daily cap unenforceable (a security regression).
  Honest residuals: writes drop to ~1/120 s (the idle branch), not to zero; and a capped player
  crossing UTC midnight may carry ≤ 2 min of genuine pre-midnight playtime into the new day.

## ADR-0178 (consumed)

`**Amends:** ADR-0174, ADR-0175` · Subsystems: `evolution-fusion`, `content`,
`movement-netcode`. Forced reciprocal back-links: `**Amended-by:** ADR-0178` in **0174** and
**0175** (12r-f's `evals/adr-backlink-integrity.eval.mjs` enforces both directions for ADRs
>= 0151; both endpoints qualify). `just adr-digest` regenerates `DIGEST.md`.
D1 R4 vacuity floor · D2 single enforcement point · D3 `lead_party_ids` + warn contract
(closes ADR-0175 Consequences (4)) · D4 cap-exhausted write elision.
Consequences must carry the honest limit: **E2 and E3 have no executed ctx-level proof.**

## Test plan (test-first; [R] = must start RED)

Commit 1 — R4, all in `game-core/src/content.rs`'s in-file `mod tests`:
1.1-1.4 [R] the four degenerate encodings rejected · 1.5 [G] mixed
`[{Fire,0},{Water,100}]` accepted (kills the naive `.all()` fix) · 1.6 [G] one-above-each-floor
accepted (kills `>=`/`>` off-by-one) · 1.7 [R] equivalence oracle vs `path_satisfied` on the
weakest representable monster, with three fixture pins.

Commit 2 — R1: `content_tests.rs::r1_duplicate_pair_has_exactly_one_enforcement_point` [R] —
`seen_pairs` count == 0 in the comment-stripped source, plus two vacuity layers (the
`validate_evolution_paths(` call still present in `sync_content_inner`; game-core's R1 message
still present cross-crate).

Commit 3 — party ids, `battle_tests.rs` + `movement_tests.rs`: 2.1 [R] `lead_party_ids` body has
no `Level::new(` · 2.2 [R] `lead_party` warns on the failure arm · 2.3 [R] both helpers share one
query · 2.4 [M] re-point the three `movement_tests.rs` needles · 2.5 [R] `enqueue_move` uses
`lead_party_ids(` exactly once and `lead_party(` zero times (E2's real tooth; the needles are
disjoint and mutually constraining) · 2.6 [G] `Level::new` premise pin.

Commit 4 — QT cap, `raising_tests.rs`: 4.1 [M][R] `daily_cap_stops_credit` → `!wrote` + anchor
unchanged, doc rewritten with the refutation · 4.2 [G] capped-and-active still re-anchors at the
idle bound (replaces the property 4.1 was trying to protect) · 4.3 [G] structural bridge: the
shell's `return false` precedes the row write · 4.4 [G] cite `daily_cap_resets_on_next_utc_day`
(`:1741`) unchanged.

Commit 5 — docs: ADR-0178 + back-links, `just adr-digest`, `just knowledge` (AFTER the code
commits — it stamps `gitDate(schema.rs)`), `ARCHITECTURE.md`.

## Proof-of-teeth (each must be OBSERVED biting, run by the orchestrator — tester has no Bash)

Revert R4 to the field-presence chain (1.1-1.4) · `.any` → `.all` (1.5) · `>` → `>=` (1.6) ·
flip `essence_gate_met` to `>` or swap `TrustTier` order (1.7) · re-add the `seen_pairs` block /
delete the validate call / delete game-core R1 (3.1 a/b/c) · put `Level::new(` back in
`lead_party_ids` (2.1) · delete or hoist the warn (2.2) · inline a second query (2.3) · revert
`movement.rs:150` to `lead_party(` (2.5) · restore the re-anchor + `return true` (4.1) · move
the row write above the early return (4.3).

## Anti-patterns named

Naive `.all()` R4 fix · over-rejecting `Some(Neutral)` via a zero-history floor monster ·
duplicating the query+sort · warning per party member · escaping `Identity`/`u8` log args ·
`ticked`-gating the caller · "improving" item 3 into option B · source-scan landmines (no `/*`
or `*/` in comments, no `'"'` char literal — use `char::from(0x22u8)`, no `r#` in
`battle.rs`/`content.rs`, scrub per file) · editing an out-of-scope test file to make it green ·
hand-editing `CHANGELOG.md`/`docs/adr/README.md` · regenerating `docs/knowledge/**` before the
code commits.

## Boy Scout (cap ~40 lines / <=3 hunks)

- `server-module/src/raising.rs:528-529` — tighten the defensive-arm comment to the stronger
  `0 < creditable <= QT_IDLE_GAP_MS` that holds after item 4.
- `ARCHITECTURE.md` battle.rs symbol cell — add `lead_party_ids` beside `lead_party`.
- `server-module/src/battle.rs:279-282` — `lead_party`'s doc says `None` means "no party
  monster"; it also returns `None` on an unparseable lead level. (Truth-up forced by item 2.)

## STOPs / risks

S1 `game-core/src/evolution/eligibility.rs` (SSOT-ideal home for the predicates; out of scope —
proceeding with content.rs + the equivalence test). S2 `evals/**` (E4's natural home; using a
`#[cfg(test)]` scan in `content_tests.rs` instead). S3 `evolution_tests.rs`,
`content_cache_tests.rs`, `npc_tests.rs`, `pvp_tests.rs` all `include_str!` a declared file — if
any goes RED that is a STOP, not a fix. S4 `just knowledge` fan-out: a diff in
`docs/knowledge/tables/**` or `schema-overview.md` is a STOP (nothing here touches `schema.rs`).
S5 `client/src/module_bindings/**` must stay untouched.

R-a (highest) rewriting `daily_cap_stops_credit` looks like making the test agree with the code —
mitigated by the mutual-exclusion proof, the citation of `:1741`, and test 4.2.
R-b re-pointing the three `movement_tests.rs` needles can hollow a scan — mitigated by 2.5's
negative assertion. R-c E2/E3 have no ctx-level executable proof — disclosed, not glossed.
R-d R4 is a content-compat narrowing — re-verify `game-core/content/evolution_paths/000-core.ron`
at implementation time. R-e gitleaks is remote-only. R-f `just ci` needs the explicit PATH export.

## Size

~10 hand-edited source/test files + 5 doc files, ~+540/−64, ~70% tests. One increment, five
commits. Do not split.
