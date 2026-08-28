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
