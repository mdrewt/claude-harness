# 20r-b plan — promote essence reward/cap into game-core; validator rejects unsatisfiable essence thresholds

Spec: `specs/monster-realm-v2/M-postgate-twentieth-review-residuals.spec.md` §20r-b (MED SSOT/content-safety, LIGHT).
Base: master `4ba39b5`. Worktree: `projects/monster-realm/.claude/worktrees/20r-b`, branch `feat/20r-b-essence-ssot`.
Gate ledger: `memory/projects/gates/20r-b.gates.md` (one seeded gate, B1). ADR number: none assigned — the record is a
self-amendment SECTION on ADR-0175 (ADR-0104 rb-43/rb-70 precedent), no new file. Plan reviewed by reviewer + red-team
(opus, parallel); their findings are folded in below (rule id R14, gate rewrite, roster additions).

## Triage
Small, one coherent increment (~380 net lines incl. tests). Routing: HARD tier per launch — tester opus; plan lenses
reviewer + red-team (opus, parallel, read-only; /simplify folded into the reviewer brief — verdict: nothing over-built);
implementation by the orchestrator (no `specialist` agent type exists in this harness; precedent m23-s9) — a different
agent than the tester; impl lenses reviewer + red-team + desync-guard + reducer-security-auditor in one batch, then
verifier; doc-keeper last. No fan-out-ineligible edits (no schema, no deps, no lib.rs).

## Decisions after plan review
- **Rule id is R14, not R13.** R13 is name-reserved by ADR-0176 D2 / ADR-0177:150 / `evals/evolution-content-integrity
  .eval.mjs:13` / `game-core/tests/eg3_evolution_graph.rs:531` for the never-built temporal-dominance guard — five
  present-tense claims in four files outside touches. R14 keeps every one true and needs no out-of-touches edit.
  Declared order == numeric order still holds (R12 then R14; the roster notes R13 as reserved).
- **Gate package name is `monster-realm-module`** (`server-module/Cargo.toml:2`); `just ci-fast server-module` cannot run.
- **Gate filter is module-anchored** so test naming cannot pad or hide the count; an alien pre-existing
  `r13_duplicate_party_monster_id…` test would otherwise match a bare `r13_` filter.
- **Consequence to record:** the cap stops being a free tunable — lowering `ESSENCE_SOFT_CAP` below a shipped `amount:`
  reds `sync_content` and panics a fresh-DB `init`. Shipped headroom: max authored amount 150. Retune order: content,
  then cap. `RETUNE:` markers on every literal boundary fixture; `raising_tests.rs:2167`'s "the only pin" wording goes
  stale (unmodifiable file) → residual `R-20r-b-B1`, registered after the impl lenses.

## File-by-file
1. `game-core/src/currency.rs` — after `battle_currency_reward` (line 32), before `#[cfg(test)]`:
   `pub const ESSENCE_BST_DIVISOR: u16 = 30;` · `#[must_use] pub fn essence_battle_reward(bst: u16) -> u32`
   (`u32::from((bst / ESSENCE_BST_DIVISOR).max(1))`, types unchanged) · `pub const ESSENCE_SOFT_CAP: u32 = 999;`.
   Doc comments (no fenced code — `ci-fast` runs doctests): EG2-7 3x-steeper rationale; cap = clamp at runtime
   (EG1-1) / reject at the content boundary (R14); the reward MAY exceed the cap (u16::MAX -> 2184) — clamping it
   would be a behaviour change; retune consequence. Module doc header (lines 1-4) gains one line: essence reward/cap
   also live here. No `lib.rs` edit (not in touches): consumers use `game_core::currency::…`.
2. `server-module/src/battle.rs` — delete lines 1120-1129 (const + fn); replace with a short `//` note +
   `pub(crate) use game_core::currency::essence_battle_reward;`. Do NOT re-export `ESSENCE_BST_DIVISOR` (no remaining
   consumer -> unused import -> clippy `-D warnings` red). The note must contain no `/*`, `*/`, `'"'`, raw-string
   opener or `pub fn` (rb81 whole-file bans in the untouched battle_tests.rs). Call site 1325 keeps the literal
   `grant_essence(&mut m, loser_species.affinity, essence_battle_reward(bst))` (battle_tests.rs:3003 source scan).
3. `server-module/src/raising.rs` — line-neutral 2-for-2 swap at 436-437: `//` note (why it sits mid-block: the
   knowledge pins `raising.rs#L627/#L674`) + `pub(crate) use game_core::currency::ESSENCE_SOFT_CAP;` (precedent
   raising.rs:42 `CARE_COOLDOWN_MS`; `//` not `///`, matching it). `grant_essence` untouched. `just knowledge-check`
   confirms; regen only if red (after fmt + commit).
