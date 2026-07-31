# uxd3-b — ADJUDICATED implementation brief (post reviewer + red-team + /simplify)

Worktree `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/uxd3-b`,
branch `feat/uxd3-b-overlay-registry-substrate`, forked from master@1953329. Baseline `just ci` GREEN (1755 tests).
ADR number reserved: **0163**.

Three lenses reviewed `/tmp/uxd3b-plan.md`. This file is the BINDING adjudication — where it conflicts
with `/tmp/uxd3b-plan.md`, THIS FILE WINS.

---

## §A. Adjudicated decisions

### A1 — CUT LINE: adopt the planner's re-split, with one correction to the API half.
uxd3-b ships the **read** substrate + the AC-12 front door. The **write** substrate (open/hide thunks,
`refreshBattle`, `onReconnect`, hotkey→`canOpen`, retirement of `W-OVERLAY-FANOUT-MUTEX` /
`W-HELP-FANOUT-OPENGUARDS` / `W-HELP-FANOUT-BATTLE`) becomes **uxd3-c**.

*Why (reviewer-verified, not budget):* `W-OVERLAY-FANOUT-MUTEX` (`main.wiring.test.ts:1758`) is the ONLY
executable guard that KeyB's list contains `!dialogueView?.visible`. Verified: no count tooth covers
`dialogueView?.visible`; `main.ts` contains **zero** imports from `./ui/overlayRegistry` (only a comment at
`:415` mentions `canOpen`), so `OR-CANOPEN-GUARDONLY-9/-ALL` constrain a function with no production caller;
no e2e presses a hotkey while `dialogueView` is visible (`client/e2e/dialogue.spec.ts` only uses KeyT/Escape/KeyQ).
Deleting the source scan now = the ptc5c/ADR-0139 defect class unguarded by anything executable.
Both alternatives were rejected with evidence: "hotkeys-only first" is MORE expensive (needs open+hide thunks,
walks straight into the `dialogueView`-hide blocker, and detonates `HELP_VISIBLE_FLOOR`/`LEADERBOARD_LIVE_COUNT`/
`W-HELP-FANOUT-OPENGUARDS`/`W-TP-FANOUT-KEYN-GUARD`/`W-KEYM-HANDLER`); "full scope, drop AC-12" trades away the
only user-visible deliverable to buy an invisible refactor with two unsolved design problems.
The `/simplify` counter-proposal ("ship AC-12 alone, fold read+write into uxd3-c") is REJECTED: with the
bare-function probe type (A2) the probe table is authored ONCE — uxd3-c adds a **separate** open-thunk table
rather than rewriting this one — so simplify's "table authored twice" premise does not hold.

**AC-20 spec erratum to record in the ADR:** AC-20 as written (spec `:157`) says the source scan "SHALL be
replaced by a manifest-completeness test + a node-level `canOpen` invariant". Read literally, uxd3-a already
satisfied that and uxd3-b would be free to delete. The EARS never required a *caller*. Record this as an
erratum, and record `W-OVERLAY-FANOUT-MUTEX`'s retention as a **positive decision with evidence**, so uxd3-c
cannot delete it on the strength of AC-20's literal wording. **A third deferral is not acceptable** — uxd3-c
must be the immediate next slice.

### A2 — API: `OverlayProbes` + one function. NO factory, NO handle object.
Two independent lenses (reviewer H4/M1/M2, `/simplify` 1-3) converged: `OverlayHandle` as a one-member object
is *literally* `OverlayProbes`, which amendment A7 deleted from uxd3-a as YAGNI; `visibleIds()`/`isVisible(id)`
have ZERO uxd3-b consumers (same rule A15 used to delete `RECONNECT_HIDE`); `anyVisibleExcept` has one caller.
This deviates from the slice brief's literal naming (`OverlayHandle`/`OverlayHandles`/`createOverlayRegistry`
with `anyVisible`/`anyVisibleExcept`/`open`/`hide`/`hideAllExcept`) — **flag it prominently in the PR body and
ADR D1.** Shipping `open`/`hide`/`hideAllExcept` unconsumed is the exact YAGNI violation A7 rejected in this
same module one slice ago.

Ship exactly this, appended to `client/src/ui/overlayRegistry.ts`:

