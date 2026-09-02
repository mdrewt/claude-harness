# m22-s6 — deletion-completeness gate (PRV1-15, PRV1-16) — PLAN

Branch `slice/m22-s6`, worktree `.claude/worktrees/m22-s6`, base `origin/master` @ 5fd93e4.
ADR: **0229** (0228 is the highest shipped; no open PRs at plan time).

## 1. Measured starting position (why the slice is NOT what the spec text says)

The spec's S6 row predates S2/S3b. Both criteria are *partly already shipped*:

| Criterion clause | Already covered by | Verdict |
|---|---|---|
| PRV1-15 "new table … lacks a manifest entry" | `data_lifecycle_manifest_totality_bidirectional` (accounts_tests.rs:3524) — bidirectional set equality + a >=40 ratchet + a mod census | **MET** (stronger than the criterion: *every* live table, not just Identity-bearing ones) |
| PRV1-15 "…+ non-empty `basis`" | `data_lifecycle_basis_nonempty_config_singleton` (accounts_tests.rs:3809) — >=20-byte floor | **MET** |
| PRV1-16 "delete/update call removed from the reaper's cascade body **or moved behind an always-false branch**" | `rb24_deletion_reaper_body_is_pinned_cascade` (accounts_tests.rs:6672) — the reaper body is pinned by **exact equality** to a frozen literal, so both clauses bite | **MET for the reaper body** |

What is **NOT** covered, measured this session:

* **H1 (PRV1-15).** Nothing correlates a table's *actual columns* with its policy. A new
  owner-keyed table classified `NotOwned` passes totality (it has an entry), passes the basis
  floor (prose is prose), and is then **skipped outright** by `m22s3b_cascade_covers_manifest`
  (`NotOwned => needs_cascade = false`). Its rows survive account deletion and every gate is
  green. This is the single largest remaining deletion-completeness hole in the tree, and it is
  exactly what PRV1-15's "**with a direct `Identity` column**" clause is about.
* **H2 (PRV1-16), CORRECTED after the plan red-team.** Under ADR-0228 delegation the cascade is
  `reaper -> 13 helpers -> (sometimes) a sub-helper -> the row write`. The reaper end is exact-pinned
  and each of the 13 helpers has a hand-written shape pin. Of the three tables reachable only through
  a *second* hop, TWO are in fact already proven end to end — `battle_challenge_reaper_schedule`
  (`pvp_tests.rs:5277` + `pvp_tests.rs:2336`) and `pvp_deadline_schedule` (`battle_tests.rs:6401` +
  `pvp_tests.rs:5359`). **Exactly one is genuinely unproven: `trade_offer_reaper_schedule`.**
  `trading_tests.rs:3308` pins that `erase_trade_offers` CALLS `disarm_trade_reaper(`, and
  `trading_tests.rs:1861` pins that helper's five call sites — but nothing anywhere extracts
  `disarm_trade_reaper`'s own body (`trading.rs:148-162`) and asserts it deletes anything. Gutting it
  to a no-op leaves the whole suite green and strands a scheduled reaper row pointing at a deleted
  trade.
  The deeper structural point survives the correction and is what T2 is really for: **every one of
  those pins names its accessors BY HAND.** They are not derived from the manifest, so the coverage
  is a coincidence of authorship maintained by reviewers, and a table classified for the cascade
  whose helper never touches it is invisible by construction. T2 makes that correspondence
  mechanical and self-maintaining as the manifest grows; closing the one live `disarm_trade_reaper`
  gap is a by-product, not the justification.

## 2. Mechanism (ADR-0224-aligned; the S6 REDIRECT)

**No new `evals/*.eval.mjs`.** Two ordinary `#[test]`s, in-crate.

**H1 is proven from the REAL derive metadata, not from source text.** `#[spacetimedb::table]`
derives `SpacetimeType`; a throwaway inline `TypespaceBuilder` yields each row struct's
`AlgebraicType::Product`, and `AlgebraicType::is_identity()` says per column whether it is an
`Identity`. Verified empirically this session across all 40 tables. No comment stripper, no
string-literal parser, no regex — the failure class ADR-0224 retires is structurally absent.

