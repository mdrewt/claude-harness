# rb-58 — plan (converged after planner + reviewer + red-team + /simplify)

**Slice:** rb-58 · `M-residual-backlog.spec.md#rb-58` · residual `R-m23-s8-postmerge-fallback`
(harness spec id) == `R-m23-s8-FALLBACK-COLLIDE` (`docs/adr/0233:195`). **Both names are real; do
not "correct" one to the other.**

**EARS defect:** the client fallback token has only 2 chars of entropy after its `?` prefix.
Subject: `client/src/ui/battleModel.ts:51-56`
`` return `?${[...tag].slice(0, 2).join('').toUpperCase()}`.slice(0, 3); `` — only the first two
code points drive the token, so `Confusion` and `Corrosion` both render `?CO`.

## 1. Decision — the derivation

```ts
let h = 0;
for (const ch of tag) h = (h * 31 + ch.codePointAt(0)!) % 1296;
return `?${h.toString(36).padStart(2, '0').toUpperCase()}`;
```

Two base-36 digits after `?` = **1296 tokens**, the information-theoretic maximum inside the
3-character budget that shipped tests pin (`battleModel.test.ts:2031-2035`, `:2079-2083`).

**Why this and not FNV-1a + `Math.imul` + avalanche fold + a private 36-char alphabet** (the
planner's first proposal): the reduction is applied *inside* the loop, so `h < 1296` and
`h*31 + cp < 1.16e6` — exact in a double. That removes, by construction:
- the **sign bug** the red-team measured in the FNV proposal (`h ^= h >>> 16` is a signed int32 op;
  `h % 1296` on a negative `h` is negative; `ALPHABET[negative]` is `undefined`, shipping
  `?undefinedundefined` — a 20-character badge — for **119 of 200** spread-corpus tags, invisible
  to the whole shipped suite);
- the alphabet constant (`toString(36)` is the stdlib table) and its whole mutant family;
- the trailing `.slice(0, 3)` — `padStart(2,'0')` makes the budget **structural**, not clamped;
- `toUpperCase()` length hazards — it now applies to `[0-9a-z]` only, never to `ß`.
Five magic numbers become two (`31`, `1296`), both self-explaining.

**Multiplier chosen by measurement**, not by lore. distinct/total (worst bucket):

| m | 17-name prefix corpus | 200 `StatusEffectVariantNumber<i>` | 1000 `Status<i>` | 676 `Xy` | 676 `AA..ZZ` | 300 realistic |
|---|---|---|---|---|---|---|
| **31** | **17/17 (1)** | **200/200 (1)** | **851/1000 (3)** | **676/676 (1)** | **676/676 (1)** | 258/300 (3) |
| 37 | 16/17 (2) | 200/200 | 422/1000 (5) | 676/676 | 676/676 | 266/300 (4) |
| 131 | 17/17 | 200/200 | 831/1000 | 484/676 (2) | 484/676 | 257/300 |
| 17 | 16/17 | 191/200 | 847/1000 | 451/676 | 451/676 | 272/300 |
| 257 | 17/17 | 200/200 | 890/1000 | 361/676 (3) | 361/676 | 269/300 |

`31` is the only candidate that is **injective on every 2-code-point ASCII tag** (`31*26 = 806 <
1296`) and top-of-table everywhere else. It is also the universally recognised polynomial
multiplier, so it needs no defending comment.

**Honest bound — the ADR must say this, never "unique":** 1296 slots ⇒ pairwise collision
1/1296 ≈ 0.077%; birthday P ≈ 1 − e^(−k(k−1)/2N) gives 0.77% at k=5, 3.4% at k=10, even odds at
k≈43. What changes is that collisions stop being **systematic on shared prefixes** (a certainty
today for `Confusion`/`Corrosion`) and become unpredictable. 1296 is the pigeonhole ceiling for the
budget, so **no residual is closable within it** — anyone wanting true uniqueness must reopen the
3-character *layout* budget, a different decision.

**Rejected:** (B) mnemonic initial + 1 hash char — does not close the class (same-initial pairs
still collide 1/36) and is unconditionally worse (1/936 > 1/1296). (C) widening past 3 chars —
shipped gating assertions. (D) confusable-safe 32-char alphabet — YAGNI, −21% space. (E) Web
Crypto — async, breaks the file's "no DOM, no SDK, no side effects" header contract. (F) "use more
positions" (first+last, first+length) — every such selection collides on a constructible pair.
(G) a golden value pin on the token: the value has **zero** consumers repo-wide (grep-confirmed —
no eval, e2e, snapshot, doc or server contract reads it), and the only mutants it uniquely killed
under the FNV proposal (seed / prime / alphabet rotation / digit swap) **do not exist** under this
one. Recorded as declared-benign CONTROLS in the register, not silent survivors.

**Accepted negative:** the mnemonic is lost — `?CO` hinted "starts with Co", `?HI` hints nothing.
Defensible because ADR-0233:196-198 states the badge's job is existence-proof, and the
human-readable channel survives: `battleModel.ts:81-83`'s `console.warn` carries the literal tag.

## 2. touches:

```
client/src/ui/battleModel.ts
client/src/ui/battleModel.test.ts        (sibling test file — always in scope)
docs/adr/0242-rb58-unknown-status-token-entropy.md   (reserved number only)
docs/adr/DIGEST.md                       (MANDATORY — evals/adr-digest.eval.mjs TOOTH 7 runs
                                          scripts/adr-digest.mjs --check inside `just eval`)
ARCHITECTURE.md                          (minimal, targeted)
```
Verified NOT required: `docs/knowledge/**` (`scripts/okf-export.mjs:40` roots at `server-module/src`
only); `CHANGELOG.md` (`justfile:305-309` — deliberately not in `ci:`, git-cliff nightly);
`game-core/**`; `evals/**`; `client/src/ui/battleView*.ts`.
Verified nothing outside the set pins the subject: `unknownStatusToken` occurs in exactly 3 files
repo-wide; `evals/dom-shell-coverage-exclusion.eval.mjs` matches a **fictional** `src/battle/`
fixture path; `evals/reduced-motion-hp-bar.eval.mjs` pins `battleView.ts`, not `battleModel.ts`;
no file anywhere hardcodes a literal fallback token value.

**Known hidden dependency, DEFERRED not touched:** `docs/adr/0233-…md:195-198` records this
residual as *"Accepted: … `Confusion` and `Corrosion` both render `?CO`"*. Every clause is false on
delivery. `docs/adr/**` is in scope for **the reserved number only**, so amending 0233 is outside
the grant → ledger gate **X4**, `DEFER -> backlog`. It bundles with the already-unowned
`ADR-0233:179-182` item the rb-55 handoff raised.

## 3. Test plan — 5 new `it`s in `client/src/ui/battleModel.test.ts`

Baseline measured: **122 passed (122)**. Target: **127**.

Fixtures (module-level, each with a length anchor at its use site):
- `RB58_CORPUS` — 17 non-curated status-like names: `Confusion, Corrosion, Curse, Curdle, Cruse,
  Xurse, Blight, Blightx, Blighty, Bleed, Petrify, Pestilence, Pestilent, Slow, Slime, Frostbite,
  Frenzy`. **Measured:** the 2-code-point transform collapses it to **8** buckets; the new
  derivation gives **17/17**. No member is a curated `StatusEffect` variant (verified), so every
  member reaches `statusBadge`'s default arm.
- **No `RB58_LEGACY`.** A reproduction of the deleted transform is a third, unfalsifiable
  transcription that an implementer can "repair" instead of the impl. The anti-vacuity anchor is
  stated as a **property of the corpus** instead, inline: `new Set(RB58_CORPUS.map(twoCp)).size ===
  8` with `twoCp` defined at the assertion.

| it | asserts | today |
|---|---|---|
| **T1** distinctness, through BOTH the helper and `statusBadge` | corpus length `=== 17`; anti-vacuity `Set(map(twoCp)).size === 8`; `Set(map(unknownStatusToken)).size === 17`; **`Set(map(statusBadge)).size === 17`**; and `statusBadge(t) === unknownStatusToken(t)` for **every** member (not just `'Curse'`) | **RED** (8) |
| **T2** every code point feeds the token | `('x'.repeat(299)+'y') !== ('x'.repeat(300))` — kills prefix-*k* for **every** k and drop-last; `'Curse' !== 'Xurse'` — kills a suffix-only derivation (measured: multiplier 36 collapses both to 353); `'AB' !== 'BA'` — kills an order-invariant sum; `'\u{1F600}' !== '\u{1F601}'` — kills `charCodeAt` for `codePointAt` (measured: both `?PP` under the mutant, `?5S`/`?5T` correct) | **RED** |
| **T3** total + structurally invariant | over `['', 'A', 'ß', '😀', '😀x', 'Curse', 'Confusion', 'x'.repeat(300)]` (length-anchored): `/^\?[0-9A-Z]{2}$/`, `length === 3`, `t === t.toUpperCase()`; `.some(/[A-Z]/)` anchor so the uppercase clause cannot go vacuous on a digits-only token; `''` case is the sole killer of a dropped `padStart`; determinism across 3 calls **and** across a `vi.resetModules()` re-import (kills a module-scope `Math.random()` seed, which 3-call determinism structurally cannot see) | **RED** on `''`, `'A'`, `'😀'` |
| **T4** pure function of the tag — no environment fork, no ambient entropy | reads `battleModel.ts`, extracts the `unknownStatusToken` body region, strips comments (with a positive control that the stripped region still contains `codePointAt`, so a blanked stripper cannot pass), asserts the region contains **exactly one** `return` and none of `import.meta`, `process.env`, `globalThis`, `Math.random`, `Date`, `crypto` | **RED** (region shape differs) |
| **T5** unseen tags spread across the token space | `fc.sample(fc.string({minLength:1}), {numRuns:300, seed:58})` — inputs **not written in the file**, so a lookup table fitted to the named corpora cannot pass; assert every sample matches the regex and `distinct >= 200` | **RED** (1 distinct) |

Regression-guard-only (already green, not the proof): uppercase-stability, `length <= 3`,
never-equal-to-a-curated-badge (structurally impossible — every token starts `?`), and every
shipped assertion at `:2031-2135`.

**Closed by design (each was a MEASURED CI-clean bypass of the first plan):** the `import.meta.env.PROD`
fork that vite tree-shakes back to the defect (→ T4); call-site truncation
`unknownStatusToken([...tag].slice(0,5).join(''))` in `statusBadge`'s default arm, which left the
helper honest and the badge colliding on `Pestilence`/`Pestilent` (→ T1's through-`statusBadge`
arm); prefix-truncation at k≥9, which the `Status<i>` corpus could not see (→ T2's suffix pair, and
the corpus rebuilt so members differ in the **suffix**); a 220-row lookup table fitted to the named
corpora (→ T5); a module-scope `Math.random()` seed (→ T3's `resetModules` clause + T4).

## 4. Anti-patterns to refuse

Re-implementing the transform in an assertion (tests only itself) · shrinking a corpus or
re-measuring a threshold to repair a red · widening `length <= 3` · any new `evals/*.eval.mjs` or
extra clause in an existing one (ADR-0224) · any new import in `battleModel.ts` (its header
contract is "No DOM, no SDK, no side effects") · repairing a SHADOW CENSUS red by widening the
expected array · editing `game-core/src/content.rs` (the fallback has no `A11Y_TOKENS` row; the
rb-55 "repair BOTH files" message is about *curated* drift) · "correcting" either residual id.

## 5. Boy-scout (in `battleModel.ts`, ≤3 hunks)

- `:41-49` doc comment — states a distinguishability property the code does not have and narrates a
  `Paralysis`→`PAR` slice-and-uppercase transform that will no longer exist.
- `:52-55` — the astral-surrogate and `'ß'.toUpperCase()` caveats become **false** (nothing slices
  the tag into the output; `toUpperCase` sees base-36 digits only). Carrying them is a lie about
  live code.
- `:36` — `` "?XX" `` in `BattleMonsterCardVM.status` implies two letters; the token can contain
  digits.
All three are rewrites of comments the change itself falsifies, so they are part of the change, not
discretionary cleanup. Not boy-scouted: drifted `battleModel.ts:NNN` citations in
`battleView.test.ts` / `e2e/monster-privacy.spec.ts` / ADR-0233 / ADR-0240 — all outside `touches:`.

## 6. Mutant register (proof-of-teeth) — ~10 rows + 3 controls

M1 pre-slice impl (**the RED half**) · M2 hash only the first 2 code points · M3 hash only `tag[0]` ·
M4 prefix-k truncation at k=9 · M5 drop the `?` · M6 shared constant `'?ZZ'` · M7 drop `padStart` ·
M8 drop `toUpperCase` · M9 multiplier 36 (suffix-only collapse) · M10 multiplier 1296 ≡ 0
(order-invariant) · M11 `charCodeAt` for `codePointAt` · M12 `statusBadge` default arm truncates the
tag at the call site · M13 `import.meta.env.PROD` fork · M14 module-scope `Math.random()` seed ·
M15 depth-0 early `return '?ZZ'`.
CONTROLS that must stay GREEN: C1 rename locals / reformat · C2 reorder the curated `case` arms ·
C3 multiplier `31 -> 37` (a **declared-benign output permutation** — no contract broken; recorded so
a future register author does not hunt for a tooth that should not exist).