```ts
/** Per-id visibility probes. `Record<OverlayId, _>` ⇒ omitting an id is a COMPILE error,
 *  not a test failure. Each probe MUST read THIS overlay's own `visible` getter. */
export type OverlayProbes = Readonly<Record<OverlayId, () => boolean>>;

/** True iff any overlay other than `exempt` is currently visible (AC-7).
 *  Re-probes on EVERY call — nothing is cached, so it can be built at module scope
 *  before the views exist. NO try/catch on purpose: swallowing a throwing probe would
 *  return `false` silently, i.e. a mutual-exclusion breach that looks like working code. */
export function anyVisible(probes: OverlayProbes, exempt?: OverlayId): boolean {
  return OVERLAY_IDS.some((id) => id !== exempt && probes[id]());
}
```
Update the module header: it is no longer "zero imperative shell" — it now also owns the *shape* of the
probe table. Keep it DOM-free and node-testable.

### A3 — Boy-Scout T5 (Escape re-anchoring): **DROPPED, deferred to uxd3-c.**
Self-disclosed at ~70 lines / 4 hunks against the ~40-line / ≤3-hunk cap, it is atomic (T5.4 depends on
T5.1-3 so it cannot be trimmed to fit), and `W-UXD3-ESCAPE-ANCHOR-FIRST` is currently holding the line
correctly so nothing is unguarded. uxd3-c edits the KeyB/I/E guard lists those teeth would re-anchor onto,
so doing it there is strictly better-informed. **Record as a follow-up flag in the handoff + ADR.**
This slice therefore ships ZERO boyscout-attributed diff except the two comment-accuracy fixes in A11.

---

## §B. Files and edits

### B1 — `client/src/ui/overlayRegistry.ts`
Append §A2 verbatim. Nothing else changes.

### B2 — `client/src/ui/overlayRegistry.test.ts` — 2 new tests (NOT 5, NOT fast-check)
`/simplify`: over 15 ids the property is *enumerable*, so an exhaustive loop is strictly stronger than
fast-check sampling of 2^15 subsets, with no shrinking and no flake. fast-check stays for `canOpen`.

- **`OR-ANYVISIBLE-PROBES-EVERY-ID`** — build an all-`false` probe table; assert `anyVisible(p) === false`
  (anti-vacuity). Then for EACH `id ∈ OVERLAY_IDS`, flip exactly that one to `true` and assert
  `anyVisible(p) === true` with a message naming the id. Kills a probe table where any single id is never
  consulted (e.g. an `OVERLAY_IDS.slice(0,14).some(...)` impl).
- **`OR-ANYVISIBLE-EXEMPT`** — for EACH `id`: (a) `{only id true}` with `exempt=id` ⇒ `false`;
  (b) `{id true + one other true}` with `exempt=id` ⇒ `true`; (c) `{only id true}` with `exempt=<other>` ⇒
  `true`. Kills an `exempt` that is ignored, that exempts the wrong id, or that exempts everything.

### B3 — `client/src/main.ts` — 8 edits, ascending

| # | site | edit |
|---|---|---|
| **E1** | the existing `./ui/overlayRegistry` import (add one if absent) | add `anyVisible`, `type OverlayProbes` |
| **E2** | immediately above the JSDoc at `:240` (NOT above `:244` — do not orphan the doc comment) | the probe table, bounded by marker comments |
| **E3** | `:244-262` `anyOverlayVisible()` body | `return anyVisible(overlayProbes);` — keep the function NAME and its JSDoc |
| **E4** | `:696-716` reconcile emitter | `if (diverged && predictor.outstandingSteps === 0 && !anyOverlayVisible()) {` |
| **E5** | `:868`, `:894`, `:920` | DELETE the three `tradeView?.hide(); // mutual exclusivity: close trade overlay` lines |
| **E6** | `:1312-1332` movement suppression | `if (anyOverlayVisible()) { suppressNativeMovementDefault(e); return; }` |
| **E7** | `:1609-1623` pvp local | `const anyOverlayVisible = anyVisible(overlayProbes, 'pvpView');` |
| **E8** | the document click listener, AFTER `// UXD2-SHOPBTN-END` (`:1733`) and BEFORE `const btn = ...closest('[data-choice-idx]')` (`:1734`) | the AC-12 launcher branch, bounded by marker comments |
| **E9** | `:2490-2509` rAF re-issue | `if (predictor.outstandingSteps === 0 && !anyOverlayVisible()) {` |

