# rb-25 build plan (planner/opus, 2026-08-31)

Slice: rb-25 — close residual R-rb-2-X10: needle<->key correspondence + identifier-boundary
matching in `[G6/consumed]` of `evals/guest-claim-integrity.eval.mjs`.
Touches: evals/guest-claim-integrity.eval.mjs (+ docs/adr/0222-*.md, ARCHITECTURE.md minimal).
ADR: 0222 (supervisor-assigned).

## Criterion (verbatim, rb-2 ledger X10)
WHEN a REKEY entry's `exists`/`rekey` needle names ANOTHER table's live helper
(measured: `heal_cooldown.owner_identity` re-pointed at `has_monsters(` with its own
`has_heal_cooldown` delegation deleted from `account_has_game_data` keeps the eval GREEN;
a needle `et_exists(` is also a substring hit on `wallet_exists(`) THE gate SHALL red —
needle<->key correspondence, and identifier-boundary matching in [G6/consumed].

## Verified facts (planner, in the rb-25 worktree)
- `GOOD_TREE` (:3040-3043) contains NO helper definitions; `GOOD_ACCOUNTS` (:2737-2965) defines
  only `account_has_game_data` + `rekey_all`. Any definition-resolving clause reds every GOOD
  control until the fixture gains helper bodies.
- Fixture cost is one splice: `GOOD_TREE[0].src` is inherited by `rb4Schema` (:5216), FG48 (:4090),
  FG59 (:4311) — ~40 call sites get it for free.
- rb-2's literal proposal (`containsIdent` swap) is WRONG: `containsIdent` checks BOTH boundaries,
  and with a paren-suffixed needle `hay[at+len]` is the `c` of `ctx` -> always false -> permanent RED.
  Only the LEFT boundary may be tested; the needle's own trailing `(` is the right boundary.
- FG73o (:6250-6320) bans a list of identifiers (`Owner`, `Id`, `Coins`, `Handoff`, ...) as whole
  identifiers ANYWHERE above `function runTeeth() {` — including new prose/comments. Self-red trap.
- Main guard at :6540 is REAL (`node evals/guest-claim-integrity.eval.mjs` runs the full suite,
  exits 0/1, prints one `eval PASS:` line). Not vacuous.
- `'(100 teeth verified)'` (:6531) is hand-maintained prose with no consumer.
- `evals/rekey-contract-surface.eval.mjs` `checkContractSurface` (:312-409) asserts PRESENCE of
  `REKEY_MANIFEST`/`findIdentityColumns`, not an exact export set.
- Table accessor names == the manifest key's table half (schema.rs 207/309/472/556/567/624/699/826),
  which is what makes `.{table}(` a sound join key.

