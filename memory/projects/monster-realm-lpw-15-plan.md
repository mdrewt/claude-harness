# lpw-15 — plan: a world's module binds an identity to an account; ownership and the allowlist

Spec: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-15 · design: game `docs/local-play.md` §3
"The access and attestation design", forks (b), (c), (e) · base `origin/master` 5616a510 ·
worktree `.claude/worktrees/lpw-15` · branch `slice/lpw-15`. Revised after the plan review
(reviewer and red-team; their findings and what each became are at the end).

## Sizing: the module half ships, the client bind flow is deferred

The slice as specified is two slices. The access design (recorded after the slice's `touches:` was
written) added to it a table of the world's names and its writer, owner-relayed forms of the nonce
and the bind, and views that hand a client its nonce and its binding. The client half needs files
the list does not name (`net/connection.ts`, `net/store.ts`, `shell/session.ts`,
`net/shellDocument.ts`, `net/connectionConfig.ts`, the pinned subscription set) and a development
recipe in `justfile`, which `mr-touches` never grants. Its naming rules are also about to change:
the operator's ruling on monster-realm#833 (a browser joins a friends server by address) is not yet
written into the spec.

Ships here: every schema change the slice names (always-serial, so all of it lands at once), the
verifier, the six reducers, `entitled` reading a binding, `Allowlist`, the deletion and export
steps, regenerated bindings. Gates lpw-15.1, .2, .3, .4, .5, .7.

Deferred: the client's bind flow. Gates lpw-15.6 and lpw-15.8, both `-> backlog`. Nothing a player
runs enforces ownership in a `local` or `private` world today (no `world` build holds a key), so
the gap is a missing flow, not an open door. Fork (c)'s client half (the name function,
`client/src/net/attestation.ts`) moves with it. lpw-15.4's criterion is the module's refusal, which
is built and tested here; the residual R-lpg-0-ATTESTRELAY stays open, as the design says, until
the two-host run (R-lpw-8-RELAYRIG).

## Schema (`server-module/src/schema.rs`), all additive, all tables private

```rust
pub enum WorldAccessRule { Open, Password, Allowlist }          // tail-append

#[spacetimedb::table(accessor = world_binding)]
pub struct WorldBinding {
    #[primary_key] pub identity: Identity,
    pub account_subject: String,   // the attestation's `sub`
    pub bound_at_ms: i64,
    pub entitled: bool,            // the attestation's `mr_ent` named `base-game`
    pub key_id: String,            // the `kid` of the key that signed the attestation
}

#[spacetimedb::table(accessor = world_bind_nonce)]
pub struct WorldBindNonce {
    #[primary_key] pub identity: Identity,
    pub nonce: String,             // 32 lowercase hex characters
    #[index(btree)] pub expires_at_ms: i64,
}

#[spacetimedb::table(accessor = world_name)]
pub struct WorldName { #[primary_key] pub name: String }

#[spacetimedb::table(accessor = world_allowlist)]
pub struct WorldAllowlist { #[primary_key] pub account_subject: String }

#[spacetimedb::view(accessor = my_bind_nonce, public)]
fn my_bind_nonce(ctx: &ViewContext) -> Option<WorldBindNonce>     // the sender's own row
#[spacetimedb::view(accessor = my_world_binding, public)]
fn my_world_binding(ctx: &ViewContext) -> Option<WorldBinding>    // the sender's own row
```

`DATA_LIFECYCLE_MANIFEST`: `world_binding` Erase, not exported (the first build exported it; the
account e2e eval holds a hand transcription of the exportable tables and refuses a chunk it does
not list, and `evals/account-e2e.eval.mjs` is not grantable, so the export clause is a follow-up);
`world_bind_nonce` Erase, not exported; `world_name` NotOwned; `world_allowlist` NotOwned (the host's own list of account
subjects, written only by the owner, no `Identity` column). The cascade calls
`world_binding::erase_world_binding`, which deletes the identity's binding and nonce. The guest
claim neither moves nor erases either (`NOT_REKEYED`, as `world_admission`). The owner reads a
relayed joiner's nonce as the database owner, over SQL.