4. `game-core/src/content.rs` — (a) doc roster: add the **R14** bullet after R12 (+ "R13 reserved" note); update the
   "R1-R12"/"R1 -> R12" wording in the fn doc + ordering comment; (b) rule body AFTER R12, before `Ok(())`: outer
   `for path in paths`, inner `for req in &path.essence`, `if req.amount > crate::currency::ESSENCE_SOFT_CAP` ->
   `Err("R14: edge {edge_id} requires {amount} {affinity:?} essence — above ESSENCE_SOFT_CAP {cap}; every essence
   grant clamps at the cap, so the gate is permanently unsatisfiable")`. Full path inline, no new import line; no
   server-module symbol named in the message. (c) Do NOT renumber historical `kills: content.rs:L:C` citations.
5. `docs/adr/0175-essence-graph-reducers.md` — follow-up (3) marked `**[CLOSED by 20r-b …]**` inline (follow-up (4)
   precedent) + `## Amendment (20r-b, 2026-09-18)` section. No header change -> `just adr-digest` is a deliberate NO-OP
   (digest is header-only, scripts/adr-digest.mjs:177-200); DIGEST.md will not change.
6. `ARCHITECTURE.md` — one targeted sentence at the currency.rs narration (~1287) and the R1–R12 roster (~1359).

## Test plan (tester, red-first; MUST NOT edit battle_tests.rs / raising_tests.rs / any non-test code)
Names MUST match the gate filter: currency tests start `essence_` or `prop_essence_`; content tests start `r14_`.
Hardcode expected values (never derive from the constant) except in the explicit coupling test.
currency.rs `mod tests` (8): `essence_battle_reward_floors_at_one_for_low_bst` (0,20,29,30 -> 1) ·
`essence_battle_reward_scales_at_the_steeper_divisor` (300->10, 318->10, 450->15) · `essence_bst_divisor_is_thirty` ·
`essence_battle_reward_at_u16_max_does_not_overflow` (65535 -> 2184) · `essence_battle_reward_may_exceed_the_soft_cap`
(2184 > 999) · `essence_soft_cap_is_999` (RETUNE) · `prop_essence_reward_floor_holds_for_every_bst` ·
`prop_essence_reward_is_monotone_non_decreasing`.
content.rs `mod tests` (11-12): reject 5000 naming R14 + edge id + 999 · accept 999 · accept 998 · reject 1000 ·
offender FIRST ([Water 5000, Fire 10, Plant 10] -> names Water; kills `.last()`) · offender LAST ([Fire 10, Plant 10,
Water 5000]; kills `.first()`) · three entries each at 999 accepted (kills sum) · second PATH over cap names ITS edge
(kills `paths.first()`) · 4 entries incl. 5000 -> R7 message, no R14 · tier-skip edge with 5000 -> R5 message, no R14 ·
coupling: `crate::currency::ESSENCE_SOFT_CAP` accepted, `+ 1` rejected · optional self-source pin that the R14 block
reads `ESSENCE_SOFT_CAP` and carries no bare `999` (needles assembled from parts, occurrence-counted).
Hand mutant register at verification: `.first()`-only, `.last()`-only, sum-based, bare-999 literal, R14-before-R7,
`>=`, missing outer loop — each must be killed by a named test.

## Ledger B1
CHECK: just ci-fast game-core && just ci-fast monster-realm-module && cargo fmt --all -- --check && just knowledge-check && git diff --exit-code $(git merge-base HEAD origin/master) -- server-module/src/battle_tests.rs server-module/src/raising_tests.rs && just adr-digest-check && grep -q '\*\*\[CLOSED by 20r-b' docs/adr/0175-essence-graph-reducers.md && grep -A60 '^## Amendment (20r-b' docs/adr/0175-essence-graph-reducers.md | grep -q 'validate_evolution_paths' && cargo nextest run -p game-core -E 'test(/^currency::tests::essence_/) + test(/^currency::tests::prop_essence_/) + test(/^content::tests::r14_/)' 2>&1
EXPECT: /^\s*Summary \[[^\]]*\] N tests run: N passed,/  (N re-pinned from the tester's measured `cargo nextest list`
count). Run from the worktree root with `--timeout 2400`. Exit codes are ignored by mr-gates — the `&&` chain is what
gives the non-nextest limbs teeth; do not reorder limbs.

## Anti-patterns
Re-export the divisor in battle.rs · touch lib.rs · edit either server test file (incl. the raising_tests.rs:1242
roster comment) · clamp the reward at the cap · reject amount == 999 · R14 before R12 · `is_err()`-only assertions ·
expectations derived from the constant (outside the coupling test) · grow/add an eval (ADR-0224) · change the
grant_essence( call spelling · fabricate a DIGEST.md diff · edit files outside touches · weaken a gate limb "to fix"
a red.

## Expected touches-delta
docs/adr/0175-essence-graph-reducers.md, ARCHITECTURE.md; docs/knowledge/** only if the line-neutral swap fails.
Not DIGEST.md. Follow-up flags (outside touches, not required): none forced by R14.
