// synthetic: a test built in a loop (body equal to a lexed test) and a lexed twin pair
import { describe, expect, it } from 'vitest';

describe('grid', () => {
  it('first cell renders', () => {
    expect(cell(1)).toBeTruthy();
  });

  for (const n of [1, 2]) {
    it(`cell ${n} renders`, () => {
      expect(cell(1)).toBeTruthy();
    });
  }

  it('fills a row', () => {
    expect(row(1)).toBe(1);
  });

  it('fills a row again', () => {
    expect(row(1)).toBe(1);
  });
});
