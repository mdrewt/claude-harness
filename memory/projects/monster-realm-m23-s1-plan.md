# m23-s1 — Plan of record (planner output, pre-review)

Slice: M23 accessibility S1. touches: client/src/ui/{focusTrap,liveRegion,announcements,overlayA11y}.ts (all new) + co-located *.test.ts.
Worktree: .claude/worktrees/m23-s1 on branch slice/m23-s1 from origin/master @ e664fa7.

## Findings that changed the design

**F1 — a bubble-phase focus trap is DEAD in the two overlays that need it most.**
renameView.ts:61-65 and :80-82 call e.stopPropagation() on the keydown of #rename-input and
#rename-submit; tradeProposeView.test.ts:346-407 documents the same for every focusable in
tradeProposeView; main.ts:1031 states it outright. A bubble-phase root listener never sees a Tab
pressed on those elements. **installTrap MUST register in the CAPTURE phase**
(root.addEventListener('keydown', h, true)).

**F2 — noUncheckedIndexedAccess is OFF** (client/tsconfig.json: strict:true only), so
`focusables[0]` types as HTMLElement while being undefined at runtime on an empty list. The spec's
`nextFocusTarget(...): HTMLElement` is a runtime-undefined trap. Amend to `HTMLElement | null`.

**F3 — zero fake timers exist in client/src.** House pattern is INJECTED clocks:
`new EventRing(() => Date.now())` / `new ErrorRing(() => Date.now())` (main.ts:696-697),
`createFrameWindow(performance.now())` (:228). Do not introduce fake timers.

**F4 — coverage.** The four files land in the coverage denominator (include src/**/*.ts). The
DOM_SHELLS list in evals/dom-shell-coverage-exclusion.eval.mjs is a *View.ts list; our files are
not *View.ts and are absent from vite.config.ts's exclude array — zero eval interaction, and they
must be genuinely unit-coverable.

**F5 — spec §2.4 puts coalescing in announcementsFor; that is impossible for a pure reducer.**
Split: `announcementsFor` owns A11Y-8 (identical STATES -> zero messages); `liveRegion` owns
A11Y-9 (burst MESSAGES -> last wins in a 500 ms window).

## Public API

### focusTrap.ts
```ts
export function nextFocusTarget(
  focusables: readonly HTMLElement[], current: Element | null, shift: boolean,
): HTMLElement | null;
export function installTrap(root: HTMLElement): () => void;   // returns an uninstall handle
```
- null only when focusables.length === 0.
- i = indexOf(current). i === -1 -> shift ? last : first (entering the trap / blurred to <body>).
- shift=false: i === len-1 ? first : focusables[i+1]   <- A11Y-6
- shift=true:  i === 0 ? last : focusables[i-1]
- FOCUSABLE_SELECTOR + the hidden-ancestor filter stay module-PRIVATE (zero-consumer rule).
- installTrap: keydown on `root`, **capture: true** (F1). Focusable set computed LIVE on every
  keydown (battleView.ts:241,:270 replaceChildren every server tick). preventDefault ONLY on
  Tab / Shift+Tab, and ONLY when nextFocusTarget returned non-null. Never stopPropagation.
- Selector: a[href], area[href], button:not([disabled]), input:not([disabled]):not([type=hidden]),
  select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]); then a
  display:none / [hidden] ancestor walk up to root inclusive. Deliberately NOT: visibility,
  opacity, offsetParent, getClientRects, inert (happy-dom has no layout -> unverifiable code).
- The ten tabindex="-1" S2/S4 anchors are OUTSIDE the tab ring by design (APG dialog pattern)
  while still being the initialFocusSelector target.

