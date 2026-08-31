#!/usr/bin/env node
// rb-20 ledger gates RM-1 + RM-2 — the COLLECTION proof.
//
// Drives the REAL Playwright collector (`--list --reporter=json`) over the slice
// worktree and reports, as literal counts, what each project actually collects.
// `--list` does not launch a browser and does not run `globalSetup`, so this is a
// ~1 s serverless check.
//
// WHAT THIS CAN AND CANNOT PROVE (read before trusting it). `--list`'s
// `config.projects[].use` is a verbatim echo of whatever the config author wrote.
// It therefore proves the option is PRESENT and PROJECT-SCOPED; it cannot prove it
// is OPERATIVE, because no browser is launched. That half is RM-3's job
// (`rb-20.browser-bite-proof.mjs`), which runs a real Chromium. The distinction is
// load-bearing: `use: { reducedMotion: 'reduce' }` — the spelling every Playwright
// doc shows — echoes here identically to the working
// `use: { contextOptions: { reducedMotion: 'reduce' } }`, while being a TS2769
// compile error and a runtime no-op on this repo's pinned 1.61.1 (ADR-0219 D5).
//
// Every number below is compared against a PINNED literal, never a `>= 0` shape.
// An unbounded `\d+` here would admit `defaultFiles=0` — a `default` project whose
// filters were widened until it collects nothing — which is the exact vacuity RM-2
// exists to reject.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const WT = process.argv[2];
if (!WT) {
  console.error('usage: rb-20.collection-proof.mjs <worktree-abs-path>');
  process.exit(2);
}
const CLIENT = path.join(WT, 'client');

// Pinned expectations. `default` is master's baseline (73/20) — the new spec must
// not change what the pre-existing e2e suite collects.
const EXPECT_DEFAULT_FILES = 20;
const EXPECT_DEFAULT_TESTS = 73;
const EXPECT_RM_FILES = 1;
const EXPECT_RM_TESTS = 2;
const RM_SPEC = 'reduced-motion.spec.ts';
const AXE_SPEC = 'a11y.spec.ts';

function list(project) {
  const raw = execFileSync(
    'npx',
    ['playwright', 'test', `--project=${project}`, '--list', '--reporter=json'],
    { cwd: CLIENT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: process.env },
  );
  return JSON.parse(raw);
}

// Playwright's JSON `suites` nest; every leaf carries the spec `file`.
function specFiles(report) {
  const files = new Set();
  let tests = 0;
  const walk = (suites) => {
    for (const s of suites ?? []) {
      for (const spec of s.specs ?? []) {
        files.add(path.basename(s.file ?? spec.file ?? ''));
        tests += (spec.tests ?? []).length || 1;
      }
      walk(s.suites);
    }
  };
  walk(report.suites);
  return { files, tests };
}

let failed = 0;
const bad = (msg) => {
  console.error(`  FAIL: ${msg}`);
  failed += 1;
};

const rm = specFiles(list('reduced-motion'));
const def = specFiles(list('default'));

// --- RM-1: the project exists, collects exactly the new spec, and the option is
// scoped to that project alone.
if (rm.files.size !== EXPECT_RM_FILES || !rm.files.has(RM_SPEC)) {
  bad(`reduced-motion collects ${[...rm.files].join(',') || '<nothing>'}, expected only ${RM_SPEC}`);
}
if (rm.tests !== EXPECT_RM_TESTS) bad(`reduced-motion collected ${rm.tests} test(s), expected ${EXPECT_RM_TESTS}`);

// The option's VALUE and its SCOPE are read from the config source, not from the
// report echo — `--list` flattens project `use` over config `use`, so the report
// literally cannot distinguish "declared on the project" from "inherited from a
// top-level `use`", which is the hoisting hazard RM-1 names.
const cfgRaw = readFileSync(path.join(CLIENT, 'playwright.config.ts'), 'utf8');

