// synthetic: twins in one nested describe (comments and spacing differ), three copies, a copy in a sibling describe
import { describe, expect, it } from 'vitest';

describe('queue', () => {
  describe('when empty', () => {
    it('length is zero', () => {
      const q: string[] = [];
      expect(q.length).toBe(0);
    });

    it('shift gives undefined', () => {
      const q: string[] = [];
      expect(q.shift()).toBeUndefined();
    });

    it('length is zero after creation', () => {
      // the same assertion, written again
      const q : string[]=[];   /* spacing differs */
      expect( q.length )
        .toBe( 0 );
    });

    it('length is zero once more', () => {
      const q: string[] = [];
      expect(q.length).toBe(0);
    });
  });

  describe('second block', () => {
    it('length is zero', () => {
      const q: string[] = [];
      expect(q.length).toBe(0);
    });
  });
});
