# M-weekly-review-2026-11-27 — weekly defect wave

Status: authored by the weekly review, pinned @ 26e1e085c5ae82977a10e6802e5405c1a4cf823c
(2026-11-27T01:39Z, master tip rb-140); sketch+ — elaborate via `milestone-loop-prompt.md`
when reached if gates ceremony is still needed. Every citation below was re-verified at the
pinned SHA by an independent verifier that was not the finder.
Depends on: nothing queued. Slices carry pairwise-disjoint `touches:` and may fan out.

Problem/intent: this week's review found the guest-claim flow strands the retired guest's
world rows (which later pollute an Allowlist seed), the client's claim completion dead-ends
when the account row arrives late, and three smaller honesty defects. One milestone schedules
the five verified findings plus three re-verified backlog residuals.

### wr261127-a — world binding & claim cascade integrity (server)
type: feature · tier: routine
category: data-integrity · severity: MED · size: S
touches: server-module/src/accounts.rs, server-module/src/world_binding.rs, server-module/src/access.rs, server-module/src/schema.rs
after: []

- residual: `R-weekly-review-2026-11-27-F1` · data-integrity · MED — **a completed guest claim
  leaves the retired guest's world rows behind.**
  Evidence @ 26e1e085: `server-module/src/accounts.rs:1118-1185` — `complete_guest_claim`
  calls `rekey_all` (accounts.rs:901-914; it moves monsters, inventory, wallet, profile,
  formation, handle — no world tables), `privacy::purge_export_bundles`,
  `schema::erase_tactical_rows` and `battle::anonymize_battles`, but never
  `access::erase_admission` or `world_binding::erase_world_binding`; the only callers of those
  two are in the deletion cascade (accounts.rs:1508-1509), which runs for the claimed
  account's identity, never the guest's. A guest may bind (`bind_world_account`,
  world_binding.rs:542-553, requires only admitted + not-deleting), so the claim leaves a
  permanent orphan `world_binding` row that `bound_accounts` (world_binding.rs:327-343) still
  counts and `set_world_access` (access.rs:233-240) seeds into the allowlist on a switch to
  Allowlist. The schema.rs:2224 manifest basis ("deleted outright at cascade time") is untrue
  for the guest side.
  - EARS: WHEN a guest claim completes, THE SYSTEM SHALL leave no world_binding,
    world_bind_nonce, world_admission or world_admission_attempt row keyed to the retired
    guest identity.
  - EARS: WHEN the access rule later changes to Allowlist, THE SYSTEM SHALL seed no account
    subject read from a retired identity's binding.
  Fix: in `complete_guest_claim`, beside `purge_export_bundles`, call
  `access::erase_admission(ctx, guest)` and `world_binding::erase_world_binding(ctx, guest)`;
  correct the manifest basis text. Test: bind a guest, complete the claim, assert zero rows
  for the guest identity across all four tables.

