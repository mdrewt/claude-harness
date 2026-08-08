# M21a Build Plan — Accounts/auth structural spine

**Tier:** HARD (security-critical). **Slice shape:** SERIAL, no sibling. **Package name is `monster-realm-module`, not `server-module`** (`server-module/Cargo.toml:2`) — `cargo clippy -p server-module` fails; use `-p monster-realm-module` or `just ci-fast monster-realm-module`.

---

## 0. STOP-THE-LINE finding — the `has_jwt()` premise may be false, and if it is, M21a as specified bricks the game

Everything in D4/AUTH-1/AUTH-7/AUTH-12/AUTH-37 rests on one unverified premise: **"anonymous SpacetimeDB connection ⟺ `ctx.sender_auth().has_jwt() == false"`**. The repo does not verify this and the ADR does not cite evidence for it.

Evidence that it is probably **false**:
- SpacetimeDB's own identity credential *is* an OIDC-shaped JWT (`Identity = f(iss, sub)`, `spacetimedb-lib-1.12.0/src/identity.rs:196`). The host mints one for an anonymous connection and hands it back as an `IdentityToken` message.
- `client/src/net/authToken.ts` persists that credential and replays it via `.withToken(...)` on **every** reconnect (ADR-0150, unchanged by D8.1).
- `AuthCtx::from_connection_id` → `rt::get_jwt(connection_id)` (`spacetimedb-1.12.0/src/rt.rs:1146`) returns whatever JWT the host associated with the connection — the host-minted anonymous token included. `has_jwt()` is `self.jwt.is_some()` (`lib.rs:1500-1502`).
- The vendor's "Restricting auth providers" pattern exists precisely because a validly-signed token from an *unwanted* issuer otherwise passes — including the host's own.

**Consequence if true, under the spec as written:** first-ever tab (empty sessionStorage, no `Authorization` header) → no JWT → `Ok` → works. Every reload/reconnect thereafter → SpacetimeDB-minted JWT → `iss` not in `ALLOWED_ISSUERS` → `Err` → **client disconnected**. Additionally `start_guest_claim` (AUTH-7 rejects *any* JWT holder) becomes permanently unreachable, so the entire guest-claim feature is dead code. This is a total outage that a single fresh-tab smoke test would not catch.

### 0.1 Mandatory pre-implementation probe (blocks task T3)
Before the implementer writes `provision_or_touch_account`:
1. `spacetime start`; `MR_SMOKE_DB=mr-authprobe just publish` (or a scratch module) with a temporary `client_connected` that logs only `has_jwt()` and, when `Some`, `claims.issuer()`.
2. Connect twice from the client: (a) with `sessionStorage` cleared, (b) after a reload (token replayed).
3. `spacetime logs mr-authprobe`. Record both outcomes in the ADR-0179 evidence log.

Cost ≈ 10 minutes. It decides urgency, not design — the design below is fail-safe either way.

### 0.2 Design correction (recommended, ratify before implementing)
Two amendments, both of which *strengthen* the stated security properties:

**D1′ — an unrecognized issuer/audience must NOT disconnect.** `provision_or_touch_account` returns `Ok(())` with **no `account` row** when the issuer or audience is not allowlisted, and logs `guards::log_reject("client_connected", ctx.sender, "unrecognized issuer")` / `"unrecognized audience"` (static literals, AUTH-36). The load-bearing half of AUTH-2/AUTH-3 — *"SHALL NOT insert an `account` row"* — is preserved exactly. The disconnect half is dropped because it cannot distinguish a hostile token from the host's own anonymous credential, and getting that wrong costs the whole player base. **Needs a one-line AUTH-2/AUTH-3 amendment** in the spec: replace "*SHALL return `Err` (disconnecting the client)*" with "*SHALL return `Ok` without provisioning an `account` row, leaving the connection anonymous*". *(Rejected alternative: a third `ANONYMOUS_ISSUERS` constant carrying the host's issuer — it varies per deployment (localhost / maincloud / custom domain), so a config typo re-creates the outage; it re-introduces exactly the fragility D1′ removes and OQ1 does not cover it.)*

**D4′ — "is this an account holder?" is an `account`-row question, never a `has_jwt()` question.** Add the SSOT predicate

```rust
pub(crate) fn is_account_holder(ctx: &ReducerContext, identity: Identity) -> bool
// ctx.db.account().identity().find(identity).is_some()
```

and use it as the load-bearing gate in `start_guest_claim` (AUTH-7), `complete_guest_claim` (AUTH-12), `delete_account` (AUTH-37) and `cancel_account_deletion`. `has_jwt()` keeps exactly one job: `on_connect`'s first-statement early return (AUTH-1 / G3), where it is harmless in both worlds. Only a verified allowed-issuer JWT can ever produce an `account` row, so the predicate is *strictly more precise* than `has_jwt()` and is robust to the probe's outcome. D7's reasoning survives unchanged and gets cleaner: only an `account` row can be `PendingDeletion`, and AUTH-7 rejects account holders, so `start_guest_claim` still needs no `PendingDeletion` check.

Every AUTH criterion remains satisfiable; the reject *messages* change from "sign in required" to "no account" semantics where noted below.

---

## 1. Conflicts between spec/ADR and repo reality — decisions

| # | Conflict | Decision |
|---|---|---|
| C1 | Spec §4 + ADR-0179 D2 put `GuestClaimReaperSchedule` in `schema.rs` and `guest_claim_reaper` in `lib.rs`. All five existing scheduled tables colocate with their reducer (`movement.rs:37`, `pvp.rs:62`, `pvp.rs:101`, `playtest.rs:32`, trading.rs) per the ADR-0056 exception documented at `schema.rs:8-10`. | **Colocate `GuestClaimReaperSchedule` + `guest_claim_reaper` in `accounts.rs`.** The path form *is* compilable (`ScheduledArg.reducer_or_procedure: syn::Path`, `spacetimedb-bindings-macro-1.12.0/src/table.rs:43`; the expansion needs the name in both the type and value namespaces, and `#[spacetimedb::reducer]` emits `#vis struct #func_name` alongside the fn — `reducer.rs:145`), so `scheduled(crate::accounts::guest_claim_reaper)` in `schema.rs` would build. **Reject it anyway:** every gate that reads the schedule name does `take_while(is_word_char)` after `scheduled(` (`evals/no-idle-accrual.eval.mjs:484-512`, `evolution_tests.rs:2610-2650`) and would extract the literal string `crate`, silently blinding those scans. Colocation keeps a bare ident, keeps `schema.rs` free of domain-module imports, and matches five precedents. **`account`, `AccountStatus`, `GuestClaim` and the `my_account` view stay in `schema.rs`** (G1 reads `schema.rs`). `touches:` is unchanged (both files already listed); `lib.rs` loses the reaper but keeps `on_connect` + `mod accounts;`. **Spec correction:** one line in §4 and D2. |
| C2 | AUTH-20 pins the reject string `"already has game data"`; ADR-0179 D5 guard 3 says `"claim your guest progress before you start playing."` | Ship **`"already has game data"`** (the EARS criterion is the testable contract). D5's phrasing is UX prose, rendered client-side in M21b. One-line ADR clarification. |
| C3 | ADR-0179 D6: "`consume_claim_and_disarm` — the same helper the expiry-reaper path (AUTH-27) already uses". A one-shot `ScheduleAt::Time` row is deleted **by the runtime** after the reducer returns; self-deleting races it (`pvp.rs:1118-1121`, and `battle_challenge_reaper` deliberately does *not* disarm). | **Split the helper.** `delete_claim(ctx, guest)` deletes only the `guest_claim` row; `consume_claim_and_disarm(ctx, guest)` = `delete_claim` + `disarm_claim_reaper`. The reaper calls **`delete_claim` only**. Three callers use the full `consume_claim_and_disarm`: success path (AUTH-34), expiry path (AUTH-16), replace path (AUTH-10). ADR precision note. |
| C4 | Spec §4 says `just gen-bindings`. | The recipe is **`just gen`** (`justfile:147-148`). |
| C5 | Spec §5 `touches:` omits three load-bearing files that will RED without edits. | Add **`evals/baselines/table-schemas.json`**, **`evals/baselines/spacetime-types.json`**, **`docs/knowledge/**`** (see §7). |

---

## 2. Exact schema (`server-module/src/schema.rs`)

Land after the `player_wallet` / `my_wallet` block (`schema.rs:641-658`) so the account block sits with the other owner-scoped-view precedent. Imports already present: `spacetimedb::Identity`. **Add `use spacetimedb::ScheduleAt;`? No** — the schedule table moves to `accounts.rs` (C1), so `schema.rs` needs **no new imports**.

