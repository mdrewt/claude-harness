# Spec: M25 — Security audit & launch sign-off
**Status:** respecced 2026-09-28 against monster-realm @ `4f36de2` (post-de-bloat) · S0 done, S1–S5 open ·
**Owner:** Drew (sign-off) · **Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:**
M21, M22 (closed) · **Supersedes:** `archive/M25-security-audit-2026-08.spec.md` (ceremony record kept there)

## Problem / intent
Launch is gated on a **human security sign-off**: nothing else audits the whole surface, triages findings,
or refuses launch with an open critical (ADR-0034 as amended 2026-09-21, archived at
`archive/adr/0034-security-audit-gate.md`). Per-system controls live in ordinary tests and CI; M25 fixes
the known leaks, runs one audit pass, and ends with an operator walking a checklist and signing.

**The frame (kept from the 2026-08 ceremony):** a hostile client can observe only two channels. (1)
**Subscription**: rows of `public` tables and the owner-scoped `#[view]`s. (2) **Reducer outcome**: whether a
call succeeds, and the `Err(String)` it returns. Reducers cannot return rows. **Severity rule:** a
channel-2 outcome is an *oracle* only if the predicate it reveals is not already readable on channel 1.
**Coupling:** making a table private turns every reducer branch that tests a predicate over *another
player's* rows in that table into a new oracle. Closing a channel-1 leak can open a channel-2 one.

**Corrections to the archived spec** (re-derived from the live repo):
1. **RLS is a dead premise.** `client_visibility_filter` is unenforced at 2.8.1
   (`docs/runbooks/spacetimedb-upgrade.md` §Standing facts). **There is no chat**: the only user-generated
   text is `set_profile_name` → `guards::validate_name`. (Both were already fixed in S0.)
2. **The channel-1 declaration is already pinned, by different machinery.** ADR-0199, `docs/adr/`,
   `visibility_note`, `account-privacy.eval.mjs` and `monster-privacy.eval.mjs` were all deleted. The
   client-visible table, view and reducer set is pinned by `evals/client-surface-privacy.eval.mjs`, which
   derives it from the bindings and checks it against `evals/baselines/`. Every view's owner-scoping is an
   executing native-host test (S5 §B). No new read-side mechanism is needed.
3. **`inventory` is now private** behind `my_inventory` (bf1cdf2), so it drops out of the old
   "stakes-bearing public tables" list. **And the coupling predicted in 2026-08 has now happened for real:**
   `propose_trade` checks the *counterparty's* item counts (`trading.rs`, "counterparty has insufficient
   inventory for item N"), and that check became a live oracle over a now-private table.
4. **A worse oracle was missed entirely:** `propose_trade` rejects "counterparty has insufficient currency
   for this trade". It reads the private, must-never-leak `player_wallet`. Any joined player can
   binary-search any online player's exact balance in about 64 calls, and the shipped trade-propose UI's
   "request currency" field sends exactly that argument. **Rewording the string does not fix this:**
   succeed-vs-reject is itself the predicate. The same applies to the counterparty monster leg in
   `build_cards`.
5. **The dormant `battle_challenge` branch stays dormant.** The payload split (S2) keeps
   `{challenge_id, challenger, target, status}` public, so "target already has a pending incoming
   challenge" (`pvp.rs`) still reveals nothing new. The archive's "must resolve in the same PR" rule is moot.
6. **The claim flow now works end to end** (3942d49, d6fd5cc). The account-e2e driver used to hide the fact
   that the browser never called `start_guest_claim`. Evidence: `client/e2e/accounts.spec.ts` A1–A3.

## Acceptance criteria (EARS)
Grouped by slice. Each slice carries its own `touches:`. Spine: **S1 ‖ S2** (disjoint: trading vs
pvp/schema/client) → **S3** (after S2: both touch `schema.rs`) → **S4** (audit) → **S5** (sign-off,
terminal). A finding fixed during S4 becomes its own small slice with its own ordinary test.

