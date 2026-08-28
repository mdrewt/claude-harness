# rb-2 — plan (planner output, 2026-08-28; adjudications appended below by the orchestrator)

Slice: rb-2 (residual R-m22-s0-X1). Repo: project. Worktree `.claude/worktrees/rb-2`, branch `slice/rb-2`, fork `7e75cbd`.
Touches: `evals/guest-claim-integrity.eval.mjs` (+ ARCHITECTURE.md minimal line). No ADR number reserved (`None`).

## Verdict
(A) objects-only manifest with an explicit `policy` discriminator — ADOPT. (B) dual-form — REJECT. Constructor helpers — REJECT.

## 0. Blast radius (union of both graphs + grep)
CodeGraph and cbm both report every caller of `REKEY_MANIFEST` / `checkRekeyCompleteness` / `findIdentityColumns` / `freezeManifest` as IN-FILE. Both graphs are blind to the two real external consumers:
- `evals/rekey-contract-surface.eval.mjs:678` — lazy dynamic `await import('./guest-claim-integrity.eval.mjs')`; T1 (:288-383) reads the manifest SHAPE (exported, non-empty, 2-half keys, frozen, deep-frozen, >=1 structural entry, anchors, walker export); T2 (:404) walker; T3 import purity. Value shape deliberately NOT pinned (:41-50).
- `server-module/src/accounts_tests.rs:3107` `include_str!("../../evals/guest-claim-integrity.eval.mjs")` → `m22_rekey_manifest_keys` (:3366-3433) → T9 `data_lifecycle_cross_manifest_consistency` (:3946-3979). Text scan: naive `//`-to-EOL strip (INSIDE strings too; no `/* */` handling), verbatim anchor `REKEY_MANIFEST = freezeManifest({`, brace walk counting EVERY `{`/`}` byte (inside strings too), keys = single-quoted span immediately followed by `:` and shaped `word.word`. Asserts >= 20 keys + `account.identity`.
Prose-only references (unaffected): schema.rs:991, accounts.rs:293-294, game-core/src/accounts/deletion.rs:74, rust-scan.mjs:37,446, account-privacy.eval.mjs:49, battle-schema-snapshot.eval.mjs:32. `.claude/hooks/quiet/fixtures/evals-green.txt:37` is a static self-consistent fixture; nothing pins `59 teeth verified`. No knowledge regen (docs/knowledge does not cover evals).
No hidden dependency. Stale-prose follow-ups (OUTSIDE touches → handoff flags only): rekey-contract-surface.eval.mjs:41-50; accounts_tests.rs:3930-3936; ADR-0207 :18,:108,:112,:155-157; ADR-0179 :708-710.

## 1. Shape + classifier
Entries (objects only, bare field identifiers, three closed forms):
  { policy: 'REKEY', rekey: 'rekey_x(', exists: 'has_x(' }
  { policy: 'BLOCKED', reason: '<text minus the old BLOCKED: prefix, byte-for-byte>' }
  { policy: 'EXEMPT', reason: '<text minus the old EXEMPT: prefix>' }
`policy` compared by EXACT equality against frozen closed set POLICY_KINDS = ['REKEY','BLOCKED','EXEMPT']. Closed field sets: REKEY {policy,rekey,exists}; BLOCKED/EXEMPT {policy,reason}.
Classifier: module-private `classifyPolicy(key, entry)` → `{kind, rekey, exists, reason}` or `{error:'[G6/policy] ...'}`; `checkRekeyCompleteness` runs it ONCE over Object.keys(manifest) into a Map; every later clause reads the map. No `typeof` on the G6 path except freezeManifest:1390.
Clause order: stripper soundness → NEW [G6/policy] (pure manifest-shape pass, before tree work) → [G6/parse] → [G6/declared] → [G6/live] → [G6/anchors] (presence unchanged; EXEMPT pin reads kind; NEW G6_REKEY_ANCHORS = ['profile.identity','player_wallet.owner_identity'] pinned kind==='REKEY') → [G6/consumed] over kind==='REKEY' only.
Also update: header inventory :175-193, :206, manifest doc :1397-1399, @type :1431, :1709, rekeyEntries count :3119-3121 (must use classifyPolicy), '(59 teeth verified)' :3134.
Malformed shapes → [G6/policy] (name key + defect): (1) string entry; (2) null/array/function/number/boolean/undefined — tagged return, NEVER throw; (3) policy missing; (4) policy not exactly one of three; (5) REKEY w/o non-empty rekey OR exists; (6) BLOCKED/EXEMPT carrying rekey/exists (THE core defect); (7) BLOCKED/EXEMPT missing/empty reason; (8) any field outside the closed set; (9) reason beginning BLOCKED:/EXEMPT:/REKEY (case-insensitive).
Anti-patterns to name in the header: implicit typeof; `'rekey' in entry`; Boolean(entry.rekey); `entry.policy || 'BLOCKED'`; switch with silent default; startsWith('REKEY'); presence-only anchors; classifying in two places; shape validity depending on which clause reads it.

