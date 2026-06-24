// Tests for the harness's own tooling. Pure Node test runner (no deps):
//   node --test scripts/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, cp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SECRETS = path.join(HARNESS, 'templates', '_base', 'scripts', 'check-secrets.mjs');

function run(file, args, cwd) {
  try { return { code: 0, out: execFileSync('node', [file, ...args], { cwd, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }; }
}
// true if any file still contains one of OUR placeholders (not 3rd-party {{ }} template syntax).
// Scans in-process (no `grep`) so a missing tool can never make this pass falsely.
const OUR_TOKEN = /\{\{(NAME|STACK|YEAR|DESCRIPTION)\}\}/;
function hasTokens(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (hasTokens(p)) return true; continue; }
    let t;
    try { t = readFileSync(p, 'utf8'); } catch { continue; }
    if (OUR_TOKEN.test(t)) return true;
  }
  return false;
}
function stacksIn(harnessDir) {
  return readdirSync(path.join(harnessDir, 'templates'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== '_base').map((e) => e.name);
}
async function tempHarness() {
  const dir = await mkdtemp(path.join(tmpdir(), 'harness-'));
  await cp(path.join(HARNESS, 'templates'), path.join(dir, 'templates'), { recursive: true });
  await cp(path.join(HARNESS, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
  return dir;
}

test('check-secrets flags a planted secret and passes a clean tree', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'sec-'));
  await writeFile(path.join(dir, 'clean.txt'), 'nothing to see');
  assert.equal(run(SECRETS, [dir], dir).code, 0, 'clean tree should pass');
  await writeFile(path.join(dir, 'leak.txt'), 'aws AKIA1234567890ABCD12 key');
  assert.equal(run(SECRETS, [dir], dir).code, 1, 'planted AWS key should fail');
  await rm(dir, { recursive: true, force: true });
});

test('new-project scaffolds a stack, substitutes tokens, and commits', async () => {
  const dir = await tempHarness();
  const gen = path.join(dir, 'scripts', 'new-project.mjs');
  const r = run(gen, ['demo-proj', 'node-ts-app', 'A demo'], dir);
  assert.equal(r.code, 0, r.out);
  const pkg = await readFile(path.join(dir, 'projects', 'demo-proj', 'package.json'), 'utf8');
  assert.match(pkg, /"name":\s*"demo-proj"/, 'NAME token substituted');
  assert.doesNotMatch(pkg, /\{\{/, 'no leftover tokens');
  const log = execFileSync('git', ['log', '--oneline'], { cwd: path.join(dir, 'projects', 'demo-proj'), encoding: 'utf8' });
  assert.match(log, /scaffold from template/, 'initial commit exists');
  await rm(dir, { recursive: true, force: true });
});

test('new-project rejects an unknown stack and a bad name', async () => {
  const dir = await tempHarness();
  const gen = path.join(dir, 'scripts', 'new-project.mjs');
  assert.equal(run(gen, ['ok', 'no-such-stack'], dir).code, 1, 'unknown stack fails');
  assert.equal(run(gen, ['Bad_Name', 'node-ts-app'], dir).code, 1, 'non-kebab name fails');
  await rm(dir, { recursive: true, force: true });
});

test('every stack template generates cleanly with no leftover tokens', async () => {
  const dir = await tempHarness();
  const gen = path.join(dir, 'scripts', 'new-project.mjs');
  const stacks = stacksIn(dir); // derived, so a new stack is auto-covered
  assert.ok(stacks.length >= 7, `expected >=7 stacks, found ${stacks.length}`);
  for (const s of stacks) {
    const r = run(gen, [`p-${s}`, s], dir);
    assert.equal(r.code, 0, `${s}: ${r.out}`);
    assert.equal(hasTokens(path.join(dir, 'projects', `p-${s}`)), false, `${s} has leftover {{tokens}}`);
  }
  await rm(dir, { recursive: true, force: true });
});

test('workspace-review runs and reports', async () => {
  const dir = await tempHarness();
  await mkdir(path.join(dir, 'projects'), { recursive: true });
  await mkdir(path.join(dir, 'memory'), { recursive: true });
  await writeFile(path.join(dir, 'memory', 'index.md'), '# index');
  const r = run(path.join(dir, 'scripts', 'workspace-review.mjs'), [], dir);
  assert.equal(r.code, 0);
  assert.match(r.out, /Workspace review/);
  await rm(dir, { recursive: true, force: true });
});

test('all justfiles use valid recipe syntax (no header-level ";", no tabs, bodies present)', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const roots = [path.join(HARNESS, 'justfile')];
  for (const d of await readdir(path.join(HARNESS, 'templates'), { withFileTypes: true })) {
    if (d.isDirectory()) roots.push(path.join(HARNESS, 'templates', d.name, 'justfile'));
  }
  for (const f of roots) {
    let text;
    try { text = await readFile(f, 'utf8'); } catch { continue; }
    const lines = text.split('\n');
    lines.forEach((ln, i) => {
      const isHeader = ln && !/^\s/.test(ln) && !ln.startsWith('#') && !ln.startsWith('set ') && ln.includes(':');
      if (isHeader) {
        const header = ln.split('#')[0];
        assert.ok(!header.includes(';'), `${f}:${i + 1} header-level ';' -> ${ln}`);
        const deps = header.split(':')[1].trim();
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        const hasBody = j < lines.length && /^\s/.test(lines[j]);
        assert.ok(deps !== '' || hasBody, `${f}:${i + 1} recipe has no deps and no body`);
      }
      assert.ok(!ln.includes('\t'), `${f}:${i + 1} contains a tab`);
    });
  }
});

test('doctor self-check passes (stack parity, security baseline, docs match reality)', () => {
  const r = run(path.join(HARNESS, 'scripts', 'doctor.mjs'), [], HARNESS);
  assert.equal(r.code, 0, r.out);
});
