// cut from client/src/render/art/registry.test.ts
describe('WAP0.3 validateArtRegistry', () => {
  it.each([
    'Hero',
    'characters/Hero',
    'hero',
    'characters/',
    'characters/1up',
    'nopack/hero',
  ])('WAP0.3 flags malformed key %s and names the row', (key) => {
    const offender = mk(hero, { key, file: 'm.png' });
    expect(validateArtRegistry([palette, offender])).toEqual([
      { key, file: 'm.png', reason: 'malformed-key' },
    ]);
  });

  it.each([
    'characters/a-b',
    'characters/ok!',
    'characters/hero ',
    'characters/hero\n',
  ])('WAP0.3 flags malformed key with trailing junk %j', (key) => {
    const offender = mk(hero, { key, file: 'm.png' });
    expect(validateArtRegistry([palette, offender])).toEqual([
      { key, file: 'm.png', reason: 'malformed-key' },
    ]);
  });
});