## Trust lists (`server-module/src/accounts.rs`)

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct AttestationKey { pub(crate) kid: &'static str, pub(crate) public_key: [u8; 32] }
pub(crate) const PRODUCTION_ATTESTATION_KEYS: &[AttestationKey] = &[];
pub(crate) const DEV_ATTESTATION_KEYS: &[AttestationKey] = &[/* local-dev, as published */];
BuildProfile { .., attestation_keys: &'static [AttestationKey] }   // new last field
```

`build_profile`: `official` none; `world` production (empty until the two-host relay run);
`conflict` none; `test` and `dev-enforcing` dev; `default` none. No row holds production and dev
keys together. A test holds `DEV_ATTESTATION_KEYS` to the generated file
`account-service/attestation-public-keys.json` (its `local-dev` and `hosted-dev` lists).

`entitled(ctx, profile)`: not enforcing, or the token rule (unchanged), or
`world_binding::bound_entitled(ctx, profile, ctx.sender())`.

## `server-module/src/world_binding.rs` (new; alone writes the four tables)

Constants (`pub(crate)`):
`REJECT_BUILD_BINDS_NOTHING = "this server takes no world binding"`,
`REJECT_ATTESTATION_TOO_LONG = "attestation too long"`,
`REJECT_ATTESTATION_MALFORMED = "malformed attestation"`,
`REJECT_ATTESTATION_UNKNOWN_KEY = "unknown attestation key"`,
`REJECT_ATTESTATION_SIGNATURE = "attestation signature does not verify"`,
`REJECT_ATTESTATION_EXPIRED = "attestation expired"`,
`REJECT_ATTESTATION_OTHER_WORLD = "attestation names another world"`,
`REJECT_NO_BIND_NONCE = "no outstanding nonce for this identity"`,
`REJECT_ATTESTATION_OTHER_NONCE = "attestation carries another nonce"`,
`REJECT_WORLD_NAME = "a world name is 1 to 512 visible ASCII characters"`,
`REJECT_TOO_MANY_WORLD_NAMES = "a world has at most 16 names"`,
`REJECT_ALLOWLIST_ACCOUNT = "an allowlist account is 1 to 255 visible ASCII characters"`,
`REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS = "an allowlist has at most 256 accounts"`,
`REJECT_DUPLICATE_ENTRY = "the list repeats an entry"`;
`ATTESTATION_MAX_BYTES = 4096`, `BIND_NONCE_TTL_MS = 300_000`, `BIND_NONCE_BYTES = 16`,
`BIND_NONCE_SWEEP_MAX = 32`, `WORLD_NAME_MAX_BYTES = 512` (the route's `MAX_WORLD_LENGTH`),
`MAX_WORLD_NAMES = 16`, `ACCOUNT_SUBJECT_MAX_BYTES = 255` (the route's subject bound),
`MAX_ALLOWLIST_ACCOUNTS = 256`.

Pure core:

```rust
pub(crate) struct VerifiedAttestation {
    pub(crate) key_id: String, pub(crate) subject: String, pub(crate) audience: String,
    pub(crate) nonce: String, pub(crate) expires_at_s: i64, pub(crate) entitled: bool,
}
pub(crate) fn verify_attestation(keys: &[AttestationKey], attestation: &str)
    -> Result<VerifiedAttestation, &'static str>
pub(crate) fn attestation_expired(expires_at_s: i64, now_ms: i64) -> bool   // now_ms >= exp * 1000, saturating
pub(crate) fn bind_nonce_expired(expires_at_ms: i64, now_ms: i64) -> bool   // now_ms >= expires_at_ms
pub(crate) fn is_visible_ascii(text: &str, max_bytes: usize) -> bool        // 1..=max bytes of 0x21..=0x7E
pub(crate) fn binds_nothing(profile: &BuildProfile) -> bool                 // its key list is empty
```

`verify_attestation`, in order: longer than `ATTESTATION_MAX_BYTES` is `TOO_LONG` before anything
is decoded; not exactly three `.`-separated segments is `MALFORMED`; each segment is strict
unpadded base64url (`base64` 0.21 `URL_SAFE_NO_PAD`: padding, another alphabet and non-canonical
trailing bits are `MALFORMED`); the header is a JSON object with a string `kid` (missing, not a
string, or repeated is `MALFORMED`), its `alg` and every other member are never read; no key of
`keys` has that `kid` is `UNKNOWN_KEY`; a signature that is not 64 bytes is `MALFORMED`;
`ed25519-dalek` `verify_strict` over the bytes `<header segment>.<payload segment>` fails is
`SIGNATURE` (a listed key that is not a valid point also); then the payload: a JSON object with
string `sub`, `aud`, `nonce`, integer `exp`, optional `mr_ent` an array of strings, other members
ignored, a repeated or wrongly typed one of these is `MALFORMED` (`serde` derive over
`serde_json`); `sub` not `is_visible_ascii(.., 255)` is `MALFORMED`. `entitled` is whether one
element of `mr_ent` equals `ENTITLEMENT_BASE_GAME`. `iss`, `iat` and `jti` are not read: the key
list is the trust anchor, and the nonce bounds an attestation's life and use.

Context-bound reads:

- `trusted_binding(ctx, profile, identity) -> Option<WorldBinding>`: `None` without reading when
  `binds_nothing(profile)`; otherwise the identity's row when its `key_id` is the `kid` of one of
  the profile's keys. A binding signed by a key the build does not hold counts for nothing.
- `bound_entitled(ctx, profile, identity)`: a trusted binding whose `entitled` is true.
- `on_allowlist(ctx, account_subject)`.
- `erase_world_binding(ctx, identity)`.

Reducers. The four that bind start with the build guard: `binds_nothing(&BUILD_PROFILE)` answers
`REJECT_BUILD_BINDS_NOTHING` before anything is decoded, read or written.

| Reducer | Guards, in order | Does |
|---|---|---|
| `request_bind_nonce()` | build; `access::require_admitted`; `guards::require_not_deleting` | deletes at most `BIND_NONCE_SWEEP_MAX` expired nonce rows; the sender's one row becomes 16 bytes of `ctx.random()` XORed with the first 16 bytes of the identity (`Identity::to_byte_array`), as lowercase hex, expiring `BIND_NONCE_TTL_MS` from now. `ctx.random()` is a function of the call's timestamp alone, so the identity is mixed in: two identities never hold the same nonce, even from calls at the same instant (lens fix) |
| `request_bind_nonce_for(who)` | build; `access::require_world_owner`; `guards::require_subject_not_deleting(ctx, who)` | the same for `who` |
| `bind_world_account(attestation)` | build; `require_admitted`; `require_not_deleting` | binds the sender |
| `bind_world_account_for(who, attestation)` | build; `require_world_owner`; `require_subject_not_deleting(ctx, who)` | binds `who` |
| `set_world_names(names)` | `require_world_owner` | replaces the set; refused: more than 16, an entry that is not `is_visible_ascii(.., 512)`, a repeated entry; an empty list clears it |
| `set_world_allowlist(accounts)` | `require_world_owner` | replaces the set; refused: more than 256, an entry that is not `is_visible_ascii(.., 255)`, a repeated entry; an empty list clears it |

The bind is one function, `bind_identity(ctx, profile, who, attestation, reducer)`, which the two
bind reducers call after their guards with `&BUILD_PROFILE`. In order, each refusal its own
constant and nothing written before the last check passes: `verify_attestation` with the profile's
keys; `attestation_expired` against `ctx.timestamp` is `EXPIRED`; `audience` is not a `world_name`
row, byte for byte, is `OTHER_WORLD`; no nonce row for `who`, or the row expired, is
`NO_BIND_NONCE`; the row's nonce is not the claim's is `OTHER_NONCE`. Then: the identity's binding
becomes `{account_subject, bound_at_ms: now, entitled, key_id}` (insert or replace: the latest
attestation an identity presents wins) and its nonce row is deleted.

`access.rs`:

- `is_admitted` under `Allowlist`: the owner; else, when the identity has a trusted binding,
  whether its account is on the list, and nothing else; else (no trusted binding) whether it holds
  a `world_admission` row. A bound identity is governed by the list alone, so taking an account
  off it refuses that account's identities at the next check; an identity that presents no
  attestation gets in only when it was admitted before. Nothing is written at connect.
- `set_world_access`: `Allowlist` takes no password (`REJECT_ALLOWLIST_TAKES_NO_PASSWORD = "an
  allowlist world takes no password"`) and clears the stored one. Whenever the rule changes to one
  that is not `Open`, every identity with a live connection that the rule in force before the call
  admitted gets an admission row (the owner excepted), so a connection the old rule let in stays
  admitted and one it had refused is not let back in. Under `Open` that is every live identity.
  (Lens fix: the first build admitted every live session on any change, which let a delisted or
  removed identity that was still connected back in.)
- `require_world_owner` becomes `pub(crate)`.

`privacy.rs`: unchanged (see the manifest note above).

## Decisions taken here

1. The build guard is "this profile holds no attestation key", not "this profile is named
   official": fork (b) derives the refusal from the empty list, and it also closes the default,
   conflict and (today) world builds.
2. A binding records the `kid` that signed it and counts only while the build holds that key: a
   binding made under a dev key admits nobody after a republish as `world`, and retiring a key
   retires its bindings.
3. `Allowlist` is read at every check and never stored. A bound identity is governed by the list
   alone; a `world_admission` row is the way in only for an identity with no trusted binding
   (`accept-seen-refuse-new`). The host's own player gets in by its account being on the list.
4. The latest attestation an identity presents replaces its binding. Only that identity's own
   connection or the owner can present one for it.
5. Refusals carry distinct constants (as `access.rs`), so a test names the check that fired. None
   is an oracle: the keys are public, the nonce is the caller's own, and learning that a name is
   not this world's needs a signed attestation for that name.
6. The signature is checked before the payload is parsed: only the header's `kid` is read from
   unauthenticated bytes.
7. `exp` is compared with the host's clock with no leeway, as the account service checks its own
   tokens; a host whose clock runs more than five minutes fast cannot bind.
8. Dependencies: `ed25519-dalek` 3.0.0 with no default features (new, as lpw-7 measured);
   `serde` (derive), `serde_json` and `base64` 0.21 as direct dependencies, all three already in
   the lock. Dev-only: `sha2`, to derive the `local-dev` signing key as `account-service` does.

## Tests (the tester writes them; module names are the ledger's selectors)

`server-module/src/world_binding_tests.rs`, module `world_binding::world_binding_tests`:

- `bind_accepts::` (lpw-15.1).
- `bind_refuses::` (lpw-15.2): the verifier's refusals over injected keys, and the bind's own.
- `binding_build::` (lpw-15.3, every build): `binds_nothing` over all 64 feature sets;
  `trusted_binding` and `bound_entitled` under a keyless profile and under a profile that does not
  hold the row's key.
- `official_build::` (lpw-15.3, `#[cfg(all(feature = "official", not(feature = "world")))]`): the
  four real reducers and real `join_game`.
- `relay_rig::` (lpw-15.4).
- `allowlist::` (lpw-15.5), with `access_tests.rs` `allowlist::`.
- `acs6_enforcing_bound::` (lpw-15.7, `#[cfg(all(feature = "dev_issuers", not(feature =
  "open_join")))]`; the name is what the `just test` line for the dev-enforcing build selects).
- `open_join_unbound::` (`#[cfg(feature = "open_join")]`).

## Not provable in `just ci`

The `official`-build run of lpw-15.3 is the ledger's CHECK; `just test` has no `official` line and
`justfile` is not grantable. A note files the line as a follow-up:
`cargo nextest run --workspace --no-default-features --features monster-realm-module/official -E
'package(monster-realm-module) & test(/official_build/)'`.

## Plan review: what each finding became

Red-team: (1) bindings outlive the key that signed them -> `key_id` and `trusted_binding`
(decision 2). (2) the allowlist read had no keyless guard -> it goes through `trusted_binding`.
(3) an admission row overrode delisting -> decision 3. (4) the relayed forms ignored a deleting
`who`; nonce erasure unstated -> `require_subject_not_deleting`; `erase_world_binding` deletes
both. (5) an unadmitted identity cannot reach erasure, and a `world` build has no account to
delete or export through -> not built here: a residual note. (6) no owner unbind -> not built: the
owner deletes rows over SQL, as for admissions; a note. (7) unbounded nonce sweep ->
`BIND_NONCE_SWEEP_MAX`. (8), (10) test gaps -> in the tester's brief. (9) `iss`, `iat` unread ->
stated in the verifier's contract; no `exp` ceiling (decision 7). (11) unlimited refusal logging
-> as every other reducer refusal; not changed.

Reviewer: files outside `touches:` -> `mr-touches widen` at the measuring step. A binding view for
the client -> `my_world_binding`. Census rows -> the two set reducers write only `NotOwned` tables
(no classified write); the four others carry a depth-0 gate. `world_allowlist` policy -> basis
stated. Test signing -> the `local-dev` key is derivable; `verify_attestation` takes the key list,
`bind_identity` the profile. No deletion path on a `world` build -> decision 4 and the residual
note. lpw-15.4 in halves -> stated above. `Allowlist` semantics -> decision 3, with each
transition a test. `serde` -> listed. Duplicates, constants, the stale comments in `accounts.rs`
and `movement.rs` -> done in the build.
