// rb-17 RED-phase teeth probe (tester deliverable, NOT part of `just ci`).
// Usage: node rb17-teeth-probe.mjs <abs-worktree-path>
//
// Drives every fixture in teeth.md through the PLANNED exports of
// evals/reduced-motion-purity.eval.mjs. Written against a signature that does not exist yet, on
// purpose: this must fail RED today, naming every missing export, and go GREEN only once the
// specialist ships the real functions with the real behaviour this file pins.
//
// AUTHORING CONSTRAINTS (measured hazards in this repo, see teeth.md and project memory):
//  - No backticks anywhere in this file (a stray backtick inside a template literal silently
//    terminates it with no parse error) -- every string below uses single quotes and `+`.
//  - No literal adjacent slash-star or star-slash pair anywhere in this file's own source text,
//    including inside comments or strings -- every CSS-comment-shaped fixture is assembled at
//    RUNTIME from single-character SLASH/STAR constants, exactly the `SLASH_STAR`/`STAR_SLASH`
//    idiom already shipped in evals/reduced-motion-hp-bar.eval.mjs.
//  - Never a bare `import()` without a try/catch: a missing module or a missing export must report
//    as a named FAILURE line, never an unhandled rejection or an uncaught TypeError.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { sep } from 'node:path';

const SLASH = '/';
const STAR = '*';

