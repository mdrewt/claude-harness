# rb-3 — plan (planner output 2026-08-28; orchestrator adjudications appended below)

Slice: rb-3 (residual R-m22-s0-X2). Repo: project. Worktree `.claude/worktrees/rb-3`, branch `slice/rb-3`, fork `ab35926`.
Touches: `evals/guest-claim-integrity.eval.mjs` (+ ARCHITECTURE.md minimal line). No ADR number reserved.

## 0. Triage (orchestrator, measured before planning)
- Fork `7e75cbd` (pre-rb-2): `[G6/declared]` was literally `if (key in manifest) continue;` (:1606).
- HEAD `ab35926` (rb-2 merged): the manifest OBJECT is enumerated in exactly ONE place —
  `classifyManifest` (`for (const key of Object.keys(manifest))` :1707 → `const kinds = new Map()`) and
  `[G6/declared]` reads `kinds.has(key)` (:1834); `[G6/live]`/`[G6/anchors]`/`[G6/consumed]` read the Map.
- Probe (mkdtemp copy, live tree + synthetic `guild_member.owner_identity: Identity`):
  HEAD unpolluted → `[G6/declared]`; `Object.prototype['guild_member.owner_identity']={policy:'EXEMPT',…}` →
  STILL `[G6/declared]`; phantom `Object.prototype['phantom.col']` on a GOOD tree → PASS.
  FORK unpolluted → `[G6/declared]`; poisoned → **PASS(null), WRONGLY GREEN** (the residual reproduces).
- Conclusion: the defect is CLOSED BY CONSTRUCTION on master, incidentally, with NO tooth pinning it.
  rb-3 = proof-of-teeth + explicit own-property boundary in comments + ledger mutation bite-proof.
- Blast radius (union of both graphs + grep): callers in-file only; dynamic consumers
  `evals/rekey-contract-surface.eval.mjs` (lazy import, T1/T3) and `accounts_tests.rs:3107` (`include_str!` T9 text
  scan — anchor `REKEY_MANIFEST = freezeManifest({` exactly once; rb-3 touches NO manifest byte).
- Precedent: `evals/append-only-ids.eval.mjs:1634-1670` (Object.create own-nothing tooth; never assigns to Object.prototype).

## 1. Tooth design (planner) — FG72a-d after FG71
- FG72a INHERITED MANIFEST (load-bearing): FG48's guild_member tree + manifest
  `Object.assign(Object.create({'guild_member.owner_identity': {policy:'EXEMPT', reason}}), REKEY_MANIFEST)`
  (24 own keys, guild key inherited only) → `[G6/declared]` naming `guild_member.owner_identity`.
  Kills: `key in manifest`, `manifest[key] !== undefined`, `Reflect.has`, `kinds.has(key) || key in manifest`,
  `for (const key in manifest)` in classifyManifest. Green-before on HEAD (regression pin); red against the fork form.
- FG72b GOOD CONTROL: phantom inherited key `phantom_table.owner_identity` + GOOD_TREE → must PASS (null).
  Pins "own-property BOUNDARY, not detect-and-red"; kills a `for…in` over-correction in `[G6/live]`.
- FG72c LITERAL `Object.prototype` injection (the residual's repro; the only fixture exercising the DEFAULT manifest
  path). Hygiene: assign → pre-assert the pollution TOOK (`KEY in {}`) → try/expect `[G6/declared]` →
  finally `Reflect.deleteProperty(Object.prototype, KEY)` → post-assert gone (`!(KEY in {})`, `Object.keys({}).length===0`)
  → re-run GOOD pair must PASS. runTeeth is synchronous (nothing interleaves).
- FG72d ENTRY-side boundary: `'player.identity': Object.create({policy:'BLOCKED', reason:'x'})` → `[G6/policy]`
  (closed field set read via `Object.keys(entry)` :1669). Kills `'policy' in entry && 'reason' in entry`. First-cut candidate.

