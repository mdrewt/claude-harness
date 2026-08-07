# 12r-a — Append-only id baselines restored + growth guard (PLAN)

Branch `feat/12r-a-append-only-id-baselines`, worktree `.claude/worktrees/12r-a`, off master `42505e7`.
Spec: `specs/monster-realm-v2/M-postgate-twelfth-review-residuals.spec.md` §12r-a. No ADR number reserved.

## Ground truth (hand-read from RON, glob-sorted filename order; cross-checked vs `parseIds`)
| registry | live ids | committed baseline | status |
|---|---|---|---|
| zones | 0,1 | [0,1] | in sync |
| **species** | 1,2,3 (000-core) · 4,5,6 (010-derived) · 7,8,9,10 (020-playtest-wave1) · 20,21 (050-wave2) · 22,23 (051-wave2-derived) · 30,31 (060-item-evo-derived) = 16 | [1,2,3] | **DRIFTED** |
| **skills** | 1..11 | [1..6] | **DRIFTED** |
| **items** | 1,2,3,4,5 | [1,2] | **DRIFTED** |
| abilities | 1,2,3 | [1,2,3] | in sync |
| shops | 1 | [1] | in sync |
| npcs | 1,2 | [1,2] | in sync |

`node evals/run.mjs` today: `append-only-ids ... PASS ... species: 16 ids; all 3 baseline ids retained` — vacuous.

## Blast radius
Four declared files only. The three baselines are consumed by nothing but `evals/append-only-ids.eval.mjs`
(exhaustive grep over .rs/.mjs/.ts/.js/.toml/.yml/.json/justfile). `content-version.eval.mjs` hashes only
`game-core/content/**` (untouched) ⇒ **no CONTENT_VERSION bump, no content-hash regen, no `just knowledge`**.
`pt_d1_roster.rs`/`pt_d3_tuning.rs` reference this eval in COMMENTS only; they pin `parseIds`/`readRegistryDir`
*semantics*, not bytes.

## LOAD-BEARING HAZARD
Existing tooth **T2-e negative control #2** (`:442-445`) uses ron
`(id: 2, name: "glob /* id: 99 */ in flavour text")` with fixture baseline `[1,2]`.
`parseIds` is NOT string-aware (only `trailingCommentIdNeedles` is) ⇒ live = `[1,2,99]` ⇒ the new growth guard
fires ⇒ the control goes red for a reason unrelated to what it asserts.
**Fix: per-case fixture baseline (`[1,2]` / `[1,2,99]`) + a why-comment. Do NOT make the guard string-aware,
weaken it, or delete the control.**

## Decisions
- (a) Guard lives INSIDE `checkRegistry` — all 7 registries covered, `withTempRegistry` exercises the real fn.
- (b) Three distinct messages: removal (byte-identical to today), growth (`baseline needs regeneration`),
  and a combined `RENUMBER SUSPECTED` when both fire.
- (c) Order: empty-baseline → comment-needle → compute missing+unpinned → 3-way dispatch. Growth check MUST
  come after the comment guard (else a masking comment yields phantom "pin id 99" advice).
- (d) `unpinned` = de-duplicated, numerically sorted. Duplicate live ids are `validate_content`'s job.
- (e) Documented in: eval header paragraph · each regenerated `_comment` · one `ARCHITECTURE.md` bullet
  (content-directory-layout list). No ADR (none reserved) — the in-file comments are the decision record.
- (f) E2 fixtures read the REAL committed baseline at run time and drop a real shipped id (species 20,
  item 4, skill 7) ⇒ self-maintaining, and RED while the baseline is stale.
- (g) No genuine boyscout candidates inside `touches:`. (`zone-ids.json`'s stale `zones.ron` `_comment` is
  OUT of touches ⇒ follow-up flag only.)

## Teeth (1:1 with EARS)
E1 production loop · T3-a×3 (E2, RED today) · T3-b×3 (E3, RED today) · T3-c1..c4 controls (c4 RED) ·
T3-d removal-vs-growth message distinctness · T3-e renumber-both-halves (RED) · T3-f ordering ·
T3-g registry-coverage (optional).

## Red-proof staging (tester deliverable)
1. teeth only → first failure = T3-a species precondition (E2 red today)
2. + baselines regenerated → first failure = T3-b (E3 red independently)
3. + guard + control-2 fixture + docs → whole eval green (E1)

## Anti-patterns (each has a tooth)
string-aware/weakened guard · growth-before-comment-guard · length or stringify comparison · early-return
hiding the renumber's second half · one merged "sets differ" message · touching `parseIds`/`readRegistryDir`
(ADR-0173) · generating a baseline from the extractor under test · asserting messages via a shared constant ·
`new RegExp` (semgrep `detect-non-literal-regexp`) · editing `CHANGELOG.md`/`adr/README.md`/`DIGEST.md`/`run.mjs`.

## Plan-review triage (reviewer + red-team, both deep; decisions are FINAL)

### ADOPTED into the slice
- **F12** control-2 fix is *better than planned*: keep fixture baseline `[1,2]` and change the in-string
  needle to an ALREADY-PINNED id (`"glob /* id: 2 */ in flavour text"`). Verified: `parseIds` → `[1,2,2]`,
  unpinned `[]`; a string-BLIND comment guard still false-fails it, so the control keeps its kill and stops
  short of asserting "a number inside flavour text is a legitimate content id".