function main() {
  const worktree = process.argv[2];
  if (!worktree) {
    console.error('usage: node rb17-teeth-probe.mjs <abs-worktree-path>');
    process.exitCode = 2;
    return Promise.resolve();
  }

  let ok = 0;
  let fail = 0;
  const failures = [];

  function pass(id) {
    ok += 1;
  }
  function bad(id, detail) {
    fail += 1;
    failures.push(id + ': ' + detail);
  }
  function check(id, cond, detail) {
    if (cond) pass(id);
    else bad(id, detail);
  }

  /** Call fn(realFn) only if `obj[name]` is actually a function; otherwise record a named
   *  MISSING-EXPORT failure for `id` and never invoke fn. Keeps every fixture crash-proof against
   *  an export that does not exist yet. */
  function withFn(obj, name, id, fn) {
    const f = obj ? obj[name] : undefined;
    if (typeof f !== 'function') {
      bad(id, 'SKIPPED - export "' + name + '" is missing or not a function');
      return;
    }
    try {
      fn(f);
    } catch (e) {
      bad(id, 'THREW UNEXPECTEDLY - ' + (e && e.message ? e.message : String(e)));
    }
  }

  /** Same guard, but the fixture EXPECTS a throw; optionally pins a lower-cased substring of the
   *  thrown message. */
  function expectThrow(obj, name, id, arg, msgSubstr) {
    const f = obj ? obj[name] : undefined;
    if (typeof f !== 'function') {
      bad(id, 'SKIPPED - export "' + name + '" is missing or not a function');
      return;
    }
    let threw = false;
    let message = '';
    try {
      f(arg);
    } catch (e) {
      threw = true;
      message = e && e.message ? e.message : String(e);
    }
    if (!threw) {
      bad(id, 'expected a throw but none occurred');
      return;
    }
    if (msgSubstr && message.toLowerCase().indexOf(msgSubstr.toLowerCase()) === -1) {
      bad(id, 'threw, but message did not contain "' + msgSubstr + '" (got: ' + message + ')');
      return;
    }
    pass(id);
  }

  return (async () => {
    process.chdir(worktree);

    const purityPath = path.join(worktree, 'evals', 'reduced-motion-purity.eval.mjs');
    const shellPath = path.join(worktree, 'evals', 'a11y-static-shell.eval.mjs');

    let purity = null;
    let shell = null;
    try {
      purity = await import(pathToFileURL(purityPath).href);
    } catch (e) {
      bad('IMPORT-purity', 'could not import reduced-motion-purity.eval.mjs: ' + e.message);
      purity = {};
    }
    try {
      shell = await import(pathToFileURL(shellPath).href);
    } catch (e) {
      bad('IMPORT-shell', 'could not import a11y-static-shell.eval.mjs: ' + e.message);
      shell = {};
    }

    // ------------------------------------------------------------------
    // Upfront export-presence audit -- names every missing export loudly.
    // ------------------------------------------------------------------
    const REQUIRED_EXPORTS = [
      'MOTION_CENSUS_EXTS',
      'isCensusSource',
      'isCensusSpec',
      'listMotionCensusFiles',
      'censusDifference',
      'findMotionCustomProps',
      'findReadBackApis',
      'READ_BACK_TOKENS',
    ];
    for (const name of REQUIRED_EXPORTS) {
      const present = purity && Object.prototype.hasOwnProperty.call(purity, name) && purity[name] !== undefined;
      check(
        'EXPORT-' + name,
        present,
        'MISSING EXPORT: "' + name + '" is not exported by reduced-motion-purity.eval.mjs',
      );
    }

    // ==================================================================
    // A. CSS custom-property channel -- findMotionCustomProps
    // ==================================================================

    withFn(purity, 'findMotionCustomProps', 'e1', (f) => {
      const r = f('@media (prefers-reduced-motion: reduce){:root{--mr-reduce:1}}');
      check('e1', r.motionScopedRules === 1, 'motionScopedRules expected 1, got ' + r.motionScopedRules);
      check('e1', r.offenders.length === 1, 'offenders.length expected 1, got ' + r.offenders.length);
      if (r.offenders.length === 1) {
        check('e1', r.offenders[0].prop === '--mr-reduce', 'offender prop expected --mr-reduce, got ' + r.offenders[0].prop);
      }
    });

    withFn(purity, 'findMotionCustomProps', 'e2', (f) => {
      const r = f('@media (prefers-reduced-motion: no-preference){:root{--mr-reduce:0}}');
      check('e2', r.offenders.length === 1, 'the no-preference INVERSION was not flagged -- kills wrong-impl W2 (guardPreludeIsEquivalent alone)');
    });

    withFn(purity, 'findMotionCustomProps', 'e3', (f) => {
      const r = f('@supports (display: grid){@media (prefers-reduced-motion: reduce){:root{--mr-nested:1}}}');
      check('e3', r.offenders.length === 1, 'a custom prop nested TWO at-rules deep, with motion NOT at atStack[0], was not flagged');
      if (r.offenders.length === 1) {
        check('e3', r.offenders[0].atStack.length === 2, 'expected atStack.length 2, got ' + r.offenders[0].atStack.length);
      }
    });

    withFn(purity, 'findMotionCustomProps', 'e4', (f) => {
      const r = f('@media screen, (prefers-reduced-motion: reduce){:root{--mr-comma:1}}');
      check('e4', r.offenders.length === 1, 'a comma media-query list was not flagged -- kills exact-prelude-equality impls');
    });

    expectThrow(purity, 'findMotionCustomProps', 'e5', ':root{@media (prefers-reduced-motion:reduce){--mr-reduce:1}}');

    withFn(purity, 'findMotionCustomProps', 'e6', (f) => {
      const r = f('@MEDIA (PREFERS-REDUCED-MOTION: REDUCE){:root{--MR-UP:1}}');
      check('e6', r.offenders.length === 1, 'an UPPERCASE @MEDIA prelude was not flagged -- kills case-sensitive scans');
    });

    withFn(purity, 'findMotionCustomProps', 'e7', (f) => {
      let css;
      try {
        css = readFileSync('client/src/styles.css', 'utf8');
      } catch (e) {
        bad('e7', 'could not read client/src/styles.css: ' + e.message);
        return;
      }
      const r = f(css);
      check('e7', r.motionScopedRules === 1, 'real styles.css: motionScopedRules expected 1, got ' + r.motionScopedRules);
      check('e7', r.offenders.length === 0, 'real styles.css: offenders expected 0, got ' + r.offenders.length);
    });

    withFn(purity, 'findMotionCustomProps', 'e8', (f) => {
      const css = ':root{--mr-fg:#fff}' + '@media (prefers-contrast: more){:root{--mr-fg:#000}}';
      const r = f(css);
      check('e8', r.offenders.length === 0, 'prefers-contrast custom props were wrongly flagged -- kills W3 (blanket -- ban) and W5 (no atStack)');
    });

    withFn(purity, 'findMotionCustomProps', 'e9', (f) => {
      const commentOpen = SLASH + STAR;
      const commentClose = STAR + SLASH;
      const css =
        '@media (prefers-reduced-motion: reduce){' +
        commentOpen +
        ' --mr-reduce documented here ' +
        commentClose +
        ' .hp-fill{transition:none}}';
      const r = f(css);
      check('e9', r.offenders.length === 0, 'a CSS COMMENT naming --mr-reduce inside the guard was wrongly flagged');
    });

    withFn(purity, 'findMotionCustomProps', 'e10', (f) => {
      const r = f('@media (prefers-reduced-motion: reduce){.hp-fill{transition:none}}');
      check('e10', r.motionScopedRules === 1, 'the live .hp-fill guard shape in isolation: motionScopedRules expected 1');
      check('e10', r.offenders.length === 0, 'the live .hp-fill guard shape in isolation: offenders expected 0');
    });

    withFn(purity, 'findMotionCustomProps', 'e11', (f) => {
      const css = '.icon{content:"@media";background:url(logo@2x.png);}';
      const r = f(css);
      check('e11', r.motionScopedRules === 0, 'e11 real (non-motion) rule wrongly counted as motion-scoped');
      check('e11', r.offenders.length === 0, 'a quoted "@media" string / an unquoted url(...@2x.png) false-RED -- the @-refusal must be quote-and-url aware');
    });

    expectThrow(purity, 'findMotionCustomProps', 'e12', '@import url("x.css");' + '.a{color:red;}');

    withFn(purity, 'findMotionCustomProps', 'e13', (f) => {
      const r = f('@media (prefers-reduced-motion){:root{--mr-bool:1}}');
      check('e13', r.offenders.length === 1, 'the boolean-context guard form (no colon) was not flagged -- kills colon-anchored scans');
    });

    withFn(purity, 'findMotionCustomProps', 'e14', (f) => {
      const r = f('@media not (prefers-reduced-motion: no-preference){:root{--mr-not:1}}');
      check('e14', r.offenders.length === 1, 'the CORRECT (allow-listed) guard spelling still carrying a custom prop was not flagged');
    });

    expectThrow(purity, 'findMotionCustomProps', 'e15', '.icon{background:url(' + SLASH + STAR + ')}', 'url');

    withFn(purity, 'findMotionCustomProps', 'e16', (f) => {
      const r = f('@supports (display: grid){:root{--not-motion:1}}');
      check('e16', r.motionScopedRules === 0, 'a custom prop inside a NON-motion at-rule was wrongly counted as motion-scoped -- kills W10 (any-at-rule-scoped ban)');
      check('e16', r.offenders.length === 0, 'a custom prop inside a NON-motion at-rule was wrongly flagged -- kills W10');
    });

    // ==================================================================
    // B. JS/TS read-back channel -- findReadBackApis
    // ==================================================================

    withFn(purity, 'findReadBackApis', 'f1', (f) => {
      const hits = f("const v = getComputedStyle(el).getPropertyValue('--mr-reduce');");
      check('f1', hits.includes('getComputedStyle'), 'getComputedStyle not found in f1');
      check('f1', hits.includes('getPropertyValue'), 'getPropertyValue not found in f1');
    });

    withFn(purity, 'findReadBackApis', 'f2', (f) => {
      const hits = f('const r = document.styleSheets[0].cssRules;');
      check('f2', hits.includes('styleSheets'), 'styleSheets not found in f2 -- kills W7 (getComputedStyle-only ban)');
      check('f2', hits.includes('cssRules'), 'cssRules not found in f2 -- kills W7');
    });

    withFn(purity, 'findReadBackApis', 'f3', (f) => {
      const hits = f('const m = el.computedStyleMap();');
      check('f3', hits.includes('computedStyleMap'), 'computedStyleMap not found in f3 -- kills W7');
    });

    withFn(purity, 'findReadBackApis', 'f4', (f) => {
      const hits = f("el.style.transition = 'none';");
      check('f4', hits.length === 0, 'a plain inline style write was wrongly flagged as a read-back: ' + JSON.stringify(hits));
    });

    withFn(purity, 'findReadBackApis', 'f5', (f) => {
      const hits = f('const getComputedStyleCache = new Map();');
      check('f5', hits.length === 0, 'an identifier merely CONTAINING a banned token was flagged: ' + JSON.stringify(hits));
    });

    withFn(purity, 'findReadBackApis', 'f6a', (f) => {
      const commentSnippet = 'read getComputedStyle which needs Playwright';
      const hits = f(commentSnippet);
      check('f6a', hits.includes('getComputedStyle'), 'the detector itself failed to find getComputedStyle in raw text -- it must be RAW, not comment-blind');
    });
    withFn(purity, 'isCensusSource', 'f6b', (f) => {
      check('f6b', f('indexShell.test.ts') === false, 'isCensusSource(indexShell.test.ts) expected false');
    });
    withFn(purity, 'isCensusSpec', 'f6c', (f) => {
      check('f6c', f('indexShell.test.ts') === true, 'isCensusSpec(indexShell.test.ts) expected true');
    });

    withFn(purity, 'findReadBackApis', 'f7', (f) => {
      const hits = f("el.addEventListener('transitionrun', () => {});");
      check('f7', hits.includes('transitionrun'), 'transitionrun event-channel bypass not found in f7');
    });

    withFn(purity, 'findReadBackApis', 'f8', (f) => {
      const hits = f('document.getAnimations();');
      check('f8', hits.includes('getAnimations'), 'getAnimations bypass not found in f8');
    });

    if (Object.prototype.hasOwnProperty.call(purity, 'READ_BACK_TOKENS')) {
      const tokens = purity.READ_BACK_TOKENS;
      const expected = [
        'getComputedStyle',
        'getPropertyValue',
        'computedStyleMap',
        'currentStyle',
        'styleSheets',
        'cssRules',
        'getAnimations',
        'animationstart',
        'animationend',
        'animationcancel',
        'animationiteration',
        'transitionrun',
        'transitionstart',
        'transitionend',
        'transitioncancel',
      ];
      if (!Array.isArray(tokens)) {
        bad('f9', 'READ_BACK_TOKENS is not an array');
      } else {
        check('f9', Object.isFrozen(tokens), 'READ_BACK_TOKENS is not frozen');
        check('f9', tokens.length === 15, 'READ_BACK_TOKENS.length expected 15, got ' + tokens.length);
        const gotSet = tokens.slice().sort().join('|');
        const wantSet = expected.slice().sort().join('|');
        check('f9', gotSet === wantSet, 'READ_BACK_TOKENS set mismatch. got=[' + gotSet + '] want=[' + wantSet + ']');
      }
    } else {
      bad('f9', 'SKIPPED - export "READ_BACK_TOKENS" is missing');
    }

    // ==================================================================
    // C. Census scope
    // ==================================================================

    if (Object.prototype.hasOwnProperty.call(purity, 'MOTION_CENSUS_EXTS')) {
      const exts = purity.MOTION_CENSUS_EXTS;
      if (!Array.isArray(exts)) {
        bad('g0', 'MOTION_CENSUS_EXTS is not an array');
      } else {
        check('g0', Object.isFrozen(exts), 'MOTION_CENSUS_EXTS is not frozen');
        check(
          'g0',
          JSON.stringify(exts) === JSON.stringify(['.ts', '.tsx', '.js', '.mjs', '.cjs']),
          'MOTION_CENSUS_EXTS expected [.ts,.tsx,.js,.mjs,.cjs], got ' + JSON.stringify(exts),
        );
      }
    } else {
      bad('g0', 'SKIPPED - export "MOTION_CENSUS_EXTS" is missing');
    }

    withFn(purity, 'isCensusSource', 'g1', (f) => {
      check('g1', f('ui/x.js') === true, 'isCensusSource(ui/x.js) expected true');
    });

    withFn(purity, 'isCensusSource', 'g2', (f) => {
      check(
        'g2',
        f('module_bindings/index.ts') === true,
        'isCensusSource(module_bindings/index.ts) expected true -- this is the 65-file loosening rb-17 refuses',
      );
    });

    withFn(purity, 'isCensusSource', 'g3', (f) => {
      check('g3', f('foo.test.ts.bak') === false, 'isCensusSource(foo.test.ts.bak) expected false (fails the bundled-ext gate)');
    });
    withFn(purity, 'isCensusSpec', 'g3', (f) => {
      check('g3', f('foo.test.ts.bak') === false, 'isCensusSpec(foo.test.ts.bak) expected false (fails the bundled-ext gate)');
    });

    withFn(purity, 'isCensusSource', 'g3b', (f) => {
      check(
        'g3b',
        f('ui/foo.test.ts.bak.ts') === true,
        'isCensusSource(ui/foo.test.ts.bak.ts) expected true -- kills a .includes(".test.ts") exclusion check',
      );
    });

    withFn(purity, 'isCensusSpec', 'g4a', (f) => {
      check('g4a', f('ui/x.test.tsx') === true, 'isCensusSpec(ui/x.test.tsx) expected true');
    });
    withFn(purity, 'isCensusSource', 'g4b', (f) => {
      check('g4b', f('ui/x.test.tsx') === false, 'isCensusSource(ui/x.test.tsx) expected false');
    });

    withFn(purity, 'censusDifference', 'g5', (f) => {
      const fwd = f(['a.ts', 'module_bindings/x.ts'], ['a.ts']);
      check('g5', JSON.stringify(fwd) === JSON.stringify(['module_bindings/x.ts']), 'g5 forward diff mismatch: ' + JSON.stringify(fwd));
      const rev = f(['a.ts'], ['a.ts', 'module_bindings/x.ts']);
      check('g5', JSON.stringify(rev) === JSON.stringify([]), 'g5 reverse diff expected [], got ' + JSON.stringify(rev));
      const sortCase = f(['z.ts', 'module_bindings/m.ts', 'module_bindings/a.ts'], ['z.ts']);
      check(
        'g5',
        JSON.stringify(sortCase) === JSON.stringify(['module_bindings/a.ts', 'module_bindings/m.ts']),
        'g5 sort-order mismatch (must be alphabetical, not insertion order): ' + JSON.stringify(sortCase),
      );
    });

    // g6 -- real tree
    let censusFiles = null;
    withFn(purity, 'listMotionCensusFiles', 'g6', (f) => {
      censusFiles = f('client/src');
      check('g6', censusFiles.length === 157, 'listMotionCensusFiles(client/src).length expected 157, got ' + censusFiles.length);
    });

    let sourceFiles = null;
    withFn(shell, 'listClientSourceFiles', 'g6', (f) => {
      sourceFiles = f('client/src');
      check('g6', sourceFiles.length === 92, 'listClientSourceFiles(client/src).length expected 92, got ' + sourceFiles.length);
    });

    if (censusFiles && sourceFiles && purity.censusDifference) {
      try {
        const diff1 = purity.censusDifference(censusFiles, sourceFiles);
        check('g6', diff1.length === 65, 'censusDifference(census, source).length expected 65, got ' + diff1.length);
        check(
          'g6',
          diff1.every((p) => p.indexOf('module_bindings/') === 0),
          'censusDifference(census, source) contains a non-module_bindings entry',
        );
        const diff2 = purity.censusDifference(sourceFiles, censusFiles);
        check('g6', diff2.length === 0, 'censusDifference(source, census).length expected 0, got ' + diff2.length);
      } catch (e) {
        bad('g6', 'THREW UNEXPECTEDLY computing census differences - ' + e.message);
      }
    } else {
      bad('g6', 'SKIPPED - listMotionCensusFiles / listClientSourceFiles / censusDifference not all available');
    }

    if (Object.prototype.hasOwnProperty.call(purity, 'isCensusSpec') && typeof purity.isCensusSpec === 'function') {
      try {
        const entries = readdirSync('client/src', { recursive: true })
          .map((entry) => String(entry).split(sep).join('/'))
          .filter((rel) => {
            try {
              return statSync('client/src/' + rel).isFile();
            } catch (e) {
              return false;
            }
          });
        const specCount = entries.filter((rel) => purity.isCensusSpec(rel)).length;
        check('g6', specCount === 96, 'independent recursive spec count expected 96, got ' + specCount);
        if (censusFiles) {
          check('g6', censusFiles.length + specCount === 253, '157+96 identity broke: census=' + censusFiles.length + ' spec=' + specCount);
        }
      } catch (e) {
        bad('g6', 'THREW UNEXPECTEDLY computing the independent spec count - ' + e.message);
      }
    } else {
      bad('g6', 'SKIPPED - isCensusSpec not available for the independent spec count');
    }

    if (fail > 0) {
      for (const line of failures) {
        console.log('RB17-TEETH FAIL ' + line);
      }
    }
    console.log('RB17-TEETH ok=' + ok + ' fail=' + fail + ' verdict=' + (fail === 0 ? 'Y' : 'N'));
    process.exitCode = fail === 0 ? 0 : 1;
  })();
}

main().catch((e) => {
  console.log('RB17-TEETH FAIL UNCAUGHT: ' + (e && e.stack ? e.stack : String(e)));
  console.log('RB17-TEETH ok=0 fail=1 verdict=N');
  process.exitCode = 1;
});
