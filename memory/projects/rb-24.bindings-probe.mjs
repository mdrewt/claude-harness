// rb-24 X8 — committed client/src/module_bindings must equal a fresh
// `spacetime generate`, via the repo's own bindings-drift eval. The REAL
// comparison is required: the eval's local-dev skip path ('skipped: no
// spacetime CLI') is explicitly rejected here, because a skip proves nothing
// about this slice's regenerated types.ts.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-24';

function die(msg) {
  console.error(`rb-24 bindings-probe FAILED: ${msg}`);
  process.exit(1);
}

const m = await import(
  pathToFileURL(path.join(WT, 'evals/bindings-drift.eval.mjs')).href
);
const r = await m.default();
if (!r.pass) die(String(r.detail).slice(0, 900));
const d = String(r.detail);
if (d.indexOf('skipped') >= 0) die(`eval took the CLI-absent SKIP path, not the real comparison: ${d}`);
if (d.indexOf('match a fresh generate') < 0)
  die(`detail is not the real-comparison pass shape: ${d.slice(0, 400)}`);
console.log(`rb-24-X8:BINDINGS-GREEN ${d.slice(0, 120)}`);
