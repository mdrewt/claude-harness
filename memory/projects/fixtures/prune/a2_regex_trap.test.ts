// synthetic: regex literals holding comment openers inside template ${}; the bodies differ only in launch(1) / launch(2)
describe('launch', () => {
  it('a', () => {
    const s = `${/[/*]/.source}`;
    expect(launch(1)).toBe(true);
    const t = `${/[*/]/.source}`;
  });

  it('b', () => {
    const s = `${/[/*]/.source}`;
    expect(launch(2)).toBe(true);
    const t = `${/[*/]/.source}`;
  });
});