## A. Design
Two tags, not one: `[G6/correspondence]` (helper does not touch this key's table) and
`[G6/mirror]` (exception map stale/over-broad/incoherent). Different defects, different fixes;
`expectTag` pins by tag, so one shared tag lets a mirror tooth be satisfied by a correspondence fail.

Placement: immediately AFTER the `[G6/consumed]` loop (:2556-2578), before `return null`.
`[G6/policy]` runs first (:2386) and guarantees NEEDLE_SHAPE, so the new code may assume trailing `(`.

Shared prep: hoist `strippedTree = treeSrcs.map(f => ({path, stripped: stripRustSource(f.src)}))`
above the `[G6/parse]` loop (:2404); rename needed (`stripped` at :2532 is the accounts binding).

Per REKEY entry, per half:
  table  = key.slice(0, key.indexOf('.'))          // fail-closed on no dot / empty side
  fnName = needle.slice(0, -1).split('::').pop()   // fail-closed on ''
  defs   = markers of `fn ${fnName}` with isWordChar boundaries across strippedTree
  defs.length === 0  -> [G6/correspondence] "no `fn X` declared anywhere in the N scanned source(s)"
  defs.length  >  1  -> [G6/correspondence] "declared N time(s)" (first-hit anchor forgery)
  findFnBody null    -> distinct "declared but has no body"
  compactWs(body)==''-> distinct "EMPTY body"
  assert: compactWs(body).indexOf('.' + table + '(') !== -1

`.{table}(` NOT `ctx.db.{table}(` — the aliased `let db=&ctx.db` bypass. Leading `.` + trailing `(`
are both boundaries: `.monster(` is not a substring of `.monster_pub(`, `check_monster(`, or
`rekey_monsters(`. Plain indexOf on that token is boundary-sound.

Rekey half: NO exceptions (8/8 hold today). No transitive callee following (re-opens the borrow
hole; YAGNI). Honest limit for the ADR: this is a NAMING-INTEGRITY check, not reachability — a
`.monster(` in dead code satisfies it.

`monster_pub` exception: frozen, NON-exported in-file map, read through a Map built once from
`Object.keys` (own-property boundary; a bare read lets a co-resident eval's Object.prototype
excuse any key in the shared run.mjs realm):
  EXISTS_COVERED_BY = { 'monster_pub.owner_identity': 'monster.owner_identity' }
Five policing clauses, all `[G6/mirror]`:
  1. cover C is a REKEY entry in `kinds`
  2. kinds.get(C).exists === kinds.get(K).exists  (same needle)
  3. K actually FAILS the strict exists check (else the excuse is stale)
  4. K !== C and tableOf(K) !== tableOf(C)
  5. every own key of the map is a REKEY key in `kinds`
     CAVEAT: clause 5 is currently UNREACHABLE by fixture (G6_REKEY_ANCHORS :2091-2100 pins
     monster_pub as REKEY, so [G6/anchors] fires first). Keep the assertion, claim NO tooth for it.
  (C passing strictly, and K's rekey half, are enforced transitively by the main loop.)

Non-vacuity counter: count halves that PASSED, incremented AFTER the assertion; assert
`verified === 2 * rekeyCount` and `rekeyCount >= G6_REKEY_ANCHORS.length`.

## B. Identifier-boundary fix
At :2558 and :2566 replace `bodies.X.indexOf(policy.X) === -1` with `!containsCallOf(bodies.X, policy.X)`:
  function containsCallOf(hay, needle) {
    for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + 1)) {
      if (!isWordChar(hay[at - 1])) return true;
    }
    return false;
  }
`isWordChar(undefined)` is false by design, so index 0 still matches. Qualified call sites keep
satisfying unqualified needles (`:` before the needle is not a word char) — no shipped regression.
`et_exists(` inside `wallet_exists(` -> preceding `l` -> skipped -> false. That is the kill.
File-local: rust-scan.mjs is out of touches.

## C. Proof-of-teeth (grep FG7 for the next free ordinal; FG74h is highest shipped)
Prereq: hand-written `GOOD_HELPERS` Rust literal (8 helper bodies, faithfully asymmetric —
`has_monsters` touches ONLY `.monster(`; `rekey_monsters` touches `.monster(` AND `.monster_pub(`),
spliced into `GOOD_TREE[0].src` at :3041. Hand-written, NOT derived from the manifest. Emit ONE
definition per fn name (two keys share `has_monsters(`, two share `has_quest_or_dialogue_state(`)
or the "declared N times" clause reds the control.

 a CONTROL   shipped manifest + GOOD_TREE(with helpers) -> null
 b ATTACK-1  heal_cooldown.exists='has_monsters(' + delegation deleted from GOOD_ACCOUNTS
             -> [G6/correspondence], names key + has_monsters + `.heal_cooldown(`; assert tag is
                NOT [G6/consumed]
 c ATTACK-2  player_wallet.exists='et_exists(' -> [G6/consumed] + fragment `et_exists(` (PIN THE TAG)
 d           rekey:'ekey_wallet(' -> [G6/consumed] + `ekey_wallet(` (anti-monoculture)
 e           fixture has_monsters touching only `.monster_pub(`, key monster.owner_identity
             -> [G6/correspondence] naming `.monster(` (kills trailing-paren-drop mutant)
 f           helper defs removed / needle `never_wired_helper(` -> "no `fn ...` is declared anywhere"
 g           decoy `fn has_monsters` BEFORE the real one, body touching `.heal_cooldown(`
             -> "declared 2 time(s)"
 h           `fn has_items(...) -> bool { }` -> "EMPTY body"
 i           accessor token only inside a `//` comment and a string literal -> [G6/correspondence]
 j           fixture rekey_monsters with `.monster_pub(` removed -> [G6/correspondence] for
             monster_pub.owner_identity (mirror covers the EXISTS half only)
 k           fixture has_monsters extended with `.monster_pub(` -> [G6/mirror] stale-allowance
 l           monster.owner_identity.exists repointed -> [G6/mirror] "does not share the ... predicate"
 m           fixture has_monsters drops `.monster(` -> [G6/correspondence] for monster.owner_identity
             (NOT monster_pub) — the cover is not a blanket exemption of the needle
 n           real Object.prototype['inventory.owner_identity'] write (pre-existence refusal,
             try/finally, non-tautological post-assert) + has_items missing `.inventory(`
             -> still [G6/correspondence]
 q           helper body with `check_monster(x)` but no `.monster(` -> [G6/correspondence]
             (kills the drop-the-leading-dot mutant)

