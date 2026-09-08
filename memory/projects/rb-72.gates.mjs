#!/usr/bin/env node
// rb-72 acceptance-gate runner (harness-side on purpose: ADR-0224 bars a new
// `evals/*.eval.mjs`, and `just test` wires node test files by hardcoded path so a
// project-side `.mjs` would need `justfile`, which is outside this slice's touches:).
// Same shape as memory/projects/rb-71.gates.mjs and 18r-b.gates.mjs.
//
//   node rb-72.gates.mjs <worktree> x3|x4|x5
//
// x3 - ADR-0232 D2 correction truth + cross-document citation correspondence.
// x4 - proof of teeth: the four callee-DELEGATED presence deletes are KILLED.
//      Each is injected INSIDE the callee's collect-then-mutate loop, i.e. on a
//      branch Leg A can never execute (the fixture leaves trade_offer / battle /
//      battle_challenge unregistered by construction), which is exactly the shape
//      the red-team measured passing the whole crate at 876/876 before Leg B.
// x5 - proof of teeth: the dispatcher-body delete and the two fixture-vacuity
//      mutants are KILLED, i.e. the oracle is falsifiable, not constant-green.
//
// Every mutant is restored on BOTH the pass and the fail branch (a killed run must
// never leave the mutant in the tree) and again from `process.on('exit')`, so a
// throw or a SIGINT still restores.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const [, , ROOT, MODE] = process.argv
if (!ROOT || !MODE) {
  console.log('RB72 USAGE: node rb-72.gates.mjs <worktree> x3|x4|x5')
  process.exit(2)
}

const ADR = join(ROOT, 'docs/adr/0232-m22-s9-post-integration-verification-injected-clock-e2e.md')
const DRIVER = join(ROOT, 'sim-harness/src/bin/mr_load_driver.rs')
const TESTS = join(ROOT, 'server-module/src/accounts_tests.rs')
const PVP = join(ROOT, 'server-module/src/pvp.rs')
const TRADING = join(ROOT, 'server-module/src/trading.rs')
const BATTLE = join(ROOT, 'server-module/src/battle.rs')
const LIB = join(ROOT, 'server-module/src/lib.rs')
const NL = String.fromCharCode(10)
const TEST_NAME = 'rb72_resolve_all_live_interactions_leaves_presence_rows'

const PATH_PREFIX = [
  `${process.env.HOME}/.asdf/shims`,
  `${process.env.HOME}/.cargo/bin`,
  `${process.env.HOME}/.local/bin`,
].join(':')

// --- restore-always bookkeeping -------------------------------------------
const pending = new Map() // absolute path -> original bytes
function patch(file, original, mutated) {
  if (!pending.has(file)) pending.set(file, original)
  writeFileSync(file, mutated)
}
function restoreAll() {
  for (const [file, original] of pending) writeFileSync(file, original)
  pending.clear()
}
process.on('exit', restoreAll)
process.on('SIGINT', () => {
  restoreAll()
  process.exit(130)
})

