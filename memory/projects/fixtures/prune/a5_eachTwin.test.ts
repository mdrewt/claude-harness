// synthetic: it.each twins with one case table, and one body under it() and test()
import { describe, expect, it, test } from 'vitest';

describe('sizes', () => {
  it.each([1, 2])('doubles %s', (n) => {
    expect(n * 2).toBeGreaterThan(n);
  });

  it.each([1, 2])('doubles %s again', (n) => {
    expect(n * 2).toBeGreaterThan(n);
  });

  it('halves four', () => {
    expect(half(4)).toBe(2);
  });

  test('halves four with test()', () => {
    expect(half(4)).toBe(2);
  });
});
