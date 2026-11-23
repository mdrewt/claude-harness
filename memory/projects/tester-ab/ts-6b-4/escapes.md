# Shadow tests failing after the lens fixes: ts-6b-4

Each is a test written blind from this slice's criteria that fails against the current tree. Rule on each: a real defect in the implementation is fixed through the normal lens-fix path; a wrong test needs no action.

For each one that is a real defect: fix the defect. Add at most ONE test for it, the smallest that catches it, and prefer extending an existing test to writing a new one; add none if the gating tests already catch it after the fix. Put the trailer `AB-Adopt: <its id>` (the `k...` heading in the file) on the fix commit.

## kdd77d57043

```
describe('tactics rules port: binding and the plain exports (BT11.7)', () => {
  it('BT11-7-RULES-BIND: the real pkg is fresh and binds every method; a missing export throws naming it; out-of-range primitives throw RangeError before wasm; wasm errors are rethrown by identity; forecast resolves the kit skill', () => {
    // WRONG IMPL KILLED: a stale pkg (built before the sources — A15); a bind that defers the check
    // to the first call (or names every export, or none); `typeof` not checked (a non-function
    // value accepted); a primitive clamped or wrapped (`x >>> 0`, `x & 0xffff`, Math.trunc) instead
    // of refused; an in-range boundary refused; a wasm error wrapped, retried or swallowed; a
    // forecast that sends a default skill or calls wasm for a skill outside the kit; disengage's
    // `start` defaulted to a tile. Round 2: any ONE of the 15 integer parameters (bt-11 round 3:
    // +recruitTargets' unit) left unguarded
    // (2**32 + 1 wraps to 1 — mutants h1*); a skill resolved from the TARGET's kit (h2c); any ONE
    // method that wraps, defaults or converts a thrown wasm value — e.g. `plan` returning
    // `{Err: e}` (h3*).
    const built = statSync(path.join(ROOT, 'client-wasm/pkg/client_wasm_bg.wasm')).mtimeMs;
    const newestSrc = Math.max(
      newestMtime(path.join(ROOT, 'client-wasm/src')),
      newestMtime(path.join(ROOT, 'game-core/src')),
    );
    expect(
      built >= newestSrc,
      'client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`',
    ).toBe(true);

    const r = rules();
    for (const [, method] of EXPORT_METHODS) {
      expect(typeof r[method], `rules.${method} is bound`).toBe('function');
    }

    const names = EXPORT_METHODS.map(([name]) => name as string);
    for (const missing of names) {
      const rest = Object.fromEntries(Object.entries(realPkg()).filter(([k]) => k !== missing));
      let message = '';
      try {
        bindTacticsRules(rest as unknown as TacticsWasmExports);
      } catch (err) {
        message = err instanceof Error ? err.message : String(err);
      }
      expect(message, `binding without ${missing} throws naming it`).toContain(missing);
      expect(
        names.filter((n) => message.includes(n)),
        `the ${missing} error names only that export`,
      ).toEqual([missing]);
    }
    let notFn = '';
    try {
      bindTacticsRules({ ...realPkg(), tactics_plan: 42 } as unknown as TacticsWasmExports);
    } catch (err) {
      notFn = err instanceof Error ? err.message : String(err);
    }
    expect(notFn, 'a non-function export is refused by name').toContain('tactics_plan');

    const { pkg: spy, calls } = fakePkg();
    const port = bindTacticsRules(spy);
    const blank = board(1, []);
    const outOfRange: readonly (readonly [string, () => unknown])[] = [
      ['map(-1)', () => port.map(-1)],
      ['map(2**32)', () => port.map(2 ** 32)],
      ['map(1.5)', () => port.map(1.5)],
      ['map(NaN)', () => port.map(Number.NaN)],
      ['isExhausted(1.5, 3)', () => port.isExhausted(1.5, 3)],
      ['isExhausted(65536, 1)', () => port.isExhausted(65_536, 1)],
      ['isExhausted(1, -1)', () => port.isExhausted(1, -1)],
      ['recruitOdds(70000, 1, 0)', () => port.recruitOdds(70_000, 1, 0)],
      ['recruitOdds(1, 1, 65536)', () => port.recruitOdds(1, 1, 65_536)],
      ['path(mover -1)', () => port.path(blank, -1, c(0, 0))],
      ['path(mover 2**32)', () => port.path(blank, 2 ** 32, c(0, 0))],
      ['targets(skill 2**32)', () => port.targets(blank, 1, 2 ** 32, c(0, 0))],
      ['flank(target -5)', () => port.flank(blank, 1, -5)],
      ['aiPlan(unit 1.25)', () => port.aiPlan(blank, 1.25)],
      ['disengage(mover 2**32 + 1)', () => port.disengage(blank, 2 ** 32 + 1)],
    ];
    for (const [label, call] of outOfRange) {
      let caught: unknown;
      try {
        call();
      } catch (err) {
        caught = err;
      }
      expect(caught instanceof RangeError, `${label}: a RangeError`).toBe(true);
    }
    expect(calls, 'no out-of-range argument reached wasm').toEqual([]);
