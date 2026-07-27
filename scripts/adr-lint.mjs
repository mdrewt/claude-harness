#!/usr/bin/env node
// adr-lint.mjs — validate an ADR corpus against standards/adr-process.md.
// Zero-dep, importable (like research-lint.mjs). Checks per file:
//   - every *.md (minus README/template/index) must be a NNNN-slug.md ADR
//   - title line `# NNNN. <Title>` whose number matches the filename NNNN
//   - no duplicate numbers (compared numerically — 0139 == 139)
//   - `- Status:` pinned to the enum (proposed|accepted|rejected|deprecated|
//     superseded by [ADR-]NNNN); a supersede target must exist in the dir
//   - `- Date: YYYY-MM-DD`
//   - ## Confirmation: backticked repo-path-shaped tokens are existence-checked
//     (false-green) ONLY when relative and their first segment exists under
//     root — `~/...`, absolute paths, prose like `I/O`, globs, and other-repo
//     paths are skipped. Missing/empty Confirmation on an accepted|proposed
//     ADR: WARN by default. With --strict-confirmation, an accepted ADR FAILs
//     unless its Confirmation is not `proposed — …` AND names a checkable gate
//     (an existing backticked repo path or a `just <recipe>` token) or the
//     literal `unenforced — review-only` (dashes normalized).
//   Cross-references in prose (e.g. "ADR-0139", markdown links) are OUT OF
//   SCOPE — only `- Status: superseded by` targets are resolved.
//
//   node adr-lint.mjs <adrDir> [--strict-confirmation] [--root <repoRoot>]
//     --root defaults to <adrDir>/../.. (docs/adr → repo root).
// Exit codes: 0 ok (warnings allowed) · 1 one or more FAILs · 2 bad usage.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const STATUS_SIMPLE = new Set(['proposed', 'accepted', 'rejected', 'deprecated']);
const SKIP_FILES = new Set(['README.md', 'template.md', 'index.md', 'INDEX.md']);
const ADR_FILE = /^(\d{3,5})-.*\.md$/;

function stripFences(txt) {
  return txt.replace(/^```.*\n[\s\S]*?^```[ \t]*$/gm, '');
}

