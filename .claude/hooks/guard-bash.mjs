#!/usr/bin/env node
// PreToolUse guard (cross-platform; Node is a prerequisite). Blocks clearly
// destructive shell commands as defense-in-depth behind the permission deny-list.
// Reads the hook payload JSON on stdin; exit 2 blocks the tool call.
// Replaces the old bash-only guard-bash.sh (which would not run on Windows).
let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let cmd = '';
  try {
    cmd = JSON.parse(raw)?.tool_input?.command ?? '';
  } catch {
    /* not a Bash call / no input */
  }
  const danger =
    /\brm\s+-rf\s+(\/|~|\*)|git\s+push\s+(--force|-f)\b|git\s+reset\s+--hard\s+origin|\bdrop\s+database\b|\btruncate\s+table\b/i;
  if (danger.test(cmd)) {
    console.error('guard: blocked a potentially destructive command. Get explicit human approval.');
    process.exit(2); // 2 = block in Claude Code PreToolUse
  }
  process.exit(0);
});
