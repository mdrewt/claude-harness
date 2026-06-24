#!/usr/bin/env node
// Lightweight harness review used by the daily scheduled task. Reports drift;
// never edits project code. Prints a short findings list.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projDir = path.join(ROOT, 'projects');
const findings = [];
let projects = [];
try { projects = (await readdir(projDir, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name); } catch {}
for (const p of projects) {
  const base = path.join(projDir, p);
  for (const must of ['justfile', 'AGENTS.md', '.github/workflows/ci.yml', 'evals']) {
    if (!existsSync(path.join(base, must))) findings.push(`${p}: missing ${must}`);
  }
  if (!existsSync(path.join(base, 'docs/adr'))) findings.push(`${p}: no docs/adr/`);
}
if (!existsSync(path.join(ROOT, 'memory/index.md'))) findings.push('memory/index.md missing');
console.log(`Workspace review — ${projects.length} project(s).`);
console.log(findings.length ? findings.map(f => ' - ' + f).join('\n') : ' - no drift detected.');
