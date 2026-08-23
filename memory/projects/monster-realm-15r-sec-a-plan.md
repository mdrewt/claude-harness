# monster-realm 15r-sec-a — build plan (planner output, 2026-08-16)

> Slice: **15r-sec-a — Participant-scoped `battle` via a two-identity view** (CRITICAL, MED-HEAVY, game-visible).
> Spec: `specs/monster-realm-v2/M-postgate-fifteenth-review-residuals.spec.md:48-87` (+ §6 runner notes).
> Base: master `df83ac8`. Worktree `.claude/worktrees/15r-sec-a`, branch `feat/15r-sec-a-participant-scoped-battle`.
> ADR reserved: **0198**. Q-B4 ANSWERED (accept the refresh). W0-6 ANSWERED (view, not RLS).
> **Slice-head verification (orchestrator, 2026-08-16): view bindings carry NO PK even after the 2.8.1
> regen** (index.ts regenerated at 3c94216; all four view registrations have empty indexes/constraints;
> npm SDK deliberately pinned 2.6.0) → view `onUpdate` never fires → client half is NOT a rename; the
> ADR-0194 D4 reconcile-from-cache countermeasure stays.
> Adjudication amendments (AM1+) appended at the end — they WIN over the body where they conflict.

## Verdict up front

**Ships as ONE mergeable slice** (server flip + view + bindings regen + client ingest reshape + gates + docs). It cannot be cut smaller without shipping either a leak or a broken battle screen. The two failure modes here are *CI-green leak* and *CI-green broken battle rendering* — the red-team pass over the two new gate families (the `my_battle` exact-body pin; the ingest/reconcile teeth) is the control.

---

# A. Blast radius (graph-first union + grep)

**Method note (honest union):** cbm's `CALLS` edges are **empty** for these TS methods (`trace_path upsertBattle` → `{"callers":[]}`; Cypher `CALLS` query returned 0 rows), so cbm contributed only the symbol inventory. CodeGraph supplied the caller edges; Grep supplied the string/SQL/eval surface. Dynamic-dispatch grep (`db[`, `tables[`, backtick/`+`-built SQL) over `client/src`: **no dynamic table access in hand-written code** — only the generated deprecated-alias map in `client/src/module_bindings/index.ts:441-471`. No hidden callers.

## A1 — Client references to `conn.db.battle` / `battle_table` / `battleRowToStore`

| Site | What it is | Disposition |
|---|---|---|
| `client/src/net/connection.ts:323-332` | `ingestBattle` + `onInsert`/`onUpdate`/`onDelete` on `conn.db.battle` | **REPLACED** (the whole reshape) |
| `client/src/net/connection.ts:709` | `'SELECT * FROM battle'` (+ stale comment `:704-708`) | **REPLACED** by `'SELECT * FROM my_battle'` + new comment |
| `client/src/net/connection.ts:35, :50` | imports `battleRowToStore`, `type SdkBattleRow` | **KEPT** (both still used inside the flush-closure map) |
| `client/src/net/store.ts:598-605` | `upsertBattle` / `removeBattle` | **KEPT on the store**, banned from connection.ts (exact `upsertMonster`/`removeMonster` precedent, `connection.test.ts:3814-3823`) |
| `client/src/net/store.ts:388` `#battles`; `:835-893` `battle()`, `#isParticipant`, `ongoingBattle`, `latestPlayerBattle` | consumers | **UNCHANGED logic**; stale comments to correct: `:844` (subscribed-unfiltered + stale line ref) and `:851` (ADR-0042 public-table filter) |
| `client/src/net/rowConvert.ts:273` `SdkBattleRow`, `:321-348` `battleRowToStore` | hand-written structural interface, not imported from bindings | **UNCHANGED** — survives the binding rename; `rowConvert.test.ts` stays green untouched |
| `client/src/module_bindings/index.ts:79` | generated | **REGENERATED** — `battle_table.ts` deleted, `my_battle_table.ts` created (monster precedent: only `my_monster_pub_table.ts` exists) |
| `client/src/ui/battleModel.ts` | reads only the store | **NO CHANGE NEEDED** despite being in `touches:` |
| `client/src/main.ts:1884-1888`, `:2085-2088`, `:2038-2060` (`__mrPvp.battleById`) | store readers | **UNCHANGED logic**; gains **one snapshot field** (`battleCount`) — `main.ts` NOT in `touches:`, declare it |
| `client/src/ui/bugBundle.ts:28`, `eventRing.ts`, `pvpModel.ts:41`, `battleView.ts` | store / `battle_challenge` readers | **UNCHANGED** |

