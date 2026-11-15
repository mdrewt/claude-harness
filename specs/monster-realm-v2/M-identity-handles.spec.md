# Spec: M-identity-handles — a minted discriminator for non-unique names, and an honest Sign In

**Status:** elaborated 2026-11-14 (from the 2026-10-24 sketch) against game `master` `9fb5bd25`.
`eo-1` (M-econ-onboarding) is in flight: it creates `server-module/src/onboarding.rs` and edits
`join_game`, the claim tests and the `account-e2e` eval, so the server slices here run after it.
· **Project:** monster-realm (server + client) · **Slices:** 4 — `ih-4` ‖ `ih-1`, then `ih-2`,
then `ih-3`. Anchors are files and symbols, never line numbers. · **Feeds:** `M19-social.spec.md`
(friend requests and chat consume the display contract `ih-3` ships).

**Decisions ANSWERED 2026-10-24** — monster-realm #588 (`pt3-identity-accounts`), all four
recommendations accepted verbatim; `memory/projects/decisions/issue-588.answer.md` is the SSOT:
- **D1** a minted numeric discriminator (e.g. `Drew#4821`), assigned at first join, never
  changing, carried through the account-claim re-key; shown low-contrast in Social/trade lists,
  omitted in battles, name tags and NPC dialogue.
- **D2** the Players tab shows name + discriminator + lead-monster level + "Nearby".
- **D3** the Account screen gets a UI-only fix: Sign In hidden while no issuer is configured,
  labelled "Sign in / create account with <provider>" once one is. Wiring a real issuer is a
  future milestone.
- **D4** M19 moves ahead of M18 (PLAN §9 carries it).

**Feedback items:** pt3-2026-10-087 (names stay free and non-unique, so the Players tab cannot
tell same-named players apart) → `ih-1` + `ih-3`; pt3-2026-10-088 (a Discord-style suffix,
unique and persistent across renames, omitted for immersion) → `ih-1` (mint), `ih-2` (the
level D2 added), `ih-3` (display); pt3-2026-10-099 (a Sign In button with no way to register)
→ `ih-4`. **Residuals:** none absorbed. `R-ctl-8g-CTL8G.1` (zone name in the Players tab) was
dispositioned `wontfix` by ts-6a (`M-trade-sessions.spec.md`, the residual triage table) because
D2 picked lead-monster level, not zone.

## Problem

Measured at `9fb5bd25`:

- **Names are not unique, and duplicates are the default.** `join_game`
  (`server-module/src/movement.rs`) and `set_profile_name` (`server-module/src/ranking.rs`)
  validate through `guards::validate_name` only (trim, NFC, non-empty, at most `MAX_NAME_LEN`,
  alphanumeric and space). `Player.name` (`server-module/src/schema.rs`) has no `#[unique]`, and
  the client joins every identity with the name `Player` (`client/src/main.ts`, the `connect`
  call), so until players rename, every row on the Players tab reads the same.
- **The Players tab cannot tell them apart.** `socialPlayers` (`client/src/ui/socialModel.ts`)
  builds `SocialPlayerRow { key, name, nearby }`: the key is the identity hex, which is never
  shown; `#<hex8>` appears only as the fallback for an empty name (inline in `socialPlayers`, and
  in `playerName`, `client/src/ui/tradeSessionModel.ts`). `leaderboardView.ts` paints the name in a `<bdi>` and the
  Nearby badge.
- **The identity is not stable.** The guest claim re-keys the guest's rows onto the account
  identity (`accounts::rekey_all`, `server-module/src/accounts.rs`), so anything derived from the
  identity hex changes on claim.
- **The `player` row is neither re-keyed nor durable.** `rekey_all` delegates monsters, evolution
  notices, inventory, npc state, heal cooldown, wallet, profile, formation and last position, and
  ends the trade sessions of both identities; `player` is deliberately left behind
  (`acct_rekey_roster_is_total_and_game_data_sees_every_rekeyed_table`,
  `server-module/src/accounts_tests.rs`, holds 11 re-keyed and 16 not-re-keyed tables). And
  `on_disconnect` (`server-module/src/lib.rs`) deletes the `player` row, so `join_game` inserts a
  fresh one every session. A value stored only on `player` would be re-minted each session.
- **The lifecycle gate names the constraint.** Every table has one entry in
  `DATA_LIFECYCLE_MANIFEST` (`server-module/src/schema.rs`; deletion policy + basis + `exportable`),
  `accounts_tests.rs` compares that set with the module definition, and the `account-e2e` eval
  (`evals/account-e2e.eval.mjs`) carries a 61-entry transcription of it
  (`M22S9_MANIFEST_TRANSCRIPTION`). `privacy.rs` asserts at compile time that every exportable
  table has an exporter. A new owner-keyed table needs a claim decision, a deletion decision and an
  export decision together.
- **Other players' monsters are private.** `monster_pub` is a private table read only through the
  owner-scoped `my_monster_pub` view, so no client can see another player's lead level today. The
  lead is the party monster with the lowest `party_slot` (`battle::lead_party_ids`,
  `server-module/src/battle.rs`).
