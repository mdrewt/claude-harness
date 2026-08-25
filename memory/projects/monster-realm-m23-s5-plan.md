# m23-s5 — Plan of record (M23 S5, the sole `client/src/main.ts` touch)

Worktree: `projects/monster-realm/.claude/worktrees/m23-s5`, branch `slice/m23-s5`, fork `78e2bb2`.
Spec: `specs/monster-realm-v2/M23-accessibility.spec.md` §2.3/§2.4/§4/§5.5/§5.7/§6/§12.
EARS owned: **A11Y-19, A11Y-20, A11Y-21, A11Y-35, A11Y-22, A11Y-23**.
ADR: **0206** (supervisor-assigned).

## Facts verified at fork (not inferred)

| Fact | Verdict |
|---|---|
| 12 `overlayVerdict(...)` hotkey sites (`main.ts:1102/1115/1127/1140/1153/1167/1181/1198/1215/1252/1271/1286`) + a 13th CLICK site `:1835` | CONFIRMED |
| `a11yCopy.ts:76` already ships `'a11y.world.region': 'World map'` (m23-s4) | CONFIRMED — S1's "A11Y-22 structurally unsatisfiable" note is **STALE** |
| `targetOwnsKey` (main.ts:1039) returns true for Space on BUTTON | CONFIRMED |
| A native `<button>` survives the movement suppressor | **FALSE** — the terminal `if (e.code === 'Space') { jump(); e.preventDefault(); }` at `main.ts:1421-1424` is NOT exempt and cancels native activation. A11Y-23 needs the fix in §1.6. |
| `WorldRenderer` exposes a canvas accessor | NO (only `viewCount`, `render/world.ts:212`) → `mount.querySelector('canvas')` |
| `indexShell.test.ts` hardcodes the `div` tag | NO — all teeth are tag-agnostic. But H4b's `BOUNDED_SURFACE_ALLOWED_PROPS` (`:474-484`) bans `background`/`border`/`padding`. |
| `main.wiring.test.ts` edits avoidable | **NO** — `W-UXD3C-OPENGUARDS-ROUTE-THROUGH-CANOPEN` (`:5872-5994`, table `:5619-5870`) pins all 13 open-handler bodies by EXACT EQUALITY. |

**13th site (`[data-menu-launcher]` click, `main.ts:1834-1840`) gets NO conjunct.** On a click
`document.activeElement` is the badge, so `worldHasFocus()` is false and the front door would gate
itself off — precisely the A11Y-23 regression. §2.3 scopes the gate to the twelve **hotkey** branches.

## 1. Design

### 1.1 `worldCanvasEl` + `worldHasFocus` — module scope, at `main.ts:1051`

```ts
let worldCanvasEl: Element | null = null;   // set once in main(), after renderer.init
const worldHasFocus = (): boolean => {
  const a = document.activeElement;
  return a === null || a === document.body || a === worldCanvasEl;
};
```
Verbatim from spec §2.3. The `=== document.body` disjunct is LOAD-BEARING (A11Y-35).
**Pre-init is SAFE:** `worldCanvasEl === null` + `activeElement === <body>` ⇒ `true` ⇒ hotkeys behave
byte-identically to the fork. No deadlock window.
**Placement is region-safe:** no `regionOrThrow` uses `window.addEventListener('keydown'` as an END
needle. `W-UXD3-HOTKEY-ANCHORS-AFTER-KEYDOWN` (`:4800-4845`) forbids any quoted hotkey literal before
`main.ts:1052` — **the new comment must name keys in prose only.**

Assignment inside `main()` at `main.ts:2182`, right after `await renderer.init(mount, rawMap);`:
```ts
worldCanvasEl = mount.querySelector('canvas');
```
(`render/world.ts:72` appends `app.canvas` to `mount`; `:81-83` sets role/tabindex/aria-label.
`render/world.ts` is out of `touches:`, so `querySelector` is the only in-touches route.
`document.querySelector('[role="application"]')` is rejected as more fragile — S6/S9 could add roles.)

### 1.2 The twelve conjuncts — one repeated shape, appended LAST

