// synthetic: bodies that differ only inside a regex literal, after // inside a string, or inside a nested template; one true pair
describe('traps', () => {
  it('slashes b', () => {
    expect(match(/a\/\/b/)).toBe(1);
  });

  it('slashes c', () => {
    expect(match(/a\/\/c/)).toBe(1);
  });

  it('class x', () => {
    expect(match(/[^:'"]x/)).toBe(1);
  });

  it('class y', () => {
    expect(match(/[^:'"]y/)).toBe(1);
  });

  it('url a', () => {
    expect(fetchUrl('http://a')).toBe(1);
  });

  it('url b', () => {
    expect(fetchUrl('http://b')).toBe(1);
  });

  it('nested one', () => {
    expect(label(`${`x ${1}`} y`)).toBe(1);
  });

  it('nested two', () => {
    expect(label(`${`x ${2}`} y`)).toBe(1);
  });

  it('control', () => {
    expect(match(/a\/\/b/)).toBe(2);
  });

  it('control again', () => {
    expect(match(/a\/\/b/)).toBe(2);
  });
});
