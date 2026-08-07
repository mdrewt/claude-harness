# 12r-d plan memo (adjudicated) — ADR-0170 disclosed-but-untracked residual closure

Branch `feat/12r-d-adr0170-residual-closure`, worktree `.claude/worktrees/12r-d`, base `b4c55b5`.
Planner: opus/high. Plan review: reviewer + red-team + simplify (3 lenses, parallel). This memo is
the frozen, adjudicated contract — it records every review finding and the ruling.

## Scope (verified at b4c55b5 — spec line numbers had drifted)

**Item 1 — heal currency display path.** Server debit ALREADY exists (`raising.rs:340` reads
`cost_currency` from `cached_heal_locations()`, escrow + `spend_currency`; pinned by H-2/H-3 in
`raising_tests.rs` — keep-alive, NO edit). Missing display path only:
- `schema.rs:546-556`: append `#[default(0u64)] pub cost_currency: u64,` AFTER `cooldown_ms`
  (ADR-0173 D5 append-at-end ACCEPTED shape; `0u64` typed literal — bare `0` fails automigration
  4-byte encoding; precedent `schema.rs:292` `#[default(0i64)]`).
- `content.rs:724` seed literal: `cost_currency: def.cost_currency,`.
- `evals/baselines/table-schemas.json`: `"cost_currency": "u64"` (gate-forced:
  battle-schema-snapshot.eval.mjs exact-match bidirectional). **touches-delta**.
- `just gen` bindings regen (whole output, C7, no hand edits).
- **D1 (adjudicated): bigint end-to-end.** `StoreHealLocationRow.costCurrency: bigint` REQUIRED;
  rowConvert pure pass-through (no Number(), matches wallet doctrine rowConvert.ts:546 + ADR-0169
  §D3 + ADR-0134 §D5; every sibling u64 row scalar is bigint); healModel VM `costCurrency: bigint`,
  `isFree` uses `=== 0n`; DELETE the INERT `HealLocationInputRow` intersection type. Discriminator
  tooth: `2n**53n+1n` round-trip. This REVERSES ADR-0170 D3's stated number-narrowing — documented
  as a prose amendment note in ADR-0170 itself (see Docs).
- **D3: `formatHealCostLine(loc)` pure formatter exported from healModel.ts** (first-of-kind
  pattern, accepted by simplify because the cost line now has a real 3-way branch and healView is
  coverage-excluded); healView.ts:25 delegates; delegation pinned by ONE minimal `.includes` scan;
  the formatter's own branches get direct unit tests (mutation gate).
- Compile-forced touches-delta: `connection.ts:371-379` local SdkHealRow +1 line;
  `interactModel.test.ts:104-113` factory +`costCurrency: 0n`.
