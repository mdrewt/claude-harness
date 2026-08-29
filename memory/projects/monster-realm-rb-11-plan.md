# rb-11 build plan (orchestrator-adjudicated, post-planner)

## The blocker the planner found, and why the plan changed because of it
`evals/a11y-static-shell.eval.mjs` `[A11Y-05b]` (`:70`, `:74`, `:225-233`, `:686-693`) flags ANY
non-test `client/src` module other than the declared owner `ui/liveRegion.ts` whose
comment-stripped source contains `a11y-live` or `LIVE_REGION_ID`. The planner's design (and the
orchestrator's brief) put the re-parent in `ui/overlayA11y.ts`, which would NAME the node -> certain
`just ci` RED, and the only listed remedies were (a) widen the owner set to two, or (b) a synonym
hook (`[data-live-region]`) that is CI-green and is a dishonest bypass of the exact rule the slice
touches. BOTH are rejected.

## ADJUDICATED DESIGN (D1) — the custody seam lives in the DECLARED OWNER
`ui/liveRegion.ts` gains two stateless, module-level DOM functions; `ui/overlayA11y.ts` calls them
and holds the returned node as an OPAQUE `HTMLElement | null`. The live-region node therefore still
has EXACTLY ONE module that knows its id, `[A11Y-05b]` is NOT weakened, no blacklist is widened,
and the "known-unclosed synonym hook" risk disappears because no owner set changes.

```
// ui/liveRegion.ts
export function adoptLiveRegion(root: HTMLElement): () => void
```
REVISED after the reviewer lens (D1a): the seam is ONE function returning a RELEASE CLOSURE, mirroring
`focusTrap.ts:136`'s `installTrap(root): () => void` — the module's existing idiom for exactly this
"open captures state, close needs it back" shape. The rejected first draft was a
`adopt(root) -> node` + `release(node, from)` PAIR, which forced the caller to hand `record.root`
back at close and so stored the SAME fact twice (`record.root` and the `from` argument), kept in
sync by convention rather than by construction.
- `adopt`: resolve by id; no node -> return a NO-OP closure (so the caller has no null branch at
  all); `node.parentElement !== root` -> `root.appendChild(node)`; return a closure capturing BOTH
  the node and `root`.
- the returned `release`: `root.contains(node) || !node.isConnected` -> `document.body.appendChild(node)`;
  else NO-OP, because another overlay has since adopted it.
- `!node.isConnected` is a FORWARD-LOOKING disjunct, not a live path: measured fact 2 says no view
  rebuilds its own root today. It is commented as such in-code, in the style of
  `overlayA11y.ts:126-128` ("FORWARD REFERENCE, NOT EXISTING CODE"), never presented as covering
  current behaviour.

`ui/overlayA11y.ts`:
- `OpenRecord` gains `readonly releaseLive: () => void`, sitting beside `uninstall: () => void` —
  same shape, same lifecycle, no nullable.
- `openOverlayA11y`: `const releaseLive = adoptLiveRegion(root);` placed AFTER the three
  `setAttribute` calls (`:106-108`) and BEFORE `installTrap` (`:110`) — on the COMMON path (below
  the `previous`/fresh merge at `:96-103`) so a re-open with a DIFFERENT root re-homes the node,
  synchronous (never inside the `setTimeout` at `:111-113`, whose `clearTimeout` on a same-tick
  close would silently skip the move), and before `OPEN_OVERLAYS.set` at `:115`.
  A re-open must call `previous.releaseLive()`? NO — the adopt itself re-homes, and calling the old
  release first would bounce the node through `<body>` for one statement. The old closure is simply
  dropped with the old record; its `root.contains(node)` guard makes it inert anyway.
- `closeOverlayA11y`: `record.releaseLive();` after the `removeAttribute` block (`:142-144`),
  before the focus restore.
- Resolve fresh at every open; do NOT carry the closure forward across a re-open the way
  `returnFocus` is carried.

### Why appendChild (last child), not prepend
- `#a11y-live` matches none of `focusTrap.ts:65-73`'s `FOCUSABLE_SELECTOR` clauses (a
  `div.sr-only`, no tabindex/href, not a form control), and the trap re-queries the ring on EVERY
  keydown (`focusTrap.ts:88-94`), so there is no install-time snapshot to poison either way.
- All 16 `initialFocusSelector`s (`overlayRegistry.ts:164-261`) are four `[data-testid=...]` and
  twelve `#<id>`; `#a11y-live` matches none, so it can never shadow an anchor via
  `root.querySelector`'s document-order first match.
- Reading order is the deciding reason: a live region PREPENDED is the first thing a VoiceOver
  browse-mode user lands on inside the dialog. APG wants the dialog's own content first.