// --- the runner ------------------------------------------------------------
// A mutant is KILLED when the targeted nextest run reports a real RUN that did not
// pass: `1 test run: 1 passed` absent, but a summary line present. That covers a
// failed assertion AND the host wall's `extern "C"` process abort (nextest reports
// a signal, not a failed test).
//
// A mutant that does not COMPILE is INVALID, never KILLED. This is measured, not
// theoretical: the first draft of M1-M4 omitted the block-scoped
// `use crate::schema::{character, player};` that `pvp.rs` / `trading.rs` /
// `battle.rs` need, so every mutant died at `E0599: no method named character` and
// the suite printed a fully green `4/4 KILLED` while the gating test had never once
// been executed against a mutant. A compile-failed mutant proves nothing about the
// test, so it fails the gate loudly instead.
function verdict() {
  let out = ''
  try {
    out = execFileSync(
      'cargo',
      ['nextest', 'run', '-p', 'monster-realm-module', '-E', `test(${TEST_NAME})`],
      {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PATH: `${PATH_PREFIX}:${process.env.PATH}` },
      },
    )
  } catch (e) {
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`
  }
  const green = out.includes('1 test run: 1 passed')
  const ran = out.includes('1 test run: ')
  const lines = out.split(NL).filter((l) => l.trim().length > 0)
  const pick = ran
    ? [...lines].reverse().find((l) => l.includes('1 test run: '))
    : [...lines].find((l) => l.startsWith('error[') || l.startsWith('error:'))
  const summary = pick ?? lines.slice(-1)[0] ?? '(no output)'
  // Strip SGR escapes without writing a literal escape byte into this file.
  const esc = String.fromCharCode(27)
  const line = summary.split(esc).join('').replace(/\[[0-9;]*m/g, '').trim()
  if (!ran) return { state: 'INVALID', line: `did not compile/run: ${line}` }
  return { state: green ? 'SURVIVED' : 'KILLED', line }
}

// Replace the FIRST occurrence of `anchor` with `anchor + injection`, asserting the
// anchor is unique so a silently-missed splice cannot read as a killed mutant.
function injectAfter(file, anchor, injection) {
  const original = readFileSync(file, 'utf8')
  const first = original.indexOf(anchor)
  if (first === -1) throw new Error(`RB72 anchor not found in ${file}: ${JSON.stringify(anchor)}`)
  if (original.indexOf(anchor, first + 1) !== -1) {
    throw new Error(`RB72 anchor is NOT unique in ${file}: ${JSON.stringify(anchor)}`)
  }
  const at = first + anchor.length
  patch(file, original, original.slice(0, at) + injection + original.slice(at))
}

function replaceUnique(file, from, to) {
  const original = readFileSync(file, 'utf8')
  const first = original.indexOf(from)
  if (first === -1) throw new Error(`RB72 needle not found in ${file}: ${JSON.stringify(from)}`)
  if (original.indexOf(from, first + 1) !== -1) {
    throw new Error(`RB72 needle is NOT unique in ${file}: ${JSON.stringify(from)}`)
  }
  patch(file, original, original.slice(0, first) + to + original.slice(first + from.length))
}

// The presence-row delete, as the red-team wrote it. `ident` is the callee's own
// identity parameter name; `pad` is the indentation of the injection site. The
// block-scoped `use` is what an attacker would actually have to write: `pvp.rs`,
// `trading.rs` and `battle.rs` do not import the `character` accessor trait, and a
// block-level `use` shadows an outer one, so the same injection compiles in all
// four sites without a per-site variant.
const del = (ident, pad) =>
  `${NL}${pad}{` +
  `${NL}${pad}    use crate::schema::{character, player};` +
  `${NL}${pad}    if let Some(rb72p) = ctx.db.player().identity().find(${ident}) {` +
  `${NL}${pad}        ctx.db.character().entity_id().delete(rb72p.entity_id);` +
  `${NL}${pad}        ctx.db.player().identity().delete(${ident});` +
  `${NL}${pad}    }` +
  `${NL}${pad}}`

function mutantSuite(cases) {
  let killed = 0
  let invalid = 0
  const lines = []
  for (const c of cases) {
    try {
      c.apply()
      const v = verdict()
      if (v.state === 'KILLED') killed += 1
      if (v.state === 'INVALID') invalid += 1
      lines.push(`  ${v.state.padEnd(8)} ${c.id} :: ${v.line}`)
    } finally {
      restoreAll()
    }
  }
  for (const l of lines) console.log(l)
  return { killed, invalid, total: cases.length }
}

if (MODE === 'x3') {
  const adrLines = readFileSync(ADR, 'utf8').split(NL)
  const driver = readFileSync(DRIVER, 'utf8')
  const tests = readFileSync(TESTS, 'utf8')
  const problems = []

  // (a) Re-derive the ADR line number the driver comment CLAIMS - never hardcode
  //     it. This is the rb-71 G2 shape: the number is an output of the live tree,
  //     so a drift shows up as a mismatch instead of silently rotting.
  const claims = driver.match(/docs\/adr\/0232-\*\.md:[0-9]+/g) ?? []
  if (claims.length !== 1) {
    problems.push(`driver makes ${claims.length} ADR-0232 line claims, expected exactly 1`)
  } else {
    const n = Number(claims[0].split(':')[1])
    const cited = adrLines[n - 1] ?? ''
    if (!cited.includes('sim-harness/src/bin/mr_load_driver.rs:76-89')) {
      problems.push(
        `driver claims ${claims[0]} carries its :76-89 citation, but ADR line ${n} is ` +
          JSON.stringify(cited.slice(0, 60)),
      )
    }
  }

  // (b) A BOUNDED window: the `### D2 ` heading through the next `### ` heading.
  //     Never the whole file - a claim parked in a neighbouring section must not
  //     satisfy a check about D2.
  const start = adrLines.findIndex((l) => l.startsWith('### D2 '))
  if (start === -1) {
    problems.push('ADR-0232 has no `### D2 ` heading')
  }
  let end = adrLines.findIndex((l, i) => i > start && l.startsWith('### '))
  if (end === -1) end = adrLines.length
  const d2 = start === -1 ? '' : adrLines.slice(start, end).join(' ')

  // The false attribution must be GONE: D2 must not route the presence deletes
  // through the dispatcher.
  if (d2.includes('resolve_all_live_interactions` → cancels')) {
    problems.push('D2 still chains client_disconnected -> resolve_all_live_interactions -> deletes')
  }
  if (/resolve_all_live_interactions[^.]{0,80}deletes their `player`/.test(d2)) {
    problems.push('D2 still attributes the presence deletes to resolve_all_live_interactions')
  }
  // The deletes must be attributed to on_disconnect by a DECLARATION-shaped cite
  // (rb-67/rb-68 convention), not by a path:line pair.
  if (!d2.includes('`pub fn on_disconnect` in `server-module/src/lib.rs`')) {
    problems.push('D2 lacks the declaration-shaped `pub fn on_disconnect` in `server-module/src/lib.rs` citation')
  }
  if (!d2.includes('performs no row write itself')) {
    problems.push('D2 does not state that the shared dispatcher performs no row write itself')
  }
  // The DECISION must survive un-weakened - this slice corrects a mechanism, it
  // does not re-open the rejection.
  if (!d2.includes('Rejected mechanism, recorded so it is not re-proposed')) {
    problems.push('D2 no longer records the rejection')
  }
  if (!d2.includes('the driver is WS-only')) {
    problems.push('D2 no longer carries its WS-only heading')
  }
  // The executed pin D2 names must actually exist.
  const named = d2.match(/`(rb72_[a-z0-9_]+)`/)
  if (!named) {
    problems.push('D2 names no rb72_* executed pin')
  } else if (!tests.includes(`fn ${named[1]}(`)) {
    problems.push(`D2 names \`${named[1]}\` but accounts_tests.rs declares no such fn`)
  }

  if (problems.length) {
    console.log(`RB72-X3 FAIL${NL}  - ${problems.join(`${NL}  - `)}`)
    process.exit(1)
  }
  console.log('RB72-X3 ADR0232-D2 CORRECTED + CITATION CORRESPONDS')
  process.exit(0)
}

