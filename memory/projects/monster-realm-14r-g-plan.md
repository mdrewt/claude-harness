# 14r-g build plan — Ranked-requires-account enforcement (FINAL, post-review)

Branch `feat/14r-g-ranked-requires-account`, worktree `.claude/worktrees/14r-g`, ADR-0189 (supervisor-assigned).
Plan reviewed by reviewer(opus) + red-team(opus) + simplify lenses 2026-08-14; all findings integrated below.
Red-team PoC evidence: 7/7 evasions of the FIRST-draft needle design passed; the exact-statement-pin design below is the response.

## Scope decision (option a)
SHIP: server enforcement (pvp.rs) + pvp_tests.rs (EA-RA-01..06) + evals/ranking-security.eval.mjs criterion D
+ ADR-0189 + knowledge regen + ARCHITECTURE.md line.
PARK (recorded, prerequisite-of-activation): all client work — EARS-3 affordance (client/src/ui/pvpModel.ts,
pvpView.ts + client/src/main.ts wiring at :487 openPvp, :561 menuAvailability, :1692 batch listener, reusing
openClaim/claimView) and the client/e2e conversion. main.ts + client/e2e/ are OUTSIDE declared touches
(hidden deps; 14r-b/14r-e declared them, 14r-g deliberately does not).

## Load-bearing environment facts (verified)
- accounts.rs:55 ALLOWED_ISSUERS = fail-closed `.invalid` placeholder (ADR-0182 D18 HARD GATE, flips at
  13r-c-2/OQ1). Sole account-creation path is behind it → NO account can exist in any env today.
- ci.yml:97 `e2e` job is a merge gate; client/e2e/pvp-full|pvp-side-b|ranked-forfeit.spec.ts drive guest
  challenge→accept. An unconditionally-active gate reds CI and disables PvP everywhere (incl. production).
- Account rows are never hard-deleted (delete_account flips status only). start_pvp_battle called ONLY from
  accept_challenge (def :237 + call :885); battle.rs:86-90 rejects human-vs-human via start_battle.
- Decision #313 answered by Drew 2026-08-14: no guest ratings exist, DB wiped per playtest → NO migration.

