#!/usr/bin/env node
// rb-19 bite-proof — the acceptance ledger's executable oracle.
//
// Every mode prints ONE machine-readable verdict line and exits 0/1. The ledger's
// EXPECT strings match those lines, so a partial run cannot be mistaken for a pass.
//
// It lives OUTSIDE the project repo on purpose (the rb-18 precedent): the slice's
// declared `touches:` set does not include a new file under `evals/`, and a
// throwaway there would also be picked up by nobody while still being repo noise.
//
//   node rb-19.bite-proof.mjs <worktree>                 -> RB19-BITE-PROOF ...
//   node rb-19.bite-proof.mjs <worktree> --recipe        -> RB19-RECIPE ...
//   node rb-19.bite-proof.mjs <worktree> --nightly-only  -> RB19-NIGHTLY-ONLY ...
//   node rb-19.bite-proof.mjs <worktree> --nightly-job   -> RB19-NIGHTLY-JOB ...
//   node rb-19.bite-proof.mjs <worktree> --red-before    -> RB19-RED-BEFORE ...
//
// DOCTRINE THIS FILE FOLLOWS, because this repo has measured each failure:
//  * Every mutant is pinned by the FAILURE LABEL its target clause emits, never by
//    exit code. `expect()`-style predicates return on the FIRST failed clause, so a
//    coarse mutant caught by a NEIGHBOURING clause proves nothing about its target.
//  * Every textual mutation asserts it actually applied (occurrence count === 1).
//    A first-occurrence replace that silently does not apply reads exactly like
//    "the gate accepted the cheat".
//  * A mutant whose target clause is hollowed must SURVIVE; that is what makes the
//    tally meaningful rather than decorative.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const mode = process.argv[3] ?? '--bite';

const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const EVAL_REL = 'evals/ci-gate-wiring.eval.mjs';
const SPEC_REL = 'client/e2e/a11y.spec.ts';

function fail(line) {
  console.log(line);
  process.exit(1);
}

/** Replace exactly one occurrence; throw loudly if the anchor is absent or ambiguous. */
function mutate(text, needle, replacement) {
  const n = text.split(needle).length - 1;
  if (n !== 1) {
    throw new Error(
      `mutation anchor occurs ${n} time(s), expected exactly 1: ${JSON.stringify(needle.slice(0, 80))}`,
    );
  }
  return text.split(needle).join(replacement);
}

const evalMod = await import(path.join(root, EVAL_REL));

