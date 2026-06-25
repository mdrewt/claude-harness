#!/usr/bin/env node
// validate-templates.mjs — scaffold each stack template and run its REAL gates
// (the per-stack `just setup` + `just ci`: real npm/cargo/uv installs, lint,
// typecheck, tests, evals). Catches the class of bug the STRUCTURAL invariants
// tests miss — a template that generates but doesn't actually pass its own gates
// (e.g. a shipped hook that fails the project's Biome style, or a missing
// `@types/*` that breaks `tsc`). Both were real, found by hand; this automates it.
//
// Heavy (real installs + builds) — run in a scheduled/manual CI job, NOT the fast
// `just test` unit suite.   Usage: node scripts/validate-templates.mjs [stack...]
import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allStacks = readdirSync(path.join(ROOT, 'templates')).filter(
  (s) => s !== '_base' && !s.startsWith('.'),
);
const stacks = process.argv.slice(2).length ? process.argv.slice(2) : allStacks;

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });
}

const results = [];
for (const stack of stacks) {
  const name = `_validate-${stack}`;
  const dest = path.join(ROOT, 'projects', name);
  rmSync(dest, { recursive: true, force: true });
  let status = 'ok';
  let detail = 'scaffold + just ci green';
  try {
    execFileSync('node', ['scripts/new-project.mjs', name, stack], { cwd: ROOT, stdio: 'pipe' });
    run('just setup', dest);
    run('just ci', dest);
  } catch (e) {
    status = 'FAIL';
    const out = `${e.stdout?.toString() ?? ''}${e.stderr?.toString() ?? e.message ?? ''}`;
    detail = out.split('\n').filter(Boolean).slice(-14).join('\n');
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
  results.push({ stack, status });
  console.log(status === 'ok' ? `ok    ${stack}` : `FAIL  ${stack}\n${detail}\n`);
}

const failed = results.filter((r) => r.status !== 'ok');
console.log(
  `\nvalidate-templates: ${results.length - failed.length}/${results.length} stacks green`,
);
process.exit(failed.length ? 1 : 0);
