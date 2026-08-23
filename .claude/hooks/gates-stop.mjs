#!/usr/bin/env node
// Stop hook: the acceptance-ledger completion instrument (lp-gates).
//
// ============================== OBSERVE-ONLY IN THIS SLICE ==============================
// It computes the decision it WOULD make and appends one line to
// $MEM/gates/<slice>.stoplog. It NEVER blocks, and it emits NOTHING on stdout — not even a
// systemMessage, because a message is still an intervention and would contaminate the baseline
// the arming decision is supposed to be made from.
//
// WHY OBSERVE-ONLY. The milestone spec's rule R13: "instrument -> one full reset cycle -> gate.
// Never the same slice, never the same week." The v3 cutover replaced its own instrument in the
// same commit and is permanently unevaluable. Arming is a separate slice, against a pre-registered
// block-rate band.
//
// WHY IT EXISTS AT ALL. mr-launch.sh's terminal predicate is `terminal_pr_open` — "a PR exists for
// this slice". That is a proxy for done, not a proof of it, and a run that opens a PR at 80% is
// terminal by that test. This hook measures how often a session tries to end with acceptance
// criteria neither met nor explicitly DEFERred.
//
// EMPIRICAL CONTRACT (probed on CLI 2.1.240, see monster-realm-lp-gates-hookprobe.md):
//   * Stop hooks DO fire in headless `claude -p`.
//   * Hooks DO inherit the parent process environment, which is how MR_SLICE reaches us.
//   * `stop_hook_active` flips true on every stop AFTER a block. It is recorded here and
//     DELIBERATELY NOT branched on: bailing on it (as check-docs-updated.mjs does) would permit
//     exactly one block per session once this is armed, which is nearly worthless.
//   * Multiple Stop hooks all fire, and a hook that throws does not suppress the others or wedge
//     the session — so the worst case for a defect in this file is "no instrument", not
//     "wedged loop". That property is only true while we exit 0 on every path. Keep it.
//
// SAFETY POSTURE: fails open, always. Every path exits 0. A strict no-op unless MR_SLICE is set,
// so interactive sessions, other projects and the supervisor's own decision ticks are untouched
// (mr-launch.sh prefix-scopes MR_SLICE per invocation and mr-native-tick.sh scrubs it).

import { readFileSync, appendFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const MEM = "/home/mdrewt/projects/ai-apps/claude-harness/memory/projects";
const GATES = join(MEM, "gates");
const MAX_BLOCKS = 3; // recorded now; enforced by the arming slice

// PURE decision function — no I/O, so it is testable. `exists` is injected; that is the seam the
// fixtures use, and it is deliberately a parameter rather than an env override.
export function decide({ slice, text, payload = {}, exists, prevState = null }) {
  const { unmet, total, deferred } = parseGates(text);
  const base = {
    total,
    unmet: unmet.length,
    deferred,
    stop_hook_active: payload.stop_hook_active === true,
  };
  if (total === 0) return { decision: "NO-GATES", detail: base, state: prevState };
  if (unmet.length === 0) {
    return { decision: "ALLOW-all-met-or-deferred", detail: base, state: prevState };
  }

  // Release valves, in precedence order. Each names a state in which forcing more work would be
  // wrong. Recorded rather than enforced, so the arming slice can see which ones actually fire —
  // three of the five in the first draft turned out to be unreachable at costwatch_enforce:false.
  const valves = [
    [`/tmp/mr_stop_${slice}`, "stop-flag"],
    ["/tmp/mr_stop_all", "stop-all"],
    [`/tmp/mr_wrap_${slice}`, "cost-cap-wrap"],
    [join(MEM, `.costpark-${slice}`), "cost-parked"],
    [join(MEM, ".native-supervisor-disabled"), "operator-hold"],
  ];
  for (const [p, why] of valves) {
    if (exists(p)) return { decision: `WOULD-RELEASE-${why}`, detail: base, state: prevState };
  }
  // Landing pattern: at 80% of cap the right ask is "record DEFER lines for what will not land",
  // not "do more work". NOTE for the arming slice: mr-cost-watch touches this file
  // unconditionally, outside its ENFORCE branch, so this valve fires on exactly the expensive
  // slices — it must become block-once-with-a-DEFER-only-reason, not a release.
  if (exists(`/tmp/mr_warn_${slice}`)) {
    return {
      decision: "WOULD-NOT-BLOCK-landing-pattern",
      detail: { ...base, ids: unmet.slice(0, 5) },
      state: prevState,
    };
  }

  // Progress guard. Progress == the gates file's content changed since the last recorded stop.
  // `mr-gates check` never writes on failure, so a failing check cannot manufacture progress.
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
  const prev = prevState || { hash: "", blocks: 0 };
  const progressed = prev.hash !== hash;
  const state = progressed ? { hash, blocks: 1 } : { hash, blocks: (prev.blocks || 0) + 1 };

  // NOTE for the arming slice: on NO progress the correct action is to ESCALATE (surface a
  // BLOCKER for the supervisor), not to release — stasis is free and cheaper than progress, so
  // "release when nothing changed" rewards exactly the behaviour the gate exists to catch.
  const decision =
    !progressed && state.blocks > MAX_BLOCKS ? "WOULD-ESCALATE-no-progress" : "WOULD-BLOCK";
  return { decision, detail: { ...base, blocks: state.blocks, progressed, ids: unmet.slice(0, 5) }, state };
}

function main() {
  const slice = process.env.MR_SLICE;
  if (!slice || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slice)) return; // strict no-op

  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, "utf8") || "{}") || {};
  } catch {
    /* stay permissive */
  }

  const gfile = join(GATES, `${slice}.gates.md`);
  if (!existsSync(gfile)) return log(slice, "NO-GATES-FILE", {});
  let text = "";
  try {
    text = readFileSync(gfile, "utf8");
  } catch {
    return; // unreadable: fail open, silently
  }

  const statePath = join(GATES, `.${slice}.stopstate.json`);
  let prevState = null;
  try {
    prevState = JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    /* fresh */
  }

  const { decision, detail, state } = decide({ slice, text, payload, exists: existsSync, prevState });
  if (state && state !== prevState) {
    try {
      writeFileSync(statePath, JSON.stringify(state));
    } catch {
      /* non-fatal */
    }
  }
  log(slice, decision, detail);
}

