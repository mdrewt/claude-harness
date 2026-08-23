# 15r-sec-vis — Plan (Table visibility as declared data + a class regression gate)

Branch `feat/15r-sec-vis`, worktree `.claude/worktrees/15r-sec-vis`, base `origin/master` a6ae43c.
Gate: full `just ci`. Budget $60. Supervisor assigned NO ADR number (see §7 — plan recommends reserving 0199).

## 0. Verified ground truth (measured, not assumed)

- `node -e "import('./evals/battle-schema-snapshot.eval.mjs').then(m=>m.default())"` → **PASS**,
  "38 tables parsed; all match baseline exactly … append-only layer ran against the previously
  committed baseline (HEAD~1)". **The baseline is FRESH** — the 15r-sec-a `battle` flip needed no
  re-baseline because the eval parses Rust source via `readServerModuleSources`, never
  `spacetime describe`, so the 2.7.1 describe-output shift is a non-issue for this gate.
  *(NB: the file has no main-guard — `node <file>` alone runs nothing and exits 0 vacuously.)*
- `evals/baselines/table-schemas.json`: 38 entries, each exactly `{pk, columns, order}`; zero
  occurrences of `public`/`private`/`visib`/`rls`.
- `scripts/okf-export.mjs` is a **self-executing CLI** (`process.exit` at module scope, :590/:594) —
  it can never be statically imported. It **already** dynamic-imports the eval at :32:
  `const { parseTableSchemas } = await import(EVAL_PATH);`
- `evals/run.mjs` auto-discovers `*.eval.mjs`; each module's default export returns ONE
  `{name, pass, detail}`. `--write` main-guards are inert under the runner (it imports, so
  `process.argv[1]` is `run.mjs`) — precedent `observability-log-wrapper.eval.mjs:1629`.
- Nothing asserts the exact key SET of a baseline entry; `recordedOrder`/`checkBaselineAppendOnlyCore`
  address keys **by name**. Only the `columns` object's *insertion* order is load-bearing (ADR-0193 D1).
- `evals/gate-teeth.eval.mjs` and `evals/guest-claim-integrity.eval.mjs` read the baseline/parser but
  only `pk`/`columns`/key-presence → tolerate a new per-entry key. Their table-COUNT guards are free
  regression coverage for any `matchTableBlocks` edit.
- **Live comment decoy:** `server-module/src/economy_tests.rs:73` literally contains
  `` `#[spacetimedb::table(accessor = player_wallet, public)]` `` inside a `//` comment. The eval
  concatenates ALL `.rs` including `*_tests.rs`; okf-export excludes `*_tests.rs`. A naive raw-line
  visibility parser on the eval side would bake "player_wallet is public" into the baseline.
- Semgrep is remote-only; `new RegExp` banned. Biome (not eslint) lints `.mjs`.
- Rust mirror tests `include_str!` the baseline (`pvp_tests.rs:57`, `m14_5d_1a_tests.rs:34`,
  `content_tests.rs:2125`); measured safe — `m14_5d_1a_tests.rs:277`'s 1000-byte window from
  `"item_row"` has ~700 bytes of margin after a ~30-byte insertion. **No `server-module/**` edit.**

## 1. Design decisions

- **D-A — SSOT parser lives in the EVAL; `okf-export.mjs` consumes it.** okf-export is not
  importable; it already dynamic-imports the eval. Zero new import edges — extend the destructure.
- **D-B — Visibility is a THIRD projection over `parseTableFields`, not a second scan.** Widen the
  single table regex in `matchTableBlocks` (:88-89) to capture the attribute tail; add
  `parseTableVisibility(rawSrc)` beside `parseTableSchemas`/`parseTableColumnOrder`. ADR-0193 D1's
  "parse once, project twice" becomes three. **The table set is identical by construction.**
