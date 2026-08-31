# rb-20 — plan (residual R-m23-s11-X11): browser-tier reduced-motion oracle

Branch `fix/rb-20-reduced-motion-browser-tier`, worktree
`.claude/worktrees/rb-20`, from `origin/master@3b2bcb2`. ADR **0219**
(supervisor-assigned).

## 0. The load-bearing discovery (made BEFORE planning, changes the slice's shape)

**A11Y-27's renderer arm is not wired in production.** Measured on `3b2bcb2`:

- `client/src/render/motionPreference.ts` exports `motionPreferenceFromWindow()`
  and declares an explicit cross-slice contract in its own header:
  "S7 → S5 CROSS-SLICE CONTRACT: S7 ships this module UNCONSUMED. S5 (the sole
  main.ts slice) wires it at the existing render-loop call site."
- That wiring **never landed**. `grep -rn 'motionPreference|reduceMotion'
  client/src --include=*.ts` excluding tests returns hits in exactly two files:
  `render/motionPreference.ts` (the definition) and `render/renderResolver.ts`
  (the consumer field). **Zero** production importers.
- `client/src/main.ts:2807` calls `resolver.resolve({ characters, ownEntityId,
  predicted, snapped, now, currentZoneId })` — **no `reduceMotion` key**, so
  `renderResolver.ts:83`'s `reduceMotion = false` default applies on every frame
  of the shipped client.

So the renderer half of A11Y-27 is dead code in production, and **no browser
oracle can turn it green** — the fix is a `main.ts` edit, and `main.ts` is
outside this slice's declared `touches:`. Per the hidden-dependency rule that is
a STOP for *that work*, not for this slice: the slice's deliverable is the
oracle + the Playwright-project infrastructure, which does not require `main.ts`.

**Consequence for the plan:** ship the browser tier over the arm that IS
end-to-end reachable (the stylesheet arm), and `DEFER` the renderer arm to
`backlog` with this measurement as the evidence, so the supervisor materialises
it into a real spec section instead of it living in prose.

## 1. What IS end-to-end provable in a real browser today

`client/src/styles.css:94-99`:

```css
.hp-fill { transition: width 0.3s; }
@media (prefers-reduced-motion: reduce) { .hp-fill { transition: none; } }
```

Loaded by `<link rel="stylesheet" href="/src/styles.css">` in
`client/index.html:12` — **not** an `import` from a `.ts`. That matters twice:

1. It applies on a bare `page.goto('/')` with **no SpacetimeDB connection, no
   player join, no RNG** — the cheapest possible browser oracle.
2. It is the one reduced-motion behaviour whose entire mechanism lives in the
   browser's media-query engine, which is exactly what happy-dom cannot model
   and exactly what the residual says is unproven.

`evals/reduced-motion-hp-bar.eval.mjs` already gates this rule's TEXT (order,
spelling, no custom property, no inline animation in `battleView.ts`). What no
gate does is prove Chromium **evaluates** it — that the media query actually
flips the computed style. That is this slice's claim.

## 2. Design

### 2.1 `client/playwright.config.ts` — add `projects:`

```ts
projects: [
  { name: 'default',        testIgnore: RM_SPEC },
  { name: 'reduced-motion', testMatch: RM_SPEC, use: { reducedMotion: 'reduce' } },
]
```

- Top-level `use: { baseURL, headless }` merges into both (Playwright merges
  project `use` over config `use`); `webServer`, `globalSetup`, `workers: 1`,
  `timeout`, `forbidOnly` stay config-level and unchanged.
- `testIgnore` on `default` is **mandatory, not hygiene**: without it the new
  spec is collected by the default project too, runs with no emulation, and its
  first assertion (`matches === true`) fails. This is the one way this change can
  red every PR.

### 2.2 THE DELIBERATE DECISION the launch prompt demands (a11y.spec.ts collection)

`testDir: './e2e'` means a naively-declared reduced-motion project would collect
**every** e2e spec, including rb-19's `a11y.spec.ts`. Decision: **`testMatch`
scoped to the single new file** — strictly narrower than the `testIgnore`
alternative and it cannot silently widen when a spec file is added. So
`a11y.spec.ts` does **not** run under reduced motion. Reasons, in order of
weight:

1. **Shared-world safety.** `a11y.spec.ts`'s own header: "exactly one context,
   closed in afterAll … a leaked context here reds a DIFFERENT spec file"
   (`golden.spec.ts` asserts `presenceCount === 2`), and "Adding a second
   context here would break that and must not be done without renaming the
   file." A second project collecting it *is* a second context, by another name.
2. **It would prove nothing.** The axe tag list is
   `wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa`. No rule in that set has an outcome
   that depends on `prefers-reduced-motion` — WCAG's motion criterion (SC 2.3.3
   Animation from Interactions) is **Level AAA** and is deliberately outside the
   §5.6 conformance claim. A second scan would re-derive the identical verdict.
