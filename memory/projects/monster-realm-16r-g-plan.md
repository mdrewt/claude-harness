# 16r-g — retire Bond/apply_care/CareError from game-core (plan)

Branch `feat/16r-g-retire-bond-apply-care` · worktree `.claude/worktrees/16r-g` · from `origin/master` @5f14fe2.
Spec: `specs/monster-realm-v2/M-postgate-sixteenth-review-residuals.spec.md` §16r-g. ADR-0177 D3 follow-up.

## Recon findings (blast radius — grep + codegraph index fresh)

Symbols to delete: `Bond(u8)` (+ `new`/`default_bond`/`value`), `apply_care`, `CareError`
(`AtMaxBond`/`NoEffect`), `CARE_BOND_AMOUNT`.

KEEP (still live, server-module consumes them): `CARE_COOLDOWN_MS`, `is_cooldown_ready`,
`focus_train`, `FocusTrainError`, `FocusTrainResult`.

Zero non-game-core Rust consumers. `server-module/src/raising.rs` already dropped them at
EG5/ADR-0177 D3 (only stale prose comments remain). No content RON `Bond(` triggers
(`EvolutionTrigger` no longer exists — essence graph replaced it). No `docs/knowledge/**`
references. No `mutants.toml` exclusion references. `evals/raising-reducer-security.eval.mjs`
scans **server-module** only — unaffected. game-core mutation gate is zero-tolerance and
nightly-only; deleting covered fns lowers the mutant count, never raises survivors.

## Edit list

Declared `touches:`
1. `game-core/src/monster/types.rs` — delete `Bond` struct + impl (~500-521); delete
   in-file test `bond_default_is_70` (~849-856) + its `--- Bond ---` banner.
2. `game-core/src/raising/rules.rs` — delete `apply_care` (86-94) + `CARE_BOND_AMOUNT`
   (96-101); drop `Bond` from the `monster::types` import and `CareError` from the
   `super::types` import; correct the module doc (lines 1-10 describe "care (bond raise)"
   and "max bond returns Err").
3. `game-core/src/raising/types.rs` — delete `CareError` (33-40).
4. `game-core/src/raising/mod.rs` — drop `apply_care`/`CARE_BOND_AMOUNT`/`CareError` from
   the two `pub use` lines; correct module doc line 1 ("and care (bond)").
5. `game-core/src/raising/m9a_gating_tests.rs` — delete Criterion-B block (~477-560),
   test e-1b `care_bond_amount_exact_value` (~1054-1065), the `apply_care` property block
   (~976-1010); **surgically** drop only the `apply_care` half of the mixed test
   `rules_are_deterministic` (~733-748) keeping its `focus_train` half; fix imports;
   correct the header doc (criteria list, red-state note).

`touches-delta:` (required; declared set under-enumerated the re-export sites)
6. `game-core/src/lib.rs` — crate-root re-exports: `Bond` (68), `apply_care`/`CareError`/
   `CARE_BOND_AMOUNT` (77-78). **Compile-required.**
7. `game-core/src/monster/mod.rs:28` — `Bond` re-export. **Compile-required.**
8. `game-core/src/monster/rolls.rs:~154-157` — doc comment asserts "`Bond::default_bond()`
   itself is still pinned by `types.rs::bond_default_is_70`, since raising still uses it",
   which my change makes false. Minimal comment correction only.

Always-in-scope companions
9. `ARCHITECTURE.md` — targeted corrections at :440 (`Bond` in the parse-don't-validate
   list), :742 (`CARE_BOND_AMOUNT` "lives in game-core/src/raising/rules.rs"), :994
   (`apply_care` game-core SSOT).
10. `docs/adr/0177-*.md` — record D3's delivered disposition. Run `just adr-digest`.

## NOT touched (follow-up flags, not this slice)
- `server-module/src/raising.rs:39-41,46-47` — comments say the symbols "remain in
  game-core as a named retirement follow-up"; now false. Different crate, outside
  `touches:`, and the file is residue-scanned by `raising-reducer-security`. Flag only.
- `evals/raising-reducer-security.eval.mjs` g8 residue scan could be extended to cover
  game-core so a re-introduction is gated. `evals/` is outside `touches:`. Flag only.
- Historical ADR prose (0059, 0073, 0143, 0176) — history, correctly left as written.
- `game-core/tests/eg3_evolution_graph.rs:547` — prose "Trust/Bond math", not a symbol.

