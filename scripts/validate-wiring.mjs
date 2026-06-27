#!/usr/bin/env node
// validate-wiring.mjs — check that every skill & sub-agent is correctly wired
// for the harness and each sub-project, per the Agent Skills layout:
//   skills  -> <root>/.claude/skills/<name>/SKILL.md  (dir or symlink to one)
//   agents  -> <root>/.claude/agents/<name>.md        (YAML frontmatter)
// Bare *.md files in .claude/skills/ are NOT skills (those belong in
// .claude/commands/). Reports PASS/WARN/FAIL; exits 1 if any FAIL.
//
//   node scripts/validate-wiring.mjs                 # harness + projects/*
//   node scripts/validate-wiring.mjs --roots a,b,c   # explicit roots
//   node scripts/validate-wiring.mjs --json

import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : d;
};
const AS_JSON = argv.includes('--json');
const HARNESS = opt('--harness', join(homedir(), 'projects/ai-apps/claude-harness'));

let roots = opt('--roots', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (roots.length === 0) {
  roots = [HARNESS];
  const projDir = join(HARNESS, 'projects');
  try {
    for (const e of readdirSync(projDir, { withFileTypes: true }))
      if (e.isDirectory() && existsSync(join(projDir, e.name, '.claude')))
        roots.push(join(projDir, e.name));
  } catch {
    /* no projects dir */
  }
}

const frontmatter = (file) => {
  let txt = '';
  try {
    txt = readFileSync(file, 'utf8');
  } catch {
    return {};
  }
  const m = txt.match(/^---\s*([\s\S]*?)\n---/);
  const body = m ? m[1] : txt.slice(0, 400);
  const name = body.match(/^name:\s*(.+)$/m);
  return {
    name: name ? name[1].trim().replace(/^["']|["']$/g, '') : null,
    hasDesc: /^description:\s*\S/m.test(body),
    hasFrontmatter: !!m,
  };
};

const listDirs = (d) => {
  try {
    return readdirSync(d, { withFileTypes: true });
  } catch {
    return [];
  }
};

// shallow scan for a package.json (excl node_modules) depending on pixi.js
const SKIP_SCAN = new Set(['node_modules', 'projects', 'templates', '.git', '.claude']);
const usesPixi = (root) => {
  const stack = [[root, 0]];
  while (stack.length) {
    const [dir, depth] = stack.pop();
    if (depth > 3) continue;
    for (const e of listDirs(dir)) {
      if (SKIP_SCAN.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) stack.push([full, depth + 1]);
      else if (e.name === 'package.json') {
        try {
          const p = JSON.parse(readFileSync(full, 'utf8'));
          const deps = { ...p.dependencies, ...p.devDependencies };
          if (deps?.['pixi.js']) return true;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return false;
};

const report = [];
let totalFail = 0;
let totalWarn = 0;

for (const root of roots) {
  const r = { root, skills: [], agents: [], notes: [] };
  const claude = join(root, '.claude');
  if (!existsSync(claude)) {
    r.notes.push({ level: 'WARN', msg: 'no .claude directory (not a Claude-enabled project)' });
    totalWarn++;
    report.push(r);
    continue;
  }

  // ---- skills ----
  const skillsDir = join(claude, 'skills');
  for (const e of listDirs(skillsDir)) {
    const name = e.name;
    const full = join(skillsDir, name);
    let level = 'PASS';
    let msg = '';
    const isLink = (() => {
      try {
        return lstatSync(full).isSymbolicLink();
      } catch {
        return false;
      }
    })();
    if (isLink) {
      let ok = false;
      try {
        ok = existsSync(join(full, 'SKILL.md')) && statSync(realpathSync(full)).isDirectory();
      } catch {
        ok = false;
      }
      if (!ok) {
        level = 'FAIL';
        msg = 'broken symlink / target has no SKILL.md';
      } else {
        const fm = frontmatter(join(full, 'SKILL.md'));
        if (!fm.name || !fm.hasDesc) {
          level = 'WARN';
          msg = 'linked OK but SKILL.md missing name/description';
        } else msg = 'symlink -> SKILL.md';
      }
    } else if (e.isDirectory()) {
      if (!existsSync(join(full, 'SKILL.md'))) {
        level = 'FAIL';
        msg = 'directory has no SKILL.md';
      } else {
        const fm = frontmatter(join(full, 'SKILL.md'));
        if (!fm.hasFrontmatter || !fm.name || !fm.hasDesc) {
          level = 'WARN';
          msg = 'SKILL.md missing frontmatter name/description';
        } else if (fm.name !== name) {
          level = 'WARN';
          msg = `frontmatter name '${fm.name}' != dir '${name}'`;
        }
      }
    } else if (name.endsWith('.md')) {
      level = 'FAIL';
      msg = 'bare .md in skills/ — not a skill (use <name>/SKILL.md, or move to .claude/commands/)';
    } else {
      continue;
    }
    if (level === 'FAIL') totalFail++;
    if (level === 'WARN') totalWarn++;
    r.skills.push({ name, level, msg });
  }

  // ---- agents ----
  const agentsDir = join(claude, 'agents');
  for (const e of listDirs(agentsDir)) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    const name = e.name.replace(/\.md$/, '');
    const fm = frontmatter(join(agentsDir, e.name));
    let level = 'PASS';
    let msg = '';
    if (!fm.hasFrontmatter || !fm.name || !fm.hasDesc) {
      level = 'FAIL';
      msg = 'missing frontmatter name/description';
    } else if (fm.name !== name) {
      level = 'WARN';
      msg = `frontmatter name '${fm.name}' != file '${name}'`;
    }
    if (level === 'FAIL') totalFail++;
    if (level === 'WARN') totalWarn++;
    r.agents.push({ name, level, msg });
  }

  // ---- appropriateness: pixi dep but no working pixijs skill ----
  if (usesPixi(root)) {
    const hasPixiSkill = r.skills.some((s) => s.name === 'pixijs' && s.level !== 'FAIL');
    if (!hasPixiSkill) {
      r.notes.push({
        level: 'WARN',
        msg: "depends on pixi.js but no working 'pixijs' skill wired (run wire-pixijs-skills.mjs / npm install)",
      });
      totalWarn++;
    }
  }
  report.push(r);
}

if (AS_JSON) {
  console.log(JSON.stringify({ totalFail, totalWarn, roots: report }, null, 2));
  process.exit(totalFail ? 1 : 0);
}

const icon = { PASS: '✓', WARN: '!', FAIL: '✗' };
const short = (p) => p.replace(`${join(homedir(), 'projects')}/`, '');
for (const r of report) {
  console.log(`\n### ${short(r.root)}`);
  for (const n of r.notes) console.log(`  [${n.level}] ${n.msg}`);
  const sFail = r.skills.filter((s) => s.level !== 'PASS');
  const okSkills = r.skills.length - sFail.length;
  console.log(`  skills: ${r.skills.length} (${okSkills} ok)`);
  for (const s of sFail) console.log(`    ${icon[s.level]} ${s.name} — ${s.msg}`);
  const aFail = r.agents.filter((a) => a.level !== 'PASS');
  console.log(`  agents: ${r.agents.length} (${r.agents.length - aFail.length} ok)`);
  for (const a of aFail) console.log(`    ${icon[a.level]} ${a.name} — ${a.msg}`);
}
console.log(`\n${'═'.repeat(60)}`);
console.log(`TOTAL: ${totalFail} FAIL, ${totalWarn} WARN across ${report.length} roots`);
process.exit(totalFail ? 1 : 0);
