#!/usr/bin/env node
// audit-usage.mjs — Skill & agent usage audit for the Claude harness.
//
// Parses Claude Code session transcripts (~/.claude/projects/**/*.jsonl) and
// counts how often each Skill (Skill tool) and sub-agent (Agent/Task tool) was
// invoked over a time window, then joins hand-rated importance from
// scripts/usage-labels.json and derives type / scope / verdict so you can tell
// real bloat from valuable-but-never-triggered.
//
// Read-only and idempotent (re-running never changes a count). No dependencies.
//   node scripts/audit-usage.mjs            # last 7 days
//   node scripts/audit-usage.mjs --days 30
//   node scripts/audit-usage.mjs --all      # all retained history
//   node scripts/audit-usage.mjs --full     # include every defined item, not just used/yours/rated
//   node scripts/audit-usage.mjs --json
//
// Columns: count | name | value | type | scope | verdict | last | sess (+ note line)
//   value   — importance, from usage-labels.json (critical|high|medium|low|—)
//   type    — builtin | custom | plugin | template  (auto-derived)
//   scope   — where defined: global | <repo name(s)> | plugin
//   verdict — KEEP | PROTECT | REVIEW | TRIM  (derived from value x usage)

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- args -----------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(name);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : def;
};
const flag = (name) => argv.includes(name);

const HERE = dirname(fileURLToPath(import.meta.url));
const HOME = homedir();
const CONFIG = opt('--config', process.env.CLAUDE_CONFIG_DIR || join(HOME, '.claude'));
const ROOTS = opt('--roots', join(HOME, 'projects')).split(',').filter(Boolean);
const LABELS_PATH = opt('--labels', join(HERE, 'usage-labels.json'));
const AS_JSON = flag('--json');
const SHOW_ALL = flag('--full');
const CSV = opt('--csv', join(CONFIG, 'usage-log.csv'));

// Minimal RFC4180 line parser: handles quoted fields with embedded commas/quotes, so a
// quoted name written by the usage-logger hook is not truncated at the first comma.
const parseCsvLine = (line) => {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          q = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      q = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
};

const now = Date.now();
let since = null;
let until = null;
if (flag('--all')) {
  since = -Infinity;
  until = Infinity;
} else if (opt('--since', null) || opt('--until', null)) {
  const s = opt('--since', null);
  const u = opt('--until', null);
  since = s ? Date.parse(`${s}T00:00:00Z`) : -Infinity;
  until = u ? Date.parse(`${u}T23:59:59Z`) : Infinity;
} else {
  const days = Number(opt('--days', '7'));
  since = now - days * 86400000;
  until = Infinity;
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'target',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
  '.venv',
  'venv',
  '__pycache__',
  '.cache',
]);
// Framework-provided agent types (not yours to trim).
const BUILTIN_AGENTS = new Set([
  'general-purpose',
  'claude',
  'Explore',
  'Plan',
  'statusline-setup',
  'claude-code-guide',
  'fork',
  'output-style-setup',
]);
const TEMPLATE_NAMES = new Set(['example-command', 'example-skill', 'playground']);

// ---- helpers --------------------------------------------------------------
function walk(dir, onFile, onDirNamed) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      if (onDirNamed) onDirNamed(e.name, full);
      walk(full, onFile, onDirNamed);
    } else if (e.isFile()) {
      onFile(full, e.name);
    }
  }
}
const listFiles = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

// ---- labels ---------------------------------------------------------------
let labels = { agents: {}, skills: {} };
try {
  labels = JSON.parse(readFileSync(LABELS_PATH, 'utf8'));
} catch {
  /* no labels file — everything stays unrated */
}
const labelFor = (kind, name) => labels[kind]?.[name] || {};

// ---- 1. usage from transcripts -------------------------------------------
const transcripts = [];
walk(join(CONFIG, 'projects'), (full, name) => {
  if (name.endsWith('.jsonl')) transcripts.push(full);
});

const skills = new Map();
const agents = new Map();
const seen = new Set(); // dedup tool_use ids across resumed/forked transcripts
let transcriptFloor = Infinity; // oldest ts transcripts still cover
let dataMin = Infinity;
let dataMax = -Infinity;

const bump = (map, name, ts, session) => {
  let r = map.get(name);
  if (!r) {
    r = { count: 0, last: -Infinity, sessions: new Set() };
    map.set(name, r);
  }
  r.count++;
  if (ts > r.last) r.last = ts;
  if (session) r.sessions.add(session);
};

for (const file of transcripts) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const line of text.split('\n')) {
    if (!line) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = d.timestamp ? Date.parse(d.timestamp) : NaN;
    if (!Number.isNaN(ts) && ts < transcriptFloor) transcriptFloor = ts;
    const msg = d.message;
    const content = msg && typeof msg === 'object' ? msg.content : null;
    if (!Array.isArray(content)) continue;
    const session = d.sessionId;
    for (const b of content) {
      if (b?.type !== 'tool_use') continue;
      let map = null;
      let name = null;
      if (b.name === 'Skill') {
        map = skills;
        name = b.input?.skill || '(unknown)';
      } else if (b.name === 'Agent' || b.name === 'Task') {
        map = agents;
        name = b.input?.subagent_type || '(unknown)';
      }
      if (!map) continue;
      const id = b.id;
      if (id) {
        if (seen.has(id)) continue; // already counted this invocation
        seen.add(id);
      }
      if (!Number.isNaN(ts)) {
        if (ts < dataMin) dataMin = ts;
        if (ts > dataMax) dataMax = ts;
      }
      if (!Number.isNaN(ts) && (ts < since || ts > until)) continue;
      bump(map, name, Number.isNaN(ts) ? 0 : ts, session);
    }
  }
}

