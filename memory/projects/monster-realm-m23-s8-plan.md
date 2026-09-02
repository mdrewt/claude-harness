# m23-s8 — plan of record (M23 S8, colour independence, A11Y-29)

Worktree `.claude/worktrees/m23-s8`, branch `slice/m23-s8`, from origin/master@09261b1.
ADR **0233** (assigned; 0232 highest on disk, verified 2026-09-02).

## Escalations — DECISION-DEFAULTED by the supervisor (spec §8), not parked
- **§8.1 colourblind palette -> default (a):** redesign the DEFAULT palette to be CB-safe for
  everyone. NOT an opt-in theme (that drags the M25 settings store into M23).
- **§8.2 canvas `ACTION_TINT` contrast -> default (a):** OUT OF SCOPE for M23 under the spec's own
  §3.1 partial-conformance declaration (1.4.11 non-text contrast). Tracked residual R-m23-s8-TINT,
  zero edits under `client/src/render/**`.

## F1 (decisive, VERIFIED) — no new file under `game-core/content/`
`evals/content-version.eval.mjs:31` `hashContentDir()` walks EVERY file under `game-core/content`
(not just `*.ron`) and compares SHA-256 to `evals/baselines/content-hash.json`, keyed to
`CONTENT_VERSION` in `server-module/src/lib.rs:75` (=21). Adding `a11y_tokens.ron` would force edits
to two files OUTSIDE `touches:`. The glob-registry form would additionally force `game-core/build.rs`.
=> The token SSOT is a **Rust const table in `game-core/src/content.rs`**, not RON. The DATA-mutant
requirement is preserved by making `validate_a11y_tokens(&[A11yToken])` take the table as a
PARAMETER, so the operator's demanded fixture ("an entry missing its token") is a data mutant of the
shipped table.

## Design
- `StatusKind` (`game-core/src/combat/ability.rs:39`) is a FIELDLESS mirror of `StatusEffect`, and is
  ALREADY imported by `content.rs:8`. It is the map key; `StatusEffect::Sleep{..}` never is.
- `content.rs:811-821` already carries the accepted precedent: an exhaustive no-wildcard `match` over
  `StatusKind`/`WeatherKind` inside `validate_content` as the ADR-0010/0095/0096 OCP gate. We mirror it.
- New surface in `content.rs` (all additive, no signature changes):
  `A11yToken{key,token}`, `A11Y_TOKENS` (5 status + 8 affinity = 13 rows),
  `status_token_key(StatusKind)`, `status_effect_token_key(StatusEffect)`,
  `affinity_token_key(Affinity)` (all exhaustive const fns, no wildcard),
  `status_kind_index(StatusKind)`, `STATUS_KIND_ALL`, `validate_a11y_tokens(&[A11yToken])`,
  and `const _: () = assert!(A11Y_TOKENS.len() == 13);`.
- **Reachability (not a decoy):** ONE line added inside `validate_content` (`content.rs:746`):
  `validate_a11y_tokens(A11Y_TOKENS)?;`. No signature change, so all ~22 existing call sites --
  including the real publish-time VALIDATE phase at `server-module/src/content.rs:61` -- exercise it.
- **Totality ladder, stated honestly:** a new `StatusEffect`/`StatusKind`/`Affinity` variant is a
  COMPILE error in `content.rs` (exhaustive const fns); the roster `STATUS_KIND_ALL` is
  TEST-forced by an index-bijection test; the token row is TEST+SEED-forced by the validator.
  Residual: `STATUS_KIND_ALL` membership is hand-maintained, exactly as `Affinity::ALL`
  (`monster/types.rs:28`) already is. Not overclaimed.

## DOM (§2.6) — audit result
- Status badge already carries a TEXT token (`battleView.ts:281` <- `statusBadge`), affinity is
  already TEXT (`battleView.ts:274`, `:299`). **No affinity badge exists and none is invented (YAGNI).**
- REAL defect found: `statusBadge` returns `''` on an unknown tag (`battleModel.ts:52-58`) and
  `monsterCard` does `... || null` (`battleModel.ts:196`), so `if (card.status)`
  (`battleView.ts:277`) DROPS the badge entirely -- a status becomes invisible, strictly worse than
  colour-only. Fix: visible fallback token, `console.warn` kept. Deliberately diverges from
  `weatherBanner`'s "identical contract" comment -- that comment is updated and the why is in ADR-0233.
