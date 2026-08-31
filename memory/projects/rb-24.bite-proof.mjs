// rb-24 X10 — 16-mutant proof-of-teeth. Each mutant is applied to the LIVE
// worktree (which must be git-clean first), the single NAMED gating test is
// run, the failure output must contain the mutant's PINNED message fragment,
// and the mutated file is restored (single-file git checkout, restore verified).
// Every mutation is count-verified before write (first-occurrence-replace trap).
// M1-M14 are the plan + plan-phase-red-team set; M15-M16 close the two
// artifact-red-team survivors (aliased foreign arm, extra crate-wide disarm
// call). Where two mutants share a clause (M6/M14, M7/M11, M8/M12) they attack
// it from different directions, distinguished by mutation site. Marker prints
// ONLY on success.
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-24';
const HOME = process.env.HOME;
const env = {
  ...process.env,
  PATH: `${HOME}/.asdf/shims:${HOME}/.cargo/bin:${HOME}/.local/bin:${process.env.PATH}`,
};
const ACC = 'server-module/src/accounts.rs';
const SCH = 'server-module/src/schema.rs';
const P = 'accounts::accounts_tests::';

function fail(msg) {
  console.error(`rb-24 bite-proof FAILED: ${msg}`);
  process.exit(1);
}

const GUARD_OLD = `    if ctx.sender() != ctx.database_identity() {
        return Err("account_deletion_reaper is scheduler-only".to_string());
    }
    Ok(())`;

const TESTS_ANCHOR = `#[cfg(test)]
#[path = "accounts_tests.rs"]
mod accounts_tests;`;

