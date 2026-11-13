// synthetic: pairs that each break named twin rules
import { describe, expect, it, test } from 'vitest';

describe('rules', () => {
  describe('first', () => {
    it('base', () => {
      expect(sum(1, 2)).toBe(3);
    });

    it('base copy', () => {
      expect(sum(1, 2)).toBe(3);
    });

    it('other body', () => {
      expect(sum(2, 2)).toBe(4);
    });

    test('other form', () => {
      expect(sum(1, 2)).toBe(3);
    });

    it('snap a', () => {
      expect(sum(1, 2)).toMatchSnapshot();
    });

    it('snap b', () => {
      expect(sum(1, 2)).toMatchSnapshot();
    });
  });

  describe('second', () => {
    it('base', () => {
      expect(sum(1, 2)).toBe(3);
    });

    it('other', () => {
      expect(sum(2, 2)).toBe(4);
    });
  });
});
