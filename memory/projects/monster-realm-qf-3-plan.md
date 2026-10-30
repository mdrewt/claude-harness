# qf-3 plan memo — resume #2 (2026-10-25): SPLIT into two increments; #1 built here, #2 parked on index.test.ts

Status: hidden dependency #4 MEASURED at verify-scope (handoff entry "qf-3 hidden dependency #4 measured"):
`client/src/ui/screens/index.test.ts` (:2325 `monstersFlowCtx`, test CTL8B-4-HOST-FLOW :2403) drives the REAL
monstersScreen with untyped rows lacking `lastCareAtMs` and a ctx lacking `wallNowMs`; every screen-side readiness
design throws there at RUNTIME on the first button. Recommended too: `client/test-util/mainBootHarness.ts` (the three
`wasmPkg*Mock` rosters need `care_remaining_ms`). NOT affected (measured): evolutionView.test.ts (EvolutionMonsterViewModel
fixtures), index.test.ts `clockCtx`/`CTX` (probe adapters only), index.test.ts:3393 ME8F (bagScreen only).

## Increment #1 — THIS resume (all in touches): server column + privacy export + wasm export + store/rowConvert field
Gates: QF3.1 ✓ QF3.2 ✓ (QF3.4 server leg ✓; QF3.3 + QF3.4 client leg stay UNMET → park, not DEFER).

### Server
- schema.rs `MonsterPub`: append `#[default(0i64)] pub last_care_at_ms: i64` AFTER `nutrition_pct` (typed literal —
  [[spacetimedb-i64-default-attr-encoding]]). Comment: "qf-3: the care cooldown anchor, copied VERBATIM from `monster`
  so the owner's sheet can render readiness; server-epoch ms, 0 = never cared (first care allowed)". Retruth
  Monster:244 "Stays OFF monster_pub (YAGNI)" → "Mirrored onto monster_pub since qf-3 (the owner's sheet reads it)".
  No `/` in any schema.rs string literal (snapshot parser).
- marshal.rs `pub_from_monster` (:216 literal): `last_care_at_ms: m.last_care_at_ms`; doc (:198-204): the three history
  tiers are derived, the care anchor is copied verbatim.
- privacy.rs `json_monster_pub` (:572): after nutrition_pct, `json_field_into(.., stringify!(last_care_at_ms))` +
  `json_i64_into(&mut out, row.last_care_at_ms)` (quoted i64, the json_monster precedent at :522). Header :453 stays true.
- raising.rs: NO functional change (care dual-writes through update_monster_synced → pub_from_monster). The mirror
  sites (monster_mgmt:31, content:288, taming:161, movement:112, evolution:171, trading:757, raising:563) all construct
  through pub_from_monster ⇒ preservation by construction. trading.rs:757 `reset_trainer_bond` leaves the anchor ⇒ a
  traded monster carries the previous owner's anchor (cooldown survives the trade; the instant is now owner-visible —
  LOW, named for reducer-security-auditor).
- Regens: bindings with the 2.8.1 BINARY (`~/.local/share/spacetime/bin/2.8.1/spacetimedb-cli generate --lang typescript
  --module-path server-module --out-dir client/src/module_bindings` — measured identical to committed on master; the
  2.11.0 default differs in header+cliVersion), `node evals/battle-schema-snapshot.eval.mjs --write`, `just wasm`.