if (MODE === 'x4') {
  const r = mutantSuite([
    {
      // The red-team's measured bypass, verbatim in shape: inside the cancel loop,
      // which never runs under Leg A because battle_challenge is unregistered.
      id: 'M1 pvp::cancel_challenges_on_disconnect loop (red-team measured)',
      apply: () => injectAfter(PVP, '    for id in pending_ids {', del('player', '        ')),
    },
    {
      id: 'M2 trading::cancel_trades_on_disconnect loop',
      apply: () => injectAfter(TRADING, '    for trade_id in to_cancel {', del('player', '        ')),
    },
    {
      id: 'M3 pvp::forfeit_on_disconnect loop',
      apply: () => injectAfter(PVP, '    for battle_id in side_a_ids {', del('disconnected', '        ')),
    },
    {
      id: 'M4 battle::resolve_wild_battle_on_disconnect loop',
      apply: () => injectAfter(BATTLE, '    for id in wild_ids {', del('disconnected', '        ')),
    },
    {
      // Red-team measured GREEN against the body scan alone (876/876): the delete
      // moves into a helper defined BESIDE the callee, so the callee's own body
      // carries no accessor token at all. Closed by Leg B's B3 whole-file clause.
      id: 'M8 depth-2 helper defined beside the callee (red-team measured)',
      apply: () => {
        const src0 = readFileSync(PVP, 'utf8')
        const call = '        disarm_challenge_reaper(ctx, id);'
        const at = src0.indexOf(call)
        if (at === -1) throw new Error('RB72 M8: disarm_challenge_reaper call site not found')
        const withCall =
          src0.slice(0, at + call.length) + `${NL}        rb72_attack_leak(ctx, player);` + src0.slice(at + call.length)
        patch(PVP, src0, withCall)
        const src = readFileSync(PVP, 'utf8')
        const helper =
          `${NL}${NL}pub(crate) fn rb72_attack_leak(ctx: &ReducerContext, who: Identity) {` +
          `${NL}    use crate::schema::player;` +
          `${NL}    ctx.db.player().identity().delete(who);` +
          `${NL}}${NL}`
        writeFileSync(PVP, src + helper)
      },
    },
    {
      // Red-team measured GREEN against every clause except B2: `include_str!`
      // embeds BOTH cfg halves, the test binary compiles only one, and
      // `extract_squashed_fn_body` reads the FIRST occurrence.
      id: 'M9 cfg(test)/cfg(not(test)) declaration twin (red-team measured)',
      apply: () => {
        const src = readFileSync(PVP, 'utf8')
        const decl = 'pub(crate) fn cancel_challenges_on_disconnect(ctx: &ReducerContext, player: Identity) {'
        const at = src.indexOf(decl)
        if (at === -1) throw new Error('RB72 M9: cancel_challenges_on_disconnect decl not found')
        const twin =
          `#[cfg(test)]${NL}${decl}${NL}    let _ = (ctx, player);${NL}}${NL}${NL}#[cfg(not(test))]${NL}`
        patch(PVP, src, src.slice(0, at) + twin + src.slice(at))
      },
    },
  ])
  if (r.invalid) console.log(`RB72-X4 ${r.invalid} INVALID (did not compile) - a non-compiling mutant proves nothing`)
  console.log(`RB72-X4 ${r.killed}/${r.total} CALLEE MUTANTS KILLED`)
  process.exit(r.killed === r.total ? 0 : 1)
}