- residual: `R-weekly-review-2026-11-27-F2` · security-privacy · LOW — **a deleted account's
  subject stays on `world_allowlist` for good.**
  Evidence @ 26e1e085: schema.rs:2013 (`WorldAllowlist { #[primary_key] account_subject:
  String }`), manifest entry schema.rs:~2409 (`DeletionPolicy::NotOwned`, basis "no per-player
  data"); the deletion cascade (accounts.rs:1490-1515) erases world_admission and
  world_binding but no world_allowlist row. The subject is an identifier of a person.
  decision-defaulted:allowlist-erasure = the cascade removes the deleted account's subject
  from `world_allowlist` when no other counted binding carries it (reversible; not taken:
  documented retention as host-owned data — asked as decision issue
  rev-2026-11-27-allowlist-retention; fold the answer in before building).
  - EARS: WHEN an account's deletion cascade completes and no counted binding still carries
    its subject, THE SYSTEM SHALL leave no `world_allowlist` row holding that subject, and the
    manifest basis SHALL state the retention rule that ships.
  Fix: the removal beside accounts.rs:1508-1509 (or, if the decision answer flips, the
  manifest-basis and delete-account-UX wording instead); the test pins whichever rule ships.

- Absorbs residuals: `R-lpw-21-SEED-CAP-DOS` · security-privacy · MED — **the host cannot
  drop a binding: 257 bound accounts block the change to Allowlist.**
  Re-verified @ 26e1e085: `MAX_ALLOWLIST_ACCOUNTS = 256` (world_binding.rs:93);
  `allowlist_additions` refuses the whole write above it (world_binding.rs:~289);
  `set_world_access` seeds every counted bound account (access.rs:232-241); the only
  `world_binding` deletes are the self-scoped unbind (world_binding.rs:599) and the deletion
  cascade (world_binding.rs:366 ← accounts.rs:1509) — no owner-callable drop, and nothing
  bounds the table.
  - EARS: WHEN the world owner drops another identity's binding through an owner-gated
    reducer, THE SYSTEM SHALL delete that identity's binding and nonce rows and withdraw its
    admission under the same rules an unbind applies; WHEN the counted bound accounts then fit
    the cap, a switch to Allowlist SHALL succeed.
  Fix: an owner-gated `drop_world_binding(identity)` sharing `unbind_world_account`'s body
  (world_binding.rs:592-605); reject-don't-clamp refusal texts as elsewhere.

### wr261127-b — client honesty: the rename fallback and the turn-bar leads
type: feature · tier: routine
category: ux-a11y · severity: LOW · size: XS
touches: client/src/ui/renameModel.ts, client/src/ui/renameView.ts, client/src/ui/renameView.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/src/tactics/turnBar.ts, client/src/tactics/turnBar.test.ts
after: []

- residual: `R-weekly-review-2026-11-27-F3` · ux-a11y · LOW — **"(unnamed)" on the rename
  overlay is hard-coded English.**
  Evidence @ 26e1e085: renameModel.ts:43 `displayCurrentName: currentName !== '' ?
  currentName : '(unnamed)'`; renameView.ts:179-180 writes it straight into
  `#name.textContent`; no catalog entry exists (a grep of `ui/i18n/` for "unnamed" returns
  nothing) and renameView.test.ts:402-413 pins the English literal verbatim. The player who
  sees it — one who never named themselves — is the one the overlay exists for.
  - EARS: WHEN a player whose name is empty opens the rename overlay, THE CLIENT SHALL show
    and announce the missing-name placeholder from the i18n catalog, in English and French.
  Fix: add a `rename.unnamed` message id to messageIds.ts and both catalogs, use
  `t('rename.unnamed')` in `buildRenameViewModel`, re-point the pinned test, add an `fr`
  empty-name case; keep the hard-coded-string guard passing.

- residual: `R-weekly-review-2026-11-27-F4` · gameplay · LOW — **the turn-bar Surge/Retreat
  lead-in rounds are literals independent of the tuning they warn about.**
  Evidence @ 26e1e085: turnBar.ts:12-13 `SURGE_BADGE_FROM_ROUND = 7`,
  `RETREAT_BADGE_FROM_ROUND = 25`, chosen against today's tuning (`surge_start_round: 9`,
  `wild_round_cap: 30` — game-core content_tests.rs:1453-1455); `TurnBarInput` already
  carries `surgeStartRound`/`wildRoundCap` (turnBar.ts:~41-42) and the badge TEXT uses them,
  but the show-from gates do not; turnBar.test.ts:282-283 pins the literals against a fixture
  tuned 9/31, so no test fails when tuning moves. If the surge start drops to ≤7 the countdown
  (and the active badge below round 7) is lost; if the wild cap drops to ≤25 the retreat badge
  never shows before the cap.
  - EARS: WHEN the tactics tuning changes `surge_start_round` or `wild_round_cap`, THE CLIENT
    SHALL still show the surge lead-in badge for the lead window before surge starts and the
    retreat badge for the lead window before the cap, with the windows derived from the tuning
    input, not absolute rounds.
  Fix: named lead constants (`SURGE_LEAD`, `RETREAT_LEAD`) applied to
  `input.surgeStartRound`/`input.wildRoundCap`; a test with a perturbed tuning (5/20) that
  still shows both badges.