- `just ci` locally: PATH shim dir with `spacetime -> 2.8.1 binary` + isolated `XDG_DATA_HOME` (qf-2 precedent, PR #595).

### client-wasm (AGENTS invariant 1 + 5) — ONE export
`#[wasm_bindgen] #[must_use] pub fn care_remaining_ms(last_care_at_ms: i64, now_ms: i64) -> i64`: `0` when
`game_core::is_cooldown_ready(last, now, game_core::CARE_COOLDOWN_MS)`, else
`CARE_COOLDOWN_MS.saturating_sub(now.saturating_sub(last))`. Readiness decided ONLY by the predicate (ready ⟺ 0); the
subtraction is display arithmetic. i64 ⇄ BigInt (deletion_grace_ms_default precedent). No TS copy of the constant.
NO proptest in client-wasm (not a dev-dep; Cargo.toml is out of touches) → deterministic loops.

### Client (increment #1 part)
- store.ts `StoreMonsterPub.lastCareAtMs: bigint` (doc: server-epoch ms, 0n = never cared; compared with the wall clock
  ONLY through the wasm export `care_remaining_ms`, never TS arithmetic). rowConvert.ts `SdkMonsterPubRow.lastCareAtMs:
  bigint` + copied in `monsterPubRowToStore`. 14 typed fixture files (in touches): `lastCareAtMs: 0n` field-add only.

### Tester brief, increment #1 (names are load-bearing: the ledger CHECKs select on them)
Rust (crate `monster-realm-module`; module paths `privacy::privacy_tests::…`, `raising::raising_tests::nh::…`,
`marshal::marshal_tests::…`). Distinct NONZERO i64 anchors everywhere (negative + i64::MAX included where cheap).
- privacy_tests.rs: extend `m22s4_serializer_per_table_shape` monster_pub fixture (:1235, "(26 columns)" → 27) with a
  nonzero anchor and the roster row `("last_care_at_ms", m22s4_quoted_num(<same>))` AFTER nutrition_pct.
- privacy_tests.rs NEW `qf3_my_monster_pub_exposes_last_care_at_ms_to_the_owner_only`: native host (`fixture()`, register
  `monster_pub` keyed/indexed as accounts_tests:6729 does), seed a's and b's pubs via `pub_from_monster` with DISTINCT
  nonzero anchors; `fx.call_view::<MonsterPub>(VIEW_MY_MONSTER_PUB, a)` rows carry exactly a's anchors; b's carry b's;
  stranger c → empty. Assert the VALUE, not only row counts.
- marshal_tests.rs NEW `qf3_pub_from_monster_copies_last_care_at_ms_verbatim`: 3 anchors (e.g. 1_750_000_000_123,
  -42, i64::MAX) → `pub_from_monster(&m, t).last_care_at_ms == m.last_care_at_ms`; and the projection is otherwise
  unchanged for anchor-only edits (tier/nutrition unchanged).
- raising_tests.rs `mod nh` NEW `nh_care_stamps_the_pub_anchor_and_a_reject_leaves_the_pub_row_bytes`: seed anchor T0;
  care at T0+CD−1 → Err + the PUB row's `last_care_at_ms` still T0 and `to_vec(pub)` unchanged; care at T0+CD → the PUB
  row's `last_care_at_ms == T0+CD` (read the pub row, not only assert_pub_consistent).
- raising_tests.rs `mod nh` NEW `nh_train_rewrites_the_pub_and_preserves_the_care_anchor`: seed anchor T0−1_000, stack
  FOOD; `train` at T0+12_345 → pub anchor == T0−1_000 AND `nutrition_pct` changed (the row was rewritten) + assert_pub_consistent.
- client-wasm/src/lib.rs tests NEW `care_remaining_ms_matches_game_core_predicate_at_the_boundary` (+ a saturation test):
  (last, last+CD−1)→1; (last, last+CD)→0; (last, last+CD+1)→0; (0,0)→CD; d∈−3..=3 loop: `(r==0) ==
  is_cooldown_ready(..)` and r == max(0, CD−(now−last)); skew now<last → r == CD (clamped, see the register), never negative; i64::MIN/MAX no panic.
Client: rowConvert.test.ts (bigint copied, 0n survives, 2^53+1 exact, Object.keys roster gains `lastCareAtMs`);
store.test.ts required-field roster (:544-573) gains `lastCareAtMs`; 14 fixture files field-add.
RED proof: the Rust tests fail to COMPILE until the column exists (field-missing) — the behavioural RED is the privacy
roster/marshal tests against a stubbed column; the orchestrator runs every red.

## Increment #2 — NEXT resume (needs touches += index.test.ts [+ mainBootHarness.ts]); design unchanged from resume #1
- types.ts `readonly wallNowMs: () => number;` ("`Date.now()` — the wall clock, for comparisons with server-epoch
  columns; `now` stays the monotonic frame clock"). main.ts `wallNowMs: () => Date.now()` beside :1531.
- monstersModel.ts: `MonstersVm.careRemainingMs: ReadonlyMap<string, bigint>` (key monsterKey, 0n = ready) handed in by
  the screen; `buildMonstersVm(..., careRemainingMs = new Map())` (missing key ⇒ 0n: fails OPEN to the server's
  rejection); `careRemaining(vm, id)`; `sheetLayout(canFeed, canEvolve, canCare)`; `careCooldownParts(remainingMs):
  {hours, minutes}` ceil-to-minute (1n→0h1m, 60_000n→0h1m, 60_001n→0h2m, 21_600_000n→6h0m).
- monstersScreen.ts: viewModel builds the map with `care_remaining_ms(m.lastCareAtMs, BigInt(Math.trunc(ctx.wallNowMs())))`
  for own monsters; `act('care')`: remaining !== 0n ⇒ [state,'consumed'] (the Feed pattern: nothing sent); Up/Down
  `sheetLayout(.., canCare)`; `sheetOf` carries `careRemainingMs`; `shownOf` includes `careCooldownParts` of the phase's
  monster (repaint when readiness flips or the shown minute changes).
- boxView.ts: `MonstersPaint.sheet.careRemainingMs: bigint`; `sheetLayout(canFeed, canEvolve, careRemainingMs === 0n)`;
  Care reason = `tf('box.sheet.careCooldown', careCooldownParts(..))` (SHEET_REASONS grows a sheet-aware shape).
- i18n: `box.sheet.careCooldown` en `Ready in ${p.hours}h ${p.minutes}m`, fr `Prêt dans ${p.hours} h ${p.minutes} min`;
  MessageParams `{hours: number; minutes: number}`; catalog.test.ts EXPECTED_KEYS 370→371 + two DIFFERING SAMPLE_PARAMS
  + EXPECTED_PARAM_OUTPUTS; boxView.test.ts key roster (M24S4_BX_PLAIN_KEYS / param keys).
- Fixtures: index.test.ts:2326 `lastCareAtMs: 0n`, :2379 `wallNowMs: () => 0`; mainBootHarness.ts rosters
  `care_remaining_ms: () => 0n` (or per-file spread overrides in the 5 in-touches main tests if the helper stays out).
- Tester brief #2 (carry-forward): monstersModel (sheetLayout over all 8 triples; careCooldownParts table; missing key ⇒
  0n); monstersScreen (map built from `wallNowMs` through the REAL export — the test imports the real pkg; A on a
  disabled Care ⇒ 'consumed' and NO command; ready ⇒ {kind:'care'}; `wallNowMs` on ctxOf; observe answers a new state
  when readiness flips, the same object for an unrelated batch); boxView (Care row aria-disabled + .is-disabled +
  `Care Ready in 5h 59m` bytes, fr bytes, enabled ⇒ no reason span); catalog.test (roster + samples). Tags `QF3-3-` /
  `QF3-4-` as TRAILING tokens of the test titles (the ledger CHECKs select on them, qf-2 shape).
- Clock-skew note for the PR: readiness = client wall clock vs server anchor; behind ⇒ disabled a little longer; ahead
  ⇒ enabled early and the server's rejection line (qf-2) speaks. The server stays the authority.

## Plan-review register (reviewer + red-team, 2026-10-25) — APPLIED to increment #1
- wasm export semantics TIGHTENED: `let elapsed = now.saturating_sub(last); if is_cooldown_ready(last, now, CD) { 0 } else
  { CD.saturating_sub(elapsed).clamp(1, CD) }` — ready ⟺ 0 is STRUCTURAL (the clamp floor), output bounded to [0, CD]
  (a skewed clock shows "6h 0m", never "55 000 years"; i64::MAX can never reach a formatter). rules.rs:86-88's "saturates
  to 0" prose is wrong (negative elapsed is not clamped) — out of touches, do NOT copy it into comments/tests.
- Tests added to the brief: wasm full grid {MIN, MIN+1, −CD, −1, 0, 1, CD, 1.75e12, MAX−1, MAX}² with per-cell
  `(r==0)==is_cooldown_ready`, `0<=r<=CD`, `r == oracle_i128` (oracle = 0 if ready else clamp(CD−(now−last), 1, CD) in
  i128); skews below AND above CD; `(0, 1.75e12) → 0` (never-cared + realistic now = ready). NEGATIVE anchor in the m22s4
  monster_pub fixture (kills `as u64` rendering). marshal copy test sets the sibling i64 columns
  (`last_essence_train_at_ms`, `quality_time_window_start_ms`) to DISTINCT nonzero values (kills a sibling-column copy).
  `nh_train…` also asserts the MONSTER row's anchor unchanged. Privacy view test compares against the seeded Monster
  literals' anchors (not against pub_from_monster output). rowConvert: −9n, i64::MIN, i64::MAX cases + a type-level
  assignability check generated `MonsterPub` → `SdkMonsterPubRow`. store.test: a view reconcile whose rows differ ONLY in
  `lastCareAtMs` dirties the batch. A BUILT-pkg TS test (tradeProposeModel EARS-3a `loadWasmPkg` precedent) in
  monstersModel.test.ts proving `care_remaining_ms` is exported as bigint→bigint with no TS literal of the constant
  (`r0 = f(0n,0n) > 0n`, `f(0n, r0) === 0n`, `f(5n, 5n + r0 - 1n) === 1n`, `f(0n, 1_750_000_000_000n) === 0n`).
- Orchestrator verification added: a measured OLD→NEW publish rehearsal with the 2.8.1 CLI on a throwaway local server
  (base-sha worktree `publish --delete-data`, then the NEW module WITHOUT --delete-data, `spacetime sql` shows the
  appended column = 0 on pre-existing rows, then delete) — the only check of the `0i64` encoding (the snapshot eval
  records default NAMES only; CI publishes fresh). A source scan for the suffix was proposed and REJECTED (forbidden shape).
- Named residual (cannot be fixed in touches, note in PR + spec): pre-qf-3 live `monster_pub` rows read anchor 0 until
  their next rewrite (care/train/evolve/tier crossing or the next CONTENT_VERSION resync — qf-15 bumps it); a monster
  cared shortly before the deploy shows Care READY until then; the press is rejected by the server (fail-open). The schema
  comment must say "0 = never cared, or not yet rewritten since qf-3".
- Out-of-touches doc staleness to hand to the supervisor/doc-keeper: `.claude/skills/wasm-boundary/SKILL.md` export roster,
  ARCHITECTURE.md (if it lists exports), `evals/client-surface-privacy.eval.mjs` HIDDEN_FIELDS has no structural row for
  `last_care_at_ms` (allowedIn my_monster_pub) — LOW. `reset_trainer_bond` extension hazard (a later reset of the anchor
  would reset the cooldown through a trade ping-pong) — LOW, named.
- Increment #2 hazards: fixtures must use EPOCH-REALISTIC `wallNowMs` (a `() => 0` clock with 0n anchors makes every Care
  disabled and "disabled" assertions vacuous); the wasm call site must be total (an `undefined` anchor throws).