```rust
// --- M21 account tables (ADR-0179 D2) ------------------------------------------

/// Lifecycle state of an account (ADR-0179 D7). M21 gates `PendingDeletion` in
/// exactly one place (`complete_guest_claim`) via `accounts::is_pending_deletion`;
/// M22 extends `delete_account`'s body with the grace window + cascade.
#[derive(Clone, Copy, PartialEq, Eq, Debug, spacetimedb::SpacetimeType)]
pub enum AccountStatus {
    Active,
    PendingDeletion,
}

/// PRIVATE account record (no `public`). No email, no email hash, no raw `sub`
/// (ADR-0179 D9 / AUTH-6). Clients read ONLY through the `my_account` view below.
#[spacetimedb::table(name = account)]
pub struct Account {
    #[primary_key]
    pub identity: Identity,
    pub auth_issuer: String,
    pub created_at_ms: i64,
    pub last_login_at_ms: i64,
    pub status: AccountStatus,
    pub deletion_requested_at_ms: Option<i64>,
    pub claimed_from: Option<Identity>,
    pub claimed_at_ms: Option<i64>,
}

/// Owner-scoped read path for `account` (ADR-0179 D2, mirroring `my_wallet`
/// above / ADR-0154 D2). `public` on the view keyword is inert; THIS BODY is the
/// entire security boundary and must stay pinned to exactly this expression —
/// a decoy `find(ctx.sender)` followed by `find(other)` compiles clean and leaks.
#[spacetimedb::view(name = my_account, public)]
fn my_account(ctx: &spacetimedb::ViewContext) -> Option<Account> {
    ctx.db.account().identity().find(ctx.sender)
}

/// PRIVATE in-flight guest→account claim (no `public`). One row per guest
/// identity. `code` is CLIENT-minted 256-bit entropy (ADR-0179 D3), stored
/// plaintext, `#[unique]` with NO adjacent `#[index(btree)]` — the `npc.npc_id`
/// convention; a unique column already supports `.find()`.
#[spacetimedb::table(name = guest_claim)]
pub struct GuestClaim {
    #[primary_key]
    pub guest_identity: Identity,
    #[unique]
    pub code: String,
    pub guest_name: String,
    pub created_at_ms: i64,
    pub expires_at_ms: i64,
}
```

**Verification notes:**
- `Option<Identity>` is legal: `Identity: SpacetimeType` and `Option<T: SpacetimeType>` is a sum type. Repo precedent for `Option<T>` columns: `species_row.ability: Option<u32>`, `item_row.train_stat: Option<StatKind>`, `evolution_path.min_trust_tier: Option<TrustTier>`. Bindings emit `__t.option(__t.identity())`.
- Enum derive set is byte-identical to `ChallengeStatus` (`schema.rs:692`).
- **`AccountStatus` must be written multi-line, one variant per line.** `evals/spacetime-type-snapshot.eval.mjs:55` terminates a type body on `\n\s*\}`; a single-line `{ Active, PendingDeletion }` would be **invisible to the snapshot** (silently un-baselined, and adding a baseline entry would then RED as `in baseline but not parsed`).
- No `#[derive(Clone)]` on `Account`/`GuestClaim` — the update-in-place idiom moves the row by value, and pure seams take/return by value. Keeping the derive off also keeps the `battle-schema-snapshot` regex (`#[spacetimedb::table(...)]\s*pub struct`) matching directly.
- New tables are wholly additive → **no `#[default(...)]` attributes needed** (and none of the existing tables gain a column, so the `#[default(0i64)]` BSATN trap does not apply).
- `ViewContext::new(` / `ViewContext {` must appear **nowhere** in `schema.rs` or `accounts.rs` — `evals/wallet-privacy.eval.mjs:469-481` and `economy_tests.rs` R3 scan for it after whitespace compaction. A `&spacetimedb::ViewContext)` parameter is always followed by `)`/`,` and is safe.

---

## 3. `server-module/src/accounts.rs` (new)

### 3.1 Header, imports, constants

```rust
//! `accounts` — server-module domain submodule (M21, ADR-0179).
//!
//! WRITE-ISOLATION (D0, WRITE-scoped not table-scoped): this module may insert /
//! update / delete rows ONLY in `account`, `guest_claim`,
//! `guest_claim_reaper_schedule`. Every write to any pre-existing table goes
//! through a `pub(crate) fn rekey_*` helper in that table's OWNING module. Bare
//! reads of `player` are permitted (no owning module exists); the wallet is NOT
//! readable here at all (currency-integrity ACCESSOR_BYPASS gates reads too), and
//! battle liveness MUST reuse `guards::is_in_ongoing_battle` rather than touching
//! `ctx.db.battle()`.
//!
//! `GuestClaimReaperSchedule` is colocated here with `guest_claim_reaper` so the
//! `scheduled(guest_claim_reaper)` attribute reference resolves as a bare ident
//! (ADR-0056 exception; mirrors movement.rs / pvp.rs / playtest.rs).
//!
//! This file name extends the canonical `touches:` vocabulary (ADR-0056) — keep it stable.

use crate::guards::{is_in_ongoing_battle, log_reject};
use crate::marshal::now_ms;
use crate::schema::{account, guest_claim, player, Account, AccountStatus, GuestClaim};
use spacetimedb::{Identity, ReducerContext, ScheduleAt, Table};
```

```rust
/// DEPLOYMENT CONFIG, not a game rule (spec OQ1 open). Provider selection changes
/// exactly these two constants + a republish — never module structure (ADR-0179 D1).
/// The `.invalid` reserved TLD (RFC 2606) is a deliberate FAIL-CLOSED placeholder:
/// until OQ1 is answered no token can match, so no `account` row is ever
/// provisioned, while anonymous play is completely unaffected (AUTH-1 / D1').
pub(crate) const ALLOWED_ISSUERS: &[&str] = &["https://auth.monster-realm.invalid/"];
pub(crate) const ALLOWED_AUDIENCE: &[&str] = &["monster-realm"];

/// Orphan-hygiene TTL only, NOT a security parameter — entropy is client-minted
/// and real (ADR-0179 D3). 15 min covers a redirect + provider MFA / magic link.
pub(crate) const CLAIM_TTL_MS: i64 = 15 * 60 * 1000;
/// 32 bytes of `crypto.getRandomValues` rendered as lowercase hex.
pub(crate) const CLAIM_CODE_LEN: usize = 64;
/// Shared by AUTH-15 (malformed / never-existed) and AUTH-35 (already consumed):
/// one const so the two paths are indistinguishable to a caller BY CONSTRUCTION.
pub(crate) const ERR_INVALID_CODE: &str = "invalid or already-used code";
```

### 3.2 Pure decision seams (functional core — every one directly unit-testable, no `ReducerContext`)

```rust
pub(crate) fn is_valid_claim_code(code: &str) -> bool
// code.len() == CLAIM_CODE_LEN && code.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f'))
// byte-len + all-ASCII-hex ⇒ exactly 64 lowercase hex chars. Rejects uppercase
// (do NOT use is_ascii_hexdigit), non-ASCII, whitespace, wrong length.

pub(crate) fn issuer_allowed(issuer: &str, allowed: &[&str]) -> bool
pub(crate) fn audience_allowed(audience: &[String], allowed: &[&str]) -> bool
// allowlist passed in ⇒ tests drive fixtures and never rot when OQ1 lands.
// audience_allowed(&[], _) == false  (empty aud vec ⇒ reject, AUTH-3)

pub(crate) fn claim_expires_at(created_at_ms: i64) -> i64      // saturating_add(CLAIM_TTL_MS)
pub(crate) fn claim_is_expired(expires_at_ms: i64, now_ms: i64) -> bool  // now >= expires
// boundary-INCLUSIVE, mirroring game_core::is_cooldown_ready's `>=`. Pinned by test.

pub(crate) fn new_account_row(identity: Identity, auth_issuer: String, now_ms: i64) -> Account
// status: Active, claimed_from: None, claimed_at_ms: None,
// deletion_requested_at_ms: None, created_at_ms == last_login_at_ms == now_ms.   (AUTH-4)

pub(crate) fn touch_login(existing: Account, now_ms: i64) -> Account
// Account { last_login_at_ms: now_ms, ..existing }  — ONLY that field.          (AUTH-5)

pub(crate) fn claim_row(guest_identity: Identity, code: String, guest_name: String,
                        now_ms: i64) -> GuestClaim
// created_at_ms: now_ms, expires_at_ms: claim_expires_at(now_ms).                (AUTH-9)

pub(crate) fn needs_deletion_write(status: AccountStatus) -> bool   // Active => true
pub(crate) fn needs_cancel_write(status: AccountStatus) -> bool     // PendingDeletion => true
// Load-bearing for AUTH-28/38: the second delete_account call must NOT re-stamp
// deletion_requested_at_ms ("change no additional state"), and cancel on an
// already-Active account must write nothing at all.

pub(crate) fn requested_deletion(existing: Account, now_ms: i64) -> Account
// status: PendingDeletion, deletion_requested_at_ms: Some(now_ms), rest unchanged.
pub(crate) fn cancelled_deletion(existing: Account) -> Account
// status: Active, deletion_requested_at_ms: None, rest unchanged.  claimed_from
// and claimed_at_ms MUST survive (a cancel must not resurrect a spent claim).  (AUTH-29)

pub(crate) fn claimed_account(existing: Account, guest: Identity, now_ms: i64) -> Account
// claimed_from: Some(guest), claimed_at_ms: Some(now_ms), rest unchanged.       (AUTH-21)
```

### 3.3 Context-bound helpers

```rust
pub(crate) fn is_account_holder(ctx: &ReducerContext, identity: Identity) -> bool     // D4'
pub(crate) fn is_pending_deletion(ctx: &ReducerContext, identity: Identity) -> bool
// find(identity).is_some_and(|a| a.status == AccountStatus::PendingDeletion)
// false when no row. D7's SSOT — M22's gameplay gate call sites reuse it.

pub(crate) fn account_has_game_data(ctx: &ReducerContext, identity: Identity) -> bool {
    crate::monster_mgmt::has_monsters(ctx, identity)
        || crate::inventory::has_items(ctx, identity)
        || crate::economy::wallet_exists(ctx, identity)
        || crate::ranking::profile_exists(ctx, identity)
        || crate::npc::has_quest_or_dialogue_state(ctx, identity)
        || crate::raising::has_heal_cooldown(ctx, identity)
}
// Short-circuit order = most-discriminating first (join_game grants a monster
// unconditionally). All six helper names appear textually ⇒ G6's
// consumption-completeness check is satisfied. The `account` row never counts.

pub(crate) fn rekey_all(ctx: &ReducerContext, from: Identity, to: Identity) -> Result<(), String> {
    crate::monster_mgmt::rekey_monsters(ctx, from, to)?;   // fallible: fail-loud on missing monster_pub
    crate::inventory::rekey_inventory(ctx, from, to);
    crate::npc::rekey_npc_state(ctx, from, to);
    crate::raising::rekey_heal_cooldown(ctx, from, to);
    crate::economy::rekey_wallet(ctx, from, to);
    crate::ranking::rekey_profile(ctx, from, to);
    Ok(())
}
// Order = D6 manifest order. `?` on rekey_monsters rolls back the whole txn.

fn delete_claim(ctx: &ReducerContext, guest: Identity)          // guest_claim row only
fn disarm_claim_reaper(ctx: &ReducerContext, guest: Identity)   // collect-then-delete via the
    // guest_identity btree filter, then delete by scheduled_id PK (mirrors pvp.rs:139-153)
pub(crate) fn consume_claim_and_disarm(ctx: &ReducerContext, guest: Identity)
    // = delete_claim + disarm_claim_reaper.  NEVER called from the reaper (C3).
fn arm_claim_reaper(ctx: &ReducerContext, guest: Identity, expires_at_ms: i64)
    // ScheduleAt::Time(Timestamp::from_micros_since_unix_epoch(expires_at_ms * 1_000))
    // Derived from the row's OWN expires_at_ms — one SSOT for row expiry and
    // schedule fire time, which is what kills the ADR-0117 D4 ms-truncation edge.
```

