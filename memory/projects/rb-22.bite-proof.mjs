#!/usr/bin/env node
// rb-22 EO-5 mutation bite-proof: 23 hand-written WRONG IMPLEMENTATIONS
// (write-the-wrong-impl doctrine — cargo-mutants never generates most of these),
// each applied to an ISOLATED copy of the tree and required to red its NAMED
// gating test with its PINNED message tag. Every mutation asserts it APPLIED
// (function replacer + count assert — a silently no-op'd mutation must read as
// probe failure, never as "the gate accepted the cheat"). The copy is restored
// from pristine backups between mutants; the real worktree is never written.
//
// Deciding line:
//   RB22-BITE-PROOF tests=15 mutants=23 caught=23/23 survived=0 controls=2/2 verdict=Y
//
// Usage: node rb-22.bite-proof.mjs <worktree>
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const wt = process.argv[2];
if (!wt || !existsSync(path.join(wt, 'server-module', 'src', 'privacy.rs'))) {
  console.log('RB22-BITE-PROOF usage-error verdict=N');
  process.exit(1);
}

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

// --- isolated copy (never the live worktree; hardlinks are NOT isolation) ----
const tmp = mkdtempSync(path.join(os.tmpdir(), 'rb22-bite-'));
const SKIP = new Set(['.git', 'node_modules', 'target', '.claude']);
cpSync(wt, tmp, {
  recursive: true,
  filter: (src) => !SKIP.has(path.basename(src)),
});

const ACCOUNTS = path.join(tmp, 'server-module', 'src', 'accounts.rs');
const PRIVACY = path.join(tmp, 'server-module', 'src', 'privacy.rs');
const LIB = path.join(tmp, 'server-module', 'src', 'lib.rs');
const ATESTS = path.join(tmp, 'server-module', 'src', 'accounts_tests.rs');
const ECONOMY = path.join(tmp, 'server-module', 'src', 'economy.rs');
const pristine = new Map(
  [ACCOUNTS, PRIVACY, LIB, ATESTS, ECONOMY].map((f) => [f, readFileSync(f, 'utf8')]),
);

// Exact-anchor text (verified against the shipped tree; a drifted anchor makes
// the applied-assert fail LOUD rather than silently skipping the mutation).
const CALL_STMT = '    crate::privacy::purge_export_bundles(ctx, guest);\n';
const REKEY_STMT = '    rekey_all(ctx, guest, me)?;\n';
const CONSUME_STMT = '    consume_claim_and_disarm(ctx, guest);\n';
const BODY =
  '    let ids: Vec<u64> = ctx\n' +
  '        .db\n' +
  '        .export_bundle()\n' +
  '        .owner_identity()\n' +
  '        .filter(owner)\n' +
  '        .map(|c| c.chunk_id)\n' +
  '        .collect();\n' +
  '    for id in ids {\n' +
  '        ctx.db.export_bundle().chunk_id().delete(id);\n' +
  '    }\n';
const MOD_DECL = 'mod privacy;\n';
const CENSUS_ROW = '        ("privacy.rs", M22_PRIVACY_RS),\n';

function replaceCounted(src, from, to, expectN) {
  let n = 0;
  let out = '';
  let rest = src;
  for (;;) {
    const i = rest.indexOf(from);
    if (i < 0) break;
    n += 1;
    out += rest.slice(0, i) + to;
    rest = rest.slice(i + from.length);
  }
  out += rest;
  if (n !== expectN) {
    throw new Error(`mutation did not apply: expected ${expectN} occurrence(s), found ${n}`);
  }
  return out;
}