**No shared `canOpenAndFocused()` helper.** `main.ts:378-380` states the repo rule: "each call site
spells `.kind === 'allow'` itself, deliberately, so no single `!` can invert eleven gates at once."
A helper re-creates that single point of inversion for twelve gates; it also hides the gate from the
twelve exact-equality pins. Repetition also makes the census tooth trivial (`worldHasFocus()` × 12).

The conjunct is ALWAYS the last term — `W-KEYM-HANDLER` (`:4070`) pins the contiguous substring
`overlayVerdict('menuView').kind === 'allow' && identity !== ''`.

| Site | line | new guard |
|---|---|---|
| KeyB | 1103 | `if (boxVerdict.kind === 'allow' && worldHasFocus()) {` |
| KeyI | 1116 | `if (raisingVerdict.kind === 'allow' && worldHasFocus()) {` |
| KeyE | 1128 | `if (evolutionVerdict.kind === 'allow' && worldHasFocus()) {` |
| KeyQ/U/P/L/N/`?`/C | 1140/1153/1167/1181/1198/1252/1286 | `if (overlayVerdict('<id>').kind === 'allow' && worldHasFocus()) {` |
| KeyO | 1215 | `... 'tradeProposeView' ... && identity !== '' && worldHasFocus()) {` |
| KeyM | 1271 | `... 'menuView' ... && identity !== '' && worldHasFocus()) {` |

**KeyT (`main.ts:1238`) does NOT get it** — not a `canOpen`-derived guard (`:1235-1237`), exempt by §2.3.

### 1.3 Live region singleton + the frame-loop pump

Module scope beside `worldCanvasEl`:
```ts
const liveRegion = new LiveRegion();
let lastA11ySnapshot: A11ySnapshot = { topOverlay: null, message: '' };
```
Frame loop, inside the `try`, at the END of the body (after the interact-prompt block, before `} catch`):
```ts
// M23S5-A11YSNAPSHOT-BEGIN
const top = visibleIds(overlayProbes)[0] ?? null;
const nextSnapshot: A11ySnapshot = { topOverlay: top, message: '' };
for (const m of announcementsFor(lastA11ySnapshot, nextSnapshot)) liveRegion.announce(m, now);
if (lastA11ySnapshot.topOverlay !== null && top === null) {
  liveRegion.announce(t('a11y.world.region'), now);
  if (worldHasFocus() && worldCanvasEl instanceof HTMLElement) worldCanvasEl.focus();
}
lastA11ySnapshot = nextSnapshot;
liveRegion.flush(now);
// M23S5-A11YSNAPSHOT-END
```
Decisions:
- **Pump goes AFTER the `sessionGateBlocks()` early return (`:2696`)**, reusing the frame's existing
  `const now = performance.now()` (`:2697`) — `liveRegion.ts:31-38` demands a monotonic clock and bans
  `Date.now()`. Session-blocked frames produce no transitions; the only effect is that a message pending
  when the session died is not spoken over the terminal screen (better, not a regression). Anything above
  the gate would also sit in front of the pinned `W-M21B2-FRAME-GATE` ordering.
- **The Escape ladder is NOT touched at all.** `announcementsFor`'s own edge detection (`announcements.ts:57`)
  turns "overlay N is now on top" into one message on the next frame (≤16 ms; the region is `polite` and
  500 ms-coalesced). This also covers store-driven closes (`dialogueView.render(null)`), hotkey
  toggle-closes and force-hide switches for free — a per-branch wiring would miss all three.
- **Double-announce is impossible by construction:** `announcementsFor` emits only when
  `next.topOverlay !== null`; main.ts's world branch fires only when `top === null`. Disjoint predicates,
  pinned by tripwire test T-6.
- **`message: ''` is permanent for this slice.** §2.4 transitions (3) battle outcome and (4) NPC prompt /
  zone change have no producer in S5's EARS set. The field stays so a later slice needs no API change.

### 1.4 Focus return — in the same frame-loop edge, not the Escape ladder

