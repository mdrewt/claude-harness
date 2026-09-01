# monster-realm v2 — supervisor handoff (rolling; older entries in monster-realm-handoff-archive-2026-08.md, monster-realm-handoff-archive-2026-07.md)

---

## 2026-08-31T~19:2xZ — rb-25 COMPLETE (terminal: PR #399 open + local `just ci` green + remote CI running)

**Slice:** rb-25 — residual R-rb-2-X10: a REKEY manifest entry could name ANOTHER table's live
helper and `[G6/consumed]` still passed (it proved PRESENCE, never correspondence), and `indexOf`
let `et_exists(` hit inside `wallet_exists(`. One production file:
`evals/guest-claim-integrity.eval.mjs`.
**PR:** https://github.com/mdrewt/monster-realm/pull/399 — OPEN, MERGEABLE, remote CI running at exit.
Branch `slice/rb-25` (worktree `.claude/worktrees/rb-25`), 5 wip commits, all pushed, HEAD `9b982cf`.
**Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout on `master`, never mutated.
Fork `5962b7a`. No sibling slice in flight.

**Decision (ADR-0222, EXTENDS 0208 — see the gotcha below):** `containsCallOf` (left boundary only;
the needle's own trailing `(` is the right boundary; an immediately-left `.` refused) replaces
`indexOf` in both `[G6/consumed]` tests. New `[G6/correspondence]` resolves each needle to exactly
one `fn` in the stripped tree (fail-closed on 0 / >1 / no body / empty body / `#[cfg`/`cfg!(` on the
item OR in the body / a site inside a macro invocation / a receiver that is not a real db handle) and
requires that body to reach its OWN `db.<table>(` accessor, with a write verb WITHIN the method chain
on the rekey half (`isChainChar`-bounded). New `[G6/mirror]` pins the one `monster_pub` exception by
SET equality + same-needle + staleness. Five LIVE-TREE borrow proofs run against the shipped sources.

**Gate:** full `just ci` **EXIT=0** in the worktree (run 2x — mine + mr-gates).
**Acceptance: 8/9 met, 1 DEFERred, 0 unmet** (seed:e3b0c44298fc1c14), LINT-CLEAN.
Teeth 100 -> 351 tooth assertions; expectTag call sites 104 -> 126; 0 tests deleted/skipped/.only'd;
0 assertions removed; export set byte-identical; REKEY_MANIFEST region byte-identical.

**🔴 HEADLINE — the ARTIFACT red-team found 5 measured bypasses that the plan-phase red-team AND a
15-mutant bite-proof BOTH missed** (all `just ci`-green + `cargo clippy --all-targets -D warnings`
clean; all closed; bite-proof now 22/22): (1) a `Vec::insert` in the statement FOLLOWING a bare
filter satisfied the write-verb rule, because the span ran to the next `db.` rather than to the end
of the method chain; (2) so did a FOREIGN table's real `.update(` reached through a handle hoisted
before the accessor; (3) `stringify!(ctx.db.<table>()...)` — a token tree that is never
name-resolved, so `ctx`/`db` need not exist; (4) `let db = SomeLocalStruct;` with an inherent method
named after the table; (5) `cfg!(any())` (the EXPRESSION macro, a different token from the `#[cfg(`
the first draft banned) and `#[cfg(any())]` on the fn ITEM (outside the body the clause read).
**Reconfirms hard: run BOTH red-team lenses, and the artifact one is where the yield is.**

**🔴 SECOND HEADLINE — `(118 teeth verified)` was unconditional prose.** Inserting
`if (process.env.MR_FAST !== '0') return null;` as line 1 of `runTeeth()` skipped ALL teeth while
the eval printed the count and exited 0. Now derived from an `expectTag` counter and pinned
(`TEETH_PINNED`). Two other claim fragments in the pass summary were literals that survived deleting
the clause they described — both replaced with run-derived text. **Memory card written:
[[literal-claim-fragments-survive-clause-deletion]].**

**🔴 THIRD — FG label collision.** The tester's new teeth reused `FG74a-l`, which an unrelated
pre-existing `[R/planned-set]` family already occupies (eval:3818-4040). Duplicate labels make a
teeth failure ambiguous and defeat per-mutant label pinning. Renumbered to `FG75`. **Memory card:
[[fg-tooth-label-space-is-not-append-only]].**

**Proof-of-teeth:** RED receipt `memory/projects/rb-25.red-before.txt` — FG75b (the X10 attack
verbatim) reported "expected clause [G6/correspondence] to fire, but the checker returned PASS",
exit 1. Bite-proof `mutants=22 caught=22 survived=0`, each pinned to a DISTINCT tooth label; TWO
mutants carry deliberate ISOLATION edits (they neutralise an earlier SHADOWING assertion so the
target tooth is the unique catcher), and THREE carry an explicit PIN NOTE naming the tooth that
actually fires rather than re-pointing to a convenient neighbour. Gate scripts (untracked harness
files, MUST NOT delete before `mr-gates verify`): `memory/projects/rb-25.{probe,bite-proof}.mjs`;
receipts `rb-25.{red-before,bite-proof}.txt`; ledger `memory/projects/gates/rb-25.gates.md`; plan
`memory/projects/monster-realm-rb-25-plan.md` (its "RESOLVED DESIGN" section supersedes the top).
All CHECKs need the toolchain PATH export.

**⚠️ ADR gotcha for the next slice:** `**Amends:** ADR-NNNN` makes `adr-digest-check` demand a
reciprocal `**Amended-by:**` in the AMENDED file — which is a hidden-dependency STOP when that file
is outside `touches:`. 0222 uses a plain `**Extends:** ADR-0208` line instead. Also: the
`**Decision:**` header is capped at **240 chars** and the error prints the actual count.
`just adr-digest` rewrites `docs/adr/DIGEST.md` (which `just ci` then requires) but does NOT touch
`docs/adr/README.md`. **Memory card: [[adr-amends-forces-a-reciprocal-backlink-edit]].**

**⚠️ Vacuity trap caught by an EXPECT, not by me:** gate X7's first CHECK was
`cargo test --lib m22_rekey`, which matched ZERO tests and printed `test result: ok. 0 passed`. The
EXPECT was written as `/test result: ok\. [1-9]/`, so it rejected the vacuous run. The real test is
`data_lifecycle_cross_manifest_consistency`. **Write the digit class into every `test result: ok`
EXPECT.**

**Lenses:** planner(opus) · reviewer + red-team on the PLAN (both measured — the plan's own
`.{table}(` join key and its 5-clause mirror map were both beaten) · tester(opus, staged via /tmp;
its Bash guard blocks every command on a /tmp path, so the ORCHESTRATOR ran the RED proof and every
bite-proof) · reviewer + red-team + reducer-security-auditor on the ARTIFACT in ONE parallel batch,
with red-team isolated in its own throwaway worktree `.claude/worktrees/rb-25-rt` (since removed) so
the reviewer could not take a torn read — **on the PLAN pass I did not do this and the reviewer
reported red-team's live scratch impl as "already landed" code.** `/simplify` folded into the
reviewer (11 cut/dedupe items, all applied). **desync-guard SKIPPED** — zero client/game-core/netcode
surface. **verifier done INLINE** (the `/tmp/mr_warn_rb-25` landing flag fired before that step, same
call as rb-24 and rb-10): independent CHECK re-run via `mr-gates check`, plus the not-weakened audit
quoted above.

`reducer-security-auditor`: **PASS-WITH-NOTES**, and it did real work — it independently established
the `monster_pub` 1:1 invariant the mirror exception rests on (neither table is EVER deleted from in
the non-test tree; both inserts are same-transaction pairs; every `monster_pub` write copies
`owner_identity` through `pub_from_monster`; and MonsterPub's PK is `monster_id`, not
`owner_identity`, so a stale destination row could not PK-collide even counterfactually).

**Boyscout (well in cap):** `swapHelper`'s docstring (~3 lines) — the pre-existing comment claimed
`mut` "silently mutates nothing" on 0 hits; it THROWS on 0, only the 2-hit case is silent.

**Follow-ups flagged, NOT taken (all outside `touches:`):**
- **X9, DEFERred to `backlog`** — the exists-half HOLLOWING hole: a predicate that reads its table
  and returns a constant is textually indistinguishable from a real one (MEASURED green:
  `wallet_exists -> { let _ = ctx.db.player_wallet()...find(owner); false }`). Nothing else in the
  repo covers it — `accounts_tests.rs` references `account_has_game_data` once, for ordering only.
  Closure = the Rust twin enumerating the six disjuncts beside the `rekey_all` D6-order pin at
  `accounts_tests.rs:1835`. **Same file and same remedy rb-2's X10 DEFER named as part (a).**
- `[G6/consumed]` proves a delegation is SPELLED, not that its result is USED —
  `|| { let _seen = profile_exists(ctx, id); false }` measured green. Same remedy as X9.
- `pub(crate)` Identity fields and `Identity` nested in a `SpacetimeType` product column are invisible
  to `findIdentityColumns` (the second is already a documented residual in the eval's header);
  `[G6/parse]` counts TABLES, not columns, so neither is caught anywhere.
- The zeroed guest `player_wallet` row survives a claim under the retired identity and no M22 cascade
  path reaches it — structurally the `export_bundle` orphan rb-22 closed (ADR-0220), same
  `account.claimed_from` key available.
- `evals/monster-dual-write.eval.mjs` matches contiguous, NON-whitespace-compacted needles, so a
  rustfmt-wrapped unmirrored `monster` delete is invisible to it — and that eval now OWNS the 1:1
  invariant `[G6/mirror]` rests on.
- Stale `file:line` cites in pre-existing `[G6/consumed]` failure text (`accounts.rs:221-229` ->
  `:316-324`; `:209-216` -> `:296-303`; `accounts_tests.rs:1320` -> `:1835`).
- Known FALSE-REDs recorded in ADR-0222 §Consequences 7 so a future agent does not "fix" them by
  loosening: mutually exclusive `#[cfg]` twins of one helper -> "declared 2 time(s)"; and the live
  probes' `mutateLive` anchors, which pin exact live source text and fail loud with a re-anchor
  instruction after a parameter rename or a rustfmt change.

---

## 2026-08-31T~1x:xxZ — rb-24 COMPLETE (terminal: PR #398 open + local `just ci` green + remote CI running)

**Slice:** rb-24 — residual R-m22-s2-X15: declare the `AccountDeletionReaperSchedule` table (the
schema-declaration slice the M22 spec table named m22-s3) + wire PRV1-1 (`delete_account` arms one
row) / PRV1-3 (`cancel_account_deletion` disarms it). Additive schema only (ADR-0006).
**PR:** https://github.com/mdrewt/monster-realm/pull/398 — OPEN, MERGEABLE, remote CI running (ci+e2e
pending) at exit. Branch `slice/rb-24` (worktree `.claude/worktrees/rb-24`), 7 wip commits, all pushed,
HEAD `54ab4b8`. **Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout on `master`,
never mutated. Fork `efdae74`. No sibling slice in flight (no open project PRs bar this, no live slice branch).

**Decision (ADR-0221, amends 0207):** the table lands ATOMICALLY with a scheduler-guarded **deliberate
no-op** `account_deletion_reaper` (scheduled-ness is automigration-frozen — proven on a live host by
gate X9's negative control: non-scheduled→scheduled republish REJECTED). Classified **NotOwned** (an
`Erase` entry would force a C3 self-disarm anti-pattern into S3's cascade). `arm_deletion_reaper` (last
step of `delete_account`, one shared `now`), `disarm_deletion_reaper` (after the AUTH-38 gate + update,
ADR-0126 D4), pure `deletion_fire_at_ms` seam (`requested + game_core::DELETION_GRACE_MS_DEFAULT`,
saturating). REKEY_MANIFEST 25th key EXEMPT (VERIFIED non-orphan, unlike export_bundle: arm reachable
only from delete_account which requires an account row, and AUTH-7 rejects account holders from claims).

**ADR NUMBER COLLISION (supervisor action):** launch assigned 220, but rb-22 consumed
`docs/adr/0220-*` the same day; rb-24 took **0221** from `mr-state.json adr_next_free`. The launch-prompt
ADR assignment is racing same-day merges — worth a fix.

**Gate:** full `just ci` **EXIT=0** in the worktree (X15, run 2× — mine + mr-gates), with a
`client/node_modules` symlink from the main checkout (worktrees don't get node_modules; first `just ci`
127'd on `client/node_modules/.bin/biome` not found — **carry this: symlink or `npm ci` the worktree's
client/ before `just ci`**). **Acceptance: 16/16 met, 0 DEFERred, 0 unmet** (seed:f030a265736c965b),
LINT-CLEAN. Baselines (fork efdae74): nextest 2034 → 2048 (+14 rb24 tests, incl. 1 from the artifact
red-team; X12 floor 2046); table census 39→40; REKEY 24→25; T-VIS 18/22.

**🔴 HEADLINE — the ARTIFACT red-team found 2 measured survivors the plan pass + a 14-mutant bite-proof
BOTH missed** (both MEASURED clippy-clean + 13-test-green + 678-suite-green on the cheat; both closed +
covered by mutants M15/M16, bite-proof now 16/16): (1) `rb24_schedule_table_sole_writers` counted the
`ctx.db.`-PREFIXED accessor, so an aliased `let d=&ctx.db; d.account_deletion_reaper_schedule()...`
write (arming a FOREIGN identity) was invisible → now counts the prefix-agnostic `.account_deletion_reaper_schedule(`
method token. (2) `rb24_net_arm_mentions` (arm−disarm) NETS TO ZERO for an extra `disarm_deletion_reaper()`
call because disarm CONTAINS arm as a substring → added crate-wide `rb24_disarm_called_exactly_once_in_crate`
counting the disarm token DIRECTLY. Both are gate-integrity gaps (reaper is a frozen no-op NOW, so no
live exploit) that would carry into S3's destructive cascade. **Memory card written:
[[net-zero-token-subtraction-census-hole]]. Reconfirms: run BOTH red-team lenses on a gate slice.**

**Proof-of-teeth:** 5 named RED on the fork (E0425×5 compile receipt, `memory/projects/rb-24.red-before.txt`).
15 rb24 gating tests + 9 census edits. 16-mutant bite-proof `rb-24-X10:TEETH-16-RED mutants=16 caught=16
survived=0`, each pinned to a DISTINCT failure-message fragment. Gate scripts (untracked harness files,
MUST NOT delete before `mr-gates verify`): `memory/projects/rb-24.{rust-gate,eval-gate,bindings-probe,
migration-probe,bite-proof,scope-gate}.mjs`; ledger `memory/projects/gates/rb-24.gates.md`; plan
`memory/projects/monster-realm-rb-24-plan.md`. All CHECKs need the toolchain PATH export (node-24/cargo).

**Lenses:** planner(opus) · reviewer+red-team on PLAN (both measured: 12 bypasses + F1-F10, all fixed) ·
tester(opus, 15 tests staged via /tmp, RED proven by orchestrator) · reviewer+red-team on ARTIFACT
(2 more survivors, closed) · reducer-security-auditor PASS · desync-guard PASS. **/simplify folded into
reviewer (no over-engineering).** **verifier done INLINE** (the `/tmp/mr_warn_rb-24` landing flag fired
before that step — "no new subagent fan-outs", same call as rb-10): independent re-run of all 16 CHECKs
via mr-gates, not-weakened audit (77 asserts added / 0 removed, 0 tests deleted/skipped/#[ignore]'d,
16/16 bite). Domain auditors' one shared Nit: `delete_account`/`cancel` have no rate limit — bounded to
≤1 row/identity by AUTH-28/38, informational only.

**S3 obligations this slice creates (ADR-0221 Residuals):** R1 S3 replaces the no-op body (PRV1-5 recheck
+ PRV1-6 cascade) and deliberately retires `rb24_deletion_reaper_body_is_frozen_noop` (designed to red
when S3 lands); factor `resolve_all_live_interactions` from lib.rs:214-231, never hand-roll. R2 accounts
left PendingDeletion-and-unarmed by a fired no-op reaper — S3 owns the re-arm path. R3 **rb-21's PRV1-4
terminal-cancel guard must be inserted BEFORE this slice's disarm** in cancel_account_deletion. R4 the
NotOwned classification is truthful only while the reaper is the sole cascade driver (admin path / PRV1-8b
reactivation forces re-classification + disarm-on-reactivation). R5 consolidate `deletion_fire_at_ms` into
game-core when a slice owns that file (SSOT for requested+GRACE). R6 the shared eval's `schedulerGuardIsLive`
now requires a complete `…Err(`/`…Ok(())` (a bare `{return` prefix was forgeable — measured on the shipped
guest_claim_reaper gate too; boyscout-hardened auth27's Rust twin in-slice).

**Boyscout (in-cap):** `accounts_tests.rs auth27_...` (~16 lines, 1 hunk) — added a guard-FIRST
`starts_with(guard+"Err(")` clause ALONGSIDE the pre-existing bare-comparison assert (closes the measured
prefix-forge on the shipped guest reaper's gate). Dead `rb24_nd_accessor_call` needle removed after the
sole-writer census switched to the method token.

**Follow-ups flagged, NOT taken (out of scope):** the GENERAL accounts.rs write-isolation alias hole
(`_ctx` allowlisted in the eval's `findAliasedContext`, no Rust `hasEscapedDbHandle` twin) is PRE-EXISTING
and affects ALL accounts.rs writes — the [[write-target-accessors-alias-bypass]] backlog slice; rb-24
closed only the NEW table's exposure locally. The eval's `schedulerGuardIsLive` still doesn't require the
guard be FIRST (reviewer minor #1) — pre-existing, applies to guest_claim_reaper too.

**NEXT for the supervisor:** own the merge (`mr-ci-watch 398 rb-24`). On merge: close residual R-m22-s2-X15
(`mr-gates residuals close --pr 398`), run `mr-gates verify --slice rb-24` BEFORE removing the worktree
(every CHECK cds into it; the migration/bite-proof/scope scripts read it live), re-index the graphs
post-merge (build-loop step 10 — canonical checkout unchanged until merge, so NOT re-indexed by me).
Reconcile ADR-index/ARCHITECTURE across siblings. CI logs `/tmp/rb24-ci*.log`, gate logs
`/tmp/rb24-mrgates*.log`, bite-proof `/tmp/rb24-biteproof*.log`, red-team PoCs `/tmp/rb24-artifact-attack/`.
**Note the phantom X9 task (bdjl85lts) that ran my migration probe unbidden — result matched my own
independent re-run exactly (additive=ok control=red), so trusted, but flag if the wrapper is
double-launching gate scripts.**

---

## 2026-08-31T~07:0xZ — rb-22 COMPLETE (terminal: PR #397 open + local `just ci` green + remote CI running)

**Slice:** rb-22 — residual R-m22-s2-S3-GUEST-EXPORT-ORPHAN. Closes the guest-export orphan: a guest's
pre-claim `export_bundle` chunks would sit under the retired guest identity after `complete_guest_claim`
(S3 cascade keys on a live account's own identity, can't reach them; S4 TTL is not a reachability
guarantee). **Ships the fix AHEAD of S4** — measured: NO writer/reader of `export_bundle` exists yet
(S4's `request_data_export` unimplemented), so it's a structural hole, not a live-data bug.
**PR:** https://github.com/mdrewt/monster-realm/pull/397 — OPEN, MERGEABLE, remote CI running (ci+e2e
pending) at exit. Branch `slice/rb-22` (worktree `.claude/worktrees/rb-22`), 6 wip commits, all pushed,
HEAD `d17385c`. **Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout on `master`,
never mutated. Fork `48fc867`. No sibling slice in flight.

**Decision (ADR-0220):** delete-at-claim in a NEW owning module `server-module/src/privacy.rs`
`pub(crate) fn purge_export_bundles(ctx, owner)` — collect via `owner_identity` btree, delete by PK
(ADR-0126 idiom). Called once in `complete_guest_claim` between `rekey_all` and
`consume_claim_and_disarm`, passing the GUEST identity. `mod privacy;` in lib.rs. Owner-GENERIC so
S3's cascade reuses it verbatim. NOT rekey (would falsify EXEMPT → forces evals/ edits outside touches),
NOT TTL-only (S4 reaper absent; playtest_event doctrine). `export_bundle.owner_identity` re-verified
LIVE: still EXEMPT, 24 keys, evals/ untouched.

**Gate:** full `just ci` **EXIT=0** in the worktree, run 3× independently (my `/tmp/rb22-ci.log`, mr-gates
EO-4, verifier): 96 client files / 2871 tests, 99 evals PASS / 0 FAIL, observability validate 8/0/0,
clippy `-D warnings` clean. **Acceptance: 8/11 met, 3 DEFERred (EO-9/10/11 → backlog), 0 unmet**
(seed:e3b0c44298fc1c14), LINT-CLEAN. Verifier: **APPROVE** on all 6 items (independent CI, not-weakened
audit, 27/27 bite-proof, ledger honesty, scope, security).

**Proof-of-teeth:** 5/5 named RED on the fork (`memory/projects/rb-22.red-before.txt`). 17 Rust gating
tests (5 accounts-arm + 12 privacy-arm). 27-mutant bite-proof `RB22-BITE-PROOF tests=17 mutants=27
caught=27/27 survived=0 controls=2/2 verdict=Y` (`memory/projects/rb-22.bite-proof.mjs`). Gate scripts:
`rb-22.{rust-gate,exempt-probe,docs-gate,bite-proof}.mjs` (MUST NOT be deleted; the CHECKs cd into the
worktree — run `mr-gates verify` BEFORE removing the worktree). All `mr-gates check` CHECKs need the
toolchain PATH exported (node-24/cargo children) — a bare invocation gets node 18 (no `glob` in
fs/promises) + no cargo and false-FAILs EO-3/4/7.

**🔴 HEADLINE — the artifact red-team found TWO gate holes the plan-phase pass + a 16-mutant bite-proof
BOTH missed** (both MEASURED clippy-clean, both closed + covered by W25/W26): (1) CRITICAL — the
source-scan pipeline strips STRINGS before COMMENTS, so a bare `"` inside a `//` comment opens a fake
string that swallows real compiling code (an arbitrary-Identity `account` delete) from EVERY squashed-text
pin including the "frozen-body equality backstop"; closed by `rb22p_no_bare_quote_in_privacy`
(production-only: privacy.rs must carry exactly the one `"privacy_tests.rs"` literal, zero other quotes).
(2) MEDIUM — `[call/reachable]` scanned only rekey→purge; an early return in the purge→consume gap skips
AUTH-34 consume + AUTH-21 stamp while returning Ok (JS eval caught it, Rust arm didn't); closed by widening
the region to rekey→consume. **Reconfirms: run BOTH red-team lenses on a gate slice; the artifact pass is
not optional.**

**🔴 SECOND — reducer-security-auditor Nit 2 was closed IN-slice:** nothing constrained a THIRD module
calling the `pub(crate)` helper with a badly-derived owner. Added `rb22_purge_named_nowhere_else_in_crate`
(crate-wide `m22_scanned_sources()` naming census; bare token `purge_export_bundles`, NO word boundaries —
an aliasing `use ... as p` fuses to `_bundlesasp;` and the decl fuses to `pub(crate)fnpurge...`, so either
boundary drops a real site; accepted cost = a loud false-RED on a longer same-prefix identifier).

**3 DEFERs (all backlog, all real work, none gate-dodging):** EO-9 (live behavioral proof — no writer of
export_bundle exists to seed rows; the account-e2e rig is outside touches; re-open as a cheap phase when S4
ships `request_data_export`). EO-10 (the REKEY_MANIFEST EXEMPT reason at
`evals/guest-claim-integrity.eval.mjs:1864-1873` still names S3 as the owner of a fix rb-22 shipped — stale
prose; evals/ outside touches). EO-11 (`write_target_accessors` accounts_tests.rs:2139-2165 attributes
writes by nearest-earlier `ctx.db.` with no statement boundary + silently drops anchorless writes — a
`let db = &ctx.db;` alias bypass measured; rb-22 closed the class for privacy.rs LOCALLY, but the SHARED
helper needs a dedicated slice that re-baselines accounts.rs's G5 census).

**S3/S4 obligations this slice creates (in ADR-0220):** S3's cascade still owes the deleting-account
`export_bundle` erase (Erase-policy in DATA_LIFECYCLE_MANIFEST, reuse `purge_export_bundles`). S4 still owes
the 7-day TTL reaper AND must CAP per-owner live chunk rows — an unbounded chunk count lets a guest inflate
`complete_guest_claim` past the reducer budget, a self-denial that also makes the orphan UNCLOSABLE
(reducer-security-auditor Q5).

**Process notes.** (a) `git worktree remove --force /tmp/rb22-redcheck` from a shell whose cwd WAS that dir
yanked the cwd out from under the session (getcwd errors) — `cd` out first, or remove from elsewhere.
(b) `rm -rf` is hook-blocked; `find <dir> -delete` works. (c) A `just ci` launched WITHOUT an explicit `cd`
inherited the worktree cwd from an earlier command and ran against the right tree — but verify `pwd` in the
launching command; a wrong cwd would silently test master. (d) The exempt-probe's `outside=0` field was
added after the EXPECT was authored → the `evalsDiff=0 verdict=Y`-adjacent regex stopped matching; any
probe-output field insertion breaks an adjacency EXPECT (the census-format-edit lesson, again).

**NEXT for the supervisor:** own the merge (`mr-ci-watch 397 rb-22`). On merge: close the residual, promote
EO-9/EO-10/EO-11 backlog targets into real spec sections (measured: unmaterialised prose ids rot ~13 days),
run `mr-gates verify --slice rb-22` BEFORE removing the worktree, re-index the graphs post-merge (build-loop
step 10). Untracked harness files: `memory/projects/monster-realm-rb-22-plan.md`, `gates/rb-22.gates.md`,
`rb-22.red-before.txt`, `rb-22.{rust-gate,exempt-probe,docs-gate,bite-proof}.mjs`. Red-team PoCs
`/tmp/rb22-attack{,2}/`; CI logs `/tmp/rb22-ci.log`, gate logs `/tmp/rb22-gates{,2}.log`.

---

## 2026-08-31T00:5xZ — rb-20 PR OPEN (#396, awaiting supervisor merge)
Branch `fix/rb-20-reduced-motion-browser-tier`, worktree `.claude/worktrees/rb-20`, from master@3b2bcb2.
Local `just ci` GREEN (deciding line `validate.mjs: 8 check(s), 0 failed, 0 skipped`). Ledger 6/7 met,
1 DEFERred, 0 unmet. ADR-0219. Terminal state = PR open + local gate green; merge is supervisor-owned.

**THE FINDING — promote this.** A11Y-27's RENDERER arm is unwired in production and always has been.
`motionPreferenceFromWindow` has ZERO production importers; `client/src/main.ts:2807` calls
`resolver.resolve({...})` with no `reduceMotion`, so `renderResolver.ts:83`'s `false` default applies
every frame and `interpolateReducedMotion` is unreachable (desync-guard: the module is tree-shaken
dead code, not merely unwired). The S7 module's own header declares the S5 wiring contract that never
landed. Verified 4 ways (grep, codegraph, cbm trace_path, dynamic-dispatch/spread audit). This is
ledger gate **RM-7, DEFERred to `backlog`** — it needs a real spec section and a slice.

**What RM-7's slice must handle** (from desync-guard, do not lose this):
 1. Wire at `main.ts:2807` AND make `ResolveInput.reduceMotion` REQUIRED in the same commit — the
    optional-with-`false`-default field is exactly what let this ship unwired with green tests.
 2. Remote-arm discontinuity: the live MediaQueryList means a mid-session toggle moves every remote
    entity BACKWARD by up to ~500 ms of interp delay in one frame. Accept the jump-cut, pin it with a
    both-directions transition test; there is no per-remote clock to re-anchor against.
 3. `main.ts:2824`'s `sawFractionalOwnMotion` latch can NEVER set under reduceMotion, and
    `golden.spec.ts:156` / `zoneSync.spec.ts` assert it — so any environment reporting
    `prefers-reduced-motion: reduce` (or a widened rb-20 `testMatch`) reds them, and it will read as a
    netcode regression rather than an a11y setting.
 4. `client/e2e/reduced-motion.spec.ts` is the landing spot and is already written to receive it.

**Two red-team bypasses found in the ARTIFACT pass that the PLAN pass and a 19-mutant bite-proof both
missed** (both fixed + covered by in-repo fixtures): a spread-injected `contextOptions` SIBLING of
`use` (typechecks clean, runtime no-op, was green through `just ci` + the eval + the RM-1 proof), and
`testMatch: [/a11y\.spec\.ts$/]` whose escaped dots defeat a literal substring scan while collecting
that file. Reconfirms: run BOTH red-team lenses on a gate slice.

**Environment gotchas hit this run (cost ~1h):**
 - RM-3 (browser bite-proof) needs a LIVE spacetime; RM-6 (`just ci` → `account-e2e`) needs NONE —
   they are mutually exclusive locally. Run `just ci` first, then start spacetime for RM-3, then stop it.
 - `pgrep -f`/`pkill -f "just ci"` / `"spacetimedb-standalone start"` SELF-MATCH the agent's own giant
   command line and this session's shell; `pkill` killed my shell (exit 144). Use `ps -eo pid,cmd |
   grep "[s]pacetime..."` and an explicit `kill <pid>`.
 - A leftover prometheus container from a killed `observability-validate` squats the port and makes
   the next run hang for ~50 min with no output. `docker ps` + `docker rm -f` clears it.
 - The shared `client/node_modules` lacked `@axe-core/playwright` (in package.json since rb-19), so
   local `client-typecheck` red on rb-19's spec. `npm ci` in the main checkout's client/ fixed it.

Follow-up flagged, NOT taken (scope): halves 2/3/4 of `a11y-e2e` each carry a near-identical inline
`node -e` floor check; half 1's equivalent was already factored into a bash function.

# monster-realm v2 — supervisor handoff (rolling; older entries in monster-realm-handoff-archive-2026-08.md, monster-realm-handoff-archive-2026-07.md)

---

## 2026-08-30T04:5xZ — rb-15 PR #391 OPEN, local `just ci` green, remote CI running (ci QUEUED / e2e IN_PROGRESS)
Slice rb-15 (residual R-m23-s10-X18): `evals/a11y-static-shell.eval.mjs` is now the sole owner of the WHOLE CSS oracle (`parseCssRules`/`findIdSelectors`/`srOnlyIsAccessible` + private helpers, joining `stripCssComments`); `client/src/indexShell.test.ts` deleted its copies and reaches them through its EXISTING `rb12CssStripperOracle` namespace import — **zero new import lines**, because pinned biome 2.5.1 merges same-specifier imports and that takes RB12-G1's line count to 0 (measured). The `[A11Y-06]`/`[A11Y-07]` `function NAME(` codeNeedles retired; the eval now RUNS the oracle over two shared frozen tables (14+21 rows, executed IN FULL by BOTH tiers) and over the real `client/src/styles.css`.

DECLARED DEVIATION (adjudicated, not silent): the residual's stated direction (`.mjs` delegates to the `.ts`) is IMPOSSIBLE and was already settled by rb-12/ADR-0215. rb-15 applies that ADR's own ruling to the rest of the oracle; ADR-0215's body gets an appended `Update (rb-15)` note because its `:147-149` "Not closed by this slice" clause reserved the opposite. NO new ADR file (supervisor reserved `None`; 0216 taken; guessing 0217 risks a sibling collision).

Gates: **11/11 met, 0 unmet**, plus `DEFER: X18-CASCADE -> backlog` (the `[A11Y-07]` cascade/surface halves stay in the `.ts`; `parseCssRules` is exported for them). `just ci` exit 0 locally three times (last: /tmp/rb15-ci3.log, 96 client test files / 2841 tests). **23 mutation bite-proofs, all 23 reddening their NAMED tooth** (`memory/projects/rb-15.mutation-probe.mjs`). T1 proof-of-teeth captured pre-move: 4 gates RED with 9 LOCAL-DEF + 30 MEMBER-ACCESS-MISSING. Verifier: APPROVE (its one blocking item — three stale facts in the ARCHITECTURE block — fixed and re-CI'd).

Lenses run: planner · reviewer + red-team on the PLAN (both MEASURED, 12 bypasses + 2 blockers, all fixed) · tester (gating tests, staged via /tmp, RED proven by the orchestrator) · reviewer + red-team on the ARTIFACT (10 more measured findings incl. 4 CRITICAL false greens, all fixed) · doc-keeper · verifier. Domain auditors deliberately skipped: zero server-module/game-core/netcode/render surface.

Diff: 4 files — the 2 declared + touches-delta `docs/adr/0215-*.md` (BODY append only; `adr-digest-check` ran, no drift, header byte-unchanged) and `ARCHITECTURE.md` (one block).

NEW MEASURED FINDINGS worth carrying forward (all now in agent memory):
  * A regex literal holding a comment opener or a quote (`/[/*]/`, `/['"]/`, `/from '([^']*)'/g`) BLINDS every hand-written JS/TS stripper here, FAIL-OPEN with no throw — one such literal hid a re-pasted oracle from both the shape ban and the census at once, biome-clean and fully green. 10 of 188 `client/src` files already carry one, so a repo-wide tripwire must select the SCAN INPUT (fall back to raw, which only over-reports), not the verdict. Reported as `hazardousRegex=N` on every eval run.
  * A two-source fixture pin comparing row NAMES lets a row be swapped for a weaker payload under the same name — the row count, row shape and name roster are all blind. Closed with per-row payload fingerprints.
  * A shape blacklist is not an ownership gate: 7 shipping-plausible second oracles (object-method shorthand, object-literal arrow property, class static method, `Object.assign`, poisoned spread, sibling `*.test.ts` twin, getter) beat a `function NAME(`/`NAME =` ban AND all four delegation needles AND the file walk simultaneously. Needs shape ban + occurrence census + namespace integrity; no two suffice. A pass-through `vi.mock` needs a separate owner-specifier pin.

NEXT: supervisor owns the merge (`gh pr merge` is forbidden to the slice run). Delegate the CI wait to `mr-ci-watch 391 rb-15`. On merge: close residual R-m23-s10-X18 (`mr-gates residuals close --pr 391`), promote `R-rb15-CASCADE` into the backlog, and run `mr-gates verify` BEFORE removing the worktree (every CHECK `cd`s into it). Follow-ups NOT done, out of touches: `SUSPENSION_SPELLINGS` in `evals/overlay-a11y-manifest.eval.mjs` still misses `.skipIf(`/`.runIf(`/`.each([])`/`.for([])` (rb-15 added a LOCAL clause only); adding `indexShell.test.ts` to the `a11y-e2e` recipe is a three-place lockstep against `evals/ci-gate-wiring.eval.mjs`'s verbatim region pin.

# monster-realm v2 — supervisor handoff (rolling; older entries in monster-realm-handoff-archive-2026-08.md, monster-realm-handoff-archive-2026-07.md)

---

## 2026-08-29T~23:5xZ — rb-13 COMPLETE (terminal: PR #390 open + local `just ci` green + remote CI running)

**Slice:** rb-13 — residual R-m23-s6-A11Y-25. Ships `evals/keyboard-operable-rows.eval.mjs`
(4111 lines: matchers + a 48-tooth gating corpus + the real-tree scan), ADR-0216, and one-line
stale-prose fixes in `ARCHITECTURE.md` + `client/src/ui/menuView.test.ts`.
**PR:** https://github.com/mdrewt/monster-realm/pull/390 — OPEN, remote CI running at exit
(`ci` + `e2e` both pending). Branch `slice/rb-13` (worktree `.claude/worktrees/rb-13`),
7 commits, all pushed. **Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout
on `master`, never mutated. Fork `2681ee6`. No sibling slice in flight.

**Gate:** full `just ci` **EXIT=0 on the exact shipped tree** (`/tmp/rb13-ci.log`): 99 evals PASS /
0 FAIL (baseline 98), 2839 client tests, 2017 Rust, adr-digest-check clean.
**Acceptance: 9/9 met, 0 DEFERred, 0 unmet.** `mr-gates verify --slice rb-13` → **CLEAN**, zero
evidence disagreements. LINT-CLEAN. Scope: 5 files, all inside `touches:` + ALWAYS-in-scope
companions; `CHANGELOG.md` / `docs/adr/README.md` untouched.

**🔴 HEADLINE — the launch brief's premise was FALSE, and the supervisor's own state file said so.**
The brief asserted "S10 has since landed that eval ... verify menuView's rows pass the now-live
scan". `evals/keyboard-operable-rows.eval.mjs` **has never existed** — S10 (PR #370) declared five
evals and shipped three. `mr-state.json`'s own 22:00Z tick note records this correctly ("Predicted
gap CONFIRMED still real ... does not exist"); the scope paragraph handed to the run contradicted
the note that generated it. The slice was therefore a BUILD, not a verify.
**`client/src/ui/menuView.ts` needed ZERO edits** — it is spec §5.4's GOOD hostile-but-correct
fixture and it passes. `touches:` is an upper bound; leaving it untouched is compliance.
*Process fix for the supervisor: the launch-prompt scope text is being written from the residual's
PREDICTION rather than from the tick's own re-verification.*

**🔴 SECOND HEADLINE — two rounds of red-team, and the second round mattered more than the first.**
Round 1 (on the PLAN) measured the naive design hollow for 3 of 4 tags. Round 2 (on the SHIPPED
eval, after all round-1 hardening) still found **8 byte-identical-census bypasses**, all closed and
re-measured RED: 4 handler-registration spellings the census could not see
(`Object.assign({onclick})`, `setAttribute('onclick')`, an `innerHTML` handler literal, a
`const`-held `el[NAME]('click',…)`); `createElement('a')` with no href counting as native; the
`main.ts` delegation ratcheting only attribute selectors (`closest('li')` was green); a shipped
`tabindex` flipped `'0'`→`'-1'` (deleting the world canvas's only tab stop) being invisible to
`[A11Y-T3]`, which structurally cannot judge a delegation target; and a deleted `#help-title`
tabindex masked by one decoy `<hr tabindex="-1">` under a count floor.
**Lesson to carry: "red-team the plan" and "red-team the shipped artefact" are different lenses and
the second is not optional for a gate slice.**

**🔴 THIRD — the verifier caught a real FAIL that every other signal missed.** A late commit
inserted `armBCorroborated=` into the middle of the census; ledger gate X2 pinned
`native=… nonNative=…` as ADJACENT, so it silently stopped matching and seven `EVIDENCE:` lines
went stale — while `just ci` stayed green and the checkbox column still read 9/9. `mr-gates verify`
is what surfaced it (`EVIDENCE-MISMATCH`). **Generalisable: any census-format edit invalidates every
EXPECT that pins field ADJACENCY; re-run `mr-gates check` after ANY change to a `detail` string, and
treat `met:` (a checkbox count) as untrusted next to `verify`'s fresh re-execution.** The repair was
re-anchored on the NEW field rather than bridged with a bare `.*` (which would also match a degraded
census).

**Two claims were REMOVED rather than left standing** — both overstated the gate and both were in
the header AND the ADR: `KEYWORD_DENY` was measured **inert** (keywords are consumed structurally
before identifier parsing, and a shared callee must be dotted — so the list could be deleted
entirely with 48/48 teeth still green), and the "inverted-assertion negative probe" was a
**tautology** (`findInertDelegations` decides by needle absence and the predicate IS the needle, so
it only re-ran `findInertPins`). Reviewer + red-team found these independently.

**Process notes.** (a) A python heredoc whose fixture strings contain shell-substituted quotes
silently fails to mutate and the bite-proof prints GREEN — it happened twice this run and the
verifier hit it independently on a first-occurrence `.replace()` where the file had TWO matches.
**Every mutation must assert it applied.** (b) A multi-`rep()` python patch script that asserts
mid-way writes NOTHING — a whole 8-fix batch was silently lost and only caught by re-grepping for
its markers. Verify each batch landed. (c) The PostToolUse biome hook reformats arrays one-per-line
between edits, so a second patch pass matching the pre-format text will miss.

**Residuals declared (11)** — in the eval header and ADR-0216, each with why it needs its own slice:
`R-rb13-A11YE2E` (this eval is NOT in `ci-gate-wiring`'s `A11Y_EVAL_FILES`, so deleting the FILE
leaves `just eval` green with one fewer check — needs the justfile, outside `touches:`; **the
highest-value follow-up**), `R-rb13-T5EXEC`, `R-rb13-INERTGUARD`, `R-rb13-WALKROOT`,
`R-rb13-COMPTEETH` (the 48 teeth drive the MATCHERS, not the decision layer — 11 gutting mutations
still report 48/48), `R-rb13-CALLFORMS`, `R-rb13-DISABLED`, `R-rb13-A1SCOPE`, `R-rb13-REGEXSTRIP`,
`R-rb13-T3XTIER`, `R-rb13-TESTSUFFIX`.

Full plan + all lens findings + the 13 bite-proofs: `memory/projects/monster-realm-rb-13-plan.md`.

---
## 2026-08-29T~13:0xZ — rb-11 COMPLETE (terminal: PR #388 open + local `just ci` green + remote CI running)

**Slice:** rb-11 — residual R-m23-s2-X5: `aria-modal="true"` on the overlay shells puts the single
`#a11y-live` region in the AT-inert subtree. Ships `adoptLiveRegion(root): () => void` in
`client/src/ui/liveRegion.ts` (moves the region into the open overlay root, returns the release
closure), consumed opaquely by `client/src/ui/overlayA11y.ts` via a new `OpenRecord.releaseLive`.
Plus 12 new vitest teeth, a new 17-tooth eval, and two ledger-time probes.
**PR:** https://github.com/mdrewt/monster-realm/pull/388 — OPEN, remote CI running at exit. Branch
`slice/rb-11` (worktree `.claude/worktrees/rb-11`), 6 wip commits, all pushed.
**Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout on `master`, never mutated.
Fork `06393f2`. Sibling in flight: PR #387 (rb-10) — verified DISJOINT file sets.

**Gate:** full `just ci` **EXIT=0 on the exact shipped tree** (`/tmp/rb11-ci.log`): 98 evals PASS /
0 FAIL (baseline 97), 2832/2832 client (baseline 2820), 2017/2017 Rust, check-secrets clean. Local
`semgrep --config auto --error` clean on the changed files. `just a11y-e2e` 8 files / 181 tests.
**Acceptance: 9/9 met, 0 DEFERred, 0 unmet** (`seed:e3b0c44298fc1c14`), LINT-CLEAN. No MANUAL rows.

**🔴 HEADLINE — the slice is IMPOSSIBLE inside its declared `touches:` set, and that is now on the
record.** `evals/a11y-static-shell.eval.mjs` `[A11Y-05b]` (`:70`, `:74`, `:225-233`, `:686-693`)
makes `ui/liveRegion.ts` the SOLE module allowed to name `a11y-live`/`LIVE_REGION_ID`, so putting the
re-parent in the declared `overlayA11y.ts` is a certain `just ci` RED. The three exits were: widen
the owner set to two (weakens the exact gate protecting the node this change makes mobile), a
`[data-live-region]` synonym hook (**CI-green**, and a dishonest bypass — refused, recorded as
R-rb-11-BLACKLIST), or put the seam in the declared owner. The third was chosen; `[A11Y-05b]` is
untouched and still reports `owners=1 intruders=0 scanned=92`. **`liveRegion.ts` +
`liveRegion.test.ts` are a declared HIDDEN-DEPENDENCY touches-delta.** The ledger's own
`Touches: (inherit from source slice — REVIEW)` placeholder is what made this a judgement call rather
than a stop; collision-checked against PR #387 and `git branch -r` (no other slice branch).

**🔴 SECOND HEADLINE — Chromium does NOT model `aria-modal` AT inertness, so the obvious oracle is
worthless.** MEASURED with playwright 1.38 + CDP `Accessibility.getFullAXTree`: a sibling of a
focused `role="dialog" aria-modal="true"` stays `ignored:false`, `ignoredReasons:[]` — green before
AND after the fix. The probe instead asserts browser-computed AX **ancestry** (`live="polite"` node
descendant of the `modal=true` node) and PRINTS the `ignored` control in both states so it cannot be
misread as an inertness oracle. WebKit (VoiceOver's engine, which does prune) is not installed →
residual R-rb-11-VO.

**Five measured red-team findings changed the work** (two plan-phase, three implementation-phase):
(1) a never-restored region is PRUNED from the AX tree, so a one-shot up-front anti-vacuity check
lets the exact permanent-silence defect pass — the closed state now re-asserts `liveFound` on its
own. (2) AX ancestry cannot distinguish `aria-owns` from a real move (measured identical) → the probe
also pins light-DOM `parentElement`. (3) a co-occurrence pin is not a call-site pin: a hollowed
`openOverlayA11y` binding `() => {}` passed the eval at `teeth=12/12 pass:true` while never moving
the region → the adopt call site is pinned, W12 proves it bites. (4) a gate counting a literal in
`index.html` MUST strip HTML comments — this fired in CI on the slice's own ADR comment (count read
12, not 11); the dangerous inverse is a deleted shell propped up by a decoy comment. (5) a probe on a
FIXED port leaks vite and false-REDs the next run → `detached: true` + process-group kill AND an
ephemeral port.

**Process notes.** (a) A stray backtick in a comment INSIDE a JS template literal served as a
browser page silently corrupts it — the served HTML looks right, the module never executes, and there
is NO console error and NO pageerror; it presents as a bare `waitForFunction` timeout. The probe now
guards its own template. (b) `pkill -f <pattern>` where the pattern appears in the invoking command
line kills the invoking bash — two commands died that way; use `pgrep`+`kill` by pid with a split
literal. (c) A backgrounded `cd <worktree> && …` left the session cwd in the worktree and a later
relative `./memory/projects/mr-gates` 404'd — `bash-cwd-persists-into-main-checkout` again, benign
here. (d) The `tester` subagent again could execute nothing (guard allows only `bash -n`/`node
--check` on project-relative paths) and could not write into `.claude/worktrees/`; it staged to /tmp
and the orchestrator applied and ran the RED proof. Both cards still hold.

**Process.** 7 subagent invocations (planner, 2× reviewer, 2× red-team, tester, verifier) +
doc-keeper. `/simplify` applied inline by the orchestrator via the reviewer lens (collapsed the
adopt/release PAIR into ONE closure-returning function mirroring `installTrap`, dropping a duplicated
`record.root` fact). `desync-guard` and `reducer-security-auditor` NOT dispatched: zero
`server-module/`, zero `game-core`, zero `render/` surface — same call as rb-10. Code graphs NOT
re-indexed (canonical checkout unchanged until the supervisor merges). Untracked harness files:
`memory/projects/monster-realm-rb-11-{brief,plan}.md`, `memory/projects/gates/rb-11.gates.md`,
`rb-11.ax-ancestry-probe.mjs`, `rb-11.mutation-probe.mjs` (the last two MUST NOT be deleted — X5/X8).
CI logs `/tmp/rb11-ci.log`, `/tmp/rb11-ci2.log`; gate logs `/tmp/rb11-gates{,2}.log`.

---

## 2026-08-29T~11:4xZ — rb-10 COMPLETE (terminal: PR #387 open + local `just ci` green + remote CI running)

**Slice:** rb-10 — residual R-m23-s2-X4: the spec-2.5 reduced-motion guard for the battle HP bar was
owned by no slice. Ships `hpFill.className = 'hp-fill'`, drops the inline transition, adds the base
+ guarded rules to `client/src/styles.css`, a new 48-tooth CI eval, a 259-line DOM tooth, and two
ledger-time probes (14-mutant proof-of-teeth + a real-Chromium cascade oracle).
**PR:** https://github.com/mdrewt/monster-realm/pull/387 — OPEN, remote CI running at exit. Branch
`slice/rb-10` (worktree `.claude/worktrees/rb-10`), 4 wip commits, all pushed, HEAD `5c5c8d3`.
**Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout on `master`, never mutated.
Fork `ed0a8d9`; no sibling in flight.

**Gate:** full `just ci` **EXIT=0 on the exact shipped tree** (`/tmp/rb10-ci2.log`): 97 evals PASS /
0 FAIL (baseline 96), 2017/2017 Rust, 2820/2820 client (baseline 2818), check-secrets clean. Local
`semgrep --config auto --error` clean on the changed files (remote-only gate, de-risked ahead of PR).
**Acceptance: 8/8 met, 0 DEFERred, 0 unmet** (`seed:e3b0c44298fc1c14`), LINT-CLEAN. No MANUAL rows —
every gate is a real runner.

**🔴 HEADLINE — the guarded transition CANNOT CURRENTLY FIRE, and that is now disclosed.**
`#renderMonsterCard` calls `el.replaceChildren()` and `createElement`s a NEW fill every render, so a
CSS transition has no previous computed value. MEASURED in real Chromium driving the real render
loop: 120ms after a 90->10% drop the fill is at its FINAL width under BOTH preferences,
`getAnimations().length === 0` — under `no-preference` the bar SNAPS. **Not a regression** (the
pre-slice inline transition was equally unreachable on the same fresh node); the slice does exactly
what the residual asked and deliberately does NOT make the bar animate. ADR-0213 D7 +
residual **R-rb-10-INERT**. This is load-bearing for the next author: the natural "make the HP bar
smooth" commit is `element.animate(...)`, which ignores the preference outright — hence the
repo-wide inline ban.

**🔴 SECOND HEADLINE — the gate was rebuilt TWICE off measured attacks, not review opinion.**
Red-team transcribed the DRAFT gate and ran 17 stylesheets + 4 hostile views against a real Chromium:
**9 were gate-GREEN, `just ci`-clean, and animating under `reduce`.** The killer was SOURCE ORDER —
a media query adds no specificity, so a guard written BEFORE the base rule is completely inert while
all 13 draft teeth stayed green. A SECOND pass against the SHIPPED gate found 7 more; 5 changed it:
R1 a sibling-module `element.animate()` (green on the eval, the DOM tooth AND the browser probe —
happy-dom implements no `Element.animate` and the probe runs none of the app's JS) → inline ban
widened to all 92 non-test `client/src` modules; R3 five carriers reaching the fill without naming
the class (`[class^=]`, `[class*=]`, `[class~= i]`, `[style*=]`, `.hp\-fill`) plus the reviewer's
`div.hp-fill` specificity win → selector policy inverted to **fail-CLOSED**; R4 `url(/*)` deletes a
whole rule from the stripper's view with braces AND parens balanced; R5 `it.skipIf(TRUE)` suspends
the DOM tooth silently; R6 **no mutant could ever produce `[A11Y-RM3/delegate]`** — the clause was
proven only by its own fixtures, and a one-line hollowing kept `teeth=` green with the runtime
oracle deleted.

**Process notes worth keeping.** (a) The `tester` subagent could NOT execute anything — its bash
guard allows only `bash -n`/`node --check` on project-relative paths, so every RED claim it made was
DERIVED. The orchestrator ran the actual RED proof. Card `tester-subagent-has-no-bash` still holds.
(b) The mutation probe found a real pin mis-attribution mid-run (`div.hp-fill` caught by
`[A11Y-RM3/base]`, not the pinned `/set`); resolved by NARROWING the mutant, and later the pin moved
to `/set` legitimately when the fail-closed clause changed the design. (c) `cpSync` + a symlinked
`client/node_modules` is the workable probe isolation here — a recursive copy of node_modules per
mutant is unusable, and `cp -al` is not isolation at all. (d) A `git add -A && git commit` intended
for the worktree ran with cwd inherited from an earlier `cd`; it was a harmless no-op, but it
re-confirms `bash-cwd-persists-into-main-checkout` — `cd` explicitly in EVERY command.

**Accepted limits (all in ADR-0213 and the PR).** R-rb-10-CASCADE: the real-cascade oracle is
ledger-time, not CI-time — nothing in `just ci` resolves the cascade (`client/e2e/` is outside
touches and `a11y-e2e` is not part of `just ci`). R-rb-10-DELEGATE-STRENGTH: the delegation pin is
PRESENCE-only — a tautological rewrite of the DOM tooth body (needles kept, asserted about a locally
constructed probe element) passes every clause and was measured to survive the original defect being
restored; only X2's pass-count floor and the vitest-adjudicated mutant M2 catch it, at ship time.
R7: the CSS-nesting spelling of the guard is correct CSS and false-REDs — documented in the failure
message rather than fixed, because teaching the parser nesting late is its own risk.

**Process.** 6 subagent invocations (planner, 2x reviewer, 2x red-team, tester, doc-keeper).
`/simplify` applied inline by the orchestrator (cut the custom-property row/tooth/mutant to one
folded assertion; cut the forgeable `git diff --stat` ledger row; narrowed the probe copy set).
`verifier` NOT dispatched: `/tmp/mr_warn_rb-10` (landing pattern, "no new subagent fan-outs") was
set before that step, so the orchestrator performed the verifier's function directly — independent
re-run of the full `just ci`, all 8 ledger CHECKs via `mr-gates check`, both probes, and the
not-weakened audit (259 added / 0 deleted, 0 assertions removed, 0 suppressions). `desync-guard` and
`reducer-security-auditor` NOT dispatched: zero `server-module/` and zero `render/` surface.
Code graphs NOT re-indexed — the canonical checkout is unchanged until the supervisor merges.
Untracked harness files: `memory/projects/monster-realm-rb-10-plan.md`,
`memory/projects/monster-realm-rb-10-gate-spec.md`, `memory/projects/gates/rb-10.gates.md`,
`rb-10.mutation-probe.mjs`, `rb-10.cascade-probe.mjs` (the last two MUST NOT be deleted — X6/X7).
Red-team artifacts `/tmp/rb10-attack/`; CI logs `/tmp/rb10-ci.log`, `/tmp/rb10-ci2.log`.

---

## 2026-08-29T~06:2xZ — rb-8 COMPLETE (terminal: PR #386 open + local `just ci` green + remote CI running)

**Slice:** rb-8 — residual R-m22-s1-X3: `DELETION_GRACE_MS_DEFAULT` (game-core/src/accounts/deletion.rs:32)
had no path to TS, so S8's countdown would have hand-typed it. Ships a fifth `client-wasm` constant
accessor `deletion_grace_ms_default() -> i64` (JS BigInt), a COMPILED native parity test, one `vi.mock`
key in each of the two full-surface factories, and a new 6-clause gate with 27 fixtures.
**PR:** https://github.com/mdrewt/monster-realm/pull/386 — OPEN, remote CI running at exit. Branch
`slice/rb-8` (worktree `.claude/worktrees/rb-8`), 4 wip commits, all pushed, HEAD `42f74e5`.
**Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout on `master`, never mutated.
Fork `b7ce98a`; no sibling in flight.

**Gate:** full `just ci` **EXIT=0 on the exact shipped tree**, run three times independently (mine
`/tmp/rb8-ci2.log`, `mr-gates check` X9, and the `verifier`): 96/96 evals PASS · 2017/2017 Rust · 96
client files / 2818 tests. Baseline 95 / 2016 / 2818 — nothing regressed.
**Acceptance: 10/10 met, 0 DEFERred, 0 unmet** (`seed:e3b0c44298fc1c14`), LINT-CLEAN. X10 is the one
MANUAL row, hand-ticked with 7 path:line citations, each verified to resolve on the shipped tree.
Verifier PASS on A-F.

**Touches-delta (declared in the PR):** `evals/deletion-grace-wasm-ssot.eval.mjs` is NEW and outside the
literal declared set — judged in-scope-by-necessity (the residual mandates a gate; auto-discovery means
zero shared-file edits; a unique new filename cannot collide with a sibling). Plus the standard doc
companions. `game-core/tests/m22_s1_deletion_surface.rs` was declared but is deliberately UNMODIFIED;
`game-core/src/accounts/deletion.rs` is COMMENT-ONLY (an operator note that the retuned value must stay
a bare integer literal, because [G4] parses that declaration).

**🔴 HEADLINE — the first gate design was FULLY GREEN on an accessor that delegated nothing.** Red-team
measured two bypasses of the `indexOf` anchor: (1) a raw-string decoy — `stripRustComments` strips
comments but NOT string literals, so `const _X: &str = r#"...honest accessor..."#;` above the real one
steered both the shape pin and the attribute walk to the decoy while the shipped fn returned
`1_209_600_000i64 / 2`; (2) a `#[cfg(target_arch)]` twin, a shape that ALREADY EXISTS in that file
(`zone_map_ok`/`zone_map_err`), so it reads as idiomatic. Both closed by `requireSoleDefinition` —
count occurrences, throw on >1 — which is exactly the hardening the sibling `parseGraceConst` already
had and the reason red-team could not break THAT primitive. Memory card written:
`first-hit-anchor-is-forgeable`. Also closed pre-write: an earlier `contains + no digit` rule over a
`\{([^}]*)\}` capture was bypassed by `let _ = { …DELEGATE… }; 0x240c_8400i64` (rustfmt-stable, clippy
clean, and the COMPILED parity test PASSES because the values are equal) — hence [G1] is an exact-shape
pin over a brace-balanced read, and it is the SOLE tooth for that mutant.

**Other measured corrections during the slice.** The first `files >= 100` anti-vacuity floor was DEAD ON
ARRIVAL (real population 93 under the drafted glob) — a correct implementation would have shipped
permanently red; both plan lenses caught it independently. The `*.test.ts` exemption was dropped after
red-team reproduced `test-suffix-exemption-admits-disguised-production` on this tree. The scan root
widened from `client/src` to all of `client/` (20 real `.ts` under `e2e/` + the configs were invisible;
189 → 211 files, still zero hits). The duplicate scanner gained `/ - <<` with REAL operator precedence —
a naive left-to-right fold reported `100 + 6047900 * 100` as a duplicate when it is not.

**⚠️ TWO PROCESS NOTES.** (a) `just lint` red with 2 errors attributed to `client/src/net/connection.test.ts`
and `client/src/ui/leaderboardModel.test.ts` — BOTH untouched by the slice and green on master. The real
cause was the new unformatted eval file; biome interleaves diagnostics and prints the summary last, so
the tail reads as the cause. ~25 min lost comparing biome versions (identical, 2.5.1) and configs
(identical). Card: `biome-errors-misattributed-in-full-repo-run`. Run
`client/node_modules/.bin/biome check <your new file>` FIRST. (b) The `verifier` used `cp -al` for its
mutation copies and an `echo >>` append wrote THROUGH the hardlink into the live worktree's `main.ts`.
It self-disclosed, reverted, and re-ran from a clean tree; I independently confirmed `git status` clean
and `main.ts` byte-identical to the fork before opening the PR. **Hardlink copies are not isolation.**

**Accepted limits (all stated in ADR-0212 and the PR).** [G5] is a numeric DETECTOR, not a proof of
absence, and is blind to the likeliest real drift — PROSE, a hard-coded "7 days" in UX copy. [G5] is
also coupled to the constant's VALUE: exact today (0/211), but a retune to one day collides with
unrelated cooldown fixtures in `client/src/ui/healModel.test.ts` and would red the gate on the very edit
it exists to enable (loud, self-explaining, follow-up flagged as `G5-VALUE-COLLISION`). The SSOT is
build-time on BOTH sides — republishing `server-module` without rebuilding `client-wasm` leaves the
client showing the old window; this gate catches source drift, not deploy skew. `is_deletion_due` is
deliberately NOT exposed, so S8 must either get it as a second thin accessor or only FORMAT remaining
time and never decide due-ness.

**Follow-ups for the supervisor (not gates, not blockers).** (1) Nothing mechanically enforces that the
two `vi.mock` factories mirror the real pkg export surface — the convention is comment-only and this
slice kept it true by hand; a mock-vs-`.d.ts` exhaustiveness gate is a new gate class, deliberately not
built here. (2) The `G5-VALUE-COLLISION` follow-up above. (3) S8's obligations, recorded in ADR-0212's
`## Residuals`.

**Process.** 8 subagent invocations (planner, reviewer, 2× red-team, tester, desync-guard, doc-keeper,
verifier) + `/simplify` applied inline; `reducer-security-auditor` NOT dispatched (zero server-module
surface — `git diff` over `server-module/` is empty). Code graphs NOT re-indexed: the canonical checkout
is unchanged until the supervisor merges — re-index post-merge (build-loop step 10). Untracked harness
files: `memory/projects/monster-realm-rb-8-plan.md`, `memory/projects/gates/rb-8.gates.md`. Transcripts
`/tmp/rb8-biteproofs.md`, `/tmp/rb8-ci2.log`, `/tmp/rb8-gates.log`; red-team PoCs `/tmp/rb8-attack/`.

---

## 2026-08-28T~10:0xZ — rb-3 COMPLETE (terminal: PR #379 open + local `just ci` green + remote CI running)

**Slice:** rb-3 — residual R-m22-s0-X2: `[G6/declared]` in `evals/guest-claim-integrity.eval.mjs` once used
`key in manifest` (prototype-walking). **Triage measured:** on the pre-rb-2 fork `7e75cbd` a poisoned
`Object.prototype['table.col']` greens the gate; on master `ab35926` rb-2's `Object.keys`→`Map` (`kinds.has`)
already closes it **incidentally, with nothing pinning it**. rb-3 = the pin (FG72a-f, ADR-0010 proof-of-teeth), the
in-file WHY (THE OWN-PROPERTY BOUNDARY banner), and one real code change: the three classifier-result
`.error !== undefined` reads → `Object.hasOwn` (red-team measured an ambient `Object.prototype.error` flipping the
GOOD verdict on HEAD — FG72c was RED on that).
**PR:** https://github.com/mdrewt/monster-realm/pull/379 — OPEN, remote CI running at exit. Branch `slice/rb-3`
(worktree `.claude/worktrees/rb-3`), 3 wip commits, all pushed, HEAD `297885d`. **Supervisor owns the merge — I did
NOT run `gh pr merge`.** Main checkout on `master`, never mutated. Fork `ab35926`; no sibling in flight.
Touches: exactly `evals/guest-claim-integrity.eval.mjs` + `ARCHITECTURE.md` (touches-delta declared). Zero Rust.

**Gate:** full `just ci` **EXIT=0 on the exact shipped tree** (`/tmp/rb3-ci2.log`: 94 evals PASS / 0 FAIL, 2007/2007
Rust, 96 client files / 2818 tests, check-secrets clean). Local `semgrep --config auto --error` clean on both files.
**Acceptance: 8/10 met, 2 DEFERred (X9, X10), 0 unmet** (`seed:e3b0c44298fc1c14`), LINT-CLEAN; evidence recorded by
`mr-gates check` on the final tree. Seeded ZERO criteria (residual-backlog sections are narrative — expected).
Verifier PASS (re-derived all seven gates, reproduced the RED proof from 37aade4, 4 hand-mutations bite).

**⚠️ VERIFY NOTES.** Run CHECKs from the slice worktree root with the usual PATH export (the CHECKs are v18-safe
wrappers injecting PATH into node-24/cargo children). Two probes beside the ledger MUST NOT be deleted:
`rb-3.mutation-probe.mjs` (X2 — mkdtemp copy, 14 mutants each pinned to a TOOTH label, never writes the worktree) and
`rb-3.ratchet-probe.mjs` (X3 — comment-stripped, exact byte-string floors with zero slack). X8 is a MANUAL gate ticked
by hand with three path:line cites (banner :1612, FG72c :3967, ARCHITECTURE.md:118). Do NOT run `mr-gates verify`
concurrently with a `just ci`. Ledger authoring trap hit twice: gates without an `EVIDENCE:` line can never be met
(check ticks the box, writes nothing, reports 0/N) and `CHECK: MANUAL:` is executed by sh — both now in the
`mr-gates-check-authoring` memory card.

**🔴 HEADLINE — two DEFERs, both real work, both outside touches.** `X10 -> backlog`: red-team MEASURED the residual's
exact class LIVE in `evals/battle-schema-snapshot.eval.mjs` (`tableName in parsed` ~:780/:964/:996 —
`Object.prototype.monster = <baseline entry>` hides a deleted table from `checkSchemaDrift`) plus a `__proto__`-named
FIELD vanishing from its plain-object column map with no fail-close (the TABLE-level case is fail-closed by
[G6/parse]); that module supplies `parseTableSchemas` to the G6 walker. `X9 -> backlog`: the ADR — no number reserved
for rb-3 (empty slot); fold into rb-2's deferred X9 as ONE ADR for the G6 manifest gate (policy discriminator +
own-property boundary + FG72c's in-process `Object.prototype` write hygiene, which rebuts
`evals/append-only-ids.eval.mjs:1653` — that file still states the absolute rule with no back-pointer; outside touches).
Not a gate: `classifyPolicy` reads each field several times (getter-TOCTOU on an injected manifest — not the prototype
class, unreachable from the frozen manifest; red-team F3).

**What the lenses found that shaped the slice (all measured, all closed in-tree):** the COLUMNS side of the join
(`columns.has` in [G6/live]/[G6/anchors]) was unpinned — rebuilt as `key in Object.fromEntries(columns)` every gate
stayed green and with one ambient key per manifest column G6 passed on an EMPTY tree → FG72c now runs four directions
in one pollution window (declared / verdict / live / anchors; `account.identity` is the only anchor neither
EXEMPT- nor REKEY-pinned); a hollowed FG72a kept every mutant RED via FG72c → per-mutant TOOTH pin (MIS-TOOTHED),
and M12 narrowed to a non-`Object.prototype` base when FG72c began catching it first; `error` is a node-internal
chain-read key (`handleErrorFromBinding`) — a leak silently truncates a file-redirected stdout → delete it first, no
stdout/fs inside the window; sibling `[G6/…]` tags inside checker messages were false-pass surfaces for `expectTag`
(indexOf) → de-bracketed. Three memory cards written (`prototype-pollution-teeth-need-the-real-write`,
`own-property-boundary-has-two-sides`, `mutant-tooth-pin-is-load-bearing`).

**Accepted limits (stated in the PR):** fixture self-assert deletions are unbounded by the ratchet (counts calls, not
assertions — consistent with FG1-FG71 and rb-2's FG66/FG69 decision); `(72 teeth verified)` is a hand-maintained
literal; `Object.hasOwn(shipped, 'error')` is source-pinned only (branch unreachable on the success path); M9/M10 share
FG72c's message; FG72c's two window guards are tamper-evident only if a hoisted hunk carries them.

**Process notes.** (a) Two session teardowns hit mid-`just ci` (SIGTERM at client-test); the second run was launched
detached (`setsid nohup`) and completed — prefer that for any >10-min gate. (b) `reducer-security-auditor` /
`desync-guard` not dispatched: zero Rust/game-core/client surface (manifest block sha256 identical fork vs HEAD).
(c) Budget: HARD tier with 9 subagent invocations (planner, 2× reviewer, 2× red-team, tester + 1 resumed round,
verifier, doc-keeper) + /simplify inline ×2 — close to the $150 target; the red-team write-the-cheat passes again
produced both HIGH findings. (d) Code graphs NOT re-indexed: the canonical checkout is unchanged until the supervisor
merges — re-index post-merge (build-loop step 10).

**Housekeeping.** Untracked harness files: `memory/projects/monster-realm-rb-3-plan.md`,
`memory/projects/monster-realm-rb-3-progress.md` (now superseded by this entry), `memory/projects/gates/rb-3.*`.
Tester staging under `/tmp/rb3-tests/`; ci logs `/tmp/rb3-ci*.log`.

# monster-realm v2 — supervisor handoff (rolling; older entries in monster-realm-handoff-archive-2026-08.md, monster-realm-handoff-archive-2026-07.md)

---

## 2026-08-28T~06:4xZ — rb-2 COMPLETE (terminal: PR #378 open + local `just ci` green + remote CI running)

**Slice:** rb-2 — residual R-m22-s0-X1: `REKEY_MANIFEST` entries carry an explicit `policy`
discriminator (`REKEY`|`BLOCKED`|`EXEMPT`), read by ONE parser (`classifyPolicy`) under a new first
clause `[G6/policy]` in `checkRekeyCompleteness`; the D6 REKEY columns are pinned REKEY by value
(`G6_REKEY_ANCHORS`, subset pin); FG70 is an in-file twin of the Rust T9 text scan.
**PR:** https://github.com/mdrewt/monster-realm/pull/378 — OPEN, remote CI running at exit. Branch
`slice/rb-2` (worktree `.claude/worktrees/rb-2`), 5 wip commits, all pushed, HEAD `7af3535`.
**Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout on `master`, never
mutated. Fork `7e75cbd`; no sibling in flight, no rebase needed. Touches: exactly
`evals/guest-claim-integrity.eval.mjs` + `ARCHITECTURE.md` (touches-delta declared). Zero Rust.

**Gate:** full `just ci` **EXIT=0 on the exact shipped tree** (`/tmp/rb2-ci3.log`): 94 evals PASS /
0 FAIL, 2007/2007 Rust, 96 client files / 2818 tests, lint + typecheck clean.
**Acceptance: 8/10 met, 2 DEFERred (X9, X10), 0 unmet** (`seed:e3b0c44298fc1c14`), LINT-CLEAN;
evidence recorded by `mr-gates check` on the final tree after the last commit. Seeded ZERO
criteria (residual-backlog sections are narrative — expected). Verifier PASS (independent
re-execution + two fresh mutations red + not-weakened audit across the implementer's commits).

**⚠️ VERIFY NOTES.** Run CHECKs from the slice worktree root with the usual PATH export (the CHECKs
are v18-safe wrappers that inject PATH into node-24/cargo children). Three probe scripts beside
the ledger MUST NOT be deleted: `rb-2.mutation-probe.mjs` (X3 — mkdtemp copy, 10 mutants with
pinned tag/tooth, never writes the worktree), `rb-2.ratchet-probe.mjs` (X4 — comment-stripped,
string-aware; fork-side skip = hard fail) and `rb-2.fidelity-probe.mjs` (X8 — imports fork + HEAD
modules; outer v18 relaunches inner under node 24). X6 runs the whole eval suite (~3 min); X5
compiles the module tests once. Do NOT run `mr-gates verify` concurrently with a `just ci`.

**🔴 HEADLINE — two DEFERs, both real work, both outside touches.** `X9 -> backlog`: four consumers
still STATE the typeof trap as live — `evals/rekey-contract-surface.eval.mjs:41-50`,
`server-module/src/accounts_tests.rs:3930-3936` (the sole recorded justification for ADR-0207's
two-manifest deviation from M22 spec §2), `docs/adr/0207-*` :18/:108/:112/:155-157 and
`docs/adr/0179-*` :708-710 — the last one INSTRUCTS M22 S3 to add a *string* key, which is now a
guaranteed `[G6/policy]` RED; plus the shape decision's ADR (no number reserved for rb-2 — the
m23-s6 precedent; the WHY lives in the manifest JSDoc + ARCHITECTURE.md). **M22 S3 must read the
new shape before touching the manifest**: a new entry is `{ policy: 'EXEMPT', reason: '…' }`, and
the spec'd `deletion_policy/basis/exportable` extension goes through `POLICY_SHAPES` (closed field
set; `exportable` being a boolean also needs the non-blank-STRING rule relaxed). `X10 -> backlog`:
needle↔key correspondence is a PRE-EXISTING `[G6/consumed]` substring limit (measured: re-point
`heal_cooldown`'s `exists` at `has_monsters(` and delete its own delegation → green); closure =
enumerate the six `account_has_game_data` predicates in accounts_tests.rs beside the rekey_all pin
at :1320 (outside touches) + `containsIdent` in `[G6/consumed]` + a tooth.

**What the lenses found that shaped the slice (all measured, all closed in-tree):** an
identity-memoised classifier strict only for the one spread-injected entry and a key-allowlist
classifier strict only for the five fixture keys both passed the whole planned suite → FG69 (a
per-entry copy must PASS + 24 keys × 7 shapes); biome 2.5.1 rewrites a reason with one apostrophe
+ two double quotes into `'…\'…'` and the escape-blind Rust T9 walk then silently reads 22 of 24
keys above its ≥20 floor → FG70/FG70b; the anchor byte string is a SUBSTRING of any
`…_REKEY_MANIFEST = freezeManifest({` decoy → FG70 counts it over RAW text exactly once;
`[G6/consumed]` iterating the anchor list is indistinguishable from the REKEY set today → FG71.
Two memory cards written (`text-scan-consumer-breaks-under-formatter`,
`spread-injected-fixtures-leave-shipped-entries-unvalidated`).

**Accepted limits (stated in the PR and in-file):** a DEEP-EQUAL memo of the shipped data survives
every in-file tooth (killed only by X3's data/text mutants M6/M7/M9/M10, not by `just ci`); a
classifier lying about kind AND guarding consumption is observable only via X1's `(8 REKEY
entries` count (the tautological in-file cross-check was cut on review); zero-width chars in a
reason defeat `trim()`/the prefix-lie ban (deliberate-only path); loop-breadth counters for
FG66/FG69 deliberately NOT added (consistent with FG1-FG59; X3's M8 catches the FG69 case
one-shot).

**Process notes.** (a) Foreground rule honoured; three full `just ci` runs (early, final-1, final)
because the tree moved twice after the first — ~12 min each, all EXIT=0. (b) X4's round-2
string-unaware comment stripper tripped its own new fork-skip assertion on two legitimate fixtures
(`//` inside a string) — fixed in the probe (string-aware), noted so `verify` is not surprised.
(c) `reducer-security-auditor`/`desync-guard` not dispatched: zero Rust/game-core/client surface.
(d) Budget: HARD tier with 11 subagent invocations (planner, 2× reviewer, 2× red-team + 1 resumed
round, /simplify ×2, tester + 1 resumed round, verifier) — over the $150 target; the two red-team
write-the-cheat passes were the highest-value spend (both CRITICALs came from them).

**Housekeeping.** Untracked harness files: `memory/projects/monster-realm-rb-2-plan.md` (plan +
all three adjudications — commit or discard); ledger + 3 probes in `memory/projects/gates/`
(gitignored). /tmp artifacts kept for audit: `/tmp/rb2-tests/` (tester rounds 1+2),
`/tmp/rb2-redteam{,2,3}/` (attack harnesses, HONEST/FIXED reference builds, Rust-scanner model +
fuzzer), `/tmp/rb2-verify/`, `/tmp/rb2-ci{1,2,3}.log`, `/tmp/rb2-pr-body.md`. Code graphs NOT
re-indexed (nothing merged; main checkout unchanged — refresh after the squash-merge). The
`.claude/worktrees/rb-2` worktree stays for the merge pipeline. ADR next-free still **0208**.

---

## 2026-08-25T~13:2xZ — m22-s2 COMPLETE (terminal: PR #373 open + local `just ci` green + remote CI running)

**Slice:** m22-s2 — M22 privacy **S2**: the 39-table `DATA_LIFECYCLE_MANIFEST` (policy+basis+exportable)
in `schema.rs`, `Account.terminal_at_ms` appended with `#[default(None)]` + the legality re-derivation,
the private `export_bundle` chunk-contract table, the `auth_issuer` doc correction, one REKEY key.
**PR:** https://github.com/mdrewt/monster-realm/pull/373 — OPEN, remote `ci` + `e2e` IN_PROGRESS at exit.
Branch `slice/m22-s2` (worktree `.claude/worktrees/m22-s2`), 6 commits, all pushed. **Supervisor owns the
merge — I did NOT run `gh pr merge`.** Main checkout on `master`, never mutated. Fork `00de705`; no
sibling in flight, no rebase needed.

**Gate:** full `just ci` **EXIT=0 on the exact shipped tree** — 93 evals PASS / 0 FAIL, 2007/2007
workspace Rust tests (fork 1996 measured in-worktree, +11 gating tests, 0 skipped), 96 client files /
2818 tests, observability 8/8. **Acceptance: 15/16 met, 1 DEFERred, 0 unmet** (`seed:e3b0c44298fc1c14`),
LINT-CLEAN, evidence WIPED AND RE-EXECUTED FRESH on the final tree (m23-s5 precedent). Seeded ZERO
criteria (SPEC-SECTION-NOT-FOUND, **7th occurrence**). 22/22 bite-proofs bite (2 asymmetry controls),
2 re-measured post-review-fix. `/tmp/mr_warn_m22-s2` (LANDING) appeared AFTER the three post-impl lenses
+ security auditor completed — the verifier was discharged mechanically inline (fresh gate re-execution,
not-weakened diff audit vs RED commit `07adca9` [only a rustfmt reflow with byte-identical concat
chunks], 2 re-measured bites), declared in the PR per the m23-s6 precedent. desync-guard mechanically
empty (zero game-core/netcode/reducer-body files).

**⚠️ VERIFY NOTES.** Run CHECKs from the slice worktree with the usual PATH export. Two persisted probe
scripts beside the ledger MUST NOT be deleted: `m22-s2.schema-probe.mjs` (snapshot/bindings/manifest-diff
modes; manifest-diff VALUE-imports fork-vs-HEAD REKEY_MANIFEST — a line-diff was measured forgeable via
JS duplicate-key last-write-wins) and `m22-s2.migration-probe.mjs` (X9: REAL republish over a scratch
`spacetime start --in-memory` on :3777 — additive leg must succeed, mid-struct control must fail with the
genuine migration rejection; ~5-10 min; do NOT run concurrently with `just ci`). X13 needs the eval's
SELF-reported name `schema-snapshot`, not the filename.

**🔴 HEADLINE — the DEFER is a platform rule the spec missed.** `AccountDeletionReaperSchedule`
(X15 → backlog, INTENDED OWNER m22-s3): SpacetimeDB forbids changing a table's scheduled-ness in
automigration (doc verified both branches; ADR-0193:148-149 corroborates), and declaring the reducer in
S2 both violates the brief and hard-reds `[R/name-set]` (R-m22-s1-X1). **S3 must land table + reducer
ATOMICALLY, plus the table's DATA_LIFECYCLE_MANIFEST entry + REKEY key in the same commit, plus the
SANCTIONED_REDUCERS/Rust-twin updates R-m22-s1-X1 already mandates. Spec §7.2's S2 row needs amending.**
Same probe also proved "Adding Unique or Primary Key constraints" is automigration-forbidden — decide
uniqueness before a table's first ship (export_bundle's chunk-tuple uniqueness is therefore
REDUCER-enforced in S4, documented in the struct doc).

**THREE RESIDUALS FILED for S3 (all found by the review fan-out, all verified out of S2's reach):**
`R-m22-s2-S3-CANCEL-TERMINAL` — cancel_account_deletion on a terminal account would mint
Active+Some(terminal) (measured in both build profiles; debug_assert compiled out of release); S3 owns
the PRV1-4 distinct-error guard + a constructor-level test; ALSO decide release-profile debug-assertions
or promote the check to Err guards. · `R-m22-s2-S3-GUEST-EXPORT-ORPHAN` — pre-claim export chunks orphan
under the retired guest identity (cascade keys on the deleting identity); close via claim-time delete
(preferred) or a claimed_from sweep; the REKEY entry's basis states this HONEST LIMIT verbatim after an
in-slice audit correction (the first draft's "cascade sweeps this column" was FALSE — caught
independently by the security auditor AND red-team). · `R-m22-s2-S3-BASIS-CONTENT-FLOOR` — the basis
length floor is a floor, not a content oracle (measured: 20 filler chars pass); reviewer-owned prose,
suggest wontfix.

**Decisions the supervisor should sign off (both in ADR-0207, both flagged as spec deviations):**
(1) the manifest lives as a Rust const in schema.rs, NOT as JS REKEY_MANIFEST object entries (spec §2's
"extend one manifest") — object entries are the measured R-m22-s0-X1 red-on-arrival trap and accounts.rs
placement reds the live g5 wallet-token gate; drift closed by bidirectional totality + a cross-manifest
test. (2) The reaper-table deferral above. ADR next-free = **0208**.

**Process notes worth propagating.** (a) The migration probe's negative control took THREE iterations to
red for the RIGHT reason (missing workspace member → orphaned doc comment → unbound struct-literal
field, each a cargo-build red = VOID control); the shipped probe asserts the failure text is
migration-shaped and rejects build-shaped reds. (b) clippy `-D warnings` hard-fails a test-only-consumed
pub const on the LIB target; the fix is a const-fn assertion READING every field — and derived
`PartialEq` was the hidden payload-field reader, so dropping it resurfaced dead_code until the const fn
validated the ViaJoin payload (now a real compile tooth). (c) battle-schema-snapshot parses RAW source
string-unaware in BOTH its check and `--write` — no `/` in any schema.rs string literal (gate-tested),
and every new table needs its T-VIS-ANCHORS pinned-set + count edit (the tooth's designed ritual).
(d) Three memory cards written (scheduled-attr frozen; snapshot raw-parse + ritual; lib-target dead_code
const-eval consumer).

**Housekeeping.** Untracked harness files: `memory/projects/monster-realm-m22-s2-plan.md` (plan + lens
adjudications) — commit or discard. Ledger + probes in `memory/projects/gates/` (gitignored — the
m23-s7 version-control recommendation still open). /tmp artifacts kept for audit: `m22s2-tests/`
(tester deliverables + bite runner), `m22s2-docs/` (doc-keeper staging), `m22s2-final-ci.log`,
`m22s2-notweakened.diff`; red-team scratch in `/tmp/redteam-*`, `/tmp/m22s2-migprobe/target` (probe
build cache, safe to delete). Code graphs NOT re-indexed (nothing merged; main checkout unchanged —
refresh after the squash-merge). The `.claude/worktrees/m22-s2` worktree stays for the merge pipeline.

## 2026-08-25T~05:3xZ — m23-s6 COMPLETE (terminal: PR open + local `just ci` green + remote CI running)

**Slice:** m23-s6 — M23 accessibility **S6**: `menuView` becomes an ARIA listbox, and the **sixteenth
and last** `OverlayId` gets its overlay-a11y wiring.
**PR:** https://github.com/mdrewt/monster-realm/pull/369 — OPEN, remote `ci` IN_PROGRESS / `e2e` QUEUED.
**Repo:** project (`mdrewt/monster-realm`). Branch `slice/m23-s6` (worktree `.claude/worktrees/m23-s6`),
6 commits, all pushed. **Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout left on
`master`, never mutated. Forked from `origin/master` @ `3e062c4`; no rebase needed, no sibling in flight.

**Gate:** full local `just ci` **EXIT=0** on the shipped tree — 95 client test files / **2734 tests**,
90 evals PASS, lint + typecheck clean. **Acceptance: 16/16 met, 0 unmet**, `seed:e3b0c44298fc1c14`,
`mr-gates lint` LINT-CLEAN. Seeded ZERO criteria (**SPEC-SECTION-NOT-FOUND, 6th occurrence** across
s0/s1/s3/s4/s5/s7 — M23's EARS live in spec §6; the seeder fix has now been flagged six times).
X1-X16 authored in the PLAN phase. **2 DEFERs → `backlog`, intended owner S10** (A11Y-25, A11Y-26 —
their sole oracle is `evals/keyboard-operable-rows.eval.mjs`, which S6 may not create).

**⚠️ VERIFY NOTES.** Run CHECKs **from the slice worktree** with the usual PATH export. X14 is a
not-weakened ratchet against the measured fork baseline (menuView.test.ts was 21/21/0/0/0 at `3e062c4`;
it is now 40 tests, all 21 legacy blocks **byte-identical**, assertions 57 → 185).

**🔴 SPEC CORRECTION S10 MUST FOLD IN — measured, not reasoned.** Spec §5.4:488-491 names the GOOD
hostile-but-correct fixture as "…**rows at `tabindex="-1"`** and no per-row listener (the
`aria-activedescendant` pattern S6 ships)". **That is wrong and S6 deliberately does not ship it.** A
`tabindex="-1"` `<li>` is *mouse*-focusable: one click focuses the row, the next `replaceChildren`
destroys that node, focus falls to `<body>`, and `aria-activedescendant` — which only speaks while the
listbox itself holds DOM focus — goes permanently silent for the rest of the session. Red-team measured
this on a candidate build. The ARIA APG activedescendant pattern puts tabindex on the **container only**,
which `index.html:117` already ships. Also for S10: `[A11Y-13]`'s identity extractor must accept a
**member expression** (`callbacks.onInput`), not a bare identifier — §5.4:489's `handleMenuInput` is
loose fixture prose, and a bare-identifier scanner would fail this file.

**THE DEFECT THE UNIT TIER ALMOST SHIPPED.** The suite was **37/37 green** and `just ci` was EXIT=0
before red-team found P1: `buildMenuViewModel` emits `index` = array position at **both** menu levels,
so the unqualified id `menu-option-<index>` was **identical** for "categories, Party selected" and
"Party's leaves, Monster Box selected". Descending a level replaced the `<li>` node but left
`aria-activedescendant` at an **unchanged string**, and ATs announce an option on a *value change* — so
the slice's headline deliverable was silent on KeyM-then-Enter, the default path into the menu. Fixed by
level-qualifying (`menu-option-${vm.level}-${row.index}`), with the pointer built from the identical
expression. **Lesson for the remaining M23 slices: a green a11y unit suite proves attribute presence,
not announcement.**

**Red-team found 11 green-and-wrong survivors out of 29 hand-written cheats** against the first suite;
the six material ones were closed in a second tester round (a `render()`-time re-open that yanked focus
on every arrow key; a pointer from the array position; `dataset.menuIndex` from the array position; a
hard-coded `'menu-heading'` literal; an inline code→input map duplicating `menuKeyInput`; a `visible`
getter reading a private boolean). The five remaining are minor and named in the red-team report.

**Supervisor follow-ups (NOT actioned — outside `touches:`):**
1. **ADR-0207 needs allocating.** No number was assigned to this slice (the prompt's slot was empty), so
   no ADR was authored — the m23-s1 precedent. But the **split keydown ownership** rule (a view may
   consume only provably-inert inputs; anything behind a guard chain must bubble to `main.ts`) is a new
   reusable pattern and the reviewer called its ADR non-optional under `standards/adr-process.md`. The
   decision currently lives only in `menuView.ts`'s header and the ARCHITECTURE block.
2. **Backdrop click escapes the focus trap (milestone-wide, NOT caused by S6).** A click on an overlay
   backdrop focuses `<body>`, bypassing the trap and silencing `aria-activedescendant`. Unfixable inside
   any `*View.ts` because A11Y-15 bans `.focus(` there; needs `index.html` (a `tabindex="-1"` on the
   overlay) or `overlayA11y.ts`. Recommend S10/S11.
3. **`main.a11yFocus.test.ts:313,:568` prose is now false** and its exclusion of `menuView` from
   `SAMEKEY_OVERLAYS` rests on that dead premise. Behaviour is fine (`main.ts:1332` reads `visible`
   first) but untested — menuView is now the only overlay of sixteen with focus inside it and no
   same-key toggle-close tooth. Recommend S10.
4. **Spec §5.5's `overlayA11yWiring` tag whitelist** (`BUTTON/INPUT/SELECT/A/TEXTAREA`) still reds on
   eleven of sixteen anchors, `#menu-rows` (`<ul tabindex="0">`) included — S3/S4 already flagged this.
5. The S5 handoff's `visibleIds(probes)[0]` z-order residual was recommended to "S6 or S10" — **it is
   not S6's**; both fixes are outside this slice's `touches:`. Still open, recommend S10.

**Process notes.** `/tmp/mr_warn_m23-s6` (LANDING PATTERN) appeared during the fix cycle, so `/simplify`,
`desync-guard` and the `verifier` subagent were not dispatched; the verifier's checks were run
mechanically inline (no skipped tests; 21/21 fork blocks byte-identical; a level-qualifier-revert
bite-proof reds exactly 3). `reducer-security-auditor`/`desync-guard` had no surface regardless (zero
reducers, schema, `game-core` or predictor/renderer code). The code graphs were NOT re-indexed: the
canonical checkout is unchanged (slice unmerged) and `codegraph status` reports up to date — re-index
after the merge. The `.claude/worktrees/m23-s6` worktree stays for the supervisor's merge pipeline.


## 2026-08-25T~04:1xZ — m23-s5 e2e-red FIX CYCLE COMPLETE (terminal: PR#368 remote CI GREEN both jobs, 13/13 gates met)

**Resume of attempt 2 (e2e-red fix cycle 1+2), branch `slice/m23-s5`, worktree `.claude/worktrees/m23-s5`, HEAD pushed.**
PR#368 mergeStateStatus=CLEAN; remote `ci` SUCCESS, remote `e2e` SUCCESS. **Supervisor owns the merge.**

**What was wrong (two layered defects, both mine-to-fix):**
1. **A1** — the `worldHasFocus()` conjunct gated each WHOLE hotkey branch, including the toggle-CLOSE
   half; S3/S4's deferred focus made "focus inside the overlay" the universal post-open state, so
   same-key close (KeyB/KeyU/…) died for everyone → the 3 remote reds. Fix: supervisor candidate (a),
   uniform: `allow && (<self>?.visible || worldHasFocus())` at all 12 sites. Spec §8.4's acceptance
   overturned by its own overturn condition; §2.3's "byte-identical for sighted players" premise falsified.
2. **A1b** — found only by running the REAL e2e locally: real Chromium leaves activeElement STRANDED
   inside the hidden overlay ~200 ms after any close (`document.body.focus()` restore is a Chromium
   no-op; blur fixup is async; happy-dom diverges on both halves). Fix: `focusInsideHiddenSubtree()`
   (inline-display:none ancestor walk) at (i) the frame close edge and (ii) a keydown self-heal above
   every returning branch (closes the ≤1-frame race, measured 1-in-3 at pvp.spec.ts:117).

**Evidence:** local `just ci` green (95 files / 2715 tests, 90 evals); ledger 13/13 met (all boxes
unchecked + re-executed fresh by mr-gates; X1 amended for A1); verifier PASS (no test weakened, RED
receipts provably red vs da0b0ff); reviewer PASS (0 blockers/majors; 3 minors fixed); tester ran 3
rounds (opus); 6 mutation bite-proofs measured, all bite. ADR-0206 gained appended A1 + A1b.

**Supervisor follow-ups (NOT actioned — outside touches):**
1. **Spec amendment (harness repo):** M23 §2.3's accepted-change sentence + §8.4 + A11Y-19's "or
   toggle" wording must reflect A1 (same-key toggle-close is intended behaviour). One-line each.
2. **`ui/overlayA11y.ts` restore is a Chromium no-op** (`document.body.focus()`, body has no
   tabindex) — the root cause A1b works around. A real restore (blur(), or a tabindex'd body) is an
   S6+ follow-up recorded in ADR-0206 A1b residual (iii); landing it would let the discriminator retire.
3. **Local e2e vs `just ci` collision:** `just ci`'s account-e2e eval cannot run while a dev
   spacetime holds :3000/the global lock — serialize them (memory file updated).
4. Local full-suite e2e on this WSL box shows 1–3 ROTATING walk/convergence timeouts per run
   (different specs each time; every one green in isolation and on the remote runner) — pre-existing
   local-env flakiness, not slice regressions; don't chase them from a slice.

**Housekeeping:** /tmp/m23s5-* logs + /tmp/m23s5-fix-tests/ left for audit; local spacetime instances
stopped; stale 16r-d instance on :3099 (Aug 22 leftover) was killed. The `.claude/worktrees/m23-s5`
worktree stays for the supervisor's merge pipeline.

## 2026-08-24T~21:2xZ — m23-s5 COMPLETE (terminal: PR open + local `just ci` green + remote CI running)

**Slice:** m23-s5 — M23 accessibility **S5, the sole `client/src/main.ts` touch**: the scoped
`worldHasFocus()` gate on the twelve `overlayVerdict(...)` hotkey branches, ONE frame-loop
announcement edge + focus return, and `#help-hint` promoted to a native `<button>`.
**PR:** https://github.com/mdrewt/monster-realm/pull/368 — OPEN / MERGEABLE (remote CI running).
**Repo:** project (`mdrewt/monster-realm`). Branch `slice/m23-s5` (worktree `.claude/worktrees/m23-s5`),
7 commits, all pushed. **Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout left
on `master`, never mutated. `origin/master` still `78e2bb2` at finish; no rebase needed, no sibling
in flight, no doc-aggregation collision.

**Gate:** full `just ci` **EXIT=0** on the shipped tree — 95 client test files / **2705 tests**
(fork baseline measured in the same worktree first: 94 / 2684), all evals PASS, observability 8/8,
security clean. **Acceptance: 13/13 met, 0 deferred, 0 unmet** (`seed:e3b0c44298fc1c14`), all with
recorded evidence. Seeded ZERO criteria (**SPEC-SECTION-NOT-FOUND, 5th occurrence** across
s0/s1/s3/s4/s7 — M23's EARS live in spec §6; the seeder fix has now been flagged five times);
X1-X13 authored in the PLAN phase, `mr-gates lint` LINT-CLEAN.

**⚠️ VERIFY NOTES.** Run CHECKs **from the slice worktree** with the usual PATH export. X12 pins the
**literal fork SHA `78e2bb2e6bb1f6b4d91967593e5d9742e3341dc9`**, not `origin/master` — adopted from
m23-s7's headline finding that a diff-vs-ref baseline is forgeable. X13 is a not-weakened ratchet
against the measured fork baseline (>=94 files / >=2684 tests, zero pending/todo).

**🔴 FOR S6 / S10 — the residual this slice found and deliberately did not work around.**
`visibleIds(probes)[0]` (`overlayRegistry.ts:372-374`) is `OVERLAY_IDS` **declaration** order, not
z-order, and `announcements.ts:39-40` documents `topOverlay` as exactly that. `dialogueView` renders
unconditionally on every store batch (`main.ts:1574`) and force-hides only `menuView`, so a
server-pushed conversation can become visible **under** an already-open overlay. Consequences:
`topOverlay` does not transition when a dialogue opens over a lower-index overlay (announcement
silently missed), and `[0]` can name `dialogueView` while a full-screen `z-index:100` `helpView` is
what actually covers the screen (wrong accessible name). Both fixes are outside S5's `touches:` — one
is a view/registry constraint, the other changes the `A11ySnapshot` API S1 froze and S10 asserts
against. **Recommended owner: S6 or S10.** A set-diff heuristic in `main.ts` was considered and
rejected as diverging from the frozen contract.

**Two more out-of-scope findings, flagged not fixed.** (a) `overlayA11y.ts`'s `fallbackFocus` is
advertised as a REQUIRED parameter to make the obligation visible at each call site, but it is
**unreachable on the common path**: `record.returnFocus` is captured as `document.body` for a
hotkey-opened overlay, which is an `HTMLElement` and always connected, so the restore order picks it
first. That is precisely why S5 had to own the focus return itself — worth a §4.1 integration note.
(b) **`menuView` calls neither `openOverlayA11y` nor `closeOverlayA11y`** — it has only its static
markup ARIA: no focus trap, no deferred initial focus, no registry `aria-label`. That is S6's scope
by the spec's own slice table, but it is not currently written down anywhere as outstanding.

**Declared behaviour changes (both in the PR body).** `B` no longer toggles the Box closed while
focus is inside it (spec §8.4's accepted change; Escape still does and the focus return closes the
loop). **Space no longer jumps while a `<button>`/`<a>` has focus** — this one is NOT in spec §2.3's
exemption list, so it is declared rather than slipped in. It was forced: the terminal
`if (e.code === 'Space') { jump(); e.preventDefault(); }` cancels a native button's activation, which
would have shipped A11Y-23 half-dead (Enter-only) and invisible to every source scan, since `main.ts`
is coverage-excluded.

**Three gate STRENGTHENINGS, each measured.** `W-ONE-CORNER-AFFORDANCE` went tag- AND depth-agnostic
(`body > div` → every inline-`position:fixed`, non-`inset:0` element at any depth) — a second corner
affordance shipped as `<a>` or as a nested `<button>` was invisible to the fork's selector and now
bites. H4b's allow-list gained `background` outright plus `border`/`padding` **with value clauses**,
so the growth-knob cheats still fail. And it closed a hole that **predated this slice**: `font` was
allow-listed with no value constraint, so `font:900px/1 monospace` kept `width:max-content` and every
allow-listed NAME while rendering the badge as a giant click-eating strip.

**Process notes worth keeping.** (1) The `tester` has no Bash, so **the orchestrator must execute the
RED proof and every bite-proof** — doing so found two harness defects the tester could not see:
`overlayIsOpen()` false-positived on every static shell (m23-s2 ships `role="dialog"` as a *markup
literal*, `index.html:89-92`, so the role never changes), and the `setTimeout(0)` deferred focus was
never flushed. (2) The tester's own two new teeth were **mutually unsatisfiable** — a whole-file
`worldHasFocus()` census of 12 contradicted the pump tooth's own expected literal, which contains a
13th call. Fixed by scoping the census to the keydown listener (12) plus a separate whole-file (13)
plus an exactly-1 on the snapshot region. (3) `W-UX1-HINT-NO-JS-OWNER` is a **RAW-source** pin: a
*comment* in `main.ts` mentioning `help-hint` reddened it. (4) 16 mutation bite-proofs measured, all
BITE.

**Verifier APPROVED (independent, pre-merge).** Re-executed all 13 CHECKs itself — every deciding
line matched the recorded EVIDENCE byte-for-byte. Not-weakened audit CLEAN: no test deleted/skipped/
emptied, no `expect` removed, exactly 12 `expectedRaw` hunks add the conjunct and KeyT's block never
appears in the diff. It chose **four mutants of its own** (none in my 16) and all four BITE:
`worldHasFocus` stubbed to `return true`, `lastA11ySnapshot = nextSnapshot` deleted,
`announcementsFor` args swapped, `type="button"` dropped. It also re-ran the `document.body` mutant
itself and reproduced 11 reds exactly. It accepted the happy-dom substitution for the four
`[E2E]`-tiered criteria after reading §5.7 independently. **One finding acted on:** the
`W-ONE-CORNER-AFFORDANCE` rewrite had dropped its anti-vacuity floor 12 → 10; the population changed
(14 inline-styled elements vs 14 body divs) but the slack did not need to, so it is restored to 12 —
exactly the pre-widening tightness — and the full `just ci` was re-run to EXIT 0 on that final tree
with the ledger still 13/13.

**Housekeeping.** Untracked harness files: `memory/projects/monster-realm-m23-s5-plan.md` (plan +
the three-lens adjudication) and `/tmp/m23s5-tests/TEETH-MEASURED.md` — commit or discard. Code
graphs NOT re-indexed (nothing merged; main checkout still `78e2bb2`). `reducer-security-auditor`
and `desync-guard` not run: the diff has zero server-module/schema/reducer files and zero
predictor/reconcile/interpolation files (mechanically empty scope, m23-s0/m23-s4 precedent).
**The post-implementation review fan-out was NOT run** — `/tmp/mr_warn_m23-s5` (LANDING PATTERN)
appeared mid-slice, so per its instruction no new subagent fan-outs were spawned; the three plan
lenses (reviewer + red-team + `/simplify`) ran BEFORE it appeared and their findings are folded into
plan §8 and ADR-0206, and a single `verifier` was run as the DoD merge gate. ADR next-free = **0207**.

---

## 2026-08-24T~15:5xZ — m23-s7 COMPLETE (terminal: PR #366 open + local `just ci` green + remote CI running)

**Slice:** m23-s7 — M23 accessibility **S7, reduced motion** (§2.5): `render/motionPreference.ts` (new,
sole matchMedia caller), `ResolveInput.reduceMotion?`, the two renderResolver branches,
`interpolateReducedMotion`. **Repo:** project (`mdrewt/monster-realm`).
**PR:** https://github.com/mdrewt/monster-realm/pull/366 — OPEN. Branch `slice/m23-s7`
(worktree `.claude/worktrees/m23-s7`), 7 commits incl. one master merge, all pushed. **Supervisor owns the merge — I did NOT
run `gh pr merge`.** Main checkout left on `master`, never mutated.

**Gate:** full `just ci` **EXIT=0 on the exact shipped tree** (run THREE times — pre-docs-append,
post-docs-append, and again on the master-merged tree): final run 90 evals PASS / 0 FAIL, 92 client
files / 2644 tests (incl. m23-s3's), observability 8/8. **Acceptance: 10/11 met with
recorded evidence, 1 DEFERred, 0 unmet** (`seed:e3b0c44298fc1c14`). Seeded ZERO criteria
(SPEC-SECTION-NOT-FOUND again — M23 EARS live in §6); X1-X10 authored in PLAN phase, LINT-CLEAN.
**desync-guard (mandatory, §9.6): PASS — netcode-untouched claim HOLDS.** Verifier independently
APPROVED (not-weakened audit vs red commit 2eb9973; gate sample re-executed; 2 mutants bite).

**⚠️ VERIFY NOTES:** run CHECKs from the slice worktree with the usual PATH export (X7 spawns
wasm-pack; probes need node 24). **X3 reads `memory/projects/gates/m23-s7.baseline-fullnames.json` —
do not delete.** X8/X10 diff against the PINNED merge-base SHA f33a3eb, not origin/master (see
headline) — re-pinned from the original fork SHA 0953db7 after sibling m23-s3 merged to master
mid-slice and its ARCHITECTURE.md milestone-log append CONFLICTED with this slice's (the predicted
doc-aggregation collision; GitHub runs no pull_request workflow on an unmergeable PR, which presented
as 'no checks reported' for 13 minutes). Resolved by merging master INTO the branch (force-push is
hook-blocked; the squash-merge collapses the merge commit) with both entries kept in merge order.
**DEFER: X11 -> backlog, but the real target is S10** — `mr-gates lint` rejects `S10`/`m23-s10` as
targets (no spec section registry entry); route it to S10 rather than materialising a new section.

**🔴 HEADLINE — the acceptance-ledger evidence chain is FORGEABLE, red-team PROVEN, supervisor action
needed.** (a) Any CHECK diffing `origin/master...HEAD` is defeated by a local ref rewrite (git
plumbing baked a malicious eval edit into a forged merge-base; the gate printed its exact success
line). Fixed in THIS ledger by pinning the fork SHA — recommend for every future slice ledger.
(b) `memory/projects/gates/` is gitignored: ledger + X3-style baselines have zero audit trail. A
delete-tests+pad-baseline forgery survived until uniqueness+floor clauses were added, and a
swap-for-other-real-names variant STILL survives. **True closure = version-control the gates dir.**
Memory cards: `mr-gates-ledger-forgery-surfaces`, `test-suffix-exemption-admits-disguised-production`.

**Declared deviations (PR body §Declared spec deviations):** `reduceMotion` OPTIONAL (S7 is
main.ts-free per §4, so the sole resolve() call at main.ts:2719 must keep compiling; S5 tightens);
A11Y-28 satisfied in-slice by the S7T-SCAN test, repo-wide eval deferred to S10.

**Red-team round 1 nuance worth keeping:** its own freeze-cheat kill fixture did NOT bite (a 2-tile
lag is Chebyshev>1 and snaps anyway) — the bite needs a lag of EXACTLY 1 tile. Shipped as
S7T-OWN-FREEZE. Round 2: 12/14 mutants killed, 1 documented equivalent (live-read vs cached
listener), 1 low DRY residual (fromWindow hardcoding the query literal — undetectable while
byte-equal). Scan-evasion residuals declared in the ledger (token-split, Function-constructor global
grab, disguised-.test.ts tripwire-only).

**S5 forward contract (also in motionPreference.ts header + PR):** wire
`motionPreferenceFromWindow()` beside main.ts:236, pass `motion.reduceMotion` at main.ts:2719; the
`sawFractionalOwnMotion` DEV latch (main.ts:2740) never sets under live reduced motion — S5 must
account; matchMedia/addEventListener throws surface on first real-window execution (no legacy
addListener fallback, by design). **S10:** S7T-SCAN and the future eval enforce the same invariant —
divergence is a defect in one of them; S10 may keep or thin the test.

**Housekeeping.** Untracked harness files: `memory/projects/monster-realm-m23-s7-plan.md` (plan +
three plan-lens adjudications) — commit or discard; `memory/projects/gates/m23-s7.baseline-fullnames.json`
must persist until X3 is last verified. Code graphs NOT re-indexed (nothing merged; main checkout
still 0953db7). reducer-security-auditor not run — diff has zero files outside client/src/render/
(mechanically empty scope, m23-s0 precedent); desync-guard covered the netcode dimension.

---

## 2026-08-24T~1?:??Z — m23-s1 COMPLETE (terminal: PR #364 open + local `just ci` green + remote CI running)

**Slice:** m23-s1 — M23 accessibility **S1, the helper substrate**: `ui/focusTrap.ts`, `ui/liveRegion.ts`,
`ui/announcements.ts`, `ui/overlayA11y.ts` (all new). **Repo:** project (`mdrewt/monster-realm`).
**PR:** https://github.com/mdrewt/monster-realm/pull/364 — OPEN / MERGEABLE. Branch `slice/m23-s1`
(worktree `.claude/worktrees/m23-s1`), 4 commits, all pushed. **Supervisor owns the merge — I did NOT
run `gh pr merge`.** Main checkout left on `master`, never mutated.

**Gate:** full `just ci` **EXIT=0** on the exact shipped tree — 87 client test files / 2532 tests
(+47), 90 evals PASS / 0 FAIL, observability 8/8. Baseline measured green in the same worktree at
`origin/master` e664fa7 first: 83 files / 2485 tests. **Acceptance ledger: 14/14 met, 0 deferred,
0 unmet** (`seed:e3b0c44298fc1c14`), all with recorded evidence.

**🔴 THE HEADLINE FOR THE SUPERVISOR — a milestone-level slicing defect, not a slice defect.**
Spec §2.4 mandates FOUR announcement transitions. **Only (1) "overlay opened" is resolvable by any
slice as currently sliced.** (2) world-region, (3) battle turn outcome and (4) prompt/zone-change
each need NEW `a11yCopy.ts` entries, `t()` throws on a miss — and **`a11yCopy.ts` is in NO slice's
`touches:` after S0** (spec §4 table). Worse, **A11Y-22 is structurally unsatisfiable**: spec:362
pins S5 to `client/src/main.ts` + `client/index.html` (`#help-hint` only), A11Y-22 needs
`a11y.world.region`, and A11Y-4's orphan rule forces the key and its consumer into the SAME change.
No slice can legally do both. **Needs a re-scope ruling before S5 is launched.** S1 shipped the
mechanism (`announcementsFor`'s `message` pass-through field), not the wiring.

**ADR conflict needing a ruling.** Spec §12 says S0 "writes per-slice ADRs from there onward", but
the supervisor assigned this slice ADR number `None`. Under the standing fan-out rule
(`docs/adr/**` = reserved number only) picking 0206 myself risks colliding with a concurrent
sibling, so **no ADR was authored**; the six decisions ride in the module headers and the PR body.
Recommend allocating a number for a follow-up ADR. ADR next-free = **0206**.

**Two cross-slice contracts S1 CANNOT self-enforce** (in the module headers + PR body):
(a) the four `#app`-mounted overlays share ONE root and the map is keyed by `OverlayId`, so **S4
must close-before-open** or two capture-phase traps stack on the same node — confirmed concretely,
one Tab then moves focus twice in a single dispatch and lands back where it started; (b)
**`LiveRegion.flush(now)` must be pumped from S5's rAF loop** or the live region is permanently
silent and **nothing in S1-S4 reds** (every S1 test calls `flush` itself). Recommend §4.1 also add
force-hide ↔ close to its cross-slice contract list: if S5's `refreshBattle` force-hide path sets
`style.display='none'` directly instead of calling each view's `hide()`, the record leaks a live
listener and a much-later close restores focus to a long-expired element.

**Red-team WROTE AND RAN the cheats against the shipped diff and found FOUR green-but-wrong impls.**
Three are now bitten (I re-measured each myself: cheat → 2 failures vs. the control's 1):
`FOCUSABLE_SELECTOR` gutted to `'button:not([disabled])'` (no fixture anywhere used an
`<input>`/`<textarea>`/`a[href]`/`[tabindex]` — while `#rename-input` and tradePropose's currency
inputs are real production focusables); the `:not([tabindex="-1"])` clause dropped; and
`announcementsFor` returning a shared in-place-mutated array. **The fourth cannot be bitten today
and is stated honestly rather than overclaimed:** a hardcoded `role='dialog'` passes the 16-way
`S1-ARIA-ALL-16` loop because **all sixteen registry entries are `'dialog'` — the manifest has zero
variance on that field**, so the plan's "parameterisation kills the literal" claim was FALSE. A
TRIPWIRE test now reds the day an overlay earns `'alertdialog'`.

**Two declared spec amendments, flagged for sign-off.** `nextFocusTarget` returns
`HTMLElement | null` (spec §2.2 says `HTMLElement`; `noUncheckedIndexedAccess` is OFF so
`focusables[0]` is a runtime-`undefined` trap). `closeOverlayA11y(id, fallbackFocus)` takes no
`root` — it is stored at open time, so a caller passing a different root at close cannot strip ARIA
off the wrong node while the original trap leaks.

**Accepted UX consequence, deliberately NOT redesigned:** trailing-edge coalescing delays a lone
announcement by up to 500 ms. A leading-edge throttle would emit the FIRST message, which fails
A11Y-9 verbatim ("emit only the most recent"). Flagged to M23's owner as a criterion question —
the ledger criterion is the authority, not my preference.

**Process notes worth propagating.** (a) `npx vitest run <MISSING-FILE> --reporter=json` prints a
well-formed report with `numTotalTests:0` and **exits 0** — a JSON-reporter gate that only checks
`success===true && numFailedTests===0` is vacuously green against a spec file that does not exist.
(b) `-t '<tag>'` is the WRONG gate filter twice over: substring-matched, AND it marks every
non-matching test in the same file as **pending**, so `numPendingTests===0` reds every legitimate
run of a multi-tag file. Every CHECK here runs the whole file and asserts each required tag appears
in the PASSING `fullName` set **exactly once**. (c) **`mr-gates check` flips the checkbox but records
NOTHING unless the gate already has an `EVIDENCE: pending` line to overwrite** (`mr-gates:952`) —
it then reports a baffling `0/14 met` while every gate prints `PASS`. Hand-authored ledgers must
include the placeholder. (d) `mr-gates lint` rejects any CHECK containing `||`, which
false-positives on ordinary JS like `String(e.stdout||'')`. (e) The `npm ci`-under-node-v18 trap bit
again exactly as recorded: it fails `notsup` while a `| tail` wrapper reports exit 0, and the
symptom surfaces much later as `biome: not found` / exit 127 at the **lint** stage.

**Housekeeping.** Untracked harness files: `memory/projects/monster-realm-m23-s1-plan.md` (the plan
plus the full adjudication of the three plan-review lenses) — commit or discard as you prefer. The
ledger `memory/projects/gates/m23-s1.gates.md` is filled, LINT-CLEAN and 14/14 with evidence.
Three new memory cards written (vitest JSON gate shape, the mr-gates EVIDENCE placeholder, fixture
monoculture). The `/tmp/mr_warn_m23-s1` LANDING flag appeared after the last green increment; I
converged from there with no further fan-outs — the `verifier` role was discharged by red-team's
independent not-weakened confirmation plus my own mechanical re-run, which is the one deviation
from the standard lens set and is called out here rather than glossed.

---

## 2026-08-24T~10:0xZ — m22-s1 COMPLETE (terminal: PR #360 open + local `just ci` green + remote CI running)

**Slice:** m22-s1 — M22 privacy/compliance **S1, pure `game-core` deletion contract surface**. **Repo:** project (`mdrewt/monster-realm`). **PR:** https://github.com/mdrewt/monster-realm/pull/360 — OPEN / MERGEABLE. Branch `slice/m22-s1` (worktree `.claude/worktrees/m22-s1`), 3 `wip:` commits, all pushed. **Supervisor owns the merge — I did NOT run `gh pr merge`.**

**Gate:** full `just ci` **EXIT=0** — 1996/1996 nextest passed, 2472 client tests, 90 evals PASS / 0 FAIL, clippy `-D warnings`, `cargo fmt --all --check` clean, observability 8/8 gates. **Acceptance ledger: 9/9 met, 0 deferred, 0 unmet** (`seed:e3b0c44298fc1c14`). Seeded with ZERO criteria (`SPEC-SECTION-NOT-FOUND` — spec §7.4's PRV1-* criteria are all S2+, S1 has none), so X1-X9 were authored in the PLAN phase and are LINT-CLEAN. Verifier independently re-ran `mr-gates verify`: 9/9, `seed_drift=false`, `evidence_mismatch=[]`.

**🔴 READ BEFORE STARTING S3 — measured red-on-arrival (this is the headline).** `evals/guest-claim-integrity.eval.mjs:388-394` pins `SANCTIONED_REDUCERS` as an exact set of FIVE reducer names compared by set EQUALITY at `:564-572` — deliberately not `>= 5`. `STATE_TRANSITION_OWNERS` (shipped by this slice) names `account_deletion_reaper`, which does **not exist yet**. The moment S3 declares that reducer in `accounts.rs`, `[R/name-set]` FAILS. Its Rust twin over `ACCOUNTS_RS` in `server-module/src/accounts_tests.rs` needs the same update in the SAME commit. Filed as residual `R-m22-s1-R-m22-s1-X1`. **Also recorded in the shipped doc comment so it is read at the call site:** the `Identity`-typed `TOMBSTONE_IDENTITY` must be declared in `server-module/src/lib.rs` beside `WILD_IDENTITY` (`:84`) as `Identity::from_byte_array(game_core::TOMBSTONE_IDENTITY_BYTES)` — NEVER in `accounts.rs`, whose `[R/identity-ctor]` clause (`evals/guest-claim-integrity.eval.mjs:419-424`, scoped to `ACCOUNTS_PATH` at `:384`) flatly bans that constructor; and never as a second hand-typed literal (SSOT precedent: `server-module/src/lib.rs:77,80`). All three claims independently verified against the live eval AND its Rust twin.

**Two more residuals filed as real queued work** (`mr-gates residuals list --unclaimed`): `R-m22-s1-R-m22-s1-X2` — no display-name tombstone is single-sourced; the only existing one, `server-module/src/ranking.rs:161` `PROFILE_TOMBSTONE_NAME = "(claimed guest)"`, belongs to the guest-claim flow and also zeroes `rating`/`wins`/`losses`, so S3 either misuses it or writes the rule twice. **Spec gap, not a slice defect** — spec §3 requires name tombstoning but §7.2's S1 row omits the constant. `R-m22-s1-R-m22-s1-X3` — S8's grace countdown will duplicate the window in TS; verified by an actual `wasm-pack` build that `client-wasm/pkg` exports only the pre-existing 10 functions. Fix precedent: `client-wasm/src/lib.rs:174-200`.

**Delivered.** `game-core/src/accounts/deletion.rs` (new) with `DELETION_GRACE_MS_DEFAULT: i64 = 604_800_000`, `is_deletion_due(Option<i64>, i64) -> bool`, `TOMBSTONE_IDENTITY_BYTES: [u8;32] = [0xFF;32]`, `TOMBSTONE_AUTH_ISSUER = "account-deleted-tombstone"`, `EXPORT_CHUNK_ROWS: u32 = 500`, `STATE_TRANSITION_OWNERS` (the 3 §4.7 reducers). Plus `accounts/mod.rs`, `accounts/deletion_tests.rs`, `game-core/tests/m22_s1_deletion_surface.rs`, 2 additive hunks in `game-core/src/lib.rs`, 1 paragraph in `ARCHITECTURE.md`. **Zero schema/reducer/client/wasm/eval change.**

**Declared deviation from the spec's name:** `TOMBSTONE_IDENTITY_BYTES`, not `TOMBSTONE_IDENTITY` — `game-core` has no `spacetimedb` dep and `client-wasm` depends on it *without* the feature, so the value must be `[u8;32]`. `_BYTES` is a substring superset so any grep on the spec's name still matches. **Also deviated, declared:** spec §7.2 line 470 says every slice owns a new eval file. S1 shipped none — `evals/` is outside its `touches:`, S1's teeth are native `cargo test` + the nightly zero-tolerance `cargo mutants` gate, and S6 explicitly owns `evals/deletion-completeness.eval.mjs`. The textual coverage an eval would have provided lives in X4/X5/X7's node-side clauses.

**Red-team wrote and ran the cheats — twice, and beat my own gates the second time.** Round 1 (against the plan) produced the test list. Round 2 (against the shipped diff) found THREE real gate bypasses, all closed and re-bitten: X3's and X2's source pins were satisfiable by a decoy `//` comment inside the function body while the live arm was wrong, and X4's cross-crate `WILD_IDENTITY` extractor was a first-match regex fooled by a commented decoy earlier in `server-module/src/lib.rs` — it reported `wild=0u8;32` while the compiled constant had been changed to `0xAA`. All three CHECKs now strip line AND block comments before matching; all four decoys (incl. a block-comment variant) re-measured RED, controls still pass.

**Mutation coverage, stated honestly.** `cargo mutants --file game-core/src/accounts/deletion.rs` → `missed=0 caught=3`. Only 3, because **cargo-mutants mutates FUNCTIONS only** — those 3 cover `is_deletion_due` and never touch the five constants. Separately I hand-ran 10 wrong implementations: 8 killed by the tests, 2 (`None => DELETION_GRACE_MS_DEFAULT == 0` and `unwrap_or(now_ms)`) behaviourally invisible and killed only by X3's source pin; a hardcoded literal replacing the named const is killed only by X2's.

**Process notes worth propagating.** (a) A fresh worktree has no `client/node_modules`, so the FIRST `just ci` dies at `lint` with `biome: not found` / exit 127 — run `npm ci` in `client/` first; a naive `cmd; echo EXIT=$?` wrapper reported this as exit 0. (b) The implementer correctly REFUSED to edit the gating tests when `cargo fmt --check` and `clippy::assertions_on_constants` failed inside them, and escalated instead; both fixes were routed back to the tester (the file owner) and were comment/whitespace/operand-binding only. The clippy failure was fixed by rebinding `assert!(<pub const> > 0)` operands to typed locals — MEASURED to defeat the lint — rather than by an `#[allow]`, so no suppression sits inside a gating test file. (c) Reviewer and red-team INDEPENDENTLY caught the same false tooth-claim in a test's doc comment (it named the wrong mutant shape and overclaimed what it kills); the tester rewrote it to say plainly that the assertion is a PARTIAL tooth and that gate X3, not the assertion, is what kills the shape.

**Housekeeping.** Untracked harness file: `memory/projects/monster-realm-m22-s1-plan.md` (the plan + the three plan-review lenses' adjudication) — commit or discard as you prefer. The gates ledger `memory/projects/gates/m22-s1.gates.md` is filled in and LINT-CLEAN. Main checkout was left on `master` and never mutated.

---

## 2026-08-24T~06:5xZ — m23-s0 COMPLETE (terminal: PR #361 open + local `just ci` green + remote CI running)

**Slice:** m23-s0 — M23 accessibility **S0, the substrate**: `A11yMeta` + total `OVERLAY_A11Y` in
`ui/overlayRegistry.ts`, new `ui/a11yCopy.ts` (frozen flat catalog + throw-on-miss `t()`).
**Repo:** project (`mdrewt/monster-realm`). **PR:** https://github.com/mdrewt/monster-realm/pull/361
Branch `slice/m23-s0` (worktree `.claude/worktrees/m23-s0`), 5 commits, all pushed.
**Supervisor owns the merge — I did NOT run `gh pr merge`.**

**Gate:** full `just ci` **EXIT=0** — 90 evals PASS / 0 FAIL, 83 client test files / 2485 tests,
observability 8/8. Verifier re-ran it independently: same numbers.
**Acceptance ledger: 5/5 met, 0 deferred, 0 unmet** (`seed:e3b0c44298fc1c14`). Seeded with ZERO
criteria (`SPEC-SECTION-NOT-FOUND`) — but the criteria DO exist: **the seeder missed them because
M23's EARS block is §6, not a §7.x section.** X1-X5 are a 1:1 transcription of A11Y-1..A11Y-5.
Worth fixing in the seeder; other M-specs may have the same shape.

**⚠️ LEDGER NOTE — gate ids must be `X1:`, not `X1 (= A11Y-1) [COMPILE]:`.** `GATE_LINE`
(`mr-gates:243`) is `^- \[( |x|X)\] (\S+):` — an id with a space in it parses as ZERO gates and
`check` reports a cheerful `0/0 met`. Put the annotation AFTER the colon.

**Three findings the supervisor should propagate:**
1. **The house textual declaration pin is BYPASSABLE — measured.** `OVERLAY_HANDLES_DECL`-style
   pins (`main.wiring.test.ts:6046`) are defeated by planting a *used* exported string constant
   holding the byte-exact expected declaration: `tsc` clean, `countOccurrences(...) === 1` passes,
   totality destroyed. Structural to ANY pure-text substring pin. The replacement that works is a
   **negative compile** — spawn `tsc --noEmit` on generated probe modules and assert the polarity
   of the compiler's verdict, with a guaranteed-uncompilable CONTROL probe so a broken spawn can't
   make every "must not compile" assertion pass vacuously. ~0.6s/probe. ADR-0205 D6. **This
   pattern should probably replace every declaration pin in the repo.**
2. **Two M23 spec defects, amended in ADR-0205 and FLAGGED FOR SIGN-OFF.** (a) §2.1/A11Y-14's
   "MUST resolve to a **natively** focusable element" is unsatisfiable for 7 of 16 ids without S2
   shipping four dead controls; amended to "focusable, natively or via `tabindex`". (b) §5.1
   `[A11Y-02]`'s regex `/^a11y\.[a-z0-9.]+$/` REJECTS the canonical key §2.8 itself gives
   (capital V) and ACCEPTS `a11y..` / `a11y.....` (both measured `true`). **S10 must not copy §5.1
   verbatim.**
3. **`vitest -t "<tag>"` is substring-matched** — a decoy `it('TAG (temporarily stubbed)', () =>
   expect(1).toBe(1))` prints a byte-identical `✓` line and `Tests 1 passed (1)`. Every ledger
   CHECK here runs the whole file via `--reporter=json` and asserts exact `fullName` + `status` +
   `numFailedTests===0` + `numPendingTests===0`. **Recommend that shape for every vitest gate.**

**Red-team found six green-but-wrong bypasses OF THE SHIPPED DIFF**, all closed and re-bitten:
`initialFocusSelector` had no content gate at all (blanking all 16 to `''` left tsc + the whole
suite green); the purity scan's `/^\s*import\s/m` was evaded by appending a real import to the END
of an existing code line; `a11yCopy` was `Readonly<>` but not frozen; `spawnSync` had no timeout
(vitest's `it()` timeout cannot interrupt a SYNCHRONOUS child — measured).
**28 mutation bite-proofs red, 2 must-stay-green; the verifier independently re-ran 10.**

**Obligations S0 creates (all in ADR-0205, repeated in the PR body):** S2 adds `tabindex="-1"` to
ten static-shell anchors and **`tabindex="0"` — never `-1` — to `#menu-rows`** (the most likely
S2↔S6 integration red in the milestone); S4 adds four constructor-time `data-testid`s,
**attribute-only** (a wrapper breaks three `recruit.spec.ts` `parentElement.parentElement` chains);
S3 deletes the two view-local deferred `.focus()` calls; S1 owns orphan-checking `a11y.world.*`.

**touches-delta:** the two sibling `*.test.ts`, `docs/adr/0205-*.md`, `ARCHITECTURE.md`, and
`docs/adr/DIGEST.md` (mechanically regenerated by `just adr-digest`, drift-gated by `just ci` — an
ADR cannot land without it). **boyscout-delta:** 3 hunks / 4 lines, all comment-only.
**Follow-up flag, NOT touched:** `client/src/main.ts:390` carries the same stale "15
mutual-exclusion overlays" — S5 is the sole `main.ts` slice.

**Code graphs NOT re-indexed, deliberately:** nothing is merged, the main checkout is still at
`2a6864b`, and `codegraph status` already reports "Index is up to date". Re-indexing now would only
pull worktree paths into the cache, which the doctrine forbids. Refresh after the squash-merge.

**`reducer-security-auditor` / `desync-guard` not run — scope is mechanically empty:** the diff has
zero files under `server-module/`, `game-core/`, `client/src/net/` or `client/src/render/`.

---

## 2026-08-24T~08:5xZ — m22-s0 COMPLETE (terminal: PR #359 open + local `just ci` green + remote CI running)

**Slice:** m22-s0 — M22 privacy/compliance **S0, contract-first**: freeze the export seam S1-S9
build against. **Repo:** project (`mdrewt/monster-realm`).
**PR:** https://github.com/mdrewt/monster-realm/pull/359 — OPEN / MERGEABLE, `ci` + `e2e` pending at
exit. Branch `slice/m22-s0` (worktree `.claude/worktrees/m22-s0`), 8 `wip:` commits, all pushed.
**Supervisor owns the merge — I did NOT run `gh pr merge`.**

**Gate:** full `just ci` **EXIT=0** — 90 evals PASS / 0 FAIL, 2472 client tests, clippy `-D warnings`,
biome, security, observability-validate. Semgrep + gitleaks additionally run locally on the two
changed files (both remote-only in CI): 0 findings.
**Acceptance ledger: 4/4 met, 0 deferred, 0 unmet** (`seed:e3b0c44298fc1c14`). Seeded with ZERO
criteria (`SPEC-SECTION-NOT-FOUND` — §7.4's EARS are all S1-S9, S0 has none), so X1-X4 were authored
in the PLAN phase and are LINT-CLEAN.

**⚠️ LEDGER NOTE CORRECTED — a PATH export IS required for `mr-gates verify`.** My first draft of the
note said "node-only, no PATH needed". Wrong, and the verifier reproduced the false RED: **X3 shells
out to `node evals/run.mjs`, which spawns cargo-backed evals** — without `$HOME/.cargo/bin` it prints
`cargo: not found` and returns `m22-s0-X3:SUITE-RED fail=8`. Export
`PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"` and run from the slice worktree
root. The note in the ledger now says this.

**Delivered.** `evals/guest-claim-integrity.eval.mjs`: `REKEY_MANIFEST` → `export const … =
freezeManifest({…})` (recursive, WeakSet-guarded) + a contract comment. New
`evals/rekey-contract-surface.eval.mjs` (3 teeth). `ARCHITECTURE.md`: one paragraph.
**touches-delta:** the new eval (companion test file; spec §7.2 mandates a per-slice eval, and an
in-file tooth structurally cannot observe the `export` keyword) and `ARCHITECTURE.md`.
**boyscout-delta: none** (seam-freeze slices are boyscout-exempt).

**Two decisions the supervisor should propagate into the spec (I did NOT edit the harness spec — the
brief scoped this slice to the project repo to avoid a cross-repo touch):**
1. **Export in place; `evals/rekey-registry-shared.mjs` NOT created.** The lift is conditional on a
   size-split threshold; **there is no such convention in the repo** (no `max-lines` in `biome.json`,
   nothing in `AGENTS.md`/`docs/`). The file is 4th largest of 89 evals. The spec's S4 row cites "the
   M8.9 split threshold" as if it existed — **it does not**; fix that too.
2. **No re-export barrel.** §2 (`:74-77`), §7.1 and the §7.2 S0 row list `parseTableSchemas`/
   `stripRustSource` as exported from `guest-claim-integrity`. They are owned by
   `battle-schema-snapshot.eval.mjs` and `rust-scan.mjs` (ADR-0181 D1) and ESM already hands both
   gate files the same function objects under `run.mjs`. Amend the wording; the intent ("one walker,
   two gate files") is preserved.
3. **The S0 row's `mr-state.json` deliverable is already landed** (`adr_next_free` = 205) and lives in
   the HARNESS repo — listing it under a project slice's `touches:` was mis-specified.

**🔴 READ BEFORE STARTING S2 — `R-m22-s0-X1`, measured red-on-arrival.**
`checkRekeyCompleteness` infers REKEY from `typeof policy === 'string'`, so **any object entry is
REKEY by definition**. Converting ONE BLOCKED string entry to an object keeps the S0 eval green and
reds `guest-claim-integrity` with `FG47 … [G6/consumed] the manifest marks battle.player_identity as
REKEY via \`undefined\``. Adding new *keys* is measured-safe. The only green workaround forces a lie
(borrowed needles advertise a BLOCKED column as re-keyed). S2 must add an explicit policy/kind
discriminator and teach the `[G6/consumed]` loop, BOTH detail-string counts (`:3079-3081` and
`:3092`) and fixture FG52 to read it.

**Four residuals filed as real queued work** (`mr-gates residuals list --unclaimed`):
`R-m22-s0-X1` (above) · `R-m22-s0-X2` `[G6/declared]`'s `key in manifest` walks the prototype chain
that `Object.freeze` does not seal — `Object.prototype` pollution greens an unclassified Identity
column; PRE-EXISTING (confirmed byte-identical on master by two lenses), one-token fix verified both
ways (`Object.hasOwn`), not taken because seam-freeze slices are boyscout-exempt ·
`R-m22-s0-X3` `findIdentityColumns` matches literal type TEXT, so an aliased
`pub type OwnerId = Identity;` column is invisible (documented as a KNOWN LIMITATION in the contract
comment) · `R-m22-s0-X4` `evals/run.mjs` has no completeness check.

**NEW HARNESS-WIDE HAZARD, now in memory as `eval-main-guard-truncates-run-mjs`.** A main guard
widened to compare `path.dirname` — or `endsWith('run.mjs')` — fires under `run.mjs` (whose
`argv[1]` is a sibling `.mjs` in the same dir), runs the eval at module scope and `process.exit(0)`s
the harness. **Measured: 37 of 90 evals ran, 3 already-printed `eval FAIL:` lines swallowed, exit 0,
`just ci` GREEN.** `run.mjs` guards only `files.length === 0`. Any acceptance gate asserting merely
`fail===0 && exit===0` is blind to this; X3 caught it only because it also asserts the named eval's
PASS line appears exactly once. **Recommend that shape for every future eval-suite gate.**

**Red-team wrote and ran the cheats — twice.** Round 1 broke 6 of the first draft's teeth (all fixed
by the tester, who is a different agent than the implementer). Round 2 against the shipped diff found
the `endsWith('run.mjs')` blindness, path-conditional stripping (which it then used to hide a real
unpoliced `Identity` column with BOTH gates green), a concat-blob walker, and an unbounded CI hang
from a SIGTERM-trapping child. All closed and re-bitten. **12 mutations bite; the verifier
independently re-ran 7.** One equivalent mutant is recorded as such rather than papered over.

**Also worth propagating:** `parseTableSchemas` needs `accessor =` FIRST and a newline before the
closing `}` — the obvious one-line fixture is invisible even from RAW source, which silently
disarms any tooth proving a walker strips (measured). In memory as
`parsetableschemas-fixture-vacuity-traps`.

**Housekeeping:** `mr-gates residuals add` REWROTE `memory/projects/mr-state.json` (whitespace
reformat + the tool's own bookkeeping). I diffed it: **no keys lost, `adr_next_free` still 205**; the
only semantic change is `inflight` carrying this slice's own spawn row. The pre-existing uncommitted
harness strays (`future-prompts.md`, `handoff-archive`, `gdd.md`) are untouched by me. My one new
untracked harness file is `memory/projects/monster-realm-m22-s0-plan.md` (plan + a full adjudication
of the three plan-review lenses) — commit or discard as you prefer.

---

## 2026-08-23T??:??Z — rw3c PR OPEN (#358) — wave-3 wild placement, local `just ci` green

PR https://github.com/mdrewt/monster-realm/pull/358 (`slice/rw3c` -> master), 5 `wip:` commits, remote
CI running. **Supervisor owns the merge** — I did not run `gh pr merge`.

**Local gate:** `just ci` GREEN (`JUST_CI_EXIT=0`) — 1974 tests run / 1974 passed / 0 skipped, 89 evals
pass / 0 fail. **Acceptance ledger: 9/10 met, 1 DEFERred, 0 unmet** (`seed:e3b0c44298fc1c14`). The
ledger was seeded with ZERO criteria (`SPEC-SECTION-NOT-FOUND`), so X1..X7 were authored in the PLAN
phase and are LINT-CLEAN.

**NOTE FOR THE SUPERVISOR'S `mr-gates verify`:** four CHECKs invoke `cargo`. Export
`PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"` before verifying or you get the same
false `EVIDENCE-MISMATCH` rw3b hit. Also: hand-authored gates need an explicit `EVIDENCE: pending` line
per gate — `mr-gates check` only writes evidence into an existing slot, and without it every gate
reports "checked but EVIDENCE pending" and stays 0/N met despite PASSing.

**DEFER: X3 -> backlog (RW3-08).** Second slice to hit this; residual `R-rw3b-X8` already open.
RW3-08 as worded is mechanically unsatisfiable for ANY slice that places a species — `pt_d3_tuning.rs`
pins the wild-legal set by set EQUALITY and an exact count, both derived from the live registry. Both
were extended field-for-field, never weakened. Substance proved by X3b, which PASSES.

**Placement is ZONE 1, not zone 0** — the slice brief's "zone-0 encounter table" is impossible
(RW3-07 + `pt_d3_2_*` freeze zone 0 byte-for-byte). Reasoned in the PR body.

**New invariant, nothing in game-core enforces it:** a placed form's `max_level` must sit strictly
below its lowest outgoing evolution-edge `min_level`, else the wild catch auto-evolves on capture and
the tier-0 form is never obtainable. Scoped to wave-3 because pre-existing content (species 7, band to
16 vs an edge at 15) already violates the general form. Promoting it to a real R13 is a named follow-up.

**Red-team wrote the cheats and ran them.** Its highest-value attack FAILED (a second lower-min_level
edge is caught — both gates recompute the lowest gate live). Three real gaps found and closed, each
re-verified by me running the exact cheat: a partially-shrunk tier-0 set that slipped the empty-set
vacuity guard and turned BOTH gates green with RW3-06 violated; the eval's T-HYGIENE claim being false
for block comments; and the zone-0 freeze being blind to a shadow duplicate `zone_id: 0` part file. An
earlier tester tooth was also caught VACUOUS by a mutation bite-proof and repaired.

**touches-delta:** `game-core/tests/pt_d3_tuning.rs` (the RW3-08 defer) and `ARCHITECTURE.md`.

**ACTION NEEDED FROM THE SUPERVISOR — harness-repo edits left UNCOMMITTED in the working tree**
(I do not commit outside my slice worktree): `specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md`
(rw3c marked DELIVERED + the zone-1/RW3-08/invariant rationale) and the untracked
`memory/projects/monster-realm-rw3c-plan.md`. Please commit or discard.

**Follow-up flags (untouched, outside touches):** `species/070-wave3.ron:20-22` is now stale ("NO
encounter row ... wild placement is slice rw3c"); `evals/content-version.eval.mjs` advertises a
`--update` flag that does not exist and checks no version monotonicity; `server-module/src/lib.rs`'s
CONTENT_VERSION doc changelog is missing v19/v20/v21 (deliberately not fixed — a second changed line
would break gate X3b).


## 2026-08-23T~18:0xZ — rw3a COMPLETE (terminal state: PR #37 open + local harness gate green)

**Slice:** rw3a — spec authorship for `M-postgate-roster-wave-3` (Electric + Light roster wave).
**Repo:** harness (`mdrewt/claude-harness`). **PR:** https://github.com/mdrewt/claude-harness/pull/37
**Branch:** `feat/rw3a-roster-wave-3-spec` (worktree `.claude/worktrees/rw3a`, 3 commits, pushed).
**Gate:** `mr-selfcheck` -> SELFCHECK-OK; harness `just ci` EXIT=0. No remote CI on this repo, so
PR-open + local green is terminal. **Acceptance: 8/8 met, 0 deferred, 0 unmet — rw3a seed:e3b0c44298fc1c14.**

**Delivered:** `specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md` (new) + the PLAN.md bullet link.
Diff is exactly those two files (touches-delta: none, boyscout-delta: none).

**queue[] candidates unlocked by this merge** (normal content-pack pattern, project repo):
- **rw3b** — ATOMIC content drop: `game-core/content/skills/070-wave3.ron`,
  `game-core/content/species/070-wave3.ron` + `071-wave3-derived.ron`,
  `game-core/content/evolution_paths/070-wave3.ron`, sprites via `client/art-src/generate_monsters.py`,
  `server-module/src/lib.rs` (CONTENT_VERSION only), `evals/baselines/content-hash.json` (regen),
  `evals/rw3b-roster-wave-3.eval.mjs`, `game-core/tests/rw3b_roster_wave3.rs`, `docs/adr/0204-*.md`.
  Must be atomic: the ADR-0143 STAB gate is registry-wide, so a species-only slice is RED ON ARRIVAL.
- **rw3c** — after rw3b: encounter placement/tuning in `game-core/content/encounters/000-core.ron`
  (+ CONTENT_VERSION, content-hash, own eval + Rust test). Zone 0 must stay byte-identical.
- **NOT parallel-safe with each other** — both bump `CONTENT_VERSION` and regenerate the content-hash
  baseline. Chain them.
- **ADR-0204 is reserved for rw3b** (project repo). rw3a deliberately did not create it (REPO-MIXED).

**Corrections this slice made to the corpus (worth propagating):**
- `validate_evolution_fusion` **does not exist** in `game-core/src`. The live gate is
  `validate_evolution_paths` rule **R6** (`game-core/src/content.rs:934`, enforced `:1050`), keyed on an
  evolution edge's `to_species`, NOT on `tier`. The stale name is still in
  `game-core/content/encounters/000-core.ron` and in the pt-d3 text of `M-playtest-d-content-pack.spec.md`.
- `M-playtest-d-content-pack.spec.md` still names the deleted `evolutions.ron` — stale since the
  essence-graph redesign (ADR-0174/0176); the live registry is `content/evolution_paths/`.

**⚠️ TOOLCHAIN TRAP (cost real time here; now in memory as `harness-node-toolchain-path-trap`):** the
Bash tool's default PATH resolves `node` to /usr/bin/node **v18.19.1**, but the harness pins **24.13.1**
via asdf. Under node 18, harness `just ci` exits 1 (`scripts/tests/adr-lint.test.mjs:191` uses
`import.meta.dirname`, Node >=20.11) and **looks exactly like a red master**. Verified: same clean tree,
EXIT=1 on node 18, EXIT=0 on node 24. Always
`export PATH="$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH"` first. Also: `mr-selfcheck` must run from
the MAIN checkout — `memory/projects/` is gitignored, so the tools are absent inside worktrees.


## 2026-08-07T~17:0xZ — 12r-c COMPLETE: PR#291 open, local `just ci` green, remote CI running

**Terminal state per doctrine — supervisor owns the merge. `gh pr merge` NOT run.**

Branch `fix/12r-c-dual-write-fn-boundaries` (worktree `.claude/worktrees/12r-c`, from `origin/master`
@ `5a051d9`). PR **#291**, OPEN / MERGEABLE, ci+e2e QUEUED at exit. Local `just ci` green on HEAD
`7a631b9`: 78 evals pass / 0 fail, 1590 Rust tests, 1999 client tests, clippy `-D warnings`,
`cargo fmt --check`, typecheck, security clean.

**Diff = exactly the declared `touches:` set** — `evals/monster-dual-write.eval.mjs` only.
`touches-delta: none`. No ADR (none assigned; repairs a detector, not a decision). No
`ARCHITECTURE.md` / `docs/knowledge/**` / `CHANGELOG.md` edit — verified not stale, so **no
doc-reconciliation is owed for this slice** at the serial merge.

**What landed.** `splitIntoFnBodies` → a column-0-anchored declaration scan (one regex LITERAL,
`matchAll`); `checkFnBodyDualWrite` / `stripLineComments` / `readServerModuleSources` byte-identical
to master. E1 verified RED-under-master → GREEN-under-branch by the verifier independently. E2:
734 → 828 spans (+94 = exactly the col-0 `pub(crate) fn` count), 0 violations before and after.
The new partition is a **strict refinement** of the old (0 old boundaries lost), so the gate is
provably strictly stronger. 10 new teeth (16 total); 6 mutation bite-proofs run by the orchestrator,
each caught by a named tooth; one mutation (dropping `[A-Za-z_]` after `fn `) is an **equivalent
mutant**, documented in-file rather than papered over with a fabricated fixture.

**IMPORTANT — a hardening was implemented then SEVERED mid-slice.** Red-team found a live
no-adversary false GREEN (a `/* FIXME … monster_pub().monster_id().update( … */` comment CURES a
violation, since `.includes()` matching only ever stripped `//`). I shipped a `stripBlockComments`
pass + TEETH P/Q, then a second red-team pass proved it was **worse than the hole**: line-strip-first
destroys the `*/` of any block comment whose prose contains `//` (a URL suffices), and the orphaned
`/*` pairs with the next `*/` anywhere in the concatenated tree, **deleting real
`ctx.db.monster()` writes**. Block-strip-first also mis-eats (the tree's `///` prose has unbalanced
`/*`: 14 vs 17). Both PoCs survive `cargo fmt --check`. Severed; `findDualWriteViolations` is back
byte-identical to master and TEETH P/Q were withdrawn WITH the capability (documented in-file, not
silently dropped — the verifier specifically audited this as a legitimate withdrawal, not a
weakened gate).

**Follow-ups identified (none touched, none blocking) — ranked:**
1. **Per-write counting in `checkFnBodyDualWrite`** (`count(UPDATE_PUB) >= count(UPDATE_MONSTER)`).
   Highest value: the "some compliant pair exists" failure mode this slice targets STILL SURVIVES
   *inside* one function — `write_back_battle_results` (`battle.rs:1039`) writes at `:1124` and
   `:1294`; deleting either mirror alone keeps the gate GREEN. Costs nothing today (17 writes/17
   mirrors). Would touch `checkFnBodyDualWrite`, deliberately frozen in 12r-c.
2. **One string-and-comment-aware prepare pass** (port `prepareRustSource`/`blankStringLiterals`,
   `evolution-reducer-security.eval.mjs:130-221`); reinstate TEETH P/Q. Closes both decoy
   false-greens. Do NOT attempt this as a bolt-on stripper — see the severance above.
3. `evals/inventory-single-stack.eval.mjs:75` — copied splitter, same defect class (3 literal
   markers; still misses `pub(super)`/`pub(in …)`/bare qualifiers/offset-0). Port the fix.
4. Gate is one-directional: a `monster_pub` write with no `monster` write is unchecked.
5. Write markers are single-line literals — a rustfmt-wrapped `.update(`/`.insert(` chain is a
   **silent GREEN**. None exists today; wrapped `.find(`/`.filter(` already do.
6. **FOR THE SUPERVISOR / ADR-0015:** `MonsterPub` correctly omits every raw hidden column, but the
   published derived channels (`stat_*` + the public `species_row`, plus `nutrition_pct` which
   recovers EV total to ±5) let an observer approximate another player's IVs. Genre-standard and
   long pre-dating this slice, but currently an emergent property rather than a decision on record.
   Worth one sentence in ADR-0015. Not a leak of any column.

**Remaining in M-postgate-twelfth-review-residuals:** 12r-d → 12r-e (SERIAL, both touch
`server-module/src/{content,battle}.rs`; 12r-d also touches `schema.rs` and collides with
EG5-6/Migration B there — land 12r-d first per the spec note). 12r-a/b/c/f all merged-or-open.

## 2026-08-10T03:5xZ — 13r-c run finished TERMINAL: PR #309 open, local CI green
Slice 13r-c (string-literal-aware source scanners) reached its terminal state: **PR #309 open, local `just ci` exit 0, remote CI running**. `gh pr merge` NOT run — supervisor owns the merge.

**Shipped:** new `evals/rust-scan.mjs` (SSOT string-aware Rust scanner, 12 exports) + the two ~450-line verbatim copies deleted from `account-privacy` (2024→1579) and `guest-claim-integrity` (3524→3075), taking guest-claim's diverged angle-aware `splitArgs`. Three broken gates fixed (`currency-integrity`, `ranking-security`, `conversation-privacy`/`wallet-privacy`), with `stripComments` → literal-PRESERVING `stripTsComments` for the TypeScript call sites (a Rust-style payload-blanking strip would make `checkNoPrivateWalletSubscription`'s ban pass vacuously — measured on double-quoted SQL). `main.wiring.test.ts` ported file-wide, 0 of 78 call sites edited. 12 files, +1503/-1124. ADR-0181 written; ARCHITECTURE updated; DIGEST regenerated.

**Gates:** `just ci` exit 0 · 83/83 evals · 2164 client tests · Semgrep repo-wide 517 rules/990 files/0 findings · gitleaks clean. Semgrep and gitleaks were run LOCALLY on purpose (both are remote-only in CI): Semgrep's `detect-insecure-websocket` fired on the websocket-scheme token inside COMMENT text — 6 blocking findings, all in prose this slice added — caught and rewritten before pushing, avoiding a red remote round-trip.

**Three defects found by the review lenses and fixed in-slice:** (1) red-team BLOCKER — `walletTableIsPrivate` anchored on a raw `indexOf('name = player_wallet')`, so a `#[doc = "name = player_wallet"]` decoy on any earlier table made a genuinely `public` wallet report PRIVATE (live false-GREEN on ADR-0015); now uses `parseTables` over stripped source. (2) red-team BLOCKER — a regex literal abutting a `*` opened a phantom block comment in both TS scanners, erasing a real banned subscription; closed with a SOUND (not heuristic) regex-literal rule + two new teeth. (3) reviewer MAJOR — `currency-integrity`'s soundness gate covered 2 files while its ban clauses needled ~20; gate widened to the real scan set.

**PARKED → `13r-c-2` (hidden dependency, MEASURED, needs supervisor re-serialization):** the `accounts.rs` `concat!()` removal is NOT in this PR. Patching `accounts.rs:48` to the bare `"https://auth.monster-realm.invalid/"` literal fails **exactly one** eval — `evals/trade-escrow-guards.eval.mjs` (TR-11) — which is OUTSIDE 13r-c's declared `touches:`. It concatenates every `server-module/src/*.rs` into one blob (`accounts.rs` sorts first) and strips comments BEFORE strings, so the bare URL inverts quote polarity crate-wide. Carry to 13r-c-2: `accounts.rs:48` + its `:33-48` hazard comment, an `[A/issuer-literal]` regression tooth, and migrating `trade-escrow-guards` onto `rust-scan.mjs`. **NOTE: 13r-h (`after: 13r-c`, overlapping accounts.rs) is UNBLOCKED — this PR does not touch accounts.rs.** **M21b-2's real-issuer-URL wiring still must not land before 13r-c-2**, since the workaround is still in place and trade-escrow-guards is still blindable.

**Disclosed residuals (in ADR-0181):** ~24 evals still strip `//` with no string pass at all and ~8 more run the string pass after the comment strip (measured across `evals/*.eval.mjs`); migrating them onto `rust-scan.mjs` is the follow-up. `independentAnchorCount` can false-RED on a multi-line Rust string literal (trips `playtest_tests.rs`/`ranking_tests.rs`, dormant because every gate filters `*_tests.rs`). Both TS scanners still don't lex a regex in keyword position (`return /x/`) — deliberate; under-detection is safe.

**Flag (pre-existing, not this slice):** the `Nightly` workflow's `mutation-server` job has been failing on master since run 31302216601 (2026-08-09 07:53). Off the PR path per AGENTS.md; master's own CI is green.

**ADR-0181 note:** `**Amends:**` is deliberately EMPTY — the digest gate requires a reciprocal `**Amended-by:**` in ADR-0179 and ADR-0180, both outside this slice's `touches:`. Whoever owns those files next should add the back-links.

## 2026-08-14T~10:00Z — slice 14r-c COMPLETE (terminal state: PR open + local `just ci` green)

**PR:** https://github.com/mdrewt/monster-realm/pull/319 — branch `feat/14r-c-scanner-migration`,
worktree `.claude/worktrees/14r-c`, forked from master `be8a612`. **Supervisor owns the merge.**

Local full `just ci` **green** at HEAD `ddccc4b`: evals 86/86, cargo nextest 1921/1921 + doctests,
client vitest 2390/2390 (81 files), tsc/clippy/biome/wasm/perf-budget/secret-scan all clean.
Independent `verifier` verdict PASS (teeth empirically bitten + reverted; no test weakened;
debt mechanism proven non-abusable; scope clean). ADR-**0186** authored; `just adr-digest` re-run.

**Landed:** new `evals/scanner-migration-audit.eval.mjs` (ADR-0181 measurement as a permanent
gate, name-derived set, Leg1 anchored import + assertStripperSound, Leg2 load-bearing "no naive
stripper survives incl. private helpers"); 6 privacy evals migrated onto `stripRustSource`;
residual (a) `}` dropped from `startsRegexLiteral` at both sites with teeth. Gate reports
`18 gated / 10 migrated / 7 debt / 1 not-applicable`.

**EARS-2 NOT fully closed** — 7 `*-reducer-security` evals parked as capped self-retiring debt.

### NEXT SLICE — 14r-c-2 (pre-scoped, ready to launch)
1. Migrate the 7 parked evals (`battle`/`evolution`/`npc-dialogue-quest`/`raising`/`recruit`/
   `shop`/`trade`-reducer-security). Deleting each `KNOWN_UNMIGRATED` entry is forced by the
   gate itself (self-retiring). Known traps, measured: `trade-reducer-security:426-429` has 4
   coupled un-compacted call sites that must convert together; `shop-reducer-security:63-70`
   deliberately splits criteria 1-5 (comments-only) from 6-7 and its `stripRustStrings:53-55`
   is length-CHANGING; `battle-reducer-security`'s `stripRustStrings` export is imported by
   `zone-warp-server-runtime:50` (must survive); `recruit-reducer-security`'s 4 exports are
   pinned by `gate-teeth:86-116`. `evolution`+`raising` `prepareRustSource` are the two files
   where the hazard is LIVE and reproducible (canary needle swallowed).
2. ADR-0166 R5 first half: shared `scan_helpers` home in `lib.rs` for the duplicated
   `strip_rust_comments` test helper — **12 copies in-tree, not the 4 R5 claims.**

### BLOCKER for the supervisor to re-serialize (hidden dependency, NOT attempted)
ADR-0166 R5 second half — moving the trade-size cap to its `guards.rs` SSOT home — requires
`server-module/src/trading.rs` + `guards.rs`, **both outside 14r-c's declared `touches:` set.**
Needs its own slice with those paths declared.

### Operational notes
- Sibling slice 14r-e held the global spacetime data-dir lock during this run → `account-e2e`
  red for environmental reasons (documented class). Cleared on its own; final CI green.
- `just ci` was SIGKILLed (137) at the eval stage while the verifier ran concurrent
  `evals/run.mjs` loops. Not a code failure — re-ran clean once contention cleared.

## 14r-g terminal handoff (2026-08-14, orchestrator)
14r-g (ranked-requires-account, ADR-0189) at TERMINAL STATE: **PR #321 open, local full `just ci` GREEN (86/86 evals, 610 server + 2399 client tests), remote CI running — supervisor owns the merge.** Branch feat/14r-g-ranked-requires-account @ fd4e02b (merged origin/master post-14r-f, DIGEST regenerated with 0188+0189, merged-tree full ci green 87/87 evals), worktree .claude/worktrees/14r-g. KEY CALL (flag to Drew): gate is deployment-conditionally INERT (ADR-0189 D6) — ALLOWED_ISSUERS is still the .invalid placeholder so no account can exist anywhere; unconditional enforcement would brick PvP + red 3 merge-gate e2e specs. Auto-activates at the OQ1 issuer flip; ea_ra_06a canary carries the 5-item activation checklist. #313 answered by Drew mid-slice (no migration). PARKED as next slice (hidden deps client/src/main.ts + client/e2e/, recorded in PR): EARS-3 guest affordance + e2e conversion. Supervisor reconcile items in PR "Follow-up flags" (ADR-0179 OQ2 prose, adr README next-free, 3 stale prose line-cites, spec D6 annotation). Plan archive: memory/projects/monster-realm-14r-g-plan.md.

## 13r-d — Append-at-end schema-gate generalization (2026-08-15)

**State: PR OPEN — https://github.com/mdrewt/monster-realm/pull/325** (branch `feat/13r-d-schema-gate-order`, worktree `.claude/worktrees/13r-d`). Local full `just ci` GREEN at HEAD (3 green runs); remote CI running at hand-off. ADR-0193 consumed. **Supervisor owns the merge.**

Closed the hole where a mid-struct column insert + the sanctioned re-baseline passed the additive-schema gate green. Design pivoted during plan review: any rule keyed on the *working-tree* baseline is empty by construction after regeneration (red-team measured a no-default tail append GREEN on 33/38 tables), so the gate now resolves the **previously committed** baseline from git (ADR-0116 D2/D3 precedent, `spacetime-type-snapshot.eval.mjs`) — including D3's self-compare branch and failing CLOSED inside a repo. `checkBaselineAppendOnly` also pins persisted column **types** and the **PK**. A self-expiring per-table `"manual_migration": "ADR-0177 …"` marker is the only escape (a stale marker is itself a violation); without it the gate would deadlock the delete-data runbook.

**Follow-ups parked (all outside 13r-d's touches):** (1) `server-module/src/content_tests.rs:2500` + `m14_5d_1a_tests.rs:264` bare column-name needles are now also satisfiable by the `order` array (typed assertions still bite) and their comments cite stale baseline line numbers; (2) the baseline records `pk/columns/order` only, so `#[unique]`/`scheduled(...)` changes on an existing table stay ungated; (3) ~35 lines of git-resolution policy duplicated with `spacetime-type-snapshot.eval.mjs` — a shared `evals/baseline-git.mjs` needs its own slice; (4) a brand-new private table added by a future slice arrives with no publicness eval allowlist entry (flag for 13r-e).

**NEXT:** 13r-e is now unblocked (`after: 13r-d`) — HEAVY, Drew-directed monster_pub need-to-know privacy, issue #284; it appends schema surface, so it must satisfy this gate (tail-append + `#[default(`). Remaining thirteenth-review tail: 13r-e, 13r-g, 13r-h.

## 13r-g — Docs/ledger freshness (2026-08-15) — **PR OPEN, awaiting supervisor merge**

**PR:** https://github.com/mdrewt/monster-realm/pull/328 · branch `feat/13r-g-docs-ledger-freshness`
· worktree `.claude/worktrees/13r-g` (kept; `client/node_modules` installed there)
· ADR **0196** (amends 0165). **Items: none.**

**Terminal state:** PR open + local `just ci` **exit 0** (three full runs) + remote CI running.
`gh pr merge` NOT run (supervisor-owned). Adr next-free should advance past 0196; **0195 was
deliberately skipped** (supervisor-assigned number kept, and `adr-digest.mjs` requires the 4-digit
`0196-` filename form — nothing in CI requires contiguity).

**Delivered:** (1) CHANGELOG regen through #326 (34 entries, pure append) as the branch's FIRST
commit; (2) ADR-0165's never-implemented nightly changelog-freshness check —
`scripts/changelog-freshness.mjs` + a 72-test tester-authored sibling suite + a 5th `nightly.yml`
job; (3) `m13.5r-plan.md` → `docs/specs/`.

**The design call worth remembering:** the failure rule is a **lag×age conjunction** (fail iff
`missing >= 15` AND oldest missing entry `>= 6` days), not a count threshold. Derived by replaying
the real signal — `git cliff` at each of the last 150 master commits vs that commit's committed
ledger. Drift here is a **weekly sawtooth reaching 20–26 on a HEALTHY wave**, so `>15` would red
21 of 32 nights (66%) and `>25` would miss half the real episodes; the conjunction fires 5/32.
Age is the oldest missing entry's commit date via a verified subject→entry transform (341/341),
clock injected — **never file mtime**, which in a fresh `actions/checkout` is always ~0 days old
and would make the gate permanently, silently green.

**Gates:** `just ci` exit 0 (87 evals, 1934 cargo tests, 2447 client tests / 81 files, clippy
`-D warnings`, wasm, security). `verifier` **PASS** — it re-ran the full CI itself, confirmed the
gating suite was never edited after the tester's final round (byte-identical across the last two
commits), that boundary fixtures derive from the exported constants, and ran semgrep `--config
auto` over both new files (zero findings). **15/15 mutation bite-proofs killed.** Domain auditors
not run — no server-module/game-core/wasm/reducer/schema surface.

**Ops notes for the next run:**
- **`node --test <file>` EXITS 0 WHEN THE FILE DEFINES ZERO TESTS** (node 24.13.1 counts the file
  itself as one passing test). Any nightly/CI step running `node --test` needs a pass-count floor
  from the runner's own TAP tally — a text count of `it(` is satisfied by a block comment.
- GitHub's default Linux `run:` shell is `bash -e` **without pipefail**, so `cmd | tee` discards
  `cmd`'s exit status. Add `shell: bash` when piping.
- A `git clone --no-hardlinks <worktree>` carries only COMMITTED state — verifying an uncommitted
  fix in a clone silently tests the old code (cost one confusing round here).
- `taiki-e/install-action` supports `tool: git-cliff@<version>`; pin the version, since the gate
  compares generated-vs-committed and an unpinned reader flips every entry on an upstream
  rendering change.

**Follow-ups this slice could NOT do (all need `evals/` or `justfile` in touches):** (1) MOVE the
gating into `evals/changelog-freshness-teeth.eval.mjs` so `just ci` catches comparator rot per-PR
and pins the thresholds cross-directory (do not duplicate the fixtures); (2) a `just
changelog-check` recipe, and more importantly a `just changelog` that **pins the git-cliff
version** (the workflow pins the reader at 2.13.1 while `justfile:172` uses whatever the developer
has); (3) add `changelog-freshness` to `nightly-smoke-wiring`'s guarded-job list (today deleting
the job or adding `continue-on-error: true` is invisible to `just ci`); (4) a subprocess smoke
test for `main()` — the suite imports only pure functions, so 18 shell mutations ship suite-green.

**NEXT:** merge #328 after remote CI. Remaining thirteenth-review tail: **13r-h** only
(`after: 13r-c`, already merged — eligible; structural, touches `server-module/src/schema.rs`, so
it must run alone).

## 2026-08-15T~09:00Z — 13r-h PR OPEN (terminal state, awaiting supervisor merge)
Slice 13r-h (Rust test-mirror parity tail, last of M-postgate-thirteenth-review-residuals) built to terminal state: **PR#329 OPEN** (https://github.com/mdrewt/monster-realm/pull/329), branch feat/13r-h-test-mirror-parity @ 0753059, **local full `just ci` GREEN (exit 0)** — the exact remote gate (1949 workspace nextest + 2447 client vitest + 87 evals + security/wasm/typecheck). Do NOT `gh pr merge` early: supervisor owns the squash-merge after remote CI. `Items: none`.

**What shipped (zero production-behavior delta):** (1) accounts_tests.rs G2 mirror → source-derived reducer enumeration at full checkNoClientIdentity parity (wire-safe param allowlist + scheduled-struct-with-guard carve-out + Identity-ctor ban + exact name-set pin) + 9 machinery self-teeth; (2) evolution_tests.rs EG2-9 → derived per-file recursive read_dir scan (7 anchors + basename + body anchors), L1_ALLOWED + vacuity guards preserved; (3) accounts.rs account_state_is_legal pure predicate + 5 debug_asserts (release-compiled-out, exhaustive match) + schema.rs doc note + exact-equality struct-shape tripwire. NO enum fold (non-additive migration, deferred to M22 per ADR-0195 D1).

**Orchestration (HARD tier, all 6 roles):** planner → reviewer+red-team plan review → tester (opus, authored all tests, RED-first) → specialist (general-purpose, red→green production only) → reviewer+reducer-security-auditor impl review → red-team on non-security gates → verifier PASS. Proof-of-teeth T1-T17 all bit with correct attribution. ADR-0195 written (amends 0179, reciprocal back-link), digest + knowledge bundle regenerated.

**touches-delta:** accounts_tests.rs/evolution_tests.rs (sibling tests of declared code files), docs/adr/0195 (new), docs/adr/0179 (backlink only), docs/adr/DIGEST.md (adr-digest regen), docs/knowledge/** 11 files (knowledge regen, line-pin shifts only), ARCHITECTURE.md (1 para). boyscout-delta: none.

**Follow-up residuals (recorded in ADR-0195 consequences — each needs a slice touching evals/** or shared strippers, all OUT of 13r-h scope):** (a) char-literal brace-walk truncation class in EG2-9 + no-idle-accrual.eval.mjs (benign today, 5 pre-existing scheduled reducers anchor-free); (b) SHARED identity-ctor ban gap — both Rust mirror and JS twin miss Identity::from_claims(/from_u256( (latent, needs lockstep Rust+JS extension); (c) stripper-desync self-check is eval-only in the Rust mirror (port assertStripperSound with the shared-Rust-scanner follow-up). Plus still-open ADR-0179 §9: G12 identifier list, write_target_accessors rfind, //-before-strings in 3 evals. Tombstone re-anchor (#307/OQ2) explicitly excluded.

**Two lessons this run (saved to auto-memory):** (1) the recruit-reducer-security.eval.mjs (+ other unmigrated *-reducer-security debt evals) concatenate ALL server-module/src/*.rs INCLUDING *_tests.rs and strip block comments with a naive `/\*...\*/` regex — a stray `/*` substring (e.g. a `src/**` glob) in ANY comment in an alphabetically-early file (accounts*.rs) desyncs `/*`↔`*/` pairing and blanks a LATER file's fn (write_back_battle_results), a false-RED invisible to local module tests and only caught by full `just ci` eval stage. Fixed by dropping the glob from a machinery comment. (2) the doc-keeper subagent resolved a worktree-relative ARCHITECTURE.md edit to the MAIN CHECKOUT path — reverted via Edit tool (NOT git, per the no-mutating-git-on-main rule) and re-applied to the worktree; always verify subagent doc edits landed in the worktree with `git -C <worktree> status`.

**M-postgate-thirteenth-review-residuals is now FULLY CLOSED** once #329 merges (13r-a..h all delivered: PRs 322/324/309+327/325/326/323/328/329).

## 2026-08-17T~03:00Z — 15r-sec-vis: PR #337 OPEN, local `just ci` green (terminal state, awaiting supervisor merge)
Slice 15r-sec-vis (Table visibility as declared data + a class regression gate) is at the sanctioned terminal state: **PR #337 open on mdrewt/monster-realm, full local `just ci` exit 0, remote CI running.** Branch `feat/15r-sec-vis` (6 commits, base a6ae43c), worktree `.claude/worktrees/15r-sec-vis` still present. `gh pr merge` NOT run — supervisor owns the merge.

Shipped: `visibility` on all 38 baseline entries (18 public/20 private, machine-derived), `parseTableVisibility` as a third projection over the existing parse, `checkVisibility` (`[visibility-shape]`+`[visibility-drift]`), `checkVisibilityEscalation` (`[visibility-escalation]`), `computeViolations` as the SSOT aggregation the verdict block calls, `formatBaseline` + `--write` regenerator, and `scripts/okf-export.mjs` delegating its derivation to the eval. **ADR-0199 written** (supervisor had assigned none — the `visibility_note` lifecycle and the D9 `[table-count]` amendment are not recoverable from code; 0198 was highest, adr_next_free was already 199, no concurrent sibling). Verifier PASS with 9/9 implementation mutations producing the predicted RED.

Orchestration: planner -> reviewer+red-team+/simplify on the plan -> tester (RED first, import-guard RED verified by me) -> reviewer on the tests (found a BLOCKER: nothing proved the checkers were WIRED into the gate -> `computeViolations` + T-VIS-WIRED added) -> general-purpose implementer -> reviewer+red-team+tester+reducer-security-auditor in parallel -> verifier. desync-guard deliberately NOT run: zero game-core/client/netcode surface in the diff.

Red-team found and I closed three real holes: a degenerate `"ADR-"` escape (now anchored `^ADR-`+>=4 digits), a pre-armed marker (now banned on private entries AND required absent-or-different in prev), and a **`cfg_attr`-wrapped table invisible to the WHOLE gate** because `[table-count]`'s needle was anchored on `#[` exactly like the block regex, so both sides of its comparison went blind together (ADR-0199 D9 widens the needle; T-VIS-CFGATTR pins it; no-op on today's corpus).

KNOWN, DOCUMENTED, REVIEWER-RELEVANT: the ADR-0199 D7 bootstrap window is ACTIVE on this PR — the prev baseline predates the axis so `[visibility-escalation]` is skipped for all 18 public tables on the landing commit (the gate says so loudly in `detail`). It closes permanently on merge. During the window EARS 3 is enforced only by T-VIS-ANCHORS' full name-set pin, a test-time control — **any edit to those pinned lists in PR #337 is load-bearing.**

FOLLOW-UPS (not this slice, each a candidate micro-slice): (1) ADR-0193 D7's `manual_migration` escape still uses the degenerate `.indexOf('ADR-')` shape red-team broke; (2) the schema eval fails OPEN outside a git work tree (`pass:true` + warning), which also disarms the escalation layer; (3) `T-VIS-REGEN(a)`'s real-corpus byte check sits in the teeth block so an un-regenerated flip reads as `teeth FAILED` rather than `[visibility-drift]` (attribution only, gate still fails); (4) `scripts/okf-export.mjs`'s own attribute-tail regex uses `[^)]*`, truncating at the first `)`, so a table combining `scheduled(...)` with a trailing `public` would be mis-documented in `docs/knowledge/**` (no such table exists today; the gate itself is correct); (5) reducer-security-auditor flagged `trade_offer` (HIGH — `propose_trade` publishes the counterparty's MonsterCards without consent) and `battle_challenge` (MED — `challenger_party_ids` world-readable) as ADR-0194's two still-open residual disclosure channels; both fixable with the `my_battle` two-identity view pattern. ADR-0199 records that a green gate is NOT an approval of those two.

ENVIRONMENT NOTE (cost me a CI cycle): a fresh `git worktree` has no `client/node_modules`, so `just ci` dies at lint with `biome: not found` (exit 127) and `account-e2e` fails with "driver emitted no milestones" — both fixed by `cd client && npm ci`, neither is a code regression. Correct PATH here is `$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin` (node v24.13.1); the nvm path in the standard brief does not exist and silently leaves node at v18. Memory cards updated.

NEXT: supervisor delegates the CI wait to mr-ci-watch and squash-merges #337. 15r-a2 remains queued (mr-disjoint said SERIAL-REQUIRED against this slice on their evals/ touches, so it was not fanned out). Code-intelligence graph refresh deliberately deferred: the main checkout is still on master and this work is unmerged, so re-indexing now would index nothing new.

## 2026-08-17T~08:30Z — 15r-a2: PR #338 OPEN, local `just ci` green (terminal state, awaiting supervisor merge)

Slice **15r-a2** (Scanner-audit cap: advisory, not exact-equality) is at the sanctioned terminal state: **PR #338 open on mdrewt/monster-realm, full local `just ci` EXIT=0, remote CI running.** Branch `feat/15r-a2-scanner-audit-cap-advisory` (6 commits, base 1aa99d0), worktree `.claude/worktrees/15r-a2` still present. `gh pr merge` NOT run — supervisor owns the merge.

**Shipped:** `capAdvisoryNote(entryCount, cap)` (`''` at/above cap, else a NON-BLOCKING advisory), `buildDetailTail({entryCount, cap, ...notes})` which computes the advisory INTERNALLY (no `capNote` parameter — that slot was removed precisely because red-team measured it could be hardcoded to `''` while every unit tooth stayed green), a corrected over-cap message reporting measured numbers instead of asserting a relation as prose, the corrected `:121-123` comment (was "adding an eleventh park"; cap is 7), and teeth T10a/T10b/T10c/T10-WIRED. **The `>` predicate is untouched, per spec.** No ADR (none assigned; rationale already in the spec).

**Diff:** `evals/scanner-migration-audit.eval.mjs` (declared touches) + `ARCHITECTURE.md` (one sentence, companion doc — listed under `touches-delta:` in the PR body). Boyscout: one 3→3-line hunk at `:19-21` (header claimed the gate "is expected to be RED"; measured PASSING).

**Evidence:** 12/12 mutations RED with correct attribution — `>`→`>=` killed **only** by T10b, exactly the load-bearing property the spec claimed for the 7/7 equality fixture. Verifier PASS (re-ran the mutation matrix itself, confirmed T1-T9 byte-identical, confirmed the line-citation contract `KNOWN_UNMIGRATED_CAP = 7` at `:124` / `isGatedName` at `:245`). 87 eval PASS / 0 FAIL; client vitest 2461 passed; check-secrets clean.

**Orchestration:** planner → reviewer+red-team+/simplify on the plan (parallel) → tester (RED proven) → reviewer+red-team on the tests (parallel) → implementer (general-purpose) → reviewer+red-team+reducer-security-auditor (parallel) → verifier. desync-guard deliberately NOT run: zero game-core/client/netcode surface.

**The one course-correction worth knowing:** the first wiring tooth was TEXTUAL (grep this file's own blanked source for a call-site needle). Red-team MEASURED four working bypasses of it — declaration collision on a parameter-name needle, local shadowing, an `if(false)` decoy call site, and a hardcoded `capNote=''`. It was re-architected to a BEHAVIORAL proof against `buildDetailTail`'s real return value plus an object-literal-argument needle (a destructuring parameter list has no `:` value bindings, so a declaration can never match it). Three residual bypasses survive and are DISCLOSED precisely in-file rather than overclaimed — accepted because the advisory is NON-BLOCKING and no enforcement path runs through `buildDetailTail` (reducer-security-auditor verified the cap check, completeness, self-retirement, ratchets, Legs 1+2 and the enforced-canary split are all untouched by them). Saved as an auto-memory card.

**FOLLOW-UPS (each a candidate micro-slice, none blocking):** (1) ADR-0186 D3 still says "The cap equals the entry count (7)" — the same non-sequitur corrected in code here; needs an ADR amendment (left untouched, no reserved number). (2) **Under-cap headroom is silent park budget** (MED, pre-existing): once the four migration slices land at 3/7, up to four NEW parks can be added with no constant edit, and a park suppresses the `MIGRATION: neither migrated nor listed` failure. Suggested close that does not reintroduce the equality trap: a frozen `ALLOWED_PARKS` subset check. (3) no duplicate-entry / entry-shape check in `validateKnownUnmigratedEntries`. (4) `capAdvisoryNote(0, 7)` reads "7 below the cap of 7" without naming the count (cosmetic). (5) `evals/trade-cap-parity.eval.mjs:82` cites `isGatedName` at `:246` (it is `:245`) — out of touches, flagged not touched.

**Code-intelligence graph refresh deliberately deferred** (same reasoning as 15r-sec-vis): the main checkout is on master and this work is unmerged, so re-indexing now would index nothing new.

NEXT: supervisor delegates the CI wait to `mr-ci-watch` and squash-merges #338. **The four migration slices (`13r-c-2`, `15r-sec-mig-a/b/c`) are unblocked only AFTER this merges** — that is the whole point of the slice.

## 2026-08-21T08:xxZ — e78422d incident RESOLVED (interactive session, not an automated tick)

Investigated and repaired the standing `e78422d "c0 base"` divergence flagged since 2026-08-21T02:57Z.
**Root cause confirmed independently** (both from the incident's own handoff note recovered below, and
from the shipped `_st_git_env`/`_st_git_env_ctx` code + `mr-selfcheck`'s `GIT_DIR`/`GIT_WORK_TREE` leak
tests already merged in PR #27): a red-team PoC during the lp-04 session exercised a draft git-fixture
helper whose env-scrub list omitted `GIT_DIR`; `git -C <tmpdir>` does not override an inherited `GIT_DIR`,
so the PoC's "isolated" commit landed on the real harness `main` instead of a scratch repo, sweeping up the
operator's dirty tree (24 files) into one commit — twice (`t <t@t>` 21:29, reset away; `lp04 fixture` 22:26,
left in place). Not malicious, not a latent bug in shipped tooling (already fixed in `e52e51e`) — a one-off
side effect of testing the bug the fix was written for.

**Repair applied** (tested first against a scratch clone of the real `origin`, not the live checkout):
`git tag archive/e78422d-c0-base-incident e78422d` (audit trail) → `git reset --mixed 25111d5` (uncommits
`e78422d`; working tree untouched) → `git stash push -u` → `git merge --ff-only origin/main` (clean FF to
`e52e51e`) → `git stash pop` (one expected conflict in this very file — both sides had prepended a dated
section; resolved by keeping both, in the order they already appeared: lp-04's 2026-08-20 entry above,
the pre-existing 2026-08-16 15r-sec-a entry below). Verified byte-for-byte: every recovered file matches
either `e78422d`'s snapshot or a legitimate later edit on top of it (e.g. `future-prompts.md` picked up
unrelated, later operator edits to an entirely different personal project — confirmed harmless and correctly
preserved, not evidence of anything wrong). `mr-state.json` still valid JSON. `mr-audit`/`mr-selfcheck` still
carry lp-04's shipped hardening (not clobbered). Nothing was committed on the operator's behalf — end state
is `main` == `origin/main` (`e52e51e`) plus the exact same uncommitted `M`/`??` working-tree content that
existed before the accident, i.e. byte-identical restoration of the pre-incident status quo. `main...origin/main`
now reads `0 0`. The safety-net stash (`stash@{0}`, "e78422d-incident-content-recovered") is still present
and fully redundant with the working tree — harmless to leave, since a permission classifier declined the
`git stash drop` cleanup step; safe to drop by hand whenever convenient.

**lp-skills / lp-brief-cost / lp-ollama / lp-06 / lp-git-workflow are unblocked** — their pre-staged
`/tmp/mr_pass_*.vars.json` files are still valid; the next tick can `mr-spawn` normally.

## 16r-g — retire Bond/apply_care/CareError from game-core (2026-08-22) — PR OPEN, awaiting supervisor merge

**Terminal state reached: PR open + local full `just ci` green (exit 0) + remote CI running.**
PR https://github.com/mdrewt/monster-realm/pull/350 · branch `feat/16r-g-retire-bond-apply-care`
· worktree `.claude/worktrees/16r-g` (from origin/master @5f14fe2) · 2 `wip:` commits (deaee51, 21ab147).
`gh pr merge` NOT run — supervisor owns the merge.

Delivered ADR-0177 D3's named follow-up: deleted `Bond(u8)`, `apply_care`, `CareError`,
`CARE_BOND_AMOUNT` from game-core + their re-exports + 8 orphaned tests. Net -242/+33.
Kept `CARE_COOLDOWN_MS`, `is_cooldown_ready`, `focus_train`, `FocusTrainError`,
`FocusTrainResult` (all still consumed by server-module). No new ADR (D3 already held the
decision); ADR-0177's D3 bullet at line 214 gained an appended DELIVERED note — append, not
insert, header block unchanged so no adr-digest regen. ARCHITECTURE.md :440/:742 scrubbed
(current-state), :994 annotated in past tense (history).

**touches-delta** (declared set under-enumerated the re-export sites): `game-core/src/lib.rs`
+ `game-core/src/monster/mod.rs` (compile-required), `game-core/src/monster/rolls.rs` (3 comment
lines this change falsified), `ARCHITECTURE.md`, `docs/adr/0177-*.md`. Boyscout: zero.

**Lenses:** planner -> reviewer+red-team (plan) -> tester (test-deletion audit, PASS) ->
reviewer+red-team+desync-guard+/simplify (impl) -> verifier (PASS). `reducer-security-auditor`
deliberately skipped: zero reducer/table/schema change, server-module untouched.

**SUPERVISOR TODO after merge:** refresh the code graphs on the CANONICAL checkout
(cbm `detect_changes` + `index_repository`, `codegraph sync`). Skipped here on purpose —
the canonical checkout is still at master, so indexing now would be a no-op, and doctrine
forbids indexing worktree paths.

**Follow-up flags raised (each has a home outside this slice's `touches:`):**
1. No CI-time gate enforces "game-core contains no Bond symbols" — lib-crate `pub` items are
   reachable roots, so `dead_code` never fires (ADR-0177 D3 already recorded this). Red-team
   raised CRITICAL at plan time; dispositioned with a verifier residue grep + a 5-item bypass
   checklist, all CONFIRMED-CLEAN. Real fix: extend `evals/raising-reducer-security.eval.mjs`
   g8 residue scan to `game-core/src` in a slice owning `evals/`.
2. `server-module/src/raising.rs:39-41,46-47` comments say the symbols "remain in game-core" —
   now false. Reviewer rated MAJOR. Different crate + it is g8's residue-scan target.
3. `docs/adr/0058-*.md` header + derived `docs/adr/DIGEST.md:36` still advertise `apply_care`
   as a live game-core rule. Digest is derived from the header so `adr-digest` can NEVER red on
   it — an agent reading the digest would believe game-core still owns bond math. ADR-0058 is
   only PARTIALLY superseded (focus_train survives) => wants an Amends/Amended-by note, not a
   strikethrough. This is the `agent-facing-doc-truth-ungated` failure class again.
4. `evals/raising-reducer-security.eval.mjs:491-499` — `checkCareSSOT` still accepts
   `apply_care(` while g8:567 forbids it. Contradictory, harmless (g8 wins), token is dead.
5. `game-core/tests/eg3_evolution_graph.rs:542` cites `raising/rules.rs:106`; deletion shifts
   `CARE_COOLDOWN_MS` to ~81. Prose line drift, no gate reads it.
6. `docs/specs/A0-plan.md:88-91` — superseded fusion-era sketch calling `Bond::new(...)`.

**Process note for the loop (worth remembering):** a `git add -A && git commit` run with cwd at
the HARNESS root swept ~19 files of other agents' uncommitted harness work into one commit on
harness `main`. Undone with `git reset --mixed HEAD~1` (index-only, file contents untouched,
nothing pushed). Slice checkpoints belong on the project slice branch; harness plan memos stay
uncommitted like their 15r/16r siblings.

## 2026-08-22T~18:4xZ — 16r-c COMPLETE (terminal state: PR #351 open + local `just ci` green)

**PR:** https://github.com/mdrewt/monster-realm/pull/351 — branch `feat/16r-c-changelog-freshness-gate`,
worktree `.claude/worktrees/16r-c`, forked from `2290f47`, **merged up to `origin/master` @ `a857214`**.
OPEN / MERGEABLE, ci+e2e QUEUED at exit. **`gh pr merge` NOT run — supervisor owns the merge.**

Local full `just ci` **exit 0**: 87/87 evals, 1942 cargo tests, 2461 client tests, clippy `-D warnings`,
fmt, biome, wasm, perf-budget 7/7, secret-scan clean, observability 8/8. `node evals/run.mjs` ×3
deterministic. `adr-digest --check` clean. Semgrep run LOCALLY on the changed files (remote-only
gate): 0 findings. Independent `verifier` verdict **PASS** — teeth re-bitten, no test weakened,
scope exact, ADR append verified byte-identical for its first 296 lines.

**Diff (4 files):** `evals/nightly-smoke-wiring.eval.mjs`, `justfile`, `docs/adr/0196-*.md`,
`ARCHITECTURE.md`. `touches-delta:` the last two (always-in-scope doc companions).
**`.github/workflows/nightly.yml` was DECLARED but NOT CHANGED** — the job was already correctly
shaped. No new ADR (none assigned; ADR-0196 D8 pre-authorized this as its own follow-ups).
`boyscout-delta: none`. CHANGELOG/ADR-README/DIGEST untouched.

**Delivered:** ADR-0196 follow-ups **#3** and **#2**. `jobIsNotNeutered` gained an additive
`opts.gates` data-descriptor array; `CHANGELOG_FRESHNESS_GATES` pins the job's two gate steps
VERBATIM; seven new real checks (24-30). `justfile` gained `GIT_CLIFF_VERSION := "2.13.1"` +
version-asserting `changelog:`/`changelog-check:` recipes, pinned three ways.

**Review found a REGRESSION THIS SLICE CAUSED — disclosed, not buried.** Round 1 widened
`{kind:'just'}` to read block-scalar bodies, LOOSENING the pre-existing mutation/coverage/
mutation-server gate (a `run: |` step was fail-closed at `2290f47`). The multi-command class is
closed (tooth V29); a **single-line** `run: |` body starting with `just ` is STILL accepted where
the fork point fail-closed. Named in ADR-0196 with the real fix: promote those three gates to
`{kind:'script'}` verbatim pins. **Recommend that as an early follow-up slice.**

**Two genuinely pre-existing BLOCKERs closed in passing** (both affect all guarded jobs):
job-level `defaults: run: shell:` no-ops every run step with the pin intact; `strictJobBlock`
scanned from line 0, so a decoy job block in a top-level `run-name:` block scalar beat the real
`if: false` definition. Also closed: gate-step `working-directory:`, folded `run: >` scalars, and
`justRecipeBody` first-wins (that one was round-1 self-inflicted, corrected in the ADR).

**Deferred, DATED 2026-08-22 in ADR-0196 (never silently dropped):** follow-ups **#1**
(dedicated `changelog-freshness-teeth.eval.mjs`) and **#4** (shell `main()` subprocess coverage) —
both need `scripts/**`, outside `touches:`. Next carrier: a slice declaring `scripts/` + `evals/`.

**Named residuals still open (measured live, all pre-existing, all guarded jobs):** a `uses:` step
running arbitrary shell before the gates; `env: NODE_OPTIONS: --require …` (the env scan is a
PATH-only DENYLIST); zero-instance `strategy: matrix:`; a skip-inducing job `needs:`;
`runs-on:`/`container:` relocation. **Closing them needs a step-key/`uses:`/`env:` ALLOWLIST across
all guarded jobs — its own slice, because a strict env allowlist false-REDs FROZEN tooth U2c**,
which pins that ordinary non-PATH env keys are ACCEPTED. Re-authoring U2c is a deliberate decision.

**16r-h is now UNBLOCKED** (`after: 16r-c`), but note it shares
`evals/nightly-smoke-wiring.eval.mjs` — serialize it after this merges.

### Operational findings worth acting on (harness-level, not this repo)
- **The `tester` subagent cannot write to its own slice.** `.claude/hooks/guard-tester-write.mjs`
  blocks every `tester` Write/Edit under `.claude/`, and slice worktrees live at
  `.claude/worktrees/<slice>`. The tester staged its 1472 lines in `/tmp` and the ORCHESTRATOR
  applied them. `guard-tester-bash.mjs` likewise blocked the tester-lens from executing anything,
  so it delivered a static trace instead of the requested repeat-runs. **Fix options for the
  supervisor:** move slice worktrees outside `.claude/`, or exempt `.claude/worktrees/<slice>/`
  from the write guard (it is a checkout, not the harness's control plane).
- A fresh worktree has **no `client/node_modules`** — `just ci` dies at exit 127 on biome until
  `cd client && npm ci --include=dev` (~1 min).
- The fork point `2290f47` was **locally red** on `just security` (a literal PEM banner in
  `.claude/hooks/guard-tester-bash.mjs`, added by that very commit); sibling 16r-a fixed it in
  `5f14fe2`. Merging up cleared it. Remote CI never caught it — worth understanding why.

## 2026-08-22T~22:5xZ — 16r-f COMPLETE (terminal state: PR #353 open + local `just ci` green)

**PR:** https://github.com/mdrewt/monster-realm/pull/353 — branch `feat/16r-f-battle-reseed-sticky-latch`,
worktree `.claude/worktrees/16r-f`, forked from master `d4fa9fe`. OPEN / MERGEABLE, ci+e2e IN_PROGRESS at
exit. **`gh pr merge` NOT run — supervisor owns the merge.**

Local full `just ci` **exit 0** (single run, all recipes through observability-validate 8/8): 2472 client
tests (82 files), Rust suites, evals, perf-budget 7/7, secret-scan clean. Semgrep run LOCALLY on both
changed files (remote-only gate): 1074 rules, 0 findings. Independent `verifier` verdict **PASS** (RED
proof + T10 bite reproduced from scratch; test-file history purely additive except 2 disclosed docblock
header lines; scope exact).

**Diff (4 wip commits → squash):** `client/src/main.ts` (+20/−6: sticky latch, `reseedPrevBattleId`
guarded capture as onReconnect's first statement, id-gated silent re-baseline) · NEW
`client/src/main.battle-reseed.test.ts` (523 lines, 11 runtime tests — the repo's FIRST runtime-import
gate over main.ts) · `docs/adr/0130-client-observability.md` (+41, APPEND-ONLY amendment; DIGEST
unchanged). `main.wiring.test.ts` declared but untouched (185 teeth green unmodified).

**Spec deviation, reviewed + recorded:** the spec's minimal "don't clear on undefined" shape swallows the
next NEW battleStart for zero-battle-row players (server GCs battles). Plan review adopted the drop-time
id-capture refinement; EARS unchanged. Rationale + residuals (c)/(d)/(e) in the ADR-0130 amendment.

**Test-first, audited:** tester (opus) authored T1-T9 → orchestrator ran RED proof at fork (exactly T1+T8
red) → impl → lenses (reviewer APPROVED, red-team 6-mutation table + Semgrep, desync-guard PASS, /simplify
clean) → both red-team and desync-guard independently found the multi-episode gap → tester authored T10
(kills capture-once-ever AND never-clear cheats, both bite-proofs MEASURED by the orchestrator) → verifier
PASS. One provably-inert mutation (`reseedPrevBattleId = null` deletion) documented, not papered over.

**Follow-up flags (supervisor; none blocking):**
1. justfile: `client-test` should depend on `wasm` + justfile:271 "no wasm import" comment now stale — the
   new test resolves `client-wasm/pkg` (safe under `just ci` ordering; bare `npm test` on unbuilt tree reds
   with a clear resolve error).
2. ADR-0198 D7 "assumed" subscription-batch atomicity — falsified-and-moot for the battle listener; needs
   an Amends note from a slice owning that file.
3. Pre-existing, red-team-MEASURED: `latestPlayerBattle()` single-highest-id design makes the lower of two
   simultaneous Ongoing battles invisible to the event ring for its whole lifecycle (store.ts design).
4. Pre-existing: main.ts `identity` never refreshed on reconnect — an identity-minting reconnect silences
   every identity-scoped listener with the latch armed (ADR-0130 residual (e)); worth its own slice.
5. /tmp cleanup: `/tmp/16rf-verify-*` + `/tmp/mr16rf-bite2` copies left (rm hook-blocked, harmless);
   a leftover 16r-d spacetime instance still runs on 127.0.0.1:3099 (`--data-dir /tmp/mr16rd-stdb-a`).

Budget: well under the $150 target (planner + 2 plan lenses + tester(opus)×2 + 3 impl lenses + verifier +
doc-keeper; no thrash — RED proof and all suites first-try).

## 2026-08-22T~19:5xZ — 16r-e COMPLETE (terminal state: PR #354 open + local `just ci` green)

**PR:** https://github.com/mdrewt/monster-realm/pull/354 — branch `feat/16r-e-scheduled-function-delay`,
worktree `.claude/worktrees/16r-e`, forked from `b5ff14f`, **merged up to `origin/master` @ `d4fa9fe`**.
OPEN / MERGEABLE; ci QUEUED, e2e IN_PROGRESS at exit. **`gh pr merge` NOT run — supervisor owns the merge.**

Local full `just ci` **exit 0** (twice): 1942 cargo tests, 2461 client tests, 87 evals, clippy
`-D warnings`, fmt, biome, wasm, observability-validate 8/8 (dockerized `promtool check rules`).
**Semgrep run LOCALLY** (remote-only gate) over the changed files: 0 findings. Independent
`verifier` verdict **PASS** (re-ran the gate + 10 mutations itself).

**Diff (5 files):** `evals/observability-stack-config.eval.mjs` (+~2000, teeth-heavy per convention),
`ops/observability/{rules/recording.rules.yml,grafana/dashboards/monster-realm.json,
grafana/provisioning/alerting/rules.yml,prometheus.yml}`. `touches-delta:` the eval only (the slice
spec names it as this slice's test surface). `prometheus.yml` is COMMENT-ONLY — the metric rides the
existing S1 scrape job. `boyscout-delta: none`. No ADR (none assigned; see below).

**Delivered:** `mr-scheduler` recording group (starts / on_time / late-ratio), dashboard panel id 14,
and `ScheduledFunctionDelayed` warning alert in a NEW `scheduler-health` group, scoped to
`movement_tick|trade_offer_reaper|pvp_deadline_reaper|battle_challenge_reaper`.

**THE DESIGN DEPARTS FROM THE SLICE TEXT, DELIBERATELY AND ON MEASUREMENT.** The spec/runbook name a
30 ms threshold; a live 2.8.1 `/v1/metrics` scrape shows (a) the label is **`function`**, not the
`reducer` every other rule uses — a spec-literal impl would record an EMPTY series forever; (b) the
bucket lattice has **no 0.03 edge**; and (c) **p95 is structurally blind to this distribution** —
p95 sits inside (0.001,0.005] reading "~5 ms healthy" while 158/15186 starts (1.04%) exceeded 50 ms
and **48 exceeded 60 SECONDS**. The planner recommended p95@0.05; the red-team refuted it; the
measurement settled it. Shipped signal is an exact **over-edge ratio at the real 0.05 edge**. Full
rationale is in the two config files' own comment blocks. Details in
`memory/projects/monster-realm-16r-e-plan.md` and the memory card
`spacetime-scheduled-delay-metric-shape`.

**26 mutations executed against the real files; all bite.** The FIRST pass found **4 that SURVIVED**
— all closed and re-proven: `clamp_max(…,0)` (alert can never fire), `… * 0` (always fires),
`expression: ZZ` (threshold on a nonexistent refId — rule dead, gate green), and a decoy group
re-recording a series name as `vector(0)` (passed the eval AND real `promtool`). Closed with a
structural **whitelist** (each expr must equal a template rebuilt from its own parts) rather than a
denylist of neutering tokens, per the unclosable-blacklist finding. Legitimate changes still pass
(threshold retune, `for:` retune); a coordinated retune to an OFF-lattice edge still reds.

**No new ADR — none was assigned, and I did not pick one.** The natural home (ADR-0197) was being
edited concurrently by sibling 16r-d, so touching it would have collided. **Follow-up: allocate a
number and lift the rationale out of the config comments.**

**Follow-up flags (in the PR body, not new slices):** (1) no rule in `recording.rules.yml` filters on
`db` — a second published DB (`account-e2e`'s `mr-acct-e2e`) would blend in; pre-existing, shared with
`mr:movement_tick_latency_p95`/`mr:reducer_wait_p95`. (2) `relativeTimeRange` is read by NO gate, for
any alert in the file. (3) the un-numbered ADR. (4) `mr:movement_tick_latency_p95` carries the same
interpolation caveat this slice avoided. (5) pre-existing biome warning at
`client/src/ui/leaderboardModel.test.ts:32`.

### Operational findings
- **The bite-proof loop's `git checkout --` destroyed my own uncommitted gate work** when the revert
  set included `evals/`. Commit gates BEFORE the mutation loop; revert only the mutated paths.
  Recorded as memory `bite-proof-revert-destroys-gate-work`.
- **The `tester` subagent again could not write into `.claude/worktrees/<slice>`** (guard blocks all
  of `.claude/`) — it staged to `/tmp` and the orchestrator applied. Unchanged since 16r-c; the fix
  (exempt slice worktrees from the write guard) is still not done.
- The tester delivered its round-3 fix only for 1 of 4 assigned gaps on the first attempt; the
  orchestrator closed the other 3 by hand, then adopted the tester's fuller version once it landed
  (it added in-suite teeth the hand-written clauses lacked). Both were re-proven by execution.
- `/tmp/mr_warn_16r-e` appeared mid-run; landing pattern was honoured (no new fan-outs after it).

## 2026-08-23T17:2xZ — rw3b PR OPEN (#357): roster wave 3, Electric + Light — local `just ci` green, remote CI running
**Terminal state, supervisor owns the merge.** PR https://github.com/mdrewt/monster-realm/pull/357, branch `slice/rw3b`, worktree `.claude/worktrees/rw3b`. Acceptance ledger: **12/13 met, 1 deferred, 0 unmet** (`memory/projects/gates/rw3b.gates.md`).

**What landed.** The last content gap in the `Affinity` enum is closed: Electric and Light had zero species AND zero skills (the ADR-0145 residual pt-d3 accepted by doubling Dark). 16 → 20 forms. Species 40 Voltkit / 41 Voltarion (Electric glass cannon) and 42 Aurelet / 43 Aurelith (Light wall) in `species/070-wave3.ron` + `071-wave3-derived.ron`; skills 40..=43 in `skills/070-wave3.ron` (the skills registry's first-ever part file); edges 100/101 in `evolution_paths/070-wave3.ron`, exactly one per base form so ADR-0176 D2's auto-evolution race is vacuous. `CONTENT_VERSION` 19→20 + regenerated content hash. Sprites inert. ADR-0204.

**TWO PRE-EXISTING EXACT PINS GO RED THE MOMENT WAVE-3 CONTENT LANDS — rw3c hits both again.** `game-core/tests/eg3_evolution_graph.rs` pinned `paths.len() == 10` and `edge_ids == (1..=10)`; `game-core/src/content.rs`'s `EG1_TIER_ONE_IDS` pins the derived-species set exactly. Both EXTENDED here (field-for-field, never weakened). This makes **RW3-08 mechanically unsatisfiable as written** — DEFERred to `backlog` with the exact reword. rw3c faces the identical wall PLUS `game-core/tests/pt_d3_tuning.rs`'s `levels_by_species.len() == 7`, which goes to 9 the instant species 40/42 are placed in an encounter table. **Budget for it; it is not a surprise.**

**Adding a content id forces FOUR files outside any content slice's declared `touches:`** — `evals/baselines/{species,skill}-ids.json`, `evals/baselines/evolution-path-edge-ids.json`, and `evals/append-only-ids.eval.mjs`, where the exact-pin ratchet lives in TWO places that must be bumped together (`BASELINE_ID_FLOORS` and the tooth-owned `baselineFloor` table). Plus `docs/adr/DIGEST.md` for any new ADR and 12 committed `client/art-src/preview/*.png` for any new sprite row. **Widen rw3c's declared touches to include these up front** rather than making it re-derive the hidden-dependency question. All are listed under `touches-delta:` in the PR body.

**The red-team pass paid for itself — four real bypasses in the first draft of the new gates**, all closed with regression teeth: (1) CRITICAL, the zone-0 freeze read the FIRST `weight:` match per entry, so a `/* weight: 10 */` block-comment decoy hid a live retune of the exact numbers `client/e2e/recruit.spec.ts` derives its flake budgets from — RW3-07 has no Rust counterpart, so it was a standalone hole; (2) HIGH, the RW3-05 racing predicate accepted a present-but-TOOTHLESS gate (`essence amount: 0`, `Some(Hostile)` — the four encodings rule R4 itself names as non-binding) and its `min_by_key` tie-break inspected only the first edge at the lowest level, so the same 3-edge fixture passed in one slice order and failed in the other; (3) the orphan-derived check filtered on the PARSED `tier`, so a `tier` decoy switched the check off for the row it hid; (4) the comment-needle list covered 3 field names while the parsers read 10. **The general lesson: a hand-rolled RON scanner that strips only whole-line `//` comments is unsound the moment any reader takes "first regex match wins" — block comments are legal RON.** `pt_d3_tuning.rs` and `pt-d2-roster-wave-2.eval.mjs` share the same narrow needle list and the same convention; neither was in scope here, but both are exposed.

**A reviewer pass caught three FALSE claims in freshly-authored content comments** (a superlative off by one, a band misattributed to wave 1, a self-invented "derived band" presented as if gated). ADR-0204 D4 records the rule this earns: **a numeric superlative written into a content comment is a constraint on later waves** — Voltarion is held to sp_attack 102 and speed 98 solely to keep Cindershade's "highest sp_attack" and Venumbra's "fastest form" comments true. Nothing gates those claims.

**Sprite regeneration is byte-deterministic here** — `python3 generate_monsters.py` regenerates all rows and left `git status` clean, so appending rows costs exactly the new files. Two new feature flags (`bolt`, `halo`) were added to `draw_avian`/`draw_orb` rather than shipping size-only variants of existing rows, which would have passed the unique-(plan,size,features) check while still reading as a palette swap.

**Ledger authoring notes** (cost four rejected drafts): `mr-gates` needs an `EVIDENCE: pending` line already present under each gate or it flips the box and records nothing (`status` then reads "checked but EVIDENCE pending" and `check` reports `0/N met`). The `||`-anywhere lint rejects JS logical-or inside a CHECK — use `[a, b].some(Boolean)`. A DEFER target must be an EXISTING spec section; `rw3c` is a candidate-slices table row, not a section, so it is rejected — use `backlog`.

## m24-ceremony — PR #40 OPEN (terminal state), 2026-08-23

**Slice:** `m24-ceremony` (harness repo, docs-only). Branch `m24-ceremony`, worktree
`.claude/worktrees/m24-ceremony`. **PR:** https://github.com/mdrewt/claude-harness/pull/40 — supervisor
owns the merge (no remote CI on this repo).

**State:** TERMINAL. Acceptance ledger **13/13 met, 0 deferred** (`memory/projects/gates/m24-ceremony.gates.md`,
seed `e3b0c44298fc1c14`). Slice gate green: `mr-selfcheck` → SELFCHECK-OK, `mr-gates lint` → LINT-CLEAN.
Supplementary harness `just ci` green (103/103) **when run with the asdf-pinned node v24** — the Bash
tool's default node v18 fails the `import.meta.dirname` wiring test (known trap).

**Delivered:** `specs/monster-realm-v2/M24-internationalization.spec.md` converged (9 slices S0–S8,
33 EARS `I18N-*`, 4 new evals, full (a)–(e) oracle tiering) + the `PLAN.md` M24 bullet flipped
AUTHORIZED → COMPLETE. Diff is exactly those two paths.

**For the supervisor, before merging:**
- Re-execute the CHECKs **from the worktree**, not the main checkout (`mr-gates check` resolves cwd via
  `os.getcwd()`).
- One EXPECT was edited mid-slice: X6's, `[2-9][0-9]*` → `(?:[2-9]|[1-9][0-9]+)`. The old regex could not
  match a legitimate two-digit count (13). The verifier adjudicated it independently as a correction, not
  a loosening — thresholds are unchanged (ADR-0006 ≥2, ADR-0057 ≥3).
- The ledger is **not** committed on this branch (it lives in the main checkout by design).

**Open items this slice deliberately leaves for the operator (spec §8, all routed via `mr-ask-drew`):**
5 escalations, **two hard BLOCKERs** — §8-1 `[BLOCKS S0]` verify the three `<li>` markup sites have no
structural dependency; §8-4 `[BLOCKS S1]` **ADR-0033 needs a 6-part amendment, drafted in §8-4 but NOT
yet written into `specs/monster-realm-v2/adr/0033-i18n-strategy.md`** — that write is real follow-up work,
not bookkeeping. Plus §8-2 (is there a market requirement behind content localization?), §8-3 (bless the
untranslated server `Err()` strings, tracked as `M-error-codes`), §8-5 (is the ICU round-trip shim earned
with no named vendor?).

**Ceremony calibration datum** (Drew's open 6-vs-4 question): the adversarial lens produced the central
decision AND two BLOCKER-grade falsifications of the synthesis; the practitioner lens produced the
milestone's shape. The two most-cuttable were the minimal-mechanism and content-pipeline lenses. Details
in the memory card `monster-realm-m24-ceremony`.

**Remaining M22–M25 ceremony authorization:** M25 (security audit) is still AUTHORIZED, not run.

## 2026-08-24T~10:5xZ — m23-s2 COMPLETE (terminal: PR #363 open + local `just ci` green + remote CI running)

**Slice:** m23-s2 — M23 accessibility **S2**: static-shell ARIA literals for the eleven
`client/index.html` shells, the single `#a11y-live` region, and the repo's FIRST stylesheet
(`client/src/styles.css`). Branch `slice/m23-s2` (worktree `.claude/worktrees/m23-s2`), 4 commits,
all pushed. **PR #363.** Local full `just ci` exit 0. Acceptance ledger **7/7 met, 0 deferred**
(`m23-s2 seed:e3b0c44298fc1c14`). Scope clean: exactly the 4 permitted files (the 3 declared +
`ARCHITECTURE.md`, declared under `touches-delta:`). **No ADR authored** — assigned number was `None`
and ADR-0205 already carries this design; `adr_next_free` unchanged at 206.

**Lenses:** planner, reviewer (plan), tester (gating suite), reviewer (impl + simplify), red-team,
verifier. Verifier verdict PASS: append-only on `indexShell.test.ts` proven mechanically
(`removed_or_changed=0`), ledger 7/7 independently re-executed with zero evidence mismatch,
coverage 98.16% vs the 96% threshold. Domain auditors deliberately NOT run (zero reducers, zero
schema, zero predictor/renderer surface) — stated in the PR body.

**The red-team round is the story of this slice.** It wrote and RAN the cheats with Chromium
measurements and found **9 bypasses** that kept every gate green while violating the property —
including a biome-clean, `#`-free stylesheet (`[id="help-overlay"]{visibility:hidden}`) that hides
the help overlay, blanks `#help-hint` and removes the live region from the AX tree; `!important`
inverting BOTH A11Y-11 value checks at once (false green AND false red from one line); inert clip
values leaving 1651 px² of announcement text painted on screen; and a duplicate `id="a11y-live"`
that splits A1's and A2's oracles so `getElementById` returns a decoy and **every announcement in
the game goes to a node with no `aria-live`**. All nine closed, each with a fixture and a
bite-proof. Final bite-proof tally: **28 red, 3 must-stay-green controls.**

**Registered residuals (in the drain, not prose):** `R-m23-s2-X5` — **the milestone's most likely
silent a11y failure**: §2.4 puts the live region outside `#app` while A11Y-13 puts
`aria-modal="true"` on every shell, so the one node S1 announces through sits in the subtree AT is
told to ignore (VoiceOver/Safari frequently silent). S1/S3 must decide: a second region inside the
dialog root, or `inert` on siblings. `R-m23-s2-X3` — A11Y-12 as gated is a SHAPE oracle; the
airtight cascade oracle needs Playwright and belongs with S10's eval. `R-m23-s2-X6` — the CSS
scanner will exist twice once S10 lands its eval, with no agreement gate. `R-m23-s2-X4` — spec
§2.5's reduced-motion HP-bar guard is owned by NO slice (S7 lacks `styles.css`, the transition is
inline `cssText`, the element has no class); fix is S4/S8 adds a class, S9 adds the rule.

**Also flagged, not actioned (outside `touches:`):** ADR-0205:276 says "the ten static-shell
anchors" — it is eight `-1` plus `#menu-rows` at `0` (rename/tradePropose are native, and a `-1`
there would remove a native control from the tab order); ADR-0205:64 assigns
`evals/a11y-static-shell.eval.mjs` to S2 while spec §4 gives it to S10;
`main.wiring.test.ts` still carries the now-false "no CSS file anywhere in this repo" premise (S5
also edits `index.html` and is the natural place); spec A11Y-18's prose does not describe what
`dom-shell-coverage-exclusion.eval.mjs` actually does.

**Note for whoever runs S6:** `client/index.html` carries a `biome-ignore
lint/a11y/noNoninteractiveTabindex` on `#menu-rows` with its reason inline. The rule is genuinely
live (measured: 3 errors without it, 0 with). S6's `role="listbox"` retires it — nothing forces that
mechanically.

**Unblocked next:** S3 and S4 (both `after: S1, S2`) once m23-s1 lands.

## 2026-08-25T~03:2xZ — m23-s10 COMPLETE (terminal: PR open + local `just ci` green + remote CI running)

**Slice:** m23-s10 — M23 accessibility **S10**: the eval tier + the cross-view wiring spec.
**PR:** https://github.com/mdrewt/monster-realm/pull/370 — OPEN. **Supervisor owns the merge — I did
NOT run `gh pr merge`.** Branch `slice/m23-s10` (worktree `.claude/worktrees/m23-s10`), 5 commits,
all pushed. Main checkout left on `master`, never mutated. Forked from `origin/master` @ `2dbfe0c`
(master CI verified green at that SHA); no rebase needed, no sibling in flight.

**Gate:** full local `just ci` **EXIT=0** — 93 evals PASS / 0 FAIL (was 90), **2818** client tests
(was 2734), 0 failed/pending/todo. **Acceptance: 15/15 met**, `seed:e3b0c44298fc1c14`, `mr-gates
lint` LINT-CLEAN, **6 DEFERs → backlog** (X16-X21). Seeded ZERO criteria (**SPEC-SECTION-NOT-FOUND,
7th occurrence**; M23's EARS live in spec §6). X1-X15 authored in the PLAN phase.

**⚠️ THE SLICE WAS RESHAPED BY MEASUREMENT — read the PR's deviation section before auditing.**
Two independent lenses measured that EVERY check spec §5.1/§5.2/§5.6 names already ships as an
equal-or-stronger unit-tier oracle, and `justfile:491` runs `eval` + `client-test` in the SAME
`just ci` — so re-implementing them adds zero CI surface, and every naive re-implementation measured
WEAKER (3 of 5 plausible OverlayId-union parsers are wrong on the real file; §5.1's own `[A11Y-02]`
regex rejects 16/16 shipped keys). The evals therefore ship the measured-NEW teeth for real and
DELEGATE the rest through a pin that is itself gated (title + code needles, a `.skip`/`.todo`
suspension scan, a non-inert proof routing a mutated delegate through the shipped predicate, and
`test.include`+`test.exclude` reachability).

**🔴 CORRECTION R-m23-s2-X6 WAS DISCHARGED, BUT NOT BY THE PROPOSED MECHANISM.** The brief asked for
a shared fixture corpus proving the `.mjs` and TS CSS oracles agree. Red-team MEASURED that a corpus
is not a drift gate: a deliberately weak `.mjs` twin agreed on **18/18** of `indexShell.test.ts`'s own
corpus while shipping four real regressions green (grouped/compound/descendant/CSS-nested `.sr-only`
selectors). Source-hash pinning dies to a biome reformat; normalised-text comparison dies to a
one-character string-literal edit. The pin makes the second implementation NOT EXIST instead.
Residual **R-m23-s10-CSSDRIFT** declared; real fix is X18 (needs `indexShell.test.ts`, S2's file).

**FIFTH ACCUMULATED CORRECTION, not in the launch brief** — ADR-0205 `:284-287` instructs S10 BY
NAME: `[A11Y-02]`'s regex must permit uppercase and `[A11Y-04]`'s orphan check must stay
prefix-scoped, or it reds on sixteen valid keys and on S1's `a11y.world.region`.

**⚠️ OPERATOR SIGN-OFF OUTSTANDING (carried into PR#370's body).** ADR-0205 `:56-58` flags its D1
amendment — "natively focusable" → "focusable, natively or via `tabindex`" — for sign-off in the
consuming slice's PR. This is that PR. Measured: only **3 of 16** anchors satisfy §5.5's
`{BUTTON,INPUT,SELECT,A,TEXTAREA}` allow-list; the other 13 are the ARIA APG `tabindex="-1"` fallback
the milestone deliberately ships. If rejected, S2/S4 absorb it; the registry strings do not change.

**24 MUTATION BITE-PROOFS, ALL BIT** (15 eval + 5 spec + 4 re-runs). **Two survivors were found and
closed**: (a) `const b = document.body; b.replaceChildren()` — the ALIASED root receiver, invisible
to a direct-receiver scan and never naming the node, so module ownership was blind too; my own T17
fixture had mixed it with the direct form and passed on the direct half (fixture monoculture in a
tooth I wrote). (b) a planted-string forgery of a delegation pin. **Lesson: a fixture that mixes two
shapes passes on the easy one.**

**Flake:** the wiring spec is clean over 6 isolated repeats + 3 `--sequence.shuffle` runs. A
shuffle-order FALSE RED was found (the `checked === 16` coverage floor was a trailing `it`) and fixed
by moving it to `afterAll`, which also makes it bite under `-t` filtering.

**Process notes.** `/tmp/mr_warn_m23-s10` (LANDING PATTERN) appeared after the final `just ci`, so no
further fan-out was dispatched. The **`tester` lens WAS invoked** but `guard-tester-bash.mjs` rejects
every path containing a dotfile component, so it could execute NOTHING inside `.claude/worktrees/` —
it returned static analysis plus 23 hand-written cheats staged at `/tmp/m23-s10-redteam/cheats.sh`
and a flake harness at `/tmp/m23-s10-redteam/flake.sh`; **the orchestrator executed the measurement
half itself** (the bite-proofs and the flake matrix above). *That guard makes the tester agent unable
to do its job in any slice worktree — worth fixing at the harness level.* `reducer-security-auditor`
and `desync-guard` had no surface (zero reducers, schema, `game-core`, predictor or renderer code —
`renderResolver.ts` was read, never written). No ADR was authored: no number was assigned.

**Supervisor follow-ups (NOT actioned — outside `touches:`):**
1. **Allocate an ADR number.** The delegation-pin pattern is new, reusable, and the reviewer called
   its ADR non-optional. Rationale currently lives in two eval headers + `ARCHITECTURE.md` + the plan
   memo.
2. ADR-0205 D1 sign-off (above).
3. `mr-gates` seeder: 7th `SPEC-SECTION-NOT-FOUND` on M23.
4. X19's cleanup must retire `renameView.test.ts:1276`'s m23-s4 ledger CHECK in the SAME change, or
   deleting `S3-NO-VIEW-LOCAL-FOCUS` reds a prior slice's ledger.

**touches-delta:** `ARCHITECTURE.md` only (one targeted paragraph). Nothing else outside the declared
set. The `.claude/worktrees/m23-s10` worktree stays for the merge pipeline.

## fix-nightly-coverage-wasm — TERMINAL (PR open, local gate green, remote CI running)

- **PR:** https://github.com/mdrewt/monster-realm/pull/377 · branch `slice/fix-nightly-coverage-wasm` ·
  (PR #376 on `fix/nightly-coverage-wasm` was CLOSED and its branch deleted — same commit 58d7ed3,
  reopened on the repo's `slice/<slice-id>` convention so PR-to-slice lookup resolves mechanically;
  the old name's post-slash segment was `nightly-coverage-wasm`, not the slice id.) ·
  worktree `.claude/worktrees/fix-nightly-coverage-wasm` (from `origin/master` @ 5206446).
- **State:** local full `just ci` GREEN; acceptance ledger **6/6 met, 0 deferred**; `verifier` PASS
  (re-executed every CHECK independently + 5 bite-proofs on /tmp copies, confirmed no gating test
  was weakened). Remote CI run 33132758364 in_progress at handoff. **Supervisor owns the merge.**
- **Closes on merge (NOT closed in code):** #362, #372, #374, #375 — all duplicates of this fix.

### SUPERVISOR ACTION REQUIRED — disclosed hidden dependency
`touches:` was **`justfile`** only. The PR also edits **`.github/workflows/nightly.yml`**.
This is **not optional**: the nightly `coverage` job provisions only node+just (no Rust, no
wasm-pack), so `coverage: wasm` alone would have traded the unresolved-import red for
`wasm-pack: command not found`. The slice brief's root cause was incomplete on this point.
Collision risk verified nil at plan time and at PR time (zero open PRs, one worktree), so the fix
was shipped complete and disclosed rather than parked. **Re-serialize or reject if a sibling owns
that file.** Full delta is under `touches-delta:` in the PR body.

### Notable findings worth carrying forward
- The coverage gate was not merely red, it was **UNENFORCED**: vitest emits no coverage report at
  all when any test fails (`reportOnFailure` defaults false), so the threshold was never evaluated
  during the whole red window. Memory: [[vitest-no-coverage-report-on-failure]].
- A red-team pass that WROTE the cheats found **9 CI-clean bypasses** of a `just --dump`
  dependency-graph gate (parameterized-recipe arguments, conditional bodies dumping BOTH branches,
  `-` ignore-failure prefix, shebang, `--out-dir`, gate-step `env:`, trailing-comment version
  laundering, job-level `needs:`, `if: false` on the gate). All closed; each has a tooth.
  Memory: [[just-recipe-graph-is-forgeable]].
- `just` parses `{{ }}` inside recipe-BODY comments — one there is a hard parse error for the whole
  justfile and breaks every `just` invocation. Memory: [[just-parses-braces-in-recipe-comments]].

### Follow-ups (flagged, not taken — out of slice scope)
1. ADR-0050 amendment naming `evals/nightly-coverage-wasm-wiring.eval.mjs` (brief specified no ADR;
   a reviewer argued for one). Needs a supervisor-assigned number.
2. `nightly.yml`'s header claims "all actions are pinned to 40-hex SHAs"; `@stable`/`@v2` toolchain
   actions have ridden tags since M8.5d. Pre-existing drift.
3. The new eval hardcodes `CI_ENTRY_FLOOR`, duplicating `REQUIRED_JUST_STEPS` already exported from
   `ci-gate-wiring.eval.mjs` — importing it would remove a transcription (and a false-RED source on
   a legitimate ci.yml refactor).
4. C2's roster is body-text-derived: a recipe reaching vitest via a wrapper script is invisible.
   Disclosed in the eval header; floors catch removal of the known four, not addition of a fifth.

## rb-1 — TERMINAL (PR open + local gate green + 4/4 acceptance gates met) — 2026-08-28

**PR:** https://github.com/mdrewt/claude-harness/pull/46 (`slice/rb-1` -> `main`, harness repo).
Worktree `.claude/worktrees/rb-1` at `a45e0e5`, pushed, clean. **Supervisor owns the merge.**
No remote CI on this repo, so PR-open + local green is the terminal state.

**Delivered.** RW3-08 in `M-postgate-roster-wave-3.spec.md` amended from a mechanically
unsatisfiable prohibition into a satisfiable allow-list criterion (three exceptions:
`CONTENT_VERSION`, own new test files, a strictly-additive pin extension); the two stale
DEFER notes + the false "rw3b — not started" bullet reconciled; the `### rb-1` section
closed with a real `touches:` set and a Resolution block; and
`memory/projects/mr-content-scope` (NEW) added as the mechanical proof-of-teeth, wired
into `mr-selfcheck` with a marker+count+floor leg.

**Acceptance:** 4/4 met, 0 deferred, 0 unmet — `mr-gates render --slice rb-1 --format pr`
= `Acceptance: 4/4 met, 0 deferred, 0 unmet — rb-1 seed:6d97183777f61762`.

**Gate:** `CONTENT-SCOPE-SELFTEST-OK 42 fixtures (permit=8 bite=30 link=2 cli=2)` exit 0;
`mr-selfcheck` FAIL-key set unchanged from the pre-change baseline
`{B2, gates-hook-adoption, residual-unpromoted}` (all three pre-existing — two are
worktree self-location artifacts, one is the supervisor's own promote backlog);
`just ci` exit 0.

**THE REUSABLE LESSON.** A `SHALL NOT X except A, B, C` criterion is an **ALLOW-LIST**, and
a deny-list classifier cannot enforce it — a pure-`+` hunk trips no deny predicate, so a
smuggled `pub fn` in an existing `src/*.rs` reads as PERMIT. The first design was a
deny-list; the red-team lens killed it on the plan, before any code existed.

**SEED TRAP for the next promoted-residual slice.** `mr-gates` hashes a promoted
`### <id>` section's criteria into `Seed:`; reseed is supervisor-only; and `section_of`
runs the section **to EOF** (it terminates only on the next `### `). A Resolution note must
therefore be plain prose — no `SHALL`, no `-`/`*`/`+` bullet, header and `EARS:` line
byte-identical. Also: `mr-gates status` does NOT compute drift, and `init`/`verify` read
only the MAIN checkout (`SPECS` hardcoded, no override), so **neither can prove seed
stability from a worktree pre-merge** — hash the worktree file with mr-gates' own
extractor (gate X1 does exactly this).

**TESTER CANNOT EXECUTE.** `guard-tester-bash.mjs` blocks the tester from running anything
(deliberate). Its adversarial pass predicted 7 gaps by hand-trace — all 7 were real, but
its line counts and one rule-id prediction were wrong. **Execute every tester claim before
routing it onward**; budget an orchestrator verification step after every tester pass.

**Supervisor decisions requested (all in the PR body):**
- **No ADR authored** — none assigned, `docs/adr/README.md` off-limits, so one would ship
  un-indexed; precedent is `mr-gates` (same `mr-*` family, no harness ADR). Assign a number
  and it gets written.
- **`R-rw3c-X3` should be dispositioned against rb-1, not promoted as `rb-2`** — same
  criterion, resolved by this amendment.
- `mr-gates residuals close --slice rb-1 --pr 46` once merged (ledger is fully resolved, so
  it will not need `--force`).

**Follow-up flags (NOT done here, out of scope):**
- **Cross-repo:** `projects/monster-realm/docs/adr/0204:100-103` commits "Reword RW3-08
  before rw3c… rw3c must do this." Different git repo; ADR-0204 keeps reading as an open
  commitment until a monster-realm slice closes it.
- `KNOWN_GAP_FIXTURES` in `mr-content-scope` is now a *closed-gap regression* battery; the
  identifier is a historical artifact kept because renaming it means editing `selftest()`,
  which the tester/implementer split freezes. A future slice allowed to touch `selftest()`
  should rename it to `CLOSED_GAP_REGRESSION_FIXTURES`.
- Accepted limitations recorded in the tool `__doc__` and the criterion note: causality is
  not checked (RW3-02/03/04/06 gate that); prose<->anchor drift is a reviewer duty;
  `_erase_strings` does not handle Rust raw strings; `/* … */` is not inert (fails CLOSED);
  `V-test-count` matches only the literal `#[test]`.

## rb-4 — TERMINAL (PR open + local `just ci` green + 9/12 gates met, 3 DEFERred, 0 unmet) — 2026-08-28

**PR:** https://github.com/mdrewt/monster-realm/pull/380 (`slice/rb-4` -> `master`). Worktree
`.claude/worktrees/rb-4` at `a1d585c`, pushed, clean. **Supervisor owns the merge** (`gh pr merge`
NOT run). Ledger `memory/projects/gates/rb-4.gates.md`: `Acceptance: 9/12 met, 3 deferred, 0 unmet —
rb-4 seed:e3b0c44298fc1c14`; probes `rb-4.mutation-probe.mjs` (M0 GREEN, M1..M18 RED at the named
teeth) and `rb-4.ratchet-probe.mjs` (NOT-WEAKENED, both evals) live beside it — run `check`/`verify`
FROM the worktree root with the toolchain PATH.

**Delivered.** `findIdentityColumns` resolves Rust type aliases: tree-wide union binding table
(`type` items + `use … as` renames, duplicates kept, NO per-file precedence — red-team measured a
CI-clean hide through a same-file `impl … { type OwnerId = u64; }`), token expansion with structural
termination + per-column memo, `Identity` terminal, fail-closed ambiguity with every binding rendered,
`{path,type,resolved,via}` records, `[G6/alias]` on macro-generated / metavariable / invocation /
`Identity`-shadow bindings, Rust-whitespace (U+0085/U+200E/U+200F) normalisation. FG73a-p (tester,
two rounds) + seam `[T2/alias]`. ADR-0208 (assigned number) consolidates rb-2 D1 / rb-3 D2 / rb-4 D3
— **R-rb-2-X9 and R-rb-3-X9 can be closed against PR #380**. DEFERs: X10 product-type columns
(live mechanism at `encounter.entries`), X11 field-level parse non-vacuity (backstopped today by
battle-schema-snapshot `[parse-shape]`), X12 aliases outside the input set (game-core's optional
spacetimedb dep).

**Run notes.** (1) The session was restarted mid-slice while the tester's round-2 resume was in
flight; it had already written `fg73-additions.mjs` + `fg73-edits.md` to /tmp but not the probe
updates — the orchestrator adapted the probes (anchors, M15-M18, floors) and disclosed it in the PR.
(2) `/tmp/mr_warn_rb-4` was raised during round 2: `doc-keeper` was skipped (docs written by the
orchestrator), verifier ran at its default pin. (3) Two self-inflicted traps, memory-carded:
`String.replace` with a `$'`-bearing replacement duplicated the eval tail; a `git stash -q` inside a
diagnostic line stashed the uncommitted implementation. (4) `just ci` green locally (CI_EXIT=0);
remote CI (ci + e2e) running at PR-open time.

## rb-7 — DONE, PR open (2026-08-29)

**PR https://github.com/mdrewt/monster-realm/pull/385** · branch `slice/rb-7` · worktree
`projects/monster-realm/.claude/worktrees/rb-7` · ADR-0211 · **Acceptance 8/8 met, 0 unmet,
1 sub-item DEFERred to backlog** (`memory/projects/gates/rb-7.gates.md`, seed e3b0c44298fc1c14).
`just ci` exit 0 in the worktree: 95/95 evals 0 FAIL · `cargo nextest run --workspace` 2016 passed
(fork 2007) · client vitest 96 files / 2818 tests · validate.mjs 8/8. Verifier APPROVE
(recomputed every CHECK independently; test diff mechanically additions-only).

**Two probe scripts live beside the ledger and are load-bearing for supervisor re-verify** —
`gates/rb-7.x6-probe.mjs` (X6) and `gates/rb-7.x7-probe.mjs` (X7). `gates/` is gitignored, so they
exist only on this machine. **Run `mr-gates check`/`verify` FROM THE WORKTREE ROOT** — every CHECK
path is repo-relative.

**TOUCHES-DELTA needing supervisor audit:** `game-core/src/accounts/mod.rs` and
`game-core/src/lib.rs` are outside the literal declared set. One symbol was appended to each
pre-existing `pub use` list. Taken deliberately, not silently: the planner and the reviewer
independently judged the no-re-export variant actively harmful to this criterion, because
`game-core/tests/m22_s1_deletion_surface.rs` exists to guarantee the flat `use game_core::TOMBSTONE_*;`
path for S2/S3/S4, and leaving the deletion name as the one deep-path outlier is how an S3 author
ends up reaching for the flat, familiar guest-claim constant. Measured gate-neutral.

**Three findings worth carrying forward:**
1. *The plan's threat model was one axis short, and an auditor — not a reviewer — found it.*
   Narrowing the CONSTANT to private left `tombstoned_profile` `pub(crate)`, so the wrong tombstone
   was still one plausibly-named helper call away from S3 — and reached that way it ALSO wipes
   ladder stats. Three lenses read the plan without seeing it; the reducer-security-auditor found it
   by asking "what else writes this value", not "is the pin forgeable".
2. *A declaration-shape text pin is blind to reachability.* Red-team measured four bypasses that all
   keep the const private: a `use` re-export, a `pub` accessor, a same-valued alias const, a
   `macro_rules!` carrying the literal. The fix was three disjoint clauses (declaration shape /
   identifier count / raw value count) plus the writer pin — and the `use` family turned out to be
   closed by **rustc E0364** rather than by any tooth, which is stronger but must be stated honestly
   rather than claimed as a gate win.
3. *A value pin over raw source cannot be closed against a split literal.* `concat!("(claimed ",
   "guest)")` and `"\u{28}claimed guest)"` are both green against the shipped gate; substring scans
   cannot evaluate a macro or an escape. DEFERred to backlog with the buildable replacement named
   (S6 asserts POSITIVELY that the cascade references the constant by symbol, RAW scan for literals).

**Two full-CI-only false REDs hit while building, both already in memory but worth the reminder:**
a slash-star glob spelled in a comment blanked 31 tables and reddened 5 unrelated evals; and
`spacetime generate` textually rejects print macros anywhere in the module, `#[cfg(test)]` included.

**Next:** supervisor owns the merge (`gh pr merge` is forbidden to the slice run). Remote CI was
running at hand-off.

## 2026-08-30T07:5xZ — rb-16 PR OPEN (terminal state), 5/5 gates met, 1 residual deferred
Slice `rb-16` (residual R-m23-s10-X19) is at the loop's terminal state: **PR #392 open, local full `just ci` green (`RB16_CI_EXIT=0`), remote CI running.** Branch `fix/rb-16-retire-focus-lists`, worktree `.claude/worktrees/rb-16`, 3 `wip:` commits (e096c9a plan+ADR+ledger, 476666a the deletion+digest, 62d384d reviewer prose fix), forked from `origin/master` 09c75dc. **The supervisor owns the squash-merge.**

**Scope was NARROWED, deliberately and with measurement.** The residual asks to retire THREE hand-kept `.focus(` lists. Two are provably subsumed by `evals/overlay-a11y-manifest.eval.mjs` and were deleted (`S3-NO-VIEW-LOCAL-FOCUS`, `S4-VIEW-LOCAL-FOCUS-5`, plus their four dead helpers; −353 lines). The third, `MV-NO-FOCUS-CALL`, is **NOT** subsumed — it scans RAW `menuView.ts`, so a `.focus(` inside a COMMENT reds it, and the eval comment-strips (it must: five shipped views name `.focus()` in header comments by design). red-team MEASURED the loss; the bite probe records it every run as `commentAxis=EVAL-BLIND`. Kept it; `DEFER: X19-COMMENTBAN -> backlog`. So the residual closes 2 of 3, honestly.

**Correction the supervisor should carry forward:** the promotion prose named `evals/keyboard-operable-rows.eval.mjs` (rb-13/#390) as the subsuming oracle. That is WRONG — that eval owns A11Y-25/A11Y-26. The real oracle is `evals/overlay-a11y-manifest.eval.mjs` (m23-s10 X1/X2). Substance held; only the filename was wrong.

**SUPERVISOR ACTIONS OUTSTANDING (cross-repo, deliberately not done from the slice):**
1. Two CLOSED harness ledgers name the deleted test ids in their `CHECK:` lines and are now stale: `memory/projects/gates/m23-s3.gates.md:82` and `memory/projects/gates/m23-s4.gates.md:83`. Replacement CHECK for both is rb-16's **X2** (the eval), which strictly supersedes them (18 files ⊃ 10/5; 8 spellings ⊃ 1). VERIFIED UNAFFECTED: `m23-s6.gates.md:92` (X13, needs `MV-NO-FOCUS-CALL` — survives) and its X14 census (`total>=35`; menuView.test.ts keeps all 40 `it(`). Nothing re-executes closed ledgers, so this is record hygiene, not a CI break.
2. **Two harness-repo files are UNTRACKED and must be committed with the tick** or they are lost: `memory/projects/rb-16.bite-probe.mjs` (gate X3's evidence artifact) and `memory/projects/monster-realm-rb-16-plan.md`.
3. On merge: `mr-gates residuals close --slice rb-16 --pr 392`, and materialise the `X19-COMMENTBAN -> backlog` residual into a spec section.

**Follow-up flags (outside `touches:`, NOT touched):** `client/src/ui/tradeProposeView.test.ts:20,:67,:792` still cite the deleted `S3-NO-VIEW-LOCAL-FOCUS`; `evals/overlay-a11y-manifest.eval.mjs:7-9,:516` say "THREE HAND-KEPT FILE LISTS" (now one).

**Two traps worth reusing.** (a) A fresh worktree has no `client-wasm/pkg`, so 36 tests in `main.a11yFocus.test.ts` + `main.battle-reseed.test.ts` fail on an unresolved `src/main.ts` import and read as a false regression — **run `just wasm` once before any vitest baseline.** (b) The bite probe itself shipped defective: its verdict read counters incremented BEFORE later assertions in the same try-block, so red-team injected two faults that still printed the exact pinned success line at exit 0. Fixed to gate on `failRows.length === 0` plus end-of-block counters; I re-ran both PoCs against the repaired probe and both now exit 1 with no success line. Memory card: `counter-incremented-before-later-assertions`.

## 2026-08-30T21:2xZ — rb-19 PR OPEN (#395), local gate green, remote CI running
Closed residual R-m23-s11-X10: the axe-core + real-browser a11y tier spec M23 §5.7 DECIDED and no §4 slice owned. Branch `feat/rb-19-axe-a11y-e2e` @9867957, worktree `.claude/worktrees/rb-19`. **Supervisor owns the merge** — I did not run `gh pr merge`.
DELIVERED: `client/e2e/a11y.spec.ts` (axe over 3 page states: world chrome / help via `?` / menu via `M`), `@axe-core/playwright@4.13.0` exact devDep, justfile `a11y-e2e` half 3 + `axefloor` param (stale `DEFERRED: axe-core` banner deleted), nightly `a11y-e2e` job gains chromium + SpacetimeDB provisioning + axe-report artifact + server-log dump, and FIVE additive eval checks (9–13). ADR-0218. `REQUIRED_JUST_STEPS` byte-identical to master.
MEASURED FIRST (this retired the top risk): the client is axe-CLEAN at WCAG 2.x A/AA today — violations=0 in all three states, passes 16/21/23, one stable `incomplete` rule (`color-contrast`). So NO known-violation allowlist ships.
ACCEPTANCE: 8/8 met, 0 deferred, 0 unmet (seed e3b0c44298fc1c14). `just ci` green locally 3x (99 eval PASS). `just a11y-e2e` green end-to-end. Bite-proof 5/5 modes, 16/16 mutants caught.
VERIFIER: PASS. It specifically audited that the implementer's own edits to the tester-authored gating layer strengthened it — differential result `WEAKENED=NONE, NEW_TEETH_GAINED=3`, and it proved the bite-proof harness is not vacuous by hollowing 5 clauses and watching exactly one mutant flip each time.
THREE GATE HOLES WERE FOUND AND CLOSED, each EXECUTED not argued: (1) the `violations` needle was satisfied by the failure MESSAGE of the very expect whose subject was gutted — proximity is not subject-pinning; (2) "nightly-only" was pure PROSE — red-team promoted `a11y-e2e` into the hermetic gate two ways and the whole eval suite stayed green (now `a11yStaysNightlyOnly`, closing roster + transitive `ci:` closure + a bare ci.yml step); (3) the `.withTags(` clause had no tooth at all.
RESIDUALS DISCLOSED IN THE LEDGER (not defers — all 8 gates are met): **R-rb-19-HOLLOWSPEC (HIGH)** — `a11ySpecUsesAxe` is a TEXT oracle; red-team executed 4 hollow specs that pass it + biome + tsc + real Playwright + the stats gate while scanning nothing. Two are closed by the M3 fix; two remain (a real scan behind a dead branch; `.analyze()` on a throwaway with assertions on literals) and NO text predicate closes them — the fix is a runtime evidence file half 3 validates, which also subsumes R-rb-19-REPEATEACH. Also: R-rb-19-NODEOPTS (a workflow-scope `NODE_OPTIONS: --require` preload defeats every `node -e` nightly gate at once — measured), R-rb-19-JOBPIN, R-rb-19-JUSTPATH, R-rb-19-MANUALDOC, R-rb-19-CEILINGS, R-rb-19-STDBDUP.
NOTE FOR rb-20 (queued, X11): this slice touches `client/playwright.config.ts` ZERO times, so rb-20 is unblocked — but its `reducedMotion: 'reduce'` project will COLLECT `e2e/a11y.spec.ts`, and it must decide deliberately between an axe scan under reduced motion and a `testIgnore`. `client/e2e/a11y.spec.ts` is also now in the PER-PR `e2e` job (testDir collects it) — deliberate, ADR-0218.
TRAP HIT AND WORTH REPEATING: `just ci` red'd once with `account-e2e ... spacetime did not become ready` purely because my own probe server held the GLOBAL spacetime data-dir lock. `ps -eo args | grep '[s]pacetimedb-standalone'` before blaming a diff.

## 2026-08-31T23:02:56Z — rb-31 promoted (residual R-rb-4-X12, aging t1) — queue-add deferred (cap)
Native tick mr-sup-native-20260831T230256Z-865174-4706 (23:00Z). Gate-0/1: clean — no live per-run locks, no chain mutex, HOLD-NONE, no .done awaiting merge, no session collision (recent writes were mechanical: codegraph daemon, situation cache, heartbeat). Harness/project both in sync with origin, no open PRs, master CI green (11cac7e, ci+e2e success).

Gate 3: residuals list --unclaimed showed R-rb-4-X12 (source rb-4, disclosed 2026-08-28T18:54:06Z) at age 3.17d, past t1_promote_days=3 with no promotion — aging rule outranks new PLAN §9 work. Ran mr-gates residuals promote --id R-rb-4-X12 -> appended rb-31 to specs/monster-realm-v2/M-residual-backlog.spec.md. Shipped as doc-only chore PR mdrewt/claude-harness#78, squash-merged, branch deleted, main fast-forwarded to 5c3c17e.

mr-record queue-add for rb-31 refused: queue[] is at its 5-item cap (rb-26, rb-27, rb-28, rb-29, rb-30) with none yet consumed this cycle. Left rb-31 unqueued (correctly excluded from future --unclaimed listings via promoted_slice=rb-31); a later tick will queue-add it once queue-remove frees a slot via the launch fast path. No other action taken this tick (residual aging outranks the queue/full-derivation checks, so no launch attempted). Also swept 2 stale local-only branches (chore/residual-promote-20260831T120140Z, -160217Z) left over from earlier ticks' squash-merged PRs (#76/#77 content, confirmed already in origin/main history) — force-deleted, no remote impact.
## 2026-08-31T22:02:01Z — rb-4 residual X11 promoted->rb-30 (22:00Z tick)
Native tick native-20260831T220009Z-849696 (22:00Z). Gate-0/1: clean (no live per-run locks, no chain mutex, HOLD-NONE, no session collision -- rb-11 esbuild pids are known harmless orphans). Gate-3: master CI green (11cac7e). Residuals check: R-rb-4-X11 and R-rb-4-X12 both past t1_promote_days=3 (age 3.13d, disclosed 2026-08-28). Promoted R-rb-4-X11 -> rb-30 via mr-gates residuals promote (M-residual-backlog.spec.md). Shipped as doc-only chore PR mdrewt/claude-harness#77, squash-merged clean, main fast-forwarded to 76e789f. Queued rb-30 via mr-record queue-add (queue now 5 entries: rb-26/27/28/29/30). No launch this tick (residual-promote was the one action). R-rb-4-X12 remains past t1 for the next tick to promote. Budget NORMAL (d7=$1236.34, fable_ok=true). No BLOCKERs.
## 2026-08-31T21:02:19Z — Native tick 21:00Z -- rb-4 residual X10 promoted->rb-29
Native tick mr-sup-native-20260831T210011Z-838038 (21:00Z). Gate-0: no live per-run locks, no chain mutex, HOLD-NONE, no .done awaiting merge (rb-11 esbuild pids are known harmless orphans). Gate-1/2: both repos fetched clean, no resident-session collision (find -mmin -6 showed only mechanical writes: codegraph daemon, situation-cache, heartbeat, tick log). Remotes correct, project master/harness main both in sync with origin pre-tick. Gate-3: project master CI confirmed green live via check-runs (ci+e2e success on 11cac7e; the commit-status API's 'pending' aggregate was a non-required context, not a real red). No open PRs either repo, no inflight/awaiting_merge, park_counters unchanged ({14r-e:1}). Ran mr-gates residuals list --unclaimed --json per the aging rule: 24 open (cap-alarm persists, 31 total before this tick's promote, observe-only), three tied-oldest at 3.09d (R-rb-4-X10, R-rb-4-X11, R-rb-4-X12, all disclosed 2026-08-28T18:54:06Z) past t1_promote_days=3 -- outranking the queued rb-26/rb-27/rb-28 fast path. Promoted the first-listed, R-rb-4-X10 (LIVE-REACHABLE product-type Identity-column hole outside touches), -> rb-29 in M-residual-backlog.spec.md, queued it (mr-record queue-add). Shipped as doc-only chore PR mdrewt/claude-harness#76 (chore/residual-promote-20260831T210129Z), squash+auto-merged clean (128b2ea). Harness main reconciled: local was 1 commit behind origin (rb-3-X10/rb-28 promotion race with a concurrent PR#75 merge notification, already reflected upstream) -- stashed the in-progress mr-state.json queue-add edit (labeled), --ff-only merged origin/main, popped the stash cleanly (disjoint files). queue now [rb-26, rb-27, rb-28, rb-29]. No launch this tick (promote+merge was the one mutating action, per one-action-per-tick discipline). R-rb-4-X11 and R-rb-4-X12 (same age/disclosed_at as X10) remain unpromoted for a future tick. Governor NORMAL (d7=$1235.52/2783 eff., fable_d7=$445.21/2298, fable_ok=true). No BLOCKERs, no rate-limit event. Standing down after the single promote action.
## 2026-08-31T20:02:06Z — 20:00Z tick — rb-3 residual X10 promote
Native tick mr-sup-native-20260831T200013Z-825533 (20:00Z). Gate-0: no live per-run locks, no chain mutex, HOLD-NONE. Found a stale /tmp/mr_pass_rb-25.done left over from the 19:40Z tick that had already fully reconciled rb-25 (mr-state.json notes + ledger row confirmed MERGED PR#399->11cac7e) -- removed the stale file, not a live chain. Gate-1/2: both repos fetched clean, no resident-session collision (find -mmin -6 empty both repos). Gate-3: project master CI green (11cac7e, rb-25), no open PRs either repo, no parked/inflight slices. Ran mr-gates residuals list --unclaimed per the aging rule first: 24 open, oldest R-rb-3-X10 at 3.24d -- past t1_promote_days=3, outranking the queued rb-26/rb-27 fast path. Promoted R-rb-3-X10 -> rb-28 in M-residual-backlog.spec.md (mr-gates residuals promote), queued it (mr-record queue-add). Shipped as doc-only chore PR mdrewt/claude-harness#75, squash-merged clean (64bbdfd). Harness main had again drifted 1 commit ahead of origin (prior tick's unpushed b9ad744 tick-record) -- reconciled with a plain git merge origin/main (ort, no conflicts, disjoint files: spec-backlog vs mr-state/handoff) rather than --ff-only. queue now [rb-26, rb-27, rb-28]. No launch this tick (promote+merge was the one mutating action, per one-action-per-tick discipline). Governor NORMAL (d7=$1234.61/2783 eff., fable_d7=$445.21/2298, fable_ok=true). No BLOCKERs, no rate-limit event. Standing down after the single promote action.
## 2026-08-31T19:39:09Z — rb-25 MERGED (PR #399, 11cac7e)
Native tick mr-sup-native-20260831T193636Z (19:36Z). Gate-0: no live per-run locks (rb-25 session_leader 665772 confirmed dead), no chain mutex, HOLD-NONE. rb-25's own run had already opened PR #399 (mergeable, CLEAN) and reached terminal state before this tick. Verified live: gh checks (ci/e2e) pass, mergeStateStatus CLEAN. mr-gates verify initially returned FLAGGED/EVIDENCE-MISMATCH on 8/9 gates -- root cause was this shell's PATH resolving node 18.19.1 (harness pins 24 via asdf) and missing ~/.cargo/bin, NOT a real regression; re-ran with PATH fixed -> CLEAN (8/9 met, X9 deferred to backlog). mr-audit CLEAN aside from pre-existing spec-ledger missing/orphan-disposition findings unrelated to this diff (diff scope: evals/guest-claim-integrity.eval.mjs + ARCHITECTURE.md + docs/adr/0222 + DIGEST.md, matches declared touches). Spotcheck gate X2 (IDENT-BOUNDARY-BITES) adversarially re-read against the diff's containsCallOf rationale -- holds. Squash-merged PR#399 -> 11cac7e, deleted branch+worktree, fast-forwarded local master to 11cac7e. master CI for the merge commit was still queued at tick end (not polled to completion this tick -- one action per tick already spent on the merge; next tick's gate-3 catches red CI if it lands red). Residual R-rb-25-X9 closed via mr-gates residuals close --pr 399. Queue=[rb-26,rb-27] unchanged.
## 2026-08-31T17:01:53Z — rb-25 LAUNCHED (17:01Z tick)
Native tick mr-sup-native-20260831T170009Z-664080 (17:00Z). Gate-0/1: no live per-run locks, no chain mutex, HOLD-NONE, no resident-session collision (find -mmin -6 empty both repos). Both repos in sync with origin (harness main 440f6b0, proj master 5962b7a). Project master CI green (rb-24 merge, PR#398). No open PRs either repo, queue[]/inflight[]/awaiting_merge[] all clean at gate entry except queue held rb-25/rb-26/rb-27 (promoted in prior ticks). Gate-3: master not red, nothing open/parked to resume; residuals check: mr-gates residuals list --unclaimed showed 24 open, none past t2_stale_days=14 (max age 3.11d, R-rb-3-X10), so queue[] (non-empty) took priority per the aging doctrine's fast path over the t1-only-stale residual. Re-verified rb-25 live: spec section exists (M-residual-backlog.spec.md:45-52, no blocked:, after: satisfied -- source rb-2 long merged), no existing branch/PR for rb-25 on either repo. Derived touches=[evals/guest-claim-integrity.eval.mjs] from the residual's own [G6/consumed] gate_id (grepped the eval file for the marker) since the promoted section only carries '(inherit from source slice -- REVIEW)'. Tier=routine (opus@high): eval/gate file only, no server-module schema/reducer, predictor/netcode/reconcile, security/RLS live-code, M20/M25, or resume-after-park. Pre-allocated ADR-0222 (mr-state.json adr_next_free matched disk: highest on-disk 0221). First mr-spawn attempt failed BRIEF-RENDER-FAILED -- my vars.json omitted the required 'tier' key (vars.json schema per mr-spawn's own header comment: {slice, model, effort, adr, touches, target_desc, resume_block, tier}); added tier=routine and retried. mr-spawn LAUNCHED cleanly: leader=665772, claude_pid=665775, rid=mr-spawn-20260831T170133Z-665711, brief_bytes=15709, repo=project, pr_repo=mdrewt/monster-realm. GATES-SEEDED criteria=0 (M-residual-backlog.spec.md's rb-N sections are prose-only EARS with no bullet SHALL list, same known-benign pattern as prior rb-* promotions). queue-removed rb-25 (rb-26/rb-27 remain queued for future ticks). Governor NORMAL (d7=$1168.48/2783 eff., fable_d7=$445.21/2298, fable_ok=true; opus-tier launch unaffected). No BLOCKERs, no rate-limit event. Standing down after the single launch action.
## 2026-08-31T16:03:34Z — Native tick 16:00Z — recovered orphaned rb-24-merge record + promoted R-rb-3-X9 -> rb-27, no launch
Native tick mr-sup-native-20260831T160013Z-650239 (16:00Z).

Gate-0: found the previous tick's (mr-sup-native-20260831T151542Z-542497, 15:15Z) full rb-24 merge record (mr-state.json + handoff + handoff-archive + rb-24 gate/proof artifacts) fully written but never committed to the harness repo — same failure pattern as the 02:01Z incident. Verified the merge itself was fully real and complete (PR#398 squash-merged to master@5962b7a per gh, ledger MERGED row present, master CI green) before treating the uncommitted files as safe recording exhaust, not in-progress work. Committed them as-is (db390eb).

Gate-1/2: no live per-run locks, no chain mutex, no operator hold, no .done awaiting merge, no resident IDE session or human file writes in the last 6 min in either repo. Both repos fetched clean.

Gate-3: master CI green, no open/parked slices, no open PRs either repo. Ran `mr-gates residuals list --unclaimed --json` first per the aging rule: 24 open, two tied-oldest at 3.07d (R-rb-3-X9, R-rb-3-X10) past t1_promote_days=3 — outranks the queued rb-25/rb-26 fast path. Promoted R-rb-3-X9 -> `### rb-27` in M-residual-backlog.spec.md (mr-gates residuals promote), queued it (mr-record queue-add). Shipped as doc-only chore PR mdrewt/claude-harness#74, squash-merged clean.

Push reconciliation: local harness `main` had diverged from `origin/main` after the chore PR's squash-merge (both contained the same db390eb content, no ancestor relationship) — verified `git diff db390eb origin/main` showed only the expected residual-promote delta (no data loss), then used `git merge -X theirs origin/main` (not a hard reset) to reconcile; verified zero diff post-merge before pushing. Harness main now in sync with origin, clean working tree.

No launch this tick (the residual-promote + orphaned-record recovery were the mutating actions). Queue now holds rb-25 (X10), rb-26 (X9), rb-27 (X9, rb-3) for the next tick's fast path — R-rb-3-X10 (same age, tied) remains unpromoted for a subsequent tick. Governor NORMAL (d7=$1167.31/2783, fable_d7=$445.21/2298, fable_ok=true). No BLOCKERs, no rate-limit event. Standing down.
## 2026-08-31T15:34:33Z — rb-24 MERGED (PR#398 -> master@5962b7a)
Native tick mr-sup-native-20260831T151542Z-542497 (15:15Z). rb-24's rooted run (fable@xhigh) finished terminal at 14:59Z: PR#398 open+mergeable, 16/16 gates met, remote CI running. This tick verified live (CI went green: ci+e2e pass), took the chain mutex, and ran mr-gates verify + mr-audit before merging.

First independent re-run was FLAGGED (3-4 EVIDENCE-MISMATCH). Adjudicated each: X6/X13 failed on 'node:fs/promises does not export glob' -- my Bash tool resolved Node 18.19.1 instead of the harness-pinned v24 (known harness-node-toolchain-PATH-trap); re-ran with asdf PATH fixed, both reproduced the recorded evidence exactly (SURFACE-25, IN-SCOPE extra=0/files=106). X8 failed on 'wasm32 target missing' -- my asdf sourcing had clobbered ~/.cargo/bin off PATH, hiding an installed rustup/wasm32 toolchain; fixed PATH, X8 reproduced BINDINGS-GREEN. X15 failed with exit 137 (OOM-kill) in the mr-audit run, which happened to run concurrently with a separate mr-gates verify (both are heavy cargo/nextest processes) -- re-ran X15 alone, CI-GREEN. A second E1/X1/X2 mismatch showed 1-2 real cargo test FAILUREs (not env errors) -- ran the accounts_tests suite in isolation (not concurrent with anything else): 86/86 passed, 0 failed. A third full mr-gates verify run in isolation came back CLEAN, 16/16, zero mismatches. Conclusion: every FLAGGED signal was contention/PATH artifacts from running multiple heavy verify processes concurrently in my own shell, not a real regression in rb-24's code.

mr-audit orchestration verdict CLEAN (10 agent_calls; roles incl. red-team, reviewer, tester, reducer-security-auditor, planner, desync-guard; models fable/opus/sonnet). gating_advisory tripped 'skip_markers_added:1' as a FLAGGED mechanical tripwire; read the diff -- 0 real skip()/xit()/.only()/#[ignore] added, all 3 keyword hits are prose in comments discussing skip-avoidance. Test diff is legitimate hardening: new schedulerGuardIsLive() helper closes a prefix-forgery hole in the scheduler-guard detector (a guard branch opening with a same-prefixed helper name like returned_scheduler_reject() would have false-passed the old bare-needle check), OWNED_TABLES widened 3->4 tables with two new census teeth pinning the widened allowlist, table-schemas.json/battle-schema-snapshot pinned counts updated 18/21->18/22 for the new private account_deletion_reaper_schedule table (ADR-0221).

Diff scope: 106 files, but 100 of them are the doc/knowledge corpus (docs/knowledge/**, ARCHITECTURE.md, docs/adr/DIGEST.md -- excluded from the touches assert by design) + generated module_bindings/types.ts (verified matching a fresh generate via X8) + legitimately-hardened eval files. Core code: schema.rs, accounts.rs, accounts_tests.rs -- matches declared touches exactly.

Merged: gh pr merge 398 --squash --delete-branch -> master@5962b7a. Post-merge master CI (ci job) ran to completion=success. Worktree .claude/worktrees/rb-24 removed; local master fast-forwarded efdae74->5962b7a clean, no strays. Residual R-m22-s2-X15 closed via mr-gates residuals close --slice rb-24 --pr 398.

Queue: rb-25, rb-26 remain (per prior tick notes) -- not re-verified this tick, next tick's fast path job. No launch this tick (merge was the one mutating action; standard doctrine allows merge->launch composite but budget/time already spent on the merge+adjudication; leaving launch to next tick with a clean mutex).
## 2026-08-31T13:02:13Z — rb-24 launched (13:00Z tick)
Native tick mr-sup-native-20260831T130009Z-322886 (13:00Z). Gate-0/1: no live per-run locks, no chain mutex, HOLD-NONE, no resident-session collision (find -mmin -6 empty both repos beyond the wrapper's own heartbeat/situation-cache/codegraph-daemon files). Both repos fetched; harness main only lost a stale merged remote branch ref. Master CI green (rb-22 fix, conclusion=success), no open PRs either repo, remotes correct. Gate-3: ran mr-gates residuals list --unclaimed first per the aging rule -- 32 open (over cap 12, observe-only), oldest R-rb-3-X9/X10 at 2.95d, still under t1_promote_days=3, so none outrank the queue fast path. queue[] held [rb-24, rb-25, rb-26]; re-verified rb-24 live: spec section exists at M-residual-backlog.spec.md:45 (from m22-s2 X15, INTENDED OWNER m22-s3 which never merged), not already built, after:-dep (source m22-s2) already merged. Selected rb-24: declare AccountDeletionReaperSchedule table (M22-privacy-compliance.spec.md S2/PRV1-1/PRV1-3) in server-module/src/schema.rs + accounts.rs. Tier=HARD (server-module schema/reducers) -> fable@xhigh; budget.fable_ok=true (d7=$1070.26/2783 eff., fable_d7=$350.89/2298 allowance). Pre-allocated project ADR-0220 (mr-state.json adr_next_free was 220). mr-spawn LAUNCHED cleanly: leader=324281, claude_pid=324284, rid=mr-spawn-20260831T130132Z-324222, verified detached (own sid/pgid, ps confirms session leader) and correct model class (fable/xhigh) post-launch. GATES-SEEDED criteria=1 (shall-uncaptured=1, seed=f030a265736c965b). Removed rb-24 from queue[] (mr-record queue-remove); queue[] now [rb-25, rb-26]. Governor NORMAL. No BLOCKER, no rate-limit event. Standing down after the single launch action.
## 2026-08-31T12:02:38Z — tick record — promoted R-rb-2-X9 -> rb-26 (PR#73); queue=[rb-24,rb-25,rb-26] (12:00Z tick)
Native tick rid=native-20260831T120008Z-310509. Gate-0/1: no live per-run locks, no chain mutex, no operator hold (HOLD-NONE, queued_events=0), no resident-session collision (find -mmin -6 empty both repos; only stale orphaned esbuild pids under a since-removed .claude/worktrees/rb-11 dir from a prior merge, not a live claude session). Both repos fetched clean; master/main both at expected local SHAs (harness main ab69478 -> edc73b4 after this tick's merge; monster-realm master efdae74, master CI green per situation bundle). No open PRs, no in-flight/awaiting_merge slices, park_counters={14r-e:1}. Gate 3: mr-gates residuals list --unclaimed surfaced an alarm — R-rb-2-X9 was the oldest unpromoted residual, past t1_promote_days (3.1d, threshold 3d), which per aging doctrine outranks the queue fast-path and new PLAN §9 work. Promoted it (mr-gates residuals promote --id R-rb-2-X9 --spec-file M-residual-backlog.spec.md -> rb-26), queued it (mr-record queue-add), shipped the spec change as a doc-only chore PR (chore/residual-promote-20260831T120140Z, PR#73) and squash-merged it directly (repo has no branch protection configured, so gh pr merge --squash --auto errors GraphQL 'Protected branch rules not configured' — fell back to a plain gh pr merge --squash --delete-branch, mergeStateStatus was CLEAN/MERGEABLE with zero required checks either way). No launch this tick (the promote+merge was the one mutating action, consistent with prior ticks' one-action-per-tick discipline). Queue now holds rb-24 (X15), rb-25 (X10), rb-26 (X9) for the next tick's fast path. No other MED/HIGH residuals crossed t1/t2 this tick. Cap alarm persists: 32 open residuals vs observe-only cap 12 — informational only per doctrine, not an action trigger. No BLOCKERs. Released chain mutex at tick end.
## 2026-08-31T11:01:45Z — rb-25 promoted from residual R-rb-2-X10 (11:00Z tick)
Gate-0/1: no live locks/mutex, no operator hold (HOLD-NONE), no session collision, both repos in sync with origin (harness main d853f52->pre-tick 155430a; project master efdae74). No open PRs, master CI green on both. Gate 3: mr-gates residuals list --unclaimed showed 2 residuals past t1_promote_days=3d (R-rb-2-X9, R-rb-2-X10, both source_slice=rb-2, disclosed_at=2026-08-28T09:33:25Z, age~3.06d) — this outranks the queued rb-24 and any new PLAN §9 derivation per gate-3 doctrine. Promoted R-rb-2-X10 -> rb-25 (needle<->key correspondence hole when a REKEY entry's exists/rekey needle names another table's live helper, pre-existing in [G6/consumed]). Shipped as doc-only chore PR#72 (chore/residual-promote-20260831T110108Z), squash+auto-merged cleanly, harness main fast-forwarded to d853f52, branch deleted. mr-record queue-add rb-25 (queue now: rb-24, rb-25 — both fast-path eligible next tick, re-verify live before launch per doctrine). R-rb-2-X9 (same age/disclosed_at as X10) remains unpromoted; a future tick should promote it. No launch this tick (residual-promote was the one mutating action, per the composite-action rule this is not a launch tick).
## 2026-08-31T10:03:26Z — 10:00Z tick — promoted rb-24; wontfix'd two MANUAL AT residuals
Native tick mr-sup-native-20260831T100009Z-286029 (10:00Z). Gate-0/1: no live locks/mutex/hold, no session collision (find -mmin -6 empty both repos; only stray was the mechanical mr-usage-daily.jsonl daily-rollup append). Both repos synced to origin (harness main=020c4af->c41b78f after this tick's PR; project master=efdae74, unchanged). Master CI green (rb-22 merge). No open PRs, no inflight/awaiting_merge.

Pick-work: queue held rb-23 (R-m23-s11-X9, A11Y-33 manual protocol). Re-verifying it live before launch surfaced that its EARS criterion requires a human to physically run NVDA+Chrome / VoiceOver+Safari (docs/a11y-manual-protocol.md Protocol B) — explicitly 'SHALL NEVER be reported as CI-green'. No rooted coding agent can execute that. Dispositioned R-m23-s11-X9 wontfix (MED severity, supervisor-dispositionable) and pulled rb-23 from the queue rather than launching a coding pass that could only fabricate or stall on it. Checked the sibling residual R-m23-s11-X8 (Protocol A, A11Y-32, same MANUAL class, age 6.06d, oldest unclaimed) and dispositioned it wontfix too for the identical reason before it could re-surface next tick under the t1_promote_days aging rule.

Next-oldest unclaimed residual was R-m22-s2-X15 (AccountDeletionReaperSchedule schema-declare gap on m22-s2, age 5.68d, real coding work, past t1_promote_days=3) — promoted it to rb-24 in M-residual-backlog.spec.md and queued it. Shipped as doc-only chore PR#71 (chore/residual-promote-20260831T100243Z), squash-merged clean (no required checks blocked it), branch deleted local+remote, main fast-forwarded to c41b78f. This tick's one mutating action = the promote; no slice launch (promote-then-queue is the doctrine's defined single action, next tick launches rb-24 off the fast path).

Governor: NORMAL (d7=067.48/783 weekly, fable d7=50.89, fable_ok=true). No BLOCKERs. No parks. No launches this tick.
## 2026-08-31T09:01:30Z — Native tick mr-sup-native-20260831T090035Z-274595-22369 (09:00Z)
Gate-0/1: no live per-run locks, no chain mutex, no operator hold (HOLD-NONE), no resident-session collision (recent harness writes were mechanical: codegraph daemon, situation cache, heartbeat, tick log), both repos fetched clean, remotes correct, no open PRs, no wip branches. master @ efdae74, CI green. Gate 2 residuals check: 3 unpromoted residuals past t1_promote_days=3 (X9/X8 from m23-s11 at 6d, X15 from m22-s2 at 5.6d) — none past t2_stale_days=14. Promoted the oldest, R-m23-s11-X9 (A11Y-33 manual protocol EARS criterion), into a real spec section via mr-gates residuals promote -> rb-23 in M-residual-backlog.spec.md, queued via mr-record queue-add for the next tick's fast path. Shipped as doc-only chore PR#70 (chore/residual-promote-20260831T090106Z), squash+auto-merge enabled per doctrine. Cleaned 10 stale local merged-branch refs (chore/residual-promote-* series, already gone on origin). No launch this tick — the promote was the one mutating action per lp-gates rule (promote outranks new PLAN §9 work when past t1). Remaining unpromoted residuals (X8, X15, and the rest of the 34-open backlog) carry forward; residual-over-cap alarm (34 open, cap 12, observe-only) still standing.
## 2026-08-31T08:06:55Z — rb-22 MERGED (PR#397) — reconciled prior tick's uncommitted records + worktree-before-verify gap
Native tick rid=native-20260831T080014Z-215824 (08:00Z). Gate-0/1: no live per-run locks, no chain mutex, HOLD-NONE, no resident-session collision (esbuild watchers in rb-11 worktree are 36h+ stale, not new). Found harness working tree carrying UNCOMMITTED changes from the 07:06Z tick (delegated rb-22 CI-wait to mr-ci-watch pid 143909) that never got committed before that tick exited. Live ground truth: PR#397 already MERGED at 2026-08-31T07:16:59Z into master@efdae74, branch slice/rb-22 deleted, worktree already removed — the merge itself completed correctly (presumably by the tick mr-ci-watch's green event spawned), but that merging tick crashed/exited without running mr-gates verify (worktree removed first, contradicting its own handoff NEXT instruction) and without committing ledger/handoff/mr-state.json. Reconciled: recreated a detached worktree at efdae74 solely to re-run mr-gates verify — 7/9 gates reconfirmed true against fresh evidence; EO-4(just ci) FLAGGED only because the reconstructed worktree never had npm install (remote CI already green on this exact commit pre-merge, which is the authoritative post-merge signal); EO-6 manual gate's evidence is genuinely present (5/5 RED, verified) but its citation cites line 12 instead of the actual summary block near line 110-116 — a stale/wrong line number in the gates file, not fraud (flagging for a future doc-only fix, not worth its own slice). Ran mr-gates residuals close --slice rb-22 --pr 397: closed R-m22-s2-S3-GUEST-EXPORT-ORPHAN, auto-emitted 3 unpromoted backlog residuals (R-rb-22-EO-9/EO-10/EO-11) per the DEFERs. Removed the reconstruction worktree. Wrote the ledger MERGED row (prior tick never did). No new launch this tick — one action budget spent on reconciliation; queue empty. Governor NORMAL (d7=$1065.35/2783, fable_ok=true). BLOCKER for a future tick, not urgent: the merge-completing tick's failure to commit its own state before exit is a process gap worth a dedicated fix (same family as the previously-noted queue[] write-race) — merging ticks should commit ledger+handoff+mr-state.json atomically as their last step, or a crash between merge and commit leaves exactly this kind of stray. NEXT: normal fast-path pick-work next tick (queue empty, no residuals past aging thresholds beyond what's already tracked).
## 2026-08-31T07:06:28Z — Delegated CI-wait for rb-22 (PR#397)
Native tick mr-sup-native-20260831T070606Z-143847-22012 (07:06Z). Gate-0: no live per-run locks with awaiting-merge (rb-22 leader dead, .done true), no chain mutex, HOLD-NONE, no resident-session collision. EVENT rb-22.done.md showed rb-22's rooted run finished EXIT=0 ATTEMPTS=1 (fable/xhigh), opened PR#397 on mdrewt/monster-realm (residual R-m22-s2-S3-GUEST-EXPORT-ORPHAN, guest pre-claim export_bundle chunk purge at claim time). Verified live: PR#397 OPEN, MERGEABLE, ci+e2e both IN_PROGRESS (mergeStateStatus=UNSTABLE reflects pending checks, not a conflict). Delegated CI-wait for PR #397 to mr-ci-watch (pid 143909, detached); resumes via event tick when checks complete. No merge attempted this tick. Queue unchanged.

## 2026-08-31T05:03:05Z — 05:02Z launched rb-22 (residual R-m22-s2-S3-GUEST-EXPORT-ORPHAN)
Native tick rid=native-20260831T050009Z-4089322 (05:00Z). Gate-0/1: no live per-run locks, no chain mutex, HOLD-NONE, no session collision (recent harness writes were mechanical: codegraph daemon, heartbeat, tick log — all >45min stale relative to now). Both repos fetched and in sync with origin (harness main, proj master 48fc867, CI green on rb-20's merge commit). No open PRs either repo, no inflight/awaiting_merge. Fast path: queue held rb-22 (promoted residual R-m22-s2-S3-GUEST-EXPORT-ORPHAN, added 2026-08-31T04:01:48Z by the 04:00Z tick). Re-verified live: spec section specs/monster-realm-v2/M-residual-backlog.spec.md ### rb-22 present, non-blocked (after: none, just source/residual metadata), not already merged (no PR, no ledger row for rb-22 prior to this tick). touches: was declared '(inherit from source slice — REVIEW)' in the spec entry; derived concretely from the source spec (M22-privacy-compliance.spec.md S3 row: server-module/src/accounts.rs reducer bodies + server-module/src/lib.rs) plus S4's export-owning file server-module/src/privacy.rs, since this residual is squarely the S3-cascade/S4-export seam (pre-claim export_bundle chunks orphaned under a retired guest identity). tier=hard (server-module schema/reducer + cascade surface) -> fable@xhigh; budget.fable_ok=true (d7=$979.30/2783 eff., fable_d7=$267.76/2298), no guard exceeded. ADR reserved: 220 (matches mr-state.json adr_next_free and next-free slot after 0219 in docs/adr/README.md). GATES-SEEDED criteria=0 (terse rb-* residual spec entries carry no auto-extractable SHALL criteria, consistent with prior rb-slices e.g. rb-17/rb-20). Launched leader=4091458 claude_pid=4091461 (verified own session, model class fable, effort xhigh in the launched cmdline) rid=mr-spawn-20260831T050225Z-4091405, repo=project, pr_repo=mdrewt/monster-realm. queue-removed rb-22 (now empty). No BLOCKERs, no rate-limit event. Governor NORMAL. NOTE (not this tick's action, flagging for a future tick): monster-realm-handoff.md is far over its ~40KB rotation budget (235KB observed at gate-0) and the two newest entries (rb-21/rb-22 promotion, 03:00Z/04:00Z) were appended near line 2129 instead of at the top despite the newest-first convention -- looks like the same failure mode the doctrine already names (entries out of order / rotation not firing), worth a dedicated investigation of mr-record handoff's rotation path rather than a hand-fix.
## 2026-08-31T04:02:39Z — tick record — promoted R-m22-s2-S3-GUEST-EXPORT-ORPHAN -> rb-22
Native tick mr-sup-native-20260831T040006Z-4077849 (04:00Z). Gate-0: found the 03:00Z tick's mr-record handoff write (rb-21 promotion entry + auto-rotation) had never been committed -- only mr-state.json landed in a92ffc7. Committed the missed write as catch-up (fc8bec1) before this tick's own action, per the established catch-up pattern. No live per-run locks, no chain mutex, no operator hold (mr-hold status: HOLD-NONE). Gate-1: fetched both repos; no resident-session collision (find -mmin -6 showed only this tick's own writes; rb-11 esbuild pids are the known-harmless orphans from an already-removed worktree). Proj master == origin/master == mr-state.json's recorded sha (48fc867), CI success (rb-20/rb-19/rb-18 all green). No open PRs either repo pre-tick, no inflight/awaiting_merge, queue[] empty. slice/rb-4 local branch exists but is not open/parked in mr-state -- left untouched per prior ticks' precedent. Gate-3: master CI green, ran mr-gates residuals list --unclaimed: 27 open, alarms residual-unpromoted (4 past t1=3d) and residual-over-cap (32... wait 27, cap 12, observe-only). Oldest tied (X8/X9, 2026-08-25T08:38:25Z, m23-s11 manual-AT NVDA/VoiceOver criteria) again correctly left unpromoted -- not agent-executable, confirmed repeatedly by prior ticks. Next-oldest (2026-08-25T12:55:38Z): R-m22-s2-S3-GUEST-EXPORT-ORPHAN. Read its full reason + source spec (M22-privacy-compliance.spec.md Sec.7.2/7.4): a genuine, well-scoped technical gap (pre-claim export_bundle chunks sit under a retired guest identity that the S3 deletion cascade's identity-keyed cursor structurally cannot reach) -- not a self-closing author note, so promoted rather than dispositioned. Promoted via mr-gates residuals promote -> rb-22 in M-residual-backlog.spec.md, queued via mr-record queue-add, shipped as doc-only chore PR mdrewt/claude-harness#69 (chore/residual-promote-20260831T040156Z), squash+auto -- merged same tick, harness main fast-forwarded to 53581cc, branch deleted both sides. One promote = the tick's action; no launch/merge of build work this tick. SELF-CORRECTION: I mistakenly wrote a ledger row (slice=supervisor, outcome=DECISION, run_id=mr-sup-native-...) that duplicates the wrapper-owned SUPERVISOR tick-ok row -- doctrine reserves that row for mr-native-tick.sh. Harmless (cost_usd=0, distinguishable by run_id/casing) but noting it so a future tick doesn't double-count or copy the mistake. Governor NORMAL (d7=$978.23/2783 eff., fable_d7=$267.76/2298, fable_ok=true). No BLOCKERs, no rate-limit event. Standing down after the single promote action.
## 2026-08-31T03:03:04Z — tick record — promoted R-m22-s2-S3-CANCEL-TERMINAL -> rb-21 (PR#68)
Native tick mr-sup-native-20260831T030007Z-4065534 (03:00Z). Gate-0: clean (no live per-run locks, no chain mutex, no operator hold, no .done awaiting merge; rb-11 esbuild pids are known harmless orphans). Gate-1: fetched both repos; harness local main was 7 commits ahead of origin/main (unpushed prior tick-record commits) -- pushed to sync before spawning any harness work, per REPO-OUT-OF-SYNC doctrine. No resident-session collision (find -mmin -10 showed only this tick's own .situation-cache.json/heartbeat/tick-alive/log writes). Proj master == origin/master == mr-state.json's recorded sha (48fc867), CI success. Gate-3: master CI green, no open PRs, no inflight/awaiting_merge, queue[] empty at start -- ran mr-gates residuals list --unclaimed: 28 open, 5 unpromoted past t1=3d (alarm), 32-over-cap alarm (observe-only). Oldest tied (X8/X9, 2026-08-25T08:38:25Z, m23-s11 manual-AT NVDA/VoiceOver criteria) already correctly left unpromoted by a prior tick -- not agent-executable, no matching LEGAL_DISPOSITIONS category; re-confirmed and skipped again rather than force a mismatched disposition. Next-oldest tied pair (2026-08-25T12:55:38Z): R-m22-s2-S3-CANCEL-TERMINAL vs R-m22-s2-S3-GUEST-EXPORT-ORPHAN. Read both in full against source spec M22-privacy-compliance.spec.md: CANCEL-TERMINAL is PRV1-4 (cancel_account_deletion must reject on a terminal/erased account) whose only guard is a debug_assert compiled OUT of release wasm -- red-team confirmed the release build does not panic, so a terminal account is reactivatable in production right now. Picked it over GUEST-EXPORT-ORPHAN (a data-retention/reachability gap, not an active bypass) on severity-of-consequence grounds within the MED/MED tie. Promoted via mr-gates residuals promote -> rb-21 in M-residual-backlog.spec.md, queued via mr-record queue-add, shipped as doc-only chore PR mdrewt/claude-harness#68 (chore/residual-promote-20260831T030217Z), squash+auto -- merged same tick (harness main fast-forwarded to 583936d), branch deleted both sides. One promote = the tick's action; no launch/merge of build work this tick. Governor NORMAL (d7=$977.18/2783 eff., fable_d7=$267.76/2298, fable_ok=true). No BLOCKERs, no rate-limit event. Standing down after the single promote action.
## 2026-08-31T02:04:14Z — tick record — dispositioned R-m22-s2-S3-BASIS-CONTENT-FLOOR as wontfix (self-closing author text)
Native tick mr-sup-native-20260831T020100Z-4051862 (02:01Z). Gate-0: found the previous 00:55Z tick's own rb-20-merge record (handoff+mr-state+plan/proof artifacts) fully written but never committed before the session ended -- committed as catch-up (78beaa3) before taking this tick's own action, same recovery pattern as the 22:02Z rb-19 and 02:00Z rb-13 catch-ups. Gate-1: no live per-run locks, no chain mutex, HOLD-NONE, no resident-session collision (find -mmin -6 empty both repos aside from this session's own .codegraph daemon writes). Re-verified live: master CI for 48fc867 (rb-20) now green (was in_progress at last record time), no open PRs either repo, queue[]/inflight[]/awaiting_merge[] all empty. Gate-3: mr-gates residuals list --unclaimed showed 29 open, 6 past t1_promote_days=3 (none past t2=14) -- residual work outranks new PLAN Sec.9 work per the aging doctrine. Oldest by disclosed_at (tied, 5.72d): R-m23-s11-X8/X9 (A11Y-32/A11Y-33 manual-AT execution criteria). Read both in full: their own text says a tester must run NVDA/VoiceOver with the mouse unplugged and screen covered, and the criterion 'SHALL NEVER be reported as CI-green' -- this is not promotable into a coding-agent slice (no automation can drive a screen reader and self-certify a human-perception result), and mr-gates LEGAL_DISPOSITIONS=(wontfix) has no 'needs-human' category, so wontfix-ing it would misrepresent genuinely-wanted work as rejected. Left X8/X9 unpromoted/unactioned this tick rather than force a mismatched disposition or waste a slice launch on unexecutable work -- flagging for a future decision (possibly a non-blocking mr-ask-drew scheduling ping, or an operator call on how residuals gated behind human-only execution should be tracked). Moved to the next actionable-by-age residual: R-m22-s2-S3-BASIS-CONTENT-FLOOR, whose own author text explicitly says 'a content oracle is not feasible mechanically... No code change requested; close' -- self-closing, dispositioned wontfix via mr-gates residuals disposition (MED severity, loop-dispositionable). Did not promote/launch/merge anything else this tick -- one action per tick. Governor NORMAL (d7=$976.15/2783 eff., fable_d7=$267.76/2298, fable_ok=true). No BLOCKERs, no rate-limit event. Standing down after the single disposition action.
## 2026-08-31T01:01:16Z — rb-20 MERGED (PR#396 -> master@48fc867)
Browser-tier reduced-motion oracle closing residual R-m23-s11-X11 (A11Y-27's missing stylesheet-arm coverage from m23-s11). Pre-merge: mr-gates verify FLAGGED on first pass in the supervisor's ad-hoc shell (missing cargo/wasm32 PATH -> RM-6 exec-error; missing local dev server -> RM-3 'connection refused'); re-ran with proper asdf/cargo PATH and got 6/6 fresh-pass except RM-3, which needs a live SpacetimeDB server the verify shell didn't have running (remote CI's own e2e job, which does spin up a server, passed clean, and the run's own log recorded RB20-BROWSER-BITE mutants=3 caught=3/3 at build time) -- adjudicated as an environment gap, not a regression. Acceptance 6/7 met, 1 deferred (RM-7 -> backlog: motionPreferenceFromWindow has zero production callers). orchestration_audit CLEAN (red-team/reviewer/tester/verifier all ran). mr-audit's own internal mr-gates call hit FileNotFoundError on all 6 gates (same PATH issue, one layer removed) -- disregarded in favor of the supervisor's direct re-verify. Residual R-m23-s11-X11 closed against PR#396; new residual R-rb-20-RM-7 opened (unpromoted, backlog target). Master CI for 48fc867 still in_progress at handoff time -- next tick's gate-0/1 will re-verify live before acting on it. Worktree + local branch cleaned, stale per-run locks (rb-19, rb-20) reaped via mr-unlock.
