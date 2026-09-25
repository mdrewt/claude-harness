# rb-111 plan — REV 2 (2026-09-25) — REV 1 + plan reviewer (APPROVE-WITH-CHANGES) + plan red-team (4 BLOCKERs, 8 MAJORs) + /simplify

Baseline MEASURED on the worktree @9ed396e: `cargo nextest run -p monster-realm-module --run-ignored all` → **1023 passed**; `--features dev_reducers` → **1024**. Target after the slice: 1031 / 1032. Runner: `just test` = `cargo nextest run --workspace` (+ `cargo test --doc`), so per-process index memoisation (red-team m1) is not a CI concern; the T1 doc notes it.

## REV 2 resolutions (each overrides the REV 1 text below where they conflict)

**R2-1 (reviewer B1 / red-team M4+M5 — the run-ahead analysis).** A successful mint returns a stamp in `[now, now+W)` BY CONSTRUCTION, so a stamp never runs ahead of the clock by more than `W−1 = 15 ms`, unconditionally; the "(rate−1) ms/ms … ≤ ~2.5 s" sentence is DELETED from §6/§7 and must not appear in ADR-0268. Correct quantification (red-team M4): SUSTAINING a contention refusal needs ≈1 successful bundle per millisecond from distinct subject identities (60 s cooldown each) after a 16-bundle fill; the anonymous admission budget (21 504 rows ⇒ 1 264 bundles) ends that in ≈1.25 s, once per TTL (the planted rows hold the anon half for 7 days). W buys NO DoS resistance (the sustained rate is 1/ms regardless of W); W is the assumed ceiling on LEGITIMATE exports per millisecond, kept ≪ the 60 s cooldown so run-ahead never interacts with flood control; 16 is generosity, and the ADR says so (§8 Q1: independent, not derived). New consequence to state: a global ceiling of W successful exports per millisecond (legitimate sustainable rate under cap+cooldown ≈ 42/s, ~380× below).

**R2-2 (reviewer M-2 / red-team M7 — the bijection is prospective).** Rows committed before the deploy keep their stamps; for one `EXPORT_BUNDLE_TTL_MS + EXPORT_REAP_INTERVAL` a pre-deploy same-millisecond group is still one delete unit. Every production retruth in §2c and every doc claim reads "every bundle minted since rb-111"; ADR-0268 Consequences gets one sentence; residual **R-rb-111-LEGACYSTAMP** (LOW, self-clearing after one TTL) is registered after the lenses.

**R2-3 (reviewer M-1 / red-team B1 / /simplify — production comments).** privacy.rs carries NO residual id (`R-rb-86-SAMEMS` must be 0 there: T7 `[rb111/prod-residual-closed]`), NO cross-file meta-claim (ADR-0267 D4: no "privacy_tests.rs counts/pins it N ways"), and NO restatement of the old mechanism. §2a's banner shrinks to ~5 lines: what the mint guarantees and why it lives here; archaeology goes to ADR-0268. §2b's call-site comment drops its last sentence. The :1936-1945 atomicity paragraph is REWRITTEN claim-free: "the write site refuses a stamp a live bundle already carries and stamps every chunk of a request with the one it minted, so a stamp is one request's bundle; a break degrades to the status-quo tear, never to destroying a live export" — the pin enumeration moves to ADR-0268 §Confirmation.

**R2-4 (red-team B2 — T3's population).** 18 bundles at ONE clock is impossible (the mint yields ≤ 16). T3 seeds through a RETRY loop: `let mut clock = now0; for owner in 1..=18 { let stamp = loop { match rb111_mint(&ctx, clock) { Ok(s) => break s, Err(_) => clock += W } }; seed 17 chunks at stamp }`. Fixed tree: stamps `now0..now0+17` (16 minted at `now0`, the refusal advances the clock to `now0+16`, two more), 306 rows → tick: read 256 / planned 16 / reaped 272 / survivors = the two newest bundles (34 rows). Status-quo body: no Err ever fires, clock never advances → 18 bundles on one stamp → planned 1 / reaped 306 / survivors 0. New clause `[rb111/bound-population-minted]`: BEFORE the tick, the 18 mint returns sorted equal `now0..now0+18` and are 18 distinct — so a hand-seeded population can never turn T3 into a re-run of `rb109_oversized_tick_…` (GREEN under the status quo).

**R2-5 (red-team B3 — `[rb111/doc-tickbound-open]`).** ARCHITECTURE.md lines are whole paragraphs (:2295 is 7.8 KB and carries both `R-rb-86-TICKBOUND` and `closed by rb-110`), so a line-scoped co-occurrence ban is permanently RED. Scope the clause to the rb-111 SPANS only: the `## Amendment (2026-09-25, rb-111 …` section of ADR-0238 (to the next `## ` or EOF) and the `**rb-111**` paragraph of ARCHITECTURE.md; each span must contain the exact phrase `R-rb-86-TICKBOUND stays open` and must not contain `closes R-rb-86-TICKBOUND` nor `R-rb-86-TICKBOUND closed`. ADR-0268 likewise (whole file, it is new).

**R2-6 (red-team B4 — `[rb111/prod-stale-claim]`).** The two phrases are rustfmt-wrapped across lines (raw count 0 today). Use raw needles measured on the live file: `or every bundle` (pre 2 → 0) and `same millisecond` (pre 2 → 0), NOT `millisecond` (the §2c:1503 retruth reintroduces it), and interpolate both pre-states into the first clause message.

**R2-7 (red-team M1 — the range-probe mutant).** `.created_at_ms().filter(candidate..)` passes every count clause. Add `[rb111/probe-is-a-point]` to T6: in the mint body, the text after `.created_at_ms().filter(` starts with `candidate)`, and `..` occurs exactly once in the mint body, at the `for offset in 0..` range (red-team m2: `== 1`, not `== 0`). §3a item 9 attributes by COUNT (reviewer MINOR 2): helper 1 + mint 1 == file-wide 2, the `[rb85/bundle-scope]` idiom.

**R2-8 (red-team M2 — the dispatch widening).** `[X9/dispatch-args]` admits `now)` ONLY when the call is the mint: `stripped.starts_with("me)") || (stripped.starts_with("now)") && body[..at].ends_with(&rb111_nd_mint_named()))` — line-neutral inside the same walk (`rb111_nd_mint_named()` is declared at EOF; a fn call from an earlier line is fine). `[rb111/dispatch-now-once]` stays as the exactly-once tooth.

**R2-9 (reviewer §8 Q4 / red-team T5).** Keep `?`. Close the `?`-blindness AT ITS OWNER: `[rb107/exit-shape]` (privacy_tests.rs:20838, below the :16799 boundary — growth is free) gains a `?`-by-depth census over the same purge→`Ok(())` region: total `?` == 2, depth-0 `?` == 1. `[rb111/mint-exit]` ATTRIBUTES: the depth-0 `?` offset == the mint statement's, and the other `?` is still `rows_fn(ctx,me)?` (so swapping that one for `.unwrap_or_default()` while adding the mint's cannot hold the total at 2).

**R2-10 (reviewer M-3 / red-team measurement — Task 0).** rustfmt (defaults; no rustfmt.toml in the repo) has ONE canonical form of the mint (measured by the red-team, both input shapes converge; the chain has no comma → NO one-comma twin; R2 retired). The squashed body pin is layout-invariant anyway; only `rb111_mint_body_source()` (the whitespace-bearing control) needs the exact bytes, given in §2a-REV2 below. Task 0 is therefore `cargo check` + **`cargo clippy -p monster-realm-module --all-targets --all-features -- -D warnings`** on the snippet inside privacy.rs (the `clippy::filter_next` question: RangedIndex is not an Iterator, so the lint should not fire — MEASURE it; if it fires there is no legal rewrite, `.count()` is pinned at exactly 2 by `[rb107/count-census]`).

**R2-11 (reviewer MINOR 7 / red-team T1 row — `saturating_add` at the ceiling).** T1 gains two rows at `now = i64::MAX`: free → `Ok(i64::MAX)`; occupied → `Err` (the window collapses to one candidate; `+` would PANIC under the workspace's overflow checks, so this row is what distinguishes `saturating_add` from `+` behaviourally). T4's domain includes `now` near `i64::MAX`, negative `now`, and `now` far below every seeded stamp (red-team m5: expired-but-unreaped rows count as occupied — conservative). `[rb111/prop-bounded]` is DROPPED (/simplify: implied by prop-minimal + prop-err-iff). T4 acquires `fixture()` INSIDE each proptest case (reviewer MINOR 10: `FIXTURE_LOCK` is non-reentrant).

**R2-12 (reviewer MINOR 3, 5, 6; /simplify — gates and docs).** X3 lists the SIX tests whose ASSERTIONS move: `m22s4_now_bound_once`, `m22s4_sender_bound_once_and_sole_identity_source`, `rb85_reaper_reads_a_bounded_range_and_never_sweeps`, `rb86_reaper_deletes_whole_bundles_by_stamp_and_never_by_chunk_id`, `rb86_export_write_site_is_frozen_to_one_stamp`, `rb107_reducer_admits_twice_before_the_first_write` (`m22s4_reducer_statement_order` and `rb65p_export_emits_one_observation` do not move — prose only). ADR-0238's rb-111 amendment carries its OWN `**Superseded sentences**` line (never edit rb-109's block at :723-730). ADR-0268 Decision ≤ 210 chars. X2 pins 1031/1032. X7 EVIDENCE is an integer line into the RED record.

**R2-13 (red-team M3, M4, M6, m3, m4 — honest consequences for ADR-0268 + residuals).** (a) A refused caller has no cooldown (zero live rows ⇒ `None ⇒ allow`), so a contended probe costs ≤ 16 index-point reads, each possibly one 64 KiB host buffer fill, at an unbounded request rate behind the write lock — the pre-gate above it is the only bound, and it binds only near the cap; say so in R-rb-111-CONTENTION. (b) The window is UNTIERED: an anonymous burst can refuse ACCOUNT HOLDERS for ≈1.25 s once per TTL — a partial regression of ADR-0265 D1b, LOW, stated. (c) The bijection has NO datastore constraint behind it (multi-column unique inexpressible; `#[unique]` on a live table automigration-forbidden); it rests on reducer-transaction serialisation alone — a `#[procedure]` or any optimistic-concurrency retry on this path would reopen it; a break degrades to the status-quo tear, never to data loss. Register **R-rb-111-NOCONSTRAINT** (LOW). (d) ARCHITECTURE.md:2295's present-tense "one request's bundle, or every bundle committed in that millisecond" is rb-86 history; the `**rb-111**` paragraph explicitly supersedes that clause. (e) `request_id: stamp as u64` still wraps a negative stamp (pre-existing `now as u64` behaviour; the client picks the MAX bigint) — one sentence, no change. (f) accounts_tests.rs scans privacy.rs at five sites (reviewer MINOR 4: table attrs, mod census, `fnpurge_export_bundles(`, first `stringify!` after the deletion gate = still `export_reject_pending_deletion`, rb-40 `[obs2/scope]`, rb68p declaration text) — none moves; a hit there is a STOP.

