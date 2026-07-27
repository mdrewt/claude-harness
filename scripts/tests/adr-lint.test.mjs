// Proof-of-teeth for scripts/adr-lint.mjs: the gate must PASS clean input and
// BITE each defect class it claims to catch (a lint proven only to fail — or
// only to pass — is half a gate).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function withCorpus(files, fn) {
  const { root, dir } = corpus(files);
  try {
    fn(root, dir);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
  withCorpus({ '0001-choose-a-thing.md': GOOD }, (root, dir) => {
    assert.equal(lint(dir, { root }), true, 'non-strict must pass clean input');
    assert.equal(lint(dir, { strict: true, root }), true, 'strict must pass clean input');
  });
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
  withCorpus(
    {
      '0001-choose-a-thing.md': GOOD,
      '0002-bad-one.md': bad,
      '0003-worse-one.md': badEnum,
    },
    (root, dir) => {
      assert.equal(lint(dir, { root }), false, 'must FAIL: dangling supersede + path + bad enum');
    },
  );
});

test('supersede resolution is numeric and tolerates ADR- prefix + case', () => {
  const sup = `# 0002. Old one
- Status: Superseded by ADR-1
- Date: 2026-07-27
`;
  withCorpus({ '0001-choose-a-thing.md': GOOD, '0002-old-one.md': sup }, (root, dir) => {
    assert.equal(lint(dir, { root }), true, '`Superseded by ADR-1` must resolve to 0001-*.md');
  });
});

test('adr-lint bites: title/filename number mismatch, duplicate numbers, malformed filename', () => {
  const mismatch = GOOD.replace('# 0001.', '# 0009.');
  withCorpus({ '0001-choose-a-thing.md': mismatch, '0001-duplicate.md': GOOD }, (root, dir) => {
    assert.equal(lint(dir, { root }), false, 'must FAIL on number mismatch + duplicate');
  });
  withCorpus({ '0001-choose-a-thing.md': GOOD, '12-malformed-name.md': GOOD }, (root, dir) => {
    assert.equal(lint(dir, { root }), false, 'a non-NNNN-slug.md ADR must FAIL, not vanish');
  });
});

test('strict mode: accepted ADR with Confirmation still `proposed` FAILs strict, passes non-strict', () => {
  const stillProposed = GOOD.replace(
    'Enforced by `scripts/gate.mjs` in `just ci`.',
    'proposed — will be enforced by `scripts/gate.mjs` once wired.',
  );
  withCorpus({ '0001-choose-a-thing.md': stillProposed }, (root, dir) => {
    assert.equal(lint(dir, { root }), true, 'non-strict tolerates a proposed Confirmation');
    assert.equal(lint(dir, { strict: true, root }), false, 'strict must FAIL accepted+proposed');
  });
});

test('strict mode: accepted ADR with NO Confirmation FAILs strict, only WARNs non-strict', () => {
  const none = GOOD.replace(/## Confirmation[\s\S]*$/, '');
  withCorpus({ '0001-choose-a-thing.md': none }, (root, dir) => {
    assert.equal(lint(dir, { root }), true, 'non-strict: missing Confirmation is WARN only');
    assert.equal(lint(dir, { strict: true, root }), false, 'strict must FAIL accepted+missing');
  });
});

test('strict mode: junk-prose Confirmation with no checkable gate FAILs (no laundering)', () => {
  const junk = GOOD.replace(
    'Enforced by `scripts/gate.mjs` in `just ci`.',
    'TBD, gate coming soon.',
  );
  withCorpus({ '0001-choose-a-thing.md': junk }, (root, dir) => {
    assert.equal(lint(dir, { root }), true, 'non-strict tolerates junk (reviewer backstop)');
    assert.equal(lint(dir, { strict: true, root }), false, 'strict must FAIL junk prose');
  });
});

test('path heuristic: commands, globs, ~-anchors, absolute paths, prose slashes skipped; dangling repo paths bite', () => {
  const skips = GOOD.replace(
    'Enforced by `scripts/gate.mjs` in `just ci`.',
    'Enforced by `just ci` over `client/src/*`; see `~/.claude/harness/scripts/gate.mjs`, `/usr/bin/definitely-not-real-xyz`, and the `I/O` + `and/or` notes; real gate `scripts/gate.mjs`.',
  );
  withCorpus({ '0001-choose-a-thing.md': skips }, (root, dir) => {
    assert.equal(
      lint(dir, { root }),
      true,
      'anchors/absolute/prose/glob tokens must not false-red',
    );
    assert.equal(lint(dir, { strict: true, root }), true, 'strict passes via the real gate token');
  });
  const dangling = GOOD.replace('`scripts/gate.mjs`', '`scripts/not-there.mjs`');
  withCorpus({ '0001-choose-a-thing.md': dangling }, (root, dir) => {
    assert.equal(lint(dir, { root }), false, 'dangling path in an existing root dir must FAIL');
  });
});

test('unenforced escape hatch: literal passes strict, with em-dash or plain hyphen', () => {
  for (const literal of ['unenforced — review-only', 'unenforced - review-only']) {
    const unenforced = GOOD.replace(
      'Enforced by `scripts/gate.mjs` in `just ci`.',
      `${literal} (no mechanical gate exists for this decision).`,
    );
    withCorpus({ '0001-choose-a-thing.md': unenforced }, (root, dir) => {
      assert.equal(lint(dir, { strict: true, root }), true, `'${literal}' must satisfy strict`);
    });
  }
});

test('non-accepted statuses do not demand Confirmation; empty section WARNs like missing', () => {
  const rejected = `# 0002. Not doing it
- Status: rejected
- Date: 2026-07-27
`;
  withCorpus({ '0001-choose-a-thing.md': GOOD, '0002-not-doing-it.md': rejected }, (root, dir) => {
    assert.equal(lint(dir, { strict: true, root }), true, 'rejected ADR needs no Confirmation');
  });
});

test('fenced code blocks are ignored when parsing status/sections', () => {
  const fenced = `# 0001. Choose a thing
- Status: accepted
- Date: 2026-07-27

## Context and problem statement
The template is:
\`\`\`
- Status: bogus-example
## Confirmation
\`example/fake-path.mjs\`
\`\`\`

## Confirmation
Enforced by \`scripts/gate.mjs\`.
`;
  withCorpus({ '0001-choose-a-thing.md': fenced }, (root, dir) => {
    assert.equal(lint(dir, { strict: true, root }), true, 'fenced examples must not be linted');
  });
});

test('harness wiring: adr-gate is part of just ci (a deleted gate line must not stay green)', () => {
  const justfile = readFileSync(join(import.meta.dirname, '..', '..', 'justfile'), 'utf8');
  assert.match(justfile, /^ci:.*\badr-gate\b/m, 'justfile ci recipe must include adr-gate');
  assert.match(
    justfile,
    /^adr-gate:\n\s+node scripts\/adr-lint\.mjs docs\/adr --strict-confirmation/m,
    'adr-gate must run adr-lint strict on docs/adr',
  );
});
