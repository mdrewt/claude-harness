// synthetic: the last test is a twin of the first
import { describe, expect, it } from 'vitest';

describe('stack', () => {
  it('push then pop returns the item', () => {
    const s: number[] = [];
    s.push(3);
    expect(s.pop()).toBe(3);
  });

  it('pop on empty gives undefined', () => {
    const s: number[] = [];
    expect(s.pop()).toBeUndefined();
  });

  it('push then pop, run twice', () => {
    const s: number[] = [];
    s.push(3);
    expect(s.pop()).toBe(3);
  });
});
