#!/usr/bin/env node
// rb-25 mutation bite-proof (ADR-0010 proof-of-teeth).
//
// For each mutant: apply ONE surgical edit to the SHIPPED eval (exact-anchor
// replace with a count assertion, so a silently-missed edit can never read as
// "the gate accepted the cheat"), run the mutated eval standalone from the
// worktree root, and require (a) a non-zero exit AND (b) the PINNED tooth label
// in the output. The label pin is load-bearing: an exit-code-only probe cannot
// tell a hollowed target tooth from a NEIGHBOUR catching the same mutant.
//
// The mutant file is written next to the original (the eval imports
// ./rust-scan.mjs relatively) under a name run.mjs never globs, and removed in
// a finally block.
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const WT = '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-25';
const SRC = path.join(WT, 'evals/guest-claim-integrity.eval.mjs');
const MUT = path.join(WT, 'evals/.rb25-mutant.mjs');

/** @type {Array<{id:string, tooth:string, edits:Array<[string,string]>, why:string}>} */
const MUTANTS = [
  {
    id: 'M1', tooth: 'FG75b',
    why: 'the correspondence verdict is discarded for every non-excused key (the excused key still ' +
      'gets a real verdict, so the mirror staleness canary does not fire and FG75b must catch it alone)',
    edits: [['        if (strict !== null) return strict;', '        if (false) return strict;']],
  },
  {
    id: 'M2', tooth: 'FG75c', why: 'the exists half falls back to a plain substring test',
    edits: [['    if (!containsCallOf(bodies.exists, policy.exists)) {', '    if (bodies.exists.indexOf(policy.exists) === -1) {']],
  },
  {
    id: 'M3', tooth: 'FG75d', why: 'the rekey half falls back to a plain substring test',
    edits: [['    if (!containsCallOf(bodies.rekey, policy.rekey)) {', '    if (bodies.rekey.indexOf(policy.rekey) === -1) {']],
  },
  {
    id: 'M4', tooth: 'FG75e', why: 'a method call is accepted as a free-function call',
    edits: [["    if (before === '.') continue;", '    if (false) continue;']],
  },
  {
    id: 'M5', tooth: 'FG75f', why: 'an unresolvable needle is skipped instead of failing closed',
    edits: [['    if (defs.length === 0) {', '    if (defs.length === 0) return null;\n    if (false) {']],
  },
  {
    id: 'M6', tooth: 'FG75g', why: 'a decoy declaration can steer the first-hit anchor',
    edits: [['    if (defs.length > 1) {', '    if (false) {']],
  },
  {
    id: 'M7', tooth: 'FG75h', why: 'an empty helper body is accepted',
    edits: [[
      '    const body = compactWs(def.stripped.slice(span.start, span.end));\n    if (body === \'\') {',
      '    const body = compactWs(def.stripped.slice(span.start, span.end));\n    if (false) {',
    ]],
  },
  {
    id: 'M8', tooth: 'FG75i', why: 'an accessor behind #[cfg(any())] satisfies the clause',
    edits: [[
      '    const bodyCfg = CFG_SPELLINGS.find((c) => body.indexOf(c) !== -1);',
      '    const bodyCfg = undefined;',
    ]],
  },
  {
    id: 'M9', tooth: 'FG47',
    why: 'the accessor token loses its `db.` root, so a same-named method on any receiver would ' +
      'count. PIN NOTE: the catcher is the shipped GOOD control, not FG75j (the positive ' +
      'wrong-receiver fixture) — a rootless token has no valid site on CORRECT source either, so ' +
      'this mutant breaks the control by construction and FG75j cannot be isolated from it. The ' +
      'pin names the tooth that fires, never a neighbour chosen after the fact.',
    edits: [['    const token = `db.${table}(`;', '    const token = `.${table}(`;']],
  },
  {
    id: 'M10', tooth: 'FG75l', why: 'the rekey half degrades to presence, not effect',
    edits: [["    if (half !== 'rekey') return null;", '    return null;']],
  },
  {
    id: 'M11', tooth: 'FG75m', why: 'the write search widens to the whole body, so a neighbouring table’s write counts',
    edits: [['      const segment = body.slice(at, f);', '      const segment = body;']],
  },
  {
    id: 'M12', tooth: 'FG75n', why: 'a stale exception outlives its justification',
    edits: [['      if (strict === null) {', '      if (false) {']],
  },
  {
    id: 'M13', tooth: 'FG75o', why: 'the cover need not share the excused key’s predicate',
    edits: [['      if (coverNeedle !== policy.exists) {', '      if (false) {']],
  },
  {
    id: 'M14', tooth: 'FG75r',
    why: 'the exception is WIDENED by a row NO behavioural clause can see (a BLOCKED key never ' +
      'reaches the mirror path), leaving the teeth-side SET pin as the only catcher',
    // The live-path P1 pin is removed in the same mutant so FG75r is the UNIQUE
    // catcher — that is the claim being proven, not a re-point. Note for the
    // record: widening with a REKEY key is caught FOUR independent ways (P1, P3
    // staleness, a targeted correspondence tooth, and FG75r); this mutant picks
    // the one shape that defeats the first three.
    edits: [
      [
        "const EXISTS_COVER = new Map([['monster_pub.owner_identity', 'monster.owner_identity']]);",
        "const EXISTS_COVER = new Map([['monster_pub.owner_identity', 'monster.owner_identity'], " +
          "['player.identity', 'monster.owner_identity']]);",
      ],
      [
        '  if (EXISTS_COVER.size !== 1 || coverPin !== WANT_COVER) {',
        '  if (false) {',
      ],
    ],
  },
  {
    id: 'M15', tooth: 'FG75k',
    why: 'the shared tree is no longer stripped, so a token inside a // comment or a string ' +
      'literal satisfies the clause',
    edits: [[
      '  const strippedTree = treeSrcs.map((f) => ({ path: f.path, stripped: stripRustSource(f.src) }));',
      '  const strippedTree = treeSrcs.map((f) => ({ path: f.path, stripped: f.src }));',
    ]],
  },
  {
    id: 'M16', tooth: 'FG75m',
    why: 'the write search leaves the method chain again, so a `Vec::insert` in the FOLLOWING ' +
      'statement satisfies the rekey half (red-team FIX-A, measured clippy-clean). PIN NOTE: ' +
      'FG75m (read/write split) exercises the SAME chain bound and runs earlier, so it is the ' +
      'catcher; FG75s is the second, independent fixture for the rule.',
    edits: [[
      '      let f = at;\n      while (f < body.length && isChainChar(body[f])) f++;',
      '      let f = at;\n      while (f < body.length && body[f] !== undefined) f++;',
    ]],
  },
  {
    id: 'M17', tooth: 'FG75u',
    why: 'macro spans are no longer computed, so `stringify!(ctx.db.<table>()...)` — a token tree ' +
      'that is never name-resolved — proves a table touch (red-team B1)',
    edits: [['  const spans = macroSpans(body);', '  const spans = [];']],
  },
  {
    id: 'M18', tooth: 'FG75v',
    why: 'the accessor receiver is no longer required to be a real db handle, so ' +
      '`let db = SomeLocalStruct;` fabricates the token (red-team B2/B4)',
    edits: [['    if (handles.has(receiver)) {', '    if (true) {']],
  },
  {
    id: 'M19', tooth: 'FG75w',
    why: 'a `#[cfg(any())]` on the fn ITEM (outside the body) no longer disqualifies it (red-team C)',
    edits: [['    const itemCfg = CFG_SPELLINGS.find((c) => itemPrefix.indexOf(c) !== -1);',
             '    const itemCfg = undefined;']],
  },
  {
    id: 'M20', tooth: 'FG75y',
    why: 'the expression macro `cfg!(` drops out of CFG_SPELLINGS, so `if cfg!(any()) { <accessor> }` ' +
      'proves a table touch (red-team B3)',
    edits: [["const CFG_SPELLINGS = ['#[cfg', 'cfg!('];", "const CFG_SPELLINGS = ['#[cfg'];"]],
  },
  {
    id: 'M21', tooth: 'FG32',
    why: 'WRITE_VERBS is narrowed (the shared G5 list has no pin of its own), silently weakening ' +
      'the rekey write rule for delete-only helpers. PIN NOTE: the catcher is G5\'s OWN tooth — ' +
      'which is precisely the coupling FG75x documents. M22 below isolates FG75x.',
    edits: [["const WRITE_VERBS = ['.insert(', '.update(', '.delete('];",
             "const WRITE_VERBS = ['.insert(', '.update('];"]],
  },
  {
    id: 'M22', tooth: 'FG75x',
    why: 'the shared WRITE_VERBS list is REORDERED — invisible to G5, whose test is an ' +
      'order-insensitive `.some()`, so only the exact SET pin can see it',
    edits: [["const WRITE_VERBS = ['.insert(', '.update(', '.delete('];",
             "const WRITE_VERBS = ['.delete(', '.update(', '.insert('];"]],
  },
];

