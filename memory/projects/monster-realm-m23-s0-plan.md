# PLAN — m23-s0: the a11y metadata substrate

Worktree: `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/m23-s0`
Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M23-accessibility.spec.md`

## 0. Verdict up front

**No HIDDEN DEPENDENCY.** S0 is fully buildable inside its declared `touches:`. It creates
forward obligations on S2/S4/S10 that are mechanically self-enforcing (they red the downstream
slice's own gate, not S0's) — listed in §9 as cross-slice contracts, not blockers.

## 1. Verified facts

| # | Claim | Verdict |
|---|---|---|
| 1 | `client/tsconfig.json:15` `"exclude": ["**/*.test.ts"]` — `just client-typecheck` (`justfile:267` -> `client/package.json:8` `tsc --noEmit`) never sees test files | CONFIRMED |
| 2 | House pattern for a COMPILE pin is an exact-shape textual pin: `client/src/main.wiring.test.ts:6042-6055` (`OVERLAY_HANDLES_DECL`), authored because red-team MEASURED that `Partial<Readonly<Record<...>>>` left `tsc --noEmit` clean and 1742 tests green | CONFIRMED |
| 3 | `OVERLAY_TIERS` at `client/src/ui/overlayRegistry.ts:76`; `OVERLAY_IDS` derived at `:100`; 16 ids; zero `import` statements in the whole file | CONFIRMED |
| 4 | `OR-MANIFEST-COMPLETE` (`client/src/ui/overlayRegistry.test.ts:182-252`) filters `f.endsWith('View.ts') && !f.endsWith('.test.ts')` at `:202` | CONFIRMED — `a11yCopy.ts` does not match; the `OVERLAY_IDS.length + 2` arithmetic at `:216` is unperturbed |
| 5 | `client/src/ui/helpModel.ts:1-6` — "typed SSOT `const` ... NOT a RON data file (YAGNI)" | CONFIRMED |
| 6 | `justfile:491` `ci: lint typecheck test eval security wasm client-typecheck client-test observability-validate` | CONFIRMED |

Blast radius (codegraph + cbm + grep union): S0 adds only NEW exports and changes no existing
signature -> production blast radius zero. Only textual pin against this file's source is
`OVERLAY_HANDLES_DECL` (`main.wiring.test.ts:6042`), which comment-strips and whitespace-squashes
before matching a single line, so appending a new table cannot perturb it.
No eval enumerates `client/src/ui/*.ts`; adding `a11yCopy.ts` is eval-inert.

## 2. The six design decisions (become ADR-0205)

### D1 — `initialFocusSelector` for overlays with no focusable descendant -> container/heading + `tabindex="-1"`, obligation DERIVED not listed

Rule: every `initialFocusSelector` is a **stable, constructor-time** `#id` or `[data-testid="..."]`
selector resolving either to a natively focusable control, or to a static element that the
shell-owning slice makes programmatically focusable with `tabindex="-1"`. (ARIA APG dialog fallback.)

Rejected "require S2 to add a real focusable": a `<button>Close</button>` added to
`#quest-log-overlay` in S2 would have no listener until S5 (`main.ts:1300-1409` owns the Escape
ladder) — S2 would ship four visible, keyboard-reachable, dead controls.

Honest deviation recorded: spec §2.1 says "MUST resolve to a **natively** focusable element".
ADR-0205 amends to "focusable, natively or via `tabindex`". The vacuity §5.5 defends against is
killed by the IDENTITY assertion `document.activeElement === root.querySelector(selector)`.

Mechanism (not a comment): S0 exports NO "these ids need tabindex" list (a second hand-kept table
beside a total one is the drift `OVERLAY_IDS` was built against, `overlayRegistry.ts:95-100`).
The obligation is derived from data S0 already ships: S2's/S10's gates resolve every
`OVERLAY_A11Y[id].initialFocusSelector` and require the target to be focusable. If S2 forgets a
`tabindex`, S2's own gate reds.

### D2 — constructed `#app` overlays + claimView -> stable constructor-time anchors

The four `#app`-mounted views build roots with bare `createElement('div')`, no id/testid on the
root (`battleView.ts:53`, `boxView.ts:32`, `raisingView.ts:49`, `evolutionView.ts:40`) — irrelevant,
§2.2 queries INSIDE the root.

Focusing a dynamically-built button is WRONG not merely fragile: `battleView.#renderSkills` does
`replaceChildren()` at `:241` and `#renderActions` at `:270` on every server tick; a focused skill
button is destroyed and focus falls to `<body>`.

Stable constructor-set testids today: `battle-swap-hint`/`pvp-status`/`outcome-text`/
`battle-continue-hint` (`battleView.ts:105,116,124,132`), `weather-banner` (`:66`),
`box-party-hint` (`boxView.ts:59`). None is a heading -> S4 adds four constructor-time
`data-testid`s. Attribute-only; no DOM-shape change (protects the three `recruit.spec.ts`
`parentElement.parentElement` chains noted at `boxView.ts:52-55`).

Three overlays get a native control preserving today's UX byte-for-byte:
`renameView` -> `#rename-input` (`index.html:53`, what `renameView.ts:102` focuses today);
`tradeProposeView` -> `#tradepropose-target` (`index.html:59`, what `tradeProposeView.ts:124`
focuses today); `claimView` -> `#claim-signin-btn` (created unconditionally, `claimView.ts:44`).

Proposed table:

| id | tier | initialFocusSelector | anchor | who makes it focusable |
|---|---|---|---|---|
| battleView | EXCLUSIVE_TOP | `[data-testid="battle-title"]` | `battleView.ts:59-62` | S4 |
| boxView | HIDE_SWITCH | `[data-testid="box-title"]` | `boxView.ts:40-43` | S4 |
| raisingView | HIDE_SWITCH | `[data-testid="raising-title"]` | `raisingView.ts:55-58` | S4 |
| evolutionView | HIDE_SWITCH | `[data-testid="evolution-title"]` | `evolutionView.ts:45-49` | S4 |
| dialogueView | GUARD_ONLY | `#dialogue-npc-name` | `index.html:12` | S2 |
| questLogView | GUARD_ONLY | `#quest-log-list` | `index.html:17` | S2 |
| healView | GUARD_ONLY | `#heal-list` | `index.html:20` | S2 |
| shopView | GUARD_ONLY | `#shop-title` | `index.html:24` | S2 |
| tradeView | GUARD_ONLY | `#trade-status` | `index.html:31` | S2 |
| pvpView | GUARD_ONLY | `#pvp-challenge-status` | `index.html:39` | S2 |
| leaderboardView | GUARD_ONLY | `#leaderboard-title` | `index.html:47` | S2 |
| renameView | GUARD_ONLY | `#rename-input` | `index.html:53` | native |
| tradeProposeView | GUARD_ONLY | `#tradepropose-target` | `index.html:59` | native |
| helpView | GUARD_ONLY | `#help-title` | `index.html:86` | S2 |
| menuView | GUARD_ONLY | `#menu-rows` | `index.html:100` | S2 with `tabindex="0"` |
| claimView | GUARD_ONLY | `#claim-signin-btn` | `claimView.ts:44` | native |

LANDMINE: `#menu-rows` must be `tabindex="0"`, never `-1`. S6 puts `role="listbox"` +
`aria-activedescendant` on it, which requires the listbox itself to hold DOM focus (so
`#menu-heading` is wrong); but `#menu-rows` carries a delegated click listener (`menuView.ts:51`)
and S10's `[A11Y-T3]` NEGATIVE_TABINDEX_INTERACTIVE fails `tabindex="-1"` on a listener-bearing
element (§5.4). `tabindex="0"` satisfies both; `[A11Y-T5]` bans only `> 0`.

### D3 — `role` -> `'dialog'` for all sixteen

`alertdialog` is for a dialog that interrupts with an urgent message; ATs announce its entire
contents on open. None of the 16 is that: the actual error surface `errorOverlayView` is
deliberately NOT an `OverlayId` (`overlayRegistry.ts:32-34`); `claimView` is a claim nudge.
Marking `battleView`/`boxView` alertdialog would make an AT read the whole screen on open.
§5.1's GOOD fixture explicitly requires the oracle to tolerate full role reuse.
The two-member union stays (§2.1 non-negotiable #2): it is what makes `role="presentation"` a
compile error, and A11Y-2's oracle is a declaration pin, which does not require a member be used.

### D4 — `t(key)` -> pure, THROWS on a miss

`export function t(key: string): string`. Throws an Error naming the missing key.
(i) reject-not-clamp / illegal-states doctrine; (ii) repo precedent — `anyVisible`'s "NO try/catch
on purpose: swallowing a throwing probe would return `false` silently, i.e. a mutual-exclusion
breach that looks like working code" (`overlayRegistry.ts:198-200`); (iii) both alternatives are
SILENT failures with user-visible cost — key-on-miss ships `a11y.overlay.boxView.title` as the
announced name; `''` ships an unlabelled dialog. Key-on-miss also makes an unwired catalog look wired.
Partial on `string`, total on the CI-guaranteed domain (A11Y-4 makes an unresolvable labelKey a CI
failure, so the throw is unreachable in shipped code — a fail-loud backstop).
Pure: no IO, no module state, no catalog mutation; returns a primitive so no defensive-copy concern.
Rejected `as const` + `keyof typeof`: `A11yMeta.labelKey` is typed `string` per §2.1 so the benefit
never reaches the table, and a literal-union key type fights M24's resolver swap (§2.8).

### D5 — the orphan direction -> prefix-scoped namespace + DERIVED set equality; NO size ceiling (load-bearing)

1. Both directions, scoped to the `a11y.overlay.` namespace, as a SET EQUALITY against a DERIVED
   expectation: `{k in keys(a11yCopy) : k.startsWith('a11y.overlay.')}` === `{'a11y.overlay.'+id+'.title' : id in OVERLAY_IDS}`.
   Stronger than "each labelKey resolves + each entry referenced": total, derived from `OVERLAY_IDS`
   (a 17th overlay drags it automatically), and a stowaway `a11y.overlay.ghostView.title` cannot survive.
2. Plus the literal §5.1 `[A11Y-04]` pair.
3. NO check that the catalog contains only `a11y.overlay.*` keys, and NO size ceiling — that is
   exactly the false blocker: S1 lands `a11y.world.region` (§2.3) the moment it starts.

Why this loses nothing today: S0's catalog contains ZERO non-`a11y.overlay.*` keys, so the scoped
check and a global check are identical in effect right now. Proven by bite-proof M4c (adding
`a11y.world.region` must stay GREEN) — the executable proof that S1 will not have to weaken an S0 gate.

Convention (ADR-0205): a catalog namespace is orphan-checked by the slice that owns its consumer.
`a11y.overlay.*` -> S0 via `OVERLAY_A11Y`; `a11y.world.*`/`a11y.announce.*` -> S1.
Global invariants S0 enforces on EVERY key regardless of namespace: key matches the shape regex,
value non-empty after trim, no `{`/`}` in key OR value (§2.8 bans ICU syntax in the copy = the value).

Key-shape spec conflict resolved: §2.8 gives `a11y.overlay.boxView.title` (capital V) but §5.1
`[A11Y-02]`'s regex `/^a11y\.[a-z0-9.]+$/` REJECTS it. Decision: keep the id verbatim
(`a11y.overlay.<OverlayId>.title`) and use `/^a11y\.[a-zA-Z0-9.]+$/`. The id-verbatim key is
derivable from `OverlayId` with zero mapping table — that derivability is the whole anti-drift point
of D5(1); a kebab-case mapping reintroduces a hand-kept id<->key correspondence.

### D6 — `OVERLAY_A11Y` belongs in `overlayRegistry.ts`. CONFIRMED.

Module purity rule (`overlayRegistry.ts:4-8`): "No DOM, no SDK, no import from main.ts, no view
handles, no thunks — every export here is a data table, a total pure function, or ... the TYPE of
the caller-supplied probe table". A CSS selector string and an ARIA role name are strings in a data
table — none of the four banned things. Module still has ZERO imports, calls no `document`, stays
node-testable with zero mocks. `A11yMeta` is the exact analogue of `OverlayProbes`/`OverlayHandles`.
Hard constraint: the new table must contain no thunks and no functions.

`dismissible`: all sixteen `true` (Escape closes every one today, `main.ts:1300-1409`). Anti-vacuity
carried by bite-proof M5c (flipping a HIDE_SWITCH id to false must stay GREEN), proving the check
reads `OVERLAY_TIERS` rather than demanding "all true".

## 3. Affected files (exhaustive)

In scope, will change:
- `client/src/ui/overlayRegistry.ts` — MODIFY: +A11yMeta, +OVERLAY_A11Y, 1-line header note, 3 boyscout comment fixes. ~+70 lines.
- `client/src/ui/a11yCopy.ts` — NEW.
- `client/src/ui/overlayRegistry.test.ts` — MODIFY: new BLOCK for A11Y-1/2/3/5; add `readFileSync` to the `node:fs` import at `:63`.
- `client/src/ui/a11yCopy.test.ts` — NEW.
- `docs/adr/0205-<slug>.md` — NEW.
- `ARCHITECTURE.md` — MODIFY: one appended 4-6 line section, matching the `## M-postgate-ux-design` idiom at `:1437`.

MECHANICALLY REQUIRED, outside the declared list — flagged:
- `docs/adr/DIGEST.md` — regenerated by `just adr-digest` (`justfile:323`); `just ci` runs
  `evals/adr-digest.eval.mjs` which reds on a stale digest.

Verified unaffected: `client/vite.config.ts`, `evals/*`, `client/src/main.ts`,
`client/src/main.wiring.test.ts`, `client/src/ui/menuModel.ts`, `client/index.html`, every `*View.ts`,
`CHANGELOG.md`, `docs/adr/README.md`.

## 4. Boy Scout — `overlayRegistry.ts` only

Three comment-only hunks, 3 changed lines, zero symbol renames. The file says FIFTEEN in three
places but the manifest has SIXTEEN (`claimView` joined in M21b-2/ADR-0182 D17;
`main.wiring.test.ts:6021` asserts `OVERLAY_IDS.length === 16`):
`:1` "the pure modality core for the 15 mutual-exclusion overlays"; `:32` "The 15 mutual-exclusion
overlays."; `:207` "while all fifteen view bindings are still `undefined`".
Load-bearing for THIS slice: S0 adds a sixteen-entry table directly beside a comment claiming fifteen.
Safety checked: `OVERLAY_HANDLES_DECL` applies `stripLineComments` BEFORE matching (`:6049`) —
comment edits are invisible to it. Repo-wide grep finds no assertion on this file's prose.
Out of scope, follow-up flag only: `client/src/main.ts:390` carries the same stale "15".

## 5. The S10 tension — RESOLVED in favour of co-locating A11Y-3/4/5 in S0

1. The vitest spec is a strictly STRONGER oracle: A11Y-3/4/5 are properties of evaluated values in
   two importable pure data modules; the eval must re-parse TypeScript with regexes, and this repo
   has a documented burn list for exactly that (recruit-*-security evals' naive block-comment regex;
   parseTableSchemas fixture-vacuity traps; `dom-shell-coverage-exclusion.eval.mjs:76-82`).
2. Spec §4: "A slice that defers its own co-located tests to S10 is mis-scoped, not efficient."
3. Cost of not doing it: A11Y-3/4/5 ungated for the whole S0->S10 window (nine slices).
4. S10's eval is NOT redundant — residual named so S10 does not delete the specs as duplicates:
   (a) `[A11Y-01]` parses the `OverlayId` union TEXTUALLY (defence in depth vs the declaration pin);
   (b) `[A11Y-15]` scans every `*View.ts` for a literal `.focus(` — impossible before S3/S4;
   (c) it runs under `just eval`, a different `ci:` step from `client-test`.
5. S0 does NOT create `evals/overlay-a11y-manifest.eval.mjs`. That stays S10's.

## 6. Acceptance-ledger gates — m23-s0-X1..X5 (1:1 with A11Y-1..A11Y-5)

PFX = `PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"`

| gate | CHECK | EXPECT |
|---|---|---|
| X1 (A11Y-1) | `just client-typecheck` + `npx vitest run --reporter=verbose src/ui/overlayRegistry.test.ts -t "OR-A11Y-TOTALITY-DECL"` | verbose pass line for that test |
| X2 (A11Y-2) | same shape, `-t "OR-A11Y-ROLE-CLOSED-UNION"` | ditto |
| X3 (A11Y-3) | `npx vitest run --reporter=verbose src/ui/overlayRegistry.test.ts -t "OR-A11Y-LABELKEY-SHAPE"` | ditto |
| X4 (A11Y-4) | `npx vitest run --reporter=verbose src/ui/a11yCopy.test.ts -t "A11YCOPY-OVERLAY-NAMESPACE-EXACT"` | ditto |
| X5 (A11Y-5) | `npx vitest run --reporter=verbose src/ui/overlayRegistry.test.ts -t "OR-A11Y-DISMISSIBLE-VS-TIER"` | ditto |

Notes: `just client-typecheck` passing is NECESSARY not SUFFICIENT for X1/X2 — it proves the tree
compiles, never that omission WOULD fail. The teeth are the declaration pins + mutations M1a/M2a.
MEASURE the exact reporter string once. Fallback EXPECT regex: `/Tests +1 passed/` (a failure prints
`Tests  1 failed | N passed`; a `-t` filter matching nothing prints `skipped`). Do NOT use exit code
alone. Each gate must be exactly ONE `it()`.

## 7. Proof-of-teeth / mutation list

Commit the gates FIRST, then mutate, then `git checkout -- <the one mutated file>` — never a
directory-wide revert.

X1: M1a add `| 'settingsView'` to `OverlayId` + its `OVERLAY_TIERS` entry, omit the `OVERLAY_A11Y`
entry -> `just client-typecheck` MUST red. M1b rewrite decl to `Readonly<Partial<Record<...>>>` ->
typecheck GREEN (the measured attack class) -> pin MUST red. M1c `Readonly<Record<string, A11yMeta>>`
-> typecheck green -> pin MUST red. M1d delete the `helpView` entry -> typecheck reds AND the runtime
both-directions assertion reds. M1e point the test's `readFileSync` at a nonexistent path -> the
anti-vacuity guard MUST red, not silently pass.

X2: M2a one entry `role: 'presentation'` -> typecheck MUST red. M2b widen field to
`readonly role: string;` -> typecheck green -> pin MUST red. M2c widen to
`'dialog' | 'alertdialog' | 'presentation'` -> pin MUST red (exact-shape, not substring).
M2d M2b PLUS a value `'presentation'` -> the runtime role allow-list assertion MUST red.

X3: M3a `labelKey = ''` red. M3b `'   '` red (trim). M3c duplicate key onto two ids red.
M3d `'a11y.count.{n}'` red (brace ban). M3e `'A11Y.Overlay.shopView.title'` red (regex).
M3f MUST STAY GREEN: rename every key consistently to `a11y.overlay.<id>.label` in both files ->
green, proving the gate tests shape+correspondence, not a hardcoded 16-string list.

X4: M4a delete `a11y.overlay.helpView.title` -> red (missing direction). M4b add
`a11y.overlay.ghostView.title` -> red (orphan direction). M4c MUST STAY GREEN: add
`a11y.world.region` -> green (the D5 proof, most important assertion in the slice).
M4d value `''` red. M4e value `'Box {count}'` red (ICU ban on values).

X5: M5a `helpView.dismissible = false` (GUARD_ONLY) red. M5b `battleView.dismissible = false`
(EXCLUSIVE_TOP) red. M5c MUST STAY GREEN: `boxView.dismissible = false` (HIDE_SWITCH, unconstrained
by §2.1 rule 3) -> green, proving the check consults `OVERLAY_TIERS`.

t(): M6a returns key on miss -> miss test MUST red. M6b returns `''` -> MUST red.
M6c mutates/caches into the catalog -> purity test MUST red.

## 8. Tasks

T1 ADR `docs/adr/0205-<slug>.md` capturing D1..D6, the two spec amendments, the alertdialog-unused
rationale, the namespace-ownership convention. Canonical header per AGENTS.md/ADR-0104. APPEND
citations, never insert lines into an existing ADR.
T2 `client/src/ui/a11yCopy.ts` (helpModel.ts:1-16 header voice) + 16 entries + `t`.
T3 `A11yMeta` + `OVERLAY_A11Y` in `overlayRegistry.ts` immediately after `OVERLAY_TIERS`/`OVERLAY_IDS`.
Zero imports, zero thunks. One header line about strings-as-data.
T4 Boy-scout: the three 15->16 comment fixes.
T5 `client/src/ui/a11yCopy.test.ts` — X4 + global key/value invariants + `t()` hit/miss/purity.
Anti-vacuity FIRST: `OVERLAY_IDS.length === 16` and `Object.keys(a11yCopy).length >= 16`.
T6 `client/src/ui/overlayRegistry.test.ts` — new BLOCK with X1/X2/X3/X5's four named `it()`s; add
`readFileSync` to the `node:fs` import at `:63`; resolve the source path via
`fileURLToPath(import.meta.url)` (`__dirname` is undefined, note at `:197-198`).
T7 `ARCHITECTURE.md` 4-6 line append.
T8 `just adr-digest` -> commit regenerated `docs/adr/DIGEST.md`.
T9 Run §7 mutations; then full `just ci`.

RED-first note: `OVERLAY_A11Y` does not exist when T5/T6 are authored. A static named-import of a
missing export can red MODULE RESOLUTION and take the whole 1078-line spec file down at collection
(hazard documented at `main.wiring.test.ts:4193-4195`). Use `import * as registry` + assert on
`registry.OVERLAY_A11Y`, or a dynamic `await import()`, to confine the RED to one `it()`.
For pure data tables the MUTATION BITE-PROOFS are the binding evidence of teeth, not the RED ceremony.

## 9. Cross-slice contracts S0 creates (write into ADR-0205)

1. S2 must add `tabindex="-1"` to the 10 static-shell selector targets, and `tabindex="0"` (NOT -1)
   to `#menu-rows` — the `[A11Y-T3]` landmine.
2. S4 must add four constructor-time `data-testid`s (`battle-title`, `box-title`, `raising-title`,
   `evolution-title`) + `tabindex="-1"`. Attribute-only.
3. S10's `overlayA11yWiring.test.ts` must accept `tabindex="-1"/"0"` targets, not only a native-tag
   allow-list; anti-vacuity is the IDENTITY assertion.
4. S10's `[A11Y-02]` regex is `/^a11y\.[a-zA-Z0-9.]+$/`; `[A11Y-04]`'s orphan direction is scoped to
   the `a11y.overlay.` prefix. Copying §5.1 verbatim reds on S1's own keys.
5. S1 must call `t()` where a throw surfaces loudly (open time), and owns orphan-checking
   `a11y.world.*` / `a11y.announce.*`.
6. S3 deletes `renameView.ts:102` and `tradeProposeView.ts:124`; S0's selectors for those two
   preserve today's focus target byte-for-byte.

## 10. Risks

R1 `--reporter=verbose` EXPECT string is vitest-version-specific -> measure once, fallback regex.
R2 `#menu-rows` shipped `tabindex="-1"` -> S6/[A11Y-T3] red -> ADR note.
R3 S10 copies §5.1's lowercase regex -> reds on 16 valid keys -> ADR note.
R4 S10's tag allow-list reds 13/16 ids -> ADR amendment.
R5 A11Y-4 written globally -> S1 forced to weaken an S0 gate -> D5 + executable bite-proof M4c.
R6 New ADR's file:line citations trip `evals/adr-backlink-integrity.eval.mjs` -> run evals, append-only.
R7 Forgetting `just adr-digest` -> CI red on stale DIGEST -> T8; digest gate is header-only so a BODY
edit after regen is invisible — regen LAST.
R8 Someone adds a thunk/import to `overlayRegistry.ts` -> ADR D6 + header line + a zero-import
assertion in T6.

## 11. What S0 explicitly does NOT do

No `overlayA11y.ts`/`focusTrap.ts`/`liveRegion.ts`/`announcements.ts`/`openOverlayA11y`/
`closeOverlayA11y`/`nextFocusTarget`/`announcementsFor` (S1). No `client/index.html`, no
`styles.css`, no `.sr-only`, no `#a11y-live` (S2). No `*View.ts` edit, no `.focus()` deletion, no
`role`/`aria-modal` ever written to the DOM (S3/S4). No `main.ts`, no `worldHasFocus()`, no
`role="application"` (S5). No menuView listbox (S6). No reduced motion (S7). No colour/contrast
(S8/S9). No `evals/*.eval.mjs` created or edited, `evals/run.mjs` untouched (S10/S11). No justfile
recipe, no nightly workflow (S11). No A11Y-6..A11Y-36. No settings store. No 17th OverlayId.
No CHANGELOG.md hand-edit, no `docs/adr/README.md` edit, no `main.ts:390` comment fix.

## 12. Anti-patterns, named

1. `@ts-expect-error` fixtures for A11Y-1/2 — `client/tsconfig.json:15` excludes `**/*.test.ts`; the
   fixture is never typechecked and the gate is vacuous.
2. A `Partial<>` / index-signature / optional-key spelling of `OVERLAY_A11Y` — MEASURED on the
   sibling type to leave `tsc --noEmit` clean and 1742 tests green while erasing totality.
3. `t()` returning the key (or `''`) on a miss — makes an unwired catalog look wired.
4. A global "every copy entry must be referenced by a labelKey" check — a false blocker the instant
   S1 adds `a11y.world.region`.
5. A hand-maintained exported list of "ids needing tabindex" — the drift `OVERLAY_IDS` prevents.
6. Bare-tag or structural selectors (`button`, `div:first-child`, `:nth-child`) — they point at
   nodes `replaceChildren()` destroys every server tick (`battleView.ts:241`, `:270`).
7. Any `import`, `document`, or thunk inside `overlayRegistry.ts`.
8. Touching `client/index.html`, `main.ts`, `styles.css`, or any `*View.ts`.
9. Hand-editing `CHANGELOG.md` (git-cliff generated) or `docs/adr/README.md`.
10. Inserting lines into an existing ADR — breaks inbound `ADR-NNNN:<line>` citations. Append only.
11. Committing the ADR without regenerating `DIGEST.md`.
12. `git checkout -- <dir>` during the mutation loop — wipes uncommitted gate work.
13. A buried `cd` leaking into a later bare `git commit`.
