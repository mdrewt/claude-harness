# rb-40 — plan (guest pre-claim export_bundle purge: observable)

Slice: rb-40 · residual R-rb-22-EO-9 · spec `specs/monster-realm-v2/M-residual-backlog.spec.md#rb-40` ·
ADR reserved **0235** · worktree `.claude/worktrees/rb-40` · branch `feat/rb-40-export-purge-observability`
(forked from origin/master@1e738fd, master CI green) · baseline `cargo nextest -p monster-realm-module`:
785/785 · planner: opus (agent a388074a9719b5350), 2026-09-04.

## Design decision (→ ADR-0235 body) — candidate B

`pub(crate) fn purge_export_bundles(ctx, owner) -> usize` returns the number of chunks it deleted (tail
expression `purged`, bound as `let purged = ids.len();` BEFORE the move-loop; no `return` token).
`complete_guest_claim` binds it (`let purged = crate::privacy::purge_export_bundles(ctx, guest);`) and emits
EXACTLY ONE INFO line through the blessed OBS-1 emission point, between the purge and
`consume_claim_and_disarm`:
`crate::observability::mr_log("guest_claim_export_purge", &purge_fields(guest, purged));`
with a new PURE private fn in accounts.rs:
`fn purge_fields(guest: Identity, chunks: usize) -> String { format!("\"guest\":\"{guest}\",\"chunks\":{chunks}") }`
→ line `{"evt":"guest_claim_export_purge","guest":"<64hex>","chunks":N}`.

Decision sentence (≤240): `purge_export_bundles` returns the number of chunks it deleted; `complete_guest_claim`
binds that count and emits one `guest_claim_export_purge` line through `observability::mr_log`, so the purge's
effect is observable at the site that owns the ceremony.

Why the count: without it the line has no data dependency on the purge (says only "control reached here",
which the rb-22 static pins already say). Why unconditional (no `if purged > 0`): a zero-chunk claim is the
negative an erasure audit needs; a conditional is a dead-branch mutant surface (rb-22 measured). Why `mr_log`
not `mr_log_breadcrumb`: a `cause` duplicates the guest field and drags in the trace-pair machinery (G9f/G9h,
eval A10). Why the guest hex: the erasure audit's key is the SUBJECT; `account.claimed_from` (AUTH-21) already
persists the guest→claimer linkage; `"sender":"{me}"` INFO precedent repo-wide; a log FIELD never a label
(Loki label set is bounded to {reducer, evt}). PRV1-17/20: no player-authored field, no name/auth_issuer.

Rejected: **C** emit inside privacy.rs — contradicts the gate-enforced module doctrine (`rb22p_scan_hygiene`
bans the `log::` token with the reason "the reducer that calls the helper owns any logging"), cannot name the
cause without a signature change to all three pinned call sites, and puts an emission in the scanner-inert
file. **D** audit table — STOP (schema.rs out of touches; ADR-0221 automigration freeze). **B″** emit with no
count — a constant line, no behavioural tooth (fallback only). **B′** separate count helper — two index
scans, a second frozen pin.

ADR-0235 header: Status Accepted · Slice rb-40 · Supersedes — · **Amends: —** (an `Amends: ADR-0220` would
force a reciprocal `Amended-by` edit in 0220 = hidden dependency; use `Extends:` like ADR-0234) ·
Subsystems: security-authz, ci-gates.

## Exact target shapes

privacy.rs:58-69 →
```rust
pub(crate) fn purge_export_bundles(ctx: &ReducerContext, owner: Identity) -> usize {
    let ids: Vec<u64> = ctx
        .db
        .export_bundle()
        .owner_identity()
        .filter(owner)
        .map(|c| c.chunk_id)
        .collect();
    let purged = ids.len();
    for id in ids {
        ctx.db.export_bundle().chunk_id().delete(id);
    }
    purged
}
```
Squashed sig: `fnpurge_export_bundles(ctx:&ReducerContext,owner:Identity)->usize`
Squashed body: `letids:Vec<u64>=ctx.db.export_bundle().owner_identity().filter(owner).map(|c|c.chunk_id).collect();letpurged=ids.len();foridinids{ctx.db.export_bundle().chunk_id().delete(id);}purged`

accounts.rs:694 →
```rust
    let purged = crate::privacy::purge_export_bundles(ctx, guest);
    crate::observability::mr_log("guest_claim_export_purge", &purge_fields(guest, purged));
    consume_claim_and_disarm(ctx, guest);
```
Squashed (strings blanked): `;letpurged=crate::privacy::purge_export_bundles(ctx,guest);crate::observability::mr_log(,&purge_fields(guest,purged));consume_claim_and_disarm(ctx,guest);`
Squashed (strings kept): `crate::observability::mr_log("guest_claim_export_purge",&purge_fields(guest,purged));`
Fields fn placed AFTER complete_guest_claim (its `#L625` knowledge stamp stays; 7 later pages shift → `just knowledge`).
Naming constraint: NO new identifier may contain the token `purge_export_bundles` (crate census
`rb22_purge_named_nowhere_else_in_crate` budgets 2/2/0, no word boundaries). No `log`/`warn`/`reject` segment.
No `use` line added (fully qualified `crate::observability::mr_log`; `g7_no_log_crate_import_in_any_non_test_file`).