const original = readFileSync(SRC, 'utf8');
const results = [];
let caught = 0;

const run = (file) => {
  try {
    const out = execFileSync(process.execPath, [file], { cwd: WT, encoding: 'utf8' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

try {
  // CONTROL: the unmutated eval must be GREEN, or every "bite" below is
  // indistinguishable from a pre-existing red.
  writeFileSync(MUT, original);
  const control = run(MUT);
  if (control.code !== 0) {
    console.log(`rb-25 BITE-PROOF ABORTED: the unmutated eval is not green:\n${control.out}`);
    process.exit(1);
  }
  if (control.out.indexOf('eval PASS') === -1) {
    console.log('rb-25 BITE-PROOF ABORTED: control did not print eval PASS');
    process.exit(1);
  }

  for (const m of MUTANTS) {
    // A first-occurrence replace that silently does not apply reads as "the
    // gate accepted the cheat". Count first, refuse on anything but exactly one.
    let mutated = original;
    let anchorFault = null;
    for (const [from, to] of m.edits) {
      let n = 0;
      for (let at = mutated.indexOf(from); at !== -1; at = mutated.indexOf(from, at + 1)) n++;
      if (n !== 1) {
        anchorFault = `ANCHOR-${n === 0 ? 'MISS' : 'AMBIGUOUS'} (${n} hits)`;
        break;
      }
      // A function replacer: a `$&`/`$'` sequence in the replacement text is a
      // substitution pattern to String.replace and would splice the file's tail.
      mutated = mutated.replace(from, () => to);
    }
    if (anchorFault !== null) {
      results.push(`${m.id} ${anchorFault} ${m.tooth}`);
      continue;
    }
    writeFileSync(MUT, mutated);
    const r = run(MUT);
    const bit = r.code !== 0 && r.out.indexOf(`${m.tooth}:`) !== -1;
    if (bit) caught++;
    results.push(
      `${m.id} ${bit ? 'CAUGHT' : 'SURVIVED'} by ${m.tooth} (exit ${r.code}) — ${m.why}` +
        (bit ? '' : `\n      got: ${r.out.slice(0, 400).replace(/\n/g, ' ')}`),
    );
  }
} finally {
  if (existsSync(MUT)) unlinkSync(MUT);
}

for (const line of results) console.log(`  ${line}`);
const survived = MUTANTS.length - caught;
if (survived === 0) {
  console.log(`rb-25-X6:TEETH-${MUTANTS.length}-RED mutants=${MUTANTS.length} caught=${caught} survived=0`);
  process.exit(0);
}
console.log(`rb-25 BITE-PROOF FAILED: mutants=${MUTANTS.length} caught=${caught} survived=${survived}`);
process.exit(1);