### liveRegion.ts
```ts
export const LIVE_REGION_ID = 'a11y-live';
export const COALESCE_WINDOW_MS = 500;
export class LiveRegion {
  constructor();
  announce(message: string, nowMs: number): void;
  flush(nowMs: number): void;
}
```
Class, not a singleton — every it() gets a fresh instance, which removes module-state test
isolation problems. State: #pending, #windowOpenedAtMs, #lastWritten. No Date.now, no setTimeout.
- announce: self-drain via #maybeEmit(nowMs) first; then if msg === #lastWritten return (identical-
  consecutive dedup); else #pending = msg and open the window if not open.
- flush -> #maybeEmit: if #pending null return; if nowMs - #windowOpenedAtMs < 500 return; else the
  single DOM write `node.textContent = #pending`, set #lastWritten, clear #pending, close window.
- Node resolved by document.getElementById(LIVE_REGION_ID) on EVERY write, cached never. Null ->
  return silently and KEEP #pending, so the message lands once S2's node exists.
- Derived obligation on S5: pump flush(now) from the rAF loop. Stated in the module header.

### announcements.ts
```ts
export interface A11ySnapshot { readonly topOverlay: OverlayId | null; readonly statusLine: string }
export function announcementsFor(prev: A11ySnapshot, next: A11ySnapshot): readonly string[];
```
- topOverlay: the only copy S1 can legally resolve — t(OVERLAY_A11Y[id].labelKey). Producer
  already exists: visibleIds(probes) (overlayRegistry.ts:372).
- statusLine: §2.4 transitions (3) battle turn outcome and (4) NPC prompt / zone change, as a
  CALLER-RESOLVED string already on screen, never a copy key. Producers: setStatus/statusEl
  (main.ts:676-689), interactPromptEl (main.ts:2538), interactPrompt (interactModel.ts:147).
  '' means nothing showing.
- Rules (order: overlay then status): (1) topOverlay changed and non-null -> push t(labelKey);
  (2) topOverlay changed to null -> push NOTHING (declared gap, below); (3) statusLine changed and
  non-empty -> push it; else [].
- KILLED as speculative: battleTurn{}, zoneId, npcName, promptActionWord, focusedElementLabel, seq.
- **DECLARED SPEC GAP**: §2.4(2)/A11Y-22's "the world region is now focused" needs a11y.world.region.
  a11yCopy.ts is NOT in S1's touches and t() throws on a miss, so S1 cannot emit it. Rule 2 emits
  nothing. Belongs to whichever slice re-opens a11yCopy.ts (S5 owns the Escape ladder). Do NOT fake
  it with a literal — that breaks §2.8 and A11Y-3/4.