## Tests
Spec: "compile + existing suite; no replacement tests needed." No new eval (adding one
would require `evals/`, outside `touches:`). Enforcement = the compiler + `clippy -D
warnings` + the existing suite. `tester` lens is still mandatory and its job here is the
**test-deletion audit**: prove every deleted test's only subject is a deleted symbol, and
that the mixed determinism test keeps its `focus_train` coverage.

## Risks
- R1 Over-deletion: the mixed `rules_are_deterministic` test loses its focus_train half.
  Mitigation: tester audit + verifier diff review.
- R2 Under-deletion: a residual symbol survives. Mitigation: post-impl grep for all four
  names across `game-core/src`.
- R3 Doc drift: ARCHITECTURE/ADR text left claiming the symbols exist. Mitigation: item 9/10.

---

## Plan review closed (planner + reviewer + red-team, 2026-08-22)

**Corrections adopted (all three lenses agree):**

- **HAZARD (planner, CRITICAL):** the draft's `477-560` Criterion-B range ends *inside*
  `focus_train_stat_at_cap_precedes_budget_exhausted` (fn at 560, banner 551) — a pure
  focus_train guard-order test that MUST SURVIVE. **Delete by test NAME, never by line range.**
- **Brace hazard (planner):** `apply_care_branch_and_value` is the sole occupant of the
  Criterion-B `proptest! { }` block (opens 979, closes 1021). Delete banner+block **975-1022**;
  cutting at 1010 severs the block mid-`else`. Do NOT confuse it with the Criterion-A
  `proptest!` block (818-973), which stays whole.
- **Orphaned doc block (planner):** `rules.rs` deletion range is **78-102**, not 86-101 —
  78-85 is `apply_care`'s doc comment. Leaving it orphaned above `CARE_COOLDOWN_MS` is the
  single most likely silent survivor.
- **Stale banner (red-team):** delete the `// CRITERION B — apply_care (example-based)`
  banner at **476-478** — by-name deletion leaves it sitting on top of the surviving
  focus_train test at 560.
- **Stale doc line (reviewer + red-team):** `m9a_gating_tests.rs:731` — the doc comment on
  `rules_are_deterministic` is at 731, OUTSIDE the "~733-748" edit range. Widen to 730-748:
  `/// Same inputs → same outputs for focus_train.`
- **ptc5e e-1 banner (reviewer + planner):** `m9a_gating_tests.rs:1023-1036` names
  `CARE_BOND_AMOUNT` three times (1024 title, 1026 RED-state, 1031 criteria list). Drop those
  three; keep every `CARE_COOLDOWN_MS` / `is_cooldown_ready` mention.
- **`rules.rs:6-8` exact rewrite (reviewer):** "Both rules are reject-not-clamp: a maxed
  target stat / exhausted EV budget / max bond returns `Err` … does NOT consume the food /
  burn the cooldown …" → singular, drop "max bond", drop "/ burn the cooldown" (that clause
  described `apply_care`). Lines 3-4 stay TRUE (`CARE_COOLDOWN_MS`/`is_cooldown_ready` survive).
- **`cargo fmt` after the re-export edits (planner):** `just ci` runs `cargo fmt --check` and
  the `pub use` brace lists in `lib.rs:66-79` / `raising/mod.rs:11-12` reflow.

**Exact doc wording adopted (reviewer):**
- `ARCHITECTURE.md:440` — delete `` , `Bond` `` from the value-object list.
- `ARCHITECTURE.md:742` — "magnitudes `CARE_BOND_AMOUNT`/`CARE_COOLDOWN_MS`" → "magnitude
  `CARE_COOLDOWN_MS`"; keep the `is_cooldown_ready` SSOT sentence intact.