## Gate impact (all verified by the planner; none is a hidden dependency)
- privacy_tests.rs RE-FREEZE (tester): `rb22p_frozen_sig` :270 (`->usize`), `rb22p_frozen_body` :251,
  `rb22p_frozen_body_source` :285 (positive control), `rb22p_frozen_decl_source` :302. Run
  `rb22p_machinery_comment_string_blind` FIRST after the re-freeze (it re-derives body+sig from source text).
- accounts_tests.rs RE-FREEZE (tester): `rb22_frozen_purge_sig` :4796, `rb22_frozen_purge_body` :4776,
  clause (2) of `rb22_claim_purges_guest_export_bundles_call_site` :4874 → `;letpurged={call}ctx,guest);`.
- STAY GREEN: all other rb22/rb22p/m22s4/m22s3b/m22s6 pins (call sites at accounts.rs:949 and privacy.rs:1495
  keep byte-identical text — a discarded usize is warning-free, NO `#[must_use]`), G5/rb-39 alias bans,
  `auth36_reject_logs_carry_no_pii` (format! ban is scoped to log_reject arg spans :1425-1448), G7 OBS-2
  (mr_log has no `log::` token; .log-baseline NOT edited), evals guest-claim-integrity (no adjacency pin),
  account-privacy (G12 scoped to provision_or_touch_account/on_connect), observability-log-wrapper,
  observability-stack-config, currency-integrity, monster-privacy, ranking-security, adr-backlink-integrity.
- REGEN (companions): `just knowledge` (7 pages' #L stamps shift) after the last source edit; `just adr-digest`.
- ARCHITECTURE.md: append a slice-log paragraph after :2134 ending `ADR next-free = 0236.`; never quote a
  pinned bold marker; one-clause bump of the privacy.rs module-map row :562.

## Test plan (tester = opus, different agent from the implementer)
RED arm (compiles pre-fix, REDs by name): `rb40_claim_emits_one_purge_observation` (7 clauses: exactly one
`crate::observability::mr_log(` in complete_guest_claim AND whole-file; zero `mr_log_breadcrumb(`; bare
statement `;crate::observability::mr_log(,&purge_fields(guest,purged));`; purge<emit<consume; depth 0;
no `return` in [purge,emit]; `letpurged` bound once), `rb40_claim_binds_the_purge_result`,
`rb40_evt_and_fragment_literals_are_pinned` (strings-kept view: full call once; evt once file-wide; fragment
literal once; no reserved key `"evt":`/`"cause":`/`"sched":`/`"phase":`; no `name`/`auth_issuer`/`claimed_from`),
`rb40p_purge_returns_the_collected_count` (body ends `}purged`; `letpurged=ids.len();` once, before the loop;
no literal count; sig ends `->usize`), `rb40_no_new_bare_log_in_accounts_or_privacy`.
GREEN arm (post-fix): `rb40_purge_fields_is_exact` (exact fragment; chunks 0 renders `:0`; unquoted number,
quoted identity), `rb40_claim_purge_line_composes_into_the_envelope` (via `build_log_line`, evt-first, no
dangling comma), `rb40_purge_fields_is_pure` (fn body: no ctx/ctx.db/write verb/log segment).
Mutant matrix: see planner output (each mutant → one named killer).

## Ledger: E1 + X1..X6 (see gates/rb-40.gates.md). Residuals to declare: R-rb40-CASCADE (cascade + export
sites discard the count), R-rb40-ADR0220 (ADR-0220 D3 prose spells the old signature), R-rb-22-EO-10 (still
open), R-rb40-DASH (no Grafana panel consumes the evt).

## Risks
1. First backslash-escaped quote bytes in accounts.rs — 8 quote bytes (even) restore naive stripper polarity;
   battle/npc/pvp/guards already carry the shape in the same blob; verify with FULL `just ci` (X6). Fallback:
   `'\u{0022}'` char const + push_str (privacy.rs idiom).
2. Re-freezing 4 literals across 2 files — positive control `rb22p_machinery_comment_string_blind`.
3. Regen ordering (fmt → knowledge → adr-digest → commit together).
4. Runner state — never two `just ci` concurrently (account-e2e lock).
Workflow: solo build + MANDATORY artifact red-team (write-the-cheat) after the tester delivers.

## Plan revision after the plan-review lenses (reviewer a22e6326694eaf68d · red-team ac62c445993a25003 · /simplify)