3. **Cost and blast radius.** It doubles the axe tier's wall clock and its
   `passes`/`incomplete` bookkeeping (three measured floors, three measured
   ceilings) for zero new signal, and would silently break half 3's
   `s.expected < axefloor` arithmetic by doubling the reported test count.

Recorded as ADR-0219 D2 and as a comment at `a11y.spec.ts`'s own site.

### 2.3 `client/e2e/reduced-motion.spec.ts` — the oracle

No SpacetimeDB dependency, no `__game()` wait, no RNG. Four teeth:

- **T1 (the claim).** With NO `emulateMedia` call anywhere before it:
  `matchMedia('(prefers-reduced-motion: reduce)').matches === true`. This can
  only be true because of the *project config* — it is the end-to-end proof the
  residual asks for, and it is the assertion that dies if someone deletes
  `use: { reducedMotion: 'reduce' }`.
- **T2 (the behaviour).** Inject a probe `<div class="hp-fill">`, read
  `getComputedStyle(...).transitionDuration` → `'0s'`.
- **T3 (non-vacuity / the stylesheet really loaded).** Same page, flip to
  `emulateMedia({ reducedMotion: 'no-preference' })`: `matches === false` **and**
  the same probe now reports `'0.3s'`. This is the mirror image that kills the
  three impls T2 alone cannot distinguish: a stylesheet that never loaded, a
  `transition: none` written unconditionally, and a probe element that never
  entered the document.
- **T4 (the query literal, in the browser).** Assert the browser *recognises*
  the query — a typo'd media query (`(prefers-reduced-motion)`, the shape
  `motionPreference.test.ts:174` warns about) parses as valid-but-different, so
  assert the exact `REDUCED_MOTION_QUERY` string round-trips through
  `matchMedia().media`.

Run in its own `browser.newContext()` closed in `afterAll`, matching
`a11y.spec.ts`'s hygiene, and joining **no** player.

### 2.4 `justfile` — half 4 of `a11y-e2e`

Mirrors half 3 exactly: `rm -f` the stale report, run
`npx playwright test --project=reduced-motion --reporter=json` with
`PLAYWRIGHT_JSON_OUTPUT_NAME`, then a `node -e` that reads `stats` and fails on
`unexpected/flaky/skipped !== 0` or `expected < rmfloor`. New recipe parameter
`rmfloor="4"`, guarded by the same `case` non-negative-integer check as the other
two floors (ADR-0183 D7 / the `Number('') === 0` vacuity).

`--project=reduced-motion` is load-bearing: without it the recipe would also run
every other e2e spec.

### 2.5 `evals/ci-gate-wiring.eval.mjs`

- `A11Y_E2E_RECIPE_REGION` is a **byte-exact** pin of the recipe; it must be
  regenerated from the edited justfile or `just ci` reds. Regenerate
  mechanically (read the file, re-emit the constant), never by hand.
- Add wiring teeth for the new tier — the recipe body names
  `--project=reduced-motion` and `e2e/reduced-motion.spec.ts` exists; and a
  config-side tooth that `playwright.config.ts` declares a project named
  `reduced-motion` with `reducedMotion: 'reduce'` **and** that the default
  project ignores the spec (the PR-reddening failure mode in §2.1).
- Each new tooth ships an inline proof-of-teeth fixture, matching the file's
  existing convention.

### 2.6 `.github/workflows/nightly.yml`

**Likely NO edit needed** — half 4 lives inside `just a11y-e2e`, which the
`a11y-e2e:` job already invokes with a browser, a server and chromium installed.
Confirm and say so explicitly rather than editing for symmetry (a new job key
would mechanically force a policy-doc row; see the harness memory note).

## 3. Anti-patterns to avoid (named, per build-loop step 2)

- **Vacuous green.** `stats.expected` on a missing/renamed spec file is `0` with
  exit 0 — floor must come from the JSON report, never console text, and the
  floor parameter must be `case`-guarded (`Number('') === 0`).
- **A one-polarity oracle.** `transitionDuration === '0s'` is also what "no
  stylesheet" reports. T3 is not optional.
- **Emulating in-test instead of in-config.** `page.emulateMedia({reducedMotion:
  'reduce'})` inside T1 would make the test pass with the project config
  deleted — it would gate nothing. T1 must run before any `emulateMedia` call.
- **Widening by accident.** `testMatch` on the new project, not `testIgnore`;
  and `testIgnore` on the default project so the pair is closed both ways.
- **Claiming the renderer arm.** Every test name and the ADR must say the tier
  covers the **stylesheet** arm of A11Y-27. Naming it "A11Y-27, gated" while
  `main.ts` passes no `reduceMotion` would be a false green of exactly the kind
  this slice exists to prevent.

## 4. Ledger

Seeded with 0 criteria (`Seed: e3b0c442…` = empty). Gates authored in the plan
phase from the residual's own text; the renderer arm is the DEFER.

## 5. Order of work

