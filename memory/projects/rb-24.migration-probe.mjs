// rb-24 X9 — REAL automigration probe (ported from m22-s2.migration-probe.mjs).
//
// Leg A (additive, must PASS): publish the fork-SHA module, then republish the
// rb-24 module over the same database — a brand-new scheduled table is additive
// (ADR-0006) and must automigrate cleanly.
// Leg B (CONTROL, must FAIL — and it is the slice's own premise): publish a
// CONTROL module whose AccountDeletionReaperSchedule is declared WITHOUT
// `scheduled(...)`, then republish the REAL rb-24 module (WITH it) over that
// database. Adding scheduled-ness to an existing table is automigration-frozen
// (ADR-0207 D5) — this leg measures the claim instead of citing docs, and it
// proves the probe can red. The control must red at the PUBLISH, never at
// cargo build (a build failure is a VOID control).
//
// Own scratch server/port/data — never the dev/e2e instance; do NOT run
// concurrently with `just ci`. ~5-10 min (cold scratch builds).
// Success line (exact): rb-24-X9:ADDITIVE-PROVEN additive=ok control=red
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-24';
const FORK_SHA = 'efdae74dd7ffaa1eeb89f77b3b12561c280d051a';
const ADDR = '127.0.0.1:3779';
const SERVER = `http://${ADDR}`;
const SCRATCH = '/tmp/rb24-migprobe';
const HOME = process.env.HOME;
const baseEnv = {
  ...process.env,
  PATH: `${HOME}/.asdf/shims:${HOME}/.cargo/bin:${HOME}/.local/bin:${process.env.PATH}`,
};

const SCHED_ATTR =
  '#[spacetimedb::table(accessor = account_deletion_reaper_schedule, scheduled(account_deletion_reaper))]';
const PLAIN_ATTR = '#[spacetimedb::table(accessor = account_deletion_reaper_schedule)]';