- **D-C — Authoritative text = the eval's existing `stripRustComments` path.** The block regex
  requires `)] <ws> pub struct`, so string-literal decoys can't match; `stripRustComments` kills the
  `//` decoy. Do NOT switch to `stripRustSource` — that would change the table set that
  `[table-count]`, gate-teeth TOOTH 1 and guest-claim-integrity:1502 all pin.
- **D-D — okf-export matches its attribute line on `stripRustSource`-blanked text** (contractually
  offset/length-preserving, `rust-scan.mjs:19-24`, so `strippedLines[i]` still aligns with the raw
  line supplying `docComment`/`lineNumber`) and **delegates value derivation to the eval's exported
  `visibilityFromAttrArgs`**, deleting the inline ternary at okf-export.mjs:145-151. This is what
  makes the two callers agree without a second derivation.
- **D-E — `accessor` vs `name`: keep the difference, make it loud.** okf-export accepts `name =`
  (ADR-0197 scar tissue); the eval accepts only `accessor =`. `[visibility-shape]` fails loud if the
  two projections' table SETS differ. Never default a missing visibility to `'private'` in the eval
  (empty-target blind spot). okf-export's existing `?? 'private'` fail-secure default stays — it
  feeds docs, not a gate.
- **D-F — Exact-token derivation, no `.includes`.** Split the captured attribute tail on commas at
  paren-depth 0; require a token `=== 'public'`. `attrRest.indexOf('public')` false-positives on
  `index(btree, accessor = public_idx)`; the depth counter keeps `scheduled(guest_claim_reaper)`
  from mis-splitting. Literal patterns / `String.indexOf` only.
- **D-G — Entry shape `{pk, visibility, columns, order, …markers}`.** `order` stays last among
  derived keys (ADR-0193 D2); nothing reads key positions (verified); a scalar next to `pk` makes a
  flip a one-line diff at the top rather than buried after a 30-line array.

## 2. The three-part shape (one part per EARS)

| part | tag | input | fails on | EARS |
|---|---|---|---|---|
| 1 pure shape | `[visibility-shape]` | working baseline + parsed source | entry with NO `visibility` key, or a value not exactly `'public'`/`'private'`; table-set mismatch between the two projections | 1 |
| 2 derived-vs-baseline | `[visibility-drift]` | `parseTableVisibility(realSrc)` vs working baseline | source says public, baseline says private (or vice versa) — source edited, regenerator not run | 2 |
| 3 git-resolved prev | `[visibility-escalation]` | `readPrevBaseline().data` vs working baseline | prev `private` → next `public`, or table absent from prev and next says `public` — **unless** the entry carries a `visibility_note` string containing `ADR-` | 3 (+ the laundering half of 2) |

- **D-H1 — escalation FAILS, it does not merely announce.** EARS 3: fail "until the baseline records
  that choice **explicitly**". A regenerated `"visibility":"public"` is a derived echo that `--write`
  emits silently — the "baseline laundered by regenerating" cheat shape. The only escape is a key the
  regenerator never writes: `"visibility_note": "ADR-nnnn — why this table is world-readable"`.
  Announce-only ships exactly the gate that already failed for ADR-0042 (a constraint existing only
  as prose).
- **D-H2 — the note is PERMANENT**, deliberately unlike ADR-0193 D7's self-expiring
  `manual_migration`: a migration is an event that expires; public-ness is a permanent property.
  No staleness rule. *(This divergence is the main ADR-worthy item.)*
- **D-H3 — bootstrap:** prev entry present but with NO `visibility` key ⇒ skip escalation for that
  table AND count it loudly in `detail`. Otherwise all ~19 currently-public tables "escalate" against
  the pre-slice baseline and the slice cannot merge. Window is exactly one commit wide. A table
  ABSENT from prev is a new table and gets the full EARS-3 rule.
- **D-H4 — EARS 3 is not a duplicate** of the existing new-table drift check: `checkSchemaDrift`'s
  "table not in baseline" is empty by construction after the mandatory regeneration (ADR-0193's own
  argument). `[visibility-escalation]` fires exactly where the drift check is silent. The tooth
  proves independence with a triple assertion (drift clean AND `[visibility-drift]` clean AND
  `[visibility-escalation]` RED).