### wr261127-c — account claim completion and reset revocation
type: feature · tier: routine
category: data-integrity · severity: MED · size: S
touches: client/src/net/connection.ts, client/src/net/connection.runtime.test.ts, account-service/src/interactions/devPassword.ts, account-service/src/oidc/provider.ts, account-service/src/admin/cli.ts
after: []

- Absorbs residuals: `R-acs-7-CLAIMSTALL` · data-integrity · MED — **the guest claim never
  completes on a cold return leg.**
  Re-verified @ 26e1e085 (fresh mechanism): `completeGuestClaim` is sent only from the first
  snapshot's `onApplied` (connection.ts:1019); when the `my_account` row lands after that
  snapshot, the flow takes the `onClaimAwaitingAccount` branch (connection.ts:~1031), which
  only shows "Finishing your claim" (main.ts:~5181) — and nothing re-fires:
  `ingestAccount` (connection.ts:~793-804) checks only the PendingDeletion→Active edge
  (connection.ts:223-229). Matches the measured stall (account row present, guest_claim
  unconsumed, reducer never sent).
  - EARS: WHEN a stored claim code and an account credential are present and the `my_account`
    row arrives after the first snapshot, THE CLIENT SHALL still send `complete_guest_claim`
    exactly once, and SHALL leave "Finishing your claim" only on the reducer's answer.
  Fix: re-fire the claim check from `ingestAccount` (idempotent, once) when a claim is
  awaiting an account; a runtime test delays the account row past `onApplied`.

- Absorbs residuals: `R-acs-2-RESET-KEEPS-CHAINS` · security-privacy · MED — **a dev
  account's password reset leaves its refresh chains alive.**
  Re-verified @ 26e1e085: `resetPassword` (account-service/src/interactions/devPassword.ts:
  ~144-149) rewrites only the hash record; `revokeGrant` exists (provider.ts:83-90) but is
  called only from `findAccount` for gone/unentitled accounts (provider.ts:~117-127);
  `rotateRefreshToken: true` keeps a chain rotating ~30 days (provider.ts:~149). A reset is
  the answer to a leaked password, so the leaked session must die with it.
  - EARS: WHEN an account's password is reset or changed, THE SERVICE SHALL revoke that
    account's existing grants and refresh chains, so the next token refresh or sign-in
    requires the new password.
  Fix: track grants per account (or iterate the store) and call `revokeGrant` from
  `resetPassword`; test that a refresh token issued before the reset is refused after it.

### wr261127-d — tester rule: a slice's run must survive a loaded host
type: docs · tier: routine
category: loop-ops · severity: MED · size: XS
touches: standards/testing-tdd.md
after: []

- residual: `R-weekly-review-2026-11-27-F5` · loop-ops · MED — **recurring cause of the
  week: wall-clock margins and host-wide sweeps sized for an idle machine break under
  fan-out.** This week alone: profileView UIF16B.3 hit vitest's 5 s default at load average
  12-15 while sibling slices built (R-lpw-27-NOTEDC3D77, 2026-11-27); earlier instances of the
  same cause: the account-e2e orphan sweep kills sibling slices' eval runs
  (R-ts-6b-8-NOTEB33FB3), two fan-out slices' `just ci` runs kill each other in the account
  service (R-acs-6-EVALKILLSSIBLING), deployment discovery times out behind load
  (R-acs-7-DEPLOYFLAKE, R-lpw-39-NOTE8318F6). The week's two `plan-delta:` lines (ts-6b-2,
  sr-4b) read as honest fact corrections, not scope growth — no spec-driven tightening needed.
  Earliest-step rule change (a tester rule): amend `standards/testing-tdd.md` with — a
  slice's suite SHALL assume a loaded, shared host: any process sweep, port probe or
  database discovery it performs is scoped to the slice's own run (its own pid tree, its own
  database, its own directory), never pattern-matched across the host; and a case whose
  honest runtime approaches a framework's default timeout declares its own explicit budget
  rather than inheriting the default.
  Fix: one short subsection in `standards/testing-tdd.md` (house style, with the four
  incident ids above as the motivating record).