function parseGates(text) {
  const lines = text.split(/\r?\n/);
  const deferredIds = new Set();
  for (const l of lines) {
    const m = l.match(/^(?:DEFER|ABANDON):\s+(\S+?)\s*(?:->|→|—|--)/);
    if (m) deferredIds.add(m[1]);
  }
  const unmet = [];
  let total = 0;
  let cur = null;
  const flush = () => {
    if (!cur) return;
    if (!deferredIds.has(cur.id)) {
      // Empty string counts as pending, matching mr-gates' Gate.has_evidence().
      // Disagreeing here would bias the stoplog baseline the arming slice reads.
      const pending = !cur.evidence || /^pending$/i.test(cur.evidence.trim());
      // Checked-with-pending-evidence counts as UNMET, and is worse than unchecked: a checkbox is
      // a claim, evidence is the proof.
      if (!cur.checked || pending) unmet.push(cur.id);
    }
    cur = null;
  };
  for (const l of lines) {
    const g = l.match(/^- \[( |x|X)\] (\S+):/);
    if (g) {
      flush();
      total += 1;
      cur = { id: g[2], checked: g[1].toLowerCase() === "x", evidence: null };
      continue;
    }
    const e = cur && l.match(/^\s+EVIDENCE:\s?(.*)$/);
    if (e) cur.evidence = e[1].trim();
  }
  flush();
  return { unmet, total, deferred: deferredIds.size };
}

function log(slice, decision, detail) {
  try {
    const line =
      `${new Date().toISOString().replace(/\.\d+Z$/, "Z")} ${decision} ` +
      `${JSON.stringify(detail)}\n`;
    appendFileSync(join(GATES, `${slice}.stoplog`), line);
  } catch {
    /* the instrument must never be the thing that breaks the run */
  }
}