### 3.4 `provision_or_touch_account` (AUTH-2..5, AUTH-36, G3, G12)

```rust
pub(crate) fn provision_or_touch_account(ctx: &ReducerContext) -> Result<(), String> {
    let Some(claims) = ctx.sender_auth().jwt() else { return Ok(()) };   // belt to has_jwt
    let issuer = claims.issuer();
    if !issuer_allowed(issuer, ALLOWED_ISSUERS) {
        log_reject("client_connected", ctx.sender, "unrecognized issuer");
        return Ok(());                       // D1' — no row, no disconnect
    }
    if !audience_allowed(claims.audience(), ALLOWED_AUDIENCE) {
        log_reject("client_connected", ctx.sender, "unrecognized audience");
        return Ok(());                       // D1'
    }
    let now = now_ms(ctx);
    match ctx.db.account().identity().find(ctx.sender) {
        Some(existing) => { ctx.db.account().identity().update(touch_login(existing, now)); }
        None => { ctx.db.account().insert(new_account_row(ctx.sender, issuer.to_string(), now)); }
    }
    Ok(())
}
```

- **`.subject()` is never called anywhere in the module** — AUTH-6 by construction.
- **Panic posture (deliberate, documented):** `JwtClaims::issuer()` double-`unwrap`s (`spacetimedb-1.12.0/src/lib.rs:1537`), `audience()` panics on an unexpected `aud` type (`:1547`), `get_parsed()` panics on an unparseable payload (`:1523`). A malformed token therefore panics rather than returning `Err`. **Accepted, not pre-checked:** (a) a reducer panic aborts the transaction, so no `account` row is written — the load-bearing AUTH-2/AUTH-3 property holds; (b) the host verifies the signature before the module sees the token, so a parseable-but-`iss`-less token is not reachable for a real OIDC credential; (c) **none of these panic messages contain a claim value** (`"Missing 'sub' claim"`, `Option::unwrap` on `None`, `"Unexpected type for 'aud' claim in JWT"`, serde position-only errors) — so AUTH-36 is not violated by the vendor panics. Pre-checking would require `serde_json` in the module (not a dependency) and would duplicate vendor parsing. Record this in the ADR.
- **AUTH-36 / G12:** every `log_reject` reason on these paths is a bare `&'static str` literal. `format!` must not appear in `provision_or_touch_account` or `on_connect` at all.
- **G3 needle guidance for M21c** (write the eval to match this code): require `provision_or_touch_account`'s body to contain **all four** of `.issuer()`, `.audience()`, `issuer_allowed(`, `audience_allowed(`; the BAD fixture (issuer-only) drops two of them and fails. Do **not** needle on `.issuer() ==` — this code compares inside the pure predicate.

### 3.5 `start_guest_claim` (AUTH-7..11)

```rust
#[spacetimedb::reducer]
pub fn start_guest_claim(ctx: &ReducerContext, code: String) -> Result<(), String>
```

Ordered guards (each `log_reject` then `Err`):

1. **AUTH-7** — `is_account_holder(ctx, me)` → `Err("already signed in")`. *(D4′: was "presents a JWT". An account row exists only for a verified allowed-issuer JWT, so this is the same property, precisely targeted, and survives §0.)*
2. **AUTH-8** — `!is_valid_claim_code(&code)` → `Err("invalid claim code")`. *(A distinct string from `ERR_INVALID_CODE`: on the mint side there is no lookup, so no oracle exists to conflate.)*
3. **Guest must be joined** → `Err("not joined")` when `ctx.db.player().identity().find(me)` is `None`. **Spec gap decision:** the spec says `guest_name` comes from `player.name` but never says what happens when the row is absent. Reject, because (a) an identity with no `player` row has nothing to claim (`join_game` is what creates the player row *and* grants the starter monster), (b) it avoids fabricating an empty `guest_name`, (c) it bounds the accepted-risk flood surface (a bot must complete `join_game` per identity, not just connect), and (d) `"not joined"` is the repo's standard string (`economy.rs:111,198`, `ranking.rs:143`).
4. **AUTH-10** — `consume_claim_and_disarm(ctx, me)` **unconditionally** before the insert. Idempotent (delete-by-PK on an absent row is a no-op; the reaper filter yields an empty vec), so no branch is needed and the "delete prior + disarm before inserting" ordering is unconditional and scannable.
5. **AUTH-9** — `let row = claim_row(me, code, p.name, now_ms(ctx)); ctx.db.guest_claim().insert(row);` then `arm_claim_reaper(ctx, me, expires_at_ms)`.

> **Uniqueness note:** `code` is `#[unique]`. A second guest minting a colliding code would fail the unique constraint and abort the transaction. At 256 bits of real CSPRNG entropy this is not a reachable path; do **not** add a pre-check (it would be a second oracle for code existence). Document it.

### 3.6 `complete_guest_claim` — the ordered guard list (AUTH-12..21, 26, 34, 35)

```rust
#[spacetimedb::reducer]
pub fn complete_guest_claim(ctx: &ReducerContext, code: String) -> Result<(), String>
```

**Ordering principle:** caller-state checks *before* any code resolution, so an unauthorized caller can never use this reducer as an oracle for code validity and can never trigger the expiry side effect. Every reject before step 11 mutates **nothing** (AUTH-26); step 6 is the single exception, mandated by AUTH-16.

| # | Guard | Reject (static literal) | AUTH |
|---|---|---|---|
| 1 | `!ctx.sender_auth().has_jwt()` | `"sign in required"` | 12 (cheap pre-filter) |
| 2 | `ctx.db.account().identity().find(me)` is `None` | `"no account"` | 12 (load-bearing, D4′) |
| 3 | `is_pending_deletion(ctx, me)` | `"account pending deletion"` | 13 |
| 4 | `account.claimed_from.is_some()` | `"account already claimed"` | 14 |
| 5 | `!is_valid_claim_code(&code)` | `ERR_INVALID_CODE` | 15a |
| 6 | `ctx.db.guest_claim().code().find(&code)` is `None` | `ERR_INVALID_CODE` | 15b + **35** |
| 7 | `claim_is_expired(claim.expires_at_ms, now)` | `consume_claim_and_disarm(ctx, claim.guest_identity)` **then** `"code expired"` | **16** — the ONLY Err with a side effect |
| 8 | `claim.guest_identity == me` | `"cannot claim your own session"` | 17 |
| 9 | `ctx.db.player().identity().find(guest).is_some()` | `"close your other tab, then retry"` | 18 |
| 10 | `is_in_ongoing_battle(ctx, guest) \|\| is_in_ongoing_battle(ctx, me)` | `"already in an ongoing battle"` (repo-existing string, `battle.rs:116`) | 19 |
| 11 | `account_has_game_data(ctx, me)` | `"already has game data"` | 20 (C2) |

Then, in order: `rekey_all(ctx, guest, me)?` → `consume_claim_and_disarm(ctx, guest)` (**AUTH-34**, G11) → `ctx.db.account().identity().update(claimed_account(account, guest, now))` (**AUTH-21**) → `Ok(())`.

Steps 3 and 4 both need account state; step 3 uses the `is_pending_deletion` SSOT predicate (which does its own PK find) while step 2 already bound the row for step 4 — **a deliberate double PK read**, kept because D7 requires the reusable predicate that M22's many call sites will share. Document it so a later "optimization" does not delete the seam.

`code().find(&code)` is valid: `UniqueColumn::find(col_val: impl Borrow<Col::ColType>)` (`spacetimedb-1.12.0/src/table.rs:331`), `ColType = String`, `&String: Borrow<String>`. Bind `let guest = claim.guest_identity;` (Copy) so no `Clone` on `GuestClaim` is needed.

### 3.7 `delete_account` / `cancel_account_deletion` (AUTH-28/29/37/38)

