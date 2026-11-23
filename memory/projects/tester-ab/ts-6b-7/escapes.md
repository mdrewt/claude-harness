# Shadow tests failing after the lens fixes: ts-6b-7

Each is a test written blind from this slice's criteria that fails against the current tree. Rule on each: a real defect in the implementation is fixed through the normal lens-fix path; a wrong test needs no action.

For each one that is a real defect: fix the defect. Add at most ONE test for it, the smallest that catches it, and prefer extending an existing test to writing a new one; add none if the gating tests already catch it after the fix. Put the trailer `AB-Adopt: <its id>` (the `k...` heading in the file) on the fix commit.

## kc8b9c19d69

```
  it('the "Still there?" countdown runs on the wall clock in the last minute of a WILD window, on the deploy panel and on the shell: none 70 s out, 59 s after 11 s of frames alone, ticking down, gone at the deadline; exactly one node, in the shown root; a finished battle`s clock never leaks into the next; the live region announces the first value once; a reconnect clears it and the same rows bring it back; PvP and Practice never show it [BT12-2-BOOT-STILL-THERE]', async () => {
    // WRONG IMPL KILLED (REV B2.8, R5): no pump (BT12.2 "a Still there? countdown SHALL appear");
    // a countdown driven by store batches (it freezes between batches: here only rAF frames run);
    // `performance.now` read instead of the wall clock (the deadline is an epoch instant; the two
    // clocks are stubbed apart); a lead measured from the window OPEN (the Active fixture's window is
    // 120 s long: 240 s after its open never comes); the countdown shown in PvP or Practice; the clock
    // row of the battle last SHOWN (a finished shell battle) read for a new Deploying one; the line
    // painted on a hidden root or twice; a countdown left after a reconnect, or a memo that keeps the
    // same rows from painting it again; the live region announcing every second (or never).
    await bootReady();
    server(1000);
    const wall = { t: 1_750_000_000_000 };
    vi.spyOn(Date, 'now').mockImplementation(() => wall.t);
    let t = 1000;
    const tick = (wallMs: number): void => {
      wall.t = wallMs;
      t += 50;
      frame(t);
    };
    const W0 = wall.t;
    const line = (s: number): string => i18n.tf('tactics.clock.stillThere', { s });
    const shownIn = (root: Element | null): string[] =>
      bt12bCountdowns().map((n) =>
        root !== null && root.contains(n) ? (n.textContent ?? '') : 'OUTSIDE',
      );

    // A finished shell battle whose clock row stays in the store (30 s left on it).
    const Z = 2n ** 60n + 61n;
    const PZ = 2n ** 60n + 63n;
    opts.store.upsertMonster(bt12Monster(PZ, 0));
    opts.store.upsertBattle(bt12bAnchor(Z, 'Ongoing', [PZ]));
    opts.store.reconcileBattleUnitsFromView([
      bt12bUnit(Z, 11, { owner: H.identity, monsterId: PZ, side: 'A', slot: 0, x: 1, y: 1 }),
    ]);
    const zRow = bt12bTactical(Z, 'Wild', {
      initiative: [11],
      turnIdx: 0,
      turnState: { kind: 'Waiting', unitId: 11 },
      tiePrioritySide: 'A',
    });
    opts.store.reconcileTacticalBattlesFromView([zRow]);
    opts.store.reconcileBattleClocksFromView([
      bt12bClock(Z, BigInt(W0 + 30_000), BigInt(W0 - 90_000)),
    ]);
    t += 50;
    server(t);
    tick(W0);
    expect(shownIn(bt12bShell()), 'the shell battle shows its 30').toEqual([line(30)]);
    const live = (): string => document.getElementById('a11y-live')?.textContent ?? '';
    for (let i = 1; i <= 30; i += 1) tick(W0 + i * 100);
    expect(shownIn(bt12bShell()), 'three seconds of frames on: 27').toEqual([line(27)]);
    expect(live(), 'the live region announced the FIRST value of this deadline, once').toBe(
      line(30),
    );
    opts.store.upsertBattle(bt12bAnchor(Z, 'SideAWins', [PZ]));
    opts.store.reconcileTacticalBattlesFromView([{ ...zRow, phase: 'Finished' }]);
    t += 50;
    server(t);
    t += 50;
    press('Backspace', t);
    await flush();
    opts.store.removeBattle(Z);
    opts.store.reconcileTacticalBattlesFromView([]);
    t += 50;
    server(t);
    tick(W0 + 100);
    expect(bt12bCountdowns(), 'no battle, no countdown').toEqual([]);

    // A Deploying wild battle: its own clock carries the deploy deadline 70 s ahead (no open window).
    const B = 2n ** 60n + 65n;
    const PB = 2n ** 60n + 67n;
    opts.store.upsertMonster(bt12Monster(PB, 0));
    opts.store.upsertBattle(bt12bAnchor(B, 'Ongoing', [PB]));
    opts.store.reconcileTacticalBattlesFromView([bt12Tactical(B, 'Deploying')]);
    const deadline = W0 + 70_200;
    opts.store.reconcileBattleClocksFromView([
      bt12bClock(Z, BigInt(W0 + 30_000), BigInt(W0 - 90_000)),
      bt12bClock(B, BigInt(deadline), null),
    ]);
    t += 50;
