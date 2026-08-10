# M21 — Accounts & authentication

**Status:** design sketch → **elaborated at build time** (heavy ceremony, 2026-08-08) · **Phase D** · **Decision:** ADR-0030 + ADR-0179 + ADR-0182 (M21b-2, 2026-08-10)

> **M21b-2 elaborated 2026-08-10** (heavy ceremony: 6-way independent ideation, each adversarially
> reviewed → judge synthesis with mandatory attribution table, itself adversarially reviewed → two
> further independent finalization reviews, security + completeness). Full design in
> [ADR-0182](../../projects/monster-realm/docs/adr/0182-m21b2-oidc-client-claim-ui-better-auth-deployment.md).
> The finalization passes found and fixed one CRITICAL unhandled-throw deadlock, one CRITICAL
> uninitialized counter, one HIGH stale-flag bug, one HIGH deferred-not-defaulted DR residual, plus
> several MAJOR/MODERATE gaps (a "reactivate" task pointing at a test file that does not exist; two
> ungated EARS criteria; an unfixed attribution-table gap; missing claim-code-minting coverage) — all
> closed in ADR-0182 and reflected in AUTH-39..60 below. This is a scoping pass only — no code changes.

> Provisional sketch promoted to build-ready spec via the harness heavy-ceremony pipeline
> (investigation → 6-way independent ideation, each adversarially reviewed → synthesis, itself
> adversarially reviewed — `memory/projects/mr-feedback-doctrine.md` §6). The synthesis review
> pass found and closed one internal contradiction in its own first draft (a module-write-isolation
> invariant violated by its own worked example) before this spec was written, plus four new
> repo/vendor-doc findings (audience-check gap, a missing reaper index, an unsound client
> token-replay design, an inconsistent doc-version caveat). A subsequent finalization pass ran two
> more independent adversarial reviews (security/red-team; completeness) against this spec and
> ADR-0179 together; they found a CRITICAL unbounded ranked-stat duplication path, a CRITICAL
> missing single-use guarantee on a completed claim code, and a HIGH false-positive risk in the
> REKEY_COMPLETENESS gate — all fixed below (see AUTH-25, AUTH-30, AUTH-34..AUTH-38). See ADR-0179
> for the full decision record and evidence log.

## Problem / intent
Replace anonymous SpacetimeDB identities with **real accounts** so a player keeps their data across
devices and can recover access — **without the game handling passwords**. Everything in the game is
already keyed by `Identity` (since M2), so an account-backed *stable* identity makes monsters,
wallet, and ranked profile cross-device and recoverable with **no game-data schema churn** — accounts
is an edge concern layered on top, not a rewrite.

## Scope (condensed)
- **OIDC-backed identity:** delegate auth to an OIDC provider; the SpacetimeDB `Identity` is derived
  from a **verified JWT** (`Identity::from_claims(iss, sub)`), never anonymous. The server still
  trusts only `ctx.sender`.
- A lightweight owner-private `account` record (no email, no email hash, no raw `sub` — see D9).
- Lifecycle: lazy provisioning on first authenticated connect; a **delete-account** hook (M21's half
  only — M22 consumes it for the full cascade); a one-time, atomic **guest→account claim** that
  re-keys an anonymous identity's game data onto the newly authenticated identity.
- **Out of scope:** rolling our own password store/crypto (never); MFA (provider's job); full
  account-merge (only guest→account, not account↔account); payments; the M22 deletion cascade
  itself (M21 only builds the hook + the re-key manifest M22 will reuse).

## Open questions for Drew (do not let a build tick guess these)

**OQ1 — OIDC provider. RESOLVED 2026-08-09 (issue #301): Better Auth, self-hosted.** Operator
decision, verbatim: "Go with the self-hosted Better Auth." A tested backup/DR plan for the IdP
database is now a launch prerequisite (`Identity = f(iss, sub)`; DB loss permanently orphans every
player) — carry this into M21b-2's deployment-config task and into M-playtest ops docs. This
unblocks M21b-2 (client redirect wiring, silent JWT renewal, claim-code UI, guest→account claim
prompt), which still needs its own scoping/spec pass before build (deferred 2026-08-08 pending this
answer) — not launched by this decision alone.

Genuine three-way non-convergence; a solo-operator ops/risk call, not an
engineering one. **The module code below is provider-agnostic** — it depends on exactly two
constants, `ALLOWED_ISSUERS` and `ALLOWED_AUDIENCE` — so M21a–M21c can build and merge before this
is answered; it blocks only deployment config and the client's redirect wiring (M21b).

| Option | For | Against |
|---|---|---|
| **Better Auth, self-hosted** | TS-native; $0 forever, no MAU cliff; full data control; OSS-friendly | You become the IdP operator — its DB loss permanently orphans every player (`Identity = f(iss, sub)`); a tested backup/DR plan is a launch prerequisite. No first-party Steam plugin. |
| **SpacetimeAuth** | First-party, zero extra service, zero ops/DR burden | Explicitly beta, on the auth critical path. Steam session-ticket support is confirmed present only in the *current* docs, absent from the *pinned* `version-1.12.0` docs tree — do not treat Steam-readiness as settled without re-checking whatever docs version is live at build time. |
| **Auth0** | Mature, zero ops, no DR burden, listed in the pinned docs as a supported OIDC provider | Paid tier past free quota; generic OIDC only, no game-specific features (Steam etc.) |

Decision levers: (i) Is Steam distribution realistically on the roadmap? If yes, re-verify
SpacetimeAuth's Steam support against the docs version live at build time before relying on it. (ii)
Are you willing to own nightly, restore-tested backups of an IdP database, forever? If no,
self-hosting is the wrong call regardless of license cost. (iii) The issuer URL becomes permanently
load-bearing at first sign-up — changing it later re-mints every player's `Identity`.

**OQ2 — Should ranked ladder participation require an account?** If **yes**, `profile` can never
exist for a guest, `ranking::rekey_profile` and the tombstoned-ladder-stub residual (D6) disappear
entirely, and one of the two never-delete tangles vanishes from M21. If **no** (default), D6's
copy-forward-then-zero-and-tombstone ships and a claimed guest who had played ranked leaves a small,
permanent **zeroed** ladder-entry stub behind (rating/wins/losses reset to 0 the moment they're
copied forward, name tombstoned) — never a *duplicate* of the claimed stats, since the source row can
no longer donate them again to a later claim. **Spec defaults to "no"** because that is the shipped
behavior today (guests may already play ranked); reversing it silently would be a REDESIGN, not a
DRAFT addition — needs an explicit yes/no from Drew before or during M21a.

**OQ3 — Email storage posture (ADR-0030 consequence-line clarification, governance ack only).**
ADR-0030's accepted text says "email/PII is must-never-leak (ADR-0015 → hashed/private)," written to
describe *how* to store email **if captured**. This design captures **no email at all** (D9) —
there is no in-module CSPRNG to generate a secure hash pepper, an unkeyed hash over the email
address space is reversible, and nothing in M21 or M22 scope reads the field. **This does not gate
any build task** — D9's schema already ships with the field omitted as its default — it needs an
explicit ack on ADR-0179's Amendments section that "hashed/private" is being read as "not captured."
If a future support-lookup feature needs it, that is the trigger to revisit, together with a real
external key-custody mechanism.

**OQ4 — RESOLVED 2026-08-10.** Better Auth's deployment origin relative to the game client's: **a
dedicated subdomain of the game's own domain** (operator-confirmed default), for the safer
`SameSite=Lax` cookie posture. Carry into the deployment-timed follow-up task's `trustedOrigins`/CORS
config.

**OQ5 — RESOLVED 2026-08-10, materially different from the ceremony's proposed default — scope
addition, see the Steam follow-up note below.** Operator answer, verbatim: "Native email+password and
Steam login. Native credentials are intended for development and QA so that engineers may have
duplicate accounts while testing multiplayer features. Regular players that buy the game after release
will use the Steamworks API to get an auth token using their Steam account." Two consequences:
1. **Native email+password ships, scoped to dev/QA, not the general player population.** D20's DR
   severity finding still applies as stated — the backup exposes whatever the database contains
   regardless of how many accounts use that credential class — so the sub-opacity hardening noted in
   the security finalization review's L3 applies, and `ops/auth/README.md` must state explicitly that
   native sign-up is for internal dev/QA use, not a public-facing entry point (a config/policy note,
   not a code gate this ceremony scopes).
2. **Steam login is a NEW architectural surface this ceremony did not design and ADR-0182 does not
   cover — and, per operator clarification 2026-08-10, it is actually TWO distinct candidate
   mechanisms, not one, gated by a packaging decision this spec has no visibility into:**
   - **(a) Steam as an OpenID 2.0 provider** — a redirect-based web flow (`checkid_setup` /
     `check_authentication` against `steamcommunity.com/openid/login`) that returns a `claimed_id` URL
     encoding the SteamID64, not a JWT. Reachable directly from the *current* browser/pixi.js client —
     no native code needed. Does not fit Better Auth's `@better-auth/oauth-provider` plugin (which
     makes monster-realm an OIDC *issuer*, not a *consumer* of external ones); would need either
     Better Auth's separate social-provider-consumption mechanism (unconfirmed whether it has a legacy
     OpenID 2.0 adapter — must be checked against live docs, not assumed) or a bespoke verify-and-mint
     bridge.
   - **(b) The Steamworks SDK's Auth Session Ticket flow** (`GetAuthSessionTicket`/
     `GetAuthTicketForWebApi`, verified server-side via Steam's Web API) — the mechanism real
     Steamworks-integrated games use. Requires native Steamworks SDK access *client-side*, which the
     current browser/pixi.js client does not have; only reachable once/if monster-realm ships a
     Steam-native build (e.g. an Electron wrapper with a native Steamworks binding) — a
     packaging/distribution decision, not merely an auth one, and not one this spec corpus has
     recorded as decided.
   - ADR-0179's own OQ1 analysis already flagged the underlying limitation: "No first-party Steam
     plugin [for Better Auth] ... revisit if Steam distribution becomes a real roadmap item" — it now
     is (SpacetimeAuth, OQ1's rejected alternative, was noted at the time as having Steam
     session-ticket support in its *current*, non-pinned docs — not re-opening OQ1 over this, but
     worth knowing that alternative existed).
   - **Operator clarification 2026-08-10 (broader than just Steam):** a native Steam-client build **is
     on the roadmap, but explicitly deferred until closer to release** — not imminent. Drew wants
     *different* auth protocols live *simultaneously* per platform going forward (email+password for
     local/private dev servers, OpenID 2.0 for browser play on public/cloud servers, Steamworks SDK
     for the eventual native client), and the codebase "architected in such a way that the
     authentication is modular and flexible, able to be easily switched depending on the client's
     specific build" — a standing design-for-change principle for all future auth/authz work, not
     scoped to this milestone.
   - **Corrected assessment, superseding this note's earlier draft:** this does NOT necessarily reopen
     D1/D1″'s single-issuer framing or CRITICAL-2's confused-deputy analysis (ADR-0179). The leading
     candidate architecture routes every upstream sign-in method — native email+password, Steam OpenID
     2.0, and later the Steamworks-ticket flow — THROUGH Better Auth as a single broker (Better Auth's
     own plugin system consuming each as an upstream provider, then minting Better Auth's own JWT
     regardless of upstream method). Under that architecture, SpacetimeDB's `accounts.rs` continues to
     trust exactly one issuer (Better Auth) as D1/D1″/CRITICAL-2 already assume — no server-side
     change needed. **Unconfirmed, needs live-doc verification before the eventual ceremony treats it
     as settled:** whether Better Auth's plugin system actually supports Steam's OpenID 2.0 as a
     consumable upstream provider (email+password is Better Auth's own built-in plugin, high
     confidence; Steam-as-upstream-OpenID-2.0 is not a commonly-documented Better Auth integration and
     needs a direct docs check, the same rigor ADR-0182 D11 already applied to PKCE/refresh-rotation).
     Separately: ADR-0182's own `resolveCredential()`/`ConnectCredential` boundary in `connection.ts`
     already keeps OIDC-specific concepts (code_verifier/state/redirect) confined inside `oidc.ts` —
     that seam is very likely sufficient, unmodified, to let a future Steamworks-ticket implementation
     swap in behind the same `{kind, token}` contract, since `connection.ts`/`build()` never inspects
     *how* a credential was obtained.
   - **This still needs its own heavy-ceremony scoping pass before build** (call it M21b-3 or fold
     into a dedicated Steam-integration milestone) to verify the Better-Auth-as-broker assumption and
     work out the client-side build-target selection mechanism — but the blast radius looks smaller
     than originally flagged. That pass should wait until the native-build packaging timeline is
     closer to confirmed for its Steamworks-ticket half; the OpenID-2.0-for-browser half could
     reasonably be scoped independently and sooner if browser Steam login is wanted before the native
     client ships. Not started by this ceremony — flagged here so none of this context is lost.