## 3. Regenerator

- **D-I — `--write` main-guard on the eval:** `node evals/battle-schema-snapshot.eval.mjs --write`.
  Precedent `observability-log-wrapper.eval.mjs:1629-1639`, whose own comment gives the reason: "SSOT
  — a generator/checker split is how the 56-vs-53 class is born." A separate `scripts/` script would
  re-implement `readServerModuleSources` + all three projections = a second parser, which the spec
  forbids. The eval already exports `readServerModuleSources` "so the ADR-0193 D6 regeneration
  one-shot reads the byte-identical concatenation this gate parses" (:1766) — the header anticipated it.
- Thin shell over an exported PURE `formatBaseline(schemas, order, visibility, existingBaseline)
  -> string`: iterate `Object.keys(existingBaseline)` first (never re-sort), append parsed-only
  tables after, emit `pk, visibility, columns, order`, **carry forward every unrecognised entry key
  verbatim** (`manual_migration`, `visibility_note`), return `JSON.stringify(out,null,2)+'\n'`.
- **D-J — idempotence is a gate rule, not a habit: `[baseline-stale]`** asserts
  `formatBaseline(...real...) === readFileSync(BASELINE_PATH,'utf8')` byte-for-byte. Subsumes EARS 1
  mechanically and proves `--write` idempotent.

## 4. EARS → test → biting fixture

| EARS | Gating test | Fixture that bites |
|---|---|---|
| 1 | **T-VIS-SHAPE** (4 malformed baselines) + **T-VIS-REGEN** (`[baseline-stale]` byte-identity) | (a) entry with no `visibility`; (b) `"Public"`; (c) `true`; (d) `""` — all RED. (a) is the empty-target blind spot |
| 2 | **T-VIS-DRIFT**: must carry `[visibility-drift]` AND name the table; **pre-assert `checkSchemaDrift` clean on the same pair** | `inventory` fixture with `, public` removed, vs a baseline recording `"visibility":"public"` |
| 2 laundered | **T-VIS-LAUNDER**: after a full re-baseline `[visibility-drift]` is clean (pinned) and `[visibility-escalation]` bites | `rebaseline(FLIP_SRC)` — the sanctioned `--write` output |
| 3 | **T-VIS-NEWPUB** (triple, independence-proving): drift clean AND `[visibility-drift]` clean AND `[visibility-escalation]` names the table; then with `visibility_note` → clean | fresh `#[spacetimedb::table(accessor = party_slot, public)] pub struct PartySlot {…}` fully re-baselined against a prev that doesn't know it |
| all | **T-VIS-ANCHORS** (baseline-independent): over the REAL corpus ≥1 public and ≥1 private; pin `player_wallet`/`battle` → private (ADR-0015/0198), `inventory`/`character` → public | kills an all-`private` derivation that would be self-consistently green after `--write` |
| all | **T-VIS-COMMENT**: a fixture whose only `public` spelling is in a `//` comment and in a Rust string literal (assembled from `concat`-broken parts) must derive `private` | closes the `economy_tests.rs:73` false-positive vector |
| — | **T-VIS-LEGAL** false-RED guard: unchanged real corpus clean through all three checkers | kills a checker that fires on every diff |
| — | **T-NOTHROW** +6 cases (`null`, `42`, mismatched shapes per checker) | the `neverThrows` harness (:1746) |

## 5. Task order