The view's own `hide()` already calls `closeOverlayA11y(id, null)` (S3/S4 pass `null`,
`overlayA11y.ts:135`). Its restore order (`:146-149`) prefers `record.returnFocus` **if connected** —
and for a hotkey-opened overlay that is `document.body`, which IS an `HTMLElement` and IS connected.
So `closeOverlayA11y` calls `document.body.focus()` and focus **never reaches the canvas**; the
`fallbackFocus` parameter is unreachable on the common path. That is the concrete reason S5 must do the
focus return itself, and it must be written down — it looks like a redundant second mechanism and is not.
Guarding on `worldHasFocus()` is what makes it non-stealing (badge-opened menu → `returnFocus` is the
badge → `worldHasFocus()` false → S5 leaves it alone).

### 1.5 `overlayProbes` occurrence budget

`main.wiring.test.ts:5293-5301` pins `countOccurrences(stripped,'overlayProbes') === 5` exactly, with
"Raise this number ONLY together with a new surface assertion in Part A." The snapshot adds a 6th read
⇒ bracket it in `M23S5-A11YSNAPSHOT-BEGIN/END`, add a new Part-A exact-equality surface assertion
(idiom of surfaces 6/7 at `:5086`/`:5112`), raise 5 → 6. Additive and strictly strengthening.

### 1.6 The Space fix — required by A11Y-23

`main.ts:1421-1424` currently steals Space from a focused `<button>`. Minimal fix, reusing the helper
whose documented contract is exactly this (`main.ts:1027-1032`):
```ts
  if (e.code === 'Space') {
    if (!targetOwnsKey(e)) {
      jump();
      e.preventDefault();
    }
  }
```
**Do not rewrite the `if` line** — `MVI_KEYDOWN_END = "if (e.code === 'Space') {"` (`:2733`) is a region
fence. Nesting preserves it byte-for-byte.
**Declared behaviour change:** Space no longer jumps while a `<button>`/`<a>` has focus — the same latent
bug `main.ts:1029-1032` already documents. Declared in the PR, not slipped in.

### 1.7 `#help-hint` → native `<button>` (`client/index.html:137-143`)

```html
<button id="help-hint" type="button" data-menu-launcher
  style="position:fixed;bottom:16px;left:6px;width:max-content;font:11px/1.3 monospace;color:#9aa0b4;pointer-events:auto;cursor:pointer;z-index:50;background:none;border:0;padding:0">
  Press ? for help · click or M for menu
</button>
```
`background:none;border:0;padding:0` are the only three added declarations; without them the badge ships
as a grey OS button with `#9aa0b4` on `ButtonFace` (~2:1) — a contrast regression in an a11y slice.
`styles.css` cannot help (A11Y-12 bans `#id` selectors there; it is also out of `touches:`).

Consequences:
- **`indexShell.test.ts` H4b allow-list** (`:474-484`) lacks `background`/`border`/`padding`, and
  `border`/`padding` are named growth knobs in its own kill list (`:504-505`). Truthful re-pin: allow
  `background` outright (cannot change the hit box); allow `border`/`padding` **plus a value clause**
  asserting `border ∈ {0, none}` and `padding === 0`. `border:50vw solid transparent` and
  `padding:0 50vw` still fail. Strictly stronger than a blanket allow.
- **`main.wiring.test.ts` `W-ONE-CORNER-AFFORDANCE` (`:4651-4750`) BREAKS**: `bodyDivs()` selects
  `body > div`, so the button drops out and both the `>= 2` anti-vacuity floor and the exact-set
  assertion red. Widen to `'body > div, body > button'` (rename `bodyBoxes`) — strictly strengthening
  (a future corner affordance shipped as a `<button>` was previously invisible). Also correct the stale
  "There is no CSS file anywhere in this repo" comment at `:4656`, which `indexShell.test.ts:68-70`
  explicitly hands to S5.

### 1.8 Wiring-test pins the diff must keep green

