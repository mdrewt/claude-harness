# rb-11 orchestrator brief (measured facts, before planning)

Worktree: /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-11
Branch: slice/rb-11 from origin/master @06393f2.
Declared touches: client/index.html, client/src/ui/overlayA11y.ts
  + ALWAYS-in-scope: sibling *.test.ts of declared code files, docs/adr/**, docs/knowledge/**,
    CHANGELOG.md (DO NOT hand-edit), ARCHITECTURE.md.

## The defect (residual R-m23-s2-X5)
`client/index.html:154` ships the ONE live region as a direct <body> child:
  <div id="a11y-live" aria-live="polite" aria-atomic="true" class="sr-only"></div>
`client/src/ui/overlayA11y.ts:107` sets `aria-modal="true"` on the overlay root at open, and the
eleven static shells in index.html carry `aria-modal="true"` in markup.
Per ARIA, while a modal dialog is open AT treats everything outside the dialog as inert -- so the
live region S1/liveRegion.ts announces through is inert on VoiceOver/Safari. Silent, AT-dependent.

## Measured facts (orchestrator, this worktree, 2026-08-29)
1. `client/src/ui/liveRegion.ts:101` resolves the node by `document.getElementById('a11y-live')`
   on EVERY write and caches NEITHER a null nor a non-null result (header lines 44-48). So the node
   may be MOVED anywhere in the document and announcements keep landing with zero change to
   liveRegion.ts (which is OUTSIDE this slice's touches).
2. All 16 overlay roots: 4 are `document.createElement('div')` built ONCE in the view constructor
   and mounted under a `parent` (battleView:81/171, boxView:60/120, raisingView:78/124,
   evolutionView:68/97); the rest are `getElementById` on the static index.html shells.
   NO view calls `replaceChildren()` or `innerHTML=` on its OWN ROOT -- only on inner containers
   (grep over client/src/ui/*View.ts). So a re-parented live region is not destroyed today.
3. Every force-hide path routes through the view's `hide()` (main.ts:361-376 `overlayHandles`
   table is byte-identical `<id>: () => <id>?.hide()` per id), and every `hide()` calls
   `closeOverlayA11y`. So there is no force-hide path that strands an open record.
4. `just ci` = lint typecheck test eval security wasm client-typecheck client-test
   observability-validate (justfile:595). It does NOT run `client/e2e/` and does NOT run
   `just a11y-e2e`. CI-time gates available to this slice: a vitest spec + an `evals/*.eval.mjs`
   (auto-discovered by evals/run.mjs).
5. **Chromium does NOT implement aria-modal inertness in its accessibility tree.** MEASURED via
   playwright 1.38 + CDP `Accessibility.getFullAXTree` on a fixture with
   `<div role=dialog aria-modal=true>` holding focus and a sibling live region: the sibling stays
   `ignored:false` with `ignoredReasons:[]`, both with and without focus inside the dialog.
   => A CDP "is the node ignored" oracle CANNOT distinguish before/after. Do not design one.
6. What Chromium DOES expose, measured on the same fixture:
     nodeId 7  role=dialog  name="Help"  props=["modal=true"]
     nodeId 9  role=generic props=["live=\"polite\"","atomic=true","relevant=\"additions text\""]
   i.e. the browser computes BOTH the modal marker and the live-region root, and the AX tree's
   parent/child links (`childIds`) give a real, browser-computed ancestry. After re-parenting the
   live region into the dialog, the live node becomes an AX DESCENDANT of the `modal=true` node.
   Firefox/WebKit are NOT installed (~/.cache/ms-playwright has chromium-1228 only).
7. Fresh worktree has no client/node_modules -> `npm ci` was run (exit 0).
   PATH export required: export PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"

## Orchestrator's candidate design (to be adjudicated, not assumed)
`openOverlayA11y(id, root)`: after setting role/aria-modal/aria-label, MOVE the live region
(`document.getElementById(LIVE_REGION_ID)`) into `root` via `root.appendChild(...)`, and CAPTURE
that node reference in the OpenRecord (new field `liveRegion: HTMLElement | null`, carried forward
across a re-open exactly like `returnFocus`).
`closeOverlayA11y(id, fallback)`: restore it to `document.body` iff it is a descendant of
`record.root` OR it is no longer connected (a rebuild detached it) -- and NOT if some other
overlay has since taken ownership. Holding the NODE REFERENCE (not re-resolving by id) is what
makes a hypothetical future root rebuild cost one announcement instead of permanent silence.
Rejected alternative: `aria-owns` on the root (no DOM movement, and Chromium's AX tree would show
the reparent) -- but VoiceOver, the very AT that honours aria-modal, has the weakest aria-owns
support, so it would fix the measurable case and miss the real one.
Rejected alternative: a MIRROR live region inside the root -- AT that ignores aria-modal (NVDA/JAWS)
would then speak every announcement twice.

## Constraints the fix must not violate
- Do NOT weaken A11Y-13 (aria-modal stays "true" on every visible shell root).
- Do NOT weaken A11Y-10 (index.html keeps #a11y-live as a direct <body> child outside #app).
- `client/src/ui/liveRegion.ts` is OUT of touches -- the fix must need no change there.
- `client/src/indexShell.test.ts` teeth A1/A2 assert on the RAW TEXT of index.html (one aria-live
  node, direct <body> child, .sr-only, no inline style, empty at boot). A runtime move does not
  change index.html, so those must stay green.
- Gate: proof-of-teeth -- the criterion's own gate must RED before the fix and pass after (ADR-0010).
