// synthetic: a twin pair reading task.name, and a plain pair
describe('golden', () => {
  it('matches the golden file', ({ task }) => {
    expect(golden(task.name)).toBe(true);
  });

  it('matches the golden file again', ({ task }) => {
    expect(golden(task.name)).toBe(true);
  });

  it('reads the table', () => {
    expect(golden('t')).toBe(true);
  });

  it('reads the table again', () => {
    expect(golden('t')).toBe(true);
  });
});
