// synthetic: two tests with the same title and the same body in one describe
describe('menu', () => {
  it('opens', () => {
    expect(open()).toBe(true);
  });

  it('opens', () => {
    expect(open()).toBe(true);
  });
});
