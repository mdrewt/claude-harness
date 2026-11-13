// synthetic: a protected token only in the candidate's name, and two only in the survivor's name
import { describe, expect, it } from 'vitest';

describe('panel', () => {
  it('opens on click', () => {
    click();
    expect(isOpen()).toBe(true);
  });

  it('opens on click (Locale switch)', () => {
    click();
    expect(isOpen()).toBe(true);
  });

  it('GUARD keeps the Auth panel shut', () => {
    expect(isOpen()).toBe(false);
  });

  it('keeps the panel shut', () => {
    expect(isOpen()).toBe(false);
  });
});