1. plan + ADR-0219 + ledger → `wip:` commit + push.
2. plan review fan-out (reviewer ‖ red-team ‖ /simplify).
3. `tester` writes `reduced-motion.spec.ts` + the eval teeth, RED.
4. implement config + justfile + eval region regen, green.
5. `just ci` once; `mr-gates check`.
6. impl review fan-out + `verifier`; `doc-keeper`.
7. PR, stop.

---

## 6. PLAN-REVIEW OUTCOME (reviewer ‖ red-team ‖ /simplify — before any test was written)

All three lenses independently re-verified §0's measurement and confirmed it. Five
findings changed the build; the ADR, the ledger and §2 above are already updated.

1. **CRITICAL (red-team, re-verified directly).** `use: { reducedMotion: 'reduce' }`
   — the spelling the residual asks for — **does not exist** in this repo's pinned
   `@playwright/test` 1.61.1. `node_modules/playwright/types/test.d.ts` contains
   the string `reducedMotion` exactly once, inside `contextOptions`' doc comment.
   Writing it fails `client-typecheck` with TS2769 and is a runtime no-op even if
   forced past the type system. Correct spelling:
   `use: { contextOptions: { reducedMotion: 'reduce' } }`. ADR-0219 D5 records
   this *and* the trap it sets: an implementer hitting TS2769 is steered straight
   into the named anti-pattern (`page.emulateMedia` in a `beforeEach`), which
   compiles, passes, and gates nothing.
2. **BLOCKER (reviewer + /simplify, independently).** `client/package.json`'s
   `e2e` script is a bare `playwright test` with no `--project`, and ci.yml's
   per-PR `e2e:` job runs `just e2e` — so the new project runs on **every PR**,
   not nightly-only as §2.4 assumed. **Accepted and recorded** (ADR-0219 D6)
   rather than suppressed: same double life `a11y.spec.ts` already documents, ~2 s,
   no server dependency. Half 4's marginal contribution is therefore the floor
   plus the nightly artifact — stated plainly so nobody reads "nightly-only" off
   the recipe and is wrong.
3. **BLOCKER (reviewer).** `nightly.yml`'s failure-evidence artifact `path:` list
   is hardcoded to halves 2 and 3's reports. Half 4 needs its own report path
   (`/tmp/a11y-e2e-rm.json` — reusing half 3's would clobber it) added there, or a
   red in the new tier ships with zero diagnostics. Now part of RM-4. §2.6's "no
   nightly.yml edit needed" was right about the job step and wrong about this.
4. **HIGH (red-team).** Every ledger EXPECT used unbounded `\d+` for its counts,
   so `defaultFiles=0` and `mutants=0 caught=0/0 survived=0` both matched — the
   precise vacuity RM-2's own prose warns about, reproduced in the gate meant to
   catch it. All counts now pinned literally.
5. **/simplify + red-team, converging.** The oracle drops from 4 tests to **2**,
   over the built-in `page` fixture rather than a shared `browser.newContext()`:
   - T4 (the `matchMedia().media` round-trip) **cut** — it gated
     `REDUCED_MOTION_QUERY`, a constant on the DEFERRED renderer arm, already
     triple-pinned; the typo'd-`@media`-prelude case it aimed at is caught by the
     two-polarity pair anyway (a typo'd prelude yields `0.3s` in both polarities).
   - T1 merged into T2 — one body, so "no `emulateMedia` before the positive
     assertion" is a within-body sequence instead of a declaration-order accident.
   - The `page` fixture is what actually applies project `use` options, and it
     gives each test a fresh context. MEASURED on the rejected shared-context
     shape: `emulateMedia` leaks into every later test in the file — a live trap
     for the RM-7 follow-up, which the DEFER line points at this same file.
   - `rb-20.recipe-proof.mjs` **cut**; its assertions fold into
     `rb-20.bite-proof.mjs`'s healthy-tree baseline. Three proof scripts, not four.

Also recorded, not acted on:

- **/simplify's strongest structural suggestion** — give the new project its own
  `testDir` so double-collection is impossible rather than merely excluded — is
  **right on merit and rejected on scope**: it needs a directory outside the
  declared `touches:`. ADR-0219 D2 records it as the shape a later slice should
  move to.
- **Red-team finding 6**: half 3's rationale "a MISSING spec file reports zero
  tests and exits 0" is **stale for 1.61.1** — measured, a missing file / empty
  file / unknown `--project` all exit 1 with `No tests found`. The shape that
  really is a silent zero is a wholly `describe.skip`'d file, caught by the
  `s.skipped !== 0` clause. Half 4 states this accurately instead of inheriting
  the false comment. (Correcting half 3's own comment is out of scope — it is
  inside the byte-pinned region and its guard is correct regardless.)
- **Red-team finding 8**: the byte-exact `A11Y_E2E_RECIPE_REGION` cannot catch an
  edit-and-regenerate, which is the prescribed edit procedure. RM-5's bite-proof
  therefore regenerates the pin for every recipe mutant and requires rejection to
  come from a substring/structural tooth with its own hard-coded expectations.
