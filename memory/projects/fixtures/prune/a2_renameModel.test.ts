// cut from client/src/ui/renameModel.test.ts
describe('buildRenameViewModel PTC1B-7: whitespace-only / empty draft → canSubmit:false', () => {
  it('★ BITES: whitespace-only draft "   " → canSubmit:false AND trimmedDraft:"" — kills impl that checks non-empty BEFORE trim', () => {
    // WRONG IMPL KILLED: `canSubmit = draft !== ''` (checks raw draft before trim):
    //   '   ' is non-empty → canSubmit:true. This assertion catches that exact bug.
    // ALSO KILLS: an impl that sets trimmedDraft to '   ' instead of ''.
    // PTC1B-7: the submit button is disabled for a draft that is empty after trim.
    const vm = buildRenameViewModel('Alice', '   ');
    expect(vm.canSubmit).toBe(false);
    expect(vm.trimmedDraft).toBe('');
  });

  it('★ BITES: empty string draft "" → canSubmit:false AND trimmedDraft:"" — kills impl that special-cases non-whitespace empty only', () => {
    // WRONG IMPL KILLED: an impl that only guards '' but not '  ' (whitespace).
    // Paired with the whitespace-only test above, together they require TRIM-THEN-CHECK.
    const vm = buildRenameViewModel('Alice', '');
    expect(vm.canSubmit).toBe(false);
    expect(vm.trimmedDraft).toBe('');
  });
});
