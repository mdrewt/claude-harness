#!/usr/bin/env node
// rb-22 EO-1/EO-2 gate runner: executes the 15 rb22 gating tests via cargo
// nextest and asserts the collected NAME SET (not just a count — a filter typo
// matching zero tests must never read as green). v18-safe wrapper: injects the
// toolchain PATH into the cargo child.
// Usage: node rb-22.rust-gate.mjs <worktree>
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const wt = process.argv[2];
if (!wt || !existsSync(path.join(wt, 'server-module', 'src', 'privacy.rs'))) {
  console.log('RB22-RUST usage-error-or-missing-privacy-rs verdict=N');
  process.exit(1);
}

const EXPECTED = [
  'rb22_accounts_header_names_the_privacy_delegate',
  'rb22_claim_purges_guest_export_bundles_call_site',
  'rb22_lib_wires_mod_privacy',
  'rb22_privacy_module_exists_with_purge_body',
  'rb22_purge_called_exactly_once_in_accounts_rs',
  'rb22_purge_named_nowhere_else_in_crate',
  'rb22p_machinery_comment_string_blind',
  'rb22p_no_bare_quote_in_privacy',
  'rb22p_no_db_or_ctx_alias',
  'rb22p_no_early_return_in_purge',
  'rb22p_no_identity_constructor',
  'rb22p_owner_scoped_filter_never_iter',
  'rb22p_purge_body_exact',
  'rb22p_purge_fn_declared_exactly_once',
  'rb22p_scan_hygiene',
  'rb22p_stub_probe_regression',
  'rb22p_writes_only_export_bundle',
];

const home = os.homedir();
const env = {
  ...process.env,
  PATH: [
    path.join(home, '.asdf', 'shims'),
    path.join(home, '.cargo', 'bin'),
    path.join(home, '.local', 'bin'),
    process.env.PATH || '',
  ].join(':'),
};

const run = spawnSync(
  'cargo',
  ['nextest', 'run', '-p', 'monster-realm-module', '-E', 'test(/rb22/)', '--no-fail-fast'],
  { cwd: wt, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
const out = `${run.stdout || ''}\n${run.stderr || ''}`;

const passed = new Set();
const failed = new Set();
for (const name of EXPECTED) {
  // nextest lines: "PASS [ 0.0s] (i/N) monster-realm-module <mod path>::<name>"
  const pinned = `::${name}`;
  for (const line of out.split('\n')) {
    if (!line.includes(pinned)) continue;
    if (line.includes('PASS')) passed.add(name);
    if (line.includes('FAIL')) failed.add(name);
  }
}
const missing = EXPECTED.filter((n) => !passed.has(n) && !failed.has(n));
const ok =
  run.status === 0 && passed.size === EXPECTED.length && failed.size === 0 && missing.length === 0;

console.log(
  `RB22-RUST filter=rb22 tests=${EXPECTED.length} passed=${passed.size} failed=${failed.size} ` +
    `missing=${missing.length} exit=${run.status} verdict=${ok ? 'Y' : 'N'}`,
);
if (!ok) {
  console.log(`missing: ${missing.join(',') || '-'} failed: ${[...failed].join(',') || '-'}`);
  console.log(out.split('\n').slice(-25).join('\n'));
  process.exit(1);
}