### Rejected alternatives
- `aria-owns` on the root (no DOM move; Chromium's AX tree would even show the reparent) — loses
  because VoiceOver, the exact AT that honours `aria-modal`, has the weakest `aria-owns` support.
- A MIRROR region inside the root — NVDA/JAWS ignore `aria-modal` and would speak everything twice.
- Widening `[A11Y-05b]` to a two-member owner set — see above; D1 makes it unnecessary.
- `[data-live-region]` synonym hook — CI-green and dishonest. Refused, recorded as R5.

## EARS criteria (ids X1..X9 under residual R-m23-s2-X5)
- X1 open custody, all 16 ids: the SAME node (never a clone), a DIRECT LAST child of `root`, before the call returns.
- X2 close restore, ownership-scoped: restore to `document.body` iff `record.root` contains it OR it is disconnected; leave it alone if another element has taken it.
- X3 no-op edges + no churn: close-without-open / double-close mutate nothing; open with NO region present completes normally; re-open on the SAME root does not re-insert.
- X4 the channel still works: an announcement written through `LiveRegion` while an overlay is open lands in that same node, `aria-live="polite"`/`aria-atomic="true"` intact, exactly ONE `[aria-live]` node in the document.
- X5 behavioural browser oracle (ledger-time, real Chromium): shipped `client/index.html` shells + shipped `overlayA11y.ts`, the AX tree shows the `live="polite"` node as a DESCENDANT of the `modal=true` dialog node while open and a NON-descendant after close. Declared scope: browser-computed AX ANCESTRY, never inertness, never audibility.
- X6 A11Y-13 NOT weakened: `aria-modal="true"` still written at open / removed at close for all 16; the eleven static shells keep it in markup; the existing S1 ARIA teeth pass with assertions unmodified.
- X7 A11Y-10 NOT weakened: index.html's live-region MARKUP byte-identical apart from its HTML comment; `indexShell.test.ts` A1/A2 and `[A11Y-05a]` pass unmodified.
- X8 ownership NOT widened (BOUNDED CLAIM, reworded after the reviewer lens): `[A11Y-05b]` still declares exactly ONE owner and its comment-stripped known-spelling scan finds ZERO intruders, and `overlayA11y.ts` names the node zero times. This is what the scan supports; it is NOT a proof that no synonym hook could exist (see R5 — the class of check is an unclosable blacklist).
- X9 proof of teeth (ADR-0010): each wrong implementation W1..W11 turns exactly one named tooth RED against a GREEN correct impl; the ledger records the FAILING-TOOTH LABEL per mutant, never a bare exit code.

## Test plan
CI-time (inside `just ci` = justfile:595):
- `client/src/ui/overlayA11y.test.ts` (sibling companion) — custody teeth S11-*.
- `client/src/ui/liveRegion.test.ts` (sibling of the touches-delta file) — adopt/release unit teeth.
- NEW `evals/overlay-live-region-custody.eval.mjs` — auto-discovered by `evals/run.mjs`, ZERO shared-file edits. Its job is the half a vitest DOM test structurally cannot do: pin that `overlayA11y.ts` names the node zero times (COUNTED, not indexOf), that the custodian never writes/destroys, and that `OpenRecord` CAPTURES the reference. Deliberately NOT added to the `a11y-e2e` roster: that region is byte-pinned at `evals/ci-gate-wiring.eval.mjs:614`.
Ledger-time: `rb-11.ax-ancestry-probe.mjs` — real Chromium + CDP `Accessibility.getFullAXTree` over the shipped `client/index.html` shells driven by the shipped `overlayA11y.ts` through a vite dev server. Anti-vacuity first (both the `live=polite` node and the `modal=true` node were FOUND), then ancestry open/closed, plus a printed CONTROL recording that `ignored===false` in BOTH states — so the output itself shows the reader this measures ancestry, not Chromium inertness.

## Wrong implementations to bite (X9)
W1 no move · W2 move-never-restore · W3 UNCONDITIONAL restore at close · W4 restore re-resolved by id instead of the captured reference · W5 move placed inside the `previous === undefined` branch · W6 `prepend` not `appendChild` · W7 CLONE not move · W8 mirror region · W9 `aria-owns` instead of a move · W10 drop the `parentElement !== root` churn guard · W11 the custodian starts WRITING the node.
Known-unclosed: W12 the `[data-live-region]` synonym hook (text-ownership scans are unclosable blacklists) — recorded as R5, not papered over.

## Files
IN the declared touches / always-in-scope set:
  client/src/ui/overlayA11y.ts (declared) · client/index.html (declared, COMMENT ONLY) ·
  client/src/ui/overlayA11y.test.ts (sibling companion) · docs/adr/0214-*.md + docs/adr/DIGEST.md
  (append, never insert a header line) · ARCHITECTURE.md (minimal).
TOUCHES-DELTA / hidden dependency, declared:
  client/src/ui/liveRegion.ts + client/src/ui/liveRegion.test.ts — REQUIRED: the slice is
  IMPOSSIBLE inside its literal touches set (see the blocker above). The ledger's own
  `Touches: (inherit from source slice — REVIEW)` line marks the set as an unresolved placeholder.
  Verified no collision: PR #387 (rb-10, open) touches neither file, and `git branch -r` shows no
  other slice branch.
  evals/overlay-live-region-custody.eval.mjs — NEW file, additive, auto-discovered (rb-8/rb-10 precedent).
NOT touched, deliberately: evals/a11y-static-shell.eval.mjs (D1 makes it unnecessary) ·
  evals/ci-gate-wiring.eval.mjs · justfile · client/src/main.ts · client/src/indexShell.test.ts ·
  client/src/ui/overlayA11yWiring.test.ts · all 16 *View.ts and their tests · client/e2e/.

## Risks / accepted limits (ADR-0214)
R1 Chromium does NOT implement aria-modal AX pruning (MEASURED here: a sibling live region stays
   `ignored:false, ignoredReasons:[]` with focus inside the dialog). WebKit — the engine VoiceOver
   rides and the one that DOES prune — is not installed (~/.cache/ms-playwright has chromium only).
   The probe measures the AX ancestry the rule keys off; audibility stays residual R-rb-11-VO.
R2 A re-parent is a spec-defined remove+insert, i.e. a FRESH AT registration, and AT guidance says
   a region must exist before the text change. Mitigated by `COALESCE_WINDOW_MS = 500`
   (liveRegion.ts:63) + the rAF pump (main.ts:2784): the earliest write lands >=500 ms after the
   move. CROSS-MODULE INVARIANT: shrinking that window toward 0, or adding a leading-edge emit,
   re-opens the hole. Worst case today is ONE lost announcement per open on the most conservative
   AT; the status quo is ALL of them.
R3 A13 amplification: a root hidden WITHOUT routing through `closeOverlayA11y` now also strands the
   live region inside a `display:none` subtree (total silence) instead of only leaking a listener.
   Not reachable today — every force-hide routes through `hide()` (main.ts:361-376 `overlayHandles`
   is byte-identical `<id>: () => <id>?.hide()` per id).
R4 Two ids open on the SAME root would let the first close yank custody. Not reachable (the four
   `#app` overlays each build their own root); self-heals on the next open.
R5 W12 synonym hook stays CI-green. Text-ownership scans are unclosable blacklists; recorded.
R6 After one open/close the node sits AFTER `<script type="module">` in the live DOM. Nothing reads
   that ordering at runtime; `insertBefore` rejected as a second brittle coupling for zero gain.
R7 happy-dom models no aria-modal inertness, so every CI-time assertion is STRUCTURAL by
   construction. Writing anything shaped like an inertness oracle is banned in the spec headers.
R8 The churn guard's benefit (no needless AT re-registration) leaves no DOM trace; it is pinned by
   a sentinel-ORDER proxy tooth, declared as a proxy.

## Blast-radius fact that keeps the file list short
`battleView.test.ts:2747-2753` asserts the battle root holds EXACTLY 10 children. Appending the
region there would break it — it does not, because `a11y-live` appears in NO `*View.test.ts`
fixture, so `getElementById` returns null and nothing is appended. That is exactly what the
"open with no region present" tooth exists to lock in.

## Reviewer-lens amendments (adopted)
- D1a: the seam is `adoptLiveRegion(root): () => void`, the `installTrap` closure idiom (above).
- `liveRegion.ts`'s header claims at `:1` ("textContent-only sink"), `:9` ("a one-line DOM sink")
  and `:50` ("`node.textContent = msg` IS THE ONLY DOM WRITE THIS MODULE EVER MAKES") become
  literally FALSE. Amend them TRUTHFULLY by naming the exception, never by softening: the
  coalescing reducer's only DOM write is still `textContent`; `adoptLiveRegion` is a separate,
  stateless custody function this module also owns BECAUSE it is the sole holder of the node's id,
  and it moves the node's PARENT — never its content, never its attributes.
- X8 reworded to the bounded claim the gate actually supports (above).
- R9 (new): partial-failure edge — if something between `adoptLiveRegion` and `OPEN_OVERLAYS.set`
  threw, custody would be moved with no record to release it. Consistent with this module's
  existing no-try/catch risk tolerance (`overlayA11y.ts:47-49`); acknowledged, not defended against.
- R10 (new): CI-time vitest can only drive `overlayA11y.test.ts`'s generic `<div>` root fixture,
  never a real `battleView`/`boxView` constructor, so the interaction between the parked live-region
  node and `battleView`'s inner-container `replaceChildren()` calls (`battleView.ts:241,287,316`) is
  covered by reasoning + the ledger probe only. Named residual R-rb-11-VIEWFIXTURE.
- Reviewer VERIFIED as true, independently: `focusTrap.ts:65-73`'s selector clauses; all 16
  `initialFocusSelector`s (4 `[data-testid=]` + 12 `#id`, none `#a11y-live`); no view rebuilds its
  own root; `main.ts:361-376` force-hide routes through `hide()`; `battleView.test.ts:2715,2747-2753`
  `RM3_ROOT_CHILDREN = 10` is real and stays green only because no `*View.test.ts` fixture contains
  `a11y-live`.
- Sizing verdict: ONE mergeable slice. The CDP probe was flagged as the only novel infrastructure;
  the orchestrator retired that risk during triage by building and RUNNING a working CDP AX probe
  before planning, so it stays in scope.
