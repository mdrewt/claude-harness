#!/usr/bin/env node
// rb-18 STRUCTURE probe — the two devices that make the new teeth TOTAL rather than merely present.
//
// P1 SHAPE TOTALITY. `Opened.reopen` is what makes both new teeth possible, and an opener that
// omits it must RED. MEASURED, and the reason this probe is not a `tsc --noEmit`: the obvious
// device — `OPENERS: Readonly<Record<OverlayId, () => Opened>>` with a required `reopen` — is an
// EDITOR-time device only. `client/tsconfig.json` sets `"exclude": ["**/*.test.ts"]`, so
// `just client-typecheck` (and therefore `just ci`) never typechecks this spec, and vitest
// transpiles without checking: deleting `helpView`'s `reopen` field leaves `npx tsc --noEmit -p
// tsconfig.json` at exit 0. The enforceable device is the RUNTIME shape assertion in
// `S10-WIRE-TOTALITY`, and this probe pins THAT — by name, so a hollowed shape assertion caught
// only incidentally by the repeat tooth's `reopen is not a function` TypeError is not mistaken
// for the belt still working. A CONTROL run proves the tree was green to begin with.
//
// P2 EXECUTION FLOOR. `repeatChecked`/`reopenChecked` must red the `afterAll` when ONE id's tooth
// is `it.skip`ped. `just ci` does not run the nightly `a11y-e2e` recipe, whose `numPendingTests`
// clause would otherwise catch a skip, so this counter is the only thing standing between a
// quarantined tooth and a green PR.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const WORKTREE = process.argv[2];
if (!WORKTREE) { console.error('usage: rb-18.structure-probe.mjs <worktree>'); process.exit(64); }
const CLIENT = path.join(WORKTREE, 'client');
const SPEC = path.join(CLIENT, 'src/ui/overlayA11yWiring.test.ts');
const VICTIM = 'helpView';

function tsc() {
  try {
    execFileSync('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], { cwd: CLIENT, stdio: 'pipe' });
    return { code: 0, out: '' };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}
function vitest() {
  try {
    const out = execFileSync('npx', ['vitest', 'run', 'src/ui/overlayA11yWiring.test.ts'],
      { cwd: CLIENT, encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}
/** Apply `mutate` to the spec, run `probe`, restore byte-for-byte whatever happens. */
function withSpec(mutate, probe) {
  const orig = readFileSync(SPEC, 'utf8');
  const next = mutate(orig);
  if (next === orig) throw new Error('spec mutation did not apply');
  writeFileSync(SPEC, next);
  try { return probe(); } finally {
    writeFileSync(SPEC, orig);
    if (readFileSync(SPEC, 'utf8') !== orig) throw new Error('SPEC RESTORE FAILED');
  }
}

// --- CONTROL. Everything below is uninterpretable if the untouched tree is not already clean.
const ctrlTsc = tsc();
const ctrlVitest = vitest();
const controlOk = ctrlTsc.code === 0 && ctrlVitest.code === 0;

// --- P1. Delete `helpView`'s reopen field only.
const p1 = withSpec((s) => {
  const needle = `  ${VICTIM}: () => {`;
  const at = s.indexOf(needle);
  if (at === -1) throw new Error(`no ${VICTIM} opener`);
  const end = s.indexOf('\n  },\n', at);
  const body = s.slice(at, end);
  const stripped = body.replace(/,\s*reopen: \(\) => view\.show\(\)/, '');
  if (stripped === body) throw new Error(`${VICTIM} opener carries no inline reopen field`);
  return s.slice(0, at) + stripped + s.slice(end);
}, vitest);
const p1Ok =
  p1.code !== 0 &&
  p1.out.includes('S10-WIRE-TOTALITY') &&
  p1.out.includes('every opener must hand back root + close + reopen');

// --- P2a / P2b. Skip exactly one id's tooth and require the matching floor to red.
function skipProbe(tooth) {
  return withSpec(
    (s) => s.replace(`it(\`${tooth}:\${id}`, `(id === '${VICTIM}' ? it.skip : it)(\`${tooth}:\${id}`),
    vitest,
  );
}
const p2a = skipProbe('S10-WIRE-REPEAT-NO-REOPEN');
const p2b = skipProbe('S10-WIRE-REOPEN-AFTER-CLOSE');
const p2aOk = p2a.code !== 0 && p2a.out.includes('S10-WIRE-REPEAT-NO-REOPEN must have executed');
const p2bOk = p2b.code !== 0 && p2b.out.includes('S10-WIRE-REOPEN-AFTER-CLOSE must have executed');

const ok = controlOk && p1Ok && p2aOk && p2bOk;
console.log(`RB18-STRUCTURE control=${controlOk ? 'GREEN' : 'DIRTY'} ` +
  `missingReopenRedsShapeBelt=${p1Ok ? 'Y' : 'N'} skipRedsRepeatFloor=${p2aOk ? 'Y' : 'N'} ` +
  `skipRedsReopenFloor=${p2bOk ? 'Y' : 'N'} verdict=${ok ? 'Y' : 'N'}`);
if (!ok) {
  console.error(`tsc(control)=${ctrlTsc.code} vitest(control)=${ctrlVitest.code} p1=${p1.code}`);
  console.error(p1.out.split('\n').filter((l) => l.includes('FAIL')).slice(0, 6).join('\n'));
}
process.exit(ok ? 0 : 1);