**OQ6 — RESOLVED 2026-08-10.** Backup destination for the Better Auth DR plan: **a second machine Drew
already owns.** Per ADR-0182 D20's own stated interaction, this makes excluding the JWT signing key
from the routine backup sweep (or the compensating mandatory-rotation-on-exposure procedure) *more*
important, not less — carry this into the deployment-timed follow-up task's runbook work.

Everything else M21b-2 touches — SQLite as Better Auth's DB engine, same-tab redirect (PKCE, no popup
capability exists), a hand-rolled `oidc.ts` over Better Auth's own OIDC endpoints, `KeyC` as the menu
binding, `AUTH_SERVICE_TRANSIENT_THRESHOLD = 2`, `claimView` as `GUARD_ONLY`/`sessionView` outside the
overlay registry, restic reuse with nightly/14d+8w+6m retention, preserving `accounts.rs`'s `concat!()`
workaround, the `forcedAnon`/`consecutiveTransientErrors`/`isReturnLegAttempt` in-memory mechanism
design — is a documented default in [ADR-0182](../../projects/monster-realm/docs/adr/0182-m21b2-oidc-client-claim-ui-better-auth-deployment.md),
not escalated here, per this project's BLOCKER discipline (maximize progress before blocking;
reversible/tunable choices take a default and proceed).

## Key design decisions (ADR-0179)

- **D0 — Module write-isolation is WRITE-scoped, not table-scoped.** `accounts.rs` may
  insert/update/delete only `account`, `guest_claim`, `guest_claim_reaper_schedule`. Every write to
  any pre-existing table goes through a `pub(crate) fn rekey_*(ctx, from, to)` helper living in that
  table's *owning* module. Bare reads of other tables (e.g. `player`) are permitted from
  `accounts.rs` directly — no delegation seam exists for tables with no single owner — but where an
  existing shared predicate already covers a check (e.g. battle-liveness), it MUST be reused, not
  re-derived. Forced by three live gates: `ranking-security.eval.mjs` A2 (profile writes:
  `ranking.rs`-only), `currency-integrity.eval.mjs` ACCESSOR_BYPASS (wallet access — read OR write —
  economy.rs-only), `monster-dual-write.eval.mjs` (monster + monster_pub in one fn body). A generic
  cross-table re-keyer inside `accounts.rs` goes red on first `just eval`.
- **D1 — Provider-agnostic gate: issuer AND audience, both mandatory.** `ALLOWED_ISSUERS` +
  `ALLOWED_AUDIENCE` module constants; provider selection is OQ1. Checking `iss` alone does not scope
  a multi-tenant issuer to this application — any validly-signed token from an allowed issuer, minted
  for an unrelated app, would pass an issuer-only check. The vendor's own canonical `client_connected`
  pattern pairs every issuer check with an audience check; confirmed present in the *pinned*
  `version-1.12.0` docs, not just latest.
- **D2 — New tables, both PRIVATE:** `account` (one row per authenticated identity),
  `guest_claim` (one row per in-flight claim, `#[unique] code`, no adjacent `#[index(btree)]` — mirrors
  the `npc.npc_id` precedent), `guest_claim_reaper_schedule` (a scheduled TTL reaper, its
  `guest_identity` column carries `#[index(btree)]` so the disarm path can filter-then-delete rather
  than scan — mirrors `battle_challenge_reaper_schedule`, ADR-0126). `my_account` is an
  owner-scoped `#[view]`, exact-body-pinned, mirroring `my_wallet` (ADR-0154) over the private
  `player_wallet` table — `public` on the view keyword is inert; the body is the boundary.
