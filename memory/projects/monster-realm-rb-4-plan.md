# rb-4 — plan (planner output 2026-08-28; orchestrator adjudications appended below)

Slice: rb-4 (residual R-m22-s0-X3). Repo: project. Worktree `.claude/worktrees/rb-4`, branch `slice/rb-4`, fork `e112ce6`.
Touches: `evals/guest-claim-integrity.eval.mjs`, `evals/rekey-contract-surface.eval.mjs`, `ARCHITECTURE.md`, `docs/adr/0208-*.md`, `server-module/src/accounts_tests.rs`. ADR number 0208 IS assigned.

## 0. Triage (orchestrator, MEASURED on a mkdtemp copy of HEAD e112ce6 before planning)
- `findIdentityColumns` (:1795-1811) classifies with `containsIdent(compactWs(columns[field]), 'Identity')` (:1804-1805).
  The walker does NOT see `guild_member.delegate` for ANY of: `pub type OwnerId = Identity;` + `pub delegate: OwnerId`;
  transitive (`type Owner = Identity; type OwnerId = Owner;`); `Option<OwnerId>`; `type MaybeOwner = Option<Identity>;`;
  `pub(crate) type` / private `type`; `pub type OwnerId = spacetimedb::Identity;`; `use spacetimedb::Identity as Who;`.
  The literal-`Identity` control IS seen. So `[G6/declared]`/`[G6/live]`/`[G6/anchors]` are all blind to an aliased column.
- Live tree: 24 Identity columns (8 REKEY); NO alias of Identity exists today (only `content.rs:454 pub(crate) type NpcSyncPlan = Vec<NpcSyncAction>;`
  and `content_cache.rs:128 pub(crate) type TypeChartCell = Mutex<…>`), zero `use … as` renames. The fix is a no-op on the live tree.
- Blast radius (union of both graphs + grep): in-file `checkRekeyCompleteness:1868`, `runTeeth` (FG72c self-asserts :4009-4013);
  dynamic: `evals/rekey-contract-surface.eval.mjs:404` (T2 pins Map / `{path,type}` / `type` mentions Identity / exact size);
  `accounts_tests.rs:3107` include_str! T9 text scan of the manifest block ONLY (anchor `REKEY_MANIFEST = freezeManifest({` exactly once, RAW).
- Parser chain (outside touches, read-only): parseTableSchemas → parseTableFields → matchTableBlocks read ONLY table blocks; alias
  collection is new walker work, not a parser change.
- Anchor note: `if (!containsIdent(type, 'Identity')) continue;` IS unique (:1805); `:505` is `containsIdent(t, 'Identity')`. Never anchor on `containsIdent(` (3 sites).

## 1. Design (planner recommendations)
- D1 forms: `type X = RHS;` at any visibility, transitively, by IDENTIFIER substitution (so `Option<Identity>`, `spacetimedb::Identity`,
  `Option<Alias>`, alias-of-Option fall out). `use … as` renames IN scope (same evasion class). Generic aliases: substitute the LHS name,
  ignore params (fail-closed over-report). Associated types collected without special-casing — only names REFERENCED by a column type
  are looked up. Newtype/product wrappers (`struct Owner(pub Identity)` SpacetimeType column) are NOT aliases → DEFER X10 → backlog
  (needs a SpacetimeType struct walk in battle-schema-snapshot, outside touches).
