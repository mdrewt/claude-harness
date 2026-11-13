// synthetic: one plain twin pair, the positive control several fixtures place beside their case
import { describe, expect, it } from 'vitest';

describe('stack', () => {
  it('push then pop returns the item', () => {
    const s: number[] = [];
    s.push(3);
    expect(s.pop()).toBe(3);
  });

  it('push then pop returns the item again', () => {
    const s: number[] = [];
    s.push(3);
    expect(s.pop()).toBe(3);
  });
});