**R2-14 (red-team M8 — RED stages).** Add to §3c: **3d** `0..=W` → T1 row 7 RED; **3e** `0..W-1` → T1 row 6 RED; **3f WIRING** (correct helper, `created_at_ms: now,` + `request_id: now as u64,` left in the row literal) → T1-T4/T6 GREEN, RED only on `[rb111/row-from-stamp]` + re-frozen `[X9/now-stamp]`/`[X9/now-request-id]`; **3g** `mint_export_stamp(ctx, now).unwrap_or(now)` → RED only on `[rb111/mint-call-once]`, re-frozen N1, `[rb107/exit-shape]`/`[rb111/mint-exit]` — recorded to state plainly that the call-site class is SOURCE-PIN-ONLY (request_data_export can never execute in the host). Stages 3/3b-3g run under plain `cargo nextest` (unused `ctx`/const would be `-D warnings` errors). Stage 4 (re-freeze necessity) stays.

**R2-15 (reviewer MINOR 1, 9; red-team m1).** `privacy_tests.rs:13997-14003` message retruth ("five attributed bodies" → six; the stale "eighth use" wording) inside §3a item 11's line-neutral rewrite. T1's doc notes that `requested_indexes()` is per-process-memoised and the "nothing else" half is satisfiable because `table_keyed` registers without pushing.


**R2-16 (MEASURED at the first GREEN attempt — a census the plan, both plan lenses and the tester missed).** `rb65p_export_emits_one_observation` `[emit/no-try]` (privacy_tests.rs:9859) counts `?` CHARACTERS by brace depth over the purge→`Ok(())` region and asserts depth-0 == 0; the mint's `?` moves it to 1 (everything else GREEN: 1031 run, 1030 passed). Resolution: tester re-freezes 0 → 1 with attribution (offset == the mint statement's `?`), line-neutral; message retruthed (an Err rolls the purge back, ADR-0106 D8). §3a gains item 15: `privacy_tests.rs:9859-9867 rb65p [emit/no-try] 0 → 1 attributed`. X3 gains `rb65p_export_emits_one_observation` (7 tests). Lesson recorded in memory (`production-token-count-misses-test-file-depth-census`).

### §2a-REV2 — the EXACT production bytes (rustfmt-canonical; the implementer lands these, the tester spells the control independently)

```
// ===========================================================================
// rb-111 (ADR-0268): a NEW bundle's creation stamp is unique among LIVE rows,
// so a stamp is exactly one live request and the TTL reaper's per-tick stamp
// cap counts BUNDLES. Minted here, at the module's one write site, with no
// schema change: the btree on created_at_ms already exists, a composite index
// would be a table migration, and a unique column on a live table is
// automigration-forbidden.
// ===========================================================================

// A DoS knob, not a legal figure (EXPORT_REQUEST_COOLDOWN_MS above is the
// precedent): the span of consecutive milliseconds, at or after the clock, in
// which one request may look for a free creation stamp — and therefore the
// hard ceiling on how far a stamp may sit ahead of the clock. PRIVATE.
const EXPORT_STAMP_PROBE_WINDOW_MS: i64 = 16;

// The creation stamp of a NEW bundle: the injected clock, or the first later
// millisecond no LIVE export_bundle row carries. At most
// EXPORT_STAMP_PROBE_WINDOW_MS index-POINT reads on the created_at_ms btree;
// the common case is ONE that decodes nothing. REJECTS with a static reason
// when the whole window is occupied rather than falling back on a shared
// stamp — a fallback would restore the unbounded delete unit this removes.
// READS ONLY: no insert, no delete, and an explicit range loop rather than an
// iterator chain over the table. `now_ms` is a PARAMETER that deliberately
// SHADOWS the imported clock fn (the rb-85 idiom), so a second clock read in
// here is a compile error rather than something a text census must catch.
fn mint_export_stamp(ctx: &ReducerContext, now_ms: i64) -> Result<i64, String> {
    for offset in 0..EXPORT_STAMP_PROBE_WINDOW_MS {
        let candidate = now_ms.saturating_add(offset);
        if ctx
            .db
            .export_bundle()
            .created_at_ms()
            .filter(candidate)
            .next()
            .is_none()
        {
            return Ok(candidate);
        }
    }
    Err(stringify!(export_reject_stamp_contention).to_string())
}
```
Call site (§2b), between the pre-gate's `}` and `let mut per_table:`:
```
    // rb-111 (ADR-0268): this request's UNIQUE creation stamp. AFTER the
    // admission pre-gate, so a caller who cannot be served pays no probe
    // reads; BEFORE the manifest walk, so contention is refused before the
    // two unindexed own-row scans. The `?` is an early exit that rolls the
    // purge above back with it (ADR-0106 D8), the same contract the two
    // admission rejects carry.
    let stamp = mint_export_stamp(ctx, now)?;
```
Row literal: `request_id: stamp as u64,` and `created_at_ms: stamp,`. Nothing else in the reducer moves.

---
--- REV 1 below (superseded where REV 2 says so) ---

I have verified every claim against the live worktree. Here is the plan.

---

# rb-111 plan — REV 1 — a unique creation stamp per live export bundle (residual R-rb-86-SAMEMS)

Slice: rb-111 (promoted residual **R-rb-86-SAMEMS**, source rb-86). Worktree `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-111`, branch `rb-111` from origin/master @9ed396e. ADR reserved: **0268** — free at 9ed396e (`docs/adr/` tops out at 0267); file name is FINAL because T7 `include_str!`s it: `docs/adr/0268-rb111-export-creation-stamp-unique-per-live-request.md`.
Touches: `server-module/src/privacy.rs`, `server-module/src/privacy_tests.rs`, `docs/adr/0238-*.md`, `docs/adr/0265-*.md` (two line citations only), `docs/adr/0268-*.md`, `ARCHITECTURE.md`, `docs/knowledge/**`. touches-delta: `docs/adr/DIGEST.md` (`just adr-digest`).
NOT touched (hidden dependency → STOP): `server-module/src/schema.rs`, `server-module/src/native_host_tests.rs`, `client/**`, `evals/**`, `docs/adr/README.md`, `CHANGELOG.md`.
Baseline to MEASURE on the worktree before anything else (do not assume): `cargo nextest run -p monster-realm-module --run-ignored all` → expected **1023**; `--features dev_reducers` → **1024** (rb-110 closed at those numbers).

---

## §0. Ground truth (MEASURED on the rb-111 worktree, 2026-09-25)

Every line number below was read from the live files. **The brief's line numbers are off by 1–9 in five places; these are the true ones.**

**`server-module/src/privacy.rs` (2025 lines)**
- `export_cooldown_elapsed` :1201-1206; `EXPORT_REQUEST_COOLDOWN_MS` :1199 (private `const i64`, the DoS-knob precedent). Blank line :1207; the "Exporter registry" banner opens :1208.
- Reducer section banner :1490-1500 (statement-order prose). Doc comment :1502-1512. `request_data_export` :1513-1599 (**not** 1514-1607).
  - `let now = now_ms(ctx);` **:1524** (brief said 1523). cooldown reject :1532-1534. `let purged = purge_export_bundles(ctx, me);` **:1535** (brief said 1536). rb-107 comment :1536-1544, `let cap =` :1545, pre-gate :1546-1548, `let mut per_table:` :1549, manifest walk :1550-1571, `let plan` :1572, `let total` :1573, exact gate :1574-1578, insert loop **:1579-1590** (brief said 1585-1596), `request_id: now as u64,` :1583, `created_at_ms: now,` :1588, arm :1591, mr_log :1596-1597.
  - The body's only `?` today is `rows_fn(ctx, me)?` at :1557, at brace depth 3.
