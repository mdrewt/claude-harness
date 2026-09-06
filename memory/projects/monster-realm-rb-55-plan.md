# rb-55 plan — dedupe the five status a11y badge tokens

Worktree: `projects/monster-realm/.claude/worktrees/rb-55` · branch `feat/rb-55-status-token-dedupe` @ origin/master 75e9719

## Verified facts (graph-union + grep + direct read)

- `A11Y_TOKENS` (game-core/src/content.rs:1692-1745) is a plain Rust const. NOT a SpacetimeDB table,
  NOT in `client/src/module_bindings/**`, never referenced by `server-module/src/content.rs`.
  **There is no runtime data path carrying these tokens to the client.**
- `statusBadge` blast radius (CodeGraph + cbm + grep, agreeing): one production caller,
  `monsterCard` (battleModel.ts:209), plus battleModel.test.ts. No dynamic dispatch.
- The existing m14.5d parity test (battleModel.test.ts:961-1010) proves COMPLETENESS
  (every `StatusEffect` variant yields a non-empty, non-warning badge) but **not VALUE parity**:
  renaming `'PSN'`->`'POI'` in TS keeps all 118 tests green.
- content.rs holds THREE literal clusters of the tokens: the SSOT const (:1692), the deliberately
  independent test pin `M23S8_EXPECTED_PAIRS` (:7516-7530, shape `("status.poison", "PSN"),`), and a
  free-text copy in an assert message (:8092). **A loose regex reads the wrong one.**
- `pub const A11Y_TOKENS: &[A11yToken] = &[` occurs EXACTLY ONCE in content.rs (verified `grep -c`).
- **ADR 239 is TAKEN** by rb-54 (`docs/adr/0239-rb54-enum-roster-totality-at-content-sync-time.md`,
  merged in 75e9719). The supervisor-assigned number collides -> this slice authors **ADR-0240**.
- `client/tsconfig.json` excludes `**/*.test.ts`: no `.test.ts` is ever typechecked. Every
  exhaustiveness claim needs a RUNTIME key-set assertion, never a type.

## (A) Mechanism — a1+ (TS reads Rust, one direction). a2/a3/a4 rejected.

**A-1 `client/src/ui/battleModel.ts`** — the `switch` (57-84) becomes one data table
`STATUS_BADGE_TOKENS` (`as const`, exported) + an `Object.hasOwn` lookup. Warn +
`unknownStatusToken` fallback preserved byte-for-byte.
Why the table is load-bearing, not cosmetics: a `switch` has **no runtime-enumerable key set**, so
the extra-key direction is unprovable — a stray `case 'Frostbite'` is invisible to every possible
behavioural test. `Object.keys` becomes the oracle.

**A-2 `client/src/ui/battleModel.test.ts`** — a new `describe('rb-55: ...')` that parses the
`A11Y_TOKENS` const **body only** out of `game-core/src/content.rs` and asserts two-directional
parity, keyed by the `status.<lowercased variant>` convention, with the variant roster taken from
`StatusEffect.algebraicType.value.variants`.

Rejections:
- **a2 (Rust reads TS) inverts the layering.** `game-core` is the functional core; `client/` is the
  outermost shell. `include_str!` is compile-time, so any context building game-core without
  `client/` present fails to COMPILE — strictly worse than a red test. a2's only real advantage
  (missing file = hard error) is free on the TS side: `readFileSync` throws by default.
- **a3 doubles the parser surface** for no new invariant (ADR-0224 amendment 2: proof-of-teeth is
  applied once per invariant and does not recurse).
