# 17r-b build plan — hydration-gated reseed latch + identity refresh on reconnect

Slice: `17r-b` (M-postgate-seventeenth-review-residuals.spec.md#17r-b). Branch
`feat/17r-b-reconnect-hydration-latch`, worktree `.claude/worktrees/17r-b`, fork `origin/master@c54ffc9`.
Touches: `client/src/net/connection.ts`, `client/src/main.ts`, `client/src/main.battle-reseed.test.ts`
(+ companions: `client/src/net/connection.test.ts`, `client/src/main.*.test.ts`, `docs/adr/0130-*.md`
amendment in place — NO new ADR number reserved, ARCHITECTURE.md minimal add). `docs/knowledge/**` has zero
references to connection.ts/onReconnect → no knowledge edit (say so in the PR body).

## 0. Verified facts (orchestrator + planner; do not re-derive)

- **SDK ordering (spacetimedb npm 2.6.0, `client/node_modules/spacetimedb/src/sdk/db_connection_impl.ts:861-884`):**
  `SubscribeApplied` → `#applyTableUpdates` (cache populated, callbacks collected) → `emit('applied')` →
  `#dispatchPendingCallbacks` (row onInsert), ALL synchronous; `#handleOnMessage` drains the inbound queue
  synchronously. So `onApplied` (where connection.ts:698-700 calls `opts.onReconnect()` / `opts.onReady(identity)`)
  fires BEFORE the row callbacks, and the `MicrotaskBatcher` flush (batch.ts, queueMicrotask) fires after all of
  them; its closure (connection.ts:141-176) reconciles `my_battle` from the COMPLETE cache then `store.flushBatch()`.
  ⇒ residual (d) is NOT reachable on 2.6.0. The slice ships the explicit signal anyway (spec + ADR-0130's own
  proposal; the pending npm bump to 2.7.1+/2.8.1 with SDK auto-reconnect is the change that could alter delivery).
  The ADR amendment MUST record this honestly.
- **Identity rotation (e) IS reachable:** `continueAnonymously()` after a session-expired terminal, or the nh4
  token-rejection suppression path, builds with a fresh anon identity while `hadSession` is already true, so
  connection.ts:699 calls `opts.onReconnect()` with no identity and main.ts keeps the stale one.
- **Blast radius (cbm ∪ CodeGraph ∪ grep):** `opts.onReconnect()` has exactly ONE call site (connection.ts:699);
  production consumer of `ConnectionOptions` = `main.ts` only; test consumers capture `opts` (never construct a
  literal): `main.battle-reseed.test.ts`, `main.a11yFocus.test.ts`, `main.reducedMotionWiring.test.ts`.
  `client/tsconfig.json` excludes `**/*.test.ts`. Making a field REQUIRED breaks nothing.
- **Store facts:** `latestPlayerBattle(identity)` (store.ts:928) returns the HIGHEST battleId among rows where
  identity is a participant in either role; `upsertBattle` adds/replaces one row (never removes others);
  `flushBatch()` no-ops when not dirty; `reset()` clears all + `#dirty=false`. store.ts is OUT of touches.

## 1. Contracts

### 1a. `client/src/net/connection.ts`
1. `ConnectionOptions` (:81-82): `readonly onReconnect: (identity: string) => void;` with doc: receives THIS
   connection's identity — a reconnect can mint a NEW anon identity (continueAnonymously / nh4 rejection path);
   a caller keeping the old one deafens every identity-gated listener (ADR-0130 residual e).
2. New REQUIRED field directly below: `readonly onHydrated: () => void;` — hydration-complete edge. Fired from the
   batcher flush closure on the FIRST flush after each applied snapshot, AFTER the view reconciles and BEFORE
   `store.flushBatch()`, so every listener that flush notifies observes the signal as already delivered. Exactly
   once per applied snapshot. Required (not `?:`): an unwired embedder must fail at compile time, not ship a
   permanently-armed latch.
3. Flag: `let snapshotApplied = false;` one line after `const { store, name } = opts;` (:134), above the batcher.
4. Arm site — inside `.onApplied`, AFTER `if (stale()) return;` (so a superseded build never arms), immediately
   before the notify tail (:698): `snapshotApplied = true;` then `hadSession = true; if (reconnecting)
   opts.onReconnect(identity); else opts.onReady(identity);` (module-local `identity`, assigned at :659).
5. Consume site — flush closure tail, between the `}` closing `if (live !== undefined)` (:174) and
   `store.flushBatch();` (:175): `if (snapshotApplied) { snapshotApplied = false; opts.onHydrated(); }` — OUTSIDE
   the live-guard (a parked build with `current = undefined` must not leave the flag armed for a later bogus
   "hydrated"), BEFORE `flushBatch`. Keep the three statements contiguous (biome reflow is harmless; pins squash).
6. NOT done: no `batcher.schedule()` added to `.onApplied` (YAGNI: with no flush no listener runs either; the
   first flush that does occur carries the signal; adding a statement to the most-pinned region buys nothing).
7. Pin-safety (verified against connection.test.ts): flush-closure pins (:4117-4246, :3765-3785) constrain only
   the guard body, reconcile-before-flush order, `flushBatch` at the tail — unaffected. `onAppliedRegion()`
   (:2307) membership pins (:2992-3005, :3046-3069) unaffected. `current` 3-assignment pin unaffected. No eval
   scans these shapes (`client-no-pii-logs` counts console sinks: add none).

### 1b. `client/src/main.ts`
| Site | Edit |
|---|---|
| :272 (after `reseedPrevBattleId`) | `let hydrationGen = 0;` + `let reseedArmedGen = -1;` (+ 3-line comment; `-1` = never armed; `battleReseedPending` gates the read anyway). |
| :268-271 | Rewrite the "STICKY until a flush observes definite battle state" comment — contract replaced. |
| :1799 | UNCHANGED and load-bearing: `const latest = store.latestPlayerBattle(identity);` stays the FIRST statement in the `try` (`flushWithNoBattleRows()` asserts the spy was called — anti-vacuity). |
| :1800-1804 | Replace `if (latest === undefined) return;` with `if (hydrationGen === reseedArmedGen) return;` + rewrite comment. From `battleReseedPending = false;` (:1805) down: unchanged. Post-hydration an `undefined` read legitimately resolves the latch (no battle rows). |
| :2675 | `onReconnect: (id) => {` with `identity = id;` as the FIRST statement (nothing before it depends on the old value; the invariant "main.ts identity == live connection identity" is auditable only if unconditional and first; the `makeConnect(identity)` tail at :2719 then records the NEW identity). |
| :2695-2696 | Immediately after `battleReseedPending = true;` add `reseedArmedGen = hydrationGen;` — UNCONDITIONAL (outside the `if (!battleReseedPending)` guard at :2678, which keeps protecting only the `reseedPrevBattleId` capture per 16r-f/T9). |
| :2718 | Comment "retained module identity" → "the refreshed identity (17r-b)". |
| connect options | Insert `onHydrated: () => { hydrationGen += 1; },` BETWEEN the `onReady: {…},` block and `onReconnect:`. NEVER between `onReconnect` and `onOwnWarp` (main.wiring.test.ts:887-892 / 1120-1126 / 1330-1336 slice that region). |

Nothing else in main.ts caches identity-derived state across a rotation (every other read is a fresh
`store.x(identity)` per batch; identity-derived latches are nulled by `resetPredictionState()` :766-792 or the
onReconnect body :2706-2708; `lastSentSeq` is a per-socket floor, not identity-scoped).

**Boy-scout (1 hunk, ~2 lines):** main.ts:600-602 comment "onReconnect can clear identity meanwhile" is false today
and inverted after this slice → state the real contract (identity is `''` until first onReady and is REASSIGNED,
never cleared, on reconnect). Other comment rewrites above describe code this slice changes (not boy-scout).

### 1c. Alternatives rejected (one line each)
- pull-based `Connection.hydrationGen()`: forces stub edits in 3 specs; a pull can't distinguish flush-before-reconcile from after.
- fire from `onApplied` itself: signals "cache complete", not "store reconciled".
- resolve the reseed inside the `onHydrated` handler: duplicates the emit decision outside the single owning listener (SSOT).
- boolean `reseedHydrated` cleared unconditionally in onReconnect: behaviourally equivalent; counter chosen because "armed at G, resolve once G advances" gives the REARM bite-proof a precise target.

## 2. Test plan (TESTER — main.battle-reseed.test.ts + connection.test.ts)

Harness: `simulateReconnect(id = H.identity)` → `store.reset(); opts.onReconnect(id);`; new `signalHydrated()` →
`opts.onHydrated();`. Add `IDENTITY_2 = 'cd'.repeat(32)` and `makeBattleFor(identity, battleId, outcome, turn?)`
(sets `playerIdentity`; keep `opponentMonsterIds: []` so `isPvpBattle` stays false).

**Existing T1..T10 — insert `signalHydrated()` exactly here; every expected list stays byte-identical:**
T1: reconnect → `flushWithNoBattleRows()` → hydrated → B1. T2: reconnect → hydrated → B1. T3: reconnect →
hydrated → B1 Ongoing → B1 SideAWins,7. T4/T5 unchanged. T6: reconnect → empty → hydrated → B2. T7: reconnect →
hydrated → B1 terminal → B2. T7b: reconnect → empty → hydrated → B1 terminal → B2. T8: reconnect → hydrated → B2.
T9: reconnect → reconnect → hydrated → B1 (NO signal between the two reconnects). T10: … reconnect → hydrated →
B1 Ongoing → B1 end → B2 start → reconnect → hydrated → B2 Ongoing. Keeping the empty flush BEFORE the signal in
T1/T6/T7b preserves their teeth.

**⚠ FIXTURE TRAP (orchestrator trace): `latestPlayerBattle` returns the HIGHEST id and `upsertBattle` never removes
other rows.** A sequence whose pre-drop survivor has the LOWER id and whose pre-hydration row has the HIGHER id is
non-discriminating or fails under the correct impl. The survivor must be the HIGHER id (B2=202n); the stale/
pre-hydration row the LOWER (B1=101n). Trace every new tooth against the correct impl AND each named mutant and
record both expected lists in the test's comment — `expect(...).toEqual` stops at the first failure.

**New teeth (prefix-free ids; title embeds the id):**
- `RSD17B-STALEROW` [B1 (d)] "stale terminal row hydrates before the survivor": flush B2 Ongoing (start B2) →
  reconnect → flush B1 SideAWins,4 ONLY (pre-hydration; anti-vacuity: spy called, returned a DEFINED battle with
  id B1) → hydrated → flush(B1 terminal, B2 Ongoing) → flush B2 SideBWins,6. Expect `[startOf(B2), endOf(B2,'SideBWins',6)]`.
  Correct: pre-hyd flush returns (armed); hydrated flush latest=B2==survivor → silent; end emitted. 16r-f mutant:
  `[start B2, start B2, end B2]`. Never-resolve / ignore-signal: `[start B2]` (trailing end proves the resolving half).
- `RSD17B-ONGOINGROW` (was PREHYD; redesigned) "an Ongoing NON-survivor row observed pre-hydration keeps the latch":
  flush B2 Ongoing → reconnect → flush B1 Ongoing ONLY (lower id, legal per store.ts:906 either-role comment;
  anti-vacuity spy defined B1) → hydrated → flush(B1 Ongoing, B2 Ongoing) → flush B2 SideAWins,3. Expect
  `[startOf(B2), endOf(B2,'SideAWins',3)]`. 16r-f mutant: `[start B2, start B1, start B2, end B2]`.
  (The originally proposed "survivor itself observed pre-hydration" shape is NON-discriminating: silent re-baseline
  either way — do not use it.)
- `RSD17B-REARM` "a second reconnect re-arms against the CURRENT generation": flush B2 Ongoing → reconnect#1 →
  hydrated (gen 1, no flush) → reconnect#2 (pending still true: capture stays B2; armedGen must become 1) →
  flush B1 SideAWins,4 ONLY (pre-hydration for episode 2) → hydrated → flush(B1 terminal, B2 Ongoing). Expect
  `[startOf(B2)]`. Mutant (armedGen assignment inside the `if (!battleReseedPending)` guard → stays 0): the
  pre-hydration flush resolves (gen 1 > 0) on B1 terminal, latch burned; hydrated flush then emits a second
  `startOf(B2)` → `[start B2, start B2]`. T9 cannot see this (no hydration between its reconnects).
- `RSD17B-IDROT` [B1 (e)]: beforeEach `onReady(id1)` → `simulateReconnect(IDENTITY_2)` → hydrated →
  flush `makeBattleFor(IDENTITY_2, B2, 'Ongoing')`. Expect `battleEvents === [startOf(B2)]` AND
  `events.filter(kind==='connect').map(identity) === [H.identity, IDENTITY_2]` (eventRing.ts:19,53). Kills
  identity-not-reassigned (no start at all) and connect-event-uses-stale-identity (second connect = id1).
- `RSD17B-ORPHAN` [B1 (e)]: flush B1 Ongoing for id1 (start B1) → `simulateReconnect(IDENTITY_2)` → hydrated →
  flush B1 Ongoing (id1's orphan) → flush `makeBattleFor(IDENTITY_2, B2, 'Ongoing')`. Expect `[startOf(B1), startOf(B2)]`.
  Not-reassigned mutant: old identity still matches B1 → silent re-baseline → B2 never starts → `[start B1]`.
- connection.ts side (source-scan, connection.test.ts idiom; helpers `squashedStrippedConnectionTs`,
  `parenArgsAt(squashed,'new MicrotaskBatcher(')`, `codeOccurrences`, `countCodeOccurrences`, `includesAsCode`,
  `onAppliedRegion`, `braceBodyAt` all exist):
  - `RSD17B-SIGNAL`: (1) anti-vacuity `includesAsCode(flushClosure,'store.flushBatch()')`; (2) contiguous squashed
    `if (snapshotApplied) { snapshotApplied = false; opts.onHydrated(); }` ×1 in the closure; (3) `opts.onHydrated()`
    index < `store.flushBatch()` index; (4) `opts.onHydrated()` ×0 inside the `if (live !== undefined)` guard body;
    (5) whole-file `opts.onHydrated()` ×1, `snapshotApplied = true;` ×1, `snapshotApplied = false;` ×1;
    (6) `snapshotApplied = true;` inside `onAppliedRegion` AFTER that region's `if (stale()) return;`.
  - `RSD17B-CARRIES`: `if (reconnecting) opts.onReconnect(identity);` ×1 file-wide and inside `onAppliedRegion`;
    interface pins `readonly onReconnect: (identity: string) => void;` ×1 and `readonly onHydrated: () => void;` ×1.
  - Reviewer must verify BY READING (needles prove presence, not reachability): no `return` introduced in the
    flush closure between reconcile block and signal; no third `snapshotApplied` write in another spelling; arm is
    after `if (stale()) return;`; the closure is still reached.
- Runtime harness for connection.ts: NO (env: connection.test.ts is a node-env 4.3k-line source-scan suite whose
  docblock states connection.ts is never imported; an 18-table fake DbConnection reds on every table addition).
  Declare residual (f) in the ADR: production firing of `onHydrated` proven by source-scan only; the
  "fires every flush instead of once per applied" mutant is text-caught, not behaviour-caught.

## 3. Acceptance ledger (gate B1)
`CHECK: PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH node /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/17r-b.gates.mjs <abs-worktree> b1`
— a copy of `17r-a.gates.mjs` minus the purity arm (ADR-0224: no eval), keeping the vitest-binary check, node-24
PATH, `--reporter=json --outputFile`, the five hard asserts (exit 0, `report.success`, `numFailedTestSuites===0`,
failed/pending/todo 0, `testResults.length === SPECS.length`), and the runtime prefix-free re-derivation.
SPECS: `src/main.battle-reseed.test.ts`, `src/net/connection.test.ts`, `src/main.wiring.test.ts`,
`src/main.a11yFocus.test.ts`, `src/main.reducedMotionWiring.test.ts` (the last two = the other runtime importers
of `./main`). TEETH: `RSD17B-STALEROW`, `RSD17B-ONGOINGROW`, `RSD17B-REARM`, `RSD17B-IDROT`, `RSD17B-ORPHAN`,
`RSD17B-SIGNAL`, `RSD17B-CARRIES`. EXPECT: `B1 RECONNECT HYDRATION LATCH OK teeth=8/8 files=5 tests=` (8 ids incl. RSD17B-NOBATTLE per §7).
Ledger row keeps `ID:` with a colon and an `EVIDENCE:` placeholder.

## 4. Mutation bite-proofs (hand-written wrong impls after green; pin each by the FAILING TOOTH LABEL)
1. `if (hydrationGen === reseedArmedGen) return;` → `if (latest === undefined) return;` ⇒ STALEROW, ONGOINGROW.
2. Delete the hydration check (resolve on any post-reconnect flush; keep `latest` null-safe) ⇒ STALEROW, T1.
3. `onHydrated: () => {}` (ignore the signal) ⇒ STALEROW trailing end, T3, T6.
4. `reseedArmedGen = hydrationGen;` moved inside the `if (!battleReseedPending)` guard ⇒ REARM only.
5. Delete `identity = id;` in onReconnect ⇒ IDROT, ORPHAN.
6. Move `identity = id;` after `eventRing.push(makeConnect(identity))` ⇒ IDROT ring-identity clause only.
7. connection.ts `opts.onReconnect()` (no arg) ⇒ typecheck + CARRIES.
8. connection.ts drop the `if (snapshotApplied)` gate (fire every flush) ⇒ SIGNAL(2) — text-caught only; record.
9. connection.ts signal block after `store.flushBatch()` ⇒ SIGNAL(3).
10. connection.ts signal block inside `if (live !== undefined)` ⇒ SIGNAL(4).
CONTROL: unmodified tree green.

## 5. Risks / doc outline
- Top risk: a mis-placed `signalHydrated()` makes T1/T6/T7b vacuous (latch never resolves, lists still pass) —
  the §2 table is normative; mutants 2/3 must red at least one of T1/T2/T6.
- Do not hoist the latch check above main.ts:1799. Keep `onReconnect:` before `onOwnWarp`; never loop-ify the body.
- ADR-0130 citations `:273-275`/`:276-278` are load-bearing in the spec: APPEND only; restate the residual list in
  the new section (16r-f precedent at 0130:271).
- ADR-0130 amendment (append): mechanism; reachability note (not reachable on 2.6.0, shipped as a
  delivery-model-independent contract); why `latest === undefined` stickiness was REPLACED; the 7 teeth;
  residuals: (c) unchanged, (d) CLOSED, (e) CLOSED, NEW (f) source-scan-only proof of the connection.ts firing.
- ARCHITECTURE.md:~1246 "Shell (`net/connection.ts`)" bullet: append the `onHydrated` once-per-applied signal
  before `flushBatch` and `onReconnect(identity)`. Slice-log entry per house style. `ADR next-free = 0234` unchanged.
- Commits: (e) identity first, then (d) hydration — one PR.

## 6. Workflow
Solo implementation (orchestrator = specialist; tester = separate opus agent) + reviewer/red-team/simplify on the
plan, tester → RED proof, reviewer+red-team on the TEST ARTIFACT, impl → green, then reviewer+/simplify+red-team+
desync-guard+verifier; reducer-security-auditor N/A (no server/schema change — state so).

## 7. Plan-review amendments (reviewer + red-team + /simplify, 2026-09-03) — NORMATIVE over §1-§4 where they differ

- **/simplify — collapse the two counters to ONE boolean.** Replace `hydrationGen`/`reseedArmedGen`/the `-1`
  sentinel with `let hydratedSinceReconnect = false;` — set `true` by the `onHydrated` handler, set `false`
  UNCONDITIONALLY in `onReconnect` (outside the `if (!battleReseedPending)` capture guard), checked in the listener
  as `if (!hydratedSinceReconnect) return;`. Behaviourally identical to the counter under every interleaving
  (arming and resetting happen at the same instant), one `let` instead of two, no sentinel. The REARM mutant is
  "the reset moved inside the capture guard" — same fixture (§2 RSD17B-REARM) kills it.
- **Reviewer B1 / red-team F1 — MUST-FIX null guard.** After the latch resolves post-hydration, `latest` may be
  `undefined` (a player with no battle rows — the COMMON reconnect). The resolved branch becomes
  `if (latest?.outcome === 'Ongoing' && latest.battleId === survivedId) { activeBattleId = latest.battleId; return; }`
  (then the existing `if (!latest) return;`). New tooth **`RSD17B-NOBATTLE`**: no pre-drop battle → reconnect →
  hydrated → `flushWithNoBattleRows()` → then `flushBattles(B2 Ongoing)`; expect `[startOf(B2)]` AND
  `console.error` NOT called. **Global control:** the suite installs `vi.spyOn(console, 'error')` in `beforeEach`
  and asserts in `afterEach` that it was never called (message = the logged args) — the listener's try/catch
  otherwise swallows a throw behind a coincidentally-correct ring (the ORPHAN fixture exercised exactly this
  under the un-guarded plan). Baseline noise must be measured first (orchestrator does this).
- **Reviewer B2 — companion edit.** `client/src/main.wiring.test.ts:10015` `NH5_RECONNECT_START = 'onReconnect: () => {'`
  (used via `expectUniqueAnchor` at :10199) must become `'onReconnect: (id) => {'` — the TESTER updates it (it is a
  test anchor tracking the signature; list under touches-delta). Verified: the only verbatim occurrence outside
  main.ts/connection.ts.
- **Red-team F2 — gate floor.** The gate script asserts a per-file test-count floor for
  `src/main.battle-reseed.test.ts` (≥ 17 = 11 existing + 6 new) in addition to the exactly-once teeth census, so
  deleting T3/T6 (the only two pre-existing tests that prove the latch RESOLVES under the ignore-signal mutant —
  red-team F3) cannot stay green.
- **Red-team F4 — mutant #1b.** `if (!hydratedSinceReconnect && latest === undefined) return;` (16r-f clause kept as
  an AND operand) degenerates to mutant #1 pre-hydration ⇒ STALEROW, ONGOINGROW. Add to the bite-proof list.
- **Red-team F8 — census discipline.** Exactly ONE `it()` per `RSD17B-*` id (SIGNAL/CARRIES keep their clauses as
  multiple `expect()`s inside one `it()`); no `describe()` title may contain a tooth id.
- **Reviewer m1 — type-carried vs test-carried.** TS parameter bivariance means a reverted `onReconnect: () => {}`
  still typechecks; the (e) fix is guarded by RSD17B-CARRIES/IDROT/ORPHAN, not the compiler. Record in the ADR.
- **Reviewer m3 — wording.** `onHydrated` fires "once, on the first flush following an applied snapshot" (guaranteed
  today by the always-non-empty content-table subscriptions), not an unconditional "exactly once".
- **Red-team F6 — residual (f) text.** Name the current-swap race (a `reconnectNow()`/`continueAnonymously()`
  re-entry between an armed `snapshotApplied` and its consuming flush reconciles against the NEW build's empty cache
  and still fires `onHydrated`) as a pre-existing class the shared batcher already accepts (connection.ts:148, :921).
- **Considered and rejected (record in ADR):** moving `opts.onReady/onReconnect` from `onApplied` into the flush
  closure (which would make `onReconnect` itself the hydration signal and delete the sticky latch entirely). It
  shifts the timing of 20+ onReconnect/onReady consumers by a microtask and makes the spec's EARS scenario
  unrepresentable; the spec pins the signal shape. Rejected for this slice, noted as a future simplification.
- Bite-proof list additions: #1b (above); #11 `hydratedSinceReconnect = false` reset moved inside the capture guard
  (= #4 restated for the boolean) ⇒ REARM only; #12 drop the `latest?.` null guard ⇒ NOBATTLE (console.error control).
