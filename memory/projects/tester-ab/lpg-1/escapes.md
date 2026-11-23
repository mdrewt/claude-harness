# Shadow tests failing after the lens fixes: lpg-1

Each is a test written blind from this slice's criteria that fails against the current tree. Rule on each: a real defect in the implementation is fixed through the normal lens-fix path; a wrong test needs no action.

For each one that is a real defect: fix the defect. Add at most ONE test for it, the smallest that catches it, and prefer extending an existing test to writing a new one; add none if the gating tests already catch it after the fix. Put the trailer `AB-Adopt: <its id>` (the `k...` heading in the file) on the fix commit.

## k2e30e1f99a

```
  // criterion: lpg-1.8
  it('reads and writes the first-run nudge mark and clears the claim code under the keys derived from the document`s pair', async () => {
    const nudgeA = nudgeKeyOf(URI, DB);
    const codeA = claimCodeStorageKey(URI, DB);
    await boot();
    const calls = spyStorage();

    driveTargetKeyedPaths();

    const seen = calls();
    expect(seen, 'the nudge mark is read under target A').toContainEqual({
      op: 'getItem',
      key: nudgeA,
    });
    expect(seen, 'the nudge mark is written under target A').toContainEqual({
      op: 'setItem',
      key: nudgeA,
    });
    expect(seen, 'the claim code is cleared under target A').toContainEqual({
      op: 'removeItem',
      key: codeA,
    });
    expect(globalThis.sessionStorage.getItem(nudgeA), 'the mark is stored for A').toBe('1');
    const claimKeys = seen.filter((c) => c.key.startsWith('mr.claimCode.v1|'));
    expect(
      claimKeys.filter((c) => c.key !== nudgeA && c.key !== codeA),
      'no claim-code key of any other target is touched',
    ).toEqual([]);
  });
```

Failure output:

```
the nudge mark is read under target A: expected [] to deep equally contain { op: 'getItem', …(1) }

AssertionError: the nudge mark is read under target A: expected [] to deep equally contain { op: 'getItem', …(1) }

- Expected:
{
  "key": "mr.claimCode.v1|nudge|wss%3A%2F%2Ftarget-a.example%3A4431%2F|realm-alpha",
  "op": "getItem",
}

+ Received:
[]

 ❯ src/main.claimCode.test.ts:503:59
```

## kf650b91c3c

```
  // criterion: lpg-1.5
  it('round-trips every accepted document: exact script text, no less-than or raw separators, same resolved target', () => {
    fc.assert(
      fc.property(acceptedDocArb, (doc) => {
        expectRoundTrip(doc);
      }),
      { numRuns: 300 },
    );
  });
```

Failure output:

```
Property failed after 26 tests { seed: -853495459, path: "25:0:2:2:2:2:2:2", endOnFailure: true } Counterexample: [{"connection":{"uri":"ws://127.0.0.1:3000/./","db":"a"}}] Shrunk 7 time(s)  Hint: Enable verbose mode in order to have the list of all failing values encountered during the run

Error: Property failed after 26 tests
{ seed: -853495459, path: "25:0:2:2:2:2:2:2", endOnFailure: true }
Counterexample: [{"connection":{"uri":"ws://127.0.0.1:3000/./","db":"a"}}]
Shrunk 7 time(s)

Hint: Enable verbose mode in order to have the list of all failing values encountered during the run
 ❯ buildError node_modules/fast-check/lib/fast-check.js:2469:16
 ❯ throwIfFailed node_modules/fast-check/lib/fast-check.js:2476:8
 ❯ reportRunDetails node_modules/fast-check/lib/fast-check.js:2492:14
 ❯ Proxy.assert node_modules/fast-check/lib/fast-check.js:2662:7
 ❯ src/net/shellDocument.test.ts:249:8

Caused by: AssertionError: the document is accepted: expected [Function] to not throw an error but 'Error: shell document: connection.uri…' was thrown

- Expected:
undefined

+ Received:
"Error: shell document: connection.uri must be an absolute ws: or wss: URL with no userinfo, query, fragment or whitespace; a path, if it has one, must end in \"/\" and hold no \".\" or \"..\" segment"

 ❯ expectRoundTrip src/net/shellDocument.test.ts:62:84
 ❯ src/net/shellDocument.test.ts:251:9
 ❯ Property.predicate node_modules/fast-check/lib/fast-check.js:1355:99
 ❯ Property.run node_modules/fast-check/lib/fast-check.js:1324:24
 ❯ propertyExecution node_modules/fast-check/lib/fast-check.js:2549:23
 ❯ run node_modules/fast-check/lib/fast-check.js:2639:91
 ❯ runIt node_modules/fast-check/lib/fast-check.js:2542:15