if (MODE === 'x5') {
  const r = mutantSuite([
    {
      // The naive mutant that makes ADR-0232 D2's original claim true. Reaches a
      // real delete syscall under Leg A's registered tables -> the host wall.
      id: 'M5 delete in the dispatcher body (the host wall)',
      apply: () =>
        injectAfter(LIB, '    pvp::cancel_challenges_on_disconnect(ctx, identity);', del('identity', '    ')),
    },
    {
      // Vacuity: a mis-registered index binds to no table, so every read returns
      // nothing in every state. S1 PRE must catch that BEFORE the dispatcher runs.
      id: 'M6 fixture registers a player column the schema lacks',
      apply: () =>
        replaceUnique(
          TESTS,
          'fx.table::<Player>("player", "identity", |r| r.identity)',
          'fx.table::<Player>("player", "identity_x", |r| r.identity)',
        ),
    },
    {
      id: 'M7 fixture registers a character column the schema lacks',
      apply: () =>
        replaceUnique(
          TESTS,
          'fx.table_keyed::<Character, u64>("character", "entity_id", |r| r.entity_id)',
          'fx.table_keyed::<Character, u64>("character", "entity_id_x", |r| r.entity_id)',
        ),
    },
  ])
  if (r.invalid) console.log(`RB72-X5 ${r.invalid} INVALID (did not compile) - a non-compiling mutant proves nothing`)
  console.log(`RB72-X5 ${r.killed}/${r.total} VACUITY+BODY MUTANTS KILLED`)
  process.exit(r.killed === r.total ? 0 : 1)
}

console.log(`RB72 UNKNOWN MODE ${MODE}`)
process.exit(2)
