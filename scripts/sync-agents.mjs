#!/usr/bin/env node
// Agent-roster sync: the harness `.claude/agents/` is the single source for the agents named in
// SYNCED; each project's copy is generated from it, byte for byte. Rooted runs start inside the
// project repo, so a project's `.claude/agents/<name>.md` shadows the harness agent of the same
// name: a stale project copy silently overrides a measured harness decision (2026-11: the game's
// tester ran on Sonnet at the parent's effort while docs/DECISIONS.md said Opus at medium).
//
// Two checks, against what rooted runs actually get — the project's `origin/<default branch>`
// (a slice worktree branches from it), read with `git show`; a project dir that is not a git
// checkout is read from its working tree:
//   1. every SYNCED agent's project copy equals the harness file;
//   2. for every agent name present in BOTH rosters, the frontmatter `model:` and `effort:` lines
//      agree — those are routing facts (docs/routing.md), never a project's own call. Bodies of
//      agents not in SYNCED stay project-owned (they carry project rules).
//
// Usage:
//   node scripts/sync-agents.mjs                    # check; exit 1 on drift
//   node scripts/sync-agents.mjs --apply --into DIR # write the SYNCED copies into DIR/.claude/agents/
//                                                   # (a project worktree you then ship as a PR —
//                                                   # never the project's main checkout)
//   node scripts/sync-agents.mjs --projects-dir D   # check projects under D
// The projects dir defaults to <harness>/projects; in a harness worktree (which has no projects/)
// it is the main checkout's, found through `git rev-parse --git-common-dir`. A project that is
// absent is reported as `SKIP`, which is not drift.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SYNCED = { 'monster-realm': ['tester'] };

const ROUTING_KEYS = ['model', 'effort'];

export function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

// What rooted runs get from a project: its origin default branch when it is a git checkout.
export function projectView(dir) {
  const ref = ['origin/master', 'origin/main'].find(
    (r) => git(dir, ['rev-parse', '--verify', '--quiet', r]) !== null,
  );
  const agents = path.join(dir, '.claude', 'agents');
  if (ref) {
    const ls = git(dir, ['ls-tree', '--name-only', `${ref}:.claude/agents`]) ?? '';
    const names = ls.split('\n').filter((n) => n.endsWith('.md'));
    return {
      where: ref,
      names,
      read: (n) => git(dir, ['show', `${ref}:.claude/agents/${n}`]),
    };
  }
  return {
    where: 'working tree',
    names: existsSync(agents) ? readdirSync(agents).filter((n) => n.endsWith('.md')) : [],
    read: (n) =>
      existsSync(path.join(agents, n)) ? readFileSync(path.join(agents, n), 'utf8') : null,
  };
}

// Returns { lines: string[], drift: number, skipped: number }. With into, SYNCED copies are written there.
export function syncAgents({ harness, projectsDir, into = null, synced = SYNCED }) {
  const lines = [];
  let drift = 0;
  let skipped = 0;
  const hAgents = path.join(harness, '.claude', 'agents');
  for (const [project, names] of Object.entries(synced)) {
    const dir = path.join(projectsDir, project);
    if (!existsSync(dir)) {
      lines.push(`SKIP ${project}: no project checkout at ${dir}`);
      skipped += 1;
      continue;
    }
    const view = projectView(dir);
    for (const name of names) {
      const src = path.join(hAgents, `${name}.md`);
      if (!existsSync(src)) {
        lines.push(`DRIFT ${project}/${name}: harness source ${src} is missing`);
        drift += 1;
        continue;
      }
      const want = readFileSync(src, 'utf8');
      if (into) {
        const dst = path.join(into, '.claude', 'agents', `${name}.md`);
        if (!existsSync(dst) || readFileSync(dst, 'utf8') !== want) {
          writeFileSync(dst, want);
          lines.push(`WROTE ${dst}`);
        }
        continue;
      }
      if (view.read(`${name}.md`) !== want) {
        lines.push(
          `DRIFT ${project}/${name}: ${view.where} differs from ${src} (node scripts/sync-agents.mjs --apply --into <worktree>)`,
        );
        drift += 1;
      }
    }
    if (into) continue;
    for (const file of view.names) {
      const src = path.join(hAgents, file);
      if (!existsSync(src)) continue;
      const h = frontmatter(readFileSync(src, 'utf8'));
      const p = frontmatter(view.read(file) ?? '');
      for (const key of ROUTING_KEYS) {
        if ((h[key] ?? '') !== (p[key] ?? '')) {
          lines.push(
            `DRIFT ${project}/${file}: ${key} is '${p[key] ?? '(unset)'}' in the project (${view.where}), '${h[key] ?? '(unset)'}' in the harness`,
          );
          drift += 1;
        }
      }
    }
  }
  return { lines, drift, skipped };
}

export function defaultProjectsDir(harness) {
  const own = path.join(harness, 'projects');
  if (existsSync(own)) return own;
  const common = git(harness, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  return common ? path.join(path.dirname(common.trim()), 'projects') : own;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const harness = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const arg = (name) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : null;
  };
  const projectsDir = arg('--projects-dir') ?? defaultProjectsDir(harness);
  if (args.includes('--apply') && !arg('--into')) {
    console.log(
      'AGENTS-ERROR --apply needs --into <project worktree>: writing the main checkout leaves it dirty',
    );
    process.exit(2);
  }
  const { lines, drift, skipped } = syncAgents({ harness, projectsDir, into: arg('--into') });
  for (const l of lines) console.log(l);
  if (drift > 0) {
    console.log(`AGENTS-DRIFT ${drift}`);
    process.exit(1);
  }
  console.log(skipped > 0 ? `AGENTS-SKIPPED ${skipped}` : 'AGENTS-OK');
}
