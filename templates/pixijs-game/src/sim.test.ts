import { describe, expect, it } from 'vitest';
import { run } from './sim.js';

describe('simulation determinism', () => {
  it('same seed -> identical state (replayable)', () => {
    expect(run(12345, 100)).toEqual(run(12345, 100));
  });
  it('different seeds -> generally different state', () => {
    expect(run(1, 100)).not.toEqual(run(2, 100));
  });
});