**P0 tester (RED first):** add the new export names to the self-import guard list (:859-877) — that
alone REDs the eval with "not exported"; write T-VIS-*; extend T-NOTHROW. Orchestrator runs and
pastes the RED (tester has no Bash).
**P1 eval impl:** widen `matchTableBlocks` (body `m[2]`→`m[3]`); carry `visibility` on
`parseTableFields`; export `visibilityFromAttrArgs` + `parseTableVisibility`; add the three
`…Core` checkers wrapped in `neverThrows`; add `formatBaseline` + the `--write` main guard; wire into
the real-gate block (:1697-1715), escalation only when `appendOnlyRan` (rides the existing
fail-closed branch); extend `detail` with the bootstrap-skip count.
**P2 exporter:** okf-export imports `stripRustSource`; match the attr on the stripped line, keep raw
lines for docComment; delete :145-151 and call `visibilityFromAttrArgs` (add to the :32 destructure).
**P3 regen+verify:** `--write`; re-run green; `--write` twice → empty `git diff`; `just knowledge-check`
**must be clean with no `docs/knowledge/**` change** — if not, STOP, the two parsers disagreed on the
real corpus and that is a finding, not a regen chore. Then the spec proof-of-teeth live, both
directions, pasted into the PR.
**P4 docs:** ADR + boy-scout hunks.

## 6. Boy scout (2 hunks, ~22 lines — under cap)

1. eval :7-14 — replace the manual regeneration recipe with the real command + key-order contract.
   A real regenerator supersedes the prose; leaving it is a comment-accuracy defect.
2. eval :27-34 — add the new exports to the "imported by scripts/okf-export.mjs" contract note.

Deliberately NOT touched: okf-export's `PRIVATE_ADRS` map (:41-50), now partly derivable — out of cap.

## 7. ADR

Recommended YES (short, Amends ADR-0193), reserving **0199** (0198 is highest; supervisor's
`adr_next_free` is 199; no concurrent sibling — 15r-a2 was held SERIAL-REQUIRED). Two genuinely new,
non-recoverable-from-code items: (1) a permanent, non-self-expiring escape marker `visibility_note`
explicitly diverging from D7's self-expiring `manual_migration`, with the reason and the staleness
landmine it avoids — two markers with different lifecycle rules in one file WILL be misread;
(2) D2's entry shape gains a key and D6's prose recipe becomes a command, which amends an Accepted ADR.

## 8. Risks

1. **`matchTableBlocks` group renumbering** (`body` `m[2]`→`m[3]`) — a miss silently empties every
   table body. Highest-consequence line in the slice. Mitigated by existing T-COUNT/T-IDEMPOTENT/
   gate-teeth TOOTH 1/guest-claim-integrity:1502.
2. `[baseline-stale]` byte-identity is strict — a legitimate `visibility_note` REDs unless
   `formatBaseline` preserves unknown keys verbatim. Must be an explicit tooth.
3. Bootstrap window (D-H3) — the loud count in `detail` is the only thing stopping it becoming
   permanent. Red-team target.
4. `--write` on a dirty tree rewrites from whatever `server-module/src` says; with an unfetched
   `origin/master` a developer gets a confusing RED. Message must name `git fetch origin master`.
5. okf-export's file set (`*_tests.rs` excluded) still differs from the eval's (all `.rs`). After D-D
   the VALUES cannot diverge, but the table SETS still can; deliberately not gated (YAGNI).
6. Nightly mutation gate — new pure checkers add mutants; check the cap before merge (ADR-0183).
7. Scope is larger than the spec reads: a widened core parser + 3 checkers + a regenerator + ~8 teeth.

## 10. ADJUDICATION — plan v2 (post reviewer + red-team + /simplify). THIS SUPERSEDES §2/§3/§4 WHERE THEY CONFLICT.

Measured: **18 public / 20 private** of 38 tables. ADR references in table doc comments are NOT
uniform (`character` has none), so **requiring a justification note on every public table is
REJECTED** — it would force 18 hand-authored citations, several fabricated. That kills the
"prev-independent, no-git" variant of EARS 3; the git layer stays, hardened.

### Accepted findings and their resolutions

