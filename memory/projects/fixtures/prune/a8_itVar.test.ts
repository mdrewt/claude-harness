// synthetic: a file-level helper with a variable named it, beside a real twin pair
const items = [{ key: 'k' }];
const el = { textContent: '' };
for (const it of items) { el.textContent = it.key; }

describe('helper', () => {
  it('reads a key', () => {
    expect(el.textContent).toBe('k');
  });

  it('reads a key again', () => {
    expect(el.textContent).toBe('k');
  });
});