// ---- 2. fold in hook CSV (durable log; only the pruned tail) --------------
if (existsSync(CSV)) {
  for (const row of readFileSync(CSV, 'utf8').split('\n')) {
    if (!row || row.startsWith('timestamp,')) continue;
    const [iso, kind, name] = parseCsvLine(row);
    const ts = Date.parse(iso);
    if (Number.isNaN(ts) || ts < since || ts > until) continue;
    if (ts >= transcriptFloor) continue; // covered by transcripts; no double count
    if (kind === 'skill') bump(skills, name, ts);
    else if (kind === 'agent') bump(agents, name, ts);
  }
}

// ---- 3. on-disk definitions (type + scope) -------------------------------
// name -> { type, scopes:Set }
const defAgents = new Map();
const defSkills = new Map();
const addDef = (map, name, type, scope) => {
  let r = map.get(name);
  if (!r) {
    r = { type, scopes: new Set() };
    map.set(name, r);
  }
  // precedence: template > custom > plugin (so a template never reads as plugin)
  const rank = { template: 3, custom: 2, plugin: 1 };
  if ((rank[type] || 0) > (rank[r.type] || 0)) r.type = type;
  if (scope) r.scopes.add(scope);
};
const repoOf = (claudeDir) => basename(dirname(claudeDir)); // dir that holds .claude
const skillType = (name, path) =>
  TEMPLATE_NAMES.has(name) || name.startsWith('example') || /[/\\]templates[/\\]/.test(path)
    ? 'template'
    : null;

// global ~/.claude
for (const e of listFiles(join(CONFIG, 'agents')))
  if (e.isFile() && e.name.endsWith('.md'))
    addDef(defAgents, e.name.replace(/\.md$/, ''), 'custom', 'global');
for (const e of listFiles(join(CONFIG, 'skills')))
  if (e.isDirectory() && existsSync(join(CONFIG, 'skills', e.name, 'SKILL.md')))
    addDef(defSkills, e.name, skillType(e.name, '') || 'custom', 'global');

// plugin marketplaces (skills + commands)
walk(join(CONFIG, 'plugins', 'marketplaces'), (full, name) => {
  if (name === 'SKILL.md') {
    const n = basename(dirname(full));
    addDef(defSkills, n, skillType(n, full) || 'plugin', 'plugin');
  } else if (name.endsWith('.md') && /[/\\]commands[/\\]/.test(full)) {
    const n = name.replace(/\.md$/, '');
    addDef(defSkills, n, skillType(n, full) || 'plugin', 'plugin');
  }
});

// project repos under ROOTS
for (const root of ROOTS) {
  walk(
    root,
    () => {},
    (dirName, full) => {
      if (dirName !== '.claude') return;
      const scope = repoOf(full);
      for (const e of listFiles(join(full, 'agents')))
        if (e.isFile() && e.name.endsWith('.md'))
          addDef(defAgents, e.name.replace(/\.md$/, ''), 'custom', scope);
      for (const e of listFiles(join(full, 'skills')))
        if (e.isDirectory() && existsSync(join(full, 'skills', e.name, 'SKILL.md')))
          addDef(defSkills, e.name, skillType(e.name, full) || 'custom', scope);
    },
  );
}

// ---- 4. classify + verdict -----------------------------------------------
const VAL_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

const classify = (kind, name) => {
  const def = kind === 'agents' ? defAgents.get(name) : defSkills.get(name);
  if (kind === 'agents' && BUILTIN_AGENTS.has(name)) return { type: 'builtin', scopes: [] };
  if (def) return { type: def.type, scopes: [...def.scopes] };
  return { type: 'unknown', scopes: [] };
};

const verdictFor = (value, count, type) => {
  if (type === 'builtin') return '—';
  if (type === 'template' && count === 0) return 'template'; // expected-unused scaffolding
  const high = value === 'critical' || value === 'high';
  const low = value === 'low';
  if (count === 0) return high ? 'PROTECT' : low ? 'TRIM' : 'REVIEW';
  if (count <= 2) return high ? 'KEEP' : low ? 'TRIM' : 'REVIEW';
  return 'KEEP';
};