// ---------------------------------------------------------------------------
// --bite : mutate the PAYLOAD (the spec, the recipe body, the dependency) and
// require each mutant to be caught by ITS OWN clause, identified by label.
// ---------------------------------------------------------------------------
async function modeBite() {
  const spec = read(SPEC_REL);
  const justfile = read('justfile');
  const pkg = read('client/package.json');
  const lock = read('client/package-lock.json');

  // Sanity: the UNMUTATED inputs must be accepted, or every "caught" below is
  // just the gate being broken rather than the mutant being seen.
  for (const [what, r] of [
    ['spec', evalMod.a11ySpecUsesAxe(spec)],
    ['recipe', evalMod.a11yRecipeBodyIntact(justfile)],
    ['dep', evalMod.clientDeclaresAxeDep(pkg, lock)],
  ]) {
    if (!r.ok) fail(`RB19-BITE-PROOF CONTROL-FAILED (${what}): ${r.reason}`);
  }

  /** @type {{id: string, run: () => {ok: boolean, reason?: string}, label: string}[]} */
  const mutants = [
    // --- the spec (a11ySpecUsesAxe) -----------------------------------------
    {
      id: 'M1-no-import',
      label: '@axe-core/playwright',
      run: () =>
        evalMod.a11ySpecUsesAxe(
          mutate(spec, "import AxeBuilder from '@axe-core/playwright';\n", ''),
        ),
    },
    {
      id: 'M2-never-analyzed',
      label: ".analyze()",
      run: () => evalMod.a11ySpecUsesAxe(mutate(spec, '.exclude(\'canvas\').analyze()', ".exclude('canvas')")),
    },
    {
      id: 'M3-violations-unasserted',
      label: "'violations'",
      run: () =>
        evalMod.a11ySpecUsesAxe(
          mutate(spec, 'results.violations.map((v) => v.id),', 'RESULTS_VIOLATIONS_REMOVED,'),
        ),
    },
    {
      id: 'M4-no-passes-floor',
      label: 'passes',
      run: () =>
        evalMod.a11ySpecUsesAxe(
          mutate(spec, 'results.passes.length,', 'PASSES_FLOOR_REMOVED,').split('passes').join('pxsses'),
        ),
    },
    {
      id: 'M5-drops-wcag2aa',
      label: 'wcag2aa',
      run: () => evalMod.a11ySpecUsesAxe(mutate(spec, "'wcag2aa', ", '')),
    },
    {
      id: 'M6-no-incomplete-ceiling',
      label: 'incomplete',
      run: () => evalMod.a11ySpecUsesAxe(spec.split('incomplete').join('unfinished')),
    },
    {
      id: 'M7-one-state-only',
      label: 'Shift+Slash',
      run: () => evalMod.a11ySpecUsesAxe(mutate(spec, "page.keyboard.press('Shift+Slash')", 'noop()')),
    },
    {
      id: 'M8-menu-state-dropped',
      label: 'KeyM',
      run: () => evalMod.a11ySpecUsesAxe(mutate(spec, "page.keyboard.press('KeyM')", 'noop()')),
    },
    {
      id: 'M9-tokens-only-in-comments',
      label: 'comment-stripper',
      run: () =>
        evalMod.a11ySpecUsesAxe(
          spec
            .split('\n')
            .map((l) => `// ${l}`)
            .join('\n'),
        ),
    },
    // --- the recipe (a11yRecipeBodyIntact) ----------------------------------
    {
      id: 'M10-half3-deleted',
      label: "'playwright test'",
      run: () =>
        evalMod.a11yRecipeBodyIntact(
          mutate(justfile, 'npx playwright test e2e/a11y.spec.ts --reporter=json', 'true'),
        ),
    },
    {
      id: 'M11-scans-another-spec',
      label: 'e2e/a11y.spec.ts',
      run: () =>
        evalMod.a11yRecipeBodyIntact(
          mutate(justfile, 'npx playwright test e2e/a11y.spec.ts --reporter=json', 'npx playwright test e2e/golden.spec.ts --reporter=json'),
        ),
    },
    {
      id: 'M12-verdict-marker-gone',
      label: 'A11Y-AXE OK',
      run: () => evalMod.a11yRecipeBodyIntact(mutate(justfile, "'A11Y-AXE OK tests='", "'axe done tests='")),
    },
    {
      id: 'M13-stale-deferred-restored',
      label: 'DEFERRED: axe-core',
      run: () =>
        evalMod.a11yRecipeBodyIntact(
          mutate(
            justfile,
            '    rm -f /tmp/a11y-e2e-axe.json\n',
            '    echo "DEFERRED: axe-core + real-browser tier is NOT run here (m23-s11 ledger X10/X11)."\n    rm -f /tmp/a11y-e2e-axe.json\n',
          ),
        ),
    },
    // --- the dependency (clientDeclaresAxeDep) ------------------------------
    {
      id: 'M14-caret-range',
      label: 'EXACT version',
      run: () =>
        evalMod.clientDeclaresAxeDep(
          mutate(pkg, '"@axe-core/playwright": "4.13.0"', '"@axe-core/playwright": "^4.13.0"'),
          lock,
        ),
    },
    {
      id: 'M15-runtime-dependency',
      label: 'runtime dependency',
      run: () => {
        const o = JSON.parse(pkg);
        const v = o.devDependencies['@axe-core/playwright'];
        delete o.devDependencies['@axe-core/playwright'];
        o.dependencies['@axe-core/playwright'] = v;
        return evalMod.clientDeclaresAxeDep(JSON.stringify(o, null, 2), lock);
      },
    },
    {
      id: 'M16-absent-from-lockfile',
      label: 'package-lock.json',
      run: () => evalMod.clientDeclaresAxeDep(pkg, lock.split('@axe-core/playwright').join('@axe-core/absent')),
    },
  ];

  const survived = [];
  const misattributed = [];
  let caught = 0;
  for (const m of mutants) {
    let r;
    try {
      r = m.run();
    } catch (e) {
      fail(`RB19-BITE-PROOF MUTANT-BROKEN ${m.id}: ${e.message}`);
    }
    if (r.ok) {
      survived.push(m.id);
      continue;
    }
    if (String(r.reason).indexOf(m.label) === -1) {
      // Caught, but by the WRONG clause — the target tooth may be hollow.
      misattributed.push(`${m.id} (expected label ${JSON.stringify(m.label)}, got: ${r.reason})`);
      continue;
    }
    caught += 1;
  }

  const ok = survived.length === 0 && misattributed.length === 0;
  const line = `RB19-BITE-PROOF mutants=${mutants.length} caught=${caught}/${mutants.length} survived=${survived.length} verdict=${ok ? 'Y' : 'N'}`;
  if (!ok) {
    console.error(`survived: ${survived.join(', ') || '(none)'}`);
    console.error(`misattributed: ${misattributed.join(' | ') || '(none)'}`);
    fail(line);
  }
  console.log(line);
}