- **a4 (real derivation: content table -> bindings -> subscription)** is out of `touches:` by
  construction (server-module/**, module_bindings/**, and the client subscription set is
  exact-set-pinned by an eval). Named in ADR-0240 Alternatives as the honest end-state.

Path: `path.join(path.dirname(fileURLToPath(import.meta.url)), '..','..','..','game-core','src','content.rs')`
— cwd-independent, mirroring `client/src/indexShell.test.ts:97`.

**No `Object.freeze`**: an immutability claim needs a tooth performing the real write; nothing
mutates this object; `as const` gives production the compile-time readonly under `client-typecheck`.

## (B) Anti-vacuity anchors

| # | Failure mode | Anchor |
|---|---|---|
| B1 | Parser matches 0 rows | assert exactly **13** parsed, **5** `status.`, **8** `affinity.` |
| B2 | Parser matches only one family | the 5/8/13 triple |
| B3 | Parser reads `M23S8_EXPECTED_PAIRS` (:7517) or the message text (:8092) | anchor `pub const A11Y_TOKENS: &[A11yToken] = &[`, assert it occurs **exactly once**, slice to the first `\n];`, parse only that region; row regex shaped to the STRUCT-literal form, which the tuple form cannot match. Control M10 proves it. |
| B4 | Region over-runs into the test module | region must contain no `pub const`, no `fn `, no `#[`; length in a sane band |
| B5 | Self-referential oracle | expected side comes ONLY from the parsed Rust file; actual side ONLY from the imported module. The new describe must contain **no** `PSN/BRN/PAR/SLP/FRZ` literals — no copy #3. |
| B6 | Decoy comment rows inside the const body | strip `//`-to-EOL from the region; assert no block-comment delimiters |
| B7 | File-not-found silently passes | `readFileSync` with **no** try/catch, `?? ''`, or `existsSync` guard; plus a byte floor. Probe M14. |
| B8 | Row deleted from Rust | the 13/5/8 counts + sorted `toEqual` set equality |
| B9 | Extra TS entry with no Rust row | `Object.keys(STATUS_BADGE_TOKENS)` in the same `toEqual` |
| B10 | `status.<lowercase>` convention silently stops holding | anchor the variant list first (length 5, contains 'Poison'), then assert every variant maps to an own TS key AND a parsed Rust key |
| B11 | New tests restate existing teeth | register records the pre-slice verdict with the new describe deleted: must be GREEN |

## (C) Mutant register (13 + 1 probe) — see rb-55.mutant-register.md

M01-M05 five TS labels desynced one at a time · M06 Rust `token: "PSN"`->`"POI"` · M07 delete the
Rust `status.freeze` row · M08 delete `Freeze:` from the TS table · M09 anchor-decoy doc comment
· **M10 CONTROL must stay GREEN** (`M23S8_EXPECTED_PAIRS` poison pair changed) · M11
`Object.hasOwn`->`in` · M12 regression control (delete the warn) · M13 extra TS key `Frostbite`
· **M14 PROBE** (unreadable CONTENT_RS must RED, not pass).

## (D) Rust side: comments only, ZERO code change

`STATUS_KIND_ALL` is consumed by `server-module/src/content_tests.rs` (rb-54) — touching its shape
is a hidden-dependency STOP. A "status rows helper" is YAGNI (unused by production, mutated by
cargo-mutants, needs its own teeth).

Comments that become false/stale: content.rs **:1621-1625** ("Nothing mechanically links the two" —
outright false after ship); **:8064-8070** (narrow "nothing else in the repo notices" to the eight
affinity rows — NARROW, do not delete: clause deletion strands the sentence); **:7513-7515** (add
that this stays the sole VALUE pin). Leave :8091-8094 (`\`-continued string, rustfmt reflow risk).
battleModel.ts: **:34-35**, **:57**, **:72-73**, **:77-81**.

Authoring constraint: **no `/`+`*` pair anywhere in new content.rs bytes** (content.rs:7496-7500 —
the spacetime-type-snapshot eval's naive block-comment stripper drops a type). No `1a.` list markers.

## (E) Boy-scout (2 hunks, ~12 lines, cap 40/3)

1. `battleModel.ts:34-35` — the `status` field doc re-lists all five literals (a sixth hand-copy a
   rename strands). Replace with a pointer to `STATUS_BADGE_TOKENS`.
2. `battleModel.ts:74-76` — the warn text names the wrong artifact/first step after the refactor.
   Precondition: grep client/ + client/e2e/ for assertions on the message BODY first.

No symbol renames: `statusBadge`/`unknownStatusToken` are cited by name in ADR-0233, content.rs and
battleView.test.ts — cross-file citation cascade, the opposite of file-local.

## (F) Gates: X1 parity bites · X2 Rust m23s8_ suite whole · X3 mutant register (MANUAL) · X4 just ci

## (G) Anti-patterns

vacuous parser · third-copy creep · self-referential oracle · reading the test-module copies ·
first-hit anchoring without the exactly-once count · swallowing the read error · **editing
battleView.ts** (in touches: but guarded by `evals/reduced-motion-hp-bar.eval.mjs` source pins;
nothing requires it -> 0 edits) · touching `STATUS_KIND_ALL`/`status_token_key`/`A11Y_TOKENS` shape ·
`/*` in new content.rs bytes · clause deletion instead of narrowing · `Amends:` on the new ADR
(forces a reciprocal edit into 0233 = STOP; use `Extends:`) · regenerating docs/knowledge/** ·
hand-editing CHANGELOG.md · unproved `Object.freeze` · `in`/bracket-truthiness lookup · `git
checkout`/`stash` diagnostics in the worktree · recursive proof-of-teeth.

## Risks

- **R1** ADR-0233:179-182 records the residual and now-false claims. `touches:` grants ONE NEW ADR
  only -> do NOT edit 0233; state the closure in ADR-0240 under `Extends: ADR-0233`. Flag to supervisor.
- **R2** Accepted negative: a doc comment quoting the anchor string now reds the client suite (M09).
  Mitigated by the failure message, not the design.
- **R3** A Rust-only edit to `A11Y_TOKENS` now reds the CLIENT suite. Message must open by naming
  both files and the offending key.
- **R4** ADR-0240 can be raced by a sibling merge — re-check `docs/adr/` immediately before committing.

---
---

# PLAN v2 — after reviewer + red-team (both lenses; red-team MEASURED its findings in /tmp/rb55-redteam/)

## Corrections to v1's verified facts

- **FALSE in v1:** "renaming 'PSN'->'POI' keeps all tests green". Measured on the real tree:
  `PSN->POI` is **already RED pre-slice** via `client/src/ui/battleModel.test.ts:2201`
  (`.toBe('PSN')`). Baseline is **121** tests, not 118. BRN/PAR/SLP/FRZ are the genuinely
  unpinned four. Every claim in ADR-0240 must say **four of the five**.
- **FALSE in v1:** the a2 rejection ("include_str! breaks non-test builds"). `include_str!` inside
  `#[cfg(test)] mod tests` is not compiled in a non-test build — `content.rs:7541`
  (`M23S8_SELF_SOURCE`) is the live counterexample in the very file v1 read. a1 is still chosen,
  but on the honest grounds below.
- **Under-scoped in v1:** the token census. Live hand-copies of the literals on the client side:
  `battleModel.ts:34` (doc), `battleModel.ts:62` (the switch, removed), `battleModel.test.ts:2201`
  (a live value pin), `battleView.test.ts:2976` (`S8_BADGE_TEXT`), `battleView.test.ts:1866,:1899`.
  A coordinated rename post-slice touches >=5 client sites + 3 Rust sites. State this in ADR-0240;
  the unqualified "one contract" claim would be false on delivery.

## C1 (CRITICAL, measured) — the actual side MUST be `statusBadge()`, not the table

v1's parity assertion compared `Object.entries(STATUS_BADGE_TOKENS)` to the parsed Rust rows.
Three measured mutants survive that shape **5/5 GREEN**:
- X1 `if (tag === 'Poison') return 'POI';` inserted above the lookup;
- **X2 the table shipped correct AND the old `switch` retained** with one wrong label — i.e. a
  developer "does the refactor", satisfies parity, and never wires it;
- X3 `return TABLE[tag].toLowerCase()` — every badge ships lowercase.
The old m23-s8 teeth do not help: the shadow census only checks `badge !== unknownStatusToken(name)`
(`'POI' !== '?PO'`), the warn oracle never fires, `length<=3` holds.

**The oracle must be the RENDERED LABEL, not the constant.** Primary assertion:
`variants.map(v => [v.name, statusBadge(v.name)])` vs
`variants.map(v => [v.name, rustByKey.get('status.'+v.name.toLowerCase())])`, sorted, one `toEqual`.
Plus `for (const [k,val] of Object.entries(TABLE)) expect(statusBadge(k)).toBe(val)`.
Measured: X1/X2/X3 -> RED, and the honest impl stays green.

## C2 (measured) — gate X1's `-t` filter is a vacuous gate

Measured (vitest 4.1.10 / node 24.13.1): `vitest run -t 'rb-55'` with **zero** matching tests prints
`Tests  1 skipped (1)` and **exits 0**; a `describe.skip` likewise; `--passWithNoTests=false` does
**not** cover the `-t` case (only a missing FILE exits 1).
=> X1's CHECK must name the FILE, and EXPECT must pin the literal `Tests  <N> passed (<N>)` with N
fixed and the line carrying no `skipped` token.

## C3 (measured) — M11 (`Object.hasOwn` -> `in`) SURVIVES v1's suite

`statusBadge('toString')` returns a **function**; `battleView.ts:290` sets it as `textContent` and
renders `function toString() { [native code] }`. `tsc` misses it (`noUncheckedIndexedAccess` off).
Add a dedicated `it` over `['toString','constructor','valueOf','hasOwnProperty','__proto__']`
asserting `typeof badge === 'string'` and `badge === unknownStatusToken(k)`. Measured: M11 -> RED.
Also assert `Object.getPrototypeOf(STATUS_BADGE_TOKENS) === Object.prototype` — a literal
`__proto__:` key is invisible to `Object.keys` (measured), so B9's census alone cannot see it.

## C4 — content.rs comment edits above :1641 MUST be line-count-neutral

Inbound citations that silently break on a renumber, both **outside touches:**
`docs/adr/0239-...md:19,26,29,33,43,113,118,215` (cites `content.rs:1641`, `:1768`) and
`server-module/src/content_tests.rs:3026,:3028,:3034`. The :1621-1625 rewrite is therefore
**same-lines-in, same-lines-out**. Edits at :7513-7515 and :8064-8070 are below every inbound
citation and are unconstrained.

## C5 — replace v1's hardcoded 13/5/8 with a SELF-CONSISTENT count

Reviewer: pinning `13` total and `8` affinity in a CLIENT test makes a ninth `Affinity` (a pure
Rust/content decision the client does not consume) red `npm test` — a false RED, and the numeric-floor
shape ADR-0224:126-131 retires. Red-team: the `13` is nonetheless what catches five measured
parser-blinding payloads (raw string, `//`-inside-a-string, extra struct field, swapped field order,
struct-update base) — each drops the regex to 12 matches.

**Resolution that satisfies both:** the parser helper asserts
`region.match(/A11yToken\s*\{/g).length === rows.length` — a self-consistent count, no magic number.
Every measured blinding payload still REDs (13 occurrences vs 12 matches), and a ninth affinity row
passes cleanly. Then assert exactly **5** `status.` rows (justified: it is set-equal to the bindings
variant roster, so it is not a second hardcode) and **>= 1** `affinity.` row (proves the region was
not truncated to one family). Drop the `13` and the `8`. Drop B4's inert `no '#['` clause
(red-team: `#[rustfmt::skip]` sits ABOVE the anchor, so the clause only adds a false-RED path;
region over-run is unreachable — the `\n];` terminator is provably unique after the anchor).

## C6 — anti-vacuity anchors live INSIDE the parser helper, not in sibling `it`s

Measured: stripped of its siblings, v1's parity `it` passes **1/1** on a 0-row parse + empty table +
empty variants (`toEqual([])` vs `toEqual([])`). A single `it` deletion is a one-line CI-clean edit.
So `parseRustStatusTokens()` itself throws on: anchor not exactly once; count mismatch; 0 status
rows; 0 affinity rows; a block-comment delimiter in the region; a byte floor on the file. And the
parity `it` carries its OWN `expect(variants.length).toBe(5)` + per-row `toBeDefined()`.

## C7 — the S7 max-len deadlock must be STATED at the point of failure

`A11Y_TOKEN_MAX_LEN = 4` (content.rs:1749) but the client pill caps at 3
(`battleModel.test.ts:2033`). Post-slice, a Rust-legal `FRZ`->`FRZE` reds the client suite with no
legal repair. Assert every parsed `status.*` token is `length <= 3` with a message naming both
`A11Y_TOKEN_MAX_LEN` and the pill cap, so the contradiction is explained rather than discovered.

## C8 — read errors: ban SWALLOWING, not try/catch

v1's B7 ("no try/catch") contradicts the repo idiom it cited. `client/src/indexShell.test.ts:99-106`
catch-and-rethrows **with the resolved path**, which is strictly better. Ban `?? ''`, `existsSync`
guards, `return` on error, `it.skip`. Keep the byte floor. Probe M14 still proves it.

## C9 — honest close: PARTIAL. The derivation half gets a real residual.

The residual asks to "derive the client badge labels from the generated bindings/content data".
This slice closes the **correlation** half (a drift is now CI-red) and does **not** close the
**derivation** half (the TS table is still hand-maintained). Naming it in an ADR's Alternatives is
not a queue. Therefore: **DEFER the derivation to `backlog` via a registered residual**, naming the
blocking seam (a content table -> `spacetime generate` bindings -> the client subscription set,
which is exact-set-pinned by an eval outside touches). Register it AFTER the lenses (residual add
is not upsert).

## C10 — additional authoring constraints for new content.rs bytes

Beyond the `/`+`*` ban: `content.rs:8148-8155` counts `pub fn validate_content(` exactly once
file-wide and `:8248-8254` counts `pub fn validate_a11y_tokens(` exactly once — a new doc comment
quoting either signature reds the Rust suite. The same becomes true of this slice's own anchor
`pub const A11Y_TOKENS: &[A11yToken] = &[`, and the comment at :1621-1625 is exactly where someone
would quote it (this is a SAME-DIFF hazard, not a future risk). No triple-backtick fences in new
`///` comments (`cargo test --doc --workspace` runs in `just ci`).

## C11 — ADR + digest

Number **0240** (0239 taken by rb-54). `Extends: ADR-0233` (never `Amends:` — reciprocal back-link
edit into 0233 is a STOP). Subsystem tags from the fixed vocab (`content`, `client-ui` — no `a11y`
tag exists). **`just adr-digest` must be re-run and `docs/adr/DIGEST.md` committed** — `justfile:543`
wires `adr-digest-check` into `just ci`, so a new ADR without a regen is a CI red. Do NOT touch
`docs/adr/README.md` (supervisor-owned).
ADR-0240 must carry, explicitly: the ADR-0224 declared-exception justification (0224:86-89 permits a
string/regex scan as "a rare exception requiring its own justification"; no `syn` from JS, one const
in one file, not a corpus sweep); the ADR-0233:179-182 rebuttal (0233 says the mechanism is
"retired by ADR-0224" — 0224 retired `evals/*.eval.mjs` scanner SCRIPTS and meta-checks, and
`client/src/main.wiring.test.ts:746-790` is live in-repo precedent for a vitest source scan);
the honest a2 comparison; the full 5-site client + 3-site Rust rename census; the accepted negative
(a doc comment quoting the anchor reds the client suite); and the note that this is the FIRST client
test to read outside the npm package root, so `client/` is no longer independently testable without
`game-core/`.

## C12 — lean mutant register (~9 rows, down from 13+1)

ADR-0224:133-141 caps recursive proof-of-teeth. Final register:

| ID | edit | must RED | pre-slice |
|---|---|---|---|
| R01 | the four unpinned TS labels desynced one at a time (BRN/PAR/SLP/FRZ) — ONE row, 4 sub-edits | rb-55 parity | GREEN (measured) |
| R02 | `'PSN'`->`'POI'` in TS | rb-55 parity **and** battleModel.test.ts:2201 | **RED (pre-covered — recorded, not claimed as novel)** |
| R03 | **X2 — table correct + old `switch` retained, `Poison`->`'POI'`** | rb-55 rendered-label parity | GREEN (measured) — the slice's central mutant |
| R04 | X1 early `if (tag==='Poison') return 'POI'` + X3 `.toLowerCase()` | rb-55 rendered-label parity | GREEN (measured) |
| R05 | `content.rs` `token: "PSN"` -> `"POI"` | rb-55 parity (client) — also reds Rust; scope the run and record both | Rust pre-covered |
| R06 | delete the Rust `status.freeze` row | rb-55 parity + `m23s8_shipped_table_is_valid` | Rust pre-covered |
| R07 | delete `Freeze:` from the TS table | rb-55 parity + the m14.5d warn tooth | m14.5d only |
| R08 | add `Frostbite: 'FRB',` to the TS table (no Rust row) | rb-55 extra-key direction | GREEN — the direction the switch could not express |
| R09 | `Object.hasOwn` -> `in` | the NEW prototype-key `it` (C3) | **v1 claimed RED; MEASURED SURVIVES without C3** |
| C-A | **CONTROL, must stay GREEN:** `content.rs:7517` `("status.poison","PSN")` -> `"POI"` | rb-55 parity GREEN; `m23s8_forgery_shipped_pairs_are_pinned` RED | n/a |
| C-B | **PROBE:** point `CONTENT_RS` at a nonexistent path (test-file edit, revert) | parity must RED, never pass | n/a |
| C-C | **PROBE:** decoy doc comment quoting the anchor | anchor-uniqueness assertion REDs with a reword instruction | n/a |

Dropped as recursion: v1's separate M02-M05 rows (folded into R01) and M12 (the warn-deletion
regression control is already covered by an existing test).

## C13 — bucket fixes

`battleModel.ts:34-35` is boy-scout item 1 ONLY (v1 double-booked it as both a D-repair and an
E-item). `ARCHITECTURE.md`: no edit — `:925-931` describes A11Y-29 and nothing there becomes false;
record the decision rather than leaving a granted touch unexplained. `battleView.ts` +
`battleView.test.ts`: **0 edits** (in touches:, but `evals/reduced-motion-hp-bar.eval.mjs` pins that
file as source text; nothing requires the edit).
Coverage note: `client/vite.config.ts:68` includes `src/**/*.ts` and does not exclude battleModel.ts;
it is in the nightly 96% ratchet. switch->table removes 5 branch arms and adds a data literal —
expected neutral-to-positive.

---
---

# PLAN v3 — FINAL (after /simplify). v3 supersedes v2 supersedes v1.

`/simplify` CUT 1 accepted: **the `switch` -> `STATUS_BADGE_TOKENS` table refactor is DROPPED.**
After v2's C1 moved the oracle to `statusBadge()`, the table bought exactly one thing — the
extra-key direction, i.e. a dead `case` arm for a variant the server cannot send (unreachable if the
bindings lack it; and if the bindings HAVE it, `variants.length === 5` reds first). Against that it
COST: the whole prototype-chain hazard class (measured: `statusBadge('toString')` renders
`function toString() { [native code] }`), the tooth to guard it, mutants R03/R08/R09, and a coverage
ratchet question. A hand-kept object literal is not less duplicated than a hand-kept `switch` — it
is motion, not progress. `content.rs:1607-1609` already rules that these keys are "type space, not
designer-authored rows"; a no-wildcard `switch` is the TS analogue of the exhaustive Rust `match`
at `:1657`.

**Consequence: `client/src/ui/battleModel.ts` production logic is UNCHANGED. Comments only.**

## Verified (this session) — region extraction is MANDATORY, not belt-and-braces

`grep -n 'A11yToken {'` -> 17 hits; **4 lie outside the const**: `:1627` (the struct def), `:7819`,
`:8017`, `:8039`. `:7819-7822` is a deliberately-wrong fixture in the SAME struct form the regex
matches: `A11yToken { key: "status.burn", token: "BR9" }`. A whole-file scan false-REDs on it.
=> anchor + slice-to-first-`\n];` stays, and the BR9 fixture is the sharpest available control.

## Final deliverable

**1. `client/src/ui/battleModel.test.ts`** — ONE new `describe` with ONE `it`. Reads
`game-core/src/content.rs`, slices the `A11Y_TOKENS` const body, strips `//`-to-EOL, matches the
struct-literal row form for `status.*` only, and asserts:

