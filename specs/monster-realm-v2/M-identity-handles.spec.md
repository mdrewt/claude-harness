# Spec: M-identity-handles — stable player discriminator for non-unique names (SKETCH)

**Status:** sketch, 2026-10-24 (Playtest-3 feedback episode). Elaborate with
`milestone-loop-prompt.md` when PLAN §9 reaches it, against the CURRENT game repo ·
**Project:** monster-realm (server + client) · **Feeds:** `M19-social.spec.md` (friend requests
and chat need this identity primitive — M19's sketch is reshaped to consume it, not re-derive it)
· **Decisions ANSWERED 2026-10-24** — monster-realm #588 (`pt3-identity-accounts`), all four
recommendations accepted verbatim (`memory/projects/decisions/issue-588.answer.md`): minted
numeric discriminator carried through the account-claim re-key; Players tab = name +
discriminator + lead-monster level + "nearby" marker; Sign-In hidden while no issuer is
configured (labeled "Sign in / create account with <provider>" once one is); M19 moves ahead of
M18. All formerly-pending rows below are resolved in place.
**Feedback items:** pt3-2026-10-087, pt3-2026-10-088, pt3-2026-10-099.
**Absorbs (conditional — NOT activated):** R-ctl-8g-CTL8G.1 (zone name in the Players tab) does
NOT absorb here: #588 D2 picked lead-monster level, not zone. The residual stays open where it
lives.

## Problem / intent

Display names are free-choice and deliberately NON-unique, and the operator wants to keep that:
item 087 embeds the preference "I like that players can choose whatever name they want", which
rules out enforced-unique names. But the Players tab then "could fill up with multiple players
using the same name, and no way for another player to determine who is who"
(`playtest-feedback-2026-10.md` ≈251–255, repeated ≈295–297). His suggested remedy (item 088,
"One option…") is a Discord-style minted suffix: unique, persistent across renames, omitted for
immersion in battles/name tags/NPC dialogue, shown low-contrast in chat/trade/friend contexts.
This milestone mints that discriminator server-side, renders it by the operator's own context
split, and also absorbs the Account-screen registration confusion (item 099), because both land
on the same identity/account surfaces.

## Ground truth (fact-checked 2026-10-24; symbols, not line numbers)

- **No uniqueness today:** `set_profile_name` (`server-module/src/ranking.rs`, ADR-0132) and
  `join_game` (`server-module/src/movement.rs`) validate via `guards::validate_name` only —
  trim/NFC, non-empty, ≤ `MAX_NAME_LEN`, alphanumeric+space. `Player.name` carries no
  `#[unique]` (`server-module/src/schema.rs`, `Player`).
- **Players tab shows name + Nearby only;** the identity hex is the nav key but is not shown;
  `#<hex8>` renders only as the fallback for an EMPTY name (`client/src/ui/socialModel.ts`,
  `SocialPlayerRow`; shipped by ctl-8g against CTL8G.1, zone name DEFERRED as
  R-ctl-8g-CTL8G.1).
- **Identity is NOT stable:** the guest→account claim re-keys the player's data onto a new
  `Identity` (`accounts::rekey_all`, `server-module/src/accounts.rs`). Anything derived from the
  Identity hex — the `#<hex8>` fallback, `player.entity_id` — changes on claim, so a hex-derived
  suffix violates item 088's "unique and persistent".
- **The `player` row itself is NOT re-keyed:** `rekey_all` delegates cover monsters, evolution
  notices, inventory, npc state, heal cooldowns, wallet and profile — `player` is deliberately
  left behind (the rekey-roster pin
  `acct_rekey_roster_is_total_and_game_data_sees_every_rekeyed_table`,
  `server-module/src/accounts_tests.rs`, classifies every owner-keyed table as re-keyed or
  deliberately left). A discriminator appended to `player` would therefore NOT survive a claim.
- **The lifecycle gate exists and names the constraint:** every owner-keyed table must be
  classified in `DATA_LIFECYCLE_MANIFEST` (`server-module/src/schema.rs`) AND in the re-key
  roster — "a new owner-keyed table cannot ship without a claim-flow decision" (the M22
  REKEY_MANIFEST/G6 machinery, now living as the manifest + `accounts_tests.rs` pins).
- **Sign In is an OIDC redirect:** the Account screen's Sign In dispatches `startSignIn`
  (`client/src/net/oidc.ts`) to an external IdP configured by `VITE_MR_OIDC_ISSUER` et al.
  (`client/src/main.ts`, `authIssuer`); registration, if offered, happens AT the provider and
  nothing in the UI says so. Server-side, `ALLOWED_ISSUERS` is still the fail-closed
  `.invalid` placeholder (`server-module/src/accounts.rs`), so no sign-in can succeed today by
  design.

## Scope (sketch)

- **Server spine — a minted discriminator.** A numeric discriminator minted ONCE per player at
  character creation, unique across all players (`#[unique]`/`#[auto_inc]`-class mechanism),
  NEVER derived from the Identity hex. Storage is additive-only: a NEW table (e.g.
  `player_handle`: identity key + minted value) or an appended `#[default]` column on an
  already-re-keyed table — the sketch leans NEW TABLE, because `player` is not re-keyed (see
  Ground truth) and `profile` rows only exist after first rating application. Decide the final
  shape at elaboration.
- **Claim-cascade carriage (hard constraint).** Whatever holds the minted value registers in
  `DATA_LIFECYCLE_MANIFEST` (deletion policy + basis + exportable) AND gains a `rekey_*`
  delegate in `accounts::rekey_all`, so the discriminator survives the guest→account re-key.
  The existing roster and round-trip pins
  (`acct_rekey_roster_is_total_and_game_data_sees_every_rekeyed_table`,
  `acct_guest_claim_round_trip_moves_every_row_and_spends_the_code`) extend to cover it — they
  are the gate, not a new mechanism.
- **Renames keep the suffix.** `set_profile_name` (and its RL-7 rate-limit allowlist,
  ADR-0132) is untouched; the discriminator is independent of the name.
- **Client display rules (the operator's own split, item 088).** Shown LOW-CONTRAST next to the
  name in Social/disambiguation contexts — the Players tab, trade-request and challenge-request
  banners, and (when M19 lands) friend requests and chat. OMITTED in battles, name tags and NPC
  dialogue for immersion. The suffix join is a typed i18n catalog string with a slot (en+fr),
  never string concatenation in view code; the Players-tab rendering stays inside the shipped
  nav-adapter model (no mouse-only element).
- **Players tab extra info — DECIDED (#588 D2):** name + discriminator + the LEVEL of the
  player's lead monster + the "nearby" marker. Zone was NOT picked, so R-ctl-8g-CTL8G.1's
  conditional absorption does NOT activate (that residual stays where it lives; its
  hidden-dependency note is moot here). Lead-monster level is new subscribed surface — elaborate
  its data path against the owner-scoped view model (the LEAD monster's level is the owner's
  public-enough signal the operator chose; keep it out of any private-table read path).
- **`#<hex8>` fallback retired or re-based.** The empty-name fallback can become the
  discriminator itself (stable, unlike hex8 which changes on claim) — decide at elaboration.
- **Account-screen honesty (item 099) — DECIDED (#588 D3): UI-only fix.** HIDE Sign In while no
  issuer is configured; when one is, label it "Sign in / create account with <provider>". Wiring
  a real OIDC issuer stays its own future milestone; auth stays pluggable per client build
  (standing ruling, `feedback-auth-modularity`; Steam/native deferred per M21b-2).

## Non-goals

- Enforced-unique names (ruled out by item 087's embedded preference).
- Friend requests, chat, block lists — M19 owns them; this milestone only supplies the
  identity primitive and the display contract M19 consumes.
- A first-party registration flow or an auth-provider choice (M21b-* decision territory;
  only the UI-honesty fix is in scope unless pt3-identity-accounts rules otherwise).
- Rename machinery changes (ADR-0132 reducer, ADR-0133 input hygiene stand).
- Leaderboard/profile rework (`profile` stays the public leaderboard surface, ADR-0125 mirror
  untouched).

## Constraints that bind the design

- **Additive-only schema** (appended `#[default]` columns or new tables; no reorder/rename);
  client bindings are generated-only, so the new table/column forces a bindings regen between
  the server spine and the client tail.
- **The M22 re-key/lifecycle gate** (named above) — carriage through claim AND a deletion-policy
  classification (freed vs tombstoned on account deletion) are decided together, in the
  manifest, not ad hoc.
- **Not derived from Identity; no PII.** Accounts hold no PII (Identity = f(iss, sub)); a
  minted integer carries none. The discriminator is public-by-design (its whole purpose is
  cross-player disambiguation) — mirroring the already-public `player` table is acceptable, but
  the private-tables + owner-scoped-views doctrine governs anything beyond the minted value.
- **Determinism doctrine untouched:** minting is server-side allocation (like `entity_id`), not
  a game rule; no game-core change is expected. If any rule ever needs it, it lives once in
  game-core.
- **i18n total catalog (en+fr)** for every new string; the virtual-button/context-stack controls
  doctrine for every touched surface.

## Acceptance sketch (full EARS at elaboration)

- **IDH-mint:** WHEN a character is created, THE SERVER SHALL mint a discriminator unique
  across all players and persist it additively; a player SHALL keep exactly one for life.
- **IDH-rename:** WHEN a player renames, THE discriminator SHALL NOT change.
- **IDH-claim:** WHEN a guest claims an account, THE discriminator SHALL follow onto the
  claimer identity — proven by extending the existing claim round-trip and rekey-roster pins,
  not by a parallel test rig.
- **IDH-display:** WHEN two online players share a name, THE Players tab (and trade/challenge
  request surfaces) SHALL render each with the low-contrast suffix so the rows are
  distinguishable; battle, name-tag and NPC-dialogue surfaces SHALL NOT render it.
- **IDH-auth-ui:** WHEN no OIDC issuer is configured, THE Account screen SHALL NOT render the
  Sign In affordance at all; WHEN one is configured, THE affordance SHALL be labelled
  "Sign in / create account with <provider>" (i18n-slotted) — #588 D3.
- **IDH-i18n:** every new string ships in en+fr through the typed catalog with its roster pins
  updated.

## Decisions — ANSWERED 2026-10-24 (#588 `pt3-identity-accounts`; answer file is SSOT)

- **Suffix format and mechanism — DECIDED (D1):** a minted numeric discriminator (e.g.
  `Drew#4821`), assigned at first join, never changing, carried through the account-claim
  re-key; shown low-contrast in Social/trade/chat lists, omitted in battles, nametags and NPC
  dialogue. (The mechanism itself — not just the format — is confirmed.) Exact digit
  count/zero-padding: elaboration detail.
- **Players-tab info — DECIDED (D2):** name + discriminator + lead-monster level + "nearby".
- **Account-screen scope — DECIDED (D3):** UI-only honesty fix now (hide; provider-labelled when
  configured); issuer wiring is a future milestone.
- **Roadmap — DECIDED (D4):** M19 moves ahead of M18; M18 re-sketches after the tactical P2
  (PLAN §9 updated).
- **Storage shape** (new `player_handle` table vs appended column on a re-keyed table) remains an
  elaboration-time design call INSIDE the constraints above — the sketch leans new-table; the
  slice confirms against current schema.

## Notes (sequencing / fan-out)

- Natural slice shape: a serial server spine (schema + mint + rekey/lifecycle registration +
  tests) → bindings regen → a client display tail (socialModel/banner surfaces + i18n). The
  Account-screen fix is a separate, parallelizable client slice once the decision lands.
- The Players-tab rendering touches the same `socialModel`/`leaderboardView` surface the
  pending UI-chrome rework restyles — order with it (and after `so-2`, which owns Social frame
  routing) so the roster pins are not rewritten twice.
- M19's sketch consumed this milestone's output by name; when M19 is re-sketched, its friend
  request and chat surfaces take the IDH-display contract as given.