// ---------------------------------------------------------------------------
// --recipe : Half 3 is wired, the region pin agrees byte for byte, and the
// now-false DEFERRED banner is gone from the shipped recipe.
// ---------------------------------------------------------------------------
function modeRecipe() {
  const justfile = read('justfile');
  const intact = evalMod.a11yRecipeBodyIntact(justfile);
  const pinned = evalMod.a11yRecipeBodyIsPinned(justfile);
  // Scan the RECIPE REGION, not the whole file: the surrounding prose legitimately
  // discusses the banner's history, and a whole-file scan would forbid saying so.
  const region = evalMod.A11Y_E2E_RECIPE_REGION;
  const staleGone = region.indexOf('DEFERRED: axe-core') === -1 && justfile.indexOf('echo "DEFERRED: axe-core') === -1;
  const ok = intact.ok && pinned.ok && staleGone;
  const line = `RB19-RECIPE intact=${intact.ok ? 'Y' : 'N'} pinned=${pinned.ok ? 'Y' : 'N'} staleDeferredGone=${staleGone ? 'Y' : 'N'} verdict=${ok ? 'Y' : 'N'}`;
  if (!ok) {
    if (!intact.ok) console.error(`intact: ${intact.reason}`);
    if (!pinned.ok) console.error(`pinned: ${pinned.reason}`);
    fail(line);
  }
  console.log(line);
}