// Each mutant: { id, why, file, apply(src)->src', test, tag, filter? }
const MUTANTS = [
  {
    id: 'W1',
    why: 'delegation deleted',
    file: ACCOUNTS,
    apply: (s) => replaceCounted(s, CALL_STMT, '', 1),
    test: 'rb22_claim_purges_guest_export_bundles_call_site',
    tag: '[call/count]',
  },
  {
    id: 'W2',
    why: 'call re-argued to me (purges the claimer, leaves the orphan)',
    file: ACCOUNTS,
    apply: (s) =>
      replaceCounted(s, CALL_STMT, '    crate::privacy::purge_export_bundles(ctx, me);\n', 1),
    test: 'rb22_claim_purges_guest_export_bundles_call_site',
    tag: '[call/statement]',
  },
  {
    id: 'W3',
    why: 'purge sequenced before the fallible rekey_all',
    file: ACCOUNTS,
    apply: (s) =>
      replaceCounted(
        replaceCounted(s, CALL_STMT, '', 1),
        REKEY_STMT,
        CALL_STMT + REKEY_STMT,
        1,
      ),
    // Moving the purge to be the first statement after guard 11's `}` means it
    // no longer follows a `;`, so the statement-form clause (clause 2) fires
    // before the ordering clause (clause 3). Both are the same test; the
    // deciding tag is [call/statement], measured.
    test: 'rb22_claim_purges_guest_export_bundles_call_site',
    tag: '[call/statement]',
  },
  {
    id: 'W4',
    why: 'call wrapped in a conditional (always-false guard shape)',
    file: ACCOUNTS,
    apply: (s) =>
      replaceCounted(
        s,
        CALL_STMT,
        '    if is_account_holder(ctx, me) {\n        crate::privacy::purge_export_bundles(ctx, guest);\n    }\n',
        1,
      ),
    test: 'rb22_claim_purges_guest_export_bundles_call_site',
    tag: '[call/statement]',
  },
  {
    id: 'W5',
    why: 'call as a never-invoked closure operand',
    file: ACCOUNTS,
    apply: (s) =>
      replaceCounted(
        s,
        CALL_STMT,
        '    let _p = || crate::privacy::purge_export_bundles(ctx, guest);\n',
        1,
      ),
    test: 'rb22_claim_purges_guest_export_bundles_call_site',
    tag: '[call/statement]',
  },
  {
    id: 'W6',
    why: 'early return inserted between rekey_all and the purge',
    file: ACCOUNTS,
    apply: (s) => replaceCounted(s, REKEY_STMT, `${REKEY_STMT}    return Ok(());\n`, 1),
    test: 'rb22_claim_purges_guest_export_bundles_call_site',
    tag: '[call/reachable]',
  },
  {
    id: 'W7',
    why: 'helper hollowed to a no-op',
    file: PRIVACY,
    apply: (s) => replaceCounted(s, BODY, '    let _ = (ctx, owner);\n', 1),
    test: 'rb22p_writes_only_export_bundle',
    tag: '[W/non-vacuity]',
  },
  {
    id: 'W8',
    why: 'single-row delete instead of the full owner set',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        s,
        BODY,
        '    if let Some(row) = ctx.db.export_bundle().owner_identity().filter(owner).next() {\n' +
          '        ctx.db.export_bundle().chunk_id().delete(row.chunk_id);\n' +
          '    }\n',
        1,
      ),
    test: 'rb22p_purge_body_exact',
    tag: '[body/exact]',
  },
  {
    id: 'W9',
    why: 'collects the PKs but never deletes',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        s,
        BODY,
        '    let ids: Vec<u64> = ctx\n        .db\n        .export_bundle()\n        .owner_identity()\n        .filter(owner)\n        .map(|c| c.chunk_id)\n        .collect();\n    let _ = ids;\n',
        1,
      ),
    test: 'rb22_privacy_module_exists_with_purge_body',
    tag: '[privacy/body]',
  },
  {
    id: 'W10',
    why: 'full-table iter sweep (deletes every owner)',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        replaceCounted(
          s,
          'use spacetimedb::{Identity, ReducerContext};',
          'use spacetimedb::{Identity, ReducerContext, Table};',
          1,
        ),
        BODY,
        '    let ids: Vec<u64> = ctx.db.export_bundle().iter().map(|c| c.chunk_id).collect();\n' +
          '    for id in ids {\n        ctx.db.export_bundle().chunk_id().delete(id);\n    }\n',
        1,
      ),
    // A whole-body iter swap removes the `owner_identity().filter(owner)` chain,
    // so [owner/filter] (clause 1) fires before the [owner/no-iter] clause; both
    // are the same test. Measured.
    test: 'rb22p_owner_scoped_filter_never_iter',
    tag: '[owner/filter]',
  },
  {
    id: 'W11',
    why: 'hardcoded zero-identity filter (never the passed owner)',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(s, '.filter(owner)', '.filter(Identity::from_byte_array([0u8; 32]))', 1),
    test: 'rb22p_no_identity_constructor',
    tag: '[ctor/identity]',
  },
  {
    id: 'W12',
    why: 'early return before the delete loop',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        s,
        '    for id in ids {\n',
        '    if ids.is_empty() {\n        return;\n    }\n    for id in ids {\n',
        1,
      ),
    test: 'rb22p_no_early_return_in_purge',
    tag: '[flow/no-return]',
  },
  {
    id: 'W13',
    why: 'delete chain present only in a comment',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        s,
        BODY,
        '    // ctx.db.export_bundle().chunk_id().delete(id);\n    let _ = (ctx, owner);\n',
        1,
      ),
    test: 'rb22p_writes_only_export_bundle',
    tag: '[W/non-vacuity]',
  },
  {
    id: 'W14',
    why: 'delete chain present only in a string literal',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        s,
        BODY,
        '    let _s = "ctx.db.export_bundle().chunk_id().delete(id);";\n    let _ = (ctx, owner, _s);\n',
        1,
      ),
    test: 'rb22p_writes_only_export_bundle',
    tag: '[W/non-vacuity]',
  },
  {
    id: 'W15',
    why: 'call moved into rekey_all (outside the reviewed claim ceremony)',
    file: ACCOUNTS,
    apply: (s) =>
      replaceCounted(
        replaceCounted(s, CALL_STMT, '', 1),
        '    crate::ranking::rekey_profile(ctx, from, to);\n',
        '    crate::ranking::rekey_profile(ctx, from, to);\n    crate::privacy::purge_export_bundles(ctx, from);\n',
        1,
      ),
    test: 'rb22_claim_purges_guest_export_bundles_call_site',
    tag: '[call/count]',
  },
  {
    id: 'W16',
    why: 'exact-named cfg(test) twin inside an inline module (second fn needle occurrence — an identically-named sibling at module level cannot compile, so this is the compilable exact-twin shape)',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        s,
        '#[cfg(test)]\n#[path = "privacy_tests.rs"]\nmod privacy_tests;',
        '#[cfg(test)]\nmod decoy {\n    use spacetimedb::{Identity, ReducerContext};\n    #[allow(dead_code)]\n    pub(crate) fn purge_export_bundles(ctx: &ReducerContext, owner: Identity) {\n        let _ = (ctx, owner);\n    }\n}\n\n#[cfg(test)]\n#[path = "privacy_tests.rs"]\nmod privacy_tests;',
        1,
      ),
    test: 'rb22p_purge_fn_declared_exactly_once',
    tag: '[decl/count]',
  },
  {
    id: 'W17',
    why: 'mod privacy; gated behind cfg(test) — the published (non-test) lib target then cannot resolve accounts.rs\'s crate::privacy::purge_export_bundles call: a compile failure of the shipping module, the strongest possible catch',
    file: LIB,
    apply: (s) => replaceCounted(s, MOD_DECL, '#[cfg(test)]\nmod privacy;\n', 1),
    // The cfg(test) gate makes the lib (non-test) build fail with E0433 before
    // any test runs, so the catch is a COMPILE error, not a named-test FAIL —
    // and that is a stronger guarantee: the module literally cannot ship gated
    // this way. ([lib/cfg] would additionally fire in the test build, but the
    // whole crate fails to build first.)
    compileError: 'E0433',
    test: 'rb22_lib_wires_mod_privacy',
    tag: '[lib/cfg]',
  },
  {
    id: 'W18',
    why: 'census registration removed (new module invisible to the totality proof)',
    file: ATESTS,
    apply: (s) => replaceCounted(s, CENSUS_ROW, '', 1),
    test: 'data_lifecycle_manifest_totality_bidirectional',
    tag: 'NOT scanned by',
    filter: 'test(/rb22/) + test(/data_lifecycle_manifest_totality/)',
  },
  {
    id: 'W19',
    why: 'correct body wrapped in a dead if-false branch',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(s, BODY, `    if false {\n${BODY.replace(/^ {4}/gm, '        ')}    }\n`, 1),
    test: 'rb22p_purge_body_exact',
    tag: '[body/exact]',
  },
  {
    id: 'W20',
    why: 'collected ids shadowed to an empty Vec',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        s,
        '        .collect();\n    for id in ids {\n',
        '        .collect();\n    let ids: Vec<u64> = Vec::new();\n    for id in ids {\n',
        1,
      ),
    test: 'rb22_privacy_module_exists_with_purge_body',
    tag: '[privacy/body]',
  },
  {
    id: 'W21',
    why: 'loop variable shadowed to a constant key',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        s,
        '    for id in ids {\n        ctx.db.export_bundle().chunk_id().delete(id);\n',
        '    for id in ids {\n        let id: u64 = 0;\n        ctx.db.export_bundle().chunk_id().delete(id);\n',
        1,
      ),
    test: 'rb22p_purge_body_exact',
    tag: '[body/exact]',
  },
  {
    id: 'W22',
    why: 'aliased foreign write appended to an otherwise-correct body',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        replaceCounted(
          s,
          'use crate::schema::export_bundle;',
          'use crate::schema::{account, export_bundle};',
          1,
        ),
        '    for id in ids {\n        ctx.db.export_bundle().chunk_id().delete(id);\n    }\n',
        '    for id in ids {\n        ctx.db.export_bundle().chunk_id().delete(id);\n    }\n' +
          '    let db = &ctx.db;\n    db.account().identity().delete(owner);\n',
        1,
      ),
    test: 'rb22p_no_db_or_ctx_alias',
    tag: '[alias/db-ref]',
  },
  {
    id: 'W23',
    why: 'let guest = me; shadow re-points a textually perfect call',
    file: ACCOUNTS,
    apply: (s) => replaceCounted(s, REKEY_STMT, `${REKEY_STMT}    let guest = me;\n`, 1),
    test: 'rb22_claim_purges_guest_export_bundles_call_site',
    tag: '[call/no-shadow]',
  },
  {
    id: 'W24',
    why: 'aliased third-module call (use ... as p) with a badly-derived owner',
    file: ECONOMY,
    apply: (s) =>
      replaceCounted(
        replaceCounted(
          s,
          'use crate::inventory::{consume_one, grant_item};',
          'use crate::inventory::{consume_one, grant_item};\nuse crate::privacy::purge_export_bundles as p;',
          1,
        ),
        '    if let Some(row) = ctx.db.player_wallet().owner_identity().find(from) {',
        '    p(ctx, ctx.sender());\n    if let Some(row) = ctx.db.player_wallet().owner_identity().find(from) {',
        1,
      ),
    test: 'rb22_purge_named_nowhere_else_in_crate',
    tag: '[census/site]',
  },
  {
    id: 'W24b',
    why: 'fully-qualified third-module call (no import to spot)',
    file: ECONOMY,
    apply: (s) =>
      replaceCounted(
        s,
        '    if let Some(row) = ctx.db.player_wallet().owner_identity().find(from) {',
        '    crate::privacy::purge_export_bundles(ctx, ctx.sender());\n    if let Some(row) = ctx.db.player_wallet().owner_identity().find(from) {',
        1,
      ),
    test: 'rb22_purge_named_nowhere_else_in_crate',
    tag: '[census/site]',
  },
  {
    id: 'W25',
    why: 'bare quotes on two // comment lines wrap an arbitrary-Identity account delete, hidden from every squashed-text pin by the strings-before-comments stripper (red-team Finding 1)',
    file: PRIVACY,
    apply: (s) =>
      replaceCounted(
        replaceCounted(
          s,
          'use crate::schema::export_bundle;',
          'use crate::schema::{account, export_bundle};',
          1,
        ),
        '    let ids: Vec<u64> = ctx\n',
        '    // marker open "\n    ctx.db.account().identity().delete(owner);\n    // marker close "\n    let ids: Vec<u64> = ctx\n',
        1,
      ),
    test: 'rb22p_no_bare_quote_in_privacy',
    tag: '[hygiene/bare-quote]',
  },
  {
    id: 'W26',
    why: 'early return in the purge->consume gap skips consume_claim_and_disarm (AUTH-34) + the AUTH-21 stamp while returning Ok (red-team Finding 2)',
    file: ACCOUNTS,
    apply: (s) =>
      replaceCounted(
        s,
        CONSUME_STMT,
        '    if is_account_holder(ctx, me) {\n        return Ok(());\n    }\n' + CONSUME_STMT,
        1,
      ),
    test: 'rb22_claim_purges_guest_export_bundles_call_site',
    tag: '[call/reachable]',
  },
];