// ---------------------------------------------------------------------------------------------
// --selftest. Drives the PURE decision function over fixtures; the `exists` seam is injected, so
// nothing here touches real /tmp or real loop state. rc 0 pass / 1 fail.
// ---------------------------------------------------------------------------------------------
function selftest() {
  let n = 0;
  let bad = 0;
  const eq = (id, want, got, why = "") => {
    n += 1;
    if (JSON.stringify(want) !== JSON.stringify(got)) {
      bad += 1;
      console.log(`GATES-STOP-SELFTEST-FAIL ${id}: want ${JSON.stringify(want)} got ${JSON.stringify(got)} ${why}`);
    }
  };
  const none = () => false;
  const G = (body) => `# Gates: s\nSeed: z\n\n${body}`;
  const D = (o) => decide({ slice: "s", exists: none, ...o });

  const unmetOnly = G("- [ ] E1: a\n  CHECK: cargo test\n  EXPECT: /1 passed/\n  EVIDENCE: pending\n");
  eq("S1-blocks-on-unmet", "WOULD-BLOCK", D({ text: unmetOnly }).decision);

  eq("S2-checked-pending-is-unmet", "WOULD-BLOCK",
    D({ text: G("- [x] E1: a\n  EVIDENCE: pending\n") }).decision,
    "a checkbox is a claim; evidence is the proof");

  eq("S3-met-allows", "ALLOW-all-met-or-deferred",
    D({ text: G("- [x] E1: a\n  EVIDENCE: 3 passed\n") }).decision);

  eq("S4-defer-resolves", "ALLOW-all-met-or-deferred",
    D({ text: G("- [ ] E1: a\n  EVIDENCE: pending\n\nDEFER: E1 -> 16r-h — no room in this slice\n") }).decision,
    "an honestly declared deferral is a legal exit");

  eq("S5-abandon-resolves", "ALLOW-all-met-or-deferred",
    D({ text: G("- [ ] E1: a\n  EVIDENCE: pending\n\nABANDON: E1 — impossible here\n") }).decision);

  eq("S6-no-gates", "NO-GATES", D({ text: G("") }).decision);

  eq("S7-partial-still-blocks", "WOULD-BLOCK",
    D({ text: G("- [x] E1: a\n  EVIDENCE: ok\n\n- [ ] E2: b\n  EVIDENCE: pending\n") }).decision,
    "the 80%-done case is the whole reason this exists");

  // valve precedence: every valve releases, and each is checked independently
  for (const [p, why] of [
    ["/tmp/mr_stop_s", "stop-flag"],
    ["/tmp/mr_stop_all", "stop-all"],
    ["/tmp/mr_wrap_s", "cost-cap-wrap"],
    [join(MEM, ".costpark-s"), "cost-parked"],
    [join(MEM, ".native-supervisor-disabled"), "operator-hold"],
  ]) {
    eq(`S8-valve-${why}`, `WOULD-RELEASE-${why}`,
      D({ text: unmetOnly, exists: (q) => q === p }).decision);
  }

  eq("S9-landing-pattern", "WOULD-NOT-BLOCK-landing-pattern",
    D({ text: unmetOnly, exists: (q) => q === "/tmp/mr_warn_s" }).decision);

  // progress guard
  const r1 = D({ text: unmetOnly, prevState: null });
  eq("S10-first-stop-is-progress", true, r1.detail.progressed,
    "a first stop with no prior hash must count as progress, not as a stale repeat");
  let st = r1.state;
  let last = r1;
  for (let i = 0; i < MAX_BLOCKS; i += 1) {
    last = D({ text: unmetOnly, prevState: st });
    st = last.state;
  }
  eq("S11-escalates-on-stasis", "WOULD-ESCALATE-no-progress", last.decision,
    "stasis is free; releasing on it would reward exactly what the gate catches");
  const moved = D({ text: unmetOnly + "\n- [ ] E9: new\n  EVIDENCE: pending\n", prevState: st });
  eq("S12-progress-resets", 1, moved.state.blocks);
  eq("S13-progress-blocks-again", "WOULD-BLOCK", moved.decision);

  // parse robustness
  eq("S14-ignores-non-gate-checkboxes", 1,
    parseGates(G("- [ ] E1: a\n  EVIDENCE: pending\n\n- [ ] not a gate line\n")).total,
    "a gate line requires an explicit `<id>:`; a bare checkbox in prose is not a gate");
  eq("S15-malformed-is-not-a-defer", "WOULD-BLOCK",
    D({ text: G("- [ ] E1: a\n  EVIDENCE: pending\n\nDEFER: E1 no arrow\n") }).decision,
    "a malformed DEFER must not silently resolve a gate");

  // degeneracy control: the decision function must discriminate
  eq("S16-discriminates", 3,
    new Set([
      D({ text: unmetOnly }).decision,
      D({ text: G("- [x] E1: a\n  EVIDENCE: ok\n") }).decision,
      D({ text: unmetOnly, exists: (q) => q === "/tmp/mr_stop_all" }).decision,
    ]).size,
    "a hook that always returns the same verdict carries no information");

  if (bad) {
    console.log(`GATES-STOP-SELFTEST-FAIL ${bad} of ${n}`);
    return 1;
  }
  console.log(`GATES-STOP-SELFTEST-OK ${n}`);
  return 0;
}

if (process.argv[2] === "--selftest") {
  process.exit(selftest());
}

try {
  main();
} catch {
  /* fail open */
}
process.exit(0);
