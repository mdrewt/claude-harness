#!/usr/bin/env node
/**
 * rb-15 (R-m23-s10-X18) — mutation bite-proof harness for gate X9 (ADR-0010 proof-of-teeth).
 *
 * Each declared mutant is applied to a PRISTINE `git archive` extraction of the slice branch,
 * NEVER to the live worktree — `git checkout -- <dir>` inside a mutation loop has twice wiped
 * uncommitted gate work in this repo, and a copy has no such failure mode.
 *
 * Every mutant is VERIFIED TO HAVE ACTUALLY APPLIED before its result is read: a silently
 * unapplied `String.replace` is indistinguishable from "the gate accepted the cheat".
 *
 * Each mutant pins the NAMED tooth it must red. Pinning only "something went red" cannot tell a
 * hollowed target tooth from a neighbour catching the same mutant.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-15';
const EVAL_REL = 'evals/a11y-static-shell.eval.mjs';
const TS_REL = 'client/src/indexShell.test.ts';
const CSS_REL = 'client/src/styles.css';

const SANDBOX = mkdtempSync(path.join(tmpdir(), 'rb15-mut-'));
execFileSync('bash', [
  '-c',
  `git -C ${WT} archive HEAD | tar -x -C ${SANDBOX}`,
]);
symlinkSync(`${WT}/client/node_modules`, `${SANDBOX}/client/node_modules`);
const PRISTINE = new Map();
for (const rel of [EVAL_REL, TS_REL, CSS_REL]) {
  PRISTINE.set(rel, readFileSync(path.join(SANDBOX, rel), 'utf8'));
}
const NEW_FILES = [];
function restore() {
  for (const [rel, txt] of PRISTINE) writeFileSync(path.join(SANDBOX, rel), txt);
  for (const f of NEW_FILES.splice(0)) if (existsSync(f)) rmSync(f);
}

const PATH_ENV = `${process.env.HOME}/.asdf/shims:${process.env.HOME}/.cargo/bin:${process.env.PATH}`;

/** Run the eval; returns `{ red, text }`. A THROW is a red too, but a named one is better. */
function runEval() {
  try {
    const out = execFileSync(
      'node',
      [
        '-e',
        `import('./${EVAL_REL}').then(m=>m.default()).then(r=>{console.log(JSON.stringify({pass:r.pass,detail:r.detail}))}).catch(e=>{console.log(JSON.stringify({pass:false,detail:'THREW: '+e.message}))})`,
      ],
      { cwd: SANDBOX, env: { ...process.env, PATH: PATH_ENV }, encoding: 'utf8' },
    );
    const r = JSON.parse(out.trim().split('\n').pop());
    return { red: r.pass === false, text: r.detail };
  } catch (e) {
    return { red: true, text: `HARNESS-THREW: ${e.message}` };
  }
}

/** Run the vitest spec; returns `{ red, text }` where text concatenates failing titles+messages. */
function runVitest() {
  const outFile = path.join(SANDBOX, 'vitest.json');
  try {
    execFileSync(
      'npx',
      ['vitest', 'run', 'src/indexShell.test.ts', '--reporter=json', `--outputFile=${outFile}`],
      {
        cwd: path.join(SANDBOX, 'client'),
        env: { ...process.env, PATH: PATH_ENV },
        stdio: 'ignore',
      },
    );
  } catch {
    /* non-zero exit is expected for a red run; the JSON is what we read */
  }
  if (!existsSync(outFile)) return { red: true, text: 'NO-JSON (spec failed to load)' };
  const r = JSON.parse(readFileSync(outFile, 'utf8'));
  const all = r.testResults.flatMap((f) => f.assertionResults);
  // A MISSING spec file reports numTotalTests:0 and EXITS 0 — that is not a red, it is a vacuum.
  if (r.numTotalTests === 0) return { red: true, text: 'ZERO-TESTS (vacuous run)' };
  const bad = all.filter((a) => a.status !== 'passed');
  return {
    red: bad.length > 0,
    text: bad.map((a) => `${a.title} :: ${(a.failureMessages[0] || '').slice(0, 2000)}`).join('\n'),
  };
}

/** Text edits. `count` is the exact number of occurrences required BEFORE the edit. */
const sub = (rel, find, replace, count = 1) => ({ rel, find, replace, count });
const NEW = (rel, body) => ({ rel, create: body });

