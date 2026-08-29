# rb-6 — DRAFT PLAN (candidate design, for lens critique)

## Residual (R-m22-s1-X1)
`evals/guest-claim-integrity.eval.mjs` pins `SANCTIONED_REDUCERS` (5 names) and
compares by **exact sorted set equality** (`:584-600`). M22 S3 will declare
`account_deletion_reaper` in `server-module/src/accounts.rs` (it is already named
by `game_core::STATE_TRANSITION_OWNERS`, `game-core/src/accounts/deletion.rs:113-117`,
and by ADR-0207 D5). The moment S3 ships, `[R/name-set]` hard-REDs — and S3 cannot
fix it because this eval is outside S3's touches.

Requirement: a **legitimately-declared** new sanctioned reducer must not hard-fail
the gate, **without weakening** `[R/name-set]`'s ability to catch an actually
unsanctioned reducer (E1 `complete_guest_claim_for`, E2 `adopt_guest`, FG15's
`adopt_guest_by_code`, FG16's rename-away, FG17's empty set).

## Measured facts (read on the live tree, 013b3f8)
- `SANCTIONED_REDUCERS` decl: `evals/guest-claim-integrity.eval.mjs:408-414`.
- `[R/name-set]` comparison: `:584-600`.
- Non-vacuity guard (empty parse ⇒ `[R/name-set]` RED): `:489-506`.
- `checkNoClientIdentity` blast radius (CodeGraph `callers` ∪ cbm `query_graph` ∪ repo grep):
  **file-local only** — `runTeeth` (`:2741`) and `guestClaimIntegrityEval` (`:5785`);
  fixtures FG6–FG17, FG58 at `:2853-3006`, `:3669`. No other file imports it.
- `evals/rekey-contract-surface.eval.mjs` is a **seam-freeze** over this file. It pins
  ONLY `REKEY_MANIFEST` (T1) + `findIdentityColumns` (T2) + **import purity** (T3).
  ⇒ adding an export / an optional parameter is safe; **any module-scope file read or
  side effect is NOT** — T3 spawns children that require the import to be silent.
- `game_core::STATE_TRANSITION_OWNERS` = exactly `["delete_account",
  "cancel_account_deletion", "account_deletion_reaper"]`, and is itself pinned by
  `game-core/src/accounts/deletion_tests.rs:384-410` to that EXACT 3-name set
  (independently written literal, plus a no-empty/no-`*`/no-duplicate/no-gameplay
  tooth at `:417-455`). Two of the three are already in `SANCTIONED_REDUCERS`.
- The live eval globs `server-module/src/**/*.rs` only; `game-core/...` is NOT in
  `treeSrcs` and must be read explicitly.
- **Rust twin**: `server-module/src/accounts_tests.rs:2042-2080`
  `g2_reducer_name_set_is_pinned()` has the SAME exact-5 pin and will hard-RED too.
  `accounts_tests.rs` is OUTSIDE rb-6's declared touches (it is the sibling of
  `accounts.rs`, not of the declared eval) ⇒ **hidden dependency, DEFER**.

## Candidate design

Replace the flat `SANCTIONED_REDUCERS` array with an explicit, frozen **sanction
ledger** keyed by reducer name with a `status` discriminator:

```js
const REDUCER_SANCTIONS = Object.freeze({
  cancel_account_deletion: { status: 'REQUIRED', why: '...' },
  complete_guest_claim:    { status: 'REQUIRED', why: '...' },
  delete_account:          { status: 'REQUIRED', why: '...' },
  guest_claim_reaper:      { status: 'REQUIRED', why: '...' },
  start_guest_claim:       { status: 'REQUIRED', why: '...' },
  account_deletion_reaper: { status: 'PLANNED',  why: 'M22 S3 / ADR-0207 D5 ...' },
});
```

Rules for `[R/name-set]` (replacing exact-set equality):
1. **`[R/name-set]` unsanctioned** — every name found in `accounts.rs` MUST be a key of
   the ledger. An ADDED reducer that is not in the ledger REDs. (unchanged teeth: FG15)
2. **`[R/name-set]` missing** — every `REQUIRED` name MUST be found. A disappeared
   client entry point REDs. (unchanged teeth: FG16)
