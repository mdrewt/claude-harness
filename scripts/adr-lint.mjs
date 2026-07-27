#!/usr/bin/env node
// adr-lint.mjs — validate an ADR corpus against standards/adr-process.md.
// Zero-dep, importable (like research-lint.mjs). Checks per file:
//   - title line `# NNNN. <Title>` whose number matches the filename NNNN
//   - no duplicate numbers across the corpus
//   - `- Status:` pinned to the enum (proposed|accepted|rejected|deprecated|
//     superseded by NNNN); a `superseded by NNNN` target must exist in the dir
//   - `- Date: YYYY-MM-DD`
//   - Confirmation section (## Confirmation): backtick-quoted repo-path-shaped
//     tokens (contain `/`, no glob metachars, not a URL) must exist on disk —
//     the false-green check: a named-but-nonexistent gate FAILs.
//   - missing Confirmation: WARN by default; with --strict-confirmation an
//     `accepted` ADR FAILs when Confirmation is missing, empty, or still
//     `proposed — ...` (accepted decisions must name their real gate or the
//     literal `unenforced — review-only`).
//
//   node adr-lint.mjs <adrDir> [--strict-confirmation] [--root <repoRoot>]
//     --root defaults to <adrDir>/../.. (docs/adr → repo root).
// Exit codes: 0 ok (warnings allowed) · 1 one or more FAILs · 2 bad usage.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const STATUS_SIMPLE = new Set(['proposed', 'accepted', 'rejected', 'deprecated']);

function confirmationSection(txt) {
  const m = txt.match(/^##\s*Confirmation\s*$([\s\S]*?)(?=^##\s|\n*$(?![\s\S]))/m);
  return m ? m[1].trim() : null;
}

function pathShapedTokens(section) {
  // backticked tokens that look like repo paths: contain '/', no glob
  // metachars, no whitespace, not a URL.
  return [...section.matchAll(/`([^`\n]+)`/g)]
    .map((m) => m[1].trim())
    .filter(
      (t) => t.includes('/') && !/[*?[\]{}]/.test(t) && !/\s/.test(t) && !/^[a-z]+:\/\//i.test(t),
    );
}

function lintFile(dir, file, numbers, { strict, root }) {
  const fails = [];
  const warns = [];
  const txt = readFileSync(join(dir, file), 'utf8');
  const fileNum = file.match(/^(\d{3,5})-/)?.[1];
  const titleNum = txt.match(/^#\s*(\d{3,5})\.\s+\S/m)?.[1];
  if (!titleNum) fails.push('missing title line `# NNNN. <Title>`');
  else if (fileNum && titleNum !== fileNum)
    fails.push(`title number ${titleNum} != filename number ${fileNum}`);
  if (fileNum) {
    if (numbers.has(fileNum))
      fails.push(`duplicate ADR number ${fileNum} (also ${numbers.get(fileNum)})`);
    else numbers.set(fileNum, file);
  }
  const status = txt.match(/^-\s*Status:\s*(.+)$/m)?.[1]?.trim();
  const supersededBy = status?.match(/^superseded by (\d{3,5})$/)?.[1];
  if (!status) fails.push('missing `- Status:` line');
  else if (!STATUS_SIMPLE.has(status) && !supersededBy)
    fails.push(
      `status '${status}' not one of ${[...STATUS_SIMPLE].join('/')} | 'superseded by NNNN'`,
    );
  if (supersededBy) {
    const target = readdirSync(dir).some((f) => f.startsWith(`${supersededBy}-`));
    if (!target) fails.push(`superseded by ${supersededBy}: no ${supersededBy}-*.md in ${dir}`);
  }
  if (!/^-\s*Date:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(txt))
    fails.push('missing/malformed `- Date: YYYY-MM-DD`');
  const conf = confirmationSection(txt);
  if (conf === null) {
    if (strict && status === 'accepted')
      fails.push('accepted ADR missing ## Confirmation (strict)');
    else warns.push('no ## Confirmation section (which gate enforces this decision?)');
  } else {
    if (status === 'accepted' && strict) {
      if (conf === '') fails.push('accepted ADR with empty Confirmation (strict)');
      else if (/^proposed\b/i.test(conf))
        fails.push('accepted ADR whose Confirmation is still `proposed — ...` (strict)');
    }
    for (const t of pathShapedTokens(conf)) {
      if (!existsSync(resolve(root, t)))
        fails.push(`Confirmation names nonexistent path \`${t}\` (false-green)`);
    }
  }
  return { fails, warns };
}

export function lint(dir, { strict = false, root = resolve(dir, '../..') } = {}) {
  const files = readdirSync(dir)
    .filter((f) => /^\d{3,5}-.*\.md$/.test(f))
    .sort();
  const numbers = new Map();
  let failCount = 0;
  let warnCount = 0;
  for (const f of files) {
    const { fails, warns } = lintFile(dir, f, numbers, { strict, root });
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
    `adr-lint: ${files.length} ADRs · ${failCount} FAIL · ${warnCount} WARN${strict ? ' · strict-confirmation:on' : ''}`,
  );
  return failCount === 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict-confirmation');
  const rootIx = args.indexOf('--root');
  const root = rootIx !== -1 ? args[rootIx + 1] : undefined;
  const dir = args.filter((a) => !a.startsWith('--') && a !== root).find(Boolean);
  if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error('usage: node adr-lint.mjs <adrDir> [--strict-confirmation] [--root <repoRoot>]');
    process.exit(2);
  }
  process.exit(lint(dir, { strict, ...(root ? { root } : {}) }) ? 0 : 1);
}
