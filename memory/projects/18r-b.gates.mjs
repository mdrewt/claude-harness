#!/usr/bin/env node
// 18r-b acceptance-gate runner ("citation truth" micro-sweep). Arms i1..i5 encode the slice's
// single EARS criterion -- "WHEN each cited doc/comment is read THE claim SHALL match the code it
// describes at HEAD" -- one per stale citation named in the plan; b1 runs all five in order and,
// only on full pass, prints the ledger's EXPECT substring. EVERY number below is DERIVED from the
// live tree at run time; none is a copy of the fixed-state text pasted in from the plan memo, so a
// re-pointed hint or a planted literal reds on an equality/derivation check, not on absence of the
// new prose.
//
// WHY THIS LIVES IN THE HARNESS REPO, NOT `evals/`: ADR-0224 retired the bespoke-scanner-script
// default and bans NEW `evals/*.eval.mjs` gates. The 17r-a / 17r-b / rb-37 precedent for a
// slice-scoped acceptance runner is a harness-memory script invoked directly by its ledger CHECK --
// this script is the same shape, one arm per stale citation plus a composite.
//
// WHY ARGV AND NOT `cd <worktree> && node ...`: `mr-gates lint` requires a seeded gate's CHECK
// command to *start* with a real runner -- its `command_head` parser skips only `VAR=value` tokens
// at the front of the command line, so a `cd ... && node ...` one-liner is rejected by lint. The
// worktree is threaded through argv[2] instead, and every path below is resolved relative to it.
//
// WHAT THIS GATE DOES NOT PROVE. It cannot prove the four corrected English sentences are TRUE --
// only that the named landmarks exist with the claimed shape and that every surviving number
// resolves to a site independently derived from the live code (never copied from the fixed-state
// prose in the plan). i1 strips a TRAILING same-line `//` comment (via `stripTrailingComment`, a
// `search(/(?<!:)\/\//)` scan that treats the first `//` not immediately preceded by `:` as the
// comment start) before counting occurrences or testing the same-line `?.claimedFrom` chain -- this
// closes a MEASURED bypass where a decoy trailing comment (`store.identityRow(...)?.claimedFrom, //
// was store.ownAccount(...)?.claimedFrom`) let the real call disappear from production code while a
// naive whole-line "does this line START with `//`" test still counted the comment's substring as
// the real occurrence. The `:`-precedence guard exists to protect a `://` scheme (`https://`,
// `ws://`) from being misread as a comment start, but it is still a heuristic, not a parser: it does
// not understand block comments, string literals, template-literal contents, or a legitimate `//`
// occurring elsewhere in live code, so it can still UNDER-count a line's occurrences in an adversarial
// case (it can only ever hide a real occurrence, never manufacture one that isn't there -- but a false
// 1-of-2 count is still a false GREEN and this gate does not close that residual risk). i2's body-
// content check strips `//`-suffix comment text line-by-line before testing for the two delete
// needles -- also a heuristic (no block-comment or string-literal awareness), chosen because the
// alternative (trusting a raw substring test over uncommented Rust) was MEASURED to pass a
// commented-out deletion block. i2's derived-on_disconnect-file citation check is an EQUALITY test
// over the backtick-delimited tokens extracted from the "# Why WebSocket only (AM25)" //! SECTION
// (relPath must appear as one of them VERBATIM), not a substring or boundary-anchored-regex test --
// two earlier attempts at the latter (an unanchored `.includes()`, then an asymmetric boundary-regex
// whose lookahead omitted `.`/`/` and so still let a suffix decoy like `lib.rs.orig` through) were
// each MEASURED bypassable, and equality over extracted tokens has no boundary class left to get
// wrong. A THIRD bypass was then MEASURED against an earlier, whole-file-scoped version of that same
// equality test: with no line/section scoping, a decoy mention of the correct path anywhere in the
// 188-line file (e.g. an unrelated aside at the module header) satisfied "relPath appears somewhere"
// while the REAL on_disconnect citation, independently rewritten to name a wrong-but-real file, went
// uncaught -- "the file mentions the right path somewhere" is not "the on_disconnect citation states
// the right path". The check is now scoped to the WS-only //! section (derived the same way i3
// derives its own S/E bounds, duplicated locally rather than shared), requiring on_disconnect AND
// relPath to both appear, as backtick tokens, somewhere within that bounded section -- deliberately
// section-scoped rather than exact-line-scoped, so a future rewording that legitimately splits the
// function mention and the file path across two adjacent //! lines of one sentence does not
// FALSE-RED. TWO fragilities remain, disclosed rather than fixed: (a) this is still a substring/token
// scope, not a parser -- a decoy INSIDE the section that also happens to backtick-wrap the exact
// derived path string for an unrelated reason would satisfy it; the section is narrow enough (14
// lines, one topic) that this is judged acceptable residual risk, not closed. (b) requiring the
// BACKTICKED form is a STYLE requirement, not a truth requirement: a future rewording that correctly
// names the file but without backticks (e.g. plain prose "...on_disconnect, defined in
// server-module/src/lib.rs, resolves...") would hard-FALSE-RED i2 even though the claim is true. The
// live citation is backtick-wrapped today, so this does not bite now, but the next author touching
// this section should know a stylistic reformat -- not just a factual error -- can red this arm. i5
// reads only
// `.github/workflows/ci.yml` and `.github/workflows/
// nightly.yml` -- exactly the two files AGENTS.md's sentence names -- so a `Pin spacetime` step
// living in some THIRD workflow file is invisible to this gate; that does not falsify the shipped
// sentence (which is explicitly scoped to those two files), but the scope is worth stating plainly.
// After merge, the STALE-CITATION CLASS -- every unaudited `<file>:<line>` pointer in comments/docs
// across the repo -- stays entirely ungated in `just ci`: ADR-0224 bars a new eval, and this
// harness-side script runs only on demand (from `mr-gates check` or by hand), never inside CI. That
// is the declared residual R-18rb-NOGATE. This slice's gate closes four specific, named instances of
// the class; it does not close the class itself.
//
// ARM SHAPE: `node 18r-b.gates.mjs <worktree-abs-path> <i1|i2|i3|i4|i5|b1>`. i1..i5 print
// `<ARM> OK {...derived...}` and exit 0 on pass, or a line starting `<ARM> FAIL ...` and exit 1 on
// the FIRST failing check (fail-fast, not an aggregate report). b1 runs all five in that order --
// the first arm to fail aborts the whole run with THAT arm's own FAIL line -- and only once all
// five pass does it print the line beginning `B1 CITATION TRUTH OK` that the ledger's EXPECT: is
// pinned to.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const WORKTREE = process.argv[2];
const ARM = process.argv[3];
if (WORKTREE === undefined || ARM === undefined) {
  console.log('usage: 18r-b.gates.mjs <worktree> <i1|i2|i3|i4|i5|b1>');
  process.exit(2);
}

