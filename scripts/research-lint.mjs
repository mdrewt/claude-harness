#!/usr/bin/env node
// research-lint.mjs — validate research-library docs against the research-protocol
// authoring contract. Zero-dep. Complements research-index.mjs (which checks index
// sync + duplicate slugs); this checks PER-DOC frontmatter completeness, the one-line
// abstract, and — with --shared — the project-agnostic purity rule for the shared
// "consultant" library (no project / milestone / ADR leakage).
//
//   node research-lint.mjs <researchDir> [--shared]
//     --shared : enforce project-agnostic purity. Use for the harness shared library;
//                omit for a project-local library (which may reference its own
//                milestones/ADRs).
//
// Exit codes: 0 ok (warnings allowed) · 1 one or more FAILs · 2 bad usage.
// Importable: `import { lint } from "./research-lint.mjs"`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED = [
  'title',
  'slug',
  'domain',
  'tags',
  'status',
  'updated',
  'confidence',
  'sources',
  'abstract',
];
const STATUS = new Set(['draft', 'active', 'stale', 'superseded']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);
const ABSTRACT_MAX = 120;

// HARD project-leakage → FAIL under --shared (unambiguous).
const HARD_LEAK = [
  { re: /\bmonster-realm\b/i, what: "project name 'monster-realm'" },
  { re: /\bpokemon-mmo\b/i, what: "project name 'pokemon-mmo'" },
  { re: /\bADR-\d{3,4}\b/, what: 'ADR id reference' },
];
// SOFT milestone-looking tokens → WARN under --shared (false positives exist, e.g. an
// "M3" chip or a version), surfaced for a human glance rather than failing the build.
const SOFT_LEAK = /\bM\d{1,2}[a-d]?\b/g;

function parseFm(txt) {
  const m = txt.match(/^---\s*([\s\S]*?)\n---/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  for (const k of REQUIRED) {
    const mm = body.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'));
    out[k] = mm ? mm[1].trim().replace(/^["']|["']$/g, '') : undefined;
  }
  return out;
}

function lintFile(dir, file, { shared }) {
  const fails = [];
  const warns = [];
  const txt = readFileSync(join(dir, file), 'utf8');
  const fm = parseFm(txt);
  if (!fm) {
    fails.push('no YAML frontmatter block');
    return { fails, warns };
  }
  for (const k of REQUIRED) {
    if (fm[k] === undefined || fm[k] === '') fails.push(`missing frontmatter key: ${k}`);
  }
  const expectedSlug = file.replace(/\.md$/, '');
  if (fm.slug && fm.slug !== expectedSlug)
    fails.push(`slug '${fm.slug}' != filename '${expectedSlug}'`);
  if (fm.status && !STATUS.has(fm.status))
    fails.push(`status '${fm.status}' not one of ${[...STATUS].join('/')}`);
  if (fm.confidence && !CONFIDENCE.has(fm.confidence))
    fails.push(`confidence '${fm.confidence}' not one of ${[...CONFIDENCE].join('/')}`);
  if (fm.abstract && /\n/.test(fm.abstract)) fails.push('abstract must be a single line');
  if (fm.abstract && fm.abstract.length > ABSTRACT_MAX)
    warns.push(`abstract ${fm.abstract.length} chars > ${ABSTRACT_MAX} (index truncates)`);
  if (fm.sources !== undefined && !/^\d+$/.test(String(fm.sources)))
    warns.push(`sources should be a count, got '${fm.sources}'`);
  if (shared) {
    for (const { re, what } of HARD_LEAK) {
      if (re.test(txt))
        fails.push(`project leakage — ${what}: shared docs must be project-agnostic`);
    }
    const ms = [...new Set([...txt.matchAll(SOFT_LEAK)].map((x) => x[0]))];
    if (ms.length)
      warns.push(
        `milestone-looking tokens (review for project leakage; false positives OK): ${ms.join(', ')}`,
      );
  }
  return { fails, warns };
}

export function lint(dir, { shared = false } = {}) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'INDEX.md')
    .sort();
  let failCount = 0;
  let warnCount = 0;
  for (const f of files) {
    const { fails, warns } = lintFile(dir, f, { shared });
    for (const x of fails) {
      console.error(`FAIL ${f}: ${x}`);
      failCount++;
    }
    for (const x of warns) {
      console.error(`WARN ${f}: ${x}`);
      warnCount++;
    }
  }
  console.log(
    `research-lint: ${files.length} docs · ${failCount} FAIL · ${warnCount} WARN${shared ? ' · purity:on' : ''}`,
  );
  return failCount === 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const shared = args.includes('--shared');
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error('usage: research-lint <researchDir> [--shared]');
    process.exit(2);
  }
  process.exit(lint(dir, { shared }) ? 0 : 1);
}
