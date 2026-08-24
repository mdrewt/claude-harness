CEREMONY COMPLETE (2026-08-23) — this file WAS a provisional design sketch. It is now the converged,
implementation-ready M22 design, produced by the full `mr-feedback-doctrine.md` §6 HEAVY CEREMONY
(investigation → 6-way ideation → judge synthesis → adversarial review) authorized by the
2026-08-23 operator note in `PLAN.md` §9. The original sketch is preserved verbatim in §10 as the
ceremony's input of record. Do not re-run the ceremony; build from §§1–8.

# Spec: M22 — Privacy, data deletion & compliance

**Status:** converged, implementation-ready (ceremony output, 2026-08-23) · **Phase D** ·
**Design authority:** ADR-0031 (harness design ADR, builds on 0030) — this spec is the
implementation-ready elaboration that ADR-0031 defers to. Per-slice implementation ADRs are reserved
at build time from the **project** ADR sequence: `mr-state.json` records `adr_next_free: 204`, but
`docs/adr/0204-roster-wave-3-electric-and-light.md` already exists on disk — **the true next-free is
0205, and the state-file drift is a slice-S0 fix-up** (§7 S0).
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M21 (a/b/c, merged — this
milestone extends its `delete_account`/`PendingDeletion` machinery, it does not replace it).
**Boundary:** → **M25** the privacy/deletion/export surface is part of the consolidated threat model
and the blocking security sign-off.

## 1. Problem / intent

A defensible **data-lifecycle** story for user data — right-to-be-forgotten, data export, retention —
done **mechanically**, so a new owner-keyed table cannot silently retain personal data. The load-bearing
insight the ceremony's investigation established: **the registry this milestone needs already exists in
embryonic form.** `server-module/src/accounts.rs:274-280`'s `rekey_all()` and its source-scanning CI
gate G6 `REKEY_COMPLETENESS` (`evals/guest-claim-integrity.eval.mjs:1344-1420`) already enumerate every
`Identity`/`Option<Identity>` column in the module and require each to carry a policy value. That
manifest's own text names this milestone as its consumer, verbatim at
`evals/guest-claim-integrity.eval.mjs:1392-1395`:

> "…the policy value stands — but the REASON must be truthful, because **M22 consumes this manifest as
> its deletion-cascade SSOT** and 'BLOCKED' otherwise reads as 'no cascade needed'."

and, on specific columns, at `:1396-1401` and `:1414-1416`: *"terminal rows survive and orphan; **M22
cascade MUST sweep this column**"* (`battle.player_identity`/`battle.opponent_identity`) and *"an
incoming challenge survives until the TTL reaper; **M22 cascade MUST sweep this column**"*
(`battle_challenge.target`). M22 therefore **extends one manifest**, it does not build a second one.

**Out of scope (unchanged from the sketch):** jurisdiction-specific legal text, DPA, ToS — legal, not
engineering. This milestone provides the mechanisms.

## 2. The registry — DECIDED: extend `REKEY_MANIFEST`/G6, not a new mechanism

`REKEY_MANIFEST` entries (keyed `table.column`) each gain a second policy dimension:

```
deletion_policy: 'ERASE' | 'ANONYMIZE' | { via_join: '<parent_table>' } | 'NOT_OWNED'
basis: '<non-empty prose reason>'      // mandatory; empty/absent is a hard CI failure
exportable: true | false               // third, orthogonal axis — see §5
```

**Why extension beats the alternatives** (each was designed and adversarially reviewed in the ceremony):