- D2 scope: per-file precedence, then tree-wide bare-name superset over `treeSrcs` (already the whole non-test tree; the INPUT-SET RULE
  is about the glob, untouched). Ambiguity (same name, different RHS, reachable from a column, not bound in the declaring file) fails
  CLOSED by over-reporting, naming the alias and every declaring path. Rejected: error channel / throw (breaks T2's `instanceof Map`),
  a `[G6/alias]` clause (second home for alias knowledge).
- D3 record: `{path, type, resolved, via}` additive. `type` = DECLARED text (unchanged meaning); `resolved` always present, `=== type`
  when unaliased; `via` = '' or the substituted chain. Closed field set pinned (FG73j). Seam eval: `[T2/type]` keeps non-blank on `type`,
  moves "mentions Identity" onto `resolved`; new `[T2/alias]` pins `resolved === type` for the 3 unaliased fixture columns and
  `resolved !== type && type lacks Identity && resolved has Identity` for a new aliased column in FIXTURE_C_SRC (EXPECT_SIZE derived).
- D4 termination: bounded fixpoint (aliasCount+1 passes, length cap 4096); on the bound → treat as Identity-bearing, `via` marks it.
- D5 `replaceIdent` lives in guest-claim-integrity.eval.mjs on the imported `isWordChar` (rust-scan.mjs is outside touches; flag promotion).
- Resolver: per file ONCE `stripped = stripRustSource(f.src)`; collectAliases on STRIPPED-not-compacted text (literal regex for
  `type Name<…>? = RHS;` + a ` as ` scan inside each `use …;` item); alias tables are `Map`s (constructor/__proto__ are legal Rust idents);
  resolve(typeText): bounded loop substituting referenced+bound names, own-file first, then tree; classify on
  `containsIdent(resolved,'Identity') || bounded || ambiguousIdentity`.

## 2. Teeth FG73a-k (after FG72f), teeth literal 72 → 83
a direct alias RED-before → [G6/declared] names column+alias (kills M1, M11) · b transitive chain RED-before (M2) · c `Option<OwnerId>` and
`type MaybeOwner = Option<Identity>` RED-before (M10) · d `use spacetimedb::{Identity as Who,…}` + plain `use … as Owner` RED-before (M3) ·
e cross-file alias (A declares, B uses) RED-before (M4) · f GOOD control: live NpcSyncPlan shape + `type Coins = u64` + `type IdentityTag = u32`,
exact key set (M5) · g ambiguous cross-file `OwnerId` (=Identity / =u64) → [G6/declared] naming both paths; own-file `=u64` shadowing
tree `=Identity` → PASS (M6) · h cyclic `type A = B; type B = A;` → [G6/declared] non-termination (M7) · i `player_wallet.owner_identity`
declared THROUGH an alias, default manifest → RED-before ([G6/live]+[G6/anchors]) → PASS after (join direction) · j direct walker call:
record own-field set exactly {path,resolved,type,via}; resolved===type unaliased, !== aliased (M8) · k alias inside a raw string literal,
name otherwise unbound → NOT reported (M9). Every fixture self-asserts (alias present; no literal `delegate: Identity` in compacted source);
every failure NAMES column + alias.

## 3. Mutants (rb-4.mutation-probe.mjs, mkdtemp, per-mutant TOOTH pin)
M0 GREEN · M1 classify on declared text @FG73a · M2 one pass @FG73b · M3 use-as collector deleted @FG73d · M4 tree superset dropped @FG73e ·
M5 replaceIdent → split/join @FG73f · M6 ambiguity → continue @FG73g · M7 bound → not-Identity @FG73h · M8 `resolved: type` @FG73j ·
M9 collect over raw `f.src` @FG73k · M10 whole-text equality resolver @FG73c · M11 message drops alias @FG73a · M12 DATA: seam fixture alias
RHS Identity→u64 ⇒ rekey-contract-surface RED at [T2/alias]. count==1 anchors; ANCHOR-MISS/NO-OP/BROKEN-MUTANT are never bites.

## 4. Gates
X1 ALIAS-TEETH-GREEN (PASS + `(83 teeth verified)` + 24/8) · X2 BITES · X3 NOT-WEAKENED (ratchet vs e112ce6 + a seam-file section) ·
X4 CONSUMERS-GREEN (seam 3 teeth + cargo T9) · X5 SUITE-GREEN · X6 IN-SCOPE · X7 LINT-CLEAN (both .mjs) · X8 MANUAL docs ·
X9 ADR-0208 MET (file + APPENDED digest row + digest check) · X10 NEWTYPE-DEFERRED → backlog.

## 5. ADR-0208 / Boy Scout / anti-patterns / risks
ADR-0208 = the G6 gate hardening: discriminator (rb-2) + own-property boundary (rb-3) + alias resolution (rb-4); closes R-rb-2-X9, R-rb-3-X9.
Core (not boyscout): KNOWN LIMITATION paragraph :1455-1461 → THE ALIAS RESOLUTION RULE; header inventory :187-192; seam T2 header; ARCHITECTURE.md.
Boyscout candidate: accounts_tests.rs:523-529 doc pointer (≤4 lines) — second cut.
Anti-patterns: regex over RAW source; `new RegExp(`; concatenated blob; alias-name allowlist; substring Identity; mutating shared tables;
plain-object alias tables; unbounded fixpoint; fail-open on bound/ambiguity; walker throw; `type = resolved`; one-bad-entry teeth;
comments quoting probe anchors; bracketed sibling tags in messages; second `REKEY_MANIFEST = freezeManifest({`; editing rust-scan.mjs.
Risks: `via === ''` rendering keeps FG48 untouched; unpinned format hook; FG73k raw string must keep assertStripperSound green;
alias decls outside struct bodies ([G6/parse]); seam T2 note prose; `mut(` first-occurrence; never `git checkout -- evals/` mid-loop;
gitleaks/Semgrep remote-only — run semgrep locally.

## 6. Sequencing
verify anchors → tester stages FG73a-k + probes to /tmp → orchestrator applies + RED proof on the unmodified walker (per-fixture first
failure label) → implement → seam edits → X4 → docs/ADR/digest → biome (X7) → X2/X3 → X5/X6 → lenses in parallel → verifier → doc-keeper.
Workflow: solo implementer (orchestrator) + separate tester + three parallel plan lenses (reviewer / red-team write-the-cheat / simplify).

---
## ORCHESTRATOR ADJUDICATION (reviewer: 2 BLOCKER/10 MAJOR/9 minor; red-team: 7 HIGH/7 MEDIUM/4 LOW, all MEASURED; /simplify) — FROZEN DESIGN

### Decisions (simplify-first)
- **DROP `replaceIdent` and the pass bound / length cap.** The resolver is TOKEN-driven: the field type text is split into identifier
  tokens (`/(?:r#)?[\p{XID_Start}_][\p{XID_Continue}]*/gu`, a literal built per call — reviewer A8 lastIndex), each bound token is
  expanded recursively, and termination is STRUCTURAL: a name already on the current expansion path is terminal (reviewer A2 —
  `pub(crate) type Timestamp = spacetimedb::Timestamp;` resolves to a fixed point and PASSES; `type A = B; type B = A;` does not
  compile and merely terminates). No `replaceIdent` means red-team's "M5 is a NO-OP" is moot: the substring class is killed by the
  tokenizer, and FG73f carries the fabrication pair (reviewer B2: `type Id = Identity; type IdKind = u8; pub kind: IdKind`).
- **DROP per-file precedence (red-team #1, HIGH, measured hide).** The alias table is ONE `Map<name, Array<{name, rhs, path}>>` —
  the union of every `type NAME … = RHS;` item and every `use … X as NAME` rename across `treeSrcs`, duplicates KEPT (a same-file
  `impl … { type OwnerId = u64; }` no longer overwrites the module-level `= Identity`). Resolution expands EVERY binding of a
  name; if ANY expansion is Identity-bearing the column is reported with that expansion as `resolved` (fail-closed), and the
  message names every binding. FG73g's second leg is INVERTED from the plan: own-file `= u64` + tree `= Identity` must REPORT.
  Associated types are collected like any other `type` item; only names REFERENCED by a column type are looked up, so a live
  `impl Iterator { type Item = … }` cannot false-RED unless a column is literally typed `Item` (none is; documented).
- **Collector reads `r#` raw identifiers and non-ASCII names** (red-team #3/#4: both CI-clean hides): name class
  `(?:r#)?[\p{XID_Start}_][\p{XID_Continue}]*` with the `u` flag on both the alias item and the tokenizer; `r#` stripped before lookup.
  Alias item pattern spans NEWLINES (reviewer A1 — rustfmt-wrapped `pub type OwnerId =\n    Identity;`), generics/where swallowed by
  `[^=;]*`; RHS `[^;]*` (a `[u8; 32]` RHS truncates to `[u8` — harmless, arrays are not legal columns; noted). `use` items are the
  span `\buse\b … ;` (multi-line brace groups included); every `TOKEN as NAME` pair inside becomes `{name: NAME, rhs: lastSegment(TOKEN)}`,
  `as _` skipped.
- **`[G6/alias]` — one fail-closed DETECTOR, not a resolver home** (red-team #5): a stripped source containing both `macro_rules!`
  and the byte string `type $` declares an alias the resolver cannot read → the clause fires naming the file. Live tree: zero hits.
- **Record `{path, type, resolved, via}`** — `type` = declared text (unchanged meaning), `resolved` = expansion, `via` = the ARRAY of
  binding records consulted (`[]` when direct) — structured data, never prose (reviewer A3). Closed field set pinned (FG73j) and every
  read of the record is `Object.hasOwn` (red-team #11). Named YAGNI exception: `via` exists for the `[G6/declared]` message only —
  fail-closed over-report is actionable ONLY if the message names the binding(s) and their file(s).
- **Seam eval**: `EXPECT_COLUMNS` entries gain `aliased: boolean` (reviewer A10); `[T2/type]` keeps non-blank on `type` and asserts
  `Object.hasOwn(rec,'resolved')` + `resolved` mentions Identity; `[T2/alias]` pins `resolved === type` when `!aliased`, and
  `resolved !== type && type lacks Identity` when `aliased`; FIXTURE_C gains `pub type LedgerRef = Identity;` + `pub delegate: LedgerRef`;
  the T2 note gains `alias-resolved` so X4 can observe the seam edit (reviewer A4). EXPECT_SIZE stays derived (4).
- **FG73o self-source absence** (red-team #2, VERIFIED-SURVIVES otherwise): the file text BEFORE `function runTeeth() {` must contain
  NONE of the fixture alias names as identifiers (`containsIdent`); the rb-4 banner/prose therefore never uses them.
- **FG73l non-enumerable pollution** (red-team #7): `Object.defineProperty(Object.prototype, name, {value, configurable: true})`
  (enumerable false — FG72c's precondition cannot see it) around a cross-file aliased walk: a bound name shadowed with `'u64'` must
  still report; an UNBOUND name valued `'Identity'` must NOT report. Cleanup in `finally`, post-assert `!(name in {})`.
- **ADR-0208 = the G6 gate hardening (rb-2 discriminator + rb-3 own-property boundary + rb-4 alias resolution)**, `Amends: —`
  (it documents the gate over ADR-0179 D6, not D6 itself — so no reciprocal `Amended-by` edit on 0179; reviewer A5), and it MUST
  record: why G6 RESOLVES where ADR-0195 D6 ALLOWLISTS (reviewer A7 — the column-type domain is open: `game_core::TradeStatus`,
  `Vec<EncounterEntryRow>`, `ScheduleAt`; an allowlist is red-on-arrival for every new column type); the accepted limits (below).
- **Boy Scout** = `server-module/src/accounts_tests.rs:3930-3936` (reviewer A9): the T9 doc's rationale "object-valued JS entries
  are red-on-arrival … infers REKEY from `typeof policy === 'string'`" has been FALSE since rb-2 — 2-3 lines, one hunk, no `/*`, no `"`.
  The `:523-529` pointer is NOT taken (cap; the doctrine contrast lives in the ADR).
- **DEFERRED to the ledger (RF-3), each with the measured repro:** X10 product-type columns carrying Identity — LIVE-REACHABLE today
  via `encounter.entries: Vec<EncounterEntryRow>` (schema.rs:183/:198; red-team #6 compile-verified: named-field struct, enum payload,
  generic wrapper, `Vec<T>`; the plan's `struct Owner(pub Identity)` tuple form does NOT compile under 2.8.1's derive); X11 field-level
  parse non-vacuity (red-team #12: `owner_backup: Identity,` without `pub` compiles — macro maps `Inherited` → `pub(super)` — and is
  invisible to G6; two fields on one line corrupt a policed column's recorded type; `#[rustfmt::skip]` + wrapped colon); X12 aliases
  declared OUTSIDE the scanned input set (reviewer B1: `game-core` has an OPTIONAL `spacetimedb` dep, so `pub type Owner =
  spacetimedb::Identity;` there + `use game_core::Owner;` is invisible; closure = widen the INPUT-SET RULE, which S0 forbids in-seam).
- **CUT**: generic-alias tooth (red-team #15: cannot reach Identity except via product types); tuple/array columns (illegal, #16);
  a `[G6/alias]` conflict clause (union + fail-closed makes it unnecessary); editing `rust-scan.mjs`; `replaceIdent` promotion flag.

### IMPLEMENTER CONTRACT (byte-string anchors, each EXACTLY once in the eval after the change; prose never quotes them)
`function collectAliasBindings(stripped, path) {` · `function indexAliasBindings(treeStripped) {` · `function resolveType(text, table) {` ·
`function expandTokens(text, table, onPath, via) {` · the recursive call line `const inner = expandTokens(b.rhs, table, onPath.concat(name), via);` ·
the fail-closed pick `const chosen = expansions.find((e) => containsIdent(e.resolved, 'Identity')) ?? expansions[0];` ·
first pass `treeStripped.push({ path: f.path, stripped: stripRustSource(f.src) });` · `const table = indexAliasBindings(treeStripped);` ·
classify `if (!containsIdent(resolved, 'Identity')) continue;` · record `cols.set(\`${table}.${field}\`, { path: f.path, type, resolved, via });`
(NB the walker's loop variable `table` for the TABLE NAME collides with the alias table — the implementer renames the alias table
binding to `aliases`: `const aliases = indexAliasBindings(treeStripped);` and `resolveType(type, aliases)`) · use-as scan
`for (const item of useItems(stripped)) {` · macro detector `if (stripped.indexOf('macro_rules!') !== -1 && stripped.indexOf('type $') !== -1) {` ·
message `${aliasNote(decl)}` inside the `[G6/declared]` template, where `aliasNote` returns '' for a direct column and otherwise
`, which resolves to \`<resolved>\` via \`type <name> = <rhs>\` in <path>` joined with ` and `, plus ` — \`<name>\` is bound N ways in
the tree; reported fail-closed, rename one` per ambiguous name. Never the bytes `REKEY_MANIFEST = freezeManifest({`; never a bracketed
sibling `[G6/…]` inside a message; regex literals built per call.

### Teeth FG73a-o (tester; teeth literal 72 → 87). RED-before unless marked
a direct alias (+ a rustfmt-wrapped `pub type X =\n    Identity;` leg) → [G6/declared] names column, `via`, decl path · b transitive ·
c `Option<Alias>` + alias-of-`Option<Identity>` · d `use spacetimedb::{\n    Identity as Who,\n    Table,\n};` + plain `use … as` +
`pub use crate::ids::OwnerId as Delegate;` chain · e cross-file, declaring file has NO `#[spacetimedb::table(` · f GOOD control: COLUMNS
typed `Coins`(=u64), `IdentityTag`(=u32), a `NpcSyncPlan`-shaped `Vec<…>` alias, and `IdKind`(=u8) beside `Id`(=Identity) unused by any
column; exact key set (PASS before+after) · g ambiguity: cross-file `OwnerId` (=Identity / =u64) → reported, message names both paths;
same-file `impl … { type OwnerId = u64; }` beside module `= Identity` → reported (RED-before) · h termination GOOD control:
`pub(crate) type Timestamp = spacetimedb::Timestamp;` column NOT reported; `type A = B; type B = A;` returns (PASS before+after) ·
i join: `player_wallet.owner_identity` declared through an alias, default manifest → PASS after ([G6/live] before) · j record shape:
own keys exactly path,resolved,type,via; hasOwn reads; direct → `via.length === 0 && resolved === type`; aliased → `via.length > 0` ·
k raw-string alias NOT collected (payload free of `pub struct` / `#[spacetimedb::` — STRIP_ANCHORS) (PASS before+after) · l non-enumerable
Object.prototype pollution, both directions (regression pin) · m `pub type r#Owner = Identity;` and `pub type Ownér = Identity;` → reported ·
n `macro_rules! … type $n = Identity;` → [G6/alias] · o self-source absence of every fixture alias name before `function runTeeth() {`.

### Mutants (rb-4.mutation-probe.mjs; TOOTH pin load-bearing; sibling-catch triples per red-team #8)
M0 GREEN · M1 classify on `type` @FG73a (siblings b,c,d,e,i,j catch it too — the label is the only signal) · M2 recursive call → `{resolved: b.rhs, via: []}` @FG73b ·
M3 use-as loop body emptied @FG73d · M4 union → per-file table @FG73e (sibling g) · M5 `resolveType` replaced by a substring
`split(name).join(rhs)` resolver @FG73f · M6 `chosen = expansions[0]` @FG73g · M7 name class → `(\w+)` in the alias item @FG73m ·
M8 record `resolved: type` @FG73j · M9 first pass over raw `f.src` @FG73k · M10 `resolveType` → whole-text equality @FG73c ·
M11 `${aliasNote(decl)}` → '' @FG73a (via-text assert) · M12 seam DATA: FIXTURE_C alias RHS Identity→u64 ⇒ rekey-contract-surface RED
[T2/columns] · M13 walker `resolved: 'Identity'` constant ⇒ seam RED [T2/alias] (account.claimed_from) · M14 `[G6/alias]` detector
deleted @FG73n. ANCHOR-MISS / NO-OP / BROKEN-MUTANT never bite. Probes live beside the ledger (harness memory), run from the worktree.

### Gates
X1 ALIAS-TEETH-GREEN (PASS + `(87 teeth verified)` + `all 24 … (8 REKEY`) · X2 BITES · X3 NOT-WEAKENED (ratchet vs e112ce6, + seam
section) · X4 CONSUMERS-GREEN (seam PASS + `alias-resolved` + `(3 teeth verified)` + cargo T9) · X5 SUITE-GREEN · X6 IN-SCOPE (allowed:
the two evals, ARCHITECTURE.md, docs/adr/0208-*.md, docs/adr/DIGEST.md, server-module/src/accounts_tests.rs) · X7 LINT-CLEAN (pinned
biome, both .mjs) · X8 MANUAL docs · X9 ADR-0208 present + digest check green · X10/X11/X12 DEFER → backlog (3 of 12 = 25%).

---
## POST-IMPLEMENTATION ADJUDICATION (reviewer: 0 BLOCKER / 3 MAJOR / 12 minor; red-team round 2: 2 HIGH / 1 MEDIUM / 1 LOW, all MEASURED; reducer-security-auditor: 1 High / 3 Medium / 5 nits) — applied at 35c8925
- reviewer MAJOR 1 = auditor F3 (`type Identity = u64;` anywhere collapses the walk to 0 columns; [G6/live] blames the manifest): `Identity` is
  TERMINAL in expandTokens AND a binding NAMED `Identity` reds [G6/alias] by file. Tooth FG73p (walk unchanged + [G6/alias]); mutants M15/M17.
- red-team H1 = auditor F1 (`type OwnerId = $t;` inside a macro body / `type OwnerId = id_ty!();` — collected, expands to nothing, no `type $`):
  [G6/alias] fires on any collected binding whose RHS contains `$` or `!`. FG73n gains two legs; mutant M16.
- red-team H2 (U+0085 / U+200E / U+200F are Rust Pattern_White_Space that JS `\s` misses; `#[rustfmt::skip]` + NEL between `type` and the
  name compiles clean and binds nothing): `rustWs()` maps the three code points to spaces before the collector regexes. FG73m gains a leg; M18.
- red-team M1 = reviewer m8 = auditor N3 (k^d blow-up: three `mod` blocks re-declaring a 16-hop chain took 40 s): per-column memo
  `Map<name, chosen>` threaded through expandTokens (signature gained `memo`; anchors updated in the ledger + probes). Output WIDTH is still
  uncapped — recorded as an accepted limit (a doubling generic chain is not a legal column type).
- reviewer m2 = auditor N2 (aliasNote inserted before `, declared in`): rendered after the declaring path. m4: ambiguity counts DISTINCT
  right-hand sides. m5: dead `binding` field removed (`expansions` is now `string[]`). m12: RHS whitespace COLLAPSED not removed
  (`&'a Identity` no longer becomes one token); the `;`-truncation of an array RHS recorded as an accepted limit.
- reviewer MAJOR 2 (ADR D1 "reasons verbatim" false for the two battle entries): caveat added in the ADR and in ARCHITECTURE.md's rb-2 paragraph.
- reviewer MAJOR 3 (seam header still taught the pre-rb-2 `typeof` world): paragraph retired (boyscout-delta, comment-only). m1/N1: the two
  `[T2/*]` messages name the four-field record.
- reviewer m6/m7 (FG73o list vs `Timestamp`/`A`/`B`; prose false-RED on `Who`): tester round 2 renames `Timestamp`→`Stampish` (listed),
  `Who`→`WhoRef`; `Id` KEPT (the `Id`/`IdKind` prefix pair is load-bearing) with a comment. Docs say "fixture ALIAS name".
- reviewer m9 = auditor F1 wording: [G6/alias] documented as exactly three shapes (name-metavariable, RHS metavariable/invocation, `Identity`
  shadow); paste-style names + proc-macros recorded as limits. m10: the ADR's "every read is Object.hasOwn" scoped to the seam/record tooth.
  m11: ADR gained `## Confirmation`. auditor F2: X11 reworded — every spelling is backstopped TODAY by battle-schema-snapshot's
  `[parse-shape]` (measured), so the residual is the coupling. auditor N4: "live-reachable" reworded (mechanism live, no Identity carried yet).
- CUT with reason: reviewer m3 (render renames as `use … as`) — the via element key set is pinned `name,path,rhs` and FG73d pins the uniform
  rendering; documented instead. auditor F4 (export a consumer reader) — no consumer exists yet; recorded as an ADR follow-up. auditor N5
  (freeze walker records) — per-call structures, no cross-eval sharing; the seam freeze exists for the module-level singleton only.
  red-team L1 (ratchet slack on carried-forward floors) → tester round 2 tightens to measured counts.
