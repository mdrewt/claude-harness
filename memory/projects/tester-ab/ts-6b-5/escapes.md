# Shadow tests failing after the lens fixes: ts-6b-5

Each is a test written blind from this slice's criteria that fails against the current tree. Rule on each: a real defect in the implementation is fixed through the normal lens-fix path; a wrong test needs no action.

For each one that is a real defect: fix the defect. Add at most ONE test for it, the smallest that catches it, and prefer extending an existing test to writing a new one; add none if the gating tests already catch it after the fix. Put the trailer `AB-Adopt: <its id>` (the `k...` heading in the file) on the fix commit.

## k4a30c016d2

```
  it('CTL7D-6-BOOT-OBSERVE: every store batch calls an open frame`s observe once, after the batch`s view renders, from init on the batch that pushed the frame and from the last returned state after it; a new state paints once into the frame`s own view, the same state paints nothing, the next button gets the kept state, and neither a frame without observe nor a closed frame is called', async () => {
    // WRONG IMPL KILLED: no batch observation (adapter code runs only on a button step, so a
    // dialogue adapter could never see its node replaced), an observe placed before the final
    // syncStack or in an earlier listener (the frame this batch pushed is not observed on it, or
    // is observed before its view rendered), an observe that skips init on a fresh frame or asks
    // it again, that drops the returned state (the next observe or the next button gets an older
    // one), that paints on every batch, or never, or into another view, or with another view
    // model, one that runs viewModel / init / paint for an adapter with no observe, and one that
    // keeps observing a closed frame.
    await bootReady();
    server(1000);
    seedNpcs(1010);
    const shop = stubView('ShopView');
    // The dialogue frame's stand-in has no observe: no batch may call any of its methods.
    const dialogueCalls: string[] = [];
    swapAdapter('dialogueView', {
      viewModel: () => {
        dialogueCalls.push('viewModel');
        return undefined;
      },
      init: () => {
        dialogueCalls.push('init');
        return undefined;
      },
      onButton: (_vm: unknown, state: unknown) => {
        dialogueCalls.push('onButton');
        return { state, result: 'consumed' };
      },
      paint: () => {
        dialogueCalls.push('paint');
      },
    });
    const S0 = { state: 'from init' };
    const S1 = { state: 'first' };
    const S2 = { state: 'second' };
    const vms: object[] = [];
    const inits: unknown[] = [];
    const observes: Array<{ vm: unknown; state: unknown; now: unknown; renders: number }> = [];
    const paints: Array<{ view: unknown; vm: unknown; state: unknown }> = [];
    const buttons: Array<{ state: unknown; button: string }> = [];
    let answer: (state: unknown) => unknown = (state) => state;
    swapAdapter('shopView', {
      viewModel: () => {
        const vm = { n: vms.length };
        vms.push(vm);
        return vm;
      },
      init: (vm: unknown) => {
        inits.push(vm);
        return S0;
      },
      observe: (vm: unknown, state: unknown, now: unknown) => {
        observes.push({ vm, state, now, renders: shop.renders.length });
        return answer(state);
      },
      onButton: (_vm: unknown, state: unknown, btn: Pressed) => {
        buttons.push({ state, button: btn.button });
        const closes = btn.button === 'Start' && !btn.repeat;
        return { state, result: closes ? { kind: 'popToBase' } : 'consumed' };
      },
      paint: (view: unknown, vm: unknown, state: unknown) => {
        paints.push({ view, vm, state });
      },
    });

    // The conversation: two batches with the dialogue frame open, and no shop frame yet.
    startShopConversation(1100, '3');
    server(1150);
    expect(stackNow(), 'precondition: the conversation is the one frame').toEqual([
      WORLD_FRAME,
      screenFrame('dialogueView'),
    ]);
    H.calls = [];
    clickShop(1200, '3');
    expect(H.calls, 'precondition: the Shop click sent the dismiss').toEqual(ONE_DISMISS);
    expect(observes, 'no shop frame yet: nothing is observed').toEqual([]);

    // --- the batch that ends the conversation pushes the shop frame ---------------------------
    const rendersBefore = shop.renders.length;
    answer = () => S1;
```

Failure output:

```
precondition: the Shop click sent the dismiss: expected [] to deeply equal [ { name: 'dismissDialogue', …(1) } ]

AssertionError: precondition: the Shop click sent the dismiss: expected [] to deeply equal [ { name: 'dismissDialogue', …(1) } ]

- Expected
+ Received

- [
-   {
-     "args": {},
-     "name": "dismissDialogue",
-   },
- ]
+ []

 ❯ src/main.dispatch.test.ts:4082:70
```
