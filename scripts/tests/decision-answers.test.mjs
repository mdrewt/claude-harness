// An operator's answer on a DECISION issue reaches the supervisor: the watcher keeps polling after
// the directory it was started in is deleted, and the situation bundle lists every open decision
// issue with whether it is answered, read from GitHub and not from a watcher's files.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const TOOLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../memory/projects');

const ISSUES = {
  'mdrewt/monster-realm': [
    {
      number: 11,
      title: 'DECISION(a-1): answered by the operator',
      comments: [
        {
          author: { login: 'mdrewt' },
          body: 'Take option (b).',
          createdAt: '2026-11-16T05:07:38Z',
        },
      ],
    },
    { number: 12, title: 'DECISION(a-2): nobody has answered', comments: [] },
    {
      number: 13,
      title: 'DECISION(a-3): only the loop commented',
      comments: [
        {
          author: { login: 'mdrewt' },
          body: '<!--mr-system-->\nnote',
          createdAt: '2026-11-17T00:00:00Z',
        },
        { author: { login: 'someone-else' }, body: 'me too', createdAt: '2026-11-18T00:00:00Z' },
      ],
    },
  ],
  'mdrewt/claude-harness': [],
};

/** A sandbox holding a copy of `tool` whose MEM is the sandbox, and a `gh` that answers from ISSUES. */
function sandbox(tool) {
  const root = mkdtempSync(path.join(tmpdir(), 'mr-decisions-'));
  const mem = path.join(root, 'mem');
  const bin = path.join(root, 'bin');
  mkdirSync(path.join(mem, 'decisions'), { recursive: true });
  mkdirSync(bin);
  const source = readFileSync(path.join(TOOLS, tool), 'utf8');
  const lines = source.split('\n');
  const at = lines.findIndex((line) => line.startsWith('MEM='));
  assert.notEqual(at, -1, `${tool} names its MEM`);
  lines[at] = `MEM=${mem}`;
  writeFileSync(path.join(mem, tool), lines.join('\n'));
  chmodSync(path.join(mem, tool), 0o755);
  // Like the real gh, the stub cannot run from a directory that no longer exists.
  writeFileSync(
    path.join(bin, 'gh'),
    `#!/bin/bash
pwd -P >/dev/null 2>&1 || { echo "unable to get current directory" >&2; exit 1; }
repo=""; prev=""; for a in "$@"; do case "$prev" in -R|--repo) repo="$a";; esac; prev="$a"; done
case "$1 $2" in
  "issue list") cat "${root}/list.$(echo "$repo" | tr / _).json";;
  "issue view") cat "${root}/view.json";;
  *) exit 1;;
esac
`,
  );
  chmodSync(path.join(bin, 'gh'), 0o755);
  for (const [repo, issues] of Object.entries(ISSUES)) {
    writeFileSync(path.join(root, `list.${repo.replace('/', '_')}.json`), JSON.stringify(issues));
  }
  const env = { ...process.env, PATH: `${bin}:/usr/bin:/bin`, HOME: root };
  // A caller's own switch must not turn the watcher under test off.
  delete env.MR_NO_EVENT_BRIDGE;
  return { root, mem, env };
}

test('the bundle lists each open decision issue and whether the operator answered it', () => {
  const box = sandbox('mr-situation');
  const out = execFileSync('bash', [path.join(box.mem, 'mr-situation'), '--fresh'], {
    env: box.env,
    encoding: 'utf8',
  });
  const decisions = JSON.parse(out).open_decisions;
  assert.deepEqual(decisions, [
    {
      repo: 'mdrewt/monster-realm',
      issue: 11,
      title: 'DECISION(a-1): answered by the operator',
      answered: true,
      answered_at: '2026-11-16T05:07:38Z',
    },
    {
      repo: 'mdrewt/monster-realm',
      issue: 12,
      title: 'DECISION(a-2): nobody has answered',
      answered: false,
      answered_at: null,
    },
    {
      repo: 'mdrewt/monster-realm',
      issue: 13,
      title: 'DECISION(a-3): only the loop commented',
      answered: false,
      answered_at: null,
    },
  ]);
});

test("a repo whose decision issues cannot be listed is an error row beside the other repo's rows", () => {
  const box = sandbox('mr-situation');
  writeFileSync(path.join(box.root, 'list.mdrewt_claude-harness.json'), 'not json');
  const out = execFileSync('bash', [path.join(box.mem, 'mr-situation'), '--fresh'], {
    env: box.env,
    encoding: 'utf8',
  });
  const decisions = JSON.parse(out).open_decisions;
  assert.deepEqual(
    decisions.map((row) => [row.repo, row.issue ?? null, typeof row.error]),
    [
      ['mdrewt/monster-realm', 11, 'undefined'],
      ['mdrewt/monster-realm', 12, 'undefined'],
      ['mdrewt/monster-realm', 13, 'undefined'],
      ['mdrewt/claude-harness', null, 'string'],
    ],
  );
});

test('the watcher records an answer although the directory it started in is gone', () => {
  const box = sandbox('mr-decision-watch');
  // No tick is fired from a sandbox.
  writeFileSync(path.join(box.mem, '.native-supervisor-disabled'), '');
  writeFileSync(
    path.join(box.root, 'view.json'),
    JSON.stringify({
      state: 'OPEN',
      title: 'DECISION(a-1): answered by the operator',
      body: 'question',
      comments: ISSUES['mdrewt/monster-realm'][0].comments,
    }),
  );
  const issue = String(900000 + (process.pid % 90000));
  const gone = path.join(box.root, 'worktree');
  mkdirSync(gone);
  // The shell enters the directory, deletes it, and only then starts the watcher there.
  const run = spawnSync(
    'bash',
    [
      '-c',
      `cd "$1" && rmdir "$1" && exec bash "$2" "$3" a-1 mdrewt/monster-realm`,
      '-',
      gone,
      path.join(box.mem, 'mr-decision-watch'),
      issue,
    ],
    { env: box.env, encoding: 'utf8', timeout: 20_000 },
  );
  assert.equal(run.signal, null, 'the watcher answers at its first poll and does not sleep');
  const answer = path.join(box.mem, 'decisions', `issue-${issue}.answer.md`);
  assert.ok(existsSync(answer), 'the answer transcript is written');
  assert.match(readFileSync(answer, 'utf8'), /Take option \(b\)\./);
  assert.ok(!existsSync(gone));
  try {
    rmdirSync(`/tmp/mr_decwatch_${issue}.lock.d`);
  } catch {
    // the watcher removes its own lock on exit
  }
});
