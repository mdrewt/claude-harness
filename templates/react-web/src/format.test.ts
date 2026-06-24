import { describe, expect, it } from 'vitest';
import { formatCents } from './format.js';

describe('formatCents', () => {
  it('formats positive amounts with two decimals', () => {
    expect(formatCents(2005)).toBe('USD 20.05');
  });
  it('formats negative amounts with a leading sign', () => {
    expect(formatCents(-5)).toBe('-USD 0.05');
  });
  it('supports a custom currency', () => {
    expect(formatCents(100, 'EUR')).toBe('EUR 1.00');
  });
  it('rejects non-integer minor units (no floats)', () => {
    expect(() => formatCents(1.5)).toThrow(RangeError);
  });
});