### S0 — Threat-model consolidation + ADR-0034 amendment · **DONE** (pre-revision, 2026-09-21)
Evidence: `security-threat-model.md` header "Revised 2026-09-21 (M25 S0)" (two-channel STRIDE row, chat
struck, residuals and accepted risks added). `archive/adr/0034-security-audit-gate.md` §Amendment, which
the operator accepted via issue #496. Its §2–§3 still describe the deleted gate machinery. S3 fixes that.

### S1 — Close the trade-proposal oracles
**Acceptance criteria (EARS)** — native-host tests in `server-module/src/trading_tests.rs`. Each one runs
the reducer twice over probe states that differ *only* in the named private state:
- **SEC-1** WHEN `propose_trade` is called twice, with probe states that differ only in the counterparty's
  `player_wallet` balance, THE SYSTEM SHALL give the caller an identical outcome both times (Ok vs Err,
  the Err payload, and the resulting public `trade_offer` rows).
- **SEC-2** WHEN the probe states differ only in the counterparty's `inventory` counts, THE SYSTEM SHALL give
  the caller an identical outcome, as in SEC-1.
- **SEC-3** WHEN the probe states differ only in whether a listed monster id exists, or in who owns it
  (initiator leg and counterparty leg alike), THE SYSTEM SHALL give the caller an identical outcome, except
  where it is the caller's *own* monster.
- **SEC-4** WHEN the counterparty accepts or confirms an offer whose counterparty leg exceeds their holdings,
  THE SYSTEM SHALL reject that call and SHALL move no assets. The counterparty may be told the specific
  shortfall, because it is their own data.
- **SEC-5** IF an offer the counterparty has not accepted lists more currency or items than the counterparty
  holds, THEN THE SYSTEM SHALL NOT reject any *other* reducer call of the counterparty's because of that
  offer. This is the MAX-currency lock DoS that the propose-time check exists to prevent.
- **SEC-6** WHEN the initiator lists assets beyond their own holdings, THE SYSTEM SHALL still reject at
  propose time. Unchanged, and it is the caller's own data.