## 2. Consumers stay green with zero edits
rekey-contract-surface: every T1 clause shape-agnostic or strictly better (structural entries 8→24). T9 text-scan constraints on the manifest block: (1) anchor line verbatim, one line; (2) NO `{`/`}` inside any string; (3) field names BARE (`policy:`), real keys stay `'table.column':`; (4) quote walk is escape-blind: never `\'`; apostrophe-containing reasons must be double-quoted and the double-quoted reason's apostrophe count must stay EVEN (currently exactly 2); no `//` in any string; no block comments inside the block. X5 re-implements the extractor in JS and asserts EXACTLY 24 keys.

## 3. Proof-of-teeth
FG52 rewrite (:2851-2865): inject `{ policy:'REKEY', rekey:'rekey_monsters(', exists:'has_monsters(' }` for playtest_event.identity; tag unchanged [G6/anchors]; green under old and new classifier (shape migration).
| ID | injected (spread REKEY_MANIFEST) | expect | kills | RED before? |
| FG60 | 'player.identity': {policy:'BLOCKED', reason:'x', rekey:'rekey_monsters(', exists:'has_monsters('} | [G6/policy] | needle-presence inference (`'rekey' in entry`); open shape | RED (PASS today) |
| FG61 | 'battle.player_identity': {policy:'BLOCKED', reason:'terminal rows survive'} | PASS (null) | the residual's own repro as GOOD control | RED ([G6/consumed] via undefined) |
| FG62 | 'profile.identity': {policy:'REKEY'} | [G6/policy] | silently skipping needle-less REKEY; indexOf(undefined) coercion | RED (wrong tag) |
| FG63 | 'player.identity': 'BLOCKED: legacy string form' | [G6/policy] | dual-form; else-branch treating non-object as BLOCKED; 'BLOKED:' typo class | RED (PASS today) |
| FG64 | {policy:'Blocked', reason:'x'} AND {policy:'REKEYED', rekey:..., exists:...} | [G6/policy] x2 | case-insensitive; startsWith('REKEY'); silent default | RED |
| FG65 | {reason:'x'} AND {policy: undefined, reason:'x'} | [G6/policy] x2 | `policy ?? infer`; else-defaults-to-BLOCKED | RED (wrong tag) |
| FG66 | 'profile.identity' and 'player_wallet.owner_identity' each as {policy:'BLOCKED', reason:'nothing to carry'} | [G6/anchors] x2 | the REVERSE lie (demotion dodges consumed); presence-only anchors | RED (wrong tag) |
| FG67 | entry = null, [], () => {}, 7 — try/catch asserting tagged return not throw | [G6/policy] x4 | typeof entry==='object' true for null/array; throwing classifier surfacing as TEETH threw | RED (null throws today) |
| FG68 | {policy:'BLOCKED', reason:''} AND {policy:'BLOCKED', reason:'EXEMPT: ...'} | [G6/policy] | unjustified policy; second spelling | RED |
GOOD controls: FG47 (unchanged; with an objects-only manifest a pure-typeof classifier makes all 24 REKEY and FG47 reds — kills M1), FG61 (manifest-text-independent version). FG48/49/50/51/53/59 unchanged. Header (FG1-FG59)→(FG1-FG68) at :206,:1709; '(68 teeth verified)' at :3134.