**E2 exact form** (entries in `OVERLAY_IDS` declaration order; every entry byte-identical to the template):
```ts
// UXD3B-PROBES-BEGIN
// uxd3-b (ADR-0163): the ONE probe table. Every fan-out surface below reads visibility
// through it, so a 16th overlay is a COMPILE error here instead of 5 silent omissions.
// Each entry is intentionally byte-identical `<id>: () => <id>?.visible ?? false` —
// W-FANOUT-SURFACES-ROUTE-THROUGH-REGISTRY Part B pins that literal shape, because
// main.ts is coverage-excluded and a single negated or `?? true` probe would corrupt all
// five surfaces at once while every other tooth stayed green.
// ⚠ No quoted hotkey literal may appear in this block (W-UXD3-HOTKEY-ANCHORS-AFTER-KEYDOWN).
const overlayProbes: OverlayProbes = {
  battleView: () => battleView?.visible ?? false,
  boxView: () => boxView?.visible ?? false,
  raisingView: () => raisingView?.visible ?? false,
  evolutionView: () => evolutionView?.visible ?? false,
  dialogueView: () => dialogueView?.visible ?? false,
  questLogView: () => questLogView?.visible ?? false,
  healView: () => healView?.visible ?? false,
  shopView: () => shopView?.visible ?? false,
  tradeView: () => tradeView?.visible ?? false,
  pvpView: () => pvpView?.visible ?? false,
  leaderboardView: () => leaderboardView?.visible ?? false,
  renameView: () => renameView?.visible ?? false,
  tradeProposeView: () => tradeProposeView?.visible ?? false,
  helpView: () => helpView?.visible ?? false,
  menuView: () => menuView?.visible ?? false,
};
// UXD3B-PROBES-END
```
Safety confirmed: the fifteen `let xView` are declared at `:196-218`, above `:240`, so the object literal
never hits a TDZ; the arrows only evaluate on call and `?.` covers the pre-construction window. The earliest
callers are `store.onBatchApplied` listeners, which correctly get `false` for every id pre-construction.

**E8 exact form:**
```ts
// UXD3B-LAUNCHER-BEGIN
// uxd3-b (ADR-0163, AC-12): the click front door. Delegated on the data-attribute, the
// house idiom in this listener — so main.ts still never NAMES `help-hint` and acquires no
// reference to it (W-UX1-HINT-NO-JS-OWNER stays green verbatim; ADR-0151 D2's "no owner
// that can hide or remove it" survives). Gated on the same anyOverlayVisible() SSOT this
// slice builds, plus the identity guard the KeyM door carries (menuAvailability() reads
// store.ownCharacter(identity) and this listener has no try/catch).
if ((e.target as HTMLElement).closest('[data-menu-launcher]') !== null) {
  if (!anyOverlayVisible() && identity !== '') {
    held.clear();
    openMenu();
  }
  return;
}
// UXD3B-LAUNCHER-END
```

**Anchor hazards — do NOT touch:** the comment `Honor reconcile's documented divergence return` at
`main.ts:688` (`NH2_RECONCILE_START`; the nh2 rationale block at `:692-695` is a DIFFERENT comment);
`// Suppress movement input while an overlay is open.` (verbatim, `UXD3_SUPPRESS_START`);
`// Re-issue the held dir` (`NH2_RAF_START`); `const ownEntityId =` (`NH2_RAF_END`);
`const anyOverlayVisible =` (`UXD3_PVPAGG_START`); `const forceVisible =` (`UXD3_PVPAGG_END`);
`function anyOverlayVisible(` / `function characterTileMap(` (`UXD3_ANYOVERLAY_*`);
`predictor.outstandingSteps === 0 &&` as the LEADING conjunct of the rAF guard (`W-NH2-GATE-WIRED`'s
`opensWith`). NOT touched at all: `refreshBattle` (`:1391`), `onReconnect` (`:2408`), all 12 hotkey guard
lists, `activateMenuLeaf`.

