#!/usr/bin/env node
// rb-20 ledger gates RM-4 (the recipe is fail-closed) + RM-5 (the new eval teeth BITE).
//
// NON-CIRCULARITY, which is the whole reason this file exists as a separate oracle
// (red-team finding 8). `evals/ci-gate-wiring.eval.mjs` pins the `a11y-e2e` recipe
// BYTE-EXACTLY in `A11Y_E2E_RECIPE_REGION`. That pin rejects EVERY mutation — including
// one whose author regenerated the pin, which is the documented edit procedure. A
// bite-proof that measured "was it rejected?" against the byte pin would therefore
// report a perfect score while proving nothing about the substring teeth.
//
// So every recipe mutant below is driven through `a11yHalf4IsFailClosed`, a pure
// substring/structural predicate that does NOT read `A11Y_E2E_RECIPE_REGION`, and the
// expectations in this file are hand-written here rather than derived from any constant
// in the eval. Same for the config mutants and `reducedMotionProjectIsWired`.
//
// CONTROLS come first and are load-bearing: a predicate that rejects EVERYTHING scores
// 19/19 on the mutants. The healthy tree must be ACCEPTED by all three predicates or the
// verdict is N regardless of the mutant tally.
//
// Nothing here writes to the worktree — every mutant is a string transformation applied
// in memory to a file already read. `rep()` THROWS when a mutation does not apply, so a
// silently-inert mutant (the measured "first-occurrence replace voids a bite-proof"
// failure) is reported as a survivor rather than as a pass.

import { readFileSync } from 'node:fs';
const WT = process.argv[2];
const m = await import(`${WT}/evals/ci-gate-wiring.eval.mjs`);
const cfg = readFileSync(`${WT}/client/playwright.config.ts`, 'utf8');
const jf = readFileSync(`${WT}/justfile`, 'utf8');
const ny = readFileSync(`${WT}/.github/workflows/nightly.yml`, 'utf8');

const rep = (t, a, b) => { const o = t.split(a).join(b); if (o === t) throw new Error(`mutation did not apply: ${a.slice(0,60)}`); return o; };

const mutants = [
  ['CFG-no-projects',   () => m.reducedMotionProjectIsWired(cfg.slice(0, cfg.indexOf('  projects: [')) + '});\n')],
  ['CFG-renamed',       () => m.reducedMotionProjectIsWired(rep(cfg, "name: 'reduced-motion'", "name: 'chromium-rm'"))],
  ['CFG-shorthand',     () => m.reducedMotionProjectIsWired(rep(cfg, "use: { contextOptions: { reducedMotion: 'reduce' } },", "use: { reducedMotion: 'reduce' },"))],
  ['CFG-no-preference', () => m.reducedMotionProjectIsWired(rep(cfg, "reducedMotion: 'reduce'", "reducedMotion: 'no-preference'"))],
  ['CFG-drop-testIgnore', () => m.reducedMotionProjectIsWired(rep(cfg, "{ name: 'default', testIgnore: 'reduced-motion.spec.ts' },", "{ name: 'default' },"))],
  ['CFG-drop-testMatch',() => m.reducedMotionProjectIsWired(rep(cfg, "      testMatch: 'reduced-motion.spec.ts',\n", ''))],
  ['CFG-widen-testMatch', () => m.reducedMotionProjectIsWired(rep(cfg, "testMatch: 'reduced-motion.spec.ts',", "testMatch: ['reduced-motion.spec.ts', 'a11y.spec.ts'],"))],
  // The two shapes the ARTIFACT red-team found that the original 19 were blind to.
  // Both were MEASURED green against the pre-fix predicate; CFG-spread-sibling also
  // typechecks clean, so `client-typecheck` would not have caught it either.
  ['CFG-spread-sibling', () => m.reducedMotionProjectIsWired(rep(cfg, "      use: { contextOptions: { reducedMotion: 'reduce' } },", "      ...({ contextOptions: { reducedMotion: 'reduce' } }),\n      use: {},"))],
  ['CFG-regex-widen-testMatch', () => m.reducedMotionProjectIsWired(rep(cfg, "testMatch: 'reduced-motion.spec.ts',", 'testMatch: [/reduced-motion.spec.ts$/, /a11y\\.spec\\.ts$/],'))],
  ['CFG-hoist-top',     () => m.reducedMotionProjectIsWired(rep(cfg, 'use: { baseURL: e2eBaseUrl, headless: true },', "use: { baseURL: e2eBaseUrl, headless: true, contextOptions: { reducedMotion: 'reduce' } },"))],
  ['CFG-decoy-key',     () => m.reducedMotionProjectIsWired(rep(cfg, "  testDir: './e2e',", "  testDir: './e2e',\n  metadata: { n: \"projects: [{ name: 'reduced-motion' }]\" },"))],
  ['JF-no-project-flag',() => m.a11yHalf4IsFailClosed(rep(jf, ' --project=reduced-motion', ''))],
  ['JF-reuse-path',     () => m.a11yHalf4IsFailClosed(rep(jf, '/tmp/a11y-e2e-rm.json', '/tmp/a11y-e2e-axe.json'))],
  ['JF-no-floor-cmp',   () => m.a11yHalf4IsFailClosed(rep(jf, "if (s.expected < floor) { console.error('a11y-e2e: reduced-motion tier reported ' + s.expected + ' passing test(s) — floor is ' + floor); process.exit(1) } ", ''))],
  ['JF-no-skipped',     () => m.a11yHalf4IsFailClosed(rep(jf, "if (s.unexpected !== 0 || s.flaky !== 0 || s.skipped !== 0) { console.error('a11y-e2e: reduced-motion tier", "if (s.unexpected !== 0 || s.flaky !== 0) { console.error('a11y-e2e: reduced-motion tier"))],
  ['JF-no-case-guard',  () => m.a11yHalf4IsFailClosed(rep(jf, '    case "{{rmfloor}}" in\n        \'\'|*[!0-9]*) echo "a11y-e2e: rmfloor \'{{rmfloor}}\' is not a non-negative integer" >&2; exit 64;;\n    esac\n', ''))],
  ['JF-no-rmfloor-param', () => m.a11yHalf4IsFailClosed(rep(jf, 'a11y-e2e floor="169" axefloor="3" rmfloor="2": wasm', 'a11y-e2e floor="169" axefloor="3": wasm'))],
  ['JF-console-reporter', () => m.a11yHalf4IsFailClosed(rep(jf, 'npx playwright test --project=reduced-motion --reporter=json', 'npx playwright test --project=reduced-motion --reporter=list'))],
  ['JF-floor-not-passed', () => m.a11yHalf4IsFailClosed(rep(jf, "console.log('A11Y-RM OK tests=' + s.expected + ' floor=' + floor + ' unexpected=0 flaky=0 skipped=0')\" -- \"{{rmfloor}}\"", "console.log('A11Y-RM OK tests=' + s.expected + ' floor=' + floor + ' unexpected=0 flaky=0 skipped=0')\""))],
  ['NY-artifact-drop',  () => m.a11yNightlyJobIsWired(rep(ny, '            /tmp/a11y-e2e-rm.json\n', ''))],
  ['NY-artifact-comment', () => m.a11yNightlyJobIsWired(rep(ny, '            /tmp/a11y-e2e-rm.json\n', '            # /tmp/a11y-e2e-rm.json\n'))],
];

