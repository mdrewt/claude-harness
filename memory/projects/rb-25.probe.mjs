#!/usr/bin/env node
// rb-25 acceptance probes. Each probe drives the SHIPPED checker over the LIVE
// server-module tree and requires the gate to BITE on a cheat — the marker is
// printed only after every assertion of that gate has held, and appears on no
// failure path.
//
// Manifest variants are spread-copies; the frozen REKEY_MANIFEST is never
// mutated. Source variants are string edits on an in-memory copy of the live
// sources, each with an exact hit-count assertion, so a silently-missed edit
// can never read as "the gate accepted the cheat".
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const WT = '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-25';
const EVAL = path.join(WT, 'evals/guest-claim-integrity.eval.mjs');
const which = process.argv[2];

const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.log(`rb-25 PROBE ABORTED: node ${process.versions.node}; this repo's evals need node 24`);
  process.exit(1);
}

const fail = (why) => {
  console.log(`rb-25 ${which} FAILED: ${why}`);
  process.exit(1);
};

// ---- X8 spawns the real gate; it needs no module import. -------------------
if (which === 'X8') {
  const PATH_ = [
    `${process.env.HOME}/.local/bin`,
    `${process.env.HOME}/.cargo/bin`,
    `${process.env.HOME}/.asdf/installs/nodejs/24.13.1/bin`,
    `${process.env.HOME}/.nvm/versions/node/v24.13.1/bin`,
    process.env.PATH ?? '',
  ].join(':');
  try {
    execFileSync('just', ['ci'], {
      cwd: WT,
      env: { ...process.env, PATH: PATH_ },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      timeout: 45 * 60 * 1000,
    });
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    fail(`\`just ci\` exited ${e.status ?? '?'}\n${out.slice(-3000)}`);
  }
  console.log('rb-25-X8:JUST-CI-GREEN');
  process.exit(0);
}

const { checkRekeyCompleteness, REKEY_MANIFEST } = await import(EVAL);

// The eval's own input-set rule: every non-test .rs under server-module/src.
const SRC = path.join(WT, 'server-module/src');
const walk = (dir) =>
  readdirSync(dir).flatMap((e) => {
    const full = path.join(dir, e);
    if (statSync(full).isDirectory()) return walk(full);
    return e.endsWith('.rs') && !e.endsWith('_tests.rs') ? [full] : [];
  });
const paths = walk(SRC).sort();
if (paths.length < 15) fail(`only ${paths.length} live source(s) globbed — the scan would be vacuous`);
const LIVE = paths.map((p) => ({ path: path.relative(WT, p), src: readFileSync(p, 'utf8') }));
const ACCOUNTS = LIVE.find((f) => f.path.endsWith('/accounts.rs'));
if (ACCOUNTS === undefined) fail('accounts.rs not found in the live tree');

/** A manifest variant: one key's one half re-pointed. Never mutates the original. */
const borrow = (key, half, needle) => ({
  ...REKEY_MANIFEST,
  [key]: { ...REKEY_MANIFEST[key], [half]: needle },
});

/** An in-memory source variant, with an exact hit-count assertion. */
const edit = (label, file, from, to) => {
  const srcs = LIVE.map((f) => ({ ...f }));
  const target = srcs.find((f) => f.path.endsWith(file));
  if (target === undefined) fail(`${label}: ${file} not in the live tree`);
  let n = 0;
  for (let at = target.src.indexOf(from); at !== -1; at = target.src.indexOf(from, at + 1)) n++;
  if (n !== 1) fail(`${label}: the anchor occurs ${n} time(s) in ${file}; EXACTLY one is required`);
  target.src = target.src.replace(from, () => to);
  return srcs;
};

/** Require a bite: the tagged clause fires AND names every fragment. */
const bites = (label, err, tag, wants) => {
  if (err === null) fail(`${label}: the gate returned PASS on the cheat — it did not bite`);
  if (err.indexOf(tag) !== 0) fail(`${label}: bit under the wrong clause (wanted ${tag}): ${err}`);
  for (const w of wants) {
    if (err.indexOf(w) === -1) fail(`${label}: the ${tag} failure never names \`${w}\`: ${err}`);
  }
};

// CONTROL first: a gate that reds on EVERYTHING would satisfy every probe below.
const control = checkRekeyCompleteness(LIVE, ACCOUNTS.src);
if (control !== null) fail(`the shipped tree does not pass the shipped manifest: ${control}`);

if (which === 'X1') {
  // The rb-2 X10 criterion VERBATIM, on the live tree: the borrowed needle IS
  // present in account_has_game_data, so [G6/consumed] structurally cannot see it.
  bites(
    'X1/borrowed-exists',
    checkRekeyCompleteness(LIVE, ACCOUNTS.src, borrow('heal_cooldown.owner_identity', 'exists', 'has_monsters(')),
    '[G6/correspondence]',
    ['heal_cooldown.owner_identity', 'has_monsters', 'db.heal_cooldown('],
  );
  bites(
    'X1/borrowed-rekey',
    checkRekeyCompleteness(LIVE, ACCOUNTS.src, borrow('inventory.owner_identity', 'rekey', 'rekey_monsters(')),
    '[G6/correspondence]',
    ['inventory.owner_identity', 'rekey_monsters', 'db.inventory('],
  );
  // Fail-closed, not skip-when-absent.
  bites(
    'X1/unresolvable',
    checkRekeyCompleteness(LIVE, ACCOUNTS.src, borrow('profile.identity', 'exists', 'no_such_helper(')),
    '[G6/consumed]',
    ['no_such_helper('],
  );
  console.log('rb-25-X1:CORRESPONDENCE-BITES');
  process.exit(0);
}

