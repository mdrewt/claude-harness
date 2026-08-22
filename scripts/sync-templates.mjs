#!/usr/bin/env node
import { existsSync } from 'node:fs';
// Template-drift sync: propagate improvements to shared "managed" files from
// templates/_base into already-scaffolded projects. Never touches your source,
// package manifests, or stack-overridden files.
//
// Usage:
//   node scripts/sync-templates.mjs            # report drift for all projects
//   node scripts/sync-templates.mjs <name>     # report drift for one project
//   node scripts/sync-templates.mjs --apply     # update managed files in all projects
//   node scripts/sync-templates.mjs <name> --apply
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, 'templates', '_base');

// Files safe to overwrite on update (infra/config). NOT src, package manifests,
// README/AGENTS (project-customized), LICENSE, justfile (stack-overridden), .gitignore.
const MANAGED = [
  '.editorconfig',
  'biome.json',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.devcontainer/devcontainer.json',
  'renovate.json',
  'lefthook.yml',
  'cliff.toml',
  'CODE_OF_CONDUCT.md',
  'scripts/check-secrets.mjs',
  'scripts/check-commit-msg.mjs',
  'evals/run.mjs',
  // The Bash noise filter (ADR-0012). Listed file-by-file because MANAGED is a flat
  // path list, and synced so a fix to the rule tables reaches every scaffolded
  // project instead of rotting into divergent copies the way guard-bash.mjs did
  // (24483 B in the harness vs 1349 B in _base when this was written).
  '.claude/hooks/quiet/quiet-lib.mjs',
  '.claude/hooks/quiet/quiet-profiles.mjs',
  '.claude/hooks/quiet/quiet-run.mjs',
  '.claude/hooks/quiet/quiet-bash.mjs',
  '.claude/hooks/quiet/quiet.test.mjs',
  // The gate reads these relative to itself, so syncing the test without its data
  // would push a suite that ENOENTs in every mirror.
  '.claude/hooks/quiet/fixtures/nextest-green.txt',
  '.claude/hooks/quiet/fixtures/nextest-fail.txt',
  '.claude/hooks/quiet/fixtures/node-test-green.txt',
  '.claude/hooks/quiet/fixtures/node-test-fail.txt',
  '.claude/hooks/quiet/fixtures/vitest-green.txt',
  '.claude/hooks/quiet/fixtures/vitest-fail.txt',
  '.claude/hooks/quiet/fixtures/biome-green.txt',
  '.claude/hooks/quiet/fixtures/clippy-fail.txt',
  '.claude/hooks/quiet/fixtures/evals-green.txt',
];

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const only = args.find((a) => !a.startsWith('--'));

function fill(text, name) {
  return text.split('{{NAME}}').join(name);
}

async function syncProject(name) {
  const dir = path.join(ROOT, 'projects', name);
  const changes = [];
  for (const rel of MANAGED) {
    const basePath = path.join(BASE, rel);
    if (!existsSync(basePath)) continue;
    const projPath = path.join(dir, rel);
    if (!existsSync(projPath)) continue; // file not used by this stack
    const want = fill(await readFile(basePath, 'utf8'), name);
    const have = await readFile(projPath, 'utf8');
    if (want !== have) {
      changes.push(rel);
      if (apply) await writeFile(projPath, want);
    }
  }
  return changes;
}

let names = [];
if (only) names = [only];
else {
  try {
    names = (await readdir(path.join(ROOT, 'projects'), { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {}
}

if (names.length === 0) {
  console.log('No projects found under projects/.');
  process.exit(0);
}

let total = 0;
for (const name of names) {
  const changes = await syncProject(name);
  total += changes.length;
  if (changes.length === 0) console.log(`${name}: up to date`);
  else
    console.log(
      `${name}: ${apply ? 'updated' : 'drift in'} ${changes.length} managed file(s):\n` +
        changes.map((c) => `   - ${c}`).join('\n'),
    );
}
if (!apply && total > 0)
  console.log(`\nRun with --apply to update ${total} file(s). Review the diff after.`);