## 2. Code-side change
Keep `kinds.has(key)` unchanged. Record THE OWN-PROPERTY BOUNDARY in the rb-2 banner (:1594-1605) + at classifyManifest
+ at `[G6/declared]`: `Object.keys(manifest)` in classifyManifest is the ONLY read of the manifest key space; banned shapes
listed (each measured green-and-wrong on the fork form). REJECTED: null-prototype manifest (kills the T9 anchor + FG70),
Map-valued export (breaks T1 + spreads + T9), `Object.hasOwn` guards at :1834 (a SECOND boundary contradicts "one place").

## 3. Mutation bite-proof (`rb-3.mutation-probe.mjs`, fork ab35926, mkdtemp copy; anchors verified unique)
M0 control GREEN · M1 `if (kinds.has(key)) continue;`→`if (key in manifest) continue;` RED [G6/declared]@FG72a ·
M2 →`if (manifest[key] !== undefined) continue;` RED@FG72a · M3 →`if (kinds.has(key) || key in manifest) continue;` RED@FG72a ·
M4 classifyManifest body → `for (const key in manifest)` RED@FG72a · M5 `for (const key of kinds.keys()) {`→`for (const key in manifest) {`
RED [G6/live]@FG72b · M6 classifyPolicy body-top: `if (Object.keys(entry).length === 0 && typeof entry.policy === 'string') return {kind: entry.policy, …}`
RED [G6/policy]@FG72d · M7 delete FG72c's `Reflect.deleteProperty` line → RED@FG72c (the leak post-assert; the only
mechanical proof of the hygiene). Do NOT anchor on `Object.keys(manifest)` (occurs twice: :1393 freezeManifest, :1707).