### B4 — `client/index.html:114-119`
Replace the whole `#help-hint` div. Full style string (do NOT drop `z-index:50` — a clickable badge below
`#app` content would be unreachable):
```html
<!-- ux1 (ADR-0151 D2), amended by uxd3-b (ADR-0163 D4): persistent help affordance, now ALSO the
     click front door for the main menu (AC-12). Still zero-owner: main.ts binds by DELEGATION on
     [data-menu-launcher] and never resolves, mutates, hides or removes this element.
     bottom:16px STACKS it above #build-stamp (bottom:2px) rather than beside it — measured
     overlapping at 360px width. pointer-events:auto is what makes AC-12's click possible; the
     click surface is BOUNDED by width:max-content plus a single horizontal edge (left:6px), so
     the badge can never become a full-width strip that eats canvas clicks — the regression the
     superseded pointer-events:none blanket ban was written against. -->
<div
  id="help-hint"
  data-menu-launcher
  style="position:fixed;bottom:16px;left:6px;width:max-content;font:11px/1.3 monospace;color:#9aa0b4;pointer-events:auto;cursor:pointer;z-index:50"
>
  Press ? for controls &amp; help · M or click for menu
</div>
```
`W-ONE-CORNER-AFFORDANCE` stays green (still exactly `{build-stamp, help-hint}`; no element added).
H1/H2/H2b/H3/H5/H6/H7 stay green **unedited** (`data-menu-launcher` is an attribute, not an element child;
the text still contains `?` and `help`).

### B5 — `client/src/indexShell.test.ts` — H4 → H4b (replace in place; touch nothing else)
`H4b: #help-hint is fixed, deliberately clickable, and its pointer surface is BOUNDED.`
1. `position:fixed` — carried over from H4 **verbatim**.
2. `pointer-events:auto` present **explicitly** (not merely `:none` absent) — the only guard, in a
   layout-free happy-dom test, that the badge is clickable at all.
3. `width:max-content` present.
4. `bottom:` present, and **at most one** of `left:` / `right:` (implement by testing for the declaration
   `left:` / `right:` as a *declaration start*, so `padding-left:` does not false-positive).
5. **Growth deny-list** — the style contains NONE of `padding`, `min-width`, `max-width`, `height`,
   `inset:`, `transform`. Without this, `padding:0 50vw` / `min-width:100vw` / `height:100vh` /
   `inset:auto 0 16px 0` each keep `width:max-content` + one horizontal edge and still grow the hit box
   to a full-viewport click eater.
6. `data-menu-launcher` present on `#help-hint`, AND `doc.querySelectorAll('[data-menu-launcher]').length === 1`.
Anti-vacuity first, per this file's house style (with `#help-hint` absent, every deny-list check passes
vacuously — assert the element exists and has a non-empty inline style before judging it).
**Do NOT** assert `cursor:pointer` — no EARS criterion asks for it and discoverability is already carried
by the hint text, which H3 pins. Keep the declaration in the HTML.

**Honesty, to be stated in ADR-0163 D4 and in the test's own comment:** H4b is NOT strictly stronger than H4
on the click-eating axis. AC-12 requires the click, so a blanket `pointer-events:none` ban is no longer a
satisfiable invariant. H4b trades the blanket ban for a *bounded* surface plus four assertions H4 never made.
Record it as an **amendment to ADR-0151 D2**, not as a silent test edit.

### B6 — `client/src/main.wiring.test.ts`

#### NEW `W-FANOUT-SURFACES-ROUTE-THROUGH-REGISTRY` — one `describe`, three `it`s

**Part A — `…-ROUTES`.** Per surface, assert the EXACT CONTIGUOUS SHAPE after `squashWhitespace`, not mere
token presence. *(red-team F1: presence-only lets a one-character `!` inversion keep every tooth green while
killing all movement — `if (!anyOverlayVisible()) { suppressNativeMovementDefault(e); return; }` — and lets
the result be discarded entirely: `anyOverlayVisible();` on its own line.)*

