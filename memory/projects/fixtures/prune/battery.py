#!/usr/bin/python3
''''exec /usr/bin/python3 "$0" "$@" # '''
# ^ POLYGLOT INTERPRETER GUARD: a shell that runs this file re-execs it under python3 first.
"""mr-prune selftest battery: one fixture per criterion id (TP1-A1..TP1-A15, TP2-A1..TP2-A14).

    /usr/bin/python3 battery.py <absolute path of mr-prune> [ID ...]

Drives the tool only as a subprocess, over temporary git repositories built here, always with
--repo, --at <sha> and --mem <temp dir> (the CI fixtures also put a fake `gh` first on PATH, or
remove `gh` from PATH). One fixture per criterion id. A failed check prints
"FAIL <ID> <check>: ..." and the run goes on. The last stdout line is
"PRUNE-SELFTEST-OK <checks>[ <ID>...]" (exit 0) or "PRUNE-SELFTEST-FAIL <failed>/<checks>" (exit 1).
TP1-A16 has no fixture here: it is proved by running mr-selfcheck itself.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import traceback
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = None      # the one temp root; removed at exit
NEUTRAL = None   # cwd for tool runs, outside every fixture repo
TOOL = None

# --------------------------------------------------------------------------------------------
# environment and git
# --------------------------------------------------------------------------------------------


def clean_env():
    return {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}


def git_env():
    env = clean_env()
    env.update({
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_AUTHOR_NAME": "Fixture",
        "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_AUTHOR_DATE": "1767225600 +0000",
        "GIT_COMMITTER_NAME": "Fixture",
        "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_DATE": "1767225600 +0000",
        "GIT_OPTIONAL_LOCKS": "0",
    })
    return env


def git(cwd, *args):
    p = subprocess.run(["git"] + list(args), cwd=cwd, env=git_env(),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    if p.returncode != 0:
        raise RuntimeError("fixture git %s failed (%d): %s"
                           % (" ".join(args), p.returncode, p.stderr.decode("utf-8", "replace")))
    return p.stdout.decode("utf-8", "replace")


def fixture_bytes(name):
    with open(os.path.join(HERE, name), "rb") as f:
        return f.read()


def lines_of(data):
    """wc -l: the number of newline bytes."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return data.count(b"\n")


class Repo:
    def __init__(self):
        self.path = tempfile.mkdtemp(prefix="repo-", dir=ROOT)
        git(self.path, "init", "-q", "-b", "main")

    def _full(self, rel):
        full = os.path.join(self.path, rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        if os.path.lexists(full):
            os.remove(full)
        return full

    def put(self, rel, data):
        if isinstance(data, str):
            data = data.encode("utf-8")
        with open(self._full(rel), "wb") as f:
            f.write(data)

    def fixture(self, rel, name):
        self.put(rel, fixture_bytes(name))

    def link(self, rel, target):
        os.symlink(target, self._full(rel))

    def commit(self, msg="fixture"):
        git(self.path, "add", "-A")
        git(self.path, "-c", "commit.gpgsign=false", "commit", "-q", "--allow-empty", "-m", msg)
        return git(self.path, "rev-parse", "HEAD").strip()


def new_mem():
    return tempfile.mkdtemp(prefix="mem-", dir=ROOT)


def snapshot(repo):
    """Index bytes, refs + HEAD, and every worktree file, hashed."""
    with open(os.path.join(repo.path, ".git", "index"), "rb") as f:
        index = hashlib.sha256(f.read()).hexdigest()
    refs = (git(repo.path, "for-each-ref", "--format=%(objectname) %(refname)")
            + "HEAD " + git(repo.path, "rev-parse", "HEAD")
            + "SYM " + git(repo.path, "symbolic-ref", "HEAD"))
    files = {}
    for dirpath, dirnames, filenames in os.walk(repo.path):
        if os.path.abspath(dirpath) == os.path.abspath(repo.path):
            dirnames[:] = [d for d in dirnames if d != ".git"]
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, repo.path)
            if os.path.islink(full):
                files[rel] = "link:" + os.readlink(full)
            else:
                with open(full, "rb") as f:
                    files[rel] = hashlib.sha256(f.read()).hexdigest()
    return {"index": index, "refs": refs, "files": files}


# --------------------------------------------------------------------------------------------
# running the tool and reading its output
# --------------------------------------------------------------------------------------------


class Result:
    def __init__(self, rc, out, err):
        self.rc, self.out, self.err = rc, out, err
        lines = out.splitlines()
        self.first = lines[0].rstrip("\r") if lines else ""
        self.commit = None
        self.totals = {}
        self.rows = []
        self.counts = None
        self.recorded = None
        # TP2 sections; the TP1 `rows` list keeps only duplicates and protected-twins
        self.orph = []        # (file, symbol, test_only, tests-tuple)
        self.orph_prot = []   # (file, symbol, test_only, tests-tuple, token)
        self.lv = []          # (file, groups)
        self.sig = []         # (file, source_text, churn|None, widened|None)
        self.pchurn = []      # (file, churn, token)
        self.ci = None        # kv dict of the `ci` line
        self.slices = {}      # (section, file, name-or-"") -> [slice ids]
        self.bad = []         # new-section lines the parser could not read


