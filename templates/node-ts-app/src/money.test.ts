import { describe, expect, it } from 'vitest';
import { cents, format, total } from './money.js';

describe('money', () => {
  it('rejects non-integer minor units (no floats)', () => {
    expect(() => cents(1.5)).toThrow(RangeError);
  });
  it('totals exactly (accounting invariant)', () => {
    expect(total([cents(99), cents(1), cents(100)])).toBe(200);
  });
  it('formats with two decimals', () => {
    expect(format(cents(2005))).toBe('USD 20.05');
    expect(format(cents(-5))).toBe('-USD 0.05');
  });
});