| # | region | helper | needle (contiguous, post-`squashWhitespace`) |
|---|---|---|---|
| 1 | `UXD3_ANYOVERLAY_START` → `_END` | `bodyRegion` | `return anyVisible(overlayProbes);` |
| 2 | `NH2_RECONCILE_START` → `_END` | `bodyRegion` | `predictor.outstandingSteps === 0 && !anyOverlayVisible()` |
| 3 | `UXD3_SUPPRESS_START` → `_END` | `bodyRegion` | `if (anyOverlayVisible()) { suppressNativeMovementDefault(e); return; }` |
| 4 | `UXD3_PVPAGG_START` → `_END` | **`regionOrThrow`** | `const anyOverlayVisible = anyVisible(overlayProbes, 'pvpView');` |
| 5 | `NH2_RAF_START` → `_END` | `bodyRegion` | `if (predictor.outstandingSteps === 0 && !anyOverlayVisible())` |

- **Surface 4 MUST use `regionOrThrow`, not `bodyRegion`** (reviewer B1): `bodyRegion` drops the region's
  first line by design (`main.wiring.test.ts:2337`, `raw.slice(nl + 1)`), and after E7 the whole surface IS
  that first line — `bodyRegion` would either throw on the single-line guard or return whitespace, i.e. a
  vacuous green on the zero-residue half. The START anchor here is code, not a comment, so the first-line
  drop is unnecessary. Apply `stripLineComments` to the slice explicitly.
- **Surface 3 must NOT `expectUniqueAnchor` its END anchor** (red-team P2): `const dir = KEY_DIR[e.code];`
  occurs twice in `main.ts` (keydown + keyup) — documented at `main.wiring.test.ts:1970-1976`.
  `regionOrThrow` searches END from START so it resolves correctly. Instead carry `W-NH1-SUPPRESS`'s control
  **verbatim**: `rawRegion.includes("addEventListener('keyup'") === false`.
- **Surface 3 additionally carries `W-MENU-FANOUT-KEYDOWN`'s nh1 half character-for-character** from
  `main.wiring.test.ts:4661-4679`: `suppressNativeMovementDefault(e)` present and its index **less than**
  the index of `return;`. This is the highest-risk copy in the slice (R2: losing it silently reverts
  ADR-0146, the playtest-blocking movement bug).
- **Per-region anti-vacuity**, each with its own identity marker: s1 `characterTileMap` bound + region
  non-empty; s2 `reissueDir(`; s3 `suppressNativeMovementDefault(e);` + the keyup control; s4 region
  non-empty + `expectUniqueAnchor` on BOTH endpoints (both are unique); s5 `reissueDir(`.
- **No per-region zero-residue clause.** The exact contiguous shape needles already forbid an appended
  `|| x?.visible` term (the needle requires `)` immediately followed by ` {` / `;`), so it is redundant with
  Part C — `/simplify` 4.

**Part B — `…-PROBE-TABLE`.** `main.ts` is coverage-excluded (`client/vite.config.ts:97`), so this is the
ONLY guard on the table. Slice between `// UXD3B-PROBES-BEGIN` and `// UXD3B-PROBES-END` with
`regionOrThrow` + `squashWhitespace` (NO `new RegExp` — Semgrep `detect-non-literal-regexp` is banned in
this file; and `squashWhitespace` makes the assertion immune to biome re-wrapping).
- For EVERY `id ∈ OVERLAY_IDS` (imported from `../src/ui/overlayRegistry` — a **static** import, so the set
  is bidirectional and cannot drift): the region contains the exact literal
  `` `${id}: () => ${id}?.visible ?? false` ``.
  *(red-team F2 — this replaces the plan's "key equals the identifier read" parser, which is BOTH weaker
  and more code. It kills `?? true` (every probe true pre-construction ⇒ movement dead, reconcile/rAF
  re-issue dead, PvP auto-show dead, the AC-12 launcher a dead button), `!x?.visible`, `x?.visible === false`,
  `x !== undefined`, and every precedence trap in one assertion.)*
- `countOccurrences(region, '?.visible ?? false') === OVERLAY_IDS.length` — no 16th smuggled entry.
- The region contains **no** `...` (spread) — red-team F3: `{ ...BASE, menuView: () => false }` would show
  15 correct literals and ship a poisoned table.
- `countOccurrences(wholeFileStripped, 'const overlayProbes') === 1` — no shadow table.
- Anti-vacuity: region non-empty and `OVERLAY_IDS.length === 15`.