```
expect(variants.map(v => [v.name, statusBadge(v.name)]).sort())
  .toEqual(variants.map(v => [v.name, rust.get(`status.${v.name.toLowerCase()}`)]).sort())
```
with `expect(start).toBeGreaterThanOrEqual(0)` and `expect(variants.length).toBe(5)` **co-located in
the same `it`** (a sibling anchor `it` is a one-line CI-clean deletion — measured).
The actual side is the **rendered label**, never a constant: measured, this is the only thing that
kills an early-return interceptor above the switch.
No `PSN/BRN/PAR/SLP/FRZ` literal anywhere in the new code (no third hand-copy).
`readFileSync` catch-and-rethrow **with the resolved path** (`indexShell.test.ts:99-106` idiom); no
`?? ''`, no `existsSync`, no `it.skip`, no swallow.
The failure message carries: both file paths, "repair BOTH, never one", the anchor-quoting hint, and
the `A11Y_TOKEN_MAX_LEN`=4 vs pill-cap=3 deadlock explanation (C7's value is the explanation, not a
third length assertion — `:2031-2035` already asserts it).

**Dropped from v2** per CUT 2/3/4/5/6: hard anchor-uniqueness (its only measured effect on a real
edit is a FALSE red, and it is a same-diff hazard — a benign duplicate yields a harmless superset
that still parses the five rows; the diagnostic goes in the message instead); the self-consistent
count and every affinity assertion (a dropped *status* row already reds via `rust.get()` ->
undefined with a better message; affinity rows are a Rust concern the client does not consume, owned
twice in Rust by `validate_a11y_tokens` and `m23s8_forgery_shipped_pairs_are_pinned`); the 6-throw
`parseRustStatusTokens()` helper (co-location gives identical protection with no second
abstraction); the third `length <= 3` assertion; the byte floor (subsumed by the anchor check).

