#!/usr/bin/env node
// Wire the harness's shared skills + global agents + hooks into ~/.claude so they are
// discoverable in EVERY Claude Code session (any project or git worktree), while the
// harness repo stays the single source of truth — the links point back into it.
//
// Run: just setup-claude             create or repair the links (default)
//      just setup-claude --check     verify only; exit 1 on any drift (CI-style)
//      just setup-claude --dry-run   show what would change, touch nothing
//
// Safe + idempotent: it only manages symlinks it owns, never overwrites a real file
// or directory at a destination, and prunes only its own dangling links.
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// scripts/.. = the harness repo root, resolved wherever this is cloned.
const HARNESS = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLAUDE = join(homedir(), '.claude');

// Project-agnostic "consultant" agents that belong at the user level so any project
// or worktree session can reach them. The project-scoped agents (planner, reviewer,
// tester, …) are committed into each project's own .claude/agents and are
// deliberately NOT promoted here.
const GLOBAL_AGENTS = ['expert', 'review-lens'];

// Bespoke user-level hooks we own (referenced from ~/.claude/settings.json). The cbm-*
// hooks come from codebase-memory-mcp and are intentionally left alone.
const GLOBAL_HOOKS = ['usage-logger'];

// Resources the anchored skill/agent text reads through ~/.claude/harness/. Checked
// for existence so a moved repo or renamed standard surfaces instead of silently
// turning into "file not found" inside a skill.
const RESOURCES = [
  'harness/standards/security.md',
  'harness/standards/principles.md',
  'harness/standards/testing-tdd.md',
  'harness/standards/git.md',
  'harness/standards/spec-driven.md',
  'harness/standards/adr-process.md',
  'harness/docs/research/INDEX.md',
  'harness/docs/context-hygiene.md',
  'harness/docs/routing.md',
];

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const DRY = args.includes('--dry-run');
const tilde = (p) => p.replace(homedir(), '~');

// Desired link set: anchor + every harness skill + the global agents + owned hooks.
const links = [{ label: 'anchor', src: HARNESS, dst: join(CLAUDE, 'harness') }];

const skillsDir = join(HARNESS, '.claude', 'skills');
for (const name of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
  const src = join(skillsDir, name);
  if (existsSync(join(src, 'SKILL.md'))) {
    links.push({ label: 'skill', src, dst: join(CLAUDE, 'skills', name) });
  }
}
for (const name of GLOBAL_AGENTS) {
  const src = join(HARNESS, '.claude', 'agents', `${name}.md`);
  links.push({ label: 'agent', src, dst: join(CLAUDE, 'agents', `${name}.md`) });
}
for (const name of GLOBAL_HOOKS) {
  links.push({
    label: 'hook',
    src: join(HARNESS, 'hooks', name),
    dst: join(CLAUDE, 'hooks', name),
  });
}

const isLink = (p) => {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};
const linkTarget = (p) => {
  try {
    return readlinkSync(p);
  } catch {
    return '';
  }
};

// Current on-disk state of a desired link.
const classify = (link) => {
  if (!existsSync(link.src)) return 'no-source';
  if (isLink(link.dst)) return linkTarget(link.dst) === link.src ? 'ok' : 'drift';
  if (existsSync(link.dst)) return 'conflict'; // a real file/dir — never clobber
  return 'missing';
};

const counts = { ok: 0, created: 0, fixed: 0, pruned: 0, conflict: 0, 'no-source': 0 };
let failures = 0;

for (const link of links) {
  const state = classify(link);
  const where = tilde(link.dst);
  if (state === 'ok') {
    counts.ok++;
  } else if (state === 'no-source') {
    counts['no-source']++;
    failures++;
    console.log(`  MISSING-SRC  ${link.label}  ${where}  (source not found: ${tilde(link.src)})`);
  } else if (state === 'conflict') {
    counts.conflict++;
    failures++;
    console.log(`  CONFLICT     ${link.label}  ${where}  — real file/dir here; left untouched`);
  } else if (CHECK) {
    failures++;
    console.log(`  ${state === 'drift' ? 'DRIFT  ' : 'MISSING'}      ${link.label}  ${where}`);
  } else if (DRY) {
    console.log(
      `  would ${state === 'drift' ? 'fix' : 'add'}  ${link.label}  ${where} -> ${tilde(link.src)}`,
    );
  } else {
    mkdirSync(dirname(link.dst), { recursive: true });
    if (state === 'drift') rmSync(link.dst, { force: true });
    symlinkSync(link.src, link.dst);
    counts[state === 'drift' ? 'fixed' : 'created']++;
    console.log(
      `  ${state === 'drift' ? 'fixed  ' : 'created'}  ${link.label}  ${where} -> ${tilde(link.src)}`,
    );
  }
}

// Prune our own orphans: dangling symlinks under ~/.claude/{skills,agents,hooks} that
// point into the harness (e.g. left by a removed harness skill). Never touches real
// files (cbm-* hooks, codebase-memory) or links pointing elsewhere.
for (const sub of ['skills', 'agents', 'hooks']) {
  const dir = join(CLAUDE, sub);
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    const p = join(dir, name);
    if (!isLink(p) || existsSync(p)) continue; // keep valid links and real entries
    if (!linkTarget(p).startsWith(HARNESS)) continue; // not ours
    if (CHECK) {
      failures++;
      console.log(`  ORPHAN       ${tilde(p)}  (dangling -> ${tilde(linkTarget(p))})`);
    } else if (DRY) {
      console.log(`  would prune  ${tilde(p)}  (dangling)`);
    } else {
      rmSync(p, { force: true });
      counts.pruned++;
      console.log(`  pruned       ${tilde(p)}  (dangling)`);
    }
  }
}

// Resource reachability: the anchored skill/agent references resolve only if these exist.
let missingRes = 0;
for (const rel of RESOURCES) {
  if (!existsSync(join(CLAUDE, rel))) {
    missingRes++;
    failures++;
    console.log(`  MISSING-RES  ~/.claude/${rel}  (referenced by a skill/agent)`);
  }
}

const mode = CHECK ? 'check' : DRY ? 'dry-run' : 'apply';
console.log(
  `\n[setup-claude] ${mode}: ${links.length} links — ok ${counts.ok}, created ${counts.created}, fixed ${counts.fixed}, pruned ${counts.pruned}, conflict ${counts.conflict}, missing-src ${counts['no-source']} | resources ${RESOURCES.length - missingRes}/${RESOURCES.length}`,
);

if (CHECK && failures > 0) {
  console.log('  -> run `just setup-claude` to repair (resource gaps need a harness fix).');
  process.exit(1);
}
if (!CHECK && !DRY && (counts.conflict > 0 || counts['no-source'] > 0)) process.exit(1);