Mutation bite-proofs (orchestrator runs; tester has no Bash):
 M1 delete correspondence clause -> b reds
 M2 containsCallOf -> indexOf      -> c reds
 M3 accessor token loses `.`       -> q reds
 M4 accessor token loses `(`       -> e reds
 M5 mirror map applied to rekey    -> j reds
 M6 defs.length>1 check deleted    -> g reds
 M7 Object.hasOwn/Map -> bare read -> n reds
Commit the gate FIRST; revert only the mutated path.
Bump '(100 teeth verified)' (:6531) deliberately.

## C2. Ledger gates
Main guard is real. Extend the success `detail` (:6516-6532, pass path only) with distinct fragments.
 SHALL-1 CHECK node evals/guest-claim-integrity.eval.mjs EXPECT `each REKEY helper proven to touch its own table`
 SHALL-2 same EXPECT `matched as an identifier-bounded call`
 SHALL-3 same EXPECT `1 mirror-covered exception (policed)`
 SHALL-4 same EXPECT `(NNN teeth verified)` (true new count)
 SHALL-5 CHECK cargo test m22_rekey EXPECT `test result: ok` (T9 text twin still parses this file)
 Regression: full `just ci`.

## D. Anti-patterns / defer boundary
DO NOT: swap indexOf->containsIdent on a paren-suffixed needle; skip when the helper is not found;
follow callees; put the exception into REKEY_MANIFEST/POLICY_SHAPES; export the exception map or read
it with `in`/bare property access; reuse one tag; pin a tooth by exit code alone; write `Owner`/`Id`/
`Coins`/`Handoff`/... in new prose above runTeeth; derive GOOD_HELPERS from the manifest.
Increments: S1 containsCallOf + c,d | S2 strippedTree + GOOD_HELPERS + correspondence + a,b,e,f,g,h,i,q
| S3 mirror + j,k,l,m,n. If too big, DEFER S3 to a 2-clause map; never defer S2's fail-loud legs.

## E. Hidden dependencies — NONE required, on three conditions
1. REKEY_MANIFEST entry SHAPE and TEXT must not change (accounts_tests.rs:3148 include_str!s this
   file; m22_rekey_manifest_keys :3408-3439 blanks `//` comments incl. inside strings, takes the
   FIRST `REKEY_MANIFEST = freezeManifest({` anchor, brace-walks, 20-key floor). A POLICY_SHAPES
   field change is a STOP.
2. No new export (rekey-contract-surface proves import purity in a child process).
3. `containsCallOf` stays file-local.
Forced in-scope doc companions: the clause inventory at eval:207-209, ARCHITECTURE.md:105/117,
docs/adr/0222-*.md. docs/adr/0208-g6-* describes this fn and is OUT of touches — cross-reference only.