## 4. Gates X1..X7
X1 eval PASS + `(72 teeth verified)` + `all 24 Identity columns carry a D6 policy (8 REKEY` → rb-3-X1:PROTO-TEETH-GREEN ·
X2 mutation probe → rb-3-X2:BITES · X3 ratchet vs ab35926 (pairs ⊆, labels ⊆, REQUIRED live literals incl FG72a-d,
expectTag ≥ fork+3, checkRekeyCompleteness ≥ fork+4, mut ≥ fork) → rb-3-X3:NOT-WEAKENED · X4 consumers green
(rekey-contract-surface 3 teeth + cargo T9 test) → rb-3-X4:CONSUMERS-GREEN · X5 suite green, PASS line exactly once,
total ≥ 94 → rb-3-X5:SUITE-GREEN (honest: does NOT prove no leak — FG72c's post-assert + M7 do) · X6 touches scope →
rb-3-X6:IN-SCOPE · X7 MANUAL doc gate (ARCHITECTURE.md line + banner + FG72c comment), ADR need → DEFER → backlog (rb-2 X9 shape).

## 5. Risks
1 biome may reject `Object.prototype[K] = v` / `delete` → plain assignment + Reflect.deleteProperty; fallback defineProperty.
2 format hook (unpinned biome) may reformat → re-run T9-sensitive gates after. 3 three counts move to 72 (:213, :1948, :3921).
4 expectTag is indexOf — no sibling `[G6/…]` tag in any new message. 5 FG72c is the repo's first Object.prototype write —
adjudicate in plan review. 6 never a second `REKEY_MANIFEST = freezeManifest({` in raw text. 7 battle-schema-snapshot's
`in` sites are outside parseTableSchemas and use no dotted key.
CUT: null-proto/Map manifest; exported hasOwnEntry helper; detect-and-report clause; repo-wide hygiene eval; anchors mutant.

## 6. Sequencing
tester stages FG72 block + both probes to /tmp → orchestrator applies, runs RED proof (probe on HEAD: M0 green, M1-M7 red)
→ banner/counts/ARCHITECTURE.md → just lint → X4 → X5 → lenses (reviewer + red-team write-the-cheat + /simplify) → verifier → docs.
Workflow: solo implementer (orchestrator) + tester ≠ implementer.

---
## ORCHESTRATOR ADJUDICATION (reviewer: 3 BLOCKERs/7 MAJORs; red-team: 2 BYPASS-MEASURED + hygiene; /simplify) — FROZEN DESIGN

### Decisions
- **FG72c KEPT** (reviewer said CUT; red-team MEASURED that "kinds as a PLAIN OBJECT + `key in kinds`" — the residual's
  class applied to a derived object — is killed by FG72c ONLY; FG72a/b/d all pass it). The append-only-ids rule
  (:1653 "never assign to Object.prototype") was written for a tooth that HAD an Object.create alternative; ambient
  pollution cannot be modelled without the real write. Rebutted IN-FILE, with hygiene: pre-existence check (fail loud,
  never clobber a co-resident's state — red-team F7), assignment INSIDE try with a named diagnostic (F8), finally
  `Reflect.deleteProperty`, post-assert `!(KEY in {})` + `Object.keys(Object.prototype).length === 0` (the memo's
  `Object.keys({})` form was tautological — reviewer M3 / red-team F6), cleanup before ANY return (reviewer M4).
- **FG72c pollutes TWO keys**: the column key (declared direction) AND `error` — red-team F4 measured that
  `Object.prototype.error` flips the GOOD verdict on HEAD (`parsed.error !== undefined` :1709 and
  `classified.error !== undefined` :1794 read an absent own key through the chain; fail-closed but the eval blames FG47
  with `[object Object]`). So FG72c is a genuine RED→GREEN on HEAD: the code-side fix is `Object.hasOwn(x, 'error')` at
  :1709, :1794 (and :3906 for consistency). Never add `then`/`path`/`constructor` to the polluted set (thenable objects
  hang run.mjs's `await`; `path` breaks node's resolver) — stated in the fixture comment.
- **FG72e ADDED** (red-team F2: `[G6/declared]` reading `Object.hasOwn(REKEY_MANIFEST, key)` — the frozen export instead
  of the `manifest` PARAMETER — passes all planned teeth and makes every injected-manifest tooth tautological): a copy of
  the manifest with the NON-anchor live key `battle.player_identity` dropped → `[G6/declared]` naming it.
- **FG72f ADDED** (red-team F1: classifyManifest preferring an inherited entry over the own one is green): own
  `{policy:'BLOCKED'}` (no reason) shadowing an inherited well-formed entry for `player.identity` → `[G6/policy]` naming
  `player.identity` and `the fields [policy]`.
- **FG72d KEPT, re-framed** (reviewer): it pins the ORDER-dependent invariant that `entry.policy` (:1663, the one
  prototype-walking read in classifyPolicy) is made safe by the LATER `Object.keys(entry)` field-set equality (:1669).
- **Every FG72 fixture self-asserts its own shape before the call** (reviewer B1 — expectTag pins the clause, never the
  key): `KEY in manifest && !Object.hasOwn(manifest, KEY)`, `Object.keys(manifest).length === Object.keys(REKEY_MANIFEST).length`
  (never a hardcoded 24), and the failure message must NAME the key (FG50 precedent :3182).
- **Boundary comment**: the SCOPED claim (reviewer M2) — "inside checkRekeyCompleteness the manifest key space is read
  exactly once (classifyManifest); every later clause reads the derived Map" — NOT "the only read in the file" (:1393,
  :2401, :3528… also read it). The comment must NOT contain any probe anchor byte string (reviewer M1: the mutation probe
  pins RAW text) and never `REKEY_MANIFEST = freezeManifest({` (FG70 counts raw). Cite rekey-contract-surface:361's own
  `Object.hasOwn` as the second consumer's rule. Note the `__proto__`-named-table quirk ([G6/parse] fail-closes it).
- **Keep `kinds.has(key)` unchanged** (reviewer confirms; a second boundary would contradict "one place").
- **CUT**: red-team F3 (getter-TOCTOU in classifyPolicy — not the prototype class, not reachable from the shipped manifest
  → handoff follow-up flag, no ledger DEFER); parseTableSchemas' own prototype surface (outside touches → handoff flag);
  `Reflect.has` in the "kills" prose unless measured.

### Mutants (rb-3.mutation-probe.mjs — mkdtemp copy of the WORKTREE eval, HEAD-with-teeth; per-mutant TOOTH pin is
load-bearing — red-team F5: a hollowed/deleted FG72a keeps all mutants RED via FG72c, only the label tells them apart)
M0 control GREEN · M1 `key in manifest` @FG72a · M2 `manifest[key] !== undefined` @FG72a · M3 `kinds.has(key) || key in manifest`
@FG72a · M4 classifyManifest brace-replaced with a `for (const key in manifest)` body @FG72a · M5 `[G6/live]` loop → for-in
over manifest [G6/live]@FG72b · M6 classifyPolicy body-top GUARDED snippet (null/array/typeof guards inline — reviewer B2:
unguarded `Object.keys(null)` throws and FG67a reds first) accepting an own-empty entry with an inherited string policy
[G6/policy]@FG72d · M7 FG72c cleanup line for the column key deleted → @FG72c (tooth pin only, no tag — reviewer M5) ·
M8 FG72c assignment line for the column key deleted → @FG72c (pre-assert bites) · M9 `Object.hasOwn(parsed, 'error')`
→ `parsed.error !== undefined` @FG72c · M10 `Object.hasOwn(classified, 'error')` → `classified.error !== undefined` @FG72c ·
M11 `[G6/declared]` → `Object.hasOwn(REKEY_MANIFEST, key)` @FG72e · M12 classifyManifest brace-replaced with the
base-preferring entry read (red-team A6) @FG72f. ANCHOR-MISS / NO-OP / BROKEN-MUTANT verdicts kept from rb-2.