1. **Emission is the TERMINAL statement before `Ok(())`** (reviewer MAJOR #2 + red-team #1 SURVIVES, both
   independently): a SpacetimeDB reducer's log line is written by the host as the reducer runs and survives a
   later panic/`Err` rollback, while the purge's deletes do not — so a line emitted mid-reducer could record
   "purged N" for a transaction that rolled back. Final shape of the success tail:
   ```rust
       rekey_all(ctx, guest, me)?;
       let purged = crate::privacy::purge_export_bundles(ctx, guest);
       consume_claim_and_disarm(ctx, guest);
       ctx.db
           .account()
           .identity()
           .update(claimed_account(account, guest, now_ms(ctx)));
       crate::observability::mr_log("guest_claim_export_purge", &purge_fields(guest, purged));
       Ok(())
   ```
   Verified: no existing pin requires the provenance update to be adjacent to `Ok(())` (AUTH-34
   `auth34_success_consumes_before_ok_exactly_once` and rb-22 clause (3) are position checks against the LAST
   `Ok(())`; eval [S/success-region] likewise). Tester pins: `purge < consume < update < emit < Ok`, and the
   strongest form — the squashed body ENDS with `...;crate::observability::mr_log(,&purge_fields(guest,purged));Ok(())`
   (emit immediately followed by the trailing Ok — nothing can run after it).
2. **Reachability ban widened to `[purge, Ok(())]`** (red-team #1/#2): no `return` token (left-bounded, same
   semantics as rb-22 clause (4)) anywhere from the purge binding to the trailing `Ok(())`. Note the explicit
   dependency on the untouched rb-22 clause (4) + eval [S/reachable] for the `[rekey_all, consume]` part.
3. **Explicit `#[cfg(` look-back on the emission statement** (red-team #3): mirror `rb22_lib_wires_mod_privacy`'s
   item-span look-back — the span from the previous `;`/`}` to the `crate::observability::mr_log(` token must
   contain no `#[cfg(` (a test-only emission publishes a wasm that emits nothing).
4. **The evt argument MUST be a bare `"..."` literal** (red-team #5) — no `const`/`concat!` indirection; the
   strings-blanked pin `mr_log(,&purge_fields(guest,purged))` REDs otherwise (deliberate).
5. **Citation fix** (red-team #4): the alias cheat `use crate::observability::mr_log as note;` is killed by the
   exact-count-of-1 on the literal `crate::observability::mr_log(` call form, NOT by G7's
   `g7_no_log_crate_import_in_any_non_test_file` (which bans only the external `log` crate imports).
6. **GREEN-arm sequencing** (reviewer BLOCKER #1): `rb40_purge_fields_is_exact` and
   `rb40_claim_purge_line_composes_into_the_envelope` CALL `purge_fields` and therefore do NOT compile on
   the pre-fix tree (a build error, not a by-name RED, and it would take all 785 tests with it). The tester
   authors them BEFORE implementation but delivers them as a SEPARATE staged file; the orchestrator applies the
   RED arm first (by-name RED captured → `memory/projects/gates/rb-40.red-before.md`), implements, then applies
   the GREEN arm in the same commit as the fix. `rb40_purge_fields_is_pure` is a source scan (compile-safe)
   and joins the RED arm. This is the rb-22 EO-6 precedent.
7. **ADR-0235 wording** (reviewer MINOR #3/#4): note that ADR-0180 D12's "identity hex permitted in WARN/ERROR
   lines only" describes what the audit FOUND (`log_reject`), not a blanket rule — INFO-level `"sender":"{me}"`
   precedent is repo-wide (npc.rs:318, movement.rs:121, battle.rs:274, pvp.rs:953); PRV1-17/20 are applied BY
   ANALOGY (their SHALL text names delete_account/cancel/reaper, not complete_guest_claim). Add one sentence:
   the line is a best-effort host-log signal, not a durable commit record (the ADR-0185 D1 tradeoff, mirrored).
8. **/simplify verdict — design B is the smallest correct increment.** Smaller candidates fail behaviour (B″: a
   constant line observes nothing) or add surface (B′). Kept: the pure `purge_fields` (mirrors
   `heartbeat_fields`; it is what makes a behavioural test possible for ~3 lines). Named YAGNI exception: the
   count is discarded at the cascade and re-export call sites (helper doc says so; residual R-rb40-CASCADE).
   Boy-scout capped at: helper doc comment (doc truth — required), ONE clause in the privacy.rs SCAN-HYGIENE
   header, ONE clause in the accounts.rs WRITE-ISOLATION header. Nothing else.
9. Whole-crate scanner risk (plan Risk 1) is CONFIRMED CLEAN by measurement (red-team #7): 4 of 5 distinct
   stripper implementations are backslash-escape-aware by construction; the other 2 never look at quotes.
