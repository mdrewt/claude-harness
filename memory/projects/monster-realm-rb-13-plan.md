# rb-13 — plan memo (A11Y-25 / A11Y-26 · `evals/keyboard-operable-rows.eval.mjs`)

Slice branch `slice/rb-13`, worktree `.claude/worktrees/rb-13`, fork `2681ee6` (origin/master).
ADR reserved: **216**.

## 0. THE LAUNCH BRIEF'S PREMISE WAS FALSE — corrected here, on the record

The brief says "S10 has since landed that eval (`evals/keyboard-operable-rows.eval.mjs`) ... verify
menuView.ts's rows pass the now-live scan". **That file does not exist.** S10 (PR #370) shipped 3 of
its 5 declared eval files (`overlay-a11y-manifest`, `a11y-static-shell`, `reduced-motion-purity`);
`contrast-ratio` and `keyboard-operable-rows` did not land. The supervisor's OWN state file records
this correctly (`memory/projects/mr-state.json`: "Predicted gap CONFIRMED still real
(evals/keyboard-operable-rows.eval.mjs ... does not exist)") — the launch prompt's scope paragraph
contradicts the tick note that generated it.

**Real slice:** CREATE the eval per M23 spec §5.4, closing **A11Y-25** (`[A11Y-12]`/`[A11Y-13]`) and
**A11Y-26** (`[A11Y-T5]`), with `[A11Y-T3]` alongside. `menuView.ts` is the *subject* the scan reads
— the spec designates it the GOOD hostile-but-correct fixture. **It needs ZERO edits.** This is
consistent with the declared `touches:` (menuView.ts + the eval); `touches:` is an upper bound.

## 1. Measured surface (independently re-derived; the brief's "26" was off by one)

**27** non-test `client/src` click sites, each landing in exactly one arm:

* **A1** (21) `const V = document.createElement('button')` in-file — pvpView 144/150/168/192,
  boxView 82/199/229/237, evolutionView 237, battleView 301/303/323/392/431/454/458,
  raisingView 216/244, tradeView 173, shopView 149/169.
* **A2** (2) `ensureElement(id,'button')` file-local factory — claimView:89, sessionView:50.
* **B** (2) `this.#field` declared `readonly #x: HTMLButtonElement` AND the id ships as `<button>`
  in index.html — renameView:88 (`rename-submit`, index.html:60),
  tradeProposeView:115 (`tradepropose-submit`, index.html:79). **Both clauses required** — both
  files reach the field through an `as HTMLButtonElement` CAST, which is free to write.
* **C** (1) delegated + same-receiver keydown sharing a callback identifier — menuView:74/97 on
  `this.#rowsEl`, shared **member expression `callbacks.onInput`** (:76, :107). A `mouseover`
  listener on the same receiver (:78) is a distractor.
* **D** (1) delegated on `document`, every branch target-narrowed to a *proven* native-button
  producer — main.ts:1858, three `.closest()` selectors:
  `[data-shop-id]`→dialogueView:69+71, `[data-menu-launcher]`→index.html:137-140
  `<button id="help-hint" type="button" data-menu-launcher>`, `[data-choice-idx]`→dialogueView:59+61.

**No shipped site violates A11Y-25.** No in-touches fix and no DEFER needed for the subject.

**tabindex:** 5 TS writes (boxView:75, evolutionView:81, raisingView:91, battleView:94 all `'-1'` on
listener-FREE title anchors; render/world.ts:82 `'0'` on the pixi canvas). Zero `.tabIndex =`
property writes. index.html: eight `-1`, one `0` (`#menu-rows`:117, with the `[A11Y-T3]` rationale
in the comment at :110-116). **No positive tabindex exists anywhere.**

## 2. Design rulings

* **The "two-site regression ratchet" (spec §700, reviewer B4) made concrete:** the set
  `NON_NATIVE = sites ∉ {A1,A2,B}` must be **set-equal in BOTH directions** to a frozen 2-entry
  `SANCTIONED_DELEGATIONS` table, **and each entry must independently re-pass its arm's check**.
  Rejected alternatives: a `≤2` cap (goes GREEN on a *deleted* accessible control, and a
  swap keeps the count at 2); membership-only allowlist (turns the ratchet into a permanent
  exemption). Classification is **TOTAL** — `unclassified > 0` is a RED, never a pass.
* **`[A11Y-13]` identity** = non-empty intersection of callee identifiers between the same-receiver
  click and keydown bodies, **after subtracting `EVENT_NOISE`** (anything prefixed with the
  handler's own parsed parameter name, plus Number/String/parseInt/console). Without the
  subtraction, two handlers that both call `e.preventDefault()` "share an identifier" — the spec's
  declared vacuity attack in its subtler second form.
* **Fail-loud on unparseable** (the spec's declared residual, made explicit): `.bind()`, ternary,
  spread, call-expression receiver, unbalanced parens/braces/backticks at EOF, or an unparseable
  arrow head (which would silently empty EVENT_NOISE — a *loosening*). Precedent to cite:
  `overlay-a11y-manifest.eval.mjs:114-117` takes this exact position for `focus`.
* **`[A11Y-T5]` HTML half is DELEGATED, not re-implemented.** `client/src/indexShell.test.ts:1921-1945`
  already ships a full A11Y-26 forward-guard: a real happy-dom `doc.querySelectorAll('[tabindex]')`
  parse rejecting `>0` AND non-integers document-wide, with its own anti-vacuity floor. A hand-rolled
  `.mjs` attribute scan would be a weaker second oracle plus a drift surface — exactly what
  **ADR-0215 (rb-12)** ruled against one slice ago. Delegate via `findInertPins`/`findInertDelegations`
  + the `includeSelectsTests` reachability clause (the `[A11Y-RM2d]` idiom).
* **Helper reuse (honours ADR-0215 single-owner):** IMPORT `listClientSourceFiles` from
  `a11y-static-shell.eval.mjs`; `stripTsComments`, `findInertDelegations`, `findInertPins`,
  `includeSelectsTests` from `overlay-a11y-manifest.eval.mjs`. Copying a 4th `stripTsComments`
  variant is an explicit anti-pattern. Do NOT import from `reduced-motion-hp-bar.eval.mjs`
  (ADR-0215 RK-1: its stripper is deliberately stricter and non-convergeable).
* **Comment polarity per check:** click/keydown census, identity, and tabindex-write scans all run on
  **comment-STRIPPED** source (menuView names `tabindex` in 5 comments and `addEventListener('keydown'`
  in prose; index.html:110-116 names `tabindex="-1"` AND `[A11Y-T3]` in an HTML comment — a raw scan
  false-REDs the shipped tree). Arm-A `'button'` evidence uses `stripTsComments`, never
  `stripTsCommentsAndStrings` — the string literal IS the evidence. Delegation pins run on RAW text.

## 3. Anti-patterns named (do not build)

1. Naive "is the receiver a `<button>`?" — false-REDs 21 shipped sites.
2. Arm-A by **file-mention** of `createElement('button')` — shopView/boxView/pvpView create both
   `<li>`s and `<button>`s, so any `li.addEventListener('click')` in them would pass.
3. Presence-only pairing ("the file has a keydown somewhere") — must be **same-receiver**;
   main.ts:1097 (window) vs :1858 (document) is the live counterexample.
4. Identity by bare identifier (the spec *guessed* `handleMenuInput`; the real shape is the member
   expression `callbacks.onInput`) — false-REDs the spec's own GOOD fixture.
5. Identity by any shared callee (`e.preventDefault` in both bodies).
6. A `≤2` cap instead of set equality.
7. Sanctioned table as a bare allowlist (membership without re-running the arm).
8. Dynamic `new RegExp` from receiver text — Semgrep `detect-non-literal-regexp` is REMOTE-ONLY with
   3 prior bites here, and receiver text contains `#`, `.`, `(`, `[`. `String.indexOf`/`split` and
   literal regexes only.
9. A `main` guard — `run.mjs:76` imports the default export; a module-scope `process.exit` truncates
   the suite mid-loop (measured: 37/90 ran, 3 FAILs swallowed, CI green).
10. First-hit `indexOf` anchoring for pins — count occurrences, throw on `>1`.
11. A self-source needle planted in `menuView.ts` so the eval has something to grep — presence is not
    reachability, and it would consume a touch for nothing.
12. Any census substring appearing in a `bad()` message — the ledger EXPECT depends on the census
    line being success-EXCLUSIVE (prior slice made a gate permanently unsatisfiable this way).

## 4. Anti-vacuity floors (each `bad()`s, never silently passes)

`files >= 40` (live ~60) · required files present (menuView, main, dialogueView, renameView,
tradeProposeView, claimView, render/world) · `clickSites >= 25` (live 27) · `keydownSites >= 8`
(live 9) · `tsTabindexWrites >= 5` (live 5) · index.html readable with `>= 8` tabindex attrs and
`id="menu-rows"` · **`unclassified === 0`** · NON_NATIVE set-equal to the 2-entry table both
directions · `teeth === teethTotal` before the real-tree section · every throwing helper call
wrapped (ADR-0215 RK-2 records the opposite shipped live).

## 5. Cleared hidden-dependency probes (verified, not assumed)

* `evals/run.mjs` — `readdir` + `.endsWith('.eval.mjs')` (:11), floor at ZERO files (:14).
  Auto-discovery is real; **no run.mjs edit**, per spec §5.7.
* `evals/scanner-migration-audit.eval.mjs` — readdirs all evals but filters through `isGatedName`
  (:245-247), matching only `*-security.eval.mjs`/`*-privacy.eval.mjs`. Not triggered.
* **No eval-count baseline exists** anywhere; `evals/baselines/` holds content baselines only.

## 6. DECLARED RESIDUALS (out of `touches:`, flagged not silently absorbed)

* **R-rb13-A11YE2E** — `evals/ci-gate-wiring.eval.mjs:517-521` `A11Y_EVAL_FILES` pins the THREE
  shipped a11y evals that the `justfile` `a11y-e2e` recipe must name. Adding the fourth forces edits
  to the `justfile` recipe AND that eval's verbatim region pin — **two files outside `touches:`**.
  Spec §5.7 routes §5.4 to `just eval` (already a REQUIRED_JUST_STEP), so this is a deliberate
  non-goal. Consequence: the new eval is protected only by run.mjs's zero-file floor; deleting it
  leaves `just eval` green with one fewer check.
* **R-rb13-T3XTIER** — the cross-tier `[A11Y-T3b]` arm (index.html `tabindex="-1"` id → a TS listener
  bound on the element that id resolves to). Interim cover: the `#menu-rows` `[A11Y-T3]` pin.
* **R-rb13-ENSURE** — Arm A2 (`ensureElement(id,'button')`) trusts the factory's 2nd arg; if a future
  index.html ships one of those ids as a non-button, the id-first early-return yields a non-button.
* **Stale prose, ungated, outside `touches:`** — `ARCHITECTURE.md:1865-1866` and
  `client/src/ui/menuView.test.ts:1665` both say the eval is deferred / "S6 may not create". Left
  uncorrected on purpose; listed in the PR body. (menuView.test.ts IS an in-scope sibling test file,
  so its one-line comment correction is legal — see the touches-delta.)

## 7. Right-sizing

**One mergeable slice.** The eval is worthless in halves — a `[A11Y-12]` census without `[A11Y-13]`
identity IS the presence check the spec declares vacuous, and the T3/T5 half is ~60 lines riding the
same receiver machinery. Splitting would ship a knowingly-vacuous gate as an intermediate state.

---

# 8. PLAN-PHASE LENS FINDINGS (reviewer + red-team, both opus, run in parallel)

The red-team **built a working prototype of the planned matchers in `/tmp/rb13-rt/` and ran cheats
against a real copy of the tree**. Every finding below marked MEASURED came with a command and its
output. Verdict on the plan as originally written: *"ships a hollow gate for three of its four tags"*.
The design below is the REVISED plan. The original §1 census survived both lenses intact
(reviewer independently re-derived all 27 sites and confirmed no shipped site violates A11Y-25).

## 8.1 BLOCKERS — measured

* **S1 (CRITICAL, measured).** `[A11Y-13]` as planned tests **token presence, not invocation**.
  8 inert keydown handlers passed: `if(false)` dead branch, never-invoked nested arrow, mouse-only
  condition, unreachable `catch`, early `return` before the call, a LOCAL SHADOW binding a different
  object, wrong-event-type guard, always-false `typeof` guard. Cheapest exploit, GATE GREEN:
  `this.#rowsEl.addEventListener('keydown', (e) => { const dead = () => callbacks.onInput({kind:'up'}); });`
  Worse: `EVENT_NOISE` did not deny JS keywords, so `(e) => { if (e.repeat) return; }` — a
  functionally EMPTY handler — passed on the shared token **`if`**. Also measured passing on shared
  `Boolean`, `Math.max`, `this.#render`. The live tree already prints `sharedIds=["callbacks.onInput","if"]`.
  → **FIX:** identity = the shared callee must appear as a **call expression in statement position**
  at the handler's top level or under a guard referencing the event parameter; rejected inside
  `if(false)`, after an unconditional `return`, inside a nested function expression, or in a
  `catch` on a non-throwing `try`. Hard `KEYWORD_DENY` + `GLOBAL_DENY`. Shared callee must be a
  dotted/private member expression, identical text on both sides, at call position.
* **S2 (CRITICAL, measured).** The census cannot see `el.onclick = fn`. Splicing an inaccessible
  click-only `<li>` row list into `shopView.ts` produced a **byte-identical census line** — every
  floor, `unclassified===0` and the ratchet green. Also invisible: `el['addEventListener']`,
  `addEventListener` via `.bind`. → **FIX:** census `on<event> =` property assignments as
  first-class sites, and add a **divergence floor**: raw textual `addEventListener` occurrences must
  equal parsed sites, else fail loud.
* **S3 (CRITICAL, measured).** 11 of 13 tabindex evasions invisible, including the canonical
  `el.tabIndex = 5` and `row.tabIndex = -1; row.onclick = ...` (the literal
  `NEGATIVE_TABINDEX_INTERACTIVE` shape). Real-tree mutants M6/M7 shipped three A11Y-26 violations
  and one A11Y-T3 violation at GATE GREEN with a baseline-identical census. The plan's own
  "zero `.tabIndex =` property writes today" is the reason the hole would never be noticed.
  → **FIX:** scan `.tabIndex =` as a first-class write; case-insensitive attribute name;
  `setAttributeNS`; **fail loud** on a non-literal value, a computed attribute name, and on any
  `innerHTML`/`outerHTML`/`insertAdjacentHTML` literal containing `tabindex`; plus a raw-occurrence
  divergence tooth.
* **B1 (reviewer, BLOCKER).** X3 as originally worded **REDs the shipped tree**. Three receivers
  carry both click and keydown, not one: `menuView.ts:74/97` (intersection `{callbacks.onInput}` ✓)
  but also `renameView.ts:84/88` and `tradeProposeView.ts:112/115`, both
  `{e.stopPropagation();}` vs `{this.#submit();}` → **empty intersection**. The plan was saved only
  by an UNSTATED arm-precedence rule. → **FIX:** state explicitly that `[A11Y-13]` applies ONLY to
  sites not already resolved as native; add a GOOD tooth for the renameView shape asserted to PASS.
* **B2 (reviewer, BLOCKER).** Arm D had **no stated mechanical predicate** while X2 gated on it —
  an eyeballed exemption, i.e. the plan's own anti-pattern #7 reintroduced.
* **S4 (HIGH, measured).** Arm D's producer table is frozen: downgrading
  `dialogueView.ts:59` `createElement('button')` → `createElement('div')` — a **one-token real a11y
  regression** making every dialogue choice non-focusable — is GATE GREEN. A 4th delegation branch
  evades via concatenated selector, a `const` selector, `matches()`, or bare `dataset` (4 of 6
  measured green). → **FIX:** enumerate ALL narrowing idioms and fail loud on any unrecognised one
  or non-literal selector; **re-derive the producer from source every run** (for `[data-choice-idx]`
  find the `X.dataset.choiceIdx =` write and require `X` bound to `createElement('button')` in the
  same function scope).
* **S5 (HIGH, measured against the REAL shipped helpers).** The `[A11Y-T5]` HTML delegate can have
  its **entire** A11Y-26 forward-guard replaced by `const badTabindex = []; if (badTabindex.length < 0) doc.querySelectorAll("[tabindex]");`
  — vitest green, `findInertDelegations` empty, `findInertPins` zero inert. Combined with
  R-rb13-A11YE2E, A11Y-26 would have NO enforcement path surviving a single-file edit.
  → **FIX:** pin the load-bearing assertion EXPRESSION (`Number.parseInt(e.raw, 10) > 0` and a
  needle unique to the `expect(...)` chain) with an occurrence count `===1`, plus a real **inverted-
  assertion negative probe** (rewrite `.toEqual([])` → `.toEqual(badTabindex)` and require a RED).
* **S6 (HIGH, measured).** Set equality keyed on `(file, receiver)` collapses two distinct sites to
  one key: a SECOND mouse-only click listener on `menuView.ts`'s `this.#rowsEl` gives
  `clickSites=28 armC=2` yet `sanctioned=2/2 setEqual=true` → GATE GREEN.
  → **FIX:** compare a **multiset** — each sanctioned entry carries a `count`, assert per-key count
  equality AND a global `nonNativeSiteCount === sum(counts)`.
* **S9 (MEDIUM, measured — makes X4 unsatisfiable as written).** Named function references already
  ship twice: `ui/focusTrap.ts:150` `root.addEventListener('keydown', onKeydown, true)` and
  `render/resizeWiring.ts:33` `win.addEventListener('resize', syncSize)`. The plan's fail-loud list
  omits the shape, so `unparseable=0` is unreachable without an exemption — and the exemption admits
  a named no-op keydown. → **FIX:** resolve a named reference to its in-file
  `const X = (p) => {…}` / `function X(p){…}` and analyse THAT body with the resolved parameter as
  the noise prefix; fail loud only when the definition is not in the file.

## 8.2 CORRECTNESS FIXES

* **M3 (reviewer).** `EVENT_NOISE` as a bare `startsWith(param)` deletes every callee beginning with
  `e` — `emit`, `escapeMenu`, and the real module `client/src/ui/eventRing.ts`'s `eventRing.push`.
  → boundary-anchored: `callee === p || startsWith(p+'.') || startsWith(p+'[')`. GOOD tooth pinning it.
* **M1 (reviewer).** §5.4 says "no native `<button>`/`<a>` **child**"; every arm tests the
  **receiver**. Deliberate STRENGTHENING (a click on the `li` wrapping a button is still not
  keyboard-reachable at the li). Declared here so a later reviewer does not "fix" it back.
  Named shape: `shopView.ts:144-158` builds `<li>` → `<button>` in one function.
* **M2 (reviewer).** Arm A1's evidence was identifier+FILE scope; `boxView.ts` rebinds `el` at :156
  and :179, `battleView.ts` rebinds `select` at :364 and :404 — same-name rebinding is house style.
  Latent today (no identifier is bound to both `'button'` and a non-button), but → resolve to the
  **nearest preceding binding**, and require the `createElement` argument list to be EXACTLY one
  string literal (S8 measured `createElement('button' === tag ? 'button' : 'li')` and
  `createElement('button'.replace('button','li'))` both passing a naive matcher).
* **S7 (MEDIUM, measured).** Receiver-TEXT keying pairs unrelated objects (a click-only `this.#el`
  in one class paired by another class's keydown in the same file; a `let el` reassigned between
  registrations; an inner-scope shadow) and MISSES a legitimate alias
  (`const r = this.#rowsEl; r.addEventListener('keydown',…)` → false RED, which creates pressure
  toward the plan's own anti-pattern #3). → scope the key to the enclosing brace block; fail loud
  when a receiver text is bound more than once, is `let`/`var`, or appears at >1 brace depth.
* **S11/S12.** Fixtures must be asserted STRUCTURALLY before behaviourally (a `/*` inside a GOOD
  fixture measured as a VACUOUS GREEN tooth: `PASS=true clickRows=0 arms=[]`). Teeth must assert on
  the **specific tag** in the failure detail, never aggregate `pass===false`, and the anti-vacuity
  floors must be structurally excluded from the fixture path (measured: with floors on, EVERY tooth
  "bit" for the wrong reason — `VACUITY FLOOR clickSites<25`). `index.html` has one
  `tabindex="0"` inside the `:110-116` HTML comment → strip HTML comments before any count.

## 8.3 SIMPLIFICATION ADOPTED (reviewer S1/S2/S5) — five arms → two

`native` = the receiver's **nearest preceding in-file binding** RHS is a call whose argument list is
exactly one string literal `'button'` (this covers `createElement('button')` AND
`ensureElement(id,'button')` with one predicate — Arm A2 disappears, and a third factory is covered
for free), OR the receiver is a `#field` declared `HTMLButtonElement` **and** its resolved id ships
as `<button` in `index.html` (both clauses kept — reviewer confirmed `renameView.ts:55` and
`tradeProposeView.ts:80` reach the field through a free-to-write `as HTMLButtonElement` cast).
`NON_NATIVE = clickSites \ native` must be multiset-equal to the 2-entry `SANCTIONED_DELEGATIONS`,
each entry re-passing its own check. No `armA1`/`armA2`/`armB` counters — they were an
implementation detail the ledger had wrongly pinned (reviewer M4).

## 8.4 LEDGER DEFECTS FIXED (reviewer M4/M5 + red-team S10, all measured)

* X7's `teeth=(\d+)\/\1` matched `teeth=0/0` and `teeth=1/1` — a **toothless eval satisfied it**
  (and the backreference also leaks on `teeth=1/17`). → absolute floor.
* X8's `discovered=1` was satisfied by a **forged `res.name`** with no such file on disk (measured
  in a fake suite). → the CHECK now asserts the FILE exists.
* X5's `negOnListener=0` was satisfiable by a scan finding no listener-bearing receivers at all.
  → a positive `listenerCandidates` floor.
* X2 pinned the five-arm taxonomy, blocking the correct simplification. → pins `native=`/`nonNative=`.
* X3/X4 assumed different scopes for adjacent keys. → `pairedReceivers=3 identityChecked=1`.
* `scanned` is **92**, not "~60"; X7's `[4-9][0-9]` would have broken at 100 files.
* All numeric ranges now trailing-anchored (`clickSites=250` matched `clickSites=2[5-9]`).
* Confirmed CLEAN by red-team: no `bad()` path can emit an EXPECT substring (anti-pattern #12 held).

## 8.5 ADR DECISION (reviewer M7)

The reviewer recommends DROPPING the reserved ADR-216 on the grounds that the slice adds no
dependency and no new pattern. **Overruled — ADR-216 IS written**, because the slice makes four
non-obvious rulings a later reader will otherwise re-litigate: (1) identity means INVOCATION, not
token presence, with the measured inert-handler corpus as evidence; (2) the `native`/`SANCTIONED`
two-arm shape with multiset equality, and why a `≤N` cap and a membership allowlist were both
rejected; (3) the `[A11Y-T5]` HTML half is DELEGATED with an inverted-assertion negative probe
rather than re-implemented; (4) the M1 "receiver, not child" deliberate strengthening.
The reviewer's citation correction IS adopted: cite **ADR-0215:22-24** (m23-s10's delegation choice
recorded approvingly) and **ADR-0215:108-111** (the "remove one oracle" principle), NOT its Option-B
decision clause, which is about the `.mjs`←`.ts` direction this slice cannot use.
`just ci` runs `adr-digest-check`, so the digest MUST be regenerated in the same commit.

## 8.6 RESIDUALS ADDED

* **R-rb13-A1SCOPE** (reviewer M2) — nearest-binding resolution is in-file and scope-approximate.
* **R-rb13-REGEXSTRIP** (reviewer minor) — `stripTsComments` in `overlay-a11y-manifest.eval.mjs`
  is NOT regex-literal-aware (`evals/conversation-privacy.eval.mjs` ships a `startsRegexLiteral`
  fix this copy lacks). Zero non-test `client/src` files contain a quote-bearing regex literal
  today, so it is latent; a third stripper is forbidden by ADR-0215, so this is declared not fixed.
* **R-rb13-TESTSUFFIX** (red-team, unmeasured) — `listClientSourceFiles` excludes `*.test.ts`, so a
  production module named `rows.test.ts` and imported by a view is bundled by Vite but never scanned.

---

# 9. ORCHESTRATOR-RUN MUTATION BITE-PROOFS (real tree, scratch copy at /tmp/rb13-bite)

Run by the orchestrating session, not a subagent (the `tester` has no usable Bash for this).
Each mutation asserts it APPLIED before the eval runs — a first-occurrence replace that silently
no-ops reads as "the gate accepted the cheat" (measured trap; it bit twice in this very run, where
a shell/python quoting error made M3 and M5 print GREEN without ever mutating the file).

| # | Mutation | Verdict |
|---|---|---|
| M0 | unmutated baseline | **GREEN**, census as shipped |
| M1 | delete `menuView.ts`'s paired keydown listener (the real A11Y-25 defect) | **RED** `[A11Y-12] ui/menuView.ts:74 (this.#rowsEl) lost its paired keydown` |
| M2 | replace that keydown with `() => {}` (§5.4's DECLARED vacuity attack) | **RED** `[A11Y-13] no callback is INVOKED on a reachable path by both handlers (click=[…] keydown=[])` |
| M3 | add an inaccessible `<li>` click row to `shopView.ts` via `row.onclick =` — the red-team cheat that produced a BYTE-IDENTICAL census against the planned design | **RED** `[A11Y-12] UNSANCTIONED non-native click site(s): ui/shopView.ts\|row x1` |
| M4 | `title.tabIndex = 5` in `boxView.ts` (A11Y-26, property spelling) | **RED** `[A11Y-T5] ui/boxView.ts:76 tabindex 5 > 0` |
| M5 | downgrade `dialogueView.ts`'s choice producer `createElement('button')` → `('div')` — ONE token, every dialogue choice non-focusable; passed the planned design | **RED** `[A11Y-12] PRODUCER DOWNGRADED: ui/dialogueView.ts's btn (which carries [data-choice-idx])` |
| M6 | neuter the delegated A11Y-26 guard's predicate, keeping its needles as dead code | **RED** `[A11Y-T5] delegation failures: CODE-ABSENT … is not in executable source` |

Every tag bites: `[A11Y-12]` (M1, M3, M5), `[A11Y-13]` (M2), `[A11Y-T5]` (M4, M6).
