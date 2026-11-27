# M-weekly-review-2026-11-27 — weekly defect wave

Status: authored by the weekly review, pinned @ 26e1e085c5ae82977a10e6802e5405c1a4cf823c
(2026-11-27T01:39Z, master tip rb-140); every citation was verified there by an independent
verifier that was not the finder. Elaborated 2026-11-27 against game master ce7f0000 (acs-8,
lpw-41, rb-141, acs-14 and the lpw-26/lpw-27 designs landed since): every citation re-read
there, and named by file and symbol rather than line, so it survives edits.
Depends on: nothing queued. wr261127-a..c carry pairwise-disjoint `touches:` and may fan out;
wr261127-d is `blocked:` until the operator approves it.

## Problem / intent

This week's review found that the guest-claim flow strands the retired guest's world rows
(which later pollute an Allowlist seed), that the client's claim completion dead-ends when the
account row arrives late, and three smaller honesty defects. One milestone schedules the five
verified findings plus three re-verified backlog residuals.

## Scope

In: the four slices below, one per surface — the server module's world tables (a), two client
honesty fixes (b), the claim's return leg and the account service's password reset (c), and a
tester rule in the harness standards (d).

Named deferrals (declared, not dropped):
- The design-B successor of `world_binding` (lpw-23's `world_account`, keyed by identity): its
  erasure on a guest claim and an owner's drop of it are lpw-23's to carry; this milestone fixes
  the lpw-15 tables that ship today (follow-up note filed against lpw-23).
- `R-np-b-SLOWLINK` (operator-promoted, monster-realm#786): measure-first work too large for this
  wave; it keeps its own hand-scheduled slot.
- `R-lpw-15-NOTEF43B6E`: its erase half was fixed by lpw-22 and its export half duplicates
  `R-lpw-15-NOTEF21B2C`; left to the supervisor's disposition, not scheduled here.

## Decisions (defaults recorded; each reversible)

- decision-defaulted:allowlist-erasure (decision issue monster-realm#886, unanswered) = the
  deletion cascade removes the deleted account's subject from `world_allowlist` when no other
  counted binding carries it (reversible; not taken: documented retention as host-owned data).
  If the answer flips before wr261127-a builds, the slice ships the manifest-basis and
  delete-account wording for retention instead, and wr261127-a.3 pins that rule.
- decision-defaulted:drop-unknown-refused = `drop_world_binding` naming an identity with no
  binding is refused with an error, not a silent success (reject, don't clamp; the owner asked
  for something that did not happen). The self-scoped `unbind_world_account` stays idempotent.
- decision-defaulted:reset-revocation-mechanism = the reset runs in the admin CLI
  (`account-service/src/admin/cli.ts`, `reset-password`), a process apart from the provider, so
  the provider's in-process `revokeGrant` cannot be called from it. Default: the dev account
  record carries the time its password last changed, and the provider's `findAccount` refuses a
  code or refresh token issued before that time and revokes its grant (the path it already takes
  for a gone or unentitled account). Not taken: a per-account lookup column in
  `store/sqliteAdapter.ts` so the CLI revokes the records itself — added by measurement
  (`mr-touches widen`) only if the default proves unworkable. Internal design; never an operator
  question.

## Risks / flags

- wr261127-a touches `server-module/src/schema.rs` (manifest basis text only, no table change)
  and `game-core/src/lib.rs` (the protocol number rises with the new reducer's bindings). Both
  are structural: mr-disjoint runs the slice serial with lpw-32 and with any other unmerged slice
  touching those files. It carries no `after:` edge — the roadmap order (PLAN §9 item 1, ahead
  of M-local-play) decides.
- wr261127-a and lpw-23 both edit `world_binding.rs`, `access.rs` and `accounts.rs`; lpw-23
  rewrites the allowlist seeding to handles. Whichever lands second rebases onto the other; the
  claim erase this slice adds is the place lpw-23 adds `world_account`.
- wr261127-c shares `account-service/src/provider.ts` with acs-9 and `client/src/net/connection.ts`
  with lpw-24 (both unbuilt); mr-disjoint serializes them at launch.
- wr261127-b shares `renameModel.ts` and the i18n catalogs with lpw-40 and other client slices;
  catalog edits are additive key insertions.
- mr-prune census, recorded as `M-weekly-review-2026-11-27` at game `ce7f0000`: no
  `duplicates` and no `orphans` row, so no `pruned-tests:` line and no structure section.
  Named here as the loop requires — `orphan-protected`: `client/src/ui/i18n/plural.ts`
  (`cldr`) and `client/src/ui/privacyBanner.ts` (`PRIVACY_PSEUDONYMIZATION_DISCLOSURE`), both
  reached through wr261127-b's catalog test and left alone; `signals` (source-text or churn):
  `renameView.test.ts`, `catalog.test.ts` (wr261127-b), `connection.runtime.test.ts`
  (wr261127-c), `accounts_tests.rs`, `privacy_enforcement_tests.rs`, `world_binding_tests.rs`
  (wr261127-a); `protected-churn`: `catalog.test.ts`, `accounts_tests.rs`,
  `privacy_enforcement_tests.rs`. A slice that edits a source-text pin in those files adapts it
  under `standards/testing-tdd.md` §Behavior-preserving changes rather than adding to it.

## Post-integration verification

After all of a–c merge: full `just ci` green; `bindings-drift` clean; the wire-contract test
green at the raised protocol number; and the combined behaviour end to end — a guest who bound
a world claims an account, the owner switches the world to Allowlist (the retired guest's
subject is not seeded), the owner drops a stale binding, and the switch succeeds under the cap.
wr261127-d's rule then governs every later tester run.

## Slices

### wr261127-a — world binding & claim cascade integrity (server)

type: feature · tier: hard
category: data-integrity · severity: MED · size: S
touches: server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/world_binding.rs, server-module/src/world_binding_tests.rs, server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/schema.rs, server-module/src/privacy_enforcement_tests.rs, game-core/src/lib.rs, client/src/module_bindings/**, client/src/net/wireContract.json, evals/baselines/client-callable-reducers.json, docs/local-play.md, docs/DECISIONS.md
after: []

- Tier: hard — a new owner-gated reducer, a deletion-cascade change and a protocol bump.
- Structural: `server-module/src/schema.rs` and `game-core/src/lib.rs` make this slice serial
  with lpw-32 and any other unmerged slice touching them (mr-disjoint); see Risks.

- residual: `R-weekly-review-2026-11-27-F1` · data-integrity · MED — **a completed guest claim
  leaves the retired guest's world rows behind.**
  Evidence @ 26e1e085, re-read @ ce7f0000: `accounts.rs` `complete_guest_claim` calls `rekey_all`
  (it moves monsters, inventory, wallet, profile, formation and handle — no world table),
  `privacy::purge_export_bundles`, `schema::erase_tactical_rows` and `battle::anonymize_battles`,
  but never `access::erase_admission` or `world_binding::erase_world_binding`; their only callers
  are in the deletion cascade, which runs for the claimed account's identity, never the guest's.
  A guest may bind (`world_binding.rs` `bind_world_account` requires only admitted and not
  deleting), so the claim leaves a permanent orphan `world_binding` row that `bound_accounts`
  still counts and `access.rs` `set_world_access` seeds into the allowlist on a switch to
  Allowlist. The deletion manifest's `world_binding` basis in `schema.rs` ("deleted outright at
  cascade time; not re-keyed by the claim flow") is untrue for the guest side.
  Fix: in `complete_guest_claim`, beside `purge_export_bundles`, call
  `access::erase_admission(ctx, guest)` and `world_binding::erase_world_binding(ctx, guest)`;
  correct the manifest basis text.

- residual: `R-weekly-review-2026-11-27-F2` · security-privacy · LOW — **a deleted account's
  subject stays on `world_allowlist` for good.**
  Evidence @ 26e1e085, re-read @ ce7f0000: `schema.rs` `WorldAllowlist` (primary key
  `account_subject: String`); its manifest entry is `DeletionPolicy::NotOwned` with the basis
  "the account subjects the host lets in: the host's own list, no Identity column, written only
  by the module owner"; the deletion cascade in `accounts.rs` erases `world_admission` and
  `world_binding` but no `world_allowlist` row. The subject is an identifier of a person. Rule:
  decision-defaulted:allowlist-erasure above (monster-realm#886).
  Fix: the removal beside the cascade's `erase_admission`/`erase_world_binding` calls (or, if the
  decision flips, the manifest basis and delete-account wording instead).

- residual: `R-lpw-21-SEED-CAP-DOS` · security-privacy · MED — **the host cannot drop a
  binding: 257 bound accounts block the change to Allowlist.**
  Re-verified @ 26e1e085 and @ ce7f0000: `world_binding.rs` `MAX_ALLOWLIST_ACCOUNTS = 256`;
  `allowlist_additions` refuses the whole write above it; `access.rs` `set_world_access` seeds
  every counted bound account; the only `world_binding` deletes are the self-scoped
  `unbind_world_account` and `erase_world_binding` (called by the deletion cascade alone) — no
  owner-callable drop, and nothing bounds the table.
  Fix: an owner-gated `drop_world_binding(identity)` sharing `unbind_world_account`'s body
  (`require_world_owner` first; reject-don't-clamp refusal texts as elsewhere); it joins the
  owner-only roster in `privacy_enforcement_tests.rs` and the regenerated bindings.

- **wr261127-a.1:** WHEN a guest who bound the world completes a claim, THE SYSTEM SHALL leave no `world_binding`, `world_bind_nonce`, `world_admission` or `world_admission_attempt` row keyed to the retired guest identity.

- **wr261127-a.2:** WHEN the owner switches the access rule to Allowlist after such a claim, THE SYSTEM SHALL seed no account subject read from the retired guest's binding.

- **wr261127-a.3:** WHEN an account's deletion cascade completes and no other counted binding carries its subject, THE SYSTEM SHALL leave no `world_allowlist` row holding that subject, and WHEN another counted binding still carries it, THE SYSTEM SHALL keep the row; the deletion manifest's `world_allowlist` entry SHALL state that rule.

- **wr261127-a.4:** WHEN the world owner calls `drop_world_binding` naming a bound identity, THE SYSTEM SHALL delete that identity's `world_binding` and `world_bind_nonce` rows and withdraw its admission under the rules `unbind_world_account` applies.

- **wr261127-a.5:** WHEN anyone but the world owner calls `drop_world_binding`, or the owner names an identity with no binding, THE SYSTEM SHALL refuse the call with an error and change no row.

- **wr261127-a.6:** WHEN more than `MAX_ALLOWLIST_ACCOUNTS` counted accounts are bound and the owner drops bindings until they fit, THE SYSTEM SHALL accept the switch to Allowlist and seed exactly the remaining counted accounts.
- DoD: wr261127-a.1 to wr261127-a.6 green as native-host tests; `just gen` regenerated bindings with the wire contract's new protocol entry (`wireContract.test.ts` green); `just ci` green, `bindings-drift` clean; the game's `docs/DECISIONS.md` records the shipped allowlist-retention rule and the owner's drop.

### wr261127-b — client honesty: the rename fallback and the turn-bar leads

type: feature · tier: routine
category: ux-a11y · severity: LOW · size: XS
touches: client/src/ui/renameModel.ts, client/src/ui/renameModel.test.ts, client/src/ui/renameView.ts, client/src/ui/renameView.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/src/tactics/turnBar.ts, client/src/tactics/turnBar.test.ts
after: []

- residual: `R-weekly-review-2026-11-27-F3` · ux-a11y · LOW — **"(unnamed)" on the rename
  overlay is hard-coded English.**
  Evidence @ 26e1e085, re-read @ ce7f0000: `renameModel.ts` `buildRenameViewModel` sets
  `displayCurrentName` to `'(unnamed)'` for an empty name; `renameView.ts` writes it straight into
  the current-name element's `textContent`; no catalog entry exists (`ui/i18n/` holds no
  "unnamed"), and `renameView.test.ts` pins the English literal verbatim. The player who sees it —
  one who never named themselves — is the one the overlay exists for.
  Fix: a `rename.unnamed` message id in `messageIds.ts` and both catalogs, `t('rename.unnamed')`
  in `buildRenameViewModel`, the pinned test re-pointed, an `fr` empty-name case added; the
  hard-coded-string guard keeps passing.

- residual: `R-weekly-review-2026-11-27-F4` · gameplay · LOW — **the turn-bar Surge/Retreat
  lead-in rounds are literals independent of the tuning they warn about.**
  Evidence @ 26e1e085, re-read @ ce7f0000: `turnBar.ts` `SURGE_BADGE_FROM_ROUND = 7` and
  `RETREAT_BADGE_FROM_ROUND = 25`, chosen against today's tuning (`surge_start_round: 9`,
  `wild_round_cap: 30` in `game-core/content/tactics_tuning.ron`, pinned by game-core's
  `tactics/content_tests.rs`). `TurnBarInput` already carries `surgeStartRound`/`wildRoundCap`
  and the badge text uses them, but the show-from gates do not; `turnBar.test.ts` pins the
  literals against a fixture tuned 9/31, so no test fails when the tuning moves. If the surge
  start drops to 7 or below, the countdown (and the active badge below round 7) is lost; if the
  wild cap drops to 25 or below, the retreat badge never shows before the cap.
  Fix: named lead constants (`SURGE_LEAD`, `RETREAT_LEAD`) applied to `input.surgeStartRound` /
  `input.wildRoundCap`, replacing the two absolute constants and their pins.

- **wr261127-b.1:** WHEN a player whose name is empty opens the rename overlay, THE CLIENT SHALL show and announce the missing-name placeholder from the i18n catalog in the active locale, English and French, and no hard-coded English text.

- **wr261127-b.2:** WHEN the tactics tuning moves `surge_start_round` or `wild_round_cap` (a fixture of 5 and 20), THE CLIENT SHALL show the surge lead-in badge from `SURGE_LEAD` rounds before surge starts, the active surge badge from the surge start on, and the retreat badge from `RETREAT_LEAD` rounds before the cap, all derived from the tuning input rather than absolute rounds.

- **wr261127-b.3:** WHEN today's tuning applies (surge start 9, wild cap 30), THE CLIENT SHALL show the surge badge from round 7 and the retreat badge from round 25, as it does now.
- DoD: wr261127-b.1 to wr261127-b.3 green in vitest; `just ci` green.

### wr261127-c — account claim completion and reset revocation

type: feature · tier: routine
category: data-integrity · severity: MED · size: S
touches: client/src/net/connection.ts, client/src/net/connection.runtime.test.ts, account-service/src/interactions/devPassword.ts, account-service/src/interactions/devPassword.test.ts, account-service/src/provider.ts, account-service/src/provider.test.ts, account-service/src/admin/cli.ts, account-service/src/admin/cli.test.ts
after: []

- residual: `R-acs-7-CLAIMSTALL` · data-integrity · MED — **the guest claim never completes on
  a cold return leg.**
  Re-verified @ 26e1e085 and @ ce7f0000 (fresh mechanism): in `connection.ts`,
  `completeGuestClaim` is sent only from the first applied snapshot's join gate, and only when
  `store.ownAccount(identity)` is already present; when the `my_account` row lands after that
  snapshot, the gate takes the `onClaimAwaitingAccount` branch, which only shows "Finishing your
  claim" (`claim.awaiting.title`, raised by `main.ts`'s `onClaimAwaitingAccount` callback) — and
  nothing re-fires: `ingestAccount` checks only the PendingDeletion→Active edge
  (`shouldRejoinAfterAccountChange`). Matches the measured stall (account row present,
  `guest_claim` unconsumed, reducer never sent). `main.ts` needs no change: the late send reuses
  the gate's `onClaimPending`/`onClaimResult` callbacks.
  Fix: re-fire the claim send from `ingestAccount`, once per connection, when the gate left a
  claim awaiting an account; the send stays on the raw connection (the code is a bearer secret).

- residual: `R-acs-2-RESET-KEEPS-CHAINS` · security-privacy · MED — **a dev account's password
  reset leaves its refresh chains alive.**
  Re-verified @ 26e1e085 and @ ce7f0000 (the spec's earlier `oidc/provider.ts` path was wrong;
  the file is `account-service/src/provider.ts`): `interactions/devPassword.ts` `resetPassword`
  rewrites only the hash record; `provider.ts`'s `revokeGrant` is called only from `findAccount`
  for a gone or unentitled account; `rotateRefreshToken: true` keeps a chain rotating for the
  refresh token's lifetime. A reset is the answer to a leaked password, so the leaked session
  must die with it. Mechanism: decision-defaulted:reset-revocation-mechanism above.

- **wr261127-c.1:** WHEN a stored claim code and an account credential are present and the `my_account` row arrives after the first applied snapshot, THE CLIENT SHALL send `complete_guest_claim` exactly once on that connection, however many later `my_account` updates arrive.

- **wr261127-c.2:** WHEN that late claim is answered, THE CLIENT SHALL leave "Finishing your claim" only on the reducer's answer, showing its success or its refusal text.

- **wr261127-c.3:** WHEN a dev account's password is reset, THE SERVICE SHALL refuse every refresh token and authorization code issued for that account before the reset, so the next refresh or code exchange fails and a new sign-in needs the new password.

- **wr261127-c.4:** WHEN the account signs in with its new password after a reset, THE SERVICE SHALL issue codes and refresh tokens that refresh as before.
- DoD: wr261127-c.1 and wr261127-c.2 green in the connection runtime test with the account row delayed past the first snapshot; wr261127-c.3 and wr261127-c.4 green against a provider and store driven through a reset; `just ci` green.

### wr261127-d — tester rule: a slice's run must survive a loaded host

type: docs · tier: routine
category: loop-ops · severity: MED · size: XS
touches: standards/testing-tdd.md
after: []
blocked: needs mr-ask-drew approval (anti-reaccretion: standards/) — lifted when the operator approves this rule change through `memory/projects/mr-ask-drew`; who lifts it: the operator (the supervisor deletes this line on the answer); fallback: none needed — the incidents stay tracked as their own residuals and each slice keeps fixing its own case.

- residual: `R-weekly-review-2026-11-27-F5` · loop-ops · MED — **recurring cause of the week:
  wall-clock margins and host-wide sweeps sized for an idle machine break under fan-out.**
  This week: profileView UIF16B.3 hit vitest's 5 s default at load average 12–15 while sibling
  slices built (`R-lpw-27-NOTEDC3D77`, 2026-11-27). Earlier instances of the same cause: the
  account-e2e orphan sweep kills sibling slices' eval runs (`R-ts-6b-8-NOTEB33FB3`), two fan-out
  slices' `just ci` runs kill each other in the account service (`R-acs-6-EVALKILLSSIBLING`),
  deployment discovery times out behind load (`R-acs-7-DEPLOYFLAKE`, `R-lpw-39-NOTE8318F6`). The
  week's two `plan-delta:` lines (ts-6b-2, sr-4b) read as honest fact corrections, not scope
  growth — no spec-driven tightening needed.
  Fix: one short subsection in `standards/testing-tdd.md` (house style, the incident ids above as
  the motivating record). A harness-repo docs slice: a `reviewer` answers
  `standards/spec-driven.md`'s three questions for the passage.

- **wr261127-d.1:** WHEN a tester writes or runs a slice's suite, THE STANDARD SHALL require it to assume a loaded, shared host: any process sweep, port probe or database discovery it performs is scoped to the slice's own run (its own pid tree, database and directory) and never pattern-matched across the host, and a case whose honest runtime approaches a framework's default timeout declares its own explicit budget rather than inheriting the default.