- Constants: TTL :1660, INTERVAL :1665, `EXPORT_REAP_MAX_READ_PER_TICK` :1674, `EXPORT_REAP_MAX_STAMPS_PER_TICK` :1683, `EXPORT_LIVE_ROW_CAP` :1705-1706, `EXPORT_ANON_LIVE_ROW_CAP` :1708, `EXPORT_MIN_BUNDLE_ROWS` :1714.
- `plan_export_reap_stamps` **:1785-1802** (brief said 1786). `reap_expired_export_bundles` **:1971-1997** (brief said 1967-1995). `ensure_export_bundle_reaper` :2002-2021. cfg-test trailer :2023-2024.
- **False-after-the-fix comments** (exact): :1678-1679 ("A stamp is one request's bundle, or every bundle that committed inside the same millisecond (all expired together)"); :1770-1772 (`request_data_export` stamps all of a request's chunks with its single `now`); :1914-1917 (same claim in the reaper doc); :1935-1936 ("or every bundle committed in that same millisecond (residual R-rb-86-SAMEMS)"); :1936-1945 (the atomicity paragraph naming the four pins); :1503-1504 ("all sharing one request_id minted from the injected clock"). Module header :23-28 is a soft overstatement only.
- Module contract :30-44: **line comments only, no `r#`, no `log::`/print macros, and exactly ONE `"` pair in the whole file** (the `#[path]` attribute). The new code adds zero quote bytes.

**`server-module/src/privacy_tests.rs` (24 626 lines)** — strip pipeline `strip_rust_strings` :~60-134 / `strip_rust_comments` :137-162 / `squash_ws` :165-167 / `stripped_for_scan` :171-173; `extract_squashed_fn_body` :176; `rb22p_count` :209; `m22s4_call_arg_lists` :2946; `m22s4_left_bounded_count` :3042; `m22s4_db_accessors` :3057; `m22s4_reducer_body` :3212; `rb107_vis_window_text` :19289; `rb107_blind_count` :19254.

**`native_host_tests.rs` (691 lines, NOT in touches)** — eleven symbols, seven implemented. **Verified against the SDK**: `spacetimedb-2.8.1/src/table.rs:876` `RangedIndex::filter<B,K>`; :977-995 `fn filter` dispatches `if const { is_point_scan::<Idx,B,_,_>() }` → **`datastore_index_scan_point_bsatn`**, else the range syscall; :1148-1167 `impl IndexScanRangeBounds<(Col,), SingleBound> for Term` with `const POINT = Term::POINT`. So **`.filter(candidate)` on a single-column i64 btree compiles AND lowers to the POINT scan the host models** (:326-349). No `.count()`, no `database_identity()`, no insert → the mint is fully executable in the host.

**Docs** — `docs/knowledge/reducers/request_data_export.md:8` → `privacy.rs#L1514`; `.../export_bundle_reaper.md:8` → `#L1827`; `.../tables/export_bundle_reaper_schedule.md:8` → `#L1740`. ADR-0238 `## Amendment` headers at :252/:273/:394/:513/:651/:739; the SAMEMS bounds paragraph :462-481 (residual named :469); the convention statement "**Superseded sentences in this ADR** (its own convention; none edited in place)" :723-730. ADR-0267 header shape :1-10 (`**Extends:** 0238`, `**Amends:** —`). ARCHITECTURE.md `**rb-110**` :2309, `## M24` :2311.
**ADR-0265:55 cites `privacy_tests.rs:16799-16812` and :298 cites `:16826-16832`; both are CURRENTLY ACCURATE** (`[rb86/stamp-cap-throughput]` first occurs at :16799; `[rb86/cap-wiring]`'s trailing-comma block at :16822-16852). This is the line-neutrality contract for every in-place test edit above :16799.

---

## §1. Design decision — ACCEPT the brief's candidate with four modifications

**Accepted:** writer-side uniqueness. `request_data_export` mints a creation stamp no LIVE `export_bundle` row carries, by probing the existing `created_at_ms` btree with index-POINT reads. No schema change, no reaper change, no native-host change, no client change. `one stamp ⇔ one live request` becomes a bijection, so the reaper's `EXPORT_REAP_MAX_STAMPS_PER_TICK = 16` WRITE bound is **16 bundles**, not 16 × (bundles per stamp).

**M1 — the call site moves BELOW the rb-107 pre-gate** (brief put it between the purge and `let cap`). Reasons: (a) the brief's stated rationale — "after the purge so the caller's own old stamp is freed" — is **vacuous**: `EXPORT_REQUEST_COOLDOWN_MS = 60_000` guarantees the caller's previous stamp is ≥ 60 000 ms below `now`, i.e. never inside a 16 ms window, so the purge frees nothing relevant; (b) privacy.rs:1541-1543 states the pre-gate's contract as "a caller who cannot be served is refused BEFORE the manifest walk" — putting up to 16 index reads *above* that gate hands a flooding identity free work on every refused request; (c) placing it between the pre-gate's closing `}` and `let mut per_table:` makes the re-freeze of `rb107_nd_pre_gate` a pure **append before the last fragment**, the smallest possible edit to a two-sided adjacency needle. Final order: subject → deletion → cooldown → purge → cap binding → pre-gate → **mint** → manifest walk → exact gate → insert → arm → mr_log.

**M2 — the constant is `EXPORT_STAMP_PROBE_WINDOW_MS: i64 = 16`**, not `EXPORT_STAMP_PROBE_MAX: usize`. It IS a window of milliseconds (same unit as `created_at_ms` and as the run-ahead it bounds), and an `i64` removes the `offset as i64` cast — one fewer token a mutant can re-point and one fewer `as` for a census to argue about. Rejected: `EXPORT_STAMP_PROBE_MAX` (reads as a probe count, hides the unit), `EXPORT_MAX_STAMP_RUNAHEAD_MS` (names the consequence, not the knob). It must NOT carry the `EXPORT_REAP_MAX_` prefix — `[rb110/no-alias]` pins that family at exactly 5 in squashed privacy.rs.

**M3 — the cost claim is retruthed.** The brief's "each decoding at most one row" is wrong: `.next()` triggers `row_iter_bsatn_advance`, which fills the caller's `IterBuf` (64 KiB) with as many WHOLE rows as fit. Honest statement, and the wording the comment/ADR must use: *the common case is ONE point read that decodes nothing (the window is free at `now`); a contended probe costs at most `EXPORT_STAMP_PROBE_WINDOW_MS` point reads, each of which may cost the host one buffer fill.* The MODULE decodes at most one row per probe.

**M4 — the `?` exit is a first-class tooth, not a side effect.** `[rb107/exit-shape]` (:20838) counts `returnErr(` in the region purge→`Ok(())` and asserts 3 with "a THIRD, undeclared early exit shows up here as a gap"; `[emit/reachable]` (:9734-9760) counts `return` tokens by depth and asserts depth-0 == 0 with "a top-level early exit below the purge is what makes the emission dead code". **Neither census can see a `?`.** The existing `rows_fn(ctx,me)?` sits at depth 3, so today's depth-0 `?` count is 0; the mint makes it 1 — the first ever. rb-111 must OWN that with its own clause; the two older messages get prose retruths pointing at it.

**Anti-patterns to avoid (each is a measured or structural hazard):**
- a fallback to `now` on probe exhaustion — restores the unbounded delete unit this slice removes (stage-3b mutant);
- the probe inlined into the reducer body — `m22s4 [X9/key]` (:6848-6865) asserts **every** `.find(`/`.filter(` argument in the reducer body equals `me`; a `.filter(candidate)` there reds it, which is exactly why the probe is a helper;
- any `.iter()` or iterator chain over the table — `[rb85/iter-census]` (:13930) pins privacy.rs at exactly 3 and requires a NAMED sanctioned site for any fourth;
- a second `.count()` — `[rb107/count-census]` (:20796) pins the file at exactly 2, both in the reducer;
- a new `now_ms(` read — `[X9/now-file]` (:6725) pins the file at exactly 2 (the parameter shadow keeps a helper-local clock read a compile error);
- widening the window "for safety" — more reads under the global write lock for marginal gain, and a wider run-ahead;
- a composite `(owner_identity, created_at_ms)` index (schema.rs + the table-schema baseline + a multi-key host row: three files outside touches) or `#[unique]` on a live table (automigration-forbidden);
- any `"` byte, `/*`, `r#`, `log::` or print macro in privacy.rs;
- a `#[cfg]` attribute anywhere in privacy.rs — `rb48_privacy_has_exactly_one_cfg_attribute` (:8535) pins exactly one, the `#[path]` trailer;
- a `format!("EXPORT_…")` anywhere in privacy_tests.rs — `[rb110/no-alias]`'s assembled-name ban (:23853) asserts 0.

**What stays byte-identical:** `schema.rs` (the whole `export_bundle` table), `native_host_tests.rs`, the reaper (`reap_expired_export_bundles`, `plan_export_reap`, `plan_export_reap_stamps`, `export_reap_cutoff_ms`, `reap_fields`, `ExportReapTick`), every constant value, `purge_export_bundles`, `my_export_bundle`, `export_fields`, the arm, the reducer's signature and its eight-column row literal's COLUMN NAMES, `client/**`, `evals/**`.

---

## §2. Production diff spec (`server-module/src/privacy.rs`)

### 2a. New section, inserted at line 1208 (after the blank line that follows `export_cooldown_elapsed`, before the `// Exporter registry` banner)

Exactly one banner + one constant + one fn. Wording is the spec; the implementer may not add a `"`, a `/*`, or a cross-file meta-claim ("pinned in N tests", ADR-0267 D4 rejects those as unclosable).

```
// ===========================================================================
// rb-111 (ADR-0268): a NEW bundle's creation stamp is unique among LIVE rows,
// so one stamp is exactly one live request. The TTL reaper below deletes a
// whole stamp per index point and caps a tick at EXPORT_REAP_MAX_STAMPS_PER_TICK
// of them; while a stamp could be shared by every request that committed in one
// millisecond, that WRITE bound was sixteen stamps times the bundles under each
// (R-rb-86-SAMEMS). Minting HERE, at the module's one write site, makes it
// sixteen BUNDLES with no schema change: the btree on created_at_ms already
// exists, a composite index would be a table migration, and a unique column on
// a live table is automigration-forbidden.
// ===========================================================================

// A DoS knob, not a legal figure (EXPORT_REQUEST_COOLDOWN_MS above is the
// precedent): the span of consecutive milliseconds, at or after the clock, in
// which one request may look for a free creation stamp. Also the hard ceiling
// on how far a stamp may run ahead of the clock. PRIVATE.
const EXPORT_STAMP_PROBE_WINDOW_MS: i64 = 16;

// The creation stamp of a NEW bundle: the injected clock, or the first later
// millisecond no LIVE export_bundle row carries. At most
// EXPORT_STAMP_PROBE_WINDOW_MS index-POINT reads on the created_at_ms btree;
// the common case is ONE that decodes nothing. REJECTS with a static reason
// when the whole window is occupied rather than falling back on a shared stamp
// — a fallback would restore the unbounded delete unit this helper removes.
// READS ONLY: no insert, no delete, and an explicit range loop rather than an
// iterator chain over the table. `now_ms` is a PARAMETER that deliberately
// SHADOWS the imported clock fn (the rb-85 idiom), so a second clock read in
// here is a compile error rather than something a text census must catch.
fn mint_export_stamp(ctx: &ReducerContext, now_ms: i64) -> Result<i64, String> {
    for offset in 0..EXPORT_STAMP_PROBE_WINDOW_MS {
        let candidate = now_ms.saturating_add(offset);
        if ctx
            .db
            .export_bundle()
            .created_at_ms()
            .filter(candidate)
            .next()
            .is_none()
        {
            return Ok(candidate);
        }
    }
    Err(stringify!(export_reject_stamp_contention).to_string())
}
```

**rustfmt note (load-bearing).** The chain is 72 columns, past `chain_width` (60), so rustfmt breaks it vertically as shown. **The orchestrator MUST run `cargo fmt` over this snippet on a scratch file and hand the exact formatted bytes to the tester as spec text BEFORE the tester freezes `rb111_mint_body_source()`.** The tester then retypes it independently (never copy-pastes the pin) — the rb-85 `rb85_helper_body_source` convention, and the reason the "one-comma twin" exists at :11878.

### 2b. Reducer edit, after the pre-gate's closing brace (currently :1548) and before `let mut per_table:` (:1549)

```
    // rb-111 (ADR-0268): this request's UNIQUE creation stamp. AFTER the
    // admission pre-gate, so a caller who cannot be served pays no probe reads;
    // BEFORE the manifest walk, so contention is refused before the two
    // unindexed own-row scans. The `?` is an early exit that rolls the purge
    // above back with it (ADR-0106 D8), the same contract the two admission
    // rejects carry — and the one exit in this region that is not a `return`,
    // which is why privacy_tests.rs counts it by depth in its own clause.
    let stamp = mint_export_stamp(ctx, now)?;
```

Then, in the insert loop: `request_id: now as u64,` → **`request_id: stamp as u64,`** (:1583) and `created_at_ms: now,` → **`created_at_ms: stamp,`** (:1588). `let now = now_ms(ctx);` and the cooldown stay exactly as they are — `now` remains the clock, `stamp` is the mint's return.

### 2c. Comment retruths (exact, with replacement wording)

| line (pre-diff) | today | replacement |
|---|---|---|
| :1503-1504 | "all sharing one request_id minted from the injected clock" | "all sharing one request_id, the request's unique creation stamp (rb-111, ADR-0268: the injected clock, or the first later millisecond no live bundle holds)" |
| :1678-1679 | "A stamp is one request's bundle, or every bundle that committed inside the same millisecond (all expired together)." | "Since rb-111 (ADR-0268) a stamp is EXACTLY one request's bundle: the write site mints a stamp no live row carries, so sixteen stamps is sixteen bundles." |
| :1693 | "Stamps are deleted WHOLE, so no bundle is ever partly reaped…" | unchanged (still true) |
| :1770-1772 | "request_data_export stamps all of a request's chunks with its single `now`, so deleting a stamp deletes a whole bundle and never part of one." | "request_data_export stamps all of a request's chunks with the single stamp it minted (rb-111), so deleting a stamp deletes exactly one whole bundle." |
| :1914-1917 | "…stamps all of a request's chunks with its single `now`, which is also the `request_id` the S8 client assembles on." | "…stamps all of a request's chunks with the one stamp `mint_export_stamp` returned, which is also the `request_id` the S8 client assembles on. Since rb-111 no two live requests share it." |
| :1932-1936 | "…A stamp is one request's bundle, or every bundle committed in that same millisecond (residual R-rb-86-SAMEMS)." | "…A stamp is ONE request's bundle (rb-111, ADR-0268): the write site refuses to reuse a live stamp, so sixteen stamps per tick is sixteen bundles." **The residual id must not survive anywhere in privacy.rs** — `[rb111/prod-residual-closed]` asserts zero, the `[rb110/prod-residual-closed]` precedent. |
| :1936-1945 | the atomicity paragraph: "the invariant is precisely `one request, one stamp`, and privacy_tests.rs pins it four ways: …" | keep the four pins, add the fifth: "…plus rb-111's mint, which pins the OTHER direction — no live row already carries the stamp — so the invariant is now a bijection. A break there degrades to the status-quo tear, never to destroying a live export." Name no counts of tests or documents (ADR-0267 D4). |
| :23-28 (module header) | "the delete unit is the creation stamp every chunk of one request shares" | append one clause: "…and, since rb-111 (ADR-0268), a stamp no OTHER live request shares." Optional but recommended: `rb22p_stub_probe_regression` (:1227) only requires the tokens `export_bundle` and `rb-22`, both preserved. |

**Line-count:** privacy.rs grows from 2025 to ~2065. This is NOT a line-neutral slice — see §7 R1.

---

## §3. Tester tasks (owns `privacy_tests.rs`; a DIFFERENT agent from the implementer)

Hygiene for the whole new block (`rb22p_scan_hygiene` scans this file): `//` comments only; no `/*` `*/` `r#` `log::` `println!` `print!` `dbg!` `\"`; every production needle split across `concat!` boundaries; **no `[rb111/…]` label inside a doc comment** (a span runs to the next `#[test]`); **no `format!("EXPORT_…")`** (`[rb110/no-alias]` bans it at :23853); open at EOF with a `// ===` banner.

### 3a. EXHAUSTIVE re-freeze list

**The census hunt was run for each needle against both the literal AND its `concat!`-split spellings** (`created_at", "_ms`, `"_ms()"`, `.fil", "ter(`, `request", "_id`, `"_id:now`, `letn", "ow`, `now", "as`). **Result: unlike rb-110, there are NO grep-invisible split spellings of the moving needles.** The only split spellings of `created_at_ms` are at :11714, :11760, :11843, :11852, :11957, :11969, :12053, :15073, :15079, :15096, :21675 — and each is either a schema/field needle, the reaper's own chain, or the rb-109 fixture, none of which this diff moves. Every moved site below is grep-visible.

**A — frozen-text pins whose LITERAL moves (`now` → `stamp`); count unchanged:**

1. `privacy_tests.rs:6792` `m22s4_now_bound_once` `[X9/now-request-id]` — `"request_id:nowasu64"` → `"request_id:stampasu64"` (count stays `== 1`). Message :6794-6796 retruth: "…minted from the SAME stamp binding, itself derived from the one clock binding by `mint_export_stamp`."
2. `privacy_tests.rs:6799` `m22s4_now_bound_once` `[X9/now-stamp]` — `"created_at_ms:now,"` → `"created_at_ms:stamp,"` (count stays `== 1`). Message :6801-6811: keep the whole measured-bypass paragraph (`created_at_ms: now + c.chunk_index as i64` is still the killed shape, now spelled with `stamp`); change "the bound instant" → "the bound creation STAMP".
3. `privacy_tests.rs:15118` helper `rb86_nd_insert_loop()` — `"chunk_id:0,owner_identity:me,request_id:nowasu64,"` → `…request_id:stampasu64,`.
4. `privacy_tests.rs:15120` helper `rb86_nd_insert_loop()` — `"total_chunks:total,payload_json:c.payload,created_at_ms:now,"` → `…created_at_ms:stamp,`.
5. `privacy_tests.rs:15229` helper `rb86_insert_loop_source()` — `"            request_id: now as u64,\n"` → `"            request_id: stamp as u64,\n"`.
6. `privacy_tests.rs:15234` helper `rb86_insert_loop_source()` — `"            created_at_ms: now,\n"` → `"            created_at_ms: stamp,\n"`.
   **(5) and (6) are re-frozen INDEPENDENTLY of (3) and (4)** — `rb86_insert_loop_source`'s own doc (:15216-15219) forbids deriving one from the other; `[rb86/stamp-site-control]` (:16908) is the clause that would go vacuous.
7. `privacy_tests.rs:19171-19190` helper `rb107_nd_pre_gate()` (needle N1) — **append one array element before the final `concat!("letmutper", "_table:")`**: a new `rb111_nd_mint_stmt()` returning `concat!("letst", "amp=mint_export", "_stamp(ctx,now)?;")`. Old frozen text ended `…to_string());}letmutper_table:`; new frozen text ends `…to_string());}letstamp=mint_export_stamp(ctx,now)?;letmutper_table:`. This is a STRENGTHENING: N1 now welds the mint's position between the pre-gate and the walk.
8. `privacy_tests.rs:19214-19230` helper `rb107_pre_gate_source()` (N1's independent control) — insert one line `concat!("    let stamp = mint_export", "_stamp(ctx, now)?;\n")` between `".to_string());\n    }\n"` (:19226) and `concat!("    let mut per", "_table:\n")` (:19227). Spelled independently of (7).

**B — exact counts that MOVE (number + attribution, both in the same edit):**

9. `privacy_tests.rs:13798-13810` `rb85_reaper_reads_a_bounded_range_and_never_sweeps` `[rb85/range-census]` — `rb22p_count(&squashed, rb85_nd_range_chain())` **1 → 2** (`rb85_nd_range_chain()` at :11760 is `.created_at_ms().filter(`; the mint's probe is the second). Message :13801-13809 retruth: "reaches the creation-stamp index TWICE" → **THREE** (range read, point delete, mint probe); "apply the FILTER chain EXACTLY once" → **twice**. **Add attribution in the same edit** (a bare number move is a loosening): both offsets resolved by `m22s4_idx` — one inside `rb85_helper_body(&squashed)` (already done at :13819), one inside `rb111_mint_body(&squashed)`.
10. `privacy_tests.rs:13950-13966` `[rb85/bundle-census]` — `rb22p_count(&squashed, m22s4_nd_bundle_accessor())` **9 → 10**. Message: append "…and one in the creation-stamp mint (rb-111, ADR-0268). MOVED 9 → 10 BY rb-111."
11. `privacy_tests.rs:13977-13983` `[rb85/bundle-scope]` attributed array — type `[(&str, &str, usize); 5]` → **`; 6]`**, new row `("the creation-stamp mint", mint_body.as_str(), 1),` and a `let mint_body = rb111_mint_body(&squashed);` binding above it. The closure clause at :13997-14003 (`attributed_total == file_wide`) then holds at 10/10 with no edit.
    **LINE-NEUTRALITY:** this is the only edit above :16799 that must grow. Absorb it by rewriting the 9-line comment at **:13968-13976** in 7 lines — that comment needs retruthing anyway (it narrates the 2→4 rb-107 move and must now also name the mint). Net line delta above :16799 must be **0**.
12. `privacy_tests.rs:16676-16684` `rb86_reaper_deletes_whole_bundles_by_stamp_and_never_by_chunk_id` `[rb86/stamp-index-reaches]` — `rb22p_count(&squashed, rb86_nd_stamp_index())` (`.created_at_ms().`) **2 → 3**. Message retruth: "EXACTLY twice" → "EXACTLY three times — the bounded range READ, the index-POINT delete, and rb-111's creation-stamp probe".
13. `privacy_tests.rs:16685-16692` same test, helper-scoped clause — the assertion `rb22p_count(&helper, &stamp_index) == 2` stays **2 and stays line-neutral**, but its message ("Equal cardinalities mean equal sets, so a third reach anywhere else shows up as a gap") is now FALSE. Reword in place to: "…both of the HELPER's reaches; the file's third is rb-111's mint, closed by `[rb111/index-reach]` below, which asserts helper 2 + mint 1 == file 3." **The closure arithmetic itself moves into the rb111 block** (clause `[rb111/index-reach]`) so this edit stays line-neutral.

**C — clauses whose SEMANTICS widen (must stay a tooth; widen line-neutrally, put the new exactly-once tooth in the rb111 block):**

14. `privacy_tests.rs:6868-6895` `m22s4_sender_bound_once_and_sole_identity_source` `[X9/dispatch-args]` — the `(ctx` walk at :6870-6886 asserts `stripped.starts_with("me)")` for every `(ctx,` form. `mint_export_stamp(ctx,now)` squashes to `(ctx,now)` → **RED today**. Line-neutral widening: `stripped.starts_with("me)") || stripped.starts_with("now)")`, message (:6876-6879) reworded within the same line count to say why `now` is safe — it is the i64 clock, bound exactly once by `[X9/now-bind]` (:6787) with the file's clock reads pinned at two by `[X9/now-file]` (:6725), so it cannot be an identity. The floor `ctx_calls >= 3` (:6887) is unchanged (6 → 7 calls). **`[rb111/dispatch-now-once]` in the rb111 block owns the new tooth:** exactly ONE `(ctx,now)` call in the reducer body and its offset is the mint's.
    *(`[X9/key]` at :6848-6865 is UNCHANGED and is the reason the probe must live in a helper: it requires every `.find(`/`.filter(` argument in the reducer body to be `me`.)*

**D — prose-only retruths (no assertion change; line-count-neutral):**

15. `privacy_tests.rs:6696-6705` `m22s4_now_bound_once` doc — ":6703-6705 "(residual R-rb-86-SAMEMS records the other direction: two requests inside one millisecond share a stamp and are reaped together, both already expired)" is FALSE after the fix. Replace with: "(rb-111, ADR-0268, closes the other direction: the write site refuses a stamp a live bundle already carries, so one stamp is one request.)"
16. `privacy_tests.rs:20838-20847` `rb107_reducer_admits_twice_before_the_first_write` `[rb107/exit-shape]` — counts unchanged (3 / 2 / 1 / 0). Prose: "a THIRD, undeclared early exit shows up here as a gap" is now incomplete — a `?` is invisible to this census. Append (within the same line count): "…This census counts `return` forms only; the region's `?` exits are counted by DEPTH in `[rb111/mint-exit]`."
17. `privacy_tests.rs:9720-9733` `rb65p_export_emits_one_observation` `[emit/reachable]` comment block — "the depth-0 count of zero is the property that actually matters: a top-level early exit below the purge is what makes the emission dead code". Since rb-111 there IS a depth-0 early exit (the mint's `?`) and it is correct (it rolls the whole transaction back). Retruth line-neutrally, naming `[rb111/mint-exit]` as the owner of the `?` shape.
18. `privacy_tests.rs:20943-20957` `[rb107/pre-gate-adjacency]` message — add the mint to the list of statements N1 now welds ("between the gate and the walk" now contains the mint). Below :16799; line growth permitted.
19. `privacy_tests.rs:16885-16901` `rb86_export_write_site_is_frozen_to_one_stamp` doc — B1/B1'/B1'' narrate `let now` shapes inside the loop; add one sentence that the loop now reads `stamp` and that `[rb86/one-now-binding]` (:16956, `letnow=` == 1) is joined by `[rb111/one-stamp-binding]` (`letstamp=` == 1).
20. OPTIONAL, do NOT spend line budget: `:14410`, `:14443`, `:14459` (`rb85_helper_is_never_named_outside_privacy_rs`) and `:15520` say "every chunk committed in that millisecond" — still literally true of a stamp delete, merely no longer the worrying case. Leave them.

**Verified UNCHANGED (checked explicitly, do not touch):** `[X9/now-file]` 2 (:6725 — `now_ms(` needs a `(`; `now_ms:i64` and `now_ms.saturating_add(` do not match); `[X9/now-scope-*]` 1/1 (:6776); `[X9/now-bind]` 1 (:6787); `[X9/now-import]` / `[X9/now-alias]` (:6739/:6752); `[X9/returns]` 3 pre-purge (:6620); `[X9/insert-count]`, `[X9/arm-*]`, every `[X9/order]` (:6547-6662); `m22s4_insert_row_fields_exact` all eight columns + `chunk_id:0` + `owner_identity:me` + `.len()asu32` (:6942-6978); `[X9/accessors]` (:6898); `[rb86/one-now-binding]` 1 (:6956); `[rb86/stamp-site]` count 1 (:16968 — only its needle moved); `[rb85/no-sweep]` 0, `[rb85/handle-ban]` 0, `[rb85/take-adjacent]`, `[rb85/iter-scope]` 0×4, `[rb85/iter-sanctioned]` 1×3, `[rb85/iter-census]` 3 (:13930), `[rb85/ratchet-vacuity]` ≥7 (:14230, a floor); `[rb86/stamp-delete]` 1 (:16556), `[rb86/pk-delete]` 1 (:16577), `[rb86/owner-delete]` 0 (:16604), `[rb86/seam-sites]` 2 (:16708); `[rb107/cap-binding]` 1, `[rb107/cap-window]` 0 (the window is `letmutper_table:`→`lettotal=`, entirely below the mint), `[rb107/cap-census]` 4 (the mint statement contains no `cap`), `[rb107/gate-depth]` 2, all `[rb107/gate-order]`, `[rb107/reason-count]` 2/2 (our reason token is different), `[rb107/count-census]` 2/2/2, `[rb107/exact-gate-adjacency]` N2, `[rb107/seam-counts]`; `rb65p_nd_purge_binding` (:9308) and `rb65p_export_binds_the_purge_result` (:9931) — the `}letpurged=` adjacency is untouched because the mint goes BELOW the pre-gate; `rb22p [W/total]` 5 and `[W/schedule-census]` 3 (:817/:838); `rb48_privacy_has_exactly_one_cfg_attribute` 1 (:8539); `rb22p_no_bare_quote_in_privacy` (:1074, 1 sanctioned quote pair); all of rb-109; all of rb-110 (`[rb110/no-alias]` READ 3 / STAMPS 2 / family 5, `[rb110/decl]`, `[rb110/census-crate]` 47 files, `[rb110/ban-roster-live]` — `"EXPORT_STAMP"` as a split fragment is a substring of the new constant, so the live-roster clause passes).

### 3b. New `rb111_` tests — names are FIXED (the ledger's X1 filter names them)

Shared helpers to declare at EOF (all in `rb111_helper_roster()`): `rb111_nd_mint_fn()`, `rb111_nd_mint_named()`, `rb111_nd_mint_stmt()`, `rb111_nd_probe_const()`, `rb111_nd_reason()`, `rb111_mint_body(squashed)`, `rb111_mint_sig_pin()`, `rb111_mint_body_pin()`, `rb111_mint_decl_source()`, `rb111_mint_body_source()`, `rb111_probe_decl_source()`, `rb111_mint(ctx, now)` (**the ONE call wrapper** — the `rb109_tick` idiom at :21608, so `mint_export_stamp` is named exactly once in this file), `rb111_table(fx)` (re-spell `fx.table_keyed("export_bundle","created_at_ms",|r| r.created_at_ms)` — do NOT reuse `rb109_table`, whose roster is closed), `rb111_row(...)`, `rb111_seed(...)`, `rb111_test_roster()`, `rb111_helper_roster()`, `rb111_dependency_roster()`, `rb111_label_roster()`.

**T1 `rb111_mint_returns_the_first_free_stamp_at_or_after_the_clock`** — native-host EXECUTION, the rb-109 shape.
- `[rb111/mint-table]` value table over a live fixture, every row seeded then asserted: empty store → `now`; `{now}` occupied → `now+1`; `{now, now+1}` → `now+2`; gap at `now+1` with `now` occupied → `now+1`; only `now+1` occupied → `now`; the first `W-1` consecutive occupied → `now+W-1`; all `W` occupied → `Err(export_reject_stamp_contention)`. **KILLS:** a mint that always returns `now` (status quo, stage 3); a mint that always skips (`1..W`); a mint that scans the wrong direction; a mint that stops at the first gap boundary.
- `[rb111/mint-value]` the Err payload equals `stringify!(export_reject_stamp_contention)` exactly (string equality, not `contains`). **KILLS:** a respelled wire value.
- `[rb111/mint-index]` `fx.requested_indexes()` contains `export_bundle_created_at_ms_idx_btree` and nothing else. **KILLS:** a probe on the owner index or on a table nobody registered (which reads as empty and always returns `now`).
- `[rb111/mint-iters]` `fx.open_iters() == 0` after every probe. **KILLS:** a leaked scan — an hourly-scale resource strand.
- `[rb111/mint-readonly]` the store's `(owner, stamp, chunk_id)` triple set is byte-identical before and after every probe. **KILLS:** a mint that deletes the squatter (the host ABORTS on an unregistered-index write and would MOVE rows on a registered one).
- RED at: stage 2 (build, `mint_export_stamp` unresolved), stage 3 (status-quo body: rows 2,3,6,7), stage 3b (no-Err fallback: row 7), stage 3c (`1..W+1`: row 1).

**T2 `rb111_a_same_millisecond_burst_takes_distinct_stamps_until_the_window_is_full`** — the residual's own sentence.
- `[rb111/burst-distinct]` at ONE fixed `now`, 16 successive (mint → seed a 17-chunk bundle at the minted stamp under a distinct owner) cycles yield **16 distinct stamps, exactly `now..now+15`, sorted**. **KILLS:** the status-quo body (all 16 equal `now` → distinct count 1); any mint that reuses a live stamp.
- `[rb111/burst-refused]` the 17th mint at the same `now` is `Err(export_reject_stamp_contention)`, and the store still holds exactly 16×17 = 272 rows. **KILLS:** the fallback-to-`now` mutant (stage 3b) and a silent success.
- `[rb111/burst-recovers]` after the clock advances by `W`, the 17th mint succeeds at `now+W`. **KILLS:** a mint that latches the refusal / a permanently wedged window (proves the refusal is retryable, which is what makes R-rb-111-CONTENTION LOW).
- RED at: stage 2; stage 3 (`[rb111/burst-distinct]`); stage 3b (`[rb111/burst-refused]`).

**T3 `rb111_one_tick_reaps_sixteen_whole_bundles_from_a_same_millisecond_burst`** — THE CRITERION, end to end.
- Population: at one `now0`, mint-and-seed **18** bundles of 17 chunks each (owners 1..18, 8 KiB payload, the rb-109 sizing) → stamps `now0..now0+17`, 306 rows. Then ONE tick at `now0 + EXPORT_BUNDLE_TTL_MS`.
- `[rb111/bound-read]` `read == 256` (the window binds: 306 > 256).
- `[rb111/bound-planned]` `planned == EXPORT_REAP_MAX_STAMPS_PER_TICK == 16`.
- `[rb111/bound-bundles]` `reaped == 272` — **sixteen BUNDLES, not one delete unit**. Under the status-quo body all 18 bundles carry one stamp: `planned == 1` and `reaped == 306`. **This single clause is the residual.**
- `[rb111/bound-survivors]` the survivor `(owner, stamp, chunk_id)` triple set equals exactly the two NEWEST-stamped bundles (34 rows), compared as a sorted SET (the rb-109 `[rb109/...]` survivor idiom at :21811-21816 — equal counts with disjoint sets is the measured failure).
- `[rb111/bound-attribution]` `reaped == 16 * 17` asserted as the product of `EXPORT_REAP_MAX_STAMPS_PER_TICK` and `EXPORTERS.len()`-derived `EXPORT_MIN_BUNDLE_ROWS`, not as a transcribed 272. **KILLS:** a number moved to match the code.
- RED at: stage 2; stage 3 (planned 1 / reaped 306).

**T4 `rb111_minted_stamp_is_the_minimum_free_stamp_over_random_occupancy`** — proptest (the file's existing proptest idiom; if `proptest` is not a dev-dependency of this crate, a seeded deterministic sweep over ≥ 256 pseudo-random occupancy masks in `[now, now+3W)` — the tester must check `server-module/Cargo.toml` and say which it used).
- `[rb111/prop-free]` the minted stamp is never occupied.
- `[rb111/prop-minimal]` it is the MINIMUM free stamp ≥ `now`.
- `[rb111/prop-err-iff]` `Err` ⟺ all of `[now, now+W)` are occupied.
- `[rb111/prop-bounded]` the minted stamp is always in `[now, now+W)`.
- **KILLS:** every off-by-one and every "first gap after a run" variant the value table's seven rows miss. RED at stage 2 and stage 3.

**T5 `rb111_export_write_site_stamps_from_the_mint_and_exits_once`** — reducer-body source pins.
- `[rb111/stamp-bind]` `rb22p_count(&body, "letstamp=")` == 1 (the `[rb86/one-now-binding]` shape: a shadowing second binding is the measured cheat family).
- `[rb111/mint-call-once]` `rb22p_count(&body, rb111_nd_mint_stmt())` == 1, where the needle is the WHOLE statement `letstamp=mint_export_stamp(ctx,now)?;` — argument list and `?` included. **KILLS:** `mint_export_stamp(ctx, now).unwrap_or(now)`, `.unwrap_or_default()`, a `let _ = mint…` probe whose result is discarded, and `mint_export_stamp(ctx, something_else)`.
- `[rb111/mint-position]` `at_pre_gate < at_mint < at_per_table` and `m22s4_brace_depth_at(&body, at_mint) == 0`. **KILLS:** the mint wrapped in an `if`, hoisted above the pre-gate, or sunk below the insert loop.
- `[rb111/mint-exit]` in the region `body[at_purge..at_ok]`: total `?` count == 2; depth-0 `?` count == **1**, and its offset equals `at_mint + len(mint stmt) - 2`. **KILLS:** a second undeclared `?` early exit — the shape `[rb107/exit-shape]` and `[emit/reachable]` are both structurally blind to.
- `[rb111/dispatch-now-once]` exactly one `(ctx,now)` call in the body, at the mint's offset (the tooth `[X9/dispatch-args]` gave up when it widened).
- `[rb111/row-from-stamp]` inside the row literal: `request_id:stampasu64` == 1 and `created_at_ms:stamp,` == 1, and `rb22p_count(literal, "now") == 0`. **KILLS:** one column reverted to `now` while the other reads `stamp` — the shape that makes `request_id` and `created_at_ms` disagree and the client wait forever.
- RED at stage 1 (runtime: every count 0 or the position clause unsatisfied) and stage 3 (`[rb111/row-from-stamp]` holds, the rest hold — deliberately: T5 is not the semantic tooth).

**T6 `rb111_mint_is_declared_once_private_and_frozen`** — helper source pins + the constant, the rb-85/rb-107 shape.
- `[rb111/probe-value]` HOST READ `crate::privacy::EXPORT_STAMP_PROBE_WINDOW_MS == 16` (forces existence and reachability; this is what makes stage 2 a BUILD failure).
- `[rb111/probe-decl]` frozen squashed declaration `constEXPORT_STAMP_PROBE_WINDOW_MS:i64=16;` — proved satisfiable against an independently spelled `rb111_probe_decl_source()` FIRST, `rb107_blind_count` == 0, then `== 1` in squashed privacy.rs; bare head `constEXPORT_STAMP_PROBE_WINDOW_MS:` also `== 1` (the cfg-twin clause, `[rb107/…-source]` at :20017).
- `[rb111/probe-vis]` `rb107_vis_window_text` before the declaration contains neither `pub` nor `#[`.
- `[rb111/mint-decl]` `rb22p_count(&squashed, rb111_nd_mint_fn())` == 1; `rb111_nd_mint_named()` == 2 file-wide (declaration + the one reducer call) — the `[rb85/helper-name-census]` shape (:14436); and `== 1` in `PRIVACY_TESTS_RS` (the single `rb111_mint` wrapper), with a paren-LESS identifier census also `== 1` (the fn-item-binding escape rb-85 measured at :14462).
- `[rb111/mint-sig]` frozen squashed signature `fnmint_export_stamp(ctx:&ReducerContext,now_ms:i64)->Result<i64,String>` + vis window (no `pub`, no `#[`). **KILLS:** a widened visibility, an extra parameter (a caller-chosen stamp), an infallible return type.
- `[rb111/mint-body]` frozen squashed body EQUALITY, control-proved against `rb111_mint_body_source()` spelled independently, `rb107_blind_count` == 0. **KILLS:** everything the value table misses — a band-keyed predicate, a reordered probe, a changed bound. **The rustfmt twin question must be settled by the measured `cargo fmt` output (§4 task 0); if the chain has exactly one canonical form, say so in the doc and accept NO twin (the `rb85_cutoff_sig_pin` note at :11799).**
- `[rb111/mint-hygiene]` in the mint body: `.iter()` 0, `.ins`+`ert(` 0, `.del`+`ete(` 0, `.co`+`unt()` 0, `now_ms(` 0, `.created_at_ms().filter(` exactly 1, `ctx.db.export_bundle()` exactly 1.
- `[rb111/index-reach]` **the closure arithmetic promoted out of `[rb86/stamp-index-reaches]`**: `count(.created_at_ms(., file) == 3` and `helper 2 + mint 1 == 3`.
- `[rb111/reason-once]` `stringify!(export_reject_stamp_contention)` == 1 in the whitespace-PRESERVING view and == 1 in the SQUASHED view, and the two are equal (the `[rb107/reason-count]` two-view idiom at :20753-20791 — the only instrument that sees an interior-space respelling of a `stringify!` token). Plus `== 1` in the mint body scope.
- RED at stage 1 (runtime for the text clauses) / stage 2 (build for the value read) / stage 3 (`[rb111/mint-body]`).

**T7 `rb111_docs_record_the_closed_same_millisecond_residual`** — DOCS = ADR-0268, ADR-0238, ARCHITECTURE.md via `include_str!`. NEVER scans `client/**`.
- `[rb111/prod-residual-closed]` `rb22p_count(PRIVACY_RS, "R-rb-86-" + "SAMEMS")` == **0** (needle `concat!`-split). Pre-state 1 (privacy.rs:1936) → RED at stage 1. The `[rb110/prod-residual-closed]` precedent.
- `[rb111/prod-stale-claim]` phrase bans in privacy.rs, each MEASURED ≥ 1 pre-fix: `every bundle that committed inside the same millisecond` (:1679) and `every bundle committed in that same millisecond` (:1936). Identifier-free falsehoods no census can see.
- `[rb111/doc-closure]` ADR-0238 contains a line matching `## Amendment (2026-09-25, rb-111` AND at least one line carrying BOTH `R-rb-86-SAMEMS` and `rb-111` as whole tokens (reuse the `rb110_carries_marker` digit-boundary rule at :23429 — `rb-1110` must not count). **Scoped to a line, not to the file:** ADR-0238:469 already names the residual on a line with no rb-111 (it is rb-86 history and stays), so a file-level `contains && contains` is GREEN pre-fix and is FORBIDDEN.
- `[rb111/doc-adr]` ADR-0268 exists, spells `EXPORT_STAMP_PROBE_WINDOW_MS`, `mint_export_stamp`, `export_reject_stamp_contention`, `R-rb-86-SAMEMS`, `**Extends:** 0238`, and `**Amends:** —`.
- `[rb111/doc-arch]` ARCHITECTURE.md has a line starting `**rb-111**` naming ADR-0268 and R-rb-86-SAMEMS.
- `[rb111/doc-split-token]` per doc, identifier-only count == raw count for each of the three new identifiers (the markdown-comment / line-break class rb-67 measured).
- `[rb111/doc-tickbound-open]` **the sibling stays open**: ADR-0238 + ARCHITECTURE.md must NOT claim R-rb-86-TICKBOUND closed — assert `R-rb-86-TICKBOUND` occurs ≥ 1 and no line carries both it and `closed`. **KILLS:** an over-claiming doc, the single most likely doc error in this slice.
- Clause ORDER: compute every count first, interpolate all into the FIRST clause's message so one stage-1 run records the whole pre-state.

**T8 `rb111_test_roster_is_closed`** — the rb-110 T4 shape at its minimum (~100 lines). `rb111_test_roster()` (8), `rb111_helper_roster()` (closed — **must include `rb111_mint_body` and `rb111_nd_mint_stmt`, which are called from `rb85_…` and `rb107_…` helpers above**), `rb111_dependency_roster()` (7: `rb48_privacy_has_exactly_one_cfg_attribute`, `rb22p_no_bare_quote_in_privacy`, `rb22p_scan_hygiene`, `m22s4_now_bound_once`, `rb86_export_write_site_is_frozen_to_one_stamp`, `rb107_reducer_admits_twice_before_the_first_write`, `rb85_reaper_reads_a_bounded_range_and_never_sweeps`), `rb111_label_roster()` (label → owner index; ≥ 30 entries), vacuity + roster-dup preambles, per-name `fn <name>(` == 1, adjacency flush+indented summed == 8, decl-total = squashed `fnrb111_` count == tests + helpers, label census via `rb107_test_span` (carriers == [owner]; every test ≥ 2 labels), body floor (`iffalse{` 0, `#[ignore]` 0, squashed span ≥ 300).

### 3c. RED stages (record at `memory/projects/gates/rb-111.red-before.md`; name the exact tree for each)

- **Stage 0 (prerequisite):** the doc-keeper drafts `docs/adr/0268-…md` BEFORE the tester patch — T7's `include_str!` is a compile error without it (the rb-110/ADR-0267 precedent).
- **Stage 1 — runtime RED**, unfixed tree + ONLY T5, T7 and their helpers (no T1-T4, no T6, no re-freezes): `[rb111/stamp-bind]` 0, `[rb111/mint-call-once]` 0, `[rb111/mint-exit]` depth-0 0, `[rb111/dispatch-now-once]` 0, `[rb111/row-from-stamp]` 0/0; `[rb111/prod-residual-closed]` 1, `[rb111/prod-stale-claim]` 1+1, `[rb111/doc-closure]` 0.
- **Stage 2 — build RED**, unfixed tree + the FULL tester patch: `E0425` on `EXPORT_STAMP_PROBE_WINDOW_MS` (T6's value read) and on `mint_export_stamp` (the `rb111_mint` wrapper). Record the exact count.
- **Stage 3 — semantic RED** (THE deciding stage), full tester patch + the production patch with the **status-quo body** `Ok(now_ms)` (run under plain `cargo nextest`, not `just ci-fast`: the unused constant is a rustc `dead_code` warning that `-D warnings` would turn into an error): `[rb111/mint-table]` rows 2/3/6/7, `[rb111/burst-distinct]` 1 distinct instead of 16, `[rb111/bound-bundles]` planned 1 / reaped 306 instead of 16 / 272, `[rb111/prop-minimal]`, `[rb111/mint-body]`.
- **Stage 3b — the no-fallback decision:** probe loop present, `Err(...)` replaced by `Ok(now_ms)` → `[rb111/mint-table]` row 7 and `[rb111/burst-refused]` RED.
- **Stage 3c — the no-drift decision:** `for offset in 1..EXPORT_STAMP_PROBE_WINDOW_MS + 1` → `[rb111/mint-table]` row 1 RED (the common case must not drift the stamp).
- **Stage 4 — re-freeze necessity** (implementer-measured on the FIXED tree): revert each of §3a items 1-14 one at a time; each must red its own clause; restore. This is the evidence that no re-freeze was a cosmetic edit.
- **GREEN:** fixed tree + full patch, **zero further test edits**, 1023 + 8 = **1031** (1032 with `dev_reducers`).

---

## §4. Specialist tasks

**Task 0 (orchestrator, BEFORE the tester starts).** Write the §2a snippet to a scratch `.rs`, run `cargo fmt` with the repo's config, and paste the EXACT formatted bytes into the tester's brief as spec text. Also `cargo check` it inside privacy.rs to confirm `.filter(candidate)` compiles as a point (SDK-verified, but a 60-second measurement beats a plan assertion). Without this the frozen body pin is a coin flip.

**Tester (opus, separate agent).** Owns `privacy_tests.rs` only. In-place edits above :16799 must be **line-count-neutral** (absorb §3a item 11's growth in the :13968-13976 comment). All new code appended at EOF under a `// ===` rb-111 banner. Never copy a pin into its own control.

**Implementer (opus, a DIFFERENT agent; never edits `privacy_tests.rs`).** Lands §2a/2b/2c. Constraints the tests impose (violating any is a RED, not a style point): zero new `"` bytes; zero `#[cfg]`; zero `.iter()`, `.count()`, `.insert(`, `.delete(`, `now_ms(` in the new code; the constant private and `i64 = 16`; the fn private with the exact signature; the reject reason spelled `stringify!` with no interior space; the mint statement's squashed form byte-identical to `rb111_nd_mint_stmt()`; `cargo fmt --check` clean. Also: re-point `docs/adr/0265-*.md:55` and `:298` to the post-patch line spans of `[rb86/stamp-cap-throughput]` and `[rb86/cap-wiring]` **only if** §3a item 11's absorption failed to hold the net delta at 0 (measure, do not assume).

**Doc-keeper.** ADR-0268 draft at stage 0, finalised after the lenses; ADR-0238 amendment; ARCHITECTURE.md paragraph. Fact-check the draft against the diff (grep for superlatives and for slice attribution).

**Gate order.** `just ci-fast monster-realm-module` (clippy `-D warnings`, nextest, doctests) · `cargo fmt --check` · **`just knowledge` (regen — the three anchors MOVE) then `just knowledge-check`** · `just adr-digest` + `just adr-digest-check` · full `just ci` once (detached, `setsid nohup` + CI-EXIT marker) · `mr-gates check --slice rb-111 --timeout 2400` **from the worktree** (`cmd_check` is cwd-relative).

---

## §5. Acceptance ledger (`memory/projects/gates/rb-111.gates.md` — 0 seeded criteria; all X-gates authored here)

Prefix every CHECK with `PATH=$HOME/.cargo/bin:$HOME/.asdf/installs/nodejs/24.13.1/bin:$HOME/.local/bin:$PATH`. EXPECT is never echoed inside CHECK; no `||`; every CHECK starts with `cargo`/`just`/`node` or is `MANUAL:` with a resolvable `path:line` EVIDENCE.

**X1 — [rb-111 teeth]** WHEN the eight `rb111_` tests run by exact name over the shipped tree THE SYSTEM SHALL report exactly eight run and eight passed.
CHECK: `cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=privacy::privacy_tests::rb111_mint_returns_the_first_free_stamp_at_or_after_the_clock) + test(=privacy::privacy_tests::rb111_a_same_millisecond_burst_takes_distinct_stamps_until_the_window_is_full) + test(=privacy::privacy_tests::rb111_one_tick_reaps_sixteen_whole_bundles_from_a_same_millisecond_burst) + test(=privacy::privacy_tests::rb111_minimum_free_stamp_placeholder) + …' 2>&1 | tail -3` — **the implementer substitutes the eight FINAL names from §3b verbatim.**
EXPECT: `/Summary \[[^\]]*\] 8 tests run: 8 passed, [0-9]+ skipped/`
EVIDENCE: `<to be filled>`

**X2 — [non-regression]** WHEN the full server-module suite runs with ignored tests forced on, under default features and `--features dev_reducers`, THE SYSTEM SHALL pass with zero failures and zero skips (measured baseline + 8).
CHECK: `node -e "const{spawnSync}=require('child_process');const run=a=>{const r=spawnSync('cargo',['nextest','run','-p','monster-realm-module','--run-ignored','all'].concat(a),{encoding:'utf8',maxBuffer:64*1024*1024});return String(r.stdout)+String(r.stderr)};const d=run([]),f=run(['--features','dev_reducers']);const s=o=>(o.match(/Summary.*$/m)?o.match(/Summary.*$/m)[0]:'NO-SUMMARY');console.log('default: '+s(d));console.log('dev_reducers: '+s(f));const ok=/ 1031 tests run: 1031 passed, 0 skipped/.test(d)&&/ 1032 tests run: 1032 passed, 0 skipped/.test(f);console.log('rb111-X2:'+(ok?'SUITE-GREEN':'SUITE-RED'))"` (nextest's Summary is on **stderr** — the join is load-bearing).
EXPECT: `rb111-X2:SUITE-GREEN`

**X3 — [re-frozen pins still bite]** WHEN the eight pre-existing tests whose frozen literals, counts or walks this slice re-froze run by exact name THE SYSTEM SHALL report eight run and eight passed.
CHECK: `cargo nextest run -p monster-realm-module --run-ignored all -E 'test(=privacy::privacy_tests::m22s4_now_bound_once) + test(=privacy::privacy_tests::m22s4_sender_bound_once_and_sole_identity_source) + test(=privacy::privacy_tests::m22s4_reducer_statement_order) + test(=privacy::privacy_tests::rb85_reaper_reads_a_bounded_range_and_never_sweeps) + test(=privacy::privacy_tests::rb86_reaper_deletes_whole_bundles_by_stamp_and_never_by_chunk_id) + test(=privacy::privacy_tests::rb86_export_write_site_is_frozen_to_one_stamp) + test(=privacy::privacy_tests::rb107_reducer_admits_twice_before_the_first_write) + test(=privacy::privacy_tests::rb65p_export_emits_one_observation)' 2>&1 | tail -3`
EXPECT: `/Summary \[[^\]]*\] 8 tests run: 8 passed, [0-9]+ skipped/`

**X4 — [inbound test-file citations still resolve]** WHEN the two `privacy_tests.rs:<line>` spans ADR-0265 cites are compared with the live file THE SYSTEM SHALL find `[rb86/stamp-cap-throughput]` at the cited first line, proving every in-place edit above it was line-count-neutral.
CHECK: `node -e "const fs=require('fs');const t=fs.readFileSync('server-module/src/privacy_tests.rs','utf8').split('\n');const i=t.findIndex(l=>l.includes('[rb86/stamp-cap-thr'+'oughput]'))+1;const a=fs.readFileSync('docs/adr/0265-rb107-export-admission-account-tiered-live-row-cap.md','utf8');console.log('throughput-anchor='+i);console.log('rb111-X4:'+(i>0&&a.includes('privacy_tests.rs:'+i+'-')?'CITATION-RESOLVES':'CITATION-DRIFTED'))"`
EXPECT: `rb111-X4:CITATION-RESOLVES`

**X5 — [knowledge bundle regenerated and in sync]** WHEN `just knowledge-check` runs after the regeneration THE SYSTEM SHALL report the committed bundle in sync — the three `privacy.rs#L…` anchors moved by the insert and were re-derived, not left stale.
CHECK: `just knowledge-check 2>&1 | tail -2`
EXPECT: `okf-export: bundle in sync (no drift)`

**X6 — [ADR digest current]** WHEN `just adr-digest-check` runs THE SYSTEM SHALL report DIGEST.md up-to-date — ADR-0268's header row is committed and `**Extends:** 0238` added no back-link gap.
CHECK: `just adr-digest-check 2>&1 | tail -1`
EXPECT: `adr-digest: DIGEST.md is up-to-date (no drift).`

**X7 — [RED before, GREEN after — ADR-0224 proof of teeth]** WHEN the source pins run over the unfixed tree they SHALL fail (stage 1), the full tester patch SHALL fail to build (stage 2), and the patch plus a STATUS-QUO mint body SHALL red `[rb111/burst-distinct]`, `[rb111/bound-bundles]` (planned 1 / reaped 306 instead of 16 / 272), `[rb111/mint-table]` and `[rb111/prop-minimal]` (stage 3); GREEN on the fixed tree with zero further test edits.
MANUAL: a pre-fix RED has no green-on-success runnable form on the shipped tree; the deciding evidence is the stage-3 summary line of the RED record.
EVIDENCE: `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/gates/rb-111.red-before.md:<line>`

---

## §6. Docs tasks

**ADR-0268** — `docs/adr/0268-rb111-export-creation-stamp-unique-per-live-request.md`. Header exactly the ADR-0267 shape: `**Status:** Accepted` / `**Date:** 2026-09-25` / `**Slice:** rb-111 (residual R-rb-86-SAMEMS, promoted from source slice rb-86; M-residual-backlog.spec.md#rb-111)` / `**Supersedes:** —` / **`**Amends:** —`** / **`**Extends:** 0238`** (never `Amends` — the digest gate demands a reciprocal edit `Extends` does not) / `**Subsystems:** schema-persistence, security-authz` (fixed vocab; there is no `privacy` tag) / `**Decision:** …` ≤ 240 chars, draft: *"request_data_export mints a creation stamp no live export_bundle row carries — the clock, or the first free millisecond within 16 — and rejects on contention, so one stamp is one live bundle and a reaper tick's 16 stamps are 16 bundles."*
Body: **Context** (rb-86's stamp-keyed whole-bundle delete; the write bound was 16 × bundles-per-stamp; cheap anonymous exports + millisecond reducer serialisation); **D1** the probe and why the window is 16 ms; **D2** reject, never fall back (a fallback restores the unbounded unit and the abort-loop hazard that silently retains expired personal data past the seven-day ceiling); **D3** the call site's position and the `?` rollback (ADR-0106 D8); **D4** the run-ahead is bounded and monotone per owner: a burst at ≥ 1 req/ms runs stamps ahead by (rate − 1) ms/ms, bounded by rb-107's admission cap (≤ ~2 530 live bundles ⇒ ≤ ~2.5 s), and the client's MAX-`request_id` selection stays monotone because the run-ahead is far under the 60 s cooldown; **Rejected** (a) composite `(owner_identity, created_at_ms)` index + composite point delete — structurally cleanest, but schema.rs + the table-schema eval baseline + multi-key host rows are three files outside touches; (b) owner-keyed reaper delete — rejected by rb-86, destroys a fresh export; (c) monotonic global max+1 — needs a reverse-ordered index read the SDK does not offer; (d) fall back to `now` — unbounded again; (e) a wider window — more reads under the write lock; (f) `EXPORT_STAMP_PROBE_MAX: usize` — hides that the unit is the clock's; **Consequences**, stated honestly: the common case is ONE point read that decodes nothing; a contended probe costs ≤ 16 point reads, each possibly one host buffer fill; stamps may sit up to 15 ms above the clock, shifting TTL expiry and the caller's next cooldown by the same amount; **R-rb-111-CONTENTION** (LOW, retryable) and **R-rb-86-TICKBOUND stays OPEN** (rows per bundle are still unbounded — rb-112); **Confirmation** names T1-T8 and the fourteen re-frozen pins.

**ADR-0238** — append `## Amendment (2026-09-25, rb-111 — residual R-rb-86-SAMEMS closed)` AFTER the rb-110 amendment (which ends ~:770). Content: the "Bounds, stated honestly" paragraph of the rb-86 amendment (:462-481) is **SUPERSEDED in its SAMEMS half and left in place as history** — list it under the ADR's own `**Superseded sentences**` convention (:723-730) and edit nothing in place, so that convention stays true. State what changed: WRITE is now at most 16 BUNDLES per tick; the residual is discharged; **R-rb-86-TICKBOUND explicitly stays open**. **HARD CONSTRAINT: this amendment must not spell `EXPORT_REAP_MAX_DELETE_PER_TICK` anywhere** — `[rb110/doc-old-name]`'s per-line marker rule and the ADR-0238 raw CEILING of ≤ 4 leave almost no headroom, and any new occurrence also needs `rb-110` on its own line.

**ARCHITECTURE.md** — new `**rb-111**` paragraph after rb-110's (:2309), before `## M24` (:2311), in the house style. Must not spell the retired read-cap name (ARCHITECTURE.md's raw old-name ceiling is 2).

**`just adr-digest`** then **`just knowledge`** — knowledge **LAST, after the final `cargo fmt`**, because `privacy.rs#L1514/#L1740/#L1827` all move by ~40 lines.

---

## §7. Risks and residuals

- **R1 (accepted, not a residual): privacy.rs is NOT line-neutral** (2025 → ~2065). The three `docs/knowledge` anchors are regenerated (X5). The inbound `privacy.rs:<line>` citations in ADR-0231 (:40 :62 :67 :110 :394) and ADR-0265 (:29 :91 :138 :141 :219 :253) are **already drifted at HEAD** (measured: ADR-0265:138 cites :1530 for a purge that sits at :1535; ADR-0231:110 cites :1481-1483 for a gate at :1521-1523) — do NOT chase them. Register **R-rb-111-ADRCITE** (LOW) after the lenses. Only `privacy.rs:1199` (ADR-0265:29, `EXPORT_REQUEST_COOLDOWN_MS`) is accurate today and it sits ABOVE the insert, so it survives.
- **R2 — the rustfmt shape of the probe chain.** Mitigated by §4 task 0. If the measurement shows a plausible twin, the tester ships the one-comma-twin idiom (`rb85_helper_body_pin_flat`, :11878) and the owning test asserts the one-byte difference.
- **R3 — `[rb85/bundle-scope]` line growth above `privacy_tests.rs:16799`.** Mitigated by absorbing it in the :13968-13976 comment; gated by X4.
- **R4 — over-claiming in the docs.** `[rb111/doc-tickbound-open]` is the tooth; a reviewer must also confirm no doc says the reaper's write set is now bounded in ROWS (it is not — a single oversized bundle still wedges a tick; that is R-rb-86-TICKBOUND → rb-112).
- **R5 — scope creep into rb-112.** rb-111 must not touch `EXPORT_CHUNK_ROWS`, the stamp cap, or the reaper.
- **R6 — ADR number race.** Re-check `ls docs/adr/` immediately before the commit; 0268 free at 9ed396e.
- **Residuals to register AFTER the lenses (`mr-gates residuals add` is add-only, not upsert — register late, never during planning):**
  - **R-rb-111-CONTENTION** (LOW) — while a 16 ms window is fully occupied, a legitimate request is refused with `export_reject_stamp_contention`; retryable, strictly better than the status quo (which succeeded and formed an unbounded delete unit), and reachable only under a ≥ 1 req/ms multi-identity burst against the rb-107 admission cap.
  - **R-rb-111-ADRCITE** (LOW) — the pre-existing stale `privacy.rs:<line>` citations in ADR-0231/ADR-0265, now further shifted.
  - **R-rb-86-TICKBOUND** stays OPEN, untouched.

---

## §8. Open questions for the plan lenses to adjudicate

1. **Window size 16.** It equals `EXPORT_REAP_MAX_STAMPS_PER_TICK` by coincidence of value, not by derivation. Should it be derived (`= EXPORT_REAP_MAX_STAMPS_PER_TICK as i64`) so a reviewer sees the relationship, or stay an independent DoS knob? **Planner's position: independent.** They bound different things, and `[rb107/cap-derivation]`'s precedent is that a derived constant must be derived from something it actually depends on.
2. **Call-site placement (§1 M1).** Below the pre-gate (planner) vs. between the purge and `let cap` (brief). The red-team should test the counter-argument: does refusing on contention AFTER the admission gate ever admit a request the pre-gate would have refused? (No — both are refusals; order only changes which reason the caller sees and how much work a refused caller costs.)
3. **The reject reason's name.** `export_reject_stamp_contention` vs `export_reject_busy`. The client branches on no reject reason (grep `export_reject_` in `client/src` → 0 hits), so this is a wire-value/ops-vocabulary decision only.
4. **`?` vs an explicit `match`** at the call site. `?` is terser and the frozen statement pin covers it; an explicit `match` with `return Err(e)` would make `[rb107/exit-shape]` and `[emit/reachable]` see the exit natively (counts 3→4 and depth-0 0→1) instead of needing `[rb111/mint-exit]`. **Planner's position: keep `?`** — it matches the file's `rows_fn(ctx, me)?` idiom, and a census that is structurally blind to a language construct should be *closed*, not routed around.
5. **T4's instrument.** Confirm whether `proptest` is a dev-dependency of `monster-realm-module`; if not, T4 is a seeded deterministic sweep and must say so in its doc.
6. **Should T3's population be 18 bundles (306 rows) or 17 (289)?** 18 makes both the read cap AND the stamp cap bind with two clean survivors; 17 makes `reaped == read + 16`. Pick one and derive every number in the test from the constants, never transcribe.

---

## Recommended workflow pattern

**brainstorm → debate (plan reviewer + plan red-team) → build → debate again (tests reviewer + tests red-team) → verify**, i.e. the rb-109/rb-110 pattern with one addition: the **reducer-security-auditor is mandatory** here because, unlike rb-110, this slice changes reducer behaviour on a personal-data write path.

**Cost/benefit (one line):** two extra lens passes (~15-20% of the $150 budget) buy the only defence against the two failure modes this slice can actually ship — a frozen body pin that is unsatisfiable (permanently red, reads like a missing feature) and a re-froze-a-count-without-its-attribution loosening across five separate censuses — both of which cost a full red→fix cycle plus a merge-gate re-run if found late.
agentId: af733a35d14d67a8d (use SendMessage with to: 'af733a35d14d67a8d', summary: '<5-10 word recap>' to continue this agent)
<usage>subagent_tokens: 320231
tool_uses: 70
duration_ms: 1124009</usage>