const MUTANTS = [
  {
    id: 'M1-grace-add-dropped',
    file: ACC,
    edits: [
      [
        '    requested_at_ms.saturating_add(game_core::DELETION_GRACE_MS_DEFAULT)\n',
        '    requested_at_ms\n',
      ],
    ],
    test: 'rb24_deletion_fire_at_ms_boundary',
    pins: ['[rb24/fire-value]'],
  },
  {
    id: 'M2-ms-us-multiply-dropped',
    file: ACC,
    edits: [
      [
        'deletion_fire_at_ms(requested_at_ms).saturating_mul(1_000),',
        'deletion_fire_at_ms(requested_at_ms),',
      ],
    ],
    test: 'rb24_arm_deletion_reaper_body_frozen',
    pins: ['[rb24/arm-body]'],
  },
  {
    id: 'M3-arm-before-update',
    file: ACC,
    edits: [
      [
        `    ctx.db
        .account()
        .identity()
        .update(requested_deletion(account, now));
    arm_deletion_reaper(ctx, me, now);`,
        `    arm_deletion_reaper(ctx, me, now);
    ctx.db
        .account()
        .identity()
        .update(requested_deletion(account, now));`,
      ],
    ],
    test: 'rb24_delete_account_arms_the_reaper_last',
    pins: ['[rb24/arm-after-update]'],
  },
  {
    id: 'M4-arm-from-fresh-clock',
    file: ACC,
    edits: [
      ['    arm_deletion_reaper(ctx, me, now);\n', '    arm_deletion_reaper(ctx, me, now_ms(ctx));\n'],
    ],
    test: 'rb24_delete_account_arms_the_reaper_last',
    pins: ['[rb24/arm-statement]'],
  },
  {
    id: 'M5-disarm-before-gate',
    file: ACC,
    edits: [
      ['    disarm_deletion_reaper(ctx, me);\n    Ok(())\n', '    Ok(())\n'],
      [
        '    if !needs_cancel_write(account.status) {',
        '    disarm_deletion_reaper(ctx, me);\n    if !needs_cancel_write(account.status) {',
      ],
    ],
    test: 'rb24_cancel_disarms_the_reaper',
    pins: ['[rb24/disarm-after-gate]'],
  },
  {
    id: 'M6-disarm-filter-to-iter',
    file: ACC,
    edits: [
      [
        `        .account_deletion_reaper_schedule()
        .account_identity()
        .filter(account)
        .map(|s| s.scheduled_id)`,
        `        .account_deletion_reaper_schedule()
        .iter()
        .map(|s| s.scheduled_id)`,
      ],
    ],
    test: 'rb24_disarm_deletion_reaper_body_frozen',
    pins: ['[rb24/disarm-body]'],
  },
  {
    id: 'M7-guard-inert-let-form',
    file: ACC,
    edits: [
      [
        GUARD_OLD,
        `    let scheduler_only = ctx.sender() != ctx.database_identity();
    let _ = scheduler_only;
    Ok(())`,
      ],
    ],
    test: 'rb24_deletion_reaper_scheduler_guard_is_first_statement',
    pins: ['[rb24/reaper-guard-first]'],
  },
  {
    id: 'M8-reaper-gains-delete',
    file: ACC,
    edits: [
      [
        GUARD_OLD,
        `    if ctx.sender() != ctx.database_identity() {
        return Err("account_deletion_reaper is scheduler-only".to_string());
    }
    ctx.db
        .account_deletion_reaper_schedule()
        .scheduled_id()
        .delete(_args.scheduled_id);
    Ok(())`,
      ],
    ],
    test: 'rb24_deletion_reaper_body_is_frozen_noop',
    pins: ['[rb24/reaper-body]'],
  },
  {
    id: 'M9-manifest-entry-deleted',
    file: SCH,
    edits: [
      [
        `    DataLifecycleEntry {
        table: "account_deletion_reaper_schedule",
        policy: DeletionPolicy::NotOwned,
        basis: "one-shot deletion-grace schedule (rb-24, ADR-0221): armed only by the \\
                account holder's own delete_account, disarmed by cancel, and the fired \\
                row is deleted by the runtime itself — so no row survives the cascade \\
                its own reducer runs, and an Erase entry would demand the D6 \\
                self-disarm anti-pattern",
        exportable: false,
    },
`,
        '',
      ],
    ],
    test: 'data_lifecycle_manifest_totality_bidirectional',
    pins: ['T1 ratchet: DATA_LIFECYCLE_MANIFEST has 39'],
  },
  {
    id: 'M10-btree-index-dropped',
    file: ACC,
    edits: [
      [
        `    pub scheduled_at: ScheduleAt,
    #[index(btree)]
    pub account_identity: Identity,
}

/// Deletion-grace reaper`,
        `    pub scheduled_at: ScheduleAt,
    pub account_identity: Identity,
}

/// Deletion-grace reaper`,
      ],
    ],
    test: 'rb24_deletion_schedule_table_shape_and_privacy',
    // Expected to die at COMPILE (the disarm filter needs the index accessor);
    // if it somehow compiles, the shape pin catches it textually.
    pins: ['error[E0599]', '[rb24/table-columns]'],
  },
  {
    id: 'M11-guard-prefix-forge',
    file: ACC,
    edits: [
      [
        GUARD_OLD,
        `    if ctx.sender() != ctx.database_identity() {
        returned_scheduler_reject(ctx);
    }
    Ok(())`,
      ],
      [
        TESTS_ANCHOR,
        `fn returned_scheduler_reject(_ctx: &ReducerContext) {}

${TESTS_ANCHOR}`,
      ],
    ],
    test: 'rb24_deletion_reaper_scheduler_guard_is_first_statement',
    pins: ['[rb24/reaper-guard-first]'],
  },
  {
    id: 'M12-reaper-delegated-cascade',
    file: ACC,
    edits: [
      [
        GUARD_OLD,
        `    if ctx.sender() != ctx.database_identity() {
        return Err("account_deletion_reaper is scheduler-only".to_string());
    }
    crate::privacy::purge_export_bundles(ctx, _args.account_identity);
    Ok(())`,
      ],
    ],
    test: 'rb24_deletion_reaper_body_is_frozen_noop',
    pins: ['[rb24/reaper-body]'],
  },
  {
    id: 'M13-now-shadow-zeroes-grace',
    file: ACC,
    edits: [
      [
        '    arm_deletion_reaper(ctx, me, now);\n',
        '    let now = 0i64;\n    arm_deletion_reaper(ctx, me, now);\n',
      ],
    ],
    test: 'rb24_delete_account_arms_the_reaper_last',
    pins: ['[rb24/wire-no-shadow]'],
  },
  {
    id: 'M14-disarm-deletes-wrong-table',
    file: ACC,
    edits: [
      [
        `        ctx.db
            .account_deletion_reaper_schedule()
            .scheduled_id()
            .delete(id);`,
        `        ctx.db
            .guest_claim_reaper_schedule()
            .scheduled_id()
            .delete(id);`,
      ],
    ],
    test: 'rb24_disarm_deletion_reaper_body_frozen',
    pins: ['[rb24/disarm-body]'],
  },
  {
    // rb-24 artifact red-team Finding 1: an aliased db handle reaches the
    // schedule table without the `ctx.db.` prefix — invisible to a prefixed
    // needle. The prefix-agnostic method-token census catches the 4th touch.
    id: 'M15-aliased-foreign-arm',
    file: ACC,
    edits: [
      [
        '/// Request account deletion — sets `PendingDeletion`',
        `fn rb24_m15_stealth_arm(ctx: &ReducerContext, victim: Identity) {
    let d = &ctx.db;
    d.account_deletion_reaper_schedule().insert(AccountDeletionReaperSchedule {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Time(Timestamp::from_micros_since_unix_epoch(0)),
        account_identity: victim,
    });
}

/// Request account deletion — sets \`PendingDeletion\``,
      ],
    ],
    test: 'rb24_schedule_table_sole_writers',
    pins: ['[rb24/sole-writer-census]'],
  },
  {
    // rb-24 artifact red-team Finding 2: a second disarm call in a non-cancel
    // function nets to zero under the arm-minus-disarm arithmetic; the direct
    // crate-wide disarm census catches it.
    id: 'M16-extra-disarm-call',
    file: ACC,
    edits: [
      [
        '    consume_claim_and_disarm(ctx, guest);',
        '    consume_claim_and_disarm(ctx, guest);\n    disarm_deletion_reaper(ctx, guest);',
      ],
    ],
    test: 'rb24_disarm_called_exactly_once_in_crate',
    pins: ['[rb24/disarm-census-site]'],
  },
];

