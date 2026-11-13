// synthetic: an unterminated string makes this file unlexable; it still holds a twin pair
import { describe, expect, it } from 'vitest';

describe('broken', () => {
  it('one', () => {
    expect(f('unterminated)).toBe(1);
  });

  it('two', () => {
    expect(f(2)).toBe(2);
  });

  it('two again', () => {
    expect(f(2)).toBe(2);
  });
});
