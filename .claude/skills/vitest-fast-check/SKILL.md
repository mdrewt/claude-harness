---
name: vitest-fast-check
description: Writing reliable vitest + fast-check tests in the harness node/TS stacks (node-ts-app, react-web, pixijs-game, spacetimedb-game clients). Use when a property test fails spuriously, the runner picks up the wrong specs, or you want a fast node-only suite over injected fakes.
---

# vitest + fast-check — reliable property tests

The node stacks test with **vitest** + **fast-check** (property tests for logic-heavy code, per `standards/testing-tdd.md`). A few footguns cost real debugging time — front-load them.

## The expression-body footgun (the big one)

Inside `fc.property(arb, predicate)`, fast-check reads the predicate's RETURN as the verdict: `false` fails, `true`/`undefined` passes. A vitest `expect(...).toEqual(...)` as an **expression-body arrow** returns a value fast-check reads as failure — so a *correct* property "fails after 1 test, returning false" on the simplest input.

```ts
// WRONG — fails spuriously ("Property failed by returning false")
fc.assert(fc.property(arb, (x) => expect(f(x)).toEqual(g(x))));

// RIGHT — block body; the assertion THROWS on failure, returns nothing on success
fc.assert(fc.property(arb, (x) => {
  expect(f(x)).toEqual(g(x));
}));
```

Rule: **assertions inside `fc.property` are statements in a block body.** (Or return an explicit boolean and skip `expect` — but never mix the two.)

## Scope the runner away from e2e

vitest's default include grabs every `*.test.ts`/`*.spec.ts` — including a Playwright `e2e/` folder, which throws `Playwright Test did not expect test() to be called here`. Pin it (and import `defineConfig` from `vitest/config`, or `test` isn't typed):

```ts
// vite.config.ts (vitest reads it)
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
```

## Keep suites node-only: inject, don't import the world

Make the unit a function of its dependencies (an injected `applyMove`, clock, RNG) so the test passes a deterministic fake — no wasm build, no DB, no `performance.now`. The real dependency is proven by its own gate (a parity eval, the Rust suite). This is what lets the `tester` and the implementer be different authors and keeps `just client-test` fast.

## Determinism & reading failures

Seed RNG, inject clocks; never read a wall clock in a test. fast-check shrinks to the minimal counterexample — read the `Counterexample: [...]` line; it is the smallest failing input and usually points straight at the bug.

## Gotchas

_symptom/quirk → cause → **avoid:** action._

- **"Property failed by returning false" on the simplest input** → an expression-body `=> expect(...)` arrow in `fc.property`. **Avoid:** block-body `{ expect(...); }`.
- **"Playwright Test did not expect test() to be called here"** → vitest ran an e2e spec. **Avoid:** `test.include: ['src/**/*.test.ts']`.
- **`test` not typed on the vite config** → imported `defineConfig` from `'vite'`. **Avoid:** import it from `'vitest/config'`.
- **A property "passes" but tests nothing** → predicate returns `undefined` with no `expect` inside. **Avoid:** assert concrete values; prefer block-body assertions.