## Server design (pvp.rs; all items PRIVATE — pvp_tests is a child module, no pub(crate) needed)
Block placed after the existing consts, before the reducers:
- `const RANKED_PLACEHOLDER_ISSUER: &str = concat!("https:/", "/auth.monster-realm.invalid/");`
  (same concat! split as accounts.rs — no contiguous scheme slashes in source text; SSOT comment → accounts.rs;
  drift from accounts.rs's actual placeholder flips enforcement on → canary reds loudly, so drift cannot be silent)
- `const ERR_RANKED_REQUIRES_ACCOUNT: &str = "ranked play requires an account";` (caller leg; VALUE is a client
  contract for the parked affordance)
- `const ERR_RANKED_OPPONENT_NEEDS_ACCOUNT: &str = "opponent must have an account for ranked play";`
- `fn issuers_configured(issuers: &[&str]) -> bool { issuers.iter().any(|i| *i != RANKED_PLACEHOLDER_ISSUER) }`
  ANY-semantics + EXACT equality (reviewer M3 / red-team F4b / simplify-7): mixed [real, placeholder] → ENFORCE
  (fail-closed for integrity); real issuer containing ".invalid" substring → real; empty → false (inert, not brick).
- `fn ranked_enforcement_active() -> bool { issuers_configured(crate::accounts::ALLOWED_ISSUERS) }`
- `fn ranked_account_gate(enforced: bool, caller_has_account: bool, opponent_has_account: bool)
   -> Result<(), &'static str>`: !enforced → Ok; !caller → Err(CALLER); !opponent → Err(OPPONENT); Ok.
  Caller leg first (both-guest → caller reason; pinned by truth table).

Guard insertions (exact statement shape — the tests pin this text verbatim; implementer must match after rustfmt):
- challenge_pvp NEW **Guard 3a** — AFTER guard 3 (target joined+online, ends :705), BEFORE guard 4 (:707).
  Placement is the ORACLE FIX (reviewer B1/red-team F9): account existence disclosed only for online joined
  targets; residual one-bit disclosure for online players accepted + documented (ADR-0179 G1 cited).
```rust
    // Guard 3a (ADR-0189, issue #307): ranked play requires a full account — BOTH
    // parties. After guard 3 so account existence is only disclosed for a target
    // the caller can already observe online (no oracle over arbitrary identities).
    // crate::accounts::is_account_holder is the SSOT predicate; has_jwt() is true
    // for every connection and is NOT a substitute.
    if let Err(reason) = ranked_account_gate(
        ranked_enforcement_active(),
        crate::accounts::is_account_holder(ctx, me),
        crate::accounts::is_account_holder(ctx, target),
    ) {
        let e = reason.to_string();
        log_reject("challenge_pvp", me, &e);
        return Err(e);
    }
```
- accept_challenge NEW **Guard 3a** — AFTER guard 3 (status Pending, :847-852), BEFORE guard 4 (:854).
  Same statement with third arg `crate::accounts::is_account_holder(ctx, challenge.challenger)` and
  log tag "accept_challenge". (challenger is a joined player by construction — no oracle widening.)
- Doc-comment guard lists: add `3a.` lines to both reducers' doc comments (NO renumbering — 5a/5b precedent).
- fully-qualified `crate::accounts::` in the call (language-level shim-proof, red-team F7) — do NOT add
  `use crate::accounts;`.
- New consts/comments carry NO contiguous `//` or `/*` and no URL literals outside the concat! split
  (pvp_tests' local stripper is comment-first + string-unaware; red-team F5).

## pvp_tests.rs — EA-RA-01..06 (tester authors; VALUE-exact everywhere)
- EA-RA-01 truth table, 8 rows, assert_eq! on full Result (kills swapped-reason mutants — red-team F14):
  (F,*,*)→Ok ×4; (T,F,F)→Err(CALLER) [precedence pin]; (T,F,T)→Err(CALLER); (T,T,F)→Err(OPPONENT); (T,T,T)→Ok.
- EA-RA-02 challenge_pvp: extract body from stripped_pvp_for_scan() (:2097), squash_ws (:2089); assert
  (a) EXACT squashed statement pin present count==1 — build the expected needle by pushing the planned source
  shape through the SAME strip+squash pipeline inside the test (tolerate both `,)` and `)` closing forms per
  EA-CHR-01 precedent); (b) brace-depth fence: '{'-'}' balance from body start to pin offset == 0 (kills
  unreachable-if nesting, red-team F6); (c) pin offset < `battle_challenge().insert(` offset.
  The exact pin subsumes: arg identity/swap (M1/F3), enforced-arg literal (F2/E5), Result consumption (F1/E1-E3),
  accounts-shim (F7 via crate:: qual).
- EA-RA-03 accept_challenge: same, challenger leg, offset < `start_pvp_battle(`.
- EA-RA-04 file-wide (stripped+squashed pvp.rs): `has_jwt`==0; `ctx.db.account(`==0;
  `crate::accounts::is_account_holder(`==4 (corrected count — reviewer M2/simplify-6);
  `start_pvp_battle(`==2; `.battle().insert(`==1 (ctor-cover, red-team F8).
- EA-RA-05: direct unit asserts on const VALUES (child-module access, no needles): assert_eq both values,
  assert_ne between them. "Referenced-somewhere" scan CUT (simplify-8; truth table covers it transitively).
- EA-RA-06: (a) canary `assert!(!ranked_enforcement_active(), <ACTIVATION CHECKLIST message>)` — message names:
  EARS-3 client affordance, conversion of the 3 named e2e specs (pointer: evals/account-e2e.eval.mjs
  patchAllowedIssuers apparatus), removal of the conditional + this canary + ADR-0189 update, knowledge regen
  (reviewer M4/red-team F15). (b) issuers_configured rows: [PLACEHOLDER]→F; []→F; [real]→T;
  [real, PLACEHOLDER]→T (mixed = enforce); ["https:/"+"/auth.invalid-corp.example/"]→T (substring non-trap).
  ALL url literals in tests built with concat! splits. (c) structural pin: squashed stripped pvp.rs contains
  exactly once `fnranked_enforcement_active()->bool{issuers_configured(crate::accounts::ALLOWED_ISSUERS)}`
  (kills `let _ = …; false` discard — red-team F4a).

## evals/ranking-security.eval.mjs — criterion D (append-only; never touch A/B/C/G8/stripper)
Pure exported checker `checkRankedAccountGate(pvpSrc)` → {ok, why} with tagged clauses, EVERY clause fail-loud
(extraction failure → {ok:false}, ban clauses included — red-team F13):
[D/fn-missing] `fnranked_account_gate(` present; [D/challenge-missing]+[D/accept-missing] body extraction;
[D/challenge-stmt] exact compacted statement count==1 (me,target order + ranked_enforcement_active() arg +
crate::accounts:: qual + ifletErr+returnErr shape); [D/challenge-depth] depth-0 fence; [D/challenge-order]
< battle_challenge().insert(; [D/accept-stmt]/[D/accept-depth]/[D/accept-order] (challenger leg,
< start_pvp_battle(); [D/no-has-jwt] ==0; [D/no-account-table] `ctx.db.account(`==0; [D/ctor-cover]
`start_pvp_battle(`==2 && `.battle().insert(`==1; [D/active-body] exact squashed ranked_enforcement_active body.
Needles: countOccurrences/indexOf only, NO new RegExp (Semgrep remote-only trap); whitespace-free vs
compactWs(stripRustSource()); hazard chars via existing DQ/SLASH consts.
Teeth fixtures FIRST (short-circuit TEETH FAILED), each BAD asserts its SPECIFIC tag via why-prefix
(account-privacy precedent; red-team F13):
D-GOOD; D-GOOD-wrapped (must pass compacted AND needle must NOT match un-compacted — squash load-bearing);
D-BAD-absent→fn-missing; D-BAD-challenge-missing→challenge-missing; D-BAD-discarded-result→challenge-stmt;
D-BAD-true-literal→challenge-stmt; D-BAD-enforced-false→challenge-stmt; D-BAD-swapped-legs→challenge-stmt;
D-BAD-unreachable-if→challenge-depth; D-BAD-after-insert→challenge-order; D-BAD-accept-gateless→accept-stmt;
D-BAD-has-jwt→no-has-jwt; D-BAD-inline-table→no-account-table; D-BAD-second-ctor→ctor-cover;
D-BAD-active-discard→active-body.
Update ONLY the eval `name` string + final pass detail. Keep Leg-1/Leg-2 scanner-migration compliance.

## Proof-of-teeth register (ORCHESTRATOR executes — tester has no Bash; restore tree byte-identical after)
1 delete challenge gate stmt → EA-RA-02 + [D/challenge-stmt]; 2 delete accept gate stmt → EA-RA-03 +
[D/accept-stmt]; 3 move challenge gate after insert → order pair; 4 `gate(false,…)` → stmt pins;
5 me-leg → `true` literal → stmt pins + EA-RA-04 count; 6 gate body → always Ok → EA-RA-01;
7 swap reason arms → EA-RA-01; 8 ranked_enforcement_active → `{let _=…;false}` → EA-RA-06(c) + [D/active-body];
9 issuers_configured → `!issuers.is_empty()` → EA-RA-06 canary (activates today = red);
10 reword a const → EA-RA-05 + EA-RA-01; 11 add quick_match reducer calling start_pvp_battle → EA-RA-04 +
[D/ctor-cover].

## ADR-0189 (docs/adr/0189-ranked-requires-account.md) — key decisions
Header per ADR-0104 (Status Accepted / Date 2026-08-14 / Slice 14r-g / Supersedes — / Amends — /
Subsystems: security-authz, battle / one-sentence Decision). `Amends:` STAYS `—` (backlink eval would force an
edit in out-of-touches 0179; prose section "Relation to ADR-0179" instead + note for supervisor reconcile).
D1 both handshake reducers = complete ranked-ctor cover (battle.rs:86-90 + single start_pvp_battle caller).
D2 is_account_holder not has_jwt (SSOT). D3 accept-time re-check load-bearing (pre-enforcement Pending rows;
future revocation; TTL reaper collects stale guest challenges at activation — no softlock). D4 PendingDeletion
still counts as holder (M22 owns pending-deletion gameplay gating; red-team F11 documented). D5 pure seam +
two distinct &'static str reasons (client contract; caller-precedence). D6 deployment-conditional activation:
exact-placeholder ANY-semantics predicate; "inert = enforcement OFF (availability-biased)" honest wording
(NOT "fail-closed"); canary carries activation checklist; textual exact-statement pins chosen over the
witness-type (RankedOk proof-token) alternative — diff minimality; pins are exact-equality so deviation reds
(red-team F1 records the witness option for the OQ1 slice if wanted). D7 no migration (#313, Drew 2026-08-14);
guest-earned-rating import via claim rekey + in-flight-at-flip rated settles accepted for dev phase (F10);
rekey_profile/tombstoned_profile/G8 pin STAY (reviewer M5). D8 oracle residual: account-existence disclosed
only for online joined players (B1/F9), ADR-0179 G1 cited.
Confirmation section MUST name `evals/ranking-security.eval.mjs` and `server-module/src/pvp_tests.rs`
(adr-gate strict-confirmation). Cite issue #307 as deciding authority.

## Companions & ordering
knowledge regen AFTER the pvp.rs source commit (`just knowledge`; challenge_pvp.md/accept_challenge.md anchors
shift); `just adr-digest` after ADR; ARCHITECTURE.md one-line addition; NO CHANGELOG edit; NO docs/adr/README.md
edit (supervisor-owned; its next-free 0184 is stale — note in PR).

## Anti-patterns (enforced during review)
clamp-not-reject; client-only gating; has_jwt; inline table re-derivation; comment-satisfiable needles;
vacuous fixtures (tag-assert everything); breaking B1 needle (ranking::apply_pvp_rating( in pvp.rs ==1);
editing other criteria; local stripper/new RegExp in eval; renumbering guards; format!-built reasons;
touching CHANGELOG/adr-README; `use … as accounts` shims; URL literals without concat! split.

## Interim UX note (for PR body)
Gate inert today → zero user-visible change. Post-activation, before EARS-3 client slice lands, guests would
see the raw reason via sendGuarded→reportError (status line + error ring) — visible but not the affordance;
the canary checklist makes EARS-3 a hard prerequisite of activation.
