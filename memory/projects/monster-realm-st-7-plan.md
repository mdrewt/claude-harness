# st-7 plan — client shell: the live input devices get an owner

Spec: `specs/monster-realm-v2/structure.spec.md` §st-7 (type: refactor · tier: hard).
Plan file: `docs/refactors/client-shell.md` (rules 1, 2, 4, 5, 7; extraction 3).
Worktree: `projects/monster-realm/.claude/worktrees/st-7`, branch `slice/st-7`, base `c9674f5b`.
Baseline at base: `tsc --noEmit` clean; full client vitest = 242 files, 5905 tests, all passed;
`src/main.` + `src/shell/` = 34 files, 775 tests.

## Measured facts

- `client/src/main.ts` (5605 lines) declares the seven names at module scope:
  `let bindings = loadBindings(browserStorage())` (393), `const held = new HeldDirections()`
  (415), `let keyboard = new KeyboardSource(bindings)` (2845), `const inputRouter = new
  InputRouter()` (2846), `const navHeldCodes = new Set<string>()` (2987), `const
  releaseAllInput` (2990), `const applyBindings` (3001).
- Writers. `bindings` and `keyboard` are assigned only inside `applyBindings`. `navHeldCodes`
  is mutated at six places: `.clear()` inside `releaseAllInput` (moves with it); `.add(e.code)`
  four times (once in `captureControlsKey`, three in `onKeyDown`: the typing commit, the
  menu or nav intercept, the world-consumed press); `.delete(e.code)` once in the keyup
  listener. Its one outside read is `navHeldCodes.has(e.code)` in `onKeyDown`'s repeat arm.
- `held` and `inputRouter` are used only through their methods (`held.clear/press/release/
  isHeld/snapshot/restore/committedActive`, `inputRouter.route/tick/resetRepeat/releaseAll`).
  Two function-local `const held` (in the zone-warp lookup and in `ratingLineFor`) shadow the
  name today and keep doing so over an import.
- The four constructors and `loadBindings(browserStorage())` are pure but for one
  `localStorage.getItem('mr.controls')` read. That key is written only by `saveBindings`, which
  only `applyBindings` calls and nothing calls at import, so reading it while `main.ts`'s
  imports evaluate (instead of at line 393) reads the same value.
- **Probe (measured, then reverted):** the move as planned below, with no test edit, gives
  `tsc --noEmit` exit 0, `biome check` exit 0, and the full client vitest 242 files / 5905 tests
  passed. No eval, script, e2e helper or config names a moved symbol or constructor
  (`grep` over `evals/`, `scripts/`, `client/e2e`, `client/test-util`, `justfile`, `.github`:
  0 hits). The only two test files that name one do so in a comment
  (`main.remap.test.ts:1618`, `main.reconnectStack.test.ts:913`). So `touches:` holds and no pin
  needs a disposition.
- Window `blur` and `visibilitychange` (the two `releaseAllInput` registrations) are covered by
  `main.input.test.ts`; the remap path by `main.remap.test.ts` and `main.controls.test.ts`.
  No moved behaviour is untested, so no characterization test is owed.

## What is built

### `client/src/shell/inputState.ts` (new)

Imports `../input/bindingStore`, `../input/bindings` (type), `../input/keyboardSource`,
`../input/router`, `../prediction/heldKeys`. No shell module, no wasm export by name.

```ts
export let bindings: Bindings;                 // = loadBindings(browserStorage()) at import
export const held: HeldDirections;             // = new HeldDirections()
export let keyboard: KeyboardSource;           // = new KeyboardSource(bindings)
export const inputRouter: InputRouter;         // = new InputRouter()
export const navHeldCodes: ReadonlySet<string>; // typed view of a module-private Set
export function noteNavHeld(code: string): void;     // the private set's add
export function releaseNavHeld(code: string): void;  // the private set's delete
export const releaseAllInput: () => void;      // body as today; clears the private set
export const applyBindings: (next: Bindings) => boolean; // body as today
```

- `releaseAllInput` and `applyBindings` keep their bodies and statement order
  (`saveBindings` → `releaseAllInput` → `bindings = next` → `keyboard = new KeyboardSource(next)`
  → return whether it saved).
- Module scope is inert (rule 5): one storage read and four constructions; no listener, no
  document write, no catalog string.
- Each moved declaration keeps the comment that describes it.

### `client/src/main.ts`

