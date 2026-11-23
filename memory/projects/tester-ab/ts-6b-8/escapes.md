# Shadow tests failing after the lens fixes: ts-6b-8

Each is a test written blind from this slice's criteria that fails against the current tree. Rule on each: a real defect in the implementation is fixed through the normal lens-fix path; a wrong test needs no action.

For each one that is a real defect: fix the defect. Add at most ONE test for it, the smallest that catches it, and prefer extending an existing test to writing a new one; add none if the gating tests already catch it after the fix. Put the trailer `AB-Adopt: <its id>` (the `k...` heading in the file) on the fix commit.

## k4d0b81e1ad

```
  // criterion: ts-6b-8.1
  it('a batch render with an unchanged view model keeps the same row and button nodes', () => {
    // WRONG IMPL KILLED: a refresh that replaceChildren()s the list on every store batch (every
    // card and path row a new node); one that never refreshes (the changed-level counter-case);
    // one that keys the skip on object identity (a freshly built equal model rebuilds).
    const { parent, view } = mount();
    view.show();
    const vmA = ts6b8Vm();
    const vmB = ts6b8Vm();
    expect(vmB, 'the second model is a different object').not.toBe(vmA);

    view.refresh(vmA);
    const cards = Array.from(parent.querySelectorAll(CARD_SELECTOR));
    const rows = Array.from(parent.querySelectorAll(PATH_ROW_SELECTOR));
    expect(cards, 'precondition: two cards').toHaveLength(2);
    expect(rows, 'precondition: two path rows').toHaveLength(2);

    view.refresh(vmB);
    const cardsAfter = Array.from(parent.querySelectorAll(CARD_SELECTOR));
    const rowsAfter = Array.from(parent.querySelectorAll(PATH_ROW_SELECTOR));
    expect(cardsAfter).toHaveLength(2);
    cardsAfter.forEach((el, i) => {
      expect(el, `card ${i} is the same node`).toBe(cards[i]);
    });
    expect(rowsAfter).toHaveLength(2);
    rowsAfter.forEach((el, i) => {
      expect(el, `path row ${i} is the same node`).toBe(rows[i]);
    });

    // Counter-case: a changed level rebuilds the card.
    view.refresh(ts6b8Vm(31));
    const changed = Array.from(parent.querySelectorAll(CARD_SELECTOR));
    expect(changed[0], 'a changed level rebuilds the changed card').not.toBe(cards[0]);
    expect(changed[0]?.textContent).toContain('31');
  });
```

Failure output:

```
precondition: two path rows: expected [ <div …(2)>…(7)</div>, …(2) ] to have a length of 2 but got 3

AssertionError: precondition: two path rows: expected [ <div …(2)>…(7)</div>, …(2) ] to have a length of 2 but got 3

- Expected
+ Received

- 2
+ 3

 ❯ src/ui/evolutionView.test.ts:2745:49
```

## k9053e1de12

```
  // criterion: ts-6b-8.2
  it("selling out the cursor's stack seats the cursor on the neighbouring row, not the first", () => {
    // WRONG IMPL KILLED: a re-seat that falls back to the first row whenever the cursor's row is
    // gone (the player who sold the middle of a long list is thrown to the top); one that clamps to
    // the old index only when it is past the end (the first-row fallback survives for a middle
    // row); one that seats the previous row instead of the one now at the vanished index; a last
    // row that seats nothing or the first row instead of the new last row; one that fixes only the
    // Sell tab or only the Buy tab; and one that moves a cursor whose own row did not vanish.
    const w = world();
    const vm = vmOf(w);
    const opened = shopScreen.init(vm);

    // SELL, a middle row: the cursor on Relic (index 1) whose stack vanishes.
    const onRelic = swallowed(vm, opened, ['RB', 'Down']);
    expect(paintOf(vm, onRelic), 'fixture: the cursor is on Relic').toEqual(
      browse('sell', sellKey(vm, 1)),
    );
    const noRelic = vmOf({ ...w, inventory: [bag(101n, 7, 5), bag(103n, 8, 1)] });
    expect(sellKey(noRelic, 1), 'fixture: Berry now sits at index 1').not.toBe(sellKey(noRelic, 0));
    expect(paintOf(noRelic, observe(noRelic, onRelic)), 'the next row, not the first').toEqual(
      browse('sell', sellKey(noRelic, 1)),
    );

    // SELL, the last row: the cursor on Berry (index 2) vanishes, the new last row (Relic) is seated.
    const onBerry = swallowed(vm, opened, ['RB', 'Down', 'Down']);
    expect(paintOf(vm, onBerry), 'fixture: the cursor is on Berry').toEqual(
      browse('sell', sellKey(vm, 2)),
    );
    const noBerry = vmOf({ ...w, inventory: [bag(101n, 7, 5), bag(102n, 9, 2)] });
    expect(paintOf(noBerry, observe(noBerry, onBerry)), 'the previous neighbour').toEqual(
      browse('sell', sellKey(noBerry, 1)),
    );

    // BUY, a middle row: Potion (index 1) sells out, Berry is now at index 1, not Bait.
    const onPotion = swallowed(vm, opened, ['Down']);
    expect(paintOf(vm, onPotion), 'fixture: the cursor is on Potion').toEqual(
      browse('buy', buyKey(vm, 1)),
    );
    const noPotion = vmOf({ ...w, stock: STOCK.filter((r) => r.shopItemId !== 32n) });
    expect(paintOf(noPotion, observe(noPotion, onPotion)), 'Berry, not Bait').toEqual(
      browse('buy', buyKey(noPotion, 1)),
    );
    expect(buyKey(noPotion, 1)).not.toBe(buyKey(noPotion, 0));

    // BUY, the last row: Berry (index 2) goes, the cursor lands on the new last row (Potion).
    const onLastBuy = swallowed(vm, opened, ['Down', 'Down']);
    const noBerryStock = vmOf({ ...w, stock: STOCK.filter((r) => r.shopItemId !== 33n) });
    expect(paintOf(noBerryStock, observe(noBerryStock, onLastBuy)), 'the new last row').toEqual(
      browse('buy', buyKey(noBerryStock, 1)),
    );

    // A cursor whose own row stays does not move when another row goes.
    const stayed = observe(noPotion, swallowed(vm, opened, ['Down', 'Down']));
    expect(paintOf(noPotion, stayed), 'Berry stays under the cursor').toEqual(
      browse('buy', buyKey(noPotion, 1)),
    );
  });
```

Failure output:

```
the new last row: expected { tab: 'buy', activeKey: '34', …(2) } to deeply equal { tab: 'buy', activeKey: '32', …(2) }

AssertionError: the new last row: expected { tab: 'buy', activeKey: '34', …(2) } to deeply equal { tab: 'buy', activeKey: '32', …(2) }

- Expected
+ Received

  {
-   "activeKey": "32",
+   "activeKey": "34",
    "description": undefined,
    "prompt": null,
    "tab": "buy",
  }

 ❯ src/ui/screens/shopScreen.test.ts:801:89
```