- **D3 — The claim secret is CLIENT-minted, not server-minted.** `ctx.rng()`/`ctx.random()` is
  seeded from a public timestamp and is explicitly documented by the pinned crate as **not
  cryptographically secure** — a server-minted claim token is brute-forceable. The client generates
  256 real bits via `crypto.getRandomValues`, writes it to sessionStorage, and the reducer only binds
  it to `ctx.sender` — the server performs zero randomness. Because entropy is now real, **TTL stops
  being a security parameter** and becomes orphan hygiene only: **15 minutes** (covers a redirect +
  provider MFA + magic-link round trip).
- **D4 — `client_connected` is a new lifecycle reducer; anonymous play is first-class.** No
  `client_connected` reducer exists in `lib.rs` today. Returning `Err` from this hook **disconnects
  the client** (the crate's own doc comment), so the very first statement must be an early
  `has_jwt()` return with no prior `Err` path — anonymous connections must never be rejected. The
  vendor's canonical example for this hook rejects JWT-less connections; that pattern must NOT be
  copied here.
- **D5 — Completion guards don't mirror `on_disconnect`, they reuse its ordering invariant.**
  `on_disconnect` deletes the `player` row **last**, strictly after trade/PvP/wild-battle/challenge/
  conversation cleanup. `complete_guest_claim` therefore needs only three guards, not a bespoke
  five-table assert: (1) guest's `player` row must be absent (liveness — its presence proves a stale
  tab, since disconnect cleanup precedes its deletion); (2) neither identity is mid-battle, checked
  via the repo's existing SSOT predicate `guards::is_in_ongoing_battle` (ADR-0122 D1) — reused, not
  re-derived, and the one check that isn't already implied by guard 1/3; (3) the calling account owns
  no row in any REKEY-policy table — fail-closed on a "sign up → play a bit → then claim" collision,
  never silently merge.
- **D6 — Re-key manifest is the SSOT M22 will reuse.** Every `Identity`-typed column in the schema
  gets an explicit policy: REKEY (delegated helper in the owning module), BLOCKED (guard-covered,
  transitively or directly), or EXEMPT (with a documented reason). `player_wallet` and `profile` are
  **never deleted** — wallet balance is credited forward via `economy::grant_currency` then the
  guest row is zeroed in place; profile rating/W/L is copied forward, **then zeroed on the guest's
  own row** (mirrors wallet — the source must never again be a donatable balance), and the guest
  row's `name` is overwritten with a bounded tombstone constant. `monster` + `monster_pub` re-key
  together in one function body (dual-write invariant). Rejected: a `declare_owner_keyed_table!` macro registry — zero
  `macro_rules!` precedent exists anywhere in this workspace; a plain `const` manifest + a static-scan
  gate gives the same guarantee without introducing metaprogramming as a build sub-task.
- **D7 — `delete_account` ships its M21 half only.** Requires a JWT (rejects an anonymous caller —
  AUTH-37); sets `status = PendingDeletion` (idempotent); `cancel_account_deletion` reverses it
  (idempotent, including as a no-op on an already-`Active` account — AUTH-38) so the flag is never a
  trap state in M21. M21 gates `PendingDeletion` in exactly **one** place: `complete_guest_claim`, via
  a small reusable `accounts::is_pending_deletion` predicate — `start_guest_claim` needs no separate
  check since AUTH-7 already unconditionally rejects any JWT-holding caller there, and only a
  JWT-authenticated identity can ever be `PendingDeletion`. The full gameplay gate, grace window, and
  registry cascade are M22's — and
  M22 **extends this same reducer body**, per ADR-0031's own accepted text ("`delete_account` cascades
  over it"), not a decoupled sweep. No procedures (`#[cfg(feature="unstable")]` in the pinned crate);
  no out-of-module revocation poller (a new always-on service + credential-custody problem M21 does
  not need) — provider-side revocation is deferred to M22 with the question recorded there.
- **D8 — Client: silent renewal, never JWT replay.** `authToken.ts`'s sessionStorage slot keeps
  serving the anonymous-reconnect case exactly as today, unchanged. An OIDC account token is
  short-lived; replaying an expired one past its `exp` is the *expected* steady state for a returning
  account holder, not an edge case — so an authenticated tab must obtain a **fresh** token (silent
  OIDC renewal) before every reconnect rather than replay a stored one. If silent renewal fails, the
  client surfaces an explicit session-expired state — it must never fall through to a silent
  anonymous connection, which would discard the account association with no prompt.
- **D9 — No `email`, `email_hash`, or `auth_subject` column.** See OQ3. Nothing in M21/M22 scope
  reads it; the IdP's own store already owns the email.
- **D10 — No `CONTENT_VERSION` bump.** `account`/`guest_claim`/`guest_claim_reaper_schedule` are
  runtime tables, not seeded content (mirrors M15 D7 / `trade_offer` precedent).

## EARS acceptance criteria

**Anonymous play & provisioning**
- **AUTH-1** — WHEN a client connects without a JWT THE SYSTEM SHALL return `Ok` from
  `client_connected` without inserting, updating, or deleting any row. *(negative test required)*
- **AUTH-2** — WHEN a client connects with a JWT whose `iss` is not in `ALLOWED_ISSUERS` THE SYSTEM
  SHALL return `Ok` from `client_connected` (leaving the connection anonymous) and SHALL NOT insert
  an `account` row. *(amended 2026-08-08 during M21a — D1″ below. The original "SHALL return `Err`
  (disconnecting)" was falsified by a live probe: SpacetimeDB's host mints its own JWT for every
  connection, including a tokenless first connect (`iss=localhost`, `aud=["spacetimedb"]`), which
  authToken.ts then replays — so `has_jwt()` is true on every connection and an `Err` on an
  unrecognized issuer would disconnect every player. The load-bearing half — "SHALL NOT insert an
  `account` row" — is preserved. This is the host's-own-anonymous-token path and MUST fail safe to
  anonymous. Invariant: the host's anonymous issuer is never in `ALLOWED_ISSUERS`.)*
- **AUTH-3** — WHEN a client connects with a JWT whose `iss` is allowed but whose `aud` contains no
  entry from `ALLOWED_AUDIENCE` THE SYSTEM SHALL return `Err` (disconnecting the client) and SHALL
  NOT insert an `account` row. *(unchanged — this branch is only reachable by a token whose issuer
  was explicitly allowlisted, i.e. a same-issuer cross-app "confused-deputy" token; a legitimate
  player never presents an allowed-issuer/wrong-audience token, so the disconnect is outage-safe
  and preserves `aud` as a real authorization control. See D1″ + the CRITICAL-2 note in ADR-0179.)*
- **AUTH-4** — WHEN a client connects with an issuer- and audience-valid JWT and no `account` row
  exists for `ctx.sender` THE SYSTEM SHALL insert exactly one `account` row with `status = Active`
  and `claimed_from = None`.
- **AUTH-5** — WHEN a client connects with an issuer- and audience-valid JWT and an `account` row
  already exists for `ctx.sender` THE SYSTEM SHALL update only `last_login_at_ms` on that row.
- **AUTH-6** — THE SYSTEM SHALL NOT store an email address, an email hash, or the raw JWT `sub`
  claim in any table.

**Guest claim — start**
- **AUTH-7** — WHEN `start_guest_claim` is called by a caller presenting a JWT THE SYSTEM SHALL
  reject it.
- **AUTH-8** — WHEN `start_guest_claim` receives a `code` that is not exactly 64 lowercase hex
  characters THE SYSTEM SHALL reject it.
- **AUTH-9** — WHEN `start_guest_claim` is called by an anonymous caller with a well-formed code and
  no existing in-flight claim for that identity THE SYSTEM SHALL insert one `guest_claim` row bound
  to `ctx.sender`, with `guest_name` populated server-side from the caller's own `player.name` (never
  a reducer argument), and arm one `guest_claim_reaper_schedule` row carrying that identity in its
  indexed `guest_identity` column.
- **AUTH-10** — WHEN `start_guest_claim` is called again for a guest identity that already has an
  in-flight claim THE SYSTEM SHALL delete the prior `guest_claim` row and disarm its reaper before
  inserting the new one.
- **AUTH-11** — THE SYSTEM SHALL NOT call `ctx.rng()` or `ctx.random()` anywhere in the accounts
  code path.

