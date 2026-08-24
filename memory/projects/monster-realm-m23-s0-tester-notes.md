# m23-s0 tester handoff notes

Files staged in `/tmp/m23-s0-tests/`:
- `overlayRegistry.test.append.ts` — block to APPEND to the end of
  `client/src/ui/overlayRegistry.test.ts` (after its current final line, 1078).
- `a11yCopy.test.ts` — complete new file for `client/src/ui/a11yCopy.test.ts`.
- `NOTES.md` — this file.

## 1. Import-splice instructions (orchestrator action required)

`overlayRegistry.test.append.ts` does **not** contain any `import` statements of its own — it
relies entirely on names already present, or to-be-added, in the existing top-of-file import
block at `client/src/ui/overlayRegistry.test.ts:63-82`. Do the following two edits to that block
**before** appending the new content:

**(a) Extend the existing `node:fs` import** (currently line 63: `import { readdirSync } from
'node:fs';`) to also pull in `readFileSync`, `existsSync`, `mkdtempSync`, `writeFileSync`, and
`rmSync`:

```ts
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
```

**(b) Add two brand-new import lines** (place them next to the other `node:*` imports, e.g.
directly after the `node:fs` line above and before `import path from 'node:path';`):

```ts
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
```

**Do NOT** touch the `./overlayRegistry` import statement (currently lines 68-81) — per the
task's explicit instruction, `OVERLAY_A11Y` and `A11yMeta` are deliberately **not** added there.
Every new test reaches them via a dynamic `await import('./overlayRegistry')` inside the test
body instead, so a still-missing export cannot take the pre-existing 18 tests down with it.

After the splice, append the full contents of `overlayRegistry.test.append.ts` verbatim to the
end of `client/src/ui/overlayRegistry.test.ts` (after its current line 1078). Nothing in the
appended block edits any existing line.

`a11yCopy.test.ts` is copied byte-for-byte to `client/src/ui/a11yCopy.test.ts` — it is a new file
with its own self-contained import block, nothing to splice.

## 2. Expected RED evidence before implementation

**`overlayRegistry.test.ts` (post-splice-and-append), the 5 new tests:**