function log(msg) {
  console.error(`[rb24-migprobe] ${msg}`);
}
function fail(msg) {
  console.error(`rb-24 migration-probe FAILED: ${msg}`);
  process.exit(1);
}
function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: baseEnv,
    ...opts,
  });
}
function publish(modulePath, db, env) {
  try {
    const out = sh('spacetime', ['publish', '-p', modulePath, '-s', SERVER, '-y', db], {
      env,
      timeout: 1_200_000,
    });
    return { ok: true, out };
  } catch (e) {
    return {
      ok: false,
      out: String(e.stdout ?? '') + String(e.stderr ?? '') + String(e.message ?? ''),
    };
  }
}
function copyTree(dest) {
  mkdirSync(dest, { recursive: true });
  const SKIP = new Set(['.git', 'target', 'node_modules', '.claude', 'dist', 'pkg']);
  const entries = [
    'Cargo.toml',
    'Cargo.lock',
    'rust-toolchain.toml',
    'server-module',
    'game-core',
    'client-wasm',
    'sim-harness',
    'evals/release-overflow-teeth',
  ];
  for (const entry of entries) {
    const src = path.join(WT, entry);
    if (!existsSync(src)) fail(`copyTree: workspace member ${entry} missing from worktree`);
    cpSync(src, path.join(dest, entry), {
      recursive: true,
      filter: (p) => !SKIP.has(path.basename(p)),
    });
  }
}
async function waitForPing(tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      sh('spacetime', ['server', 'ping', SERVER], { timeout: 10_000 });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function main() {
  const liveAccounts = readFileSync(path.join(WT, 'server-module/src/accounts.rs'), 'utf8');
  if (liveAccounts.indexOf(SCHED_ATTR) < 0) {
    fail('precondition: the scheduled table attr is not in the slice accounts.rs — probe would prove the wrong diff');
  }
  try {
    sh('git', ['cat-file', '-e', `${FORK_SHA}^{commit}`], { cwd: WT });
  } catch {
    fail(`fork SHA ${FORK_SHA} not present in this repo`);
  }

  rmSync(path.join(SCRATCH, 'fork'), { recursive: true, force: true });
  rmSync(path.join(SCRATCH, 'control'), { recursive: true, force: true });
  mkdirSync(SCRATCH, { recursive: true });
  const buildEnv = { ...baseEnv, CARGO_TARGET_DIR: path.join(SCRATCH, 'target') };

  const forkDir = path.join(SCRATCH, 'fork');
  mkdirSync(forkDir, { recursive: true });
  sh('bash', ['-c', `git -C ${WT} archive ${FORK_SHA} | tar -x -C ${forkDir}`]);

  // Control tree: the live slice tree with scheduled-ness REMOVED from the new
  // table. Surgery is count-verified (first-occurrence-replace trap).
  const ctrlDir = path.join(SCRATCH, 'control');
  copyTree(ctrlDir);
  const ctrlAccountsPath = path.join(ctrlDir, 'server-module/src/accounts.rs');
  const src = readFileSync(ctrlAccountsPath, 'utf8');
  const n = src.split(SCHED_ATTR).length - 1;
  if (n !== 1) fail(`control surgery: scheduled attr occurs ${n} time(s), want exactly 1`);
  const mutated = src.replace(SCHED_ATTR, PLAIN_ATTR);
  if (mutated === src || mutated.indexOf(PLAIN_ATTR) < 0) fail('control surgery did not apply');
  if (mutated.indexOf('scheduled(account_deletion_reaper)') >= 0)
    fail('control surgery left scheduled-ness behind');
  writeFileSync(ctrlAccountsPath, mutated);
  log('control surgery applied and verified (table declared WITHOUT scheduled(..))');

  log(`starting scratch spacetimedb on ${ADDR}`);
  const server = spawn('spacetime', ['start', '-l', ADDR, '--in-memory'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: baseEnv,
  });
  let serverLog = '';
  server.stdout.on('data', (d) => {
    serverLog += d;
  });
  server.stderr.on('data', (d) => {
    serverLog += d;
  });
  const cleanup = () => {
    try {
      server.kill('SIGTERM');
    } catch {
      /* already dead */
    }
  };
  process.on('exit', cleanup);

  try {
    if (!(await waitForPing())) {
      fail(`scratch server never answered ping; log tail: ${serverLog.slice(-500)}`);
    }

    // Leg A — fork -> db A, slice -> db A (the additive republish under test).
    log('publishing fork module to db A (cold build, minutes)');
    const a1 = publish(path.join(forkDir, 'server-module'), 'rb24probe-a', buildEnv);
    if (!a1.ok) fail(`fork publish to db A failed (probe env broken, not a slice verdict): ${a1.out.slice(-800)}`);
    log('republishing SLICE module over db A (the additive automigration under test)');
    const a2 = publish(path.join(WT, 'server-module'), 'rb24probe-a', buildEnv);
    if (!a2.ok) fail(`ADDITIVE REPUBLISH FAILED — the rb-24 diff is not automigration-clean: ${a2.out.slice(-1200)}`);
    log('additive republish OK');

    // Leg B — control (non-scheduled) -> db B, REAL slice (scheduled) -> db B: must FAIL.
    log('publishing CONTROL module (non-scheduled table) to db B');
    const b1 = publish(path.join(ctrlDir, 'server-module'), 'rb24probe-b', buildEnv);
    if (!b1.ok) {
      if (b1.out.indexOf('error[E') >= 0) fail(`CONTROL redded at BUILD — void control: ${b1.out.slice(-1000)}`);
      fail(`control publish to db B failed: ${b1.out.slice(-1000)}`);
    }
    log('republishing REAL slice module over db B (adding scheduled-ness — must be rejected)');
    const b2 = publish(path.join(WT, 'server-module'), 'rb24probe-b', buildEnv);
    if (b2.ok) fail('CONTROL REPUBLISH SUCCEEDED — adding scheduled-ness was accepted; the atomic-landing premise is FALSE and the probe cannot red');
    if (b2.out.indexOf('error[E') >= 0) fail(`control leg redded at BUILD, not at migration — void control: ${b2.out.slice(-800)}`);
    const migrationShaped = ['migrat', 'schedul', 'schema', 'incompatible', 'table'].filter(
      (needle) => b2.out.toLowerCase().indexOf(needle) >= 0,
    );
    if (migrationShaped.length === 0) {
      fail(`control failed but with no migration-shaped error text — cannot confirm the rejection class: ${b2.out.slice(-800)}`);
    }
    log(`control failed as required (${migrationShaped.join('+')}): ${b2.out.slice(-300).split('\n').slice(-3).join(' | ')}`);

    console.log('rb-24-X9:ADDITIVE-PROVEN additive=ok control=red');
  } finally {
    cleanup();
    rmSync(path.join(SCRATCH, 'fork'), { recursive: true, force: true });
    rmSync(path.join(SCRATCH, 'control'), { recursive: true, force: true });
  }
}

main().catch((e) => fail(`unhandled: ${String(e && e.stack ? e.stack : e).slice(0, 1000)}`));