function fail(line) {
  console.log(line);
  process.exit(1);
}

function readText(rel) {
  const p = path.join(WORKTREE, rel);
  if (!existsSync(p)) fail(`FAIL missing-file ${rel}`);
  return readFileSync(p, 'utf8');
}

function readLines(rel) {
  return readText(rel).split('\n');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Heuristic trailing same-line comment strip (V1 fix): drops everything from the first "//" that is
// NOT immediately preceded by ":" (protects a "://" scheme like https:// or ws:// from being read as
// a comment start) to end of line. NOT a parser -- see the header's "does NOT prove" paragraph for
// the residual under-count risk this heuristic carries.
function stripTrailingComment(line) {
  const idx = line.search(/(?<!:)\/\//);
  return idx === -1 ? line : line.slice(0, idx);
}

// Recursively collect every `.rs` file under `server-module/src`, returning repo-relative,
// forward-slash paths (matches the spelling citations use, regardless of host OS).
function walkRustFiles(dir, baseDir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'target') continue;
      out.push(...walkRustFiles(full, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      out.push(path.relative(baseDir, full).split(path.sep).join('/'));
    }
  }
  return out;
}

// Fix #4 (coordinator-measured bypass): DERIVE which file actually declares `pub fn on_disconnect(`
// by searching the whole `server-module/src/**.rs` tree, rather than hardcoding `lib.rs` -- a driver
// citation re-pointed at a plausible-but-wrong file (e.g. `server-module/src/trades.rs`) must have
// something to disagree WITH.
function findOnDisconnectDecl(label) {
  const srcDir = path.join(WORKTREE, 'server-module', 'src');
  const files = walkRustFiles(srcDir, WORKTREE);
  const hits = [];
  for (const relPath of files) {
    const lines = readLines(relPath);
    lines.forEach((l, idx) => {
      if (/^pub fn on_disconnect\(/.test(l)) hits.push({ relPath, line: idx + 1 });
    });
  }
  if (hits.length !== 1) {
    fail(`${label} FAIL "pub fn on_disconnect(" declared in ${hits.length} server-module/src/**.rs location(s), want exactly 1: ${JSON.stringify(hits)}`);
  }
  return hits[0];
}

// ---------------------------------------------------------------------------------------------
// i1 -- ADR-0231's claim about client/src/main.ts
// ---------------------------------------------------------------------------------------------
function armI1() {
  const mainLines = readLines('client/src/main.ts');
  // Fix #3 (round 2, coordinator-measured bypass): count regex OCCURRENCES, not matching LINES -- a
  // second `store.ownAccount(` read appended to the SAME line as the real one used to sail through a
  // per-line push.
  // Fix V1 (round 3, verifier-measured bypass): a whole-line "does this line START with `//`" test
  // never strips a TRAILING same-line comment, so a decoy comment repeating `store.ownAccount(...)`
  // after a real `//` on an otherwise-live line was counted as the occurrence while the real call was
  // gone. Every line is now reduced to its LIVE (comment-stripped) text via `stripTrailingComment`
  // before the occurrence scan -- this also subsumes the old whole-line-comment filter, since a pure
  // comment line strips down to (at most) leading whitespace and contributes no matches either way.
  const occurrenceRe = /store\.ownAccount\(/g;
  const liveLines = mainLines.map(stripTrailingComment);
  const occurrences = [];
  liveLines.forEach((stripped, idx) => {
    for (const _m of stripped.matchAll(occurrenceRe)) occurrences.push(idx + 1);
  });
  if (occurrences.length !== 1) {
    fail(`I1 FAIL ownAccount-live-occurrences=${occurrences.length} (want exactly 1) at lines [${occurrences.join(',')}]`);
  }
  const N = occurrences[0];
  const liveLineText = liveLines[N - 1];
  // The chained read must be ONLY claimedFrom, on the SAME physical line as the call, tested against
  // the LIVE (comment-stripped) text so a trailing decoy comment cannot satisfy this either --
  // catches a split-variable mutant (`const acc = store.ownAccount(id); other(acc?.secretField)`)
  // that a "within N lines" proximity check would miss.
  if (!/store\.ownAccount\([^)]*\)\s*\?\.\s*claimedFrom/.test(liveLineText)) {
    fail(`I1 FAIL main.ts:${N} does not chain a same-line "?.claimedFrom" read off store.ownAccount(...) in its LIVE text: ${JSON.stringify(liveLineText.trim())}`);
  }
  const terminalHits = mainLines.filter((l) => /\bterminalAtMs\b/.test(l)).length;
  if (terminalHits !== 0) {
    fail(`I1 FAIL main.ts contains terminalAtMs ${terminalHits} time(s), want 0 (checked regardless of ADR wording per ruling R6)`);
  }

  const adrText = readText('docs/adr/0231-client-privacy-cores-request-wide-chunk-assembly.md');
  const consIdx = adrText.indexOf('## Consequences');
  if (consIdx === -1) fail('I1 FAIL ADR-0231 has no "## Consequences" heading');
  const nextHeadingIdx = adrText.indexOf('\n## ', consIdx + '## Consequences'.length);
  const consSection = nextHeadingIdx === -1 ? adrText.slice(consIdx) : adrText.slice(consIdx, nextHeadingIdx);

  // Isolate bullets by their own "- **" markers (start of line only), so the section splits into
  // one string per bullet regardless of how many wrapped lines each carries.
  const marker = '- **';
  const starts = [];
  for (let i = consSection.indexOf(marker); i !== -1; i = consSection.indexOf(marker, i + 1)) {
    if (i === 0 || consSection[i - 1] === '\n') starts.push(i);
  }
  const bullets = starts.map((s, i) => consSection.slice(s, i + 1 < starts.length ? starts[i + 1] : consSection.length));
  const hitBullets = bullets.filter((b) => b.includes('terminalAtMs'));
  if (hitBullets.length !== 1) {
    fail(`I1 FAIL Consequences bullets mentioning terminalAtMs=${hitBullets.length}, want exactly 1`);
  }
  const bullet = hitBullets[0];
  const hints = [...bullet.matchAll(/main\.ts:(\d+)/g)];
  if (hints.length !== 1) {
    fail(`I1 FAIL the terminalAtMs bullet has ${hints.length} "main.ts:<N>" hint(s), want exactly 1`);
  }
  const hintN = Number(hints[0][1]);
  const allColonNum = [...bullet.matchAll(/:\d+/g)];
  if (allColonNum.length !== 1) {
    fail(`I1 FAIL the terminalAtMs bullet carries ${allColonNum.length} ":<digits>" fragment(s) total, want exactly 1 (the main.ts hint, no other line-hint)`);
  }
  if (hintN !== N) {
    fail(`I1 FAIL ADR-0231's hint is main.ts:${hintN} but the derived LIVE (comment-stripped) store.ownAccount( occurrence is main.ts:${N}`);
  }
  return { N, occurrences: occurrences.length, terminalHits, hintN };
}

// ---------------------------------------------------------------------------------------------
// i2 -- the driver's claim about the module that declares on_disconnect
// ---------------------------------------------------------------------------------------------
function armI2() {
  const decl = findOnDisconnectDecl('I2');
  const { relPath, line: M } = decl;
  const libLines = readLines(relPath);

  let precedingIdx = M - 2; // 0-based index of the line immediately above line M
  while (precedingIdx >= 0) {
    const t = libLines[precedingIdx].trim();
    if (t === '' || t.startsWith('///') || t.startsWith('//!')) {
      precedingIdx -= 1;
      continue;
    }
    break;
  }
  const precedingLine = precedingIdx >= 0 ? libLines[precedingIdx].trim() : '';
  if (precedingLine !== '#[spacetimedb::reducer(client_disconnected)]') {
    fail(`I2 FAIL nearest preceding non-blank/non-doc-comment line above ${relPath}:${M} is ${JSON.stringify(precedingLine)}, want "#[spacetimedb::reducer(client_disconnected)]"`);
  }

  let closeIdx = -1;
  for (let i = M - 1; i < libLines.length; i++) {
    if (/^}/.test(libLines[i])) {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) fail(`I2 FAIL no column-0 "}" found closing on_disconnect starting at ${relPath}:${M}`);

  // Fix #1 (coordinator-measured bypass): a raw substring test over the body text passed on a
  // mutant that COMMENTED OUT the whole deletion block (the needles were still textually present,
  // just inside `//` comments). Strip `//`-suffix comment content line-by-line before testing --
  // a heuristic (no block-comment/string-literal awareness, documented at the top of this file),
  // but sufficient to distinguish live code from a commented-out line.
  const codeOnlyLines = libLines.slice(M - 1, closeIdx + 1).map((l) => l.replace(/\/\/.*$/, ''));
  const codeOnlyBody = codeOnlyLines.join('\n');
  if (!codeOnlyBody.includes('.player().identity().delete(')) {
    fail(`I2 FAIL on_disconnect's LIVE (comment-stripped) body (${relPath}:${M}-${closeIdx + 1}) does not delete the player row via .player().identity().delete(`);
  }
  if (!codeOnlyBody.includes('.character().entity_id().delete(')) {
    fail(`I2 FAIL on_disconnect's LIVE (comment-stripped) body (${relPath}:${M}-${closeIdx + 1}) does not delete the character row via .character().entity_id().delete(`);
  }

  const driverLines = readLines('sim-harness/src/bin/mr_load_driver.rs');
  const docLines = driverLines.filter((l) => l.trim().startsWith('//!'));
  const mentionsFn = docLines.some((l) => l.includes('on_disconnect'));
  if (!mentionsFn) {
    fail('I2 FAIL mr_load_driver.rs //! module doc never mentions on_disconnect');
  }
  // Fix #4 (round 2, coordinator-measured bypass): the driver must cite the file that ACTUALLY
  // declares on_disconnect, derived above -- not a hardcoded "lib.rs" string a re-pointed citation
  // could silently outlive.
  // Fix V2 (round 3, verifier-measured bypass): a bare `.includes(relPath)` is an unanchored
  // substring test, so a decoy path that merely CONTAINS the real one (`xserver-module/src/lib.rs`)
  // passed.
  // Fix round 4 (verifier-measured bypass): round 3's boundary-anchored regex had ASYMMETRIC
  // lookarounds (lookahead omitted `.`/`/`), so a SUFFIX decoy (`lib.rs.orig`) still matched.
  // Switched to an EQUALITY test over extracted backtick-delimited tokens -- no boundary class left
  // to get wrong.
  // Fix round 5 (verifier-measured bypass): the round-4 equality test had no LINE/SECTION SCOPING --
  // `backtickTokens` flattened every `//!` line in the whole 188-line file into one array, so a
  // decoy sentence far away (e.g. the module header at line 1, "Historical audit note:
  // `server-module/src/lib.rs` was reviewed previously.") satisfied "relPath appears somewhere",
  // while the REAL on_disconnect citation (line 80, inside the "# Why WebSocket only (AM25)"
  // section that ADR-0232:51 cites as its live-verified evidence) was independently changed to a
  // wrong-but-real file (`server-module/src/trading.rs`) and nothing caught it. "The file mentions
  // the right path somewhere" is not the same claim as "the on_disconnect citation states the right
  // path", and only the latter is what ADR-0232 actually leans on.
  //
  // SCOPE CHOICE: the WS-only //! SECTION (derived below, mirroring i3's own S/E derivation), not a
  // strict single-line rule. A same-line-only requirement would FALSE-RED a future, still-true
  // rewording that legitimately splits the on_disconnect mention and the file path across two
  // adjacent //! lines of the same sentence (the way this very citation currently wraps across
  // driver.rs:80-81). The section is exactly where ADR-0232 says the evidence lives, so requiring
  // BOTH the on_disconnect mention AND relPath, as backtick tokens, to co-occur somewhere WITHIN
  // that bounded section is the tightest scope that stays robust to reasonable rewording -- strictly
  // narrower than the whole-file scope round 5 broke, and not fragile to line-wrapping the way an
  // exact-line rule would be.
  const wsHeadingHits = [];
  driverLines.forEach((l, idx) => {
    if (/^\/\/!\s+# Why WebSocket only/.test(l)) wsHeadingHits.push(idx + 1);
  });
  if (wsHeadingHits.length !== 1) {
    fail(`I2 FAIL "# Why WebSocket only" //! heading count=${wsHeadingHits.length}, want exactly 1 (needed to scope the on_disconnect citation check)`);
  }
  const wsS = wsHeadingHits[0];
  let wsNextHeadingLine = -1;
  for (let i = wsS; i < driverLines.length; i++) {
    if (/^\/\/!\s+# /.test(driverLines[i])) {
      wsNextHeadingLine = i + 1;
      break;
    }
  }
  if (wsNextHeadingLine === -1) {
    fail(`I2 FAIL no //! heading found after driver.rs:${wsS} to bound the on_disconnect section`);
  }
  let wsE = -1;
  for (let ln = wsNextHeadingLine - 1; ln > wsS; ln--) {
    if (driverLines[ln - 1].trim() !== '//!') {
      wsE = ln;
      break;
    }
  }
  if (wsE === -1) {
    fail(`I2 FAIL could not find a non-blank //! content line between driver.rs:${wsS} and :${wsNextHeadingLine}`);
  }
  const sectionLines = driverLines.slice(wsS - 1, wsE); // 1-based [wsS, wsE] inclusive
  const sectionMentionsFn = sectionLines.some((l) => l.includes('on_disconnect'));
  if (!sectionMentionsFn) {
    fail(`I2 FAIL the //! section driver.rs:${wsS}-${wsE} (the section ADR-0232 cites as its live-verified evidence) never mentions on_disconnect`);
  }
  const sectionBacktickTokens = [];
  for (const l of sectionLines) {
    for (const m of l.matchAll(/`([^`]+)`/g)) sectionBacktickTokens.push(m[1]);
  }
  const mentionsCorrectFile = sectionBacktickTokens.includes(relPath);
  if (!mentionsCorrectFile) {
    fail(`I2 FAIL the //! section driver.rs:${wsS}-${wsE} (where on_disconnect is discussed) does not contain the derived on_disconnect file "${relPath}" as a backtick-delimited token EXACTLY -- in-section tokens seen: ${JSON.stringify(sectionBacktickTokens)}`);
  }
  // Zero line-number citations into ANY server-module/src/*.rs file survive (D2: function-name-only,
  // no line number, so the citation cannot go stale on a delayed re-line the way a number would).
  // Deliberately whole-file scope (not section-scoped): this ban should hold everywhere, not just
  // near the on_disconnect discussion.
  const staleCites = docLines.filter((l) => /server-module\/src\/\S*\.rs:\d/.test(l));
  if (staleCites.length !== 0) {
    fail(`I2 FAIL mr_load_driver.rs //! doc still carries ${staleCites.length} "server-module/src/<file>.rs:<digit>" line-cite(s): ${JSON.stringify(staleCites)}`);
  }
  return { relPath, M };
}

// ---------------------------------------------------------------------------------------------
// i3 -- ADR-0232's cited range into the driver must stay valid (hard constraint: driver-only edit
// must be line-count-neutral inside it, since ADR-0232 is outside this slice's touches:)
// ---------------------------------------------------------------------------------------------
function armI3() {
  const adr232 = readText('docs/adr/0232-m22-s9-post-integration-verification-injected-clock-e2e.md');
  const rangeMatches = [...adr232.matchAll(/sim-harness\/src\/bin\/mr_load_driver\.rs:(\d+)-(\d+)/g)];
  if (rangeMatches.length !== 1) {
    fail(`I3 FAIL ADR-0232 carries ${rangeMatches.length} "mr_load_driver.rs:<a>-<b>" citation(s), want exactly 1`);
  }
  const start = Number(rangeMatches[0][1]);
  const end = Number(rangeMatches[0][2]);

  const driverLines = readLines('sim-harness/src/bin/mr_load_driver.rs');
  const headingHits = [];
  driverLines.forEach((l, idx) => {
    if (/^\/\/!\s+# Why WebSocket only/.test(l)) headingHits.push(idx + 1);
  });
  if (headingHits.length !== 1) {
    fail(`I3 FAIL "# Why WebSocket only" //! heading count=${headingHits.length}, want exactly 1`);
  }
  const S = headingHits[0];

  let nextHeadingLine = -1;
  for (let i = S; i < driverLines.length; i++) {
    // i is the 0-based index of line S+1 on the first loop iteration
    if (/^\/\/!\s+# /.test(driverLines[i])) {
      nextHeadingLine = i + 1;
      break;
    }
  }
  if (nextHeadingLine === -1) {
    fail(`I3 FAIL no //! heading found after driver.rs:${S} to bound the section`);
  }

  // E = the LAST non-blank //! content line strictly before the next heading (ruling R3): a
  // trailing blank "//!" line sits just above the next heading, so "next-heading - 1" false-REDs.
  let E = -1;
  for (let ln = nextHeadingLine - 1; ln > S; ln--) {
    if (driverLines[ln - 1].trim() !== '//!') {
      E = ln;
      break;
    }
  }
  if (E === -1) {
    fail(`I3 FAIL could not find a non-blank //! content line between driver.rs:${S} and :${nextHeadingLine}`);
  }

  if (S !== start || E !== end) {
    fail(`I3 FAIL ADR-0232 cites mr_load_driver.rs:${start}-${end} but the live //! section spans ${S}-${E}`);
  }

  // Ruling R2 -- the load-bearing addition: the range equality alone is vacuous against a content
  // swap that preserves the line count. Byte-compare the frozen flanks (S..S+1 and S+6..E, i.e.
  // 76-77 and 82-89 today) against the pre-edit origin/master blob; only the S+2..S+5 window
  // (78-81 today) may differ.
  let baseline;
  try {
    baseline = execFileSync(
      'git',
      ['-C', WORKTREE, 'show', 'origin/master:sim-harness/src/bin/mr_load_driver.rs'],
      { encoding: 'utf8' },
    );
  } catch (e) {
    fail(`I3 FAIL could not read origin/master:sim-harness/src/bin/mr_load_driver.rs (${e.message})`);
  }
  const baseLines = baseline.split('\n');
  const frozenRanges = [
    [S, S + 1],
    [S + 6, E],
  ];
  let frozenTotal = 0;
  let frozenOk = 0;
  const mismatches = [];
  for (const [lo, hi] of frozenRanges) {
    for (let ln = lo; ln <= hi; ln++) {
      frozenTotal += 1;
      const live = driverLines[ln - 1];
      const base = baseLines[ln - 1];
      if (live === base) {
        frozenOk += 1;
      } else {
        mismatches.push(ln);
      }
    }
  }
  if (frozenOk !== frozenTotal) {
    fail(`I3 FAIL byte-identity leg: ${frozenOk}/${frozenTotal} frozen lines (driver.rs:${S}-${S + 1},${S + 6}-${E}) match origin/master; mismatched lines: [${mismatches.join(',')}] -- a content swap inside ADR-0232's cited range`);
  }
  return { S, E, frozenOk, frozenTotal };
}

// ---------------------------------------------------------------------------------------------
// i4 -- ARCHITECTURE.md
// ---------------------------------------------------------------------------------------------
function armI4() {
  const archText = readText('ARCHITECTURE.md'); // HTML comments: none of this file's checked
  // region uses them for the pinned markers below, so no comment-stripping pass is needed here.
  const markerRe = /\*\*rb-(\d+)\*\*/g;
  const markers = [...archText.matchAll(markerRe)].map((m) => ({ num: m[1], index: m.index }));

  const rb2 = markers.filter((m) => m.num === '2').length;
  if (rb2 !== 1) {
    fail(`I4 FAIL **rb-2** occurs ${rb2} time(s), want exactly 1 (protects evals/rekey-contract-surface.eval.mjs T4/arch, which keys its slice boundary off NEXT_RB_MARKER)`);
  }
  const rb3 = markers.filter((m) => m.num === '3').length;
  if (rb3 !== 1) {
    fail(`I4 FAIL **rb-3** occurs ${rb3} time(s), want exactly 1 (protects evals/rekey-contract-surface.eval.mjs T4/arch)`);
  }

  const rb39s = markers.filter((m) => m.num === '39');
  if (rb39s.length !== 1) {
    fail(`I4 FAIL **rb-39** occurs ${rb39s.length} time(s), want exactly 1`);
  }
  const idx39 = rb39s[0].index;
  const later = markers.filter((m) => m.index > idx39).sort((a, b) => a.index - b.index);
  const nextIdx = later.length > 0 ? later[0].index : archText.length;
  const rb39Slice = archText.slice(idx39, nextIdx);

  if (!rb39Slice.includes('ADR-0234')) {
    fail('I4 FAIL the rb-39 slice does not name ADR-0234');
  }
  const adrDir = path.join(WORKTREE, 'docs', 'adr');
  const adrFiles = readdirSync(adrDir);
  const adr0234Files = adrFiles.filter((f) => /^0234-.*\.md$/.test(f));
  if (adr0234Files.length !== 1) {
    fail(`I4 FAIL docs/adr/0234-*.md glob found ${adr0234Files.length} file(s), want exactly 1`);
  }
  const adr0234Text = readFileSync(path.join(adrDir, adr0234Files[0]), 'utf8');
  const sliceHeaderMatch = adr0234Text.match(/^\*\*Slice:\*\*.*$/m);
  if (sliceHeaderMatch === null) {
    fail('I4 FAIL docs/adr/0234-*.md has no "**Slice:**" header line');
  }
  // Anchored capture (ruling R3): the header reads "... rb-39 (residual R-rb-22-EO-11, ...)" --
  // an "up to the next comma" capture would drag the trailing comma in.
  const residualMatch = sliceHeaderMatch[0].match(/\bR-[A-Za-z0-9-]+/);
  if (residualMatch === null) {
    fail(`I4 FAIL could not parse an "R-<id>" residual id out of ADR-0234's **Slice:** header: ${JSON.stringify(sliceHeaderMatch[0])}`);
  }
  const residualId = residualMatch[0];
  // Fix #2 (coordinator-measured bypass): a bare `.includes(residualId)` passes for a LONGER id
  // that merely starts with residualId (e.g. "R-rb-22-EO-110" contains "R-rb-22-EO-11"). Require a
  // TERMINATED match: neither the character before nor the character after the matched id may be
  // an id-shaped character ([A-Za-z0-9-]), so a superset id cannot ride through as a substring.
  const idBoundaryRe = new RegExp(`(?<![A-Za-z0-9-])${escapeRegExp(residualId)}(?![A-Za-z0-9-])`);
  if (!idBoundaryRe.test(rb39Slice)) {
    fail(`I4 FAIL the rb-39 slice does not contain the residual id ${residualId} as a TERMINATED token (parsed from ADR-0234's own header) -- a longer id merely starting with it does not count`);
  }

  const rb39NextFreeMatches = [...rb39Slice.matchAll(/ADR next-free = (\d{4})/g)];
  if (rb39NextFreeMatches.length !== 1) {
    fail(`I4 FAIL rb-39 slice has ${rb39NextFreeMatches.length} "ADR next-free = NNNN" occurrence(s), want exactly 1`);
  }
  const rb39NextFree = Number(rb39NextFreeMatches[0][1]);
  if (rb39NextFree !== 235) {
    fail(`I4 FAIL rb-39's own "ADR next-free" = ${rb39NextFree}, want 235 (ADR-0234 + 1)`);
  }

  // Ruling R4 -- the property this slice actually relies on to justify leaving the four historical
  // (stale) "= 0234" entries alone: a reader taking the file's TERMINAL "ADR next-free" pointer
  // gets the currently-correct number. Subsumes a plain indexOf(rb-39) < indexOf(rb-40) pin.
  const allNextFree = [...archText.matchAll(/ADR next-free = (\d{4})/g)];
  if (allNextFree.length === 0) {
    fail('I4 FAIL no "ADR next-free = NNNN" occurrences found anywhere in ARCHITECTURE.md');
  }
  const terminalNextFree = Number(allNextFree[allNextFree.length - 1][1]);
  const adrNums = adrFiles
    .map((f) => f.match(/^(\d{4})-.*\.md$/))
    .filter((m) => m !== null)
    .map((m) => Number(m[1]));
  if (adrNums.length === 0) fail('I4 FAIL docs/adr/ has no NNNN-*.md files to derive max() from');
  const maxAdr = Math.max(...adrNums);
  if (terminalNextFree !== maxAdr + 1) {
    fail(`I4 FAIL the LAST "ADR next-free" in the file = ${terminalNextFree}, but max(docs/adr NNNN)+1 = ${maxAdr + 1} (a terminal append of the rb-39 entry after rb-40 would trip exactly this)`);
  }

  return { rb2, rb3, residualId, rb39NextFree, terminalNextFree, maxAdr };
}

// ---------------------------------------------------------------------------------------------
// i5 -- AGENTS.md's pin count (SCOPED to .github/workflows/{ci,nightly}.yml -- see header)
// ---------------------------------------------------------------------------------------------
const WORD_MAP = { 3: 'three', 4: 'four', 5: 'five' };

function collectPins(rel) {
  const lines = readLines(rel);
  const pins = [];
  lines.forEach((l, idx) => {
    const m = l.match(/^\s*-\s*name:\s*Pin spacetime\s+(\S+)/);
    if (m) pins.push({ line: idx + 1, version: m[1] });
  });
  return { lines, pins };
}

function armI5() {
  const ci = collectPins('.github/workflows/ci.yml');
  const nightly = collectPins('.github/workflows/nightly.yml');
  const allPins = [
    ...ci.pins.map((p) => ({ ...p, file: 'ci.yml', lines: ci.lines })),
    ...nightly.pins.map((p) => ({ ...p, file: 'nightly.yml', lines: nightly.lines })),
  ];
  const P = allPins.length;
  if (WORD_MAP[P] === undefined) {
    fail(`I5 FAIL derived "Pin spacetime" step count=${P} has no entry in the {3,4,5} word map -- a real count change, update the map deliberately rather than the gate silently coping`);
  }
  const versions = [...new Set(allPins.map((p) => p.version))];
  if (versions.length !== 1) {
    fail(`I5 FAIL "Pin spacetime <V>" steps disagree on V: ${JSON.stringify(versions)}`);
  }
  const V = versions[0];

  for (const p of allPins) {
    // Window is the 3 lines AFTER the "- name: Pin spacetime V" line (ruling R5: measured distance
    // is 2; a 5-line window would accept a version leaking in from an adjacent step).
    const window = p.lines.slice(p.line, p.line + 3).join('\n');
    if (!window.includes(`spacetime version install ${V}`) || !window.includes(`spacetime version use ${V}`)) {
      fail(`I5 FAIL ${p.file}:${p.line} "Pin spacetime ${p.version}" is not followed within 3 lines by both "version install ${V}" and "version use ${V}"`);
    }
  }

  const agentsText = readText('AGENTS.md');
  const bulletMarker = '- **SpacetimeDB versions';
  const bIdx = agentsText.indexOf(bulletMarker);
  if (bIdx === -1) fail('I5 FAIL AGENTS.md has no "- **SpacetimeDB versions" bullet');
  const nextBulletIdx = agentsText.indexOf('\n- **', bIdx + 1);
  const nextHeadingIdx = agentsText.indexOf('\n## ', bIdx + 1);
  const candidates = [nextBulletIdx, nextHeadingIdx].filter((i) => i !== -1);
  const endIdx = candidates.length > 0 ? Math.min(...candidates) : agentsText.length;
  const bullet = agentsText.slice(bIdx, endIdx);

  const word = WORD_MAP[P];
  const wantPhrase = `in ${word} places`;
  if (!bullet.includes(wantPhrase)) {
    fail(`I5 FAIL AGENTS.md's SpacetimeDB-versions bullet lacks "${wantPhrase}" (derived pin count P=${P}: ci.yml=${ci.pins.length}, nightly.yml=${nightly.pins.length})`);
  }
  if (!bullet.includes(`**${V}**`)) {
    fail(`I5 FAIL AGENTS.md's SpacetimeDB-versions bullet lacks the bolded version "**${V}**"`);
  }
  for (const k of Object.keys(WORD_MAP)) {
    if (Number(k) === P) continue;
    const otherPhrase = `in ${WORD_MAP[k]} places`;
    if (bullet.includes(otherPhrase)) {
      fail(`I5 FAIL AGENTS.md's SpacetimeDB-versions bullet ALSO contains "${otherPhrase}" -- stale wording for a wrong count left behind`);
    }
  }
  return { P, V, ci: ci.pins.length, nightly: nightly.pins.length, word };
}

// ---------------------------------------------------------------------------------------------
// b1 -- composite: all five arms, then the ledger's EXPECT line
// ---------------------------------------------------------------------------------------------
function armB1() {
  const r1 = armI1();
  const r2 = armI2();
  const r3 = armI3();
  const r4 = armI4();
  const r5 = armI5();
  console.log(
    `B1 CITATION TRUTH OK ownAccount-site=${r1.N} occurrences=${r1.occurrences} terminalAtMs=${r1.terminalHits} adr0231-hint=${r1.hintN} ` +
      `on_disconnect=${r2.relPath}:${r2.M} client_disconnected=yes driver-linecites=0 driver-cites-correct-file=yes ws-section=${r3.S}-${r3.E}==adr0232 ` +
      `frozen-lines=${r3.frozenOk}/${r3.frozenTotal} rb2=${r4.rb2} rb3=${r4.rb3} rb39=1 adr0234=${r4.residualId} ` +
      `rb39-nextfree=0${r4.rb39NextFree} terminal-nextfree=0${r4.terminalNextFree}==max(0${r4.maxAdr})+1 ` +
      `pins=${r5.P}(ci=${r5.ci},nightly=${r5.nightly}) ver=${r5.V} word=${r5.word}`,
  );
}

const ARMS = { i1: armI1, i2: armI2, i3: armI3, i4: armI4, i5: armI5, b1: armB1 };
const runner = ARMS[ARM];
if (runner === undefined) fail(`FAIL unknown-arm ${ARM} (want one of i1 i2 i3 i4 i5 b1)`);
if (ARM === 'b1') {
  runner();
} else {
  const r = runner();
  console.log(`${ARM.toUpperCase()} OK ${JSON.stringify(r)}`);
}