## Implementation-lens register (reviewer · red-team · reducer-security-auditor · desync-guard, 2026-10-26) — increment #1 CLOSED
- APPLIED: `nh_quality_time_tier_crossing_preserves_the_care_anchor` (kills the surviving `new_pub.last_care_at_ms = 0`
  mutant in `accrue_quality_time`, raising.rs:563 — watched failing at raising_tests.rs:3244, mutant reverted); the
  inverted "Care disabled" clause in `nh_care_stamps…`'s doc; red-phase prose in rowConvert.test.ts; lib.rs doc now says the
  EARLY RETURN makes ready ⟺ 0 (the clamp floor is defensive, the ceiling absorbs skew). QF3.4's CHECK reordered: the
  server leg first, the client `-t "QF3-4-"` leg DECIDES (a `-t` with no match exits 0 — it must never flip the box).
- MEASURED (live rehearsal, 2.8.1 server, throwaway db `qf3-rehearsal` on :3010): base bcda1612 published `--delete-data`,
  `join_game` + `care` stamped the private anchor 1792988872715; the NEW module published WITHOUT `--delete-data`
  ("Updated database", exit 0 ⇒ the `0i64` default decodes); the pre-existing `monster_pub` row reads `last_care_at_ms = 0`
  while `monster` keeps the stamp (the documented legacy-row gap); a second early `care` was rejected (HTTP 530 = reducer Err).
