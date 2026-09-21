# Security threat model (cross-cutting)

**Date:** 2026-06-24 · **Revised:** 2026-09-21 (M25 S0) · **Decision:** ADR-0034 (as amended 2026-09-21) ·
**Scope:** the whole v2 system (M0–M25). **Status:** the SSOT for the security posture — mirrors
`netcode-quality-review.md` (feel) and `observability-performance-plan.md` (robustness); this one secures the
**attack surface**. The audit + sign-off that exercises it is **M25**.

## 0. Posture recap (already designed in)

Security is not a bolt-on: every reducer takes identity from `ctx.sender`, accepts **intent only**,
**rejects (never clamps)**, and re-validates ownership/legality (the M0 reducer-security-auditor eval);
confidentiality is **stakes-classified, private-table-plus-scoped-view** (ADR-0015's original intent,
delivered in practice via ADR-0194/ADR-0198 — see §4, `client_visibility_filter` RLS is **confirmed
unenforced** at the pinned 2.8.1 toolchain, not a live mechanism); supply chain is gated (gitleaks/Semgrep/
SCA/SBOM, M0); and the netcode is integer-tile + server-authoritative so position/damage/odds can't be
forged. This threat model **consolidates** those into one surface view and names what M25 must audit.

## 1. Attack surface & threats (STRIDE-style)