**Guest claim — complete**
- **AUTH-12** — WHEN `complete_guest_claim` is called by a caller with no JWT THE SYSTEM SHALL
  reject it.
- **AUTH-13** — WHEN `complete_guest_claim` is called by a caller whose `account.status` is
  `PendingDeletion` THE SYSTEM SHALL reject it.
- **AUTH-14** — WHEN `complete_guest_claim` is called by a caller whose `account.claimed_from` is
  already `Some` THE SYSTEM SHALL reject it (one claim per account, ever).
- **AUTH-15** — WHEN `complete_guest_claim` receives a `code` that is not exactly 64 lowercase hex
  characters, OR that has no matching `guest_claim` row, THE SYSTEM SHALL reject with "invalid or
  already-used code" and modify no row.
- **AUTH-16** — WHEN `complete_guest_claim` receives a `code` whose `guest_claim.expires_at_ms` has
  elapsed THE SYSTEM SHALL reject with "code expired" and modify no row; the expired `guest_claim`
  row is reaped by `guest_claim_reaper` in its own transaction. *(amended 2026-08-08 during M21a —
  the original "AND delete that row + disarm its reaper as the only side effect" was falsified by a
  live probe: a reducer that returns `Err` rolls back ALL of its own writes, so a delete performed
  on the same call that returns `Err("code expired")` cannot persist. Expired-claim cleanup is owned
  solely by the scheduled reaper — see D5/D6 in ADR-0179.)*
- **AUTH-17** — WHEN `complete_guest_claim`'s resolved guest identity equals the caller's identity
  THE SYSTEM SHALL reject it.
- **AUTH-18** — WHEN `complete_guest_claim` is called and a `player` row still exists for the guest
  identity THE SYSTEM SHALL reject with "close your other tab, then retry" and SHALL modify no row.
- **AUTH-19** — WHEN `complete_guest_claim` is called and `guards::is_in_ongoing_battle` is true for
  either the guest or the caller identity THE SYSTEM SHALL reject and modify no row.
- **AUTH-20** — WHEN `complete_guest_claim` is called and the caller's account already owns a row in
  any REKEY-policy table THE SYSTEM SHALL reject with "already has game data" and modify no row.
- **AUTH-21** — WHEN `complete_guest_claim` succeeds THE SYSTEM SHALL leave zero rows in any
  REKEY-policy table referencing the guest identity, except `player_wallet` (row retained, balance
  zeroed) and `profile` (row retained, rating/wins/losses zeroed, name tombstoned), and SHALL set the
  caller's `claimed_from = Some(guest_identity)` and `claimed_at_ms`.
- **AUTH-22** — WHEN a `monster` row's `owner_identity` is re-keyed THE SYSTEM SHALL re-key the
  corresponding `monster_pub` row in the same function body.
- **AUTH-23** — WHILE re-keying, THE SYSTEM SHALL NOT delete any `player_wallet` or `profile` row
  under any circumstance.
- **AUTH-24** — WHEN a wallet is re-keyed THE SYSTEM SHALL credit the guest's balance to the caller
  via `economy::grant_currency` and leave the guest's `player_wallet` row present with balance zero.
- **AUTH-25** — WHEN a profile is re-keyed THE SYSTEM SHALL copy `rating`/`wins`/`losses` forward to
  the caller's `profile` row, THEN zero `rating`/`wins`/`losses` on the guest's own row and overwrite
  its `name` with the tombstone constant (≤ `MAX_NAME_LEN` characters), leaving the row present. The
  zero step is mandatory, not cosmetic: it is what prevents the same guest identity from donating the
  same stats again to a second fresh account via a later claim.
- **AUTH-26** — WHEN `complete_guest_claim` returns `Err` THE SYSTEM SHALL leave the `guest_claim`
  row intact and unconsumed. *(simplified 2026-08-08 during M21a: the original "for any reason other
  than expiry" carve-out is now moot — per the AUTH-16 amendment the expiry path also leaves the row
  intact, since a reducer `Err` cannot persist a delete. Every `Err` path is uniformly
  non-mutating.)*
- **AUTH-27** — WHEN a `guest_claim` row's `expires_at_ms` elapses without being consumed THE SYSTEM
  SHALL delete that row via the reaper, matched on the indexed `guest_identity` column, and SHALL NOT
  delete any other `guest_claim` row.

**Deletion (M21 half)**
- **AUTH-28** — WHEN `delete_account` is called twice by the same caller THE SYSTEM SHALL return
  `Ok` both times and change no additional state on the second call.
- **AUTH-29** — WHEN `cancel_account_deletion` is called on a `PendingDeletion` account THE SYSTEM
  SHALL set `status = Active` and clear `deletion_requested_at_ms`, idempotently.
- **AUTH-30** — *(removed during the finalization review pass.)* The draft's original text mandated
  rejecting `PendingDeletion` callers from both `start_guest_claim` and `complete_guest_claim`. The
  `start_guest_claim` half is logically unreachable (AUTH-7 already unconditionally rejects any
  JWT-holding caller there, and only a JWT-authenticated identity can ever be `PendingDeletion`); the
  `complete_guest_claim` half is a verbatim duplicate of AUTH-13. Neither half survives as an
  independent criterion — see D7's correction note in ADR-0179.

**Client**
- **AUTH-31** — WHEN a stored anonymous-reconnect credential is rejected by the host, THE CLIENT
  SHALL apply the existing suppress-not-clear policy unchanged (ADR-0150 D2) — no behavior change to
  the anonymous path.
- **AUTH-32** — WHEN an authenticated tab reconnects, THE CLIENT SHALL attempt silent OIDC token
  renewal before calling `.withToken()`, and SHALL NOT replay a previously stored account JWT. IF
  silent renewal fails, THE CLIENT SHALL surface a session-expired state and SHALL NOT connect
  anonymously without an explicit user choice to do so.
- **AUTH-33** — WHILE an unconsumed claim code exists in this tab's sessionStorage, THE CLIENT SHALL
  NOT call `join_game` on a newly authenticated connection until `complete_guest_claim` returns `Ok`
  or the player explicitly declines to claim.

**Hardening additions (finalization review pass, 2026-08-08)** — closes gaps a security and a
completeness adversarial review found in the draft above; numbered onward rather than renumbering
AUTH-1..33 in place, consistent with this milestone's own practice of recording review-found
corrections rather than silently rewriting the draft.

- **AUTH-34** — WHEN `complete_guest_claim` succeeds THE SYSTEM SHALL delete the consumed
  `guest_claim` row and disarm its `guest_claim_reaper_schedule` row, in the same transaction as the
  re-key (single-use: the code becomes permanently unusable).
- **AUTH-35** — WHEN `complete_guest_claim` is called with a `code` that was already consumed by a
  prior successful call THE SYSTEM SHALL reject it with "invalid or already-used code" and modify no
  row. *(independently exercises AUTH-34's guarantee, distinct from AUTH-15's code-never-existed
  case.)*
- **AUTH-36** — THE SYSTEM SHALL NOT log a raw JWT claim value (`iss`, `sub`, or `aud`) on any reject
  path in `client_connected` / `provision_or_touch_account`; any `guards::log_reject` call on those
  paths SHALL use a static reason string only (ADR-0029).
- **AUTH-37** — WHEN `delete_account` is called by a caller with no JWT THE SYSTEM SHALL reject it
  (symmetric with AUTH-7/AUTH-12).