function confirmationSection(txt) {
  const m = txt.match(/^##[ \t]*Confirmation[ \t]*$([\s\S]*?)(?=^##[ \t]|\n*$(?![\s\S]))/m);
  return m ? m[1].trim() : null;
}

function pathShapedTokens(section) {
  // backticked tokens that look like RELATIVE repo paths: contain '/', no glob
  // metachars, no whitespace, not a URL, not `~/...` (no expansion), not
  // absolute (environment-dependent, not repo-checkable).
  return [...section.matchAll(/`([^`\n]+)`/g)]
    .map((m) => m[1].trim())
    .filter(
      (t) =>
        t.includes('/') &&
        !t.startsWith('~') &&
        !t.startsWith('/') &&
        !/[*?[\]{}]/.test(t) &&
        !/\s/.test(t) &&
        !/^[a-z]+:\/\//i.test(t),
    );
}

function checkableInRoot(root, t) {
  // Existence-check only when the token's first path segment is a real entry
  // under root — separates "typo'd file in a real dir" (FAIL) from prose slash
  // tokens (`I/O`, `and/or`) and other-repo paths (skip).
  const first = t.split('/', 1)[0];
  return first !== '' && existsSync(join(root, first));
}

function normalizeDashes(s) {
  return s.replace(/[—–]/g, '-');
}

function lintFile(dir, file, numbers, { strict, root }) {
  const fails = [];
  const warns = [];
  const txt = stripFences(readFileSync(join(dir, file), 'utf8'));
  const fileNum = file.match(ADR_FILE)?.[1];
  const titleNum = txt.match(/^#[ \t]*(\d{3,5})\.[ \t]+\S/m)?.[1];
  if (!titleNum) fails.push('missing title line `# NNNN. <Title>`');
  else if (fileNum && Number(titleNum) !== Number(fileNum))
    fails.push(`title number ${titleNum} != filename number ${fileNum}`);
  if (fileNum) {
    const key = String(Number(fileNum));
    if (numbers.has(key)) fails.push(`duplicate ADR number ${fileNum} (also ${numbers.get(key)})`);
    else numbers.set(key, file);
  }
  const status = txt.match(/^-[ \t]*Status:[ \t]*(.+)$/m)?.[1]?.trim();
  const supersededBy = status?.match(/^superseded by (?:ADR-)?(\d{1,5})$/i)?.[1];
  if (!status) fails.push('missing `- Status:` line');
  else if (!STATUS_SIMPLE.has(status) && !supersededBy)
    fails.push(
      `status '${status}' not one of ${[...STATUS_SIMPLE].join('/')} | 'superseded by NNNN'`,
    );
  if (supersededBy) {
    const want = Number(supersededBy);
    const target = readdirSync(dir).some((f) => Number(f.match(ADR_FILE)?.[1]) === want);
    if (!target) fails.push(`superseded by ${supersededBy}: no matching NNNN-*.md in ${dir}`);
  }
  if (!/^-[ \t]*Date:[ \t]*\d{4}-\d{2}-\d{2}[ \t]*$/m.test(txt))
    fails.push('missing/malformed `- Date: YYYY-MM-DD`');

  const conf = confirmationSection(txt);
  const wantsConfirmation = status === 'accepted' || status === 'proposed';
  if (conf === null || conf === '') {
    if (strict && status === 'accepted')
      fails.push('accepted ADR missing/empty ## Confirmation (strict)');
    else if (wantsConfirmation)
      warns.push('no ## Confirmation content (which gate enforces this decision?)');
  } else {
    const tokens = pathShapedTokens(conf);
    for (const t of tokens) {
      if (checkableInRoot(root, t) && !existsSync(resolve(root, t)))
        fails.push(`Confirmation names nonexistent path \`${t}\` (false-green)`);
    }
    if (status === 'accepted' && strict) {
      if (/^proposed\b/i.test(conf))
        fails.push('accepted ADR whose Confirmation is still `proposed — ...` (strict)');
      else {
        const hasRealPath = tokens.some(
          (t) => checkableInRoot(root, t) && existsSync(resolve(root, t)),
        );
        const hasJustRecipe = /`just [a-z][a-z0-9-]*( [^`]*)?`/.test(conf);
        const hasLiteral = /unenforced\s*-\s*review-only/i.test(normalizeDashes(conf));
        if (!hasRealPath && !hasJustRecipe && !hasLiteral)
          fails.push(
            'accepted ADR Confirmation names no checkable gate (backticked repo path or `just <recipe>`) nor the literal `unenforced — review-only` (strict)',
          );
      }
    }
  }
  return { fails, warns };
}

export function lint(dir, { strict = false, root = resolve(dir, '../..') } = {}) {
  const all = readdirSync(dir).filter((f) => f.endsWith('.md') && !SKIP_FILES.has(f));
  const files = all.filter((f) => ADR_FILE.test(f)).sort();
  const malformed = all.filter((f) => !ADR_FILE.test(f));
  const numbers = new Map();
  let failCount = 0;
  let warnCount = 0;
  for (const f of malformed) {
    console.error(`FAIL ${f}: filename is not NNNN-slug.md (malformed ADRs escape the gate)`);
    failCount++;
  }
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

function main() {
  // pathToFileURL (not template-string comparison): a %-encodable char or a
  // Windows path in argv[1] must not silently turn the CLI into a green no-op.
  if (!process.argv[1] || import.meta.url !== pathToFileURL(process.argv[1]).href) return;
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'strict-confirmation': { type: 'boolean', default: false },
        root: { type: 'string' },
      },
      allowPositionals: true,
    });
  } catch (e) {
    console.error(`adr-lint: ${e.message}`);
    process.exit(2);
  }
  const dir = parsed.positionals[0];
  if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error('usage: node adr-lint.mjs <adrDir> [--strict-confirmation] [--root <repoRoot>]');
    process.exit(2);
  }
  const opts = { strict: parsed.values['strict-confirmation'] };
  if (parsed.values.root) opts.root = parsed.values.root;
  process.exit(lint(dir, opts) ? 0 : 1);
}
main();