**2. `client/src/ui/battleModel.ts`** — comments only: `:34-35` (boy-scout 1: the `status` doc
re-lists all five literals — a sixth hand-copy a rename strands) and `:77-81` (point at the new
test). Boy-scout 2 (the warn text) is DROPPED — it only became stale because of the table; with the
switch kept, "update statusBadge in battleModel.ts" is still exactly right.

**3. `game-core/src/content.rs`** — comments only, ZERO code change. `:1621-1625` (now-false
"Nothing mechanically links the two") **same-lines-in/same-lines-out**; `:7513-7515` and
`:8064-8070` (NARROW "nothing else in the repo notices" to the affinity rows — do not delete the
clause) are below every inbound citation and unconstrained.

**4. `docs/adr/0240-*.md`** + `just adr-digest` regen of `docs/adr/DIGEST.md`. Four items only:
(a) the decision + what is now mechanized; (b) the ADR-0224:86-89 declared-exception justification,
which IS the ADR-0233:179-182 rebuttal (0224 retired `evals/*.eval.mjs` scanner SCRIPTS and
meta-checks, not vitest source reads — `client/src/main.wiring.test.ts:746-790` is live precedent);
(c) PARTIAL close + the registered derivation residual; (d) the accepted negative that `client/`
tests now require `game-core/` present (first cross-package read in `client/`).
`Extends: ADR-0233`, never `Amends:`. Subsystems from the fixed vocab (`content`, `client-ui`).
Do NOT touch `docs/adr/README.md`.