- **AUTH-38** — WHEN `cancel_account_deletion` is called on an account whose `status` is already
  `Active` THE SYSTEM SHALL return `Ok` and change no state (idempotent no-op, symmetric with
  AUTH-28's `delete_account` double-call idempotency).

**M21b-2 (client, ADR-0182, 2026-08-10) — OIDC redirect, state, PKCE**
- **AUTH-39** — WHEN the client initiates an OIDC sign-in redirect (claim-flow or plain
  re-authentication) THE CLIENT SHALL generate a `state` value and a PKCE `code_verifier`/
  `code_challenge` (S256) pair via `crypto.getRandomValues`/`crypto.subtle.digest`, persist `state`
  and `code_verifier` in this tab's sessionStorage before navigating, and include `state` and
  `code_challenge` in the authorization request.
- **AUTH-40** — WHEN the client's page loads and `location.search` carries an OIDC-return marker, THE
  CLIENT SHALL compare the returned `state` against the stored value byte-for-byte; IF they do not
  match, or no stored value exists, THE CLIENT SHALL treat the load as an ordinary cold start and
  SHALL NOT exchange the authorization code or attempt any claim-specific handling on the strength of
  that marker alone.
- **AUTH-41** — WHEN the client evaluates an OIDC-return marker (matched or not), THE CLIENT SHALL
  delete the stored `state`/`code_verifier` (single-use) and call `history.replaceState` to scrub the
  return marker from `location.search`/`hash` before any other boot work, unconditionally.
- **AUTH-42** — WHEN silent OIDC renewal or code exchange succeeds, THE CLIENT SHALL persist the newly
  issued `refresh_token`, overwriting any previously stored value, before the returned token is used
  to build a connection.

**Credential provenance / attempt gating**
- **AUTH-43** — WHEN `build()` supplies a token to `.withToken()`, THE CLIENT SHALL derive both the
  token and the write-guard's credential-kind classification from one in-memory resolution computed
  fresh for that attempt, and SHALL NOT re-derive the write-guard's classification from a subsequent
  storage read.
- **AUTH-44** — WHILE a tab has never held an account credential (per the existing auth-kind marker)
  AND is not classified as an OIDC return leg for this page load AND has not had `continueAnonymously()`
  invoked this page life, THE CLIENT SHALL make no call to the Better Auth token endpoint on connect or
  reconnect.

**Renewal outcome classification**
- **AUTH-45** — WHEN silent renewal or code exchange fails with an ambiguous/transient result on fewer
  than `AUTH_SERVICE_TRANSIENT_THRESHOLD` consecutive attempts since the last definitive result, THE
  CLIENT SHALL NOT declare session-expired or auth-service-unreachable, SHALL NOT construct a
  `DbConnection` for that attempt, and SHALL schedule the next attempt via the same reconnect/backoff
  ladder a socket-level connect failure uses, unchanged.
- **AUTH-46** — WHEN silent renewal for a previously-authenticated tab fails ambiguously on
  `AUTH_SERVICE_TRANSIENT_THRESHOLD` or more consecutive attempts since the last definitive result, THE
  CLIENT SHALL surface an auth-service-unreachable state offering the same continue-anonymously
  affordance as session-expired, without discarding the stored credential or permanently ceasing
  retries.
- **AUTH-47** — WHEN silent renewal for a previously-authenticated tab returns a definitive rejection
  (no session / invalid credential), THE CLIENT SHALL surface the session-expired state and SHALL NOT
  construct a `DbConnection` for that attempt.
- **AUTH-48** — WHEN an OIDC code exchange fails on a tab with no prior authenticated session (a
  first-time claim-flow sign-in), THE CLIENT SHALL surface a distinct sign-in-failed outcome through
  the claim UI, SHALL NOT surface the session-expired state, and SHALL NOT persist a refresh token.
- **AUTH-49** — WHILE the session-expired or auth-service-unreachable state is showing, THE CLIENT
  SHALL NOT connect anonymously except in direct, synchronous response to an explicit "continue as
  guest" action; that action SHALL set a connect()-scoped, in-memory flag that suppresses all further
  Better Auth calls for the remainder of this tab's page life, independent of the sessionStorage
  auth-kind marker's value.

**`my_account` subscription + reconciliation**
- **AUTH-50** — THE CLIENT SHALL subscribe `SELECT * FROM my_account` on every (re)built connection.
- **AUTH-51** — WHILE deciding whether to display any "signed in" or claim-eligible UI affordance, THE
  CLIENT SHALL use only the subscribed `my_account` row's presence as the source of truth, and SHALL
  NOT use the in-memory credential provenance (AUTH-43) or the auth-kind marker for that decision.

**Claim-code UI / F2**
- **AUTH-52** — WHILE a live, unconsumed claim code exists in this tab's sessionStorage, THE CLIENT
  SHALL NOT call `join_game` on any connection whose supplied credential is account-class
  (`credential.kind === 'account'`) — including across any number of reconnects — until
  `complete_guest_claim` returns `Ok` or the player explicitly declines; this holds independent of
  whether `my_account` has yet been observed for the connected identity. An anonymous-class connection
  on this tab is unaffected by this criterion: while a claim code is outstanding, every anonymous
  credential this tab can produce belongs to the guest identity the code was minted for (never a fresh
  identity — the single anon-token-slot design of D11/D14), so its own `join_game` re-issue remains
  AUTH-33's ordinary, harmless "already joined" idempotent path. *(Corrected during this ceremony's
  own synthesis-review pass: the original draft's "on any connection" wording overstated the design's
  actual `shouldJoin` mechanism, which deliberately exempts anonymous-class builds — narrowed to name
  the actual scope so a mechanical gate built from this text does not flag the correct implementation
  as a violation.)*
- **AUTH-53** — WHEN a connection carrying an unconsumed claim code reconnects, THE CLIENT SHALL
  re-issue `complete_guest_claim` with the stored code on the new connection's first `onApplied`,
  unconditionally (never gated on a UI action), rather than treating a promise that never settled
  across the drop as a terminal outcome.
- **AUTH-54** — WHEN `complete_guest_claim` returns `Err` with `"invalid or already-used code"` or
  `"code expired"`, THE CLIENT SHALL delete the stored code and permit `join_game`. WHEN it returns
  `Err` with `"already has game data"`, `"account already claimed"`, or `"cannot claim your own
  session"`, THE CLIENT SHALL retain the code, surface that this destination account cannot complete
  the claim, and SHALL NOT auto-retry against the same account. WHEN it returns `Err` with `"close
  your other tab, then retry"` or `"already in an ongoing battle"`, THE CLIENT SHALL retain the code
  and surface the reason without auto-retrying. WHEN it returns `Err` with `"sign in required"`, `"no
  account"`, or `"account pending deletion"`, THE CLIENT SHALL retain the code, take no destructive
  action, and SHALL NOT present the failure as claim-specific. *("SHALL NOT auto-retry" throughout this
  criterion means SHALL NOT retry on a client-side timer, per AUTH-55 — it does not conflict with
  AUTH-53's unconditional reconnect-triggered reissue, which is not a retry in that sense: it fires
  once per new connection, not on an elapsed-time basis. Parenthetical added during finalization to
  resolve a wording ambiguity the security review flagged between AUTH-53 and AUTH-54.)*
- **AUTH-55** — THE CLIENT SHALL NOT use client-side elapsed time as grounds to resume automatic
  `join_game` calls while a claim code from AUTH-52 remains present and not explicitly declined.
- **AUTH-56** — WHEN the player explicitly declines a pending claim, THE CLIENT SHALL require a
  distinct confirmation step naming the irreversible consequence before deleting the stored code and
  permitting `join_game`.
- **AUTH-59** — WHEN a join, retry-join, or continue-anonymously action is attempted while no live
  connection exists, THE CLIENT SHALL surface the same visible feedback as an ordinary disconnected
  action and SHALL NOT silently discard it. *(Split from AUTH-56 during finalization: the two clauses
  bundled unrelated behaviors — decline-confirmation UX vs. generic no-live-connection feedback —
  breaking the otherwise-atomic pattern the rest of AUTH-39..60 follows.)*
- **AUTH-60** — WHEN the client mints a claim code, THE CLIENT SHALL generate exactly 32 bytes via
  `crypto.getRandomValues` and hex-encode them to a 64-lowercase-hex-character string matching the
  server's AUTH-8 validation, and SHALL write the code to this tab's sessionStorage before calling
  `start_guest_claim`. *(Added during finalization: the claim-code-minting mechanism — the brief's own
  deferred-scope item — had no EARS coverage in the original draft.)*

**Logging / storage discipline**
- **AUTH-57** — THE CLIENT SHALL NOT pass a raw id_token, access_token, or refresh_token value, nor an
  unclassified Better-Auth-originated error/reason string, as an argument to any `console.*`,
  `opts.onError`, `opts.onSend`, or telemetry-recording call in `oidc.ts`, `credentialDecision.ts`, or
  `connection.ts`; only static reason strings, a classifier-mapped `credential.reason`, or
  `Error.message` values may be passed. *(Scope extended during finalization to cover
  `credential.reason` and third-party error text, not just raw token values.)*