const buildRows = (kind, usageMap, defMap) => {
  const names = new Set([...usageMap.keys(), ...defMap.keys(), ...Object.keys(labels[kind] || {})]);
  const rows = [];
  for (const name of names) {
    const u = usageMap.get(name);
    const { type, scopes } = classify(kind, name);
    const lab = labelFor(kind, name);
    const value = lab.value || null;
    const count = u ? u.count : 0;
    const row = {
      name,
      count,
      sessions: u ? u.sessions.size : 0,
      last: u ? u.last : -Infinity,
      value,
      type,
      scope: scopes.length
        ? scopes.join(',')
        : type === 'builtin'
          ? '—'
          : type === 'plugin'
            ? 'plugin'
            : '—',
      note: lab.note || '',
      verdict: verdictFor(value, count, type),
    };
    // default view: used, your own (custom), or rated. --full shows everything.
    if (SHOW_ALL || count > 0 || type === 'custom' || value) rows.push(row);
  }
  rows.sort(
    (a, b) =>
      b.count - a.count ||
      (VAL_RANK[b.value] || 0) - (VAL_RANK[a.value] || 0) ||
      a.name.localeCompare(b.name),
  );
  return rows;
};

const agentRows = buildRows('agents', agents, defAgents);
const skillRows = buildRows('skills', skills, defSkills);

// never invoked, grouped by type (real bloat vs expected-unused)
const neverByType = (defMap, usageMap) => {
  const out = { custom: [], plugin: [], template: [] };
  for (const [name, def] of defMap) {
    if (usageMap.has(name)) continue;
    if (!out[def.type]) out[def.type] = [];
    out[def.type].push(name);
  }
  for (const k of Object.keys(out)) out[k].sort();
  return out;
};
const neverAgents = neverByType(defAgents, agents);
const neverSkills = neverByType(defSkills, skills);

// ---- 5. output ------------------------------------------------------------
const fmtDate = (ms) =>
  ms === -Infinity || !Number.isFinite(ms) ? '—' : new Date(ms).toISOString().slice(0, 10);
const ago = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const d = Math.floor((now - ms) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? '1d ago' : `${d}d ago`;
};
const windowLabel = flag('--all')
  ? 'all history'
  : since === -Infinity
    ? `until ${fmtDate(until)}`
    : `${fmtDate(since)} → ${until === Infinity ? 'now' : fmtDate(until)}`;

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        window: windowLabel,
        transcripts: transcripts.length,
        dataRange: [fmtDate(dataMin), fmtDate(dataMax)],
        agents: agentRows,
        skills: skillRows,
        neverInvoked: { agents: neverAgents, skills: neverSkills },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
const trunc = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const table = (title, rows) => {
  console.log(`\n${title}`);
  if (rows.length === 0) {
    console.log('  (nothing to show)');
    return;
  }
  const nameW = Math.min(Math.max(...rows.map((r) => r.name.length), 4), 26);
  console.log(
    `  ${lpad('cnt', 4)}  ${pad('name', nameW)}  ${pad('value', 8)}  ${pad('type', 8)}  ${pad('scope', 16)}  ${pad('verdict', 8)}  ${pad('last', 7)}  sess`,
  );
  console.log(`  ${'─'.repeat(4 + 2 + nameW + 2 + 8 + 2 + 8 + 2 + 16 + 2 + 8 + 2 + 7 + 6)}`);
  for (const r of rows) {
    console.log(
      `  ${lpad(r.count, 4)}  ${pad(trunc(r.name, nameW), nameW)}  ${pad(r.value || '—', 8)}  ${pad(r.type, 8)}  ${pad(trunc(r.scope, 16), 16)}  ${pad(r.verdict, 8)}  ${pad(ago(r.last), 7)}  ${r.sessions}`,
    );
    if (r.note) console.log(`         ↳ ${r.note}`);
  }
};

console.log('═'.repeat(78));
console.log('Claude harness — skill & agent usage audit');
console.log(
  `window: ${windowLabel}   |   ${transcripts.length} transcripts   |   data spans ${fmtDate(dataMin)} → ${fmtDate(dataMax)}`,
);
console.log('═'.repeat(78));

table('AGENTS  (Agent/Task tool, by subagent_type)', agentRows);
table('SKILLS  (Skill tool, by skill name)', skillRows);

const line = (label, obj) => {
  const parts = [];
  if (obj.custom?.length) parts.push(`custom: ${obj.custom.join(', ')}`);
  if (obj.plugin?.length) parts.push(`plugin: ${obj.plugin.join(', ')}`);
  if (obj.template?.length) parts.push(`template: ${obj.template.join(', ')}`);
  console.log(`  ${label}:`);
  console.log(parts.length ? parts.map((p) => `    ${p}`).join('\n') : '    —');
};

console.log(`\n${'─'.repeat(78)}`);
console.log('DEFINED BUT NEVER INVOKED (in window) — grouped by type:');
console.log(
  '  custom = your own (real trim candidates) · template = expected unused · plugin = whole pack to weigh',
);
line('agents', neverAgents);
line('skills', neverSkills);
console.log(`${'─'.repeat(78)}`);
console.log(
  'verdict legend:  KEEP = used & valuable   PROTECT = valuable but never triggered (fix the trigger,',
);
console.log(
  "don't delete)   REVIEW = unrated/medium & unused or rare   TRIM = low value & unused/rare",
);
console.log(
  'value is IMPORTANCE (edit scripts/usage-labels.json), independent of frequency (the cnt column).',
);