def run_tool(*args, env=None):
    cmd = ([TOOL] if os.access(TOOL, os.X_OK) else ["/usr/bin/python3", TOOL]) + list(args)
    p = subprocess.run(cmd, cwd=NEUTRAL, env=clean_env() if env is None else env,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
    return Result(p.returncode, p.stdout.decode("utf-8", "replace"),
                  p.stderr.decode("utf-8", "replace"))


def kv(tokens):
    out = {}
    for t in tokens:
        if "=" not in t:
            out["<malformed>"] = t
            continue
        k, v = t.split("=", 1)
        out[k] = v
    return out


def parse_row(line):
    """'<section> <file> :: <JSON> -> <JSON>[ token=<t>]' -> (section, file, cand, surv, token)."""
    section, rest = line.split(" ", 1)
    dec = json.JSONDecoder()
    try:
        if rest.startswith('"'):
            path, i = dec.raw_decode(rest)
            rest = rest[i:]
        else:
            path, rest = rest.split(" ", 1)
            rest = " " + rest
        if not rest.startswith(" :: "):
            return None
        cand, i = dec.raw_decode(rest[4:])
        rest = rest[4 + i:]
        if not rest.startswith(" -> "):
            return None
        surv, i = dec.raw_decode(rest[4:])
        rest = rest[4 + i:]
    except ValueError:
        return None
    if not all(isinstance(x, str) for x in (path, cand, surv)):
        return None
    token = None
    if section == "protected-twins":
        if not rest.startswith(" token="):
            return None
        token = rest[len(" token="):]
    elif rest:
        return None
    return (section, path, cand, surv, token)


SLICES_RE = re.compile(r" slices=([^ ]+)$")


def split_slices(line):
    """'<row> slices=a,b' -> ('<row>', ['a', 'b']); no suffix -> (line, None)."""
    m = SLICES_RE.search(line)
    if not m:
        return line, None
    return line[:m.start()], m.group(1).split(",")


def split_path(rest):
    """A bare path or a JSON-string path at the start of rest -> (path, remainder)."""
    if rest.startswith('"'):
        path, i = json.JSONDecoder().raw_decode(rest)
        return path, rest[i:]
    if " " in rest:
        path, tail = rest.split(" ", 1)
        return path, " " + tail
    return rest, ""


def compact(x):
    return json.dumps(x, separators=(",", ":"))


def parse_orphan(section, rest):
    """'<file> :: <JSON sym>[ test-only] tests=<compact JSON array>[ token=<t>]' -> row tuple or None."""
    dec = json.JSONDecoder()
    try:
        path, rest = split_path(rest)
        if not rest.startswith(" :: "):
            return None
        sym, i = dec.raw_decode(rest[4:])
        rest = rest[4 + i:]
        test_only = rest.startswith(" test-only")
        if test_only:
            rest = rest[len(" test-only"):]
        if not rest.startswith(" tests="):
            return None
        raw = rest[len(" tests="):]
        tests, i = dec.raw_decode(raw)
        rest = raw[i:]
        if not isinstance(tests, list) or not all(isinstance(t, str) for t in tests):
            return None
        if raw[:i] != compact(tests) or tests != sorted(tests):
            return None
    except ValueError:
        return None
    if not isinstance(path, str) or not isinstance(sym, str):
        return None
    if section == "orphan-protected":
        m = re.fullmatch(r" token=(\S+)", rest)
        return (path, sym, test_only, tuple(tests), m.group(1)) if m else None
    return (path, sym, test_only, tuple(tests)) if rest == "" else None


def parse_other(section, rest):
    """literal-variants / signals / protected-churn lines (slices already stripped)."""
    try:
        path, rest = split_path(rest)
    except ValueError:
        return None
    if section == "literal-variants":
        m = re.fullmatch(r" groups=(\d+)", rest)
        return (path, int(m.group(1))) if m else None
    if section == "protected-churn":
        m = re.fullmatch(r" churn=(\d+) token=(\S+)", rest)
        return (path, int(m.group(1)), m.group(2)) if m else None
    m = re.fullmatch(r"( source-text)?(?: churn=(\d+))?(?: widened=(\d+))?", rest)
    if not m or rest == "":
        return None
    return (path, m.group(1) is not None,
            None if m.group(2) is None else int(m.group(2)),
            None if m.group(3) is None else int(m.group(3)))


def census(repo, sha, mem, *extra, env=None):
    r = run_tool("census", "--repo", repo.path, "--at", sha, "--mem", mem, *extra, env=env)
    for line in r.out.splitlines():
        line = line.rstrip("\r")
        if line.startswith("PRUNE-CENSUS "):
            r.commit = line[len("PRUNE-CENSUS "):]
        elif line.startswith("totals "):
            parts = line.split(" ")
            if len(parts) >= 2:
                r.totals[parts[1]] = kv(parts[2:])
        elif line.startswith("duplicates ") or line.startswith("protected-twins "):
            base, sl = split_slices(line)
            row = parse_row(base)
            r.rows.append(row if row is not None else ("malformed", line, None, None, None))
            if row is not None and sl is not None:
                r.slices[(row[0], row[1], row[2])] = sl
        elif line.startswith(("orphans ", "orphan-protected ")):
            section, rest = line.split(" ", 1)
            base, sl = split_slices(rest)
            row = parse_orphan(section, base)
            if row is None:
                r.bad.append(line)
            else:
                (r.orph if section == "orphans" else r.orph_prot).append(row)
                if sl is not None:
                    r.slices[(section, row[0], row[1])] = sl
        elif line.startswith(("literal-variants ", "signals ", "protected-churn ")):
            section, rest = line.split(" ", 1)
            base, sl = split_slices(rest)
            row = parse_other(section, base)
            if row is None:
                r.bad.append(line)
            else:
                {"literal-variants": r.lv, "signals": r.sig, "protected-churn": r.pchurn}[section].append(row)
                if sl is not None:
                    r.slices[(section, row[0], "")] = sl
        elif line.startswith("ci "):
            r.ci = kv(line.split(" ")[1:])
        elif line.startswith("counts "):
            r.counts = kv(line.split(" ")[1:])
        elif line.startswith("recorded "):
            r.recorded = line[len("recorded "):]
    return r


def twin(repo, sha, mem, path, test, survivor):
    return run_tool("twin", "--repo", repo.path, "--at", sha, "--mem", mem,
                    "--file", path, "--test", test, "--survivor", survivor)


def keep(repo, sha, mem, path, test, reason):
    return run_tool("keep", "--repo", repo.path, "--at", sha, "--mem", mem,
                    "--file", path, "--test", test, "--reason", reason)


def D(path, cand, surv):
    return ("duplicates", path, cand, surv, None)


def P(path, cand, surv, token):
    return ("protected-twins", path, cand, surv, token)


def rkey(row):
    return tuple("" if x is None else str(x) for x in row)


def srt(rows):
    return sorted(rows, key=rkey)


def rows_of(res, path):
    return [r for r in res.rows if r[1] == path]


def naming(res, path, names):
    names = set(names)
    return [r for r in res.rows if r[1] == path and (r[2] in names or r[3] in names)]


def counts(dup, prot, ios, kept, unparsed):
    return {"duplicates": str(dup), "protected-twins": str(prot),
            "identical-other-scope": str(ios), "kept": str(kept), "unparsed": str(unparsed)}


def ratio(test_lines, product_lines):
    return "n/a" if product_lines == 0 else "%.2f" % (test_lines / product_lines)


def strs(d):
    return {k: str(v) for k, v in d.items()}


def read_json(path):
    with open(path, "rb") as f:
        return json.loads(f.read().decode("utf-8"))


def read_bytes(path):
    if not os.path.isfile(path):
        return None
    with open(path, "rb") as f:
        return f.read()


def warned(res, path):
    return ("PRUNE-WARN unlexable " + path) in [l.strip() for l in res.err.splitlines()]


def refused(res):
    """Exit 2 with a PRUNE-ERROR line on stderr and no census output."""
    return (res.rc == 2 and any(l.startswith("PRUNE-ERROR") for l in res.err.splitlines())
            and "PRUNE-CENSUS" not in res.out)


def pkg(res, name, keys=("tests", "unparsed")):
    return {k: res.totals.get(name, {}).get(k) for k in keys}


def census_of(*files):
    """A fresh repo holding (path, bytes) files, one commit, one census."""
    repo = Repo()
    for rel, data in files:
        repo.put(rel, data)
    return census(repo, repo.commit(), new_mem())


# --------------------------------------------------------------------------------------------
# checks
# --------------------------------------------------------------------------------------------


def show(x):
    s = repr(x)
    return s if len(s) <= 900 else s[:900] + "...(%d chars)" % len(s)


class Ctx:
    def __init__(self, cid):
        self.id = cid
        self.n = 0
        self.failed = 0

    def check(self, name, ok, expected, got, res=None):
        self.n += 1
        if ok:
            return True
        self.failed += 1
        msg = "FAIL %s %s: expected %s; got %s" % (self.id, name, show(expected), show(got))
        if res is not None:
            msg += " [exit %s]" % res.rc
            for line in res.out.splitlines()[-12:]:
                msg += "\n    stdout| " + line
            for line in res.err.splitlines()[-8:]:
                msg += "\n    stderr| " + line
        print(msg, flush=True)
        return False

    def crash(self):
        self.n += 1
        self.failed += 1
        tb = traceback.format_exc().rstrip().splitlines()
        print("FAIL %s fixture runs to its end: raised %s" % (self.id, tb[-1]), flush=True)
        for line in tb[-8:-1]:
            print("    trace| " + line, flush=True)


# --------------------------------------------------------------------------------------------
# shared paths and the positive control
# --------------------------------------------------------------------------------------------

CONTROL = "client/src/ui/control.test.ts"
CTRL_T = "stack > push then pop returns the item again"
CTRL_S = "stack > push then pop returns the item"
CTRL = D(CONTROL, CTRL_T, CTRL_S)

DMG = "game-core/src/battle/damage_tests.rs"
BRK = "client/src/ui/broken.test.ts"


def rs_lines(n):
    return "".join("pub fn f%d() {}\n" % i for i in range(n))


def ts_lines(n):
    return "".join("export const v%d = %d;\n" % (i, i) for i in range(n))


INLINE_MOD = """pub fn heal(x: u32) -> u32 {
    x + 1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn heals() {
        assert_eq!(heal(1), 2);
    }
}
"""


# --------------------------------------------------------------------------------------------
# fixtures, one per criterion
# --------------------------------------------------------------------------------------------


def tp1_a1(ctx):
    q = "client/src/ui/queue.test.ts"
    repo = Repo()
    repo.fixture(q, "a1_queue.test.ts")
    repo.fixture(DMG, "a1_damage_tests.rs")
    res = census(repo, repo.commit(), new_mem())
    base = "queue > when empty > length is zero"
    exp_ts = [D(q, base + " after creation", base), D(q, base + " once more", base)]
    exp_rs = [D(DMG, "top_b", "top_a"), D(DMG, "outer::inner_a::second", "outer::inner_a::first")]
    ctx.check("TS twins in one nested describe (comments and spacing differ) print one row per later copy, earliest as survivor",
              rows_of(res, q) == exp_ts, exp_ts, rows_of(res, q), res)
    ctx.check("Rust twins at file level and in one nested mod (comments, spacing, doc comment differ) print one row each, later as candidate",
              rows_of(res, DMG) == exp_rs, exp_rs, rows_of(res, DMG), res)
    sib = naming(res, q, ["queue > second block > length is zero"]) + naming(res, DMG, ["outer::inner_b::first"])
    ctx.check("a copy in a sibling describe or sibling mod prints no row in either section",
              sib == [], [], sib, res)
    ctx.check("twin pairs print no other row",
              srt(res.rows) == srt(exp_ts + exp_rs), srt(exp_ts + exp_rs), res.rows, res)
    exp_c = counts(4, 0, 2, 0, 0)
    ctx.check("counts: 4 duplicates and the 2 sibling-block copies under identical-other-scope",
              res.counts == exp_c, exp_c, res.counts, res)


def tp1_a2(ctx):
    ren = "client/src/ui/renameModel.test.ts"
    lit = "client/src/ui/literals.test.ts"
    lrs = "game-core/src/text/literal_tests.rs"
    repo = Repo()
    repo.fixture(ren, "a2_renameModel.test.ts")
    repo.fixture(lit, "a2_literals.test.ts")
    repo.fixture(lrs, "a2_literal_tests.rs")
    res = census(repo, repo.commit(), new_mem())

    def f(*titles):
        return ["format > " + t for t in titles]

    ctx.check("whitespace inside a string literal ('   ' against '') keeps the renameModel bodies apart",
              rows_of(res, ren) == [], [], rows_of(res, ren), res)
    for name, path, names in (
        ("a TS string literal differing by inner whitespace, in either order, prints no row", lit,
         f("pads a spaced word", "pads a doubly spaced word", "pads c d doubly", "pads c d singly")),
        ("a template literal differing by inner whitespace, with and without ${}, prints no row", lit,
         f("labels with a template", "labels with a wider template", "labels a plain wide template",
           "labels a plain template")),
        ("a TS numeric literal differing in value or only in source text (1.50 vs 1.5) prints no row", lit,
         f("scales two", "scales three", "scales one and a half, long form", "scales one and a half")),
        ("a Rust string literal differing by inner whitespace, in either order, prints no row", lrs,
         ["spaced_a", "spaced_b", "spaced_c", "spaced_d"]),
        ("a Rust numeric literal differing in value or only in source text prints no row", lrs,
         ["scaled_a", "scaled_b", "scaled_c", "scaled_d"]),
        ("a Rust character literal difference prints no row", lrs, ["char_a", "char_b"]),
    ):
        got = naming(res, path, names)
        ctx.check(name, got == [], [], got, res)
    exp = srt([D(lit, "format > trims a word twice", "format > trims a word"), D(lrs, "same_b", "same_a")])
    ctx.check("identical literals in one block still print their row (TS and Rust), and nothing else prints",
              srt(res.rows) == exp, exp, res.rows, res)
    exp_c = counts(2, 0, 0, 0, 0)
    ctx.check("counts: only the two identical-literal pairs are duplicates",
              res.counts == exp_c, exp_c, res.counts, res)
    a2_lexer_traps(ctx)


def a2_lexer_traps(ctx):
    rt = "client/src/ui/regexTrap.test.ts"
    tt = "client/src/ui/traps.test.ts"
    rr = "game-core/src/text/traps_tests.rs"
    repo = Repo()
    repo.fixture(rt, "a2_regex_trap.test.ts")
    repo.fixture(tt, "a2_ts_traps.test.ts")
    repo.fixture(rr, "a2_rs_traps_tests.rs")
    sha = repo.commit()
    mem = new_mem()
    res = census(repo, sha, mem)
    ctx.check("regex literals holding comment openers inside ${} do not hide a launch(1)/launch(2) difference: no row",
              rows_of(res, rt) == [], [], rows_of(res, rt), res)
    r = twin(repo, sha, mem, rt, "launch > b", "launch > a")
    ctx.check("twin does not confirm the launch(1)/launch(2) pair",
              r.rc == 1 and r.first.startswith("PRUNE-TWIN-FAIL "), "PRUNE-TWIN-FAIL ... / exit 1", r.first, r)
    exp_tt = [D(tt, "traps > control again", "traps > control")]
    ctx.check("TS bodies differing only inside a regex, after // in a string or inside a nested template print no row; the true pair prints",
              rows_of(res, tt) == exp_tt, exp_tt, rows_of(res, tt), res)
    exp_rr = [D(rr, "control_again", "control")]
    ctx.check("Rust bodies differing only in a raw string, a char literal, after a nested block comment or on a lifetime line print no row; the pair differing only inside nested comments prints",
              rows_of(res, rr) == exp_rr, exp_rr, rows_of(res, rr), res)
    ctx.check("the TS and Rust lexer-trap files stay lexable (no PRUNE-WARN unlexable)",
              not warned(res, tt) and not warned(res, rr), "no warning for either file", res.err, res)


def tp1_a3(ctx):
    box = "client/src/ui/boxView.test.ts"
    evo = "client/src/ui/evolutionView.test.ts"
    tog = "client/src/ui/toggleTwin.test.ts"
    repo = Repo()
    repo.fixture(box, "a3_boxView.test.ts")
    repo.fixture(evo, "a3_evolutionView.test.ts")
    repo.fixture(tog, "a3_toggleTwin.test.ts")
    res = census(repo, repo.commit(), new_mem())
    cross = rows_of(res, box) + rows_of(res, evo)
    ctx.check("one body in two files (boxView, evolutionView TOGGLE) prints no row for either file",
              cross == [], [], cross, res)
    exp = [D(tog, "PanelView toggle > toggle opens then closes, second copy",
             "PanelView toggle > toggle opens then closes")]
    ctx.check("the same body twice in one file prints its row, and nothing else prints",
              res.rows == exp, exp, res.rows, res)
    exp_c = counts(1, 0, 0, 0, 0)
    ctx.check("counts: copies in other files are not identical-other-scope",
              res.counts == exp_c, exp_c, res.counts, res)


def tp1_a4(ctx):
    cam = "client/src/render/camera.test.ts"
    repo = Repo()
    repo.fixture(cam, "a4_camera.test.ts")
    repo.fixture(CONTROL, "control.test.ts")
    res = census(repo, repo.commit(), new_mem())
    ctx.check("one camera body in two describes (differing only in comments) prints no row in either section",
              rows_of(res, cam) == [], [], rows_of(res, cam), res)
    ctx.check("the twin pair in another file of the commit still prints, and nothing else",
              res.rows == [CTRL], [CTRL], res.rows, res)
    exp_c = counts(1, 0, 1, 0, 0)
    ctx.check("the camera pair counts 1 under identical-other-scope",
              res.counts == exp_c, exp_c, res.counts, res)


def tp1_a5(ctx):
    reg = "client/src/render/art/registry.test.ts"
    each = "client/src/render/art/eachTwin.test.ts"
    att = "game-core/tests/attrs.rs"
    repo = Repo()
    repo.fixture(reg, "a5_registry.test.ts")
    repo.fixture(each, "a5_eachTwin.test.ts")
    repo.fixture(att, "a5_attrs.rs")
    res = census(repo, repo.commit(), new_mem())
    ctx.check("it.each tests with token-identical callbacks and different case tables print no row",
              rows_of(res, reg) == [], [], rows_of(res, reg), res)
    got = naming(res, each, ["sizes > halves four", "sizes > halves four with test()"])
    ctx.check("one body under it() and under test() prints no row", got == [], [], got, res)
    got = naming(res, att, ["plain", "panics_x", "panics_y"])
    ctx.check("Rust tests with one body and different attribute lists (incl. attribute arguments) print no row",
              got == [], [], got, res)
    exp_each = [D(each, "sizes > doubles %s again", "sizes > doubles %s")]
    ctx.check("it.each twins with one case table print their row",
              rows_of(res, each) == exp_each, exp_each, rows_of(res, each), res)
    exp_att = [D(att, "ignored_b", "ignored_a")]
    ctx.check("Rust twins with the same attribute list print their row (game-core/tests/*.rs is eligible)",
              rows_of(res, att) == exp_att, exp_att, rows_of(res, att), res)
    ctx.check("no other row prints", srt(res.rows) == srt(exp_each + exp_att),
              srt(exp_each + exp_att), res.rows, res)
    exp_c = counts(2, 0, 0, 0, 0)
    ctx.check("counts: 2 duplicates", res.counts == exp_c, exp_c, res.counts, res)
    te = "client/src/ui/typedEach.test.ts"
    res = census_of((te, fixture_bytes("a5_typedEach.test.ts")))
    exp = [D(te, "pairs > joins %s again", "pairs > joins %s")]
    ctx.check("it.each<T> twins with one type argument list and table print one row; other type arguments or another table print none",
              res.rows == exp, exp, res.rows, res)
    got = pkg(res, "client")
    ctx.check("all four it.each<T> tests are counted as tests",
              got == {"tests": "4", "unparsed": "0"}, {"tests": "4", "unparsed": "0"}, got, res)


def tp1_a6(ctx):
    snap = "client/src/ui/snap.test.ts"
    srs = "game-core/src/ui/snap_tests.rs"
    repo = Repo()
    repo.fixture(snap, "a6_snap.test.ts")
    repo.fixture(srs, "a6_snap_tests.rs")
    res = census(repo, repo.commit(), new_mem())
    for marker, path, names in (
        ("toMatchSnapshot", snap, ["card > draws, snapshot", "card > draws, snapshot copy"]),
        ("currentTestName", snap, ["card > reads the current name", "card > reads the current name copy"]),
        ("expect.getState", snap, ["card > reads the state", "card > reads the state copy"]),
        ("function_name!", srs, ["named", "named_copy"]),
        ("insta::", srs, ["snapshotted", "snapshotted_copy"]),
    ):
        got = naming(res, path, names)
        ctx.check("a twin pair whose body uses %s prints no row in either section" % marker,
                  got == [], [], got, res)
    exp = srt([D(snap, "card > mentions markers only in a comment, copy",
                 "card > mentions markers only in a comment"),
               D(srs, "mention_copy", "mention")])
    ctx.check("a marker named only in a comment does not stop the row (TS and Rust), and nothing else prints",
              srt(res.rows) == exp, exp, res.rows, res)
    exp_c = counts(2, 0, 0, 0, 0)
    ctx.check("counts: name-dependent pairs are not duplicates", res.counts == exp_c, exp_c, res.counts, res)
    gold = "client/src/ui/golden.test.ts"
    known = "game-core/src/text/known_tests.rs"
    res = census_of((gold, fixture_bytes("a6_golden.test.ts")), (known, fixture_bytes("a6_known_tests.rs")))
    exp = [D(gold, "golden > reads the table again", "golden > reads the table")]
    ctx.check("a twin pair reading task.name prints no row; the plain pair beside it does",
              rows_of(res, gold) == exp, exp, rows_of(res, gold), res)
    exp = [D(known, "table_b", "table_a")]
    ctx.check("a twin pair using line!() prints no row; the plain pair beside it does",
              rows_of(res, known) == exp, exp, rows_of(res, known), res)


def tp1_a7(ctx):
    own = "client/src/ui/OwnerCard.test.ts"
    pan = "client/src/ui/panelNames.test.ts"
    lif = "server-module/src/trade/lifecycle_tests.rs"
    repo = Repo()
    repo.fixture(own, "a7_ownerCard.test.ts")
    repo.fixture(pan, "a7_panelNames.test.ts")
    repo.fixture(lif, "a7_lifecycle_tests.rs")
    repo.fixture(CONTROL, "control.test.ts")
    res = census(repo, repo.commit(), new_mem())
    p_path = P(own, "card > shows the title, repeated", "card > shows the title", "owner")
    p_cand = P(pan, "panel > opens on click (Locale switch)", "panel > opens on click", "locale")
    p_surv = P(pan, "panel > keeps the panel shut", "panel > GUARD keeps the Auth panel shut", "auth")
    p_rust = P(lif, "opens_once_again", "opens_once", "lifecycle")
    for name, row in (
        ("a token in the path, matched case-insensitively (OwnerCard), moves the row to protected-twins with token=owner", p_path),
        ("a token only in the candidate's name moves the row to protected-twins with token=locale", p_cand),
        ("a token only in the survivor's name moves the row; token= is the first in list order (auth before guard)", p_surv),
        ("a token in a Rust test file's path moves the row to protected-twins with token=lifecycle", p_rust),
    ):
        ctx.check(name, row in res.rows, row, res.rows, res)
    dup = [r for r in res.rows if r[0] == "duplicates" and r[1] != CONTROL]
    ctx.check("a protected pair prints no duplicates row", dup == [], [], dup, res)
    exp = srt([p_path, p_cand, p_surv, p_rust, CTRL])
    ctx.check("the unprotected pair beside them stays in duplicates, and nothing else prints",
              srt(res.rows) == exp, exp, res.rows, res)
    exp_c = counts(1, 4, 0, 0, 0)
    ctx.check("counts: 1 duplicate, 4 protected-twins", res.counts == exp_c, exp_c, res.counts, res)


def tp1_a8(ctx):
    loop = "client/src/ui/loops.test.ts"
    prp = "game-core/src/battle/roll_tests.rs"
    repo = Repo()
    repo.fixture(loop, "a8_loops.test.ts")
    repo.fixture(BRK, "a8_broken.test.ts")
    repo.fixture(prp, "a8_proptest_tests.rs")
    repo.fixture(CONTROL, "control.test.ts")
    res = census(repo, repo.commit(), new_mem())
    cl = {k: res.totals.get("client", {}).get(k) for k in ("tests", "unparsed")}
    ctx.check("a loop-built test and the unlexable file's test lines are counted unparsed, not as tests (client)",
              cl == {"tests": "5", "unparsed": "4"}, {"tests": "5", "unparsed": "4"}, cl, res)
    gc = {k: res.totals.get("game-core", {}).get(k) for k in ("tests", "unparsed")}
    ctx.check("tests inside proptest! are counted unparsed, not as tests (game-core)",
              gc == {"tests": "2", "unparsed": "2"}, {"tests": "2", "unparsed": "2"}, gc, res)
    exp_loop = [D(loop, "grid > fills a row again", "grid > fills a row")]
    ctx.check("no row names the loop-built test; the lexed pair in its file still prints",
              rows_of(res, loop) == exp_loop, exp_loop, rows_of(res, loop), res)
    exp_prp = [D(prp, "fixed_roll_again", "fixed_roll")]
    ctx.check("no row names a proptest! test; the lexed pair in its file still prints",
              rows_of(res, prp) == exp_prp, exp_prp, rows_of(res, prp), res)
    ctx.check("an unlexable file prints no row, though it holds a twin pair",
              rows_of(res, BRK) == [], [], rows_of(res, BRK), res)
    warn = "PRUNE-WARN unlexable " + BRK
    ctx.check("an unlexable file is named on stderr",
              warn in [l.strip() for l in res.err.splitlines()], warn, res.err, res)
    exp = srt(exp_loop + exp_prp + [CTRL])
    ctx.check("a twin pair in another file of the same commit still prints, and nothing else",
              srt(res.rows) == exp, exp, res.rows, res)
    exp_c = counts(3, 0, 0, 0, 6)
    ctx.check("counts.unparsed is the packages' sum (4 + 2)", res.counts == exp_c, exp_c, res.counts, res)
    a8_lexer_counts(ctx)


NOT_UTF8 = (b"describe('bytes', () => {\n  it('one', () => {\n    expect(f('\xff')).toBe(1);\n  });\n\n"
            b"  it('one again', () => {\n    expect(f('\xff')).toBe(1);\n  });\n});\n")


def a8_lexer_counts(ctx):
    cm = "client/src/ui/commented.test.ts"
    res = census_of((cm, fixture_bytes("a8_commented.test.ts")))
    got = pkg(res, "client")
    exp = {"tests": "0", "unparsed": "3"}
    ctx.check("a test-shaped line inside a block comment makes the file unlexable: no row, unparsed = its 3 test-shaped lines",
              res.rows == [] and got == exp, ([], exp), (res.rows, got), res)
    ctx.check("that file is named on stderr as unlexable", warned(res, cm), "PRUNE-WARN unlexable " + cm,
              res.err, res)

    tg = "client/src/ui/tagged.test.ts"
    res = census_of((tg, fixture_bytes("a8_tagged.test.ts")))
    exp = ([D(tg, "sums > adds one and two again", "sums > adds one and two")], {"tests": "2", "unparsed": "1"}, False)
    got = (res.rows, pkg(res, "client"), warned(res, tg))
    ctx.check("a tagged-template it.each table counts 1 unparsed and its file stays lexed (the twin pair prints, no warning)",
              got == exp, exp, got, res)

    mc = "game-core/src/battle/macro_tests.rs"
    res = census_of((mc, fixture_bytes("a8_macro_tests.rs")))
    exp = ([D(mc, "real_b", "real_a")], {"tests": "2", "unparsed": "1"}, False)
    got = (res.rows, pkg(res, "game-core"), warned(res, mc))
    ctx.check("a #[test] fn inside macro_rules! counts 1 unparsed and its file stays lexed (the twin pair prints, no warning)",
              got == exp, exp, got, res)

    bad = "client/src/ui/bytes.test.ts"
    res = census_of((bad, NOT_UTF8), (CONTROL, fixture_bytes("control.test.ts")))
    ctx.check("a test file that is not valid UTF-8 prints no row; the pair in another file prints",
              res.rows == [CTRL], [CTRL], res.rows, res)
    exp = ({"tests": "2", "unparsed": "2"}, True)
    got = (pkg(res, "client"), warned(res, bad))
    ctx.check("the non-UTF-8 file is unlexable: its 2 test lines count unparsed and it is named on stderr",
              got == exp, exp, got, res)

    iv = "client/src/ui/itVar.test.ts"
    res = census_of((iv, fixture_bytes("a8_itVar.test.ts")))
    exp = ([D(iv, "helper > reads a key again", "helper > reads a key")], {"tests": "2", "unparsed": "0"})
    got = (res.rows, pkg(res, "client"))
    ctx.check("a file-level variable named it adds nothing to unparsed; the twin pair prints",
              got == exp, exp, got, res)


KEPT = "client/src/ui/kept.test.ts"
KEPT_T = "stack > push then pop, run twice"
KEPT_S1 = "stack > push then pop returns the item"
KEPT_S2 = "stack > pop on empty gives undefined"
REASON = "a second run after the first, on purpose"


def tp1_a9(ctx):
    repo = Repo()
    repo.fixture(KEPT, "a9_kept_v1.test.ts")
    repo.fixture(CONTROL, "control.test.ts")
    sha = repo.commit()
    mem = new_mem()
    r0 = census(repo, sha, mem)
    row = D(KEPT, KEPT_T, KEPT_S1)
    ctx.check("before keep the candidate prints its row and kept=0",
              row in r0.rows and (r0.counts or {}).get("kept") == "0", row, (r0.rows, r0.counts), r0)
    rk = keep(repo, sha, mem, KEPT, KEPT_T, REASON)
    m = re.fullmatch(r'PRUNE-KEEP-OK (\S+) :: (".*") hash=([0-9a-f]{16})', rk.first)
    name_ok = False
    if m:
        try:
            name_ok = json.loads(m.group(2)) == KEPT_T
        except ValueError:
            name_ok = False
    ctx.check("keep prints PRUNE-KEEP-OK with the file, the JSON name and a 16-hex hash, exit 0",
              rk.rc == 0 and bool(m) and m.group(1) == KEPT and name_ok,
              "PRUNE-KEEP-OK %s :: %s hash=<16 hex>" % (KEPT, json.dumps(KEPT_T)), rk.first, rk)
    h = m.group(3) if m else None
    kpath = os.path.join(mem, "mr-prune-keep.json")
    got = read_json(kpath) if os.path.isfile(kpath) else None
    exp = {KEPT: {KEPT_T: {"hash": h, "reason": REASON}}}
    ctx.check("the keep file holds the file, the name, the printed hash and the reason",
              h is not None and got == exp, exp, got, rk)
    r1 = census(repo, sha, mem)
    ctx.check("a kept candidate's row is omitted while the twin pair in another file still prints",
              r1.rows == [CTRL], [CTRL], r1.rows, r1)
    exp_c = counts(1, 0, 0, 1, 0)
    ctx.check("the kept candidate adds one to kept", r1.counts == exp_c, exp_c, r1.counts, r1)
    a9_refusals(ctx)


def a9_refusals(ctx):
    repo = Repo()
    repo.fixture(KEPT, "a9_kept_v1.test.ts")
    repo.fixture(CONTROL, "control.test.ts")
    sha = repo.commit()
    mem = new_mem()
    kpath = os.path.join(mem, "mr-prune-keep.json")
    r = keep(repo, sha, mem, KEPT, KEPT_S2, REASON)
    want = "PRUNE-KEEP-FAIL not-a-candidate"
    ctx.check("keep refuses a test with no earlier twin: not-a-candidate, exit 1, no keep file written",
              r.rc == 1 and r.first == want and not os.path.exists(kpath), want, (r.first, os.path.exists(kpath)), r)
    r = keep(repo, sha, mem, KEPT, "stack > no such test", REASON)
    want = "PRUNE-KEEP-FAIL missing"
    ctx.check("keep refuses an absent test name: missing, exit 1, no keep file written",
              r.rc == 1 and r.first == want and not os.path.exists(kpath), want, (r.first, os.path.exists(kpath)), r)
    corrupt = b"not json\n"
    with open(kpath, "wb") as f:
        f.write(corrupt)
    r = keep(repo, sha, mem, KEPT, KEPT_T, REASON)
    want = "PRUNE-KEEP-FAIL keep-file-unreadable"
    after = read_bytes(kpath)
    ctx.check("keep refuses an unreadable keep file: keep-file-unreadable, exit 1, the file byte-identical",
              r.rc == 1 and r.first == want and after == corrupt, (want, corrupt), (r.first, after), r)
    r = census(repo, sha, mem)
    ctx.check("census with an unreadable keep file exits 0, prints the candidate's row and kept=0",
              r.rc == 0 and D(KEPT, KEPT_T, KEPT_S1) in r.rows and (r.counts or {}).get("kept") == "0",
              (D(KEPT, KEPT_T, KEPT_S1), "kept=0"), (r.rows, r.counts), r)


def tp1_a10(ctx):
    repo = Repo()
    repo.fixture(KEPT, "a9_kept_v1.test.ts")
    repo.fixture(CONTROL, "control.test.ts")
    sha1 = repo.commit()
    mem = new_mem()
    rk = keep(repo, sha1, mem, KEPT, KEPT_T, REASON)
    repo.fixture(KEPT, "a9_kept_v2.test.ts")
    sha2 = repo.commit()
    r2 = census(repo, sha2, mem)
    exp = srt([D(KEPT, KEPT_T, KEPT_S2), CTRL])
    ctx.check("after the kept candidate's body changes its row prints again, against the twin it now matches",
              rk.rc == 0 and srt(r2.rows) == exp, exp, ("keep exit %s" % rk.rc, r2.rows), r2)
    exp_c = counts(2, 0, 0, 0, 0)
    ctx.check("a keep entry with a stale hash adds nothing to kept", r2.counts == exp_c, exp_c, r2.counts, r2)
    r1 = census(repo, sha1, mem)
    ctx.check("at the commit whose hash was recorded the row stays omitted (kept=1)",
              rk.rc == 0 and r1.rows == [CTRL] and (r1.counts or {}).get("kept") == "1",
              ([CTRL], "kept=1"), (r1.rows, r1.counts), r1)

    # keeping a second candidate keeps the first entry
    mem2 = new_mem()
    ka = keep(repo, sha1, mem2, KEPT, KEPT_T, REASON)
    kb = keep(repo, sha1, mem2, CONTROL, CTRL_T, REASON)
    kpath = os.path.join(mem2, "mr-prune-keep.json")
    got = read_json(kpath) if os.path.isfile(kpath) else None
    entries = None
    if isinstance(got, dict) and all(isinstance(v, dict) for v in got.values()):
        entries = sorted((f, n) for f, names in got.items() for n in names)
    exp = sorted([(KEPT, KEPT_T), (CONTROL, CTRL_T)])
    ctx.check("keeping a second candidate leaves the first entry: two entries in the keep file",
              ka.rc == 0 and kb.rc == 0 and entries == exp, exp, (ka.first, kb.first, got), kb)
    r = census(repo, sha1, mem2)
    exp_c = counts(0, 0, 0, 2, 0)
    ctx.check("both kept candidates are omitted and counted (kept=2)",
              r.rows == [] and r.counts == exp_c, ([], exp_c), (r.rows, r.counts), r)


def tp1_a11(ctx):
    auth = "client/src/ui/authBadge.test.ts"
    auth_t, auth_s = "card > shows the title, repeated", "card > shows the title"
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    repo.fixture(auth, "a7_ownerCard.test.ts")
    repo.fixture(DMG, "a1_damage_tests.rs")
    sha = repo.commit()
    mem = new_mem()
    r = twin(repo, sha, mem, CONTROL, CTRL_T, CTRL_S)
    ctx.check("a plain TS twin pair is confirmed: PRUNE-TWIN-OK, exit 0",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK", "PRUNE-TWIN-OK", r.first, r)
    r = twin(repo, sha, mem, DMG, "outer::inner_a::second", "outer::inner_a::first")
    ctx.check("a Rust twin pair in a nested mod is confirmed by its :: names",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK", "PRUNE-TWIN-OK", r.first, r)
    r = twin(repo, sha, mem, auth, auth_t, auth_s)
    ctx.check("a protected pair is still a twin: PRUNE-TWIN-OK protected=auth, exit 0",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK protected=auth", "PRUNE-TWIN-OK protected=auth", r.first, r)
    rk = keep(repo, sha, mem, CONTROL, CTRL_T, REASON)
    r = twin(repo, sha, mem, CONTROL, CTRL_T, CTRL_S)
    ctx.check("a kept pair is still a twin: PRUNE-TWIN-OK kept, exit 0",
              rk.rc == 0 and r.rc == 0 and r.first == "PRUNE-TWIN-OK kept",
              "keep exit 0, then PRUNE-TWIN-OK kept", ("keep exit %s" % rk.rc, r.first), r)
    rk = keep(repo, sha, mem, auth, auth_t, REASON)
    r = twin(repo, sha, mem, auth, auth_t, auth_s)
    ctx.check("a protected kept pair: PRUNE-TWIN-OK protected=auth kept, exit 0",
              rk.rc == 0 and r.rc == 0 and r.first == "PRUNE-TWIN-OK protected=auth kept",
              "keep exit 0, then PRUNE-TWIN-OK protected=auth kept", ("keep exit %s" % rk.rc, r.first), r)

    st = "client/src/ui/sameTitle.test.ts"
    repo = Repo()
    repo.fixture(st, "a11_sameTitle.test.ts")
    sha = repo.commit()
    mem = new_mem()
    res = census(repo, sha, mem)
    exp = [D(st, "menu > opens #2", "menu > opens")]
    ctx.check("a repeated title gets ' #2': the row names 'menu > opens #2' as candidate of 'menu > opens'",
              res.rows == exp, exp, res.rows, res)
    r = twin(repo, sha, mem, st, "menu > opens #2", "menu > opens")
    ctx.check("twin confirms the pair by its ' #2' name: PRUNE-TWIN-OK, exit 0",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK", "PRUNE-TWIN-OK", r.first, r)


def tp1_a12(ctx):
    rules = "client/src/ui/rules.test.ts"
    repo = Repo()
    repo.fixture(rules, "a12_rules.test.ts")
    repo.fixture(BRK, "a8_broken.test.ts")
    repo.put("client/src/main.ts", ts_lines(3))
    sha = repo.commit()
    mem = new_mem()
    f1, f2 = "rules > first > ", "rules > second > "
    for name, path, t, s, expect in (
        ("a file absent at the commit fails as missing", "client/src/ui/absent.test.ts",
         f1 + "base copy", f1 + "base", "missing"),
        ("a file present at the commit but not an eligible test file fails as missing", "client/src/main.ts",
         f1 + "base copy", f1 + "base", "missing"),
        ("a test name absent from the file fails as missing", rules, f1 + "no such test", f1 + "base", "missing"),
        ("a pair in an unlexable file fails as unparsed", BRK, "broken > two again", "broken > two", "unparsed"),
        ("one test given as both candidate and survivor fails as same-test", rules, f1 + "base", f1 + "base",
         "same-test"),
        ("a pair in different blocks fails on block", rules, f2 + "base", f1 + "base", "block"),
        ("a pair under it() and test() fails on form", rules, f1 + "other form", f1 + "base", "form"),
        ("a pair with different bodies fails on body", rules, f1 + "other body", f1 + "base", "body"),
        ("a pair reading its own name (toMatchSnapshot) fails on name-dependent", rules, f1 + "snap b",
         f1 + "snap a", "name-dependent"),
        ("a candidate defined before its survivor fails on order", rules, f1 + "base", f1 + "base copy",
         "order"),
        ("a pair breaking two rules names both, in rule order", rules, f2 + "other", f1 + "base",
         "block body"),
    ):
        r = twin(repo, sha, mem, path, t, s)
        want = "PRUNE-TWIN-FAIL " + expect
        ctx.check(name + " (exit 1)", r.rc == 1 and r.first == want, want + " / exit 1", r.first, r)


def tp1_a13(ctx):
    repo = Repo()
    control = fixture_bytes("control.test.ts")
    main_ts = ts_lines(120)
    repo.put("client/src/main.ts", main_ts)
    repo.put("client/src/ui/view.test.ts", control)
    sha1 = repo.commit("client only")

    gc_lib, gc_build, gc_t1, gc_t2 = rs_lines(150), rs_lines(10), fixture_bytes("a1_damage_tests.rs"), \
        fixture_bytes("a8_proptest_tests.rs")
    sm_lib = rs_lines(80) + "#[cfg(test)]\nmod trade_tests;\n"
    sm_t = fixture_bytes("a7_lifecycle_tests.rs")
    view_ts = ts_lines(60)[:-1]  # last line without a newline: 59 lines by wc -l
    files = {
        # game-core: product, tests, and files that are neither
        "game-core/src/lib.rs": gc_lib,
        "game-core/build.rs": gc_build,
        "game-core/src/combat/mod.rs": INLINE_MOD,
        "game-core/src/combat/combat_tests.rs": gc_t1,
        "game-core/tests/flow.rs": gc_t2,
        "game-core/tests/helpers/mod.rs": rs_lines(30),
        "game-core/benches/speed.rs": rs_lines(40),
        # server-module
        "server-module/src/lib.rs": sm_lib,
        "server-module/src/trade/trade_tests.rs": sm_t,
        "server-module/tests/it.rs": rs_lines(25),
        "server-module/benches/b.rs": rs_lines(5),
        # client
        "client/src/ui/view.ts": view_ts,
        "client/src/module_bindings/types.ts": ts_lines(500),
        "client/vite.config.ts": ts_lines(7),
        "client/e2e/a.spec.ts": ts_lines(3),
        "client/e2e/flows/b.spec.ts": ts_lines(3),
        "client/e2e/helper.ts": ts_lines(3),
        "client/test-util/fake.ts": ts_lines(4),
        "client/test-util/x/deep.ts": ts_lines(4),
        # repository-level out of scope
        "evals/a.eval.mjs": "export {};\n",
        "evals/sub/b.eval.mjs": "export {};\n",
        "evals/lib.mjs": "export {};\n",
        "sim-harness/src/main.rs": "fn main() {}\n",
        "sim-harness/x.rs": "fn x() {}\n",
        "sim-harness/Cargo.toml": "[package]\n",
        "client-wasm/src/lib.rs": "pub fn w() {}\n",
        "client-wasm/Cargo.toml": "[package]\n",
    }
    for rel, data in files.items():
        repo.put(rel, data)
    repo.link("client/src/ui/link.test.ts", "view.test.ts")  # a symlink blob is not a test file
    sha2 = repo.commit("all packages")
    res = census(repo, sha2, new_mem())

    ctx.check("census exits 0 and names the commit it read",
              res.rc == 0 and res.commit == sha2, ("exit 0", sha2), (res.rc, res.commit), res)
    gp, gt = lines_of(gc_lib) + lines_of(gc_build) + lines_of(INLINE_MOD), lines_of(gc_t1) + lines_of(gc_t2)
    exp_gc = strs({"product-lines": gp, "test-lines": gt, "ratio": ratio(gt, gp), "test-files": 2,
                   "tests": 8, "unparsed": 2, "inline-modules": 1})
    ctx.check("game-core totals: src and build.rs product (tests/, benches/ excluded), *_tests.rs and tests/*.rs, one inline test mod",
              res.totals.get("game-core") == exp_gc, exp_gc, res.totals.get("game-core"), res)
    sp, st = lines_of(sm_lib), lines_of(sm_t)
    exp_sm = strs({"product-lines": sp, "test-lines": st, "ratio": ratio(st, sp), "test-files": 1,
                   "tests": 2, "unparsed": 0, "inline-modules": 0})
    ctx.check("server-module totals: tests/ and benches/ excluded, a bodiless cfg(test) mod is not an inline module",
              res.totals.get("server-module") == exp_sm, exp_sm, res.totals.get("server-module"), res)
    cp, ct = lines_of(main_ts) + lines_of(view_ts), lines_of(control)
    exp_cl = strs({"product-lines": cp, "test-lines": ct, "ratio": ratio(ct, cp), "test-files": 1,
                   "tests": 2, "unparsed": 0, "e2e": 2, "test-util": 2})
    ctx.check("client totals: module_bindings excluded, wc -l line count, symlink not a test file, e2e and test-util counted",
              res.totals.get("client") == exp_cl, exp_cl, res.totals.get("client"), res)
    exp_oos = strs({"evals": 2, "sim-harness": 2, "client-wasm": 1})
    ctx.check("out-of-scope counts: *.eval.mjs under evals, .rs under sim-harness and client-wasm",
              res.totals.get("out-of-scope") == exp_oos, exp_oos, res.totals.get("out-of-scope"), res)
    got_u = (res.counts or {}).get("unparsed")
    ctx.check("counts.unparsed equals the packages' unparsed sum", got_u == "2", "2", got_u, res)

    r1 = census(repo, sha1, new_mem())
    zero_rs = strs({"product-lines": 0, "test-lines": 0, "ratio": "n/a", "test-files": 0, "tests": 0,
                    "unparsed": 0, "inline-modules": 0})
    cp1 = lines_of(main_ts)
    exp1 = {"game-core": zero_rs, "server-module": zero_rs,
            "client": strs({"product-lines": cp1, "test-lines": ct, "ratio": ratio(ct, cp1), "test-files": 1,
                            "tests": 2, "unparsed": 0, "e2e": 0, "test-util": 0})}
    got1 = {k: r1.totals.get(k) for k in exp1}
    ctx.check("at an earlier --at commit a missing package prints zeros with ratio n/a and the client row counts that commit",
              r1.rc == 0 and got1 == exp1, exp1, got1, r1)

    r = run_tool("census", "--repo", os.path.join(repo.path, "client"), "--at", sha2, "--mem", new_mem())
    ctx.check("a --repo that is a subdirectory of the work tree is refused: exit 2, PRUNE-ERROR, no PRUNE-CENSUS",
              refused(r), "exit 2 + PRUNE-ERROR", r.first, r)
    r = run_tool("census", "--repo", repo.path, "--at", "no-such-ref", "--mem", new_mem())
    ctx.check("an --at that names no commit is refused: exit 2, PRUNE-ERROR, no PRUNE-CENSUS",
              refused(r), "exit 2 + PRUNE-ERROR", r.first, r)


def json_totals_match(text, js):
    if not isinstance(js, dict) or set(js) != set(text) or len(text) != 4:
        return False
    for pkg, row in text.items():
        jrow = js.get(pkg)
        if not isinstance(jrow, dict) or set(jrow) != set(row):
            return False
        for k, v in row.items():
            j = jrow[k]
            if k == "ratio":
                if v == "n/a":
                    if j is not None:
                        return False
                elif not isinstance(j, (int, float)) or isinstance(j, bool) or "%.2f" % j != v:
                    return False
            elif not isinstance(j, int) or isinstance(j, bool) or str(j) != v:
                return False
    return True


def tp1_a14(ctx):
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    repo.fixture(DMG, "a1_damage_tests.rs")
    repo.put("client/src/main.ts", ts_lines(30))
    repo.put("game-core/src/lib.rs", rs_lines(20))
    sha = repo.commit()
    mem = new_mem()
    trend = os.path.join(mem, "prune", "trend.jsonl")

    r0 = census(repo, sha, mem)
    ctx.check("without --record census writes nothing under --mem",
              r0.rc == 0 and os.listdir(mem) == [], [], os.listdir(mem), r0)
    label = "close tp-1"
    r1 = census(repo, sha, mem, "--record", label)
    ctx.check("--record prints 'recorded <label>'", r1.recorded == label, label, r1.recorded, r1)
    d1 = read_bytes(trend)
    ctx.check("--record appends exactly one newline-terminated line to prune/trend.jsonl",
              d1 is not None and d1.count(b"\n") == 1 and d1.endswith(b"\n"), "one line", d1, r1)
    row = None
    if d1:
        try:
            row = json.loads(d1.decode("utf-8"))
        except ValueError:
            row = None
    got = (row.get("label"), row.get("commit")) if isinstance(row, dict) else row
    ctx.check("the row is a JSON object holding the label and the 40-hex commit",
              got == (label, sha), (label, sha), got, r1)
    jt = row.get("totals") if isinstance(row, dict) else None
    ctx.check("the row's totals equal the totals the text rows printed",
              json_totals_match(r1.totals, jt), r1.totals, jt, r1)
    jc = row.get("counts") if isinstance(row, dict) else None
    tc = None
    if r1.counts and "<malformed>" not in r1.counts:
        tc = {k: int(v) for k, v in r1.counts.items() if v.isdigit()}
    ctx.check("the row's counts equal the counts the text line printed",
              tc is not None and len(tc) == 5 and jc == tc, tc, jc, r1)
    r2 = census(repo, sha, mem, "--record", "second")
    d2 = read_bytes(trend)
    second = None
    if d1 and d2 and d2.startswith(d1):
        try:
            second = json.loads(d2[len(d1):].decode("utf-8")).get("label")
        except (ValueError, AttributeError):
            second = None
    ctx.check("a second --record appends a second line and leaves the first byte-identical",
              d1 is not None and d2 is not None and d2.startswith(d1) and d2.count(b"\n") == 2
              and second == "second", "first line unchanged + a 'second' row", d2, r2)
    r3 = census(repo, sha, mem, "--record", "a\nb")
    d3 = read_bytes(trend)
    ctx.check("a label holding a newline is a usage error (exit 2, PRUNE-ERROR) and appends nothing",
              r3.rc == 2 and any(l.startswith("PRUNE-ERROR") for l in r3.err.splitlines()) and d3 == d2,
              "exit 2, PRUNE-ERROR, file unchanged", (r3.rc, d3 == d2), r3)


def tp1_a15(ctx):
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    sha = repo.commit()
    # overwrite the worktree copy without committing: the candidate is gone from the worktree
    repo.put(CONTROL, "describe('stack', () => {\n  it('push then pop returns the item', () => {\n"
                      "    expect(1).toBe(1);\n  });\n});\n")
    mem = new_mem()
    before = snapshot(repo)

    r = census(repo, sha, mem)
    ctx.check("census reads the commit, not the worktree: the committed twin pair prints",
              CTRL in r.rows, CTRL, r.rows, r)
    after = snapshot(repo)
    ctx.check("census leaves the worktree, index and refs unchanged", after == before, before, after, r)

    r = twin(repo, sha, mem, CONTROL, CTRL_T, CTRL_S)
    ctx.check("twin reads the commit: the committed pair is confirmed (PRUNE-TWIN-OK, exit 0)",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK", "PRUNE-TWIN-OK", r.first, r)
    after = snapshot(repo)
    ctx.check("twin leaves the worktree, index and refs unchanged", after == before, before, after, r)

    r = keep(repo, sha, mem, CONTROL, CTRL_T, REASON)
    ctx.check("keep reads the commit: the committed candidate is recorded (PRUNE-KEEP-OK, exit 0)",
              r.rc == 0 and r.first.startswith("PRUNE-KEEP-OK "), "PRUNE-KEEP-OK ...", r.first, r)
    after = snapshot(repo)
    ctx.check("keep leaves the worktree, index and refs unchanged", after == before, before, after, r)

    inside = os.path.join(repo.path, "memdir")
    os.makedirs(inside)
    before = snapshot(repo)
    r = run_tool("census", "--repo", repo.path, "--at", sha, "--mem", inside, "--record", "x")
    after = snapshot(repo)
    ctx.check("--record with a --mem inside --repo is refused: exit 2, PRUNE-ERROR, nothing written in the repo",
              refused(r) and os.listdir(inside) == [] and after == before,
              "exit 2 + PRUNE-ERROR, memdir empty, repo unchanged", (r.rc, os.listdir(inside), after == before), r)
    target = os.path.join(repo.path, "linked")
    os.makedirs(target)
    outside = new_mem()
    os.symlink(target, os.path.join(outside, "prune"))
    before = snapshot(repo)
    r = run_tool("census", "--repo", repo.path, "--at", sha, "--mem", outside, "--record", "x")
    after = snapshot(repo)
    ctx.check("--record whose prune/ is a symlink into --repo is refused: exit 2, PRUNE-ERROR, nothing created in the repo",
              refused(r) and os.listdir(target) == [] and after == before,
              "exit 2 + PRUNE-ERROR, linked dir empty, repo unchanged", (r.rc, os.listdir(target), after == before), r)


# --------------------------------------------------------------------------------------------
# TP2 helpers
# --------------------------------------------------------------------------------------------


def pad(s):
    """20 trailing comment lines: a test file added in one commit is then over the 12-line churn
    bound, so only the commits a fixture means to count are counted."""
    return s + "".join("// pad %d\n" % i for i in range(20))


def commit_files(repo, files, msg="fixture"):
    for rel, data in files.items():
        repo.put(rel, data)
    return repo.commit(msg)


def O(path, sym, tests, test_only=False):
    return (path, sym, test_only, tuple(sorted(tests)))


def OP(path, sym, tests, token, test_only=False):
    return O(path, sym, tests, test_only) + (token,)


def S(path, st=False, churn=None, widened=None):
    return (path, st, churn, widened)


def sset(rows):
    return sorted(rows, key=repr)


def order_ok(rows):
    keys = [(r[0], r[1]) for r in rows]
    return keys == sorted(keys)


def clean(ctx, res):
    ctx.check("every orphans/signals/literal-variants/protected-churn line is in the contract format",
              res.bad == [], [], res.bad, res)


def prefixes(res):
    out = []
    for line in res.out.splitlines():
        p = line.split(" ", 1)[0]
        if not out or out[-1] != p:
            out.append(p)
    return out


def ts_pair(tag, extra=""):
    return ("describe('%s', () => {\n  it('one', () => {\n    expect(run('%s')).toBe(1);\n  });\n\n"
            "  it('one again', () => {\n    expect(run('%s')).toBe(1);\n  });\n%s});\n") % (tag, tag, tag, extra)


def rs_pair(tag, extra=""):
    return ("#[test]\nfn %s_a() {\n    assert_eq!(run(\"%s\"), 1);\n}\n\n"
            "#[test]\nfn %s_b() {\n    assert_eq!(run(\"%s\"), 1);\n}\n%s") % (tag, tag, tag, tag, extra)


def ts_marked(marker, extra=()):
    lines = ["describe('m', () => {", "  it('one', () => {", "    expect(1).toBe(1);", "  });"]
    lines += ["  // filler %d" % i for i in range(20)]
    lines += ["  // marker " + marker, "});"] + list(extra)
    return "\n".join(lines) + "\n"


def rs_marked(marker, extra=()):
    lines = ["#[test]", "fn one() {", "    assert_eq!(1, 1);", "}"]
    lines += ["// filler %d" % i for i in range(20)]
    lines += ["// marker " + marker] + list(extra)
    return "\n".join(lines) + "\n"


def it_(name, body, kind="it"):
    return "  %s('%s', () => {\n    %s\n  });\n" % (kind, name, body)


LV_EXTRA = it_("lv1", "expect(calc(1)).toBe('a');") + it_("lv2", "expect(calc(2)).toBe('b');")
READ_EXTRA = ("  it('reads', () => {\n    const t = readFileSync('x', 'utf8');\n"
              "    expect(t).toBe('');\n  });\n")


# --------------------------------------------------------------------------------------------
# TP2 fixtures
# --------------------------------------------------------------------------------------------


def tp2_a1(ctx):
    OB, OT, OI = "game-core/src/battle/orph.rs", "game-core/src/battle/orph_tests.rs", "game-core/tests/orph_it.rs"
    TM, TT = "client/src/ui/orphModel.ts", "client/src/ui/orphModel.test.ts"
    repo = Repo()
    repo.put("game-core/src/battle/mod.rs", "pub mod orph;\npub mod user;\npub use orph::{rehomed};\n")
    repo.put(OB, "pub fn solo_orphan() -> u32 { 1 }\npub fn called_prod() -> u32 { 2 }\n"
                 "pub fn comment_only() -> u32 { 3 }\npub fn rehomed() -> u32 { 4 }\n"
                 "pub fn chain_b() -> u32 { 5 }\npub fn chain_a() -> u32 { chain_b() + 1 }\n"
                 "pub fn dead_b() -> u32 { 6 }\npub fn dead_a() -> u32 { dead_b() + 1 }\n"
                 "pub(crate) fn crate_orphan() -> u32 { 7 }\npub const ORPHAN_CONST: u32 = 8;\n"
                 "pub struct OrphanShape;\n")
    repo.put("game-core/src/battle/user.rs",
             "use super::orph::{called_prod, chain_a, rehomed};\n\n"
             "// comment_only is deliberately not called here\n/* comment_only, again, in a block comment */\n"
             "/// rehomed is named in a doc comment too\n#[spacetimedb::reducer]\n"
             "pub fn run_all() -> u32 {\n    called_prod() + chain_a()\n}\n")
    repo.put(OT, "use super::*;\n\n#[test]\nfn names_them() {\n    assert_eq!(solo_orphan(), 1);\n"
                 "    assert_eq!(comment_only(), 3);\n    assert_eq!(rehomed(), 4);\n    assert_eq!(chain_b(), 5);\n"
                 "    assert_eq!(dead_a() + dead_b(), 15);\n    assert_eq!(crate_orphan(), 7);\n"
                 "    assert_eq!(ORPHAN_CONST, 8);\n    let _ = OrphanShape;\n}\n")
    repo.put(OI, "#[test]\nfn it_names() {\n    assert_eq!(solo_orphan(), 1);\n}\n")
    repo.put(TM, "export function tsOrphan(): number { return 1; }\nexport function tsCalled(): number { return 2; }\n"
                 "export function tsReexp(): number { return 3; }\nexport function tsCommentOnly(): number { return 5; }\n"
                 "export const TS_CONST = 4;\nexport function tsChainB(): number { return 1; }\n"
                 "export function tsChainA(): number { return tsChainB(); }\n"
                 "export function tsDeadB(): number { return 1; }\n"
                 "export function tsDeadA(): number { return tsDeadB(); }\n")
    repo.put("client/src/ui/orphUser.ts",
             "import { tsCalled, tsReexp, tsOrphan, tsChainA } from './orphModel';\n"
             "export { tsReexp } from './orphModel';\n// tsCommentOnly is not called here\n"
             "/* tsCommentOnly either */\nconsole.log(tsCalled(), tsChainA());\n")
    repo.put(TT, "import { tsOrphan, tsReexp, tsCommentOnly, TS_CONST, tsDeadA, tsDeadB, tsChainB } from './orphModel';\n"
                 "describe('orphModel', () => {\n  it('names them', () => {\n    expect(tsOrphan()).toBe(1);\n"
                 "    expect(tsReexp()).toBe(3);\n    expect(tsCommentOnly()).toBe(5);\n    expect(TS_CONST).toBe(4);\n"
                 "    expect(tsDeadA() + tsDeadB() + tsChainB()).toBe(3);\n  });\n});\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(OB, "solo_orphan", [OT, OI]), O(OB, "comment_only", [OT]), O(OB, "rehomed", [OT]),
           O(OB, "dead_a", [OT]), O(OB, "dead_b", [OT]), O(OB, "crate_orphan", [OT]),
           O(OB, "ORPHAN_CONST", [OT]), O(OB, "OrphanShape", [OT]),
           O(TM, "tsOrphan", [TT]), O(TM, "tsReexp", [TT]), O(TM, "tsCommentOnly", [TT]),
           O(TM, "TS_CONST", [TT]), O(TM, "tsDeadA", [TT]), O(TM, "tsDeadB", [TT])]
    ctx.check("orphans lists exactly: a pub fn / pub(crate) fn / const / struct and TS exports named by tests only, "
              "names only in comments, `use`/`pub use` and `import`/`export ... from`, and an in-file chain whose head is "
              "an orphan (each with the test files naming it)",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    live = {"called_prod", "chain_a", "chain_b", "run_all", "tsCalled", "tsChainA", "tsChainB"}
    leaked = [r for r in res.orph if r[1] in live]
    ctx.check("a symbol called by a production file, and an in-file chain whose head is called from another file, "
              "are not listed", leaked == [], [], leaked, res)
    both = [r[3] for r in res.orph if r[1] == "solo_orphan"]
    ctx.check("tests= holds every eligible test file naming the symbol, sorted",
              both == [tuple(sorted([OT, OI]))], [tuple(sorted([OT, OI]))], both, res)
    ctx.check("orphans rows are sorted by file, then symbol", order_ok(res.orph), "sorted", res.orph, res)
    ctx.check("no unprotected symbol lands under orphan-protected", res.orph_prot == [], [], res.orph_prot, res)
    clean(ctx, res)
    a1_regressions(ctx)


def a1_regressions(ctx):
    """False positives of the name match (each symbol below is named, one way or another, by
    production code) beside symbols that must stay listed."""
    R = "game-core/src/reg/"
    RT, TT = R + "reg_tests.rs", "client/src/reg/reg.test.ts"
    repo = Repo()
    # (l) look-alike that stays listed: only a `pub use` re-export names it
    repo.put(R + "mod.rs", "pub use resolve::{resolve_turn};\n")
    repo.put(R + "resolve.rs", "pub fn resolve_turn() -> u32 { 1 }\n")
    # (a) aliased imports, Rust and TS
    repo.put(R + "thing.rs", "pub fn thing_fn() -> u32 { 1 }\n")
    repo.put(R + "alias_user.rs", "use crate::reg::thing::thing_fn as renamed;\n\n#[spacetimedb::reducer]\n"
                                  "pub fn alias_entry() -> u32 {\n    renamed()\n}\n")
    repo.put("client/src/reg/a.ts", "export function foo(): number { return 1; }\n")
    repo.put("client/src/reg/aUser.ts", "import { foo as f2 } from './a';\nconsole.log(f2());\n")
    # (b) glob import of an enum's variants
    repo.put(R + "k.rs", "pub enum Kind {\n    Fire,\n    Water,\n}\n")
    repo.put(R + "k_user.rs", "use crate::reg::k::Kind::*;\n\n#[spacetimedb::reducer]\npub fn kind_entry() {\n"
                              "    let _x = Fire;\n}\n")
    # (c) raw identifier
    repo.put(R + "m.rs", "pub fn r#type() -> u32 { 1 }\n")
    repo.put(R + "m_user.rs", "#[spacetimedb::reducer]\npub fn raw_entry() -> u32 {\n    crate::reg::m::r#type()\n}\n")
    # (d) fn main is an entry point
    repo.put("server-module/src/main.rs", "pub fn main_helper() -> u32 { 1 }\n\nfn main() {\n    main_helper();\n}\n")
    # (e) a top-level initializer runs at load
    repo.put("client/src/reg/overlay.ts", "export function installOverlay(): number { return 1; }\n"
                                          "const installed = installOverlay();\n")
    # (f) a file without semicolons; `unused` is the control that stays listed
    repo.put("client/src/reg/handler.ts", "export class Handler {}\nexport const unused = 1\nregister(Handler)\n")
    # (g) a keyword-named property followed by division
    repo.put("client/src/reg/stats.ts", "export const total = 10;\n")
    repo.put("client/src/reg/statsUser.ts", "const stats = { of: 4 };\nconsole.log(stats.of / total / 2);\n")
    # (h) compile-time assert
    repo.put(R + "len.rs", "pub const LEN: usize = 4;\nconst _: () = assert!(LEN == 4);\n")
    # (i) extension trait on a primitive
    repo.put(R + "ext.rs", "pub trait Ext {\n    fn double(&self) -> String;\n}\n\nimpl Ext for str {\n"
                           "    fn double(&self) -> String {\n        format!(\"{}{}\", self, self)\n    }\n}\n")
    # (j) an entry point's callee in the same file
    repo.put(R + "entry.rs", "#[spacetimedb::reducer]\npub fn reducer_one() {\n    inner_g()\n}\n\npub fn inner_g() {}\n")
    # (k) impl liveness follows the self type
    repo.put(R + "s_live.rs", "pub struct SLive;\n\nimpl SLive {\n    pub fn m() -> u32 {\n        helper_live()\n"
                              "    }\n}\n\npub fn helper_live() -> u32 { 1 }\n")
    repo.put(R + "s_user.rs", "#[spacetimedb::reducer]\npub fn s_entry() {\n    let _s = SLive;\n}\n")
    repo.put(R + "s_dead.rs", "pub struct SDead;\n\nimpl SDead {\n    pub fn m() -> u32 {\n        helper_dead()\n"
                              "    }\n}\n\npub fn helper_dead() -> u32 { 1 }\n")
    # one row per symbol: a TS overload
    repo.put("client/src/reg/over.ts", "export function overloaded(a: string): void;\nexport function overloaded(a: any) {}\n")
    repo.put(RT, "#[test]\nfn names_reg() {\n    let _ = SDead;\n    helper_dead();\n    resolve_turn();\n}\n")
    repo.put(TT, "describe('reg', () => {\n  it('x', () => {\n    expect(unused).toBe(1);\n"
                 "    overloaded('a');\n  });\n});\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(R + "s_dead.rs", "SDead", [RT]), O(R + "s_dead.rs", "helper_dead", [RT]),
           O(R + "resolve.rs", "resolve_turn", [RT]), O("client/src/reg/handler.ts", "unused", [TT]),
           O("client/src/reg/over.ts", "overloaded", [TT])]
    ctx.check("control: the re-exported symbol, the impl of a self type nothing names (with its callee), the semicolon-less "
              "`unused` and the TS overload are listed, and nothing else is",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    listed = [r[1] for r in res.orph]
    for label, names in (
        ("an aliased import (Rust `use X as Y`, TS `import { X as Y }`) names X", ["thing_fn", "foo"]),
        ("a glob import `use path::Kind::*;` names Kind", ["Kind"]),
        ("a raw identifier r#type called through a path counts as a reference, under either spelling", ["r#type", "type"]),
        ("fn main calls its same-file helper", ["main_helper"]),
        ("a top-level TS initializer runs at load and keeps installOverlay alive", ["installOverlay", "installed"]),
        ("an ASI file's `register(Handler)` statement keeps Handler alive", ["Handler"]),
        ("`stats.of / total / 2` is a division naming total, not a regex", ["total"]),
        ("`const _: () = assert!(LEN == 4)` keeps LEN alive", ["LEN"]),
        ("an impl for a primitive keeps its trait alive", ["Ext"]),
        ("a reducer's same-file callee is live", ["reducer_one", "inner_g"]),
        ("an impl is live when its self type is named elsewhere: its type and its method's callee are not listed",
         ["SLive", "helper_live"]),
    ):
        hit = [n for n in names if n in listed]
        ctx.check(label, hit == [], [], hit, res)
    n_over = [r for r in res.orph if r[1] == "overloaded"]
    ctx.check("a TS overload set gives exactly one orphans row", len(n_over) == 1, 1, n_over, res)
    clean(ctx, res)


def tp2_a2(ctx):
    CB = "game-core/src/calc/core.rs"
    CT, YT = "game-core/src/calc/core_tests.rs", "game-core/tests/y.rs"
    repo = Repo()
    repo.put(CB, "pub fn only_inline() -> u32 { 1 }\npub fn only_bench() -> u32 { 2 }\npub fn only_it() -> u32 { 3 }\n"
                 "pub fn only_unit() -> u32 { 4 }\npub fn real_used() -> u32 { 5 }\n\n#[cfg(test)]\nmod tests {\n"
                 "    use super::*;\n\n    #[test]\n    fn t() {\n        assert_eq!(only_inline(), 1);\n    }\n}\n")
    repo.put("game-core/src/calc/entry.rs", "#[spacetimedb::reducer]\npub fn entry() -> u32 {\n    real_used()\n}\n")
    repo.put("game-core/benches/x.rs", "fn bench() {\n    only_bench();\n}\n")
    repo.put(YT, "#[test]\nfn y() {\n    assert_eq!(only_it(), 3);\n}\n")
    repo.put(CT, "#[test]\nfn u() {\n    assert_eq!(only_unit(), 4);\n}\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(CB, "only_inline", []), O(CB, "only_bench", []), O(CB, "only_it", [YT]), O(CB, "only_unit", [CT])]
    ctx.check("a symbol named only in an inline cfg(test) mod, in benches/, in game-core/tests/*.rs or in a *_tests.rs "
              "is listed (benches and inline mods are not test files: tests=[]); the one a production file calls is not",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    clean(ctx, res)


def tp2_a3(ctx):
    SY, ST = "game-core/src/m/sym.rs", "game-core/src/m/sym_tests.rs"
    HK, HT = "client/src/ui/hooks.ts", "client/src/ui/hooks.test.ts"
    repo = Repo()
    repo.put(SY, "".join("pub fn %s() {}\n" % n for n in
                         ("in_e2e", "in_eval", "in_wasm", "in_sim", "in_html", "in_test_only", "in_notes_md")))
    repo.put(HK, "export function tsE2e() {}\nexport function tsEval() {}\nexport function tsTestOnly() {}\n")
    repo.put("client/e2e/hook.spec.ts", "test('x', async () => {\n  tsE2e();\n  in_e2e();\n});\n")
    repo.put("evals/b.eval.mjs", "tsEval();\nin_eval();\n")
    repo.put("client-wasm/src/lib.rs", "pub fn w() {\n    in_wasm();\n}\n")
    repo.put("sim-harness/src/main.rs", "fn main() {\n    in_sim();\n}\n")
    repo.put("client/index.html", "<script>in_html();</script>\n")
    repo.put("docs/notes.md", "in_notes_md is mentioned here\n")
    repo.put(ST, "#[test]\nfn s() {\n    in_test_only();\n    in_notes_md();\n}\n")
    repo.put(HT, "describe('h', () => {\n  it('x', () => {\n    expect(tsTestOnly()).toBe(undefined);\n  });\n});\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(SY, "in_test_only", [ST]), O(SY, "in_notes_md", [ST]), O(HK, "tsTestOnly", [HT])]
    ctx.check("symbols named in client/e2e, evals, client-wasm, sim-harness or HTML are not listed; one named only by a "
              "test file, and one named only in a .md file, are",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    clean(ctx, res)


def tp2_a4(ctx):
    AB, AT = "game-core/src/attrs/a.rs", "game-core/src/attrs/a_tests.rs"
    names = ["reducer_fn", "wasm_fn", "tracked_fn", "TableRow", "doc_fn", "inline_fn", "must_fn", "allow_fn",
             "DeriveStruct", "CfgAttrStruct", "stacked_fn"]
    repo = Repo()
    repo.put(AB, "#[spacetimedb::reducer]\npub fn reducer_fn() {}\n\n#[wasm_bindgen]\npub fn wasm_fn() {}\n\n"
                 "#[track_caller]\npub fn tracked_fn() {}\n\n#[spacetimedb::table(name = t)]\npub struct TableRow {\n"
                 "    pub id: u32,\n}\n\n/// documented\npub fn doc_fn() {}\n\n#[inline]\npub fn inline_fn() {}\n\n"
                 "#[must_use]\npub fn must_fn() -> u32 { 1 }\n\n#[allow(dead_code)]\npub fn allow_fn() {}\n\n"
                 "#[derive(Debug, Clone)]\npub struct DeriveStruct;\n\n"
                 "#[cfg_attr(feature = \"x\", derive(Debug))]\npub struct CfgAttrStruct;\n\n"
                 "#[inline]\n#[must_use]\npub fn stacked_fn() -> u32 { 2 }\n")
    repo.put(AT, "#[test]\nfn names_all() {\n" + "".join("    let _ = %s;\n" % n for n in names) + "}\n")
    res = census(repo, repo.commit(), new_mem())
    listed = ["doc_fn", "inline_fn", "must_fn", "allow_fn", "DeriveStruct", "CfgAttrStruct", "stacked_fn"]
    exp = [O(AB, n, [AT]) for n in listed]
    ctx.check("items with only doc/inline/must_use/allow/derive/cfg_attr attributes are listed; reducer, table, "
              "wasm_bindgen and track_caller items are entry points and are not",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    clean(ctx, res)


def tp2_a5(ctx):
    PB, PT = "game-core/src/t/prod.rs", "game-core/src/t/prod_tests.rs"
    repo = Repo()
    repo.put(PB, "#[cfg(test)]\npub fn helper_only() -> u32 { 1 }\n\npub fn plain_orphan() -> u32 { 2 }\n\n"
                 "#[cfg(test)]\nfn inner_helper() {}\n\npub fn target_of_testonly() -> u32 { 3 }\n\n"
                 "#[cfg(test)]\npub fn caller_t() {\n    target_of_testonly();\n}\n\n"
                 "#[cfg(test)]\nmod inside {\n    pub fn in_mod_helper() {}\n}\n\n#[cfg(test)]\nmod x_tests;\n")
    repo.put(PT, "#[test]\nfn names() {\n    helper_only();\n    plain_orphan();\n    inner_helper();\n"
                 "    target_of_testonly();\n    caller_t();\n    in_mod_helper();\n}\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(PB, "helper_only", [PT], True), O(PB, "inner_helper", [PT], True), O(PB, "caller_t", [PT], True),
           O(PB, "plain_orphan", [PT]), O(PB, "target_of_testonly", [PT])]
    ctx.check("a cfg(test) item outside a test mod (any visibility) carries test-only; a plain orphan does not; a symbol "
              "named only by a cfg(test) item is still an ordinary orphan; an item inside a cfg(test) mod is not listed",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    decl = [r for r in res.orph if r[1] == "x_tests"]
    ctx.check("a `#[cfg(test)] mod x_tests;` declaration is not an item to list (no row for x_tests), while the cfg(test) fns beside it are",
              decl == [] and len(res.orph) == 5, "no x_tests row", decl, res)
    clean(ctx, res)


def tp2_a6(ctx):
    OK_, OKT = "game-core/src/ok.rs", "game-core/src/ok_tests.rs"
    PV, PVT = "server-module/src/privacy.rs", "server-module/src/privacy_tests.rs"
    IH, IHT = "client/src/ui/i18nHelper.ts", "client/src/ui/i18nHelper.test.ts"
    PL, PLT = "client/src/ui/plainHelper.ts", "client/src/ui/plainHelper.test.ts"
    repo = Repo()
    repo.put(OK_, "pub fn plain_one() {}\npub fn guard_x() {}\npub fn auth_guard() {}\npub fn Hidden_stuff() {}\n")
    repo.put(OKT, "#[test]\nfn n() {\n    plain_one();\n    guard_x();\n    auth_guard();\n    Hidden_stuff();\n}\n")
    repo.put(PV, "pub fn plain_name_fn() {}\npub fn claim_it() {}\n")
    repo.put(PVT, "#[test]\nfn n() {\n    plain_name_fn();\n    claim_it();\n}\n")
    repo.put(IH, "export function fmt(): number { return 1; }\n")
    repo.put(IHT, "describe('i', () => {\n  it('x', () => {\n    expect(fmt()).toBe(1);\n  });\n});\n")
    repo.put(PL, "export function tsPlain(): number { return 1; }\n")
    repo.put(PLT, "describe('p', () => {\n  it('x', () => {\n    expect(tsPlain()).toBe(1);\n  });\n});\n")
    res = census(repo, repo.commit(), new_mem())
    exp_p = [OP(PV, "plain_name_fn", [PVT], "priv"), OP(PV, "claim_it", [PVT], "priv"),
             OP(OK_, "guard_x", [OKT], "guard"), OP(OK_, "auth_guard", [OKT], "auth"),
             OP(OK_, "Hidden_stuff", [OKT], "hidden"), OP(IH, "fmt", [IHT], "i18n")]
    ctx.check("a protected token in the defining path (priv, i18n) or in the symbol name (guard, hidden, case-insensitive) "
              "moves the orphan to orphan-protected; token= is the first of the tool's list that matches (priv before "
              "claim, auth before guard)",
              sset(res.orph_prot) == sset(exp_p), sset(exp_p), sset(res.orph_prot), res)
    exp = [O(OK_, "plain_one", [OKT]), O(PL, "tsPlain", [PLT])]
    ctx.check("unprotected orphans stay under orphans and a protected one is not repeated there",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    clean(ctx, res)


def tp2_a7(ctx):
    pos = [("client/src/ui/s1.test.ts", pad("describe('s', () => {\n  it('x', () => {\n    const t = readFileSync('a.ts', 'utf8');\n"
                                            "    expect(t).toBe('');\n  });\n});\n")),
           ("client/src/ui/s2.test.ts", pad("describe('s', () => {\n  it('x', async () => {\n    const t = await readFile('a.ts');\n"
                                            "    expect(t).toBe('');\n  });\n});\n")),
           ("game-core/src/s3_tests.rs", pad("#[test]\nfn s3() {\n    let t = include_str!(\"lib.rs\");\n    assert!(t.len() > 0);\n}\n")),
           ("server-module/src/s4_tests.rs", pad("#[test]\nfn s4() {\n    let t = std::fs::read_to_string(\"a.rs\").unwrap();\n"
                                                 "    assert!(t.len() > 0);\n}\n"))]
    neg = [("client/src/ui/n1.test.ts", pad("// readFileSync is not called\n/* readFile neither */\n"
                                            "describe('n', () => {\n  it('x', () => {\n    expect('readFileSync').toBe(`readFile`);\n  });\n});\n")),
           ("game-core/src/n2_tests.rs", pad("// include_str!(\"x\") in a comment\n/// read_to_string in a doc comment\n#[test]\nfn n2() {\n"
                                             "    let s = \"read_to_string and include_str\";\n    assert!(s.len() > 0);\n}\n")),
           ("client/src/ui/n3.test.ts", pad("describe('n', () => {\n  it('x', () => {\n    expect(readFileSyncish()).toBe(1);\n"
                                            "    expect(myreadFile()).toBe(1);\n    expect(readFileAsync()).toBe(1);\n  });\n});\n")),
           ("game-core/src/n4_tests.rs", pad("#[test]\nfn n4() {\n    read_to_string_lossy();\n    include_str_x();\n}\n")),
           # not eligible test files
           ("client/e2e/x.spec.ts", pad("test('x', async () => {\n  readFileSync('a');\n});\n")),
           ("client/src/ui/loader.ts", pad("export const loaded = readFileSync('a');\n"))]
    repo = Repo()
    for rel, data in pos + neg:
        repo.put(rel, data)
    res = census(repo, repo.commit(), new_mem())
    exp = [S(rel, st=True) for rel, _ in pos]
    ctx.check("a test file calling include_str!, read_to_string, readFileSync or readFile is printed under signals as "
              "source-text (and no other signal); a word only in a comment or a string, a look-alike identifier, an e2e "
              "spec and a product file print nothing",
              sset(res.sig) == sset(exp), sset(exp), sset(res.sig), res)
    clean(ctx, res)
    a7_nonutf8_path(ctx)


def a7_nonutf8_path(ctx):
    LP, LT = "client/src/ui/lonely.ts", "client/src/ui/lonely.test.ts"
    body = "describe('l', () => {\n  it('x', () => {\n    expect(lonelyFn()).toBe(1);\n  });\n});\n"
    repo = Repo()
    repo.put(LP, "export function lonelyFn(): number { return 1; }\n")
    repo.put(LT, body)
    bad = os.path.join(os.fsencode(repo.path), b"client/src/ui", b"\xff.test.ts")
    with open(bad, "wb") as f:
        f.write(body.encode("utf-8"))
    res = census(repo, repo.commit(), new_mem())
    rows = [r for r in res.orph if r[1] == "lonelyFn"]
    ctx.check("a tracked test file whose path is not UTF-8 does not break the census: exit 0, the orphan row prints with a valid "
              "tests= JSON array naming both test files",
              res.rc == 0 and len(rows) == 1 and len(rows[0][3]) == 2 and LT in rows[0][3] and res.bad == [],
              "exit 0, one lonelyFn row, 2 tests, parseable", (res.rc, rows, res.bad), res)


def ts_hist_repo():
    """The A8 history; returns (repo, sha)."""
    HT, HS = "client/src/ui/hist.test.ts", "client/src/ui/hist.ts"
    RT, RS = "game-core/src/h/hist_tests.rs", "game-core/src/h/hist.rs"
    OTH, OTD = "client/src/ui/other.test.ts", "client/src/other.ts"
    QT = "client/src/ui/quiet.test.ts"
    repo = Repo()
    commit_files(repo, {HT: ts_marked("m0"), HS: "export const h = 0;\n", RT: rs_marked("r0"), RS: "pub fn h() {}\n",
                        OTH: ts_marked("o0"), OTD: "export const o = 0;\n", QT: ts_marked("q0")}, "base")
    for k in (1, 2, 3):
        commit_files(repo, {HT: ts_marked("m%d" % k)}, "small %d" % k)                      # counted x3
    commit_files(repo, {HT: ts_marked("m4"), HS: "export const h = 1;\n"}, "with subject")  # subject changed
    e13 = ["// x%d" % i for i in range(13)]
    commit_files(repo, {HT: ts_marked("m4", e13)}, "13 added")                              # not counted
    t12 = ["// y%d" % i for i in range(12)]
    commit_files(repo, {HT: ts_marked("m4", e13 + t12)}, "12 added")                        # counted
    commit_files(repo, {HT: ts_marked("m4", e13 + t12[:5] + ["// z%d" % i for i in range(6)])},
                 "7 deleted 6 added")                                                       # 13: not counted
    commit_files(repo, {HT: ts_marked("m4", e13 + t12[:5] + ["// w%d" % i for i in range(6)])},
                 "6 deleted 6 added")                                                       # 12: counted
    commit_files(repo, {RT: rs_marked("r1")}, "rs small 1")
    commit_files(repo, {RT: rs_marked("r2")}, "rs small 2")
    commit_files(repo, {RT: rs_marked("r3"), RS: "pub fn h() { }\n"}, "rs with subject")
    commit_files(repo, {OTH: ts_marked("o1")}, "other small 1")
    commit_files(repo, {OTH: ts_marked("o2"), OTD: "export const o = 1;\n"}, "other, subject elsewhere")
    commit_files(repo, {QT: ts_marked("q0", ["// q%d" % i for i in range(30)])}, "quiet, big")
    return repo, repo.commit("tip")


def fast_import(repo, commits):
    """Append (message, {path: bytes}) commits, oldest first, to main with one git fast-import."""
    parts = []
    for n, (msg, files) in enumerate(commits):
        m = msg.encode("utf-8")
        parts.append(b"commit refs/heads/main\ncommitter Fixture <fixture@example.invalid> 1767225600 +0000\n")
        parts.append(b"data %d\n%s\n" % (len(m), m))
        if n == 0:
            parts.append(b"from refs/heads/main^0\n")
        for path, data in files.items():
            parts.append(b"M 100644 inline %s\ndata %d\n%s\n" % (path.encode("utf-8"), len(data), data))
        parts.append(b"\n")
    p = subprocess.run(["git", "fast-import", "--quiet"], cwd=repo.path, env=git_env(), input=b"".join(parts),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    if p.returncode != 0:
        raise RuntimeError("fixture git fast-import failed: " + p.stderr.decode("utf-8", "replace"))
    git(repo.path, "reset", "-q", "--hard", "HEAD")


def tp2_a8(ctx):
    HT = "client/src/ui/hist.test.ts"
    RT = "game-core/src/h/hist_tests.rs"
    OTH = "client/src/ui/other.test.ts"
    repo, sha = ts_hist_repo()
    mem = new_mem()
    before = snapshot(repo)
    res = census(repo, sha, mem)
    after = snapshot(repo)
    exp = [S(HT, churn=5), S(RT, churn=2), S(OTH, churn=2)]
    ctx.check("churn counts the commits that changed the test file by 12 lines or fewer without its subject: "
              "hist.test.ts 5 (3 small, one of exactly 12 added, one of 6 deleted + 6 added; not the commit that also "
              "changed hist.ts, not 13 added, not 7 deleted + 6 added); Rust hist_tests.rs 2 (subject hist.rs); "
              "other.test.ts 2 (a same-stem file in ANOTHER dir is not its subject); a file with only a big change prints nothing",
              sset(res.sig) == sset(exp), sset(exp), sset(res.sig), res)
    ctx.check("unprotected churned files print no protected-churn row", res.pchurn == [], [], res.pchurn, res)
    ctx.check("census leaves the worktree, index and refs unchanged (history is read, never altered)",
              after == before, before, after, res)
    clean(ctx, res)

    # paths that need quoting in git output
    QP, BP, NP = 'client/src/ui/q"uote.test.ts', "client/src/ui/b\\slash.test.ts", "client/src/ui/plainq.test.ts"
    qrepo = Repo()
    commit_files(qrepo, {QP: ts_marked("a"), BP: ts_marked("a"), NP: ts_marked("a")}, "base")
    for k in ("b", "c"):
        sha_q = commit_files(qrepo, {QP: ts_marked(k), BP: ts_marked(k)}, "quoted %s" % k)
        sha_q = commit_files(qrepo, {NP: ts_marked(k)}, "plain %s" % k)
    r = census(qrepo, sha_q, new_mem())
    exp_q = [S(QP, churn=2), S(BP, churn=2), S(NP, churn=2)]
    ctx.check("a test file whose path holds a double quote or a backslash gets churn counted like a plain one (2 each)",
              sset(r.sig) == sset(exp_q), sset(exp_q), sset(r.sig), r)

    # the 300-commit window: 303 commits, the 3 newest of 5 small commits are inside it
    WT = "client/src/ui/win.test.ts"
    wrepo = Repo()
    wrepo.put(WT, ts_marked("s0"))
    wrepo.commit("base")
    commits = [("small %d" % k, {WT: ts_marked("s%d" % k).encode("utf-8")}) for k in range(1, 6)]
    commits += [("filler %d" % i, {"notes.txt": ("n%d\n" % i).encode("utf-8")}) for i in range(297)]
    fast_import(wrepo, commits)
    head = git(wrepo.path, "rev-parse", "HEAD").strip()
    total = git(wrepo.path, "rev-list", "--count", "HEAD").strip()
    r = census(wrepo, head, new_mem())
    ctx.check("churn reads only the newest 300 commits of the ref (fixture history has %s): 3 of the 5 small commits" % total,
              total == "303" and sset(r.sig) == [S(WT, churn=3)], [S(WT, churn=3)], (total, r.sig), r)


def tp2_a9(ctx):
    CAT = "client/src/ui/i18n/catalog.test.ts"
    PLN = "client/src/ui/plain.test.ts"
    PRV = "server-module/src/privacy_tests.rs"
    SEC = "client/src/ui/security.test.ts"
    repo = Repo()
    commit_files(repo, {CAT: ts_marked("a"), PLN: ts_marked("a"), PRV: rs_marked("a"),
                        SEC: ts_marked("a", ["const t = readFileSync('x', 'utf8');"])}, "base")
    commit_files(repo, {CAT: ts_marked("b")}, "cat 1")
    commit_files(repo, {PLN: ts_marked("b")}, "plain 1")
    commit_files(repo, {CAT: ts_marked("c")}, "cat 2")
    commit_files(repo, {PLN: ts_marked("c")}, "plain 2")
    sha = commit_files(repo, {PRV: rs_marked("b")}, "privacy 1")
    res = census(repo, sha, new_mem())
    exp_s = [S(CAT, churn=2), S(PLN, churn=2), S(PRV, churn=1), S(SEC, st=True)]
    ctx.check("signals carries churn for the protected and the unprotected churned files, and source-text for a protected-path file with no churn",
              sset(res.sig) == sset(exp_s), sset(exp_s), sset(res.sig), res)
    exp_c = [(CAT, 2, "i18n"), (PRV, 1, "priv")]
    ctx.check("a churned file whose path holds a protected token is also printed under protected-churn with the "
              "churn count and the first matching token; the unprotected churned file and the protected file without churn are not",
              sset(res.pchurn) == sset(exp_c), sset(exp_c), sset(res.pchurn), res)
    clean(ctx, res)


def tp2_a10(ctx):
    LT = "client/src/ui/lit.test.ts"
    LR = "game-core/src/lit/lit_tests.rs"
    ts = ("describe('g1', () => {\n" + it_("a", "expect(f(1)).toBe('x');") + it_("b", "expect(f(2)).toBe('y');")
          + it_("c", "expect(f(3)).toBe('z');") + it_("d", "expect(g(1)).toBe(1);") + it_("e", "expect(g(2)).toBe(2);")
          + it_("t1", "expect(h(1)).toBe(1);") + it_("t2", "expect(h(1)).toBe(1);")
          + it_("i1", "expect(k(1)).toBe(1);") + it_("i2", "expect(m(1)).toBe(1);")
          + it_("q1", "expect(q(2)).toBe(1);") + it_("r1", "expect(r(1)).toBe(1);")
          + it_("r2", "expect(r(2)).toBe(1);", "test")
          + "});\n\ndescribe('g2', () => {\n" + it_("q2", "expect(q(3)).toBe(1);") + "});\n")
    rs = ("#[test]\nfn lit_a() {\n    assert_eq!(calc(1, \"x\"), 'a');\n}\n\n"
          "#[test]\nfn lit_b() {\n    assert_eq!(calc(2, \"y\"), 'b');\n}\n\n"
          "#[test]\n#[ignore]\nfn lit_c() {\n    assert_eq!(calc(3, \"z\"), 'c');\n}\n\n"
          "#[test]\nfn lone() {\n    assert_eq!(other(1), 1);\n}\n")
    repo = Repo()
    repo.put(LT, pad(ts))
    repo.put(LR, pad(rs))
    res = census(repo, repo.commit(), new_mem())
    exp = [(LT, 2), (LR, 1)]
    ctx.check("bodies equal once literals are masked are one group per file: TS a/b/c and d/e (2 groups; exact twins "
              "t1/t2, identifier differences, different declaration forms and different blocks form none); Rust lit_a/lit_b "
              "(1 group; an extra attribute breaks the group)",
              sset(res.lv) == sset(exp), sset(exp), sset(res.lv), res)
    names = ["g1 > a", "g1 > b", "g1 > c", "g1 > d", "g1 > e", "g1 > r1", "g1 > r2", "g1 > q1", "g2 > q2",
             "lit_a", "lit_b", "lit_c"]
    hits = [l for l in res.out.splitlines() if any(n in l for n in names)]
    ctx.check("no row names a literal-variant test, under any section", hits == [], [], hits, res)
    exp_d = [D(LT, "g1 > t2", "g1 > t1")]
    ctx.check("the exact twins stay an ordinary duplicates row, and nothing else prints as a twin",
              res.rows == exp_d, exp_d, res.rows, res)
    clean(ctx, res)


def tp2_a11(ctx):
    W, Z = "client/src/ui/w.test.ts", "client/src/ui/z.test.ts"
    repo = Repo()
    repo.put(W, ts_marked("a"))
    repo.put(Z, ts_marked("a"))
    repo.put("client/src/ui/notatest.ts", "export const n = 1;\n")
    sha = repo.commit()
    mem = new_mem()
    gates = os.path.join(mem, "gates")
    os.makedirs(gates)

    def row(slice_id, path, why="pin"):
        return json.dumps({"ts": "2026-11-01T00:00:00Z", "slice": slice_id, "path": path, "why": why})

    with open(os.path.join(gates, "a-1.widened.jsonl"), "w") as f:
        f.write("\n".join([row("a-1", W), row("a-1", W, "count"), row("a-1", Z), row("a-1", "client/src/ui/notatest.ts"),
                           "{not json", "", json.dumps({"ts": "t", "slice": "a-1", "why": "no path"})]) + "\n")
    with open(os.path.join(gates, "b-2.widened.jsonl"), "w") as f:
        f.write(row("b-2", W) + "\n")
    with open(os.path.join(gates, "c.jsonl"), "w") as f:
        f.write("\n".join(row("c", Z) for _ in range(5)) + "\n")
    res = census(repo, sha, mem)
    exp = [S(W, widened=3), S(Z, widened=1)]
    ctx.check("widened is the number of rows naming the test file across gates/*.widened.jsonl (3 and 1); a row naming a "
              "non-test path, a malformed line, a blank line, a row without a path and a file not named *.widened.jsonl add nothing",
              sset(res.sig) == sset(exp), sset(exp), sset(res.sig), res)
    clean(ctx, res)


def tp2_a12(ctx):
    AA, BB = "client/src/ui/aa.test.ts", "client/src/ui/sub/bb.test.ts"
    AU, CC = "client/src/ui/sub/auth.test.ts", "client/src/render/cc.test.ts"
    DD, EE = "client/src/other/dd.test.ts", "game-core/src/z/ee_tests.rs"
    YT = "game-core/tests/y_it.rs"
    repo = Repo()
    repo.put(AA, pad(ts_pair("aa", READ_EXTRA)))
    repo.put(BB, pad(ts_pair("bb", LV_EXTRA)))
    repo.put(AU, pad(ts_pair("auth")))
    repo.put(CC, pad(ts_pair("cc")))
    repo.put(DD, pad(ts_pair("dd", LV_EXTRA + READ_EXTRA + it_("ghosts", "expect(ghost()).toBe(1);"))))
    repo.put(EE, pad(rs_pair("ee", "#[test]\nfn names_z() {\n    assert_eq!(zorph(), 1);\n}\n")))
    repo.put(YT, pad("#[test]\nfn names_y() {\n    assert_eq!(yorph(), 2);\n}\n"))
    repo.put("game-core/src/z/zz.rs", "pub fn zorph() -> u32 { 1 }\n")
    repo.put("game-core/src/y/yy.rs", "pub fn yorph() -> u32 { 2 }\n")
    repo.put("client/src/other/prod.ts", "export function ghost(): number { return 1; }\n")
    sha = repo.commit()
    mem = new_mem()
    d = tempfile.mkdtemp(prefix="spec-", dir=ROOT)
    spec = os.path.join(d, "x.spec.md")
    em, dot = chr(0x2014), chr(0x00b7)
    with open(spec, "w", encoding="utf-8") as f:
        f.write(("# Test spec\n\n## Slices\n\n### zed-1 EM first slice\ntype: feature DOT tier: routine\n"
                 "touches: client/src/ui/aa.test.ts, client/src/ui/sub/**, `game-core/src/z/`\n\n"
                 "### alp-2 EM second slice\n"
                 "touches: `client/src/ui/*.test.ts`, client/src/render/**, game-core/tests/*.rs\n"
                 "touches: client/src/other/**\n\n"
                 "### nope-3 EM third slice\ntouches: client/src/nomatch/**\n").replace("EM", em).replace("DOT", dot))
    full = census(repo, sha, mem)
    sp = census(repo, sha, mem, "--spec", spec)
    all_dups = {r[1] for r in full.rows if r[0] == "duplicates"}
    ctx.check("control: without --spec every twin file, the orphans, the literal-variants and the signals print (and no slices=)",
              all_dups == {AA, BB, CC, DD, EE} and {r[1] for r in full.rows if r[0] == "protected-twins"} == {AU}
              and {r[0] for r in full.orph} == {"game-core/src/z/zz.rs", "game-core/src/y/yy.rs", "client/src/other/prod.ts"}
              and sorted(r[0] for r in full.lv) == sorted([BB, DD]) and sorted(r[0] for r in full.sig) == sorted([AA, DD])
              and "slices=" not in full.out,
              "all rows, no slices=", (full.rows, full.orph, full.lv, full.sig), full)
    matched_rows = [r for r in full.rows if r[1] != DD]
    ctx.check("--spec prints only the twin rows whose file matches a touches: entry (exact path, `**` across `/`, a backticked "
              "directory with a trailing `/`, `ui/*.test.ts` not crossing into sub/); the unmatched file prints none",
              srt(sp.rows) == srt(matched_rows), srt(matched_rows), srt(sp.rows), sp)
    prod_z, prod_y = "game-core/src/z/zz.rs", "game-core/src/y/yy.rs"
    exp_o = [O(prod_z, "zorph", [EE]), O(prod_y, "yorph", [YT])]
    ctx.check("an orphan row prints when its defining file OR one of its test files matches; one matching neither does not",
              sset(sp.orph) == sset(exp_o), sset(exp_o), sset(sp.orph), sp)
    ctx.check("literal-variants and signals rows follow the same filter",
              sp.lv == [(BB, 1)] and sp.sig == [S(AA, st=True)], ([(BB, 1)], [S(AA, st=True)]), (sp.lv, sp.sig), sp)
    cand = {AA: "aa > one again", BB: "bb > one again", CC: "cc > one again", EE: "ee_b"}
    exp_sl = {("duplicates", AA, cand[AA]): ["zed-1", "alp-2"], ("duplicates", BB, cand[BB]): ["zed-1"],
              ("duplicates", CC, cand[CC]): ["alp-2"], ("duplicates", EE, cand[EE]): ["zed-1"],
              ("protected-twins", AU, "auth > one again"): ["zed-1"],
              ("orphans", prod_z, "zorph"): ["zed-1"], ("orphans", prod_y, "yorph"): ["alp-2"],
              ("literal-variants", BB, ""): ["zed-1"], ("signals", AA, ""): ["zed-1", "alp-2"]}
    ctx.check("every printed row ends with slices= listing each slice id whose touches: matches, in spec order (zed-1 before "
              "alp-2, not alphabetical), using only the FIRST touches: line of a section",
              sp.slices == exp_sl, exp_sl, sp.slices, sp)
    ctx.check("totals, counts and the commit are identical to a run without --spec",
              sp.totals == full.totals and sp.counts == full.counts and sp.commit == full.commit and sp.rc == 0,
              (full.totals, full.counts), (sp.totals, sp.counts), sp)
    want = ["PRUNE-CENSUS", "totals", "duplicates", "protected-twins", "orphans", "literal-variants", "signals", "counts"]
    ctx.check("sections print in the contract order", prefixes(sp) == want, want, prefixes(sp), sp)
    clean(ctx, sp)
    for name, path in (("a --spec path that does not exist", os.path.join(d, "absent.md")), ("a --spec that is a directory", d)):
        r = run_tool("census", "--repo", repo.path, "--at", sha, "--mem", mem, "--spec", path)
        ctx.check(name + " is refused: exit 2, PRUNE-ERROR, no PRUNE-CENSUS", refused(r), "exit 2 + PRUNE-ERROR", r.first, r)

    # spec-parsing edge cases, over the same census
    spec2 = os.path.join(d, "y.spec.md")
    fence = "`" * 3
    with open(spec2, "w", encoding="utf-8") as f:
        f.write(("# Test spec\n\n## Slices\n\n### e-1 EM empty first line\ntouches:\ntouches: client/src/ui/aa.test.ts\n\n"
                 "### s2 EM fenced block first\n" + fence + "text\n# a comment line inside a fence\n" + fence + "\n"
                 "touches: client/src/render/**\n\n"
                 "### c-3 EM control\ntouches: client/src/ui/sub/**\n").replace("EM", chr(0x2014)))
    sp2 = census(repo, sha, mem, "--spec", spec2)
    exp2 = {("duplicates", BB, "bb > one again"): ["c-3"], ("protected-twins", AU, "auth > one again"): ["c-3"],
            ("duplicates", CC, "cc > one again"): ["s2"], ("literal-variants", BB, ""): ["c-3"]}
    ctx.check("a slice whose first touches: line is empty matches nothing (its second line is ignored: aa.test.ts prints no row, "
              "not even its signal); a `# comment` line inside a code fence does not end the slice, so s2 still matches render/**",
              sp2.slices == exp2 and sp2.sig == [] and {r[1] for r in sp2.rows} == {BB, AU, CC},
              (exp2, []), (sp2.slices, sp2.sig, sp2.rows), sp2)


GH_FIELDS = "databaseId,workflowName,headSha,status,conclusion,attempt,startedAt,updatedAt"
GH_BASE = datetime(2026, 11, 10, 12, 0, 0)


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def gh_run(i, wf, sha, status, concl, attempt, start_min, secs):
    start = GH_BASE + timedelta(minutes=start_min)
    return {"databaseId": i, "workflowName": wf, "headSha": sha, "status": status, "conclusion": concl,
            "attempt": attempt, "startedAt": iso(start), "updatedAt": iso(start + timedelta(seconds=secs))}


class Gh:
    """A fake `gh`: logs its argv, prints a canned answer, exits with a canned code."""

    def __init__(self, text, rc=0):
        self.dir = tempfile.mkdtemp(prefix="gh-", dir=ROOT)
        self.log = os.path.join(self.dir, "calls.log")
        data = os.path.join(self.dir, "data.txt")
        with open(data, "w") as f:
            f.write(text)
        script = ("#!/usr/bin/python3\nimport json, sys\nwith open(%r, 'a') as f:\n"
                  "    f.write(json.dumps(sys.argv[1:]) + '\\n')\nwith open(%r) as f:\n"
                  "    sys.stdout.write(f.read())\nsys.exit(%d)\n") % (self.log, data, rc)
        path = os.path.join(self.dir, "gh")
        with open(path, "w") as f:
            f.write(script)
        os.chmod(path, 0o755)

    def env(self):
        env = clean_env()
        env["PATH"] = self.dir + os.pathsep + os.environ.get("PATH", "")
        return env

    def calls(self):
        if not os.path.exists(self.log):
            return []
        with open(self.log) as f:
            return [json.loads(l) for l in f.read().splitlines() if l]

    def reset(self):
        if os.path.exists(self.log):
            os.remove(self.log)


def ci_runs(head, old):
    other = "e" * 40
    rows = [
        gh_run(1, "CI", head, "in_progress", "", 1, 0, 0),             # newest for the commit, not completed
        gh_run(2, "Nightly", other, "in_progress", "", 1, -1, 0),      # newest Nightly, not completed
        gh_run(3, "CI", head, "completed", "success", 1, -10, 95),     # the answer: 95 s, success
        gh_run(4, "CI", head, "completed", "failure", 1, -20, 30),     # older run of the same commit
        gh_run(5, "Nightly", other, "completed", "failure", 1, -30, 3600),
        gh_run(6, "Nightly", other, "completed", "success", 1, -40, 3600),
        gh_run(7, "CI", other, "completed", "success", 2, -50, 100),   # rerun to green (1)
        gh_run(8, "CI", other, "completed", "success", 3, -60, 100),   # rerun to green (2)
        gh_run(9, "CI", other, "completed", "failure", 2, -70, 100),   # rerun, not green
        gh_run(10, "CI", other, "completed", "success", 1, -80, 100),  # green first time
        gh_run(11, "Nightly", other, "completed", "success", 2, -90, 100),  # not a CI run
        gh_run(12, "CI", old, "completed", "failure", 1, -100, 600),   # the older commit's run
    ]
    rows += [gh_run(100 + i, "CI", "f" * 40, "completed", "success", 1, -(200 + i), 60) for i in range(300)]
    rows.append(gh_run(999, "CI", other, "completed", "success", 2, -5000, 100))  # outside the newest 300
    rows.sort(key=lambda r: r["startedAt"], reverse=True)
    return rows


def tp2_a13(ctx):
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    old = repo.commit("old")
    repo.put("client/src/main.ts", ts_lines(3))
    head = repo.commit("head")
    repo.put("client/src/later.ts", ts_lines(2))
    third = repo.commit("third, no CI run")
    gh = Gh(json.dumps(ci_runs(head, old)))
    env = gh.env()
    want = {"seconds": "95", "conclusion": "success", "nightly": "failure", "reruns-to-green": "2"}
    mem = new_mem()
    before = snapshot(repo)
    r = census(repo, head, mem, "--ci", env=env)
    after = snapshot(repo)
    calls = gh.calls()
    ctx.check("--ci prints the CI run's wall seconds and conclusion for the commit (newest COMPLETED run: 95 s, success), "
              "the newest completed Nightly's conclusion (failure), and the rerun-to-green count among the newest 300 CI runs "
              "(2: attempt>=2 and success; not attempt 2 failure, attempt 1 success, a Nightly, or a run past the 300th)",
              r.rc == 0 and r.ci == want, want, r.ci, r)
    ctx.check("--ci makes exactly one gh call, `gh run list ...`",
              len(calls) == 1 and calls[0][:2] == ["run", "list"], "one call starting run list", calls, r)
    ctx.check("--ci without --record writes nothing under --mem", os.listdir(mem) == [], [], os.listdir(mem), r)
    ctx.check("census --ci leaves the worktree, index and refs unchanged", after == before, before, after, r)
    ctx.check("the census rows still print with --ci", CTRL in r.rows, CTRL, r.rows, r)

    gh.reset()
    r = census(repo, head, mem, "--ci", "--record", "lbl", env=env)
    trend = os.path.join(mem, "prune", "trend.jsonl")
    d = read_bytes(trend)
    row = json.loads(d.decode("utf-8")) if d else None
    exp_ci = {"seconds": 95, "conclusion": "success", "nightly": "failure", "reruns_to_green": 2}
    got = row.get("ci") if isinstance(row, dict) else row
    ctx.check("the trend row carries a \"ci\" object with seconds, conclusion, nightly and reruns_to_green (ints, not strings)",
              got == exp_ci and type(got.get("seconds")) is int and type(got.get("reruns_to_green")) is int,
              exp_ci, got, r)
    ctx.check("the trend row keeps label, commit, totals and counts beside \"ci\"",
              isinstance(row, dict) and row.get("label") == "lbl" and row.get("commit") == head
              and "totals" in row and "counts" in row, "label/commit/totals/counts", row, r)
    ctx.check("the ci line sits after counts and before recorded; --ci --record is one gh call",
              prefixes(r)[-3:] == ["counts", "ci", "recorded"] and len(gh.calls()) == 1,
              (["counts", "ci", "recorded"], 1), (prefixes(r)[-3:], len(gh.calls())), r)

    gh.reset()
    r = census(repo, head, mem, "--record", "last", "--ci", env=env)
    lines = (read_bytes(trend) or b"").decode("utf-8").splitlines()
    last = json.loads(lines[-1]) if lines else None
    ctx.check("--ci takes no value: as the last flag it still parses, prints the ci line and records \"ci\"",
              r.rc == 0 and r.ci == want and isinstance(last, dict) and last.get("label") == "last"
              and last.get("ci") == exp_ci, (want, exp_ci), (r.ci, last), r)

    r = census(repo, old, mem, "--ci", env=env)
    w_old = {"seconds": "600", "conclusion": "failure", "nightly": "failure", "reruns-to-green": "2"}
    ctx.check("the run is matched by head sha: at the older commit the CI figures are that commit's run (600 s, failure)",
              r.ci == w_old, w_old, r.ci, r)
    r = census(repo, third, mem, "--ci", env=env)
    w_none = {"seconds": "null", "conclusion": "null", "nightly": "failure", "reruns-to-green": "2"}
    ctx.check("a commit with no CI run gets null seconds and conclusion; nightly and reruns still print",
              r.ci == w_none, w_none, r.ci, r)

    gh.reset()
    mem2 = new_mem()
    r = census(repo, head, mem2, "--record", "nociflag", env=env)
    d = read_bytes(os.path.join(mem2, "prune", "trend.jsonl"))
    row = json.loads(d.decode("utf-8")) if d else None
    ctx.check("without --ci there is no ci line, no \"ci\" key in the row, and gh is never run",
              r.ci is None and isinstance(row, dict) and "ci" not in row and gh.calls() == [],
              "no ci anywhere, zero gh calls", (r.ci, row, gh.calls()), r)


def tp2_a14(ctx):
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    sha = repo.commit()
    good = json.dumps([gh_run(1, "CI", sha, "completed", "success", 1, -10, 95),
                       gh_run(2, "Nightly", sha, "completed", "success", 1, -20, 100),
                       gh_run(3, "CI", "e" * 40, "completed", "success", 2, -30, 100)])
    bindir = tempfile.mkdtemp(prefix="nogh-", dir=ROOT)
    os.symlink(shutil.which("git"), os.path.join(bindir, "git"))
    env_absent = clean_env()
    env_absent["PATH"] = bindir
    exits = Gh(good, rc=1)
    junk = Gh("this is not json\n")
    deep = Gh("[" * 100000 + "]" * 100000 + "\n")
    nulls = {"seconds": "null", "conclusion": "null", "nightly": "null", "reruns-to-green": "null"}
    jnulls = {"seconds": None, "conclusion": None, "nightly": None, "reruns_to_green": None}
    for name, env, gh in (("gh absent from PATH", env_absent, None),
                          ("gh exits 1 (with a valid-looking answer on stdout)", exits.env(), exits),
                          ("gh prints something that is not JSON", junk.env(), junk),
                          ("gh prints 100000 nested arrays (deeper than a JSON parser's recursion limit)",
                           deep.env(), deep)):
        mem = new_mem()
        r = census(repo, sha, mem, "--ci", "--record", "n", env=env)
        d = read_bytes(os.path.join(mem, "prune", "trend.jsonl"))
        row = json.loads(d.decode("utf-8")) if d else None
        ctx.check(name + ": exit 0, the ci line is all null, and the census rows still print",
                  r.rc == 0 and r.ci == nulls and CTRL in r.rows and r.commit == sha, (0, nulls, CTRL),
                  (r.rc, r.ci, r.rows), r)
        got = row.get("ci") if isinstance(row, dict) else row
        ctx.check(name + ": the row is still appended, with \"ci\" all null",
                  got == jnulls and isinstance(row, dict) and row.get("label") == "n", jnulls, row, r)
        if gh is not None:
            ctx.check(name + ": gh was actually run once (the null is a failure, not a skip)",
                      len(gh.calls()) == 1, 1, gh.calls(), r)


FIXTURES = [
    ("TP1-A1", tp1_a1), ("TP1-A2", tp1_a2), ("TP1-A3", tp1_a3), ("TP1-A4", tp1_a4),
    ("TP1-A5", tp1_a5), ("TP1-A6", tp1_a6), ("TP1-A7", tp1_a7), ("TP1-A8", tp1_a8),
    ("TP1-A9", tp1_a9), ("TP1-A10", tp1_a10), ("TP1-A11", tp1_a11), ("TP1-A12", tp1_a12),
    ("TP1-A13", tp1_a13), ("TP1-A14", tp1_a14), ("TP1-A15", tp1_a15),
    ("TP2-A1", tp2_a1), ("TP2-A2", tp2_a2), ("TP2-A3", tp2_a3), ("TP2-A4", tp2_a4),
    ("TP2-A5", tp2_a5), ("TP2-A6", tp2_a6), ("TP2-A7", tp2_a7), ("TP2-A8", tp2_a8),
    ("TP2-A9", tp2_a9), ("TP2-A10", tp2_a10), ("TP2-A11", tp2_a11), ("TP2-A12", tp2_a12),
    ("TP2-A13", tp2_a13), ("TP2-A14", tp2_a14),
]


def main(argv):
    global ROOT, NEUTRAL, TOOL
    if len(argv) < 2 or not os.path.isfile(argv[1]):
        sys.stderr.write("usage: battery.py <absolute path of mr-prune> [ID ...]\n")
        print("PRUNE-SELFTEST-FAIL 0/0")
        return 1
    TOOL = os.path.abspath(argv[1])
    ids = argv[2:]
    table = dict(FIXTURES)
    selected = ids if ids else [fid for fid, _ in FIXTURES]
    total = failed = 0
    ROOT = tempfile.mkdtemp(prefix="mr-prune-selftest-")
    try:
        NEUTRAL = tempfile.mkdtemp(prefix="cwd-", dir=ROOT)
        for fid in selected:
            ctx = Ctx(fid)
            fn = table.get(fid)
            if fn is None:
                ctx.check("the id names a fixture", False, "a fixture registered as " + fid, "none")
            else:
                try:
                    fn(ctx)
                except Exception:
                    ctx.crash()
            total += ctx.n
            failed += ctx.failed
    finally:
        shutil.rmtree(ROOT, ignore_errors=True)
    if failed or total == 0:
        print("PRUNE-SELFTEST-FAIL %d/%d" % (failed, total))
        return 1
    print("PRUNE-SELFTEST-OK %d%s" % (total, "".join(" " + i for i in ids)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