`W-UXD3C-OPENGUARDS` (12 of 13 `expectedRaw` re-pins, KeyT untouched) · `W-ONE-CORNER-AFFORDANCE`
(selector) · `overlayProbes` count 5→6 + new surface · `W-KEYM-HANDLER` contiguous needle (conjunct last)
· `W-M21B2-SESSION-GATE-FIRST` (`:9562`) · `W-M21B2-FRAME-GATE` (`:9784`) · `W-UX1-HINT-NO-JS-OWNER`
(`:2125`, RAW pin — main.ts must never contain the string `help-hint`, not even in a comment) ·
`data-menu-launcher` exactly once (`:5576`) · `W-UXD3-HOTKEY-ANCHORS-AFTER-KEYDOWN` (`:4800`) ·
`W-UXD3-ESCAPE-ANCHOR-FIRST` (`:4759`) · `UXD3C_OVERLAYREGISTRY_IMPORT` exact import line (`:5251`) ·
`MVI_KEYDOWN_END` fence (`:2733`) · frame-region teeth (`:1984/:3703/:8904`) · `stripped > raw/2`
collapse guard · `W-UXD3C-BATTLEHIDE` (`:4212/:5112`).

## 2. Named anti-patterns

1. Gating the whole listener (refuted on three citations, §2.3).
2. Dropping the `document.body` disjunct (A11Y-35).
3. A shared `canOpenAndFocused()` helper (one `!` inverts twelve gates).
4. Conjunct anywhere but last (reds `W-KEYM-HANDLER`).
5. Announcing per frame (the edge lives in `announcementsFor` + one disjoint branch).
6. A second announce path on the Escape ladder (double utterance).
7. `new RegExp` anywhere (Semgrep `detect-non-literal-regexp`, bitten twice).
8. Comment-heavy hunks (the `stripped > raw/2` collapse guard).
9. Naming a hotkey literal above `main.ts:1052`.
10. `document.getElementById('help-hint')` — or the string `help-hint` at all — in main.ts.
11. Blanket-widening H4b's allow-list.
12. Editing `announcements.ts` to close the null-copy gap (out of touches AND double-announces).
13. Passing the canvas as `closeOverlayA11y`'s `fallbackFocus` and calling it done (unreachable, `:147`).

## 3. Acceptance ledger — X1..X12 (see `memory/projects/gates/m23-s5.gates.md`)

Shared CHECK shape: run a real vitest spec with `--reporter=json --outputFile=…`, then a `node -e`
that requires the JSON, filters `assertionResults` by a NEEDLE, and prints a TOKEN **only if
`matches.length >= 1 && every(passed)`**. A missing spec file yields `numTotalTests:0` and exit 0 —
the `>= 1` clause is what kills that vacuity.

X1 A11Y-19 · X2 A11Y-20 · X3 A11Y-21 · X4 A11Y-35 · X5 A11Y-22 · X6 A11Y-23 markup ·
X7 A11Y-23 activation · X8 body-disjunct exact shape · X9 twelve-and-only-twelve conjuncts ·
X10 live-region pump after the session gate · X11 focus return + announce-path disjointness ·
X12 diff ⊆ declared touches + companions.

## 4. Test plan (for the `tester`)

Files: **`client/src/main.a11yFocus.test.ts` (NEW)** + additive teeth in `main.wiring.test.ts` +
the H4b re-pin in `indexShell.test.ts`.

- **T-1 (FIRST, time-boxed):** runtime-import harness spike, modelled on `main.battle-reseed.test.ts:1-160`
  (happy-dom; mocks for the wasm pkg, `./net/connection`, telemetry, `./render/world`; the listener-cleanup
  harness — module-scope listeners STACK across `vi.resetModules()`). Two deltas: `#app` MUST exist (the
  precedent omits it), built by parsing the REAL `client/index.html` with `DOMParser` +
  `replaceChildren` (never `innerHTML`, ADR-0135); the `./render/world` mock's `init(mount)` must append a
  `<canvas tabindex="0">` so `mount.querySelector('canvas')` resolves. **If it fails inside the box, stop**
  and degrade X1/X2/X4/X5/X7/X11 to source-scan + DEFER to S11.
- **T-2** `S5-GATE-BLOCKS-WHEN-OVERLAY-FOCUSED` (A11Y-19) — parameterised over all twelve keys so an
  eleven-of-twelve implementation reds.
- **T-3** `S5-GATE-ALLOWS-FROM-WORLD` (A11Y-20) — body AND canvas focus; kills `a === worldCanvasEl`-only
  and an inverted conjunct.
