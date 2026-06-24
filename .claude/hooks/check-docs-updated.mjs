#!/usr/bin/env node
// Stop hook: drift reminder for the "auto-recorded decisions/docs" rule
// (WORKSPACE-PLAN.md §5, AGENTS.md "done" criteria). When a session leaves
// uncommitted CODE changes but did NOT touch the changelog / memory / ADRs, it
// surfaces a gentle reminder so the doc-keeper step isn't silently skipped.
//
// ADVISORY ONLY — best-effort, cross-platform, never blocks. It always exits 0
// (never forces the agent to continue, so it can't cause a Stop loop) and fails
// open on any error. Matches the plan's "suggestions, never silent auto-edits"
// stance: it reminds, it does not gate.
import { execSync } from 'node:child_process';

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let payload = {};
  try { payload = JSON.parse(raw) || {}; } catch { /* no/invalid payload */ }

  // Loop-prevention: if we're already inside a Stop-hook continuation, do nothing.
  if (payload.stop_hook_active) process.exit(0);

  const cwd = payload.cwd || process.cwd();
  const git = (args) => execSync(`git ${args}`, { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString();

  let files;
  try {
    // Inside a git work tree? (throws otherwise -> fail open)
    git('rev-parse --is-inside-work-tree');
    // Staged + unstaged + untracked changes, one path per line.
    files = git('status --porcelain')
      .split('\n')
      .map((l) => l.slice(3).trim())          // strip the XY status prefix
      .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p)) // rename target
      .filter(Boolean);
  } catch {
    process.exit(0); // not a repo / git unavailable -> nothing to check
  }
  if (files.length === 0) process.exit(0);

  const isDoc = (p) =>
    /(^|\/)CHANGELOG[^/]*$/i.test(p) ||      // a changelog
    /(^|\/)memory\//i.test(p) ||             // memory cards / index
    /(^|\/)docs\/adr\//i.test(p) ||          // ADRs
    /\.adr\.md$/i.test(p);
  const isCode = (p) =>
    /(^|\/)src\//.test(p) ||
    /\.(ts|tsx|js|jsx|mjs|cjs|rs|py|go|java|kt|c|cc|cpp|h|hpp|sql|wgsl|glsl)$/i.test(p);

  const codeChanged = files.some(isCode);
  const docChanged = files.some(isDoc);

  if (codeChanged && !docChanged) {
    const msg =
      'doc-keeper reminder: code changed this session but no changelog / memory / ADR update is staged. ' +
      'If this task is closing, record the decision (/adr) and update the changelog/memory before wrapping up.';
    // systemMessage surfaces a non-blocking warning to the user; exit 0 allows the
    // stop to proceed normally. Both together = a reminder that never gates.
    process.stdout.write(JSON.stringify({ systemMessage: msg }));
  }
  process.exit(0);
});