Risks: (1) GOOD-fixture blast radius ~40 checkRekeyCompleteness( call sites — inventory + classify
expects-PASS vs expects-tag first; (2) FG73o self-red from new prose; (3) [G6/parse] reacting to fn
text inside fixture/schema.rs; (4) PostToolUse hook runs UNPINNED npx biome vs pinned `just lint`.

================================================================================
# RESOLVED DESIGN (after reviewer + red-team on the plan) — THIS SUPERSEDES §A-§C
================================================================================

NOTE ON THE REVIEW ROUND: the `reviewer` lens read the worktree WHILE `red-team` had a throwaway
implementation of the plan checked out in it (torn read — [[review-lens-torn-reads-on-live-worktree]]).
Its "landed code" line cites describe RED-TEAM'S SCRATCH IMPL, not master. Its *design* findings
(unreachable clauses, tautological counters, Map-literal, accessor soundness, Q2/Q5/Q6) stand and are
folded in below. Worktree verified clean (`git status --porcelain` empty) before implementation.

## Measured bypasses of the ORIGINAL plan (red-team, all run + clippy-clean)
S1 `.{table}(` is satisfied by ANY same-named method on ANY receiver (`RateProbe.heal_cooldown()`)
   and by code behind `#[cfg(any())]` that never compiles. The X10 criterion cheat was RESTORED green.
S2 The mirror map is an UNBOUNDED amnesty: the manifest has TWO REKEY pairs sharing an exists needle
   (monster/monster_pub AND player_quest/player_dialogue_state). Adding a second map row while
   hollowing `has_quest_or_dialogue_state` passed all 5 policing clauses; clause 3 is the ATTACKER'S
   PRECONDITION, not a safeguard. The detail still printed "1 mirror-covered exception".
S3 The rekey half checks PRESENCE, not EFFECT: replacing `rekey_npc_state`'s dialogue-state
   delete+insert with a bare `find(...)` read stayed green; so did dropping the `monster_pub` update
   from `rekey_monsters`.
S4 The exists half is hollowable in Rust (`wallet_exists` -> `{ let _ = ...find(owner); false }`) and
   is NOT textually closable by this eval. Nothing else in the repo enumerates the
   `account_has_game_data` disjuncts.
S5 Deleting the WHOLE new clause block left the eval exit-0 with all four literal SHALL fragments
   still printed. The `verified === 2*rekeyCount` counter is arithmetic that cannot fail.
S6 The tooth ORACLE was the fixture, and the fixture is in the file the attacker edits: one added
   line in GOOD_HELPERS re-greened the borrow cheat.
S7 Splicing GOOD_HELPERS at `GOOD_TREE[0].src` alone REDS FG73i — siblings call `synthSchemaSrc()`
   directly. The splice must be inside `synthSchemaSrc`'s return.
S8 `pub(crate) fn\nhas_items(` -> "not declared anywhere" (marker is the literal `fn `+name).
S9 The needle's module path is discarded, so `crate::inventory::wallet_exists(` passes.
S10 `containsCallOf` accepts `probe(ctx).wallet_exists(` — `.` is not a word char.

## FINAL DESIGN

### D1 `containsCallOf(hay, needle)` — file-local, replaces indexOf at [G6/consumed]
Left boundary only (the needle's own trailing `(` is the right boundary; `containsIdent` CANNOT be
used — it tests the char AFTER the needle, which is `c` of `ctx`, so it is permanently false).
ALSO reject an immediately-left `.` (closes S10): a method call is not a free-function call. Shipped
call sites are all `crate::mod::fn(` (left char `:`) so no regression.

### D2 `[G6/correspondence]` — after [G6/consumed], before `return null`
Per REKEY entry, per half:
  table  = key.slice(0, key.indexOf('.'))            fail-closed on no dot / empty side
  fnName = needle.slice(0,-1).split('::').pop()      fail-closed on ''
  defs   = whitespace-tolerant `fn` + ws + <fnName> with isWordChar boundaries, over strippedTree,
           storing the FILE OBJECT (not the path string — reviewer m1)
  defs.length === 0 -> RED "no `fn X` is declared anywhere in the N scanned source(s)"
  defs.length  > 1  -> RED "declared N time(s)" (first-hit-anchor forgery close)
  findFnBody null   -> RED distinct: declared but the body could not be located; `fn <name>` must be
                       spelled on ONE line (closes the S8 confusion with an ACTIONABLE message)
  compactWs(body)===''-> RED distinct "EMPTY body"
  body contains `#[cfg(`  -> RED distinct (closes S1/B2: a token behind `#[cfg(any())]` never compiles)
  TOKEN (closes S1/B1): `db.{table}(` with a LEFT IDENTIFIER BOUNDARY on `db` — NOT `.{table}(`
    (any same-named method on any receiver) and NOT `ctx.db.{table}(` (the `let db=&ctx.db` alias
    bypass, [[write-target-accessors-alias-bypass]]). Measured: 15/15 live pairs pass, the alias form
    passes, the `RateProbe.heal_cooldown()` decoy fails, and a tree-wide scan finds 0 non-db-rooted
    `.{table}(` tokens for all 8 REKEY tables today.
  REKEY HALF ONLY — WRITE-VERB RULE (closes S3): at least ONE `db.{table}(` occurrence must have a
    write verb (`.update(` / `.insert(` / `.delete(`) in the chain segment running from that token to
    the next `db.` (or end of body). Measured 8/8 live rekey pairs pass; both S3 hollowings fail.
  EXISTS HALF: token presence only (a predicate legitimately only reads). Its honest limit (S4) goes
    in ADR-0222 and is DEFERRED to the backlog.

### D3 `[G6/mirror]` — one pinned exception, not an amnesty (closes S2)
`const EXISTS_COVER = new Map([['monster_pub.owner_identity','monster.owner_identity']])` — a Map
LITERAL (no prototype-chain read hazard at all; strictly safer than the object + Object.keys dance,
and it deletes the second spelling of one fact — reviewer m3).
Clauses, all `[G6/mirror]`:
  P1 EXACT SET PIN: size === 1 AND the single pair is exactly that key/value. A membership or shape
     check is NOT a set pin ([[relaxing-an-exact-pin-needs-a-prefix-diff]]). This SUBSUMES the
     original clauses 1/4/5, which the reviewer proved unreachable or tautological — they are DELETED.
  P2 SAME-NEEDLE: kinds.get(cover).exists === kinds.get(key).exists.
  P3 STALENESS: the excused key must ACTUALLY still fail the strict exists check; if it passes, the
     excuse is dead and must be deleted.
  COMMENT (reviewer M4): the cover is itself strict-checked by the same loop regardless of map order,
     which is why excusing a HARD failure kind here is safe. Write that invariant down; it is the
     entire safety argument for the exception.
DELETED: the `verified === 2*rekeyCount` and `rekeyCount >= G6_REKEY_ANCHORS.length` counters —
both are theorems, not assertions (reviewer m2, red-team S5).

### D4 LIVE-TREE BORROW PROOFS (closes S5 + S6 — the biggest change)
The teeth suite runs on FIXTURES, so the fixture is the oracle and lives in the file the attacker
edits. So: after the live `checkRekeyCompleteness` passes in the default export, run N borrowed-manifest
probes AGAINST THE LIVE TREE and require each to RED with its expected tag:
  L1 heal_cooldown.exists -> 'has_monsters('        must RED [G6/correspondence]  (the X10 attack)
  L2 inventory.rekey     -> 'rekey_monsters('       must RED [G6/correspondence]
  L3 player_wallet.exists-> 'et_exists('            must RED [G6/consumed]        (the substring cheat)
  L4 monster_pub.exists  -> a needle != monster's   must RED [G6/mirror] or [G6/consumed] -> pin exact
  L5 CONTROL: the shipped manifest returns null (already proven above; re-asserted for symmetry).
A probe that does NOT red is a failure. Deleting the correspondence block now REDS the gate.
The success detail reports the DERIVED counts (`${proofs} live-tree borrow proof(s) bit`,
`${EXISTS_COVER.size} mirror-covered exception(s) pinned`) — never a literal (closes S5's forgeable prose).

### D5 Fixture
`GOOD_HELPERS` appended inside `synthSchemaSrc`'s return (S7 — FG73i calls it directly), with the
docstring corrected to say it emits the table structs AND the shared helper library the correspondence
clause resolves (reviewer B1: an inaccurate fixture-builder docstring is a lie). Hand-written, ONE
definition per fn name, faithfully asymmetric (`has_monsters` touches only `db.monster(`).
Must avoid every FG73o banned identifier (`Owner`, `Id`, `Coins`, `Handoff`, ...) — it sits above
`function runTeeth() {`.
AUTHORING CONSTRAINT to document: a future fixture that both concatenates `GOOD_TREE[0].src` into a
file AND includes `GOOD_TREE[0]` in the same tree array reds with "declared 2 time(s)".

### D6 Other folded fixes
- Hoist `strippedTree` once above the [G6/parse] loop and share (reviewer M5).
- Reconcile the T9 line cites before writing the ADR (reviewer m4).
- ADR-0222 must state: the accessor≡table-half identity is STRUCTURAL (parseTableSchemas keys on the
  accessor, [G6/live] forces resolution), not an observed coincidence; the `config`/`account`/`player`
  generic-accessor trip-wire if any of them is ever promoted to REKEY; that `rekey_wallet` performs
  its destination write inside `grant_currency`, so a refactor moving the source zeroing into a
  callee would red correct code, with no escape hatch on the rekey half; that `compactWs` DELETES
  whitespace so the token is matched on deleted-whitespace text; and the S4 exists-hollowing limit.

### DEFER (backlog): the `account_has_game_data` disjunct twin in `server-module/src/accounts_tests.rs`
S4 is not textually closable by this eval and accounts_tests.rs is OUTSIDE `touches:` — rb-2 named
this exact file as part (a) of the closure. DEFER to backlog with a resolvable target.