**touches:** `server-module/src/trading.rs`, `server-module/src/trading_tests.rs`,
`game-core/src/trading/**` (if the rule moves), `client/src/ui/tradeProposeModel.ts` + its test (only if
the UI's error copy changes), `client/e2e/trade-zz-negative.spec.ts`.

**Notes (investigation guidance, not prescription):**
- Verify first: `escrowed_item_qty_uses_counterparty_items_when_owner_is_counterparty` suggests that escrow
  already counts an *unaccepted* counterparty leg. If so, deleting the propose-time check alone re-opens
  the SEC-5 DoS.
- Rejecting every non-empty counterparty monster or item leg is one outcome-independent option: the UI
  never sends one. It is not the only option.
- Keep the specific reason in `guards::log_reject` so the server log stays diagnosable. Only the
  caller-facing outcome must stop varying.
- `trade-zz-negative.spec.ts` cases 1b and 3b currently encode the oracle as *intended* behaviour. The
  tester rewrites them from this spec: they move to the respond/confirm step. That is a protected-category
  change, adjudicated by the human ratification of this spec, because the old behaviour is the leak.

### S2 — `battle_challenge` payload split (the archive's residual 2, still valid)
`challenger_party_ids` is public on every pending challenge. The client never reads it (only
`net/rowConvert.ts` copies it), and the server reads it at accept (`pvp.rs`). A flat participant-scoped
view would break `buildPvpChallengeViewModel`'s busy-set (`client/src/ui/pvpModel.ts`), which legitimately
reads *every* pending row. So split the payload, not the row.
- **SEC-7** WHEN any client subscribes, THE SYSTEM SHALL NOT deliver another player's challenger party ids.
  Native-host view or subscription-surface test, plus the regenerated bindings.
- **SEC-8** WHEN a pending challenge exists, THE SYSTEM SHALL still deliver `challenge_id`, `challenger`,
  `target` and `status` to every client. Vitest: `pvpModel.test.ts` excludes both busy identities from
  `challengeablePlayers` for a third player. The existing PvP challenge e2e (`client/e2e/pvp.spec.ts`)
  stays green through the UI.
- **SEC-9** WHEN a challenge is accepted, THE SYSTEM SHALL start the battle with exactly the party the
  challenger committed. `pvp_tests.rs`, native-host.
- **SEC-10** WHEN the new module is published over a database holding pending challenges, THE SYSTEM SHALL
  migrate without error. This is a publish-over-live-data proof, the same kind as the inventory fix.
**touches:** `server-module/src/schema.rs`, `server-module/src/pvp.rs`, `server-module/src/pvp_tests.rs`,
`server-module/src/privacy.rs` (the export writer serialises the field), `client/src/net/{store,rowConvert}.ts`,
`client/src/ui/pvpModel.test.ts`, `client/src/module_bindings/**` (via `just gen` only), `evals/baselines/**`
(regenerated data; the evals themselves are not edited).
**Notes:** removing a column is not additive (DECISIONS "Schema changes are additive"), so leaving the
public column empty plus holding the party privately is one shape to evaluate. A new table needs its
`DATA_LIFECYCLE_MANIFEST` row, and the existing manifest tests fail until it has one.
**Severity is arguably low**: the ids are opaque, but they cross-join with `trade_offer` cards. The
operator may demote S2 to an accepted risk at Checkpoint 2.

### S3 — Current-state security docs
Docs only. There are no criteria to test, and no test pins any of this prose.
- `docs/DECISIONS.md` **"Table privacy"**: supersede in place so it states the two-channel rule and the
  coupling obligation. A change that makes a table private re-checks, in the same change, every reducer
  outcome that tests another player's rows in it. The entry names the deliberately public exposures:
  `trade_offer` offered amounts and cards, `battle_challenge` identities/status, `player_quest`, `profile`,
  `character`/`player`. Enforcement is described in prose as the S1/S2 tests.
- `SECURITY.md` (absent today): coordinated-disclosure prose, plus the decided rollback default. On a
  confirmed exploit: disable the affected reducer path, snapshot before mutating, reverse only the
  identified transactions, and publish what was reversed.
- `docs/runbooks/spacetimedb-upgrade.md`: add a Procedure step. On each bump, re-check whether RLS is
  enforced. If it is, re-open the "Table privacy" decision. Otherwise update the Standing-facts version.
  This replaces the archive's nightly tripwire eval.
- The stale `trade_offer` doc comment in `schema.rs` still calls `inventory` "world-readable". Correct it.
- Harness side: `specs/monster-realm-v2/security-threat-model.md` §2–§4 still cite the deleted machinery
  (reducer-security-auditor eval, per-table privacy evals, Semgrep/SBOM, oracle-coupling gate,
  `findings.json`, `security-signoff`, the tripwire). Rewrite them to point at this spec's evidence, update
  the composition risk now that `inventory` is private, and name the S1 oracles.

**touches:** `docs/DECISIONS.md`, `SECURITY.md` (new), `docs/runbooks/spacetimedb-upgrade.md`,
`server-module/src/schema.rs` (comment only), and harness `specs/monster-realm-v2/security-threat-model.md`.

### S4 — The audit pass
A human-led pass, run with the `reducer-security-auditor` and `red-team` agents and the `security-review`
skill, over every reducer and view. Focus: authz (identity from `ctx.sender()`, ownership), channel-2
oracles under the severity rule, economy dupe/overflow, the claim and deletion flows, DoS surfaces, and the
UGC sink. **Output:** findings recorded in §Delivered / Parked, each with a severity, a status
(`open | remediated <commit> | accepted-risk <owner>`) and evidence. **Known item to triage:** "target is
already in an ongoing battle" (`pvp.rs`) reveals the private `battle` predicate for any online player.
Candidate severity: low. A fix gets its own slice with a native-host test.
**Severity (operator decision, default):** *critical* = discloses another player's private data, or acts
for another identity, or creates or destroys value, **for an arbitrary caller**. *High* = the same, but only
for a caller who already has a relationship with the victim (trade or challenge party). *Medium/low* =
everything else. **touches:** this spec (§Delivered / Parked) only, plus the fix slices it spawns.

### S5 — HUMAN SIGN-OFF CHECKLIST (the launch gate)
This is a document and a decision, not a script. The operator walks each item against the launch commit.
Each item is ticked **met**, or given a finding with a disposition. Then the operator signs below.
**Launch is refused while any finding is `critical` + `open`.** Every `accepted-risk` names an owner.

**A. Auth flows**
- [ ] `ALLOWED_ISSUERS`/`ALLOWED_AUDIENCE` (`server-module/src/accounts.rs`) are the real launch issuer
  and audience, not the `.invalid` placeholder. Evidence: `auth2_issuer_allowed_is_exact_match`,
  `auth3_audience_allowed_semantics`, `ops/auth/README.md`, `observability-dr.md` §7.
- [ ] Guest claim: the code is minted client-side, registered before the redirect, and resolved only after
  the caller-state guards; malformed and used codes are indistinguishable. Evidence:
  `acct_complete_guest_claim_refuses_before_resolving_the_code`,
  `acct_guest_claim_round_trip_moves_every_row_and_spends_the_code`, `auth8_…`, `evals/account-e2e`,
  `client/e2e/accounts.spec.ts` A1–A3.
- [ ] Ranked PvP's account gate (`pvp.rs` `ranked_account_gate`) is active once the real issuer is set.
- [ ] The issuer set in force is recorded below. Adding an issuer re-opens this sign-off:
  `Identity = f(iss, sub)`.

**B. Privacy surfaces**
- [ ] Channel 1: `client-surface-privacy` is green, and the operator has read
  `evals/baselines/client-visible-tables.json` against DECISIONS "Table privacy". Every public table is
  public on purpose.
- [ ] Each view returns only the caller's rows: `nh_my_wallet_view_returns_only_the_senders_row`,
  `nh_my_inventory_view_returns_only_the_senders_rows`, `nh_my_conversation_view_returns_only_the_senders_row`,
  `acct_my_account_view_returns_only_the_callers_row`, `acct_owner_scoped_views_return_exactly_the_callers_rows`
  (monster_pub / battle / evolution notices), and `acct_my_export_bundle_view_returns_only_the_callers_chunks`.
  Through the browser: `client/e2e/monster-privacy.spec.ts` (INVENTORY, 13r-e-1) and
  `client/e2e/my-battle-privacy.spec.ts`.
- [ ] Channel 2: S1 has merged (SEC-1–6 green). Every S4 oracle finding is dispositioned.
- [ ] UGC: `validate_name_rejects_bad`, `validate_name_rejects_spoofing_characters` and
  `validate_name_nfc_normalizes` pass. Names reach the DOM only as text.
- [ ] Accepted exposures are consciously accepted, each with an owner:
  - `trade_offer` is visible to all players before consent: the offered amounts and cards. This is the
    archive's residual 1(b). A fix would need a private staging row, which is a redesign.
  - Public-table composition (`character` + `player` + `profile` + `player_quest` + `trade_offer`).
  - The S2 outcome, if S2 was demoted.

**C. Data lifecycle**
- [ ] Every table is classified. Evidence: `data_lifecycle_manifest_entries_name_a_table_and_a_basis`,
  `m22s6_table_row_registry_matches_manifest`.
- [ ] The deletion cascade erases exactly the owner's rows. Evidence:
  `acct_deletion_reaper_erases_every_owned_row_and_nothing_else`, `acct_delete_and_cancel_arm_and_disarm_exactly_once`.
- [ ] Export is owner-only, rate-limited and reaped. Evidence: `m22s4_exporter_set_equals_manifest_both_directions`,
  `acct_export_reaper_deletes_whole_bundles_only`, `EXPORT_REQUEST_COOLDOWN_MS` (`privacy.rs`).
- [ ] Backups honour deletion: `observability-dr.md` §8 has been followed for the launch deployment.

**D. Dependency and build audit**
- [ ] `cargo audit` is clean and gitleaks is clean (both blocking in CI, `.github/workflows/ci.yml`).
- [ ] `cd client && npm audit --omit=dev` has been run at sign-off. Findings are triaged. CI has no
  blocking JS SCA; dependency-review is best-effort only.
- [ ] Dev reducers are absent from the *published* launch module (`just playtest-verify-release`, which
  runs `spacetime describe`), and the production bundle has no debug hooks (`just playtest-verify-build`).

**E. Rate limits / DoS**
- [ ] The per-action limits hold: `MOVE_QUEUE_CAP`, `HEAL_COOLDOWN_MS`, `ESSENCE_TRAIN_COOLDOWN_MS`,
  `EXPORT_REQUEST_COOLDOWN_MS`, the export live-row caps, `check_trade_side_size`
  (`e4_trade_side_size_caps_reject_oversized_and_admit_empty`), `CHALLENGE_TTL_MS`, `TRADE_OFFER_TTL_MS`
  and `CLAIM_TTL_MS`.
- [ ] The module has no general per-identity limiter on reducer calls. The operator confirms that
  deployment-level limiting is in place, or records it as an accepted risk with an owner.

**F. Operations**
- [ ] `SECURITY.md` is present (S3). The pinned SpacetimeDB version matches the version that the upgrade
  runbook's RLS re-check was done against. The monitoring stack is on loopback (`observability-dr.md` §5).

**Decision:** open criticals = __ · signed by __ · date __ · game-repo SHA __ · issuer set __ · re-audit
trigger: public launch, a new identity issuer, a SpacetimeDB bump, or a new reducer/table that reads
another player's rows (default; the operator may add a calendar cadence).
**touches:** this spec (§Delivered / Parked records the signed decision).

## Touches
Declared per slice above. Union: `server-module/src/{trading,pvp,schema,privacy}.rs` + their tests,
`client/src/{net,ui}/**` (S1/S2 only), `client/e2e/trade-zz-negative.spec.ts`, bindings/baselines via regen,
`docs/DECISIONS.md`, `docs/runbooks/spacetimedb-upgrade.md`, `SECURITY.md`, harness threat model, this spec.

## Non-goals
Anything RLS · a third-party pen-test or bug bounty (recommended; S4 prepares for it) · formal
certification · per-severity SLAs or a disclosure inbox (zero live players; revisit at public launch) · chat
moderation (there is no chat) · localising server `Err` strings · any script that re-checks sign-off content.

## Notes
**Dropped from the archive, and why.** These violate `standards/testing-tdd.md`'s forbidden shapes, or
their subject was deleted:
- the `visibility_note` amendment (a documentation-existence check over deleted ADR-0199 machinery);
- `reducer-oracle-coupling.eval.mjs` and its `Err(` census (source-text scanning; a new eval). It is
  replaced by the S1 outcome-equality tests, plus the S3 coupling rule applied by review;
- `security-signoff.eval.mjs`, `findings.json` with its computed `Open-Critical-Count`, `release-gate.yml`
  and `signoffAnchorIsWired` (a check-of-checks and prose pinning). They are replaced by S5's signed
  checklist;
- `rls-stabilization-tripwire.eval.mjs` + nightly wiring (reads config text) → the S3 runbook step;
- criteria asserting other gates exist or bite (old SEC-14/15/22/28), and the M-error-codes seam
  (it existed only because of `err_literal` pins).

**Kept:** the ADR-0034 intent (a human-signed launch gate, with open criticals blocking), the two-channel
frame, the severity rule, the coupling rule, both residual splits (trade_offer: the oracle half becomes S1,
and the visibility half is accepted in S5 §B; battle_challenge: S2), the CVSS-lite idea (reduced to S4's
three-tier default), `SECURITY.md`, and the rollback default. **Relied on as-is, never extended:**
`client-surface-privacy`, `bindings-drift`, `battle-schema-snapshot`, `spacetime-type-snapshot`, `account-e2e`.

## Delivered / Parked
- **S0** delivered 2026-09-21 (evidence under S0). S1–S5 closure, the S4 findings table and the signed S5
  decision are recorded here at close.