- **RT-1 (BLOCKER, empirically demonstrated) — the `ADR-` escape is `.includes`-shaped.** Red-team ran
  `checkBaselineAppendOnly(prev, {inventory:{…, manual_migration:'ADR-'}}, {})` against the REAL
  shipped eval → `[]` (clean). The existing escape at :497-498 is
  `marker.indexOf('ADR-') !== -1`. **Resolution:** `visibility_note` requires an ANCHORED literal
  match — string starts with `ADR-` followed by ≥4 digits — and gets a tooth probing `"ADR-"` alone
  and `"blah ADR- blah"`. **The identical hole in the pre-existing `manual_migration` escape is NOT
  fixed here** — it is a different rule, a behavior change outside this slice's EARS, and gating
  rules are never boyscout targets. Recorded as a follow-up in the handoff.
- **RT-2 (BLOCKER) — pre-arming `visibility_note` on a still-private table.** **Resolution, two
  independent kills:** (a) `[visibility-shape]` makes a `visibility_note` on a `private` entry a
  VIOLATION — prev-independent, so it holds even on a pre-axis branch; (b) the escalation escape
  additionally requires the note to be ABSENT-OR-DIFFERENT in `prev` (authored in the transition).
  This also removes the need for D7-style self-expiry: the escalation trigger self-disarms once
  prev and next are both public, so a stale note is inert, and (a) makes an early note impossible.
  **D-H2's "permanent, no staleness rule" stands, but for this reason — not the one it gave.**
- **RT-3 (BLOCKER as stated → downgraded to MAJOR, hardened) — the bootstrap skip is not one commit
  wide.** Red-team built the git topology and showed a branch cut pre-slice keeps
  `merge-base = pre-slice commit` for its whole life, skipping escalation throughout. Confirmed
  `ci.yml` uses `fetch-depth: 0`, so this is topological, not fetch-depth. Mitigating facts: the
  post-merge master-push run resolves prev via the `HEAD~1` fallback and DOES fire, so the flip is
  caught one step late, and `[visibility-drift]` is git-independent and still holds on such a branch.
  **Resolution — the skip becomes narrow, loud and tamper-detecting:** skip ONLY when NO entry in the
  resolved prev baseline carries a `visibility` key (a wholesale pre-axis baseline), and report the
  skipped count in `detail`. If SOME prev entries carry the key and this one does not → **FAIL**
  (that is the "delete the key to re-enter the skip path" tamper vector). Documented in the ADR as
  bounded by the repo's serialized-merge operating model, **not** claimed as a structural guarantee
  (reviewer MINOR).
- **RT-4 — fail-OPEN outside a git work tree** (`pass:true` with a warning substring). Pre-existing
  behavior the escalation layer would inherit. Not newly introduced and out of EARS scope; the
  git-independent `[visibility-shape]`/`[visibility-drift]` rules still run there. Follow-up flag.
- **RT-5 — okf-export's live `attrRest.indexOf('public')` false-positive** (demonstrated on
  `index(btree, name = public_view, …)`). Confirms D-D. **Keep D-D.**
- **RT-6 — post-D-D, `just knowledge-check` is circular for `visibility`** (both the gate and the
  docs trace to one function; the check only diffs regen-vs-committed). **Resolution:** keep
  T-VIS-ANCHORS as the independent cross-check and make it count-based + security-critical-pinned
  (below), rather than dropping the pins as the reviewer suggested — red-team's argument that this is
  the ONLY independent signal is the stronger one.
- **Reviewer MAJOR — `formatBaseline` never specified WHERE carried-forward keys land**, while
  `[baseline-stale]` is byte-identity → a legitimate hand-added note REDs the gate on first use.
  **Resolution:** `visibility_note` is a KNOWN key with a canonical position —
  `{pk, visibility, visibility_note?, columns, order, …unknown-keys-after-order-in-prior-relative-order}`.
  Plus an explicit tooth: an entry with `visibility_note` AND `manual_migration` in arbitrary input
  positions must round-trip to canonical placement.
- **/simplify — fold `parseTableVisibility` into `parseTableSchemas`.** REJECTED: that shape is
  consumed by `gate-teeth.eval.mjs`, `guest-claim-integrity.eval.mjs` and `okf-export.mjs`; a third
  projection is free and is the idiomatic extension of ADR-0193 D1's "parse once, project twice".
