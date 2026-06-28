#!/usr/bin/env node
// PostToolUse hook: auto-format the file Claude just edited (best-effort, never blocks).
// JS/TS/CSS via Biome (only when a biome.json config is discoverable, so we never
// reformat with surprise defaults), Python via Ruff, Rust via rustfmt. Cross-platform.
// Reads the Claude Code hook payload JSON from stdin; always exits 0.
//
// Security: every external command runs via execFileSync with an argv array (no shell),
// so a hostile file path (back-ticks, $(...), ; ") cannot inject shell commands.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const isWin = process.platform === 'win32';
const NPX = isWin ? 'npx.cmd' : 'npx';

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let file = '';
  try {
    file = JSON.parse(raw)?.tool_input?.file_path ?? '';
  } catch {
    /* no/invalid payload */
  }
  if (!file || !existsSync(file)) process.exit(0);

  const ext = path.extname(file).toLowerCase();
  // No shell: the file path is always a single argv element, never interpolated.
  const run = (bin, args, cwd) => {
    try {
      execFileSync(bin, args, { stdio: 'ignore', cwd });
    } catch {
      /* best-effort: never block the agent */
    }
  };
  const has = (bin) => {
    try {
      execFileSync(bin, ['--version'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };

  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css'].includes(ext)) {
    let dir = path.dirname(file);
    let cfgDir = '';
    for (;;) {
      if (existsSync(path.join(dir, 'biome.json'))) {
        cfgDir = dir;
        break;
      }
      const up = path.dirname(dir);
      if (up === dir) break;
      dir = up;
    }
    if (cfgDir) run(NPX, ['--yes', '@biomejs/biome@2', 'check', '--write', file], cfgDir);
    // else: no biome config in this project yet -> skip rather than use surprise defaults
  } else if (ext === '.py') {
    if (has('ruff')) {
      run('ruff', ['check', '--fix', file], path.dirname(file));
      run('ruff', ['format', file], path.dirname(file));
    }
  } else if (ext === '.rs') {
    if (has('rustfmt')) run('rustfmt', [file], path.dirname(file));
  }

  // Keep the research library's generated index synced: when a research doc is written,
  // regenerate its sibling INDEX.md (best-effort; never blocks the agent).
  if (/[\\/]docs[\\/]research[\\/][^\\/]+\.md$/.test(file) && !/INDEX\.md$/.test(file)) {
    run('node', [path.join(import.meta.dirname, 'research-index.mjs'), path.dirname(file)]);
  }
  process.exit(0);
});