```

## k4e9d5b3d17

```
  // criterion: lpg-1.8
  it('booted again under a second document, connects to it and reads or writes no key of the first target', async () => {
    const nudgeA = nudgeKeyOf(URI, DB);
    const codeA = claimCodeStorageKey(URI, DB);
    const { uri: uriB, db: dbB } = DOC_B.connection;
    const nudgeB = nudgeKeyOf(uriB, dbB);
    const codeB = claimCodeStorageKey(uriB, dbB);

    // First boot, under A: A's claim code and nudge mark are stored.
    await boot();
    driveTargetKeyedPaths();
    seed();
    claimCode.markFirstRunNudgeSeen(globalThis, URI, DB);
    expect(globalThis.sessionStorage.getItem(codeA), 'fixture: A`s code is stored').toBe(
      SEEDED_CODE,
    );
    expect(globalThis.sessionStorage.getItem(nudgeA), 'fixture: A`s mark is stored').toBe('1');
    teardownBoot();
    vi.restoreAllMocks();

    // Second boot, under B, with every storage call observed.
    setShellDocument(DOC_B);
    const calls = spyStorage();
    await boot();
    expect({ uri: opts.uri, db: opts.db }, 'connect() receives B`s pair').toEqual({
      uri: uriB,
      db: dbB,
    });
    driveTargetKeyedPaths();

    const seen = calls();
    expect(seen, 'control: the nudge mark is read under B').toContainEqual({
      op: 'getItem',
      key: nudgeB,
    });
    expect(seen, 'control: the nudge mark is written under B').toContainEqual({
      op: 'setItem',
      key: nudgeB,
    });
    expect(seen, 'control: the claim code is cleared under B').toContainEqual({
      op: 'removeItem',
      key: codeB,
    });
    const encodedUriA = encodeURIComponent(URI);
    expect(
      seen.filter((c) => c.key === nudgeA || c.key === codeA || c.key.includes(`|${encodedUriA}|`)),
      'no storage call of the second boot names a key of target A',
    ).toEqual([]);
    expect(globalThis.sessionStorage.getItem(codeA), 'A`s code is unchanged').toBe(SEEDED_CODE);
    expect(globalThis.sessionStorage.getItem(nudgeA), 'A`s mark is unchanged').toBe('1');
  });
```

Failure output:

```
control: the nudge mark is read under B: expected [] to deep equally contain { op: 'getItem', …(1) }

AssertionError: control: the nudge mark is read under B: expected [] to deep equally contain { op: 'getItem', …(1) }

- Expected:
{
  "key": "mr.claimCode.v1|nudge|ws%3A%2F%2Ftarget-b.example%3A3999|realm-beta",
  "op": "getItem",
}

+ Received:
[]

 ❯ src/main.claimCode.test.ts:554:61
```

## k81d7c407ec

```
  // criterion: lpg-1.8
  it('clears the claim code and reads and marks the first-run nudge under the keys claimCode derives from the document`s pair', async () => {
    seed();
    const touched = spyOnStorage();
    await bootReady(false);
    driveClaimStorage();

    const codeKey = claimCodeStorageKey(URI, DB);
    const nudgeKey = nudgeKeyOf({ uri: URI, db: DB });
    const keys = touched();
    expect(
      claimNamespace(keys.get),
      'the claim namespace is read through the nudge key only',
    ).toEqual([nudgeKey]);
    expect(claimNamespace(keys.set), 'and written through the nudge key only').toEqual([nudgeKey]);
    expect(claimNamespace(keys.remove), 'and cleared through the code key only').toEqual([codeKey]);
    expect(stored(), 'the code stored for the document`s target is gone').toBeUndefined();
    expect(claimCode.hasSeenFirstRunNudge(globalThis, URI, DB), 'the nudge is marked seen').toBe(
      true,
    );
  });
```

Failure output:

```
the claim namespace is read through the nudge key only: expected [] to deeply equal [ Array(1) ]

AssertionError: the claim namespace is read through the nudge key only: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- [
-   "mr.claimCode.v1|nudge|wss%3A%2F%2Fclaim-alpha.example%3A4431%2Fstdb%2F|lpg-claim-alpha",
- ]
+ []

 ❯ src/main.claimCode.test.ts:523:7
```

## k27415b63c7

```
  // criterion: lpg-1.8
  it('touches no key of the first target when it boots again under a second document, leaving the first target`s stored values as they were', async () => {
    const a = DOC_A.connection;
    const b = DOC_B.connection;
    // The first target's code and nudge mark are still in the tab's storage; the second target holds
    // a code of its own for the claim result to clear.
    seed(a.uri, a.db);
    claimCode.markFirstRunNudgeSeen(globalThis, a.uri, a.db);
    seed(b.uri, b.db);
    const touched = spyOnStorage();

    setDocument(DOC_B);
    await bootReady(false);
    driveClaimStorage();

    const keys = touched();
    expect(opts.uri, 'connect gets the second uri').toBe(b.uri);
    expect(opts.db, 'connect gets the second db').toBe(b.db);
    expect(
      claimNamespace(keys.get),
      'the second target`s nudge is the only claim key read',
    ).toEqual([nudgeKeyOf(b)]);
    expect(claimNamespace(keys.set), 'and the only one written').toEqual([nudgeKeyOf(b)]);
    expect(claimNamespace(keys.remove), 'and its code the only one cleared').toEqual([
      claimCodeStorageKey(b.uri, b.db),
    ]);
    const namesFirstTarget = [...keys.get, ...keys.set, ...keys.remove].filter(
      (k) => k.includes(encodeURIComponent(a.uri)) || k.includes(encodeURIComponent(a.db)),
    );
    expect(namesFirstTarget, 'no storage call names a key of the first target').toEqual([]);
    expect(
      claimCode.read(globalThis, b.uri, b.db),
      'the second target`s code is gone',
    ).toBeUndefined();
    expect(claimCode.read(globalThis, a.uri, a.db), 'the first target`s code is unchanged').toBe(
      SEEDED_CODE,
    );
    expect(
      claimCode.hasSeenFirstRunNudge(globalThis, a.uri, a.db),
      'the first target`s nudge mark is unchanged',
    ).toBe(true);
  });
```

Failure output:

```
the second target`s nudge is the only claim key read: expected [] to deeply equal [ Array(1) ]

AssertionError: the second target`s nudge is the only claim key read: expected [] to deeply equal [ Array(1) ]

- Expected
+ Received

- [
-   "mr.claimCode.v1|nudge|wss%3A%2F%2Fclaim-beta.example%3A5542%2F|lpg-claim-beta",
- ]
+ []

 ❯ src/main.claimCode.test.ts:553:7
```