const MUTANTS = [
  {
    id: 'M1',
    why: 're-paste a local `function findIdSelectors(` into the .ts',
    tooth: 'RB15-G1',
    gate: 'vitest',
    needle: 'LOCAL-DEF findIdSelectors',
    edits: [
      sub(
        TS_REL,
        'function readStylesCss(): string {',
        'function findIdSelectors(src: string): string[] {\n  return src.length > 0 ? [] : [];\n}\n\nfunction readStylesCss(): string {',
      ),
    ],
  },
  {
    id: 'M2',
    why: 'the SAME text, but inside a comment — the comment strip must make this INERT',
    tooth: 'RB15-G1 (GREEN control)',
    gate: 'vitest',
    expectGreen: true,
    edits: [
      sub(
        TS_REL,
        'function readStylesCss(): string {',
        '// function findIdSelectors(src: string): string[] { return []; }\nfunction readStylesCss(): string {',
      ),
    ],
  },
  {
    id: 'M3',
    why: 'a `const NAME =` SHADOW in the .ts — not a function declaration, so the LOCAL-ASSIGN half is the only catcher',
    tooth: 'RB15-G1 (LOCAL-ASSIGN half)',
    gate: 'vitest',
    needle: 'LOCAL-ASSIGN srOnlyIsAccessible',
    edits: [
      sub(
        TS_REL,
        'function readStylesCss(): string {',
        'const srOnlyIsAccessible = (_s: string) => ({ ok: true, reasons: [], declCount: 9 });\nvoid srOnlyIsAccessible;\n\nfunction readStylesCss(): string {',
      ),
    ],
  },
  {
    id: 'M4',
    why: "red-team C1 — an object-method-shorthand twin. Not a `function` declaration, so the shape ban is blind",
    tooth: 'RB15-G4 (census)',
    gate: 'vitest',
    needle: 'MEMBER-ACCESS-MISSING findIdSelectors',
    edits: [
      sub(
        TS_REL,
        'function readStylesCss(): string {',
        'const rb15Twin = {\n  findIdSelectors(_s: string): string[] {\n    return [];\n  },\n};\nvoid rb15Twin;\n\nfunction readStylesCss(): string {',
      ),
    ],
  },
  {
    id: 'M5',
    why: 'red-team C4 — `Object.assign` makes a MUTABLE copy of the namespace; every member access downstream then looks legal',
    tooth: 'RB15-G4 (namespace integrity)',
    gate: 'vitest',
    needle: 'NAMESPACE-ESCAPE',
    edits: [
      sub(
        TS_REL,
        'function readStylesCss(): string {',
        'const rb15Copy = Object.assign({}, rb12CssStripperOracle);\nvoid rb15Copy;\n\nfunction readStylesCss(): string {',
      ),
    ],
  },
  {
    id: 'M6',
    why: 'red-team C8 — a POISONED namespace spread, the forgery the plan’s own Biome mitigation invited',
    tooth: 'RB15-G4 (namespace integrity)',
    gate: 'vitest',
    needle: 'NAMESPACE-ESCAPE',
    edits: [
      sub(
        TS_REL,
        'function readStylesCss(): string {',
        'const rb15Poisoned = { ...rb12CssStripperOracle, findIdSelectors: () => [] };\nvoid rb15Poisoned;\n\nfunction readStylesCss(): string {',
      ),
    ],
  },
  {
    id: 'M7',
    why: 'red-team C9 — a sibling *.test.ts twin. `listClientSourceFiles` excludes .test.ts BY DESIGN, which is exactly the blind spot',
    tooth: 'T-OWN (spec walk)',
    gate: 'eval',
    needle: 'cssOracleTwin.test.ts',
    edits: [
      NEW(
        'client/src/cssOracleTwin.test.ts',
        'export function findIdSelectors(_src: string): string[] {\n  return [];\n}\n',
      ),
    ],
  },
  {
    id: 'M8',
    why: 'gut findIdSelectors to `return []` — the real-file assertion is "empty", which a stub satisfies',
    tooth: 'T-CTRL1',
    gate: 'eval',
    needle: 'CONTROL: findIdSelectors did not flag',
    edits: [
      sub(
        EVAL_REL,
        'export function findIdSelectors(src) {\n  return parseCssRules(src)',
        'export function findIdSelectors(src) {\n  if (src.length >= 0) return [];\n  return parseCssRules(src)',
      ),
    ],
  },
  {
    id: 'M9',
    why: 'parseCssRules emits only at brace depth 0 — a DEPTH-0 liveness probe would miss this, which is why T-LIVE1 is @media-nested',
    tooth: 'id/bad/media-nested',
    gate: 'eval',
    needle: 'fixture "id/bad/media-nested"',
    edits: [
      sub(
        EVAL_REL,
        "      if (frame.kind === 'style') {",
        "      if (frame.kind === 'style' && stack.length === 0) {",
      ),
    ],
  },
  {
    id: 'M10',
    why: 'drop content-visibility from the deny-list — MEASURED to produce the identical AX-absent outcome',
    tooth: 'sr/bad/content-visibility-hidden',
    gate: 'eval',
    needle: 'content-visibility',
    edits: [
      sub(EVAL_REL, "  ['content-visibility', 'hidden', SR_ONLY_REASON_CONTENT_VIS],\n", ''),
    ],
  },
  {
    id: 'M11',
    why: 'bypass stripImportant — a false GREEN and a false RED from one bug; A7a pinned only ONE direction',
    tooth: 'sr/bad/display-none-important + sr/good/position-absolute-important',
    gate: 'eval',
    needle: 'important',
    edits: [
      sub(
        EVAL_REL,
        "function stripImportant(value) {\n  const bang = value.lastIndexOf('!');",
        "function stripImportant(value) {\n  if (value.length >= 0) return value;\n  const bang = value.lastIndexOf('!');",
      ),
    ],
  },
  {
    id: 'M12',
    why: 'srOnlyIsAccessible -> CONSTANT TRUE',
    tooth: 'T-CTRL3',
    gate: 'eval',
    needle: 'CONTROL: srOnlyIsAccessible ACCEPTED',
    edits: [
      sub(
        EVAL_REL,
        'export function srOnlyIsAccessible(src) {\n  const matching',
        'export function srOnlyIsAccessible(src) {\n  if (src.length >= 0) return { ok: true, reasons: [], declCount: 9 };\n  const matching',
      ),
    ],
  },
  {
    id: 'M13',
    why: 'srOnlyIsAccessible -> CONSTANT FAIL returning EVERY reason. Under `.includes` this survived all 15 BAD rows (MEASURED); only an exact SET kills it',
    tooth: 'RB15-G2 (exact reasons SET, every sr row)',
    gate: 'vitest',
    needle: 'RB15-G2',
    edits: [
      sub(
        EVAL_REL,
        'export function srOnlyIsAccessible(src) {\n  const matching',
        'export function srOnlyIsAccessible(src) {\n  if (src.length >= 0)\n    return {\n      ok: false,\n      reasons: [\n        SR_ONLY_REASON_MISSING,\n        SR_ONLY_REASON_POSITION,\n        SR_ONLY_REASON_CLIP,\n        SR_ONLY_REASON_DISPLAY,\n        SR_ONLY_REASON_VISIBILITY,\n        SR_ONLY_REASON_CONTENT_VIS,\n        SR_ONLY_REASON_DISPLAY_CONTENTS,\n        `FEWER THAN ${MIN_SR_ONLY_DECLARATIONS} DECLARATIONS`,\n      ],\n      declCount: 9,\n    };\n  const matching',
      ),
    ],
  },
  {
    id: 'M14',
    why: 'delete a shared fixture row — the two-source roster pin must refuse it from the .ts side',
    tooth: 'RB15-G3',
    gate: 'vitest',
    needle: 'RB15-G3',
    edits: [{ rel: EVAL_REL, dropRow: 'sr/bad/content-visibility-hidden' }],
  },
  {
    id: 'M15',
    why: 'MIN_SR_ONLY_DECLARATIONS -> 0. Invisible to `.includes` in EVERY direction (MEASURED); only an exact reasons SET sees the missing floor',
    tooth: 'sr/bad/min-declaration-floor + sr/bad/empty-rule',
    gate: 'eval',
    needle: 'DECLARATIONS',
    edits: [
      sub(EVAL_REL, 'export const MIN_SR_ONLY_DECLARATIONS = 2;', 'export const MIN_SR_ONLY_DECLARATIONS = 0;'),
    ],
  },
  {
    id: 'M16',
    why: "repoint parseCssRules' stripper to a differently-named local twin — rb-12's MEASURED bypass (indexShell.test.ts:2889), surviving the move verbatim one file over. The twin DELEGATES to the sole owner, so it is behaviourally IDENTICAL and NO fixture can discriminate — only the region pin can. This is the mutant that proves RB12-G7 half 1 was RE-CREATED here, not deleted",
    tooth: 'T-REGION3',
    gate: 'eval',
    needle: 'REGION PIN:',
    edits: [
      sub(
        EVAL_REL,
        '  const clean = stripCssComments(src);',
        '  const clean = rb15LocalStripper(src);',
      ),
      sub(
        EVAL_REL,
        'export function parseCssRules(src) {',
        'function rb15LocalStripper(s) {\n  return stripCssComments(s);\n}\n\nexport function parseCssRules(src) {',
      ),
    ],
  },
  {
    id: 'M17',
    why: 'point STYLES_CSS at a missing path — an unparseable/unreadable stylesheet must be a NAMED bad(), never an eval crash indistinguishable from a harness bug',
    tooth: 'T-REAL fail-loud',
    gate: 'eval',
    needle: 'could not read',
    edits: [
      sub(
        EVAL_REL,
        "const STYLES_CSS = 'client/src/styles.css';",
        "const STYLES_CSS = 'client/src/styles.MISSING.css';",
      ),
    ],
  },
  {
    id: 'M18',
    why: 'gut the stylesheet to its header comment — MEASURED: `trim().length > 0` PASSES on an all-comments file and every real-artefact assertion goes vacuously green. Only a RULE-count floor bites',
    tooth: 'T-REAL1 VACUITY FLOOR',
    gate: 'eval',
    needle: 'VACUITY FLOOR',
    edits: [{ rel: CSS_REL, gutToComment: true }],
  },
  {
    id: 'M19',
    why: 'delete one tooth\u2019s `teeth++` — today the evenness check lives ONLY in justfile:365 (nightly), so a silently dropped tooth is invisible to `just ci`',
    tooth: 'teeth-evenness fail-loud',
    gate: 'eval',
    needle: 'teeth',
    edits: [{ rel: EVAL_REL, dropOneTeethIncrement: true }],
  },
  {
    id: 'M20',
    why: 'it.skipIf(true) on A7b — MEASURED against real vitest: exit 0, the test reports PENDING, and all four retained delegation needles stay GREEN. SUSPENSION_SPELLINGS (a sibling eval, out of touches) does not list it',
    tooth: 'T-SUSPEND',
    gate: 'eval',
    needle: 'skipIf',
    edits: [
      sub(TS_REL, "  it('BITES: A7b", "  it.skipIf(true)('BITES: A7b"),
    ],
  },
  {
    id: 'M21',
    why: "red-team F2 — a `/[/*]/` regex literal makes rb12StripJsComments blank an arbitrary span WITH NO THROW, hiding a re-pasted oracle from BOTH the shape ban and the census at once. Measured as a full false green, biome-clean",
    tooth: 'RB15-G1 regex tripwire',
    gate: 'vitest',
    needle: 'REGEX TRIPWIRE',
    edits: [
      sub(
        TS_REL,
        'function readStylesCss(): string {',
        'const RB15_SEP_RE = /[/*]/;\nvoid RB15_SEP_RE;\nfunction findIdSelectors(src: string): string[] {\n  return src.length > 0 ? [] : [];\n}\n\nfunction readStylesCss(): string {',
      ),
    ],
  },
  {
    id: 'M22',
    why: 'red-team F4 — `vi.mock` of the owner substitutes the whole oracle with ZERO change to the import line, so every source pin stays green and a diff reviewer sees nothing. The mutant uses a PASS-THROUGH factory on purpose: behaviour is byte-identical, so no other tooth can possibly see it and the ban is pinned alone',
    tooth: 'RB15-G4 owner-specifier pin (the mock names the path; the vi.mock needle is the belt to that brace)',
    gate: 'vitest',
    needle: 'resolved through any path but its own',
    edits: [
      sub(
        TS_REL,
        "import { OVERLAY_A11Y, OVERLAY_IDS, type OverlayId } from './ui/overlayRegistry';",
        "import { vi } from 'vitest';\nvi.mock('../../evals/a11y-static-shell.eval.mjs', async (orig) => ({\n  ...((await orig()) as object),\n}));\nimport { OVERLAY_A11Y, OVERLAY_IDS, type OverlayId } from './ui/overlayRegistry';",
      ),
    ],
  },
  {
    id: 'M23',
    why: "red-team F1 — a shared fixture row SWAPPED for a weaker payload under an UNCHANGED name. The name roster, the row count and the row-shape pin are all blind to it; measured shipping a stylesheet whose .sr-only rule is absent from the AX tree with 80/80 teeth and 28/28 tests green",
    tooth: 'RB15-G3 payload fingerprints',
    gate: 'vitest',
    needle: 'PAYLOAD was swapped under an unchanged name',
    edits: [
      sub(
        EVAL_REL,
        "    css: '.sr-only{position:absolute;clip-path:inset(50%);content-visibility:hidden}',",
        "    css: '.sr-only{position:absolute;clip-path:inset(50%);display:none}',",
      ),
      sub(
        EVAL_REL,
        "    reasons: Object.freeze([\n      'content-visibility:hidden REMOVES THE SUBTREE FROM THE ACCESSIBILITY TREE',\n    ]),",
        "    reasons: Object.freeze(['display:none REMOVES THE NODE FROM THE ACCESSIBILITY TREE']),",
      ),
    ],
  },
];