- CB-safe palette: HP trio `battleView.ts:267` `#4a4/#aa4/#a44` is the CB-hostile red/green pair.
  MEASURED: `#4a4` L~=0.3039 vs `#aa4` L~=0.3770 => **1.21:1 greyscale contrast** -- indistinguishable
  without hue. Contract (tests COMPUTE, never pin hex literals):
  P1 each fill >= 3:1 vs the rendered bar track; P2 luminances strictly monotone in severity with
  every pair >= 1.5:1. P3 non-goal: no Brettel/Vienot dichromacy simulation (declared, not skipped).
- Status badge `#ff9` on `#553` computes to 7.33:1 -- already compliant; PINNED, not churned.

## Anti-patterns (named, from the plan)
1. Any second `hpFill.style` write or `cssText +=` (`evals/reduced-motion-hp-bar.eval.mjs:797`
   requires EXACTLY ONE total `.cssText =` site; binding must stay named `hpFill`).
2. The substrings `transition:` `transition-` `animation:` `animation-` `.animate(` `new Animation(`
   `KeyframeEffect` `setProperty(`+transition/animation, in COMMENT-STRIPPED `battleView.ts`.
3. Any `--custom-property` or inline animation on the fill.
4. Editing `client/src/styles.css` (S9's touch; its header says `:root` tokens are deliberately absent).
5. Disturbing `battleView.test.ts`'s RM3 needles: `RM3-HP-FILL`, `getAttribute('style')`,
   `fill.className`, `fill.getAttribute(`; and no `it.skip(`/`describe.todo(`/... spellings.
6. A validator that returns Ok on an empty table (vacuity). 7. A table nothing reads (decoy).
8. A hand-maintained roster with nothing forcing it. 9. An M24 i18n resolver / a11yCopy keys
   (§2.8 is scoped to accessible NAMES; §2.6 routes this through the CONTENT pipeline -> literals).
10. Inventing an affinity badge. 11. Changing `validate_content`'s signature (22 call sites).
12. Any new file under `game-core/content/` (F1). 13. Regenerating `docs/knowledge/**`
    (`just knowledge` projects server-module only; this slice touches none -> gratuitous gitDate restamp).

## Sizing
ONE slice, ships whole: ~130 lines Rust + ~230 lines Rust tests (in `content.rs`'s existing
`mod tests`), ~12 lines TS, ~180 lines vitest, one ADR. Disjoint from S9.

## Residuals
- **R-m23-s8-TSDUP** -> backlog. `battleModel.ts:39` `statusBadge` stays a hand-kept TS mirror of
  `A11Y_TOKENS`. A mechanical gate would be a text scan (ADR-0224-retired) or client-wasm codegen
  (out of touches). Narrowed by making the token VALUES byte-identical; recorded in ADR-0233.
- **R-m23-s8-TINT** -> tracked art ticket (§8.2 default (a)).
- **R-m23-s8-TITLE** -> S9/backlog. `battleView.ts:299` exposes skill affinity only via `btn.title`
  (mouse hover) -- a name/availability gap, not colour independence. Named, not fixed here.
- `client/tsconfig.json` excludes `**/*.test.ts` -> the new specs are NOT typechecked; oracles stay
  runtime-valued.

---

# PLAN-REVIEW RECONCILIATION (reviewer + red-team + /simplify, all three run 2026-09-02)

The plan above is SUPERSEDED on five points. Adjudications, with the measurement that forced each.

## R1 (red-team S1/S2, CRITICAL, MEASURED) — the totality ladder was a FICTION. REPLACED.
Measured in a faithful reconstruction: adding a 6th `StatusKind`/`StatusEffect` and a 9th `Affinity`,
then applying the minimal mechanical fix (5 one-line match arms), **compiled with zero errors** and
`validate_a11y_tokens(A11Y_TOKENS)` returned `Ok(())` — the exact scenario A11Y-29 forbids. Because:
(a) the hand-maintained rosters stayed at 5/8 so the required set stayed 13; (b) the index-bijection
test iterates the roster and so never visits the new variant; (c) `const _: () = assert!(len == 13)`
is silent on the omission AND becomes a compile error on the CORRECT fix. Separately, the three new
exhaustive const fns add ZERO new compile forcing: `Affinity::index()` (`monster/types.rs:44`),
`StatusKind::matches` (`combat/ability.rs:57`) and three `StatusEffect` matches in
`combat/status.rs:147,195,320` are already exhaustive no-wildcard gates today.

**REPLACEMENT — a serde-DERIVED roster. SPIKED AND MEASURED GREEN in this worktree:**
```
ron::from_str::<T>("ZzUnlikelyProbeVariant")
  -> Err(ron::Error::NoSuchEnumVariant { expected: &'static [&'static str], .. })
StatusKind   = ["Poison","Burn","Paralysis","Sleep","Freeze"]
StatusEffect = ["Poison","Burn","Paralysis","Sleep","Freeze"]
Affinity     = ["Fire","Water","Plant","Electric","Earth","Wind","Light","Dark"]
```
`ron` 0.8.1 is already a `game-core` dependency (`game-core/Cargo.toml:21`) and the list comes from
**serde's own derive**, not from a hand-kept array or a source scan. Adding a variant therefore grows
the probe's list MECHANICALLY, and the roster/token tests red until a token row exists. This is the
same class of oracle m22-s6 used (derive metadata, not a text scan) and is exactly what ADR-0224 wants.
The successor-chain device the red-team also PoC'd is DROPPED in favour of it: the chain is still
defeatable by writing two `None` arms, the serde probe is not defeatable at all.

## R2 (red-team S3, CRITICAL, MEASURED) — 8 forged validators passed all 8 planned tests; 5 also
survived the operator's demanded data mutant. Root cause: nothing forced the required key set to be
derived from the ENUMS rather than from `A11Y_TOKENS` itself. **Required design constraints:**
- `validate_a11y_tokens` derives its required key set by CALLING `status_token_key`/`affinity_token_key`
  over the rosters. `A11Y_TOKENS` MUST NOT appear anywhere in its body (kills F1/F7/F8).
- Key strings are written ONCE, in the key fns; the validator never re-literals them (/simplify §4).
- New tests that kill the survivors: `..._rejects_a_table_of_junk_keys` (13 rows keyed
  `junk.0..junk.12` -> Err; kills F3/F6/F7/F8); `..._rejects_an_orphan_row_that_replaces_a_required_row`
  (13 rows, kills F4 the prefix-census forgery); a test that derives the required keys IN THE TEST from
  the serde probe and asserts each is present in `A11Y_TOKENS` (kills F2's second hand-kept roster).

## R3 (red-team S4, HIGH, MEASURED) — the HONEST validator accepted an INVISIBLE token.
`token.trim().is_empty()` accepts U+200B ZERO WIDTH SPACE (category `Cf`, not whitespace under
`char::is_whitespace`; U+00A0 NBSP *is* and was correctly rejected). Also accepted a full set of 13
distinct all-ZWSP tokens, and accepted `"PSN"`/`"psn"` as distinct. **Fix:** validate with
`token.chars().all(|c| c.is_ascii_graphic())` + a length band (2..=4) + CASE-INSENSITIVE uniqueness.

## R4 (reviewer B1 AND red-team S5, both CRITICAL, both MEASURED) — the badge fix HOLLOWS a shipped
tooth. `client/src/ui/battleModel.test.ts:964` asserts `statusBadge(v.name).length > 0` over the
generated `StatusEffect.algebraicType` variants. Measured: with the default arm returning `''`,
deleting `case 'Poison'` REDS 2 tests; with the planned visible fallback, the same mutation is
**118/118 GREEN**. The plan was about to disarm the very device that answers residual R-m23-s8-TSDUP
(whose text — "a mechanical gate would be a text scan or client-wasm codegen" — is therefore WRONG;
the gate already exists at `battleModel.test.ts:953-975`). **Fix, all in-slice:** export the fallback
as a named const from `battleModel.ts`; in the m14.5d loop add `expect(badge).not.toBe(FALLBACK)` and
a `vi.spyOn(console,'warn')` zero-calls assertion; add `expect(statusBadge('NotAVariant')).toBe(FALLBACK)`;
update the now-stale comment at `battleModel.test.ts:930`. Put the end-to-end chain test in
`battleModel.test.ts` THROUGH `buildBattleViewModel` — `battleView.test.ts` imports `BattleViewModel`
as a TYPE only (`:32`) and hand-builds every VM, so a view-side test cannot exercise the defect chain
and would pass with the fix reverted.

## R5 (red-team S7/S8 + reviewer M4, HIGH, MEASURED) — the palette contract was fail-OPEN and P1 was
gameable. Measured in happy-dom: `.style.background` returns the raw hex verbatim (NOT a normalised
`rgb()`), but deleting the track's `background` returns `""` — and a reader defaulting `""` to black
turns the one failing fill (2.178) into a PASS (3.620). `NaN < 3` is `false`, so any negated
assertion passes for `""`, `"initial"`, `"firebrick"`, a gradient. `rgba(0,255,0,0.02)` parses
alpha-blind to P1=9.21 while rendering invisible. P2 goes vacuous at n<=1 (a `new Set` dedup or a walk
that finds nothing passes). And P1 alone is satisfiable by DARKENING THE TRACK with the CB-hostile
trio untouched (`#333`->`#111` takes 2.18 -> 3.25).
**Fixes:** (a) **DO NOT TOUCH the track at `battleView.ts:255`** — dropping that edit removes the
cheapest-green route entirely and avoids reviewer M4's silhouette problem (`#333` is only 1.20:1 vs
the player card `#1a2a1a`); LIGHTEN the fills instead. (b) the reader THROWS on any value that is not
`#rgb`/`#rrggbb` — never defaults. (c) assert positively with `toBeGreaterThanOrEqual`, never a
negated `<`. (d) anchor `colors.length === 3` and `new Set(colors).size === 3` BEFORE the pairwise
loop. (e) fixture percentages 95/35/5 (unambiguously inside the `>50`/`>20` bands at `:267`).
**Chosen palette (computed; tests recompute from the DOM and never pin these literals):**
healthy `#4a90d9` (L~=0.2641) · wounded `#f0aa44` (L~=0.4793) · critical `#ffe680` (L~=0.7941).
P1 vs the UNCHANGED `#333` track: ~3.78 / ~6.37 / ~10.2 (all >=3). P2 adjacent: ~1.69 / ~1.60;
extremes ~2.69 (all >=1.5), strictly monotone with severity. Blue->amber->pale-yellow is the axis all
three dichromacies preserve and eliminates the red/green pair outright.
**Honest residual, to be recorded in ADR-0233:** P2's 1.5:1 floor is a PROJECT threshold, half of
WCAG's 3:1 non-text minimum; a brute-force search found 68 palettes that pass P1+P2 while KEEPING
red/green hue coding, so P2 forces a real improvement but does not force hue-coding away. And the
three colours are never co-present (one at a time), so the load-bearing colour independence is the
numeric HP text at `:274` and the bar width — the palette is honest belt-and-braces, not the fix.

## R6 — smaller adjudications ACCEPTED
- **/simplify:** DROP `status_effect_token_key` (no consumer; `StatusKind` is documented as the
  content-facing key at `ability.rs:28-36`) — replaced by a test asserting the serde-derived variant
  name sets of `StatusKind` and `StatusEffect` are IDENTICAL (covers A11Y-29's `StatusEffect` wording
  mechanically and more cheaply). DROP `status_kind_index` and the bijection test (red-team measured
  it forces nothing). DROP the magic `13`. KEEP the `A11yToken` struct (house style: every content row
  in this file is a named struct; also transposition-safety across 13 same-typed literal rows).
- **reviewer M1:** `just mutate-core` is zero-tolerance whole-crate nightly (ADR-0050). Kills must be
  named per new fn: `status_token_key`/`affinity_token_key` -> `""`/`"xyzzy"` are killed because the
  validator LOOKS THE RETURNED KEY UP in the table, so the shipped-table-valid test reds.
  `validate_a11y_tokens -> Ok(())` killed by the rejects_* tests; `-> Err(..)` by shipped-table-valid.
  The serde probe helper lives inside `mod tests` so cargo-mutants ignores it.
- **reviewer M3:** the 8 affinity rows are consumed by nothing (the DOM already renders the affinity
  NAME as text at `battleView.ts:274`). KEEP them — A11Y-29 names `Affinity` literally — but ADR-0233
  MUST say they are deliberately unconsumed rather than leave a reader to discover it.
- **reviewer m3:** update `validate_content`'s doc comment (`content.rs:736-745`), which enumerates
  the function's checks and would otherwise become a lie. ADR-0233 records that the host is
  touch-set-driven (the repo idiom is a sibling validator called from `server-module/src/content.rs`,
  which is out of touches) and that `validate_a11y_tokens(A11Y_TOKENS)` is a CONSTANT-argument call,
  so it is honest reachability but NOT evidence beyond a `#[test]`.
- **red-team S10 (MEASURED):** `evals/spacetime-type-snapshot.eval.mjs` strips block comments with a
  naive non-greedy regex over concatenated `game-core/src/**`. A lone `*/` in a new doc comment in
  `content.rs` DROPPED `TrustTier` from the snapshot (drift=1) and reds with a message naming a
  server-module type. **ANTI-PATTERN #14: no `/*` or `*/` character pair in any new comment or string
  in `content.rs`.**
- **red-team S6 (MEASURED):** a new palette test in `battleView.test.ts` that names its local binding
  `fill` and calls `fill.className` / `fill.getAttribute('style')` SATISFIES the
  `[A11Y-RM3/delegate]` needle check for the whole file, so a hollowed RM3 describe ships green.
  **ANTI-PATTERN #15: the new tests must name their binding `fillEl` and must NOT contain
  `RM3-HP-FILL`, `getAttribute('style')`, `fill.className` or `fill.getAttribute(`.**
- **red-team S13:** `findInlineAnimationDecls` runs on comment-stripped STRINGS-INTACT source, so a
  user-facing STRING containing `transition`/`animation` also reds. Anti-pattern #2 extended.
  `rm3ResolveFill` (`battleView.test.ts:2765`) hard-asserts `card.children.length === 3`; a
  status-bearing VM reused through that walk false-REDs. The new tests use their own walk.
- **red-team S11:** the const table escapes `content-hash`/`append-only-ids` coverage. Mitigation: a
  `#[test]` PINNING the exact 13 `(key, token)` pairs, so a rename is a deliberate reviewed diff.
  Tradeoff recorded in ADR-0233.
- **red-team S12:** append the new surface immediately BEFORE `#[cfg(test)] mod tests`
  (`content.rs:1590`) so nothing above shifts; put the one-line call at the END of `validate_content`
  (which closes at `content.rs:911`), AFTER the `:824-834` region ADR-0172:20 cites.
- **reviewer m1:** F1's conclusion stands but its wording overstated — a new content file mechanically
  forces only `evals/baselines/content-hash.json`; the `server-module/src/lib.rs` CONTENT_VERSION bump
  is ADR-0073 discipline. Either way an out-of-touches edit is forced, so: no RON.
- **reviewer m6:** the unknown-tag path is unreachable in a same-checkout build
  (`battleModel.test.ts:958-961` pins 5 bindings variants). It is live only under deployed-server /
  stale-client-bundle skew — state THAT, not an unqualified "a status becomes invisible".
- **reviewer m7:** the fallback is `tag.slice(0,3).toUpperCase()` with a length cap, not a constant,
  so the badge stays informative. Reaches the DOM via `textContent` (`battleView.ts:281`) — no XSS.
- **red-team S9 (MEASURED) — ledger CHECK/EXPECT traps:** nextest prints its Summary on **stderr**
  (a CHECK without `2>&1` captures nothing); `, 0 skipped` is UNSATISFIABLE for a filtered
  `-p game-core` run (1104 tests are skipped); a zero-match filter exits 4 but `| tail` discards the
  code; vitest `-t` is a REGEX, so a title containing `(`/`)`/`[`/`]` runs ZERO tests and exits 0.
  All EXPECTs below are shaped accordingly and every vitest title is regex-metachar-free.
