# M-residual-backlog — the standing drain for deferred acceptance criteria

**Status: standing (never "closed").** Created 2026-08-22 by `lp-gates`.

## 1. Why this file exists

Measured across the corpus: **58.8% of uniquely-named slices live in a remediation milestone**;
**61%** of a 46-slice classified sample exist because an earlier slice left *declared* work undone;
and **12 of 18** named continuation slice ids (`14r-c-2`, `m20b-2`, `pt-c1b2`, …) **never got a spec
section at all**. The postmortem named the class RF-3, *"records are not queues"*: 130 defer/park
phrases across the ADR corpus, 45 ADRs with a Residuals section, **zero mechanical consumers**, mean
disclosure→remediation latency **13.1 days**.

The failure was never dishonesty — parks were declared, loudly and in writing. They were declared
into prose nothing consumed, and rediscovered weeks later by the most expensive detector available:
a whole new review milestone.

This file is the sink's drain. Every section below was **promoted mechanically** by
`mr-gates residuals promote` from a `DEFER:` line in a slice's acceptance ledger. The criterion text
is verbatim from the spec section it was deferred from, so promotion is a copy, not spec authoring.

## 2. Slices

*(Generated. `mr-gates residuals promote` appends here; `mr-record queue-add` schedules; the section
is closed when its criterion passes a gate in the slice that picks it up.)*

<!-- PROMOTED SECTIONS APPEND BELOW THIS LINE -->

### rb-21 — S3 MUST guard cancel_account_deletion against terminal accounts (PRV1-4) — the schema now  (from m22-s2 S3-CANCEL-TERMINAL, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s2 · residual: R-m22-s2-S3-CANCEL-TERMINAL

Deferred with reason: MEASURED by two independent lenses on the m22-s2 tree: needs_cancel_write is matches!(status, PendingDeletion) and a terminal account IS PendingDeletion; cancelled_deletion carries terminal_at_ms through ..existing; the only guard is a debug_assert compiled OUT of release wasm ([profile.release] has no debug-assertions — red-team built both profiles and showed the release path does not panic). Lat