- **T-4** `S5-BODY-BLUR-KEEPS-HOTKEYS-LIVE` (A11Y-35) — kills dropping the body disjunct.
- **T-5** `S5-ESCAPE-ANNOUNCES` (A11Y-22) — kills the pump omitted (the S1 cliff), the pump outside rAF,
  and `Date.now()` passed to `flush`.
- **T-6** `S5-ANNOUNCE-PATHS-DISJOINT` — pure tripwire: reds THIS slice's owner if someone later closes
  S1's copy gap inside `announcements.ts` while main.ts's branch still exists.
- **T-7** `S5-CANVAS-FOCUS-RETURN` — kills an unguarded `worldCanvasEl?.focus()` (steals from the badge)
  and the "pass the canvas as fallbackFocus" non-fix.
- **T-8** `S5-SPACE-NOT-STOLEN-FROM-BUTTON` (A11Y-23 activation) — kills shipping the button without the
  `targetOwnsKey` guard.
- **T-9** `W-M23S5-WORLDHASFOCUS-EXACT` [SCAN] — exact equality against the §2.3 literal.
- **T-10** `W-M23S5-SESSION-GATE-PRECEDES-WORLDFOCUS` (A11Y-21) [SCAN] — code-aware (`m20cScan`) index
  ordering + `worldHasFocus()` occurs exactly 12× in the keydown region. *Stronger tier fails because the
  session-gate early return is behaviourally indistinguishable from a denied gate, and main.ts is
  coverage-excluded (`client/vite.config.ts:97`).*
- **T-11** `W-M23S5-LIVEREGION-PUMP` [SCAN] — pinned region + `sessionGateBlocks(` before `liveRegion.flush(`
  + `new LiveRegion(` exactly once.
- **T-12** the twelve `expectedRaw` re-pins + KeyT negative (proof of teeth: add the conjunct to KeyT, confirm red).
- **T-13** H4b re-pin (proof of teeth: `padding:0 50vw` / `border:50vw solid transparent` must still red).
- **T-14** `W-ONE-CORNER-AFFORDANCE` selector widening (proof of teeth: a second fixed `<button>` must red it).

**Un-meetable inside `just ci`, DEFER to S11's nightly `just a11y-e2e` — do not fake:** real AT/browser
key delivery under `role="application"`; native `<button>` Space→click synthesis; the actual Tab order
canvas → `#help-hint` (happy-dom does no sequential focus navigation); whether the region is *spoken*.

## 5. Hidden dependencies (STOP candidates) and `touches-delta:`

| File | Temptation | In-touches alternative |
|---|---|---|
| `ui/announcements.ts` | close the `top → null` copy gap "where it belongs" | the disjoint branch in main.ts + tripwire T-6 |
| `render/world.ts` | add a `get canvas()` accessor | `mount.querySelector('canvas')` |
| `styles.css` | a class to neutralise UA button chrome | inline `background:none;border:0;padding:0` + H4b zero-value re-pin |
| `ui/overlayA11y.ts` | make `fallbackFocus` reachable | the frame-loop focus return (§1.4); escalate the finding as a §4.1 integration note |
| any `ui/*View.ts` | per-view announcement wiring | the frame-loop snapshot covers all sixteen |

`touches-delta:` — `client/src/main.wiring.test.ts` (unavoidable, additive/strengthening only),
`client/src/indexShell.test.ts` (sibling of `client/index.html`; `:68-70` nominates S5 by name),
`client/src/main.a11yFocus.test.ts` (NEW companion), `docs/adr/0206-*.md`, `ARCHITECTURE.md`.

## 6. Risks

1. **T-1 harness spike fails** — highest schedule risk; time-boxed, with a source-scan + DEFER fallback.
2. **Frame-region teeth** (`:1984/:3703/:8904`) unquantified — run the wiring suite immediately after the
   frame insertion, before anything else.
3. **Format hook runs an UNPINNED `npx biome`** (harness memory) while `just lint` uses the pinned one; a
   reformat of a pinned `expectedRaw` literal reds `W-UXD3C-OPENGUARDS`. `lineWidth: 100`; the longest new
   guard (KeyO) lands at ~98 chars — verify.