// STRIP COMMENTS FIRST. Measured while building this script: the config's own
// header comment EXPLAINS the `use: { reducedMotion: 'reduce' }` shorthand trap by
// quoting it, and that quotation sits above `projects:` — so a raw-text scan reports
// the option as hoisted to a config-level `use` and fails a healthy tree. Quote-aware
// so an apostrophe or a `//` inside a string literal cannot desync the walk.
function stripJsComments(text) {
  let out = '';
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quote !== null) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 1;
      } else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      out += '\n';
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) throw new Error('unterminated block comment in playwright.config.ts');
      // Preserve newlines so nothing downstream that counts lines is skewed.
      out += text.slice(i, end).replace(/[^\n]/g, '');
      i = end + 1;
      continue;
    }
    out += ch;
  }
  if (quote !== null) throw new Error('unterminated string literal in playwright.config.ts');
  return out;
}
const cfgText = stripJsComments(cfgRaw);
const projectsAt = cfgText.indexOf('projects:');
if (projectsAt === -1) bad('client/playwright.config.ts declares no `projects:` array');
const beforeProjects = projectsAt === -1 ? cfgText : cfgText.slice(0, projectsAt);
const topLevelUse = beforeProjects.includes('reducedMotion') ? 'present' : 'absent';
if (topLevelUse !== 'absent') {
  bad('`reducedMotion` appears BEFORE `projects:` — hoisted to a config-level `use`, which forces the whole e2e suite into reduced motion');
}
const afterProjects = projectsAt === -1 ? '' : cfgText.slice(projectsAt);
const optionValue = afterProjects.includes("reducedMotion: 'reduce'") ? 'reduce' : 'OTHER';
if (optionValue !== 'reduce') bad("no `reducedMotion: 'reduce'` inside the projects array");
// NESTING DEPTH, not mere co-occurrence (rb-20 artifact red-team, finding 1). Playwright
// only promotes `use.contextOptions` into `browser.newContext()`. A `contextOptions` that
// is a SIBLING of `use` is ignored at runtime, and a spread-injected one
// (`...({ contextOptions: { reducedMotion: 'reduce' } })`) typechecks clean — so a
// co-occurrence test printed verdict=Y for a config Chromium never receives the option
// from. Walk from `name: 'reduced-motion'` to that project's OWN `use: {` body and require
// `contextOptions` inside it.
function balancedFrom(text, openIdx, open, close) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i += 1) {
    if (text[i] === open) depth += 1;
    else if (text[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function reducedMotionUseBody(text) {
  const nameAt = text.indexOf("name: 'reduced-motion'");
  if (nameAt === -1) return null;
  // The project object literal that CONTAINS that name.
  const objStart = text.lastIndexOf('{', nameAt);
  const objEnd = objStart === -1 ? -1 : balancedFrom(text, objStart, '{', '}');
  if (objStart === -1 || objEnd === -1) return null;
  const block = text.slice(objStart, objEnd + 1);
  const useAt = block.indexOf('use:');
  if (useAt === -1) return null;
  const useOpen = block.indexOf('{', useAt);
  const useEnd = useOpen === -1 ? -1 : balancedFrom(block, useOpen, '{', '}');
  if (useOpen === -1 || useEnd === -1) return null;
  return block.slice(useOpen + 1, useEnd);
}
const rmUseBody = reducedMotionUseBody(afterProjects);
const projectScoped =
  rmUseBody !== null && rmUseBody.includes('contextOptions') && rmUseBody.includes("reducedMotion: 'reduce'")
    ? 'Y'
    : 'N';
if (projectScoped !== 'Y') {
  bad("the reduced-motion project's own `use:` block does not carry `contextOptions.reducedMotion: 'reduce'` (ADR-0219 D5: the bare `use.reducedMotion` shorthand does not exist on @playwright/test 1.61.1, and a `contextOptions` outside `use` — including a spread-injected one — is a runtime no-op)");
}

// --- RM-2: the boundary is closed on BOTH sides, and `default` is non-vacuous.
const defaultRM = def.files.has(RM_SPEC) ? 1 : 0;
if (defaultRM !== 0) bad(`the 'default' project ALSO collects ${RM_SPEC} — it would run unemulated and red every PR`);
const rmAxe = rm.files.has(AXE_SPEC) ? 1 : 0;
if (rmAxe !== 0) bad(`the 'reduced-motion' project ALSO collects ${AXE_SPEC} — forbidden by ADR-0219 D2`);
if (def.files.size !== EXPECT_DEFAULT_FILES) {
  bad(`the 'default' project collects ${def.files.size} file(s), expected ${EXPECT_DEFAULT_FILES} (master's baseline) — a widened testIgnore that collects nothing would satisfy the exclusion trivially`);
}
if (def.tests !== EXPECT_DEFAULT_TESTS) {
  bad(`the 'default' project collects ${def.tests} test(s), expected ${EXPECT_DEFAULT_TESTS} (master's baseline)`);
}

const verdict = failed === 0 ? 'Y' : 'N';
console.log(
  `RB20-PROJECT rmTests=${rm.tests} rmFiles=${rm.files.size} optionValue=${optionValue} projectScoped=${projectScoped} topLevelUse=${topLevelUse} verdict=${verdict}`,
);
console.log(
  `RB20-COLLECTION defaultFiles=${def.files.size} defaultTests=${def.tests} defaultRM=${defaultRM} rmFiles=${rm.files.size} rmTests=${rm.tests} rmAxe=${rmAxe} verdict=${verdict}`,
);
process.exit(failed === 0 ? 0 : 1);