| Surface | Threat | Mitigation (spec) |
|---|---|---|
| **Movement** | client forges position / moves too fast | integer tiles + intent-only + server-paced queue/tick (M1/M2, ADR-0011) |
| **Battles** | client forges damage / unknown skill / outcome | server-resolved, validate skill known, integer damage (M7, ADR-0017) |
| **Recruit/encounter** | client sets catch odds / reads spawn weights | server computes odds; `encounter` is a **private** table (M8) |
| **Economy** | client-set prices/totals; negative/overflow balance | server-priced, server-computed totals; saturating + reject-on-insufficient (M13, ADR-0018/0022) |
| **Trading** | dupe / theft / trade an in-use asset | dual-consent escrow, atomic re-verified swap, `reject_if_in_*` guard family (M15, ADR-0024) |
| **PvP** | read opponent's pick; rage-quit voids loss; double-submit | secret picks in a **private** `battle_action` table (confirmed no `public` accessor), turn-deadline reaper, forfeit-not-delete, serialized double-submit guard (M16, ADR-0025) |
| **Ranked** | self-report a win; double-count rating | server applies rating once from the authoritative outcome; module-write-only profile (M17, ADR-0026) |
| **User-generated text** (`set_profile_name`, ADR-0132) | markup / bidi-control / length abuse of a player-chosen display name shown to other players | server-side `validate_name` (`server-module/src/guards.rs`) **rejects, never clamps**: NFC-normalize and trim, then refuse anything but alphanumerics and spaces (so markup and bidi control characters never reach the table) or longer than `MAX_NAME_LEN` (24); `set_profile_name` (`server-module/src/ranking.rs`) is gated by `require_not_deleting` and writes **only** `player.name`; every client sink renders the name as text (`textContent`, never `innerHTML` — M24 deleted the client's HTML-parsing sinks, ADR-0255), and the leaderboard row additionally isolates it in a `<bdi>` built with `document.createElement('bdi')` + `textContent` (I18N-20, ADR-0261 D3). **There is no chat system** (M19 is a post-gate sketch) — a future chat/social milestone must add its own row here before shipping; this strike does not pre-judge it |
| **Privacy (confidentiality)** | hidden genes/picks/rows leak | stakes-classified: **private table + owner/participant-scoped `#[view]`** is the standing mechanism for anything with real stakes (ADR-0015's intent, proven by ADR-0194 `monster_pub` + ADR-0198 `battle`); RLS is **not** a live option (see §4) |
| **Reducer rejection payloads** (channel 2) | an `Err(String)` distinguishes a predicate over a **private** table (information disclosure) — e.g. `build_cards` in `server-module/src/trading.rs` returns `"monster {mid} not found"` vs `"monster {mid} not owned by caller"` over the private `monster` table for any caller probing any id, and the `"target is already in an ongoing battle"` branch in `server-module/src/pvp.rs` reveals a predicate over the private `battle` table (M25 spec §2.1) | the **§2.1 severity rule** — an `Err` string is an oracle **iff** the predicate it reveals is not already readable from a `public` table — plus the **coupling invariant**: closing a read-side visibility gap on table T converts every reducer branch predicating on T into a new write-side oracle, so a visibility transition re-triages those branches in the same PR. M25 S2 adds the `[oracle-coupling-01..03]` checks (spec §2.3; `evals/reducer-oracle-coupling.eval.mjs` + `evals/baselines/oracle-coupling.json` as specified) |
| **Auth / accounts** | account takeover; guest-claim steal; PII leak | delegate to OIDC (no in-game passwords); atomic one-time guest-claim; email hashed/private (M21, ADR-0030) |
| **Data / privacy** | incomplete deletion retains PII; export of another's data | registry-driven deletion-completeness eval; owner-scoped export (M22, ADR-0031) |
| **Platform / DoS** | reducer flood / bot abuse | per-action limits where they exist — among them the move-queue cap (`MOVE_QUEUE_CAP`, M2, `server-module/src/movement.rs`), the heal and essence-training cooldowns (`HEAL_COOLDOWN_MS`, `ESSENCE_TRAIN_COOLDOWN_MS`, `server-module/src/raising.rs`), the 60 s data-export cooldown (`EXPORT_REQUEST_COOLDOWN_MS`, M22, `server-module/src/privacy.rs`), and the one-pending-challenge-per-identity guards plus the `CHALLENGE_TTL_MS` reaper that bounds outstanding challenge state (ADR-0126) — plus infra rate-limiting (ops). There is **no general per-identity reducer-call limiter in-module** (`movement::RateLimiter`, ADR-0170 D4, bounds *log emission*, not calls); global limiting stays an ops concern |
| **Supply chain** | secret leak / malicious dep / SAST hole | gitleaks + Semgrep + SCA + SBOM + Renovate (M0, ADR-0009) |
| **Determinism** | desync exploited / float divergence | integer-only rules + determinism gate + parity evals (M0–M3) |

## 2. Standing controls (mechanical, always-on)
- **reducer-security-auditor eval** (identity/intent/reject/ownership/no-panic) on every reducer.
- **privacy evals + proof-of-teeth** per owner-private table; the **deletion-completeness eval** (M22).
- **supply-chain gates** (gitleaks/Semgrep/SCA/SBOM) in CI.
- **no-PII logs** (ADR-0029's design intent, delivered as `mr_log`/observability discipline in `ADR-0180`)
  as a privacy check.

## 3. What M25 (the audit) adds beyond the standing controls

Scoped by the M25 ceremony (2026-08-24) against what already ships: ADR-0199's enumerative table-visibility
gate already delivers the *declaration* half of "completeness verification of the private-table+scoped-view
migration" — a declared visibility per table, pinned table-by-table — as far as a gate can reach (M25 spec
§1.1(1)), and the per-view exact-body pins cover the view half (§1.1(4)); so M25 adds only what nothing
covers.

- A **structured threat review** (this doc, kept current) against the surface above.
- A **manual + tooled security audit** (the harness `/audit` + `security-review` skill + a `red-team` pass)
  before launch: authz review, economy/dupe exploits, auth/account-takeover, rate-limit/DoS, and the
  untrusted-input surface (`set_profile_name`). Its findings land in the `findings.json` ledger described
  below, and **tier-(e) manual items are never reported CI-green** (spec §5.5).
- **Channel 1 — one applicability amendment, not a new taxonomy** (spec §2.2, slice S1): ADR-0199's D5
  `visibility_note` becomes **mandatory** on the standing-public tables that carry named confidentiality
  stakes — `inventory`, `player_quest`, `trade_offer`, `battle_challenge` — each note citing an ADR
  (`/ADR-\d{4}/`, SEC-2). Nothing can force such a declaration to be *true*; that residual is why the sign-off
  exists.
- **Channel 2 — the oracle-coupling gate** (spec §2.3, slice S2): one baseline entry per **branch** rather
  than per reducer (`build_cards` is a bare `fn`, so it has no reducer-level tag slot at all).
  `[oracle-coupling-01]` **fails until a human re-triages** every entry whose table's declared visibility
  moved; `[oracle-coupling-02]` requires each `err_literal` still be found in its named file (it fails loudly
  on an empty match rather than passing on line drift); `[oracle-coupling-03]` is a census backstop over every
  `Err(` site naming a private table, with an anti-vacuity floor of ≥ 200 `Err(` sites across ≥ 15 files.
  Whether two strings differ on a *caller-observable* axis stays human judgment (tier [e]), recorded in the
  ledger — never rubber-stamped by the gate.
- **Remediation tracking + a blocking pre-launch sign-off** (spec §2.7, slices S5–S6):
  `docs/security/findings.json` (`open → remediated → accepted-risk`, never silent row deletion; an
  `accepted-risk` cites an ADR and carries a non-null owner), a CVSS-lite rubric over data-exposure scope ×
  auth-bypass-possible × reversibility (`docs/security/severity-rubric.md`), and `just security-signoff` —
  invoked from `.github/workflows/release-gate.yml` on `workflow_dispatch`, deliberately **not** a `ci:` dep —
  whose `Open-Critical-Count` line must *equal* the count computed from the ledger and which fails while that
  count is non-zero.
- A **disclosure/response path** (`SECURITY.md`: coordinated-disclosure prose plus the decided rollback
  default) and a **re-audit cadence** — a 90-day human/semantic re-audit, plus the mechanized version
  tripwire recorded in §4 (spec §2.8, slice S7). Only structure, totality and freshness are gateable.

## 4. Known accepted risks (documented, not hidden)
- **RLS (`client_visibility_filter`) is confirmed unenforced**, not merely experimental — `ADR-0197` FF3/
  W0-6 verified it byte-identically `unstable`-gated and unimplemented at the pinned 2.8.1 toolchain, and
  `OBS-47` (M20) instructs any read path to use a `#[view]` "unless a subsequent SpacetimeDB release
  documents RLS as stable" (still not the case as of 2026-08-23). **The standing mitigation is private
  table + owner/participant-scoped `#[view]`, not RLS** — delivered twice already (ADR-0194 `monster_pub`,
  ADR-0198 `battle`); treat that as the default for any new confidentiality-sensitive surface (M22 shipped on
  it; any future chat/social surface inherits it). Re-check for RLS stabilization on each SpacetimeDB version
  bump (the same OBS-47 trigger), but do not design around RLS becoming available before then. **Unrelated to
  this:** the 2026-08-23 general unstable/beta-feature policy ruling (`mdrewt/monster-realm#342`) softened a
  *different*, overstated "avoid all unstable APIs" stance in M20's original OBS-48 criterion to "require
  justification, not blanket avoidance" — that ruling does not extend to RLS specifically, which stays inert
  on its own evidence (unimplemented, not merely under-justified). **The re-check obligation is mechanized
  by M25 S7, not left as prose:** S7 adds a nightly `evals/rls-stabilization-tripwire.eval.mjs` (spec §2.8)
  that diffs the pinned SpacetimeDB version against `docs/security/last-verified-spacetime-version.txt` and
  **fails with an artifact** on divergence, so ADR-0200's `notify` job opens an issue. OBS-47 becomes a gate
  with a trigger, not a reminder.
- **Residual 1 — `trade_offer`, a SPLIT verdict** (spec §2.4). **(a) The oracle half is in scope (S3):**
  `build_cards` in `server-module/src/trading.rs` returns `"monster {mid} not found"` vs
  `"monster {mid} not owned by caller"` for **any** caller probing **any** `monster_id` over the **private**
  `monster` table — a live leak independent of `trade_offer`'s own visibility, because a scoped view changes
  what a *subscription* returns, not what a *reducer call's error* reveals. S3 will unify **only the
  client-facing `Err` payload** and pass the specific reason to `log_reject`; collapsing both literals would
  delete the not-found/not-owned distinction from the server log too, buying confidentiality at the cost of
  the fail-loud/diagnosability invariant. **(b) The visibility half is deferred with its mechanism decided:**
  a scoped view is necessary but insufficient, because `propose_trade` writes the counterparty's `MonsterCard`
  snapshot at propose time — the disclosure happens on the write, before consent — so dual-consent escrow
  needs a **private staging row materialized into a scoped view only after both-party confirm**. Target
  `backlog`; carried by the mandatory §3 `visibility_note` citing the tracking ADR, not by prose.
- **Residual 2 — `battle_challenge`, where the obvious fix is a feature regression** (spec §2.5). A flat
  two-identity `my_challenge` view breaks the live client: `buildPvpChallengeViewModel` in
  `client/src/ui/pvpModel.ts` builds `busyIdentities` from **every** `Pending` row and derives
  `challengeablePlayers` from it — a legitimate non-participant read. **Decided fix: split the payload by
  stakes, not the row by participant** — keep the identity/status projection public
  (`{challenger, target, status}` per §2.5(1), plus `challenge_id`, which is the argument to
  accept/decline/cancel and which §2.5's draft omits), move `challenger_party_ids` (a player's PvP team
  composition) behind a two-identity (`challenger` ∪ `target`) scoped `#[view]` on the `my_battle` pattern,
  resolve the dormant `"target already has a pending incoming challenge"` branch in `pvp.rs` **in the same
  PR** (redacted, or explicitly accepted with a finding row — it goes live the instant the view lands,
  `[oracle-coupling-01]` firing on its first real trigger, by design), and extend the exact, sorted view-name
  list in `evals/account-privacy.eval.mjs` by a **sorted insert** (the check compares index-wise, so an
  append false-REDs correct code) together with `evals/monster-privacy.eval.mjs`'s sanctioned-view set (M25
  S4).
- **Public-table composition** (spec §3 cut 6 / §9-2). `character` + `player` + `profile` + `inventory` +
  `player_quest`, cross-joined across all players, enables stalking, sniping and market inference. **No
  mechanism available today closes it** — RLS is unenforced, and its `Filter::Sql` form could not express
  per-id membership in a `Vec<u64>` column even if it were (the `inventory` doc comment in
  `server-module/src/schema.rs`) — and each individual disclosure is already accepted (ADR-0117 D6 for
  `trade_offer`'s currency lower bound; that same `inventory` comment for world-readable counts). Accepted
  deliberately: to be recorded as an `accepted-risk` row in `findings.json` with a **named owner** (M25 S5),
  not dropped.
- **A second identity issuer can silently invalidate a sign-off** (spec §7-5). `Identity = f(iss, sub)`, so a
  Steam-linked player is a **different** identity than their OIDC one absent an explicit linking mechanism.
  Any future auth protocol therefore changes the subject of every identity-scoped guard: an M25 sign-off is
  valid only for the issuer set in force when it was signed, and adding an issuer re-opens it.
- **CVSS-lite severity-gaming** (spec §2.7). The rubric is unenforced arithmetic: labelling a critical as
  `high` holds `Open-Critical-Count` at zero and nothing detects it. Acknowledged, not mechanized, for a
  single-operator project; revisit when more than one person can triage.
- **Bot/automation** at scale is mitigated, not eliminated (rate limits + active-only growth M9); deeper
  anti-bot is a post-launch, measured response.

## 5. Verdict
The per-system mitigations are already in place and gated; what was missing was the **consolidated surface
view + an audit gate**, which this doc + M25 provide. Security becomes a *signed-off, re-audited* property,
not an assumption.

**Revised 2026-09-21 (M25 S0):** the consolidated view now covers **both** client-visible channels — the
subscription channel, whose declaration totality ADR-0199 already gates, and the `Err(String)` rejection
channel, which M25 S2 will gate for the first time via `[oracle-coupling-*]` — and M25's launch sign-off
becomes *computed* from a findings ledger rather than asserted (S5–S6). The semantic ceiling is stated, not
hidden: a false `visibility_note`, an under-triaged branch, or a mis-scored severity remains possible and
undetectable.