## 4. Acceptance gates (author in memory/projects/gates/rb-2.gates.md; CHECKs v18-safe `node -e` wrappers execSync'ing node-24 children with PATH injected; probes live in memory/projects/gates/rb-2.*.mjs (harness repo))
X1 EARS: eval PASSes AND detail reports `24 Identity columns carry a D6 policy` + `(8 REKEY entries` (typeof classifier would report 24).
X2 rekey-contract-surface exit 0 + `3 teeth verified`.
X3 MUTATION BITE-PROOF: copy eval to evals/rb2-mutant-scratch.mjs (NOT *.eval.mjs), M0 control exit 0; M1 classifyPolicy body → typeof inference RED; M2 needle-presence inference RED [G6/policy]; M3 startsWith/case-insensitive RED; M4 unknown policy silently skipped RED; M5 G6_REKEY_ANCHORS=[] RED [G6/anchors]; each substitution asserts anchor occurs EXACTLY once, throws if absent; unlink in finally. Implementer contract: exactly one `function classifyPolicy(` and one `const G6_REKEY_ANCHORS = [`.
X4 not-weakened ratchet: (tag,'FGnn') pairs from `git show 7e75cbd:evals/...` ⊆ HEAD pairs; expectTag( / mut( / checkRekeyCompleteness( counts ≥ fork; HEAD adds ≥ 9 new pairs.
X5 Rust consumer: `cargo nextest run -p monster-realm-module -E 'test(data_lifecycle_cross_manifest_consistency)'` 1 passed 0 failed 0 skipped; PLUS JS re-implementation of m22_rekey_manifest_keys over HEAD asserting EXACTLY 24 keys incl account.identity.
X6 whole suite: `node evals/run.mjs` zero `eval FAIL:`; guest-claim-integrity + rekey-contract-surface PASS lines each exactly once.
X7 touches scope: `git diff --name-only 7e75cbd..HEAD` ⊆ {evals/guest-claim-integrity.eval.mjs, ARCHITECTURE.md}; zero server-module/, game-core/, docs/adr/, CHANGELOG.md.
X8 migration fidelity: import fork module (git show → evals/rb2-fork-scratch.mjs, removed in finally) + HEAD module; identical key sets (24); per key fork policy word (prefix / object-ness⇒REKEY) == new policy; every BLOCKED/EXEMPT reason == fork string minus prefix byte-for-byte; REKEY needles byte-identical.

## 5. Sequencing
Tester (no Bash, cannot write .claude/worktrees) → /tmp/rb2-tests/: fixtures-fg60-fg68.txt (insert after FG53 :2881), fg52-rewrite.txt, rb2-red-probe.mjs (imports current module, runs each injected case, prints case → actual tag|PASS), rb2-mutation-probe.mjs, rb2-ratchet-probe.mjs, rb2-t9-extract-probe.mjs, rb2-manifest-fidelity-probe.mjs.
Orchestrator: run RED probe on untouched tree (record transcript); apply fixtures; standalone eval → TEETH: FG60 RED; install probes to memory/projects/gates/; record RED evidence.
Implementer: one file; manifest → 24 objects; classifyPolicy + POLICY_KINDS + G6_REKEY_ANCHORS; rewire anchors + consumed; rekeyEntries; header/doc updates; WHY in header. Does not touch fixture blocks.
Orchestrator: X1..X8 → just ci → docs (ARCHITECTURE.md one addition after :109) + handoff flags (4 stale-prose follow-ups + ADR need).

## 6. Risks/decisions
1 reason on REKEY: BAN. 2 prefix in reason: STRIP + ban (X8 byte-compare retires risk). 3 exact equality vs frozen set. 4 constructors: REJECT (T9 reads text; hides discriminator; second place to lie). 5 dual-form: REJECT. 6 new tag [G6/policy]. 7 do NOT export classifyPolicy (frozen seam, no consumer). 8 only 2/8 REKEY value-pinned — accept, state in header. 9 biome/T9 fragility — §2 constraints + X5. 10 scratch files `*-scratch.mjs`, unlink in finally. 11 aggregate green hides weakened tooth — X4 + X3.

## 7. Workflow
Solo implementer + tester, one scoped red-team write-the-cheat pass over the classifier (M1-M5 as real implementations).

---
## ORCHESTRATOR ADJUDICATION (after reviewer APPROVE-WITH-CHANGES, red-team 13 measured findings, /simplify) — FROZEN DESIGN

### Classifier (shrunk per /simplify; prototype-safe per reviewer/simplify BLOCKER)
- `POLICY_SHAPES` = plain array of `{kind, fields}` (`'exists,policy,rekey'` / `'policy,reason'` / `'policy,reason'`), looked up with `.find(s => s.kind === entry.policy)` (exact ===; `'constructor'`/`'__proto__'` cannot hit Object.prototype). Plain const, file idiom (no freeze needed — module-private).
- `classifyPolicy(key, entry)` → `{kind}` or `{error:'[G6/policy] …'}`; NEVER throws: null → 'null', array → 'an array', function/number/string/undefined → typeof name. Checks in order: object-ness; policy in closed set; `Object.keys(entry).sort().join(',') === shape.fields` (collapses closed-field-set/missing/extra rules); every field a non-empty string; REKEY needles match literal `/^[a-z][a-z0-9_:]{3,}\($/` (`:` allowed so a qualified `crate::economy::rekey_wallet(` needle stays legal); BLOCKED/EXEMPT `reason.trimStart().toLowerCase()` must not start with any of `['blocked:', 'exempt:', 'rekey:']`.
- `[G6/policy]` message: names the key + defect; spells sibling clauses WITHOUT brackets (expectTag is indexOf); for the closed-set/field failures it names the extension path verbatim ("add the field to POLICY_SHAPES in this file in the same PR — M22 spec §2's deletion_policy/basis/exportable extension goes through here deliberately").
- `checkRekeyCompleteness`: after stripper soundness, classify ONCE into `const kinds = new Map()` (first failure returns). `[G6/declared]` uses `kinds.has(key)`. `[G6/anchors]`: presence unchanged; EXEMPT pin `kinds.get(G6_EXEMPT_ANCHOR) === 'EXEMPT'`; NEW `G6_REKEY_ANCHORS` = ALL 8 REKEY columns (subset pin — a new REKEY entry needs no list edit; a demotion reds). `[G6/consumed]` iterates `kinds` entries with kind 'REKEY', reading `manifest[key].rekey/.exists` (shape already proven). Success detail counts REKEY via `.policy === 'REKEY'` (runs only after failures.length===0).
- Header WHY records: this residual + the measured trap; objects-only (dual-form rejected: prefix parsing IS the same implicit inference; a `'BLOKED: '` typo would silently un-police a column); literal objects over constructors (the Rust T9 twin reads this file as TEXT; a helper hides the discriminator and adds a second place to lie); closed field set as a deliberate speed bump for M22 S3's spec'd `deletion_policy/basis/exportable` extension; `[G6/policy]` runs FIRST so a manifest defect is never reported as a tree defect (no order fixture — diagnostic-only, CUT per /simplify); forward path: when a second file must interpret entry shape, EXPORT classifyPolicy and freeze it in rekey-contract-surface — never re-implement.
- Also update `:1558` @param JSDoc (reviewer m1), `:1431` @type, `:1397-1399`, header inventory `:175-193`, `:206`, `:1709`, `(NN teeth verified)`.

### Manifest text (T9 twin constraints — now MECHANICALLY enforced by FG70, not discipline)
- 24 literal objects, bare field names, real keys `'table.column':`; prefixes stripped from reasons (KEEP per all three lenses); apostrophes in NEW/EDITED single-quoted strings use the file's `’` idiom (reviewer n2); the one pre-existing double-quoted reason (`account.identity`, 2 apostrophes, even) is left double-quoted; no `//`, `{`, `}` in any manifest string; no `\'` (biome 2.5.1 MEASURED to produce one for a reason with 1 apostrophe + 2 double quotes — silent T9 truncation to 22 keys above its >=20 floor); the byte string `REKEY_MANIFEST = freezeManifest({` occurs EXACTLY ONCE in the whole file (reviewer M1 — the Rust scan takes the FIRST hit and does not strip block comments; spell it `freezeManifest(...)` in prose).

### Teeth (final; each "×N" is N SEPARATE checkRekeyCompleteness calls with its own FGnn<letter> label — reviewer M3)
FG52 rewrite (`{policy:'REKEY', rekey:'rekey_monsters(', exists:'has_monsters('}` on playtest_event → [G6/anchors]).
FG60 `player.identity` {policy:'BLOCKED', reason, rekey, exists} → [G6/policy]. (needle-presence inference)
FG61 `battle.player_identity` {policy:'BLOCKED', reason:'terminal rows survive'} → PASS (the residual repro as GOOD control).
FG62a `profile.identity` {policy:'REKEY'} → [G6/policy]; FG62b {policy:'REKEY', rekey:'ctx', exists:'ctx'} → [G6/policy] (degenerate needle present in every body); FG62c {policy:'REKEY', rekey:'rekey_profile(', exists:''} → [G6/policy] (empty needle; measured guard-11 fail-open).
FG63 `player.identity` 'BLOCKED: legacy string form' → [G6/policy].
FG64a {policy:'Blocked',reason} · b {policy:'REKEYED',rekey,exists} · c {policy:'constructor',reason} · d {policy:'__proto__',reason} → [G6/policy] each.
FG65a {reason:'x'} · b {policy:undefined, reason:'x'} → [G6/policy].
FG66 loop over ALL 8 REKEY anchors, each demoted to {policy:'BLOCKED', reason:'nothing to carry'} → [G6/anchors] (the reverse lie; labels FG66/<key>).
FG67a null · b [] · c ()=>{} · d 7 → [G6/policy], asserted via try/catch as a TAGGED RETURN, never a throw.
FG68a {policy:'BLOCKED', reason:''} · b {policy:'BLOCKED', reason:'EXEMPT: second spelling'} · c {policy:'REKEY', rekey, exists, reason:'x'} → [G6/policy].
FG69 (totality — kills the MEASURED identity-memoised and key-allowlist classifiers): (1) a DEEP-CLONED good manifest (`{...entry}` per key) must PASS; (2) for EVERY key of REKEY_MANIFEST × 5 defect shapes {blocked-with-needles, rekey-without-needles, rekey-empty-exists, rekey-with-reason, string-form} → [G6/policy], label `FG69/<key>/<shape>` (never a VALID demotion shape — that is [G6/anchors], FG66's job).
FG70 (T9 co-scan, the MECHANICAL form of the text constraints): an in-eval JS twin of `accounts_tests.rs:3313-3433` (naive `//` strip incl. inside strings; anchor `REKEY_MANIFEST = freezeManifest({` found EXACTLY ONCE in the raw file; brace walk counting every brace byte; keys = escape-blind single-quoted span immediately followed by `:` and shaped word.word) over THIS file's own source (`readFileSync(fileURLToPath(import.meta.url))`) asserting the extracted RAW list (no dedupe) equals `Object.keys(REKEY_MANIFEST)` exactly and in order; plus FG70b positive control: the same extractor over an inline synthetic block containing a `\'` drops keys (proves the twin is escape-blind like the Rust one, so the tooth can see the biome hazard).
GOOD controls: FG47 (unchanged), FG61, FG69(1). Unchanged: FG48-51, FG53, FG59.

### Gates (ledger) — X1..X8 met-with-evidence; X9 DEFER → backlog
X1 eval PASS + `all 24 Identity columns carry a D6 policy (8 REKEY entries`. X2 contract eval PASS `(3 teeth verified)`. X3 mutation bite-proof probe (mkdtemp copy of evals/ + server-module/src, cwd there — NO scratch in the worktree, `just lint` would red on a leftover): M0 control GREEN; classifier mutants M1 typeof-inference, M2 needle-presence, M3 startsWith/case-insensitive, M4 unknown-policy silently skipped, M5 `G6_REKEY_ANCHORS = []`; DATA mutants (corrupt the shipped manifest) M6 one real entry back to its fork STRING form, M7 a real REKEY entry's `exists` → ''; every substitution asserts its anchor occurs EXACTLY once and throws if absent; each mutant must be RED (M1/M2 red via FG47 [G6/anchors] — the measured tag, NOT [G6/policy]). X4 ratchet: fork (tag,label) pairs ⊆ HEAD; every fork `FG\d+` label ⊆ HEAD labels; FG47, FG61, FG69, FG70 present by name; expectTag(/mut(/checkRekeyCompleteness( counts ≥ fork; NO verbatim payload pin (brittle under biome — CUT). X5 Rust consumer: `cargo test … data_lifecycle_cross_manifest_consistency` 1 passed 0 failed + the eval PASS (FG70 is the ONE JS twin — no second extractor in the probe, SSOT per /simplify). X6 `node evals/run.mjs` zero FAIL + both PASS lines exactly once. X7 touches scope. X8 migration fidelity (fork module vs HEAD module deep compare). X9 DEFER → backlog: stale prose in out-of-touches consumers (rekey-contract-surface.eval.mjs:41-50; accounts_tests.rs:3930-3936; ADR-0207 :18/:108/:112/:155-157; ADR-0179 :708-710) + the ADR decision (no number reserved) — the doctrine channel, not handoff prose (reviewer M5/M6).

### CUT (with reason)
Clause-order fixture (diagnostic-only harm, conceded); FG60 verbatim payload pin in X4 (brittle, redundant with expectTag); 4-field classify result + field-copying Map (return {kind} only); X5's second JS extractor (FG70 is the SSOT); red-team's 8-shape × 24 loop shrunk to 5 shapes (the 3 dropped are covered single-key by FG64/FG65); X3's third data mutant (needles on a BLOCKED entry — FG69 covers it over all 24 keys).

---
## POST-IMPLEMENTATION ADJUDICATION (reviewer APPROVE-WITH-CHANGES, /simplify, red-team round 3) — applied at 7af3535
- CUT the faithful-reader pin (`parsed.kind !== manifest[key].policy`): tautology under the shipped classifier (kind IS the matched policy word), no tooth, contradicted the "one reader" claim (reviewer M1 + /simplify). The red-team's A12 fold (classifier lies about kind AND guards consumption) is therefore observable only via X1's `(8 REKEY entries` count at ledger time and review — stated in the PR.
- APPLIED: [G6/policy] tail names the non-blank-string rule (M22 S3's boolean `exportable` needs it relaxed) and the needle message names NEEDLE_SHAPE (reviewer m1/m2); banner splits MEASURED cheats from mutant-pinned ones (m3); "runs before the manifest is compared to the tree" (m4 — stripper soundness runs first); "eight" removed from prose (subset pin; FG66's guard re-derives the count from data); JSDoc rule restatement trimmed; banner's duplicated ordering sentence cut; [G6/live] walks the Map; ClassifiedPolicy.kind typed as the closed union; detail count cannot TypeError; "is of type undefined" wording.
- KEPT (measured-backed): `{kind, rekey, exists}` record (consumed reads validated needles — kills the needle-getter TOCTOU; matches the X3 probe contract); `classifyManifest` (two callers); `bad()` closure; `?.kind` (a non-column key on a small fixture tree would otherwise TypeError); REASON_PREFIX_LIES (FG68b + X8 strips prefixes); NEEDLE_SHAPE (FG62b-e + M7).
- Red-team round 3 (shipped tree, all three probes green, T9 twin fuzz 400k no divergence): #1 needle↔key correspondence is a PRE-EXISTING [G6/consumed] limit → ledger X10 DEFER → backlog (Rust-side exists-predicate enumeration + containsIdent + a tooth). #2 zero-width chars vs trim/prefix-lie → CUT (deliberate-only path; stated as an accepted limit). #3/#4 FG66/FG69 loop-breadth counters → CUT (post-merge test weakening is review's job; consistent with FG1-FG59 having no breadth floors; X3's M8 detects the FG69 case one-shot). #5 deep-equal self-blessing is provable only by X3's data mutants → stated in the PR evidence. #7 probe polish APPLIED (X3 firstTag anchored on `[G6/…]`; X8 prototype assert).
- Gate runs on the shipped tree: eval PASS 24/8/71; full `just ci` EXIT=0 on b00054f (94 evals, 2007 Rust, 2818 client); final `just ci` on 7af3535 in progress at the time of writing.
