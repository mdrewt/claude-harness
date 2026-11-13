// synthetic: twin pairs whose bodies read the test's own name, one pair per marker, and a pair naming them only in a comment
import { describe, expect, it } from 'vitest';

describe('card', () => {
  it('draws, snapshot', () => {
    expect(draw(1)).toMatchSnapshot();
  });

  it('draws, snapshot copy', () => {
    expect(draw(1)).toMatchSnapshot();
  });

  it('reads the current name', () => {
    const { currentTestName } = state();
    expect(currentTestName).toBeTruthy();
  });

  it('reads the current name copy', () => {
    const { currentTestName } = state();
    expect(currentTestName).toBeTruthy();
  });

  it('reads the state', () => {
    const s = expect.getState();
    expect(s.assertionCalls).toBe(0);
  });

  it('reads the state copy', () => {
    const s = expect.getState();
    expect(s.assertionCalls).toBe(0);
  });

  it('mentions markers only in a comment', () => {
    // toMatchSnapshot, currentTestName and expect.getState are not called here
    expect(draw(2)).toBe(2);
  });

  it('mentions markers only in a comment, copy', () => {
    // toMatchSnapshot, currentTestName and expect.getState are not called here
    expect(draw(2)).toBe(2);
  });
});