## A2 — Evals & tests that see the flipped attribute or the new view

**MUST be edited (deliberate RED until edited):**
1. `evals/monster-privacy.eval.mjs:949-970` — `EXPECTED_SUBSCRIPTIONS` exact allowlist contains `'SELECT * FROM battle'` at `:954` → becomes `'SELECT * FROM my_battle'` (count stays 20).
2. `evals/monster-privacy.eval.mjs:138` — `EXPECTED_VIEWS = ['my_account','my_conversation','my_monster_pub','my_wallet']` (exact ordered set, `:704-710`) → + `my_battle`.
3. **`evals/account-privacy.eval.mjs:209`** — pins the SAME `EXPECTED_VIEWS` set (enforced `:322-336`). **NOT in `touches:`** — declare it.
4. `evals/monster-privacy.eval.mjs` — new `my_battle` `[VB/*]` clause family + fixtures (the slice's pin).

**Stay green, no edit (verified):**
- `evals/battle-schema-snapshot.eval.mjs` — parses only `#[spacetimedb::table(` (`:49-58`, `:192`); no visibility axis; baseline has NO view entries (13r-e proved zero baseline change). **Should end up untouched** despite being in `touches:`.
- `evals/wild-individuality-privacy.eval.mjs` — its `accessor = battle, public` strings are fixtures. `checkNoWildColumnsOnPublicBattle:226-228` short-circuits once battle is private → GREEN but **vacuous** (see R7 — park explicitly).
- `pvp-action-privacy`, `pvp-challenge-reaper` (different tables); `wallet-privacy`/`conversation-privacy` (scope to their own tables); `scanner-migration-audit` (no new entry); the other 14 named — green.

**Go RED for a non-obvious reason (handled in-slice):**
5. **`evals/knowledge-bundle-conformance.eval.mjs:432-446`** runs `okf-export.mjs --check` inside `just ci`. The flip changes `docs/knowledge/tables/battle.md` + `schema-overview.md` counts + every later table's `resource:#Lnnn`. **`just knowledge` regen mandatory, not in `touches:`.** Regen AFTER the schema commit (gitDate stamps).
6. **`evals/adr-digest.eval.mjs`** — ADR-0198 requires `just adr-digest` regen in the same commit.
7. **`evals/bindings-drift.eval.mjs`** — regenerated bindings must be committed.

## A3 — Server-side readers of `ctx.db.battle()` (47 occurrences / 12 files)

All **unaffected** — `public` is transport-only. `pvp.rs` in-scope content is prose only: `pvp.rs:12`. `battle.rs` prose to correct: `:55`, `:83`, `:1148`, `:1449`. `battle.rs:1274-1278` (practice definition) is the load-bearing fact — cite, don't change. **Two-index-chain precedent in-crate:** `battle.rs:145-148` (trade_offer initiator/counterparty chain) — the exact shape, already compiling on 2.8.1.

## A4 — Rust test-mirrors

- `server-module/src/evolution_tests.rs:3453-3720` — `e13r_e_monster_pub_is_private_and_its_view_is_owner_scoped` is the template AND its helper set (`spacetimedb_attr_sites:3379`, `attr_accessor_arg:3407`, `attr_has_word:3425`, `squash_ws:3431`, `strip_comments_and_strings:1629`, `brace_block_range:1667`, `occurrences:1707`) is module-private there — the new mirror goes in `evolution_tests.rs` (a second scanner in `battle_tests.rs` would be a second grammar parser, ADR-0003). Its bare-attribute ban (`:3492-3509`) means the new view attribute must be fully-qualified `#[spacetimedb::view(`.
- No existing Rust test pins the battle attribute or a view count. `economy_tests.rs:1607-1700` (`my_wallet_view_is_owner_scoped`) is the second body-pin precedent.

## A5 — e2e

- `pvp-full` / `pvp-side-b` / `ranked-forfeit` / `trade-interlock` — both pages are participants → view delivers to both → **green**.
- `recruit.spec.ts:93-169, 484-500, 725-734` — own wild battle, green; ALSO the precedent for deterministically driving a wild encounter (grass shuttle) + waiting a turn increment.
- `monster-privacy.spec.ts` — structural model (two-browser `:21-25`, positive anchors `:27-35`, file-ordering audit `:49-55`).

---

# B. The plan (test-first, ordered)

### T0 — Hygiene
PATH export before any `just` recipe; `ps` check for live spacetime before e2e; never run `evals/run.mjs` concurrently with a live e2e.

### T1 (RED) — Rust mirror + eval pin
- `evolution_tests.rs` — add `e15r_sec_a_battle_is_private_and_its_view_is_participant_scoped` (clone of `:3453-3720`).
- `evals/monster-privacy.eval.mjs` — new `[VB/*]` family + GOOD/BAD fixtures, mirroring `[V/*]` (`:583-665`) and `:1199-1520`.

### T2 (RED) — Client source teeth + store unit tests
`connection.test.ts` (`W-15RSECA-*`), `store.test.ts` (`reconcileBattlesFromView` block). Inventory in §C.

### T3 (RED) — Two-identity e2e
New `client/e2e/my-battle-privacy.spec.ts`. **Name is load-bearing:** single-worker alphabetical order over ONE shared world; `golden.spec.ts` asserts exact player population; `my-…` sorts after `golden`. Details §C.

### T4 — Server implementation
`schema.rs:396` → `#[spacetimedb::table(accessor = battle)]`. View immediately after `Battle` closes (`:409`):

```rust
#[spacetimedb::view(accessor = my_battle, public)]
fn my_battle(ctx: &spacetimedb::ViewContext) -> Vec<Battle> {
    ctx.db
        .battle()
        .player_identity()
        .filter(ctx.sender())
        .chain(
            ctx.db
                .battle()
                .opponent_identity()
                .filter(ctx.sender())
                .filter(|b| b.player_identity != ctx.sender()),
        )
        .collect()
}
```
Squashed pin: `ctx.db.battle().player_identity().filter(ctx.sender()).chain(ctx.db.battle().opponent_identity().filter(ctx.sender()).filter(|b|b.player_identity!=ctx.sender())).collect()`

Why this shape: no extra param (caller-chosen-owner leak); two point index scans (`schema.rs:401-404`); **dedup by construction** — the trailing filter excludes the row the first scan already emitted; it is NOT an inequality invariant (practice battles legal, delivered once — say so in doc comment + eval message); no `let me =` (squash symmetry with my_monster_pub; pin `&ctx.sender()` variant too, as `:142-143` does); `Battle` already `#[derive(Clone)]`.
Also correct: `battle.rs:55, :83, :1148, :1449`, `pvp.rs:12`. Comment hygiene per R1.

### T5 — Bindings regen (ordering load-bearing)
Publish → THEN generate. `just gen` has no `-y` and generate prompts on deletion of `battle_table.ts`: use `spacetime generate … -y` or rm-then-gen. Never regenerate before the view exists.

### T6 — Client ingest reshape
Flush closure `connection.ts:141-158` — inside the existing `const live = current; if (live !== undefined)` guard, BEFORE `store.flushBatch()`:
```ts
store.reconcileBattlesFromView(
  [...live.db.myBattle.iter()].map((row) => battleRowToStore(row as unknown as SdkBattleRow)),
);
```
Handlers `:323-332` collapse to `conn.db.myBattle.onInsert(() => batcher.schedule()); conn.db.myBattle.onDelete(() => batcher.schedule());` — **no onUpdate**, `ingestBattle` deleted. Subscription `:709` → `'SELECT * FROM my_battle'`.
camelCase handle (`myBattle`) per the spacetimedb-client skill; SQL string stays `my_battle` — record in ADR-0198.
⚠ Never write `current === undefined` (M21b-2 assignment-count pin, `connection.test.ts:2953-2961`, trap note `:3837-3843`).

### T7 — Store
- `reconcileBattlesFromView(rows: readonly StoreBattle[])` — structurally `reconcileMonstersFromView:571-587`, but with **`deepRowEq`** (new: recurses plain objects AND arrays, `===` primitives, bigint-safe; `JSON.stringify` throws on BigInt). `shallowRowEq:1198-1209`/`nestedRecordEq:1215-1219` CANNOT be reused — `StoreBattle:164-177` nests arrays-of-objects → always-unequal → dirty every flush → render storm (the `reconcileMonstersFromView` docstring `:566-570` names it). Leave 13r-e's helpers untouched.
- `get battleCount()` next to `monsterCount:829-831` (does not exist today, `store.test.ts:938`).
- Keep `upsertBattle`/`removeBattle` (tests), banned from adapter.
- Correct stale comments `:844`, `:851`.

### T8 — DEV snapshot field
`main.ts:1871` region: `battleCount: store.battleCount,` — one line, no comment block (comment-mass guard). Declare `main.ts` in touches-delta.

### T9 — Eval/gate updates
`monster-privacy.eval.mjs` `:138` + `:954` + `[VB/*]`; `account-privacy.eval.mjs:209`; optionally `scripts/okf-export.mjs:41-48` `PRIVATE_ADRS` entry (leave `PUBLIC_PROJECTION` alone).

### T10 — Regen + docs, in order
1. Commit schema/server changes. 2. `just knowledge` → commit. 3. ADR-0198 → `just adr-digest` → commit.
ADR-0198 outline: Context (ADR-0042 → ADR-0042:30 blocked M16 → shipped anyway → ADR-0194 class); D1 flip + view sole read path (RLS inert); D2 body+signature pinned exactly (pin sites named); D3 dedup-by-construction not inequality; D4 ingest not a rename (no-view-PK verified at 2.8.1); D5 deepRowEq; D6 camelCase/snake; D7 accepted consequences (hard refresh per Q-B4; `checkNoWildColumnsOnPublicBattle` vacuous → parked to 15r-sec-vis).
Relations: `Amends: ADR-0042` + reciprocal `Amended-by:` in 0042. Prefer prose references to 0194/0154/0087 (backlink-integrity eval forces reciprocity for ≥0151 pairs).

### T11 — Verify
`just ci` then `just e2e`. gitleaks/Semgrep remote-only: no `ws://`-ish comment text, no "key"-adjacent strings, no dynamic RegExp.

---

# C. Test inventory (each with its RED-on-master proof)

### C1. `evolution_tests.rs` — `e15r_sec_a_battle_is_private_and_its_view_is_participant_scoped`
1 vacuity guard (`stripped.len() > 2000`); 2 bare-attribute ban stays; 3 exactly one table attr `accessor = battle`, NOT `public`; 4 exactly one `#[spacetimedb::view(` with `accessor = my_battle`, IS `public`; 5 zero top-level commas in the param list (caller-chosen-owner tooth, `:3607-3628`); 6 squashed signature `fnmy_battle(ctx:&spacetimedb::ViewContext)->Vec<Battle>`; 7 squashed exact body == sanctioned (or `&ctx.sender()` variant); 8 `fn my_battle` exactly once.
**RED on master:** clause 3 (battle carries public), clause 4 (zero my_battle sites).

### C2. `monster-privacy.eval.mjs` — `[VB/*]` family
Mirrors `[V/attr]`…`[V/once]` with `VIEW_NAME_BATTLE`, `SANCTIONED_ATTR_BATTLE='accessor=my_battle,public'`, `SANCTIONED_RETURN_BATTLE='Vec<Battle>'`, `SANCTIONED_BODY_BATTLE`(+`_REF`). `[VB/filter]` counts exactly **three** `.filter(`. Updates: `EXPECTED_VIEWS:138`, `EXPECTED_SUBSCRIPTIONS:954`, `checkBindings` extension (`battle_table.ts` ABSENT, `my_battle_table.ts` PRESENT).
**Mandatory BAD fixtures (each independently proven to flag):** decoy extra `owner: Identity` param (THE spec-named ADR-0010 tooth); decoy line + `iter().collect()`; dedup dropped; inequality-invariant body; un-attributed second `fn my_battle`; bare `#[view(`. GOOD fixture: five sanctioned views pass.
**RED on master:** `[VB/attr]` zero sites.

### C3. `connection.test.ts` — three describes (helpers: `expectUniqueAnchor:148`, `bodyRegion:161`, `countOccurrences:195`, `codeOccurrences…:223-254`, `parenArgsAt:3603`)
- `W-15RSECA-SUBSCRIBE` — unique `.subscribe([` anchor; anti-vacuity (`my_conversation` still 1); `'SELECT * FROM my_battle'`===1; `'SELECT * FROM battle'`===0 (quoted literals — containment trap); `battle_challenge` still 1. **RED:** my_battle 0.
- `W-15RSECA-INGEST` — `conn.db.myBattle.onInsert(`===1, `.onDelete(`===1, `conn.db.battle.`===0; tripwire `conn.db.myBattle.onUpdate`===0 with the `:3711-3726` anti-vacuity calibrations. **RED:** `conn.db.battle.` is 3.
- `W-15RSECA-RECONCILE` — in `parenArgsAt(squashed,'new MicrotaskBatcher(')`: `store.reconcileBattlesFromView(` present BEFORE `store.flushBatch()`; `myBattle.iter()` + `battleRowToStore` in the closure; global count ===1; `store.upsertBattle(`===0 and `store.removeBattle(`===0 in connection.ts; `reconcileMonstersFromView`===1 regression anchor. **RED:** absent/1/1.
- Optional RAW tooth: stale phrase `battle: unfiltered by design` gone.

### C4. `store.test.ts` — `reconcileBattlesFromView`
1 order-immune insert+delete pair (row updated AND present, both orders — EARS-4 unit proof); 2 membership (absent removed, present kept, count matches); 3 practice row twice in input → `battleCount===1` (EARS-3 client half); 4 **no spurious dirty** — identical deep-equal reconcile fires no listener (kills shallowRowEq reuse); 5 deep change detected (`sideA.team[0].currentHp` → listener fires; kills id/turn-only compare); 6 `battleCount` getter (fast-check property).
**RED on master:** function/getter don't exist.

### C5. `client/e2e/my-battle-privacy.spec.ts` — ONE spec, positive controls mandatory
Two chromium instances. A drives a wild encounter (grass shuttle); B never battles. Asserts: A positive (ongoingBattle, battleById, battleCount 1); B blank-world guard (`ownMonsters.length >= 1`); **negative: B battleCount 0 AND battleById(A_id) null**; turn-advance survival (A attacks; `turnNumber+1` strict; row still present; count still 1). Optional `spacetime sql` cross-check.
**RED on master:** B sees the battle. **Also RED against a mechanical rename** (turn-advance drops the row). afterAll closes both browsers tolerantly. No `new RegExp`.

### C6. Regression suites expected green with NO edit
`rowConvert.test.ts`, `battleModel.test.ts`, `battleView.test.ts`, `pvp-full`, `pvp-side-b`, `ranked-forfeit`, `trade-interlock`, `recruit`, `battle-schema-snapshot.eval.mjs`, `wild-individuality-privacy.eval.mjs`. Any red = real regression.

---

# D. Risks & anti-patterns

- **R1 (highest, silent, full-CI-only):** `battle-reducer-security.eval.mjs` is KNOWN_UNMIGRATED (naive stripper) and scans `battle.rs`. Every new/edited Rust comment: no `/*` (even in glob paths), no unpaired `"`, no `//` inside `https://`-tokens, no double-quote char literals.
- **R2:** never pin `player_identity != opponent_identity` — false for practice battles. Eval message must explain.
- **R3:** one wrong name kills all 20 subscriptions (blank world). SQL `my_battle`, TS `myBattle`.
- **R4:** never regen bindings before the view exists (publish → generate, `-y` or rm-then-gen).
- **R5:** the mechanical rename keeps CI green and breaks battle rendering — C3 tripwire + C5 turn-advance are the two independent controls.
- **R6:** `shallowRowEq` reuse → render storm; C4/4 is the control.
- **R7:** `checkNoWildColumnsOnPublicBattle` goes vacuous (`wild-individuality-privacy.eval.mjs:226-228`). Park explicitly: ADR-0198 D7 line + named follow-up to 15r-sec-vis. Not an undeclared file touch.
- **R8:** touches-delta to declare: `evals/account-privacy.eval.mjs`, `server-module/src/evolution_tests.rs`, `client/src/main.ts`, `docs/knowledge/**`, `docs/adr/0198-*.md` + `DIGEST.md` + `0042-*.md`, optionally `scripts/okf-export.mjs`. Conversely `battle-schema-snapshot.eval.mjs` and `battleModel.ts` are declared but expected untouched.
- **R9:** `just knowledge` AFTER the schema commit; `cargo fmt` before regen; broad `resource:#Lnnn` diff is expected.
- **R10:** `current === undefined` spelling trap (M21b-2 pin).
- **R11:** operational memory cards: global spacetime lock; eval-run clobbers live e2e wasm; Playwright tail-1 miscount; git-checkout wipes uncommitted edits; multi-line commit `-F` heredoc; gitleaks/Semgrep remote-only.
- **R12:** pin review lenses to a SHA.

# E. Right-sizing

**One slice.** Only structurally separable pieces are `store.battleCount` + snapshot field — both prerequisites of this slice's own e2e. Parked (named): R7 vacuity → 15r-sec-vis; visibility axis → 15r-sec-vis (by design); "practice battle exactly once" e2e (no client path to `start_battle`; fact pinned three ways: C1/7, C2 body pin, C4/3) — reason in ADR-0198.

# Key file paths
schema.rs (`:375-382` model view, `:396-409` Battle, `:401-404` indexes) · battle.rs (`:145-148` chain precedent, `:1274-1278` practice) · evolution_tests.rs (`:3379-3720`) · connection.ts (`:141-158`, `:302-332`, `:690-752`) · connection.test.ts (`:145-254`, `:3565-3860`) · store.ts (`:164-177`, `:560-605`, `:829-893`, `:1190-1219`) · main.ts (`:1848-1905`, `:2038-2060`) · monster-privacy.eval.mjs (`:138`, `:583-665`, `:905-935`, `:949-970`, `:1199-1520`) · account-privacy.eval.mjs (`:209`) · knowledge-bundle-conformance.eval.mjs (`:432-446`) · okf-export.mjs (`:41-53`, `:143-149`) · monster-privacy.spec.ts (`:27-35`, `:49-55`, `:173-190`) · pvp-full.spec.ts (`:41-46`, `:104-114`, `:499-608`) · recruit.spec.ts (`:93-169`, `:725-734`)

---

# ADJUDICATED AMENDMENTS (binding — WIN over the body above)
From the plan-review lens batch (reviewer: 2 MAJOR + 3 recommended, all citations verified; red-team: 3 VERIFIED-BYPASS with executed PoCs in /tmp/redteam-15rseca/ + 10 countermeasures). Orchestrator adjudication 2026-08-16; /simplify applied inline (no plan reduction needed — deepRowEq independently verified justified: a turn-only comparator is UNSOUND because `flee` (battle.rs:927) and `apply_pvp_forfeit` (pvp.rs:644-700) mutate `state.outcome` without bumping turn_number).

- **AM1 (RED-proof ordering — reviewer M1, required).** Execution order becomes: tester writes ALL tests → orchestrator RED-proves T1/T2/C4 (red = missing implementation, correctly attributable) → **implement the store half FIRST (T7 `reconcileBattlesFromView` + `deepRowEq` + `battleCount`; T8 snapshot field — green standalone, C4 goes green)** → THEN run the e2e RED proof against the still-public server, where every failure is attributable to the LEAK. Additionally, order C5's assertions so `B.battleById(A_id) === null` (works on master via the existing main.ts:2038-2060 hook, zero new plumbing) precedes any `battleCount` assertion.
- **AM2 (EXPECTED_VIEWS sorted insertion — reviewer M2 / red-team AM-T4, required).** Both `monster-privacy.eval.mjs:138` AND `account-privacy.eval.mjs:209`: insert `my_battle` **second** → `['my_account','my_battle','my_conversation','my_monster_pub','my_wallet']`. The enforcement is `found.sort()` compared index-wise against the literal — a naive append false-REDs both files. Add a one-line comment noting the array must stay sorted.
- **AM3 (scope-bound guard tooth — red-team #1 VERIFIED-BYPASS, required).** W-15RSECA-RECONCILE must (a) brace/paren-walk the actual `if (live !== undefined) { … }` block and assert `store.reconcileBattlesFromView(` occurs INSIDE it (not merely "guard tokens exist somewhere in the closure"), and (b) add the hard tripwire `countCodeOccurrences(flushClosure, 'current.db.') === 0` — bans ANY direct `current.db.*` read in the flush closure (also retroactively covers the monster reconcile).
- **AM4 (alias-spelling tripwires — red-team #2 VERIFIED-BYPASS, required; scoped to my_battle).** The runtime alias map (`index.ts:508-522`) makes `conn.db.my_battle` the same live object as `conn.db.myBattle`. Teeth must assert: `conn.db.myBattle.onUpdate` === 0 AND `conn.db.my_battle.` === 0 (total snake-alias ban for battle — new code is camelCase per the skill; existing views' snake wirings are 13r-e/earlier code and are NOT retro-churned in this slice — systemic alias-hardening for my_wallet/my_monster_pub tripwires goes to the handoff as a follow-up flag).
- **AM5 (reference-replacement clause — red-team #3 VERIFIED-BYPASS, required).** 7th store.test.ts clause: after a value-changing reconcile, `store.battle(id)` must NOT be reference-equal to the previously captured row object (kills the `Object.assign(prev,row)` in-place-mutation cheat that passes all six original clauses).
- **AM6 (no raw `FROM battle` ban — red-team AM-T5).** Do NOT add a `PRIVATE_SUBSCRIPTION_TEXT='FROM battle'` clause — it is a strict prefix of the still-legitimate `'SELECT * FROM battle_challenge'` and false-REDs; `[S/set]`'s exact allowlist already makes the stale literal unrepresentable.
- **AM7 (bindings tooth confirmed — red-team AM-T6).** The `checkBindings` extension (`battle_table.ts` ABSENT / `my_battle_table.ts` PRESENT) is mandatory — it is the only mechanical proof the post-flip regen ran.
- **AM8 (LAUNDER_NEEDLES — red-team AM-T7).** Add `'battle('` to `LAUNDER_NEEDLES` (monster-privacy.eval.mjs:684) for cross-view defense-in-depth parity.
- **AM9 (comment-hygiene scope — reviewer m1/AM-R3).** `battle-reducer-security.eval.mjs::readServerModuleSources` (`:1879-1888`) concatenates EVERY `.rs` under server-module/src through a naive stripper — the new schema.rs doc comment and the new evolution_tests.rs prose are equally in the blast radius, not just battle.rs/pvp.rs.
- **AM10 (signpost — reviewer AM-R4).** One-line comment near the top of `battle_tests.rs` pointing to `evolution_tests.rs::e15r_sec_a_battle_is_private_and_its_view_is_participant_scoped` (battle_tests.rs is an ALWAYS-in-scope sibling test file).
- **AM11 (opponent-branch control named — reviewer AM-R5).** ADR-0198 must name `pvp-full.spec.ts`/`pvp-side-b.spec.ts` as the live control for the view's `opponent_identity` chain branch (the slice's own e2e drives a wild = practice-shaped battle only).
- **AM12 (proc-macro residual — red-team AM-T8).** ADR-0198 residuals note: lexical scanning cannot see a genuine proc-macro-generated view; low likelihood (requires a conspicuous new local proc-macro crate); periodic `cargo expand` scan is the only closure if ever needed.
- **AM13 (batch atomicity note — red-team AM-T10).** ADR-0198 one-liner: subscription-batch atomicity at 2.8.1 is assumed (1.12-era probes); the e2e tolerates either answer via A's positive anchor (symmetric failure).
- **AM14 (single-subscribe-site tooth — red-team AM-T9, cheap subset).** One extra assert in W-15RSECA-SUBSCRIBE: `.subscribe(` occurs exactly ONCE in connection.ts (closes the second-non-bracket-subscribe-site gap file-locally; the full [S/anchor] eval-side extension is a follow-up flag).
- **AM15 (okf-export PRIVATE_ADRS).** Include the one-line `battle: 'ADR-0198 — …'` PRIVATE_ADRS entry in `scripts/okf-export.mjs` (consistency with every other private table's generated Privacy section; declared in touches-delta).
