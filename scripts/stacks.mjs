#!/usr/bin/env node
// List available stacks (every templates/ subdirectory except _base).
// A real script instead of an inline `node -e` one-liner, which cmd.exe mangles.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const d of readdirSync(path.join(root, 'templates'), { withFileTypes: true })) {
  if (d.isDirectory() && d.name !== '_base') console.log(d.name);
}