```

Failure output:

```
the live region announced the FIRST value of this deadline, once: expected 'Round 1 — m1152921504606847039\'s turn' to be 'Still there? 30 s' // Object.is equality

AssertionError: the live region announced the FIRST value of this deadline, once: expected 'Round 1 — m1152921504606847039\'s turn' to be 'Still there? 30 s' // Object.is equality

Expected: "Still there? 30 s"
Received: "Round 1 — m1152921504606847039's turn"

 ❯ src/main.dispatch.test.ts:6748:88
```

## k16aaddf90f

```
  it('the "Still there?" countdown runs on the wall clock in the last minute of a WILD window, on the deploy panel and on the shell: none 70 s out, 59 s after 11 s of frames alone, ticking down, gone at the deadline; exactly one node, in the shown root; a finished battle`s clock never leaks into the next; the live region announces the first value once; a reconnect clears it and the same rows bring it back; PvP and Practice never show it [BT12-2-BOOT-STILL-THERE]', async () => {
    // WRONG IMPL KILLED (REV B2.8, R5): no pump (BT12.2 "a Still there? countdown SHALL appear");
    // a countdown driven by store batches (it freezes between batches: here only rAF frames run);
    // `performance.now` read instead of the wall clock (the deadline is an epoch instant; the two
    // clocks are stubbed apart); a lead measured from the window OPEN (the Active fixture's window is
    // 120 s long: 240 s after its open never comes); the countdown shown in PvP or Practice; the clock
    // row of the battle last SHOWN (a finished shell battle) read for a new Deploying one; the line
    // painted on a hidden root or twice; a countdown left after a reconnect, or a memo that keeps the
    // same rows from painting it again; the live region announcing every second (or never).
    await bootReady();
    server(1000);
    const wall = { t: 1_750_000_000_000 };
    vi.spyOn(Date, 'now').mockImplementation(() => wall.t);
    let t = 1000;
    const tick = (wallMs: number): void => {
      wall.t = wallMs;
      t += 50;
      frame(t);
    };
    const W0 = wall.t;
    const line = (s: number): string => i18n.tf('tactics.clock.stillThere', { s });
    const shownIn = (root: Element | null): string[] =>
      bt12bCountdowns().map((n) =>
        root !== null && root.contains(n) ? (n.textContent ?? '') : 'OUTSIDE',
      );

    // A finished shell battle whose clock row stays in the store (30 s left on it).
    const Z = 2n ** 60n + 61n;
    const PZ = 2n ** 60n + 63n;
    opts.store.upsertMonster(bt12Monster(PZ, 0));
    opts.store.upsertBattle(bt12bAnchor(Z, 'Ongoing', [PZ]));
    opts.store.reconcileBattleUnitsFromView([
      bt12bUnit(Z, 11, { owner: H.identity, monsterId: PZ, side: 'A', slot: 0, x: 1, y: 1 }),
    ]);
    const zRow = bt12bTactical(Z, 'Wild', {
      initiative: [11],
      turnIdx: 0,
      turnState: { kind: 'Waiting', unitId: 11 },
      tiePrioritySide: 'A',
    });
    opts.store.reconcileTacticalBattlesFromView([zRow]);
    opts.store.reconcileBattleClocksFromView([
      bt12bClock(Z, BigInt(W0 + 30_000), BigInt(W0 - 90_000)),
    ]);
    t += 50;
    server(t);
    tick(W0);
    expect(shownIn(bt12bShell()), 'the shell battle shows its 30').toEqual([line(30)]);
    const live = (): string => document.getElementById('a11y-live')?.textContent ?? '';
    for (let i = 1; i <= 30; i += 1) tick(W0 + i * 100);
    expect(shownIn(bt12bShell()), 'three seconds of frames on: 27').toEqual([line(27)]);
    expect(live(), 'the live region announced the FIRST value of this deadline, once').toBe(
      line(30),
    );
    opts.store.upsertBattle(bt12bAnchor(Z, 'SideAWins', [PZ]));
    opts.store.reconcileTacticalBattlesFromView([{ ...zRow, phase: 'Finished' }]);
    t += 50;
    server(t);
    t += 50;
    press('Backspace', t);
    await flush();
    opts.store.removeBattle(Z);
    opts.store.reconcileTacticalBattlesFromView([]);
    t += 50;
    server(t);
    tick(W0 + 100);
    expect(bt12bCountdowns(), 'no battle, no countdown').toEqual([]);

    // A Deploying wild battle: its own clock carries the deploy deadline 70 s ahead (no open window).
    const B = 2n ** 60n + 65n;
    const PB = 2n ** 60n + 67n;
    opts.store.upsertMonster(bt12Monster(PB, 0));
    opts.store.upsertBattle(bt12bAnchor(B, 'Ongoing', [PB]));
    opts.store.reconcileTacticalBattlesFromView([bt12Tactical(B, 'Deploying')]);
    const deadline = W0 + 70_200;
    opts.store.reconcileBattleClocksFromView([
      bt12bClock(Z, BigInt(W0 + 30_000), BigInt(W0 - 90_000)),
      bt12bClock(B, BigInt(deadline), null),
    ]);
    t += 50;
```

Failure output:

```
the live region announced the FIRST value of this deadline, once: expected 'Round 1 — m1152921504606847039\'s turn' to be 'Still there? 30 s' // Object.is equality

AssertionError: the live region announced the FIRST value of this deadline, once: expected 'Round 1 — m1152921504606847039\'s turn' to be 'Still there? 30 s' // Object.is equality

Expected: "Still there? 30 s"
Received: "Round 1 — m1152921504606847039's turn"

 ❯ src/main.dispatch.test.ts:6748:88
```

## k35324d87b9

```
  // criterion: ts-6b-7.1
  it('hide() drops the queued speech but keeps the heard turn; a new battle id or reset() hears the same turn key again', () => {
    // WRONG IMPL KILLED: a hide() that leaves the queue to be spoken after the next show; a
    // hide() that forgets the heard key (re-showing the same turn repeats it); a new battle that
    // inherits the last battle's heard key (its turn 1 is never spoken); a reset() that keeps it.
    const k = make();
    k.shell.render(vmOf({ round: 2 }));
    k.shell.ingest([koEv(3)]);
    k.shell.hide();
    k.shell.show();
    k.shell.tick();
    expect(k.announced, 'the queued turn + KO are dropped by hide(); the key stays heard').toEqual(
      [],
    );

    const b = make();
    b.shell.render(vmOf({ round: 1 }));
    b.shell.tick();
    expect(b.announced).toEqual([turnLine(1, 'unit#1')]);
    b.shell.render(vmOf({ round: 1, battleId: 2n }));
    b.shell.tick();
    expect(b.announced, 'a new battle id hears its own turn 1').toEqual([
      turnLine(1, 'unit#1'),
      turnLine(1, 'unit#1'),
    ]);
    b.shell.reset();
    b.shell.render(vmOf({ round: 1, battleId: 2n }));
    b.shell.tick();
    expect(b.announced, 'reset() forgets the key').toHaveLength(3);
  });
```

Failure output:

```
the queued turn + KO are dropped by hide(); the key stays heard: expected [ 'Round 2 — unit#1\'s turn' ] to deeply equal []

AssertionError: the queued turn + KO are dropped by hide(); the key stays heard: expected [ 'Round 2 — unit#1\'s turn' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "Round 2 — unit#1's turn",
+ ]

 ❯ src/tactics/tacticsBattle.test.ts:5114:92
```

## kd00073f9bd

```
describe('ServerClock: the server-time estimate (ts-6b-7.2)', () => {
  // criterion: ts-6b-7.2
  it('a client clock 60 s behind still counts the last minute of a window', () => {
    // WRONG IMPL KILLED: `now()` returning the raw local time (50 s left by the server reads as no
    // countdown at all, and the server deadline passes with "60" still showing); an offset taken
    // from the FIRST sighting's old open (a window that opened 200 s before this client saw it would
    // skew the estimate by 200 s); the offset sign flipped (local − server: the countdown would show
    // a minute too late twice over); a `now()` that ignores its argument (the countdown would not
    // tick down with local time); `observeWindows` that never observes a live transition.
    expect(STILL_THERE_LEAD_MS, 'fixture: the countdown shows for the last 60 s').toBe(60_000);
    const clock = new ServerClock();
    const ID = 2n ** 60n + 7n;

    // A first sighting: the window already open for 200 s (a snapshot row) — only remembered.
    const oldOpen = serverAt(L0) - 200_000;
    clock.observeWindows([row(ID, oldOpen)], L0);
    expect(clock.now(L0), 'a first sighting observes nothing: the estimate is the local time').toBe(
      L0,
    );

    // The server opens a NEW window on the same clock; this client receives it at local L1, when
    // the server's time is L1 + 60 s (the window open IS the server time at receipt).
    const L1 = L0 + 5_000;
    const open = serverAt(L1);
    const deadline = BigInt(open + WINDOW_MS);
    clock.observeWindows([row(ID, open)], L1);
    expect(clock.now(L1), 'the live transition sets the estimate to the server time').toBe(open);

    // 50 s left by the server's clock: the device reads 110 s left (no countdown).
    const at50 = L1 + WINDOW_MS - 50_000 - SKEW;
    expect(stillThereSeconds(deadline, at50), 'control: the raw local clock shows nothing').toBe(
      null,
    );
    expect(
      stillThereSeconds(deadline, clock.now(at50)),
      'the server-time estimate shows the real 50',
    ).toBe(50);
    expect(
      stillThereSeconds(deadline, clock.now(at50 + 1_000)),
      'it ticks down with the local clock',
    ).toBe(49);
    expect(
      stillThereSeconds(deadline, clock.now(at50 + 49_999)),
      '1 ms before the server deadline: 1',
    ).toBe(1);
    const atDeadline = at50 + 50_000;
    expect(
      stillThereSeconds(deadline, atDeadline),
      'control: at the server deadline the raw clock would still show 60',
    ).toBe(60);
    expect(
      stillThereSeconds(deadline, clock.now(atDeadline)),
      'the estimate: the window is over, no countdown',
    ).toBe(null);
  });
```

Failure output:

```
the server-time estimate shows the real 50: expected null to be 50 // Object.is equality

AssertionError: the server-time estimate shows the real 50: expected null to be 50 // Object.is equality

- Expected:
50

+ Received:
null

 ❯ src/net/serverClock.test.ts:68:7
```

## k31e5510b0f

```
  // criterion: ts-6b-7.1
  it('the spoken events come before the own-turn line whatever the call order, in one utterance', () => {
    // WRONG IMPL KILLED: the turn line spoken before the KO that preceded it; the two lines spoken as
    // two calls; a render-then-ingest order that flips the utterance.
    const ingestFirst = make();
    ingestFirst.shell.ingest([koEv(3)]);
    ingestFirst.shell.render(vmOf());
    ingestFirst.shell.tick();
    expect(ingestFirst.announced, 'ingest then render').toEqual([`${koLine(3)} ${turnLine(1, 1)}`]);

    const renderFirst = make();
    renderFirst.shell.render(vmOf());
    renderFirst.shell.ingest([koEv(3)]);
    renderFirst.shell.tick();
    expect(renderFirst.announced, 'render then ingest: the events still come first').toEqual([
      `${koLine(3)} ${turnLine(1, 1)}`,
    ]);
  });
```

Failure output:

```
ingest then render: expected [ 'Round 1 — unit#1\'s turn' ] to deeply equal [ Array(1) ]

AssertionError: ingest then render: expected [ 'Round 1 — unit#1\'s turn' ] to deeply equal [ Array(1) ]

- Expected
+ Received

  [
-   "unit#3 is knocked out Round 1 — unit#1's turn",
+   "Round 1 — unit#1's turn",
  ]

 ❯ src/tactics/tacticsBattle.test.ts:5126:57
```