**5. Zero edits:** `battleView.ts`, `battleView.test.ts` (pinned as source text by
`evals/reduced-motion-hp-bar.eval.mjs`; nothing requires it), `ARCHITECTURE.md` (`:925-931` describes
A11Y-29 and nothing there becomes false), `docs/knowledge/**`, `CHANGELOG.md`.

## Final mutant register — 5 rows + 2 controls + 1 probe

| ID | edit | must RED | pre-slice |
|---|---|---|---|
| R01 | the four unpinned TS labels desynced one at a time (BRN/PAR/SLP/FRZ) | rb-55 parity | GREEN (measured) |
| R02 | `'PSN'` -> `'POI'` | rb-55 parity **and** `battleModel.test.ts:2201` | **RED pre-slice — recorded, not claimed as novel** |
| R03 | early-return interceptor above the switch (`if (tag === 'Sleep') return 'ZZZ';`) | rb-55 parity — proves the oracle is the FUNCTION | GREEN (measured) |
| R04 | `content.rs` `token: "PSN"` -> `"POI"` in the const | rb-55 parity (client); also reds Rust — scope the run, record both | Rust pre-covered |
| R05 | delete the Rust `status.freeze` row | rb-55 parity + `m23s8_shipped_table_is_valid` | Rust pre-covered |
| **C-A** | **CONTROL, stays GREEN:** `content.rs:7819` `token: "BR9"` -> `"XX9"` (struct form, outside the const) | client parity **GREEN**; a red here means the region slice leaked | n/a |
| **C-B** | **CONTROL, stays GREEN:** `content.rs:7517` `("status.poison","PSN")` -> `"POI"` (tuple form) | client parity **GREEN**; `m23s8_forgery_shipped_pairs_are_pinned` RED | n/a |
| **C-C** | **PROBE:** point `CONTENT_RS` at a nonexistent path (test-file edit, revert) | parity must RED, never pass — validates the slice-authored rethrow, not Node semantics | n/a |

## Gates

X1 parity bites — CHECK names the FILE and EXPECT pins `Tests  <N> passed (<N>)` with no `skipped`
token (measured: `-t` with zero matches exits **0**). X2 the Rust A11Y-29 suite is unchanged-green
after the comment edits (real value: content.rs ships self-source tests that COUNT signatures
file-wide). X3 the mutant register (MANUAL + path:line). X4 `just ci`.

## Deferral (the honest close)

Closes the **correlation** half of R-m23-s8-TSDUP (a drift is now CI-red). Does **not** close the
**derivation** half (the TS switch is still hand-maintained). DEFER the derivation to `backlog` with
the blocking seam named: a content table -> `spacetime generate` bindings -> the client subscription
set, which is exact-set-pinned by an eval outside `touches:`. Register AFTER the lenses.

## Open flags for the supervisor

- **ADR number:** assigned 239 is TAKEN by rb-54 (merged in 75e9719). Using **0240**.
- **ADR-0233:179-182** keeps a now-wrong sentence ("a mechanical link would be a text scan (retired
  by ADR-0224)"). `touches:` grants one NEW ADR only, so 0240 states the closure; 0233 is unowned.