- `ARCHITECTURE.md:994` — historical M9b summary: **annotate, do not excise** (matches the
  doc's own precedent at :740). Append a retired-status parenthetical.
- `ADR-0177` — **append to the existing bullet at line 214**, no new heading line (append-not-
  insert doctrine; zero inbound `ADR-0177:<line>` citations exist, keep it that way). D3's
  own prose (75-87) stays as written — it is a historical decision record.
  Header block unchanged ⇒ **`just adr-digest` regen NOT required.**

**Verified non-edits (do NOT widen the diff):**
`monster/types.rs` test mod uses a glob `use super::*` (no import edit) · no
`proptest-regressions/` seed file for m9a · no intra-doc `[Bond]` bracket links (no rustdoc
risk) · `Bond` has no `#[cfg_attr(feature = "spacetimedb", …)]` · no benches/examples/
client-wasm/`game-core/tests` code references · `.cargo/mutants.toml` clean ·
`evals/raising-reducer-security.eval.mjs` reads `SERVER_SRC = 'server-module/src'` only and
its g5 is satisfied by server-module's own `evaluate_care` — cannot red ·
`game-core/content/**/*.ron` `Bond(N)` comments are the long-deleted **EvolutionTrigger**,
and touching content forces a `content-hash.json`/`CONTENT_VERSION` regen — **HARD DO-NOT-TOUCH** ·
`docs/adr/DIGEST.md` + `scripts/backfill-adr-headers.mjs:297` carry a frozen ADR-0058 header
string containing `apply_care` — historical, DO NOT TOUCH.

**Scope rule applied to change-induced doc falsity:** fix statements my change makes
semantically FALSE inside `game-core/src/` (→ `monster/rolls.rs:155-157`); FLAG (do not
touch) line-number drift and cross-crate prose.

**Follow-up flags (NOT this slice):**
- F1 (red-team CRITICAL, dispositioned): **no CI-time gate enforces the EARS criterion.**
  game-core is a lib crate, so `pub` items are reachable roots and `dead_code` never fires;
  `just ci` stays green whether or not the symbols are actually deleted. Both other lenses
  ruled a new eval out of scope (`evals/` is outside `touches:`; spec says "no replacement
  tests needed"). **Compensating control THIS slice:** the verifier MUST run the residue
  grep, and the bypass checklist below is its acceptance list. **Follow-up:** extend
  `evals/raising-reducer-security.eval.mjs` g8's residue scan to `game-core/src` in a slice
  that owns `evals/`.
- F2 `server-module/src/raising.rs:39-41,46-47` — comments say the symbols "remain in
  game-core as a named retirement follow-up"; now false. Different crate, outside `touches:`,
  and the file is residue-scanned by g8. Flag only.
- F3 `game-core/tests/eg3_evolution_graph.rs:542` cites `game-core/src/raising/rules.rs:106`
  for the 6 h cooldown; deleting 78-102 shifts `CARE_COOLDOWN_MS` to ~81. Line-number drift
  in prose, no gate reads it. Flag only (prefer a symbol-not-line citation when fixed).
- F4 `docs/specs/A0-plan.md:88-91` — a superseded fusion-era Rust sketch calling
  `Bond::new(...)` / `a.bond.value()`. Not compiled, fusion is a deleted feature. Flag only.

**Bypass checklist for the verifier (red-team) — each produces a GREEN `just ci`:**
1. Delete only the tests, never the symbols. 2. Rename (`BondValue`, `legacy_apply_care`).
3. `#[cfg(test)]`-gate in place instead of deleting. 4. Feature-gate behind a new unused
Cargo feature. 5. Delete only the prose that mentions them.
⇒ acceptance = `rg -n '\bBond\b|apply_care|CareError|CARE_BOND_AMOUNT' game-core/src` returns
**zero**, AND the diff shows the definitions removed (not moved/renamed/gated).

**Boy Scout: ZERO.** Reviewer explicitly recommends none — the cap is consumed by the
necessary deletions + doc corrections. No `boyscout-delta:` in the PR.

**No new ADR.** ADR-0177 D3 already made and named this decision; this slice records the
delivered disposition. A new ADR would be YAGNI (planner + reviewer agree).

**Edit order (3-7 are ONE atomic unit — no green in between):**
1. `m9a_gating_tests.rs` (7 deletes by name + surgical `rules_are_deterministic` + imports +
   3 banners) → green. 2. `monster/types.rs` test + banner → green.
3. `raising/rules.rs` · 4. `raising/types.rs` · 5. `raising/mod.rs` · 6. `monster/types.rs`
   Bond struct+impl · 7. `monster/mod.rs:28` + `lib.rs:68,76-79` → **first green compile.**
8. `monster/rolls.rs:155-157`. 9. `cargo fmt`. 10. Docs. 11. `just ci`.

**Fast targeted gate:**
`cargo fmt --check` · `cargo clippy -p game-core --all-targets -- -D warnings` ·
`cargo nextest run -p game-core` · `cargo test --doc -p game-core` · `cargo check -p server-module`
