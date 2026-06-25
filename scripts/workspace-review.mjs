#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
// Lightweight harness review used by the daily scheduled task. Reports drift;
// never edits project code. Prints a short findings list.
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projDir = path.join(ROOT, 'projects');
const findings = [];

const read = (p) => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

// Projects are independent repos per root .gitignore; flag a .git that is
// absent, half-initialized, locked, or has a NUL-corrupted HEAD.
function checkGit(label, gitDir, { requireRepo } = {}) {
  if (!existsSync(gitDir)) {
    if (requireRepo) findings.push(`${label}: not a git repo (no .git/)`);
    return;
  }
  if (!existsSync(path.join(gitDir, 'objects'))) {
    findings.push(`${label}: broken git repo (.git/objects missing — interrupted init)`);
  }
  for (const lock of ['index.lock', 'config.lock']) {
    if (existsSync(path.join(gitDir, lock))) {
      findings.push(`${label}: stale .git/${lock} (interrupted git write; blocks commits — remove it)`);
    }
  }
  if (read(path.join(gitDir, 'HEAD')).includes('\0')) {
    findings.push(`${label}: corrupt .git/HEAD (contains NUL bytes)`);
  }
}

let projects = [];
try {
  projects = (await readdir(projDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
} catch {}

// --- memory index (read once) ---
const indexPath = path.join(ROOT, 'memory/index.md');
const indexText = read(indexPath);
if (!existsSync(indexPath)) {
  findings.push('memory/index.md missing');
} else if (projects.length && /none yet/i.test(indexText)) {
  findings.push('memory/index.md still shows the "(none yet)" placeholder though projects exist');
}

// --- per-project structure, memory map, and git health ---
for (const p of projects) {
  const base = path.join(projDir, p);
  for (const must of ['justfile', 'AGENTS.md', '.github/workflows/ci.yml', 'evals']) {
    if (!existsSync(path.join(base, must))) findings.push(`${p}: missing ${must}`);
  }
  if (!existsSync(path.join(base, 'docs/adr'))) findings.push(`${p}: no docs/adr/`);
  if (!existsSync(path.join(ROOT, 'memory/projects', `${p}.md`))) {
    findings.push(`${p}: no memory card (memory/projects/${p}.md)`);
  }
  if (indexText && !indexText.includes(p)) {
    findings.push(`${p}: not listed in memory/index.md`);
  }
  checkGit(p, path.join(base, '.git'), { requireRepo: true });
}

// --- harness (root) git health ---
checkGit('harness', path.join(ROOT, '.git'));

console.log(`Workspace review — ${projects.length} project(s).`);
console.log(findings.length ? findings.map((f) => ` - ${f}`).join('\n') : ' - no drift detected.');
