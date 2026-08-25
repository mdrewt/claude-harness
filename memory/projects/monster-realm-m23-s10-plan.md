# m23-s10 — build plan (M23 accessibility S10: the eval tier + the cross-view wiring spec)

Slice: `m23-s10` · branch `slice/m23-s10` · worktree `.claude/worktrees/m23-s10` · forked from
`origin/master` @ `2dbfe0c` (master CI **green** at that SHA, verified).
Spec: `specs/monster-realm-v2/M23-accessibility.spec.md` §4 row S10, §5.1, §5.2, §5.5, §5.6, §5.7, §6.
ADR: **none assigned** (the supervisor's slot was empty — the m23-s1 / m23-s6 precedent). Every
non-obvious call below is recorded in the artefact headers + the PR body, and an ADR is flagged as a
supervisor follow-up.

---

## §0 — Findings that reshaped the slice (measured, not reasoned)

**F1 — most of §5.1/§5.2/§5.6's checks are ALREADY gated at an equal-or-stronger tier, inside the
same `just ci`.** `justfile:491` is `ci: lint typecheck test eval security wasm client-typecheck
client-test observability-validate` — there is **no CI surface that runs `just eval` but not
`just client-test`**. So moving a check to the eval tier adds zero coverage; it adds a second
implementation. Measured duplicates:

| Spec tag | Already gated by | Tier |
|---|---|---|
| `[A11Y-01]` | `client/src/ui/overlayRegistry.test.ts:1160` `OR-A11Y-TOTALITY-COMPILE` (a real negative `tsc`) | COMPILE (stronger) |
| `[A11Y-02]` | `overlayRegistry.test.ts:1327` `OR-A11Y-LABELKEY-SHAPE` | UNIT |
| `[A11Y-03]` | `overlayRegistry.test.ts:1409` | UNIT |
| `[A11Y-04]` | `client/src/ui/a11yCopy.test.ts:23` `A11YCOPY-OVERLAY-NAMESPACE-EXACT` | UNIT |
| `[A11Y-05]` (node half) | `client/src/indexShell.test.ts:1507` A1/A2 + the B7 identity tooth | UNIT |
| `[A11Y-06]` | `indexShell.test.ts:2218` D5 / `srOnlyIsAccessible` `:1408` | UNIT (stronger — 4 banned decls, `!important`, media-nesting) |
| `[A11Y-07]` | `indexShell.test.ts:2003` D4 / `findIdSelectors` `:1113` | UNIT (stronger — adds reachability + surface halves) |
| `[A11Y-08]` | `client/src/render/world.test.ts:105` `S4-WORLD-CANVAS-REGION` | UNIT |
| `[A11Y-RM2]` | `client/src/render/motionPreference.test.ts:283` `S7T-SCAN` | UNIT (stronger — adds import allow-lists) |

**F2 — `[A11Y-15]` is the one genuinely-uncovered scan, and it is uncovered in a measurable way.**
It exists today only as **three hand-kept file lists**: `renameView.test.ts:501` (10 files),
`renameView.test.ts:1300` (5 files), `menuView.test.ts:1755` (1 file). `client/src/ui/` holds
**18** `*View.ts` files — `errorOverlayView.ts` and `sessionView.ts` are in **none** of them. A
`readdir`-derived scan closes that. `renameView.test.ts:367`–`:372` additionally instructs S10 by
name to match the CALL, not the literal text (`el['focus']()`, `const f = el.focus; f()`,
`HTMLElement.prototype.focus.call(el)` are all invisible to the current matcher).

**F3 — §5.5's two stated open-side assertions are vacuous on the shipped tree.**
`client/index.html:17,22,25,29,36,44,52,57,64,88,103` ship `role="dialog" aria-modal="true"` as
**static literals**, so `role === OVERLAY_A11Y[id].role` and `aria-modal === 'true'` pass before any
code runs for 11 of 16 ids. The non-vacuous attribute is **`aria-label`** (`index.html` ships none
anywhere, so it exists only if `overlayA11y.ts:108` ran) plus the **close-side removal**
(`overlayA11y.ts:142`–`:144`).

**F4 — spec §5.5's tag allow-list `{BUTTON,INPUT,SELECT,A,TEXTAREA}` is unsatisfiable and already
amended.** Measured on the shipped tree, **3 of 16** anchors satisfy it (`#rename-input` INPUT,
`#tradepropose-target` SELECT, `#claim-signin-btn` BUTTON); the other 13 are `<div>`/`<ul>`/`<h2>`
with `tabindex="-1"` (or `"0"` for `#menu-rows`) — the ARIA APG dialog fallback the milestone
**deliberately** ships. `docs/adr/0205-…:31`,`:50`–`:58` amends "natively focusable" → "focusable —
natively, or via `tabindex`", and `:284`–`:287` instructs S10 **by name** to use the identity
assertion, not a tag allow-list. Flagged twice before (m23-s4 plan §A11.2, m23-s6 handoff §4).

**F5 — a FIFTH accumulated correction the task brief did not list.** ADR-0205 `:284`–`:286`:
> S10 must not copy spec §5.1 verbatim: its `[A11Y-02]` regex must permit **uppercase** (D5) and its
> `[A11Y-04]` orphan direction must stay **prefix-scoped** (D5), or it reds on sixteen valid keys and
> on S1's own.

Spec §5.1's literal `/^a11y\.[a-z0-9.]+$/` reds on **all sixteen** shipped keys (`a11y.overlay.boxView.title`
— capital `V`). An unscoped orphan check reds on `a11y.world.region`. Both are folded in.

