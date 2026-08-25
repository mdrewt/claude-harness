# monster-realm v2 — supervisor handoff (rolling; older entries in monster-realm-handoff-archive-2026-08.md, monster-realm-handoff-archive-2026-07.md)

---

## 2026-08-25T~05:3xZ — m23-s6 COMPLETE (terminal: PR open + local `just ci` green + remote CI running)

**Slice:** m23-s6 — M23 accessibility **S6**: `menuView` becomes an ARIA listbox, and the **sixteenth
and last** `OverlayId` gets its overlay-a11y wiring.
**PR:** https://github.com/mdrewt/monster-realm/pull/369 — OPEN, remote `ci` IN_PROGRESS / `e2e` QUEUED.
**Repo:** project (`mdrewt/monster-realm`). Branch `slice/m23-s6` (worktree `.claude/worktrees/m23-s6`),
6 commits, all pushed. **Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout left on
`master`, never mutated. Forked from `origin/master` @ `3e062c4`; no rebase needed, no sibling in flight.

**Gate:** full local `just ci` **EXIT=0** on the shipped tree — 95 client test files / **2734 tests**,
90 evals PASS, lint + typecheck clean. **Acceptance: 16/16 met, 0 unmet**, `seed:e3b0c44298fc1c14`,
`mr-gates lint` LINT-CLEAN. Seeded ZERO criteria (**SPEC-SECTION-NOT-FOUND, 6th occurrence** across
s0/s1/s3/s4/s5/s7 — M23's EARS live in spec §6; the seeder fix has now been flagged six times).
X1-X16 authored in the PLAN phase. **2 DEFERs → `backlog`, intended owner S10** (A11Y-25, A11Y-26 —
their sole oracle is `evals/keyboard-operable-rows.eval.mjs`, which S6 may not create).

**⚠️ VERIFY NOTES.** Run CHECKs **from the slice worktree** with the usual PATH export. X14 is a
not-weakened ratchet against the measured fork baseline (menuView.test.ts was 21/21/0/0/0 at `3e062c4`;
it is now 40 tests, all 21 legacy blocks **byte-identical**, assertions 57 → 185).

**🔴 SPEC CORRECTION S10 MUST FOLD IN — measured, not reasoned.** Spec §5.4:488-491 names the GOOD
hostile-but-correct fixture as "…**rows at `tabindex="-1"`** and no per-row listener (the
`aria-activedescendant` pattern S6 ships)". **That is wrong and S6 deliberately does not ship it.** A
`tabindex="-1"` `<li>` is *mouse*-focusable: one click focuses the row, the next `replaceChildren`
destroys that node, focus falls to `<body>`, and `aria-activedescendant` — which only speaks while the
listbox itself holds DOM focus — goes permanently silent for the rest of the session. Red-team measured
this on a candidate build. The ARIA APG activedescendant pattern puts tabindex on the **container only**,
which `index.html:117` already ships. Also for S10: `[A11Y-13]`'s identity extractor must accept a
**member expression** (`callbacks.onInput`), not a bare identifier — §5.4:489's `handleMenuInput` is
loose fixture prose, and a bare-identifier scanner would fail this file.

**THE DEFECT THE UNIT TIER ALMOST SHIPPED.** The suite was **37/37 green** and `just ci` was EXIT=0
before red-team found P1: `buildMenuViewModel` emits `index` = array position at **both** menu levels,
so the unqualified id `menu-option-<index>` was **identical** for "categories, Party selected" and
"Party's leaves, Monster Box selected". Descending a level replaced the `<li>` node but left
`aria-activedescendant` at an **unchanged string**, and ATs announce an option on a *value change* — so
the slice's headline deliverable was silent on KeyM-then-Enter, the default path into the menu. Fixed by
level-qualifying (`menu-option-${vm.level}-${row.index}`), with the pointer built from the identical
expression. **Lesson for the remaining M23 slices: a green a11y unit suite proves attribute presence,
not announcement.**

**Red-team found 11 green-and-wrong survivors out of 29 hand-written cheats** against the first suite;
the six material ones were closed in a second tester round (a `render()`-time re-open that yanked focus
on every arrow key; a pointer from the array position; `dataset.menuIndex` from the array position; a
hard-coded `'menu-heading'` literal; an inline code→input map duplicating `menuKeyInput`; a `visible`
getter reading a private boolean). The five remaining are minor and named in the red-team report.