3. `PLANNED` names are *permitted-when-present*, not required — so the gate is green
   both before and after S3 ships.
4. **`[R/sanction-ssot]` (NEW clause, the anti-forgery tooth)** — every `PLANNED` key
   MUST also appear in the `game_core::STATE_TRANSITION_OWNERS` literal parsed out of
   `game-core/src/accounts/deletion.rs`. A `PLANNED` entry invented **in this file
   alone** cannot whitelist an attack reducer: the attacker must also edit a
   different crate, in a different language, where `deletion_tests.rs` pins the list
   to exactly the 3 spec names. (Closes the "declaration pins are forgeable" shape.)
5. **`[R/sanction-ssot]` fail-closed** — if `deletion.rs` is missing/unreadable, or the
   const cannot be parsed, or the parsed list is empty, that is a hard RED, not a
   silent fallback. The eval claims to read an SSOT; if it cannot, its verdict is
   unfounded.
6. Non-vacuity (`reducers.length === 0`) and the unparseable-`fn NAME(` guard are
   unchanged.

Plumbing:
- `checkNoClientIdentity(accountsSrc, deletionSrc)` gains a **second parameter** so the
  fixtures can inject a forged/absent SSOT (mirrors `checkRekeyCompleteness`'s
  injectable manifest). Live callers pass the real file content.
- The file read happens **inside** `guestClaimIntegrityEval()` (never at module scope —
  T3 import purity), with a read failure reported as a `[R/sanction-ssot]` failure.
- Parser: locate `pub const STATE_TRANSITION_OWNERS`, take the `&[` … `]` span **on
  comment-stripped, string-aware source** via the shared `stripRustSource`… **NO** —
  stripping blanks string literals, which are exactly the names we need. Parse on
  RAW source but strip only `//` and `/* */` comments; extract double-quoted
  literals with `String.indexOf`, no `RegExp` (Semgrep `detect-non-literal-regexp`).
  Fail loud if the span is unbalanced or a literal contains an escape.

