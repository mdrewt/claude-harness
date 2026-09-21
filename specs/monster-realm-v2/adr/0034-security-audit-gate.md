# 0034. Security audit & threat model as a launch gate
- Status: accepted
- Date: 2026-06-24
- Surfaced by: the holistic review (launch-readiness gap). Load-bearing for M25; consolidates the security
  posture (ADR-0009/0015 + the per-reducer auditor).

## Context and problem statement
Security mitigations are designed in per system (intent-only reducers, RLS posture, escrow guards, supply-
chain gates), but nothing **audits the whole surface** or gates launch on a security sign-off. A multiplayer
game with an economy, trading, PvP, and untrusted chat has a large attack surface that deserves a
consolidated threat model and a real audit before launch.

## Considered alternatives
- **A maintained threat model (SSOT doc) + a tooled/manual audit + a blocking launch sign-off + a re-audit
  cadence (chosen).** Consolidates the existing mitigations into a surface view (`security-threat-model.md`),
  runs the harness `/audit` + `security-review` + `red-team` over it (with RLS-leak verification on the
  pinned version as the headline check), triages + remediates findings, and **blocks launch on open
  criticals**. Continuous mechanical gates (auditor/privacy/supply-chain/no-PII) keep it honest between
  audits.
- **Rely only on the per-reducer auditor + supply-chain gates (status quo).** Good for the continuous case,
  but no holistic surface review and no launch gate. Rejected — the gap this closes.
- **Defer security review to post-incident.** Reactive; a breach is far costlier than an audit. Rejected.
- **Only an external pen-test.** Valuable, but an external engagement is a complement, not a substitute for an
  internal threat model + standing gates. Recommended pre-launch; not the whole answer.

## Decision outcome
- Chosen: **a maintained threat-model SSOT + an audit pass + a blocking launch security sign-off + a re-audit
  cadence**, on top of the always-on mechanical gates.
- Consequences: the threat model is updated at each milestone close; RLS enforcement is *verified* at M25 on
  the pinned version (ADR-0015's defense-in-depth caveat is resolved or data moves to private tables); launch
  is blocked on open criticals; a disclosure/IR path + re-audit cadence are defined; an external pen-test is
  recommended and prepared for.

## Amendment — 2026-09-21 (M25 ceremony corrections; DECISION issue #496)

**Trigger:** M25 slice S0 is hard-blocked on this. The 2026-08-24 M25 ceremony (investigation → 6-way
ideation → judge synthesis → adversarial review, `M25-security-audit.spec.md` §1.1/§8-1) found two clauses of
this ADR false against the live tree — its Decision-outcome RLS consequence, and its Context premise naming
"untrusted chat". Amending an accepted ADR is not a spec author's call, so the ceremony drafted the amendment
and escalated it via `mr-ask-drew` issue #496; the operator accepted the drafted recommendation on
2026-09-21. The text above is left byte-identical: this section supersedes, it does not rewrite history.

**Two corrections (supersede the corresponding clauses above; all other clauses stand):**

1. **The RLS-verification consequence → the two-channel model.** "RLS enforcement is *verified* at M25 on the
   pinned version (ADR-0015's defense-in-depth caveat is resolved or data moves to private tables)" rests on
   a dead premise: `client_visibility_filter` is confirmed **unenforced** at the pinned 2.8.1 toolchain
   (ADR-0197 FF3 — `unstable`-gated, carrying the crate's own "RLS filters are currently unimplemented, and
   are not enforced", byte-identical at 1.12.0 and 2.8.1), and the "data moves to private tables" disjunct
   already happened twice (ADR-0194 `monster_pub`, ADR-0198 `battle`). Replaced by: **everything a hostile
   client can observe arrives on exactly two channels** — (1) subscription over `public` tables and the
   `#[view]`s, and (2) the `Err(String)` payload of a rejected reducer call (every production reducer returns
   `Result<(), String>` except the two lifecycle hooks `init` and `on_disconnect`, which return `()`; a
   reducer structurally cannot return row data). The two channels are **coupled**: closing a leak in one can
   open a leak in the other, so a visibility transition on a table re-triages every reducer branch predicating
   on it. Channel 1's *declaration* is already gated enumeratively (ADR-0199: a declared `visibility` per
   table, with a `T-VIS-ANCHORS` set-equality tooth pinning every table name in both sets), so **M25's job is
   to audit completeness of the private-table-plus-scoped-view migration across every stakes-classified table
   — via a mandatory `visibility_note` — and to gate channel 2, the genuinely ungated half; never to verify
   RLS.**
2. **"Untrusted chat" is struck from the Context premise.** There is no chat system in monster-realm (M19 is
   a post-gate sketch; M22, M24 and M25 each had to make this same correction). The real untrusted-input
   (UGC) surface is **`set_profile_name`** (ADR-0132, `server-module/src/ranking.rs`): it validates through
   `guards::validate_name` — reject, never clamp: NFC-normalize and trim, then refuse anything but
   alphanumerics and spaces, or longer than `MAX_NAME_LEN` (24) — is gated by `require_not_deleting`, and
   writes only `player.name`, which every client sink renders as text (`textContent`, never markup; M24
   deleted the client's HTML-parsing sinks, ADR-0255) and the leaderboard row additionally isolates in a
   `<bdi>` (M24 I18N-20; ADR-0261 D3). Should a chat system land in a future milestone, it must bring its own
   threat-model row and its own decision at that time; this strike removes a claim about a feature that does
   not exist, it does not pre-judge one.

Full corrections trail and evidence: `M25-security-audit.spec.md` §1.1 (items 3 and 6), §2.1 (the two-channel
table and the channel-2 severity rule), §7 (the paired threat-model corrections), §8-1 (the drafted
recommendation the operator accepted). The same dead RLS premise also colours the parenthetical in the first
Considered-alternatives bullet above ("with RLS-leak verification on the pinned version as the headline
check"); because issue #496 authorized exactly the two clauses above, that parenthetical is recorded as a
known residual for a follow-up decision, not superseded here.
