// synthetic: a test-shaped line inside a block comment, beside a real twin pair
describe('commented', () => {
  /*
  it('gone', () => {});
  */
  it('stays', () => {
    expect(one()).toBe(1);
  });

  it('stays again', () => {
    expect(one()).toBe(1);
  });
});