console.log('--- CONTROLS (healthy tree must be ACCEPTED) ---');
let ctlBad = 0;
for (const [n, fn] of [['CFG', () => m.reducedMotionProjectIsWired(cfg)], ['JF', () => m.a11yHalf4IsFailClosed(jf)], ['NY', () => m.a11yNightlyJobIsWired(ny)]]) {
  const r = fn();
  console.log(`  CONTROL-${n}: ${r.ok ? 'ACCEPT (correct)' : `REJECT (WRONG) — ${r.reason}`}`);
  if (!r.ok) ctlBad += 1;
}

console.log('--- MUTANTS (each must be REJECTED) ---');
let caught = 0, survived = 0;
for (const [n, fn] of mutants) {
  let r;
  try { r = fn(); } catch (e) { console.log(`  ${n}: MUTATION FAILED TO APPLY — ${e.message}`); survived += 1; continue; }
  if (r.ok) { console.log(`  ${n}: SURVIVED (accepted!)`); survived += 1; }
  else { caught += 1; console.log(`  ${n}: caught — ${r.reason.slice(0, 105)}`); }
}
// --- RM-4: the recipe's SHAPE, asserted directly (not via a mutant), so the ledger
// line names which clause is missing rather than reporting an opaque tally.
const half4 = jf.slice(jf.indexOf('--- Half 4') === -1 ? 0 : jf.indexOf('--- Half 4'));
const ciLine = jf.split('\n').find((l) => l.startsWith('ci:')) ?? '';
const REQ = m.REQUIRED_JUST_STEPS ?? [];
const recipe = {
  half4: jf.includes('--project=reduced-motion') && jf.includes('Half 4') ? 'Y' : 'N',
  projectFlag: half4.includes('--project=reduced-motion') ? 'Y' : 'N',
  floorGuard: half4.includes('s.expected < floor') ? 'Y' : 'N',
  jsonReport: half4.includes('--reporter=json') && half4.includes('PLAYWRIGHT_JSON_OUTPUT_NAME') ? 'Y' : 'N',
  skipGuard: half4.includes('s.skipped !== 0') ? 'Y' : 'N',
  rmfloorGuard: jf.includes('case "{{rmfloor}}" in') ? 'Y' : 'N',
  artifactPath: ny.includes('/tmp/a11y-e2e-rm.json') ? 'Y' : 'N',
  // Nightly-only: the recipe must NOT be a `ci:` dependency and must NOT be a required step.
  notInCi: /\ba11y-e2e\b/.test(ciLine) ? 'N' : 'Y',
  notRequired: [...REQ].some((s) => String(s).includes('a11y-e2e')) ? 'N' : 'Y',
};
const recipeOk = Object.values(recipe).every((v) => v === 'Y');
console.log(
  `\nRB20-RECIPE half4=${recipe.half4} projectFlag=${recipe.projectFlag} floorGuard=${recipe.floorGuard} ` +
    `jsonReport=${recipe.jsonReport} skipGuard=${recipe.skipGuard} rmfloorGuard=${recipe.rmfloorGuard} ` +
    `artifactPath=${recipe.artifactPath} notInCi=${recipe.notInCi} notRequired=${recipe.notRequired} ` +
    `verdict=${recipeOk ? 'Y' : 'N'}`,
);

const biteOk = ctlBad === 0 && survived === 0;
console.log(
  `RB20-BITE-PROOF mutants=${mutants.length} caught=${caught}/${mutants.length} survived=${survived} controls=${3 - ctlBad}/3 verdict=${biteOk ? 'Y' : 'N'}`,
);
process.exit(biteOk && recipeOk ? 0 : 1);