EARS: S3 MUST guard cancel_account_deletion against terminal accounts (PRV1-4) — the schema now makes the resurrected-tombstone state mintable
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-20 — X11 (from m23-s11 X11, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s11 · residual: R-m23-s11-X11

Deferred with reason: a browser-tier reduced-motion oracle (a Playwright project with `use: { reducedMotion: 'reduce' }`). The cheapest real-browser a11y oracle available: it needs NO axe dependency and would gate A11Y-27 in a real browser rather than in happy-dom, where `renderResolver.test.ts` proves the pure branch but nothing proves the media query actually reaches it end to end. Blocked solely by `client/playwrigh

EARS: X11
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-19 — X10 (from m23-s11 X10, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s11 · residual: R-m23-s11-X10

Deferred with reason: the axe-core + real-browser a11y tier that spec §5.7 names as `just a11y-e2e`'s payload ("axe-core + Playwright"). It requires `client/e2e/a11y.spec.ts` (new), `@axe-core/playwright` in `client/package.json`, and a lockfile update — ALL THREE outside m23-s11's declared `touches:`, and, more importantly, **owned by no slice in the spec's own §4 table**: S10 owns "the five evals + baseline + happy-d

EARS: X10
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-18 — X21 (from m23-s10 X21, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X21

Deferred with reason: the cross-view RE-OPEN edge. `client/src/ui/overlayA11yWiring.test.ts` constructs a fresh view per id and calls the open path once, so it never exercises a repeat `show()` on an already-visible overlay; deleting a view's `if (!wasVisible)` guard would ship green there. NOT a coverage gap today — every one of the sixteen per-view specs already ships its own `-REPEAT-NO-REOPEN` tooth (the m23-s3/s6 

EARS: X21
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-17 — X20 (from m23-s10 X20, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X20

Deferred with reason: three residuals this slice MEASURED but deliberately did not close, each because the fix needs files outside its `touches:`. (a) **R-m23-s10-RMCSS**: a `@media (prefers-reduced-motion: reduce){:root{--mr-reduce:1}}` block in `client/src/styles.css`, read back via `getComputedStyle(...).getPropertyValue`, escapes all three `[A11Y-RM2]` scans — the walker collects `.ts`-family files only and the sty

EARS: X20
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-16 — X19 (from m23-s10 X19, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X19

Deferred with reason: retire the three now-superseded hand-kept `.focus(` file lists that X1/X2 subsume: `client/src/ui/renameView.test.ts:501` (`S3-NO-VIEW-LOCAL-FOCUS`, 10 files — its own `it()` title says "delete when S10 ships"), `renameView.test.ts:1300` (`S4-VIEW-LOCAL-FOCUS-5`) and `client/src/ui/menuView.test.ts:1755` (`MV-NO-FOCUS-CALL`). Blocked: both files are outside this slice's `touches:`, and `renameView

EARS: X19
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-15 — X18 (from m23-s10 X18, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X18

Deferred with reason: consolidate the CSS oracle so `[A11Y-06]`/`[A11Y-07]` need no delegation pin. `parseCssRules`/`findIdSelectors`/`srOnlyIsAccessible` exist exactly ONCE, module-locally, at `client/src/indexShell.test.ts:1001`/`:1113`/`:1408`. This slice deliberately did NOT duplicate them (X6, and the plan memo section 1 D3): red-team MEASURED that the shared-fixture-corpus mechanism correction (3) [R-m23-s2-X6] p

EARS: X18
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-14 — X16 (from m23-s10 X16, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X16

Deferred with reason: `evals/contrast-ratio.eval.mjs` + `evals/baselines/contrast-unresolved.json` (spec section 5.3; criteria A11Y-30/A11Y-31, tags [A11Y-09]/[A11Y-10]/[A11Y-11]). Its ONLY subjects are the inline `style.cssText` literals that slices S8 and S9 remediate, and BOTH are BLOCKED on the spec section 8.1 palette ruling and the section 8.2 art-direction ruling (S9 is `after: S8`). A `NO_BG_UNRESOLVED` baselin

EARS: X16
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-13 — A11Y-25 (from m23-s6 A11Y-25, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s6 · residual: R-m23-s6-A11Y-25

Deferred with reason: INTENDED OWNER m23-s10 (M23 spec section 4, row S10). The [SCAN] tier of "an element with a click listener, no paired keydown and no native button/anchor child fails CI" is `evals/keyboard-operable-rows.eval.mjs` ([A11Y-12]/[A11Y-13]), which does not exist and is in S10's declared `touches:` (spec section 4). S6 ships the SUBJECT the eval will scan -- exactly spec section 5.4's GOOD hostile-but-co

EARS: A11Y-25
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-12 — The [A11Y-07] CSS scanner will exist twice once S10 lands its eval, with no agreement gate (from m23-s2 X6, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s2 · residual: R-m23-s2-X6

Deferred with reason: A .mjs eval cannot import the .ts helper, so S10 re-implements parseCssRules/findIdSelectors/srOnlyIsAccessible. Forced by touches:, but two oracles for one criterion drift invisibly -- each keeps passing against its own idea of the file. S10 should carry an explicit gate that both scanners agree over the same fixture corpus, or a third variant appears.

EARS: The [A11Y-07] CSS scanner will exist twice once S10 lands its eval, with no agreement gate
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-11 — aria-modal=true on the eleven shells puts the single #a11y-live region in the AT-inert sub (from m23-s2 X5, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s2 · residual: R-m23-s2-X5

Deferred with reason: Spec 2.4 places the live region as a direct <body> child; A11Y-13 puts aria-modal=true on every shell root. While any overlay is open, AT is instructed to ignore everything outside the dialog -- including the one node S1 announces through. NVDA/JAWS usually still speak it, VoiceOver/Safari frequently do not, so the failure is silent and AT-dependent. The two decisions were made in different spec s

EARS: aria-modal=true on the eleven shells puts the single #a11y-live region in the AT-inert subtree
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-10 — The spec-2.5 reduced-motion CSS guard for the battle HP bar is owned by NO slice (from m23-s2 X4, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s2 · residual: R-m23-s2-X4

Deferred with reason: Spec 2.5 puts it in the new stylesheet, but S7's touches: has no styles.css, the transition is an INLINE cssText declaration in ui/battleView.ts, and the element carries no class -- so no selector can reach it at any specificity and no current slice can land it. Cheapest fix: S4/S8 sets hpFill.className='hp-fill' and drops the inline transition; S9 (which already owns styles.css) adds the rule plu

EARS: The spec-2.5 reduced-motion CSS guard for the battle HP bar is owned by NO slice
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-9 — A11Y-12 bans the '#' character, not reachability: attribute/universal/positional selectors (from m23-s2 X3, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s2 · residual: R-m23-s2-X3

Deferred with reason: Red-team measured a biome-clean styles.css -- [id="help-overlay"]{visibility:hidden} etc -- that reds nothing, prints X3 GATE-GREEN, and in Chromium hides #help-overlay, blanks #help-hint and removes #a11y-live from the AX tree. Also measured: [id^=], div[id*=], :where([id=]), body>div:nth-child(11) and *{} each reproducing ADR-0151 D1's below-the-fold regression with H6/H7 green. m23-s2 closes th

EARS: A11Y-12 bans the '#' character, not reachability: attribute/universal/positional selectors defeat it
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-8 — S8's grace countdown will duplicate DELETION_GRACE_MS_DEFAULT in TypeScript unless a wasm  (from m22-s1 R-m22-s1-X3, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s1 · residual: R-m22-s1-R-m22-s1-X3

Deferred with reason: S8's scope (spec §7.2) is a deletion/cancel UX with a grace countdown, but DELETION_GRACE_MS_DEFAULT is unreachable from TS: client-wasm/pkg exports only the pre-existing 10 functions (verified by an actual wasm-pack build of this worktree), and the schema carries only deletion_requested_at_ms. The path of least resistance is a TS literal that silently drifts the moment the operator resolves escal

EARS: S8's grace countdown will duplicate DELETION_GRACE_MS_DEFAULT in TypeScript unless a wasm accessor is added
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-7 — No display-name tombstone is single-sourced; PROFILE_TOMBSTONE_NAME is a wrong-but-plausib (from m22-s1 R-m22-s1-X2, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s1 · residual: R-m22-s1-R-m22-s1-X2

Deferred with reason: Spec §3 requires player.name and profile.name to be overwritten with a tombstone, but §7.2's S1 row lists only six symbols and omits a name tombstone, so S1 shipped none. The only existing constant is server-module/src/ranking.rs:161 PROFILE_TOMBSTONE_NAME = '(claimed guest)', used by tombstoned_profile() for the GUEST-CLAIM flow, which also zeroes rating/wins/losses. If S3 reuses it a deleted acc

EARS: No display-name tombstone is single-sourced; PROFILE_TOMBSTONE_NAME is a wrong-but-plausible duplicate S3 will reach for
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-6 — S3 will hard-RED [R/name-set]: SANCTIONED_REDUCERS is exact-set equality and does not cont (from m22-s1 R-m22-s1-X1, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s1 · residual: R-m22-s1-R-m22-s1-X1

Deferred with reason: evals/guest-claim-integrity.eval.mjs:388-394 pins SANCTIONED_REDUCERS as an exact set of 5 names, compared by set EQUALITY at :564-572 (deliberately not >=5). STATE_TRANSITION_OWNERS (shipped by this slice) names account_deletion_reaper, which does not exist yet. The moment S3 declares that reducer in accounts.rs, [R/name-set] fails. The Rust twin over ACCOUNTS_RS in server-module/src/accounts_tes

EARS: S3 will hard-RED [R/name-set]: SANCTIONED_REDUCERS is exact-set equality and does not contain account_deletion_reaper
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).

Resolution (rb-6, 2026-08-28). DONE — fixed in PR #384 (ADR-0210). The `SANCTIONED_REDUCERS` flat array became a frozen `REDUCER_SANCTIONS` ledger with REQUIRED/PLANNED status (5 REQUIRED, 1 PLANNED = `account_deletion_reaper`). `[R/name-set]` is now membership (own keys only) + required-presence. `[R/sanction-shape]` closes the status discriminator to {REQUIRED, PLANNED} with closed field sets (red-team measured a third-status bypass on an unguarded implementation). `[R/planned-set]` pins the PLANNED keys by exact equality. `[R/planned-shape]` asserts that a PLANNED name, if present, is a same-file scheduled reducer with the right argument and guard. Gate red-teaming and re-check against pre-fix revealed that membership checking is orthogonal to set pinning — the first implementation passed all 95 evals and every new fixture while still admitting an unsanctioned reducer that reused the name, because the carve-out was reached only after type-safety failed.

### rb-5 — evals/run.mjs has no completeness check: an eval that process.exit()s at module scope trun (from m22-s0 X4, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s0 · residual: R-m22-s0-X4

Deferred with reason: MEASURED on the live tree: with a main guard widened to compare dirname, node evals/run.mjs ran 37 of 90 evals, swallowed 3 already-printed 'eval FAIL:' lines, and exited 0. run.mjs guards only files.length === 0; nothing asserts every discovered eval produced a result. OUT of this slice's declared touches (evals/run.mjs is explicitly off-limits and the M22 spec forbids slices editing it), so flag

EARS: evals/run.mjs has no completeness check: an eval that process.exit()s at module scope truncates CI silently with exit 0
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-4 — findIdentityColumns matches literal type TEXT, so an aliased Identity column is invisible  (from m22-s0 X3, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s0 · residual: R-m22-s0-X3

Deferred with reason: MEASURED: adding 'pub type OwnerId = Identity;' and 'pub delegate: OwnerId,' to a table leaves both gates green while the column carries no D6 policy. Pre-existing walker limitation, but S0 freezes this walker as the shared contract, so a consumer building a completeness gate over it inherits an incomplete column set. Documented as a KNOWN LIMITATION in the contract comment. Real fix: gate 'type X

EARS: findIdentityColumns matches literal type TEXT, so an aliased Identity column is invisible to the frozen walker
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-3 — [G6/declared] uses 'key in manifest', so Object.prototype pollution greens an unclassified (from m22-s0 X2, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s0 · residual: R-m22-s0-X2

Deferred with reason: MEASURED both ways by red-team; independently confirmed byte-identical on origin/master by the reducer-security-auditor, so PRE-EXISTING, not introduced by S0. 'in' walks the prototype chain, which Object.freeze does not seal: a co-resident eval setting Object.prototype['table.col'] makes [G6/declared] skip a genuinely unpoliced column while Object.keys and the detail-string count stay at 23. Veri

EARS: [G6/declared] uses 'key in manifest', so Object.prototype pollution greens an unclassified Identity column
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-2 — REKEY_MANIFEST object-ification is red-on-arrival: checkRekeyCompleteness infers REKEY fro (from m22-s0 X1, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s0 · residual: R-m22-s0-X1

Deferred with reason: MEASURED by red-team on the live tree: converting one BLOCKED string entry to an object keeps the S0 contract eval green and reds guest-claim-integrity with FG47 '[G6/consumed] the manifest marks battle.player_identity as REKEY via undefined'. Any object entry is REKEY by definition. The only green workaround forces a lie (borrowed rekey/exists needles advertise a BLOCKED column as re-keyed). The 

EARS: REKEY_MANIFEST object-ification is red-on-arrival: checkRekeyCompleteness infers REKEY from typeof policy === 'string'
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-1 — RW3-08 (verbatim) — THE SLICE SHALL NOT modify Rust source other than `CONTENT_VERSION` an (from rw3b X8, deferred 2026-08-23)
`touches: specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md, specs/monster-realm-v2/M-residual-backlog.spec.md, memory/projects/mr-content-scope, memory/projects/mr-selfcheck`
`after:` — · source: rw3b · residual: R-rw3b-X8

Deferred with reason: RW3-08 as written is mechanically unsatisfiable for ANY slice that appends an evolution edge or a derived species. `game-core/tests/eg3_evolution_graph.rs` pinned the edge set EXACTLY (`t2`: `paths.len() == 10`; `t7`: `edge_ids == (1..=10)`) and `game-core/src/content.rs`'s `EG1_TIER_ONE_IDS` pins the derived-species set EXACTLY, so both go RED the instant wave-3 content lands. Both were EXTENDED,

EARS: RW3-08 (verbatim) — THE SLICE SHALL NOT modify Rust source other than `CONTENT_VERSION` and its own new test files, and SHALL NOT edit `Affinity`, `AbilityEffect`, or `content/type_chart.ron`.
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).

Resolution (rb-1, 2026-08-28). The `EARS:` line above is the criterion AS DEFERRED — verbatim, and
deliberately frozen. This whole section is hashed into the slice's acceptance ledger
`memory/projects/gates/rb-1.gates.md` (`Seed: 6d97183777f61762`), and reseeding is a supervisor-only
operation, so a promoted criterion is never edited in place: it records what was deferred, not what
was concluded. The CORRECTED criterion lives in
`specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md` under RW3-08, amended 2026-08-28 to carry
one narrow extra exception for a STRICTLY-ADDITIVE extension of a pre-existing exactly-pinned test
or registry set that the slice's own new content would otherwise make unsatisfiable: adding ids to a
set pinned by equality, raising a pinned count, appending expected tuples, replacing a pinned range
with the explicit list that supersets it, or updating an assertion message or test name stating that
count.

What stays forbidden is everything the deferred wording was actually protecting. No assertion may be
deleted or commented out, no `#[test]` removed, no `#[ignore]` or `#[cfg(feature = "…")]` added, no
`assert_eq!` downgraded to `assert!` or `debug_assert_eq!`, no `==` relaxed to `>=` / `is_subset` /
`is_superset`, no id dropped from a pinned set, no pinned count lowered. Every other Rust-source
change still fails the criterion, including any incidental refactor and including a pure addition
— a new `fn`, `struct` or `mod tests` block — inside a pre-existing `src/*.rs` file the slice
legitimately extends: that file is production code, and an allow-list that waved a pure-`+` hunk
through it would miss the exact attack it exists to catch.

That prohibition is deliberately NOT stated for a pre-existing TEST file, and the classifier does
not enforce it there. A pure, BRACE-BALANCED addition to a file that is already a test file is
permitted, because it cannot remove or weaken a pin that is already there. Adding a test is not a
licence to delete one: every removal path still bites — a deleted or commented-out assertion, a
removed `#[test]`, a removed line with no extension partner, a lowered count, a dropped id — and a
pure addition that is brace-UNBALANCED is read as wrapping or splicing into pre-existing code and
bites as well, as does an added `#[ignore]`, an added `#[cfg(feature = "…")]`, and a `macro_rules!`
redefinition or `use … as` alias of one of the six reserved assertion names. This paragraph and the
matching one under RW3-08 in `specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md` say the same
thing on purpose, and both say what `memory/projects/mr-content-scope` actually does: an
unqualified "any pure addition fails" was FALSE of the shipped tool, which is precisely the class of
stale claim this slice exists to kill. `Affinity` (`game-core/src/monster/types.rs`),
`AbilityEffect` (`game-core/src/combat/ability.rs`) and `game-core/content/type_chart.ron` stay
untouchable, exactly as before.

Proof of teeth. The amended criterion is classified mechanically by
`memory/projects/mr-content-scope`, an ALLOW-LIST classifier over a slice's unified Rust diff: every
changed line in a Rust file bites unless it positively matches a permitted shape, because a
deny-list waves through the pure-addition case this criterion most needs to catch.
`memory/projects/mr-content-scope --selftest` runs the fixture battery and prints
`CONTENT-SCOPE-SELFTEST-OK 42 fixtures (permit=8 bite=30 link=2 cli=2)`. It PERMITs the three real
merged diffs this residual is about (rw3b's `EG1_TIER_ONE_IDS` extension in `game-core/src/content.rs`,
rw3b's edge/count/range extensions in `game-core/tests/eg3_evolution_graph.rs`, and rw3c's
set-equality and count extensions in `game-core/tests/pt_d3_tuning.rs`), plus a `CONTENT_VERSION`
bump, a brand-new test file, a rustfmt-wrapped id list, and a non-Rust content edit. It BITEs a
`pub fn` and a `mod tests` block smuggled into an existing `src/*.rs` file, an edit to any of the
three banned paths, a commented-out assertion, an `assert_eq!` weakened to `assert!(… >= …)`, a
`debug_assert_eq!`, an `|| true`, an added `#[ignore]` or `#[cfg(feature = …)]`, a `#[test]`
deletion laundered behind two additions in a brand-new file, a dropped id, a lowered count, a
pairing-shift attack that defeats positional diff reading, and a new non-test `.rs` file. Tool and
spec are tied together by the `rw3-scope-rules` token anchor printed under the amended criterion:
the tool asserts its implemented rule set equals that token set, so deleting the exception from the
spec, or silently narrowing the tool, breaks the equality and reds the check. `mr-selfcheck` runs
that selftest daily and parses BOTH the marker and its fixture count against a floor, so the tool
cannot quietly decay into decoration once this slice's ledger closes at merge.

Two notes for a future reader. `mr-gates` reports exactly one `shall-uncaptured` line against this
section, and it is the `###` header line's own truncated restatement of the criterion already
captured below it, not a second requirement that went unrecorded. And the sibling residual
`R-rw3c-X3` is this same criterion deferred a second time, by rw3c: it is resolved by this same
amendment and needs no backlog section of its own.

## 3. How an entry gets worked

1. A slice cannot meet a seeded gate and writes `DEFER: <gate> -> backlog — <reason>`.
2. `mr-gates verify` (supervisor, pre-merge) emits an append-only row into `mr-residuals.jsonl`
   with `status: unpromoted`.
3. At Pick-work the supervisor **promotes** it: a `### <id>` section is appended here from the
   criterion's verbatim EARS text, and `mr-record queue-add` puts it on the fast path.
4. **Aging decides priority, not a fixed rank.** Past `t1_promote_days` a residual outranks new
   PLAN §9 work; past `t2_stale_days` it outranks everything below CI-red and WIP. Debt-first
   starves features and features-first starves debt; aging is self-balancing, because preempting
   clears the debt and normal order resumes. Constants live once, in `mr-gates`
   (`mr-gates residuals policy --json`); `mr-selfcheck` reads them from there rather than
   restating them — lp-11b's defect was two copies of one constant in two files.
5. The promoted slice's own ledger re-seeds the same criterion as a gate. **It is closed only when
   the promoted slice's own ledger is fully resolved** — `mr-gates residuals close` refuses on a
   missing ledger or any unmet gate, and `--force` is recorded on the row. Closing on "something
   merged with the right branch name" would let a residual be retired by a slice that did not
   deliver it.

## 4. Anti-rot

`mr-selfcheck` fails on `residual-unpromoted` (promote stalled past T1), `residual-stale` (open past
T2) and `residual-graveyard` (rows exist, the oldest is past the window, and none has ever
closed — a MATURITY test, so it stays quiet on day 0 and does NOT go silent once rows age out). The last is
the direct falsification test for this whole mechanism, and it is not hypothetical: **`mr-feedback`
holds 189 rows of which 0 ever reached a terminal state**, which is why `lp-15` retires it. A sink
without a drain is a graveyard with better lighting.

## 5. Explicitly NOT in scope

- **Seeding the 329 pre-existing OUTSTANDING items.** That stays `lp-registry`'s, with its own
  disposition-on-day-one requirement; bulk-seeding them here would rebuild the graveyard inside the
  new mechanism and make the alarms fire hundreds of times on their first run.
- **Being a general backlog.** Only deferred *acceptance criteria* land here. Feature ideas, feedback
  and operator decisions have their own channels.
