// Proof-of-teeth for scripts/adr-lint.mjs: the gate must PASS clean input and
// BITE each defect class it claims to catch (a lint proven only to fail — or
// only to pass — is half a gate).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { lint } from '../adr-lint.mjs';

function corpus(files) {
  const root = mkdtempSync(join(tmpdir(), 'adrlint-'));
  const dir = join(root, 'docs', 'adr');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'scripts', 'gate.mjs'), '// real gate file\n');
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return { root, dir };
}

const GOOD = `# 0001. Choose a thing
- Status: accepted
- Date: 2026-07-27

## Context and problem statement
Why.

## Considered alternatives
- Option A — rejected.

## Decision outcome
- Chosen: the thing.

## Confirmation
Enforced by \`scripts/gate.mjs\` in \`just ci\`.
`;

test('adr-lint passes a clean corpus (strict and non-strict)', () => {
  const { root, dir } = corpus({ '0001-choose-a-thing.md': GOOD });
  try {
    assert.equal(lint(dir, { root }), true, 'non-strict must pass clean input');
    assert.equal(lint(dir, { strict: true, root }), true, 'strict must pass clean input');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('adr-lint bites: bad status enum, dangling supersede, dangling Confirmation path', () => {
  const bad = `# 0002. Bad one
- Status: superseded by 0099
- Date: 2026-07-27

## Confirmation
Enforced by \`scripts/missing-gate.mjs\`.
`;
  const badEnum = `# 0003. Worse one
- Status: pending
- Date: 2026-07-27
`;
  const { root, dir } = corpus({
    '0001-choose-a-thing.md': GOOD,
    '0002-bad-one.md': bad,
    '0003-worse-one.md': badEnum,
  });
  try {
    assert.equal(
      lint(dir, { root }),
      false,
      'must FAIL on dangling supersede + dangling path + bad enum',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('adr-lint bites: title/filename number mismatch and duplicate numbers', () => {
  const mismatch = GOOD.replace('# 0001.', '# 0009.');
  const { root, dir } = corpus({
    '0001-choose-a-thing.md': mismatch,
    '0001-duplicate.md': GOOD,
  });
  try {
    assert.equal(lint(dir, { root }), false, 'must FAIL on number mismatch + duplicate');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('strict mode: accepted ADR with Confirmation still `proposed` FAILs strict, passes non-strict', () => {
  const stillProposed = GOOD.replace(
    'Enforced by `scripts/gate.mjs` in `just ci`.',
    'proposed — will be enforced by `scripts/gate.mjs` once wired.',
  );
  const { root, dir } = corpus({ '0001-choose-a-thing.md': stillProposed });
  try {
    assert.equal(lint(dir, { root }), true, 'non-strict tolerates a proposed Confirmation');
    assert.equal(lint(dir, { strict: true, root }), false, 'strict must FAIL accepted+proposed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('strict mode: accepted ADR with NO Confirmation FAILs strict, only WARNs non-strict', () => {
  const none = GOOD.replace(/## Confirmation[\s\S]*$/, '');
  const { root, dir } = corpus({ '0001-choose-a-thing.md': none });
  try {
    assert.equal(lint(dir, { root }), true, 'non-strict: missing Confirmation is WARN only');
    assert.equal(
      lint(dir, { strict: true, root }),
      false,
      'strict: accepted without Confirmation FAILs',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('path heuristic: commands and globs are skipped, dangling real paths bite', () => {
  const heuristic = GOOD.replace(
    'Enforced by `scripts/gate.mjs` in `just ci`.',
    'Enforced by `just ci` over `client/src/*` via `scripts/gate.mjs`.',
  );
  const { root, dir } = corpus({ '0001-choose-a-thing.md': heuristic });
  try {
    assert.equal(lint(dir, { root }), true, 'command tokens and globs must not false-positive');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const dangling = GOOD.replace('`scripts/gate.mjs`', '`scripts/not-there.mjs`');
  const c2 = corpus({ '0001-choose-a-thing.md': dangling });
  try {
    assert.equal(lint(c2.dir, { root: c2.root }), false, 'dangling repo path must FAIL');
  } finally {
    rmSync(c2.root, { recursive: true, force: true });
  }
});

test('unenforced escape hatch: pinned literal passes strict', () => {
  const unenforced = GOOD.replace(
    'Enforced by `scripts/gate.mjs` in `just ci`.',
    'unenforced — review-only (no mechanical gate exists for this decision).',
  );
  const { root, dir } = corpus({ '0001-choose-a-thing.md': unenforced });
  try {
    assert.equal(lint(dir, { strict: true, root }), true, 'the pinned literal must satisfy strict');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
