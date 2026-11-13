// cut from client/src/ui/evolutionView.test.ts
describe('EvolutionView — m23-s4 overlay a11y wiring on the show()/hide()/toggle() edge', () => {
  it('S4-evolutionView-TOGGLE BITES: toggle() from hidden opens exactly once; toggle() again closes exactly once', () => {
    const { view } = mount();
    expect(view.visible).toBe(false);

    view.toggle();
    expect(view.visible).toBe(true);
    expect(vi.mocked(openOverlayA11y)).toHaveBeenCalledTimes(1);

    view.toggle();
    expect(view.visible).toBe(false);
    expect(vi.mocked(closeOverlayA11y)).toHaveBeenCalledTimes(1);
  });
});