### overlayA11y.ts
```ts
export function openOverlayA11y(id: OverlayId, root: HTMLElement): void;
export function closeOverlayA11y(id: OverlayId, root: HTMLElement, fallbackFocus: HTMLElement | null): void;
```
open: (1) if a record exists, full teardown but PRESERVE the older returnFocus (a re-open must not
overwrite the true pre-overlay focus); else record document.activeElement. (2) set role /
aria-modal="true" / aria-label = t(OVERLAY_A11Y[id].labelKey). (3) uninstall = installTrap(root)
(this is installTrap's in-slice production consumer). (4) timer = setTimeout(() =>
root.querySelector(initialFocusSelector)?.focus(), 0) — the SOLE deferred focus in the tree, the
drop-in for renameView.ts:102 / tradeProposeView.ts:124, and why A11Y-15 stays satisfiable.
close: (1) remove aria-modal AND role AND aria-label (an S1 decision: a display:none node must not
keep claiming to be a dialog). (2) no record -> return after the attribute strip (no throw, no focus
move; A11Y-34's idempotency edge). (3) clearTimeout (kills the open->close-same-tick focus steal).
(4) uninstall(). (5) restore returnFocus if non-null AND .isConnected; else fallbackFocus if non-null
and connected; else NO focus call (natural blur to <body>, which worldHasFocus() treats as world-
focused). (6) map.delete(id) unconditionally.

Map: ONE map, ONE record per id — Map<OverlayId, {returnFocus, timer, uninstall}> — so there is no
half-state. Cleared only by close. Test isolation is achieved by per-id total overwrite plus a
beforeEach that calls the production closeOverlayA11y (legal precisely because close-without-open is
a documented no-op) — NOT by vi.resetModules and NOT by a __resetForTests export.

## Purity seams
| module | core | shell | timing |
|---|---|---|---|
| focusTrap | nextFocusTarget (pure list arithmetic) | installTrap | none |
| liveRegion | the coalescing state machine (time arrives as an argument) | one textContent write + one getElementById | injected nowMs |
| announcements | 100% core (imports only overlayRegistry + a11yCopy) | none | none |
| overlayA11y | composition shell | attributes, setTimeout, focus, map | REAL timer, flushed with `await new Promise(r => setTimeout(r, 0))` |

overlayA11y's setTimeout stays real because injecting a scheduler would add a parameter all sixteen
S3/S4 call sites must fill = dead surface. The defer is proven by BOTH polarities: synchronously
after open, activeElement !== target; after the macrotask flush, activeElement === target. The
synchronous half IS the tooth — without it a synchronous-focus impl passes everything.

## Named vacuity attacks (the cheats the tests must kill)
focusTrap: preventDefault-everything (A11Y-7); bubble-phase / stopPropagation-shadowed (F1 — the
A11Y-6 test dispatches from a child that stopPropagations); preventDefault-only-no-focus-move (use
an IDENTITY assertion, never root.contains); self-index; empty-list crash; no-op uninstall;
current-not-in-list.
liveRegion: **the write-through impl** (no coalescing — a test asserting only final textContent
PASSES; killed only by COUNTING writes via an Object.defineProperty setter spy and asserting exactly
1 call and that the superseded message was never an argument); never-write; cached-null; cached-non-
null-gone-stale; dedup against #pending instead of #lastWritten; innerHTML smuggling (announce an
<img onerror> payload, assert children.length===0 and textContent is the literal); attribute writes
(assert node.attributes.length unchanged).
announcements: the empty reducer (return [] passes A11Y-8 perfectly — needs paired positive
assertions); **the reference-equality reducer** (prev === next ? [] : ... — the test MUST construct
two structurally-equal but DISTINCT literals, both fields non-trivial); literal copy (derive from
'a11y.overlay.'+id+'.title' over all 16 OVERLAY_IDS); DOM leakage (killed by the node environment);
emit-on-repeat-render.
overlayA11y: attribute-only; **synchronous-focus**; label literal; leaky map; focus-steal-after-
close; detached-target restore; trap never installed; role not from the table.
Cross-cutting: no console.*; no try/catch around focus/restore (the anyVisible precedent,
overlayRegistry.ts:361); no import from main.ts or render/; no export S1 does not itself call.

## Tasks (ordered, test-first)
T0 focusTrap.test.ts first (RED: Failed to resolve import "./focusTrap").
T1 nextFocusTarget only.  T2 installTrap (capture, live query, hidden filter, Tab-only, uninstall).
T3 announcements.test.ts (NODE env — no @vitest-environment line) then announcements.ts.
T4 liveRegion.test.ts then liveRegion.ts.  T5 overlayA11y.test.ts then overlayA11y.ts.
T6 the edge/idempotency pass. T7 module headers + derived obligations. T8 just ci + coverage.
Every other test file starts with `// @vitest-environment happy-dom`.