## Proof-of-teeth (ADR-0010) — new fixtures
- **FG74a (the criterion's own RED-before/green-after)**: `GOOD_ACCOUNTS` + a shipped
  `account_deletion_reaper` scheduled reducer ⇒ must PASS. Pre-fix this REDs
  `[R/name-set]`. This is the gate the ledger CHECK executes.
- **FG74b**: same source, but the ledger entry removed / SSOT not naming it ⇒ RED
  `[R/name-set]`.
- **FG74c**: `adopt_guest_by_code` (FG15's shape) still REDs `[R/name-set]` — the
  relaxation admits ONLY ledger keys.
- **FG74d**: a `PLANNED` name NOT in the SSOT ⇒ RED `[R/sanction-ssot]` (forged ledger).
- **FG74e**: SSOT source empty / const absent ⇒ RED `[R/sanction-ssot]` (fail-closed).
- **FG74f**: SSOT parse blanked by a stripper that eats string literals ⇒ RED.
- **FG74g**: only the 5 REQUIRED present (today's tree) ⇒ PASS (no false-RED on arrival).
- FG15/FG16/FG17 unchanged and must still bite.
- Bump the `(88 teeth verified)` detail count; nothing external pins it (grepped).

## Anti-patterns to avoid
- Do NOT relax to `>=` / containment / count.
- Do NOT let `PLANNED` be open-ended (`*`, prefix match, "any name in the SSOT").
- Do NOT read the SSOT at module scope (breaks rekey-contract-surface T3).
- Do NOT use `new RegExp` (Semgrep CI gate).
- Do NOT edit `accounts_tests.rs` (outside touches).
- Do NOT let a missing SSOT file silently degrade to the old 5-name behaviour.

## Deferrals
- `DEFER` the Rust twin (`accounts_tests.rs:2042` `g2_reducer_name_set_is_pinned`) —
  outside declared touches, same class of hard-RED. Target: backlog.

---
---

# REFINED PLAN (post-planner critique — THIS is the build-ready plan)

## Corrections to the draft (all measured by the planner, verified below)
1. The draft's cross-file SSOT pin is the WRONG primary anti-forgery tooth:
   `STATE_TRANSITION_OWNERS` lives in another crate/slice, so a future M22 edit
   widens this gate with ZERO diff here. **PRIMARY = `[R/planned-set]`, an
   IN-FILE exact-set pin on the PLANNED keys** (same sorted-equality device
   `[R/name-set]` uses today). The SSOT read stays as a SECONDARY coherence
   check, honestly labelled.
2. `stripRustSource` is **offset- and length-preserving** (`assertStripperSound`
   asserts `stripped.length === src.length`, `rust-scan.mjs:358-359`). So the
   parse takes STRUCTURE from stripped and PAYLOAD from raw at the same offsets
   — no second hand-rolled comment stripper (ADR-0181's whole thesis).
3. rekey-contract-surface T3 does **NOT** catch a module-scope read of an
   existing file (`spawnChild` runs with `cwd: REPO_ROOT`,
   `rekey-contract-surface.eval.mjs:551`) — it is silent. So the constraint must
   be made **structural**: `readStateTransitionOwners(readFile)` with an
   INJECTED reader whose only unconditional call site is the default export.
4. The uniform checker loop at `:5852` gets G2 **hoisted out** (precedent:
   `checkRekeyCompleteness` already sits outside it at `:5863`).
5. Second parameter is **REQUIRED, no default** — a default is a measured cheat.
6. Draft fixtures FG74c/FG74f/FG74g CUT (redundant with FG15/FG6, or vacuous).
7. NEW highest-value tooth the draft missed: **REQUIRED→PLANNED demotion**.
8. Rust twin disposition changed from "DEFER→backlog" to **assigned to M22 S3**
   in ADR-0210 (S3's `touches:` already include `accounts.rs`; ADR-0195 puts the
   co-located twin in scope for any slice changing the reducer surface).

## Hard in-file constraints discovered (violating any REDs `just ci`)
- **FG73o** (`:5642-5692`): none of
  `OwnerId, Owner, MaybeOwner, MaybeOwnerRef, WhoRef, Handoff, GuildRef,
  PhantomRef, Coins, IdentityTag, Id, IdKind, NpcSyncPlan, WalletOwner,
  GhostOwner, Ownér, Stampish`
  may occur as a whole identifier ABOVE `function runTeeth() {`. All new prose,
  the ledger, the parser and the checker live above that line. Realistic
  collisions: `Owner`, `Id`. `STATE_TRANSITION_OWNERS` (all-caps, one token) is
  safe; the prose phrase "state-transition owners" is safe; "the Owner list" is
  NOT.
- **FG70** (`:4035-4049`): the byte string `freezeManifest(` must occur EXACTLY
  once in the RAW text of the file. New prose must not spell it.
- No `new RegExp` anywhere (Semgrep `detect-non-literal-regexp` CI gate).
- The ledger and every entry must be `Object.freeze`d (run.mjs shares one module
  instance across evals).
- Prototype-chain reads are banned: build a `Map` from `Object.keys`, or use
  `Object.hasOwn` — never `if (LEDGER[name])` (rb-3 precedent, `:192-201`).

## Ordered tasks
- **T1** Replace `SANCTIONED_REDUCERS` (`:408-414`) with a deeply-frozen
  `REDUCER_SANCTIONS` ledger (`REQUIRED` × 5, `PLANNED` × 1 =
  `account_deletion_reaper`). `[R/name-set]` becomes:
  (a) every found name must be an OWN key of the ledger;
  (b) every `REQUIRED` key must be found.
  Non-vacuity guards at `:491-507` stay byte-equivalent. Detail string at
  `:5894` derives from the ledger's REQUIRED keys. Bump the tooth count.
- **T2** `assertPlannedSet(ledger)` + `[R/planned-set]`: sorted PLANNED keys ===
  exactly `['account_deletion_reaper']`, both directions. Called FIRST inside
  `checkNoClientIdentity`.
- **T3** Fixtures (see table) + second argument threaded through FG6–FG17, FG58.
- **T4** `parseStateTransitionOwners(src, stripFn)` (structure-from-stripped /
  payload-from-raw, type-pinned `:&[&str]`, exactly-one-declaration,
  even-quote-count, comma-only separators, all-word-char names, no duplicates,
  non-empty) + `readStateTransitionOwners(readFile)` (injected reader) +
  `[R/sanction-ssot]`. **Severable**: ship T1–T3 without it if hostile; NEVER
  ship T4 without T2.
- **T5** `docs/adr/0210-*.md` + `just adr-digest` regen.
- **T6** ARCHITECTURE.md — one paragraph near `:1614`.
- **T7** `just ci` green + 4 mutation bite-proofs, each RED with a distinct FG.

## Fixture table (proof-of-teeth, ADR-0010)
| FG | Fixture | Must |
|----|---------|------|
| 74a | GOOD_ACCOUNTS + the S3-shaped `account_deletion_reaper` scheduled table + reducer WITH the `SCHEDULER_GUARD` needle. **Anti-vacuity: assert `parseReducers(stripRustSource(src)).length === 6` first.** | PASS (REDs `[R/name-set]` pre-fix — the residual's own criterion) |
| 74b | `assertPlannedSet({...LEDGER, adopt_guest:{status:'PLANNED'}})` | RED `[R/planned-set]` |
| 74c | `assertPlannedSet({...LEDGER, delete_account:{status:'PLANNED'}})` (REQUIRED→PLANNED demotion) | RED `[R/planned-set]` |
| 74d | `assertPlannedSet(LEDGER)` | PASS (non-vacuity control) |
| 74e | `assertPlannedSet({})` and `{account_deletion_reaper:{status:'REQUIRED'}}` | RED `[R/planned-set]` (kills ⊆-only) |
| 74f | GOOD_ACCOUNTS with `guest_claim_reaper` renamed to `account_deletion_reaper` | RED `[R/name-set]` (REQUIRED-present survives) |
| 74g | `checkNoClientIdentity(<74a src>, {names:['delete_account','cancel_account_deletion']})` | RED `[R/sanction-ssot]` (SSOT is CONSUMED) |
| 74h | `(GOOD_ACCOUNTS, {error:'boom'})` and `(GOOD_ACCOUNTS)` arg omitted | RED `[R/sanction-ssot]` (fail-closed; no default) |
| 74i1..i7 | parser fixtures: good-3 w/ prose+comment decoys · const absent · two declarations · `concat!(...)` · `\u{5f}` escape · `&[]` · const inside a block comment | i1 → exactly the 3 names; i2–i7 → `{error}` |
| 74j | append `pub fn constructor(ctx: &ReducerContext)` reducer | RED `[R/name-set]` (kills `if (LEDGER[name])`) |
| 74k | `parseStateTransitionOwners(fixture, identityFn)` — a stripper that blanks nothing picks up a `//`-commented decoy entry | RED / decoy visible: pins the raw↔stripped join as load-bearing |
| — | FG6 (+arg), FG15, FG16, FG17, FG58 unchanged and still biting | |

## Cheat shapes to red-team by WRITING them
1. Demote a REQUIRED key to PLANNED (FG16 stays green).
2. `PLANNED := any name in the SSOT` (no diff here widens the gate).
3. Default the second parameter.
4. Swallow the parse error → fall back to PLANNED keys.
5. Compute the SSOT and never consult it.
6. `if (LEDGER[name])` prototype-chain admission (`constructor`, `valueOf`).
7. `found.every(n => n in LEDGER)` with no REQUIRED-present check.

## Known gap (assigned, not hidden)
`server-module/src/accounts_tests.rs:2057 g2_reducer_name_set_is_pinned()` has
the same exact-5 pin and will ALSO hard-RED when S3 ships. It is OUTSIDE rb-6's
declared touches. **rb-6 alone does NOT unblock M22 S3.** Assigned to S3 (whose
touches already include `accounts.rs`; ADR-0195 puts the co-located twin in
scope), and it must mirror the REQUIRED/PLANNED semantics rather than bump the
count to 6 — a count bump re-creates the JS/Rust divergence ADR-0195 prevents.

---

# PLAN-LENS ADJUDICATION (reviewer + red-team, both measured) — FINAL SCOPE

Both lenses independently landed on the SAME critical gap, and the red-team
MEASURED a working bypass of the refined plan as written.

## ACCEPTED — the load-bearing correction: close the `status` discriminator
The refined plan's T1/T2 never constrain `ledger[name].status` to a closed set.
A third status string (`'LEGACY'`, a typo'd `'Required'`, a cleared field) is:
admitted by rule (a) — it IS an own key; never demanded by rule (b) — it is not
`'REQUIRED'`; invisible to `[R/planned-set]` — it is not `'PLANNED'`. It is a
free, silent, optional whitelist slot.

**MEASURED** (`/tmp/rb6-redteam.mjs`, 25/25 assertions, driving the repo's real
unmodified `checkNoClientIdentity` for every other clause): with
`migrate_legacy_account: {status:'LEGACY'}` in the ledger and the wire-safe,
ctor-free attack reducer
```rust
pub fn migrate_legacy_account(ctx: &ReducerContext, legacy_code: String) -> Result<(), String> {
    let claim = ctx.db.guest_claim().code().find(&legacy_code).ok_or("no")?;
    rekey_all(ctx, claim.guest_identity, ctx.sender())
}
```
today's exact-5 gate REDs it; the refined plan implemented to the letter, passing
every fixture in its own table, returns **PASS**.

⇒ **ADD `[R/sanction-shape]`**, modelled on this file's own `[G6/policy]` /
`POLICY_SHAPES` closed-discriminator pattern (`:176-181`, `:1662-1673`): every
ledger entry must be an OWN-property object whose `status` is EXACTLY one of
`{'REQUIRED','PLANNED'}` and whose field set is closed for that kind. Runs FIRST,
fails closed. Fixture FG74g uses a THIRD status string (not one of the plan's
own REQUIRED/PLANNED cases).

## ACCEPTED — DROP T4 (the cross-file `STATE_TRANSITION_OWNERS` parse)
Reviewer: YAGNI / "no abstraction for one implementation" (`standards/principles.md:19,45`);
it is a second bespoke Rust scanner beside the shared hardened `rust-scan.mjs`,
i.e. exactly the duplication ADR-0181 retired; 11 new failure modes; the planner
itself scored its marginal forgery value as small once `[R/planned-set]` exists.
Red-team: MEASURED a real ambiguity in its own spec — "structure from stripped,
payload from raw at the same offsets" has two letter-compliant readings, and the
plausible-wrong one resurrects a `/* "phantom_reducer", */` comment INSIDE the
array span as a 4th sanctioned name (`/tmp/rb6-parser-redteam.mjs`:
`parseBad: [... ,"phantom_reducer", ...]`). It also false-REDs on arrival if the
`&[` search hits the `: &[&str]` type annotation before the value.

⇒ **T4 is CUT, not deferred** — nothing is left undone. The property T4 would
have added (cross-crate coherence drift) is a records-not-queues problem the
residual sink already owns, and `[R/planned-set]` + `[R/sanction-shape]` fully
close the surface T4 was aimed at. Recorded in ADR-0210 as a
considered-and-rejected alternative with the measured reason.
**Consequence: `checkNoClientIdentity` keeps its SINGLE parameter** — no second
argument, no injected reader, no import-purity hazard, no hoisting out of the
`:5852` loop, no churn across 14 fixture call sites. Much smaller diff.

## ACCEPTED — fixture corrections
- FG74a is built by CONCATENATION onto `GOOD_ACCOUNTS`, so `mut()`'s
  throw-on-missing protection does not apply (measured repo failure shape
  [[first-occurrence-replace-voids-bite-proof]]). It MUST self-check:
  `parseReducers(stripRustSource(src)).length === 6` **and** the fixture text
  contains the `SCHEDULER_GUARD` needle — red-team measured that a bare
  zero-param stub named `account_deletion_reaper` yields the identical PASS, so
  without the self-check FG74a proves less than its prose claims.
- FG74a carries an in-run **PRE-FIX RED CONTROL**: recompute the OLD exact-set
  equality over the REQUIRED names against the SAME source and assert it REDs.
  This is the ADR-0010 proof-of-teeth, executed every run rather than asserted
  once at authoring time (rb-5 X4 precedent).
- Draft FG74g/h/i/k (all SSOT-parse fixtures) are CUT with T4.
- FG73o hazard confirmed: bare exact-case `Owner` / `Id` as a standalone
  identifier above `function runTeeth() {`. `REDUCER_SANCTIONS`,
  `assertPlannedSet`, `assertSanctionShape` are all safe.
- FG70's real anchor is `'REKEY_MAN' + 'IFEST = freezeManifest({'` (`:2311`),
  NOT bare `freezeManifest(` — so the shared `freezeManifest()` deep-freeze
  helper (`:1403`) CAN be reused for the ledger. (Corrects the refined plan.)
- ARCHITECTURE.md entries end with an `ADR next-free = NNNN` trailer → bump to
  `0211`.

## FINAL TASK LIST
- **T1** `SANCTIONED_REDUCERS` (`:408-414`) → deeply-frozen `REDUCER_SANCTIONS`
  (5 × REQUIRED, 1 × PLANNED = `account_deletion_reaper`). `[R/name-set]`:
  (a) every found name is an OWN key; (b) every REQUIRED key is found.
  Non-vacuity guards `:491-507` byte-equivalent. Detail string + tooth count.
- **T2** `[R/sanction-shape]` — closed `status` enum + closed field set, own
  properties only, runs FIRST, fails closed.
- **T3** `[R/planned-set]` — sorted PLANNED keys === exactly
  `['account_deletion_reaper']`, both directions.
- **T4** Fixtures FG74a–FG74h (renumbered below) + FG6/15/16/17/58 still bite.
- **T5** `gates/rb-6.mutation-probe.mjs` — wrong implementations, each pinned to
  its own FG label.
- **T6** ADR-0210 + `just adr-digest` regen; ARCHITECTURE.md paragraph.
- **T7** `just ci` green.

## FINAL FIXTURE TABLE
| FG | Fixture | Must |
|----|---------|------|
| 74a | GOOD_ACCOUNTS + S3-shaped scheduled table + `account_deletion_reaper` reducer WITH `SCHEDULER_GUARD`. Self-checks: 6 reducers parsed; guard needle present. Plus the PRE-FIX exact-set RED control on the same source. | PASS + control REDs |
| 74b | `{...LEDGER, adopt_guest:{status:'PLANNED', why}}` | RED `[R/planned-set]` |
| 74c | `{...LEDGER, delete_account:{status:'PLANNED', why}}` (REQUIRED→PLANNED demotion) | RED `[R/planned-set]` |
| 74d | the shipped LEDGER | PASS (non-vacuity control) |
| 74e | `{}` and `{account_deletion_reaper:{status:'REQUIRED',why}}` | RED `[R/planned-set]` (kills ⊆-only) |
| 74f | GOOD_ACCOUNTS with `guest_claim_reaper` renamed to `account_deletion_reaper` | RED `[R/name-set]` (REQUIRED-present survives) |
| 74g | **the measured bypass**: `{...LEDGER, migrate_legacy_account:{status:'LEGACY'}}` + the attack reducer of that name | RED `[R/sanction-shape]` |
| 74h | entry that is not an object · `status` missing · `status` non-string · an unknown extra field · a `status` reached only through `Object.prototype` | RED `[R/sanction-shape]` |
| 74j | append `pub fn constructor(ctx: &ReducerContext)` reducer | RED `[R/name-set]` (kills `if (LEDGER[name])`) |

## MUTANTS (T5 probe) — each must RED naming its OWN FG label
1. revert `[R/name-set]` to exact-set equality over REQUIRED ⇒ FG74a
2. delete the `[R/sanction-shape]` block ⇒ FG74g
3. delete the `[R/planned-set]` block ⇒ FG74b
4. `found.every(n => n in LEDGER)` (prototype chain + no REQUIRED-present) ⇒ FG74j
5. drop the REQUIRED-present half of `[R/name-set]` ⇒ FG74f
6. `[R/planned-set]` relaxed to ⊆ ⇒ FG74e
7. `status` compared with `!=` against only `'REQUIRED'` (open third status) ⇒ FG74g
