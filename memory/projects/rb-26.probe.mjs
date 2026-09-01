#!/usr/bin/env node
// rb-26.probe.mjs — per-clause bite proof for the [T4/*] doc-tie tooth.
//
// Each mutant reintroduces EXACTLY ONE of the corrections rb-26 shipped, into a
// throwaway COPY of the worktree, and asserts the tooth reds AT THAT CLAUSE'S
// OWN TAG. Per-mutant tag pinning is the point: an exit-code or "some failure
// happened" probe cannot tell a hollowed target clause from a neighbouring
// clause catching the same mutant (the shadowed-tooth trap). M0 is the CONTROL
// (unmutated tree must be GREEN) — without it every mutant is green for free.
//
// Usage: node rb-26.probe.mjs [X1|X2|X4|X5]
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const WT = '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-26';
const EVAL_REL = 'evals/rekey-contract-surface.eval.mjs';
const ADR = 'docs/adr/0207-data-lifecycle-manifest-and-terminal-schema.md';
const ARCH = 'ARCHITECTURE.md';

// Each mutant: revert ONE shipped correction; expect exactly this clause tag.
const MUTANTS = [
  {
    id: 'M1', file: ADR, tag: '[T4/escort]', label: ':19 RETIRED mark removed',
    find: ' **[RETIRED — the measurement was true when made',
    upto: 'recorded by ADR-0223]**', replace: '',
  },
  {
    id: 'M2', file: ADR, tag: '[T4/escort]', label: ':113 RETIRED mark removed',
    find: ' **[RETIRED — this polarity is INVERTED',
    upto: 'recorded by ADR-0223]**', replace: '',
  },
  {
    id: 'M3', file: ADR, tag: '[T4/escort]', label: ':158 RETIRED mark removed',
    find: ' **[RETIRED — true when measured, and reversed by rb-2',
    upto: 'recorded by ADR-0223]**', replace: '',
  },
  {
    id: 'M4', file: ADR, tag: '[T4/instruction]', label: ':109 rewrite reverted to the string-key instruction',
    find: "S3 must add the table's `DATA_LIFECYCLE_MANIFEST` entry and its `REKEY_MANIFEST` entry",
    upto: 'shipped the table together with its `REKEY_MANIFEST` entry.',
    replace: "S3 must add the table's `DATA_LIFECYCLE_MANIFEST` entry and its `REKEY_MANIFEST` string key in the same commit, or T3/[G6/declared] red.",
  },
  {
    id: 'M5', file: ARCH, tag: '[T4/arch]', label: 'rb-2 paragraph ADR-0208 citation removed',
    find: '(residual R-m22-s0-X1; ADR-0208 D1): every', upto: null,
    replace: '(residual R-m22-s0-X1): every',
  },
  {
    id: 'M6', file: ARCH, tag: '[T4/arch]', label: 'rb-3 paragraph ADR-0208 citation removed',
    find: "(residual R-m22-s0-X2; ADR-0208 D2): inside", upto: null,
    replace: "(residual R-m22-s0-X2): inside",
  },
  {
    id: 'M7', file: ADR, tag: '[T4/anchor]', label: 'D5 heading deleted (region unlocatable)',
    find: '### D5', upto: null, replace: '### Dfive',
  },
  {
    id: 'M8', file: ADR, tag: '[T4/anchor]', label: 'a decoy duplicate :158 anchor is planted',
    find: '**Why not the JS path:**', upto: null,
    replace: '**Why not the JS path:** (see also **Why not the JS path:** below)',
  },
  {
    id: 'M9', file: ARCH, tag: '[T4/arch]', label: 'rb-3 citation removed AND the next bold marker de-bolded (the measured swallow attack)',
    find: '(residual R-m22-s0-X2; ADR-0208 D2): inside', upto: null,
    replace: '(residual R-m22-s0-X2): inside', also: { find: '**rb-4**', replace: 'rb-4' },
  },
  {
    id: 'M10', file: ARCH, tag: '[T4/arch]', label: 'rb-3 cites the WRONG decision (D1, which is rb-2 own)',
    find: '(residual R-m22-s0-X2; ADR-0208 D2): inside', upto: null,
    replace: '(residual R-m22-s0-X2; ADR-0208 D1): inside',
  },
];

function run(dir) {
  try {
    const out = execFileSync(process.execPath, [path.join(dir, EVAL_REL)], {
      cwd: dir, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { pass: true, out };
  } catch (e) {
    return { pass: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function mutate(dir, m) {
  const f = path.join(dir, m.file);
  const s = readFileSync(f, 'utf8');
  const i = s.indexOf(m.find);
  if (i === -1) throw new Error(`${m.id}: find-anchor absent — probe is stale, NOT a pass`);
  const end = m.upto === null ? i + m.find.length : s.indexOf(m.upto, i) + m.upto.length;
  if (end < i) throw new Error(`${m.id}: upto-anchor absent — probe is stale, NOT a pass`);
  let next = s.slice(0, i) + m.replace + s.slice(end);
  if (m.also) {
    const before = next;
    next = next.replace(m.also.find, () => m.also.replace);
    if (next === before) throw new Error(m.id + ': the second edit was a NO-OP — a silent no-op reads as "the gate accepted the cheat"');
  }
  if (next === s) throw new Error(`${m.id}: mutation was a NO-OP — a silent no-op reads as "the gate accepted the cheat"`);
  writeFileSync(f, next);
}

const only = process.argv[2];
const tmp = mkdtempSync(path.join(tmpdir(), 'rb26-probe-'));
const results = [];
try {
  // M0 CONTROL — the unmutated tree must be GREEN, else every mutant is vacuous.
  const ctl = path.join(tmp, 'M0');
  cpSync(WT, ctl, { recursive: true, filter: (s) => !s.includes('/.git') && !s.includes('node_modules') });
  const c = run(ctl);
  results.push({ id: 'M0', label: 'CONTROL (unmutated)', ok: c.pass, detail: c.pass ? 'GREEN' : 'RED — probe is vacuous' });
  if (!c.pass) { console.log('rb-26 PROBE ABORT: control is RED\n' + c.out.slice(0, 800)); process.exit(1); }

  for (const m of MUTANTS) {
    const d = path.join(tmp, m.id);
    cpSync(WT, d, { recursive: true, filter: (s) => !s.includes('/.git') && !s.includes('node_modules') });
    mutate(d, m);
    const r = run(d);
    const tagged = !r.pass && r.out.indexOf(m.tag) !== -1;
    results.push({ id: m.id, label: `${m.label} -> ${m.tag}`, ok: tagged,
      detail: r.pass ? 'GREEN (tooth did NOT bite)' : (tagged ? `RED at ${m.tag}` : `RED but NOT at ${m.tag} (shadowed)`) });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id}: ${r.label} — ${r.detail}`);
const bad = results.filter((r) => !r.ok);
const clauses = [...new Set(MUTANTS.map((m) => m.tag))].sort();
if (bad.length === 0) {
  console.log(`rb-26-${only ?? 'ALL'}:DOC-TIE-BITES ${MUTANTS.length}/${MUTANTS.length} mutants caught at their own tag across ${clauses.length} clause(s) ${clauses.join(' ')}, control GREEN`);
  process.exit(0);
}
console.log(`rb-26 PROBE FAILED: ${bad.length}/${results.length}`);
process.exit(1);