```

Failure output:

```
client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`: expected false to be true // Object.is equality

AssertionError: client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ src/tactics/wasm.test.ts:686:7
```

## k99ec20a270

```
describe('tactics rules port: binding and the plain exports (BT11.7)', () => {
  it('BT11-7-RULES-BIND: the real pkg is fresh and binds every method; a missing export throws naming it; out-of-range primitives throw RangeError before wasm; wasm errors are rethrown by identity; forecast resolves the kit skill', () => {
    // WRONG IMPL KILLED: a stale pkg (built before the sources — A15); a bind that defers the check
    // to the first call (or names every export, or none); `typeof` not checked (a non-function
    // value accepted); a primitive clamped or wrapped (`x >>> 0`, `x & 0xffff`, Math.trunc) instead
    // of refused; an in-range boundary refused; a wasm error wrapped, retried or swallowed; a
    // forecast that sends a default skill or calls wasm for a skill outside the kit; disengage's
    // `start` defaulted to a tile. Round 2: any ONE of the 15 integer parameters (bt-11 round 3:
    // +recruitTargets' unit) left unguarded
    // (2**32 + 1 wraps to 1 — mutants h1*); a skill resolved from the TARGET's kit (h2c); any ONE
    // method that wraps, defaults or converts a thrown wasm value — e.g. `plan` returning
    // `{Err: e}` (h3*).
    const built = statSync(path.join(ROOT, 'client-wasm/pkg/client_wasm_bg.wasm')).mtimeMs;
    const newestSrc = Math.max(
      newestMtime(path.join(ROOT, 'client-wasm/src')),
      newestMtime(path.join(ROOT, 'game-core/src')),
    );
    expect(
      built >= newestSrc,
      'client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`',
    ).toBe(true);

    const r = rules();
    for (const [, method] of EXPORT_METHODS) {
      expect(typeof r[method], `rules.${method} is bound`).toBe('function');
    }

    const names = EXPORT_METHODS.map(([name]) => name as string);
    for (const missing of names) {
      const rest = Object.fromEntries(Object.entries(realPkg()).filter(([k]) => k !== missing));
      let message = '';
      try {
        bindTacticsRules(rest as unknown as TacticsWasmExports);
      } catch (err) {
        message = err instanceof Error ? err.message : String(err);
      }
      expect(message, `binding without ${missing} throws naming it`).toContain(missing);
      expect(
        names.filter((n) => message.includes(n)),
        `the ${missing} error names only that export`,
      ).toEqual([missing]);
    }
    let notFn = '';
    try {
      bindTacticsRules({ ...realPkg(), tactics_plan: 42 } as unknown as TacticsWasmExports);
    } catch (err) {
      notFn = err instanceof Error ? err.message : String(err);
    }
    expect(notFn, 'a non-function export is refused by name').toContain('tactics_plan');

    const { pkg: spy, calls } = fakePkg();
    const port = bindTacticsRules(spy);
    const blank = board(1, []);
    const outOfRange: readonly (readonly [string, () => unknown])[] = [
      ['map(-1)', () => port.map(-1)],
      ['map(2**32)', () => port.map(2 ** 32)],
      ['map(1.5)', () => port.map(1.5)],
      ['map(NaN)', () => port.map(Number.NaN)],
      ['isExhausted(1.5, 3)', () => port.isExhausted(1.5, 3)],
      ['isExhausted(65536, 1)', () => port.isExhausted(65_536, 1)],
      ['isExhausted(1, -1)', () => port.isExhausted(1, -1)],
      ['recruitOdds(70000, 1, 0)', () => port.recruitOdds(70_000, 1, 0)],
      ['recruitOdds(1, 1, 65536)', () => port.recruitOdds(1, 1, 65_536)],
      ['path(mover -1)', () => port.path(blank, -1, c(0, 0))],
      ['path(mover 2**32)', () => port.path(blank, 2 ** 32, c(0, 0))],
      ['targets(skill 2**32)', () => port.targets(blank, 1, 2 ** 32, c(0, 0))],
      ['flank(target -5)', () => port.flank(blank, 1, -5)],
      ['aiPlan(unit 1.25)', () => port.aiPlan(blank, 1.25)],
      ['disengage(mover 2**32 + 1)', () => port.disengage(blank, 2 ** 32 + 1)],
    ];
    for (const [label, call] of outOfRange) {
      let caught: unknown;
      try {
        call();
      } catch (err) {
        caught = err;
      }
      expect(caught instanceof RangeError, `${label}: a RangeError`).toBe(true);
    }
    expect(calls, 'no out-of-range argument reached wasm').toEqual([]);