## Risks / residuals
R1 happy-dom focus() does not enforce focusability — S1 proves the call was made on the right
element, NOT that a browser would honour it. A11Y-14 is S2/S4/S10 + nightly axe.
R2 happy-dom synthesises no default action for Tab — no test can prove preventDefault STOPPED a
native move; the primary oracle must be "our code moved focus to X".
R3 test files are not typechecked (client/tsconfig.json excludes **/*.test.ts).
R4 the flush pump is a cross-slice cliff: if S5 never calls flush(now), the region is permanently
silent and NOTHING in S1-S4 reds. Handoff note for S10.
R5 announcementsFor ships with zero production consumers in S1 (spec-mandated); keep the surface to
exactly one function + one interface.

## Hidden dependencies outside touches (do NOT edit; surface them)
- client/index.html <div id="a11y-live"> — S2. Verified absent today.
- client/src/render/world.ts:71 canvas — S4/S5 — the eventual fallbackFocus. S1 ships the branch.
- client/src/ui/a11yCopy.ts — the missing a11y.world.region key (the declared gap above).
- renameView.ts:102 / tradeProposeView.ts:124 — S3 deletes them. overlayA11y must be behaviourally
  identical (#rename-input, #tradepropose-target, deferred by setTimeout(...,0)).
- client/vite.config.ts coverage exclude — exact-set-gated; the four files CANNOT be excluded.

## Open questions for the review lenses
Q1 closeOverlayA11y's required third parameter fallbackFocus vs no parameter.
Q2 nextFocusTarget returns HTMLElement | null, amending spec §2.2's HTMLElement (F2).
Q3 ADR: the supervisor assigned NO ADR number to this slice, so S1 authors NO ADR file; the six
   decisions ride in module headers + the PR body. Flag for the supervisor.

---

# ADJUDICATION of the three plan-review lenses (orchestrator, pre-test)

Lenses: `reviewer` (correctness), `red-team` (measured cheats), `/simplify`. Every claim below that I
adopt was INDEPENDENTLY re-verified by me against the worktree before adoption.

## ADOPTED — design changes

**A1. `liveRegion` dedup bug (red-team Finding 1, HIGH, MEASURED).** The plan deduped `announce`
against `#lastWritten` (what was last painted). Sequence `announce('Box',0); flush(520);
announce('Raising & Inventory',550); announce('Box',600); flush(1200)` drops the second 'Box'
FOREVER — a real accessibility loss, not a test artefact. **FIX: dedup against `#pending ??
#lastWritten`** — i.e. against the value that will actually be the next emitted state. Named test.

**A2. `closeOverlayA11y` loses its `root` parameter (simplify + reviewer MAJOR-3, concurring).**
`root` is stored in the per-id record at `open()` time instead. Removes a whole bug class (a caller
passing a DIFFERENT root at close strips ARIA off the wrong node while the original trap leaks —
untestable and uncaught), and moves the signature back toward spec §2.2's literal
`closeOverlayA11y(id)`. **Final signature: `closeOverlayA11y(id: OverlayId, fallbackFocus:
HTMLElement | null): void`.** Close-without-open is then a pure no-op (no record => no root => the
attributes were never set by us, so there is nothing to strip).

**A3. `fallbackFocus` STAYS a required parameter (simplify; reviewer MAJOR-4 dissents).** Reviewer
proposed a module-scope one-time-settable `worldCanvasEl` on the `statusEl` precedent. REJECTED: that
needs an exported setter with ZERO S1 consumer (dead surface, the A7/A15 rule at
overlayRegistry.ts:26-30) and turns an explicit obligation into a hidden global. The "sixteen call
sites thread the same value" objection does not hold — S3/S4 views have no canvas handle and pass
`null`; only S5 has a real value. A required parameter makes that visible at each call site.

**A4. `A11ySnapshot.statusLine` was WRONG and is renamed + re-scoped (reviewer MAJOR-1 + MINOR,
CONFIRMED by me).** `setStatus` does not exist anywhere in `client/src` (grep: zero hits); the cited
main.ts:676-689 is `reportError`/`clearStatus`, which carries generic REDUCER-FAILURE text — feeding
it to the live region would announce every network/trade/rename error, far outside §2.4's
deliberately-minimal four-transition scope. Battle outcome text is built at `battleView.ts:448` in a
PRIVATE `#outcomeEl`, and `battleModel.ts` exposes only `outcome: BattleOutcomeTag` (a union, not a
string). `interactModel.ts:147`'s `interactPrompt` returns `{actionWord, keyGlyph, anchorWorldX/Y}` —
also NOT a resolved sentence.
**Consequence, and it is the slice's biggest finding: of §2.4's four transitions, only (1) "overlay
opened" can be resolved by S1 at all. (2) world-region, (3) battle outcome and (4) prompt/zone all
need NEW `a11yCopy.ts` entries, and `a11yCopy.ts` is in NO slice's `touches:` after S0.**
**FIX: rename `statusLine` -> `message`,** documented as "a caller-resolved string that is ALREADY ON
SCREEN — never `#status`/`reportError` text, never copy this module resolves itself". It is the
pass-through channel §2.4(3)/(4) need once their producers exist; without it S5 would have to break
S1's frozen API, which is exactly what the extensibility review asked me to prevent.

**A5. `nextFocusTarget` backward-not-in-list is pinned BY NAME (red-team Finding 7, MEASURED).** The
"elegant" modular-arithmetic impl `focusables[((i-1)%len+len)%len]` passes A11Y-6, the forward
wrap, the backward wrap AND forward-not-in-list, but returns `focusables[1]` instead of `last` for
`(notInList, shift=true)`. A single generic "current-not-in-list" bullet would miss it. Both
polarities get their own named test.

**A6. `overlayA11y.test.ts` must use a NON-natively-focusable fixture (red-team Finding 3,
MEASURED).** happy-dom focuses a bare `<div>` with no `tabindex` (real browsers do not); it DOES
honour `disabled` on a `<button>`. Ten of the sixteen committed `initialFocusSelector`s are headings
/lists/status lines (`#dialogue-npc-name`, `#quest-log-list`, `#shop-title`, ...). If the S1 fixture
reaches for a `<button>` it never exercises the real shape. At least one case must mirror the real
registry shape, and every focus assertion is an IDENTITY assertion (`activeElement === target`),
never `root.contains(activeElement)`.

**A7. Ledger CHECK shape — `-t` filtering is DROPPED (red-team Finding 2, MEASURED).** Measured:
`-t 'A11Y-6'` marks every NON-matching test in the same file as **pending**, so `numPendingTests===0`
would red every legitimate run of a multi-tag file; and `-t` is substring-matched, so a decoy title
passes. Measured: a mixed pass/fail run exits 1 and ends in a `Duration` line, but a naive
`grep -o '[0-9]* passed'` still false-greens it. **Every CHECK runs the WHOLE file with
`--reporter=json` and asserts: `success===true`, `numFailedTests===0`, `numPendingTests===0`,
`numTodoTests===0`, and that each REQUIRED exact `fullName` is present EXACTLY ONCE with
`status==='passed'`.** Exactly-once is what kills a decoy duplicate of a required title. Verified
against a real run: the reporter emits `numTotalTests/numPassedTests/numFailedTests/numPendingTests/
numTodoTests/success` plus per-assertion `fullName`+`status`.

## ADOPTED — documented, not "fixed"

**A8. The pre-deferred-focus Tab gap (red-team Finding 4, MEASURED).** `installTrap(root)` runs
synchronously at open; the initial focus is deferred one macrotask. In that window `activeElement` is
still outside `root`, so a capture listener ON `root` correctly never fires and a Tab is not trapped.
It self-heals on the next tick and the defer is LOAD-BEARING (renameView.ts:101), so this is
documented in the module header and pinned by a test that asserts BOTH polarities, not designed away.

**A9. Trailing-edge coalescing is KEPT despite reviewer MAJOR-2.** Reviewer is right that a lone
announcement is delayed up to 500 ms and proposed a leading-edge throttle. REJECTED as a spec
deviation I do not get to make: A11Y-9 says "WHEN more than one announcement is PRODUCED within
500 ms THE SYSTEM SHALL emit only the MOST RECENT", and §2.4 says "later ones replacing earlier" —
leading-edge emits the FIRST one, which fails the criterion verbatim. The latency is a spec-mandated
consequence; it is flagged to the operator in the PR and the handoff as a UX question for M23's
owner, NOT silently changed here.

**A10. NO ADR is authored (reviewer MAJOR-6 dissents).** Spec §12 says S0 "writes per-slice ADRs from
there onward", but the supervisor assigned this slice ADR number `None`, and the standing fan-out
rule is `docs/adr/**` = "your reserved ADR number only". Picking 0206 myself risks colliding with a
concurrent sibling — the exact failure ADR pre-allocation exists to prevent. The six decisions ride
in the module headers + the PR body. **The spec§12-vs-no-number conflict is FLAGGED for the
supervisor** with a recommendation to allocate a number for a follow-up ADR.

## ADOPTED — handoff/residual only (outside this slice's touches; do NOT edit)

**A11. A11Y-22 is structurally unsatisfiable under the milestone's own slice split (red-team
Finding 5).** Spec:362 pins S5's `touches:` to `client/src/main.ts` + `client/index.html` (#help-hint
only). `a11yCopy.ts` is in NO post-S0 slice. A11Y-22 needs `a11y.world.region`, and A11Y-4's orphan
rule means any slice adding the key must wire its consumer in the SAME change. No slice can legally
do both. Escalate to the supervisor; file as a residual.

**A12. Shared-`#app`-root duplicate trap (reviewer MAJOR-5 + red-team Finding 4b).** battleView,
boxView, raisingView and evolutionView share one mount node. The Map is keyed by OverlayId, not by
root, so an S4 wiring that opens the new id before closing the old installs TWO capture listeners on
the SAME node. S1 cannot detect this. Named as an S1<->S4 contract in the module header + handoff.

**A13. Force-hide leak (red-team Finding 6).** If S5's `refreshBattle` force-hide path sets
`style.display='none'` directly instead of calling the view's `hide()`, the record (live listener +
pending timer + stale returnFocus) is never cleared and a much-later close restores focus to a
long-expired element. Named as an S1<->S5 contract; recommend §4.1 add force-hide <-> close to its
cross-slice contract list.

## REJECTED

- Reviewer MAJOR-2 leading-edge throttle -> A9.
- Reviewer MAJOR-4 module-scope `worldCanvasEl` -> A3.
- Simplify's "fold the attributes.length check into the write-count assertion" -> KEPT as its own
  assertion: it is the only thing that proves `textContent` is the ONLY DOM write (a setAttribute
  would be invisible to a textContent setter spy). Cheap, and it is the literal wording of the
  spec's "whose only DOM write is node.textContent = msg".
- Simplify's suggestion to merge any two of the four modules -> all three lenses independently
  concluded KEEP FOUR; the node-vs-happy-dom environment split for announcements.ts is a MECHANICAL
  purity oracle, not organisation.

## Net API after adjudication
```ts
// focusTrap.ts
export function nextFocusTarget(focusables: readonly HTMLElement[], current: Element | null, shift: boolean): HTMLElement | null;
export function installTrap(root: HTMLElement): () => void;
// liveRegion.ts
export const LIVE_REGION_ID = 'a11y-live';
export const COALESCE_WINDOW_MS = 500;
export class LiveRegion { announce(message: string, nowMs: number): void; flush(nowMs: number): void }
// announcements.ts
export interface A11ySnapshot { readonly topOverlay: OverlayId | null; readonly message: string }
export function announcementsFor(prev: A11ySnapshot, next: A11ySnapshot): readonly string[];
// overlayA11y.ts
export function openOverlayA11y(id: OverlayId, root: HTMLElement): void;
export function closeOverlayA11y(id: OverlayId, fallbackFocus: HTMLElement | null): void;
```