- The seven declarations and their comments leave. One import from `./shell/inputState` brings
  `applyBindings`, `bindings`, `held`, `inputRouter`, `keyboard`, `navHeldCodes`, `noteNavHeld`,
  `releaseAllInput`, `releaseNavHeld`.
- The four `navHeldCodes.add(e.code)` become `noteNavHeld(e.code)`; the keyup listener's
  `navHeldCodes.delete(e.code)` becomes `releaseNavHeld(e.code)`. Nothing else in a body changes.
- The keyup listener, the `blur` registration and the `visibilitychange` listener stay
  registered in `main.ts`, in place (rule 4, "Registration order" item 6).
- Imports that only the moved code used are dropped: `loadBindings`, `saveBindings`,
  `type Bindings`, `KeyboardSource`, `InputRouter`, `HeldDirections`.

### Docs

- `docs/refactors/client-shell.md`: extraction line 3 is deleted. The "Shared collections" row
  for `navHeldCodes` and the "Owner functions the extractions add" row for `inputState.ts`
  follow the code (the mutations are owner functions that exist).
- `ARCHITECTURE.md` §Client: one passage for `shell/inputState.ts` beside the `shell/views.ts`
  one.

## Tests (tester; the implementer never edits them)

One new file, `client/src/shell/inputState.test.ts` (sibling test of a declared code file;
`touches-delta:`). No existing test file is edited; `client/test-util/mainBootHarness.ts` is not
edited (`inputState.ts` imports no wasm export by name). `moved-tests: none`.

The red run is the seam: a real boot of `../main` on the real shell, then the same registry's
`./inputState` is read. At the base the file fails at import (`./inputState` does not exist).
Each seam test must fail against a `main.ts` that keeps a private copy of the state (an owner
module that exists but is not the one the shell drives).

## Gates

- ST7.1 CHECK: `npm --prefix client run typecheck && client/node_modules/.bin/biome check . && git diff --exit-code $(git merge-base HEAD origin/master) -- 'client/src/main.*.test.ts' client/test-util && npm --prefix client run test -- src/main. src/shell/`
- ST7.2 CHECK: `npm --prefix client run test`.
- EXPECT (both): every file and every test passed, none skipped; ST7.1 pins the exact counts.
- Full `just ci` once, after the lens batch. The `client/e2e` controls, remap, movement-input
  and d-pad specs run once locally if a local SpacetimeDB is available; otherwise they are
  listed under `not-verified:` and run in the PR's e2e job.

## Risks the lenses should attack

- A body that still reads or writes a private copy in `main.ts` (a missed site).
- Import-time order: the storage read and the constructions now run while `main.ts`'s imports
  evaluate.
- `navHeldCodes` reachable for mutation from outside the owner.
- A function-local `held` shadowing the import where the module-level one is meant.
- An import left unused, or one dropped that is still used.
- Bundle: `scripts/verify-build-hooks.mjs` reads the built bundle.

## Review adjustments (reviewer + red-team, plan phase)

- Docs, each by its text in `docs/refactors/client-shell.md`: the module-map row for
  `inputState.ts` also names the codes whose key-repeats are cancelled; the "Shared
  collections" row for `navHeldCodes` reads "nothing: `noteNavHeld`, `releaseNavHeld` and
  `releaseAllInput` are its writers"; the `inputState.ts` row leaves "Owner functions the
  extractions add" (its preamble says no function of a listed name exists yet), and the
  `views.ts` row (`mountViews`, landed in st-6) leaves with it under `boyscout-delta:`.
- Tester brief: `./inputState` is imported dynamically AFTER the boot, from the same registry,
  and `bindings` / `keyboard` are read through the namespace at each assertion (a destructured
  read is a snapshot). Listeners of earlier boots are removed between tests. `key` and `code`
  differ in the keyup that proves the release is keyed on `code`.
- No source-text scan of `main.ts` is added for the cast cheat (`navHeldCodes as Set`): a
  source read is never a criterion (`spec-driven.md` §Refactor slices), `ReadonlySet` makes the
  compiler refuse `.add`/`.delete`/`.clear`, and the spec confirms "no module outside the owner
  mutates `navHeldCodes`" in the diff at merge. A new pin on `main.ts` text would have to be
  re-pointed by extraction 17.
- Teeth are measured after the move by writing the wrong implementations (private copies in
  `main.ts`, a dropped or mis-keyed owner call, a reordered `applyBindings`, a release skipped in
  `releaseAllInput`) in a sandbox and running the new file against each.