```

Failure output:

```
client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`: expected false to be true // Object.is equality

AssertionError: client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ src/tactics/wasm.test.ts:687:7
```

## k2a2a2d0f80

```
describe('tactics rules port: binding and the plain exports (BT11.7)', () => {
  it('BT11-7-RULES-BIND: the real pkg is fresh and binds every method; a missing export throws naming it; out-of-range primitives throw RangeError before wasm; wasm errors are rethrown by identity; forecast resolves the kit skill', () => {
    // WRONG IMPL KILLED: a stale pkg (built before the sources — A15); a bind that defers the check
    // to the first call (or names every export, or none); `typeof` not checked (a non-function
    // value accepted); a primitive clamped or wrapped (`x >>> 0`, `x & 0xffff`, Math.trunc) instead
    // of refused; an in-range boundary refused; a wasm error wrapped, retried or swallowed; a
    // forecast that sends a default skill or calls wasm for a skill outside the kit; disengage's
    // `start` defaulted to a tile. Round 2: any ONE of the 15 integer parameters (bt-11 round 3:
    // +recruitTargets' unit) left unguarded
    // (2**32 + 1 wraps to 1 — mutants h1*); a skill resolved from the TARGET's kit (h2c); any ONE
    // method that wraps, defaults or converts a thrown wasm value — e.g. `plan` returning
    // `{Err: e}` (h3*).
    const built = statSync(path.join(ROOT, 'client-wasm/pkg/client_wasm_bg.wasm')).mtimeMs;
    const newestSrc = Math.max(
      newestMtime(path.join(ROOT, 'client-wasm/src')),
      newestMtime(path.join(ROOT, 'game-core/src')),
    );
    expect(
      built >= newestSrc,
      'client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`',
    ).toBe(true);

    const r = rules();
    for (const [, method] of EXPORT_METHODS) {
      expect(typeof r[method], `rules.${method} is bound`).toBe('function');
    }

    const names = EXPORT_METHODS.map(([name]) => name as string);
    for (const missing of names) {
      const rest = Object.fromEntries(Object.entries(realPkg()).filter(([k]) => k !== missing));
      let message = '';
      try {
        bindTacticsRules(rest as unknown as TacticsWasmExports);
      } catch (err) {
        message = err instanceof Error ? err.message : String(err);
      }
      expect(message, `binding without ${missing} throws naming it`).toContain(missing);
      expect(
        names.filter((n) => message.includes(n)),
        `the ${missing} error names only that export`,
      ).toEqual([missing]);
    }
    let notFn = '';
    try {
      bindTacticsRules({ ...realPkg(), tactics_plan: 42 } as unknown as TacticsWasmExports);
    } catch (err) {
      notFn = err instanceof Error ? err.message : String(err);
    }
    expect(notFn, 'a non-function export is refused by name').toContain('tactics_plan');

    const { pkg: spy, calls } = fakePkg();
    const port = bindTacticsRules(spy);
    const blank = board(1, []);
    const outOfRange: readonly (readonly [string, () => unknown])[] = [
      ['map(-1)', () => port.map(-1)],
      ['map(2**32)', () => port.map(2 ** 32)],
      ['map(1.5)', () => port.map(1.5)],
      ['map(NaN)', () => port.map(Number.NaN)],
      ['isExhausted(1.5, 3)', () => port.isExhausted(1.5, 3)],
      ['isExhausted(65536, 1)', () => port.isExhausted(65_536, 1)],
      ['isExhausted(1, -1)', () => port.isExhausted(1, -1)],
      ['recruitOdds(70000, 1, 0)', () => port.recruitOdds(70_000, 1, 0)],
      ['recruitOdds(1, 1, 65536)', () => port.recruitOdds(1, 1, 65_536)],
      ['path(mover -1)', () => port.path(blank, -1, c(0, 0))],
      ['path(mover 2**32)', () => port.path(blank, 2 ** 32, c(0, 0))],
      ['targets(skill 2**32)', () => port.targets(blank, 1, 2 ** 32, c(0, 0))],
      ['flank(target -5)', () => port.flank(blank, 1, -5)],
      ['aiPlan(unit 1.25)', () => port.aiPlan(blank, 1.25)],
      ['disengage(mover 2**32 + 1)', () => port.disengage(blank, 2 ** 32 + 1)],
    ];
    for (const [label, call] of outOfRange) {
      let caught: unknown;
      try {
        call();
      } catch (err) {
        caught = err;
      }
      expect(caught instanceof RangeError, `${label}: a RangeError`).toBe(true);
    }
    expect(calls, 'no out-of-range argument reached wasm').toEqual([]);
