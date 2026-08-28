# m22-s2 build plan — Schema + data-lifecycle manifest (M22 privacy S2)

**Slice:** m22-s2 · **Branch:** `slice/m22-s2` (worktree `.claude/worktrees/m22-s2`, fork `00de705`)
**Spec:** `specs/monster-realm-v2/M22-privacy-compliance.spec.md` §2, §3, §4.1, §4.4 (table shape), §5, §7.2 (S2 row, line 458)
**Declared touches:** `server-module/src/schema.rs`, `server-module/src/accounts.rs` (manifest region only)
**ADR reserved:** 0207. **Depends:** S0 (#359, merged), S1 (#360, merged).

## 1. Deliverables (decided, with placement rationale)

**D1 — `Account.terminal_at_ms: Option<i64>`** appended LAST in the `Account` struct
(`schema.rs:752-767`) with `#[default(None)]` (spec §4.1 verbatim). Terminal predicate =
`status == PendingDeletion && terminal_at_ms.is_some()`; S2 ships the COLUMN only — nothing
writes `Some` until S3. Mechanically forced companion edit: `new_account_row`
(`accounts.rs:136-45`) is the ONE Account constructor using a full struct literal → gains
`terminal_at_ms: None,`. The other four constructors use `..existing` (verified) — untouched.

**D2 — `export_bundle` table (new, PRIVATE)** in `schema.rs` (end of file, M22 section):
```
#[derive(Clone)]
#[spacetimedb::table(accessor = export_bundle)]
pub struct ExportBundle {
    #[primary_key] #[auto_inc] pub chunk_id: u64,
    #[index(btree)] pub owner_identity: Identity,
    pub request_id: u64,
    pub table_name: String,
    pub chunk_index: u32,
    pub total_chunks: u32,
    pub payload_json: String,
    pub created_at_ms: i64,
}
```
Chunk-field contract per spec §5 (S2↔S4↔S8 named cross-slice contract): one row per
`(owner_identity, request_id, table_name)`, sub-chunked via `chunk_index`/`total_chunks` at
`game_core::EXPORT_CHUNK_ROWS` (S1). `created_at_ms` is server-stamped at insert and is what the
S4 TTL reaper re-derives staleness from at fire time (injected clock; the §4.4-D6 "no
caller-suppliable staleness" spirit — the row itself is reducer-written, never client input).
`chunk_id` synthetic PK (views strip PKs; the private table needs one; PK/auto_inc cannot carry
`#[default]` — doc restriction). NO `public` token. Attr shape: `accessor =` FIRST, derives
BEFORE the table attr, newline before `}` (parseTableSchemas + snapshot-regex constraints,
measured traps in memory).

**D3 — the data-lifecycle manifest** (`deletion_policy` + `basis` + `exportable` per spec §3)
lands as a **Rust const in `schema.rs`** — NOT in accounts.rs, NOT in the JS `REKEY_MANIFEST`:
```
pub enum DeletionPolicy { Erase, Anonymize, ViaJoin(&'static str), NotOwned }
pub struct DataLifecycleEntry { pub table: &'static str, pub policy: DeletionPolicy,
                                pub basis: &'static str, pub exportable: bool }
pub const DATA_LIFECYCLE_MANIFEST: &[DataLifecycleEntry] = &[ /* 39 entries */ ];
```
39 = the 38 live tables (census verified == spec §3's recount) + `export_bundle` (D2). NO entry
for `account_deletion_reaper_schedule` (deferred with the table, D5). Placement rationale
(**all three alternatives measured/proven dead**):
- JS `REKEY_MANIFEST` object-ification is red-on-arrival — R-m22-s0-X1, MEASURED:
  `checkRekeyCompleteness` infers REKEY from `typeof policy === 'string'`; any object entry
  reds `[G6/consumed]`. Disposition evidence (stated precisely — the plan reviewer flagged an
  earlier looser wording): the residual record in `memory/projects/mr-residuals.jsonl` carries
  `target: "backlog"`, `status: "unpromoted"`, `promoted_slice: null`, `owner: "supervisor"` —
  i.e. the supervisor has NOT promoted the JS-discriminator work into S2 — and the supervisor's
  S2 launch brief declares touches that EXCLUDE `guest-claim-integrity.eval.mjs` and instruct
  "Touch accounts.rs manifest region ONLY". The S0 handoff's "S2 must add a discriminator"
  sentence predates that brief and is superseded by it. This is nonetheless a SPEC DEVIATION
  (spec §2 says "extend one manifest, not build a second") and is ESCALATED for supervisor
  sign-off exactly like D5: recorded in ADR-0207, flagged in the PR body and handoff. Drift
  mitigation: T9 cross-manifest consistency test (every `REKEY_MANIFEST` key's table-half must
  exist in `DATA_LIFECYCLE_MANIFEST`), plus both manifests are independently tied to the SAME
  live source ([G6/live] for the JS side, T1 for the Rust side), so a rename/drop surfaces in
  both regardless.
- accounts.rs placement reds a LIVE security gate — `g5_no_wallet_accessor_in_accounts`
  (`accounts_tests.rs:2166-2173`) scans accounts.rs with string content PRESERVED and bans the
  token `player_wallet` anywhere; the §3 ERASE list contains `player_wallet`. Weakening that
  gate to admit a manifest is exactly what the verifier's not-weakened audit forbids.
- schema.rs is where every table name already legitimately occurs, is in the declared touches,
  and colocates the classification with the declarations it classifies (a new-table author sees
  it). It is "the REKEY_MANIFEST-adjacent schema" of the slice brief.
Enum/struct derive `Debug, PartialEq, Eq` only if tests need them (start bare; add on demand).
**Clippy dead_code (red-team MEASURED, trap #13):** with `mod schema;` private and no non-test
consumer, `clippy --all-targets -D warnings` hard-fails on the bare enum/struct/const (test-only
reads do NOT silence the lib target). Mitigation — NOT an `#[allow]`: a compile-time anonymous
const assertion `const _: () = assert!(manifest_is_wellformed(DATA_LIFECYCLE_MANIFEST));` where
`manifest_is_wellformed` is a `const fn` that walks every entry, requires non-empty `table` and
`basis`, and reads `policy`/`exportable` — a genuine compile-time tooth (empty basis = compile
error) that also makes every item + field live in the lib target. All four `DeletionPolicy`
variants are constructed in the 39-entry initializer, so no variant is "never constructed".
Fallback if empirics disagree: a narrowly-scoped `#[allow(dead_code)]` with an S3/S4-consumer
comment, declared in the PR.
**Basis-string hygiene (red-team MEASURED, trap #14):** `battle-schema-snapshot.eval.mjs` (live
drift check AND its `--write` regenerator) parses RAW source with a string-UNAWARE comment
stripper — a `/*` inside one basis string literal silently swallows every subsequent table from
the committed baseline, self-consistently. HARD RULE: **no `/` character in any manifest string
literal**; enforced by a T3 tooth (basis/table strings are slash-free).
Exportability decisions (per §3+§5) — stated as a POSITIVE BIJECTION (all three lenses
converged: negative-only spot checks admit an all-false manifest that kills the export feature):
`exportable == true` for EXACTLY these 17: the 12 spec-ERASE tables (`monster`, `monster_pub`,
`inventory`, `player_dialogue_state`, `player_quest`, `player_conversation`, `heal_cooldown`,
`player_wallet`, `playtest_event`, `trade_offer`, `battle_challenge`, `battle_action`) + the 4
ANONYMIZE (`player`, `profile`, `account`, `battle`) + `character`; `false` for the other 22
(`export_bundle` itself, `battle_wild` [seed], `guest_claim` [secret], the other JOIN_ONLY
schedules, all 17 NOT_OWNED).
`config`'s basis MUST contain the word `singleton` (future `[DEL-03]`). ViaJoin parents PINNED
BY VALUE (red-team: liveness-only lets a wrong parent through): `character`→`player`,
`battle_wild`→`battle`, `pvp_deadline_schedule`→`battle`, `battle_challenge_reaper_schedule`→
`battle_challenge`, `trade_offer_reaper_schedule`→`trade_offer` (tester verifies each against
the actual join column in source before pinning).

**D4 — `auth_issuer` doc-comment correction** (`schema.rs:755-757`): "Never updated after
insert" → states the ONE sanctioned exception: the M22 deletion cascade overwrites it with
`game_core::TOMBSTONE_AUTH_ISSUER` (§3 ANONYMIZE row; sentinel keeps the column non-nullable /
type-unchanged). Comment text must avoid `/*`, avoid double quotes (JS stripper soundness runs
on every live source).

**D5 — `AccountDeletionReaperSchedule`: DEFERRED to S3, with a platform citation.** SpacetimeDB
automatic-migrations doc (master + versioned, both): *"❌ Forbidden Changes … Changing whether a
table is used for `scheduling`."* A scheduled table's `scheduled(account_deletion_reaper)` attr
requires the reducer to exist at compile time; the reducer is S3's (and declaring it in S2 also
hard-reds `[R/name-set]`'s exact-5 pin + its Rust twin, residual R-m22-s1-X1). Shipping the
table UNSCHEDULED in S2 and flipping the attr in S3 is a forbidden automigration = a destructive
republish landmine (ADR-0006 violation; the nightly smoke-republish would red at S3). The table
+ its scheduled reducer must land ATOMICALLY in S3 as a new table (always additive). Ledger:
`DEFER: X15 -> m22-s3`. Spec §7.2's S2/S3 split did not account for this — recorded in ADR-0207
and flagged for spec amendment.

**D6 — `REKEY_MANIFEST` gains ONE string key** (`evals/guest-claim-integrity.eval.mjs`,
touches-delta, mechanically forced): `[G6/declared]` derives every `Identity` column from live
source and REDs on `export_bundle.owner_identity` without an entry; the gate's own error text
mandates "Add it to REKEY_MANIFEST in the same PR that adds the column." String keys are
measured-safe (S0 red-team); only object entries are the parked trap. Entry:
`'export_bundle.owner_identity': 'EXEMPT: TTL-bound export snapshot, deliberately not re-keyed
across a claim (expires via the S4 reaper); M22 cascade sweeps this column'`. Bidirectional
`[G6/live]` requires the key to exactly match the live column.

**D7 — `account_state_is_legal` extension (accounts.rs)** — PROPOSED, lenses to adjudicate:
one new clause `terminal_at_ms.is_some() → (status == PendingDeletion &&
deletion_requested_at_ms.is_some())`. Pro: the tripwire's own contract says M22 must "re-derive
the predicate consciously when the shape moves"; S2 moves the shape; a field with no legality
rule is the illegal-states-representable smell. Con: outside the "manifest region only"
instruction (though `new_account_row` already forces one accounts.rs line); nothing can create
the illegal state until S3. Recommendation: EXTEND now (pure predicate, 2 lines, tests drive it
directly; S3 inherits a safe seam).

**D8 — mechanically-forced regenerations** (all touches-delta, all generated):
`evals/baselines/table-schemas.json` (`node evals/battle-schema-snapshot.eval.mjs --write`;
append-only layer polices the diff), `client/src/module_bindings/**` (`just gen`; bindings-drift
eval reds otherwise), `docs/knowledge/**` (`just knowledge` AFTER the schema commit — bundle
stamps gitDate(schema.rs); fmt first), `docs/adr/DIGEST.md` (`just adr-digest`, with ADR-0207).

## 2. What S2 deliberately does NOT do
No reducer bodies/edits; no writes; no view; no game-core change; no `evals/run.mjs` or shared
eval logic changes beyond D6's one key; no `[G6/consumed]` teaching (stays R-m22-s0-X1 →
backlog); no per-slice eval FILE (evals/ outside touches — S1 precedent, declared deviation;
S2's teeth are Rust sibling tests + the ledger probes); no JS-manifest deletion_policy fields.

## 3. Trap register (all measured, sources cited)
1. `g5_no_wallet_accessor_in_accounts` — keep-strings token ban in accounts.rs (→ D3 placement).
2. R-m22-s0-X1 — JS manifest object entries red `[G6/consumed]` (→ D3/D6 split).
3. `[R/name-set]` exact-5 reducer pin + Rust twin (→ D5 deferral; S2 adds zero reducers).
4. `scheduled()` flip = forbidden automigration (→ D5).
5. `parseTableSchemas` needs `accessor =` first, newline before `}`, derives before attr;
   `[G6/parse]` asserts declared==parsed per file (→ D2 shape).
6. `#[default(0)]` i64 4-byte encoding automigration failure (memory card) — `#[default(None)]`
   has no numeric literal; X9's REAL republish probe verifies empirically (local CI cannot).
7. `schema_account_struct_shape_tripwire` + `auth6_no_email_or_subject_stored` pin the Account
   field list — tester updates the tripwire to the NEW shape (spec-driven re-derivation).
8. Stripper soundness (`[STRIP/*]`, per-file) — no `/*` in comments, no stray double quotes,
   0x22-class gotchas (memory card server-module-source-scan-gotchas).
9. Baseline regen has append-only git policing — regenerate, never hand-edit.
10. `account-e2e` global spacetime lock — X9's probe uses its own `--data-dir`/port; never run
    concurrently with `just ci`.
11. Format hook uses unpinned biome (memory) — JS eval edit may get reformatted; keep the D6
    edit to pure line insertions.
12. `mr-gates`: gates need `EVIDENCE: pending`; CHECKs may not contain `||`; ids are bare `X1:`.

## 4. Test plan (tester = separate opus agent; tests start RED)
Sibling test files (in-scope companions): `server-module/src/schema_tests.rs`? — does not exist;
Account pins live in `accounts_tests.rs` (include_str! both sources — precedent at :260, :1346).
New tests go in `accounts_tests.rs` (it already owns SCHEMA_RS scans):
- T1 manifest totality, BIDIRECTIONAL: table-attr census over the ENUMERATED file set
  (red-team: accounts_tests' existing 5-file include_str! set misses 7 of 38 tables) —
  `schema.rs`, `accounts.rs`, `observability.rs`, `playtest.rs`, `movement.rs`, `trading.rs`,
  `pvp.rs` — == manifest `table` key set, exactly-once each (kills: dropped entry, phantom
  entry, dup entry). PLUS a lib.rs `mod`-census cross-check: every `mod X;` in lib.rs is either
  in the scanned set or in a pinned zero-tables exempt list (closes the new-file blind spot).
  Per-file scrub discipline (memory: recruit-eval concat trap).
- T2 spec-partition pin: the four §3 name-sets verbatim (12 ERASE / 4 ANONYMIZE / 5 JOIN_ONLY /
  17 NOT_OWNED) + `export_bundle` ⇒ Erase/false, AND the five `ViaJoin` PAYLOADS pinned by
  exact value (character→player, battle_wild→battle, pvp_deadline_schedule→battle,
  battle_challenge_reaper_schedule→battle_challenge, trade_offer_reaper_schedule→trade_offer —
  verify against real join columns first) (kills: quiet re-classification, wrong parent).
- T3 basis hygiene: every basis non-empty AND ≥ a floor length; `config` basis contains
  `singleton`; NO `/` character in ANY manifest string literal (trap #14 — snapshot-baseline
  blinding); every `ViaJoin` parent is a live table AND is not itself `ViaJoin` (kills: empty
  prose, parser-blinding prose, dangling parent, join chains).
- T4 export bijection (POSITIVE): the `exportable == true` set equals EXACTLY the 17 tables
  named in D3 — set equality, both directions (kills: the measured all-false cheat AND
  exporting the seed/secret/own-output).
- T5 Account shape: tripwire updated to pin `terminal_at_ms` LAST with `#[default(None)]`
  (extend the existing tripwire — tester owns it; implement via its existing marker mechanics).
- T6 auth_issuer comment: RAW schema.rs no longer matches the squashed stale phrase
  "Neverupdatedafterinsert"; contains the exception phrase + `TOMBSTONE_AUTH_ISSUER` name
  (kills: comment left stale; exception text dropped).
- T7 export_bundle shape: struct census — exact 8 fields in order, `chunk_id` PK+auto_inc,
  btree on `owner_identity`, attr carries NO `public` (kills: field rename/reorder, public leak).
- T8 legality predicate (D7 ADOPTED — both lenses concur): terminal-without-request and
  terminal-while-Active are illegal; all-None legal; AND the one LEGAL terminal shape
  (`PendingDeletion` + `Some(requested)` + `Some(terminal)`) is ACCEPTED (reviewer: an
  over-strict `terminal_at_ms.is_none()` clause passes the two negative tests and breaks S3).
- T9 cross-manifest consistency: every `REKEY_MANIFEST` key's table-half (scan the eval file
  text via include_str!) exists in `DATA_LIFECYCLE_MANIFEST` (kills: the two manifests drifting
  on a table rename/split).
- Bite-proofs (orchestrator EXECUTES each — tester has no Bash): mutate one manifest entry's
  policy → T2 red; drop an entry → T1 red; blank a basis → T3 red; flip battle_wild exportable
  → T4 red; move terminal_at_ms mid-struct → T5 red (+ checkAppendedColumns X1 probe red);
  re-add `public` to export_bundle → T7 red.

## 5. Acceptance gates — X1..X15 authored in PLAN phase (ledger seeded 0 criteria,
SPEC-SECTION-NOT-FOUND, 7th occurrence). Shapes copied from m22-s1's proven node -e pattern.
X9 = REAL automigration probe (publish fork module → publish S2 module over it = must succeed;
negative control: scheduled-flip or mid-struct variant = must FAIL) via a persisted script at
`memory/projects/gates/m22-s2.migration-probe.mjs` — the ONLY gate that can see encoding-class
publish failures. X15 = the reaper table, DEFER → m22-s3 (D5).

## 6. Sequencing
plan+ledger commit/push → plan lenses (reviewer ∥ red-team ∥ simplify, one batch) → adjudicate
→ tester (opus) RED suite → orchestrator runs RED proof → implement (orchestrator; tester's
gating tests untouched) → fast gate (`just ci-fast server-module` + targeted evals) → regens
(baseline, bindings, knowledge, digest) → full `just ci` ONCE → mr-gates check → impl lenses
(reviewer ∥ red-team ∥ reducer-security-auditor ∥ simplify; desync-guard mechanically empty —
zero game-core/netcode files, m23-s0 precedent, declare it) → verifier (independent) →
doc-keeper (ADR-0207, ARCHITECTURE, knowledge cards) → PR.

## 7. Declared deviations (all go in the PR body)
- Reaper table deferred to S3 (D5, platform-forbidden migration) — ledger DEFER, spec flag.
- Manifest lands in schema.rs as a Rust const, not the JS REKEY_MANIFEST (D3; R-m22-s0-X1).
- One-key REKEY_MANIFEST + one-line new_account_row edits outside the literal touches
  (mechanically forced; gate-mandated in-same-PR) — touches-delta.
- D7: `account_state_is_legal` + its five constructor debug_asserts live in accounts.rs OUTSIDE
  the manifest region — the shape-move re-derivation the tripwire's own contract demands
  (reviewer: list this explicitly).
- No per-slice eval file (S1 precedent; evals/ outside touches).
- No game-core cascade-table list (§4.7 wants it in game-core; game-core outside touches) —
  the schema.rs manifest is the SSOT until a later slice lifts it; flagged to supervisor.