// ---------------------------------------------------------------------------
// --nightly-only : the invariant the launch brief states in the negative.
// `a11y-e2e` never enters REQUIRED_JUST_STEPS and never becomes a `ci:` dep.
// REQUIRED_JUST_STEPS is compared against origin/master BYTE FOR BYTE rather than
// merely searched for 'a11y-e2e': the point is that this slice did not touch it.
// ---------------------------------------------------------------------------
function modeNightlyOnly() {
  const masterEval = execFileSync('git', ['-C', root, 'show', `origin/master:${EVAL_REL}`], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const grab = (t) => {
    const i = t.indexOf('export const REQUIRED_JUST_STEPS = [');
    if (i === -1) throw new Error('REQUIRED_JUST_STEPS not found');
    const j = t.indexOf('];', i);
    if (j === -1) throw new Error('REQUIRED_JUST_STEPS unterminated');
    return t.slice(i, j + 2);
  };
  const unchanged = grab(masterEval) === grab(read(EVAL_REL));

  // The recipe GRAPH, from `just` itself — not a grep of the justfile text.
  const dump = execFileSync('just', ['--unstable', '--dump', '--dump-format', 'json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const recipes = JSON.parse(dump).recipes;
  const ciDeps = (recipes.ci?.dependencies ?? []).map((d) => d.recipe ?? d);
  const notInCi = !ciDeps.includes('a11y-e2e');
  // Belt: nothing `ci:` depends on may itself pull the axe tier in transitively.
  const seen = new Set();
  const walk = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const d of (recipes[n]?.dependencies ?? []).map((d) => d.recipe ?? d)) walk(d);
  };
  walk('ci');
  const notTransitive = !seen.has('a11y-e2e');

  const ok = unchanged && notInCi && notTransitive;
  const line = `RB19-NIGHTLY-ONLY requiredStepsUnchanged=${unchanged ? 'Y' : 'N'} notInCiRecipe=${notInCi && notTransitive ? 'Y' : 'N'} verdict=${ok ? 'Y' : 'N'}`;
  if (!ok) {
    console.error(`ci deps (transitive): ${[...seen].join(', ')}`);
    fail(line);
  }
  console.log(line);
}

// ---------------------------------------------------------------------------
// --nightly-job : the recipe is INVOKED by the nightly workflow un-neutered, the
// job block matches its verbatim pin, and both of the attacks the pin exists for
// are executed rather than asserted about.
// ---------------------------------------------------------------------------
function modeNightlyJob() {
  const yaml = read('.github/workflows/nightly.yml');
  const wired = evalMod.a11yNightlyJobIsWired(yaml);
  const pinned = evalMod.a11yNightlyJobIsPinned(yaml);

  // ATTACK 1: soft-fail the gate step. A truthy continue-on-error makes the whole
  // tier advisory, which spec §5.7 forbids in as many words.
  const coeYaml = mutate(
    yaml,
    '      - run: just a11y-e2e\n',
    '      - run: just a11y-e2e\n        continue-on-error: true\n',
  );
  const coeBites = !evalMod.a11yNightlyJobIsWired(coeYaml).ok;

  // ATTACK 2: a PATH shim planted ahead of the gate. The job appends to
  // $GITHUB_PATH before running the gate, so a step that puts a fake `spacetime`
  // (or `npx`) earlier on PATH would make half 3 pass against nothing. Only the
  // verbatim job-block pin can see this — asserted, not assumed.
  const shimYaml = mutate(
    yaml,
    '      - run: just a11y-e2e\n',
    '      - run: echo shim > /usr/local/bin/spacetime\n      - run: just a11y-e2e\n',
  );
  const shimBites = !evalMod.a11yNightlyJobIsPinned(shimYaml).ok;

  const ok = wired.ok && pinned.ok && coeBites && shimBites;
  const line = `RB19-NIGHTLY-JOB wired=${wired.ok ? 'Y' : 'N'} pinned=${pinned.ok ? 'Y' : 'N'} coeBites=${coeBites ? 'Y' : 'N'} shimBites=${shimBites ? 'Y' : 'N'} verdict=${ok ? 'Y' : 'N'}`;
  if (!ok) {
    if (!wired.ok) console.error(`wired: ${wired.reason}`);
    if (!pinned.ok) console.error(`pinned: ${pinned.reason}`);
    fail(line);
  }
  console.log(line);
}

// ---------------------------------------------------------------------------
// --red-before : ADR-0010. The gate must RED on the pre-fix tree and PASS after.
// Constructed, not asserted: origin/master is exported to a temp dir, ONLY this
// slice's eval file is dropped in, and the eval is executed there.
// ---------------------------------------------------------------------------
function modeRedBefore() {
  const dir = mkdtempSync(path.join(tmpdir(), 'rb19-redbefore-'));
  const tar = execFileSync('git', ['-C', root, 'archive', 'origin/master'], {
    maxBuffer: 256 * 1024 * 1024,
  });
  execFileSync('tar', ['-x', '-C', dir], { input: tar, maxBuffer: 256 * 1024 * 1024 });
  writeFileSync(path.join(dir, EVAL_REL), read(EVAL_REL));

  const run = (cwd) => {
    try {
      const out = execFileSync(process.execPath, [EVAL_REL], { cwd, encoding: 'utf8' });
      return { code: 0, out };
    } catch (e) {
      return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  };

  const before = run(dir);
  const after = run(root);
  // The RED must be the AXE tier's absence, not an unrelated breakage.
  const redForTheRightReason =
    before.code !== 0 &&
    (before.out.indexOf('playwright test') !== -1 || before.out.indexOf('a11y.spec.ts') !== -1);
  const passAfter = after.code === 0 && after.out.indexOf('a11y axe tier wired') !== -1;

  const ok = redForTheRightReason && passAfter;
  const line = `RB19-RED-BEFORE preFix=${before.code !== 0 ? 'RED' : 'GREEN'} postFix=${after.code === 0 ? 'PASS' : 'FAIL'} verdict=${ok ? 'Y' : 'N'}`;
  if (!ok) {
    console.error(`pre-fix output: ${before.out.trim().slice(0, 600)}`);
    console.error(`post-fix output: ${after.out.trim().slice(0, 600)}`);
    fail(line);
  }
  console.log(line);
  console.log(`  pre-fix RED said: ${before.out.trim().split('\n')[0].slice(0, 220)}`);
}

switch (mode) {
  case '--bite':
    await modeBite();
    break;
  case '--recipe':
    modeRecipe();
    break;
  case '--nightly-only':
    modeNightlyOnly();
    break;
  case '--nightly-job':
    modeNightlyJob();
    break;
  case '--red-before':
    modeRedBefore();
    break;
  default:
    console.error(`unknown mode ${mode}`);
    process.exit(64);
}