**Part C — `…-NO-HAND-ROLLED-OR-LIST`** (whole file, the ceiling that replaces the retired floors):
```
const stripped = squashWhitespace(stripLineComments(readMainTs()));
const exempted = stripped.split("?.visible || identity === ''").join('');
expect(countOccurrences(stripped, "?.visible || identity === ''")).toBeGreaterThanOrEqual(6); // anti-vacuity floor
expect(countOccurrences(exempted, 'View?.visible ||')).toBe(0);
```
MEASURED on the current tree: 75 total `View?.visible ||`; 6 are the refresh-listener idiom
`if (!xView?.visible || identity === '') return;` at `main.ts:1357, 1371, 1383, 1557, 1589, 1637`; 69 are
the five OR-lists. Excising the named idiom *first* makes the ceiling a true **0** that stays stable as
overlays are added (`/simplify` — a bare `toBe(6)` would need recalibrating the day a 16th overlay gets a
batch listener, which is exactly the recalibration this tooth exists to end). Enumerate the six sites in the
tooth comment.
**Honest scope, to be written into the tooth comment AND ADR-0163 D3** (red-team F9): the ceiling sees only
the `||` spelling. A de-Morgan `&&`-chain, `[a,b].some(v => v?.visible)`, a `||=` accumulator, an aliased
`const h = helpView`, or a ternary chain are all invisible to it. The `&&` form in particular is what all 12
hotkey guard lists already use, so it is the most likely shape a future author reaches for. State this rather
than claiming the ceiling "kills a new sixth surface anywhere".

#### NEW `W-UXD3B-LAUNCHER-BRANCH-IS-READ-ONLY`
Region-bounded by `// UXD3B-LAUNCHER-BEGIN` / `// UXD3B-LAUNCHER-END` (`regionOrThrow`, then
`stripLineComments` + `squashWhitespace`; `expectUniqueAnchor` both markers).
- Positive: region contains `closest('[data-menu-launcher]')`, `openMenu(`, `held.clear()`, and — as ONE
  contiguous needle — `if (!anyOverlayVisible() && identity !== '')`.
  *(red-team F4: without the full-guard needle, `void anyOverlayVisible(); held.clear(); openMenu();` passes
  and opens the menu over a live battle/dialogue AND pre-join. `W-KEYM-HANDLER` cannot help — it slices only
  the KeyM block, ~500 lines above this listener, and the click listener has no try/catch.)*
- **Method allow-list, not a deny-list** (red-team F5): scan the region for every `.<identifier>(` token and
  assert the set is a subset of `{closest, clear, openMenu, anyOverlayVisible}`. A deny-list of nine verbs
  misses `.removeAttribute(` (note `.remove(` does NOT substring-match it), `.dataset`, `.replaceWith(`,
  `.append(`, `.insertAdjacentHTML(`, `.toggleAttribute(`, `.setHTMLUnsafe(`, `el['style']`. Also assert the
  region contains no `.dataset` and no `[` -indexed member access, and cap `region.length < 400`.
- Whole file: `countOccurrences(readMainTs(), 'data-menu-launcher') === 1` — one binding site. **This clause
  is doing all the work** behind the claim that ux1-1's structural guarantee is now double-guarded; it must
  not be the first thing dropped under budget pressure.
- Anti-vacuity: region non-empty; at least one `.`-method token found (so the allow-list check is not
  vacuously satisfied by an empty set).