```rust
#[spacetimedb::reducer] pub fn delete_account(ctx: &ReducerContext) -> Result<(), String>
```
1. `!has_jwt()` → `Err("sign in required")` (AUTH-37 pre-filter).
2. `find(me)` is `None` → `Err("no account")`. **Edge decision:** a JWT-bearing caller with no `account` row (issuer/audience not allowlisted, or a pre-table connection) gets a reject, not a silent `Ok`. Reject-not-clamp: a deletion path must never fabricate a row, and `Ok` would hide a provider misconfiguration. AUTH-28's idempotency is about the *second call by the same caller*, which by definition has a row.
3. `if !needs_deletion_write(account.status) { return Ok(()); }` — **the second call writes nothing**, so `deletion_requested_at_ms` is never re-stamped (AUTH-28's "change no additional state").
4. `update(requested_deletion(account, now_ms(ctx)))`.

```rust
#[spacetimedb::reducer] pub fn cancel_account_deletion(ctx: &ReducerContext) -> Result<(), String>
```
Same 1–2, then `if !needs_cancel_write(account.status) { return Ok(()); }` (**AUTH-38**, no write), then `update(cancelled_deletion(account))` (**AUTH-29**).

### 3.8 Scheduled table + reaper (AUTH-27)

```rust
// PRIVATE scheduled table colocated with its reducer (ADR-0056 exception, C1).
// `guest_identity` carries an index so the DISARM path filters instead of
// scanning — mirrors battle_challenge_reaper_schedule.challenge_id (ADR-0126).
#[spacetimedb::table(name = guest_claim_reaper_schedule, scheduled(guest_claim_reaper))]
pub struct GuestClaimReaperSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
    #[index(btree)]
    pub guest_identity: Identity,
}

#[spacetimedb::reducer]
pub fn guest_claim_reaper(ctx: &ReducerContext, args: GuestClaimReaperSchedule)
    -> Result<(), String>
{
    if ctx.sender != ctx.identity() {
        return Err("guest_claim_reaper is scheduler-only".to_string());
    }
    let Some(claim) = ctx.db.guest_claim().guest_identity().find(args.guest_identity) else {
        return Ok(());   // consumed before the TTL fired — no-op
    };
    if !claim_is_expired(claim.expires_at_ms, now_ms(ctx)) {
        return Ok(());   // fired early / clock skew — never reap a fresh claim
    }
    ctx.db.guest_claim().guest_identity().delete(args.guest_identity);
    Ok(())
}
```
- Scheduler guard is the verbatim repo convention (`pvp.rs:1127`, `pvp.rs:1158`, `playtest.rs:159`).
- **No self-disarm** — the runtime deletes a one-shot `ScheduleAt::Time` row after the reducer returns (`pvp.rs:1118-1121`). This is C3's whole point.
- Deletes exactly one row, by PK == the indexed `guest_identity` from `args` (AUTH-27's "SHALL NOT delete any other `guest_claim` row" is structural: a PK delete cannot touch a second row). The staleness re-check closes the reap-a-newer-claim window.

### 3.9 Tail

```rust
#[cfg(test)]
#[path = "accounts_tests.rs"]
mod accounts_tests;
```

---

## 4. `server-module/src/lib.rs`

1. `mod accounts;` in the domain-module block (alphabetical, before `mod battle;` — `lib.rs:23`).
2. New lifecycle reducer, placed with the other three (after `sync_content`, before `on_disconnect`):

```rust
/// AUTH-1 / D4: anonymous play is FIRST-CLASS. Returning `Err` from this hook
/// DISCONNECTS the client (crate doc, spacetimedb-1.12.0/src/lib.rs:540-546), so
/// the very first statement is the `has_jwt()` early return with no prior `Err`
/// path. The vendor's canonical example for this hook REJECTS JWT-less
/// connections — that pattern must NOT be copied here.
#[spacetimedb::reducer(client_connected)]
pub fn on_connect(ctx: &ReducerContext) -> Result<(), String> {
    if !ctx.sender_auth().has_jwt() {
        return Ok(());
    }
    accounts::provision_or_touch_account(ctx)
}
```
3. **`on_disconnect` is not touched.** `ranking-security` C2 extracts its body and forbids a `profile(` token; `smoke-republish-on-disconnect-compat.eval.mjs` also watches it.
4. No `use crate::schema::{account, ...}` in `lib.rs` — `on_connect` touches no table directly.

---

## 5. The six `rekey_*` + six existence helpers — exact signatures and row-level semantics

**Why update-in-place is safe everywhere:** guard 11 (`account_has_game_data`) proves the destination owns **zero** rows in every REKEY class before `rekey_all` runs. So no PK collision, no `inventory` single-stack violation, no double-profile.

**Collect-before-write everywhere** (ADR-0126 convention): materialize ids into a `Vec` from the index filter *before* the first write, never mutate mid-iteration.

### 5.1 `monster_mgmt::rekey_monsters` — `monster` PK `monster_id` (auto_inc), `owner_identity` `#[index(btree)]`; `monster_pub` PK `monster_id`, `owner_identity` `#[index(btree)]`
```rust
pub(crate) fn rekey_monsters(ctx: &ReducerContext, from: Identity, to: Identity)
    -> Result<(), String>
```
Identity is a non-PK indexed column on both → **update in place**. One fn body, per AUTH-22 / `monster-dual-write.eval.mjs`:
1. `let ids: Vec<u64> = ctx.db.monster().owner_identity().filter(from).map(|m| m.monster_id).collect();`
2. For each id: find the `monster` row; `m.owner_identity = to;` → `let Some(existing_pub) = ctx.db.monster_pub().monster_id().find(id) else { return Err(format!("monster_pub row missing for monster {id}")); };` → `let pub_row = pub_from_monster(&m, existing_pub.tier);` → `ctx.db.monster().monster_id().update(m);` → `ctx.db.monster_pub().monster_id().update(pub_row);`

**Three hard constraints, all verified:**
- `pub_from_monster` takes **two** args (`marshal.rs:208`) — the spec/ADR both say one. `pub_from_monster(&m)` will not compile.
- `evals/monster-dual-write.eval.mjs:193-204` requires a body containing `ctx.db.monster().monster_id().update(` to also contain `ctx.db.monster_pub().monster_id().update(` **and** `pub_from_monster(` — so hand-patching only `owner_identity` on the existing pub row goes RED.
- `evolution_tests.rs::a3_no_call_site_fabricates_a_tier` scans `monster_mgmt.rs` (`scanned_production_files()`, `evolution_tests.rs:2982-2994`) and flags a tier arg that is literal `0`, `unwrap_or(0)` or `unwrap_or_default()`, and flags any `MonsterPub {` literal. **The fail-loud `let Some(existing_pub) = ... else { return Err(...) }` shape is the only compliant one** — and it is why this helper alone is fallible. It is also the verbatim shape already used at `monster_mgmt.rs:46-49` and `:93-96`.

```rust
pub(crate) fn has_monsters(ctx: &ReducerContext, owner: Identity) -> bool
// ctx.db.monster().owner_identity().filter(owner).next().is_some()
```

### 5.2 `inventory::rekey_inventory` — PK `inv_id` (auto_inc), `owner_identity` `#[index(btree)]`
```rust
pub(crate) fn rekey_inventory(ctx: &ReducerContext, from: Identity, to: Identity)
```
Non-PK identity → **update in place**. Collect `inv_id`s, then for each: find, set `owner_identity = to`, `ctx.db.inventory().inv_id().update(row)`.
**Must not insert.** `evals/inventory-single-stack.eval.mjs:148,176` requires every `.inventory().insert(` in `server-module` to sit inside `grant_item`. Update-in-place also automatically preserves the single-stack invariant (guard 11 guarantees the destination has no competing stack).
```rust
pub(crate) fn has_items(ctx: &ReducerContext, owner: Identity) -> bool
```

### 5.3 `npc::rekey_npc_state` — two tables, two different shapes
```rust
pub(crate) fn rekey_npc_state(ctx: &ReducerContext, from: Identity, to: Identity)
```
- `player_quest`: PK `pq_id` (auto_inc), `owner_identity` `#[index(btree)]` → **update in place** (collect `pq_id`s first).
- `player_dialogue_state`: **PK *is* `owner_identity`** → **delete + insert**. Read the guest row; `delete(from)`; `insert(PlayerDialogueStateRow { owner_identity: to, flags, done_quests })`. `from != to` (AUTH-17) and the destination has no row (guard 11), so no unique conflict in either order; delete-then-insert reads better. This is the same upsert vocabulary `write_player_dialogue_state` already uses (`npc.rs:87-106`).
```rust
pub(crate) fn has_quest_or_dialogue_state(ctx: &ReducerContext, owner: Identity) -> bool
// player_quest filter(owner).next().is_some() || player_dialogue_state find(owner).is_some()
```

### 5.4 `raising::rekey_heal_cooldown` — **PK is `owner_identity`**
```rust
pub(crate) fn rekey_heal_cooldown(ctx: &ReducerContext, from: Identity, to: Identity)
```
→ **delete + insert**: read `last_heal_at_ms`, `delete(from)`, `insert(HealCooldown { owner_identity: to, last_heal_at_ms })`. Idiom already present at `raising.rs:398-414`.
```rust
pub(crate) fn has_heal_cooldown(ctx: &ReducerContext, owner: Identity) -> bool
```

### 5.5 `economy::rekey_wallet` — PK `owner_identity`, **NEVER DELETE** (AUTH-23/24)
```rust
pub(crate) fn rekey_wallet(ctx: &ReducerContext, from: Identity, to: Identity) {
    if let Some(row) = ctx.db.player_wallet().owner_identity().find(from) {
        grant_currency(ctx, to, row.balance);                       // credit-forward (AUTH-24)
        ctx.db.player_wallet().owner_identity().update(zeroed_wallet(row));  // zero in place
    }
}
pub(crate) fn zeroed_wallet(row: PlayerWallet) -> PlayerWallet   // PlayerWallet { balance: 0, ..row }
pub(crate) fn wallet_exists(ctx: &ReducerContext, owner: Identity) -> bool
```
- The PK is untouched, so this is an in-place `update` — the row stays present with balance 0.
- `row` is an owned copy, and `grant_currency` writes a *different* PK (`to != from`, AUTH-17), so the credit-then-zero order is race-free. Reading the balance **before** the zero is load-bearing.
- `grant_currency`'s 0-amount early return means a zero-balance guest creates no phantom destination row (correct).
- **Must live in `economy.rs`:** `currency-integrity.eval.mjs` ACCESSOR_BYPASS bans `player_wallet()` and `PlayerWallet{` in every `server-module/src` file except `economy.rs`/`schema.rs`/`economy_tests.rs`, and it gates **reads** too — hence `wallet_exists` also lives here rather than in `accounts.rs`.
- **`economy_tests.rs::player_wallet_rows_are_never_deleted` (`:1766-1841`)** flags any fn in `economy.rs` whose body mentions `player_wallet()` **and** contains `.delete(` or `.try_delete(`. Neither new fn may contain a delete of any kind.
- `economy.rs` must not gain `.saturating_sub(` / `.wrapping_sub(` / `balance -` (currency-integrity C2 applies these to `economy.rs` specifically). Zeroing needs no arithmetic.

### 5.6 `ranking::rekey_profile` — PK `identity`, **NEVER DELETE, NOT a reducer** (AUTH-23/25)
```rust
pub(crate) const PROFILE_TOMBSTONE_NAME: &str = "(claimed guest)";   // 15 chars <= MAX_NAME_LEN=24

pub(crate) fn rekey_profile(ctx: &ReducerContext, from: Identity, to: Identity) {
    let Some(guest) = ctx.db.profile().identity().find(from) else { return };
    let dest = get_or_init_profile(ctx, to);                 // the EXISTING ensure-profile seam
    ctx.db.profile().identity().update(
        profile_with_carried_stats(dest, guest.rating, guest.wins, guest.losses));
    ctx.db.profile().identity().update(tombstoned_profile(guest));   // zero + tombstone
}
pub(crate) fn profile_with_carried_stats(dest: Profile, rating: i32, wins: u32, losses: u32) -> Profile
// Profile { rating, wins, losses, ..dest }   — dest.name and dest.identity survive
pub(crate) fn tombstoned_profile(guest: Profile) -> Profile
// Profile { name: PROFILE_TOMBSTONE_NAME.to_string(), rating: 0, wins: 0, losses: 0, ..guest }
pub(crate) fn profile_exists(ctx: &ReducerContext, identity: Identity) -> bool
```
- **`get_or_init_profile` reuse is MANDATORY, not stylistic.** `ranking_tests.rs::ptc1_scan_profile_insert_count_is_one` (`:1297-1310`) pins whole-file `profile().insert(` at **exactly 1**. A direct insert in `rekey_profile` goes RED. `get_or_init_profile` (`ranking.rs:44`) is the repo's ensure-profile seam and adds no new insert site.
- **What `name` does a freshly-created caller profile get?** `get_or_init_profile`'s `None` arm seeds `live_player_name(ctx, to).unwrap_or_default()`. Guard 11 guarantees the caller has never played, so no `player` row exists → **empty string**. That is correct and intended: ADR-0179 D8.7 says the guest display name is *not* carried across the claim; the ADR-0125 passive mirror fills the name on the caller's next rated game, and the shipped rename UI (ADR-0133) covers it meanwhile. `profile.name` carries no DB uniqueness constraint, so multiple tombstoned rows and multiple empty names never collide.
- **`"(claimed guest)"` is deliberately un-typable:** parentheses are not `is_alphanumeric`, so `guards::validate_name` (`guards.rs:96`) rejects it — no player can ever mint a name that impersonates a tombstone.
- **Placement inside `ranking.rs`:** put `PROFILE_TOMBSTONE_NAME`, `rekey_profile`, the two pure seams and `profile_exists` **before** the `#[spacetimedb::reducer]` attribute on `set_profile_name`, or **after** the whole `set_profile_name` fn — **never between the attribute and its `fn`**. `ranking-security.eval.mjs:142-158` (`reducerNameAfterAttr`) reads the first `fn ` token after the single reducer attribute; anything inserted there breaks A1's count-to-name tie.
- `rekey_profile` must **not** be `#[spacetimedb::reducer]` — A1 and `pvp_tests.rs:1174` both pin `ranking.rs`'s reducer-attr count at exactly 1.
- Do **not** call `live_player_name(ctx, identity)` from new code — `ranking_tests.rs:554-570` pins that exact call-site needle at 2.
- Do **not** introduce `= ctx.db.profile()` or `= ctx.db.player()` (split-binding bans, `ranking_tests.rs:615-639`, `pvp_tests.rs:1461-1470`, `ranking-security` C1b).

---

## 6. HIGH-severity blast-radius items (existing gates that WILL RED without an edit)

Derived graph-first — CodeGraph (`pub_from_monster` 30 callers; `get_or_init_profile` ← `apply_pvp_rating`) ∪ cbm (`grant_currency` in_degree 4: `sell`, `confirm_trade`, `apply_quest_trigger`, `write_back_battle_results`; `get_or_init_profile` in_degree 1; `pub_from_monster` in_degree 21) — plus a grep sweep for the repo's real "dynamic dispatch" analogue (symbol names embedded in `include_str!` scans, eval needle strings, and hardcoded file/name lists). **cbm's Cypher `CALLS` traversal returned empty for this project; its node-level `connected_names` did resolve, so treat the CodeGraph edge set as authoritative for Rust and cbm as the cross-check.** No signature changes anywhere, so the entire blast radius is source-scan pins:

| Sev | File | What breaks | Fix |
|---|---|---|---|
| **BLOCKER** | `server-module/src/ranking_tests.rs:596-613` (`d1_scan_no_eager_write_in_get_or_init` (a)) | Whole-file `profile().identity().update(` count pinned at **2**. `rekey_profile` adds 2 → 4. | **Do not just bump 2→4** — that silently deletes the tooth ("no eager write in `get_or_init_profile`"). **Re-scope to per-function**: extract `apply_pvp_rating`'s body → exactly 2; extract `get_or_init_profile`'s body → exactly **0**; extract `rekey_profile`'s body → exactly 2; keep a whole-file backstop at **4** ("no fifth writer"). Strictly stronger than today. |
| **BLOCKER** | `evals/baselines/table-schemas.json` | `checkSchemaDrift` (`battle-schema-snapshot.eval.mjs:110-115`) fails any parsed table absent from the baseline. 3 new tables. | Add `account`, `guest_claim`, `guest_claim_reaper_schedule` entries (pk + column→type map, types as written in Rust: `Option<i64>`, `Option<Identity>`, `AccountStatus`, `ScheduleAt`). Mirror the `battle_challenge_reaper_schedule` entry shape (`:40-47`). |
| **BLOCKER** | `evals/baselines/spacetime-types.json` | `checkTypeDrift` (`spacetime-type-snapshot.eval.mjs:109-112`) fails a parsed-but-unbaselined type. `AccountStatus`, `Account`, `GuestClaim`, `GuestClaimReaperSchedule` are all `SpacetimeType`-adjacent. | Re-baseline. Verify by running the eval that **`AccountStatus` is actually parsed** (multi-line enum body, §2). `checkAppendOnly` permits new-only types. |
| **BLOCKER** | `docs/knowledge/**` | `knowledge-bundle-conformance.eval.mjs:431-444` runs `okf-export.mjs --check`; a stale bundle exits 1. | `just knowledge` — **after** the schema/reducer commit (`gitDate` stamping; memory card). Produces new `tables/{account,guest_claim,guest_claim_reaper_schedule}.md`, `reducers/{start_guest_claim,complete_guest_claim,delete_account,cancel_account_deletion,on_connect,guest_claim_reaper}.md`, plus regenerated `schema-overview.md` + both indices. No file needs `git rm` (nothing is removed). |
| **BLOCKER** | `client/src/module_bindings/**` | `bindings-drift.eval.mjs` is a hard gate in CI (skips locally only when the CLI is absent). | `just gen` (**not** `just gen-bindings`), commit the output. |
| MED | `scripts/okf-export.mjs:41-48` (`PRIVATE_ADRS`) | Not a failure — a missing key just omits the Privacy section. But all six existing private tables have one. | Recommended (3 lines): `account: 'ADR-0179 D2/D9 — account record is owner-private; no email, no email hash, no raw sub.'`, `guest_claim: 'ADR-0179 D3 — the claim code is a bearer secret; must never reach any client but its minter.'`, `guest_claim_reaper_schedule: 'Server-only TTL reaper schedule; no projection.'` Adds `scripts/okf-export.mjs` to `touches:`. |
| LOW (M21c) | `server-module/src/pvp_tests.rs:1428-1443` | Hardcoded 13-file list; `accounts.rs` + the new rekey files are simply not scanned. **No exhaustiveness guard → stays green.** | Per spec, extend in **M21c** (G9). Note the hole explicitly in the M21a PR body so it is not lost. |
| LOW (M21c) | `server-module/src/evolution_tests.rs:2591-2604` (`scheduled_scan_sources`, 10 files) | `guest_claim_reaper` lives in an un-scanned file, so EG2-9 silently skips it. Green today. | Add `("accounts.rs", ACCOUNTS_RS_SOURCE)` + bump the array arity to 11 + add `"guest_claim_reaper"` to the vacuity list (`:2743-2749`). **Recommend M21c** (it touches a non-M21a `_tests.rs`); flag it in the PR body. `no-idle-accrual.eval.mjs` **does** discover it (recursive, all non-test files) and passes — the reaper calls no growth writer. |

**Verified NON-breakers** (checked, no action): `evals/currency-integrity.eval.mjs` (economy.rs stays compliant; no whole-file wallet count pin — `economy_tests.rs:1823-1840` uses `>= 1`); `ranking-security.eval.mjs` A1 (count stays 1), A2 (`ctx.db.profile()` stays in `ranking.rs`), B1/B2 (`apply_pvp_rating` untouched), C1a/C1b/C2; `evals/wallet-privacy.eval.mjs` (no view-count pin; `my_account` reads `account()` not `player_wallet()`); `evolution_tests.rs::a3_no_call_site_fabricates_a_tier` (vacuity guard `sites > 0`, not a count pin); `evals/economy-sinks-sources.eval.mjs` (no `grant_currency` call-site count pin); `evals/inventory-single-stack.eval.mjs` (no new insert); `evals/spec-gap-revival.eval.mjs` (name-based trade/transfer detector; none of the six new reducer names match); `evals/dev-reducer-gating.eval.mjs`, `evals/ci-gate-wiring.eval.mjs`, `scripts/verify-release-reducers.mjs` (no reducer-count / all-reducer allowlists).

---

## 7. Bindings-regen delta prediction (`just gen`)

**Evidence:** `client/src/module_bindings/` contains **no** `*_table.ts` for any private table (`monster`, `player_wallet`, `encounter`, `battle_wild`, `player_dialogue_state`, `heal_cooldown`, `battle_action`, `playtest_event`, and all four schedule tables are absent) but **does** contain `my_wallet_table.ts` and `my_conversation_table.ts`. `types.ts` nevertheless carries **every** row type including private ones (`PlayerWallet` `:457`, `Monster` `:266`, `BattleChallengeReaperSchedule` `:71`, `PlaytestReaperSchedule` `:476`). `index.ts` lists no lifecycle reducer (`init`, `client_disconnected`) and no scheduled reducer (`movement_tick`, `playtest_reaper`, the three others).

Predicted delta:

| Emitted | Not emitted |
|---|---|
| `my_account_table.ts` (**new**) | `account_table.ts`, `guest_claim_table.ts`, `guest_claim_reaper_schedule_table.ts` — private (this is exactly what G1's bindings probe asserts) |
| `start_guest_claim_reducer.ts`, `complete_guest_claim_reducer.ts`, `delete_account_reducer.ts`, `cancel_account_deletion_reducer.ts` (**4 new**) | `on_connect` (lifecycle), `guest_claim_reaper` (scheduled) |
| `types.ts`: `+AccountStatus` (`__t.enum`), `+Account` (`claimedFrom: __t.option(__t.identity())`, `deletionRequestedAtMs: __t.option(__t.i64())`, `status: AccountStatus`), `+GuestClaim`, `+GuestClaimReaperSchedule` — alphabetically first | |
| `index.ts`: `+MyAccountRow` import, `+my_account: __table({...})`, `+4 __reducerSchema(...)` entries | |

`client/src/**` outside `module_bindings/` stays untouched (M21b). Verify `just client-typecheck` after regen — additive bindings should not break it, but `evals/sdk-enum-exhaustiveness.eval.mjs` warrants a look if it enumerates generated enums.

---

## 8. Test plan skeleton (for the `tester`)

There is **no way to construct a `ReducerContext`** in this crate. Hence the functional-core split above: every behavioral criterion lands on a pure seam; every ctx-bound shell property lands on a source scan.

**Source-scan hygiene — non-negotiable (memory card):** eval and Rust scanners concatenate `server-module/src/**` and do **not** strip string literals. In `accounts_tests.rs` and every sibling `_tests.rs`:
- Never write a contiguous needle (`#[spacetimedb::table(`, `#[spacetimedb::reducer`, `ctx.db.monster().monster_id().update(`, `.inventory().insert(`, `player_wallet()`, `PlayerWallet{`, `profile().insert(`, `= ctx.db.profile()`, `.balance = `) as a literal — assemble with `concat!(...)` / `[..].concat()`.
- No `/*` sequences in comments; use `\u{0022}` (or a `0x22` char constant) instead of a raw double-quote character in comments.
- `accounts_tests.rs` must never contain `player_wallet()` / `PlayerWallet{` / `.balance =` at all (currency-integrity scans every file except `economy.rs`/`schema.rs`/`economy_tests.rs`) and must not contain an un-mirrored `monster().monster_id().update(` needle.
- clippy 1.96 `-D warnings` covers `--all-targets`, i.e. test files.
- Scrub per file, not over the concatenated blob (memory card: the regex-stripper misaligns across file boundaries).

### 8.1 AUTH → test matrix

| AUTH | Type | Owner file | Assertion |
|---|---|---|---|
| 1 | scan | `accounts_tests.rs` | `on_connect` body: the `has_jwt()` early return is the **first statement**; body contains zero `Err(` before it; body contains `return Ok(())`. Extract from `lib.rs` via `include_str!`. |
| 2 | pure + scan | `accounts_tests.rs` | `issuer_allowed("https://evil/", ALLOWED_ISSUERS) == false`; allowed-issuer true; exact-match (no prefix/suffix/case tolerance: `"https://auth.monster-realm.invalid"` without the trailing slash must be false). Scan: `provision_or_touch_account` body has the issuer check **before** any `.account().insert(`. |
| 3 | pure + scan | ″ | `audience_allowed(&[], A) == false`; `&["other"]` false; `&["other","monster-realm"]` true (multi-`aud` array); `&["MONSTER-REALM"]` false. Scan: audience check precedes the insert. |
| 4 | pure | ″ | `new_account_row(id, iss, 42)`: `status == Active`, `claimed_from.is_none()`, `claimed_at_ms.is_none()`, `deletion_requested_at_ms.is_none()`, `created_at_ms == last_login_at_ms == 42`, `auth_issuer == iss`. |
| 5 | pure | ″ | `touch_login(row, 99)`: `last_login_at_ms == 99` and **all seven other fields** byte-equal to the input (field-by-field asserts, not a `PartialEq`). Kills a mutant that also stamps `created_at_ms` or resets `status`. |
| 6 | scan | ″ | `schema.rs` `Account` field list contains none of `email`, `email_hash`, `auth_subject`; `accounts.rs` contains no `.subject(` and no `raw_payload(`. |
| 7 | scan | ″ | `start_guest_claim` body: `is_account_holder(` appears, and its index < the index of `is_valid_claim_code(`. |
| 8 | pure | ″ | Table: 64 lowercase hex → true. False for: 63 chars, 65 chars, empty, one uppercase `A`, one `g`, a leading space, 64 chars of `é` (byte-len 128), a 64-**byte** non-ASCII string, `"0".repeat(64)` → true. |
| 9 | pure + scan | ″ | `claim_row(...)`: `expires_at_ms == now + CLAIM_TTL_MS`, `created_at_ms == now`, fields bound as passed. Scan: `start_guest_claim` body contains `p.name` (never a `name:` reducer parameter) and its signature is exactly `(ctx: &ReducerContext, code: String)`. |
| 10 | scan | ″ | `start_guest_claim` body: index of `consume_claim_and_disarm(` < index of `.guest_claim()` + `.insert(`; and `arm_claim_reaper(` appears after the insert. |
| 11 | scan | ″ | `ctx.rng(` and `ctx.random(` absent from `accounts.rs` (G4 mirror). |
| 12 | scan | ″ | `complete_guest_claim`: `has_jwt()` index < `.account().identity().find(` index < `is_pending_deletion(` index. |
| 13 | scan | ″ | `is_pending_deletion(` present, before `claimed_from`. |
| 14 | scan | ″ | `claimed_from` check before `is_valid_claim_code(`. |
| 15 | pure + scan | ″ | Pure: `ERR_INVALID_CODE` is used by **both** paths ⇒ scan: exactly 2 `ERR_INVALID_CODE` references in `complete_guest_claim`'s body, and the literal string appears exactly once in the file (the const). |
| 16 | pure + scan | ″ | Pure: `claim_is_expired(100, 99) == false`, `(100,100) == true`, `(100,101) == true`. Scan: the expiry branch contains `consume_claim_and_disarm(` and the branch's `Err("code expired"` follows it; **AUTH-26 companion**: exactly 2 `consume_claim_and_disarm(` in the body (expiry + success), and the guard-1..15 region above the expiry branch contains **zero** `ctx.db.` write tokens. |
| 17 | scan | ″ | `guest_identity == me` (or `== ctx.sender`) check present, after the claim lookup, before the `player` read. |
| 18 | scan | ″ | `.player().identity().find(` present with the exact literal `"close your other tab, then retry"`. |
| 19 | scan | ″ | Body contains `is_in_ongoing_battle(` **twice** (guest and caller) and contains **no** `ctx.db.battle(` anywhere in `accounts.rs` (G5 mirror). |
| 20 | scan | ″ | `account_has_game_data(` present with `"already has game data"`, and it is the **last** guard before `rekey_all(`. |
| 21 | pure + scan | `accounts_tests.rs` + `ranking_tests.rs` + `economy_tests.rs` | Pure: `claimed_account(row, g, 7)` sets `claimed_from == Some(g)`, `claimed_at_ms == Some(7)`, other fields unchanged. Scan: `rekey_all` body references all six helper names in D6 order. |
| 22 | scan | `monster_mgmt` tests (add to `pvp_tests.rs`? **no** — new tests go in `accounts_tests.rs` via `include_str!("monster_mgmt.rs")`) | `rekey_monsters`'s extracted body contains all four of the `monster().monster_id().update(`, `monster_pub().monster_id().update(`, `pub_from_monster(`, and the fail-loud `else { return Err` needles. Rust-side mirror of `monster-dual-write.eval.mjs`. |
| 23 | scan | `economy_tests.rs` + `accounts_tests.rs` | `rekey_wallet` body: no `.delete(`, no `.try_delete(` (already enforced by `player_wallet_rows_are_never_deleted`, extended by the new fn automatically). `rekey_profile` body: no `profile().identity().delete`, no `profile().delete`. |
| 24 | pure + scan | `economy_tests.rs` | Pure: `zeroed_wallet(PlayerWallet{owner_identity:x, balance:500})` → `balance == 0`, `owner_identity == x`. Scan: `rekey_wallet` body contains `grant_currency(` and the `find(from)` read precedes it (credit-before-zero ordering). |
| 25 | pure | `ranking_tests.rs` | `tombstoned_profile(make_profile(id,"Ash",1800,40,3))` → `rating == 0 && wins == 0 && losses == 0 && name == PROFILE_TOMBSTONE_NAME && identity == id`. Plus `PROFILE_TOMBSTONE_NAME.chars().count() <= MAX_NAME_LEN` and `validate_name(PROFILE_TOMBSTONE_NAME).is_err()` (un-typable). Plus `profile_with_carried_stats(dest, 1800, 40, 3)` carries the three stats and **preserves `dest.name` and `dest.identity`** (kills a mutant that copies the guest's name across, violating D8.7). |
| 26 | scan | `accounts_tests.rs` | See AUTH-16 companion above. |
| 27 | pure + scan | ″ | Pure: `claim_is_expired` cases. Scan: `guest_claim_reaper` body contains `ctx.sender != ctx.identity()`, `guest_identity()`, `claim_is_expired(`, `.delete(args.guest_identity)`, and contains **no** `disarm_claim_reaper(` / `guest_claim_reaper_schedule()` token (no self-disarm, C3). |
| 28 | pure | ″ | `needs_deletion_write(Active) == true`, `needs_deletion_write(PendingDeletion) == false`. Plus `requested_deletion(row, 7)`: only `status` + `deletion_requested_at_ms` change. |
| 29 | pure | ″ | `cancelled_deletion(pending_row)`: `status == Active`, `deletion_requested_at_ms.is_none()`, **`claimed_from` and `claimed_at_ms` preserved**. |
| 34 | scan | ″ | The success region (from `rekey_all(` to the final `Ok(())`) contains `consume_claim_and_disarm(` **before** the `.account().identity().update(` and before `Ok(())`. G11 mirror. |
| 35 | pure + scan | ″ | Same-message property (see AUTH-15) + AUTH-34's structural guarantee. |
| 36 | scan | ″ | Every `log_reject(` in `accounts.rs`: the third argument is a bare `"…"` literal — no `format!`, no `{`, and none of `issuer`/`subject`/`audience`/`claims` appears inside any `log_reject(` or `log::` macro argument in the file. G12 mirror. |
| 37 | scan | ″ | `delete_account` body: `has_jwt()` first, `.account().identity().find(` second, `needs_deletion_write(` third. |
| 38 | pure | ″ | `needs_cancel_write(Active) == false`, `needs_cancel_write(PendingDeletion) == true`. |

### 8.2 G-gate Rust mirrors (per G7) in `accounts_tests.rs`
G2 (no `Identity`-typed parameter on any reducer in `accounts.rs` — extract each `#[spacetimedb::reducer]`'s signature, assert no `: Identity`), G3 (ANON_PASSTHROUGH + ISSUER_AND_AUDIENCE), G4 (NO_SERVER_RNG), G5 (MODULE_WRITE_ISOLATION: no `.insert(`/`.update(`/`.delete(` chained off `ctx.db.<t>()` for any `t` outside the three owned tables; literal `ctx.db.battle(` banned; bare reads of `player` permitted), G6 (REKEY_COMPLETENESS: parse only the **field list** of each `#[spacetimedb::table(...)]`-tagged struct across non-test `server-module/src/*.rs` for `: Identity` / `: Option<Identity>` — never a whole-file line match, which false-positives on ~17 function-parameter sites; assert `playtest_event` → EXEMPT; assert every REKEY helper name appears in **both** `rekey_all` and `account_has_game_data`), G11 (SINGLE_USE_CONSUMED), G12 (NO_PII_IN_REJECT_LOGS).

**Note for the G6 author:** the new `account`/`guest_claim`/`guest_claim_reaper_schedule` tables each carry `Identity` columns and need manifest policies: `account.identity` → **EXEMPT** (the destination key itself; a claim never re-keys an account row), `account.claimed_from` → **EXEMPT** (audit provenance; must survive by design — AUTH-21), `guest_claim.guest_identity` and `guest_claim_reaper_schedule.guest_identity` → **BLOCKED** (both consumed and deleted by `consume_claim_and_disarm` in the same transaction, AUTH-34). Get these into the manifest const in M21a even though the gate ships in M21c, otherwise M21c's first run reds on four un-policied columns.

### 8.3 Proof-of-teeth obligations (the mutation each scan must kill)
Every scan above needs a *stated* mutation and, for the machinery-heavy ones (guard-order extraction, field-list parsing, log-argument parsing), an inline BAD/GOOD/EVASION fixture triple mirroring `ranking_tests.rs:1312-1324`:

| Test | Mutation it must kill |
|---|---|
| AUTH-1 scan | Move `provision_or_touch_account(ctx)` above the `has_jwt()` return (any `Err` becomes reachable for an anonymous client). |
| AUTH-3 scan | Delete the audience block (the exact BAD fixture G3 mandates). |
| AUTH-5 pure | Also stamp `created_at_ms = now_ms` in `touch_login`. |
| AUTH-8 pure | Swap `matches!(b, b'0'..=b'9' | b'a'..=b'f')` for `b.is_ascii_hexdigit()` (accepts uppercase). |
| AUTH-10 scan | Move `consume_claim_and_disarm` after the insert (unique-constraint abort / orphaned schedule row). |
| AUTH-16/26 scan | Add `consume_claim_and_disarm` to the `already has game data` branch (a rejected claim silently burns the code). |
| AUTH-22 scan | Drop the `monster_pub` mirror, or drop `pub_from_monster` and hand-patch `owner_identity`. |
| AUTH-24 scan | Move the zero-update before `grant_currency` (credits 0 — silent balance destruction). |
| AUTH-25 pure | Delete the three `rating/wins/losses = 0` assignments from `tombstoned_profile` — **the CRITICAL unbounded ranked-duplication path**; this is the single most important tooth in the slice. Second mutant: copy `guest.name` into the destination instead of preserving `dest.name`. |
| AUTH-27 scan | Add a self-disarm (races the runtime delete); remove the staleness re-check (reaps a fresh replacement claim); replace the PK delete with an unfiltered iterate-and-delete. |
| AUTH-28 pure | Make `needs_deletion_write` return `true` unconditionally (re-stamps the timestamp on the second call). |
| AUTH-34 scan | Disarm only on the expiry branch (G11's mandated BAD fixture) — leaves a valid code for the remaining TTL after a successful claim. |
| AUTH-36 scan | Change a reason to `format!("issuer {} rejected", issuer)`. |
| G6 machinery | Feed a fixture whose only `: Identity,` is `guards::require_owner`'s parameter — must **not** be flagged; and a fixture with a new table carrying an un-policied `Identity` column — must be flagged. |
| ranking update-count re-scope | Delete one of `apply_pvp_rating`'s two update spreads (per-fn pin catches it); add an eager write to `get_or_init_profile`'s `Some` arm (the 0-pin catches it). Both must go RED. |

---

## 9. Ordered implementation steps (compile-dependency chain + gate per step)

Fast gate for T1–T7 = `cargo clippy -p monster-realm-module --all-targets --all-features -- -D warnings` then `cargo nextest run -p monster-realm-module` (i.e. `just ci-fast monster-realm-module`, which adds the doctest pass). Commit after each numbered step.

- **T0 — probe + ratify (§0).** Run the `has_jwt()` probe; get D1′/D4′ + C1/C2/C3/C5 ratified; land the spec/ADR one-liners. **Blocks T3.** *(No code.)*
- **T1 — schema.** `schema.rs`: `AccountStatus`, `Account`, `my_account`, `GuestClaim`. Gate: `cargo check -p monster-realm-module`. Expect the two baseline evals to be red until T8.
- **T2 — six existence helpers + six `rekey_*`,** one commit per owning module (6 commits, each independently compiling): `monster_mgmt.rs` → `inventory.rs` → `npc.rs` → `raising.rs` → `economy.rs` → `ranking.rs`. Gate per commit: `just ci-fast monster-realm-module`. **`ranking.rs` will be RED on `d1_scan_no_eager_write_in_get_or_init` until T2b.**
- **T2b — re-scope `ranking_tests.rs`'s update-count pin** (§6 row 1). Gate: `cargo nextest run -p monster-realm-module` green.
- **T3 — `accounts.rs` pure core.** Constants + all 12 pure seams, no reducers yet. Gate: `just ci-fast monster-realm-module`.
- **T4 — `accounts_tests.rs` pure-unit half** (tester writes, orchestrator runs — the `tester` subagent has no Bash). Gate: `cargo nextest run -p monster-realm-module`.
- **T5 — `accounts.rs` shell.** `is_account_holder`, `is_pending_deletion`, `account_has_game_data`, `rekey_all`, `delete_claim`/`disarm_claim_reaper`/`consume_claim_and_disarm`/`arm_claim_reaper`, `provision_or_touch_account`, the 4 reducers, `GuestClaimReaperSchedule` + `guest_claim_reaper`, `#[cfg(test)] mod accounts_tests`. Gate: `just ci-fast monster-realm-module`.
- **T6 — `lib.rs` wiring.** `mod accounts;` + `on_connect`. Gate: `just ci-fast monster-realm-module` + `just build` (proves the module actually compiles to wasm — the `scheduled(...)` typecheck and the view registration only fire in the real build).
- **T7 — source-scan test half** in `accounts_tests.rs` + the sibling additions to `economy_tests.rs` / `ranking_tests.rs`. Gate: `cargo nextest run -p monster-realm-module`; then run each proof-of-teeth mutation by hand and confirm RED, then revert.
- **T8 — baselines.** `evals/baselines/table-schemas.json` + `evals/baselines/spacetime-types.json`. Gate: `node evals/run.mjs` (or the two evals directly).
- **T9 — bindings.** `just gen`; commit. Gate: `just client-typecheck`.
- **T10 — knowledge bundle.** `just knowledge` **after** T1–T9 are committed (gitDate). Optional: the 3 `PRIVATE_ADRS` lines first, then regen. Gate: `just knowledge-check`.
- **T11 — spec checkboxes** in `specs/monster-realm-v2/M21-accounts-auth.spec.md` §4 (M21a rows only) + the C1/C2/C5 corrections.
- **T12 — the single full `just ci`.** `lint typecheck test eval security wasm client-typecheck client-test` (`justfile:355`). Export the toolchain PATH first (memory card: default node is v18 and cargo is absent). **Reminder:** `gitleaks` is remote-only and runs before every other CI gate — `just ci` cannot catch it locally, and force-push is hook-blocked, so squash onto a fresh branch if it fires.
- **T13 — migration rehearsal (§10).**
- **T14 — graph refresh** (build-loop step 10, orchestrator-run): cbm `detect_changes` + `index_repository` on `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm`, plus `codegraph sync` if no daemon is running. **The graphs index the canonical checkout, not `.claude/worktrees/M21a/` — refresh after the merge, not in the worktree.**

---

## 10. Automigration — a real old→new rehearsal is warranted

Everything is additive (3 new tables, 1 new enum, 1 new view, 1 new scheduled table, 4 new client-callable reducers, 2 new host-invoked reducers; **zero** column changes to existing tables ⇒ no `#[default(...)]` and no BSATN tail-append constraint). D10: **no `CONTENT_VERSION` bump**.

**`just smoke-republish` is the wrong tool here.** It patches `CONTENT_VERSION` to force a re-seed (`justfile:172-179`, `scripts/smoke-republish.sh`) — it exercises re-seeding on the *current* schema, not an old→new migration.

**Do the manual two-publish rehearsal** (~15 min, prior schema slices did the same, and EG1's `#[default(0i64)]` publish rejection is the memory card proving this class of failure is real and only observable live):
1. `git stash` / check out `master`; `MR_SMOKE_DB=mr-m21a-mig STDB_SERVER=… spacetime publish --module-path server-module --delete-data -y mr-m21a-mig`; `spacetime call … sync_content`.
2. Create real rows across every REKEY class: connect, `join_game`, `buy`/`sell` (wallet + inventory), `talk` (quest + dialogue state), `heal_party` (heal_cooldown), one rated PvP or a direct profile seed.
3. Return to the M21a branch; `spacetime publish --module-path server-module -y mr-m21a-mig` **without `--delete-data`**. **Assert: the automatic migration is ACCEPTED** and the pre-existing rows survive.
4. Specifically confirm the two untested-in-this-repo shapes: a **new `#[view]`** and a **new `scheduled(...)` table + its reducer** are both accepted by an automatic migration.
5. `spacetime sql mr-m21a-mig "SELECT * FROM account"` → empty (nothing provisions with the `.invalid` placeholder issuer). Reconnect anonymously and confirm the client still works — **this is also the live confirmation of §0**.

If step 3 is rejected, that is a halt-and-report: the slice needs an ADR-0177-style runbook, not a plain republish.

---

## 11. Anti-patterns to avoid (named)

1. **Centralizing the re-key.** A generic cross-table re-keyer in `accounts.rs` is red on the first `just eval` (three live gates). Six helpers in six owning modules, no exceptions.
2. **Reading the wallet from `accounts.rs`.** ACCESSOR_BYPASS gates **reads**. `wallet_exists` lives in `economy.rs`; `accounts.rs` must not contain the token `player_wallet` at all — not in code, not in a string, not in an assert message.
3. **Re-deriving battle liveness.** Reuse `guards::is_in_ongoing_battle` (ADR-0122 D1). `ctx.db.battle(` is banned in `accounts.rs` by G5.
4. **Hand-patching the `monster_pub` mirror.** Must go through `pub_from_monster(&m, existing_pub.tier)`; must fail loud on a missing pub row; never a literal `0`/`unwrap_or(0)`/`unwrap_or_default()` tier; never a `MonsterPub {` literal.
5. **A direct `profile().insert(` in `rekey_profile`.** Breaks the count-1 pin. Use `get_or_init_profile`.
6. **Deleting a `player_wallet` or `profile` row.** Ever. Credit/copy forward, then zero in place.
7. **Skipping the guest-side zero.** `tombstoned_profile` and `zeroed_wallet` are the *only* thing stopping unbounded stat/balance duplication across repeated claims. Not cosmetic.
8. **Bumping the ranking update-count pin from 2 to 4.** Re-scope per-function instead; a bare bump deletes the tooth.
9. **Server RNG.** No `ctx.rng()`, no `ctx.random()`, no server-minted code. The secret is client-minted (D3).
10. **`format!` on any reject path in `on_connect`/`provision_or_touch_account`,** and never a claim value in a log line (AUTH-36/G12).
11. **An `Identity` reducer parameter.** Every reducer derives identity from `ctx.sender` only (G2, ADR-0030 anti-spoofing).
12. **Self-disarming inside `guest_claim_reaper`.** Races the runtime's post-execution delete of the one-shot row.
13. **Re-stamping `deletion_requested_at_ms`** on a repeated `delete_account`.
14. **Contiguous scan needles inside string literals** in any `_tests.rs`, and `/*` in comments. Use `concat!` and `\u{0022}`.
15. **`cargo … -p server-module`.** The package is `monster-realm-module`.
16. **Constructing a `ViewContext`** anywhere (`ViewContext::new(` / `ViewContext {`) — a forged-sender vector, banned by `wallet-privacy` and `economy_tests.rs` R3.
17. **Adding `email` / `email_hash` / `auth_subject`,** or calling `claims.subject()` (D9/AUTH-6).
18. **Editing gating tests to fit the implementation** — the implementer never edits its own gating tests.

---

## 12. Risks & mitigations

| Risk | Sev | Mitigation |
|---|---|---|
| SpacetimeDB's anonymous credential is a JWT ⇒ AUTH-2/3's `Err` disconnects every returning player and AUTH-7 kills the claim flow (§0) | **CRITICAL** | T0 probe + D1′ (never disconnect on an unrecognized issuer) + D4′ (`is_account_holder` is the account predicate, not `has_jwt()`). Fail-safe in both worlds. |
| `ranking_tests.rs` update-count pin reds mid-slice and gets "fixed" by a number bump | HIGH | §6 row 1 prescribes the per-function re-scope; T2b is its own gated step. |
| Baselines / knowledge bundle / bindings forgotten ⇒ `just ci` reds at the end of a long slice | HIGH | T8/T9/T10 are explicit numbered steps with their own gates; the three files are added to `touches:` (C5). |
| Automigration rejects the new view or scheduled table on a live DB | HIGH | §10 rehearsal before merge; halt-and-report if rejected. |
| `AccountStatus` written on one line ⇒ invisible to the type snapshot (silently ungated), or baselined-but-unparsed (hard red) | MED | §2 note; T8 verifies by running the eval. |
| Scheduled-table placement (C1) diverges from the spec ⇒ M21c's eval author scans the wrong file | MED | Record C1 in the ADR **and** in the M21a PR body; name `accounts.rs` as the scan target for the reaper needles. |
| `guest_claim_reaper` silently skipped by `evolution_tests.rs` EG2-9 and `pvp_tests.rs` RL-2 (un-listed files) | MED | Flagged as M21c work in §6; both are green today, so this is rot-prevention, not a blocker. |
| OQ2 unanswered ⇒ `rekey_profile` may be dead code (if ranked requires an account, the guest profile can never exist) | MED | Ask Drew before T2's `ranking.rs` commit. If "yes", `rekey_profile` + `profile_exists` + `PROFILE_TOMBSTONE_NAME` + AUTH-25 all disappear and the slice gets *smaller* — cheap to ask, expensive to un-build. Spec default is "no". |
| Malformed-JWT panic aborts the connect transaction | LOW | Accepted + documented (§3.4): same observable outcome as a reject, no row written, no PII in any panic message. |
| `guest_claim` unique-code collision aborts a mint | LOW | 256 bits of CSPRNG; documented; no pre-check (a pre-check is a code-existence oracle). |
| `start_guest_claim` flood (no rate limit) | LOW (accepted) | Bounded by connection throughput, self-cleaning via the 15-min reaper, and — new here — by requiring a `player` row (§3.5 guard 3), which forces a full `join_game` per identity. Named in the spec's risk list. |
| OQ1/OQ3 unanswered | LOW | `.invalid` placeholder is fail-closed; OQ3 is a governance ack that gates nothing. |

---

## 13. Recommended workflow pattern

**`brainstorm`-lite on §0 only, then `solo` (`specialist`, high effort) for the build — with the standard split test ownership and a mandatory `red-team` pass on `complete_guest_claim`'s guard order + `rekey_profile`/`rekey_wallet`.**

One-line cost/benefit: the implementation surface is fully determined by this plan (exact signatures, exact guard order, exact error strings, every gate pin enumerated), so `compete`/`debate` would buy nothing — but the single genuinely contested question (§0's `has_jwt()` premise and the D1′/D4′ amendments) is a 10-minute empirical probe plus a ratification decision that must not be made unilaterally by an implementer, and the two never-delete/never-duplicate helpers are exactly the shape where a red-team pass historically finds a CRITICAL in this milestone.

---

## Files touched (absolute paths)

**Server module**
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/schema.rs`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/accounts.rs` *(new)*
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/accounts_tests.rs` *(new)*
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/lib.rs`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/monster_mgmt.rs`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/inventory.rs`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/npc.rs`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/raising.rs`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/economy.rs`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/ranking.rs`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/economy_tests.rs`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/ranking_tests.rs` **(blocker fix — §6 row 1)**

**Generated / baselines / docs (added to `touches:` — C5)**
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/module_bindings/**`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/evals/baselines/table-schemas.json`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/evals/baselines/spacetime-types.json`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/docs/knowledge/**`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/scripts/okf-export.mjs` *(optional, recommended)*
- `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M21-accounts-auth.spec.md`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/docs/adr/0179-accounts-auth-implementation-design.md` *(D1′/D4′ amendments + C1/C2/C3 corrections + the T0 probe evidence)*

**Deferred to M21c (flag in the PR body so they are not lost):** `server-module/src/pvp_tests.rs` (G9 file list), `server-module/src/evolution_tests.rs` (`scheduled_scan_sources` + the EG2-9 vacuity list).

Sources: [Using Auth Claims — SpacetimeDB 1.12.0](https://spacetimedb.com/docs/1.12.0/core-concepts/authentication/usage/), [Authentication — SpacetimeDB 1.12.0](https://spacetimedb.com/docs/1.12.0/core-concepts/authentication/), [Authorization — SpacetimeDB HTTP](https://spacetimedb.com/docs/http/authorization/), [Connecting to SpacetimeDB — 1.12.0 SDKs](https://spacetimedb.com/docs/1.12.0/sdks/connection/)