// Preconditions: clean tree (restores must be sound).
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: WT, encoding: 'utf8' }).trim();
if (dirty) fail(`worktree is not clean — commit first so single-file restores are sound:\n${dirty}`);

let caught = 0;
const results = [];
for (const m of MUTANTS) {
  const filePath = path.join(WT, m.file);
  const orig = readFileSync(filePath, 'utf8');
  let mutated = orig;
  for (const [old, neu] of m.edits) {
    const n = mutated.split(old).length - 1;
    if (n !== 1) fail(`${m.id}: edit target occurs ${n} time(s), want exactly 1 — mutation NOT applied`);
    mutated = mutated.replace(old, neu);
  }
  if (mutated === orig) fail(`${m.id}: mutation produced identical source — void`);
  writeFileSync(filePath, mutated);

  let out = '';
  let redded = false;
  try {
    out = execSync(`cargo test -p monster-realm-module --lib ${P}${m.test} 2>&1`, {
      cwd: WT,
      env,
      maxBuffer: 128 * 1024 * 1024,
      timeout: 900_000,
    }).toString();
  } catch (e) {
    out = String(e.stdout) + String(e.stderr);
    redded = true;
  }
  // Restore BEFORE judging, so a failure never leaves a mutated tree.
  execFileSync('git', ['checkout', '--', m.file], { cwd: WT });
  const stillDirty = execFileSync('git', ['status', '--porcelain', '--', m.file], {
    cwd: WT,
    encoding: 'utf8',
  }).trim();
  if (stillDirty) fail(`${m.id}: restore of ${m.file} FAILED — stop and inspect`);

  if (!redded) fail(`${m.id}: SURVIVED — the named test ${m.test} stayed green under the mutant`);
  const pinHit = m.pins.find((p) => out.indexOf(p) >= 0);
  if (!pinHit) fail(`${m.id}: redded but WITHOUT the pinned fragment(s) ${JSON.stringify(m.pins)} — mis-attributed kill; tail: ${out.slice(-600)}`);
  caught += 1;
  results.push(`${m.id}:RED(${pinHit})`);
  console.error(`[bite] ${m.id} -> RED via ${pinHit}`);
}

// Post-flight: full tree still clean and the suite green again.
const post = execFileSync('git', ['status', '--porcelain'], { cwd: WT, encoding: 'utf8' }).trim();
if (post) fail(`tree dirty after restores:\n${post}`);
try {
  const out = execSync(`cargo test -p monster-realm-module --lib ${P} 2>&1`, {
    cwd: WT,
    env,
    maxBuffer: 128 * 1024 * 1024,
    timeout: 900_000,
  }).toString();
  if (!/test result: ok\./.test(out)) fail('post-flight suite not green');
} catch (e) {
  fail(`post-flight suite red after restores: ${(String(e.stdout) + String(e.stderr)).slice(-600)}`);
}

if (caught !== MUTANTS.length) fail(`caught=${caught} of ${MUTANTS.length}`);
console.log(`rb-24-X10:TEETH-16-RED mutants=16 caught=16 survived=0`);
console.error(results.join('\n'));
