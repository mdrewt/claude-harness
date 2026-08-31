// rb-24 rust gates — E1/X1/X2/X3/X4/X5 (named cargo tests) + X12 (nextest ratchet).
// Runs INSIDE the rb-24 worktree regardless of caller cwd. Markers print ONLY on
// success and never appear in any failure path.
import { execSync } from 'node:child_process';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-24';
const HOME = process.env.HOME;
const env = {
  ...process.env,
  PATH: `${HOME}/.asdf/shims:${HOME}/.cargo/bin:${HOME}/.local/bin:${process.env.PATH}`,
};
const P = 'accounts::accounts_tests::';

const GATES = {
  E1: {
    need: ['rb24_deletion_schedule_table_shape_and_privacy'],
    marker: 'rb-24-E1:TABLE-DECLARED',
  },
  X1: {
    need: [
      'rb24_delete_account_arms_the_reaper_last',
      'rb24_arm_deletion_reaper_body_frozen',
      'rb24_arm_called_exactly_once_in_crate',
    ],
    marker: 'rb-24-X1:PRV1-1-WIRED',
  },
  X2: {
    need: [
      'rb24_cancel_disarms_the_reaper',
      'rb24_disarm_deletion_reaper_body_frozen',
      'rb24_disarm_called_exactly_once_in_crate',
    ],
    marker: 'rb-24-X2:PRV1-3-WIRED',
  },
  X3: {
    need: [
      'rb24_deletion_reaper_scheduler_guard_is_first_statement',
      'rb24_deletion_reaper_body_is_frozen_noop',
    ],
    marker: 'rb-24-X3:S3-BOUNDARY-HELD',
  },
  X4: {
    need: [
      'rb24_deletion_fire_at_ms_boundary',
      'rb24_deletion_fire_at_ms_saturates',
      'rb24_deletion_fire_at_ms_parity_with_is_deletion_due',
    ],
    marker: 'rb-24-X4:GRACE-ARITH-OK',
  },
  X5: {
    need: [
      'data_lifecycle_manifest_totality_bidirectional',
      'data_lifecycle_partition_matches_spec_section3',
      'g5_writes_only_owned_tables',
      'g2_reducer_name_set_is_pinned',
      'rb24_owned_write_set_covers_the_deletion_schedule',
      'rb24_schedule_table_sole_writers',
    ],
    marker: 'rb-24-X5:CENSUS-OK',
  },
};

function die(msg) {
  console.error(`rb-24 rust-gate FAILED: ${msg}`);
  process.exit(1);
}

const gate = process.argv[2];

if (gate === 'X12') {
  const BASELINE = 2034; // measured on fork efdae74 via `cargo nextest list`
  if (!Number.isInteger(BASELINE) || BASELINE <= 0) die('baseline is not a positive integer');
  const FLOOR = BASELINE + 12;
  let out = '';
  try {
    out = execSync('cargo nextest run 2>&1', {
      cwd: WT,
      env,
      maxBuffer: 128 * 1024 * 1024,
      timeout: 1_800_000,
    }).toString();
  } catch (e) {
    die(`nextest run failed: ${(String(e.stdout) + String(e.stderr)).slice(-1500)}`);
  }
  const m = out.match(/Summary\s+\[[^\]]*\]\s+(\d+) tests run: (\d+) passed(?: \((\d+) slow\))?, (\d+) skipped/);
  if (!m) die(`could not parse nextest summary; tail: ${out.slice(-600)}`);
  const run = Number(m[1]);
  const passed = Number(m[2]);
  const skipped = Number(m[4]);
  if (run < FLOOR) die(`ratchet: ${run} tests run < floor ${FLOOR} (baseline ${BASELINE} + 12)`);
  if (passed !== run) die(`ratchet: run=${run} passed=${passed} (not all passed)`);
  if (skipped !== 0) die(`ratchet: skipped=${skipped} (must be 0 — no quarantined tests)`);
  console.log(`rb-24-X12:RATCHET-OK run=${run} passed=${passed} skipped=0 floor=${FLOOR}`);
  process.exit(0);
}

const spec = GATES[gate];
if (!spec) die(`unknown gate id ${gate}`);
let out = '';
try {
  out = execSync(`cargo test -p monster-realm-module --lib ${P} 2>&1`, {
    cwd: WT,
    env,
    maxBuffer: 128 * 1024 * 1024,
    timeout: 1_200_000,
  }).toString();
} catch (e) {
  out = String(e.stdout) + String(e.stderr);
}
const lines = out.split('\n');
const okNames = lines
  .filter((l) => l.startsWith('test ') && l.indexOf(' ... ok') > 0)
  .map((l) => l.slice(5, l.indexOf(' ... ok')));
const miss = spec.need.filter((n) => okNames.indexOf(P + n) < 0);
const badResults = lines.filter(
  (l) => l.startsWith('test result:') && l.indexOf(' 0 failed') < 0,
).length;
const anyResult = lines.some((l) => l.startsWith('test result:'));
if (!anyResult) die(`no test result line at all (compile failure?); tail: ${out.slice(-1200)}`);
if (miss.length > 0) die(`required tests not in the ok list: ${JSON.stringify(miss)}; tail: ${out.slice(-800)}`);
if (badResults > 0) die(`a test result line reported failures; tail: ${out.slice(-1200)}`);
if (okNames.length === 0) die('zero tests reported ok — vacuous run');
console.log(`${spec.marker} suite_ok=${okNames.length}`);
