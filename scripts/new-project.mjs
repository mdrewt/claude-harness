#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
// Scaffold a new project: templates/_base + templates/<stack> -> projects/<name>
// Usage: node scripts/new-project.mjs <name> <stack> [description]
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [, , name, stack, ...descParts] = process.argv;
const description = descParts.join(' ') || `${name} — an open-source project.`;

if (!name || !stack) {
  console.error('Usage: new-project.mjs <name> <stack> [description]');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error('Name must be kebab-case.');
  process.exit(1);
}

const baseDir = path.join(ROOT, 'templates', '_base');
const stackDir = path.join(ROOT, 'templates', stack);
if (!existsSync(stackDir)) {
  const stacks = (await readdir(path.join(ROOT, 'templates'))).filter((s) => s !== '_base');
  console.error(`Unknown stack "${stack}". Available: ${stacks.join(', ')}`);
  process.exit(1);
}
const dest = path.join(ROOT, 'projects', name);
if (existsSync(dest)) {
  console.error(`projects/${name} already exists.`);
  process.exit(1);
}

// Merge-copy that overwrites in place (copyFile truncates; never unlinks) so it
// works on filesystems that forbid unlink and gives stack files precedence.
async function copyMerge(src, dst) {
  await mkdir(dst, { recursive: true });
  for (const e of await readdir(src, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const s = path.join(src, e.name),
      d = path.join(dst, e.name);
    if (e.isDirectory()) {
      await copyMerge(s, d);
      continue;
    }
    // .gitignore: MERGE base + stack (deduped) so a stack never drops shared
    // ignores like .env (a secret-leak risk). All other files: stack overrides.
    if (e.name === '.gitignore' && existsSync(d)) {
      const lines = `${await readFile(d, 'utf8')}\n${await readFile(s, 'utf8')}`
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''));
      await writeFile(d, [...new Set(lines)].join('\n'));
      continue;
    }
    await copyFile(s, d);
  }
}
await copyMerge(baseDir, dest);
await copyMerge(stackDir, dest); // stack overrides base

// {{ }} is RESERVED for these tokens. Single-pass replace so a replacement value
// (e.g. a description containing "{{NAME}}") is never re-scanned.
const TOKMAP = {
  NAME: name,
  STACK: stack,
  YEAR: String(new Date().getFullYear()),
  DESCRIPTION: description,
};
const TOKEN_RE = /\{\{(NAME|STACK|YEAR|DESCRIPTION)\}\}/g;
const BINARY_EXT =
  /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|eot|pdf|zip|gz|tar|mp3|wav|mp4|wasm|so|dylib|dll|exe|bin)$/i;

async function fill(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '.git') continue;
      await fill(p);
      continue;
    }
    if (BINARY_EXT.test(e.name)) continue;
    let buf;
    try {
      buf = await readFile(p);
    } catch {
      continue;
    }
    if (buf.includes(0)) continue; // content sniff: skip binaries (NUL byte) even if extensionless
    const t = buf.toString('utf8');
    const out = t.replace(TOKEN_RE, (_, k) => TOKMAP[k]);
    if (out !== t) await writeFile(p, out);
  }
}
await fill(dest);

try {
  // `-b master` so scaffolded repos match standards/git.md (master is the protected
  // branch), regardless of the host git init.defaultBranch (git < 2.28 lacks `-b`).
  // Fall back to symbolic-ref when `-b` is unavailable.
  try {
    execFileSync('git', ['init', '-q', '-b', 'master'], { cwd: dest });
  } catch {
    execFileSync('git', ['init', '-q'], { cwd: dest });
    execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/master'], { cwd: dest });
  }
  let hasIdentity = true;
  try {
    execFileSync('git', ['config', 'user.email'], { cwd: dest, stdio: 'ignore' });
  } catch {
    hasIdentity = false;
  }
  if (!hasIdentity) {
    // only set a local fallback when no global identity exists
    execFileSync('git', ['config', 'user.email', 'dev@localhost'], { cwd: dest });
    execFileSync('git', ['config', 'user.name', 'Drew'], { cwd: dest });
  }
  execFileSync('git', ['add', '-A'], { cwd: dest });
  execFileSync('git', ['commit', '-qm', 'chore: scaffold from template'], {
    cwd: dest,
    stdio: 'ignore',
  });
} catch {
  /* git optional */
}

console.log(`Created projects/${name} (${stack}).`);
console.log('Next: cd into it, run `just setup` (or `npm run setup`), then `/spec`.');
