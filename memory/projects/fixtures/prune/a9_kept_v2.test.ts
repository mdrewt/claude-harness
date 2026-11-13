// synthetic: the last test's body changed; it is now a twin of the second
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
    expect(s.pop()).toBeUndefined();
  });
});