if (which === 'X2') {
  // `et_exists(` is a plain-indexOf hit inside the live `wallet_exists(` call.
  bites(
    'X2/exists-substring',
    checkRekeyCompleteness(LIVE, ACCOUNTS.src, borrow('player_wallet.owner_identity', 'exists', 'et_exists(')),
    '[G6/consumed]',
    ['et_exists('],
  );
  bites(
    'X2/rekey-substring',
    checkRekeyCompleteness(LIVE, ACCOUNTS.src, borrow('player_wallet.owner_identity', 'rekey', 'ekey_wallet(')),
    '[G6/consumed]',
    ['ekey_wallet('],
  );
  // ...while every real, fully-qualified call site still satisfies its
  // unqualified needle — that is what the CONTROL above proves, and it is the
  // half a naive containsIdent swap would break (permanently red).
  console.log('rb-25-X2:IDENT-BOUNDARY-BITES');
  process.exit(0);
}

if (which === 'X3') {
  // P3 staleness: teach the live `has_monsters` to read the projection too and
  // the excuse must be reported as dead, not silently kept.
  bites(
    'X3/stale-excuse',
    (() => {
      const srcs = edit(
        'X3/stale-excuse',
        '/monster_mgmt.rs',
        'pub(crate) fn has_monsters(ctx: &ReducerContext, owner: Identity) -> bool {',
        'pub(crate) fn has_monsters(ctx: &ReducerContext, owner: Identity) -> bool {\n' +
          '    let _mirror = ctx.db.monster_pub().monster_id().find(0u64);',
      );
      return checkRekeyCompleteness(srcs, ACCOUNTS.src);
    })(),
    '[G6/mirror]',
    ['monster_pub.owner_identity', 'no longer need'],
  );
  // P2 same-needle: the shared existence predicate IS the safety argument.
  bites(
    'X3/needle-split',
    checkRekeyCompleteness(LIVE, ACCOUNTS.src, borrow('monster_pub.owner_identity', 'exists', 'has_items(')),
    '[G6/mirror]',
    ['monster_pub.owner_identity', 'share'],
  );
  // P1 exact set pin, reported by the gate's own derived summary.
  const out = execFileSync(process.execPath, [EVAL], { cwd: WT, encoding: 'utf8' });
  if (out.indexOf('1 mirror-covered exception(s) pinned') === -1) {
    fail(`the gate no longer reports exactly one pinned exception: ${out.slice(-400)}`);
  }
  console.log('rb-25-X3:MIRROR-PINNED');
  process.exit(0);
}

if (which === 'X4') {
  // Presence is not effect: the re-key helper must WRITE through its own table.
  bites(
    'X4/read-only-rekey',
    checkRekeyCompleteness(
      edit('X4/read-only-rekey', '/inventory.rs', 'ctx.db.inventory().inv_id().update(row);\n        }\n    }\n}', 'let _ = row;\n        }\n    }\n}'),
      ACCOUNTS.src,
    ),
    '[G6/correspondence]',
    ['inventory.owner_identity', 'db.inventory(', 'write'],
  );
  // A token tree is never name-resolved: `stringify!` proves nothing.
  bites(
    'X4/macro-token-tree',
    checkRekeyCompleteness(
      edit(
        'X4/macro-token-tree',
        '/economy.rs',
        'pub(crate) fn wallet_exists(ctx: &ReducerContext, owner: Identity) -> bool {\n    ctx.db\n        .player_wallet()\n        .owner_identity()\n        .find(owner)\n        .is_some()\n}',
        'pub(crate) fn wallet_exists(ctx: &ReducerContext, owner: Identity) -> bool {\n    let _ = (ctx, owner);\n    let _probe = stringify!(ctx.db.player_wallet().owner_identity());\n    false\n}',
      ),
      ACCOUNTS.src,
    ),
    '[G6/correspondence]',
    ['player_wallet.owner_identity', 'macro'],
  );
  // A same-named method on a local value is not a table accessor.
  bites(
    'X4/fake-db-handle',
    checkRekeyCompleteness(
      edit(
        'X4/fake-db-handle',
        '/raising.rs',
        'pub(crate) fn has_heal_cooldown(ctx: &ReducerContext, owner: Identity) -> bool {',
        'struct CooldownIndex;\nimpl CooldownIndex {\n    fn heal_cooldown(&self) -> bool {\n        false\n    }\n}\npub(crate) fn has_heal_cooldown_probe() -> bool {\n    let db = CooldownIndex;\n    db.heal_cooldown()\n}\npub(crate) fn has_heal_cooldown(_unused: &ReducerContext, _o: Identity) -> bool {\n    false\n}\n#[allow(dead_code)]\nfn has_heal_cooldown_real(ctx: &ReducerContext, owner: Identity) -> bool {',
      ),
      ACCOUNTS.src,
    ),
    '[G6/correspondence]',
    ['heal_cooldown.owner_identity', 'db.heal_cooldown('],
  );
  console.log('rb-25-X4:EFFECT-NOT-PRESENCE');
  process.exit(0);
}

fail(`unknown probe \`${which}\` (want X1|X2|X3|X4|X8)`);