- **/simplify — cut `--write`/`formatBaseline`.** REJECTED: the slice spec explicitly requires "a
  regenerator that derives it from source". It is a deliverable, not an optional convenience.
- **/simplify — collapse the shape/drift tags into one checker.** ACCEPTED (matches
  `checkColumnOrderCore`, which already emits three tags from one function).
- **/simplify — the cross-projection table-set check is unreachable.** ACCEPTED, cut. The reachable
  half (parsed-vs-baseline table set) lives in `[visibility-drift]`.

### Final element list (v2)

**Checker A — `checkVisibilityCore(parsedVisibility, baseline)`, pure, no git.**
- `[visibility-shape]` — every baseline entry carries `visibility` exactly `'public'` or `'private'`;
  `visibility_note`, if present, is a string ANCHORED-matching `ADR-` + ≥4 digits AND appears ONLY on
  a `public` entry.
- `[visibility-drift]` — derived-from-source vs recorded, bidirectional over the union of table
  names. (EARS 1 + EARS 2.)

**Checker B — `checkVisibilityEscalationCore(prev, next)`, git layer, tag `[visibility-escalation]`.**
Fires when `next[t].visibility === 'public'` and (`t` absent from prev OR `prev[t].visibility === 'private'`).
Escape: `next[t].visibility_note` present AND `prev[t]?.visibility_note !== next[t].visibility_note`.
Bootstrap: wholesale-pre-axis prev → skip + loud count; partial → FAIL. (EARS 3.)

**Regenerator** — `node evals/battle-schema-snapshot.eval.mjs --write`, over a pure
`formatBaseline(schemas, order, visibility, existingBaseline)` with the canonical key order above,
iterating `Object.keys(existingBaseline)` first (never re-sorting) and carrying unknown keys forward.
`[baseline-stale]` byte-identity against the committed baseline stays (mechanical proof of EARS 1).

**Teeth** — T-VIS-SHAPE (missing key / `"Public"` / `true` / `""`), T-VIS-NOTE (`"ADR-"` alone,
`"blah ADR- blah"`, note on a private entry — all RED; `"ADR-0199 …"` on a public entry clean),
T-VIS-DRIFT (+ pre-assert `checkSchemaDrift` clean on the same pair), T-VIS-LAUNDER,
T-VIS-NEWPUB (triple independence), T-VIS-PREARM (note identical in prev and next → escape DENIED),
T-VIS-TAMPER (prev partially missing the key → FAIL, not skip), T-VIS-COMMENT (`economy_tests.rs:73`
decoy shape), T-VIS-ANCHORS (18 public / 20 private counts pinned + `player_wallet`, `battle`,
`encounter`, `monster`, `account`, `guest_claim` pinned private), T-VIS-REGEN (real-baseline
byte round-trip + arbitrary-marker-position round-trip), T-VIS-LEGAL (real corpus clean),
T-NOTHROW extended.

**ADR-0199** — reserving the next free number (0198 is highest; supervisor `adr_next_free` = 199; no
concurrent sibling — 15r-a2 was held SERIAL-REQUIRED). Records the axis, the `visibility_note`
marker and why its lifecycle differs from `manual_migration`'s, the bounded/loud/tamper-detecting
bootstrap skip and its dependence on the serialized-merge operating model, and D6's recipe becoming
`--write`. Supervisor assigned none; this is a deliberate, flagged deviation.

**Follow-ups (NOT this slice)** — (i) the `manual_migration` `.includes('ADR-')` escape is equally
degenerate-passable; (ii) the whole eval fails OPEN outside a git work tree.

## 9. Coordination note

`evals/rust-scan.mjs` is **imported, never modified** (not a hidden dependency). But this adds
`scripts/okf-export.mjs` as a NEW importer of a module sibling slice 13r-c-2 owns; if 13r-c-2
renames/moves it, one import line must follow. Flagging, not blocking.
**HIDDEN DEPENDENCIES: none identified.**