- **store.test.ts trap (reviewer HIGH-4 / red-team #1):** local `interface StoreHealLocationRow`
  at store.test.ts:2130 + type-erasure casts mean NO compile signal fires there — tester must add
  a real costCurrency bigint round-trip via upsertHealLocation/healLocations, and align the local
  interface/factory. rowConvert.test.ts fixtures (~:1254-1300) also need costCurrency.

**Item 2 — cache swaps, FIVE sites.** pvp.rs:280,392 `load_abilities()` →
`crate::content_cache::cached_abilities()?` (drop the leading `&` at downstream
`build_ability_store(..., &ability_defs)` sites — `&'static Vec` double-ref clippy risk,
red-team #3; battle.rs:245 shape is load-bearing); pvp.rs:383 + taming.rs:193
`type_chart_from_rows` → `cached_type_chart(ctx)?` (Arc, same ref depth, `&type_chart` stays);
taming.rs:207 + delete PARK comment **:205-206 ONLY** (keep :204 — reviewer LOW-7). Import
cleanups: pvp.rs:36,41,46 / taming.rs:22,26,31 (`type_chart_from_rows`, `type_relation_row`,
`load_abilities`) — clippy-forced, core scope not boyscout.
**E2 teeth home (adjudicated, simplify MAJOR-2 + reviewer MED-5): extend
`content_cache_tests.rs`** — its own doc comment invites widening "in the slice that legitimately
swaps those call sites" (= this slice); helpers (`strip_rust_comments_local`,
`extract_fn_body_local`) already exist; taming.rs already include_str!'d; add
include_str!("pvp.rs"). Shape: per-function positive PRESENCE checks (>=1, NOT exact counts) +
whole-file `banned == 0` per file (E2's literal EARS) + raw-scan PARK-marker-absent (in
taming's scan or same test). **touches-delta** (test-only, zero sibling collision; also update its
now-stale doc comment at ~:1288-1293 in the same edit).

**Item 3 — JSON escaping, TWELVE sites (adjudicated).** Mandated six: battle.rs:1158,1240,1256,
1266,1382 + npc.rs:164 (runtime RON/serde error text). Plus pvp.rs:501,518,612,625 — ADR-0170
residual 8 verbatim batches them into this slice; core scope, NOT boyscout. Plus content.rs:649,
670 (npc_sync_remove/repair) — **different, weaker class** (content-authored `npc_id`, charset
UNvalidated per red-team: `validate_npc_content` checks uniqueness/dangling refs only, so a quote
CAN reach the line): justified as defensive escaping, honestly labelled in PR body (reviewer
HIGH-2 satisfied by re-justification; content.rs:670 positional `{}` → named escaped binding for
uniform scan shape). evolution.rs:203,221,234 OUT (outside touches) — queued explicitly in the
ADR closure as a new residual needing a supervisor slice.
Impl shape: `let escaped = crate::guards::json_escape(&e);` then interpolate the binding
(npc.rs quest_id precedent; literal prefixes `ivs: `/`evs: `/`level: ` stay outside the escape).
Teeth: per-file TABLE-DRIVEN site scans (rows = (evt, escaped-binding)) on comment-stripped
NOT-string-blanked source, asserting per-site raw-`{e}` absent + escaped binding present IN THE
SAME format string (red-team A: never file-wide counts alone), mirroring movement_tests M-6 +
npc_tests:1125-1254; PLUS one compact behavioural table (~8 rows) in battle_tests.rs composing
the production format shape with json_escape and asserting framing via a minimal checker (EARS E3
literally demands table-driven JSON-parseability; kept over simplify MAJOR-3 but shrunk; honest
limit documented: framing validation, not full parse — no serde_json dev-dep).

## Docs (S4, last)
- ADR-0170 edit ONLY (no new ADR, no header changes, no ADR-0083 file edit): Residuals 1/2/8 →
  CLOSED-by-12r-d notes with CORRECTED line citations (residual-8's were stale); prose amendment
  note at/near D3: client seam ships bigint (supersedes the optional-number + `?? 0` INERT shape
  AND the "u64→number narrowing" suggestion; cites wallet/sellPrice SSOT), and notes the
  pre-existing `cooldownMs: number` mistype (red-team #6, flagged not fixed); new residuals:
  evolution.rs:203,221,234 escaping (queue it — spec thesis is exactly that disclosed-unqueued
  rots); two-readers divergence (heal_party reads RON cache, client reads row; divergence window =
  republished-but-not-yet-synced; unification on `loc.cost_currency` = 12r-e candidate, raising.rs
  is 12r-e's file). Formal `Amends:`/`Amended-by:` pair with ADR-0083 = supervisor follow-up
  (backlink gate doesn't demand it: 0083 < era threshold 0151).
- `just adr-digest` + commit DIGEST drift. ARCHITECTURE.md: one clause on the heal_location_row
  line. CHANGELOG untouched. `just knowledge` AFTER the schema commit (stamps gitDate(schema.rs)).

## Test discipline (all testers)
- concat!/parts-split EVERY new test string resembling `#[spacetimedb::table(`, `pub fn `,
  `\nfn `, `load_abilities`, `type_chart_from_rows` markers (red-team #2 — whole-tree eval
  parsers concatenate _tests.rs files; EG2 poisoning precedent). 0x22/0x27 constants, no raw '"'
  char literal, no contiguous /* or */ in comments, no `new RegExp(` anywhere.
- Seed tooth anchored: assert the whitespace-squashed row literal contains the adjacent-field
  sequence (…cooldown_ms:def.cooldown_ms,cost_currency:def.cost_currency…) — kills the
  `stale_def.cost_currency` decoy (red-team #4).
- Tester documents per-test REDness at HEAD; green-at-HEAD-by-design rows (type-migration
  keep-alives) are labelled as such (red-team F).
- V-block rewrite ships a per-case inventory: each retired it() → bigint successor or explicit
  "moot under bigint" note (V-5 ??-vs-|| NaN tooth is moot-by-type; successor = 2^53+1
  discriminator) (reviewer MED-6).

## Commit sequence
C1 test(12r-d): RED server teeth (cache-swap scans + escaping site scans + behavioural table +
   heal schema/seed/baseline scans) → C2 cache swaps → C3 escaping impl (12 sites) →
C4 feat: schema column + seed + baseline → C4b chore: knowledge regen → C5 chore: `just gen`
   bindings → C6 test(12r-d): RED client teeth → C7 feat: client wiring bigint end-to-end →
C8 docs: ADR-0170 + DIGEST + ARCHITECTURE. wip: checkpoints at each phase boundary, pushed.
just ci fully green only at C8; fast gates between.

## Risks
R1 no spacetime CLI → HARD STOP before C5 (never hand-write bindings). R2 automigration: attempt a
real `just smoke-republish` rehearsal if an instance can run; else state honestly + cite ADR-0173
D5 ACCEPTED row. R7 bigint ripple: run `npm run typecheck` right after the store.ts edit; a fifth
production file = STOP + re-disclose. gitleaks/ReDoS/knowledge-ordering per memory cards.

## touches-delta (for the PR body)
evals/baselines/table-schemas.json (gate-forced) · client/src/net/connection.ts (compile-forced,
1 line) · client/src/ui/interactModel.test.ts (compile-forced, 1 line) ·
server-module/src/content_cache_tests.rs (E2 teeth home per its own widening invitation +
stale-comment fix) · client/src/net/store.test.ts + rowConvert.test.ts (siblings of declared
files — in scope, listed for completeness). boyscout-delta: none planned.
