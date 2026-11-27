// sync-agents: a SYNCED project agent is the harness file; shared agents agree on model/effort.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { frontmatter, syncAgents } from '../sync-agents.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sync-agents.mjs');
const agent = (model, effort, body = 'body\n') =>
  `---\nname: x\nmodel: ${model}\n${effort ? `effort: ${effort}\n` : ''}---\n${body}`;

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'sync-agents-'));
  const harness = path.join(root, 'h');
  const projects = path.join(root, 'p');
  mkdirSync(path.join(harness, '.claude', 'agents'), { recursive: true });
  mkdirSync(path.join(projects, 'game', '.claude', 'agents'), { recursive: true });
  const h = (n, t) => writeFileSync(path.join(harness, '.claude', 'agents', `${n}.md`), t);
  const p = (n, t) => writeFileSync(path.join(projects, 'game', '.claude', 'agents', `${n}.md`), t);
  return { root, harness, projects, h, p };
}

test('frontmatter reads model and effort', () => {
  assert.deepEqual(frontmatter(agent('opus', 'medium')), {
    name: 'x',
    model: 'opus',
    effort: 'medium',
  });
  assert.deepEqual(frontmatter('no frontmatter'), {});
});

test('a stale synced copy is drift, and --into writes the harness file there', () => {
  const f = fixture();
  f.h('tester', agent('opus', 'medium', 'new rules\n'));
  f.p('tester', agent('sonnet', '', 'old rules\n'));
  const synced = { game: ['tester'] };
  const before = syncAgents({ harness: f.harness, projectsDir: f.projects, synced });
  assert.ok(before.drift >= 1);
  assert.ok(before.lines.some((l) => l.startsWith('DRIFT game/tester:')));
  const into = path.join(f.projects, 'game');
  syncAgents({ harness: f.harness, projectsDir: f.projects, synced, into });
  assert.equal(
    readFileSync(path.join(into, '.claude', 'agents', 'tester.md'), 'utf8'),
    agent('opus', 'medium', 'new rules\n'),
  );
  assert.equal(syncAgents({ harness: f.harness, projectsDir: f.projects, synced }).drift, 0);
});

test('a project-owned agent may differ in body but not in model or effort', () => {
  const f = fixture();
  f.h('reviewer', agent('opus', '', 'generic\n'));
  f.p('reviewer', agent('opus', '', 'project rules\n'));
  f.p('desync-guard', agent('opus', '', 'project only\n'));
  const synced = { game: [] };
  assert.equal(syncAgents({ harness: f.harness, projectsDir: f.projects, synced }).drift, 0);
  f.p('reviewer', agent('sonnet', '', 'project rules\n'));
  const r = syncAgents({ harness: f.harness, projectsDir: f.projects, synced });
  assert.equal(r.drift, 1);
  assert.match(r.lines[0], /reviewer\.md: model is 'sonnet' in the project/);
  f.p('reviewer', agent('opus', 'high', 'project rules\n'));
  assert.match(
    syncAgents({ harness: f.harness, projectsDir: f.projects, synced }).lines[0],
    /effort is 'high'/,
  );
});

test('a git project is judged by origin/master, not its working tree', () => {
  const f = fixture();
  const dir = path.join(f.projects, 'game');
  const g = (...a) => execFileSync('git', ['-C', dir, ...a], { stdio: 'ignore' });
  f.h('tester', agent('opus', 'medium'));
  f.p('tester', agent('sonnet', ''));
  g('init', '-q', '-b', 'master');
  g('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '-A');
  g('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'old');
  g('update-ref', 'refs/remotes/origin/master', 'HEAD');
  f.p('tester', agent('opus', 'medium')); // fixed in the working tree only
  const r = syncAgents({
    harness: f.harness,
    projectsDir: f.projects,
    synced: { game: ['tester'] },
  });
  assert.ok(
    r.lines.some((l) => /origin\/master differs/.test(l)),
    r.lines.join('\n'),
  );
});

test('an absent project checkout is skipped, not drift', () => {
  const f = fixture();
  const r = syncAgents({
    harness: f.harness,
    projectsDir: f.projects,
    synced: { missing: ['tester'] },
  });
  assert.equal(r.drift, 0);
  assert.equal(r.skipped, 1);
});

test('the CLI exits 1 on drift, 0 when clean, and refuses --apply without --into', () => {
  const f = fixture();
  const run = (...extra) =>
    spawnSync('node', [SCRIPT, '--projects-dir', f.projects, ...extra], { encoding: 'utf8' });
  // The CLI uses the real SYNCED map, so point it at a projects dir without monster-realm.
  const clean = run();
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /AGENTS-SKIPPED 1/);
  mkdirSync(path.join(f.projects, 'monster-realm', '.claude', 'agents'), { recursive: true });
  writeFileSync(
    path.join(f.projects, 'monster-realm', '.claude', 'agents', 'tester.md'),
    'stale\n',
  );
  const drifted = run();
  assert.equal(drifted.status, 1, drifted.stdout + drifted.stderr);
  assert.match(drifted.stdout, /DRIFT monster-realm\/tester/);
  assert.equal(run('--apply').status, 2);
});
