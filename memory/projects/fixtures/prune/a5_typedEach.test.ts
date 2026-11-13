// synthetic: it.each<T> twins with one type argument list and table; one with other type arguments, one with another table
describe('pairs', () => {
  it.each<[string, string]>([
    ['a', 'b'],
  ])('joins %s', (a, b) => {
    expect(join(a, b)).toBe(a + b);
  });

  it.each<[string, string]>([
    ['a', 'b'],
  ])('joins %s again', (a, b) => {
    expect(join(a, b)).toBe(a + b);
  });

  it.each<[string, unknown]>([
    ['a', 'b'],
  ])('joins %s typed apart', (a, b) => {
    expect(join(a, b)).toBe(a + b);
  });

  it.each<[string, string]>([
    ['a', 'c'],
  ])('joins %s with another table', (a, b) => {
    expect(join(a, b)).toBe(a + b);
  });
});