- **F2 (narrow) integer-shape guard.** RON accepts `0x14`, `2_00`, `0b10100`, `id : 20`; `parseIds`'
  `\bid:\s*(\d+)` mis-harvests or misses all of them, so `id: 2_00` renumbers species 2→200 and stays GREEN
  even after this slice. The eval's own headline claims "never removed **or renumbered**", so this is in
  scope. Guard: one LITERAL regex `\bid\s*:\s*([^\s,)\]]*)` — refuse the registry if any captured token is
  not `^[0-9]+$`. Verified against ALL 13 content dirs: zero non-plain-decimal tokens in the 7 registries
  this eval covers ⇒ no false-fail risk today. Does not touch `parseIds`/`readRegistryDir` (ADR-0173 safe).
- **F5c/F10 per-registry baseline FLOOR** (`zones 2 · species 16 · skills 11 · items 5 · abilities 3 ·
  shops 1 · npcs 2`), hardcoded in the eval. Two defects in one: (i) E2's teeth are otherwise satisfiable
  by a baseline containing ONLY the dropped id (`species [1,2,3,20]` passes all three), and the E2 fixture
  RON is derived FROM the baseline so it can never detect a wrong baseline; (ii) nothing forbids a baseline
  SHRINK, and this slice makes editing baselines routine.
- **F5a/b/F6 message wording.** Removal message keeps its existing prefix (T2-a asserts a substring) and
  gains "restore the CONTENT — never delete the id from the baseline". Growth message says append-only and
  warns "if this number came from flavour text or a nested field, rewrite it as `id=N` — do NOT pin it"
  (without that, the gate's own advice is destructive — see F6).
- **F11** T3-g is MANDATORY, and the growth teeth cover ALL SEVEN registries (a `checkRegistry` that
  short-circuits on `zones`, or applies growth to three hardcoded keys, otherwise passes every other tooth).
  Negative controls must not all share the `zones` label.
- **F1/F7 disclaimers** in the eval header + every regenerated `_comment`: this gate detects REMOVAL and
  UNPINNED GROWTH only — never id REUSE/rebinding (swapping species 20↔21 is green), and `parseIds` is
  flat/depth-blind so a nested `id:` sub-record would be a breaking change for this gate.

### `/simplify` brake — FINAL scope adjustments (applied ON TOP of the triage above)
- **CUT F2 (integer-shape guard).** Accepted: it serves none of E1/E2/E3, has ZERO live occurrences, and
  shares its root cause with parked F3 (both are "`parseIds` harvests the wrong token"). Resolving half the
  extractor-fidelity question now is worse than deferring the whole of it. → PARKED with F3 as one
  "extractor hardening" follow-up slice.
- **CUT the third `RENUMBER SUSPECTED` message.** Accepted: when both fire, CONCATENATE the removal and
  growth details (`${removal}; ${growth}`). Fully diagnostic, no new literal in the contract, and T3-e then
  asserts BOTH substrings present rather than pinning a bespoke label. Build the detail INLINE in
  `checkRegistry` — no `buildDetail()` helper for one caller.
- **REJECTED: "merge the floor into the existing `baseline.length === 0` branch as `< FLOOR[key]`".** That
  would fire on the TEMP-FIXTURE teeth (T2-e's block-comment cases use fixture baselines of 2-3 ids against a
  `species` key whose floor is 16; T3-c1's equality control likewise), turning several existing teeth
  pass-for-the-wrong-reason and false-failing the controls. **The floor MUST be a PRODUCTION-ONLY check** in
  the default export, reading the seven real baseline JSONs directly — it must NOT run inside
  `checkRegistry`. The existing `=== 0` guard stays exactly as it is.

### PARKED (follow-up flags — named in the PR body + handoff, NOT touched here)
- **F3 string-needle refusal.** Deleting species 20 while echoing `"was id: 20"` in flavour text is GREEN.
  Real, but it DIRECTLY CONTRADICTS the deliberate 11r-i control at `:442-445` (which asserts an in-string
  comment sequence must NOT refuse the registry). Resolving it is a policy change to what string values mean
  to this gate — its own slice + ADR. Mitigated here by the F6 message wording so the gate never advises
  pinning a phantom.
- **F1 map-shaped baseline** (id → identity, like `evolution-path-edge-ids.json`) to catch reuse/rebinding.
- **F4** `.ron` dotfile / `foo.ron` directory read by the eval but skipped by `build.rs`.
- **F8/F13** empty-registry message; folding the comment-needle and growth diagnoses into one CI round trip.
- **ADR**: the reviewer is right that the bidirectional semantics + ordering constraint deserve an ADR
  (ADR-0173 is direct precedent). NO number was reserved for this slice, and picking one risks a collision
  with a concurrent sibling; editing any ADR also forces a `just adr-digest` → `DIGEST.md` regen that
  collides with 12r-f. Rationale therefore lives in the eval header + `_comment`s + `ARCHITECTURE.md`, and
  the PR body + handoff ASK THE SUPERVISOR TO RESERVE A NUMBER for a follow-up.
- `zone-ids.json` `_comment` says `content/zones.ron` (a file; a directory since M8.9); `shop-ids.json`
  `_comment` says stock is `item_id:` 1/2/3 (now also 4/5 per EG3-6). Both OUT of `touches:`.
- edge_id cross-revision append-only (EG5-1 owns) · `comment_needle_violations` → abilities/npcs
  (ADR-0173 residual) · marking ADR-0143 residual 7 closed.