- `OR-A11Y-TOTALITY-COMPILE` — fails on `expect(mustCompile.ok, ...).toBe(true)` (or earlier, on
  `expect(overlayA11y, ...).toBeDefined()` if the compile step somehow doesn't reach that far):
  `tsc` on the "must compile" probe reds with `error TS2305: Module '".../overlayRegistry"' has no
  exported member 'OVERLAY_A11Y'` (and `'A11yMeta'`), because neither symbol exists yet. The
  runtime `OVERLAY_A11Y must be exported` assertion is a second, cheaper way the same test reds.
- `OR-A11Y-ROLE-CLOSED-UNION-COMPILE` — same shape: `tsc` reds both probes with
  `TS2305: has no exported member 'A11yMeta'` before ever reaching the role-union polarity logic.
- `OR-A11Y-LABELKEY-SHAPE` — reds immediately on `expect(overlayA11y, 'OVERLAY_A11Y must be
  exported...').toBeDefined()` (dynamic import resolves `OVERLAY_A11Y` to `undefined`).
- `OR-A11Y-DISMISSIBLE-VS-TIER` — same: reds on the `OVERLAY_A11Y must be exported` assertion.
- `OR-A11Y-PURE-DATA-TABLE` (ungated, BLOCK 9) — reds the same way once it reaches the dynamic
  import; the static source-scan assertions above it (zero-imports, no `document`/`window`) will
  currently PASS on their own (today's `overlayRegistry.ts` already satisfies them), which is
  fine and expected — the test as a whole is still RED because of the later `OVERLAY_A11Y`
  assertions.

All five new tests are additive; the pre-existing 18 (`numTotal 18 failed 0 pending 0 passed 18`
per the ledger's own baseline note) are untouched and must stay green throughout, because none of
the new tests touches the static `./overlayRegistry` import list.

**`a11yCopy.test.ts` (brand new file), all 7 tests:**

The static `import { a11yCopy, t } from './a11yCopy';` cannot resolve — `client/src/ui/a11yCopy.ts`
does not exist on disk at all yet. Expect a **collection-time failure for the whole file**
(vitest reports it as a suite-level error, e.g. "Failed to resolve import './a11yCopy' from
"client/src/ui/a11yCopy.test.ts"", 0 passed / all tests in the file marked failed or the whole
file marked as a failed suite depending on the JSON reporter's shape for a resolution error).
This is the expected, desired RED start: `numFailedTests` for this file will be nonzero (or the
whole file will show as a top-level failure), and none of the 7 `it()`s should show `status:
'passed'`.

Once `a11yCopy.ts` exists but is incomplete (e.g. `t()` doesn't throw, or the catalog is
incomplete), expect the file to collect successfully and individual tests to fail with their
specific messages instead — that is the useful RED for the implementer once the file exists.

## 3. Assertions deliberately NOT written, and why

- **No global "the catalog contains ONLY `a11y.overlay.*` keys" check, and no size ceiling** in
  `A11YCOPY-OVERLAY-NAMESPACE-EXACT` — explicit per ADR-0205 D5: S1 lands `a11y.world.region` and
  a global check would force S1 to weaken this S0 gate. Documented inline in the test itself.
- **No `a11y.world.*` / `a11y.announce.*` orphan-checking** — that is S1's job (ADR-0205 D5's "a
  namespace is orphan-checked by the slice that owns its consumer" convention), not S0's.
- **No assertion that the type is not `Partial<>`-loosened via a `@ts-expect-error` directive** —
  it's unusable here (`client/tsconfig.json:15` excludes `**/*.test.ts`, and it's recorded as not
  this repo's house style at `overlayRegistry.test.ts:1046`). That guarantee is instead carried
  entirely by the negative-compile probes (`OR-A11Y-TOTALITY-COMPILE` /
  `OR-A11Y-ROLE-CLOSED-UNION-COMPILE`), which is the whole point of ADR-0205 D6.
- **No assertion on the literal string values of `initialFocusSelector`** (e.g. pinning
  `[data-testid="battle-title"]` for `battleView`) — ADR-0205 D2's table is the authority for
  those 16 strings, but S0's gates (A11Y-1..A11Y-5 / X1..X5) do not require pinning the selector
  VALUES, only that every id has one (covered by `OR-A11Y-TOTALITY-COMPILE`'s totality check and
  `OR-A11Y-PURE-DATA-TABLE`'s type check). Pinning the 16 selector strings belongs to S2/S4's own
  consumer-side tests (`evals/a11y-static-shell.eval.mjs`, `overlayA11yWiring.test.ts`), which read
  them back against the real DOM — a value pin here would be a second hand-kept copy of D2's
  table with no consumer to catch drift.
- **No test that `t()`'s error is a specific Error subclass** beyond `instanceof Error` — the spec
  and ADR only require a throw naming the key, not a particular error class; over-pinning the
  class would make a legitimate refactor (e.g. a custom `MissingA11yKeyError`) fail this suite for
  no functional reason.
- **No `a11y.world.region`-added "must stay GREEN" bite-proof written as an executable test** —
  ADR-0205 D5 names this as the way the scoping claim is proven, but the task's five-test contract
  didn't ask for it as a sixth gated test, and adding it would mean mutating `a11yCopy` at test
  time to simulate a key that doesn't exist until S1. I judged it out of scope for a RED-authoring
  pass whose job is failing tests against S0's own contract, not proving S1 compatibility ahead of
  S1 landing; the reviewer/verifier can add it later without touching this file's gated names.

## 4. Mutations each test kills

**`OR-A11Y-TOTALITY-COMPILE`**
- `OVERLAY_A11Y: Readonly<Partial<Record<OverlayId, A11yMeta>>>` (optional-key spelling) — the
  MUST-COMPILE probe reds (`Partial<>` value not assignable to the total mapped type).
- `OVERLAY_A11Y: Readonly<Record<string, A11yMeta>>` (string-keyed widening) — the MUST-NOT-COMPILE
  probe silently compiles instead of reding; caught by `.toBe(false)` failing.
- A broken/no-op `tsc` spawn (wrong path, wrong cwd, tsc missing) — caught by the CONTROL probe
  compiling when it must not.
- A genuinely total, correctly-keyed `OVERLAY_A11Y` missing one entry at the OBJECT-LITERAL level
  despite a correct TYPE annotation (e.g. `as Record<OverlayId, A11yMeta>` cast papering over a
  15-entry literal) — caught by the runtime `Object.keys(...).length === 16` / missing/stowaway
  set-equality check, independent of the type-level probes (this is D6's documented honest limit:
  the type probes alone cannot catch this).

**`OR-A11Y-ROLE-CLOSED-UNION-COMPILE`**
- `role: string` on `A11yMeta` — the MUST-NOT-COMPILE `'presentation'` probe silently compiles.
- A third union member added (e.g. `'presentation'` folded INTO the union) — same probe catches it.
- `role` narrowed to a single literal (e.g. accidentally typed as `role: 'dialog'` with no union at
  all, perhaps via a bad refactor) — the MUST-COMPILE probe assigning `'alertdialog'` reds.
- Broken tsc spawn — caught by this test's own independent CONTROL probe (each gated test is
  self-sufficient by design).

**`OR-A11Y-LABELKEY-SHAPE`**
- Any `labelKey: ''` — non-empty-after-trim check reds.
- Two ids sharing one `labelKey` (copy-paste clone) — the `seenTrimmed` ownership check reds,
  naming both ids.
- `labelKey` containing `{`/`}` (an ICU placeholder smuggled in) — the brace checks red.
- `labelKey` missing the `a11y.` prefix, or with an empty segment (`a11y..title`) — the shape
  regex check reds.
- A `labelKey` differing only by leading/trailing whitespace from another id's (e.g.
  `'a11y.overlay.boxView.title '`) — caught because uniqueness is compared on the TRIMMED value,
  while the non-empty check is ALSO on the trimmed value, so a whitespace-only key cannot sneak
  past as "non-empty."
- A "fixed" shape regex that reverts to the spec's own broken `/^a11y\.[a-z0-9.]+$/` — the
  self-test assertions (`'a11y..'` must reject, `'a11y.overlay.boxView.title'` must accept) red
  immediately, independent of any real `OVERLAY_A11Y` data.

**`OR-A11Y-DISMISSIBLE-VS-TIER`**
- Any `EXCLUSIVE_TOP`/`GUARD_ONLY` id with `dismissible: false` (e.g. `helpView`) — reds on that
  id's `.toBe(true)` check, tier named in the message.
- A hardcoded 13-id "dismissible must be true" list instead of reading `OVERLAY_TIERS[id]` — this
  test's own loop reads `OVERLAY_TIERS[id]` fresh every iteration, so it is not itself vulnerable
  to that bug; it is the SPEC of the correct behaviour, not an implementation the mutation could
  hide inside. A retiering of `shopView` from `GUARD_ONLY` to `HIDE_SWITCH` (with `dismissible`
  left `false`) moves that id from the "must be true" branch to the "must be a boolean" branch —
  the constrained/unconstrained counts (13/3) then drift and the exact-count assertions catch it.
- `dismissible` typed/valued as something other than a real boolean (e.g. `'true'` the string, or
  left `undefined`) on a HIDE_SWITCH id — the `typeof dismissible === 'boolean'` check reds.

**`OR-A11Y-PURE-DATA-TABLE`**
- Any `import` statement added to `overlayRegistry.ts` (even a type-only one) — the
  `/^\s*import\s/m` scan reds.
- A `document`/`window` reference introduced — the substring checks red.
- Any `A11yMeta` field holding a function/thunk (e.g. a lazy `initialFocusSelector: () => '...'`)
  — the per-field `typeof value === 'string' || typeof value === 'boolean'` check reds, and the
  `fieldsChecked === 64` anti-vacuity count also catches a table with fewer than 4 real fields per
  id (e.g. a field silently dropped).

**`A11YCOPY-OVERLAY-NAMESPACE-EXACT`**
- A missing catalog entry for some overlay id — `missingFromCatalog` reds, naming the derived key.
- A stowaway `a11y.overlay.*` catalog entry with no owning id (e.g. leftover from a deleted
  overlay, or a typo'd id like `a11y.overlay.boxviewX.title`) — `stowawayInCatalog` reds.
- **The headline case**: `OVERLAY_A11Y.helpView.labelKey = 'a11y.overlay.helpView.titel'` (typo)
  while the catalog still separately holds BOTH `a11y.overlay.helpView.title` (correct, but now
  unreferenced — a stowaway) AND nothing at `...titel` (so `t()` would throw at runtime) — the
  set-equality checks alone cannot see this if by coincidence the two directions still balance
  (e.g. if the catalog ALSO happens to be missing `...title`, canceling the counts); the
  per-id `meta?.labelKey` equality assertion inside the SAME test catches the typo directly,
  independent of what the catalog's key set looks like.
- A catalog entry that resolves but is empty/whitespace-only — the trim-length check reds.

**`A11YCOPY-VALUES-ICU-FREE`**
- Any catalog value containing `{`/`}` (ICU syntax smuggled into the copy, not just the key) —
  reds, naming the offending key/value pair.
- An empty or whitespace-only value on ANY key (not just `a11y.overlay.*`) — reds.

**`A11YCOPY-KEYS-SHAPE`**
- Any catalog key (in any namespace) failing the segment-shaped regex (e.g. a stray
  `a11y..typo` key) — reds, naming the key.

**`A11YCOPY-T-RESOLVES`**
- `t()` returning a different string than the catalog holds for a present key (e.g. a resolver
  that strips/transforms the value, or reads from a stale copy) — reds via `.toBe(first)`-style
  exact equality against the live `a11yCopy[key]`.

**`A11YCOPY-T-THROWS-ON-MISS`**
- `t = (key) => a11yCopy[key] ?? key` (echoes the key back) — the `.toThrow()` assertion reds
  (no throw occurs at all).
- `t = (key) => a11yCopy[key] ?? ''` (silently returns empty string) — same, `.toThrow()` reds.
- `t` throws but with a generic message (`'not found'`) that doesn't name the key — the
  `message.includes(missingKey)` check reds.

**`A11YCOPY-T-IS-PURE`**
- A `t()` that memoizes misses by writing them into `a11yCopy` (e.g. a lazy-fill cache) — the
  post-miss key-count / `hasOwnProperty` checks red.
- A `t()` returning a fresh object/string each call in a way that breaks `===` stability for a hit
  (unlikely for a string return, but guards against an unintended wrapper) — the `second === first`
  (via `.toBe`) check reds.

**`A11YCOPY-T-IGNORES-PROTOTYPE-CHAIN`**
- `t` implemented as `if (key in a11yCopy) return a11yCopy[key]; throw ...` (the classic `in`-vs-
  `hasOwnProperty`/`Object.hasOwn` trap) — `t('toString')` would return the inherited
  `Object.prototype.toString` FUNCTION instead of throwing; the `.toThrow()` assertion over
  `['toString', 'constructor', 'hasOwnProperty', 'valueOf']` reds on whichever of the four the
  implementation's lookup happens to resolve.

## Assumptions / things the orchestrator or verifier should double-check

- I could not execute `tsc`/`vitest` myself to empirically confirm the probe-runner mechanism or
  the exact RED output shape — the tester role's Bash access is restricted to static,
  non-executing checks by `.claude/hooks/guard-tester-bash.mjs`, which blocked even a plain
  `ls`/`grep` in this worktree. The `tsc --noEmit --strict --target ES2022 --module ESNext
  --moduleResolution bundler --skipLibCheck <probe.ts>` invocation, the ~0.6s-per-probe timing,
  and the exact `error TS2322` shape are all taken verbatim from the task brief's stated
  measurements (and from ADR-0205 D6 / the ledger's own CHECK text, which independently corroborate
  the same mechanism). The verifier should run the appended file once for real and confirm: (a)
  the CONTROL probe genuinely reds under this repo's installed `client/node_modules/.bin/tsc`, and
  (b) the two compile tests complete well within their 30s `it()` timeout.
- `client/node_modules` must be installed (`just client-setup`) before these tests can even
  attempt to spawn `tsc` — if it is not, `OR-A11Y-TOTALITY-COMPILE` and
  `OR-A11Y-ROLE-CLOSED-UNION-COMPILE` red immediately on the `existsSync(A11Y_TSC_BIN)`
  anti-vacuity assertion rather than silently skipping, per the task's explicit requirement.
