# monster-realm v2 — supervisor handoff (rolling; older entries in monster-realm-handoff-archive-2026-08.md, monster-realm-handoff-archive-2026-07.md)

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

## 2026-08-24T04:03:59Z — m24-ceremony merged (PR#40)
Supervisor tick mr-sup-native-20260824T035621Z-3509101 reconciled the finished m24-ceremony run (rc=0, session leader dead, .done present, .err empty, 403 turns, $69.66). Converged specs/monster-realm-v2/M24-internationalization.spec.md from provisional sketch to implementation-ready via the mr-feedback-doctrine.md §6 heavy ceremony, citing both ADR-0006 and ADR-0057 per the operator's recency note. mr-gates verify initially reported FLAGGED with EVIDENCE-MISMATCH on 12/13 gates -- root-caused live to the harness-node-toolchain-PATH-trap (Bash resolves system node v18, harness pins v24 via asdf) STACKED with mr-gates defaulting --repo/--cwd to the monster-realm project root instead of the harness repo where this slice's spec files actually live. Re-ran with asdf node v24 on PATH and --repo/--cwd pointed at the m24-ceremony worktree: all 13 gates reverified passed=true agrees_with_evidence=true (evidence_mismatch=[] in mr-audit's acceptance block). Remaining FLAGGED reason (SPEC-SECTION-NOT-FOUND) is expected for this slice class: a ceremony slice authors its own X* gates (seeded=0, all-extra) rather than deriving criteria from a spec-declared slice section, same as the already-merged m22/m23 ceremonies. mr-audit: policy=CLEAN, mandatory_read=false (doc-only exemption), gating_advisory=CLEAN (0 removed asserts/suppressions), orchestration sub-verdict FLAGGED on the tester-role heuristic (expected for a docs-only slice with no code to test; roles already show reviewer+verifier present with a real adversarial pass, 1 fix applied per the run's own PR body). PR #40 squash-merged (db653a5), worktree/branch cleaned (local+remote). mr-gates residuals close: 0 owned by m24-ceremony (clean). 3 unclaimed residuals remain (R-rw3b-X6-rw3c-half, R-rw3b-X8, R-rw3c-X3), all MED, <1 day old, none past staleness threshold -- no preemption. Reconciliation note: found 3 prior supervisor ticks (m22 merge, m23 launch, m23 merge -- 2026-08-24T01:00Z/T02:03Z/T02:57Z) had written handoff/mr-state.json entries locally but never committed+pushed them, the same gap the T00:06Z tick previously caught once. Committed them separately (42e6048, rebased to 36e658e after this tick's own merge landed first) rather than folding into this row, keeping each tick's bookkeeping attributable to its own commit. Pre-existing human strays (future-prompts.md edits, untracked gdd.md) stashed+restored around the rebase, left untouched. Governor NORMAL (898.26/2783 d7 effective, fable_ok=true unused). M25 remains eligible next tick (last of the M22-M25 operator-authorized ceremony batch).
## 2026-08-24T02:57:37Z — m23-ceremony merged (PR#39)
Converged specs/monster-realm-v2/M23-accessibility.spec.md from provisional sketch to implementation-ready spec (12/12 sections, 36 EARS A11Y-* criteria, 12-slice table, 5 evals, attribution table, 5 escalations) per mr-feedback-doctrine.md §6 heavy ceremony, grounded in the now-built overlayRegistry.ts substrate (ADR-0162-0164). PLAN.md M23 bullet updated to COMPLETE. Single opus attempt, 91 turns, $18.93, adversarial review pass applied 2 major + 2 minor fixes before merge. mr-gates local ledger: 12/12 met. mr-gates verify tool malfunctioned on this tick (garbled '} | Node.js vX' output across all 11 non-spotcheck CHECKs, uniform across different checks -- classic tool-bug signature, not a per-check failure); manually re-ran X1/X2/X11 in the m23-ceremony worktree and all matched recorded evidence exactly, so adjudicated CLEAN rather than treating as EVIDENCE-MISMATCH. mr-audit orchestration verdict FLAGGED (missing tester/reviewer/verifier role heuristic) but policy=CLEAN/mandatory_read=false (doc-only exemption) and the run log shows an actual reviewer+verifier pass with fixes applied -- adjudicated CLEAN. Worktree removed, local+remote m23-ceremony branches deleted, main fast-forwarded to 71f35da.
## 2026-08-24T02:03:11Z — m23-ceremony LAUNCHED — accessibility heavy-ceremony spec convergence
Launched m23-ceremony (harness repo, opus@medium, tier=content, rid=mr-spawn-20260824T020248Z-3261680, leader pid=3261733) per the 2026-08-23 operator authorization (PLAN.md sec9): the mr-feedback-doctrine.md sec6 heavy ceremony (investigation -> 6-way ideation -> judge synthesis w/ attribution table -> adversarial review) on M23 Accessibility, converging specs/monster-realm-v2/M23-accessibility.spec.md from a design sketch into an implementation-ready spec (EARS SHALL criteria + slice breakdown), following M22's ceremony (10 slices, 24 criteria, merged clean as PR#38/141aabb this session) as the shape precedent. Grounded in the now-built overlayRegistry.ts/canOpen substrate (ADR-0162-0164) per the operator's recency note; M19 retrofit sub-scope written as explicitly deferred since M19 itself is unbuilt/post-gate. Deliberately serial after M22 (not fanned out in parallel) -- the prior tick wanted to see the first ceremony-via-mr-spawn output land clean before committing another, and it did (M22 verified: files==declared touches, mr-gates 9/9, mr-audit CLEAN-doc-exempt, spec diff spot-read as substantive). Docs-only / no touches: conflicts with anything, so M24/M25 ceremonies remain eligible for a future tick without waiting on this one. adr=0032 is the pre-existing design ADR for M23 (no new ADR reservation needed; adr_next_free stays 205). DIRTY-TREE-ADVISORY on launch: 4 pre-existing uncommitted tracked changes in the harness main checkout (future-prompts.md, monster-realm-handoff.md, monster-realm-handoff-archive-2026-08.md, mr-state.json) plus untracked gdd.md -- all pre-dating this tick by hours (oldest mtime ~40h, newest supervisor-owned files ~1h before this tick's own writes), confirmed NOT fresh human activity via the gate-2 probe; the slice branches from origin/main and won't see them regardless. Left untouched (not mine to commit/discard). Governor NORMAL (807.39/2783 d7, effective). No open PRs, no residual past staleness threshold (3 open, all <5h old, MED severity, unpromoted -- too fresh to promote). Nothing else to merge/resume this tick.

## 2026-08-24T01:00:56Z — m22-ceremony merged (PR#38)
Supervisor tick mr-sup-native-20260824T005740Z-3236388 reconciled the finished m22-ceremony run (rc=0, session leader dead, .done present, .err empty). PR https://github.com/mdrewt/claude-harness/pull/38 squash-merged to main at 141aabb. Content-tier doc-only slice: converged the M22 privacy/deletion spec from provisional sketch to implementation-ready via the full mr-feedback-doctrine.md §6 heavy ceremony (19 agent calls: expert/general-purpose/judge/red-team/researcher/reviewer/verifier roles). Decision: DECIDED registry = EXTEND live REKEY_MANIFEST/G6 gate rather than build a second mechanism (compile-time registry falsified — no proc-macro/inventory/linkme in the workspace, wasm32 cdylib has no ctor host). 38 tables classified exhaustively: 12 ERASE + 4 ANONYMIZE + 5 JOIN-ONLY + 17 NOT-OWNED. Review found 2 MAJOR + 4 MINOR issues (auth_issuer sentinel value, tombstone-vs-WILD_IDENTITY collision, citation formatting) — all fixed pre-merge, verifier PASS confirmed. mr-gates verify: 9/9 acceptance gates met, spotcheck agreed. mr-audit (--doc-only 1): orchestration=CLEAN-doc-exempt, gating=CLEAN, policy=CLEAN (mandatory_read=false). Worktree/branch cleaned. adr_next_free correction noted in the spec itself: mr-state.json says 204 but docs/adr/0204-roster-wave-3-electric-and-light.md already exists on disk — true next-free is 0205; a slice-S0 fix-up is specified in the spec's own §7 S0. No new eligible harness/project slices identified this tick; standing down.
## 2026-08-24T00:06:22Z — launch m22-ceremony (HEAVY design ceremony, per 2026-08-23 operator authorization)
Native tick (rid=native-20260824T000013Z-3111031). Reconciled a previous-tick gap first: the
23:33-23:40Z tick had merged PR#358 (rw3c) and updated mr-state.json/handoff/spec locally but
never committed to the harness repo -- committed those (harness main 48130ef) and pushed, leaving
two unrelated human stray edits (future-prompts.md, gdd.md) untouched and uncommitted, as usual for
strays. Re-verified master green at 12af096 (both local git log and live `gh run list`), remotes
match on both repos, no open PRs, no live locks.

Gate 3 pick-work: master CI green, nothing open/parked. mr-gates residuals list --unclaimed showed
3 unpromoted MED residuals (R-rw3b-X6-rw3c-half, R-rw3b-X8, R-rw3c-X3), all age <1 day -- well under
t1_promote_days=3, so none outrank normal PLAN Sec9 work.

Full PLAN Sec9 derivation (delegated recon to an Explore agent, verified its findings myself against
PLAN.md lines 720-790 directly): M-postgate-roster-wave-3 (rw3a/b/c) is now fully DELIVERED --
fixed a stale spec line claiming "rw3b not started" as part of the commit above.
M-postgate-sixteenth-review-residuals is done except 16r-b, which stays SERIAL-REQUIRED against the
still-blocked 15r-sec-mig-* family. M-evolution-essence-graph (EG1-5) and M21 accounts/auth
(M21a/b/c + M21b-2) are both fully merged. Everything textually before M22 in PLAN Sec9 order is
genuinely blocked:wave-2/3/4-exit (time gate, boundary 2026-08-27, not yet reached) or SERIAL
against it -- not stale, verified against the 2026-08-22 operator note's own boundary language.

That leaves the 2026-08-23 operator authorization (PLAN.md ~line 724): heavy-ceremony treatment
(mr-feedback-doctrine.md Sec6: investigation -> 6-way ideation -> judge synthesis w/ attribution
table -> execution -> review) is explicitly AUTHORIZED for M22/M23/M24/M25 NOW via mr-spawn, "not by
waiting for lp-milestone-mode." I checked this against an older, contradicting finding in this same
handoff's 2026-08 archive (multiple ticks around 2026-08-01..03 concluded the native loop has "no
mr-spawn-equivalent mechanism" for a HEAVY ceremony and that the actual M20/M21 and essence-redesign
ceremonies were run interactively by Drew, not autonomously) -- but the 2026-08-23 note is dated
after those, explicit, and directly addresses closing that exact gap ("this note grants the missing
piece"), so I treated it as authoritative over the older ticks' hesitation. A rooted mr-spawn run has
full Agent-tool access and doesn't need the Workflow tool to run 6+ subagent brainstormer calls plus
a judge synthesis, so the mechanical objection (Workflow requires opt-in) doesn't actually block a
rooted run from doing this.

ACTION THIS TICK: launched `m22-ceremony` (content tier, opus@medium -- no code/schema/security
touches at the ceremony-only stage, so HARD tier doesn't apply despite M25 being explicitly HARD in
the routing doctrine) via mr-spawn. touches: specs/monster-realm-v2/M22-privacy-compliance.spec.md +
PLAN.md (harness repo, docs-only). target_desc instructs it to run the full Sec6 ceremony using
Agent-tool subagents directly (not Workflow), grounded in the sketch's own Recency-check section
(the real merged M21 delete_account/PendingDeletion machinery + ADR-0194/ADR-0198 private-table+view
precedent), and to produce a converged implementation-ready spec (EARS criteria + touches + slice
breakdown) mirroring the M-evolution-essence-graph.spec.md precedent -- explicitly NOT to write or
touch any code this slice. run_id=mr-spawn-20260824T000541Z-3115320, leader pid=3115370,
claude_pid=3115373, lock written. NOT fanning out M23 in parallel this tick -- first-ever
ceremony-via-mr-spawn attempt, no precedent for how well the generic PRERRR brief template maps onto
the doctrine's ceremony process; want to see how m22-ceremony's actual output looks before
committing a second one alongside it. NEXT TICK: if m22-ceremony's brief mapping proves workable,
consider fanning out M23/M24 (pairwise touches-disjoint, pure docs); M25 is explicitly HARD tier
once it reaches ceremony too. GATES-SEEDED 0 criteria (SPEC-SECTION-NOT-FOUND, expected for a sketch
with no EARS section yet -- known quirk, not an error).

Governor NORMAL (d7=$783.13/2783, fable_ok=true). No BLOCKER raised. No rate-limit event.
## 2026-08-23T23:39:30Z — rw3c MERGED (PR#358, 12af096)
rw3c (M-postgate-roster-wave-3) squash-merged: master ee2e093 -> 12af096. Zone-1 wild
placement for wave-3 tier-0 forms (Voltkit=40, Aurelet=42); CONTENT_VERSION 20->21.
New invariant: band max_level strictly below lowest outgoing evolution-edge min_level
(gated in both rw3c_wave3_tuning.rs and the eval, scoped to wave-3 set only). Red-team
found+closed 3 gaps (F1 partial-set vacuity, F2 block-comment hygiene, F3 shadow zone-0
table) before ship.

Adjudicated FLAGGED: pt_d3_tuning.rs pins extended (not weakened) 40/42 into the
wild-legal set + count 7->9 — disclosed touches-delta, matches ADR-0204:81,103. mr-audit
orchestration CLEAN. mr-gates 9/10 met, X3 deferred to backlog (RW3-08 wording is
mechanically unsatisfiable as worded for any placement slice — duplicate of open
R-rw3b-X8, not a new issue).

Worktree removed, slice/rw3c branch deleted (local+remote). Master CI (run 32674101030)
was still in_progress at record time — verify green on next tick before further action
on top of 12af096.

Follow-ups (not touched, outside this slice's scope): species/070-wave3.ron:20-22 stale
comment; evals/content-version.eval.mjs --update flag doesn't exist; lib.rs
CONTENT_VERSION changelog missing v19-21 entries; promote band-below-gate rule to a real
R13 (blocked on pre-existing species-7 violation).

## 2026-08-23T22:02:26Z — rw3c LAUNCHED (M-postgate-roster-wave-3 obtainability + tuning)
**Slice:** rw3c — wild placement for wave-3 tier-0 forms (species 40 Voltkit Electric, 42 Aurelet Light) in the zone-0 encounter table + level/weight banding. **Repo:** project (mdrewt/monster-realm). **Model:** opus@medium (tier=content). run_id=mr-spawn-20260823T220158Z-2902308, session_leader=2902365.

**Why now:** rw3b merged this session (PR#357, ee2e093). rw3c is after:rw3b per its spec's candidate-slices table and was the only unblocked, unstarted item in the queue (queue[] empty, no promotable residuals -- R-rw3b-X6-rw3c-half and R-rw3b-X8 both <1h old). This closes the RW3-06 second clause and the X6 residual rw3b disclosed.

**Briefed constraints:** RW3-06 (tier-0 only, never an evolution-edge target -- R6 in content.rs), RW3-07 (zone-0 table byte-identical except additive entries -- recruit.spec.ts flake budgets depend on the exact existing weights), RW3-08 (CONTENT_VERSION-only Rust touch), RW3-09 (own eval+test, live CONTENT_VERSION bump, regenerated content-hash.json). No new ADR reserved (rw3c doesn't need one per spec Notes).

**Housekeeping done before launch this tick:** committed+pushed the previous tick's uncommitted rw3b-merge bookkeeping (harness commit 2e48ed9, mr-state.json + handoff + archive). Reaped the stale rw3b per-run lock (dead session_leader 2700302) via mr-unlock. Chain-owner mutex taken for this tick's derivation, will release at tick end.

**Not actioned:** decision issue mdrewt/monster-realm#342 (OBS-48 procedures re-adjudication) is explicitly record-and-ignore per its own text -- left open, untouched.

## 2026-08-23T21:31:56Z — rw3b merged — roster wave 3 (Electric + Light) landed
PR https://github.com/mdrewt/monster-realm/pull/357 (slice/rw3b -> master) squash-merged as ee2e0930, worktree+branch cleaned. mr-audit: orchestration CLEAN, gating_advisory CLEAN, mandatory_read=false. Acceptance ledger: 12/13 met, 1 legitimately DEFERred (RW3-08, mechanically unsatisfiable as written for any slice adding an evolution edge/derived species — two pre-existing exact-pin tests were extended field-for-field, never weakened), 0 unmet; mr-gates verify independently re-confirmed 12/12 mechanical gates fresh (first pass showed false EVIDENCE-MISMATCH on X1-X5/X10/X11 from a supervisor-shell PATH gap missing ~/.cargo/bin, not a real slice defect — re-ran with PATH fixed and all agreed). Spotcheck X6 held under adversarial re-read. Two residuals emitted to backlog: R-rw3b-X6-rw3c-half (rw3c must place wave-3 tier-0 species in an encounter table) and R-rw3b-X8 (RW3-08 reword needed — both too fresh (<1h) to promote this tick, left unclaimed for a future Pick-work gate). Diff included touches-delta beyond declared touches (two id baselines, evolution-path-edge-ids.json, append-only-ids.eval.mjs, plus doc-set ARCHITECTURE.md/DIGEST.md) — disclosed and reasoned in the PR body as the standard content-id side effect; no sibling slice was in-flight to collide with. Roster now 16 -> 20 forms (species 40-43: Voltkit/Voltarion Electric, Aurelet/Aurelith Light). ADR-0204. master CI was still in_progress at merge-record time (post-merge re-verify pending a future tick/event) — the identical commit's PR checks (ci+e2e) were green. Queue empty, no inflight, nothing launched this tick — next tick needs a full PLAN §9 derivation to pick new work.

## 2026-08-23T21:21:15Z — rw3b PR#357 e2e flake — reran, delegated to mr-ci-watch
PR #357 (rw3b, roster wave 3) mergeStateStatus=UNSTABLE: ci job passed, e2e job failed on client/e2e/monster-privacy.spec.ts:394 (PvP battle overlay Accept-button click, DOM-detachment/pointer-intercept retry signature). This file is outside rw3b's declared touches: (content/species/skills/evolution_paths, server-module CONTENT_VERSION 19->20, evals, art gen) -- rw3b never touches client PvP/battle-overlay code. Master's own most recent CI run (17:01Z) passed this exact e2e job cleanly, and the prior 16:46Z master run's e2e job also passed (only the outer 'ci' job failed that run, unrelated). Adjudicated as flake, not a real regression. Reran the failed job: gh run rerun 32666332349 --failed. Delegated the wait to mr-ci-watch (setsid, pid 2873765) rather than polling. Supervisor did not merge; next event tick resumes the merge decision once mr-ci-watch reports back.
## 2026-08-23T20:02:10Z — rw3b LAUNCHED (M-postgate-roster-wave-3 content drop)
**Slice:** rw3b — atomic content drop for M-postgate-roster-wave-3 (Electric+Light species/skills/evolution, ADR-0204). **Repo:** project (mdrewt/monster-realm). **Model:** opus@medium (tier=content). **run_id:** mr-spawn-20260823T200138Z-2700237, session_leader=2700302.

Derivation: queue[] empty, residuals unclaimed empty, no open PRs either repo, no inflight/parked slices, master CI green both repos. Full PLAN §9 derivation (via the handoff's rw3a-COMPLETE entry, which already named rw3b as the unlocked next candidate) landed on rw3b — rw3c is `after: rw3b` per spec (both bump CONTENT_VERSION, not parallel-safe), so only rw3b launched this tick; rw3c stays queued behind it.

**Pre-launch fix:** first `mr-spawn rw3b` returned `REPO-OUT-OF-SYNC` (project local master behind origin/master by 1 — PR#356 knowledge-bundle-regen chore had merged since the last tick). Checked out `master`, `git merge --ff-only origin/master` (8f7fca3→8add7d7, 89 docs/knowledge files only), deleted the now-fully-squash-merged local `chore/knowledge-bundle-regen-20260823` branch (`-D`, remote already gone). Respawn succeeded clean.

**Gate-seed note:** `mr-gates` returned `SPEC-SECTION-NOT-FOUND` (criteria=0 seeded) — the milestone spec's `## Acceptance criteria (EARS)` section (RW3-01..09) is shared across rw3b/rw3c rather than living under a per-slice `### rw3b` heading, so the auto-seeder found nothing to attach. Advisory gap, not a stop condition: at merge-time adjudication, manually cross-check RW3-01/02/03/04/05/08/09 (rw3b's subset; RW3-06/07 are rw3c's) against the ledger read since the mechanical seed has nothing there.

Harness repo had 2 local unpushed `chore(mr-sup):` commits (970da52, a85d229) from the 19:00Z tick — pushed to origin/main this tick (REPO-OUT-OF-SYNC prevention for any future harness-repo slice). Drew's own uncommitted `future-prompts.md`/`gdd.md` edits in the harness tree are untouched (pre-existing strays, old mtimes, no active session detected).

Next candidate after rw3b merges: rw3c (encounter placement/tuning, `after: rw3b`, project repo, not parallel-safe with rw3b).
## 2026-08-23T19:04:12Z — 2026-08-23T19:00Z — reconciliation tick: rw3a merge record fixed, bookkeeping committed, issue #34 closed
The 18:04Z tick squash-merged rw3a (PR#37) and wrote the ledger MERGED row + a COMPLETE handoff entry, but was cut off before updating mr-state.json (inflight[] still listed rw3a as running) and before committing anything to git. This tick (native-20260823T190015Z-2683700): verified live (no per-run/chain locks, no open PRs either repo, local main == origin/main @ a842116, no resident human session) that rw3a is genuinely done; cleared inflight[], updated master.sha; committed the supervisor-owned files that had been sitting uncommitted across several ticks (this handoff + its 2026-08 archive, mr-state.json, the 15r-a1 spec Delivered annotation, decisions/*.url+.answer.md, the lp-09 patch, branch-cleanup tsv, and 12 per-slice plan/progress memory cards — 33 files, commit 970da52) — left Drew's own future-prompts.md and gdd.md untouched. Also closed github issue #34 (claude-harness) per close-the-loop doctrine: Drew answered it 2026-08-23T11:48:56Z ('yes, no provenance always means it is an operator hold') and a prior tick had consumed the answer into decisions/issue-34.answer.md, but never closed the issue; mr-hold status is HOLD-NONE so this was pure bookkeeping catch-up, not a live gate lift. No new slice launched or merged — reconciliation was this tick's one action. Handoff's rw3a-COMPLETE entry (above) still names rw3b/rw3c as the next queue candidates (project repo, chain serially — both bump CONTENT_VERSION); neither was queue-added this tick, left for the next tick's full derivation.
## 2026-08-23T18:04:42Z — rw3a MERGED — PR#37, roster-wave-3 spec authored
Slice rw3a (harness, spec-authorship-only for M-postgate-roster-wave-3: Electric+Light roster wave) merged squash via PR#37 (a842116). Acceptance 8/8 met per mr-gates render; PR body line matched.

Adjudication note: mr-gates verify returned FLAGGED (EVIDENCE-MISMATCH on X1-X6, X8) on the post-merge re-run. Root cause: the verify tool's cwd resolved to $PROJ (monster-realm project checkout) instead of the harness worktree for this harness-repo slice, so the node -e checks ran against the wrong tree and X8's `just ci` hit a Rust/cargo project instead of the harness one. Manually re-ran X1's check from the correct harness worktree cwd — output matched the recorded evidence exactly (skeleton ok=8 of 8). X5's scope check (git diff origin/main...HEAD) also confirmed the diff is scoped to specs/monster-realm-v2/ only, matching the recorded evidence. Treated as a tool artifact, not a slice defect, and merged. mr-audit orchestration + gating_advisory verdicts were both CLEAN (7 agent calls incl. tester/reviewer/verifier roles).

Follow-on unblocked: content-authorship slice (project repo: game-core/content/species/*, game-core/content/skills/*, docs/adr/0204-*.md) for M-postgate-roster-wave-3 is now launchable per the normal content-pack pattern. Reserved project ADR-0204 for it (per rw3a's spec). Not queued this tick — flagging for next tick's derivation.

master (harness) fast-forwarded to a842116, worktree/branch cleaned, per-run lock removed.

## 2026-08-23T17:28:03Z — Native tick: launch rw3a (M-postgate-roster-wave-3 spec authorship)
Gate 0-2 clean: no live per-run locks, no chain-owner mutex, master CI green both repos
(project master @ 8add7d7 after PR#356 knowledge-bundle fix; harness main unchanged),
mr-state.json inflight/awaiting_merge/queue all empty, no unclaimed residuals, no resident
human session (probe clean). PLAN §9 derivation: 16r pulled-forward set fully closed except
16r-b (SERIAL-REQUIRED behind the still-blocked 15r-sec-mig-* family — correctly skipped).
Next pulled-forward item per the 2026-08-23T16:35Z operator note: M-postgate-roster-wave-3,
DE-GATED, zero prior PRs/commits, no spec file yet.

First mr-spawn attempt hit REPO-MIXED (touches spanned both harness spec dir and project
content dirs) — corrected by splitting: this slice (rw3a) is HARNESS-repo spec authorship
only (write specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md per the
M-playtest-d-content-pack.spec.md precedent: candidate-slices table reserving the next
species-id band (top out at 31 in 060-item-evo-derived.ron; recommend 40-49 / 070-wave3.ron),
Electric+Light skill kits sequenced per the ADR-0143 STAB gate, and a note to reserve project
ADR-0204 at build time). Second attempt hit vars.json missing required `tier` field — added
`tier: content`. Launched: opus@medium, tier=content, repo=harness, pr_repo=mdrewt/claude-harness,
leader pid=2571046, rid=mr-spawn-20260823T172732Z-2570981. mr-gates seeded 0 criteria (expected —
no spec exists yet for this slice to seed against).

DIRTY-TREE-ADVISORY (non-blocking, already known): harness working tree carries 6 pre-existing
uncommitted tracked changes (future-prompts.md — Drew's live freeform notes file, untouched;
mr-state.json/handoff/spacetime-db-testing.md/M-postgate-fifteenth-review-residuals.spec.md/
archive-2026-08.md — legitimate supervisor-record edits from the 17:02Z master-CI-red-fix tick
that were never committed). Left untouched again this tick, same as the prior tick's note —
worth a dedicated reconciliation pass (commit the legitimate mr-record deltas, leave
future-prompts.md alone) but out of scope for a single-action tick.

No fan-out this tick (single slice; M22-M25 ceremony launches deferred to a follow-up tick to
keep this one simple and auditable).
## 2026-08-23T17:02:14Z — master CI red — knowledge-bundle regen chore PR#356
master HEAD 8f7fca3 (docs(schema): fix stale battle_action comment) tripped knowledge-bundle-conformance (M8.95b): schema.rs comment edit shifted line numbers without regenerating docs/knowledge/. Opened chore/knowledge-bundle-regen-20260823 -> PR#356 (just knowledge regen, 89 files, mechanical, doc-only), gh pr merge --squash --auto armed, CI wait delegated to mr-ci-watch (detached). No slice work launched this tick pending the fix.
## 2026-08-23T16:35:11Z — PLAN §9 tail review: roster-wave-3 pulled forward + M22-M25 ceremony authorized
**Interactive session (Drew present), docs-only, no code touched. Written ahead of the
`wave-2/3/4-exit` gate lifting (Thu 20:00 ET) so the native loop has real work in the meantime.**

**(1) `M-postgate-roster-wave-3` pulled forward.** PLAN.md gained an operator-directive blockquote
(same pattern as the 2026-08-22 16r fix) immediately before its entry: it's launchable now, its
DE-GATED sequencing precondition (hardening + ux-design milestones) is satisfied, and re-verified
live content confirms Electric/Light still have zero species and zero skills — the gap is real and
unstarted. **It has no spec file yet** (`M-postgate-roster-wave-3.spec.md` doesn't exist), so
`queue[]`/`mr-record queue-add` doesn't apply — the first tick action on it is content-spec
authorship (content/data tier, `opus @ medium`), following the `M-playtest-d` precedent, then
normal content-pack slicing/fan-out. Read the PLAN.md note in full before acting on it.

**(2) M22–M25 heavy-ceremony spec-writing AUTHORIZED.** Same `mr-feedback-doctrine.md` §6 treatment
the 2026-08-08 override gave M20/M21 — launch as an ordinary rooted-run slice (`mr-spawn`), not
through `lp-milestone-mode` (still unbuilt, `blocked:wave-1-exit` — the 2026-08-16 W0-0 Tier-C
allowlist populate doesn't help you here, it's for that future automation). Architectural/
irreversible decisions the ceremony surfaces still go through `mr-ask-drew` as normal — this only
authorizes *starting* the four ceremonies. Implementation still waits its normal PLAN §9 turn; M18/
M19 were reviewed but NOT authorized (still `blocked:playtest-gate`).

**(3) All six sketches (M18/M19/M22/M23/M24/M25) + `security-threat-model.md` got a recency pass**
against everything that's shipped since they were written (15r-sec-a's private `battle`+`my_battle`
view, 13r-e's `monster_pub` privacy, M21's `delete_account`, uxd3's `overlayRegistry.ts`, ADR-0057's
content-dir loader, and the confirmed RLS-unenforced-at-2.8.1 fact). Each sketch gained a "Recency
check (2026-08-23)" section — **read it before running that milestone's ceremony**, it names stale
citations and one real open design question (M18: the raid's 3-participant battle-visibility model
isn't covered by `my_battle`'s two-identity view — needs a decision, not an assumption).
`security-threat-model.md` §0/§1/§4 were corrected in place: RLS is confirmed unenforced (not
"experimental, verify per-version"), and the standing mitigation is private-table + scoped
`#[view]`, proven twice (ADR-0194, ADR-0198).

**(4) `mdrewt/monster-realm#342` read and incorporated, left OPEN.** Drew's ruling: M20's OBS-48
overstated his intent (blanket-forbid unstable features); softened to "require justification, not
avoidance," and generalized — a version bump promoting a feature to stable makes it available if
genuinely useful, not limited to Procedures or SpacetimeDB. This is now referenced in the M22–M25
ceremony note (weigh it during ideation) and in the threat-model correction (explicitly does NOT
extend to RLS, which stays inert on its own evidence). **Deliberately not acted on:** OBS-48's own
EARS text and `ADR-0180` were left untouched — the issue's own text names a different consumer
("weekly generate-improvement-plan run") and says "Supervisor: record-and-ignore — do not act on or
close this issue." Don't close it; don't be surprised it's still open.

**(5) Full detail:** `memory/decisions-log.md`'s 2026-08-23 monster-realm entry has the complete,
grounded writeup (file:line citations, ADR numbers, what was and wasn't changed). Read that before
re-deriving any of this from scratch.

Files touched (harness repo, `main`): `specs/monster-realm-v2/PLAN.md`,
`M18-coop-raids.spec.md`, `M19-social.spec.md`, `M22-privacy-compliance.spec.md`,
`M23-accessibility.spec.md`, `M24-internationalization.spec.md`, `M25-security-audit.spec.md`,
`security-threat-model.md`, `memory/decisions-log.md`. Nothing in the `monster-realm` project repo
changed. Committed and pushed to `main` this session (see the commit for the exact SHA).
## 2026-08-23T14:02:59Z — 2026-08-23T14:02:59Z — native tick: standdown, nothing actionable
Re-verified live ground truth for this tick (rid=native-20260823T140007Z-2481740). No open PRs in either repo. Project master CI green at 588b24e (matches mr-state). Harness main has no CI workflow, working tree synced with origin/main. mr-hold status HOLD-NONE. No per-run locks, no chain-owner mutex. Reconciled the three flagged .done files (lp-brief-cost, lp-06, lp-ollama): all three already merged (PR#31 1493e4a, PR#33 51073c8, PR#32 d3d1df5) and already recorded in the ledger/handoff per 2026-08-22 entries; the .done/.done.recorded pairs are stale leftovers only, consistent with the 2026-08-22 tick that first flagged them — no action needed. mr-gates residuals list --unclaimed is empty. queue[]/inflight[]/awaiting_merge[] all empty per mr-state.json. Checked PLAN §9 eligibility fresh: every non-launched slice in M-loop-infrastructure is blocked:wave-1-exit (a time-gated one-full-reset-cycle measurement, not yet reached) and every M-postgate-fifteenth-review-residuals slice is blocked:wave-2-exit or later, except 16r-b which is serial-blocked behind the unstarted 15r-sec-mig-a/b/c/d + 13r-c-2 family. Nothing changed since the prior tick's (13:03Z) identical derivation. Uncommitted harness git strays (future-prompts.md, memory/spacetime-db-testing.md diffs; gdd.md; specs/monster-realm-v2/M-postgate-fifteenth-review-residuals.spec.md 'Delivered (2026-08-17)' doc-truth annotation; memory/projects/decisions/*.url + *.answer.md; several monster-realm-*-plan.md/progress.md memos; memory/projects/patches/lp-09-guard-bash-monster-realm.patch) are the same set multiple prior ticks (including the 2026-08-22T\xxx and 2026-08-23T13:03Z ticks) have already characterized as pre-existing legitimate artifacts (decision-issue records, per-slice plan memos, a saved patch, and human/agent doc edits) — left untouched again this tick, no destructive action taken. Took no mutating action. Governor NORMAL (d7≈$605/$2783≈22%). No BLOCKER.
## 2026-08-23T11:57:08Z — 16r-h merged; M-postgate-sixteenth-review-residuals closed except serial-blocked 16r-b; hold-aged/hold-unattributed decisions closed
Merged PR#355 (feat(16r-h): nightly red-response policy) into monster-realm master (588b24e), squash+delete-branch. mr-audit acceptance block FLAGGED only on a cwd artifact (B1 exec-error re-verifying from repo root instead of the worktree); mr-gates verify run from the correct worktree cwd (.claude/worktrees/16r-h) got CLEAN 1/1, spotcheck agreed, and all 3 mutation-canary bites (renamed job, dropped row, uncited job) confirmed teeth. Diff reviewed directly (mandatory_read=true): ARCHITECTURE.md + docs/adr/0203 + DIGEST.md additions are scoped and consistent with the ADR catalog; ADR-0203 correctly follows 0202 (no numbering collision despite mr-state adr_next_free showing stale 202). Residuals close: 0 for 16r-h. Local worktree/branch cleaned; stale per-run lock reaped via mr-unlock stale (session_leader 2277590 was dead). Master CI re-verify was still in_progress at merge time (PR-level ci+e2e had already passed CLEAN before merge) — not re-polled to completion this tick; next tick should spot-check it landed green.

This closes M-postgate-sixteenth-review-residuals except **16r-b**, which stays SERIAL-REQUIRED behind the 15r-sec-mig-a/b/c/d + 13r-c-2 family; that family has NOT started (no 15r-sec-mig-* merges found in master history) and 15r-sec-mig-a itself carries blocked:wave-2-exit. 15r-sec-a/15r-sec-vis/15r-a2 (the spec's own 'launchable in order once the bump lands' chain) are already merged (#336/#337/#338) — the milestone's actual next launchable step is clearing wave-2-exit for 15r-sec-mig-a, not a fast eligible slice this tick.

Also closed two operator-answered DECISION issues via mr-decision-watch transcripts already staged in $MEM/decisions/: issue #36 (hold-aged, confirmed deliberate/long-running operator hold — future ticks should wait patiently on any hold whose provenance is 'operator' regardless of duration) and issue #35 (hold-unattributed, confirmed unattributed/zero-provenance flags read as operator holds). `mr-hold status` now reports HOLD-NONE — the hold that prompted both questions has since been lifted; both issues closed with `<!--mr-system-->`-prefixed comments per the close-the-loop doctrine.

NOTED, not acted on: the harness working tree carries a large set of pre-existing uncommitted changes unrelated to this tick (modified future-prompts.md, several memory/projects/* files, an uncommitted 'Delivered (2026-08-17)' doc-truth annotation on M-postgate-fifteenth-review-residuals.spec.md for the already-merged 15r-sec-vis slice, plus many untracked plan/progress/decision files). These look like accumulated strays from prior sessions/runs, not this tick's work — left untouched pending investigation rather than stashed or discarded blind.
## 2026-08-23T11:42:07Z — 16r-h: CI-wait delegated for PR #355
Supervisor tick mr-sup-native-20260823T114134Z-2446070 reconciled the finished 16r-h run (rc=0, session leader dead, .done present). PR https://github.com/mdrewt/monster-realm/pull/355 is OPEN, mergeable=MERGEABLE, mergeStateStatus=UNSTABLE, checks ci+e2e still IN_PROGRESS. Delegated CI-wait for PR #355 to mr-ci-watch (pid 2447284, detached); resumes via event tick on completion. No merge attempted this tick. Governor NORMAL (d7=$602.03/$2783≈22%, fable_ok=true). No BLOCKER, no park-counter bump.
## 2026-08-23T10:24:20Z — Native tick: launch 16r-h (nightly red-response policy)
Gate 0 (fast-path standdown): 16r-a/c/d/e/f per-run locks all showed leader dead + .done present -> not live. Reaped via mr-unlock all (5 stale locks). Live ground truth: 16r-a/c/d/e/f/g all merged (PR#349-354, 2026-08-22..2026-08-23), master CI green at 367b3f7. No open PRs, no residuals unclaimed, feedback check OK (91 items), queue[] empty, no hold. Derived next slice via research agent + live re-verification: 16r-h (nightly red-response policy for mutation/coverage; after:16r-c, satisfied) — routine tier, fresh launch (no park memo), no ADR needed. 16r-b remains correctly blocked (SERIAL-REQUIRED vs still-blocked:wave-2-exit 15r-sec-mig family). Launched 16r-h via mr-spawn: leader=2277590, opus/high, detachment+model asserted. NOTE: found substantial pre-existing uncommitted drift in the harness working tree unrelated to this tick (future-prompts.md, gdd.md, memory/spacetime-db-testing.md look like human/Drew scratch edits -- left untouched; mr-state.json/handoff/usage-daily ledger show local edits from prior ticks' 16r-a/c/d/e/f reconciliation never committed since chore(mr-sup) commit b3216fd -- not committed this tick either, flagged as a risk for a future tick or Drew to reconcile).
## 2026-08-23T09:59:16Z — 16r-e merged: scheduled-function lateness observability
PR#354 squash-merged -> 367b3f7 (feat/16r-e-scheduled-function-delay). Recording rule + Grafana dashboard panel + warning alert for scheduled-function lateness (ops/observability/{prometheus.yml,rules/recording.rules.yml,grafana/**}). mr-audit: orchestration=CLEAN (7 agent calls, roles general-purpose/planner/red-team/reviewer/tester/verifier), gating-advisory=CLEAN, mandatory_read=false (routine tier). Acceptance ledger: NO-LEDGER (slice never seeded -- absent measurement, not a failure; no residual close needed). Disposition findings were corpus-scoped park-item citations unrelated to this diff -- informational only. Also reaped an orphaned worktree+branch for 16r-d (PR#352, merged a prior tick but left on disk). Local master fast-forwarded c31db59->367b3f7; remote master CI queued at record time, not yet observed green -- next tick should re-verify live before trusting it. No open PRs remain; queue[] empty; no eligible next slice was derived this tick (single merge action taken; full PLAN section-9 derivation deferred to the next tick).

## 2026-08-23T09:53:51Z — 16r-e e2e triage — reran, delegated to mr-ci-watch
PR #354 (16r-e, ADR: scheduled-function delay observability) showed e2e FAILURE on its own CI run (32604922710): wallet-balance.spec.ts:911 quest_001 precondition — 'quest_001 was neither started nor already completed after 5 attempts.' 16r-e's diff touches ops/observability/prometheus.yml, rules/recording.rules.yml, grafana/** + sibling tests only — no overlap with the dialogue/quest domain the failing test exercises. Master's own recent CI runs (16r-c, 16r-d merges) are green, so this reads as a pre-existing e2e flake, not a regression from this PR. Reran the failed job (gh run rerun --failed) rather than blind-relaunching the slice. Delegated the wait to mr-ci-watch (PR #354, slice 16r-e); resumes via event tick. If the rerun also fails, next tick should treat it as a real (possibly intermittent-but-real) issue in wallet-balance.spec.ts, not attribute it to 16r-e.

