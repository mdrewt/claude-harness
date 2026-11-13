// synthetic: a tagged-template it.each table (unparsed) beside a real twin pair
describe('sums', () => {
  it.each`
    a    | b
    ${1} | ${2}
  `('adds $a', ({ a, b }) => {
    expect(a + b).toBe(3);
  });

  it('adds one and two', () => {
    expect(1 + 2).toBe(3);
  });

  it('adds one and two again', () => {
    expect(1 + 2).toBe(3);
  });
});
