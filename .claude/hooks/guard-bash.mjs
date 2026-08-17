#!/usr/bin/env node
// PreToolUse guard (cross-platform; Node is a prerequisite). Blocks clearly
// destructive shell commands as defense-in-depth behind the permission deny-list.
// Reads the hook payload JSON on stdin; exit 2 blocks the tool call.
// Replaces the old bash-only guard-bash.sh (which would not run on Windows).
//
// lp-09 TDD RED PHASE (tester-authored — do not edit these fixtures to fit the
// implementation; a wrong expectation is corrected FROM THE SPEC, never
// retargeted to match the code). `node guard-bash.mjs --selftest` exercises the
// REAL hook process end to end via spawnSync and asserts EXIT CODES (2=blocked,
// 0=allowed) against the actual entry-point wiring, rather than importing and
// testing the `danger` regex array directly. A hook whose stdin-listener wiring
// silently breaks would still pass a unit test against the array while blocking
// nothing in production — which is exactly the failure class this guard exists
// to prevent for every session in this harness.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.argv[2] === "--selftest") {
  process.exit(runSelftest());
} else {
  let raw = "";
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    let cmd = "";
    try {
      cmd = JSON.parse(raw)?.tool_input?.command ?? "";
    } catch {
      /* not a Bash call / no input */
    }
    // Defense-in-depth: catch common flag spellings (-rf, -fr, -r -f, --recursive
    // / --force), not only the literal "rm -rf" the deny-list matches.
    const danger = [
      /\brm\s+-\w*r\w*f\w*/i, // rm -rf, -Rf, -rfv ...
      /\brm\s+-\w*f\w*r\w*/i, // rm -fr ...
      /\brm\s+-\w*r\w*\s+-\w*f/i, // rm -r -f
      /\brm\s+(-\w+\s+)*--recursive/i, // rm --recursive ...
      /\brm\s+-\w*r\w*\s+.*(\/|~|\*)/i, // rm -r <root/home/glob>
      // lp-git-workflow: a BARE force-push discards whatever the remote had, with no check that you
      // were looking at it. `--force-with-lease` refuses unless the remote is where you last saw it,
      // which is the safe primitive the squash-on-branch step needs — so it is allowed on a slice
      // branch and still refused against the base. Rewriting `main`/`master` stays blocked either way.
      // Anchored at command position (start, or after ; && || | & or a subshell paren) for the same
      // reason as the kill-switch rules below: an unanchored match blocks merely *writing about* the
      // command, which blocked this rule's own test harness. An over-firing guard gets switched off.
      /(^|[;&|(]\s*)git\s+push\b[^\n;&|]*\s(-f|--force)(?!-with-lease)\b/i,
      /(^|[;&|(]\s*)git\s+push\b[^\n;&|]*--force(-with-lease)?[^\n;&|]*\b(main|master)\b/i,
      /git\s+reset\s+--hard\s+origin/i,
      // lp-09: the supervisor kill switch. The tick only ever READS this flag — every clear came from
      // an LLM session running `rm`, which is why provenance had to be enforced somewhere the model
      // cannot route around. `mr-hold clear` is the sanctioned path and checks provenance; it does not
      // name the file, so it is unaffected. `mr-supervisor-enable` is the OPERATOR's clear and is
      // blocked here on purpose — the operator runs it in their own terminal, not through a session.
      //
      // These are anchored at COMMAND POSITION, not as bare substrings. The first version matched
      // anywhere and blocked merely *writing about* the kill switch — it blocked this slice's own
      // documentation and test scripts. An over-firing guard is worse than a narrow one: it gets
      // switched off, which is how decorative gates are born. This is defense-in-depth behind
      // `mr-hold`'s provenance check, NOT a sandbox — see the honest gap list below.
      //
      // COMMAND POSITION = start-of-string, start-of-LINE, or after `;` `&&` `||` `|` `&` `(`.
      // The newline and the leading-whitespace tolerance are load-bearing and were MISSING: the
      // original `(^|[;&|(]\s*)` required the verb at literal index 0 (these regexes carry no `m`
      // flag, so `^` is string-start only), so an entirely ordinary TWO-LINE Bash call —
      //     ls -la
      //     rm …/.native-supervisor-disabled
      // — matched nothing at all, and neither did a single leading space. Two independent review
      // lenses found that by execution. Widening the anchor can only ever block MORE, which is the
      // fail-safe direction for a spend control.
      /(^\s*|[;&|(\n]\s*)rm\s+[^\n;&|]*\.native-supervisor-disabled/i,
      /(^\s*|[;&|(\n]\s*)mv\s+[^\n;&|]*\.native-supervisor-disabled/i,
      /(^\s*|[;&|(\n]\s*)mr-supervisor-enable\b/i,
      // lp-09 residual: `rm` was never the only way through. Provenance lives in the file's
      // CONTENT, so a session could WRITE `by=supervisor` itself and then clear the hold through
      // the perfectly sanctioned `mr-hold clear --by supervisor` — forging past the fail-safe
      // without ever naming a blocked verb. No local secret closes that (the forger reads the same
      // filesystem), so the answer is to block the Bash write verbs against this one path too.
      // `touch` is listed for the OPPOSITE reason: a bare touch creates an UNATTRIBUTED hold, which
      // the fail-safe reads as OPERATOR and the loop may then never clear — a session could wedge
      // the loop permanently by accident. Sessions set holds via `mr-hold set --by supervisor`,
      // which records provenance and stays self-clearable. Reads (`cat`/`stat`/`ls`) are untouched.
      // An optional `env`/`sudo`/`command`/`nohup`/`time`/`exec` wrapper is tolerated — those are
      // one-token prefixes an agent reaches for casually, so leaving them out would have been a
      // free bypass of the whole verb list.
      //
      // KNOWN, UNCLOSED GAPS — enumerated because a control you misread is worse than no control.
      // ALL of these reach the flag and are NOT blocked, each pinned by a known-gap `--selftest`
      // fixture so the list cannot quietly diverge from the code:
      //   · `Write`/`Edit` tools — settings.json wires this hook to the Bash tool ONLY (needs a
      //     settings.json matcher, outside this slice's declared touches; filed as a follow-up)
      //   · indirection the pattern cannot see through: `bash -c '…'`, `xargs rm`,
      //     `find -exec rm {} \;`, `F=…; rm "$F"`, `python3 -c "os.remove(...)"`
      //   · a glob instead of the literal name (`rm …/.native*`), and `git clean -fdx`
      //     (the flag is gitignored)
      // The primary control is and remains `mr-hold`'s provenance check. This hook raises the cost
      // of the CASUAL routes — the ones an agent takes without meaning to defeat anything.
      /(^\s*|[;&|(\n]\s*)((env|sudo|command|nohup|time|exec)\s+)?(tee|sed|chmod|truncate|cp|ln|unlink|touch|dd|install|rsync|shred)\s+[^\n;&|]*\.native-supervisor-disabled/i,
      />>?\s*[^\n;&|]*\.native-supervisor-disabled/i, // any redirect ONTO the flag forges provenance
      /\bdrop\s+database\b/i,
      /\btruncate\s+table\b/i,
    ];
    if (danger.some((re) => re.test(cmd))) {
      console.error("guard: blocked a potentially destructive command. Get explicit human approval.");
      process.exit(2); // 2 = block in Claude Code PreToolUse
    }
    process.exit(0);
  });
}

// ==========================================================================================
// SELFTEST — tester-authored, lp-09. Spawns the REAL hook process per fixture; asserts exit
// code only. In --selftest mode we never reach the branch above that attaches the stdin
// listener, so this can never hang.
// ==========================================================================================
function runFixture(cmd) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    input: JSON.stringify({ tool_input: { command: cmd } }),
    encoding: "utf8",
    timeout: 10_000,
  });
  return r.status; // 2 = blocked, 0 = allowed
}

function runSelftest() {
  let bad = 0;
  const results = [];
  function check(name, cmd, expectBlocked) {
    const status = runFixture(cmd);
    const blocked = status === 2;
    const ok = blocked === expectBlocked;
    results.push([name, ok, status, expectBlocked]);
    if (!ok) bad = 1;
  }

  // --- must-BLOCK, ALREADY PASSING (regression pins — the implementer's edits to `danger`
  // must never silently drop one of these) ---
  check("pin: rm -rf", "rm -rf /tmp/x", true);
  check("pin: git push --force origin main", "git push --force origin main", true);
  check("pin: git reset --hard origin/main", "git reset --hard origin/main", true);
  check("pin: drop database", "drop database foo", true);
  check("pin: rm $MEM/.native-supervisor-disabled", "rm $MEM/.native-supervisor-disabled", true);
  check("pin: rm -f quoted flag path", 'rm -f "/path/.native-supervisor-disabled"', true);
  check("pin: cd && rm flag", "cd /x && rm .native-supervisor-disabled", true);
  check("pin: mv flag to /tmp", "mv .native-supervisor-disabled /tmp/", true);
  check("pin: bare mr-supervisor-enable", "mr-supervisor-enable", true);
  check("pin: true && mr-supervisor-enable", "true && mr-supervisor-enable", true);

  // --- must-BLOCK, CURRENTLY RED. Without write-verb rules a session can FORGE
  // provenance with a plain redirect/tee/sed/chmod/truncate/cp/unlink/symlink onto the
  // flag and then walk straight through the SANCTIONED `mr-hold clear --by supervisor`
  // path — mr-hold only trusts what is ON DISK, so forging the file defeats the whole
  // provenance design. The implementer must add these; the tester (this file's fixtures)
  // must not be edited to make them pass some other way.
  check("RED: printf > flag (forge provenance)", "printf 'by=supervisor\\n' > /p/.native-supervisor-disabled", true);
  check("RED: echo >> flag (forge provenance)", "echo by=supervisor >> /p/.native-supervisor-disabled", true);
  check("RED: tee flag", "echo x | tee /p/.native-supervisor-disabled", true);
  check("RED: sed -i flag", "sed -i '1i by=supervisor' /p/.native-supervisor-disabled", true);
  check("RED: chmod flag", "chmod 644 /p/.native-supervisor-disabled", true);
  check("RED: truncate flag", "truncate -s 0 /p/.native-supervisor-disabled", true);
  check("RED: cp onto flag", "cp /tmp/forged /p/.native-supervisor-disabled", true);
  check("RED: unlink flag", "unlink /p/.native-supervisor-disabled", true);
  check("RED: ln -sf onto flag", "ln -sf /dev/null /p/.native-supervisor-disabled", true);

  // --- must-NOT-block. A guard that blocks everything trivially passes a must-block-only
  // suite, so these pin the opposite direction. ---
  check("allow: mr-hold clear --by supervisor (THE sanctioned path — must never be blocked)",
    "mr-hold clear --by supervisor", false);
  check("allow: mr-hold status --json", "mr-hold status --json", false);
  check("allow: mr-hold set --by supervisor --reason x", "mr-hold set --by supervisor --reason x", false);
  check("allow: cat flag", "cat /p/.native-supervisor-disabled", false);
  check("allow: stat flag", "stat -c %s /p/.native-supervisor-disabled", false);
  check("allow: ls -la", "ls -la /p/", false);
  check("allow: git push --force-with-lease (lp-git-workflow carve-out)",
    "git push --force-with-lease origin lp-09", false);
  check("allow: git status", "git status", false);

  // --- KNOWN-GAP: asserted NOT blocked, on purpose. The guard is defence-in-depth behind
  // mr-hold's own provenance fail-safe (absent/garbage provenance defaults to OPERATOR and
  // is never auto-cleared) — it is not a sandbox. These are an honest record of the gap,
  // not oversights; do not "fix" them without first checking the fix doesn't just move the
  // hole (e.g. narrowing the glob case still leaves other globs; see the KNOWN-GAP list in
  // M-loop-infrastructure.spec.md's lp-09 section).
  check("KNOWN-GAP: rm /p/.native* (glob defeats the literal-name match)", "rm /p/.native*", false);
  // Indirection the adjacency pattern structurally cannot see through. Each is pinned so the
  // ADR's gap list and the code can never quietly disagree about what is actually covered.
  // --- ANCHOR-POSITION regressions. These were ALL allowed before the anchor was widened to
  // tolerate leading whitespace and a newline separator: `^` without the `m` flag is string-start
  // only, so an ordinary two-line Bash call slipped every flag rule. Found by two independent
  // review lenses, by execution. Each of these must stay BLOCKED.
  check("ANCHOR: leading space before rm", " rm /p/.native-supervisor-disabled", true);
  check("ANCHOR: leading tab before rm", "\trm /p/.native-supervisor-disabled", true);
  check("ANCHOR: newline-separated rm (two-line command, no `;`)",
    "ls -la\nrm /p/.native-supervisor-disabled", true);
  check("ANCHOR: newline-separated touch (would forge an unclearable OPERATOR hold)",
    "echo prep\ntouch /p/.native-supervisor-disabled", true);
  check("ANCHOR: newline-separated cp (forge provenance)",
    "echo prep\ncp /tmp/forged /p/.native-supervisor-disabled", true);
  check("ANCHOR: leading space before mr-supervisor-enable", " mr-supervisor-enable", true);
  check("VERB: env-prefixed chmod", "env chmod 644 /p/.native-supervisor-disabled", true);
  check("VERB: sudo-prefixed tee", "sudo tee /p/.native-supervisor-disabled", true);
  check("VERB: dd onto the flag", "dd if=/dev/zero of=/p/.native-supervisor-disabled bs=1 count=0", true);
  check("VERB: install onto the flag", "install -m 644 /tmp/forged /p/.native-supervisor-disabled", true);
  check("VERB: rsync onto the flag", "rsync /tmp/forged /p/.native-supervisor-disabled", true);
  check("VERB: shred the flag", "shred -u /p/.native-supervisor-disabled", true);

  check("KNOWN-GAP: bash -c wrapper", "bash -c 'rm /p/.native-supervisor-disabled'", false);
  check("KNOWN-GAP: xargs (filename is upstream of the verb)",
    "echo /p/.native-supervisor-disabled | xargs rm", false);
  check("KNOWN-GAP: find -exec", "find /p -name '.native-supervisor-disabled' -exec rm {} +", false);
  check("KNOWN-GAP: variable indirection", 'F=/p/.native-supervisor-disabled; rm "$F"', false);
  check("KNOWN-GAP: python3 os.remove() (guard pattern-matches shell verbs, not python calls)",
    "python3 -c \"import os;os.remove('/p/.native-supervisor-disabled')\"", false);
  check("KNOWN-GAP: git clean -fdx (the flag is gitignored, so this deletes it)", "git clean -fdx", false);

  // --- documented OVER-FIRE, asserted BLOCKED — and it MUST STAY that way. This read-only
  // grep is blocked today because the BRE alternation `\|` matches the kill-switch rule's
  // `[;&|(]` command-position anchor. A `(?<!\\)` lookbehind was PROPOSED to narrow the
  // anchor and was REJECTED: in bash, `\\|` is an escaped *backslash* followed by a REAL
  // pipe (verified: `bash -c 'true \\| echo X'` prints X), so the lookbehind would open a
  // genuine bypass (`true \\| rm …flag`). Keep this asserted BLOCKED so a future "fix" of
  // the over-fire cannot silently reopen that bypass. (The fixture's own command string is
  // harmless — it is read-only grep against a file named "file".)
  check("OVER-FIRE (intentional, must stay blocked): grep BRE alternation containing mr-supervisor-enable",
    "grep -n 'foo\\|mr-supervisor-enable' file", true);

  for (const [name, ok, status, expectBlocked] of results) {
    if (!ok) {
      console.log(`GUARD-SELFTEST-FAIL ${name} (exit=${status}, expected ${expectBlocked ? "blocked(2)" : "allowed(0)"})`);
    }
  }
  if (!bad) console.log(`GUARD-SELFTEST-OK ${results.length} fixtures`);
  return bad;
}