- **Sign In always shows, and nothing says registration happens at the provider.** The Account
  section of the Profile screen (`client/src/ui/claimView.ts`, rules in `claimModel.ts`
  `claimActions`) offers Sign In in the `prompt` and `sign-in-failed` phases whatever the build.
  `main.ts` passes `connect` the build's `VITE_MR_OIDC_ISSUER` only for target kinds `official` and
  `test`, else the empty string; the issuer is read nowhere else (docs/DECISIONS.md, "A target's
  kind gates telemetry and account sign-in"). Server-side, `accounts::ALLOWED_ISSUERS` is the
  fail-closed `.invalid` placeholder, so no sign-in can succeed today by design, and no build sets
  an issuer.

## Scope

**In:**
- A private `player_handle` table holding one minted discriminator per identity, minted at join
  when the identity has none, carried by the guest claim, erased by the deletion cascade and
  included in the owner's data export (`ih-1`).
- Two appended public columns on `player`: `discriminator` (the mirror `join_game` writes from
  the handle) and `lead_level` (`ih-1` adds it; `ih-2` keeps it equal to the lead's level).
- The client display: the Players tab row (name, low-contrast tag, lead level, Nearby), the
  incoming trade and challenge request banners and the Trades-tab session row; every other
  surface stays name-only (`ih-3`).
- The Account-screen honesty fix (`ih-4`).

**Named deferrals:**
- The player's own tag on the Profile screen (so a player can tell a friend who they are) →
  M19, whose friend requests are the first flow that needs it.
- Tags on the Rankings tab, the trade editor heading and the PvP challenge rows → backlog (the
  leaderboard is a non-goal; the other two already sit under a surface that shows the tag).
- A low-contrast span inside single-line banner text → backlog (`banner-tag-style` below).
- A real OIDC issuer and its server allow-list → its own future milestone (D3; M21b-2 owns the
  native/Steam protocols).

**Non-goals:** enforced-unique names (item 087 keeps names free); friend requests, chat and block
lists (M19); rename machinery (`set_profile_name` and the rename UI stand); leaderboard rework
(`profile` and its name mirror stay as they are); any `game-core` change (minting is server
allocation, not a game rule).

## Prior rulings that bind

- **Auth stays pluggable per client build** (`feedback-auth-modularity`): the provider label and
  the issuer are build values passed in at one seam; no code path assumes one provider.
- **Export scope** (`feedback-data-export-scope`): the export is data about the person, through
  simple reads of existing tables. `player_handle` exists for play; the export reads it with one
  owner-keyed lookup and adds no table or column for its own sake.
- **Privacy doctrine:** owner-keyed state lives in a private table; RLS is unenforced at the
  pinned SpacetimeDB and is never the boundary. The discriminator and the lead level are public by
  design (their purpose is cross-player disambiguation), so they are mirrored onto `player`, which
  is public and holds a row only while its identity is online.
- **Additive schema:** a new table and appended `#[default]` columns only; bindings regenerate
  only through `just gen`.

## Decisions (reversible; documented defaults — no operator question)

- `decision-defaulted:handle-storage=private-player_handle+player-mirror` — `player_handle`
  (`owner_identity` primary key, `discriminator: u32` `#[unique] #[auto_inc]`) is private and
  durable. `player.discriminator` (`#[default(0u32)]`, appended) is the public copy `join_game`
  writes each session. Storing it only on `player` fails (the row is deleted at disconnect and
  not re-keyed); a public `player_handle` would publish every identity that ever joined, including
  offline ones; `profile` rows exist only after a first rating.
- `decision-defaulted:mint=auto_inc-sequence` — the value is the table's `auto_inc` sequence
  (insert 0, read back the assigned value), as `character.entity_id` and `monster_id` are. It is
  unique by the `#[unique]` constraint, never derived from the identity, and never reissued:
  SpacetimeDB sequences only grow, so a deleted player's tag is never minted to someone else. A
  re-key re-inserts the explicit value (a non-zero insert does not draw from the sequence). The
  join-order disclosure is in Risks.
- `decision-defaulted:handle-owner=onboarding.rs` — `ensure_handle`, `rekey_handle`,
  `erase_handle` and `has_handle` live in `server-module/src/onboarding.rs`, which `eo-1` creates
  as the home of first-join grants. `join_game` gains one call, `accounts.rs` one line each in
  `rekey_all`, `account_has_game_data` and the deletion cascade. No `mod` line is added to
  `lib.rs`.
- `decision-defaulted:legacy-identity=mint-at-next-join` — an identity that joined before `ih-1`
  has no handle; its next join mints one. Publishing the column add disconnects every client, so
  every live session rejoins and is minted.
- `decision-defaulted:deletion=erase-and-zero-mirror` — the cascade erases the handle
  (`DeletionPolicy::Erase`, `exportable: true`), and `ranking::player_with_deleted_name` also sets
  the surviving `player` row's `discriminator` and `lead_level` to 0, so the tombstoned row cannot
  be linked back to a tag seen in a trade or a future chat.
- `decision-defaulted:claim-collision=refuse` — `has_handle` joins `account_has_game_data`, so an
  account identity that holds a handle cannot take a guest's data ("already has game data", the
  existing refusal and its client bucket `retain-destination-terminal`). An account that joined
  before claiming already holds a starter monster, so this refuses nothing new in practice; it
  makes "two handles on one key" unrepresentable.
- `decision-defaulted:retired-guest=mints-fresh` — the retired guest token of a completed claim
  holds no handle after the re-key, so if it joins again it is minted a new tag. `eo-1` leaves it
  a starter-marker tombstone, so it gets no kit and no starter; it shares nothing with the account
  but the claim record.
- `decision-defaulted:lead-level=public-mirror-on-player` — `player.lead_level: u8`
  (`#[default(0u8)]`, appended; 0 means no party) is refreshed by one helper,
  `battle::refresh_lead_level(ctx, owner)`, beside `lead_party` (the lead's SSOT). It writes the
  `player` row only when the row exists and the value differs. It is called where the lead's level
  or the party's order can change: the end of `join_game` (after the starter), the dual-write
  seam `monster_mgmt::update_monster_synced` (every battle write-back, level-up, faint, box and
  reorder passes through it) when the written row's `level` or `party_slot` differs from the
  stored one (compared against the `monster_pub` row the seam already reads, so no extra read),
  and the session-trade slot move (`trading_session.rs`). A recruit needs no call:
  `taming::insert_recruited` always stores the monster (`PARTY_SLOT_NONE`). Quality-Time accrual (`raising::accrue_quality_time`) and the content
  resync change neither and get no call. A view was rejected: the pinned SpacetimeDB has only
  owner-scoped views here, and a per-subscriber view over `monster` costs a recompute per change.
- `decision-defaulted:tag-format=hash+min4-zero-pad` — the tag is `#` plus the decimal value
  padded to four digits (`#0042`), growing past four digits without truncation. 0 renders no tag.
  The join is the catalog string `identity.tag` (en and fr), never concatenation in view code.
- `decision-defaulted:empty-name-fallback=hex8-kept` — `playerName`'s `#<hex8>` fallback stays
  as it is. `validate_name` refuses an empty name at join and rename, so a player the store holds
  always has one; the fallback is reached only for an identity the store does not hold, which has
  no tag to show either.
- `decision-defaulted:banner-tag-style=plain-join` — the request banners and the Trades-tab row
  are single text lines; they carry the tag through `identity.taggedName` (`Drew #0042`) in the
  same text colour. The low-contrast span is on the Players tab, where a row is built from parts.
- `decision-defaulted:level-copy=reuse-tactics.hud.level` — the Players row's level reads through
  the existing `tactics.hud.level` key (`Lv.5` / `Niv.5`); 0 renders no level.
- `decision-defaulted:muted-token=--mr-text-muted` — the tag uses the existing
  `--mr-text-muted` token (`client/src/styles.css`), which the a11y suite already checks in both
  themes; no new colour.
- `decision-defaulted:provider-label=VITE_MR_OIDC_PROVIDER_NAME-else-issuer` — the label's
  provider is a build value `VITE_MR_OIDC_PROVIDER_NAME`, set beside the issuer
  (`ops/auth/README.md`); a build that sets the issuer and not the name shows the issuer string.
  No URL parsing: the OIDC flow already refuses an issuer it cannot use.
- `decision-defaulted:issuer-read-once=one-assignment` — `main.ts` reads the issuer env once into
  a module-scope `const` beside the `TARGET_KIND` import (the `operatedByUs` test moves with it,
  because `renderClaim` and the other `buildClaimViewModel` callers run outside `main()`), and
  passes that value to both `connect` and `signInOffer`. The DECISIONS entry's "anywhere but that one `connect` call" becomes "anywhere but
  that one assignment", and its "treating the empty issuer as a complete off switch" rule-out is
  restated: hiding the control is presentation, and the `connect` gate stays the boundary.
- `decision-defaulted:no-offer-copy=guest-play-continues` — with no offer, the `prompt` phase body
  says accounts are not available on this server yet and play continues as a guest
  (`claim.prompt.noProvider`). Decline keeps its current rule.
- `decision-defaulted:e2e-issuer=placeholder` — `client/playwright.config.ts` gives the e2e dev
  server `VITE_MR_OIDC_ISSUER=https://auth.monster-realm.invalid/` (the server's own placeholder)
  and a provider name, so `accounts.spec.ts` keeps its fail-safe sign-in flow (A2) against a
  configured but unreachable issuer. The no-issuer case is the default of every real build and is
  proven through the DOM view tests.

Every value above a player sees (tag format, label copy, level copy) is not the builder's to move
(`standards/spec-driven.md` §Adapting the plan during a build). A build whose measurement
contradicts one records it with `mr-gates notes add` and, if the slice cannot hold, parks.

## Contracts between slices

- **C1 (`ih-1` → `ih-2`, `ih-3`):** `Player` gains `discriminator: u32` and `lead_level: u8`,
  appended with defaults, in one schema change; the client bindings (`player_table.ts`,
  `types.ts`) carry both. `ih-2` writes `lead_level` and adds no column; `ih-3` reads both. Proof
  after merge: `bindings-drift` clean and the `spacetime-type-snapshot` and table-schema baselines
  unchanged by `ih-2` and `ih-3`.
- **C2 (`ih-1` ↔ claim / deletion / export):** `player_handle` is re-keyed by `rekey_all`, counted
  by `account_has_game_data`, erased by the cascade and exported to its owner. Proof after merge:
  `ih-1.5`–`ih-1.8` pass on `master`, and `account-e2e` (`just eval`) passes with its 62-entry
  transcription.
- **C3 (`ih-2` → `ih-3`):** a live `player.lead_level` equals `battle::lead_party`'s level for its
  identity at every commit (0 with no party). Proof after merge: `ih-3.6`'s e2e reads the
  starter's level for each joined player.
- **C4 (`ih-3` → M19):** `taggedName(players, identity)` and `formatTag(discriminator)` in
  `client/src/ui/playerTag.ts` are the one way a surface shows a tag; `playerName` stays
  name-only. M19's friend requests and chat call them.
- **C5 (`ih-4` ↔ the target-kind gate):** `signInOffer(issuer, providerName)` receives the value
  `connect` receives. Proof after merge: `client/src/main.targetKindGate.test.ts` and
  `accounts.spec.ts` pass together on `master`.

## Structure

The server spine adds no logic to `join_game` or `rekey_all`: the handle helpers go in
`onboarding.rs` (created by `eo-1`), the lead-level refresh beside `lead_party` in `battle.rs`.
Only `ih-1` edits `schema.rs`, `accounts.rs`, `ranking.rs` and `privacy.rs`. `ih-1` and `ih-2`
share one production file, `movement.rs` (`ih-1` the mint call and the mirror fields, `ih-2` one
refresh call at the end of `join_game`), and the test files `movement_tests.rs`,
`monster_mgmt_tests.rs`, `battle_tests.rs` and `trading_session_tests.rs`, where `ih-1` edits only
`Player` literals and `ih-2` adds cases. They are ordered (`ih-2` after `ih-1`), so no refactor
slice comes first. The client tail puts its two helpers in a new `client/src/ui/playerTag.ts`;
`socialModel.ts`, `noticeModel.ts` and `leaderboardView.ts` call them. `ih-3` and `ih-4` share the
three i18n catalog files and are ordered (`ih-3` after `ih-4`). `main.ts` receives wiring only
(`ih-4`: one `const` and one argument).

## Slices

### ih-4 — Sign In shows only when an issuer exists, labelled with its provider
type: feature · tier: hard
category: auth/ux · severity: MED · size: SMALL
touches: client/src/ui/claimModel.ts, client/src/ui/claimModel.test.ts, client/src/ui/claimView.ts, client/src/ui/claimView.test.ts, client/src/ui/claimView.i18n.test.ts, client/src/ui/profileView.test.ts, client/src/ui/screens/profileScreen.boot.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/main.ts, client/src/main.targetKindGate.test.ts, client/src/main.claimCode.test.ts, client/playwright.config.ts, client/e2e/accounts.spec.ts, ops/auth/README.md, docs/DECISIONS.md
after: []

- `claimModel.ts` gains `type SignInOffer = { readonly kind: 'none' } | { readonly kind:
  'provider'; readonly name: string }` and the pure `signInOffer(issuer: string, providerName:
  string): SignInOffer`. `buildClaimViewModel(state, offer)` takes it; `ClaimActions.signIn` is
  false for `none`, and `ClaimViewModel` gains `signInLabel: string | undefined`.
- `claimView.ts` writes the Sign In button's text from `vm.signInLabel`
  (`t('claim.signInWithProvider', { provider })`, en and fr); `claim.signInButton` is removed with
  its last caller. The provider name is player-visible build text and goes through the slot, never
  concatenation.
- `main.ts`: the issuer `const` (`issuer-read-once`), `VITE_MR_OIDC_PROVIDER_NAME` read beside it,
  the offer computed once and passed at each `buildClaimViewModel` call; the `claimSignIn` command
  calls `startSignIn` only when the offer names a provider (a hidden control is not a disabled
  command).
- `ops/auth/README.md` lists the new build variable with the other three. The `docs/DECISIONS.md`
  entry "A target's kind gates telemetry and account sign-in" is amended in place
  (`issuer-read-once`).
- Measured pins: `claimView.i18n.test.ts` maps `claim-signin-btn` to `claim.signInButton`
  (re-pointed); `accounts.spec.ts` A1 asserts the button text `t('claim.signInButton')` (re-pointed
  to the provider label); `catalog.test.ts`'s full English key list pins `claim.signInButton`
  (re-pointed to the new keys); `profileView.test.ts` and `main.claimCode.test.ts` call
  `buildClaimViewModel` with one argument, and `profileView.test.ts` expects `claim-signin-btn` as
  the Account section's default row (it passes an offer; the no-offer default row is Decline);
  `profileScreen.boot.test.ts` boots `main.ts` with no issuer and seats focus on Sign in (its cases
  boot with an issuer set, plus one no-issuer case). `main.targetKindGate.test.ts` boots `main.ts` under each kind; it gains
  the no-control case for `local` and `private`.

- **ih-4.1:** WHEN `signInOffer` receives an empty issuer, THE SYSTEM SHALL return `none`, and WHEN it receives an issuer with a provider name, THE SYSTEM SHALL return that name, and with an empty name the issuer string (`client/src/ui/claimModel.test.ts`).

- **ih-4.2:** WHEN the offer is `none`, THE claim view model SHALL offer no Sign In action in any phase, and THE Account section SHALL render no visible Sign In control (`client/src/ui/claimModel.test.ts`, `client/src/ui/claimView.test.ts`).

- **ih-4.3:** WHEN the offer is `none` and the claim is in the `prompt` phase, THE body SHALL read the `claim.prompt.noProvider` copy saying accounts are not available here yet and play continues as a guest (`client/src/ui/claimModel.test.ts`).

- **ih-4.4:** WHEN the offer names a provider, THE Sign In control SHALL read "Sign in / create account with <provider>" in English and "Se connecter / créer un compte avec <provider>" in French, the provider passed through the catalog slot (`client/src/ui/claimView.i18n.test.ts`).

- **ih-4.5:** WHEN `main.ts` boots under target kind `local` or `private` with a build issuer set, THE Account section SHALL render no Sign In control, and a dispatched `claimSignIn` command SHALL not call the connection's `startSignIn` (`client/src/main.targetKindGate.test.ts`).

- **ih-4.6:** WHEN the e2e build (placeholder issuer and provider name set) opens Profile then Account, THE Sign In button SHALL read the provider label, and pressing it SHALL fail safe as it does today: failure copy, a claim code in session storage, the world still playing (`client/e2e/accounts.spec.ts`).

Build note (ih-4): Measured pins the section does not list: client/src/main.dispatch.test.ts boots
main.ts with no issuer and asserts the Account section's onSignIn reaches startSignIn (two tests;
the boot gains an issuer, assertions unchanged), and ARCHITECTURE.md's Accounts paragraph enumerates
the client build variables (it gains VITE_MR_OIDC_PROVIDER_NAME). Both were added to touches by
mr-touches widen. catalog.test.ts holds the 543-key count at six sites, not five. The Sign In label
is written by claimView.render() only: show() receives no view model, and only a render can show the
button, so the claim-signin-btn row leaves claimView.i18n.test.ts's both-doors roster and gets its
own assertions (empty after the constructor and after show(), the model's string after render).

Build note (ih-4): With no sign-in offer the Account section keeps copy and a row that assume one.
The code-pending body still says to sign in to claim the progress and the sign-in-failed bodies
still say to try signing in again, while no Sign In row exists (reachable in a tab that holds a
claim code minted under a build with an issuer, or minted by the old always-shown button, then
loaded with no offer). In the prompt phase the only row is Decline, with no claim to decline, under
the title Keep your guest progress. The section changes the prompt body only (no-offer-copy), so the
rest needs a copy decision.

### ih-1 — the minted discriminator: table, mint at join, claim, deletion, export
type: feature · tier: hard
category: identity/schema · severity: MED · size: MODERATE
touches: server-module/src/schema.rs, server-module/src/onboarding.rs, server-module/src/onboarding_tests.rs, server-module/src/movement.rs, server-module/src/movement_tests.rs, server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/ranking.rs, server-module/src/ranking_tests.rs, server-module/src/privacy.rs, server-module/src/privacy_tests.rs, server-module/src/battle_tests.rs, server-module/src/content_tests.rs, server-module/src/economy_tests.rs, server-module/src/guards_tests.rs, server-module/src/lifecycle_tests.rs, server-module/src/monster_mgmt_tests.rs, server-module/src/npc_tests.rs, server-module/src/pvp_tests.rs, server-module/src/raising_tests.rs, server-module/src/tactics_tests.rs, server-module/src/trading_session_tests.rs, server-module/src/trading_tests.rs, server-module/src/native_host_tests.rs, client/src/module_bindings/player_table.ts, client/src/module_bindings/types.ts, evals/account-e2e.eval.mjs, evals/baselines/table-schemas.json, evals/baselines/spacetime-types.json, docs/DECISIONS.md
after: [eo-1]

- `schema.rs`: the private `player_handle` table (`handle-storage`, `mint`); `Player` gains
  `discriminator: u32` and `lead_level: u8`, both appended with `#[default]`; one manifest entry
  `player_handle` (`Erase`, `exportable: true`, a basis with no slash in it).
- `onboarding.rs`: `ensure_handle(ctx, owner) -> u32` (find, else insert 0 and return the
  assigned value), `rekey_handle(ctx, from, to)`, `erase_handle(ctx, owner)`,
  `has_handle(ctx, owner) -> bool`.
- `join_game` calls `ensure_handle` before it inserts the `player` row and writes the value and
  `lead_level: 0` into it (`ih-2` makes the level real).
- `accounts.rs`: `rekey_handle` in `rekey_all`, `has_handle` in `account_has_game_data`,
  `erase_handle` in the deletion cascade.
- `ranking::player_with_deleted_name` zeroes both new columns (`deletion`).
- The native host must draw `player_handle.discriminator` from a sequence for `ih-1.1`, `ih-1.3`
  and `ih-1.7` to mean anything. The build confirms it does (a 0 insert returns a fresh value, an
  explicit insert keeps its value); if it does not, the build extends the host fixture first and
  says so in the PR.
- `privacy.rs`: `rows_player_handle` and its JSON writer join the exporter table; the `player`
  exporter's exhaustive destructure gains the two columns.
- Measured pins (each a named intentional change; the build widens for any further one it
  measures):
  - Every `Player { … }` literal in the server test files listed in `touches:` gains the two
    fields. Assertions stay.
  - The native host aborts on a write to a table a test did not register: every native caller of
    `join_game` (`movement_tests.rs`, `monster_mgmt_tests.rs`, `guards_tests.rs`,
    `accounts_tests.rs`) registers `player_handle`.
  - `native_host_tests.rs`: `TABLE_DESCRIBERS` (61 entries, the source of `module_def()`) gains
    the `player_handle` describer, else the manifest-vs-module-definition test fails. The host
    models one `u64` `auto_inc` column per table; the `u32` discriminator registers through cast
    closures.
  - `accounts_tests.rs`: `acct_rekey_roster_is_total_and_game_data_sees_every_rekeyed_table`'s
    `REKEYED` goes from 11 to 12; `[bt7/export-unchanged]` (exactly seventeen exportable tables)
    goes to eighteen; `[bt7/manifest-census]` goes from 61 to 62; the `m22s6_table_row_types`
    registry gains the table.
  - `evals/account-e2e.eval.mjs`: `M22S9_MANIFEST_TRANSCRIPTION` gains
    `player_handle:Erase:owner_identity:1`; `checkCascadeTruth`'s hard `entries.length !== 61`
    check and the count comment go to 62.
  - `privacy.rs`: the comments that spell out the minimum bundle ("17 chunks", "16 * 17 = 272")
    are restated for eighteen; `EXPORT_MIN_BUNDLE_ROWS` derives from `EXPORTERS.len()` and needs
    no edit.
  - `evals/baselines/table-schemas.json` and `spacetime-types.json` are re-recorded; the client
    bindings regenerate through `just gen` (`player_table.ts`, `types.ts`; a private table gets
    no binding file). `client-visible-tables.json` and `client-surface-privacy` see no change:
    `player` is already visible and the new columns are public by design.
- The `docs/DECISIONS.md` entry records the discriminator rule ("a minted, never-reissued
  sequence value per identity, private at rest, mirrored onto the public `player` row while
  online, carried by the claim, erased at deletion"), naming `handle-storage`, `mint` and
  `deletion`.

- **ih-1.1:** WHEN an identity with no handle joins, THE SERVER SHALL insert one `player_handle` row whose discriminator is non-zero and differs from every other row's, and SHALL write that value to the new `player` row's `discriminator` in the same transaction (`server-module/src/onboarding_tests.rs`, through `join_game` on the native host).

- **ih-1.2:** WHEN an identity that holds a handle disconnects and joins again, THE SERVER SHALL mint nothing and SHALL write the same discriminator to the new `player` row (`server-module/src/onboarding_tests.rs`).

- **ih-1.3:** WHEN two identities join with the same name, THE two `player` rows SHALL carry different discriminators (`server-module/src/onboarding_tests.rs`).

- **ih-1.4:** WHEN a player renames through `set_profile_name`, THE handle row and the `player` row's discriminator SHALL be unchanged (`server-module/src/ranking_tests.rs`).

- **ih-1.5:** WHEN a guest that holds a handle is claimed into an account, THE account identity SHALL hold the guest's discriminator and THE guest identity SHALL hold no handle row, proven by extending `acct_guest_claim_round_trip_moves_every_row_and_spends_the_code`, and THE rekey roster pin SHALL classify `player_handle` as re-keyed (`server-module/src/accounts_tests.rs`).

- **ih-1.6:** WHEN an account identity that holds a handle and no other game data (a seeded fixture: `join_game` mints the handle and grants the starter together) tries to complete a guest claim, THE SERVER SHALL refuse with `already has game data` and move nothing (`server-module/src/accounts_tests.rs`).

- **ih-1.7:** WHEN an identity's deletion completes, THE identity's handle row SHALL be gone, THE surviving `player` row's `discriminator` and `lead_level` SHALL be 0, and a later first join by another identity SHALL be minted a discriminator different from the erased one (`server-module/src/accounts_tests.rs`).

- **ih-1.8:** WHEN a player requests a data export, THE bundle SHALL hold the caller's `player_handle` row and the `discriminator` and `lead_level` of the caller's `player` row, and no other identity's handle (`server-module/src/privacy_tests.rs`).

- **ih-1.9:** WHEN an identity whose deletion is pending or complete calls `join_game`, THE SERVER SHALL refuse it, mint no handle and leave any surviving `player` row's `discriminator` at its current value (`server-module/src/accounts_tests.rs`).

Build note (ih-1): ensure_handle returns Result<u32, String>, not the sketched u32: the mint is
try_insert, a refused insert (exhausted sequence, or a taken value) maps to the static reason
'handle unavailable', and join_with_kit logs it through log_reject before any presence row is
written. That is the behaviour the Risks row describes (an error and a reject log); a u32 return
could only panic. Proven by onboarding_tests
a_join_whose_mint_is_refused_fails_with_a_reject_line_and_writes_no_presence_row.

Build note (ih-1): Measured pins beyond the section's list (all moved by exactly the one table and
two columns): privacy_tests m22s4_exporter_set_equals_manifest_both_directions (17 to 18) and
m22s4_serializer_per_table_shape; accounts_tests data_lifecycle_partition_matches_spec_section3,
data_lifecycle_export_scope_structurally_narrower, m22s6_table_row_registry_matches_manifest
(identity-bearing rows 31 to 32), m22s6_owner_keyed_tables_are_erase_or_anonymize (27 to 28),
acct_export_chunks_carry_exactly_the_callers_rows_per_table,
acct_deletion_reaper_erases_every_owned_row_and_nothing_else; onboarding_tests JOIN_TABLES (9 to
10). Two listed items needed no edit: evals/baselines/spacetime-types.json holds nested
SpacetimeTypes only, so --write produced no diff; guards_tests.rs rb128's caller is refused before
any write, so it registers nothing (only its Player literals changed).

Build note (ih-1): The eighteenth exportable table moves the minimum export bundle from 17 to 18
chunks, and two DoS-bound tests in privacy_tests.rs were sized on 17. rb115 keeps its four tick
tuples (its populations are literal row counts); only its sizing tuple moved. rb111 is re-derived
and renamed rb111_one_tick_reaps_fifteen_whole_bundles_from_a_same_millisecond_burst: a 256-row
window over 18-row bundles touches 15 stamps, so the 16-stamp write cap cannot bind on bundles this
module writes and that test no longer shows it binding. The cap stays proven by
rb109_stamp_cap_binds_when_the_window_holds_more_than_sixteen_stamps,
rb109_oversized_tick_is_bounded_and_reaps_the_oldest_bundles_whole and
rb115_count_is_the_distinct_expired_stamps_before_the_cap (the verifier set the cap to 15 and to 17
and watched them go red). privacy.rs comments are restated for eighteen in five places.

Build note (ih-1): The DECISIONS.md entry states the storage, mint and deletion decisions in prose
and does not cite the handle-storage, mint and deletion keys by name: no entry in that log cites a
spec key, and the keys stop resolving when this spec file is retired.

Build note (ih-1): A session that stays connected through its own deletion cascade keeps its
tombstoned player row (tag 0, lead level 0). When the same identity connects again,
provision_or_touch_account re-registers the account fresh while that row still stands: join_game
answers 'already joined' until the old socket closes, set_profile_name passes the deletion gate
again and can rename the tombstone, and a guest claim completed in that window gives the account a
handle the standing row does not mirror. The state exists on master for the name tombstone; the
mirror heals at the next join. Found by the plan red-team; the remedy belongs to how the cascade
treats a connected subject (close its presence row, or refuse re-registration while one stands), not
to the handle.

Build note (ih-1): The legacy-identity decision rests on a publish disconnecting every live session,
so that each one rejoins and is minted. This build did not verify that against a live database
upgrade. A player row that outlives the publish keeps discriminator 0 until its session ends:
join_game answers 'already joined' with an Err, which rolls back, so nothing can backfill the row in
place.

### ih-2 — the lead-monster level stays live on the player row
type: feature · tier: hard
category: identity/social · severity: LOW · size: SMALL
touches: server-module/src/battle.rs, server-module/src/battle_tests.rs, server-module/src/monster_mgmt.rs, server-module/src/monster_mgmt_tests.rs, server-module/src/trading_session.rs, server-module/src/trading_session_tests.rs, server-module/src/movement.rs, server-module/src/movement_tests.rs
after: [ih-1]

- `battle::refresh_lead_level(ctx, owner)` reads `lead_party_ids`, then the lead's level (0 with
  no party), and updates the `player` row only when it exists and holds a different value. It
  never fails its caller: an offline owner has no row and is skipped.
- Callers (`lead-level`): the end of `join_game`; `update_monster_synced` when the written row's
  `level` or `party_slot` differs from its `monster_pub` row; the session-trade slot move in
  `trading_session.rs` (both sides). `evolution.rs` gets no call:
  `game_core::evolve` carries the level over, and its direct write changes no `party_slot`.
- `update_monster_synced`'s doc comment, which names the explicit write sites, gains the rule: a
  site that writes `level` or `party_slot` outside the seam calls `refresh_lead_level`.
- No schema, reducer signature or bindings change.
- Measured pin: native-host tests in `battle_tests.rs` and `trading_session_tests.rs` register
  `player` as not writable; a qualifying monster write now updates the owner's `player` row
  (seeded with `lead_level: 0`), so those fixtures register it writable. Assertions stay.

- **ih-2.1:** WHEN a fresh identity joins and receives the starter, THE `player` row's `lead_level` SHALL equal the starter's level (`server-module/src/movement_tests.rs`).

- **ih-2.2:** WHEN a battle write-back levels up the lead monster, THE owner's `player.lead_level` SHALL equal the new level when the transaction commits (`server-module/src/battle_tests.rs`).

- **ih-2.3:** WHEN the owner moves a different monster into the lead party slot, or boxes the lead, THE owner's `player.lead_level` SHALL equal the new lead's level, or 0 when the party is empty (`server-module/src/monster_mgmt_tests.rs`).

- **ih-2.4:** WHEN a session trade executes and moves either side's lead, THE `lead_level` of both sides SHALL equal their new leads' levels (`server-module/src/trading_session_tests.rs`).

- **ih-2.5:** WHEN a monster write runs for an owner with no `player` row, THE write SHALL succeed and SHALL insert no `player` row (`server-module/src/monster_mgmt_tests.rs`).

Build note (ih-2): Measured pins differ from the section's list. battle_tests.rs: no shipped case
goes red, so no fixture there registers player writable; only the new lead-level cases do, locally.
trading_session_tests.rs: the builder behind the seven ts2 cases that abort is s2_base, which now
registers player writable. onboarding_tests.rs (outside the declared touches, widened by
measurement): the three ih-1 cases that pinned the joiner's player row as (discriminator, 0) now
expect the lead's level, read from the joiner's monster row. Proven by a probe build: 1038 run, 10
red (7 trade aborts, 3 onboarding assertions), the same 10 with dev_reducers.

Build note (ih-2): The Player doc comment in server-module/src/schema.rs still says join_game writes
0, the cascade zeroes it, and nothing else writes lead_level. That sentence is false once this slice
merges: battle::refresh_lead_level writes it. schema.rs is outside this slice's touches and is a
structural path that cannot be granted while sibling slices are unmerged, so the comment is left for
a later slice; the same sentence in docs/DECISIONS.md was rewritten here.

Build note (ih-2): set_party_slot has no cooldown. Before this slice it wrote only the owner's
private monster rows; it now also updates the public player row whenever the call changes the lead's
level, and that update goes to every subscriber of player. set_profile_name already writes the same
public row on every call with no cooldown, so the exposure is not new in kind. If a limit is added
it belongs on every reducer that writes player.

Build note (ih-2): Three properties are true by construction and carry no test. (1) A seam write
that changes only the owner does not refresh: the guest claim is the one such caller, and its guards
9 and 11 leave neither identity a player row; the seam's doc comment says so. (2) The seam's
qualifying test saves reads only: a seam that refreshed on every write produces the same rows and
write counts, so no test separates the two. (3) The level byte is copied as stored, with no Level
parse; no test seeds an out-of-range level, which no shipped writer can produce.

### ih-3 — the tag and the lead level on the Social surfaces
type: feature · tier: hard
category: identity/social · severity: MED · size: MODERATE
touches: client/src/ui/playerTag.ts, client/src/ui/playerTag.test.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/net/rowConvert.ts, client/src/net/rowConvert.test.ts, client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/ui/leaderboardView.ts, client/src/ui/leaderboardView.test.ts, client/src/ui/noticeModel.ts, client/src/ui/noticeModel.test.ts, client/src/ui/tradeSessionModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/styles.css, client/src/net/connection.runtime.test.ts, client/src/shell/inputState.test.ts, client/src/shell/views.test.ts, client/src/ui/interactModel.test.ts, client/src/ui/pvpModel.test.ts, client/src/ui/pvpView.test.ts, client/src/ui/screens/bagScreen.boot.test.ts, client/src/ui/screens/journalScreen.boot.test.ts, client/src/ui/screens/profileScreen.boot.test.ts, client/src/ui/screens/socialScreen.boot.test.ts, client/src/ui/screens/socialScreen.test.ts, client/src/ui/screens/tradeSessionScreen.test.ts, client/src/ui/tradeSessionView.test.ts, client/src/main.accel.test.ts, client/src/main.battle-reseed.test.ts, client/src/main.boot.test.ts, client/src/main.chips.test.ts, client/src/main.controls.test.ts, client/src/main.dialogueDismiss.test.ts, client/src/main.dialogueEnded.test.ts, client/src/main.dispatch.test.ts, client/src/main.feedbackCore.test.ts, client/src/main.feedbackI18n.test.ts, client/src/main.help.test.ts, client/src/main.hintBar.test.ts, client/src/main.input.test.ts, client/src/main.menu.test.ts, client/src/main.notices.test.ts, client/src/main.noticesRt.test.ts, client/src/main.partyFull.test.ts, client/src/main.reconnectStack.test.ts, client/src/main.remap.test.ts, client/src/main.shopBalance.test.ts, client/src/main.social.test.ts, client/src/main.worldReveal.test.ts, client/src/main.zoneCue.test.ts, client/e2e/ui-social.spec.ts, client/e2e/ui-screens.spec.ts, client/e2e/identity-handles.spec.ts
after: [ih-2, ih-4]

- `StorePlayer` gains `discriminator: number` and `leadLevel: number`, converted in `rowConvert.ts`.
- `playerTag.ts` (new): `formatTag(discriminator: number): string | null` (`tag-format`) and
  `taggedName(players, identity): string` (`playerName` joined with the tag through
  `identity.taggedName`, or `playerName` alone when there is no tag). Catalog keys `identity.tag` and `identity.taggedName`, en
  and fr.
- `SocialPlayerRow` gains `tag: string | null` and `level: number | null`; `leaderboardView.ts`
  paints name (`<bdi>`), tag (a `span.mr-player-tag` coloured `--mr-text-muted`), level and the
  Nearby badge as separate nodes, inside the shipped nav-adapter row.
- `noticeModel.ts` (`fromName` of both request kinds) and `socialModel.ts`'s session row
  (`partnerName`) call `taggedName`; `socialPeopleKey` (the Players tab's repaint key) adds the tag
  and the level, so a live level change repaints the row. `playerName` is unchanged and keeps its
  other callers. `StorePlayer.name` stays the raw name, so every surface that reads it stays
  tag-free: the tactical battle clock (`main.ts` hands it `store.player(id)?.name`), the rename
  view and the rest. No player name tag is drawn in the world at `9fb5bd25`, and NPC dialogue
  names no player.
- Measured pins: the `StorePlayer` literals and `store.upsertPlayer({ … })` calls in the test
  files listed in `touches:` (the unit tests, the 23 `client/src/main.*.test.ts` boot tests, and
  the fake-store players of `client/e2e/ui-social.spec.ts` and `ui-screens.spec.ts`, which
  `tsconfig` type-checks) gain the two fields; assertions stay. `catalog.test.ts`'s full English
  key list gains the `identity.*` keys. Before adding a fixture builder, the build greps `client/test-util/`
  for one and extends it if it exists.

- **ih-3.1:** WHEN a `player` row arrives, THE store's `StorePlayer` SHALL carry its `discriminator` and `lead_level` as `discriminator` and `leadLevel` (`client/src/net/rowConvert.test.ts`).

- **ih-3.2:** WHEN `formatTag` receives 0, THE SYSTEM SHALL return null; for 42 it SHALL return `#0042` and for 123456 `#123456`; and `taggedName` SHALL return the bare name for a player whose discriminator is 0 (`client/src/ui/playerTag.test.ts`).

- **ih-3.3:** WHEN two other online players share a name, THE Players tab view model SHALL give each its own row with its own tag and its lead level, and a row whose `leadLevel` is 0 SHALL carry no level, and WHEN a listed player's tag or level changes THE `socialPeopleKey` SHALL change (`client/src/ui/socialModel.test.ts`).

- **ih-3.4:** WHEN the Players tab renders a row, THE name, the tag in a `--mr-text-muted` element, the level through `tactics.hud.level` and the Nearby badge SHALL render as separate nodes, with the name never passed through the resolver (`client/src/ui/leaderboardView.test.ts`).

- **ih-3.5:** WHEN an incoming trade or challenge request is shown, THE banner name SHALL be the requester's `taggedName`, and THE Trades-tab session row SHALL name its partner the same way (`client/src/ui/noticeModel.test.ts`, `client/src/ui/socialModel.test.ts`).

- **ih-3.6:** WHEN a `player` row with a non-zero discriminator arrives, THE store's `StorePlayer.name` SHALL be the raw name with no tag folded in, so the name-only surfaces that read it (the battle clock, the rename view) show no tag (`client/src/net/rowConvert.test.ts`).

- **ih-3.7:** WHEN three browser identities join with the default name, THE third's Players tab SHALL list two rows with the same name, different tags and each the starter's level (`client/e2e/identity-handles.spec.ts`).

## Post-integration verification (the milestone is done when all hold on `master`)

- Full `just ci` green with `just eval`: `account-e2e` passes with its 62-entry transcription
  (C2); `bindings-drift` is clean; the table-schema and type baselines change only in `ih-1` (C1);
  `client-surface-privacy` shows no change.
- On `master`, `client/e2e/identity-handles.spec.ts` and `client/e2e/accounts.spec.ts` pass in
  the same run: three joined identities read as distinct rows with levels (C3), and the
  provider-labelled Sign In fails safe (C5).
- `server-module/src/accounts_tests.rs`'s `ih-1.5`–`ih-1.7` cases and the roster pin pass on
  `master` together with `eo-1`'s claim cases (both slices edit the claim fixtures).
- One manual pass on a fresh local database, recorded in `ih-3`'s PR: two browsers, one renamed
  to the other's name; the third browser's Players tab tells them apart; a level-up in one
  changes its row; a disconnect and rejoin keeps its tag.

## Risks

- **The tag reveals join order.** A sequence value tells a reader roughly how many identities
  joined before this one. It carries no personal data; a random draw would hide it at the cost of
  collision retries. Reversible for future mints (the `#[unique]` constraint holds whichever
  scheme draws the next value); existing tags keep their values.
- **Tags are cheap to mint.** Anonymous identities cost nothing, so a tag proves "a different
  identity", not "a different person". Impersonation needs the same name and the same tag, which
  the never-reissued sequence prevents.
- **The lead level is now public, and so are its changes.** Any client sees each online player's
  lead level. D2 chose it as a public-enough signal; it was owner-only before. No other monster
  field is mirrored, but an observer who watches the value over a session sees reorders, boxing
  and lead level-ups as they happen. Accepted for D2; bucketing the value is the remedy if a
  playtest finds it matters.
- **The tag links a guest to the account it was claimed into.** That is D1's intent (the tag
  survives the claim). Anyone who saw the guest's `Name #0042` sees the account's row carry 0042.
  The server already records the link (`guest_claim`); claim guard 9 keeps the two rows from being
  online together. Deletion zeroes the tag on the surviving `player` row only; tags already copied
  into another player's memory or screenshots are out of reach.
- **Sequence exhaustion.** A `u32` sequence that ran out would make the `player_handle` insert,
  and so the join, fail with an error and a reject log, never wrap. That is about 4.3 billion
  identities; guests are never reaped, so the count only grows.
- **Lead-level staleness if a writer bypasses the seam.** A future site that writes a monster's
  `level` or `party_slot` without `update_monster_synced` and without `refresh_lead_level` leaves
  the mirror stale until the next seam write or join. `update_monster_synced`'s doc comment names
  the explicit sites; `ih-2` adds the refresh rule to that list.
- **Write cost.** The seam's qualifying test compares against the `monster_pub` row it already
  reads, so an HP-only write costs nothing new. A qualifying write adds one owner-indexed `monster`
  read and one `player` point read, never per movement input (Quality-Time accrual is excluded),
  and writes the public `player` row only on a change.
- **`eo-1` and `ih-1` both edit the claim and join fixtures.** The order (`ih-1` after `eo-1`) is
  the mitigation; `ih-1` rebases on `eo-1`'s fixtures rather than re-deriving them.
- **The hidden Sign In is proven below the browser.** No e2e build runs without an issuer (the
  fail-safe flow needs one); the DOM view tests and `main.targetKindGate.test.ts` carry the hidden
  case.
- **mr-prune census** (2026-11-14, `9fb5bd25`, `--spec` this file, recorded as
  `M-identity-handles`): 0 duplicates, so no `pruned-tests:` line.
  - **orphans:** `HEAL_COOLDOWN_MS` (`server-module/src/raising.rs`) is read only by
    `raising_tests.rs`'s `evaluate_heal` boundary cases; the heal reducer takes its cooldown from
    elsewhere. It goes to one `type: refactor` section of `structure.spec.md` (remove the constant
    and re-point or delete its two cases with a named survivor), filed through `mr-gates notes`
    because this PR may not edit that file. `ih-1` edits only `raising_tests.rs`'s `Player`
    literals.
  - **orphan-protected:** `CLAIM_EVENT_KINDS` (`client/src/ui/claimModel.ts`, token `claim`) is
    read only by `claimModel.test.ts`. `ih-4` edits the claim model and leaves it alone.
  - **signals** (named, no action): source-text reads in `claimModel.test.ts`,
    `claimView.test.ts`, `leaderboardView.test.ts`, `content_tests.rs`, `lifecycle_tests.rs`,
    `movement_tests.rs` and `privacy_tests.rs`; recent churn in most of the `StorePlayer` and
    `Player` fixture files. The slices edit fixtures and add cases there and add no source-text
    read.
  - **protected-churn:** `claimView.i18n.test.ts` (token `claim`), `accounts_tests.rs`
    (`account`), `lifecycle_tests.rs` (`lifecycle`), `privacy_tests.rs` (`priv`). Each is edited
    by exactly one slice, and only to re-point a pin or add a case.
  - **literal-variants:** `guards_tests.rs` (3 groups) and `lifecycle_tests.rs` (1), none in the
    `Player` literals `ih-1` edits.