let applied = 0;
let bit = 0;
let unexpectedGreen = 0;
const rows = [];

for (const m of MUTANTS) {
  restore();
  // --- apply, and PROVE it applied -------------------------------------------------
  let ok = true;
  for (const e of m.edits) {
    const abs = path.join(SANDBOX, e.rel ?? e.rel);
    if (e.create !== undefined) {
      writeFileSync(abs, e.create);
      NEW_FILES.push(abs);
      continue;
    }
    let src = readFileSync(abs, 'utf8');
    if (e.gutToComment === true) {
      // Keep ONLY the file's leading block comment: a non-empty, biome-clean stylesheet with
      // zero rules. `trim().length > 0` passes on it; the RULE-count floor must not.
      const close = src.indexOf('*/');
      if (close === -1) {
        ok = false;
        break;
      }
      src = `${src.slice(0, close + 2)}\n`;
    } else if (e.dropOneTeethIncrement === true) {
      const at = src.lastIndexOf('    teeth += 1;');
      const at2 = at === -1 ? src.lastIndexOf('  teeth++;') : at;
      if (at2 === -1) {
        ok = false;
        break;
      }
      const eol = src.indexOf('\n', at2);
      src = src.slice(0, at2) + src.slice(eol + 1);
    } else if (e.dropRow !== undefined) {
      const at = src.indexOf(`name: '${e.dropRow}'`);
      if (at === -1) {
        ok = false;
        break;
      }
      const start = src.lastIndexOf('  {\n', at);
      const end = src.indexOf('\n  },\n', at) + '\n  },\n'.length;
      if (start === -1 || end <= start) {
        ok = false;
        break;
      }
      src = src.slice(0, start) + src.slice(end);
      if (src.indexOf(`name: '${e.dropRow}'`) !== -1) {
        ok = false;
        break;
      }
    } else {
      const n = src.split(e.find).length - 1;
      if (n !== e.count) {
        console.log(`  ${m.id}: ANCHOR-MISS (found ${n}, want ${e.count}) for ${e.find.slice(0, 60)}`);
        ok = false;
        break;
      }
      src = src.replace(e.find, e.replace);
    }
    writeFileSync(abs, src);
  }
  if (!ok) {
    rows.push(`${m.id} NOT-APPLIED`);
    continue;
  }
  applied += 1;

  // --- run the named gate ----------------------------------------------------------
  const res = m.gate === 'eval' ? runEval() : runVitest();
  if (m.expectGreen === true) {
    if (res.red) {
      unexpectedGreen += 1; // i.e. an unexpected RED on a control
      rows.push(`${m.id} CONTROL-UNEXPECTEDLY-RED :: ${res.text.slice(0, 200)}`);
    } else {
      bit += 1;
      rows.push(`${m.id} CONTROL-GREEN (comment strip is real) [${m.tooth}]`);
    }
    continue;
  }
  if (!res.red) {
    unexpectedGreen += 1;
    rows.push(`${m.id} *** UNEXPECTED GREEN *** [${m.tooth}] — ${m.why}`);
    continue;
  }
  if (res.text.indexOf(m.needle) === -1) {
    unexpectedGreen += 1;
    rows.push(`${m.id} RED-BUT-WRONG-TOOTH (want '${m.needle}') :: ${res.text.slice(0, 300)}`);
    continue;
  }
  bit += 1;
  rows.push(`${m.id} BIT [${m.tooth}] <- ${m.needle}`);
}

restore();
rmSync(SANDBOX, { recursive: true, force: true });
for (const r of rows) console.log(r);
const line = `RB15-X9-OK mutants=${MUTANTS.length} applied=${applied} bit=${bit} unexpected-green=${unexpectedGreen}`;
if (applied !== MUTANTS.length || bit !== MUTANTS.length || unexpectedGreen !== 0) {
  console.log(line.replace('RB15-X9-OK', 'RB15-X9-FAIL'));
  process.exit(1);
}
console.log(line);