**File placement (recorded in ADR-0229).** The brief's `server-module/tests/deletion_completeness.rs`
is **not viable**: `lib.rs` declares every domain module privately (`mod schema;`, no `pub`), so an
integration target cannot see `DATA_LIFECYCLE_MANIFEST`, `DeletionPolicy` or any row struct. Making
them public is a `lib.rs` edit — outside this slice's `touches:` and a hidden-dependency STOP. An
integration target could only re-derive a source scanner, which is precisely what ADR-0224 forbids.
The tests therefore land in **`server-module/src/accounts_tests.rs`**, an ALWAYS-in-scope sibling
test file of the declared `accounts.rs`, following the explicit ADR-0228/RT-4 precedent ("their
shape pins live here rather than in a new file this slice would have to create").

## 3. Deliverables

### T1 — PRV1-15, shipped as FOUR `#[test]` fns (one per acceptance gate)

The gate ledger cites four distinct `nextest -E test(...)` filters, so T1 ships as four functions,
not one; a single fused function would make X1-X4 match zero tests. They share one registry and one
column-classifier, both file-local helpers.

`m22s6_table_row_types()` — a registry of `(accessor, AlgebraicType)`, one row per manifest table,
built by naming each row **type**, so a removed/renamed struct is a COMPILE error, not a silent skip.

`m22s6_identity_bearing_columns(&AlgebraicType) -> usize` — counts columns that carry an `Identity`
**at any depth**, not just as a bare leaf. `AlgebraicType::is_identity()` is a shallow shape check
(`ProductType::is_identity()` requires exactly one field named `IDENTITY_TAG`), and the plan
red-team MEASURED that `Option<Identity>` lowers to a `Sum`, `Vec<Identity>` to an `Array`, and a
`#[derive(SpacetimeType)]` newtype to a differently-named `Product` — all three invisible to the
shallow check, and `Option<Identity>` is a completely natural column shape ("assigned_to",
"banned_by", "co_owner"). The classifier therefore recurses through `Sum` variants, `Array`
element types and nested `Product` fields before testing `is_identity()`. Measured across all 40
live tables: the deep walk changes exactly one verdict — `account.claimed_from: Option<Identity>`
— and `account` is already `Anonymize`, so every rule below still holds with **no** exception-set
change. The recursion carries a **depth cap that panics with a named message**: the inline
`TypespaceBuilder` never interns, so a future self-referential column type would otherwise
stack-overflow and `SIGABRT` the whole nextest process instead of failing loud (measured by the
red-team in a scratch crate).

* **`m22s6_table_row_registry_matches_manifest`** (X4) — totality both directions vs
  `DATA_LIFECYCLE_MANIFEST`, no duplicates on either side, census pinned at **40**, and the count of
  identity-bearing tables pinned at **21** (17 cascade-classified + the 4 `NotOwned` exceptions).
* **`m22s6_owner_keyed_tables_are_erase_or_anonymize`** (X1) — `Erase` / `Anonymize` => **>= 1**
  identity-bearing column; the population is census-pinned at **17** (13 ERASE + 4 ANONYMIZE, the
  same partition `schema.rs:990` documents). An exact count, not a floor: the sibling
  `m22s3b_cascade_covers_manifest` tightened `>=` to `==` for precisely this reason.
* **`m22s6_via_join_tables_carry_no_identity_column`** (X2) — `ViaJoin(_)` => **exactly 0**
  identity-bearing columns, census-pinned at **5**, with **no exception list**. This is the
  `DeletionPolicy::ViaJoin` doc comment ("No `Identity` column; swept transitively via the named
  parent table") stated as a checked fact.
* **`m22s6_not_owned_identity_exceptions_are_frozen`** (X3) — `NotOwned` => **exactly 0**
  identity-bearing columns, except a frozen set census-pinned at exactly **4** (`config`,
  `guest_claim`, `guest_claim_reaper_schedule`, `account_deletion_reaper_schedule`), each already
  carrying a deliberate `basis`; the `NotOwned` population is pinned at **18**. Every exception name
  must still be present in the live manifest, so a stale exception cannot linger.

The `match` on `DeletionPolicy` has **no wildcard arm**: a new variant is a compile error.

### T2 — `m22s6_cascade_chain_reaches_every_classified_table` (PRV1-16, gate X5)

Manifest-driven end-to-end chain proof for every `Erase`/`Anonymize`/`ViaJoin` entry (**22**):

1. the entry appears in this test's `(table, entry_module, entry_fn, Option<(via_module, via_fn)>)`
   map — an unmapped classified table **panics** (fail loud, never skip);
2. the reaper body contains the entry helper's call needle (chains step 1 to the pinned reaper);
3. the entry helper's declaration occurs **exactly once** in its module source (a first-hit
   `find()` over a decoy second declaration is a steerable anchor — the project has measured that
   class), and where a `via` hop is declared, the entry body calls that sub-helper;
4. the terminal body contains `.<accessor>(` and, **within the same statement** (from that
   occurrence up to the next `;`), a mutating call `.delete(` or `.update(`.

Step 4's statement scoping is a red-team correction, not a nicety. `erase_monsters` is the entry fn
for BOTH `monster` and `monster_pub`; with body-wide "contains an accessor AND contains a mutation",
replacing `ctx.db.monster_pub().monster_id().delete(id);` with
`let _ = ctx.db.monster_pub().monster_id().find(id);` leaves the accessor present, borrows the
`.delete(` from the sibling `monster` line, and stays green — while every `monster_pub` row of every
deleted account survives forever. That exact diff is mutant M4 below.

Census pinned at **22**. This is the first thing in the tree that proves the manifest and the far end
of the delegated cascade agree, and the correspondence is derived from the manifest's own `table`
string at runtime rather than transcribed a second time.

## 4. Proof-of-teeth (one fixture per invariant arm, non-recursive)

| # | Arm | Mutation (production source) | Designated test |
|---|---|---|---|
| M1 | PRV1-15 R1 | `schema.rs` — `monster` entry `Erase` -> `NotOwned` | `m22s6_owner_keyed_tables_are_erase_or_anonymize` |
| M2 | PRV1-15 deep walk | `schema.rs` — add `pub owner_ref: Option<Identity>` to `Character` (a `ViaJoin` table); the shallow `is_identity()` check would NOT see it | `m22s6_via_join_tables_carry_no_identity_column` |
| M3 | PRV1-16 hop 1 | `accounts.rs` — delete `crate::inventory::erase_inventory(ctx, args.account_identity);` from the reaper cascade body | `m22s6_cascade_chain_reaches_every_classified_table` |
| M4 | PRV1-16 statement binding | `monster_mgmt.rs` — `ctx.db.monster_pub().monster_id().delete(id);` -> `let _ = ctx.db.monster_pub().monster_id().find(id);` (the red-team's measured bypass) | `m22s6_cascade_chain_reaches_every_classified_table` |

Each mutation is applied to production source, the designated test is run **by name** (so a shadowing
failure elsewhere cannot be mistaken for the tooth biting), the failure message is recorded, and the
mutation is reverted. Nothing is committed. Per the 2026-09-01 "proof-of-teeth in moderation"
directive there is **no** follow-up audit-the-test task.

## 5. Anti-patterns explicitly avoided

* **No abort-construct blacklist** (`if false`, `todo!()`, …) — memory records 16 CI-clean
  bypasses of that shape; the reaper's exact-body pin already covers the reachability clause.
* **No new comment/string stripper.** T1 does no text scanning at all; T2 reuses the shipped
  `stripped_for_scan` / `extract_squashed_fn_body` helpers, per file, never on a concatenated blob.
* **No needle helper shared between a pin and its expected literal** (measured two-token cheat,
  ADR-0228). T2's accessor needles are derived from the manifest's own `table` string at runtime,
  so there is no second transcription to drift.
* **No re-derivation of the manifest's introspection** — the manifest IS the driver in both tests.
* **No edit to any gating test shipped by S2/S3b**; T1/T2 are additive.

## 6. Out of scope / deferrals

* `evals/account-privacy.eval.mjs` seed-set extension (original S6 touches) — **dropped**, per the
  slice brief: the completeness check moved to real tests and ADR-0224 bans further eval work.
* `evals/pending-deletion-gate.eval.mjs`, `evals/deletion-completeness.eval.mjs` — **retired** by
  ADR-0224, never created.
