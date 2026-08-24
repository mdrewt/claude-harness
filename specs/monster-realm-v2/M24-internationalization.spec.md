<!-- CEREMONY COMPLETE 2026-08-23 — mr-feedback-doctrine.md §6 heavy ceremony
     (investigation -> 6-way ideation -> judge synthesis w/ attribution table -> adversarial review).
     This file is no longer a design sketch. The pre-ceremony sketch is preserved VERBATIM in §11. -->

# Spec: M24 — Internationalization (i18n)

**Status:** converged, implementation-ready (**CEREMONY COMPLETE**, 2026-08-23) · **Phase D** ·
**Design authority:** ADR-0033 `i18n-strategy` (harness design ADR, accepted 2026-06-24) — ELABORATED,
not amended. **Mechanism authorities:** **ADR-0006** (content-is-data / additive schema evolution — the
invariant this project enforces through `evals/battle-schema-snapshot.eval.mjs` and
`evals/bsatn-compat-smoke.eval.mjs`) **and ADR-0057** (`content-directory-glob-loading` — the loader in
`game-core/build.rs` that any locale-variant RON scheme actually extends, and the one that rules the
obvious schemes out; see §2.5 and the sketch's own 2026-08-23 Recency check in §11).
**Stack:** spacetimedb-game · **Project:** monster-realm ·
**Boundary:** ← **M23** every accessible name M23 writes is a catalog *key*; M24 swaps the resolver
behind `t()` with zero renaming (§2.4). → **M25** the security audit inherits §2.1's sink ban as a
standing invariant.


## 1. Problem / intent

Player-facing text is hard-coded English at 243 DOM-write sites across 31 client files, in 10 free-text
fields across 8 RON content registries, and in 84 `return Err("...")` reducer strings. ADR-0033
(`accepted`, 2026-06-24) chose keyed message catalogs for UI, locale-keyed RON for content, ICU-style
composition, default-complete + fallback + RTL, a hard-coded-string lint, and untranslated chat. This
ceremony converges that decision into an implementation-ready design. It **falsified three of the
sketch's own premises** along the way.

**Fact 1 — there is no chat system, so ADR-0033's chat plank defends nothing.** `grep message|Message`
over `server-module/src/schema.rs` returns zero hits; `player_conversation`
(`server-module/src/schema.rs:582`) is single-player NPC dialogue-*progress* state (a
`current_node_id: String`), private to its owner (ADR-0087). M22's ceremony made this identical
correction for its own milestone (`M22-privacy-compliance.spec.md:88-90, 658-660`). There is no
player-authored free text rendered anywhere in this client. The one real adjacent surface is
`set_profile_name` (ADR-0132) — player-chosen display names, which *are* user content and *are*
rendered (leaderboard, trade, PvP). "Chat is rendered safely but not machine-translated" is therefore
retired as vacuous and **replaced** by a criterion about the surface that actually exists: player display
names are never routed through the catalog and never translated.

**Fact 2 — "rides the ADR-0006 pipeline" is half the mechanism, and the other half forbids the obvious
design.** Content loading moved to directory-glob embedding in M8.9e (ADR-0057): `game-core/build.rs`
globs `content/<registry>/*.ron`, keeps only regular files whose extension is exactly `ron`
(`game-core/build.rs:74-81` — a `content/species/fr/` **subdirectory is silently skipped**), sorts by
filename byte-order (`:102`) and emits `<REG>_RON_PARTS`. `parse_parts`
(`game-core/src/content.rs:290-301`) then **unconditionally `.extend()`s every part** — there is no
merge, no override, no keying — and `validate_content` (`game-core/src/content.rs:746`) **rejects
duplicate ids** (`:753-756`, `:779`; teeth at `:1874`). So the intuitive `species.fr.ron` sibling with
the same ids fails instantly, and the intuitive `<registry>/<locale>/` subdirectory is not even seen.
ADR-0006 is the additive/content-is-data invariant; **ADR-0057 is the mechanism any locale-variant RON
scheme actually extends**, and it is the binding constraint. (Note: no project-side `docs/adr/0006-*.md`
file exists; 54 in-repo citations treat ADR-0006 as the invariant, whose enforcement lives in
`evals/battle-schema-snapshot.eval.mjs` and `evals/bsatn-compat-smoke.eval.mjs`.)

**Fact 3 — RTL is a pure DOM/CSS problem, and the CSS file does not exist.** Zero PixiJS
`Text`/`BitmapText`/`HTMLText` imports exist in `client/src` (only `Texture`, `Sprite`, `Application`,
`Container`, `Graphics`, `Renderer`), so nothing on the canvas needs bidi. But 100% of client styling is
inline `style.cssText`/`style="..."`, `client/index.html:2` is `<html lang="en">` with **no `dir`**, and
`client/src/styles.css` is specced by M23 §2.7 but **not built** — M23 converged the same day as this
ceremony. Inline `left:`/`margin-left:` cannot be flipped by a `dir` attribute.

Two further facts shape the scope. There is **no pluralization anywhere today** — zero `(s)` or
singular/plural branching; counts render as bare `${n}` with a unit glyph appended, so M24 *introduces*
plurals rather than repairing them. And there is **no locale-aware formatting in production code** —
`toFixed`/`toLocaleString`/`toLocaleDateString` appear only in three test files, and no relative-time
("3m ago") UI exists at all.

### 1.1 Ceremony corrections to the sketch's own premises (and to the investigation dossier)

**Corrections to the sketch / ADR-0033** (the sketch is preserved verbatim in the spec's §11 per the M22/M23
shape):

- **S-A. "Chat is rendered safely but not machine-translated" is void.** There is no chat system
  (dossier §A1). M24 must not carry the clause forward; ADR-0033's amendment (§8-4) should strike it. The
  adjacent thing that *does* exist is `set_profile_name` (ADR-0132), handled at §2.7.
- **S-B. "Rides the ADR-0006 pipeline" is half the mechanism** (dossier §A2) — the real loader is ADR-0057
  directory-glob embedding, whose concatenate-only `parse_parts` plus duplicate-id rejection is what makes
  the sketch's casual "locale variants in RON" a non-trivial design. M24 avoids the question entirely by
  §2.5; the future milestone inherits B2's arbitration of it.
- **S-C. "A new language is a data drop" is downgraded to "a typed drop."** §2.3 makes a locale a PR whose
  failure mode is a `tsc` error rather than a runtime blank — a stronger guarantee than the ADR promised,
  and the ADR should be amended to say so rather than left to read as unmet.
- **S-D. "RTL supported" is narrowed to text direction only** (§2.7). Layout mirroring is C6.
- **S-E. `validate_content` gains no default-locale check in M24** — the sketch's stated enforcement point
  is void because §2.5 puts no locale data in content at all. The enforcement moves entirely to §5's
  client-side gates.

**Corrections to the DOSSIER itself** (verified this session; the dossier invited exactly this):

- **11-A [material]. The dossier's "243 DOM-write sites across 31 files" is a test-inclusive denominator.**
  Reproducing the dossier's exact sink vocabulary yields 243/31 only when `*.test.ts` is included; excluding
  tests yields **169 sites across 19 files** (E5). Both numbers reproduce exactly, which is what identifies
  the cause. This matters because it propagated into three candidates: B1's "corrected 31-file scope", B3's
  "remaining 23-file surface", and B4's `HARDCODED_FLOOR = 150` (derived from 243). The enforceable scope is
  19 files and the floor is 169. The dossier's related claim that `DOM_SHELLS` "omits six files that also
  write DOM" is **correct and sufficient**: 13 text-bearing `DOM_SHELLS` entries + those 6 = exactly 19,
  which independently confirms the corrected count.
- **11-B [material]. The 320px constraint yields a ~47-character budget, not 29.** `client/index.html:118-119`
  states the previous **49**-character text measured ~323px; the live text is **38** characters (E8). B3's
  proposed 29-character budget would have failed the current English string and redded CI on `en` at HEAD.
- **11-C [material]. There is no mechanical oracle for the no-`innerHTML` discipline today.** Zero files
  under `evals/` contain the string `innerHTML` (E2); the rule lives in nine source comments and one unit
  test (`leaderboardView.test.ts:307` `RL13-xss`). The dossier documents the *culture* but not this gap, and
  the gap is what makes B6's F1 actionable rather than theoretical.
- **11-D [minor]. B6's F1 site list is incomplete and its threat dating is off.** 14 non-test `innerHTML =`
  sites exist, not 9; and only 3 assign markup while 11 assign `''` (E1). Separately, ADR-0033 *defers* the
  TMS rather than describing a live vendor write path (E10), so the "content authored outside the team"
  threat is prospective — it becomes live when §2.6's importer lands, inside M24's own scope, which is why
  the conclusion survives the correction.
- **11-E [minor]. `Err("` appears 100 times** across `server-module/src/*.rs` (E12); the dossier's 84 counts
  the narrower `return Err("` form. Either figure supports the same cut (C5), but the spec should cite the
  measured 100 so the follow-up milestone is scoped against the real surface.

**Falsifiable verdict — what would overturn this synthesis.** (1) If the operator answers §8-2 with a live
market requirement for localized creature names, §2.5's central scope cut is wrong and B2's design must be
built inside M24, growing it to ~13 slices. (2) If a `grep` of `shopView.test.ts` (§8-1) shows a test or CSS
rule depends on the `<li>` sites being parsed markup, S0's diff — though not its direction — changes.
(3) If a target browser in the support matrix ships a reduced `Intl` without `PluralRules` (B5's risk-3),
§2.3's runtime plural selection silently wrong-categorizes Russian and Polish, and the ICU-runtime decision
at §2.6 must be revisited. (4) If §5.2's `NON_TRANSLATABLE_CHARS` set proves to require more than ~5
additions across the full 169-sink migration, the default-fail rule is producing unacceptable friction and
should be re-examined — though the direction of failure would still be the safe one.

## 2. The converged design

**M24 localizes the client's own chrome and nothing else, and it does so by making the catalog a
compile-time-total TypeScript module whose values can never reach an HTML-parsing sink — because the last
three HTML-parsing sinks in the codebase are deleted in M24's first slice, before a single string is
externalized.** Concretely: (i) the ICU question is settled as *ICU is the interchange format, never the
runtime format* — messages are per-message TS functions over `Intl.PluralRules`, and a small
`scripts/catalog-export.mjs` round-trips the catalog to and from ICU-syntax JSON so every TMS on earth can
ingest it, which is what ADR-0033's word "ICU-style" actually needs and is the only reading compatible with
ADR-0055's dynamic-`RegExp` ban; (ii) **M24 does not localize content-registry text at all** — no
`locale` column, no `locale_strings` registry, no `CONTENT_VERSION` bump, no `game-core`/`server-module`
change of any kind, because B2's off-row side-table is *wholly additive by construction* and therefore
costs exactly nothing to defer, while building it now costs four slices, a schema-snapshot append, a
`CONTENT_VERSION` bump and a redesign of the one eval whose *assumption* changes, all for zero benefit at
zero non-English players; and (iii) M23's brace ban is neither relaxed nor merged — `t(key): string` ships
byte-identical to M23's contract and a new `tf(key, params)` is the only parameter-carrying resolver, with
the `a11y.*` namespace structurally barred from it. **M24 is a client-only milestone. Its `touches:` sets
never enter `game-core/`, `server-module/`, or `client/src/styles.css`.**

---

### 2.0 The central decision, elaborated

Four independent constraints force the same shape, and every one of them is verified rather than asserted:

1. **ADR-0055 bans dynamic `RegExp` (E10-adjacent; dossier §E).** An ICU MessageFormat runtime is a grammar
   parser. B5 is right that hand-rolling one is real engineering cost and honest to say so — but B5's
   decisive argument ("a bespoke per-message convention reliably rewrites at Russian/Polish/Arabic") lands
   squarely on **B1's** proposal (`branching on n === 1 at the call site`, which is structurally incapable of
   four categories) and **not** on **B3's** (`selectPlural(locale, n, forms: Record<Intl.LDMLPluralRule,
   string>)`, whose parameter type is the *complete* CLDR category union and which therefore fails to compile
   if a Russian catalog omits `few`). The type system does the generalization B5 correctly demands that a
   hand-rolled switch cannot. So the practitioner objection is *satisfied*, not overridden.
2. **ADR-0033 says "ICU-style" and "a new language is a data drop" (E10).** Deviating from an accepted ADR
   needs an amendment, not silence. The synthesis satisfies the letter of it by making **ICU JSON the
   export/import format of record** (§2.6) — the vendor genuinely receives ICU `plural`/`select` and genuinely
   ships it back — while the *runtime* stays a typed TS module. The amendment (§8-4) records that the "data
   drop" is a *typed* drop: a new locale is a PR whose failure mode is a `tsc` error rather than a runtime
   blank. That is strictly stronger than what the ADR promised, and the ADR should say so.
3. **The catalog is engineer-authored TS in M24 but vendor-fed the moment §2.6's importer lands** — inside
   M24's own scope. B6's F1 threat model therefore becomes live within this milestone, which is precisely
   why the sink must be closed here rather than deferred (§2.1). B6 slightly overstates the threat as
   "exploitable today" (E10: ADR-0033 *defers* the TMS, it does not describe a live vendor write path); the
   correction does not weaken the conclusion, it dates it.
4. **M23 is unbuilt and owns `styles.css` (E9).** Any M24 design that writes CSS collides with a file whose
   content rules are already pinned by another spec. §2.8 removes the collision by construction.

### 2.1 Sink elimination — F1, RESOLVED (the mechanism, not a citation)

**Finding, corrected.** B6's F1 is *substantively correct and materially incomplete*. There are 14 non-test
`innerHTML =` sites, not the 9 B6 enumerates: it missed `shopView.ts:105,110,118`, `healView.ts:22` and
`dialogueView.ts:30`. It also conflates two categories that need different treatment: **3** sites assign
literal markup, **11** assign `''` as a clear (E1). And E2 is the finding that actually settles the
argument: **no eval in the repository mentions `innerHTML` at all.** The XSS discipline that nine source
files describe in comments and one unit test (`RL13-xss`) exercises has **zero mechanical CI oracle**. B1,
B2 and B3 each proposed a gate that classifies a call site's RHS and is by construction blind to the
destination; B6 is right that `list.innerHTML = t('shop.empty')` passes all three.

**The closing mechanism (adopted, corrected, and narrowed):**

**(a) Delete the sink, do not guard it.** In **S0**, before any catalog exists:
- the 3 markup sites (`shopView.ts:104,115,123`) become `document.createElement('li')` +
  `li.textContent = '…'` + `replaceChildren(li)`;
- the 11 clear sites (`shopView.ts:105,110,118`; `tradeView.ts:83,84,85,111,154`; `questLogView.ts:22`;
  `healView.ts:22`; `dialogueView.ts:30`) become `el.replaceChildren()`.

Converting the clears is not cosmetic tidiness — it is what makes the gate a **pure sink-vocabulary check
with no RHS exception whatsoever**. A gate that must permit `innerHTML = ''` needs an RHS predicate, and an
RHS predicate is exactly the thing F1 proves cannot be trusted. Zero exceptions is what kills the vacuity.

**(b) `evals/i18n-no-html-sink.eval.mjs` (new)** asserts **zero** occurrences of `.innerHTML =`,
`.outerHTML =`, `insertAdjacentHTML(`, `document.write(`, and `Element.setHTML(`-shaped calls anywhere in
`client/src/**/*.ts` excluding `*.test.ts`, matched **on the sink alone, independent of RHS shape**.
Comments are removed first via the `stripComments` **imported** from
`evals/dom-shell-coverage-exclusion.eval.mjs` (no third stripper — the dossier's §E idiom), which is what
keeps the nine explanatory comments that contain the word `innerHTML` from false-positiving.
B6's own risk-1 (getter reads) is **discharged by measurement, not by argument**: all 14 live occurrences
are assignments (E1); the matcher nevertheless requires the `=` token so a future legitimate getter read
does not red the gate.

**(c) Defence in depth for the vendor path.** The importer of §2.6 writes into `catalog.<locale>.ts`, a
`tsc`-checked file landing through a reviewed PR. So a vendor-supplied string passes a type gate and a human
gate *and* has no HTML-parsing sink to reach. Three independent barriers, each of which is stated as
load-bearing so that removing any one is a visible spec change.

**Rejected here:** B6's proposed `evals/i18n-displayname-not-catalog.eval.mjs` (new). It is redundant and, worse,
*self-contradictory with the corrected F2 rule*: that rule (§2.2) forces `leaderboardView.ts:57` to become
a `tf()` call, which B6's gate would then fail. The genuine hazard B6 names — a translator-controlled
formatting function wrapping a player name — is closed by (a)+(b)+(c) plus §2.7's `<bdi>` rule, without a
gate that forbids the very migration the milestone requires.

### 2.2 The extraction classification rule — F2, RESOLVED

**Finding, confirmed.** B3's rule is self-refuting exactly as B6 states. E3: `Lv` is a 2-character run, so
B3's "alphabetic run of ≥3 chars" **passes** the very site B3 nominates as its proof-of-teeth fixture. E4
extends the falsification: `W` and `L` in `leaderboardView.ts:57` are 1 character each, so **B6's own
proposed fix** ("drop the threshold to ≥2, plus an allowlist entry for `W`/`L`") is *also* wrong-shaped — an
allowlist of *translatable* abbreviations grows without bound and defaults every unlisted token to PASS.
Both the original rule and the proposed repair fail in the same direction: they default to permitting.

**The corrected rule (adopted): DEFAULT-FAIL CHARACTER INVERSION. There is no length threshold at all.**

For each sink RHS that is a template literal, decompose into STATIC segments (the text outside every `${}`
boundary, using the `stringMask`/`stripStringLiterals` cursor pair from `client-no-pii-logs.eval.mjs` with
its `unterminated` fail-loud flag). Scan each static segment **character by character**. A segment is CLEAN
iff **every** character is a member of the closed set

```
NON_TRANSLATABLE_CHARS = whitespace ∪ digits 0-9 ∪ { · × ‰ % / : ( ) [ ] , . - — + # ° ' " }
```

**Any** character outside that set — including a lone `W`, `L` or `v` — fails the segment, and one failed
segment fails the sink. A bare string literal RHS is treated as a single static segment by the same rule.
This is B3's own stated principle ("excluded STRUCTURALLY, not by content-classification") applied
consistently instead of only to the attribute-name axis, and it is the inversion B6 correctly identified
but left under-specified.

Verified against the real corpus:

| Real line | Static segments | Verdict | Correct? |
|---|---|---|---|
| `battleView.ts:212` `` `Lv${card.level}` `` | `Lv` | **FAIL** | yes — the intended catch, now actually caught |
| `leaderboardView.ts:57` `(W${w}/L${l})` | `— `, ` (W`, `/L`, `)` | **FAIL** | yes — B3 and B6's fixes both miss this |
| B3's GOOD fixture `` `${a} · ${b}` `` | ` · `, ` ` | **PASS** | yes — the glyph allowlist survives intact |
| `battleView.ts:228` `` `HP ${cur}/${max} · ${aff}` `` | `HP `, `/`, ` · ` | **FAIL** | yes — "HP" is translatable |
| `boxView.ts:123` `` `Slot ${i}: (empty)` `` | `Slot `, `: (empty)` | **FAIL** | yes |
| `battleView.ts:332` `` `${b.name} (+${n}‰) ×${c}` `` | ` (+`, `‰) ×` | **PASS** on glyphs alone | correct-and-insufficient — see below |

The last row is the honest residual and it is B5's point 7 vindicated: a glyph-only composition passes the
lint while still being unreorderable for a locale that needs `×count (+bonus‰)`. The lint cannot detect
this; **it is tier (e)** and lands in the manual checklist (§5.6) as "compound data rows reviewed for
reorderability", never reported CI-green.

**Cost of this rule, named:** a genuinely untranslatable alphabetic token (a SI unit such as `m` or `s`)
must either move inside `${}` as a catalog-owned constant or be added to `NON_TRANSLATABLE_CHARS` by an
explicit reviewed PR. The set grows only by review and the failure direction is *toward* extraction. That
is the correct direction; a heuristic that defaults to PASS is not.

**Scope correction (E5/E6/E7).** The lint's file scope is the **19** non-test files of E6, not "31" (B1) and
not "23" (B3). `DOM_SHELLS`' 4 render/net entries write no player-facing text and are excluded by name with
that reason recorded. The anti-vacuity floor is derived from the **non-test** denominator: `SINK_FLOOR = 169`
(E5) as a two-way pin — if the scanner sees fewer than 169 sinks it has stopped seeing the tree and fails
loud. B4's `HARDCODED_FLOOR = 150` was derived from the test-inclusive 243 and is superseded (§11-C).

### 2.3 The catalog and the resolver

- `client/src/ui/i18n/messageIds.ts` **(new)** — the SSOT. `export type MessageId = …` (a literal union,
  mirroring `OverlayId`), plus `export type MessageParams = { readonly [K in ParamMessageId]: … }` and
  `export type PlainMessageId = Exclude<MessageId, ParamMessageId>`.
- `client/src/ui/i18n/catalog.en.ts` **(new)**, `catalog.fr.ts` **(new, S7)** —
  `export const CATALOG_EN: Catalog = { … }` where
  `type Catalog = { readonly [K in MessageId]: K extends ParamMessageId ? (p: MessageParams[K]) => string : string }`.
  **Omitting a key from any locale is a `tsc` error** (mapped-type totality), and a *wrong parameter set* is
  likewise a `tsc` error. This is B3's contribution and it is the ceremony's best answer to "what does a
  missing key do at runtime": it never reaches runtime.
- `client/src/ui/i18n/resolver.ts` **(new)** —
  `export function t(key: A11yKey | PlainMessageId): string` — **signature byte-identical to M23 §2.8**;
  `export function tf<K extends ParamMessageId>(key: K, params: MessageParams[K]): string` — the **only**
  parameter-carrying resolver. `A11yKey` is barred from `tf`'s domain **by the type**, not by a runtime flag.
- `client/src/ui/i18n/plural.ts` **(new)** —
  `export function selectPlural(locale: string, n: number, forms: Readonly<Record<Intl.LDMLPluralRule, string>>): string`
  and `export function fmtNumber(locale: string, n: number, opts?: Intl.NumberFormatOptions): string`.
  Per the 2026-08-23 unstable/beta ruling (dossier §G), `Intl.PluralRules`/`Intl.NumberFormat` are used as
  intended and not reflexively avoided. `Record<Intl.LDMLPluralRule, string>` is *total over CLDR*: a Russian
  catalog omitting `few` does not compile.
- **Every catalog entry carries a `// @desc:` line** (B5's point 2), machine-checked by §5.4 — the datum a
  translator needs to disambiguate a count without pinging engineering.
- **Keys are semantic, not source-derived** (B5's point 1): `<namespace>.<screen>.<element>`, e.g.
  `battle.hpLine`, `shop.emptyForSale`, `leaderboard.row`. A reworded string with changed meaning gets a
  **fresh key**; the old one 404s loudly in §5.3 rather than silently serving a stale translation.

### 2.4 The M23 seam — brace ban RESOLVED

**B6's F4 is correct and is adopted as the resolution.** `[A11Y-02]` bans `{`/`}` in the **key**
(`/^a11y\.[a-z0-9.]+$/`), not in resolved copy, and M23 contractually enumerates `a11y.count.one` /
`a11y.count.other` so a11y strings are **zero-arg by construction**. B1's "live contradiction" is therefore
not live: it was answerable from the dossier citation B1 itself quotes.

**The rule:** `t()` unchanged; `tf()` never accepts an `a11y.*` key (enforced by the type *and* pinned
mechanically at §5.4 `[I18N-SHAPE-04]` so the guard cannot erode); `[A11Y-02]` is **not relaxed, not
scoped-away, not flagged**. `a11yCopy.ts` stays exactly as M23 specs it and becomes one **input** to the
resolver's key union — no rename, no merge, no restructure. **The one soft ask on M23** (B3's, adopted, it
costs M23 nothing): export the record as a named `A11Y_COPY_EN`.

**Rejected:** B1's merge into one flat `Record<string,string>` (destroys mapped-type totality, the single
strongest property in the design). B4's `hasIcuArgs` boolean (a flag is *data*; a separate function is a
*type* — the type cannot be forgotten at a call site). B5's two-resolvers-behind-one-`t()` with
runtime prefix dispatch (exactly the implicit-typing footgun this repo's culture avoids, and it discards
`t()`'s M23-pinned return type).

**F5 (a11y plural in a 4- or 6-category language), arbitrated:** B6's build-time `a11yPluralSource.ts` +
`scripts/gen-a11y-plural-keys.mjs` expander is **CUT**. It is a generator script plus a third eval built for
a requirement that does not exist — M23 is unbuilt and enumerates two forms. What M24 ships instead is the
*pin*: `[I18N-SHAPE-04]` proves no `a11y.*` key ever reaches `tf()`, and the manual checklist records
"a11y counts are English-enumerated only". **Named future cost:** the first a11y label that needs a count in
Russian or Arabic must build B6's expander as its own scoped work (~1 slice + 1 eval); it cannot be smuggled
in as a catalog edit, because the pin will fail.

### 2.5 Content text — M24 DOES NOT LOCALIZE CONTENT. Stated explicitly.

**Answer to the ceremony's explicit question: no. M24 localizes no content-registry text whatsoever.**
Species, skill, item, ability, shop, zone and quest names, item descriptions, and all dialogue text ship
**English in every locale**. No `locale` column, no `locale_strings` registry, no `locale_string_row` table,
no `CONTENT_VERSION` bump, no `validate_content` change, no dialogue codegen, no `game-core/` or
`server-module/` edit of any kind. **B5's scope split is adopted as the milestone's shape.**

Three verified reasons, in order of force:

1. **Deferral is free because B2's mechanism is additive by construction.** B2's own strongest argument —
   the side table is *wholly* additive, `battle-schema-snapshot` sees a new table as an append, and
   `bsatn-compat-smoke` carries zero risk because no existing row shape changes — is precisely the property
   that makes building it *now* unnecessary. Nothing about M24's client design forecloses it. The cost of
   deferring is zero structural debt; the cost of building is S2+S3+S4+S5a, a `CONTENT_VERSION` 21→22 bump
   with a regenerated hash baseline (E11), a schema-snapshot append, and — B2's own admission, B6's F6 —
   a redesign of `dialogue-client-integrity.eval.mjs`, *the one gate whose assumption rather than baseline
   changes*, which B2 leaves as an unspecified escalation.
2. **B1's alternative is a correctness hazard, and this is decided, not merely deferred.** A `locale`
   column on `SpeciesRow` makes a table with eight locale-irrelevant columns locale-dependent, so every
   reducer doing `species_row().id().find()` for damage calculation or evolution gating must reason about
   "which locale's row did I get" — for zero benefit, since none of that logic reads `name`. **B2's
   argument (b) is adopted as a permanent prohibition** recorded in the ADR-0033 amendment (§8-4), not as a
   scheduling preference. When content localization is scoped, it takes B2's off-row shape, with B2's
   **R-L4** (a `locale: "en"` row is rejected outright — two English sources of truth is the bug) and B2's
   derived `"<registry>.<id>.<field>"` key form, and it must confront B5's counter-argument (an id-derived
   key silently orphans a translator's work when a row is split) at that time. **These decisions are
   recorded normatively so the future milestone inherits the arbitration rather than re-running it.**
**Why the two obvious locale-RON schemes were ruled out on mechanism, not on taste — ADR-0006 is the
invariant, ADR-0057 is the loader.** ADR-0006 is this project's content-is-data / additive-schema
decision, enforced today by `evals/battle-schema-snapshot.eval.mjs` and `evals/bsatn-compat-smoke.eval.mjs`
(tail-append plus a typed `#[default(...)]`, not merely `#[serde(default)]`). But content *loading* moved
to directory-glob embedding in M8.9e under **ADR-0057**, and that is the mechanism any locale-variant RON
scheme actually extends. Read against `game-core/build.rs`, ADR-0057 forbids both intuitive schemes
outright:

- **A `content/<registry>/<locale>/*.ron` subdirectory is never seen.** `game-core/build.rs:74-81` keeps
  only entries that are regular files whose extension is exactly `ron`; a directory named `fr` has no
  extension, so it is silently skipped and the locale rows simply never exist. Silent, not loud — the
  worst failure shape this repo has.
- **A `species.fr.ron` sibling file fails immediately.** It *is* globbed (extension `ron`), sorted into
  `SPECIES_RON_PARTS` by filename byte-order (`game-core/build.rs:102`), and then
  `game-core/src/content.rs:290-301` `parse_parts` unconditionally `.extend()`s it — there is no merge, no
  override, no keying — so `validate_content` (`game-core/src/content.rs:746`) rejects it on the duplicate
  species id at `:753-756` (teeth: `:1874`).

So "a new language is a data drop riding the ADR-0006 pipeline" is only half true, and the half that is
missing is the half that constrains the design. **Any future content-localization milestone must be
written against the ADR-0057 glob loader**, and — per §2.5-2 above — must use B2's off-row shape, because
neither ADR-0006's additivity nor ADR-0057's determinism rescues a locale variant that collides on id.

3. **Proper nouns are the class the industry most often does not translate at all** (B5, §7), so localizing
   creature names is a product decision with its own budget — escalated (§8-2), not assumed.

**Named future cost of this cut:** a French player sees a fully French UI wrapped around English monster,
skill and item names, and fully English NPC dialogue. That is a *legible, coherent* state (it is what many
shipped indie monster-tamers do), not a broken one — but it is not "localized" in a marketing sense, and
§8-2 forces the operator to say so out loud before M24 is called done.

### 2.6 ICU as interchange, not runtime — the format arbitration

**ICU MessageFormat is the export/import format of record; it is never parsed at runtime.**
`scripts/catalog-export.mjs` **(new, S8)** emits `build/i18n/<locale>.icu.json` where a plain entry becomes a
plain string and a `selectPlural` entry becomes `{n, plural, one {…} few {…} other {…}}`;
`scripts/catalog-import.mjs` **(new, S8)** reads translated ICU JSON back and emits `catalog.<locale>.ts`.
Both are ADR-0055-compliant character-class cursor scanners over a **depth-1, `plural`/`select`-only**
subset (B5's point 4) — no `selectordinal`, no gender, no nesting. `// @desc:` lines are carried into the
export as ICU `description` metadata.

**Why B5's "budget it NOW" argument wins on evidence:** the round-trip is one slice against a catalog of
~169 entries; against 40 screens of accreted keys with no round-trip tooling it is a migration. And it is
what makes ADR-0033's "ICU-style" true rather than nominally-satisfied.
**What the loser (a runtime ICU parser) costs us, stated:** a message needing `select` on a
*non-count* axis — grammatical gender, formal/informal address — must be authored as a per-message TS
function branching on an explicit union parameter rather than as translator-editable message syntax. That is
an engineer PR where a full ICU runtime would have been a spreadsheet edit. Accepted: this codebase has zero
gendered content today, and the export shim means the *vendor* still sees ICU either way.

### 2.7 Locale negotiation, RTL, and player names

- **Negotiation (B5's S2, adopted):** `client/src/ui/i18n/locale.ts` **(new)** —
  `negotiateLocale(requested: readonly string[], available: readonly string[]): string`, a pure BCP-47
  lookup with truncation fallback (`fr-CA` → `fr` → `en`), fed from `navigator.languages` at boot, with a
  `?locale=` URL override for testing. Pure function, tier (c) unit-tested.
- **RTL, honest minimum (B3's point 5, adopted with its residual intact):** exactly **two** writes —
  `document.documentElement.lang = currentLocale()` and `document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr'`,
  both set **once at boot in `main.ts`**, plus a `dir="ltr"` default on `client/index.html:2` (E9 notes the
  attribute is absent today). **M24 ships zero CSS.** **Declared NOT SUPPORTED, loudly:** every inline
  `style.cssText` / `left:` / `margin-left:` in the 19 view files is physical, not logical. **M24's RTL scope
  is: text flows and reads right-to-left; layout does not mirror.** This is a stated residual (§7-1), not a
  silent drop, and it is tier (e).
- **Player display names (B5's point 8 + B6's F3, synthesized):** `set_profile_name` values are the only
  real UGC surface (dossier §A1 — there is no chat). They are **never** catalog keys and **never**
  translated. At `leaderboardView.ts:57`, `tradeView`'s counterpart-name sites and `pvpView`'s opponent-name
  sites they are wrapped in a **`<bdi>` element built with `document.createElement('bdi')` +
  `textContent`** — never markup, which is only safe *because* §2.1 removed the HTML sinks first. The
  surrounding line becomes `tf('leaderboard.row', {...})`, which is what the corrected §2.2 rule forces and
  which is safe for the reasons at §2.1(c). **B6's line-exclusion list is rejected** — B6's own risk-3
  concedes it rots, and the corrected rule makes it unnecessary.

### 2.8 The M23 collision — ONE concrete de-collision rule

> **`client/src/styles.css` belongs to M23, exclusively and permanently. M24 never creates it, never edits
> it, and never appears in a `touches:` set containing it. M24's entire style surface is zero files.**

This is a genuine de-collision (disjoint `touches:` by construction), not a merge-order coin flip.
**B3's escalation — "M24 creates it and M23 rebases" — is rejected on evidence:** M23 §2.8 pins that file's
*content* rules (class + `:root` selectors only, zero `#id` selectors, `.sr-only` via `clip-path`, plus
`prefers-reduced-motion` and `prefers-contrast` blocks). An M24-authored stub would either violate those
rules or duplicate them, and either way M23's own gate adjudicates a file M23 did not write.
**B5's `[BLOCKS S4]` "RTL blocked on styles.css" is likewise rejected** — it makes M24 hostage to an unbuilt
milestone for a benefit (layout mirroring) that §2.7 already declares out of scope.

**Consequences, both directions, stated:** if M23 lands first, its logical-property rules are already in
place and M24's `dir` flip is immediately meaningful for layout as well as text. If M24 lands first, RTL
delivers text direction only until M23 lands — which is exactly what §2.7 promises either way. **Therefore
M24 does not block on M23 and M23 does not block on M24.** The single point of coupling is the resolver's
internal key union, never a call site: S1's `resolver.ts` imports `A11Y_COPY_EN` if it exists and compiles
against an empty a11y union if it does not, so *whichever lands second absorbs the other's keys with no
call-site edit*. That absorption is what `[I18N-SHAPE-05]` pins.

---

## 3. Scope discipline — what is CUT, and what each cut will cost

| # | Cut | Future cost, named |
|---|---|---|
| C1 | **All content-registry localization** (§2.5): the `locale_strings` registry, `locale_string_row`, `validate_locale_strings`, `CONTENT_VERSION` bump, all `game-core`/`server-module` work | A follow-on milestone of ~4 slices builds B2's design as specced in §2.5(2). Interim: English monster/skill/item names inside a localized UI. |
| C2 | **Dialogue localization and the dialogue codegen** (B2 S5 / B6 §3.7) | The hand-mirror `dialogueContent.ts` survives and `dialogue-client-integrity.eval.mjs`'s single-mapping C6 assumption is untouched — which is a *benefit* today. Cost lands with C1: the generator plus B6's ratchet-then-diff discipline plus a per-locale C6 rewrite plus re-asserting C5's `no new RegExp/no fetch` tooth against the generated file. |
| C3 | **A runtime ICU MessageFormat parser** (§2.6) | Non-count `select` (gender, formality) is an engineer PR, not a translator edit. Revisit if a locale ever demands cross-message grammatical agreement. |
| C4 | **The a11y plural expander** (B6 §3.4) | The first counted a11y label in a 4-/6-category language must build the generator + eval as scoped work; `[I18N-SHAPE-04]` guarantees it cannot be smuggled in. |
| C5 | **Server `Err(...)` string localization** — 100 sites, ~20 modules (E12) | Non-English players see raw English server errors through `reduceErrorMessage` at `statusModel.ts:38-58`. **Tracked as follow-up milestone slug `M-error-codes` in §9 and escalated for explicit sign-off (§8-3) — not buried as a cut bullet.** B5 is right that this must not be silently punted. |
| C6 | **RTL layout mirroring** (§2.7) | Every inline `style.cssText` in 19 view files is physical. Mirroring is a per-view sweep that should ride M23's `styles.css` once that exists. |
| C7 | **A pseudolocale generator** (B4 §6, B5 §6) | Un-externalized-string detection is fully covered by §5.2's default-fail rule, which is *stronger* than inflation-anomaly detection and needs no build artifact. The genuine unique value of pseudo-loc — **visual** overflow — has no static oracle by B4's own admission (tier (d)/(e)) and is covered by the §5.6 manual checklist. Cost: text-expansion overflow in French/German is caught by a human, not CI, until an e2e tier exists. |
| C8 | **Locale-switching UI** | A locale is chosen by `navigator.languages` or `?locale=`. An in-game picker is one overlay in a later milestone; it needs M23's overlay a11y contract anyway. |
| C9 | **A coverage dashboard as a CI gate** | Adopted only as B4's **nightly** ratchet artifact (§5.5), never as a `just ci` gate — a completion percentage is a report, and reporting it green is the failure mode this ceremony exists to prevent. |
| C10 | **A TMS integration** | Explicitly ADR-0033's "ops/vendor concern, deferred" (E10). §2.6's round-trip shim is the seam; wiring it to a vendor is ops. |

**KEPT as irreversible-now seams (5):** the sink elimination (§2.1) · `MessageId` as the SSOT union (§2.3) ·
the `t()`/`tf()` split (§2.4) · the ICU round-trip format (§2.6) · the corrected default-fail lint rule (§2.2).

---

## 4. Slices, dependency spine, and fan-out

| Slice | Scope | `touches:` | `after:` |
|---|---|---|---|
| **S0** | Sink elimination: 3 markup sites → `createElement`+`textContent`; 11 `innerHTML=''` clears → `replaceChildren()`; `evals/i18n-no-html-sink.eval.mjs` **(new)** | `client/src/ui/shopView.ts`, `client/src/ui/tradeView.ts`, `client/src/ui/questLogView.ts`, `client/src/ui/healView.ts`, `client/src/ui/dialogueView.ts`, `evals/i18n-no-html-sink.eval.mjs` **(new)** | — |
| **S1** | i18n module, types only, zero call-site migration: `messageIds.ts` **(new)**, `resolver.ts` **(new)**, `plural.ts` **(new)**, `locale.ts` **(new)**, `catalog.en.ts` **(new)** seeded with `chrome.*` keys only; unit tests | `client/src/ui/i18n/` **(new dir)** | — |
| **S2** | Extraction lint: `evals/i18n-hardcoded-strings.eval.mjs` **(new)** with the §2.2 default-fail rule, the 19-file scope, `SINK_FLOOR = 169`, `HARDCODED_CEILING` seeded at the S0-measured count; **fixtures run in Phase 0 before any real file is read** | `evals/i18n-hardcoded-strings.eval.mjs` **(new)**, `evals/baselines/i18n-hardcoded.json` **(new)** | S0, S1 |
| **S3** | Migration batch A — the two densest views (61 sinks) | `client/src/ui/battleView.ts`, `client/src/ui/pvpView.ts`, `client/src/ui/i18n/catalog.en.ts` | S2 |
| **S4** | Migration batch B — the mid-density views (68 sinks) | `client/src/ui/evolutionView.ts`, `raisingView.ts`, `boxView.ts`, `tradeView.ts`, `shopView.ts` | S2 |
| **S5** | Migration batch C — the tail (40 sinks) incl. the `<bdi>` wrap at `leaderboardView.ts:57` + `client/index.html` static strings | `client/src/ui/tradeProposeView.ts`, `dialogueView.ts`, `claimView.ts`, `sessionView.ts`, `renameView.ts`, `menuView.ts`, `leaderboardView.ts`, `helpView.ts`, `errorOverlayView.ts`, `questLogView.ts`, `healView.ts`, `client/index.html` | S2 |
| **S6** | Boot wiring: `negotiateLocale` call, `lang`/`dir` flip in `main.ts`; `evals/i18n-catalog-shape.eval.mjs` **(new)** incl. the 47-char width budget | `client/src/main.ts`, `evals/i18n-catalog-shape.eval.mjs` **(new)** | S1 |
| **S7** | **Proof slice** — a second locale (`fr`) authored end-to-end; `evals/i18n-catalog-parity.eval.mjs` **(new)** | `client/src/ui/i18n/catalog.fr.ts` **(new)**, `evals/i18n-catalog-parity.eval.mjs` **(new)** | S3, S4, S5, S6 |
| **S8** | ICU round-trip: `scripts/catalog-export.mjs` **(new)**, `scripts/catalog-import.mjs` **(new)**; nightly completion baseline | `scripts/catalog-export.mjs` **(new)**, `scripts/catalog-import.mjs` **(new)**, `evals/baselines/i18n-locale-completion.json` **(new)**, `justfile` | S7 |

**Dependency spine:** `S0 → S2 → {S3 ‖ S4 ‖ S5} → S7 → S8`, with `S1 → S2` and `S1 → S6 → S7`.
**Declared fan-out pairs (`touches:`-disjoint, safe to run concurrently, N≤2 per `docs/routing.md`):**
`S0 ‖ S1` · `S3 ‖ S4` · `S3 ‖ S5` · `S4 ‖ S5` · `S1 ‖ S0`.
**NEVER paired:**
- `S0 ‖ S5` — both touch `questLogView.ts`, `healView.ts`, `dialogueView.ts`. This is the one real overlap in
  the design and it is resolved by *ordering*, not by splitting a file.
- `S0 ‖ S4` — both touch `shopView.ts`, `tradeView.ts`.
- **Any migration slice before S0.** This is the ordering B6 correctly insists on and it is load-bearing:
  migrating `shopView.ts:104` before the sink is deleted externalizes a string *straight into a live
  `innerHTML=`* and the lint waves it through (F1).
- `S7 ‖ S3/S4/S5` — the parity gate is meaningless against a half-migrated `en` catalog.

**Nine slices.** Every `touches:` set is confined to `client/`, `evals/`, `scripts/` and `justfile`. **No
slice touches `game-core/`, `server-module/`, or `client/src/styles.css`** — the §2.5 and §2.8 decisions
are visible in the slice table itself, which is where a collision would otherwise hide.

### 4.1 Post-integration verification

Parallel slices passing in isolation does not prove they work together. After all nine merge (serial,
verifier-gated, each later slice rebased on merged predecessors), the milestone verifies the integrated
whole: full `just ci` green **and meaningful**; `bindings-drift = 0` (expected trivially — M24 changes no
schema, and *that* is the check which proves §2.5's cut actually held); `battle-schema-snapshot` byte-identical
to its baseline; `CONTENT_VERSION` still `21` (E11) — a bump would mean content work leaked in.

**Adopted from B4, the strongest single procedural idea in the ceremony:** during the migration window —
after S2 lands but before S3/S4/S5 complete — `just eval` MUST show `i18n-hardcoded-strings` **RED at a
known, nonzero, non-full count**, the "expected RED at HEAD" idiom `ci-gate-wiring.eval.mjs` already
documents for its own anchor. A gate that is green the moment it is written, over a corpus it has not yet
been used to fix, has not been shown to see the tree. The measured count at S2 is recorded in the spec and
each of S3/S4/S5 ratchets `HARDCODED_CEILING` down by its own migrated count; S5's landing takes it to 0 and
the ceiling becomes a permanent 0-ratchet.

**Cross-slice contracts named, each with the test that proves it after integration:**
`MessageId` union ↔ `catalog.en.ts` keys (tier (a), plus `[I18N-PARITY-02]`) · `catalog.en.ts` ↔
`catalog.fr.ts` (tier (a), plus `[I18N-PARITY-01]`) · `t()`'s signature ↔ M23 §2.8 (tier (b),
`[I18N-SHAPE-05]`) · sink vocabulary ↔ the 19-file scope (tier (b), `SINK_FLOOR = 169`) · exporter output ↔
importer input (tier (c), a round-trip identity unit test).

---

## 5. Gates — the eval design

Four new evals. All are auto-discovered by `evals/run.mjs:4,11` with zero wiring (dossier §E), all reuse
`stripComments` **by import** and the `stringMask`/`stripStringLiterals` pair with its `unterminated`
fail-loud flag, and none constructs a dynamic `RegExp` (ADR-0055).

### 5.1 `evals/i18n-no-html-sink.eval.mjs` (new) — closes F1

| Tag | Check |
|---|---|
| `[I18N-HTML-01]` | Zero `.innerHTML =` / `.outerHTML =` assignment sites in `client/src/**/*.ts` excluding `*.test.ts`, matched on the sink token + `=` **independent of RHS** |
| `[I18N-HTML-02]` | Zero `insertAdjacentHTML(` / `document.write(` / `.setHTML(` call sites in the same scope |
| `[I18N-HTML-03]` | The scanner read ≥19 files and ≥169 sink-vocabulary sites overall (shared floor with 5.2) — proves it is seeing the tree |

**BAD fixtures (must FAIL):** (1) `list.innerHTML = t('shop.empty')` — **fails regardless of the RHS being a
catalog call**; this is the exact case B1/B2/B3's designs pass. (2) `el.innerHTML = ''` — fails; the design
permits **no** RHS exception. (3) `el.insertAdjacentHTML('beforeend', safeConst)`.
**GOOD hostile-but-correct fixture (must PASS):** a file containing the literal text
`// NEVER innerHTML with data (XSS)` (the real comment at `leaderboardView.ts:8`) **and** a live
`el.replaceChildren(...items)` **and** a variable named `innerHTMLPolicyNote` — must pass, proving comment
stripping and token-boundary matching both work rather than a substring grep firing on prose.
**Vacuity attack, declared and killed:** an implementation that flags only *string-literal* RHS of
`innerHTML=` — the habit every other candidate's classifier encodes — passes `list.innerHTML = t('x')`
silently. Killed by matching the **sink alone**, exactly inverting the RHS-classifier axis, and proven by
BAD fixture (1). A second attack — a scanner pointed at an empty or mistyped glob, going green on nothing —
is killed by `[I18N-HTML-03]`'s floor and by a hard fail if any of the 19 named target files is missing
(the `SCAN_TARGETS` idiom at `client-no-pii-logs.eval.mjs:857-867`).

### 5.2 `evals/i18n-hardcoded-strings.eval.mjs` (new) — closes F2

| Tag | Check |
|---|---|
| `[I18N-HC-01]` | For every sink RHS in the 19-file scope, every static segment is CLEAN per §2.2's `NON_TRANSLATABLE_CHARS` closed set, **or** the RHS is a `t(`/`tf(` call, a bare identifier/property access, or a numeric/boolean literal |
| `[I18N-HC-02]` | `setAttribute`'s **first** argument is allowlisted (`aria-label`, `aria-live`, `aria-describedby`, `title`, `alt`) **before** any RHS examination; `.id =`, `.className =`, `.style.cssText =`, `.dataset.*`, `addEventListener(` are structurally absent from the sink vocabulary |
| `[I18N-HC-03]` | `SINK_FLOOR = 169` (E5) — fewer sinks seen than that is a scanner failure, not a clean tree |
| `[I18N-HC-04]` | Count of failing sinks ≤ `HARDCODED_CEILING` from `evals/baselines/i18n-hardcoded.json`, monotonically shrink-only, git-append-only |
| `[I18N-HC-05]` | All 19 target files present; a missing file is a hard fail, never a skip |

**BAD fixtures (must FAIL), all drawn from real lines:** (1) `` lvSpan.textContent = `Lv${card.level}` ``
(`battleView.ts:212`, E3) — **the fixture B3's own ≥3 rule passes**. (2)
`` li.textContent = `${n} — ${r} (W${w}/L${l})` `` (`leaderboardView.ts:57`, E4) — **the fixture B6's own
≥2-plus-allowlist repair passes**. (3) `el.textContent = 'Rename'` (`index.html:54`'s counterpart).
(4) `el.setAttribute('aria-label', 'Empty slot')`.
**GOOD hostile-but-correct fixtures (must PASS):** (1) `` sep.textContent = `${a} · ${b}` `` — glyph-only
statics; proves the closed set is not a blanket alphabetic ban. (2)
`el.setAttribute('data-testid', 'box-slot')` — proves attribute-name filtering runs *before* content
classification (B4's point: an implementation with no testid exclusion mass-false-positives and gets
disabled, which is a gate failure mode as real as a blind one). (3) a **commented-out** raw literal
(`// el.textContent = 'Rename'`) sitting directly above a real `t()` call — must pass, proving the imported
`stripComments` is genuinely wired.
**Vacuity attacks, declared and killed — three of them:**
(a) *Per-file rather than per-sink classification* (B1's contribution): a file calling `t('x.y')` once at the
top and holding 25 raw literals below would pass. Killed by classifying **per sink** and proven by a fixture
pairing one `t()` call with one raw literal in the same file.
(b) *Bare-literal-only scanning* (B3's contribution): 90 of the UI's non-test template literals are template
literals, not bare strings — such a scanner passes almost the whole corpus. Killed by §2.2's static-segment
decomposition and proven by BAD fixture (1).
(c) *A length-threshold heuristic* (this ceremony's own contribution, per F2): killed by removing the
threshold entirely and proven by BAD fixture (2), which **no candidate's stated rule catches**.

### 5.3 `evals/i18n-catalog-parity.eval.mjs` (new)

| Tag | Check |
|---|---|
| `[I18N-PARITY-01]` | Every key in `catalog.en.ts` exists in every `catalog.<locale>.ts` (belt to `tsc`'s braces — it survives a `Partial<>`/`as` escape hatch that mapped-type totality would not) |
| `[I18N-PARITY-02]` | Every `t(`/`tf(` first argument is a **string literal**; a non-literal first argument is a `DYNAMIC-KEY` finding and is **always flagged, never skipped** |
| `[I18N-PARITY-03]` | Every requested key exists in `MessageId` ∪ a11y keys (`UNDEFINED-KEY`) |
| `[I18N-PARITY-04]` | Every catalog key is requested by ≥1 call site (`DEAD-KEY`) |

**BAD fixtures:** `catalog.fr.ts` missing one key → `PARITY-GAP`; `` t(`a11y.${x}`) `` → `DYNAMIC-KEY`;
`t('shop.notAKey')` → `UNDEFINED-KEY`; an unreferenced `'legacy.old'` → `DEAD-KEY`.
**GOOD hostile-but-correct:** a `tf()` call whose *params object* is dynamically built
(`tf('leaderboard.row', {...vm})`) — must PASS: the **key** is literal and that is all this gate polices;
param shape is `tsc`'s job (tier (a)). Proves the gate does not over-reach into a property another oracle
already owns.
**Vacuity attack killed (B4's):** an implementation that walks only literal `t('…')` calls and treats a
non-literal argument as "nothing to check" goes green precisely on the construct that defeats static
parity. Killed by `[I18N-PARITY-02]` treating non-literal as a **finding**, not an absence.

### 5.4 `evals/i18n-catalog-shape.eval.mjs` (new)

| Tag | Check |
|---|---|
| `[I18N-SHAPE-01]` | Every catalog entry has a `// @desc:` line with ≥10 non-whitespace characters |
| `[I18N-SHAPE-02]` | `WIDTH_CONSTRAINED_KEYS = { 'chrome.helpHint': 47 }` — every locale's rendered value ≤ its budget. **47 is derived (E8): 49 chars ≈ 323px ⇒ ≈6.59px/char; (320 − 6)px ⇒ 47.** No truncation transform exists at render time; a locale that cannot fit authors a shorter phrasing |
| `[I18N-SHAPE-03]` | Every key matches `/^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/` (hand-rolled character-class scan, no `RegExp` object) |
| `[I18N-SHAPE-04]` | **No `a11y.`-prefixed key ever appears as a `tf(` first argument**, and no `a11y.*` key value contains `{` or `}` — M23's `[A11Y-02]` re-asserted from M24's side so the guardrail cannot erode from either direction (§2.4) |
| `[I18N-SHAPE-05]` | `resolver.ts` exports `t` with M23's exact signature `(key: …) => string` and does **not** export a variadic/overloaded `t` — the M23 seam pinned mechanically |

**BAD fixtures:** a 52-char French `chrome.helpHint` against the 47 budget; a key `Battle.HPLine`;
`tf('a11y.overlay.boxView.title', {n: 1})`; an `a11y.count.items` value containing `{count}`; a
`catalog.en.ts` entry with no `@desc`.
**GOOD hostile-but-correct:** a 47-character-exactly French `chrome.helpHint` — must PASS (boundary is `≤`,
not `<`, and off-by-one here would fail a *correct* translation); and **the current English string
`Press ? for help · click or M for menu` (38 chars, E8) must PASS** — the gate must not red on `en` at HEAD.
**Vacuity attack killed:** a width check whose budget map is empty, or whose sole entry names a key that does
not exist, goes green over everything. Killed by asserting every key in `WIDTH_CONSTRAINED_KEYS` **resolves
in every catalog** (a missing key there is a hard fail) — and by the GOOD `en` fixture, which proves the
measurement path executes. **B3's proposed budget of 29 would have failed this fixture and redded CI on the
existing English string** (§11-B).

### 5.5 Nightly, NOT `just ci` (B4's ratchet, adopted with its scope corrected)

`evals/baselines/i18n-locale-completion.json` **(new)**, git-append-only, monotonic-shrink-only on the GAP
count, produced by S8's exporter and reported **nightly only**. **Anti-gaming, corrected:** completion is
driven by an explicit per-key **`translated: boolean`** flag maintained by the importer (B6's point 8), **not**
by a string-inequality heuristic. B4's own risk-3 falsifies inequality — `en` plus a trailing space defeats
it — and, more decisively, a French key that *legitimately* equals its English source (a glyph-only string,
a proper noun) is miscounted by *any* inequality rule in both directions at once. A completion percentage is
never a `just ci` gate: reporting a percentage green is precisely the failure mode this ceremony exists to
prevent.

### 5.6 Oracle tiering — every M24 property classified

**(a) TS compile:** catalog totality per locale · parameter-set correctness at every `tf()` call site ·
`Intl.LDMLPluralRule` category completeness · `MessageId` as SSOT · `a11y.*` barred from `tf()` by type.
**(b) Source-scan eval:** zero HTML sinks (5.1) · no hard-coded translatable text (5.2) · catalog parity /
dynamic-key / undefined-key / dead-key (5.3) · `@desc` presence, key shape, width budget, `t()` signature
pin, `[A11Y-02]` re-assertion (5.4) · sink and file floors.
**(c) happy-dom vitest:** `negotiateLocale` fallback chain (`fr-CA`→`fr`→`en`) · `selectPlural` category
selection for `en`/`fr`/`ru` · `fmtNumber` output · `dir`/`lang` set exactly once at boot · `<bdi>` wrapping
of `displayName` · exporter↔importer round-trip identity.
**(d) Playwright/e2e — NOT in `just ci`, nightly at best:** none proposed. M24 adds no e2e.
**(e) MANUAL CHECKLIST ONLY — NEVER reported CI-green:**
 1. RTL *layout* correctness — inline physical styles are not mirrored (§2.7, C6).
 2. Visual overflow/clipping of translated strings outside `chrome.helpHint` — there is **no `overflow`
    handling anywhere in the client today** (B3's risk 2) and no static oracle for text metrics; B4 reaches
    the identical conclusion independently from the pseudolocale angle.
 3. Compound data-row **reorderability** — the `` ` (+`,`‰) ×` `` residual of §2.2; the lint passes
    glyph-only statics and cannot know a locale needs a different order (B5's point 7).
 4. Translation *quality* / register / a `{count}` that is grammatically wrong-but-well-formed.
 5. a11y counts are English-enumerated only (§2.4 / C4).
 6. Server `Err(...)` English leakage through `reduceErrorMessage` (C5).

**Binding rule, restated because it is the rule most often broken:** a property in tier (e) is tracked in
`docs/manual-checklists/m24-i18n.md` **(new)** and is **never** reported CI-green, never asserted by an
eval, and never cited as evidence that M24 is done. M24's gate is green when tiers (a)–(c) are green; the
tier-(e) list is signed off by a human at the playtest gate, separately and visibly.

---

## 6. Acceptance criteria (EARS)

**S0 — sink elimination**
- **I18N-1** [b] WHEN `evals/i18n-no-html-sink.eval.mjs` scans `client/src/**/*.ts` excluding `*.test.ts`, THE SYSTEM SHALL report zero `.innerHTML =` and `.outerHTML =` assignment sites.
- **I18N-2** [b] WHEN the same scan runs, THE SYSTEM SHALL report zero `insertAdjacentHTML(`, `document.write(` and `.setHTML(` call sites.
- **I18N-3** [b] WHEN the fixture `list.innerHTML = t('shop.empty')` is scanned, THE SYSTEM SHALL fail it, independently of the right-hand side being a catalog call.
- **I18N-4** [b] WHEN the scan completes, THE SYSTEM SHALL confirm it read all 19 in-scope files and ≥169 sink-vocabulary sites, and SHALL fail loudly if any named target file is absent.
- **I18N-5** [c] WHEN `ShopView.render` receives a `no-shop` view-model, THE SYSTEM SHALL produce the empty-state row as an element built by `createElement` with its text set via `textContent`.

**S1 — the i18n module**
- **I18N-6** [a] WHEN any `catalog.<locale>.ts` omits a key present in `MessageId`, THE SYSTEM SHALL fail `client-typecheck`.
- **I18N-7** [a] WHEN a `tf()` call passes a parameter object that does not match `MessageParams[K]`, THE SYSTEM SHALL fail `client-typecheck`.
- **I18N-8** [a] WHEN an `a11y.*` key is passed to `tf()`, THE SYSTEM SHALL fail `client-typecheck`.
- **I18N-9** [a] WHEN a locale's plural entry omits a CLDR category that `Intl.LDMLPluralRule` requires, THE SYSTEM SHALL fail `client-typecheck`.
- **I18N-10** [c] WHEN `selectPlural('ru', 3, forms)` is called, THE SYSTEM SHALL return the `few` form.
- **I18N-11** [c] WHEN `negotiateLocale(['fr-CA'], ['en','fr'])` is called, THE SYSTEM SHALL return `'fr'`; and WHEN no requested tag matches, THE SYSTEM SHALL return `'en'`.

**S2 — the extraction lint**
- **I18N-12** [b] WHEN a sink right-hand side contains a static segment holding any character outside `NON_TRANSLATABLE_CHARS`, THE SYSTEM SHALL fail that sink, with no minimum-length exemption of any kind.
- **I18N-13** [b] WHEN the fixture `` textContent = `Lv${n}` `` is scanned, THE SYSTEM SHALL fail it.
- **I18N-14** [b] WHEN the fixture `` textContent = `${n} — ${r} (W${w}/L${l})` `` is scanned, THE SYSTEM SHALL fail it.
- **I18N-15** [b] WHEN the fixture `` textContent = `${a} · ${b}` `` is scanned, THE SYSTEM SHALL pass it.
- **I18N-16** [b] WHEN a `setAttribute` call's first argument is not in the allowlist, THE SYSTEM SHALL exclude the call before examining its right-hand side.
- **I18N-17** [b] WHEN the lint runs, THE SYSTEM SHALL observe ≥169 sinks across the 19-file scope and SHALL fail if it observes fewer.
- **I18N-18** [b] WHEN the failing-sink count exceeds `HARDCODED_CEILING`, THE SYSTEM SHALL fail; and the baseline SHALL be monotonically shrink-only and git-append-only.

**S3–S5 — migration**
- **I18N-19** [b] WHEN S3, S4 and S5 have all landed, THE SYSTEM SHALL report `HARDCODED_CEILING` = 0.
- **I18N-20** [c] WHEN `LeaderboardView.render` receives a row, THE SYSTEM SHALL emit `displayName` inside a `bdi` element whose text is set via `textContent`.
- **I18N-21** [b] WHEN any migrated view is scanned, THE SYSTEM SHALL find no `displayName` value routed through a catalog value that is not a pure template interpolation.

**S6 — boot wiring**
- **I18N-22** [c] WHEN the client boots, THE SYSTEM SHALL set `document.documentElement.lang` and `.dir` exactly once, from the negotiated locale.
- **I18N-23** [b] WHEN `client/index.html` is scanned, THE SYSTEM SHALL find a `dir` attribute on the root element.
- **I18N-24** [b] WHEN any catalog entry lacks a `// @desc:` line of ≥10 non-whitespace characters, THE SYSTEM SHALL fail.
- **I18N-25** [b] WHEN a locale's `chrome.helpHint` exceeds 47 characters, THE SYSTEM SHALL fail; and WHEN it is exactly 47, or is the current 38-character English value, THE SYSTEM SHALL pass.

**S7 — the proof locale**
- **I18N-26** [b] WHEN a key exists in `catalog.en.ts` but not in `catalog.fr.ts`, THE SYSTEM SHALL report `PARITY-GAP` and fail.
- **I18N-27** [b] WHEN a `t(`/`tf(` first argument is not a string literal, THE SYSTEM SHALL report `DYNAMIC-KEY` and fail, rather than skipping the call.
- **I18N-28** [b] WHEN a catalog key is requested by no call site, THE SYSTEM SHALL report `DEAD-KEY` and fail.

**S8 — round-trip**
- **I18N-29** [c] WHEN a catalog is exported to ICU JSON and re-imported, THE SYSTEM SHALL produce a `catalog.<locale>.ts` whose key set and parameter arity are identical to the original.
- **I18N-30** [b] WHEN `scripts/catalog-export.mjs` or `scripts/catalog-import.mjs` is scanned, THE SYSTEM SHALL find no `new RegExp(` construction.

**Milestone-wide**
- **I18N-31** [b] WHEN M24 is complete, THE SYSTEM SHALL show `CONTENT_VERSION` unchanged at 21 and `battle-schema-snapshot` byte-identical to its baseline, proving no content-localization work leaked into scope.
- **I18N-32** [e] WHEN M24 reaches its gate, THE SYSTEM SHALL require human sign-off on `docs/manual-checklists/m24-i18n.md`, and SHALL NOT report any item on that checklist as CI-green.

Ids are unique and contiguous 1–32. No criterion is predicated on chat (dossier §A1: there is none).

---

## 7. Deferred / conditional sub-scope — NON-NORMATIVE for M24's gate

1. **RTL layout mirroring.** Conditional on M23's `styles.css` existing. M24 delivers text direction only.
2. **Content-registry localization.** B2's design as recorded in §2.5(2), with B2's R-L4 and B5's
   key-orphaning counter-argument both inherited. Own ceremony (§8-2).
3. **Dialogue localization and codegen**, with B6's ratchet-then-diff discipline and a per-locale C6 rewrite.
4. **The a11y plural expander** (B6 §3.4), gated by `[I18N-SHAPE-04]`.
5. **Server error codes** — follow-up slug `M-error-codes`.
6. **A locale-picker overlay**, which will need M23's overlay a11y contract.
7. **Pseudolocale visual-overflow e2e**, if and when a Playwright tier is added to nightly.

None of these is asserted by an M24 eval; none may be cited as M24 acceptance evidence.

---

## 8. Operator escalations (routed via `mr-ask-drew`)

1. **[BLOCKS S0] Confirm the three `<li>` markup sites have no downstream dependency on being real markup.**
   `shopView.ts:104,115,123` currently inject `<li>` elements that CSS or a test may select structurally.
   This is a verification, not a design question: grep `shopView.test.ts` and any `#shop-*` selector before
   S0 merges. Raised by B6 and correct; the answer changes nothing architecturally but could change S0's diff.
2. **[DEFAULTS to English-only content] Does a market or business requirement sit behind M24?** §2.5 cuts
   all content-registry localization on engineering grounds. B5's risk-1 is decisive on why this must be
   asked and not assumed: industry practice is genuinely mixed (Pokémon renames every creature per locale at
   enormous cost; many indie monster-tamers ship English names everywhere). If creature-name flavour is a
   selling point in a target market, the cut is wrong and **content localization needs its own ceremony, not
   a slice bolted onto M24.**
3. **[DEFAULTS to non-goal, tracked as `M-error-codes`] Server `Err(...)` localization.** 100 sites across
   ~20 modules (E12). Every lens cut this and the cut is defensible, but it means non-English players see
   raw English server errors through `reduceErrorMessage` at launch. **The operator should bless this
   residual explicitly rather than have it discovered in §3's cut table** — B5 is right that a milestone
   cannot silently punt a known player-facing gap.
4. **[BLOCKS S1] ADR-0033 requires an amendment before S1 lands.** M24 deviates from its accepted text in
   two recorded ways: content is *not* locale-keyed RON in this milestone (§2.5), and "ICU-style" is
   satisfied at the interchange layer rather than the runtime (§2.6). The amendment must also record the
   permanent prohibition on a `locale` column on content row tables (§2.5(2)). An accepted ADR should be
   amended, not quietly out-voted by a ceremony.

**Decided by the ceremony, explicitly NOT escalated.** The following were arbitrated on evidence and are
recorded as settled, so the spec author must not reopen them: ICU is interchange-only, not runtime (§2.6 —
B5's generalization objection is satisfied by `Record<Intl.LDMLPluralRule, string>`, not overridden);
`styles.css` belongs to M23 exclusively and M24 ships zero CSS (§2.8 — B3's "M24 creates it and M23
rebases" and B5's "RTL blocks on styles.css" are both rejected, with reasons); M23's brace ban is not
relaxed, not scoped-away, and was never in conflict (§2.4, B6's F4); the extraction rule has no length
threshold (§2.2 — both B3's ≥3 and B6's ≥2-plus-allowlist are falsified by real lines E3/E4); the width
budget is 47 and not 29 (§5.4, E8); the anti-vacuity floor is 169 and not 150 (§5.2, E5); and M24 does not
block on M23 nor M23 on M24 (§2.8).

---

## 9. Non-goals

Chat translation — **there is no chat system** (dossier §A1; `grep message|Message` in `schema.rs` = 0 hits;
`player_conversation` is single-player NPC dialogue-progress state). ADR-0033's chat clause is falsified and
M24 must not carry it forward · machine translation of anything · a TMS integration (ADR-0033: ops/vendor,
deferred) · localization of player display names (UGC, `<bdi>`-isolated, never translated) · localization of
content-registry text or dialogue in this milestone · server `Err(...)` localization (`M-error-codes`) ·
RTL layout mirroring · an in-game locale picker · any `game-core/`, `server-module/`, schema, binding,
`CONTENT_VERSION` or `styles.css` change · canvas text handling — **zero PixiJS `Text`/`BitmapText`/`HTMLText`
imports exist**; all player-facing text is DOM (dossier §A3).

---

## 10. Attribution table (mandatory §6.3 ceremony artifact)

| Lens | ADOPTED (unique elements, and where each landed) | REJECTED (and why) |
|---|---|---|
| **B1** | The **per-sink-not-per-file** vacuity kill — a file calling `t()` once at the top while holding 25 raw literals below must still fail — landed as §5.2's vacuity attack (a) and as `[I18N-HC-01]`'s per-sink classification. The **reversible-vs-irreversible** framing became §3's structure and the "KEPT as irreversible-now seams (5)" list. The observation that `DOM_SHELLS` under-scans by six files landed in §2.2's scope (though B1's resulting count of 31 is corrected to 19 per E5/E6). | The in-row `locale` field on the 8 text-bearing structs plus a server-side `en` filter — rejected on B2's argument (b), verified: it makes eight locale-irrelevant registries locale-dependent, so every reducer doing `species_row().id().find()` for damage or evolution gating must reason about which locale's row it holds, for zero benefit since none of that logic reads `name`. Recorded as a **permanent prohibition** in §8-4, not merely deferred. Merging `a11y.*` into one flat `Record<string,string>` — destroys the mapped-type totality that is the design's strongest property. The `n === 1` call-site plural branch — structurally incapable of Russian's four categories; this is the proposal B5's objection actually defeats. B1's "live contradiction" over the brace ban — pre-solved by the M23 text B1 itself quotes (B6's F4). |
| **B2** | The **off-row side-table architecture** — localized text never enters an id-keyed content row struct and the server never learns a client's locale — is adopted as the **normative reserved mechanism** at §2.5(2) and §7-2, with its **R-L4** (a `locale:"en"` row is rejected outright; two English sources of truth is the bug) and its derived `"<registry>.<id>.<field>"` key form recorded so the future milestone inherits the arbitration rather than re-running it. Its three-way refutation of the filename-suffix scheme (still lands in `SPECIES_RON_PARTS`, still trips duplicate-id) is the reasoning §2.5 rests on. Its identification of `dialogue-client-integrity.eval.mjs` as **the one gate whose assumption rather than baseline changes** is why C2 cuts dialogue. **B2's mechanism is not built in M24** — adopted as normative-deferred, and that is stated plainly rather than dressed up as adoption. | Building any of it in M24 — B5's scope argument wins on schedule, and B2's own strongest property (wholly additive: a new table is an append under `battle-schema-snapshot`, zero `bsatn-compat-smoke` risk) is exactly what makes deferral cost nothing structurally. The dialogue codegen slice — B6's F6 is correct that "kill the hand-mirror" is stated as an outcome, not a designed replacement gate, and it leaves C5's `no new RegExp / no fetch` tooth un-re-asserted against generated output. |
| **B3** | The largest single adoption. **Compile-time-total catalog** `Catalog = {[K in MessageId]: …}` → §2.3, criteria I18N-6/7/9 — the ceremony's best answer to "what does a missing key do at runtime": it never reaches runtime. **`t()`/`tf()` as a two-function seam with `[A11Y-02]` scoped rather than relaxed** → §2.4, `[I18N-SHAPE-04]`. `selectPlural(locale, n, Record<Intl.LDMLPluralRule, string>)` → §2.3, and it is the construct that *satisfies* B5's generalization objection rather than overriding it. The balanced-paren sink vocabulary with **structural** exclusion of `.id`/`.className`/`cssText`/`addEventListener` and first-argument allowlisting of `setAttribute` → `[I18N-HC-02]`. The `NON_TRANSLATABLE_GLYPHS` idea → generalized into §2.2's closed `NON_TRANSLATABLE_CHARS` set. The per-key width budget instead of a pseudolocale harness, and **"never a truncation transform at render time"** → §5.4. The RTL honest-minimum with the inline-physical-style residual declared → §2.7. | The **"alphabetic run of ≥3 chars" threshold** — falsified against its own headline fixture: `Lv` is 2 characters (E3), so the rule passes the exact site B3 nominates as proof; replaced by §2.2's default-fail character inversion. The **29-character `chrome.helpHint` budget** — the live English string is 38 characters (E8), so this gate would red CI on `en` at HEAD; corrected to a derived 47. The **31-file / 23-file scope** — the real non-test production set is 19 (E6). "M24 creates `styles.css` and M23 rebases" — M23's spec pins that file's content rules; §2.8 gives M24 zero CSS instead. |
| **B4** | The **"expected RED at HEAD"** post-integration idiom — `i18n-hardcoded-strings` must be observably red at a known nonzero non-full count during the migration window, because a gate that is green the moment it is written over a corpus it has not yet fixed has not been shown to see the tree → §4.1, and it is the strongest single procedural idea in the ceremony. **Non-literal `t()` first argument is a `DYNAMIC-KEY` finding, never a skip** → `[I18N-PARITY-02]`, I18N-27. The **derived-not-round floor** principle → §5.2's `SINK_FLOOR` (with B4's own 150 corrected to 169, E5). The `data-testid` GOOD fixture and its reasoning — an implementation whose mass false-positives get the gate disabled is a failure mode as real as a blind one → §5.2 GOOD (2). The **coverage report as a nightly ratchet, never a `just ci` gate**, with explicit gaming resistance → §5.5. The honest tier-(d)/(e) placement of pseudolocale visual overflow and RTL visual correctness → §5.6. | The `hasIcuArgs` flag — a flag is data and can be forgotten at a call site; a separate `tf()` function is a type and cannot. The pseudolocale generator and its ≥1.3× inflation check (C7) — §2.2's default-fail rule detects un-externalized strings *directly* and more strongly than an inflation anomaly, and B4 itself concedes the one thing pseudo-loc uniquely buys (visual overflow) has no static oracle. The "differs from `en` and non-empty" completion heuristic — B4's own risk-3 falsifies it, and it also miscounts a legitimately-identical French proper noun; replaced by B6's explicit `translated: boolean`. |
| **B5** | The **scope split** — content-registry text out, UI chrome in — is the milestone's shape (§2.5, §3-C1), and its warning that bundling them is how "M24 i18n" becomes an 8-week slip is the reason. **ICU as the interchange format** with `scripts/catalog-export.mjs`/`catalog-import.mjs` budgeted **now** because it is expensive to bolt on after 40 screens of keys → §2.6, S8, I18N-29/30. **Semantic, not source-derived keys**, with the gettext-ambiguity argument (`"Open"` as menu action vs trade status) and "never reuse a key for a reworded string" → §2.3. **`// @desc` per key as non-optional** → `[I18N-SHAPE-01]`, I18N-24. **Locale negotiation via `navigator.languages` with a BCP-47 fallback chain** → §2.7, S6, I18N-11. **`<bdi>` isolation of player display names as the actual UGC surface** → §2.7, I18N-20. The insistence that the 84–100 `Err()` strings be *declared* rather than silently punted → §8-3. Its point-7 reorderability concern → the honest tier-(e) residual at §5.6-3. Its risk-1 (industry practice on proper nouns is mixed, check for a business requirement) → §8-2. | ICU as a **runtime** parser — ADR-0055's dynamic-`RegExp` ban makes it either a banned pattern or a hand-rolled grammar, and B5's decisive generalization argument lands on B1's `n === 1` branch, not on B3's CLDR-total `Record` type, which does generalize. Two resolvers behind one `t()` disambiguated by an `a11y.*` prefix — runtime prefix dispatch is the implicit-typing footgun this repo avoids and it discards `t()`'s M23-pinned return type; §2.4 uses the type system instead. The pseudo-localization CI gate (C7). "RTL blocked on `styles.css`" — makes M24 hostage to an unbuilt milestone for a benefit §2.7 already scopes out. |
| **B6** | The **central decision itself**: F1 — no candidate's gate polices the *sink* a catalog value lands in, only whether the call site used `t()` — is correct, and §2.1 adopts sink elimination as S0, first and serial, plus `evals/i18n-no-html-sink.eval.mjs` matching **on the sink alone, RHS-independent** (`[I18N-HTML-01..03]`, I18N-1/2/3). Its **ordering argument** — running extraction before S0 lets an engineer externalize a shopView string straight into a live `innerHTML=` — is §4's "NEVER paired" spine. **F2** falsifies B3's headline fixture and is the reason §2.2 exists at all. **F4** (M23 pre-solved the brace ban; A11Y-02 bans braces in the *key*, and a11y strings are contractually zero-arg) settles §2.4 and is credited over B1's re-flagging. **F6** (B2's codegen changes an assumption, not a baseline, and leaves C5's tooth un-re-asserted) → C2. The explicit **`translated: boolean`** flag over inequality heuristics → §5.5. The framing that `M-error-codes` must be a *named* follow-up with operator sign-off → §8-3. | Its **own F2 repair** ("≥2 plus a `W`/`L` allowlist") — falsified by E4: `W` and `L` are one character each, and an allowlist of *translatable* abbreviations grows unboundedly while defaulting every unlisted token to PASS; §2.2 inverts to default-fail with no threshold. `evals/i18n-displayname-not-catalog.eval.mjs` — redundant and self-contradictory with the corrected rule, which *forces* `leaderboardView.ts:57` into a `tf()` call that this gate would then fail; the real hazard is closed by §2.1(a-c) plus `<bdi>`. The **line-exclusion list** for displayName composition — B6's own risk-3 concedes it rots. The **a11y plural expander** (§3.4) — a generator plus a third eval for a requirement that does not exist; replaced by the `[I18N-SHAPE-04]` pin with the future cost named (C4). Its F1 enumeration is also **materially incomplete** (9 of 14 sites; missed `shopView.ts:105,110,118`, `healView.ts:22`, `dialogueView.ts:30`) and it slightly **overstates** the vendor threat as live — ADR-0033 *defers* the TMS (E10); the threat becomes live only when §2.6's importer lands, which is a dating correction, not a refutation. |

**All six lenses produced at least one unique adopted element** — the datum for the operator's open 6-vs-4
brainstormer calibration question. But the distribution is markedly uneven and worth recording honestly:
**B3 and B6 carry the design** (the catalog/resolver architecture and the central sink decision + two
successful falsifications respectively); **B4 and B5 contribute the discipline layer** (oracle honesty,
anti-vacuity procedure; scope shape, interchange format, negotiation, `<bdi>`); **B1's unique contributions
are the thinnest and are largely subsumed** — its per-sink insight is real but B4 reaches the same
anti-vacuity discipline independently and more rigorously, its scope-correction number is wrong, its central
content proposal is rejected outright, and its headline "live contradiction" was answerable from its own
citation; **B2's contribution is architecturally excellent but is entirely deferred out of the milestone**,
so its net effect on M24's shipped scope is a recorded prohibition and a reserved design, not a slice. On
this evidence a 4-lens ceremony consisting of B3, B4, B5 and B6 would have produced substantially this same
synthesis, minus B1's per-sink framing (independently reachable from B4) and B2's reserved design (which
would have had to be re-derived when content localization is scoped). That is a qualified argument for 4,
not a clean one — B2's arbitration of the filename-suffix and locale-column alternatives is genuinely
load-bearing for a *future* milestone and would have been lost.

---

### 10.1 Judge's pre-committed rubric and blended scoring (ceremony calibration datum)

Recorded verbatim at `/tmp/m24/RUBRIC-PRECOMMIT.md` before opening B1–B6. Weights: factual fidelity 25 ·
arbitration resolvability 20 · oracle honesty 15 · gate non-vacuity 15 · scope right-sizing 10 · collision
safety 10 · EARS quality 5. Explicitly NOT criteria: length, tone-confidence, ordering (B6 being last),
authorship. Provenance of each candidate was visible only as a lens label; it was not used as evidence.

| Lens | Fact 25 | Arb 20 | Oracle 15 | Non-vac 15 | Scope 10 | Collis 10 | EARS 5 | **Total** |
|---|---|---|---|---|---|---|---|---|
| B1 | 17 | 13 | 6 | 11 | 9 | 6 | 2 | **64** |
| B2 | 23 | 17 | 7 | 10 | 4 | 8 | 2 | **71** |
| B3 | 19 | 18 | 9 | 12 | 7 | 5 | 3 | **73** |
| B4 | 20 | 12 | **15** | **14** | 6 | 6 | 3 | **76** |
| B5 | 21 | 16 | 10 | 11 | **10** | 7 | 3 | **78** |
| B6 | 22 | 17 | 9 | **14** | 8 | 9 | 3 | **82** |

No candidate is adopted whole. The synthesis below outscores all six because three separately-verified
factual corrections (§11) invalidate a load-bearing number in B3, B4 and B6 respectively.

### Evidence recorded before any score was assigned (all re-verified against the live tree today)

| # | Observation | Command/citation |
|---|---|---|
| E1 | **14** non-test `.innerHTML =` assignment sites exist in `client/src`. Exactly **3** assign markup: `shopView.ts:104` `'<li>No shop available.</li>'`, `:115` `'<li>Nothing for sale.</li>'`, `:123` `'<li>No items to sell.</li>'`. The other **11** assign `''` (clears): `shopView.ts:105,110,118`, `tradeView.ts:83,84,85,111,154`, `questLogView.ts:22`, `healView.ts:22`, `dialogueView.ts:30`. | `grep -rn "innerHTML" client/src --include=*.ts \| grep -v test` |
| E2 | **Zero** files under `evals/` contain the string `innerHTML`. The no-markup discipline is enforced today only by source COMMENTS (9 files) and one unit test (`leaderboardView.test.ts:307` `RL13-xss`). There is no mechanical CI oracle for it. | `grep -rln innerHTML evals/` → empty |
| E3 | `battleView.ts:212` is verbatim `` lvSpan.textContent = `Lv${card.level}`; `` — the static run `Lv` is **2** characters. | `sed -n 205,215p client/src/ui/battleView.ts` |
| E4 | `leaderboardView.ts:57` is verbatim `` li.textContent = `${row.displayName} — ${row.rating} (W${row.wins}/L${row.losses})`; `` — static runs `— `, ` (W`, `/L`, `)`; the alphabetic runs `W` and `L` are **1** character each. | `sed -n 50,62p client/src/ui/leaderboardView.ts` |
| E5 | **Denominator correction.** With the dossier's exact sink vocabulary, `client/src/**/*.ts` yields **243 sites across 31 files INCLUDING `*.test.ts`**, and **169 sites across 19 files EXCLUDING tests**. The 243/31 figure the dossier reports — and which B1, B3 and B4 all reason from — is test-inclusive. | two `grep -no … \| wc -l` runs over the two file sets; both numbers reproduced exactly |
| E6 | The real production file set is exactly **19**: the 13 text-bearing members of `DOM_SHELLS` (`DOM_SHELLS`' other 4 entries — `net/connection.ts`, `render/world.ts`, `render/characterView.ts`, `render/placeholderAssets.ts` — write no player-facing text) **plus** the 6 the dossier names as omitted (`leaderboardView`, `menuView`, `renameView`, `tradeProposeView`, `errorOverlayView`, `helpView`). 13 + 6 = 19. | `evals/dom-shell-coverage-exclusion.eval.mjs:34-57`; per-file sink counts |
| E7 | Per-file non-test sink counts: `battleView` 37, `pvpView` 24, `evolutionView` 18, `raisingView` 17, `boxView` 17, `tradeView` 16, `shopView` 16, `tradeProposeView` 8, `dialogueView` 5, `claimView` 5, `sessionView`/`renameView`/`menuView`/`leaderboardView`/`helpView`/`errorOverlayView`/`main.ts` 4 each, `questLogView` 2, `healView` 2. | `grep -rnc` per file |
| E8 | `client/index.html:125` currently reads `Press ? for help · click or M for menu` = **38 characters**. The adjacent comment at `:118-119` states the *previous* **49**-char text measured **~323px** at 11px monospace and overflowed a 320px viewport from `left:6px`. Implied cell width ≈ 6.59px; available width = 320 − 6 = 314px ⇒ budget ≈ **47** characters. | `sed -n 118,126p client/index.html`; `len()` = 38 |
| E9 | `client/src/ui/a11yCopy.ts`, `client/src/styles.css` and `client/src/ui/i18n/` **do not exist** (all new) — M23 is unbuilt, as the dossier states; every citation of them in this spec is forward-looking. | `ls` → 3× No such file |
| E10 | ADR-0033 exists at `specs/monster-realm-v2/adr/0033-i18n-strategy.md` (harness corpus, not the project repo). Its Decision Outcome chooses **"keyed message catalogs (UI) + locale-keyed RON (content), ICU-style, default-complete with fallback + RTL; a hard-coded-string lint"** and states **"the TMS is an ops/vendor concern. Deferred."** It does **not** state that a vendor writes catalog values into the repo. | full file read |
| E11 | `CONTENT_VERSION` is `21` (`server-module/src/lib.rs:74`); `REGISTRIES` in `game-core/build.rs:21-38` has 13 entries. Both as dossier. | `grep -n` |
| E12 | `Err("` appears **100** times across `server-module/src/*.rs` (the dossier's 84 counts the narrower `return Err("` form). Either way this is a multi-file, ~20-module surface. | `grep -rno 'Err("' \| wc -l` |

---

## 11. Ceremony input of record

The pre-ceremony design sketch, preserved verbatim as the ceremony's input of record.

---

## Problem / intent
Externalize player-facing text so reaching another language is **data, not code**. Chat (user content) is
rendered safely but **not** machine-translated.

## Scope (condensed)
- **UI strings** → keyed **message catalogs** per locale (ICU plural/interpolation); no hard-coded player-
  facing strings (an extraction lint enforces it).
- **Content localization:** dialogue/species/skill/item text get **locale variants in RON** (rides the
  ADR-0006 pipeline); `validate_content` requires the default-locale key.
- Locale selection + **fallback to default** + locale-aware number/date + **RTL**; a coverage report;
  default (English) always complete. A11y copy (M23) flows through the catalogs.
- **Out of scope:** machine-translating chat (no — safety/scope); a TMS workflow (ops/vendor).

## Key design + boundary
A new language is a **data drop** + the hard-coded-string lint makes externalization mechanical.

## Risks / decisions
Hard-coded literal ships → extraction lint fails. Missing default key → `validate_content` fails. Partial
locale → fallback + coverage report.

## Recency check (2026-08-23, review pass — ceremony AUTHORIZED, PLAN.md §9)

"Rides the ADR-0006 pipeline" is only half the current mechanism. ADR-0006 (schema-evolution +
content-sync) is the original single-pipeline decision; content loading itself moved to **directory-based
glob loading** in `M8.9e` (`ADR-0057` — `build.rs` embeds `game-core/content/<registry>/*.ron`, proven by
the wave-file pattern `000-core.ron`/`010-derived.ron`/`020-playtest-wave1.ron`/`050-wave2.ron`/
`060-item-evo-derived.ron` this session confirmed live). Any locale-variant RON scheme (e.g. a
`<registry>/<locale>/*.ron` layer, or a locale field inside each entry) needs to be designed against the
**ADR-0057 glob-loader**, not the older ADR-0006 description alone — cite both, but treat 0057 as the
mechanism a new locale scheme actually extends. Everything else (message-catalog externalization, the
extraction lint, RTL, the M23 copy-composition boundary) is unaffected by intervening work.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