### Gates
X1 eval PASS + `(72 teeth verified)` + `(8 REKEY entries` · X2 probe BITES · X3 ratchet vs ab35926 (REQUIRED live literals
FG47/FG69/FG70/FG70b/FG71/FG72a-f; floors measured after landing) · X4 consumers (rekey-contract-surface 3 teeth + cargo T9)
· X5 suite (0 FAIL, both PASS lines exactly once, ≥94) · X6 touches ⊆ {eval, ARCHITECTURE.md} vs ab35926 · X7 pinned-biome
check on the eval file (reviewer M7) · X8 MANUAL docs (path:line) · X9 ADR at an assigned number → DEFER backlog (none
reserved; fold into rb-2 X9's item: one ADR for the G6 manifest gate — discriminator + own-property boundary + FG72c hygiene).

---
## POST-IMPLEMENTATION ADJUDICATION (reviewer: 1 MAJOR/9 minor; red-team round 2: 2 HIGH BYPASS-MEASURED + 3 MEDIUM) — applied at round 2
- Reviewer M1 (Semgrep, remote-only gate): RAN LOCALLY — `semgrep scan --config auto --error --exclude '.claude'` over the two
  touched files → exit 0, no findings (semgrep 1.174.0). Re-run on the final tree before the PR.
- Reviewer m2 APPLIED (mine): de-bracketed the sibling tags inside the [G6/parse], [G6/anchors] and [G6/live] messages
  (`G6/declared`, `G6/live`, `G6/consumed` in prose) — expectTag is indexOf, so a bracketed sibling let the wrong clause
  satisfy a tooth. m3 APPLIED: the `__proto__` quirk note is TABLE-level only; a `__proto__`-named FIELD vanishes with no
  fail-close → routed to X10. m4 APPLIED (ARCHITECTURE.md: three reads). m7 APPLIED: rb-2 banner range reverted to
  FG60-FG71 (the rb-3 family does not pin those anti-patterns). m1 → tester round 2 (exact-string hasOwn floors).
  m5 (guildTree duplicates FG48's literal) KEPT — hoisting would edit a shipped tooth for a cosmetic SSOT gain.
  m6 → tester round 2 (CUT the two tautological key-count self-asserts). m8 (append-only-ids back-pointer) → outside
  touches → handoff flag, folded into the X9 ADR item. m9 informational (deliberate cross-eval coupling; fails loud).
- Red-team F1 (HIGH): the COLUMNS side (`columns.has` in [G6/live]/[G6/anchors]) is unpinned — a plain-object `in` rebuild
  + ambient pollution of the 24 keys passes G6 on an EMPTY tree. → tester round 2: FG72c's window pollutes FOUR keys and
  runs two more directions (live: tree lacking `player_wallet.owner_identity` → [G6/live]; anchors: manifest AND tree
  lacking `account.identity` — the only anchor that is neither EXEMPT-pinned nor REKEY-pinned → [G6/anchors]); mutants
  M13/M14. F2 (HIGH): nothing pins that the declared direction runs INSIDE the window → in-window `in {}` asserts before
  the first and after the last direction. F3: ratchet slack → exact-string floors + aggregate at measured count +
  `Object.keys(Object.prototype).length !== 0` ≥ 2. F5: `error` is a node-internal chain-read key (fs error path) →
  delete FIELD first in finally; no stdout/fs inside the window (comment). F7: FG72d "the one prototype-walking read"
  was FALSE → reworded (the FIRST; later field reads are safe only because they follow the same equality).
  F4 (battle-schema-snapshot `tableName in parsed`, measured gate defeat under pollution; outside touches) → X10 DEFER
  → backlog, together with the `__proto__` field hole. F6 CLOSED verdicts recorded (M8 reds via the took-assert, not the
  ambient string; firstTooth cannot mis-parse; no return path skips the cleanup; adversarial co-residents all fail-closed).
- Accepted limits (stated in the PR): assertion-deletion hollowings (red-team F3's H1-H11) are unbounded — the ratchet
  counts calls, not assertions, and no mutant pins fixture self-asserts; consistent with FG1-FG71 and rb-2's decision on
  FG66/FG69 breadth counters (post-merge test weakening is review's job). `(72 teeth verified)` is a hand-maintained
  literal (pre-existing shape). M9 and M10 are indistinguishable by message (both pin FG72c).

---
## VERIFIER (opus) — PASS at 297885d
All seven CHECK gates re-derived green; RED proof reproduced from 37aade4 in a mkdtemp copy (control GREEN first);
code-side change confirmed = exactly three `Object.hasOwn` reads + comments/counts; the two removed self-asserts are a
tautology removal (both sides computed over the same key set, before the call; the reachable/not-owned guards stay);
de-bracketing removes four false-pass surfaces and adds none; FG72c restructure strictly widens (2→4 keys, 2→4
directions, window guards). Hand-mutations: HM1 plain-object `kinds` + `key in` → RED at FG72c (the downstream cheat the
probe does not generate); HM2 FG72a deleted → X2 MIS-TAGGED + X3 required-literal red; HM3 `Object.hasOwn(shipped,
'error')` reverted alone → only X3's exact byte-string floor catches it (branch unreachable on the success path — stated
limit); HM4 fork tooth FG48 retargeted → X3 DROPPED pair. Scope exact (2 files); manifest block sha256 identical.
Findings applied: X8 ticked with all three cites. Note for future ledgers: a `git diff … | grep` on the anchor string
hits git's hunk-header context line — filter to `^[+-]`.
Ledger authoring trap hit twice this slice: gates without an `EVIDENCE:` line can never be met (check ticks the box,
writes nothing, reports 0/N) and `CHECK: MANUAL:` is executed by sh — recorded in the mr-gates-check-authoring card.