#### RETIRE — delete the `it` blocks (never `.skip`/`.only`/comment-out), plus now-orphaned constants
16 tests: `W-RN-FANOUT-COUNT` (`:711`), `-RECONCILE` (`:726`), `-KEYDOWN` (`:747`), `-RAF` (`:767`),
`-PVP` (`:791`); `W-TP-FANOUT-COUNT` (`:1034`), `-RECONCILE` (`:1046`), `-KEYDOWN` (`:1066`), `-RAF` (`:1083`),
`-PVP` (`:1103`); the leaderboard parity self-check (`:1340`); `W-HELP-FANOUT-COUNT` (`:1351`),
`-KEYDOWN` (`:1371`), `-RECONCILE` (`:1390`), `-RAF` (`:1412`), `-PVP` (`:1442`).
Plus the 5 uxd3-a anti-collapse teeth folded into Part A: `W-MENU-FANOUT-ANYOVERLAY` (`:4589`),
`-KEYDOWN` (`:4617`), `-RECONCILE` (`:4682`), `-RAF` (`:4704`), `-PVP` (`:4724`).
Plus orphaned constants (reviewer M6 — otherwise `noUnusedVariables` reds mid-retirement):
`LEADERBOARD_VISIBLE_COUNT` (`:709`), `RENAME_VISIBLE_COUNT` (`:1032`), `HELP_VISIBLE_FLOOR` (`:1325`),
`LEADERBOARD_LIVE_COUNT` (`:1338`). Delete a `describe` wrapper only when it goes fully empty.
**RETAINED (→ uxd3-c):** `W-HELP-FANOUT-BATTLE` (`:1464`), `W-HELP-FANOUT-OPENGUARDS` (`:1537`),
`W-OVERLAY-FANOUT-MUTEX` (`:1758`), `W-RN-FANOUT-RECONNECT` (`:808`), `W-TP-RECONNECT` (`:1135`),
`W-TP-FANOUT-KEYN-GUARD` (`:1120`), `W-HELP-NO-RECONNECT-HIDE` (`:1566`), `W-RECONNECT-HIDES-MENU` (`:4910`),
`W-BATTLE-FORCEHIDE-SET-MATCHES-MANIFEST` (`:4775`), `W-UXD3-ESCAPE-ANCHOR-FIRST` (`:5327`),
`W-UX1-HINT-NO-JS-OWNER` (`:2640`), `W-ONE-CORNER-AFFORDANCE` (`:5253`).

**AC-20 honesty — MUST go in ADR-0163 D2 (red-team F7/F8), the merge audit checks this claim:**
`W-RN-FANOUT-COUNT` and `W-TP-FANOUT-COUNT` are floors of **≥17** and the post-collapse counts are exactly
**17** (22 − 5), so they would stay **GREEN**. Their deletion is therefore a **deliberate removal of live
coverage**, not a forced consequence of the collapse. It is justified — `W-OVERLAY-FANOUT-MUTEX` (retained)
is strictly stronger on the hotkey axis, and `W-RN-FANOUT-RECONNECT` / `W-TP-RECONNECT` / `W-RN-ESCAPE` /
`W-TP-ESCAPE` / `W-BATTLE-FORCEHIDE-SET-MATCHES-MANIFEST` cover the rest — but it must be stated as a
decision, not narrated as a detonation. Likewise state the ONE genuine net loss: the leaderboard parity
self-check (`:1340`) was the file's only exact-count *ceiling* on an overlay token, and Part C does not
replace it (Part C's needle is `View?.visible ||`; a new guard-form `!leaderboardView?.visible &&` site is
invisible to it).

---

## §C. Ordered tasks

- **T0** baseline `just ci` — DONE, green, 1755 tests, exit 0. Census DONE: 75 / 6 / 69.
- **T1 (tester)** author, in one pass, all NEW tests: `overlayRegistry.test.ts` B2; `main.wiring.test.ts`
  Part A/B/C + `W-UXD3B-LAUNCHER-BRANCH-IS-READ-ONLY`; `indexShell.test.ts` H4→H4b. **No implementation.**
  Orchestrator then runs the suite and records the RED list (testers have no Bash).
- **T2 (specialist)** implement B1 (`overlayRegistry.ts`), B3 (`main.ts` E1-E9), B4 (`index.html`) red→green.
  **MUST NOT edit any `*.test.ts` file.** Order: E1+E2 → run; E3 → run; E4, E6, E7, E9 one at a time with a
  run between each (this is where an anchor comment gets accidentally eaten); E5; E8 + B4.
- **T3 (orchestrator)** capture the RED receipt for the 16+5 obsolete teeth, then perform the mandated
  retirement + orphaned-constant deletion. Full `just ci`.
- **T4** review lenses on the CODE (reviewer + red-team in parallel), domain lens (desync-guard), verifier.
- **T5 (doc-keeper)** ADR-0163, `docs/knowledge/**`, `ARCHITECTURE.md`. Then `just adr-digest` + `just knowledge`
  + full `just ci` again.