**F6 — the live-tree comment traps are real and will false-RED a comment-blind scanner on merge:**
`client/src/styles.css:5`–`:31` names `#help-overlay`/`#help-hint`/`#build-stamp`/`display:none`/
`visibility:hidden`/`#a11y-live` in **prose**; `client/src/ui/battleView.ts:26`, `evolutionView.ts:37`,
`claimView.ts:27` name `.focus(` in **comments**; `client/src/render/renderResolver.ts:112` names
`window` in a **comment**; `client/src/main.a11yFocus.test.ts:258`,`:387` legitimately call
`document.body.replaceChildren(...)` in a **test**.

**F7 — `client/src/render/world.ts:83` sets `aria-label` from a FUNCTION CALL** (`t('a11y.world.region')`),
not a literal — a literal-expecting `[A11Y-08]` false-reds.

---

## §1 — Decisions

**D1 — RIGHT-SIZE: ship four artefacts, park two + two follow-ups.**
The declared `touches:` is 5 evals + a baseline + a spec. That is ~2.5k lines of gate code against a
$60 target. SHIP: `evals/overlay-a11y-manifest.eval.mjs`, `evals/a11y-static-shell.eval.mjs`,
`evals/reduced-motion-purity.eval.mjs`, `client/src/ui/overlayA11yWiring.test.ts`.
PARK (`DEFER → backlog`): `evals/contrast-ratio.eval.mjs` + `evals/baselines/contrast-unresolved.json`
(§5.3 — its subjects are S8/S9 inline styles and **both those slices are BLOCKED** on the §8.1/§8.2
operator rulings, so a baseline derived now is guaranteed re-derivation) and
`evals/keyboard-operable-rows.eval.mjs` (§5.4 — the gnarliest scanner, carries the two accumulated
corrections, and its GOOD fixture is S6's `menuView` shape).

**D2 — the three shipped evals implement every spec tag FOR REAL, except `[A11Y-06]`/`[A11Y-07]`.**
Rejected the stronger form of the planner's proposal (delegate *everything* that is already gated):
"declaration pins are forgeable" is a measured finding in this repo, and a pin is strictly weaker
than an independent oracle. Where the independent implementation is **cheap and shares no algorithm**
with the TS side (a key-set diff, a string-shape check, a `readdir` census), it is written for real —
two independent oracles of different construction are worth their keep. The exception is the **CSS
parser**: `parseCssRules`/`findIdSelectors`/`srOnlyIsAccessible` (`indexShell.test.ts:1001`/`:1113`/
`:1408`) are ~400 lines of hardened at-rule-nesting, `!important` and media-union logic, and
`indexShell.test.ts` is **S2's file, outside this slice's `touches:`** — so a second copy could not be
kept in agreement by any in-slice mechanism. That is exactly correction **R-m23-s2-X6**.

**D3 — the correction-R-m23-s2-X6 mechanism: a delegation pin with a LIVE CONTROL MUTATION, not a
second implementation and not a fixture corpus.** `[A11Y-06]`/`[A11Y-07]` are gated by
`findInertDelegations`, which fails on any of four distinguishable conditions:
1. **Presence** — the needle is absent from the *comment-stripped* delegate source (a decoy comment
   must not satisfy the pin).
2. **Inertness** — the eval builds an in-memory copy of the real delegate with the needle deleted,
   re-runs its own predicate, and **requires a FAIL**. A pin that cannot fail is reported as
   `DELEGATION PIN INERT`. This is the executable answer to "declaration pins are forgeable" and to
   "every gate prints PASS yet the ledger reports 0/N met": the proof-of-teeth runs against the
   **real file every CI run**, not against a fixture that can rot.
3. **Reachability** — `client/vite.config.ts`'s `test.include` still contains `src/**/*.test.ts`,
   scoped to the include array slice (the `excludeArraySlice` idiom,
   `dom-shell-coverage-exclusion.eval.mjs:198`; a whole-file search fails open). A narrowed include
   silently un-runs the delegate while every pin stays green.
4. **Vacuity** — the delegate file is non-empty and still contains `describe(` after stripping.

Ranked alternatives, rejected with reasons: a shared JSON fixture corpus (the TS side never reads it,
so agreement stays unverified — it does not solve the stated problem); a pinned source hash (reds on
every unrelated edit, trains the reader to bump it); `new Function`/`eval()` on extracted TS bodies
(remote-only Semgrep `--config auto` fires on dynamic code execution and local `just ci` runs no
Semgrep — a wasted CI round trip); `node --experimental-strip-types` (the three functions are
module-local and the file imports `vitest` at module scope); spawning `vitest` from the eval
(non-hermetic, seconds not milliseconds). The end state — one `evals/lib/a11yCssOracle.mjs` imported
by BOTH — needs `indexShell.test.ts`, which is out of `touches:`. **DEFER → backlog as S10c.**
Declared residual **R-m23-s10-CSSDRIFT**: the pin proves the oracle exists, is called on the real
file, and is executed by CI; it does **not** prove its semantics (those are gated by that file's own
inline BAD/GOOD proofs at `indexShell.test.ts:2003` and `:2219`).

**D4 — `overlayA11yWiring.test.ts`'s oracle is four conjuncts, per ADR-0205 D1.** Conjunct 1 alone is
the vacuity; 2–4 are the teeth.
1. **Identity, never containment** — `document.activeElement === root.querySelector(sel)` after one
   REAL macrotask (never fake timers: `overlayA11y.ts:17`–`:20` makes the defer load-bearing).
2. **Focus really MOVED** — a `<button id="a11y-sentinel">` outside `root` is focused before each
   open and asserted to be `activeElement`; after open, `activeElement !== sentinel`. Kills "the
   anchor is active because nothing happened", and gives the close-side restore a real target.
3. **Programmatic focusability, DERIVED not enumerated** — native control with no `tabindex`
   override, OR an integer `tabindex` attribute. A decorative wrapper `<div>` with neither fails.
   **Not** `focusTrap.ts:64`'s `FOCUSABLE_SELECTOR`, which deliberately excludes `[tabindex="-1"]`
   (`focusTrap.ts:52`–`:56`) — i.e. exactly 11 of the 16 anchors.
4. **`aria-label` on open + all three attributes ABSENT on close** — the only attribute assertions
   that are not free from the static markup (F3).

**D5 — the fixture is the REAL `client/index.html`**, adopted via `DOMParser` + `document.adoptNode`
(the idiom at `main.a11yFocus.test.ts:242`–`:261`), not eleven hand-copied shells. Consequence: a
`tabindex="-1"` deleted from `index.html` reds this spec. The per-view specs use byte-copies
(`dialogueView.test.ts:89`) and **cannot** catch that — this is a large part of the file's value.

**D6 — totality is enforced by `tsc`, never by a count.** `const OPENERS: Readonly<Record<OverlayId,
() => Opener>>` makes omitting an id a COMPILE error (the `overlayRegistry.ts:76`/`:164` device),
belt-and-braced with a runtime key-set equality against `OVERLAY_IDS`.

---

## §2 — Anti-patterns named (do not do these)

*Vacuity:* `root.contains(activeElement)` instead of identity · asserting `role`/`aria-modal`
presence on a shell that ships them statically · a tag allow-list unsatisfiable on 13 of 16 anchors ·
hand-copied per-view HTML in the cross-view spec · a hardcoded file count with no set membership · a
delegation pin with no control mutation · fake timers hiding a defer that never fires.

*Fail-open:* `try { readFileSync } catch { continue }` · a whole-file substring search where a scoped
slice is required (`dom-shell-coverage-exclusion.eval.mjs:266`–`:271` records the exact bug) ·
`.includes('.test.ts')` instead of `.endsWith(…)` · a **regex** block-comment stripper (it mangles
glob strings, and a regex literal containing a quote eats the next line of real code — red-team
shipped 7 duplicate focus calls green against one) · ignoring the F6 comment traps · a `main` guard
on an eval file (it truncates `run.mjs` mid-loop at exit 0).

*Fixture monoculture:* all-BAD fixtures of one shape letting a multi-clause matcher collapse to one ·
GOOD fixtures that are all "correct code" — at least one must be **hostile-but-correct**.

*Process:* editing `evals/run.mjs`, `indexShell.test.ts`, `world.test.ts`, `renameView.test.ts`,
`motionPreference.test.ts` (all outside `touches:`) · `git checkout -- evals/` during mutation
bite-proofs (it wipes uncommitted gate work) · a bare `cd` sending a later `git commit` to `master`.

---

## §3 — Task order (test-first)

1. Author the acceptance ledger (`CHECK`/`EXPECT` per gate) — **before** any test code.
2. `overlayA11yWiring.test.ts`: negative controls NC-1/NC-2 first (they must pass immediately,
   proving the harness), then the parameterised loop over `OVERLAY_IDS`.
3. `overlay-a11y-manifest.eval.mjs`: BAD/GOOD fixtures **before** the real-file read; then measure
   `findFocusCallSites` over the live 18 files (zero hits required).
4. `a11y-static-shell.eval.mjs`: the GOOD test-exemption fixture (`main.a11yFocus.test.ts:258`) proven
   first, then the delegation table + control mutations + the reachability clause.
5. `reduced-motion-purity.eval.mjs`: the GOOD comment fixture (`renderResolver.ts:112`) proven first.
6. Bite-proof every pin against a **copy** of the real delegate (restore via `Edit`, never
   `git checkout`).
7. Full `just ci` once, with the explicit PATH export.

## §4 — DEFER targets (written into the ledger)

`S10b-1` contrast eval + baseline · `S10b-2` keyboard-operable-rows · `S10c` CSS-oracle consolidation
(needs `indexShell.test.ts`) · `S10d` retire the three superseded hand-kept `.focus(` lists (needs
`renameView.test.ts` + `menuView.test.ts`).
