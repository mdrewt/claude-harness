// synthetic: a plain twin pair; the battery places it at a path holding a protected token
import { describe, expect, it } from 'vitest';

describe('card', () => {
  it('shows the title', () => {
    expect(title()).toBe('T');
  });

  it('shows the title, repeated', () => {
    expect(title()).toBe('T');
  });
});