function runTests(filter) {
  return spawnSync(
    'cargo',
    ['nextest', 'run', '-p', 'monster-realm-module', '-E', filter, '--no-fail-fast'],
    { cwd: tmp, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
}
const out = (r) => `${r.stdout || ''}\n${r.stderr || ''}`;

function restore() {
  for (const [f, s] of pristine) writeFileSync(f, s);
}

// --- CONTROL 1: healthy tree, all 15 rb22 tests pass, names verified ---------
const NAMES = [
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
let controls = 0;
const c1 = runTests('test(/rb22/)');
const c1out = out(c1);
const c1ok =
  c1.status === 0 &&
  c1out.includes('17 tests run: 17 passed') &&
  NAMES.every((n) => c1out.includes(`::${n}`));
if (c1ok) controls += 1;
else console.log(`CONTROL-1 FAILED (healthy tree not 17/17 by name)\n${c1out.split('\n').slice(-12).join('\n')}`);

// --- CONTROL 2: a nonsense filter must NOT read as caught --------------------
const c2 = runTests('test(/rb22_no_such_test_zzz/)');
const c2out = out(c2);
const c2ok = / 0 tests run: 0 passed/.test(c2out);
if (c2ok) controls += 1;
else console.log('CONTROL-2 FAILED (empty filter did not report 0 tests run)');

// --- mutants -----------------------------------------------------------------
let caught = 0;
const survivors = [];
for (const m of MUTANTS) {
  restore();
  let applied = false;
  try {
    const mutated = m.apply(readFileSync(m.file, 'utf8'));
    writeFileSync(m.file, mutated);
    applied = true;
  } catch (e) {
    console.log(`${m.id} APPLY-FAILED: ${e.message}`);
  }
  if (!applied) {
    survivors.push(`${m.id}(apply-failed)`);
    continue;
  }
  const r = runTests(m.filter || 'test(/rb22/)');
  const o = out(r);
  const red = r.status !== 0;
  if (m.compileError) {
    // Caught by a build failure (the mutation makes the shipping crate not
    // compile), pinned to the specific rustc error code — a stronger catch
    // than any text gate, and unfakeable.
    if (red && o.includes(m.compileError)) {
      caught += 1;
      console.log(`${m.id} CAUGHT by compile-error ${m.compileError} — ${m.why}`);
    } else {
      survivors.push(m.id);
      console.log(
        `${m.id} SURVIVED (red=${red} compileErr=${o.includes(m.compileError)}) — ${m.why}\n` +
          o.split('\n').slice(-10).join('\n'),
      );
    }
    continue;
  }
  const failedNamed = o.includes(`::${m.test}`) && new RegExp(`FAIL.*::${m.test}`).test(o);
  const msgSeen = o.includes(m.tag);
  if (red && failedNamed && msgSeen) {
    caught += 1;
    console.log(`${m.id} CAUGHT by ${m.test} ${m.tag} — ${m.why}`);
  } else {
    survivors.push(m.id);
    console.log(
      `${m.id} SURVIVED (red=${red} namedFail=${failedNamed} msg=${msgSeen}) — ${m.why}\n` +
        o.split('\n').slice(-10).join('\n'),
    );
  }
}
restore();

const total = MUTANTS.length;
const ok = caught === total && survivors.length === 0 && controls === 2;
console.log(
  `RB22-BITE-PROOF tests=17 mutants=${total} caught=${caught}/${total} ` +
    `survived=${survivors.length} controls=${controls}/2 verdict=${ok ? 'Y' : 'N'}`,
);
if (survivors.length) console.log(`survivors: ${survivors.join(',')}`);
rmSync(tmp, { recursive: true, force: true });
process.exit(ok ? 0 : 1);