- **A brand-new source-scanning eval** with its own `parseTables` walk buys nothing G6 does not already
  do, at the cost of a *second enumeration of the same input* — free to drift from the first the moment
  someone edits one and not the other. This project has already been burned by exactly this class of
  gate failure ("9 of 19 broken implementations passed green", recorded in
  `evals/conversation-privacy.eval.mjs`'s own header).
- **A compile-time Rust construct** (proc-macro + `inventory`/`linkme` linker-section registry) was
  designed and then falsified on live evidence: no proc-macro crate exists in the workspace, `inventory`/
  `linkme`/`distributed_slice` appear nowhere, and the `wasm32-unknown-unknown` cdylib target
  (`server-module/Cargo.toml`) has no ctor-running host for `inventory::submit!`'s mechanism. It would
  also, structurally, be unable to see the join-only hazards (§4) — there is no attribute site to put a
  declaration on when the table has no `Identity` column at all.

**What makes an unregistered table a BUILD FAILURE:** `findIdentityColumns` re-derives the full
`Identity`-column set from live source on every CI run — this is not new infrastructure, it is an
exercised gate today with its own proof-of-teeth fixtures. `evals/deletion-completeness.eval.mjs` (new
file, §6) **imports** that walker rather than reimplementing it, and requires every derived column to
carry a `deletion_policy` **and** a non-empty `basis`. A new table with an `Identity` column and no
manifest entry fails immediately — no heuristic, no naming convention, derived directly from the Rust
source via the existing parse.

**Slice-0 contract:** `REKEY_MANIFEST`, `findIdentityColumns`, `parseTableSchemas` are exported from
`evals/guest-claim-integrity.eval.mjs` (or lifted into a shared `evals/rekey-registry-shared.mjs` if
that file is already near a size-split threshold — check first) so there is exactly **one walker, two
gate files reading it**.

## 3. Classification — exhaustive partition over all 38 tables

Independently recounted and confirmed by the ceremony's adversarial review: **38 = 12 ERASE + 4
ANONYMIZE + 5 JOIN-ONLY + 17 NOT-OWNED.**

**ERASE (row deleted outright)** — `monster`, `monster_pub`, `inventory`, `player_dialogue_state`,
`player_quest`, `player_conversation`, `heal_cooldown`, `player_wallet`, `playtest_event`,
`trade_offer`, `battle_challenge`, `battle_action`.

- `player_conversation` is **single-player NPC dialogue-progress state**, not player-to-player chat —
  no messaging system exists anywhere in this codebase. Any design predicated on chat is designing for
  a feature that does not exist.
- `trade_offer` / `battle_challenge`: only currently-**pending** rows can exist at cascade time —
  terminal rows are already deleted immediately (`server-module/src/schema.rs:645-656`, `:846`, each
  table's own doc comment). There is no history here to anonymize. Both identity columns are swept
  (`initiator`/`counterparty`; `challenger`/`target` — the latter closes the G6-manifest-flagged
  `battle_challenge.target` orphan hole directly).
- `playtest_event`: an identity-scoped **immediate** erase pass at cascade time. This is **distinct
  from, and must not duplicate**, the already-shipped independent `playtest_event` TTL/cap reaper
  (`server-module/src/playtest.rs:9-14,155-199`, ADR-0131). A row younger than its own TTL must not
  survive account deletion merely because the independent TTL has not hit yet. **Building a second
  retention reaper for this table would race the real one** — do not.
- `battle_action` is transient per-turn state keyed to a `battle_id`, not a history table.

**ANONYMIZE (row survives; identity/PII fields overwritten via PK-keyed `.update()`)** — `player`,
`profile`, `account`, `battle`.

- `player` — `name` → the tombstone constant. The row (PK = `identity`) **must** survive as the anchor
  that `character` and any still-live multi-user row point at.
- `profile` — `name` → tombstone. The row **must never be deleted**: ADR-0119 carries an explicit
  never-delete invariant, restated in the table's own doc comment. Anonymize is a field update, not a
  `.delete()`, so this is compatible **by construction**, not by exception.
- `account` — `auth_issuer` → null; `identity`/`created_at_ms`/`claimed_from`/`claimed_at_ms` retained
  (AUTH-29's invariant: a cancel-provenance chain must never read as un-claimed); terminal marker set
  per §4.
- `battle` — **the one genuinely necessary identity-swap-on-a-shared-row case.** Unlike `trade_offer`/
  `battle_challenge`, terminal `battle` rows demonstrably **persist** (settle updates, never deletes;
  GC is lazy), so a surviving opponent's `my_battle` view (ADR-0198) can still resolve a terminal row
  naming the deleted party months later. Swap the deleting party's `player_identity` **or**
  `opponent_identity` to a module-level `TOMBSTONE_IDENTITY` via the existing PK-keyed `.update()`
  pattern; leave the opponent's side and every mechanical field untouched.
  **Precedent for rewriting a non-PK indexed `Identity` column in place is `rekey_monsters`
  (`server-module/src/monster_mgmt.rs:113-133`)** — this is proven, shipped mechanics, not an open
  question. (`rekey_wallet`/`rekey_profile` demonstrate *PII-field tombstoning on a surviving row*, a
  different and separately-cited precedent — see §4/§5.)

**JOIN-ONLY (no direct `Identity` column; swept transitively at the owning parent's cascade step)** —
`character` (via `player.entity_id`), `battle_wild` (via `battle.battle_id`), `pvp_deadline_schedule`,
`battle_challenge_reaper_schedule`, `trade_offer_reaper_schedule`.

These are **structurally invisible** to `findIdentityColumns` — they have no `Identity` column to
derive from. They are pinned in a hand-maintained `JOIN_ONLY_TABLES: [{table, owner_via}]` array,
cross-checked by a proof-of-teeth fixture against this exact 5-table list, so a *known* hazard can
never silently drop out. A genuinely *new* join-only table added later depends on a reviewer adding
the entry — **named as an accepted residual (§9), the same class as this project's existing
`EXPECTED_VIEWS` allowlist**, not pretended to be solved.

`character` is erased and **sequenced before** `player`'s own tombstone field-write (`player` survives
as the anchor; `character` does not). `battle_wild` carries the raw RNG individuality seed and is
therefore additionally marked `exportable: false` (§5).

**NOT-OWNED (explicit registry entry with mandatory reason — never silent)** — 17 tables: `config`,
`guest_claim`, `guest_claim_reaper_schedule`, `zone_def`, `species_row`, `skill_row`,
`type_relation_row`, `item_row`, `shop_row`, `shop_item_row`, `encounter`, `evolution_path`, `npc`,
`heal_location_row`, `movement_tick_schedule`, `mr_heartbeat_schedule`, `playtest_reaper_schedule`.

- `config`'s `owner_identity` is a **zeroed singleton default, not a per-row key** — a naive "has an
  `Identity` column ⇒ per-player" heuristic wrongly nominates it, and a cascade that acts on it deletes
  global game config. Excluded **structurally** (the column participates in no
  `#[primary_key]`/`#[unique]`/`#[index]` identity-of-the-row role) **and** by a `basis` string required
  to contain the word `"singleton"`, grep-checked — so a future accidental promotion of
  `config.owner_identity` to an indexed column re-triggers a human decision rather than silently
  passing.
- `guest_claim` / `guest_claim_reaper_schedule`: these rows are consumed at claim time or reaped on a
  short TTL and **never coexist** with a claimed `account` row. A cascade keyed on `ctx.sender()`'s
  post-claim identity structurally cannot reach a pre-claim `guest_identity` row. Classifying these
  `ERASE` would imply a reachable row that provably cannot exist.

**Drift resistance:** classification lives on the manifest entries, keyed `table.column`. G6 already
proves this shape resists drift — `findIdentityColumns` re-derives from live source every run, so a
column rename or a new table surfaces as a manifest-key diff immediately, not as a stale doc.

## 4. The cascade — `delete_account`, grace window, reaper, and the three live holes it closes

### 4.1 No new enum variant — an additive column instead

`AccountStatus` stays exactly `{Active, PendingDeletion}` (`server-module/src/schema.rs:726-730`).
`Account` gains **one** additive field, appended at end of struct with `#[default(None)]`:

```
terminal_at_ms: Option<i64>
```

Terminal predicate: `status == PendingDeletion && terminal_at_ms.is_some()`.

**Why not a third variant:** `docs/adr/0174-essence-graph-schema-and-type-freeze.md:70` records that
enum-variant append is "presumptively frozen… treat as rejected until measured", and
`docs/adr/0197-spacetimedb-2.8.1-upgrade.md:253` confirms variant changes can force a **destructive
republish**. A plain `Option<i64>` column is unambiguously legal under ADR-0006's additive rule, needs
no repo-wide exhaustive-match audit, and carries the same information. (Whether enum-variant append is
in fact migration-safe remains an interesting measurement — filed as an optional follow-up in §9, **not
a blocker for this milestone**.)

### 4.2 `delete_account` — one appended step

The existing body (`server-module/src/accounts.rs:499-517`) is **unchanged in substance**: `has_jwt()`
→ `account().identity().find()` → `needs_deletion_write()` gate → `update(requested_deletion(...))`.
**One step is appended:** insert one `AccountDeletionReaperSchedule` row. AUTH-37
(`server-module/src/accounts_tests.rs:1949-1978`) pins only the *relative order of the first three
calls* and is unaffected by an appended fifth step.

The schedule-insert is placed **last**, after the status write, so a crash mid-reducer leaves
`PendingDeletion` + no schedule row — always safely re-driveable by a repeat `delete_account` (idempotent
per AUTH-28) or by `cancel_account_deletion`.

### 4.3 Grace window

`pub const DELETION_GRACE_MS_DEFAULT: i64` and `pub fn is_deletion_due(requested_at_ms: Option<i64>,
now_ms: i64) -> bool` live in a new `game-core/src/accounts/deletion.rs`, mirroring `CHALLENGE_TTL_MS`/
`is_challenge_stale`'s placement in `game-core/src/combat/pvp.rs` (ADR-0126 D2). **The signature takes
`Option<i64>`** — the real column type (`schema.rs:762`) — not a bare `i64`; a signature that cannot
accept `None` is proof the cancelled-account branch was never designed.

**The numeric value is an OPERATOR ESCALATION (§8.1), not an engineering default.** It ships with a
basis comment stating plainly: *"no sourced minimum for a comparable indie-scale service; arbitrary
default, operator may override."* The ceremony explicitly refused to bake in a figure borrowed from an
incomparable consumer service via a secondary source.

### 4.4 The reaper

```
AccountDeletionReaperSchedule {
    #[primary_key] #[auto_inc] scheduled_id: u64,
    scheduled_at: ScheduleAt,
    #[index(btree)] account_identity: Identity,
}
```

Private, colocated in `accounts.rs` (the ADR-0056 exception, mirroring `GuestClaimReaperSchedule`
exactly). Minimal field set per ADR-0126 D6 — **deliberately no timestamp field**, so staleness can
only derive from the live `account` row's own `deletion_requested_at_ms` plus the injected clock, never
from anything a caller could supply.

Scheduler-only guard, identical in shape to `accounts.rs:566-567`:
`if ctx.sender() != ctx.database_identity() { return Err(...) }`.

**Cascade order (load-bearing, gate-enforced by `[DEL-04]`):**

1. **Force-resolve every live interaction** by calling the codebase's own existing bundle, verbatim and
   in its existing order — verified live at `server-module/src/lib.rs:214-231`:
   ```rust
   trading::cancel_trades_on_disconnect(ctx, identity);
   pvp::forfeit_on_disconnect(ctx, identity);
   battle::resolve_wild_battle_on_disconnect(ctx, identity);
   pvp::cancel_challenges_on_disconnect(ctx, identity);
   ```
   These are factored into one `pub(crate) fn resolve_all_live_interactions(ctx, identity)` shared by
   **both** `on_disconnect` and the deletion reaper, so a future fifth call added to the bundle is
   picked up by both callers automatically.
   **Do not hand-roll a parallel wrapper set.** A hazard list built from the *table census* instead of
   the *`on_disconnect` dispatch* silently drops `resolve_wild_battle_on_disconnect` — and
   `server-module/src/battle.rs:1438-1459`'s own doc comment confirms *"no scheduled reaper covers the
   wild `battle`/`battle_wild` row class"*, so a deleted account's abandoned wild battle would be
   soft-locked forever. This is the single highest-value correction the ceremony's adversarial pass
   produced.
2. Erase every `ERASE`-policy row.
3. Anonymize every `ANONYMIZE`-policy row's identity/PII fields via `TOMBSTONE_IDENTITY`.
4. Sweep every `JOIN_ONLY` row transitively (`character` **before** `player`'s tombstone write).
5. Only after 1–4 complete without error: set `terminal_at_ms = Some(now)`.

### 4.5 Idempotency, re-entrancy, and the cancel race — closed twice over

**Disarm on cancel.** `cancel_account_deletion` (`accounts.rs:522`) gains an explicit disarm step:
collect-and-delete the pending schedule row via the `account_identity` btree index, mirroring the
*actual* ADR-0126 **D4** shape as implemented for guest-claim (`consume_claim_and_disarm`, called from
both `start_guest_claim` and `complete_guest_claim` — `accounts.rs:313/411/486`). Note D4 (every other
mutation site actively deletes a schedule row that would otherwise fire stale) is a **different clause**
from D6 (no self-disarm; the runtime deletes fired one-shot rows). Conflating them is how this branch
gets left undesigned.

**Reaper-side recheck.** The reaper additionally re-reads the live `account` row at fire time and
no-ops unless `status == PendingDeletion` **and** `terminal_at_ms.is_none()` **and**
`is_deletion_due(...)` is still true — mirroring `guest_claim_reaper`'s "consumed before TTL fired →
no-op" idiom (`accounts.rs:576-578`). This is deliberately **not** `battle_challenge_reaper`'s "no
status recheck" rule: that rule exists so TTLs *without* an external cancel path do not grow dead
branches. This TTL **has** an external cancel path, so the recheck is live logic, not a mutant magnet.

**Late cancel.** For the wall-clock-ordered case where the reaper's invocation has already committed,
`cancel_account_deletion` must **not** silently return `Ok(())` — it checks `terminal_at_ms.is_some()`
and returns a **distinct, user-visible error** ("this account has already been permanently deleted"),
so a client never renders "cancelled successfully" for a request that was too late.

**Partial/aborted cascade.** SpacetimeDB reducers are transactional under a single global write mutex
with serial execution, so a partially-completed cascade cannot persist *within* one invocation. The
design commits to **one reducer, one transaction per account** as the default — matching the `rekey_all`
precedent, which already proves a ~15-table single-transaction walk works. The *cross-invocation* risk
at real data volume is **escalated, not silently assumed safe (§8.4)**. The documented fallback, **not
built now (YAGNI)**, is a durable cursor committed by its own **prior** reducer invocation — never an
in-same-transaction progress marker, which reverts on abort by construction.

### 4.6 The `client_connected` reactivation hole — verified real, must be closed

`on_connect` (`server-module/src/lib.rs:205-211`, `#[spacetimedb::reducer(client_connected)]`) delegates
to `accounts::provision_or_touch_account` (`accounts.rs:349-383`), whose `Some`/`None` match at
`:369-381` does:

```rust
Some(existing) => { ctx.db.account().identity().update(touch_login(existing, now)); }
None           => { ctx.db.account().insert(new_account_row(...)); }
```

`touch_login` (`accounts.rs:153-163`) only stamps `last_login_at_ms` — it neither reads nor gates on
`status`. Since `Identity = f(iss, sub)`, the same real person re-authenticating with the same OAuth
account hits the `Some` branch and **silently reactivates a terminal-status row, with zero rejection and
zero gating.** The `Some` branch must check the terminal predicate. **Which behavior it takes is an
operator decision (§8.2)** — the two pre-drafted, mutually exclusive alternates are PRV1-8(a) and
PRV1-8(b) in §6; exactly one ships, the other is discarded (never a runtime branch).

### 4.7 `PendingDeletion` gameplay gating — mechanically complete, without vacuous allowlisting

Today the predicate `is_pending_deletion` (`accounts.rs:250-256` — whose own doc says *"reused… never
re-derived"*) is enforced in **exactly one place**, `complete_guest_claim`'s Guard 3
(`accounts.rs:438-441`). Every other gameplay reducer is unaware.

Extend it to `should_reject_for_deletion(account) -> bool`, true for both `PendingDeletion` and the
terminal state (§4.1) — the same predicate problem, so one predicate.

**The mechanical rule, and its one gate-checked exemption.** The naive rule "every reducer that writes a
registered table must call the gate first" self-contradicts on day one: `delete_account` writes
`account` and must succeed from `Active`; `cancel_account_deletion` writes `account` specifically *when*
the predicate is true (opposite polarity); the reaper writes `account` under a scheduler guard with its
own recheck. So:

- **Trigger predicate (explicit):** the scan covers **every reducer writing any table classified
  `ERASE`, `ANONYMIZE`, or `JOIN_ONLY` in the extended manifest** — not merely reducers writing
  `account`. Anything narrower leaves the gameplay half hand-wired, which is the thing this rule exists
  to prevent.
- **Exemption class:** `STATE_TRANSITION_OWNERS: &[&str] = ["delete_account", "cancel_account_deletion",
  "account_deletion_reaper"]`, exported from `game-core` alongside the cascade-table list, and **itself
  gate-checked** — a new reducer writing a manifest-classified table with neither the gate call nor
  membership in this list is a hard CI failure. The exemption list is not an unchecked ad-hoc allowlist;
  it is a declared, enforced part of the contract.

**Which reducers get the gate in practice** (derived by the rule, not hand-listed): trade propose/accept,
battle/PvP challenge start and accept, PvP action submission, shop buy/sell if in scope.

**The gate rejects NEW commitments only.** It does not retroactively void in-flight state — that is
handled by §4.4 step 1's force-resolve at actual cascade time. "Don't boot a live game, just stop new
ones" is uncontested across every ceremony candidate that addressed it.

## 5. Export

**Mechanism.** A private, owner-keyed `export_bundle` table populated by a reducer
`request_data_export(ctx)` that walks the **same** extended manifest filtered to `exportable: true`, plus
an owner-scoped view `my_export_bundle` — the ADR-0194/0198 idiom, where the private table plus the
`filter(ctx.sender)` view **body** is the entire security boundary (`public` on a view attribute is
inert). Assembling JSON into a DB row the client already subscribes to is **not network egress**, so
this stays inside ADR-0180 D1 ("the module never times/exports itself") and cleanly sidesteps the
un-re-adjudicated Procedures question (ADR-0197 FF4) rather than implicitly deciding it.

**`exportable` is a third, orthogonal axis — not a synonym for the deletion policy.** Export scope must
be *structurally narrower* than deletion scope: `battle_wild.individuality_seed` (a must-never-leak RNG
seed) and `guest_claim.code` (a secret) would both be present in a literal "iterate the registry, dump
every matched row" export. Both carry `exportable: false`, and `[DEL-05]` enforces the divergence
positively (the cascade body references the table's identifier; the export body must **not**).

**Third-party redaction — narrow and precise.** `battle` and `battle_action` are the only genuinely
**private** multi-user tables, so export redacts the counterparty's identity/private state on those two
only. `trade_offer`, `battle_challenge`, `player`, and `profile` are **already `public` tables** any
client can subscribe to today — redacting them in an export defends data the requester already holds
through ordinary subscription. That is theatre, and it is cut. (Designing redaction for
"counterparty-authored free text" is likewise cut: it defends a chat feature this codebase does not
have.)

**Chunking — required, because of how views actually behave.** Views carry **no primary key** in the
generated bindings, `onUpdate` **never fires**, and the client reconciles from the SDK cache at batch
flush (ADR-0194 :78-87, ADR-0198 D4/D5). A single unbounded `payload_json` blob would force a full-row
re-diff of an ever-growing string on every subscription update. So `export_bundle` is chunked **by
source table**: one row per `(owner_identity, request_id, table_name)` with `chunk_index`/`total_chunks`
fields; a table whose own per-owner row count is large sub-chunks at a fixed row-count boundary (e.g.
500 rows/chunk) using the same fields. The client waits for `chunks.length === total_chunks` before
assembling the downloadable JSON. A TTL reaper on `export_bundle` (7 days, same shape as the deletion
reaper) prevents the export snapshot becoming an unretained second copy of the same personal data.

**A large export request carries the identical unverified-at-scale transaction-size risk as the cascade
(§8.4)** — the same escalation covers both.

## 6. Retention & no-PII-in-logs — what is genuinely missing

**Already ships — do NOT re-propose:** the `mr_log` wrapper (`server-module/src/observability.rs`,
ADR-0180 D6); D12's rule (no player-authored text in any log line, metric label, or trace attribute;
`sender` hex only in WARN/ERROR *lines*, never as a Prometheus/Loki *label*); gate G1
(`evals/observability-log-wrapper.eval.mjs`); `evals/client-no-pii-logs.eval.mjs`; and
`evals/account-privacy.eval.mjs`'s `checkNoPiiInRejectLogs` full taint-tracking closure over
JWT-claim-bound locals. **Also already ships:** `playtest_event` retention (`playtest.rs:9-14,155-199`,
ADR-0131) — see §3.

**Genuinely new work:**

1. Extend the existing taint-tracker's **seed field set** to cover the new deletion-related fields
   (`name`, `auth_issuer`, the pre-tombstone values) so a rename cannot launder a leak through the
   reaper/cascade/export reject paths. Extend the strong existing checker; do not build a second, weaker,
   purely-textual one.
2. **The deletion-event-log trap** — the single most common real-world mistake in this class: a
   "helpful" debug line emitted *at the moment of deletion* that logs the very name/issuer being erased.
   `delete_account`, `cancel_account_deletion`, and the reaper's log call sites get explicit, named
   scrutiny in the taint-tracker's file list (PRV1-20).
3. The identity-scoped immediate `playtest_event` erase pass at cascade time (§3) — a gap in *coverage*,
   not missing retention infrastructure.

## 7. Slices, acceptance criteria (EARS), and the eval

### 7.1 The deletion-completeness eval

`evals/deletion-completeness.eval.mjs` — a **new file**, auto-discovered by `evals/run.mjs`'s filename
convention (`readdir` + `.eval.mjs` filter); **no wiring edit, and no slice edits `evals/run.mjs`.** It
imports `findIdentityColumns`/`parseTableSchemas`/`stripRustSource`/`REKEY_MANIFEST` from the S0 export
surface rather than reimplementing the walker.

Tagged check functions:

| Tag | Check |
|---|---|
| `[DEL-01]` | every column `findIdentityColumns` derives carries a `deletion_policy` entry with a non-empty `basis` |
| `[DEL-02]` | `JOIN_ONLY_TABLES` equals, as a sorted set, the pinned 5-table hazard list (`character`, `battle_wild`, `pvp_deadline_schedule`, `battle_challenge_reaper_schedule`, `trade_offer_reaper_schedule`) |
| `[DEL-03]` | `config`'s `basis` contains `"singleton"`; a `config`-shaped struct with a real index on `owner_identity` fails as ambiguous |
| `[DEL-04]` | the reaper's cascade body references every `ERASE`/`ANONYMIZE` table's identifier at least once, **and** `resolve_all_live_interactions(` precedes the first erase/anonymize call, **and** the `character` join-delete precedes `player`'s tombstone `.update()` |
| `[DEL-05]` | `request_data_export`'s body references every `exportable: true` table and **excludes** every `exportable: false` table |
| `[DEL-06]` | a reducer writing any manifest-classified (`ERASE`/`ANONYMIZE`/`JOIN_ONLY`) table with neither the gate call nor `STATE_TRANSITION_OWNERS` membership fails |

`[DEL-04]` is deliberately a **per-table presence + ordering** check, **not one giant literal-string body
pin**. At ~19 table calls a single literal pin trains reviewers to reflexively re-bless every future
diff — the exact vacuous-gate failure that `account-privacy.eval.mjs`'s *one-line* `SANCTIONED_BODY`
precedent does not suffer at its scale.

**BAD proof-of-teeth fixtures**, each firing its specific tag: a table with a real `Identity` column and
no manifest entry (`[DEL-01]`); a decoy join-only table absent from `JOIN_ONLY_TABLES` (`[DEL-02]`); a
`config`-shaped struct with a real index and no `"singleton"` basis (`[DEL-03]`); a cascade body whose
delete helper sits under a dead `if false` branch (`[DEL-04]` — presence-only would false-pass); an
export body that includes `battle_wild`'s seed field (`[DEL-05]`); a reducer writing a classified table
with neither gate nor exemption (`[DEL-06]`).

**GOOD hostile-but-correct fixture:** a new table with an `Identity` column, deliberately named to sort
alphabetically adjacent to an excluded table, correctly carrying every required manifest field — must
pass every check, proving the gate is not vacuously green.

**Idiom compliance (mandatory):** reuse `stripRustSource` (never `new RegExp` — a Semgrep
`detect-non-literal-regexp` rule bans it); call `assertStripperSound` **per file**, never on a
concatenated blob; fail-loud non-vacuity (every checker asserts its target was found before asserting
properties of it).

### 7.2 Slices

Dependency spine: **S0 → S1 → S2 → S3 → {S4 ‖ S5} → {S6 ‖ S7} → S8 → S9.**

| Slice | Scope | `touches:` | `after:` |
|---|---|---|---|
| **S0** | Contract-first. Export `REKEY_MANIFEST`/`findIdentityColumns`/`parseTableSchemas` (or lift to `evals/rekey-registry-shared.mjs` if the file is near a split threshold — check first). Fix `mr-state.json`'s `adr_next_free` drift (0204 → 0205). | `evals/guest-claim-integrity.eval.mjs` (export surface only), `mr-state.json` | — |
| **S1** | game-core deletion rules: `DELETION_GRACE_MS_DEFAULT` + basis comment, `is_deletion_due(Option<i64>, i64) -> bool`, `TOMBSTONE_IDENTITY`, `STATE_TRANSITION_OWNERS`. | `game-core/src/accounts/deletion.rs` (new) | S0 (naming only) |
| **S2** | Schema + manifest extension: `deletion_policy`+`basis`+`exportable` per §3; `Account.terminal_at_ms: Option<i64>`; `AccountDeletionReaperSchedule`; `export_bundle`. All additive (ADR-0006). | `server-module/src/schema.rs`, `server-module/src/accounts.rs` (manifest region only) | S1 |
| **S3** | Cascade + reaper + cancel-disarm + reactivation guard. Extend `delete_account` (append schedule-insert); `cancel_account_deletion` (disarm + distinct terminal error); new `account_deletion_reaper`; `provision_or_touch_account`'s `Some` branch gains the terminal check. | `server-module/src/accounts.rs` (reducer bodies), `server-module/src/lib.rs` (`resolve_all_live_interactions` extraction) | S2 |
| **S4** | Export: `request_data_export`, `my_export_bundle` view, chunking, `export_bundle` TTL reaper. | `server-module/src/privacy.rs` (new — do NOT append to `accounts.rs`; check its size against the M8.9 split threshold first) | S3 ‖ S5 |
| **S5** | Gameplay gating fan-out (internally parallel, N≤3). | `server-module/src/trading.rs` ∥ `server-module/src/pvp.rs` ∥ `server-module/src/guards.rs` | S3 ‖ S4 |
| **S6** | Evals. | `evals/deletion-completeness.eval.mjs` (new), `evals/pending-deletion-gate.eval.mjs` (new), `evals/account-privacy.eval.mjs` (seed-set extension only) | S2 ‖ S7 |
| **S7** | Runbook: pinned `## Data deletion & backup retention` section + a new structural-scan phase. | `docs/observability-dr-runbook.md`, `evals/account-e2e.eval.mjs` (new phase) | S3 ‖ S6 |
| **S8** | Client: deletion/cancel UX with grace countdown, export download + chunk assembly. | `client/**` | S3+S4+S5 merged, bindings regenerated |
| **S9** | Post-integration verification (below). | — | all |

**S3 is the largest, highest-risk single-file slice in the set** and is deliberately non-parallelizable.
It warrants an explicit internal sub-review checkpoint before it merges.

**Per-slice eval files are mandatory** (each slice owns its own new eval file; shared suites are never
edited). **Fan-out eligibility:** S2 changes schema → always-serial, never paired. S0 edits a shared eval
file → WARN, declare it and let the supervisor reconcile.

### 7.3 Post-integration verification (S9 — the milestone's real DoD)

Parallel slices passing in isolation does **not** prove they work together. After all slices merge
(serial, verifier-gated, each rebased on the merged predecessors): full `just ci` green-and-meaningful ·
`bindings-drift = 0` · schema-snapshot intact · plus a live e2e extending `account-e2e.eval.mjs`'s
existing 3-phase pattern — seed a fully-loaded account (open trade, active PvP challenge, wild battle in
progress, monsters, wallet, dialogue, quests, >500 `playtest_event` rows) → `delete_account` → advance
the injected clock past the grace window → fire the reaper → assert every classified table is erased,
anonymized, or reachable only via a still-live parent → assert `cancel_account_deletion` now returns the
distinct terminal error → assert the multi-chunk export assembles correctly.

Cross-slice contracts that must be named and tested after integration: the extended manifest's shape
(S0↔S2↔S6), `resolve_all_live_interactions`'s signature (S3↔`lib.rs`'s `on_disconnect`),
`should_reject_for_deletion`'s signature (S1↔S5), `export_bundle`'s chunk fields (S2↔S4↔S8), and the
regenerated bindings (S2/S3/S4↔S8).

### 7.4 EARS acceptance criteria

**S2/S3 — core cascade**
- **PRV1-1:** WHEN `delete_account` is called by an authenticated identity with `account.status == Active` THE SYSTEM SHALL transition `status` to `PendingDeletion`, set `deletion_requested_at_ms`, and insert exactly one `AccountDeletionReaperSchedule` row for that identity.
- **PRV1-2:** WHEN `delete_account` is called by an identity already in `PendingDeletion` THE SYSTEM SHALL write nothing and return `Ok(())`.
- **PRV1-3:** WHEN `cancel_account_deletion` is called by an identity in `PendingDeletion` whose `terminal_at_ms` is `None` THE SYSTEM SHALL transition `status` to `Active`, clear `deletion_requested_at_ms`, preserve `claimed_from`/`claimed_at_ms`, and delete that identity's pending `AccountDeletionReaperSchedule` row.
- **PRV1-4:** WHEN `cancel_account_deletion` is called by an identity whose `terminal_at_ms` is `Some` THE SYSTEM SHALL reject with a distinct, non-generic error and SHALL NOT reactivate the account.
- **PRV1-5:** WHEN the deletion reaper fires for a schedule row whose account is no longer `PendingDeletion`, already terminal, or not yet due THE SYSTEM SHALL no-op without running the cascade.
- **PRV1-6a:** WHEN the reaper's cascade runs for a due account THE SYSTEM SHALL force-resolve every live trade, battle, and challenge for that identity via `resolve_all_live_interactions` **before** any row is erased or anonymized.
- **PRV1-6b:** WHEN the reaper's cascade runs for a due account THE SYSTEM SHALL delete every `ERASE`-policy row owned by that identity.
- **PRV1-6c:** WHEN the reaper's cascade runs for a due account THE SYSTEM SHALL overwrite every `ANONYMIZE`-policy row's identity/PII fields with the tombstone constant, leaving the row's primary key and non-identity fields otherwise intact.
- **PRV1-6d:** WHEN the reaper's cascade runs for a due account THE SYSTEM SHALL delete every `JOIN_ONLY`-policy row reachable via its pinned parent join.
- **PRV1-6e:** WHEN PRV1-6a through PRV1-6d have completed without error THE SYSTEM SHALL set `terminal_at_ms` to the current time, and SHALL NOT set it otherwise.
- **PRV1-7:** WHEN a reducer writes any manifest-classified (`ERASE`/`ANONYMIZE`/`JOIN_ONLY`) table and is not in `STATE_TRANSITION_OWNERS` THE SYSTEM SHALL require a preceding `should_reject_for_deletion` guard call (CI-enforced, `[DEL-06]`).
- **PRV1-19:** WHEN the cascade anonymizes a `battle` row whose `player_identity == opponent_identity` (a practice battle) for the deleting identity THE SYSTEM SHALL visit and tombstone that row exactly once, not twice.

**S3 — reactivation.** Exactly ONE of the following ships, per the operator's §8.2 ruling; the other is
discarded, never a runtime branch. This criterion is **BLOCKED pending that ruling** and must not be
built from until it is resolved.
- **PRV1-8(a)** *(if the operator rules "permanent reject")*: WHEN `provision_or_touch_account` is reached for an identity whose account is terminal THE SYSTEM SHALL reject the connection with `REJECT_ACCOUNT_DELETED` and SHALL NOT create or update an `account` row.
- **PRV1-8(b)** *(if the operator rules "allow fresh re-registration")*: WHEN `provision_or_touch_account` is reached for an identity whose account is terminal THE SYSTEM SHALL reset that identity's `account` row to `Active` with every field at `new_account_row` defaults except `identity`/`auth_issuer`, and SHALL NOT carry forward any pre-deletion field value.

**S5 — gameplay gating**
- **PRV1-9:** WHEN a reducer that opens a new trade, battle, or challenge commitment is called by an identity for which `should_reject_for_deletion` is true THE SYSTEM SHALL reject the call before any write.
- **PRV1-10:** WHEN an identity in `PendingDeletion` has an already-live battle, trade, or challenge THE SYSTEM SHALL NOT force-terminate it at request time.

**S4 — export**
- **PRV1-11:** WHEN `request_data_export` is called by an authenticated identity THE SYSTEM SHALL write one `export_bundle` chunk per `exportable: true` table containing only that identity's own rows.
- **PRV1-12:** WHEN a table is marked `exportable: false` THE SYSTEM SHALL NOT include that table's data in any `export_bundle` chunk.
- **PRV1-13:** WHEN a single owner's per-table row count exceeds the sub-chunk boundary THE SYSTEM SHALL split that table's payload across multiple chunks sharing one `request_id` with a stable `total_chunks`.
- **PRV1-14:** WHEN an `export_bundle` chunk is older than its TTL THE SYSTEM SHALL delete it via the export reaper.

**S6 — completeness gate**
- **PRV1-15:** WHEN a new `#[spacetimedb::table]` with a direct `Identity` column is added to any scanned source file without a `deletion_policy` + non-empty `basis` manifest entry THE SYSTEM SHALL fail CI (`[DEL-01]`).
- **PRV1-16:** WHEN a registered `ERASE`/`ANONYMIZE` table's delete/update call is removed from the reaper's cascade body, OR moved behind an always-false or otherwise unreachable branch, THE SYSTEM SHALL fail CI (`[DEL-04]`).

**S7 — logs & runbook**
- **PRV1-17:** WHEN `delete_account`, `cancel_account_deletion`, or the deletion reaper emits a log line THE SYSTEM SHALL NOT include any player-authored field in that line.
- **PRV1-18:** WHEN the DR runbook is missing or its `## Data deletion & backup retention` section is reworded THE SYSTEM SHALL fail CI.
- **PRV1-20:** WHEN `delete_account`, `cancel_account_deletion`, or the deletion reaper emits any log line at the moment of erasure or anonymization THE SYSTEM SHALL NOT include the erased identity's pre-tombstone `name` or `auth_issuer` value in that line.

## 8. Operator escalations (BLOCKER discipline — route via `mr-ask-drew`)

Per the 2026-08-23 authorization, starting the ceremony did not authorize skipping a decision found
along the way. Five items require the operator; each names the options and a recommendation.

1. **`DELETION_GRACE_MS` and the backup-retention TTL — the actual numbers.** No sourced basis exists in
   this repo or in either research library, and the ceremony explicitly refused to bake in a figure
   borrowed from an incomparable consumer service via a 403'd secondary source. **Recommendation:** ship
   the placeholder with the honest basis comment; the operator picks the number. Do not let this
   milestone silently encode a legal-sounding figure nobody chose deliberately.
2. **`provision_or_touch_account` reactivation policy for a terminally-deleted identity** — (a) permanent
   reject, or (b) allow fresh re-registration under the same OAuth identity with all game data gone. A
   real product tradeoff with zero repo precedent. **Recommendation: (b)**, consistent with the terminal
   marker's own justification (audit + trap-state prevention, not banning) — but this is the operator's
   call. **Blocks PRV1-8 and slice S3's reactivation guard.**
3. **Cascade transaction-size at real account-age/data volume.** `rekey_all` proves the *shape* of a
   single-transaction multi-table walk works at guest-claim scale; it does not prove it at a multi-year
   account's full `playtest_event`/`monster`/`inventory` volume. A real volume estimate is needed before
   "one reducer, one transaction, no fallback" is committed as final. The same risk applies to a large
   export request (§5).
4. **Export delivery/discoverability beyond "a chunked table the client subscribes to"** — whether a UI
   notification, a dedicated download affordance, or more is expected. Product scope; this design
   deliberately keeps it minimal.
5. **The pseudonymization-not-erasure residual and the backup limitation (§9.1, §9.2)** need explicit
   operator acknowledgement before any user-facing copy is written, since the honest engineering position
   is narrower than what "delete my account" ordinarily implies to a player.

**Decided by the ceremony, explicitly NOT escalated** (recorded so they are not re-litigated): the
tombstone shape (one shared sentinel, not per-account — almost nothing survives to be tombstoned once
`trade_offer`/`battle_challenge` are erase-only and `battle` is the sole anonymize target); scheduled
reducer over Procedure for the reaper (M22 must not implicitly decide the un-re-adjudicated ADR-0180
D14–D18 question); `guest_claim`'s classification (resolved by direct evidence, not judgment); and the
`AccountStatus` variant question, which is **dissolved** rather than escalated by §4.1's additive column.

## 9. Non-goals, residual risks, accepted limitations

**YAGNI — cut with no dissent across the ceremony:** jurisdiction-specific legal text / DPA machinery ·
a ban or reputation system (no such table exists anywhere in the repo, so any design defending against
ban-evasion defends nothing) · per-field encryption at rest · a generic PII taxonomy beyond the four
buckets · export format negotiation beyond JSON · an admin deletion-review UI (runbook + existing CLI
tooling suffices) · per-jurisdiction configurable retention windows · a redacting bench-visibility
projection view for LIVE battles (ADR-0198's accepted residual stands, and is materially smaller than it
looks once §4.4's force-resolution runs before erasure) · `playtest_event`'s write-time
rotating-pseudonym redesign (a genuinely good idea, but it is an M20/observability instrumentation
decision, and it does not solve the already-written-rows problem M22 actually has) · server-initiated
export delivery (email/S3), which stays gated on the standalone Procedures re-adjudication this
milestone does not decide.

**Residual risks — stated, not hidden:**

1. **Pseudonymization, not erasure.** **Required exact language, to be used verbatim in the ADR, commit
   messages, and any UI copy — the word "erasure" must never be used for this:** *"Direct name/display
   fields are severed on deletion. The `Identity` key and its associated timestamps/behavioral history
   are not purged from multi-user or historical rows; this is a documented, accepted pseudonymization
   limitation, not erasure."*
2. **Host backups/WAL are outside the module's reach — for the entire cascade, not just logs.**
   **Required exact language:** *"Deletion is guaranteed for the module's live queryable state within
   `DELETION_GRACE_MS` of the request. Host-level backups, snapshots, and WAL are outside the module's
   reach; point-in-time recovery can restore deleted data until the operator's backup-retention window
   elapses. This module makes no claim about backup or replica state."* This sentence is **pinned and
   exact-body-checked** in the DR runbook (S7, PRV1-18) — prose nobody re-reads is not a control.
3. **`JOIN_ONLY_TABLES` is a pinned, hand-maintained list, not a fully derived one.** A genuinely new
   join-only-owned table (no `Identity` column, ownership only via a foreign-key-shaped id) is caught
   only if a reviewer adds it — the same accepted-residual class as this project's existing
   `EXPECTED_VIEWS` allowlist. Named, not pretended away.
4. **Cascade transaction-size at scale is unverified** — escalated (§8.3). The documented fallback (a
   durable, prior-transaction-committed cursor) is not built until a measurement shows it is needed.
5. **Optional follow-up, not a blocker:** measure whether SpacetimeDB's migration checker actually
   treats enum-variant append as additive-safe. §4.1 routes around the question entirely with a plain
   additive column, so nothing in this milestone depends on the answer.

---

## 10. Ceremony input of record — the original sketch (preserved verbatim, 2026-08-23)

> # Sketch: M22 — Privacy, data deletion & compliance
>
> **Status:** design sketch (provisional) · **Phase D** · **Decision:** ADR-0031 (builds on 0030).
>
> > Provisional sketch — EARS criteria + tasks deferred to build time.
>
> ## Problem / intent
> A defensible **data-lifecycle** story for user data (names, chat, social graph, profiles): right-to-be-
> forgotten, data export, retention — done **mechanically** so a new table can't silently retain PII.
>
> ## Scope (condensed)
> - **Deletion cascade:** `delete_account` (the M21 hook) **erases** purely-personal rows and **anonymizes**
>   shared records to a tombstone (a deleted user's old chat shows "deleted user", others' views/integrity
>   hold) — one audited operation, identity from `ctx.sender`.
> - A **registry of owner-keyed tables** is the SSOT for the cascade + a **deletion-completeness eval** (a new
>   owner-keyed table not wired in fails the build — proof-of-teeth).
> - **Data export** (owner-scoped, machine-readable); **retention** windows for chat/logs (a scheduled reaper);
>   **no PII in logs** (the ADR-0029 rule, enforced).
> - **Out of scope:** jurisdiction-specific legal text/DPA/ToS (legal, not engineering — this provides the
>   mechanisms).
>
> ## Key design + boundary
> The registry turns "delete all my data" from discipline into a mechanical, eval-gated property. **→ M25** the
> privacy/deletion surface is part of the threat model + audit.
>
> ## Risks / decisions
> Incomplete deletion → registry + completeness eval. Erase vs anonymize → erase personal, anonymize shared.
> Export leaks another user → owner-scoped + fixture.
>
> ## Recency check (2026-08-23, review pass — ceremony AUTHORIZED, PLAN.md §9)
>
> This sketch's premise ("the M21 hook") is **confirmed real, not speculative** — M21a/b/c are merged.
> `server-module/src/accounts.rs` already implements `delete_account` with a two-call gated
> grace-window/`PendingDeletion` state machine (AUTH-28/AUTH-37 proof-of-teeth in `accounts_tests.rs`), and
> `schema.rs:722` carries its own forward-reference: `// M22 extends delete_account's body with the grace
> window + cascade.` Cite the real reducer and its current signature at ceremony time instead of designing
> the hook fresh. The **owner-keyed-tables-registry + deletion-completeness-eval** idea (this sketch's central
> mechanism) now has two direct implementation precedents to model against rather than invent from scratch:
> **ADR-0194** (`monster_pub` — private table + owner-scoped `my_monster_pub` view) and **ADR-0198**
> (`battle` — private table + two-identity `my_battle` view); both establish the private-table-plus-scoped-
> view idiom this project already uses for "who can read this row," which is the same shape a deletion/export
> registry needs for "who owns this row." The "no PII in logs" rule cites `ADR-0029` (harness design ADR,
> still the intent-of-record) — M20's own no-PII logging discipline landed as `ADR-0180`
> (`mr_log`/observability stack); cross-reference both at build time rather than only the original design
> ADR. Per the 2026-08-23 unstable-feature policy ruling (`mdrewt/monster-realm#342`), consider whether a
> now-stable 2.8.1 feature (e.g. scheduled Procedures, stable since ADR-0197 FF4) is a genuinely better fit
> for the retention-window reaper than the existing scheduled-reducer pattern — not a mandate, just a live
> option to weigh during ideation. Scope, out-of-scope framing, and the M25 boundary are otherwise unaffected.

**Ceremony corrections to the sketch's own premises** (each verified live, recorded so the drift is
auditable):

- *"a deleted user's old chat shows 'deleted user'"* — **there is no chat system.** `player_conversation`
  is single-player NPC dialogue-progress state. Any anonymization design predicated on chat is designing
  for a feature that does not exist.
- *"retention windows for chat/logs (a scheduled reaper)"* — `playtest_event` retention **already ships**
  (ADR-0131). The genuine gap is an identity-scoped **immediate** erase pass at cascade time, not new
  retention infrastructure.
- *"model the registry on ADR-0194/0198"* — those establish the read-scoping idiom correctly (and are used
  for the export view in §5), but the **closer** precedent, discovered during investigation, is
  `rekey_all` + the G6 `REKEY_COMPLETENESS` manifest, whose own text names M22 as its consumer (§1).
- *"the `mdrewt/monster-realm#342` unstable-feature ruling"* — the issue itself could not be located in
  either repo's corpus; `PLAN.md` §9 is its only record here. The ruling was nevertheless honored: the
  Procedures option was weighed for the reaper and the export path and **rejected on its merits** (§5,
  §8), not avoided reflexively.

## 11. Notes for the runner

- The ceremony's full working corpus (investigation dossier, 6 candidates, 6 adversarial refinements,
  judge synthesis + attribution table, synthesis review) is **not** committed — it was session-scratch.
  This spec is its distilled, reviewed output and is the artifact of record.
- Build order is the §7.2 spine. **S2 is a schema change → always-serial, never paired.** S0 edits a
  shared eval file → declare it as a WARN and let the supervisor reconcile.
- **PRV1-8 is BLOCKED** on operator escalation §8.2. S3 can be built up to but not including the
  reactivation guard; do not guess the policy.
- Do not re-derive any of §3's classification from scratch — it is exhaustive over all 38 tables and was
  independently recounted during the adversarial review. If a table is added between now and build time,
  add its entry; do not re-partition.