## §D. ADR-0163 decisions to record
**D1** the read-only substrate API and why `open`/`hide`/`hideAllExcept`/`visibleIds`/`isVisible`/the handle
object are NOT in it (A7 + A15 precedent, applied to this slice's own brief) — plus the deviation from the
brief's literal naming. **D2** the uxd3-b/uxd3-c cut, its *correctness* argument, the AC-20 spec erratum, the
positive decision to retain `W-OVERLAY-FANOUT-MUTEX`, the deliberate (not forced) deletion of the two COUNT
floors, and the one genuine net loss. **D3** Part C's ceiling idiom, its named exemption, and its honest
`||`-only scope. **D4** the AC-12 front door: attribute delegation over id lookup, and the H4→H4b trade as an
explicit **amendment to ADR-0151 D2**. **D5** the E5 deletion proof, two-step: (a) the guard `!tradeView?.visible`
means the hide only ran while already hidden; (b) *hidden ∧ `#pending === true`* is unreachable, because
`TradeView.hide()` (`client/src/ui/tradeView.ts:67-72`) is NOT a pure display setter — it also clears the
double-send lock `#pending` (ADR-0107 depends on that on reconnect) and `#lastRenderKey`, and `#pending` is
set only in a click handler on a visible view (`tradeView.ts:163-167`). **D6** AC-12's mechanism deferral,
stated like uxd3-a's AC-11 deferral: this slice gates the click on `anyOverlayVisible()`, not on
`canOpen('menuView')` — behaviourally equivalent today, mechanism → uxd3-c. **D7** the two front doors diverge
by design: KeyM toggles and exempts `menuView`; the click branch gates on `anyOverlayVisible()`, which
*includes* `menuView`, so clicking the badge with the menu open is a deliberate dead click. **D8** the deferred
Escape re-anchoring boy-scout and why uxd3-c is the better home. **Consequences must state that
`M-postgate-overlay-registry` is STILL not retired** and that uxd3-c must be the immediate next slice.

## §E. Hidden dependencies — NONE required
Verified untouched and not needed: `client/vite.config.ts`, `evals/**`, `client/e2e/**`,
`client/src/ui/helpModel.ts`, `client/src/ui/menuView.test.ts`, `client/src/ui/{box,raising,evolution}View.ts`.
Two near-misses to DISCLOSE, not touch: `docs/adr/README.md:13` (stale next-free `0162` — the supervisor owns
the ADR index and repo precedent makes it a separate chore PR), and the harness-side
`specs/monster-realm-v2/PLAN.md` §9 (outside this repo — orchestrator/handoff item).

---

## RUN STATE (final — 2026-07-31T06:50Z)

**STATUS: TERMINAL — PR#267 open, local `just ci` + `just e2e` both green, remote CI running. NOT merged (supervisor-owned).**
https://github.com/mdrewt/monster-realm/pull/267 · branch `feat/uxd3-b-overlay-registry-substrate` · worktree `.claude/worktrees/uxd3-b` · ADR-0163.

**DONE:** full loop — planner → reviewer + red-team + /simplify on the plan → tester (RED, orchestrator-verified) →
separate implementer (red→green) → reviewer + red-team on the shipped code → orchestrator-owned retirement of the 21
obsolete teeth → verifier PASS → ADR-0163 + ARCHITECTURE + adr-digest → PR. `just ci` exit 0 (1740 client tests, 74 evals);
`just e2e` exit 0 (44/1 skipped, isolated DB, cleaned up); coverage 98.16% vs 96 floor.

**REMAINING:** nothing for this slice. The supervisor merges on remote CI.

**BLOCKERS:** none.

**NOTE — the §A adjudication above is what SHIPPED, with two further changes made during execution:**
1. A3's boy-scout drop held (Escape re-anchoring → uxd3-c).
2. Post-implementation red-team found 8 CI-green survivors; all 8 teeth were strengthened and each mutation re-measured
   red. The verifier then corrected one factual overstatement in ADR-0163 D2 (two, not four, `*-FANOUT-PVP` teeth were
   already vacuous on master).

**NEXT SLICE:** uxd3-c, fully specified in ADR-0163 D2/D7/D8 and in the handoff entry of the same timestamp. It is the last
piece of `M-postgate-overlay-registry` and should be the immediate next slice — a third deferral of AC-20 is declared
unacceptable in the ADR.