4. **Space behaviour change** (§1.6) is outside §2.3's exemption list — declare it, don't slip it.
5. **`t()` throws** (`a11yCopy.ts:90`) — called inside the frame `try`, so it logs rather than kills the
   loop; pin that main.ts calls `t('a11y.world.region')` and not a literal.
6. **ADR digest gate is header-only** — the ADR-0206 body is ungated by `just ci`.

## 7. Right-sizing verdict

**ONE slice.** Not divisible: the twelve conjuncts, the focus return and the announcement all key off the
same two new module-scope bindings, and §4 forbids a second `main.ts` touch. Parked with clean seams:
the snapshot's `message` channel (§2.4 transitions 3/4 — already `''`, no API change needed later) and the
E2E-tier proofs (S11). **Not parkable:** the Space/`targetOwnsKey` fix and the frame-loop focus return.

---

## 8. Plan-lens adjudication (reviewer · red-team · /simplify) — the plan of record is §1–§7 AS AMENDED HERE

### ADOPTED — design changes

**A1 (red-team #1, HIGH). The `worldCanvasEl` assignment had no pin at all.** An implementation that
keeps `worldHasFocus`'s body byte-exact (passes the exact-shape tooth) and all twelve conjuncts
byte-exact (passes the thirteen `expectedRaw` pins) but **never assigns** `worldCanvasEl` — deleted, or
shadowed by a second `let worldCanvasEl` inside `main()` — silently degrades the gate to
"body-or-nothing". Every hotkey then dies the first time a keyboard/AT user Tabs to the canvas: the
exact user this milestone exists to serve, on the path this same slice adds. **Fix:** the assignment
lives in its own marked region pinned by EXACT EQUALITY, and the census asserts `worldCanvasEl` is
DECLARED exactly once in the whole file (kills the shadow).

**A2 (red-team #3, HIGH). `liveRegion.flush(0)` is total, permanent silence and the containment scan
misses it.** `flush(now)` only paints when `now - windowOpenedAt >= 500`; with a constant argument
both sides are the same constant, so `0 < 500` forever and the region never speaks again —
behaviourally identical to never wiring the pump, which is the exact S1 cliff. **Fix:** the whole
snapshot/pump block is pinned by EXACT EQUALITY (surfaces 6/7 idiom), not by containment, so the
argument text is part of the pin.

**A3 (red-team #5, MEDIUM). The pump was unreachable on any persistent per-frame throw.** The frame
body's `predictor.drain` / `resolver.resolve` / `renderer.render` / `nearestInteractable` are
unguarded and all ran BEFORE a tail-placed pump. A recurring throw silences the live region
indefinitely and freezes `lastA11ySnapshot`, collapsing transitions on recovery. **Fix:** the block
moves to the TOP of the frame body — immediately after the `sessionGateBlocks()` early return and the
existing `const now = performance.now()`, before `predictor.drain`. Reading the visible-id set at the
top of the frame is equivalent (nothing in the frame changes overlay visibility) and strictly more
robust. If an existing frame-region tooth reds on that position, fall back to the tail placement and
record the regression risk — do not silently keep the weaker position.

**A4 (red-team #2, HIGH). H4b's `font` is allow-listed with NO value constraint — a pre-existing hole
this slice's `<button>` conversion makes exploitable.** `font:900px/1 monospace` keeps
`width:max-content`, one horizontal edge and every allow-listed property name, yet renders the badge
as a giant click-eating strip: exactly the regression H4/H4b exist to prevent. **Fix:** the re-pin
adds a VALUE clause for `font` (exact literal) alongside the new `border ∈ {0,none}` / `padding === 0`
clauses. Net effect on the tooth is strictly strengthening, including against a cheat that was
available before this slice.

**A5 (red-team #6, MEDIUM). `body > div` → `body > div, body > button` is a fixture-monoculture fix.**
A second corner affordance shipped as `<a>`, `<span>`, or a `<button>` one level down all still evade
it. **Fix:** go tag-agnostic AND depth-agnostic — scan every element carrying an inline `style`,
filter on `position:fixed` and NOT `inset:0`. `position:fixed` anchors to the viewport regardless of
nesting depth, so depth-scoping was never semantically justified. Verified the expected set is
unchanged at `{build-stamp, help-hint}`: `client/index.html`'s only other inline `position:fixed`
nodes are `#help-overlay` and `#menu-overlay`, both `inset:0`, and `#status`/`#interact-prompt` are
created at runtime in `main.ts`, which this tooth never parses.

**A6 (reviewer NIT). `worldCanvasEl: HTMLElement | null`** (not `Element | null`) —
`mount.querySelector('canvas')` has a tag-name overload returning `HTMLCanvasElement | null`, so the
`instanceof HTMLElement` runtime check in §1.3 is deleted. ADR-0206 D1 is the type of record.

### ADOPTED — as a DOCUMENTED RESIDUAL, not fixed here

**A7 (reviewer MAJOR + red-team #4). `visibleIds(probes)[0]` is DECLARATION order, not z-order.**
`client/src/ui/overlayRegistry.ts:372-374` filters `OVERLAY_IDS` in `OVERLAY_TIERS` insertion order.
That is a safe proxy only while at most one overlay is visible — and `dialogueView` breaks it:
`client/src/main.ts:1574` calls `dialogueView?.render(dialogueVm)` unconditionally on every store
batch and force-hides only `menuView` (`:1565`), so a server-pushed conversation can become visible
underneath an already-open `helpView`. Two concrete consequences: `topOverlay` does not transition
when a dialogue opens over a LOWER-index overlay (announcement silently missed), and it reports
`dialogueView` as "on top" when a full-screen `z-index:100` `helpView` is what actually covers the
screen (wrong accessible name).

**Not fixed in S5, deliberately.** Both candidate fixes are out of this slice's `touches:` —
constraining the render-driven overlays' visibility is a view/registry change, and selecting by real
DOM z-order requires changing `A11ySnapshot`, the API S1 froze and S10's tests will assert against.
Working around a registry-ordering defect with a set-diff heuristic inside `main.ts` would also
diverge from `announcements.ts:39-40`'s documented contract. **Recorded in ADR-0206's residuals, in
the PR body, and as an mr-gates residual row targeting S6/S10.**

**A8 (reviewer NIT). The `message: ''` channel has no named producer in spec §4's slice table.**
Kept (zero cost, stable seam) and tied to a residual row rather than an implicit "later slice".

### NOTED, no change

- **Reviewer MINOR.** The plan's "no `regionOrThrow` uses `window.addEventListener('keydown'` as an
  END needle" was WRONG — `W-NH1-HELPER` (`main.wiring.test.ts:1568-1572`) and `W-NH1-NONEGATION`
  (`:1628-1632`) both do, and the `main.ts:1051` insertion lands inside that region. Reviewer verified
  both are presence-only `.includes()` checks and the ordering check compares only three `indexOf`
  anchors, so the placement survives — but it survives by luck, not by the stated reasoning. The
  insertion stays at `:1051`; the full wiring suite is run immediately after it, before anything else.
- **Red-team #7.** Stale-`/tmp`-JSON reuse was tested and does NOT work (vitest overwrites the report
  even for a missing spec file). The ledger's CHECK shape already requires `status === 'passed'`
  strictly plus `numPendingTests === 0` / `numTodoTests === 0` / `numTotalTests > 0`. The residual hole
  — a test whose name hits the needle but asserts nothing — is closable only by review, so it is the
  reviewer's and verifier's explicit obligation on `main.a11yFocus.test.ts`, stated here so it is not
  assumed away.
- **/simplify.** The `announcementsFor` + `lastA11ySnapshot` machinery is NOT gold-plating: it is
  dictated by S1's contract, it is the only mechanism that covers store-driven closes / hotkey
  toggle-closes / force-hide sweeps, and using it is what keeps `OVERLAY_A11Y` out of `main.ts`'s
  import line (which is itself pinned by exact equality). The twelve repeated conjuncts are deliberate
  duplication the repo's own comment at `main.ts:378-380` demands. One real simplification found and
  applied: A6.
