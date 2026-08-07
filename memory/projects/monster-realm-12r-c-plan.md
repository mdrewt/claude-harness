# 12r-c — plan (post plan-review: planner + reviewer + red-team + /simplify)

**Slice:** `monster-dual-write` eval must recognise `pub(crate) fn` boundaries.
**touches:** `evals/monster-dual-write.eval.mjs` ONLY. Branch `fix/12r-c-dual-write-fn-boundaries`,
worktree `.claude/worktrees/12r-c`, from `origin/master` @ `5a051d9`.
**EARS:** E1 non-compliant `pub(crate) fn` after a compliant `pub fn` → gate RED (green today).
E2 real tree still passes.

## Adjudicated design

**D1 — boundary detection: column-0 anchored declaration scan, one regex LITERAL.**

```js
const FN_DECL = /^(?:pub(?:\([^)\n]*\))?[ \t]+)?(?:(?:const|async|unsafe)[ \t]+)*fn[ \t]+[A-Za-z_]/gm;
```

- Regex **literals** are house style in `evals/` (`trade-reducer-security.eval.mjs:99`,
  `bsatn-compat-smoke.eval.mjs:516`); only `new RegExp(<non-literal>)` is Semgrep-banned. Adopted
  from the `/simplify` lens — replaces a ~30-line hand-rolled char-walk with ~4 lines.
- `[ \t]` not `\s` → ReDoS-safe (bounded, distinct literal prefixes) and correct for a
  line-anchored declaration.
- `^` under `/m` matches at **offset 0** as well as after every `\n`. This fixes two latent bugs
  the marker loop had beyond the reported one: (i) `'\nfn '` can never match a declaration at
  offset 0; (ii) `splitIntoFnBodies:71-77` **silently discards everything before `markers[0]`**, so
  a non-compliant fn preceding the first recognised declaration is invisible today. → TEETH N.
- Qualifier allowlist `const|async|unsafe`, recognised **with or without** a preceding `pub`.
  The "only after `pub`" grammar is a demonstrated cheat (red-team F3: passes every other tooth
  *and* the real tree). → TEETH J covers bare forms.
- `extern "ABI"` and `default` **cut** (`/simplify` + reviewer): zero occurrences; `default fn`
  is nightly-only specialization and illegal on the pinned stable `1.96.0` (`rust-toolchain.toml`).
  → KNOWN LIMITATIONS.
- Preserve `return src ? [src] : []` on no-match (fail-loud, never vacuously green). → TEETH O.
- **Rejected:** any-indentation (19 embedded-Rust fixture strings across 9 `*_tests.rs` would plant
  boundaries inside string literals → future false RED; a local helper `fn` between a compliant
  fn's write and its mirror would bisect it). Brace-matched extraction (needs comment+string
  awareness first — a recorded scar; ~90 lines, blows the slice).

**D2 (REVISED — the plan-review changed this) — strip comments BEFORE splitting, fail-loud.**

Red-team found a **CRITICAL, no-adversary-required false GREEN** that the original plan's "do
nothing about comments" would have shipped: `stripLineComments` never touches `/* */`, spans are
matched with `.includes()`, so an ordinary FIXME block comment *mentioning* the mirror call cures
a real violation. PoC reproduced against a spec-correct col-0 implementation → `violations: []`
for a genuinely diverging `pub(crate) fn heal_tick`. This defeats the exact property the slice
exists to restore, in the same function, so it is in scope — not a follow-up.

`findDualWriteViolations` prepares once, before splitting:
`stripLineComments` → `stripBlockComments` → `splitIntoFnBodies`.

- **Order is load-bearing.** Raw tree: 14 `/*` vs 18 `*/` (unbalanced — every hit is `///` prose
  *describing* comment stripping). Block-stripping first would mis-eat. After line-stripping:
  **0 `/*`, 0 `*/`, and block-stripping is a 0-byte no-op on the real tree** → E2 provably
  untouched. → TEETH P asserts the ordering.
- **Fail loud on an unterminated `/*`** (a `/*` inside a future string literal would otherwise
  hollow out the rest of the blob = a silent gate-wide false green). Report it as a violation.
  → TEETH Q.
- `checkFnBodyDualWrite:105-160` is **not touched** (its own `stripLineComments` stays; idempotent).

**D2b — CUT.** Prod-only reader (`:368`, drop `*_tests.rs`) severed per `/simplify`: it changes
*what is scanned*, not boundary detection, and E1/E2 don't need it. Follow-up flag.

**D5 — NO ADR.** Repairs a detector, not a decision; ADR-0015/0072/0059/0010 all unchanged and
none describe boundary detection. No number was assigned and doctrine forbids self-assignment.
The "why" lands in the eval header + commit body.

**D6 — NO doc-companion edits.** `ARCHITECTURE.md:723` names the eval's CAPTURE_INSERT teeth but
never its boundary mechanics (not stale); `:1018` is a historical milestone row; `docs/knowledge/**`
grep for dual-write → 0 hits; no eval registry (`run.mjs` auto-discovers). Do NOT run `just knowledge`
(stamps `gitDate(schema.rs)`; no `.rs` touched). CHANGELOG is git-cliff generated.