**Supervisor follow-ups (NOT actioned — outside `touches:`):**
1. **ADR-0207 needs allocating.** No number was assigned to this slice (the prompt's slot was empty), so
   no ADR was authored — the m23-s1 precedent. But the **split keydown ownership** rule (a view may
   consume only provably-inert inputs; anything behind a guard chain must bubble to `main.ts`) is a new
   reusable pattern and the reviewer called its ADR non-optional under `standards/adr-process.md`. The
   decision currently lives only in `menuView.ts`'s header and the ARCHITECTURE block.
2. **Backdrop click escapes the focus trap (milestone-wide, NOT caused by S6).** A click on an overlay
   backdrop focuses `<body>`, bypassing the trap and silencing `aria-activedescendant`. Unfixable inside
   any `*View.ts` because A11Y-15 bans `.focus(` there; needs `index.html` (a `tabindex="-1"` on the
   overlay) or `overlayA11y.ts`. Recommend S10/S11.
3. **`main.a11yFocus.test.ts:313,:568` prose is now false** and its exclusion of `menuView` from
   `SAMEKEY_OVERLAYS` rests on that dead premise. Behaviour is fine (`main.ts:1332` reads `visible`
   first) but untested — menuView is now the only overlay of sixteen with focus inside it and no
   same-key toggle-close tooth. Recommend S10.
4. **Spec §5.5's `overlayA11yWiring` tag whitelist** (`BUTTON/INPUT/SELECT/A/TEXTAREA`) still reds on
   eleven of sixteen anchors, `#menu-rows` (`<ul tabindex="0">`) included — S3/S4 already flagged this.
5. The S5 handoff's `visibleIds(probes)[0]` z-order residual was recommended to "S6 or S10" — **it is
   not S6's**; both fixes are outside this slice's `touches:`. Still open, recommend S10.

**Process notes.** `/tmp/mr_warn_m23-s6` (LANDING PATTERN) appeared during the fix cycle, so `/simplify`,
`desync-guard` and the `verifier` subagent were not dispatched; the verifier's checks were run
mechanically inline (no skipped tests; 21/21 fork blocks byte-identical; a level-qualifier-revert
bite-proof reds exactly 3). `reducer-security-auditor`/`desync-guard` had no surface regardless (zero
reducers, schema, `game-core` or predictor/renderer code). The code graphs were NOT re-indexed: the
canonical checkout is unchanged (slice unmerged) and `codegraph status` reports up to date — re-index
after the merge. The `.claude/worktrees/m23-s6` worktree stays for the supervisor's merge pipeline.


## 2026-08-25T~04:1xZ — m23-s5 e2e-red FIX CYCLE COMPLETE (terminal: PR#368 remote CI GREEN both jobs, 13/13 gates met)

**Resume of attempt 2 (e2e-red fix cycle 1+2), branch `slice/m23-s5`, worktree `.claude/worktrees/m23-s5`, HEAD pushed.**
PR#368 mergeStateStatus=CLEAN; remote `ci` SUCCESS, remote `e2e` SUCCESS. **Supervisor owns the merge.**

**What was wrong (two layered defects, both mine-to-fix):**
1. **A1** — the `worldHasFocus()` conjunct gated each WHOLE hotkey branch, including the toggle-CLOSE
   half; S3/S4's deferred focus made "focus inside the overlay" the universal post-open state, so
   same-key close (KeyB/KeyU/…) died for everyone → the 3 remote reds. Fix: supervisor candidate (a),
   uniform: `allow && (<self>?.visible || worldHasFocus())` at all 12 sites. Spec §8.4's acceptance
   overturned by its own overturn condition; §2.3's "byte-identical for sighted players" premise falsified.
2. **A1b** — found only by running the REAL e2e locally: real Chromium leaves activeElement STRANDED
   inside the hidden overlay ~200 ms after any close (`document.body.focus()` restore is a Chromium
   no-op; blur fixup is async; happy-dom diverges on both halves). Fix: `focusInsideHiddenSubtree()`
   (inline-display:none ancestor walk) at (i) the frame close edge and (ii) a keydown self-heal above
   every returning branch (closes the ≤1-frame race, measured 1-in-3 at pvp.spec.ts:117).

**Evidence:** local `just ci` green (95 files / 2715 tests, 90 evals); ledger 13/13 met (all boxes
unchecked + re-executed fresh by mr-gates; X1 amended for A1); verifier PASS (no test weakened, RED
receipts provably red vs da0b0ff); reviewer PASS (0 blockers/majors; 3 minors fixed); tester ran 3
rounds (opus); 6 mutation bite-proofs measured, all bite. ADR-0206 gained appended A1 + A1b.

**Supervisor follow-ups (NOT actioned — outside touches):**
1. **Spec amendment (harness repo):** M23 §2.3's accepted-change sentence + §8.4 + A11Y-19's "or
   toggle" wording must reflect A1 (same-key toggle-close is intended behaviour). One-line each.
2. **`ui/overlayA11y.ts` restore is a Chromium no-op** (`document.body.focus()`, body has no
   tabindex) — the root cause A1b works around. A real restore (blur(), or a tabindex'd body) is an
   S6+ follow-up recorded in ADR-0206 A1b residual (iii); landing it would let the discriminator retire.
3. **Local e2e vs `just ci` collision:** `just ci`'s account-e2e eval cannot run while a dev
   spacetime holds :3000/the global lock — serialize them (memory file updated).
4. Local full-suite e2e on this WSL box shows 1–3 ROTATING walk/convergence timeouts per run
   (different specs each time; every one green in isolation and on the remote runner) — pre-existing
   local-env flakiness, not slice regressions; don't chase them from a slice.

**Housekeeping:** /tmp/m23s5-* logs + /tmp/m23s5-fix-tests/ left for audit; local spacetime instances
stopped; stale 16r-d instance on :3099 (Aug 22 leftover) was killed. The `.claude/worktrees/m23-s5`
worktree stays for the supervisor's merge pipeline.

## 2026-08-24T~21:2xZ — m23-s5 COMPLETE (terminal: PR open + local `just ci` green + remote CI running)

**Slice:** m23-s5 — M23 accessibility **S5, the sole `client/src/main.ts` touch**: the scoped
`worldHasFocus()` gate on the twelve `overlayVerdict(...)` hotkey branches, ONE frame-loop
announcement edge + focus return, and `#help-hint` promoted to a native `<button>`.
**PR:** https://github.com/mdrewt/monster-realm/pull/368 — OPEN / MERGEABLE (remote CI running).
**Repo:** project (`mdrewt/monster-realm`). Branch `slice/m23-s5` (worktree `.claude/worktrees/m23-s5`),
7 commits, all pushed. **Supervisor owns the merge — I did NOT run `gh pr merge`.** Main checkout left
on `master`, never mutated. `origin/master` still `78e2bb2` at finish; no rebase needed, no sibling
in flight, no doc-aggregation collision.

**Gate:** full `just ci` **EXIT=0** on the shipped tree — 95 client test files / **2705 tests**
(fork baseline measured in the same worktree first: 94 / 2684), all evals PASS, observability 8/8,
security clean. **Acceptance: 13/13 met, 0 deferred, 0 unmet** (`seed:e3b0c44298fc1c14`), all with
recorded evidence. Seeded ZERO criteria (**SPEC-SECTION-NOT-FOUND, 5th occurrence** across
s0/s1/s3/s4/s7 — M23's EARS live in spec §6; the seeder fix has now been flagged five times);
X1-X13 authored in the PLAN phase, `mr-gates lint` LINT-CLEAN.

**⚠️ VERIFY NOTES.** Run CHECKs **from the slice worktree** with the usual PATH export. X12 pins the
**literal fork SHA `78e2bb2e6bb1f6b4d91967593e5d9742e3341dc9`**, not `origin/master` — adopted from
m23-s7's headline finding that a diff-vs-ref baseline is forgeable. X13 is a not-weakened ratchet
against the measured fork baseline (>=94 files / >=2684 tests, zero pending/todo).

**🔴 FOR S6 / S10 — the residual this slice found and deliberately did not work around.**
`visibleIds(probes)[0]` (`overlayRegistry.ts:372-374`) is `OVERLAY_IDS` **declaration** order, not
z-order, and `announcements.ts:39-40` documents `topOverlay` as exactly that. `dialogueView` renders
unconditionally on every store batch (`main.ts:1574`) and force-hides only `menuView`, so a
server-pushed conversation can become visible **under** an already-open overlay. Consequences:
`topOverlay` does not transition when a dialogue opens over a lower-index overlay (announcement
silently missed), and `[0]` can name `dialogueView` while a full-screen `z-index:100` `helpView` is
what actually covers the screen (wrong accessible name). Both fixes are outside S5's `touches:` — one
is a view/registry constraint, the other changes the `A11ySnapshot` API S1 froze and S10 asserts
against. **Recommended owner: S6 or S10.** A set-diff heuristic in `main.ts` was considered and
rejected as diverging from the frozen contract.

**Two more out-of-scope findings, flagged not fixed.** (a) `overlayA11y.ts`'s `fallbackFocus` is
advertised as a REQUIRED parameter to make the obligation visible at each call site, but it is
**unreachable on the common path**: `record.returnFocus` is captured as `document.body` for a
hotkey-opened overlay, which is an `HTMLElement` and always connected, so the restore order picks it
first. That is precisely why S5 had to own the focus return itself — worth a §4.1 integration note.
(b) **`menuView` calls neither `openOverlayA11y` nor `closeOverlayA11y`** — it has only its static
markup ARIA: no focus trap, no deferred initial focus, no registry `aria-label`. That is S6's scope
by the spec's own slice table, but it is not currently written down anywhere as outstanding.

**Declared behaviour changes (both in the PR body).** `B` no longer toggles the Box closed while
focus is inside it (spec §8.4's accepted change; Escape still does and the focus return closes the
loop). **Space no longer jumps while a `<button>`/`<a>` has focus** — this one is NOT in spec §2.3's
exemption list, so it is declared rather than slipped in. It was forced: the terminal
`if (e.code === 'Space') { jump(); e.preventDefault(); }` cancels a native button's activation, which
would have shipped A11Y-23 half-dead (Enter-only) and invisible to every source scan, since `main.ts`
is coverage-excluded.

**Three gate STRENGTHENINGS, each measured.** `W-ONE-CORNER-AFFORDANCE` went tag- AND depth-agnostic
(`body > div` → every inline-`position:fixed`, non-`inset:0` element at any depth) — a second corner
affordance shipped as `<a>` or as a nested `<button>` was invisible to the fork's selector and now
bites. H4b's allow-list gained `background` outright plus `border`/`padding` **with value clauses**,
so the growth-knob cheats still fail. And it closed a hole that **predated this slice**: `font` was
allow-listed with no value constraint, so `font:900px/1 monospace` kept `width:max-content` and every
allow-listed NAME while rendering the badge as a giant click-eating strip.

**Process notes worth keeping.** (1) The `tester` has no Bash, so **the orchestrator must execute the
RED proof and every bite-proof** — doing so found two harness defects the tester could not see:
`overlayIsOpen()` false-positived on every static shell (m23-s2 ships `role="dialog"` as a *markup
literal*, `index.html:89-92`, so the role never changes), and the `setTimeout(0)` deferred focus was
never flushed. (2) The tester's own two new teeth were **mutually unsatisfiable** — a whole-file
`worldHasFocus()` census of 12 contradicted the pump tooth's own expected literal, which contains a
13th call. Fixed by scoping the census to the keydown listener (12) plus a separate whole-file (13)
plus an exactly-1 on the snapshot region. (3) `W-UX1-HINT-NO-JS-OWNER` is a **RAW-source** pin: a
*comment* in `main.ts` mentioning `help-hint` reddened it. (4) 16 mutation bite-proofs measured, all
BITE.

**Verifier APPROVED (independent, pre-merge).** Re-executed all 13 CHECKs itself — every deciding
line matched the recorded EVIDENCE byte-for-byte. Not-weakened audit CLEAN: no test deleted/skipped/
emptied, no `expect` removed, exactly 12 `expectedRaw` hunks add the conjunct and KeyT's block never
appears in the diff. It chose **four mutants of its own** (none in my 16) and all four BITE:
`worldHasFocus` stubbed to `return true`, `lastA11ySnapshot = nextSnapshot` deleted,
`announcementsFor` args swapped, `type="button"` dropped. It also re-ran the `document.body` mutant
itself and reproduced 11 reds exactly. It accepted the happy-dom substitution for the four
`[E2E]`-tiered criteria after reading §5.7 independently. **One finding acted on:** the
`W-ONE-CORNER-AFFORDANCE` rewrite had dropped its anti-vacuity floor 12 → 10; the population changed
(14 inline-styled elements vs 14 body divs) but the slack did not need to, so it is restored to 12 —
exactly the pre-widening tightness — and the full `just ci` was re-run to EXIT 0 on that final tree
with the ledger still 13/13.

**Housekeeping.** Untracked harness files: `memory/projects/monster-realm-m23-s5-plan.md` (plan +
the three-lens adjudication) and `/tmp/m23s5-tests/TEETH-MEASURED.md` — commit or discard. Code
graphs NOT re-indexed (nothing merged; main checkout still `78e2bb2`). `reducer-security-auditor`
and `desync-guard` not run: the diff has zero server-module/schema/reducer files and zero
predictor/reconcile/interpolation files (mechanically empty scope, m23-s0/m23-s4 precedent).
**The post-implementation review fan-out was NOT run** — `/tmp/mr_warn_m23-s5` (LANDING PATTERN)
appeared mid-slice, so per its instruction no new subagent fan-outs were spawned; the three plan
lenses (reviewer + red-team + `/simplify`) ran BEFORE it appeared and their findings are folded into
plan §8 and ADR-0206, and a single `verifier` was run as the DoD merge gate. ADR next-free = **0207**.

---

## 2026-08-24T~15:5xZ — m23-s7 COMPLETE (terminal: PR #366 open + local `just ci` green + remote CI running)

**Slice:** m23-s7 — M23 accessibility **S7, reduced motion** (§2.5): `render/motionPreference.ts` (new,
sole matchMedia caller), `ResolveInput.reduceMotion?`, the two renderResolver branches,
`interpolateReducedMotion`. **Repo:** project (`mdrewt/monster-realm`).
**PR:** https://github.com/mdrewt/monster-realm/pull/366 — OPEN. Branch `slice/m23-s7`
(worktree `.claude/worktrees/m23-s7`), 7 commits incl. one master merge, all pushed. **Supervisor owns the merge — I did NOT
run `gh pr merge`.** Main checkout left on `master`, never mutated.

**Gate:** full `just ci` **EXIT=0 on the exact shipped tree** (run THREE times — pre-docs-append,
post-docs-append, and again on the master-merged tree): final run 90 evals PASS / 0 FAIL, 92 client
files / 2644 tests (incl. m23-s3's), observability 8/8. **Acceptance: 10/11 met with
recorded evidence, 1 DEFERred, 0 unmet** (`seed:e3b0c44298fc1c14`). Seeded ZERO criteria
(SPEC-SECTION-NOT-FOUND again — M23 EARS live in §6); X1-X10 authored in PLAN phase, LINT-CLEAN.
**desync-guard (mandatory, §9.6): PASS — netcode-untouched claim HOLDS.** Verifier independently
APPROVED (not-weakened audit vs red commit 2eb9973; gate sample re-executed; 2 mutants bite).

**⚠️ VERIFY NOTES:** run CHECKs from the slice worktree with the usual PATH export (X7 spawns
wasm-pack; probes need node 24). **X3 reads `memory/projects/gates/m23-s7.baseline-fullnames.json` —
do not delete.** X8/X10 diff against the PINNED merge-base SHA f33a3eb, not origin/master (see
headline) — re-pinned from the original fork SHA 0953db7 after sibling m23-s3 merged to master
mid-slice and its ARCHITECTURE.md milestone-log append CONFLICTED with this slice's (the predicted
doc-aggregation collision; GitHub runs no pull_request workflow on an unmergeable PR, which presented
as 'no checks reported' for 13 minutes). Resolved by merging master INTO the branch (force-push is
hook-blocked; the squash-merge collapses the merge commit) with both entries kept in merge order.
**DEFER: X11 -> backlog, but the real target is S10** — `mr-gates lint` rejects `S10`/`m23-s10` as
targets (no spec section registry entry); route it to S10 rather than materialising a new section.

**🔴 HEADLINE — the acceptance-ledger evidence chain is FORGEABLE, red-team PROVEN, supervisor action
needed.** (a) Any CHECK diffing `origin/master...HEAD` is defeated by a local ref rewrite (git
plumbing baked a malicious eval edit into a forged merge-base; the gate printed its exact success
line). Fixed in THIS ledger by pinning the fork SHA — recommend for every future slice ledger.
(b) `memory/projects/gates/` is gitignored: ledger + X3-style baselines have zero audit trail. A
delete-tests+pad-baseline forgery survived until uniqueness+floor clauses were added, and a
swap-for-other-real-names variant STILL survives. **True closure = version-control the gates dir.**
Memory cards: `mr-gates-ledger-forgery-surfaces`, `test-suffix-exemption-admits-disguised-production`.

**Declared deviations (PR body §Declared spec deviations):** `reduceMotion` OPTIONAL (S7 is
main.ts-free per §4, so the sole resolve() call at main.ts:2719 must keep compiling; S5 tightens);
A11Y-28 satisfied in-slice by the S7T-SCAN test, repo-wide eval deferred to S10.

**Red-team round 1 nuance worth keeping:** its own freeze-cheat kill fixture did NOT bite (a 2-tile
lag is Chebyshev>1 and snaps anyway) — the bite needs a lag of EXACTLY 1 tile. Shipped as
S7T-OWN-FREEZE. Round 2: 12/14 mutants killed, 1 documented equivalent (live-read vs cached
listener), 1 low DRY residual (fromWindow hardcoding the query literal — undetectable while
byte-equal). Scan-evasion residuals declared in the ledger (token-split, Function-constructor global
grab, disguised-.test.ts tripwire-only).

**S5 forward contract (also in motionPreference.ts header + PR):** wire
`motionPreferenceFromWindow()` beside main.ts:236, pass `motion.reduceMotion` at main.ts:2719; the
`sawFractionalOwnMotion` DEV latch (main.ts:2740) never sets under live reduced motion — S5 must
account; matchMedia/addEventListener throws surface on first real-window execution (no legacy
addListener fallback, by design). **S10:** S7T-SCAN and the future eval enforce the same invariant —
divergence is a defect in one of them; S10 may keep or thin the test.

**Housekeeping.** Untracked harness files: `memory/projects/monster-realm-m23-s7-plan.md` (plan +
three plan-lens adjudications) — commit or discard; `memory/projects/gates/m23-s7.baseline-fullnames.json`
must persist until X3 is last verified. Code graphs NOT re-indexed (nothing merged; main checkout
still 0953db7). reducer-security-auditor not run — diff has zero files outside client/src/render/
(mechanically empty scope, m23-s0 precedent); desync-guard covered the netcode dimension.

---

## 2026-08-24T~1?:??Z — m23-s1 COMPLETE (terminal: PR #364 open + local `just ci` green + remote CI running)

**Slice:** m23-s1 — M23 accessibility **S1, the helper substrate**: `ui/focusTrap.ts`, `ui/liveRegion.ts`,
`ui/announcements.ts`, `ui/overlayA11y.ts` (all new). **Repo:** project (`mdrewt/monster-realm`).
**PR:** https://github.com/mdrewt/monster-realm/pull/364 — OPEN / MERGEABLE. Branch `slice/m23-s1`
(worktree `.claude/worktrees/m23-s1`), 4 commits, all pushed. **Supervisor owns the merge — I did NOT
run `gh pr merge`.** Main checkout left on `master`, never mutated.

**Gate:** full `just ci` **EXIT=0** on the exact shipped tree — 87 client test files / 2532 tests
(+47), 90 evals PASS / 0 FAIL, observability 8/8. Baseline measured green in the same worktree at
`origin/master` e664fa7 first: 83 files / 2485 tests. **Acceptance ledger: 14/14 met, 0 deferred,
0 unmet** (`seed:e3b0c44298fc1c14`), all with recorded evidence.

**🔴 THE HEADLINE FOR THE SUPERVISOR — a milestone-level slicing defect, not a slice defect.**
Spec §2.4 mandates FOUR announcement transitions. **Only (1) "overlay opened" is resolvable by any
slice as currently sliced.** (2) world-region, (3) battle turn outcome and (4) prompt/zone-change
each need NEW `a11yCopy.ts` entries, `t()` throws on a miss — and **`a11yCopy.ts` is in NO slice's
`touches:` after S0** (spec §4 table). Worse, **A11Y-22 is structurally unsatisfiable**: spec:362
pins S5 to `client/src/main.ts` + `client/index.html` (`#help-hint` only), A11Y-22 needs
`a11y.world.region`, and A11Y-4's orphan rule forces the key and its consumer into the SAME change.
No slice can legally do both. **Needs a re-scope ruling before S5 is launched.** S1 shipped the
mechanism (`announcementsFor`'s `message` pass-through field), not the wiring.

**ADR conflict needing a ruling.** Spec §12 says S0 "writes per-slice ADRs from there onward", but
the supervisor assigned this slice ADR number `None`. Under the standing fan-out rule
(`docs/adr/**` = reserved number only) picking 0206 myself risks colliding with a concurrent
sibling, so **no ADR was authored**; the six decisions ride in the module headers and the PR body.
Recommend allocating a number for a follow-up ADR. ADR next-free = **0206**.

**Two cross-slice contracts S1 CANNOT self-enforce** (in the module headers + PR body):
(a) the four `#app`-mounted overlays share ONE root and the map is keyed by `OverlayId`, so **S4
must close-before-open** or two capture-phase traps stack on the same node — confirmed concretely,
one Tab then moves focus twice in a single dispatch and lands back where it started; (b)
**`LiveRegion.flush(now)` must be pumped from S5's rAF loop** or the live region is permanently
silent and **nothing in S1-S4 reds** (every S1 test calls `flush` itself). Recommend §4.1 also add
force-hide ↔ close to its cross-slice contract list: if S5's `refreshBattle` force-hide path sets
`style.display='none'` directly instead of calling each view's `hide()`, the record leaks a live
listener and a much-later close restores focus to a long-expired element.

**Red-team WROTE AND RAN the cheats against the shipped diff and found FOUR green-but-wrong impls.**
Three are now bitten (I re-measured each myself: cheat → 2 failures vs. the control's 1):
`FOCUSABLE_SELECTOR` gutted to `'button:not([disabled])'` (no fixture anywhere used an
`<input>`/`<textarea>`/`a[href]`/`[tabindex]` — while `#rename-input` and tradePropose's currency
inputs are real production focusables); the `:not([tabindex="-1"])` clause dropped; and
`announcementsFor` returning a shared in-place-mutated array. **The fourth cannot be bitten today
and is stated honestly rather than overclaimed:** a hardcoded `role='dialog'` passes the 16-way
`S1-ARIA-ALL-16` loop because **all sixteen registry entries are `'dialog'` — the manifest has zero
variance on that field**, so the plan's "parameterisation kills the literal" claim was FALSE. A
TRIPWIRE test now reds the day an overlay earns `'alertdialog'`.

**Two declared spec amendments, flagged for sign-off.** `nextFocusTarget` returns
`HTMLElement | null` (spec §2.2 says `HTMLElement`; `noUncheckedIndexedAccess` is OFF so
`focusables[0]` is a runtime-`undefined` trap). `closeOverlayA11y(id, fallbackFocus)` takes no
`root` — it is stored at open time, so a caller passing a different root at close cannot strip ARIA
off the wrong node while the original trap leaks.

**Accepted UX consequence, deliberately NOT redesigned:** trailing-edge coalescing delays a lone
announcement by up to 500 ms. A leading-edge throttle would emit the FIRST message, which fails
A11Y-9 verbatim ("emit only the most recent"). Flagged to M23's owner as a criterion question —
the ledger criterion is the authority, not my preference.

**Process notes worth propagating.** (a) `npx vitest run <MISSING-FILE> --reporter=json` prints a
well-formed report with `numTotalTests:0` and **exits 0** — a JSON-reporter gate that only checks
`success===true && numFailedTests===0` is vacuously green against a spec file that does not exist.
(b) `-t '<tag>'` is the WRONG gate filter twice over: substring-matched, AND it marks every
non-matching test in the same file as **pending**, so `numPendingTests===0` reds every legitimate
run of a multi-tag file. Every CHECK here runs the whole file and asserts each required tag appears
in the PASSING `fullName` set **exactly once**. (c) **`mr-gates check` flips the checkbox but records
NOTHING unless the gate already has an `EVIDENCE: pending` line to overwrite** (`mr-gates:952`) —
it then reports a baffling `0/14 met` while every gate prints `PASS`. Hand-authored ledgers must
include the placeholder. (d) `mr-gates lint` rejects any CHECK containing `||`, which
false-positives on ordinary JS like `String(e.stdout||'')`. (e) The `npm ci`-under-node-v18 trap bit
again exactly as recorded: it fails `notsup` while a `| tail` wrapper reports exit 0, and the
symptom surfaces much later as `biome: not found` / exit 127 at the **lint** stage.

**Housekeeping.** Untracked harness files: `memory/projects/monster-realm-m23-s1-plan.md` (the plan
plus the full adjudication of the three plan-review lenses) — commit or discard as you prefer. The
ledger `memory/projects/gates/m23-s1.gates.md` is filled, LINT-CLEAN and 14/14 with evidence.
Three new memory cards written (vitest JSON gate shape, the mr-gates EVIDENCE placeholder, fixture
monoculture). The `/tmp/mr_warn_m23-s1` LANDING flag appeared after the last green increment; I
converged from there with no further fan-outs — the `verifier` role was discharged by red-team's
independent not-weakened confirmation plus my own mechanical re-run, which is the one deviation
from the standard lens set and is called out here rather than glossed.

---

## 2026-08-24T~10:0xZ — m22-s1 COMPLETE (terminal: PR #360 open + local `just ci` green + remote CI running)

**Slice:** m22-s1 — M22 privacy/compliance **S1, pure `game-core` deletion contract surface**. **Repo:** project (`mdrewt/monster-realm`). **PR:** https://github.com/mdrewt/monster-realm/pull/360 — OPEN / MERGEABLE. Branch `slice/m22-s1` (worktree `.claude/worktrees/m22-s1`), 3 `wip:` commits, all pushed. **Supervisor owns the merge — I did NOT run `gh pr merge`.**

**Gate:** full `just ci` **EXIT=0** — 1996/1996 nextest passed, 2472 client tests, 90 evals PASS / 0 FAIL, clippy `-D warnings`, `cargo fmt --all --check` clean, observability 8/8 gates. **Acceptance ledger: 9/9 met, 0 deferred, 0 unmet** (`seed:e3b0c44298fc1c14`). Seeded with ZERO criteria (`SPEC-SECTION-NOT-FOUND` — spec §7.4's PRV1-* criteria are all S2+, S1 has none), so X1-X9 were authored in the PLAN phase and are LINT-CLEAN. Verifier independently re-ran `mr-gates verify`: 9/9, `seed_drift=false`, `evidence_mismatch=[]`.

**🔴 READ BEFORE STARTING S3 — measured red-on-arrival (this is the headline).** `evals/guest-claim-integrity.eval.mjs:388-394` pins `SANCTIONED_REDUCERS` as an exact set of FIVE reducer names compared by set EQUALITY at `:564-572` — deliberately not `>= 5`. `STATE_TRANSITION_OWNERS` (shipped by this slice) names `account_deletion_reaper`, which does **not exist yet**. The moment S3 declares that reducer in `accounts.rs`, `[R/name-set]` FAILS. Its Rust twin over `ACCOUNTS_RS` in `server-module/src/accounts_tests.rs` needs the same update in the SAME commit. Filed as residual `R-m22-s1-R-m22-s1-X1`. **Also recorded in the shipped doc comment so it is read at the call site:** the `Identity`-typed `TOMBSTONE_IDENTITY` must be declared in `server-module/src/lib.rs` beside `WILD_IDENTITY` (`:84`) as `Identity::from_byte_array(game_core::TOMBSTONE_IDENTITY_BYTES)` — NEVER in `accounts.rs`, whose `[R/identity-ctor]` clause (`evals/guest-claim-integrity.eval.mjs:419-424`, scoped to `ACCOUNTS_PATH` at `:384`) flatly bans that constructor; and never as a second hand-typed literal (SSOT precedent: `server-module/src/lib.rs:77,80`). All three claims independently verified against the live eval AND its Rust twin.

**Two more residuals filed as real queued work** (`mr-gates residuals list --unclaimed`): `R-m22-s1-R-m22-s1-X2` — no display-name tombstone is single-sourced; the only existing one, `server-module/src/ranking.rs:161` `PROFILE_TOMBSTONE_NAME = "(claimed guest)"`, belongs to the guest-claim flow and also zeroes `rating`/`wins`/`losses`, so S3 either misuses it or writes the rule twice. **Spec gap, not a slice defect** — spec §3 requires name tombstoning but §7.2's S1 row omits the constant. `R-m22-s1-R-m22-s1-X3` — S8's grace countdown will duplicate the window in TS; verified by an actual `wasm-pack` build that `client-wasm/pkg` exports only the pre-existing 10 functions. Fix precedent: `client-wasm/src/lib.rs:174-200`.

**Delivered.** `game-core/src/accounts/deletion.rs` (new) with `DELETION_GRACE_MS_DEFAULT: i64 = 604_800_000`, `is_deletion_due(Option<i64>, i64) -> bool`, `TOMBSTONE_IDENTITY_BYTES: [u8;32] = [0xFF;32]`, `TOMBSTONE_AUTH_ISSUER = "account-deleted-tombstone"`, `EXPORT_CHUNK_ROWS: u32 = 500`, `STATE_TRANSITION_OWNERS` (the 3 §4.7 reducers). Plus `accounts/mod.rs`, `accounts/deletion_tests.rs`, `game-core/tests/m22_s1_deletion_surface.rs`, 2 additive hunks in `game-core/src/lib.rs`, 1 paragraph in `ARCHITECTURE.md`. **Zero schema/reducer/client/wasm/eval change.**

**Declared deviation from the spec's name:** `TOMBSTONE_IDENTITY_BYTES`, not `TOMBSTONE_IDENTITY` — `game-core` has no `spacetimedb` dep and `client-wasm` depends on it *without* the feature, so the value must be `[u8;32]`. `_BYTES` is a substring superset so any grep on the spec's name still matches. **Also deviated, declared:** spec §7.2 line 470 says every slice owns a new eval file. S1 shipped none — `evals/` is outside its `touches:`, S1's teeth are native `cargo test` + the nightly zero-tolerance `cargo mutants` gate, and S6 explicitly owns `evals/deletion-completeness.eval.mjs`. The textual coverage an eval would have provided lives in X4/X5/X7's node-side clauses.

**Red-team wrote and ran the cheats — twice, and beat my own gates the second time.** Round 1 (against the plan) produced the test list. Round 2 (against the shipped diff) found THREE real gate bypasses, all closed and re-bitten: X3's and X2's source pins were satisfiable by a decoy `//` comment inside the function body while the live arm was wrong, and X4's cross-crate `WILD_IDENTITY` extractor was a first-match regex fooled by a commented decoy earlier in `server-module/src/lib.rs` — it reported `wild=0u8;32` while the compiled constant had been changed to `0xAA`. All three CHECKs now strip line AND block comments before matching; all four decoys (incl. a block-comment variant) re-measured RED, controls still pass.

**Mutation coverage, stated honestly.** `cargo mutants --file game-core/src/accounts/deletion.rs` → `missed=0 caught=3`. Only 3, because **cargo-mutants mutates FUNCTIONS only** — those 3 cover `is_deletion_due` and never touch the five constants. Separately I hand-ran 10 wrong implementations: 8 killed by the tests, 2 (`None => DELETION_GRACE_MS_DEFAULT == 0` and `unwrap_or(now_ms)`) behaviourally invisible and killed only by X3's source pin; a hardcoded literal replacing the named const is killed only by X2's.

**Process notes worth propagating.** (a) A fresh worktree has no `client/node_modules`, so the FIRST `just ci` dies at `lint` with `biome: not found` / exit 127 — run `npm ci` in `client/` first; a naive `cmd; echo EXIT=$?` wrapper reported this as exit 0. (b) The implementer correctly REFUSED to edit the gating tests when `cargo fmt --check` and `clippy::assertions_on_constants` failed inside them, and escalated instead; both fixes were routed back to the tester (the file owner) and were comment/whitespace/operand-binding only. The clippy failure was fixed by rebinding `assert!(<pub const> > 0)` operands to typed locals — MEASURED to defeat the lint — rather than by an `#[allow]`, so no suppression sits inside a gating test file. (c) Reviewer and red-team INDEPENDENTLY caught the same false tooth-claim in a test's doc comment (it named the wrong mutant shape and overclaimed what it kills); the tester rewrote it to say plainly that the assertion is a PARTIAL tooth and that gate X3, not the assertion, is what kills the shape.

**Housekeeping.** Untracked harness file: `memory/projects/monster-realm-m22-s1-plan.md` (the plan + the three plan-review lenses' adjudication) — commit or discard as you prefer. The gates ledger `memory/projects/gates/m22-s1.gates.md` is filled in and LINT-CLEAN. Main checkout was left on `master` and never mutated.

---

## 2026-08-24T~06:5xZ — m23-s0 COMPLETE (terminal: PR #361 open + local `just ci` green + remote CI running)

**Slice:** m23-s0 — M23 accessibility **S0, the substrate**: `A11yMeta` + total `OVERLAY_A11Y` in
`ui/overlayRegistry.ts`, new `ui/a11yCopy.ts` (frozen flat catalog + throw-on-miss `t()`).
**Repo:** project (`mdrewt/monster-realm`). **PR:** https://github.com/mdrewt/monster-realm/pull/361
Branch `slice/m23-s0` (worktree `.claude/worktrees/m23-s0`), 5 commits, all pushed.
**Supervisor owns the merge — I did NOT run `gh pr merge`.**

**Gate:** full `just ci` **EXIT=0** — 90 evals PASS / 0 FAIL, 83 client test files / 2485 tests,
observability 8/8. Verifier re-ran it independently: same numbers.
**Acceptance ledger: 5/5 met, 0 deferred, 0 unmet** (`seed:e3b0c44298fc1c14`). Seeded with ZERO
criteria (`SPEC-SECTION-NOT-FOUND`) — but the criteria DO exist: **the seeder missed them because
M23's EARS block is §6, not a §7.x section.** X1-X5 are a 1:1 transcription of A11Y-1..A11Y-5.
Worth fixing in the seeder; other M-specs may have the same shape.

**⚠️ LEDGER NOTE — gate ids must be `X1:`, not `X1 (= A11Y-1) [COMPILE]:`.** `GATE_LINE`
(`mr-gates:243`) is `^- \[( |x|X)\] (\S+):` — an id with a space in it parses as ZERO gates and
`check` reports a cheerful `0/0 met`. Put the annotation AFTER the colon.

**Three findings the supervisor should propagate:**
1. **The house textual declaration pin is BYPASSABLE — measured.** `OVERLAY_HANDLES_DECL`-style
   pins (`main.wiring.test.ts:6046`) are defeated by planting a *used* exported string constant
   holding the byte-exact expected declaration: `tsc` clean, `countOccurrences(...) === 1` passes,
   totality destroyed. Structural to ANY pure-text substring pin. The replacement that works is a
   **negative compile** — spawn `tsc --noEmit` on generated probe modules and assert the polarity
   of the compiler's verdict, with a guaranteed-uncompilable CONTROL probe so a broken spawn can't
   make every "must not compile" assertion pass vacuously. ~0.6s/probe. ADR-0205 D6. **This
   pattern should probably replace every declaration pin in the repo.**
2. **Two M23 spec defects, amended in ADR-0205 and FLAGGED FOR SIGN-OFF.** (a) §2.1/A11Y-14's
   "MUST resolve to a **natively** focusable element" is unsatisfiable for 7 of 16 ids without S2
   shipping four dead controls; amended to "focusable, natively or via `tabindex`". (b) §5.1
   `[A11Y-02]`'s regex `/^a11y\.[a-z0-9.]+$/` REJECTS the canonical key §2.8 itself gives
   (capital V) and ACCEPTS `a11y..` / `a11y.....` (both measured `true`). **S10 must not copy §5.1
   verbatim.**
3. **`vitest -t "<tag>"` is substring-matched** — a decoy `it('TAG (temporarily stubbed)', () =>
   expect(1).toBe(1))` prints a byte-identical `✓` line and `Tests 1 passed (1)`. Every ledger
   CHECK here runs the whole file via `--reporter=json` and asserts exact `fullName` + `status` +
   `numFailedTests===0` + `numPendingTests===0`. **Recommend that shape for every vitest gate.**

**Red-team found six green-but-wrong bypasses OF THE SHIPPED DIFF**, all closed and re-bitten:
`initialFocusSelector` had no content gate at all (blanking all 16 to `''` left tsc + the whole
suite green); the purity scan's `/^\s*import\s/m` was evaded by appending a real import to the END
of an existing code line; `a11yCopy` was `Readonly<>` but not frozen; `spawnSync` had no timeout
(vitest's `it()` timeout cannot interrupt a SYNCHRONOUS child — measured).
**28 mutation bite-proofs red, 2 must-stay-green; the verifier independently re-ran 10.**

**Obligations S0 creates (all in ADR-0205, repeated in the PR body):** S2 adds `tabindex="-1"` to
ten static-shell anchors and **`tabindex="0"` — never `-1` — to `#menu-rows`** (the most likely
S2↔S6 integration red in the milestone); S4 adds four constructor-time `data-testid`s,
**attribute-only** (a wrapper breaks three `recruit.spec.ts` `parentElement.parentElement` chains);
S3 deletes the two view-local deferred `.focus()` calls; S1 owns orphan-checking `a11y.world.*`.

**touches-delta:** the two sibling `*.test.ts`, `docs/adr/0205-*.md`, `ARCHITECTURE.md`, and
`docs/adr/DIGEST.md` (mechanically regenerated by `just adr-digest`, drift-gated by `just ci` — an
ADR cannot land without it). **boyscout-delta:** 3 hunks / 4 lines, all comment-only.
**Follow-up flag, NOT touched:** `client/src/main.ts:390` carries the same stale "15
mutual-exclusion overlays" — S5 is the sole `main.ts` slice.

**Code graphs NOT re-indexed, deliberately:** nothing is merged, the main checkout is still at
`2a6864b`, and `codegraph status` already reports "Index is up to date". Re-indexing now would only
pull worktree paths into the cache, which the doctrine forbids. Refresh after the squash-merge.

**`reducer-security-auditor` / `desync-guard` not run — scope is mechanically empty:** the diff has
zero files under `server-module/`, `game-core/`, `client/src/net/` or `client/src/render/`.

---

## 2026-08-24T~08:5xZ — m22-s0 COMPLETE (terminal: PR #359 open + local `just ci` green + remote CI running)

**Slice:** m22-s0 — M22 privacy/compliance **S0, contract-first**: freeze the export seam S1-S9
build against. **Repo:** project (`mdrewt/monster-realm`).
**PR:** https://github.com/mdrewt/monster-realm/pull/359 — OPEN / MERGEABLE, `ci` + `e2e` pending at
exit. Branch `slice/m22-s0` (worktree `.claude/worktrees/m22-s0`), 8 `wip:` commits, all pushed.
**Supervisor owns the merge — I did NOT run `gh pr merge`.**

**Gate:** full `just ci` **EXIT=0** — 90 evals PASS / 0 FAIL, 2472 client tests, clippy `-D warnings`,
biome, security, observability-validate. Semgrep + gitleaks additionally run locally on the two
changed files (both remote-only in CI): 0 findings.
**Acceptance ledger: 4/4 met, 0 deferred, 0 unmet** (`seed:e3b0c44298fc1c14`). Seeded with ZERO
criteria (`SPEC-SECTION-NOT-FOUND` — §7.4's EARS are all S1-S9, S0 has none), so X1-X4 were authored
in the PLAN phase and are LINT-CLEAN.

**⚠️ LEDGER NOTE CORRECTED — a PATH export IS required for `mr-gates verify`.** My first draft of the
note said "node-only, no PATH needed". Wrong, and the verifier reproduced the false RED: **X3 shells
out to `node evals/run.mjs`, which spawns cargo-backed evals** — without `$HOME/.cargo/bin` it prints
`cargo: not found` and returns `m22-s0-X3:SUITE-RED fail=8`. Export
`PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"` and run from the slice worktree
root. The note in the ledger now says this.

**Delivered.** `evals/guest-claim-integrity.eval.mjs`: `REKEY_MANIFEST` → `export const … =
freezeManifest({…})` (recursive, WeakSet-guarded) + a contract comment. New
`evals/rekey-contract-surface.eval.mjs` (3 teeth). `ARCHITECTURE.md`: one paragraph.
**touches-delta:** the new eval (companion test file; spec §7.2 mandates a per-slice eval, and an
in-file tooth structurally cannot observe the `export` keyword) and `ARCHITECTURE.md`.
**boyscout-delta: none** (seam-freeze slices are boyscout-exempt).

**Two decisions the supervisor should propagate into the spec (I did NOT edit the harness spec — the
brief scoped this slice to the project repo to avoid a cross-repo touch):**
1. **Export in place; `evals/rekey-registry-shared.mjs` NOT created.** The lift is conditional on a
   size-split threshold; **there is no such convention in the repo** (no `max-lines` in `biome.json`,
   nothing in `AGENTS.md`/`docs/`). The file is 4th largest of 89 evals. The spec's S4 row cites "the
   M8.9 split threshold" as if it existed — **it does not**; fix that too.
2. **No re-export barrel.** §2 (`:74-77`), §7.1 and the §7.2 S0 row list `parseTableSchemas`/
   `stripRustSource` as exported from `guest-claim-integrity`. They are owned by
   `battle-schema-snapshot.eval.mjs` and `rust-scan.mjs` (ADR-0181 D1) and ESM already hands both
   gate files the same function objects under `run.mjs`. Amend the wording; the intent ("one walker,
   two gate files") is preserved.
3. **The S0 row's `mr-state.json` deliverable is already landed** (`adr_next_free` = 205) and lives in
   the HARNESS repo — listing it under a project slice's `touches:` was mis-specified.

**🔴 READ BEFORE STARTING S2 — `R-m22-s0-X1`, measured red-on-arrival.**
`checkRekeyCompleteness` infers REKEY from `typeof policy === 'string'`, so **any object entry is
REKEY by definition**. Converting ONE BLOCKED string entry to an object keeps the S0 eval green and
reds `guest-claim-integrity` with `FG47 … [G6/consumed] the manifest marks battle.player_identity as
REKEY via \`undefined\``. Adding new *keys* is measured-safe. The only green workaround forces a lie
(borrowed needles advertise a BLOCKED column as re-keyed). S2 must add an explicit policy/kind
discriminator and teach the `[G6/consumed]` loop, BOTH detail-string counts (`:3079-3081` and
`:3092`) and fixture FG52 to read it.

**Four residuals filed as real queued work** (`mr-gates residuals list --unclaimed`):
`R-m22-s0-X1` (above) · `R-m22-s0-X2` `[G6/declared]`'s `key in manifest` walks the prototype chain
that `Object.freeze` does not seal — `Object.prototype` pollution greens an unclassified Identity
column; PRE-EXISTING (confirmed byte-identical on master by two lenses), one-token fix verified both
ways (`Object.hasOwn`), not taken because seam-freeze slices are boyscout-exempt ·
`R-m22-s0-X3` `findIdentityColumns` matches literal type TEXT, so an aliased
`pub type OwnerId = Identity;` column is invisible (documented as a KNOWN LIMITATION in the contract
comment) · `R-m22-s0-X4` `evals/run.mjs` has no completeness check.

**NEW HARNESS-WIDE HAZARD, now in memory as `eval-main-guard-truncates-run-mjs`.** A main guard
widened to compare `path.dirname` — or `endsWith('run.mjs')` — fires under `run.mjs` (whose
`argv[1]` is a sibling `.mjs` in the same dir), runs the eval at module scope and `process.exit(0)`s
the harness. **Measured: 37 of 90 evals ran, 3 already-printed `eval FAIL:` lines swallowed, exit 0,
`just ci` GREEN.** `run.mjs` guards only `files.length === 0`. Any acceptance gate asserting merely
`fail===0 && exit===0` is blind to this; X3 caught it only because it also asserts the named eval's
PASS line appears exactly once. **Recommend that shape for every future eval-suite gate.**

**Red-team wrote and ran the cheats — twice.** Round 1 broke 6 of the first draft's teeth (all fixed
by the tester, who is a different agent than the implementer). Round 2 against the shipped diff found
the `endsWith('run.mjs')` blindness, path-conditional stripping (which it then used to hide a real
unpoliced `Identity` column with BOTH gates green), a concat-blob walker, and an unbounded CI hang
from a SIGTERM-trapping child. All closed and re-bitten. **12 mutations bite; the verifier
independently re-ran 7.** One equivalent mutant is recorded as such rather than papered over.

**Also worth propagating:** `parseTableSchemas` needs `accessor =` FIRST and a newline before the
closing `}` — the obvious one-line fixture is invisible even from RAW source, which silently
disarms any tooth proving a walker strips (measured). In memory as
`parsetableschemas-fixture-vacuity-traps`.

**Housekeeping:** `mr-gates residuals add` REWROTE `memory/projects/mr-state.json` (whitespace
reformat + the tool's own bookkeeping). I diffed it: **no keys lost, `adr_next_free` still 205**; the
only semantic change is `inflight` carrying this slice's own spawn row. The pre-existing uncommitted
harness strays (`future-prompts.md`, `handoff-archive`, `gdd.md`) are untouched by me. My one new
untracked harness file is `memory/projects/monster-realm-m22-s0-plan.md` (plan + a full adjudication
of the three plan-review lenses) — commit or discard as you prefer.

---

## 2026-08-23T??:??Z — rw3c PR OPEN (#358) — wave-3 wild placement, local `just ci` green

PR https://github.com/mdrewt/monster-realm/pull/358 (`slice/rw3c` -> master), 5 `wip:` commits, remote
CI running. **Supervisor owns the merge** — I did not run `gh pr merge`.

**Local gate:** `just ci` GREEN (`JUST_CI_EXIT=0`) — 1974 tests run / 1974 passed / 0 skipped, 89 evals
pass / 0 fail. **Acceptance ledger: 9/10 met, 1 DEFERred, 0 unmet** (`seed:e3b0c44298fc1c14`). The
ledger was seeded with ZERO criteria (`SPEC-SECTION-NOT-FOUND`), so X1..X7 were authored in the PLAN
phase and are LINT-CLEAN.

**NOTE FOR THE SUPERVISOR'S `mr-gates verify`:** four CHECKs invoke `cargo`. Export
`PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"` before verifying or you get the same
false `EVIDENCE-MISMATCH` rw3b hit. Also: hand-authored gates need an explicit `EVIDENCE: pending` line
per gate — `mr-gates check` only writes evidence into an existing slot, and without it every gate
reports "checked but EVIDENCE pending" and stays 0/N met despite PASSing.

**DEFER: X3 -> backlog (RW3-08).** Second slice to hit this; residual `R-rw3b-X8` already open.
RW3-08 as worded is mechanically unsatisfiable for ANY slice that places a species — `pt_d3_tuning.rs`
pins the wild-legal set by set EQUALITY and an exact count, both derived from the live registry. Both
were extended field-for-field, never weakened. Substance proved by X3b, which PASSES.

**Placement is ZONE 1, not zone 0** — the slice brief's "zone-0 encounter table" is impossible
(RW3-07 + `pt_d3_2_*` freeze zone 0 byte-for-byte). Reasoned in the PR body.

**New invariant, nothing in game-core enforces it:** a placed form's `max_level` must sit strictly
below its lowest outgoing evolution-edge `min_level`, else the wild catch auto-evolves on capture and
the tier-0 form is never obtainable. Scoped to wave-3 because pre-existing content (species 7, band to
16 vs an edge at 15) already violates the general form. Promoting it to a real R13 is a named follow-up.

**Red-team wrote the cheats and ran them.** Its highest-value attack FAILED (a second lower-min_level
edge is caught — both gates recompute the lowest gate live). Three real gaps found and closed, each
re-verified by me running the exact cheat: a partially-shrunk tier-0 set that slipped the empty-set
vacuity guard and turned BOTH gates green with RW3-06 violated; the eval's T-HYGIENE claim being false
for block comments; and the zone-0 freeze being blind to a shadow duplicate `zone_id: 0` part file. An
earlier tester tooth was also caught VACUOUS by a mutation bite-proof and repaired.

**touches-delta:** `game-core/tests/pt_d3_tuning.rs` (the RW3-08 defer) and `ARCHITECTURE.md`.

**ACTION NEEDED FROM THE SUPERVISOR — harness-repo edits left UNCOMMITTED in the working tree**
(I do not commit outside my slice worktree): `specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md`
(rw3c marked DELIVERED + the zone-1/RW3-08/invariant rationale) and the untracked
`memory/projects/monster-realm-rw3c-plan.md`. Please commit or discard.

**Follow-up flags (untouched, outside touches):** `species/070-wave3.ron:20-22` is now stale ("NO
encounter row ... wild placement is slice rw3c"); `evals/content-version.eval.mjs` advertises a
`--update` flag that does not exist and checks no version monotonicity; `server-module/src/lib.rs`'s
CONTENT_VERSION doc changelog is missing v19/v20/v21 (deliberately not fixed — a second changed line
would break gate X3b).


## 2026-08-23T~18:0xZ — rw3a COMPLETE (terminal state: PR #37 open + local harness gate green)

**Slice:** rw3a — spec authorship for `M-postgate-roster-wave-3` (Electric + Light roster wave).
**Repo:** harness (`mdrewt/claude-harness`). **PR:** https://github.com/mdrewt/claude-harness/pull/37
**Branch:** `feat/rw3a-roster-wave-3-spec` (worktree `.claude/worktrees/rw3a`, 3 commits, pushed).
**Gate:** `mr-selfcheck` -> SELFCHECK-OK; harness `just ci` EXIT=0. No remote CI on this repo, so
PR-open + local green is terminal. **Acceptance: 8/8 met, 0 deferred, 0 unmet — rw3a seed:e3b0c44298fc1c14.**

**Delivered:** `specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md` (new) + the PLAN.md bullet link.
Diff is exactly those two files (touches-delta: none, boyscout-delta: none).

**queue[] candidates unlocked by this merge** (normal content-pack pattern, project repo):
- **rw3b** — ATOMIC content drop: `game-core/content/skills/070-wave3.ron`,
  `game-core/content/species/070-wave3.ron` + `071-wave3-derived.ron`,
  `game-core/content/evolution_paths/070-wave3.ron`, sprites via `client/art-src/generate_monsters.py`,
  `server-module/src/lib.rs` (CONTENT_VERSION only), `evals/baselines/content-hash.json` (regen),
  `evals/rw3b-roster-wave-3.eval.mjs`, `game-core/tests/rw3b_roster_wave3.rs`, `docs/adr/0204-*.md`.
  Must be atomic: the ADR-0143 STAB gate is registry-wide, so a species-only slice is RED ON ARRIVAL.
- **rw3c** — after rw3b: encounter placement/tuning in `game-core/content/encounters/000-core.ron`
  (+ CONTENT_VERSION, content-hash, own eval + Rust test). Zone 0 must stay byte-identical.
- **NOT parallel-safe with each other** — both bump `CONTENT_VERSION` and regenerate the content-hash
  baseline. Chain them.
- **ADR-0204 is reserved for rw3b** (project repo). rw3a deliberately did not create it (REPO-MIXED).

**Corrections this slice made to the corpus (worth propagating):**
- `validate_evolution_fusion` **does not exist** in `game-core/src`. The live gate is
  `validate_evolution_paths` rule **R6** (`game-core/src/content.rs:934`, enforced `:1050`), keyed on an
  evolution edge's `to_species`, NOT on `tier`. The stale name is still in
  `game-core/content/encounters/000-core.ron` and in the pt-d3 text of `M-playtest-d-content-pack.spec.md`.
- `M-playtest-d-content-pack.spec.md` still names the deleted `evolutions.ron` — stale since the
  essence-graph redesign (ADR-0174/0176); the live registry is `content/evolution_paths/`.

**⚠️ TOOLCHAIN TRAP (cost real time here; now in memory as `harness-node-toolchain-path-trap`):** the
Bash tool's default PATH resolves `node` to /usr/bin/node **v18.19.1**, but the harness pins **24.13.1**
via asdf. Under node 18, harness `just ci` exits 1 (`scripts/tests/adr-lint.test.mjs:191` uses
`import.meta.dirname`, Node >=20.11) and **looks exactly like a red master**. Verified: same clean tree,
EXIT=1 on node 18, EXIT=0 on node 24. Always
`export PATH="$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH"` first. Also: `mr-selfcheck` must run from
the MAIN checkout — `memory/projects/` is gitignored, so the tools are absent inside worktrees.


## 2026-08-07T~17:0xZ — 12r-c COMPLETE: PR#291 open, local `just ci` green, remote CI running

**Terminal state per doctrine — supervisor owns the merge. `gh pr merge` NOT run.**

Branch `fix/12r-c-dual-write-fn-boundaries` (worktree `.claude/worktrees/12r-c`, from `origin/master`
@ `5a051d9`). PR **#291**, OPEN / MERGEABLE, ci+e2e QUEUED at exit. Local `just ci` green on HEAD
`7a631b9`: 78 evals pass / 0 fail, 1590 Rust tests, 1999 client tests, clippy `-D warnings`,
`cargo fmt --check`, typecheck, security clean.

**Diff = exactly the declared `touches:` set** — `evals/monster-dual-write.eval.mjs` only.
`touches-delta: none`. No ADR (none assigned; repairs a detector, not a decision). No
`ARCHITECTURE.md` / `docs/knowledge/**` / `CHANGELOG.md` edit — verified not stale, so **no
doc-reconciliation is owed for this slice** at the serial merge.

**What landed.** `splitIntoFnBodies` → a column-0-anchored declaration scan (one regex LITERAL,
`matchAll`); `checkFnBodyDualWrite` / `stripLineComments` / `readServerModuleSources` byte-identical
to master. E1 verified RED-under-master → GREEN-under-branch by the verifier independently. E2:
734 → 828 spans (+94 = exactly the col-0 `pub(crate) fn` count), 0 violations before and after.
The new partition is a **strict refinement** of the old (0 old boundaries lost), so the gate is
provably strictly stronger. 10 new teeth (16 total); 6 mutation bite-proofs run by the orchestrator,
each caught by a named tooth; one mutation (dropping `[A-Za-z_]` after `fn `) is an **equivalent
mutant**, documented in-file rather than papered over with a fabricated fixture.

**IMPORTANT — a hardening was implemented then SEVERED mid-slice.** Red-team found a live
no-adversary false GREEN (a `/* FIXME … monster_pub().monster_id().update( … */` comment CURES a
violation, since `.includes()` matching only ever stripped `//`). I shipped a `stripBlockComments`
pass + TEETH P/Q, then a second red-team pass proved it was **worse than the hole**: line-strip-first
destroys the `*/` of any block comment whose prose contains `//` (a URL suffices), and the orphaned
`/*` pairs with the next `*/` anywhere in the concatenated tree, **deleting real
`ctx.db.monster()` writes**. Block-strip-first also mis-eats (the tree's `///` prose has unbalanced
`/*`: 14 vs 17). Both PoCs survive `cargo fmt --check`. Severed; `findDualWriteViolations` is back
byte-identical to master and TEETH P/Q were withdrawn WITH the capability (documented in-file, not
silently dropped — the verifier specifically audited this as a legitimate withdrawal, not a
weakened gate).

**Follow-ups identified (none touched, none blocking) — ranked:**
1. **Per-write counting in `checkFnBodyDualWrite`** (`count(UPDATE_PUB) >= count(UPDATE_MONSTER)`).
   Highest value: the "some compliant pair exists" failure mode this slice targets STILL SURVIVES
   *inside* one function — `write_back_battle_results` (`battle.rs:1039`) writes at `:1124` and
   `:1294`; deleting either mirror alone keeps the gate GREEN. Costs nothing today (17 writes/17
   mirrors). Would touch `checkFnBodyDualWrite`, deliberately frozen in 12r-c.
2. **One string-and-comment-aware prepare pass** (port `prepareRustSource`/`blankStringLiterals`,
   `evolution-reducer-security.eval.mjs:130-221`); reinstate TEETH P/Q. Closes both decoy
   false-greens. Do NOT attempt this as a bolt-on stripper — see the severance above.
3. `evals/inventory-single-stack.eval.mjs:75` — copied splitter, same defect class (3 literal
   markers; still misses `pub(super)`/`pub(in …)`/bare qualifiers/offset-0). Port the fix.
4. Gate is one-directional: a `monster_pub` write with no `monster` write is unchecked.
5. Write markers are single-line literals — a rustfmt-wrapped `.update(`/`.insert(` chain is a
   **silent GREEN**. None exists today; wrapped `.find(`/`.filter(` already do.
6. **FOR THE SUPERVISOR / ADR-0015:** `MonsterPub` correctly omits every raw hidden column, but the
   published derived channels (`stat_*` + the public `species_row`, plus `nutrition_pct` which
   recovers EV total to ±5) let an observer approximate another player's IVs. Genre-standard and
   long pre-dating this slice, but currently an emergent property rather than a decision on record.
   Worth one sentence in ADR-0015. Not a leak of any column.

**Remaining in M-postgate-twelfth-review-residuals:** 12r-d → 12r-e (SERIAL, both touch
`server-module/src/{content,battle}.rs`; 12r-d also touches `schema.rs` and collides with
EG5-6/Migration B there — land 12r-d first per the spec note). 12r-a/b/c/f all merged-or-open.

## 2026-08-10T03:5xZ — 13r-c run finished TERMINAL: PR #309 open, local CI green
Slice 13r-c (string-literal-aware source scanners) reached its terminal state: **PR #309 open, local `just ci` exit 0, remote CI running**. `gh pr merge` NOT run — supervisor owns the merge.

**Shipped:** new `evals/rust-scan.mjs` (SSOT string-aware Rust scanner, 12 exports) + the two ~450-line verbatim copies deleted from `account-privacy` (2024→1579) and `guest-claim-integrity` (3524→3075), taking guest-claim's diverged angle-aware `splitArgs`. Three broken gates fixed (`currency-integrity`, `ranking-security`, `conversation-privacy`/`wallet-privacy`), with `stripComments` → literal-PRESERVING `stripTsComments` for the TypeScript call sites (a Rust-style payload-blanking strip would make `checkNoPrivateWalletSubscription`'s ban pass vacuously — measured on double-quoted SQL). `main.wiring.test.ts` ported file-wide, 0 of 78 call sites edited. 12 files, +1503/-1124. ADR-0181 written; ARCHITECTURE updated; DIGEST regenerated.

**Gates:** `just ci` exit 0 · 83/83 evals · 2164 client tests · Semgrep repo-wide 517 rules/990 files/0 findings · gitleaks clean. Semgrep and gitleaks were run LOCALLY on purpose (both are remote-only in CI): Semgrep's `detect-insecure-websocket` fired on the websocket-scheme token inside COMMENT text — 6 blocking findings, all in prose this slice added — caught and rewritten before pushing, avoiding a red remote round-trip.

**Three defects found by the review lenses and fixed in-slice:** (1) red-team BLOCKER — `walletTableIsPrivate` anchored on a raw `indexOf('name = player_wallet')`, so a `#[doc = "name = player_wallet"]` decoy on any earlier table made a genuinely `public` wallet report PRIVATE (live false-GREEN on ADR-0015); now uses `parseTables` over stripped source. (2) red-team BLOCKER — a regex literal abutting a `*` opened a phantom block comment in both TS scanners, erasing a real banned subscription; closed with a SOUND (not heuristic) regex-literal rule + two new teeth. (3) reviewer MAJOR — `currency-integrity`'s soundness gate covered 2 files while its ban clauses needled ~20; gate widened to the real scan set.

**PARKED → `13r-c-2` (hidden dependency, MEASURED, needs supervisor re-serialization):** the `accounts.rs` `concat!()` removal is NOT in this PR. Patching `accounts.rs:48` to the bare `"https://auth.monster-realm.invalid/"` literal fails **exactly one** eval — `evals/trade-escrow-guards.eval.mjs` (TR-11) — which is OUTSIDE 13r-c's declared `touches:`. It concatenates every `server-module/src/*.rs` into one blob (`accounts.rs` sorts first) and strips comments BEFORE strings, so the bare URL inverts quote polarity crate-wide. Carry to 13r-c-2: `accounts.rs:48` + its `:33-48` hazard comment, an `[A/issuer-literal]` regression tooth, and migrating `trade-escrow-guards` onto `rust-scan.mjs`. **NOTE: 13r-h (`after: 13r-c`, overlapping accounts.rs) is UNBLOCKED — this PR does not touch accounts.rs.** **M21b-2's real-issuer-URL wiring still must not land before 13r-c-2**, since the workaround is still in place and trade-escrow-guards is still blindable.

**Disclosed residuals (in ADR-0181):** ~24 evals still strip `//` with no string pass at all and ~8 more run the string pass after the comment strip (measured across `evals/*.eval.mjs`); migrating them onto `rust-scan.mjs` is the follow-up. `independentAnchorCount` can false-RED on a multi-line Rust string literal (trips `playtest_tests.rs`/`ranking_tests.rs`, dormant because every gate filters `*_tests.rs`). Both TS scanners still don't lex a regex in keyword position (`return /x/`) — deliberate; under-detection is safe.

**Flag (pre-existing, not this slice):** the `Nightly` workflow's `mutation-server` job has been failing on master since run 31302216601 (2026-08-09 07:53). Off the PR path per AGENTS.md; master's own CI is green.

**ADR-0181 note:** `**Amends:**` is deliberately EMPTY — the digest gate requires a reciprocal `**Amended-by:**` in ADR-0179 and ADR-0180, both outside this slice's `touches:`. Whoever owns those files next should add the back-links.

## 2026-08-14T~10:00Z — slice 14r-c COMPLETE (terminal state: PR open + local `just ci` green)

**PR:** https://github.com/mdrewt/monster-realm/pull/319 — branch `feat/14r-c-scanner-migration`,
worktree `.claude/worktrees/14r-c`, forked from master `be8a612`. **Supervisor owns the merge.**

Local full `just ci` **green** at HEAD `ddccc4b`: evals 86/86, cargo nextest 1921/1921 + doctests,
client vitest 2390/2390 (81 files), tsc/clippy/biome/wasm/perf-budget/secret-scan all clean.
Independent `verifier` verdict PASS (teeth empirically bitten + reverted; no test weakened;
debt mechanism proven non-abusable; scope clean). ADR-**0186** authored; `just adr-digest` re-run.

**Landed:** new `evals/scanner-migration-audit.eval.mjs` (ADR-0181 measurement as a permanent
gate, name-derived set, Leg1 anchored import + assertStripperSound, Leg2 load-bearing "no naive
stripper survives incl. private helpers"); 6 privacy evals migrated onto `stripRustSource`;
residual (a) `}` dropped from `startsRegexLiteral` at both sites with teeth. Gate reports
`18 gated / 10 migrated / 7 debt / 1 not-applicable`.

**EARS-2 NOT fully closed** — 7 `*-reducer-security` evals parked as capped self-retiring debt.

### NEXT SLICE — 14r-c-2 (pre-scoped, ready to launch)
1. Migrate the 7 parked evals (`battle`/`evolution`/`npc-dialogue-quest`/`raising`/`recruit`/
   `shop`/`trade`-reducer-security). Deleting each `KNOWN_UNMIGRATED` entry is forced by the
   gate itself (self-retiring). Known traps, measured: `trade-reducer-security:426-429` has 4
   coupled un-compacted call sites that must convert together; `shop-reducer-security:63-70`
   deliberately splits criteria 1-5 (comments-only) from 6-7 and its `stripRustStrings:53-55`
   is length-CHANGING; `battle-reducer-security`'s `stripRustStrings` export is imported by
   `zone-warp-server-runtime:50` (must survive); `recruit-reducer-security`'s 4 exports are
   pinned by `gate-teeth:86-116`. `evolution`+`raising` `prepareRustSource` are the two files
   where the hazard is LIVE and reproducible (canary needle swallowed).
2. ADR-0166 R5 first half: shared `scan_helpers` home in `lib.rs` for the duplicated
   `strip_rust_comments` test helper — **12 copies in-tree, not the 4 R5 claims.**

### BLOCKER for the supervisor to re-serialize (hidden dependency, NOT attempted)
ADR-0166 R5 second half — moving the trade-size cap to its `guards.rs` SSOT home — requires
`server-module/src/trading.rs` + `guards.rs`, **both outside 14r-c's declared `touches:` set.**
Needs its own slice with those paths declared.

### Operational notes
- Sibling slice 14r-e held the global spacetime data-dir lock during this run → `account-e2e`
  red for environmental reasons (documented class). Cleared on its own; final CI green.
- `just ci` was SIGKILLed (137) at the eval stage while the verifier ran concurrent
  `evals/run.mjs` loops. Not a code failure — re-ran clean once contention cleared.

## 14r-g terminal handoff (2026-08-14, orchestrator)
14r-g (ranked-requires-account, ADR-0189) at TERMINAL STATE: **PR #321 open, local full `just ci` GREEN (86/86 evals, 610 server + 2399 client tests), remote CI running — supervisor owns the merge.** Branch feat/14r-g-ranked-requires-account @ fd4e02b (merged origin/master post-14r-f, DIGEST regenerated with 0188+0189, merged-tree full ci green 87/87 evals), worktree .claude/worktrees/14r-g. KEY CALL (flag to Drew): gate is deployment-conditionally INERT (ADR-0189 D6) — ALLOWED_ISSUERS is still the .invalid placeholder so no account can exist anywhere; unconditional enforcement would brick PvP + red 3 merge-gate e2e specs. Auto-activates at the OQ1 issuer flip; ea_ra_06a canary carries the 5-item activation checklist. #313 answered by Drew mid-slice (no migration). PARKED as next slice (hidden deps client/src/main.ts + client/e2e/, recorded in PR): EARS-3 guest affordance + e2e conversion. Supervisor reconcile items in PR "Follow-up flags" (ADR-0179 OQ2 prose, adr README next-free, 3 stale prose line-cites, spec D6 annotation). Plan archive: memory/projects/monster-realm-14r-g-plan.md.

## 13r-d — Append-at-end schema-gate generalization (2026-08-15)

**State: PR OPEN — https://github.com/mdrewt/monster-realm/pull/325** (branch `feat/13r-d-schema-gate-order`, worktree `.claude/worktrees/13r-d`). Local full `just ci` GREEN at HEAD (3 green runs); remote CI running at hand-off. ADR-0193 consumed. **Supervisor owns the merge.**

Closed the hole where a mid-struct column insert + the sanctioned re-baseline passed the additive-schema gate green. Design pivoted during plan review: any rule keyed on the *working-tree* baseline is empty by construction after regeneration (red-team measured a no-default tail append GREEN on 33/38 tables), so the gate now resolves the **previously committed** baseline from git (ADR-0116 D2/D3 precedent, `spacetime-type-snapshot.eval.mjs`) — including D3's self-compare branch and failing CLOSED inside a repo. `checkBaselineAppendOnly` also pins persisted column **types** and the **PK**. A self-expiring per-table `"manual_migration": "ADR-0177 …"` marker is the only escape (a stale marker is itself a violation); without it the gate would deadlock the delete-data runbook.

**Follow-ups parked (all outside 13r-d's touches):** (1) `server-module/src/content_tests.rs:2500` + `m14_5d_1a_tests.rs:264` bare column-name needles are now also satisfiable by the `order` array (typed assertions still bite) and their comments cite stale baseline line numbers; (2) the baseline records `pk/columns/order` only, so `#[unique]`/`scheduled(...)` changes on an existing table stay ungated; (3) ~35 lines of git-resolution policy duplicated with `spacetime-type-snapshot.eval.mjs` — a shared `evals/baseline-git.mjs` needs its own slice; (4) a brand-new private table added by a future slice arrives with no publicness eval allowlist entry (flag for 13r-e).

**NEXT:** 13r-e is now unblocked (`after: 13r-d`) — HEAVY, Drew-directed monster_pub need-to-know privacy, issue #284; it appends schema surface, so it must satisfy this gate (tail-append + `#[default(`). Remaining thirteenth-review tail: 13r-e, 13r-g, 13r-h.

## 13r-g — Docs/ledger freshness (2026-08-15) — **PR OPEN, awaiting supervisor merge**

**PR:** https://github.com/mdrewt/monster-realm/pull/328 · branch `feat/13r-g-docs-ledger-freshness`
· worktree `.claude/worktrees/13r-g` (kept; `client/node_modules` installed there)
· ADR **0196** (amends 0165). **Items: none.**

**Terminal state:** PR open + local `just ci` **exit 0** (three full runs) + remote CI running.
`gh pr merge` NOT run (supervisor-owned). Adr next-free should advance past 0196; **0195 was
deliberately skipped** (supervisor-assigned number kept, and `adr-digest.mjs` requires the 4-digit
`0196-` filename form — nothing in CI requires contiguity).

**Delivered:** (1) CHANGELOG regen through #326 (34 entries, pure append) as the branch's FIRST
commit; (2) ADR-0165's never-implemented nightly changelog-freshness check —
`scripts/changelog-freshness.mjs` + a 72-test tester-authored sibling suite + a 5th `nightly.yml`
job; (3) `m13.5r-plan.md` → `docs/specs/`.

**The design call worth remembering:** the failure rule is a **lag×age conjunction** (fail iff
`missing >= 15` AND oldest missing entry `>= 6` days), not a count threshold. Derived by replaying
the real signal — `git cliff` at each of the last 150 master commits vs that commit's committed
ledger. Drift here is a **weekly sawtooth reaching 20–26 on a HEALTHY wave**, so `>15` would red
21 of 32 nights (66%) and `>25` would miss half the real episodes; the conjunction fires 5/32.
Age is the oldest missing entry's commit date via a verified subject→entry transform (341/341),
clock injected — **never file mtime**, which in a fresh `actions/checkout` is always ~0 days old
and would make the gate permanently, silently green.

**Gates:** `just ci` exit 0 (87 evals, 1934 cargo tests, 2447 client tests / 81 files, clippy
`-D warnings`, wasm, security). `verifier` **PASS** — it re-ran the full CI itself, confirmed the
gating suite was never edited after the tester's final round (byte-identical across the last two
commits), that boundary fixtures derive from the exported constants, and ran semgrep `--config
auto` over both new files (zero findings). **15/15 mutation bite-proofs killed.** Domain auditors
not run — no server-module/game-core/wasm/reducer/schema surface.

**Ops notes for the next run:**
- **`node --test <file>` EXITS 0 WHEN THE FILE DEFINES ZERO TESTS** (node 24.13.1 counts the file
  itself as one passing test). Any nightly/CI step running `node --test` needs a pass-count floor
  from the runner's own TAP tally — a text count of `it(` is satisfied by a block comment.
- GitHub's default Linux `run:` shell is `bash -e` **without pipefail**, so `cmd | tee` discards
  `cmd`'s exit status. Add `shell: bash` when piping.
- A `git clone --no-hardlinks <worktree>` carries only COMMITTED state — verifying an uncommitted
  fix in a clone silently tests the old code (cost one confusing round here).
- `taiki-e/install-action` supports `tool: git-cliff@<version>`; pin the version, since the gate
  compares generated-vs-committed and an unpinned reader flips every entry on an upstream
  rendering change.

**Follow-ups this slice could NOT do (all need `evals/` or `justfile` in touches):** (1) MOVE the
gating into `evals/changelog-freshness-teeth.eval.mjs` so `just ci` catches comparator rot per-PR
and pins the thresholds cross-directory (do not duplicate the fixtures); (2) a `just
changelog-check` recipe, and more importantly a `just changelog` that **pins the git-cliff
version** (the workflow pins the reader at 2.13.1 while `justfile:172` uses whatever the developer
has); (3) add `changelog-freshness` to `nightly-smoke-wiring`'s guarded-job list (today deleting
the job or adding `continue-on-error: true` is invisible to `just ci`); (4) a subprocess smoke
test for `main()` — the suite imports only pure functions, so 18 shell mutations ship suite-green.

**NEXT:** merge #328 after remote CI. Remaining thirteenth-review tail: **13r-h** only
(`after: 13r-c`, already merged — eligible; structural, touches `server-module/src/schema.rs`, so
it must run alone).

## 2026-08-15T~09:00Z — 13r-h PR OPEN (terminal state, awaiting supervisor merge)
Slice 13r-h (Rust test-mirror parity tail, last of M-postgate-thirteenth-review-residuals) built to terminal state: **PR#329 OPEN** (https://github.com/mdrewt/monster-realm/pull/329), branch feat/13r-h-test-mirror-parity @ 0753059, **local full `just ci` GREEN (exit 0)** — the exact remote gate (1949 workspace nextest + 2447 client vitest + 87 evals + security/wasm/typecheck). Do NOT `gh pr merge` early: supervisor owns the squash-merge after remote CI. `Items: none`.

**What shipped (zero production-behavior delta):** (1) accounts_tests.rs G2 mirror → source-derived reducer enumeration at full checkNoClientIdentity parity (wire-safe param allowlist + scheduled-struct-with-guard carve-out + Identity-ctor ban + exact name-set pin) + 9 machinery self-teeth; (2) evolution_tests.rs EG2-9 → derived per-file recursive read_dir scan (7 anchors + basename + body anchors), L1_ALLOWED + vacuity guards preserved; (3) accounts.rs account_state_is_legal pure predicate + 5 debug_asserts (release-compiled-out, exhaustive match) + schema.rs doc note + exact-equality struct-shape tripwire. NO enum fold (non-additive migration, deferred to M22 per ADR-0195 D1).

**Orchestration (HARD tier, all 6 roles):** planner → reviewer+red-team plan review → tester (opus, authored all tests, RED-first) → specialist (general-purpose, red→green production only) → reviewer+reducer-security-auditor impl review → red-team on non-security gates → verifier PASS. Proof-of-teeth T1-T17 all bit with correct attribution. ADR-0195 written (amends 0179, reciprocal back-link), digest + knowledge bundle regenerated.

**touches-delta:** accounts_tests.rs/evolution_tests.rs (sibling tests of declared code files), docs/adr/0195 (new), docs/adr/0179 (backlink only), docs/adr/DIGEST.md (adr-digest regen), docs/knowledge/** 11 files (knowledge regen, line-pin shifts only), ARCHITECTURE.md (1 para). boyscout-delta: none.

**Follow-up residuals (recorded in ADR-0195 consequences — each needs a slice touching evals/** or shared strippers, all OUT of 13r-h scope):** (a) char-literal brace-walk truncation class in EG2-9 + no-idle-accrual.eval.mjs (benign today, 5 pre-existing scheduled reducers anchor-free); (b) SHARED identity-ctor ban gap — both Rust mirror and JS twin miss Identity::from_claims(/from_u256( (latent, needs lockstep Rust+JS extension); (c) stripper-desync self-check is eval-only in the Rust mirror (port assertStripperSound with the shared-Rust-scanner follow-up). Plus still-open ADR-0179 §9: G12 identifier list, write_target_accessors rfind, //-before-strings in 3 evals. Tombstone re-anchor (#307/OQ2) explicitly excluded.

**Two lessons this run (saved to auto-memory):** (1) the recruit-reducer-security.eval.mjs (+ other unmigrated *-reducer-security debt evals) concatenate ALL server-module/src/*.rs INCLUDING *_tests.rs and strip block comments with a naive `/\*...\*/` regex — a stray `/*` substring (e.g. a `src/**` glob) in ANY comment in an alphabetically-early file (accounts*.rs) desyncs `/*`↔`*/` pairing and blanks a LATER file's fn (write_back_battle_results), a false-RED invisible to local module tests and only caught by full `just ci` eval stage. Fixed by dropping the glob from a machinery comment. (2) the doc-keeper subagent resolved a worktree-relative ARCHITECTURE.md edit to the MAIN CHECKOUT path — reverted via Edit tool (NOT git, per the no-mutating-git-on-main rule) and re-applied to the worktree; always verify subagent doc edits landed in the worktree with `git -C <worktree> status`.

**M-postgate-thirteenth-review-residuals is now FULLY CLOSED** once #329 merges (13r-a..h all delivered: PRs 322/324/309+327/325/326/323/328/329).

## 2026-08-17T~03:00Z — 15r-sec-vis: PR #337 OPEN, local `just ci` green (terminal state, awaiting supervisor merge)
Slice 15r-sec-vis (Table visibility as declared data + a class regression gate) is at the sanctioned terminal state: **PR #337 open on mdrewt/monster-realm, full local `just ci` exit 0, remote CI running.** Branch `feat/15r-sec-vis` (6 commits, base a6ae43c), worktree `.claude/worktrees/15r-sec-vis` still present. `gh pr merge` NOT run — supervisor owns the merge.

Shipped: `visibility` on all 38 baseline entries (18 public/20 private, machine-derived), `parseTableVisibility` as a third projection over the existing parse, `checkVisibility` (`[visibility-shape]`+`[visibility-drift]`), `checkVisibilityEscalation` (`[visibility-escalation]`), `computeViolations` as the SSOT aggregation the verdict block calls, `formatBaseline` + `--write` regenerator, and `scripts/okf-export.mjs` delegating its derivation to the eval. **ADR-0199 written** (supervisor had assigned none — the `visibility_note` lifecycle and the D9 `[table-count]` amendment are not recoverable from code; 0198 was highest, adr_next_free was already 199, no concurrent sibling). Verifier PASS with 9/9 implementation mutations producing the predicted RED.

Orchestration: planner -> reviewer+red-team+/simplify on the plan -> tester (RED first, import-guard RED verified by me) -> reviewer on the tests (found a BLOCKER: nothing proved the checkers were WIRED into the gate -> `computeViolations` + T-VIS-WIRED added) -> general-purpose implementer -> reviewer+red-team+tester+reducer-security-auditor in parallel -> verifier. desync-guard deliberately NOT run: zero game-core/client/netcode surface in the diff.

Red-team found and I closed three real holes: a degenerate `"ADR-"` escape (now anchored `^ADR-`+>=4 digits), a pre-armed marker (now banned on private entries AND required absent-or-different in prev), and a **`cfg_attr`-wrapped table invisible to the WHOLE gate** because `[table-count]`'s needle was anchored on `#[` exactly like the block regex, so both sides of its comparison went blind together (ADR-0199 D9 widens the needle; T-VIS-CFGATTR pins it; no-op on today's corpus).

KNOWN, DOCUMENTED, REVIEWER-RELEVANT: the ADR-0199 D7 bootstrap window is ACTIVE on this PR — the prev baseline predates the axis so `[visibility-escalation]` is skipped for all 18 public tables on the landing commit (the gate says so loudly in `detail`). It closes permanently on merge. During the window EARS 3 is enforced only by T-VIS-ANCHORS' full name-set pin, a test-time control — **any edit to those pinned lists in PR #337 is load-bearing.**

FOLLOW-UPS (not this slice, each a candidate micro-slice): (1) ADR-0193 D7's `manual_migration` escape still uses the degenerate `.indexOf('ADR-')` shape red-team broke; (2) the schema eval fails OPEN outside a git work tree (`pass:true` + warning), which also disarms the escalation layer; (3) `T-VIS-REGEN(a)`'s real-corpus byte check sits in the teeth block so an un-regenerated flip reads as `teeth FAILED` rather than `[visibility-drift]` (attribution only, gate still fails); (4) `scripts/okf-export.mjs`'s own attribute-tail regex uses `[^)]*`, truncating at the first `)`, so a table combining `scheduled(...)` with a trailing `public` would be mis-documented in `docs/knowledge/**` (no such table exists today; the gate itself is correct); (5) reducer-security-auditor flagged `trade_offer` (HIGH — `propose_trade` publishes the counterparty's MonsterCards without consent) and `battle_challenge` (MED — `challenger_party_ids` world-readable) as ADR-0194's two still-open residual disclosure channels; both fixable with the `my_battle` two-identity view pattern. ADR-0199 records that a green gate is NOT an approval of those two.

ENVIRONMENT NOTE (cost me a CI cycle): a fresh `git worktree` has no `client/node_modules`, so `just ci` dies at lint with `biome: not found` (exit 127) and `account-e2e` fails with "driver emitted no milestones" — both fixed by `cd client && npm ci`, neither is a code regression. Correct PATH here is `$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin` (node v24.13.1); the nvm path in the standard brief does not exist and silently leaves node at v18. Memory cards updated.

NEXT: supervisor delegates the CI wait to mr-ci-watch and squash-merges #337. 15r-a2 remains queued (mr-disjoint said SERIAL-REQUIRED against this slice on their evals/ touches, so it was not fanned out). Code-intelligence graph refresh deliberately deferred: the main checkout is still on master and this work is unmerged, so re-indexing now would index nothing new.

## 2026-08-17T~08:30Z — 15r-a2: PR #338 OPEN, local `just ci` green (terminal state, awaiting supervisor merge)

Slice **15r-a2** (Scanner-audit cap: advisory, not exact-equality) is at the sanctioned terminal state: **PR #338 open on mdrewt/monster-realm, full local `just ci` EXIT=0, remote CI running.** Branch `feat/15r-a2-scanner-audit-cap-advisory` (6 commits, base 1aa99d0), worktree `.claude/worktrees/15r-a2` still present. `gh pr merge` NOT run — supervisor owns the merge.

**Shipped:** `capAdvisoryNote(entryCount, cap)` (`''` at/above cap, else a NON-BLOCKING advisory), `buildDetailTail({entryCount, cap, ...notes})` which computes the advisory INTERNALLY (no `capNote` parameter — that slot was removed precisely because red-team measured it could be hardcoded to `''` while every unit tooth stayed green), a corrected over-cap message reporting measured numbers instead of asserting a relation as prose, the corrected `:121-123` comment (was "adding an eleventh park"; cap is 7), and teeth T10a/T10b/T10c/T10-WIRED. **The `>` predicate is untouched, per spec.** No ADR (none assigned; rationale already in the spec).

**Diff:** `evals/scanner-migration-audit.eval.mjs` (declared touches) + `ARCHITECTURE.md` (one sentence, companion doc — listed under `touches-delta:` in the PR body). Boyscout: one 3→3-line hunk at `:19-21` (header claimed the gate "is expected to be RED"; measured PASSING).

**Evidence:** 12/12 mutations RED with correct attribution — `>`→`>=` killed **only** by T10b, exactly the load-bearing property the spec claimed for the 7/7 equality fixture. Verifier PASS (re-ran the mutation matrix itself, confirmed T1-T9 byte-identical, confirmed the line-citation contract `KNOWN_UNMIGRATED_CAP = 7` at `:124` / `isGatedName` at `:245`). 87 eval PASS / 0 FAIL; client vitest 2461 passed; check-secrets clean.

**Orchestration:** planner → reviewer+red-team+/simplify on the plan (parallel) → tester (RED proven) → reviewer+red-team on the tests (parallel) → implementer (general-purpose) → reviewer+red-team+reducer-security-auditor (parallel) → verifier. desync-guard deliberately NOT run: zero game-core/client/netcode surface.

**The one course-correction worth knowing:** the first wiring tooth was TEXTUAL (grep this file's own blanked source for a call-site needle). Red-team MEASURED four working bypasses of it — declaration collision on a parameter-name needle, local shadowing, an `if(false)` decoy call site, and a hardcoded `capNote=''`. It was re-architected to a BEHAVIORAL proof against `buildDetailTail`'s real return value plus an object-literal-argument needle (a destructuring parameter list has no `:` value bindings, so a declaration can never match it). Three residual bypasses survive and are DISCLOSED precisely in-file rather than overclaimed — accepted because the advisory is NON-BLOCKING and no enforcement path runs through `buildDetailTail` (reducer-security-auditor verified the cap check, completeness, self-retirement, ratchets, Legs 1+2 and the enforced-canary split are all untouched by them). Saved as an auto-memory card.

**FOLLOW-UPS (each a candidate micro-slice, none blocking):** (1) ADR-0186 D3 still says "The cap equals the entry count (7)" — the same non-sequitur corrected in code here; needs an ADR amendment (left untouched, no reserved number). (2) **Under-cap headroom is silent park budget** (MED, pre-existing): once the four migration slices land at 3/7, up to four NEW parks can be added with no constant edit, and a park suppresses the `MIGRATION: neither migrated nor listed` failure. Suggested close that does not reintroduce the equality trap: a frozen `ALLOWED_PARKS` subset check. (3) no duplicate-entry / entry-shape check in `validateKnownUnmigratedEntries`. (4) `capAdvisoryNote(0, 7)` reads "7 below the cap of 7" without naming the count (cosmetic). (5) `evals/trade-cap-parity.eval.mjs:82` cites `isGatedName` at `:246` (it is `:245`) — out of touches, flagged not touched.

**Code-intelligence graph refresh deliberately deferred** (same reasoning as 15r-sec-vis): the main checkout is on master and this work is unmerged, so re-indexing now would index nothing new.

NEXT: supervisor delegates the CI wait to `mr-ci-watch` and squash-merges #338. **The four migration slices (`13r-c-2`, `15r-sec-mig-a/b/c`) are unblocked only AFTER this merges** — that is the whole point of the slice.

## 2026-08-21T08:xxZ — e78422d incident RESOLVED (interactive session, not an automated tick)

Investigated and repaired the standing `e78422d "c0 base"` divergence flagged since 2026-08-21T02:57Z.
**Root cause confirmed independently** (both from the incident's own handoff note recovered below, and
from the shipped `_st_git_env`/`_st_git_env_ctx` code + `mr-selfcheck`'s `GIT_DIR`/`GIT_WORK_TREE` leak
tests already merged in PR #27): a red-team PoC during the lp-04 session exercised a draft git-fixture
helper whose env-scrub list omitted `GIT_DIR`; `git -C <tmpdir>` does not override an inherited `GIT_DIR`,
so the PoC's "isolated" commit landed on the real harness `main` instead of a scratch repo, sweeping up the
operator's dirty tree (24 files) into one commit — twice (`t <t@t>` 21:29, reset away; `lp04 fixture` 22:26,
left in place). Not malicious, not a latent bug in shipped tooling (already fixed in `e52e51e`) — a one-off
side effect of testing the bug the fix was written for.

**Repair applied** (tested first against a scratch clone of the real `origin`, not the live checkout):
`git tag archive/e78422d-c0-base-incident e78422d` (audit trail) → `git reset --mixed 25111d5` (uncommits
`e78422d`; working tree untouched) → `git stash push -u` → `git merge --ff-only origin/main` (clean FF to
`e52e51e`) → `git stash pop` (one expected conflict in this very file — both sides had prepended a dated
section; resolved by keeping both, in the order they already appeared: lp-04's 2026-08-20 entry above,
the pre-existing 2026-08-16 15r-sec-a entry below). Verified byte-for-byte: every recovered file matches
either `e78422d`'s snapshot or a legitimate later edit on top of it (e.g. `future-prompts.md` picked up
unrelated, later operator edits to an entirely different personal project — confirmed harmless and correctly
preserved, not evidence of anything wrong). `mr-state.json` still valid JSON. `mr-audit`/`mr-selfcheck` still
carry lp-04's shipped hardening (not clobbered). Nothing was committed on the operator's behalf — end state
is `main` == `origin/main` (`e52e51e`) plus the exact same uncommitted `M`/`??` working-tree content that
existed before the accident, i.e. byte-identical restoration of the pre-incident status quo. `main...origin/main`
now reads `0 0`. The safety-net stash (`stash@{0}`, "e78422d-incident-content-recovered") is still present
and fully redundant with the working tree — harmless to leave, since a permission classifier declined the
`git stash drop` cleanup step; safe to drop by hand whenever convenient.

**lp-skills / lp-brief-cost / lp-ollama / lp-06 / lp-git-workflow are unblocked** — their pre-staged
`/tmp/mr_pass_*.vars.json` files are still valid; the next tick can `mr-spawn` normally.

## 16r-g — retire Bond/apply_care/CareError from game-core (2026-08-22) — PR OPEN, awaiting supervisor merge

**Terminal state reached: PR open + local full `just ci` green (exit 0) + remote CI running.**
PR https://github.com/mdrewt/monster-realm/pull/350 · branch `feat/16r-g-retire-bond-apply-care`
· worktree `.claude/worktrees/16r-g` (from origin/master @5f14fe2) · 2 `wip:` commits (deaee51, 21ab147).
`gh pr merge` NOT run — supervisor owns the merge.

Delivered ADR-0177 D3's named follow-up: deleted `Bond(u8)`, `apply_care`, `CareError`,
`CARE_BOND_AMOUNT` from game-core + their re-exports + 8 orphaned tests. Net -242/+33.
Kept `CARE_COOLDOWN_MS`, `is_cooldown_ready`, `focus_train`, `FocusTrainError`,
`FocusTrainResult` (all still consumed by server-module). No new ADR (D3 already held the
decision); ADR-0177's D3 bullet at line 214 gained an appended DELIVERED note — append, not
insert, header block unchanged so no adr-digest regen. ARCHITECTURE.md :440/:742 scrubbed
(current-state), :994 annotated in past tense (history).

**touches-delta** (declared set under-enumerated the re-export sites): `game-core/src/lib.rs`
+ `game-core/src/monster/mod.rs` (compile-required), `game-core/src/monster/rolls.rs` (3 comment
lines this change falsified), `ARCHITECTURE.md`, `docs/adr/0177-*.md`. Boyscout: zero.

**Lenses:** planner -> reviewer+red-team (plan) -> tester (test-deletion audit, PASS) ->
reviewer+red-team+desync-guard+/simplify (impl) -> verifier (PASS). `reducer-security-auditor`
deliberately skipped: zero reducer/table/schema change, server-module untouched.

**SUPERVISOR TODO after merge:** refresh the code graphs on the CANONICAL checkout
(cbm `detect_changes` + `index_repository`, `codegraph sync`). Skipped here on purpose —
the canonical checkout is still at master, so indexing now would be a no-op, and doctrine
forbids indexing worktree paths.

**Follow-up flags raised (each has a home outside this slice's `touches:`):**
1. No CI-time gate enforces "game-core contains no Bond symbols" — lib-crate `pub` items are
   reachable roots, so `dead_code` never fires (ADR-0177 D3 already recorded this). Red-team
   raised CRITICAL at plan time; dispositioned with a verifier residue grep + a 5-item bypass
   checklist, all CONFIRMED-CLEAN. Real fix: extend `evals/raising-reducer-security.eval.mjs`
   g8 residue scan to `game-core/src` in a slice owning `evals/`.
2. `server-module/src/raising.rs:39-41,46-47` comments say the symbols "remain in game-core" —
   now false. Reviewer rated MAJOR. Different crate + it is g8's residue-scan target.
3. `docs/adr/0058-*.md` header + derived `docs/adr/DIGEST.md:36` still advertise `apply_care`
   as a live game-core rule. Digest is derived from the header so `adr-digest` can NEVER red on
   it — an agent reading the digest would believe game-core still owns bond math. ADR-0058 is
   only PARTIALLY superseded (focus_train survives) => wants an Amends/Amended-by note, not a
   strikethrough. This is the `agent-facing-doc-truth-ungated` failure class again.
4. `evals/raising-reducer-security.eval.mjs:491-499` — `checkCareSSOT` still accepts
   `apply_care(` while g8:567 forbids it. Contradictory, harmless (g8 wins), token is dead.
5. `game-core/tests/eg3_evolution_graph.rs:542` cites `raising/rules.rs:106`; deletion shifts
   `CARE_COOLDOWN_MS` to ~81. Prose line drift, no gate reads it.
6. `docs/specs/A0-plan.md:88-91` — superseded fusion-era sketch calling `Bond::new(...)`.

**Process note for the loop (worth remembering):** a `git add -A && git commit` run with cwd at
the HARNESS root swept ~19 files of other agents' uncommitted harness work into one commit on
harness `main`. Undone with `git reset --mixed HEAD~1` (index-only, file contents untouched,
nothing pushed). Slice checkpoints belong on the project slice branch; harness plan memos stay
uncommitted like their 15r/16r siblings.

## 2026-08-22T~18:4xZ — 16r-c COMPLETE (terminal state: PR #351 open + local `just ci` green)

**PR:** https://github.com/mdrewt/monster-realm/pull/351 — branch `feat/16r-c-changelog-freshness-gate`,
worktree `.claude/worktrees/16r-c`, forked from `2290f47`, **merged up to `origin/master` @ `a857214`**.
OPEN / MERGEABLE, ci+e2e QUEUED at exit. **`gh pr merge` NOT run — supervisor owns the merge.**

Local full `just ci` **exit 0**: 87/87 evals, 1942 cargo tests, 2461 client tests, clippy `-D warnings`,
fmt, biome, wasm, perf-budget 7/7, secret-scan clean, observability 8/8. `node evals/run.mjs` ×3
deterministic. `adr-digest --check` clean. Semgrep run LOCALLY on the changed files (remote-only
gate): 0 findings. Independent `verifier` verdict **PASS** — teeth re-bitten, no test weakened,
scope exact, ADR append verified byte-identical for its first 296 lines.

**Diff (4 files):** `evals/nightly-smoke-wiring.eval.mjs`, `justfile`, `docs/adr/0196-*.md`,
`ARCHITECTURE.md`. `touches-delta:` the last two (always-in-scope doc companions).
**`.github/workflows/nightly.yml` was DECLARED but NOT CHANGED** — the job was already correctly
shaped. No new ADR (none assigned; ADR-0196 D8 pre-authorized this as its own follow-ups).
`boyscout-delta: none`. CHANGELOG/ADR-README/DIGEST untouched.

**Delivered:** ADR-0196 follow-ups **#3** and **#2**. `jobIsNotNeutered` gained an additive
`opts.gates` data-descriptor array; `CHANGELOG_FRESHNESS_GATES` pins the job's two gate steps
VERBATIM; seven new real checks (24-30). `justfile` gained `GIT_CLIFF_VERSION := "2.13.1"` +
version-asserting `changelog:`/`changelog-check:` recipes, pinned three ways.

**Review found a REGRESSION THIS SLICE CAUSED — disclosed, not buried.** Round 1 widened
`{kind:'just'}` to read block-scalar bodies, LOOSENING the pre-existing mutation/coverage/
mutation-server gate (a `run: |` step was fail-closed at `2290f47`). The multi-command class is
closed (tooth V29); a **single-line** `run: |` body starting with `just ` is STILL accepted where
the fork point fail-closed. Named in ADR-0196 with the real fix: promote those three gates to
`{kind:'script'}` verbatim pins. **Recommend that as an early follow-up slice.**

**Two genuinely pre-existing BLOCKERs closed in passing** (both affect all guarded jobs):
job-level `defaults: run: shell:` no-ops every run step with the pin intact; `strictJobBlock`
scanned from line 0, so a decoy job block in a top-level `run-name:` block scalar beat the real
`if: false` definition. Also closed: gate-step `working-directory:`, folded `run: >` scalars, and
`justRecipeBody` first-wins (that one was round-1 self-inflicted, corrected in the ADR).

**Deferred, DATED 2026-08-22 in ADR-0196 (never silently dropped):** follow-ups **#1**
(dedicated `changelog-freshness-teeth.eval.mjs`) and **#4** (shell `main()` subprocess coverage) —
both need `scripts/**`, outside `touches:`. Next carrier: a slice declaring `scripts/` + `evals/`.

**Named residuals still open (measured live, all pre-existing, all guarded jobs):** a `uses:` step
running arbitrary shell before the gates; `env: NODE_OPTIONS: --require …` (the env scan is a
PATH-only DENYLIST); zero-instance `strategy: matrix:`; a skip-inducing job `needs:`;
`runs-on:`/`container:` relocation. **Closing them needs a step-key/`uses:`/`env:` ALLOWLIST across
all guarded jobs — its own slice, because a strict env allowlist false-REDs FROZEN tooth U2c**,
which pins that ordinary non-PATH env keys are ACCEPTED. Re-authoring U2c is a deliberate decision.

**16r-h is now UNBLOCKED** (`after: 16r-c`), but note it shares
`evals/nightly-smoke-wiring.eval.mjs` — serialize it after this merges.

### Operational findings worth acting on (harness-level, not this repo)
- **The `tester` subagent cannot write to its own slice.** `.claude/hooks/guard-tester-write.mjs`
  blocks every `tester` Write/Edit under `.claude/`, and slice worktrees live at
  `.claude/worktrees/<slice>`. The tester staged its 1472 lines in `/tmp` and the ORCHESTRATOR
  applied them. `guard-tester-bash.mjs` likewise blocked the tester-lens from executing anything,
  so it delivered a static trace instead of the requested repeat-runs. **Fix options for the
  supervisor:** move slice worktrees outside `.claude/`, or exempt `.claude/worktrees/<slice>/`
  from the write guard (it is a checkout, not the harness's control plane).
- A fresh worktree has **no `client/node_modules`** — `just ci` dies at exit 127 on biome until
  `cd client && npm ci --include=dev` (~1 min).
- The fork point `2290f47` was **locally red** on `just security` (a literal PEM banner in
  `.claude/hooks/guard-tester-bash.mjs`, added by that very commit); sibling 16r-a fixed it in
  `5f14fe2`. Merging up cleared it. Remote CI never caught it — worth understanding why.

## 2026-08-22T~22:5xZ — 16r-f COMPLETE (terminal state: PR #353 open + local `just ci` green)

**PR:** https://github.com/mdrewt/monster-realm/pull/353 — branch `feat/16r-f-battle-reseed-sticky-latch`,
worktree `.claude/worktrees/16r-f`, forked from master `d4fa9fe`. OPEN / MERGEABLE, ci+e2e IN_PROGRESS at
exit. **`gh pr merge` NOT run — supervisor owns the merge.**

Local full `just ci` **exit 0** (single run, all recipes through observability-validate 8/8): 2472 client
tests (82 files), Rust suites, evals, perf-budget 7/7, secret-scan clean. Semgrep run LOCALLY on both
changed files (remote-only gate): 1074 rules, 0 findings. Independent `verifier` verdict **PASS** (RED
proof + T10 bite reproduced from scratch; test-file history purely additive except 2 disclosed docblock
header lines; scope exact).

**Diff (4 wip commits → squash):** `client/src/main.ts` (+20/−6: sticky latch, `reseedPrevBattleId`
guarded capture as onReconnect's first statement, id-gated silent re-baseline) · NEW
`client/src/main.battle-reseed.test.ts` (523 lines, 11 runtime tests — the repo's FIRST runtime-import
gate over main.ts) · `docs/adr/0130-client-observability.md` (+41, APPEND-ONLY amendment; DIGEST
unchanged). `main.wiring.test.ts` declared but untouched (185 teeth green unmodified).

**Spec deviation, reviewed + recorded:** the spec's minimal "don't clear on undefined" shape swallows the
next NEW battleStart for zero-battle-row players (server GCs battles). Plan review adopted the drop-time
id-capture refinement; EARS unchanged. Rationale + residuals (c)/(d)/(e) in the ADR-0130 amendment.

**Test-first, audited:** tester (opus) authored T1-T9 → orchestrator ran RED proof at fork (exactly T1+T8
red) → impl → lenses (reviewer APPROVED, red-team 6-mutation table + Semgrep, desync-guard PASS, /simplify
clean) → both red-team and desync-guard independently found the multi-episode gap → tester authored T10
(kills capture-once-ever AND never-clear cheats, both bite-proofs MEASURED by the orchestrator) → verifier
PASS. One provably-inert mutation (`reseedPrevBattleId = null` deletion) documented, not papered over.

**Follow-up flags (supervisor; none blocking):**
1. justfile: `client-test` should depend on `wasm` + justfile:271 "no wasm import" comment now stale — the
   new test resolves `client-wasm/pkg` (safe under `just ci` ordering; bare `npm test` on unbuilt tree reds
   with a clear resolve error).
2. ADR-0198 D7 "assumed" subscription-batch atomicity — falsified-and-moot for the battle listener; needs
   an Amends note from a slice owning that file.
3. Pre-existing, red-team-MEASURED: `latestPlayerBattle()` single-highest-id design makes the lower of two
   simultaneous Ongoing battles invisible to the event ring for its whole lifecycle (store.ts design).
4. Pre-existing: main.ts `identity` never refreshed on reconnect — an identity-minting reconnect silences
   every identity-scoped listener with the latch armed (ADR-0130 residual (e)); worth its own slice.
5. /tmp cleanup: `/tmp/16rf-verify-*` + `/tmp/mr16rf-bite2` copies left (rm hook-blocked, harmless);
   a leftover 16r-d spacetime instance still runs on 127.0.0.1:3099 (`--data-dir /tmp/mr16rd-stdb-a`).

Budget: well under the $150 target (planner + 2 plan lenses + tester(opus)×2 + 3 impl lenses + verifier +
doc-keeper; no thrash — RED proof and all suites first-try).

## 2026-08-22T~19:5xZ — 16r-e COMPLETE (terminal state: PR #354 open + local `just ci` green)

**PR:** https://github.com/mdrewt/monster-realm/pull/354 — branch `feat/16r-e-scheduled-function-delay`,
worktree `.claude/worktrees/16r-e`, forked from `b5ff14f`, **merged up to `origin/master` @ `d4fa9fe`**.
OPEN / MERGEABLE; ci QUEUED, e2e IN_PROGRESS at exit. **`gh pr merge` NOT run — supervisor owns the merge.**

Local full `just ci` **exit 0** (twice): 1942 cargo tests, 2461 client tests, 87 evals, clippy
`-D warnings`, fmt, biome, wasm, observability-validate 8/8 (dockerized `promtool check rules`).
**Semgrep run LOCALLY** (remote-only gate) over the changed files: 0 findings. Independent
`verifier` verdict **PASS** (re-ran the gate + 10 mutations itself).

**Diff (5 files):** `evals/observability-stack-config.eval.mjs` (+~2000, teeth-heavy per convention),
`ops/observability/{rules/recording.rules.yml,grafana/dashboards/monster-realm.json,
grafana/provisioning/alerting/rules.yml,prometheus.yml}`. `touches-delta:` the eval only (the slice
spec names it as this slice's test surface). `prometheus.yml` is COMMENT-ONLY — the metric rides the
existing S1 scrape job. `boyscout-delta: none`. No ADR (none assigned; see below).

**Delivered:** `mr-scheduler` recording group (starts / on_time / late-ratio), dashboard panel id 14,
and `ScheduledFunctionDelayed` warning alert in a NEW `scheduler-health` group, scoped to
`movement_tick|trade_offer_reaper|pvp_deadline_reaper|battle_challenge_reaper`.

**THE DESIGN DEPARTS FROM THE SLICE TEXT, DELIBERATELY AND ON MEASUREMENT.** The spec/runbook name a
30 ms threshold; a live 2.8.1 `/v1/metrics` scrape shows (a) the label is **`function`**, not the
`reducer` every other rule uses — a spec-literal impl would record an EMPTY series forever; (b) the
bucket lattice has **no 0.03 edge**; and (c) **p95 is structurally blind to this distribution** —
p95 sits inside (0.001,0.005] reading "~5 ms healthy" while 158/15186 starts (1.04%) exceeded 50 ms
and **48 exceeded 60 SECONDS**. The planner recommended p95@0.05; the red-team refuted it; the
measurement settled it. Shipped signal is an exact **over-edge ratio at the real 0.05 edge**. Full
rationale is in the two config files' own comment blocks. Details in
`memory/projects/monster-realm-16r-e-plan.md` and the memory card
`spacetime-scheduled-delay-metric-shape`.

**26 mutations executed against the real files; all bite.** The FIRST pass found **4 that SURVIVED**
— all closed and re-proven: `clamp_max(…,0)` (alert can never fire), `… * 0` (always fires),
`expression: ZZ` (threshold on a nonexistent refId — rule dead, gate green), and a decoy group
re-recording a series name as `vector(0)` (passed the eval AND real `promtool`). Closed with a
structural **whitelist** (each expr must equal a template rebuilt from its own parts) rather than a
denylist of neutering tokens, per the unclosable-blacklist finding. Legitimate changes still pass
(threshold retune, `for:` retune); a coordinated retune to an OFF-lattice edge still reds.

**No new ADR — none was assigned, and I did not pick one.** The natural home (ADR-0197) was being
edited concurrently by sibling 16r-d, so touching it would have collided. **Follow-up: allocate a
number and lift the rationale out of the config comments.**

**Follow-up flags (in the PR body, not new slices):** (1) no rule in `recording.rules.yml` filters on
`db` — a second published DB (`account-e2e`'s `mr-acct-e2e`) would blend in; pre-existing, shared with
`mr:movement_tick_latency_p95`/`mr:reducer_wait_p95`. (2) `relativeTimeRange` is read by NO gate, for
any alert in the file. (3) the un-numbered ADR. (4) `mr:movement_tick_latency_p95` carries the same
interpolation caveat this slice avoided. (5) pre-existing biome warning at
`client/src/ui/leaderboardModel.test.ts:32`.

### Operational findings
- **The bite-proof loop's `git checkout --` destroyed my own uncommitted gate work** when the revert
  set included `evals/`. Commit gates BEFORE the mutation loop; revert only the mutated paths.
  Recorded as memory `bite-proof-revert-destroys-gate-work`.
- **The `tester` subagent again could not write into `.claude/worktrees/<slice>`** (guard blocks all
  of `.claude/`) — it staged to `/tmp` and the orchestrator applied. Unchanged since 16r-c; the fix
  (exempt slice worktrees from the write guard) is still not done.
- The tester delivered its round-3 fix only for 1 of 4 assigned gaps on the first attempt; the
  orchestrator closed the other 3 by hand, then adopted the tester's fuller version once it landed
  (it added in-suite teeth the hand-written clauses lacked). Both were re-proven by execution.
- `/tmp/mr_warn_16r-e` appeared mid-run; landing pattern was honoured (no new fan-outs after it).

## 2026-08-23T17:2xZ — rw3b PR OPEN (#357): roster wave 3, Electric + Light — local `just ci` green, remote CI running
**Terminal state, supervisor owns the merge.** PR https://github.com/mdrewt/monster-realm/pull/357, branch `slice/rw3b`, worktree `.claude/worktrees/rw3b`. Acceptance ledger: **12/13 met, 1 deferred, 0 unmet** (`memory/projects/gates/rw3b.gates.md`).

**What landed.** The last content gap in the `Affinity` enum is closed: Electric and Light had zero species AND zero skills (the ADR-0145 residual pt-d3 accepted by doubling Dark). 16 → 20 forms. Species 40 Voltkit / 41 Voltarion (Electric glass cannon) and 42 Aurelet / 43 Aurelith (Light wall) in `species/070-wave3.ron` + `071-wave3-derived.ron`; skills 40..=43 in `skills/070-wave3.ron` (the skills registry's first-ever part file); edges 100/101 in `evolution_paths/070-wave3.ron`, exactly one per base form so ADR-0176 D2's auto-evolution race is vacuous. `CONTENT_VERSION` 19→20 + regenerated content hash. Sprites inert. ADR-0204.

**TWO PRE-EXISTING EXACT PINS GO RED THE MOMENT WAVE-3 CONTENT LANDS — rw3c hits both again.** `game-core/tests/eg3_evolution_graph.rs` pinned `paths.len() == 10` and `edge_ids == (1..=10)`; `game-core/src/content.rs`'s `EG1_TIER_ONE_IDS` pins the derived-species set exactly. Both EXTENDED here (field-for-field, never weakened). This makes **RW3-08 mechanically unsatisfiable as written** — DEFERred to `backlog` with the exact reword. rw3c faces the identical wall PLUS `game-core/tests/pt_d3_tuning.rs`'s `levels_by_species.len() == 7`, which goes to 9 the instant species 40/42 are placed in an encounter table. **Budget for it; it is not a surprise.**

**Adding a content id forces FOUR files outside any content slice's declared `touches:`** — `evals/baselines/{species,skill}-ids.json`, `evals/baselines/evolution-path-edge-ids.json`, and `evals/append-only-ids.eval.mjs`, where the exact-pin ratchet lives in TWO places that must be bumped together (`BASELINE_ID_FLOORS` and the tooth-owned `baselineFloor` table). Plus `docs/adr/DIGEST.md` for any new ADR and 12 committed `client/art-src/preview/*.png` for any new sprite row. **Widen rw3c's declared touches to include these up front** rather than making it re-derive the hidden-dependency question. All are listed under `touches-delta:` in the PR body.

**The red-team pass paid for itself — four real bypasses in the first draft of the new gates**, all closed with regression teeth: (1) CRITICAL, the zone-0 freeze read the FIRST `weight:` match per entry, so a `/* weight: 10 */` block-comment decoy hid a live retune of the exact numbers `client/e2e/recruit.spec.ts` derives its flake budgets from — RW3-07 has no Rust counterpart, so it was a standalone hole; (2) HIGH, the RW3-05 racing predicate accepted a present-but-TOOTHLESS gate (`essence amount: 0`, `Some(Hostile)` — the four encodings rule R4 itself names as non-binding) and its `min_by_key` tie-break inspected only the first edge at the lowest level, so the same 3-edge fixture passed in one slice order and failed in the other; (3) the orphan-derived check filtered on the PARSED `tier`, so a `tier` decoy switched the check off for the row it hid; (4) the comment-needle list covered 3 field names while the parsers read 10. **The general lesson: a hand-rolled RON scanner that strips only whole-line `//` comments is unsound the moment any reader takes "first regex match wins" — block comments are legal RON.** `pt_d3_tuning.rs` and `pt-d2-roster-wave-2.eval.mjs` share the same narrow needle list and the same convention; neither was in scope here, but both are exposed.

**A reviewer pass caught three FALSE claims in freshly-authored content comments** (a superlative off by one, a band misattributed to wave 1, a self-invented "derived band" presented as if gated). ADR-0204 D4 records the rule this earns: **a numeric superlative written into a content comment is a constraint on later waves** — Voltarion is held to sp_attack 102 and speed 98 solely to keep Cindershade's "highest sp_attack" and Venumbra's "fastest form" comments true. Nothing gates those claims.

**Sprite regeneration is byte-deterministic here** — `python3 generate_monsters.py` regenerates all rows and left `git status` clean, so appending rows costs exactly the new files. Two new feature flags (`bolt`, `halo`) were added to `draw_avian`/`draw_orb` rather than shipping size-only variants of existing rows, which would have passed the unique-(plan,size,features) check while still reading as a palette swap.

**Ledger authoring notes** (cost four rejected drafts): `mr-gates` needs an `EVIDENCE: pending` line already present under each gate or it flips the box and records nothing (`status` then reads "checked but EVIDENCE pending" and `check` reports `0/N met`). The `||`-anywhere lint rejects JS logical-or inside a CHECK — use `[a, b].some(Boolean)`. A DEFER target must be an EXISTING spec section; `rw3c` is a candidate-slices table row, not a section, so it is rejected — use `backlog`.

## m24-ceremony — PR #40 OPEN (terminal state), 2026-08-23

**Slice:** `m24-ceremony` (harness repo, docs-only). Branch `m24-ceremony`, worktree
`.claude/worktrees/m24-ceremony`. **PR:** https://github.com/mdrewt/claude-harness/pull/40 — supervisor
owns the merge (no remote CI on this repo).

**State:** TERMINAL. Acceptance ledger **13/13 met, 0 deferred** (`memory/projects/gates/m24-ceremony.gates.md`,
seed `e3b0c44298fc1c14`). Slice gate green: `mr-selfcheck` → SELFCHECK-OK, `mr-gates lint` → LINT-CLEAN.
Supplementary harness `just ci` green (103/103) **when run with the asdf-pinned node v24** — the Bash
tool's default node v18 fails the `import.meta.dirname` wiring test (known trap).

**Delivered:** `specs/monster-realm-v2/M24-internationalization.spec.md` converged (9 slices S0–S8,
33 EARS `I18N-*`, 4 new evals, full (a)–(e) oracle tiering) + the `PLAN.md` M24 bullet flipped
AUTHORIZED → COMPLETE. Diff is exactly those two paths.

**For the supervisor, before merging:**
- Re-execute the CHECKs **from the worktree**, not the main checkout (`mr-gates check` resolves cwd via
  `os.getcwd()`).
- One EXPECT was edited mid-slice: X6's, `[2-9][0-9]*` → `(?:[2-9]|[1-9][0-9]+)`. The old regex could not
  match a legitimate two-digit count (13). The verifier adjudicated it independently as a correction, not
  a loosening — thresholds are unchanged (ADR-0006 ≥2, ADR-0057 ≥3).
- The ledger is **not** committed on this branch (it lives in the main checkout by design).

**Open items this slice deliberately leaves for the operator (spec §8, all routed via `mr-ask-drew`):**
5 escalations, **two hard BLOCKERs** — §8-1 `[BLOCKS S0]` verify the three `<li>` markup sites have no
structural dependency; §8-4 `[BLOCKS S1]` **ADR-0033 needs a 6-part amendment, drafted in §8-4 but NOT
yet written into `specs/monster-realm-v2/adr/0033-i18n-strategy.md`** — that write is real follow-up work,
not bookkeeping. Plus §8-2 (is there a market requirement behind content localization?), §8-3 (bless the
untranslated server `Err()` strings, tracked as `M-error-codes`), §8-5 (is the ICU round-trip shim earned
with no named vendor?).

**Ceremony calibration datum** (Drew's open 6-vs-4 question): the adversarial lens produced the central
decision AND two BLOCKER-grade falsifications of the synthesis; the practitioner lens produced the
milestone's shape. The two most-cuttable were the minimal-mechanism and content-pipeline lenses. Details
in the memory card `monster-realm-m24-ceremony`.

**Remaining M22–M25 ceremony authorization:** M25 (security audit) is still AUTHORIZED, not run.

## 2026-08-24T~10:5xZ — m23-s2 COMPLETE (terminal: PR #363 open + local `just ci` green + remote CI running)

**Slice:** m23-s2 — M23 accessibility **S2**: static-shell ARIA literals for the eleven
`client/index.html` shells, the single `#a11y-live` region, and the repo's FIRST stylesheet
(`client/src/styles.css`). Branch `slice/m23-s2` (worktree `.claude/worktrees/m23-s2`), 4 commits,
all pushed. **PR #363.** Local full `just ci` exit 0. Acceptance ledger **7/7 met, 0 deferred**
(`m23-s2 seed:e3b0c44298fc1c14`). Scope clean: exactly the 4 permitted files (the 3 declared +
`ARCHITECTURE.md`, declared under `touches-delta:`). **No ADR authored** — assigned number was `None`
and ADR-0205 already carries this design; `adr_next_free` unchanged at 206.

**Lenses:** planner, reviewer (plan), tester (gating suite), reviewer (impl + simplify), red-team,
verifier. Verifier verdict PASS: append-only on `indexShell.test.ts` proven mechanically
(`removed_or_changed=0`), ledger 7/7 independently re-executed with zero evidence mismatch,
coverage 98.16% vs the 96% threshold. Domain auditors deliberately NOT run (zero reducers, zero
schema, zero predictor/renderer surface) — stated in the PR body.

**The red-team round is the story of this slice.** It wrote and RAN the cheats with Chromium
measurements and found **9 bypasses** that kept every gate green while violating the property —
including a biome-clean, `#`-free stylesheet (`[id="help-overlay"]{visibility:hidden}`) that hides
the help overlay, blanks `#help-hint` and removes the live region from the AX tree; `!important`
inverting BOTH A11Y-11 value checks at once (false green AND false red from one line); inert clip
values leaving 1651 px² of announcement text painted on screen; and a duplicate `id="a11y-live"`
that splits A1's and A2's oracles so `getElementById` returns a decoy and **every announcement in
the game goes to a node with no `aria-live`**. All nine closed, each with a fixture and a
bite-proof. Final bite-proof tally: **28 red, 3 must-stay-green controls.**

**Registered residuals (in the drain, not prose):** `R-m23-s2-X5` — **the milestone's most likely
silent a11y failure**: §2.4 puts the live region outside `#app` while A11Y-13 puts
`aria-modal="true"` on every shell, so the one node S1 announces through sits in the subtree AT is
told to ignore (VoiceOver/Safari frequently silent). S1/S3 must decide: a second region inside the
dialog root, or `inert` on siblings. `R-m23-s2-X3` — A11Y-12 as gated is a SHAPE oracle; the
airtight cascade oracle needs Playwright and belongs with S10's eval. `R-m23-s2-X6` — the CSS
scanner will exist twice once S10 lands its eval, with no agreement gate. `R-m23-s2-X4` — spec
§2.5's reduced-motion HP-bar guard is owned by NO slice (S7 lacks `styles.css`, the transition is
inline `cssText`, the element has no class); fix is S4/S8 adds a class, S9 adds the rule.

**Also flagged, not actioned (outside `touches:`):** ADR-0205:276 says "the ten static-shell
anchors" — it is eight `-1` plus `#menu-rows` at `0` (rename/tradePropose are native, and a `-1`
there would remove a native control from the tab order); ADR-0205:64 assigns
`evals/a11y-static-shell.eval.mjs` to S2 while spec §4 gives it to S10;
`main.wiring.test.ts` still carries the now-false "no CSS file anywhere in this repo" premise (S5
also edits `index.html` and is the natural place); spec A11Y-18's prose does not describe what
`dom-shell-coverage-exclusion.eval.mjs` actually does.

**Note for whoever runs S6:** `client/index.html` carries a `biome-ignore
lint/a11y/noNoninteractiveTabindex` on `#menu-rows` with its reason inline. The rule is genuinely
live (measured: 3 errors without it, 0 with). S6's `role="listbox"` retires it — nothing forces that
mechanically.

**Unblocked next:** S3 and S4 (both `after: S1, S2`) once m23-s1 lands.

## 2026-08-25T~03:2xZ — m23-s10 COMPLETE (terminal: PR open + local `just ci` green + remote CI running)

**Slice:** m23-s10 — M23 accessibility **S10**: the eval tier + the cross-view wiring spec.
**PR:** https://github.com/mdrewt/monster-realm/pull/370 — OPEN. **Supervisor owns the merge — I did
NOT run `gh pr merge`.** Branch `slice/m23-s10` (worktree `.claude/worktrees/m23-s10`), 5 commits,
all pushed. Main checkout left on `master`, never mutated. Forked from `origin/master` @ `2dbfe0c`
(master CI verified green at that SHA); no rebase needed, no sibling in flight.

**Gate:** full local `just ci` **EXIT=0** — 93 evals PASS / 0 FAIL (was 90), **2818** client tests
(was 2734), 0 failed/pending/todo. **Acceptance: 15/15 met**, `seed:e3b0c44298fc1c14`, `mr-gates
lint` LINT-CLEAN, **6 DEFERs → backlog** (X16-X21). Seeded ZERO criteria (**SPEC-SECTION-NOT-FOUND,
7th occurrence**; M23's EARS live in spec §6). X1-X15 authored in the PLAN phase.

**⚠️ THE SLICE WAS RESHAPED BY MEASUREMENT — read the PR's deviation section before auditing.**
Two independent lenses measured that EVERY check spec §5.1/§5.2/§5.6 names already ships as an
equal-or-stronger unit-tier oracle, and `justfile:491` runs `eval` + `client-test` in the SAME
`just ci` — so re-implementing them adds zero CI surface, and every naive re-implementation measured
WEAKER (3 of 5 plausible OverlayId-union parsers are wrong on the real file; §5.1's own `[A11Y-02]`
regex rejects 16/16 shipped keys). The evals therefore ship the measured-NEW teeth for real and
DELEGATE the rest through a pin that is itself gated (title + code needles, a `.skip`/`.todo`
suspension scan, a non-inert proof routing a mutated delegate through the shipped predicate, and
`test.include`+`test.exclude` reachability).

**🔴 CORRECTION R-m23-s2-X6 WAS DISCHARGED, BUT NOT BY THE PROPOSED MECHANISM.** The brief asked for
a shared fixture corpus proving the `.mjs` and TS CSS oracles agree. Red-team MEASURED that a corpus
is not a drift gate: a deliberately weak `.mjs` twin agreed on **18/18** of `indexShell.test.ts`'s own
corpus while shipping four real regressions green (grouped/compound/descendant/CSS-nested `.sr-only`
selectors). Source-hash pinning dies to a biome reformat; normalised-text comparison dies to a
one-character string-literal edit. The pin makes the second implementation NOT EXIST instead.
Residual **R-m23-s10-CSSDRIFT** declared; real fix is X18 (needs `indexShell.test.ts`, S2's file).

**FIFTH ACCUMULATED CORRECTION, not in the launch brief** — ADR-0205 `:284-287` instructs S10 BY
NAME: `[A11Y-02]`'s regex must permit uppercase and `[A11Y-04]`'s orphan check must stay
prefix-scoped, or it reds on sixteen valid keys and on S1's `a11y.world.region`.

**⚠️ OPERATOR SIGN-OFF OUTSTANDING (carried into PR#370's body).** ADR-0205 `:56-58` flags its D1
amendment — "natively focusable" → "focusable, natively or via `tabindex`" — for sign-off in the
consuming slice's PR. This is that PR. Measured: only **3 of 16** anchors satisfy §5.5's
`{BUTTON,INPUT,SELECT,A,TEXTAREA}` allow-list; the other 13 are the ARIA APG `tabindex="-1"` fallback
the milestone deliberately ships. If rejected, S2/S4 absorb it; the registry strings do not change.

**24 MUTATION BITE-PROOFS, ALL BIT** (15 eval + 5 spec + 4 re-runs). **Two survivors were found and
closed**: (a) `const b = document.body; b.replaceChildren()` — the ALIASED root receiver, invisible
to a direct-receiver scan and never naming the node, so module ownership was blind too; my own T17
fixture had mixed it with the direct form and passed on the direct half (fixture monoculture in a
tooth I wrote). (b) a planted-string forgery of a delegation pin. **Lesson: a fixture that mixes two
shapes passes on the easy one.**

**Flake:** the wiring spec is clean over 6 isolated repeats + 3 `--sequence.shuffle` runs. A
shuffle-order FALSE RED was found (the `checked === 16` coverage floor was a trailing `it`) and fixed
by moving it to `afterAll`, which also makes it bite under `-t` filtering.

**Process notes.** `/tmp/mr_warn_m23-s10` (LANDING PATTERN) appeared after the final `just ci`, so no
further fan-out was dispatched. The **`tester` lens WAS invoked** but `guard-tester-bash.mjs` rejects
every path containing a dotfile component, so it could execute NOTHING inside `.claude/worktrees/` —
it returned static analysis plus 23 hand-written cheats staged at `/tmp/m23-s10-redteam/cheats.sh`
and a flake harness at `/tmp/m23-s10-redteam/flake.sh`; **the orchestrator executed the measurement
half itself** (the bite-proofs and the flake matrix above). *That guard makes the tester agent unable
to do its job in any slice worktree — worth fixing at the harness level.* `reducer-security-auditor`
and `desync-guard` had no surface (zero reducers, schema, `game-core`, predictor or renderer code —
`renderResolver.ts` was read, never written). No ADR was authored: no number was assigned.

**Supervisor follow-ups (NOT actioned — outside `touches:`):**
1. **Allocate an ADR number.** The delegation-pin pattern is new, reusable, and the reviewer called
   its ADR non-optional. Rationale currently lives in two eval headers + `ARCHITECTURE.md` + the plan
   memo.
2. ADR-0205 D1 sign-off (above).
3. `mr-gates` seeder: 7th `SPEC-SECTION-NOT-FOUND` on M23.
4. X19's cleanup must retire `renameView.test.ts:1276`'s m23-s4 ledger CHECK in the SAME change, or
   deleting `S3-NO-VIEW-LOCAL-FOCUS` reds a prior slice's ledger.

**touches-delta:** `ARCHITECTURE.md` only (one targeted paragraph). Nothing else outside the declared
set. The `.claude/worktrees/m23-s10` worktree stays for the merge pipeline.

## 2026-08-25T09:05:17Z — m23-s11 merged — PR#371, M23 accessibility milestone content complete
Merged PR#371 (squash) → master@00de705. mr-gates verify: 8/10 met, 2 MANUAL deferred (X8/X9: NVDA+Chrome and aria-modal-inertness protocols authored in docs/a11y-manual-protocol.md, execution pending a human tester — never CI-green by spec's own binding rule). mr-audit: orchestration CLEAN (6 agent calls/6 roles/2 models), gating_advisory CLEAN, mandatory_read=False. Independent re-verify of all 8 checked gates (X1-X7,X13) agreed with recorded evidence after correcting a local PATH gap (missing ~/.cargo/bin caused three false EVIDENCE-MISMATCH readings on the first pass — cargo/vitest calls returned code=127; re-run with cargo on PATH reproduced the recorded evidence exactly).

Three residual DEFER rows beyond the 10-gate ledger: X10/X11 -> backlog, intended owner m23-s12 (axe-core+Playwright e2e tier and a reduced-motion browser oracle — both outside m23-s11's touches:, a genuine spec gap in M23's S4 table, no slice currently owns them). X12 -> wontfix, target operator: the WCAG-2.2-AA conformance Definition-of-Done ruling (self-attest vs third-party audit vs screen-reader playtest) is spec-scoped as blocking M23's MILESTONE EXIT only, not this slice's build/merge — needs mr-ask-drew before the milestone can be declared closed.

Worktree/branch cleanup done (local+remote slice/m23-s11 deleted). Master CI green post-merge (verified live, not from the situation bundle). This closes out M23's queued slices — next tick should check whether any M23 residual promotion or the X12 operator-DoD gate needs raising before moving to new PLAN §9 work.
## 2026-08-25T09:05Z — m23-s11 PR#371 OPEN — local gate green, remote CI running (supervisor owns the merge)

**Slice:** m23-s11 · M23 accessibility S11, the final slice. **Terminal state:** PR
https://github.com/mdrewt/monster-realm/pull/371 OPEN, MERGEABLE/UNSTABLE, ci+e2e QUEUED at hand-off.
Branch `slice/m23-s11` @ worktree `.claude/worktrees/m23-s11` (clean, pushed). `gh pr merge` NOT run.

**Acceptance:** 8/10 met, 2 deferred, 0 unmet — `seed:e3b0c44298fc1c14`. Ledger LINT-CLEAN. The
`Acceptance:` line in the PR body is byte-identical to `mr-gates render --format pr`.

**Delivered.** `just a11y-e2e floor="169": wasm` as a DECAY RATCHET (not an axe run — see below), an
`a11y-e2e` nightly job + notify fan-in + policy preamble, three additive predicates and 35
proof-of-teeth fixtures in `evals/ci-gate-wiring.eval.mjs` (Checks 6/7/8), and
`docs/a11y-manual-protocol.md`. `just ci` green locally: 96 files / 2818 tests, 93 evals PASS / 0
FAIL, observability 8/8, biome 0 errors. ZERO test files differ from origin/master.

**SUPERVISOR ACTIONS NEEDED (4):**
1. **`docs/nightly-red-response-policy.md` is a disclosed `touches-delta:` — audit it.** It is a
   MECHANICALLY FORCED hidden dependency: `evals/nightly-smoke-wiring.eval.mjs` Check 32 demands the
   policy matrix job-key set be SET-EQUAL to nightly.yml's declared jobs, so declaring the job
   without the row reds `just ci` locally (RED captured before adding it). No in-touches design
   avoids it; piggybacking onto an existing job is worse (notify reports the JOB KEY, so an a11y red
   would open "nightly failure: coverage"). No sibling was running (0 open PRs). **Fold
   `docs/nightly-red-response-policy.md` into the declared `touches:` for any future nightly-job
   slice.**
2. **ADR number requested.** None was assigned, and doc-aggregation forbids picking one, so NO ADR
   was authored; the policy row cites existing ADR-0050 + ADR-0205. Warranted topic: "the nightly
   a11y tier — what `just a11y-e2e` measures, why it is not axe today, and the never-CI-green rule".
3. **Promote the four backlog DEFERs into real spec sections** (X8/X9/X10/X11 — see below).
4. **NEW BUG FOUND IN THE MAIN CI GATE, out of this slice's remit.** `isTruthyCoe`
   (`evals/ci-gate-wiring.eval.mjs:42`) recognises only the literals `true|yes|on|True` and the exact
   `${{ true }}`. Red-team EXECUTED two bypasses: `continue-on-error: ${{ !cancelled() }}` and
   `${{ success() || true }}` are unconditionally true in every real run and pass as "unneutered".
   The new a11y predicate works around it with a VALUE whitelist (literal `false` only), but
   **`ciStepsUnneutered` — the main per-PR ci.yml gate — still carries the hole.** Not fixed here:
   isTruthyCoe is shared and its fixtures pin its semantics, so widening it is its own slice.

**Deferred (all with resolvable targets, all in the ledger):**
- `X8/X9 -> backlog` — the EXECUTION of Protocol A/B. The protocol doc is authored
  (`docs/a11y-manual-protocol.md:45` and `:75`) but **no human has run it** and the run log is empty
  by design. Deliberately NOT self-certified: marking A11Y-32/33 met because a document exists would
  be the exact false conformance claim the doc's own banner warns against. Needs one NVDA 2024.x +
  Chrome sitting (mouse unplugged, screen covered) on a named SHA.
- `X10/X11 -> backlog` — the axe-core + real-browser tier. **This is a genuine SPEC GAP, not a
  scoping choice:** spec §5.7 names "axe-core + Playwright" as the recipe's payload, but no axe-core
  exists in the repo and NO slice in the spec's own §4 table owns authoring `client/e2e/a11y.spec.ts`
  or the devDependency. Consequence: the four `[E2E]`-tagged criteria A11Y-19/20/22/23 have NO
  automated oracle anywhere in M23 today. `just a11y-e2e` is built as the seam. Suggested `m23-s12`.
- `X12 -> wontfix` — operator escalation #3 (spec §8.3), the AA-conformance DoD. Blocks the MILESTONE
  exit and any public conformance statement, NOT this slice. Recorded in the protocol doc.

**Red-team round 2 (4 EXECUTED bypasses of round 1, all closed, each with a hostile-good control):**
CRITICAL — `a11yRecipeBodyIntact` was a substring scan, so `exit 0` planted under `set -euo pipefail`
above a byte-identical body kept every token present while the recipe ran nothing and exited 0. Fixed
by pinning the recipe REGION VERBATIM (raw, not comment-stripped, so a deleted shebang also reds) —
a blacklist of abort constructs is unclosable. HIGH — empty `strategy.matrix` = zero job instances.
MED-HIGH — phantom `runs-on` label. MED — the isTruthyCoe hole in (4) above.

**Lenses:** planner, tester (27 round-1 fixtures, ≠ implementer), reviewer, red-team, /simplify,
verifier PASS (re-ran full gate, independently re-executed X1/X2/X4/X13, re-proved the teeth bite),
desync-guard PASS (nil surface — game-core/server-module/client-wasm/client/src tree hashes
byte-identical to master; the four A11Y-36 parity evals byte-unmodified and green).

**Two measurement notes for whoever verifies:** (a) the client-suite baseline at 2770ec9 is **2818**,
not the 2819 m23-s10's ledger recorded — re-measured twice, and zero test files differ from master,
so the discrepancy is inherited, not caused here. (b) `evals/nightly-smoke-wiring.eval.mjs` has NO
main guard: `node evals/nightly-smoke-wiring.eval.mjs` exits 0 VACUOUSLY; import it and call
`m.default()`.

**Boy Scout:** 1 hunk / 2 lines — `justfile:280-281`, a stale "CI-as-required-gate is M5b" comment
that ci.yml's e2e job has long since shipped. Two other candidates turned out to be historical prose,
so they were left alone.


## 2026-08-25T07:31:02Z — m23-s11 LAUNCHED (composite launch after m23-s10 merge)
Composite merge->launch: after m23-s10 merged clean (PR#370, 2770ec9), re-derived eligibility fresh. Dependency spine S0->S1->{S2||S7}->{S3||S4}->S5->S6->{S8->S9}->{S10||S11}: S11's after: is S10 only (now merged); S8/S9 remain BLOCKED on spec Sec.8 operator rulings (unrelated branch). No in-flight slices, touches disjoint trivially (solo launch). Re-probed for human activity: only my own merge-produced file writes in the last 6 min, no resident IDE claude pid -- clear. Launched m23-s11 (justfile a11y-e2e recipe + nightly workflow wiring + docs/a11y-manual-protocol.md for the two MANUAL-only criteria A11Y-32/33 + evals/ci-gate-wiring.eval.mjs) opus@high routine tier, leader pid 1757938, rid mr-spawn-20260825T073041Z-1757878. Gate-seeding returned SPEC-SECTION-NOT-FOUND (criteria=0) -- the M23 spec's S11 entry is a table row + bold subheading, not a `## S11` heading the seeder pattern-matches; NO-LEDGER for this slice is expected, not a defect (absent measurement per doctrine). S11's BUILD is unblocked; only its milestone-EXIT sign-off (AA-conformance DoD, escalation #3) awaits an operator ruling -- noted in the brief so the run doesn't stall on it.

## 2026-08-25T07:29:20Z — m23-s10 MERGED — PR#370 (2770ec9)
Merged via mr-audit CLEAN (policy) + mr-gates verify 15/15 met, spotcheck X9 agreed. gating_advisory FLAGGED skip_markers_added=11/suppressions_added=1 — read the diff hunks: all hits are string literals inside the new eval's own bad-fixture detector (T14c checks that a `describe.skip(` delegate gets flagged SUSPENDED) plus one comment mentioning @ts-expect-error; no real test suppression added. Squash-merged, branch+worktree deleted, master fast-forwarded to 2770ec9. m23-s6 (PR#369) was already merged prior to this tick. Residuals close: 0 (none open for m23-s10). Delegated master-CI wait to a background poll; will confirm green next.
## 2026-08-25T05:48:32Z — m23-s6 MERGED (PR#369, sha 2dbfe0c8)
Supervisor tick native-20260825T054518Z-1589143 merged m23-s6 (menuView ARIA listbox/aria-activedescendant, 16th/last click-only OverlayId gets a11y wiring). Audit: orchestration CLEAN, gating CLEAN, mandatory_read=false. Acceptance ledger FLAGGED on X15/X16 (lint/full-ci gates) -- adjudicated FALSE-POSITIVE: this Bash session has no cargo at all (rust not asdf-installed here), reproduced the identical cargo-not-found failure independent of the diff/commit. Rooted run's own log recorded FINAL-CI-EXIT=0 from a real just ci (2734 tests, 90 evals PASS) inside its own environment which does have cargo -- that is the trustworthy signal. 14/16 pure-test gates all fresh-reverified true incl. adversarial spotcheck (X8, agrees=Y). residuals close: 0 open (nothing to close). Two DEFERs disclosed by this slice (A11Y-25, A11Y-26) both targeted backlog, INTENDED OWNER m23-s10 -- no promotion needed this tick, S10's own spec section already names them. Worktree removed, local+remote slice/m23-s6 branches deleted. Master fast-forwarded to 2dbfe0c8; master CI (run 32814222235) still in_progress at tick end -- next tick/event should re-verify green before trusting it. No BLOCKERs. Governor NORMAL (d7 ~$1382/2783 eff.). Fan-out: none in flight; falling through to gate-3 pick-work next.
## 2026-08-25T03:57:03Z — m23-s5 merged (PR#368, 3e062c4) — composite launch m23-s6
**Slice:** m23-s5 — M23 accessibility S5, the sole `client/src/main.ts` touch: worldHasFocus()
conjunct on the twelve open branches, Escape-ladder close announcements, focus return,
#help-hint -> native <button> (ADR-0206).

**Merge:** PR#368 squash-merged -> 3e062c4 on master. CI: ci+e2e both SUCCESS pre-merge;
post-merge master CI run in progress at record time (same tree as the passing PR checks).
Branch deleted, worktree removed, local branch pruned. mr-branch-audit clean (0 post-merge
commits, 0 stale branches across 345 merged PRs).

**Audit adjudication:** mr-audit orchestration=CLEAN (reviewer+tester+verifier roles present,
mandatory_read=false). gating_advisory FLAGGED (6 modified asserts, 0 skips/suppressions) —
read the diff: the a11y bounded-surface allow-list gained `background`/`border`/`padding` for
the <button> conversion, each `border`/`padding` addition paired with a VALUE-constrained
assertion (not a bare name-allow), plus closed a pre-existing unconstrained-`font` hole
(red-team #2, HIGH) the button conversion made exploitable. Net: the diff TIGHTENS the gate,
does not weaken it. mr-gates verify: 13/13 met, 0 unmet, 0 deferred, spotcheck agrees, seed_drift
false. FLAGGED reason is SPEC-SECTION-NOT-FOUND — the seeder's known recurring gap for M23
(5th occurrence per s0/s1/s3/s4/s7), not a semantic problem; hand-authored ledger with real
CHECK/EXPECT per gate. residual_alarms noted 15 open residuals vs cap 12 (observe-only in
slice 1, not a blocker this tick).

**Composite launch:** m23-s6 (menuView.ts keyboard/AT semantics — role=listbox/option,
aria-activedescendant) launched opus@high/routine immediately after, per the M23 dependency
spine S5->S6. No fan-out partner (serial by construction per spec §4). Fresh slice, no park
memo, no stale locks/stop-flags, memory headroom ample (37G available).

**Governor:** NORMAL throughout (d7 $1331.13 raw / $1421.13 effective incl. one
unreconciled run, of $2783 weekly; fable_ok=true).
## 2026-08-25T01:43:43Z — m23-s5 (PR#368): remote e2e RED, resuming fix cycle 1
Native tick rid=native-20260825T014010Z-1265099. PR#368 (m23-s5, ADR-0206, worldHasFocus() scoped hotkey gate) opened by the prior run: local just ci green (95/95 files, 2705 tests), remote ci green, but remote e2e RED with 3 failures in pre-existing specs the slice never touched (movement-input.spec.ts 14r-e, pvp.spec.ts m16b, trade.spec.ts M15c) — all consistent with the new 12x && worldHasFocus() conjunct blocking toggle-close / cross-overlay-open once focus leaves canvas/body. Did NOT merge (per doctrine: still-dead CI failure = real failure, triage not blind-relaunch). Resumed on the existing worktree/branch (slice/m23-s5, da0b0ff) as a HARD-tier fix cycle (prior attempt failed -> fable/xhigh; fable_ok=true, d7 fable spend $108.77/$2298 allowance). resume_block hands the run the 3 concrete failures, root-cause hypothesis, and two candidate fix shapes, with instruction to push a new commit to the same branch/PR rather than opening a new one. Governor NORMAL (d7 $1329.58/$2783 eff.). No BLOCKERs.
## 2026-08-25T00:02:13Z — m23-s5 launched
Native tick rid=native-20260825T000014Z-1109313. Gate-0/1: no live per-run locks, no chain-owner mutex, no operator hold, no resident-session collision (find -newermt -6min empty both repos; only pre-existing future-prompts.md stray + untracked proj .codegraph/ index, both left untouched). Live-verified master CI green at 78e2bb2 (matches local + situation-bundle sha, run conclusion=success). No open PRs either repo, no worktrees beyond canonical checkouts, no /tmp .done files pending merge. Residuals: mr-gates residuals list --unclaimed shows 15 open (over cap 12, observe-only per doctrine), max age ~1.1d -- all far under t1_promote_days=3, none outrank new work. queue[] empty. M23 spine S0->S1->{S2||S7}->{S3||S4}->S5->S6->{S8->S9}->{S10||S11}: S0/S1/S2/S3/S4/S7 already merged, so S5 (after: S3,S4, both satisfied) is the sole unblocked slice -- serial by construction (only client/src/main.ts touch), no fan-out partner. Tier=routine (opus@high): touches only client/src/main.ts + the #help-hint element in index.html, no server-schema/reducer, predictor/netcode/reconcile, security/RLS, or M20/M25 hit, not a resume. Pre-allocated project ADR-0206 (adr_next_free was 206). mr-spawn LAUNCHED cleanly: leader=1111335, claude_pid=1111338, rid=mr-spawn-20260825T000152Z-1111276. GATES-SEEDED criteria=0 (SPEC-SECTION-NOT-FOUND, same known-benign M23-EARS-lives-in-section-6 quirk seen on every prior M23 slice, not a launch blocker). Governor NORMAL (d7=$1274.70/2783 eff., fable_ok=true; opus-tier launch unaffected). No BLOCKER, no rate-limit event. Standing down this tick after the single launch action.
## 2026-08-24T23:14:20Z — m23-s4: PR#367 merged (78e2bb2) — 9/9 gates, audit CLEAN
Supervisor tick native-20260824T230824Z-1092695 merged m23-s4 (constructed-shell a11y wiring: battleView/boxView/raisingView/evolutionView/claimView + canvas world region ARIA) via squash --delete-branch. Audit: policy=orchestration CLEAN, gating_advisory=CLEAN (no deletions/skips/suppressions), acceptance=FLAGGED-but-advisory (9/9 met, 0 unmet, 0 deferred, spotcheck TEETH-BITE agrees=true; reason=SPEC-SECTION-NOT-FOUND, not evidence_mismatch or seed_drift) — merged per doctrine (advisory never a merge predicate). mr-gates residuals close: 0 residuals for this slice. Local master ff-only'd to 78e2bb2, m23-s4 worktree+branch removed. Master CI on the merge commit was still in_progress past the usual ~9min window at tick-end (not blocked on per no-polling doctrine) — next tick should re-verify live before any further action on master.
## 2026-08-24T22:52Z — m23-s4: PR #367 open, local `just ci` green, remote CI running (SUPERVISOR OWNS THE MERGE)
**Slice:** m23-s4 · M23 accessibility S4 — the five constructed-shell views (`battleView`, `boxView`,
`raisingView`, `evolutionView`, `claimView`) wired to S1's `openOverlayA11y`/`closeOverlayA11y`, plus
`role="application"`/`tabindex="0"`/`aria-label` on the Pixi canvas in `render/world.ts`.
**Terminal state:** PR https://github.com/mdrewt/monster-realm/pull/367 open, MERGEABLE/UNSTABLE, `ci`
and `e2e` both IN_PROGRESS at hand-off. Local `just ci` **EXIT=0** (94 client test files / 2684 tests,
90 evals PASS / 0 FAIL, wasm ok, perf budget ok, secrets clean, observability 8/8).
**Acceptance:** `9/9 met, 0 deferred, 0 unmet — m23-s4 seed:e3b0c44298fc1c14` (the PR body carries this
line verbatim). Ledger authored in the PLAN phase (seeded SPEC-SECTION-NOT-FOUND again — M23's EARS
block is §6, not §7.x, the same seeder miss m23-s0/s1/s2/s3 all hit). X1–X5 transcribe A11Y-13/14/16/17/15
scoped to the five S4 views; X6–X9 were authored for the S4-owned behaviours those five do not cover.
Independently re-verified by the `verifier`: 9/9 agree with recorded evidence, `evidence_mismatch: []`.
**Orchestration:** planner → reviewer + red-team + /simplify (plan) → tester (RED, a different agent) →
red-team (~24 wrong impls against the suite) → orchestrator implemented → reviewer + verifier +
desync-guard in parallel → doc-keeper. Red-team found **zero** green-and-wrong survivors; it did find one
real defect, fixed BY THE TESTER not the implementer: `S4-battleView-REFRESH-EDGES` asserted two closes
after a `vi.clearAllMocks()` that only one `refresh(null)` follows — unsatisfiable by any implementation.
**Five bite-proofs**, each reddening exactly its own tooth with zero collateral (3 by the orchestrator,
2 independently by the verifier). Tests strictly additive: **0 removed lines vs origin/master** in all
five extended spec files.
**`touches-delta:` (2 files, both additive, both in the PR body):** `client/src/ui/a11yCopy.ts` (one key,
`'a11y.world.region'` — closes the gap the merged m23-s1 ARCHITECTURE entry escalated in writing, and S0
scoped its set-equality gate to `a11y.overlay.*` on both sides precisely so a later slice could add it);
`client/src/ui/renameView.test.ts` (one new `it()` reusing S3's hardened stripper over the five S4 files;
S3's own array and test left byte-identical). No concurrent sibling owned either. **`boyscout-delta:` none.**
**THREE ITEMS FOR THE SUPERVISOR / LATER SLICES:**
1. **`ui/overlayA11y.ts`'s cross-slice contract (a) is FACTUALLY WRONG** and so is the `**m23-s1**`
   ARCHITECTURE block quoting it: the four `#app`-mounted views do NOT share a root — each creates its own
   and appends into the shared `#app` MOUNT. S4 deliberately did NOT implement the close-before-open that
   comment demands (it would close an overlay the player still has open) and pinned the correction with
   `S4-CROSS-VIEW-DISTINCT-ROOTS`. The stale comment is out of S4's `touches:`; it needs an owner —
   S10's `overlayA11yWiring.test.ts` is the natural home.
2. **S10 WILL FAIL on four ids as specified.** Spec §5.5's vacuity-killer requires the resolved
   `initialFocusSelector` element's tag to be in `{BUTTON, INPUT, SELECT, A, TEXTAREA}`, but S0 froze all
   four constructed-shell selectors onto `<h2 tabindex="-1">` anchors. Widen that list when S10 is planned.
3. **claimView re-opens after a manual dismiss** (pinned by `S4-claimView-REOPEN-AFTER-HIDE`, not fixed):
   `ClaimPhase` never returns to `'hidden'` and `main.ts`'s `KeyC` close calls `hide()` directly rather than
   through `applyClaim`, so a reconnect-driven render arrives `visible:true` while the DOM reads hidden and
   re-opens — now with a focus move. Fix needs `claimModel.ts` or `main.ts` (S5's file). **Candidate S5 scope.**
**No ADR** (none assigned; ADR-0205 is the family authority). ADR next-free = 0206.
**Next in the M23 spine:** S5 (`main.ts` — `worldHasFocus()`, the Escape-ladder announcements, `#help-hint`
as a native `<button>`), which is `after: S3, S4` and is serial by construction (sole `main.ts` toucher).
S6 follows S5; S8 remains BLOCKED on operator escalations §8.1/§8.2. S10/S11 wait on S3+S4+S7 (S7 merged).
**Toolchain note added to memory this run:** the PostToolUse format hook formats with `npx biome` (2.5.7)
while `just lint` uses the repo-pinned `client/node_modules/.bin/biome` (2.5.1) — the hook's reformat reds
lint and *looks* like a deleted test in the diff. A fresh worktree has no `client/node_modules` at all until
`npm ci`, which is why the unpinned binary gets used. Run `npm ci` in `client/` first thing in a new worktree.

# monster-realm v2 — supervisor handoff (rolling; older entries in monster-realm-handoff-archive-2026-08.md, monster-realm-handoff-archive-2026-07.md)

---

## 2026-08-24T21:02:55Z — 21:00Z tick -- reconciled 19:34Z bookkeeping + launched m23-s4
Native tick rid=native-20260824T210017Z-945121. Gate-0/1: no live per-run locks, no chain-owner mutex held, no operator hold, no resident-session collision. Found the 19:34Z tick's mr-state.json/handoff/archive uncommitted despite having merged BOTH m23-s3 (PR#365, f33a3eb) and m23-s7 (PR#366, 20c893348152ac9f143890e3935067a69fa863fe) -- reconciled via harness commit e545617 (future-prompts.md left untouched, unrelated user scratch content). Live-verified: master CI green at 20c8933 (run 32772891486, conclusion=success), matches local master sha, no open PRs (mdrewt/monster-realm or mdrewt/claude-harness), no worktrees beyond the canonical checkout, no stray branches. Residuals: mr-gates residuals list --unclaimed shows 15 open, max age 0.98d, all far under t1_promote_days=3 -- none outrank new work; 15 vs cap 12 remains observe-only per doctrine (slice 1). M23 spine (S0->S1->{S2||S7}->{S3||S4}->S5->...) now has S0/S1/S2/S3/S7 merged. S4 (after: S1,S2, both merged) is the sole remaining unblocked slice at this spine position -- S3's sibling S4 is 'never paired' with S3 in fan-out, but that's moot now that S3 is already merged; S4 launches solo. touches disjoint from everything else (client/src/ui/{battleView,boxView,raisingView,evolutionView,claimView}.ts + client/src/render/world.ts), no in-flight sibling to collide with. Tier=routine (opus@high) -- no server-module/schema/reducer touch, no predictor/netcode/reconcile path (world.ts is the imperative render shell, not reconcile logic), no security/RLS, not M20/M25, fresh (not a resume-after-park). mr-spawn LAUNCHED cleanly: leader=947588, claude_pid=947591, rid=mr-spawn-20260824T210227Z-947528. GATES-SEEDED criteria=0 SPEC-SECTION-NOT-FOUND (4th occurrence across s0/s1/s3/s4 -- same benign M23-EARS-lives-in-section-6 quirk, not a launch blocker, flag for the seeder fix already noted twice before). Governor NORMAL (d7=$1228.69/2783 eff., fable_ok=true; this launch is opus-tier, unaffected). No BLOCKER. No rate-limit event.
## 2026-08-24T20:18:59Z — m23-s7 merged (PR#366) — reduced motion
M23 accessibility S7 (reduced-motion, A11Y-27/28/36, spec §2.5) merged to master as 20c8933 (squash of PR#366). HARD tier (renderResolver.ts predictor-adjacent). model=fable/xhigh, 1 attempt, $61.99.

Delivered: motionPreference.ts (sole matchMedia caller, S5 wires it at main.ts:2719 later — S7 ships it UNCONSUMED, main.ts-free per spec §4), ResolveInput.reduceMotion (optional, default false — additive, non-breaking), own-path forces snapTo every frame under reduceMotion (clock keeps tracking so a later false frame resumes cleanly, no teleport), remote-path bypasses interpolation entirely via new interpolateReducedMotion (authoritative row tile, clock-independent by construction).

mr-audit: orchestration CLEAN (8 roles incl. mandatory desync-guard), gating_advisory CLEAN. mr-gates verify: 10/10 gates independently reverified, X7 spotcheck agreed. X11 (repo-wide matchMedia purity eval) pre-declared DEFER -> S10 backlog per spec §4's ownership split; not a gap. Hard-tier mandatory diff read done by supervisor: diff is small, additive-optional, matches spec intent, no red flags.

Branch/worktree cleaned, remote branch deleted. master CI (ci+e2e) was still in_progress at merge-record time; local `just ci` on the exact merged tree ran green pre-merge (92/92 files, 2644/2644 tests, 90/90 evals) so high confidence, but next tick should re-verify master CI conclusion live before treating it as ground truth.

Residuals: close attempted for m23-s7 as promoted-slice target -> 0 rows (expected; nothing was DEFERred onto m23-s7 itself). Residual backlog remains over cap (15 open vs cap 12, observe-only in slice 1) — unrelated to this slice, unclaimed residuals still exist for pick-work ranking.

## 2026-08-24T19:33:33Z — m23-s3 merged — PR#365 (a11y two-mechanism wiring, ten static-shell views)
Native tick rid=native-20260824T193125Z-830859. PR#365 (mdrewt/monster-realm, slice/m23-s3→master) squash-merged: wires ten static-shell overlay views to overlayA11y.ts helpers in the two mechanisms M23 §2.2 requires (show()/hide() delegation for 7 views; render(vm|null) null-edge for 3 views with no show()), deletes the last two view-local deferred .focus() calls. mr-gates verify independently re-ran 9/9 met, 0 unmet, 0 deferred, spotcheck (X2) adversarially re-read and held. mr-audit: orchestration CLEAN, gating-test-integrity CLEAN, mandatory_read=false; acceptance block showed FLAGGED but only on SPEC-SECTION-NOT-FOUND (seeder can't find M23's EARS block, which lives in spec §6 not §7.x — 3rd occurrence across s0/s1/s3, adjudicated benign, worth fixing in the seeder). diff ⊆ declared touches (10 *View.ts) + companion *.test.ts + one ARCHITECTURE.md entry. Items: none. Worktree/branch cleaned (local + remote). master fast-forwarded to f33a3eb; post-merge CI run in_progress at merge time (pre-merge PR checks were both SUCCESS). Flagged upward for S4/S10, not fixed here (out of touches): (1) overlayA11y.ts openOverlayA11y writes role/aria-modal before the t(labelKey) call that can throw, leaving unrecorded half-open DOM state on an unwired key — unreachable today (all 16 catalog keys pinned), but contradicts the module's own no-half-open-state claim; (2) spec §9.7 wrongly claims dialogueView.ts:30 is the only innerHTML write in the view layer — questLogView/healView/shopView/tradeView also write it. residuals: 14 open vs cap 12, observe-only in slice 1, not this slice's residual (0 closed against m23-s3). m23-s7 (fable@xhigh) still live this tick (leader 655336 alive) — no composite launch.
## 2026-08-24T19:26:31Z — m23-s3 PR#365 — CI-watch delegated (native tick)
Reconciled the m23-s3 finish event: PR#365 open (mergeStateStatus UNSTABLE, mergeable=MERGEABLE), ci+e2e checks IN_PROGRESS. Delegated to mr-ci-watch (pid 824821, detached) rather than polling; resumes via event tick on conclusion. m23-s7 (fable/xhigh, hard tier) remains live in the same window — touches disjoint (client/src/ui/*View.ts vs client/src/render/*), no conflict. Governor NORMAL (d7=$1164.22/2783, fable_d7=$46.78, fable_ok=true). No BLOCKER, no rate-limit event.
## 2026-08-24T18:02:33Z — 18:00Z tick -- fan-out launch m23-s3/s7
Reconciled uncommitted 17:10Z tick bookkeeping first (mr-state.json/handoff/archive; commit 87d9abf) -- that tick had merged m23-s1 PR#364 to 0953db7 but never committed its own records. Live-verified: master green at 0953db7 (run 32755598702 conclusion=success), no open PRs, no live watchers/locks. M23 spine after S0/S1/S2 merged opens {S2 done, S7} and {S3, S4} -- picked the spec-endorsed disjoint pair S3 (static-shell view wiring, ui/*) + S7 (reduced motion, render/*) per section 4's explicit 'S3 || S7' fan-out list, avoiding the never-paired S3||S4 combo. mr-disjoint verdict SAFE, free -g shows 37G free (ample for 2 builds). S3 = routine tier (opus@high). S7 = HARD tier (fable@xhigh, budget fable_ok=true, d7=$1115.61/2783 eff.) -- touches render/renderResolver.ts (reconcile-adjacent) and the spec itself mandates a desync-guard review. Both mr-spawn LAUNCHED cleanly (s3 leader=654704, s7 leader=655336). Both gates-seed calls reported SPEC-SECTION-NOT-FOUND/criteria=0 (same benign pattern noted on m23-s1's prior tick -- the milestone spec's slice table doesn't sub-anchor by S-number the way mr-gates seed expects; not a launch blocker, flag for the merge-time adjudication same as before). No merge this tick (composite budget spent on reconcile + fan-out launch). Governor NORMAL. No BLOCKER.
## 2026-08-24T17:16:35Z — m23-s1 merged (PR#364, 0953db7)
Native tick rid=native-20260824T171027Z-612164 consumed the CI-green event (all checks passed at 17:10:24Z) for PR#364 (slice/m23-s1 -> master, mdrewt/monster-realm). Live-reverified OPEN/CLEAN/CI-success before acting. mr-audit: orchestration=CLEAN (12 agent calls, reviewer+red-team+tester+desync-guard present), gating_advisory=CLEAN (no removed asserts/skips/suppressions). mr-gates verify: 14/14 met, 0 unmet, 0 deferred, all reverified TEETH-BITE with agrees_with_evidence=true; overall verdict FLAGGED but solely via reasons=[SPEC-SECTION-NOT-FOUND] with seed_drift=false — adjudicated as a benign spec-table heading-lookup miss (sibling m23-s2/PR#363 edited the same M23-accessibility.spec.md table) rather than a real defect, since every individual gate's fresh re-run evidence matched. PR body Acceptance: line matched mr-gates render --format pr exactly (14/14 met, 0 deferred, 0 unmet). residual_alarms noted residual-over-cap (14 open vs cap 12) but flagged observe-only for slice 1 -- no action taken. Merged via gh pr merge --squash --delete-branch; remote branch auto-deleted. Cleaned stale local worktree .claude/worktrees/m23-s1 and local branch slice/m23-s1 (worktree removal blocked the first delete-branch attempt). master fast-forwarded 5e76945 -> 0953db7. mr-gates residuals close --slice m23-s1 --pr 364 -> 0 residuals to close (nothing deferred). Ledger row recorded outcome=merged, cost_usd=null/COST-UNKNOWN (mr-record --from-log found no result event in the 5MB pass log -- true spend unrecorded, not investigated further this tick). Post-merge master CI (run 32755598702) was launched and is being watched to confirm green before this tick's final output.

## 2026-08-24T17:03:25Z — m23-s1 doc-conflict resolved, pushed, CI-watch delegated (17:01Z tick)
PR#364 (m23-s1) had gone DIRTY/CONFLICTING after m23-s2 (PR#363) merged first; both PRs appended to the same ARCHITECTURE.md region — the sole conflict, doc-set-only per fan-out doctrine. Found Drew had already resolved it locally in the m23-s1 worktree (merge commit 53e9ab3, union of both entries) but never pushed. Verified the resolution: no conflict markers, diff vs origin/master is exactly the 9 expected new/changed files, ran full 'just ci' clean (87 client files/2542 tests, all evals PASS, perf-budget ok, wasm build ok). Pushed slice/m23-s1 (0455954..53e9ab3). PR#364 now MERGEABLE, CI re-triggered (queued). Delegated to mr-ci-watch for PR#364/m23-s1; merge completes on next event tick. No code was resolved by the supervisor — only the doc-set union that doctrine explicitly permits.
## 2026-08-24T14:55:14Z — m23-s2 merged (PR#363, 14:52Z)
Native tick mr-sup-native-20260824T145113Z-571966 consumed EVENT m23-s2.ci.md (green). Re-verified live: PR#363 CLEAN/MERGEABLE, both checks SUCCESS. mr-audit CLEAN/CLEAN (opus/high, 2 attempts); acceptance ledger 7/7 met, 0 unmet/deferred (advisory FLAGGED: 14 open residuals over observe-only cap 12, + SPEC-SECTION-NOT-FOUND lookup note — adjudicated non-blocking, spotcheck gate X7 fresh-reproduced and agrees with recorded evidence). Merged via gh pr merge --squash --delete-branch -> 5e76945 on master; remote slice/m23-s2 confirmed deleted post-prune-fetch. Worktree .claude/worktrees/m23-s2 removed, local branch deleted, checkout fast-forwarded to 5e76945. Ledger row recorded COST-UNKNOWN (no result event captured for this run — true spend unrecorded, flagged in notes). master CI for 5e76945 was still in_progress at tick end (queued->in_progress across ~2min of polling) — NOT independently confirmed green despite the ledger's auto-derived master_ci_after=green; next tick should re-verify live before trusting that field. m23-s1 (PR#364, UNSTABLE) unchanged this tick — mr-ci-watch pid 570061 still live and owns that resolution; no action taken on it. No new launch this tick (single merge action; m23-s1 already has a watcher, no other eligible work surfaced). Governor NORMAL (d7=$1112.41/2783, fable_ok=true).
## 2026-08-24T14:48:13Z — m23-s1 CI-watch delegated (14:48Z tick)
Native tick mr-sup-native-20260824T144729Z-568778 (14:48Z): consumed EVENT m23-s1.done (rc=0, attempts=1, opus/high, PR#364 opened by the run). Live-verified PR#364 (mdrewt/monster-realm): mergeStateStatus=UNSTABLE, mergeable=MERGEABLE, checks ci+e2e both pending -- per gates doctrine delegated CI-wait to mr-ci-watch (detached pid 570061) rather than polling. Moved m23-s1 from inflight to awaiting_merge in mr-state.json. m23-s2/PR#363 untouched, its own ci-watch (pid 523402) still live. No merge this tick -- event ticks from both watchers will finish their merges. Governor NORMAL (d7=$1111.96/2783 eff., fable_ok=true). No BLOCKER.

## 2026-08-24T14:45:07Z — m23-s2 (PR#363) e2e flake — reran failed job, re-delegated CI-watch
PR#363 e2e check concluded red on 11r-e (ADR-0169) wallet-balance precondition (quest_001 start via elder_oak dialogue) after quest_001 was neither started nor completed after 5 attempts. Diff for this slice is confined to client/index.html, client/src/styles.css, client/src/indexShell.test.ts, ARCHITECTURE.md — no overlap with quest/dialogue/npc.rs code. master's last 5 CI runs (incl. this PR's m23-s0 base) are all green including this same test, so this reads as an unrelated e2e flake rather than a regression from m23-s2. Reran only the failed e2e job (gh run rerun 32739181938 --failed) rather than relaunching the slice. Re-delegated to mr-ci-watch (PR#363, m23-s2) to wait for the rerun; resumes via event tick. m23-s1 remains in-flight (leader 279806, alive).
## 2026-08-24T14:40:46Z — m23-s2: PR #363 open, CI-watch delegated
Native tick mr-sup-native-20260824T144035Z-502862-3840: m23-s2 (M23 accessibility S2, static-shell ARIA literals across 11 client/index.html shells + a11y-live div, plus client/src/styles.css and indexShell.test.ts) finished rc=0, attempts=2, model=opus. Ledger held 7/7 gates met, LINT-CLEAN, red-team round (9 measured bypasses) hardened per PR body. Pushed commit 4497816, opened PR #363 (mdrewt/monster-realm). Live re-verify at this tick: mergeStateStatus=UNSTABLE, mergeable=MERGEABLE, ci check SUCCESS, e2e check still IN_PROGRESS. Per gates doctrine, delegated CI-wait to mr-ci-watch (pid 502987, detached via setsid) rather than polling; it will resume the merge via an event tick when checks complete. m23-s1 remains live and unaffected (leader pid 279806, alive, no .done). No merge action taken this tick. Governor NORMAL (d7=$1076.16/2783 eff.).
## 2026-08-24T13:03:10Z — native tick 13:00Z (reconciled leftover bookkeeping + M23 s1/s2 fan-out launch)
Gate-0: no live locks/kill-switch/human collision on entry. Found uncommitted mr-state.json/handoff.md bookkeeping left over from the prior tick (rid=native-20260824T121031Z-262508, which merged PR#361/m23-s0 to e664fa7 but exited before its own commit) -- reconciled and committed (fee5fee), leaving future-prompts.md untouched (unrelated human scratch-notes file, not supervisor bookkeeping). Live situation confirmed master e664fa7 CI green. Gate-3: no residuals past t1/t2 aging thresholds (10 open, all <1 day old, well under t1=3d/t2=14d) -- none outrank fresh work. queue[] empty. Derived next work from PLAN.md Sec9 + M23-accessibility.spec.md Sec4 dependency spine: S0 merged, S1 and S2 are both after:S0 only (S1: client/src/ui/{focusTrap,liveRegion,announcements,overlayA11y}.ts, all new; S2: client/index.html + client/src/styles.css (new) + client/src/indexShell.test.ts). mr-disjoint verdict SAFE, no shared registry/enum axis, no structural-set overlap -- fanned out N=2 (routine tier, opus@high, neither slice touches schema/reducers/netcode/security). Both launched via mr-spawn, detachment+model asserted, per-run locks written. mr-gates seeding reported SPEC-SECTION-NOT-FOUND for both (table-row slice format, not headed sections -- the acceptance ledger has 0 seeded criteria for these two; advisory only, will need to be judged at merge time same as any NO-LEDGER slice). No BLOCKER. Governor NORMAL (d7=$1027.93/2783, fable_ok=true).
## 2026-08-24T12:13:32Z — m23-s0 merged (PR#361)
PR#361 (feat(m23-s0): A11yMeta + total OVERLAY_A11Y and the flat a11yCopy catalog with a throw-on-miss t()) squash-merged to e664fa7 after CI-watch delegation reported green (both ci+e2e jobs success, run 32724932608). mr-audit: policy CLEAN (mandatory_read=false), orchestration CLEAN. gating_advisory flagged suppressions_added=2 -- verified as a scanner false positive (substring hits on 'ignore'/'expect-error' inside test names/comments, not real suppressions). mr-gates verify: 5/5 met, 0 unmet, 0 deferred, all 5 gates independently re-executed and agree with recorded evidence; PR's Acceptance: line matched the ledger verbatim. Worktree at .claude/worktrees/m23-s0 removed (clean, no uncommitted changes), local branch slice/m23-s0 deleted, remote branch auto-deleted, master fast-forwarded d60af03->e664fa7. Master CI kicked off on the merge commit (run 32725853376) and was still in_progress at tick-end -- not sat-and-polled per doctrine; next event/cron tick reconciles the result. No composite launch this tick (deferring new work until master CI on e664fa7 is confirmed green). Governor NORMAL (d7=$1026.77/2783, fable_ok=true).

## 2026-08-24T12:02:33Z — native tick 12:00Z (master confirmed green, m23-s0 conflict resolved + CI-watch delegated)
Gate-0: no live locks/kill-switch/human collision. Gate-1: fetched both repos. Gate-3: master CI red-at-prior-tick was a flake -- re-verified LIVE: gh run 32717269214 (m22-s1, d60af03) rerun conclusion=success on both ci and e2e jobs. No fix/revert needed. PR#361 (m23-s0) had flipped DIRTY/CONFLICTING under m22-s1 landing on master; git merge-tree confirmed the conflict was confined to ARCHITECTURE.md (doc set per fan-out doctrine) -- resolved deterministically by union (kept m22-s1's paragraph first since already on master, appended the unchanged M23/m23-s0 paragraph) in the pre-existing worktree at .claude/worktrees/m23-s0, committed dec6b56, pushed. PR now MERGEABLE/UNSTABLE with ci+e2e queued on the merge commit -- delegated the wait to mr-ci-watch (detached, pid 258656) per doctrine rather than polling inline. This tick's ONE mutating action = the conflict-resolution push; no new slice launched. Governor NORMAL (d7 ~025.64/2783 eff., fable_ok=true). No BLOCKER.