- **AUTH-58** — THE CLIENT SHALL NOT persist an OIDC state value, code_verifier, refresh token, or
  claim code in `localStorage`; all SHALL live only in per-tab sessionStorage (ADR-0150 D3).

## §4 Task checkboxes

- [x] DONE (M21a, PR #298) `Account`, `AccountStatus`, `GuestClaim`, `GuestClaimReaperSchedule` tables + `my_account` view
  in `server-module/src/schema.rs` *(GuestClaimReaperSchedule colocated in `accounts.rs` with its reducer per the ADR-0056 scheduled-table exception — the `scheduled(` name-scanners require a bare ident)*
- [x] DONE (M21a, PR #298) `server-module/src/accounts.rs` — reducers `complete_guest_claim`, `start_guest_claim`,
  `delete_account`, `cancel_account_deletion`; helpers `provision_or_touch_account`,
  `account_has_game_data`, `consume_claim_and_disarm`, `rekey_all`, `is_pending_deletion` (SSOT
  reused by `complete_guest_claim`, and by M22's additional gameplay call sites)
- [x] DONE (M21a, PR #298) `server-module/src/accounts_tests.rs`
- [x] DONE (M21a, PR #298) `client_connected` reducer (`on_connect`) + `guest_claim_reaper` scheduled reducer wired in
  `server-module/src/lib.rs`
- [x] DONE (M21a, PR #298) `rekey_monsters` in `monster_mgmt.rs` (dual-write `monster` + `monster_pub` in one fn body)
- [x] DONE (M21a, PR #298) `rekey_inventory` in `inventory.rs`
- [x] DONE (M21a, PR #298) `rekey_npc_state` in `npc.rs` (`player_quest` + `player_dialogue_state`)
- [x] DONE (M21a, PR #298) `rekey_heal_cooldown` in `raising.rs`
- [x] DONE (M21a, PR #298) `rekey_wallet` in `economy.rs` (credit-forward + zero-in-place, never delete)
- [x] DONE (M21a, PR #298) `rekey_profile` in `ranking.rs` (copy-forward + zero-in-place-on-guest-row + tombstone, never
  delete; NOT a `#[spacetimedb::reducer]`)
- [x] DONE (M21a, PR #298) Read-only existence helpers per owning module: `wallet_exists`, `profile_exists`,
  `has_monsters`, `has_items`, `has_quest_or_dialogue_state`, `has_heal_cooldown`
- [x] DONE (M21a, PR #298) `PROFILE_TOMBSTONE_NAME` constant (≤ `MAX_NAME_LEN` = 24)
- [x] DONE (M21c, PR #300) `evals/account-privacy.eval.mjs` (table privacy, `my_account` body-exact pin,
  `ViewContext::new(`/`ViewContext {` ban, NO_PII_IN_REJECT_LOGS)
- [x] DONE (M21c, PR #300) `evals/guest-claim-integrity.eval.mjs` (NO_CLIENT_IDENTITY, ANON_PASSTHROUGH,
  ISSUER_AND_AUDIENCE_CHECKED, NO_SERVER_RNG, MODULE_WRITE_ISOLATION, REKEY_COMPLETENESS,
  SINGLE_USE_CONSUMED)
- [x] DONE (M21c, PR #300) Extend `evals/ranking-security.eval.mjs` with a positive fixture proving `rekey_profile` stays
  green under A2 and A1's reducer count is unaffected
- [x] DONE (M21c, PR #300) Extend `pvp_tests.rs::m17a_rl2_profile_never_deleted_scan`'s hardcoded file list with
  `accounts.rs` + each new re-key helper file
- [x] DONE (M21c, PR #300) Extend `evals/currency-integrity.eval.mjs` with a negative assertion that `accounts.rs` is not
  added to the ACCESSOR_BYPASS allowlist
- [x] DONE (M21a, PR #298) Regenerate client bindings (`just gen` — the recipe is `just gen`, not `just gen-bindings`)
- [x] DONE (M21b) `authToken.ts` companion marker key — shipped as `mr.authKind.v1` (**not** the
  illustrative `mr.authToken.v1.kind`: that string is a *superstring* of the existing
  `mr.authToken.v1` token prefix, so key-space disjointness would have rested on a subtle argument
  about segment encoding; with `mr.authKind.v1` neither prefix is a prefix of the other and a
  collision — which would overwrite a player's reconnect token with the literal `"account"` — is
  impossible by construction). Additive, existing logic byte-untouched. M21b also gated
  `connection.ts`'s `auth.onConnected(token)` call site on the marker, closing a replay path that
  already shipped: the SDK echoes the credential given to `.withToken()` back as `onConnect`'s third
  argument, so the previously-unconditional save would have written an account JWT into the
  **anonymous** token slot (ADR-0179 D8 amendment, P3).
- [x] **SCOPED 2026-08-10 (ADR-0182)**, was DEFERRED to M21b-2 (blocked on OQ1, now resolved) — Client:
  `connection.ts` silent-renewal-before-`withToken` + session-expired state *(AUTH-32, AUTH-45..49)* —
  see the M21b-2 task list below
- [x] **SCOPED 2026-08-10 (ADR-0182)**, was DEFERRED to M21b-2 — Client: claim-code UI (client-minted
  code, sessionStorage, same-tab redirect + PKCE + `state` — popup+`postMessage` rejected, Better Auth
  supports redirect only) *(AUTH-39..41, AUTH-52..56, AUTH-59, AUTH-60)*
- [x] **SCOPED 2026-08-10 (ADR-0182)**, was DEFERRED to M21b-2 — Client: guest→account claim prompt +
  first-run multi-device nudge copy *(AUTH-52..56, AUTH-59; nudge copy is a task-checklist item only
  per ADR-0179 D8 item 6 — no EARS criterion by design)*

> **§4 deferral note (added during M21b, 2026-08-08).** The three bullets above, and **AUTH-32 and
> AUTH-33 with them**, are deferred rather than attempted. Four findings force it; all are recorded
> with evidence in ADR-0179's D8 amendment.
>
> 1. **The account path cannot execute at all today (F1).** `ALLOWED_ISSUERS` is the fail-closed
>    `.invalid` OQ1 placeholder, so per D1″ every connection resolves to *unrecognized issuer → `Ok`,
>    anonymous, no `account` row*, and `complete_guest_claim` guard 2 returns `"no account"` for every
>    producible token.
> 2. **`join_game` is irreversible with respect to claiming (F2).** It grants a starter `monster` that
>    no server path ever deletes; `account_has_game_data` short-circuits on `has_monsters`; guard 11
>    then rejects `"already has game data"` permanently, and AUTH-14 allows one claim per account ever.
>    A join-gate whose failure paths fall through to `join_game` — as every timeout/reconnect escape
>    hatch does — would convert each claim attempt into **irreversible player-data loss**. **Hard
>    constraint on the redesign: no path may auto-join while a live claim record exists** (no timeout
>    hatch, no reconnect bypass; only an explicit, consequence-labelled decline), plus reconnect
>    re-issue of `complete_guest_claim` since the pre-drop promise never settles (ADR-0085 D3).
> 3. **A redirect without a `state`/nonce is exploitable.** An attacker who gets a victim's mid-claim
>    tab to load the attacker's own OIDC callback re-keys the victim's monsters, inventory, wallet and
>    ranked profile onto the attacker's account — atomically and irreversibly, needing no secret. A
>    `state` parameter cannot be built from an opaque authorize-URL string; it requires knowing the
>    provider, i.e. OQ1. The return leg must also `history.replaceState`-scrub `location.search`/`hash`.
> 4. **AUTH-32's pieces are indivisible.** The credential decision, silent renewal, the session-expired
>    state, the explicit continue-anonymously affordance and the **cold-start contract** are one unit:
>    `build()` is typed `(): DbConnection` and `let current = build()` is non-optional, so "surface
>    session-expired and do not connect" cannot return without widening `build()`/`current` to
>    `DbConnection | undefined` — which cascades into `get conn()` and every `conn.conn.reducers.*`
>    call site in `main.ts`. (Note the same-tab OIDC redirect *return* is itself a cold start with
>    populated sessionStorage, so the authenticated path **is** the cold-start path.)
>
> **Also for M21b-2:** the shipped marker guard is *best-effort, not structural* — `readAuthKind` fails
> to `'anon'` on every lossy storage path and `'anon'` is the permissive direction, while AUTH-31
> requires exactly that fail direction. One lossy boolean cannot satisfy both, so the discriminator
> must be **replaced** by the provenance of the credential actually supplied (carried in memory beside
> the token), which requires re-pinning `W-NH4-TOKEN-SUPPLIED`. And `my_account` must be subscribed:
> it is the only observable of whether a connection is *actually* authenticated, versus the marker's
> record of intent.
>
> **Post-integration consequence:** this milestone's §5 e2e (`connect (JWT) → account provisioned →
> start_guest_claim → complete_guest_claim → re-key verified`) **cannot run at M21b/M21c merge** — it
> needs a real issuer. It becomes runnable only once OQ1 is answered.

**M21b-2 task checklist (scoped 2026-08-10, ADR-0182 — build tasks, not yet built):**
- [ ] `client/src/net/oidc.ts` + `.test.ts` — discovery fetch/cache, `state`+PKCE mint/store/validate,
  `history.replaceState` scrub, code exchange, refresh-token rotation persistence. `renewOrExchange()`
  is a TOTAL function (never throws across the module boundary; internal errors map to
  `'transient-error'`) and branches on what is actually present in storage, not on a caller-supplied
  flag (ADR-0182 D13/D14, closes the finalization security review's H1 finding).
- [ ] `client/src/net/credentialDecision.ts` + `.test.ts` — `decideConnectCredential`,
  `ConnectCredential`, `AUTH_SERVICE_TRANSIENT_THRESHOLD`; pure, full `outcome × everAuthenticated ×
  consecutiveTransientErrors` branch coverage (G16).
- [ ] `authToken.ts` — add `wasEverAuthenticated`; narrow (do not delete) `readAuthKind`/
  `writeAuthKind`'s doc comments. `authToken.test.ts` — test it; positive-pin `writeAuthKind`'s one
  gated call site.
- [ ] `client/src/net/claimCode.ts` + `.test.ts` — mint (AUTH-60)/read/hasUnconsumed/clear over
  `mr.claimCode.v1`.
- [ ] `connection.ts` — `resolveCredential`/`build(credential)`/`attemptBuild` split;
  `isReturnLegAttempt`/`consecutiveTransientErrors`/`forcedAnon` (all three connect()-scope, mutable,
  in-memory, single-use where specified); the `'retry'`-climbs-the-ladder branch (G24); a try/catch
  around `await resolveCredential()` in `attemptBuild()` (closes the finalization security review's
  CRITICAL C1 finding, G27); the RT-01 `try/catch` around `build(` preserved; `my_account` subscribe +
  `onInsert`/`onUpdate` ingest (G28); corrected join-gate inside `onApplied` that actually calls
  `completeGuestClaim` on the reissue path, not just a UI callback (G18); `attemptJoin`/`retryJoin`/
  `continueAnonymously` (with its body); `Connection.live()`. Re-pin/retire teeth: `W-NH4-TOKEN-SUPPLIED`
  (G13), `W-M21B-KIND-READ`→retired (G14), `W-DEVLOG-WRAP` boundary (G15).
- [ ] `store.ts`/`rowConvert.ts` — `#ownAccount`, `upsertAccount`/`ownAccount`, `SdkAccountRow`/
  `accountRowToStore`. All "signed in" UI decisions read `store.ownAccount` exclusively (AUTH-51, G29).
- [ ] `client/src/ui/claimModel.ts`+`claimView.ts` (+tests) — full claim flow incl. the 4-way reject
  taxonomy (AUTH-54); the first-run multi-device nudge copy, shown once per tab on first claim-UI open
  (tracked in the `mr.claimCode.v1` namespace, no new storage key); join `overlayRegistry.ts` as
  `GUARD_ONLY` (G19).
- [ ] `client/src/ui/sessionModel.ts`+`sessionView.ts` (+tests) — `hidden | expired | unreachable`;
  registry-external (not in `OverlayId` — closes the `EXCLUSIVE_TOP`/`decide()` incompatibility, D17);
  wire the pre-dispatch input-block gate in `main.ts`, checked before `anyOverlayVisible()` and before
  `battleView`'s own Escape branch on every input path (G20).
- [ ] `overlayRegistry.ts`/`.test.ts` — add `claimView` (`GUARD_ONLY`); manifest-count `+1` (G19).
- [ ] `menuModel.ts`/`helpModel.ts` — `'account'` leaf, `KeyC` (confirmed free — not banned by
  `W-INTERACT-NO-GH`, scoped to `KeyG`/`KeyH` only), matching `CONTROLS` SSOT row.
- [ ] `main.ts` — new `ConnectionOptions` callbacks (`onSessionExpired`/`onAuthServiceUnreachable`/
  `onSignInFailed`/`onClaimPending`/`onClaimAwaitingAccount`/`onClaimResult`) wired; the ~10-site
  `live()` refactor (G26); `KeyC` handler; session-first dispatch gate (G20).
- [ ] `vite.config.ts` + `dom-shell-coverage-exclusion.eval.mjs` — add `claimView.ts`/`sessionView.ts`.
- [ ] Author `evals/account-e2e.eval.mjs` **from scratch** implementing the flow already described in
  this spec's own Post-integration verification bullet above (G22). *(Corrected during the finalization
  completeness review: this file does not exist anywhere in the repo today — confirmed by exhaustive
  filename and content search — so this is new test-authoring work, not a "reactivation" as an earlier
  draft of this task mis-scoped it.)*
- [ ] Deployment-timed follow-up (separate commit — OQ1/OQ4/OQ5/OQ6 are all resolved, so this task is
  unblocked; it stays a separate commit because it needs a real deployed Better Auth instance, not
  because anything is still pending): flip `ALLOWED_ISSUERS`/`ALLOWED_AUDIENCE` in `accounts.rs` to the
  real Better Auth issuer/`client_id` on the OQ4-resolved dedicated subdomain, preserving `concat!()`
  (still required — ADR-0181 defers its removal to unlanded `13r-c-2`); tighten `audience_allowed` to
  exact single-value equality (closes the finalization security review's M2 finding, an unconfirmed
  assumption about Better Auth's `aud` population); write `ops/auth/docker-compose.yml`/`.env.example`/
  `README.md`'s single-client-registration invariant, the `sub`-opacity configuration note (native
  email+password is confirmed shipping, OQ5 — not conditional), and an explicit dev/QA-only policy note
  for the native credential path; write the Better Auth DR section in `docs/observability-dr-runbook.md`
  extending §7's port-drift list, with signing-key custody as its first line item (D20 — a prescribed
  default, not left open) and OQ6's backup-destination answer (a second machine Drew already owns)
  recorded; run the identity-equality-verified restore drill (G23).
- [ ] Append AUTH-39..60 (done, this pass) + [ADR-0182](../../projects/monster-realm/docs/adr/0182-m21b2-oidc-client-claim-ui-better-auth-deployment.md)
  (done, this pass) to the corpus; at build time regenerate `just knowledge`/`just adr-digest` after the
  code lands.
- [x] DONE (M21a, PR #298) Tests: proof-of-teeth coverage for AUTH-1..AUTH-38 *(server-side AUTH-1..29/34..38; the client-only AUTH-31/32/33 are M21b. 17 proof-of-teeth mutations executed and observed RED, then reverted.)*
- [x] DONE (M21a, PR #298) `just knowledge` regeneration (`evals/knowledge-bundle-conformance.eval.mjs` is a live, currently-wired
  `just ci` drift gate — M21a adds 3 new tables plus a new domain module, `accounts.rs`; missing this task
  would leave the committed `docs/knowledge/` bundle stale and fail CI on landing. Corrected this review pass
  — the original task list omitted it, unlike every other recent schema-touching milestone, e.g.
  `M17.5-tenth-review-residuals.spec.md`'s 17.5g-3.)
- [x] DONE (M21a, PR #298) `just adr-digest` regeneration after ADR-0179 lands *(M21a's ADR-0179 edits are body-only — Amendments/Consequences — so `just adr-digest` produces zero DIGEST.md drift; the header-derived digest was already generated when ADR-0179 landed in #294)*

## §5 Slice decomposition

| Slice | Touches | Notes |
|-------|---------|-------|
| **M21a** (structural spine) | `server-module/src/schema.rs`, `server-module/src/accounts.rs`, `server-module/src/accounts_tests.rs`, `server-module/src/lib.rs`, `server-module/src/monster_mgmt.rs`, `server-module/src/inventory.rs`, `server-module/src/npc.rs`, `server-module/src/raising.rs`, `server-module/src/economy.rs`, `server-module/src/ranking.rs` (+ each domain's `_tests.rs`), `client/src/module_bindings/**`, spec file | Schema-touching + cross-cutting re-key delegation → **SERIAL, no sibling** (mirrors m15a: guard/schema wiring spanning many domain files is bound to one PR, same as trading's guard-wiring slice). The six domain-file `rekey_*` additions are individually disjoint but are bundled into this one slice rather than split N-way: `accounts.rs`'s `rekey_all` cannot compile until all six exist, so splitting them wouldn't shorten the critical path, and doing so would exceed this project's fan-out cap (N≤2, `docs/routing.md`). |
| **M21b** (client) | `client/src/net/authToken.ts` (companion-key addition only, existing logic untouched), `client/src/net/connection.ts`, `client/src/ui/claim*.ts` (new), `client/src/main.ts` | Depends on M21a (bindings); parallel-eligible with M21c |
| **M21c** (evals + hardening extensions) | `evals/account-privacy.eval.mjs` (new), `evals/guest-claim-integrity.eval.mjs` (new), `evals/ranking-security.eval.mjs` (extend), `evals/currency-integrity.eval.mjs` (extend), `pvp_tests.rs` (extend `include_str!` list) | Depends on M21a merge; parallel-eligible with M21b |
| **M21b-2** (client OIDC wiring, claim UI, session lifecycle, Better Auth deployment — scoped 2026-08-10, ADR-0182) | New: `client/src/net/oidc.ts`(+test), `client/src/net/credentialDecision.ts`(+test), `client/src/net/claimCode.ts`(+test), `client/src/ui/claimModel.ts`(+test), `client/src/ui/claimView.ts`, `client/src/ui/sessionModel.ts`(+test), `client/src/ui/sessionView.ts`, `evals/account-e2e.eval.mjs`, `evals/client-no-pii-logs.eval.mjs`, `ops/auth/docker-compose.yml`, `ops/auth/.env.example`, `ops/auth/README.md`. Modified: `client/src/net/connection.ts`, `client/src/net/connection.test.ts`, `client/src/net/authToken.ts`(+test), `client/src/net/store.ts`, `client/src/net/rowConvert.ts`, `client/src/ui/overlayRegistry.ts`(+test), `client/src/ui/menuModel.ts`(+test), `client/src/ui/helpModel.ts`(+test), `client/src/main.ts`, `client/vite.config.ts`, `evals/dom-shell-coverage-exclusion.eval.mjs`, `server-module/src/accounts.rs` (lines 48/50 real values + `audience_allowed` tightening, deployment-timed), `docs/observability-dr-runbook.md`, `docs/adr/0179-accounts-auth-implementation-design.md` (Amendments pointer). **Explicitly not touched:** `REKEY_MANIFEST`, `accounts_tests.rs`'s D0-D10 coverage, any other reducer/schema, `evals/trade-escrow-guards.eval.mjs` (its `13r-c-2` migration is out of scope here). `client/package.json` is confirmed unchanged (zero new runtime deps) — not listed as touched. | Depends on M21a+M21b+M21c all merged (per the Cross-milestone ordering risk below, and because this slice widens `connection.ts`'s `build()` signature the earlier slices established). One slice — do not split further (N≤2 fan-out cap, `docs/routing.md`; this client work is not touches:-disjoint from itself). Gates G13–G30 (ADR-0182). Not blocked: OQ1/OQ4/OQ5/OQ6 are all resolved (above) — the only internally-sequenced part is the slice's own deployment-timed follow-up task (real `ALLOWED_ISSUERS`/`ALLOWED_AUDIENCE`, DR runbook), which needs a real deployed Better Auth instance to exist, not a pending decision. |

**Post-integration verification (M21a+M21b+M21c):** full `just ci` green-and-meaningful,
`bindings-drift = 0`, schema-snapshot updated to include `account`/`guest_claim`/
`guest_claim_reaper_schedule`, AUTH-1..AUTH-38 satisfied against the integrated whole (not merely
per-slice). The e2e (`connect (JWT) → account provisioned → start_guest_claim (anon tab) →
complete_guest_claim → re-key verified`) **cannot run at this stage** — it needs a real issuer, which
only exists after M21b-2's deployment-timed follow-up task lands (§5 M21b-2 row above); it is authored
and gated as G22/`evals/account-e2e.eval.mjs` there, not here.

**Post-integration verification (M21b-2, additionally):** the above, plus AUTH-39..60 satisfied against
the integrated whole; Gates G13–G30 all green; `evals/account-e2e.eval.mjs` (G22) passes against a
real self-hosted Better Auth test instance; the identity-equality restore drill (G23) run at least once.

## Risks / decisions
- **Cross-milestone ordering dependency (added on review, 2026-08-08):** M21a's touches: include
  `server-module/src/lib.rs` (the new `client_connected` reducer wiring). M20's m20a slice also touches
  `server-module/src/lib.rs` (the new `mr_heartbeat_schedule` wiring). These two slices are NOT touches:
  disjoint, even though nothing in either spec's own dependency section previously said so — the ordering
  that makes this safe (M21 fully merged — a/b/c — before any M20 slice launches) lived only in PLAN.md and
  the supervisor handoff, external to this spec. Stated here directly so it survives even if that external
  context is lost: **do not fan out M20a alongside M21a**, regardless of what a touches:-disjointness check
  against only the currently-declared file lists would suggest.
- Server-minted claim token brute-forceable → `ctx.rng()` is not a CSPRNG (pinned crate's own doc);
  the claim secret is client-minted instead (D3), which also decouples TTL from security.
- Guest→account collision ("sign up → play a bit → then claim") silently clobbering data → fail
  closed, never merge (D5 guard 3).
- Zombie anonymous tab racing a claim → guarded by the `player`-row-absence check, sound because
  `on_disconnect` deletes `player` strictly last (D5 guard 1).
- Re-key touching a table with no owning module or reachable from multiple guard sites → module
  write-isolation is enforced at the write level only (D0); a new gate (REKEY_COMPLETENESS) makes the
  manifest mechanically exhaustive rather than hand-enumerated (a prior hand-enumeration in this
  ceremony's own working notes missed `playtest_event.identity` on first pass — caught by an
  independent grep, not memory).
- `player_wallet`/`profile` never-delete invariants colliding with "delete the guest's rows" →
  credit-forward/copy-forward + in-place zero/tombstone (D6), never a delete.
- IdP database loss permanently orphans every account (`Identity = f(iss, sub)`) → named as OQ1's
  central DR question, not silently accepted.
- Expiring OIDC JWTs replayed like the long-lived anonymous token → silent, unprompted drop into a
  fresh anonymous identity on every reconnect past token expiry → silent renewal + explicit
  session-expired state (D8), not a stored-token replay.
- Reducers are fully serialized single-threaded WASM (ADR-0106 D8 precedent) → no TOCTOU exists
  between the completion guards and the re-key; atomicity is free.
- `start_guest_claim` has no per-identity/per-IP rate limit — anonymous connections are free by
  design (D4), so a script opening many anonymous connections could flood the private `guest_claim`/
  `guest_claim_reaper_schedule` tables. Accepted for M21: bounded by attacker connection throughput
  and self-cleaning via the 15-minute TTL reaper; named as an accepted risk rather than left
  unstated, unlike the multi-device race which gets a UX mitigation. Revisit if abuse is observed.

## → M22
The D6 re-key manifest (table, column, policy) is handed to M22 as ADR-0031's registry SSOT — its
deletion-completeness eval reuses the same source of truth rather than re-deriving one. M22 extends
`delete_account`'s existing reducer body (not a decoupled sweep) to add the grace window and the full
erase/anonymize cascade; the `profile` anonymize-in-place pattern (**zero stats, tombstone name**,
never delete) this milestone establishes for guest-claim reconciliation is the same pattern M22's
account-deletion cascade should reuse for `profile`, since ADR-0119 D1's never-delete invariant
doesn't relax for M22 either.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
