#!/usr/bin/python3
"""mr-record.selftest.py -- the gating battery of slice tp-5.

    /usr/bin/python3 mr-record.selftest.py [ID ...]      (also: mr-record --selftest [ID ...])

IDs are TP5-A1..TP5-A8; none = all. Each fixture drives the REAL mr-record / mr-situation (copied
into a sandbox) with a stub or the real mr-prune beside the copy. Nothing touches the real memory
dir, ledger, gates dir or game repo.
"""
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REAL_LEDGER = "/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-usage-ledger.jsonl"
BRANCH_REF = "refs/remotes/origin/master"
SLOW = 30


class Fail(Exception):
    pass


def check(cond, why):
    if not cond:
        raise Fail(why)


def write(path, text, exe=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    if exe:
        os.chmod(path, os.stat(path).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def base_env():
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    for k in ("MR_BACKUP_ROOT", "MR_RECORD_PRUNE_MEM", "MR_RECORD_PRUNE_TIMEOUT"):
        env.pop(k, None)
    env.update({
        "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.invalid",
        "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@example.invalid",
        "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_NOSYSTEM": "1",
    })
    return env


def git(*args, cwd=None):
    r = subprocess.run(["git"] + list(args), cwd=cwd, env=base_env(), capture_output=True, text=True)
    if r.returncode != 0:
        raise Fail("git %s failed: %s" % (" ".join(args), r.stderr.strip()))
    return r.stdout.strip()


# ------------------------------------------------------------------ spec / repo / stub builders
def spec_text(slice_ids):
    """A milestone spec: an out-of-section `### x` heading, then `## Slices` holding the ids and a
    fenced `### fake-9` heading, neither of which is a slice."""
    out = ["# Spec", "", "### x — outside the slices section", "intro", "", "## Slices", ""]
    for i, sid in enumerate(slice_ids):
        out += ["### %s — title %d" % (sid, i), "type: feature · tier: routine", "touches: a/b", ""]
        if i == 0:
            out += ["```", "### fake-9 — inside a fence", "```", ""]
    return "\n".join(out) + "\n"


STUB = '''#!/usr/bin/python3
import json, os, subprocess, sys, time
argv = sys.argv[1:]
repo = argv[argv.index("--repo") + 1] if "--repo" in argv else "."
sha = subprocess.run(["git", "-C", repo, "rev-parse", "%(ref)s"], capture_output=True, text=True).stdout.strip()
with open(%(calls)r, "a") as f:
    f.write(json.dumps({"argv": argv, "origin": sha}) + "\\n")
mode = %(mode)r
if mode == "sleep":
    time.sleep(%(slow)d)
if mode == "fail":
    sys.stderr.write("stub failing\\n")
    sys.exit(3)
spec = argv[argv.index("--spec") + 1] if "--spec" in argv else "x.spec.md"
print("PRUNE-CLOSE %%s %%s" %% (os.path.basename(spec)[:-len(".spec.md")], sha))
print("second line")
'''


class World:
    pass


def world(specs, merged, mode="ok", with_prune=True, real_prune=False):
    """specs: {filename: [slice ids]}; merged: slice ids already MERGED in the ledger."""
    w = World()
    w.sb = tempfile.mkdtemp(prefix="mr-record-selftest-")
    sb = w.sb
    w.mem = os.path.join(sb, "mem")
    w.ledger = os.path.join(sb, "ledger.jsonl")
    w.harness = os.path.join(sb, "harness")
    w.corpus = os.path.join(w.harness, "specs", "monster-realm-v2")
    w.repo = os.path.join(w.harness, "projects", "monster-realm")
    w.prunemem = os.path.join(sb, "prunemem")
    w.calls = os.path.join(sb, "calls.jsonl")
    os.makedirs(w.mem)
    os.makedirs(w.prunemem)
    os.makedirs(os.path.join(sb, "gates"))
    os.makedirs(os.path.join(sb, "transcripts"))
    shutil.copy2(os.path.join(HERE, "mr-record"), os.path.join(w.mem, "mr-record"))
    write(os.path.join(sb, "backup-stub"), "#!/usr/bin/python3\nimport sys\nsys.exit(0)\n", exe=True)
    for name, ids in specs.items():
        write(os.path.join(w.corpus, name), spec_text(ids))
    with open(w.ledger, "w") as f:
        for sid in merged:
            f.write(json.dumps({"ts": "2026-01-01T00:00:00Z", "run_id": "old-" + sid, "slice": sid,
                                "outcome": "MERGED", "cost_usd": 0}) + "\n")
    # game repo: a clone of a bare origin; a new commit lands on origin AFTER the clone
    bare = os.path.join(sb, "origin.git")
    git("init", "--bare", "-b", "master", bare)
    seed = os.path.join(sb, "seed")
    git("init", "-b", "master", seed)
    write(os.path.join(seed, "README.md"), "seed\n")
    git("add", "-A", cwd=seed)
    git("commit", "-m", "chore: seed", cwd=seed)
    git("remote", "add", "origin", bare, cwd=seed)
    git("push", "origin", "master", cwd=seed)
    os.makedirs(os.path.dirname(w.repo))
    git("clone", bare, w.repo)
    second = os.path.join(sb, "second")
    git("clone", bare, second)
    write(os.path.join(second, "docs", "x.txt"), "one\ntwo\n")
    git("add", "-A", cwd=second)
    subject = "feat(x): m-1 — something" if real_prune else "chore: later"
    git("commit", "-m", subject, cwd=second)
    git("push", "origin", "master", cwd=second)
    w.pushed = git("rev-parse", "HEAD", cwd=second)
    check(git("rev-parse", BRANCH_REF, cwd=w.repo) != w.pushed, "fixture error: clone already sees the push")
    if with_prune:
        if real_prune:
            shutil.copy2(os.path.join(HERE, "mr-prune"), os.path.join(w.mem, "mr-prune"))
        else:
            write(os.path.join(w.mem, "mr-prune"),
                  STUB % {"ref": BRANCH_REF, "calls": w.calls, "mode": mode, "slow": SLOW}, exe=True)
    return w


def calls_of(w):
    if not os.path.exists(w.calls):
        return []
    return [json.loads(l) for l in open(w.calls) if l.strip()]


def record(w, slice_id, outcome="MERGED", env_over=None, drop=()):
    env = base_env()
    env.update({
        "MR_RECORD_LEDGER": w.ledger,
        "MR_RECORD_HANDOFF": os.path.join(w.sb, "handoff.md"),
        "MR_RECORD_STATE": os.path.join(w.sb, "state.json"),
        "MR_RECORD_HARNESS": w.harness,
        "MR_RECORD_GATES_DIR": os.path.join(w.sb, "gates"),
        "MR_BACKUP_BIN": os.path.join(w.sb, "backup-stub"),
        "MR_COST_TRANSCRIPTS": os.path.join(w.sb, "transcripts"),
        "MR_RECORD_PRUNE_MEM": w.prunemem,
        "MR_RECORD_PRUNE_TIMEOUT": "60",
    })
    env.update(env_over or {})
    for k in drop:
        env.pop(k, None)
    write(os.path.join(w.sb, "state.json"), "{}\n")
    t0 = time.time()
    r = subprocess.run(["bash", os.path.join(w.mem, "mr-record"), "ledger", "--run_id", "run-new",
                        "--slice", slice_id, "--outcome", outcome, "--cost", "0", "--model", "opus"],
                       env=env, capture_output=True, text=True, timeout=120, cwd=w.sb)
    r.elapsed = time.time() - t0
    return r


def row_in_ledger(w, slice_id, outcome):
    for l in open(w.ledger):
        try:
            d = json.loads(l)
        except ValueError:
            continue
        if d.get("run_id") == "run-new" and d.get("slice") == slice_id and d.get("outcome") == outcome:
            return True
    return False


def warns(r):
    return [l for l in r.stderr.splitlines() if l.startswith("WARN prune-close")]


def cleanup(w):
    shutil.rmtree(w.sb, ignore_errors=True)


def with_world(fn, *a, **kw):
    w = world(*a, **kw)
    try:
        fn(w)
    finally:
        cleanup(w)


# ================================================================================ TP5-A1
def a1_last_slice_runs_close():
    def body(w):
        r = record(w, "c")
        check(r.returncode == 0, "rc %s: %s" % (r.returncode, r.stderr))
        check(row_in_ledger(w, "c", "MERGED"), "MERGED row not appended")
        calls = calls_of(w)
        check(len(calls) == 1, "expected exactly 1 mr-prune call, got %d" % len(calls))
        spec = os.path.join(w.corpus, "m-one.spec.md")
        want = ["close", "--spec", spec, "--repo", w.repo, "--at", BRANCH_REF, "--mem", w.prunemem]
        check(calls[0]["argv"] == want, "argv %r != %r" % (calls[0]["argv"], want))
        check(calls[0]["origin"] == w.pushed,
              "origin/master at call time %s, not the pushed %s (fetch must precede the census)"
              % (calls[0]["origin"], w.pushed))
        lines = [l for l in r.stdout.splitlines() if l.startswith("prune-close: ")]
        check(len(lines) == 1 and "PRUNE-CLOSE m-one %s" % w.pushed in lines[0]
              and "second line" not in lines[0],
              "stdout should hold one `prune-close: <first line>`, got %r" % r.stdout)
    with_world(body, {"m-one.spec.md": ["a", "b", "c"], "structure.spec.md": ["st-1"]}, ["a", "b"])


def a1_integration_real_prune():
    def body(w):
        r = record(w, "m-1")
        check(r.returncode == 0, "rc %s: %s" % (r.returncode, r.stderr))
        trend = os.path.join(w.prunemem, "prune", "trend.jsonl")
        check(os.path.exists(trend), "real mr-prune wrote no trend.jsonl (stderr: %s)" % r.stderr)
        rows = [json.loads(l) for l in open(trend) if l.strip()]
        check(len(rows) == 1, "expected 1 trend row, got %d" % len(rows))
        check(rows[0].get("label") == "m-int" and isinstance(rows[0].get("close"), dict),
              "trend row lacks label m-int / close object: %r" % list(rows[0]))
        check(rows[0]["close"].get("slices", {}).get("m-1") == [w.pushed],
              "the census did not see the pushed commit: %r" % rows[0]["close"].get("slices"))
    with_world(body, {"m-int.spec.md": ["m-1"]}, [], real_prune=True)


# ================================================================================ TP5-A2
def a2_incomplete_no_call():
    def body(w):
        r = record(w, "b")
        check(r.returncode == 0, "rc %s" % r.returncode)
        check(row_in_ledger(w, "b", "MERGED"), "MERGED row not appended")
        check(calls_of(w) == [], "mr-prune ran with slice c unmerged")
    with_world(body, {"m-one.spec.md": ["a", "b", "c"]}, ["a"])


def a2_non_merged_closing_row_no_call():
    def body(w):
        r = record(w, "c", outcome="FINISHED")
        check(r.returncode == 0, "rc %s" % r.returncode)
        check(row_in_ledger(w, "c", "FINISHED"), "FINISHED row not appended")
        check(calls_of(w) == [], "mr-prune ran for a non-MERGED row")
    with_world(body, {"m-one.spec.md": ["a", "b", "c"]}, ["a", "b"])


def a2_unclosed_fence_spec():
    def body(w):
        write(os.path.join(w.corpus, "m-one.spec.md"),
              "# Spec\n\n## Slices\n\n### a — A\ntype: feature\n```\n### b — B\n")
        r = record(w, "a")
        check(r.returncode == 0, "rc %s: %s" % (r.returncode, r.stderr))
        check(row_in_ledger(w, "a", "MERGED"), "MERGED row not appended")
        check(calls_of(w) == [], "mr-prune ran for a spec with an unclosed fence")
        check(len(warns(r)) == 1, "expected one WARN prune-close line, got %r" % warns(r))
    with_world(body, {"m-one.spec.md": ["a", "b"]}, [])


# ================================================================================ TP5-A3
def a3_structure_residuals_none():
    cases = [("structure.spec.md", "st-1", ["st-1"]),
             ("residuals.spec.md", "r-1", ["r-1"]),
             (None, "zzz-1", None)]
    for name, sid, ids in cases:
        def body(w, sid=sid):
            r = record(w, sid)
            check(r.returncode == 0, "%s: rc %s" % (sid, r.returncode))
            check(row_in_ledger(w, sid, "MERGED"), "%s: row not appended" % sid)
            check(calls_of(w) == [], "%s: mr-prune ran" % sid)
            check(warns(r) == [], "%s: unexpected WARN prune-close" % sid)
        specs = {"m-one.spec.md": ["a"]}      # complete once `a` is merged: only the holding-spec rule stops the call
        if name:
            specs[name] = ids
        with_world(body, specs, ["a"])


# ================================================================================ TP5-A4
def a4_failure_is_total():
    def body_for(expect_calls, limit):
        def body(w):
            r = record(w, "c", env_over={"MR_RECORD_PRUNE_TIMEOUT": "2"})
            check(r.returncode == 0, "rc %s: %s" % (r.returncode, r.stderr))
            check(r.elapsed < limit, "took %.1fs, hook did not bound mr-prune" % r.elapsed)
            check(row_in_ledger(w, "c", "MERGED"), "ledger row lost")
            check(len(warns(r)) == 1, "expected one WARN prune-close line, got %r" % warns(r))
            check(not [l for l in r.stdout.splitlines() if l.startswith("prune-close: ")],
                  "success line printed on failure")
            check(len(calls_of(w)) == expect_calls, "calls %d != %d" % (len(calls_of(w)), expect_calls))
        return body
    specs = {"m-one.spec.md": ["a", "b", "c"]}
    with_world(body_for(0, 20), specs, ["a", "b"], with_prune=False)
    with_world(body_for(1, 20), specs, ["a", "b"], mode="fail")
    with_world(body_for(1, 20), specs, ["a", "b"], mode="sleep")


def a4_fetch_failure_stops_census():
    def body(w):
        git("remote", "set-url", "origin", os.path.join(w.sb, "no-such-origin.git"), cwd=w.repo)
        r = record(w, "c")
        check(r.returncode == 0, "rc %s: %s" % (r.returncode, r.stderr))
        check(row_in_ledger(w, "c", "MERGED"), "ledger row lost")
        check(len(warns(r)) == 1, "expected one WARN prune-close line, got %r" % warns(r))
        check(calls_of(w) == [], "mr-prune ran after a failed fetch")
        check(not [l for l in r.stdout.splitlines() if l.startswith("prune-close: ")],
              "success line printed on failure")
    with_world(body, {"m-one.spec.md": ["a", "b", "c"]}, ["a", "b"])


# ================================================================================ TP5-A5
def a5_no_prune_dir_no_hook():
    def body(w):
        r = record(w, "c", drop=("MR_RECORD_PRUNE_MEM",))
        check(r.returncode == 0, "rc %s" % r.returncode)
        check(row_in_ledger(w, "c", "MERGED"), "row not appended")
        check(calls_of(w) == [], "hook ran with no prune directory set")
    with_world(body, {"m-one.spec.md": ["a", "b", "c"]}, ["a", "b"])


# ================================================================================ mr-situation
def situation(sb, labels_with_spec, section_labels, json_labels=(), mkprune=True, mode="normal"):
    mem = os.path.join(sb, "memory", "projects")
    os.makedirs(mem)
    src = open(os.path.join(HERE, "mr-situation"), encoding="utf-8").read()
    new, n = re.subn(r"(?m)^MEM=.*$", lambda m: "MEM=" + mem, src)
    check(n == 1, "fixture error: %d ^MEM= lines in mr-situation" % n)
    copy = os.path.join(mem, "mr-situation")
    write(copy, new, exe=True)
    corpus = os.path.join(sb, "specs", "monster-realm-v2")
    for label in labels_with_spec:
        write(os.path.join(corpus, label + ".spec.md"), spec_text(["a"]))
    if mkprune:
        close = os.path.join(mem, "prune", "close")
        if mode == "file":
            write(close, "not a directory\n")
        else:
            os.makedirs(close)
            for label in section_labels:
                write(os.path.join(close, label + ".section.md"), "### st-<n> — x\n")
            for label in json_labels:
                write(os.path.join(close, label + ".json"), "{}\n")
            if mode == "chmod":
                os.chmod(close, 0)
    r = subprocess.run(["bash", copy, "--no-gh", "--fresh"], capture_output=True, text=True,
                       timeout=120, cwd=sb)
    return mem, r


def run_situation(*a, **kw):
    sb = tempfile.mkdtemp(prefix="mr-record-selftest-")
    try:
        try:
            mem, r = situation(sb, *a, **kw)
        finally:
            for root, dirs, _ in os.walk(sb):
                for d in dirs:
                    try:
                        os.chmod(os.path.join(root, d), 0o755)
                    except OSError:
                        pass
        check(r.returncode == 0, "mr-situation rc %s" % r.returncode)
        try:
            data = json.loads(r.stdout)
        except ValueError as e:
            raise Fail("stdout is not valid JSON: %s" % e)
        check(isinstance(data, dict), "bundle is not an object")
        return mem, data
    finally:
        shutil.rmtree(sb, ignore_errors=True)


def entry_ok(e, mem, label):
    check(isinstance(e, dict) and set(e) == {"milestone", "section_file", "action"},
          "entry keys %r" % (sorted(e) if isinstance(e, dict) else e))
    check(e["milestone"] == label, "milestone %r != %r" % (e["milestone"], label))
    want = os.path.join(mem, "prune", "close", label + ".section.md")
    check(e["section_file"] == want, "section_file %r != %r" % (e["section_file"], want))
    act = e["action"]
    check(isinstance(act, str) and act.strip() and "\n" not in act, "action is not one line: %r" % act)
    check("structure.spec.md" in act and label + ".spec.md" in act,
          "action names neither structure.spec.md nor %s.spec.md: %r" % (label, act))


# ================================================================================ TP5-A6
def a6_one_entry():
    mem, data = run_situation(["m-one"], ["m-one"])
    pc = data.get("prune_close")
    check(isinstance(pc, list) and len(pc) == 1, "prune_close %r, want one entry" % (pc,))
    entry_ok(pc[0], mem, "m-one")


def a6_two_sorted():
    mem, data = run_situation(["m-b", "m-a", "m-c"], ["m-b", "m-a"], json_labels=["m-c", "m-a"])
    pc = data.get("prune_close")
    check(isinstance(pc, list) and [e.get("milestone") for e in pc] == ["m-a", "m-b"],
          "prune_close milestones %r, want [m-a, m-b]" % ([e.get("milestone") for e in pc]
                                                           if isinstance(pc, list) else pc))
    for e, label in zip(pc, ["m-a", "m-b"]):
        entry_ok(e, mem, label)


# ================================================================================ TP5-A7
def a7_no_section_file():
    _, data = run_situation(["m-one"], [], json_labels=["m-one"])
    check(data.get("prune_close") == [], "prune_close %r, want []" % (data.get("prune_close"),))


def a7_spec_gone():
    _, data = run_situation(["m-other"], ["m-gone"])
    check(data.get("prune_close") == [], "prune_close %r, want []" % (data.get("prune_close"),))


# ================================================================================ TP5-A8
def a8_no_prune_dir():
    _, data = run_situation(["m-one"], [], mkprune=False)
    check(data.get("prune_close") == [], "prune_close %r, want []" % (data.get("prune_close"),))


def a8_unreadable_dir():
    run_situation(["m-one"], ["m-one"], mode="chmod")


def a8_close_is_a_file():
    run_situation(["m-one"], [], mode="file")


FIXTURES = {
    "TP5-A1": [a1_last_slice_runs_close, a1_integration_real_prune],
    "TP5-A2": [a2_incomplete_no_call, a2_non_merged_closing_row_no_call, a2_unclosed_fence_spec],
    "TP5-A3": [a3_structure_residuals_none],
    "TP5-A4": [a4_failure_is_total, a4_fetch_failure_stops_census],
    "TP5-A5": [a5_no_prune_dir_no_hook],
    "TP5-A6": [a6_one_entry, a6_two_sorted],
    "TP5-A7": [a7_no_section_file, a7_spec_gone],
    "TP5-A8": [a8_no_prune_dir, a8_unreadable_dir, a8_close_is_a_file],
}
# a3 and a4 loop over several sandboxes inside one function; count them as the cases they run.
CASE_COUNT = {a3_structure_residuals_none: 3, a4_failure_is_total: 3}


def size_of(path):
    try:
        return os.path.getsize(path)
    except OSError:
        return None


FIXTURE_RUN_IDS = {"run-new"}
FIXTURE_SLICES = {"a", "b", "c", "st-1", "r-1", "zzz-1", "m-1"}


def real_ledger_leak(before):
    """The live loop may append to the real ledger meanwhile: only bytes past the starting offset
    are read, and only a row naming a fixture run_id or slice (or a shrink) is a failure."""
    now = size_of(REAL_LEDGER)
    if before is None:
        return None if now is None else None
    if now is None or now < before:
        return "the real ledger shrank or vanished"
    with open(REAL_LEDGER, "rb") as f:
        f.seek(before)
        tail = f.read().decode("utf-8", "replace")
    for line in tail.splitlines():
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if not isinstance(d, dict):
            continue
        rid = str(d.get("run_id") or "")
        if rid in FIXTURE_RUN_IDS or rid.startswith("old-") or d.get("slice") in FIXTURE_SLICES:
            return "a fixture row reached the real ledger: %s" % line[:120]
    return None


def main(argv):
    ids = argv[1:]
    for i in ids:
        if i not in FIXTURES:
            print("RECORD-SELFTEST-ERROR unknown id %s" % i)
            return 2
    run_ids = ids or list(FIXTURES)
    before = size_of(REAL_LEDGER)
    failed, n = False, 0
    for fid in run_ids:
        for case in FIXTURES[fid]:
            n += CASE_COUNT.get(case, 1)
            try:
                case()
            except Fail as e:
                failed = True
                print("RECORD-SELFTEST-FAIL %s: %s: %s" % (fid, case.__name__, e))
            except Exception as e:
                failed = True
                print("RECORD-SELFTEST-FAIL %s: %s: %s: %s" % (fid, case.__name__, type(e).__name__, e))
    leak = real_ledger_leak(before)
    if leak:
        failed = True
        print("RECORD-SELFTEST-FAIL %s: %s" % (run_ids[0], leak))
    if failed:
        return 1
    print("RECORD-SELFTEST-OK %d%s" % (n, "".join(" " + i for i in ids)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
