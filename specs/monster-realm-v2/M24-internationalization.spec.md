<!-- CEREMONY COMPLETE 2026-08-23 — mr-feedback-doctrine.md §6 heavy ceremony
     (investigation -> 6-way ideation -> judge synthesis w/ attribution table -> adversarial review).
     This file is no longer a design sketch. The pre-ceremony sketch is preserved VERBATIM in §11. -->

# Spec: M24 — Internationalization (i18n)

**Status:** converged, implementation-ready (**CEREMONY COMPLETE**, 2026-08-23) · **Phase D** ·
**Design authority:** ADR-0033 `i18n-strategy` (harness design ADR, accepted 2026-06-24) — ELABORATED,
not amended. **Mechanism authorities:** **ADR-0006** (content-is-data / additive schema evolution — the
invariant) **and ADR-0057** (`content-directory-glob-loading` — the loader a locale-variant RON scheme
actually extends; see §2 and the sketch's own 2026-08-23 Recency check in §11).
**Stack:** spacetimedb-game · **Project:** monster-realm

## 1. Problem / intent

Player-facing text is hard-coded English at 243 DOM-write sites across 31 client files, in 10 free-text
fields across 8 RON content registries, and in 84 `return Err("...")` reducer strings. ADR-0033
(`accepted`, 2026-06-24) chose keyed message catalogs for UI, locale-keyed RON for content, ICU-style
composition, default-complete + fallback + RTL, a hard-coded-string lint, and untranslated chat. This
ceremony converges that decision into an implementation-ready design. It **falsified three of the
sketch's own premises** along the way.

**Fact 1 — there is NO chat system, so ADR-0033's chat plank defends nothing.** `grep message|Message`
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


## 11. Ceremony input of record

The pre-ceremony design sketch, preserved verbatim.

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