```

Failure output:

```
client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`: expected false to be true // Object.is equality

AssertionError: client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ src/tactics/wasm.test.ts:686:7
```

## ka8d85e9073

```
describe('tactics rules port: binding and the plain exports (BT11.7)', () => {
  it('BT11-7-RULES-BIND: the real pkg is fresh and binds every method; a missing export throws naming it; out-of-range primitives throw RangeError before wasm; wasm errors are rethrown by identity; forecast resolves the kit skill', () => {
    // WRONG IMPL KILLED: a stale pkg (built before the sources — A15); a bind that defers the check
    // to the first call (or names every export, or none); `typeof` not checked (a non-function
    // value accepted); a primitive clamped or wrapped (`x >>> 0`, `x & 0xffff`, Math.trunc) instead
    // of refused; an in-range boundary refused; a wasm error wrapped, retried or swallowed; a
    // forecast that sends a default skill or calls wasm for a skill outside the kit; disengage's
    // `start` defaulted to a tile. Round 2: any ONE of the 15 integer parameters (bt-11 round 3:
    // +recruitTargets' unit) left unguarded
    // (2**32 + 1 wraps to 1 — mutants h1*); a skill resolved from the TARGET's kit (h2c); any ONE
    // method that wraps, defaults or converts a thrown wasm value — e.g. `plan` returning
    // `{Err: e}` (h3*).
    const built = statSync(path.join(ROOT, 'client-wasm/pkg/client_wasm_bg.wasm')).mtimeMs;
    const newestSrc = Math.max(
      newestMtime(path.join(ROOT, 'client-wasm/src')),
      newestMtime(path.join(ROOT, 'game-core/src')),
    );
    expect(
      built >= newestSrc,
      'client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`',
    ).toBe(true);

    const r = rules();
    for (const [, method] of EXPORT_METHODS) {
      expect(typeof r[method], `rules.${method} is bound`).toBe('function');
    }

    const names = EXPORT_METHODS.map(([name]) => name as string);
    for (const missing of names) {
      const rest = Object.fromEntries(Object.entries(realPkg()).filter(([k]) => k !== missing));
      let message = '';
      try {
        bindTacticsRules(rest as unknown as TacticsWasmExports);
      } catch (err) {
        message = err instanceof Error ? err.message : String(err);
      }
      expect(message, `binding without ${missing} throws naming it`).toContain(missing);
      expect(
        names.filter((n) => message.includes(n)),
        `the ${missing} error names only that export`,
      ).toEqual([missing]);
    }
    let notFn = '';
    try {
      bindTacticsRules({ ...realPkg(), tactics_plan: 42 } as unknown as TacticsWasmExports);
    } catch (err) {
      notFn = err instanceof Error ? err.message : String(err);
    }
    expect(notFn, 'a non-function export is refused by name').toContain('tactics_plan');

    const { pkg: spy, calls } = fakePkg();
    const port = bindTacticsRules(spy);
    const blank = board(1, []);
    const outOfRange: readonly (readonly [string, () => unknown])[] = [
      ['map(-1)', () => port.map(-1)],
      ['map(2**32)', () => port.map(2 ** 32)],
      ['map(1.5)', () => port.map(1.5)],
      ['map(NaN)', () => port.map(Number.NaN)],
      ['isExhausted(1.5, 3)', () => port.isExhausted(1.5, 3)],
      ['isExhausted(65536, 1)', () => port.isExhausted(65_536, 1)],
      ['isExhausted(1, -1)', () => port.isExhausted(1, -1)],
      ['recruitOdds(70000, 1, 0)', () => port.recruitOdds(70_000, 1, 0)],
      ['recruitOdds(1, 1, 65536)', () => port.recruitOdds(1, 1, 65_536)],
      ['path(mover -1)', () => port.path(blank, -1, c(0, 0))],
      ['path(mover 2**32)', () => port.path(blank, 2 ** 32, c(0, 0))],
      ['targets(skill 2**32)', () => port.targets(blank, 1, 2 ** 32, c(0, 0))],
      ['flank(target -5)', () => port.flank(blank, 1, -5)],
      ['aiPlan(unit 1.25)', () => port.aiPlan(blank, 1.25)],
      ['disengage(mover 2**32 + 1)', () => port.disengage(blank, 2 ** 32 + 1)],
    ];
    for (const [label, call] of outOfRange) {
      let caught: unknown;
      try {
        call();
      } catch (err) {
        caught = err;
      }
      expect(caught instanceof RangeError, `${label}: a RangeError`).toBe(true);
    }
    expect(calls, 'no out-of-range argument reached wasm').toEqual([]);
```

Failure output:

```
client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`: expected false to be true // Object.is equality

AssertionError: client-wasm/pkg is older than client-wasm/src or game-core/src — run `just wasm`: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ src/tactics/wasm.test.ts:686:7
```