## Teeth (tester writes; each kills a *distinct, demonstrated* wrong implementation)

Existing **A,B,C,D,E + well-paired sanity** must keep passing byte-identical.

| # | Fixture | Assert | Kills |
|---|---|---|---|
| F | compliant `pub fn` (update+pub-update+`pub_from_monster`) then non-compliant `pub(crate) fn` | ≥1 | **E1**. RED today (verified) |
| G | compliant `pub fn` then 4 non-compliant: `pub(crate)`, `pub(super)`, `pub(in crate::battle)`, `pub(in crate::economy)` | **=4** | literal-marker whack-a-mole; 3 distinct paren paths defeat a hardcoded-literal cheat (reviewer F2) |
| H | fully-compliant `pub(crate)` + `pub(in crate::npc)` fns | 0 | paren-scan corrupting a body |
| I | two file chunks joined by `'\n'` as the reader does; chunk2 opens non-compliant | ≥1 | cross-file absorption (the reported `use_battle_item` shape) |
| J | non-compliant `pub(crate) async fn`, `pub const fn`, `pub(crate) unsafe fn`, **bare `async fn`**, **bare `unsafe fn`** | **=5** | red-team F3 pub-gated-qualifier cheat |
| K | direct `splitIntoFnBodies` call: 1 real decl + col-0 decoys (`pub(crate) type Cb = fn(u32);`, `pub const H: fn(u32) -> u32 = h;`, `pub struct Fnord;`, a `where` continuation) | `length === 1` | a matcher that accepts `fn` in type position / without an identifier |
| M | REAL source: ≥1 span whose first line starts `pub(crate) fn ` | structural | a fix that passes synthetic fixtures but not real formatting. **No numeric count baseline** (rots) |
| N | non-compliant `pub(crate) fn` at **true offset 0**, then a compliant `pub fn` | ≥1 | the `markers[0]` leading-content drop + the offset-0 anchor gap (reviewer F1) |
| O | monster write with **zero** col-0 boundaries (all inside an `impl` block) | ≥1 | red-team F2 `return []` silent-skip cheat (passes A–K otherwise) |
| P | non-compliant fn + a `/* */` block comment naming the mirror call | ≥1 | red-team F1 CRITICAL false GREEN |
| Q | source with an unterminated `/*` | ≥1, message names the ambiguity | a `/*` in a future string literal hollowing out the blob |

## Tasks

- **T1 tester** — teeth ONLY (F,G,H,I,J,K,M,N,O,P,Q). Do NOT touch `:46-78`, `:105-160`, `:363-371`.
- **T2 orchestrator** — RED PROOF. `node evals/run.mjs`. Capture verbatim. Commit teeth-only.
- **T3 specialist** — `splitIntoFnBodies` (D1) + `stripBlockComments` + the prepare call in
  `findDualWriteViolations` + header/KNOWN LIMITATIONS. Never edits the teeth.
- **T4 orchestrator** — GREEN + 4 mutation bite-proofs (tester has no Bash).
- **T5** — parallel impl-review lenses → verifier → full `just ci` → PR.

## Anti-patterns
Literal-marker whack-a-mole · `new RegExp(<non-literal>)` · returning `[]` on no-match ·
editing `checkFnBodyDualWrite` · block-strip before line-strip · numeric span-count baselines ·
touching `evals/inventory-single-stack.eval.mjs` (same defect class, OUT of `touches:` → follow-up) ·
`just knowledge` · hand-editing CHANGELOG.

## Corrections to the defect report (for the PR body)
The spec says four `battle.rs` fns are absorbed by `pub fn use_battle_item`. Independently
re-derived with the *current* splitter: **seven** are absorbed (`write_back_party_hp`,
`essence_battle_reward`, `day_epoch_utc`, `is_wild_battle`, `write_back_battle_results`,
`is_ongoing_wild_battle`, `resolve_wild_battle_on_disconnect`), the span running to
`battle_tests.rs:42`; only two of them write the monster tables. The `evolution.rs` half of the
census (`apply_evolution`, `check_and_evolve` swallowed by `pub fn evolve`) is exactly right.
Span census: 734 → 828 (+94 = exactly the col-0 `pub(crate) fn` count), 0 violations before and after.

## Follow-ups (flag, do NOT touch)
1. `evals/inventory-single-stack.eval.mjs:75` — same splitter, 3 literal markers; misses
   `pub(super)`/`pub(in …)`/qualifiers. Out of `touches:`.
2. `stripLineComments` is not string-aware: a `//` inside a string literal sharing a line with the
   mirror call truncates it → false RED (pre-existing, `checkFnBodyDualWrite` frozen here).
3. Prod-only source reader (severed D2b).
4. Indented `impl`-block methods remain absorbed (documented limitation; no monster write lives in
   an `impl` block today — all 16 write sites are col-0 free functions, independently verified).
5. The col-0 anchor's safety rests on `cargo fmt --all --check` being CI-gated (`justfile:17`,
   `ci` dep at `:355`). Named in KNOWN LIMITATIONS.