- NOT FIXABLE IN TOUCHES, hand to the supervisor / doc-keeper: stale export rosters `docs/DECISIONS.md:14-17`,
  `ARCHITECTURE.md:116-120` (+ `:250-254` says monster_pub carries only derived fields — now one raw timestamp),
  `.claude/skills/wasm-boundary/SKILL.md:27-33`; `docs/DECISIONS.md` "Trading resets the bond, not the monster"
  (:269-271) should list the two cooldown anchors as transfer-unchanged (security-auditor LOW: the receiver now sees the
  previous owner's last-care instant); `evals/client-surface-privacy.eval.mjs` HIDDEN_FIELDS has no structural row for
  `last_care_at_ms` (LOW). Surviving mutant OUT of touches: a post-constructor `pub_row.last_care_at_ms = 0` at the content
  resync site (content.rs:288) is CI-clean because no content fixture seeds a nonzero anchor — a content-test candidate
  (content tests are not in touches); the same class is now covered at the care, train and accrual sites.
- Increment #2 (client) carry-forwards from desync-guard: PIN THE CLOCK SOURCE in a test — the screen must pass
  `BigInt(Math.trunc(ctx.wallNowMs()))` with `wallNowMs = () => Date.now()`; a `performance.now()` clock reads every cared
  monster as a full cooldown forever (hard lockout). A client clock BEHIND the server keeps Care disabled for the skew
  (bounded, self-clearing) — the spec mandates the disabled row (the Feed pattern), so this is accepted and named in the
  spec build note; fixtures must use EPOCH-REALISTIC `wallNowMs` values.

## Increment #2 — resume #3 (2026-10-26): the sheet half, design ADOPTED from the reviewed register above + measured refinements
Touches now include index.test.ts, mainBootHarness.ts, content_tests.rs (spec 9c0c2ec). No planner/plan-review re-run: the
design was reviewed twice (reviewer + red-team, resumes #1/#2); this section records only what today's reads changed.

### Measured facts (worktree 2c013074 = master bcda1612 + increment #1)
- `ScreenHost` rebuilds `viewModel(ctx)` on every button AND every observe (screens/index.ts:150/254/275), so a per-vm care
  map is recomputed per batch with the live wall clock; no timer exists (the Feed pattern has none) ⇒ the hint and the
  enabled flip land on the NEXT batch or button, never mid-idle. Named as a risk, not fixed.
- `NavItem.reason` exists in the nav kit but NOTHING renders or announces it (navRender.ts:110-111 only toggles
  `.is-disabled`/`aria-disabled`; no `disabled` outcome consumer in main.ts/screens). CTL4.3 on the sheet = the Feed pattern:
  the row carries aria-disabled + a reason span after its label (boxView fill), A is consumed (nothing sent). The live-region
  gap is already R-qf-2-SHEETLINEPARITY (LOW).
- Only TWO tests drive `monstersScreen.viewModel`: monstersScreen.test.ts (ctxOf cast, :276) and index.test.ts
  (monstersFlowCtx cast, :2326/:2379). The main.*.test.ts boot suites use main.ts's REAL screenCtx + the harness wasm
  mocks (`vi.mock('../../client-wasm/pkg/client_wasm.js', () => wasmPkgWalkingMock(...))`): main.controls.test.ts (qf-2)
  opens the Monsters sheet with monsters, so the three `mainBootHarness.ts` rosters MUST gain `care_remaining_ms` (else
  `undefined is not a function` at viewModel). Inline rosters OUTSIDE touches (frameErrorWiring, bagScreen/battleScreen/
  journalScreen/profileScreen .boot) never reference boxView/KeyB/ownMonsters ⇒ no hidden dependency (measured by grep;
  the full client run is the proof).
- `sheetLayout` has exactly two production callers (monstersScreen.ts:346, boxView.ts:465) + one test caller
  (monstersModel.test.ts:349). The third parameter is REQUIRED (no default): a missed caller fails `tsc`.
- `MonstersPaint['sheet']` literal constructors: monstersScreen.ts `sheetOf`, boxView.test.ts `c8bSheet` (30 call sites,
  ONE helper), monstersScreen.test.ts 4 exact `toEqual` sheet paints (:1142, :1348, :1697 + one more) — tester edits.
- content_tests.rs HAS a native-host `mod nh_sync` (:1798) whose `world()` registers `monster` (writable+scannable+unique)
  and `monster_pub` (writable+unique) and whose `sync()` runs the REAL `sync_content_inner`; registration is idempotent
  (native_host_tests.rs:181-184), so a new test re-registers handles to seed rows. sync upserts species from RON before
  the re-derive pass (content.rs:145-150) ⇒ no species seeding needed. This drives the actual re-derive site
  (content.rs:288-290) and kills the surviving post-constructor mutant for real — closing R-qf-3-QF3.2-resync honestly.
- CAT-01 pins the roster at 370 (`toHaveLength(370)`, :1527) + the roster comment (:1343) + two test titles (:1432, :1521)
  + the "(a)" comment; SAMPLE_PARAMS/EXPECTED_PARAM_OUTPUTS are bijective with function-valued keys; boxView.test.ts
  `M24S4_BX_PARAM_KEYS` (:1436) is the sentinel roster the view's `tf(` keys must join.

### Shapes (final)
- types.ts `ScreenContext.wallNowMs: () => number` (doc: `Date.now()`; `now` stays the monotonic frame clock; for comparisons
  with server-epoch columns only). main.ts: `wallNowMs: () => Date.now(),` beside `now` (:1531).
- monstersModel.ts: `MonstersVm.careRemainingMs: ReadonlyMap<string, bigint>` (key `monsterKey`, 0n = ready);
  `buildMonstersVm(..., items = [], careRemainingMs: ReadonlyMap<string, bigint> = new Map())`;
  `careRemaining(vm, monsterId): bigint` = `get ?? 0n` (missing ⇒ READY: fails open to the server's own check);
  `sheetLayout(canFeed, canEvolve, canCare)` (3 required); `careCooldownParts(remainingMs: bigint): {hours, minutes}` =
  ceil to the minute in bigint (`(ms + 59_999n) / 60_000n`), ≤0n ⇒ {0,0}; 1n⇒0h1m, 60_000n⇒0h1m, 60_001n⇒0h2m,
  21_600_000n⇒6h0m, 21_540_001n⇒6h0m, 21_540_000n⇒5h59m. Pure, no wasm import (the model stays clock-free).
- monstersScreen.ts: imports `care_remaining_ms`; viewModel: `const wallNow = BigInt(Math.trunc(ctx.wallNowMs()))`, map
  over own monsters `monsterKey → care_remaining_ms(m.lastCareAtMs, wallNow)`; `act('care')`: `careRemaining !== 0n ⇒
  [state, 'consumed']` else the command; Up/Down `sheetLayout(.., careRemaining(vm, id) === 0n)`; `sheetOf` carries
  `careRemainingMs`; `shownOf` appends `careCooldownParts(careRemaining(vm, phase.monsterId))` (0n ⇔ {0,0}: readiness and
  the shown minute both repaint; an unrelated batch in the same minute keeps the SAME state).
- boxView.ts: `sheetLayout(sheet.canFeed, sheet.canEvolve, sheet.careRemainingMs === 0n)`; the fill's reason for `care` is
  `tf('box.sheet.careCooldown', careCooldownParts(sheet.careRemainingMs))`; SHEET_REASONS keeps feed/evolve.
- i18n: `box.sheet.careCooldown` en `Ready in ${p.hours}h ${p.minutes}m`, fr `Prêt dans ${p.hours} h ${p.minutes} min`
  (+ @desc lines in both catalogs, `boxView.ts (the Monsters frame)` source line); MessageParams
  `{ readonly hours: number; readonly minutes: number }`; messageIds union entry after `box.feedback.fed`.
- Fixtures: index.test.ts `row()` + `lastCareAtMs: 0n`, ctx + `wallNowMs: () => 1_750_000_000_000` (epoch-realistic);
  mainBootHarness.ts three rosters `care_remaining_ms: () => 0n` with an `(opts.careRemaining ?? ...)` hook on the
  walking mock so a boot test can observe the arguments (the clock-source pin).
- content_tests.rs `mod nh_sync`: `nh_sync_content_rederive_preserves_the_care_anchor_on_monster_pub` — see the brief.

### Tester brief #2 (opus) — names are load-bearing; tags are TRAILING tokens `[QF3-3-…]` / `[QF3-4-…]`
Client (vitest, node env; the REAL built pkg for the screen tests — monstersScreen.test.ts already imports it):
- monstersModel.test.ts: `careCooldownParts` table (above, + 59_999n⇒0h1m, 3_600_000n⇒1h0m, 3_600_001n⇒1h1m, 0n/−1n⇒0h0m);
  `sheetLayout` over all 8 (canFeed, canEvolve, canCare) triples: Care disabled exactly when canCare false, the other rows
  as before, order unchanged (update CTL8C-1-SHEET-ORDER as a named intentional change); `careRemaining`: present key ⇒ the
  value, missing key ⇒ 0n, a key of ANOTHER monster never leaks; `buildMonstersVm` default map is empty.  [QF3-3-]/[QF3-4-]
- monstersScreen.test.ts: `ctxOf` gains `wallNowMs` (default epoch-realistic `1_750_000_000_000`); `mon()` keeps
  `lastCareAtMs: 0n`, a `caredAt(w, id, anchor)` world helper. Through the REAL export: (a) anchor = wallNow − full + 1
  (1 ms short; derive `full` from `care_remaining_ms(0n, 0n)`): A on Care ⇒ 'consumed', NO command, phase stays on Care,
  paint `sheet.careRemainingMs === 1n`; (b) anchor = wallNow − full: A ⇒ `{kind:'care'}`, `careRemainingMs === 0n`; (c) a
  never-cared monster (0n) under the realistic clock ⇒ 'care' sent; (d) a monster NOT in the map (another id's anchor)
  stays ready; (e) the screen passes `BigInt(Math.trunc(ctx.wallNowMs()))`: a fractional `wallNowMs` (…000.75) does not
  throw and reads as the truncated instant (exactly-at-cooldown stays ready); (f) `observe`: the same world under a clock
  one minute later ⇒ a NEW state (the hint changed), the same world in the same minute ⇒ the SAME object, and a clock that
  crosses the boundary flips `careRemainingMs` to 0n in the next paint; (g) Up/Down still land on a disabled Care (reachable).
  Update the 4 exact sheet `toEqual` paints with `careRemainingMs: 0n` (named intentional change).  [QF3-3-]/[QF3-4-]
- boxView.test.ts: `c8bSheet(card, action, canFeed = true, canEvolve = true, careRemainingMs = 0n)`; a sheet paint with
  `careRemainingMs = 21_540_001n` renders the Care row `aria-disabled="true"` + `.is-disabled` + textContent
  `Care Ready in 6h 0m` (en) and, under `fr`, `Choyer Prêt dans 6 h 0 min` (use the existing locale switch helper the
  m24s4 cases use); `careRemainingMs = 60_000n` ⇒ `Ready in 0h 1m`; `0n` ⇒ no reason span, no aria-disabled; a repaint
  from disabled to enabled clears both; the disabled Care row can be the active row. `M24S4_BX_PARAM_KEYS` gains
  `box.sheet.careCooldown`.  [QF3-3-]/[QF3-4-]
- catalog.test.ts: roster 370→371 everywhere it is spelled (comment :1343, titles :1432/:1521, comment "(a)", the
  `toHaveLength`), SAMPLE_PARAMS `'box.sheet.careCooldown': [{hours: 5, minutes: 59}, {hours: 0, minutes: 1}]`,
  EXPECTED_PARAM_OUTPUTS `Ready in 5h 59m` / `Ready in 0h 1m`.  [QF3-3-] on the CAT-01 title's trailing token is NOT
  wanted (it is a roster test); instead ADD one small test `the care cooldown hint is catalogued in en and fr with the
  hours/minutes params [QF3-3-CATALOG]` that resolves both catalogs' `box.sheet.careCooldown` with the two samples and pins
  the fr bytes `Prêt dans 5 h 59 min`.
- main.controls.test.ts (clock-source pin, in touches): the harness walking mock built with a recording
  `careRemaining: (last, now) => { seen.push([last, now]); return 0n; }`; `vi.spyOn(Date, 'now').mockReturnValue(T)` with
  epoch `T`, `performance.now` left real; open the Monsters sheet (the qf-2 flow) and assert every recorded `now` ===
  `BigInt(T)` and NEVER a small performance-clock figure. Title trailing `[QF3-3-CLOCK-SOURCE]`.
- index.test.ts :2326 `lastCareAtMs: 0n`, :2379 `wallNowMs: () => 1_750_000_000_000` — fixture field-adds only.
Rust (`cargo nextest run -p monster-realm-module -E 'test(=content::content_tests::nh_sync::…)'`):
- `nh_sync_content_rederive_preserves_the_care_anchor_on_monster_pub`: `fixture()`, `world(&fx)`, `seed_config(&w, 0)`;
  re-register `monster`/`monster_pub` keyed handles (idempotent); two stale monsters via `super::make_stale_monster(11|12,
  owner(), 1)` with DISTINCT nonzero anchors (1_750_000_000_123 and −42), seeded pubs via `pub_from_monster(&m, 0)` but with
  `stat_hp` overwritten to 1 (a deliberately wrong derived field: proves the pass REWROTE the row without depending on
  RON values); `sync(&fx)`; each pub's `last_care_at_ms` == its monster's anchor (not swapped, not 0, not the other), each
  pub's `stat_hp` != 1 and == its monster row's recomputed `stat_hp`, both monster rows keep their anchors,
  `version(&w) == CONTENT_VERSION`. Red proof: the orchestrator plants `pub_row.last_care_at_ms = 0;` after content.rs:288
  and watches it fail, then reverts.
RED proof (orchestrator): every client test red for its own reason (missing `wallNowMs`/`careRemainingMs`/key ⇒ TS or
runtime), the Rust test green on the current tree (it pins preservation by construction) ⇒ its teeth are the planted
mutant above. QF3.3/QF3.4 EXPECTs get the exact `Tests N passed | M skipped (T)` after green.

### Lens plan (distinct defect classes, budget-bounded)
reviewer + red-team (code) · /simplify · desync-guard (the clock/SSOT lens: wall clock vs anchor, no TS copy of the
constant) · verifier. reducer-security-auditor is SKIPPED with reason: increment #2 changes no reducer, table, view or
export; the only server-side edit is a test; increment #1's audit stands. `mr-gates check`, one full `just ci` (2.8.1 shim +
isolated XDG_DATA_HOME), close PR #596 unmerged, open the real PR.
