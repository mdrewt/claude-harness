#!/usr/bin/env node
// rb-22 EO-8 gate: generated doc artifacts in sync + the slice's doc outputs
// present. Runs the repo's own checkers (adr-digest --check, okf-export
// --check), then asserts docs/adr/0220-*.md exists and ARCHITECTURE.md's module
// map names privacy.rs.
// Usage: node rb-22.docs-gate.mjs <worktree>
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const wt = process.argv[2];
if (!wt || !existsSync(path.join(wt, 'scripts', 'adr-digest.mjs'))) {
  console.log('RB22-DOCS usage-error verdict=N');
  process.exit(1);
}

const digest = spawnSync(process.execPath, ['scripts/adr-digest.mjs', '--check'], {
  cwd: wt,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
const knowledge = spawnSync(
  process.execPath,
  ['scripts/okf-export.mjs', 'docs/knowledge', '--check'],
  { cwd: wt, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

const adrDir = path.join(wt, 'docs', 'adr');
const adr220 = readdirSync(adrDir).filter((f) => f.startsWith('0220-') && f.endsWith('.md'));
const arch = readFileSync(path.join(wt, 'ARCHITECTURE.md'), 'utf8');
const archRow = arch.includes('privacy.rs');

const digestClean = digest.status === 0;
const knowledgeClean = knowledge.status === 0;
const ok = digestClean && knowledgeClean && adr220.length === 1 && archRow;
console.log(
  `RB22-DOCS digest=${digestClean ? 'CLEAN' : 'DRIFT'} knowledge=${knowledgeClean ? 'CLEAN' : 'DRIFT'} ` +
    `adr0220=${adr220.length === 1 ? 'FOUND' : `COUNT-${adr220.length}`} archRow=${archRow ? 'FOUND' : 'MISSING'} ` +
    `verdict=${ok ? 'Y' : 'N'}`,
);
if (!ok) {
  console.log((digest.stdout || '') + (digest.stderr || '').slice(0, 400));
  console.log((knowledge.stdout || '') + (knowledge.stderr || '').slice(0, 400));
  process.exit(1);
}
